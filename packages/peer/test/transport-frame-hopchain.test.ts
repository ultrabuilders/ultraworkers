import { describe, expect, it } from "bun:test";
import { checkHopChain, fenceInbound, HOP_CHAIN_MAX_SELF, type InboundReceiver } from "../src/fence/index";
import { decodeFrames, encodeFrame, extendChain, type PeerFrame } from "../src/transport/framing";

/**
 * The fence's chain check needs the chain to actually ARRIVE.
 *
 * `checkHopChain` is only as good as the wire: a `PeerFrame` with no `chain` field
 * makes every message look direct, and a loop that returns to the same session ten
 * times reads as a fresh message at every hop. These rows are about the frame and
 * the chain-building, driven through the real encode/decode path so a field that
 * is declared but never serialised cannot pass.
 */

function receiver(overrides: Partial<InboundReceiver> = {}): InboundReceiver {
	return { mode: "default", policy: "accept", ownTokens: new Set(["me"]), ...overrides };
}

/** Encode and decode, so a field absent from the wire fails rather than passing on the type. */
function roundTrip(frame: PeerFrame): PeerFrame {
	const decoded = decodeFrames(encodeFrame(frame));
	const value = decoded.frames[0];
	if (value === undefined || !value.ok) throw new Error(`frame failed to round-trip: ${String(value)}`);
	return value.value as PeerFrame;
}

describe("the relay chain on the wire", () => {
	it("survives encode and decode intact", () => {
		// The rows below are about a loop being caught, and a loop cannot be caught if
		// the chain does not survive serialisation. Asserted on the real round trip
		// rather than on the object, because a `PeerFrame` literal satisfies the type
		// whether or not JSON carries the field.
		const chain = ["a", "b", "c"];
		const decoded = roundTrip({ kind: "message", from: "RedStone", body: "hi", chain });
		expect(decoded.chain).toEqual(chain);
	});

	it("carries the sender's asserted mode across the wire", () => {
		const decoded = roundTrip({ kind: "message", from: "RedStone", body: "hi", fromMode: "bypassPermissions" });
		expect(decoded.fromMode).toBe("bypassPermissions");
	});

	it("stays absent for a direct message, so direct and relayed cannot be confused", () => {
		const decoded = roundTrip({ kind: "message", from: "RedStone", body: "hi" });
		expect(decoded.chain).toBeUndefined();
		expect(decoded.fromMode).toBeUndefined();
	});

	it("appends the sending session's own token when relaying onward", () => {
		// The binary builds the outgoing chain by appending the sender's token. Without
		// that append the next hop cannot recognise a message that has already been
		// here, which is the entire self-hop count.
		expect(extendChain(undefined, "me")).toEqual(["me"]);
		expect(extendChain(["a"], "me")).toEqual(["a", "me"]);
		// Relaying twice grows the chain, so depth is visible to the far end.
		expect(extendChain(extendChain(undefined, "a"), "b")).toEqual(["a", "b"]);
	});

	it("does not invent a hop for a session with no token", () => {
		// An empty token must not become a `""` entry: a chain of anonymous hops would
		// grow toward the length bound while being unable to trigger the self-hop count,
		// which is precisely the loop that check exists to stop.
		expect(extendChain(undefined, "")).toEqual([]);
		expect(extendChain(["a"], "")).toEqual(["a"]);
	});

	it("lets the fence catch a loop that actually arrived over the wire", () => {
		// The end-to-end row, and the one a depth counter cannot pass: the chain is
		// `HOP_CHAIN_MAX_SELF` entries long — comfortably UNDER the length bound — and
		// every one of them is this session's own token, so it trips the self-hop count
		// instead. Framed, decoded, and fed to the fence, so a `chain` field that was
		// declared but never serialised would fail here rather than passing on the type.
		const looped = Array<string>(HOP_CHAIN_MAX_SELF).fill("me");
		const arrived = roundTrip({ kind: "message", from: "RedStone", body: "hi", chain: looped });

		expect(arrived.chain).toHaveLength(HOP_CHAIN_MAX_SELF);
		expect(arrived.chain!.length).toBeLessThan(28);

		const decided = fenceInbound({ from: "RedStone", chain: arrived.chain }, receiver());
		expect(decided.action).toBe("refuse");
		if (decided.action !== "refuse") throw new Error("expected a refusal");
		expect(decided.cause).toBe("hop-loop");
	});

	it("admits a chain of the same length that never returns to this session", () => {
		// The control for the row above, and the reason the two bounds are separate
		// numbers rather than one. Same length, same wire path, no self-visits — a
		// fence that refused on depth alone would fail this.
		const throughOthers = Array<string>(HOP_CHAIN_MAX_SELF).fill("someone-else");
		const arrived = roundTrip({ kind: "message", from: "RedStone", body: "hi", chain: throughOthers });

		expect(checkHopChain(arrived.chain ?? [], new Set(["me"]))).toEqual({});
		expect(fenceInbound({ from: "RedStone", chain: arrived.chain }, receiver())).toEqual({ action: "accept" });
	});
});
