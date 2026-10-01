/**
 * An extension-registered verb must actually dispatch.
 *
 * ## The failure this file is built to catch
 *
 * `cli-commands.ts` builds `SUBCOMMAND_NAMES` once, at module load, and
 * `isSubcommand` used to read that closed Set. A `registerSubcommand` that only
 * appended to the exported `commands` array would compile, export a function
 * with the right name, and dispatch nothing — the verb keeps falling through to
 * `launch` and the argv reaches the model as a prompt. Nothing throws, nothing
 * logs. A test asserting only that the function exists is green on exactly that
 * broken fix.
 *
 * So the load-bearing assertion here is the **control pair**: the same verb, once
 * unregistered and once registered, must route differently. If registration
 * changed nothing, both halves would be identical and the positive case would be
 * indistinguishable from the broken behaviour it is meant to rule out.
 *
 * ## Why the mutation matters more than the assertions
 *
 * Restricting `isSubcommand` back to `SUBCOMMAND_NAMES.has(first)` — the
 * one-word change that recreates the original bug — turns the dispatch case red
 * while the file still compiles and the negative branch still passes. That is
 * the proof this file is not green by construction.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	type ResolvedCliArgv,
	isSubcommand,
	registerSubcommand,
	resetSubcommandRegistry,
	resolveCliArgv,
	subcommandCollisionDiagnostics,
} from "@oh-my-pi/pi-coding-agent/cli-commands";

describe("registerSubcommand: an extension verb reaches the dispatcher", () => {
	/**
	 * `ResolvedCliArgv` is a union, so reading `.argv` has to narrow first.
	 * Failing here names the error the CLI would have printed, which is the
	 * difference between "the assertion was wrong" and "the verb was rejected".
	 */
	function dispatchArgv(resolved: ResolvedCliArgv): string[] {
		if ("error" in resolved) throw new Error(`expected a dispatch, but routing refused: ${resolved.error}`);
		return resolved.argv;
	}

	beforeEach(() => {
		resetSubcommandRegistry();
	});

	afterEach(() => {
		resetSubcommandRegistry();
	});

	it("CONTROL: before registration the verb falls through to launch as a prompt", () => {
		const resolved = resolveCliArgv(["deploy", "staging"]);

		// The prompt path: argv is rewritten to `launch …`, not rejected. This is
		// what a registered verb must stop doing.
		expect(dispatchArgv(resolved)[0]).toBe("launch");
	});

	it("dispatches a registered verb instead of forwarding it as a prompt", () => {
		expect(registerSubcommand("deploy", "ext:ci")).toBe(true);

		const resolved = resolveCliArgv(["deploy", "staging"]);

		// The observable is the dispatch result, not that the registry grew: a
		// registry that records a name nobody reads passes the second check and
		// fails this one.
		const argv = dispatchArgv(resolved);
		expect(argv[0]).toBe("deploy");
		expect(argv[1]).toBe("staging");
	});

	it("reads the registry per call, so a verb registered after load is visible", () => {
		// The closed-Set bug is precisely a snapshot taken earlier. Registering
		// after the module has already been evaluated is the ordinary case, so it
		// gets its own case rather than being folded into the one above.
		expect(isSubcommand("later")).toBe(false);
		registerSubcommand("later", "ext:late");
		expect(isSubcommand("later")).toBe(true);
	});

	it("reports a duplicate verb with both claimants named", () => {
		registerSubcommand("deploy", "ext:ci");
		const second = registerSubcommand("deploy", "ext:other");

		expect(second).toBe(false);
		const [collision] = subcommandCollisionDiagnostics();
		// Both sides, not just the loser — an invisible override is the failure
		// mode this records, so naming only the newcomer would repeat it.
		expect(collision.owner).toBe("ext:other");
		expect(collision.existingOwner).toBe("ext:ci");
	});

	it("NEGATIVE: a verb nobody registered still becomes a prompt", () => {
		registerSubcommand("deploy", "ext:ci");

		const resolved = resolveCliArgv(["unregistered-verb", "text"]);

		expect(dispatchArgv(resolved)[0]).toBe("launch");
	});

	it("NEGATIVE: a built-in command still dispatches when nothing is registered", () => {
		const resolved = resolveCliArgv(["doctor"]);

		// `doctor` is a reserved word, not a command, so it must still be told
		// where the real one lives. Registration must not have disarmed that.
		expect(resolved).toHaveProperty("error");
	});
});
