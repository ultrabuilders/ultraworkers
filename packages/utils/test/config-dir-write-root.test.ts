import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	__resetConfigDirCacheForTests,
	CONFIG_DIR_NAME_NEXT,
	LEGACY_CONFIG_DIR_NAME,
	getConfigDirName,
	getConfigReadRootName,
	getConfigWriteRootName,
} from "@oh-my-pi/pi-utils/dirs";
import { Snowflake } from "@oh-my-pi/pi-utils/snowflake";

/**
 * Reads and writes answer differently on purpose, and the environment overrides
 * outrank both. These are separate tests rather than one table because each
 * answers a different question a user can ask: "where did my settings go",
 * "where did my new settings land", and "why is it somewhere else entirely".
 */
let home = "";

beforeEach(async () => {
	home = path.join(os.tmpdir(), `ultraworkers-config-write-root-${Snowflake.next()}`);
	await fs.mkdir(home, { recursive: true });
	spyOn(os, "homedir").mockReturnValue(home);
	delete process.env.PI_CONFIG_DIR;
	delete process.env.ULTRAWORKERS_CONFIG_DIR;
	__resetConfigDirCacheForTests();
});

afterEach(async () => {
	mock.restore();
	delete process.env.PI_CONFIG_DIR;
	delete process.env.ULTRAWORKERS_CONFIG_DIR;
	__resetConfigDirCacheForTests();
	await fs.rm(home, { recursive: true, force: true });
});

async function makeRoot(name: string): Promise<void> {
	await fs.mkdir(path.join(home, name), { recursive: true });
}

describe("write root", () => {
	it("names the canonical root even when the legacy one exists", async () => {
		// No filesystem probe on the write path, deliberately: a writer that asked
		// the disk would keep writing into `.omp` for as long as it existed, which
		// is the opposite of migrating away from it.
		await makeRoot(LEGACY_CONFIG_DIR_NAME);
		expect(getConfigWriteRootName()).toBe(CONFIG_DIR_NAME_NEXT);
		expect(getConfigWriteRootName()).not.toBe(LEGACY_CONFIG_DIR_NAME);
	});

	it("splits a dual-root install: reads land in legacy, writes in canonical", async () => {
		// The whole point of two functions. A single accessor would have to pick
		// one, and either choice loses an install's settings.
		await makeRoot(LEGACY_CONFIG_DIR_NAME);
		await makeRoot(CONFIG_DIR_NAME_NEXT);

		expect(getConfigReadRootName()).toBe(CONFIG_DIR_NAME_NEXT);
		expect(getConfigWriteRootName()).toBe(CONFIG_DIR_NAME_NEXT);

		// With only the legacy root present the split is visible.
		__resetConfigDirCacheForTests();
		await fs.rm(path.join(home, CONFIG_DIR_NAME_NEXT), { recursive: true, force: true });
		expect(getConfigReadRootName()).toBe(LEGACY_CONFIG_DIR_NAME);
		expect(getConfigWriteRootName()).toBe(CONFIG_DIR_NAME_NEXT);
	});
});

describe("environment override precedence", () => {
	it("prefers the canonical variable when both are set", () => {
		// Tested as its own case, not inferred from the resolution order: the two
		// questions have different sources and a change to one need not move the
		// other.
		process.env.PI_CONFIG_DIR = "legacy-root";
		process.env.ULTRAWORKERS_CONFIG_DIR = "canonical-root";
		expect(getConfigDirName()).toBe("canonical-root");
	});

	it("honours the legacy variable on its own", () => {
		process.env.PI_CONFIG_DIR = "legacy-root";
		expect(getConfigDirName()).toBe("legacy-root");
	});

	it("falls through to resolution when neither variable is set", async () => {
		await makeRoot(LEGACY_CONFIG_DIR_NAME);
		expect(getConfigDirName()).toBe(LEGACY_CONFIG_DIR_NAME);
	});

	it("treats an empty canonical variable as unset rather than as a path", () => {
		// An empty string is truthy in JavaScript but names no directory. Honoring
		// it would resolve the config root to "" and write into the home
		// directory itself.
		process.env.PI_CONFIG_DIR = "legacy-root";
		process.env.ULTRAWORKERS_CONFIG_DIR = "";
		expect(getConfigDirName()).toBe("legacy-root");
	});
});
