/**
 * The contract: `omp config migrate` is accepted, and `--apply` is what turns a
 * read into a write.
 *
 * The failure this defends is the one that cannot be caught by a type check.
 * Widening `ConfigAction` to include `"migrate"` leaves `VALID_ACTIONS` and
 * `ACTIONS` both type-correct if the literal is left out of them, and an
 * `apply` flag that is parsed but never threaded into `flags` also type-checks.
 * Both compile. The user finds out by typing the command and watching it
 * rejected — or, worse, watching a dry run ignore `--apply` and report a
 * migration that never happened.
 *
 * The `Config` command's own `ACTIONS` list is the array the runtime validates
 * against, so it is asserted separately from the hand-rolled parser: these are
 * two lists that agree today, which is exactly the pair that drifts.
 */

import { describe, expect, test } from "bun:test";
import { parseConfigArgs } from "../src/cli/config-cli";
import Config from "../src/commands/config";

describe("config migrate is a real action", () => {
	test("the hand-rolled parser accepts it and does not require --apply", () => {
		const cmd = parseConfigArgs(["config", "migrate"]);

		// Undefined, not false: the handler branches on `=== true`, and a
		// default of `false` would make "not passed" indistinguishable from
		// "explicitly declined".
		expect(cmd?.action).toBe("migrate");
		expect(cmd?.flags.apply).toBeUndefined();
		expect(cmd?.flags.json).toBeUndefined();
	});

	test("--apply reaches the flags object", () => {
		expect(parseConfigArgs(["config", "migrate", "--apply"])?.flags.apply).toBe(true);
	});

	test("--json and --apply are independent", () => {
		const both = parseConfigArgs(["config", "migrate", "--apply", "--json"]);
		expect(both?.flags).toEqual({ json: true, apply: true });

		const jsonOnly = parseConfigArgs(["config", "migrate", "--json"]);
		expect(jsonOnly?.flags.json).toBe(true);
		expect(jsonOnly?.flags.apply).toBeUndefined();
	});

	test("the command's validated action list includes migrate", () => {
		// `Config.args.action.options` is what the runtime rejects against; a
		// literal added to the union but not here is accepted by tsc and
		// refused at the prompt.
		const options = Config.args.action.options;
		expect(options).toContain("migrate");
		// The pre-existing actions must survive the widening.
		expect(options).toContain("init-xdg");
		expect(options).toContain("set");
	});
});

describe("unknown actions are still rejected", () => {
	test("a typo is not silently treated as a migration", () => {
		const errors: string[] = [];
		const originalError = console.error;
		const originalExit = process.exit;
		console.error = (message?: unknown) => void errors.push(String(message));
		process.exit = ((code?: number) => {
			throw new Error(`exit:${code}`);
		}) as typeof process.exit;
		try {
			parseConfigArgs(["config", "migratee"]);
			throw new Error("expected the parser to reject an unknown action");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe("exit:1");
		} finally {
			console.error = originalError;
			process.exit = originalExit;
		}
		expect(errors.join("\n")).toContain("migratee");
	});
});
