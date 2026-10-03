/**
 * Contract: `plugin doctor` reports an extension module that did not load.
 *
 * Install already refuses a plugin whose declared extension entry is missing
 * (`MarketplaceManager#validateInstalledExtensions` throws on a `null`
 * `resolvedPath`, and loads what it can to surface factory failures). What
 * nothing does is re-check afterwards. A plugin that passed install and later
 * lost its entry file — a partial upgrade, a pruned `node_modules`, a lockfile
 * that kept the entry while the tree did not — is reported by `plugin list` and
 * `plugin doctor` as healthy, and its tool, command and hook are simply absent.
 * That is the failure `doctor.ts` names in its own docblock: "a dead seam
 * wearing a live one: nothing throws, and the only symptom is a tool that
 * silently never appears" — and until now only `seam:themes-resolve` could
 * report one.
 *
 * The snapshot is injected so the three states are reachable without breaking a
 * real plugin on the developer's machine, and so the cases differ in exactly one
 * field: a check that reported "ok" for every input would pass all of them.
 */
import { describe, expect, it } from "bun:test";
import type { DoctorSnapshot } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";
import { runDoctorChecks } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";

/**
 * A snapshot that is otherwise identical; only the extension load errors vary.
 * Omitting the field models the partial snapshots callers that predate this
 * check pass, so the "not observed" case is reachable too.
 */
function snapshotWith(extensionLoadErrors?: Array<{ path: string; error: string }>): DoctorSnapshot {
	return {
		themes: [],
		resolveTheme: () => undefined,
		builtinTools: [],
		...(extensionLoadErrors === undefined ? {} : { extensionLoadErrors }),
	};
}

const find = (checks: Awaited<ReturnType<typeof runDoctorChecks>>, name: string) => checks.find(c => c.name === name);

describe("doctor reports extension modules that failed to load", () => {
	it("errors and names each module that did not load", async () => {
		const checks = await runDoctorChecks(
			snapshotWith([
				{ path: "/plugins/hello-extension/index.ts", error: "Failed to load extension: boom" },
				{ path: "/plugins/other/index.ts", error: "Extension does not export a valid factory function" },
			]),
		);
		const found = find(checks, "seam:extensions-load");
		expect(found).toBeDefined();
		expect(found!.status).toBe("error");
		// Actionable on its own: the user must be able to tell WHICH plugin broke
		// and WHY, not just that something did.
		expect(found!.message).toContain("hello-extension");
		expect(found!.message).toContain("does not export a valid factory function");
	});

	// The negative contract. A doctor whose failure branch reports "ok" when the
	// load produced no errors is the all-clear this check exists to earn — and a
	// healthy profile must not gain a red row for having nothing wrong with it.
	it("reports ok, and counts, when every module loaded", async () => {
		const checks = await runDoctorChecks(snapshotWith([]));
		const found = find(checks, "seam:extensions-load");
		expect(found).toBeDefined();
		expect(found!.status).toBe("ok");
	});

	// A partial snapshot is not evidence of health. Omitting the field means the
	// caller never observed the load, so claiming "ok" would be an all-clear
	// manufactured from the absence of a field — the same all-clear that made a
	// dead plugin indistinguishable from a live one.
	it("says nothing when the caller did not observe a load", async () => {
		const checks = await runDoctorChecks(snapshotWith(undefined));
		expect(find(checks, "seam:extensions-load")).toBeUndefined();
	});
});
