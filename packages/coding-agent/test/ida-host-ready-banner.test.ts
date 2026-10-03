import { describe, expect, it } from "bun:test";
import { APP_NAME } from "@oh-my-pi/pi-utils";
import { IDA_HOST_READY_PATTERN, idaHostReadyBanner } from "../src/ida/protocol";

// Contract: the broker learns a spawned IDA host is up by matching the banner the
// host prints on stdout against a regex the client supplies
// (`launch/services.ts` compiles `ready.log` with `new RegExp(…, "u")` and tests
// each output line). Those are two ends of one handshake, written in two files.
//
// The failure this guards: one side is renamed and the other is not. Nothing else
// observes that pair — the host still starts, the client still spawns it, and the
// only symptom is a readiness timeout on every database open, with no error naming
// the mismatch. Asserting the pair "matches" is what catches it, because the two
// sides carry the product name differently on purpose: the pattern carries none,
// the banner carries it through `APP_NAME`. Re-pinning a name into the pattern
// breaks the match the moment `APP_NAME` differs from it, which is exactly the
// rename this file exists to survive.

describe("IDA host readiness handshake", () => {
	it("matches the banner the host actually prints", () => {
		const banner = idaHostReadyBanner("/tmp/ida-abc.sock");
		expect(new RegExp(IDA_HOST_READY_PATTERN, "u").test(banner)).toBe(true);
	});

	it("keeps matching when the product name changes", () => {
		// The rename-proof property, stated directly rather than implied: the pattern
		// has no product name in it, so a banner carrying ANY name still matches. If a
		// name is ever pinned back into the pattern, this is the assertion that fails —
		// a second banner under a different brand stops matching, while the test above
		// keeps passing because `APP_NAME` still happens to agree with the pattern.
		const foreign = `some-other-product ida host listening on /tmp/ida-abc.sock`;
		expect(new RegExp(IDA_HOST_READY_PATTERN, "u").test(foreign)).toBe(true);
	});

	it("advertises the real product name to the user reading the host's stdout", () => {
		// The brand is not erased from the contract — it is moved to the one side that
		// only a human reads. A banner stripped of the name would satisfy both
		// assertions above and still be a worse product.
		expect(idaHostReadyBanner("/tmp/ida-abc.sock")).toContain(APP_NAME);
	});
});
