/**
 * The delta algebra the run journal is built on.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/run-record-store.ts`: `Cells`/`Delta`/`Entry` (`:76-89`), `FORMAT` and the two
 * bounds (`:100-101`), `cellsOf` (`:136-159`), `deltaOf` (`:160-185`), `applyDelta`
 * (`:186-217`).
 *
 * A run's state is a `Record<string, unknown>`, but a journal line is not a snapshot of
 * that: writing the whole object per event makes an append-only log quadratic in the run,
 * and — worse — makes every line carry state it did not change, so a reader cannot tell a
 * write from a no-op. The delta form records *what moved*, which is also the only form that
 * can answer "which key did this event touch" when resume replays.
 *
 * ## The one behavioural deviation, and why it is not optional
 *
 * The reference's `applyDelta` calls `settleInterruptedPersistedAgents` when a delta carries
 * `settleAgentsAt`. That function lives in the run-state module, which is not in this
 * phase's cut. Dropping the call would be the quiet failure: a journal written here would
 * carry the marker, resume would apply it to nothing, and an agent interrupted mid-run would
 * stay interrupted forever — with no error anywhere. So the settler is **injected**, and a
 * delta that needs one with no settler supplied THROWS rather than dropping the step. The
 * real settler arrives with the run-state bead.
 *
 * The refusal is a typed {@link WorkflowError} carrying `PERSISTENCE_ERROR`, not a bare
 * `Error`, and the discriminant is the load-bearing part rather than the class. The layer
 * that eventually catches this will be written against the code, because a catcher that
 * matches the message is a catcher that breaks silently the first time someone rewords the
 * sentence for readability — and it breaks at exactly the moment the persistence layer is
 * needed. `details.settleAgentsAt` carries the timestamp so the message can be rebuilt where
 * no settler is available, which is the whole value of refusing rather than skipping.
 *
 * ## Why `Object.defineProperty` and not assignment
 *
 * Copied verbatim, and load-bearing rather than stylistic: `JSON.parse` of a payload
 * containing `__proto__` produces an own property, and a plain assignment would be a
 * prototype write. Defining the property explicitly keeps the key an own data property.
 */
import { createHash } from "node:crypto";
import { WorkflowError, WorkflowErrorCode } from "../errors";

/** On-disk marker. Renamed per the bead: the reference's `pi-workflow-run-v2`. */
export const FORMAT = "ultraworkers-workflow-run-v1";

/** Cache bounds, copied verbatim from `:100-101`. */
export const MAX_CACHE_ENTRIES = 8;
export const MAX_CACHE_BYTES = 16 * 1024 * 1024;

/**
 * A run state: flat, with arrays and plain objects as the only nested shapes.
 *
 * NAMED `JournalState`, not `PersistedRunState`, and that is load-bearing. The reference
 * deliberately leaves this layer **unnamed** — its `run-record-store.ts` writes
 * `applyDelta(state: Record<string, unknown>, …)` inline — because the name
 * `PersistedRunState` belongs to the rich on-disk record in `run-persistence.ts`. Porting this
 * half first and naming it after the other half produced two same-named types with different
 * shapes, which compiles fine and misbehaves the moment a file imports the wrong one. The
 * reference avoids that by keeping only the RICH layer named; so does this tree.
 */
export type JournalState = Record<string, unknown>;

/**
 * One leaf value, pre-stringified. An array stays a `string[]` (diffed by index); a plain
 * object becomes a `Map` (diffed by key); anything else is one `string`.
 *
 * All three are needed, and the array case is not covered by "string or Map" — a run's
 * `agents` list is an array, and typing it as the other two would make `cellsOf` a type error
 * on the first real state it sees.
 */
export type Cell = string | string[] | Map<string, string>;

/** The whole state, flattened one level into comparable cells. */
export type Cells = Map<string, Cell>;

export interface Delta {
	/** ISO timestamp at which interrupted agents settle, if this delta settles any. */
	settleAgentsAt?: string;
	set: Record<string, unknown>;
	remove: string[];
	arrays: Record<string, { length: number; set: [number, unknown][] }>;
	objects?: Record<string, { set: Record<string, unknown>; remove: string[] }>;
}

export interface Entry {
	generation: string;
	sequence: number;
	previous: string;
	delta: Delta;
}

/** A full snapshot, written when there is no prior line or on compaction. */
export interface Head {
	format: typeof FORMAT;
	generation: string;
	sequence: number;
	state: JournalState;
}

export function isHead(value: unknown): value is Head {
	return !!value && typeof value === "object" && (value as Head).format === FORMAT;
}

export function digest(line: string): string {
	return createHash("sha256").update(line).digest("hex");
}

/**
 * Flatten a state into comparable cells.
 *
 * `undefined` is DROPPED rather than stored as `"undefined"`-ish, because a key whose value
 * is undefined and an absent key are the same state — and a journal that could tell them
 * apart would replay an event that changed nothing.
 *
 * `toJSON` is excluded from the plain-object branch: a value with its own `toJSON` is a
 * scalar to `JSON.stringify`, so treating it as a Map would compare its serialized form
 * against per-key json and never match.
 */
export function cellsOf(state: JournalState): Cells {
	const cells: Cells = new Map();
	for (const [key, value] of Object.entries(state)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			cells.set(
				key,
				value.map(v => JSON.stringify(v) ?? "null"),
			);
		} else if (
			value &&
			typeof value === "object" &&
			Object.getPrototypeOf(value) === Object.prototype &&
			typeof (value as { toJSON?: unknown }).toJSON !== "function"
		) {
			const entries = Object.entries(value).flatMap(([name, item]) => {
				const json = JSON.stringify(item);
				return json === undefined ? [] : [[name, json] as const];
			});
			cells.set(key, new Map(entries));
		} else cells.set(key, JSON.stringify(value));
	}
	return cells;
}

/**
 * What changed between two cell sets.
 *
 * Arrays diff per INDEX and carry a length, so appending is `set: [[n, v]]` with a longer
 * length rather than a rewritten array — the property that keeps a long run's journal linear
 * in what it actually changed instead of in its state size.
 */
export function deltaOf(before: Cells, after: Cells): Delta {
	const delta: Delta = { set: Object.create(null), remove: [], arrays: Object.create(null) };
	for (const key of before.keys()) if (!after.has(key)) delta.remove.push(key);
	for (const [key, value] of after) {
		const old = before.get(key);
		if (Array.isArray(value)) {
			const prior = Array.isArray(old) ? old : [];
			const set: [number, unknown][] = [];
			for (let i = 0; i < value.length; i++) if (value[i] !== prior[i]) set.push([i, JSON.parse(value[i])]);
			if (!Array.isArray(old) || value.length !== prior.length || set.length) {
				delta.arrays[key] = { length: value.length, set };
			}
		} else if (value instanceof Map) {
			const prior = old instanceof Map ? old : new Map();
			const set: Record<string, unknown> = Object.create(null);
			const remove = [...prior.keys()].filter(name => !value.has(name));
			for (const [name, json] of value) if (prior.get(name) !== json) set[name] = JSON.parse(json);
			if (!(old instanceof Map)) delta.set[key] = {};
			if (remove.length || Object.keys(set).length) {
				const objects: NonNullable<Delta["objects"]> = delta.objects ?? Object.create(null);
				objects[key] = { set, remove };
				delta.objects = objects;
			}
		} else if (value !== old) delta.set[key] = JSON.parse(value);
	}
	return delta;
}

/** Settles agents interrupted at `atIso`. Supplied by the run-state bead. */
export type AgentSettler = (agents: unknown[], cause: string, atIso: string) => unknown[];

/**
 * Replay a delta onto a state, in place.
 *
 * ORDER IS THE CONTRACT and is copied verbatim: settle, then removals, then whole-key sets,
 * then object patches, then arrays. A removal before a set would resurrect a deleted key via
 * the set; an array patch before its removal would write into an array that is about to go.
 */
export function applyDelta(state: JournalState, delta: Delta, settleAgents?: AgentSettler): void {
	if (delta.settleAgentsAt) {
		if (!settleAgents) {
			throw new WorkflowError(
				`delta settles agents at ${delta.settleAgentsAt} but no settler was supplied; dropping it would leave an interrupted agent interrupted forever`,
				WorkflowErrorCode.PERSISTENCE_ERROR,
				{ details: { settleAgentsAt: delta.settleAgentsAt } },
			);
		}
		state.agents = settleAgents(Array.isArray(state.agents) ? state.agents : [], "interrupted", delta.settleAgentsAt);
	}
	for (const key of delta.remove) delete state[key];
	for (const [key, value] of Object.entries(delta.set)) {
		Object.defineProperty(state, key, { value, writable: true, enumerable: true, configurable: true });
	}
	for (const [key, patch] of Object.entries(delta.objects ?? {})) {
		const value =
			Object.hasOwn(state, key) && state[key] && typeof state[key] === "object" && !Array.isArray(state[key])
				? (state[key] as Record<string, unknown>)
				: {};
		for (const name of patch.remove) delete value[name];
		for (const [name, item] of Object.entries(patch.set)) {
			Object.defineProperty(value, name, { value: item, writable: true, enumerable: true, configurable: true });
		}
		Object.defineProperty(state, key, { value, writable: true, enumerable: true, configurable: true });
	}
	for (const [key, patch] of Object.entries(delta.arrays)) {
		if (!Number.isSafeInteger(patch.length) || patch.length < 0) throw new Error("Invalid run array length");
		const value = Object.hasOwn(state, key) && Array.isArray(state[key]) ? (state[key] as unknown[]) : [];
		value.length = patch.length;
		for (const [index, item] of patch.set) {
			if (!Number.isSafeInteger(index) || index < 0 || index >= patch.length) {
				throw new Error("Invalid run array index");
			}
			value[index] = item;
		}
		Object.defineProperty(state, key, { value, writable: true, enumerable: true, configurable: true });
	}
}
