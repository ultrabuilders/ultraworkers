import { describe, expect, it } from "bun:test";
import {
	checkWritePolicy,
	WRITE_POLICY_DENIAL_MESSAGES,
	type WritePolicy,
} from "@oh-my-pi/pi-coding-agent/plan-mode/write-policy";

/**
 * The write-policy contract, as data.
 *
 * `test/tools/plan-mode-guard-local.test.ts` already proves the *built-in* plan
 * mode's behaviour end to end, through `enforcePlanModeWrite` and a real
 * `local://` sandbox. That coverage is not repeated here.
 *
 * What is new is that a policy is a value a mode supplies, rather than a branch
 * somebody wrote into the guard. So these cases drive `checkWritePolicy` with
 * policies no built-in mode has, and assert which refusal each produces. The
 * failure this defends: a guard that keeps one hardcoded plan-mode branch and
 * never consults the policy still passes every test in the other file, while a
 * second mode that supplies a policy silently gets plan mode's rules — or none.
 */

/** A mode that refuses everything plan mode refuses. */
const strict: WritePolicy = { denyRename: true, denyDelete: true, denyWorkingTree: true };
const inSandbox = { sandbox: true };
const inWorkingTree = { sandbox: false };

describe("checkWritePolicy", () => {
	it("permits everything when no policy is supplied", () => {
		// A session with no active mode must not be constrained at all. Getting
		// this wrong denies ordinary writes in every mode that is not plan mode.
		expect(checkWritePolicy(undefined, { move: "x", op: "delete", sandbox: false })).toBeNull();
	});

	it("permits every write when the policy denies nothing", () => {
		// An extension mode that wants an advisory-only flag set (or one that has
		// not opted into any restriction) must not inherit plan mode's refusals.
		expect(checkWritePolicy({}, { op: "delete", sandbox: false })).toBeNull();
		expect(checkWritePolicy({}, { move: "other", sandbox: false })).toBeNull();
	});

	it("refuses a rename whatever the target, including the sandbox", () => {
		// Rename and delete are refused as operations the mode does not perform,
		// not as writes to the working tree — so a sandbox target does not exempt
		// them. Checking the target first would let a rename out of the sandbox.
		expect(checkWritePolicy(strict, { move: "local://a.md", sandbox: true })).toBe("rename");
		expect(checkWritePolicy(strict, { move: "src/a.ts", sandbox: false })).toBe("rename");
	});

	it("refuses a delete whatever the target, including the sandbox", () => {
		expect(checkWritePolicy(strict, { op: "delete", sandbox: true })).toBe("delete");
		expect(checkWritePolicy(strict, { op: "delete", sandbox: false })).toBe("delete");
	});

	it("refuses a working-tree write but permits the same write in the sandbox", () => {
		// The asymmetry is the whole point of the sandbox: one policy, two
		// outcomes, decided only by where the write lands. An implementation that
		// always refuses, or always permits, passes the other file's tests and
		// fails here.
		expect(checkWritePolicy(strict, { op: "create", ...inWorkingTree })).toBe("workingTree");
		expect(checkWritePolicy(strict, { op: "update", ...inWorkingTree })).toBe("workingTree");
		expect(checkWritePolicy(strict, { op: "create", ...inSandbox })).toBeNull();
		expect(checkWritePolicy(strict, { op: "update", ...inSandbox })).toBeNull();
	});

	it("evaluates each flag independently, so a mode can refuse only what it must", () => {
		// A mode that only protects the working tree — no rename, no delete rule —
		// must not acquire the other two refusals. Copying plan mode's whole policy
		// instead of honouring the flags would fail here.
		const workingTreeOnly: WritePolicy = { denyWorkingTree: true };
		expect(checkWritePolicy(workingTreeOnly, { op: "create", ...inWorkingTree })).toBe("workingTree");
		expect(checkWritePolicy(workingTreeOnly, { op: "delete", ...inSandbox })).toBeNull();
		expect(checkWritePolicy(workingTreeOnly, { move: "src/a.ts", ...inSandbox })).toBeNull();

		// And a rename-only policy must not grow a working-tree refusal.
		const renameOnly: WritePolicy = { denyRename: true };
		expect(checkWritePolicy(renameOnly, { move: "src/a.ts", ...inWorkingTree })).toBe("rename");
		expect(checkWritePolicy(renameOnly, { op: "create", ...inWorkingTree })).toBeNull();
	});

	it("answers rename before delete before location, so the cheap refusals win", () => {
		// A write that is both a delete and a working-tree write has two true
		// refusals. Which one the user sees is a deliberate ordering: the
		// filesystem-independent reason, because it is the more specific one and
		// it needs no path resolution to justify.
		expect(checkWritePolicy(strict, { move: "src/a.ts", op: "delete", ...inWorkingTree })).toBe("rename");
		expect(checkWritePolicy(strict, { op: "delete", ...inWorkingTree })).toBe("delete");
	});

	it("keeps refusal text in core, so a policy cannot supply its own prose", () => {
		// The denial is a closed union, and its text is core's. An extension
		// injecting wording here would put its own sentence into a `ToolError` the
		// user reads as the tool's own refusal — wrong provenance for it.
		expect(Object.keys(WRITE_POLICY_DENIAL_MESSAGES).sort()).toEqual(["delete", "rename", "workingTree"]);
		expect(WRITE_POLICY_DENIAL_MESSAGES.workingTree).toContain("local://");
	});

	it("returns a denial the guard can look up, with no fourth case", () => {
		// Guards index the message table by the denial. A denial with no entry
		// would surface `undefined` as an error message, so the two sets must be
		// the same set — this is the check that keeps them from drifting.
		const everyDenial = [
			checkWritePolicy(strict, { move: "a", ...inWorkingTree }),
			checkWritePolicy(strict, { op: "delete", ...inWorkingTree }),
			checkWritePolicy(strict, { op: "create", ...inWorkingTree }),
		];
		for (const denial of everyDenial) {
			expect(denial).not.toBeNull();
			expect(WRITE_POLICY_DENIAL_MESSAGES[denial!]).toMatch(/\S/);
		}
	});
});
