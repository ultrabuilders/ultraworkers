# senpi — bản đồ 40 builtin extension, và so sánh với `omp`

> Ngày đo: **2026-09-28**. senpi HEAD `ea9216269e9254b821446130b60d1e00759761dc` (Mon Sep 28 14:12:31 2026 +0900).
> Cây senpi: `/Users/tranquangdang21/Projects/senpi-ref` · Cây omp: `/Users/tranquangdang21/Projects/ultraworkers`.
> Mọi khẳng định dưới đây kèm lệnh. Người đọc sau 6 tháng nên chạy lại mục [§0](#0-cách-tự-chạy-lại) trước khi tin.

---

## 0. Cách tự chạy lại

Tất cả phép đo trong tài liệu này tái lập được bằng 6 lệnh. Không có con số nào trong đây là suy đoán.

```bash
# 1. Xác nhận phiên bản senpi
git -C /Users/tranquangdang21/Projects/senpi-ref log -1 --format='%H %ad'

# 2. Tổng khối lượng cây builtin (40 thư mục)
cd /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin
find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.md' \) -exec cat {} + | wc -l   # → 97893

# 3. Số dòng từng thư mục
for d in */; do d=${d%/};
  n=$(find "$d" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.md' \) -exec cat {} + 2>/dev/null | wc -l)
  echo "$n|$d"; done | sort -t'|' -k1 -rn

# 4. Bề mặt đăng ký của từng builtin (tool / command / hook / flag / provider)
for d in */; do d=${d%/};
  t=$(grep -rhoE '\bregisterTool\('        "$d" --include='*.ts' | wc -l)
  c=$(grep -rhoE '\bregisterCommand\('     "$d" --include='*.ts' | wc -l)
  h=$(grep -rhoE '\.on\("(session|agent|turn|message|tool|user|input|context|model|system|thinking|project|resources|before_provider|after_provider|ui_prompt)[a-z_]*"' "$d" --include='*.ts' | wc -l)
  f=$(grep -rhoE '\bregisterFlag\('        "$d" --include='*.ts' | wc -l)
  p=$(grep -rhoE '\bregisterProvider\('    "$d" --include='*.ts' | wc -l)
  echo "$d tool=$t cmd=$c hook=$h flag=$f provider=$p"; done

# 5. Mức độ "cắm vào core": đọc mục tự thú trong changes.md
cd /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin
grep -h 'Why an extension could not handle it' $(find . -name changes.md) | wc -l

# 6. Core file bị builtin chạm tới (loại trừ test)
grep -rhoE '`packages/[^`:]+`' . --include=changes.md \
  | grep -v 'core/extensions/builtin' | tr -d '`' | grep -v '/test/' \
  | sed 's|packages/coding-agent/||' | sort -u
```

> **Hai cái bẫy phép đo tôi đã vấp, ghi lại để lần sau không vấp nữa.**
>
> 1. `git -C <repo> ls-files "packages/..."` trả về đường dẫn tính từ **gốc repo**. Nếu bạn `cd` vào thư mục con rồi đưa kết quả đó cho `xargs grep`, nó sẽ ra 0 dòng. Phép đo bề mặt đăng ký đầu tiên của tôi bug vì chính lý do này. → Dùng `grep -r` trong thư mục.
> 2. Pathspec của `git ls-files` lại **tương đối với thư mục hiện tại**, không phải so với gốc. Tôi chạy `git ls-files 'src/tools/goal*'` từ gốc repo (thiếu tiền tố `packages/coding-agent/`) và kết luận omp "không có goal" — sai, omp có `src/goals/` 715 dòng. → Dùng `git ls-files | grep` thay vì pathspec khi đang ở gốc. Chi tiết ở §4.3.
>
> Cả hai lỗi đều cho ra **kết quả rỗng**, và kết quả rỗng rất dễ bị đọc thành "không tồn tại". Đó là nguyên nhân gốc của mọi phát hiện sai kiểu "omp thiếu hẳn".

---

## 1. Phát hiện cấu trúc lớn nhất: omp chưa từng có khái niệm "builtin extension"

Đây là khác biệt lớn hơn nhiều so với "senpi có nhiều tính năng hơn". Không phải senpi có 40 thứ omp không có. **omp không có tầng "builtin" nào cả.**

**Đo ở omp:**

```bash
$ find packages/coding-agent/src/extensibility -type d
packages/coding-agent/src/extensibility
packages/coding-agent/src/extensibility/custom-tools
packages/coding-agent/src/extensibility/plugins
packages/coding-agent/src/extensibility/extensions
packages/coding-agent/src/extensibility/hooks
packages/coding-agent/src/extensibility/custom-commands
packages/coding-agent/src/extensibility/custom-commands/bundled
packages/coding-agent/src/extensibility/custom-commands/bundled/annotate
packages/coding-agent/src/extensibility/custom-commands/bundled/review
packages/coding-agent/src/extensibility/custom-commands/bundled/ci-green
```

Không có `builtin/`. Chỗ gần nhất là `custom-commands/bundled/` với **3** mục (annotate, review, ci-green) — và đó là *prompt command*, không phải extension.

**Đo ở senpi:** `builtin/index.ts` khai báo mảng `builtinExtensions` gồm **44 entry** (`grep -c '^\t{ id: "' index.ts` → 44), cộng `globalDefaultExtensionFactories` 4 entry nữa.

**Hệ quả trực tiếp cho M5:** "lấy 40 builtin của senpi" **không phải là copy 40 thư mục**. Phần lớn giá trị của senpi nằm ở *việc nó biến tính năng thành extension đóng gói* — còn omp đã viết thẳng tính năng vào `src/tools/`. Câu hỏi đúng cho M5 không phải "ta lấy builtin nào" mà là **"ta có nên chuyển `src/tools/` sang coi là builtin extension không"** — một câu hỏi về kiến trúc, không phải về danh sách.

### 1.1. Hai API extension gần như ngang nhau — nên cơ hội port là thật

Điều này ngược lại với dự đoán "senpi đã diverge quá xa". Đo:

| | senpi | omp |
|---|---|---|
| File định nghĩa API | `core/extensions/types.ts` (2.732 dòng) | `extensibility/extensions/types.ts` (71 KB) |
| `interface ExtensionAPI` | dòng 1907 | dòng 1256 |
| Số event `on(event:)` | 42 | **41** |

Cả hai đều có `registerTool` / `registerCommand` / `registerFlag` / `registerShortcut` / `registerProvider` / `registerMessageRenderer` / `setModel` / `setActiveTools`. **Cùng một hình dạng API.** Đây là tin tốt cho M5: một builtin viết cho senpi port sang omp không cần viết lại hạ tầng.

Khác biệt đáng kể nhất về *tên* event (không phải về số lượng):

| Chỉ có ở senpi | Chỉ có ở omp |
|---|---|
| `session_parked`, `session_resumed`, `session_abort`, `session_extensions_removed` | `session_switch`, `session_branch` |
| `ui_prompt_start`, `ui_prompt_end` | `session_stop` |
| `model_select`, `system_prompt_change`, `thinking_level_select` | `auto_compaction_start/end`, `auto_retry_start/end` |
| `tool_activated`, `input_disposition` | `tool_approval_requested/resolved`, `user_python` |
| `project_trust` | `todo_reminder`, `goal_updated`, `ttsr_triggered`, `mcp_notification` |

Điểm đáng chú ý: **omp đã có sẵn `goal_updated` / `todo_reminder` / `ttsr_triggered` / `mcp_notification` làm event công khai.** Tức là tính năng goal, todo, tts, MCP của omp đã *chủ động* mở hook cho extension — đúng cái senpi phải tự chếp. Đây là dấu hiệu hai bên đang hội tụ.

---

## 2. Bảng 40 builtin

Cột "dòng" đếm `.ts + .tsx + .md` trong thư mục. Cột hook/tool/cmd đếm bằng `grep -rhoE` như lệnh ở §0.

| # | builtin | dòng | file | NÓ LÀM CÁI GÌ (một câu) | bề mặt đăng ký |
|---|---|---|---|---|---|
| 1 | `compaction` | 10.788 | 50 | Quản lý nén ngữ cảnh: pipeline, checkpoint, circuit-breaker, warm-anchor | 9 hook, 2 provider |
| 2 | `mcp` | 10.244 | 67 | Cầu nối MCP client: nạp server, đăng ký tool `mcp__*`, OAuth | 5 tool, 2 cmd (`mcp`), 3 hook, 1 renderer |
| 3 | `anthropic-subscription` | 8.779 | 58 | Provider lane Claude subscription (SDK OAuth), quản lý account | 1 cmd (`claude-account`), 15 hook, 1 flag, 1 provider |
| 4 | `terminal` | 8.260 | 53 | PTY bền vững: 6 tool bash (`bash`, `bash_input`, `bash_output`, `bash_resize`, `kill_bash`, `monitor`), lease, restore, orphan-reaper | 6 tool, 7 hook, 2 renderer |
| 5 | `goal` | 6.304 | 39 | Vòng lặp mục tiêu tự tiếp tục: đặt goal, tự nối lượt, cache-warm | 3 tool, 1 cmd (`goal`), 13 hook, 1 renderer — 4.566 dòng TS (omp: 715) |
| 6 | `cursor-cli-oauth` | 5.620 | 25 | Lane Cursor CLI OAuth: spawn executable, đo model, refresh catalog | 1 cmd (`cursor-account`), 2 hook, 1 provider |
| 7 | `hooks` | 4.663 | 23 | Engine thực thi hook người dùng (Claude-Code style hooks.json): PreToolUse/Stop/… | 9 hook, 1 cmd |
| 8 | `prompt-preset` | 4.305 | 40 | Thư viện prompt theo model: chọn preset theo model rồi bơm vào system prompt | 2 hook |
| 9 | `loop` | 4.134 | 13 | Bộ hẹn giờ lặp: cron planner, tick prompt, scheduler | 1 tool (`schedule_wakeup`), 1 cmd (`loop`), 7 hook, 1 renderer |
| 10 | `ttsr` | 3.783 | 28 | Điều phối TTS: phát giọng nói khi tới lượt, có cắt ngang (interrupt) | 1 cmd (`ttsr`), 9 hook, 2 flag |
| 11 | `todotools` | 3.263 | 21 | Tool todo + tự nhắc nếu lượt kết thúc mà todo chưa xong | 1 tool, 1 cmd (`todo`), 6 hook |
| 12 | `rules` | 2.980 | 20 | Nạp `AGENTS.md`/rules theo thư mục và kích hoạt theo bucket | 2 cmd (`rules`, `reload-rules`), 3 hook, 2 flag |
| 13 | `config-reload` | 2.597 | 11 | Theo dõi FS, tự reload config/settings/extension khi đổi | 5 hook |
| 14 | `gpt-apply-patch` | 2.351 | 21 | Tool apply-patch riêng cho OpenAI/Codex wire mode (có parser patch) | 2 tool, 3 hook |
| 15 | `websearch` | 2.342 | 26 | Tìm web qua provider: Brave, Tavily, Kagi, SERPdive | 1 tool, 1 cmd (`websearch`), 3 hook |
| 16 | `permission-system` | 1.859 | 17 | Lớp phân quyền: mỗi tool tự phân loại lệnh gọi qua `permissionParser` | 3 hook, 2 flag |
| 17 | `tool-search` | 1.411 | 9 | Tìm tool theo mô tả thay vì nhét hết vào context (giảm token) | 1 tool (`tool_search`), 3 hook, 1 renderer |
| 18 | `ask-user` | 1.284 | 12 | Hỏi người dùng giữa lượt, có timeout, hiển thị panel | 2 tool, 1 cmd (`answer`), 4 hook, 1 flag |
| 19 | `imagegen` | 1.258 | 9 | Tool sinh ảnh qua skill nhúng, có auth resolution | 1 tool (`generate_image`), 1 hook |
| 20 | `webfetch` | 1.230 | 11 | Tải và rút gọn nội dung trang web thành markdown | 2 hook |
| 21 | `look-at` | 922 | 9 | Tool xem ảnh bằng **model thị giác riêng** (`look_at`), không nhét ảnh vào lượt chính | 1 cmd (`lookat`), 2 hook |
| 22 | `loop-guard` | 885 | 9 | Phát hiện vòng lặp (tool gọi lặp lại) và **veto trước cả hook** | 8 hook, 2 renderer |
| 23 | `nested-agents-md` | 574 | 12 | Chèn `NESTED_AGENTS.md` của thư mục con vào context khi đọc file ở đó | 1 cmd, 4 hook, 1 flag |
| 24 | `cache-keepalive` | 569 | 4 | Giữ prompt cache ấm: warm cache lúc start, chờ, gia hạn TTL | 8 hook, 1 renderer |
| 25 | `btw` | 528 | 4 | Side-query: hỏi phụ "btw" cạnh lượt chính mà không phá ngữ cảnh | 1 cmd (`btw`), 4 hook |
| 26 | `openai-image-gen` | 509 | 5 | Tool sinh ảnh native của OpenAI, nối vào client tool registry | 4 hook |
| 27 | `herdr` | 507 | 4 | Client cho daemon quản lý pane: báo trạng thái, monitor, wake-source | 5 hook |
| 28 | `history-search` | 401 | 5 | Overlay tìm kiếm lịch sử phiên cũ (đọc chỉ, không ghi) | 1 cmd (`history`) |
| 29 | `reasoning` | 275 | 2 | Lệnh `/reasoning`, `/efforts` — chỉ đọc model hiện tại rồi thông báo | 2 cmd, 2 hook |
| 30 | `openai-web-search` | 272 | 1 | Tool web search native của OpenAI, capability-aware | 3 hook |
| 31 | `tool-pair-guard` | 269 | 3 | Vá lỗi tool call bị thiếu cặp (tool_use/tool_result lệch nhau) | không đăng ký gì (bị gọi nội bộ) |
| 32 | `anthropic-web-search` | 249 | 1 | Tool web search native của Anthropic, có allow/block domain | 3 hook |
| 33 | `bash-timeout` | 211 | 3 | Tự thêm timeout cho lệnh bash dài, có cửa sổ foreground | 1 hook |
| 34 | `model-fallback` | 207 | 3 | Cấu hình chuỗi model fallback khi retry thất bại | 1 cmd (`fallback`), 1 flag |
| 35 | `recommended-models` | 185 | 1 | Thang model đề xuất + xếp hạng provider lane theo từng bậc | 2 hook, 1 flag |
| 36 | `help` | 166 | 3 | `/help` trong TUI + mở `keybindings.json` bằng editor | 2 cmd (`help`, `keybindings`) |
| 37 | `rule-activation` | 132 | 3 | Kích hoạt rules theo file vừa đọc | 1 renderer |
| 38 | `video-in` | 126 | 1 | Tool đọc video: `read_video` | 1 tool, 2 hook |
| 39 | `anthropic-bash` | 103 | 1 | Bật native bash tool của Anthropic (`bash_20250124`) | không qua API (đọc env `PI_ANTHROPIC_BASH`) |
| 40 | `account` | 82 | 1 | Liệt kê credential account của mọi provider | 1 cmd (`account`) |

**Ngoài 40 thư mục còn 9 file phẳng `.ts` cũng là builtin**, đăng ký trong cùng mảng: `diff.ts` (6,9 KB), `files.ts` (6,9 KB), `gpt-account.ts` (4,7 KB), `import-repro.ts` (13 KB), `prompt-url-widget.ts` (4,6 KB), `repository-identity.ts` (1,5 KB), `service-tier.ts` (17 KB), `tps.ts` (2,4 KB), `redraws.ts` (589 B). Cộng `account-display-name.ts`, `monitor-state-event.ts`, `oauth-login-interaction.ts`, `eval-only-routing.ts` là helper dùng chung, không phải builtin.

---

## 3. Phân loại theo CÁCH nó gắn vào

Đếm bằng lệnh §0 mục 4. "Lõi" = không dùng `ExtensionAPI` nào, chạm thẳng code khác.

### 3.1 Một tool mới (11 builtin, đăng ký `registerTool`)

| builtin | tool |
|---|---|
| `mcp` | 5 tool `mcp__*` |
| `terminal` | `bash`, `bash_input`, `bash_output`, `bash_resize`, `kill_bash`, `monitor` |
| `goal` | 3 tool |
| `ask-user` | 2 tool |
| `gpt-apply-patch` | 2 tool |
| `imagegen` | `generate_image` |
| `tool-search` | `tool_search` |
| `loop` | `schedule_wakeup` |
| `video-in` | `read_video` |
| `websearch` | 1 tool |
| `todotools` | 1 tool |

### 3.2 Một hook bám lifecycle (26 builtin)

Tất cả builtin có ≥1 `pi.on(...)` trừ 4: `account`, `anthropic-bash`, `tool-pair-guard`, `help`.

### 3.3 Sửa prompt (4 builtin)

`prompt-preset` (chọn + bơm system prompt theo model) · `nested-agents-md` (chèn `NESTED_AGENTS.md` theo thư mục) · `rules` (bơm rules) · `look-at` (chèn mô tả `look_at` vào prompt).

### 3.4 Sửa model/provider (5 builtin)

`anthropic-subscription` · `cursor-cli-oauth` · `compaction` (2 `registerProvider`) · `recommended-models` · `model-fallback`.
Thêm 3 builtin chỉ bơm payload không qua `registerProvider`: `anthropic-web-search`, `openai-web-search`, `openai-image-gen` (đăng ký qua `registerCommand`/hook, nhưng biến đổi payload provider).

### 3.5 Sửa I/O terminal (3 builtin)

`terminal` (6 tool PTY) · `ttsr` (3.783 dòng, phát/cắt audio) · `bash-timeout` (tiêm timeout mặc định vào bash).

### 3.6 Sửa config (4 builtin)

`config-reload` · `model-fallback` · `permission-system` · `cache-keepalive`.

### 3.7 ⚠️ LÀM THAY ĐỔI HÀNH VI LÕI — loại đáng giá nhất VÀ nguy hiểm nhất

Đây là mục quan trọng nhất của tài liệu, nên đo kỹ thay vì suy.

senpi tự ghi nhận điều này. Mỗi entry trong `changes.md` có mục bắt buộc tên **"Why an extension could not handle it"** — tức thay đổi đó *không* làm được bằng extension và phải sửa core.

**Đo:**

```bash
$ cd /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin
$ grep -h '^## ' $(find . -name changes.md) | wc -l                                       # → 564 entry
$ grep -h 'Why an extension could not handle it' $(find . -name changes.md) | wc -l       # → 253
```

**253 / 564 = 44%** thay đổi trong lịch sử fork của cây builtin là thay đổi lõi, không phải thay đổi extension. Đây không phải 40 extension "tự chứa" — chúng đã đào vào lõi liên tục.

**Các builtin lõi nặng nhất (số lần tự thú / tổng entry):**

| builtin | lần lõi | tỉ lệ |
|---|---|---|
| `cursor-cli-oauth` | 12/13 | 92% |
| `config-reload` | 11/12 | 92% |
| `anthropic-subscription` | 52/69 | 75% |
| `herdr` | 3/3 | 100% |
| `cache-keepalive` | 3/4 | 75% |
| `webfetch` | 7/10 | 70% |
| `imagegen` | 7/14 | 50% |
| `compaction` | 34/88 | 39% |
| `goal` | 21/63 | 33% |
| `terminal` | 18/47 | 38% |
| `prompt-preset` | 14/58 | 24% |
| `mcp` | 9/27 | 33% |

**Core file thật sự bị chạm** (lệnh 6 ở §0, đã bỏ test, 28 dòng):

```
packages/ai/src/api/transform-messages.ts       ← biến đổi message trước khi gửi provider
packages/ai/src/providers/cursor.ts             ← provider registry
packages/ai/src/utils/retry.ts                   ← logic retry
packages/ai/src/utils/tool-pair-repair.ts        ← vá tool call lệch cặp
packages/agent/src/agent-loop.ts                 ← vòng lặp agent
packages/pty/src/registry-session.ts             ← quản lý session PTY
packages/senpi-codemode/src/prompt/eval-prompt.ts
src/capability/rule.ts                           ← nạp rule
src/config.ts
src/core/messages.ts
src/prompts/tools/todo.md
src/prompts/system/ttsr-interrupt.md
src/session/ttsr-coordinator.ts
src/tools/todo.ts
src/modes/controllers/todo-command-controller.ts
src/export/ttsr.ts
scripts/sync-builtin-extensions.mjs
```

**Bài học cho M5:** lấy một builtin "lõi nặng" về mà **không** lấy kèm phần lõi nó đào = bạn có một cái vỏ không chạy được. Ngược lại, chép cả phần lõi = bạn đang ghi đè kiến trúc của omp. Đây là lý do 5 builtin nên bỏ ở cuối tài liệu.

---

## 4. So với omp — đo thật, không suy

### 4.1 Điều chỉnh quan trọng về briefing

Briefing ghi *"`pi` KHÔNG có MCP"*. Điều đó **đúng với `pi`**, nhưng **sai nếu áp vào `omp`**. Đo:

```bash
$ git -C /Users/tranquangdang21/Projects/ultraworkers ls-files | grep -ic mcp
129
$ ls packages/coding-agent/src/mcp/
client.ts  config.ts  config-writer.ts  errors.ts  index.ts  json-rpc.ts
loader.ts  manager.ts  oauth-credentials.ts  oauth-discovery.ts  oauth-flow.ts ...
$ ls docs/ | grep mcp
mcp-config.md  mcp-protocol-transports.md  mcp-runtime-lifecycle.md  mcp-server-tool-authoring.md
```

**omp đã có MCP đầy đủ, ở mức core, không phải extension.** Có cả OAuth discovery lẫn authoring guide. Đừng đề xuất port `mcp` của senpi sang omp — sẽ là tạo song song hai hệ thống.

### 4.2 Bảng phân quyết

`(a)` = omp thiếu hẳn · `(b)` = omp có nhưng yếu hơn · `(c)` = omp đã mạnh hơn hoặc ngang.

| builtin | bằng chứng omp | phán quyết |
|---|---|---|
| `mcp` | `src/mcp/` 15 file + 4 doc + `capability/mcp.ts` | **(c)** omp mạnh hơn — không lấy |
| `todotools` | `src/tools/todo.ts` 27 KB, `todo-command-controller.ts`, `todo_reminder` event | **(c)** |
| `imagegen` | `src/tools/image-gen.ts` 12 KB | **(c)** ngang |
| `ask-user` | `src/tools/ask.ts` 41 KB, tool `ask` trong `BUILTIN_TOOL_NAMES` | **(c)** omp mạnh hơn |
| `websearch` | tool `web_search` trong `BUILTIN_TOOL_NAMES`, 48 file khớp | **(b)** cần đo provider |
| `compaction` | `src/session/compaction-methods.ts`, `compact-modes.ts`, `snapcompact-*` | **(c)** omp có snapcompact riêng |
| `loop` | `/loop` tại `slash-commands/builtin-modes.ts:324`, `modes/loop-condition`, `modes/loop-limit` | **(b)** omp có loop nhưng khác hẳn hình dạng |
| `rules` | `src/capability/rule.ts`, `rule-buckets.ts`, `discovery/agents-md.ts` | **(c)** |
| `permission-system` | `src/tools/approval.ts` 13 KB, `session/acp-permission-gate.ts` | **(b)** |
| `model-fallback` | `src/session/retry-fallback-chains.ts`, `retry-fallback-reason.ts` | **(b)** |
| `history-search` | `tui/src/overlays/history-search.ts` | **(c)** |
| `help` | có `help-content.ts` | **(c)** |
| `ttsr` | `src/tools/tts.ts` 232 dòng + crate `pi-voice` (`audio.rs`, `live.rs` 21 KB) | **(b)** omp có voice native Rust |
| `webfetch` | `src/tools/fetch.ts` **53 KB** | **(c)** omp mạnh hơn nhiều |
| `terminal` | `tools/bash.ts` 58 KB có `pty?` + `bash-pty-selection.ts`; nhưng **không có** package `pty` | **(b)** xem §4.3 |
| `cache-keepalive` | `git ls-files 'packages/ai/src/**/prompt-cache*'` → **rỗng** | **(a)** |
| `look-at` | `git grep -il 'look_at\|lookAt'` → **0 file** | **(a)** |
| `btw` | không có | **(a)** |
| `herdr` | không có (grep `herdr` → 0) | **(a)** |
| `goal` | `src/goals/` — 5 file, 715 dòng TS + 3 file prompt | **(b)** xem §4.3 |
| `tool-search` | `git grep -c tool_search` → 8 file | **(b)** |
| `config-reload` | `git grep -c config-reload` → 0 | **(a)** |
| `gpt-apply-patch` | không có `apply_patch` tool; có `ast-edit.ts` | **(a)** |
| `video-in` | `git grep -il 'video_in'` → 0 | **(a)** |
| `anthropic-subscription` | 310 file khớp `oauth`; có `crates/pi-natives/src/oauth_callback/` | **(b)** |
| `cursor-cli-oauth` | `packages/ai/src/providers/cursor.ts` | **(b)** |
| `loop-guard` | `git grep -c loopGuard` → 19 file | **(b)** |
| `nested-agents-md` | `capability/context-file.ts`, `discovery/agents-md.ts` | **(c)** |
| `prompt-preset` | `git grep -c prompt.preset` → không rõ | **(a)** cần đo thêm |
| `recommended-models`, `reasoning`, `service-tier` | `setServiceTier` có trong `ExtensionAPI` | **(b)** |
| `anthropic-web-search`, `openai-web-search`, `openai-image-gen`, `anthropic-bash` | đây là bật native tool của provider qua `compat` | **(a)/(b)** tùy provider |
| `bash-timeout` | `src/tools/tool-timeouts.ts` + `bash?timeout` trong `BUILTIN_TOOL_NAMES` | **(c)** |
| `tool-pair-guard` | `auto-generated-guard.ts`, `output-schema-validator.ts` — ý tưởng khác | **(a)** |
| `rule-activation` | `rule-buckets.ts` | **(c)** |
| `account`, `gpt-account` | `pi-ai/auth` slot pool | **(c)** |
| `diff`, `files`, `import-repro` | `tools/report-tool-issue.ts` | **(c)** |

### 4.3 Ba chỗ cần nói thẳng vì dễ phán đoán sai

**`terminal` không phải "omp thiếu PTY".** Đo lại:
```bash
$ git grep -n 'pty' -- packages/coding-agent/src/tools/bash.ts | head
336:	"pty?": "boolean",
600:	// Non-pty calls run alongside each other ...; pty takes over the terminal UI
$ git ls-files 'packages/coding-agent/src/tools/bash-pty-selection.ts'
packages/coding-agent/src/tools/bash-pty-selection.ts
```
omp **đã có** PTY cho bash. Cái omp thiếu là phần *senpi dựng thêm quanh nó*: lease file, monitor registry (30 KB), restore-session, orphan-reaper, 6 tool thay vì 1. Vậy phán quyết là **(b)**, không phải (a).

**`goal` là (b) — và tôi đã trả lời sai một lần rồi sửa lại.** Lần đầu tôi chạy `git ls-files 'src/tools/goal*'` từ thư mục gốc, nhận **rỗng**, rồi kết luận omp "chưa có goal". Sai. Lệnh đúng phải là:

```bash
$ git ls-files | grep -i 'goal' | grep -v test
packages/coding-agent/src/goals/index.ts
packages/coding-agent/src/goals/runtime.ts        # 522 dòng
packages/coding-agent/src/goals/settings.ts
packages/coding-agent/src/goals/state.ts
packages/coding-agent/src/goals/tools/goal-tool.ts  # 123 dòng
packages/coding-agent/src/prompts/goals/goal-budget-limit.md
packages/coding-agent/src/prompts/goals/goal-continuation.md
packages/coding-agent/src/prompts/goals/goal-mode-active.md
```

omp có module goal thật: **715 dòng TS + 3 prompt**. Nhưng senpi có **4.566 dòng TS** cho cùng tính năng — gấp 6,4 lần, và 21/63 entry của nó phải chạm lõi. Đó là lý do vẫn là **(b)**: omp có nền, thiếu độ sâu.

*Bài học về phép đo:* pathspec `git ls-files` **tương đối với thư mục hiện tại**, không phải so với gốc repo. Sai pathspec cho kết quả rỗng, và kết quả rỗng dễ bị đọc thành "không tồn tại" — đúng cái bẫy mà mục §4.1 của chính tài liệu này cảnh báo.

**`websearch` là (b) chứ không phải (a).** 48 file khớp `websearch` và `web_search` nằm trong `BUILTIN_TOOL_NAMES`. omp có tool; cái chưa rõ là danh sách provider (senpi có Brave, Tavily, Kagi, SERPdive). Đây là phép đo cần làm lại, tôi chưa đo tới mức đó.

---

## 5. 5 builtin ĐÁNG LẤY nhất

Xếp theo: (i) omp đang thiếu thật, (ii) giá trị cao, (iii) rẻ — ít cắm lõi.

### 1. `cache-keepalive` (569 dòng, 3/4 entry chạm lõi)
omp có **zero** file `prompt-cache*` trong `packages/ai` (lệnh §4.2). Giữ prompt cache ấm là tiết kiệm tiền thật: mỗi lượt không cache là một lần trả giá input đầy đủ. Chỉ 4 file, chủ yếu là hook. **Cái mất:** phải thêm `promptCacheTtlSeconds` vào `packages/ai` — nhưng đó là một hàm thuần, không phải sửa kiến trúc. *Giá trị cao nhất trên mỗi dòng code.*

### 2. `look-at` (922 dòng, 2 hook)
`git grep -il 'look_at\|lookAt'` trong omp → **0 file**. Ý tưởng: ảnh đi qua **model thị giác riêng** (`look_at` với `model-selector.ts`), không nhét base64 vào lượt chính. Đây là bài toán token + context mà omp chưa giải. *Cái mất:* thêm provider vision selector.

### 3. `btw` (528 dòng, 4 hook, 0 lõi)
Side-query tách khỏi lượt chính. Nhỏ, cô lập, **không có entry nào chạm lõi** (`changes.md`: inside=2, outside=0). Chạy được ngay trên API `omp` sẵn có (`sendUserMessage`, `setWidget`). Đây là ví dụ đẹp nhất của "extension đúng là extension".

### 4. `tool-pair-guard` (269 dòng, 0 đăng ký, 0 lõi)
Vá lỗi tool_use/tool_result lệch nhau. Nhỏ nhất trong nhóm lõi. Nhưng: `tool-pair-repair.ts` nằm ở **`packages/ai` của senpi** — của omp không có. Nên phải viết mới thay vì port. *Ghi rõ điều này, vì dễ tưởng là copy-paste được.*

### 5. `config-reload` (2.597 dòng) — **có điều kiện**
Nghe hấp dẫn nhưng **11/12 entry chạm lõi**, tỉ lệ 92% — cao nhất bảng. Chính tác giả senpi đã nói 11 lần "extension không làm được". Chỉ lấy nếu M5 chấp nhận sửa `src/config.ts` và `SettingsManager`. Nếu không, để cuối danh sách, không phải đầu.

*Thay thế nếu M5 muốn thứ an toàn hơn:* `herdr` (507 dòng) cũng 3/3 chạm lõi — tệ hơn. Còn `loop-guard` (885 dòng, **0/6 entry chạm lõi**, `changes.md` inside=0 outside=0) thì ngược lại là lựa chọn an toàn: chặn vòng lặp tool trước khi nó tốn tiền, hoàn toàn bằng hook, không cần sửa lõi.

---

## 6. 5 builtin KHÔNG NÊN LẤY

### 1. `mcp` (10.244 dòng) — **không lấy, trùng nghiệp vụ**
Đo đã nêu ở §4.1: omp có `src/mcp/` 15 file, `capability/mcp.ts`, 4 tài liệu, 129 file tracked. Port senpi's MCP = chạy hai hệ MCP song song, mỗi cái một bộ tool. *Cái mất nếu bỏ qua:* không có gì đáng kể — omp đã ở bậc cao hơn.

### 2. `compaction` (10.788 dòng, 34/88 lõi) — **không lấy, phá hệ thống**
34 lần phải sửa lõi. Quan trọng hơn: **omp đã có `snapcompact`** (`src/session/snapcompact-inline.ts`, `snapcompact-savings-journal.ts`, `src/edit/hashline-compact.md`, 4 prompt `snapcompact-*.md`) — đây là hệ thống compaction *của riêng omp*, khác hẳn thiết kế của senpi. Ghép hai compaction sẽ hỏng cả hai. *Cái mất:* vài ý hay về warm-anchor, nhưng lấy được qua lời khuyên chứ không qua code.

### 3. `terminal` (8.260 dòng, 18/47 lõi) — **không lấy nguyên si**
omp đã có PTY trong `bash.ts` + `bash-pty-selection.ts` + crate `pi-shell` (`shell.rs` **228 KB**). Port thêm sẽ tạo hai đường thực thi shell. Nếu cần, chỉ lấy *ý tưởng* — monitor registry 30 KB, restore-session, orphan-reaper — và viết lại trên nền `pi-shell`. *Cái mất:* các tính năng bền vững (lease, restore). Chấp nhận được.

### 4. `ttsr` (3.783 dòng, 9 file lõi) — **không lấy, chạm native quá sâu**
`inside=1, outside=6` — tệ nhất bảng về tỉ lệ ngược. Chạm `src/session/ttsr-coordinator.ts`, `src/export/ttsr.ts`, `src/prompts/system/ttsr-interrupt.md`, `packages/ai/src/utils/*`. Và omp đã có `crates/pi-voice` với `live.rs` 21 KB — hạ tầng audio đã ở tầng Rust, khác hẳn cách senpi lo. *Cái mất:* cơ chế "cắt ngang khi người dùng nói". Ghi nhận là nợ kỹ thuật, đừng lấy vội.

### 5. `anthropic-subscription` (8.779 dòng, **52/69 = 75% lõi**) — **không lấy**
Lớn nhất về mức độ lõi-sâu. Chạm `packages/ai/src/providers/cursor.ts`, `packages/ai/src/utils/retry.ts`, `src/config.ts`. Và omp **đã có** `crates/pi-natives/src/oauth_callback/` (8 file, có cả `darwin-helper.m` — native helper cho OAuth trên macOS). Hai hệ OAuth cùng chạy sẽ tranh nhau callback URL. *Cái mất:* provider lane Claude subscription. Đây là thứ chỉ nên làm nếu có người quyết định ôm cả provider layer.

---

## 7. Kết luận cho M5

Ba điều đo được, xếp theo mức chắc:

1. **Cơ hội thật nằm ở API, không ở danh sách 40.** Hai `ExtensionAPI` gần như ngang nhau (42 vs 41 event, cùng tập `register*`). Chuyển `src/tools/` của omp sang coi là builtin extension là khả thi về hình dạng — nhưng là **câu hỏi kiến trúc cho M1B/M2, không phải việc M5 làm**.

2. **"Lấy 40 builtin" là câu nói sai.** 44% thay đổi lịch sử của cây builtin (253/564) là thay đổi lõi. Port như copy sẽ cho 40 vỏ không chạy được. Cái *thật sự* port được là nhóm ~6 builtin lõi-nhẹ: `btw`, `look-at`, `cache-keepalive`, `loop-guard`, `history-search`, `tool-search`.

3. **omp không cần `mcp` và `compaction`.** Cả hai đã là hạ tầng lõi của omp ở bậc cao hơn. Đưa chúng vào danh sách M5 là đi ngược hướng.

### Phép đo chưa làm, cần làm nếu muốn chốt

* **Chưa đo:** số provider của `websearch` của omp (48 file khớp tên nhưng chưa so danh sách provider với Brave/Tavily/Kagi/SERPdive của senpi).
* **Chưa đo:** `prompt-preset` — grep rời rạc, chưa kết luận được omp có preset theo model hay không.
* ~~Chưa đo: `goal` của omp~~ — **đã đo ở §4.3, phán quyết (b)**.
* **Chưa đo:** 9 file `.ts` phẳng (17 KB `service-tier.ts` là file lớn nhất, chưa phân tích).

### Ba ràng buộc từ briefing — vẫn đúng, vẫn áp dụng

* `gajae` là fork của dòng omp/pi, không phải nguồn tham chiếu độc lập. Không dùng làm đối chứng.
* `pi` không có MCP. **Nhưng `omp` có** — đo ở §4.1. Đừng suy từ "pi không có" sang "omp không có".
* `chord` không phải cơ chế vòng đời extension. Không có vai trò trong tài liệu này.

### Về JSONL

`parseJsonlLenient` của omp (`packages/utils/src/stream.ts:575`) là cải tiến thật so với `pi` (ném `JsonlCorruptionError` không bắt). Không builtin nào trong 40 cái này liên quan tới session persistence, nên **không builtin nào có lý do chạm vào session layer**. Giữ nguyên `omp` hiện tại.

---

*Tài liệu này chỉ ghi những gì đã đo. Mỗi con số đều có lệnh ở §0 hoặc ngay cạnh nó. Nếu sáu tháng sau bạn chạy lại §0 mà ra số khác, đó là câu hỏi đáng hỏi hơn cả bảng này.*
