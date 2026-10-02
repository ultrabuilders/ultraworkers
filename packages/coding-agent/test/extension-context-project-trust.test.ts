/**
 * `isProjectTrusted()` reports the project's decision, not a constant.
 *
 * ## What changed and why this file is not just a rename
 *
 * Both call sites used to be the literal `() => true`, and the two tests that
 * pinned that (`extension-context-project-trust.test.ts` and
 * `issue-7955-extension-project-trusted.test.ts`) asserted `true` because it was
 * what the code did. WI-20 replaced the literal with the recorded decision, so
 * those assertions went red — which the bead anticipated and required to be
 * *observed* before the change, not silenced after it.
 *
 * The old assertion was satisfiable by a shim that never consulted anything. The
 * one below is not: it drives `resolveProjectTrust` through a real `Settings`
 * built for a real directory, so a runner that went back to `() => true` fails it
 * and so does one that reads the wrong scope.
 *
 * ## The three states, and why `false` is the default
 *
 * `undecided` is the state every directory is in until the user answers, and it
 * resolves to `false`. That direction is deliberate and is the upgrade hazard the
 * hook-trust module refused to take (`extensibility/hooks/trust.ts`): defaulting
 * to trusted is the status quo being replaced, and defaulting to *run* would
 * switch off project extensions on every existing install with no surface to turn
 * them back on. The companion test asserts a directory the user *did* trust
 * reports `true`, which is what stops `false` from being a constant in the other
 * direction.
 */
import { describe, expect, it } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { setProjectTrust } from "@oh-my-pi/pi-coding-agent/config/project-trust";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { TempDir } from "@oh-my-pi/pi-utils";

/**
 * A runner bound to a directory with its own `Settings`.
 *
 * The settings instance is what the trust decision is read through, so a runner
 * constructed with a throwaway `{}` — the way the old test did — has no scope to
 * read and reports `false` for a reason that has nothing to do with the decision.
 */
async function createRunner(cwd: string): Promise<ExtensionRunner> {
	const projectDir = TempDir.createSync("@pi-project-trust-");
	const settings = await Settings.loadIsolated({
		cwd,
		agentDir: projectDir.join("agent"),
	});
	return new ExtensionRunner(
		[],
		{ flagValues: new Map(), pendingProviderRegistrations: [] } as never,
		cwd,
		{ getCwd: () => cwd } as never,
		{} as never,
		undefined,
		settings,
	);
}

describe("ExtensionContext project trust reports the recorded decision", () => {
	it("CONTROL: an undecided project is not reported as trusted", async () => {
		// Without this, `toBe(false)` below is satisfiable by a constant `false`.
		const projectDir = TempDir.createSync("@pi-project-trust-undecided-");
		const runner = await createRunner(projectDir.path());

		expect(runner.createContext().isProjectTrusted()).toBe(false);
	});

	it("reports a project the user trusted as trusted", async () => {
		const projectDir = TempDir.createSync("@pi-project-trust-yes-");
		const settings = await Settings.loadIsolated({
			cwd: projectDir.path(),
			agentDir: projectDir.join("agent"),
		});
		expect(setProjectTrust("yes", settings)).toBe(true);

		const runner = new ExtensionRunner(
			[],
			{ flagValues: new Map(), pendingProviderRegistrations: [] } as never,
			projectDir.path(),
			{ getCwd: () => projectDir.path() } as never,
			{} as never,
			undefined,
			settings,
		);

		expect(runner.createContext().isProjectTrusted()).toBe(true);
	});

	it("NEGATIVE: a project the user refused stays untrusted", async () => {
		const projectDir = TempDir.createSync("@pi-project-trust-no-");
		const settings = await Settings.loadIsolated({
			cwd: projectDir.path(),
			agentDir: projectDir.join("agent"),
		});
		setProjectTrust("no", settings);

		const runner = new ExtensionRunner(
			[],
			{ flagValues: new Map(), pendingProviderRegistrations: [] } as never,
			projectDir.path(),
			{ getCwd: () => projectDir.path() } as never,
			{} as never,
			undefined,
			settings,
		);

		expect(runner.createContext().isProjectTrusted()).toBe(false);
	});

	it("answers the same way on the command context as on the extension context", async () => {
		// The two call sites are separate code. One reporting the decision and the
		// other still returning a constant would be the silent half-implementation
		// the bead's criterion (1) names, and it would not fail any other case here.
		const projectDir = TempDir.createSync("@pi-project-trust-cmd-");
		const settings = await Settings.loadIsolated({
			cwd: projectDir.path(),
			agentDir: projectDir.join("agent"),
		});
		setProjectTrust("yes", settings);
		const runner = new ExtensionRunner(
			[],
			{ flagValues: new Map(), pendingProviderRegistrations: [] } as never,
			projectDir.path(),
			{ getCwd: () => projectDir.path() } as never,
			{} as never,
			undefined,
			settings,
		);

		expect(runner.createContext().isProjectTrusted()).toBe(runner.createCommandContext().isProjectTrusted());
	});
});
