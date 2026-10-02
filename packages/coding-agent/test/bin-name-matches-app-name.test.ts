import { describe, expect, it } from "bun:test";
import { APP_NAME } from "@oh-my-pi/pi-utils/brand";

describe("installed binary name", () => {
	// The manifest and the brand constant are two independent declarations of one
	// fact, in two packages, so they can drift. When they do, `invokedBinaryName`
	// (src/cli-commands.ts) falls back to APP_NAME for a source-file entry, and the
	// CLI's own "run <name>" advice then names a binary this package never installs.
	// Adding a second bin (an `omp` alias) is also a contract change, so the exact
	// key set is asserted rather than containment.
	it("is exactly the name the CLI echoes back in its own advice", async () => {
		const pkg = (await Bun.file(new URL("../package.json", import.meta.url)).json()) as {
			bin: Record<string, string>;
		};
		expect(Object.keys(pkg.bin)).toEqual([APP_NAME]);
	});
});
