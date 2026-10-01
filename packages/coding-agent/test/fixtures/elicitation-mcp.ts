#!/usr/bin/env bun
/**
 * Test fixture: a stdio MCP server that gates its `elicitation/create` on what
 * the client actually wrote into `initialize`.
 *
 * The gate is the whole point. A client that declares `elicitation` gets a real
 * `elicitation/create`, and the fixture reports the answer (or the error) as
 * `elicitation/observed`. A client that omits it gets no request, and the
 * fixture reports `{ sent: false }` instead — so the absence is observable.
 *
 * That is the only way to see the capability. `initialize` succeeds whether or
 * not the key is present, so every assertion about "the connection worked" is
 * true in both states. Reading `params.capabilities` off the wire is what
 * separates them.
 *
 * Deliberately a separate process: an in-process stub cannot distinguish "the
 * client advertised the capability" from "the test constructed the object with
 * the field set".
 */
import * as readline from "node:readline";

/** Reported when the client omitted `elicitation`, in place of eliciting. */
export const CAPABILITY_ABSENT = "elicitation/absent" as const;
/** Notification method carrying the fixture's report either way. */
export const OBSERVED_METHOD = "elicitation/observed" as const;
/** Message text carried in the request, asserted by the positive branch. */
export const ELICIT_MESSAGE = "Sign in to continue" as const;
/** The id the fixture elicits with. Distinct from any client request id. */
export const ELICIT_ID = 9001;
/** Property name the requested schema requires, asserted through the handler. */
export const REQUIRED_FIELD = "token" as const;

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(message: unknown): void {
	process.stdout.write(`${JSON.stringify(message)}\n`);
}

/**
 * Whether the client advertised elicitation, decided once and read after the
 * handshake. Held in a variable rather than a const because the decision
 * arrives in `initialize` and is consumed in `notifications/initialized` — two
 * separate frames.
 */
let clientDeclaredElicitation = false;

rl.on("line", line => {
	const text = line.trim();
	if (!text) return;

	let message: {
		id?: number;
		method?: string;
		params?: { capabilities?: Record<string, unknown>; protocolVersion?: string };
		result?: Record<string, unknown>;
		error?: { code?: number; message?: string };
	};
	try {
		message = JSON.parse(text);
	} catch {
		return;
	}

	if (message.method === "initialize") {
		// The single fact every branch turns on.
		clientDeclaredElicitation = message.params?.capabilities?.elicitation !== undefined;
		send({
			jsonrpc: "2.0",
			id: message.id,
			result: {
				protocolVersion: message.params?.protocolVersion ?? "2025-11-25",
				capabilities: {},
				serverInfo: { name: "elicitation-fixture", version: "1.0.0" },
			},
		});
		return;
	}

	// Only after the handshake: a server cannot ask before `initialize` is
	// answered, and sending alongside the response races the client's transport
	// wiring — the reply is then dropped and the run reads as if no capability
	// had been declared.
	if (message.method === "notifications/initialized") {
		if (!clientDeclaredElicitation) {
			send({ jsonrpc: "2.0", method: OBSERVED_METHOD, params: { sent: false } });
			return;
		}
		send({
			jsonrpc: "2.0",
			id: ELICIT_ID,
			method: "elicitation/create",
			params: {
				message: ELICIT_MESSAGE,
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
		return;
	}

	// The client's answer, or its error, to the elicitation above. Reporting it
	// as a notification lets the exchange finish without a second round trip.
	if (message.id === ELICIT_ID) {
		const { error } = message;
		send({
			jsonrpc: "2.0",
			method: OBSERVED_METHOD,
			params: error
				? { sent: true, ok: false, error: { code: error.code, message: error.message } }
				: {
						sent: true,
						ok: true,
						action: message.result?.action ?? null,
						keys: Object.keys(message.result ?? {}),
						content: message.result?.content ?? null,
					},
		});
	}
});
