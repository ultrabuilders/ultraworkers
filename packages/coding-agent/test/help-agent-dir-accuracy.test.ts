/**
 * `omp --help` must name the session directory the user actually has.
 *
 * The line used to interpolate `CONFIG_DIR_NAME`, a compile-time constant. But the
 * config root is RESOLVED at runtime from an ordered candidate list
 * (`[".ultraworkers", ".omp"]`), so the constant is only the right answer on a
 * machine that still has the old directory. On any machine that never did — a
 * fresh install, a new laptop, a CI runner — the root resolves to
 * `.ultraworkers` while the help went on printing `~/.omp/agent`.
 *
 * That is why this looked fine to everyone who checked it: on a machine carrying
 * pre-migration state the two strings are identical, so the bug is invisible
 * exactly where you would look for it. The probe therefore runs against a HOME
 * with neither directory present — the only condition under which the two can be
 * told apart.
 *
 * It runs in a SUBPROCESS on purpose. `os.homedir()` is bound when the process
 * starts, so assigning `process.env.HOME` mid-test changes nothing: the resolver
 * keeps finding the real `~/.omp` and reports `.omp` no matter what the test
 * believes it did. That failure mode is quiet — the row goes green against the
 * broken help while asserting a fixture it has itself falsified. An in-process
 * attempt is not merely awkward here; it cannot work.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { CONFIG_DIR_NAME } from "@oh-my-pi/pi-utils";

const tempHomes: string[] = [];

afterEach(async () => {
	for (const dir of tempHomes.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

interface Probe {
	agentDirName: string;
	helpMentionsResolved: boolean;
	helpMentionsLegacyConstant: boolean;
}

/** Render the help inside a process whose HOME holds no config directory at all. */
async function renderHelpOnFreshHome(): Promise<Probe> {
	const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "omp-help-home-")));
	tempHomes.push(home);

	// Assembled from lines rather than one template literal: the script has to
	// interpolate a value from THIS scope, and keeping the two quote levels apart
	// is what stops the generated source from being unreadable when it fails.
	const legacySpelling = "~/" + CONFIG_DIR_NAME + "/agent";
	const script = [
		'import { getConfigAgentDirName } from "@oh-my-pi/pi-utils";',
		'import { getExtraHelpText } from "@oh-my-pi/pi-coding-agent/cli/help-extra";',
		"const help = getExtraHelpText();",
		"const resolved = getConfigAgentDirName();",
		"process.stdout.write(JSON.stringify({",
		"\tagentDirName: resolved,",
		'\thelpMentionsResolved: help.includes("~/" + resolved),',
		"\thelpMentionsLegacyConstant: help.includes(" + JSON.stringify(legacySpelling) + "),",
		"}));",
	].join("\n");

	const proc = Bun.spawn(["bun", "-e", script], {
		cwd: process.cwd(),
		env: { ...process.env, HOME: home, XDG_CONFIG_HOME: "", XDG_DATA_HOME: "" },
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;
	if (exitCode !== 0) throw new Error("probe failed (" + exitCode + "): " + stderr);
	return JSON.parse(stdout) as Probe;
}

describe("the session-storage line in omp --help", () => {
	test("names the directory the resolver actually chose", async () => {
		const probe = await renderHelpOnFreshHome();

		// Precondition, asserted rather than assumed. If the resolver ever stopped
		// preferring the new name on an empty HOME, this row would pass against the
		// OLD help text while testing nothing — indistinguishable from the fix.
		expect(probe.agentDirName).not.toBe(CONFIG_DIR_NAME + "/agent");

		expect(probe.helpMentionsResolved).toBe(true);
		// The specific regression: advertising a directory this install does not use,
		// which sends a new user looking for sessions in a folder never created.
		expect(probe.helpMentionsLegacyConstant).toBe(false);
	});
});
