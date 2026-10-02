/**
 * Leading global option flags must not hide a subcommand from the CLI runner.
 *
 * #2970: `omp --approval-mode=yolo acp` was rewritten to
 * `launch --approval-mode=yolo acp`, swallowing `acp` as a launch prompt so the
 * yolo override never reached the ACP command path. The resolver now skips
 * leading global flags (using the launch parser's value-consumption contract)
 * and hoists the real subcommand to the front so its parser still applies the
 * flags.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import * as path from "node:path";
import { commands, isSubcommand, resolveCliArgv } from "@oh-my-pi/pi-coding-agent/cli-commands";

describe("resolveCliArgv routes subcommands hidden behind leading global flags", () => {
	test("`--approval-mode=yolo acp` dispatches the acp subcommand with the flag preserved", () => {
		expect(resolveCliArgv(["--approval-mode=yolo", "acp"])).toEqual({
			argv: ["acp", "--approval-mode=yolo"],
		});
	});

	test("space-form `--approval-mode yolo acp` keeps the flag and its value with acp", () => {
		expect(resolveCliArgv(["--approval-mode", "yolo", "acp"])).toEqual({
			argv: ["acp", "--approval-mode", "yolo"],
		});
	});

	test("multiple leading flags before the subcommand are all preserved", () => {
		expect(resolveCliArgv(["--approval-mode=yolo", "--model", "gpt", "acp"])).toEqual({
			argv: ["acp", "--approval-mode=yolo", "--model", "gpt"],
		});
	});

	test("a value-consuming flag does not mistake its value for a subcommand", () => {
		// `acp` here is the value of `--model`, not the subcommand, so this stays a
		// launch prompt exactly as the launch parser would read it.
		expect(resolveCliArgv(["--model", "acp"])).toEqual({
			argv: ["launch", "--model", "acp"],
		});
	});

	test("`--` ends option scanning so a following subcommand stays a launch prompt", () => {
		expect(resolveCliArgv(["--", "acp"])).toEqual({
			argv: ["launch", "--", "acp"],
		});
	});

	test("a genuine launch prompt is untouched", () => {
		expect(resolveCliArgv(["--approval-mode=yolo", "fix", "the", "bug"])).toEqual({
			argv: ["launch", "--approval-mode=yolo", "fix", "the", "bug"],
		});
	});

	test("a subcommand already in front still passes through unchanged", () => {
		expect(resolveCliArgv(["acp", "--approval-mode=yolo"])).toEqual({
			argv: ["acp", "--approval-mode=yolo"],
		});
	});

	test("`gc` dispatches as a top-level maintenance subcommand", () => {
		expect(resolveCliArgv(["gc", "--apply"])).toEqual({
			argv: ["gc", "--apply"],
		});
	});
});

describe("resolveCliArgv strips launch-global flags before non-launch subcommands (#8891)", () => {
	test("`--cwd <dir> update` drops the inapplicable launch flag instead of forwarding it", () => {
		// Forwarding `--cwd` into update's strict parser crashed with
		// `Unknown option '--cwd'`; the launch-only flag is now dropped.
		expect(resolveCliArgv(["--cwd", "/tmp", "update"])).toEqual({ argv: ["update"] });
	});

	test("`--cwd=<dir>` inline form is stripped too", () => {
		expect(resolveCliArgv(["--cwd=/tmp", "update"])).toEqual({ argv: ["update"] });
	});

	test("a trailing subcommand flag survives while the leading launch flag is stripped", () => {
		expect(resolveCliArgv(["--cwd", "/tmp", "update", "--force"])).toEqual({
			argv: ["update", "--force"],
		});
	});

	test("multiple leading launch flags are all stripped before a non-launch subcommand", () => {
		expect(resolveCliArgv(["--model", "gpt", "--cwd", "/x", "update"])).toEqual({ argv: ["update"] });
	});

	test("a subcommand's own flag placed before it is kept, not treated as launch-global", () => {
		expect(resolveCliArgv(["-c", "update"])).toEqual({ argv: ["update", "-c"] });
	});

	test("launch-shaped `acp` still receives forwarded launch-global flags", () => {
		expect(resolveCliArgv(["--cwd", "/x", "acp"])).toEqual({ argv: ["acp", "--cwd", "/x"] });
	});
});

/**
 * The routing table is the only thing standing between a typo and a prompt.
 *
 * `run` dispatches strictly on argv[0]. A command missing from `commands` is not
 * rejected — it falls through to `launch`, and the whole argv becomes the user's
 * prompt to the model. There is no error, no exit code, and no log line: the user
 * types `omp session list`, the model receives the string `session list`, and it
 * answers in prose. That is the most expensive failure in this milestone precisely
 * because nothing ever reports it (#1496, #1499, #4845).
 *
 * This lives here, beside the other routing tests, and is deliberately ONE
 * assertion over the real registry rather than a hand-written name per command.
 * Two separate lists drift: the day someone adds a command to `cli-commands.ts`
 * and to their own test, or to neither, the pair still agrees with itself while
 * the command is unrouted. Deriving both sides from `commands` makes that
 * impossible — and it covers `session` (W22) and `doctor` (W18) in the same pass,
 * which is the point of sharing it.
 */
describe("every registered command is actually routed", () => {
	test("no command in the registry falls through to launch", () => {
		// Reported as names, not a count: "expected 0, got 1" would not say which.
		const unrouted = commands
			.map(command => command.name)
			.filter(name => {
				if (!isSubcommand(name)) return true;
				const resolved = resolveCliArgv([name, "--help"]);
				return !("argv" in resolved) || resolved.argv[0] !== name;
			});

		console.error(
			"[route] registered=%o unrouted=%o",
			commands.map(c => c.name),
			unrouted,
		);

		expect(unrouted).toEqual([]);
	});

	test("every alias is routed the same way its command is", () => {
		// An alias is a second spelling of a command that already works, so an alias
		// reaching `launch` sends the model a prompt instead of running the command
		// the user named. Same silent failure as above, reached a different way.
		const unrouted = commands
			.flatMap(command => command.aliases ?? [])
			.filter(alias => {
				if (!isSubcommand(alias)) return true;
				const resolved = resolveCliArgv([alias]);
				return !("argv" in resolved) || resolved.argv[0] !== alias;
			});

		console.error("[route:aliases] unrouted=%o", unrouted);

		expect(unrouted).toEqual([]);
	});

	test("every command module is reachable by name or alias, so a new one cannot be left unrouted", () => {
		// The gap the test above cannot see. That one walks the registry, so a command
		// file that was written and never added to `commands` is invisible to it — and
		// that is precisely the failure: `omp session` exists, works, and is not
		// dispatched, so its argv reaches the model as a prompt.
		//
		// Derived from the directory rather than a hand-written list, because a hand
		// list is the thing that goes stale. Each exemption says why, so adding a
		// fourth one is a decision rather than a copy-paste:
		//   launch-help — help text for `launch`, imported by its registry entry
		//   settings    — a settings surface reached through another command
		//   complete    — registered as `__complete`, the shell-completion callback
		//                 `completion-gen.ts` invokes. `omp complete` is deliberately
		//                 not a command, so the module name is not a public name.
		const helpers = new Set(["launch-help", "settings", "complete"]);
		const reachable = new Set(commands.flatMap(command => [command.name, ...(command.aliases ?? [])]));
		const orphans = readdirSync(path.join(import.meta.dir, "..", "src", "commands"))
			.map(file => path.basename(file, ".ts"))
			.filter(file => !helpers.has(file) && !reachable.has(file));

		console.error("[route:orphans] orphans=%o", orphans);

		expect(orphans).toEqual([]);
	});

	test("a reserved plugin verb errors instead of reaching the model", () => {
		// `omp marketplace` is documented-looking but not a top-level command.
		// Returning an error is the point; reaching `launch` would forward the word
		// itself. (`doctor` used to be the subject here, but 22225aec9b made it a real
		// top-level command, so it now routes and this case would not exercise the guard.)
		const resolved = resolveCliArgv(["marketplace"]);

		expect("error" in resolved && resolved.error).toContain("omp plugin marketplace");
		expect("argv" in resolved).toBe(false);
	});
});
