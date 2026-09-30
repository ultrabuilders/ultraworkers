/**
 * End-to-end proof of the `registerCompactionProtection` seam.
 *
 * `compaction-protection.test.ts` measures the registry in isolation. What it
 * cannot show is the claim that matters: an extension module written OUTSIDE this
 * repo can reach the API through the REAL loader and have its contribution land
 * where the prune pass will consult it.
 *
 * The extension here is a real `.ts` file at a temp path, reached only through
 * `loadExtensions` — the same entry an out-of-repo author's module takes. It
 * imports nothing but the published `ExtensionAPI` type and calls one method on
 * it, so if this passes, nothing in core needed changing for it to exist.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import {
	addCompactionProtection,
	clearCompactionProtection,
	compactionProtectedTools,
	hasCompactionProtection,
} from "@oh-my-pi/pi-coding-agent/tools/compaction-protection";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";

const tempDirs: string[] = [];

function writeExtensionModule(): { dir: string; file: string } {
	const dir = path.join(os.tmpdir(), `pi-compaction-e2e-${Snowflake.next()}`);
	fs.mkdirSync(dir, { recursive: true });
	tempDirs.push(dir);
	const file = path.join(dir, "protecting-extension.ts");
	fs.writeFileSync(
		file,
		[
			'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
			"export default function register(pi: ExtensionAPI): void {",
			"\tpi.registerCompactionProtection({",
			"\t\tprotectedTools: [context =>",
			'\t\t\tcontext.toolCall?.name === "memowrite" && context.toolResult.isError !== true],',
			'\t\tsupersedeKey: (toolName, args) => (toolName === "memowrite" ? `memo:${String(args.id)}` : undefined),',
			"\t});",
			"}",
			"",
		].join("\n"),
	);
	return { dir, file };
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) removeSyncWithRetries(dir);
	clearCompactionProtection();
});

describe("registerCompactionProtection reached from an on-disk extension module", () => {
	it("the real loader runs an out-of-repo module's call and holds its contribution", async () => {
		const { dir, file } = writeExtensionModule();

		const loaded = await loadExtensions([file], dir);
		// The module loaded with no error, which is the whole claim: an author
		// outside this repo calls a published method and the loader accepts it.
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(1);

		const extension = loaded.extensions[0];
		expect(extension).toBeDefined();
		// Its contribution is sitting in the extension's own bucket, unread by
		// anything else — the seam is populated per-extension, not globally.
		expect(extension?.compactionProtections).toHaveLength(1);
		const protection = extension?.compactionProtections[0];
		expect(protection?.supersedeKey).toBeInstanceOf(Function);
		expect(protection?.protectedTools).toHaveLength(1);

		// Before the runner installs it, the process-wide registry is untouched —
		// loading is not installing, and conflating the two would let a module that
		// merely imported something start protecting context.
		expect(hasCompactionProtection()).toBe(false);

		// Installing is what the runner does at initialize; driven here directly so
		// the assertion is about the contribution's content, not the wiring.
		const dispose = addCompactionProtection(extension!.path, protection!);
		expect(hasCompactionProtection()).toBe(true);

		const matcher = protection?.protectedTools?.[0];
		expect(matcher).toBeInstanceOf(Function);
		// The matcher the out-of-repo author wrote actually discriminates: it accepts
		// its own successful tool and declines everything else, which is what keeps
		// it from being refused as unconditional.
		expect((matcher as (c: unknown) => boolean)(contextFor("memowrite", false))).toBe(true);
		expect((matcher as (c: unknown) => boolean)(contextFor("memowrite", true))).toBe(false);
		expect((matcher as (c: unknown) => boolean)(contextFor("read", false))).toBe(false);

		dispose();
		// And releasing it returns the process to exactly the pre-seam state.
		expect(hasCompactionProtection()).toBe(false);
		expect(compactionProtectedTools()).toEqual([]);
	});

	it("refuses an out-of-repo contribution that would protect everything, naming the module", async () => {
		const dir = path.join(os.tmpdir(), `pi-compaction-e2e-bad-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		const file = path.join(dir, "greedy-extension.ts");
		fs.writeFileSync(
			file,
			[
				'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
				"export default function register(pi: ExtensionAPI): void {",
				"\tpi.registerCompactionProtection({ protectedTools: [() => true] });",
				"}",
				"",
			].join("\n"),
		);

		const loaded = await loadExtensions([file], dir);
		// Loading succeeds — the rejection is the seam's, and it fires when the
		// contribution is installed rather than when the module merely imports.
		expect(loaded.errors).toEqual([]);
		const protection = loaded.extensions[0]?.compactionProtections[0];
		expect(protection).toBeDefined();

		// The module's own path is what an author would see in the error, so a
		// rejected contribution points at the file to fix.
		expect(() => addCompactionProtection(file, protection!)).toThrow(/greedy-extension\.ts[\s\S]*every result/);
		expect(hasCompactionProtection()).toBe(false);
	});
});

function contextFor(toolName: string, isError: boolean): unknown {
	return {
		toolResult: { role: "toolResult", toolCallId: "c1", toolName, content: [], isError, timestamp: 0 },
		toolCall: { type: "toolCall", id: "c1", name: toolName, arguments: {} },
	};
}
