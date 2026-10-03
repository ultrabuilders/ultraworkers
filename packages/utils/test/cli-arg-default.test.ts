import { describe, expect, it, spyOn } from "bun:test";
import { Args, Command, type CommandEntry, run } from "../src/cli";

/**
 * A positional argument that declares a `default` must receive it when the
 * argument is absent.
 *
 * `default` was read only for flags. A command declaring one on a positional got
 * `undefined` for its own no-argument form, so `ultraworkers session` fell into
 * its `default:` branch with nothing to report and printed
 * `Unknown action "undefined"` — a raw JavaScript value in a user-facing message.
 *
 * The observable contract is the value a command's own `run()` sees, because that
 * is what decides whether the no-argument form works at all.
 */

let seen: { action?: string; id?: string } = {};

class SessionLike extends Command {
	static description = "session management";
	static args = {
		action: Args.string({ description: "What to do", required: false, default: "list" }),
		id: Args.string({ description: "Session id", required: false }),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(SessionLike);
		seen = { action: args.action, id: args.id };
		// Mirrors the shape that produced the report: an unrecognised action is
		// refused by name, so a missing default reaches the user verbatim.
		if (args.action !== "list" && args.action !== "archive" && args.action !== "unarchive") {
			process.stderr.write(`Unknown action "${args.action}".\n`);
			process.exitCode = 1;
		}
	}
}

const commands: CommandEntry[] = [{ name: "session", load: async () => SessionLike }];

const invoke = async (argv: string[]): Promise<{ out: string; err: string }> => {
	const out: string[] = [];
	const err: string[] = [];
	const outSpy = spyOn(process.stdout, "write").mockImplementation(chunk => {
		out.push(String(chunk));
		return true;
	});
	const errSpy = spyOn(process.stderr, "write").mockImplementation(chunk => {
		err.push(String(chunk));
		return true;
	});
	const priorExitCode = process.exitCode;
	try {
		await run({ bin: "omp", version: "0.0.0", argv: ["session", ...argv], commands });
	} finally {
		outSpy.mockRestore();
		errSpy.mockRestore();
		process.exitCode = priorExitCode;
	}
	return { out: out.join(""), err: err.join("") };
};

describe("positional argument defaults", () => {
	// Regression: the no-argument form is how `ultraworkers session` is invoked,
	// and it reached the refusal branch because the declared default never arrived.
	it("delivers the declared default when the argument is absent", async () => {
		await invoke([]);
		expect(seen.action).toBe("list");
	});

	it("never reaches the refusal branch with nothing to name", async () => {
		// The user-visible half of the same defect: the message interpolated the
		// missing value itself, so `ultraworkers session` printed the word
		// "undefined" and exited 1.
		const { err } = await invoke([]);
		expect(err).not.toContain("undefined");
		expect(err).not.toContain("Unknown action");
	});

	it("lets a supplied value win over the declared default", async () => {
		await invoke(["archive"]);
		expect(seen.action).toBe("archive");
	});

	it("still refuses an unrecognised value, naming what the user typed", async () => {
		// The default must not swallow genuine mistakes into a silent list.
		const { err } = await invoke(["bogus"]);
		expect(err).toContain('Unknown action "bogus"');
	});

	it("leaves a positional with no declared default undefined", async () => {
		// The negative contract: without this, honouring `default` could invent a
		// value for every argument, and a command asking "was an id given?" would
		// start answering yes.
		await invoke([]);
		expect(seen.id).toBeUndefined();
	});

	it("keeps later positionals aligned when an earlier one is defaulted", async () => {
		// The default is applied after the slot is consumed, not by shifting
		// positionals — otherwise `session archive <id>` would slide the id into
		// `action`.
		await invoke(["archive", "abc123"]);
		expect(seen).toEqual({ action: "archive", id: "abc123" });
	});
});
