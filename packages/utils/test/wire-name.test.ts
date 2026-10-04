import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { WIRE_NAME } from "../src/dirs";

describe("WIRE_NAME", () => {
	// The DAP, Warp, ACP and puush integrations are all golden-pinned to this exact
	// byte sequence. Changing it silently renames the agent in every one of them at
	// once, and nothing in those packages would fail — they would just start sending
	// a name their peers do not recognise.
	it("pins the shared wire identity to the value the DAP, Warp, ACP and puush integrations are golden-pinned to", () => {
		expect(WIRE_NAME).toBe("ultraworkers");
	});

	it("is still the name an installer puts on PATH", async () => {
		// The row above is a copy of the contract, and a copy stays green after the
		// thing it copies moves: rename the `bin` key in the coding-agent manifest —
		// precisely what a rename does — and the assertion above, every help output,
		// and every generated completion script would all still pass, while the user
		// is pasting a command their machine no longer has.
		//
		// So the manifest is the floor, and this row is what connects the constant to
		// it. `packages/coding-agent` is the package that publishes the binary.
		const manifest = (await Bun.file(path.resolve(import.meta.dir, "../../coding-agent/package.json")).json()) as {
			bin: Record<string, string>;
		};
		const invocable = Object.keys(manifest.bin)[0];
		expect(invocable).toBeTruthy();
		expect(WIRE_NAME).toBe(invocable);
	});
});
