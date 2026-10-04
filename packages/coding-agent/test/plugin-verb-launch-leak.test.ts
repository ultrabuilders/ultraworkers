/**
 * Regression test for #2935 and #4845: the plugins/marketplace docs advertise
 * bare `list` / `remove` / `marketplace <sub>` / `uninstall …` verbs as top-level
 * commands, but only `install` is registered. Before the fix,
 * `resolveCliArgv(["list"])` rewrote the bare verb to `["launch", "list"]`, so
 * the verb silently started an interactive agent session with "list" as the
 * initial LLM prompt instead of managing plugins (the real command is
 * `<invoked> plugin list`). #4845 extended the same footgun to the multi-word
 * documented grammar: `marketplace add xyz` leaked the whole argv to the model
 * as a prompt.
 *
 * These tests pin the chosen bugfix: a documented plugin/marketplace verb that
 * is bare, or that follows the documented grammar (a marketplace sub-action or a
 * `name@marketplace` plugin id), yields a helpful hint pointing at the real
 * `<invoked> plugin <action>` command rather than leaking to the model — while
 * genuine prose prompts that merely begin with one of these words still fall
 * through to `launch`.
 *
 * WHAT THIS FILE OWNS: the routing contract — a documented verb hints instead of
 * leaking to `launch`, and prose still launches. The name that appears inside the
 * hint is a separate contract, owned by `cli-reserved-words.test.ts`, which drives
 * `reservedTopLevelWordMessage` with two different explicit names to prove the
 * recommendation is substituted rather than hardcoded (epic-4yhd). Splitting them
 * keeps each assertion able to fail for its own reason: asserting a hardcoded
 * product name here would have gone red when 8d5338d33c made the recommendation
 * follow the invoked binary, which is the correct behaviour, not a regression.
 *
 * The hint names `APP_NAME` because `resolveCliArgv` takes no `invokedAs`
 * parameter and falls back to `invokedBinaryName()`, which returns `APP_NAME`
 * whenever `process.argv[1]` is a source path — as it is under `bun test`.
 *
 * Imported via a relative path (not the `@oh-my-pi/pi-coding-agent` alias) so the
 * assertions exercise this checkout's `cli-commands.ts` directly.
 */
import { describe, expect, test } from "bun:test";
import { APP_NAME } from "@oh-my-pi/pi-utils";
import { isSubcommand, resolveCliArgv } from "../src/cli-commands";

describe("documented-but-unregistered plugin verbs do not leak to launch (#2935)", () => {
	test(`bare \`${APP_NAME} list\` hints at \`${APP_NAME} plugin list\` instead of launching with 'list' as the prompt`, () => {
		const result = resolveCliArgv(["list"]);
		// Must NOT be the old silent-launch behavior.
		expect(result).not.toEqual({ argv: ["launch", "list"] });
		expect(result).not.toHaveProperty("argv");
		// Must point at the real command.
		expect(result).toHaveProperty("error");
		expect("error" in result && result.error).toContain(`${APP_NAME} plugin list`);
	});

	test(`bare \`${APP_NAME} remove\` hints at \`${APP_NAME} plugin uninstall\` instead of launching with 'remove' as the prompt`, () => {
		const result = resolveCliArgv(["remove"]);
		expect(result).not.toEqual({ argv: ["launch", "remove"] });
		expect(result).not.toHaveProperty("argv");
		expect(result).toHaveProperty("error");
		expect("error" in result && result.error).toContain(`${APP_NAME} plugin uninstall`);
	});

	test("genuine multi-word prompts beginning with these verbs still route to launch", () => {
		// A real prompt that happens to start with `list`/`remove` must not be hijacked.
		expect(resolveCliArgv(["list", "all", "my", "files"])).toEqual({
			argv: ["launch", "list", "all", "my", "files"],
		});
		expect(resolveCliArgv(["remove", "the", "unused", "import"])).toEqual({
			argv: ["launch", "remove", "the", "unused", "import"],
		});
	});

	test(`multi-word \`${APP_NAME} marketplace add xyz\` hints at \`${APP_NAME} plugin marketplace\` instead of leaking to the prompt (#4845)`, () => {
		const result = resolveCliArgv(["marketplace", "add", "xyz"]);
		expect(result).not.toEqual({ argv: ["launch", "marketplace", "add", "xyz"] });
		expect(result).not.toHaveProperty("argv");
		expect(result).toHaveProperty("error");
		expect("error" in result && result.error).toContain(`${APP_NAME} plugin marketplace`);
	});

	test(`bare marketplace-family verbs hint at their \`${APP_NAME} plugin\` command (#4845)`, () => {
		for (const [verb, hint] of [
			["marketplace", `${APP_NAME} plugin marketplace`],
			["discover", `${APP_NAME} plugin discover`],
			["upgrade", `${APP_NAME} plugin upgrade`],
			["uninstall", `${APP_NAME} plugin uninstall`],
			["enable", `${APP_NAME} plugin enable`],
			["disable", `${APP_NAME} plugin disable`],
		] as const) {
			const result = resolveCliArgv([verb]);
			expect(result).not.toHaveProperty("argv");
			expect("error" in result && result.error).toContain(hint);
		}
	});

	test("`name@marketplace` plugin ids hint instead of launching (#4845)", () => {
		for (const verb of ["uninstall", "upgrade", "enable", "disable"] as const) {
			const result = resolveCliArgv([verb, "code-review@claude-plugins-official"]);
			expect(result).not.toHaveProperty("argv");
			expect(result).toHaveProperty("error");
		}
	});

	test("plugin ids after documented flags hint instead of leaking to launch", () => {
		for (const verb of ["uninstall", "upgrade", "enable", "disable"] as const) {
			const result = resolveCliArgv([verb, "--scope", "project", "code-review@claude-plugins-official"]);
			expect(result).not.toHaveProperty("argv");
			expect(result).toHaveProperty("error");
		}
	});

	test("prose prompts beginning with the new verbs still route to launch (#4845)", () => {
		expect(resolveCliArgv(["upgrade", "the", "deps"])).toEqual({
			argv: ["launch", "upgrade", "the", "deps"],
		});
		// `marketplace` followed by a non-subcommand word is a genuine prompt.
		expect(resolveCliArgv(["marketplace", "research", "for", "me"])).toEqual({
			argv: ["launch", "marketplace", "research", "for", "me"],
		});
	});
});

describe(`\`${APP_NAME} plugins\` is a registered alias of \`${APP_NAME} plugin\``, () => {
	// The TUI builtin is `/plugins` while the CLI command is `plugin`. Dispatch
	// resolves `CommandEntry.aliases`, not the command class's `static aliases`,
	// so dropping the registry entry would make `<APP_NAME> plugins list` stop
	// reaching the plugin command again.
	test(`\`${APP_NAME} plugins list\` routes to the plugin command instead of launch`, () => {
		expect(isSubcommand("plugins")).toBe(true);
		expect(resolveCliArgv(["plugins", "list"])).toEqual({ argv: ["plugins", "list"] });
	});

	test(`bare \`${APP_NAME} plugins\` routes to the plugin command, which defaults to list`, () => {
		expect(resolveCliArgv(["plugins"])).toEqual({ argv: ["plugins"] });
	});
});
