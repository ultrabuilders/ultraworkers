import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { info, setTransports } from "../src/logger";

/**
 * The log directory is created owner-only.
 *
 * A log line can carry a request header, a resolved URL, or a tool argument, and
 * `~/.omp/logs` sits inside the user's home directory. Left at the default, umask
 * decides whether every other local account can list and read it — so this is a
 * check that passes on one machine and fails on another, which is the worst kind.
 *
 * Goes through `setTransports({ file })`, the real entry, rather than the private
 * helper: the helper is where the mode is set, but the contract is about the
 * directory that actually ends up on disk.
 */

const roots: string[] = [];

afterEach(() => {
	setTransports({ console: false, file: false });
	for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "omp-logmode-"));
	roots.push(root);
	return root;
}

describe("log directory permissions", () => {
	test("creates the directory readable and writable only by its owner", () => {
		const dir = path.join(tempRoot(), "logs");
		setTransports({ file: dir });
		// A real log line, because the sink creates its directory lazily on first
		// write. Creating the file by hand would test the directory this test made
		// rather than the one the logger made.
		info("probe");

		const mode = fs.statSync(dir).mode & 0o777;
		// Exactly 0700, not "no group/other bits": a mode of 0o750 still lets every
		// account on the machine read every transcript fragment omp ever logged.
		expect(mode).toBe(0o700);
	});
});
