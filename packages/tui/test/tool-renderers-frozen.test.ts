/**
 * `toolRenderers` is core's built-in presentation, not an extension point.
 *
 * Regression this defends: a third-party importer assigning
 * `toolRenderers.grep = myRenderer` silently repaints the transcript of every
 * grep call, in every session, for every importer of this module — with no
 * owner, no ordering, and no way to remove it. The freeze closes that, and the
 * sanctioned replacement is a per-tool `renderCall`/`renderResult` on the tool
 * definition.
 *
 * The second test proves the freeze is not a lock-out: a per-tool renderer
 * still wins over the frozen global, and still renders its own bytes.
 */
import { beforeAll, describe, expect, it } from "bun:test";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import { Text } from "@oh-my-pi/pi-tui/components/text";
import { ToolExecutionComponent, type ToolExecutionUi } from "@oh-my-pi/pi-tui/chat/tool-execution";
import * as themeModule from "@oh-my-pi/pi-tui/theme";
import { toolRenderers } from "../src/tools/index";

const MARKER = "CUSTOM-RENDERER-OUTPUT";

const noopUi: ToolExecutionUi = {
	requestRender() {},
	requestComponentRender() {},
};

describe("toolRenderers registry", () => {
	it("refuses a write from an external importer", () => {
		// ESM is strict mode, so assigning to a frozen object throws. Asserting the
		// refusal — not that `Object.freeze` was called — is the observable
		// contract; the mechanism is free to change.
		expect(() => {
			(toolRenderers as Record<string, unknown>).probe_backdoor = toolRenderers.bash;
		}).toThrow(TypeError);
	});

	describe("per-tool renderers are unaffected by the freeze", () => {
		let uiTheme: themeModule.Theme;

		beforeAll(async () => {
			await themeModule.initTheme(false, undefined, undefined, "dark", "light");
			const loaded = await themeModule.getThemeByName("dark");
			if (!loaded) throw new Error("dark test theme is unavailable");
			uiTheme = loaded;
		});

		it("renders a tool's own bytes even when its name collides with a built-in renderer", () => {
			// `bash` is a real key in the frozen registry. Collision is the point: a
			// bespoke renderer must win over the global rather than be occluded by it.
			const tool: AgentTool = {
				name: "bash",
				label: "bash",
				description: "collides with the built-in bash renderer on purpose",
				parameters: { type: "object", properties: {} },
				execute: async () => ({ output: "", isError: false }),
				renderResult: (result: { content: Array<{ type: string; text?: string }> }) =>
					new Text(`${MARKER}: ${result.content[0]?.text ?? ""}`, 0, 0),
			} as unknown as AgentTool;

			const component = new ToolExecutionComponent("bash", {}, {}, tool, noopUi);
			component.updateResult({ content: [{ type: "text", text: "payload" }] }, false);

			const rendered = component.render(160).join("\n");
			expect(Bun.stripANSI(rendered)).toContain(MARKER);
		});
	});
});
