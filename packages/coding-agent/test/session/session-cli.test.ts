import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getArchivedSessionsDir, listActiveSessions } from "@oh-my-pi/pi-coding-agent/cli/gc-cli";
import { getSessionsDir } from "@oh-my-pi/pi-utils";
import { serializeTitleSlot } from "@oh-my-pi/pi-coding-agent/session/session-title-slot";

/**
 * `ultraworkers session` is a CLI surface, so the contract under test is argv in, observable
 * behaviour out — which is why each case spawns the real binary rather than calling
 * the exported functions. In-process would let these pass while the command is
 * unreachable from a shell, which is the failure this surface exists to prevent.
 * Spawning also makes the exit code the process's own rather than a variable the
 * test assigned to itself, and keeps the streams out of global mutation.
 *
 * Four things must hold:
 *
 * 1. Routing — covered by the shared assertion in `test/cli-argv-routing.test.ts`,
 *    deliberately not duplicated here. A command missing from `cli-commands.ts` does
 *    not error; it falls through to `launch` and the argv becomes a prompt for the
 *    model. Two separate lists drift, and the day they do, both tests still agree
 *    with each other while the command is unrouted.
 * 2. `list` reads through the same enumeration `ultraworkers gc` uses, so the two commands
 *    cannot disagree about which sessions exist.
 * 3. A title survives a destroyed transcript body, because it lives in a fixed-width
 *    slot at the head of the file rather than in the body.
 * 4. archive/unarchive is a round trip on gc's directory convention, observed on the
 *    directory rather than by calling the command back on itself.
 *
 * `PI_CODING_AGENT_DIR` isolates the agent directory, so these cases neither read
 * nor write the developer's real sessions.
 */

const repoRoot = path.resolve(import.meta.dir, "../../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

let agentDir: string;
let sessionsRoot: string;
let archiveRoot: string;

async function runSession(...args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const argv = ["session", ...args];
	const proc = Bun.spawn([process.execPath, cliEntry, ...argv], {
		cwd: repoRoot,
		env: { ...process.env, PI_CODING_AGENT_DIR: agentDir, NO_COLOR: "1" },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	console.error("[session] argv=%o exit=%d stdout=%s stderr=%s", argv, exitCode, stdout, stderr);
	return { stdout, stderr, exitCode };
}

/**
 * A session file shaped the way storage writes one: a fixed 256-byte title slot,
 * then the session header, then the body.
 *
 * The header is not optional. A file without one is skipped by the scanner
 * entirely, which makes a fixture like this return nothing at all — and that reads,
 * to anyone debugging it, exactly like "the title is not being read".
 */
function writeSession(id: string, title: string, body: string): string {
	const projectDir = path.join(sessionsRoot, "repo");
	fs.mkdirSync(projectDir, { recursive: true });
	const file = path.join(projectDir, `${id}.jsonl`);
	const slot = serializeTitleSlot({ title, source: "auto", updatedAt: new Date().toISOString() });
	const header = `${JSON.stringify({
		type: "session",
		id,
		cwd: "/repo",
		timestamp: new Date().toISOString(),
	})}\n`;
	fs.writeFileSync(file, slot + header + body);
	return file;
}

const userMessage = `${JSON.stringify({ type: "message", role: "user", content: "hi" })}\n`;

beforeEach(() => {
	agentDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-session-cli-"));
	sessionsRoot = getSessionsDir(agentDir);
	archiveRoot = getArchivedSessionsDir(agentDir);
});

afterEach(() => {
	fs.rmSync(agentDir, { recursive: true, force: true });
});

describe("ultraworkers session list", () => {
	it("lists a session by the title in its head slot even when the body is destroyed", async () => {
		// The reason the title is readable at all. `session-listing.ts:368` passes the
		// slot's title into the header parse as an override, so the title never depends
		// on the transcript parsing. Damaging only the tail would not prove it: a title
		// taken from the first user message survives that too. Here the body does not
		// parse at all.
		writeSession("sess-a", "ship the pin gate", '{"type":"message","role":"user","cont');

		const { stdout, exitCode } = await runSession("list", "--json");

		expect(exitCode).toBe(0);
		expect(JSON.parse(stdout)[0].title).toBe("ship the pin gate");
	});

	it("sees exactly the sessions ultraworkers gc sees, because it reads through gc's enumeration", async () => {
		// The single-source contract, asserted against gc's own reader rather than a
		// stored fixture. If `list` grew a private reader this is where the two would
		// part company — and the failure is silent, because each is self-consistent.
		writeSession("sess-a", "alpha", userMessage);
		writeSession("sess-b", "beta", userMessage);

		const { stdout } = await runSession("list", "--json");
		const listed = JSON.parse(stdout)
			.map((row: { id: string }) => row.id)
			.sort();
		const seenByGc = (await listActiveSessions(sessionsRoot)).map(session => session.id).sort();

		console.error("[session:source] listed=%o gc=%o", listed, seenByGc);

		expect(listed).toEqual(seenByGc);
	});

	it("--last prints a bare path, because it exists to feed --resume", async () => {
		// Anything else on that line — a header, a row prefix — breaks the command
		// substitution this flag is for, and does so at the caller's shell prompt
		// rather than anywhere near this code.
		writeSession("sess-a", "alpha", userMessage);

		const { stdout } = await runSession("list", "--last");

		expect(stdout.trim().split("\n")).toHaveLength(1);
		expect(stdout.trim().endsWith(".jsonl")).toBe(true);
	});

	it("exits non-zero when --last finds nothing, rather than printing an empty path", async () => {
		// An empty line would be consumed by `ultraworkers --resume "$(…)"` as an empty session
		// id, which fails somewhere else with nothing pointing back here.
		const { stdout, exitCode } = await runSession("list", "--last");

		expect(stdout).toBe("");
		expect(exitCode).toBe(1);
	});
});

describe("ultraworkers session archive / unarchive", () => {
	it("files an archived session where gc looks for it, and takes it out of the live set", async () => {
		// Asserted on the directory, not by asking `list` whether it worked. Re-reading
		// your own output is a closed loop: it passes even when the file went somewhere
		// gc never looks, which is the one failure that actually loses a session.
		const file = writeSession("sess-a", "alpha", userMessage);

		const { exitCode } = await runSession("archive", "sess-a");
		const archived = path.join(archiveRoot, "repo", "sess-a.jsonl.gz");
		console.error("[session:archive] before=%s after=%s exists=%o", file, archived, fs.existsSync(archived));

		expect(exitCode).toBe(0);
		expect(fs.existsSync(archived)).toBe(true);
		expect(fs.existsSync(file)).toBe(false);
		// The live reader must no longer see it, or gc would keep treating it as live
		// and could sweep a session the user archived on purpose.
		expect(await listActiveSessions(sessionsRoot)).toHaveLength(0);
	});

	it("restores an archived session to a path the live reader picks up again", async () => {
		writeSession("sess-a", "alpha", userMessage);
		await runSession("archive", "sess-a");

		const { exitCode } = await runSession("unarchive", "sess-a");
		const sessions = await listActiveSessions(sessionsRoot);
		console.error(
			"[session:unarchive] stillArchived=%o restored=%o ids=%o",
			fs.existsSync(path.join(archiveRoot, "repo", "sess-a.jsonl.gz")),
			fs.existsSync(path.join(sessionsRoot, "repo", "sess-a.jsonl")),
			sessions.map(s => s.id),
		);

		expect(exitCode).toBe(0);
		expect(sessions.map(s => s.id)).toEqual(["sess-a"]);
		// Compressed content restored uncompressed: a `.gz` left in the sessions
		// directory is invisible to the `*.jsonl` glob, so the session would look
		// restored and be unfindable.
		expect(fs.existsSync(path.join(sessionsRoot, "repo", "sess-a.jsonl.gz"))).toBe(false);
		expect(sessions[0].title).toBe("alpha");
	});

	it("refuses to archive a session id that matches nothing, and names what it looked for", async () => {
		const { stderr, exitCode } = await runSession("archive", "nope");

		expect(exitCode).toBe(1);
		expect(stderr).toContain("nope");
	});
});
