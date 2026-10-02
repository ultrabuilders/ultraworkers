/**
 * Case (3): credential reachability reports PRESENCE and never the value.
 *
 * The doctor tells a user whether the provider they selected can be reached.
 * That is the whole job of these three lines, and the same three lines are the
 * only place the report touches a secret: `hasKey` is a boolean derived from
 * `Bun.env`, and the message is a literal. A change that "helpfully" showed
 * which account was configured — `Configured (${value})`, or a truncated prefix
 * for debugging — would turn a diagnostic into a credential dump on stdout,
 * where it lands in terminals, scrollback, CI logs and bug reports.
 *
 * Both directions are asserted together on purpose. Asserting only that the
 * key is *reported* passes just as well on a build that prints the secret; the
 * absence assertion is the one carrying the contract, and it is the one that
 * looks like a mistake to a future reader who does not know why it is there.
 *
 * Run through a real `omp doctor` child process rather than by calling
 * `runDoctorChecks`, so what is checked is what a user actually sees — stdout,
 * after formatting, not the collector's return value.
 */
import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

// A secret that cannot occur by accident, so a substring match on it means the
// value reached the output rather than that some other text resembles it.
const SENTINEL = "sk-ant-CASE3-SENTINEL-must-never-be-printed-9f2c1a";

const repoRoot = path.resolve(import.meta.dir, "../../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

interface CliRun {
	readonly stdout: string;
	readonly stderr: string;
}

async function runDoctor(env: Record<string, string>): Promise<CliRun> {
	using tempDir = TempDir.createSync("@omp-doctor-cred-");
	const proc = Bun.spawn([process.execPath, cliEntry, "doctor"], {
		stdout: "pipe",
		stderr: "pipe",
		stdin: "ignore",
		// `NO_COLOR` keeps the assertion off escape sequences; the credential is
		// passed only to this child, so no other test in the file can observe it.
		env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: tempDir.path(), ...env },
	});
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr };
}

describe("doctor credential checks never print the value", () => {
	it("reports a configured key as present and keeps the secret out of stdout", async () => {
		const run = await runDoctor({ ANTHROPIC_API_KEY: SENTINEL });

		// Presence: the check must still answer the question it exists to answer.
		// Without this half the secrecy assertion alone would be satisfied by a
		// doctor that printed nothing about credentials at all.
		expect(run.stdout).toContain("ANTHROPIC_API_KEY");
		expect(run.stdout).toContain("Configured");

		// Absence: the whole point. Also checked against stderr, because a
		// diagnostic that leaks through the error stream leaks just as well.
		const combined = `${run.stdout}${run.stderr}`;
		if (combined.includes(SENTINEL)) {
			console.error("[doctor:cred] the configured value reached the output");
		}
		expect(combined).not.toContain(SENTINEL);
	}, 120_000);

	it("reports an unset key as unavailable without inventing a value", async () => {
		// The other branch of the same contract. Asserting only the configured
		// case leaves the "not set" path free to print something it should not —
		// and this is the branch a user with a broken setup actually sees.
		const run = await runDoctor({ ANTHROPIC_API_KEY: "" });

		expect(run.stdout).toContain("ANTHROPIC_API_KEY");
		expect(run.stdout).toContain("Not set");

		// A trailing-whitespace or truncated rendering of an empty value is still
		// a rendering of the value; nothing from the key may appear after the name.
		const line = run.stdout.split("\n").find(entry => entry.includes("ANTHROPIC_API_KEY"));
		if (line === undefined) console.error("[doctor:cred] no line for ANTHROPIC_API_KEY");
		expect(line).toBeDefined();
		expect(line).toMatch(/ANTHROPIC_API_KEY:\s*Not set\b/);
	}, 120_000);
});
