# Phiếu triển khai — `@oh-my-pi/pi-evals` (work item `evals`)

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1B_EXECUTION_PLAN.md`
**Nguồn:** `/Users/tranquangdang21/Projects/pi-ref` @ `d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31`
**Đích:** `/Users/tranquangdang21/Projects/ultraworkers` (branch `milestone-1`)

> **LỆCH TIÊU ĐỀ — đọc trước khi làm.**
> Lệnh giao việc yêu cầu work item `## 6. evals`. Trong plan hiện tại **không có** heading
> `## 6. evals`. `## 6` là `telemetry` (`MILESTONE_1B_EXECUTION_PLAN.md:2197`), còn `evals` là
> **`## 7. evals`** ở `MILESTONE_1B_EXECUTION_PLAN.md:2389` (dài 2650-2648, kết thúc ở dòng 2648).
> Phiếu này viết cho **section `## 7. evals`** (đúng theo tên work item). Tên file đầu ra giữ
> hậu tố `__6` theo đúng lệnh giao việc. Nếu người đọc sau cần tra section `telemetry`, đó là
> phiếu khác.

---

## 1. Cái gì thay đổi, quan sát được

Sau khi merge, `bun test packages/evals` chạy 4 file / 32 case xanh trên máy lập trình viên
mà **không cần Docker, không cần credential provider, không cần build native addon** — và
`packages/evals` xuất hiện trong `scripts/ci-test-ts.ts` nên CI thật sự chạy nó; đồng thời
`packages/evals/README.md` nói rõ package này đo *hành vi* của coding-agent, khác hẳn với
`packages/coding-agent/src/eval/` sẵn có (thứ đó là sandbox thực thi mã không tin cậy).

Không có gì thay đổi đối với người dùng cuối ở PR này. Đây là hạ tầng đo, và phần đo được
(các cánh Docker) bị hoãn — xem mục 5 để biết PR này **không** chứng minh được gì.

---

## 2. Bảng điểm sửa

Mọi ô "TRƯỚC" trích nguyên văn từ file tôi vừa mở. Mọi dòng có `→` sai thì mục 7 ghi lại.

### 2.1 File chép nguyên văn (không sửa dòng nào)

| đường/dẫn đích | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/evals/src/plan.ts` | toàn file (59 dòng, 2215 byte) | không có import nào | giữ nguyên byte. Đã kiểm: file đúng 59 dòng, `DOCUMENTATION_VARIANTS` ở L1, `parseDiscoveredCases` L21-37, `createTaskPlan` L39-59, `isRecord` private L17-19 |
| `packages/evals/.gitignore` | toàn file (7 byte) | `.eval/` | giữ nguyên |
| `packages/evals/docker/Dockerfile.dockerignore` | toàn file (68 byte, 7 dòng) | `.git`, `**/.eval`, `**/node_modules`, `**/dist`, `**/coverage`, `**/.env`, `**/.env.*` | giữ nguyên |

### 2.2 `src/report.ts` — chép rồi sửa **4 dòng**, không phải 6

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/evals/src/report.ts:1` | import | `import { createHash } from "node:crypto";` | `import { createHash } from "node:crypto";` — **GIỮ NGUYÊN**. Xem mục 7-A |
| `packages/evals/src/report.ts:4` | `styleText` | `import { styleText } from "node:util";` | **GIỮ NGUYÊN.** `Bun.styleText` không tồn tại. Xem mục 7-A |
| `packages/evals/src/report.ts:5` | `ReportCase` | `import type { ReportCase } from "@vitest-evals/core";` | `import type { ReportCase } from "./report-io.ts";` |
| `packages/evals/src/report.ts:6` | seam reader | `import { readReportWorkspace, readVitestJsonReportFile } from "@vitest-evals/core/node";` | `import { readReportWorkspace, readVitestJsonReportFile } from "./report-io.ts";` |
| `packages/evals/src/report.ts:130` | `persistSession` | `createHash("sha256").update(identity).digest("hex"),` | **giữ nguyên** — xem mục 7-A. Plan nói "0 chỗ `createHash` trong file này", đó là SAI |

Ngoài 4 dòng import: **không đổi gì**. `summarizeEvalObservations` (L359-413),
`formatEvalComparisonReport` (L436-483), `classifyCaseStatus` (L101-106),
`erroredObservation` (L118-120), `readTaskObservation` (L136-189) đều là hàm thuần hoặc đã
đúng kiểu. File dài đúng 483 dòng như plan nói.

### 2.3 `src/docker.ts` — chép rồi Bun-ify

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/evals/src/docker.ts:1` | `spawnSync` | `import { spawnSync } from "node:child_process";` | `import { $ } from "bun";` |
| `packages/evals/src/docker.ts:2` | `createHash` | `import { createHash } from "node:crypto";` | **giữ `node:crypto`** — mục 7-A |
| `packages/evals/src/docker.ts:3` | fs sync API | `import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";` | `import * as fs from "node:fs/promises";` (namespace import theo AGENTS.md) |
| `packages/evals/src/docker.ts:23-31` | `execute()` | `function execute(command, args, capture = false): { status: number; stdout: string }` trả `{ status: result.status ?? 1, stdout: capture ? result.stdout : "" }` | `async function execute(...): Promise<string>` dùng `` await $`${cmd} ${args}`.cwd(packageRoot).quiet().nothrow() `` rồi `if (exitCode !== 0) throw ...`; gộp 2 nhánh `capture` thành 1. Call sites: `requireSuccess` L33-36, `buildImages` L55, `discoverCases` L151, `runTask` L172 |
| `packages/evals/src/docker.ts:38-61` | `buildImages` | `` const prefix = `pi-evals-${createHash("sha256").update(repositoryRoot).digest("hex").slice(0, 12)}` `` | `` const prefix = `omp-evals-${sha256(repositoryRoot).slice(0, 12)}` `` với `sha256()` là helper `new Bun.CryptoHasher("sha256")` |
| `packages/evals/src/docker.ts:67-89` | `requireEvalAuthFile` | `export function requireEvalAuthFile(provider: string): string {` + `if (!existsSync(path) \|\| !statSync(path).isFile())` + `JSON.parse(readFileSync(path, "utf8"))` | `export async function requireEvalAuthFile(provider: string): Promise<string>`; `await fs.stat(path)` trong try/catch `isEnoent`; `await Bun.file(path).text()`. **Sửa đúng một chỗ gọi: `src/cli.ts:129`** |
| `packages/evals/src/docker.ts:67-71` | default agent dir | `join(homedir(), ".pi", "agent")` | `join(homedir(), ".omp", "agent")` (xác minh `CONFIG_DIR_NAME` của omp) |
| `packages/evals/src/docker.ts:97` | `mkdirSync` | `mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });` | `await fs.mkdir(outputDirectory, { recursive: true, mode: 0o700 });` → `dockerArgs` thành `async` |
| `packages/evals/src/docker.ts:108-113` | env prefix | `PI_EVAL_ARTIFACT_DIR`, `PI_EVAL_RUNS_PER_VARIANT`, `PI_EVAL_SANDBOX_UID`, `PI_EVAL_SANDBOX_GID`, `PI_PROVIDER`, `PI_MODEL` | `OMP_EVAL_*`, `OMP_PROVIDER`, `OMP_MODEL` |
| `packages/evals/src/docker.ts:121` | secret mount | `target=/run/pi-eval-secrets/auth.json` | `target=/run/omp-eval-secrets/auth.json` |
| `packages/evals/src/docker.ts:156-159` | `taskDirectoryName` | `return createHash("sha256").update(identity).digest("hex");` | `return sha256(identity);` (Bun.CryptoHasher) |
| `packages/evals/src/docker.ts:174` | `runTask` return | `return existsSync(reportPath) ? reportPath : undefined;` | `return (await Bun.file(reportPath).exists()) ? reportPath : undefined;` → `runTask` thành `async` |

`runTask` chuyển `async` kéo theo `discoverCases` và `cli.ts`. Giữ nguyên `createDockerContext`
(L126-135, constructor record thuần), `BuiltImages` (L12), và regex escape tên test ở **L164**
(plan nói đúng).

### 2.4 `src/cli.ts` — chép rồi sửa

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/evals/src/cli.ts:1` | crypto | `import { createHash, randomUUID } from "node:crypto";` | giữ `randomUUID`; `createHash` → `sha256()` helper |
| `packages/evals/src/cli.ts:2` | `globSync` | `import { globSync } from "node:fs";` | dùng `Bun.Glob` hoặc giữ — xác minh trước khi gõ |
| `packages/evals/src/cli.ts:4-5` | path/url | `import { dirname, relative, resolve } from "node:path";` / `import { fileURLToPath } from "node:url";` | `import.meta.dir` thay cho `dirname(fileURLToPath(import.meta.url))` ở L88 |
| `packages/evals/src/cli.ts:88` | `packageRoot` | `const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");` | `const packageRoot = resolve(import.meta.dir, "..");` |
| `packages/evals/src/cli.ts:101` | `normalizeDiscoveredFile` | `const prefix = "/repo/packages/evals/";` | `const prefix = \`${containerRepoRoot}/packages/evals/\`;` — suy ra từ `packageRoot`, không hardcode |
| `packages/evals/src/cli.ts:129` | auth call | `const authPath = requireEvalAuthFile(selectedModel.provider);` | `const authPath = await requireEvalAuthFile(selectedModel.provider);` — **đây là dòng 129, không phải L6 như plan ghi** (mục 7-B) |
| `packages/evals/src/cli.ts:163` | `protocolDigest` | `const protocolDigest = createHash("sha256").update(protocolText).digest("hex");` | `const protocolDigest = sha256(protocolText);` — **byte phải giống hệt**, digest này ràng buộc report với plan |
| `packages/evals/src/cli.ts:172, 190, 191` | `console.log` | 3 lời gọi `console.log` | **GIỮ `console.*`.** Đây là CLI độc lập thoát ra không vào TUI — ngoại lệ được AGENTS.md tài liệu hoá. Đẩy qua `logger` sẽ ghi vào `~/.omp/logs/` và phá output contract của runner |
| `packages/evals/src/cli.ts:192` | exit code | `if (report.blockedPairs.length > 0) process.exitCode = 1;` | giữ nguyên — đây là hợp đồng "cặp bị chặn ⇒ exit ≠ 0" |

### 2.5 `src/harness.ts` — file sẽ hỏng, đây là bảng sửa chính

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/evals/src/harness.ts:1-7` | builtin node | `createHash` / `node:fs` / `node:fs/promises` / `node:os` / `node:path` / `node:perf_hooks` | `Bun.hash`→`Bun.CryptoHasher` (mục 7-A); `fs/promises` cho readdir/mkdir/rm; `Bun.nanoseconds()` thay `performance.now()` ở L278/461/468 |
| `packages/evals/src/harness.ts:8` | `contentText` | `import { contentText, InMemoryCredentialStore } from "@earendil-works/pi-ai";` | `InMemoryCredentialStore` từ `@oh-my-pi/pi-ai`; `contentText` từ file local `./content-text.ts` (pi-ai của omp **không có** `utils/text.ts` — `packages/ai/src/utils/` tồn tại nhưng rỗng) |
| `packages/evals/src/harness.ts:9` | `getCurrentSystemPrompt` | `import { getCurrentSystemPrompt } from "@earendil-works/pi-ai/utils/transcript";` | `./system-prompt.ts` (file local) |
| `packages/evals/src/harness.ts:13,14,16,17` | không tồn tại ở omp | `createAgentSessionFromServices`, `createAgentSessionServices`, `InlineExtension`, `ModelRuntime` | **xoá hết**; thay bằng `createAgentSession` + `ExtensionFactory` |
| `packages/evals/src/harness.ts:53-54` | `PiCodingAgentHarnessOptions` | `noTools?: CreateAgentSessionOptions["noTools"];`<br>`tools?: CreateAgentSessionOptions["tools"];` | `noTools?: boolean;`<br>`tools?: string[];` — omp không có key `tools`/`noTools` nào (`grep -c noTools packages/coding-agent/src/sdk.ts` → **0**) |
| `packages/evals/src/harness.ts:314` | `readStoredCredential` | `const storedCredential = readStoredCredential(selection.provider, authPath);` (2 tham số) | omp chỉ có 1 tham số (`legacy-pi-coding-agent-shim.ts:1478`: `readStoredCredential(provider: string)` → `AuthStorage.create().get(provider)`). **KHÔNG dùng bản omp** — nó đọc `~/.omp/agent/auth.json` thật. Resolve tường minh: `await Bun.file(authPath).text()` rồi tự parse |
| `packages/evals/src/harness.ts:316-327` | `ModelRuntime` | `await ModelRuntime.create({ credentials })` … `getModel` / `getAuth` / `setRuntimeApiKey` | trỏ `ModelRegistry` + `AuthStorage` của omp, hoặc cắt hẳn và để `models.*` eval ở ngoài phạm vi |
| `packages/evals/src/harness.ts:351-352` | options forwarding | `tools: options.tools,`<br>`noTools: options.noTools,` | `toolNames: options.tools ?? DOCUMENTATION_EVAL_TOOLS,`<br>`restrictToolNames: true,`<br>// KHÔNG map vào customTools — option đó nhận (CustomTool \| ToolDefinition)[], không nhận tên` |
| `packages/evals/src/harness.ts:295-298` | `before_agent_start` | `pi.on("before_agent_start", ({ systemPrompt }) => { forcedSystemPrompt = transform(systemPrompt); return { systemPrompt: forcedSystemPrompt }; })` | giữ nguyên tên hook; chỉ đổi `transform(systemPrompt)` → `transform(systemPrompt.join("\n"))` vì omp trả `string[]` (`types.ts:809` → `systemPrompt: string[]`, `types.ts:1218` → `systemPrompt?: string[]`) |
| `packages/evals/src/harness.ts:485` | `DOCUMENTATION_EVAL_TOOLS` | `export const DOCUMENTATION_EVAL_TOOLS = ["read", "write", "edit", "grep", "find", "ls"] as const;` | bỏ `"ls"` (không tồn tại ở omp) → `["read", "write", "edit", "grep", "find"]`, hoặc thay bằng `"glob"` (có thật, `builtin-names.ts:12`). **Ghi rõ trong README nếu bỏ** |
| `packages/evals/src/harness.ts:526-528` | container chốt | `if (process.env.PI_EVAL_CONTAINER !== "1" \|\| !resolveSandboxIdentity()) {` | `OMP_EVAL_CONTAINER` |
| `packages/evals/src/harness.ts:262, 265` | `verifySystemPrompt` | `systemPrompt.includes("\n<rules>\n")` / `systemPrompt.includes("\n<docs>\nPi documentation (read only")` | **phải suy ra lại từ prompt thật của omp** — xem mục 6, cạm bẫy #1 |
| `packages/evals/src/harness.ts:495-496, 501-502` | `excludePiDocumentation` | `const documentationStartMarker = "\n<docs>\n";` / `const documentationEndMarker = "\n</docs>";` / `defaultPrompt.lastIndexOf("\n<cwd>\n")` | **cả 3 marker đều không có trong prompt omp** (đo: 0 hit `<docs>` và `<cwd>` trong `packages/coding-agent/src/prompts/`). Chuyển sang `doc-lift.ts` và suy ra lại |
| `packages/evals/src/harness.ts:83` | `applyIsolatedEnvironment` | `const overrides = { HOME: home, USERPROFILE: home, PI_CODING_AGENT_DIR: agentDir };` | `PI_CODING_AGENT_DIR` là biến **omp thật sự đọc** (`packages/utils/src/dirs.ts:456` và `:476`). Giữ nguyên. Tốt hơn: bỏ hẳn env, truyền `agentDir: isolatedAgentDir` vào `createAgentSession` (`sdk.ts:504`) |

### 2.6 `evals/acme-server.ts` — chép rồi sửa

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/evals/evals/acme-server.ts:1` | server | `import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";` | `Bun.serve` (không `http.createServer`) |
| `packages/evals/evals/acme-server.ts:3-12` | 9 hằng export | `OPENAI_PROVIDER_ID` … `STREAM_API_DOCUMENTATION` | **port nguyên văn 9 hằng** |
| `packages/evals/evals/acme-server.ts:51-58` | `AcmeServer` | `start/stop/reset/origin/baseUrl/validRequestReceived` | **hình dạng không được đổi** — 4 chỗ gọi + 1 test phụ thuộc |
| `packages/evals/evals/acme-server.ts:133, 138-140` | bind | `server = createServer(...)` … `const address = server.address();` … `address.port` | `server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch })` → `server.port` |
| `packages/evals/evals/acme-server.ts:134-137` | Promise | `await new Promise<void>((resolve, reject) => { server?.once("error", reject); server?.listen(0, "127.0.0.1", resolve); });` | `Bun.serve` bind đồng bộ → bỏ hẳn promise này |
| `packages/evals/evals/acme-server.ts:144` | Promise | `await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));` | `await server.stop();` |

### 2.7 File test (4 file) — mỗi file đúng MỘT dòng đổi

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/evals/test/plan.test.ts:1` | runner | `import { describe, expect, it } from "vitest";` | `import { describe, expect, it } from "bun:test";` |
| `packages/evals/test/comparison.test.ts:1` | ANSI strip | `import { stripVTControlCharacters } from "node:util";` | giữ nguyên — hoạt động dưới Bun (khác với `styleText`, mục 7-A) |
| `packages/evals/test/comparison.test.ts:2` | runner | `import { describe, expect, it } from "vitest";` | `import { describe, expect, it } from "bun:test";` |
| `packages/evals/test/report.test.ts:1-3` | fs | `node:fs/promises` + `node:os` + `node:path` | tương đương Bun |
| `packages/evals/test/report.test.ts:4` | runner | `import { afterEach, describe, expect, it } from "vitest";` | `from "bun:test"` — **thêm `it.each` chạy sẵn dưới bun, không cần đổi** (`it.each(["skipped","todo","disabled"])` ở L106) |
| `packages/evals/test/report.test.ts:47` | container path | `name: "/repo/packages/evals/evals/example.docs.eval.ts",` | suy ra từ `packageRoot` |
| `packages/evals/test/report.test.ts:30` | tmpdir prefix | `mkdtemp(join(tmpdir(), "pi-eval-report-test-"))` | `"omp-eval-report-test-"` |
| `packages/evals/test/report.test.ts` | fixture | `meta: scoredMeta({...})` nhúng vào `assertionResults[].meta` | **phải giữ nguyên hình dạng này** — seam `report-io.ts` của tôi đọc đúng nó và cả 32 case xanh |
| `packages/evals/test/acme-server.test.ts:1` | runner | `import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";` | `from "bun:test"` |

### 2.8 File mới (8 file, tất cả 0 byte ở nguồn)

| đường/dẫn đích | nội dung bắt buộc |
| --- | --- |
| `packages/evals/src/report-io.ts` | `ReportCase` + `readReportWorkspace` + `readVitestJsonReportFile`. **`readReportWorkspace` phải trả `{ workspace: { cases } }`, không phải `{ cases }`** — `report.ts:142` giải ra `const [{ workspace }, rawReport] = loaded`. Tôi đã viết sai một lần và 8/32 case đỏ; sửa xanh hết. |
| `packages/evals/src/harness-types.ts` | port `vitest-evals/harness`: `Harness`, `HarnessContext`, `JsonValue`, `SimpleHarnessResult`, `TranscriptEvent`, `UsageSummary`, `createHarness`, `normalizeHarnessRun`, `normalizeRecord`, `attachHarnessRunToError`, `toJsonValue` |
| `packages/evals/src/content-text.ts` | `contentText(content, separator?)` — port từ pi `packages/ai/src/utils/text.ts:6` |
| `packages/evals/src/system-prompt.ts` | `getCurrentSystemPrompt(messages)` — port từ pi `packages/ai/src/utils/transcript.ts:99` |
| `packages/evals/src/doc-lift.ts` | bộ cắt docs + `verifySystemPrompt`, dựng lại marker từ prompt omp (**đừng chép marker của pi**) |
| `packages/evals/src/index.ts` | barrel `export * from "./plan"` v.v. Pi **không có** file này — đây là phần thêm |
| `packages/evals/NOTICE` | MIT nguyên văn từ `/Users/tranquangdang21/Projects/pi-ref/LICENSE` (dòng 3: `Copyright (c) 2025 Mario Zechner`) + commit `d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31` + danh sách file thích nghi. Khuôn: `crates/pi-shell/NOTICE` (văn xuôi → dòng trống → nguyên văn giấy phép) |
| `packages/evals/tsconfig.json` | `{"extends": "../tsconfig.workspace.json", "include": ["src", "test", "evals"]}` — **không** khai `types` (ghi đè `["bun","assets"]` của `tsconfig.base.json` sẽ mất khai báo asset) |

### 2.9 `package.json`

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/evals/package.json:2` | name | `"name": "@earendil-works/pi-evals",` | `"@oh-my-pi/pi-evals"` — **ở dòng 2, không phải L3 như plan ghi** (mục 7-C) |
| `packages/evals/package.json:7` | clean | `"clean": "shx rm -rf .eval",` | `"clean": "rm -rf .eval"` (`shx` KHÔNG thêm) |
| `packages/evals/package.json:8` | eval | `"eval": "npm run eval:host && npm run eval:docs --",` | `"eval": "bun run eval:host && bun run eval:docs --"` |
| `packages/evals/package.json:9` | eval:host | `"eval:host": "vitest run --config vitest.evals.config.ts --project host",` | `"eval:host": "bun test"` |
| `packages/evals/package.json:10` | eval:docs | `"eval:docs": "node --experimental-strip-types src/cli.ts",` | `"eval:docs": "bun src/cli.ts"` |
| `packages/evals/package.json:11` | test | `"test": "vitest run --config vitest.test.config.ts"` | `"test": "bun test --parallel"` — khuôn của 10/16 package omp đã kiểm |
| `packages/evals/package.json:13-22` | devDeps | 8 mục gồm `@types/node`, `@vitest-evals/core`, `autoevals`, `shx`, `vitest`, `vitest-evals` | bỏ 5 mục vitest-family + `shx`; `@types/bun` lấy từ catalog (`^1.3.14` đã ghim ở `package.json` gốc) |
| `packages/evals/package.json` | scripts mới | không có | **bắt buộc**: `"check:types": "tsgo -p tsconfig.json --noEmit"` và `"check": "oxlint . && oxfmt --check --no-error-on-unmatched-pattern 'src/**/*.{ts,tsx}' '{test,bench,examples,scripts}/**/*.ts' '*.ts' && bun run check:types"` — khuôn này đã kiểm ở `packages/omptype/package.json`; 16/16 package đều có |

### 2.10 Đăng ký CI

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `scripts/ci-test-ts.ts:88` | `fastWorkspacePackages` | mảng 8 phần tử bắt đầu `"packages/omptype",` | thêm `"packages/evals",` — không có dòng này, test tồn tại nhưng CI không bao giờ chạy |

---

## 3. Các bước

Mỗi neo dưới đây tôi đã mở và đọc trong phiên này.

1. **Dựng khung + chép 3 file nguyên văn.** `packages/evals/{src,evals,test,docker,scripts}`.
   Copy `src/plan.ts` (2215 byte, 59 dòng — không import gì), `.gitignore` (7 byte),
   `docker/Dockerfile.dockerignore` (68 byte). *Đã kiểm chứng: đủ 3 file trong cây thật.*

2. **Viết `packages/evals/NOTICE`.** Lấy nguyên văn `MIT License` + `Copyright (c) 2025 Mario Zechner`
   từ `/Users/tranquangdang21/Projects/pi-ref/LICENSE` dòng 1-3, cộng commit
   `d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31` (đã xác minh = HEAD của `pi-ref`).
   Theo khuôn `crates/pi-shell/NOTICE`. *Đã kiểm chứng: LICENSE dòng 3, NOTICE precedent tồn tại.*

3. **Viết `tsconfig.json` + `package.json`.** Khuôn 16/16 package (đã kiểm: cả 16 `packages/*/tsconfig.json`
   đều `extends: "../tsconfig.workspace.json"`; cả 16 đều có `check` và `check:types`).
   Workspaces gốc là `packages/*` nên `packages/evals` tự khớp, **không sửa `package.json` gốc**.

4. **Port `src/report.ts` + viết `src/report-io.ts` seam.** Đây là việc làm **trước** `harness.ts`
   vì nó là code giá trị cao nhất và chỉ bị chặn bởi một seam. Chỉ 4 dòng import đổi (mục 2.2).
   Danh sách field `readTaskObservation` đọc, lấy từ `report.ts:123` và `:136-189`:
   `status`, `fullName`, `harness.run.usage.{provider,model,inputTokens,outputTokens,totalTokens,toolCalls,metadata.cacheReadTokens,metadata.cacheWriteTokens,metadata.estimatedCostUsd}`,
   `harness.run.timings.totalMs`, `harness.run.errors`, `harness.run.artifacts[piSessionJsonl]`, `eval.avgScore`.
   *Đã kiểm chứng bằng cách chạy thật — xem mục 5.*

5. **Port `src/docker.ts` + `src/cli.ts` cùng lúc** (`cli.ts` gọi mọi export của `docker.ts`).
   Đổi `spawnSync` → `` $` ``, fs sync → `Bun.file`/`fs/promises`, `requireEvalAuthFile` thành `async`
   và **await ở `cli.ts:129`**. Giữ 3 `console.log` ở L172/190/191. Suy ra tiền tố container ở
   `cli.ts:101` thay vì hardcode. *Đã kiểm chứng: L101 là `const prefix = "/repo/packages/evals/";`.*

6. **Viết 4 module phụ cục bộ**: `harness-types.ts`, `content-text.ts`, `system-prompt.ts`, `doc-lift.ts`.
   Với `doc-lift.ts`: **đừng chép marker của pi** — đo thật cho thấy `"\n<docs>\n"`, `"\n<rules>\n"`,
   `"\n<cwd>\n"` đều không có trong `packages/coding-agent/src/prompts/system/system-prompt.md`
   (0 hit `<docs>`; `<rules>` chỉ xuất hiện ở `prompts/tools/computer.md:41`,
   `prompts/system/orchestrate-notice.md:8`, `prompts/system/custom-system-prompt.md:54`).

7. **Port `src/harness.ts`.** File này sẽ hỏng typecheck ngay. Bảng sửa ở mục 2.5.
   Kiểm chắc trước khi dựa vào: `session.reload()` tồn tại (`agent-session.ts:10225`),
   `session.abort()` tồn tại (`agent-session.ts:8766`).

8. **Port `evals/acme-server.ts`.** `Bun.serve`, bỏ 2 `new Promise`, `stop()`.
   Giữ nguyên hình dạng `AcmeServer` và 9 hằng export.

9. **Port 4 file test + đăng ký CI.** Chỉ đổi dòng `from "vitest"` → `from "bun:test"`.
   Thêm `"packages/evals"` vào `fastWorkspacePackages` tại `scripts/ci-test-ts.ts:88`.

10. **HOÃN** (không port trong PR này): 5 suite eval, `docker/Dockerfile`, `docker/install-runtime.mjs`,
    `docker/entrypoint.ts`, 2 config vitest, `evals/configured-runtime.ts`,
    `test/configured-runtime.test.ts`, `test/harness.test.ts`.

11. **Trước commit đầu tiên:** diff `files[]` của `packages/coding-agent` với tập docs mà cánh
    `without_docs` cắt, và ghi ánh xạ vào README package. Thêm mục `## [Unreleased]`
    trong `packages/evals/CHANGELOG.md`.

---

## 4. Hợp đồng test

**4 file, 32 case, tất cả chạy được ngay trên máy không cần Docker.**

| file | case | cái gì phải đúng | người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| `test/plan.test.ts` | 4 | `parseDiscoveredCases` từ chối tên không có `"<eval set> > <case>"`, từ chối identity trùng; `createTaskPlan` xen kẽ thứ tự cánh theo `runNumber`; từ chối model identity không có `/` | plan sinh ra task sai thứ tự cánh → lift tính trên cohort bị lệch trung tâm, và **không** có lỗi nào được in ra |
| `test/comparison.test.ts` | 4 | một cặp bị chặn (thiếu/trùng/skip/pending/không chấm/lỗi) ⇒ `blockedPairs` liệt kê, `controlPassRate`/`treatmentPassRate` = `null`, `lift` = `null`; `total: null` chứ không phải `0` | báo cáo in ra lift tính trên mẫu số bị rút âm thầm — một hồi quy trông như **miễn phí** |
| `test/report.test.ts` | 11 (trong đó 1 `it.each` sinh 3) | `readTaskObservation` chuẩn hoá vitest JSON thành `EvalObservation`, lưu session artifact, và trả `errored` cho mọi lệch identity/status/model; `classifyCaseStatus` map `skipped/todo/disabled → skipped`, `failed → errored` | một field telemetry đổi tên trong `report-io.ts` ⇒ mọi quan sát thành `'errored'` và case biến mất khỏi report **không kèm lỗi** |
| `test/acme-server.test.ts` | 5 | server giả từ chối phân biệt `404/405/415/400/422/401`; không ghi nhận probe khi credential sai | eval provider chấm một request không hợp lệ là hợp lệ → số đo provider sai mà vẫn xanh |

**Phần KHÔNG được test** (theo luật AGENTS.md): constructor lưu option, hằng số có giá trị này,
report không rỗng, file tồn tại. **Không source-grep. Không `mock.module()`.**

`applyIsolatedEnvironment` mutate `process.env`; nếu sau này viết test harness, dùng
`vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach` từng test.

---

## 5. Cổng

### 5.1 Cổng như plan viết — và câu trả lời thẳng: **CÓ ĐỎ ĐƯỢC**

```bash
bun run check:ts && bunx oxlint packages/evals
bun test packages/evals
grep -rn '@earendil-works' packages/evals    # phải 0 hit
grep -rn 'from "vitest' packages/evals       # phải 0 hit
grep -c 'Copyright (c) 2025 Mario Zechner' packages/evals/NOTICE   # phải 1
```

**Có đỏ được không? Có — bốn cách độc lập, tất cả đã kiểm:**

1. `check:ts` đỏ khi `tools`/`noTools` còn trỏ vào key không tồn tại ở omp. Kiểm chứng:
   `grep -c noTools packages/coding-agent/src/sdk.ts` → **0**.
2. `grep -rn '@earendil-works' packages/evals` đỏ khi sót tiền tố. Nguồn có **14** chỗ
   `@earendil-works/pi-coding-agent` + **7** `@earendil-works/pi-ai` + **1** `@earendil-works/pi-evals`.
3. `grep -rn 'from "vitest' packages/evals` đỏ khi sót runner. Nguồn có **10** import `from "vitest";`
   + 2 `from "vitest/config"` + 9 `from "vitest-evals"`.
4. `NOTICE` đỏ khi thiếu giấy phép.

**Đã chạy thật cổng 2, không chỉ lý thuyết.** Tôi chép 4 file test + `plan.ts` + `report.ts` +
`acme-server.ts` vào thư mục tạm, đổi `vitest` → `bun:test`, viết seam `report-io.ts`, chạy:

```
bun test v1.3.14
 32 pass
 0 fail
 62 expect() calls
Ran 32 tests across 4 files. [39.00ms]
```

Không cần ninja, không build `packages/natives`, không `bunfig.toml` preload. Cổng này **thật**.

### 5.2 Nhưng cổng này KHÔNG bắt được thứ quan trọng nhất

Cổng trên xanh **ngay cả khi `doc-lift.ts` cắt hụt hoàn toàn**. Vì vậy tôi đề xuất **thêm hai
cổng**, cả hai đều đỏ được và không tốn gì:

```bash
# Cổng MỚI-1: marker docs phải là của omp, không phải của pi
grep -rn 'Pi documentation (read only' packages/evals/src   # phải 0 hit
grep -rnF '<docs>' packages/evals/src                      # phải 0 hit
grep -rnF '<cwd>' packages/evals/src                       # phải 0 hit

# Cổng MỚI-2: mọi tên tool trong DOCUMENTATION_EVAL_TOOLS phải tồn tại ở omp
bun -e 'import {BUILTIN_TOOL_NAMES} from "./packages/coding-agent/src/tools/builtin-names.ts";
       const t=["read","write","edit","grep","find"];
       const m=t.filter(x=>!(BUILTIN_TOOL_NAMES as readonly string[]).includes(x));
       if(m.length) { console.error("tool không tồn tại:", m); process.exit(1); }'
```

Cổng MỚI-1 đỏ được vì: `Pi documentation (read only` xuất hiện **2 lần** trong nguồn
(`harness.ts:265`, `harness.test.ts:77`) và chép nó sang sẽ fail ngay.
Cổng MỚI-2 đỏ được vì `ls` — chuỗi đó **không** nằm trong `BUILTIN_TOOL_NAMES`.

### 5.3 Cổng KHÔNG đỏ được — nói thẳng

| cổng | trạng thái | vì sao |
| --- | --- | --- |
| `bun test packages/evals` **chứng minh phép so sánh chạy được** | **KHÔNG THỂ** | `createPiDocumentationEvalHarness` từ chối chạy trừ khi `OMP_EVAL_CONTAINER=1` + cặp uid/gid sandbox (`harness.ts:526-528`), và mọi cánh doc cần credential provider thật + 2 ảnh Docker đã build. PR này **chỉ** chứng minh: package biên dịch, lint sạch, qua test đơn vị |
| probe smoke kiểu `omp --smoke-test` | **KHÔNG CÓ** | entrypoint container không được job CI nào chạm tới. Cần probe smoke anh em mới nếu nhánh Docker hồi sinh |
| `bun test packages/evals` chạm tới `Dockerfile` / `entrypoint.ts` | **KHÔNG BAO GIỜ** | đồ thị import của cả 4 file test chỉ gồm node builtins + `plan.ts` + `report.ts` + `report-io.ts` + `acme-server.ts`. Tôi đã xác minh bằng cách chạy |

**Viết nguyên văn câu này vào PR, không bỏ:**
> PR này không chứng minh phép so sánh behavior chạy được. Nó chứng minh package biên dịch,
> lint sạch và qua 32 test đơn vị không cần Docker. Toàn bộ nhánh Docker bị hoãn.

### 5.4 Hai điều kiện không nằm trong lệnh nào

- `packages/evals` phải xuất hiện trong `fastWorkspacePackages` (`scripts/ci-test-ts.ts:88`).
- `packages/evals/NOTICE` phải chứa nguyên văn dòng `Copyright (c) 2025 Mario Zechner`.

---

## 6. Cạm bẫy riêng của work item này

Xếp theo mức độ phá hoại nếu làm sai.

**1. `doc-lift.ts` sẽ no-op im lặng — cạm bẫy số 1.**
`harness.ts:495-496` dùng `"\n<docs>\n"` và `"\n</docs>"`; `:501` dùng `"\n<cwd>\n"`; `:262` dùng
`"\n<rules>\n"`; `:265` dùng `"\n<docs>\nPi documentation (read only"`. Tôi đã đo prompt thật
của omp: **0 hit `<docs>`, 0 hit `<cwd>`** trong toàn bộ `packages/coding-agent/src/prompts/`.
`<rules>` có, nhưng ở ba prompt khác, không phải `system-prompt.md`.
Hệ quả: `excludePiDocumentation` ném `"Default Pi system prompt has no Pi documentation section"`
(cành control chết, nhìn thấy được) — hoặc tệ hơn, nếu bạn viết lại quá "chung chung" để không ném,
nó trả về prompt không đổi và **cánh control vẫn đầy đủ tài liệu**: lift luôn bằng 0 và mọi
kết luận về docs là sai. Cánh Docker bị hoãn nên PR này không bắt được. Phải **đọc prompt omp
đã build** rồi viết marker từ đó.

**2. `Bun.styleText` không tồn tại. Chép đúng hướng dẫn của plan sẽ làm hỏng file.**
Đã chạy: `typeof Bun.styleText === "undefined"` trên Bun 1.3.14. `node:util` `styleText` chạy
tốt dưới Bun. **Giữ `import { styleText } from "node:util"`** ở `report.ts:4`.

**3. `Bun.hash` KHÔNG phải sha256.**
`Bun.hash("x")` trả `4738888789374899184n` — đó là wyhash 64-bit trả về **BigInt**, không phải
hex digest. Thay `createHash("sha256")` bằng `Bun.hash` sẽ phá 4 chỗ: tên ảnh Docker
(`docker.ts:39`), tên thư mục session (`docker.ts:158`), thư mục artifact (`report.ts:130`),
và tệ nhất là **`protocolDigest`** (`cli.ts:163`) — digest này ràng buộc report với đúng plan
đã sinh ra nó. Dùng `new Bun.CryptoHasher("sha256")` — tôi đã kiểm: cho output **giống hệt byte**
với `node:crypto` (`2cf24dba5fb0a30e...`).

**4. Rò credential — khiếm khuyết duy nhất gây thiệt hại thật.**
`harness.ts:314` gọi `readStoredCredential(selection.provider, authPath)` (2 tham số). Bản của
omp là 1 tham số và đọc `AuthStorage.create()` — tức đúng `~/.omp/agent/auth.json` của người phát
triển, rồi đẩy vào container và hạ xuống uid 65532. Bản chép sẽ **không biên dịch** (điều tốt).
Nguy hiểm là ai đó "sửa" cho xong bằng cách bỏ đối số thứ hai. Quy tắc một dòng: **không bao giờ
gọi `readStoredCredential` của omp từ harness.** Resolve `authPath` tường minh rồi tự đọc file.

**5. Đừng thêm vitest để "cho chạy không đổi".**
Đây là lối tắt hấp dẫn nhất. 4 file test port bằng **một dòng import mỗi file** — tôi đã làm
và nó xanh 32/32. Thêm vitest tạo ra hai hệ test với config, vòng đời và pipeline CI khác nhau.

**6. `ls` không tồn tại ở omp — nhưng nó xuất hiện ở HAI chỗ.**
`harness.ts:485` (`DOCUMENTATION_EVAL_TOOLS`) và `evals/documentation-audit.eval.ts:39`
(`tools: ["read", "grep", "find", "ls", TOOL_NAME]`). Plan chỉ nói chỗ đầu. Chỗ thứ hai cũng
phải sửa nếu file đó được port.

**7. `tsconfig` — `include` KHÔNG hợp nhất, nó bị thay thế.**
Plan nói `tsconfig.workspace.json` "đã có sẵn `include`/`exclude` cho mọi package — không cần
lặp lại 5 glob của pi". Đúng một nửa: `include` ở tsconfig **ghi đè** chứ không hợp nhất. Khai
`"include": ["src", "test", "evals"]` ở package là đúng (thay hẳn 7 glob của workspace bằng 3
của package) — nhưng phải hiểu là **thay**, không phải **bổ sung**. Quên `evals` thì typecheck
bỏ qua cả thư mục eval.

**8. Đừng để cánh control âm thầm chạy thiếu tool.**
Nếu bỏ `ls` mà không ghi, phép so sánh là giữa hai bên được trang bị khác nhau — đúng loại vi
phạm giao thức im lặng mà chính các eval này sinh ra để ngăn. Ghi vào README.

**9. `report-io.ts` phải trả `{ workspace: { cases } }`.**
`report.ts:142` giải `const [{ workspace }, rawReport] = loaded`. Tôi viết `{ cases }` trong
lần đầu và **8/32 case đỏ** với `TypeError: undefined is not an object`. Chi tiết nhỏ, hậu quả
lớn, và không có type nào bắt được nếu seam viết nhanh.

**10. `readTaskObservation` nuốt lỗi.**
`report.ts:142-144` có `.catch(() => undefined)` trên `Promise.all`. Một seam `report-io.ts`
throw sẽ biến thành `outcome: "errored"` cho **mọi** case — báo cáo vẫn in ra, exit code vẫn
đúng, nhưng toàn bộ cohort bị chặn và lift = `null`. Test phải khẳng định case scored thật sự
được chấm, không chỉ khẳng định "không throw".

---

## 7. Sai lệch giữa work item và cây thật (GHI RA, không sửa trong tài liệu)

### 7-A. `Bun.styleText` và `Bun.hash` — chỉ thị sai, sẽ hỏng runtime

| tài liệu nói | thực tế |
| --- | --- |
| `report.ts`: "L4 `node:util` `styleText` → `Bun.styleText`" | `Bun.styleText` là `undefined` trên Bun 1.3.14. `node:util` `styleText` hoạt động |
| `report.ts`: "`createHash` từ `node:crypto` → `Bun.hash`" | `Bun.hash` là wyhash 64-bit trả BigInt, không phải sha256 hex |
| `docker.ts`, `cli.ts`, `harness.ts`: `createHash` → `Bun.hash` | như trên |
| `report.ts`: "0 chỗ `createHash` trong file này sau khi đổi import — hãy kiểm chứng" | **Sai.** `report.ts:130` vẫn gọi `createHash("sha256").update(identity).digest("hex")`. Đếm đúng: 9 dòng chứa `createHash` toàn package (report 2, cli 2, docker 3, harness 2) — con số 9 đúng, nhưng kết luận "0 trong file này" sai |

Đã kiểm chứng bằng `bun -e`. Sửa: giữ `node:util` `styleText`; dùng `new Bun.CryptoHasher("sha256")`
(cho output giống hệt `node:crypto` — đã so).

### 7-B. `cli.ts:6` không phải chỗ gọi `requireEvalAuthFile`

Tài liệu: "L6 `await requireEvalAuthFile(...)` → thêm `await`".
Thực tế: `cli.ts:6` là `import { buildImages, createDockerContext, discoverCases, requireEvalAuthFile, runTask } from "./docker.ts";`.
Lời gọi thật ở **`cli.ts:129`**: `const authPath = requireEvalAuthFile(selectedModel.provider);`

### 7-C. `package.json:2`, không phải `:3`

Tài liệu: "L3 name `@earendil-works/pi-evals` → `@oh-my-pi/pi-evals`".
Thực tế: `package.json:2` là `"name": "@earendil-works/pi-evals",`. L3 là `"version"`.

### 7-D. `harness.ts:485`, không phải `:484`

Tài liệu: "`DOCUMENTATION_EVAL_TOOLS` | const | `packages/evals/src/harness.ts:484`".
Thực tế: `:484` là JSDoc `/** Documentation evals intentionally exclude shell and unrestricted network tools. */`;
const ở **`:485`**.

### 7-E. Trôi hệ thống ~12 dòng trong `sdk.ts`

Mọi neo phía omp trong `sdk.ts` đều cũ. Đo lại:

| tài liệu nói | thực tế |
| --- | --- |
| `CreateAgentSessionOptions` kéo `sdk.ts:495-809` | **`498-821`** |
| `customTools` (L591) | **`603`** — `customTools?: (CustomTool \| ToolDefinition)[];` |
| `extensions` (L593) | **`605`** — `extensions?: ExtensionFactory[];` |
| `agentDir?: string` (L501) | **`504`** |
| `toolNames` (L692), `restrictToolNames` (L694) | **`704`**, **`706`** |
| `createAgentSession` (L1485) | **`1497`** |

Mọi **khẳng định chữ ký** đều đúng: `customTools` nhận object không nhận tên ✓; `toolNames?: string[]`
và `restrictToolNames?: boolean` tồn tại ✓; `grep -c noTools sdk.ts` → **0** ✓.

### 7-F. Trôi ~9-29 dòng trong các file omp khác

| tài liệu nói | thực tế |
| --- | --- |
| `readStoredCredential` ở `legacy-pi-coding-agent-shim.ts:1469` | **`1478`** — `export function readStoredCredential(provider: string): AuthCredential \| undefined` |
| `defineTool` ở `...shim.ts:457` | **`458`** |
| `get extensionRunner` ở `session/agent-session.ts:12155` | **`:12155` là `toggleAdvisorEnabled(): boolean`**. Getter thật ở **`12342`**: `get extensionRunner(): ExtensionRunner \| undefined` |
| `BeforeAgentStartEvent` `types.ts:783-790` | **`803-810`**, `systemPrompt: string[]` ở **`:809`** |
| `BeforeAgentStartEventResult` `types.ts:1194-1198` | **`1215-1219`**, `systemPrompt?: string[]` ở **`:1218`** |
| `ExtensionFactory` `types.ts:1660` | `:1660` là `ProviderModelConfig`. `ExtensionFactory` ở **`1685`** |
| `emitBeforeAgentStart` `runner.ts:1874-1913` | **`1903`**; `hasHandlers("before_agent_start")` ở **`1908`**, không phải `1879` |
| `PI_CODING_AGENT_DIR` đọc ở `utils/src/dirs.ts:446` | `:446` là dòng mở JSDoc. Đọc env thật ở **`:456`** và **`:476`** |

### 7-G. Số đếm sai

| tài liệu nói | đo được |
| --- | --- |
| "`vitest-evals` \| 7" | **13** ngoài README, **18** tính cả README. Phân bố: `package.json` 2, `src/report.ts` 2, `src/harness.ts` 1 (`vitest-evals/harness`), `docker/entrypoint.ts` 1 (`vitest-evals/reporter`), 7 file trong `evals/` × 1. Trong đó **9** là import (`grep -c 'from "vitest-evals'` → 9) |
| "13 chỗ `from 'vitest'`" | **10** `from "vitest";` đúng nghĩa. Con số 13 là `from "vitest` (21) trừ `from "vitest-evals` (8), nên nó đếm cả 2 `from "vitest/config"` và 1 `from "vitest-evals/harness"` |
| "`packages/coding-agent/src/eval/` là 59 file (56 `.ts` …)" | **60 file**: 57 `.ts` + 2 `.py` + 1 `.txt` |
| "senpi **bỏ 25 file** của pi" (dòng 381) | câu này sai theo nghĩa đen. `senpi-ref/packages/evals` có **25 file** nhưng là package vitest **hoàn toàn khác** (`src/docs.eval.ts`, `src/vitest-evals/*`, không có `docker/`, không có `report.ts`/`plan.ts`). Không phải "pi bớt 25 file" |

### 7-H. Chi tiết nhỏ

- `entrypoint.ts`: tài liệu nói "L31 khẳng định `npm-shrinkwrap.json`" — `:31` là hằng
  `codingAgentDir`, danh sách `["package.json", "npm-shrinkwrap.json", "dist/index.js"]` ở `:32`.
- `entrypoint.ts`: "nhánh `with_docs` … L55-62 ném `Missing documentation`" — vòng lặp ở
  `:55-60`, lệnh ném ở **`:61`**.
- `tsconfig.json` của pi: tài liệu nói "không phải `../../tsconfig.base.json`"; nguồn thật là
  `"extends": "../../tsconfig.json"` (dòng 2). Chỉ thị dùng `../tsconfig.workspace.json` vẫn đúng.

### 7-I. Những gì tài liệu nói và cây thật **KHỚP** (đã kiểm, không cần sửa)

Để người sau không phải kiểm lại:

- 30 file / 133.025 byte ✓; **cả 30 con số byte** trong bảng "File cần chép" khớp tuyệt đối.
- `plan.ts` đủ 6 neo; `report.ts` đủ 16 neo (kể cả `report.ts` dài đúng 483 dòng);
  `docker.ts` đủ 6 neo (kể cả regex escape ở `:164`); `acme-server.ts` đủ 11 neo
  (kể cả 2 `new Promise` ở `:135`/`:144`, `server.address()` ở `:138`).
- `configured-runtime.ts` đủ 8 neo.
- Tất cả rename count khớp: `PI_PROVIDER` 16, `PI_MODEL` 16, `PI_CODING_AGENT_DIR` 5,
  `PI_EVAL_VARIANT` 10, `PI_EVAL_SANDBOX_UID` 5, `PI_EVAL_SANDBOX_GID` 5, `PI_EVAL_CONTAINER` 3,
  `PI_EVAL_RUNS_PER_VARIANT` 3, `PI_EVAL_ARTIFACT_UID` 3, `PI_EVAL_ARTIFACT_GID` 3,
  `PI_EVAL_ARTIFACT_DIR` 3, `PI_SESSION_SNAPSHOT_ARTIFACT`+`piSessionJsonl` 7, `pi-eval-` 11,
  `/repo/packages/evals/` 10 (9 file skip + `test/report.test.ts:47` ✓), `autoevals` 2.
- `Configure this running Pi installation` × 4 ✓; `Pi documentation (read only` × 2 ✓.
- `package.json:11` `"test": "vitest run --config vitest.test.config.ts"` ✓ — dòng sót mà
  bước 3 yêu cầu phải xoá.
- omp: `BUILTIN_TOOL_NAMES` ở `builtin-names.ts:1-32` ✓, 5/6 tên tool có thật, `ls` không có ✓.
- omp: `resourceLoader` 0 hit ✓, `getDocsPath|getExamplesPath|getReadmePath` 0 hit ✓,
  `packages/coding-agent/src/core/` không tồn tại ✓, `packages/ai/src/utils/` rỗng ✓,
  `vitest*` 0 hit ✓, `npm-shrinkwrap.json` 0 hit ✓, `scripts/release-packages.mjs` và
  `scripts/coding-agent-consumer.mjs` không tồn tại ✓.
- omp: `files[]` của coding-agent có `README.md`, `CHANGELOG.md`, `examples`, và
  `dist/docs-index.generated.txt`; **không** có `docs` ✓. `main` là `./src/index.ts` ✓.
- omp: `packages/coding-agent/docs` không tồn tại; `./docs` ở gốc có 134 file `.md` ✓.
- omp: 16/16 package có `check` + `check:types` với đúng khuôn plan nêu ✓; 10/16 dùng
  `bun test --parallel` ✓; `check:ts` gốc dùng `--if-present` ✓; workspaces `packages/*` khớp ✓.
- omp: `fastWorkspacePackages` tại `scripts/ci-test-ts.ts:88` ✓; `autoresearch/index.ts:293` ✓;
  `ai/src/index.ts:1` ✓; `help-extra.ts:66` ✓; `session.reload()` `:10225` ✓; `session.abort()` `:8766` ✓.
- omp: `OMP_CODING_AGENT_DIR` 0 hit ✓; `pi-ref` HEAD = `d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31` ✓;
  `pi-ref/LICENSE:3` = `Copyright (c) 2025 Mario Zechner` ✓; `crates/pi-shell/NOTICE` tồn tại ✓.
- `oxlint` không có trên PATH, `bunx` có ✓ → cổng `bunx oxlint` là đúng.
- **Cổng `32 pass / 0 fail / 4 file / ~39ms` tái lập được nguyên văn.**

---

## 8. Câu hỏi cần người quyết (chưa trả lời, chặn quyết định phạm vi)

1. **coding-agent của omp có tự thêm provider/model vào bản cài của chính nó được không?**
   Chính sách model nằm trong cây luật KDL biên dịch lúc build
   (`packages/catalog/src/compat/rules/`), không phải registry sửa lúc chạy. Nếu câu trả lời
   là không, 3 suite eval (models, openai-provider, custom-provider) **không viết nổi** và
   package sẽ ship 2 suite thay vì 5. Trả lời cái này **trước khi** port bất kỳ suite nào.
2. **`src/harness.ts` mất toàn bộ độ phủ** (`harness.test.ts` bị skip), và `docker.ts`/`cli.ts`
   vốn đã chẳng có. Logic sandbox + cách ly credential — code hậu quả cao nhất package — hiện
   không được test. Viết test hẹp cho các phần thuần (`resolveModelSelection`,
   `verifySystemPrompt`, `resolveDocumentationVariant`, `excludePiDocumentation`,
   `seedWorkspace` từ chối escape) trên `bun:test`, hay luật chất lượng test loại vì quá hẹp?
3. **`@oh-my-pi/pi-evals` có đúng không?** Quy ước `@earendil-works/X` → `@oh-my-pi/X` cho ra
   tên này, đọc lên thừa. 6 package kia không bị ảnh hưởng. Nếu `evals` là cái duy nhất trông
   sai thì bây giờ là lúc — sau khi nó đã phát hành, đổi là breaking.
4. **Nhánh Docker sống hay chết ở lát cắt đầu?** (a) mount source vào container bun, chạy từ
   source; (b) mở rộng `scripts/release.ts` để phát tarball + viết `scripts/release-packages.mjs`
   và `scripts/coding-agent-consumer.mjs` còn thiếu. Quyết định maintainer có đuôi dài — nêu
   một lần, tường minh.
5. **3 file test phụ thuộc `ModelRuntime` hoãn đi đâu** — package riêng, hay TODO có dấu vết
   trong README? Chúng mã hoá hợp đồng thật với một bề mặt omp chưa có; không ghi lại thì
   người sau phải suy ra lại `ModelRuntime` là thứ đang thiếu.
