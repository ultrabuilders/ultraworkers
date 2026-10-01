/**
 * `.claude/settings.json` is a REAL config layer, so it half-works — and that is the trap.
 *
 * omp registers that file at `config/settings.ts:1118`, so every setting key it knows
 * takes effect from it. But `hooks` is not among them: `discovery/claude.ts:385`
 * `loadHooks()` reads the `hooks/pre/` and `hooks/post/` DIRECTORIES and nothing else.
 * A user who writes a perfectly valid `hooks` block gets no error — the typo guard
 * `assertKnownSettingPaths` only runs on the constructor `--config` layer
 * (`settings.ts:683`), never on file layers — and no effect either.
 *
 * The failure is "the system looks configured, and nothing changed", which is the shape
 * M4 exists to name. The fix is to SAY SO, not to teach omp Claude Code's hooks dialect:
 * bridging that is a larger product decision than this item, and `loadHooks` stays
 * exactly as it is.
 *
 * What is asserted here is the message a user would read. If it merely listed unknown
 * keys without saying what omp actually reads, the user would still have to guess.
 */
import { describe, expect, it } from "bun:test";
import { droppedForeignKeys, foreignSettingsWarning } from "@oh-my-pi/pi-coding-agent/config/foreign-settings-keys";

const KNOWN = new Set(["model", "theme", "tools"]);

describe("a settings file belonging to another tool", () => {
	it("reports the keys omp does not implement, and only those", () => {
		const dropped = droppedForeignKeys({ model: "x", theme: "dark", permissions: {}, statusLine: {} }, KNOWN);

		// The negative half matters as much: a key omp DOES implement must never be
		// reported as dropped, or every user of .claude/settings.json gets noise about
		// settings that are demonstrably working.
		expect(dropped).toEqual(["permissions", "statusLine"]);
	});

	it("returns nothing for a file omp fully understands", () => {
		// Without this row, "always reports something" would satisfy the test above.
		expect(droppedForeignKeys({ model: "x", theme: "dark" }, KNOWN)).toEqual([]);
	});

	it("names the directories omp actually reads when `hooks` is the dropped key", () => {
		// The row that gives the warning its point. A user who wrote a `hooks` block
		// needs to learn WHERE omp looks, or they will keep editing a file that is
		// never consulted for hooks.
		const warning = foreignSettingsWarning("/repo/.claude/settings.json", ["hooks", "permissions"]);

		expect(warning).toContain("hooks");
		expect(warning).toContain("hooks/pre/");
		expect(warning).toContain("hooks/post/");
	});

	it("does not volunteer hook advice when `hooks` is not among the dropped keys", () => {
		// The scope boundary the bead draws: the directories are only mentioned when
		// `hooks` is actually the thing that was ignored. Otherwise every unrelated
		// unknown key drags along advice about a feature the user never asked about.
		const warning = foreignSettingsWarning("/repo/.claude/settings.json", ["permissions"]);

		expect(warning).toContain("permissions");
		expect(warning).not.toContain("hooks/pre/");
	});

	it("says nothing at all when there is nothing dropped", () => {
		// No warning is the correct output for a clean file — silence here is the
		// signal that everything landed.
		expect(foreignSettingsWarning("/repo/.claude/settings.json", [])).toBeNull();
	});

	it("survives a settings file that is not an object", () => {
		// `.claude/settings.json` is user-editable and shared across tools; a stray
		// array or string must not turn the warning into a crash on session start.
		expect(droppedForeignKeys(["not", "an", "object"], KNOWN)).toEqual([]);
		expect(droppedForeignKeys(null, KNOWN)).toEqual([]);
	});
});
