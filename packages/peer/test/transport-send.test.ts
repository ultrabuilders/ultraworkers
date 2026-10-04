import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { decodeFrames, listenOnEndpoint, peerEndpoint } from "../src/transport/index";
import { createPeerSocketTransport, PEER_SEND_TIMEOUT_MS } from "../src/transport/send";
import type { PeerTransport } from "@oh-my-pi/pi-coding-agent/irc/peer-transport";

/**
 * `send.ts` — the client half of the peer transport.
 *
 * Every row drives a REAL unix socket through the real length-prefixed framing. A stubbed
 * `net.Socket` would pass while the three things most likely to be wrong stayed untested: the
 * connect handshake, the acknowledgement wait, and the fact that an unacknowledged write
 * reports `refused` rather than `persisted`.
 *
 * Two rows carry the contract. Claude Code §15.1 returned `success: true` for a message that
 * was never received, and because every send reported success no fallback could fire — so
 * "what does this return when the far side never answers" matters. The mirror matters just as
 * much: a peer that DOES answer, with its own handshake frames before the ack, must still
 * come back `persisted`. Failing on the first unexpected reply turns a delivered message into
 * a reported loss, which is the same defect pointing the other way.
 */

const roots: string[] = [];
const servers: net.Server[] = [];
/** Accepted sockets, so teardown can end them before closing the listener. */
const openSockets: net.Socket[] = [];

/** A peer endpoint both ends agree on, isolated per row. */
async function socketPair(): Promise<{ projectDir: string; endpoint: string; runtimeDir: string }> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "peer-send-"));
	roots.push(root);
	const runtimeDir = path.join(root, "run");
	await fs.mkdir(runtimeDir, { recursive: true });
	return { projectDir: root, endpoint: peerEndpoint(root, runtimeDir), runtimeDir };
}

function transportFor(deps: {
	projectDir: string;
	runtimeDir: string;
	selfId?: string;
	ownToken?: string;
	chain?: readonly string[];
}): PeerTransport {
	return createPeerSocketTransport({
		projectDir: deps.projectDir,
		runtimeDir: deps.runtimeDir,
		selfId: deps.selfId ?? "RoseOtter",
		ownToken: deps.ownToken,
		chain: deps.chain,
	});
}

afterEach(async () => {
	// Accepted sockets FIRST, then the listener. `server.close()` waits for its connections to
	// end, so a row whose peer deliberately stayed silent — the one asserting an unacknowledged
	// send is refused — would hang the hook rather than the assertion. The refusal itself is
	// proved by `deliver()`; the teardown is only making sure nothing outlives the row.
	for (const socket of openSockets.splice(0)) socket.destroy();
	for (const server of servers.splice(0)) {
		await new Promise<void>(resolve => server.close(() => resolve()));
	}
	await Promise.all(roots.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

/**
 * A listener that decodes frames and hands each one to `onFrame` along with the socket it
 * arrived on, so a row can answer. Recording the socket is also what lets `afterEach` end a
 * deliberately-silent peer instead of waiting on it.
 */
async function serve(endpoint: string, onFrame: (value: unknown, socket: net.Socket) => void): Promise<void> {
	const server = await listenOnEndpoint(endpoint, socket => {
		openSockets.push(socket);
		// Annotated, as the socket's chunks widen the buffer's element type past what
		// `Buffer.alloc(0)` infers — the same annotation `injection-e2e.test.ts` uses.
		let buffer: Buffer = Buffer.alloc(0);
		socket.on("data", chunk => {
			buffer = Buffer.concat([buffer, chunk as Buffer]);
			const { frames, rest } = decodeFrames(buffer);
			buffer = rest;
			for (const frame of frames) {
				if (!frame.ok) continue;
				onFrame(frame.value, socket);
			}
		});
	});
	servers.push(server);
}

describe("a peer socket transport, over a real socket", () => {
	it("reports persisted only after the far side acknowledges the frame", async () => {
		// The positive row. A peer that receives the frame and answers `ack` is the only thing
		// that may produce `persisted` — so this pins both halves of the wait: the frame arrives
		// intact, and the outcome follows the acknowledgement rather than the write returning.
		const { projectDir, endpoint, runtimeDir } = await socketPair();
		const received: unknown[] = [];
		await serve(endpoint, (value, socket) => {
			received.push(value);
			// Acknowledge only the message frame, not the hello handshake.
			if ((value as { kind?: string }).kind === "message") socket.write(encodeAck("ack"));
		});

		const outcome = await transportFor({ projectDir, runtimeDir }).deliver("BlueLake", "hello there");
		expect(outcome).toEqual({ outcome: "persisted" });
		// The body actually crossed the socket, decoded by the receiver's own decoder.
		const message = received.find(v => (v as { kind?: string }).kind === "message");
		expect(message).toMatchObject({ kind: "message", from: "RoseOtter" });
	});

	it("refuses rather than reporting success when no peer is listening", async () => {
		// The §15.1 direction, stated as the outcome a caller can act on. With nothing bound to
		// the endpoint the connect fails, and a transport that answered `persisted` here would
		// report delivery of a message that reached nobody.
		const { projectDir, runtimeDir } = await socketPair();
		const outcome = await transportFor({ projectDir, runtimeDir }).deliver("BlueLake", "into the void");
		expect(outcome).toMatchObject({ outcome: "refused", cause: "no-route" });
	});

	it(
		"refuses when the far side goes silent instead of acknowledging",
		async () => {
			// The case a write-only client gets wrong: the write succeeds, so a transport that does
			// not wait would report `persisted` for a message the peer never read. The peer here
			// binds the socket and never answers, so only an actual acknowledgement can pass.
			const { projectDir, endpoint, runtimeDir } = await socketPair();
			// Accept and stay silent — the deliberate failure mode.
			await serve(endpoint, () => {});

			const outcome = await transportFor({ projectDir, runtimeDir }).deliver("BlueLake", "anybody there?");
			expect(outcome).toMatchObject({ outcome: "refused", cause: "no-route" });
			// Bun's per-test default is 5s, so the wait has to be declared as its own budget. The
			// row's whole subject IS the wait, so letting the runner cut it short would replace
			// "refused after the acknowledgement timeout" with "timed out", testing nothing.
		},
		PEER_SEND_TIMEOUT_MS + 5_000,
	);

	it(
		"refuses when the far side answers and then never acknowledges",
		async () => {
			// The mirror of the row below, and the one that catches "any byte arriving is delivery".
			//
			// Kept as a separate row because the two fail in OPPOSITE directions, so neither
			// subsumes the other: settling on the first reply passes this row only by never
			// settling at all until the timeout, and ignoring everything until an ack passes it
			// correctly. A client that conflated "bytes arrived" with "acknowledged" would
			// report `persisted` here for a message the peer explicitly never confirmed.
			const { projectDir, endpoint, runtimeDir } = await socketPair();
			// Answers the handshake, then never acknowledges.
			await serve(endpoint, (_value, socket) => socket.write(encodeFrame({ kind: "hello", from: "BlueLake" })));

			const outcome = await transportFor({ projectDir, runtimeDir }).deliver("BlueLake", "did you get this?");
			expect(outcome).toMatchObject({ outcome: "refused", cause: "no-route" });
		},
		PEER_SEND_TIMEOUT_MS + 5_000,
	);

	it(
		"persists when the far side answers something else first and then acknowledges",
		async () => {
			// The row that separates "waited for an ack" from "settled on the first reply".
			//
			// A peer answering the `hello` handshake before acknowledging is behaving correctly, and
			// a client that failed the send on the first non-ack frame would report a delivered
			// message as lost — the §15.1 shape, one layer deeper: the message DID arrive, and the
			// sender says it did not. So the exchange must ignore everything until the ack.
			//
			// The frames here are chosen to break the three wrong implementations at once: a `hello`
			// matching the sender's own handshake, a `notice` that is not an ack kind, and a message
			// body containing the literal text `"ack"` — which a substring test would match.
			const { projectDir, endpoint, runtimeDir } = await socketPair();
			await serve(endpoint, (value, socket) => {
				if ((value as { kind?: string }).kind !== "message") return;
				socket.write(encodeFrame({ kind: "hello", from: "BlueLake" }));
				socket.write(encodeFrame({ kind: "notice", from: "BlueLake", body: { text: 'said "ack"' } }));
				socket.write(encodeAck("ack"));
			});

			const outcome = await transportFor({ projectDir, runtimeDir }).deliver("BlueLake", "did you get this?");
			expect(outcome).toEqual({ outcome: "persisted" });
		},
		PEER_SEND_TIMEOUT_MS + 5_000,
	);

	it("declares itself incapable of injection, so persisted is the only honest outcome", async () => {
		// A capability declaration is a promise the host enforces at the boundary
		// (`deliverPeerMessage` refuses `persisted` from a transport that declares
		// `durable: false` is fine, but `injected` would be rejected). Asserting the
		// declaration pins the reason `deliver` cannot be tempted into claiming a transcript.
		const { projectDir, runtimeDir } = await socketPair();
		const transport = transportFor({ projectDir, runtimeDir });
		expect(transport.capabilities.crossProcess).toBe(true);
		expect(transport.capabilities.injects).toBe(false);
		expect(transport.protocolVersion).toBe(1);
	});

	it("carries the hop chain on the wire when the session has a token", async () => {
		// The chain is what lets a receiver tell "this came back to me" from "this went deep",
		// so it has to be on the frame rather than computed by the receiver. Asserted on the
		// decoded frame, which is what the far side would actually read.
		const { projectDir, endpoint, runtimeDir } = await socketPair();
		const received: unknown[] = [];
		await serve(endpoint, (value, socket) => {
			received.push(value);
			if ((value as { kind?: string }).kind === "message") socket.write(encodeAck("ack"));
		});

		const transport = transportFor({ projectDir, runtimeDir, ownToken: "token-1", chain: ["token-0"] });
		expect(await transport.deliver("BlueLake", "relayed")).toEqual({ outcome: "persisted" });

		const message = received.find(v => (v as { kind?: string }).kind === "message");
		// Extended, not replaced: the hop the message arrived with is still on the frame.
		expect((message as { chain?: readonly string[] }).chain).toEqual(["token-0", "token-1"]);
	});

	it("omits the chain entirely when the session has no token", async () => {
		// "Direct" and "passed through an unnamed hop" must not be the same wire value — the
		// receiver distinguishes them, so the field has to be absent rather than empty.
		const { projectDir, endpoint, runtimeDir } = await socketPair();
		const received: unknown[] = [];
		await serve(endpoint, (value, socket) => {
			received.push(value);
			if ((value as { kind?: string }).kind === "message") socket.write(encodeAck("ack"));
		});

		const transport = transportFor({ projectDir, runtimeDir });
		await transport.deliver("BlueLake", "direct");
		const message = received.find(v => (v as { kind?: string }).kind === "message") as Record<string, unknown>;
		expect("chain" in message).toBe(false);
	});
});

/**
 * §18.7 row 3 — "the endpoint is never read from an envelope".
 *
 * ## Why this needed a test when the property already holds
 *
 * It holds structurally, and reading the code is enough to see it: `createPeerSocketTransport`
 * computes `endpoint` once from `deps` (`send.ts:202`) and `sendFrame(endpoint, frame)` takes
 * the address as a parameter *separate from* the frame. No function receives both an address
 * and an envelope and reads one out of the other. So `body.to` is not "untrusted input that
 * happens to be ignored" — it is not an input to addressing at all.
 *
 * That is exactly why it needs the test. "Holds by construction" is a statement about today's
 * `deliver`, and the plausible edit — route by `target`, or map it through `peerEndpoint` —
 * is a two-line change that no typecheck and no existing row would object to. All nine rows
 * above bind ONE endpoint and deliver to ONE target, so a transport that read the address off
 * the envelope would still pass every one of them.
 *
 * ## The property, stated so a mutation cannot satisfy it by accident
 *
 * The target is **data**; the address is **not**. Both halves are asserted, because either
 * alone is satisfiable by a broken transport: a row proving only "the other endpoint got
 * nothing" passes for a transport that discarded `to` outright, and a row proving only "`to`
 * survived" passes for one that routes by it. Together they say the target crossed the wire
 * as content AND the socket was chosen before the envelope existed.
 *
 * `from` is the other half of the plan's wording, and it is unreachable from the API rather
 * than merely unchecked: `deliver(target, message)` takes no sender, so the only `from` that
 * can be stamped is this session's. Asserted, because a `from` sourced from the body would be
 * an attribution forgery and the type signature is the only thing currently preventing it.
 */
describe("the endpoint is derived, never read from the envelope", () => {
	it("delivers to the derived socket even when the target is another project's address", async () => {
		const home = await socketPair();
		const elsewhere = await socketPair();
		const homeFrames: unknown[] = [];
		const elsewhereFrames: unknown[] = [];
		const routedFrames: unknown[] = [];
		const acking = (frames: unknown[]) => (value: unknown, socket: net.Socket) => {
			frames.push(value);
			if ((value as { kind?: string }).kind === "message") socket.write(encodeAck("ack"));
		};

		// A listener on the address a transport that ROUTES BY TARGET would reach, bound and
		// acknowledging on purpose. A wrong implementation has to be able to DELIVER for this row
		// to mean anything: pointed at a dead path it dies of "nothing was listening", which
		// every delivery path dies of and which therefore says nothing about where the address
		// came from. The first version of this row made exactly that mistake, and the mutation
		// it chose killed all three rows — a fact about the mutation, not about the rows.
		const routed = path.join(elsewhere.projectDir, "routed-by-target");
		await serve(home.endpoint, acking(homeFrames));
		await serve(elsewhere.endpoint, acking(elsewhereFrames));
		await serve(routed, acking(routedFrames));

		// The transport is bound to `home`. The target is a full socket path the sender does not
		// own, which is the hostile reading of the field: if any part of the call is treated as
		// an address, this is the string that would supply it.
		const outcome = await transportFor({ projectDir: home.projectDir, runtimeDir: home.runtimeDir }).deliver(
			routed,
			"not for you",
		);

		// Delivered — to the socket this transport was BUILT with, so the hostile target changed
		// nothing about where the bytes go.
		expect(outcome).toEqual({ outcome: "persisted" });
		const homeMessage = homeFrames.find(v => (v as { kind?: string }).kind === "message");
		// `from` is deliberately NOT asserted here: attribution is the next row's subject, and
		// a row that checked it too would die to the same mutation as that row, leaving neither
		// able to say which half of the property had broken.
		expect(homeMessage).toMatchObject({ kind: "message", body: { to: routed } });

		// The target still crossed the wire verbatim. Without this the row would also pass for a
		// transport that dropped `to` — a DIFFERENT defect, since the receiver filters on it.
		expect((homeMessage as { body: { message: string } }).body.message).toBe("not for you");

		// And neither the other project nor the address the target named heard anything, not
		// even the `hello`. This is what the row exists for: the redirect did not happen.
		expect(elsewhereFrames).toEqual([]);
		expect(routedFrames).toEqual([]);
	});

	it("stamps its own id, so no field in the call can attribute a message to someone else", async () => {
		// The plan's "forged `from`". `deliver` accepts no sender, so the frame's `from` is
		// `deps.selfId` by construction — asserted because the type signature is the ONLY thing
		// currently stopping a `from` read out of the body, and a signature is not a defence that
		// survives someone widening the parameter list.
		const { projectDir, endpoint, runtimeDir } = await socketPair();
		const received: unknown[] = [];
		await serve(endpoint, (value, socket) => {
			received.push(value);
			if ((value as { kind?: string }).kind === "message") socket.write(encodeAck("ack"));
		});

		await transportFor({ projectDir, runtimeDir, selfId: "ActualSelf" }).deliver("BlueLake", "trust me");

		const message = received.find(v => (v as { kind?: string }).kind === "message");
		expect(message).toMatchObject({ from: "ActualSelf" });
		// `from` appears once, at the top level, and nowhere the receiver could mistake it.
		expect(message).not.toMatchObject({ body: { from: expect.anything() } });
	});

	it("puts no address on the wire, so there is nothing for a receiver to honour", async () => {
		// The forward-looking half. The rows above prove today's `deliver` ignores the envelope
		// when choosing a socket; this proves there is nothing in the envelope that a FUTURE
		// receiver could start honouring. Adding an endpoint field "for debugging" is a small,
		// well-intentioned change that converts this transport's one honest guarantee into a
		// suggestion, so the absence is pinned as a wire contract.
		//
		// Asserted as the exact key set, not `not.toHaveProperty`: the framing IS a protocol
		// with a peer on the other end, so its shape is exactly the kind of exact-bytes contract
		// worth stating in full.
		const { projectDir, endpoint, runtimeDir } = await socketPair();
		const received: unknown[] = [];
		await serve(endpoint, (value, socket) => {
			received.push(value);
			if ((value as { kind?: string }).kind === "message") socket.write(encodeAck("ack"));
		});

		await transportFor({ projectDir, runtimeDir }).deliver("BlueLake", "where does this go?");

		const message = received.find(v => (v as { kind?: string }).kind === "message") as Record<string, unknown>;
		expect(Object.keys(message).sort()).toEqual(["body", "from", "kind"]);
		// Nor nested under the body, which is where a debugging field would actually go.
		expect(Object.keys(message.body as Record<string, unknown>).sort()).toEqual(["message", "to"]);
	});
});

/** Frame an arbitrary value the way the receiver would send it. */
function encodeFrame(value: unknown): Buffer {
	const payload = Buffer.from(JSON.stringify(value), "utf8");
	const out = Buffer.allocUnsafe(4 + payload.length);
	out.writeUInt32BE(payload.length, 0);
	payload.copy(out, 4);
	return out;
}

/** A minimal ack frame, framed the same way the receiver would send one. */
function encodeAck(kind: string): Buffer {
	const payload = Buffer.from(JSON.stringify({ kind, from: "BlueLake", upto: 1 }), "utf8");
	const out = Buffer.allocUnsafe(4 + payload.length);
	out.writeUInt32BE(payload.length, 0);
	payload.copy(out, 4);
	return out;
}

// The timeout is the upper bound on every silent-peer row, so a regression that stops
// waiting for an ack shows up as a slow suite rather than an invisible pass.
describe("the acknowledgement wait is bounded", () => {
	it("declares a finite budget rather than waiting forever", () => {
		// A send with no timeout is a session that cannot be interrupted. Asserted as a value
		// because the two silent-peer rows already prove the wait happens; this proves it ends.
		expect(PEER_SEND_TIMEOUT_MS).toBeGreaterThan(0);
		expect(PEER_SEND_TIMEOUT_MS).toBeLessThan(60_000);
	});
});
