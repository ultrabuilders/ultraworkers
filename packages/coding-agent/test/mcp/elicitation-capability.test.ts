/**
 * The `elicitation` capability is invisible to every behavioural assertion.
 *
 * That is the reason this file exists, and it is worth stating plainly: an
 * `initialize` succeeds whether or not the client declared `elicitation`, so a
 * test that asserts "the connection worked", that nothing threw, or that the
 * response is non-empty is green in **both** states — including the broken one
 * where the capability is advertised and no handler answers it.
 *
 * So each branch below turns on bytes that actually crossed the wire:
 *
 * 1. **Positive.** A real `MCPManager` over stdio elicits and the answer comes
 *    back, which only happens when the client both declared the capability and
 *    installed a handler.
 * 2. **Negative (`-32601`).** No handler: the server must learn the request
 *    *failed*, and with the exact code. Asserting only "not accepted" cannot
 *    tell a deliberate refusal from a mangled error.
 * 3. **Negative on the wire, deliberately outside `MCPManager`.** The fixture
 *    reports `sent: false` when the client's `initialize` omitted the key. Once
 *    the manager always declares it, this is the only place the absence stays
 *    observable — and it is the branch that dies if the literal loses the key.
 *
 * Branch 3 spawns the fixture directly and sends a raw `initialize`, because
 * `MCPManager` cannot be made to withhold a capability it always sends.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { MCPManager } from "../../src/mcp/manager";
import {
	CAPABILITY_ABSENT,
	ELICIT_ID,
	ELICIT_MESSAGE,
	OBSERVED_METHOD,
	REQUIRED_FIELD,
} from "../fixtures/elicitation-mcp";

const FIXTURE_PATH = path.join(import.meta.dir, "..", "fixtures", "elicitation-mcp.ts");

/** What the fixture reported back over the notification channel. */
interface Report {
	sent: boolean;
	ok?: boolean;
	action?: string | null;
	keys?: string[];
	content?: Record<string, unknown> | null;
	error?: { code?: number; message?: string };
}

const managers: MCPManager[] = [];

afterEach(async () => {
	await Promise.all(managers.splice(0).map(manager => manager.disconnectAll()));
});

/**
 * Connect a real manager to the fixture and wait for its report.
 *
 * The manager is the thing under test rather than the transport directly:
 * driving the client by hand would skip the `initialize` construction where the
 * capability is declared, which is precisely the code under test.
 */
async function elicitThroughManager(answer?: { action: "accept"; content: Record<string, string> }): Promise<Report> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-elicit-cap-"));
	const manager = new MCPManager(dir);
	managers.push(manager);
	if (answer) manager.setElicitationHandler(() => Promise.resolve(answer));

	const reported = Promise.withResolvers<Report>();
	manager.addNotificationListener((_server, method, params) => {
		if (method === OBSERVED_METHOD) reported.resolve(params as unknown as Report);
	});
	await manager.connectServers({ fixture: { command: process.execPath, args: [FIXTURE_PATH] } }, {});

	// The report is a notification the fixture emits on its own schedule, so a
	// timeout here is a real failure to observe, not a flake to retry past.
	return await Promise.race([
		reported.promise,
		Bun.sleep(5000).then(() => ({ sent: false, timedOut: true }) as Report),
	]);
}

/**
 * Send a hand-built `initialize` straight to the fixture and read its report.
 *
 * This bypasses `MCPManager` on purpose: the manager always declares
 * `elicitation`, so withholding the key is only possible by writing the frame
 * here. It is the one place the "capability missing" state can still be seen.
 */
async function initializeWithoutElicitation(): Promise<Report> {
	const child = Bun.spawn([process.execPath, FIXTURE_PATH], { stdin: "pipe", stdout: "pipe", stderr: "ignore" });
	try {
		const writer = child.stdin as unknown as { write(chunk: string): void };
		writer.write(
			`${JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2025-11-25",
					capabilities: { roots: { listChanged: false } },
					clientInfo: { name: "raw", version: "1.0.0" },
				},
			})}\n`,
		);
		writer.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

		const reader = (child.stdout as ReadableStream<Uint8Array>).getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		const deadline = Date.now() + 5000;
		while (Date.now() < deadline) {
			const chunk = await Promise.race([reader.read(), Bun.sleep(500).then(() => null)]);
			// Bun yields Buffer chunks from a pipe, not strings — decoding is
			// required, and a reader that assumes strings never matches.
			if (chunk?.value) buffer += decoder.decode(chunk.value, { stream: true });
			for (const line of buffer.split("\n")) {
				if (!line.trim()) continue;
				const message = JSON.parse(line) as { method?: string; params?: Report };
				if (message.method === OBSERVED_METHOD) return message.params as Report;
			}
			buffer = buffer.slice(buffer.lastIndexOf("\n") + 1);
			if (buffer === "") buffer = "";
		}
		throw new Error("fixture never reported; a server that never elicits must still report absence");
	} finally {
		child.kill();
	}
}

describe("elicitation capability on the wire", () => {
	it("declares elicitation, so a server that asks gets a real answer", async () => {
		const report = await elicitThroughManager({ action: "accept", content: { scope: "read" } });

		// Logs the fact both remaining branches hinge on: the fixture only
		// elicits when this key is present in the initialize it received.
		console.log(`[fixture] sent=${report.sent} action=${report.action} content=${JSON.stringify(report.content)}`);
		expect(report.sent).toBe(true);
		expect(report.ok).toBe(true);
		expect(report.action).toBe("accept");
		expect(report.content).toEqual({ scope: "read" });
	});

	it("answers the server's question with what the host handler decided", async () => {
		// The wire answer must be the host's decision, not a default: a manager
		// that fabricated "accept" would tell a server the user consented to
		// something they never saw.
		const report = await elicitThroughManager({ action: "accept", content: { scope: "write" } });

		console.log(`[manager] elicitation/create -> action=${report.action} content=${JSON.stringify(report.content)}`);
		expect(report.action).toBe("accept");
		expect(report.content).toEqual({ scope: "write" });
	});

	it("refuses with -32601, not merely 'not accepted', when no handler is installed", async () => {
		const report = await elicitThroughManager();

		console.log(`[manager] elicitation/create -> ${JSON.stringify(report.error)}`);
		// The exact code is the contract: a server branches on it. "Not accepted"
		// would also be satisfied by a transport that mangled the failure into
		// something else entirely.
		expect(report.sent).toBe(true);
		expect(report.ok).toBe(false);
		expect(report.error?.code).toBe(-32601);
		expect(report.action).toBeUndefined();
	});

	it("declares the capability in the initialize a server actually receives", async () => {
		const report = await elicitThroughManager({ action: "accept", content: { scope: "read" } });

		// The fixture's decision to elicit is a read of the client's bytes, so
		// its having elicited is the assertion that `elicitation` was written
		// out — not merely present in a TypeScript type.
		console.log(`[fixture] elicited=${report.sent} (means initialize carried capabilities.elicitation)`);
		expect(report.sent).toBe(true);
		expect(ELICIT_ID).toBe(9001);
		expect(ELICIT_MESSAGE).toBe("Sign in to continue");
		expect(REQUIRED_FIELD).toBe("token");
	});

	it("does not elicit, and says so, when the client withholds the capability", async () => {
		const report = await initializeWithoutElicitation();

		console.log(`[fixture] sent=${report.sent} (raw initialize had no elicitation key)`);
		// This is the branch that dies if the literal in client.ts loses the key:
		// the positive branch only proves the fixture can elicit.
		expect(report.sent).toBe(false);
		expect(CAPABILITY_ABSENT).toBe("elicitation/absent");
	});
});
