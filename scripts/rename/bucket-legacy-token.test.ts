import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { bucketLegacyTokens } from "./bucket-legacy-token";

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
