import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { APP_NAME } from "@oh-my-pi/pi-utils";
import { PREBUILT_BINARIES_DIR, harborRunnerArgs, prebuiltBinaryArgs } from "../src/launch-args";

const repoRoot = path.join(import.meta.dir, "..", "..", "..");
const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prebuilt-binaries-"));
	tempDirs.push(dir);
	return dir;
}

/** Every `outfile=` the release script would write, from its own dry run. */
async function releaseOutfiles(): Promise<string[]> {
	const proc = Bun.spawn(["bun", "scripts/ci-release-build-binaries.ts", "--dry-run"], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		proc.exited,
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	expect(exitCode, stderr).toBe(0);
	return [...stdout.matchAll(/outfile=(\S+)/g)].map(match => match[1]);
}

describe("prebuilt binary resolution", () => {
	// The consumer and the producer are separate files that both hardcode this
	// path. When they disagree the lookup finds nothing and the flag silently
	// does nothing, which is exactly the bug this asserts against.
	test("looks in the directory the release script actually writes to", async () => {
		const outfiles = await releaseOutfiles();
		const linux = outfiles.filter(file => /-linux-(arm64|x64)$/.test(file));

		expect(linux.length).toBeGreaterThan(0);
		for (const outfile of linux) {
			expect(path.dirname(outfile)).toBe(path.relative(repoRoot, PREBUILT_BINARIES_DIR));
		}
	});

	test("resolves one --binary per arch for the binaries that exist", async () => {
		const dir = await tempDir();
		await Bun.write(path.join(dir, `${APP_NAME}-linux-arm64`), "#!/bin/sh\n");
		await Bun.write(path.join(dir, `${APP_NAME}-linux-x64`), "#!/bin/sh\n");

		expect(prebuiltBinaryArgs(dir)).toEqual([
			"--binary",
			path.join(dir, `${APP_NAME}-linux-arm64`),
			"--binary",
			path.join(dir, `${APP_NAME}-linux-x64`),
		]);
	});

	// An arch that was not built must not become a half-configured launch: the
	// runner keys off the filename, so one path per arch is the whole contract.
	test("emits only the arch that was built", async () => {
		const dir = await tempDir();
		await Bun.write(path.join(dir, `${APP_NAME}-linux-arm64`), "#!/bin/sh\n");

		expect(prebuiltBinaryArgs(dir)).toEqual(["--binary", path.join(dir, `${APP_NAME}-linux-arm64`)]);
	});

	test("emits nothing when no release binary was built", async () => {
		expect(prebuiltBinaryArgs(await tempDir())).toEqual([]);
	});
});

describe("harborRunnerArgs prebuiltBinaries", () => {
	const request = { model: "test-model", prebuiltBinaries: true };

	function binaries(request_: { model: string; prebuiltBinaries?: boolean }): string[] {
		return harborRunnerArgs(request_, {
			jobsDir: "/tmp/jobs",
			jobName: "job",
			dataset: "/tmp/data",
		}).filter((arg, index, all) => arg === "--binary" || all[index - 1] === "--binary");
	}

	// The regression: this checkout has no release binaries, so the flag must be
	// a no-op rather than pointing --binary at a path that does not exist.
	test("passes no --binary when the release binaries are absent", () => {
		expect(binaries(request)).toEqual([]);
	});

	test("passes no --binary when prebuiltBinaries is not set", () => {
		expect(binaries({ model: "test-model" })).toEqual([]);
	});
});
