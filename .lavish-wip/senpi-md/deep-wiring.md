# HA ĐƯỜNG DÂY: seam nào phải mở trước khi port 40 builtin của senpi

> Nghiên cứu M5, vòng sửa. Viết **2026-09-28**.
> Mọi khẳng định kèm **lệnh đã chạy + đường dẫn + số dòng**. Khẳng định nào không đo được thì ghi rõ "chưa đo".
>
> **Cây đo:**
> ```bash
> S=/Users/tranquangdang21/Projects/senpi-ref      # code-yeongyu/senpi
> O=/Users/tranquangdang21/Projects/ultraworkers  # omp, branch milestone-1
> ```
>
> **Đã đọc trước khi viết (đúng 2 file, theo chỉ định):** `ext-api.md` (471 dòng, đọc hết bằng `sed -n '1,240p'` + `'240,471p'`) · `deep-risk.md` (978 dòng, đọc `1-33`, `96-222`, `749-866` bằng `sed -n`; dùng `grep -nE '^#{1,3} '` để lấy mục lục trước).
>
> **Bối cảnh đã nhận, không lặp lại:** gajae là fork dòng omp/pi · pi không có MCP/ACP · `chord` không phải cơ chế vòng đời extension · omp tự lành JSONL hỏng (`packages/utils/src/stream.ts:575` `parseJsonlLenient`) còn pi thì ném `JsonlCorruptionError` (`durable/src/storage/jsonl/storage.ts:119`).

---

## 0. TL;DR — đọc 4 câu này là đủ để quyết định thứ tự làm

1. **omp ĐÃ CÓ hệ thống extension thật.** Tôi tự đo lại, không dựa vào vòng trước: **46 event** trong `packages/coding-agent/src/extensibility/extensions/types.ts`. Hạ tầng 5.337 dòng / 11 file. M5 **không phải** dựng hạ tầng.

2. **24 trên 40 builtin bị chặn bởi event thiếu. 13 builtin chạy được ngay, không cần seam nào.** (Đo bằng `awk` join, phần 5.) Đây là con số trung tâm của cả bài.

3. **Nút thắt là `model_select`: 16 chỗ gọi `pi.on("model_select")` trong 15 thư mục.** Mở nó một mẩu là gỡ 15/40 builtin. Nhưng **cái rẻ nhất lại là `agent_settled`** (10 dòng, 2 file) — vì nó **không có payload**, và omp đã có sẵn đúng ngữ nghĩa "đã ngả" qua cờ `isTerminal` ở `modes/rpc/rpc-session-settle.ts:59`. Còn **cái thật sự đáng tiền không phải `model_select`** mà là `setActiveTools`/`setModel` (20 + 3 file), vì đó mới là chỗ builtin **ra lệnh** chứ không phải chờ tin.

4. **`executeTool` là method bịa ra trong `ext-api.md` và `deep-risk.md` — 603 file builtin, 0 file dùng.** Tương tự `registerFilesystemPolicy`, `registerMarkdownTransformer`, `registerMcpServer`, `registerReadClassifier`, `registerRemovedToolHint`, và cả 4 method `ctx.ui` thiếu: **0 sử dụng**. **10/15 thứ omp thiếu không gỡ được builtin nào.** Mở chúng là tự làm rối `types.ts` mà không nhận về gì.

---

## 1. omp có hệ thống extension thật không — tôi tự đo lại

Câu hỏi này vòng trước đã trả lời, nhưng toàn bộ bài này đứng trên nó nên tôi kiểm lại bằng lệnh của chính tôi, không cite.

```bash
cd $O
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE 'event: "[a-z_.]+"' | sed 's/event: "//;s/"//' | sort -u > /tmp/omp_ev.txt
wc -l < /tmp/omp_ev.txt
# 46
grep -n 'model_select' packages/coding-agent/src/extensibility/extensions/types.ts
# (rỗng) — xác nhận event này thật sự vắng, không phải lỗi regex
```

46 event, `model_select` vắng mặt thật. Danh sách đầy đủ (46, xếp):

```
after_provider_response  agent_end  agent_start  auto_compaction_end  auto_compaction_start
auto_retry_end  auto_retry_start  before_agent_start  before_provider_request  before_subagent_spawn
context  credential_disabled  goal_updated  input  mcp_notification  message_end  message_start
message_update  resources_discover  retry_fallback_applied  retry_fallback_succeeded
session_before_branch  session_before_compact  session_before_switch  session_before_tree
session_branch  session_compact  session_shutdown  session_start  session_stop  session_switch
session_tree  session.compacting  todo_reminder  tool_approval_requested  tool_approval_resolved
tool_call  tool_execution_end  tool_execution_start  tool_execution_update  tool_result
ttsr_triggered  turn_end  turn_start  user_bash  user_python
```

**Cấu trúc emit của omp** (quan trọng cho phép đo công, mục 3):

```bash
cd $O
grep -nE '(private|async|#)?\s*(emit|fire|dispatch)[A-Za-z]*\s*[<(]' \
  packages/coding-agent/src/extensibility/extensions/runner.ts | head -60
```

Kết quả then chốt — omp chia emit làm **hai loại**:

| loại | chỗ | danh sách |
|---|---|---|
| `emit<TEvent extends RunnerEmitEvent>(event)` — generic, phần lớn event | `runner.ts:1464` | mọi event không có kết quả trả về |
| `emitXxx()` riêng — event có kết quả / cần `await` | `runner.ts:1528` trở đi | `emitToolResult` `emitToolCall` `emitUserBash` `emitUserPython` `emitResourcesDiscover` `emitInput` `emitContext` `emitBeforeProviderRequest` `emitAfterProviderResponse` `emitBeforeAgentStart` `emitBeforeSubagentSpawn` `emitSessionStop` `emitCredentialDisabled` `emitMcpNotification` |

Và có một ràng buộc mà `ext-api.md` **không nhắc**, đây là chi phí thật khi thêm event:

```bash
grep -rn 'type RunnerEmitEvent\|type RunnerEmitResult' packages/coding-agent/src/extensibility/extensions/*.ts
# runner.ts:347:  type RunnerEmitEvent = Exclude<
# runner.ts:371:  type RunnerEmitResult<TEvent extends RunnerEmitEvent> = TEvent extends { type: "session_before_switch" }
```

`RunnerEmitEvent` là một `Exclude<>` của `ExtensionEvent` trừ vài event đặc biệt; `RunnerEmitResult` là một conditional-type map. **Thêm 1 event = phải chạm cả hai bảng này**, không chỉ `on()` overload. `ext-api.md` §2.3 mô tả bất biến 3 bước của senpi (`*Event` → overload `pi.on` → hàm emit); ở omp là **5 bước** (xem mục 3).

---

## 2. Cái omp thiếu, đo bằng gì

### 2.1 Event — 11 thiếu, 37 chỗ gọi

Đo bằng hai lệnh, không suy diễn:

```bash
cd $S
B=packages/coding-agent/src/core/extensions/builtin
git ls-files "$B/*" | grep '\.ts$' > /tmp/builtin_ts.txt      # 603 file
xargs grep -hoE '\bpi\.on\("[a-z_.]+"' < /tmp/builtin_ts.txt \
  | sed 's/pi.on("//;s/"//' | sort | uniq -c | sort -rn
```

> **Cảnh báo phép đo — tôi đã dính lỗi này một lần, ghi lại để người sau không dính nữa.** Lần đầu tôi chạy `for e in $ev` để so event với `/tmp/omp_ev.txt`. **Shell ở đây là zsh, zsh KHÔNG tách từ khi mở rộng biến không nhắc** (khác bash). Vòng lặp chạy **đúng một lần** với `e` = cả chuỗi nhiều dòng, `grep -x` khớp rỗng, kết quả là **"0/40 builtin cần seam"** — sai hoàn toàn. Sửa bằng cách **join bằng `awk`**, không dùng vòng lặp shell. Kết quả đúng ở mục 5.

| event thiếu ở omp | số chỗ gọi `pi.on()` | thư mục builtin dùng |
|---|---:|---|
| **`model_select`** | **16** | anthropic-subscription, anthropic-web-search, ask-user, cache-keepalive, compaction, gpt-apply-patch, look-at, openai-image-gen, openai-web-search, prompt-preset, reasoning, recommended-models, terminal, video-in, websearch (+ `service-tier.ts` file trần) |
| `agent_settled` | 6 | goal, config-reload, herdr, loop, loop-guard, ttsr |
| `session_abort` | 4 | goal, loop, todotools, ttsr |
| `session_parked` | 2 | cache-keepalive, terminal |
| `session_resumed` | 2 | cache-keepalive, terminal |
| `session_extensions_removed` | 2 | anthropic-subscription, cursor-cli-oauth |
| `thinking_level_select` | 1 | reasoning, recommended-models, `service-tier.ts` |
| `session_info_changed` | 1 | herdr |
| `session_before_fork` | 1 | btw |
| `project_trust` | 1 | config-reload |
| `input_disposition` | 1 | goal |
| **Tổng** | **37** | **24 thư mục** |

Mốc chéo với `ext-api.md` §2.1: danh sách 18 event senpi-only của vòng trước, trong đó **7 cái 0 builtin dùng** (`ui_prompt_start/end`, `tool_activated`, `system_prompt_change`, `session_compact_failed`, `session_before_reload`, `before_provider_headers`). Bảng trên xác nhận điều đó bằng cách không thấy chúng. ⇒ **11 event là mức cần thật, không phải 18.**

### 2.2 Method — 11 thiếu, nhưng chỉ 5 được builtin dùng

```bash
cd $S
for m in executeTool registerEntryRenderer registerFilesystemPolicy registerLazyToolActivator \
         registerMarkdownTransformer registerMcpServer registerReadClassifier registerRemovedToolHint \
         setSessionFastMode setSessionModel setSessionThinkingLevel \
         setWorkingVisible setWorkingIndicator setHiddenThinkingLabel getEditorComponent; do
  n=$(xargs grep -l "\b$m\b" < /tmp/bi_ts.txt 2>/dev/null | wc -l | tr -d ' ')
  printf "%-30s %3s file\n" "$m" "$n"
done
```

| method thiếu ở omp | file builtin dùng | thư mục |
|---|---:|---|
| `registerEntryRenderer` | 5 | cache-keepalive, goal, loop, mcp, rule-activation |
| `setSessionThinkingLevel` | 3 | reasoning, recommended-models, `service-tier.ts` |
| `registerLazyToolActivator` | 3 | gpt-apply-patch, tool-search |
| `setSessionModel` | 2 | recommended-models, `service-tier.ts` |
| `setSessionFastMode` | 1 | `service-tier.ts` |
| `executeTool` | **0** | — |
| `registerFilesystemPolicy` | **0** | — |
| `registerMarkdownTransformer` | **0** | — |
| `registerMcpServer` | **0** | — |
| `registerReadClassifier` | **0** | — |
| `registerRemovedToolHint` | **0** | — |
| `ctx.ui.setWorkingVisible` | **0** | — |
| `ctx.ui.setWorkingIndicator` | **0** | — |
| `ctx.ui.setHiddenThinkingLabel` | **0** | — |
| `ctx.ui.getEditorComponent` | **0** | — |

**Kết luận mục 2.2 — sửa trực tiếp `ext-api.md` §6.1.** Vòng trước xếp `executeTool` là seam S3, `registerMarkdownTransformer`/`registerEntryRenderer` là S5, `registerReadClassifier` là S6, `registerRemovedToolHint` là S7. Trong 4 seam đó, **2 cái (`registerEntryRenderer`, `registerLazyToolActivator`) có builtin dùng thật; 3 cái còn lại không builtin nào chạm** (`executeTool`, `registerReadClassifier`, `registerRemovedToolHint`, `registerMarkdownTransformer`). Xếp hạng S3/S5/S6/S7 của vòng trước **thổi phồng công**.

---

## 3. Từng seam: mở được không, vỡ gì, tốn gì

Bối cảnh chung trước khi vào từng cái: **không có hợp đồng phiên bản ở cả hai bên** (`ext-api.md` §5, đo bằng `grep -rniE 'apiVersion|extensionVersion|EXTENSION_API'` → 0 dòng ở senpi, 0 ở omp). Nghĩa là **không có negotiation để hỏng êm** — mọi sai lệch lộ lúc `bun check`. Đây là tin tốt và là lý do dưới đây mọi phép đo "vỡ hợp đồng" đều là vỡ **lúc compile**, không phải vỡ lúc chạy.

### S1 — `model_select` (16 chỗ gọi, 15 thư mục)

- **Mở được KHÔNG sửa hành vi đang chạy?** **CÓ** — vì điểm móc tồn tại sẵn và là hàm, không phải nhánh rẽ:
  ```bash
  cd $O
  grep -rn 'async setModel' packages/coding-agent/src --include='*.ts'
  # session/model-controls.ts:218   ← setModel(model, role, {selector, thinkingLevel, persist})
  # session/model-controls.ts:267   ← setModelTemporary(model, thinkingLevel, {ephemeral})
  # session/agent-session.ts:8941   ← setModel
  ```
  8+ call site (`selector-controller.ts:813,911`, `rpc-mode.ts:1435`, `acp-agent.ts:1819,2593`, `setup.ts:123`, `extension-ui-controller.ts:209,441`, `builtin-modes.ts:382`) **đều đi qua 2 hàm này**. Thêm emit bên trong `model-controls.ts:218` phủ 1 lần cho tất cả. **Hành vi không đổi khi chưa có extension nào đăng ký** — generic `emit` với 0 handler là no-op.
- **Hợp đồng vỡ nếu mở sai:** `model_select` trả `ModelSelectEventResult`. Nếu cho phép extension **trả model khác** thì phá vỡ `setModel`'s `Promise<{switched: boolean}>` mà 8 call site đang đọc (`selector-controller.ts:813` phân nhánh `if (switched)`). Cụ thể: `model-controls.ts:218` **throw** `new Error("No API key for ...")` khi thiếu credential. Nếu emit chạy **trước** check credential thì extension nhận model chưa hợp lệ và có thể trả lại model thiếu key ⇒ lỗi đổi thông điệp. **Phải emit sau `hasConfiguredAuth`, trước khi ghi log/session.**
- **Cỡ công:** 5 bước bắt buộc — (1) type `ModelSelectEvent` + `ModelSelectEventResult` ở `types.ts` (~15 dòng), (2) thêm vào `ExtensionEvent` union, (3) overload `on()` (~2 dòng), (4) thêm vào `RunnerEmitEvent`/`RunnerEmitResult` (`runner.ts:347,371`, ~4 dòng), (5) `emitModelSelect()` + gọi trong `model-controls.ts` (~20 dòng). **≈45 dòng, 3 file.**

### S2 — `agent_settled` (6 chỗ gọi) — **đã đo, hoá ra rẻ nhất mục 3**

Vòng soạn đầu tôi ghi "chưa đo được định nghĩa". Đo xong thay đổi cả xếp hạng:

```bash
cd $S
awk '/interface AgentSettledEvent/,/^}/' packages/coding-agent/src/core/extensions/types.ts
# export interface AgentSettledEvent {
# 	type: "agent_settled";
# }                          ← KHÔNG có payload

grep -rn 'agent_settled' packages/coding-agent/src --include='*.ts' | grep -v builtin
# core/agent-session.ts:1952:  await this._extensionRunner.emit({ type: "agent_settled" });
# core/agent-session.ts:1953:  this._emit({ type: "agent_settled" });   ← đẩy tiếp ra wire
# types.ts:1973:  on(event: "agent_settled", handler: ExtensionHandler<AgentSettledEvent>): void;
```

Ba phát hiện làm đổi bài toán:

1. **Không có payload** ⇒ **không cần `*EventResult`**, không cần plumbing dữ liệu. Chỉ cần type + overload + emit. Đây là event **rẻ nhất** trong 11 cái, không phải đắt nhất như tôi đoán.
2. **senpi phát nó ở `agent-session.ts:1952` rồi đẩy ngay ra wire `:1953`** — tức nó vừa là extension signal vừa là wire event, dùng chung một chỗ phát.
3. **Ý nghĩa: "agent đã xong và phiên rảnh"** — `interactive-mode.ts:6547` ghi rõ *"An idle session emits no further `agent_settled`, and that event is the only…"*. Consumer dùng `ctx.isIdle()` (`herdr/index.ts:150`: `active: !ctx.isIdle()`).

- **Mở được không sửa hành vi?** **CÓ, và omp ĐÃ CÓ SẴN đúng khái niệm này — chỉ khác tên.** Không phải tôi suy ra, mà đọc được từ chính tên cờ:
  ```bash
  cd $O
  sed -n '14,17p' packages/coding-agent/src/session/agent-session-events.ts
  # 14: | Exclude<AgentEvent, { type: "agent_end" }>
  # 15: | (Extract<AgentEvent, { type: "agent_end" }> & {
  # 16: /** False when an async delivery will resume the session before its true final settle. */
  # 17: isTerminal?: boolean;
  ```
  Câu doc đó **là định nghĩa `agent_settled`**: `isTerminal: false` ⇔ "còn giao bất đồng bộ sẽ làm phiên chạy lại" ⇔ **chưa settle**; `isTerminal !== false` ⇔ **đã settle thật**. senpi gọi nó `agent_settled` và phát ở `core/agent-session.ts:1952`; omp gọi nó `isTerminal` và định nghĩa ở `session/agent-session-events.ts` — **file này chỉ 83 dòng và nằm ở tầng session, nên một chỗ sửa là phủ hết mọi mode** (interactive, rpc, acp, print), không phải từng mode một.
  Cơ chế tiêu thụ đã có sẵn: `modes/rpc/rpc-session-settle.ts:59` (`event.type === "agent_end" && event.isTerminal !== false → void this.check()`) và `ctx.isIdle()` đã có ở `types.ts:478` + `types.ts:1770`.
- **Hợp đồng vỡ nếu mở sai:** đây là chỗ **dễ phá nhất về ngữ nghĩa, không phải về code** — và giờ đã có sẵn đường để làm đúng. Phát `agent_settled` mỗi lần `agent_end` kể cả `isTerminal === false` ⇒ `loop` gọi `settleAttributedTick("completed")` (`loop/index.ts:814-815`) **trước khi lượt thật xong**, `ttsr` reset `pendingNudge` (`ttsr/index.ts:267-270`) **mất cảnh báo**, `loop-guard` clear `pendingRecoveryToolName` (`loop-guard/index.ts:136-139`) **mất chặn vòng lặp**. Cả ba hỏng **âm thầm, không throw**. Quy tắc: **chỉ phát khi `isTerminal !== false`.**
- **Cỡ công:** type 3 dòng + overload 1 dòng + emit ~5 dòng = **≈10 dòng, 2 file** (`extensions/types.ts` + `session/agent-session-events.ts`). Rẻ nhất bảng. **Lên bước 1.**

### S3 — `session_abort` (4 chỗ gọi)

- **Mở được không sửa hành vi?** **CÓ.** Nhưng phải xác nhận omp đã có đường abort nào để gắn. **Chưa đo** (`grep 'abort' ` trong `session/` chưa chạy trong bài này).
- **Vỡ gì:** omp đã có `ctx.abort` trong `ExtensionContext` (`ext-api.md` §3.3) và 20 hook chỉ-omp. Nếu `session_abort` được emit **mỗi lần** abort thay vì **mỗi lần session kết thúc**, `goal`/`ttsr`/`loop` sẽ tưởng session đã xong → dừng vòng lặp giữa chừng. **Đây là seam dễ phá âm thầm nhất trong 11 cái.**
- **Cỡ công:** ≈40 dòng, 3 file.

### S4 — `session_parked` / `session_resumed` (2 + 2 chỗ gọi)

- **Mở được không sửa hành vi?** **CÓ, có điều kiện.** "Parked" là khái niệm omp **đã có sẵn** — `session_parked`/`session_resumed` thuộc nhóm "session lifecycle" mà `ext-api.md` §2.1 xếp cùng nhóm với `session_stop`/`session_switch` mà omp đã có. Nhưng tôi **chưa đo** xem state machine park của omp có điểm móc emit sạch không.
- **Vỡ gì:** chỉ 2 builtin dùng (`cache-keepalive`, `terminal`) — cả hai đều **không nên lấy** (100% và 57% cắm core, `deep-risk.md` §2.1/§6.2). ⇒ **seam này gỡ 0 builtin mà M5 thực sự định lấy.** Đề xuất: **không mở.**
- **Cỡ công:** ≈80 dòng (2 event), 3 file — **bỏ được.**

### S5 — `session_extensions_removed` (2 chỗ gọi)

- **Mở được không sửa hành vi?** **CÓ.** Nhưng xem S4: hai builtin dùng nó là `anthropic-subscription` và `cursor-cli-oauth` — **cả hai đều nằm trong danh sách "không lấy"** của `deep-risk.md` §6.2 (92% và 76% cắm core, SDK ngoài, tranh OAuth với `crates/pi-natives/src/oauth_callback/`).
- **Vỡ gì:** phát `session_extensions_removed` khi `disconnectExtension` chạy trong lúc một extension khác đang giữ tài nguyên ⇒ thu hồi tài nguyên hai lần.
- **Cỡ công:** ≈40 dòng, 3 file. **Gỡ 0 builtin có giá trị. Không mở.**

### S6 — 5 event, mỗi cái 1 chỗ gọi (`thinking_level_select`, `session_info_changed`, `session_before_fork`, `project_trust`, `input_disposition`)

- **Mở được không sửa hành vi?** **CÓ** cho cả 5, cùng lập luận S1.
- **Vỡ gì:** mỗi cái 1 người dùng nên động vào sai rất dễ mà không ai thấy. Đáng chú ý: **`project_trust` chỉ `config-reload` dùng — mà `config-reload` đã bị `deep-risk.md` §6.2 loại** (91% cắm core, tự thú 11/12 lần "làm bằng extension không được"). **Mở `project_trust` là công cộng 0.**
- **Cỡ công:** 5 cái × ≈40 dòng = **200 dòng, 3 file** — lớn hơn S1+S2 cộng lại mà gỡ ít hơn nhiều.

### S7 — `registerEntryRenderer` (5 file, 5 thư mục)

- **Mở được không sửa hành vi?** **CÓ, và đây là seam "rẻ nhất đắng nhất" của bài.** Nó chỉ đăng ký *renderer*, không tham gia luồng quyết định. Extension không đăng ký ⇒ transcript render y hệt.
- **Vỡ gì:** ô `registerEntryRenderer` cho phép một extension ghi đè cách vẽ entry của extension khác. Nếu cho đăng ký theo **id extension** thì an toàn; nếu cho theo **loại entry** thì extension A vẽ đè extension B mà không có cảnh báo. Chọn khoá = id.
- **Cỡ công:** 1 method + 1 bảng tra trong `transcript renderer` — **chưa đo vị trí chính xác**; ước 30 dòng, 2 file.

### S8 — `registerLazyToolActivator` + `registerRemovedToolHint` (3 file / 2 thư mục)

- **Mở được không sửa hành vi?** `registerLazyToolActivator`: **CÓ** — chỉ ảnh hưởng tool *đang được lọc khỏi context*, mặc định tắt. `registerRemovedToolHint`: **vô nghĩa để mở, 0 builtin dùng.**
- **Vỡ gì:** activator quyết định tool nào lộ cho model. Nếu activator trả tool lỗi, model thấy tool nhưng gọi luôn lỗi ⇒ vòng lặp gọi lại. Đây là đường đi vào đúng cái `deep-risk.md` gọi là *"rủi ro đốt tiền"*.
- **Cỡ công:** `registerLazyToolActivator` ≈40 dòng, 2 file — phủ `gpt-apply-patch` + `tool-search`. Cả hai đều **không lấy** (`deep-risk.md` §6.2, §8.2 hạng 6). **Gỡ 0 builtin có giá trị. Không mở.**

### S9 — `setSessionModel` / `setSessionFastMode` / `setSessionThinkingLevel` (6 chỗ gọi, 3 file, **1 file trần**)

- **Mở được không sửa hành vi?** **CÓ, phần lớn** — omp đã có `setThinkingLevel(level, persist?)` (`ext-api.md` §6.1 S10 nói "đã gần nửa viện"). Nhưng **phân biệt session-scoped vs persisted** là hợp đồng thật: `model-controls.ts:218` nhận `options.persist`, `setModelTemporary` (`:267`) **cố ý không ghi settings**. Thêm 3 method mà không giữ ranh giới này là cho extension ghi đè lên settings người dùng.
- **Vỡ gì:** đây là seam **phá nhiều nhất** nếu mở sai — `service-tier.ts` khai báo `setSessionFastMode` như **interface cục bộ ở dòng 109** (`deep-risk.md` §2.2 B3), tức tác giả tự định nghĩa hợp đồng với core. Port nguyên xi sẽ mang cả interface cục bộ đó vào omp, tạo **hai nguồn sự thật** cho cùng một khái niệm.
- **Cỡ công:** 3 method + plumbing xuống `model-controls.ts` = **≈60 dòng, 3 file.**

### S10 — 4 method `ctx.ui` + 6 method `executeTool`/`registerFilesystemPolicy`/`registerMarkdownTransformer`/`registerMcpServer`/`registerReadClassifier`/`registerRemovedToolHint`

- **Mở được không sửa hành vi?** Về kỹ thuật **CÓ** cho cả 10. Về giá trị: **0 builtin nào dùng bất kỳ cái nào** (bảng §2.2). `registerMcpServer` đặc biệt đáng bỏ — omp đã có `src/mcp/` nguyên bản, thiếu đúng *cú pháp đăng ký*, không thiếu *tính năng*.
- **Vỡ gì:** `registerFilesystemPolicy` là cái **nguy hiểm nhất trong 10** nếu mở. Nó là một `register*` thứ hai cạnh tranh quyền quyết định phê duyệt với `registerFileWriteFallback` + `tools/approval.ts` (387 dòng) + `tools/file-write-fallback.ts` (467 dòng) **đã chạy**. Hai đường phê duyệt cùng sống = một trong hai bị bỏ qua. Đây là hợp đồng **đang chạy**, không phải hợp đồng tương lai.
- **Cỡ công:** **không mở.** Đề xuất ghi vào `types.ts` là **comment chặn** thay vì method.

### 3.11 Bảng tổng công

| seam | loại | mở không sửa hành vi | vỡ gì nếu sai | công |
|---|---|---|---|---|
| **S2 `agent_settled`** | event | **CÓ** — omp đã có ngữ nghĩa "đã ngả" qua cờ `isTerminal` | phát mỗi `agent_end` kể cả non-terminal ⇒ `loop` chốt sớm, `ttsr` mất cảnh báo, `loop-guard` mất chặn vòng lặp. **Ba lỗi âm thầm, không throw** | **10 d/2 f** |
| S7 `registerEntryRenderer` | method | **CÓ** | khoá theo loại entry thay vì theo id → vẽ đè extension khác | 30 d/2 f |
| S1 `model_select` | event | **CÓ** | `setModel` trả `{switched}` cho 8 call site; emit sai chỗ → lỗi credential đổi thông điệp | 45 d/3 f |
| S9 3 method `setSession*` | method | CÓ (có điều kiện) | mất ranh giới session-scoped vs persisted; mang cả interface cục bộ của `service-tier.ts` | 60 d/3 f |
| S3 `session_abort` | event | CÓ | nhầm "abort" với "session xong" → dừng vòng lặp giữa chừng | 40 d/3 f |
| S4 `session_parked`/`resumed` | event | CÓ | thu hồi tài nguyên hai lần | 80 d/3 f — **không mở** |
| S5 `session_extensions_removed` | event | CÓ | như trên | 40 d/3 f — **không mở** |
| S6 5 event × 1 chỗ | event | CÓ | 5 vết thay đổi, 5 builtin, không ai thấy | 200 d/3 f — **để cuối** |
| S8 activator + hint | method | CÓ | tool lộ cho model nhưng gọi lỗi → gọi lại vô hạn | 40 d/2 f — **không mở** |
| S10 4 `ctx.ui` + 6 method | method | CÓ | `registerFilesystemPolicy` cạnh tranh `approval.ts` **đang chạy** | **không mở** |

**Tổng phải mở: 5 seam, ~185 dòng, 3 file.** Đối chiếu: 40 builtin / 97.893 dòng. Tỉ lệ tốt — **nhưng chỉ khi bỏ 5 seam cuối.**

---

## 4. Phân loại builtin theo cách gắn

### 4.1 Qua hook

**23 thư mục** cần event nhưng nếu mở event là chạy: 15 (vì `model_select`) + `agent_settled` phủ thêm 6 + `session_abort` phủ 4 + 5 cái 1-chỗ + `session_parked/resumed` + `session_extensions_removed`. Trong đó **giá trị thật** theo hạng `deep-risk.md` §8.2:

| builtin | event chặn | Lõi hay hook? |
|---|---|---|
| `ask-user` | `model_select` | hook + 1 tool |
| `look-at` | `model_select` | hook + 1 tool (model thị giác — lỗ hổng thật của omp) |
| `video-in` | `model_select` | hook + 1 tool |
| `websearch` | `model_select` | hook + 1 tool |
| `reasoning` | `model_select` | hook |
| `recommended-models` | `model_select` | hook |
| `todotools` | `session_abort` | hook + 1 tool |
| `loop-guard` | `agent_settled` | hook |

### 4.2 Thêm tool mới

**13 thư mục đăng ký tool** — đo bằng `xargs grep -l '\bregisterTool\b'` trên từng thư mục:

| mức | builtin | file dùng `registerTool` |
|---|---|---:|
| **lớn** | `mcp` | 9 |
| **vừa** | `gpt-apply-patch` | 2 |
| **một tool** | ask-user, goal, imagegen, look-at, loop, terminal, todotools, tool-search, video-in, webfetch, websearch | 1 mỗi cái |

Tổng **22 file** — khớp `deep-risk.md` §2.2 B2 (`registerTool 22 file`).

**`registerTool` đã có sẵn trong omp — tôi đã grep trực tiếp, không suy từ "không nằm trong 11 method thiếu":**

```bash
cd $O
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -nE 'registerTool|registerCommand|registerMessageRenderer'
#  92: registerTool<TParams extends TSchema = TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, TDetails>): void;
# 156: registerCommand(
# 195: registerMessageRenderer<T = unknown>(customType: string, renderer: MessageRenderer<T>): void;
```

(số dòng ở đây là **tương đối trong khối 1256-1590**; quy đổi `= 1255 + n` cho tuyệt đối: `registerTool` ở `types.ts:1347`, `registerCommand` ở `:1411`, `registerMessageRenderer` ở `:1450`.)

⇒ **13 thư mục trong bảng này không cần seam method nào, chỉ cần event.**

### 4.3 ⚠️ CẮM THẲNG VÀO CORE — đáng giá nhất VÀ nguy hiểm nhất

Đây là loại tách riêng, vì nó **không chờ seam nào cả**: cho mở hết 5 seam ở mục 3, 7 builtin dưới đây vẫn không chạy được.

Bằng chứng cứng nhất (`deep-risk.md` §2.2 B1 — 10 path lõi mà `changes.md` trong cây builtin nhắc tới, **tất cả đều tồn tại**):

| path lõi bị đào | ảnh hưởng |
|---|---|
| `packages/ai/src/utils/tool-pair-repair.ts` | `tool-pair-guard` vá ở tầng provider, omp không có |
| `packages/ai/src/api/transform-messages.ts` + `packages/agent/src/agent-loop.ts` | `compaction` |
| `packages/ai/src/utils/prompt-cache-ttl.ts` | `cache-keepalive` |
| `packages/ai/src/providers/cursor.ts` | `cursor-cli-oauth` |
| `packages/pty/src/registry-session.ts` | `terminal` |
| `packages/senpi-codemode/src/prompt/eval-prompt.ts` | eval routing |
| `src/config.ts` · `src/capability/rule.ts` · `src/core/messages.ts` | `config-reload` |

**Bốn dấu hiệu cắm thẳng, tự kiểm chứng bằng code chứ không tin tự thú:**

1. **Lệnh trực tiếp, không phải hook** (`deep-risk.md` §2.2 B2): `setActiveTools` **20 file** — tự quyết tool nào lộ cho model; `setModel` **3 file**. Đây là thứ đắt nhất về mặt kiến trúc: hook là *nhận tin*, lệnh là *ra lệnh*.
2. **Tự định nghĩa hợp đồng với core** (B3): `service-tier.ts:108-109` khai `setSessionFastMode` như interface cục bộ.
3. **Ép kiểu / monkey-patch** (B4): 6 file — `anthropic-subscription/auth-lane.ts`, `compaction/deterministic-fallback.ts`, `compaction/openai-remote.ts`, `cursor-cli-oauth/settings.ts`, `gpt-apply-patch/tool.ts`, `hooks/tool-adapter.ts`.
4. **Đọc config lõi / env để điều khiển** (B5/B6): `config-reload/index.ts:48` khai `CONFIG_FILE_NAMES = ["settings.jsonc","settings.json","models.json","keybindings.json"]` — theo dõi 4 file cấu hình cốt lõi; `goal/persistence.ts:83` đọc `process.env.PI_CODING_AGENT_DIR`.

**Xếp theo cả hai chiều — giá trị × nguy hiểm:**

| builtin | dòng | tự thú cắm core | đào file lõi | giá trị nếu có | **Mở seam có đủ không?** |
|---|---:|---:|---|---|---|
| `cache-keepalive` | 483 | **100%** | `packages/ai/…/prompt-cache-ttl.ts` | **mất tiền thật mỗi lượt** (giữ prompt cache ấm) | **KHÔNG.** Chỉ cần `model_select` + `registerEntryRenderer` là chạy được giả, nhưng **phần warm-cache đào vào `packages/ai` — phải viết lại** |
| `terminal` | 6.962 | 57% | `packages/pty/src/registry-session.ts` | terminal bền vững nhiều phiên | **KHÔNG.** omp đã có `pty.rs` (1.127 d) + `vterm` (1.067 d) |
| `compaction` | 8.779 | 40% | `transform-messages.ts` + `agent-loop.ts` | lớn nhất | **KHÔNG.** omp có `snapcompact`; senpi chọn prompt **theo provider** (vi phạm class-vs-provider) |
| `config-reload` | 2.317 | **91%** | `src/config.ts` | tiện | **KHÔNG** — và còn cần `project_trust` |
| `cursor-cli-oauth` | 5.186 | **92%** | `providers/cursor.ts` | trùng provider đã có | **KHÔNG** |
| `anthropic-subscription` | 7.281 | 76% + SDK | — | lớn | **KHÔNG** — SDK không có trong `bun.lock` |
| `herdr` | 418 | **100%** | hạ tầng pane ngoài | nhỏ | **KHÔNG** |
| `mcp` | 9.327 | 33% | — | omp đã có `src/mcp/` | **KHÔNG** (và cần `registerEntryRenderer`) |

**Kết luận 4.3, bằng một câu:** *cắm thẳng vào core là loại **đáng giá nhất** (giữ prompt cache ấm, terminal nhiều phiên, compaction) **và nguy hiểm nhất** (đào vào `packages/ai` và `packages/agent` — hai tầng mà cả 40 builtin cùng dùng), và **không builtin nào trong nhóm này được cứu bằng seam*.* Đừng mở thêm seam vì thấy chúng bị chặn — chúng bị chặn vì lý do khác.

*(Phần này kế thừa số đo của `deep-risk.md` §2; tôi không chạy lại từng lệnh đó — giới hạn 60 lệnh của vòng này dành cho phần dây. Ai đọc sau 6 tháng chạy lại §2.2 B1–B6 của `deep-risk.md`.)*

---

## 5. Chạy được NGAY, không cần seam nào

Đo bằng `awk` join (sau khi sửa lỗi zsh ở §2.1):

```bash
cd $S
awk -F'\t' 'NR==FNR{omp[$0]=1;next}
  { if($2 in omp) h[$1]=1; else m[$1]=1 }
  END{ for(d in h) if(!(d in m)) clean[++nc]=d; print "no-missing-event: " nc }' \
  /tmp/omp_ev.txt /tmp/dir_ev.tsv
# 11
```

Phân rã 40 thư mục:

| nhóm | số | thành phần |
|---|---:|---|
| Cần ≥1 event omp chưa có | **24** | 15 vì `model_select`, 6 vì `agent_settled`, 4 vì `session_abort`, còn lại rải |
| Có event, nhưng **không event nào thiếu** | 11 | webfetch, bash-timeout, anthropic-bash, permission-system, rules, mcp, tool-pair-guard, nested-agents-md, tool-search, hooks, imagegen |
| **0 `pi.on()` nào cả** | 5 | account, help, history-search, model-fallback, rule-activation |
| Trừ: cần method omp thiếu | −3 | mcp (`registerEntryRenderer`), tool-search (`registerLazyToolActivator`), rule-activation (`registerEntryRenderer`) |
| **= CHẠY ĐƯỢC NGAY** | **13** | xem dưới |

**13 builtin chạy được với hạ tầng omp hiện tại, sửa 0 dòng omp:**

`account` · `anthropic-bash` · `bash-timeout` · `help` · `history-search` · `hooks` · `imagegen` · `model-fallback` · `nested-agents-md` · `permission-system` · `rules` · `tool-pair-guard` · `webfetch`

**Cửa lòng trước khi tin con số 13** — "không cần seam" ≠ "chép được nguyên xi". Trong 13 cái đó:

- `permission-system` (1.638 dòng) — `deep-risk.md` §6.2/§8.2 hạng 5: **hai kiến trúc approval không tương thích**, phải viết lại theo `approval.ts` của omp. Seam-free, nhưng **không port được**.
- `webfetch` (1.062 dòng) — 70% tự thú cắm core (`deep-risk.md` §2.1).
- `rules` (2.842 dòng) — 50% cắm core.
- `anthropic-bash`, `imagegen` — hợp đồng provider; `deep-risk.md` §8.2 xếp "không lấy lúc này".

⇒ **13 là trần trên của "chạy được"**, và trần đó còn bị giới hạn bởi quy tắc `AGENTS.md`. Con số thực dùng được ngay, tính cả việc phải viết lại: **khoảng 6-8**, theo hạng 1-2 của `deep-risk.md` §8.2 (`btw`, `loop-guard`, `bash-timeout`, `history-search`, `look-at`) — trong đó `btw` và `look-at` **bị `model_select` chặn**, nên **chỉ `loop-guard`, `bash-timeout`, `history-search` là thật sự không cần seam cả lẫn viết lại kiến trúc.**

**Cảnh báo JSONL cho 13 cái này** (`deep-risk.md` §7, tôi đo lại theo từng thư mục):

| builtin | số file chạm session/JSONL |
|---|---:|
| `history-search` | 2 |
| `btw` | 1 |
| `tool-search` | 1 |
| `look-at` | 1 |
| `rules` · `video-in` · `webfetch` · `loop-guard` · `bash-timeout` | 0 |

Không builtin nào nào **ghi** JSONL, nhưng nhiều cái **đọc và phục hồi session**. Khi port, phải đi qua `parseJsonlLenient` của omp — **không** dùng `JSON.parse` trực tiếp.

---

## 6. Thứ tự mở seam

Ràng buộc đo được: `model_select` **phủ 15/24** builtin bị chặn; `agent_settled` phủ 6; `session_abort` phủ 4. Ba cái này **không chặn nhau** (không builtin nào dùng cả hai trừ `goal`, `loop`, `ttsr` — và những cái đó cần cả hai).

```
Bước 0  KHÔNG LÀM GÌ  ── dùng 13 builtin seam-free để dựng đường chạy thật
   │                     (mục 5). Đây là bước DUY NHẤT không tốn công.
   │
   ├─► Bước 1  S2 agent_settled                 (~10 d, 2 file)  ★ RẺ NHẤT
   │           gỡ 6 (goal, config-reload, herdr, loop, loop-guard, ttsr).
   │           Không payload, không cần *EventResult. Điểm móc:
   │           session/agent-session-events.ts:16 (bám cờ isTerminal,
   │           tầng session ⇒ phủ hết mode, không sửa từng mode)
   │           ⚠ dễ sai về NGỮ NGHĨA: phát cả non-terminal là hỏng
   │             loop/ttsr/loop-guard mà không throw
   │
   ├─► Bước 2  S7 registerEntryRenderer          (~30 d, 2 file)
   │           gỡ rule-activation; tiền đề cho mọi renderer sau này.
   │           Không chặn gì, không phụ thuộc bước nào
   │
   ├─► Bước 3  S1 model_select                  (~45 d, 3 file)  ★ NÚT THẮT
   │           gỡ 15 builtin. Điểm móc: session/model-controls.ts:218
   │           ⚠ KHÔNG chặn: cache-keepalive, terminal, compaction, cursor-cli-oauth,
   │             anthropic-subscription (phần cắm core), config-reload, herdr, mcp,
   │             gpt-apply-patch, prompt-preset
   │
   ├─► Bước 4  S3 session_abort                 (~40 d, 3 file)
   │           gỡ 4 (goal, loop, todotools, ttsr).
   │           ⚠ điểm móc trong omp CHƯA ĐO (mục 8) — đo trước khi viết
   │
   └─► Bước 5  S9 3 method setSession*          (~60 d, 3 file)
               gỡ service-tier.ts + recommended-models + reasoning
               ⚠ phải giữ ranh giới session-scoped vs persisted
               KHÔNG mang interface cục bộ của service-tier.ts:109 sang

   ✗ KHÔNG MỞ:  S4, S5, S8, S10   (mục 3.11 — gỡ 0 builtin có giá trị)
   ⏸ ĐỂ CUỐI:    S6 (5 event × 1 chỗ, 200 dòng cho 5 builtin)
```

**Bước nào chặn bước nào — trả lời thẳng câu hỏi đề:** `S2` và `S7` **không chặn gì cả** (độc lập, có thể làm song song, thậm chí trước S1). `S1` **chặn 15 builtin** nhưng **không chặn S2/S7/S9**. `S9` đứng cuối vì nó không gỡ builtin nào chạy được sớm hơn S1 mà lại phải giữ hợp đồng session-scoped/persisted — **rẻ mà dễ làm hỏng thứ khác**. Nói cách khác: **thứ tự ở đây là theo giá trị, không phải vì phụ thuộc kỹ thuật.**

**Quy tắc bất di bất dịch** (`ext-api.md` §6.3, tôi đồng ý nguyên văn): **chỉ BỔ SUNG event còn thiếu vào `types.ts`/`runner.ts` của omp. KHÔNG thay thế.** 20 hook chỉ-omp (`auto_retry_*`, `retry_fallback_*`, `tool_approval_*`, `before_subagent_spawn`, `goal_updated`, `todo_reminder`, `ttsr_triggered`, `credential_disabled`, `mcp_notification`, `session_switch`/`_before_branch`/`session_branch`/`session_stop`/`session.compacting`) là tài sản, mất thì mất.

**Đường vào rẻ nhất để thử trước khi động vào omp:** `directory-resolution.ts:69` đọc `pkg.omp ?? pkg.pi` — extension senpi khai `"pi": { "extensions": [...] }` được omp nạp nguyên bản. Ném thử 3 builtin seam-free vào đó **trước khi viết dòng seam nào**; lỗi biên dịch sẽ chỉ ra chính xác cái thiếu, và không tốn công sửa nếu ta sai.

---

## 7. Sửa các khẳng định của vòng trước

| # | Vòng trước nói | Đo lại | Kết luận |
|---|---|---|---|
| 1 | `ext-api.md` §6.1 S3: `executeTool` là seam, cần 1 method + plumbing | `xargs grep -l '\bexecuteTool\b'` trên 603 file builtin → **0 file**; `sed -n '186,196p' builtin/reasoning/index.ts` cho thấy dòng 192 là `pi.setSessionThinkingLevel(target)` | `deep-risk.md` §2.2 B3 gán `reasoning/index.ts:192` cho `executeTool` là **gán nhầm** — dòng đó khớp vì `setSessionThinkingLevel`. **`executeTool` là method khai trong `types.ts:2122` mà 0 builtin dùng** |
| 2 | `ext-api.md` §6.1 S5/S6/S7: `registerMarkdownTransformer`, `registerReadClassifier`, `registerRemovedToolHint` là seam cần mở | cả 3 → **0 file** | **Xếp hạng thổi phồng công.** Chỉ `registerEntryRenderer` (5) và `registerLazyToolActivator` (3) có người dùng |
| 3 | `ext-api.md` §6.1 S8: 4 method `ctx.ui` thiếu | cả 4 → **0 file** | Bỏ khỏi kế hoạch seam |
| 4 | `ext-api.md` §6.1 xếp `model_select` là "nút thắt số 1" | **đúng về số lượng** (16 chỗ gọi, 15 thư mục — cao nhất) nhưng **sai về tổng giá trị** | `model_select` gỡ 15/40 builtin, nhưng phần lớn 15 cái đó phải viết lại theo `deep-risk.md` §8.2. **Nút thắt _có giá trị_ là `setActiveTools`/`setModel`, không phải `model_select`** |
| 5 | `ext-api.md` §2.1: senpi có 18 event omp thiếu | 11 event được builtin dùng, 37 chỗ gọi | 7 cái còn lại 0 builtin dùng — xác nhận lại, **không cần mở** |
| 6 | `ext-api.md` §6.1 S4: `registerFilesystemPolicy` là "seam thật" | 0 file builtin dùng | Đúng là khác kiến trúc, **nhưng đó là lý do không mở, không phải lý do phải mở** |
| 7 | *(phát hiện mới, không sửa ai)*: `model_select` là nút thắt | `agent_settled` không có payload (`{ type }` trống), omp đã có sẵn `isTerminal` với doc *"true final settle"* | **Xếp hạng sai từ đầu.** `model_select` gỡ nhiều builtin nhất nhưng `agent_settled` **rẻ hơn 4× và là bước 1**. Cần cả hai, theo thứ tự ngược với "gỡ nhiều nhất trước" |

---

## 8. Sai sót đã biết của chính bài này

- **Tôi KHÔNG đọc `types.ts` của senpi (2.732 dòng) và `deep-risk.md` (978 dòng) toàn văn.** `ext-api.md` đọc hết bằng `sed` 2 khúc; `deep-risk.md` đọc `1-33`, `96-222`, `749-866` sau khi lấy mục lục bằng `grep -nE '^#{1,3} '`. **Mục `deep-risk.md` §3–§5 (vi phạm `AGENTS.md`, provider-specific) tôi KHÔNG đọc trực tiếp** — mọi trích dẫn từ §3/§4/§5 trong bài này là **gián tiếp qua `ext-api.md` và §6/§8**, không phải tôi tự kiểm lại.
- **Điểm móc emit cho `session_abort`, `session_parked`, `session_resumed`, `session_info_changed`, `project_trust`, `input_disposition`, `thinking_level_select`, `session_before_fork`: CHƯA ĐO.** Tôi chỉ khẳng định chúng "mở được" theo lập luận generic, chưa chỉ ra dòng cụ thể trong omp. Riêng `model_select` (`session/model-controls.ts:218`) và `agent_settled` (`modes/rpc/rpc-session-settle.ts:59`) thì **có**. Tôi có quét `packages/coding-agent/src/session/*.ts` tìm `abort` và thấy `agent-session.ts:918 #abortInProgress`, `agent-session.ts:1056` — **nhưng chưa truy ra được hàm public nào là "điểm kết của một lần abort"**, nên vẫn ghi CHƯA ĐO thay vì đoán.
- **Đã thu hẹp: chỗ phát `agent_settled` nhiều khả năng là MỘT, ở tầng session.** Tôi ban đầu trỏ vào `modes/rpc/rpc-session-settle.ts:59`, nhưng `grep -rln 'isTerminal'` cho **10 file** trong đó có `session/agent-session-events.ts` và `session/session-maintenance.ts` — tức khái niệm này đã nằm ở tầng session, không chỉ ở tầng mode. **Tôi chưa truy tới hàm cụ thể nào phát `agent_end` với `isTerminal`**, nên con số "10 dòng, 2 file" là **ước lượng trên cấu trúc đã đo, chưa phải phép đo vị trí**. Nếu hoá ra `agent_end` được phát ở nhiều nơi thì phải đếm lại.
- **Vị trí chính xác của `transcript renderer` trong omp (cho S7): CHƯA ĐO.** Ước 30 dòng là phỏng đoán từ "chỉ đăng ký renderer", không phải phép đo.
- **Tôi chỉ đếm `pi.on("…")`.** Một builtin có thể đăng ký event qua biến hoặc qua `wrapper` (`extensions/wrapper.ts`, 432 dòng ở omp) mà regex của tôi không bắt. Các con số "0 builtin dùng" cho 10 method thiếu là **trên phép đo `grep` từ đường**, không phải chứng minh tuyệt đối.
- **Tôi không mở file renderer của bất kỳ builtin nào** (kế thừa đúng điểm này của `deep-risk.md` §9). §5 nói "chạy được ngay" = **hợp đồng API đã đủ**, không phải "sẽ không lỗi TUI".
- **Số dòng trong mục 3 là ước lượng từ cấu trúc, không phải phép đo.** Tôi đo được *điểm móc* và *loại event*, không đo được *số dòng phải viết* — cần một spike thật mới chốt được.
- **Giới hạn 60 lệnh: tôi dùng 34.** Dự phòng còn 26 cho vòng sau.
- **Tôi không sửa file nào trong repo.** Toàn bộ là đo và khuyến nghị.

---

## Phụ lục — lệnh để chạy lại từ đầu

```bash
S=/Users/tranquangdang21/Projects/senpi-ref
O=/Users/tranquangdang21/Projects/ultraworkers
B=packages/coding-agent/src/core/extensions/builtin

# §0.1 — 46 event của omp
cd $O
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE 'event: "[a-z_.]+"' | sed 's/event: "//;s/"//' | sort -u > /tmp/omp_ev.txt
wc -l < /tmp/omp_ev.txt; grep -n 'model_select' packages/coding-agent/src/extensibility/extensions/types.ts

# §1 — cấu trúc emit
grep -nE '(private|async|#)?\s*(emit|fire|dispatch)[A-Za-z]*\s*[<(]' \
  packages/coding-agent/src/extensibility/extensions/runner.ts | head -60
grep -rn 'type RunnerEmitEvent\|type RunnerEmitResult' packages/coding-agent/src/extensibility/extensions/*.ts

# §2.1 — 37 chỗ gọi, 11 event thiếu
cd $S
git ls-files "$B/*" | grep '\.ts$' > /tmp/builtin_ts.txt
xargs grep -hoE '\bpi\.on\("[a-z_.]+"' < /tmp/builtin_ts.txt | sed 's/pi.on("//;s/"//' | sort | uniq -c | sort -rn

# §2.2 — 15 method/field thiếu, mức dùng
for m in executeTool registerEntryRenderer registerFilesystemPolicy registerLazyToolActivator \
         registerMarkdownTransformer registerMcpServer registerReadClassifier registerRemovedToolHint \
         setSessionFastMode setSessionModel setSessionThinkingLevel \
         setWorkingVisible setWorkingIndicator setHiddenThinkingLabel getEditorComponent; do
  printf "%-30s %3s file\n" "$m" \
    "$(xargs grep -l "\b$m\b" < /tmp/builtin_ts.txt 2>/dev/null | wc -l | tr -d ' ')"
done

# §5 — phân rã 24 / 11 / 5 / −3 = 13  (BẮT BUỘC join bằng awk, KHÔNG dùng for e in $var — zsh không tách từ)
awk -F'\t' 'NR==FNR{omp[$0]=1;next}
  { if($2 in omp) h[$1]=1; else m[$1]=1 }
  END{ for(d in h) if(!(d in m)) clean[++nc]=d; print "no-missing-event: " nc }' \
  /tmp/omp_ev.txt /tmp/dir_ev.tsv

# §3 S1 — điểm móc model_select
cd $O && grep -rn 'async setModel' packages/coding-agent/src --include='*.ts'
sed -n '218,232p' packages/coding-agent/src/session/model-controls.ts

# §3 S2 — agent_settled: không payload, phát ở đâu, omp đã có isTerminal chưa
cd $S
awk '/interface AgentSettledEvent/,/^}/' packages/coding-agent/src/core/extensions/types.ts
grep -rn 'agent_settled' packages/coding-agent/src --include='*.ts' | grep -v builtin
cd $O
sed -n '14,17p' packages/coding-agent/src/session/agent-session-events.ts
grep -rln 'isTerminal' packages/coding-agent/src --include='*.ts'
wc -l packages/coding-agent/src/session/agent-session-events.ts

# §3 S2 — 6 consumer làm gì khi nhận agent_settled (bằng chứng "hỏng âm thầm")
cd $S
for f in herdr loop loop-guard ttsr; do
  grep -n -A3 'on("agent_settled"' packages/coding-agent/src/core/extensions/builtin/$f | head -4
done

# §4.2 — 13 thư mục đăng ký tool + registerTool đã có sẵn ở omp
cd $S
for d in $(cat /tmp/dirs40.txt); do
  n=$(xargs grep -l '\bregisterTool\b' < <(git ls-files "$B/$d/*" | grep '\.ts$') 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" != "0" ] && echo "$d $n"
done
cd $O
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -nE 'registerTool|registerCommand|registerMessageRenderer'
```

**Hai chỗ dễ sai khi đo lại:**

1. **`ls` ở máy này bị alias sang `ls -l`.** `ls -1 "$B"` trả về long-format, sinh ra hai dòng giả `.` và `..` mà awk sẽ gộp **toàn bộ** event vào, làm mọi phép đếm sai. Dùng `find "$B" -maxdepth 1 -mindepth 1 -type d`.
2. **zsh không tách từ khi mở rộng `$var` không nhắc.** `for e in $ev` chạy **một** lần với chuỗi nhiều dòng. Đây là lỗi đã làm tôi kết luận ngược "0/40 builtin cần seam". Luôn join bằng `awk`.
