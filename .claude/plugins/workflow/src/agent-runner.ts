/**
 * The agent bridge: `agent()` wired to the host's subagent runtime.
 *
 * Bead `epic-dynamic-workflows-259n.5` §3.2. Copied from `pi-dynamic-workflows`
 * `src/workflow.ts:182-184` (`WorkflowAgentRunner` — the seam) and the result-reading rules the
 * plan spells out at `:758-760` and `:2346-2348`.
 *
 * ## `agent()` RETURNS `null`. It never throws.
 *
 * This is the contract, and it is a data-flow decision rather than an error-handling one. A
 * failed agent must be a value the script BRANCHES ON. Throwing instead means every workflow
 * needs a try/catch around every call, and a script that forgets one loses the whole run rather
 * than one step. It is the same shape as bug #87501 — a message reporting `success: true` for
 * something never received — one layer down.
 *
 * ## `data` is present even when validation REJECTS it
 *
 * `StructuredSubagentOutput` (`packages/tui/src/tools/task.ts:2119`) is
 * `{ source, mode, status: "valid" | "invalid" | "unavailable", data?, error? }`. Strict mode
 * deliberately KEEPS the parsed-but-invalid payload, for diagnostics. So reading `data` directly
 * reports a schema violation as a success. {@link readAgentOutcome} checks `status` FIRST; every
 * other rule in this file follows from that one.
 */
import { isEmptyTextAgentResult } from "./agent-bridge";

/** What the host hands back. Structural, so the bridge needs no import from `packages/tui`. */
export interface StructuredOutputLike {
	status: string;
	data?: unknown;
	error?: string;
}

export interface SubagentResultLike {
	/** The agent's assistant text. */
	output: string;
	/** Non-zero means the child failed. */
	exitCode: number;
	structuredOutput?: StructuredOutputLike;
}

export interface AgentRunOptions {
	schema?: unknown;
	model?: string;
	effort?: unknown;
	signal?: AbortSignal;
	onProgress?: (update: unknown) => void;
	timeoutMs?: number;
	/** The parent agent's name; blocks a child from recursively spawning it. */
	blockedAgent?: string;
}

/**
 * The seam the bead names: the engine depends on this and nothing else, which is why the bridge
 * can be replaced wholesale without the engine changing.
 */
export interface WorkflowAgentRunner {
	run(prompt: string, options?: AgentRunOptions): Promise<unknown>;
}

/**
 * Decide what `agent()` returns from what the host produced. Never throws.
 *
 * Two branches, and the ORDER is the contract:
 *
 * 1. **A schema was requested.** Only `status === "valid"` yields `data`. `invalid` and
 *    `unavailable` both return `null` even though `data` may be sitting right there — that
 *    payload is diagnostics, and a strict-mode violation reported as a success is precisely the
 *    inversion this function exists to prevent.
 * 2. **No schema.** The assistant text is the result. A non-zero `exitCode` returns `null`,
 *    because a child that failed did not produce an answer however much text it wrote.
 *
 * An empty text result is returned as-is rather than nulled here: whether empty text counts as
 * emptiness depends on whether a schema was in play, and {@link isEmptyTextAgentResult} already
 * encodes that rule. The script decides, not this function.
 */
export function readAgentOutcome(result: SubagentResultLike, schema: unknown): unknown {
	if (schema !== undefined) {
		const structured = result.structuredOutput;
		// Presence of the key is not enough — `status` is the verdict, and it is checked before
		// `data` is even looked at.
		if (!structured || structured.status !== "valid") return null;
		return structured.data ?? null;
	}
	if (result.exitCode !== 0) return null;
	return result.output;
}

export interface StructuredSubagentRunnerDeps {
	/** Injected so tests need no real `ToolSession`; production passes `runStructuredSubagent`. */
	invoke(request: {
		assignment: string;
		outputSchema?: unknown;
		model?: string;
		effort?: unknown;
		signal?: AbortSignal;
		onProgress?: (update: unknown) => void;
		blockedAgent?: string;
		maxRuntimeMs: number;
	}): Promise<{ result: SubagentResultLike }>;
}

/**
 * Build the runner over an injected invoker.
 *
 * The invoker is injected rather than imported directly so the inversion in
 * {@link readAgentOutcome} is reachable from a test without standing up a session, a lease, or a
 * child process. Everything the host gives us is funnelled through ONE try/catch here, so the
 * "never throws" contract has exactly one place it could be broken.
 */
export function createStructuredSubagentRunner(deps: StructuredSubagentRunnerDeps): WorkflowAgentRunner {
	return {
		async run(prompt, options = {}) {
			try {
				const { result } = await deps.invoke({
					assignment: prompt,
					// Presence, not truthiness: an explicit `schema: undefined` must not become a
					// truthy check that silently drops the request.
					...(options.schema !== undefined ? { outputSchema: options.schema } : {}),
					...(options.model !== undefined ? { model: options.model } : {}),
					...(options.effort !== undefined ? { effort: options.effort } : {}),
					...(options.signal !== undefined ? { signal: options.signal } : {}),
					...(options.onProgress !== undefined ? { onProgress: options.onProgress } : {}),
					...(options.blockedAgent !== undefined ? { blockedAgent: options.blockedAgent } : {}),
					maxRuntimeMs: options.timeoutMs ?? 0,
				});
				return readAgentOutcome(result, options.schema);
			} catch {
				// A throw HERE would cross into the script and abort the run. The failure is
				// reported as `null`, which is what §3.1 promises the script it can branch on.
				return null;
			}
		},
	};
}

export { isEmptyTextAgentResult };
