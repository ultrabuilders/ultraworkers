/**
 * An extension manifest filed under a key the loader does not read.
 *
 * `discoverExtensionModulePaths` reads `"omp"` and `"pi"` from a subdirectory's
 * package.json and nothing else. An author who writes the brand name instead gets an
 * extension that never loads — no error, no warning, the subdirectory is simply not
 * discovered — and the docblock that misled them is gone by the time they go looking.
 * The loader now names the key it found and the keys it reads.
 *
 * The second row is the one that keeps the warning worth having. `extensions/` holds
 * ordinary package.json files (name, version, main, …), so a warning that fired on
 * any unread key would train the author to ignore it, which is worse than the silence
 * it replaced. The warning fires on shape, not on novelty: a value carrying an
 * `extensions` array is an attempt at a manifest, and everything else is not.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { LoadContext } from "@oh-my-pi/pi-coding-agent/capability";
import { discoverExtensionModulePaths } from "@oh-my-pi/pi-coding-agent/discovery/helpers";
import { logger, removeWithRetries } from "@oh-my-pi/pi-utils";

/** Unused by the discovery path; the signature carries it for callers that do. */
const NO_CTX = {} as LoadContext;

describe("an extension subdirectory's package.json", () => {
	let dir: string;
	let warn: ReturnType<typeof vi.spyOn<typeof logger, "warn">>;

	async function writeExtension(name: string, pkg: unknown): Promise<void> {
		const sub = path.join(dir, name);
		await fs.mkdir(sub, { recursive: true });
		// `main.ts`, not `index.ts`: an index file is found by the subdirectory-index
		// rule, which would discover the extension whether or not the manifest parsed,
		// and the manifest rule would be untested.
		await fs.writeFile(path.join(sub, "main.ts"), "export default {};\n");
		await fs.writeFile(path.join(sub, "package.json"), JSON.stringify(pkg));
	}

	function warnings(): string[] {
		return warn.mock.calls.map(call => String(call[0]));
	}

	beforeEach(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), "ext-module-key-"));
		warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await removeWithRetries(dir);
	});

	it("loads an extension declared under a key the loader reads, and says nothing", async () => {
		await writeExtension("good", { name: "good", omp: { extensions: ["./main.ts"] } });

		const discovered = await discoverExtensionModulePaths(NO_CTX, dir);

		expect(discovered).toEqual([path.join(dir, "good", "main.ts")]);
		expect(warnings()).toEqual([]);
	});

	it("does not load a manifest filed under the brand name, and names the key it found", async () => {
		// The failure this exists for: nothing loads and nothing says why.
		await writeExtension("misspelled", { name: "misspelled", ultraworkers: { extensions: ["./main.ts"] } });

		const discovered = await discoverExtensionModulePaths(NO_CTX, dir);

		expect(discovered).toEqual([]);
		const warning = warnings().find(line => line.includes("misspelled"));
		expect(warning).toBeDefined();
		// Both halves of the message carry information the author did not have: which
		// key was there, and which keys are actually read.
		expect(warning).toContain('"ultraworkers"');
		expect(warning).toContain('"omp"');
		expect(warning).toContain('"pi"');
	});

	it("stays silent for a package.json that is not claiming to be a manifest", async () => {
		// The noise guard. Without this row the warning could fire on every ordinary
		// package.json under extensions/ and become something an author learns to skip.
		await writeExtension("ordinary", { name: "ordinary", version: "1.0.0", main: "./main.ts" });

		const discovered = await discoverExtensionModulePaths(NO_CTX, dir);

		expect(discovered).toEqual([]);
		expect(warnings()).toEqual([]);
	});
});
