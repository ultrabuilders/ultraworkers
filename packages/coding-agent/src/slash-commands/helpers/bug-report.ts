/**
 * `/bug-report` — build a redacted bug-report bundle and archive it locally.
 *
 * Two things this deliberately does NOT do:
 *
 * - **No upload.** There is no issue-tracker target this work item establishes,
 *   and inventing one would be inventing an endpoint. Delivery is an explicit
 *   choice the user makes; the only route wired here is a local archive.
 * - **No implicit transcript.** The session transcript is the user's own data,
 *   so it is opt-in per invocation and defaults to not shipping.
 */

import type { Effort } from "@oh-my-pi/pi-ai";
import { getAgentDir } from "@oh-my-pi/pi-utils";
import { shortenPath } from "@oh-my-pi/pi-tui/render/render-utils";
import { bugReportArchiveFileName, type BugReportBundle, writeBugReportArchive } from "../../diagnostics/bug-report";
import { collectBugReportDiagnostics, collectBugReportMetadata } from "../../diagnostics/collect";
import { readCrashLog, takeUnnotifiedCrash } from "../../diagnostics/crash-log";
import type { SlashCommandRuntime } from "../types";
import { commandConsumed } from "./parse";

/** Where archives land, so the user can find them without reading this file. */
export function bugReportDirectory(): string {
	return `${getAgentDir()}/bug-reports`;
}

/**
 * Assemble the bundle. `includeSession` is the user's answer to the transcript
 * prompt; it is not inferred from anything.
 */
export async function buildBugReportBundle(
	runtime: SlashCommandRuntime,
	options: { hint?: string; includeSession: boolean },
): Promise<BugReportBundle> {
	const metadata = collectBugReportMetadata({
		sessionId: runtime.sessionManager.getSessionId() ?? "unknown",
		cwd: runtime.cwd,
		includeSession: options.includeSession,
		includeSummary: false,
		messageCount: runtime.session.getSessionStats?.().totalMessages ?? 0,
		thinkingLevel: "medium" as Effort,
		extensions: [],
		extensionErrors: [],
		globalSettings: runtime.settings,
		projectSettings: runtime.settings,
		...(options.hint ? { hint: options.hint } : {}),
	});
	return {
		metadata,
		diagnostics: collectBugReportDiagnostics(runtime.sessionManager, readCrashLog()),
		// Read the contents only when the user opted in; the collector's own gate
		// would omit the file either way, but not reading it at all is clearer
		// about what happened.
		...(options.includeSession ? { sessionJsonl: await readSessionJsonl(runtime) } : {}),
	};
}

async function readSessionJsonl(runtime: SlashCommandRuntime): Promise<string | undefined> {
	const path = runtime.sessionManager.getSessionFile?.();
	if (!path) return undefined;
	const file = Bun.file(path);
	if (!(await file.exists())) return undefined;
	return await file.text();
}

/** Write the archive and return its path, or undefined when it could not be written. */
export async function writeBundleArchive(bundle: BugReportBundle): Promise<string | undefined> {
	const destination = `${bugReportDirectory()}/${bugReportArchiveFileName(bundle.metadata.id)}`;
	try {
		await writeBugReportArchive(bundle, destination);
		return destination;
	} catch {
		// A failed archive must not take the session down; the bundle is still
		// reportable by hand and the caller reports that it was not written.
		return undefined;
	}
}

/** Surface any crash recorded since the user last saw one, without consuming it. */
export function pendingCrashNotice(runtime: SlashCommandRuntime): string | undefined {
	const crash = takeUnnotifiedCrash();
	if (!crash) return undefined;
	return `Last crash: ${crash.message}${crash.cwd ? ` (${shortenPath(crash.cwd)})` : ""}`;
}

/** Files the bundle produced, for the confirmation text. */
/**
 * The transcript opt-in, read from the command's own flags. `/bug-report
 * --session` asks for it; anything else — including a bare `/bug-report` — does
 * not ship it. Parsed rather than inferred so the default is visibly closed.
 */
export function hasSessionOptIn(command: { args?: string }): boolean {
	const args = command.args?.split(/\s+/) ?? [];
	return args.includes("--session") || args.includes("--with-session");
}

export function reportWritten(path: string): string {
	return `Wrote ${shortenPath(path)}`;
}

export { commandConsumed };
