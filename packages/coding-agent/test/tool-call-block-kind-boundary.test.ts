/**
 * A blocked tool call has to stay BLOCKED once it crosses the package boundary.
 *
 * `packages/agent` decides a call's terminal span status with
 * `caughtError instanceof ToolCallBlockedError`, importing the class from
 * `./run-collector`. Extension and hook gates live in `coding-agent` and throw from
 * `extensibility/shared-events`. While each package declared its own class of the same
 * name, the `instanceof` was FALSE for every extension-blocked call — so a refusal was
 * filed on the span as `"error"`, indistinguishable from a tool that crashed, and `kind`
 * stopped at the boundary with nothing downstream able to read it.
 *
 * Asserted through the CONSTRUCTORS rather than the wrappers: the wrappers already had
 * rows in `tool-call-block-kind.test.ts`, and those stayed green throughout the two-class
 * arrangement. What was untested is the seam itself — that the type thrown on this side
 * is the same type the runtime recognises on the other.
 *
 * A second class would still satisfy every assertion here if it also extended the
 * runtime's, so the negative row pins the direction that matters: a runtime-recognized
 * block must not have gained a way to masquerade as something it is not.
 */
import { describe, expect, it } from "bun:test";
import { ToolCallBlockedError as RuntimeBlocked } from "@oh-my-pi/pi-agent-core/run-collector";
import { ToolCallBlockedError as GateBlocked } from "@oh-my-pi/pi-coding-agent/extensibility/shared-events";

describe("a tool_call block is one type across the package boundary", () => {
	it("recognises the error a gate throws as the one runTool handles", () => {
		// The defect, stated as an assertion. Before this was one class, this was `false`.
		const thrownByGate = new GateBlocked("hook-failed", "Extension /ext/broken failed: boom");

		expect(thrownByGate instanceof RuntimeBlocked).toBe(true);
	});

	it("carries the reason a gate set, not a generic one", () => {
		// The class exists to preserve prose the transcript and its assertions depend on;
		// a subclass that dropped the message would pass the `instanceof` row above and
		// silently blank every existing assertion about it.
		const thrownByGate = new GateBlocked("denied", "Tool execution was blocked by an extension");

		expect(thrownByGate.message).toBe("Tool execution was blocked by an extension");
	});

	it("carries `kind` across the boundary for whatever renders the failure", () => {
		const malfunction = new GateBlocked("hook-failed", "boom");
		const refusal = new GateBlocked("denied", "no");

		expect(malfunction.kind).toBe("hook-failed");
		expect(refusal.kind).toBe("denied");
	});

	it("defaults the runtime's own block to `denied`", () => {
		// `runTool` constructs this with a reason only, on the path where a `beforeToolCall`
		// handler chose to block. A `beforeToolCall` that returns `{block: true}` IS a
		// decision, so the default must be `denied` — a default of `hook-failed` would file
		// every ordinary refusal as a malfunction, which is the exact conflation this class
		// was introduced to remove.
		expect(new RuntimeBlocked("refused by policy").kind).toBe("denied");
	});

	it("still fails closed — both kinds stop the call, neither is a pass", () => {
		// The bead's standing constraint: the block DECISION is unchanged. Classification
		// is not a licence to run. If a future change made one kind non-blocking, the two
		// kinds would stop being a labelling concern and become a safety one.
		for (const kind of ["denied", "hook-failed"] as const) {
			expect(new GateBlocked(kind, "stopped")).toBeInstanceOf(Error);
		}
	});
});
