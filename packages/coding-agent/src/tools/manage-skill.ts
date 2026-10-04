import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import type { AgentTool, AgentToolResult } from "@oh-my-pi/pi-agent-core";
import {
	deleteManagedSkill,
	getManagedSkillsDir,
	sanitizeSkillName,
	writeManagedSkill,
} from "../autolearn/managed-skills";
import { isNameClaimedByAuthoredSkill, loadSkills } from "../extensibility/skills";
import manageSkillDescription from "../prompts/tools/manage-skill.md" with { type: "text" };
import type { ToolSession } from ".";

import { cfgAutolearnEnabled } from "../autolearn/settings";

const manageSkillSchema = type({
	action: "'create' | 'update' | 'delete' | 'list'",
	"query?": type("string").describe("substring match against skill name and description (list only)"),
	"name?": type("string").describe("kebab-case skill name (required for create/update/delete)"),
	"description?": type("string").describe(
		"one-line description of when to use the skill (required for create/update)",
	),
	"body?": type("string").describe("the SKILL.md body in markdown, no frontmatter (required for create/update)"),
}).narrow(
	(p, ctx) =>
		p.action === "list" ||
		(p.action === "delete" && p.name !== undefined) ||
		(p.action !== "delete" && p.description !== undefined && p.body !== undefined && p.name !== undefined) ||
		// Enforce the action/field contract at validation time rather than only in
		// execute. Kept as a cross-field narrow (not a discriminated union) so the
		// wire schema stays a single root object — strict structured-output mode and
		// the Anthropic tool-schema builder both require that.
		ctx.mustBe('used with "name" for create/update/delete, plus both "description" and "body" for create/update'),
);

export type ManageSkillParams = typeof manageSkillSchema.infer;

/**
 * Direct create/update/delete of isolated managed skills. Gated behind
 * `autolearn.enabled`; backend-independent (the skill side is standalone).
 */
export class ManageSkillTool implements AgentTool<typeof manageSkillSchema> {
	readonly name = "manage_skill";
	readonly approval = "write" as const;
	readonly label = "Manage Skill";
	readonly description = manageSkillDescription;
	readonly parameters = manageSkillSchema;
	readonly strict = true;
	readonly loadMode = "essential" as const;
	readonly summary = "Create, update, or delete an isolated managed skill";

	constructor(private readonly refreshSkills?: () => Promise<void>) {}

	static createIf(session: ToolSession): ManageSkillTool | null {
		if (!cfgAutolearnEnabled.get(session.settings)) return null;
		return new ManageSkillTool(session.refreshSkills);
	}

	async execute(_id: string, params: ManageSkillParams): Promise<AgentToolResult> {
		if (params.action === "list") {
			const { skills } = await loadSkills();
			const query = params.query?.trim().toLowerCase();
			const matches = query
				? skills.filter(
						skill => skill.name.toLowerCase().includes(query) || skill.description.toLowerCase().includes(query),
					)
				: skills;
			// Name + description only, never the body: this is what makes "dropped
			// from the prompt" a recall cost rather than a capability loss. A body
			// dump would re-inflate the context the cap exists to bound.
			const lines = matches.map(skill => `- ${skill.name}: ${skill.description}`);
			return {
				content: [
					{
						type: "text",
						text:
							lines.length === 0
								? `No skills matched${query ? ` "${params.query}"` : ""}.`
								: `${matches.length} of ${skills.length} skills:
${lines.join("\n")}`,
					},
				],
				details: { action: "list", matched: matches.length, total: skills.length },
			};
		}

		if (params.action === "delete") {
			if (!params.name) throw new Error('"delete" requires "name".');
			await deleteManagedSkill(params.name);
			await this.refreshSkills?.();
			return {
				content: [{ type: "text", text: `Deleted managed skill "${params.name}".` }],
				details: { action: "delete", name: params.name },
			};
		}

		// Defensive narrowing: the schema refine already rejects create/update
		// without both fields, so this is unreachable for valid input — it only
		// proves the strings are present to `writeManagedSkill`'s typed contract.
		if (!params.name || !params.description || !params.body) {
			throw new Error(`"${params.action}" requires "name", "description", and "body".`);
		}
		// A managed skill resolves below any authored skill of the same name
		// (authored always wins in discovery), so creating one under a name an
		// authored skill already claims writes a file that never surfaces. Refuse
		// up front rather than report a false "Created". `sanitizeSkillName`
		// normalizes to the on-disk name the discovery scan compares against.
		if (params.action === "create" && isNameClaimedByAuthoredSkill(sanitizeSkillName(params.name!))) {
			return {
				content: [
					{
						type: "text",
						text: `Cannot create managed skill "${params.name}": an authored skill of that name already exists, and managed skills cannot override authored ones. Choose a different name.`,
					},
				],
				isError: true,
				details: { action: "create", name: params.name, shadowed: true },
			};
		}
		const { path: skillPath } = await writeManagedSkill({
			action: params.action,
			name: params.name,
			description: params.description,
			body: params.body,
		});
		await this.refreshSkills?.();
		const relativePath = path.relative(getManagedSkillsDir(), skillPath);
		const verb = params.action === "create" ? "Created" : "Updated";
		return {
			content: [{ type: "text", text: `${verb} managed skill "${params.name}" (managed-skills/${relativePath}).` }],
			details: { action: params.action, name: params.name },
		};
	}
}
