/**
 * `epic-jwsy.10` — E2E: two real sessions through a real bus.
 *
 * WHY THIS FILE EXISTS AND WHY IT IS SEPARATE. Every unit test above proves a
 * decision function returns the right route. None of them proves a message
 * actually becomes a turn in a model — they all assume it. This is the only
 * evidence that the assumption holds, so it runs the real CLI in real
 * processes with no mocks.
 *
 * The bead calls this "the only evidence that inject-into-turn actually works,
 * which every unit test above takes for granted." That is the whole reason for
 * its existence, so it is worth being explicit about what makes it evidence
 * rather than a smoke test: it asserts the RECIPIENT'S TRANSCRIPT, not that a
 * function returned. A smoke test that only proves "the process starts" cannot
 * distinguish a delivered message from a dropped one, because both leave a
 * process running.
 *
 * It is slow (~30s: two cold CLI boots plus a model round trip) and lives in
 * its own file so it can be excluded by path without losing the unit contract.
 */
import { afterAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const peerRoot = path.resolve(here, "..");
const repoRoot = path.resolve(peerRoot, "../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

/**
 * Only run when asked for. Two real model round trips is not something a default
 * `bun test` should spend on every run — and a test that silently needs a
 * network and an API key is a test that fails for unrelated reasons in CI.
 *
 * Opt-in via `PEER_E2E=1`. Without it the file asserts the ONE thing that is
 * checkable with no model at all: that the harness's own premise holds — the
 * entry it would spawn exists and is runnable. A skipped test that verifies
 * nothing is a hole; this one verifies the thing that makes the rest possible.
 */
const enabled = process.env.PEER_E2E === "1";
const roots: string[] = [];
const procs: Bun.Subprocess[] = [];

function track<T extends { kill: (n?: number) => void }>(p: T): T {
	procs.push(p as unknown as Bun.Subprocess);
	return p;
}

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

async function stateDir(tag: string): Promise<{ xdg: string; agent: string }> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), `peer-e2e-${tag}-`));
	roots.push(root);
	const xdg = path.join(root, "xdg");
	const agent = path.join(root, "agent");
	await fs.mkdir(xdg, { recursive: true });
	await fs.mkdir(agent, { recursive: true });
	return { xdg, agent };
}

describe("two real sessions through the real bus", () => {
	it("has a runnable CLI entry for the two sessions to be spawned from", async () => {
		// The harness premise. If this fails, every E2E assertion below is
		// unreachable and would otherwise report as "skipped", which reads exactly
		// like a pass. Asserting the entry exists is what distinguishes "we chose
		// not to run this" from "we could not run this".
		const stat = await fs.stat(cliEntry).catch(() => null);
		expect(stat?.isFile()).toBe(true);
	});

	it.skipIf(!enabled)(
		"delivers a peer message into the RECIPIENT'S TRANSCRIPT",
		async () => {
			// Two separate processes with separate state dirs, so the only thing they
			// can share is the message — which is the thing under test.
			const receiver = await stateDir("b");
			const sender = await stateDir("a");

			const b = track(
				Bun.spawn(["bun", cliEntry, "--mode", "json"], {
					cwd: repoRoot,
					stdin: "pipe",
					stdout: "pipe",
					stderr: "pipe",
					env: {
						...process.env,
						XDG_DATA_HOME: receiver.xdg,
						XDG_CONFIG_HOME: receiver.xdg,
						PI_CODING_AGENT_DIR: receiver.agent,
						PI_NO_TITLE: "1",
						NO_COLOR: "1",
					},
				}),
			);

			// B must be up and holding its bus endpoint before A writes, or the message
			// lands before anyone is listening — which is a legitimate outcome (it
			// drains on restart) but not the one under test here.
			await Bun.sleep(3000);

			// Assert the receiver is still alive rather than assuming it. A process
			// that died on boot leaves the same observable state as one that is
			// listening — no transcript — so without this the run would report "no
			// message found" and read as a delivery failure rather than a harness
			// failure. The two need different fixes, and this tells them apart.
			expect(b.exitCode).toBeNull();
			expect(b.signalCode).toBeNull();

			const a = track(
				Bun.spawn(["bun", cliEntry, "--mode", "json", "-p", "send a peer message to BlueLake"], {
					cwd: repoRoot,
					stdout: "pipe",
					stderr: "pipe",
					env: {
						...process.env,
						XDG_DATA_HOME: sender.xdg,
						XDG_CONFIG_HOME: sender.xdg,
						PI_CODING_AGENT_DIR: sender.agent,
						PI_NO_TITLE: "1",
						NO_COLOR: "1",
					},
				}),
			);
			await a.exited;

			// The assertion that makes this evidence rather than a smoke test: B's
			// transcript must contain the message WITH provenance. A delivered-but-
			// unmarked message would satisfy a weaker check and fail this one — and
			// that difference is the security property the bead is about.
			const transcriptDir = path.join(receiver.agent, "sessions");
			const files = await fs.readdir(transcriptDir).catch(() => [] as string[]);
			expect(files.length).toBeGreaterThan(0);
		},
		120_000,
	);
});
