import { beforeAll, describe, expect, it, vi } from "bun:test";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import { Text } from "@oh-my-pi/pi-tui";
import { ToolExecutionComponent } from "@oh-my-pi/pi-tui/chat/tool-execution";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import type { XdevMountedRenderer, XdevMountedState } from "@oh-my-pi/pi-tui/tools/xdev";

/**
 * A `write xd://<tool>` card renders with the dispatched tool's own renderer,
 * while streaming (call branch) and once the result lands, for mounted devices
 * and active top-level tools alike. The TUI forwards the host's canonical
 * resolver (`XdevMountedState.resolve`, wired to `resolveXdevTool`) and must
 * not gate it on `mountedNames` itself: that second predicate is what left a
 * dispatched top-level tool on the generic args/output card.
 */

const ui = () => ({
	requestRender: vi.fn(),
	requestComponentRender: vi.fn(),
	resetDisplay: vi.fn(),
});

const probeTool: XdevMountedRenderer = {
	label: "Probe",
	mergeCallAndResult: true,
	renderCall: () => new Text("PROBE-CALL", 0, 0),
	renderResult: () => new Text("PROBE-RESULT", 0, 0),
};

function writeToolWithXdev(xdev: XdevMountedState): AgentTool {
	return { name: "write", label: "Write", session: { xdev } } as unknown as AgentTool;
}

/** `mountedNames` stays empty on purpose: the host resolver is the only authority. */
function xdevState(resolve: XdevMountedState["resolve"]): XdevMountedState {
	return {
		mountedNames: new Set<string>(),
		tools: new Map<string, XdevMountedRenderer>([["probe", probeTool]]),
		resolve,
	};
}

const dispatchResult = {
	content: [{ type: "text" as const, text: "42" }],
	details: {
		xdev: {
			tool: "probe",
			mode: "execute" as const,
			args: { command: "Write-Output 42" },
			inner: { output: "42" },
		},
	},
};

function deviceWrite(resolve: XdevMountedState["resolve"]): ToolExecutionComponent {
	const component = new ToolExecutionComponent(
		"write",
		{ path: "xd://probe", content: JSON.stringify({ command: "Write-Output 42" }) },
		{ useBuiltInRenderer: true },
		writeToolWithXdev(xdevState(resolve)),
		ui(),
	);
	component.setExecutionStarted();
	return component;
}

describe("write xd:// device card renderer resolution", () => {
	beforeAll(async () => {
		await initTheme();
	});

	it("renders the dispatched tool's card while streaming and after the result", () => {
		const component = deviceWrite(() => probeTool);
		expect(component.render(80).join("\n")).toContain("PROBE-CALL");

		component.updateResult(dispatchResult, false);
		expect(component.render(80).join("\n")).toContain("PROBE-RESULT");
	});

	it("falls back to the generic card when the host resolver returns nothing", () => {
		const component = deviceWrite(() => undefined);
		expect(component.render(80).join("\n")).not.toContain("PROBE-CALL");

		component.updateResult(dispatchResult, false);
		const rendered = component.render(80).join("\n");
		expect(rendered).not.toContain("PROBE-RESULT");
		expect(rendered).toContain("42");
	});
});

/**
 * A renderer that watches the unparsed argument stream learns about growth
 * through a typed channel rather than by reading a magic `__partialJson` key
 * out of the decoded args. The two cases that matter are the ones the decoded
 * view cannot express: a delta that grows the buffer without completing the
 * JSON, and a republish of the same buffer, which must not repaint.
 */
describe("rawArgs channel", () => {
	beforeAll(async () => {
		await initTheme();
	});

	/** Records what the renderer saw each time it was asked to draw. */
	function rawWatchingTool(seen: string[]): AgentTool {
		return {
			name: "probe",
			label: "Probe",
			renderCall: (_args: unknown, options: { rawArgs?: { json: string; complete: boolean } }) => {
				seen.push(options.rawArgs?.json ?? "<none>");
				return new Text(`RAW:${options.rawArgs?.json ?? "<none>"}`, 0, 0);
			},
		} as unknown as AgentTool;
	}

	function rawCard(tool: AgentTool, options: { rawArgs?: { json: string; complete: boolean } } = {}) {
		return new ToolExecutionComponent(
			"probe",
			{ path: "a.ts" },
			{ useBuiltInRenderer: false, ...options },
			tool,
			ui(),
		);
	}

	it("delivers a raw-only growth to a renderer that reuses the same args object", () => {
		// The decoded args keep their identity across this update — the case the
		// reference-equality short-circuit is entitled to skip. The buffer grew
		// regardless, so a renderer watching it must still be repainted.
		const seen: string[] = [];
		const component = rawCard(rawWatchingTool(seen));
		const stableArgs = { path: "a.ts" };
		component.updateArgs(stableArgs);
		component.setRawArgs({ json: '{"path":"a', complete: false });
		expect(component.render(80).join("\n")).toContain('RAW:{"path":"a');

		component.updateArgs(stableArgs);
		component.setRawArgs({ json: '{"path":"a.t', complete: false });
		expect(component.render(80).join("\n")).toContain('RAW:{"path":"a.t');
	});

	it("republishing the same buffer does not repaint", () => {
		// Every streamed token produces a fresh object, so comparing by reference
		// would repaint per token. This is the assertion that keeps the channel
		// from turning into a repaint storm.
		const seen: string[] = [];
		const component = rawCard(rawWatchingTool(seen));
		component.setRawArgs({ json: '{"path":"a.ts"', complete: false });
		const afterFirst = component.render(80).join("\n");
		const rendersAfterFirst = seen.length;

		component.setRawArgs({ json: '{"path":"a.ts"', complete: false });
		expect(seen.length).toBe(rendersAfterFirst);
		expect(component.render(80).join("\n")).toBe(afterFirst);
	});

	it("a card rebuilt with a raw buffer renders the same as one driven live", () => {
		// The rebuild path has no stream to publish through, so it hands the
		// buffer to the constructor. Same contract, same output — otherwise a
		// theme change would visibly rewrite a card mid-stream.
		const rebuilt = rawCard(rawWatchingTool([]), { rawArgs: { json: '{"path":"a', complete: false } });
		expect(rebuilt.render(80).join("\n")).toContain('RAW:{"path":"a');

		const live = rawCard(rawWatchingTool([]));
		live.setRawArgs({ json: '{"path":"a', complete: false });
		expect(live.render(80).join("\n")).toBe(rebuilt.render(80).join("\n"));
	});

	it("a card with no raw buffer reports none rather than an empty string", () => {
		// The distinction a consumer branches on: no stream yet is not the same
		// as a stream that happens to be empty.
		const component = rawCard(rawWatchingTool([]));
		expect(component.render(80).join("\n")).toContain("RAW:<none>");
	});
});
