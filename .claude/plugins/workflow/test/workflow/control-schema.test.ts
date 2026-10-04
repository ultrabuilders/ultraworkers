/**
 * The control tool's two traps.
 *
 * **Trap 1** — the schema must be an OBJECT. A discriminated union of two objects serialises to a
 * top-level `anyOf` with no `type`, and strict providers reject that outright, so the tool is
 * unreachable rather than merely wrong. The per-action key rules that a union WOULD have expressed
 * cannot live in the schema, so they moved to `normalizeInput` — which means the schema row and
 * the runtime rows below are two halves of one contract, and either half alone proves nothing.
 *
 * **Trap 2** — errors are RETURNED, never thrown at the model. A thrown tool error is opaque; a
 * returned one carries `allowedActions`, so the model recovers without a second round trip.
 */
import { describe, expect, test } from "bun:test";
import { createWorkflowControlTool, workflowControlSchema } from "../../src/tools/workflow-control";
import { fakeManager, run } from "./support/fake-manager";

const tool = () => createWorkflowControlTool({ getManager: () => fakeManager({ runs: [run("r1", "running")] }) });

describe("trap 1 — the emitted schema is an object, not a union", () => {
	test("the wire document declares type:object with no top-level anyOf", () => {
		// The contract a strict provider reads. Asserted on the EMITTED document, not on the
		// builder call, because the builder is not what goes over the wire — the serialiser is,
		// and a schema can be built as an object and still serialise to a bare anyOf.
		const json = workflowControlSchema.toJsonSchema() as Record<string, unknown>;
		expect(json.type).toBe("object");
		expect(json.anyOf).toBeUndefined();
		expect(Array.isArray(json.oneOf)).toBe(false);
	});

	test("action is the whole verb set and is the only required key", () => {
		// If runId were required at the schema level, `action: "list"` — which the tool documents
		// as taking no runId — would be unsendable, and the model could not list runs at all.
		const json = workflowControlSchema.toJsonSchema() as {
			properties: { action: { enum: string[] } };
			required: string[];
		};
		expect(json.properties.action.enum).toEqual(["list", "status", "pause", "resume", "stop"]);
		expect(json.required).toEqual(["action"]);
	});

	test("unknown keys are refused by the schema, not silently dropped", () => {
		// additionalProperties:false. A dropped key is worse than a rejected one: the model
		// believes it constrained something and the call proceeds without it.
		const json = workflowControlSchema.toJsonSchema() as { additionalProperties?: unknown };
		expect(json.additionalProperties).toBe(false);
	});
});

describe("trap 1 — the per-action key rules normalizeInput has to enforce", () => {
	test("checkpointId with action=status THROWS", () => {
		// THE row. `checkpointId` is declared optional on the schema, so this argument object
		// passes schema validation and reaches the runtime check. Nothing else in the stack can
		// refuse it, which is why removing the check silently widens the tool instead of
		// breaking it.
		expect(tool().execute("t1", { action: "status", runId: "r1", checkpointId: "cp-1" })).rejects.toThrow(
			'workflow_control action "status" does not accept checkpointId',
		);
	});

	test("checkpointId with action=pause THROWS", () => {
		// The mirror of the row above on the other resume-only key: proving one rejection does
		// not prove the rule, and pause is where a copy of the allowed-set ternary would most
		// plausibly go wrong (it is the only branch that is neither list nor resume).
		expect(tool().execute("t1", { action: "pause", runId: "r1", checkpointId: "cp-1" })).rejects.toThrow(
			'workflow_control action "pause" does not accept checkpointId',
		);
	});

	test("checkpointId with action=resume is ACCEPTED and forwarded", async () => {
		// The negative control for the two rows above. Without it, a mutation that refuses
		// checkpointId everywhere would satisfy both of them.
		const manager = fakeManager({ runs: [run("r1", "paused")], accepts: { resume: ["r1"] } });
		const control = createWorkflowControlTool({ getManager: () => manager });
		const result = await control.execute("t1", { action: "resume", runId: "r1", checkpointId: "cp-1" });
		expect(result.details.result).toBe("resumed");
		expect(manager.calls).toEqual([{ method: "resume", runId: "r1", checkpointId: "cp-1" }]);
	});

	test("runId with action=list THROWS", () => {
		// `list` accepts nothing but `action`. The schema cannot say that, so if it slips
		// through, `list` silently ignores the runId and reports every run — a wrong answer
		// rather than an error.
		expect(tool().execute("t1", { action: "list", runId: "r1" })).rejects.toThrow(
			'workflow_control action "list" does not accept runId',
		);
	});

	test("runId missing for pause, resume and stop THROWS", () => {
		for (const action of ["pause", "resume", "stop"]) {
			expect(tool().execute("t1", { action })).rejects.toThrow(`workflow_control action "${action}" requires runId`);
		}
	});

	test("an action outside the verb set is refused WITH the allowed list", async () => {
		// The message carries the vocabulary, so a model that guessed wrong is told the right
		// words in the same turn. A bare "invalid action" costs a round trip.
		await expect(tool().execute("t1", { action: "badvalue", runId: "r1" })).rejects.toThrow(
			"workflow_control requires action: list|status|pause|resume|stop",
		);
	});

	test("an empty checkpointId is refused rather than treated as absent", async () => {
		// `Object.hasOwn` distinguishes "absent" from "present but empty". Resuming from an
		// empty checkpoint id would resume from wherever the run happens to be.
		expect(tool().execute("t1", { action: "resume", runId: "r1", checkpointId: "" })).rejects.toThrow(
			'workflow_control action "resume" requires a non-empty checkpointId',
		);
	});
});

describe("trap 2 — errors are returned as data, never thrown at the model", () => {
	test("an unknown runId returns result=error with allowedActions, and does not throw", async () => {
		const control = createWorkflowControlTool({ getManager: () => fakeManager({ runs: [run("r1", "running")] }) });
		const result = await control.execute("t1", { action: "status", runId: "nope" });
		expect(result.details.result).toBe("error");
		expect(result.details.error).toBe("run not found");
		// The model needs to know what it CAN do, not just that this failed.
		expect(result.details.allowedActions).toEqual(["list"]);
		expect(result.content[0].text).toContain("action=status result=error");
	});

	test("an illegal transition returns allowedActions for the run's real status", async () => {
		// The transition guard and the advice come from ONE table (src/status.ts), so a refusal
		// can never advertise an action the guard would also reject.
		const control = createWorkflowControlTool({
			getManager: () => fakeManager({ runs: [run("done-1", "completed")], accepts: { pause: [] } }),
		});
		const result = await control.execute("t1", { action: "pause", runId: "done-1" });
		expect(result.details.result).toBe("error");
		expect(result.details.error).toBe("cannot pause run with status completed");
		expect(result.details.allowedActions).toEqual(["status"]);
	});

	test("a transition that throws is REPORTED, not propagated", async () => {
		// The sharpest form of trap 2. A persistence I/O error escaping as a raw stack trace is
		// an opaque failure the model cannot act on; the point is that the CALL RESOLVES.
		const control = createWorkflowControlTool({
			getManager: () =>
				fakeManager({ runs: [run("r1", "running")], throwOnTransition: new Error("EIO: journal append failed") }),
		});
		const result = await control.execute("t1", { action: "stop", runId: "r1" });
		expect(result.details.result).toBe("error");
		expect(result.details.error).toBe("EIO: journal append failed");
		// Still carries the recovery path, computed from the run's status.
		expect(result.details.allowedActions).toEqual(["status", "pause", "stop"]);
	});

	test("a non-Error throw is still reported as a message", async () => {
		// `String(err)` is the reference's fallback. A thrown string is the shape a JSON parse
		// failure or a worker rejection actually arrives in, and `err.message` would be
		// undefined — which would render as `error=undefined` in the text the model reads.
		const control = createWorkflowControlTool({
			getManager: () => fakeManager({ runs: [run("r1", "running")], throwOnTransition: "worker died" }),
		});
		const result = await control.execute("t1", { action: "stop", runId: "r1" });
		expect(result.details.error).toBe("worker died");
	});
});

describe("registration is not this module's job", () => {
	test("the tool declares the name, label and approval the host registers it under", () => {
		// Bead .12 hands this value to api.registerTool. These three fields are what the host
		// reads at registration time, so they are the tool's externally observable identity —
		// a rename here is a user-visible change, not a refactor.
		const control = tool();
		expect(control.name).toBe("workflow_control");
		expect(control.label).toBe("Workflow Control");
		expect(control.approval).toBe("write");
	});
});
