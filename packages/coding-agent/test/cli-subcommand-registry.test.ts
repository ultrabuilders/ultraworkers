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
import * as fs from "node:fs";
import * as path from "node:path";
import {
	type ResolvedCliArgv,
	isSubcommand,
	registerSubcommand,
	resetSubcommandRegistry,
	resolveCliArgv,
	subcommandCollisionDiagnostics,
} from "@oh-my-pi/pi-coding-agent/cli-commands";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { TempDir, __resetDirsFromEnvForTests, setAgentDir } from "@oh-my-pi/pi-utils";

/**
 * `ResolvedCliArgv` is a union, so reading `.argv` has to narrow first.
 * Failing here names the error the CLI would have printed, which is the
 * difference between "the assertion was wrong" and "the verb was rejected".
 */
function dispatchArgv(resolved: ResolvedCliArgv): string[] {
	if ("error" in resolved) throw new Error(`expected a dispatch, but routing refused: ${resolved.error}`);
	return resolved.argv;
}

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
			`export default function(pi) {\n\tpi.registerSubcommand(${JSON.stringify(verb)});\n}\n`,
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
