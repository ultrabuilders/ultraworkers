import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { pairApprovalEntries, readApprovalAudit } from "@oh-my-pi/pi-coding-agent/cli/approval-audit-cli";
import { APPROVAL_ENTRY_TYPE, type ApprovalEntry } from "@oh-my-pi/pi-coding-agent/session/session-entries";

const at = (time: string): Pick<ApprovalEntry, "timestamp"> => ({ timestamp: time });

function asked(requestId: string, toolName: string, extra: Partial<ApprovalEntry> = {}): ApprovalEntry {
	return {
		type: APPROVAL_ENTRY_TYPE,
		id: `${requestId}-a`,
		parentId: null,
		phase: "asked",
		requestId,
		toolName,
		...at("2026-10-01T14:02:11.000Z"),
		...extra,
	} as ApprovalEntry;
}

function answered(requestId: string, decision: string, extra: Partial<ApprovalEntry> = {}): ApprovalEntry {
	return {
		type: APPROVAL_ENTRY_TYPE,
		id: `${requestId}-b`,
		parentId: null,
		phase: "answered",
		requestId,
		toolName: "bash",
		...at("2026-10-01T14:02:19.000Z"),
		decision,
		source: "user",
		...extra,
	} as ApprovalEntry;
}

describe("approval audit pairs the asked and answered halves", () => {
	it("joins both halves of one prompt and reports the decision that was applied", () => {
		const records = pairApprovalEntries([
			asked("r1", "bash", { policyKey: "bash:rm -rf ./build" }),
			answered("r1", "approved"),
		]);
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({
			requestId: "r1",
			toolName: "bash",
			policyKey: "bash:rm -rf ./build",
			decision: "approved",
			source: "user",
			unresolved: false,
		});
	});

	// The bead calls this the easiest branch to drop: a denial is the row that
	// matters most and the one a filter like `decision === "approved"` loses.
	it("keeps a denied decision rather than filtering to approvals", () => {
		const records = pairApprovalEntries([asked("r1", "bash"), answered("r1", "denied")]);
		expect(records).toHaveLength(1);
		expect(records[0]?.decision).toBe("denied");
		expect(records[0]?.unresolved).toBe(false);
	});

	// The whole point of the entry type. A reader that printed only resolved
	// pairs would render this as "nothing happened", which is the confusion the
	// entry was added to remove.
	it("reports a prompt that was never answered instead of omitting it", () => {
		const records = pairApprovalEntries([asked("r1", "bash", { policyKey: "bash:curl" })]);
		expect(records).toHaveLength(1);
		expect(records[0]?.unresolved).toBe(true);
		expect(records[0]?.decision).toBeUndefined();
		expect(records[0]?.policyKey).toBe("bash:curl");
	});

	it("distinguishes an answered prompt from a gate that never ran", () => {
		const resolved = pairApprovalEntries([asked("r1", "bash"), answered("r1", "approved")]);
		const orphan = pairApprovalEntries([asked("r1", "bash")]);
		expect(resolved[0]?.unresolved).toBe(false);
		expect(orphan[0]?.unresolved).toBe(true);
		// The gate-never-ran case is the empty transcript, and it must not be
		// confused with either of the two above.
		expect(pairApprovalEntries([])).toEqual([]);
	});

	it("keeps prompts ordered by when they were asked, including unresolved ones", () => {
		const records = pairApprovalEntries([
			asked("late", "bash", { timestamp: "2026-10-01T14:05:00.000Z" }),
			asked("early", "bash", { timestamp: "2026-10-01T14:01:00.000Z" }),
			asked("middle", "bash", { timestamp: "2026-10-01T14:03:00.000Z" }),
		]);
		expect(records.map(r => r.requestId)).toEqual(["early", "middle", "late"]);
		expect(records.every(r => r.unresolved)).toBe(true);
	});

	// Mutation-surviving, so written after the fact: dropping the orphan-`answered`
	// branch left the suite green. It is reachable — a transcript truncated at the
	// head, or rewritten by a repair pass — and it is the only surviving evidence
	// that a prompt was resolved, so it must not vanish.
	it("reports an answered half whose asked half is missing", () => {
		const records = pairApprovalEntries([answered("r1", "approved")]);
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({ requestId: "r1", decision: "approved", unresolved: false });
	});

	// Also mutation-surviving. A transcript that was rewritten or concatenated can
	// carry a duplicate half; whichever one the reader kept, the audit must give
	// the same answer, so this pins first-writer-wins rather than file order.
	it("reports the same decision whichever duplicate half appears first", () => {
		const first = answered("r1", "approved", { timestamp: "2026-10-01T14:02:19.000Z" });
		const second = answered("r1", "denied", { timestamp: "2026-10-01T14:09:00.000Z" });
		expect(pairApprovalEntries([first, second])[0]?.decision).toBe("approved");
		expect(pairApprovalEntries([second, first])[0]?.decision).toBe("denied");
	});
});

describe("approval audit reads a transcript", () => {
	const write = async (lines: unknown[]): Promise<string> => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "approval-audit-"));
		const file = path.join(dir, "session.jsonl");
		await Bun.write(file, lines.map(l => JSON.stringify(l)).join("\n"));
		return file;
	};

	it("reports no records for a transcript written before approval entries existed", async () => {
		// Backward compatibility: an old transcript has no approval line at all
		// and must read as "nothing recorded", not as an error.
		const file = await write([
			{ type: "message", id: "m1", parentId: null, timestamp: "2026-10-01T14:00:00.000Z" },
			{ type: "title", v: 1, title: "an old session" },
		]);
		expect(await readApprovalAudit(file)).toEqual([]);
	});

	it("ignores a torn final line, which is what a crash leaves behind", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "approval-audit-"));
		const file = path.join(dir, "session.jsonl");
		await Bun.write(
			file,
			[
				JSON.stringify(asked("r1", "bash", { policyKey: "bash:curl" })),
				JSON.stringify(answered("r1", "approved")),
				'{"type":"approval","requestId":"r2","toolNa',
			].join("\n"),
		);
		const records = await readApprovalAudit(file);
		expect(records).toHaveLength(1);
		expect(records[0]?.unresolved).toBe(false);
	});

	it("ignores unrelated entry types", async () => {
		const file = await write([
			{ type: "title", v: 1, title: "x" },
			// Right shape, wrong type — must not be mistaken for an approval.
			{ type: "custom", requestId: "r9", phase: "asked", toolName: "bash" },
			asked("r1", "bash"),
			answered("r1", "approved"),
		]);
		const records = await readApprovalAudit(file);
		expect(records).toHaveLength(1);
		expect(records[0]?.requestId).toBe("r1");
	});
});
