/**
 * A project-scoped resource loads only when the project is trusted.
 *
 * ## The failure this catches
 *
 * `isProjectTrusted()` was the literal `() => true` at both call sites, and the
 * registry behind it did not exist — `grep -rn 'setProjectTrust\|trust.json'
 * packages --include='*.ts'` returned **0 hits**. So cloning a repository that
 * ships `.omp/plugins/installed_plugins.json` ran its project-scoped extension
 * modules with no prompt, and a reader of the API could not tell that from a
 * decision. That is not "a feature that does not work"; it is documentation
 * saying there is no gate while a reader assumes there is one, which the bead
 * names as a security consequence in both directions.
 *
 * ## Why these assertions and not `expect(loaded).toBe(true)`
 *
 * A gate is proved by what it **refuses**. Each case below states a decision and
 * asserts what the consumer does with it, through the same `assertTrusted` the
 * call sites reach. The control pair is load-bearing: the same resource under
 * `yes` must be admitted and under `no`/`undecided` must throw. If
 * `assertTrusted` ignored its argument and always returned, both halves would be
 * identical and the negative cases would be unfalsifiable.
 *
 * `assertTrusted` is driven directly here because *it is the contract* — the
 * consumer-side re-check. The wiring from the two call sites is covered by
 * `extension-context-project-trust.test.ts`, which drives a real `Settings`
 * through all three states; duplicating that here would test the same line twice
 * and prove nothing extra.
 */
import { describe, expect, it } from "bun:test";
import {
	PROJECT_TRUSTED_RESOURCES,
	ProjectTrustError,
	assertTrusted,
	isProjectTrustedForScope,
	isResourceTrusted,
	resolveProjectTrust,
	setProjectTrust,
} from "@oh-my-pi/pi-coding-agent/config/project-trust";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { TempDir } from "@oh-my-pi/pi-utils";

/** A `Settings` bound to a throwaway directory, so no developer's config is read. */
async function settingsFor(tag: string): Promise<Settings> {
	const dir = TempDir.createSync(`@pi-trust-gate-${tag}-`);
	return await Settings.loadIsolated({ cwd: dir.path(), agentDir: dir.join("agent") });
}

describe("project trust: a resource loads only when the project is trusted", () => {
	it("CONTROL: a fresh project is undecided, and undecided refuses", async () => {
		const settings = await settingsFor("control");

		expect(resolveProjectTrust(settings)).toBe("undecided");
		expect(() => assertTrusted("extensions", settings)).toThrow(ProjectTrustError);
	});

	it("admits a resource once the project is trusted", async () => {
		const settings = await settingsFor("yes");
		expect(setProjectTrust("yes", settings)).toBe(true);

		expect(resolveProjectTrust(settings)).toBe("yes");
		// Does not throw. Asserted by running it: `not.toThrow()` alone would be
		// accepted here only because the control above proves the same call throws
		// under a different decision, so a no-op implementation cannot pass both.
		assertTrusted("extensions", settings);
		expect(isResourceTrusted(resolveProjectTrust(settings))).toBe(true);
	});

	it("NEGATIVE: a project the user refused refuses every resource in the list", async () => {
		const settings = await settingsFor("no");
		setProjectTrust("no", settings);

		// The enumeration, not a hand-picked pair: a gate whose coverage nobody can
		// state is the failure this file exists to prevent, so the case that every
		// listed resource is refused is the one worth having.
		for (const resource of PROJECT_TRUSTED_RESOURCES) {
			expect(() => assertTrusted(resource, settings)).toThrow(ProjectTrustError);
		}
	});

	it("NEGATIVE: withdrawing trust takes effect on the next read", async () => {
		// The bead requires a re-check at the consumer rather than a value captured
		// at load, because a directory can change its mind between the two. Reading
		// the record on every call is what makes that true; a memoised answer would
		// still say `yes` here.
		const settings = await settingsFor("recheck");
		setProjectTrust("yes", settings);
		assertTrusted("extensions", settings);

		setProjectTrust("no", settings);

		expect(resolveProjectTrust(settings)).toBe("no");
		expect(() => assertTrusted("extensions", settings)).toThrow(ProjectTrustError);
	});

	it("the error names the resource and the state that refused it", async () => {
		// A refusal a user cannot act on is indistinguishable from a bug. The two
		// states are worded differently on purpose: `undecided` means "you have not
		// answered yet" and `no` means "you said no", and the fix differs.
		const undecided = await settingsFor("msg-undecided");
		const refused = await settingsFor("msg-no");
		setProjectTrust("no", refused);

		const undecidedError = (() => {
			try {
				assertTrusted("plugins", undecided);
			} catch (err) {
				return err as ProjectTrustError;
			}
		})();
		const refusedError = (() => {
			try {
				assertTrusted("plugins", refused);
			} catch (err) {
				return err as ProjectTrustError;
			}
		})();

		expect(undecidedError?.resource).toBe("plugins");
		expect(undecidedError?.trust).toBe("undecided");
		expect(undecidedError?.message).toContain("no trust decision");
		expect(refusedError?.trust).toBe("no");
		expect(refusedError?.message).toContain("not trusted");
	});

	it("NEGATIVE: a missing settings layer refuses rather than throwing", async () => {
		// `Settings` is optional at both call sites, and the module-level singleton
		// throws when nothing initialised it. Reaching the API through a context
		// without settings must answer `false`, not raise — a raise here is the
		// #7955 class of failure reached by a different route.
		expect(isProjectTrustedForScope(undefined)).toBe(false);
	});
});
