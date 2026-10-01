import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { getProjectAgentDir, TempDir } from "@oh-my-pi/pi-utils";
import { createInMemoryAuthStorage } from "../helpers/agent-session-setup";
import {
	addContextTransform,
	clearContextTransforms,
	contextTransforms,
	hasContextTransforms,
	runContextTransforms,
} from "@oh-my-pi/pi-coding-agent/tools/compaction-transforms";
import type { PruneResult } from "@oh-my-pi/pi-agent-core/compaction/pruning";
import { Tokenizer } from "@oh-my-pi/pi-agent-core/tokenizer";
import { reduceContext } from "@oh-my-pi/pi-agent-core/compaction/context-reduction";
import type { Usage } from "@oh-my-pi/pi-ai";
import type { SessionEntry } from "@oh-my-pi/pi-agent-core/compaction/entries";

/**
 * A context transform is a promise the host cannot keep on the extension's
 * behalf: that the tokens it claims to have removed actually left the context.
 * `runContextTransforms` is the only place that promise is checked, so these
 * tests hold two lines at once — the seam must accept a well-behaved transform
 * and must not accept a lying one.
 *
 * The registry is process-wide, like its siblings, so every test here clears it
 * in `afterEach` rather than leaving state for whichever file runs next.
 */

const tokenizer = new Tokenizer();

function noop(): PruneResult {
	return { prunedCount: 0, tokensSaved: 0 };
}

afterEach(() => {
	clearContextTransforms();
});

describe("the seam's empty state", () => {
	it("reports no transforms before anything registers, which is what keeps the prune pass untouched", () => {
		// The driver in `session-maintenance.ts` skips the whole block on this
		// predicate, so a registry that lied here would silently change the
		// pre-seam path for every user with no extension installed.
		expect(hasContextTransforms()).toBe(false);
		expect(contextTransforms()).toEqual([]);
	});

	it("runs nothing and reports zero when the registry is empty", () => {
		const entries: SessionEntry[] = [];

		const outcome = runContextTransforms(entries, tokenizer);

		expect(outcome.total).toEqual({ prunedCount: 0, tokensSaved: 0 });
		expect(outcome.outcomes).toEqual([]);
		expect(outcome.errors).toEqual([]);
	});
});

describe("registering a transform", () => {
	it("runs a registered transform and totals what it reports", () => {
		// The reduction is the whole point of the seam: an extension that owns a
		// noisy tool collapses its own output, and the saving is real because the
		// transform mutated the entries it was handed.
		const entries: SessionEntry[] = [];
		addContextTransform("ext-a", {
			name: "collapse",
			transform: source => {
				source.push({ id: "added" } as unknown as SessionEntry);
				return { prunedCount: 2, tokensSaved: 500 };
			},
		});

		const outcome = runContextTransforms(entries, tokenizer);

		expect(outcome.total).toEqual({ prunedCount: 2, tokensSaved: 500 });
		expect(entries).toHaveLength(1);
		expect(outcome.outcomes).toEqual([
			{ extensionPath: "ext-a", name: "collapse", prunedCount: 2, tokensSaved: 500 },
		]);
	});

	it("sums several extensions independently, so one cannot mask another", () => {
		addContextTransform("ext-a", { name: "first", transform: () => ({ prunedCount: 1, tokensSaved: 100 }) });
		addContextTransform("ext-b", { name: "second", transform: () => ({ prunedCount: 2, tokensSaved: 250 }) });

		const outcome = runContextTransforms([], tokenizer);

		expect(outcome.total).toEqual({ prunedCount: 3, tokensSaved: 350 });
		expect(outcome.outcomes.map(o => o.extensionPath)).toEqual(["ext-a", "ext-b"]);
	});

	it("returns core's own result shape, so a transform composes rather than replaces", () => {
		// `PruneResult` is the contract `pruneToolOutputs` already returns. A
		// transform speaking a different shape would need a second accounting path
		// in the prune pass, which is the second source of truth this seam avoids.
		addContextTransform("ext-a", { name: "typed", transform: noop });

		const { total } = runContextTransforms([], tokenizer);

		expect(Object.keys(total).sort()).toEqual(["prunedCount", "tokensSaved"]);
	});
});

describe("unregistering restores the pre-seam behaviour exactly", () => {
	it("stops reducing the branch once the extension is unloaded", () => {
		// This is the negative contract the acceptance criteria name. A stale
		// registration would keep rewriting a live transcript belonging to an
		// extension that no longer exists, and nothing else in the host would
		// notice.
		const entries: SessionEntry[] = [];
		const dispose = addContextTransform("ext-a", {
			name: "collapse",
			transform: source => {
				source.push({ id: "added" } as unknown as SessionEntry);
				return { prunedCount: 1, tokensSaved: 10 };
			},
		});
		runContextTransforms(entries, tokenizer);
		expect(entries).toHaveLength(1);

		dispose();

		const after: SessionEntry[] = [];
		const outcome = runContextTransforms(after, tokenizer);
		expect(after).toHaveLength(0);
		expect(outcome.total).toEqual({ prunedCount: 0, tokensSaved: 0 });
		expect(hasContextTransforms()).toBe(false);
	});

	it("unloads one extension without disturbing another's contribution", () => {
		// Disposer-per-registration: dropping ext-a must leave ext-b running, or
		// reloading one extension would silently disable every other one.
		const disposeA = addContextTransform("ext-a", {
			name: "a",
			transform: () => ({ prunedCount: 1, tokensSaved: 10 }),
		});
		addContextTransform("ext-b", { name: "b", transform: () => ({ prunedCount: 2, tokensSaved: 20 }) });

		disposeA();

		const outcome = runContextTransforms([], tokenizer);
		expect(outcome.total).toEqual({ prunedCount: 2, tokensSaved: 20 });
		expect(outcome.outcomes.map(o => o.extensionPath)).toEqual(["ext-b"]);
	});
});

describe("a bad registration is refused with a reason, not silently ignored", () => {
	it("names the extension when the name is not a usable string", () => {
		// An ignored registration is indistinguishable from one never made: the
		// extension author sees a working load and a context that never shrinks.
		for (const name of ["", "   ", undefined, 42]) {
			expect(() => addContextTransform("ext-bad", { name, transform: noop } as never)).toThrow(/ext-bad/);
		}
		expect(hasContextTransforms()).toBe(false);
	});

	it("names the extension when the transform is not callable", () => {
		expect(() => addContextTransform("ext-bad", { name: "x", transform: "nope" } as never)).toThrow(/ext-bad/);
		expect(hasContextTransforms()).toBe(false);
	});

	it("refuses a duplicate name from the same extension, because names identify a transform in logs", () => {
		addContextTransform("ext-a", { name: "collapse", transform: noop });

		expect(() => addContextTransform("ext-a", { name: "collapse", transform: noop })).toThrow(/ext-a/);
		expect(contextTransforms()).toHaveLength(1);
	});

	it("allows two extensions to use the same name, since the log line carries the path", () => {
		// The ambiguity the duplicate check prevents is per-extension, not global —
		// two vendors naming their transform "collapse" is ordinary, and rejecting
		// it would make the seam unusable for the second one to arrive.
		addContextTransform("ext-a", { name: "collapse", transform: noop });
		addContextTransform("ext-b", { name: "collapse", transform: noop });

		expect(contextTransforms()).toHaveLength(2);
	});
});

describe("a transform that misbehaves at run time does not take the pass down with it", () => {
	it("reports a throwing transform and still runs the others", () => {
		// The prune pass exists to make the context smaller. One extension's bad day
		// must not leave the session unable to shed context at all.
		addContextTransform("ext-bad", {
			name: "throws",
			transform: () => {
				throw new Error("boom");
			},
		});
		addContextTransform("ext-good", { name: "works", transform: () => ({ prunedCount: 1, tokensSaved: 42 }) });

		const outcome = runContextTransforms([], tokenizer);

		expect(outcome.total).toEqual({ prunedCount: 1, tokensSaved: 42 });
		expect(outcome.errors).toHaveLength(1);
		expect(outcome.errors[0]?.extensionPath).toBe("ext-bad");
		expect(outcome.errors[0]?.error).toContain("boom");
	});

	it("drops the numbers of a transform that claims savings it cannot have had", () => {
		// `tokensSaved` is what the caller uses to decide whether the branch still
		// fits. A transform reporting a number it did not earn would make the host
		// believe the context shrank when it did not, so the claim is discarded
		// rather than totalled.
		for (const bogus of [
			{ prunedCount: 1, tokensSaved: -500 },
			{ prunedCount: -1, tokensSaved: 500 },
			{ prunedCount: 1, tokensSaved: Number.NaN },
			{ prunedCount: 1, tokensSaved: Number.POSITIVE_INFINITY },
		]) {
			clearContextTransforms();
			addContextTransform("ext-liar", { name: "liar", transform: () => bogus });
			addContextTransform("ext-honest", { name: "honest", transform: () => ({ prunedCount: 1, tokensSaved: 10 }) });

			const outcome = runContextTransforms([], tokenizer);

			expect(outcome.total).toEqual({ prunedCount: 1, tokensSaved: 10 });
			expect(outcome.errors[0]?.extensionPath).toBe("ext-liar");
			expect(outcome.errors[0]?.error).toContain("non-negative");
		}
	});

	it("treats a transform returning nothing as a failure rather than as zero savings", () => {
		// Returning `undefined` is the shape a handler that "declines to act"
		// produces everywhere else in this codebase. Reading its savings as zero
		// would be a silent no-op; the extension author would never learn why.
		addContextTransform("ext-bad", { name: "void", transform: () => undefined as unknown as PruneResult });

		const outcome = runContextTransforms([], tokenizer);

		expect(outcome.total).toEqual({ prunedCount: 0, tokensSaved: 0 });
		expect(outcome.errors).toHaveLength(1);
	});
});

/**
 * The acceptance criterion that decides whether this item did its job: an
 * extension written OUTSIDE this repo, loaded by the real loader, reaching the
 * surface through the new API — with no core edit beyond the seam itself.
 *
 * Every seam in this family has the same shape, so the failure this catches is
 * always the same one: the registry works in isolation but nothing ever installs
 * it, and the unit tests stay green because they call `addContextTransform`
 * directly. Only a file on disk going through `loadExtensions` and
 * `ExtensionRunner.initialize` proves the whole path is connected.
 */
describe("an extension outside this repo reaches the surface", () => {
	let tempDir: TempDir;
	let extensionsDir: string;
	let sessionManager: SessionManager;
	let runner: ExtensionRunner | undefined;

	const authStorage = createInMemoryAuthStorage();
	const modelRegistry = new ModelRegistry(authStorage);

	beforeEach(() => {
		tempDir = TempDir.createSync("@pi-ctx-transform-");
		extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		sessionManager = SessionManager.inMemory();
	});

	afterEach(() => {
		// Unload first: the registry is process-wide, and a leftover registration
		// from this file would reach whichever extension test runs after it.
		runner?.disposeFileFallbacks();
		runner = undefined;
		tempDir.removeSync();
		clearContextTransforms();
	});

	afterAll(() => {
		authStorage.close();
	});

	const dummyActions = {
		setSessionName: async () => {},
	} as never;
	const dummyContextActions = {
		getModel: () => undefined,
		isIdle: () => true,
		abort: () => {},
		hasPendingMessages: () => false,
		shutdown: () => {},
		getContextUsage: () => undefined,
		compact: async () => {},
		getSystemPrompt: () => [],
	} as never;

	async function load(body: string): Promise<void> {
		fs.writeFileSync(
			path.join(extensionsDir, "ext.ts"),
			`export default function(pi) {
				pi.registerContextTransform(${body});
			}`,
		);
		const result = await loadExtensions([path.join(extensionsDir, "ext.ts")], tempDir.path());
		runner = new ExtensionRunner(
			result.extensions,
			result.runtime,
			tempDir.path(),
			sessionManager,
			modelRegistry,
			undefined,
			Settings.isolated({}),
		);
	}

	it("registers through the public API and reaches the prune pass's registry", async () => {
		// Before load: the host's own view of the registry.
		expect(hasContextTransforms()).toBe(false);

		await load(`{ name: "collapse", transform: () => ({ prunedCount: 3, tokensSaved: 900 }) }`);
		runner!.initialize(dummyActions, dummyContextActions, undefined, undefined, "tui");

		// The registry the prune pass reads, not the extension's own bookkeeping.
		const outcome = runContextTransforms([], {} as Tokenizer);
		expect(outcome.total).toEqual({ prunedCount: 3, tokensSaved: 900 });
		expect(contextTransforms()[0]?.extensionPath).toBe(extensionsDir + "/ext.ts");
	});

	it("leaves the host exactly as it found it once the extension is unloaded", async () => {
		// The negative half of the same criterion, and the one that keeps the seam
		// from being a one-way door: a transform outliving its extension would keep
		// rewriting transcripts for code that is no longer loaded.
		await load(`{ name: "collapse", transform: () => ({ prunedCount: 1, tokensSaved: 100 }) }`);
		runner!.initialize(dummyActions, dummyContextActions, undefined, undefined, "tui");
		expect(hasContextTransforms()).toBe(true);

		// Per-extension, not a global drain: releasing this extension's bucket must
		// be what removes its transform, or unloading one extension would take every
		// other extension's contribution with it.
		runner!.disposeFileFallbacksFor(path.join(extensionsDir, "ext.ts"));

		expect(hasContextTransforms()).toBe(false);
		expect(runContextTransforms([], {} as Tokenizer).total).toEqual({ prunedCount: 0, tokensSaved: 0 });
	});

	it("refuses a misbehaving registration at load time, naming the extension", async () => {
		// A registration that is quietly dropped leaves the author with a clean
		// load and a context that never shrinks — the shape of bug this whole
		// registry family exists to prevent.
		await load(`{ name: "", transform: () => ({ prunedCount: 0, tokensSaved: 0 }) }`);

		expect(() => runner!.initialize(dummyActions, dummyContextActions, undefined, undefined, "tui")).toThrow(
			/context transform name/,
		);
	});
});

/**
 * The two halves of omp-9jy landed as two commits by two authors: the extension
 * point (`registerContextTransform`, `tools/compaction-transforms.ts`) and the two
 * deterministic transforms (`packages/agent/src/compaction/context-reduction.ts`).
 * Neither half tests the other, so "the bead is complete" was an assertion about
 * two commits rather than an observation.
 *
 * This closes that gap. The transforms live in `@oh-my-pi/pi-agent-core`, the seam
 * lives in `@oh-my-pi/pi-coding-agent`, and nothing forces those two to fit together
 * — which is the whole reason a composition test earns its place rather than being
 * a restatement of each half's own suite.
 */
describe("the registered transforms and the seam fit together", () => {
	/** A run of consecutive `read` results, which is what `collapse` targets. */
	function readRun(paths: string[]): SessionEntry[] {
		const entries: SessionEntry[] = [];
		paths.forEach((path, i) => {
			const callId = `call-${i}`;
			entries.push({
				type: "message",
				id: `a-${i}`,
				parentId: null,
				timestamp: new Date().toISOString(),
				message: {
					role: "assistant",
					content: [{ type: "toolCall", id: callId, name: "read", arguments: { path } }],
					api: "",
					provider: "",
					model: "",
					usage: usage(0),
					stopReason: "toolUse",
					timestamp: 0,
				},
			} as unknown as SessionEntry);
			entries.push({
				type: "message",
				id: `r-${i}`,
				parentId: null,
				timestamp: new Date().toISOString(),
				message: {
					role: "toolResult",
					toolCallId: callId,
					toolName: "read",
					content: [{ type: "text", text: `contents of ${path}\n`.repeat(40) }],
					isError: false,
					timestamp: 0,
				},
			} as unknown as SessionEntry);
		});
		return entries;
	}

	function usage(totalTokens: number): Usage {
		return {
			input: totalTokens,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};
	}

	it("registers core's collapse transform through the extension point and reduces the branch", () => {
		const entries = readRun(["a.ts", "b.ts", "c.ts"]);
		const before = tokenizer.countTokens(JSON.stringify(entries));

		// The adapter an extension actually has to write: `reduceContext` reports
		// what it did in its own vocabulary, and the seam speaks `PruneResult`. If
		// that one-line mapping were impossible, the two halves would not compose
		// and the split would have been a division rather than a whole.
		addContextTransform("ext-reduce", {
			name: "collapse",
			transform: (branch, tok) => {
				// Thresholds lowered deliberately: the defaults protect the trailing 5
				// messages / 2000 tokens, which is the whole of a 6-entry branch, so at
				// defaults this would correctly do nothing and prove nothing.
				const result = reduceContext(branch, tok, {
					protectRecentMessages: 0,
					protectRecentTokens: 0,
					minimumSavings: 0,
				});
				return { prunedCount: result.collapsedResults + result.shrunkMessages, tokensSaved: result.tokensSaved };
			},
		});

		const outcome = runContextTransforms(entries, tokenizer);

		expect(outcome.errors).toEqual([]);
		expect(outcome.total.tokensSaved).toBeGreaterThan(0);
		expect(outcome.total.prunedCount).toBeGreaterThan(0);
		// The reduction is real, not just reported: the branch is materially smaller.
		expect(tokenizer.countTokens(JSON.stringify(entries))).toBeLessThan(before);
	});

	it("leaves core's transforms alone when no extension registers one", () => {
		// The empty-state invariant, restated against a real branch: the seam must be
		// inert until something opts in, or every session pays for a registry nobody
		// is using.
		const entries = readRun(["a.ts", "b.ts", "c.ts"]);
		const before = tokenizer.countTokens(JSON.stringify(entries));

		runContextTransforms(entries, tokenizer);

		expect(tokenizer.countTokens(JSON.stringify(entries))).toBe(before);
	});
});
