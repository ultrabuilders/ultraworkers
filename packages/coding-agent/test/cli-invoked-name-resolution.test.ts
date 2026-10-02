/**
 * The reserved-word hint echoes the binary that produced it, and Bun makes that
 * the RESOLVED binary, not the name the user typed.
 *
 * ## Why this is pinned rather than commented
 *
 * A reader who sees "echo the command the user typed" in a comment will try to
 * make it true. The obvious move is `process.argv[0]`, and it looks like it
 * should work — argv[0] is the program name by definition. It does not:
 *
 *   - under a bun-shebang bin, `process.argv0` is `"bun"`, not the script name;
 *   - `process.argv[0]` is the path to the bun executable, so its basename is
 *     `"bun"` as well;
 *   - a symlink is resolved before the entry script ever runs, so `argv[1]`
 *     already points at the target.
 *
 * None of that is recoverable from inside the process, which is why the code
 * says "the binary this ran as" and not "what you typed". A comment stating
 * that would not survive the next person: it reads as a limitation to be
 * removed rather than a property of the runtime to be respected. So this test
 * pins the property itself — if someone switches to reading the typed name,
 * this goes red with the resolved name and the symlink name swapped.
 *
 * It matters while the dev launcher alias exists: a developer who types `ultraworkers
 * list` through that symlink is told `ultraworkers list`. That is still the
 * honest answer — `ultraworkers` is the binary that ran — but it is a gap, and
 * it is tracked on the bead that decides the alias's fate rather than being
 * papered over here.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const CLI_COMMANDS = path.join(import.meta.dir, "..", "src", "cli-commands.ts");

describe("the reserved-word hint names the binary that ran, not the name invoked", () => {
	let dir: TempDir;
	beforeEach(() => {
		dir = TempDir.createSync("@cli-invoked-name-");
	});
	afterEach(async () => {
		await dir.remove();
	});

	/**
	 * Run a bun-shebang entry that prints the hint, through the name `invokedAs`.
	 *
	 * The entry has no extension on purpose: `invokedBinaryName()` falls back to
	 * the app name when the entry looks like a source file, so a `.ts` entry
	 * would never reach the branch under test.
	 */
	async function hintViaEntryName(entryName: string, invokedAs: string): Promise<string> {
		const real = path.join(dir.absolute(), entryName);
		const link = path.join(dir.absolute(), invokedAs);
		const body = [
			"#!/usr/bin/env bun",
			`import { reservedTopLevelWordMessage } from ${JSON.stringify(CLI_COMMANDS)};`,
			'console.log(reservedTopLevelWordMessage(["list"]) ?? "(none)");',
			"",
		].join("\n");
		await Bun.write(real, body);
		// `Bun.write` does not set the executable bit, and the shebang is only
		// honoured on an executable file.
		await Bun.spawn(["chmod", "+x", real]).exited;
		await Bun.spawn(["ln", "-sfn", real, link]).exited;
		const child = Bun.spawn([link], { stdout: "pipe", stderr: "pipe" });
		const [stdout, stderr] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
		]);
		const code = await child.exited;
		// A spawn that failed produces empty stdout, which would make every
		// assertion below fail on "contains" for a reason unrelated to the
		// contract. Name the exit code instead.
		if (code !== 0) throw new Error(`hint probe exited ${code}: ${stderr.slice(0, 500)}`);
		return stdout.trim();
	}

	it("reports the resolved entry when invoked through a differently named symlink", async () => {
		const message = await hintViaEntryName("ultraworkers", "some-other-name");

		// The positive: the resolved binary is what gets named.
		expect(message).toContain("`ultraworkers list`");
		// The pinning half. This is the assertion that fails if the code is
		// "improved" to read the typed name — which the runtime cannot supply.
		expect(message).not.toContain("some-other-name");
	});

	it("recommends the plugin command under the SAME resolved entry it echoes", async () => {
		// INVERTED 2026-10-02 — this test used to assert the recommendation stayed
		// hardcoded while the echo was substituted, which is precisely what told a
		// `bun install` / `npm i -g` / `install.sh` / nix user to run `ultraworkers plugin
		// list`, a command none of those four paths creates (epic-4yhd).
		//
		// Both clauses now derive from the same resolved entry, so the message
		// cannot tell the user to run a command from a namespace they are not in.
		// That is what makes it correct without picking a side on epic-4yhd: if an
		// `ultraworkers` alias ships, an `ultraworkers` user's resolved entry names `ultraworkers`; if it does
		// not, they are never told `ultraworkers`.
		const message = await hintViaEntryName("ultraworkers", "some-other-name");
		expect(message).toContain("`ultraworkers plugin list`");
		expect(message).not.toContain("some-other-name");
		// The pinning half, unchanged in spirit: a symlink the user typed is not
		// what the runtime can resolve, so it must not leak into the advice either.
		// Scoped to the RECOMMENDED COMMAND, not the bare token: the message ends
		// "...as a prompt", and a bare `not.toContain("ultraworkers")` matches the substring
		// inside `pr-omp-t`. Asserting the token rather than the thing it appears in
		// would have gone red on a message that is completely correct.
		expect(message).not.toContain("`omp plugin");
	});
});
