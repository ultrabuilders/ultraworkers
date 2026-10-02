/**
 * Which process holding the port is one of ours.
 *
 * ## The failure this was raised against
 *
 * The rebrand renamed the installed binary from `omp` to `ultraworkers`, and this
 * module's identity check hardcoded the old spelling in two places: the runtime
 * image table and the "is this `<binary> stats`" test. Renaming the binary
 * without touching them does not error — the port holder simply stops being
 * recognised, and `prepareStatsPort` refuses forever with "not identifiable as
 * an omp stats dashboard". The refusal is the safe direction, which is exactly
 * why it would have gone unnoticed: it looks like the code protecting you.
 *
 * ## Why both spellings are asserted
 *
 * Not every install is renamed at once. A port held by a dashboard running under
 * the pre-rebrand name must still be reclaimable, so the check accepts both. The
 * second assertion is therefore a regression guard, not a restatement: drop the
 * old name from `MAIN_BINARY_NAMES` and anyone on a previous install silently
 * stops being reclaimed, with no test failing otherwise.
 *
 * ## Why these run against the exported predicate
 *
 * Reaching this through `prepareStatsPort` needs a real listener per spelling.
 * That would only ever exercise the name this machine happens to run, which is
 * precisely the spelling that is not under test.
 */
import { describe, expect, it } from "bun:test";
import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";
import { isStatsDashboardProcess, normalizeImage } from "../src/port-conflict";

describe("a process holding the stats port", () => {
	it("is recognised under the CURRENT binary name", () => {
		// The regression this file exists for: rename the binary, keep the check.
		expect(isStatsDashboardProcess(APP_NAME, `${APP_NAME} stats --port 7777`)).toBe(true);
	});

	it("is STILL recognised under the pre-rebrand binary name", () => {
		// Regression guard. A user who has not reinstalled still runs the old
		// name; if this stops matching, their port is refused forever instead of
		// reclaimed, and nothing else in the suite notices.
		expect(isStatsDashboardProcess("omp", "omp stats --port 7777")).toBe(true);
	});

	it("is recognised when the image was renamed but the command line was not", () => {
		// A half-updated install: the executable is current, the argv a wrapper
		// recorded still says the old name. Detection must survive the mismatch
		// in either direction, since the two come from different systems.
		expect(isStatsDashboardProcess(APP_NAME, "omp stats --port 7777")).toBe(true);
		expect(isStatsDashboardProcess("omp", `${APP_NAME} stats --port 7777`)).toBe(true);
	});

	it("NEGATIVE: the same binary running a different subcommand is not the dashboard", () => {
		// The four child processes share the binary name. Recognising them would
		// make this module willing to kill a language server to free a port.
		expect(isStatsDashboardProcess(APP_NAME, `${APP_NAME} lsp mux`)).toBe(false);
		expect(isStatsDashboardProcess("omp", "omp ida some-instance")).toBe(false);
	});

	it("NEGATIVE: an unrelated process is not the dashboard", () => {
		expect(isStatsDashboardProcess("node", "node /srv/app/server.js")).toBe(false);
		expect(isStatsDashboardProcess("python3", "/usr/bin/stats-collector --port 7777")).toBe(false);
	});

	it("keeps APP_NAME safe to splice into the identity pattern", () => {
		// `MAIN_BINARY_ALTERNATION` is joined straight into a RegExp source with
		// no escaping, which is only sound while the name is a plain slug. If a
		// future name carries a metacharacter this fails here, rather than the
		// pattern quietly matching the wrong thing.
		expect(APP_NAME).toMatch(/^[a-z0-9-]+$/);
	});

	it("normalises a .exe suffix and a deleted marker before matching", () => {
		// Windows reports `ultraworkers.exe`; a replaced binary reports
		// `(deleted)` on Linux. Both must fold to the name the tables use.
		expect(normalizeImage(`${APP_NAME}.exe`)).toBe(APP_NAME);
		expect(normalizeImage(`${APP_NAME} (deleted)`)).toBe(APP_NAME);
	});
});
