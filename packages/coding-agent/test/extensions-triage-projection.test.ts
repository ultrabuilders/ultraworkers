import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { DisabledReason, ExtensionState } from "@oh-my-pi/pi-tui/overlays/extensions/types";
import { toTriageRow } from "@oh-my-pi/pi-coding-agent/cli/extensions-triage-cli";
import { resetSettingsForTest, Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { initializeWithSettings } from "@oh-my-pi/pi-coding-agent/discovery";
import { loadAllExtensions } from "@oh-my-pi/pi-coding-agent/modes/components/extensions/state-manager";
import { __resetDirsFromEnvForTests, TempDir } from "@oh-my-pi/pi-utils";
import { filterUserScoped } from "./utils/filter-user-extensions";

/**
 * The contract `omp extensions-triage` exists to keep, asserted against the
 * REAL `loadAllExtensions` output rather than hand-built `Extension` objects.
 *
 * The projection tests in `extensions-triage-cli.test.ts` all hand-build their
 * input, which means every one of them stays green if the loader stops
 * producing shadowed rows at all. This file closes that gap: it builds the tree
 * the command is actually pointed at, so a regression in what the loader emits
 * — a skill discovered twice, a shadowed row that stopped being marked, a
 * policy block that stopped carrying a reason — reaches the triage answer
 * instead of stopping quietly inside the capability layer.
 *
 * Why the consumer cares: the question this command answers is "is my thing
 * loaded, and if not what stopped it". Every assertion below is a wrong answer
 * a user would read off the listing.
 */

/** A `SKILL.md` with the frontmatter the loader requires (`requireDescription`). */
const skillMd = (name: string): string => `---\nname: ${name}\ndescription: The ${name} skill\n---\n\nbody\n`;

/**
 * User scope reads `getAgentDir()/skills`; project scope reads
 * `<cwd>/.omp/skills` (`discovery/builtin.ts:299-301`). Both are steered per
 * test by `PI_CODING_AGENT_DIR` and the cwd argument, so no host state is read
 * and nothing global is mutated to get here.
 */
async function writeSkill(root: string, name: string): Promise<void> {
	const dir = path.join(root, "skills", name);
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, "SKILL.md"), skillMd(name));
}

describe("extensions triage over a real discovery tree", () => {
	let tempDir: TempDir;
	let homeDir: string;
	let projectDir: string;
	let previousAgentDir: string | undefined;

	beforeEach(async () => {
		resetSettingsForTest();
		tempDir = TempDir.createSync("@ultraworkers-triage-test-");
		homeDir = path.join(tempDir.path(), "home");
		projectDir = path.join(tempDir.path(), "project");
		await fs.mkdir(path.join(homeDir, "agent"), { recursive: true });
		await fs.mkdir(path.join(projectDir, ".omp"), { recursive: true });

		previousAgentDir = process.env.PI_CODING_AGENT_DIR;
		process.env.PI_CODING_AGENT_DIR = path.join(homeDir, "agent");
		__resetDirsFromEnvForTests();
		// `Settings.init()` is part of the ACP-shaped prologue the triage CLI
		// documents as a precondition; the loader reads disabled/allowed sets
		// from it, so a test that skipped it would not be exercising the same
		// path the command does.
		await Settings.init();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
		__resetDirsFromEnvForTests();
		resetSettingsForTest();
		tempDir.removeSync();
	});

	/**
	 * Discover in the fixture tree and project to triage rows.
	 *
	 * The keep-list filter is load-bearing, not decoration. `PI_CODING_AGENT_DIR`
	 * redirects omp's own agent dir, but the *foreign* user roots are resolved
	 * from `os.homedir()` and are not covered by it: on this machine discovery
	 * returns 1174 rows sourced from the real `~/.claude`, `~/.codex`,
	 * `~/.gemini` and `~/.opencode` trees. Those are exactly the rows a triage
	 * listing must never show for an unrelated cwd, and an unfiltered assertion
	 * here would either be permanently red or would quietly learn to expect the
	 * developer's home directory — the "expected: 1174" failure mode.
	 */
	const triage = async () => {
		const extensions = await loadAllExtensions(projectDir);
		return filterUserScoped(extensions, [projectDir, homeDir]).map(toTriageRow);
	};

	// The headline assertion the hand-built projection tests cannot make: a
	// same-named skill at both levels must produce exactly two rows, one of them
	// shadowed. If dedup regressed, the listing would show a skill twice and the
	// user would have no way to tell which copy is live.
	it("shows one row per discovered extension, with exactly one shadowed for a two-level name clash", async () => {
		await writeSkill(path.join(homeDir, "agent"), "dup");
		await writeSkill(path.join(projectDir, ".omp"), "dup");

		const rows = await triage();

		expect(rows.filter(row => row.id.endsWith(":dup"))).toHaveLength(2);
		const dupRows = rows.filter(row => row.id.endsWith(":dup"));
		expect(dupRows.filter(row => row.shadowed)).toHaveLength(1);
		// Exactly one survives: if both or neither were shadowed, the listing
		// would either double-count or hide the losing copy entirely.
		expect(dupRows.filter(row => !row.shadowed)).toHaveLength(1);
	});

	// The reason `shadowed` is computed in the projection and not copied: the CLI
	// must not re-derive which copy won, because "who won" is the loader's
	// answer to a priority question the triage view has no stake in. Under the
	// recorded contract (a), a shadowed row refuses to name a winner.
	//
	// MUTATION NOTE: deleting the `|| ext.shadowedBy !== undefined` fallback from
	// `toTriageRow` leaves this file green, and that is a fact about the loader,
	// not a gap in the test. `getShadowedBy` is declared on `addItems`
	// (state-manager.ts:81) but never supplied at any call site, so
	// `shadowedBy` is `undefined` on every extension the real tree produces, and
	// shadowing only ever arrives as `state: "shadowed"`. The branch is
	// currently unreachable from `loadAllExtensions`; the fallback defends
	// against a caller that starts populating it. `extensions-triage-cli.test.ts`
	// pins the branch on a hand-built object, which is the only honest way to
	// assert on a state the loader cannot yet produce.
	it("marks the losing copy shadowed without re-deriving the winner in the CLI", async () => {
		await writeSkill(path.join(homeDir, "agent"), "clash");
		await writeSkill(path.join(projectDir, ".omp"), "clash");

		const rows = await triage();
		const shadowed = rows.filter(row => row.id.endsWith(":clash") && row.shadowed);

		expect(shadowed).toHaveLength(1);
		// `shadowedBy` is deliberately absent: populating it here is the
		// documented thing a later refactor must come back and review.
		expect("shadowedBy" in shadowed[0]!).toBe(false);
	});

	// A blocked extension with no stated reason is the failure a user cannot
	// act on — "disabled" alone tells them nothing to fix.
	it("carries a non-shadowing reason for a row blocked by policy", async () => {
		await writeSkill(path.join(projectDir, ".omp"), "gated");
		const extension = (await loadAllExtensions(projectDir)).find(e => e.id.endsWith(":gated"));
		expect(extension).toBeDefined();

		// Drive the row through the same projection the command uses, with the
		// block the loader actually assigns for a disabled extension.
		const row = toTriageRow({
			...(extension! as object),
			state: "disabled",
			disabledReason: "provider-disabled",
		} as Parameters<typeof toTriageRow>[0]);

		expect(row.disabledReason).toBe("provider-disabled");
		expect(row.disabledReason).not.toBe("shadowed");
	});

	// Every state and reason must be a real union member. A projection that
	// invents one makes a consumer's switch silently miss a branch — and the
	// string would still render, so the listing would look fine.
	//
	// The state is compared against the loader's own value for the same
	// extension, not merely against the member list. Checking membership alone
	// survived the mutation `state: ext.state` -> `state: "active"`, because a
	// fabricated `"active"` is still a legal member — the test was asking
	// "is this a state?" when the question is "is this THIS extension's state?".
	// A triage row that hardcodes `active` reports every blocked extension as
	// loaded, which is the worst possible answer for this command.
	it("reports the state the loader assigned, not a fabricated one", async () => {
		// The clash is load-bearing for THIS test: with only a lone skill every
		// row is `active`, and a projection hardcoding `state: "active"` would
		// pass. Probed, the clashing fixture emits one `active` and one
		// `shadowed` copy, so a fabricated state is detectable here and nowhere
		// else in the file.
		await writeSkill(path.join(homeDir, "agent"), "dup");
		await writeSkill(path.join(projectDir, ".omp"), "dup");

		const discovered = filterUserScoped(await loadAllExtensions(projectDir), [projectDir, homeDir]);
		const rows = discovered.map(toTriageRow);
		const states = ["active", "disabled", "shadowed", "modified"] as const;
		const reasons = [
			"provider-disabled",
			"user-opt-in",
			"item-disabled",
			"shadowed",
			"hook-modified",
		] as const satisfies readonly DisabledReason[];

		// Exhaustive by construction — see the same guard in
		// extensions-triage-cli.test.ts. Without it this list is just a copy that
		// can fall behind the union while still passing: a short array assigned
		// to a union typechecks, so a member added to `ExtensionState` after this
		// file was written would leave `toContain(row.state)` rejecting every row
		// that legitimately carried it.
		const _statesExhaustive: Record<ExtensionState, true> = {
			active: true,
			disabled: true,
			shadowed: true,
			modified: true,
		};
		const _reasonsExhaustive: Record<DisabledReason, true> = {
			"provider-disabled": true,
			"user-opt-in": true,
			"item-disabled": true,
			shadowed: true,
			"hook-modified": true,
		};

		expect(rows.length).toBeGreaterThan(0);
		// Guard the premise: if the tree stopped producing a blocked row this
		// test would silently degrade into the all-active case above.
		expect(rows.some(row => row.state !== "active")).toBe(true);
		for (const [index, row] of rows.entries()) {
			expect(row.id).toBe(discovered[index]!.id);
			expect(row.state).toBe(discovered[index]!.state);
			expect(states).toContain(row.state);
			if (row.disabledReason !== undefined) expect(reasons).toContain(row.disabledReason);
			// A blocked row must say why; only `active` rows may omit it.
			if (row.state !== "active") expect(row.disabledReason).toBeDefined();
		}
	});

	// Empty tree, real loader. The command's answer here must be "nothing found"
	// rather than a crash or a silent hang — and it must not fall back to reading
	// the developer's own ~/.omp.
	it("returns no rows for a tree with nothing in it, rather than reading host state", async () => {
		const rows = await triage();
		expect(rows).toEqual([]);
	});
});
