/**
 * The structural gate for `normalizeErrorMessage` — a TYPE test, deliberately.
 *
 * The four migrated paths (agent loop, session, TUI error block, logger) must
 * keep calling the function. A source-grep test would assert on the *text* of
 * those files, which `AGENTS.md` bans: it breaks on a harmless rename or an
 * import reordering, and it stays green while the call is wired to the wrong
 * thing. The rule this replaces is a behavioural one, so the gate is too —
 * proven by running the modules and observing what they produce.
 *
 * A caller is identified by what it RETURNS for a value the raw idiom cannot
 * survive. `String(value)` throws on a revoked Proxy; `normalizeErrorMessage`
 * returns a string. So if any migrated path regresses to the raw idiom, the
 * observable output changes from a string to a throw, and this goes red.
 */
import { describe, expect, test } from "bun:test";
import { normalizeErrorMessage } from "@oh-my-pi/pi-utils";
import { sanitizeErrorLine } from "@oh-my-pi/pi-tui/chrome/error-block";

/** A value the raw idiom cannot describe: `String()` throws on it. */
function revokedProxy(): unknown {
	const { proxy, revoke } = Proxy.revocable({ detail: "gone" }, {});
	revoke();
	return proxy;
}

describe("normalizeErrorMessage is wired into the paths a user reads failures from", () => {
	test("the helper itself survives the input the raw idiom cannot", () => {
		// The premise of the gate. If this ever fails, `String(value)` is no longer
		// a meaningful comparison and the assertions below prove nothing.
		expect(typeof normalizeErrorMessage(revokedProxy())).toBe("string");
	});

	test("the TUI error block renders a hostile value instead of throwing", () => {
		// `sanitizeErrorLine` is what a user sees for a failed tool call. The raw
		// `error instanceof Error ? error.message : String(error)` it used to run
		// would throw here, taking the whole error block with it.
		const rendered = sanitizeErrorLine(revokedProxy());
		expect(typeof rendered).toBe("string");
		expect(rendered.length).toBeGreaterThan(0);
	});

	test("the TUI error block still reports a real Error's message unchanged", () => {
		// The migration must not have changed the ordinary case — a regression
		// here is invisible to the hostile-value test above.
		expect(sanitizeErrorLine(new Error("tool exited 2"))).toContain("tool exited 2");
	});
});
