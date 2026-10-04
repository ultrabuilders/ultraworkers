import { describe, expect, it, spyOn } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { ManageSkillTool } from "../src/tools/manage-skill";
import * as skillsModule from "../src/extensibility/skills";
import type { ToolSession } from "../src/tools";

/**
 * `manage_skill action: "list"` is what makes the system prompt's skill cap a
 * recall cost rather than a capability loss: whatever the `<skills>` block drops
 * is still findable. So the two branches that matter are the ones a broken
 * filter would get wrong — a `query` that must narrow, and one that must not
 * silently match everything.
 *
 * It must never return bodies. A body dump re-inflates exactly the context the
 * cap exists to bound, which would make the cap and this action fight each other.
 */

function fakeSkills(): Array<{ name: string; description: string }> {
	return [
		{ name: "pdf-forms", description: "Fill in PDF forms" },
		{ name: "csv-cleanup", description: "Normalize CSV columns" },
		{ name: "deploy-checklist", description: "Pre-deploy verification" },
	];
}

function session(): ToolSession {
	return { settings: Settings.isolated({}) } as unknown as ToolSession;
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
	const part = result.content[0];
	return part?.type === "text" ? (part.text ?? "") : "";
}

describe("manage_skill list", () => {
	it("returns name and description for every skill when no query is given", async () => {
		const stub = spyOn(skillsModule, "loadSkills").mockResolvedValue({
			skills: fakeSkills(),
		} as never);

		try {
			const result = await new ManageSkillTool().execute("id", { action: "list" } as never);
			const text = textOf(result);
			expect(text).toContain("3 of 3 skills");
			expect(text).toContain("- pdf-forms: Fill in PDF forms");
			expect(result.details).toMatchObject({ action: "list", matched: 3, total: 3 });
		} finally {
			stub.mockRestore();
		}
	});

	it("narrows on a query across name and description", async () => {
		const stub = spyOn(skillsModule, "loadSkills").mockResolvedValue({
			skills: fakeSkills(),
		} as never);

		try {
			const byName = textOf(await new ManageSkillTool().execute("id", { action: "list", query: "pdf" } as never));
			expect(byName).toContain("pdf-forms");
			expect(byName).not.toContain("csv-cleanup");

			// Description-only match: a query that only worked on names would miss this.
			const byDescription = textOf(
				await new ManageSkillTool().execute("id", { action: "list", query: "normalize" } as never),
			);
			expect(byDescription).toContain("csv-cleanup");
			expect(byDescription).not.toContain("pdf-forms");
		} finally {
			stub.mockRestore();
		}
	});

	it("reports an empty match instead of implying there are none at all", async () => {
		const stub = spyOn(skillsModule, "loadSkills").mockResolvedValue({
			skills: fakeSkills(),
		} as never);

		try {
			const result = await new ManageSkillTool().execute("id", {
				action: "list",
				query: "nothing-matches-this",
			} as never);
			expect(textOf(result)).toContain("No skills matched");
			// The total still reports what exists, so "no match" != "no skills".
			expect(result.details).toMatchObject({ matched: 0, total: 3 });
		} finally {
			stub.mockRestore();
		}
	});

	it("never returns a skill body", async () => {
		const stub = spyOn(skillsModule, "loadSkills").mockResolvedValue({
			skills: [...fakeSkills(), { name: "verbose", description: "d", body: "SECRET-BODY-MARKER" }],
		} as never);

		try {
			const text = textOf(await new ManageSkillTool().execute("id", { action: "list" } as never));
			expect(text).not.toContain("SECRET-BODY-MARKER");
		} finally {
			stub.mockRestore();
		}
	});
});
