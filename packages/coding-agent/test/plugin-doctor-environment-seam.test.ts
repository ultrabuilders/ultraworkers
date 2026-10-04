/**
 * `ultraworkers plugin doctor` must run BOTH collectors.
 *
 * `runDoctorChecks` answers "is this environment healthy" — PATH lookups,
 * credentials, and the extension seam registries. `manager.doctor()` answers "is
 * the plugin system healthy". They share no check name at all, so each is blind
 * to exactly what the other covers.
 *
 * `runDoctorChecks` was exported, tested, and unreachable: nothing in `src/`
 * called it. Its 14 test call sites invoked it directly, which is why it stayed
 * green after the product stopped calling it — a test on the callee passes when
 * the call site is deleted. So the assertion here is on what the shipped
 * `handleDoctor` PRINTS, never on `runDoctorChecks`' return value.
 *
 * The failure a user would otherwise hit: they registered a theme, the
 * registration is recorded, and `ultraworkers plugin doctor` reports a clean bill of
 * health — because the only check that resolves a registered theme is the one
 * no command reached.
 */
import { afterEach, describe, expect, spyOn, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { handleDoctor } from "@oh-my-pi/pi-coding-agent/cli/plugin-cli";
import { PluginManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/manager";
import { initTheme } from "@oh-my-pi/pi-tui/theme";

// The renderer reads `theme.status.*` for its icons; the CLI initialises this at
// startup and nothing else does.
initTheme();

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-doctor-seam-"));

afterEach(async () => {
	vi.restoreAllMocks();
	await fs.rm(scratch, { recursive: true, force: true });
});

interface PrintedCheck {
	readonly name: string;
	readonly status: string;
}

/**
 * Run the real shipped renderer and read back the report as data.
 *
 * `json: true` because it is the path that prints the checks as a list rather
 * than prose: the contract under test is WHICH checks ran, and formatted output
 * would make a name-matching assertion depend on styling.
 */
async function printedChecks(): Promise<PrintedCheck[]> {
	const out: string[] = [];
	spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		out.push(args.map(String).join(" "));
	});
	const exits: number[] = [];
	spyOn(process, "exit").mockImplementation(((code?: number) => {
		exits.push(code ?? 0);
	}) as never);

	await handleDoctor(new PluginManager(scratch), { json: true });

	expect(exits).toEqual([]);
	return JSON.parse(out.join("\n")) as PrintedCheck[];
}

describe("ultraworkers plugin doctor runs both collectors", () => {
	test("reports the environment checks, not only the plugin checks", async () => {
		const checks = await printedChecks();
		const names = checks.map(c => c.name);

		// Both sides, printed together. Without the environment half this list
		// stops at `patch_ledger` and every assertion below is on an absent name.
		console.error("[doctor:both] names=%o", names);

		expect(names).toContain("plugins_directory");
		expect(names).toContain("patch_ledger");
		expect(names).toContain("seam:themes");
		expect(names).toContain("seam:tools");
		// The external-tool probe is the half that has no plugin-system analogue.
		expect(names).toContain("git");
	});

	test("the seam checks and the plugin checks come from different collectors", async () => {
		const names = (await printedChecks()).map(c => c.name);

		// The reason one collector cannot stand in for the other: no name is
		// produced by both. If a future change folds them together this turns
		// red, because "we print seam:themes" would then stop being evidence
		// that the environment collector ran.
		const pluginSide = ["plugins_directory", "package_manifest", "node_modules", "patch_ledger"];
		const environmentSide = names.filter(n => !pluginSide.includes(n));

		console.error("[doctor:partition] environment=%o", environmentSide);

		expect(environmentSide).toContain("seam:themes");
	});
});
