import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
	ExtensionAPI,
	OutputFormat,
	OutputFormatContext,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

// Contract: the four surfaces that render a whole session — `/export`, the
// view-session command, the RPC export verb and the collaboration share command —
// all hardcoded HTML, so an extension had no way to offer markdown or a format
// for a consumer that already renders. They now pass a `formatId` and the
// exporter looks it up.
//
// What a consumer observes if this regresses: `/export --format markdown` either
// writes an HTML file under a `.md` name, or ignores the flag. Both are worse
// than an error — the first hands a consumer bytes that are not what its
// extension promises.
//
// The negative case matters more than the positive one. A formatter that throws
// must NOT silently fall back to HTML: the user asked for a shape and would
// receive a file of a different one under the name they asked for.

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

async function tmpFile(name: string): Promise<string> {
	return join(await mkdtemp(join(tmpdir(), "omp-fmt-")), name);
}

/** The exporter reads the session file to collect sub-sessions, so it must exist. */
async function sessionFile(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "omp-fmt-"));
	const file = join(dir, "s1.jsonl");
	await Bun.write(file, "");
	return file;
}

describe("exportSessionToHtml format selection", () => {
	it("writes the built-in HTML when no format is requested", async () => {
		// The default path must stay exactly what it was: an extension that
		// registers nothing changes nothing. Asserted on the bytes, not on the
		// return value, because the return value is a path anyone can produce.
		const { exportSessionToHtml } = await import("@oh-my-pi/pi-coding-agent/export/html");
		const sm = makeSession(await sessionFile());
		const out = await tmpFile("s.html");
		const path = await exportSessionToHtml(sm, undefined, { outputPath: out });
		const html = await readFile(path, "utf8");
		expect(html).toContain("<!DOCTYPE html>");
		expect(path.endsWith(".html")).toBe(true);
	});

	it("ignores an unknown formatId rather than failing", async () => {
		// A format id nothing registered is a stale flag, not a broken install.
		// Erroring here would make `/export --format x` fail on any machine where
		// that extension is not installed, which is the normal case.
		const { exportSessionToHtml } = await import("@oh-my-pi/pi-coding-agent/export/html");
		const sm = makeSession(await sessionFile());
		const out = await tmpFile("s.html");
		const path = await exportSessionToHtml(sm, undefined, {
			outputPath: out,
			formatId: "not-registered",
			formats: new Map(),
		});
		expect(await readFile(path, "utf8")).toContain("<!DOCTYPE html>");
	});

	it("uses a registered format and derives the extension from its id", async () => {
		const { exportSessionToHtml } = await import("@oh-my-pi/pi-coding-agent/export/html");
		const sm = makeSession(await sessionFile());
		const formats = new Map<string, OutputFormat>([
			[
				"markdown",
				{
					id: "markdown",
					mimeType: "text/markdown",
					format: (ctx: OutputFormatContext) =>
						bytes(`# Session\n\n${ctx.entries.length} entries\n`),
				},
			],
		]);
		const path = await exportSessionToHtml(sm, undefined, { formatId: "markdown", formats });
		expect(path.endsWith(".markdown")).toBe(true);
		expect(await readFile(path, "utf8")).toContain("entries");
	});

	it("prefers an explicit extension over one derived from the id", async () => {
		// An extension that names its own suffix must win, or a consumer keyed on
		// the suffix silently gets `.markdown` and fails to dispatch.
		const { exportSessionToHtml } = await import("@oh-my-pi/pi-coding-agent/export/html");
		const sm = makeSession(await sessionFile());
		const formats = new Map<string, OutputFormat>([
			[
				"markdown",
				{ id: "markdown", extension: ".md", mimeType: "text/markdown", format: () => bytes("x") },
			],
		]);
		const path = await exportSessionToHtml(sm, undefined, { formatId: "markdown", formats });
		expect(path.endsWith(".md")).toBe(true);
	});

	it("propagates a formatter's failure instead of falling back to HTML", async () => {
		// The failure mode this guards: the exporter catches, writes HTML, and
		// reports success. The user then has a file of the wrong shape under the
		// name they asked for, with no error to explain it.
		const { exportSessionToHtml } = await import("@oh-my-pi/pi-coding-agent/export/html");
		const sm = makeSession(await sessionFile());
		const formats = new Map<string, OutputFormat>([
			[
				"broken",
				{
					id: "broken",
					mimeType: "application/octet-stream",
					format: () => {
						throw new Error("formatter exploded");
					},
				},
			],
		]);
		expect(
			exportSessionToHtml(sm, undefined, { formatId: "broken", formats }),
		).rejects.toThrow("formatter exploded");
	});

	it("passes the transcript entries and the resolved theme names", async () => {
		// A format that renders the session needs the entries; one that themes its
		// output needs the names. Getting either wrong is silent — a formatter
		// that reads undefined renders an empty document.
		const { exportSessionToHtml } = await import("@oh-my-pi/pi-coding-agent/export/html");
		const sm = makeSession(await sessionFile());
		let seen: { entries: number; dark?: string; light?: string } | undefined;
		const formats = new Map<string, OutputFormat>([
			[
				"probe",
				{
					id: "probe",
					mimeType: "text/plain",
					format: (ctx: OutputFormatContext) => {
						seen = { entries: ctx.entries.length, dark: ctx.darkTheme, light: ctx.lightTheme };
						return bytes("ok");
					},
				},
			],
		]);
		await exportSessionToHtml(sm, undefined, {
			formatId: "probe",
			formats,
			themeNames: { dark: "dark-name", light: "light-name" },
		});
		expect(seen?.entries).toBeGreaterThan(0);
		expect(seen?.dark).toBe("dark-name");
		expect(seen?.light).toBe("light-name");
	});
});

describe("registerOutputFormat", () => {
	async function register(factory: (api: ExtensionAPI) => void) {
		const { ExtensionRuntime, loadExtensionFromFactory } = await import(
			"@oh-my-pi/pi-coding-agent/extensibility/extensions/loader"
		);
		const { EventBus } = await import("@oh-my-pi/pi-coding-agent/utils/event-bus");
		return loadExtensionFromFactory(
			factory,
			"/ext",
			new EventBus(),
			new ExtensionRuntime(),
			"formats",
		);
	}

	it("refuses a second format with the same id", async () => {
		// Load-order dependence: whichever extension loaded last would win, and the
		// exported bytes would change when a dependency version changed. This is
		// the same rule registerComposerShape applies to shape ids.
		let thrown: unknown;
		await register(api => {
			api.registerOutputFormat({ id: "md", mimeType: "text/markdown", format: () => bytes("a") });
			try {
				api.registerOutputFormat({ id: "md", mimeType: "text/markdown", format: () => bytes("b") });
			} catch (e) {
				thrown = e;
			}
		});
		expect(String(thrown)).toContain("already registered");
	});

	it("refuses an empty or untrimmed id", async () => {
		const seen: string[] = [];
		await register(api => {
			for (const id of ["", " md "]) {
				try {
					api.registerOutputFormat({ id, mimeType: "x/y", format: () => bytes("") });
				} catch {
					seen.push(id);
				}
			}
		});
		expect(seen).toEqual(["", " md "]);
	});

	it("accepts distinct ids and keeps them addressable", async () => {
		// The registry has to be reachable after loading, or a caller that wants
		// to pass `formats` to the exporter has nothing to pass.
		const ext = await register(api => {
			api.registerOutputFormat({ id: "md", mimeType: "text/markdown", format: () => bytes("a") });
			api.registerOutputFormat({ id: "json", mimeType: "application/json", format: () => bytes("{}") });
		});
		expect([...ext.outputFormats.keys()]).toEqual(["md", "json"]);
	});
});

/** A session manager shaped like the real one, with one entry. */
function makeSession(sessionFile: string) {
	const header = { type: "session", version: 1, id: "s1", cwd: "/tmp" };
	const entry = {
		type: "message",
		id: "m1",
		parentId: null,
		timestamp: "2026-01-01T00:00:00.000Z",
		message: { role: "user", content: [{ type: "text", text: "hi" }] },
	};
	return {
		getSessionFile: () => sessionFile,
		getHeader: () => header,
		getEntries: () => [entry],
		getLeafId: () => "m1",
	} as never;
}
