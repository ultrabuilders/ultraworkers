/**
 * An output format an extension registered has to be reachable from the export
 * path, or registering it achieves nothing.
 *
 * ## The failure this was raised against
 *
 * `registerOutputFormat` existed, and `exportSessionToHtml` accepted a `formats`
 * map and a `formatId` and read both. What did not exist was anything that
 * connected the two: every production call site passed only `{ outputPath }`, so
 * the registry was written on one side of the program and read on the other with
 * no path between. An extension could register a format, see no error, and never
 * be able to select it — the seam looked real from both ends and was unreachable
 * through the middle.
 *
 * So the contract asserted here is the join, not either end: a format registered
 * through the real loader is visible to the aggregate the session reads, and the
 * exporter writes that format's bytes instead of the built-in HTML.
 *
 * ## Why this needs a real loader rather than a stub
 *
 * A stub registry would make this pass while the wiring stayed broken, which is
 * the failure being fixed. The extension below is written to disk and loaded
 * through `loadExtensions`, so the id in the map is the id an extension author
 * would actually get.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { getProjectAgentDir, TempDir } from "@oh-my-pi/pi-utils";
import { parseExportArgs } from "@oh-my-pi/pi-coding-agent/export/html/args";
import { exportSessionToHtml } from "@oh-my-pi/pi-coding-agent/export/html";

/** The bytes the fixture format produces, distinct from anything HTML emits. */
const FORMAT_MARKER = "session-exported-as-markdown-by-an-extension";

const FORMATTER = `
	export default function(pi) {
		pi.registerOutputFormat({
			id: "notes",
			mimeType: "text/markdown",
			format: () => new TextEncoder().encode(${JSON.stringify(FORMAT_MARKER)}),
		});
	}
`;

describe("an extension's registered output format", () => {
	let tempDir: TempDir;
	let extensionsDir: string;

	beforeEach(() => {
		tempDir = TempDir.createSync("@output-format-reach-");
		extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
	});
	afterEach(() => {
		tempDir.removeSync();
	});

	/**
	 * The exporter reads the session file to collect sub-sessions, so it must
	 * exist on disk. Only the shape the exporter touches is provided, which is the
	 * same minimal session the sibling registry test uses.
	 */
	function makeSession(sessionFile: string) {
		return {
			getSessionFile: () => sessionFile,
			getHeader: () => ({ type: "session", version: 1, id: "s1", cwd: tempDir.path() }),
			getEntries: () => [
				{
					type: "message",
					id: "m1",
					parentId: null,
					timestamp: "2026-01-01T00:00:00.000Z",
					message: { role: "user", content: [{ type: "text", text: "hi" }] },
				},
			],
			getLeafId: () => "m1",
		} as never;
	}

	async function sessionFile(name: string): Promise<string> {
		const file = path.join(tempDir.path(), name);
		await Bun.write(file, "");
		return file;
	}

	async function runnerFor(): Promise<ExtensionRunner> {
		fs.writeFileSync(path.join(extensionsDir, "formatter.ts"), FORMATTER);
		const result = await loadExtensions([path.join(extensionsDir, "formatter.ts")], tempDir.path());
		expect(result.errors, "the fixture extension failed to load").toEqual([]);
		return new ExtensionRunner(
			result.extensions,
			result.runtime,
			tempDir.path(),
			makeSession(path.join(tempDir.path(), "runner.jsonl")),
			// A format never consults the model registry; the empty case is the same
			// registry shape, and the runner only stores it.
			{ get: () => undefined, list: () => [] } as never,
		);
	}

	it("is visible to the aggregate the session resolves at export time", async () => {
		const runner = await runnerFor();

		// The join under test: the id the extension registered is the id a caller
		// gets when it passes only a name, which is what a CLI flag produces.
		expect([...runner.getOutputFormats().keys()]).toContain("notes");
	});

	it("replaces the built-in HTML export when its id is selected", async () => {
		const runner = await runnerFor();
		const formats = runner.getOutputFormats();

		const pathWritten = await exportSessionToHtml(makeSession(await sessionFile("out-session.jsonl")), undefined, {
			outputPath: path.join(tempDir.path(), "out.md"),
			formatId: "notes",
			formats,
		});

		// The consumer-visible proof: the file on disk is the extension's bytes.
		// Asserting on the map instead would pass even if the exporter ignored it.
		expect(fs.readFileSync(pathWritten, "utf8")).toBe(FORMAT_MARKER);
	});

	it("NEGATIVE: an id nobody registered still writes the built-in HTML", async () => {
		const runner = await runnerFor();
		const pathWritten = await exportSessionToHtml(makeSession(await sessionFile("fallback.jsonl")), undefined, {
			outputPath: path.join(tempDir.path(), "fallback.html"),
			formatId: "not-registered",
			formats: runner.getOutputFormats(),
		});

		// The negative contract, stated as what a reader observes: an unknown id
		// does not select an extension format. Asserting the doctype's letter case
		// would test the HTML writer's capitalization, not the format lookup.
		const written = fs.readFileSync(pathWritten, "utf8");
		expect(written).not.toContain(FORMAT_MARKER);
		expect(written.toLowerCase()).toContain("<!doctype html>");
	});
});

describe("parseExportArgs", () => {
	it("reads --format as the id, not as the output path", () => {
		const parsed = parseExportArgs("--format notes");
		expect(parsed.formatId).toBe("notes");
		// The bug this guards: consuming the flag but leaving its value in the
		// positional list would export to a file literally named `notes`.
		expect(parsed.outputPath).toBeUndefined();
	});

	it("keeps a path alongside a format", () => {
		expect(parseExportArgs("--format notes out.md")).toEqual({
			outputPath: "out.md",
			useUserThemes: false,
			formatId: "notes",
		});
	});

	it("NEGATIVE: no format means the built-in export", () => {
		expect(parseExportArgs("out.html")).toEqual({
			outputPath: "out.html",
			useUserThemes: false,
			formatId: undefined,
		});
	});

	it("rejects a --format with no id rather than exporting to a file named --format", () => {
		expect(() => parseExportArgs("--format")).toThrow(/Usage/);
		expect(() => parseExportArgs("--format --themes")).toThrow(/Usage/);
	});
});

/**
 * RPC is the third surface that names a format.
 *
 * The CLI reaches a registered format through `parseExportArgs`, and the exporter
 * takes a `formatId` directly. RPC declared `export_html` with only `outputPath`,
 * so the id never crossed the wire: a client could not select a format an extension
 * registered, and the seam was unreachable from one of the three surfaces that are
 * supposed to reach it.
 *
 * Asserted at the boundary a client actually crosses — the frame the client sends —
 * rather than by reading the handler, because the failure was a field the frame did
 * not carry. Asserting the handler forwards it would pass while the frame dropped it.
 */
describe("the export_html RPC command", () => {
	// Its own scratch dir: the loader suite above owns a `tempDir` in ITS scope, and
	// reaching across describe boundaries is how this block first failed with
	// `ReferenceError: tempDir is not defined`.
	let tempDir: TempDir;
	beforeEach(() => {
		tempDir = TempDir.createSync("@output-format-rpc-");
	});
	afterEach(() => {
		tempDir.removeSync();
	});

	/**
	 * The frame `RpcClient.exportHtml` puts on the wire, read off a real transport.
	 *
	 * `#send` is a true private field writing to a subprocess stdin, so the frame is
	 * captured where it is actually observable: a fake agent process that records
	 * what it was sent and answers with the response shape `#send` waits for. Two
	 * earlier attempts — reflecting over `#send`, then injecting a `send` port —
	 * both failed, and that is the constraint stated plainly: a private field is not
	 * a seam, so the only honest observation point is the pipe.
	 */
	async function frameFor(outputPath?: string, formatId?: string): Promise<{ type: string; formatId?: string }> {
		const recorder = path.join(tempDir.path(), "frame.jsonl");
		const responder = path.join(tempDir.path(), "fake-agent.mjs");
		await Bun.write(
			responder,
			`import * as fs from "node:fs";
let buf = "";
// The client blocks in start() until it sees this frame (rpc-client.ts:391), so a
// fake agent that omits it never answers the command at all.
process.stdout.write(JSON.stringify({ type: "ready" }) + "\\n");
// The reply must carry type: "response" — isRpcResponse (rpc-client.ts:168) rejects
// anything else, and a rejected reply is not an error, it is silence: the request
// stays in #pendingRequests until the test timeout.
process.stdin.on("data", chunk => {
	buf += chunk;
	let nl;
	while ((nl = buf.indexOf("\\n")) !== -1) {
		const line = buf.slice(0, nl);
		buf = buf.slice(nl + 1);
		if (!line.trim()) continue;
		const frame = JSON.parse(line);
		fs.appendFileSync(${JSON.stringify(recorder)}, JSON.stringify(frame) + "\\n");
		process.stdout.write(JSON.stringify({
			type: "response",
			id: frame.id,
			success: true,
			command: frame.type,
			data: { path: "/tmp/out" },
		}) + "\\n");
	}
});
`,
		);
		const { RpcClient } = await import("@oh-my-pi/pi-coding-agent/modes/rpc/rpc-client");
		using client = new RpcClient({
			command: () => ["bun", responder],
			provider: "openrouter",
			model: "example/model",
			args: ["--no-session"],
		});
		await client.start();
		await client.exportHtml(outputPath, formatId);
		await client.stop();
		const frames = (await Bun.file(recorder).text())
			.split("\n")
			.filter(line => line.trim())
			.map(line => JSON.parse(line) as { type: string; formatId?: string });
		const exported = frames.find(frame => frame.type === "export_html");
		expect(exported, "no export_html frame reached the agent process").toBeDefined();
		return exported as { type: string; formatId?: string };
	}

	it("carries a format id across the wire", async () => {
		const frame = await frameFor("/tmp/x.md", "notes");
		// The assertion that fails on the unpatched tree: `formatId` was dropped here.
		expect(frame.type).toBe("export_html");
		expect(frame.formatId).toBe("notes");
	});

	it("omits the id when the caller names no format, so the default still applies", async () => {
		const frame = await frameFor("/tmp/x.html", undefined);
		// Control: an absent id must stay absent rather than becoming a value the
		// server would have to distinguish from "no format requested".
		expect(frame.type).toBe("export_html");
		expect(frame.formatId).toBeUndefined();
	});
});
