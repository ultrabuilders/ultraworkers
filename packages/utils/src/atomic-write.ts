import * as fs from "node:fs/promises";

/**
 * Windows `rename` already replaces an existing destination, so a failure here
 * is a handle race — antivirus or a search indexer holding the file open — not
 * a signal that the target must be removed first. Retrying clears it.
 *
 * The same class of error is already treated as retryable in `./temp`.
 */
const RETRYABLE_RENAME_CODES = new Set(["EBUSY", "EPERM", "EACCES"]);
const RENAME_ATTEMPTS = 5;
const RENAME_RETRY_MS = 20;

/** Distinguishes concurrent writers; a fixed `.tmp` name lets them clobber each other. */
let tmpCounter = 0;

/**
 * Write JSON to `filePath` so a reader never observes a half-written file.
 *
 * The content goes to a sibling temp file first, then a single `rename` puts
 * it in place. Writing in place instead would leave a truncated file behind if
 * the process died mid-write, and these files are the durable record of what a
 * user installed.
 *
 * If the rename cannot be completed, this throws and leaves the previous file
 * untouched. It deliberately does not unlink the target first: that opens a
 * window in which the file does not exist at all, and a reader would see an
 * empty plugin list as "nothing is installed" — and if the following rename
 * also failed, the old contents would be gone with no copy at the real path.
 * Losing the ability to write is recoverable; losing the install list is not.
 *
 * Concurrent callers writing the same path need no external lock: the temp name
 * is unique per call, so no writer can consume another's temp file. Callers that
 * need read-modify-write semantics (read, decide, write) still need a lock over
 * that whole sequence — this only makes each individual write atomic.
 */
export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
	const content = `${JSON.stringify(data, null, 2)}\n`;
	const tmpPath = `${filePath}.${process.pid}.${tmpCounter++}.tmp`;

	await Bun.write(tmpPath, content);

	try {
		for (let attempt = 1; ; attempt++) {
			try {
				await fs.rename(tmpPath, filePath);
				return;
			} catch (err) {
				const code = (err as NodeJS.ErrnoException).code;
				if (attempt >= RENAME_ATTEMPTS || !RETRYABLE_RENAME_CODES.has(code ?? "")) throw err;
				await Bun.sleep(RENAME_RETRY_MS * attempt);
			}
		}
	} catch (err) {
		// Clean up the temp file on failure so a rejected write leaves no debris.
		// Best effort: the write already failed, and a leftover temp file is
		// inert — nothing ever reads it back.
		try {
			await fs.unlink(tmpPath);
		} catch {
			// Best effort
		}
		throw err;
	}
}
