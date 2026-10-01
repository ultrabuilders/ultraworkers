#!/usr/bin/env bun

import { readdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { $ } from "bun";

type Mode =
	| "all"
	| "local"
	| "local-ts"
	| "workspace"
	| "native"
	| "coding-agent-singleton"
	| "coding-agent-ui"
	| "coding-agent-runtime"
	| "coding-agent-native"
	| "coding-agent-heavy";

type CodingAgentBucket = "singleton" | "ui" | "runtime" | "native";

interface TestCommand {
	label: string;
	cwd: string;
	/** argv without `--parallel`; the runner appends it from `parallel` and the pool's CPU budget. */
	command: string[];
	/** `bun test --parallel` width this chunk wants when it has the machine to itself. */
	parallel?: number;
}

type CodingAgentTestPartition = Record<CodingAgentBucket, string[]>;

const repoRoot = path.join(import.meta.dir, "..");
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const requestedMode = args.find(arg => !arg.startsWith("--")) ?? "all";
// `--only-failures` is Bun's output filter — it hides passing tests within each
// chunk, keeping the log terse, and is the default here (CI and the root
// `test:ts` aggregate append it). It does NOT skip tests or share any
// cross-process cache, so chunks are safe to run concurrently. The package-level
// `test` script passes `--full` for verbose output (every test line); an explicit
// `--only-failures` still wins.
const onlyFailures = args.includes("--only-failures") || !args.includes("--full");
const onlyFailuresArgs = onlyFailures ? ["--only-failures"] : [];
// Quiet mode (the default) collapses each parallel chunk to a one-line pass/fail
// progress entry and replays full stdout/stderr only for chunks that failed, so
// the failure is never buried under thousands of passing-chunk lines. `--full`
// opts back into inline replay of every chunk. Tied to `onlyFailures` so the
// quiet path is whatever the verbose filter is not.
const quiet = onlyFailures;

const validModes: Record<Mode, true> = {
	all: true,
	local: true,
	"local-ts": true,
	workspace: true,
	native: true,
	"coding-agent-singleton": true,
	"coding-agent-ui": true,
	"coding-agent-runtime": true,
	"coding-agent-native": true,
	"coding-agent-heavy": true,
};

// `chunkSize` splits a bucket's file list into that-many-file groups, each run as a
// separate `bun test` child process. A fresh process per chunk resets Bun's
// heap and reaps any dangling spawned children between groups, keeping peak RSS
// under the CI runner's OOM ceiling (a single 170–370-file invocation gets
// SIGKILLed at 137). The singleton/global-state bucket is left whole: its suites
// co-locate in one process to exercise process-wide state, so they must not split.
//
// The UI/TUI bucket uses a smaller chunk (5) than the others: its suites build up
// native ghostty-vt cells, and bun 1.3.14's GC aborts (SIGTRAP/SIGABRT, exit
// 133/134 inside DOMGCOutputConstraint marking) once ~10 such files share a heap,
// even with the GC-marker knobs below. Bisection showed no single file is at
// fault — the crash is cumulative heap volume. Under a 256MB-forced heap, a
// 10-file chunk aborts ~50% of runs while either 5-file half is 0/20; halving the
// chunk keeps each process under the threshold.
const codingAgentBucketPlans: Record<CodingAgentBucket, { label: string; parallel: number; chunkSize?: number }> = {
	singleton: { label: "singleton/global-state bucket", parallel: 1 },
	ui: { label: "UI/TUI bucket", parallel: 1, chunkSize: 5 },
	runtime: { label: "runtime/session bucket", parallel: 1, chunkSize: 10 },
	native: { label: "native/tooling/browser/unit bucket", parallel: 1, chunkSize: 10 },
};

// Smaller workspace packages stay separate from native/TUI/integration suites so
// their short TS suites can run together. CI still downloads the Linux x64 native
// addon before this bucket: shared utility barrels may load native-backed modules.
const fastWorkspacePackages = [
	"packages/omptype",
	"packages/utils",
	"packages/catalog",
	"packages/ai",
	"packages/snapcompact",
	"packages/agent",
	"packages/mnemopi",
];

// These suites cover the native package, TUI/browser-ish behavior, local servers,
// or coding-agent-adjacent benchmark paths. Keep them low-concurrency and in jobs
// that have downloaded the Linux x64 native addon artifacts.
const nativeAndIntegrationPackages = [
	"packages/natives",
	"packages/tui",
	"packages/collab-web",
	"packages/typescript-edit-benchmark",
];

// Packages the CI buckets deliberately skip but a local full run should still
// cover. robomp-web lives under python/robomp and is outside every CI TS bucket.
const localOnlyWorkspacePackages = ["python/robomp/web"];

const codingAgentNativePathPatterns = [
	/(^|\/)[^/]*(bash|native|browser|cmux|mnemopi|hindsight|memory)[^/]*\.test\.ts$/i,
	/^test\/[^/]*(ask|gh|irc|task|eval|search|read|write|edit|ast|resolve|sqlite|web-search|fetch|image|ssh|tool)[^/]*\.test\.ts$/,
	/^test\/core\/python-[^/]*\.test\.ts$/,
	/^test\/core\/[^/]*executor[^/]*\.test\.ts$/,
	/^test\/tools\/[^/]*(ask|gh|irc|task|eval|search|read|edit|ast|resolve|sqlite|web-search|fetch|image|ssh)[^/]*\.test\.ts$/,
	/^test\/tools\/web-scrapers\//,
	/^test\/web\//,
	/^test\/ssh\//,
	/^test\/tools\.test\.ts$/,
];

const codingAgentSingletonPathPatterns = [
	/^test\/(settings|config|fast-mode-scope|autocomplete-max-visible)[^/]*\.test\.ts$/,
	/^test\/[^/]*(singleton|global-state|fake-timer)[^/]*\.test\.ts$/,
];

const codingAgentUiPathPatterns = [
	/^test\/modes\//,
	/^test\/(interactive-mode|main-interactive|input-controller|streaming|status-line|keybindings|editor|hook|theme|setup-wizard|job-renderer|tool-args-reveal|tool-execution)[^/]*\.test\.ts$/,
];

const codingAgentRuntimePathPatterns = [
	/^test\/agent-session[^/]*\.test\.ts$/,
	/^test\/(acp|mcp|rpc|sdk)[^/]*\.test\.ts$/,
	/^test\/(session|session-manager|task|collab|internal-urls)\//,
	/^test\/session[^/]*\.test\.ts$/,
	/^test\/session-manager[^/]*\.test\.ts$/,
	/^test\/(extensions?|plugin|autolearn|skills|marketplace|oauth)[^/]*\.test\.ts$/,
	/^test\/[^/]*oauth[^/]*\.test\.ts$/,
	/^test\/(extensibility|discovery|tool-discovery|goals|marketplace)\//,
	/^test\/(model|model-|model-registry|model-resolver|compaction)[^/]*\.test\.ts$/,
];

const codingAgentNativeContentMarkers = [
	"@oh-my-pi/pi-natives",
	"pi-natives",
	"native",
	"readImageMetadata",
	"Bun.spawn",
	"Bun.spawnSync",
	"child_process",
	"Bun.serve",
	"new Worker",
	"Worker(",
	"puppeteer",
	"bun:sqlite",
	"Redis",
	"redis",
	"WebSocket",
];

const codingAgentSingletonContentMarkers = [
	"Settings.init(",
	"Settings.instance",
	"resetSettingsForTest",
	"setAgentDir(",
	"vi.useFakeTimers(",
	"vi.useRealTimers(",
	"vi.stubEnv(",
	"vi.unstubAllEnvs(",
];

const codingAgentSingletonContentPatterns = [
	/(^|[^\w$.])(process\.env|Bun\.env)\.[A-Za-z0-9_]+\s*=/,
	/(^|[^\w$.])(process\.env|Bun\.env)\[[^\]]+\]\s*=/,
	/delete\s+(process\.env|Bun\.env)(\.[A-Za-z0-9_]+|\[[^\]]+\])/,
	/Object\.assign\((process\.env|Bun\.env),/,
];

const codingAgentUiContentMarkers = [
	"@oh-my-pi/pi-tui",
	"InteractiveMode",
	"InputController",
	"StatusLine",
	"ToolExecutionComponent",
	"render(",
	"renderToString",
];

const codingAgentRuntimeContentMarkers = ["AgentSession", "SessionManager", "AuthStorage", "Bun.sleep", "setTimeout("];

let codingAgentTestPartitionPromise: Promise<CodingAgentTestPartition> | null = null;

function shellQuote(value: string): string {
	if (/^[A-Za-z0-9_./:=@+-]+$/.test(value)) {
		return value;
	}
	return `'${value.replaceAll("'", `'\\''`)}'`;
}

function workspaceTestCommand(pkg: string, parallel: number, options: { extraArgs?: string[] } = {}): TestCommand {
	const { extraArgs = [] } = options;
	return {
		label: pkg,
		cwd: pkg,
		command: ["bun", "test", ...extraArgs],
		parallel,
	};
}

// The Rust suite as one pooled command, so root `bun run test` reports TS and
// Rust under the same progress stream / failure report. Delegates to
// run-rs-task.ts, which self-skips when no Rust-affecting files changed locally
// (printing a one-line notice) and resolves the cargo/nextest invocation.
// The packaging gates under `scripts/` are Node's own `node:test` files, not
// `bun test` ones — `check-runtime-deps` drives typescript/unstable/sync, which
// needs a real Node child-process stream. They therefore run as one `node --test`
// process rather than through the `bun test` workspace fan-out, and declare no
// `parallel` width so `applyChunkBudget` leaves their argv alone.
//
// Collected from disk rather than listed, so a new gate's test is picked up by
// adding the test file and nothing else: a hand-maintained list is exactly the
// kind that silently stops protecting anything.
const nodeInvariantTestCommand = (): TestCommand => ({
	label: "packaging gates (node:test)",
	cwd: ".",
	command: ["node", "--test", ...discoverNodeInvariantTests()],
});

function discoverNodeInvariantTests(): string[] {
	const entries = readdirSync(path.join(repoRoot, "scripts"), { withFileTypes: true });
	return entries
		.filter(entry => entry.isFile() && entry.name.endsWith(".test.mjs"))
		.map(entry => path.join("scripts", entry.name))
		.sort();
}

function rustTestCommand(): TestCommand {
	return {
		label: "rust (cargo nextest; skipped if no Rust changes)",
		cwd: ".",
		command: ["bun", "scripts/run-rs-task.ts", "test:rs"],
	};
}

async function collectTestsUnder(root: string, baseDir: string): Promise<string[]> {
	const entries = await fs.readdir(root, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		const filePath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectTestsUnder(filePath, baseDir)));
			continue;
		}
		if (!entry.isFile() || !entry.name.endsWith(".test.ts")) {
			continue;
		}
		files.push(path.relative(baseDir, filePath).split(path.sep).join("/"));
	}
	return files;
}

function hasAnyMarker(content: string, markers: string[]): boolean {
	return markers.some(marker => content.includes(marker));
}

function matchesAnyPath(testFile: string, patterns: RegExp[]): boolean {
	return patterns.some(pattern => pattern.test(testFile));
}

function matchesAnyContentPattern(content: string, patterns: RegExp[]): boolean {
	return patterns.some(pattern => pattern.test(content));
}
// Native/tooling tests are classified first because they need the lowest
// concurrency; all coding-agent buckets run with the native addon available in CI.
function classifyCodingAgentTest(testFile: string, content: string): CodingAgentBucket {
	if (
		matchesAnyPath(testFile, codingAgentNativePathPatterns) ||
		hasAnyMarker(content, codingAgentNativeContentMarkers)
	) {
		return "native";
	}
	if (matchesAnyPath(testFile, codingAgentUiPathPatterns) || hasAnyMarker(content, codingAgentUiContentMarkers)) {
		return "ui";
	}
	if (
		matchesAnyPath(testFile, codingAgentSingletonPathPatterns) ||
		hasAnyMarker(content, codingAgentSingletonContentMarkers) ||
		matchesAnyContentPattern(content, codingAgentSingletonContentPatterns)
	) {
		return "singleton";
	}
	if (
		matchesAnyPath(testFile, codingAgentRuntimePathPatterns) ||
		hasAnyMarker(content, codingAgentRuntimeContentMarkers)
	) {
		return "runtime";
	}
	return "native";
}

async function getCodingAgentTestPartition(): Promise<CodingAgentTestPartition> {
	codingAgentTestPartitionPromise ??= (async () => {
		const codingAgentDir = path.join(repoRoot, "packages/coding-agent");
		const testFiles = (await collectTestsUnder(path.join(codingAgentDir, "test"), codingAgentDir)).sort();
		const partition: CodingAgentTestPartition = {
			singleton: [],
			ui: [],
			runtime: [],
			native: [],
		};

		for (const testFile of testFiles) {
			const content = await Bun.file(path.join(codingAgentDir, testFile)).text();
			partition[classifyCodingAgentTest(testFile, content)].push(testFile);
		}

		return partition;
	})();
	return codingAgentTestPartitionPromise;
}

async function codingAgentTestCommands(bucket: CodingAgentBucket): Promise<TestCommand[]> {
	const partition = await getCodingAgentTestPartition();
	const testFiles = partition[bucket];
	if (testFiles.length === 0) {
		throw new Error(`No coding-agent ${bucket} tests matched`);
	}
	const plan = codingAgentBucketPlans[bucket];
	const chunkSize = plan.chunkSize ?? testFiles.length;
	const chunkCount = Math.ceil(testFiles.length / chunkSize);
	const commands: TestCommand[] = [];
	for (let i = 0; i < testFiles.length; i += chunkSize) {
		const chunk = testFiles.slice(i, i + chunkSize);
		const chunkLabel = chunkCount > 1 ? ` chunk ${commands.length + 1}/${chunkCount}` : "";
		commands.push({
			label: `packages/coding-agent (${plan.label}; ${testFiles.length} files; parallel=${plan.parallel}${chunkLabel}; ${chunk.length} files)`,
			cwd: "packages/coding-agent",
			command: ["bun", "test", ...onlyFailuresArgs, ...chunk],
			parallel: plan.parallel,
		});
	}
	return commands;
}

async function commandsForMode(mode: Mode): Promise<TestCommand[]> {
	switch (mode) {
		case "workspace":
			return fastWorkspacePackages.map(pkg => workspaceTestCommand(pkg, 8));
		case "native":
			return nativeAndIntegrationPackages.map(pkg => workspaceTestCommand(pkg, 4));
		case "coding-agent-singleton":
			return await codingAgentTestCommands("singleton");
		case "coding-agent-ui":
			return await codingAgentTestCommands("ui");
		case "coding-agent-runtime":
			return await codingAgentTestCommands("runtime");
		case "coding-agent-native":
			return await codingAgentTestCommands("native");
		case "coding-agent-heavy":
			return [
				...(await codingAgentTestCommands("singleton")),
				...(await codingAgentTestCommands("ui")),
				...(await codingAgentTestCommands("runtime")),
				...(await codingAgentTestCommands("native")),
			];
		case "all":
			return [
				...(await commandsForMode("workspace")),
				...(await commandsForMode("native")),
				...(await commandsForMode("coding-agent-heavy")),
				nodeInvariantTestCommand(),
			];
		// `local-ts` is the full local TypeScript run that root `bun run test:ts`
		// drives: every package the old `--workspaces` fan-out covered (the CI
		// `all` set plus robomp-web, which CI omits), routed through
		// this one quiet runner so the whole suite shares one progress stream and
		// one failure report. Repo script tests remain available via `test:scripts`.
		case "local-ts":
			return [
				...fastWorkspacePackages.map(pkg => workspaceTestCommand(pkg, 8, { extraArgs: onlyFailuresArgs })),
				...nativeAndIntegrationPackages.map(pkg => workspaceTestCommand(pkg, 4, { extraArgs: onlyFailuresArgs })),
				...localOnlyWorkspacePackages.map(pkg => workspaceTestCommand(pkg, 4, { extraArgs: onlyFailuresArgs })),
				...(await commandsForMode("coding-agent-heavy")),
				nodeInvariantTestCommand(),
			];
		// `local` is what root `bun run test` drives: the full TS suite plus the
		// Rust task, so a single invocation reports TS and Rust together. The Rust
		// command self-skips when no Rust-affecting files changed (see run-rs-task).
		case "local":
			return [...(await commandsForMode("local-ts")), rustTestCommand()];
	}
}

// The omp-kata runner pods may inject cloud credentials (`AWS_*`) pod-wide via
// `envFrom`, GitHub Actions injects `GITHUB_TOKEN`,
// and a host may carry provider API keys. Any of these make env-sensitive code
// non-deterministic in tests — e.g. leaked AWS creds make `amazon-bedrock` look
// authenticated and win the provider startup fallback over `anthropic`. Run the
// suites in a hermetic environment with all credential / cloud-config variables
// stripped so resolution depends only on the test's own fixtures.
const SCRUBBED_ENV_PREFIXES = ["AWS_", "GOOGLE_CLOUD_"];
const SCRUBBED_ENV_NAMES = new Set([
	"GITHUB_TOKEN",
	"GH_TOKEN",
	"COPILOT_GITHUB_TOKEN",
	"GOOGLE_APPLICATION_CREDENTIALS",
	"ANTHROPIC_OAUTH_TOKEN",
	"XAI_OAUTH_TOKEN",
]);

function isScrubbedEnvVar(key: string): boolean {
	if (SCRUBBED_ENV_NAMES.has(key)) {
		return true;
	}
	if (SCRUBBED_ENV_PREFIXES.some(prefix => key.startsWith(prefix))) {
		return true;
	}
	// Any provider credential, e.g. ANTHROPIC_API_KEY / XAI_OAUTH_TOKEN / bedrock bearer.
	return /_(API_KEY|OAUTH_TOKEN)$/.test(key) || key.includes("BEARER_TOKEN");
}

async function runTestCommand(testCommand: TestCommand): Promise<void> {
	const cwd = path.join(repoRoot, testCommand.cwd);
	const renderedCommand = testCommand.command.map(shellQuote).join(" ");
	console.log(`\n==> ${testCommand.label}`);
	console.log(`$ ${renderedCommand}`);

	if (isDryRun) {
		return;
	}

	const env = buildChildEnv();
	for (let attempt = 1; ; attempt++) {
		const proc = Bun.spawn(testCommand.command, {
			cwd,
			env,
			stdout: "inherit",
			stderr: "inherit",
		});
		// Watchdog, mirroring the parallel path: record that *we* killed the child,
		// otherwise the resulting 137 is indistinguishable from an OOM kill.
		let timedOut = false;
		const killTimer = setTimeout(() => {
			timedOut = true;
			proc.kill("SIGKILL");
		}, chunkTimeoutMs());
		const exitCode = await proc.exited;
		clearTimeout(killTimer);
		if (exitCode === 0) {
			return;
		}
		if (!timedOut && BUN_CRASH_EXITS[exitCode] && attempt < MAX_CHUNK_ATTEMPTS) {
			console.log(
				`==> ${testCommand.label}: bun crashed (exit ${exitCode}); retrying (attempt ${attempt + 1}/${MAX_CHUNK_ATTEMPTS})`,
			);
			continue;
		}
		throw new Error(`${testCommand.label} ${describeChunkFailure(exitCode, timedOut)}: ${renderedCommand}`);
	}
}

// Child env shared by every spawned test process: the parent env with the
// private test-runtime marker set, all CI credential / cloud-config variables
// scrubbed (see SCRUBBED_ENV_* above), and GITHUB_ACTIONS cleared.
//
// GC knobs (both needed — they gate different JSC mechanisms):
// - `BUN_JSC_useConcurrentGC=0` stops the collector from marking concurrently
//   with the mutator (868789972, an earlier GC crash under bun test).
// - `BUN_JSC_numberOfGCMarkers=1` removes the ParallelHelperPool marker
//   threads. Bun 1.3.14 segfaults/aborts inside parallel marking
//   (`DOMGCOutputConstraint::executeImplImpl` → `visitOutputConstraints` on a
//   dead cell; also "Pure virtual function called!") on heap-heavy
//   coding-agent chunks (~1.3GB RSS, native ghostty-vt cells). Repro: UI
//   bucket chunk crashed ~25% of runs with `BUN_JSC_forceRAMSize=256MB`,
//   0/10 with markers=1, at zero measured wall-time cost. useConcurrentGC=0
//   alone did not prevent it — the crash predates this knob.
//
// The knobs are necessary but not sufficient: the same GC bug also fires on
// the *mutator* thread (`Heap::collectInMutatorThread` →
// `MarkingConstraintSolver::runExecutionThread` → `DOMGCOutputConstraint` →
// `JSAbortSignal::visitAdditionalChildrenInGCThread` reading a dead `reason`
// cell), where no marker/concurrency knob applies. That residual crash is
// handled by retrying crashed chunks in a fresh process (MAX_CHUNK_ATTEMPTS).
function buildChildEnv(): Record<string, string | undefined> {
	const env: Record<string, string | undefined> = {
		...Bun.env,
		GITHUB_ACTIONS: "",
		PI_TEST_RUNTIME: "1",
		BUN_JSC_useConcurrentGC: "0",
		BUN_JSC_numberOfGCMarkers: "1",
	};
	for (const key of Object.keys(env)) {
		if (isScrubbedEnvVar(key)) {
			delete env[key];
		}
	}
	return env;
}

// Per-chunk watchdog. A bun child that wedges (e.g. the panic handler
// deadlocking after a GC crash) would otherwise stall the whole run: the
// parallel path awaits the child's stdout/stderr pipes, which stay open as
// long as the wedged process — or any grandchild that inherited them — lives.
// After this many seconds the child is SIGKILLed and reported as a failure.
// Override with OMP_TEST_CHUNK_TIMEOUT (seconds).
function chunkTimeoutMs(): number {
	const raw = Number(Bun.env.OMP_TEST_CHUNK_TIMEOUT?.trim());
	if (Number.isFinite(raw) && raw >= 1) return raw * 1000;
	return 600_000;
}

// Exit codes that mean the bun process itself died to a runtime fault
// (128 + fatal signal) rather than reporting failing tests (which exit 1).
// Bun's panic handler exits via SIGTRAP (133) on macOS; raw SIGILL/SIGBUS/
// SIGABRT/SIGFPE/SIGSEGV surface as 132/135|138/134/136/139. 137 (SIGKILL)
// is deliberately excluded: that's the watchdog or the OOM killer, and
// retrying an OOM-killed chunk just OOMs again.
const BUN_CRASH_EXITS: Record<number, true> = {
	132: true,
	133: true,
	134: true,
	135: true,
	136: true,
	138: true,
	139: true,
};

// Total attempts a chunk gets when bun itself crashes. Bun 1.3.14's residual
// GC crash (JSAbortSignal `reason` visited on a dead cell during marking) is
// heap-timing dependent — a fresh process nearly always passes — while a
// deterministic crash still fails every attempt and is reported normally.
const MAX_CHUNK_ATTEMPTS = 3;

// Why a chunk failed, in words. Exit 137 is SIGKILL, which this runner reaches
// two very different ways -- the per-chunk watchdog firing, or the kernel OOM
// killer reaping a chunk that outgrew the runner -- and the bare exit code
// cannot tell them apart. Which one it was is the difference between "raise
// OMP_TEST_CHUNK_TIMEOUT" and "lower this bucket's chunkSize", so say it.
export function describeChunkFailure(exitCode: number, timedOut: boolean): string {
	if (timedOut) {
		return `exceeded the ${Math.round(chunkTimeoutMs() / 1000)}s chunk watchdog and was killed (exit ${exitCode}; OMP_TEST_CHUNK_TIMEOUT to change)`;
	}
	if (exitCode === 137) {
		return "was SIGKILLed (exit 137) without reaching the chunk watchdog, which on a CI runner means the OOM killer; lower this bucket's chunkSize";
	}
	return `failed with exit code ${exitCode}`;
}

// The standard `CI` signal is authoritative. In CI each bucket is its own
// memory-capped runner job (a single fat invocation gets OOM-killed at 137), so
// chunks run sequentially within a job and parallelism happens across jobs.
// Locally we trade memory for wall-clock and fan the chunks out across cores.
function isCI(): boolean {
	const value = Bun.env.CI;
	if (!value) return false;
	const normalized = value.trim().toLowerCase();
	return normalized !== "" && normalized !== "0" && normalized !== "false";
}

// Fan-out width for the local parallel path, clamped to the command count.
// Defaults to the machine's available parallelism; `OMP_TEST_CONCURRENCY`
// overrides it — a positive integer to pick an exact width (dial down on a
// memory-constrained laptop), or `all`/`max` to launch every chunk at once.
function testConcurrency(total: number): number {
	const raw = Bun.env.OMP_TEST_CONCURRENCY?.trim().toLowerCase();
	if (!raw) return Math.min(Math.max(1, os.availableParallelism()), total);
	if (raw === "all" || raw === "max") {
		return total;
	}
	const override = Number(raw);
	if (Number.isFinite(override) && override >= 1) {
		return Math.min(Math.floor(override), total);
	}
	throw new Error(`Invalid OMP_TEST_CONCURRENCY=${JSON.stringify(raw)}; expected a positive integer, all, or max`);
}

// Test files interleave real IO — sqlite writes, temp dirs, spawned CLIs — with
// CPU, so keeping every core busy needs more in-flight files than cores. This is
// the factor by which the shared budget exceeds `availableParallelism()`.
const FILE_OVERSUBSCRIBE = 2;

// Two independent parallelism knobs stack multiplicatively: the chunk pool runs
// `poolWidth` `bun test` processes at once, and each of those runs its own
// `--parallel=N` test files concurrently, so up to `poolWidth * N` files are in
// flight. Left unbudgeted that oversubscribes the runner by design — the
// workspace bucket asked for 4 x 8 = 32 files on a 4-core box — and because
// bun's per-test timeout is wall-clock, CPU-starved suites blow it and fail at
// random (mnemopi's sqlite/CLI files did, a different set each run). Spend one
// budget instead: each live chunk gets an equal share, never below 1 and never
// above the width it asked for. A chunk that runs alone still gets everything,
// so the sequential CI path is unchanged.
function budgetedParallel(requested: number, poolWidth: number): number {
	const budget = Math.max(1, os.availableParallelism()) * FILE_OVERSUBSCRIBE;
	return Math.max(1, Math.min(requested, Math.floor(budget / poolWidth)));
}

// Bun's 5s default per-test timeout is a unit-test default, and this repo's
// suites are not unit tests: mnemopi builds real SQLite schemas per case, the
// coding-agent suites drive sessions and subprocesses. Those cases already run
// 1-4s on a quiet CI runner, so any scheduling hiccup crosses 5s and reports a
// timeout that says nothing about the code. Timing out is still worth catching,
// so keep a ceiling — just one loose enough to only fire on a real hang. The
// per-chunk watchdog (chunkTimeoutMs) remains the backstop for a wedged process.
// Override with OMP_TEST_TIMEOUT (seconds); per-test `it(name, fn, ms)` still wins.
function testTimeoutMs(): number {
	const raw = Number(Bun.env.OMP_TEST_TIMEOUT?.trim());
	if (Number.isFinite(raw) && raw >= 1) return raw * 1000;
	return 30_000;
}

// Materialize each chunk's argv against the pool width it will actually run at,
// rewriting `parallel` from the requested width to the granted one so later
// reporting reads the truth. A `parallel` request marks the command as a `bun
// test` invocation, so that is also where the shared per-test timeout is
// applied; the Rust task, which has neither, passes through untouched.
function applyChunkBudget(commands: TestCommand[], poolWidth: number): TestCommand[] {
	const timeout = testTimeoutMs();
	return commands.map(testCommand => {
		if (testCommand.parallel === undefined) return testCommand;
		const parallel = budgetedParallel(testCommand.parallel, poolWidth);
		return {
			...testCommand,
			command: [...testCommand.command, `--parallel=${parallel}`, `--timeout=${timeout}`],
			parallel,
		};
	});
}

// ANSI styling for interactive runs only; disabled when stdout is not a TTY or
// NO_COLOR is set, so CI logs and piped/aggregated output stay plain text.
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code: string, value: string): string => (useColor ? `\x1b[${code}m${value}\x1b[0m` : value);
const style = {
	green: (s: string) => paint("32", s),
	red: (s: string) => paint("31", s),
	bold: (s: string) => paint("1", s),
	dim: (s: string) => paint("2", s),
};

// Outcome of one finished chunk. `output` is the chunk's combined stdout+stderr,
// buffered so it can be withheld during a quiet run and replayed only on failure.
// `retries` counts extra attempts spent on bun-crash exits (see BUN_CRASH_EXITS).
interface ChunkOutcome {
	label: string;
	command: string;
	exitCode: number;
	seconds: number;
	output: string;
	retries: number;
}

// Human duration in bun's bracket style: `[264ms]` under a second, `[3.3s]`
// above. Used by the progress line and footer so timings read like `bun test`.
function formatDuration(seconds: number): string {
	return seconds < 1 ? `${Math.round(seconds * 1000)}ms` : `${seconds.toFixed(1)}s`;
}

// One-line live progress entry in `bun test` style: `✓ <label> [time]` for a
// pass, `✗ <label> [time]` for a failure (bold red so the eye lands on it in a
// long scroll). A failure also names the first failing test parsed from the
// captured output — `— file > test (+N more)` — so the exact break is visible
// in the stream without waiting for the end-of-run report. Emitted in completion
// order as each chunk finishes.
export function formatProgressLine(outcome: ChunkOutcome): string {
	const time = style.dim(`[${formatDuration(outcome.seconds)}]`);
	const retryNote = outcome.retries > 0 ? ` ${style.dim(`(retried ×${outcome.retries} after bun crash)`)}` : "";
	if (outcome.exitCode === 0) {
		return `${style.green("✓")} ${outcome.label} ${time}${retryNote}`;
	}
	const failing = extractFailingTests(outcome.output);
	const first = failing[0]?.name;
	const more = failing.length > 1 ? style.dim(` (+${failing.length - 1} more)`) : "";
	const detail = first ? ` ${style.dim("—")} ${style.red(first)}${more}` : "";
	return `${style.bold(style.red(`✗ ${outcome.label}`))} ${time}${detail}${retryNote}`;
}

// Closing tally in `bun test` style, but counting test *chunks* (child commands),
// not individual tests — the runner never parses child summaries. A green
// `N chunks passed` line, a `N failed` line (red when non-zero, dim when clean),
// then the total wall time. Printed after the failure report so a run always
// ends on an at-a-glance verdict.
export function formatSummaryFooter(passed: number, failed: number, totalSeconds: number): string {
	const failLine = failed > 0 ? style.red(`${failed} failed`) : style.dim("0 failed");
	return [
		"",
		` ${style.green(`${passed} chunks passed`)}`,
		` ${failLine}`,
		style.dim(`Ran ${passed + failed} test command(s) in ${formatDuration(totalSeconds)}.`),
	].join("\n");
}

// A single failing test pulled from a chunk's captured bun output: its
// `file > test` identifier and the verbatim failure block bun printed for it
// (source frame, `error:` line, received/expected) — the detail a developer
// needs to act without re-running.
export interface FailingTest {
	name: string;
	detail: string;
}

// Parse the failing tests + their detail blocks out of a chunk's captured bun
// output. Bun emits, per failure, a source code frame and `error:` block
// *followed by* its `(fail) <name> [<time>]` marker, all under the most recent
// `<relative/path>.test.ts:` header. We track the current header, buffer the
// lines since the last marker/header (that's the pending failure's frame), and
// flush them when the `(fail)` line arrives. ANSI is stripped only to classify
// lines; the detail keeps bun's original bytes (incl. color). Returns `[]` when
// the chunk died without per-test markers (e.g. a compile/import crash), so the
// caller can fall back to replaying the raw log.
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const FILE_HEADER_RE = /^(\S.*\.test\.[cm]?[jt]sx?):$/;
const FAIL_MARKER_RE = /^\(fail\)\s+(.*?)(?:\s+\[[\d.]+\s*m?s\])?$/;
export function extractFailingTests(output: string): FailingTest[] {
	const failing: FailingTest[] = [];
	let currentFile = "";
	let buffer: string[] = [];
	for (const raw of output.split("\n")) {
		const line = raw.replace(ANSI_RE, "").trim();
		const header = FILE_HEADER_RE.exec(line);
		if (header) {
			currentFile = header[1];
			buffer = [];
			continue;
		}
		const fail = FAIL_MARKER_RE.exec(line);
		if (fail) {
			failing.push({
				name: currentFile ? `${currentFile} > ${fail[1]}` : fail[1],
				detail: buffer.join("\n").trim(),
			});
			buffer = [];
			continue;
		}
		buffer.push(raw);
	}
	return failing;
}

// Final report for the chunks that failed. Each chunk lists its failing tests,
// and under each test name bun's own failure block (source frame + `error:` +
// received/expected) is reproduced verbatim — caret alignment and diffs intact —
// so it reads like a direct `bun test` failure. In quiet mode (`replayOutput`)
// the blocks are shown because the run withheld them; in verbose mode they
// already streamed inline, so only the names are listed. When a chunk crashed
// without per-test markers (no parseable failures) the raw log is replayed as a
// fallback in quiet mode. The banner repeats below so it stays visible whether
// you scroll to the top or the bottom of the failures.
export function formatChunkFailure(failure: ChunkOutcome, replayOutput: boolean): string {
	const lines: string[] = [];
	lines.push(
		"",
		style.bold(style.red(`✗ ${failure.label} (exit ${failure.exitCode})`)),
		style.dim(`$ ${failure.command}`),
	);
	const failing = extractFailingTests(failure.output);
	// Fully attributed only when every failure carries its own bun block;
	// otherwise (no markers, or a marker with no preceding frame — timeouts,
	// crashes) name what we can and replay the raw log so no error is lost.
	const fullyAttributed = failing.length > 0 && failing.every(test => test.detail.length > 0);
	for (const test of failing) {
		lines.push("", `  ${style.red("✗")} ${style.bold(test.name)}`);
		// Flush-left and verbatim so bun's caret/diff alignment is preserved.
		if (replayOutput && fullyAttributed) {
			lines.push(test.detail);
		}
	}
	if (replayOutput && !fullyAttributed && failure.output.trim().length > 0) {
		lines.push("", failure.output.trimEnd());
	}
	return lines.join("\n");
}

export function formatFailureReport(failures: ChunkOutcome[], total: number, replayOutput: boolean): string {
	const header = `${failures.length} of ${total} test chunk(s) FAILED`;
	const lines: string[] = ["", style.bold(style.red(`━━━ ${header} ━━━`))];
	for (const failure of failures) {
		lines.push(formatChunkFailure(failure, replayOutput));
	}
	lines.push("", style.red(header));
	return lines.join("\n");
}

// Run every command through a fixed-width worker pool. Each child's stdout and
// stderr are drained concurrently (so a chatty test never deadlocks on a full
// pipe) and buffered. Quiet mode (the default) prints one progress line per
// finished chunk and replays full output only for failures, in a single report
// at the end; `--full` streams every chunk's output inline as it completes. All
// failures are collected and reported together instead of failing fast, so one
// run surfaces every broken chunk and exits non-zero without a runner stack trace.
export async function runTestCommandsInParallel(commands: TestCommand[], concurrency: number): Promise<void> {
	const env = buildChildEnv();
	const queue = [...commands];
	const failures: ChunkOutcome[] = [];
	let completed = 0;
	const fileWidths = [...new Set(commands.map(c => c.parallel).filter(p => p !== undefined))].sort((a, b) => a - b);
	console.log(
		`Running ${commands.length} test command(s), up to ${concurrency} in parallel ` +
			`(OMP_TEST_CONCURRENCY=<n>|all to change); ${os.availableParallelism()} cores, ` +
			`--parallel=${fileWidths.join("/") || "n/a"} per chunk.`,
	);

	// Incremental, cancellable drain into a mutable sink, so a watchdog-killed
	// chunk still reports whatever the child managed to print before it wedged.
	function drainInto(
		stream: ReadableStream<Uint8Array>,
		sink: { text: string },
	): { done: Promise<void>; cancel: () => void } {
		const decoder = new TextDecoder();
		const reader = stream.getReader();
		const done = (async () => {
			try {
				for (;;) {
					const { done: ended, value } = await reader.read();
					if (ended) break;
					sink.text += decoder.decode(value, { stream: true });
				}
			} catch {
				// cancelled or broken pipe — keep what was captured
			}
			sink.text += decoder.decode();
		})();
		return { done, cancel: () => void reader.cancel().catch(() => {}) };
	}

	// Wait for `promise` at most `ms`; resolves `true` when it settled in time.
	// Never rejects.
	async function settleWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
		const { promise: expired, resolve } = Promise.withResolvers<boolean>();
		const timer = setTimeout(() => resolve(false), ms);
		const settled = await Promise.race([
			promise.then(
				() => true,
				() => true,
			),
			expired,
		]);
		clearTimeout(timer);
		return settled;
	}

	// One spawn of a chunk: pipes drained into buffers, watchdog-killed if it
	// wedges, post-exit drain capped so leaked grandchildren holding the pipes
	// can't keep the runner's event loop alive.
	async function runAttempt(
		testCommand: TestCommand,
	): Promise<{ exitCode: number; output: string; timedOut: boolean }> {
		const proc = Bun.spawn(testCommand.command, {
			cwd: path.join(repoRoot, testCommand.cwd),
			env,
			stdout: "pipe",
			stderr: "pipe",
		});
		const stdout = { text: "" };
		const stderr = { text: "" };
		const stdoutDrain = drainInto(proc.stdout as ReadableStream<Uint8Array>, stdout);
		const stderrDrain = drainInto(proc.stderr as ReadableStream<Uint8Array>, stderr);
		const drains = Promise.all([stdoutDrain.done, stderrDrain.done]);
		// Watchdog: a wedged child (e.g. bun's panic handler deadlocking
		// after a GC crash) would otherwise hang this worker forever.
		let timedOut = false;
		const killTimer = setTimeout(() => {
			timedOut = true;
			proc.kill("SIGKILL");
		}, chunkTimeoutMs());
		const exitCode = await proc.exited;
		clearTimeout(killTimer);
		if (!(await settleWithin(drains, 5000))) {
			stdoutDrain.cancel();
			stderrDrain.cancel();
			await drains;
		}
		return {
			exitCode,
			timedOut,
			output: `${stdout.text}${stderr.text}${timedOut ? `\n[watchdog] chunk exceeded ${Math.round(chunkTimeoutMs() / 1000)}s; killed with SIGKILL (OMP_TEST_CHUNK_TIMEOUT to change)\n` : ""}`,
		};
	}

	async function worker(): Promise<void> {
		for (;;) {
			const testCommand = queue.shift();
			if (!testCommand) {
				return;
			}
			const renderedCommand = testCommand.command.map(shellQuote).join(" ");
			const startedAt = performance.now();
			let attempt = 1;
			let result = await runAttempt(testCommand);
			// Bun-crash retry: a 128+signal exit means the runtime died (GC
			// segfault/abort), not that tests failed — rerun in a fresh heap.
			while (!result.timedOut && BUN_CRASH_EXITS[result.exitCode] && attempt < MAX_CHUNK_ATTEMPTS) {
				attempt += 1;
				process.stdout.write(
					`${style.dim(`↻ ${testCommand.label} — bun crashed (exit ${result.exitCode}); retrying (attempt ${attempt}/${MAX_CHUNK_ATTEMPTS})`)}\n`,
				);
				result = await runAttempt(testCommand);
			}
			completed += 1;
			const outcome: ChunkOutcome = {
				label: testCommand.label,
				command: renderedCommand,
				exitCode: result.exitCode,
				seconds: (performance.now() - startedAt) / 1000,
				output: result.output,
				retries: attempt - 1,
			};
			if (quiet) {
				let msg = `${formatProgressLine(outcome)}\n`;
				if (result.exitCode !== 0 || result.timedOut) {
					msg += `${formatChunkFailure(outcome, true)}\n`;
				}
				process.stdout.write(msg);
			} else {
				const status = result.exitCode === 0 ? "ok" : `FAILED exit ${result.exitCode}`;
				process.stdout.write(
					`\n==> [${completed}/${commands.length}] ${testCommand.label} (${status}, ${outcome.seconds.toFixed(1)}s)\n$ ${renderedCommand}\n${outcome.output}`,
				);
			}
			if (result.exitCode !== 0 || result.timedOut) {
				failures.push(outcome);
			}
		}
	}

	const runStartedAt = performance.now();
	await Promise.all(Array.from({ length: concurrency }, () => worker()));

	if (quiet) {
		const totalSeconds = (performance.now() - runStartedAt) / 1000;
		process.stdout.write(
			`${formatSummaryFooter(commands.length - failures.length, failures.length, totalSeconds)}\n`,
		);
	} else if (failures.length > 0) {
		process.stdout.write(style.bold(style.red(`\n${failures.length} of ${commands.length} test chunk(s) FAILED\n`)));
	}
	if (failures.length > 0) {
		process.exitCode = 1;
	}
}

// Repo-wide files that can break any suite regardless of which package owns
// the change: the lockfile pins every dependency, the workspace manifest and
// the shared TS config feed every build. A diff touching one of these must run
// everything — the alternative is silently skipping a suite because a rename
// moved its trigger somewhere the package map does not cover.
const repoWideAffectedFiles = new Set(["bun.lock", "package.json", "tsconfig.json"]);

// One chunk's worth of test files, recovered from its argv. Chunks are built
// as `["bun", "test", ...onlyFailuresArgs, ...testFiles]`, so the trailing
// arguments that are not runner flags are the files. Read back off the command
// rather than kept in a parallel field so a chunk can never drift between the
// label it reports and the files it actually runs.
function chunkTestFiles(testCommand: TestCommand): string[] {
	// Drop the `bun test` invocation prefix before reading the argv as files.
	// Filtering on "not a flag" alone is not enough: it keeps the runner binary
	// itself, which would make every package-level chunk look like a chunk that
	// names its own files and so stop reacting to its whole package.
	const rest = testCommand.command.slice(1);
	return rest.filter(arg => arg !== "test" && !onlyFailuresArgs.includes(arg) && !arg.startsWith("-"));
}

// Decides whether a chunk is affected by a diff, given the changed file and
// the chunk's package root. Returns the reason so the caller can log which
// file selected which chunk instead of only counting matches.
function chunkIsAffected(testCommand: TestCommand, changedFile: string): string | undefined {
	const packageRoot = testCommand.cwd === "." ? "" : `${testCommand.cwd}/`;
	// A chunk that names its own test files reacts only to those exact files.
	// Membership, not a path prefix: the chunks of one bucket all share a
	// package root, so a prefix test would mark every chunk of the bucket
	// affected the moment any one of its test files changed.
	const testFiles = chunkTestFiles(testCommand);
	if (testFiles.length > 0) {
		return testFiles.includes(
			changedFile.startsWith(packageRoot) ? changedFile.slice(packageRoot.length) : changedFile,
		)
			? "test file"
			: undefined;
	}
	// A chunk that names no files runs its whole package (`bun test` with no
	// path), so anything under that package — or anything repo-wide — affects it.
	if (packageRoot === "") return "repo";
	return changedFile.startsWith(packageRoot) ? "package" : undefined;
}

// The minimal smoke set run when a diff maps to no test file at all. Named
// chunks, not a bare `[]`: the point of this path is that a CI job stays
// distinguishable from a CI job that silently ran nothing. Mirrors the
// `ci:test:smoke` root script so the fallback is the same work that script
// already gates on.
function smokeCommands(): TestCommand[] {
	return [
		{
			label: "smoke: cli boots (--version/--help)",
			cwd: ".",
			command: ["bun", "packages/coding-agent/src/cli.ts", "--version"],
		},
		{
			label: "smoke: worker ping (--smoke-test)",
			cwd: ".",
			command: ["bun", "packages/coding-agent/src/cli.ts", "--smoke-test"],
		},
	];
}

// Chooses the chunks a diff actually exercises. `changedFiles` empty means
// "no diff was supplied", which is the local/no-CI case and must keep today's
// behaviour of running everything. A diff that was supplied but matches no
// test returns the named smoke set instead of `[]`, because an empty selection
// would be indistinguishable from a CI job that ran nothing and passed.
export function selectAffected(commands: TestCommand[], changedFiles: string[] | undefined): TestCommand[] {
	if (!changedFiles) return commands;
	const normalized = changedFiles.map(file => file.replace(/\\/g, "/").replace(/^\.\//, "")).filter(Boolean);
	const repoWide = normalized.filter(file => repoWideAffectedFiles.has(file.split("/").pop() ?? ""));
	if (repoWide.length > 0) return commands;

	const selected = new Set<TestCommand>();
	for (const changedFile of normalized) {
		for (const testCommand of commands) {
			if (chunkIsAffected(testCommand, changedFile)) {
				selected.add(testCommand);
			}
		}
	}
	return selected.size > 0 ? [...selected] : smokeCommands();
}

// `OMP_TEST_SHARD=i/n` splits a mode's chunk commands across n CI jobs; job i
// runs every chunk whose index ≡ i-1 (mod n). Round-robin rather than
// contiguous ranges because the chunk list follows sorted file order, so slow
// neighbouring suites spread evenly instead of piling into one shard. Every
// chunk lands in exactly one shard; unset/empty runs everything.
export function selectShard<T>(commands: T[], spec: string | undefined): T[] {
	const trimmed = spec?.trim();
	if (!trimmed) return commands;
	const match = /^(\d+)\/(\d+)$/.exec(trimmed);
	const index = match ? Number(match[1]) : 0;
	const count = match ? Number(match[2]) : 0;
	if (!match || count < 1 || index < 1 || index > count) {
		throw new Error(`Invalid OMP_TEST_SHARD=${JSON.stringify(trimmed)}; expected i/n with 1 <= i <= n`);
	}
	const selected = commands.filter((_, i) => i % count === index - 1);
	if (selected.length === 0) {
		throw new Error(`OMP_TEST_SHARD=${trimmed} selects no chunks (${commands.length} available)`);
	}
	return selected;
}

// Changed-file list for the selector. Two sources, in priority order:
// `OMP_TEST_AFFECTED` is a newline/comma-separated list some caller already
// computed; `OMP_TEST_DIFF_BASE` is a commit the workflow can see the PR's
// merge base through (`github.event.pull_request.base.sha`), fetched shallow
// because CI checks out depth 1. With neither, the working tree is the diff.
// Every failure returns "no diff", which runs everything — a diff nobody could
// compute must never turn into a suite nobody ran.
async function changedFilesForSelection(): Promise<string[] | undefined> {
	const supplied = Bun.env.OMP_TEST_AFFECTED?.trim();
	if (supplied) {
		return supplied
			.split(/[\n,]/)
			.map(file => file.trim())
			.filter(Boolean);
	}
	// Set but empty is the same "caller had nothing to give" shape as a blank
	// base, and must resolve the same way: run everything. Falling through to
	// the working tree here would make the two spellings of "no diff" disagree,
	// and a caller cannot tell which one it used.
	if (Bun.env.OMP_TEST_AFFECTED !== undefined) return undefined;

	const base = Bun.env.OMP_TEST_DIFF_BASE;
	if (base !== undefined) {
		// Set but blank means the workflow had no PR base to diff against — a
		// push to main. That is a full run, never a narrow one: main has no
		// "changed files" to narrow by, and falling through to the working
		// tree there would read CI's clean checkout as "nothing changed".
		const trimmedBase = base.trim();
		if (!trimmedBase) return undefined;
		const fetched = await $`git fetch --no-tags --depth=1 origin ${trimmedBase}`.cwd(repoRoot).quiet().nothrow();
		if (fetched.exitCode !== 0) {
			console.warn(`Warning: failed to fetch diff base ${trimmedBase}. Running every chunk.`);
			return undefined;
		}
		const diff = await $`git diff --name-only ${trimmedBase}...HEAD`.cwd(repoRoot).quiet().nothrow();
		if (diff.exitCode !== 0) {
			console.warn(`Warning: failed to diff against ${trimmedBase}. Running every chunk.`);
			return undefined;
		}
		return new TextDecoder()
			.decode(diff.stdout)
			.split("\n")
			.map(file => file.trim())
			.filter(Boolean);
	}

	// Local runs have no merge base, so the working tree is the diff. Same
	// porcelain shape and same conservative fallback as run-rs-task.ts.
	const result = await $`git status --porcelain -z`.cwd(repoRoot).quiet().nothrow();
	if (result.exitCode !== 0) {
		const stderr = result.stderr.toString().trim();
		const suffix = stderr === "" ? `exit ${result.exitCode}` : stderr;
		console.warn(`Warning: failed to inspect the diff: ${suffix}. Running every chunk.`);
		return undefined;
	}
	return getChangedPathsFromPorcelain(result.stdout);
}

function getChangedPathsFromPorcelain(buf: Uint8Array): string[] {
	const entries = new TextDecoder().decode(buf).split("\0").filter(Boolean);
	const changedPaths: string[] = [];
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (entry.length < 4) continue;
		const status = entry.slice(0, 2);
		const changedPath = entry.slice(3);
		if (changedPath !== "") {
			changedPaths.push(changedPath);
		}
		if (status.includes("R") || status.includes("C")) {
			const renamedPath = entries[index + 1];
			if (renamedPath) {
				changedPaths.push(renamedPath);
				index += 1;
			}
		}
	}
	return changedPaths;
}

// The per-file mapping lines. Printed one line per changed file — never just
// a count — because a count cannot tell a reader *which* file fell through the
// selector, and "the diff had files but none mapped" is the exact shape of the
// bug this path can introduce.
function reportDiffSelection(
	allCommands: TestCommand[],
	changedFiles: string[] | undefined,
	selected: TestCommand[],
): void {
	if (!changedFiles) {
		console.log(`diff files: 0 (no diff available) -> running every chunk (${selected.length})`);
		return;
	}
	console.log(`diff files: ${changedFiles.length}`);
	const normalized = changedFiles.map(file => file.replace(/\\/g, "/").replace(/^\.\//, ""));
	for (const changedFile of normalized) {
		const matched = allCommands.filter(testCommand => chunkIsAffected(testCommand, changedFile));
		console.log(
			`  ${changedFile} -> ${matched.length > 0 ? matched.map(c => c.label).join(", ") : "(no test covers this)"}`,
		);
	}
	const usedSmoke = selected.length > 0 && selected.every(testCommand => testCommand.label.startsWith("smoke:"));
	if (usedSmoke || selected.length === 0) {
		console.log(`selector empty for this diff -> running minimal smoke: ${selected.map(c => c.label).join(", ")}`);
	}
}

// Skipped when imported (e.g. by the runner's own unit tests), where
// `process.argv` carries test-file paths rather than a mode/flags.
if (import.meta.main) {
	if (!(requestedMode in validModes)) {
		throw new Error(
			`Unknown mode ${shellQuote(requestedMode)}. Expected one of: ${Object.keys(validModes).join(", ")}`,
		);
	}

	const allCommands = await commandsForMode(requestedMode as Mode);
	// Sharding is reported before the diff filter runs, so a wrong chunk set is
	// visible as a sharding-layer problem rather than a selector-layer one.
	const shardSpec = Bun.env.OMP_TEST_SHARD?.trim();
	const shardedCommands = selectShard(allCommands, shardSpec);
	console.log(`shard ${shardSpec ?? "(unset)"} of ${allCommands.length} chunks -> ${shardedCommands.length} selected`);
	const changedFiles = await changedFilesForSelection();
	const affectedCommands = selectAffected(shardedCommands, changedFiles);
	reportDiffSelection(allCommands, changedFiles, affectedCommands);
	const smokeFallback = changedFiles !== undefined && affectedCommands.every(c => c.label.startsWith("smoke:"));
	console.log(
		`selected=${affectedCommands.length} mode=${changedFiles === undefined ? "shard-only" : smokeFallback ? "smoke" : "diff"}`,
	);
	const requestedCommands = affectedCommands;
	const explicitConcurrency = Boolean(Bun.env.OMP_TEST_CONCURRENCY?.trim());
	// CI defaults to one process at a time, but memory-sized workflow buckets
	// explicitly opt into bounded process concurrency. Local runs fan out by
	// default and may use the same override. Resolved before the dry-run check so
	// `--dry-run` prints the argv the real run would use, budget included.
	const pooled = requestedCommands.length > 1 && (!isCI() || explicitConcurrency);
	// The sequential path is a pool of one, so a lone chunk keeps the whole budget.
	const poolWidth = pooled ? testConcurrency(requestedCommands.length) : 1;
	const testCommands = applyChunkBudget(requestedCommands, poolWidth);
	if (pooled && !isDryRun) {
		await runTestCommandsInParallel(testCommands, poolWidth);
	} else {
		for (const testCommand of testCommands) {
			await runTestCommand(testCommand);
		}
	}
	// The conclusion line pairs the selection with what it cost. Without the
	// exit code a green job and a job that selected nothing are both just
	// "CI passed" in the log.
	console.log(`exit=${process.exitCode ?? 0}`);
}
