import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	__resetConfigDirCacheForTests,
	CONFIG_DIR_NAME_NEXT,
	LEGACY_CONFIG_DIR_NAME,
	getConfigReadRootName,
} from "@oh-my-pi/pi-utils/dirs";
import { Snowflake } from "@oh-my-pi/pi-utils/snowflake";

/**
 * `getConfigReadRootName` picks the home-scoped config root a read resolves
 * against. Picking it by "first directory that exists" is not enough: two getters
 * create the canonical parent as a SIDE EFFECT (`getInstallId` writing
 * `install-id`, `adoptLegacyFile` copying a secret), so a directory that exists
 * is not evidence that it holds config.
 *
 * Observable consequence when the rule is wrong: a user whose real settings live
 * in the legacy root sees an EMPTY config, because the freshly-created canonical
 * directory won the read and holds no `config.yml`. Every assertion below is
 * about which root the settings layer resolves to, not about the helper's shape.
 */

const HOME_TMP = ".omp-config-read-root-marker";

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

/**
 * Create a config root containing a main config file, i.e. a real one.
 *
 * The file goes in `<root>/agent/`, NOT `<root>/` — every reader joins
 * MAIN_CONFIG_FILENAMES onto the agent dir, so a test that wrote the file at the
 * root would pass while the real resolution path stayed broken.
 */
async function rootWithConfig(name: string, filename = "config.yml"): Promise<string> {
	const dir = path.join(home, name, "agent");
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, filename), "model: test\n");
	return dir;
}

/** Create a directory with no config file in it — what a side-effect mkdir leaves. */
async function bareRoot(name: string): Promise<string> {
	const dir = path.join(home, name);
	await fs.mkdir(dir, { recursive: true });
	return dir;
}

describe("a side-effect-created directory cannot capture the read root", () => {
	it("keeps reading the root that has config when the canonical one is empty", async () => {
		// The exact failure: a full legacy install, plus an empty canonical dir
		// created by a getter's mkdirSync. First-that-exists hands the read to the
		// empty one and omp sees no settings at all.
		await rootWithConfig(LEGACY_CONFIG_DIR_NAME);
		await bareRoot(CONFIG_DIR_NAME_NEXT);

		expect(getConfigReadRootName()).toBe(LEGACY_CONFIG_DIR_NAME);
	});

	it("prefers the canonical root once it holds config, even with a fuller legacy one", async () => {
		// The other direction: evidence of config beats mere existence, in
		// candidate order, so a migrated install still reads the canonical root.
		await rootWithConfig(LEGACY_CONFIG_DIR_NAME);
		await rootWithConfig(CONFIG_DIR_NAME_NEXT);

		expect(getConfigReadRootName()).toBe(CONFIG_DIR_NAME_NEXT);
	});

	it("accepts the .yaml spelling as a config root, because reads do", async () => {
		// omp only ever WRITES config.yml (every write site uses
		// MAIN_CONFIG_FILENAMES[0]), but every READ site loops the whole list. A
		// root holding just config.yaml is therefore a real config root, and
		// keying the marker on the first filename only would strand it.
		//
		// The legacy root holds a real config.yml on purpose. Without it this
		// assertion would still pass under a marker narrowed to `config.yml`,
		// because the existence fallback would return the canonical root anyway
		// (it is first in candidate order) — right answer, wrong reason, and the
		// test would prove nothing. With a genuine config root in the legacy
		// directory, a narrowed marker has to choose between them and gets it
		// wrong.
		await rootWithConfig(CONFIG_DIR_NAME_NEXT, "config.yaml");
		await rootWithConfig(LEGACY_CONFIG_DIR_NAME, "config.yml");

		expect(getConfigReadRootName()).toBe(CONFIG_DIR_NAME_NEXT);
	});
});

describe("the existence fallback still guards an unrecognised install", () => {
	it("resolves to an existing root that holds no config file", async () => {
		// Deliberate fallback, and the reason it exists: an install whose settings
		// predate every candidate spelling must keep resolving where its state is
		// rather than falling through to the write root and reading empty. This is
		// the assertion that would fail if step 2 were dropped.
		await bareRoot(LEGACY_CONFIG_DIR_NAME);

		expect(getConfigReadRootName()).toBe(LEGACY_CONFIG_DIR_NAME);
	});

	it("still hands a fresh install the canonical name", async () => {
		expect(getConfigReadRootName()).toBe(CONFIG_DIR_NAME_NEXT);
	});
});
