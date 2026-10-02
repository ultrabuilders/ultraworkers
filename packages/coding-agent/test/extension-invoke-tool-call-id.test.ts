/**
 * Two delegations of the same tool must never share a tool-call id.
 *
 * ## What a consumer observes if this regresses
 *
 * `ExtensionRunner.invokeNativeTool` synthesizes the id it hands the native tool, and
 * the pending-approval registry added for the approval cascade keys on exactly that
 * id. A duplicate id is not a cosmetic collision: `Map.set` on an existing key
 * **replaces** the entry, so the first call's prompt stops being reachable. A decision
 * on the second call settles a promise nobody is waiting for, and the first prompt
 * stays on screen forever with nothing logged — which is the precise failure the
 * cascade was built to remove, reintroduced one layer down.
 *
 * ## Why the clock is pinned
 *
 * The old id was `invoke-${name}-${Date.now().toString(36)}-${depth}`. Depth is
 * threaded from the caller, so two *independent* delegations both sit at depth 0, and
 * `Date.now()` has millisecond resolution. Pinning it makes "both calls in the same
 * millisecond" a certainty rather than a race that usually loses, so this row goes red
 * deterministically against the old expression instead of flickering.
 *
 * The assertion is set-size rather than equality: it states the property that matters
 * (no two ids collide) without pinning a format that is free to change.
 */
import { afterEach, describe, expect, it, vi } from "bun:test";
import type { AgentTool, AgentToolContext } from "@oh-my-pi/pi-agent-core";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";

function makeRunner(): ExtensionRunner {
	return new ExtensionRunner(
		[],
		undefined as never, // runtime
		"", // cwd, ignored: read live via the getter
		{ getSessionId: () => "invoke-id-test" } as never,
		undefined as never, // modelRegistry
		undefined, // getMemory
		undefined, // settings
	);
}

describe("a delegated tool call gets an id of its own", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("keeps two same-depth delegations of the same tool apart", async () => {
		vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

		const ids: string[] = [];
		const runner = makeRunner();
		runner.setNativeToolResolver(name => ({
			tool: {
				name,
				description: "a native built-in",
				parameters: { type: "object", properties: {} },
				async execute(toolCallId: string) {
					ids.push(toolCallId);
					return { output: "ok" };
				},
			} as unknown as AgentTool,
			makeContext: () => ({}) as AgentToolContext,
		}));

		// No `depth` passed on either call, so both take the `?? 0` default — the
		// situation two unrelated delegations are actually in.
		await runner.invokeNativeTool("bash", { command: "git status" });
		await runner.invokeNativeTool("bash", { command: "git status" });

		expect(ids).toHaveLength(2);
		// The contract. A shared id here means one approval prompt became unreachable.
		expect(new Set(ids).size).toBe(2);
	});

	it("still refuses a delegation past the depth ceiling", async () => {
		const runner = makeRunner();
		runner.setNativeToolResolver(name => ({
			tool: {
				name,
				description: "a native built-in",
				parameters: { type: "object", properties: {} },
				async execute() {
					return { output: "ok" };
				},
			} as unknown as AgentTool,
			makeContext: () => ({}) as AgentToolContext,
		}));

		// The id change must not have cost the recursion bound its meaning: this is the
		// only thing stopping a wrapper that delegates to itself.
		await expect(runner.invokeNativeTool("bash", {}, { depth: 8 })).rejects.toThrow(/delegation depth exceeded 8/);
	});
});
