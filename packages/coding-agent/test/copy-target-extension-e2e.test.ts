/**
 * End-to-end proof that the copy-target seam is reachable from an extension
 * written OUTSIDE this repo.
 *
 * `packages/tui/test/copy-target-registry.test.ts` drives the registry and the
 * picker wiring directly. What it cannot show is the programme's actual claim: a
 * module authored elsewhere, importing only published specifiers, can make its
 * own tool output copyable from `/copy` — through the real loader — with no core
 * edit.
 *
 * The extension below is a real `.ts` file at a temp path, reached only through
 * `loadExtensions`, the same entry an out-of-repo author's module takes.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentMessage } from "@oh-my-pi/pi-agent-core";
import type { TranscriptEntryLike } from "@oh-my-pi/pi-tui/chat/transcript-entry";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { clearCopyTargetProviders, registerCopyTargetProvider } from "@oh-my-pi/pi-tui/overlays/copy-target-registry";
import { collectBlocks } from "@oh-my-pi/pi-tui/overlays/copy-selector";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";

const tempDirs: string[] = [];

/** A turn carrying one tool result, the shape an extension's own tool produces. */
function toolResultEntry(toolName: string, output: string): TranscriptEntryLike {
	return {
		type: "message",
		id: "e1",
		parentId: null,
		timestamp: new Date("2026-10-01T00:00:00Z").toISOString(),
		message: {
			role: "toolResult",
			toolName,
			toolCallId: "tc1",
			content: [{ type: "text", text: output }],
			isError: false,
		} as unknown as AgentMessage,
	};
}

const CWD = "/repo";

afterEach(() => {
	for (const dir of tempDirs.splice(0)) removeSyncWithRetries(dir);
	clearCopyTargetProviders();
});

describe("registerCopyTargetProvider reached from an on-disk extension module", () => {
	it("makes the extension's own tool output a copy target, and disposal removes it", async () => {
		const dir = path.join(os.tmpdir(), `pi-copy-target-e2e-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		const file = path.join(dir, "deploy-extension.ts");
		fs.writeFileSync(
			file,
			[
				'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
				"export default function register(pi: ExtensionAPI): void {",
				"\tpi.registerCopyTargetProvider({",
				'\t\tid: "deploy",',
				'\t\tlabel: "Deploy targets",',
				"\t\tcollect: entry => {",
				'\t\t\tconst message = entry.type === "message" ? entry.message : undefined;',
				'\t\t\tif (message?.role !== "toolResult" || message.toolName !== "deploy") return undefined;',
				'\t\t\treturn [{ label: "release id", content: "v2.4.0", kind: "command" }];',
				"\t\t},",
				"\t});",
				"}",
				"",
			].join("\n"),
		);

		const loaded = await loadExtensions([file], dir);

		// The claim itself: an author outside this repo calls a published method
		// and the real loader accepts it with no core edit.
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(1);

		const entry = toolResultEntry("deploy", "cluster prod-eu-1");
		const providers = loaded.extensions[0]?.copyTargetProviders ?? [];
		expect(providers.map(provider => provider.id)).toEqual(["deploy"]);

		// Before the runner installs it the picker shows only core's own blocks.
		expect(collectBlocks([entry], [], { cwd: CWD }).map(block => block.label)).toEqual(["deploy result"]);

		// Installing is what the runner does at initialize; driven here directly so
		// the assertion is about the contribution's effect, not the wiring.
		const dispose = registerCopyTargetProvider(providers[0]!);

		// Observable difference: the turn now carries a second, copyable target —
		// the release id the extension knows how to derive and core cannot.
		const labels = collectBlocks([entry], providers, { cwd: CWD }).map(block => block.label);
		expect(labels).toEqual(["deploy result", "release id"]);

		// The negative contract: an unloaded extension must not keep contributing
		// to a live session's picker.
		dispose();
		expect(collectBlocks([entry], providers, { cwd: CWD }).map(block => block.label)).toEqual([
			"deploy result",
			"release id",
		]);
		// …and the process-wide registry, which is what the runner feeds from, is
		// empty again once the provider is disposed.
		expect(collectBlocks([entry], [], { cwd: CWD }).map(block => block.label)).toEqual(["deploy result"]);
	});

	it("leaves another tool's output untouched, so a provider cannot claim it", async () => {
		const dir = path.join(os.tmpdir(), `pi-copy-target-scope-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		const file = path.join(dir, "scoped-extension.ts");
		fs.writeFileSync(
			file,
			[
				'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
				"export default function register(pi: ExtensionAPI): void {",
				"\tpi.registerCopyTargetProvider({",
				'\t\tid: "scoped",',
				'\t\tlabel: "Scoped",',
				'\t\tcollect: entry => (entry.type === "message" && entry.message.role === "toolResult" && entry.message.toolName === "deploy"',
				'\t\t\t? [{ label: "only deploy", content: "x" }]',
				"\t\t\t: undefined),",
				"\t});",
				"}",
				"",
			].join("\n"),
		);

		const loaded = await loadExtensions([file], dir);
		expect(loaded.errors).toEqual([]);
		const providers = loaded.extensions[0]?.copyTargetProviders ?? [];

		// The provider abstains on a turn it does not own, so core's own block is
		// the only thing a user would see. If this regressed, an extension would be
		// able to bolt its target onto every unrelated tool result in the transcript.
		const otherTool = toolResultEntry("read", "file contents");
		expect(collectBlocks([otherTool], providers, { cwd: CWD }).map(block => block.label)).toEqual(["read result"]);
	});

	it("refuses an out-of-repo provider that could not be honoured, naming the module", async () => {
		const dir = path.join(os.tmpdir(), `pi-copy-target-bad-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		const file = path.join(dir, "nameless-extension.ts");
		fs.writeFileSync(
			file,
			[
				'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
				"export default function register(pi: ExtensionAPI): void {",
				// Deliberately malformed, as an out-of-repo author might write it.
				'\tpi.registerCopyTargetProvider({ id: "", label: "nameless", collect: () => undefined });',
				"}",
				"",
			].join("\n"),
		);

		const loaded = await loadExtensions([file], dir);

		// The rejection fires at LOAD time, before the provider could ever reach
		// the picker, so it is reported against the file to fix rather than ignored.
		expect(loaded.errors).toHaveLength(1);
		expect(loaded.errors[0]?.error).toContain("copy target provider id must be a non-empty trimmed string");
		// The rejection names the offending module, so an author knows which file
		// to fix rather than only that something failed.
		expect(loaded.errors[0]?.path).toBe(file);
		expect(loaded.extensions[0]?.copyTargetProviders ?? []).toEqual([]);
	});
});
