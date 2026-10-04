/**
 * `workflow_control` — the model-facing half of the run state machine.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/workflow-control-tool.ts` in full (285 lines), with three adaptations, each forced by the
 * host and each recorded below.
 *
 * ## 1. ArkType, not TypeBox
 *
 * The reference builds the schema with `Type.Object`; this host takes ArkType (`api.arktype` IS
 * omptype's `type`). The emitted wire document was measured before this port, not assumed: the
 * ArkType form below emits top-level `"type": "object"` with **no** `anyOf`, `action` as a
 * five-value `enum`, only `action` required, and `additionalProperties: false`. That is the
 * reference's schema with `additionalProperties: false` intact.
 *
 * ## 2. No `prepareArguments` — `normalizeInput` runs inside `execute`
 *
 * THE TRAP. This host's `ToolDefinition` (packages/coding-agent/src/extensibility/extensions/
 * types.ts:852) has no `prepareArguments` hook, so a copied `prepareArguments: normalizeInput`
 * would be an unknown property and the runtime checks would silently never run. `normalizeInput`
 * is therefore called as the first statement of `execute`.
 *
 * This matters because ArkType validates `parameters` BEFORE `execute`. Every check
 * `normalizeInput` performs that ArkType can also perform is now enforced twice — harmless. But
 * one check is the whole point and ArkType CANNOT express it: `checkpointId` is declared
 * optional on the schema, so `{action: "status", runId, checkpointId}` passes validation and
 * arrives at `normalizeInput`, which is the only thing that can refuse it. That row is
 * `control-schema.test.ts`'s "checkpointId + status THROWS", and it is the reason this file is
 * not a straight copy.
 *
 * ## 3. Registration is not here
 *
 * The reference calls `defineTool` and registers in the same breath. This module RETURNS the
 * tool definition; handing it to `api.registerTool` is the extension entrypoint's job (bead
 * `.12`). That is the epic's thesis in a boundary: the tool is a value a host chooses to
 * register, not something that registers itself.
 */
import { type } from "@oh-my-pi/omptype";
import { runSummary } from "../persistence/record-store";
import { type RunStatus, allowedActions } from "../status";
import type { WorkflowSnapshot } from "../types";
import { type Usage, aggregateAgentUsage, tokenFigures } from "../usage";

/**
 * The tool shape this module RETURNS.
 *
 * Declared here rather than imported from `@oh-my-pi/pi-coding-agent` on purpose. The host's
 * `ToolDefinition` types `execute` against `Static<TParams>` and a five-argument signature; this
 * module's `execute` takes `(toolCallId, raw: unknown)` because it must run `normalizeInput`
 * over the UNVALIDATED arguments (see adaptation 2). Importing the core type would force either
 * a cast or a lie about what this function accepts. Bead `.12` assigns this to
 * `api.registerTool`, and that assignment is where the two shapes meet.
 */
export interface WorkflowControlToolDefinition {
	name: string;
	label: string;
	description: string;
	parameters: typeof workflowControlSchema;
	approval: "read" | "write" | "exec";
	execute(toolCallId: string, raw: unknown): Promise<ControlResult>;
}

/**
 * The slice of the manager this tool reads.
 *
 * Declared structurally rather than imported so the tool can be built and tested before
 * `manager.ts` exists, and so the manager's own surface is free to grow without a circular
 * import. `listRuns` and `listAllRuns` are both required because the reference uses each for a
 * different question: `listRuns` answers "what can I show" and `listAllRuns` answers "does this
 * runId exist" — a lookup that must still find a run the live list has dropped.
 */
export interface WorkflowManagerLike {
	listRuns(): WorkflowRun[];
	listAllRuns(): WorkflowRun[];
	getSnapshot(runId: string): WorkflowSnapshot | null | undefined;
	pause(runId: string): boolean;
	resume(runId: string, options?: { checkpointId?: string }): Promise<boolean>;
	stop(runId: string): boolean;
}

/** The persisted shape this tool reads off a run. */
export interface WorkflowRun {
	runId: string;
	status: RunStatus;
	workflowName?: string;
	currentPhase?: string | null;
	[key: string]: unknown;
}

/**
 * TRAP 1 — the schema must be an OBJECT, never a union.
 *
 * A discriminated `Type.Union` of two objects serialises to a top-level `anyOf` with no `type`,
 * and strict providers (DeepSeek is named in the reference) reject that with "schema must be
 * type object, got type: null". So: ONE object, `action` is the full verb set as a union of
 * literals, and `runId` is optional AT THE SCHEMA LEVEL. The per-action requirement — runId is
 * mandatory for everything except `list`, and only `resume` accepts `checkpointId` — is a
 * schema-level union the wire cannot express, so it lives in {@link normalizeInput}.
 */
export const workflowControlSchema = type({
	action: "'list' | 'status' | 'pause' | 'resume' | 'stop'",
	"runId?": "string >= 1",
	"checkpointId?": "string >= 1",
}).onUndeclaredKey("reject");

export type WorkflowControlInput = typeof workflowControlSchema.infer;

export interface WorkflowControlToolOptions {
	/** Live manager accessor; preferred over a closed-over manager so the extension may replace it. */
	getManager(): WorkflowManagerLike;
}

/** Everything the tool reports about one run. Copied from the reference's `WorkflowControlRunDetails`. */
export interface WorkflowControlRunDetails {
	runId: string;
	workflowName: string;
	status: RunStatus;
	phase: string | null;
	checkpoint: { checkpointId: string; kind?: string; status?: string } | null;
	counts: {
		total: number;
		done: number;
		running: number;
		queued: number;
		error: number;
		skipped: number;
	};
	activeLabels: string[];
	tokenTotal: number;
	/** True when tokenTotal includes character-heuristic estimates. */
	tokenTotalEstimated?: boolean;
}

export interface ControlResult {
	content: Array<{ type: "text"; text: string }>;
	details: Record<string, unknown>;
}

export function createWorkflowControlTool(options: WorkflowControlToolOptions): WorkflowControlToolDefinition {
	const getManager = (): WorkflowManagerLike => {
		const manager = options.getManager();
		if (!manager) throw new Error("workflow_control: no WorkflowManager configured");
		return manager;
	};
	return {
		name: "workflow_control",
		label: "Workflow Control",
		description:
			"List and inspect workflow runs, or pause, resume, and stop them without asking the user to run slash commands.",
		parameters: workflowControlSchema,
		// `list` is read-only; the rest mutate a run. The host's approval tiers are per-tool, not
		// per-action, so the honest declaration is the strongest action this tool can perform.
		approval: "write",
		async execute(_toolCallId: string, raw: unknown) {
			// See adaptation 2. ArkType has already validated `parameters` by this point; this
			// call is what enforces the constraints the wire format cannot express.
			const params = normalizeInput(raw);
			const manager = getManager();
			if (params.action === "list") {
				const runs = manager.listRuns();
				const summaries = runs.map(run => summarizeRun(run, manager.getSnapshot(run.runId)));
				return result(
					summaries.length
						? `action=list result=ok runs=${summaries.length}\n${summaries.map(formatRun).join("\n")}`
						: "action=list result=ok runs=0",
					{ action: "list", result: "ok", runs: summaries },
				);
			}

			// runId is optional in the schema (see workflowControlSchema) but required for every
			// non-list action. normalizeInput enforces it; this guard narrows the type and returns
			// a structured error if a model somehow calls a run action without one.
			if (!params.runId) return controlError(params.action, "", "runId is required for this action", ["list"]);
			const run = findRun(manager, params.runId);
			if (!run) return controlError(params.action, params.runId, "run not found", ["list"]);

			try {
				switch (params.action) {
					case "status": {
						const summary = summarizeRun(run, manager.getSnapshot(run.runId));
						return result(`action=status result=ok ${formatRun(summary)}`, {
							action: "status",
							result: "ok",
							run: summary,
						});
					}
					case "pause":
						if (!manager.pause(run.runId)) return invalidTransition("pause", run);
						return actionSuccess("pause", "paused", currentSummary(manager, run));
					case "resume": {
						const resumeOptions =
							params.checkpointId === undefined ? undefined : { checkpointId: params.checkpointId };
						if (!(await manager.resume(run.runId, resumeOptions))) return invalidTransition("resume", run);
						return actionSuccess("resume", "resumed", currentSummary(manager, run));
					}
					case "stop":
						if (!manager.stop(run.runId)) return invalidTransition("stop", run);
						return actionSuccess("stop", "stopped", currentSummary(manager, run));
				}
			} catch (err) {
				// TRAP 2. A transient persistence I/O error (or any unexpected throw from the
				// manager) must not reach the model as a raw stack trace — it travels as data.
				const message = err instanceof Error ? err.message : String(err);
				return controlError(params.action, run.runId, message, allowedActions(run.status));
			}
		},
	};
}

/**
 * Copied from `src/workflow-control-tool.ts:152-182`, messages verbatim.
 *
 * The key table is the trap: `checkpointId` is accepted ONLY by `resume`, and `list` accepts
 * nothing but `action`. `status` + `checkpointId` throws here and nowhere else, because the
 * schema cannot say it.
 */
function normalizeInput(value: unknown): WorkflowControlInput {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("workflow_control requires an object argument");
	}
	const input = value as Record<string, unknown>;
	const actions = new Set<string>(["list", "status", "pause", "resume", "stop"]);
	if (typeof input.action !== "string" || !actions.has(input.action)) {
		throw new Error("workflow_control requires action: list|status|pause|resume|stop");
	}

	const allowedKeys =
		input.action === "list"
			? new Set(["action"])
			: input.action === "resume"
				? new Set(["action", "runId", "checkpointId"])
				: new Set(["action", "runId"]);
	const extraKey = Object.keys(input).find(key => !allowedKeys.has(key));
	if (extraKey) throw new Error(`workflow_control action "${input.action}" does not accept ${extraKey}`);

	if (input.action !== "list" && (typeof input.runId !== "string" || !input.runId.trim())) {
		throw new Error(`workflow_control action "${input.action}" requires runId`);
	}
	if (
		input.action === "resume" &&
		Object.hasOwn(input, "checkpointId") &&
		(typeof input.checkpointId !== "string" || input.checkpointId.length === 0)
	) {
		throw new Error('workflow_control action "resume" requires a non-empty checkpointId');
	}
	return input as WorkflowControlInput;
}

function result(text: string, details: Record<string, unknown>): ControlResult {
	return { content: [{ type: "text", text }], details };
}

function findRun(manager: WorkflowManagerLike, runId: string): WorkflowRun | undefined {
	return manager.listAllRuns().find(candidate => candidate.runId === runId);
}

/**
 * Re-read the run AFTER the transition.
 *
 * Copied from `:192-195`. The `run` handed to `actionSuccess` is the pre-transition record, so
 * formatting it directly would report the status the run just left.
 */
function currentSummary(manager: WorkflowManagerLike, fallback: WorkflowRun): WorkflowControlRunDetails {
	const current = findRun(manager, fallback.runId) ?? fallback;
	return summarizeRun(current, manager.getSnapshot(current.runId));
}

function actionSuccess(action: string, actionResult: string, run: WorkflowControlRunDetails): ControlResult {
	return result(`action=${action} result=${actionResult} ${formatRun(run)}`, { action, result: actionResult, run });
}

function invalidTransition(action: string, run: WorkflowRun): ControlResult {
	return controlError(action, run.runId, `cannot ${action} run with status ${run.status}`, allowedActions(run.status));
}

/**
 * TRAP 2 — copied from `src/workflow-control-tool.ts:209-214`.
 *
 * A THROWN tool error is an opaque failure to the model. A RETURNED structured error carries
 * `allowedActions`, so the model can recover without another round trip. Errors travel as data.
 */
function controlError(action: string, runId: string, message: string, allowed: string[]): ControlResult {
	return result(
		`action=${action} result=error runId=${runId} error=${message} allowed=${allowed.join(",") || "none"}`,
		{ action, result: "error", runId, error: message, allowedActions: allowed },
	);
}

/**
 * Copied from `src/workflow-control-tool.ts:231-264`.
 *
 * The `Math.max` across three sources is the load-bearing line: a resumed run's live snapshot
 * starts empty while its persisted record still knows what was spent, so taking the live figure
 * alone would display FEWER tokens than the run actually used — and a run that looks cheaper
 * after a resume is exactly the kind of quiet wrongness nobody reports.
 */
function summarizeRun(run: WorkflowRun, live?: WorkflowSnapshot | null): WorkflowControlRunDetails {
	const summary = runSummary(run);
	const agents = live?.agents ?? [];
	const counts = live
		? countAgents(agents)
		: {
				total: summary.total,
				done: summary.done,
				running: summary.running,
				queued: summary.queued,
				error: summary.error,
				skipped: summary.skipped,
			};
	const liveUsage = tokenFigures(live?.tokenUsage);
	const persistedUsage = tokenFigures(readUsage(run.tokenUsage));
	const agentUsage = live ? aggregateAgentUsage(agents) : summary.usage;
	return {
		runId: run.runId,
		workflowName: live?.name ?? run.workflowName ?? "",
		status: run.status,
		phase: live?.currentPhase ?? run.currentPhase ?? null,
		checkpoint: summary.checkpoint,
		counts,
		activeLabels: live
			? agents.filter(agent => agent.status === "running").map(agent => agent.label)
			: summary.activeLabels,
		tokenTotal: Math.max(
			liveUsage.fresh + liveUsage.cacheRead,
			persistedUsage.fresh + persistedUsage.cacheRead,
			agentUsage.fresh + agentUsage.cacheRead,
		),
		tokenTotalEstimated: liveUsage.estimated || persistedUsage.estimated || agentUsage.estimated,
	};
}

/**
 * Narrow a persisted `tokenUsage` off a run record.
 *
 * `WorkflowRun` carries an index signature, so `run.tokenUsage` is `unknown` — it came off the
 * journal, which stores whatever the run wrote. A non-object there is treated as ABSENT rather
 * than coerced: `tokenFigures` would read `undefined` off every field of a number and report a
 * confident 0, which is how a malformed record turns into "this run spent no tokens" rather than
 * "this run's token count is unreadable".
 */
function readUsage(value: unknown): Usage | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
	return value as Usage;
}

/** Copied from `src/workflow-control-tool.ts:266-275`. */
function countAgents(agents: Array<{ status: string }>): WorkflowControlRunDetails["counts"] {
	return {
		total: agents.length,
		done: agents.filter(agent => agent.status === "done").length,
		running: agents.filter(agent => agent.status === "running").length,
		queued: agents.filter(agent => agent.status === "queued").length,
		error: agents.filter(agent => agent.status === "error").length,
		skipped: agents.filter(agent => agent.status === "skipped").length,
	};
}

/**
 * Copied from `src/workflow-control-tool.ts:277-281`.
 *
 * The `~` prefix marks a figure that includes character-heuristic estimates. It is a PREFIX, not
 * a suffix or a separate column, so a parser reading the field after `tokens=` can tell an
 * estimate from an exact count without a second field.
 */
function formatRun(run: WorkflowControlRunDetails): string {
	const active = run.activeLabels.join(",") || "-";
	const checkpoint = JSON.stringify(run.checkpoint ?? null);
	return `runId=${run.runId} name=${quote(run.workflowName)} status=${run.status} phase=${quote(run.phase ?? "-")} checkpoint=${checkpoint} total=${run.counts.total} done=${run.counts.done} running=${run.counts.running} queued=${run.counts.queued} error=${run.counts.error} skipped=${run.counts.skipped} active=${quote(active)} tokens=${run.tokenTotalEstimated ? "~" : ""}${run.tokenTotal}`;
}

function quote(value: string): string {
	return JSON.stringify(value);
}
