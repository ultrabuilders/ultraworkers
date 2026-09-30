// Copied from `pi-ref` (earendil-works/pi, MIT) —
// packages/coding-agent/src/core/tools/file-mutation-queue.ts — with two changes
// required by this repo: `Promise.withResolvers` instead of a `new Promise`
// executor, and an explicit type on the module-level registration chain.
//
// Deliberately imports ONLY node builtins. The `@oh-my-pi/pi-utils` barrel pulls
// the pi_natives addon, which makes this module's tests unrunnable wherever the
// addon is not built.
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

const fileMutationQueues = new Map<string, Promise<void>>();
let registrationQueue: Promise<void> = Promise.resolve();

/**
 * The queue key is the realpath, not the resolved path.
 *
 * Two edits that reach one file through a symlink, or through a `..` segment,
 * resolve to different strings but are the same file, and would silently take two
 * independent queues — which is exactly the interleaving this module exists to
 * prevent.
 *
 * When realpath is unavailable the key degrades to the resolved path, and it does
 * so for EVERY failure, not just a missing one. A missing path is the obvious
 * case (every write is half a create), but not the only one: `realpath` also
 * fails with `EACCES` on a file whose own metadata is denied — precisely the
 * situation `deleteFileWithFallback` exists to handle. Rethrowing there would
 * make this queue break the very operation it is guarding.
 *
 * Nothing is lost by degrading. `classifyWriteFailure` already rethrows every error
 * that is neither ENOENT nor permission-denied, so a genuine ELOOP surfaces below
 * this queue, at the layer that can explain it — rethrowing here would only move
 * that error up a few lines without adding context, and would stop the operation
 * from running.
 *
 * What a degraded key DOES cost: two edits reaching one file by different paths
 * would take different locks and stop being serialised. That is a weaker lock, not
 * an unsafe one — the mutation is still performed exactly once, in full.
 */
async function getMutationQueueKey(filePath: string): Promise<string> {
	const resolvedPath = resolve(filePath);
	try {
		return await realpath(resolvedPath);
	} catch {
		return resolvedPath;
	}
}

/**
 * Serialize file mutation operations targeting the same file.
 * Operations for different files still run in parallel.
 */
export async function withFileMutationQueue<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
	// Resolving the key is itself async, so registrations are serialized too.
	// Without this, two concurrent calls can read the same `currentQueue` and both
	// chain onto its tail — the very race the queue is meant to prevent.
	const registration = registrationQueue.then(async () => {
		const key = await getMutationQueueKey(filePath);
		const currentQueue = fileMutationQueues.get(key) ?? Promise.resolve();

		const nextQueue = Promise.withResolvers<void>();
		const chainedQueue = currentQueue.then(() => nextQueue.promise);
		fileMutationQueues.set(key, chainedQueue);

		return { key, currentQueue, chainedQueue, releaseNext: nextQueue.resolve };
	});
	// The two-argument form is load-bearing: a plain `.then(() => undefined)` leaves
	// `registrationQueue` permanently rejected after one throw, deadlocking every
	// later call.
	registrationQueue = registration.then(
		() => undefined,
		() => undefined,
	);

	const { key, currentQueue, chainedQueue, releaseNext } = await registration;
	await currentQueue;
	try {
		return await fn();
	} finally {
		// `finally` is what releases the lock when the mutation THROWS: a plain chain
		// would wedge the key forever and hang every later mutation of that file.
		// The identity check stops a slow finisher from deleting a successor's lock.
		releaseNext();
		if (fileMutationQueues.get(key) === chainedQueue) {
			fileMutationQueues.delete(key);
		}
	}
}
