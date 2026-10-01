/**
 * `errorMessage` is total.
 *
 * Three byte-identical copies of `error instanceof Error ? error.message : String(error)`
 * lived in this repo and none was total: a `message` getter or a `toString` that
 * throws escapes the `catch` block meant to contain it. `errorMessage` exists at call
 * sites that are, by construction, already handling a failure — so that escape takes
 * the process down from inside error handling, which is the one place a process cannot
 * afford it.
 *
 * The assertions below are about what a caller OBSERVES for a hostile thrown value, not
 * about the function returning a string: each case builds a value that breaks
 * coercion, and the contract is that `errorMessage` still yields usable text rather
 * than propagating.
 */
import { describe, expect, it } from "bun:test";
import { errorMessage, UNPRINTABLE_THROWN_VALUE } from "@oh-my-pi/pi-utils/errors";

describe("errorMessage is total", () => {
	it("keeps the ordinary contract: an Error yields its message", () => {
		expect(errorMessage(new Error("boom"))).toBe("boom");
	});

	it("keeps the ordinary contract: a non-Error yields its string form", () => {
		expect(errorMessage("plain string")).toBe("plain string");
		expect(errorMessage(42)).toBe("42");
		expect(errorMessage(null)).toBe("null");
	});

	it("survives an Error whose message getter throws", () => {
		const hostile = new Error("real message") as Error & { message: string };
		Object.defineProperty(hostile, "message", {
			get() {
				throw new Error("getter exploded");
			},
		});

		// The point of the change: this used to throw, from inside the caller's catch.
		// It must yield text, and that text must name the object rather than be empty.
		const text = errorMessage(hostile);
		expect(text.length).toBeGreaterThan(0);
		expect(text).not.toContain("getter exploded");
	});

	it("survives a value whose toString throws", () => {
		const hostile = {
			toString() {
				throw new Error("toString exploded");
			},
		};

		expect(errorMessage(hostile)).toBe(UNPRINTABLE_THROWN_VALUE);
	});

	it("survives a value whose Symbol.toPrimitive throws", () => {
		const hostile = {
			[Symbol.toPrimitive]() {
				throw new Error("toPrimitive exploded");
			},
			toString() {
				return "should never be reached";
			},
		};

		expect(errorMessage(hostile)).toBe(UNPRINTABLE_THROWN_VALUE);
	});

	it("gives an Error with an empty message something better than an empty string", () => {
		// The one-liner returned "" here, and that empty string then flowed into logs
		// and wire errors looking like a rendered value.
		expect(errorMessage(new Error(""))).not.toBe("");
	});

	it("rejects nothing — a hostile value never escapes", () => {
		const hostileValues: unknown[] = [
			Object.create(null),
			Symbol("s"),
			new Proxy(
				{},
				{
					get() {
						throw new Error("proxy trap");
					},
				},
			),
		];

		for (const value of hostileValues) {
			// Named loop rather than `not.toThrow()`: each case asserts a distinct
			// hostile shape, and the assertion is on the returned text because a
			// bare "did not throw" would pass even if every case returned "".
			const text = errorMessage(value);
			expect(typeof text).toBe("string");
			expect(text.length).toBeGreaterThan(0);
		}
	});
});
