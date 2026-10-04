import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	CONFIG_DIR_NAME,
	createReadToolDefinition,
	parseArgs,
} from "@oh-my-pi/pi-coding-agent/extensibility/legacy-pi-coding-agent-shim";
import { CONFIG_DIR_NAME as HOME_ROOT_CONFIG_DIR_NAME } from "@oh-my-pi/pi-utils";
import { toolReadsSkillUris } from "@oh-my-pi/pi-coding-agent/system-prompt";

describe("legacy shim CLI exports", () => {
	// The constant is bound here rather than spelled as a literal, and that is the
	// whole point of the row. The shim does `export { CONFIG_DIR_NAME } from
	// "@oh-my-pi/pi-utils"`, so it moves when the home-side rename moves; a literal
	// `toBe(".omp")` would go red at that rename, and the obvious repair — typing
	// the new value in — would turn a shim that had drifted back into a green test.
	//
	// Stated plainly so it is not over-trusted: this is NOT a gate today. Both
	// constants are `".omp"` right now, so it passes whether the shim re-exports or
	// copies the value, and it cannot be made red without flipping the rename first.
	// What it buys is that the rename will not manufacture a false red here.
	it("re-exports parseArgs and the live home-root CONFIG_DIR_NAME from the legacy package root", () => {
		expect(CONFIG_DIR_NAME).toBe(HOME_ROOT_CONFIG_DIR_NAME);
		expect(parseArgs(["hello"]).messages).toEqual(["hello"]);
	});
});

describe("legacy read tool skill capability", () => {
	it("leaves the sessionless legacy reader unmarked: its skill reads fall back to the process-global snapshot", async () => {
		const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "legacy-read-skill-")));
		try {
			expect(toolReadsSkillUris(createReadToolDefinition(dir))).toBe(false);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
});
