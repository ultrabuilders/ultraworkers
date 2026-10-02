import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	BUG_REPORT_CUSTOM_ENTRY_TYPE,
	BUG_REPORT_SCHEMA_VERSION,
	type BugReportBundle,
	bugReportFiles,
	bugReportArchiveFileName,
} from "../../src/diagnostics/bug-report";
import { clearCrashLog, readCrashLog, recordCrash, takeUnnotifiedCrash } from "../../src/diagnostics/crash-log";

function bundle(overrides: Partial<BugReportBundle> = {}): BugReportBundle {
	return {
		metadata: {
			schemaVersion: BUG_REPORT_SCHEMA_VERSION,
			id: "abc",
			createdAt: "2026-09-30T00:00:00.000Z",
			hint: null,
			environment: { platform: "darwin" },
			// Advisory flag is ON, but no contents supplied — see the gate test below.
			session: { id: "s1", included: true, summaryIncluded: false, messageCount: 3 },
			model: null,
			provider: null,
			thinkingLevel: "medium",
			extensions: [],
			extensionErrors: [],
			settings: { global: {}, project: {} },
		},
		diagnostics: {
			schemaVersion: BUG_REPORT_SCHEMA_VERSION,
			sessionId: "s1",
			entryCount: 7,
			assistantMessageCount: 3,
			assistant: [{ entryId: "e1", timestamp: 1_700_000_000_000, diagnostics: [] }],
			crashes: [],
		},
		...overrides,
	};
}

describe("bugReportFiles", () => {
	// A test asserting only "no secret is present" passes trivially against an
	// empty bundle, proving nothing. Assert that ordinary diagnostics survive.
	test("carries real diagnostics content, not just an absence of secrets", () => {
		const files = bugReportFiles(bundle());
		const report = files.find(file => file.name === "report.json");

		expect(report).toBeDefined();
		const parsed = JSON.parse(report!.data) as { environment: Record<string, unknown>; session: { id: string } };
		expect(parsed.environment.platform).toBe("darwin");
		expect(parsed.session.id).toBe("s1");
	});

	// The gate is the presence of contents, not the advisory `included` boolean.
	// This bundle deliberately sets included: true with no transcript supplied,
	// which is the exact case where checking the flag would leak a file.
	test("omits session.jsonl when no transcript contents were supplied", () => {
		const names = bugReportFiles(bundle()).map(file => file.name);
		expect(names).not.toContain("session.jsonl");
	});

	test("includes session.jsonl once the transcript is supplied", () => {
		const names = bugReportFiles(bundle({ sessionJsonl: '{"role":"user"}\n' })).map(file => file.name);
		expect(names).toContain("session.jsonl");
	});

	test("names archives in this project's namespace", () => {
		expect(bugReportArchiveFileName("abc")).toBe("omp-bug-report-abc.zip");
		expect(BUG_REPORT_CUSTOM_ENTRY_TYPE).toBe("omp.bug-report");
	});
});

describe("crash ring", () => {
	let dir: string;
	let file: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-crash-"));
		file = path.join(dir, "crashes.json");
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	test("records a crash and hands it out exactly once", () => {
		const recorded = recordCrash({ kind: "uncaught_exception", error: new Error("boom"), cwd: "/tmp" }, file);
		expect(recorded?.message).toBe("boom");
		expect(readCrashLog(file)).toHaveLength(1);

		// First read announces it; a second read must not re-surface the same crash,
		// otherwise the user is nagged about a crash they have already been shown.
		expect(takeUnnotifiedCrash(file)?.message).toBe("boom");
		expect(takeUnnotifiedCrash(file)).toBeUndefined();
	});

	test("keeps only the newest records", () => {
		for (let i = 0; i < 8; i++) {
			recordCrash({ kind: "fatal_error", error: new Error(`crash-${i}`), cwd: "/tmp" }, file);
		}
		const records = readCrashLog(file);
		expect(records).toHaveLength(5);
		expect(records.at(-1)?.message).toBe("crash-7");
	});

	test("returns an empty ring for a missing or corrupt log instead of throwing", () => {
		expect(readCrashLog(path.join(dir, "absent.json"))).toEqual([]);
		fs.writeFileSync(file, "{not json");
		expect(readCrashLog(file)).toEqual([]);
	});

	test("clearCrashLog removes the ring", () => {
		recordCrash({ kind: "fatal_error", error: new Error("x"), cwd: "/tmp" }, file);
		clearCrashLog(file);
		expect(readCrashLog(file)).toEqual([]);
	});
});
