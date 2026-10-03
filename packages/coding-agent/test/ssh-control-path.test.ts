import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	assertOwnerPrivateDir,
	controlDirGuardError,
	controlPathFitsBudget,
	controlPathHeadroom,
	controlPathSunPathLimit,
	controlPathWorstCase,
	resolveSshControlDir,
	sshControlFallbackDir,
} from "../src/ssh/connection-manager";
import * as logger from "@oh-my-pi/pi-utils/logger";

// Regression coverage for #9070: named-profile roots pushed the SSH ControlPath
// past macOS's 104-byte sun_path once OpenSSH appends its mux temp suffix.
describe("SSH control-path budget (#9070)", () => {
	it("rejects a control dir that overflows sun_path once %C.sock + mux temp bind is added", () => {
		// A representative macOS named-profile control dir is 48 bytes; the
		// temporary bind path is 48 + 63 = 111 >= 104, so it must not fit.
		const profileDir = "/Users/arthur/.omp/profiles/upstream/ssh-control";
		expect(Buffer.byteLength(profileDir)).toBe(48);
		expect(controlPathFitsBudget(profileDir, "darwin")).toBe(false);
		// The default (unprofiled) macOS dir stays within budget.
		expect(controlPathFitsBudget("/Users/arthur/.omp/ssh-control", "darwin")).toBe(true);
	});

	it("places the darwin boundary at 40 bytes of control dir", () => {
		expect(controlPathFitsBudget("a".repeat(40), "darwin")).toBe(true);
		expect(controlPathFitsBudget("a".repeat(41), "darwin")).toBe(false);
	});

	it("routes on platform: 42-byte dir fits Linux's 108 but not macOS's 104", () => {
		const dir = "a".repeat(42);
		expect(controlPathFitsBudget(dir, "darwin")).toBe(false);
		expect(controlPathFitsBudget(dir, "linux")).toBe(true);
		// Linux boundary sits at 44 bytes.
		expect(controlPathFitsBudget("a".repeat(44), "linux")).toBe(true);
		expect(controlPathFitsBudget("a".repeat(45), "linux")).toBe(false);
	});

	// The receipt and the decision have to agree on the sign, because the receipt
	// is what a reader trusts when the boolean is the only thing saying no. The
	// first refused directory costs *exactly* the ceiling — OpenSSH rejects a path
	// that reaches the limit, not one that passes it — so its headroom is 0, not
	// −1. Re-deriving the predicate from this number as `>= 0` would admit the one
	// path the OS refuses, and the boolean is not there to catch it.
	it("gives the last refused directory a headroom of exactly zero", () => {
		const lastAccepted = "a".repeat(40);
		const firstRefused = "a".repeat(41);

		expect(controlPathHeadroom(lastAccepted, "darwin")).toBeGreaterThan(0);
		expect(controlPathFitsBudget(lastAccepted, "darwin")).toBe(true);

		expect(controlPathHeadroom(firstRefused, "darwin")).toBe(0);
		expect(controlPathFitsBudget(firstRefused, "darwin")).toBe(false);

		// One byte past it, and the number carries the sign change rather than
		// clamping — a clamped receipt cannot say how far over a path already is.
		expect(controlPathHeadroom(`${firstRefused}a`, "darwin")).toBe(-1);
	});
});

describe("sshControlFallbackDir", () => {
	it("is deterministic, and its cost against sun_path comes from the module", () => {
		const canonicalDir = "/Users/arthur/.omp/profiles/upstream/ssh-control";
		const a = sshControlFallbackDir(canonicalDir, 501);
		const b = sshControlFallbackDir(canonicalDir, 501);
		expect(a).toBe(b);

		// The byte cost and the ceiling both come from `connection-manager`, so
		// this row copies neither 104 nor the socket arithmetic. What it pins is
		// that the margin is real: the fallback has to fit the tightest ceiling,
		// not merely the one this platform happens to report.
		//
		// This used to be `expect(limit - worstCase(a)).toBeGreaterThan(0)`, which
		// reads like a headroom assertion and is not one — the margin may fall from
		// twelve bytes to one and stay green, because the number it computed was
		// thrown away immediately. `controlPathHeadroom` is the same arithmetic
		// exported, so the erosion is something a caller can now *read*; the row
		// that reads it under pressure is the overflow report below.
		expect(controlPathHeadroom(a, "darwin")).toBeGreaterThan(0);

		// The cost tracks the path it is given. A constant would satisfy every
		// "it fits" assertion while the prefix silently grew, which is the erosion
		// the boolean alone cannot see.
		expect(controlPathWorstCase(`${a}x`)).toBe(controlPathWorstCase(a) + 1);
	});

	it("isolates distinct canonical control directories and uids", () => {
		const base = "/Users/arthur/.omp/ssh-control";
		expect(sshControlFallbackDir(base, 501)).not.toBe(
			sshControlFallbackDir("/different/xdg/state/omp/ssh-control", 501),
		);
		expect(sshControlFallbackDir(base, 501)).not.toBe(sshControlFallbackDir(base, 502));
	});
});

describe("resolveSshControlDir", () => {
	it("keeps the canonical dir when it fits", () => {
		const canonicalDir = "/Users/arthur/.omp/ssh-control";
		expect(resolveSshControlDir({ canonicalDir, platform: "darwin", uid: 501 })).toEqual({
			dir: canonicalDir,
			shared: false,
		});
	});

	it("relocates to the bounded shared fallback when the canonical dir overflows", () => {
		const canonicalDir = "/Users/arthur/.omp/profiles/upstream/ssh-control";
		const choice = resolveSshControlDir({ canonicalDir, platform: "darwin", uid: 501, tmpBase: "/tmp" });
		expect(choice).toEqual({ dir: "/tmp/ultraworkers-5434354bc38", shared: true });
		expect(controlPathFitsBudget(choice.dir, "darwin")).toBe(true);
	});

	// The fallback is the last thing that can still be shortened, so when it
	// overflows there is nothing left to shorten and OpenSSH fails the mux bind at
	// connect time with "... too long for Unix domain socket" — a message naming
	// the socket and neither number. A caller that supplied the temp root is the
	// one able to fix it, so the budget has to reach them.
	//
	// Production never passes `tmpBase`, which is why this row drives the overflow
	// through that parameter instead of a longer digest: it is the only input that
	// can push the *fallback* over on a platform where the default root cannot.
	it("reports the fallback's own cost and the ceiling when the temp root cannot hold it", () => {
		const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
		try {
			const canonicalDir = "/Users/arthur/.omp/profiles/upstream/ssh-control";
			const choice = resolveSshControlDir({
				canonicalDir,
				platform: "darwin",
				uid: 501,
				tmpBase: `/var/folders/${"x".repeat(80)}`,
			});

			// Still returned rather than thrown: `CONTROL_DIR` is derived from this
			// call at module load, so refusing here would take down every importer.
			expect(choice.shared).toBe(true);
			expect(warn).toHaveBeenCalledTimes(1);

			const [message, context] = warn.mock.calls[0] as [string, Record<string, unknown>];
			expect(message).toContain("sun_path");
			expect(context.dir).toBe(choice.dir);
			expect(context.cost).toBe(controlPathWorstCase(choice.dir));
			expect(context.limit).toBe(controlPathSunPathLimit("darwin"));
			// Over the ceiling by the margin the receipt reports — the number that
			// used to be discarded is now the one a user acts on.
			expect(context.cost as number).toBeGreaterThan(context.limit as number);
			expect((context.cost as number) - (context.limit as number)).toBe(-controlPathHeadroom(choice.dir, "darwin"));
		} finally {
			warn.mockRestore();
		}
	});

	it("never relocates on Windows (ControlMaster unused) even for a long path", () => {
		const canonicalDir = "/Users/arthur/.omp/profiles/upstream/ssh-control";
		expect(resolveSshControlDir({ canonicalDir, platform: "win32", uid: 501 })).toEqual({
			dir: canonicalDir,
			shared: false,
		});
	});

	it("keeps the canonical dir when there is no uid to key the fallback", () => {
		const canonicalDir = "/Users/arthur/.omp/profiles/upstream/ssh-control";
		expect(resolveSshControlDir({ canonicalDir, platform: "darwin", uid: undefined })).toEqual({
			dir: canonicalDir,
			shared: false,
		});
	});
});

describe("controlDirGuardError", () => {
	const ok = { isSymlink: false, isDir: true, uid: 501, mode: 0o700 };

	it("accepts an owner-private directory", () => {
		expect(controlDirGuardError(ok, 501)).toBeNull();
	});

	it("rejects a symlink, non-directory, foreign owner, and loose mode", () => {
		expect(controlDirGuardError({ ...ok, isSymlink: true }, 501)).toBe("is a symlink");
		expect(controlDirGuardError({ ...ok, isDir: false }, 501)).toBe("is not a directory");
		expect(controlDirGuardError({ ...ok, uid: 999 }, 501)).toContain("not 501");
		expect(controlDirGuardError({ ...ok, mode: 0o755 }, 501)).toContain("0700");
	});

	it("skips the owner check when the process has no uid", () => {
		expect(controlDirGuardError({ ...ok, uid: 999 }, undefined)).toBeNull();
	});
});

describe("assertOwnerPrivateDir", () => {
	let scratch: string;

	afterEach(() => {
		if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
	});

	const mkScratch = () => {
		scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-ssh-guard-"));
		return scratch;
	};

	it("accepts a real owner-private directory and normalizes loose perms in place", () => {
		const dir = path.join(mkScratch(), "ctl");
		fs.mkdirSync(dir, { mode: 0o755 });
		fs.chmodSync(dir, 0o755);
		expect(() => assertOwnerPrivateDir(dir)).not.toThrow();
		expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
	});

	it("refuses a symlinked final component without following it (TOCTOU swap guard)", () => {
		const root = mkScratch();
		const victim = path.join(root, "victim");
		fs.mkdirSync(victim, { mode: 0o700 });
		const link = path.join(root, "ctl");
		fs.symlinkSync(victim, link);
		// A symlink pointing at an otherwise-valid 0700 directory must still be
		// rejected: O_NOFOLLOW refuses the link itself, so a later re-target cannot
		// slip a foreign directory past the guard.
		expect(() => assertOwnerPrivateDir(link)).toThrow("is a symlink");
	});

	it("refuses a non-directory", () => {
		const file = path.join(mkScratch(), "ctl");
		fs.writeFileSync(file, "");
		expect(() => assertOwnerPrivateDir(file)).toThrow("is not a directory");
	});
});
