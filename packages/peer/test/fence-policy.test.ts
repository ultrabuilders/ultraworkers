import { describe, expect, it } from "bun:test";
import { INBOUND_POLICIES } from "../src/fence/index";
import { isInboundPolicy, resolveInboundPolicy, type PolicyLayer } from "../src/fence/policy";

/**
 * `crossSessionInbound` resolution across settings sources.
 *
 * The failures here are all user-invisible until they are not: a repo setting
 * that loosens your `refuse`, a typo that resolves to a default, and an unset
 * key that quietly means `accept` each produce a session that admits messages
 * the user believed were guarded.
 */

function layers(...entries: PolicyLayer[]): PolicyLayer[] {
	return entries;
}

describe("isInboundPolicy", () => {
	it("accepts the three real values", () => {
		for (const value of INBOUND_POLICIES) expect(isInboundPolicy(value)).toBe(true);
	});

	it("rejects an inherited Object property that merely shares the name of a key", () => {
		// The bug this row was written for. `value in INBOUND_RESTRICTIVENESS` walks
		// the prototype chain, so `"constructor"`, `"toString"` and `"valueOf"` all
		// answer true — and then `INBOUND_RESTRICTIVENESS[layer.value]` yields a
		// function, whose comparison against a number is `false`, so a settings file
		// saying `crossSessionInbound: "constructor"` would resolve to a policy that
		// is neither accept, hold nor refuse. In a module whose whole job is failing
		// closed on an unparseable value, that is the one input that must not get
		// through.
		for (const impostor of ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__", "refuse "]) {
			expect(isInboundPolicy(impostor)).toBe(false);
		}
	});
});

describe("resolveInboundPolicy", () => {
	it("leaves an absent key unset rather than defaulting it to accept", () => {
		// The distinction the whole module turns on. `undefined` is a real state: the
		// fence falls back to comparing permission classes, which holds into a
		// bypassing session. Shipping `"accept"` as a default would admit every peer
		// message on a fresh install by accident.
		expect(resolveInboundPolicy([])).toEqual({ value: undefined, source: undefined });
		expect(resolveInboundPolicy(layers({ source: "user", value: undefined }))).toEqual({
			value: undefined,
			source: undefined,
		});
	});

	it("takes the first layer that sets a value, most authoritative first", () => {
		// managed > flag > user. Stopping at the first setter is what makes the walk
		// predictable, and it is safe because the repo layer — the only one allowed to
		// disagree — is handled separately below.
		expect(
			resolveInboundPolicy(layers({ source: "user", value: "hold" }, { source: "managed", value: "refuse" })),
		).toEqual({
			value: "refuse",
			source: "managed",
		});
		expect(
			resolveInboundPolicy(layers({ source: "user", value: "refuse" }, { source: "flag", value: "accept" })),
		).toEqual({
			value: "accept",
			source: "flag",
		});
	});

	it("lets a repo setting tighten but never loosen", () => {
		// The property a freshly cloned repository would otherwise own: it can make
		// you stricter, and it cannot make you more permissive than you chose.
		const tightened = resolveInboundPolicy(
			layers({ source: "user", value: "accept" }, { source: "repo", value: "refuse" }),
		);
		expect(tightened).toEqual({ value: "refuse", source: "repo" });

		// The direction that matters. A repo saying `accept` against a user `refuse`
		// changes nothing, and the decision stays attributable to the user.
		const loosened = resolveInboundPolicy(
			layers({ source: "user", value: "refuse" }, { source: "repo", value: "accept" }),
		);
		expect(loosened).toEqual({ value: "refuse", source: "user" });
	});

	it("does not let a repo setting claim an org policy's equally-restrictive decision", () => {
		// Both say `refuse`, so the repo adds no restriction — but attributing it to
		// the repo would tell the user their own config is what is refusing, and
		// editing that config would change nothing.
		expect(
			resolveInboundPolicy(layers({ source: "managed", value: "refuse" }, { source: "repo", value: "refuse" })),
		).toEqual({
			value: "refuse",
			source: "managed",
		});
		// Against a non-org source the repo may claim it, since the user CAN edit that.
		expect(
			resolveInboundPolicy(layers({ source: "user", value: "refuse" }, { source: "repo", value: "refuse" })),
		).toEqual({
			value: "refuse",
			source: "repo",
		});
	});

	it("reports an unparseable value instead of resolving it to a default", () => {
		// A typo must not decide whether a peer message is delivered. The invalid entry
		// is surfaced with the offending value so the caller can warn with it; the
		// caller holds on seeing one, which is why this field exists at all.
		const resolved = resolveInboundPolicy(layers({ source: "user", value: "ask-me-later" }));
		expect(resolved.invalid).toEqual({ source: "user", value: "ask-me-later" });
		// And it is not silently promoted to a legal policy.
		expect(resolved.value).toBeUndefined();
		expect(isInboundPolicy(resolved.value)).toBe(false);
	});

	it("does not let an unparseable repo value resolve through the ladder", () => {
		// The prototype-pollution path, end to end rather than through the predicate:
		// if `isInboundPolicy` were `in`-based this would produce a "policy" that is a
		// function, and `INBOUND_RESTRICTIVENESS[fn] > 0` is false so nothing would be
		// raised — leaving a garbage value to be compared as a policy downstream.
		const resolved = resolveInboundPolicy(
			layers({ source: "repo", value: "constructor" }, { source: "user", value: "hold" }),
		);
		expect(resolved.value).toBe("hold");
		expect(resolved.invalid).toEqual({ source: "repo", value: "constructor" });
	});

	it("is not decided by the order the layers arrive in", () => {
		// A duplicated layer of the same source must not make the outcome depend on
		// iteration order — that would make a bug report unreproducible.
		const forward = resolveInboundPolicy(
			layers({ source: "user", value: "accept" }, { source: "user", value: "refuse" }),
		);
		const reversed = resolveInboundPolicy(
			layers({ source: "user", value: "refuse" }, { source: "user", value: "accept" }),
		);
		expect(forward).toEqual(reversed);
	});
});
