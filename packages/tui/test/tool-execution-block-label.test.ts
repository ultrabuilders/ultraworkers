/**
 * A tool call a gate STOPPED must say whether somebody denied it or the gate broke.
 *
 * `agent-loop` classifies a caught `ToolCallBlockedError` into `result.details`
 * (`blockedKind`). Both kinds arrive as an ordinary errored tool call whose text is the
 * handler's own words, so without this label a user's refusal is rendered exactly like a
 * third-party extension crashing — "the system decided" reported where nothing decided.
 *
 * The negative row is the one that carries the item. Labelling everything `hook-failed`
 * passes the first row and destroys the only fact the reader needed: who stopped this, and
 * whether it was them. `denied` must therefore stay UNLABELLED — its message already names
 * what was refused, so a prefix would add a line to every gated call to say nothing new.
 *
 * Driven through a tool with no `renderResult`, because a custom renderer bypasses the
 * generic text path entirely; a test that used one would pass whatever this file does.
 */
import { describe, expect, it } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import { ToolExecutionComponent } from "@oh-my-pi/pi-tui/chat/tool-execution";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import type { TUI } from "@oh-my-pi/pi-tui";

/** A tool with no custom renderer, so the result flows through the generic text path. */
const PLAIN_TOOL = {
	name: "bash",
	label: "Bash",
	async execute() {
		return { content: [], isError: true };
	},
} as unknown as AgentTool;

function render(result: { content: Array<{ type: string; text?: string }>; isError?: boolean; details?: unknown }) {
	const ui = { requestRender() {}, requestComponentRender() {} } as unknown as TUI;
	const component = new ToolExecutionComponent("bash", {}, {}, PLAIN_TOOL, ui, process.cwd());
	component.updateResult(result, false);
	return stripVTControlCharacters(component.render(80).join("\n"));
}

describe("a stopped tool call names why it stopped", () => {
	it("labels a broken gate, because nobody chose that", async () => {
		await initTheme();
		const frame = render({
			content: [{ type: "text", text: "Extension /ext/broken failed: boom" }],
			isError: true,
			details: { blockedKind: "hook-failed" },
		});

		expect(frame).toContain("Hook failed:");
		// The handler's own words survive — the classification is added, not substituted.
		expect(frame).toContain("Extension /ext/broken failed: boom");
	});

	it("leaves a real denial unlabelled", async () => {
		await initTheme();
		const frame = render({
			content: [{ type: "text", text: "Tool execution was blocked by an extension" }],
			isError: true,
			details: { blockedKind: "denied" },
		});

		// The negative contract. Somebody said no, and that is not a malfunction.
		expect(frame).not.toContain("Hook failed:");
		expect(frame).toContain("Tool execution was blocked by an extension");
	});

	it("labels nothing on an ordinary tool error", async () => {
		await initTheme();
		const frame = render({
			content: [{ type: "text", text: "ENOENT: no such file or directory" }],
			isError: true,
			details: {},
		});

		expect(frame).not.toContain("Hook failed:");
	});

	it("labels nothing when a transcript replays a block with no classification", async () => {
		await initTheme();
		// A session recorded before `blockedKind` existed carries a blocked call with no
		// details at all. It must render as it always did rather than guess.
		const frame = render({
			content: [{ type: "text", text: "Tool execution was blocked by an extension" }],
			isError: true,
		});

		expect(frame).not.toContain("Hook failed:");
	});
});
