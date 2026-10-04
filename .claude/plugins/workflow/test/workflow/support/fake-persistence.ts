/**
 * A `WorkflowPersistence` the manager can be driven against.
 *
 * Records the ORDER of calls, not just the last state, because the property bead `.7` is about
 * is an ordering — persist before observe, release before delete — and a fake that only remembers
 * the final state cannot observe an ordering at all.
 */
import type { PersistedRun, RunLease, WorkflowPersistence } from "../../../src/manager";

export type StorageEvent =
	| { kind: "acquire"; runId: string }
	| { kind: "release"; runId: string }
	| { kind: "save"; runId: string }
	| { kind: "delete"; runId: string };

export interface FakePersistence extends WorkflowPersistence {
	/** Every storage call in order. */
	events: StorageEvent[];
	/** Current records by runId. */
	records: Map<string, PersistedRun>;
	/** Leases currently held. */
	held: Map<string, RunLease>;
}

export interface FakePersistenceOptions {
	/** Make `save` throw, to exercise the persist-failure path. */
	saveThrows?: Error;
	/** Lease acquire answers null — someone else holds it. */
	acquireFails?: boolean;
	/** Records the fake starts with, for `load`/`listAll`/`recoverStaleRuns`. */
	initial?: PersistedRun[];
}

export function fakePersistence(options: FakePersistenceOptions = {}): FakePersistence {
	const events: StorageEvent[] = [];
	const records = new Map<string, PersistedRun>();
	const held = new Map<string, RunLease>();
	for (const record of options.initial ?? []) records.set(record.runId, record);

	return {
		events,
		records,
		held,
		acquireRunLease(runId, runPath) {
			events.push({ kind: "acquire", runId });
			if (options.acquireFails || held.has(runId)) return null;
			const lease: RunLease = { runId, token: `tok-${runId}-${held.size}` };
			held.set(runId, lease);
			void runPath;
			return lease;
		},
		releaseRunLease(lease) {
			events.push({ kind: "release", runId: lease.runId });
			if (held.get(lease.runId)?.token === lease.token) held.delete(lease.runId);
		},
		save(run) {
			events.push({ kind: "save", runId: run.runId });
			if (options.saveThrows) throw options.saveThrows;
			records.set(run.runId, run);
		},
		load(runId) {
			return records.get(runId);
		},
		listAll() {
			return [...records.values()];
		},
		deleteRun(runId) {
			events.push({ kind: "delete", runId });
			records.delete(runId);
		},
	};
}

/** The order storage was touched, as `kind:runId` strings — comparable in one assertion. */
export function trace(persistence: FakePersistence): string[] {
	return persistence.events.map(event => `${event.kind}:${event.runId}`);
}

/** A script `parseWorkflowScript` accepts: a literal `meta` as the first statement. */
export const SCRIPT = 'export const meta = { name: "deploy", description: "d" };';
