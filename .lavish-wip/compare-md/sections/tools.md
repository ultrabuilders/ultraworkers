## Miền: So sánh tầng tools / quyền / sandbox: omp vs 4 repo tham chiếu

Nguồn: đọc tại chỗ trên đĩa, không clone. Mọi khẳng định kèm lệnh đã chạy.

| repo | đường dẫn | file (git ls-files) |
| --- | --- | --- |
| omp | `/Users/tranquangdang21/Projects/ultraworkers` | 7.946 |
| pi | `/Users/tranquangdang21/Projects/pi-ref` | 1.935 |
| opencode | `/Users/tranquangdang21/Projects/opencode-ref` | 7.905 |
| codex | `/Users/tranquangdang21/Projects/codex-ref` | 8.693 |
| gajae | `/Users/tranquangdang21/Projects/gajae-ref` | 6.027 |

Lưu ý: đường dẫn opencode đúng là `tranquangdang21` (bản gõ `tranquanggard21` trong đề bài không tồn tại).

---

## 1. Cơ chế phê duyệt (approval)

Đo bằng: `git grep -l -iE "approv|permission" -- '*.ts' '*.tsx' '*.rs'` rồi đếm file thật sự thuộc lớp phê duyệt (không tính CHANGELOG, tài liệu kế hoạch, hay từ khóa trùng nghĩa).

| repo | có phê duyệt? | mô hình | file lõi | LOC |
| --- | --- | --- | --- | --- |
| **omp** | CÓ | 3 chế độ × 3 bậc | `packages/coding-agent/src/tools/approval.ts` | 387 (+959 test) |
| **codex** | CÓ | 4 chính sách × 3 chế độ sandbox | `codex-rs/core/src/tools/approvals.rs` | 889 (+237 test) |
| **opencode** | CÓ | ruleset action×resource | `packages/core/src/permission.ts` | 343 (+88 saved, +709 test) |
| **pi** | **KHÔNG** | — | `examples/extensions/permission-gate.ts` | 34 (example, không nạp mặc định) |
| **gajae** | **KHÔNG** | — | — | 0 |

### omp — 3 chế độ, 3 bậc

`packages/coding-agent/src/tools/approval.ts:16-17`

```ts
export type ApprovalPolicy = "allow" | "deny" | "prompt";
export type ApprovalMode = "always-ask" | "write" | "yolo";
```

Bậc năng lực, kém → mạnh (`approval.ts:99-103`): `read:0, write:1, exec:2`.
Mỗi chế độ gắn một bậc tối đa được phép chạy không hỏi (`approval.ts:120-124`):

| chế độ | bậc tối đa | nghĩa |
| --- | --- | --- |
| `always-ask` | `read` | hỏi cho mọi thứ trên `read` trở lên → tức là hỏi gần như mọi tool |
| `write` | `write` | cho `read`+`write` tự do, hỏi khi chạm `exec` |
| `yolo` | `exec` | không hỏi |

Ghi đè theo từng tool qua `tools.approval.<tên>`, và có `policyKey` cho sub-tool (ví dụ dispatch `xd://`). Có fallback fail-closed cho tên tool đã đổi.

Mặc định khi không cấu hình là **`yolo`** (`approval.ts:80`):
```ts
approvalMode: isApprovalMode(configured) ? configured : "yolo",
```
Đây là điểm đáng chú ý về mặt an toàn: cấu hình thiếu ⇒ chạy tự do.

Ngoài ra omp có **cổng phê duyệt qua ACP client** (`session/acp-permission-gate.ts`, 141 dòng) — khi một client ACP kết nối, tool `bash`/`edit`/`delete`/`move` bắt buộc hỏi, với 4 lựa chọn `allow_once` / `allow_always` / `reject_once` / `reject_always`. Đây là kênh phê duyệt *từ xa* mà không repo nào khác có.

Tài liệu: `docs/approval-mode.md` (162 dòng), có mục riêng "Computer safety" và "ACP sessions".

### codex — ma trận trực giao 4 × 3

`codex-rs/protocol/src/protocol.rs:986` — `AskForApproval`:
- `UnlessTrusted` — dự án không tin cậy thì lệnh phải được duyệt trừ khi có rule execpolicy cho phép
- `OnRequest` (mặc định) — model tự quyết định lúc nào hỏi
- `Granular(GranularApprovalConfig)` — 5 công tắc bật/tắt độc lập: `sandbox_approval`, `rules`, `skill_approval`, `request_permissions`, `mcp_elicitations`
- `Never` — không bao giờ hỏi

`codex-rs/protocol/src/config_types.rs:104` — `SandboxMode`: `ReadOnly` | `WorkspaceWrite` | `DangerFullAccess`.

Hai trục này **trực giao**: có thể vừa sandbox read-only vừa hỏi cả mọi thứ, hoặc full-access mà vẫn hỏi. Không repo nào khác tách được hai trục này.

Ngoài ra: `network_approval.rs` (1.254 dòng) — phê duyệt riêng cho **network access**; `mcp_tool_approval_templates.rs` (371 dòng) — phê duyệt riêng cho tool MCP.

### opencode — ruleset allow/ask/deny

`packages/schema/src/permission.ts:55`
```ts
export const Effect = Schema.Literals(["allow", "deny", "ask"])
```
`permission.ts:87` — `evaluate(action, resource, ...rulesets)` trả về `Rule`. Đây là mô hình **policy engine** (action + resource → effect), linh hoạt hơn tier cố định, nhưng không có khái niệm "bậc năng lực" nên không diễn tả được "chỉ hỏi khi tới bậc exec".

### pi — không có gì cả

Toàn bộ repo chỉ có 3 file liên quan permission, và **không cái nào** nằm trong đường chạy chính:
- `packages/coding-agent/examples/extensions/permission-gate.ts` (34 dòng) — nằm trong `examples/extensions/`, là extension do người dùng tự chọn
- `src/core/trust-manager.ts`, `src/core/project-trust.ts` — trust *thư mục dự án*, không phải trust *tool call*

Kiểm chứng: `git grep -l "ToolApproval" -- packages/agent/` trong pi → **0 kết quả**. Kiểu `ToolApproval` mà omp dùng **không tồn tại** trong pi-agent-core.

Nội dung example extension chỉ là 3 regex:
```ts
const dangerousPatterns = [/\brm\s+(-rf?|--recursive)/i, /\bsudo\b/i, /\b(chmod|chown)\b.*777/i];
```
Không nạp mặc định ⇒ omp có phê duyệt là **tự viết, không phải port từ pi**.

### gajae — không có gì cả

`git grep -niE "always-ask|approvalMode|askForApproval|yolo" -- '*.ts'` → 1 kết quả duy nhất, trong `packages/stats/test/user-metrics.test.ts:143`, là chuỗi `"please stop making yolo changes"` trong test phân loại blame. **Không có cơ chế phê duyệt nào.**

Cảnh báo false-friend: `crates/pi-natives/src/computer/permissions.rs` (220 dòng) nghe rất giống approval nhưng thực ra là **TCC của macOS** — `AXIsProcessTrusted()` (Accessibility) và `CGPreflightScreenCaptureAccess()` (Screen Recording). Đó là xin quyền hệ điều hành cho computer-use tool, không phải hỏi người dùng trước khi chạy tool.

---

## 2. Sandbox ở mức OS

Đo bằng cách tìm **tên cơ chế**, rồi mở file kiểm chứng có phải code thật hay nhầm từ.

Lệnh:
```
git grep -l -i -- "<mechanism>" -- '*.rs' '*.ts' '*.tsx'
```

| cơ chế | omp | pi | opencode | codex | gajae |
| --- | --- | --- | --- | --- | --- |
| landlock | 0 | 0 | 0 | **81** | 0 |
| seccomp | 3¹ | 1¹ | 0 | **31** | 1¹ |
| seatbelt | 1¹ | 0 | 0 | **41** | 0 |
| sandbox-exec | 0 | 1² | 0 | **8** | 0 |
| bubblewrap | 0 | 1² | 0 | **33** | 0 |
| Windows sandbox | 0 | 0 | 1³ | **86** | 0 |
| job object | 0 | 0 | 0 | **7** | 0 |
| setrlimit | 0 | 0 | 0 | **6** | 0 |

¹ **toàn false positive** — đã mở từng file kiểm chứng:
- omp: `packages/coding-agent/src/web/scrapers/sec-edgar.ts` khớp vì "**Sec**Company" (SEC = Ủy ban Chứng khoán, không phải seccomp); `cli.ts:414-415` và `input-controller.ts:1439` là **chú thích giải thích vì sao không dùng được**, không phải implementation. Đây đúng là 3 file khớp: `git grep -l -i "seccomp" -- '*.ts'` trả về đúng 3 dòng trên.
- omp `seatbelt`: `file-write-fallback.ts:379` cũng là chú thích ("Seatbelt, LSM mà một probe `stat` sẽ báo writable").
- omp `landlock`: chỉ xuất hiện trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` và `MILESTONE_6_EXECUTION_PLAN.md` — tức là **kế hoạch**, code chưa có.
- pi: `packages/tui/src/terminal.ts:43` là chú thích.
- gajae: chỉ có `sec-edgar.ts`.
³ opencode "Windows sandbox" = 1 file, kiểm chứng là text về sandbox, không phải implementation.

² pi có `sandbox-exec` + `bubblewrap` nhưng **chỉ trong `packages/coding-agent/examples/extensions/sandbox/index.ts`** — example extension, không nạp mặc định.

### Kết luận Q2

**Chỉ codex có sandbox ở mức OS thật.** Đã mở file xác nhận implementation, không phải tài liệu:

- `codex-rs/linux-sandbox/src/landlock.rs` — 379 dòng (Landlock LSM)
- `codex-rs/sandboxing/src/landlock.rs` — 115 dòng
- `codex-rs/sandboxing/src/seatbelt*.rs` + **4 file `.sbpl`** (base / network / preferences / read-only platform defaults) — Seatbelt của macOS
- `codex-rs/vendor/bubblewrap/` — **mã nguồn C của bubblewrap được vendor** (bind-mount.c, bubblewrap.c, network.c)
- `codex-rs/core/src/tools/sandboxing.rs` — 561 dòng điều phối

Quy mô crate sandbox: **11.440 dòng Rust trên 30 file** (không tính test).

omp, pi, opencode, gajae: **không có sandbox ở tầng OS nào.** Chúng chỉ có quyền ở tầng ứng dụng (hỏi người dùng, hoặc giới hạn bằng regex).

---

## 3. Số tool built-in

Đếm từ nguồn định danh, không đếm file (barrel `export *` gây thừa).

Với codex, đếm *tên tool phân biệt được* chứ không đếm file: 21 handler ở `tools/handlers/` (`apply_patch, current_time, get_context_remaining, list_available_plugins_to_install, list_mcp_resources, list_mcp_resource_templates, read_mcp_resource, mcp, new_context_window, plan, request_permissions, request_plugin_install, request_user_input, request_user_input_async, send_message_to_user_async, sleep, tool_search, exec_command, write_stdin, view_image, wait_for_environment`) + 5 tool `multi_agents` v1 + 7 tool `multi_agents_v2` + 2 tool `code_mode`, trừ chồng lấn (`spawn`/`wait` có ở cả v1 và v2) ⇒ **~33**, trong đó một phần đằng sau feature flag. Đếm *file* cho ra 38 nhưng file `*_spec.rs` và các module con của `mcp_resource`/`unified_exec` không phải tool riêng — con số 38 là thừa.

| repo | nguồn đếm | số tool |
| --- | --- | --- |
| **gajae** | `tools/tool-catalog.generated.ts` (3.101 dòng, top-level keys) | **40** |
| **omp** | `tools/builtin-names.ts:1-32` `BUILTIN_TOOL_NAMES` | **30** (+3 hidden) |
| **codex** | `tools/handlers/*.rs` + `multi_agents*/` + `code_mode/` | **~33** |
| **opencode** | `packages/core/src/tool/plugin/*.ts` | **15** |
| **pi** | `core/tools/index.ts:184-191` | **8** |

**Nhiều nhất: gajae (40).** Chênh lệch thứ hai: omp (30) — gajae có 10 tool mà omp không có: `bisect, browser, calc, computer, cron, goal, irc, job, monitor, move_session, python, recipe, render_mermaid, report_finding, resolve, search, search_tool_bm25, skill, skill_discovery, ssh, subagent, telegram_send, todo_write, yield`.

omp có 15 tool gajae không có (đã chuẩn hoá `-`↔`_`): `context_notes, glob, grep, ida, learn, manage_skill, memory_edit, new_context, recall, reflect, retain, security_scan, todo, wait`.

pi chỉ 8: `read, bash, powershell, edit, write, grep, find, ls` (`core/tools/index.ts:184-191`).

---

## 4. Snapshot test

**Có: codex, 1.429 file `.snap`.** Nhưng chúng kiểm thử gì?

```
git ls-files | grep "\.snap$" | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn
```

| thư mục | số .snap |
| --- | --- |
| `codex-rs/tui/src/chatwidget/snapshots` | 316 |
| `codex-rs/tui/src/bottom_pane/snapshots` | 261 |
| `codex-rs/tui/src/snapshots` | 189 |
| `codex-rs/tui/src/history_cell/snapshots` | 91 |
| `codex-rs/tui/src/app/snapshots` | 75 |
| `codex-rs/tui/src/chatwidget/tests/snapshots` | 70 |
| `codex-rs/tui/src/app/tests/snapshots` | 63 |
| `codex-rs/core/tests/suite/snapshots` | **54** |
| `codex-rs/tui/src/transcript_view/snapshots` | 33 |
| ... (còn ~14 thư mục TUI nữa) | |
| `codex-rs/core/src/context/world_state/snapshots` | 10 |

Tổng của riêng TUI: **~1.357 / 1.429 = 94,8%**. Chỉ **54 file (3,8%)** nằm ở core test suite, và chúng cũng không snapshot *output của model* — tên file cho thấy chúng snapshot **shape** (hình dạng request/context):

- `all__suite__compact__mid_turn_compaction_shapes.snap`
- `all__suite__mcp_tool_exposure__deferred_tools_initial_unchanged_and_removed.snap`
- `all__suite__model_visible_layout__*_shapes.snap`
- `all__suite__token_budget__token_budget_new_context_window_tool_full_context.snap`

**Đây là câu trả lời quan trọng nhất của Q4:** codex không snapshot *agent output*. Nó snapshot **khung hình terminal đã render** (insta + golden files) và **shape của request**. Không repo nào trong 5 repo snapshot transcript sinh ra từ model thật.

### Có áp dụng được cho omp không?

**Có, phần shape/context — không, phần transcript model.**

Phần *áp dụng được ngay*: 54 file `.snap` của codex core chính là thứ omp thiếu. omp đã có cơ chế tương đương (`packages/coding-agent/test/`, 3.124 file test) nhưng chưa có golden-file cho các shape như "sau khi compaction giữa lượt thì request trông thế nào". Đó là hợp đồng mà test assert-bằng-logic sẽ bỏ sót.

Phần *không nên bắt chước*: snapshot transcript sinh ra từ model thật là ổn định giả — model đổi, prompt đổi là toàn bộ 1.429 golden hỏng mà không phát hiện được lỗi thật. Và 94,8% snapshot của codex nằm ở TUI là chi phí bảo trì lớn nhất trong miền này.

---

## 5. Điều bị bỏ qua trong CẢ NĂM repo — chỉ riêng omp

Kiểm chứng bằng `git grep -l -w "<tool>"` trên cả 4 repo tham chiếu:

| tool của omp | pi | opencode | codex | gajae |
| --- | --- | --- | --- | --- |
| `manage_skill` | 0 | 0 | 0 | 0 |
| `memory_edit` | 0 | 0 | 0 | 0 |
| `context_notes` | 0 | 0 | 0 | 0 |

Ba tool này **không xuất hiện lần nào** trong bất kỳ repo tham chiếu nào. Ngoài ra:

**a. Cổng phê duyệt cấp thiết bị qua ACP** — `session/acp-permission-gate.ts` (141 dòng), 4 lựa chọn `allow_once`/`allow_always`/`reject_once`/`reject_always`, và nó phân tích `editInspect()` để phát hiện thao tác `delete`/`move` *bên trong* một edit patch (dòng 26-45) — tức phê duyệt theo **ý định thao tác**, không chỉ theo tên tool. Không repo nào có kênh phê duyệt từ xa.

**b. Mô hình bậc năng lực** — `read < write < exec`, tool khai báo `approval(args)` có thể là *hàm* nhận `args` để quyết định bậc theo đối số (`approval.ts:163-181`), và `strictestApproval()` gộp nhiều target cho tool ghi đa-file (`approval.ts:110-118`). opencode có action×resource nhưng không có khái niệm bậc; codex có `Never` nhưng không có bậc trung gian.

**c. Vòng lặp học skill/memory** — 5 tool `learn` + `retain` + `recall` + `reflect` + `manage_skill`, trong đó `manage_skill` và `memory_edit` không tồn tại ở đâu khác. gajae có `skill`/`skill_discovery` nhưng là *đọc* skill, không phải *sửa* skill.

---

## omp thiếu gì

| thứ | ai có | bằng chứng | kích thước |
| --- | --- | --- | --- |
| **Sandbox OS thật** | codex | `codex-rs/sandboxing/` + `linux-sandbox/` | **11.440 dòng Rust / 30 file** |
| Landlock (Linux) | codex | `linux-sandbox/src/landlock.rs` | 379 dòng |
| Seatbelt (macOS) | codex | `seatbelt*.rs` + 4 file `.sbpl` | 41 file khớp |
| bubblewrap | codex | `codex-rs/vendor/bubblewrap/` (vendor mã nguồn C) | ~30 file |
| **Phê duyệt network** | codex | `core/src/tools/network_approval.rs` | **1.254 dòng** |
| **Phê duyệt tool MCP** | codex | `core/src/mcp_tool_approval_templates.rs` | 371 dòng |
| Chế độ sandbox tách khỏi phê duyệt | codex | `SandboxMode` 3 giá trị | trục độc lập |
| Granular approval (5 công tắc) | codex | `GranularApprovalConfig` | — |
| Chặn theo prefix lệnh (danh sách 346 dòng) | gajae | `tools/bash-allowed-prefixes.ts` | 346 dòng |
| Gate computer-use theo nền tảng | gajae | `tools/computer-policy.ts` | 54 dòng |
| Golden-file snapshot cho shape request | codex (chỉ 54 file) | `core/tests/suite/snapshots/` | 54 file |

## Kết luận

**`làm`**

1. **Đổi mặc định omp từ `yolo` sang `write`.** Đây là phát hiện có giá trị nhất trong toàn bộ miền này và nó nằm ngay trong code của chính omp, không cần lấy gì từ ai. `approval.ts:80` hiện trả `"yolo"` khi thiếu cấu hình — tức cài đặt mới chạy tool không hỏi. Chế độ `write` đã có sẵn, đã có test (959 dòng), chỉ cần đổi fallback. Chi phí: một dòng + cập nhật `docs/approval-mode.md`.
2. **Thêm golden-file snapshot cho shape của request/context** (compaction, tool exposure, context window). Đây là phần *đáng lấy* trong 1.429 file `.snap` của codex: 54 file core, snapshot shape chứ không snapshot model. omp đã có 3.124 file test nhưng chưa có lớp golden này.
3. **Giữ nguyên tầng bậc của omp.** Không cần chuyển sang mô hình ruleset của opencode — bậc `read/write/exec` là câu trả lời rẻ hơn cho phần lớn trường hợp, và `strictestApproval()` xử lý đúng trường hợp đa-target mà ruleset không có.

**`làm nếu có điều kiện`**

4. **Sandbox OS theo mô hình codex — chỉ khi omp được dùng để chạy code không tin cậy.** Landlock + Seatbelt là chi phí lớn nhất trong bảng này (11.440 dòng Rust cho codex, cộng bubblewrap vendor). Nếu omp vẫn là công cụ dev hợp tác với code người dùng tin cậy, tầng phê duyệt ứng dụng là đủ và rẻ hơn nhiều. Điều kiện để làm: có nhu cầu thật với người chạy agent tự động trên repo lạ.
5. **Phê duyệt network (1.254 dòng ở codex)** — chỉ đáng làm nếu omp có tool tự động phát sinh network egress mà không thấy. Chưa đo được mức nhu cầu này.
6. **`bash-allowed-prefixes` (346 dòng, gajae)** — làm được với giá rẻ, nhưng phải cân nhắc: nó là allowlist lệnh, tức một lớp *thứ hai* cạnh bậc `exec` sẵn có. Thêm nó mà không có phép đo đánh giá rủi ro thì chỉ tăng bề mặt bảo trì.

**`không làm`**

7. **Không port chính đáng 1.357 snapshot TUI của codex.** Đó là 94,8% khối lượng `.snap` và là chi phí bảo trì lớn nhất, đổi lại không bắt được lỗi hành vi agent.
8. **Không lấy transcript snapshot sinh từ model thật** ở bất kỳ repo nào. Ổn định giả — model đổi là toàn bộ golden hỏng mà không phát hiện lỗi thật.
9. **Không chuyển sang ruleset engine của opencode.** Bậc phân cấp đáp ứng đúng nhu cầu với chi phí thấp hơn nhiều (omp 387 dòng so với opencode 343 + 88 + 709 test, và omp đã có sẵn khái niệm bậc mà opencode không có).

## Chi phí

| việc | quy mô đo được | rủi ro nếu bỏ qua |
| --- | --- | --- |
| Đổi fallback `yolo` → `write` | 1 dòng (`approval.ts:80`) + doc | **Cao** — cài đặt mới chạy tool không hỏi; thay đổi này là hợp đồng bảo mật |
| Golden snapshot cho shape | 54 file mẫu của codex làm tham chiếu; quy mô ban đầu ~10-20 file | Trung bình — regression compaction/tool-exposure chỉ phát hiện khi chạy thật |
| Sandbox OS đầy đủ (nếu làm) | 11.440 dòng Rust / 30 file (đo ở codex) | **Cao nếu** omp chạy agent tự động trên repo không tin cậy; **thấp** nếu là công cụ dev hợp tác |
| Phê duyệt network (nếu làm) | 1.254 dòng (đo ở codex) | Trung bình, phụ thuộc mức rủi ro egress |
| `bash-allowed-prefixes` (nếu làm) | 346 dòng (đo ở gajae) | Thấp — là lớp phòng thủ thứ hai |

Tổng miền approval mà omp đã có: **387 + 141 + 959 = 1.487 dòng**. Để bắt kịp codex ở mức OS thì cần thêm ~11.440 dòng Rust — tức **8 lần** phần đã có, và đó là lý do `không làm` là câu trả lời mặc định ở đây.
