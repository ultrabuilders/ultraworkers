/**
 * Shared launch surface: the POST /api/runs request shape and its mapping to
 * runner CLI argv. The server uses it to spawn new harbor runs; the runner's
 * `--resume` uses it to rebuild the original invocation from a job dir's
 * manager.json launch record when no runner-config.json snapshot exists.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { APP_NAME } from "@oh-my-pi/pi-utils";
import type { BenchmarkKind, RunRole } from "./store";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");

/**
 * Where `scripts/ci-release-build-binaries.ts` writes compiled binaries.
 *
 * Not `dist/`: that is the host build (`bun run build` emits a single
 * un-suffixed `${APP_NAME}` there, and `nix/package.nix` installs from it). The
 * platform-suffixed release artifacts live here.
 */
export const PREBUILT_BINARIES_DIR = path.join(REPO_ROOT, "packages", "coding-agent", "binaries");

/**
 * `--binary` arguments for the compiled release binaries that exist in
 * `binariesDir`, at most one per architecture.
 *
 * The runner infers the architecture from each filename and keeps a single path
 * per arch, so a second build of the same arch — the musl variants — would
 * silently replace the first rather than add to it. One per arch is the whole
 * contract; `runner.ts` chooses the one matching the target platform.
 *
 * A directory with no binaries yields no arguments, which is the state every
 * checkout without a release build is in.
 */
export function prebuiltBinaryArgs(binariesDir: string = PREBUILT_BINARIES_DIR): string[] {
	const argv: string[] = [];
	for (const name of [`${APP_NAME}-linux-arm64`, `${APP_NAME}-linux-x64`]) {
		const binary = path.join(binariesDir, name);
		if (fs.existsSync(binary)) argv.push("--binary", binary);
	}
	return argv;
}

/** POST /api/runs body. Mirrors the runner CLI surface we actually use. */
export interface LaunchRequest {
	/** Benchmark adapter to execute. */
	benchmark?: BenchmarkKind;
	model: string;
	dataset?: string;
	/** Task count for a dataset sample, or omit when `include` is given. */
	tasks?: number;
	/** Explicit task names (passed as repeated --include). */
	include?: string[];
	concurrency?: number;
	/** SnapCompact conditions; ignored by other benchmarks. */
	conditions?: string[];
	timeoutMultiplier?: number;
	attempts?: number;
	agent?: string;
	jobName?: string;
	webSearch?: boolean;
	/** Harbor container backend. Defaults to apple-container whenever the Apple `container` CLI is installed; docker is an explicit opt-in. */
	environment?: "docker" | "apple-container";
	/** Prewalk to a fast/cheap model at the first edit/write once the todo list exists; `into` overrides the default "smol" target. */
	prewalk?: { into?: string };
	/** Role of this run inside its experiment (baseline vs treatment). */
	role?: RunRole;
	/** One-line description of what this arm tests. */
	note?: string;
	/** Experiment goal; upserted for the run's experiment (job-name prefix). */
	goal?: string;
	/** Use prebuilt release binaries instead of the default source mount. */
	prebuiltBinaries?: boolean;
	/** Extra raw runner args, appended verbatim. */
	extraArgs?: string[];
}

/** Runner CLI flags (sans the `bun src/runner.ts` prefix) for a harbor launch. */
export function harborRunnerArgs(
	request: LaunchRequest,
	opts: { jobsDir: string; jobName: string; dataset: string },
): string[] {
	const argv = ["--model", request.model, "-d", opts.dataset, "--job-name", opts.jobName, "--jobs-dir", opts.jobsDir];
	// Prefer Apple Container when its CLI is present: native arm64 task
	// containers with no Docker daemon. The runner itself defaults to
	// docker, so the preference must be stated here.
	const environment = request.environment ?? (Bun.which("container") ? "apple-container" : "docker");
	argv.push("--environment", environment);
	if (request.agent) argv.push("--agent", request.agent);
	// An explicit include list IS the sample — never let the runner's
	// default task cap truncate it.
	const tasks = request.tasks ?? (request.include && request.include.length > 0 ? request.include.length : undefined);
	if (tasks !== undefined) argv.push("--tasks", String(tasks));
	if (request.concurrency !== undefined) argv.push("--concurrency", String(request.concurrency));
	if (request.attempts !== undefined) argv.push("--attempts", String(request.attempts));
	if (request.timeoutMultiplier !== undefined) argv.push("--timeout-multiplier", String(request.timeoutMultiplier));
	if (request.webSearch) argv.push("--web-search");
	for (const task of request.include ?? []) argv.push("--include", task);
	if (request.prewalk) {
		argv.push("--agent-arg", "--prewalk");
		if (request.prewalk.into) {
			argv.push("--agent-arg", "--prewalk-into", "--agent-arg", request.prewalk.into);
			const provider = request.prewalk.into.split("/", 1)[0];
			if (provider && request.prewalk.into.includes("/")) argv.push("--providers", provider);
		}
	}
	if (request.prebuiltBinaries) {
		argv.push(...prebuiltBinaryArgs());
	}
	argv.push(...(request.extraArgs ?? []));
	return argv;
}
