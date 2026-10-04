import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PluginManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/manager";
import { isUnavailable, type CheckOutcome } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/types";

/**
 * The patch ledger's contract, as the SHIPPED doctor reports it.
 *
 * These rows used to drive `checkPatchLedger` directly through a hand-built
 * `DoctorEnvironment`. They now drive `PluginManager.doctor()` against a real
 * directory, because that is the only path a user can reach — the registry they
 * lived in was imported by nothing outside tests, so every one of them was a
 * contract about code that never ran.
 *
 * Two things are defended, and the second matters most:
 *
 *  1. A ledger whose files and manifest disagree reports `error`, in BOTH
 *     directions — declared-but-absent and present-but-undeclared.
 *  2. A ledger whose PREMISE is missing reports `unavailable` — never `ok`, never
 *     silently absent. A diagnostic that drops a broken premise is worse than no
 *     diagnostic, because it reads as coverage.
 */

/** A throwaway package root with the given patches and manifest entries. */
function repoFixture(files: string[], declared?: Record<string, string>): string {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-doctor-"));
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

async function ledgerFor(root: string): Promise<CheckOutcome> {
	const outcomes = await new PluginManager(root).doctor();
	const ledger = outcomes.find(o => o.name === "patch_ledger");
	expect(ledger).toBeDefined();
	return ledger!;
}

describe("patch ledger check", () => {
	it("reports ok when every declared patch exists and every file is declared", async () => {
		const root = tracked(repoFixture(["a.patch"], { dep: "patches/a.patch" }));
		const outcome = await ledgerFor(root);
		expect(isUnavailable(outcome)).toBe(false);
		expect(outcome.status).toBe("ok");
	});

	it("reports error when the manifest declares a patch that is not on disk", async () => {
		// The half a size check cannot see: the build would silently apply fewer
		// patches than it claims to.
		const root = tracked(repoFixture([], { dep: "patches/missing.patch" }));
		const outcome = await ledgerFor(root);
		expect(outcome.status).toBe("error");
		if (isUnavailable(outcome)) throw new Error("a drifted ledger is a finding, not an absence");
		expect(outcome.message).toContain("declared but missing");
	});

	it("reports error when a patch file is present but nothing declares it", async () => {
		// The other direction: applied by nobody, so manifest and directory drifted.
		const root = tracked(repoFixture(["orphan.patch"], {}));
		const outcome = await ledgerFor(root);
		expect(outcome.status).toBe("error");
		if (isUnavailable(outcome)) throw new Error("a drifted ledger is a finding, not an absence");
		expect(outcome.message).toContain("present but undeclared");
	});

	it("says it could not check when patches/ does not exist, rather than passing", async () => {
		// THE case. With no premise, "ok" would be a claim the check never earned.
		// A temp root with no `patches/` directory is the real shape of this: any
		// install that is not a checkout of this repo.
		const root = tracked(fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-doctor-empty-")));
		const outcome = await ledgerFor(root);
		expect(isUnavailable(outcome)).toBe(true);
		if (!isUnavailable(outcome)) throw new Error("expected the premise to be missing");
		expect(outcome.message).toContain("not checked");
	});

	it("says it could not check when the manifest is unreadable", async () => {
		// `patches/` present but `package.json` absent: one premise holds, the other
		// does not, and the check must still decline rather than compare against
		// nothing.
		const root = tracked(fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-doctor-nomanifest-")));
		fs.mkdirSync(path.join(root, "patches"), { recursive: true });
		const outcome = await ledgerFor(root);
		expect(isUnavailable(outcome)).toBe(true);
	});

	it("names the check it could not run, so the report line is attributable", async () => {
		// The outcome carries its own `name`. Without it, an `unavailable` line
		// identifies itself only by the message happening to repeat the check's name
		// — reword the message and the line is unlabelled, with nothing to catch it.
		const root = tracked(fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-doctor-unnamed-")));
		const outcome = await ledgerFor(root);
		expect(isUnavailable(outcome)).toBe(true);
		expect(outcome.name).toBe("patch_ledger");
	});
});
