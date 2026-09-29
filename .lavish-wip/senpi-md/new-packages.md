# senpi — 2 package mới (`senpi-codemode`, `pty`) + 2 crate Rust + `session-backends`

Ngày đo: **2026-09-28**.
omp HEAD khi đo: `a43749d`. senpi HEAD: `ea92162` (2026-09-28). pi HEAD: xem `git -C ../pi-ref log -1`.

Lệnh lặp lại được nếu bạn đọc lại sau 6 tháng:

```bash
SEN=/Users/tranquangdang21/Projects/senpi-ref
OMP=/Users/tranquangdang21/Projects/ultraworkers
PI=/Users/tranquangdang21/Projects/pi-ref
git -C $SEN log -1 --format='%H %ad' --date=short
ls $SEN/packages
```

---

## TÓM TẮT ĐIỀU HÌNH ĐƯỢC

Bốn mục bạn giao, kết luận ngắn:

| Mục | Kết luận |
| --- | --- |
| `packages/senpi-codemode` | **KHÔNG chép — omp đã có, và lớn hơn.** Lấy 4 ý tưởng: kernel Ruby/Julia, prompt đa-dialect, renderer code-preview, skill `bun-1-4`. |
| `packages/pty` | **KHÔNG chép — omp đã có `PtySession` Rust + đã tự viết lại xterm/headless.** Lấy 2 ý tưởng: queue thao tác màn hình, pipe-fallback. |
| `crates/senpi-grep` + `crates/senpi-pty` | **KHÔNG lấy code.** Lấy đúng 1 ý tưởng: `grep()` native nhận `AbortSignal`. |
| `packages/session-backends` | **KHÔNG ĐÁNG LẤY — dead code ở cả senpi lẫn pi, và `src/` giống hệt từng byte.** |

**Điều quan trọng nhất bài này:** tiền đề "hai package mà `pi` không có" **chỉ đúng với một nửa**. `pi` **có** `session-backends`. Và điều đáng sợ hơn: **omp đã có sẵn cả hai thứ senpi "mới"** — `packages/coding-agent/src/eval/` (18.480 dòng, 59 file) chính là codemode, và `crates/pi-natives/src/pty.rs` chính là PTY. Nếu bạn chạy `cp -r` từ senpi, bạn sẽ **ghi đè một hệ thống lớn hơn bằng một bản nhỏ hơn và cũ hơn**.

---

## 0. Kiểm lại tiền đề (đọc phần này trước)

### 0.1 `session-backends` KHÔNG phải package mới — `pi` đã có

```bash
ls $PI/packages/          # -> có session-backends
ls $SEN/packages/         # -> có session-backends
```

Cả hai đều là `session-backends/sqlite-node/`. Đo số dòng:

```bash
find $SEN/packages/session-backends -type f | xargs wc -l | tail -1   # 4528
find $PI/packages/session-backends  -type f | xargs wc -l | tail -1   # 4403
```

Chênh 125 dòng — nhưng `src/` thì **giống hệt từng byte**:

```bash
diff -r $PI/packages/session-backends/sqlite-node/src \
        $SEN/packages/session-backends/sqlite-node/src
# (không in gì) — 0 dòng khác
```

Xác nhận bằng md5 trên 33/34 file (trừ `changes.md`):

```bash
# md5 manifest, chỉ khác 3 dòng:
#   > AGENTS.md        (senpi thêm mới, pi không có)
#   > CHANGELOG.md
#   > package.json
```

Diff `package.json`:

```
- "name": "@earendil-works/pi-session-backend-sqlite-node",  version 0.87.1
+ "name": "@earendil-works/pi-storage-sqlite-node",           version 2026.9.28-3
- "build": "tsc -p tsconfig.build.json"   + "build": "tsgo -p tsconfig.build.json"
- vitest 4.1.9                            + vitest 5.0.1  + "private": true
```

Khác biệt **100% là version pin + tên**, không phải logic.

### 0.2 `session-backends` là dead code ở CẢ HAI vế

```bash
git -C $SEN grep -n 'pi-storage-sqlite-node' -- '*.ts' '*.tsx'
# -> (rỗng)
git -C $SEN grep -n 'pi-storage-sqlite-node' -- '*.json' | grep -v package-lock
# -> chỉ package.json tự khai tên
```

Không file `.ts` nào của senpi import nó. Chính `changes.md` của senpi cũng thừa nhận:

> `packages/session-backends/sqlite-node/changes.md:24`
> *"The package is private and nothing in the shipped `senpi` CLI imports it."*

Điều đáng chú ý thêm, trong cùng file đó: senpi từng **bỏ** schema SQLite giàu của fork (lanes/records/facts/writer-leases, `branch-cache.ts`, `search-backend.ts`) để quay về `SqliteSessionRepo` đơn giản của upstream. Đây là ví dụ đẹp cho việc fork giữ code chết có giá.

**`omp` không có `session-backends`:**

```bash
git -C $OMP ls-files | grep -i 'session-backends'
# -> (rỗng)
```

omp giữ session ở `packages/coding-agent/src/session/session-manager.ts` + `packages/durable/`.

### 0.3 Kiểm lại mối JSONL (điều mang tính nền tảng)

| Claim trong tiền đề | Kết quả đo hôm nay |
| --- | --- |
| `parseJsonlLenient` ở `packages/utils/src/stream.ts:575` | **Đúng.** `grep -n` ra `575:export function parseJsonlLenient<T>(...)` |
| `pi` ném `JsonlCorruptionError` ở `durable/.../storage.ts:119` | **Đúng.** Lớp khai báo ở dòng 80; **chỗ ném** là dòng 119, trong hàm `parseJson` |
| `session-manager.ts:1882` set `#rewriteRequired` | **Sai dòng, đúng cơ chế.** File thật là `src/session/session-manager.ts` (không phải `src/core/`). `#rewriteRequired = true` xuất hiện ở **14 chỗ**: 978, 1106, 1203, 1229, 1317, 1326, 1350, 1410, 1416, 1425, 1796, 1887, 2210, 2439 |

Kết luận JSONL **giữ nguyên**: omp tự lành, `pi` ném. Nhưng lưu ý: **không mục nào trong bài này chạm vào session layer**, nên rủi ro JSONL không phát sinh khi lấy bất kỳ thứ gì ở trên. Rủi ro chỉ nằm ở chỗ khác: chép đè `src/eval/`.

---

## 1. `packages/senpi-codemode`

### 1.1 Đo

```bash
find $SEN/packages/senpi-codemode/src -type f | xargs wc -l | tail -1   # 21179
find $SEN/packages/senpi-codemode/test -type f | xargs wc -l | tail -1  # 29820
git -C $SEN ls-files packages/senpi-codemode | grep -E '\.tsx?$' | xargs wc -l | tail -1  # 45840
```

Tách theo đuôi (chỉ `src/`):

| Đuôi | File | Dòng |
| --- | --- | --- |
| `.ts` | 117 | 14.498 |
| `.js` | 24 | 3.363 |
| `.py` | 1 | 1.167 |
| `.jl` | 2 | 672 |
| `.rb` | 3 | 535 |
| `.md` | 13 | 944 |
| **tổng `src/`** | **~160** | **21.179** |

Test nặng hơn src gần 1,4×. `package.json`:

```json
"name": "@code-yeongyu/senpi-codemode",
"description": "Source-only senpi extension package for codemode evaluation tools",
"private": true,
"pi": { "extensions": ["./src/index.ts"] },
"dependencies": { "@babel/parser": "8.0.4", "@earendil-works/pi-ai": "^2026.9.28-3", "typebox": "1.3.34" }
```

Ba điều đáng chú ý: (a) `private: true`; (b) là **extension**, không phải lõi; (c) phụ thuộc `@earendil-works/pi-ai` — **cùng tên scope với `pi-ai` của pi/omp**, xác nhận quan hệ gốc.

### 1.2 Có phải là "codemode" không? — CÓ

Đúng nghĩa: agent viết code thay vì gọi tool từng lệnh một. Cơ chế thật, có đường dẫn:

1. **Đăng ký tool tên `eval`.** `src/index.ts:29` import `createEvalTool` từ `./tool/eval-tool.ts`; `src/index.ts:86` `pi.registerTool(...)`.
2. **Bốn kernel bền vững.** `src/kernels/{js,py,rb,jl}/` — mỗi ngôn ngữ một thư mục gồm host TS + runner/prelude nhúng. README (`packages/senpi-codemode/README.md:38-45`):

   | Ngôn ngữ | Mặc định | Runtime |
   | --- | --- | --- |
   | `js` | bật | worker in-process (Bun hoặc Node ≥24) |
   | `py` | bật | `python3` / `python` |
   | `rb` | tắt | `ruby` |
   | `jl` | tắt | `julia` |

   Trạng thái sống sót giữa các cell cùng ngôn ngữ tới khi reset/restart/dispose.
3. **Code trong kernel GỌI LẠI tool của agent.** Đây là mấu chốt. Bridge JSONL một frame một dòng, `src/bridge/protocol.ts` (232 dòng), với các message `kernel-tool-describe` / `kernel-tool-describe-reply` / `kernel-tool-invoke` / `kernel-tool-invoke-reply`. Bơm phía host: `src/kernels/js/kernel-tools-host.ts:22` `class KernelToolHostPump` — `describe()` và `invoke()` đều là **promise chờ reply khớp `requestId`**. Bên trong kernel, tool lộ ra như global `tool.<name>(args)` — README dòng 44: *"composing active tools through `tool.<name>(args)`"*.
4. **Detach theo timeout.** Cell tính toàn lâu trả về handle và chạy tiếp trong kernel cũ; kết quả được bơm ngược vào hội thoại. `eval({action:"peek"|"stop", cell_id})` để soi hoặc giết. Máy trạng thái: `src/tool/detached-cell-{manager,state,snapshot,notification}.ts` (quản lý 314 dòng).
5. **Bridge HTTP loopback có bearer auth**, khung JSONL giới hạn. `src/bridge/http-server.ts` (247 dòng).

Nói gọn: thay vì model phát 12 lệnh tool, model viết 1 cell Python gọi `tool.read(...)` 12 lần trong vòng lặp, rồi trả 1 kết quả.

### 1.3 Điều bạn chắc chắn muốn biết: **omp đã có sẵn, và lớn hơn**

```bash
find $OMP/packages/coding-agent/src/eval -type f | xargs wc -l | tail -1   # 18480
find $OMP/packages/coding-agent/src/eval -type f | wc -l                  # 59
```

Tách đuôi: `ts` 56 file / 14.304 dòng · `py` 2 file / 3.544 dòng · `txt` 1 file / 632 dòng.

Cấu trúc hai bên đối chiếu:

| Vai trò | senpi `senpi-codemode/src/` | omp `coding-agent/src/eval/` |
| --- | --- | --- |
| Tool `eval` | `tool/eval-tool.ts`, `tool/types.ts` | `tools/eval.ts`, `eval/types.ts` |
| Kernel JS | `kernels/js/context-manager.ts` (376) | `js/context-manager.ts` (1.127) |
| Kernel Python | `kernels/py/kernel.ts` (356) + `prelude.py` | `py/kernel.ts` (402) + `runner.py` (2.418) + `prelude.py` (1.126) |
| Kernel Ruby | `kernels/rb/` (535) | **không có** |
| Kernel Julia | `kernels/jl/` (672) | **không có** |
| Bridge gọi tool | `bridges/agent-bridge.ts` (260) | `agent-bridge.ts`, `js/tool-bridge.ts` (347), `py/tool-bridge.ts` (294) |
| Registry kernel | `extension/session-manager.ts` (293) | `kernel-session-registry.ts` (495) |
| Renderer | `tool/render.ts` (**1.066**) | *(không thấy file render eval riêng)* |
| Workpool | `config/settings.ts` (`parallelPoolWidth`) | `workpool-bridge.ts`, `workpool-bridge` + `runner-cache.ts` |
| Judge | **không có** | `judgment-bridge.ts`, `judgment-batch-bridge.ts` (545) |
| Speculation | **không có** | `speculation/` (4 file, ~1.400) |
| Eval định nghĩa tool | **không có** | `eval.toolsEnabled` — cell định nghĩa tool để subagent gọi |
| Code mode theo model | prompt đa-dialect | `src/session/code-mode.ts` (120) — Codex `code_mode_only` |

Và omp **đã đặt tên làm "code mode"**:

```bash
sed -n '1,5p' $OMP/packages/coding-agent/src/session/code-mode.ts
# "Codex Code Mode: collapse the direct tool surface for code_mode_only models
#  to a small keep-set and expose every other session tool through the eval
#  bridge, mirroring codex-rs ToolMode::CodeModeOnly."
```

`CODE_MODE_KEEP_TOOLS` giữ `eval, ask, todo, yield, think, checkpoint, rewind, new_context` cùng các `__agent__ __budget__ __completion__ __wait__ __status__ __cancel__ __workpool__`. Prompt omp có sẵn: `packages/coding-agent/src/prompts/tools/eval{,-code-mode,-agents,-helpers,-judge}.md` (91 dòng) + `docs/tools/eval.md` (250 dòng).

**Nhận định:** hai bên đều gọi dep là `@earendil-works/pi-ai`, đều có tên `chord` trong workspace, đều có `session-backends/sqlite-node` giống byte — đây là **cùng một dòng code**. Và trong dòng đó, **omp đã đi xa hơn**. Không có lý do kỹ thuật nào để chép senpi sang.

### 1.4 Bốn thứ đáng lấy (đều là lỗ hổng thật của omp)

**(a) Kernel Ruby + Julia — `kernels/rb/` (535 dòng) và `kernels/jl/` (672 dòng).**
omp chỉ có js + py. Kiểm chứng phần tử thiếu:

```bash
git -C $OMP ls-files | grep -E 'eval/(rb|jl)/'
# -> (rỗng)
```

Cấu trúc mỗi kernel của senpi: `kernel.ts` (host) + `prelude.<ext>` + `runner.<ext>`, cộng chung `kernels/shared/subprocess-{kernel,contract,process,queue,run}.ts` (315 + 174 dòng) và `kernels/shared/runtime-asset.ts` đóng gói asset. Tức senpi **đã tách sẵn** lớp khung cho ngôn ngữ thứ năm.

**Nhưng omp thì chưa tách được như vậy** — đo lại:

```bash
ls $OMP/packages/coding-agent/src/eval/py/
# display.ts  executor.ts  index.ts  kernel.ts  prelude.py  prelude.ts
# runner.py  runtime.ts  spawn-options.ts  tool-bridge.ts
wc -l $OMP/packages/coding-agent/src/eval/py/spawn-options.ts   # 134
wc -l $OMP/packages/coding-agent/src/eval/kernel-base.ts          # 705
```

omp có `kernel-base.ts` (705 dòng) là lớp nền chung, nhưng phần spawn/transport vẫn nằm **trong thư mục `py/`** chứ chưa tách thành `shared/`. Nên thêm rb/jl vào omp nghĩa là **tách lớp khung trước, rồi mới viết kernel** — tốn hơn câu "chép 2 file vào".
*Giá:* trung bình, không phải thấp. *Mất nếu bỏ:* hai ngôn ngữ thực thi cho agent; người dùng làm Ruby/Julia không có đường vào kernel. *Mất nếu bỏ:* hai ngôn ngữ thực thi cho agent; người dùng làm Ruby/Julia không có đường vào kernel.

**(b) Prompt đa-dialect — `src/prompt/eval-prompt.ts:38-70`.**

```ts
export type EvalEmphasisStyle = "default" | "claude" | "codex" | "gpt" | "kimi";
```

Mỗi họ model một cách ra lệnh. Ghi chú của senpi tại `eval-prompt.ts:50-58` là bài học thật:

> `kimi`: *"Kimi K-series — maximum-emphasis POSITIVE imperatives (uppercase/bold DO-framing); all-caps NEVER prohibitions stay out because they make K-series overthink instead of comply."*

omp hiện dùng **một** prompt eval cho mọi model (`prompts/tools/eval.md`, 37 dòng). Đây là cải tiến có bằng chứng, chi phí thấp.
*Cần kiểm trước khi lấy:* regex `CLAUDE_MODEL_RE`, `GLM_MODEL_RE`, `KIMI_MODEL_RE`, `OPENAI_MODEL_RE` ở `eval-prompt.ts:41-44` vi phạm **AGENTS.md "Model/Provider Policy Lives in KDL"** của omp. Khi chép ý tưởng phải đưa điều kiện này về `packages/catalog/src/compat/rules/`, không nhân bản regex vào TS.

**(c) Renderer code-preview — `tool/render.ts` (1.066 dòng) + `tool/display-{code,js,js-ast,js-layout,js-mask,python,python-script}.ts`.**
Tôi **không tìm thấy** file render eval tương ứng trong omp:

```bash
git -C $OMP grep -ln 'renderEval' -- 'packages/coding-agent/src/**/*.ts'
# -> (rỗng)
```

Đây là khoảng trống có thật, và là thứ **nên lấy ý tưởng rồi viết lại** — 1.066 dòng render là điểm nóng hồi quân mà chính `src/tool/AGENTS.md:36` của senpi đã cảnh báo (*"highest-risk hotspot for regressions; changes there need render contracts first"*). Cặp `display-js.ts` + `display-js-mask.ts` (178 dòng mask) dùng `Bun.Transpiler` để tô highlight và **che bỏ phần code không liên quan** — chi tiết trình bày mà omp chưa có.
*Giá:* trung bình. *Mất nếu bỏ:* model thấy code của nó đúng như nó viết, thay vì một khối text tuần tự.

**(d) Skill `bun-1-4` — `src/skill/bun-1-4/SKILL.md` + 9 file `references/*.md`.**
Khi kernel chạy trên Bun ≥ 1.4, prompt eval trỏ model tới skill này bằng "MUST READ" trước cell js đầu tiên. Là pattern "model phải biết phiên bản runtime nó đang chạy" — chuyển được sang dạng rule cho `catalog`.
*Giá:* thấp (chỉ là file `.md` theo đúng quy ước AGENTS.md về prompt).

### 1.5 Kết luận `senpi-codemode`

**`lấy ý tưởng, viết lại` — KHÔNG chép, KHÔNG đụng `src/eval/`.**

- Chép nguyên xi sẽ **ghi đè 18.480 dòng của omp bằng 21.179 dòng có cấu trúc khác hẳn, thiếu workpool/judgment/speculation/eval-defined-tools**, và làm hỏng `session/code-mode.ts` vốn trỏ vào `__agent__ __budget__ __completion__ __wait__ __status__ __cancel__ __workpool__` — bảy tool nội bộ mà senpi không có.
- Chiến lược đúng: giữ nguyên `src/eval/` của omp, **vá 4 lỗ hổng** (rb, jl, dialect prompt, code renderer) bằng code viết tay theo đúng style omp.
- Điểm cần nhớ: senpi là **extension**, còn omp đã **hard-code** eval vào session. Muốn lấy gì từ senpi phải nhúng vào lõi, không cài như extension — chi phí tích hợp cao hơn một extension bình thường.

---

## 2. `packages/pty`

### 2.1 Đo

```bash
find $SEN/packages/pty/src  -type f | xargs wc -l | tail -1   # 2502
find $SEN/packages/pty/test -type f | xargs wc -l | tail -1   # 2392
git -C $SEN ls-files packages/pty | wc -l                      # 45
```

18 file src, tổng 2.502 dòng. `package.json`:

```json
"name": "@earendil-works/pi-pty", "private": true,
"description": "Typed PTY session loader for Senpi persistent terminals",
"dependencies": { "@xterm/headless": "6.0.0" }
```

**Một dependency duy nhất.** Bản chất: loader đóng gói, không phải hệ thống mới.

Các file chính:

| File | Dòng | Việc |
| --- | --- | --- |
| `src/screen.ts` | 319 | mô hình màn hình headless, feed/resize/replay đi qua **một hàng đợi tuần tự** |
| `src/registry.ts` | 315 | registry session: LRU, capacity cap, kill escalation |
| `src/session.ts` | 300 | `PtySession` public |
| `src/pipe-fallback.ts` | 295 | lùi về `child_process` khi không có native |
| `src/loader.ts` | 213 | dò prebuild theo `<platform>-<arch>` |
| `src/session-native.ts` | 125 | adapter native |
| `src/session-exit.ts` | 121 | chốt exit đúng-một-lần |
| `src/session-bun.ts` | 121 | nhánh Bun |
| `src/quarantine.ts` | — | cô lập binding hỏng |

### 2.2 Nó giải quyết gì mà `Bun.spawn` của omp chưa giải?

**Không giải quyết gì mới — omp đã có PTY Rust, chỉ là đặt chỗ khác.**

```bash
wc -l $OMP/crates/pi-natives/src/pty.rs    # 1127
grep -n 'PtySession' $OMP/packages/coding-agent/src/exec/bash-executor.ts | head
# 10:	PtySession,      <- import
# 438:	const session = new PtySession();
```

Bốn nơi omp đã dùng `PtySession`:

| File:line | Việc |
| --- | --- |
| `packages/coding-agent/src/exec/bash-executor.ts:438` | `executeUserShellPty()` — overlay PTY tương tác cho bash |
| `packages/coding-agent/src/tools/bash-interactive.ts:45` | phiên PTY tương tác |
| `packages/coding-agent/src/launch/broker.ts:794` | broker giữ `pty?: PtySession` |
| `packages/coding-agent/src/cli/claude-trace-cli.ts:719` | chạy trace |

API native của omp (`crates/pi-natives/src/pty.rs`, napi):

```
PtySession::new / start / start_argv / write / resize / kill
```

senpi (`crates/senpi-pty/src/lib.rs`): `NativePtySession::{new,write,resize,kill,wait_exit,wait,pid,process_group_id}` + `start_pty_session`.

**Gần như trùng.** Thứ duy nhất omp thiếu là `process_group_id` — nhưng **đã kiểm chứng: omp xử lý process group nội bộ, chỉ là không export**:

```bash
grep -n 'process_group\|setpgid\|setsid' $OMP/crates/pi-natives/src/pty.rs | head
# 274:	process_group_id: Option<i32>,
# 277:	if let Some(pgid) = process_group_id {
# 436:	let process_group_id = master.process_group_leader().filter(|pgid| *pgid > 0);
# 438:	let process_group_id: Option<i32> = None;
# 474:		terminate_pty_processes(&mut child, child_pid, process_group_id);
```

Vậy khác biệt này **không tồn tại** — senpi chỉ export ra, omp giữ trong Rust. Không phải lỗ hổng.

### 2.3 Và mô hình màn hình thì omp cũng đã tự viết

Đây là phát hiện khiến package này gần như vô dụng với omp. `packages/pty` phụ thuộc `@xterm/headless`. omp thì:

```bash
find $OMP/packages/utils/src/vterm -type f | xargs wc -l   # 1067
head -1 $OMP/packages/utils/src/vterm.ts
# /** Behavior-compatible reimplementation of @xterm/headless's used surface. */
```

| File | Dòng |
| --- | --- |
| `packages/utils/src/vterm/terminal.ts` | 773 |
| `packages/utils/src/vterm/buffer.ts` | 218 |
| `packages/utils/src/vterm/query-responder.ts` | 76 |

Và omp **không hề có** dep xterm:

```bash
grep -c 'xterm' $OMP/bun.lock          # 0
git -C $OMP ls-files '*.json' | xargs grep -l '@xterm/headless'
# -> (rỗng)
```

`vterm` đã được dùng ở `launch/terminal-output.ts`, `launch/broker.ts`, `tui/src/chat/bash-execution.ts`, `tui/src/tools/bash-interactive.ts`, `cli/claude-trace-cli.ts`.

**Hai triết lý đối lập đang đứng đối diện nhau:**

| | senpi | omp |
| --- | --- | --- |
| Mô hình terminal | phụ thuộc `@xterm/headless` 6.0.0 | tự viết lại 1.067 dòng, không dep |
| PTY native | crate riêng + native package riêng + `scripts/copy-pty-native.mjs` | nằm trong `pi-natives`, build một lần vào binary |
| Loader | `loadPtyNative()` dò prebuild theo platform, có thể trả `native: null` | không cần loader — binary đã chứa sẵn |

Nếu chép `packages/pty` sang omp, bạn sẽ **thêm lại dependency mà omp đã cố ý bỏ**, và phải dựng lại toàn bộ màn lưới prebuild/copy-binary mà omp đã dẹp bằng cách gộp vào `pi-natives`.

### 2.4 Hai ý tưởng đáng lấy

**(a) Hàng đợi thao tác màn hình — `packages/pty/src/screen.ts:1-14` + `screen-operations.ts`. ĐÃ XÁC NHẬN LÀ THIẾU.**

```ts
/**
 * Headless xterm screen model with serialized, flow-controlled writes.
 * Every terminal mutation (feed, resize, backlog replay) runs through one ...
```

với `MAX_PENDING_WRITE_CHARS`, `settleOperation()`, `sharedSettler`. Đây là chống race thật: `resize` chen vào giữa `feed` sẽ vỡ mô hình terminal.

Đã chạy phép đo trên `vterm` của omp:

```bash
grep -n 'settleOperation\|MAX_PENDING_WRITE\|settler\|queue' \
     $OMP/packages/utils/src/vterm/terminal.ts
# 116:		if (callback) queueMicrotask(callback);
```

**Một kết quả duy nhất, và nó là `queueMicrotask` cho callback — không phải hàng đợi thao tác.** omp không serialize `feed`/`resize`/`replay`. Đây là lỗ hổng có thật, không phải nghi ngờ. (Nhưng: chưa chứng minh omp *cần* nó — có thể mọi caller đều tuần tự hoá sẵn. Phải đọc call-site của `vterm` trước khi thêm.)

**Thứ đáng lấy thật sự ở đây là 1.067 dòng `vterm` của omp đã viết sẵn** để senpi phải thêm `@xterm/headless`. Ngược chiều, ý tưởng queue là thứ ngược lại.

**(b) Pipe-fallback — `packages/pty/src/pipe-fallback.ts:35-36`:**

```ts
const PIPE_FALLBACK_NOTE =
  "Running with child_process pipe fallback because no PTY backend is active; terminal screen state and resize are unavailable.";
```

omp đóng binary một lần nên ít gặp "không có native". Nhưng cặp (`pipe-fallback.ts` 295 dòng, `quarantine.ts`) cho thấy cách **cư xử khi binding native hỏng mà vẫn chạy được**, thay vì crash — đáng đọc để học, không nhất thiết phải chép.

*(Ghi chú: `crash_handler.rs` 21 KB đã tồn tại trong `pi-natives` của omp — phần "không chết khi native lỗi" có thể omp đã phủ ở tầng khác. Kiểm tra `grep -n 'quarantine\|fallback' crates/pi-natives/src/crash_handler.rs` trước khi kết luận là thiếu.)*

### 2.5 Kết luận `pty`

**`không đáng lấy` (như một package) — `lấy ý tưởng` cho 2 chi tiết ở 2.4.**

- Lý do chính: **omp đã có cả hai tầng** — PTY native (`pty.rs`, 1.127 dòng, 4 nơi dùng) và mô hình màn hình (`vterm`, 1.067 dòng) — trong khi senpi phải cộng thêm một package loader + một crate Rust + `scripts/copy-pty-native.mjs`.
- 2.502 dòng của senpi không bổ sung năng lực nào cho omp; nó chỉ đóng gói lại thứ omp đã có, theo cách tốn thêm dependency.
- Cái thật sự đáng xem là **consumer** bên trên: extension `terminal` của senpi, 8.260 dòng (`packages/coding-agent/src/core/extensions/builtin/terminal/`), với `monitor-registry.ts` 837 dòng, `tools/bash.ts` 438, `tools/monitor.ts` 240, `restore-session.ts` 290, `orphan-reaper.ts` 163. Đó là **terminal bền vững nhiều phiên** — một tính năng, không phải một package hạ tầng. Nên đưa sang M5 dưới dạng *"persistent multi-session terminal + monitor"*, tách khỏi câu hỏi package.

---

## 3. Hai crate Rust

### 3.1 Đo

```bash
find $SEN/crates/senpi-grep/src -name '*.rs' | xargs wc -l | tail -1   # 1929
find $SEN/crates/senpi-pty/src  -name '*.rs' | xargs wc -l | tail -1   # 1412
```

Tổng **3.341 dòng Rust** cho cả hai.

### 3.2 `senpi-grep` — 1.929 dòng

Napi export (`crates/senpi-grep/index.d.ts`):

```ts
export declare function grep(options: GrepOptions, signal?: AbortSignal): Promise<GrepResult>
export declare function __senpiGrepAbi1(): string
```

Cấu trúc: `search/{pass,read,sink,mod}.rs`, `matcher.rs`, `walk.rs`, `options.rs`, `cancel.rs`, `abort_signal.rs`, `tests/` (7 file).

Tiêu thụ bởi `packages/coding-agent/src/core/tools/grep/native-loader.ts` — dòng 8 ghi *"Keep aligned with crates/senpi-grep"*, dòng 113 kiểm `value.__senpiGrepAbi1() !== NATIVE_GREP_ABI_VERSION`.

### 3.3 `senpi-pty` — 1.412 dòng

`AGENTS.md` tự định nghĩa: *"the Rust/N-API native PTY implementation consumed by `packages/pty`"*. Xác nhận bằng import:

```bash
git -C $SEN grep -n 'pi-pty' -- '*.ts' | grep -v lock
# packages/coding-agent/src/core/extensions/builtin/terminal/manager.ts:6
# packages/coding-agent/src/core/extensions/builtin/terminal/runtime-session.ts:7
```

### 3.4 Senpi viết riêng hay tái dùng `pi-natives`? — **VIẾT RIÊNG, và đây là bằng chứng**

```bash
ls $SEN/crates/                                     # chỉ có senpi-grep, senpi-pty
cat $SEN/crates/senpi-grep/package.json | head -3    # "@earendil-works/senpi-grep-native"
cat $SEN/crates/senpi-pty/package.json  | head -3    # "@earendil-works/senpi-pty-native"
```

Không crate nào trong `crates/` của senpi import `pi-natives`. Ba dấu hiệu độc lập cho thấy đây là **code viết mới**, không phải tách từ upstream:

1. Tên package riêng (`senpi-grep-native` / `senpi-pty-native`), không phải `pi-natives`.
2. Sentinel ABI riêng: `__senpiGrepAbi1` / `__senpiPtyAbi1`, và `AGENTS.md` của cả hai crate ghi rõ *"ABI versioning is intentionally separate from CalVer"*.
3. Quy mô **nhỏ hơn nhiều** so với bản omp:

| Crate | senpi | omp (`crates/pi-natives/src/`) |
| --- | --- | --- |
| grep | **1.929** | **3.397** (`grep.rs`) |
| pty | **1.412** | **1.127** (`pty.rs`) |

Grep: senpi nhỏ hơn 43% → senpi's **không phải tập lớn hơn**; chỉ là một tập khác. PTY: senpi lớn hơn 25% nhưng là do tách `session_threads.rs` + `signals.rs` ra, và export thêm `process_group_id` (mà omp vẫn làm nội bộ — xem §2.2).

**omp đã có sẵn cả hai**, hào hơn:

```bash
wc -l $OMP/crates/pi-natives/src/grep.rs   # 3397
wc -l $OMP/crates/pi-natives/src/pty.rs    # 1127
```

API grep của omp (`packages/natives/native/index.d.ts`):

```ts
export declare function grep(options: GrepOptions, onMatch?): Promise<GrepResult>   // :1741
export declare function hasMatch(content, pattern, ignoreCase?, multiline?): boolean  // :1883
export declare function search(content: string|Uint8Array, options: SearchOptions): SearchResult  // :2616
```

### 3.5 Một ý tưởng duy nhất đáng lấy: `AbortSignal` cho grep native

Đây là khác biệt thật, không phải định dạng:

| | omp | senpi |
| --- | --- | --- |
| Chữ ký | `grep(options, onMatch?)` — callback từng match | `grep(options, signal?: AbortSignal)` |
| Hủy | **không có** | `AsyncTask<GrepTask>` + `cancel.rs` + `abort_signal.rs` |
| Tệp riêng | — | `src/cancel.rs`, `src/abort_signal.rs`, `src/tests/cancel.rs` |

**ĐÃ XÁC NHẬN LÀ THIẾU THẬT.** Chữ ký Rust của omp (`crates/pi-natives/src/grep.rs:2242`):

```rust
pub fn grep(
	options: GrepOptions<'_>,
	#[napi(ts_arg_type = "((error: Error | null, match: GrepMatch) => void) | undefined | null")]
	on_match: Option<ThreadsafeFunction<GrepMatch>>,
) -> task::Promise<GrepResult> {
```

```bash
grep -n 'AbortSignal' $OMP/crates/pi-natives/src/grep.rs
# -> (rỗng)
```

Cả file có **52** lần khớp `abort|Cancel|cancel`, nhưng không lần nào là tham số hủy cho `grep`. Con số 52 dễ gây ấn tượng nhầm là đã có sẵn. Kiểm tra kỹ cho thấy `abort()` tại `packages/natives/native/index.d.ts:359` thuộc **lớp shell session** (`run(options, onChunk?)` / *"Abort all running commands for this shell session"*) — không liên quan grep.

Grep trên cây lớn là tác vụ chạy lâu nhất trong loop. Hủy giữa chừng là khác biệt thật về hành vi quan sát được, không phải refactor.
*Giá:* thấp — bọ `AsyncTask` quanh hàm `grep` sẵn có, thêm đường hủy xuống `Cancel` token trong `search/`. *Mất nếu bỏ:* mọi lần grep sập thì phải chờ hết.

### 3.6 Kết luận hai crate

**`không đáng lấy` (code) — `lấy ý tưởng` cho `AbortSignal`.**

Cả hai năng lực omp đã có, trong crate lớn hơn, đã đóng gói vào binary, đã có test. Chép thêm hai crate Rust nghĩa là thêm 3.341 dòng Rust, hai `package.json` private, hai sentinel ABI, và một bước build native — để lấy thứ đã có, trừ đúng một tín hiệu hủy.

---

## 4. `packages/session-backends` — đã xử lý ở mục 0

Tóm lại: **pi có, giống byte, và là dead code ở cả hai.** Chi tiết đo ở §0.1–0.2.

Điểm duy nhất đáng ghi lại vì nó là bài học về fork: `changes.md` của senpi tự liệt kê những gì nó **xoá** khi quay về upstream — `storage/lanes.ts`, `storage/records.ts`, `storage/facts.ts`, `storage/writer-leases.ts`, `branch-cache.ts`, `search-backend.ts`, cùng test. Fork giữ code chết là một loại chi phí âm thầm mà không ai nhìn thấy trong diff hàng ngày.

---

## 5. Bảng tổng kết

| Package / crate | Dòng | omp đã có? | Phán quyết |
| --- | --- | --- | --- |
| `senpi-codemode/src/` | 21.179 (test 29.820) | **Có, lớn hơn** — `src/eval/` 18.480 | `lấy ý tưởng, viết lại` (4 mảnh) |
| `packages/pty/src/` | 2.502 (test 2.392) | **Có, đủ cả 2 tầng** — `pty.rs` + `vterm` | `không đáng lấy` (2 ý tưởng nhỏ) |
| `crates/senpi-grep` | 1.929 Rust | Có — `grep.rs` 3.397 | `không đáng lấy` (lấy `AbortSignal`) |
| `crates/senpi-pty` | 1.412 Rust | Có — `pty.rs` 1.127 | `không đáng lấy` |
| `session-backends` | 4.528 (chết) | Không có, cũng không cần | `không đáng lấy` |

## 6. Việc nên làm cho M5

Xếp theo giá/thời gian:

1. **Không `cp -r` gì từ `senpi-codemode` hay `pty`.** Cả hai đều đè lên thứ omp đã có.
2. **Vá 4 lỗ hổng codemode**, mỗi cái là một task nhỏ:
   - `eval/rb/` + `eval/jl/` — omp **chưa** có `shared/subprocess-*` tách riêng (xem §1.4a). Cần tách lớp khung từ `py/` trước.
   - Prompt đa-dialect — nhưng đưa điều kiện model về KDL, không nhân bản regex của senpi.
   - Renderer code-preview (syntax highlight + mask) — viết mới theo `render.ts` của omp, có contract test trước.
   - Skill `bun-1-4` — chỉ là `.md`, rẻ nhất trong bốn cái.
3. **`AbortSignal` cho native grep** — một task Rust độc lập, không đụng TS.
4. **Đưa `terminal` extension của senpi (8.260 dòng) vào backlog M5 như một tính năng** — persistent multi-session terminal + `monitor`. Đây mới là thứ omp thật sự chưa có. Đọc qua `packages/pty` là vô ích, phải đọc `packages/coding-agent/src/core/extensions/builtin/terminal/`.
5. **Ghi lại `session-backends` là dead code** trong tài liệu M5 để không ai đề xuất lấy.

## 7. Giới hạn của bài đo này

- Tôi **không** đọc `src/eval/` của omp từng file; kết luận "omp lớn hơn" dựa trên đếm dòng và đối chiếu tên file. Tên file cho thấy cùng vai trò, nhưng **chưa chứng minh** chất lượng tương đương. Trước khi bỏ senpi, nên đọc `src/eval/kernel-base.ts` (705 dòng) của omp bằng mắt.
- **§2.4(a) đã giải quyết:** `grep` trên `vterm/terminal.ts` cho đúng **một** kết quả (`queueMicrotask` cho callback, dòng 116) — omp thật sự không serialize thao tác màn hình. Vẫn chưa chứng minh omp *cần* nó; phải đọc call-site.
- **§3.5 đã giải quyết:** `grep -n 'AbortSignal' crates/pi-natives/src/grep.rs` → rỗng. `abort()` ở `index.d.ts:359` thuộc lớp shell session, không phải grep. Lỗ hổng `AbortSignal` là thật.
- **`process_group_id` đã giải quyết:** omp xử lý nội bộ (`pty.rs:274,277,436,474`), chỉ không export. **Không phải lỗ hổng.**
- **Chưa giải quyết:** ý tưởng pipe-fallback / quarantine (§2.4b) — `crash_handler.rs` 21 KB của omp có thể đã phủ tầng này. Chưa đọc.
- Tôi **không** kiểm lại ba mục "đã đo trước" còn lại (pi không MCP/ACP, chord không phải cơ chế vòng đời, gajae là fork) — chúng nằm ngoài phạm vi bài này và tôi không muốn xác nhận lại điều chưa tự đo.
