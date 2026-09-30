import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { withFileMutationQueue } from "@oh-my-pi/pi-coding-agent/utils/file-mutation-queue";

// Contract: two mutations of the same file never overlap; two mutations of
// different files still run at the same time.
//
// `edit` and `write` both do a read-modify-write. Run them concurrently against
// one path and the second write lands on the first one's stale read, so one edit
// disappears with no error anywhere — the failure mode is a lost update, not a
// crash, which is why it survives to production.
//
// The lock key is the REALPATH, not the resolved path. Two edits that reach one
// file through a symlink produce two different resolved strings for one file, and
// would silently take two queues.

const created: string[] = [];

async function tempDir(): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), "omp-mutation-queue-"));
	created.push(dir);
	return dir;
}

afterEach(async () => {
	for (const dir of created.splice(0)) await rm(dir, { recursive: true, force: true });
});

/** Resolves once `release` is called, so two tasks can be held open on purpose. */
function gate() {
	let release!: () => void;
	const opened = new Promise<void>(resolve => {
		release = resolve;
	});
	return { opened, release };
}

/** Records enter/exit order so overlap is observable rather than inferred. */
function tracer(log: string[], name: string) {
	return async () => {
		log.push(`${name}:start`);
		await Bun.sleep(5);
		log.push(`${name}:end`);
	};
}

describe("withFileMutationQueue", () => {
	it("serializes two mutations of the same path", async () => {
		const dir = await tempDir();
		const file = path.join(dir, "notes.md");
		await writeFile(file, "x");

		const log: string[] = [];
		// Started together on purpose. Without the queue both would log `:start`
		// before either logged `:end`, which is the interleaving being prevented.
		await Promise.all([withFileMutationQueue(file, tracer(log, "a")), withFileMutationQueue(file, tracer(log, "b"))]);

		expect(log).toEqual(["a:start", "a:end", "b:start", "b:end"]);
	});

	it("still runs different files in parallel", async () => {
		const dir = await tempDir();
		const one = path.join(dir, "one.md");
		const two = path.join(dir, "two.md");
		await Promise.all([writeFile(one, "x"), writeFile(two, "x")]);

		const first = gate();
		const order: string[] = [];
		let twoRan = false;

		const slow = withFileMutationQueue(one, async () => {
			order.push("one:start");
			await first.opened;
			order.push("one:end");
		});
		// If the queue were global rather than per-path, `two`'s body could not be
		// reached while `one` is parked. So the assertion is that the body RUNS —
		// not that the call returns, which would mean waiting out `one`.
		const quick = withFileMutationQueue(two, async () => {
			order.push("two:start");
			twoRan = true;
		});

		await Promise.race([quick, Bun.sleep(1000)]);
		// `one` is still parked here — `first.release()` has not been called — so
		// `two` reaching its body is only possible if the lock is per-path. The
		// relative order of the two is deliberately not asserted: which of two
		// different files starts first is scheduling, not contract.
		expect(twoRan).toBe(true);

		first.release();
		await Promise.all([slow, quick]);
	});

	it("gives one lock to two paths that reach the same file", async () => {
		const dir = await tempDir();
		const target = path.join(dir, "target.md");
		const link = path.join(dir, "link.md");
		await writeFile(target, "x");
		await symlink(target, link);

		const log: string[] = [];
		// `link.md` and `target.md` are different strings and one file. Keyed on the
		// resolved path they would take separate queues and interleave; keyed on the
		// realpath they cannot.
		await Promise.all([
			withFileMutationQueue(target, tracer(log, "direct")),
			withFileMutationQueue(link, tracer(log, "viSymlink")),
		]);

		expect(log).toEqual(["direct:start", "direct:end", "viSymlink:start", "viSymlink:end"]);
	});

	it("accepts a path that does not exist yet", async () => {
		const dir = await tempDir();
		const missing = path.join(dir, "created-by-the-write.md");

		// Every create is half of a non-existent path, so the key cannot be a
		// realpath unconditionally — but a fallback must not turn into a throw.
		await withFileMutationQueue(missing, async () => {
			await writeFile(missing, "now it exists");
		});

		expect(await Bun.file(missing).text()).toBe("now it exists");
	});

	it("releases the lock when the mutation throws", async () => {
		const dir = await tempDir();
		const file = path.join(dir, "boom.md");
		await writeFile(file, "x");

		await expect(
			withFileMutationQueue(file, async () => {
				throw new Error("mutation failed");
			}),
		).rejects.toThrow("mutation failed");

		// The failure a `finally` guards: without it the key stays taken and this
		// hangs forever rather than failing, so the suite would hang instead of
		// reporting. Reaching here at all is the assertion.
		const reached = await Promise.race([
			withFileMutationQueue(file, async () => "recovered").then(() => "recovered"),
			Bun.sleep(1000).then(() => "wedged"),
		]);
		expect(reached).toBe("recovered");
	});

	it("does not let two registrations interleave their key resolution", async () => {
		const dir = await tempDir();
		const a = path.join(dir, "a.md");
		const b = path.join(dir, "b.md");
		await Promise.all([writeFile(a, "x"), writeFile(b, "x")]);

		const log: string[] = [];
		await Promise.all([
			withFileMutationQueue(a, tracer(log, "a")),
			withFileMutationQueue(a, tracer(log, "b")),
			withFileMutationQueue(a, tracer(log, "c")),
		]);

		// Registration resolves the key with an async realpath, so without a
		// registration queue two callers can read the same tail and both chain onto
		// it. Three serialised calls must produce three non-overlapping spans.
		expect(log.filter(l => l.endsWith(":start"))).toHaveLength(3);
		expect(log).toEqual(["a:start", "a:end", "b:start", "b:end", "c:start", "c:end"]);
	});
});
