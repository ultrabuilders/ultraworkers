# Phiếu triển khai — M4 (work item "Một hook nổi không được rửa thành quyết định chặn")

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_4_EXECUTION_PLAN.md`

> **Lưu ý về tên work item.** Task giao `M4-13`, nhưng tiêu đề khớp với `## GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C)` tại `MILESTONE_4_EXECUTION_PLAN.md:1975`. `GAP-M4-13` (`MILESTONE_4_EXECUTION_PLAN.md:2149`) là mục khác hẳn — "Cặp audit bền vững cho mỗi lần hỏi quyền". Phiếu này viết cho **GAP-M4-12**. Tên file đầu ra giữ nguyên theo task.

---

## PHẦN 0 — Kết quả kiểm lại từng neo (VIỆC 1)

Cây tham chiếu: `/Users/tranquangdang21/Projects/ultraworkers` (repo `omp`). Tất cả đường dẫn dưới đây là đường dẫn tương đối từ repo root.

### 0.1 File trong bảng "File cần chạm tới" — tồn tại hay không

| path | dòng | tồn tại |
| --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | 1874 | CÓ |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | 1992 | CÓ |
| `packages/coding-agent/src/extensibility/extensions/wrapper.ts` | 466 | CÓ |
| `packages/coding-agent/src/extensibility/hooks/runner.ts` | 427 | CÓ |
| `packages/coding-agent/src/extensibility/hooks/tool-wrapper.ts` | 139 | CÓ |
| `packages/coding-agent/src/session/agent-session.ts` | 12352 | CÓ |

### 0.2 Từng neo, từng cái

| neo trong work item | việc | kết quả |
| --- | --- | --- |
| `extensions/types.ts:985` — "`ToolCallEventResult` khai cùng file với `tool_approval_requested` ở `:985`" | kiểm dòng | **SAI.** `sed -n '985p'` → `export interface ToolApprovalRequestedEvent {`. Đó là event, không phải result. `grep -n ToolCallEventResult types.ts` trả **3** hit: `:129` (import), `:1189` (`export type { ToolCallEventResult } from "../shared-events";`), `:1361` (dùng trong `on(event: "tool_call", …)`). Không có khai báo interface nào trong file này. **Vị trí đúng:** `packages/coding-agent/src/extensibility/shared-events.ts:314` (`export interface ToolCallEventResult {`), file 487 dòng. Cả hai wrapper import qua `./types` (`extensions/wrapper.ts:27`, `hooks/tool-wrapper.ts:14`), mà `hooks/types.ts:423` cũng chỉ re-export từ `../shared-events` — nên `shared-events.ts` là **nơi duy nhất** thêm được `kind`. |
| `extensions/runner.ts:1615` — `async emitToolCall(…)` | đọc dòng | **ĐÚNG.** `async emitToolCall(event: ToolCallEvent, signal?: AbortSignal): Promise<ToolCallEventResult \| undefined> {` |
| `extensions/runner.ts:1610-1614` — chú thích "On-timeout policy: **fail-closed**" | đọc dải | **ĐÚNG.** `:1610` = `* On-timeout policy: **fail-closed** (return \`{ block: true }\`). This is`; `:1614` = `*/` |
| `extensions/runner.ts:1636` — `block: true` | đọc dòng | **ĐÚNG.** `block: true,` (trong callback `(kind, message) => ({ … })` bắt đầu ở `:1635`) |
| `extensions/runner.ts:1640` — `` `Extension ${ext.path} failed: ${message}` `` | đọc dòng | **ĐÚNG.** `: \`Extension ${ext.path} failed: ${message}\`,` |
| `extensions/runner.ts:1476` — `onFailure?.("timeout", …)` | đọc dòng | **ĐÚNG.** `return onFailure?.("timeout", error);` |
| `extensions/runner.ts:1488` — `onFailure?.("error", …)` | đọc dòng | **ĐÚNG.** `return onFailure?.("error", message);` |
| `extensions/wrapper.ts:262` — `if (callResult?.block) {` | đọc dòng | **LỆCH +1.** Thật là **`:263`**. (`awk` xác nhận: 262 = `)) as ToolCallEventResult \| undefined;`) |
| `extensions/wrapper.ts:264` — `throw new Error(reason)` | đọc dòng | **LỆCH +1.** Thật là **`:265`**. `:264` là `const reason = callResult.reason \|\| "Tool execution was blocked by an extension";` |
| `hooks/runner.ts:327` — `async emitToolCall(event: ToolCallEvent)` | đọc dòng | **ĐÚNG.** `async emitToolCall(event: ToolCallEvent): Promise<ToolCallEventResult \| undefined> {` |
| `hooks/runner.ts:325-326` — chú thích *"Errors are thrown (not swallowed)…"* | đọc dải | **ĐÚNG.** `:322-326` là cả khối doc: `:323` `Emit a tool_call event to all hooks.`, `:324` `No timeout - user prompts can take as long as needed.`, `:325` `Errors are thrown (not swallowed) so caller can block on failure.`, `:326` `*/` |
| `hooks/runner.ts:271` — `async emit(…)` | đọc dòng | **ĐÚNG.** `async emit(` |
| `hooks/runner.ts:310` — `this.emitError` | đọc dòng | **ĐÚNG.** `this.emitError({` (trong `catch (err)` mở ở `:309`) |
| `hooks/runner.ts:378` và `:416` | đọc hai dòng | **ĐÚNG.** `emitError` khai ở `:162`; các call site: `:310` (trong `emit`), `:378` (trong `emitContext`, khai `:360`), `:416` (trong `emitBeforeAgentStart`, khai `:394`). `emitToolCall` (`:327-351`) **không** gọi `emitError` lần nào — bằng chứng đúng như sổ nói. |
| `hooks/tool-wrapper.ts:78-83` (bảng file) và `hooks/tool-wrapper.ts:77-80` (bảng đính chính) | đọc dải | **LỆCH +1 ở CẢ HAI BẢNG.** Thật: `} catch (err) {` ở **`:79`**, `// Hook error or block - throw to mark as error` ở `:80`, `if (err instanceof Error) {` ở `:81`, `throw err;` ở `:82`, ``throw new Error(`Hook failed, blocking execution: ${String(err)}`)`` ở **`:84`**, `}` đóng ở `:85`. Dải đúng là **`:79-85`**. |
| Bảng "Đính chính" của chính work item: "`:78` / `:79` / `:80-81` / `:82` / `:83`" | đọc lại từng dòng | **SAI +1 TRÊN MỌI DÒNG.** Thật là 79 / 80 / 81-83 / 84 / 85. Bảng đính chính sinh ra để sửa lỗi lệch một dòng lại lệch đúng một dòng — và nó là bằng chứng rằng "sáu lần trong bộ đính chính của file này" là loại lỗi đang tái diễn, không phải sự cố lẻ. |
| `agent-session.ts:4509` — `const callResult = await runner.emitToolCall(`, không bọc try/catch | đọc dòng + hàm bao | **ĐÚNG cả hai.** `:4509` = `const callResult = await runner.emitToolCall(`. Hàm bao là `#beforeToolCall` (`:4491`), không có `try` nào quanh chỗ gọi. |
| Hàng "renderer hiện tại": "`ToolExecutionComponent` + `tool-execution.ts` hiển thị **hai nhãn khác nhau**" | tìm nhãn | **SAI.** `grep -rn "Blocked by" packages/tui/src packages/coding-agent/src` → **0 hit** (hai hit `"Blocked by bash pattern:"` nằm ở `tools/bash.ts:511,528`, không liên quan). `ToolExecutionComponent` khai ở `packages/tui/src/chat/tool-execution.ts:243`, file 1407 dòng, chỉ có **một** cờ `isError` và **không** có trường nào mang kind/sourceName. Renderer hôm nay có **một** nhãn, không phải hai; hợp đồng "hai nhãn" là **mới hoàn toàn**. Cột "đã kiểm chứng?" của hàng này cũng **không có neo** — nó chỉ trỏ sang "seam M4-7 đã dựng sẵn", mà seam M4-7 (G3 rebuild parity / G4 hidden-key) là plumbing field `argsComplete`/`executionStarted`/`rawArgs`, **không** phải seam nhãn. |

### 0.3 Chỗ work item bỏ sót (tìm được khi đọc code, không phải neo hỏng)

| chỗ | nội dung thật | vì sao quan trọng |
| --- | --- | --- |
| `extensions/runner.ts:1656` | `return { block: true, reason: \`Tool execution was cancelled while an extension handler was pending\` };` | Đây là **producer thứ hai** của `block: true` trong `extensions/runner.ts`. Work item chỉ nói "đường hủy thì giữ nguyên nghĩa hiện có", nhưng schema mới bắt buộc `kind` mọi khi `block` có mặt → union `"denied" \| "hook-failed"` **không đủ**, hoặc nhánh hủy phải mang một giá trị thứ ba. Xem test `extensions-runner.test.ts:1938` ("cancels a pending confirmation and blocks tool execution when the outer dispatch aborts (#4223)"). |
| `hooks/tool-wrapper.ts:66-68` | `if (callResult?.block) { const reason = callResult.reason \|\| "Tool execution was blocked by a hook"; throw new Error(reason); }` | Đây là **đường `denied` của hooks**, và work item **không nhắc tới**. Bảng file chỉ liệt kê khối `catch`. Sửa `catch` mà bỏ `:66-68` thì hooks vẫn ném `reason` trần. |
| `agent-session.ts:4518-4520` | `if (callResult?.block) { return { block: true, reason: callResult.reason \|\| "Tool execution was blocked by an extension" }; }` | Call site **dựng lại** object `{ block, reason }` → `kind` bị **rơi im lặng**. Work item gọi đây là "một kiểm tra của con người" vì "call site không đổi chữ ký" — nhưng nó **có** dựng lại, và đó là chỗ rơi cụ thể, không phải kiểm tra mơ hồ. |
| `packages/agent/src/types.ts:859-864` | `export interface BeforeToolCallResult { block?; reason?; args?; additionalContext?; }` | Kiểu thứ **ba**, song song với `ToolCallEventResult`, là kiểu trả về của `#beforeToolCall`. Work item không nhắc. Muốn mang `kind` tới renderer thì nó cũng phải có `kind`. `packages/agent/test/agent-loop.test.ts:4850,7056` và `run-summary.test.ts:278` là nơi kiểu này được dùng. |
| `extensions/runner.ts:259-334` | `raceHandlerWithTimeout` — 76 dòng, **không export**, dựa vào hai symbol module-private ở `:140-141` (`EXTENSION_HANDLER_TIMEOUT`, `EXTENSION_HANDLER_ABORTED`) | Cơ chế pause/resume budget (`pauseDepth`/`remainingMs`/`activeSince`) chính là thứ **trừ thời gian chờ dialog OMP** ra khỏi hạn mức. Bước 4 của work item ("thêm timeout cho `hooks/runner.ts`") là một refactor 76 dòng có quyết định kiến trúc (tách ra module chung hay nhân bản), không phải thêm một `if`. |
| `extensions/runner.ts:1471-1475` và `:1482-1487` | `this.emitError({...})` **đã được gọi** ở cả nhánh timeout lẫn nhánh lỗi, bên trong `#runHandlerWithTimeout` | **Bước 3.3 của work item đã xong sẵn ở đường extensions.** Cổng #3 trong "Cổng hoàn thành" sẽ xanh với **không một dòng sửa nào**. |

### 0.4 Ba file test trong khối Xác minh không tồn tại

| lệnh trong plan | trạng thái |
| --- | --- |
| `packages/coding-agent/test/extensions-runner.test.ts` | **CÓ** (131 KB) |
| `packages/coding-agent/test/hooks-runner.test.ts` | **KHÔNG CÓ** — `find . -name 'hooks-runner.test.ts'` trả rỗng |
| `packages/coding-agent/test/extension-tool-wrapper.test.ts` | **KHÔNG CÓ** |
| `packages/coding-agent/test/hooks-tool-wrapper.test.ts` | **KHÔNG CÓ** |
| `packages/tui/test/tool-execution-xdev-render.test.ts` | **CÓ** |
| `packages/tui/test/json-tree-render.test.ts` | **CÓ** |

File hook-wrapper gần nhất thực sự tồn tại: `packages/coding-agent/test/hook-tool-wrapper-input.test.ts` (số ít, không phải số nhiều).

### 0.5 Tiền đề môi trường đã thoả rồi

`packages/natives/native/pi_natives.darwin-arm64.node` **đã tồn tại**. Bước 0 của khối Xác minh (cài `ninja` + `bun --cwd=packages/natives run build`) là dư — commit `47720fd` của chính repo ghi rõ: *"docs(plans): the native addon is built, so 'bun test is blocked' is false"*.

---

## PHẦN 1 — Cái gì thay đổi, quan sát được

Một extension bên thứ ba ném exception trong handler `tool_call` (hoặc một hook `hooks.json` treo), và sau đó transcript hiện ra `Extension /path/to/ext.ts failed: <message>` hoặc `Hook failed, blocking execution: <err>` **cùng tone với** một lệnh từ chối của người dùng; sau item này, đường hỏng đó được gắn nhãn riêng nói rõ **không ai chặn, hook hỏng** — còn một handler trả `{ block: true }` thật vẫn giữ nhãn "ai đã chặn" — và quyết định có chạy tool hay không **không đổi một chút nào**.

---

## PHẦN 2 — Bảng điểm sửa

| đường/dẫn | symbol | TRƯỚC (trích nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `extensibility/shared-events.ts:314` | `interface ToolCallEventResult` | `	/** If true, block the tool from executing */`<br>`	block?: boolean;`<br>`	/** Reason for blocking (returned to LLM as error) */`<br>`	reason?: string;` | thêm `kind?: "denied" \| "hook-failed" \| "cancelled";` ngay dưới `reason`, có doc comment nói rõ **bắt buộc** khi `block` có mặt và ai sinh ra từng giá trị. **(Không phải `extensions/types.ts` — xem 0.2.)** |
| `extensibility/extensions/runner.ts:1635-1641` | callback `onFailure` trong `emitToolCall` | `					(kind, message) => ({`<br>`						block: true,`<br>`						reason:`<br>`							kind === "timeout"`<br>`								? \`Extension ${ext.path} timed out after ${timeoutMs}ms\`<br>`								: \`Extension ${ext.path} failed: ${message}\`,`<br>`					}),` | `kind: "hook-failed",` thêm vào literal. `block: true` **giữ nguyên**. Đổi tên tham số `kind` → `failure` để không đụng tên trường mới. |
| `extensibility/extensions/runner.ts:1655-1657` | nhánh abort | `		if (signal?.aborted) {`<br>`			return { block: true, reason: \`Tool execution was cancelled while an extension handler was pending\` };`<br>`		}` | `kind: "cancelled",` thêm vào literal (hoặc gộp vào `hook-failed` — xem **Cần người quyết**). |
| `extensibility/extensions/runner.ts:1644-1646` | `if (handlerResult.block) { return handlerResult; }` | `				if (handlerResult.block) {`<br>`					return handlerResult;`<br>`				}` | chuẩn hoá trước khi trả: `return handlerResult.kind ? handlerResult : { ...handlerResult, kind: "denied" };` — đây là chỗ **duy nhất** sinh nhãn `denied`, và là nơi hàng âm ở §4 bắt đỏ. |
| `extensibility/hooks/runner.ts:336-338` | vòng lặp handler trong `emitToolCall` | `			for (const handler of handlers) {`<br>`				// No timeout - let user take their time`<br>`				const handlerResult = (await handler(event, ctx)) as ToolCallEventResult \| undefined;` | bọc trong timeout dùng chung (xem bước 4) + `try/catch`; nhánh lỗi trả `{ block: true, kind: "hook-failed", reason: \`Hook ${hook.path} failed: ${message}\` }` **và** gọi `this.emitError({ hookPath, event, error })`; nhánh `block` thì chuẩn hoá `kind: "denied"`. Xoá hai dòng chú thích `:324` và `:337` — chúng nói điều sai sau thay đổi. |
| `extensibility/extensions/wrapper.ts:263-265` | `if (callResult?.block)` | `				if (callResult?.block) {`<br>`					const reason = callResult.reason \|\| "Tool execution was blocked by an extension";`<br>`					throw new Error(reason);`<br>`				}` | mang `callResult.kind` vào lỗi theo một kênh có cấu trúc (xem **Cạm bẫy #2**): `throw blockedToolError(callResult.kind, reason, "an extension")` — hoặc tối thiểu `reason = \`Hook failed: …\`` khi `kind === "hook-failed"`. Không đổi `block`. |
| `extensibility/hooks/tool-wrapper.ts:66-68` | `if (callResult?.block)` | `				if (callResult?.block) {`<br>`					const reason = callResult.reason \|\| "Tool execution was blocked by a hook";`<br>`					throw new Error(reason);`<br>`				}` | y hệt dòng trên, với nhãn "a hook". **Hàng này không có trong bảng file của work item** — thêm vào. |
| `session/agent-session.ts:4518-4520` | `#beforeToolCall`, nhánh block | `		if (callResult?.block) {`<br>`			return { block: true, reason: callResult.reason \|\| "Tool execution was blocked by an extension" };`<br>`		}` | `return { block: true, kind: callResult.kind, reason: … };` — nếu `BeforeToolCallResult` được mở rộng. |
| `agent/src/types.ts:859-864` | `interface BeforeToolCallResult` | `export interface BeforeToolCallResult {`<br>`	block?: boolean;`<br>`	reason?: string;`<br>`	args?: Record<string, unknown>;`<br>`	additionalContext?: string;`<br>`}` | thêm `kind?: "denied" \| "hook-failed" \| "cancelled";`. Kiểu thứ ba, work item không nhắc. |
| `tui/src/chat/tool-execution.ts:243` (`class ToolExecutionComponent`) | kết quả tool | không có trường nào phân biệt nguồn chặn | thêm một trường trên kết quả đã chuẩn hoá (vd `blockKind`) và rẽ **hai nhánh render khác nhau**: `denied` → `"Blocked by " + sourceName`; `hook-failed` → `"Hook failed: " + sourceName + " did not complete"`. Chi tiết cơ chế ở **Cạm bẫy #2**. |
| `coding-agent/src/modes/utils/ui-helpers.ts:605` | `decodeStreamedToolArgs(partialJson, {…})` | rebuild transcript, `:611` gọi constructor component | phải truyền `blockKind` qua **cả** đường này và đường stream (`modes/controllers/event-controller.ts`). Bỏ một trong hai thì nhãn đúng lúc stream, sai khi dựng lại transcript. |

---

## PHẦN 3 — Các bước, đánh số, mỗi bước có neo đã kiểm

**Bước 0 — Ghi lại trước khi code: quyết định fail-closed KHÔNG đổi.** Bằng chứng cụ thể cho câu này: `extensions/runner.ts:1610-1613` (`On-timeout policy: **fail-closed** (return { block: true })`) và `:1636` (`block: true,`). Cả hai giữ **nguyên văn**. Điều khoản bảo toàn: hôm nay hook hỗng thì tool không chạy, sau item này nó vẫn không chạy.

**Bước 1 — Sửa type ở đúng file.** Thêm `kind` vào `shared-events.ts:314` (`interface ToolCallEventResult`, ngay sau `reason?: string;` ở `:317`). *Không* sửa `extensions/types.ts` — `:1189` chỉ là `export type { ToolCallEventResult } from "../shared-events";`, sửa ở đó là sửa bản sao không ai đọc.

**Bước 2 — Gắn nhãn ở ba producer của `extensions/runner.ts`.**
- `runner.ts:1635-1641` → `kind: "hook-failed"`.
- `runner.ts:1655-1657` (abort) → `kind: "cancelled"`.
- `runner.ts:1644-1646` (`if (handlerResult.block) return handlerResult;`) → chuẩn hoá `kind: "denied"` khi handler không tự mang.

**Bước 3 — Vá `hooks/runner.ts:327` cho đúng hình dạng của `extensions/runner.ts:1615`.** Ở `:336-338`, hiện là `const handlerResult = (await handler(event, ctx)) as ToolCallEventResult \| undefined;` — không try/catch, không timeout. Thêm: timeout dùng chung (bước 5), `try/catch` quanh handler, nhánh lỗi trả `{ block: true, kind: "hook-failed", reason }` **và** gọi `this.emitError({ hookPath: hook.path, event: "tool_call", error: message })` theo đúng khuôn của `:309-315`. Xoá chú thích sai ở `:324` và `:337`.

**Bước 4 — Cấp kênh có cấu trúc tới renderer, qua CẢ BA consumer của `callResult.block`.** Đây là bước work item coi là dễ nhất và thực ra là bước khó nhất.
- `extensions/wrapper.ts:263-265` → throw.
- `hooks/tool-wrapper.ts:66-68` → throw. *(không có trong bảng file của work item)*
- `hooks/tool-wrapper.ts:79-85` → bọc lỗi non-`Error` thành `Hook failed, blocking execution: …`; sau bước 3 nhánh này **chỉ còn** bắt lỗi không phải `Error`, phải giữ nguyên hành vi.
- `agent-session.ts:4518-4520` → dựng lại `{ block, reason }`, **rơi `kind`**. Sửa hoặc kind chết ngay đó.
- Kiểu trung gian: `BeforeToolCallResult` (`agent/src/types.ts:859-864`).

**Bước 5 — Thêm timeout cho `hooks/runner.ts` bằng cơ chế ĐANG ĐÚNG, không phải bằng `Bun.sleep`.** `raceHandlerWithTimeout` (`extensions/runner.ts:259-334`) dài 76 dòng, không export, dựa hai symbol module-private ở `:140-141`. Nó có `pauseDepth`/`remainingMs`/`activeSince` để **trừ thời gian chờ dialog OMP** ra khỏi hạn mức — đúng như mô tả setting tại `extensibility/settings.ts:160`: *"time awaiting OMP-owned dialogs does not count"*. Thêm một `Promise.race` thuần sẽ giết dialog của người dùng sau 30 giây, phá hành vi đang có. Quyết định bắt buộc: **tách `raceHandlerWithTimeout` + hai symbol ra module chung** (khuyến nghị), hoặc chấp nhận nhân bản. Không được viết `Bun.sleep(30_000)`.

**Bước 6 — Hằng thời hạn: đọc từ đúng chỗ.** `extensionHandlerTimeoutMs` (`extensions/runner.ts:104`) là `let` **module-private, không export**; chỉ `testSetExtensionHandlerTimeoutMs` (`:110`) gán được. Thứ export là `EXTENSION_HANDLER_TIMEOUT_MS` (`:103` = `30_000`) và `cfgExtensionHandlersToolCallTimeoutMs` (`settings.ts:151-162`, `default: 30_000`). Dùng `EXTENSION_HANDLER_TIMEOUT_MS`; **không** tạo hằng thứ ba. Nếu hooks cần override theo settings thì phải nói rõ — hiện hooks không có bất kỳ setting timeout nào.

**Bước 7 — Renderer: hai nhánh, và cả hai đường dựng transcript.** `ToolExecutionComponent` (`tui/src/chat/tool-execution.ts:243`) nay có **một** cờ `isError`; `grep "Blocked by" packages/tui/src` = **0 hit**. Hai nhánh là việc mới, không phải chỉnh sửa. Phải sửa **cả** `tool-execution.ts` (đường stream) **và** `coding-agent/src/modes/utils/ui-helpers.ts:605` + `modes/controllers/event-controller.ts` (đường rebuild).

**Bước 8 — Khẳng định âm bắt buộc.** Một handler trả `{ block: true, reason: "…" }` thật vẫn ra nhãn `denied`. Xem §4.

**Bước 9 — Chạy cổng** (§5). Khối Xác minh của plan **không chạy được nguyên trạng** vì 3 trong 5 file test không tồn tại — xem §5.

---

## PHẦN 4 — Hợp đồng test

### (1) Fail-closed không đổi — nhưng điều khoản "không được sửa test cho xanh" **không thi hành được, phải viết lại**

Work item nói: *"Mọi test hiện có khẳng định 'hook lỗi ⇒ tool bị chặn' phải giữ xanh, không được sửa cho xanh."* Cụ thể là không dùng `toEqual`, chỉ kiểm tool **không** chạy. Nhưng ba test đang dùng `toEqual` — khớp từng trường — nên **bắt buộc đỏ** khi `kind` được thêm:

| test | dòng | khẳng định |
| --- | --- | --- |
| `extensions-runner.test.ts` (timeout mặc định) | `:1633-1636` | `expect(await decision).toEqual({ block: true, reason: \`Extension ${extensionPath} timed out after ${EXTENSION_HANDLER_TIMEOUT_MS}ms\` });` |
| `extensions-runner.test.ts` (timeout 10ms) | `:1929-1932` | `expect(await decision).toEqual({ block: true, reason: \`Extension ${extensionPath} timed out after 10ms\` });` |
| `extensions-runner.test.ts` ("discards collected additional context when a later handler blocks") | `:3121-3128` | `).resolves.toEqual({ block: true, reason: "blocked" });` |

Hai test đầu đỏ khi thêm `kind: "hook-failed"`. Test thứ ba đỏ khi `runner.ts:1644-1646` chuẩn hoá `kind: "denied"`.

**Không thể vừa thêm `kind` vừa giữ nguyên ba khẳng định này.** Đây là mâu thuẫn logic trong work item, không phải khó kỹ thuật. Cách viết lại đúng — **giữ đúng khẳng định điều khoản bảo toàn, đổi cách khẳng định** (đây là sửa test *để phản ánh hợp đồng mới*, không phải nới khẳng định):

```ts
// extensions-runner.test.ts — ba test trên đổi thành:
//   1) vẫn khẳng định "tool KHÔNG chạy" (điều khoản bảo toàn) — giữ nguyên
//   2) khẳng định block vẫn là true và reason vẫn chứa mã đường hỗng:
//      expect(decision?.block).toBe(true);
//      expect(decision?.reason).toContain("failed");  / toContain("timed out after")
//   3) khẳng định phân loại:
//      expect(decision?.kind).toBe("hook-failed");
// Nhưng vẫn dùng toEqual với shape ĐẦY ĐỦ khi đã quyết định union:
//      expect(await decision).toEqual({ block: true, kind: "hook-failed", reason: … });
```

`expect(executeCalls).toEqual([])` ở `:1697` và `expect(executed).toBe(false)` ở `:2000` là điều khoản bảo toàn thật — **giữ nguyên tuyệt đối**. `rejects.toThrow()` ở `:1997` không khẳng định chuỗi nên an toàn.

### (2) Khẳng định âm bắt buộc — hàng này là cổng quyết định

| file test mới | case | người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| `packages/coding-agent/test/tool-call-block-kind.test.ts` (mới) | handler trả `{ block: true, reason: "policy: no writes" }` → `emitToolCall` trả `kind === "denied"` | transcript hiện `Blocked by <nguồn>`. Nếu `runner.ts:1644-1646` bỏ chuẩn hoá, nhãn `denied` biến mất — hoặc tệ hơn, mọi thứ thành `hook-failed` và người dùng mất đúng thông tin "ai đã chặn tôi". |
| cùng file | handler ném `new Error("boom")` → `kind === "hook-failed"` **và** `runner.onError` nhận `{ event: "tool_call", error: "boom" }` | transcript hiện `Hook failed: … did not complete`. Không có ai chặn. |
| cùng file | handler treo, timeout kích hoạt → `kind === "hook-failed"`, `reason` chứa `timed out after` | y hệt, và tool vẫn không chạy. |
| cùng file | `controller.abort()` giữa lúc handler đang chờ → `kind === "cancelled"`, `reason` chứa `cancelled while an extension handler was pending` | người dùng hủy, không phải ai chặn. Nhãn `hook-failed` ở đây là **thông tin sai**. |
| `packages/coding-agent/test/hook-tool-wrapper-input.test.ts` (đã có) | hook `hooks.json` trả block thật → lỗi mang nhãn `denied`; hook ném lỗi → `hook-failed` | đường hooks phải phân biệt được y hệt đường extensions, nếu không thì "đã sửa" chỉ áp dụng cho một nửa người dùng. |
| `packages/tui/test/tool-execution-block-label.test.ts` (mới) | dựng component với kết quả `kind: "denied"` và `kind: "hook-failed"`, đối chiếu **cả** đường stream **và** `ui-helpers.ts:605` rebuild | hai chuỗi render **khác nhau và nhìn thấy được**. Nếu chỉ sửa `tool-execution.ts`, transcript dựng lại sẽ đổi nhãn — kiểu hỏng mà `bun check` không thấy. |

Không dùng `mock.module()` (AGENTS.md cấm). Dùng `vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach`.

---

## PHẦN 5 — Cổng

### 5.1 Tiền đề môi trường — **đã thoả, bỏ bước 0**

`packages/natives/native/pi_natives.darwin-arm64.node` đã tồn tại. Không cài `ninja`, không build lại. Nếu vẫn thấy *"Failed to load pi_natives native addon"*, đó là môi trường của máy khác, không phải việc này.

### 5.2 Cổng như plan viết — **KHÔNG chạy được, phải viết lại**

Lệnh (1) và (3) trong khối Xác minh tham chiếu ba file không tồn tại (`hooks-runner.test.ts`, `extension-tool-wrapper.test.ts`, `hooks-tool-wrapper.test.ts`). Chạy nguyên sẽ lỗi "không tìm thấy test", tức là **luôn xanh-vì-không-có-gì-chạy** — tệ hơn không có cổng.

### 5.3 Cổng viết lại

```bash
# 1. Điều khoản bảo toàn — chỉ đổi cách khẳng định, KHÔNG đổi ý nghĩa
bun test packages/coding-agent/test/extensions-runner.test.ts

# 2. Hợp đồng mới (hàng âm + nhánh cancelled + hai đường wrapper)
bun test packages/coding-agent/test/tool-call-block-kind.test.ts
bun test packages/coding-agent/test/hook-tool-wrapper-input.test.ts

# 3. Nhãn ở renderer, cả hai đường stream lẫn rebuild
bun test packages/tui/test/tool-execution-block-label.test.ts
bun test packages/tui/test/tool-execution-xdev-render.test.ts

# 4. Không hồi quy toàn package
bun test packages/coding-agent/test/ packages/tui/test/ packages/agent/test/

# 5. Types + lint
bun run check:ts
bun run lint
```

Không dùng `tsc`/`npx tsc` (AGENTS.md cấm).

### 5.4 Cổng này có ĐỎ ĐƯỢC không — câu trả lời từng cổng một

| cổng | đỏ được? | bằng cách nào, cụ thể |
| --- | --- | --- |
| (1) điều khoản bảo toàn | **CÓ** | Xoá `block: true,` ở `extensions/runner.ts:1636`. `expect(executeCalls).toEqual([])` ở `extensions-runner.test.ts:1697` và `expect(executed).toBe(false)` ở `:2000` đỏ ngay. **Đây là cổng duy nhất chặn được việc đảo ngược quyết định.** |
| (2) hàng âm `denied` | **CÓ** | Bỏ chuẩn hoá ở `extensions/runner.ts:1644-1646` (hoặc gán `kind: "hook-failed"` cho mọi `block: true`). `tool-call-block-kind.test.ts` đỏ vì `kind` không còn là `"denied"`. Đồng thời `extensions-runner.test.ts:3128` đỏ. **Cổng quyết định của item.** |
| (3) hai nhãn ở renderer | **CÓ** | Sửa `tool-execution.ts` nhưng bỏ `ui-helpers.ts:605` / `event-controller.ts` → `tool-execution-block-label.test.ts` đỏ ở nhánh rebuild. Nhưng **chỉ** sau khi đã tạo kênh có cấu trúc ở bước 4; hôm nay chưa có gì để đỏ. |
| (4) `emitError` trên cả ba đường | **KHÔNG — cổng giả, bỏ nó** | `#runHandlerWithTimeout` **đã** gọi `this.emitError` ở `extensions/runner.ts:1471-1475` và `:1482-1487`, tức đường extensions **đã thoả** trước khi có việc gì. Cổng này xanh với 0 dòng sửa. Chỉ `hooks/runner.ts:336-338` thật sự thiếu. Viết lại thành: *một test khẳng định `runner.onError` nhận `{ event: "tool_call" }` trên **đường hooks**.* |
| (5) timeout cho hooks dùng đúng hằng | **CÓ, nhưng cần test riêng** | Đổi `EXTENSION_HANDLER_TIMEOUT_MS` sang một số khác trong test ⇒ `tool-call-block-kind.test.ts` đỏ. Nhưng **phải** có một test riêng khẳng định thời gian chờ dialog **không** bị trừ (đây là hành vi `pauseDepth` ở `runner.ts:259-334` bảo vệ; thêm `Bun.sleep` thuần sẽ phá nó và không test nào ở trên bắt được). |
| (6) `bun run check:ts` | **CÓ, một phần** | Đỏ nếu `kind` không được khai ở `shared-events.ts:314` mà lại dùng ở wrapper — `ToolCallEventResult` không có trường đó. Không đỏ với lỗi logic. |

**Cổng KHÔNG bắt được (viết rõ để không ai tưởng có):**
- `agent-session.ts:4509` có được soát hay không. Cổng này **không** bắt được vì `BeforeToolCallResult` không có `kind` nên `check:ts` im; và nếu ai đó chỉ sửa hai wrapper thì `agent-session.ts:4518-4520` âm thầm nuốt `kind` mà **không** test nào đỏ. Đây là một kiểm tra của con người — và là kiểm tra quan trọng nhất trong item này.
- Việc `hooks/runner.ts` thực sự dùng cơ chế pause/resume chứ không phải `Promise.race` thuần (xem **Cạm bẫy #1**).

---

## PHẦN 6 — Cạm bẫy riêng của work item này

**#1 — Bước "thêm timeout cho hooks" nghe như một dòng, thực tế là 76 dòng có bẫy giết người dùng.** `raceHandlerWithTimeout` (`extensions/runner.ts:259-334`) không chỉ race: nó có `pauseDepth` / `remainingMs` / `activeSince` để **tạm dừng đồng hồ khi người dùng đang đọc dialog**. Mô tả setting tại `extensibility/settings.ts:160` nói thẳng: *"time awaiting OMP-owned dialogs does not count"*. Nếu bạn viết `Promise.race([handler(e, ctx), Bun.sleep(30_000)])`, một hook hỏi `ctx.ui.confirm` sẽ **bị giết sau 30 giây dù người dùng đang suy nghĩ**. Đây là hồi quy nghiêm trọng hơn nhiều so với việc thiếu timeout, và không test nào trong khối Xác minh của plan bắt được. Bắt buộc: tách `raceHandlerWithTimeout` + `EXTENSION_HANDLER_TIMEOUT` (`:140`) + `EXTENSION_HANDLER_ABORTED` (`:141`) ra module chung.

**#2 — `throw new Error(reason)` nuốt cấu trúc; nhãn ở renderer không có kênh nào để tới.** Work item vẽ hai chuỗi ở tầng renderer (`"Blocked by " + sourceName` / `"Hook failed: " + sourceName + " did not complete"`), nhưng thứ đi tới renderer hôm nay là **một chuỗi** — `ToolExecutionComponent` (`tool-execution.ts:243`) chỉ có `isError`. Thêm `kind` vào `ToolCallEventResult` **không** tự tạo ra kênh: `wrapper.ts:265` stringify nó thành `Error.message`, `agent-loop.ts:545` đóng gói thành `content: [{ type: "text" }] + isError: true`. Nếu bạn chỉ thêm `kind` rồi ở renderer phân biệt bằng cách `startsWith("Hook failed:")`, bạn vừa viết string-matching trên protocol — đúng cái mà `ToolCallEventResult` sinh ra để chặn. Phải thêm một trường có cấu trúc xuyên từ `callResult` → `BeforeToolCallResult` → tool result → component. Đây là phần việc lớn nhất của item và work item **không** nêu.

**#3 — Work item nói "hai nhãn khác nhau" là trạng thái hiện tại; nó không phải.** `grep "Blocked by" packages/tui/src` = 0 hit. Cột "đã kiểm chứng?" của hàng renderer cũng không có neo. Kẻ triển khai tin rằng chỉ cần tách hai nhánh sẽ ra hai nhãn sẽ sửa nhầm chỗ và tưởng xong.

**#4 — Điều khoản bảo toàn của work item tự mâu thuẫn.** "Không được sửa một khẳng định nào để làm xanh" + `toEqual` ở ba test = không thể cùng lúc đúng. Ai đọc chỉ lật điều khoản sẽ hoặc bỏ `kind` (item vô nghĩa) hoặc sửa ba test và tưởng đã vi phạm. Phải viết lại thành "giữ nguyên `executeCalls === []` / `executed === false`; `toEqual` thì cập nhật shape".

**#5 — Bảng "Đính chính" của chính work item lệch +1 ở mọi dòng** (`hooks/tool-wrapper.ts`: nói 78/79/80-81/82/83, thật 79/80/81-83/84/85). Bảng file gốc cũng lệch. Bỏ qua điều này thì bạn sửa nhầm dòng rồi tưởng code không đúng — và sẽ kết luận sai rằng mã nguồn đã lệch với tài liệu.

**#6 — `extensions/types.ts` là chỗ sửa sai.** `:1189` chỉ là re-export type-only. Sửa file đó thêm `kind` sẽ **không** tạo ra trường nào, và `bun check` sẽ báo lỗi ở wrapper — dễ dẫn tới người triển khai quay lại sửa `shared-events.ts` rồi tưởng mình vừa sửa `types.ts` thành công.

**#7 — Cổng (4) trong plan xanh sẵn.** `#runHandlerWithTimeout` đã gọi `emitError` ở cả hai nhánh. Dành thời gian cho một cổng luôn xanh là mất thời gian; nó tạo cảm giác an toàn giả cho đúng cái mà work item đang cảnh báo.

**#8 — Bốn consumer của `callResult.block`, work item nói hai.** `extensions/wrapper.ts:263`, `hooks/tool-wrapper.ts:66`, `hooks/tool-wrapper.ts:79`, `agent-session.ts:4518`. Sửa hai cái đầu thì hai cái sau vẫn trần — và `agent-session.ts:4519` **tự dựng lại** object nên `kind` biến mất trong im lặng, đúng loại hỏng mà không cổng nào bắt.

---

## Tóm tắt cho người đọc nhanh

| | |
| --- | --- |
| Neo dạng `path:line` đã kiểm | 19 |
| Neo đúng nguyên văn | 13 |
| Neo lệch | 4 (`extensions/wrapper.ts:262`→263, `:264`→265, `hooks/tool-wrapper.ts` dải 78-83→**79-85**, bảng đính chính lệch +1 ở **mọi** dòng) |
| Neo sai nội dung | 2 (`types.ts:985` — interface thật ở `shared-events.ts:314`; hàng renderer — "hai nhãn" là mới, không phải hiện trạng) |
| File test trong cổng không tồn tại | 3 / 5 |
| Cổng luôn xanh | 1 (cổng `emitError` — extensions đã thoá sẵn) |
| Điều khoản trong work item không thi hành được | 1 ("không sửa test cho xanh" vs ba `toEqual` khớp từng trường) |
| Chỗ plan bỏ sót | 6 (abort `:1656`, hooks `denied` `:66-68`, agent-session `:4518-4520`, `BeforeToolCallResult`, `raceHandlerWithTimeout` 76 dòng, `emitError` extensions đã có) |
