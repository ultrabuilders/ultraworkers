import { afterAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * The CONTROL for `injection-e2e.test.ts`, and the reason its assertion means
 * anything.
 *
 * `injection-e2e.test.ts` asserts that the receiver's session directory is
 * non-empty. That assertion is only evidence of delivery if a transcript
 * CANNOT appear without a turn — otherwise "a file exists" is satisfied by a
 * session that started and did nothing, and the E2E goes green while proving
 * nothing.
 *
 * So the negative half is pinned here, credential-free and in ~6s:
 *
 *   an idle `--mode json` receiver, started and left completely alone,
 *   writes NOTHING under its agent directory.
 *
 * Measured 2026-10-04 by booting exactly that process and walking the tree:
 * the `agent/` directory existed and was empty — no `sessions/`, no transcript.
 * The process stayed alive throughout (`exitCode === null`), so this is not a
 * crash being mistaken for an absence.
 *
 * WHY THIS FILE IS SEPARATE AND NOT A ROW IN THE E2E. The E2E is gated behind
 * `PEER_E2E=1` because it spends two real model round trips. This needs no
 * model, no network and no key, so gating it would hide the one fact that makes
 * the expensive test interpretable — and it is exactly the kind of fact that
 * rots silently: nothing else in the suite would notice a CLI change that
 * started writing an empty transcript on boot.
 */

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");
const roots: string[] = [];
const procs: Bun.Subprocess[] = [];

afterAll(async () => {
	for (const proc of procs.splice(0)) {
		try {
			proc.kill(9);
		} catch {
			/* already gone */
		}
	}
	await Promise.all(roots.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("a transcript implies a turn", () => {
	it("writes nothing under the agent directory when the session is never used", async () => {
		// Spawned with `stdin: "pipe"` and then never written to, which is precisely
		// what `injection-e2e.test.ts` does to its receiver. `--mode json` dispatches
		// on an RPC, so a process that receives none does nothing at all.
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "peer-e2e-control-"));
		roots.push(root);
		const agent = path.join(root, "agent");
		await fs.mkdir(agent, { recursive: true });

		const child = Bun.spawn(["bun", cliEntry, "--mode", "json"], {
			cwd: repoRoot,
			stdin: "pipe",
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...process.env,
				XDG_DATA_HOME: root,
				XDG_CONFIG_HOME: root,
				PI_CODING_AGENT_DIR: agent,
				PI_NO_TITLE: "1",
				NO_COLOR: "1",
			},
		});
		procs.push(child);

		await Bun.sleep(6000);

		// Assert the process SURVIVED first. A receiver that died on boot leaves the
		// same observable state as one that is sitting idle — an empty directory — so
		// without this the row would pass for the wrong reason, and a crash would be
		// recorded as proof that transcripts require a turn.
		expect(child.exitCode).toBeNull();
		expect(child.signalCode).toBeNull();

		const entries = await fs.readdir(agent);
		// The whole control: an idle receiver's agent dir is empty. If a future change
		// makes the CLI create its sessions directory eagerly, this row goes red and
		// says why — because a transcript that appears without a turn would make the
		// E2E's `files.length > 0` assertion pass without any message being delivered.
		expect(entries).toEqual([]);

		const sessionsDir = path.join(agent, "sessions");
		expect(await fs.stat(sessionsDir).catch(() => null)).toBeNull();
	}, 30_000);
});
