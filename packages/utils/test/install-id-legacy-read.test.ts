import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	__resetConfigDirCacheForTests,
	__resetInstallIdCacheForTests,
	CONFIG_DIR_NAME_NEXT,
	LEGACY_CONFIG_DIR_NAME,
	getInstallId,
} from "@oh-my-pi/pi-utils/dirs";
import { Snowflake } from "@oh-my-pi/pi-utils/snowflake";

/**
 * The install id is what stops a server from treating one machine as many.
 * Renaming the config root must not re-identify every existing user as a new
 * install — so a legacy id is not just readable, it is *adopted*, and copied
 * forward so the next process finds it in the canonical place.
 *
 * Both halves matter and they fail independently. Asserting only "some UUID
 * comes back" passes on a system that mints a fresh id and quietly splits one
 * install into two. Asserting only "the file was copied" passes on a system
 * that copies the wrong value.
 */
const KNOWN_ID = "11111111-2222-3333-4444-555555555555";

let home = "";

beforeEach(async () => {
	home = path.join(os.tmpdir(), `omp-install-id-legacy-${Snowflake.next()}`);
	await fs.mkdir(home, { recursive: true });
	spyOn(os, "homedir").mockReturnValue(home);
	delete process.env.PI_CONFIG_DIR;
	delete process.env.ULTRAWORKERS_CONFIG_DIR;
	__resetConfigDirCacheForTests();
	__resetInstallIdCacheForTests();
});

afterEach(async () => {
	mock.restore();
	__resetConfigDirCacheForTests();
	__resetInstallIdCacheForTests();
	await fs.rm(home, { recursive: true, force: true });
});

function legacyIdFile(): string {
	return path.join(home, LEGACY_CONFIG_DIR_NAME, "install-id");
}

function canonicalIdFile(): string {
	return path.join(home, CONFIG_DIR_NAME_NEXT, "install-id");
}

async function plantLegacyId(id: string): Promise<void> {
	await fs.mkdir(path.dirname(legacyIdFile()), { recursive: true });
	await fs.writeFile(legacyIdFile(), `${id}\n`);
}

describe("getInstallId across a renamed config root", () => {
	it("returns the legacy UUID itself, not merely a UUID", async () => {
		await plantLegacyId(KNOWN_ID);
		expect(getInstallId()).toBe(KNOWN_ID);
	});

	it("copies the adopted id into the canonical root so the next process finds it there", async () => {
		// The converging half. Without it the system reads the legacy root forever
		// and never migrates, which is indistinguishable from success until the
		// legacy directory is eventually deleted.
		await plantLegacyId(KNOWN_ID);
		const adopted = getInstallId();

		expect(await Bun.file(canonicalIdFile()).exists()).toBe(true);
		expect((await fs.readFile(canonicalIdFile(), "utf8")).trim()).toBe(adopted);
		expect(adopted).toBe(KNOWN_ID);
	});

	it("prefers an id already in the canonical root over the legacy one", async () => {
		// Both roots populated: the canonical one is where new writes go, so it is
		// the authority. Reading legacy here would undo a completed migration.
		const canonical = "99999999-8888-7777-6666-555555555555";
		await plantLegacyId(KNOWN_ID);
		await fs.mkdir(path.dirname(canonicalIdFile()), { recursive: true });
		await fs.writeFile(canonicalIdFile(), `${canonical}\n`);

		expect(getInstallId()).toBe(canonical);
	});

	it("ignores an unparseable legacy file instead of adopting it", async () => {
		await plantLegacyId("not-a-uuid");
		const id = getInstallId();

		expect(id).not.toBe("not-a-uuid");
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		// And the replacement lands in the canonical root, never back in legacy.
		expect((await fs.readFile(canonicalIdFile(), "utf8")).trim()).toBe(id);
	});
});
