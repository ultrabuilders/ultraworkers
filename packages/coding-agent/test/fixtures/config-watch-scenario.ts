/**
 * One watched-config-edit scenario, run in its own process.
 *
 * ## Why a subprocess and not a `beforeEach`
 *
 * The point of these scenarios is to reach the *watch path* — the code that turns
 * a real on-disk edit into a call into the reload-observer registry. That path
 * begins with `fs.watch`, and an `fs.watch` inside a long-lived Bun test process
 * proved unusable for this: across ~20 measured rounds the first `Settings`
 * instance armed in a process delivered its edit and every later instance in
 * that same process did not, while a bare `fs.watch` on the same fresh temp
 * directories delivered every time. So the interference is specific to re-arming
 * watchers inside one process — not the product, and not `fs.watch`.
 *
 * A gate that is green about half the time is worse than no gate: it trains
 * everyone to re-run a red test instead of reading it. One process per scenario
 * removes the interference, and it is also more faithful to the thing under
 * test — a host is a process, and this is a host that has been watching for a
 * while.
 *
 * ## Contract
 *
 * argv: `<agentDir> <projectDir> <mode>`; mode is `observe` | `hold` | `release`.
 * Prints one JSON line to stdout, then exits 0 once the scenario has settled or
 * 1 if it could not. The caller asserts on stdout only: a fixture that also
 * decides whether it passed cannot fail informatively.
 */
import * as path from "node:path";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import {
	onAfterConfigReload,
	onBeforeConfigReload,
	type ConfigReloadInfo,
} from "@oh-my-pi/pi-coding-agent/config/reload-observer";
import { setAgentDir } from "@oh-my-pi/pi-utils";

type Mode = "observe" | "hold" | "release";

const [agentDir, projectDir, modeRaw] = process.argv.slice(2);
const mode = modeRaw as Mode;

const SETTLE_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 20;
/**
 * How long a held pass is left alone before it counts as inert. Only meaningful
 * in `hold` — and the `release` scenario is its calibration: the same watcher,
 * the same edit shape, and it *does* land.
 */
const INERT_WINDOW_MS = 1_500;

const configPath = path.join(agentDir, "config.yml");

const asked: Array<{ sources: string[]; verboseAtAsk: unknown }> = [];
const announced: string[][] = [];
let holds = 0;

setAgentDir(agentDir);
await Bun.write(configPath, "verbose: false\n");

// No `inMemory`: `startWatching()` refuses anything that is not persisting.
const settings = await Settings.init({ cwd: projectDir, agentDir });
settings.startWatching();

// Confirm the watcher is live, and that it survives the re-arm every completed
// pass performs — *before* any handler exists. A scenario writing straight after
// setup can lose that race and report "the host never asked", when the truth is
// "the host was between watches": a setup failure wearing a contract failure's
// clothes. Handlers are registered after this precisely because `hold` refuses
// every pass, and a priming pass nobody can accept can never settle.
const primed = (): unknown => (settings.getGlobalSettings() as { primed?: unknown }).primed;
await Bun.write(configPath, "verbose: false\nprimed: 1\n");
await until(() => primed() === 1);

onBeforeConfigReload((info: ConfigReloadInfo) => {
	asked.push({ sources: [...info.sources], verboseAtAsk: settings.getGlobalSettings().verbose });
	if (mode === "hold") return "a dialog is open";
	if (mode === "release") return holds++ === 0 ? "held once" : undefined;
	return undefined;
});
onAfterConfigReload((info: ConfigReloadInfo) => void announced.push([...info.sources]));

const raw = (): Record<string, unknown> => settings.getGlobalSettings() as Record<string, unknown>;

async function until(read: () => boolean): Promise<void> {
	const deadline = Date.now() + SETTLE_TIMEOUT_MS;
	while (!read()) {
		if (Date.now() > deadline)
			throw new Error(`waited ${SETTLE_TIMEOUT_MS}ms; observed ${JSON.stringify(summary())}`);
		await Bun.sleep(POLL_INTERVAL_MS);
	}
}

function summary(): Record<string, unknown> {
	return { asked: asked.length, announced: announced.length, verbose: raw().verbose, primed: raw().primed };
}

/** Write a marker and wait for the host to report it — a pass that must land. */
async function writeAndSettle(body: string, settled: () => boolean): Promise<void> {
	await Bun.write(configPath, body);
	await until(settled);
}

try {
	switch (mode) {
		case "observe": {
			await writeAndSettle("verbose: true\n", () => raw().verbose === true);
			break;
		}
		case "hold": {
			await Bun.write(configPath, "verbose: true\n");
			await until(() => asked.length > 0);
			await Bun.sleep(INERT_WINDOW_MS);
			break;
		}
		case "release": {
			// The first pass is held, so its edit never landed. The retry carries a
			// key the held one did not: rewriting identical bytes is not guaranteed
			// to move an atomic rename, and the scenario would then be testing the
			// filesystem's whim rather than the reload.
			await Bun.write(configPath, "verbose: true\nprimed: 1\n");
			await until(() => asked.length === 1);
			await writeAndSettle("verbose: true\nprimed: 1\nedit: yes\n", () => raw().verbose === true);
			break;
		}
	}
} catch (error) {
	console.log(JSON.stringify({ ...summary(), error: String(error) }));
	settings.cancelPendingSaves();
	process.exit(1);
}

console.log(
	JSON.stringify({
		asked: asked.map(a => ({ sources: a.sources, verboseAtAsk: a.verboseAtAsk })),
		announced,
		verbose: raw().verbose,
	}),
);
settings.cancelPendingSaves();
process.exit(0);
