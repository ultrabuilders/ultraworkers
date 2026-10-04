/**
 * An exclusive cross-process lease on one workflow run.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/run-persistence.ts:374-398` and `:734-772` (the acquire/release loop), with the
 * reference's injectable `FsLayer` narrowed to `node:fs` — the indirection exists there because
 * the whole persistence layer is tested through injection, and the lease is exercised here
 * against a real temp directory instead.
 *
 * `removeStaleLegacyLock` (`:503-513`) is deliberately NOT copied: it guards the legacy
 * pre-rename lock directory, and this version has a single runs directory. It arrives with the
 * dual-directory layout in Phase 4, when there is a second path for it to guard.
 *
 * ## Why this file exists at all
 *
 * Two `omp` processes resuming the same run would each replay the journal and each append their
 * own deltas, and the result would be a run directory that describes neither execution. The
 * lease is what makes "resume" mean one thing. It is advisory-by-file-creation (`open` with
 * `wx`), which is atomic on POSIX and on Windows — not a lock service, and not a mutex.
 *
 * ## Stale locks are reclaimed, live ones are not
 *
 * A lock whose owning pid is dead is removed and the acquire retried, because a crashed process
 * must not make a run permanently unresumable. A lock whose pid is alive causes `null`. The
 * `EPERM` case matters: `process.kill(pid, 0)` throws `EPERM` when the process exists but belongs
 * to another user, and reading that as "dead" would let two processes both claim the run.
 */
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** A held lease. The token is what makes release safe against a reclaimed lock. */
export interface RunLease {
	runId: string;
	token: string;
}

/** On-disk lock contents. */
interface LockFile {
	runId: string;
	runPath: string;
	pid: number;
	startedAt: string;
	token: string;
}

/**
 * Whether a process is still running.
 *
 * Copied from `src/run-persistence.ts:379-388`. `process.kill(pid, 0)` performs the permission
 * and existence checks without delivering a signal.
 */
export function pidIsAlive(pid: number): boolean {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch (err) {
		// EPERM means the process exists and belongs to someone else. Treating it as dead would
		// hand the run to a second process while the first is still using it.
		if ((err as { code?: string }).code === "EPERM") return true;
		return false;
	}
}

/** Read and parse a lock file; anything unreadable is treated as absent. */
function readLockAt(path: string): LockFile | null {
	try {
		return JSON.parse(readFileSync(path, "utf-8")) as LockFile;
	} catch {
		return null;
	}
}

/** The filesystem operations the lease needs, so tests can drive them without a real pid. */
export interface LeaseFs {
	ensureDir(): void;
	readLockAt(path: string): LockFile | null;
	writeFileExclusive(path: string, data: string): void;
	unlink(path: string): void;
}

/** Build a lease over a runs directory, defaulting to the real filesystem. */
export function createRunLease(
	runsDir: string,
	fs?: Partial<LeaseFs>,
): {
	acquireRunLease(runId: string, runPath: string): RunLease | null;
	releaseRunLease(lease: RunLease): void;
} {
	const lockPathFor = (runId: string) => join(runsDir, `${runId}.lock`);
	const api: LeaseFs = {
		ensureDir: () => mkdirSync(runsDir, { recursive: true }),
		readLockAt,
		writeFileExclusive: (path, data) => writeFileSync(path, data, { flag: "wx" }),
		unlink: path => unlinkSync(path),
		...fs,
	};

	return {
		/**
		 * Copied from `src/run-persistence.ts:734-762`.
		 *
		 * Two attempts, because the first can lose a race: if `wx` fails with `EEXIST` and the
		 * incumbent turns out to be dead, the lock is removed and the retry re-runs the whole
		 * create. A third attempt would not help — the removal is the only thing that can change
		 * the outcome, and it has already happened.
		 */
		acquireRunLease(runId, runPath) {
			api.ensureDir();
			const lock = lockPathFor(runId);
			for (let attempt = 0; attempt < 2; attempt++) {
				const token = `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
				const payload: LockFile = {
					runId,
					runPath,
					pid: process.pid,
					startedAt: new Date().toISOString(),
					token,
				};
				try {
					api.writeFileExclusive(lock, JSON.stringify(payload, null, 2));
					return { runId, token };
				} catch (err) {
					if ((err as { code?: string }).code !== "EEXIST") throw err;
					const existing = api.readLockAt(lock);
					if (existing && existing.runPath === runPath && pidIsAlive(existing.pid)) return null;
					try {
						api.unlink(lock);
					} catch {
						return null;
					}
				}
			}
			return null;
		},

		/**
		 * Copied from `src/run-persistence.ts:764-772`.
		 *
		 * The token check is what makes this safe: between acquire and release the lock may have
		 * been reclaimed as stale and handed to another process, and unlinking it then would
		 * release somebody else's lease.
		 */
		releaseRunLease(lease) {
			try {
				const existing = api.readLockAt(lockPathFor(lease.runId));
				if (existing?.token === lease.token) api.unlink(lockPathFor(lease.runId));
			} catch {
				// Best-effort cleanup only.
			}
		},
	};
}
