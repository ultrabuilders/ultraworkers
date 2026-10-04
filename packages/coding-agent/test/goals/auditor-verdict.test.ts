import { describe, expect, it } from "bun:test";
import { parseAuditorDecision } from "@oh-my-pi/pi-coding-agent/goals/auditor/contract";

/**
 * epic-exmk — the verdict parse rule.
 *
 * The contract under test: approval is earned ONLY by an exact `<approved/>` as
 * the final non-empty line. Every other outcome leaves the goal open.
 *
 * If this regresses, `completeGoalFromTool()` closes a goal whose auditor never
 * approved it — the exact failure the auditor exists to prevent. Rows 3 and 4
 * are the reason the rule is last-line-only: they are the difference between
 * "the auditor approved" and "the auditor's report mentioned the marker".
 */
describe("parseAuditorDecision", () => {
	it("approves when the exact marker is the final line", () => {
		expect(parseAuditorDecision("report\n<approved/>")).toBe("approved");
	});

	it("survives trailing blank lines after the marker", () => {
		expect(parseAuditorDecision("report\n<approved/>\n\n\n")).toBe("approved");
	});

	it("survives a trailing line of pure whitespace after the marker", () => {
		// Distinct from the empty-line row above: a blank line is dropped by the
		// emptiness filter, but "   " is truthy and only survives because the
		// line is trimmed before it is tested. Without that trim the verdict
		// silently flips on a report that ended in trailing indentation.
		expect(parseAuditorDecision("report\n<approved/>\n   \n\t\n")).toBe("approved");
	});

	it("disapproves when the marker appears only inside prose", () => {
		// The reason the rule exists: a report that discusses the marker must not
		// be read as having emitted it.
		expect(parseAuditorDecision("I would only emit <approved/> if the tests passed")).toBe(
			"disapproved",
		);
	});

	it("disapproves when an approved marker is not the last line", () => {
		expect(parseAuditorDecision("<approved/>\nthen more text")).toBe("disapproved");
	});

	it("disapproves empty output", () => {
		expect(parseAuditorDecision("")).toBe("disapproved");
	});

	it("disapproves an explicit rejection", () => {
		expect(parseAuditorDecision("<disapproved/>")).toBe("disapproved");
	});

	it("disapproves a near-miss marker with no fuzzy matching", () => {
		expect(parseAuditorDecision("<approved />")).toBe("disapproved");
	});
});