/**
 * A manager the control tool can be driven against.
 *
 * Structural, not a mock framework: `mock.module()` is banned in this repo because it mutates a
 * global registry and leaks across files. This is a plain object literal implementing
 * `WorkflowManagerLike`, with each transition's outcome SETTABLE per test rather than asserted
 * against a recorded call — a test that says "pause returned false" should arrange for pause to
 * return false, and the reason it returned false (the run's status) is the thing under test.
 */
import type { WorkflowManagerLike, WorkflowRun } from "../../../src/tools/workflow-control";
import type { WorkflowSnapshot } from "../../../src/types";
import type { RunStatus } from "../../../src/status";

export interface FakeManagerOptions {
	runs?: WorkflowRun[];
	snapshots?: Record<string, WorkflowSnapshot>;
	/** Runs the manager reports as live. Defaults to every run in `runs`. */
	live?: string[];
	/** Transitions the manager ACCEPTS. Anything absent returns false, as the real one does. */
	accepts?: { pause?: string[]; resume?: string[]; stop?: string[] };
	/**
	 * When set, every transition throws this instead of answering — exercises trap 2.
	 *
	 * `Error | string` rather than `Error`, because the tool's fallback is `String(err)` and a
	 * thrown string is the shape a worker rejection or a JSON parse failure actually arrives in.
	 * Typing this `Error` would have made the row for that fallback untypeable.
	 */
	throwOnTransition?: Error | string;
}

/** Calls the fake recorded, so a row can assert what the tool DID, not just what it returned. */
export interface FakeManager extends WorkflowManagerLike {
	calls: Array<{ method: string; runId: string; checkpointId?: string }>;
}

export function fakeManager(options: FakeManagerOptions = {}): FakeManager {
	const runs = options.runs ?? [];
	const live = options.live ?? runs.map(run => run.runId);
	const accepts = options.accepts ?? {};
	const calls: FakeManager["calls"] = [];
	const record = (method: string, runId: string, checkpointId?: string) => {
		calls.push(checkpointId === undefined ? { method, runId } : { method, runId, checkpointId });
	};
	return {
		calls,
		listRuns: () => runs.filter(run => live.includes(run.runId)),
		listAllRuns: () => runs,
		getSnapshot: runId => options.snapshots?.[runId],
		pause(runId) {
			record("pause", runId);
			if (options.throwOnTransition) throw options.throwOnTransition;
			return (accepts.pause ?? []).includes(runId);
		},
		async resume(runId, resumeOptions) {
			record("resume", runId, resumeOptions?.checkpointId);
			if (options.throwOnTransition) throw options.throwOnTransition;
			return (accepts.resume ?? []).includes(runId);
		},
		stop(runId) {
			record("stop", runId);
			if (options.throwOnTransition) throw options.throwOnTransition;
			return (accepts.stop ?? []).includes(runId);
		},
	};
}

/** A run record with the given status and agent list. */
export function run(runId: string, status: RunStatus, extra: Partial<WorkflowRun> = {}): WorkflowRun {
	return { runId, status, workflowName: `wf-${runId}`, ...extra };
}

/**
 * A persisted agent list, in the shape `runSummary` counts.
 *
 * `tokenUsage` here is the per-agent split; `tokens` is the scalar fallback. Tests set one or
 * the other deliberately, because `tokenFigures` treats them as competing estimates rather than
 * as two halves of one figure.
 */
export function agents(specs: Array<{ status: string; label?: string; tokens?: number }>): unknown[] {
	return specs.map((spec, index) => ({
		id: index,
		label: spec.label ?? `agent-${index}`,
		status: spec.status,
		...(spec.tokens === undefined ? {} : { tokens: spec.tokens }),
	}));
}
