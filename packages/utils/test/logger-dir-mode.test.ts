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
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-logmode-"));
	roots.push(root);
	return root;
}

describe("log directory permissions", () => {
	test("tightens a directory that already existed at the wider mode", () => {
		// The state of every machine that ran ultraworkers before the mode was set: the
		// directory is already there, so `mkdir` succeeds silently and never touches
		// the mode. Those users hold the MOST logs, so leaving them at umask is the
		// worst outcome, and it is the one `mode` alone cannot fix.
		const dir = path.join(tempRoot(), "logs");
		fs.mkdirSync(dir, { recursive: true });
		expect(fs.statSync(dir).mode & 0o777).toBe(0o755);

		setTransports({ file: dir });
		info("probe");

		expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
	});

	test("creates the directory readable and writable only by its owner", () => {
		const dir = path.join(tempRoot(), "logs");
		setTransports({ file: dir });
		// A real log line, because the sink creates its directory lazily on first
		// write. Creating the file by hand would test the directory this test made
		// rather than the one the logger made.
		info("probe");

		const mode = fs.statSync(dir).mode & 0o777;
		// Exactly 0700, not "no group/other bits": a mode of 0o750 still lets every
		// account on the machine read every transcript fragment ultraworkers ever logged.
		expect(mode).toBe(0o700);
	});
});
