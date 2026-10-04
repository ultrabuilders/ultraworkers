import * as fs from "node:fs";
import { $which, APP_NAME, getLogsDir, getProjectDir } from "@oh-my-pi/pi-utils";
import { getAvailableThemes, getBuiltinThemes, resolveThemeJson } from "@oh-my-pi/pi-tui/theme";
import type { CheckOutcome, DoctorCheck } from "./types";
import { isUnavailable } from "./types";
import { allBuiltinToolFactories, BUILTIN_TOOLS, HIDDEN_TOOLS } from "../../tools";
import { getEnabledPlugins, resolvePluginManifestEntries } from "./loader";
/**
 * The mode the logger enforces on the log directory.
 *
 * Duplicated as a named constant rather than imported from `logger.ts` because
 * that module's `ensureDir` is private, and a diagnostic that has to reach into a
 * logging module's internals to read a permission bit is a diagnostic that will
 * break when the logger is refactored. The two must agree; `logger.ts` documents
 * the same `0o700` at its own `ensureDir`, and the check below reports the observed
 * mode so a divergence surfaces as a finding rather than as a wrong "ok".
 */
const EXPECTED_LOG_DIR_MODE = 0o700;

/**
 * What the seam checks read. Defaults to the live registries; a caller may pass a
 * snapshot so a test can present a broken state without editing this module.
 *
 * That the doctor needed this is the finding rather than an inconvenience: a
 * tool whose job is catching a broken registry cannot itself be checked for a
 * broken registry, because it read everything live and offered no seam to
 * present a failure through. Proving the failure branch therefore meant editing
 * the source — which is how a background run once left the tree broken.
 */
export interface DoctorSnapshot {
	/** Theme names the loader would list, excluding the shipped built-ins. */
	readonly themes: readonly string[];
	/** Resolve a theme by name; undefined when it will not load. */
	resolveTheme(name: string): unknown;
	/** First-party tool factories registered at runtime, excluding the literals. */
	readonly builtinTools: readonly string[];
	/**
	 * POSIX mode bits of the log directory, or `undefined` when it does not exist
	 * yet. `undefined` is a distinct third state from `0o700` and from a loose
	 * mode: a fresh profile has no log directory because the logger creates it
	 * lazily on first write, so a check that treated "absent" as a failure would
	 * report a problem where there is nothing yet to protect.
	 */
	readonly logDirMode?: number;
	/**
	 * Mode the logger will enforce when it does create the directory. Optional
	 * because callers that predate this check pass partial snapshots; omitting it
	 * falls back to {@link EXPECTED_LOG_DIR_MODE} rather than reporting against
	 * `undefined`.
	 */
	readonly expectedLogDirMode?: number;
	/**
	 * Extension modules a loaded plugin declared but that did not load, with the
	 * reason each one failed.
	 *
	 * Populated by resolving manifest entries rather than by importing them: a
	 * diagnostic that ran every installed extension's module would execute
	 * arbitrary third-party code to answer "is anything broken", which is a worse
	 * failure than the one it reports. Install refuses an entry that resolves to
	 * nothing (`MarketplaceManager#validateInstalledExtensions`); this is the same
	 * question asked again afterwards, because a plugin that passed install can
	 * still lose its entry file to a partial upgrade or a pruned tree.
	 *
	 * Optional for the same reason {@link logDirMode} is: a caller that predates
	 * this check passes a partial snapshot, and `undefined` means "not observed"
	 * rather than "nothing is broken". The check reports nothing in that case
	 * instead of manufacturing an all-clear.
	 */
	readonly extensionLoadErrors?: ReadonlyArray<{ path: string; error: string }>;
}

async function liveSnapshot(): Promise<DoctorSnapshot> {
	// "Shipped with the product" and "active as a builtin" are different
	// questions, and the second is not the same set. The session's
	// `LiveToolRecord.source === "builtin"` means ACTIVE: `#builtInToolNames` is
	// fed by runtime registration (`activateVibeTools`, the reconcile paths), so
	// it includes tools that were never in the literals. Comparing against
	// BUILTIN_TOOLS is what makes this a report of registrations rather than a
	// reprint of the table — but if this ever reuses `source`, it will be wrong.
	const builtinThemes = new Set(Object.keys(getBuiltinThemes()));
	const builtinTools = new Set([...Object.keys(BUILTIN_TOOLS), ...Object.keys(HIDDEN_TOOLS)]);
	return {
		themes: (await getAvailableThemes()).filter(name => !builtinThemes.has(name)),
		resolveTheme: name => resolveThemeJson(name),
		builtinTools: Object.keys(allBuiltinToolFactories()).filter(name => !builtinTools.has(name)),
		extensionLoadErrors: await findPluginExtensionFailures(),
		// Path-only: `getLogsDir()` computes the location and creates nothing, so
		// asking what its mode is cannot bring the directory into existence. Reading
		// it after an `ensureDir` would report the mode the logger just enforced and
		// therefore never find the problem this check exists to find.
		...(await readLogDirMode()),
		expectedLogDirMode: 0o700,
	};
}

/**
 * The log directory's mode bits, or `undefined` when it is not there.
 *
 * `stat` throws `ENOENT` for a directory the logger has not created yet, which is
 * every fresh profile — the sink is built lazily on first write. That is reported
 * as "no directory yet" rather than as a failure, because a directory that does not
 * exist exposes nothing to any other account on the machine.
 */
async function readLogDirMode(): Promise<{ logDirMode?: number }> {
	if (process.platform === "win32") return {};
	try {
		// `fs.promises.stat` rather than a sync call: this runs inside an async
		// collector that already awaits the theme loader.
		const stat = await fs.promises.stat(getLogsDir());
		// `mode & 0o777` because stat carries the file-type bits in the same field.
		return { logDirMode: stat.mode & 0o777 };
	} catch {
		// Absent, or unreadable for a reason this check does not own. Either way
		// there is no observed mode to report, and the caller says so out loud.
		return {};
	}
}

/**
 * Declared extension entries of every enabled plugin that resolve to nothing.
 *
 * Resolution is filesystem-only — `resolvePluginManifestEntries` stats each entry
 * and returns `resolvedPath: null` for one that is not there. Nothing is
 * imported, so this answers "is the tree intact?" without running a line of
 * third-party code.
 *
 * The `catch` is not defensive padding: reading the lockfile or walking
 * `node_modules` can fail on a half-written install, and a diagnostic that
 * throws while looking for a problem reports no diagnosis at all. Returning `[]`
 * there would be a false all-clear, so it is recorded as an entry that failed to
 * resolve rather than swallowed.
 */
async function findPluginExtensionFailures(): Promise<Array<{ path: string; error: string }>> {
	let plugins;
	try {
		// `getProjectDir()`, not `process.cwd()`. The CLI resolves the project once and
		// `--cwd` (and the auto-chdir away from $HOME) sets it there WITHOUT calling
		// `process.chdir`, so the two disagree exactly when the user pointed the run
		// somewhere. `process.cwd()` would then scan the directory they launched from
		// and report it healthy while the tree they asked about is the broken one.
		// Every other plugin-discovery caller already passes a resolved project dir;
		// this was the only one reading the process cwd directly.
		plugins = await getEnabledPlugins(getProjectDir());
	} catch (err) {
		return [{ path: "<plugin registry>", error: `could not be read: ${String(err)}` }];
	}

	const failures: Array<{ path: string; error: string }> = [];
	for (const plugin of plugins) {
		for (const { entry, resolvedPath } of resolvePluginManifestEntries(plugin, "extensions")) {
			if (resolvedPath === null) {
				failures.push({
					path: `${plugin.name}: ${entry}`,
					error: "declared extension entry not found on disk",
				});
			}
		}
	}
	return failures;
}

export async function runDoctorChecks(snapshot?: DoctorSnapshot): Promise<DoctorCheck[]> {
	const snap = snapshot ?? (await liveSnapshot());
	const checks: DoctorCheck[] = [];

	// Check external tools
	const tools = [
		{ name: "sd", description: "Find-replace" },
		{ name: "sg", description: "AST-grep" },
		{ name: "git", description: "Version control" },
	];

	for (const tool of tools) {
		const path = $which(tool.name);
		checks.push({
			name: tool.name,
			status: path ? "ok" : "warning",
			message: path ? `Found at ${path}` : `${tool.description} not found - some features may be limited`,
		});
	}

	// Check API keys
	const apiKeys = [
		{ name: "ANTHROPIC_API_KEY", description: "Anthropic API" },
		{ name: "OPENAI_API_KEY", description: "OpenAI API" },
		{ name: "EXA_API_KEY", description: "Exa search" },
	];

	for (const key of apiKeys) {
		const hasKey = !!Bun.env[key.name];
		checks.push({
			name: key.name,
			status: hasKey ? "ok" : "warning",
			message: hasKey ? "Configured" : `Not set - ${key.description} unavailable`,
		});
	}

	checks.push(...checkExtensionSeams(snap));
	checks.push(checkLogDirPermissions(snap));

	return checks;
}

/**
 * Report the log directory's real permissions, not the ones the logger intends.
 *
 * The logger creates the directory `0o700` and re-asserts it on every write, so the
 * interesting case is a directory that predates that: `mkdirSync`'s `mode` applies
 * only to a directory the call creates, so a logs directory left by an older build
 * keeps whatever mode it was born with, and it is the directory holding the most
 * accumulated transcripts. A log line can carry a request header, a resolved URL, or
 * a tool argument, and a group- or world-readable log directory hands those to every
 * other account on the machine.
 *
 * The mode is read before the logger runs, so this reports the state on disk rather
 * than the state the logger would impose.
 */
function checkLogDirPermissions(snap: DoctorSnapshot): DoctorCheck {
	// Defaulted rather than trusted: this snapshot field was added after callers
	// were already passing partial snapshots, and a required field that a runtime
	// value can be missing anyway is not a contract — it is a crash waiting for the
	// first caller that predates it. `EXPECTED_LOG_DIR_MODE` is the same constant the
	// logger enforces, so a caller that omits it gets the real contract rather than
	// a silently different one.
	const expected = snap.expectedLogDirMode ?? EXPECTED_LOG_DIR_MODE;
	const actual = snap.logDirMode;
	if (actual === undefined) {
		// Not a failure and not a pass: nothing exists to expose yet. Reported so a
		// reader is never left wondering whether the check ran.
		return {
			name: "logs:permissions",
			status: "ok",
			message: `No log directory yet; it will be created ${formatMode(expected)} on first write`,
		};
	}
	if (actual === expected) {
		return { name: "logs:permissions", status: "ok", message: `Log directory is ${formatMode(actual)}` };
	}
	// Group- and world-readable are the cases worth stopping a user over; owner-only
	// but not exactly 0700 is tighter than the contract, not looser, so it is not
	// reported as a problem.
	const exposed = (actual & 0o077) !== 0;
	return {
		name: "logs:permissions",
		status: exposed ? "error" : "warning",
		message: exposed
			? `Log directory is ${formatMode(actual)} — readable by other accounts on this machine. It holds request headers, URLs and tool arguments. The logger re-asserts ${formatMode(expected)} on its next write; run \`${APP_NAME} doctor --fix\` now to narrow it.`
			: `Log directory is ${formatMode(actual)}, not the expected ${formatMode(expected)} (owner-only, so nothing is exposed)`,
	};
}

/** Render mode bits the way `ls -l` would, so the message is comparable at a glance. */
function formatMode(mode: number): string {
	return `0${mode.toString(8).padStart(3, "0")}`;
}

/**
 * Report what the extension seams currently hold.
 *
 * A registry that accepted a registration and is never consulted is a dead seam
 * wearing a live one: nothing throws, and the only symptom is a tool or theme
 * that silently never appears. Every check here answers a question a user could
 * otherwise only answer by noticing something missing.
 */
function checkExtensionSeams(snap: DoctorSnapshot): DoctorCheck[] {
	const checks: DoctorCheck[] = [];

	const themes = [...snap.themes];
	checks.push({
		name: "seam:themes",
		status: "ok",
		message:
			themes.length === 0
				? "No themes registered by extensions"
				: `${themes.length} theme(s) registered: ${themes.join(", ")}`,
	});

	const tools = [...snap.builtinTools];
	checks.push({
		name: "seam:tools",
		status: "ok",
		message:
			tools.length === 0
				? "No first-party tools registered at runtime"
				: `${tools.length} first-party tool(s) registered: ${tools.join(", ")}`,
	});

	// The one check that can fail. A registered theme that no longer resolves is
	// a registration that will never apply, and nothing else in the system would
	// say so.
	const resolvable = themes.filter(name => snap.resolveTheme(name) !== undefined);
	if (resolvable.length !== themes.length) {
		const broken = themes.filter(name => !resolvable.includes(name));
		checks.push({
			name: "seam:themes-resolve",
			status: "error",
			message: `Registered but not resolvable: ${broken.join(", ")} — these themes will never load`,
		});
	}

	// A plugin that passed install can still lose its entry file afterwards, and
	// nothing else reports it: `plugin list` reads the lockfile, which still names
	// the plugin, and the symptom is a tool, command and hook that are simply
	// absent. `undefined` means the caller never looked, which is a different
	// claim from "nothing is broken", so that case contributes no row rather than
	// an all-clear manufactured from a missing field.
	const loadErrors = snap.extensionLoadErrors;
	if (loadErrors !== undefined) {
		checks.push({
			name: "seam:extensions-load",
			status: loadErrors.length === 0 ? "ok" : "error",
			message:
				loadErrors.length === 0
					? "Every plugin extension entry resolves on disk"
					: loadErrors.map(f => `${f.path} — ${f.error}`).join("; "),
		});
	}

	return checks;
}

/**
 * How a report is coloured and written.
 *
 * Injected rather than imported so the formatter is a pure function of
 * `(checks, styles)`. A renderer that reaches for `chalk` and `console` cannot be
 * exercised without a terminal, which is why the two earlier renderers each got a
 * case wrong while staying green — the branch that mattered was only reachable
 * from a live TTY.
 */
export interface DoctorReportStyles {
	/** Bold heading drawn before the check lines. */
	heading(text: string): string;
	/** A check that passed. */
	ok(icon: string): string;
	/** A check that reported a warning. */
	warning(icon: string): string;
	/** A check that reported an error. */
	error(icon: string): string;
	/** Dimmed text, used for the "fixed" note and the advice line. */
	dim(text: string): string;
}

/** Icons per status, passed in beside the styles so both stay host decisions. */
export interface DoctorReportIcons {
	readonly ok: string;
	readonly warning: string;
	readonly error: string;
	/** Marks a check whose premise was missing, which is not a failure. */
	readonly unavailable: string;
	/** Bullet for the per-check "fixed" note. */
	readonly fixed: string;
}

/**
 * Title for the report.
 *
 * A parameter rather than a fixed string because the heading is the caller's
 * choice — "Health Check" alone is wrong under `ultraworkers plugin doctor`, which reports
 * on plugins. Passing it in keeps the formatter from silently renaming the
 * command a user typed.
 */
export interface DoctorReportOptions {
	/** Heading drawn above the check lines. */
	readonly heading: string;
}

/** What a report says, and what it implies for the process exit code. */
export interface DoctorReport {
	/** Every line of the report, in the order it should be printed. */
	readonly lines: readonly string[];
	/**
	 * Errors that `--fix` did not repair — the exit-code input.
	 *
	 * Counted here rather than by the caller so the number in the summary and the
	 * number that decides the exit can never disagree.
	 */
	readonly errors: number;
	/** Per-bucket counts. They partition the checks; see the note below. */
	readonly counts: {
		readonly ok: number;
		readonly warning: number;
		readonly error: number;
		readonly fixed: number;
		readonly unavailable: number;
	};
}

/**
 * Render check outcomes as text, plus the exit code they imply.
 *
 * ## Why this is separate from running the checks
 *
 * `runDoctorChecks` needs a filesystem, a `PATH` and the live registries. The
 * *shape* of a report — which bucket each check lands in, and what the summary
 * says — needs none of that, and it is the part that has been wrong before.
 *
 * ## The partition
 *
 * The five buckets partition the outcomes; every check is counted exactly once.
 * `fixed` is a bucket and not an overlay, which is what the earlier renderer got
 * wrong: only errors and warnings excluded `fixed`, so a check reported as
 * `status: "ok", fixed: true` — which a real `--fix` does emit when it restores
 * an orphaned plugin — was counted twice, and the summary named more checks than
 * were printed. The buckets only summed correctly while nothing had been fixed,
 * which is exactly when nobody reads the summary.
 *
 * `unavailable` is named rather than folded into `ok`. A check that never ran is
 * not a pass, and folding it in made a partial run look like complete coverage.
 */
export function formatDoctorResults(
	checks: readonly CheckOutcome[],
	styles: DoctorReportStyles,
	icons: DoctorReportIcons,
	options: DoctorReportOptions = { heading: "Health Check" },
): DoctorReport {
	// `unavailable` FIRST. It is a separate member of the union, not a fourth
	// status, so this branch is forced by the compiler: a renderer that forgot it
	// would not compile.
	const unavailable = checks.filter(isUnavailable);
	const settled = checks.filter(check => !isUnavailable(check));

	const fixed = settled.filter(check => check.fixed).length;
	const errors = settled.filter(check => check.status === "error" && !check.fixed).length;
	const warnings = settled.filter(check => check.status === "warning" && !check.fixed).length;
	const ok = settled.filter(check => check.status === "ok" && !check.fixed).length;

	const lines: string[] = [styles.heading(options.heading), ""];
	for (const check of checks) {
		if (isUnavailable(check)) {
			lines.push(`${styles.dim(icons.unavailable)} ${check.name}: ${check.message}`);
			continue;
		}
		const icon =
			check.status === "ok"
				? styles.ok(icons.ok)
				: check.status === "warning"
					? styles.warning(icons.warning)
					: styles.error(icons.error);
		lines.push(`${icon} ${check.name}: ${check.message}`);
		if (check.fixed) lines.push(styles.dim(`  ${icons.fixed} Fixed`));
	}

	lines.push("");
	lines.push(
		`Summary: ${ok} ok, ${warnings} warnings, ${errors} errors${fixed > 0 ? `, ${fixed} fixed` : ""}` +
			`${unavailable.length > 0 ? `, ${unavailable.length} not checked` : ""}`,
	);
	if (errors > 0) lines.push(styles.dim("Run with --fix to attempt automatic repair"));

	return {
		lines,
		errors,
		counts: { ok, warning: warnings, error: errors, fixed, unavailable: unavailable.length },
	};
}
