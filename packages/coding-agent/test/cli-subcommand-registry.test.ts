/**
 * An extension-registered top-level verb does NOT reach the dispatcher.
 *
 * ## What a reader sees
 *
 * `ExtensionApi.registerCommand` exists, nine shipped examples call it, and three
 * real consumers read the result (`interactive-mode.ts:2428`,
 * `slash-commands/available-commands.ts:77`,
 * `extensions/get-commands-handler.ts:36`). A reader who stops there concludes the
 * seam works. It does not — those three consumers are all **slash** commands. The
 * **argv** table never consults it:
 *
 * - `resolveCliArgv` (`cli-commands.ts:444`) is a pure function over the static
 *   `commands` array in `cli-commands.ts`.
 * - `isSubcommand` reads `SUBCOMMAND_NAMES`, a `Set` built once at module load
 *   (`:307-313`) from that same static array.
 * - `ExtensionRunner` is constructed in the SDK layer (`sdk.ts:3230`,
 *   `models-cli.ts:339`), never in `cli.ts` — the argv layer structurally has
 *   nothing to call into.
 * - `resolveCliArgv` runs at `cli.ts:634`, before any extension is loaded.
 *
 * So the whole path is: `omp pirate …` → `["launch", "pirate", …]` — a chat
 * session with `pirate` in the prompt, not a dispatch.
 *
 * ## Why this test asserts the CURRENT (broken) behaviour
 *
 * This is a deliberate anchor, not a description of desired behaviour. WI-A
 * (`m2-wi-a-027`) is unimplemented because closing it requires a **load-order
 * decision** that is the owner's: argv routing happens before extensions exist,
 * so a real fix means either a cheap manifest-only load phase ahead of routing,
 * or splitting `cli.ts`.
 *
 * Until that decision lands, ANY test asserting "the registered verb dispatches"
 * would be red for a reason no one has authorised, and ANY test asserting only
 * "the method exists" would be **green on this broken tree** — measuring
 * something already correct and defending nothing.
 *
 * So this file pins the seam as dead. The moment routing is fixed, this test goes
 * red **on purpose**: that is the signal to delete these expectations and assert
 * dispatch instead. `pirate` is a real shipped example
 * (`examples/extensions/pirate.ts:18`), not a fixture invented to fit.
 *
 * Per-row logging is required: a reader debugging a failure needs to know whether
 * the verb was seen as a subcommand, not just that an object differed.
 */
import { describe, expect, test } from "bun:test";
import { isSubcommand, resolveCliArgv } from "@oh-my-pi/pi-coding-agent/cli-commands";

/** A verb a real shipped extension registers. See `examples/extensions/pirate.ts:18`. */
const EXTENSION_VERB = "pirate";

describe("top-level verb dispatch: the seam exists at the slash layer and is dead at the argv layer", () => {
	test("ANCHOR: an extension-registered verb is currently swallowed into a launch prompt", () => {
		const argv = [EXTENSION_VERB, "arg"];
		const resolved = resolveCliArgv(argv);

		console.error(
			"[wi-a:argv-anchor] verb=%s isSubcommand=%s resolved=%o",
			EXTENSION_VERB,
			isSubcommand(EXTENSION_VERB),
			resolved,
		);

		// The failure a user hits: the word reaches the model as prompt text.
		expect(resolved).toEqual({ argv: ["launch", EXTENSION_VERB, "arg"] });
	});

	test("ANCHOR: the argv table does not know the extension's verb", () => {
		console.error("[wi-a:argv-anchor] isSubcommand(%s)=%s", EXTENSION_VERB, isSubcommand(EXTENSION_VERB));

		expect(isSubcommand(EXTENSION_VERB)).toBe(false);
	});

	test("NEGATIVE: built-in verbs and aliases still dispatch unchanged", () => {
		// If WI-A's fix ever lands, these must keep working. Asserting the built-in
		// half is what stops a routing change from regressing the real commands.
		for (const verb of ["acp", "wt", "q"]) {
			const resolved = resolveCliArgv([verb]);

			console.error("[wi-a:argv-negative] verb=%s resolved=%o", verb, resolved);

			expect(resolved).toEqual({ argv: [verb] });
		}
	});

	test("NEGATIVE: a prompt that merely starts with a reserved word still launches", () => {
		// The #4845 guard is deliberately narrow — a genuine prompt beginning with
		// one of these words must not be captured as plugin management.
		const resolved = resolveCliArgv(["list", "all", "my", "files"]);

		console.error("[wi-a:argv-negative] reserved-word prompt resolved=%o", resolved);

		expect(resolved).toEqual({ argv: ["launch", "list", "all", "my", "files"] });
	});
});
