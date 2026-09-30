import { describe, expect, it } from "bun:test";
import { boundedSerialize } from "@oh-my-pi/pi-agent-core/bounded-serialize";

// Contract for exporting telemetry payloads.
//
// Three rules, and the third is the one that separates this from `truncate`:
//
//  1. a depth budget and a byte budget, both enforced by CUTTING, never by
//     throwing — a telemetry helper that throws takes down the code it exists to
//     instrument;
//  2. only allowlisted keys travel;
//  3. a key outside the allowlist FAILS CLOSED — the caller is told to drop the
//     whole export. Truncation cannot do this: keeping half of a payload whose
//     shape you do not recognise is how a secret gets retained forever, because
//     the code that would have noticed was busy cutting strings to length.

const OPTS = { maxDepth: 3, maxBytes: 200, allowlist: ["name", "message", "items"] };

describe("boundedSerialize", () => {
	it("passes an allowlisted payload through unchanged", () => {
		const payload = { name: "boom", message: "connection reset" };
		const result = boundedSerialize(payload, OPTS);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(payload);
		expect(result.truncated).toBe(false);
	});

	it("cuts at the depth budget instead of throwing", () => {
		const deep = { name: "a", items: { items: { items: { name: "too deep" } } } };
		const result = boundedSerialize(deep, OPTS);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Truncated, not rejected: an over-deep payload is still mostly legible,
		// and dropping it entirely would lose the error name entirely.
		expect(result.truncated).toBe(true);
		expect(result.value).toBeDefined();
	});

	it("cuts at the byte budget rather than throwing", () => {
		const huge = { name: "boom", message: "x".repeat(5000) };
		const result = boundedSerialize(huge, OPTS);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.truncated).toBe(true);
		expect(JSON.stringify(result.value).length).toBeLessThanOrEqual(OPTS.maxBytes);
	});

	it("fails closed on a key outside the allowlist", () => {
		// The distinguishing case. `truncate` would have kept this payload and cut
		// it to length; the caller is instead told the shape is not understood, so
		// it can refuse to export at all.
		const result = boundedSerialize({ name: "boom", apiKey: "sk-live-secret" }, OPTS);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe("key-not-allowlisted");
		expect(result.key).toBe("apiKey");
		// The state is observable to the caller, not merely logged: the rejection
		// carries the offending key so the decision stays inspectable.
		expect(JSON.stringify(result)).toContain("apiKey");
	});

	it("rejects on a disallowed key nested below an allowed one", () => {
		const result = boundedSerialize({ name: "boom", items: { secret: "nope" } }, OPTS);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.key).toBe("secret");
	});

	it("survives a cycle and a BigInt without throwing", () => {
		// A throw from here would surface as a crash inside a `catch` block, which
		// is the least useful place a crash can appear.
		const cyclic: Record<string, unknown> = { name: "boom" };
		cyclic.items = cyclic;
		expect(() => boundedSerialize(cyclic, OPTS)).not.toThrow();
		expect(() => boundedSerialize({ name: 10n }, OPTS)).not.toThrow();
	});
});
