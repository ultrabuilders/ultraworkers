/**
 * Reporting for settings files ultraworkers shares with other tools.
 *
 * `.claude/settings.json` is registered as a real config layer, which makes it a
 * half-open door: every key ultraworkers implements takes effect from it, and every key it
 * does not is discarded without a word. The `hooks` key is the one that bites — a
 * user can write a valid Claude Code `hooks` block, see no error, and get no hooks,
 * because `loadHooks` reads the `hooks/pre/` and `hooks/post/` directories instead.
 *
 * This module exists to turn that silence into one sentence. It deliberately does NOT
 * teach ultraworkers another tool's hooks dialect: bridging `hooks.json` is a product decision
 * larger than this, and the loader is left alone.
 */

/** `hooks` is called out separately because ultraworkers implements a different shape of it. */
const HOOKS_KEY = "hooks";

/**
 * Top-level keys in a foreign settings file that ultraworkers does not implement.
 *
 * Order follows the file, so the warning a user reads lists their keys in the order
 * they wrote them rather than an arbitrary reshuffle.
 */
export function droppedForeignKeys(raw: unknown, knownSettingIds: ReadonlySet<string>): string[] {
	// A shared, hand-edited file can be an array or a bare string; that is not an error
	// worth crashing a session start over, and there is nothing to report either.
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return [];
	return Object.keys(raw).filter(key => !knownSettingIds.has(key));
}

/**
 * The warning to show for a foreign settings file, or `null` when it has nothing to
 * report. `null` is the normal case and means "everything in this file landed".
 */
export function foreignSettingsWarning(filePath: string, dropped: readonly string[]): string | null {
	if (dropped.length === 0) return null;

	const listed = dropped.join(", ");
	const hooksIgnored = dropped.includes(HOOKS_KEY);
	const hookAdvice = hooksIgnored
		? ` In particular, ultraworkers reads hooks from the ${HOOKS_KEY}/pre/ and ${HOOKS_KEY}/post/ directories, ` +
			`not from this file's \`${HOOKS_KEY}\` key.`
		: "";

	return `${filePath} sets keys ultraworkers does not implement and ignored: ${listed}.${hookAdvice}`;
}
