import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { bucketLegacyTokens, classify } from "./bucket-legacy-token";

/** Build a throwaway tree the bucket scanner can walk. */
async function tree(files: Record<string, string>): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "bucket-legacy-"));
	for (const [rel, body] of Object.entries(files)) {
		const full = path.join(root, rel);
		await fs.mkdir(path.dirname(full), { recursive: true });
		await Bun.write(full, body);
	}
	return root;
}

describe("bucketing legacy tokens by decision owner", () => {
	it("assigns every in-scope occurrence to exactly one bucket", async () => {
		// The invariant that was broken first: rules were applied per-file and summed, so
		// any occurrence two rules could claim was counted twice. On the real corpus that
		// produced a bucket total of -60 for 869 occurrences — a table whose parts did not
		// reconstruct its whole, which reads like a finding and is really a broken tally.
		// `bucketLegacyTokens` throws on mismatch; this row asserts the tally itself holds
		// on input where several rules overlap the same line.
		const root = await tree({
			"a.md": [
				"Config lives in ~/.omp/config, run `omp setup`, see https://omp.sh/x",
				"",
				"Docs at /usr/share/omp/docs",
			].join("\n"),
			"b.md": ["plain prose about omp and omp's display name", "", "`omp stats` and `omp --doctor`"].join("\n"),
			"c.md": ["Scope @omp/pkg and protocol omp://thing"].join("\n"),
		});
		const report = await bucketLegacyTokens(root);
		const sum = report.buckets.reduce((total, bucket) => total + bucket.occurrences, 0);
		expect(sum).toBe(report.inScopeOccurrences);
		expect(report.inScopeOccurrences).toBeGreaterThan(0);
	});

	it("counts a command in command position wherever it sits on the line", async () => {
		// An anchored classifier reported 1 command on the real tree where the true count
		// is 13, because real command tokens sit mid-line inside backticks. Anchoring
		// looked like a finding and was a bug, so the property is pinned here: position on
		// the line must not change the verdict.
		const root = await tree({
			"mid.md": ["see `omp stats` for usage"].join("\n"),
			"start.md": ["omp stats"].join("\n"),
		});
		const report = await bucketLegacyTokens(root);
		const commands = report.buckets.find(bucket => bucket.name.includes("W13"));
		expect(commands?.occurrences).toBe(2);
		expect(commands?.name).toBe("command-pos  (W13)");
	});

	it("keeps each milestone's occurrences out of the other buckets", async () => {
		// The reason the split exists: an allow-list wide enough to hold occurrences owned
		// by other milestones stops gating. So W13's own share must be separable, and the
		// remainder is the part that has to move to whoever owns it.
		const root = await tree({
			"mix.md": [
				"Config directory is ~/.omp/config",
				"Run `omp setup` to begin",
				"The agent's display name is omp",
				"Docs at https://omp.sh/help",
			].join("\n"),
		});
		const report = await bucketLegacyTokens(root);
		const byName = new Map(report.buckets.map(bucket => [bucket.name, bucket.occurrences]));
		expect(byName.get("config-dir   (W6)")).toBe(1);
		expect(byName.get("command-pos  (W13)")).toBe(1);
		expect(byName.get("wire/header  (W9)")).toBe(1);
		expect(byName.get("UNBUCKETED (prose noun)")).toBe(1);
		expect(report.inScopeOccurrences).toBe(4);
	});

	it("excludes paths by the same predicate the scan uses", async () => {
		// `check-docs-rename.ts` excludes a path from Rule A; this scanner must agree with
		// it, or its "in scope" number silently describes a different corpus than the gate's.
		const root = await tree({
			"kept.md": "run `omp stats`",
			".lavish/log.md": "run `omp stats` and `omp setup`",
		});
		const report = await bucketLegacyTokens(root);
		expect(report.inScopeOccurrences).toBe(1);
		expect(report.excludedOccurrences).toBe(2);
	});
});

/**
 * One row per branch of the classifier, each pinned to the verdict a single string gets.
 *
 * Why this block exists and why it is per-string: until `classify` was exported, the only
 * observable was a sum, and a sum holds while every individual verdict is wrong. The fixture
 * above already carried both known defects — `omp --doctor` filed as prose, `omp and` filed
 * as a command — and stayed green, because `sum === inScope` cannot see either.
 *
 * Two rows below pin KNOWN DEFECTS rather than correct behaviour, and say so. That is the
 * point: the defects are named here instead of living silently in a bucket table. When the
 * lookahead gains a spaced-flag branch, `omp --doctor` and `omp -p` flip to `command-pos`
 * and these two rows are the ones that must change with it.
 */
describe("the verdict a single string receives", () => {
	// Each of the five non-W13 buckets: a regression here silently reassigns another
	// milestone's occurrences, which is the split the whole table exists to preserve.
	it("routes each non-W13 shape to the milestone that owns it", () => {
		expect(classify("@omp/pkg")).toBe("npm-scope    (W7)");
		expect(classify("~/.omp/config")).toBe("config-dir   (W6)");
		expect(classify("omp://thing")).toBe("protocol     (W9/W12)");
		expect(classify("https://omp.sh/help")).toBe("wire/header  (W9)");
		expect(classify("/usr/share/omp/docs")).toBe("on-disk name (W9)");
	});

	it("accepts a command in command position, mid-line and with a glued flag", () => {
		// The property that an anchored classifier broke: real command tokens sit mid-line
		// inside backticks, so position on the line must not change the verdict.
		expect(classify("omp stats")).toBe("command-pos  (W13)");
		expect(classify("see `omp stats` for usage")).toBe("command-pos  (W13)");
		expect(classify("omp--doctor")).toBe("command-pos  (W13)");
	});

	// KNOWN DEFECT — the lookahead is `(?=\s+(?!')[a-z]|--)`, so the alternation sits
	// INSIDE it: it asserts either `<space><lowercase>` or `--` glued to the token. A
	// spaced flag satisfies neither. On the corpus that produced this classifier every one
	// of the 15 `omp --flag` occurrences was filed as prose, including `omp --mode rpc`.
	// Both shapes are pinned because a fix must cover the long and short flag alike.
	it("KNOWN DEFECT: files a spaced-flag command as prose", () => {
		expect(classify("omp --doctor")).toBe("UNBUCKETED (prose noun)");
		expect(classify("omp -p")).toBe("UNBUCKETED (prose noun)");
	});

	// KNOWN DEFECT — no regex can separate `omp stats` from `omp is`: both are the token
	// plus a lowercase word. Recognising commands here would need a subcommand list, which
	// would make this measuring tool depend on the thing it measures. Left unclassified on
	// purpose rather than silently counted as commands.
	it("KNOWN DEFECT: files ordinary prose as a command", () => {
		expect(classify("omp is a fork of pi")).toBe("command-pos  (W13)");
		expect(classify("omp reads the working tree")).toBe("command-pos  (W13)");
	});

	// The `(?!')` guard: a possessive must not open the command branch, so a sentence that
	// merely mentions the token as a noun stays prose.
	it("does not read a possessive or a bare mention as a command", () => {
		expect(classify("the agent's display name is omp")).toBe("UNBUCKETED (prose noun)");
	});
});

describe("scan scope", () => {
	it("skips a nested repository but still scans ordinary tracked docs", async () => {
		// Same rule as the sibling gates: a nested `.git` means another repository and
		// a different table, not "a dot-directory". The control is `docs/a.md`, not a
		// dot-directory — this gate reuses check-docs-rename's isExcluded, which already
		// lists `.lavish-wip/`, `.lavish/` and `.omp/` as excluded prefixes.
		const root = await tree({
			"docs/a.md": "uses omp here\n",
			".claude/worktrees/someone/.git": "gitdir: /elsewhere\n",
			".claude/worktrees/someone/docs/copied.md": "uses omp here\n",
		});
		const report = await bucketLegacyTokens(root);
		expect(report.inScopeFiles).toBe(1);
		expect(report.excludedFiles).toBe(0);
		expect(report.inScopeOccurrences).toBe(1);
		await fs.rm(root, { recursive: true, force: true });
	});
});
