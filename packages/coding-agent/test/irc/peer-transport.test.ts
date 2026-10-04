/**
 * Contracts for the peer transport seam.
 *
 * Each test names the failure a user would observe. The seam exists because
 * `#87501` shipped `success: true` for a message nobody received, and three
 * Windows bugs share that shape — so most of these defend against a transport
 * *lying*, which is the failure mode a replaceable seam makes easier to write.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { AgentRegistry } from "../../src/registry/agent-registry";
import { IrcBus } from "../../src/irc/bus";
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
	// The ownership rows below register under their own ids. The seam's registry is
	// module-level and outlives a single row, so an id that is not unregistered here
	// decides the NEXT row's answer — the first version of the ownership row left
	// `ext-A` registered and turned three unrelated rows red.
	removePeerTransport("ext-A");
	removePeerTransport("ext-B");
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

	test("the first-registered id keeps the process on reload, and serves the NEW transport", () => {
		// WHY THIS ROW — the contract, and why nothing else holds it.
		//
		// `resolvePeerTransport` takes `overrides.values().next().value`: the FIRST
		// registration owns the process, and a later distinct id does not displace it.
		// That is deliberate — a peer has one bus, and an extension reloading under its
		// own id must keep the slot it already won rather than lose it to whoever
		// registered second.
		//
		// The half that is easy to lose is the object. `Map.set` on an existing key
		// REPLACES the value while KEEPING the original insertion position, so a
		// re-registration lands in the same slot with a different transport — the new
		// code serves, under the old id's priority. That is the whole point of a
		// reload, and it is a consequence of `Map` semantics rather than of any line
		// anyone wrote, so nothing in the suite defended it: a refactor swapping
		// `.next().value` for "iterate and take the last" would keep every other row
		// green (single-registration rows still pass; an all-unregistered registry
		// still resolves to `undefined`) while silently INVERTING reload.
		//
		// Identity, not id: comparing `?.id` would pass even if the resolver kept
		// serving the stale object, which is the actual regression.
		addPeerTransport(transport({ id: "ext-A" }));
		addPeerTransport(transport({ id: "ext-B" }));

		// The control. Without it, a resolver that returned the LAST entry would
		// satisfy the assertion below and this row would prove nothing.
		expect(resolvePeerTransport()?.id).toBe("ext-A");

		const reloaded = transport({ id: "ext-A" });
		addPeerTransport(reloaded);

		expect(resolvePeerTransport()?.id).toBe("ext-A");
		expect(resolvePeerTransport()).toBe(reloaded);
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

/**
 * The seam is only real if the bus reaches it.
 *
 * Every row above exercises `deliverPeerMessage` directly, which is exactly why
 * the gap was invisible: `deliverPeerMessage` had eight test call sites and no
 * production one, and `bus.ts` did not import `peer-transport` at all. A seam
 * with a green suite and no caller is a registry that grew, not a seam that
 * binds — so these rows drive `IrcBus.send`, which is where the wiring either
 * exists or does not.
 */
describe("bus wiring", () => {
	function makeBus() {
		const agents = new AgentRegistry();
		return { agents, irc: new IrcBus(agents) };
	}

	test("a message for an agent this bus does not own reaches the transport", async () => {
		// WHY THIS ROW — the contract. The failure it defends: a peer session runs
		// in another process, so it is absent from this bus's registry, and the
		// bus answered every such send with "Unknown agent" while an installed
		// transport sat unused. The transport's own `deliver` is the observer here,
		// not the receipt, so this row proves the CALL and not the mapping.
		const seen: Array<{ to: string; message: string }> = [];
		addPeerTransport(
			transport({
				id: "test",
				deliver: async (to: string, message: string) => {
					seen.push({ to, message });
					return { outcome: "injected" };
				},
			}),
		);

		const { irc } = makeBus();
		const receipt = await irc.send({ from: "Main", to: "far-peer", body: "ping" });

		expect(seen).toEqual([{ to: "far-peer", message: "ping" }]);
		expect(receipt.outcome).toBe("injected");
	});

	test("a durable hand-off reports `persisted`, never `injected`", async () => {
		// WHY THIS ROW — the #87501 guard, at the layer a reader actually sees.
		// `deliverPeerMessage` already refuses a transport that claims `injected`
		// without `injects`, but a DURABLE transport legitimately reports
		// `persisted`, and the receipt had nowhere to put that. Folding it into
		// `injected` is the exact "success for a message nobody read" shape the
		// seam's own docblock names as the bug it exists to prevent — so the
		// receipt carries a distinct member and the transport's word survives.
		addPeerTransport(
			transport({
				id: "test",
				capabilities: { crossProcess: true, durable: true, injects: false },
				deliver: async () => ({ outcome: "persisted" }),
			}),
		);

		const { irc } = makeBus();
		const receipt = await irc.send({ from: "Main", to: "far-peer", body: "ping" });

		expect(receipt.outcome).toBe("persisted");
		// The negative half, stated so a future widening cannot quietly erase it.
		expect(receipt.outcome).not.toBe("injected");
	});

	test("a transport that throws rejects the send with its own error", async () => {
		// WHY THIS ROW — and it is the only rejection assertion in test/irc/, which is
		// why the directory could claim a tested seam while its error path went
		// uncovered. A transport RETURNING `{outcome:"refused"}` is a delivery
		// decision, and the roster hint is the right answer to it. A transport that
		// THROWS is a bug in the transport, and `#deliverViaTransport`'s own docblock
		// says why that must stay distinguishable: rewritten into a refusal it becomes
		// "unknown agent — the one diagnosis the sender cannot act on", which is
		// #87501's shape (success for a message nobody received) arriving by the back
		// door. One line of `.catch(() => ({outcome:"refused", cause:"rejected"}))` on
		// `transport.deliver(...)` turned this error into silence and passed 305 tests.
		addPeerTransport(
			transport({
				id: "test",
				deliver: async () => {
					throw new Error("TRANSPORT BLEW UP");
				},
			}),
		);

		const { irc } = makeBus();

		let caught: unknown;
		try {
			await irc.send({ from: "Main", to: "far-peer", body: "ping" });
		} catch (err) {
			caught = err;
		}
		// Rejected, not resolved: a resolved send here would be a silent success.
		expect(caught).toBeInstanceOf(Error);
		const message = caught instanceof Error ? caught.message : String(caught);
		// The transport's own words survive, so whoever installed it can act on them.
		expect(message).toBe("TRANSPORT BLEW UP");
		// …and it was not rewritten into the diagnosis the sender cannot act on.
		expect(message).not.toContain("Unknown agent");
	});

	test("registering a transport does not intercept an agent this bus owns", async () => {
		// WHY THIS ROW — the precedence contract. Without it, any extension that
		// registers a transport would silently take over delivery for LOCAL peers,
		// which is neither documented nor reversible from the sender's side. The
		// registry owns its agents; the transport is for the ones it does not have.
		let consulted = 0;
		addPeerTransport(
			transport({
				id: "test",
				deliver: async () => {
					consulted++;
					return { outcome: "injected" };
				},
			}),
		);

		const { agents, irc } = makeBus();
		agents.register({
			id: "local",
			displayName: "local",
			kind: "sub",
			parentId: "Main",
			// No live session: the send fails, and that is the point. The assertion
			// is that the transport was never asked, so the local path is proven
			// without standing up a full session fixture to receive the message.
			session: null,
			sessionFile: null,
			status: "running",
		});

		const receipt = await irc.send({ from: "Main", to: "local", body: "ping" });

		expect(consulted).toBe(0);
		// And the failure is the local one, not a transport outcome.
		expect(receipt.outcome).toBe("failed");
	});

	test("a transport refusal falls through to the roster hint", async () => {
		// WHY THIS ROW — the fall-through contract. `deliverPeerMessage` refuses
		// whenever the transport declines, and `no-route` (nothing registered) is
		// the COMMON case. Reporting the refusal would replace the actionable
		// roster hint with transport vocabulary nobody can act on.
		//
		// The refusal is produced EXPLICITLY rather than by registering nothing.
		// `setBuiltinPeerTransport` writes a module-level `builtinTransport` that
		// `removePeerTransport` cannot clear — it only deletes from the override
		// map — so an earlier row in this file has already installed one and "no
		// transport at all" is not a state this file can reach. Asserting the
		// unreachable state would be a row that passes for the wrong reason.
		// (Reported to peers as its own finding.)
		addPeerTransport(
			transport({
				id: "test",
				deliver: async () => ({ outcome: "refused", cause: "peer-unregistered" }),
			}),
		);

		const { irc } = makeBus();
		const receipt = await irc.send({ from: "Main", to: "nobody", body: "ping" });

		expect(receipt.outcome).toBe("failed");
		expect(receipt.error).toContain("Unknown agent");
		// The transport's own vocabulary must not leak into the roster error.
		expect(receipt.error).not.toContain("peer-unregistered");
	});
});
