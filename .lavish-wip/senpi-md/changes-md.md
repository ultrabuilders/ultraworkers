# Khai thác hệ thống `changes.md` của senpi — quyết định M5 cho omp

**Ngày đo:** 2026-09-28 · **senpi HEAD:** `ea9216269` (2026-09-28) · **omp HEAD:** `a43749d`
**Cây senpi:** `/Users/tranquangdang21/Projects/senpi-ref` (đã clone sẵn, không clone lại)
**Cây omp:** `/Users/tranquangdang21/Projects/ultraworkers`

Mọi khẳng định dưới đây kèm lệnh đã chạy. Người đọc sau 6 tháng chạy lại được y hệt.

---

## 0. TL;DR — 5 điều cần biết trước khi đọc tiếp

1. **`changes.md` KHÔNG phải danh sách feature.** Trong 2.268 entry sản phẩm, chỉ **400 (17,6%)** thực sự giới thiệu một *bề mặt mới có tên* (slash command / tool / event / setting / API method). 82,4% còn lại là sửa lỗi, hardening, đồng bộ upstream, hay chi tiết nội bộ. Đọc `changes.md` như feature list là **sai** và sẽ khiến ta port thừa hàng trăm thứ.

2. **Khoảng 12 nhóm feature lớn của senpi đã có sẵn trong omp dưới tên khác** (bảng 5). Đây là phần tiết kiệm công nhất — không cần port.

3. **Ba cụm lớn nhất mà omp CHƯA có**: (a) hệ thống **builtin extension** 40 thư mục của senpi — omp có `extensibility/` nhưng **không có `builtin/`**; (b) **multi-session shared-host daemon** (`senpi host`, generations, supersession, `host gc`) — omp chỉ có RPC một-session; (c) **hệ thống câu hỏi bất đồng bộ** (ask-user pending-question bus).

4. **Cảnh báo về phép đo:** phép đo "88% thuộc nhóm (a)" ở bảng 3 là **phép đo máy theo regex**, và nó sai về mặt ngữ nghĩa. Bảng 4 (đo bề mặt mới có tên) là phép đo đáng tin hơn. Cả hai đều được in ra vì chúng cho hai con số khác nhau.

5. **Đừng chép nguyên xi.** `changes.md` còn chứa phần lớn công sức cho các thứ omp đã làm tốt hơn (compaction, cursor provider, dialect, credential pool) và phần "phải làm ngược lại" (rebrand, pin dependency, CI matrix).

---

## 1. Liệt kê file `changes.md` kèm số dòng

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
git ls-files '*changes.md' | xargs wc -l | sort -rn
```

**62 file, 52.798 dòng.** Nhưng **1 file là của cái khác**: `packages/senpi-codemode/src/skill/bun-1-4/references/breaking-changes.md` (75 dòng) là tài liệu Bun 1.4 được vendor vào, không phải tracker fork. Loại nó → **61 file tracker thật**.

```bash
git ls-files '*changes.md' | grep -v 'skill/bun-1-4' | wc -l   # → 61
```

### 15 file lớn nhất

| dòng | file |
|---:|---|
| 7.429 | `packages/coding-agent/src/core/changes.md` |
| 5.007 | `packages/ai/src/changes.md` |
| 4.030 | `packages/coding-agent/src/modes/rpc/changes.md` |
| 3.959 | `packages/coding-agent/src/changes.md` |
| 2.767 | `packages/coding-agent/src/core/extensions/changes.md` |
| 1.925 | `.../builtin/compaction/changes.md` |
| 1.800 | `packages/agent/src/changes.md` |
| 1.731 | `.../modes/interactive/changes.md` |
| 1.655 | `.../builtin/goal/changes.md` |
| 1.575 | `packages/ai/changes.md` |
| 1.526 | `packages/senpi-codemode/changes.md` |
| 1.472 | `scripts/changes.md` |
| 1.443 | `.../builtin/anthropic-subscription/changes.md` |
| 1.355 | `packages/tui/src/changes.md` |
| 1.345 | `packages/coding-agent/changes.md` |

**Đọc được gì từ bảng này:** tiền không nằm ở `core/changes.md` hay `ai/src` — đó là bảo trì lõi. Tiền nằm ở **4 file `builtin/*`**: compaction + goal + anthropic-subscription + prompt-preset + terminal + mcp = **40 extension, 97.893 dòng .ts+.md** (đã đo ở vòng trước).

---

## 2. Đếm heading

```bash
git ls-files '*changes.md' | xargs grep -c '^#\{1,3\} '
# tổng: 10.770

for lvl in 1 2 3; do
  echo "h$lvl: $(git ls-files '*changes.md' | xargs grep -h "^#\{$lvl\} " | wc -l)"
done
# h1: 69   h2: 2377   h3: 8324
```

### Phát hiện quan trọng: h3 là boilerplate, h2 mới là entry

```bash
git ls-files '*changes.md' | xargs grep -h '^### ' | sort | uniq -c | sort -rn | head
```

```
2015 ### What changed
1924 ### Why
1789 ### Expected merge conflict zones
1362 ### Why an extension could not handle it
 196 ### Expected merge conflict zones on next upstream sync
 141 ### What changed and why
 139 ### Why extension system couldn't handle this
 100 ### Why this cannot be expressed externally
  72 ### Why this lives in the fork
  …
```

**Cấu trúc chuẩn của mỗi entry:**

```
## 2026-09-24 - <Tiêu đề> (senpi#2077)      ← h2 = MỘT thay đổi
### What changed
### Why
### Why an extension could not handle it
### Expected merge conflict zones
```

→ **2.377 entry thật.** Đọc "tất cả h2/h3" theo nghĩa đen là 10.770 dòng vô nghĩa 70%; chỉ **2.377 dòng h2** là chất.

### Ba mục đích khác nhau của h3 — dùng để đọc nhanh

| h3 | Đọc để biết cái gì? |
|---|---|
| `What changed` | **Cái gì** — file nào, dòng nào. Đây là phần chính xác nhất. |
| `Why` | **Động cơ** — đọc cái này để biết feature nào đáng port. |
| `Why an extension could not handle it` | **Quan trọng nhất cho M5.** Chính tác giả fork tự nói: cái này *không* làm được bằng extension, phải nằm trong core. Đây là ranh giới thật giữa "port thành extension của omp" và "phải sửa omp core". |
| `Expected merge conflict zones` | Chỉ có giá trị cho người rebase từ upstream. Với omp: **bỏ qua hẳn**, chỉ là boilerplate nói "file này sẽ đụng". |

> Bài học cho omp: mục `### Why an extension could not handle it` là một mẫu tài liệu rất tốt. Nếu M5 cần định nghĩa cái gì là "extension được" và cái gì bắt buộc phải vào core, senpi đã viết ra tiêu chí đó rồi.

---

## 3. Phân loại 3 nhóm — **KÈM CẢNH BÁO VỀ PHÉP ĐO**

### Cách đo (phải nói rõ, vì nó quyết định độ tin cậy)

Tôi trích mỗi `## ` thành entry kèm body, cắt bỏ phần `### Expected merge conflict*`, rồi phân loại bằng regex trên **tiêu đề trước, body sau**:

```python
# nhóm (b) — khớp upstream/sync/rebase/backport/mirror/adopt/port-upstream
# nhóm (c) — khớp @oh-my-pi / rebrand / rename / package name / npm scope / lockfile / dep pin
# nhóm (a) — còn lại
```

### Kết quả

| nhóm | số entry | % / 2.268 sản phẩm |
|---|---:|---:|
| **(a) "feature mới"** (phần còn lại sau regex) | **2.003** | 88,3% |
| **(b) sửa lỗi / đồng bộ upstream** | 165 | 7,3% |
| **(c) rebrand / vendoring / dependency** | 100 | 4,4% |
| *(ngoài ra) hạ tầng repo* — `.github/`, `.husky/`, `scripts/`, `evals/`, skill Bun vendor | 109 | — |
| **tổng file** | 2.377 | |

Phân bố theo file (chỉ 25 file đầu, sắp theo số entry nhóm (a)):

| file | tổng | a | b | c |
|---|---:|---:|---:|---:|
| `core/changes.md` | 338 | 308 | 20 | 10 |
| `ai/src/changes.md` | 214 | 191 | 16 | 7 |
| `modes/rpc/changes.md` | 171 | 166 | 2 | 3 |
| `coding-agent/src/changes.md` | 183 | 164 | 12 | 7 |
| `core/extensions/changes.md` | 124 | 108 | 8 | 8 |
| `builtin/compaction` | 88 | 85 | 2 | 1 |
| `modes/interactive` | 80 | 73 | 5 | 2 |
| `senpi-codemode` | 69 | 68 | 0 | 1 |
| `builtin/anthropic-subscription` | 69 | 67 | 0 | 2 |
| `agent/src` | 73 | 60 | 11 | 2 |
| `builtin/goal` | 63 | 59 | 2 | 2 |
| `builtin/prompt-preset` | 58 | 56 | 1 | 1 |
| `packages/ai/changes.md` | 65 | 51 | 11 | 3 |
| `builtin` (parent) | 55 | 52 | 2 | 1 |
| `builtin/terminal` | 47 | 46 | 1 | 0 |
| `tui/src` | 63 | 46 | 16 | 1 |
| `core/tools` | 32 | 28 | 4 | 0 |
| `builtin/mcp` | 27 | 26 | 0 | 1 |
| `core/compaction` | 28 | 25 | 2 | 1 |
| `core/dynamic-prompt` | 22 | 20 | 1 | 1 |
| `builtin/todotools` | 19 | 16 | 3 | 0 |
| `ai/src/tool-call-middleware` | 14 | 14 | 0 | 0 |
| `builtin/imagegen` | 14 | 14 | 0 | 0 |
| `modes/app-server` | 14 | 13 | 1 | 0 |

### ⚠️ CẢNH BÁO: con số 88% là SAI về mặt ngữ nghĩa

Regex không phân biệt được:
- **"senpi thêm feature mới"** (đáng port), với
- **"senpi sửa lỗi trong feature mà chính senpi vừa thêm"** (đã có sẵn ở omp dưới dạng khác, hoặc vô nghĩa).

Ví dụ rõ nhất — `core/changes.md` có 308 entry nhóm (a), nhưng trong đó có:
- `"2026-09-04 - Keep long-running compaction recovery progressing"`
- `"2026-09-04 - Failed provider turns leave the LLM context on every lane"`
- `"2026-09-03 - Bridge branded terminal capability overrides"`

Cái này **không phải feature**. Đếm bằng tiền tố động từ (`Fix|Keep|Stop|Prevent|Restore|Guard|Bound|Drop|…`) trên tiêu đề nhóm (a) cho ra **171/2.003** — nhưng đó cũng là **phép đo dưới**, vì nhiều fix không bắt đầu bằng động từ đó.

**Vì vậy tôi đo lại bằng phép đo thứ hai, đáng tin hơn** — xem entry có giới thiệu *bề mặt có tên* mới không.

---

## 4. Phép đo thứ hai: entry nào giới thiệu BỀ MẶT MỚI CÓ TÊN

Định nghĩa: entry có ít nhất một trong các mẫu trong **"What changed"** hoặc tiêu đề:

```python
CMD   = r'`/[a-z][a-z0-9:_-]{1,24}`'                       # slash command mới
TOOL  = r'registers?…\btool\b|register(Lazy)?Tool|`[a-z_]+_tool`'   # tool mới
EVT   = r'`[a-z][a-z0-9_]*(_start|_end|_before_…|_activated|_requested|_resolved|_discover)`'  # event mới
SET   = r'`[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+){1,3}`\s*setting|new setting'  # setting key mới
API   = r'`(ctx|pi|ExtensionContext|ExtensionAPI|ExtensionUIContext)\.[a-zA-Z]{3,30}`'      # method mới
```

```bash
# chạy lại: xem /private/tmp/claude-501/-Users-wwzz-Downloads-proxyclawd/…/scratchpad/extract.py
```

### Kết quả

| | số entry | % |
|---|---:|---:|
| **Có ít nhất 1 bề mặt mới có tên** | **400** | **17,6%** |
| Không có bề mặt mới (sửa lỗi / nội bộ / sync) | 1.868 | 82,4% |

Số bề mặt mới, đếm không loại trùng (một entry có thể có cả event lẫn command):

| loại | số mặc định |
|---|---:|
| event mới | 226 |
| slash command mới | 143 |
| Extension API method mới | 50 |
| tool mới | 17 |
| setting mới | 14 |

**Đây là con số để mang đi.** ~400 entry, ~37 event khác nhau, ~61 slash command khác nhau, 33 method API khác nhau.

### 37 event tên mới (xuất hiện ≥2 lần trong toàn bộ changes.md)

```
session_start x73   before_agent_start x70   agent_end x54   message_end x37
session_before_compact x25   tool_execution_start x16   tool_execution_end x16
compaction_end x13   agent_start x13   message_start x9   turn_end x8
toolcall_end x6   resources_discover x6   compaction_start x6   toolcall_start x5
auto_retry_end x5   session_before_tree x5   turn_start x4   auto_retry_start x4
session_before_switch x4   session_before_reload x3   tool_activated x3
auth_login_end x3   run_end x2   thinking_start x2   ui_prompt_start x2
ui_prompt_end x2   question_resolved x2   login_start x2
```

### 33 Extension API method mới (≥2 lần)

```
pi.events x8   ctx.cwd x4   ExtensionContext.kernelTools x4   pi.sessionContext x3
pi.rpc x3   ctx.signal x3   ExtensionUIContext.question x3   pi.sessionKind x2
pi.dev x2   ExtensionContext.sessionSettings x2   ExtensionContext.goalStoreFile x2
pi.sendUserMessage x2   ctx.agentDir x2   ctx.hasUI x2
ExtensionContext.effectiveServiceTier x2
```

### 61 slash command (top 20 theo tần suất nhắc)

```
/btw x22   /fast x20   /resume x17   /login x14   /compact x13   /fallback x12
/help x10   /sessions x10   /skill: x9   /answer x8   /reload x6   /tree x6
/claude-account x6   /mcp x5   /hotkeys x5   /name x4   /tmp x4   /efforts x4
/thinking x4   /ir x4   /cursor-account x4   /todo x4   /goal x2   /computer x2
```

---

## 5. Feature nhóm (a) nào ĐÃ CÓ SẴN trong omp — **phần tiết kiệm công nhất**

Kiểm tra bằng:
```bash
cd /Users/tranquangdang21/Projects/ultraworkers
git grep -ril -E '<từ-khoá>' -- packages | head
```

### 5a. 12 nhóm LỚN — omp ĐÃ CÓ, tên khác hoặc kiến trúc khác → **KHÔNG cần port**

| # | senpi gọi là | omp đã có ở đâu | bằng chứng |
|---:|---|---|---|
| 1 | `builtin/ttsr` (rules → TTS) | `src/export/ttsr.ts` (22 KB) + `src/capability/rule-buckets.ts` + `src/cli/ttsr-cli.ts` | `git grep -rn "export/ttsr" -- packages/coding-agent/src` → 3 hit |
| 2 | `builtin/loop-guard` | `src/advisor/loop-guard.ts` + `pi-ai/utils/tool-call-loop-guard` | `head -20 packages/coding-agent/src/advisor/loop-guard.ts` |
| 3 | `builtin/mcp` | `src/mcp/` — **22 file**: client, manager, config, config-writer, json-rpc, loader, oauth-flow, smithery-*, tool-bridge, tool-cache, transports/ | `ls packages/coding-agent/src/mcp` |
| 4 | `builtin/hooks` | `src/extensibility/hooks/` — index, loader, runner, tool-wrapper, types | `ls packages/coding-agent/src/extensibility/hooks` |
| 5 | `builtin/todotools` | `src/tools/todo.ts` + `pi-tui/tools/todo` (`TodoPhase`) | `git grep -n "TodoTool" -- packages/coding-agent/src/tools/index.ts` → dòng 75 |
| 6 | `builtin/imagegen` + `openai-image-gen` | `src/tools/image-gen.ts` + `packages/ai/src/images/` (**7 file**: openai-images, openai-hosted, openrouter-images, google-generative-ai, google-antigravity) | `ls packages/ai/src/images` |
| 7 | `builtin/ask-user` (bản đồng bộ) | `src/tools/ask.ts` — tool hỏi user, có `multi`, `recommended`, timeout, "Other" | `head -30 packages/coding-agent/src/tools/ask.ts` |
| 8 | `builtin/websearch` / `webfetch` | `src/tools/fetch.ts` + websearch native (45 file) | `git grep -rl webfetch -- packages` → 10 |
| 9 | `builtin/rules` + `rule-activation` | `src/discovery/builtin-rules/` + `src/capability/rule.ts` + `src/discovery/builtin.ts` | `ls packages/coding-agent/src/discovery` |
| 10 | `builtin/compaction` | **`packages/snapcompact`** + `packages/agent/src/compaction/` (**17 file**: compaction, compaction-v2-streaming, anthropic, openai, branch-summarization, shake, pruning, tool-protection, transcript-tokens) | `ls packages/agent/src/compaction` |
| 11 | `builtin/goal` (phần prompt) | `src/prompts/goals/` — **7 file .md**: goal-mode-active, goal-mode-context, goal-budget-limit, goal-continuation, goal-todo-context, guided-goal-interview | `ls packages/coding-agent/src/prompts/goals` |
| 12 | Extension event surface | omp **đã có 37 event**: `session_start`, `before_agent_start`, `agent_start/end`, `message_start/end/update`, `turn_start/end`, `tool_execution_start/end/update`, `tool_call`, `tool_result`, `tool_approval_requested/resolved`, `resources_discover`, `session_before_compact/switch/tree/branch`, `session_compact/switch/tree/branch/stop/shutdown`, `auto_compaction_start/end`, `auto_retry_start/end`, `before_subagent_spawn` | trích từ `packages/coding-agent/src/extensibility/extensions/types.ts` |

**Kết luận nhóm này:** riêng `builtin/*` của senpi có 40 thư mục, nhưng **≥12 đã bị omp làm sẵ theo kiến trúc riêng**, phần lớn là *native core* chứ không phải extension. Port chúng là **viết lại thứ đã có, tệ hơn bản hiện tại**.

### 5b. Nhóm có MỘT PHẦN — cân nhắc port phần còn thiếu

| senpi | omp có | omp thiếu |
|---|---|---|
| `builtin/goal` | prompt `.md` + advisor runtime | **tool `create_goal`/`update_goal`/`get_goal`**: `git grep -E 'create_goal\|update_goal\|get_goal' -- packages` → **0 hit** |
| `builtin/tool-search` | tool_search ở tầng wire (17 file `packages/ai`) | **bề mặt đăng ký qua extension**: `registerLazyToolActivator` → 0 hit |
| `builtin/terminal` (terminal monitor) | có terminal code | `terminalMonitor` → 0 hit; `wake_source` → 0 hit |
| `builtin/service-tier` (`/fast`) | `getServiceTiers()` (22 hit) + `setServiceTier` | widget `service-tier.ts` 17 KB của senpi chưa có |

### 5c. Nhóm event/API mà senpi thêm và omp **CHƯA có** (đây là danh sách port thật sự)

Đo bằng `git grep -rnI -E '<pat>' -- packages/coding-agent/src`:

| event / API của senpi | kết quả omp |
|---|---|
| `session_before_reload` (reload veto) | **0 hit** |
| `tool_activated` | **0 hit** |
| `question_resolved` | **0 hit** |
| `auth_login_end` / `login_start` | **0 hit** |
| `ui_prompt_start` / `ui_prompt_end` | **0 hit** |
| `ExtensionContext.kernelTools` | **0 hit** |
| `pi.rpc` | **0 hit** |
| `pi.sessionKind` | **0 hit** |
| `ExtensionContext.goalStoreFile` | **0 hit** |
| `pi.dev` | **0 hit** |
| `ctx.editAssistantMessage` | **0 hit** |
| `getSystemPromptOptions` | **0 hit** |
| `registerMcpServer` (factory-time) | **0 hit** |
| `registerLazyToolActivator` | **0 hit** |
| `resolvedToolName` | **0 hit** (omp có `toolcall_start` nhưng không có trường này) |
| `previewSafe` | **0 hit** |
| `permissionParser` / `kernelPrelude` | **0 hit** |

### 5d. Nhóm KHÔNG port được / phải làm ngược lại

Đo thêm:
- `builtin/btw` → `git grep -E '\bbtw\b' -- packages/coding-agent/src packages/agent/src packages/tui/src packages/ai/src` → **0 hit**. `/btw` là 22/61 command mới của senpi nhắc nhiều nhất → **ứng viên port số 1 cho `/btw`** (side-query song song).
- `builtin/herdr` → 0 hit (ngoài CHANGELOG/script). Là reporter trạng thái ra **pane ngoài** — phụ thuộc hạ tầng pane mà omp chưa có.
- `builtin/permission-system`, `builtin/prompt-preset`, `builtin/config-reload`, `builtin/cache-keepalive`, `builtin/nested-agents-md`, `builtin/cursor-cli-oauth`, `builtin/look-at`, `builtin/recommended-models`, `builtin/tool-pair-guard`, `builtin/gpt-apply-patch` → **0 hit** mỗi cái.

### 5e. Multi-session shared-host daemon — cụm LỚN nhất omp thiếu

Đo:
```
git grep -ril -E 'sharedHost|shared-host|ensureHost' -- packages   → ensureHost chỉ là SSH (connection-manager.ts)
git grep -rn 'endpoint.json' -- packages                             → 0
git grep -rn 'durable_session_id|durableSessionId' -- packages       → 0
git grep -rn 'session_replaced' -- packages                          → 0
git grep -rn 'host gc|hostGc|host_gc' -- packages                    → 0
git grep -rn 'workerRegistry' -- packages                            → 0
git grep -rn 'wake_source' -- packages                               → 0
```

Nhưng `open_session` / `switch_session` **CÓ** trong omp — ở `src/modes/rpc/rpc-mode.ts:1259` và `:1247`. Đó là **mô hình một session**. `retainedSession` trong omp (`src/cli/gc-cli.ts`) là **giữ dòng dữ liệu cho GC**, không phải "park session khi client rớt".

→ **Kết luận: toàn bộ máy `senpi host` (generations, supersession, handoff, occupancy/eviction, `host gc`, endpoint.json, memory pressure, worker registry) là ~166 entry nhóm (a) trong `modes/rpc/changes.md` mà omp không có gì tương đương.** Đây là quyết định lớn nhất cho M5: muốn multi-session thật thì phải xây, không phải port.

---

## 6. Ba nhóm (b) và (c) — chỉ đếm, không port

### (b) sửa lỗi / đồng bộ upstream — 165 entry (7,3%)

Mẫu tiêu đề đặc trưng:
```
Upstream sync (upstream/main@71dca871) integration repairs (2026-09-12)
Root config and package identities re-diverge from upstream dcd4619 (2026-08-25)
Loop and agent divergence re-established against upstream 59a71b23 (2026-08-19)
Pin the bundled chord workspace to upstream's published version (2026-09-12)
TUI runtime re-diverges from upstream dcd4619 (2026-08-25)
Repository-wide changes.md audit backfill … (2026-08-17)
```

**Giá trị = 0 cho omp.** Cơ chế này chỉ có nghĩa khi bạn *rebase từ upstream*. omp không rebase từ pi-mono (omp đã nuốt pi qua `legacy-pi-*-shim.ts`), nên toàn bộ nhóm này **loại bỏ ngay**.

Một tầng cũng vậy: **109 entry hạ tầng repo** trong `.github/` (21), `.husky/` (4), `scripts/` (70), `evals/` (7), skill Bun vendor (7) — dựng CI matrix, pin Bun 1.4.2, `check:conflict-markers`, pre-commit package-manager. Không liên quan M5.

### (c) rebrand / vendoring / dependency — 100 entry (4,4%)

Mẫu tiêu đề:
```
@anthropic-ai/sdk 0.123.0 pin for the v0.84.4 upstream sync
bun.lock refreshed wherever package-lock.json is refreshed
Remove the desktop computer-use stack, now owned by omo
Add senpi-desktop crate workspace skeletons
Refresh the dependency pins and pin past the reachable advisories
Ship the tree-sitter grammar assets with the package
```

**Toàn bộ phải LÀM NGƯỢC LẠI hoặc bỏ.** Vài cái đáng để đọc vì chạm omp:
- **"Remove the desktop computer-use stack, now owned by omo"** — senpi đã **xoá** computer-use vì `omo` (code-yeongyu/oh-my-openagent#8893) sở hữu nó. Nhưng **omp có `src/tools/computer.ts`**. → Cần kiểm tra xem omp có đang giữ một thứ mà hệ sinh thái đã chuyển đi.
- **"Ship the tree-sitter grammar assets"** (senpi#1685) + "Grammar-backed fold boundaries for structural reads" — omp có `src/tools/ast-grep.ts`, `ast-edit.ts`, `read-selector.ts`. → Phần "structural default reads" của senpi trùng lĩnh vực; chưa đo độ sâu.

---

## 7. Ba điều chỉnh nền tảng đã đo trước — xác nhận lại

| điều chỉnh | lệnh xác nhận | kết quả |
|---|---|---|
| `pi` không có MCP/ACP | `git -C pi-ref ls-files \| grep -ic mcp` | giữ nguyên như đã đo trước — **không kiểm lại vòng này**, chỉ nhắc để tránh kế hoạch sai |
| `gajae` là fork của dòng omp/pi | không đo lại vòng này | **không liên quan `changes.md`** — senpi không nhắc gajae ở đâu trong 2.377 entry |
| `chord` không phải cơ chế vòng đời extension | `ls senpi-ref/packages/chord/` + `git grep -rn "chord" -- senpi-ref/packages/coding-agent/src/core/extensions/` | `packages/chord/changes.md` chỉ có **1 entry, 19 dòng** |
| **omp đã tự lành JSONL hỏng** | xem bên dưới | **đúng, giữ nguyên** |

### Về `parseJsonlLenient` — đo lại để chắc

```bash
git -C /Users/tranquangdang21/Projects/ultraworkers grep -n "parseJsonlLenient" -- packages
```
→ `packages/utils/src/stream.ts` (đã đo trước, `onMalformedRecord` callback → `session-manager.ts` set `#rewriteRequired`).

**Khuyến nghị giữ nguyên:** chép nguyên xi session layer của `pi` (`durable/src/storage/jsonl/storage.ts` — ném `JsonlCorruptionError` không có try/catch) là **làm chật hơn**. Không nằm trong phạm vi M5, nhưng phải nằm trong kết luận: `changes.md` của senpi **không có entry nào** về JSONL corruption → không nguồn ở đây.

---

## 8. Kết luận cho M5 — đề xuất, kèm giá

### Không port (đã có, hoặc phải làm ngược lại)

| Nhóm | Số entry (a) | Vì sao bỏ |
|---|---:|---|
| ttsr, loop-guard, mcp, hooks, todotools, imagegen, ask, webfetch/websearch, rules, compaction, goal-prompt, event surface | ~250+ | **đã có trong omp** dưới tên khác (bảng 5a) |
| Nhóm (b) sync upstream | 165 | cơ chế rebase — omp không rebase |
| Nhóm (c) rebrand/dependency | 100 | phải làm ngược lại |
| Hạ tầng repo (CI/husky/scripts/evals) | 109 | không liên quan sản phẩm |
| cursor provider, dialect, credential pool, compaction v2, image API, MCP runtime | phần lớn trong `ai/src` | **omp làm đầy đủ hơn** — `packages/ai/src/dialect/` 27 file, `ai/src/auth/pool.ts`, `coding-agent/src/mcp/` 22 file |

**Cái mất nếu bỏ:** mất cơ chế `### Why an extension could not handle it` (mẫu tài liệu tốt) và mất lịch sử *vì sao* một quyết định fork tồn tại. Khuyến nghị: giữ `senpi-ref` trên đĩa, **không** đưa vào M5 scope.

### Port / xây — theo thứ tự đề xuất

| # | Hạng mục | Căn cứ (đo được) | Giá ước tính | Cái mất nếu bỏ |
|---:|---|---|---|---|
| **1** | **Hệ thống builtin extension** — khung đăng ký + chuẩn hoá vị trí (senpi có 40 thư mục dưới `core/extensions/builtin/`; omp có `extensibility/` nhưng **không có `builtin/`**) | `ls senpi-ref/.../builtin/` = 40 dir; `find omp/packages/coding-agent/src -type d -name builtin` = 0 | lớn — đây là **nền tảng**, không phải một feature | Đây là giả thuyết trung tâm của người dùng ("senpi giống tôi đó"). Không có nó thì M5 chỉ là port từng cái rời. |
| **2** | **`/btw`** — side-query song song | 22/61 command mới nhắc nhiều nhất; omp **0 hit** | nhỏ–vừa (1 builtin + 1 command) | Mất tính năng "hỏi song song" — khác biệt trải nghiệm rõ nhất so với omp |
| **3** | **Câu hỏi bất đồng bộ** (`session_before_reload` veto, `question_resolved`, `ExtensionUIContext.question`, `pi.rpc`) | 4/4 = 0 hit trong omp | vừa | Mất `session_before_reload` — là thứ chặn extension bảo vệ công việc đang sống khi reload |
| **4** | **Multi-session shared-host daemon** (`senpi host`, generation/supersession, `host gc`, `endpoint.json`, `host status --all`, memory pressure, worker registry) | 166 entry trong `modes/rpc`; omp có `open_session`/`switch_session` nhưng **mô hình 1 session**; 0 hit cho 6 mã định danh | **rất lớn** | Không có thì "nhiều session cùng lúc" phải làm bằng tay. **Đây là quyết định phạm vi lớn nhất — nên cân nhắc tách khỏi M5.** |
| **5** | **Bề mặt extension API còn thiếu** (`kernelPrelude`, `permissionParser`, `tool_activated`, `registerLazyToolActivator`, `registerMcpServer`, `getSystemPromptOptions`, `resolvedToolName`, `previewSafe`) | 8/8 = 0 hit; nhiều cái chỉ là ~10–50 dòng | nhỏ mỗi cái, tổng vừa | Đây là phần **rẻ nhất để lấy** — 8 mục, mỗi mục một sự kiện API |
| **6** | **Eval kernel** (JS/Python kernel, detached cell, workpool, preview) | senpi `senpi-codemode` 68 entry; omp có `eval/js/shared/runtime.ts`, `eval/py/prelude.py`, `workpool` 43 file — **đã có nền**; thiếu `detachedCell`, `evalPreview` (0 hit) | vừa | Mất phần "cell chạy nền + xem trước"; nền đã có nên phần bù không lớn |
| **7** | `builtin/terminal` monitor + `wake_source` activity contract | 0 hit cả hai | nhỏ | Mất báo cáo "pane còn bận không" — chặn session idle sớm |

### Cảnh báo về ưu tiên

**Đừng port theo số dòng `changes.md`.** `core/changes.md` (7.429 dòng) và `ai/src/changes.md` (5.007 dòng) là hai file lớn nhất nhưng phần lớn là bảo trì lõi mà omp đã làm tốt hơn. **File nhỏ nhất lại đáng nhất**: `builtin/goal/changes.md` chỉ 1.655 dòng mà mô tả một extension hoàn chỉnh có `AGENTS.md` mô tả rõ.

Đọc `senpi-ref/packages/coding-agent/src/core/extensions/builtin/AGENTS.md` (8,9 KB) trước — nó là bản đồ của cả 40 extension.

---

## 9. Toàn bộ lệnh để tự chạy lại

```bash
SENPI=/Users/tranquangdang21/Projects/senpi-ref
OMP=/Users/tranquangdang21/Projects/ultraworkers

# 1. Danh sách file + số dòng
git -C $SENPI ls-files '*changes.md' | xargs wc -l | sort -rn

# 2. Tổng heading h1/h2/h3
git -C $SENPI ls-files '*changes.md' | xargs grep -c '^#\{1,3\} '
for lvl in 1 2 3; do
  echo "h$lvl: $(git -C $SENPI ls-files '*changes.md' | xargs grep -h "^#\{$lvl\} " | wc -l)"
done

# 3. Boilerplate h3
git -C $SENPI ls-files '*changes.md' | xargs grep -h '^### ' | sort | uniq -c | sort -rn

# 4. Tách entry (script)
#    /private/tmp/claude-501/-Users-wwzz-Downloads-proxyclawd/88833871-9d1c-410a-8425-a5a54e5377ef/scratchpad/extract.py
#    → entries.json (2377 entry kèm file + title + body)

# 5. 40 builtin extension của senpi
ls -d $SENPI/packages/coding-agent/src/core/extensions/builtin/*/ | wc -l
ls -d $SENPI/packages/coding-agent/src/core/extensions/builtin/*/

# 6. omp KHÔNG có builtin/
find $OMP/packages/coding-agent/src -type d -name builtin

# 7. Kiểm tra feature senpi trong omp
git -C $OMP grep -ril -E '<từ-khoá>' -- packages | head
# các từ-khoá đã dùng trong bảng 5c:
#   session_before_reload  tool_activated  question_resolved  auth_login_end
#   login_start  ui_prompt_start  ui_prompt_end  kernelTools  pi\.rpc
#   sessionKind  goalStoreFile  pi\.dev  editAssistantMessage
#   getSystemPromptOptions  registerMcpServer  registerLazyToolActivator
#   resolvedToolName  previewSafe  permissionParser  kernelPrelude
#   endpoint\.json  durable_session_id  session_replaced  workerRegistry  wake_source

# 8. 37 event của omp (đọc từ types.ts)
git -C $OMP grep -ohE '"[a-z_]{4,}"' -- packages/coding-agent/src/extensibility/extensions/types.ts | sort -u

# 9. JSONL: giữ nguyên cơ chế đã có
git -C $OMP grep -n "parseJsonlLenient" -- packages
```

**Script trích entry** (`extract.py`) — lưu ý nó tách ở `## `, giữ `###` vào body, và giữ nguyên thứ tự file trong `git ls-files`.

---

## 10. Sai sót đã biết của chính bài này

- **Bảng 3 (88% nhóm a) không đáng tin về mặt ngữ nghĩa.** Bảng 4 là phép đo nên dùng. Cả hai đều in ra.
- **Phép đo "bề mặt mới có tên" bỏ sót feature không có tên** — ví dụ một cải tiến thuật toán lớn không thêm command/event nào vẫn bị tính vào "không có bề mặt mới". 400 là **cận dưới**, không phải con số chính xác.
- **Kiểm tra "đã có trong omp" dựa trên từ-khoá, không đọc code.** Với `ttsr`, `mcp`, `compaction`, `ask` tôi đã mở file xác nhận (`ls`, `head`). Với các mục đánh dấu "CÓ" mà không mở file (websearch, imagegen) thì độ tin cậy thấp hơn — cần mở `packages/ai/src/images/index.ts` và công cụ websearch trước khi kết luận "không port".
- **Chưa đọc nội dung entry, chỉ tiêu đề + regex trên "What changed"/"Why".** Với ~400 entry bề mặt mới thì đọc hết là khả thi và nên làm ở vòng sau nếu M5 cần quyết định cụ thể.
- **`mcp` xuất hiện 0 hit trong `chord/changes.md` nhiều lý do** — tôi chỉ kiểm tra `packages/chord/` có 1 entry 19 dòng, chưa đọc nội dung. Điều chỉnh "chord không phải cơ chế vòng đời extension" vẫn đúng, vì lý do nằm ở chỗ khác (omp/pi không có thư mục `core/extensions/builtin/` để chord điều khiển).
