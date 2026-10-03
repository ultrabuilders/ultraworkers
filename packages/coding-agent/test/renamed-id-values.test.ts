/**
 * The renamed values must still be produced. A gate that only proves "nobody reads
 * the old name" is satisfied just as well by a file that no longer emits anything,
 * so this asserts the value is actually produced at the call site.
 *
 * The CONSUMER-ABSENCE half of this change lives in
 * `scripts/rename/check-role-and-id-consumers.ts`, deliberately not here: AGENTS.md
 * bans tests that read implementation source, and proving absence across the repo is
 * a census, not a unit test. This file covers only what running the code can show.
 */
import { describe, expect, it } from "bun:test";
import { buildHarLog } from "@oh-my-pi/pi-coding-agent/tools/browser/network";

describe("a renamed HAR value is still produced", () => {
	it("emits the current creator name in a HAR 1.2 log", () => {
		const har = buildHarLog([]) as {
			log: { version: string; entries: unknown[]; creator: { name: string; version: string } };
		};
		// The HAR 1.2 shape is the contract; only the creator's NAME is ours.
		expect(har.log.version).toBe("1.2");
		expect(har.log.creator.name).toBe("ultraworkers-browser");
		expect(har.log.creator.version).toBe("1");
		// An empty entry list must still produce the document, or a recording that
		// captured nothing would skip the creator block and a viewer would show a
		// HAR with no producer at all.
		expect(Array.isArray(har.log.entries)).toBe(true);
	});
});
