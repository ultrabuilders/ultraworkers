import { describe, expect, it } from "bun:test";
import { reservedTopLevelWordMessage } from "@oh-my-pi/pi-coding-agent/cli-commands";

// Contract: a word that LOOKS like a top-level command but is not one gets a
// helpful message instead of falling through.
//
// Without this table an unrecognised first argument becomes a PROMPT. So
// `omp marketplace` used to open a model conversation and spend tokens on the
// word "marketplace" — the exact failure this table exists to prevent
// (#1499/#1496). The table is the only thing standing between a plausible typo
// and a billed request, which is why it is worth a test rather than a comment.
//
// These cases name `marketplace`, not `doctor`. `doctor` was the original
// fixture and it stopped being one: `22225aec9b` made it a real top-level
// command, so the hint correctly stopped firing for it and every assertion here
// that expected a message went red. The premise had died, not the behaviour.
// It is kept below as a NEGATIVE, which is the more valuable case: a word that
// became a real command must not be hijacked back into a hint.

describe("reservedTopLevelWordMessage", () => {
	it("refuses a reserved verb and points at the command that exists", () => {
		// `omp plugin marketplace` is the real entry point (plugin-cli.ts); this is
		// not about that verb existing, it is about the word never becoming a prompt.
		const message = reservedTopLevelWordMessage(["marketplace"]);
		expect(message).toBeDefined();
		expect(message).toContain("omp plugin marketplace");
	});

	it("covers every word that looks like a command but is not one", () => {
		for (const word of [
			"extensions",
			"list",
			"remove",
			"uninstall",
			"marketplace",
			"discover",
			"upgrade",
			"enable",
			"disable",
		]) {
			const message = reservedTopLevelWordMessage([word]);
			expect({ word, message: message !== undefined }).toEqual({ word, message: true });
		}
	});

	it("NEGATIVE: a word that became a real command is not hijacked back into a hint", () => {
		// `doctor` is dispatched by the real table now. The hint is only for words
		// core genuinely cannot route, so it must stay silent for one it can.
		expect(reservedTopLevelWordMessage(["doctor"])).toBeUndefined();
	});

	it("offers `omp launch <word>` so the prompt the user meant still works", () => {
		// The table must not be a dead end: someone who genuinely meant to talk to
		// the model about "marketplace" needs the command that does that.
		const message = reservedTopLevelWordMessage(["marketplace"]);
		expect(message).toContain("omp launch marketplace");
	});

	it("stays out of the way of anything else", () => {
		// An ordinary prompt, a flag, and an @-mention are not command-shaped and
		// must pass through untouched — otherwise this table starts eating real
		// prompts.
		expect(reservedTopLevelWordMessage([])).toBeUndefined();
		expect(reservedTopLevelWordMessage(["--help"])).toBeUndefined();
		expect(reservedTopLevelWordMessage(["summarise", "this", "file"])).toBeUndefined();
		expect(reservedTopLevelWordMessage(["@file.ts"])).toBeUndefined();
	});

	it("only guards the BARE word, which is narrower than it looks", () => {
		// Stated because it is easy to assume otherwise: any second token makes the
		// invocation look deliberate, so `omp marketplace --json` still falls through
		// to a prompt. Two exceptions keep the hint: a marketplace subcommand, and an
		// @-argument, where the word was clearly not meant as a prompt either.
		expect(reservedTopLevelWordMessage(["marketplace", "--json"])).toBeUndefined();
		expect(reservedTopLevelWordMessage(["marketplace", "list"])).toContain("omp plugin marketplace");
		expect(reservedTopLevelWordMessage(["list", "some@file.ts"])).toContain("omp plugin list");
	});
});

describe("reservedTopLevelWordMessage echoes the invocation, not a hardcoded binary", () => {
	it("names the binary the user actually ran", () => {
		// The bug this rules out: the message hardcoded `omp`, so someone who typed
		// `ultraworkers list` was told "`omp list` is not a top-level command" — the
		// message reported a command they never ran.
		const asInstalled = reservedTopLevelWordMessage(["list"], "ultraworkers");
		expect(asInstalled).toContain("`ultraworkers list` is not a top-level command");

		const asRenamed = reservedTopLevelWordMessage(["list"], "uw-under-another-name");
		expect(asRenamed).toContain("`uw-under-another-name list` is not a top-level command");
	});

	it("NEGATIVE: no placeholder survives into the message", () => {
		// `{invoked}` is a template token, and a hint containing it verbatim would be
		// worse than the hardcoded binary it replaced.
		for (const word of [
			"extensions",
			"list",
			"remove",
			"uninstall",
			"marketplace",
			"discover",
			"upgrade",
			"enable",
			"disable",
		]) {
			expect(reservedTopLevelWordMessage([word], "ultraworkers")).not.toContain("{invoked}");
		}
	});

	it("leaves the recommended command untouched when the invocation name changes", () => {
		// The `omp plugin …` clause recommends a command to run NEXT, which is a
		// separate open product decision about the installed binary name. Fixing the
		// echo must not quietly rewrite the recommendation in the same pass.
		expect(reservedTopLevelWordMessage(["list"], "ultraworkers")).toContain("omp plugin list");
		expect(reservedTopLevelWordMessage(["list"], "uw-under-another-name")).toContain("omp plugin list");
	});
});
