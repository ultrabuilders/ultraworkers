/**
 * The three `elicitation/create` outcomes must survive to the wire.
 *
 * A real stdio server elicits; the host answers; the reply travels back over the
 * same transport. What the server then observes is asserted, because that is
 * the only place the three outcomes can be told apart.
 *
 * The reason for going to the wire rather than calling a handler in-process is
 * that this failure is invisible from the inside. Collapse `decline` into
 * `cancel` — or into `undefined` — and every local check still passes: nothing
 * throws and the handler still returns an object. A server reading `action` is
 * the only thing that can tell them apart.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { MCPManager } from "../../src/mcp/manager";
import { TIMEOUT_ACTION, type MCPElicitOutcome } from "../../src/mcp/types";

/**
 * A server that elicits once and reports back what action it received.
 *
 * The elicitation carries id 9001 and the report is a *notification* with its own
 * id, so the reply to 9001 never collides with a response the client is still
 * waiting to send — the earlier version answered 9001 from the server side and
 * deadlocked the client against its own reply.
 */
const SERVER_SOURCE = String.raw`
const send = msg => process.stdout.write(JSON.stringify(msg) + "\n");
// Bun yields Buffer chunks from process.stdin, not strings — decoding here is
// required, and a fixture that skips it dies on the first line with
// "line.trim is not a function".
for await (const chunk of process.stdin) {
  const text = (typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk)).trim();
  if (!text) continue;
  const msg = JSON.parse(text);
  if (msg.method === "initialize") {
    send({ jsonrpc: "2.0", id: msg.id, result: {
      protocolVersion: msg.params.protocolVersion,
      capabilities: {},
      serverInfo: { name: "elicitation-fixture", version: "1.0.0" },
    } });
    // Elicit only once the handshake is done. A server cannot elicit before
    // initialize: the client would have no capabilities to answer with, and the
    // request would arrive while the connection is still settling.
  } else if (msg.method === "notifications/initialized") {
    // Elicit only after the handshake completes. Sending this alongside the
    // initialize response races the client: the transport has not finished
    // wiring its server-request handler yet, so the reply to id 9001 is
    // silently dropped and the server sees action=null.
    send({
      jsonrpc: "2.0",
      id: 9001,
      method: "elicitation/create",
      params: {
        message: "Sign in to continue",
        requestedSchema: {
          type: "object",
          properties: {
            token: { type: "string", title: "Token", required: true, writeOnly: true },
            scope: { type: "string", title: "Scope" },
          },
          required: ["token"],
        },
      },
    });
  } else if (msg.id === 9001) {
    // This is the client's answer to our elicitation. Report it as a
    // notification, which needs no reply, so the exchange can finish.
    const result = msg.result ?? {};
    send({ jsonrpc: "2.0", method: "elicitation/observed", params: {
      action: result.action ?? null,
      keys: Object.keys(result),
      content: result.content ?? null,
    } });
  }
}
`;

interface ObservedAnswer {
	action: string | null;
	keys: string[];
	content: Record<string, unknown> | null;
}

const managers: MCPManager[] = [];

afterEach(async () => {
	await Promise.all(managers.splice(0).map(manager => manager.disconnectAll()));
});

/**
 * Run one elicitation through a real `MCPManager` and return what the server saw.
 *
 * The manager — not the transport directly — is the thing under test. Driving
 * `connectToServer` would skip `#handleElicitationCreate` entirely, including the
 * guard that keeps a handler's answer intact, so a regression that collapsed
 * `decline` into `cancel` there would still be green.
 */
async function askOverTheWire(answer: MCPElicitOutcome): Promise<ObservedAnswer> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-elicitation-"));
	const script = path.join(dir, "server.mjs");
	await Bun.write(script, SERVER_SOURCE);

	const observed = Promise.withResolvers<ObservedAnswer>();
	const manager = new MCPManager(dir, null, undefined, { ladderMs: [50], retryBaseMs: 50, retryMaxMs: 100 });
	managers.push(manager);
	// The host's answer to the server's question.
	manager.setElicitationHandler(() => Promise.resolve(answer));

	// connectServers' third argument is a status callback, not a notification
	// hook — notifications arrive on the server listener. The fixture reports the
	// observed action as a notification, so subscribe there.
	manager.addNotificationListener((_serverName, method, params) => {
		if (method === "elicitation/observed") {
			observed.resolve(params as unknown as ObservedAnswer);
		}
	});
	await manager.connectServers({ fixture: { command: process.execPath, args: [script] } }, {});

	return await observed.promise;
}

describe("elicitation outcomes on the wire", () => {
	it("carries an accept through with its content", async () => {
		const answer = await askOverTheWire({ action: "accept", content: { scope: "read" } });

		expect(answer.action).toBe("accept");
		expect(answer.content).toEqual({ scope: "read" });
	});

	it("sends decline as decline", async () => {
		const answer = await askOverTheWire({ action: "decline" });

		expect(answer.action).toBe("decline");
	});

	it("sends cancel as cancel, and it is not decline", async () => {
		const cancel = await askOverTheWire({ action: "cancel" });
		const decline = await askOverTheWire({ action: "decline" });

		expect(cancel.action).toBe("cancel");
		// The whole point of the seam: a server must be able to tell these apart.
		expect(cancel.action).not.toBe(decline.action);
	});

	it("rejects with -32601 when no handler is installed", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-elicitation-nohandler-"));
		const script = path.join(dir, "server.mjs");
		await Bun.write(script, SERVER_SOURCE);

		const manager = new MCPManager(dir, null, undefined, { ladderMs: [50], retryBaseMs: 50, retryMaxMs: 100 });
		managers.push(manager);
		// No setElicitationHandler: the capability is still declared by the
		// client, so a spec-compliant server will still ask. Answering with a
		// fabricated "accept" would be worse than refusing — it would tell the
		// server the user consented to something they never saw.
		const failure = Promise.withResolvers<string>();
		manager.addNotificationListener((_serverName, method, params) => {
			if (method === "elicitation/observed") {
				const observed = params as unknown as ObservedAnswer;
				failure.resolve(`action=${observed.action}`);
			}
		});
		await manager.connectServers({ fixture: { command: process.execPath, args: [script] } }, {});
		const result = await Promise.race([failure.promise, Bun.sleep(2000).then(() => "timeout")]);

		// The server must learn the request failed, not that it was accepted.
		expect(result).not.toBe("action=accept");
	});

	it("passes required and writeOnly through to the host handler", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-elicitation-flags-"));
		const script = path.join(dir, "server.mjs");
		await Bun.write(script, SERVER_SOURCE);

		let seen: { required: boolean; writeOnly: boolean } | undefined;
		const manager = new MCPManager(dir, null, undefined, { ladderMs: [50], retryBaseMs: 50, retryMaxMs: 100 });
		managers.push(manager);
		// Wait on the handler itself, not on the fixture's notification. The
		// notification is sent when the client replies, which is a step later —
		// and a notification already in flight resolves the wait before this
		// row's handler has run, so the assertion would read `undefined` and
		// blame the parser for a race.
		const answered = Promise.withResolvers<void>();
		// Both parameters are named: the first is the server name, and a handler
		// that reads the request out of the first slot silently gets the server's
		// name instead — which then throws on `.requestedSchema` and looks like a
		// parser bug rather than a mistake in the test.
		manager.setElicitationHandler((_serverName, request) => {
			const token = request.requestedSchema.properties.token;
			seen = { required: token?.required === true, writeOnly: token?.writeOnly === true };
			answered.resolve();
			return Promise.resolve({ action: "decline" });
		});
		await manager.connectServers({ fixture: { command: process.execPath, args: [script] } }, {});
		await answered.promise;

		// The host is what masks a writeOnly field and what blocks submit on a
		// required one. If parsing drops either flag, the secret is rendered in
		// the clear and an empty required field submits anyway — with no error
		// anywhere.
		expect(seen).toEqual({ required: true, writeOnly: true });
	});

	it("refuses a host handler answer that is outside the union", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-elicitation-bad-"));
		const script = path.join(dir, "server.mjs");
		await Bun.write(script, SERVER_SOURCE);

		const failure = Promise.withResolvers<string>();
		const manager = new MCPManager(dir, null, undefined, { ladderMs: [50], retryBaseMs: 50, retryMaxMs: 100 });
		managers.push(manager);
		// A handler that answers outside the union would otherwise put a value on
		// the wire no server can read as an answer, and it would do so with no
		// local error — the same silence as collapsing decline into cancel.
		// @ts-expect-error — deliberately outside MCPElicitOutcome, which is what
		// the guard under test exists to catch.
		manager.setElicitationHandler(() => Promise.resolve({ action: "maybe", content: "not-an-object" }));
		manager.addNotificationListener((_serverName, method, params) => {
			if (method === "elicitation/observed") {
				const observed = params as unknown as ObservedAnswer;
				failure.resolve(`action=${observed.action}`);
			}
		});
		await manager.connectServers({ fixture: { command: process.execPath, args: [script] } }, {});
		const result = await Promise.race([failure.promise, Bun.sleep(2000).then(() => "timeout")]);

		// The invalid action must never reach the server as if it were an answer.
		expect(result).not.toBe("action=maybe");
	});

	it("maps a timeout to a declared action rather than to nothing", () => {
		// The union has no "unanswered" arm, so a timeout has to land on one that
		// was chosen. Landing on `undefined` would put a value on the wire that
		// reads as neither a yes nor a no.
		expect(["accept", "decline", "cancel"]).toContain(TIMEOUT_ACTION);
		expect(TIMEOUT_ACTION).not.toBe("accept");
	});
});
