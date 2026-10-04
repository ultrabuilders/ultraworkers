/**
 * `storageStatePath()` chooses where `tab.saveState()` writes when the caller
 * gives no explicit path. That default used to be a hardcoded `.omp`, which is
 * wrong in *both* directions depending on the machine: a fresh install wrote
 * state into the legacy root, and any move toward the write root would strand
 * the state a legacy install already had on disk.
 *
 * The resolver cannot be varied in-process — `getConfigReadRootName()` reads
 * `os.homedir()`, and Bun resolves that from the environment *at startup*, so
 * assigning `process.env.HOME` afterwards changes nothing. Each case therefore
 * runs in a child process with its own HOME. That is the cost of testing the
 * one thing that matters here: the two install shapes cannot be reproduced any
 * other way, which is exactly why the original defect survived.
 */
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const STORAGE_STATE_SRC = path.resolve(import.meta.dir, "../../src/tools/browser/storage-state.ts");

/** Resolve the default save path in a child process whose HOME is `home`. */
async function defaultPathUnder(home: string): Promise<string> {
	const script =
		`const { storageStatePath } = await import(${JSON.stringify(STORAGE_STATE_SRC)});` +
		`console.log(storageStatePath("tab", undefined, process.cwd()));`;
	const env: Record<string, string | undefined> = {
		...process.env,
		HOME: home,
		USERPROFILE: home,
		NO_COLOR: "1",
	};
	// An ambient override would silently decide the answer for both cases.
	delete env.PI_CODING_AGENT_DIR;
	delete env.PI_PROFILE;
	delete env.PI_CONFIG_DIR;
	delete env.ULTRAWORKERS_CONFIG_DIR;

	const proc = Bun.spawn([process.execPath, "-e", script], { env, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0) throw new Error(`storageStatePath probe exited ${code}: ${stderr}`);
	return stdout.trim();
}

describe("browser storageStatePath default location", () => {
	it("keeps an existing legacy install's state in the root that install already uses", async () => {
		const home = TempDir.createSync("@pi-browser-state-legacy-").path();
		await fs.mkdir(path.join(home, ".omp", "agent"), { recursive: true });
		await fs.writeFile(path.join(home, ".omp", "agent", "config.yml"), "model: test\n");

		const resolved = await defaultPathUnder(home);

		// A write-root default would strand state this install already had.
		expect(resolved).toBe(path.join(home, ".omp", "browser-state", "tab.json"));
	});

	it("uses the current config root on a fresh install with no config directory yet", async () => {
		const home = TempDir.createSync("@pi-browser-state-fresh-").path();

		const resolved = await defaultPathUnder(home);

		// A hardcoded legacy name would send a brand-new install's state to the
		// directory the rebrand is moving away from.
		expect(resolved).toBe(path.join(home, ".ultraworkers", "browser-state", "tab.json"));
	});
});
