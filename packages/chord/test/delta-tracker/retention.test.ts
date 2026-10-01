import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

describe("delta tracker retention across GC jobs", () => {
	it.each([
		"aborted-payload",
		"unadopted-prepared",
		"draft-proxies",
		"settled-lifecycle",
		"obsolete-revisions",
		"retained-settled-prepared",
		"retained-settled-change",
		"retained-settled-proxy",
		"retained-large-settled-proxy",
		"retained-large-placement-proxies",
		"stale-unprepared-change",
		"same-job-fast-cleanup",
		"same-job-folded-ops-cleanup",
		"lifecycle-churn",
	])(
		"validates %s retention semantics",
		scenario => {
			const child = Bun.spawnSync([
				process.execPath,
				"--expose-gc",
				fileURLToPath(new URL("./retention.worker.ts", import.meta.url)),
				scenario,
			]);
			const stderr = child.stderr.toString();
			expect(child.exitCode, stderr).toBe(0);
		},
		65_000,
	);
});
