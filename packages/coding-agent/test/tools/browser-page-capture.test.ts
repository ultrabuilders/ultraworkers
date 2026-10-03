/**
 * The page-world capture (producer) and the tab's message guard (consumer) agree
 * on one field name. When they disagreed the guard returned early and every
 * Tern event vanished silently — a green suite would not have caught it,
 * because the other tests build the payload themselves and so stand in for the
 * producer on that path.
 *
 * This closes that gap by running the real installer, triggering a real
 * page-world console event, and feeding the string it actually posted into the
 * real guard. The payload is never hand-written here: if the producer stamps a
 * different field, the guard drops it and this test fails on an empty buffer.
 *
 * The installer runs in a child process on purpose. It replaces `console` and
 * mutates `window`, `document`, `Navigator` and `webkit` — doing that in this
 * process would leak into every later file in the run.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TernTab } from "@oh-my-pi/pi-coding-agent/tools/browser/tern/tern-tab";
import { TernSocketClient } from "@oh-my-pi/pi-coding-agent/tools/browser/tern/wire";
import { type FakeAnswer, type FakeDaemon, startFakeDaemon } from "./tern-fake-daemon";

const PAGE_CAPTURE_SRC = path.resolve(import.meta.dir, "../../src/tools/browser/tern/page-capture.ts");

let daemon: FakeDaemon | undefined;
let client: TernSocketClient | undefined;

afterEach(async () => {
	client?.close();
	client = undefined;
	await daemon?.close();
	daemon = undefined;
});

/**
 * Install the capture in a child page world, log one line from that page, and
 * return the payload the installer posted to the host — verbatim, as the string
 * that crossed the boundary.
 */
async function postFromPageWorld(text: string): Promise<string> {
	const script =
		`const { ternCaptureScript } = await import(${JSON.stringify(PAGE_CAPTURE_SRC)});` +
		// The page world the installer expects: a frame, a navigator prototype to
		// read descriptors off, and the host's message handler.
		`globalThis.Navigator = class Navigator {};` +
		`globalThis.window = globalThis;` +
		`const posted = [];` +
		`globalThis.webkit = { messageHandlers: { stencil: { postMessage: body => posted.push(body) } } };` +
		// Write through stdout, not console: the installer patches console below.
		`const emit = value => process.stdout.write(JSON.stringify(value) + "\\n");` +
		`try { (0, eval)(ternCaptureScript({ routes: [], emulation: {} })); }` +
		`catch (error) { emit({ threw: String((error && error.message) || error) }); process.exit(3); }` +
		`console.log(${JSON.stringify(text)});` +
		`emit({ posted });`;
	const proc = Bun.spawn([process.execPath, "-e", script], {
		env: { ...process.env, NO_COLOR: "1" },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0) throw new Error(`page-world probe exited ${code}: ${stderr}`);
	// The installer's own passthrough also writes to stdout, so take the last line.
	const result = JSON.parse(stdout.trim().split("\n").at(-1)!) as { posted?: string[] };
	if (!result.posted?.length) throw new Error(`page-world probe posted nothing (stdout: ${stdout})`);
	return result.posted[0]!;
}

describe("Tern page capture", () => {
	it("delivers a page-world console message the tab guard accepts", async () => {
		const body = await postFromPageWorld("hello from the page");

		// Deliver exactly once, after `open`, so the read below cannot race the
		// tab's poll loop and cannot read the same batch twice.
		let opened = false;
		let delivered = false;
		daemon = await startFakeDaemon((op): FakeAnswer => {
			switch (op.op) {
				case "open":
					opened = true;
					return { ok: { block: 7, url: "about:blank" } };
				case "events": {
					if (opened && !delivered) {
						delivered = true;
						return {
							ok: {
								events: [{ seq: 1, type: "message", world: "page", main: true, url: "https://example.test/", body }],
								next: 1,
								dropped: 0,
							},
						};
					}
					return { ok: { events: [], next: 0, dropped: 0 } };
				}
				case "state":
					return {
						ok: {
							url: "https://example.test/",
							title: "Example",
							loading: true,
							back: false,
							forward: false,
							width: 800,
							height: 600,
						},
					};
				default:
					return { ok: {} };
			}
		});

		client = new TernSocketClient({ socketPath: daemon.socketPath });
		const tab = await TernTab.open(client, {
			name: "main",
			pane: 3,
			viewport: { width: 800, height: 600 },
			timeoutMs: 5_000,
		});

		// The producer's own field name, asserted through the consumer that
		// reads it: a mismatch anywhere upstream leaves this buffer empty.
		const captured = await tab.console();
		expect(captured.entries).toEqual([
			expect.objectContaining({ type: "console", level: "log", text: "hello from the page", args: ["hello from the page"] }),
		]);
	});
});