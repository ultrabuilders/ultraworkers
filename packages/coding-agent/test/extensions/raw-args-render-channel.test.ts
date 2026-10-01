import { describe, expect, it } from "bun:test";
import type { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type { RegisteredTool, ToolRenderResultOptions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { RegisteredToolAdapter } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import { customToolToDefinition } from "@oh-my-pi/pi-coding-agent/sdk";
import { initTheme, theme, type Theme } from "@oh-my-pi/pi-tui/theme";
import { Text } from "@oh-my-pi/pi-tui";

/**
 * Both adapter sites used to re-list the render options they forwarded:
 * `{ expanded, isPartial, spinnerFrame }`. Anything added to the contract
 * afterwards reached `renderCall` and silently stopped at the boundary, so a
 * renderer written against the published type saw `undefined` for a field the
 * type promised. The wrapper also applied the theme augmentation to `renderCall`
 * but not to `renderResult`.
 *
 * These go through the real adapters rather than the functions behind them, so
 * they fail at the seam an extension actually registers against.
 */

const FULL_OPTIONS: ToolRenderResultOptions = {
	expanded: true,
	isPartial: true,
	spinnerFrame: 3,
	argsComplete: false,
	executionStarted: true,
	rawArgs: { json: '{"path":"src/a', complete: false },
};

// initTheme() configures the theme singleton and returns void, so the value the
// adapter sees is the module export, not a return.
async function resolvedTheme(): Promise<Theme> {
	await initTheme();
	return theme;
}

/** Field by field, so a field the adapter dropped names itself. */
function seen(options: ToolRenderResultOptions | undefined): Record<string, unknown> {
	return {
		expanded: options?.expanded,
		isPartial: options?.isPartial,
		spinnerFrame: options?.spinnerFrame,
		argsComplete: options?.argsComplete,
		executionStarted: options?.executionStarted,
		rawArgs: options?.rawArgs,
	};
}

const EXPECTED = {
	expanded: true,
	isPartial: true,
	spinnerFrame: 3,
	argsComplete: false,
	executionStarted: true,
	rawArgs: { json: '{"path":"src/a', complete: false },
};

function adapterCapturing(capture: (options: ToolRenderResultOptions) => void): RegisteredToolAdapter {
	const registeredTool = {
		definition: {
			name: "probe",
			label: "Probe",
			description: "probe",
			parameters: { type: "object", properties: {} },
			execute: async () => ({ content: [] }),
			renderResult: (_result: unknown, options: ToolRenderResultOptions) => {
				capture(options);
				return new Text("ok", 0, 0);
			},
		},
		extensionPath: "/tmp/ext",
		sourceInfo: { path: "/tmp/ext", type: "local" },
	} as unknown as RegisteredTool;
	return new RegisteredToolAdapter(registeredTool, {} as ExtensionRunner);
}

function customToolCapturing(capture: (options: ToolRenderResultOptions) => void) {
	return customToolToDefinition({
		name: "probe",
		label: "Probe",
		description: "probe",
		parameters: { type: "object", properties: {} },
		execute: async () => ({ content: [] }),
		renderResult: (_result: unknown, options: ToolRenderResultOptions) => {
			capture(options);
			return new Text("ok", 0, 0);
		},
	} as unknown as Parameters<typeof customToolToDefinition>[0]);
}

describe("raw args render channel survives both adapter sites", () => {
	it("RegisteredToolAdapter.renderResult forwards every field", async () => {
		const resolved = await resolvedTheme();
		let received: ToolRenderResultOptions | undefined;
		const adapter = adapterCapturing(options => {
			received = options;
		});

		adapter.renderResult?.({ content: [] }, { ...FULL_OPTIONS }, resolved, undefined);

		expect(seen(received)).toEqual(EXPECTED);
	});

	it("RegisteredToolAdapter.renderResult also applies the theme renderCall already got", async () => {
		// renderCall wraps options in renderOptionsWithTheme, a proxy that
		// delegates unknown reads to the theme. renderResult used to forward a
		// bare literal, so a renderer reading a theme value off `options` saw it
		// on the call path and not on the result path.
		const resolved = await resolvedTheme();
		let received: ToolRenderResultOptions | undefined;
		const adapter = adapterCapturing(options => {
			received = options;
		});

		adapter.renderResult?.({ content: [] }, { ...FULL_OPTIONS }, resolved, undefined);

		expect((received as unknown as { spinnerFrames?: unknown }).spinnerFrames).toBe(resolved.spinnerFrames);
		// And the contract's own fields still win over the delegate.
		expect(received?.expanded).toBe(true);
	});

	it("customToolToDefinition forwards every field", async () => {
		const resolved = await resolvedTheme();
		let received: ToolRenderResultOptions | undefined;
		const definition = customToolCapturing(options => {
			received = options;
		});

		definition.renderResult?.({ content: [] }, { ...FULL_OPTIONS }, resolved);

		expect(seen(received)).toEqual(EXPECTED);
	});

	it("a renderer that never sees the optional fields is not handed invented ones", async () => {
		// Negative contract: forwarding the whole object must not materialize
		// defaults. An adapter that spread one in would promise extensions a
		// field no producer keeps.
		const resolved = await resolvedTheme();
		let received: ToolRenderResultOptions | undefined;
		const definition = customToolCapturing(options => {
			received = options;
		});

		definition.renderResult?.({ content: [] }, { expanded: false, isPartial: false }, resolved);

		expect(received?.expanded).toBe(false);
		expect(received?.isPartial).toBe(false);
		expect(received?.spinnerFrame).toBeUndefined();
		expect(received?.argsComplete).toBeUndefined();
		expect(received?.executionStarted).toBeUndefined();
		expect(received?.rawArgs).toBeUndefined();
	});
});
