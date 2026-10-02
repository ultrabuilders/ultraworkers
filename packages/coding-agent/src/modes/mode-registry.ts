/**
 * The mode registry: which modes exist, which one is active, and what it permits.
 *
 * ## Why this exists
 *
 * A mode is a bundle of behaviour — a tool set, an `enter`/`exit`, a write
 * policy, a chip on the status line — and until now each of those was a field on
 * `InteractiveMode` with a branch per built-in mode. Adding a sixth mode meant a
 * new boolean, a new branch, and a new place to forget the branch. This is the
 * seam that lets a mode arrive as one record instead.
 *
 * It exists to answer three questions and nothing else: *what modes exist*, *which
 * is active*, and *what does the active one permit*. Everything a mode does with
 * that answer — setting tools, gating writes, drawing a chip — belongs to the
 * consumer, not here. A registry that also drove behaviour would be the thing it
 * replaces.
 *
 * ## Registration is permanent, activation is not
 *
 * `register()` is for load time: the built-in modes, and — through
 * `registerMode` on `ExtensionAPI` — any extension that declares one.
 *
 * ## The registry is process-global, and that is a real limit
 *
 * One instance is shared by every session and every extension in the process. So
 * a mode declared by an extension is visible to *all* of them, and withdrawing it
 * is the only way it leaves ({@link ModeRegistry.unregister}, which extension
 * unload calls). That is the correct scope for an extension — it is loaded once
 * per process from the config directory, not once per session — but it does mean
 * the registry must not become the source of truth for per-session state. The
 * built-in modes' `*Enabled` fields still hold that; see WI-7 step 4.
 *
 * Activation is a separate, cheap, reversible operation
 * ({@link ModeRegistry.setActivation}), because switching modes happens far more
 * often than declaring them.
 */

import type { WritePolicy } from "../plan-mode/write-policy";

/**
 * The chip a mode shows on the status line.
 *
 * Required rather than optional, and that is the point: a mode with no indicator
 * reads as a fault to whoever is looking at it, because the `mode` segment
 * already exists and a new mode that never appears there looks like a mode that
 * did not take effect. Making it required means an extension cannot ship one.
 */
export interface ModeStatusLine {
	/** Short label for the chip. Keep it to one or two words; this is chrome. */
	readonly label: string;
	/** Optional emphasis, e.g. to mark a paused mode. */
	readonly tone?: "default" | "active" | "paused";
}

/**
 * What a mode is given when it is entered, and what it may ask of the session.
 *
 * Deliberately not a TUI handle. A mode that can draw gets a second surface to
 * own, and the status-line chip is the affordance this wave ships; widening this
 * to UI is a decision with its own cost, not something to smuggle in.
 */
export interface ModeContext {
	/** Absolute working directory of the session this mode entered. */
	readonly cwd: string;
	/** Restrict the model's tool set for the duration of this mode. */
	setActiveTools(toolNames: string[]): Promise<void>;
	/** Surface a transient message to the user. */
	notify(message: string): void;
}

/**
 * One mode, as registered.
 *
 * `enter`/`exit` are optional because a mode that only narrows tools has nothing
 * to do on the way in — the common case should not have to write two no-ops.
 */
export interface ModeDefinition {
	/** Stable identifier, unique across the registry. */
	readonly id: string;
	/** Human-facing name for a mode picker. */
	readonly name: string;
	/** One line describing what the mode is for. */
	readonly description: string;
	/** What this mode refuses. Omit a flag to permit that operation. */
	readonly writePolicy?: WritePolicy;
	/** Status-line chip. Required — see {@link ModeStatusLine}. */
	readonly statusLine: ModeStatusLine;
	/** Lower sorts earlier; the status line reads first-wins for the chip. */
	readonly order?: number;
	/** Run when the mode becomes active. */
	enter?(ctx: ModeContext): void | Promise<void>;
	/** Run when the mode stops being active. */
	exit?(ctx: ModeContext): void | Promise<void>;
}

/** The mode a consumer should render: an id, resolved once. */
export interface ResolvedMode {
	readonly id: string;
	readonly name: string;
	readonly statusLine: ModeStatusLine;
}

/** Sort weight for a mode that declares none. Middle of the built-in band. */
const DEFAULT_ORDER = 100;

export class ModeRegistry {
	readonly #definitions = new Map<string, ModeDefinition>();
	/** Which source declared each id. Mirrors `modelRegistry.providerSource`. */
	readonly #sources = new Map<string, string>();
	#activeId: string | undefined;
	#sorted: string[] | undefined;
	#listeners = new Set<(mode: ResolvedMode | undefined) => void>();

	/**
	 * Declare a mode. Called at load time by the built-in modes and by any
	 * extension exposing one.
	 *
	 * A duplicate id throws rather than overwriting. Silently replacing would let
	 * one extension displace another's mode with no signal, and the displaced mode
	 * would keep whatever state it had already applied.
	 *
	 * `source` names the owner for {@link modeSource}. It is optional because the
	 * built-in modes have no path — they are declared by core, not loaded from a
	 * directory — and an id with no source is simply one no unload can withdraw.
	 */
	register(definition: ModeDefinition, source?: string): void {
		if (this.#definitions.has(definition.id)) {
			throw new Error(`Mode "${definition.id}" is already registered`);
		}
		this.#definitions.set(definition.id, definition);
		if (source !== undefined) this.#sources.set(definition.id, source);
		this.#sorted = undefined;
	}

	/** Whether a mode is declared under `id`. */
	has(id: string): boolean {
		return this.#definitions.has(id);
	}

	/**
	 * Which source declared `id`, or `undefined` for an id that is not declared or
	 * was declared without a source.
	 *
	 * The same shape as `modelRegistry.providerSource`, and for the same reason:
	 * an unload walks a list of ids it recorded at load time, and by the time it
	 * runs, one of those ids may belong to somebody else. Comparing the source is
	 * what stops a stale record from withdrawing a later owner's declaration.
	 */
	modeSource(id: string): string | undefined {
		return this.#sources.get(id);
	}

	/**
	 * Withdraw a declaration, returning whether there was one.
	 *
	 * Exists because the registry is process-global: without it, unloading an
	 * extension left its mode declared forever, and a reloaded copy would then
	 * collide with its own predecessor. That is the same ownership trap
	 * `modelRegistry.unregisterProvider` guards against in `runner.ts` — so this
	 * does *not* decide ownership. It withdraws whatever currently holds `id`,
	 * which is why callers must check {@link modeSource} first; see the unload
	 * loop in `ExtensionRunner.unloadExtension` for the shape.
	 *
	 * Deactivating first is deliberate: a withdrawn mode that is still active
	 * would leave `resolvedMode()` reporting something nothing can resolve.
	 */
	unregister(id: string): boolean {
		if (!this.#definitions.delete(id)) return false;
		this.#sources.delete(id);
		this.#sorted = undefined;
		if (this.#activeId === id) {
			this.#activeId = undefined;
			for (const listener of this.#listeners) {
				try {
					listener(undefined);
				} catch {
					// Same isolation as `setActivation`: a subscriber that cannot
					// render must not abort the withdrawal.
				}
			}
		}
		return true;
	}

	/**
	 * Make `id` the active mode, or pass `undefined` to deactivate.
	 *
	 * Notifies listeners after the change so a consumer redrawing the chip sees
	 * the new value rather than the old one. Listeners that throw are isolated:
	 * one bad subscriber must not leave the registry claiming a mode is active
	 * that nothing managed to observe.
	 */
	setActivation(id: string | undefined): void {
		if (id !== undefined && !this.#definitions.has(id)) {
			throw new Error(`Cannot activate unregistered mode "${id}"`);
		}
		if (id === this.#activeId) return;
		this.#activeId = id;
		const resolved = this.resolvedMode();
		for (const listener of this.#listeners) {
			try {
				listener(resolved);
			} catch {
				// A subscriber that cannot render must not abort activation; the
				// mode still changed, and the next render will pick it up.
			}
		}
	}

	/** The active mode's id, or `undefined` when none is active. */
	activeId(): string | undefined {
		return this.#activeId;
	}

	/** Whether `id` is the active mode. */
	isActive(id: string): boolean {
		return this.#activeId === id;
	}

	/**
	 * The mode to render, resolved once for consumers.
	 *
	 * `undefined` when nothing is active, which is the normal state between
	 * turns — a chip has to be able to say "no mode" rather than inventing one.
	 */
	resolvedMode(): ResolvedMode | undefined {
		if (this.#activeId === undefined) return undefined;
		const definition = this.#definitions.get(this.#activeId);
		if (!definition) return undefined;
		return { id: definition.id, name: definition.name, statusLine: definition.statusLine };
	}

	/** What the active mode refuses. `undefined` when no mode is active. */
	writePolicy(): WritePolicy | undefined {
		if (this.#activeId === undefined) return undefined;
		return this.#definitions.get(this.#activeId)?.writePolicy;
	}

	/** Every registered mode, ordered by `order` then id. */
	list(): readonly ModeDefinition[] {
		return this.#sortedIds().map(id => this.#definitions.get(id)!);
	}

	/** Subscribe to activation changes. Returns an unsubscribe function. */
	onChange(listener: (mode: ResolvedMode | undefined) => void): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}

	/** Ids in display order, recomputed only when the set changed. */
	#sortedIds(): string[] {
		if (this.#sorted) return this.#sorted;
		this.#sorted = [...this.#definitions]
			.sort(([, a], [, b]) => {
				const order = (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER);
				return order !== 0 ? order : a.id.localeCompare(b.id);
			})
			.map(([id]) => id);
		return this.#sorted;
	}
}

/** The registry the built-in modes and extensions share. */
export const modeRegistry = new ModeRegistry();
