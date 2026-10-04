/**
 * The shape of a bug-report bundle and how it turns into an archive.
 *
 * Two independent opt-in gates control whether a transcript ships, and neither
 * is the `metadata.session.included` boolean — that one is advisory only. A
 * transcript is the user's data, and redaction is defence in depth, never
 * permission: the cwd is spread into the session object only when the caller
 * says the transcript is going in, and `session.jsonl` is only ever a file when
 * the caller actually supplied its contents.
 */

import { writeArchive } from "@oh-my-pi/pi-utils/ar";
import type { CrashRecord } from "./crash-log";

export const BUG_REPORT_SCHEMA_VERSION = 1;
export const BUG_REPORT_CUSTOM_ENTRY_TYPE = "ultraworkers.bug-report";

/** One recorded assistant turn that failed, aborted, or carried diagnostics. */
export interface BugReportAssistantEntry {
	entryId: string;
	timestamp: string | number;
	provider?: string;
	model?: string;
	api?: string;
	stopReason?: string;
	rawStopReason?: string;
	errorMessage?: string;
	diagnostics: unknown[];
}

export interface BugReportMetadata {
	schemaVersion: number;
	id: string;
	createdAt: string;
	hint: string | null;
	environment: Record<string, unknown>;
	session: {
		id: string;
		/** Advisory only — not a gate. The gate is whether cwd is present at all. */
		included: boolean;
		summaryIncluded: boolean;
		messageCount: number;
		cwd?: string;
	};
	model: Record<string, unknown> | null;
	provider: Record<string, unknown> | null;
	thinkingLevel: string;
	extensions: Array<Record<string, unknown>>;
	extensionErrors: Array<{ path: string; error: string }>;
	settings: { global: unknown; project: unknown };
}

export interface BugReportDiagnostics {
	schemaVersion: number;
	sessionId: string;
	entryCount: number;
	assistantMessageCount: number;
	assistant: BugReportAssistantEntry[];
	crashes: CrashRecord[];
}

export interface BugReportBundle {
	metadata: BugReportMetadata;
	diagnostics: BugReportDiagnostics;
	sessionJsonl?: string;
	summary?: string;
}

export interface BugReportFile {
	name: string;
	contentType: string;
	data: string;
}

/** Files shared by every delivery route. */
export function bugReportFiles(bundle: BugReportBundle): BugReportFile[] {
	const files: BugReportFile[] = [
		{
			name: "report.json",
			contentType: "application/json",
			data: `${JSON.stringify(bundle.metadata, null, 2)}\n`,
		},
		{
			name: "diagnostics.json",
			contentType: "application/json",
			data: `${JSON.stringify(bundle.diagnostics, null, 2)}\n`,
		},
	];
	// The transcript is a file only when its contents were supplied. Checking the
	// advisory boolean instead would ship an empty transcript nobody asked for.
	if (bundle.sessionJsonl !== undefined) {
		files.push({ name: "session.jsonl", contentType: "application/x-ndjson", data: bundle.sessionJsonl });
	}
	if (bundle.summary !== undefined) {
		files.push({
			name: "summary.md",
			contentType: "text/markdown",
			data: bundle.summary.endsWith("\n") ? bundle.summary : `${bundle.summary}\n`,
		});
	}
	return files;
}

/**
 * Writes the bundle as a zip. Uses the shared archive writer rather than pi's
 * private `writeZipArchive` — one implementation of "make a zip", not two.
 */
export function writeBugReportArchive(bundle: BugReportBundle, filePath: string): Promise<void> {
	return writeArchive(
		filePath,
		"zip",
		bugReportFiles(bundle).map(file => [file.name, file.data] as const),
	);
}

export function bugReportArchiveFileName(id: string): string {
	return `ultraworkers-bug-report-${id}.zip`;
}
