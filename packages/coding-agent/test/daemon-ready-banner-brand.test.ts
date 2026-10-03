import { describe, expect, it } from "bun:test";
import { APP_NAME } from "@oh-my-pi/pi-utils";
import { IDA_DAEMON_PREFIX, IDA_HOST_READY_PATTERN, idaDaemonName, idaHostReadyBanner } from "../src/ida/protocol";
import { LSP_MUX_READY_PATTERN, lspMuxReadyBanner } from "../src/lsp/mux/protocol";
import { TEXT_PREDICT_READY_PATTERN, textPredictReadyBanner } from "../src/predict/protocol";
import { BLOB_BROKER_READY_PATTERN, blobBrokerReadyBanner } from "../src/blob-broker/protocol";

// Contract, shared by every broker-owned daemon in this repo.
//
// Each of these daemons is started by the daemon broker (`launch/services.ts`),
// which waits for a readiness banner: the worker prints one line on stdout and
// the client hands the broker a regex (`ready.log`, compiled with
// `new RegExp(…, "u")`) to match it against. Those are two ends of one handshake
// written in two files — the banner in the worker's entry, the pattern in the
// protocol module the client imports.
//
// The rule this file holds them to: **the name travels to the side a human
// reads, and stays off the side a machine matches.** The banner leads with
// `APP_NAME`; the pattern carries no product name at all.
//
// The failure it guards is silent in both directions. Pin a name into a pattern
// and the worker still starts, the client still spawns it, and the only symptom
// is a readiness timeout on every launch with no error naming the mismatch —
// which is exactly what happens the moment `APP_NAME` stops agreeing with the
// literal. Strip the name from a banner and the handshake still matches, but the
// daemon announces itself to `ultraworkers ps` under a product that does not
// exist. Neither shows up as an error.
//
// `relay/daemon.ts:26` was already brand-free before this rule was written down;
// the rest of this table is that shape applied to its siblings.

const HANDSHAKES: { name: string; pattern: string; banner: (endpoint: string) => string }[] = [
	{ name: "ida host", pattern: IDA_HOST_READY_PATTERN, banner: idaHostReadyBanner },
	{ name: "lsp mux", pattern: LSP_MUX_READY_PATTERN, banner: lspMuxReadyBanner },
	{ name: "text-predict", pattern: TEXT_PREDICT_READY_PATTERN, banner: textPredictReadyBanner },
	{ name: "blob broker", pattern: BLOB_BROKER_READY_PATTERN, banner: blobBrokerReadyBanner },
];

describe.each(HANDSHAKES)("$name readiness handshake", ({ pattern, banner }) => {
	it("matches the banner the worker actually prints", () => {
		expect(new RegExp(pattern, "u").test(banner("endpoint-1"))).toBe(true);
	});

	it("carries no product name, so a foreign-brand banner still matches", () => {
		// The rename-proof property. If a name is ever pinned back into the pattern,
		// this is the assertion that fails: the banner above still matches while
		// `APP_NAME` happens to agree with the literal, so the first test alone
		// cannot see it.
		expect(new RegExp(pattern, "u").test(`some-other-product ${banner("endpoint-1").slice(APP_NAME.length)}`)).toBe(
			true,
		);
	});

	it("advertises the real product name to whoever reads the worker's stdout", () => {
		// The name is moved, not erased. A banner stripped of it would satisfy both
		// assertions above and still be a worse product.
		expect(banner("endpoint-1")).toContain(APP_NAME);
	});
});

// Same rule, one layer up: the daemon NAME a user reads in `ultraworkers ps`.
// `client.ts` filters and parses by this prefix rather than a literal, so nothing
// migrates — but the docblocks in `host.ts` and `client.ts` both claim the name
// carries the product name, and they were describing a string the code did not
// produce. Deriving the constant from APP_NAME is what stops them drifting again.
describe("ida daemon name", () => {
	it("carries the product name the ps docblocks describe", () => {
		expect(idaDaemonName("loc-1")).toBe(`${APP_NAME}.ida.loc-1`);
	});

	it("is what the client matches a broker daemon by", () => {
		// `client.ts` builds the name it looks for from the same constant, so a
		// ref that round-trips is the property that keeps hosts attachable.
		const name = idaDaemonName("loc-1");
		expect(name.startsWith(IDA_DAEMON_PREFIX)).toBe(true);
		expect(name.startsWith(APP_NAME)).toBe(true);
	});

	it("still fits the broker's 48-character daemon-name cap when hashed", () => {
		// An id with characters the broker rejects, or long enough to force the
		// hashed branch at protocol.ts:76.
		expect(idaDaemonName("a/b:c d").length).toBeLessThanOrEqual(48);
		expect(idaDaemonName("x".repeat(200)).length).toBeLessThanOrEqual(48);
	});
});
