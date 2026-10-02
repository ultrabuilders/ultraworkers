/**
 * The contract: no test file in `scripts/` can be invisible to the gate.
 *
 * This gate is the only thing that notices a test nobody runs, and it had the
 * same blind spot it exists to prevent. Its collector matched `.test.ts` and
 * nothing else, so the nine `.mjs` gate tests could not be classified at all —
 * and because a listed file that is absent from disk is also an error, adding
 * one to the manifest was not an escape. Nine tests, including the one behind
 * the nix/build-binary pairing, ran zero times and every gate reported green.
 *
 * So the assertions below are about the collector's DOMAIN rather than about
 * the manifest's contents: each extension that is legal for a script test must
 * reach the gate and be named, and anything that is not a script test must not
 * be swept in. The failure a narrowing causes is silence, so a test that only
 * counted violations would pass on the broken version.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { checkScriptTests } from "./check-script-tests";
import { RUN } from "./script-test-manifest";

/** A throwaway scripts/ tree holding only the files a test declares. */
function scriptsDir(files: readonly string[]): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-script-tests-"));
	for (const file of files) fs.writeFileSync(path.join(dir, file), "");
	return dir;
}

function withScriptsDir<T>(files: readonly string[], body: (dir: string) => T): T {
	const dir = scriptsDir(files);
	try {
		return body(dir);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

/** The gate names an offender on a line of its own; anything else is not it. */
function named(messages: readonly string[], file: string): boolean {
	return messages.some(message => message.trim() === file);
}

describe("checkScriptTests — the collector's domain", () => {
	test("every extension a script test may use is reported when unclassified", () => {
		// One row per extension, because each is a separate way to be invisible:
		// a collector listing `.ts` and `.mjs` but not `.cjs` fails only here.
		const strays = ["stray.test.ts", "stray.test.mjs", "stray.test.cjs"];
		withScriptsDir(strays, dir => {
			const { ok, messages } = checkScriptTests(dir);

			expect(ok).toBe(false);
			for (const file of strays) expect(named(messages, file)).toBe(true);
		});
	});

	test("a file that is not a script test is not swept into the report", () => {
		// The other direction, and the one a widened collector can get wrong: a
		// gate that names `helper.ts` or `notes.txt` trains people to ignore it.
		const bystanders = ["helper.ts", "notes.txt", "gate.mjs", "test-utils.js"];
		withScriptsDir(bystanders, dir => {
			const { messages } = checkScriptTests(dir);

			for (const file of bystanders) expect(named(messages, file)).toBe(false);
		});
	});

	test("a file the manifest already lists is not reported as unclassified", () => {
		// Control for the two tests above. Without a classified file present, a
		// collector that named everything would still pass them, so this is what
		// makes "reported" mean "unclassified" rather than "seen".
		const known = RUN[0].file;
		expect(known).toBeDefined();
		withScriptsDir([known, "stray.test.mjs"], dir => {
			const { messages } = checkScriptTests(dir);

			expect(named(messages, known)).toBe(false);
			expect(named(messages, "stray.test.mjs")).toBe(true);
		});
	});

	test("a manifest entry with no file behind it is reported as stale", () => {
		// The reverse direction. A renamed script otherwise leaves the gate
		// reporting on something it can no longer run, and the gate still exits
		// green because RUN is non-empty.
		withScriptsDir([], dir => {
			const { ok, messages } = checkScriptTests(dir);

			expect(ok).toBe(false);
			for (const entry of RUN) expect(named(messages, entry.file)).toBe(true);
		});
	});

	test("the real scripts/ directory is fully classified", () => {
		// The end-to-end contract, and the one that costs the most when it breaks:
		// the runner validates this before it executes anything, so a single
		// unclassified test file stops every other script test from running. This
		// is what turns that into a failure on the commit that adds the file
		// rather than a mystery the next time someone opens the runner.
		//
		// It reads the tree and asserts the gate accepts it, so it fails for
		// whoever adds the next unclassified test — which is the intended
		// direction. Reported as names, not a count, because the person who has to
		// act is the one who just added the file.
		const { ok, messages } = checkScriptTests(import.meta.dir);

		expect(messages.join("\n")).toBe("");
		expect(ok).toBe(true);
	});
});
