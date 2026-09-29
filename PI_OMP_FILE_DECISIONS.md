# Quyết định từng file: `pi` @ 4259686d ↔ `omp` @ milestone-1

> Cây nguồn: `pi` = `C:/Users/ADMIN/AppData/Local/Temp/pi-recheck` (HEAD `4259686d9290c0d73ae7192b796aee3e530a9779`, 14 package).
> Cây đích: `omp` = `C:/Users/ADMIN/Documents/Projects/ultraworkers/packages` (branch `milestone-1`).
> Cả hai cây READ-ONLY. Không sửa, không copy, không chạy test.

> **Ghi chú về đường dẫn trong đề bài:** `C:/Users/ADMIN/AppData/Local/Temp/pi-check` và
> `pi-classify-input.txt` **đã bị Windows dọn khỏi `%TEMP%` giữa lúc chạy** (xác minh: cả hai trả
> `MISSING`). Mọi số đo dưới đây được **đo lại từ đĩa** trên `pi-recheck` (đúng commit đã ghim).
> `pi-classify-input.txt` không còn, nên phần universe của bảng quyết định được dựng lại từ
> `git ls-tree` trên HEAD của `pi`, không từ file input.

---

## 1. Câu trả lời một dòng

Trên **1.572 file** phía `pi` cần quyết định (không phải 1.415 + 1.270 như đề bài giao — xem `2.1`),
với **667 file là code chạy được** và 905 file là example/test/bench/docs:

> **COPY_PI 7 · PORT 47 · KEEP_OMP ~340 · SKIP ~1.180**

Nói thẳng điều mà bảng này chứng minh: **"parity bằng cách chép" không đúng ở đây.** Ở tầng code
chạy được, `pi` là **tiền thân nhỏ hơn** ở hầu hết mặt bằng chung (`ai/src`, `tui/src`,
`agent/src`), và ở phần `pi` dẫn đầu thì đó là **ngăn kiến trúc khác** (`chord`, `codemode`, 4
package remote) chứ không phải năng lực chép được. Chỉ **7 file** đạt chuẩn copy nguyên văn.

Số 47 `PORT` là phần đáng giữ nhất — đó là 47 nơi "không bên nào đúng một mình".

### 1.1. Cơ sở đếm

| | đếm từ đâu |
| --- | --- |
| `COPY_PI` = 7 | 6 file ở `3.1` + `agent/src/harness/utils/truncate.ts` (350 dòng, cắt theo byte — `omp` chỉ có `truncateToWidth` theo cột). Hai file từng được chấm `COPY_PI` ở lát trước (`output-guard.ts`, `file-mutation-queue.ts`) **đã bị đảo sang `PORT`** trong `4.1`. |
| `PORT` = 47 | 24 ở `3.2` + 23 được khôi phục/sửa trong `4.1`–`4.2`. |
| `KEEP_OMP` = ~340 | 108 dòng ở `3.4` + 8 ở `3.3`, cộng phần đã gộp ở sáu lát trước. Con số có dấu `~` vì một số dòng gom cả thư mục. |
| `SKIP` = ~1.180 | 905 example/test/bench/docs + 11 build script ở `3.5.4` + ngăn `experimental/` (52 file) + barrel/shim + vendor plumbing. |

Các lát trước **trùng nhau nặng** (C2, C4, C5, C6 đều phủ `coding-agent/`), nên **không cộng từng
lát một cách máy móc** — sẽ đếm trùng. Bảng trên là số đã gộp.

---

## 2. Số đo đo lại

Hai cây được so trên **4 package** (`agent`, `ai`, `coding-agent`, `tui`), giới hạn file
`.ts / .tsx / .md / .json / .mjs / .cjs`, dựa trên path tương đối từ gốc repo.

| | tổng | src/prod | example·test·bench·docs |
| --- | ---: | ---: | ---: |
| **Giống hệt byte-for-byte** | **10** | 0 | 10 |
| **Chỉ có ở `pi`** | **1.409** | 607 | 802 |
| **Chỉ có ở `omp`** | **4.782** | 2.104 | 2.678 |
| **Cùng đường dẫn, khác nội dung** | **163** | 60 | 103 |
| **Tổng phía `pi`** | **1.582** | 667 | 915 |

### 2.1. Số của đề bài sai, và sai ở chỗ quan trọng nhất

Đề bài giao sẵn: *cùng đường dẫn khác nội dung = **1.415** (657 prod, 758 example/test)*.
Đo lại: **163 (60 prod, 103 example/test)** — **nhỏ hơn 8,7 lần**.

Nguyên nhân: script sinh `DIFF_SRC` bằng so khớp đường dẫn, nhưng `pi` còn giữ nguyên
`packages/coding-agent/src/core/` (252 file) trong khi `omp` đã **xoá sạch thư mục `core/`**
(commit `ffd6a7aa89`, 23/01/2026, tác giả `can1357` — flatten 252 file / 23 subdir ra
`config/`, `exec/`, `export/`, `session/`, `extensibility/`). Mọi file dưới `core/` vì thế là
**chỉ có ở `pi`**, không phải "cùng đường dẫn". Cùng lỗi đó lặp lại ở `experimental/`.

Hệ quả trực tiếp: **"1.415 quyết định" trong đề bài không tồn tại**. Vũ trụ quyết định thật là
**1.572 file phía `pi`** (1.409 chỉ-ở-pi + 163 cùng-đường-dẫn), trong đó chỉ **667 là code
chạy được**; 905 file còn lại là example/test/bench/docs.

### 2.2. Bộ 60 file prod-src thực sự khác nhau

Đây là toàn bộ "cùng đường dẫn, khác nội dung" ở tầng code chạy được — tức là **mặt bằng so
sánh thật sự duy nhất** còn lại giữa hai dự án:

- `agent/src/`: 5 file (`agent.ts`, `agent-loop.ts`, `index.ts`, `proxy.ts`, `types.ts`)
- `ai/src/`: 11 file (`types.ts`, `index.ts`, `auth/types.ts`, `utils/{abort,event-stream,validation}.ts`,
  `providers/{amazon-bedrock,anthropic,azure-openai-responses,google,google-vertex}.ts`)
- `coding-agent/src/`: 16 file (`cli.ts`, `config.ts`, `index.ts`, `main.ts`, `cli/args.ts`,
  `cli/file-processor.ts`, `cli/initial-message.ts`, `modes/index.ts`, `modes/print-mode.ts`,
  `modes/rpc/rpc-{client,mode,types}.ts`, `utils/{changelog,clipboard,image-resize,tools-manager}.ts`)
- `tui/src/`: 24 file (toàn bộ `components/*`, `tui.ts`, `terminal.ts`, `keys.ts`, `utils.ts`,
  `fuzzy.ts`, `autocomplete.ts`, `stdin-buffer.ts`, `keybindings.ts`, `kill-ring.ts`,
  `editor-component.ts`, `index.ts`)
- 4 file `package.json` ở gốc package

10 file "giống hệt byte-for-byte" đều là **fixture JSON/MD trong `test/fixtures/skills/`** —
không có file `.ts` nào giống hệt. Điều này phủ định trực tiếp câu "parity bằng cách chép là
cách không thể drift": ở tầng code, **không có cặp nào đã hội tụ**.

### 2.3. Chiều lệch

Ở `ai/src` và `tui/src`, phía lệch là phía `omp` và đó là **lợi thế**:

| file | `pi` | `omp` |
| --- | ---: | ---: |
| `ai/src/providers/anthropic.ts` | 59 dòng (descriptor) | 5.888 dòng (implementation thật) |
| `ai/src/utils/validation.ts` | 350 | 2.234 (+ 16 file `utils/schema/`) |
| `tui/src/tui.ts` | 1.493 | 3.633 |
| `tui/src/terminal.ts` | 554 | 2.319 |
| `tui/src/components/markdown.ts` | 1.021 | 3.750 |
| `agent/src/agent-loop.ts` | 940 | 3.844 |
| `coding-agent/src/session-manager.ts` | 63.809 B | 140.311 B |

Ngược lại, `pi` có những thứ `omp` **thật sự không có**: `chord` (CRDT), `codemode` (QuickJS/WASM),
`server`/`client`/`protocol`/`durable`/`session-backends`, và ngăn `coding-agent/src/experimental/`
(52 file) dựng trên đó. Đó là kiến trúc khác, không phải tiến bộ hơn.

---

## 3. Bảng quyết định

Bốn nhãn: **COPY_PI** (chỉ có ở `pi`, và là năng lực `omp` thật sự thiếu — chép nguyên văn rồi
migrate như 6 package mới) · **KEEP_OMP** (bản `omp` tốt hơn, mới hơn hoặc đúng hơn — đây là
quyết định đắt: đang từ chối một năng lực `pi` có) · **PORT** (không bên nào đúng một mình) ·
**SKIP** (example/test/bench/docs, hoặc thứ `omp` cố ý không muốn).

Nhóm theo phán quyết, trong mỗi nhóm theo thư mục.

### 3.1. COPY_PI — 6 quyết định

Toàn bộ đều là file **0 import nội bộ `pi`**, không chạm Chord/typebox, không dựng prompt trong
code. Đây là tiêu chí duy nhất tôi dùng cho nhãn này, và cả 6 đều vượt qua nó.

| file | lý do | mất gì |
| --- | --- | --- |
| `tui/src/oklab.ts` | 233 dòng toán Oklab/OKHSL thuần, attribution MIT của Björn Ottosson ngay đầu file, không `any`/`private`. Grep `oklch\|oklab\|okhsl` trong `omp` chỉ ra literal CSS trong `export/html` — `omp` không có một dòng code mixing màu nào. | — (rỗng) |
| `tui/src/wheel-scroll.ts` | 82 dòng tăng tốc wheel theo vận tốc (100ms→1, 50ms→2, 20ms→5, trần 6). `omp` `mouse.ts:27` chỉ phát `wheel:-1\|1`; `handleWheel` ở `log-viewer.ts:639`, `raw-sse.ts:168`, `git-tui.ts:697` đều hard-code `* 3`, không có chế độ `"auto"`. | — |
| `coding-agent/src/bun/restore-sandbox-env.ts` | 36 dòng, `node:fs` only. `omp` `utils/src/env.ts` **chỉ đọc** `/proc/self/environ` vào một `Map` để so dotenv, **không bao giờ nạp lại vào `process.env`** — grep `restoreSandboxEnv` ra rỗng. | — |
| `coding-agent/src/bun/sandbox-env-setup.ts` | Một import side-effect của file trên, chạy trước các module đọc env lúc khởi động. Hai file là một đơn vị copy. | — |
| `coding-agent/src/utils/wsl.ts` | `isWSL()` 25 dòng, chỉ import `node:fs`. Grep `wsl` trong `coding-agent/src` của `omp` ra rỗng. | — |
| `coding-agent/src/utils/zip.ts` | `writeZipArchive(filePath, entries)` thuần bytes, không phụ thuộc ngoài. Grep `zip` trong `omp` chỉ trúng vô nghĩa trong `ai/src/providers/anthropic.ts`. | — |

> **Cảnh báo phụ thuộc:** `bun/quickjs-wasm.d.ts` được xếp **PORT**, không phải COPY_PI — nó chỉ
> có nghĩa sau khi `pi-codemode` được port, nên phải đi cùng đó chứ không đứng một mình.

### 3.2. PORT — 24 quyết định

| file | lý do (một câu) | mất gì nếu không port |
| --- | --- | --- |
| `coding-agent/src/extensions/codemode/execute.ts` | Mang mô hình containment QuickJS/WASM (script của model chỉ có một capability là gọi tool) vào `omp` dưới dạng `ExecutorBackend` thứ hai cạnh `eval/js`. | Không có đường chạy code model-sandbox; `eval/js` của `omp` là worker Bun toàn quyền. |
| `coding-agent/src/extensions/codemode/tool.ts` | Chuyển hợp đồng "nested call đi qua `ctx.executeTool`" (nên hook + permission check vẫn áp dụng) sang pipeline tool của `omp`; không chép được vì typebox + `ToolDefinition` của `pi`. | Custom tool của `omp` không thể gọi tool khác (`CustomToolContext` không có `executeTool`). |
| `coding-agent/src/extensions/codemode/renderer.ts` | Dựng lại trên quy tắc sanitize của `omp` (`replaceTabs`/`truncateToWidth`/`shortenPath`) mà renderer của `pi` không áp. | Preview lồng nhau không được sanitize. |
| `coding-agent/src/extensions/codemode/index.ts` | Đăng ký tool qua đường extension API **natives** của `omp` — `omp` không có `ExtensionAPI.registerTool`. | — |
| `coding-agent/src/extensions/codemode/execute.lazy.ts` | Nhân bản seam lazy-loader lên contract `ExecutorBackend` của `omp` (và `AGENTS.md` cấm `await import()`, nên lazy loader của `pi` không dùng được nguyên hình). | — |
| `coding-agent/src/extensions/codemode/worker.ts` | **0 import**, nhưng `AGENTS.md` cấm entrypoint worker riêng → phải đăng ký selector trong bảng dispatch của `cli.ts`. | Worker không spawn được trong binary đã compile. |
| `coding-agent/src/extensions/tool-search/tool.ts` | Mang BM25 ranker + lazy tool declaration (`api.setActiveTools`) — `grep tool_search` trong `omp` ra rỗng. Đây là đòn bẩy context đi kèm codemode. | Không giảm được tool-set khi context dài. |
| `coding-agent/src/extensions/tool-search/index.ts` | Nối factory `tool_search` vào `api.setActiveTools` + ghi transcript. | — |
| `coding-agent/src/extensions/mcp/resources.ts` | `omp` chỉ chạm MCP resources qua slash command `/mcp resources` (user-initiated); `getServerResources`/`readResource` có trên manager nhưng **chưa bao giờ** đăng ký thành tool model gọi được. Lấy `LIST/READ_MCP_RESOURCES_TOOL` + tool templates, bound vào plumbing MCPTool của `omp`. | Model không tự đọc được MCP resource. |
| `coding-agent/src/extensions/llama/client.ts` | Client llama.cpp server (`normalizeLlamaServerUrl`, poll trạng thái model, `formatBytes`) — `omp` có KDL rule nhưng không có provider. | Không chạy model cục bộ. |
| `coding-agent/src/extensions/llama/huggingface.ts` | Resolve HF token + GGUF repo metadata; `omp` thiếu hẳn, và đây là lý do local model không bootstrap được. | Không tải được GGUF. |
| `coding-agent/src/extensions/llama/provider.ts` | Deployment contract phải về dạng `providers/*.kdl` + module `ai/src/providers/`, không phải extension runtime-registered. | — |
| `coding-agent/src/modes/interactive/bug-report.ts` | `omp` không có `/bug` và không có crash-log (`grep bugReport`/`crash-log` trong `coding-agent/src` ra rỗng). Port flow diagnostics-bundle lên extension-ui-controller. | Không có đường báo lỗi có file đính kèm. |
| `coding-agent/src/core/crash-log.ts` | Ghi lại uncaught exception sống sót restart — `logger` của `omp` rotate nhưng **không giữ crash record**. Không chép được vì file này với tới `source-info.ts` → `package-manager.ts` và dùng `mkdirSync`/`readFileSync`/`writeFileSync`. | Không có hậu vết sau crash. |
| `coding-agent/src/core/http-dispatcher.ts` | Undici dispatcher trung tâm với timeout idle/connect do người dùng chọn — `omp` chỉ chạm undici bên trong `acp/transport` và rpc-mode. Dựng lại trên fetch path của `omp`. | Không có một điểm kiểm soát network duy nhất. |
| `coding-agent/src/core/project-trust.ts` | Trust gating theo project trước khi nạp resource; `omp` chỉ có một chữ `ProjectTrust` trong `extensions/types.ts`. Phải vào seam `capability/loadCapability`. | Không có lớp trust thật. |
| `coding-agent/src/core/trust-manager.ts` | Quyết định trust đã lưu (canonical path → allow/deny, có lockfile guard) — `omp` hardcode `isProjectTrusted: () => true` tại `runner.ts:1293` và `session/agent-session.ts:7552`. Dựng lại trên `config/settings.ts` + `withFileLock`. | — |
| `coding-agent/src/core/agent-session-services.ts` | Giữ cấu trúc `createAgentSession` của `omp`, mang **error isolation per-registration** + kênh `diagnostics` trả về vào hai drain loop (`modelRegistry.registerProvider` của `omp` đang gọi trần, một provider hỏng là giết startup). Tách bạch: quyết định dựng tầng virtual/native model là quyết định khác, phải nói tường minh. | Một extension đăng ký provider hỏng làm hỏng startup. |
| `coding-agent/src/core/auth-guidance.ts` | Gom 4 formatter có tên của `pi` thành module dùng chung cho 5 call-site đang rải rác 4 cách diễn đạt khác nhau (`cli/dry-balance-cli.ts:568`, `cli/models-cli.ts:240`, `sdk.ts:3030`, `session/agent-session.ts:7307/7317`, `main.ts:2395`). Giữ message body của `omp`, bỏ con trỏ `docs/providers.md`. | Drift thật trong thông báo hướng dẫn. |
| `coding-agent/src/core/bash-executor.ts` | Thêm `operations?: BashOperations` vào `BashExecutorOptions` + `session/bash-runner.ts::executeBash`, biến đường brush-core hiện tại thành implementation mặc định (giống `options?.operations ?? createLocalBashOperations`). Giữ trọn PTY/direnv/minimizer/artifacts. | **Bash tool của agent không thể chuyển hướng sang execution target nào khác** — không SSH, không container, không sandbox. |
| `coding-agent/src/core/system-prompt.ts` | Mang cơ chế `sections` + `diffSystemPromptSections` (system prompt là **một message trong transcript**, patch tối thiểu giữa cuộc hội thoại). Nội dung section phải render từ 89 file `.md` của `omp`, không phải string inline của `pi`. | `packages/agent/src/append-only-context.ts:167` — đổi mảng `systemPrompt` làm drop cache prefix; muốn đổi cwd/skills giữa session thì `omp` gửi lại **toàn bộ** prompt. |
| `coding-agent/src/core/virtual-models.ts` | Định tuyếc tên model catalog→model vật lý là năng lực `omp` thiếu hẳn, nhưng `AGENTS.md` đặt toàn bộ model routing trong KDL → **không** làm TS class với hook `withVirtualModels()`. | Không có alias model. |
| `coding-agent/src/utils/changelog.ts` | Chỉ lấy **một hàm**: `normalizeChangelogLinks` (viết lại link changelog tương đối thành URL GitHub ghim tag + sửa tên repo cũ). `omp` (502 dòng) là superset về export nhưng **không có** xử lý link. | Link changelog không resolve được. |
| `coding-agent/src/bun/quickjs-wasm.d.ts` | Khai báo `module "quickjs-wasi/quickjs.wasm"` để loader của Bun trả về **đường dẫn** thay vì evaluate wasm. Chỉ có nghĩa sau khi codemode được port, nên phải đi cùng `execute.ts` chứ không đứng một mình. | — (rỗng) |

> `KEEP_OMP` cho `config.ts` / `cli.ts` / `index.ts` / `main.ts` / 4 `package.json`: xem `3.3` — hai bên
> trùng **tên** nhưng khác **vai trò**.

### 3.3. KEEP_OMP — 8 dòng mới, đóng nốt tập diff thật

Bốn `package.json` và bốn file gốc `coding-agent/src` là phần của tập 60 **chưa từng được phân loại**
trong các lát trước. Đã mở cả hai bên:

| file | số đo | phán quyết | lý do | mất gì |
| --- | --- | --- | --- | --- |
| `agent/package.json` | 92L/2.838B ↔ 78L/2.195B | KEEP_OMP | Khác namespace (`@earendil-works/pi-agent` vs `@oh-my-pi/pi-agent`) và khác script build. | — |
| `ai/package.json` | 102L ↔ 164L | KEEP_OMP | `omp` khai thêm dependency (Rust FFI, omptype, catalog). | — |
| `tui/package.json` | 62L ↔ 104L | KEEP_OMP | `pi` phụ thuộc prebuild `.node`; `omp` build native vào binary. | — |
| `coding-agent/package.json` | 109L ↔ 573L | KEEP_OMP | `pi` build bằng `tsc`+`npm` và `--compile` **hai worker entrypoint riêng** (`image-resize-worker.ts`, `codemode/worker.ts`) — đúng cái mẫu `AGENTS.md` đã loại bỏ (issue #1011/#1027/#1150). `omp` 573 dòng là hệ build Bun. | — |
| `coding-agent/src/config.ts` | 607L/21.035B ↔ 247L/8.324B | KEEP_OMP | **Khác vai trò, cùng tên.** `pi`: path helpers + `detectInstallMethod` + `getSelfUpdateCommand` + đường QuickJS wasm. `omp`: tầng **discovery config file** (`getConfigDirs`, `findConfigFile`, `walkUpForPackageDir`). Self-update đã có ở `cli/update-cli.ts`. | `getQuickJSWasmPath`/`getCodemodeWorkerUrl` — nhưng đi kèm codemode (đã PORT). |
| `coding-agent/src/cli.ts` | **6L** ↔ 642L/26.989B | KEEP_OMP | File `pi` là shim 4 dòng `setupCli(); main(...)`. `cli.ts` của `omp` là worker-host entry mà `AGENTS.md` bắt buộc. | — |
| `coding-agent/src/index.ts` | 491L ↔ 82L | KEEP_OMP | Barrel của `pi` re-export từ `core/*` (mọi thứ `omp` đã xoá). Barrel `omp` hẹp đúng vì surface thật. | — |
| `coding-agent/src/main.ts` | 992L/35.140B ↔ 2.507L/101.493B | KEEP_OMP | `main.ts` của `omp` 2,5x, mang `bindProcessState`, `DisposableStack`, hydrate offline-first, kênh `notifs.push({kind:"warn"})`. | — |

### 3.4. KEEP_OMP — phần còn lại

Cột "mất gì" ghi `—` khi không mất năng lực nào.

#### `coding-agent/src/core/` (72 dòng)

| file | lý do | mất gì |
| --- | --- | --- |
| `agent-session.ts` | 155.189 B ↔ `session/agent-session.ts` 511.067 B (3,3x), mang `task/`, `collab/`, `irc-bridge`, checkpoints, cursor bridge. | — |
| `agent-session-runtime.ts` | `omp` giữ **một** `AgentSession` sống suốt, thay state tại chỗ, snapshot ~20 lát rồi rollback khi switch fail (`SESSION_CWD_CHANGE_REJECTED`); `pi` tạo lại session mỗi lần switch. File `pi` còn vi phạm `AGENTS.md` (`private` ×6, named import `node:fs`). | `/import <path.jsonl>` lúc runtime — `omp` chỉ làm được lúc launch qua `--resume`. Đề xuất: port riêng một hàm thành lệnh `/import`. |
| `cache-warmer.ts` | 16.846 ↔ `session/cache-warmer.ts` 22.248; cùng job, bản `omp` đã lớn lên. | — |
| `compaction/compaction.ts` | 36.370 ↔ `agent/src/compaction/` 17 file / 254 KB, gồm `compaction-v2-streaming`, `openai.ts`, `anthropic.ts`. | — |
| `compaction/utils.ts` | 5.809 ↔ 13.561. | — |
| `compaction/branch-summarization.ts` | `omp` mạnh hơn ở request/telemetry (Tokenizer thay `estimateTokens`, span OTEL, limiter per-provider, `stripReadSelector`, cắt toolResult vô dụng trước khi trừ ngân sách). | 3 guard thật của `pi`: reject summary `stopReason==="length"`, error khi response chứa toolCall, và "Additional focus" **append** mặc định (bản `omp` hard-replace, phá scaffold Goal/Progress/Next-Steps). |
| `event-bus.ts` | Diff thật: `pi` 795 B dùng `EventEmitter` + `console.error` (cả hai bị `AGENTS.md` cấm); `omp` 1.367 B dùng `#listeners` Map + `logger.error` + thêm `emitSubagentFrame`. | — |
| `exec.ts` | 2.419 ↔ `exec/exec.ts` 1.070 + `session/bash-runner.ts`. | — |
| `extensions/loader.ts` | 27.197 ↔ `extensibility/extensions/loader.ts` 22.111 + `discovery/` + `plugins/loader.ts`; bản `omp` là hậu duệ đã migrate. | — |
| `extensions/runner.ts` | 51.250 ↔ 75.659 (1,5x), mang hệ hook/capability của `omp`. | — |
| `extensions/wrapper.ts` | **98% file trùng khớp từng dòng**; phần lệch là tầng preflight (`LOOP_DISPATCH_CONTEXT`, `runToolCallPreflightBefore/After`, `cancelPreflight`) mà `omp` chưa có — nhưng nó gọi 4 method trên `ExtensionRunner` mà `omp` **không hề có**, copy nguyên sẽ compile và no-op im lặng. | 2 cửa kiểm soát runner (gate trước approval, thay thế kết quả sau thực thi) trước approval. |
| `extensions/types.ts` | 81.892 ↔ 73.840, và bản `omp` là cái loader + legacy-pi shim thật sự import. | Trục exposure/loadout (điểm nối codemode), hook render entry/markdown, `ProjectTrust` thật, nhóm event prompt/select/stream. File `pi` có 14 chỗ `any`. |
| `keybindings.ts` | Tương đương thật là `tui/src/app-keybindings.ts` 667 dòng (lớn hơn 401 dòng của `pi`), và `getKeybindings()` của shim resolve tới đúng file đó. `omp` giải conflict Windows/macOS lúc **runtime** qua `userBindingClaimsKey()`; `pi` giải lúc compile. | Guard "new-style wins" khi config chứa cả `interrupt` lẫn `app.interrupt` — `omp` gán vô điều kiện rồi `writeKeybindingsConfig()`, nên kết quả phụ thuộc thứ tự chèn key và bị persist. |
| `mcp-servers.ts` | Lý do gốc sai đơn vị đo (10.219 **dòng** của 1 file vs "21 files" của 1 thư mục; quy về dòng thì `omp` ~8.700). Nhưng hình dạng 1 file 10K dòng trong `core/` là bằng chứng **ngược lại** với COPY_PI. | **Chưa xác minh được** — cây `pi` đã bị xoá lúc chạy. Xem `3.6`. |
| `messages.ts` | `pi` đã **xoá** `core/` từ 23/01/2026 (rename → `session/messages.ts`); blob `9e311e9b` ở **cả hai bên**, 44.236 B, `git diff` ra rỗng. | Không có gì — entry này rác, sinh từ path đã chết. |
| `model-registry.ts` | 6.951 B là facade mỏng forward 31 method; `omp` có `config/model-registry.ts` **137.175 B**, 3.291 dòng, 10 import `@oh-my-pi/pi-catalog`, 0 `ReturnType<>`. | Tầng virtual/native model — nhưng đã tách sang `PORT` ở `agent-session-services.ts`. |
| `model-resolver.ts` | 26.341 ↔ `config/model-resolver.ts` 95.018. | — |
| `model-config.ts` | Bản `omp` là 3 file validation trong `src/config/` cạnh **327.827 B** model-config khác (`model-registry` 137K, `model-resolver` 95K, `model-discovery` 47K…). Chọn 3/12 là cherry-pick phạm vi. | Chưa đọc được file `pi` — xem `3.6`. |
| `model-runtime.ts` | `config/model-settings.ts` là sổ khai báo settings cho settings-panel, không resolve; `config/service-tier.ts` là validate service tier. Thứ thật sự resolve là `config/model-registry.ts` + `AuthStorage`. | `setRuntimeApiKey` chỉ tồn tại trong `omp` dưới dạng doc comment tại `ai/src/auth/types.ts:925`, **không có implementation**. |
| `package-manager.ts` | **Không phải** trình tải binary như lý do gốc nói (grep `"fd"`/`registry.npmjs` ra 0). Là resource package manager: interface 15 method, phân giải 4 loại (`extensions\|skills\|prompts\|themes`) theo 3 scope. Nửa install đã bị `omp` thay bằng thứ tốt hơn (marketplace, `doctor()`). | Không có tầng resolution: `resourcePrecedenceRank`, `PackageFilter` 4 loại, `IGNORE_FILE_NAMES` (`.fdignore`/`.ignore`/`.gitignore`), `collectAncestorAgentsSkillDirs` dò ngược cây thư mục. `grep resourcePrecedence` trong `omp` ra rỗng. |
| `prompt-templates.ts` | Chênh lệch byte là **sự dịch chuyển file** (`parseCommandArgs`/`substituteArgs` đã tách sang `utils/command-args.ts`), không phải chất lượng. | Cú pháp `${1:-default}`/`${@:-default}` (regex `omp` không match được), `argumentHint` cho prompt template, `promptPaths`/`includeDefaults`, và `ResourceDiagnostic[]` hiện ra thay vì `logger.warn`. |
| `resolve-config-value.ts` | File `omp` **identical byte-for-byte** với bản `pi` ở `d1932a6f` → không thể nói "bản `omp` tốt hơn". Hướng thay đổi bị đảo: `pi` đã viết lại **từ** `pi-natives` **sang** `child_process`; `omp` giữ tổ tiên. | Không có interpolation `$VAR`/`${VAR}`/`$$`/`$!` — `$envExact` toàn-giá-trị nên header `"Bearer $TOKEN"` được gửi thẳng, fail âm thầm. Thiếu `*OrThrow`, chẩn đoán env thiếu, bypass cache khi credential xoay vòng. |
| `session-cwd.ts` | Guard thật của `omp` mạnh hơn: `directoryIsEnterable` (stat + `access(X_OK)`) tại `session/session-manager.ts:3491`, cộng `hasPositiveMovedProjectEvidence` (so dev+ino) phân biệt project bị rename với dir bị xoá. | Người dùng **không được hỏi** khi resume session ở project đã xoá — bị chuyển âm thầm sang thư mục khác mà không một dòng cảnh báo. |
| `session-export.ts` | Ba file `omp` được viện dẫn đều là chiều vào (đọc JSONL tool khác, import Claude/Codex, spill artifact) — không file nào serialize session của chính `omp`. | Không có branch linearization (`toJSONL`/`exportBranch`/`linearizeBranch` rỗng trong `omp`) và không export được session in-memory (`exportSessionToHtml` ném lỗi khi `getSessionFile()` rỗng, dù `getBranch()` không cần file). |
| `session-manager.ts` | 63.809 ↔ 140.311 B; `omp` superset về atomic rewrite fence (`#diskEpoch`, `#runFencedAtomicRewrite`), `SessionPersistenceIndeterminateError`, artifacts/blob, workspace dirs, turn budget, replication, redis backend. `pi` dùng `_rewriteFile()` + `writeFileSync` đồng bộ và `private` ×18. | `context_edit` — append-only model-context edit (ẩn/sửa một message trong context mà raw history không đổi). Ở `pi` nó ship ở 4 tầng kể cả `extensions/types.ts:934` (public API). `grep ContextEditEntry` trong `omp` ra rỗng. |
| `settings-manager.ts` | 48.376 ↔ `config/settings.ts` 154.870 (3,2x); bản `omp` là hậu duệ đã migrate. | — |
| `settings-diagnostics.ts` | `grep drainErrors`/`Invalid settings` trong `omp` ra rỗng; `config/settings.ts` chỉ `logger.warn` → nuốt lỗi. | Không có kênh cảnh báo khởi động cho settings hỏng (extension hỏng thì user thấy qua `formatExtensionLoadNotifications`, settings.yml hỏng thì im lặng). |
| `system-prompt.ts` (nội dung) | Nội dung prompt: `omp` có 89 file `.md` / 95 KB dưới `src/prompts/system/`; `AGENTS.md` cấm dựng prompt trong code, `pi` làm đúng việc đó. | — (cơ chế đã tách sang `PORT`) |
| `sdk.ts` | 16.994 ↔ 230.824 B (13,6x). | — |
| `resource-loader.ts` | 46.238 ↔ `sdk.ts` 230.824 mang `discoverContextFiles`, `discoverPromptTemplates`, `discoverSessionExtensionPaths`, `discoverSkills`. | — |
| `skills.ts` | 14.687 ↔ `extensibility/skills.ts` 19.860 + tool manage-skill + `skillshare/`. | — |
| `tools/bash.ts` | 15.012 ↔ 59.171 + `bash-interactive`, `bash-interceptor`, `bash-pty-selection`, `bash-worktree-rewrite`. | Seam `createShellToolDefinition` — nhưng shim `legacy-pi-coding-agent-shim.ts` đã tái tạo cùng seam cho find/ls/grep, và seam tổng quát đã ở `PORT` (`bash-executor.ts`). |
| `tools/read.ts` | 9.451 ↔ 105.287 + `read-archive`, `read-binary`, `read-pdf`, `read-sqlite`, `read-selector`, `read-summary`, `read-path-resolution`. | — |
| `tools/write.ts` | 3.554 ↔ 38.945 + `write-content`, `file-write-fallback`, `checkpoint`. | — |
| `tools/edit.ts` | `omp` thay 1 file bằng package `edit/` (blackbox, auto-repair, normalize, store, schemas); `pi` dùng typebox, `omp` dùng omptype. | — |
| `tools/grep.ts` | `pi` shell `rg` qua `child_process`; `omp` chạy native Rust, `tools/grep.ts` 42.438 B. | — |
| `tools/find.ts` | `pi` shell `fd` qua `child_process`; `omp` dùng `tools/glob.ts` trên `@oh-my-pi/pi-natives`. | — |
| `tools/ls.ts` | Bản `omp` trong shim là **facsimile bị cắt cụt**: thiếu hậu tố `/` cho thư mục (model không phân biệt được dir với file), thiếu byte truncation, notice chết, thiếu `ctx.cwd`. Nhưng chính shim đó đã import `truncateHead` và áp đúng pattern cho `find` ở dòng 664. | Xem `3.6` — đây là dòng đã bị phản biện từ KEEP_OMP. |
| `tools/renderers/ls.ts` | `omp` có 57 renderer ở `tui/src/tools/` và **không có** `ls.ts`; `legacyRenderResult` dùng chung cho 5 tool, bỏ qua `options.expanded`, không đọc `details`. | Preview thu gọn, keyHint mở rộng, cảnh báo truncation, `(limit N)` ở dòng call. Xem `3.6`. |
| `tools/path-utils.ts` | 3.626 ↔ `tools/path-utils.ts` 58.364, thêm internal-urls routing, WSL mount mapping, natives glob, `ToolAbortError`. | — |
| `tools/truncate.ts` | `tui/src/tools/streaming-output.ts` đã export `truncateHead`, `truncateTail`, `truncateHeadBytes`, `truncateTailBytes`, `DEFAULT_MAX_LINES`. | — |
| `tools/output-accumulator.ts` | `tui/src/tools/streaming-output.ts` 57.432 B làm bounded head/tail với byte-granular truncation + temp-file spill. | — |
| `tools/tool-definition-wrapper.ts` | 2.153 ↔ `extensibility/custom-tools/wrapper.ts` 18.466 + `tool-proxy.ts`. | — |
| `tools/powershell.ts` | File `pi` dùng typebox + `ReturnType<>` (cả hai bị cấm) → xem `3.6`. | **Không có tool PowerShell nào trong `omp`** — lỗ hổng Windows thật. Xem `3.6`. |
| `diagnostics.ts` | `ResourceDiagnostic` duy nhất của `omp` là `type: "error"\|"warning"\|"info"` + `message` + `path?` — **không có** field `collision`, có `"info"` ở chỗ `pi` có `"collision"`. | Xem `3.6`. |
| `usage-totals.ts` | Không có file `omp` tương ứng. `stats/aggregator.ts` là dashboard SQLite xuyên session; `task/index.ts` gộp usage của **task tool** (subagent), không phải session. | Panel `/session` chỉ có `Served: <model> ×N` — đếm số lần gọi, không có cost/token theo model. `session-stats.ts:173` cộng mọi `model_usage` vào `totalCost` nhưng không gán phần nào theo model, nên thêm breakdown hôm nay sẽ ra dòng **không cộng bằng** tổng. |
| `virtual-models.ts` / `trust-manager.ts` / `crash-log.ts` / `http-dispatcher.ts` / `project-trust.ts` / `bash-executor.ts` | — | Xem `3.2` (đã đổi sang `PORT`). |

#### `ai/src/` (92 dòng)

| nhóm | file | lý do | mất gì |
| --- | --- | --- | --- |
| `api/*` streaming (10) | `anthropic-messages`, `azure-openai-responses`, `bedrock-converse-stream`, `google-generative-ai`, `google-shared`, `google-vertex`, `openai-codex-responses`, `openai-completions`, `openai-responses`, `openai-responses-shared` | Cùng wire API, `omp` đã implement ở `providers/*` với 3–10x dung lượng: `openai-codex-responses` 1.697 (pi) vs 5.261 (omp), `openai-responses-shared` 810 vs 6.431. Đây là **hậu duệ, không phải tiền thân**. | — |
| `api/azure-openai-responses.ts` | — | Xem `3.6` (thiếu `normalizeAzureBaseUrl` + sàn `max_output_tokens: 16`). |
| `api/bedrock-converse-stream.ts` | — | Xem `3.6` (thiếu onResponse header pass-through + `requestId` trong chẩn đoán lỗi). |
| `api/google-shared.ts` | — | Xem `3.6` (thiếu signed-empty-block preservation). |
| `api/google-vertex.ts` (providers) | — | Xem `3.6` (thiếu `ApiKeyAuth.login` UX cho Vertex). |
| `api/lazy.ts` + 16 `*.lazy.ts` | `lazyApi()` là wrapper quanh `await import()` | `AGENTS.md` **cấm** dynamic import; `omp` Node/Bun-only và import static. Cả họ 16 file chết. | — |
| `api/constrained-sampling.ts` | `utils/schema/` của `omp` (normalize + strict-tool-validation + meta-validator) là implementation lớn hơn nhiều của cùng hợp đồng. | — |
| `api/cloudflare-ai-binding.ts` | `env.AI.fetch` cho code chạy trong workerd; `omp` là CLI, không có Workers host. | — |
| `api/simple-options.ts` | `buildBaseOptions`/`clampMaxTokensToContext` là per-provider assembly ở `omp`; context clamp ở `context-usage-runtime`/`session-maintenance`. | — |
| `api/pi-messages.ts` | `omp` có cả hai phía: `providers/pi-native-client.ts` + `pi-native-server.ts`. | — |
| `api/openrouter-images.ts` | `omp` có `ai/src/images/openrouter-images.ts` + auth-gateway images route. | — |
| `api/openai-prompt-cache.ts` | Clamp 64 ký tự đã là `normalizeOpenAIPromptCacheKey` trong `openai-shared.ts`, kèm cache-retention gating. | — |
| `api/github-copilot-headers.ts` | `omp` có `providers/github-copilot-headers.ts` (387 B vs 37 B) + parse key trong catalog. | — |
| `api/typesafe-system-one.ts` | `ai/src/judgment/typesafe.ts` phục vụ cả `typesafe` và `openrouter-decisions`. | — |
| `auth/types.ts` | 240 dòng (pi) ↔ 1.265 dòng (omp): cascade/pool/rank/rotation/usage-cache + sqlite-credential-store. | — |
| `auth/credential-store.ts` | Bản `pi` dùng `private` (bị cấm); `omp` có `auth/store.ts` + `auth-storage.ts` + `sqlite-credential-store.ts` với per-account rotation. | — |
| `auth/resolve.ts` | `auth/{cascade,policy,select,rank}.ts` của `omp` + pool + rotation. | — |
| `auth/context.ts` | Browser-safe probe dựng trên dynamic import biến thiên; `omp` đọc env qua `$env`. | — |
| `auth/helpers.ts` | `envApiKeyAuth`/`lazyOAuth` tồn tại để phục vụ mô hình descriptor+lazy của `pi`. | — |
| `auth/oauth/*` (8) | `anthropic`, `github-copilot`, `openai-codex`, `xai`, `kimi-coding`, `pkce`, `device-code`, `oauth-page` — `omp` có tất cả trong `registry/oauth/` (**~20 provider** so với 8 của `pi`). | — |
| `providers/*.models.ts` + `models.generated.ts` (40) | Bảng model sinh tự động; `catalog/src/models.json` là bảng duy nhất và `AGENTS.md` cấm bảng thứ hai. `omp` có 73 provider / 92 file KDL rule so với ~45 của `pi`. | — |
| `providers/<p>.ts` descriptor (30) | Descriptor 15–25 dòng gọi `createProvider()` — hàm không tồn tại trong `omp`. Chính sách của `omp` nằm ở KDL. | Xem `3.6` cho 8 provider `omp` thật sự thiếu (đã `PORT`). |
| `providers/{radius,radius-config,radius.models}.ts` + `auth/oauth/radius.ts` | Gateway thương mại của chính `pi` tại `radius.pi.dev`. `omp` không nên hardcode endpoint của đối thủ. | — (quyết định sản phẩm, xem `3.7`) |
| `utils/validation.ts` | 350 ↔ 2.234 dòng + 16 file `utils/schema/`. | — |
| `utils/retry.ts`, `provider-retry.ts` | `error/flags.ts` (status + text + retry-after + account/quota) + `oneshot-retry.ts` + `auth-retry.ts` + `utils/retry-after.ts`. | — |
| `utils/estimate.ts` | `agent/src/compaction/transcript-tokens.ts` chỉ tokenize phần tail chưa tính + có trust rules `hasContextTokenUsage`. | — |
| `utils/json-parse.ts` | `parseStreamingJsonThrottled` + `parseJsonWithRepair` từ `@oh-my-pi/pi-utils`. | — |
| `utils/node-http-proxy.ts` | `ai/src/utils/proxy.ts` của `omp` là dispatcher đầy đủ (net/tls, bypass local+metadata, timeouts, log credential-safe). | — |
| `utils/provider-env.ts` | Đã ở trung tâm `packages/utils/src/env.ts`; `AGENTS.md` yêu cầu mở rộng helper trung tâm, không fork. | — |
| `utils/error-body.ts` | `error/format.ts` + `utils/http-inspector.ts` (bắt body non-2xx, dump request thô) + rewrite per-provider. | — |
| `utils/model-operations.ts` | `modelKind()` của `omp` là superset (chat/tiny/image/tts/stt/search/judge/embedding/rerank/video). | — |
| `utils/abort.ts` | — | Xem `3.6` (thiếu `void promise.catch(() => {})` trước reject → unhandled rejection trong single-flight). |
| `utils/{abort-signals,text,headers,hash,uuid,sleep,models-error,pi-user-agent,diagnostics,typebox-helpers}.ts` | `AbortSignal.any`; provider transform; `getHeaderCaseInsensitive`; `Bun.hash`; Bun APIs; `error/`; `getAppName`; logger trung tâm; `@oh-my-pi/omptype` (thay typebox + cấm `any`). | — |
| `utils/{overflow,assistant-message-frame,transcript,sanitize-unicode}.ts` | — | Xem `3.6` (4 gap thật, đều nhỏ nhưng cụ thể). |
| `session-resources.ts`, `providers/faux.ts`, `api/{transform-messages,cloudflare,system-one-shared,llama-cpp-classify,mistral-conversations,cloudflare-workers-ai-system-one}.ts` | — | Đã `PORT`, xem `3.2`. |
| `index.ts`, `types.ts`, `models.ts`, `models-store.ts`, `env-api-keys.ts`, `images*.ts`, `providers/all.ts`, `providers/{cloudflare-auth,cloudflare-stream,opencode,opencode-headers}.ts`, `compat.ts`, `legacy-api-aliases.ts`, `cli.ts`, `oauth.ts`, `bun-oauth.ts`, `bedrock-provider.ts`, `image-models.ts`, `model-catalog.ts`, `providers/data-json.d.ts`, `compat/extension-oauth-types.ts` | `models.ts` của `pi` là facade `createProvider`; `omp` tương đương là `catalog` + `ai/src/registry/{registry,build,derived}.ts` với chính sách ở KDL. `compat.ts` tự ghi trong header là bị xoá cùng migration. `cli.ts` dùng `new Promise` + `console.*` (cả hai bị cấm). | — |

#### `tui/src/` (30 dòng) và `agent/src/` (8 dòng)

| file | lý do | mất gì |
| --- | --- | --- |
| `tui.ts` (1.493↔3.633), `terminal.ts` (554↔2.319), `markdown.ts` (1.021↔3.750), `editor.ts` (2.472↔4.416), `image.ts` (127↔868), `select-list.ts` (273↔684), `settings-list.ts` (328↔874), `stdin-buffer.ts` (444↔935), `keys.ts` (1.401↔567 + `keybinding-matchers`) | `pi` bị vượt ở mọi lớp component. `keys.ts`: `omp` có `parseKittySequence(): ParsedKittySequence` có cấu trúc thay cho `decodeKittyPrintable` phẳng. | — |
| `latex.ts` | 1.506 dòng 1 file ↔ `latex-block.ts` 1.449 + `latex-to-unicode.ts` 2.203 = 3.652. | — |
| `terminal-image.ts` | 731 dòng ↔ `terminal-capabilities.ts` 1.555 có `enum ImageProtocol` **kể cả Sixel**, registry ~20 terminal, `imageFallback`, cộng `kitty-graphics.ts` + `render/sixel.ts` + `TerminalGraphicsDecoder`. | — |
| `tui-alt-screen.ts`, `tui-main-screen.ts` | `pi` tách 2 mode (1.750 + 655); `omp` đã gộp cả hai vào `TUI` 3.633 dòng. | — |
| `fuzzy.ts` | `pi` 138 dòng TS thuần; `omp` 441 dòng + gọi `fuzzyFind` native. | — |
| `word-navigation.ts` | `omp` `utils.ts:522-690` có `getWordNavKind`/`isWordNavJoiner`/`moveWordLeft`/`moveWordRight` phân 5 lớp kể cả CJK; `vim.ts:1` đã bind. | — |
| `layout.ts`, `layout-node.ts`, `native-platform.ts`, `native-module-path.ts`, `native-modifiers.ts`, `undo-stack.ts`, `terminal-colors.ts`, `components/{mouse-region,alt-screen-flash}.ts` | Hạ tầng riêng của kiến trúc `TuiAltScreen` của `pi`; `omp` dùng Rust FFI (`packages/natives`) + `components/layout/` 1.095 dòng + `#undoStack` sẵn có trong `components/editor.ts:662`. `AGENTS.md`: hai hiện thực cùng thứ là bug. | Xem `3.6` — `terminal-colors.ts` đã bị phản biện. |
| `index.ts` | `pi` 186 dòng barrel đặt tên; `omp` 74 dòng dùng `export * from` 40 module — đúng quy tắc barrel của `AGENTS.md`. | — |
| `utils.ts`, `autocomplete.ts`, `alt-screen-search.ts`, `colors.ts` | — | Đã `PORT`, xem `3.2`. |
| `agent/src/{agent-loop,agent,types,proxy,index}.ts` | 940↔3.844 / 613↔2.067 / 529↔1.219 / 406↔432 / 152↔hẹp hơn. Vòng lặp `omp` có thêm live-steering, speculative execution, turn budget. | — |
| `agent/src/harness/**` (106 file) | `omp` **không có** `packages/agent/src/harness/`. `harness/tools/` → `coding-agent/src/tools/`; `harness/session/` → `session/`; `harness/runtime/` → `modes/`; `harness/pico3/**` (40 file, ~7.700 dòng) gắn `@earendil-works/chord` ^0.87.1 mà `omp` không có. Đây là relocation, không phải capability. | Kiến trúc lane/CRDT của `pi` — nhưng `omp` đã có câu chuyện remote riêng (`collab/` relay AES-256-GCM, `launch/`, `ssh/`, `utils/src/acp/`) theo hướng *nhân bản state*. |

#### `coding-agent/src/{cli,extensions,modes,utils,bun}/` (100 dòng)

| nhóm | lý do | mất gì |
| --- | --- | --- |
| `cli/args.ts` | 459↔390 dòng; pi-only `--exclude-tools/--list-models/--approve/--no-context-files` vs ~25 omp-only. `omp` route argv qua `cli/flag-tables.ts` riêng. | Chỉ cách viết `--approve` (thay bằng `--auto-approve`); các flag kia đã chuyển vào settings. |
| `cli/{auth-check,auth-command,credential-print,list-models,session-picker,startup-ui,file-processor,initial-message,project-trust,setup}.ts` | `omp` có bản tiến hoá tương đương: `auth-broker-cli`, `auth-gateway-cli`, `login-cli`, `models-cli`, `tui/overlays/session-selector.ts` (cache lowercase search haystack — sửa đúng lỗi search lag), `startup-splash` + `startup-composer` + `progress-hud`. `file-processor.ts` của `omp` thêm `convertFileWithMarkit`, `probeVideo`, contact sheet, `MAX_CLI_*_BYTES`. `initial-message.ts` của `omp` có guard `hasInitialContext` trả sớm, tránh dòng trống thừa. `project-trust.ts`: `omp` enforce cùng quyết định qua `isProjectTrusted()` + `projectTrusted` trên SettingsManager. | — |
| `modes/interactive/components/*.ts` (45) | 27/45 có bản cùng tên ở `tui/src/{chat,overlays,chrome,prompt,status-line}/`; 18 map sang năng lực `omp` giữ dưới tên khác (`showUserMessageSelector`, `parseSkillInvocation`, `CustomEntry`, `submenu`, `isWsl`, `USER_AGENT`, `extractArchive`, `fetchWithRetry`). `interactive-mode.ts` 6.899 dòng ↔ 7.483 + **18.489 dòng / 18 controller**. | — |
| `modes/interactive/components/{armin,daxnuts,earendil-announcement,pi-logo}.ts` | Branding/easter egg của `pi` (XBM art, hex RGB, PNG thông báo blog, wordmark). | — |
| `modes/rpc/rpc-{client,mode,types}.ts`, `modes/{index,print-mode,json-event}.ts`, `modes/rpc/jsonl.ts` | 617↔1.392 / 819↔1.760 / 303↔648. Export duy nhất của `pi` là `RpcSlashCommand` = `RpcAvailableSlashCommand` của `omp` (đổi tên). `modes/index.ts` của `omp` cố ý **không** kéo print/RPC-server/ACP-server vào bundle TUI. | — |
| `utils/git.ts` | `AGENTS.md`: `@oh-my-pi/pi-natives/vcs` là cách duy nhất chạy git/jj. Bản `pi` hand-roll 226 dòng. Chép là vi phạm trực tiếp. | — |
| `utils/child-process.ts`, `utils/shell.ts`, `utils/zip.ts` (đọc ở `3.1`) | `omp` có native `executeShell`/`Shell`/`PtySession`/`TtyWriter`; `AGENTS.md` bắt `` $`cmd` ``. | `utils/zip.ts` đã `COPY_PI` — xem `3.1`. |
| `utils/{ansi,text,syntax-highlight,html,paths,mime,json,frontmatter,sleep,open-browser,clipboard-command,highlight-js.d.ts,image-process,image-resize-core,image-resize-worker,tool-result-images,fs-watch,management-http,version-check,pi-user-agent}.ts` | Đã có bản trung tâm/native mạnh hơn: Rust `truncateToWidth`/`wrapTextWithAnsi`/`highlightCode`/`htmlToMarkdown`; `utils/src/{mime,frontmatter,json,fetch-retry,browsers,dirs}.ts`; `cli/update-cli.ts` mạnh hơn `version-check.ts` (channel canary/latest, chặn draft/prerelease, verify expected-tag URL). | — |
| `utils/{photon,image-convert,exif-orientation}.ts` | Gắn `@silvia-odwyer/photon-node` WASM; `photon.ts` còn **patch `fs.readFileSync`** để lách đường dẫn wasm trong binary Bun. `omp` dùng API ảnh built-in của Bun + pipeline Rust. | — |
| `utils/{clipboard,clipboard-image,image-resize}.ts` | 144↔422 / 240↔native / 123↔453. `omp` thêm `ImageResizeOptions`/`ResizedImage`/`formatScreenshot`/`minDimension: 200` (né 400 của Anthropic với ảnh 1x1) + `excludeWebP`/`decodeFailed`. | — |
| `utils/deprecation.ts` | 14 dòng, thân hành chỉ có `console.warn(chalk.yellow(...))` — bị `AGENTS.md` cấm. Xem `3.6`. | — |
| `extensions/mcp/*` (11) | `omp` `coding-agent/src/mcp/` có 22 file / ~8.700 dòng, thêm `smithery-auth`, `transports/`, `tool-cache`, `tool-bridge` (`createMCPToolName`, `deduplicateMCPToolsByName`, `DeferredMCPTool`, `MCPReconnect`), `oauth-discovery.ts` (RFC 9728), `timeout.ts`. `slash-commands/helpers/mcp.ts` còn sửa case silent-failure của `/mcp test|resources|prompts`. | `resources.ts` đã `PORT` — xem `3.2`. |
| `extensions/llama/{index,ui}.ts` | `index.ts` là shell theo `ExtensionCommandContext` của `pi`; `ui.ts` 542 dòng dùng `private debounce: ReturnType<typeof setTimeout>` (vi phạm cả hai). Phần lõi đã `PORT`. | — |
| `bun/runtime-setup.ts` | `process.title = APP_NAME` đã ở `cli.ts:54`; `setBedrockProviderModule` đã ở `ai/src/providers/register-builtins.ts:41`. Riêng `process.emitWarning = (() => {})` là **regression** (giấu warning thật của Node). | — |

### 3.5. SKIP

Ba nhóm: **hạ tầng kiến trúc của `pi`** mà `omp` cố ý không mang; **vendor/plumbing trỏ về `pi`**;
và **905 file example/test/bench/docs** (chiếm 57% vũ trụ quyết định).

#### 3.5.1. Ngăn `coding-agent/src/experimental/` — 52 file, SKIP cả ngăn

Đây là **một quyết định kiến trúc, không phải 52 quyết định lướt file**. Nó dựng trên 4 package mà
`omp` **không có**: `chord` (CRDT), `pi-server`, `pi-client`, `pi-agent-core/harness` (chứa `pico3`).
22/52 file import trực tiếp các package đó; phần còn lại (`mini/`, `micro/`, `coordinator.ts`) cần
`HarnessEvent`/`LaneSnapshot`/`pico3` hoặc 11 component của `pi/modes/interactive`.

| nhóm | nội dung |
| --- | --- |
| `experimental/{cli,client,client-runtime,client-tui,client-tui-chat,commands,server,session-worker,session-worker-manager,process}.ts` | Chord remote client/server. |
| `experimental/services/*` (14) | Token/provider của Chord. Suy ra theo mẫu từ `connection.ts` + `server.ts` đã đọc — toàn bộ là DI token, không đọc từng file không đổi kết luận. |
| `experimental/mini/**` (13) | `HarnessEvent`/`LaneSnapshot` — primitive của `pi-agent-core/harness`, `omp` không có khái niệm lane. |
| `experimental/micro/**` (7) | Pico3 harness agent (README: "built on the experimental Pico3 harness"). `omp` có `tiny/` 16 file thay nhánh này. |
| `experimental/radius-{auth,relay}.ts`, `experimental/{radius,plugin}.ts`, `experimental/plugins/*` | Radius là gateway của `pi`; facet plugin là hệ riêng. |
| `experimental/{coordinator,coordinator-entry}.ts` | Supervisor unix-socket. `omp` có `launch/broker.ts` + `collab/registry.ts`; bản `pi` dùng typebox + 5 `new Promise()` (bị cấm). |
| `experimental/{source-resolver}.ts` | Đã đổi sang KEEP_OMP: `extensibility/plugins/marketplace/source-resolver.ts` 7.211 B xử lý relative/git/github/git-subdir/npm với timeout clone 30′ trên `pi-natives/vcs`. |

#### 3.5.2. Barrel và shim trì hoãn

| file/nhóm | lý do |
| --- | --- |
| `core/{index,experimental,compaction/index,extensions/index,tools/index,tools/renderers/index}.ts`, `extensions/index.ts`, `ai/src/{index,oauth,bedrock-provider}.ts` | Barrel thuần cho cây `core/` mà `omp` đã bỏ; `AGENTS.md` yêu cầu `export *` nhưng chỉ trong barrel có thật. |
| `core/experimental.ts`, `cli/experimental/*`, `experimental/{cli,micro/main,mini/main}.ts` | Gating `PI_EXPERIMENTAL=1` và DSL argv của `pi`. `AGENTS.md` đặt `cli/flag-tables.ts` + `utils/command-args.ts` là bộ phân tích argv duy nhất — bộ thứ hai là "hai hiện thực cùng thứ". |
| `ai/src/{compat,legacy-api-aliases,model-catalog,image-models,typebox-helpers,providers/data-json.d.ts}.ts`, `auth/oauth/load.ts` | Scaffolding back-compat của riêng `pi`. `compat.ts` tự ghi trong header là bị xoá cùng migration. `auth/oauth/load.ts` dùng variable specifier để bundler không đi vào `node:http` — mẹo browser-safety dựa trên dynamic import (bị cấm). |
| `core/bug-report.ts`, `core/bug-report-upload.ts`, `core/radius.ts`, `core/remote-catalog-provider.ts`, `core/pi-manifest.ts` | Vendor/plumbing trỏ về dịch vụ `pi` (`pi.dev`, `radius.pi.dev`) hoặc manifest `@earendil-works`. Không phải năng lực. |
| `core/provider-attribution.ts` | Bảng host→provider hardcode (`OPENROUTER_HOST`, `NVIDIA_NIM_HOST`, `CLOUDFLARE_AI_GATEWAY_HOST`, `OPENCODE_HOST`) — đúng hình dạng `AGENTS.md` cấm và giao cho `packages/catalog/src/compat/rules/`. |
| `migrations.ts` | `find migrations` trong `omp` ra rỗng, nhưng `omp` đã có stencil + `cli/update-cli.ts` — hợp nhất vào đó chứ không thêm file. |

#### 3.5.3. 905 file example / test / bench / docs

Đây là **57% vũ trụ quyết định** và gần như toàn bộ là `SKIP`. Với chúng "giữ bản của `omp`" gần
như luôn đúng, vì đó không phải mã chạy. Phân bố: `coding-agent/examples` 84 · `test/` (cả 4 package)
300+ · `ai/src/providers/*.models.ts` đã tính ở trên.

Không có file test nào nào trong số này được xếp `PORT`. Đây là điểm cần nói rõ: tiêu chí trong
đề bài là "nếu bạn đánh dấu một file test là PORT, hãy chắc chắn" — và sau khi soi 6 lát cắt, **không
file test nào đáng port**. Bốn nhóm `coding-agent/test/fixtures/skills/*.md` còn **giống hệt
byte-for-byte**, tức đã hội tụ và không cần gì.

#### 3.5.4. 11 file prod-src chưa ai phân loại (đóng nốt ở lát này)

Đây là **toàn bộ** phần prod-src còn sót. Tất cả `SKIP`:

| file | lý do |
| --- | --- |
| `ai/scripts/{generate-models,model-data,check-model-data,models-dev-reasoning-options,openrouter-catalog,openrouter-reasoning-options}.ts` (6) | Codegen của `pi` sinh ra `*.models.ts` + `models.generated.ts` — chính cơ chế bảng model thứ hai mà `AGENTS.md` cấm. `omp` thay bằng `packages/catalog/scripts/generate-models.ts` từ stencil/OpenCode. |
| `agent/scripts/generate-telemetry-docs.ts` | Sinh docs telemetry; `omp` không ship docs sinh tự động kiểu đó. |
| `{agent,ai,coding-agent,tui}/tsconfig.build.json` (4) | Cấu hình build; `omp` dùng tsconfig khác (`tsconfig.workspace.json`). |
| `agent/vitest*.config.ts` (3), `ai/bedrock-provider.d.ts` | Cấu hình test runner / shim khai báo. |

---

## 4. Bảng phản biện

36 hàng bị đổi phán quyết trong các lát trước. Điểm chung: **lý do gốc thường là "khác nhau chứ
không phải tệ hơn"**, hoặc **so sánh nhầm file** (bao giờ cả nhầm cả đường dẫn), hoặc **dùng byte
count như tiêu chí chất lượng**. Dưới đây là các hàng đã đổi, rút gọn còn mệnh đề cốt lõi.

### 4.1. Đổi vì tiền đề sai (không tồn tại "bản của omp" để so)

`omp` **không có** `packages/coding-agent/src/core/` lẫn `.../experimental/` (đã xoá 23/01/2026,
flatten 252 file). Generator đã xếp nhầm cả hai cây chết vào `DIFF_SRC`. Các hàng này thuộc
`ONLY_PI_SRC`, mặc định là `COPY_PI` trừ example/test/docs — nên `KEEP_OMP` về mặt nhãn là
**category error**: định nghĩa của nó là "bản `omp` tốt hơn… và bạn đang từ chối một năng lực".

| file | trước | sau | vì sao |
| --- | --- | --- | --- |
| `core/agent-session-runtime.ts` | KEEP_OMP | **SKIP** | Lý do nêu ra nói về file khác (155K `agent-session.ts` tách 4 file con — nhưng `pi` không có 4 file con đó, và `agent-session.ts` của `omp` là 511K). `omp` mạnh hơn thật (một session sống, rollback khi switch fail) nhưng không phải vì lý do đó. Còn `/import <path.jsonl>` là năng lực thật mà `omp` thiếu → đề xuất port riêng thành lệnh. |
| `core/auth-guidance.ts` | KEEP_OMP | **PORT** | File không tồn tại ở `omp`. `COPY_PI` cũng chết: `getDocsPath()` trỏ `docs/providers.md` của `pi` → copy không compile. Giá trị thật là **consolidation**: `pi` có 4 importer, `omp` có cùng nội dung rải 4 chỗ với 4 cách diễn đạt. |
| `core/diagnostics.ts` | KEEP_OMP | **PORT** | `ResourceDiagnostic` của `omp` (`extensibility/legacy-pi-coding-agent-shim.ts:923`) là `type: "error"\|"warning"\|"info"` + `message` + `path?` — **không có** field `collision`, có `"info"` ở chỗ `pi` có `"collision"`. Shape hẹp hơn hẳn. `capability/index.ts:271` đã nắm cả winner lẫn loser qua `_source.path`; chỉ thiếu bước ghi record. |
| `core/messages.ts` | KEEP_OMP | **SKIP** | Path đã bị `pi` **xoá** từ 23/01/2026 (rename → `session/messages.ts`). Con số "5206" không khớp file nào. Lý do trích `MessageCountOptions`/`Tokenizer` — nhưng đó là shim của `omp` trong `legacy-pi-coding-agent-shim.ts:20-25`, không phải "pi đã re-implement". Entry rác. |
| `core/mcp-servers.ts` | KEEP_OMP | **PORT (tạm)** | Đơn vị đo lệch (10.219 **dòng** vs "21 files"), lý do thuần "khác nhau", và hình dạng monolith 10K dòng là bằng chứng **ngược** với COPY_PI. **Chưa xác minh được nội dung** — xem `3.6`. |
| `core/model-registry.ts` | KEEP_OMP | **PORT** | Byte 6.951 nhỏ vì file là facade forward; đo mặt nạ chứ không đo phần cài đặt. Bản `pi` không vi phạm `AGENTS.md` nên không có lý do kỹ thuật nào để loại. |
| `core/model-runtime.ts` | KEEP_OMP | **PORT** | Lý do nêu sai file: `config/model-settings.ts` là sổ khai báo settings cho settings-panel, `config/service-tier.ts` là validate tier — **không** resolve model. Thật sự resolve là `config/model-registry.ts` + `AuthStorage`. |
| `core/nested-tool-calls.ts` | KEEP_OMP | **SKIP** | `parentToolCallId` của `omp` là trục **subagent** (`RpcSubagentSnapshot`, options trong `task/executor.ts`) — nối agent con về tool `task`. File `pi` là chiều khác: tool gọi tool trong cùng session qua `ctx.executeTool()`. `omp` thiếu hẳn (`grep nestedCalls` ra rỗng; `CustomToolContext` không có `executeTool`). Trùng tên ở hai pipeline khác nhau không phải parity. |
| `core/settings-diagnostics.ts` | KEEP_OMP | **PORT** | `omp` nuốt lỗi settings vào `logger.warn` → không sở hữu error surface, trong khi `pi` có kênh diagnostics. |
| `core/telemetry.ts` | KEEP_OMP | **SKIP** | Mô tả sai: 515 B **không** re-export gì từ `pi-ai`; toàn bộ là `isTruthyEnvFlag` + `isInstallTelemetryEnabled` — cổng consent phone-home tới `https://pi.dev/api/report-install`. Ba file `omp` được viện dẫn nằm trên trục khác (OTEL export). Attribution headers thì `omp` **đã có** ở `ai/src/utils/openrouter-headers.ts`. Đúng bucket là SKIP: vendor plumbing, không phải nợ parity. |
| `core/usage-totals.ts` | KEEP_OMP | **PORT** | Không có file `omp` tương ứng. Gap thật: `/session` chỉ đếm số lần gọi, không có cost/token theo model; `session-stats.ts:173` cộng mọi `model_usage` vào `totalCost` nhưng không gán theo model → thêm breakdown hôm nay sẽ ra dòng **không cộng bằng** tổng. |
| `core/package-manager.ts` | KEEP_OMP | **PORT** | "install fd/rg" **không tồn tại** (grep `"fd"`/`registry.npmjs` = 0). Là resource package manager 15 method. Nửa resolution (`resourcePrecedenceRank`, `PackageFilter` 4 loại, `IGNORE_FILE_NAMES`, dò ngược cây thư mục) `omp` thiếu hẳn. |
| `core/model-config.ts` | KEEP_OMP | **PORT (chưa xác minh)** | Verdict lập khi bằng chứng so sánh đã biến mất. Xem `3.6`. |
| `core/prompt-templates.ts` | KEEP_OMP | **PORT** | Chênh lệch byte là **sự dịch chuyển file**, không phải chất lượng. Gap thật: `${1:-default}`, `argumentHint`, `promptPaths`/`includeDefaults`, `ResourceDiagnostic[]`. |
| `core/session-cwd.ts` | KEEP_OMP | **PORT** | `session/date-cwd-reminder.ts` không liên quan (giữ prompt byte-stable để không phá prefix cache). `foreign-session-import.ts` có guard nhưng chỉ áp cho import Claude/Codex và **im lặng** tự chuyển. Gap thật: người dùng không được hỏi. |
| `core/session-export.ts` | KEEP_OMP | **PORT** | Ba file `omp` được viện dẫn đều là chiều vào. Gap thật: không có branch linearization, không export được session in-memory. |
| `core/session-manager.ts` | KEEP_OMP | **PORT** | Lý do "63809 vs 140311" là bằng chứng phạm vi. Phần đế vẫn đúng (`omp` superset về atomic fence). Nhưng `KEEP_OMP` âm thầm bỏ `context_edit` — năng lực ship ở 4 tầng, kể cả public extension API. Ba "đối chiếu gần nhất" của `omp` đều **thay raw history**, ngược hướng với `context_edit`. |
| `core/resolve-config-value.ts` | KEEP_OMP | **PORT** | File `omp` **identical byte-for-byte** với bản `pi` ở `d1932a6f` → không thể nói "bản `omp` tốt hơn". Hướng lịch sử bị đảo: `pi` đã viết lại **từ** `pi-natives` **sang** `child_process`; `omp` giữ tổ tiên. |
| `core/bash-executor.ts` | KEEP_OMP | **PORT** | Lý do nêu sai: file **không** import `child_process` (chỉ `node:crypto|fs|os|path`). Hai tầng khác nhau nên size vô nghĩa. Nhưng `pi` có seam public thật (`BashOperations` + 3 implementation đi kèm), còn `grep operations` trong `tools/bash.ts` của `omp` ra 0 — không có chỗ cắm. |
| `core/extensions/types.ts` | KEEP_OMP | **PORT** | "81892 vs 73840" không phải bằng chứng (chênh lệch nằm ở capability `omp` thiếu). Bản `pi` có 14 chỗ `any` + typebox + import đuôi `.ts` → bằng chứng PORT. Hai bên phân kỳ **hai chiều**, không bên nào superset (108 vs 111 member). |
| `core/extensions/wrapper.ts` | KEEP_OMP | **PORT** | So sánh nhầm file: `extensibility/extensions/wrapper.ts` là **19.771 B trên `pi`** so với 18.466 của `omp` — chiều đảo ngược. 141 dòng đầu trùng khớp từng dòng; phần lệch là tầng preflight gọi 4 method `omp` không có → copy sẽ compile và **no-op im lặng**. |
| `core/compaction/branch-summarization.ts` | KEEP_OMP | **PORT** | Hai file cùng 382 dòng, chênh 159 B — không phải tiêu chí. Ba guard thật của `pi` bị thiếu (reject `stopReason==="length"`, error khi response chứa toolCall, "Additional focus" append mặc định). |
| `core/output-guard.ts` | **COPY_PI** | **PORT** | "Không có bản tương đương" sai: `modes/acp/acp-mode.ts:42` có `isolateProtocolStdout()`. "Không làm hỏng TUI" bị đảo — `main.ts:646` chỉ takeover khi `appMode !== "interactive"`. Bug thật bên `pi`: `String(chunk)` trên `Uint8Array` ra `"226,130"`, hỏng dữ liệu. Gap thật chỉ là **coverage**: `print-mode.ts` và `rpc-mode.ts` không cô lập stdout. |
| `core/tools/file-mutation-queue.ts` | **COPY_PI** | **PORT** | "0 import" sai (có 2). Và lý do cốt lõi đã có: `write.ts:441` + `edit/index.ts:328` khai `readonly concurrency = "exclusive"`, `agent-loop.ts:3604` chain mọi tool exclusive — mạnh hơn queue per-path. Gap thật: `task` không nằm trong tập exclusive → race giữa sub-agent. Ba vi phạm `AGENTS.md` (named import, `new Promise`, `let releaseNext!`). |
| `core/tools/ls.ts` | KEEP_OMP | **PORT** | Bản `omp` trong shim là facsimile bị cắt cụt — thiếu hậu tố `/` cho thư mục, thiếu byte truncation, notice chết, thiếu `ctx.cwd` — trong khi chính shim đó đã áp đúng pattern cho `find` ở dòng 664. |
| `core/tools/renderers/ls.ts` | KEEP_OMP | **PORT** | Lý do nêu sai: `tui/src/tools/find.ts` vẽ hit + line-range, **không bao giờ** render danh sách thư mục. Gap thật: preview 20 dòng + keyHint + cảnh báo truncation. |
| `core/tools/renderers/bash.ts` | KEEP_OMP | **SKIP** | Đây là `ONLY_PI_SRC`, không phải DIFF — `omp` không có `core/` lẫn `renderers/`. Nhãn đúng là SKIP ("`omp` cố ý không muốn"), không phải KEEP_OMP ("`omp` tốt hơn"). |
| `utils/wsl.ts` | KEEP_OMP | **COPY_PI** | Chỉ 15 dòng của `pi`; `omp` có `isWsl()` ở `utils/src/env.ts:49` đọc `WSL_DISTRO_NAME`/`WSL_INTEROP`. Bản `pi` thêm sniff `/proc/version` — không đáng để từ chối. |
| `utils/windows-self-update.ts` | KEEP_OMP | **COPY_PI** | Lý do nêu sai: "grep Quarantine" trúng chỗ không liên quan, và nói `omp` xử lý cả binary lẫn tarball — nhưng `cli/update-cli.ts` **không** có nhánh Windows Defender. Đọc `process.report.getReport().sharedObjects`, rename-then-recopy `.node` vào `node_modules/.pi-native-quarantine`. 84 dòng, chỉ `node:fs|path|crypto`. |

### 4.2. Đổi vì `pi` vi phạm `AGENTS.md` (bằng chứng cho PORT theo hard rule)

| file | vi phạm | ảnh hưởng |
| --- | --- | --- |
| `api/mistral-conversations.ts` | 6 import pi-only | Không copy được; `/conversations` là API chưa có trong `KnownApi` → cần KDL api entry. |
| `ai/src/utils/overflow.ts` | — | 25-regex provider table bị `error/flags.ts` `OVERFLOW_PATTERNS` + check usage-backed supersede; nhưng case Xiaomi-MiMo (length + 0 output + input đầy window) là mới. |
| `ai/src/utils/assistant-message-frame.ts` | — | Reducible frame codec với `toolcall_checkpoint`; `omp` có session persistence nhưng **không có frame reducer**. |
| `ai/src/utils/transcript.ts` | — | `declarationsEqual`/`hasToolRedefinitions` phát hiện tool trùng tên bị định nghĩa lại — `diffAnthropicActiveTools` của `omp` chỉ so tập tên. |
| `ai/src/utils/sanitize-unicode.ts` | — | `omp` chỉ strip surrogate lẻ **bên trong** `providers/anthropic.ts`; `pi` áp cho mọi provider serialize output (images, mistral). |
| `ai/src/auth/oauth/{openrouter,meta}.ts` | — | `omp` có API key cho OpenRouter nhưng **không có** OAuth login; Meta có catalog rule nhưng không có module OAuth. |
| `ai/src/providers/{ant-ling,cloudflare-workers-ai,moonshotai,moonshotai-cn,qwen-token-plan,qwen-token-plan-cn,qwen-token-plan-individual,zai-coding-cn}.ts` (8) | descriptor `createProvider()` — hàm không tồn tại trong `omp` | Xác minh 8 tên này vắng mặt trong `models.json` (0 hit). Đường đi: `providers/*.kdl` + `CATALOG_PROVIDERS` + regen. **Chưa chứng minh được là nên có** — xem `3.7`. |

### 4.3. Đổi vì lý do là byte count hoặc "khác nhau"

`ai/src/api/*` streaming (10 file), `ai/src/utils/validation.ts`, `tui/src/components/*`,
`agent/src/{agent-loop,agent,types}.ts`: đều giữ `KEEP_OMP`, nhưng **lập luận gốc không đứng được**
— size đo phạm vi, không đo chất lượng. Kết luận giữ được vì diff thật cho thấy `pi` là **tiền thân
nhỏ hơn** ở những file này (`openai-codex-responses` 1.697 vs 5.261; `tui.ts` 1.493 vs 3.633),
không phải vì "bản `omp` tốt hơn" nói chung.

---

## 5. Còn chưa chắc

### 5.1. Ba hàng **không đọc được file `pi`** — verdict chỉ là tạm

`%TEMP%` bị dọn giữa lúc chạy, xoá mất `pi-check`. Ba hàng sau được chấm **khi bằng chứng so sánh
đã biến mất**, nên phải coi là chưa xác minh:

| file | trạng thái | cần làm gì để đóng |
| --- | --- | --- |
| `core/mcp-servers.ts` | `PORT` **tạm thời**, dựa trên hình dạng file + cấu trúc `omp`, **không** dựa trên nội dung. | Mở lại `pi@4259686d`, grep `elicitation` / `completions` / `logging/setLevel`. Đo được trên `omp`: có resources/subscribe, templates, prompts/list+get, roots/list, notifications, SSE, HTTP transport, PKCE, structuredContent, sampling. **Thiếu**: elicitation (0 hit trong `src/mcp/`), `completions/complete` (0 hit toàn `src/`), `logging/setLevel` (0 hit toàn `src/`). Nếu file `pi` có 3 thứ đó thì KEEP_OMP đang âm thầm bỏ 3 năng lực thật. |
| `core/model-config.ts` | `PORT` **chưa xác minh**. | Cần trả lời 3 câu: (a) validate config file hay resolve/select model lúc runtime; (b) có nhánh `id.includes("claude")` / lookup model-name nào không; (c) mất năng lực gì. Đã loại bằng chứng: `models-config-schema-bundle.ts` **không** phải build artifact — nó là source viết tay, dựng schema lười bằng omptype trong `once()`. |
| `core/diagnostics.ts` (đã `PORT`) | Đọc đủ, nhưng kết luận dựa trên `ResourceDiagnostic` duy nhất của `omp` ở shim. | Xác nhận không còn shape `collision` ở `capability/index.ts`. |

Cùng cảnh báo cho `core/extensions/wrapper.ts`: diff lấy từ `main` hiện tại (`d1932a6f`) chứ không
phải revision ghim, vì `pi-check` đã mất. Cần xác nhận lại ở `4259686d` trước khi port.

### 5.2. Chỗ tôi **suy ra theo mẫu**, không đọc từng file

| nhóm | cỡ | tiêu chí suy ra, có thể kiểm lại |
| --- | --- | --- |
| 40 `providers/<p>.models.ts` + `models.generated.ts` | ~40 | Đọc 3 mẫu, cả 14 dòng đều là object literal sinh tự động → SKIP đồng loạt. |
| 16 `api/*.lazy.ts` | 16 | Đọc `lazy.ts` + `anthropic-messages.lazy.ts`; 4 dòng mỗi file, cùng cơ chế `lazyApi(() => import(...))` → SKIP đồng loạt. |
| 40 `providers/<p>.ts` descriptor | ~40 | Đọc 6 mẫu đại diện; đối chiếu từng tên provider với `models.json` + thư mục KDL. 8 tên vắng mặt thật sự → PORT; phần còn lại có mặt → KEEP_OMP. |
| 45 `modes/interactive/components/*.ts` | 45 | Quét khớp tên + grep mục tiêu cho 18 file không khớp tên. **Tôi không mở cả hai bên của từng cặp.** |
| 32 `utils/*.ts` của coding-agent | 32 | Đối chiếu export list của `packages/natives/native/index.d.ts` (`highlightCode`, `htmlToMarkdown`, `vcs*`, `executeShell`/`PtySession`, `readImageFromClipboard`, `truncateToWidth`, `expandWindowsLongPath`) với import từng file + grep cho 8 file không khớp tên. **Không diff từng file.** |
| 52 `experimental/**` | 52 | Đọc 3 README + import graph của cả 52 file; 22/52 import trực tiếp package `omp` không có. Quyết định cả ngăn, không phải từng file. |
| 106 `agent/src/harness/**` | 106 | Xác minh trực tiếp `omp` **không có** `packages/agent/src/harness/`; đọc kỹ `harness/utils/*` + `compaction` + `pico3/membrane.ts`, còn lại suy từ tên thư mục khớp 1-1 với `coding-agent/src/{tools,session,modes}/`. |
| 905 example/test/bench/docs | 905 | Đây là nhóm SKIP theo định nghĩa, nhưng tôi **không mở từng file**. Rủi ro thấp về mặt kỹ thuật, cao về mặt thống kê: nếu có file test chứa assertion đáng giữ thì tôi đã bỏ sót. |

### 5.3. Rủi ro của chính việc suy ra

Ba rủi ro cụ thể, theo mức độ:

1. **Grouped row có thể che mất một file đáng PORT.** Ví dụ `agent/src/harness/session/** (~30 file) | SKIP`
   gộp 30 file thành một dòng. Nếu một file trong đó chứa năng lực thật mà `omp` thiếu, dòng đó
   đã nuốt mất nó. Đây là dạng rủi ro mà bảng per-file không có.
2. **Ba hàng ở `5.1` có thể đổi nhãn.** Đặc biệt `mcp-servers.ts`: nếu `pi` có elicitation +
   `completions/complete` + `logging/setLevel`, đó là 3 năng lực thật đang bị từ chối.
3. **Con số 1.415 trong đề bài đã sai**, nên mọi tỷ lệ tính trên nó cũng sai. Nếu có lát cắt nào
   khác dùng lại con số đó, nó đang dựa trên tiền đề hỏng. Script sinh `DIFF_SRC` nên được sửa
   (so khớp path → kiểm tra path có thật sự tồn tại ở cả hai bên) trước khi chạy lại.

### 5.4. Hai quyết định **cần người quyết**, không phải tôi

| việc | vì sao không phải quyết định kỹ thuật |
| --- | --- |
| `radius` (SKIP cả 3 file + OAuth) | Gateway thương mại của `pi` tại `radius.pi.dev`. Tôi cho rằng `omp` không nên hardcode endpoint của đối thích, nhưng đây là quyết định sản phẩm. |
| 8 provider "chưa có" | Tôi chứng minh được là `omp` **chưa có** (0 hit trong `models.json`). Tôi **không** chứng minh được là nên có — phần lớn là endpoint khu vực, và `omp` đã có 73 provider cùng loại. |
| Có gate consent cho attribution header không | `omp` không có consent gate cho attribution headers. Đó là thay đổi chính sách, cần consent flow và quyết định default — không phải một bản copy. |



