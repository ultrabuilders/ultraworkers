import { describe, expect, it } from "bun:test";
import { defineTask, MemoryStorage, type TaskId, type TaskInspection } from "@oh-my-pi/pi-durable";
import { context } from "./session-support";
import { completed, deferred, eventually, openTasks, waitFor } from "./task-support";

type Step = { phase: "run" };

/** A one-phase task that completes once `gate` resolves; `migrate` runs when an older stored version migrates. */
function task(name: string, version: number, options: { gate?: Promise<void>; migrate?: () => void } = {}) {
	const migrate = options.migrate;
	return defineTask<null, Step, null>({
		name,
		version,
		initial: () => ({ phase: "run" }),
		phases: {
			run: async (_task, runtime, ctx) => {
				await options.gate;
				await runtime.commit(() => completed(null), ctx);
			},
		},
		abort: async () => {},
		...(migrate === undefined
			? {}
			: {
					migrate: () => {
						migrate();
						return { input: null, checkpoint: { phase: "run" as const } };
					},
				}),
	});
}

function stateOf(tasks: readonly TaskInspection[], id: TaskId): TaskInspection["state"] | undefined {
	return tasks.find(entry => entry.record.id === id)?.state;
}

describe("Harness.inspect()", () => {
	it("derives every live task's state without running task code", async () => {
		const gate = deferred();
		const Gate = task("test.gate", 1, { gate: gate.promise });
		const Dependent = task("test.dependent", 1);
		let migrations = 0;
		const registered = [
			Gate,
			Dependent,
			task("test.migrating", 2, {
				migrate: () => {
					migrations++;
				},
			}),
			task("test.no-migration", 2),
			task("test.failing", 2, {
				migrate: () => {
					throw new Error("cannot migrate");
				},
			}),
			task("test.too-old", 1),
		];
		const { harness } = await openTasks(new MemoryStorage(), registered);
		const root = await harness.root(context);
		const ids = await root.commit(async tx => {
			const gateId = await tx.createTask(Gate, null);
			return {
				gate: gateId,
				dependent: await tx.createTask(Dependent, null, { after: [gateId] }),
				// Stored by definitions other than the registered ones.
				migrating: await tx.createTask(task("test.migrating", 1), null),
				noMigration: await tx.createTask(task("test.no-migration", 1), null),
				failing: await tx.createTask(task("test.failing", 1), null),
				tooOld: await tx.createTask(task("test.too-old", 2), null),
				missing: await tx.createTask(task("test.missing", 1), null),
			};
		}, context);

		const paused = await harness.inspect(context);
		expect(paused.scheduling).toBe("paused");
		expect(paused.tasks.map(entry => entry.record.id)).toEqual(Object.values(ids));
		expect(stateOf(paused.tasks, ids.gate)).toEqual({ kind: "ready", migrates: false });
		expect(stateOf(paused.tasks, ids.dependent)).toEqual({ kind: "waiting", on: [ids.gate] });
		expect(stateOf(paused.tasks, ids.migrating)).toEqual({ kind: "ready", migrates: true });
		// A migration that was never tried is not run to find out.
		expect(stateOf(paused.tasks, ids.failing)).toEqual({ kind: "ready", migrates: true });
		expect(stateOf(paused.tasks, ids.noMigration)).toMatchObject({
			kind: "blocked",
			reason: "migration_failed",
			error: new Error("Task test.no-migration version 2 has no migration from 1"),
		});
		expect(stateOf(paused.tasks, ids.tooOld)).toEqual({ kind: "blocked", reason: "task_too_old" });
		expect(stateOf(paused.tasks, ids.missing)).toEqual({ kind: "blocked", reason: "missing_task" });
		expect(migrations).toBe(0);
		expect((await harness.inspect(context)).scheduling).toBe("paused");

		harness.resume();
		await eventually(() => migrations === 1);
		await harness.waitForTask(ids.migrating, context);
		let running = await harness.inspect(context);
		await waitFor(async () => {
			running = await harness.inspect(context);
			return stateOf(running.tasks, ids.gate)?.kind === "running";
		});
		expect(running.scheduling).toBe("running");
		expect(stateOf(running.tasks, ids.gate)).toEqual({ kind: "running" });
		expect(stateOf(running.tasks, ids.migrating)).toBeUndefined();
		expect(stateOf(running.tasks, ids.failing)).toEqual({
			kind: "blocked",
			reason: "migration_failed",
			error: new Error("cannot migrate"),
		});

		gate.resolve();
		await harness.waitForTask(ids.dependent, context);
		const settled = await harness.inspect(context);
		expect(settled.tasks.map(entry => entry.record.id)).toEqual([
			ids.noMigration,
			ids.failing,
			ids.tooOld,
			ids.missing,
		]);
		await harness.close(context);
	});
});
