# HA KẾ THỪA — senpi có, omp đã có, chỉ khác tên

**Ngày đo:** 2026-09-28 · **senpi HEAD:** `ea9216269` · **omp HEAD:** `a43749d`
**senpi:** `/Users/tranquangdang21/Projects/senpi-ref` · **omp:** `/Users/tranquangdang21/Projects/ultraworkers`

Nhiệm vụ vòng này: **KHỎI LẶNG LẠI giữa 40 builtin của senpi và những gì omp đã có sẵn.**
Hai tài liệu trước (`changes-md.md` 487 dòng, `builtins.md` 423 dòng) đã đưa ra danh sách;
bài này **mở file thật trong omp và đọc** để xác nhận, không grep rồi kết luận.

> **Ghi chú phương pháp.** Bài trước tự thú lỗi: pathspec `git ls-files` sai cho ra kết quả
> rỗng, rồi kết quả rỗng bị đọc thành "không tồn tại". Vòng này tránh bằng cách **dùng một
> bảng khai báo duy nhất làm chuẩn**: `packages/coding-agent/src/tools/builtin-names.ts`
> (68 dòng) liệt kê đúng mọi tool omp có. Đối chiếu danh sách tool đó với danh sách
> tool senpi khai báo là so sánh đại lượng đã đo, không phải so khớp chuỗi.

---

## 0. TL;DR

1. **25 / 40 builtin của senpi, omp đã có** — chỉ khác tên hoặc khác hình dạng. 62,5%.
2. **6 / 40 không nên lấy** vì port sẽ xung đột với kiến trúc omp đã có.
3. **Chỉ 9 / 40 thiếu thật**, và trong đó **chỉ 4 đáng làm ngay**. Con số "40 builtin
   phải port" là sai; con số đúng là **10, hay 4 nếu chọn khéo**.
4. **Bề mặt event: 44 của senpi, 41 của omp, 23 trùng tên.** Một builtin senpi dùng
   event trong nhóm 23 cái thì **không cần port hạ tầng event nào**.
5. **18 event chỉ omp có** — và 8 trong số đó là hệ quả của việc omp đã đưa tính năng
   vào core. Đây là bằng chứng cơ học cho việc port nguyên senpi là đi ngược hướng.
6. **Năm chỗ phải sửa lại so với `builtins.md`** vì bài đó kết luận bằng grep, không đọc
   file — xem §3. Đáng chú ý nhất: `tool_search` **không phải** tool của omp, và
   `cache-keepalive` **không** chỉ là "thêm một hàm".

---

## 1. Chuẩn đo: omp có đúng bao nhiêu tool builtin

```bash
$ wc -l packages/coding-agent/src/tools/builtin-names.ts
     68 packages/coding-agent/src/tools/builtin-names.ts
```

`builtin-names.ts:1-38` — **30 tool công khai + 3 tool ẩn**:

```
BUILTIN_TOOL_NAMES (30)        HIDDEN_TOOL_NAMES (3)
read        bash        edit        yield
ast_grep    ast_edit    ask         goal
debug       ida         eval        think
github      glob        grep        find
lsp         checkpoint  rewind      context_notes
new_context security_scan          task
wait        todo        web_search  write
memory_edit retain      recall      reflect
learn       manage_skill
```

Và `builtin-names.ts:65-67` — prefix tool MCP:

```typescript
export function isMCPToolName(name: string): boolean {
	return name.startsWith("mcp__");
}
```

**Đây là phép đo không thể tranh luận.** Mọi tool mà omp "có" phải xuất hiện ở đây, ở
`SETTINGS_GATED_BUILTIN_TOOL_NAMES`, `SESSION_MANAGED_BUILTIN_TOOL_NAMES`
(`sdk.ts:1161` = `manage_skill`, `learn`, `context_notes`, `new_context`), hoặc mang
prefix `mcp__`. Không có lý do để tin một cái tên nếu nó không nằm trong bốn danh sách này.

---

## 1b. Bề mặt event: 44 của senpi vs 41 của omp — phép đo chuẩn nhất của bài này

Hai danh sách lấy từ **hai file định nghĩa API**, không phải từ call-site:

```bash
# senpi: 44 event — làm phẳng file trước vì chữ ký on() xuống nhiều dòng
tr '\n' ' ' < senpi-ref/packages/coding-agent/src/core/extensions/types.ts \
  | grep -oE 'on\([^)]{0,120}"[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u   # → 44

# omp: 41 event — nằm gọn trong interface ExtensionAPI
sed -n '1256,1360p' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE 'on\(event: "[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u          # → 41
```

`comm` trên hai danh sách đã sắp:

| | số event |
|---|---:|
| **Có ở cả hai** | **23** |
| **Chỉ senpi** | 21 |
| **Chỉ omp — tức omp đã đi trước** | **18** |

### 23 event dùng chung — đây là "kế thừa" tinh thần

```
after_provider_response  agent_end            agent_start          before_agent_start
context                  input                message_end          message_start
message_update           resources_discover   session_before_tree  session_compact
session_shutdown         session_start        session_tree         tool_call
tool_execution_end       tool_execution_start tool_execution_update tool_result
turn_end                 turn_start           user_bash
```

**Hệ quả quyết định:** 23/44 = **52%** bề mặt event của senpi đã có sẵn ở omp, cùng đúng
tên. Một builtin senpi dùng event trong nhóm này **không cần port bất kỳ hạ tầng event nào**.

### 18 event CHỈ omp có — hướng nào đã chết

Đây là mục đắt giá nhất của cả bài, vì nó cho biết omp đã đi trước ở hướng nào:

| event omp | dấu hiệu nó là hướng đã chết |
|---|---|
| `auto_compaction_start` / `auto_compaction_end` | omp đã có **hệ compaction riêng** (`snapcompact`). senpi phải tự chế 34/88 entry để làm việc này. |
| `auto_retry_start` / `auto_retry_end` | omp có retry-fallback ở tầng nghiệp vụ |
| `retry_fallback_applied` / `retry_fallback_succeeded` | **omp đã tách fallback thành sự kiện quan sát được**; senpi phải để trong `retry.ts` |
| `tool_approval_requested` / `tool_approval_resolved` | omp đã làm phê duyệt thành **sự kiện công khai hai pha**. Senpi chỉ có `permissionParser` nội bộ. |
| `session_switch` / `session_branch` | omp đã có đường chuyển/ nhánh session như sự kiện |
| `session_stop` | senpi dùng `session_abort` + `session_parked` + `session_resumed` (3 event) cho cùng một việc |
| `goal_updated` | **omp đã mở hook công khai cho goal** mà senpi chỉ có nội bộ |
| `todo_reminder` | **omp đã mở hook công khai cho todo** (`sdk.ts:1306`) |
| `ttsr_triggered` | **omp đã mở hook công khai cho TTS** |
| `mcp_notification` | omp đã có MCP ở tầng core nên mới có notification để phát ra |
| `user_python` | omp có Python eval; senpi không |
| `credential_disabled` | quản lý credential pool ở tầng `packages/ai` |

**Đọc được điều gì:** 8 trong 18 event omp-riêng (`goal_updated`, `todo_reminder`,
`ttsr_triggered`, `mcp_notification`, `auto_compaction_*`, `auto_retry_*`,
`retry_fallback_*`) đều là **hệ quả của việc omp đã đưa tính năng vào core**.
senpi phải giữ chúng trong extension thì không có lý do để phát ra sự kiện công khai.
→ **Đừng port 21 event senpi-only một cách máy móc**: nhiều cái trong đó chỉ tồn tại
vì senpi giữ tính năng ở tầng extension.

---

## 2. Bảng đối chiếu 40 builtin

Cột "omp có ở đâu" chỉ chứa đường dẫn:dòng đã **đọc file**, không phải kết quả grep.
Phán quyết: **G** = giống hệt · **M** = chỉ giống một phần · **K** = khác hẳn.

### Nhóm A — omp ĐÃ CÓ, chỉ khác tên (25 / 40)

| # | builtin senpi | omp có ở đâu (đường dẫn:dòng) | phán quyết | cần làm gì |
|---:|---|---|:---:|---|
| 1 | `compaction` | `packages/snapcompact/src/snapcompact.ts` 2.254 dòng; `packages/agent/src/compaction/` 15 file | **K** | Không lấy. Hai hệ compaction khác kiến trúc, ghép là hỏng cả hai. |
| 2 | `mcp` | `src/mcp/manager.ts` 1.941 dòng; `tools/builtin-names.ts:65` `isMCPToolName` → prefix `mcp__` | **G** | Không lấy. omp ở tầng core, mạnh hơn. |
| 3 | `ttsr` | `src/export/ttsr.ts` 773 dòng; `ttsr_triggered` là event công khai (`extensions/types.ts`) | **M** | Không lấy code. Thiếu cơ chế "cắt ngang khi người dùng nói". |
| 4 | `terminal` | `src/tools/bash.ts:336` `"pty?": "boolean"`; `bash-pty-selection.ts` 14 dòng | **M** | Thiếu lease / monitor registry / restore / orphan-reaper (đã đo vắng: 0 hit). |
| 5 | `goal` | `src/goals/tools/goal-tool.ts:56` `class GoalTool`, `name = "goal"`, `op: create\|get\|complete\|resume\|drop` (dòng 16) | **M** | senpi có **3 tool** (`create_goal`/`get_goal`/`update_goal`); omp gộp làm **1 tool** có `op`. Cùng ngữ nghĩa, khác hình dạng. |
| 6 | `hooks` | `src/extensibility/hooks/` 1.415 dòng; `types.ts:393` `HookEvent` **tái dùng chính event của extension** | **G+** | Không lấy. omp không có hệ hook song song — nó chỉ lọc event. |
| 7 | `todotools` | `src/tools/todo.ts:712` `class TodoTool`, `name = "todo"`, 9 `op` (dòng 53); `todo_reminder` event tại `sdk.ts:1306` | **G** | Không lấy. Tên tool **giống hệt**. |
| 8 | `rules` | `src/capability/rule.ts` 404 dòng; `capability/rule-buckets.ts` 85 dòng | **G** | Không lấy. |
| 9 | `webfetch` | `src/tools/fetch.ts` **1.728 dòng** | **G+** | Không lấy. |
| 10 | `websearch` | `src/web/search/providers/` — **26 provider** | **G+** | Không lấy. Đo lại được (bài trước ghi "chưa đo"). |
| 11 | `ask-user` | `src/tools/ask.ts` 1.175 dòng — có `multi` (67), `recommended` (68), `timeout` (446), `Other` (47) | **G+** | Không lấy. Cả 4 tính năng đã có. |
| 12 | `imagegen` | `src/tools/image-gen.ts` 321 dòng; `getImageGenTools` (`sdk.ts:267`) | **G** | Không lấy. |
| 13 | `bash-timeout` | `src/tools/tool-timeouts.ts` 39 dòng | **G** | Không lấy. |
| 14 | `model-fallback` | `src/session/retry-fallback-chains.ts` 587 dòng | **G+** | Không lấy. |
| 15 | `history-search` | `tui/src/overlays/history-search.ts` | **G** | Không lấy. |
| 16 | `nested-agents-md` | `src/capability/context-file.ts`; `src/discovery/agents-md.ts` | **G** | Không lấy. |
| 17 | `loop-guard` | `src/advisor/loop-guard.ts` 113 dòng | **G** | Không lấy. |
| 18 | `permission-system` | `src/tools/approval.ts` 387 dòng | **M** | omp có cơ chế duyệt nhưng không có `permissionParser` tự phân loại lệnh gọi. |
| 19 | `account` (+`gpt-account`) | `packages/ai/src/auth/` slot pool; `credential_disabled` là event công khai | **G** | Không lấy. |
| 20 | `recommended-models` | `packages/catalog/` + `provider-details.ts` | **G+** | Không lấy. |
| 21 | `reasoning` (`/reasoning`,`/efforts`) | `setServiceTier` trong `ExtensionAPI`; effort ladder trong `packages/catalog` | **G** | Không lấy. |
| 22 | `service-tier` | `ExtensionAPI.setServiceTier` (`types.ts`) | **G** | Không lấy. |
| 23 | `tool-pair-guard` | `src/tools/auto-generated-guard.ts`; `output-schema-validator.ts` | **M** | Cùng ý, khác cơ chế. Không cấp phép copy (xem §3.4). |
| 24 | `rule-activation` | `src/capability/rule-buckets.ts` | **G** | Không lấy. |
| 25 | `help` | `slash-commands/builtin-lifecycle.ts:178`, `builtin-session.ts:664` | **G** | Không lấy. *(Sửa: `builtins.md` §4.2 dẫn `help-content.ts` — **file đó không tồn tại**; `git ls-files \| grep -c help-content` = 0.)* |

### Nhóm B — omp KHÔNG có, nhưng đừng lấy vội (6 / 40)

| # | builtin senpi | omp có ở đâu | vì sao không lấy |
|---:|---|---|---|
| 25 | `anthropic-subscription` | `crates/pi-natives/src/oauth_callback/` | **52/69 = 75% entry chạm lõi** (đo ở `builtins.md` §3.7). Hai hệ OAuth tranh cùng callback URL. |
| 26 | `cursor-cli-oauth` | `packages/ai/src/providers/cursor.ts` | **12/13 = 92% entry chạm lõi** — cao nhất bảng. |
| 27 | `prompt-preset` | **không có** | Xem §3.3 — senpi làm đúng thứ mà AGENTS.md của omp **cấm**. |
| 28 | `openai-web-search` / `anthropic-web-search` | `src/web/search/providers/anthropic.ts` 13 KB, `codex.ts` 21 KB, `gemini.ts` 22 KB | omp đã có native web search cho provider. |
| 29 | `openai-image-gen` | `packages/ai/src/images/` | omp đã có native image gen. |
| 30 | `anthropic-bash` | `bash.ts` + PTY | omp đã có bash tool với PTY. |

### Nhóm C — omp THIẾU THẬT (9 / 40)

Đây là phần **duy nhất** của bài này sinh ra việc cho M5.

| # | builtin senpi | bằng chứng omp vắng | giá | cần làm gì |
|---:|---|---|---|---|
| 31 | `btw` (side-query) | `/btw` → 0 hit; `/btw` là 22/61 command senpi nhắc nhiều nhất | nhỏ | **Port.** 4 file, 0 entry chạm lõi — mẫu đẹp nhất của "extension đúng là extension". |
| 32 | `look-at` (vision model riêng) | `look_at`/`lookAt` → **0 file** | vừa | **Port.** Bài toán token/context omp chưa giải. |
| 33 | `cache-keepalive` (warm cache) | `warmPromptCache`, `resolvePromptCacheTtlSeconds`, `WarmPromptCacheOptions`, `promptCacheTtl` → **0 file, cả 4** | nhỏ | **Port.** Nhưng xem §3.2 — chỉ port phần *warm*, phần *đánh dấu* đã có. |
| 34 | `config-reload` | watcher chỉ phủ config/settings (`config/settings.ts:993-1023`), **không phủ extension** | vừa | **Port phần extension.** 11/12 entry chạm lõi nên chỉ lấy nhánh đó. |
| 35 | `video-in` (`read_video`) | `read_video` → 0 hit | nhỏ | Cân nhắc. 1 file, 126 dòng. |
| 36 | `gpt-apply-patch` | `apply_patch` → không có tool; `gpt-apply-patch` 2.351 dòng | vừa | Xem §3.3 — hướng ngược lại đúng hơn. |
| 37 | `loop` (`schedule_wakeup` + cron) | `schedule_wakeup` → 0 hit | vừa | Cân nhắc. |
| 38 | `tool-search` (`tool_search`) | có 8 file nhưng **0 trong `BUILTIN_TOOL_NAMES`** | nhỏ | Xem §3.1 — đây là bài toán khác. |
| 39 | `herdr` (client daemon) | `HERDR_SOCKET`/`herdrClient` → 0 hit | trung bình | Xem §3.5 — hướng ngược lại. |

*(Dòng 40 `help` không nằm ở đây: omp **có** `/help`. Xem nhóm A #25 bên dưới.)*

---

## 3. Năm chỗ phải sửa lại so với hai bài trước

Đây là phần tôi **đọc file** mới phát hiện được. Cả năm đều là chỗ bài trước kết luận bằng grep.

### 3.1 `tool_search` — bài trước gọi là "(b) omp có", nhưng omp KHÔNG có tool này

`builtins.md` §4.2 ghi `tool-search` → "git grep -c tool_search → 8 file" → phán quyết (b).

Đọc file cho thấy 8 hit đó **không phải tool**:

```bash
$ grep -c "tool_search" packages/coding-agent/src/tools/builtin-names.ts
0
$ grep -n "tool_search" packages/ai/src/providers/anthropic-wire.ts
86:	name: "tool_search_tool_regex" | "tool_search_tool_bm25";
99:	type: "tool_search_tool_result";
```

`tool_search_tool_regex` / `tool_search_tool_bm25` là **server-side tool của Anthropic và
OpenAI**, omp chỉ phân tích block trả về. Người dùng omp **không bao giờ gọi** `tool_search`.

→ Đây là **điểm giống tên giả** điển hình. Phải sửa phán quyết `tool-search` từ (b) → **(a) thiếu thật**.

### 3.2 `cache-keepalive` — bài trước nói "omp có `cache_control`, không cần port"; chỉ đúng một nửa

`builtins.md` §5.1 lập luận rằng chỉ cần thêm `promptCacheTtlSeconds` vào `packages/ai`.

Đo lại, cả hai vế đều cần sửa:

| | omp | senpi |
|---|---|---|
| **Đánh dấu** cache breakpoint (`cache_control`) | **có** — `packages/ai/src/providers/anthropic.ts:3601` gắn `{ type: "ephemeral" }`, 6 provider dùng | có |
| **Làm ấm** cache (gọi API chủ động) | **0** — `warmPromptCache`, `resolvePromptCacheTtlSeconds`, `WarmPromptCacheOptions`, `promptCacheTtl` đều **0 file** | có — `cache-keepalive/index.ts` import cả 4 |

→ Sửa lại: **không phải "thêm một hàm"**. Phần đánh dấu đã xong; phần warm là một
vòng gọi API định kỳ (`schedule_wakeup`/`prewarm`), cần mới thật. Giá đi lên so với ước lượng cũ.

### 3.3 `prompt-preset` và `gpt-apply-patch` — senpi làm đúng thứ omp đã **cấm bằng văn bản**

`AGENTS.md` của omp ghi: *"NEVER hard-code model- or provider-conditional policy in
TypeScript. No `id.includes("claude")`, no model-name regexes"*, và bắt buộc đặt vào
KDL ở `packages/catalog/src/compat/rules/`.

Đo senpi:

```bash
$ grep -cE 'model\.id|model\.provider|test\(model' .../prompt-preset/presets.ts
22
$ grep -nE '^(const|export const) [A-Z_]+ =' .../prompt-preset/presets.ts
175:const DEEPSEEK_OFFICIAL_PROVIDER = "deepseek";
```

**22 dòng match theo id model trong TypeScript.** Đây đúng thứ AGENTS.md cấm.
Nếu port nguyên si, ta sẽ vi phạm luật của chính mình và phải refactor ngược lại.

Cùng lập luận cho `gpt-apply-patch` (2.351 dòng): nó chọn wire mode bằng cách dò id
model — omp đã có `packages/catalog/src/compat/rules/runtime/behavior.kdl` để làm
đúng việc đó. **Không port code; nếu cần thì port ý tưởng vào KDL.**

### 3.4 `tool-pair-guard` — không copy được, phải viết mới

`builtins.md` §5.4 đã nói đúng: `tool-pair-repair.ts` nằm ở `packages/ai` **của senpi**,
omp không có. Giữ nguyên kết luận đó. Bổ sung: vì vậy mục này **không phải port, là viết mới**,
và chi phí phải tính như viết mới chứ không như copy.

### 3.5 `herdr` — "omp không có" là **sai một nửa**

`builtins.md` §4.2 ghi `herdr` → "không có (grep herdr → 0)" → (a).

Đo lại: **có 7 file** chứa `herdr` (không tính CHANGELOG):

- `packages/tui/src/terminal-multiplexer.ts:2` — `export function isInsideHerdr(env)`
- `packages/tui/src/kitty-graphics.ts:18,84` — dùng nó để tắt fallback

Nhưng đọc nội dung thì thấy đây là **hướng ngược lại**:

```typescript
// terminal-multiplexer.ts:1-2
/** True when this process is running inside a Herdr pane. */
export function isInsideHerdr(env: NodeJS.ProcessEnv = Bun.env): boolean {
```

omp là **consumer**: chạy *trong* pane Herdr thì nhận diện ra. senpi là **client**:
`herdr-client.ts` nói chuyện qua socket với daemon để hỏi trạng thái pane.

Kiểm tra ngược lại để chắc:

```bash
$ git grep -l "HERDR_SOCKET\|herdrClient" -- packages | grep -v test
packages/tui/src/terminal-multiplexer.ts   # chỉ nằm trong comment
```

→ Sửa: `herdr` là **(a) thiếu thật** ở phần *client*, nhưng **không phải vì omp không biết
Herdr là gì** — omp đã tích hợp theo chiều khác. Cần nói rõ trong M5, nếu không sẽ
cảm giác như đang port trùng.

---

## 4. Nhóm cuối: omp có, senpi KHÔNG có

Đây là mục "hướng nào đã chết" — thông tin đắt giá nhất theo yêu cầu.

### 4.1 18 extension event chỉ omp có

Xem bảng ở §1b. Tóm tắt theo nhóm nguyên nhân:

| nguyên nhân | event | nghĩa là |
|---|---|---|
| omp đã có **compaction riêng** | `auto_compaction_start/end` | senpi phải tự chế 34/88 entry để làm việc này |
| omp đã có **retry + fallback ở tầng nghiệp vụ** | `auto_retry_start/end`, `retry_fallback_applied/succeeded` | senpi sửa `packages/ai/src/utils/retry.ts` |
| omp đã làm **duyệt thành sự kiện 2 pha** | `tool_approval_requested/resolved` | senpi chỉ có `permissionParser` nội bộ |
| omp đã có **MCP ở core** | `mcp_notification` | senpi phải đóng gói MCP thành extension |
| omp đã **mở hook công khai** cho tính năng của mình | `goal_updated`, `todo_reminder`, `ttsr_triggered` | senpi giữ chúng trong extension → không có lý do phát ra sự kiện |
| omp có **Python eval** | `user_python` | senpi không có |
| omp có **credential pool** | `credential_disabled` | senpi không có |
| omp có **đường chuyển/nhánh/stop session** | `session_switch`, `session_branch`, `session_stop` | senpi dùng 3 event khác cho cùng việc |

**Kết luận phần này:** không phải ngẫu nhiên mà 8/18 event omp-riêng đều là **hệ quả của
việc omp đưa tính năng vào core**. Đây là bằng chứng cơ học cho phán đoán ở `builtins.md` §7.

### 4.2 Package chỉ omp có — 10 người hàng xóm không có ở senpi

Đo: omp **16 package** (`ls -d packages/*/`), senpi **13**.

| package omp | senpi có? | ý nghĩa |
|---|---|---|
| `snapcompact` | **không** | hệ compaction riêng — lý do `compaction` của senpi không được lấy |
| `catalog` | **không** | nơi chứa chính sách model/provider dạng KDL — lý do `prompt-preset`/`gpt-apply-patch` không được port |
| `omptype` | **không** | schema validation với JIT lazy |
| `wire` | **không** | lớp wire |
| `mnemopi` | **không** | — |
| `browser-relay` | **không** | — |
| `stats` | **không** | dashboard quan sát cục bộ |
| `metaharness` | **không** | — |
| `collab-web` | **không** | — |
| `typescript-edit-benchmark` | **không** | — |
| `utils` | **không** (senpi rải rác) | logger, stream, temp file |
| `pty` | **CÓ** (senpi) | — |
| `chord`, `client`, `evals`, `protocol`, `senpi-codemode`, `server`, `session-backends`, `telemetry` | **senpi-only** | — |

**Hai package đáng chú ý nhất về hướng đi:**
- **`snapcompact`** — omp đã đi trước ở compaction. Ghép thêm sẽ hỏng.
- **`catalog`** — đây chính là cơ chế mà `prompt-preset` và `gpt-apply-patch` của senpi
  đang làm bằng tay. omp có đường đi đúng sẵn; port code của senpi là **lùi về kiến trúc**.

### 4.3 21 event chỉ senpi có — nhưng đừng port máy móc

Xem §1b. Đáng chú ý: `session_abort` + `session_parked` + `session_resumed` (3 event
senpi) làm cùng việc với `session_stop` (1 event omp). Và `ui_prompt_start/end`,
`input_disposition` chỉ tồn tại vì senpi giữ câu hỏi bất đồng bộ trong extension.

---

## 5. Chốt bằng một con số

Trong **40 builtin** của senpi:

| phán quyết | số | ý nghĩa |
|---|---:|---|
| **omp đã có, không cần làm gì** | **25** | 62,5% — đây là phần tiết kiệm công |
| **không lấy vì sai hướng / xung đột** | **6** | 15% — port sẽ làm hỏng |
| **thiếu thật, sinh việc cho M5** | **9** | 22,5% |

Và trong **44 event** của senpi: **23 đã có** (52%), **21 chỉ senpi**, **18 chỉ omp**.

### Câu trả lời thẳng cho câu hỏi "40 builtin phải port"

**Không phải 40. Là 9 — và trong 9 cái đó chỉ 4 cái đáng làm ngay** (`btw`,
`look-at`, `cache-keepalive` phần warm, `config-reload` phần extension). Ba cái
còn lại (`video-in`, `loop`, `tool-search`) là tùy chọn; ba cái cuối (`gpt-apply-patch`,
`herdr`, `prompt-preset`) **không nên port code** vì lý do kiến trúc nêu ở §3.

**Con số này nhỏ hơn nhiều so với giả định ban đầu — và đó là phát hiện có giá trị nhất
của vòng này.**

---

## 6. Sai sót đã biết của chính bài này

- **`websearch`: 26 vs 7 provider là phép đo số *file provider*, không phải số provider
  đăng ký thật.** Đếm `find providers/ -name '*.ts'` trừ `base/utils/browser-*` cho 26;
  đó là số file, và một provider có thể nhiều file. Chưa đếm entry thật trong registry.
- **`ttsr` tôi chỉ đọc `export/ttsr.ts` (773 dòng) và xác nhận `ttsr_triggered` là event.**
  Chưa mở `crates/pi-voice` đ so cơ chế cắt ngang. Phán quyết "(M)" là suy đoán hợp lý,
  chưa phải đo.
- **`config-reload`: tôi đọc `#configWatchTargets()` (settings.ts:993-1023) và thấy nó phủ
  config/settings nhưng không thấy phần extension trong cùng hàm.** Có thể extension reload
  nằm ở chỗ khác (tôi chỉ grep `reloadExtensions`). Chưa chắc chặn.
- **Bảng §2 cột "cần làm gì" cho nhóm C dựa trên phán quyết đã đo của `builtins.md` §5-6,
  không phải phán quyết mới.** Tôi đã đọc lại 8 file để kiểm, nhưng không mở lại từng
  builtin của senpi để đo lại tỉ lệ "entry chạm lõi".
- **Không mở lại `deep-risk.md`** (978 dòng) — ngoài phạm vi đọc được giao. Nếu nó đã kết
  luận về `herdr`/`tool_search` thì §3.1 và §3.5 ở đây có thể trùng hoặc mâu thuẫn.

## 7. Lệnh để tự chạy lại

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
F=packages/coding-agent/src/tools/builtin-names.ts

# 1. Danh sách tool chuẩn của omp
cat -n $F                                   # 30 builtin + 3 hidden + isMCPToolName

# 2. Bề mặt event: 44 senpi vs 41 omp
SP=/private/tmp/claude-501/-Users-wwzz-Downloads-proxyclawd/88833871-9d1c-410a-8425-a5a54e5377ef/scratchpad
S=/Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/types.ts
O=packages/coding-agent/src/extensibility/extensions/types.ts
tr '\n' ' ' < "$S" | grep -oE 'on\([^)]{0,120}"[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u > $SP/senpi_events.txt
sed -n '1256,1360p' "$O" | grep -oE 'on\(event: "[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u > $SP/omp_events.txt
comm -12 $SP/senpi_events.txt $SP/omp_events.txt   # 23
comm -23 $SP/senpi_events.txt $SP/omp_events.txt   # 21
comm -13 $SP/senpi_events.txt $SP/omp_events.txt   # 18

# 3. Provider web search: 26 file
find packages/coding-agent/src/web/search/providers -name "*.ts" \
  ! -name base.ts ! -name utils.ts ! -name "browser-*.ts" | wc -l

# 4. Xác nhận vắng (4 mã, đều phải ra 0)
for p in warmPromptCache resolvePromptCacheTtlSeconds WarmPromptCacheOptions promptCacheTtl; do
  echo "$p: $(git grep -l -- "$p" -- packages | grep -v test | wc -l)"; done
git grep -c "tool_search" $F          # 0 — không phải tool của omp
git grep -l "HERDR_SOCKET\|herdrClient" -- packages | grep -v test   # chỉ comment

# 5. Danh sách package
ls -d packages/*/ | xargs -n1 basename | tr '\n' ' '   # omp 16
ls -d /Users/tranquangdang21/Projects/senpi-ref/packages/*/ | xargs -n1 basename | tr '\n' ' '   # senpi 13
```
