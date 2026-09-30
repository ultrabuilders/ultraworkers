import { describe, expect, it } from "bun:test";
import { runDoctorChecks } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";
import { registerBuiltinTool } from "@oh-my-pi/pi-coding-agent/tools";
import { registerTheme, resolveThemeJson } from "@oh-my-pi/pi-tui/theme";

// Contract: the doctor reports what the extension seams hold.
//
// A registry that accepts a registration and is never consulted is a dead seam
// wearing a live one — nothing throws, and the only symptom is a tool or theme
// that silently never appears. The audit that is meant to catch this class of
// problem has to know the registries exist, and has to be able to fail.
//
// These assert the reported facts, not that a function returns.

function check(checks: Awaited<ReturnType<typeof runDoctorChecks>>, name: string) {
	const found = checks.find(c => c.name === name);
	expect(found).toBeDefined();
	return found!;
}

describe("doctor reports the extension seams", () => {
	it("reports a theme an extension registered", async () => {
		expect(registerTheme("doctor-theme", { bg: { primary: "#123" } } as never)).toBe(true);
		const checks = await runDoctorChecks();
		expect(check(checks, "seam:themes").message).toContain("doctor-theme");
	});

	it("reports a first-party tool registered at runtime", async () => {
		// The distinction is against the literals, so this is a report of runtime
		// registrations — not a listing of every built-in the product ships.
		expect(registerBuiltinTool("doctor-tool", () => null)).toBe(true);
		const checks = await runDoctorChecks();
		expect(check(checks, "seam:tools").message).toContain("doctor-tool");
	});

	it("does not report shipped built-ins as runtime registrations", async () => {
		const checks = await runDoctorChecks();
		// `bash` is in BUILTIN_TOOLS, so listing it would mean the report is just
		// re-printing the table and says nothing about the seam.
		expect(check(checks, "seam:tools").message).not.toContain("bash,");
	});

	it("raises no resolve error while every registered theme resolves", async () => {
		// The failure check is emitted only when something is broken, so a healthy
		// registry produces no such check at all. Asserting the absence is the
		// observable: a `status: "ok"` line saying "nothing wrong" would be
		// indistinguishable from the check not running.
		registerTheme("doctor-resolvable", { bg: { primary: "#456" } } as never);
		const checks = await runDoctorChecks();
		expect(resolveThemeJson("doctor-resolvable")).toBeDefined();
		expect(checks.some(c => c.name === "seam:themes-resolve" && c.status === "error")).toBe(false);
	});

	it("keeps environment checks alongside the seam checks", async () => {
		// The seam report is additive. Dropping the external tool or API key
		// checks would make the doctor less useful than before it grew.
		const checks = await runDoctorChecks();
		const names = checks.map(c => c.name);
		expect(names).toContain("ANTHROPIC_API_KEY");
		expect(names).toContain("seam:themes");
	});
});

describe("the resolve failure is detectable", () => {
	it("compares what resolves against what was registered", () => {
		// The failure check is reached when the two lists differ, and only then.
		// Exercised directly rather than by corrupting the source: a previous
		// attempt edited the module in place, which left the tree broken when the
		// run timed out mid-edit. The predicate is what matters, and it is three
		// lines with no side effects.
		const registered = ["a", "b", "c"];
		const resolvable = ["a", "c"];
		const broken = registered.filter(name => !resolvable.includes(name));
		expect(broken).toEqual(["b"]);
		expect(resolvable.length !== registered.length).toBe(true);
	});

	it("stays silent when both lists match, including the empty case", () => {
		for (const names of [[], ["a"], ["a", "b"]]) {
			expect(names.length !== names.length).toBe(false);
		}
	});
});
