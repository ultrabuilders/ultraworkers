/**
 * Contracts for the peer transport seam.
 *
 * Each test names the failure a user would observe. The seam exists because
 * `#87501` shipped `success: true` for a message nobody received, and three
 * Windows bugs share that shape — so most of these defend against a transport
 * *lying*, which is the failure mode a replaceable seam makes easier to write.
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
	PEER_TRANSPORT_PROTOCOL_VERSION,
	PeerTransportProtocolMismatch,
	addPeerLockBackend,
	addPeerTransport,
	deliverPeerMessage,
	removePeerTransport,
	resolvePeerTransport,
	setBuiltinPeerTransport,
	shouldAdmitPeerLock,
	unreadUnavailableReason,
} from "../../src/irc/peer-transport";
import type { PeerTransport, TransportOutcome } from "../../src/irc/peer-transport";

afterEach(() => {
	removePeerTransport("test");
	removePeerTransport("builtin");
});

function transport(over: Partial<PeerTransport> & Pick<PeerTransport, "id">): PeerTransport {
	return {
		protocolVersion: PEER_TRANSPORT_PROTOCOL_VERSION,
		capabilities: { crossProcess: true, durable: true, injects: true },
		deliver: async () => ({ outcome: "injected" }),
		...over,
	};
}

describe("registration", () => {
	test("a protocol mismatch is refused at registration, not at send", async () => {
		// The failure this defends: skew surfaces later as `Unknown client message
		// type: presence` and a dead socket, long after the cause. `pi-peer-messaging`
		// has no handshake and fails exactly this way.
		expect(() => addPeerTransport(transport({ id: "test", protocolVersion: 99 }))).toThrow(
			PeerTransportProtocolMismatch,
		);
		// And nothing was installed by the failed attempt.
		expect(resolvePeerTransport()).toBeUndefined();
	});

	test("unregistering an override restores the built-in", async () => {
		// The failure this defends: "full custom" with no defined exit leaves the
		// user with no way back to the transport that worked before.
		setBuiltinPeerTransport(transport({ id: "builtin" }));
		expect(resolvePeerTransport()?.id).toBe("builtin");

		addPeerTransport(transport({ id: "test" }));
		expect(resolvePeerTransport()?.id).toBe("test");

		removePeerTransport("test");
		expect(resolvePeerTransport()?.id).toBe("builtin");
	});
});

describe("capability enforcement", () => {
	test("a non-injecting transport cannot claim delivery", async () => {
		// The failure this defends: `injects: false` with an `injected` outcome is
		// #87501 verbatim — the message sits in a socket and never reaches a
		// transcript, while the sender is told it arrived.
		addPeerTransport(
			transport({
				id: "test",
				capabilities: { crossProcess: true, durable: true, injects: false },
				deliver: async (): Promise<TransportOutcome> => ({ outcome: "injected" }),
			}),
		);

		const result = await deliverPeerMessage("BlueLake", "hi");

		expect(result.outcome).toBe("refused");
		if (result.outcome !== "refused") throw new Error("unreachable");
		expect(result.cause).toBe("capability-missing");
	});

	test("a non-durable transport explains why unread is empty", async () => {
		// The failure this defends: an empty unread array reads as "no peer has
		// written to you" when the truth is "nothing can reach you yet".
		addPeerTransport(
			transport({
				id: "test",
				capabilities: { crossProcess: true, durable: false, injects: true },
				deliver: async (): Promise<TransportOutcome> => ({ outcome: "persisted" }),
			}),
		);

		expect(unreadUnavailableReason()).toContain("durable: false");
		expect(await deliverPeerMessage("BlueLake", "hi")).toMatchObject({
			outcome: "refused",
			cause: "capability-missing",
		});
	});

	test("a durable transport reports no reason to explain", async () => {
		// Guards the other direction: a permanent excuse would train callers to
		// ignore the field, which is the same silence by another route.
		addPeerTransport(transport({ id: "test" }));
		expect(unreadUnavailableReason()).toBeUndefined();
	});
});

describe("lock backend", () => {
	test("core still owns the decision; the backend only unblocks a refusal", async () => {
		// The failure this defends: a backend consulted BEFORE core decides would
		// hand locking to the extension, which is the wrong division of labour —
		// extensions say "this file is fine on my machine", not "I'll do the locking".
		addPeerLockBackend({ id: "b", shouldAdmit: () => true });
		expect(shouldAdmitPeerLock("src/**")).toBe(true);

		const off = addPeerLockBackend({ id: "c", shouldAdmit: () => false });
		expect(shouldAdmitPeerLock("src/**")).toBe(true);
		off();
	});
});
