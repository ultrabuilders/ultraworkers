/**
 * The sanctioned renderer path survives a frozen built-in registry.
 *
 * Regression this defends: an over-eager freeze of `toolRenderers` breaks the
 * legitimate write path — a tool definition carrying its own `renderResult`.
 * That failure is silent: nothing explodes, the author just quietly loses their
 * custom transcript and is pushed back toward mutating the global, which is
 * exactly what the freeze exists to prevent.
 *
 * The first test (`packages/tui/test/tool-renderers-frozen.test.ts`) proves the
 * global is closed; this one proves the neighbouring door is still open. They
 * are different layers on purpose — the adapter is where a definition becomes a
 * tool the transcript actually renders.
 */
import { describe, expect, test } from "bun:test";
import type { Component } from "@oh-my-pi/pi-tui";
import { Text } from "@oh-my-pi/pi-tui";
import { getThemeByName, type Theme } from "@oh-my-pi/pi-tui/theme";
import { ExtensionRuntime, loadExtensionFromFactory } from "../src/extensibility/extensions/loader";
import { ExtensionRunner } from "../src/extensibility/extensions/runner";
import type { ToolRenderResultOptions } from "../src/extensibility/extensions/types";
import { wrapRegisteredTools } from "../src/extensibility/extensions/wrapper";
import { EventBus } from "../src/utils/event-bus";

const MARKER = "EXTENSION-OWN-RENDERER";

const uiTheme: Theme | undefined = await getThemeByName("dark");
if (!uiTheme) throw new Error("dark theme missing");

function isComponent(value: unknown): value is Component {
	return !!value && typeof value === "object" && "render" in value && typeof value.render === "function";
}

/** A renderer receives the whole content union, not just its text arm. */
function textOf(part: { type: string; text?: string } | undefined): string {
	return part?.type === "text" ? (part.text ?? "") : "";
}

describe("extension tool renderer registration", () => {
	test("a tool definition keeps rendering its own bytes through the adapter", async () => {
		const runtime = new ExtensionRuntime();
		const extension = await loadExtensionFromFactory(
			pi => {
				pi.registerTool({
					name: "widget_report",
					label: "Widget Report",
					description: "extension tool with its own result renderer",
					parameters: pi.arktype({}),
					execute: async () => ({ content: [{ type: "text" as const, text: "ok" }] }),
					renderResult: (result, _options: ToolRenderResultOptions, theme: Theme) =>
						new Text(theme.fg("toolTitle", theme.bold(MARKER)) + `: ${textOf(result.content[0])}`, 0, 0),
				});
			},
			"/project",
			new EventBus(),
			runtime,
			"@vendor/widget@1.2.3",
		);

		const runner = new ExtensionRunner(
			[extension],
			runtime,
			"/project",
			{ getCwd: () => "/project" } as never,
			{} as never,
		);
		const tool = wrapRegisteredTools(runner.getAllRegisteredTools(), runner)[0];
		if (!tool?.renderResult) throw new Error("renderResult missing on wrapped tool");

		const rendered = tool.renderResult(
			{ content: [{ type: "text" as const, text: "payload" }] },
			{ expanded: false, isPartial: false },
			uiTheme,
		);
		if (!isComponent(rendered)) throw new Error("renderer returned no component");

		// Assert the rendered output, not that the adapter copied the field: a
		// copy-counting assertion passes while the renderer is silently dropped.
		expect(Bun.stripANSI(rendered.render(80).join("\n"))).toContain(MARKER);
	});
});
