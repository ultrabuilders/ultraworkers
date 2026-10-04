/**
 * Contracts for `/rename`.
 *
 * Each test names the failure a human or an agent would observe. Three of the
 * four exist because the obvious implementation is wrong in a way that still
 * *looks* like it works.
 */

import { describe, expect, test } from "bun:test";
import { renameName } from "../src/identity/rename";

const none = () => false;
const taken =
	(...keys: string[]) =>
	(key: string) =>
		keys.includes(key.toLowerCase());

describe("/rename", () => {
	test("refuses a name that is nothing but stripped characters", () => {
		// The failure this defends: silently substituting a generated name hands
		// back a name nobody asked for and then publishes it to every peer.
		expect(renameName("BlueLake", "", none)).toEqual({ kind: "refused", reason: "empty", requested: "" });
	});

	test("refuses reserved names so a peer cannot call itself `user`", () => {
		// The failure this defends: `user` in a transcript is the impersonation
		// that actually misleads a human, so it survives arbitrary rename.
		expect(renameName("BlueLake", "user", none)).toMatchObject({ kind: "refused", reason: "reserved" });
		expect(renameName("BlueLake", "SYSTEM", none)).toMatchObject({ kind: "refused", reason: "reserved" });
	});

	test("uniqueness is case-insensitive", () => {
		// The failure this defends: `send` refuses an ambiguous name rather than
		// guessing, so a rename that creates `bluelake` next to `BlueLake` breaks
		// delivery for BOTH sessions instead of disambiguating one.
		expect(renameName("GreenCastle", "BlueLake", taken("bluelake"))).toMatchObject({
			kind: "refused",
			reason: "taken",
		});
	});

	test("re-asserting your own current name is not a collision", () => {
		// The failure this defends: `isTaken` reports the caller's own key, so a
		// session can never confirm or restore the name it already has.
		expect(renameName("BlueLake", "BlueLake", taken("bluelake"))).toEqual({
			kind: "renamed",
			from: "BlueLake",
			to: "BlueLake",
		});
	});

	test("strips control and format characters from an arbitrary string", () => {
		// The failure this defends: a name reaches a TUI renderer, so U+001B or
		// U+200E surviving into a label is a display attack, not cosmetics.
		//
		// Stripped, not replaced: NUL, ESC and U+200E all vanish rather than
		// becoming something visible. `[2J` is literal text and survives, because
		// the filter drops characters rather than parsing escape sequences.
		expect(renameName("BlueLake", "Data\u0000base Migrator\u001B[2J\u200E", none)).toEqual({
			kind: "renamed",
			from: "BlueLake",
			to: "Database Migrator[2J",
		});
	});
});
