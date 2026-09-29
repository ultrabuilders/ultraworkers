# Neo sai trong UNKNOWN — 262 mục

Mỗi mục: `cited` (những gì tài liệu đang ghi) và `actual` (chỗ thật, đã đo).
Sửa CHỈ phần `đường/dẫn:số-dòng`. Giữ nguyên mọi văn xuôi quanh nó.

## S1
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** packages/agent/src/telemetry.ts:181
- **actual:** packages/agent/src/telemetry.ts:189

## S2
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** packages/agent/src/telemetry.ts:466
- **actual:** packages/agent/src/telemetry.ts:476

## S3
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** packages/agent/src/telemetry.ts:500
- **actual:** packages/agent/src/telemetry.ts:512

## S4
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** packages/agent/src/telemetry.ts:2100
- **actual:** packages/agent/src/telemetry.ts:2223

## S5
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** packages/agent/src/telemetry.ts:2106
- **actual:** packages/agent/src/telemetry.ts:2229

## S6
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** packages/agent/src/telemetry.ts — "2114 dòng"
- **actual:** packages/agent/src/telemetry.ts = 2237 lines

## S7
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** packages/coding-agent/src/telemetry-export-otlp.ts:399
- **actual:** packages/coding-agent/src/telemetry-export-otlp.ts:25 (import) and :393 (function logAttributeValue(value: unknown): AttributeValue | undefined)

## S8
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** packages/coding-agent/test/extensions-runner.test.ts:5 — cited as the in-repo precedent that `expectTypeOf` is available from bun:test
- **actual:** no such precedent exists — 0 occurrences of expectTypeOf anywhere in omp packages/*/test or packages/*/src

## S9
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** package.json (workspaces.catalog) — step 9/11: version `18.3.3`, and "chèn giữa @oh-my-pi/pi-tui và @oh-my-pi/pi-utils"
- **actual:** version 18.4.0 (all 12 @oh-my-pi/* packages); correct slot is between @oh-my-pi/pi-natives and @oh-my-pi/pi-tui

## S10
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** Bảng "Dependency mới" (scope rewrite) — rows `from "./index.ts"` = 3 and `from "./memory.ts"` = 3
- **actual:** 2 and 2 (16 specifiers total, not 18)

## S11
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** Step 3 + Risks: "TS5097 KHÔNG nổ lên … cổng KHÔNG bắt được sót bước 3"
- **actual:** TS5097 DOES fire — tsgo exits 1 with 'An import path can only end with a .ts extension when allowImportingTsExtensions is enabled' at 7 of the 16 sites

## S12
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** Step 15 / Cổng hoàn thành: `bun --cwd=packages/natives run build` "không chạy được (thiếu ninja)"
- **actual:** ALREADY CORRECTED in the plan at line 2377 by a sibling agent mid-session; my own measurement: build succeeded, Finished `local` profile in 1m 22s, exit 0

## S13
- **work item:** `## 5. telemetry` (plan section `## 6. \`telemetry\``, MILESTONE_1B_EXECUTION_PLAN.md:2197-2383)
- **cited:** Va chạm row: packages/stats "db.ts 74 KB, parser.ts 19 KB, trace.ts 41 KB"
- **actual:** db.ts 60118 B (59 KB), parser.ts 24157 B (24 KB), trace.ts 42520 B (42 KB)

## S14
- **work item:** GAP-M1B-1
- **cited:** scripts/cost.ts (5.3 KB) — 'chép rồi sửa | Cùng danh sách entry. Ngưỡng đọc từ file baseline'
- **actual:** /Users/tranquangdang21/Projects/pi-ref/scripts/cost.ts (183 dong, 5448 B — file TON TAI va khop kich thuoc, nhung noi dung hoan toan khac)

## S15
- **work item:** GAP-M1B-1
- **cited:** scripts/check-entry-graphs.mjs — 'Danh sach entry tro sang packages/coding-agent/src/cli.ts + cac worker selector. O cay nguon file nay khong import gi tu omp, nen ngoai danh sach entry khong co gi de repoint.'
- **actual:** /Users/tranquangdang21/Projects/pi-ref/scripts/check-entry-graphs.mjs (141 dong, 5478 B — file ton tai, dung kich thuoc '5.3 KB')

## S16
- **work item:** GAP-M1B-1
- **cited:** "KHONG lay agent-treeshake-smoke-entry.ts / browser-smoke-entry.ts — chung cham experimental/ ma M1B da loai."
- **actual:** Cả hai file trong /Users/tranquangdang21/Projects/pi-ref/scripts/ (agent-treeshake-smoke-entry.ts 13 dong; browser-smoke-entry.ts 2.1 KB)

## S17
- **work item:** GAP-M1B-1
- **cited:** logger.ts:524 — 'drain buffer vao cay log'
- **actual:** /Users/tranquangdang21/Projects/ultraworkers/packages/utils/src/logger.ts:524 (851 dong) — :524 la dong dau cua docblock JSDoc mo ta spliceModuleLoadBuffer

## S18
- **work item:** GAP-M1B-1
- **cited:** LICENSE — 'hinh mau: packages/omptype/LICENSE' + 'giu Copyright (c) 2025 Mario Zechner la dong DAU'
- **actual:** /Users/tranquangdang21/Projects/ultraworkers/packages/omptype/LICENSE:1-5

## S19
- **work item:** GAP-M1B-1
- **cited:** .oxlintrc.json 'ignorePatterns 24 dong' (rui ro 3 cua GAP-M1B-1 va muc 1 cua GAP-M1B-2)
- **actual:** /Users/tranquangdang21/Projects/ultraworkers/.oxlintrc.json:31-58

## S20
- **work item:** GAP-M1B-2 — Sáu cổng bất biến dependency/packaging: pinned-deps, runtime-deps, lockfile-commit, ts-relative-imports
- **cited:** package.json:91 check:tools — tài liệu nói nối cổng vào cả :90 lẫn :91
- **actual:** package.json:90 check:ts — `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`; đây mới là nơi duy nhất nên nối. package.json:109 `ci:check:full` → `bun run check:ts`, và .github/workflows/ci.yml:190 chạy `bun run ci:check:full`

## S21
- **work item:** GAP-M1B-2 — Sáu cổng bất biến dependency/packaging: pinned-deps, runtime-deps, lockfile-commit, ts-relative-imports
- **cited:** `check-lockfile-commit.mjs` là cổng thứ 4 nối vào `check:ts`; bảng "hình dạng port" gồm 4 script + 1 test
- **actual:** check-lockfile-commit.mjs là git pre-commit hook của pi, KHÔNG phải CI gate: pi package.json `check` chạy check:pinned-deps + check:runtime-deps + check:ts-imports nhưng không có lockfile; grep -rn 'check-lockfile-commit' pi-ref/.github/ → 0 hit; chạy ở pi .husky/pre-commit dòng 'node scripts/check-lockfile-commit.mjs'. Trong omp, script tham chiếu package-lock.json ở dòng 34, 35, 82 nhưng omp KHÔNG có file đó (chỉ bun.lock, Cargo.lock, flake.lock, MODULE.bazel.lock) → dòng 83 process.exit(0) luôn chạy. Đo: EXIT=0.

## S22
- **work item:** GAP-M1B-2 — Sáu cổng bất biến dependency/packaging: pinned-deps, runtime-deps, lockfile-commit, ts-relative-imports
- **cited:** `check-ts-relative-imports` chặn import relative mang `.ts`; cần allowlist 2 hit `.d.ts` tại browser/prelude-definition.ts:5 và computer/prelude-definition.ts:3
- **actual:** check-ts-relative-imports.mjs:38 `isRelativeJavaScriptSpecifier` → `/^\.\.?\//.test(specifier) && /\.js(?:[?#].*)?$/.test(specifier)`; dòng 102 in 'Relative .js imports are not allowed...'. Chạy thật trên omp: EXIT=1, 41 dòng đỏ, `grep -c '\.d\.ts'` trong output = 0. Hai file tài liệu nhắc CÓ xuất hiện nhưng ở browser:7 `./prelude.js` và computer:5 `./prelude.js`. Bằng chứng quyết định: pi-ref/packages có 4943 dòng `from "./x.ts"` mà cổng của pi vẫn xanh.

## S23
- **work item:** GAP-M1B-2 — Sáu cổng bất biến dependency/packaging: pinned-deps, runtime-deps, lockfile-commit, ts-relative-imports
- **cited:** `scripts/check-runtime-deps.mjs` (5095 B) và `check-runtime-deps.test.mjs` (5067 B) — 2 trong 5 file của hình dạng port
- **actual:** check-runtime-deps.mjs:19 `import { getPublicWorkspacePackages } from "./release-packages.mjs";` và release-packages.mjs:3 `import { findPackageDirectories } from "./package-workspaces.mjs";` — hai file này KHÔNG có trong bảng "hình dạng port" nhưng bắt buộc phải chép theo. Ngoài ra cần sửa dòng 38: `isBuiltin(specifier)` từ node:module không biết `bun`, `bun:sqlite`, `bun:ffi`, `bun:jsc` → chạy nguyên bản ra 63 lỗi, 62 là false positive bun, chỉ 1 lỗi thật (legacy-pi-compat.ts:742 omp-legacy-pi-modules).

## S24
- **work item:** GAP-M1B-2 — Sáu cổng bất biến dependency/packaging: pinned-deps, runtime-deps, lockfile-commit, ts-relative-imports
- **cited:** `.oxlintrc.json` — `ignorePatterns` "24 dòng sẵn có"
- **actual:** ignorePatterns mở ở dòng 31, đóng ở dòng 58; 26 entry nằm ở dòng 32–57. Đếm bằng python json.load → 26.

## S25
- **work item:** GAP-M1B-2 — Sáu cổng bất biến dependency/packaging: pinned-deps, runtime-deps, lockfile-commit, ts-relative-imports
- **cited:** grep `pinned-deps|check-pinned|check-runtime-deps|lockfile-commit|ts-relative-imports` trên package.json .github/ scripts/ trả 0 — và ngầm định 4 script chạy được trên cây omp
- **actual:** grep trả 0 hit (đúng). NHƯNG chạy script thật: check-pinned-deps.mjs nguyên bản → EXIT=1, 152 dòng đỏ, 134 là `found catalog:` (vì omp dùng Bun workspace catalog — 127 occurrences `catalog:`, ví dụ package.json:182 `"typescript": "catalog:"`, và check-pinned-deps.mjs:30 `isNonRegistrySpecifier` không khớp `catalog:`). 18 lỗi còn lại là nợ pin thật. Ngoài ra dòng 26 `name.startsWith("@earendil-works/pi-")` phải đổi thành `@oh-my-pi/` chứ không phải `@oh-my-pi/pi-` — 6/16 package omp không bắt đầu bằng `pi-` (browser-relay, collab-web, omptype, snapcompact, omp-stats, typescript-edit-benchmark).

## S26
- **work item:** GAP-M1B-3
- **cited:** BPI_EXECVE (work item: cờ tương đương BPI_EXECVE, mục "Cái được bảo toàn" và "Cần người quyết")
- **actual:** /Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/bun/restore-sandbox-env.ts:20-23 (guards) và :25-35 (try/catch)

## S27
- **work item:** GAP-M1B-3
- **cited:** "Không có file test nào đi kèm ở phía pi cho hai file này" (mục Hợp đồng test)
- **actual:** /Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/test/restore-sandbox-env.test.ts:1-77

## S28
- **work item:** GAP-M1B-3
- **cited:** "dòng Zechner phải nằm ĐẦU" + hình mẫu `packages/omptype/LICENSE` (bảng File cần chạm tới, khối Xác minh, mục Rủi ro)
- **actual:** /Users/tranquangdang21/Projects/ultraworkers/packages/utils/LICENSE:1-4 — không có Zechner. Zechner chỉ ở LICENSE:3, packages/{coding-agent,tui,agent,ai}/LICENSE:3, packages/coding-agent/src/tools/browser/relay/extension-assets/LICENSE.txt:3

## S29
- **work item:** GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import
- **cited:** packages/ai/src/stream.ts:29 — `import { streamGitLabDuo } from "./providers/gitlab-duo";`
- **actual:** packages/ai/src/stream.ts:29 — nội dung khớp nguyên văn

## S30
- **work item:** GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import
- **cited:** packages/ai/src/stream.ts:30 — `import { …, streamGitLabDuoWorkflow } from "./providers/gitlab-duo-workflow";`
- **actual:** packages/ai/src/stream.ts:30 — `import { type GitLabDuoWorkflowOptions, streamGitLabDuoWorkflow } from "./providers/gitlab-duo-workflow";`

## S31
- **work item:** GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import
- **cited:** packages/ai/src/stream.ts:32 — `import { getVertexAccessToken } from "./providers/google-auth";`
- **actual:** packages/ai/src/stream.ts:32 — nội dung khớp nguyên văn

## S32
- **work item:** GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import
- **cited:** packages/ai/src/stream.ts:35 — `import { streamKimi } from "./providers/kimi";`
- **actual:** packages/ai/src/stream.ts:35 — nội dung khớp nguyên văn

## S33
- **work item:** GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import
- **cited:** `api-registry.ts` + `getCustomApi` — "kỹ thuật lazy-loading CÓ SẴN trong omp"
- **actual:** packages/ai/src/api-registry.ts:90-92 — thân hàm là `return customApiRegistry.get(api);`, một Map.get thuần, KHÔNG lazy gì

## S34
- **work item:** GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import
- **cited:** "Hình dạng port — LÀM MỚI, không chép. Không có tệp nào ở `pi` để chép cho riêng mảng này"
- **actual:** /Users/tranquangdang21/Projects/pi-ref/packages/ai/src/api/lazy.ts:46-61 (`lazyStream`) + 13 file api/*.lazy.ts dùng `lazyApi(() => import(...))`

## S35
- **work item:** GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import
- **cited:** "`register-builtins` | — | sửa | Cũng value-import hơn 12 provider" và "đề xuất: dùng đúng một chỗ tập trung (registry.ts) để phạm vi ngoại lệ là MỘT file"
- **actual:** packages/ai/src/registry/hooks/{api-key,custom,oauth-code,device-code}.ts — 22 chỗ `() => import(` đã tồn tại TRƯỚC khi mục này bắt đầu

## S36
- **work item:** GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import
- **cited:** "cổng entry-graph của GAP-M1B-1 chạy với con số tốt hơn baseline" (phụ thuộc cứng)
- **actual:** scripts/check-entry-graphs.mjs và scripts/cost.ts KHÔNG tồn tại; `grep -rniE 'entry.?graph|bundle.?budget|startup.?budget|graph.?cost' package.json scripts/ .github/` → 0 hit

## S37
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:518 (#managedTimers declaration)
- **actual:** src/extensibility/extensions/runner.ts:522

## S38
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:411 (clearManagedTimers() call)
- **actual:** src/extensibility/extensions/runner.ts:415

## S39
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:1336-1337 (clearManagedTimers definition)
- **actual:** src/extensibility/extensions/runner.ts:1365-1366

## S40
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:947-969 (setSuspendedExtensions)
- **actual:** src/extensibility/extensions/runner.ts:976-1000; the if (suspend) branch is at 986-988

## S41
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:779 and :798 (suspended-extension gates in the two file trampolines)
- **actual:** src/extensibility/extensions/runner.ts:783 and :802

## S42
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:780 and :799 (const ctx = this.createContext() in the two file trampolines)
- **actual:** src/extensibility/extensions/runner.ts:784 and :803

## S43
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:1242 (createContext signature)
- **actual:** src/extensibility/extensions/runner.ts:1270-1277

## S44
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:1304-1306 (ownerless setInterval/setTimeout/clearTimer arrow properties)
- **actual:** src/extensibility/extensions/runner.ts:1333-1335

## S45
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:1350-1352 (createCommandContext spread)
- **actual:** src/extensibility/extensions/runner.ts:1379-1381

## S46
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:1375 (#runHandlerWithTimeout declaration)
- **actual:** src/extensibility/extensions/runner.ts:1404-1412

## S47
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:1405-1408 (createHandlerContext call inside #runHandlerWithTimeout)
- **actual:** src/extensibility/extensions/runner.ts:1434-1438

## S48
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:927-929 (getExtensionPaths)
- **actual:** src/extensibility/extensions/runner.ts:956-958

## S49
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts:230-241 (createHandlerContext)
- **actual:** src/extensibility/extensions/runner.ts:233-244

## S50
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts: 'createContext() has 15 call sites' and 'grep -n ... | wc -l must still print 15'
- **actual:** 16 call sites at runner.ts:784, 803, 921, 1381, 1507, 1519, 1558, 1616, 1673, 1704, 1745, 1767, 1848, 1884, 1909, 1966 — the extra one is a new emitCacheWarmingDecision method (916-933) added by the upstream sync. The diff-validity gate expecting 15 will fail on correct work.

## S51
- **work item:** WI-1
- **cited:** src/extensibility/extensions/runner.ts: '#runHandlerWithTimeout is called from 12 points'
- **actual:** 13 call sites — the 12 the plan lists plus a new one at 923 inside emitCacheWarmingDecision

## S52
- **work item:** WI-1
- **cited:** src/extensibility/extensions/types.ts:1802-1817 (interface Extension) and :1803-1804 (path/resolvedPath)
- **actual:** src/extensibility/extensions/types.ts:1827-1842; path is 1828, resolvedPath is 1829

## S53
- **work item:** WI-1
- **cited:** src/extensibility/extensions/types.ts:516 and :522 (ExtensionContext.setInterval/setTimeout)
- **actual:** src/extensibility/extensions/types.ts:518 and :524 — same content, +2 lines

## S54
- **work item:** WI-1
- **cited:** src/extensibility/extensions/types.ts:1589 (export interface ProviderConfig)
- **actual:** src/extensibility/extensions/types.ts:1614

## S55
- **work item:** WI-1
- **cited:** src/session/agent-session.ts:7378, 7396, 7494 (createCommandContext call sites to thread owner from)
- **actual:** src/session/agent-session.ts:7524 (#tryExecuteExtensionCommand, real command path), 7540-7542 (#createCommandContext runner-less fallback — needs no owner), 7640 (#tryExecuteCustomCommand — custom/MCP commands, needs no owner). More importantly: RegisteredCommand (types.ts:1251-1256) has NO owner field at all, so 7524 cannot be threaded as written; only ExtensionShortcut (types.ts:1718 extensionPath) can.

## S56
- **work item:** WI-1
- **cited:** packages/coding-agent/src/sdk.ts:4566 (reconcileExtensionSources), :4571 (resetCapabilities), :4573-4576 (discover await), :4579-4581 (setSuspendedExtensions)
- **actual:** src/sdk.ts:4602 (function), 4607 (resetCapabilities), 4608-4611 (Promise.all discover), 4615-4617 (setSuspendedExtensions)

## S57
- **work item:** WI-1
- **cited:** packages/coding-agent/src/sdk.ts:2487-2492 (session drain block)
- **actual:** src/sdk.ts:2500-2505; the enclosing `if (!restrictToolNames)` guard opens at 2493 and closes at 2499, so the drain stays OUTSIDE the guard as the plan requires

## S58
- **work item:** WI-1
- **cited:** packages/coding-agent/src/sdk.ts:1493 (createAgentSessionScoped) and :3074 (new ExtensionRunner)
- **actual:** src/sdk.ts:1505 (createAgentSessionScoped) and 3087 (new ExtensionRunner)

## S59
- **work item:** WI-1
- **cited:** test/extensions-runner.test.ts:3956-4070 (four 'managed timers' cases) and their createContext calls at 3970, 4002, 4025, 4052
- **actual:** test/extensions-runner.test.ts:3868-3980; the createContext() calls are at 3882, 3911, 3935, 3963. Ran the suite at HEAD: 4 pass, 0 fail.

## S60
- **work item:** WI-1
- **cited:** Plan claim: 'git diff --stat of commit 1 must touch exactly 2 files' (Effort says 3); plan claim: files_touched lists no agent-session.ts
- **actual:** 3 production files are required, not 2: managed-timers.ts, runner.ts, AND src/session/agent-session.ts. Line 7607-7609 of agent-session.ts is a FIFTH ManagedTimers call site (backed by its own #fallbackExtensionTimers instance declared at 868, created lazily at 7614-7619, cleared at 5289) for the runner-less SDK context. Adding the leading owner param makes those three lines fail to compile. Plan's 6-file files_touched table omits this file entirely.

## S61
- **work item:** WI-1
- **cited:** Plan claim: COMMIT 2 adding a required `registeredProviders` field to Extension breaks only out-of-repo Extension construction
- **actual:** Two in-repo test files construct Extension object literals directly and will fail to compile: test/sdk-credential-disabled-bridge.test.ts:435 and test/extensions-runner.test.ts:4074. Both need `registeredProviders: []` added. Plan does not mention either.

## S62
- **work item:** WI-1
- **cited:** Plan claim: 'HEAD is 808b365' and its entire correction table (measured there)
- **actual:** HEAD is 65cc6c1 on branch milestone-1. Commit f804d66 ('Sync from upstream omp 18.4.0') touched runner.ts (+29), types.ts (+27), wrapper.ts and sdk.ts (+44) after 808b365, which is why nearly every anchor drifted a second time.

## S63
- **work item:** WI-1
- **cited:** Plan claim: 'bun test reports 0 pass because the pi_natives addon is not built'
- **actual:** The addon IS already built at packages/natives/native/pi_natives.darwin-arm64.node, so tests run for real: `bun test test/extensions-runner.test.ts -t "managed timers"` returned 4 pass, 0 fail, 83 filtered out. The build step is still correct advice for a fresh machine, but the 0-pass failure mode does not reproduce here.

## S64
- **work item:** WI-3
- **cited:** extensions/runner.ts:347 — `type RunnerEmitEvent = Exclude<`
- **actual:** extensions/runner.ts:350

## S65
- **work item:** WI-3
- **cited:** extensions/runner.ts:361, 371, 1364, 1372, 1464 — các chỗ dùng RunnerEmitEvent
- **actual:** runner.ts:365, 375, 1393, 1401, 1493

## S66
- **work item:** WI-3
- **cited:** agent-session.ts:4602-4747 — method #emitExtensionEvent
- **actual:** agent-session.ts:4642-4787

## S67
- **work item:** WI-3
- **cited:** agent-session.ts:4604, 4611, 4615, 4622, 4631, 4637, 4644, 4657, 4666, 4675, 4684, 4690, 4700, 4709, 4717, 4725, 4731, 4733, 4740 — 19 phép so sánh event.type ===
- **actual:** agent-session.ts:4644, 4651, 4655, 4662, 4671, 4677, 4684, 4697, 4706, 4715, 4724, 4730, 4740, 4749, 4757, 4765, 4771, 4773, 4780

## S68
- **work item:** WI-3
- **cited:** agent-session.ts:9523-9527 — comment về model_changed
- **actual:** agent-session.ts:9669-9673 (dòng 9674 là `if (isChanging) {`)

## S69
- **work item:** WI-3
- **cited:** agent-session.ts:837 và :849 — #extensionRunner / #turnIndex
- **actual:** agent-session.ts:857 và :869

## S70
- **work item:** WI-3
- **cited:** agent-session.ts:139-156 — khối import type từ ../extensibility/extensions
- **actual:** agent-session.ts:139-158

## S71
- **work item:** WI-3
- **cited:** agent-session.ts:4561 — `turn_id: Math.max(0, this.#turnIndex - 1)`
- **actual:** agent-session.ts:4601

## S72
- **work item:** WI-3
- **cited:** agent-session.ts:4538-4544 — #emitAgentEndNotification
- **actual:** agent-session.ts:4578-4584

## S73
- **work item:** WI-3
- **cited:** agent-session.ts:612-630 — cloneMessageEndNotification
- **actual:** agent-session.ts:642-650 (helper field `…Field` ở 630-639)

## S74
- **work item:** WI-3
- **cited:** agent-session.ts:1916-1920 — cầu nối GoalRuntimeHost.emit
- **actual:** agent-session.ts:1948-1952

## S75
- **work item:** WI-3
- **cited:** agent-session.ts:6159 — setGoalModeState
- **actual:** agent-session.ts:6296-6298

## S76
- **work item:** WI-3
- **cited:** extensions/types.ts:1147 — GoalUpdatedEvent trong union ExtensionEvent
- **actual:** union bắt đầu types.ts:1140; GoalUpdatedEvent ở types.ts:1168

## S77
- **work item:** WI-3
- **cited:** test/agent-session-aside-delivery.test.ts:890-935 — khung dựng session cho test mới
- **actual:** agent-session-aside-delivery.test.ts:887-932

## S78
- **work item:** WI-3
- **cited:** test/agent-session-aside-delivery.test.ts:29-47 — beforeEach/afterEach teardown
- **actual:** agent-session-aside-delivery.test.ts:36-45

## S79
- **work item:** WI-3
- **cited:** git HEAD `808b365` — mọi số dòng đặc tả kiểm chứng trên đó
- **actual:** 65cc6c1 ("test(coding-agent): opt in explicitly where the suite is about parsing")

## S80
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/session/agent-session.ts:112
- **actual:** packages/coding-agent/src/session/agent-session.ts:113

## S81
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/session/agent-session.ts:5435
- **actual:** packages/coding-agent/src/session/agent-session.ts:5563

## S82
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/session/agent-session.ts:5820
- **actual:** packages/coding-agent/src/session/agent-session.ts:5948

## S83
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/session/agent-session.ts:8811
- **actual:** packages/coding-agent/src/session/agent-session.ts:8957

## S84
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/session/session-tools.ts:1557
- **actual:** packages/coding-agent/src/session/session-tools.ts:1712

## S85
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/main.ts:871 (kể cả bản đính chính đã sửa thành :872)
- **actual:** packages/coding-agent/src/main.ts:880

## S86
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/sdk.ts:4565 (đính chính: :4571)
- **actual:** packages/coding-agent/src/sdk.ts:4607

## S87
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/sdk.ts:4560-4624 (đính chính: hàm mở ở :4566)
- **actual:** packages/coding-agent/src/sdk.ts:4602

## S88
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/sdk.ts:4579 (đính chính: setSuspendedExtensions mở ở :4579, đóng :4581)
- **actual:** packages/coding-agent/src/sdk.ts:4615-4617

## S89
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/sdk.ts:3528
- **actual:** packages/coding-agent/src/sdk.ts:3541

## S90
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/config/model-registry.ts:2913 (bảng đính chính nói '2913 là method open, 2914 là dấu ngoặc mở')
- **actual:** packages/coding-agent/src/config/model-registry.ts:2914

## S91
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1570
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1595

## S92
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1743
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1768

## S93
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** (plan không nêu — KHÔNG có trong bảng file)
- **actual:** packages/coding-agent/src/discovery/index.ts:70

## S94
- **work item:** WI-5 — Capability registry có chủ sở hữu, có unregister, và có một reset thật sự (MILESTONE_2_EXECUTION_PLAN.md:1997-2252)
- **cited:** (plan không nêu — plan chỉ grep trong src/)
- **actual:** packages/coding-agent/test/extension-dashboard-mcp-parity.test.ts:19

## S95
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:725-789 (chuỗi 25 nhánh isToolAllowed, plan tự đánh dấu STALE)
- **actual:** packages/coding-agent/src/tools/index.ts:738-800

## S96
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:731-793
- **actual:** packages/coding-agent/src/tools/index.ts:738-800

## S97
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:611 (BuiltinToolPlan.isAllowed)
- **actual:** packages/coding-agent/src/tools/index.ts:618

## S98
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:806 (object được trả về)
- **actual:** packages/coding-agent/src/tools/index.ts:813

## S99
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:554 (BUILTIN_TOOLS: Record<BuiltinToolName, ToolFactory>)
- **actual:** packages/coding-agent/src/tools/index.ts:561

## S100
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:593 (export type ToolName)
- **actual:** packages/coding-agent/src/tools/index.ts:600

## S101
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:600-602 (SETTINGS_GATED_BUILTIN_TOOL_NAMES)
- **actual:** packages/coding-agent/src/tools/index.ts:607-609

## S102
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:799 (cổng name in BUILTIN_TOOLS)
- **actual:** packages/coding-agent/src/tools/index.ts:806

## S103
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:801 (lần gọi thứ hai của isToolAllowed)
- **actual:** packages/coding-agent/src/tools/index.ts:808

## S104
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:794-796 (requestedTools.push("yield"))
- **actual:** packages/coding-agent/src/tools/index.ts:802-803

## S105
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:902 (ràng buộc isMountableUnderXdev)
- **actual:** packages/coding-agent/src/tools/index.ts:909

## S106
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:719-730 (các lần mutate requestedTools trước chain)
- **actual:** packages/coding-agent/src/tools/index.ts:719-737

## S107
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:737-741 (nhánh goal)
- **actual:** packages/coding-agent/src/tools/index.ts:744-748

## S108
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:759-760 (context_notes / new_context)
- **actual:** packages/coding-agent/src/tools/index.ts:766-767

## S109
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:761-765 (checkpoint / rewind)
- **actual:** packages/coding-agent/src/tools/index.ts:768-772

## S110
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:766-772 (wait)
- **actual:** packages/coding-agent/src/tools/index.ts:773-779

## S111
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:777-781 (manage_skill)
- **actual:** packages/coding-agent/src/tools/index.ts:784-788

## S112
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:782-788 (learn)
- **actual:** packages/coding-agent/src/tools/index.ts:789-795

## S113
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts:789-791 (task)
- **actual:** packages/coding-agent/src/tools/index.ts:796-798

## S114
- **work item:** WI-6
- **cited:** packages/coding-agent/src/sdk.ts:1161 (SESSION_MANAGED_BUILTIN_TOOL_NAMES)
- **actual:** packages/coding-agent/src/sdk.ts:1173

## S115
- **work item:** WI-6
- **cited:** packages/coding-agent/src/sdk.ts:3350 (consumer gọi plan.isAllowed trong đường reconcile settings)
- **actual:** packages/coding-agent/src/sdk.ts:3363

## S116
- **work item:** WI-6
- **cited:** packages/coding-agent/src/tools/index.ts 'đã dài 966 dòng' (số dòng file plan nêu khi biện minh tách module)
- **actual:** packages/coding-agent/src/tools/index.ts — 973 dòng

## S117
- **work item:** WI-7
- **cited:** packages/coding-agent/src/tools/write.ts:814 — plan mô tả là site 'truyền { op: "update" }'
- **actual:** packages/coding-agent/src/tools/write.ts:814 — `op: resolvedArchivePath.exists ? "update" : "create"` (một ternary, không phẳng)

## S118
- **work item:** WI-7
- **cited:** packages/coding-agent/src/modes/interactive-mode.ts:908-915 — plan nói đây là 7 field boolean
- **actual:** :913 là `planModePlanFilePath: string | undefined = undefined;` — không phải boolean, nằm xen giữa dải

## S119
- **work item:** WI-7
- **cited:** packages/coding-agent/src/modes/interactive-mode.ts:3750-3753 — #updatePlanModeStatus
- **actual:** :3762-3772; `this.statusLine.setPlanModeStatus(status)` ở :3770 (lệch +12)

## S120
- **work item:** WI-7
- **cited:** packages/coding-agent/src/session/agent-session.ts:6132 — getPlanModeState
- **actual:** :6269 (lệch +137)

## S121
- **work item:** WI-7
- **cited:** packages/coding-agent/src/session/agent-session.ts:6137 — getPrewalkState
- **actual:** :6274 (lệch +137)

## S122
- **work item:** WI-7
- **cited:** packages/coding-agent/src/session/agent-session.ts:6155 — getGoalModeState
- **actual:** :6292 (lệch +137)

## S123
- **work item:** WI-7
- **cited:** packages/coding-agent/src/session/agent-session.ts:6163 — getVibeModeState
- **actual:** :6300 (lệch +137)

## S124
- **work item:** WI-7
- **cited:** packages/coding-agent/src/session/agent-session.ts:5852 — codeModeNamespacesInfo
- **actual:** :5980 (lệch +128)

## S125
- **work item:** WI-7
- **cited:** packages/coding-agent/src/session/agent-session.ts:1395 — #codeModeState
- **actual:** :1416 (lệch +21)

## S126
- **work item:** WI-7
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1256-1582 — interface ExtensionAPI
- **actual:** :1277-1607 (lệch +21/+25)

## S127
- **work item:** WI-7
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1347 — registerTool (khuôn mẫu)
- **actual:** :1372 (lệch +25)

## S128
- **work item:** WI-7
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1411 — registerCommand
- **actual:** :1436 (lệch +25)

## S129
- **work item:** WI-7
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1430 — registerFlag
- **actual:** :1455 (lệch +25)

## S130
- **work item:** WI-7
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1501 — setActiveTools
- **actual:** :1526 (lệch +25)

## S131
- **work item:** WI-7
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1376 — lần xuất hiện duy nhất của ctx.ui
- **actual:** :1401 (lệch +25)

## S132
- **work item:** WI-7
- **cited:** packages/coding-agent/test/tools/plan-mode-guard-local.test.ts:90-127 — 'cả năm khẳng định'
- **actual:** :86-114 (describe ở :83, describe kế tiếp bắt đầu :122); thực tế có SÁU nhóm khẳng định chứ không phải năm

## S133
- **work item:** WI-7
- **cited:** packages/coding-agent/src/modes/status-line-host.ts — plan ghi đây là nơi luồn mode đã resolve vào để segment thấy
- **actual:** file chỉ dựng `export const statusLineHost: StatusLineHost<...>` — object POLICY, không có SegmentContext. SegmentContext thật sự dựng ở packages/tui/src/status-line/component.ts:2108 (#buildSegmentContext, field mode :2185-2193, setter :855/:867/:881/:893) — file này KHÔNG có trong bảng "File cần chạm tới" của plan

## S134
- **work item:** WI-7
- **cited:** Mục MÔI TRƯỜNG: 'bun run check:ts PASS (exit 0) ... cây làm việc hiện SẠNH ... cổng này XANH và đi hết tới check:types'
- **actual:** ĐỎ. `bun run check:ts` dừng ở check:tools: oxfmt báo 'Format issues found in above 2 files' cho packages/tui/src/tools/index.ts và packages/tui/test/probe-frozen.test.ts (cả hai là sửa đổi chưa commit ngoài phạm vi WI-7). Chưa tới được check:types.

## S135
- **work item:** WI-8a — Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)
- **cited:** packages/utils/src/dirs.ts:652 (cho getPluginsLockfile)
- **actual:** packages/utils/src/dirs.ts:662 — `export function getPluginsLockfile(home?: string): string {` / :663 `return path.join(getPluginsDir(home), "omp-plugins.lock.json");`. Dòng :652 thực tế là `getPluginsNodeModules`.

## S136
- **work item:** WI-8a — Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)
- **cited:** packages/utils/src/dirs.ts:1046 (cho getProjectPluginOverridesPath)
- **actual:** packages/utils/src/dirs.ts:1066 — `export function getProjectPluginOverridesPath(cwd: string = getProjectDir()): string {` / :1067 `return path.join(getProjectAgentDir(cwd), "plugin-overrides.json");`. Dòng :1046 là `const registryPath = dirs.rootSubdir("marketplaces.json", "data");` bên trong getMarketplacesRegistryPath.

## S137
- **work item:** WI-8a — Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)
- **cited:** package.json:94 (cho script check:ts)
- **actual:** package.json:90 — `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",`. Dòng :94 là `"lint:ts"`.

## S138
- **work item:** WI-8a — Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)
- **cited:** packages/coding-agent/CHANGELOG.md:3 — "hiện KHÔNG có mục con nào, nên `### Changed` phải được TẠO MỚI ngay dưới nó (mục kế tiếp là `## [18.3.3]` ở :5)"
- **actual:** packages/coding-agent/CHANGELOG.md:3 `## [Unreleased]`, :5 `### Security`, :7 entry Security, :9 `## [18.4.0] - 2026-09-28`. Không có `## [18.3.3]` ở đâu trong file.

## S139
- **work item:** WI-8a — Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)
- **cited:** packages/coding-agent/test/config/ "đã tồn tại với 7 file anh em"
- **actual:** packages/coding-agent/test/config/ chứa 6 file: compaction-threshold.test.ts, model-registry.test.ts, models-config-validation.test.ts, settings-panel-clear.test.ts, settings-registry.test.ts, settings-reload.test.ts

## S140
- **work item:** WI-8a — Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)
- **cited:** packages/coding-agent/src/extensibility/plugins/loader.ts:474-483
- **actual:** packages/coding-agent/src/extensibility/plugins/loader.ts dài 482 dòng; hàm `getPluginSettings` khai ở :474, đóng ngoặc ở :482 là dòng CUỐI file.

## S141
- **work item:** WI-8a — Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)
- **cited:** "Môi trường: `bun test` cần addon native; trạng thái trước khi build: `bun test test/config/settings-registry.test.ts` trả về `0 pass / 1 fail` với `Cannot find module .../pi_natives.darwin-arm64.node`"
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node tồn tại. `bun test test/config/settings-registry.test.ts` → 18 pass / 0 fail. `bun test test/plugin-config.test.ts test/plugin-config-validate.test.ts` → 9 pass / 0 fail.

## S142
- **work item:** WI-8a — Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)
- **cited:** Đính chính: "loader.ts:474-483 ... là bản sao từng byte của phép trộn `{ ...global, ...project }` trên đúng hai file legacy đó"
- **actual:** manager.ts:154 `getProjectPluginOverridesPath(this.#cwd)` → dirs.ts:1066 → dirs.ts:599-601 getProjectAgentDir = <cwd>/.omp. loader.ts:62 `getConfigDirPaths("plugin-overrides.json", { user: false, cwd })` → config.ts:162 → vòng lặp PROJECT_CONFIG_BASES (config.ts:90-93) dựng từ priorityList (config.ts:11-16) = 4 base.

## S143
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** MILESTONE_2_EXECUTION_PLAN.md:4379 + :4479 — 'expected: 808b365'
- **actual:** 65cc6c1

## S144
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1256 (ExtensionAPI)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1277

## S145
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:663 (mcpServerName)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:665

## S146
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:665 (mcpToolName)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:667

## S147
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:658 (ToolDefinition.approval)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:660 (doc comment :658-659 says 'Defaults to "exec" when omitted.')

## S148
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:672 (sourcePath)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:674

## S149
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:711 (SourceInfo.source doc comment)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:719

## S150
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:904 and :904-916 (McpNotificationEvent)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:924-936 (type: :925, server: :931, method: :933, params: :935)

## S151
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1149 (merge into the event map)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1170

## S152
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1340 (on(event: "mcp_notification"))
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1365

## S153
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1290-1340 (the event overload block)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1365 is the block's last member (block starts near the Module Access banner at :1279)

## S154
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1347 (registerTool)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1372

## S155
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1379 (registerFileWriteFallback)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1404

## S156
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1411 (registerCommand)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1436

## S157
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1421 (registerShortcut)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1446

## S158
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1430 (registerFlag)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1455

## S159
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:494 and :561 (isProjectTrusted declarations)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:496 and :563

## S160
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** MILESTONE_2_EXECUTION_PLAN.md:4371 and :4561 — 'file dài 1849 dòng; độ trôi +25 áp dụng cho mọi neo của file này'
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts is 1874 lines, and the drift is NOT uniform: +2 in ToolDefinition, +20/+21 in the event region, +25 in the ExtensionAPI register block

## S161
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1264 (isProjectTrusted: () => true)
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:1293

## S162
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/session/agent-session.ts:7406 (isProjectTrusted: () => true)
- **actual:** packages/coding-agent/src/session/agent-session.ts:7552

## S163
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** docs/extensions.md:392 (the mcp_notification bullet)
- **actual:** docs/extensions.md:393 (heading '### MCP notifications' at :391; :392 is a blank line)

## S164
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** docs/mcp-config.md:484-495 (Discovery and precedence ordered list)
- **actual:** docs/mcp-config.md:484 (heading '## Discovery and precedence') is correct; the list itself is :488-496, with '2. OMP extension packages' at :489

## S165
- **work item:** WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ, M2 không build)
- **cited:** packages/coding-agent/src/mcp/loader.ts:92-107 (the 'mcp:<server> via <providerName>' format)
- **actual:** packages/coding-agent/src/mcp/loader.ts:106 (comment at :105; block starts :93)

## S166
- **work item:** WI-13
- **cited:** runner.ts:424-425
- **actual:** runner.ts:428-429

## S167
- **work item:** WI-13
- **cited:** runner.ts:415 (noOpUIContext khai báo)
- **actual:** runner.ts:419

## S168
- **work item:** WI-13
- **cited:** runner.ts:459 (#uiContext)
- **actual:** runner.ts:463

## S169
- **work item:** WI-13
- **cited:** runner.ts:640 (fallback constructor)
- **actual:** runner.ts:644

## S170
- **work item:** WI-13
- **cited:** runner.ts:740 (fallback lúc init)
- **actual:** runner.ts:744

## S171
- **work item:** WI-13
- **cited:** runner.ts:758 (comment 'createContext() takes no extension argument')
- **actual:** runner.ts:762

## S172
- **work item:** WI-13
- **cited:** runner.ts:756-777 (khối comment trampoline)
- **actual:** runner.ts:760-779

## S173
- **work item:** WI-13
- **cited:** runner.ts:780 (trampoline 1)
- **actual:** runner.ts:784

## S174
- **work item:** WI-13
- **cited:** runner.ts:799 (trampoline 2)
- **actual:** runner.ts:803

## S175
- **work item:** WI-13
- **cited:** runner.ts:919-921 (getUIContext)
- **actual:** runner.ts:948-949

## S176
- **work item:** WI-13
- **cited:** runner.ts:923-925 (hasUI)
- **actual:** runner.ts:952-953

## S177
- **work item:** WI-13
- **cited:** runner.ts:927-929 (getExtensionPaths)
- **actual:** runner.ts:956-958

## S178
- **work item:** WI-13
- **cited:** runner.ts:1242 (createContext)
- **actual:** runner.ts:1271

## S179
- **work item:** WI-13
- **cited:** runner.ts:1255 (ui: this.#uiContext)
- **actual:** runner.ts:1284

## S180
- **work item:** WI-13
- **cited:** runner.ts:1963 (độ dài file)
- **actual:** runner.ts: 1992 dòng

## S181
- **work item:** WI-13
- **cited:** session/agent-session.ts:540-541
- **actual:** agent-session.ts:558-559

## S182
- **work item:** WI-13
- **cited:** session/agent-session.ts:518 (khai báo noOpUIContext)
- **actual:** agent-session.ts:536

## S183
- **work item:** WI-13
- **cited:** session/agent-session.ts:7400 (dùng noOpUIContext)
- **actual:** agent-session.ts:7546

## S184
- **work item:** WI-13
- **cited:** session/agent-session.ts:7407-7408 (comment)
- **actual:** agent-session.ts:7553-7554

## S185
- **work item:** WI-13
- **cited:** interactive-mode.ts:6020 (call site thứ 5 của clearHookWidgets)
- **actual:** interactive-mode.ts:6034

## S186
- **work item:** WI-13
- **cited:** interactive-mode.ts:6269-6270 (initializeHookRunner)
- **actual:** interactive-mode.ts:6283-6284

## S187
- **work item:** WI-13
- **cited:** interactive-mode.ts:6273 (setEditorComponent)
- **actual:** interactive-mode.ts:6287

## S188
- **work item:** WI-13
- **cited:** types.ts:205 (WidgetPlacement)
- **actual:** types.ts:207

## S189
- **work item:** WI-13
- **cited:** types.ts:235 (interface ExtensionUIContext)
- **actual:** types.ts:237

## S190
- **work item:** WI-13
- **cited:** types.ts:264 (setStatus)
- **actual:** types.ts:266

## S191
- **work item:** WI-13
- **cited:** types.ts:270 (setWidget)
- **actual:** types.ts:272

## S192
- **work item:** WI-13
- **cited:** types.ts:273 (JSDoc setFooter)
- **actual:** types.ts:274 (chữ ký ở :275)

## S193
- **work item:** WI-13
- **cited:** types.ts:276 (setHeader)
- **actual:** types.ts:277 (JSDoc) / :278 (chữ ký)

## S194
- **work item:** WI-13
- **cited:** types.ts:329-331 (setEditorComponent)
- **actual:** types.ts:331-333

## S195
- **work item:** WI-13
- **cited:** types.ts:464 (hasUI: boolean)
- **actual:** types.ts:466 — nằm trong ExtensionContext (khai báo :454), KHÔNG phải ExtensionUIContext (:237)

## S196
- **work item:** WI-13
- **cited:** test/modes/controllers/extension-ui-controller.test.ts: 525 dòng
- **actual:** 509 dòng

## S197
- **work item:** WI-13
- **cited:** CHANGELOG.md: '## [Unreleased] rỗng, nằm trên ## [18.3.3] - 2026-09-27'
- **actual:** CHANGELOG.md:3 có ### Security với một mục ở :7; nằm trên ## [18.4.0] - 2026-09-28 ở :9. Không có ### Fixed nào dưới [Unreleased] — phải tạo mới.

## S198
- **work item:** WI-13
- **cited:** packages/tui/src/prompt/composer.ts:822 (setHeaderExtras)
- **actual:** composer.ts:823

## S199
- **work item:** WI-13
- **cited:** 'Cả bốn site tiêu thụ (runner.ts, agent-session.ts, acp-agent.ts, extension-ui-controller.ts) đã import barrel extensibility/extensions'
- **actual:** SAI với runner.ts: index.ts chứa `export * from "./runner";` nên runner.ts LÀ nguồn của barrel, dùng import anh em (./managed-timers, ./model-api) và không thể import chính nó. Ba site kia đúng: extension-ui-controller.ts:24, acp-agent.ts:54, agent-session.ts:158-159.

## S200
- **work item:** WI-13
- **cited:** 'File extension-ui-controller.test.ts là nơi DUY NHẤT trong cây biết dựng ExtensionUiController — sáu file test khác chỉ import nó, không dựng'
- **actual:** SAI: `new ExtensionUiController` ở 10 chỗ trên 6 file test KHÁC — btw-session-lifecycle.test.ts:283, hook-editor.test.ts:451,481,523,559,584, repro-issue-1955-sendmessage-double-render.test.ts:164, repro-issue-1020-ctx-shutdown.test.ts:75, collab/guest-ui-request.test.ts:840

## S201
- **work item:** WI-13
- **cited:** runner.ts: '~12 existing call sites createContext()'
- **actual:** 16 call site `this.createContext(` trong runner.ts

## S202
- **work item:** WI-13
- **cited:** Đăng ký RƯỚC của PR 2: 'PR 2 ship KHÔNG có test cho hành vi chủ sở hữu, theo thiết kế'
- **actual:** SAI — cổng này luôn xanh. Đã chứng minh bằng probe: ctx stub ở extension-ui-controller.test.ts:44-65 thiếu hookWidgetContainerAbove/Below, thêm vào là mở khoá test sở hữu. Đo trên HEAD: BEFORE setWidget = [EditorTopGap, Container[Text]], AFTER clearHookWidgets = [EditorTopGap] — widget biến mất. Đã viết lại cổng thành 5 mệnh đề, (ii) và (iii) đỏ trên HEAD.

## S203
- **work item:** WI-13
- **cited:** Bước 1: 'git rev-parse --short HEAD trả về 808b365'
- **actual:** HEAD = 65cc6c1, sau f804d66 'Sync from upstream omp 18.4.0 (167 commits, squashed)'. Mọi neo trong tài liệu viết cho 808b365 — tôi đã xác nhận bằng git show 808b365:<file> rằng chúng ĐÚNG cho cây cũ.

## S204
- **work item:** WI-15 — GAP-M2-10: /reload thật (phát reason: "reload")
- **cited:** packages/coding-agent/src/extensibility/extensions/loader.ts | sửa | Nhận reason: "reload" từ call site mới
- **actual:** packages/coding-agent/src/extensibility/extensions/loader.ts — `rg -n 'reason' <file>` trả 0 hit. Exports của file: extensionToolSourceInfo (:76), ExtensionRuntimeNotInitializedError (:90), ExtensionRuntime (:100), loadExtensionFromFactory (:464), loadExtensions (:485), bindPreparedExtensions (:491), DiscoverExtensionPathOptions (:565), discoverExtensionPaths (:572), discoverAndLoadExtensions (:668). Không có tham số nào mang tên `reason`.

## S205
- **work item:** WI-15 — GAP-M2-10: /reload thật (phát reason: "reload")
- **cited:** Thiếu đúng hai thứ, và chỉ hai thứ: một entry slash command và một call site emit
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:1696 (định nghĩa duy nhất) — `rg -n 'emitResourcesDiscover' packages` chỉ trả về MỘT hit, chính là dòng khai báo. Tương đối: pi-ref gọi nó ở src/core/agent-session.ts:2949, và phát `reason: "reload"` thật ở :3314 qua `extendResourcesFromExtensions` (:2944).

## S206
- **work item:** WI-15 — GAP-M2-10: /reload thật (phát reason: "reload")
- **cited:** Cổng (2): rescopeHeadlessToCwd vẫn còn đúng bốn call site
- **actual:** packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:92 (`relocateHeadlessSession`) chứa cả bốn call site, thuộc lệnh `/move` (khai tại :722) và các đường rollback của nó — không phải của một tầng reload. Định nghĩa ở :871.

## S207
- **work item:** WI-15 — GAP-M2-10: /reload thật (phát reason: "reload")
- **cited:** Bị chặn cho tới khi có native addon: bun test chết ngay ở bước import với "Failed to load pi_natives native addon for darwin-arm64". Gỡ chặn bằng bun --cwd=packages/natives run build.
- **actual:** HEAD hiện tại (65cc6c1) — addon đã build. `bun -e 'import("@oh-my-pi/pi-natives")...'` in `natives OK`. `node_modules/@oh-my-pi/pi-natives` là symlink → `../../packages/natives`.

## S208
- **work item:** WI-15 — GAP-M2-10: /reload thật (phát reason: "reload")
- **cited:** (không có trong tài liệu) — lệnh reload tất cả chưa tồn tại
- **actual:** packages/coding-agent/src/slash-commands/builtin-marketplace.ts:556 — `name: "reload-plugins"`, description "Reload all plugins (skills, commands, hooks, tools, agents, MCP)", có cả `handle` và `handleTui`, có 3 test riêng tại packages/coding-agent/test/reload-plugins-mcp.test.ts

## S209
- **work item:** WI-15 — GAP-M2-10: /reload thật (phát reason: "reload")
- **cited:** Cổng (1): grep -rn 'reason: "reload"' packages --include='*.ts' trả về ít nhất một hit
- **actual:** Đo được 0 hit, exit code 1, tại HEAD 65cc6c1. Không có call site emit nào trong toàn bộ packages.

## S210
- **work item:** WI-18 (GAP-M2-12) — Cổng effect: tool khai báo được tác động gì, cổng chặn ở biên thủ tục tác vụ tách khỏi vòng đời chủ sở hữu
- **cited:** packages/agent/src/pause.ts:24 — `AgentPauseGate` (xuất hiện 3 lần trong WI-18: bảng file cần chạm tới, lệnh xác minh, và bảng rủi ro dòng 5069)
- **actual:** packages/agent/src/pause.ts:25 — dòng 24 là comment `/** Freeze switch shared by every agent loop in the process. See module docs. */`

## S211
- **work item:** WI-18 (GAP-M2-12) — Cổng effect: tool khai báo được tác động gì, cổng chặn ở biên thủ tục tác vụ tách khỏi vòng đời chủ sở hữu
- **cited:** packages/agent/src/harness/hooks.ts (bảng file cần chạm tới, action 'sửa'; và bước 3 'Đặt cổng hỏi ở biên thủ tục tác vụ')
- **actual:** Không tồn tại trong omp. Tồn tại ở /Users/tranquangdang21/Projects/pi-ref/packages/agent/src/harness/hooks.ts và /Users/tranquangdang21/Projects/senpi-ref/packages/agent/src/harness/hooks.ts (cả hai 533 dòng, `diff` rỗng — giống hệt nhau).

## S212
- **work item:** WI-18 (GAP-M2-12) — Cổng effect: tool khai báo được tác động gì, cổng chặn ở biên thủ tục tác vụ tách khỏi vòng đời chủ sở hữu
- **cited:** packages/agent/src/kinds/tool.ts (bảng file cần chạm tới, action 'sửa'; và bước 2 'Thêm cột effect vào bảng khai báo của WI-6')
- **actual:** Không tồn tại ở BẤT KỲ cây tham chiếu nào (8/8 cây). Bản gần nhất ở pi là packages/agent/src/harness/pico3/kinds/tool.ts — chỉ có ở pi-ref, KHÔNG có ở senpi-ref.

## S213
- **work item:** WI-18 (GAP-M2-12) — Cổng effect: tool khai báo được tác động gì, cổng chặn ở biên thủ tục tác vụ tách khỏi vòng đời chủ sở hữu
- **cited:** GAP-REGISTER-2.md:1043 — "Khái niệm này không có tệp nào ở `pi` để chép; chỉ là một ranh giới trong `harness/hooks.ts` + `kinds/tool.ts`"
- **actual:** /Users/tranquangdang21/Projects/pi-ref/packages/agent/src/harness/execution/effect-gate.ts (60 dòng) — có `createGate()` ở :31 trả `{ gate: Gate; control: GateControl }`, với `/** Procedure-facing ... */` ở :12 và `/** Owner-facing lifecycle controls ... */` ở :18. hooks.ts:3 import `Gate` từ đây; hooks.ts:44 `runWithGate` gọi `gate.admit(...)` ở :50.

## S214
- **work item:** WI-18 (GAP-M2-12) — Cổng effect: tool khai báo được tác động gì, cổng chặn ở biên thủ tục tác vụ tách khỏi vòng đời chủ sở hữu
- **cited:** WI-18 mục "Xác minh" — "Bị chặn cho tới khi có native addon: `bun test` chết ngay ở bước import"
- **actual:** Addon ĐÃ CÓ: packages/natives/native/pi_natives.darwin-arm64.node (tìm thấy bằng `find packages/natives -name '*.node'`)

## S215
- **work item:** WI-18 (GAP-M2-12) — Cổng effect: tool khai báo được tác động gì, cổng chặn ở biên thủ tục tác vụ tách khỏi vòng đời chủ sở hữu
- **cited:** Cổng hoàn thành (1) TYPE: `bun run check:ts` exit 0, được dùng làm bằng chứng 'Cổng hỏi đúng biên'
- **actual:** check:ts (package.json:90) chỉ kiểm KIỂU. Đặt cổng ở command boundary thay vì biên thủ tục tác vụ vẫn exit 0, vì hình dạng kiểu giống nhau.

## S216
- **work item:** WI-18 (GAP-M2-12) — Cổng effect: tool khai báo được tác động gì, cổng chặn ở biên thủ tục tác vụ tách khỏi vòng đời chủ sở hữu
- **cited:** WI-18 "Người thấy" + hợp đồng test — 'tác giả plugin khai báo một tool đọc filesystem'
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:638 (`export interface ToolDefinition`), với `approval?: ToolApproval` ở :658

## S217
- **work item:** WI-20
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:548-561
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:550-562 (jsdoc), declaration at :563; the four-item list is at :551-552

## S218
- **work item:** WI-20
- **cited:** packages/coding-agent/CHANGELOG.md:1057
- **actual:** packages/coding-agent/CHANGELOG.md:1117, under '## [18.1.16] - 2026-09-09' (header at :1099)

## S219
- **work item:** WI-20
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:494 (plan's 'Đính chính' table)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:496

## S220
- **work item:** WI-20
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:561 (plan's 'Đính chính' table)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:563

## S221
- **work item:** WI-20
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1264 (plan's 'Đính chính' table)
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:1293

## S222
- **work item:** WI-20
- **cited:** packages/coding-agent/src/session/agent-session.ts:7406 (plan's 'Đính chính' table)
- **actual:** packages/coding-agent/src/session/agent-session.ts:7552

## S223
- **work item:** WI-20
- **cited:** docs/extension-trust-model.md (listed as 'đọc, KHÔNG sửa ở đợt này' — the WI-0 ADR)
- **actual:** does not exist; it is an undelivered deliverable of WI-0, not a stale pointer

## S224
- **work item:** WI-20
- **cited:** pi-ref/packages/coding-agent/src/core/trust-manager.ts:1-9 — plan's table: 'pi có bốn mục trải trên nhiều file; omp cần một cơ chế, không phải bốn'
- **actual:** pi-ref/packages/coding-agent/src/core/trust-manager.ts — 245 lines, ONE file, exporting ProjectTrustDecision (:9), ProjectTrustStoreEntry (:11), ProjectTrustUpdate (:16), ProjectTrustOption (:21), TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES (:30), getProjectTrustParentPath (:60), getProjectTrustOptions (:66), hasTrustRequiringProjectResources (:185), class ProjectTrustStore (:209)

## S225
- **work item:** WI-20
- **cited:** GAP-D12 resource list in WI-20: 'extensions, settings, skills, prompts, themes, resources' (6 items)
- **actual:** pi-ref/.../src/core/trust-manager.ts:30-38 TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES = [settings.json, extensions, skills, prompts, themes, SYSTEM.md, APPEND_SYSTEM.md], plus :185-206 walking cwd and ancestors for .agents/skills

## S226
- **work item:** WI-20
- **cited:** WI-20 'Xác minh': 'Bị chặn cho tới khi có native addon: bun test chết ngay ở bước import với Failed to load pi_natives native addon for darwin-arm64'
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node exists; bun test runs normally

## S227
- **work item:** WI-21
- **cited:** manager.ts:570-571 `sha.slice(0,7)` — cited in MILESTONE_6_EXECUTION_PLAN.md:1223 as proof omp already has SHA provenance
- **actual:** packages/coding-agent/src/extensibility/plugins/manager.ts — 1297 lines, and it now contains ZERO occurrences of `slice(`. The provenance plumbing moved: sha is threaded through `marketplace/source-resolver.ts:138,150,165` (`sha: source.sha` in the `url`/`github`/`git-subdir` clone branches) and typed at `marketplace/types.ts:116,123,131` (`sha?: string` on PluginSourceGitHub / PluginSourceUrl / PluginSourceGitSubdir).

## S228
- **work item:** WI-21
- **cited:** `grep -rniE 'plugins update|extensions update|updateExtension|updatePlugin' packages/coding-agent/src --include='*.ts'` (non-test) → 0 hit
- **actual:** Same command exits 0 with 0 hits — the count is right, the conclusion is wrong. The pattern names `update*`; the codebase names everything `upgrade*`. Verified: `bun test packages/coding-agent/test/marketplace/manager.test.ts` → 62 pass, 0 fail.

## S229
- **work item:** WI-21
- **cited:** WI-21 §Xác minh: `Bị chặn cho tới khi có native addon: bun test chết ngay ở bước import với "Failed to load pi_natives native addon for darwin-arm64"`
- **actual:** No location. The premise is false on the measuring machine (milestone-1 @ 65cc6c1): `bun test packages/coding-agent/test/marketplace/manager.test.ts` → 62 pass, 0 fail, 159 expect() calls, 1053 ms; `bun test packages/coding-agent/test/plugin-command.test.ts` → 1 pass; `bun run check:ts` → all 16 packages Done, exit code 0.

## S230
- **work item:** GAP-M4-10. Sổ bản vá phụ thuộc cục bộ (sóng D)
- **cited:** Hợp đồng test: "reconcile phải trả ok: true với đúng 12 hunk cho file puppeteer"
- **actual:** patches/puppeteer-core@25.3.0.patch — `grep -c '^@@'` = 30. 12 là số `diff --git` (số file), không phải số hunk. lib/puppeteer/api/Frame.js có 8 hunk, lib/puppeteer/cdp/FrameManager.js có 5 hunk

## S231
- **work item:** GAP-M4-10. Sổ bản vá phụ thuộc cục bộ (sóng D)
- **cited:** Đính chính: "riêng mười file mã thư viện thật là 367 `+` / 38 `-`"
- **actual:** patches/puppeteer-core@25.3.0.patch — cộng từng file: 68/7, 52/7, 10/6, 2/2, 189/3, 20/0, 15/4, 3/1, 13/3, 5/15 = đúng 377/48

## S232
- **work item:** GAP-M4-10. Sổ bản vá phụ thuộc cục bộ (sóng D)
- **cited:** Đính chính: "mỗi cái 5 `+` / 5 `-`" cho hai file .bun-tag-*
- **actual:** patches/puppeteer-core@25.3.0.patch:1-6 — `new file mode 100644` + `index 0000000000000000000000000000000000000000..e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` (e69de29 = SHA-1 của file rỗng), không có dòng `---`, `+++` hay `@@` nào

## S233
- **work item:** GAP-M4-10. Sổ bản vá phụ thuộc cục bộ (sóng D)
- **cited:** "Cần người xác nhận" số 2: "hai diff .bun-tag-* vẫn phải có hàng ledger (một hàng bắt buộc cho mỗi hunk không phải ngoại lệ)"
- **actual:** patches/puppeteer-core@25.3.0.patch:1-6 — không có hunk, nên reconcile khoá-hunk sẽ không bao giờ siny hàng cho chúng, còn khoá-diff sẽ phải gộp 5 hunk của FrameManager.js vào 1 hàng

## S234
- **work item:** GAP-M4-10. Sổ bản vá phụ thuộc cục bộ (sóng D)
- **cited:** "File cần chạm tới" — không liệt kê .github/workflows/ci.yml
- **actual:** .github/workflows/ci.yml:617 = `bun test scripts/ci-test-ts.test.ts scripts/release.test.ts` — allowlist đúng 2 file. Job chạy trước là `bun run ci:test:ts:workspace`, mà scripts/ci-test-ts.ts:88-110 liệt kê fastWorkspacePackages / nativeAndIntegrationPackages / localOnlyWorkspacePackages — không bucket nào chứa scripts/

## S235
- **work item:** GAP-M4-10. Sổ bản vá phụ thuộc cục bộ (sóng D)
- **cited:** "Cổng hoàn thành" số 5: "bun run check:ts sạch" — ngầm định file mới đã được typecheck
- **actual:** package.json:90 `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`; package.json:91 `check:tools` chỉ là oxlint + oxfmt. tsconfig.tools.json có include ["scripts", ...] nhưng check:ts không build project reference gốc

## S236
- **work item:** GAP-M4-11 (M4-11) — "Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom (sóng B)"
- **cited:** MILESTONE_4_EXECUTION_PLAN.md verification block cmd 3 + gate (3): `bun test packages/coding-agent/test/dap/`
- **actual:** packages/coding-agent/test/dap/ does not exist. `ls` -> No such file or directory. `bun test packages/coding-agent/test/dap/` printed '8465 files were searched' + 'Tests need .test... in the filename' — it matches zero test files and always exits green.

## S237
- **work item:** GAP-M4-11 (M4-11) — "Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom (sóng B)"
- **cited:** plan file table: `packages/utils/src/logger.ts` | sửa | "Đường logger" as one of the four migrate-paths for the raw `instanceof Error ? ... : String(` idiom
- **actual:** packages/utils/src/logger.ts has ZERO occurrences of the raw idiom. Verified: `rg -c "instanceof Error ? .*\.message : String\(" packages/utils/src/logger.ts` -> 0.

## S238
- **work item:** GAP-M4-11 (M4-11) — "Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom (sóng B)"
- **cited:** plan step 1: "rải đều từ `packages/agent/src/agent-loop.ts` (3 hit) tới `packages/ai/src/auth-broker/server.ts` (8)"
- **actual:** The number 8 is correct, but the word "tới" (up to) presents it as the range's high end. Actual top-10 by count: command-controller.ts 27, task/executor.ts 26, modes/interactive-mode.ts 26, fixtures/before-compaction.jsonl 23, selector-controller.ts 21, input-controller.ts 17, session/agent-session.ts 16, mcp-command-controller.ts 15, launch/broker.ts 13, browser/tab-supervisor.ts 10.

## S239
- **work item:** GAP-M4-11 (M4-11) — "Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom (sóng B)"
- **cited:** plan "Hình dạng code": the reference `normalizeErrorMessage` body, whose doc comment claims the function "**không bao giờ** ném" (never throws)
- **actual:** The `if (value instanceof Error)` check is OUTSIDE every try/catch. `instanceof` invokes the proxy's getPrototypeOf trap, so the function THROWS on a revoked Proxy — the exact input the plan's own final `catch` exists to handle. Measured: `D normalize THREW -> Proxy has already been revoked`. Also `Object.prototype.toString.call` DOES throw on a revoked Proxy, contradicting the plan's own comment.

## S240
- **work item:** GAP-M4-11 (M4-11) — "Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom (sóng B)"
- **cited:** plan test contract: "ném object có getter `message` **ném lỗi**" and gate claim "hàng âm của getter là điều không thể bịa — bản triển khai hôm nay sẽ ném"
- **actual:** A PLAIN object with a throwing `message` getter does NOT make today's idiom throw. Measured: `B raw -> [object Object]`. `instanceof Error` is false so `String(bad)` runs, and String() never touches the `message` getter. An Error SUBCLASS with `override get message()` also fails to throw (`A raw -> orig`) because `new Error("x")` creates `message` as an own data property that shadows the prototype getter. So the deciding gate row is GREEN FROM DAY ONE if written as the plan literally describes it.

## S241
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:985 — "ToolCallEventResult khai cùng file với tool_approval_requested ở :985"
- **actual:** packages/coding-agent/src/extensibility/shared-events.ts:314 (`export interface ToolCallEventResult {`)

## S242
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:262 — "if (callResult?.block) {"
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:263

## S243
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:264 — "throw new Error(reason)"
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:265

## S244
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** packages/coding-agent/src/extensibility/hooks/tool-wrapper.ts:78-83 (file table: "khối catch chạy :78-83")
- **actual:** packages/coding-agent/src/extensibility/hooks/tool-wrapper.ts:79-85

## S245
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** packages/coding-agent/src/extensibility/hooks/tool-wrapper.ts — the work item's own "Đính chính so với plan" table claims :78 / :79 / :80-81 / :82 / :83
- **actual:** packages/coding-agent/src/extensibility/hooks/tool-wrapper.ts:79, :80, :81-83, :84, :85

## S246
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** File table row "renderer hiện tại" — "`ToolExecutionComponent` + `tool-execution.ts` hiển thị hai nhãn khác nhau", verification cell cites no anchor, only "seam M4-7 đã dựng sẵn (G3 rebuild parity, G4 hidden-key)"
- **actual:** packages/tui/src/chat/tool-execution.ts:243 (`export class ToolExecutionComponent extends Container`, 1407 lines) — one `isError` flag, no kind/sourceName field

## S247
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** packages/coding-agent/test/hooks-runner.test.ts (Verification block step 1)
- **actual:** does not exist anywhere in the repo

## S248
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** packages/coding-agent/test/extension-tool-wrapper.test.ts (Verification block step 3)
- **actual:** does not exist anywhere in the repo

## S249
- **work item:** GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C) — at MILESTONE_4_EXECUTION_PLAN.md:1975. (Task text said "M4-13" but that title matches GAP-M4-12; GAP-M4-13 at :2149 is the unrelated approval-audit-pair item.)
- **cited:** packages/coding-agent/test/hooks-tool-wrapper.test.ts (Verification block step 3)
- **actual:** packages/coding-agent/test/hook-tool-wrapper-input.test.ts (singular "hook", not "hooks") is the nearest real file; the cited path does not exist

## S250
- **work item:** M4-14 — `## GAP-M4-13. Cặp audit bền vững cho mỗi lần hỏi quyền: sau một crash, trả lời được "ai đã duyệt cái này" (sóng B)` at MILESTONE_4_EXECUTION_PLAN.md:2149. Harness labelled it M4-14, but that title sits under GAP-M4-13; the plan's real GAP-M4-14 (line 2302) is an unrelated Wave-D item. I keyed on the exact title match and flagged the ID drift in the ticket.
- **cited:** packages/coding-agent/src/session/session-entries.ts:300-315 (SessionEntry union)
- **actual:** packages/coding-agent/src/session/session-entries.ts:300-316 — `ResetBoundaryEntry;` is at :316, not :315. Member count (16) and `grep -c "Approval"` = 0 both CONFIRMED correct.

## S251
- **work item:** M4-14 — `## GAP-M4-13. Cặp audit bền vững cho mỗi lần hỏi quyền: sau một crash, trả lời được "ai đã duyệt cái này" (sóng B)` at MILESTONE_4_EXECUTION_PLAN.md:2149. Harness labelled it M4-14, but that title sits under GAP-M4-13; the plan's real GAP-M4-14 (line 2302) is an unrelated Wave-D item. I keyed on the exact title match and flagged the ID drift in the ticket.
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:290 = `resolveApproval` ("nơi duy nhất quyết định chính sách, nên bản ghi phải lấy từ đó")
- **actual:** wrapper.ts:290 is a CALL SITE: `const resolved = resolveApproval(this.tool, resolvedArgs, approvalMode, userPolicies);`. The definition is packages/coding-agent/src/tools/approval.ts:203 — a pure 4-arg function with no session handle and no context, so it cannot write to a transcript. `resolveApproval` has SEVEN call sites in src/ (cursor.ts:341, cursor.ts:1012, event-controller.ts:1778, approval.ts:346, speculation/host.ts:135, eval/preludes.ts:99, wrapper.ts:233, wrapper.ts:290), so the plan's "write it in resolveApproval, not at a call site" constraint is not implementable as written — and its literal spelling IS the mistake the work item's own "Cách sai dễ nhất" section warns against.

## S252
- **work item:** M4-14 — `## GAP-M4-13. Cặp audit bền vững cho mỗi lần hỏi quyền: sau một crash, trả lời được "ai đã duyệt cái này" (sóng B)` at MILESTONE_4_EXECUTION_PLAN.md:2149. Harness labelled it M4-14, but that title sits under GAP-M4-13; the plan's real GAP-M4-14 (line 2302) is an unrelated Wave-D item. I keyed on the exact title match and flagged the ID drift in the ticket.
- **cited:** session/turn-recovery.ts:72 EPHEMERAL_MODEL_CHANGE_ROLE = the existing "in log, but not in model" mechanism to reuse
- **actual:** LINE NUMBER IS CORRECT but the SEMANTIC CLAIM IS FALSE. `EPHEMERAL_MODEL_CHANGE_ROLE = "fallback"` (session-entries.ts:33) is a model-role STRING marking an ephemeral/fallback model change. All 8 src/ uses (session-context.ts:129, model-controls.ts:284, turn-recovery.ts:1686/1958/2174/2241, persisted-agents.ts:230/328) select a restore model, set a role, skip a retry hint, or skip persisting an agent — none filters model context. The real mechanism is packages/coding-agent/src/session/session-context.ts:214 `isTranscriptEntry` → `entry.type === "message" || entry.type === "custom_message"`, feeding `buildSessionContext` (:218). A `type: "approval"` entry is excluded structurally with no new filter. The plan's own correction table claims "Mọi neo đo được trong sổ | XÁC NHẬN CHÍNH XÁC — toàn bộ" — the line numbers are all right, the inference from them is wrong.

## S253
- **work item:** M4-14 — `## GAP-M4-13. Cặp audit bền vững cho mỗi lần hỏi quyền: sau một crash, trả lời được "ai đã duyệt cái này" (sóng B)` at MILESTONE_4_EXECUTION_PLAN.md:2149. Harness labelled it M4-14, but that title sits under GAP-M4-13; the plan's real GAP-M4-14 (line 2302) is an unrelated Wave-D item. I keyed on the exact title match and flagged the ID drift in the ticket.
- **cited:** packages/coding-agent/test/*.test.ts (7 files named in the Xác minh block)
- **actual:** 6 of 7 do not exist: session-entries.test.ts, extension-tool-wrapper.test.ts, approval-mode.test.ts, session-restore.test.ts, session-compaction.test.ts all MISSING; approval-audit.test.ts is the new file to create. Only extensions-runner.test.ts exists (verified: 87 pass, 0 fail). Two are ALSO mis-pathed: approval-mode.test.ts actually lives at packages/coding-agent/test/tools/approval-mode.test.ts. Correct homes I identified for the three contracts: approval-audit.test.ts (new), session-messages.test.ts (the negative/context gate), session-read-only-hydration.test.ts (backward compat).

## S254
- **work item:** GAP-M4-15
- **cited:** packages/coding-agent/test/doctor.test.ts
- **actual:** MILESTONE_1_EXECUTION_PLAN.md:3744 ('File cần chạm tới' row) and the 'Xác minh' block of W18 at :3760

## S255
- **work item:** GAP-M4-15
- **cited:** packages/coding-agent/test/discovery/hooks.test.ts
- **actual:** does not exist anywhere; `ls packages/coding-agent/test/discovery/` lists 27 files, none named hooks

## S256
- **work item:** GAP-M4-15
- **cited:** packages/coding-agent/src/config/settings.ts:1020 — cited as proof that .claude/settings.json is a real config LAYER
- **actual:** packages/coding-agent/src/config/settings.ts:1020 — verbatim correct but inside #configWatchTargets() (defined :993, body ends :1023, called once from #syncFileWatchers() at :1032): an fs.watch target builder

## S257
- **work item:** GAP-M4-15
- **cited:** MILESTONE_4_EXECUTION_PLAN.md:354 — 'grep -n "GAP-M1-18\|omp doctor" MILESTONE_1_EXECUTION_PLAN.md trả 0 hit', GAP-M1-18 'CHƯA CÓ'
- **actual:** MILESTONE_1_EXECUTION_PLAN.md:3730, 3732, 3733, plus :20, :148, :3791 and elsewhere

## S258
- **work item:** GAP-M4-15
- **cited:** the negative test row: 'kiểm kê phải chạy SAU khi projectLayerForMerge đã lọc' — names one deliberate-drop function
- **actual:** packages/coding-agent/src/config/settings.ts:293 `export function dropSettingsGroupShadows(data, sourcePath, basePrefix = "")` — omitted from the work item entirely

## S259
- **work item:** GAP-M4-15
- **cited:** packages/coding-agent/test/discovery/disabled-extensions.test.ts — cited as half the evidence that the hooks/{pre,post}/ path is unchanged
- **actual:** the file exists at that path, but grep -c "hooks" returns 0

## S260
- **work item:** GAP-M4-15
- **cited:** 'Tiền đề môi trường' block (Xác minh step 0) — 'addon chưa có thì mọi test đỏ vì Failed to load pi_natives native addon'
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node exists; /opt/homebrew/bin/ninja installed; `bun test packages/coding-agent/test/config/settings-registry.test.ts` → 18 pass, 0 fail

## S261
- **work item:** GAP-M4-15
- **cited:** 'modelOverride, fooBar' in the sample doctor line `file .claude/settings.json có 3 key omp không hiểu: hooks, modelOverride, fooBar`
- **actual:** not registered settings; `grep -rn 'id: "modelOverride"' packages/coding-agent/src/config/registry.ts` → 0 hits, same for 'hooks'

## S262
- **work item:** GAP-M4-15
- **cited:** the DoctorCheck shape implied by the code sketch — {severity, name, detail, remedy}
- **actual:** packages/coding-agent/src/extensibility/plugins/types.ts:169-178

