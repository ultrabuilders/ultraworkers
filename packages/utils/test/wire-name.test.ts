import { describe, expect, it } from "bun:test";
import { WIRE_NAME } from "../src/dirs";

describe("WIRE_NAME", () => {
	// The DAP, Warp, ACP and puush integrations are all golden-pinned to this exact
	// byte sequence. Changing it silently renames the agent in every one of them at
	// once, and nothing in those packages would fail — they would just start sending
	// a name their peers do not recognise.
	it("pins the shared wire identity to the value the DAP, Warp, ACP and puush integrations are golden-pinned to", () => {
		expect(WIRE_NAME).toBe("omp");
	});
});
