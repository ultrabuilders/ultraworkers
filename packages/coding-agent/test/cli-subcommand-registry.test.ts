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
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	type ResolvedCliArgv,
	commands,
	couldBeExtensionSubcommand,
	extensionCommandEntries,
	isSubcommand,
	registerSubcommand,
	resetSubcommandRegistry,
	resolveCliArgv,
	subcommandCollisionDiagnostics,
} from "@oh-my-pi/pi-coding-agent/cli-commands";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { TempDir, __resetDirsFromEnvForTests, setAgentDir } from "@oh-my-pi/pi-utils";
import { run } from "@oh-my-pi/pi-utils/cli";

/**
 * `ResolvedCliArgv` is a union, so reading `.argv` has to narrow first.
 * Failing here names the error the CLI would have printed, which is the
 * difference between "the assertion was wrong" and "the verb was rejected".
 */
function dispatchArgv(resolved: ResolvedCliArgv): string[] {
	if ("error" in resolved) throw new Error(`expected a dispatch, but routing refused: ${resolved.error}`);
	return resolved.argv;
}

/** Records what a verb was invoked with, so "it ran" is observable. */
function recordingHandler(calls: string[][]): (argv: string[]) => Promise<void> {
	return async argv => {
		calls.push(argv);
	};
}

const noopHandler = async (): Promise<void> => {};

describe("registerSubcommand: an extension verb reaches the dispatcher", () => {
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
		expect(registerSubcommand("deploy", "ext:ci", noopHandler)).toBe(true);

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
		registerSubcommand("later", "ext:late", noopHandler);
		expect(isSubcommand("later")).toBe(true);
	});

	it("reports a duplicate verb with both claimants named", () => {
		registerSubcommand("deploy", "ext:ci", noopHandler);
		const second = registerSubcommand("deploy", "ext:other", noopHandler);

		expect(second).toBe(false);
		const [collision] = subcommandCollisionDiagnostics();
		// Both sides, not just the loser — an invisible override is the failure
		// mode this records, so naming only the newcomer would repeat it.
		expect(collision.owner).toBe("ext:other");
		expect(collision.existingOwner).toBe("ext:ci");
	});

	it("NEGATIVE: a verb nobody registered still becomes a prompt", () => {
		registerSubcommand("deploy", "ext:ci", noopHandler);

		const resolved = resolveCliArgv(["unregistered-verb", "text"]);

		expect(dispatchArgv(resolved)[0]).toBe("launch");
	});

	it("NEGATIVE: a built-in command still dispatches when nothing is registered", () => {
		const resolved = resolveCliArgv(["doctor"]);

		// `doctor` is a reserved word, not a command, so it must still be told
		// where the real one lives. Registration must not have disarmed that.
		expect(resolved).toHaveProperty("error");
	});

	it("NEGATIVE: a real extension's slash command is still not a top-level verb", () => {
		// `pirate` is a shipped example (`packages/coding-agent/examples/extensions/
		// pirate.ts:18`) that calls `pi.registerCommand("pirate", …)` — a *slash*
		// command. Opening a top-level registry must not quietly promote every
		// extension command into `omp <verb>` routing, which would shadow real
		// prompts. Taken from the anchor this file replaces (671263e7db), which
		// pinned the dead seam using this example rather than an invented fixture.
		expect(isSubcommand("pirate")).toBe(false);
		const resolved = resolveCliArgv(["pirate", "arg"]);

		expect(dispatchArgv(resolved)[0]).toBe("launch");
	});
});

/**
 * The producer half, driven through the surface an extension actually uses.
 *
 * The cases above call `registerSubcommand` directly, which means they stay
 * green if the `ExtensionAPI` method or the loader's call to it is deleted —
 * the registry would simply have no way in and nothing would notice. That is
 * the same defect as a test that calls a collaborator directly, pointed the
 * other way, and it is exactly how `4e1693a998` shipped: a registry with a
 * read path and no producer.
 *
 * So this loads a real extension module through the real loader and asserts the
 * verb it registered actually routes. Deleting `registerSubcommandVerb(...)`
 * from the loader turns the routing case red while the cases above stay green —
 * which is the split that proves the two halves are covered independently.
 */
describe("registerSubcommand: the ExtensionAPI producer", () => {
	let tempDir: TempDir;
	let cwd: string;
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	/** An extension module that claims one top-level verb, as a real one would. */
	function writeExtension(verb: string): string {
		const dir = path.join(cwd, "ext");
		fs.mkdirSync(dir, { recursive: true });
		const entry = path.join(dir, "index.ts");
		fs.writeFileSync(
			entry,
			`export default function(pi) {\n\tpi.registerSubcommand(${JSON.stringify(verb)}, async argv => {\n\t\tprocess.stdout.write(${JSON.stringify(`RAN ${verb}:`)} + argv.join(","));\n\t});\n}\n`,
			"utf-8",
		);
		return entry;
	}

	beforeEach(() => {
		resetSubcommandRegistry();
		tempDir = TempDir.createSync("@pi-subcommand-ext-");
		cwd = tempDir.absolute();
		// Steer user-scope discovery at the temp dir, or the scan returns the
		// developer's own extensions and the suite learns to expect them.
		setAgentDir(path.join(cwd, "agent"));
	});

	afterEach(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		resetSubcommandRegistry();
		tempDir?.removeSync();
	});

	it("CONTROL: before the extension loads, its verb is still a prompt", () => {
		expect(dispatchArgv(resolveCliArgv(["deploy", "staging"]))[0]).toBe("launch");
	});

	it("routes a verb an extension registered through the real loader", async () => {
		const entry = writeExtension("deploy");

		const result = await loadExtensions([entry], cwd);

		// The extension must load cleanly, or a later assertion would pass for the
		// wrong reason — an extension that failed to register anything at all.
		expect(result.errors).toHaveLength(0);

		const argv = dispatchArgv(resolveCliArgv(["deploy", "staging"]));
		expect(argv[0]).toBe("deploy");
		expect(argv[1]).toBe("staging");
	});

	it("does not promote a slash command into a top-level verb", async () => {
		// Same extension, registering through `registerCommand` instead. The two
		// registries are separate, and conflating them would shadow real prompts.
		const dir = path.join(cwd, "ext");
		fs.mkdirSync(dir, { recursive: true });
		const entry = path.join(dir, "slash.ts");
		fs.writeFileSync(
			entry,
			`export default function(pi) {\n\tpi.registerCommand("greet", { handler: async () => ({}) });\n}\n`,
			"utf-8",
		);

		await loadExtensions([entry], cwd);

		expect(isSubcommand("greet")).toBe(false);
	});
});

/**
 * The half that was actually missing: `omp <verb>` must *run* the handler.
 *
 * Everything above proves the verb reaches the router. Routing is not dispatch:
 * `run()` matches `argv[0]` against a static `CommandEntry[]`, so a registry that
 * records a handler nobody passes to `run()` produces a verb that resolves
 * correctly and then dies on `command not found` — or worse, never reaches the
 * router at all because extensions never loaded first.
 *
 * The control pair is what makes this file's verdict mean something. Same verb,
 * same argv, same `run()`: once unregistered it must be *rejected*, and once
 * registered it must *run*. If `extensionCommandEntries` returned nothing, both
 * halves would be identical and this file would be green on the broken fix.
 *
 * `run()` is driven directly rather than through `runCli`, so the assertion is on
 * the dispatch contract itself and does not need the process-entry side effects.
 * The producer path is exercised end-to-end in the last case: real extension
 * module → real loader → real `run()`, which is the only path a user can take.
 */
describe("registerSubcommand: omp <verb> runs the handler", () => {
	let tempDir: TempDir;
	let cwd: string;
	let stdout: ReturnType<typeof spyOn<typeof process.stdout, "write">>;
	let stderr: ReturnType<typeof spyOn<typeof process.stderr, "write">>;
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	/** Drive the real dispatcher over the registry the CLI actually builds. */
	async function runVerb(argv: string[]): Promise<void> {
		await run({
			bin: "omp",
			version: "0.0.0-test",
			argv,
			commands: [...commands, ...extensionCommandEntries()],
		});
	}

	/** Everything `run()` told the user, as one string. */
	function stderrText(): string {
		return stderr.mock.calls.map(call => String(call[0])).join("");
	}

	beforeEach(() => {
		resetSubcommandRegistry();
		tempDir = TempDir.createSync("@pi-subcommand-run-");
		cwd = tempDir.absolute();
		setAgentDir(path.join(cwd, "agent"));
		// Asserted through these two streams, never through `process.exitCode`:
		// `run()` sets it on the not-found path, and the test runner re-asserts its
		// own value between cases, so an assertion on it is decided by the runner
		// rather than by this file.
		stdout = spyOn(process.stdout, "write").mockImplementation(() => true);
		stderr = spyOn(process.stderr, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		stdout.mockRestore();
		stderr.mockRestore();
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		resetSubcommandRegistry();
		tempDir?.removeSync();
	});

	it("CONTROL: the same verb is rejected by run() before anything registers it", async () => {
		await runVerb(["deploy", "staging"]);

		expect(stderrText()).toContain("command deploy not found");
		expect(stdout).not.toHaveBeenCalled();
	});

	it("runs the handler with the argv that follows the verb", async () => {
		const calls: string[][] = [];
		registerSubcommand("deploy", "ext:ci", recordingHandler(calls));

		await runVerb(["deploy", "staging", "--force"]);

		expect(calls).toEqual([["staging", "--force"]]);
		expect(stderrText()).not.toContain("not found");
	});

	it("NEGATIVE: an unregistered verb is still rejected while others are registered", async () => {
		registerSubcommand("deploy", "ext:ci", noopHandler);

		await runVerb(["nope"]);

		expect(stderrText()).toContain("command nope not found");
	});

	it("refuses a verb shadowing a built-in, naming omp as the other claimant", async () => {
		// `install` is a real command in the static table, and `run()` matches that
		// table first — so a handler registered under this name would be unreachable.
		// Refusing loudly is the whole point: a silent no-op here is the invisible
		// override WI-2 named.
		expect(registerSubcommand("install", "ext:greedy", noopHandler)).toBe(false);

		const [collision] = subcommandCollisionDiagnostics();
		expect(collision.verb).toBe("install");
		expect(collision.existingOwner).toBe("omp");
	});

	it("the composed command list still resolves a refused shadow to the built-in", () => {
		registerSubcommand("install", "ext:greedy", noopHandler);
		registerSubcommand("deploy", "ext:ci", noopHandler);

		// The order `cli.ts` composes, and the same `findEntry` match `run()` does:
		// first entry wins. Asserted on the list rather than by dispatching, because
		// dispatching `install` would execute the real installer.
		const composed = [...commands, ...extensionCommandEntries()];
		const installIndex = composed.findIndex(e => e.name === "install");
		const deployIndex = composed.findIndex(e => e.name === "deploy");

		// `install` still resolves to the built-in's own slot — the refused handler
		// contributed no second entry to shadow it.
		expect(installIndex).toBe(commands.findIndex(e => e.name === "install"));
		// And the built-in precedes the extension verb, so `findEntry` cannot reach
		// an extension entry before a core one.
		expect(installIndex).toBeLessThan(deployIndex);
	});

	it("routes a verb a real extension registered, from module to handler", async () => {
		const dir = path.join(cwd, "ext");
		fs.mkdirSync(dir, { recursive: true });
		const entry = path.join(dir, "index.ts");
		fs.writeFileSync(
			entry,
			`export default function(pi) {\n\tpi.registerSubcommand("deploy", async argv => {\n\t\tprocess.stdout.write("RAN:" + argv.join(","));\n\t});\n}\n`,
			"utf-8",
		);

		const loaded = await loadExtensions([entry], cwd);
		expect(loaded.errors).toHaveLength(0);

		await runVerb(["deploy", "staging"]);

		// The handler's own output, through the real loader and the real dispatcher.
		expect(stdout).toHaveBeenCalledWith("RAN:staging");
	});
});

/**
 * The gate that decides whether extensions load at all.
 *
 * `cli.ts` primes the registry before routing, and priming means scanning and
 * loading extensions. Doing that unconditionally would put extension loading on
 * `omp --version` and every prompt. The discriminator is that a verb is a single
 * bare token: whitespace can only appear if the user quoted the whole prompt,
 * which is the ordinary way to send one.
 */
describe("couldBeExtensionSubcommand", () => {
	it("NEGATIVE: a quoted multi-word prompt must not trigger extension loading", () => {
		expect(couldBeExtensionSubcommand("deploy staging")).toBe(false);
		expect(couldBeExtensionSubcommand("how do I refactor this")).toBe(false);
	});

	it("NEGATIVE: flags and @file arguments are never verbs", () => {
		expect(couldBeExtensionSubcommand("--version")).toBe(false);
		expect(couldBeExtensionSubcommand("-h")).toBe(false);
		expect(couldBeExtensionSubcommand("@notes.md")).toBe(false);
		expect(couldBeExtensionSubcommand(undefined)).toBe(false);
	});

	it("a bare word is treated as a possible verb", () => {
		expect(couldBeExtensionSubcommand("deploy")).toBe(true);
		expect(couldBeExtensionSubcommand("run")).toBe(true);
	});
});
