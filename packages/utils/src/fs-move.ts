/**
 * Filesystem moves that cross device boundaries.
 *
 * Lifted out of `cli/gc-cli.ts`, which had a private copy. The EXDEV fallback is
 * the whole reason this is not a one-line `fs.rename`: the config root and the
 * XDG roots routinely live on different volumes (a home directory on an internal
 * disk, `$XDG_CACHE_HOME` on the boot volume), and `rename` fails there.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { hasFsCode } from "./fs-error";

/**
 * Move `source` to `destination`, creating the destination's parent first.
 *
 * Falls back to copy-then-delete when `rename` reports `EXDEV`. The source is
 * only removed after the copy has fully succeeded, so a failure part-way
 * through leaves the data at the source rather than half of it at each end.
 */
export async function movePath(source: string, destination: string): Promise<void> {
	await fs.mkdir(path.dirname(destination), { recursive: true });
	try {
		await fs.rename(source, destination);
		return;
	} catch (error) {
		if (!hasFsCode(error, "EXDEV")) throw error;
	}
	const stat = await fs.stat(source);
	if (stat.isDirectory()) {
		await fs.cp(source, destination, { recursive: true });
		await fs.rm(source, { recursive: true, force: true });
		return;
	}
	await fs.copyFile(source, destination);
	await fs.unlink(source);
}
