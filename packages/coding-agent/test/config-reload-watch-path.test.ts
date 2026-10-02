/**
 * The one level `config-reload-seam.test.ts` deliberately does not reach: the call
 * from `Settings.#reloadFromWatch` into the reload-observer registry.
 *
 * ## Why this file exists
 *
 * Every row in that file drives `runConfigReloadPass` directly. That proves the
 * registry's own contract — a handler can hold a reload, unregistering restores
 * the original answer — but it says nothing about whether the host ever *calls*
 * it. Measured at HEAD before this file was written: replacing the whole
 * `runConfigReloadPass(...)` call in `Settings.#reloadFromWatch` with a direct
 * `#reloadPersistedLayers` left that file at **27 pass / 0 fail**. The seam was
 * complete and inert, which is the failure the registry's own docblock warns
 * about — "`emitResourcesDiscover` … had no call site at all, so the `"reload"`
 * arm was unreachable code that read as a finished feature."
 *
 * ## What a consumer observes
 *
 * A host registers a handler so it can hold a config edit; a user then edits
 * `config.yml`. With the wiring present the handler is asked, and one that objects
 * keeps the previous value in force. With the wiring absent the handler is never
 * called and the edit lands anyway — the host believes it is holding something,
 * and the user sees a setting change it refused to allow. That is the regression
 * these rows name.
 *
 * ## Why each scenario is its own process
 *
 * Reaching the watch path means a real `fs.watch`, and re-arming watchers inside
 * one long-lived Bun test process does not work: measured across ~20 rounds, the
 * first `Settings` instance armed in a process delivered its edit and later ones
 * in that same process did not, while a bare `fs.watch` on the same fresh temp
 * directories delivered every time. A gate that is green half the time is worse
 * than no gate — it teaches everyone to re-run red instead of reading them. A
 * host is a process anyway, so this is also the more faithful shape.
 * `fixtures/config-watch-scenario.ts` runs one scenario and prints what it saw;
 * nothing is asserted inside it, because a fixture that also decides whether it
 * passed cannot fail informatively.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const SCENARIO = path.join(import.meta.dir, "fixtures", "config-watch-scenario.ts");

/** The scenario has its own settle budget; this only has to outlast it. */
const SCENARIO_TIMEOUT_MS = 90_000;

interface Observation {
	asked: Array<{ sources: string[]; verboseAtAsk: unknown }>;
	announced: string[][];
	verbose: unknown;
	error?: string;
}

describe("a watched config edit reaches the observers registered for it", () => {
	let agentDir: TempDir;
	let projectDir: TempDir;
	let configPath: string;

	beforeEach(() => {
		agentDir = TempDir.createSync("@config-watch-agent-");
		projectDir = TempDir.createSync("@config-watch-project-");
		configPath = path.join(agentDir.path(), "config.yml");
	});

	afterEach(() => {
		agentDir?.removeSync();
		projectDir?.removeSync();
	});

	/**
	 * Run one scenario to completion in a fresh process.
	 *
	 * A scenario that could not settle exits non-zero and prints what it *did*
	 * observe, so a failure names the missing event rather than only saying the
	 * host never asked — the difference between "the wiring is gone" and "the
	 * watcher never fired" is the whole diagnosis.
	 */
	async function run(mode: "observe" | "hold" | "release"): Promise<Observation> {
		const proc = Bun.spawn(["bun", SCENARIO, agentDir.path(), projectDir.path(), mode], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		const line = stdout.trim().split("\n").at(-1);
		let parsed: Observation;
		try {
			parsed = JSON.parse(line ?? "") as Observation;
		} catch {
			throw new Error(`scenario ${mode} printed no JSON (exit ${exitCode})\nstdout: ${stdout}\nstderr: ${stderr}`);
		}
		if (exitCode !== 0) {
			throw new Error(`scenario ${mode} did not settle: ${parsed.error ?? "(no reason)"} ${JSON.stringify(parsed)}`);
		}
		return parsed;
	}

	it(
		"asks the handler, naming the file, while the old value is still in force",
		async () => {
			// The handler reads the value *during* the pass. If it reads the new one,
			// the ask happens after the apply and "hold it" is not a thing it can do —
			// which is the entire reason the seam was opened.
			const seen = await run("observe");

			expect(seen.asked).toHaveLength(1);
			expect(seen.asked[0].verboseAtAsk).toBe(false);
			expect(seen.asked[0].sources).toContain(configPath);
			expect(seen.verbose).toBe(true);
			expect(seen.announced).toHaveLength(1);
		},
		SCENARIO_TIMEOUT_MS,
	);

	it(
		"keeps the previous value in force when a handler holds the edit",
		async () => {
			const held = await run("hold");

			expect(held.asked).toHaveLength(1);
			expect(held.verbose).toBe(false);
			// The pairing, stated as an observation rather than as structure: a pass
			// nobody applied cannot also be a pass that landed.
			expect(held.announced).toEqual([]);
		},
		SCENARIO_TIMEOUT_MS,
	);

	it(
		"applies the edit and announces it once the handler stops holding",
		async () => {
			// The negative contract, and the calibration for the window in `hold`: the
			// same watcher, the same edit shape, and it *does* land. If this row could
			// not see an apply, the row above would prove nothing by passing.
			const released = await run("release");

			expect(released.asked).toHaveLength(2);
			// A held edit stays pending rather than being dropped, so the retry names
			// it again — a holder is not left waiting on a pass that will never mention
			// the change it was protecting.
			expect(released.asked[1].sources).toContain(configPath);
			expect(released.verbose).toBe(true);
			expect(released.announced).toHaveLength(1);
		},
		SCENARIO_TIMEOUT_MS,
	);
});
