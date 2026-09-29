# API extension: senpi vs omp — bài đo cho M5

Ngày đo: 2026-09-28. HEAD senpi `ea92162` (2026-09-28 14:12:31 +0900). Branch omp: `milestone-1`.

Mọi khẳng định dưới đây kèm lệnh. Người đọc sau 6 tháng chạy lại được.

Hai cây:

```bash
git -C /Users/tranquangdang21/Projects/senpi-ref log -1 --format='%H %ad' --date=iso
git -C /Users/tranquangdang21/Projects/ultraworkers log -1 --format='%H %ad' --date=iso
```

---

## 0. KẾT LUẬN ĐẦU TIÊN — sửa lại giả thuyết

**Giả thuyết "omp chưa có hệ thống extension" SAI. Phải bỏ.**

omp **đã có** hệ thống extension đầy đủ, cùng kiến trúc với senpi, cùng tên file, cùng hợp đồng API. Không phải "Gemini-style declarative" — tôi đã đo nhầm vì thấy `capability/extension.ts` mô tả extension theo kiểu manifest MCP.

Đo được:

```bash
git -C /Users/tranquangdang21/Projects/ultraworkers ls-files 'packages/coding-agent/src/extensibility/*' | grep -E '\.ts$' | xargs wc -l | tail -1
# 21241 total        ← toàn bộ extensibility/ (extensions + hooks + plugins + shims)

git -C /Users/tranquangdang21/Projects/ultraworkers ls-files 'packages/coding-agent/src/extensibility/extensions/*' | grep -E '\.ts$' | xargs wc -l
#  677 loader.ts
# 1963 runner.ts
# 1849 types.ts
#  432 wrapper.ts
#   83 managed-timers.ts
#  145 directory-resolution.ts
#   78 get-commands-handler.ts
#   40 compact-handler.ts
#   39 model-api.ts
#   18 index.ts
#   13 load-errors.ts
# 5337 total
```

So sánh đối xứng:

| | senpi | omp |
|---|---|---|
| Thư mục | `packages/coding-agent/src/core/extensions/` | `packages/coding-agent/src/extensibility/extensions/` |
| `types.ts` (hợp đồng API) | 2.732 dòng | 1.849 dòng |
| `runner.ts` (dispatch) | 2.032 dòng | 1.963 dòng |
| `loader.ts` | 1.050 dòng | 677 dòng |
| `wrapper.ts` | 69 dòng | 432 dòng |
| **Tổng hạ tầng** | **6.923 dòng** (16 file) | **5.337 dòng** (11 file) |

omp còn có thêm hai tầng senpi **không có ở cùng chỗ**:
- `extensibility/hooks/` — 1.415 dòng (hook script pre/post tool).
- `extensibility/plugins/` — 7.908 dòng, gồm `marketplace/` 2.202 dòng (fetcher, registry, source-resolver, cache).

**Hệ quả cho M5: M5 KHÔNG phải "dựng hạ tầng extension". M5 là "viết 40 builtin và cắm vào hạ tầng đã có".** Rủi ro chính của M5 nằm ở 18 hook còn thiếu và 11 method API còn thiếu, không nằm ở loader.

`capability/extension.ts` (47 dòng) và `capability/hook.ts` (40 dòng) là **tầng discovery**, không phải hệ thống thực thi. Chúng chỉ khai báo capability để `discovery/` quét ra danh sách entrypoint rồi đưa vào runner. Đọc cả hai file toàn văn xác nhận: chúng chỉ có `defineCapability` + `validate`, không có dispatch.

---

## 1. Quy mô (đo)

### senpi

```bash
git -C /Users/tranquangdang21/Projects/senpi-ref ls-files 'packages/coding-agent/src/core/extensions/*' | wc -l
# 664

git -C /Users/tranquangdang21/Projects/senpi-ref ls-files 'packages/coding-agent/src/core/extensions/*' | grep -E '\.(ts|tsx|md)$' | xargs wc -l | tail -1
# 107656 total      ← toàn bộ extensions/ gồm hạ tầng + builtin

git -C /Users/tranquangdang21/Projects/senpi-ref ls-files 'packages/coding-agent/src/core/extensions/builtin/*' | grep -E '\.ts$' | xargs wc -l | tail -1
# 83982 total

git -C /Users/tranquangdang21/Projects/senpi-ref ls-files 'packages/coding-agent/src/core/extensions/builtin/*' | grep -E '\.md$' | xargs wc -l | tail -1
# 13911 total
```

**Cảnh báo phép đo:** `git ls-files 'path/*.ts'` dùng glob của git, `*` của git **xuyên qua `/`**. Phép `builtin/*.ts` trả về toàn bộ cây đệ quy, không chỉ file trần. Con số 3.266 dòng mà một phép đo kiểu đó cho là sai. Số đúng tách `.ts` / `.md`: 83.982 + 13.911 = **97.893 dòng**, 603 file `.ts` + 41 file `.md` = 644 file.

### Số thư mục builtin: 40 — xác nhận

Đếm bằng điều kiện "thư mục con có `index.ts`", không đếm bằng `cut -d/` (phép đó cho 57 vì tính luôn file trần):

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
git ls-files 'packages/coding-agent/src/core/extensions/builtin/*' \
  | sed 's|.*/builtin/||' | cut -d/ -f1 | sort -u \
  | while read d; do
      git ls-files --error-unmatch "packages/coding-agent/src/core/extensions/builtin/$d/index.ts" >/dev/null 2>&1 && echo "$d"
    done | tee /tmp/senpi_builtin_dirs.txt | wc -l
# 40
```

Ngoài 40 thư mục còn có **file `.ts` trần** đóng vai extension (diff.ts, files.ts, redraws.ts, tps.ts, gpt-account.ts, prompt-url-widget.ts, service-tier.ts, repository-identity.ts, account-display-name.ts, import-repro.ts, monitor-state-event.ts, oauth-login-interaction.ts, eval-only-routing.ts) — 13 file, 3.266 dòng.

`builtin/index.ts` import tĩnh 48 factory (`grep -cE 'from "\./'` → 48). Có `globalDefaultExtensionIds = ["diff","files","prompt-url-widget","tps"]`.

### LOC từng thư mục builtin (senpi)

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
for d in $(cat /tmp/senpi_builtin_dirs.txt); do
  n=$(git ls-files "packages/coding-agent/src/core/extensions/builtin/$d/*" | grep -E '\.ts$' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
  echo "$n $d"
done | sort -rn
```

```
9327 mcp            8779 compaction     7281 anthropic-subscription  6962 terminal
5186 cursor-cli-oauth  4663 hooks        4566 goal        4042 loop
3507 ttsr            2941 prompt-preset  2842 rules       2668 todotools
2317 config-reload   2287 websearch      2051 gpt-apply-patch  1638 permission-system
1284 ask-user        1213 tool-search    1062 webfetch     922 look-at
 880 imagegen        718 loop-guard      539 nested-agents-md  483 cache-keepalive
 418 herdr           414 openai-image-gen 401 history-search  389 btw
 272 openai-web-search 269 tool-pair-guard  252 reasoning  249 anthropic-web-search
 207 model-fallback  185 recommended-models  148 help      132 rule-activation
 126 video-in        118 bash-timeout     103 anthropic-bash  82 account
```

**Top 4 (mcp, compaction, anthropic-subscription, terminal) = 32.349 dòng = 41% của 40 builtin.** Đây là chỗ đáng để nhìn kỹ.

---

## 2. Danh sách hook — dữ liệu quan trọng nhất

Khai báo chuẩn (không phải suy diễn):

```typescript
// senpi: types.ts:1902
export type ExtensionHandler<E, R = undefined> =
	(event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;

// omp: types.ts:1242 — y hệt, cùng chữ ký
export type ExtensionHandler<E, R = undefined> =
	(event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;
```

### 2.1 Bảng so sánh 64 hook

Lệnh tách từ file (không gõ tay):

```bash
# omp — 46 hook
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE 'event: "[a-z_.]+"' | sed 's/event: "//;s/"//' | sort > /tmp/omp_ev.txt

# senpi — 44 hook
awk 'NR>=1907 && NR<=2266' packages/coding-agent/src/core/extensions/types.ts \
  | grep -oE 'event: "[a-z_.]+"' | sed 's/event: "//;s/"//' | sort > /tmp/senpi_ev.txt

comm -12 /tmp/omp_ev.txt /tmp/senpi_ev.txt   # chung
comm -23 /tmp/omp_ev.txt /tmp/senpi_ev.txt   # chỉ omp
comm -13 /tmp/omp_ev.txt /tmp/senpi_ev.txt   # chỉ senpi
```

Kết quả: **senpi 44 · omp 46 · chung 26 · chỉ-senpi 18 · chỉ-omp 20.** (26+18=44 ✓, 26+20=46 ✓)

**Hook dùng chung (26):**
`after_provider_response` `agent_end` `agent_start` `before_agent_start` `before_provider_request` `context` `input` `message_end` `message_start` `message_update` `resources_discover` `session_before_compact` `session_before_switch` `session_before_tree` `session_compact` `session_shutdown` `session_start` `session_tree` `tool_call` `tool_execution_end` `tool_execution_start` `tool_execution_update` `tool_result` `turn_end` `turn_start` `user_bash`

**Chỉ senpi, omp THIẾU (18):**
`agent_settled` `before_provider_headers` `input_disposition` `model_select` `project_trust` `session_abort` `session_before_fork` `session_before_reload` `session_compact_failed` `session_extensions_removed` `session_info_changed` `session_parked` `session_resumed` `system_prompt_change` `thinking_level_select` `tool_activated` `ui_prompt_end` `ui_prompt_start`

**Chỉ omp, senpi không có (20):**
`auto_compaction_start` `auto_compaction_end` `auto_retry_start` `auto_retry_end` `retry_fallback_applied` `retry_fallback_succeeded` `before_subagent_spawn` `credential_disabled` `goal_updated` `mcp_notification` `session_before_branch` `session_branch` `session_stop` `session_switch` `session.compacting` `todo_reminder` `tool_approval_requested` `tool_approval_resolved` `ttsr_triggered` `user_python`

**Đây không phải "omp kém".** 20 hook chỉ-omp là thứ omp đã đi trước: retry/fallback telemetry, approval flow, subagent spawn, todo reminder. Port nguyên xi senpi sẽ **xoá mất** 20 hook này nếu ai đó viết lại `runner.ts` theo bản senpi.

### 2.2 Hook senpi-only, builtin dùng bao nhiêu lần

Không phải cả 18 hook đều quan trọng. Đo mật độ sử dụng trong `builtin/`:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
for e in project_trust session_info_changed session_parked session_resumed \
         session_before_fork session_before_reload session_compact_failed \
         session_extensions_removed session_abort before_provider_headers \
         agent_settled ui_prompt_start ui_prompt_end model_select \
         system_prompt_change thinking_level_select tool_activated input_disposition; do
  c=$(git grep -l "on(\"$e\"" -- 'packages/coding-agent/src/core/extensions/builtin/*' 2>/dev/null | wc -l | tr -d ' ')
  echo "$c $e"
done | sort -rn
```

```
16 model_select          ← dùng nặng
 6 agent_settled
 4 session_abort
 2 session_resumed
 2 session_parked
 2 session_extensions_removed
 1 thinking_level_select
 1 session_info_changed
 1 session_before_fork
 1 project_trust
 1 input_disposition
 0 ui_prompt_start
 0 ui_prompt_end
 0 tool_activated
 0 system_prompt_change
 0 session_compact_failed
 0 session_before_reload
 0 before_provider_headers
```

**7 hook có 0 builtin nào dùng** → bỏ qua lúc đầu, không tốn công.
**`model_select` là nút thắt thật sự** — 16 builtin đăng ký nó. Không có nó thì 16 builtin phải viết lại. Xếp hạng seam số 1.

### 2.3 Bất biến mà tác giả tự ghi

`senpi/packages/coding-agent/src/core/extensions/AGENTS.md:61`:

> Adding a new event without adding an `*EventResult` type and `pi.on` overload + a `runner.ts` emit helper — silent breakage downstream.

Một event mới = **3 việc bắt buộc**: type `*Event` → overload `pi.on` → hàm emit trong `runner.ts`. Bỏ một trong ba là hỏng âm thầm. Đây là mẫu thêm event mà M5 phải theo khi bổ sung 18 hook kia.

---

## 3. Bề mặt API (`ExtensionAPI`)

Khai báo: senpi `types.ts:1907`, omp `types.ts:1256`. Cùng tên `pi`.

Trích nguyên văn một phần (senpi) để thấy dạng đăng ký:

```typescript
// senpi types.ts:1988-1990
on(event: "tool_call", handler: ExtensionHandler<ToolCallEvent, ToolCallEventResult>): void;
on(event: "tool_result", handler: ExtensionHandler<ToolResultEvent, ToolResultEventResult>): void;
on(event: "user_bash", handler: ExtensionHandler<UserBashEvent, UserBashEventResult>): void;
```

### 3.1 Method: senpi 34 · omp 29 · chung 23

Lệnh (dùng **cùng một regex** cho cả hai — dùng lệch regex sẽ ra số sai, tôi đã dính lỗi này một lần):

```bash
# senpi
awk 'NR>=1907 && NR<=2266' packages/coding-agent/src/core/extensions/types.ts \
  | grep -oE '^\t[a-zA-Z]+[?]?[(<]' | tr -d '\t(<' | sort -u
# omp
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE '^\t[a-zA-Z]+[?]?[(<]' | tr -d '\t(<' | sort -u
```

> Regex phải có `[(<]` chứ không phải `[(]` — method generic (`sendMessage<T>(`) sẽ bị rơi nếu chỉ khớp `(`. Đo lại bằng `[(]` cho kết quả 26 thay vì 29.

**senpi có, omp THIẾU (11):**
`executeTool` · `registerEntryRenderer` · `registerFilesystemPolicy` · `registerLazyToolActivator` · `registerMarkdownTransformer` · `registerMcpServer` · `registerReadClassifier` · `registerRemovedToolHint` · `setSessionFastMode` · `setSessionModel` · `setSessionThinkingLevel`

**omp có, senpi không (6):**
`getServiceTiers` · `setServiceTier` · `registerAssistantThinkingRenderer` · `registerComposerShape` · `registerFileDeleteFallback` · `registerFileWriteFallback`

**Hai điểm quan trọng, tránh hiểu nhầm:**

1. **`registerMcpServer` không phải seam.** omp đã có MCP tới mức nguyên bản (`src/mcp/` — client, config, json-rpc, config-writer) và thêm 2 hook `mcp_notification`. omp thiếu *method đăng ký*, không thiếu *tính năng*. Xếp hạng: thấp.
2. **`registerFilesystemPolicy` là seam thật.** `grep -rn "FilesystemPolicy" packages/coding-agent/src/` trong omp → **0 hit**. omp xử lý phê duyệt ghi file theo đường khác: `registerFileWriteFallback` + `tools/approval.ts` (387 dòng) + `tools/file-write-fallback.ts` (467 dòng). Khác kiến trúc, không phải khác tên. 1.638 dòng `permission-system` của senpi cần cân nhắc lại từ đầu.

### 3.2 Bề mặt `ctx.ui`

- omp 23 method (`types.ts:235-356`), senpi 28 (`types.ts:173-341`).
- Chênh lệch: senpi có `setWorkingVisible`, `setWorkingIndicator`, `setHiddenThinkingLabel`, `getEditorComponent` — omp thiếu 4 cái này.
- 23 method còn lại **giống hệt tên**. Phần UI gần như drop-in.

### 3.3 `ExtensionContext` (object `ctx` truyền vào handler)

omp `types.ts:452`: field `ui`, `mode`, `hasUI`, `cwd`, `sessionManager`, `modelRegistry`, `localProtocolOptions?`, `model`, `models`, `agent`, `memory?`; method `abort`, `clearTimer`, `compact`, `getAsyncJobSnapshot`, `getContextUsage`, `getSystemPrompt`, `hasPendingMessages`, `isIdle`, `isProjectTrusted`, `runEphemeralTurn?`, `setInterval`, `setTimeout`, `shutdown`.

senpi `types.ts:444` có `ExtensionContext` tương tự. Kiểm nhanh bằng:

```bash
awk 'NR>=452 && NR<=572' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE '^\t(readonly )?[a-zA-Z]+[?]?:' | sed 's/^\t//'
```

---

## 4. Cơ chế nạp

### 4.1 senpi — file JS/TS **ngoài repo**, quét thư mục

`loader.ts:1002` `discoverAndLoadExtensions` ba nguồn:

```typescript
// senpi loader.ts:1023-1029
// 1. Project-local: cwd/${CONFIG_DIR_NAME}/extensions/
const localExtDir = path.join(resolvedCwd, CONFIG_DIR_NAME, "extensions");
addPaths(discoverExtensionsInDir(localExtDir));

// 2. Global: agentDir/extensions/
const globalExtDir = path.join(resolvedAgentDir, "extensions");
addPaths(discoverExtensionsInDir(globalExtDir));

// 3. Explicitly configured paths  → loadExtensions(allPaths, resolvedCwd, eventBus)
```

Quy tắc quét trong một thư mục (`loader.ts:965`), **không đệ quy quá 1 cấp**:

```typescript
// senpi loader.ts:910
function isExtensionFile(name: string): boolean {
	return name.endsWith(".ts") || name.endsWith(".js");
}
// loader.ts:923 resolveExtensionEntries: package.json với "pi.extensions" → index.ts → index.js
// loader.ts:965 discoverExtensionsInDir: file *.ts/*.js trần, HOẶC thư mục con có entrypoint
```

Manifest là namespace `pi` (`pi-manifest.ts:5`):

```typescript
export interface PiManifest {
	system?: boolean;
	extensions?: string[];
	skills?: string[];
	prompts?: string[];
	themes?: string[];
	hooks?: string[];
}
```

### 4.2 omp — cùng quy tắc, **thêm** một tầng plugin

`loader.ts:572` `discoverExtensionPaths` ba nguồn:

```typescript
// omp loader.ts:608 — 1. capability "extension-modules", chỉ provider "native"
const discovered = await loadCapability<ExtensionModule>(extensionModuleCapability.id, {
	...loadOptions, providers: ["native"],
});
for (const ext of discovered.items) addPath(ext.path);

// omp loader.ts:625 — 2. hook script .ts/.js
if (options.includeAmbientHooks !== false) {
	const hooks = await loadCapability<Hook>(hookCapability.id, loadOptions);
	for (const hookPath of hooks.items.map(h => h.path)
		.filter(p => isExtensionFile(path.basename(p)))) addPath(hookPath);
}

// omp loader.ts:637 — 3. entrypoint từ plugin đã cài
addPaths(await getAllPluginExtensionPaths(cwd));
```

Manifest chấp nhận **cả hai** namespace (`directory-resolution.ts:69`):

```typescript
const manifest = isRecord(pkg) ? (pkg.omp ?? pkg.pi) : undefined;
const entries = isRecord(manifest) ? manifest.extensions : undefined;
```

**omp đã tương thích ngược manifest của senpi.** Extension senpi khai báo `"pi": { "extensions": [...] }` sẽ được omp đọc. Đây là đường vào rẻ nhất cho thử nghiệm M5.

### 4.3 Hai khác biệt cơ chế đáng lưu ý

| | senpi | omp |
|---|---|---|
| Cờ tắt builtin | `enabled/disabled builtin` trong settings | `disabledExtensionIds` → `extension-module:<name>` |
| Bảo mật nạp | không thấy | `isProjectTrusted` + `project-trust.json` ở bên senpi; omp có `runEphemeralTurn`, `isProjectTrusted` |

Cơ chế cache module cũng khác — senpi có `extension-module-cache.ts` (136 dòng) với "one module generation per source version" (`AGENTS.md:56`), omp không có file tương ứng. Không quan trọng cho M5 trừ khi port `config-reload`.

---

## 5. Hợp đồng phiên bản — **KHÔNG CÓ Ở CẢ HAI**

Đo, không suy đoán:

```bash
grep -rniE 'apiVersion|api_version|extensionVersion|EXTENSION_API' \
  /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/
# 0 dòng

grep -rniE 'apiVersion|extensionApiVersion|EXTENSION_API_VERSION|api_version' \
  /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/extensibility/
# 0 dòng
```

Không có cơ chế negotiate. Tác giả senpi tự nói trong `AGENTS.md:3`:

> `types.ts` is ~2367 lines of public API contract. **Treat changes here as breaking until proven otherwise.**

**Không có gì hỏng khi nâng cấp** — vì không có version để hỏng. Extension là mã nguồn, compile cùng dự án, gắn chặt đúng build. Đổi `types.ts` là đổi hợp đồng cho mọi extension đang chạy, không có cảnh báo nào.

**Hệ quả M5 — đây là điểm quan trọng nhất của mục 5:** port extension sang omp là **copy mã nguồn + sửa cho khớp `ExtensionAPI` của omp**, không phải cài package. Không có manifest version để khai báo, không có negotiation để thất bại êm. Mọi sai lệch lộ ra **lúc compile**, đây là tin tốt.

---

## 6. Port 40 builtin của senpi vào omp: cần gì trước

### 6.1 Danh sách seam, xếp theo số builtin nó gỡ

Đo mật độ dùng bằng `git grep -l "on(\"X\"" -- '.../builtin/*' | wc -l`:

| # | Seam | Loại | Bằng chứng | Ước lượng |
|---|---|---|---|---|
| **S1** | `model_select` | event (16 builtin dùng) | `types.ts:1984` senpi, vắng mặt trong `types.ts:1256-1590` omp | thêm 1 event + 1 `*EventResult` + 1 emit trong `runner.ts` |
| **S2** | 7 event có 0 builtin dùng | event | `ui_prompt_start/end`, `tool_activated`, `system_prompt_change`, `session_compact_failed`, `session_before_reload`, `before_provider_headers` | **bỏ qua** — 0 việc |
| **S3** | `executeTool` | method | senpi `types.ts:2451`; `git grep -n executeTool -- 'packages/coding-agent/src/extensibility/extensions/types.ts'` → không có dòng nào | 1 method + plumbing vào agent tool executor |
| **S4** | `registerFilesystemPolicy` | method | senpi `types.ts:431-437`; `git grep -c FilesystemPolicy -- 'packages/*/src/*'` ở omp → 0 dòng khớp | thiết kế lại, không port được nguyên xi (xem 6.2) |
| **S5** | `registerMarkdownTransformer` / `registerEntryRenderer` | method | senpi `types.ts:1813` / `1831`; vắng mặt ở omp | 2 method + hook vào transcript renderer |
| **S6** | `registerReadClassifier` | method | senpi `types.ts:2076` | chỉ cho `cache-keepalive` (483 dòng) |
| **S7** | `registerLazyToolActivator` + `registerRemovedToolHint` | method | senpi `types.ts:2003-2013` | chỉ cho `tool-search` (1.213 dòng) |
| **S8** | 4 hook ctx.ui | context field | `setWorkingVisible`, `setWorkingIndicator`, `setHiddenThinkingLabel`, `getEditorComponent` | 4 dòng trên `ExtensionUIContext` |
| **S9** | `registerMcpServer` | method | omp đã có `src/mcp/` + `mcp_notification` | thấp, gần như bỏ |
| **S10** | `setSessionModel` / `setSessionThinkingLevel` / `setSessionFastMode` | method | senpi `types.ts:2163-2176` | phân biệt session-scoped vs persisted; omp `setThinkingLevel(level, persist?)` đã gần nửa việc |

### 6.2 Cảnh báo: S4 không port được nguyên xi

senpi dùng **2 cơ chế approval không tương thích nhau**:

- senpi: `registerFilesystemPolicy` — `FilesystemOperation = "read" | "enumerate" | "write"` (`types.ts:413`), trả `{allow:true} | {allow:false, reason}`.
- omp: `registerFileWriteFallback` (`types.ts:1379`) + `tools/approval.ts` (387 dòng) + `tools/file-write-fallback.ts` (467 dòng).

Kiểm lại trước khi kết luận: `git grep -c FilesystemPolicy -- 'packages/*/src/*'` trong omp cho **0 dòng khớp** — không phải "0 trong types.ts" mà là **0 cả package**. Đây là khác biệt kiến trúc thật, không phải khác tên.

Cùng mục đích, khác kiến trúc. `permission-system` của senpi nặng 1.638 dòng — thứ ba trong bảng. **Đây là builtin duy nhất tôi khuyên viết lại theo omp thay vì port.**

### 6.3 Cái mất nếu port sai

Nếu ai đó viết lại `runner.ts`/`types.ts` của omp theo bản senpi, 20 hook chỉ-omp bị mất: `auto_retry_start/end`, `retry_fallback_applied/succeeded`, `tool_approval_requested/resolved`, `before_subagent_spawn`, `goal_updated`, `todo_reminder`, `ttsr_triggered`, `credential_disabled`, `mcp_notification`, `session_switch`/`session_before_branch`/`session_branch`/`session_stop`/`session.compacting`. Đó là phần omp đã đi trước.

**Quy tắc cho M5: chỉ BỔ SUNG event còn thiếu vào `types.ts`/`runner.ts` của omp. Không thay thế.**

### 6.4 Điều KHÔNG cần làm trước

- Không cần dựng loader — omp đã có, cùng quy tắc, còn đọc cả manifest `pi`.
- Không cần hợp đồng version — không ai có.
- Không cần `notice/` — chỉ 85 dòng, `NoticeSpec`/`NoticeTone` (`notice/spec.ts`), là widget 4 dòng text. Copy nguyên văn.
- Không cần động tới `capability/extension.ts` — đó là tầng discovery, không phải thứ cần mở rộng.

---

## 7. Ba điều chỉnh nền tảng — đã kiểm lại, cả 3 vẫn đúng

```bash
git -C /Users/tranquangdang21/Projects/pi-ref ls-files | grep -ic mcp
# 0   → pi không có MCP, giữ nguyên

# 0 file .ts trong extensions/ của senpi import "chord"
cd /Users/tranquangdang21/Projects/senpi-ref
git ls-files 'packages/coding-agent/src/core/extensions/*' | grep '\.ts$' | xargs git grep -l "chord"
# (rỗng)
git grep -n "chord" -- 'packages/coding-agent/src/core/extensions/*'
# packages/coding-agent/src/core/extensions/builtin/changes.md:1127
```

Về `chord`: lệnh rộng có **đúng 1 dòng khớp**, nhưng nằm trong `changes.md` và là chữ "chord" nghĩa bàn phím — `the ctrl+s chord collided with app.session.toggleSort`. Không phải package `chord`. Phép đúng phải lọc `.ts`. Khẳng định "chord không phải cơ chế vòng đời extension" **giữ nguyên**.

```bash
git -C /Users/tranquangdang21/Projects/ultraworkers grep -n "parseJsonlLenient" -- 'packages/utils/src/*'
# packages/utils/src/stream.ts:575
```

Về JSONL: điều chỉnh này **không liên quan** M5-extension, nhưng vẫn phải nhớ khi port code session. `pi` ném `JsonlCorruptionError` không có try/catch; omp đếm `malformedRecords` rồi `#rewriteRequired`. Chép nguyên xi session layer của `pi` làm chật hơn. Không đề xuất.

---

## 8. Tóm tắt cho người đọc lại sau 6 tháng

1. **omp đã có hệ thống extension.** 5.337 dòng, 46 hook, 29 method API. Cùng kiến trúc senpi. Đừng viết lại plan M5 như thể chưa có gì.
2. **Phần thiếu đo được, không đoán:** 18 event + 11 method. Trong 18 event, 7 cái không builtin nào dùng.
3. **Nút thắt là `model_select`** (16 builtin), không phải loader.
4. **`registerFilesystemPolicy` không port được** — omp đã có kiến trúc approval khác, tốt hơn. Viết lại `permission-system`.
5. **Không có API version ở cả hai.** Không có negotiation, không có cảnh báo phá vỡ. Extension gắn chặt build.
6. **Cấm thay thế `types.ts`/`runner.ts` của omp.** 20 hook chỉ-omp là tài sản, mất thì mất.
7. **omp đọc manifest `pi` và `omp` cùng lúc** (`directory-resolution.ts:69`) — thử port senpi extension nguyên bản được, miễn là compile.

Lệnh tự chạy lại toàn bộ phép đo trong file này nằm cạnh từng bảng. Hai chỗ cần chú ý khi đo lại: `git ls-files` glob `*` xuyên qua `/` (dễ đếm đội lên ~3.266 dòng), và regex trích method phải có `[(<]` chứ không chỉ `[(]` (dễ rơi 3 method generic).
