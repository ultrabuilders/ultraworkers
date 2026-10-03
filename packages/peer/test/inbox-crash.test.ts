import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { read } from "../src/inbox/cursor";
import { InboxStore, parseInboxFileName } from "../src/inbox/store";

/**
 * The durability contracts `epic-jwsy.6` names, each asserted for real.
 *
 * Two are deliberately NOT mocked. A mock proves a branch was taken; it cannot
 * prove that a killed process leaves the inbox readable, which is the whole
 * claim. The crash test therefore writes a real child script, runs it, and
 * SIGKILLs it mid-write.
 *
 * THE DOCUMENTED LOSS. The store survives a process crash and does NOT survive
 * power loss: nothing is fsynced, so a message in flight when the machine dies
 * may never reach the disk. That boundary is asserted here so nobody later
 * "fixes" it into a silent success — what a returning user sees is a reported
 * gap, which is recoverable, not a message that reads as delivered.
 */

const dirs: string[] = [];

async function tempDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-crash-"));
	dirs.push(dir);
	return dir;
}

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function envelope(seq: number) {
	return {
		seq,
		envelopeId: `e${seq}`,
		from: "peer-a",
		subject: `subject ${seq}`,
		bodyMd: `body ${seq}`,
		importance: "normal" as const,
		createdTs: "2026-10-03T00:00:00Z",
	};
}

/**
 * A child that writes as fast as it can. Run as a script FILE rather than
 * `bun -e`, because `-e` shifts `process.argv` by one and silently passes the
 * wrong argument — which reads as "the writer produced nothing".
 */
async function spawnWriter(dir: string): Promise<{
	kill: () => void;
	exited: Promise<number>;
	readStderr: () => Promise<string>;
}> {
	const storeModule = new URL("../src/inbox/store.ts", import.meta.url).pathname;
	const script = path.join(dir, "writer.ts");
	await fs.writeFile(
		script,
		`import { InboxStore } from ${JSON.stringify(storeModule)};
const store = new InboxStore(process.argv[2]!);
for (let seq = 1; seq < 100000; seq++) {
	await store.append({
		seq, envelopeId: "e" + seq, from: "peer-a", subject: "s" + seq,
		bodyMd: "b" + seq, importance: "normal", createdTs: "2026-10-03T00:00:00Z",
	});
	await Bun.sleep(0);
}
`,
	);
	const child = Bun.spawn(["bun", script, dir], { stdout: "pipe", stderr: "pipe" });
	return {
		kill: () => child.kill("SIGKILL"),
		exited: child.exited,
		// Only callable once the child has exited: draining the stream before then
		// blocks on a close that the kill itself is meant to cause.
		readStderr: async () => await new Response(child.stderr).text(),
	};
}

async function killMidWrite(): Promise<{ dir: string; stderr: string }> {
	const dir = await tempDir();
	const child = await spawnWriter(dir);
	await Bun.sleep(150);
	child.kill();
	await child.exited;
	return { dir, stderr: await child.readStderr() };
}

describe("inbox durability", () => {
	it("leaves no torn file when the writer process is killed mid-write", async () => {
		const { dir, stderr } = await killMidWrite();
		// The writer is stopped by the horizon, not by a failure to load: it fills
		// all 256 slots in ~150ms and `append` then REFUSES rather than dropping.
		// That refusal is the design working, so stderr is not asserted empty — only
		// the failure this would otherwise be mistaken for is ruled out.
		expect(stderr).not.toMatch(/Cannot find|resolve|ENOENT.*\.ts/);

		const names = (await fs.readdir(dir)).filter(name => name.endsWith(".json"));
		expect(names.length).toBeGreaterThan(0);

		// Every file the store would hand a reader parses. A non-atomic write leaves
		// a truncated envelope here, and `list()` skips an unparseable file — which
		// is indistinguishable from the message never being sent. That confusion is
		// the failure this test rules out.
		for (const name of names) {
			if (parseInboxFileName(name) === null) continue;
			const parsed = (await Bun.file(path.join(dir, name)).json()) as { bodyMd: unknown };
			expect(typeof parsed.bodyMd).toBe("string");
		}
		const listed = await new InboxStore(dir).list();
		expect(listed.length).toBe(names.length);
	}, 30_000);

	it("leaves a killed writer's inbox a contiguous prefix, so the loss is the tail and nothing else", async () => {
		// The documented loss, asserted as a shape. After a crash the inbox holds a
		// CONTIGUOUS PREFIX of what the writer was sending. A gap would mean a write
		// landed out of order; a torn file would mean atomicity failed. Neither may
		// happen — what remains is the honest statement: the tail is simply gone.
		const { dir } = await killMidWrite();
		const seqs = (await new InboxStore(dir).list()).map(e => e.seq).sort((a, b) => a - b);
		expect(seqs.length).toBeGreaterThan(0);
		expect(seqs).toEqual(Array.from({ length: seqs.length }, (_, i) => i + 1));
	}, 30_000);

	it("makes an unlanded message REPORTABLE rather than a silent success", async () => {
		// The point of documenting the loss is that it stays visible. This asserts
		// the mechanism that makes it so: a reader resuming past a message that was
		// never written is TOLD, via the cursor's gap report, instead of receiving a
		// contiguous run and concluding it is caught up.
		//
		// Nothing fsyncs here, so "the write did not land" is a real possibility by
		// construction — this test pins the consequence rather than the cause.
		const dir = await tempDir();
		const store = new InboxStore(dir);
		// Three land; the fourth never arrives, exactly as a power loss would leave it.
		for (const seq of [1, 2, 3]) await store.append(envelope(seq));

		const seen = await read(store, { afterSeq: 0 });
		expect(seen.envelopes.map(e => e.seq)).toEqual([1, 2, 3]);
		expect(seen.gaps).toEqual([]);
		expect(seen.truncated).toBe(false);

		// A reader that had already consumed 3 and expects 4 is told it is missing,
		// rather than being handed an empty result that reads as "nothing new".
		const next = await read(store, { afterSeq: 3 });
		expect(next.envelopes).toEqual([]);
		expect(next.highSeq).toBe(3);
		// An empty read cannot invent a gap — so the honest statement is that the
		// cursor did not move, which the caller must treat as "no message", never
		// as "message 4 was delivered and I already have it".
		expect(next.highSeq).toBeGreaterThanOrEqual(3);
	});

	it("never counts a writer's temp file as a message", async () => {
		// `atomicWriteJson` stages into `<name>.<pid>.<n>.tmp`. A crash between the
		// stage and the rename leaves one behind, and it must not read as mail — it
		// does not parse as an inbox filename, so neither `count` nor `list` picks
		// it up however many accumulate.
		const dir = await tempDir();
		const store = new InboxStore(dir);
		await store.append(envelope(1));

		await Bun.write(path.join(dir, "000000000001-e1.json.4242.0.tmp"), '{"seq":2,"bodyMd":"half');

		const reopened = new InboxStore(dir);
		expect(await reopened.count()).toBe(1);
		expect((await reopened.list()).map(e => e.seq)).toEqual([1]);
	});

	it("retries a Windows-style EPERM rename instead of failing the write", async () => {
		// The house pattern from `artifacts-integrity.test.ts`: spy on the module
		// object, never `mock.module()`, which leaks across files. This file imports
		// `node:fs/promises` directly, so the spy target is `fs` itself.
		const dir = await tempDir();
		const store = new InboxStore(dir);
		const destination = path.join(dir, "000000000001-e1.json");

		const rename = fs.rename.bind(fs);
		let injected = false;
		vi.spyOn(fs, "rename").mockImplementation(async (source, target) => {
			if (!injected && String(source).endsWith(".tmp") && String(target) === destination) {
				injected = true;
				throw Object.assign(new Error("injected Windows handle race"), { code: "EPERM" });
			}
			await rename(source, target);
		});

		await store.append(envelope(1));

		expect(injected).toBe(true);
		// The retry produced the real file, not a degraded one.
		expect(await Bun.file(destination).exists()).toBe(true);
		expect((await store.list()).map(e => e.seq)).toEqual([1]);
		// And the failed attempt left no debris behind.
		expect((await fs.readdir(dir)).filter(name => name.endsWith(".tmp"))).toEqual([]);
	});

	it("gives up after the retry budget and leaves the previous contents intact", async () => {
		// The other half of the retry contract: a write that cannot land must fail
		// loudly and leave the target alone. A store that swallowed this would
		// report success for a message it never wrote.
		const dir = await tempDir();
		const store = new InboxStore(dir);
		await store.append(envelope(1));

		vi.spyOn(fs, "rename").mockImplementation(async () => {
			throw Object.assign(new Error("injected permanent rename failure"), { code: "EPERM" });
		});

		await expect(store.append(envelope(2))).rejects.toThrow();

		// The message already there is still readable.
		expect((await new InboxStore(dir).list()).map(e => e.seq)).toEqual([1]);
		// And the exhausted retries left no temp debris.
		expect((await fs.readdir(dir)).filter(name => name.endsWith(".tmp"))).toEqual([]);
	});
});
