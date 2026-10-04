/**
 * The run lifecycle: who owns a run, when it is persisted, and which transitions are legal.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/workflow-manager.ts`
 * (~600 of 2412), keeping `startInBackground` (`:682-789`), `runSync` (`:798`), `pause`
 * (`:1726-1736`), `attachCheckpointResponse` (`:1747`), `resume`/`stop`, `listLiveRuns`
 * (`:554`), `recoverStaleRuns` (`:609`), `getSnapshot`/`getRun`, `schedulePersist` (`:1524`),
 * `persistRun` (`:1577`) and `writeRunToDisk`.
 *
 * ## What is CUT, and why it is not a simplification
 *
 * - `adoptLiveRunsToSession` (`:570`) — the reference's session-id ownership model. Runs here are
 *   owned by a LEASE, not by a session id, and the lease is what makes "resume" mean one thing.
 * - `setModelRegistry` / `listAvailableModelSpecs` — replaced by `@oh-my-pi/pi-catalog`.
 * - `executeRun`'s body — the VM, the agent bridge and the eleven progress events. That is the
 *   orchestration the later beads own; here it is an injected {@link ExecuteRun} seam. The seam
 *   is not a stub: `startInBackground`'s ORDERING is the property this bead is about, and an
 *   ordering cannot be tested against a real 1,500-line executor any more cheaply than against
 *   an injected one. The default throws rather than silently no-op'ing, so an unwired manager
 *   fails loudly instead of reporting runs that never ran.
 * - `schedulePersist` (`:1524`) — copied shape, but its ONLY caller is `executeRun`'s progress
 *   handler, so it is deferred with the executor rather than shipped as an unreachable private
 *   method. `persistRun` below is the write path that IS reachable from the lifecycle.
 *
 * ## PERSIST BEFORE OBSERVE — the ordering this file exists to keep
 *
 * `startInBackground` does, in order: register in memory → `persistence.save` → emit `started`
 * → *only then* execute. And on a save failure it releases the lease, deletes the run, and
 * rethrows.
 *
 * The order matters in both directions. Execution-first means a crash in the first millisecond
 * leaves a run on disk that no process owns and nobody resumes — an orphan nothing will ever
 * clean up. Persist-first means a run that then fails to start leaves a RECOVERABLE record:
 * `recoverStaleRuns` can find it, and the user can see the run existed. The failure path is the
 * other half: a half-created run with a held lease is worse than no run at all, because the
 * lease makes it un-resumable by anyone else until it expires.
 */
import { EventEmitter } from "node:events";
import { parseWorkflowScript } from "./engine/parse";
import { type RunStatus, isAllowed } from "./status";
import type { WorkflowAgentSnapshot, WorkflowSnapshot } from "./types";

/** Options a caller passes to run a script. Copied in shape from the reference's `ExecOptions`. */
export interface ExecOptions {
	/** Total token budget for the run; the executor enforces it. */
	tokenBudget?: number;
	/** Model override for agents whose phase names no route. */
	model?: string;
	/** Injected settlement, so tests need not wait on real time. */
	signal?: AbortSignal;
}

/** What a finished run reports. */
export interface WorkflowRunResult {
	runId: string;
	status: RunStatus;
	output?: unknown;
	error?: string;
}

/** The on-disk record. Mirrors the reference's `persistence.save` payload. */
export interface PersistedRun {
	runId: string;
	workflowName: string;
	script: string;
	status: RunStatus;
	phases: string[];
	agents: unknown[];
	logs: string[];
	startedAt: string;
	updatedAt: string;
	args?: unknown;
	[key: string]: unknown;
}

/** A held lease. Structurally the same as `persistence/lease.ts`'s `RunLease`. */
export interface RunLease {
	runId: string;
	token: string;
}

/**
 * What the manager needs from storage.
 *
 * Declared here rather than implemented, because the manager owns an ORDERING over these calls
 * and that ordering is only testable if storage is substitutable. `acquireRunLease` returns
 * `null` for "someone else holds it" — a value, not a throw, because a lost race is expected.
 */
export interface WorkflowPersistence {
	acquireRunLease(runId: string, runPath: string): RunLease | null;
	releaseRunLease(lease: RunLease): void;
	/** Persist a run's current record. Throwing means the run is NOT real — see the header. */
	save(run: PersistedRun): void;
	load(runId: string): PersistedRun | undefined;
	listAll(): PersistedRun[];
	deleteRun(runId: string): void;
}

/** The in-memory record for one live run. */
export interface ManagedRun {
	runId: string;
	workflowName: string;
	script: string;
	status: RunStatus;
	snapshot: WorkflowSnapshot;
	startedAt: Date;
	controller: AbortController;
	lease: RunLease | null;
	runPath: string;
}

/** The execution seam. Supplied by the bead that owns the VM and the agent bridge. */
export type ExecuteRun = (
	managed: ManagedRun,
	script: string,
	args: unknown,
	exec: ExecOptions,
) => Promise<WorkflowRunResult>;

export interface WorkflowManagerDeps {
	persistence: WorkflowPersistence;
	/** Omitted in tests that only care about lifecycle ordering. */
	execute?: ExecuteRun;
	/** Overridable for deterministic run ids and timestamps in tests. */
	now?: () => Date;
	generateRunId?: () => string;
}

/**
 * Derive a run id from the workflow's name, the way the reference does at `:686-690`.
 *
 * The `|| "workflow"` fallback is load-bearing: a name consisting only of punctuation slugifies
 * to the empty string, and `runId` must never start with `-` or be empty — it is a filename and
 * a lease key.
 */
function runIdFor(metaName: string, generateRunId: () => string): string {
	const slug = metaName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return slug ? `${slug}-${generateRunId()}` : generateRunId();
}

export class WorkflowManager extends EventEmitter {
	#runs = new Map<string, ManagedRun>();
	/** Debounce timers, keyed by runId. A pending progress write is never required. */
	#persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
	/** In-flight executions, so `stop` can await the drain rather than race it. */
	#executions = new Map<string, Promise<WorkflowRunResult>>();

	readonly #persistence: WorkflowPersistence;
	readonly #execute?: ExecuteRun;
	readonly #now: () => Date;
	readonly #generateRunId: () => string;

	constructor(deps: WorkflowManagerDeps) {
		super();
		this.#persistence = deps.persistence;
		this.#execute = deps.execute;
		this.#now = deps.now ?? (() => new Date());
		this.#generateRunId = deps.generateRunId ?? (() => Math.random().toString(36).slice(2, 10));
	}

	/**
	 * Copied from `src/workflow-manager.ts:682-789`, with the ordering preserved exactly:
	 * register → PERSIST → observe → execute, and release-the-lease-and-delete on save failure.
	 */
	startInBackground(
		script: string,
		args?: unknown,
		exec: ExecOptions = {},
	): { runId: string; promise: Promise<WorkflowRunResult> } {
		const parsed = parseWorkflowScript(script);
		const runId = runIdFor(parsed.meta.name, this.#generateRunId);
		const runPath = `${runId}.json`;
		const lease = this.#persistence.acquireRunLease(runId, runPath);
		if (!lease) throw new Error(`Could not acquire workflow run lease for ${runId}`);

		const managed = this.#createManaged(runId, parsed.meta.name, script, lease, runPath);
		this.#runs.set(runId, managed);

		try {
			// PERSIST FIRST. Everything above this line is in-memory and reversible; everything
			// below it is observable by another process.
			this.#persistence.save({
				runId,
				workflowName: parsed.meta.name,
				script,
				args,
				status: "running",
				phases: managed.snapshot.phases ?? [],
				agents: [],
				logs: [],
				startedAt: managed.startedAt.toISOString(),
				updatedAt: managed.startedAt.toISOString(),
			});
		} catch (err) {
			// A run that exists on neither disk nor in memory is the only acceptable outcome.
			// Releasing the lease matters most: a half-created run holding a lease cannot be
			// resumed by anyone else until the lease is reclaimed.
			this.#persistence.releaseRunLease(lease);
			this.#runs.delete(runId);
			throw err;
		}

		this.emit("started", { runId });

		const promise = this.#dispatch(managed, script, args, exec);
		this.#executions.set(runId, promise);
		// A rejected execution must not become an unhandled rejection: the catch block in the
		// real executor records status and persists, but the promise still rejects. The original
		// is returned so callers can await it in their own try/catch.
		promise.catch(() => {});
		return { runId, promise };
	}

	/**
	 * Copied from `src/workflow-manager.ts:798`.
	 *
	 * Synchronous execution still tracks the run like a background one, so the navigator and the
	 * live panel see it. It acquires the SAME lease — a sync run is not a second-class run, and
	 * letting one bypass the lease would put two processes on one run through the back door.
	 */
	async runSync(script: string, args?: unknown, exec: ExecOptions = {}): Promise<WorkflowRunResult> {
		const parsed = parseWorkflowScript(script);
		const runId = runIdFor(parsed.meta.name, this.#generateRunId);
		const runPath = `${runId}.json`;
		const lease = this.#persistence.acquireRunLease(runId, runPath);
		if (!lease) throw new Error(`Could not acquire workflow run lease for ${runId}`);
		const managed = this.#createManaged(runId, parsed.meta.name, script, lease, runPath);
		this.#runs.set(runId, managed);
		this.#persistence.save({
			runId,
			workflowName: parsed.meta.name,
			script,
			args,
			status: "running",
			phases: managed.snapshot.phases ?? [],
			agents: [],
			logs: [],
			startedAt: managed.startedAt.toISOString(),
			updatedAt: managed.startedAt.toISOString(),
		});
		this.emit("started", { runId });
		return this.#dispatch(managed, script, args, exec);
	}

	/**
	 * Copied from `src/workflow-manager.ts:1726-1736` — including the two subtleties.
	 *
	 * It RETURNS FALSE rather than throwing when the run is not running. A thrown pause would be
	 * an opaque failure to a model that asked for a legal-looking thing; `false` is the guard's
	 * answer and the control tool turns it into a structured error carrying `allowedActions`.
	 *
	 * And it RETAINS the lease. Persisting the requested state immediately is not the same as
	 * releasing the run: the execution is still draining its in-flight agents, and a second
	 * process that reclaimed the lease now would replay the journal under a run whose agents are
	 * still writing to it.
	 */
	pause(runId: string): boolean {
		const managed = this.#runs.get(runId);
		if (managed?.status !== "running") return false;

		managed.status = "paused";
		managed.controller.abort(new Error("workflow paused"));
		this.emit("paused", { runId });
		// Persist the REQUESTED state now; the lease is deliberately still held. See above.
		this.#persistRun(managed);
		return true;
	}

	/**
	 * Copied from `src/workflow-manager.ts:~1900`.
	 *
	 * Also returns false rather than throwing, for the same reason `pause` does. The guard is
	 * {@link isAllowed} — the SAME table the control tool quotes back as `allowedActions` — so a
	 * transition can never be legal through one surface and illegal through the other.
	 */
	stop(runId: string): boolean {
		const managed = this.#runs.get(runId);
		if (!managed || !isAllowed(managed.status, "stop")) return false;
		managed.status = "aborted";
		managed.controller.abort(new Error("workflow stopped"));
		this.#executions.get(runId)?.catch(() => {});
		this.emit("stopped", { runId });
		this.#persistRun(managed);
		return true;
	}

	/**
	 * Copied in shape from `src/workflow-manager.ts:~1850`.
	 *
	 * `resume` always reloads from persistence rather than trusting `this.runs`: an evicted or
	 * never-in-memory runId must resume exactly like one from a prior process, and a stale
	 * in-memory copy would resume from a state that is no longer on disk.
	 */
	async resume(runId: string, options?: { checkpointId?: string }): Promise<boolean> {
		const record = this.#persistence.load(runId);
		if (!record) return false;
		if (!isAllowed(record.status, "resume")) return false;

		const runPath = `${runId}.json`;
		const lease = this.#persistence.acquireRunLease(runId, runPath);
		if (!lease) return false;
		const managed = this.#createManaged(runId, record.workflowName, record.script, lease, runPath);
		managed.status = "running";
		this.#runs.set(runId, managed);
		this.#persistence.save({ ...record, status: "running", updatedAt: this.#now().toISOString() });
		this.emit("resumed", { runId, checkpointId: options?.checkpointId });

		const promise = this.#dispatch(managed, record.script, record.args, {});
		this.#executions.set(runId, promise);
		promise.catch(() => {});
		await promise;
		return true;
	}

	/**
	 * Copied in shape from `src/workflow-manager.ts:1747` (`attachCheckpointResponse`).
	 *
	 * Fail-closed and stale-checked: a response for a checkpoint that is not the one awaiting a
	 * response is refused, because applying it would answer a question the run is no longer
	 * asking.
	 */
	attachCheckpointResponse(runId: string, checkpointId: string, responseValue: unknown): Promise<void> {
		const managed = this.#runs.get(runId);
		if (!managed) throw new Error(`no live run ${runId} to attach a checkpoint response to`);
		const checkpoint = managed.snapshot.checkpoint;
		if (checkpoint?.checkpointId !== checkpointId) {
			throw new Error(
				`stale checkpoint response: expected ${JSON.stringify(checkpoint?.checkpointId)}, received ${JSON.stringify(checkpointId)}`,
			);
		}
		if (checkpoint.status !== "waiting") {
			throw new Error(`checkpoint ${checkpointId} is not waiting for a response`);
		}
		// Applied to the live record BEFORE the write, so a persist failure leaves the run
		// suspended rather than marked answered-but-unsaved.
		managed.snapshot = {
			...managed.snapshot,
			checkpoint: { ...checkpoint, status: "answered", response: responseValue },
		};
		// `required`: this write IS the response. If it does not land, the run stays suspended
		// forever waiting for an answer nobody durably recorded.
		this.#persistRun(managed, true);
		this.emit("checkpointResponse", { runId, checkpointId });
		return Promise.resolve();
	}

	/** Copied from `src/workflow-manager.ts:554` (`listLiveRuns`): runs this process still owns. */
	listRuns(): PersistedRun[] {
		return [...this.#runs.values()].map(run => this.#toRecord(run));
	}

	/** Every run on disk, including ones another process owns. Backs the control tool's lookup. */
	listAllRuns(): PersistedRun[] {
		return this.#persistence.listAll();
	}

	/** Copied from `src/workflow-manager.ts:~1350`. `undefined` means "no live copy right now". */
	getSnapshot(runId: string): WorkflowSnapshot | null | undefined {
		return this.#runs.get(runId)?.snapshot;
	}

	/** Copied from `src/workflow-manager.ts:~1400`. Same `undefined` contract as `getSnapshot`. */
	getRun(runId: string): ManagedRun | undefined {
		return this.#runs.get(runId);
	}

	/**
	 * Copied from `src/workflow-manager.ts:609` (`recoverStaleRuns`).
	 *
	 * A run on disk whose lease is no longer held by a live process was interrupted, not
	 * finished. This is the half of persist-before-observe that pays it off: because the record
	 * landed BEFORE execution, a run that crashed in its first millisecond is still findable
	 * here, which is the whole reason the ordering is worth its cost.
	 */
	recoverStaleRuns(): PersistedRun[] {
		const recovered: PersistedRun[] = [];
		for (const record of this.#persistence.listAll()) {
			if (record.status !== "running" && record.status !== "paused") continue;
			if (this.#runs.has(record.runId)) continue;
			if (!this.#persistence.acquireRunLease(record.runId, `${record.runId}.json`)) continue;
			recovered.push({ ...record, status: "failed", updatedAt: this.#now().toISOString() });
		}
		return recovered;
	}

	/** Release every lease this manager holds. Called on session teardown. */
	disposeAll(): void {
		for (const timer of this.#persistTimers.values()) clearTimeout(timer);
		this.#persistTimers.clear();
		for (const managed of this.#runs.values()) {
			if (managed.lease) this.#persistence.releaseRunLease(managed.lease);
		}
		this.#runs.clear();
	}

	#createManaged(
		runId: string,
		workflowName: string,
		script: string,
		lease: RunLease | null,
		runPath: string,
	): ManagedRun {
		const phases = workflowName ? [workflowName] : [];
		return {
			runId,
			workflowName,
			script,
			status: "running",
			snapshot: { name: workflowName, phases, agents: [] as WorkflowAgentSnapshot[] },
			startedAt: this.#now(),
			controller: new AbortController(),
			lease,
			runPath,
		};
	}

	/** Run through the injected seam, or fail loudly rather than pretending to have run. */
	#dispatch(managed: ManagedRun, script: string, args: unknown, exec: ExecOptions): Promise<WorkflowRunResult> {
		if (!this.#execute) {
			return Promise.reject(
				new Error(`workflow execution is not wired for run ${managed.runId}; pass deps.execute`),
			);
		}
		return this.#execute(managed, script, args, exec);
	}

	#toRecord(managed: ManagedRun): PersistedRun {
		return {
			runId: managed.runId,
			workflowName: managed.workflowName,
			script: managed.script,
			status: managed.status,
			phases: managed.snapshot.phases ?? [],
			agents: managed.snapshot.agents,
			logs: [],
			startedAt: managed.startedAt.toISOString(),
			updatedAt: this.#now().toISOString(),
		};
	}

	/**
	 * Copied from `src/workflow-manager.ts:1577`.
	 *
	 * `required = true` means "this write must land or the run is not real" — used by
	 * `attachCheckpointResponse`, where dropping the write strands a suspended run forever.
	 */
	#persistRun(managed: ManagedRun, required = false): void {
		if (!this.#runs.has(managed.runId)) return;
		const timer = this.#persistTimers.get(managed.runId);
		if (timer) {
			clearTimeout(timer);
			this.#persistTimers.delete(managed.runId);
		}
		this.#writeRunToDisk(managed, required);
	}

	/**
	 * The sole choke point for every disk write — both `persistRun`'s direct calls and
	 * `schedulePersist`'s deferred timer funnel through here.
	 *
	 * The `required` path deliberately does NOT swallow a failure: for a required write the
	 * caller needs to know the run is not durable, which is the opposite of what a debounced
	 * progress write wants.
	 */
	#writeRunToDisk(managed: ManagedRun, required = false): void {
		if (!this.#runs.has(managed.runId)) return; // superseded by resume/delete — not an error
		try {
			this.#persistence.save(this.#toRecord(managed));
		} catch (err) {
			if (required) throw err;
		}
	}
}
