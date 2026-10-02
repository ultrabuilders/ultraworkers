import {
	type AnyTask,
	createRegistry,
	Harness,
	type Registry,
	type RegistryReader,
	type Storage,
} from "@oh-my-pi/pi-durable";
import { noModels } from "./harness-support";
import { context, flush } from "./session-support";

export type Deferred<T = void> = {
	readonly promise: Promise<T>;
	resolve(value: T): void;
	reject(error: unknown): void;
};

export function deferred<T = void>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
}

/** Reject with the signal's reason once it aborts; for handlers that block until cancelled. */
export function aborted(signal: AbortSignal): Promise<never> {
	return new Promise((_, reject) => {
		if (signal.aborted) reject(signal.reason);
		signal.addEventListener("abort", () => reject(signal.reason), { once: true });
	});
}

/** Flush macrotask turns until `check` holds. */
export async function eventually(check: () => boolean): Promise<void> {
	for (let attempt = 0; attempt < 200; attempt++) {
		if (check()) return;
		await flush();
	}
	throw new Error("Condition was not reached");
}

/**
 * Poll `check` until it holds.
 *
 * Separate from `eventually` because it AWAITS the check. A check returning a `Promise` is a truthy
 * object, so handing one to `eventually`'s `() => boolean` makes it hold on the first turn — the
 * wait becomes a no-op and the assertion after it runs on a state the harness may not have reached.
 * The deadline is wall-clock rather than a turn count, because a poll that awaits is no longer
 * bounded by macroturn flushes.
 *
 * What the evidence does and does not cover: `harness-inspect.test.ts` passes whether or not this
 * awaits, because its condition already holds on the first poll. So the await is correct by
 * construction here and is exercised by the async callers ported later — it is not defended by a
 * red-on-mutation test today, and this comment is not claiming one.
 */
export async function waitFor(check: () => boolean | Promise<boolean>, timeoutMs = 5000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (!(await check())) {
		if (Date.now() > deadline) throw new Error("Condition was not reached");
		await Bun.sleep(5);
	}
}

/** Whether `promise` has settled after pending work flushes. */
export async function settled(promise: Promise<unknown>): Promise<boolean> {
	let done = false;
	promise.then(
		() => {
			done = true;
		},
		() => {
			done = true;
		},
	);
	await flush();
	return done;
}

/** Open a Harness whose registry holds `tasks`; failures passed to `onReport` are collected. */
export async function openTasks(
	storage: Storage,
	tasks: readonly AnyTask[],
	options: { readonly registry?: Registry; readonly now?: () => number } = {},
): Promise<{ readonly harness: Harness; readonly registry: Registry; readonly reports: unknown[] }> {
	const registry = options.registry ?? createRegistry();
	for (const task of tasks) registry.tasks.add(task);
	const reports: unknown[] = [];
	const harness = await Harness.open(
		storage,
		{
			// `pi` passes `createModels()` — an empty registry — for the same reason: see
			// `noModels`. These tests drive tasks, not generation.
			models: noModels(),
			registry,
			onReport: error => reports.push(error),
			...(options.now === undefined ? {} : { now: options.now }),
		},
		context,
	);
	return { harness, registry, reports };
}

/** Next state that completes a task with `result`. */
export function completed<R>(result: R) {
	return { status: "terminal", outcome: { status: "completed", result } } as const;
}

/** Next state that aborts a task. */
export function abortedWith(reason: string) {
	return { status: "terminal", outcome: { status: "aborted", reason } } as const;
}

/** Registry reader that counts live subscriptions. */
export function countingReader(registry: Registry): RegistryReader & { subscriptions(): number } {
	let count = 0;
	return {
		snapshot: () => registry.snapshot(),
		subscribe: listener => {
			count++;
			const unsubscribe = registry.subscribe(listener);
			let active = true;
			return () => {
				if (!active) return;
				active = false;
				count--;
				unsubscribe();
			};
		},
		subscriptions: () => count,
	};
}
