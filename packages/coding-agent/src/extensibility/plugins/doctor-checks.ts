import * as fs from "node:fs";
import * as path from "node:path";
import { $which } from "@oh-my-pi/pi-utils";
import type { DoctorCheck } from "./types";

/**
 * The check registry.
 *
 * Every entry is a pure function of the snapshot it is handed: none of them reads
 * the TUI, mutates a global, or reaches for a session. That is what makes the same
 * table usable from `omp plugin doctor` and from a `/debug` entry without either
 * exit becoming a second implementation.
 *
 * The three-part status is the load-bearing part. A check whose PREMISE is missing
 * must say so — "could not check X because Y" — rather than reporting ok or
 * skipping silently. A diagnostic that omits a broken premise is worse than no
 * diagnostic, because it reads as coverage.
 */

/** Why a check could not run. Distinct from a finding: nothing is wrong yet. */
export interface CheckUnavailable {
	readonly status: "unavailable";
	/** What could not be checked, and the premise that was missing. */
	readonly message: string;
}

export type CheckOutcome = DoctorCheck | CheckUnavailable;

export function isUnavailable(outcome: CheckOutcome): outcome is CheckUnavailable {
	return outcome.status === "unavailable";
}

/**
 * Everything the checks read.
 *
 * A snapshot rather than live lookups for the same reason `DoctorSnapshot` exists:
 * a check whose job is catching a broken state must be able to be shown that state
 * without anyone editing this file.
 */
export interface DoctorEnvironment {
	/** Absolute path to the repo/package root holding `patches/`. */
	readonly root: string;
	/** Whether `patches/` exists. Absent means the ledger check cannot run. */
	readonly patchesDirExists: boolean;
	/** Parsed `package.json`, or undefined when it could not be read. */
	readonly manifest: { patchedDependencies?: Record<string, string> } | undefined;
	/** Resolved absolute path of an executable, or undefined when not on PATH. */
	which(binary: string): string | null | undefined;
}

/** Read the real environment. The only impure function in this file. */
export function liveEnvironment(root: string): DoctorEnvironment {
	const patchesDir = path.join(root, "patches");
	let manifest: DoctorEnvironment["manifest"];
	try {
		manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
	} catch {
		manifest = undefined;
	}
	return {
		root,
		patchesDirExists: fs.existsSync(patchesDir),
		manifest,
		which: binary => $which(binary),
	};
}

/**
 * Parity between `patches/*.patch` and `package.json.patchedDependencies`.
 *
 * MANDATORY to report `unavailable` rather than pass: the ledger is local-only
 * until the M4 patch-dependency work merges, and a build that silently applies
 * fewer patches than the manifest claims is a failure nobody would otherwise see.
 */
export function checkPatchLedger(env: DoctorEnvironment): CheckOutcome {
	if (!env.patchesDirExists) {
		return {
			status: "unavailable",
			message: `No patches/ directory under ${env.root} — patch ledger not checked`,
		};
	}
	if (!env.manifest) {
		return { status: "unavailable", message: "package.json could not be read — patch ledger not checked" };
	}

	const declared = env.manifest.patchedDependencies ?? {};
	const declaredFiles = Object.values(declared);
	const missing = declaredFiles.filter(file => !fs.existsSync(path.join(env.root, file)));

	// The reverse direction too: a patch file nothing declares is applied by nobody,
	// so the manifest and the directory have drifted apart.
	const onDisk = fs
		.readdirSync(path.join(env.root, "patches"))
		.filter(name => name.endsWith(".patch"))
		.map(name => `patches/${name}`);
	const undeclared = onDisk.filter(file => !declaredFiles.includes(file));

	const problems = [
		...missing.map(file => `declared but missing: ${file}`),
		...undeclared.map(file => `present but undeclared: ${file}`),
	];
	if (problems.length > 0) {
		return { name: "patch_ledger", status: "error", message: problems.join("; ") };
	}
	return {
		name: "patch_ledger",
		status: "ok",
		message: `${declaredFiles.length} patch(es) declared and present`,
	};
}

/** Required binaries, reported by presence only — never by echoing a path a user does not expect. */
const REQUIRED_BINARIES = [
	{ name: "git", description: "Version control" },
	{ name: "sd", description: "Find-replace" },
	{ name: "sg", description: "AST-grep" },
] as const;

export function checkRequiredBinaries(env: DoctorEnvironment): CheckOutcome[] {
	return REQUIRED_BINARIES.map(tool => {
		const found = env.which(tool.name);
		return {
			name: tool.name,
			status: found ? ("ok" as const) : ("warning" as const),
			message: found ? "Found on PATH" : `${tool.description} not found - some features may be limited`,
		};
	});
}

/**
 * The registry, in display order.
 *
 * Exported as data so a test can assert on the LIST — a check added here and never
 * surfaced would otherwise be invisible, the same shape as a harness silently
 * dropped from a conformance run.
 */
export const DOCTOR_CHECKS: ReadonlyArray<{ name: string; run: (env: DoctorEnvironment) => CheckOutcome[] }> = [
	{ name: "patch_ledger", run: env => [checkPatchLedger(env)] },
	{ name: "required_binaries", run: checkRequiredBinaries },
];

/** Run every registered check. */
export function collectDoctorChecks(env: DoctorEnvironment): CheckOutcome[] {
	return DOCTOR_CHECKS.flatMap(entry => entry.run(env));
}
