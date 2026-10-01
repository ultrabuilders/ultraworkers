import { describe, expect, it } from "bun:test";
import type { DoctorSnapshot } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";
import { runDoctorChecks } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";

// Contract: the doctor reports the log directory's REAL permissions.
//
// The logger creates the directory 0o700 and re-asserts it on every write, so the
// mode worth reporting is the one on disk before that happens. `mkdirSync`'s `mode`
// applies only to a directory the call creates, so a `~/.omp/logs` left behind by
// an older build keeps the mode it was born with — and that directory holds the
// most accumulated transcripts, any of which can carry a request header, a resolved
// URL, or a tool argument.
//
// The snapshot is injected so the three states are reachable without editing the
// developer's own log directory, and so the cases differ in exactly one field: a
// check that cannot tell 0755 from 0700 would pass every case below.

/** A snapshot that is otherwise identical; only the log mode varies. */
function snapshotWith(logDirMode: number | undefined): DoctorSnapshot {
	return {
		themes: [],
		resolveTheme: () => undefined,
		builtinTools: [],
		expectedLogDirMode: 0o700,
		...(logDirMode === undefined ? {} : { logDirMode }),
	};
}

function check(checks: Awaited<ReturnType<typeof runDoctorChecks>>, name: string) {
	const found = checks.find(c => c.name === "logs:permissions");
	expect(found).toBeDefined();
	expect(found!.name).toBe(name);
	return found!;
}

describe("doctor reports the log directory's real permissions", () => {
	it("errors when the log directory is readable by other accounts", async () => {
		// 0755 is the mode a directory gets from the default 0o777 masked by a
		// umask of 022 — i.e. exactly what every user who ran an older build has.
		const checks = await runDoctorChecks(snapshotWith(0o755));
		const found = check(checks, "logs:permissions");
		expect(found.status).toBe("error");
		// The report is actionable on its own: it must name the actual mode and
		// say why it matters, not just that something is wrong.
		expect(found.message).toContain("0755");
		expect(found.message).toContain("other accounts");
	});

	it("reports a world-writable log directory as an error, not a warning", async () => {
		const checks = await runDoctorChecks(snapshotWith(0o777));
		expect(check(checks, "logs:permissions").status).toBe("error");
	});

	it("warns rather than errors when the mode is tighter than the contract", async () => {
		// 0500 is owner-read-only: nothing is exposed, so this is not a security
		// finding. Reporting it as an error would train a reader to ignore red.
		const checks = await runDoctorChecks(snapshotWith(0o500));
		const found = check(checks, "logs:permissions");
		expect(found.status).toBe("warning");
		expect(found.message).toContain("0500");
	});

	it("passes at exactly the expected mode", async () => {
		const checks = await runDoctorChecks(snapshotWith(0o700));
		const found = check(checks, "logs:permissions");
		expect(found.status).toBe("ok");
		expect(found.message).toContain("0700");
	});

	it("says the check ran when no log directory exists yet", async () => {
		// A fresh profile has no log directory — the logger creates it lazily on
		// first write. That is not a failure, but it must not be silent either:
		// a check that vanishes when its premise is missing is a check nobody can
		// tell apart from one that was never wired up.
		const checks = await runDoctorChecks(snapshotWith(undefined));
		const found = check(checks, "logs:permissions");
		expect(found.status).toBe("ok");
		expect(found.message).toContain("No log directory yet");
	});
});
