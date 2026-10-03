import { mkdirSync, rmSync } from "node:fs";
import * as nodeFs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BACKGROUND_CONTEXT } from "@ultraworkers/chord/context";
import { afterEach, describe, expect, it, vi } from "bun:test";
import { getOrThrow } from "../src/env/index";
import { NodeExecutionEnv } from "../src/env/node";

// Longer than the shell's post-exit stdio grace period plus the descendant's delayed write.
const SPILL_WRITE_DELAY_MS = 600;

const tempDirs: string[] = [];
let rejectedWrites = 0;

afterEach(() => {
	rejectedWrites = 0;
	vi.restoreAllMocks();
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * Make the spill stream deterministically slow and immediately backpressured.
 *
 * `pi` reaches this with `vi.mock("node:fs")`, which AGENTS.md bans: Bun's module registry is
 * global, so the substitution leaks into every later file in the run. The seam is the same either
 * way — this wraps the `createWriteStream` the module under test calls — but it is installed with
 * `spyOn` and torn down in `afterEach`, so nothing outlives the test.
 */
function slowBackpressuredSpillStream(): void {
	// Captured before the spy is installed: inside the replacement, `nodeFs.createWriteStream`
	// is the spy, so reading it there calls the mock from itself until the stack gives out.
	const actual = nodeFs.createWriteStream;
	vi.spyOn(nodeFs, "createWriteStream").mockImplementation(((
		path: Parameters<typeof nodeFs.createWriteStream>[0],
		options?: Parameters<typeof nodeFs.createWriteStream>[1],
	) => {
		const stream = actual(
			path as string,
			typeof options === "object" && options !== null ? { ...options, highWaterMark: 1 } : { highWaterMark: 1 },
		);
		const writeChunk = stream._write.bind(stream);
		stream._write = (chunk, encoding, callback) => {
			setTimeout(() => writeChunk(chunk, encoding, callback), SPILL_WRITE_DELAY_MS);
		};
		const write = stream.write.bind(stream);
		stream.write = ((...args: Parameters<typeof stream.write>) => {
			const accepted = Reflect.apply(write, stream, args) as boolean;
			if (!accepted) rejectedWrites++;
			return accepted;
		}) as typeof stream.write;
		return stream;
	}) as unknown as typeof nodeFs.createWriteStream);
}

describe("NodeExecutionEnv spill backpressure", () => {
	it.skipIf(process.platform === "win32")(
		"keeps inherited stdio open past the exit grace period while a spill write is pending",
		async () => {
			const root = join(tmpdir(), `pi-durable-env-spill-${Date.now()}-${Math.random().toString(36).slice(2)}`);
			mkdirSync(root, { recursive: true });
			tempDirs.push(root);
			slowBackpressuredSpillStream();
			const env = new NodeExecutionEnv({ cwd: root });
			// The shell exits after the first chunk crosses the capture limit and backpressures the spill. A background
			// descendant retains stdout and writes after the post-exit grace period. Without the pending-spill guard,
			// settlement destroys stdout before that descendant output is read.
			const command = "printf '%020d' 0 | tr 0 a; (sleep 0.2; printf '%01000d' 0 | tr 0 b) &";

			const result = getOrThrow(
				await env.exec(
					command,
					{ capture: { limits: { maxBytes: 10, maxLines: 10, retain: "tail" }, spill: true }, onUpdate: () => {} },
					BACKGROUND_CONTEXT,
				),
			);

			expect(rejectedWrites).toBeGreaterThan(0);
			expect(result.truncation.totalBytes).toBe(1020);
			expect(result.spillPath).toBeDefined();
			tempDirs.push(join(result.spillPath!, ".."));
			expect(getOrThrow(await env.readTextFile(result.spillPath!, BACKGROUND_CONTEXT))).toBe(
				`${"a".repeat(20)}${"b".repeat(1000)}`,
			);
		},
		10_000,
	);
});
