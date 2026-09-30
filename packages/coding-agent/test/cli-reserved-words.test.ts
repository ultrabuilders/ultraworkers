import { describe, expect, it } from "bun:test";
import { reservedTopLevelWordMessage } from "@oh-my-pi/pi-coding-agent/cli-commands";

// Contract: a word that LOOKS like a top-level command but is not one gets a
// helpful message instead of falling through.
//
// Without this table an unrecognised first argument becomes a PROMPT. So
// `omp doctor` used to open a model conversation and spend tokens on the word
// "doctor" — the exact failure this table exists to prevent (#1499/#1496).
// The table is the only thing standing between a plausible typo and a billed
// request, which is why it is worth a test rather than a comment.

describe("reservedTopLevelWordMessage", () => {
	it("refuses `omp doctor` and points at the command that exists", () => {
		// `omp plugin doctor` is the real entry point (plugin-cli.ts); this is not
		// about that verb existing, it is about the word never becoming a prompt.
		const message = reservedTopLevelWordMessage(["doctor"]);
		expect(message).toBeDefined();
		expect(message).toContain("omp plugin doctor");
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
			"doctor",
		]) {
			const message = reservedTopLevelWordMessage([word]);
			expect({ word, message: message !== undefined }).toEqual({ word, message: true });
		}
	});

	it("offers `omp launch <word>` so the prompt the user meant still works", () => {
		// The table must not be a dead end: someone who genuinely meant to talk to
		// the model about "doctor" needs the command that does that.
		const message = reservedTopLevelWordMessage(["doctor"]);
		expect(message).toContain("omp launch doctor");
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
		// invocation look deliberate, so `omp doctor --json` still falls through to a
		// prompt. Two exceptions keep the hint: a marketplace subcommand, and an
		// @-argument, where the word was clearly not meant as a prompt either.
		expect(reservedTopLevelWordMessage(["doctor", "--json"])).toBeUndefined();
		expect(reservedTopLevelWordMessage(["marketplace", "list"])).toContain("omp plugin marketplace");
		expect(reservedTopLevelWordMessage(["list", "some@file.ts"])).toContain("omp plugin list");
	});
});
