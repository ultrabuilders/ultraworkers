import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	collectDoctorChecks,
	checkPatchLedger,
	isUnavailable,
	liveEnvironment,
	type DoctorEnvironment,
} from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor-checks";

/**
 * The doctor's own contract.
 *
 * Two things are defended, and the second is the one that matters most:
 *
 *  1. A ledger whose files and manifest disagree reports `error`.
 *  2. A ledger whose PREMISE is missing reports `unavailable` — never `ok`, never
 *     silently absent. A diagnostic that drops a broken premise is worse than no
 *     diagnostic, because it reads as coverage.
 */

function environment(over: Partial<DoctorEnvironment> = {}): DoctorEnvironment {
	return {
		root: "/nonexistent-root",
		patchesDirExists: false,
		manifest: undefined,
		which: () => undefined,
		...over,
	};
}

/** A throwaway package root with the given patches and manifest entries. */
function repoFixture(files: string[], declared?: Record<string, string>): string {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "omp-doctor-"));
	fs.mkdirSync(path.join(root, "patches"), { recursive: true });
	for (const file of files) fs.writeFileSync(path.join(root, "patches", file), "diff --git a b\n");
	fs.writeFileSync(
		path.join(root, "package.json"),
		JSON.stringify(declared === undefined ? {} : { patchedDependencies: declared }),
	);
	return root;
}

const roots: string[] = [];
function tracked(root: string): string {
	roots.push(root);
	return root;
}

afterEach(() => {
	for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("patch ledger check", () => {
	it("reports ok when every declared patch exists and every file is declared", () => {
		const root = tracked(repoFixture(["a.patch"], { dep: "patches/a.patch" }));
		const outcome = checkPatchLedger(liveEnvironment(root));
		expect(isUnavailable(outcome)).toBe(false);
		expect(outcome.status).toBe("ok");
	});

	it("reports error when the manifest declares a patch that is not on disk", () => {
		// The half a size check cannot see: the build would silently apply fewer
		// patches than it claims to.
		const root = tracked(repoFixture([], { dep: "patches/missing.patch" }));
		const outcome = checkPatchLedger(liveEnvironment(root));
		expect(outcome.status).toBe("error");
		expect(outcome.message).toContain("declared but missing");
	});

	it("reports error when a patch file is present but nothing declares it", () => {
		// The other direction: applied by nobody, so manifest and directory drifted.
		const root = tracked(repoFixture(["orphan.patch"], {}));
		const outcome = checkPatchLedger(liveEnvironment(root));
		expect(outcome.status).toBe("error");
		expect(outcome.message).toContain("present but undeclared");
	});

	it("says it could not check when patches/ does not exist, rather than passing", () => {
		// THE case. With no premise, "ok" would be a claim the check never earned.
		const outcome = checkPatchLedger(environment({ patchesDirExists: false }));
		expect(isUnavailable(outcome)).toBe(true);
		expect(outcome.message).toContain("not checked");
	});

	it("says it could not check when the manifest is unreadable", () => {
		const outcome = checkPatchLedger(environment({ patchesDirExists: true, manifest: undefined }));
		expect(isUnavailable(outcome)).toBe(true);
	});

	it("names the check it could not run, so the report line is attributable", () => {
		// `collectDoctorChecks` flattens the registry entries and their names go with
		// them, so the outcome has to carry its own. Without this, an `unavailable`
		// line identifies itself only by the message happening to repeat the check's
		// name — reword the message and the line is unlabelled, with nothing to
		// catch it. Every other case in this file passes with `name` absent.
		const outcome = checkPatchLedger(environment({ patchesDirExists: false }));
		expect(isUnavailable(outcome)).toBe(true);
		expect(outcome.name).toBe("patch_ledger");
	});
});

describe("doctor check registry", () => {
	it("surfaces every registered check, including the unavailable ones", () => {
		// An `unavailable` outcome must still occupy a line in the report. Collecting
		// only the checks that produced a DoctorCheck would drop exactly the notice
		// the missing premise is supposed to raise.
		const outcomes = collectDoctorChecks(environment());
		expect(outcomes.length).toBeGreaterThan(0);
		expect(outcomes.some(isUnavailable)).toBe(true);
	});

	it("reports a required binary by presence without echoing its path", () => {
		// Paths leak the machine layout into CI logs; the check only needs yes/no.
		const outcomes = collectDoctorChecks(environment({ which: () => "/very/secret/path/git" }));
		const git = outcomes.find(o => !isUnavailable(o) && o.name === "git");
		expect(git).toBeDefined();
		expect(JSON.stringify(git)).not.toContain("/very/secret/path");
	});
});
