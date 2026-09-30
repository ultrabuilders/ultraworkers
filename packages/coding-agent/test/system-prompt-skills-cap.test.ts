import { describe, expect, it } from "bun:test";
import { MAX_PROMPT_SKILLS } from "@oh-my-pi/pi-coding-agent/system-prompt";
import systemPromptTemplate from "../src/prompts/system/system-prompt.md" with { type: "text" };
import { compile } from "@oh-my-pi/pi-utils/prompt";

/**
 * The `<skills>` block is capped so it cannot grow without bound as a user
 * installs more skills. The cap must be *invisible* below the threshold — a
 * skill added to a small install cannot change the shape of the prompt, because
 * every byte of it sits in the model's prefix cache and a spurious diff there
 * costs a full cache miss on every turn.
 *
 * So the contract is the negative branch: at or below the cap the rendered
 * block is exactly what it was before the cap existed. Asserting "the prompt
 * contains skill names" would pass with or without this change; asserting the
 * omitted-count line is absent below the cap cannot.
 */
/** The `<skills>…</skills>` block alone, so an assertion cannot match unrelated prompt prose. */
function skillsBlockOf(rendered: string): string {
	const match = /<skills>\n([\s\S]*?)\n<\/skills>/.exec(rendered);
	// No block at all is the zero-skill case: `{{#if skills.length}}` skips the
	// whole thing. An empty string is the correct answer, not a failure.
	return match?.[1] ?? "";
}

function renderSkillsBlock(skillCount: number, omitted: number): string {
	const skills = Array.from({ length: skillCount }, (_, index) => ({
		name: `skill-${index}`,
		description: `does thing ${index}`,
	}));
	const rendered = compile(systemPromptTemplate)({
		skills,
		skillsOmitted: omitted,
		rules: [],
		alwaysApplyRules: [],
	} as never);
	return skillsBlockOf(rendered);
}

describe("skills block cap", () => {
	it("renders no truncation notice at or below the cap", () => {
		for (const count of [0, 1, MAX_PROMPT_SKILLS]) {
			const rendered = renderSkillsBlock(count, 0);
			expect(rendered).not.toContain("more");
			expect(rendered).not.toContain("manage_skill action=");
		}
	});

	it("lists every skill when the install is small", () => {
		const rendered = renderSkillsBlock(3, 0);
		expect(rendered).toContain("- skill-0: does thing 0");
		expect(rendered).toContain("- skill-2: does thing 2");
	});

	it("tells the model how many were held back once over the cap", () => {
		// Dropping entries silently would make the prompt lie about what exists.
		const rendered = renderSkillsBlock(MAX_PROMPT_SKILLS + 5, 5);
		expect(rendered).toContain("5 more");
		// And it must name a way to reach them, or the cap costs recall outright.
		expect(rendered).toContain('manage_skill action="list"');
	});
});