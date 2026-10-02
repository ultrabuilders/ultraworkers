import * as fs from "node:fs";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BACKGROUND_CONTEXT } from "@oh-my-pi/chord/context";
import { afterEach, describe, expect, it, vi } from "bun:test";
import { getOrThrow } from "../src/env";
import { NodeExecutionEnv } from "../src/env/node";

/**
 * Ported from `pi`'s `env-node-spill.test.ts`, with one substitution forced by this repo's
 * rules: the reference wraps `node:fs` in `vi.mock` to make the spill stream slow and
 * backpressured. `AGENTS.md` bans module-registry mocks (`mock.module` leaks across files,
 * bun#12823) and directs callers to `spyOn` the namespace-imported module instead, and no
 * committed test here uses `vi.mock`. So the stream is patched through `fs.createWriteStream`
 * on the namespace object, which reaches the same call site inside `env/node.ts` and is undone
 * by the `afterEach` below.
 *
 * The contract under test is unchanged and is the consumer-observable part: a spill write that
 * is still pending when the shell exits must not lose bytes, and the spill file must hold every
 * byte the command produced rather than the bounded view.
 */

const tempDirs: string[] = [];

function createTempDir(): string {
	const root = join(tmpdir(), `pi-durable-env-spill-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(root, { recursive: true });
	tempDirs.push(root);
	return root;
}

afterEach(() => {
	vi.restoreAllMocks();
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("NodeExecutionEnv spill backpressure", () => {
	it.skipIf(process.platform === "win32")(
		"keeps inherited stdio open past the exit grace period while a spill write is pending",
		async () => {
			const spill = { rejectedWrites: 0 };
			// The descendant inherits stdout and writes only after the parent has exited and the
			// shell has already backpressured the spill. Without the pending-spill guard,
			// settlement destroys stdout before that output is read, and the tail is lost.
			const tailBytes = 1000;
			const command =
				`${JSON.stringify(process.execPath)} -e "process.stdout.write('a'.repeat(20)); ` +
				`require('child_process').spawn(process.execPath, ` +
				`['-e', \\"setTimeout(() => process.stdout.write('b'.repeat(${tailBytes})), 200)\\"], ` +
				`{ stdio: 'inherit', detached: false });"`;

			// Captured before the spy replaces it, so the replacement can still build a real
			// stream — `env/node.ts` calls `createWriteStream`, not the `WriteStream`
			// constructor, so this is the exact function under test.
			const realCreateWriteStream = fs.createWriteStream;
			vi.spyOn(fs, "createWriteStream").mockImplementation((path, options) => {
				// `highWaterMark: 1` is what creates the backpressure: the first chunk already
				// exceeds it, so `write` returns false and `env/node.ts` arms its drain wait.
				const base = typeof options === "object" && options !== null ? options : {};
				const stream = realCreateWriteStream(path, { ...base, highWaterMark: 1 });
				const write = stream.write.bind(stream);
				stream.write = ((...args: Parameters<typeof stream.write>) => {
					const accepted = Reflect.apply(write, stream, args) as boolean;
					if (!accepted) spill.rejectedWrites++;
					return accepted;
				}) as typeof stream.write;
				return stream;
			});

			const env = new NodeExecutionEnv({ cwd: createTempDir() });
			const result = getOrThrow(
				await env.exec(
					command,
					{ capture: { limits: { maxBytes: 10, maxLines: 10, retain: "tail" }, spill: true }, onUpdate: () => {} },
					BACKGROUND_CONTEXT,
				),
			);

			// The write really did backpressure, so the guard was exercised rather than bypassed.
			expect(spill.rejectedWrites).toBeGreaterThan(0);
			expect(result.spillPath).toBeDefined();
			tempDirs.push(join(result.spillPath!, ".."));
			// Every byte reached the spill — the delayed descendant's `b` run included.
			expect(getOrThrow(await env.readTextFile(result.spillPath!, BACKGROUND_CONTEXT))).toBe(
				`${"a".repeat(20)}${"b".repeat(tailBytes)}`,
			);
		},
		10_000,
	);
});
