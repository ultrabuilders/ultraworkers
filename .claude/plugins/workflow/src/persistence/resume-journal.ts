/**
 * Resume identity: which agent call a cached result belongs to.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/workflow.ts`: the
 * `callSeq` / `firstMiss` state (`:501-509`), the counter and key (`:892`, `:918`),
 * `hashAgentCall` (`:2264-2292`) and the replay gate (`:935-970`).
 *
 * ## Why `callSeq` must stay LEXICAL
 *
 * The reference says it outright at `:919`: *"callIndex/agentCount must stay lexical"*. The
 * counter is the resume key, so its value is a function of **where the call sits in the
 * source text**, not of what the call did. A conditional increment — one that skips the
 * counter for a budget-blocked call, say — renumbers every call after it, and resume then
 * serves each cached result to the wrong call. The failure is invisible: every replay "works",
 * and the run assembles a plausible answer out of mispaired results.
 *
 * ## Why `deltaKey` must carry `runId`
 *
 * `callIndex` alone is not run-unique. A nested `workflow()` shares this run's store but
 * restarts its own `callSeq` at 0, so a parent agent and a nested-run agent can both hold
 * `callIndex` 0. Whichever commits last overwrites the other's journaled delta — and because
 * `deltaKey` doubles as the `onAgentStart`/`onAgentEnd`/`onAgentHistory` event id, one agent's
 * events get attributed to the other. Two SEQUENTIAL sibling nested runs repeat the collision
 * too, so nesting depth would not have saved it either.
 *
 * ## Why `firstMiss` is a barrier and not a per-call check
 *
 * Once one call misses, everything after it runs live. Serving a cached result *after* a miss
 * would splice old and new execution together: the missed call's effects are missing from the
 * store, so a later cached result was computed against a store that no longer exists. The
 * longest-unchanged-prefix rule is what makes replay sound rather than merely cheap.
 */
import { createHash } from "node:crypto";

/**
 * A cached result, as the resume journal holds it.
 *
 * NOT a local shape: this is `PersistedJournalEntry` from `./run-persistence`, which already
 * carries the `index` and `runId` a lookup needs. Defining a second entry type here produced one
 * without those fields, so the test that looks entries up by `runId` + `index` could not even be
 * written against it — a duplicate type that quietly dropped the keys its consumers require.
 */
import type { PersistedJournalEntry as ResumeJournalEntry } from "./run-persistence";
export type { ResumeJournalEntry };

/**
 * The subset of `agent()` options that participate in the call hash.
 *
 * Structural rather than a named `AgentOptions`: the ledger cuts that type (it existed to
 * generate docs), so naming it here would re-import the cut. The members below are exactly the
 * ones `hashAgentCall` reads.
 */
export interface AgentCallIdentity {
	prompt: string;
	model?: string;
	phase?: string;
	agentType?: string;
	tier?: string;
	thinking?: unknown;
	thread?: string;
	schema?: unknown;
	cwd?: string;
	isolation?: unknown;
	keepWorktree?: boolean;
	/** Resolved agent definition key (tools/model/prompt), so editing an agent .md invalidates. */
	agentDefKey: string | null;
}

/**
 * Copied verbatim from `:2264-2292`.
 *
 * Two omissions are load-bearing and both are marked in the reference:
 *
 * - `cwd` is spread only when supplied, so journals written before `cwd` existed keep their
 *   exact hash and resume behaviour. Always emitting `"cwd": null` would silently invalidate
 *   every journal an older release wrote.
 * - The RESOLVED model is deliberately not hashed; the journal records it separately. The cache
 *   key stays spec-level, so a resumed run's replayed rows do not regress to the session default.
 */
export function hashAgentCall(identity: AgentCallIdentity, resolvedIsolation?: "worktree"): string {
	const json = JSON.stringify({
		prompt: identity.prompt,
		model: identity.model ?? null,
		tier: identity.tier ?? null,
		...(identity.thinking ? { thinking: identity.thinking } : {}),
		phase: identity.phase ?? null,
		agentType: identity.agentType ?? null,
		...(identity.thread ? { thread: identity.thread } : {}),
		agentDef: identity.agentDefKey,
		schema: identity.schema ?? null,
		...(identity.cwd === undefined ? {} : { cwd: identity.cwd }),
		...(identity.isolation !== undefined ? { isolation: identity.isolation } : {}),
		...(resolvedIsolation === "worktree" ? { keepWorktree: identity.keepWorktree !== false } : {}),
	});
	return createHash("sha256").update(json).digest("hex");
}

/** The resume-relevant counters a run carries while executing. */
export interface ResumeState {
	/** Monotonic, assigned at lexical agent() call time — the stable resume key. */
	callSeq: number;
	/**
	 * Index of the first call that missed the resume journal (changed or new).
	 * Longest-unchanged-prefix resume: a cached result is replayed only while
	 * `callIndex < firstMiss`; once a call misses, it AND everything after run live.
	 */
	firstMiss: number;
	/**
	 * A `thread` call cannot be replayed — threads interleave with the agent that spawned them,
	 * so their arrival order is not a function of the script. Reaching one closes the prefix.
	 */
	resumeBarrierReached: boolean;
}

export function newResumeState(): ResumeState {
	return { callSeq: 0, firstMiss: Number.POSITIVE_INFINITY, resumeBarrierReached: false };
}

/**
 * Take the next call index. Lexical by construction: it reads and increments, and never
 * branches on anything about the call.
 */
export function nextCallIndex(state: ResumeState): number {
	return state.callSeq++;
}

/**
 * The store-delta key, which is also the agent event id. Copied from `:918`.
 * Composing the run's own id — unique per top-level run AND per nested run — with the call
 * index makes the key unique across the whole store.
 */
export function deltaKeyFor(runId: string, callIndex: number): string {
	return `${runId}:${callIndex}`;
}

export type ResumeDecision = { kind: "replay"; entry: ResumeJournalEntry } | { kind: "live"; missed: boolean };

/**
 * The replay gate, copied from `:935-970`.
 *
 * A call replays when ALL of these hold, and each is load-bearing:
 *
 * - no barrier reached — a `thread` call ahead of this one makes replay unsound
 * - a journal entry exists whose `hash` matches — an edited call must not serve a stale result
 * - the cached result is not empty — an empty result is what a *broken* previous run wrote, and
 *   replaying it would make a failure permanent instead of re-running it live
 * - `callIndex < firstMiss` — the longest-unchanged-prefix rule
 *
 * `missed` distinguishes "this call is new or changed" from "this call is unchanged but past
 * the barrier". Only the former moves `firstMiss`: the barrier is already closed, and lowering
 * it again would be a no-op that hides which call actually changed.
 */
export function decideResume(args: {
	barrierReached: boolean;
	cached: ResumeJournalEntry | undefined;
	callHash: string;
	cachedEmptyOutput: boolean;
	callIndex: number;
	firstMiss: number;
}): ResumeDecision {
	const hashMatches = args.cached != null && args.cached.hash === args.callHash;
	const missed = !hashMatches || args.cachedEmptyOutput;
	if (!args.barrierReached && hashMatches && !args.cachedEmptyOutput && args.callIndex < args.firstMiss) {
		// `hashMatches` proved `cached` is non-null, so this is not an assertion the caller must maintain.
		return { kind: "replay", entry: args.cached as ResumeJournalEntry };
	}
	return { kind: "live", missed };
}

/**
 * Record where the unchanged prefix ended. Copied from `:968`.
 * `Math.min` because a run may meet several barriers; the EARLIEST miss is the one that matters.
 */
export function markFirstMiss(state: ResumeState, callIndex: number): void {
	state.firstMiss = Math.min(state.firstMiss, callIndex);
}
