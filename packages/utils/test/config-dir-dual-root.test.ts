import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	__resetConfigDirCacheForTests,
	CONFIG_DIR_NAME_NEXT,
	LEGACY_CONFIG_DIR_NAME,
	XDG_CONFIG_DIR_CANDIDATES,
	getConfigDirCandidates,
	getConfigReadRootName,
	getConfigWriteRootName,
} from "@oh-my-pi/pi-utils/dirs";
import { Snowflake } from "@oh-my-pi/pi-utils/snowflake";

/**
 * A config root has to resolve somewhere before it exists. Get that wrong in
 * either direction and an install splits in half: reads from one directory,
 * writes to another, and the user sees settings they cannot find.
 *
 * The read side must find an install where it already is (legacy first-run is
 * the common case); the write side must go to the canonical name or the
 * rebrand never actually moves anything. These are different answers on
 * purpose, which is why they are separate functions and not one flag.
 */
const HOME_TMP = ".omp-config-dir-dual-root";

let home = "";
let originalXdg: Record<string, string | undefined> = {};

beforeEach(async () => {
	home = path.join(os.tmpdir(), `${HOME_TMP}-${Snowflake.next()}`);
	await fs.mkdir(home, { recursive: true });
	spyOn(os, "homedir").mockReturnValue(home);
	originalXdg = {
		XDG_DATA_HOME: process.env.XDG_DATA_HOME,
		XDG_STATE_HOME: process.env.XDG_STATE_HOME,
		XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
	};
	for (const key of Object.keys(originalXdg)) delete process.env[key];
	__resetConfigDirCacheForTests();
});

afterEach(async () => {
	mock.restore();
	__resetConfigDirCacheForTests();
	for (const [key, value] of Object.entries(originalXdg)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	await fs.rm(home, { recursive: true, force: true });
});

async function makeRoot(name: string): Promise<string> {
	const dir = path.join(home, name);
	await fs.mkdir(dir, { recursive: true });
	return dir;
}

describe("config root candidate list", () => {
	it("orders canonical before legacy, and is the same list for reads and writes", () => {
		const candidates = getConfigDirCandidates();
		expect(candidates[0]).toBe(CONFIG_DIR_NAME_NEXT);
		expect(candidates[candidates.length - 1]).toBe(LEGACY_CONFIG_DIR_NAME);

		// One source for both sides: two lists that agree today are two lists
		// that drift, and the drift only shows up on a user's machine.
		expect(getConfigWriteRootName()).toBe(candidates[0]);
	});

	it("hands out a fresh array so a caller cannot mutate the shared list", () => {
		const first = getConfigDirCandidates();
		first.push("injected");
		expect(getConfigDirCandidates()).not.toContain("injected");
	});

	it("keeps the XDG spellings distinct from the home ones", () => {
		// The dot-prefix difference is load-bearing, not cosmetic: sharing one
		// list is wrong for exactly one of the two roots, and wrong invisibly
		// while XDG_*_HOME is unset — the case nobody is watching.
		const home_ = getConfigDirCandidates();
		for (const name of home_) expect(name.startsWith(".")).toBe(true);
		for (const name of XDG_CONFIG_DIR_CANDIDATES) expect(name.startsWith(".")).toBe(false);
		expect(new Set(home_).size).toBe(home_.length);
	});
});

describe("read root resolution", () => {
	it("resolves under the legacy root when only the legacy one exists", async () => {
		await makeRoot(LEGACY_CONFIG_DIR_NAME);
		expect(getConfigReadRootName()).toBe(LEGACY_CONFIG_DIR_NAME);
	});

	it("prefers the canonical root when both exist", async () => {
		await makeRoot(LEGACY_CONFIG_DIR_NAME);
		await makeRoot(CONFIG_DIR_NAME_NEXT);
		expect(getConfigReadRootName()).toBe(CONFIG_DIR_NAME_NEXT);
	});

	it("falls through to the write root when neither exists", async () => {
		// A fresh install must not be handed the legacy name just because nothing
		// is on disk yet — that is how a brand-new install recreates `.omp`.
		expect(getConfigReadRootName()).toBe(CONFIG_DIR_NAME_NEXT);
	});

	it("caches the winner, so a root cannot move mid-process", async () => {
		await makeRoot(LEGACY_CONFIG_DIR_NAME);
		expect(getConfigReadRootName()).toBe(LEGACY_CONFIG_DIR_NAME);
		// The canonical root appears afterwards. A cache that re-probed here would
		// silently move the install under a live process.
		await makeRoot(CONFIG_DIR_NAME_NEXT);
		expect(getConfigReadRootName()).toBe(LEGACY_CONFIG_DIR_NAME);
		__resetConfigDirCacheForTests();
		expect(getConfigReadRootName()).toBe(CONFIG_DIR_NAME_NEXT);
	});
});
