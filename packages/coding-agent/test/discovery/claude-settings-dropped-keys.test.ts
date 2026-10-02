/**
 * The warning has to actually reach a user, not just exist as a pure function.
 *
 * `foreign-settings-keys.test.ts` proves the message is well-formed. That is the easy
 * half: a function nothing calls is still dead code, and this file is the half that
 * fails if the wiring is missing. It drives the real capability loader over a real
 * `.claude/settings.json` on disk — no mocking of the provider, no direct call to
 * `loadSettings` — so it breaks if the warning stops being emitted for any reason,
 * including someone removing the call while leaving the helper intact.
 *
 * The contract is a string in `result.warnings` naming the ignored keys, and naming the
 * directories ultraworkers actually reads when `hooks` is among them.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadCapability } from "@oh-my-pi/pi-coding-agent/capability";
import { settingsCapability } from "@oh-my-pi/pi-coding-agent/capability/settings";
import { TempDir } from "@oh-my-pi/pi-utils";
// Providers register themselves as a side effect of this barrel's imports. Without it
// the Claude settings provider is simply absent from the capability, the load returns
// nothing, and every assertion below would pass for the wrong reason.
import "@oh-my-pi/pi-coding-agent/discovery";

describe("a .claude/settings.json whose keys ultraworkers does not implement", () => {
	let tempDir: TempDir;
	let cwd: string;

	beforeEach(() => {
		// A fresh project per case, not a shared one: the loader and the filesystem
		// cache what a directory held, so reusing it lets one case's file answer the
		// next case's question.
		tempDir = TempDir.createSync("@ultraworkers-claude-dropped-");
		cwd = path.join(tempDir.path(), "project");
		fs.mkdirSync(path.join(cwd, ".claude"), { recursive: true });
	});

	afterEach(() => {
		tempDir.removeSync();
	});

	async function writeSettings(contents: unknown): Promise<void> {
		fs.writeFileSync(path.join(cwd, ".claude", "settings.json"), JSON.stringify(contents));
	}

	/**
	 * Warnings belonging to THIS test's project only.
	 *
	 * `loadCapability` resolves the user's home config from the real `os.homedir()`, with
	 * no way to point it elsewhere — so a developer's own `~/.claude/settings.json` can
	 * contribute warnings here. Matching on this test's temp cwd keeps the assertions
	 * about what this test wrote, instead of about whoever is running it.
	 */
	function warningsForThisProject(warnings: readonly string[] | undefined): string[] {
		return (warnings ?? []).filter(w => w.includes(cwd));
	}

	function load(): Promise<{ warnings?: string[] }> {
		return loadCapability<Record<string, unknown>>(settingsCapability.id, { cwd });
	}

	it("warns that a `hooks` block in the file is ignored, and says where hooks really live", async () => {
		await writeSettings({ hooks: { PreToolUse: [{ matcher: "Bash" }] } });

		const warnings = warningsForThisProject((await load()).warnings);
		const hookWarning = warnings.find(w => w.includes("hooks"));

		// The whole point of the item: without this line the user's `hooks` block is a
		// no-op that looks configured. The warning has to carry the actual answer.
		expect(hookWarning).toBeDefined();
		expect(hookWarning).toContain("hooks/pre/");
		expect(hookWarning).toContain("hooks/post/");
	});

	it("stays silent for a settings file ultraworkers fully understands", async () => {
		// The negative half. A warning that fires on every clean file would train users
		// to ignore it, which defeats the warning entirely — so silence here is load-bearing.
		//
		// An empty object rather than a file naming some setting: that keeps the
		// assertion about "nothing was dropped" instead of about which ids happen to be
		// registered today, so it does not rot when the registry changes.
		await writeSettings({});

		expect(warningsForThisProject((await load()).warnings)).toEqual([]);
	});

	it("lists other unimplemented keys without volunteering hook advice", async () => {
		// The scope boundary, proven through the real loader rather than the pure
		// helper: mentioning `hooks/pre/` for a file that never mentioned hooks would
		// send users looking for a feature they did not ask about.
		await writeSettings({ permissions: {}, statusLine: {} });

		const warnings = warningsForThisProject((await load()).warnings);
		const warning = warnings.find(w => w.includes("permissions"));

		expect(warning).toBeDefined();
		expect(warning).not.toContain("hooks/pre/");
	});
});
