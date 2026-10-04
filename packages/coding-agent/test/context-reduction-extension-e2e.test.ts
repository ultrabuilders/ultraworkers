/**
 * End-to-end proof that the deterministic context-reduction transforms are
 * reachable from an extension written OUTSIDE this repo.
 *
 * `context-reduction.test.ts` measures the two transforms in isolation. What it
 * cannot show is the claim the whole bead rests on: a module authored elsewhere,
 * importing only published specifiers, can register one of them through the real
 * loader and have the prune pass actually reduce a branch.
 *
 * The extension below is a real `.ts` file at a temp path, reached only through
 * `loadExtensions` — the same entry an out-of-repo author's module takes. It
 * imports the transform and the `ExtensionAPI` type and nothing else from this
 * repository, so if this passes, no core line needed changing for it to exist.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import {
	addContextTransform,
	clearContextTransforms,
	hasContextTransforms,
	runContextTransforms,
} from "@oh-my-pi/pi-coding-agent/tools/compaction-transforms";
import { Tokenizer } from "@oh-my-pi/pi-agent-core";
import type { SessionMessageEntry } from "@oh-my-pi/pi-agent-core/compaction";
import type { TextContent, ToolResultMessage, Usage } from "@oh-my-pi/pi-ai";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";

const tokenizer = new Tokenizer();
const tempDirs: string[] = [];

const usage = (totalTokens: number): Usage => ({
	input: totalTokens,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
});

let idCounter = 0;
const nextId = (): string => `e2e-${idCounter++}`;

function messageEntry(message: SessionMessageEntry["message"]): SessionMessageEntry {
	return { type: "message", id: nextId(), parentId: null, timestamp: new Date().toISOString(), message };
}

/** Three back-to-back `read` turns — a run the collapse transform is meant to fold. */
function readRun(paths: string[]): SessionMessageEntry[] {
	return paths.flatMap(target => {
		const callId = nextId();
		return [
			messageEntry({
				role: "assistant",
				content: [{ type: "toolCall", id: callId, name: "read", arguments: { path: target } }],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "bench",
				usage: usage(10),
				stopReason: "toolUse",
				timestamp: 1,
			}),
			messageEntry({
				role: "toolResult",
				toolCallId: callId,
				toolName: "read",
				content: [{ type: "text", text: `contents of ${target}: ${"x".repeat(400)}` }],
				isError: false,
				timestamp: Date.now(),
			}),
		];
	});
}

const textOf = (entry: SessionMessageEntry): string =>
	((entry.message as ToolResultMessage).content as TextContent[]).map(part => part.text).join("");

/** Write an out-of-repo extension module that registers the collapse transform. */
function writeExtensionModule(): { dir: string; file: string } {
	const dir = path.join(os.tmpdir(), `pi-reduction-e2e-${Snowflake.next()}`);
	fs.mkdirSync(dir, { recursive: true });
	tempDirs.push(dir);
	const file = path.join(dir, "reducing-extension.ts");
	fs.writeFileSync(
		file,
		[
			'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
			'import { collapseToolResultRuns } from "@oh-my-pi/pi-agent-core/compaction/context-reduction";',
			"export default function register(pi: ExtensionAPI): void {",
			"\tpi.registerContextTransform({",
			'\t\tname: "collapse-read-runs",',
			"\t\ttransform: (entries, tokenizer) =>",
			"\t\t\tcollapseToolResultRuns(entries, tokenizer, { protectRecentMessages: 0, minimumSavings: 0 }),",
			"\t});",
			"}",
			"",
		].join("\n"),
	);
	return { dir, file };
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) removeSyncWithRetries(dir);
	clearContextTransforms();
});

describe("the reduction transforms reached from an on-disk extension module", () => {
	it("changes the branch the prune pass sees, and disposal restores it exactly", async () => {
		const { dir, file } = writeExtensionModule();
		const loaded = await loadExtensions([file], dir);
		// The module loaded with no error, which is the claim: an author outside
		// this repo imports a published transform and registers it, and the real
		// loader accepts it without a core change.
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(1);

		const extension = loaded.extensions[0];
		expect(extension?.contextTransforms).toHaveLength(1);
		const registration = extension?.contextTransforms[0];
		expect(registration?.name).toBe("collapse-read-runs");

		// Before the runner installs it the registry is untouched: loading is not
		// installing, or merely importing something would reduce every branch.
		expect(hasContextTransforms()).toBe(false);

		const entries = readRun(["a.ts", "b.ts", "c.ts"]);
		const before = JSON.stringify(entries);
		expect(textOf(entries[1]!)).toContain("contents of a.ts");

		// Installing is what the runner does at initialize; driven directly so the
		// assertion is about the contribution's effect, not the wiring.
		const dispose = addContextTransform(extension!.path, registration!);
		expect(hasContextTransforms()).toBe(true);

		const outcome = runContextTransforms(entries, tokenizer);

		// Observable difference: the three file dumps the model would have paid to
		// re-read are now one line naming what they covered.
		expect(textOf(entries[1]!)).toBe("[3 read results: a.ts, b.ts, c.ts]");
		expect(textOf(entries[3]!)).toBe("[3 read results: a.ts, b.ts, c.ts]");
		expect(textOf(entries[5]!)).toBe("[3 read results: a.ts, b.ts, c.ts]");
		expect(outcome.total.prunedCount).toBe(3);
		expect(outcome.total.tokensSaved).toBeGreaterThan(0);
		expect(outcome.errors).toEqual([]);
		expect(outcome.outcomes.map(one => one.name)).toEqual(["collapse-read-runs"]);

		// Releasing it returns the process to exactly the pre-seam state — the
		// negative half of the contract, without which a stale registration would
		// keep rewriting a live transcript after its extension is unloaded.
		dispose();
		expect(hasContextTransforms()).toBe(false);
		expect(JSON.stringify(entries)).not.toBe(before);
		// A second pass with nothing registered must be inert, and must not
		// re-label or otherwise disturb the already-reduced branch.
		const reduced = JSON.stringify(entries);
		expect(runContextTransforms(entries, tokenizer).total).toEqual({ prunedCount: 0, tokensSaved: 0 });
		expect(JSON.stringify(entries)).toBe(reduced);
	});
});
