/**
 * Read-only audit of who approved what, reconstructed from a session transcript.
 *
 * RULE: this module must NOT decide, re-derive, or infer anything about
 * approval. Every field is copied from the `ApprovalEntry` lines the session
 * already wrote, which are written from `resolveApproval` — the one place
 * policy is decided. A reader that re-derived "would this have been approved?"
 * would be a second source of truth about the same question.
 *
 * ## Why an UNPAIRED `asked` is the point
 *
 * Both halves are written so a crash log can answer "who approved this". That
 * question has three answers, not two, and only the transcript distinguishes
 * them:
 *
 *   asked + answered   a human (or a mode/tool rule) resolved this prompt
 *   asked, no answer    the process ended with the prompt open — the decision
 *                       exists nowhere, which is the case that must never be
 *                       silently reported as "approved"
 *   nothing             the gate never ran
 *
 * A reader that only prints resolved pairs would render the middle case as
 * absent, which is the very confusion this entry type was added to remove.
 */

import { replaceTabs, shortenPath } from "@oh-my-pi/pi-tui/render/render-utils";
import { APPROVAL_ENTRY_TYPE, type ApprovalEntry } from "../session/session-entries";

/** One prompt: both halves joined, or the half that survived. */
export interface ApprovalAuditRecord {
	/** Ties the halves together; unique per prompt. */
	requestId: string;
	toolName: string;
	/** The key `resolveApproval` decided under, when the `asked` half recorded it. */
	policyKey?: string;
	/** Which surface answered. Absent when the prompt was never resolved. */
	source?: ApprovalEntry["source"];
	/** What was chosen. Absent exactly when `unresolved` is true. */
	decision?: string;
	/** ISO timestamp of the question. */
	askedAt?: string;
	/** ISO timestamp of the answer; absent when `unresolved`. */
	answeredAt?: string;
	/**
	 * True when an `asked` has no matching `answered`: the process ended with the
	 * prompt open. This is the record a reader must not mistake for approval.
	 */
	unresolved: boolean;
}

export interface ApprovalAuditArgs {
	sessionFile: string;
	json: boolean;
}

/** Narrow one persisted line to an approval entry, or null. */
function asApprovalEntry(line: unknown): ApprovalEntry | null {
	if (typeof line !== "object" || line === null) return null;
	const record = line as Partial<ApprovalEntry>;
	if (record.type !== APPROVAL_ENTRY_TYPE) return null;
	if (typeof record.requestId !== "string" || typeof record.toolName !== "string") return null;
	return record as ApprovalEntry;
}

/**
 * Join `asked`/`answered` halves by `requestId`.
 *
 * Exported and pure so the pairing is testable without a file, and so a reader
 * can tell an empty transcript from a transcript with no approvals.
 */
export function pairApprovalEntries(entries: readonly ApprovalEntry[]): ApprovalAuditRecord[] {
	const byRequest = new Map<string, { asked?: ApprovalEntry; answered?: ApprovalEntry }>();
	for (const entry of entries) {
		const pair = byRequest.get(entry.requestId) ?? {};
		// First writer wins: halves are written once each, so a duplicate means a
		// corrupt or concatenated transcript. Keeping the first keeps the answer
		// stable instead of letting file order decide what the audit says.
		if (entry.phase === "asked") pair.asked ??= entry;
		else if (entry.phase === "answered") pair.answered ??= entry;
		byRequest.set(entry.requestId, pair);
	}

	const records: ApprovalAuditRecord[] = [];
	for (const [requestId, pair] of byRequest) {
		const asked = pair.asked;
		const answered = pair.answered;
		if (!asked && !answered) continue;
		// An `answered` with no `asked` still names the tool, so report it rather
		// than dropping a half of the only evidence that a prompt was resolved.
		const source = answered?.source ?? asked?.source;
		records.push({
			requestId,
			toolName: (answered ?? asked)?.toolName ?? "",
			...(asked?.policyKey ? { policyKey: asked.policyKey } : {}),
			...(source ? { source } : {}),
			...(answered?.decision ? { decision: answered.decision } : {}),
			...(asked?.timestamp ? { askedAt: asked.timestamp } : {}),
			...(answered?.timestamp ? { answeredAt: answered.timestamp } : {}),
			unresolved: answered === undefined,
		});
	}
	// Stable order: prompts as they were asked. An unpaired `asked` has no second
	// timestamp, so sorting only by `askedAt` would drop it to the end and make
	// it the least visible row — the opposite of what this command exists for.
	return records.sort((a, b) => (a.askedAt ?? b.answeredAt ?? "").localeCompare(b.askedAt ?? b.answeredAt ?? ""));
}

const clock = (iso: string | undefined): string => {
	if (!iso) return "--";
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return "--";
	return parsed.toISOString().slice(11, 19);
};

function formatRecord(record: ApprovalAuditRecord): string {
	const asked = `${clock(record.askedAt)}  asked    ${record.toolName}${
		record.policyKey ? `  policy=${record.policyKey}` : ""
	}${record.source ? `  source=${record.source}` : ""}`;
	if (record.unresolved) {
		// The row that must not be misread. A process that died with the prompt
		// open has no decision anywhere; saying so is the entire deliverable.
		return replaceTabs(`${asked}\n${clock(record.answeredAt)}  NO ANSWER  unresolved — the prompt was never resolved`);
	}
	return replaceTabs(
		`${asked}\n${clock(record.answeredAt)}  answered ${record.decision ?? "unknown"}  source=${record.source ?? "unknown"}`,
	);
}

/** Parse a transcript into joined approval records. Never throws on a bad line. */
export async function readApprovalAudit(sessionFile: string): Promise<ApprovalAuditRecord[]> {
	const text = await Bun.file(sessionFile).text();
	const entries: ApprovalEntry[] = [];
	for (const line of text.split("\n")) {
		if (!line.trim()) continue;
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			// A torn final line is normal after a crash — that is the case this
			// command is for. Skip it rather than failing the whole audit.
			continue;
		}
		const entry = asApprovalEntry(parsed);
		if (entry) entries.push(entry);
	}
	return pairApprovalEntries(entries);
}

export async function runApprovalAudit(args: ApprovalAuditArgs): Promise<void> {
	let records: ApprovalAuditRecord[];
	try {
		records = await readApprovalAudit(args.sessionFile);
	} catch {
		// A transcript written before approval entries existed has none, and a
		// missing path is a plain "no record" to a reader, not a crash.
		console.log(`No approval records (could not read ${shortenPath(args.sessionFile)}).`);
		return;
	}

	if (args.json) {
		console.log(JSON.stringify({ session: shortenPath(args.sessionFile), approvals: records }, null, 2));
		return;
	}
	if (records.length === 0) {
		console.log("No approval records.");
		return;
	}
	for (const record of records) {
		console.log(formatRecord(record));
	}
}