import { describe, expect, test } from "bun:test";
import { resolveTuiDebugSocketPath, TUI_DEBUG_ENV, TUI_DEBUG_ENV_LEGACY } from "../src/debug-server";

describe("TUI debug socket environment", () => {
	test("the canonical variable is read when set", () => {
		expect(resolveTuiDebugSocketPath({ [TUI_DEBUG_ENV]: "/tmp/new.sock" })).toBe("/tmp/new.sock");
	});

	test("the pre-rebrand variable is still read when the canonical one is unset", () => {
		expect(resolveTuiDebugSocketPath({ [TUI_DEBUG_ENV_LEGACY]: "/tmp/old.sock" })).toBe("/tmp/old.sock");
	});

	test("the canonical variable wins when both are set", () => {
		expect(
			resolveTuiDebugSocketPath({
				[TUI_DEBUG_ENV]: "/tmp/new.sock",
				[TUI_DEBUG_ENV_LEGACY]: "/tmp/old.sock",
			}),
		).toBe("/tmp/new.sock");
	});

	test("an exported but empty variable keeps the server off", () => {
		expect(resolveTuiDebugSocketPath({ [TUI_DEBUG_ENV]: "" })).toBeUndefined();
	});

	test("an empty canonical variable does not fall through to the legacy one", () => {
		// Falling through here would silently start a server on a path the user
		// believes they turned off.
		expect(
			resolveTuiDebugSocketPath({ [TUI_DEBUG_ENV]: "", [TUI_DEBUG_ENV_LEGACY]: "/tmp/old.sock" }),
		).toBeUndefined();
	});

	test("neither variable set leaves the server off", () => {
		expect(resolveTuiDebugSocketPath({})).toBeUndefined();
	});
});
