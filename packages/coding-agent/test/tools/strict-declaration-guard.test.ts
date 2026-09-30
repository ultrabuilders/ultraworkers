import { describe, expect, it } from "bun:test";
import type { CustomTool } from "../../src/extensibility/custom-tools/types";
import type { ExtensionRunner } from "../../src/extensibility/extensions/runner";
import type { RegisteredTool } from "../../src/extensibility/extensions/types";
import { wrapRegisteredTool } from "../../src/extensibility/extensions/wrapper";
import { customToolToDefinition } from "../../src/sdk";

// Contract: the `strict` opt-in a custom tool declares is carried across the
// extension-tool bridge unchanged — and an ABSENT `strict` stays absent.
//
// Why the second half matters more than the first: providers do not agree on what
// absence means. `openai-completions.ts` and `openai-responses.ts` read
// `tool.strict !== false`, so absence there means STRICT; `anthropic.ts` reads
// `=== true`, so absence means not-strict. With the wire split that ambiguous, the
// bridge has exactly one safe job: never invent a value. A bridge that defaulted
// absence to `false` would silently switch every strict provider off for every
// extension tool that did not opt in, and it would look like the providers
// changed their mind.
//
// This locks "the bridge does not fabricate an opt-in". It does NOT decide what
// the wire default should be — that is a different change, and conflating the two
// is how a negative contract quietly turns into a positive one.

// The adapter only needs a context factory; it is never exercised on this path.
const STUB_RUNNER = { createContext: () => ({}) } as unknown as ExtensionRunner;

function stubTool(name: string, strict?: boolean): CustomTool {
	// Built by conditional spread so the key is genuinely ABSENT when no opt-in is
	// declared. `strict: undefined` would be a different object shape, and a bridge
	// using `"strict" in tool` could tell them apart — which is exactly the
	// distinction this test exists to pin.
	const tool = {
		name,
		label: name,
		description: `stub ${name}`,
		parameters: { type: "object", properties: {} },
		async execute() {
			return { content: [{ type: "text", text: "ok" }] };
		},
		...(strict === undefined ? {} : { strict }),
	};
	return tool as unknown as CustomTool;
}

/** The real path: custom tool → wire definition → registered tool → adapter. */
function bridgeStrict(tool: CustomTool): unknown {
	const definition = customToolToDefinition(tool, "<sdk>");
	const adapter = wrapRegisteredTool({ definition, extensionPath: "<sdk>" } as RegisteredTool, STUB_RUNNER);
	return adapter.strict;
}

describe("strict through the extension-tool bridge", () => {
	it("carries an explicit opt-in all the way to the adapter", () => {
		// Named away from bash/python/edit/find so this cannot accidentally depend on
		// Anthropic's built-in allowlist branch instead of the bridge.
		expect(bridgeStrict(stubTool("strict-probe", true))).toBe(true);
	});

	it("does not fabricate an opt-in for a tool that declared none", () => {
		// `undefined`, not `false`. See the header: absence means "the author said
		// nothing", and the bridge is not entitled to speak for them.
		expect(bridgeStrict(stubTool("absent-probe"))).toBeUndefined();
	});

	it("still carries an explicit opt-out", () => {
		// The third state, and the reason `toBeUndefined` above is a real assertion
		// rather than a proxy for "falsy". An author who wrote `strict: false` has
		// said something specific — on the providers that read `!== false`, it is the
		// one value that turns strict OFF.
		expect(bridgeStrict(stubTool("optout-probe", false))).toBe(false);
	});
});
