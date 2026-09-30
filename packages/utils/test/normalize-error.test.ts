/**
 * `normalizeErrorMessage` replaces
 * `value instanceof Error ? value.message : String(value)` on the paths whose
 * failure text a user actually reads.
 *
 * Both property reads in that idiom can throw, so the handler reporting a
 * failure could itself throw, and the resulting report would name the wrong
 * thing. The contract is two-sided: it must return a string, AND it must not
 * let a hostile value's own error become the reported error.
 */
import { describe, expect, test } from "bun:test";
import { normalizeErrorMessage } from "@oh-my-pi/pi-utils";

describe("normalizeErrorMessage", () => {
	test("returns the message of a real Error", () => {
		expect(normalizeErrorMessage(new Error("boom"))).toBe("boom");
	});

	test("returns a string for a value whose message getter throws", () => {
		// The trap: reading `.message` here raises a *different* error from the
		// one the caller is trying to report.
		const hostile = {
			get message(): string {
				throw new Error("getter exploded");
			},
			name: "HostileError",
		};

		// Must not throw, and must not surface the getter's error — that reads as
		// a defect in the reporting path rather than in the value being reported.
		const result = normalizeErrorMessage(hostile);
		expect(typeof result).toBe("string");
		expect(result).not.toContain("getter exploded");
	});

	test("reports the object's own name when its message getter throws", () => {
		// The two reads are guarded separately on purpose: `name` is still
		// readable, so a value that fails one read is still describable.
		const hostile = {
			get message(): string {
				throw new Error("getter exploded");
			},
			name: "HostileError",
		};

		expect(normalizeErrorMessage(hostile)).toContain("HostileError");
	});

	test("describes a value whose toString throws without throwing", () => {
		// `String(value)` would call this and propagate. The internal-slot read
		// does not consult `toString` at all, so the value is still describable.
		const hostile = {
			toString(): string {
				throw new Error("toString exploded");
			},
			name: "Unstringifiable",
		};

		const result = normalizeErrorMessage(hostile);
		expect(typeof result).toBe("string");
		expect(result).not.toContain("toString exploded");
	});

	test("describes a revoked Proxy without throwing", () => {
		const { proxy, revoke } = Proxy.revocable({ message: "gone" }, {});
		revoke();

		// Every trap on a revoked proxy throws. This is the case where even
		// `Object.prototype.toString.call` can fail, and the function's contract
		// is that it still returns a string.
		expect(typeof normalizeErrorMessage(proxy)).toBe("string");
	});

	test("an Error subclass with a throwing message getter still yields a string", () => {
		class HostileError extends Error {
			override get message(): string {
				throw new Error("subclass getter exploded");
			}
		}

		const result = normalizeErrorMessage(new HostileError("real cause"));
		expect(typeof result).toBe("string");
		expect(result).not.toContain("subclass getter exploded");
	});
});
