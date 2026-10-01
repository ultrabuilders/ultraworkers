/**
 * The name the agent re-invokes itself under.
 *
 * This one string decides whether a subprocess launch works at all: `resolveOmpCommand()`
 * hands `cmd` to a spawn, and a command that is not on PATH fails at exec time with an
 * error that names neither the brand nor the real command.
 *
 * It was a literal, `"omp"` / `"omp.cmd"`. A literal is right only until the binary is
 * renamed, at which point it silently spawns a command that does not exist — and nothing
 * in the tree turns red, because every other assertion still agrees with the old name.
 * That is the fourth appearance of one defect in this repo (after `BUNDLED_PACKAGES`,
 * `cacheKey`, and the help/completion name split in `109eede339`).
 *
 * So it is pinned against `package.json#bin`, which is the floor for "a command you can
 * type". The earlier `expect(DEFAULT_CMD).toBe("omp")` shape would stay green through the
 * rename and protect nothing.
 */
import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { DEFAULT_CMD } from "../../src/task/omp-command";

const manifestPath = path.resolve(import.meta.dir, "../../package.json");

describe("the command the agent re-invokes itself under", () => {
	it("is the command the installer puts on PATH, on this platform", async () => {
		const manifest = (await Bun.file(manifestPath).json()) as {
			bin: Record<string, string>;
		};
		const invocable = Object.keys(manifest.bin)[0];
		expect(invocable).toBeTruthy();

		// `process.platform` is read once at module load, so this asserts the branch
		// this machine takes. The suffix is checked separately below because it is the
		// part a rename would leave behind.
		const suffix = process.platform === "win32" ? ".cmd" : "";
		expect(DEFAULT_CMD).toBe(`${invocable}${suffix}`);
	});

	it("keeps the Windows extension off the name on every other platform", () => {
		// The suffix is platform-dependent, so it cannot be folded into the row above
		// without making that row untestable off Windows. Asserted as a relationship
		// rather than a value: whatever the platform, the base is the bare command and
		// only Windows gains an extension.
		if (process.platform === "win32") {
			expect(DEFAULT_CMD.endsWith(".cmd")).toBe(true);
		} else {
			expect(DEFAULT_CMD.endsWith(".cmd")).toBe(false);
		}
		expect(DEFAULT_CMD).not.toContain(" ");
	});
});
