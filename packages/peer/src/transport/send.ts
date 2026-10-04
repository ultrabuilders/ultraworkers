/**
 * The sending half of the peer transport — the one thing `transport/` was missing.
 *
 * ## What was measured before this file existed
 *
 * `packages/peer/src/transport/endpoint.ts` has exactly two socket-creating lines, and
 * neither can send a message:
 *
 * ```
 * 84:  [probeStale]      const sock = net.createConnection({ path: endpoint });
 * 125: [listenOnEndpoint] const server = net.createServer(handler);
 * ```
 *
 * Line 84 is the trap that cost a wrong report. It really is a `net.createConnection`, so a
 * grep for it looks like a client — but `probeStale` resolves `"in_use" | "stale"`, destroys
 * the socket in `finish()` and hands back a string. It asks whether an endpoint is held; it
 * never writes a byte. Reading one line proved the opposite of what the line is inside.
 *
 * So the directory had a **server** and a **probe**, and no client.
 *
 * ## Two things are missing, and this file is only one of them
 *
 * 1. **The client** — supplied here.
 * 2. **An installer** — *not* supplied here, and deliberately so. `deliverPeerMessage`
 *    (`irc/peer-transport.ts:155`) resolves a transport, finds none installed, and returns
 *    `refused/no-route`. Core not installing one is the **contract**, not a hole: this
 *    program's test is that an extension written outside the repo registers a transport
 *    without a line of core changing, so an empty registry is the correct starting state.
 *    See `setBuiltinPeerTransport`'s docblock in `irc/peer-transport.ts`.
 *
 * ⇒ Until someone calls `setBuiltinPeerTransport` or `addPeerTransport`, this file is a
 * **built part, not a running feature**. That is deliberate; it is not wired and does not
 * claim to be.
 *
 * ## There are TWO transport registries, and this one is not the bus's
 *
 * Measured, because getting it wrong produces a client nobody can reach:
 *
 * | module | consulted by |
 * | --- | --- |
 * | `coding-agent/src/irc/peer-transport.ts:93` | `deliverPeerMessage` — **the bus reads this one** |
 * | `packages/peer/src/seam/transport.ts:169` | nothing on the delivery path |
 *
 * `ExtensionAPI.registerPeerTransport` (`loader.ts:336`) pushes into the extension's own
 * `peerTransports` array, and `runner.ts:1324` hands those to the **coding-agent** module's
 * `addPeerTransport`. The `packages/peer` copy keeps its own `builtin` and `overrides`, and
 * nothing on the delivery path reads them.
 *
 * ⇒ This file implements the **host** interface, imported from
 * `@oh-my-pi/pi-coding-agent/irc/peer-transport`, not the structurally identical one in
 * `../seam/transport`. A `PeerTransport` typed against the peer's copy would satisfy its own
 * TypeScript and never be reachable from `deliverPeerMessage` — a green typecheck proving
 * nothing, which is the failure mode this whole file is about.
 *
 * ## Why this lives in `packages/peer` and not in core
 *
 * Core cannot import `@ultraworkers/peer` (the dependency runs peer → coding-agent), and this
 * file needs `encodeFrame`, `peerEndpoint` and `MAX_FRAME_BYTES` — all of which are already
 * here. The types are imported, not the values, so the cycle stays a type edge. Implementing
 * the transport here rather than in core also leaves `registerPeerTransport` meaningful: a host
 * that wants different wire behaviour registers its own and this one is never installed.
 *
 * ## Why `persisted`, never `injected`
 *
 * `peer-transport.ts:24-27` records why the outcome vocabulary is graded: Claude Code §15.1
 * had a `success: true` for a message that was never received, and because every send reported
 * success no fallback could ever fire. A socket write proves the bytes left this process. It
 * proves nothing about what the far side did with them — the receiver may have died between
 * connect and read, or refused at its own fence. So this transport declares `durable: false,
 * injects: false` and returns `persisted` only when the peer acknowledges the frame.
 *
 * ## The acknowledgement is the whole contract
 *
 * An unacknowledged write is `refused`, not `persisted`. `sendFrame` waits for an `ack` frame
 * naming the sequence, so a peer that dies mid-flight surfaces as `refused/no-route` — the
 * sender can act on that, which is the entire point of the graded vocabulary.
 */

import * as net from "node:net";
import type {
	PeerTransport,
	PeerTransportCapabilities,
	TransportOutcome,
} from "@oh-my-pi/pi-coding-agent/irc/peer-transport";
import { PEER_TRANSPORT_PROTOCOL_VERSION } from "@oh-my-pi/pi-coding-agent/irc/peer-transport";
import { encodeFrame, decodeFrames, extendChain, isFrameOfKind, type PeerFrame } from "./framing";
import { peerEndpoint } from "./endpoint";

/**
 * How long a connect+send+ack may take before the sender is told it failed.
 *
 * Bounded because the alternative is a send that never returns, and a session waiting on a
 * peer message is a session that cannot be interrupted. Generous enough for a busy machine to
 * schedule the far side, short enough that a wedged peer is reported rather than waited on.
 */
export const PEER_SEND_TIMEOUT_MS = 10_000;

/** What this transport needs from the host to find the far side. */
export interface PeerSocketTransportDeps {
	/** Absolute path of the project both sessions share — the endpoint key on Windows. */
	readonly projectDir: string;
	/** Per-user runtime directory holding `peer.sock` on POSIX. */
	readonly runtimeDir: string;
	/** This session's own name; the frame's `from`. */
	readonly selfId: string;
	/** This session's relay token, appended to the chain. Empty means "direct, unchained". */
	readonly ownToken?: string;
	/** The chain this session received the message with, so a relay extends rather than resets it. */
	readonly chain?: readonly string[];
}

/**
 * Capabilities this transport can honestly claim.
 *
 * `durable` and `injects` are both **false**, and `deliverPeerMessage` enforces that claim
 * against the returned outcome (`peer-transport.ts:167-177`) — so a future change that starts
 * reporting `persisted` without a real durable write is caught at the boundary rather than by
 * a user noticing a lost message.
 */
const CAPABILITIES: PeerTransportCapabilities = {
	crossProcess: true,
	durable: false,
	injects: false,
};

/** Raised by {@link sendFrame}; the caller maps it onto the transport's refusal vocabulary. */
export class PeerSendError extends Error {
	/** Named `refusal` rather than `cause`: `Error.cause` already exists, and shadowing it
	 * needs an `override` modifier that would say nothing useful about this class. */
	constructor(
		readonly refusal: "no-route" | "capability-missing",
		message: string,
	) {
		super(message);
		this.name = "PeerSendError";
	}
}

/**
 * Write one frame and wait for its acknowledgement.
 *
 * The wait is the contract, not a nicety: a write that returns before the peer answers would
 * make `deliver` report success for a message nobody read, which is the §15.1 shape this
 * transport was written to avoid.
 */
async function sendFrame(endpoint: string, frame: PeerFrame): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const socket = net.createConnection({ path: endpoint });
		let settled = false;
		// Both outcomes go through here so the socket is closed exactly once — a resolved
		// promise that leaves a live socket keeps the process (and the endpoint) held.
		const finish = (error: Error | undefined): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			socket.destroy();
			if (error === undefined) resolve();
			else reject(error);
		};

		const timer = setTimeout(
			() => finish(new PeerSendError("no-route", `peer did not acknowledge within ${PEER_SEND_TIMEOUT_MS}ms`)),
			PEER_SEND_TIMEOUT_MS,
		);

		socket.once("error", error => finish(new PeerSendError("no-route", `peer socket failed: ${error.message}`)));
		socket.once("connect", () => {
			socket.write(encodeFrame({ kind: "hello", from: frame.from }));
			socket.write(encodeFrame(frame));
		});
		// Only an `ack` settles the exchange; every other frame is ignored and the wait
		// continues. A peer that answers the `hello` handshake with a `hello` or a `notice`
		// of its own before acknowledging is behaving correctly, and failing the send on
		// the first unexpected frame would report a delivered message as lost. The timeout
		// is what bounds a peer that never acknowledges at all.
		//
		// Decoded with the project's own decoder rather than searched as text: a substring
		// test for `"ack"` matches a message BODY that happens to contain it, which would
		// report an unacknowledged send as delivered — the §15.1 shape this transport
		// exists to avoid.
		let buffered: Buffer = Buffer.alloc(0);
		socket.on("data", chunk => {
			buffered = Buffer.concat([buffered, chunk as Buffer]);
			const { frames, rest } = decodeFrames(buffered);
			buffered = rest;
			for (const frame of frames) {
				if (!frame.ok) continue;
				if (isFrameOfKind(frame.value, "ack")) finish(undefined);
			}
		});
	});
}

/**
 * A `PeerTransport` that reaches a peer's socket.
 *
 * Returned by {@link createPeerSocketTransport} rather than exported as a singleton so the
 * host owns its lifetime: a transport bound to one session's runtime dir must not outlive
 * that session, and a module-level instance would.
 */
export function createPeerSocketTransport(deps: PeerSocketTransportDeps): PeerTransport {
	const endpoint = peerEndpoint(deps.projectDir, deps.runtimeDir);
	return {
		id: "peer-socket",
		protocolVersion: PEER_TRANSPORT_PROTOCOL_VERSION,
		capabilities: CAPABILITIES,
		async deliver(target: string, message: string): Promise<TransportOutcome> {
			// `target` does NOT route. The endpoint is `peerEndpoint(projectDir, runtimeDir)`
			// — `runtimeDir` is `getDaemonRuntimeDir(projectDir)`, one hashed directory per
			// project — so every target in a project shares one socket and `to` travels as body
			// metadata for the receiver to filter on. That is forced, not chosen: `listenOnEndpoint`
			// throws `"peer endpoint in use"` when the endpoint is already held, so a project has
			// at most ONE listener and it must fan out itself. A per-target endpoint would need
			// `target` in `peerEndpoint`, and no such key exists.
			// The chain is what lets the receiver's loop bound tell "this came back to me" from
			// "this went deep", so a relayed message carries the hop it arrived with.
			//
			// `extendChain` builds it — NOT a second copy of the append. It has to stay the one
			// implementation: a receiver comparing against tokens it recognises as its own is
			// reading this exact sequence, and a fork here could order it differently.
			//
			// The field is omitted rather than sent empty when there is no token of ours, because
			// "direct" and "passed through an unnamed hop" must not be the same wire value —
			// `extendChain` returns `[]` for the nameless case, and the caller decides that an
			// empty chain is not a chain at all.
			const relayChain = extendChain(deps.chain, deps.ownToken ?? "");
			const frame: PeerFrame = {
				kind: "message",
				from: deps.selfId,
				body: { to: target, message },
				...(deps.ownToken !== undefined && deps.ownToken !== "" ? { chain: relayChain } : {}),
			};
			try {
				await sendFrame(endpoint, frame);
			} catch (error) {
				if (error instanceof PeerSendError) {
					return { outcome: "refused", cause: error.refusal, detail: error.message };
				}
				throw error;
			}
			// Acknowledged, so the bytes landed in the far side's socket — not yet in a
			// transcript, and this transport cannot know that. `persisted` is the honest word.
			return { outcome: "persisted" };
		},
	};
}
