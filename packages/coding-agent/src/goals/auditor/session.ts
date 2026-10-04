import type { Api, Model } from "@oh-my-pi/pi-ai";
import type { CreateAgentSessionOptions } from "../../sdk";
import { parseAuditorDecision, type AuditorVerdict } from "./contract";
import { buildGoalAuditorPrompt } from "./prompt";

/**
 * epic-fj9g (P2) — the isolated auditor session.
 *
 * Ported from `pi-goal-x` v0.32.3, `runGoalCompletionAuditor()`
 * (`extensions/goal-auditor.ts:306-489`, MIT © 2026 Lucas).
 *
 * ## The isolation, and why it is not the task lane
 *
 * The bead originally substituted `runStructuredSubagent` for the reference's
 * `createAgentSession`, because we have a structured lane the reference lacks. That
 * substitution is what forced a core change: `structured-subagent.ts:545-556` hands the
 * child the parent's `skills`, `promptTemplates`, `rules`, `contextFiles`,
 * `extensionRoots` and `preloadedPreparedExtensions` with no way to opt out.
 *
 * `createAgentSession` has no such problem — every inherited resource is an explicit
 * option whose default is *discovery*. Pass the empties and the session is isolated with
 * no core change. `commit/agentic/agent.ts:60` is the in-core precedent: a purpose-built
 * session with LSP and MCP off.
 *
 * ## The fences
 *
 * Both fences the bead asks for are one mechanism — the tool allowlist:
 *
 * - **tool fence.** `restrictToolNames: true` plus `toolNames` limits the session to
 *   exactly those names "without discovered extras", so `goal` is not merely discouraged,
 *   it is absent from the session's tool table.
 * - **agent-type fence.** `task` is likewise absent, so the auditor cannot spawn anything
 *   at all — including itself. This is strictly stronger than the reference's
 *   `blockedAgent`, which only blocks re-entering the same agent type; here there is no
 *   spawn path to block.
 *
 * `bash` is deliberate. The auditor must be able to run the exact verification command
 * the objective names. Read-only enforcement is the allowlist's job, not the prompt's.
 */

/**
 * The auditor's tool surface: inspection only.
 *
 * `goal` and `task` are absent by construction. `bash` stays because a success criterion
 * like "the gate passes" is only checkable by running it.
 */
export const AUDITOR_TOOL_NAMES = ["read", "grep", "find", "ls", "bash"] as const;

/**
 * The options that constitute the auditor's isolation, as a `Pick` of the real
 * `CreateAgentSessionOptions` so a name typo here is a compile error rather than a
 * silently ignored option at runtime.
 */
export interface AuditorIsolationOptions {
	/** Tool names explicitly requested. */
	toolNames: string[];
	/** Limit the session to explicitly supplied tool names, without discovered extras. */
	restrictToolNames: boolean;
	skills: CreateAgentSessionOptions["skills"];
	rules: CreateAgentSessionOptions["rules"];
	contextFiles: CreateAgentSessionOptions["contextFiles"];
	promptTemplates: CreateAgentSessionOptions["promptTemplates"];
	slashCommands: CreateAgentSessionOptions["slashCommands"];
	/** Disable extension discovery entirely (explicit paths still load). */
	disableExtensionDiscovery: boolean;
	/** Skip MCP discovery so no process-global or inherited MCP server is reachable. */
	enableMCP: boolean;
	enableLsp: boolean;
	/** Removes IRC, so the auditor cannot reach the peer bus its author can. */
	enableIrc: boolean;
}

/**
 * Build the auditor's isolation. Pure — this IS the fence, and it is what the session
 * tests assert against.
 *
 * Every collection is empty and every ambient capability is off. A future edit that adds
 * a resource here has to also add the test row that catches the auditor inheriting it.
 */
export function buildAuditorIsolation(): AuditorIsolationOptions {
	return {
		toolNames: [...AUDITOR_TOOL_NAMES],
		restrictToolNames: true,
		skills: [],
		rules: [],
		contextFiles: [],
		promptTemplates: [],
		slashCommands: [],
		disableExtensionDiscovery: true,
		enableMCP: false,
		enableLsp: false,
		enableIrc: false,
	};
}

/** The session surface the runner drives. `AgentSession` satisfies it structurally. */
export interface AuditorSessionLike {
	prompt(text: string): Promise<unknown>;
	subscribe(listener: (event: unknown) => void): () => void;
	abort(): void;
	dispose?(): void;
}

/** What the factory is asked to build. The production adapter maps it onto the SDK. */
export interface AuditorSessionSpec extends AuditorIsolationOptions {
	cwd: string;
	model: Model<Api>;
}

/**
 * Injectable so the runner is testable without a model. The reference exposes the same
 * seam (`createSession`) for the same reason.
 */
export type AuditorSessionFactory = (spec: AuditorSessionSpec) => Promise<AuditorSessionLike>;

export interface GoalAuditorResult {
	verdict: AuditorVerdict;
	/** Whatever text the auditor produced, for display. Never used to decide approval. */
	output: string;
	/** `provider/id` of the auditing model, when one was resolved. */
	model?: string;
	/** Present exactly when `verdict` is `"error"`. */
	error?: string;
}

/** Stream events carry assistant text parts; only those contribute to the report. */
interface AuditorStreamEvent {
	type?: string;
	part?: { type?: string; text?: string };
}

function modelLabel(model: Model<Api> | undefined): string | undefined {
	return model ? `${model.provider}/${model.id}` : undefined;
}

/**
 * Run the completion auditor and decide whether a goal may close.
 *
 * **Fails closed on every path.** No error, no abort, and no unrecognised output can
 * produce `"approved"`: the verdict comes from {@link parseAuditorDecision}, which returns
 * `"approved"` for one shape only — an exact `<approved/>` as the final non-empty line.
 */
export async function runGoalCompletionAuditor(args: {
	createSession: AuditorSessionFactory;
	cwd: string;
	model: Model<Api>;
	/** Refuse the audit with a reason instead of running one. */
	modelError?: string;
	objective: string;
	completionSummary?: string | null;
	signal?: AbortSignal;
}): Promise<GoalAuditorResult> {
	const model = args.modelError ? undefined : args.model;
	const refusal = (error: string, output = ""): GoalAuditorResult => ({
		verdict: "error",
		output,
		model: modelLabel(model),
		error,
	});

	if (args.modelError) return refusal(args.modelError);

	const outputParts: string[] = [];
	try {
		// Checked BEFORE the prompt: an already-aborted signal must not start a session.
		if (args.signal?.aborted) return refusal("Auditor aborted.");

		const session = await args.createSession({
			cwd: args.cwd,
			model: args.model,
			...buildAuditorIsolation(),
		});

		const unsubscribe = session.subscribe((event: unknown) => {
			const { part } = event as AuditorStreamEvent;
			if (part?.type === "text" && typeof part.text === "string") outputParts.push(part.text);
		});
		const abortSession = () => session.abort();
		args.signal?.addEventListener("abort", abortSession, { once: true });

		try {
			await session.prompt(buildGoalAuditorPrompt({
				objective: args.objective,
				completionSummary: args.completionSummary,
			}));
		} finally {
			args.signal?.removeEventListener("abort", abortSession);
			unsubscribe();
			session.dispose?.();
		}

		const output = outputParts.join("\n\n").trim();

		// `abort()` does NOT throw — the agent loop returns normally with whatever output
		// it had produced. So the signal is checked AFTER prompt() returns, and any abort
		// is treated as aborted regardless of whether an exception propagated.
		if (args.signal?.aborted) return refusal("Auditor aborted.", output);

		return { verdict: parseAuditorDecision(output), output, model: modelLabel(model) };
	} catch (error) {
		const aborted =
			args.signal?.aborted || (error instanceof Error && error.name === "AbortError");
		return refusal(
			aborted ? "Auditor aborted." : error instanceof Error ? error.message : String(error),
			outputParts.join("\n\n").trim(),
		);
	}
}