import { describe, expect, test } from "bun:test";
import { hasSessionOptIn } from "../../src/slash-commands/helpers/bug-report";

describe("/bug-report transcript opt-in", () => {
	// The default is what matters: a bare invocation must not ship the user's
	// conversation, and the flag is the only thing that changes that.
	test("does not include the transcript by default", () => {
		expect(hasSessionOptIn({})).toBe(false);
		expect(hasSessionOptIn({ args: "" })).toBe(false);
		expect(hasSessionOptIn({ args: "some hint text" })).toBe(false);
	});

	test("includes the transcript only when explicitly asked", () => {
		expect(hasSessionOptIn({ args: "--session" })).toBe(true);
		expect(hasSessionOptIn({ args: "--with-session" })).toBe(true);
		expect(hasSessionOptIn({ args: "a hint --session" })).toBe(true);
	});

	// A near-miss flag must not read as consent.
	test("does not treat an unrelated flag as consent", () => {
		expect(hasSessionOptIn({ args: "--sessionless" })).toBe(false);
		expect(hasSessionOptIn({ args: "--no-session" })).toBe(false);
	});
});
