# WI-3 — Bảng relay sự kiện đầy đủ, được trình biên dịch kiểm tra

**Kế hoạch:** `MILESTONE_2_EXECUTION_PLAN.md` §WI-3 (dòng 1378–1533)
**Nguồn:** `packages/coding-agent/` (omp), không phải `pi`
**Đã kiểm chứng trên:** HEAD `65cc6c1`, branch `milestone-1`, working tree có sửa file `.md` kế hoạch (không sửa mã nguồn)
**Ngày kiểm:** 2026-09-29

---

## 0. KẾT QUẢ KIỂM LẠI TỪNG NEO — CÂY ĐÃ DỜI

Đặc tả WI-3 trong kế hoạch tự ghi "đã kiểm chứng tại HEAD `808b365`". HEAD bây giờ là **`65cc6c1`**. Cây đã dời và **11/24 neo đã hỏng**. Bảng dưới là số thật, đo bằng `sed -n` / `grep -n`, không suy đoán.

### 0.1. Neo HỎNG — phải dùng số mới

| neo trong đặc tả | vị trí THẬT tại `65cc6c1` | lệch | cách tìm lại |
| --- | --- | --- | --- |
| `extensions/runner.ts:347` — `type RunnerEmitEvent = Exclude<` | **`runner.ts:350`** | +3 | `grep -n "RunnerEmitEvent" packages/coding-agent/src/extensibility/extensions/runner.ts` |
| `RunnerEmitEvent` dùng ở 361, 371, 1364, 1372, 1464 | **365, 375, 1393, 1401, 1493** | +4…+29 | cùng lệnh grep |
| `agent-session.ts:4602-4747` — `#emitExtensionEvent` | **`agent-session.ts:4642-4787`** | +40 | `grep -n "#emitExtensionEvent" …` |
| 19 phép `event.type ===` ở 4604…4740 | **4644, 4651, 4655, 4662, 4671, 4677, 4684, 4697, 4706, 4715, 4724, 4730, 4740, 4749, 4757, 4765, 4771, 4773, 4780** | +40 | `awk 'NR>=A && /event\.type === /{print NR}'` |
| `agent-session.ts:9523-9527` — comment `model_changed` | **`agent-session.ts:9669-9673`** (9674 = `if (isChanging) {`) | +146 | `grep -n "model_changed\` has no extension-facing hook" …` |
| `agent-session.ts:837` / `:849` — `#extensionRunner` / `#turnIndex` | **`agent-session.ts:857`** / **`:869`** | +20 | `grep -n "#turnIndex\|#extensionRunner:" …` |
| `agent-session.ts:139-156` — khối import | **`agent-session.ts:139-158`** | +2 | đọc `sed -n '139,158p'` |
| `agent-session.ts:4561` — `turn_id: Math.max(0, this.#turnIndex - 1)` | **`agent-session.ts:4601`** | +40 | `grep -n "turn_id: Math.max" …` |
| `agent-session.ts:4538-4544` — `#emitAgentEndNotification` | **`agent-session.ts:4578-4584`** | +40 | `grep -n "#emitAgentEndNotification" …` |
| `agent-session.ts:612-630` — `cloneMessageEndNotification` | **`agent-session.ts:642-650`** (helper field `…Field` ở 630-639) | +30 | `grep -n "cloneMessageEndNotification" …` |
| `agent-session.ts:1916-1920` — cầu nối `GoalRuntimeHost.emit` | **`agent-session.ts:1948-1952`** | +32 | `grep -n "goal_updated" …` |
| `agent-session.ts:6159` — `setGoalModeState` | **`agent-session.ts:6296`** | +137 | `grep -n "setGoalModeState" …` |
| `extensions/types.ts:1147` — `GoalUpdatedEvent` trong union | union bắt đầu **`:1140`**, `GoalUpdatedEvent` ở **`:1168`** | +21 | `grep -n "export type ExtensionEvent" …` |
| `test/agent-session-aside-delivery.test.ts:890-935` — khung dựng session | **`:887-932`** | −3 | đọc `sed -n '887,932p'` |
| `test/agent-session-aside-delivery.test.ts:29-47` — `beforeEach`/`afterEach` | **`:36-45`** | +7…−2 | đọc `sed -n '32,45p'` |
| HEAD `808b365` | **`65cc6c1`** | — | `git rev-parse --short HEAD` |

### 0.2. Neo ĐÚNG — dùng nguyên

| neo trong đặc tả | xác nhận tại `65cc6c1` |
| --- | --- |
| `goals/runtime.ts:456` — `dropGoal()` | **456**, và nó emit `goal_updated` với `status: "dropped"`, `state.enabled: false` (đọc 456-472) |
| `goals/state.ts:4-9` — `GoalModeState` | **4-9**, đúng `{ enabled; mode: "active"\|"exiting"; reason?; goal }` |
| `extensibility/shared-events.ts:147` — `GoalUpdatedEvent` | **148** (lệch 1 dòng, chấp nhận được) |
| `agent-session-events.ts:13-80` — union `AgentSessionEvent` | **13-80** |
| `agent/src/types.ts:1197-1219` — `AgentEvent` | **1197+**, đủ 11 biến thể |
| `hooks/types.ts:393-408` — `HookEvent` | **393-408**, đúng 15 phần tử |
| `event-controller.ts:107-109` — mapped type của TUI | **107-109** |
| `event-controller.ts:284-357` — bảng handler TUI | **284-357**, `} satisfies …;` đóng ở 357 |
| `event-controller.ts:287` — `turn_start: async () => {}` | **287** |
| `event-controller.ts:356` — `goal_updated: async () => {}` | **356** |
| `event-controller.ts:851` — cast mẫu | **851** |
| `event-controller.ts:74` — `AgentSessionEventKind` | **74** |
| `packages/coding-agent/tsconfig.json` gồm `src`,`test`,`scripts` | đúng nguyên văn |

### 0.3. Bốn điều đặc tả SAI so với cây thật, hoặc bỏ sót

**(a) Số kiểu sự kiện: 28 / 19 / 9 — đặc tả đúng, đã đếm lại.**
`{ agent/src/types.ts 1197-1240 ∪ agent-session-events.ts 13-80 }` → **28 tên** đúng. 19 relayable, 9 không relayable: `tool_stream_update`, `model_changed`, `config_warnings_changed`, `advisor_cost_changed`, `advisor_yielded`, `todo_auto_clear`, `irc_message`, `notice`, `thinking_level_changed`.

**(b) `bun test` CHẠY ĐƯỢC NGAY — đặc tả đang hedge quá mức.**
Addon native **đã có**: `packages/natives/native/pi_natives.darwin-arm64.node`. Đo thật:
`cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts` → `1 pass, 0 fail`. Cổng test KHÔNG cần `brew install ninja`, KHÔNG cần build thêm.

**(c) `state` trong `GoalUpdatedEvent` là TUỲ CHỌN — bước 12 của đặc tả sẽ KHÔNG typecheck.**
`shared-events.ts:148-152`:
```typescript
export interface GoalUpdatedEvent {
    type: "goal_updated";
    goal: Goal | null;
    state?: GoalModeState;
}
```
`tsconfig.base.json` bật `"strict": true`. Viết `expect(ev.state.enabled).toBe(false)` trong test là **TS18048 — 'state' is possibly 'undefined'**, và `check:ts` sẽ đỏ. Đặc tả bước 12 viết thẳng `state.enabled === false` — sai. Phải narrow.

**(d) `ToolExecutionEndEvent.isError` là BẮT BUỘC trong type mặt extension, và `goal` là nullable.**
`types.ts:880-882`: `isError: boolean;` — không phải `isError?: boolean`. Nên nhánh `tool_execution_end` **phải** giữ `isError: event.isError ?? false`; truyền thẳng `event.isError` sẽ lỗi khi biến thể session của nó là optional. Cùng lúc đó, `event.goal` trong `AgentSessionEvent` là `Goal | null` — nhánh `goal_updated` chỉ chuyển tiếp, không được deref.

---

## 1. CÁI GÌ THAY ĐỔI, QUAN SÁT ĐƯỢC

Một dòng tra cứu khai báo, kiểu kiểm bằng mapped type, thay chuỗi 19 nhánh `if/else` trong relay sự kiện của session: từ nay thêm một tên sự kiện vào tập khoá mà không viết nhánh tương ứng thì `bun run check:ts` đỏ ngay, và không một hành vi nào của phiên đổi.

---

## 2. BẢNG ĐIỂM SỬA

| path | symbol | TRƯỚC (nguyên văn từ file) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` **:350** | `RunnerEmitEvent` | `type RunnerEmitEvent = Exclude<` | `export type RunnerEmitEvent = Exclude<` — thêm đúng một từ |
| `packages/coding-agent/src/session/agent-session.ts` **:139-158** | khối `import type { … } from "../extensibility/extensions"` | khối hiện có 18 tên: `ExtensionCommandContext, ExtensionRunner, ExtensionUIContext, MessageEndEvent, MessageStartEvent, MessageUpdateEvent, PreparedExtension, SessionBeforeBranchResult, SessionBeforeSwitchResult, SessionBeforeTreeResult, SessionStopEventResult, ToolExecutionEndEvent, ToolExecutionStartEvent, ToolExecutionUpdateEvent, ToolInfo, TreePreparation, TurnEndEvent, TurnStartEvent` | thêm 9 tên: `AgentStartEvent, AutoCompactionStartEvent, AutoCompactionEndEvent, AutoRetryStartEvent, AutoRetryEndEvent, RetryFallbackAppliedEvent, RetryFallbackSucceededEvent, TtsrTriggeredEvent, TodoReminderEvent` |
| `packages/coding-agent/src/session/agent-session.ts` **ngay sau khối trên** | — | không có dòng này | `import type { GoalUpdatedEvent } from "../extensibility/shared-events";` — **dòng import RIÊNG, bắt buộc** (xem cạm bẫy #4) |
| `packages/coding-agent/src/session/agent-session.ts` **cấp module** | — | không có | `type RelayableEventKind = Extract<AgentSessionEvent["type"], …19 tên…>;` + `type SessionEventRelays = { [E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent \| undefined> };` |
| `packages/coding-agent/src/session/agent-session.ts` **:857-869** (cạnh `#extensionRunner`, `#turnIndex`) | — | không có | `#sessionEventRelay = { …19 nhánh… } satisfies SessionEventRelays;` — **private class field**, không phải biến cục bộ |
| `packages/coding-agent/src/session/agent-session.ts` **:4642-4787** | `#emitExtensionEvent` | 146 dòng `if`/`else if`, mở đầu bằng:<br>`async #emitExtensionEvent(event: AgentSessionEvent): Promise<void> {`<br>`	if (!this.#extensionRunner) return;`<br>`	if (event.type === "agent_start") {`<br>`		this.#turnIndex = 0;`<br>`		await this.#extensionRunner.emit({ type: "agent_start" });`<br>`		return;`<br>`	}`<br><br>`	if (!this.#extensionRunner.hasHandlers(event.type)) return;`<br>`	if (event.type === "agent_end") {` … `} else if (event.type === "turn_start") {` | 9 dòng:<br>`async #emitExtensionEvent(event: AgentSessionEvent): Promise<void> {`<br>`	const runner = this.#extensionRunner;`<br>`	if (!runner) return;`<br>`	const arm = this.#sessionEventRelay[event.type as RelayableEventKind] as`<br>`		\| ((event: AgentSessionEvent) => Promise<RunnerEmitEvent \| undefined>)`<br>`		\| undefined;`<br>`	if (!arm) return;`<br>`	if (event.type !== "agent_start" && !runner.hasHandlers(event.type)) return;`<br>`	const payload = await arm(event);`<br>`	if (payload) await runner.emit(payload);`<br>`}` |
| `packages/coding-agent/src/session/agent-session.ts` **:4662-4670** | nhánh `turn_end` | `		} else if (event.type === "turn_end") {`<br>`			const hookEvent: TurnEndEvent = {`<br>`				type: "turn_end",`<br>`				turnIndex: this.#turnIndex,`<br>`				message: event.message,`<br>`				toolResults: event.toolResults,`<br>`			};`<br>`			await this.#extensionRunner.emit(hookEvent);`<br>`			this.#turnIndex++;` | trong nhánh: `this.#turnIndex++;` **trước**, rồi `return { type: "turn_end", turnIndex: this.#turnIndex - 1, message: event.message, toolResults: event.toolResults } satisfies TurnEndEvent;` — trừ 1 là bắt buộc, xem cạm bẫy #1 |
| `packages/coding-agent/src/session/agent-session.ts` **:4651-4654** | nhánh `agent_end` | `		if (event.type === "agent_end") {`<br>`			// \`agent_end\` extension notification is emitted from the settled`<br>`			// agent_end maintenance path so \`session_stop\` control hooks are not`<br>`			// blocked by unrelated notification-only work.`<br>`		} else if (…` | `agent_end: async () => undefined,` — **giữ nguyên 3 dòng comment**, chuyển thành comment trên nhánh, thêm câu "đây là quyết định định tuyến, không phải nhánh còn thiếu" |
| `packages/coding-agent/src/session/agent-session.ts` **:4685-4691** | nhánh `message_end` | comment 7 dòng: `// \`message_end\` is a notification, not a context-rewrite hook. Detach its` … `// sanitized field-by-field without retaining nested live references.` | **chuyển nguyên văn 7 dòng** vào trong nhánh `message_end`, giữ `cloneMessageEndNotification(event.message)` |
| `packages/coding-agent/src/session/agent-session.ts` **:9669-9673** | comment `model_changed` | `		// Fan-out uses the synchronous \`#emit\`, matching \`thinking_level_changed\`:`<br>`		// \`model_changed\` has no extension-facing hook (\`#emitExtensionEvent\`<br>`		// never maps it), so routing it through \`#emitSessionEvent\` would only`<br>`		// add an extension-delivery await inside every model switch — including`<br>`		// retry-fallback on the error path.` | 5 dòng:<br>`		// Fan-out uses the synchronous \`#emit\`, matching \`thinking_level_changed\`:`<br>`		// routing it through \`#emitSessionEvent\` would add an extension-delivery await`<br>`		// inside every model switch — including retry-fallback on the error path.`<br>`		// \`model_changed\` is deliberately absent from \`RelayableEventKind\`; add it`<br>`		// there together with a real relay arm, never on its own.` |
| `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts` | file mới | không tồn tại | file test mới, 1 `it()` |

---

## 3. CÁC BƯỚC — mỗi bước có neo tôi vừa mở và đọc

### Bước 1 — export một từ
**Neo:** `packages/coding-agent/src/extensibility/extensions/runner.ts:350`
Đã đọc: `type RunnerEmitEvent = Exclude<` ngay dưới doc comment 3 dòng (348-349).
Sửa thành `export type RunnerEmitEvent = Exclude<`. Không đụng gì khác trong file. `src/extensibility/extensions/index.ts:15` có `export * from "./runner";` nên type tự động import được qua `../extensibility/extensions` — không sửa barrel.

### Bước 2 — 10 dòng import
**Neo:** `packages/coding-agent/src/session/agent-session.ts:139-158` (khối import đã đọc) và `packages/coding-agent/src/session/agent-session.ts` ngay sau dòng 158.
- Thêm 9 tên vào khối `import type { … } from "../extensibility/extensions"` (đóng ở 158). Cả 9 **đều** re-export qua barrel — đã kiểm: `AgentStartEvent` nằm trong `export type { … } from "../shared-events"` ở `types.ts:826-833`; 8 tên còn lại nằm trong block `types.ts:885-894`.
- Thêm **một dòng riêng** `import type { GoalUpdatedEvent } from "../extensibility/shared-events";`. Đã kiểm `GoalUpdatedEvent` **không** có trong bất kỳ block re-export nào của `types.ts` (chỉ xuất hiện ở dòng 106, thuộc khối `import type` chứ không phải `export type`), và `shared-events.ts` không được barrel nào `export *` tới.
- **Không** thêm `import type { AgentSessionEvent }` — nó đã có, là kiểu tham số của chính method.

### Bước 3 — hai kiểu cấp module
**Neo:** `packages/coding-agent/src/session/agent-session.ts` cấp module, đặt cạnh `type AgentSessionEventKind`-style type khác (xem `event-controller.ts:74` làm mẫu vị trí).

```typescript
type RelayableEventKind = Extract<
	AgentSessionEvent["type"],
	| "agent_start" | "agent_end" | "turn_start" | "turn_end"
	| "message_start" | "message_update" | "message_end"
	| "tool_execution_start" | "tool_execution_update" | "tool_execution_end"
	| "auto_compaction_start" | "auto_compaction_end"
	| "auto_retry_start" | "auto_retry_end"
	| "retry_fallback_applied" | "retry_fallback_succeeded"
	| "ttsr_triggered" | "todo_reminder" | "goal_updated"
>;

type SessionEventRelays = {
	[E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent | undefined>;
};
```

Doc comment phải **liệt kê 9 tên bị loại**: `tool_stream_update`, `model_changed`, `config_warnings_changed`, `advisor_cost_changed`, `advisor_yielded`, `todo_auto_clear`, `irc_message`, `notice`, `thinking_level_changed`. Đã đếm: 28 − 19 = 9.

**Bắt buộc là MAPPED, không phải `Record`.** Đã chạy thử bằng `tsgo`: với `Record<RelayableEventKind, (event: AgentSessionEvent) => …>`, 5 lỗi thật —
`TS2339: Property 'message' does not exist on type 'AgentSessionEvent'`, tương tự `toolResults`, `toolCallId`, `toolName`, `args`. Còn dạng mapped thì 0 lỗi, arm tự narrow.

### Bước 4 — private class field
**Neo:** `packages/coding-agent/src/session/agent-session.ts:857` (`#extensionRunner: ExtensionRunner | undefined = undefined;`) và `:869` (`#turnIndex = 0;`) — hai dòng này tôi đã mở và đọc.

Thêm `#sessionEventRelay = { …19 nhánh… } satisfies SessionEventRelays;` làm **private class field**, không phải biến cục bộ trong method. Lý do đo được: `message_update` đi qua `#emitSessionEvent` mỗi delta và được đẩy vào hàng đợi không chặn tại `agent-session.ts:2934-2936`; dựng lại 19 closure mỗi delta là chi phí per-token thật. Field initializer chạy lúc khởi tạo; các nhánh chỉ đọc `this.#turnIndex` khi **được gọi**, nên khai báo trước hay sau `:869` đều được — nhưng đặt ngay sau `#turnIndex = 0;` cho dễ đọc.

### Bước 5 — thân method mới
**Neo:** `packages/coding-agent/src/session/agent-session.ts:4642-4787` — đã đọc trọn 146 dòng, đếm đúng 19 phép `event.type ===` (4644, 4651, 4655, 4662, 4671, 4677, 4684, 4697, 4706, 4715, 4724, 4730, 4740, 4749, 4757, 4765, 4771, 4773, 4780), vùng này có 0 `case` và 0 `satisfies`.

```typescript
async #emitExtensionEvent(event: AgentSessionEvent): Promise<void> {
	const runner = this.#extensionRunner;
	if (!runner) return;
	const arm = this.#sessionEventRelay[event.type as RelayableEventKind] as
		| ((event: AgentSessionEvent) => Promise<RunnerEmitEvent | undefined>)
		| undefined;
	if (!arm) return;
	// `agent_start` stays ungated: its arm resets the turn counter, which also
	// feeds `turn_id` on the session_stop continuation path and must not depend
	// on any extension being subscribed. Every other relayable kind keeps the
	// pre-existing zero-handler fast path.
	if (event.type !== "agent_start" && !runner.hasHandlers(event.type)) return;
	const payload = await arm(event);
	if (payload) await runner.emit(payload);
}
```

**Hai cast, không phải một.** Đã chạy thử bằng `tsgo` trên hình dạng thật: bản một-cast **ĐỎ** —
`TS2345: Argument of type 'AgentSessionEvent' is not assignable to parameter of type 'never'. The intersection '{…agent_start} & {…turn_end} & {…turn_start}' was reduced to 'never' because property 'type' has conflicting types`. Bản hai-cast sạch. Mẫu có sẵn: `event-controller.ts:851`.

### Bước 6 — 19 nhánh, chép nguyên văn
**Neo:** từng nhánh ở 4644-4786, đã đọc hết. Giữ nguyên **tên trường và thứ tự trường** của từng payload. Ba điểm bắt buộc:

- **`agent_start`** (4644-4648): `this.#turnIndex = 0;` rồi trả `{ type: "agent_start" }`.
- **`agent_end`** (4651-4654): `async () => undefined,` — chuyển **nguyên văn 3 dòng comment** (4652-4654) sang trên nhánh, thêm câu "routing decision, not a missing arm". Tiền lệ no-op: `event-controller.ts:287` và `:356`.
- **`turn_end`** (4662-4670): `this.#turnIndex++` **trước** `return`, và payload dùng `turnIndex: this.#turnIndex - 1`.
- **`message_end`** (4684-4696): chuyển **nguyên văn 7 dòng comment** (4685-4691) vào nhánh, giữ `cloneMessageEndNotification(event.message)`.
- **`tool_execution_end`** (4715-4723): giữ `isError: event.isError ?? false`.

### Bước 7 — sửa comment `model_changed`
**Neo:** `packages/coding-agent/src/session/agent-session.ts:9669-9673` (đã đọc nguyên văn 5 dòng), ngay trên `if (isChanging) {` ở **:9674**.

Thay bằng 5 dòng mới ở mục 2. **Hai dòng đầu là lý do kỹ thuật mang trọng, không được xoá** — chỉ xoá mệnh đề khẳng định "không có hook".

### Bước 8 — file test
**Neo:** `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts` (file mới). Khung dựng session chép từ `packages/coding-agent/test/agent-session-aside-delivery.test.ts:887-932` — đã đọc, và vòng đời `beforeEach`/`afterEach` ở **:36-45** (`TempDir.createSync("@pi-aside-delivery-")` → `AuthStorage.create(path.join(tempDir.path(), "auth.db"))` → `authStorage.keys.setRuntime("openai", "openai-test-key")`; teardown `await session?.dispose(); authStorage.close(); tempDir.removeSync();`).

Nội dung:
1. `const received: GoalUpdatedEvent[] = [];`
2. `loadExtensionFromFactory(pi => { pi.on("goal_updated", async e => { received.push(e); }); }, tempDir.path(), new EventBus(), runtime, "relay-exhaustive")` — `pi.on("goal_updated", …)` là overload có thật, khai báo ở `extensions/types.ts:1356`.
3. `new ExtensionRunner([extension], runtime, tempDir.path(), sessionManager, modelRegistry)`.
4. `session = new AgentSession({ agent, sessionManager, settings, modelRegistry, toolRegistry: new Map(), extensionRunner })`.
5. `session.setGoalModeState({ enabled: true, mode: "active", goal: { id: "g-relay", objective: "Prove the relay table is live", status: "active", tokensUsed: 0, timeUsedSeconds: 0, createdAt: 0, updatedAt: 0 } })` — `setGoalModeState` ở `agent-session.ts:6296-6298`, thân chỉ có `this.#goalModeState = state;`, **không emit**.
6. `await session.goalRuntime.dropGoal();` — getter ở `agent-session.ts:6336`; `dropGoal` ở `goals/runtime.ts:456-472`.
7. Khẳng định: `expect(received).toHaveLength(1)`; `expect(received[0]?.goal?.id).toBe("g-relay")`; `expect(received[0]?.goal?.status).toBe("dropped")`; `expect(received[0]?.state?.enabled).toBe(false)`.

**Dấu `?.` ở khẳng định 7 là bắt buộc, không phải phong cách** — `GoalUpdatedEvent.state` là `state?: GoalModeState` và `goal` là `Goal | null` (`shared-events.ts:148-152`), repo bật `"strict": true`. Không có `?.` thì `check:ts` đỏ TS18048 và bạn sẽ tưởng mình vỡ kiểu bảng.

Không `mock.module()`, không đột biến global `Bun.*`.

### Bước 9 — commit
- **Commit 1** = bước 1-8. Xanh độc lập.
- **Commit 2** chỉ khi sản phẩm trả lời câu hỏi mở về `model_changed` là "có, ship hook": thêm `"model_changed"` vào `RelayableEventKind` **và** một nhánh thật, **cùng một commit**. Không bao giờ thêm tên vào union với nhánh rỗng.
- Không gộp việc gom các call site `extensionRunner.emit(...)` rải rác (`agent-session.ts:8962, 9000, 9055, 10252, 10375, 10629, 10691, 10827, 11006, 11178`) — refactor khác, mức rủi ro khác.

---

## 4. HỢP ĐỒNG TEST

**File:** `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts`

**Các case:** đúng **một** `it()`.

```
extension handler đã đăng ký goal_updated nhận được đúng MỘT event,
mang goal.id = "g-relay", goal.status = "dropped", state.enabled = false
```

**Đường đi của payload** (không fixture nào so với chính nó): `GoalRuntime.dropGoal` tự dựng `dropped` và tự đặt `state.enabled: false` (`goals/runtime.ts:461, 467`) → cầu nối `GoalRuntimeHost.emit` (`agent-session.ts:1948-1952`) → `#emitSessionEvent` → `#emitExtensionEvent` → **bảng relay** → `ExtensionRunner.emit` → handler. Relay chỉ di chuyển payload, khẳng định gì.

**Nếu hồi quy, người dùng thấy gì:** mảng `received` rỗng — `pi.on("goal_updated", …)` của tác giả plugin âm thầm không bao giờ bắn. Đây là triệu chứng thật: extension viết đúng, load được, không lỗi, chỉ là không có gì tới. Xảy ra khi tra bảng trượt (sai cast, khoá đảo), khi nhánh trả `undefined` thay vì payload, hoặc khi dispatcher ngừng định tuyến qua `#emitExtensionEvent`. Nếu chỉ payload sai (thiếu trường, sai tên), `toHaveLength(1)` vẫn xanh và các khẳng định về `goal.id` / `goal.status` / `state.enabled` đỏ.

**Cái test này CỐ Ý KHÔNG bảo vệ:** tính đầy đủ của bảng. Một dòng runtime một sự kiện không thể đỏ khi ai đó thêm một khoá vào bảng, và cũng không thể đỏ khi một tên bị bỏ khỏi `RelayableEventKind`. Hợp đồng đó do `satisfies SessionEventRelays` + `check:ts` gánh, **không** do test này.

---

## 5. CỔNG

```bash
# cổng chính — chạy được ngay, KHÔNG cần addon native
bun run check:ts

# cổng runtime — addon native đã có sẵn trong cây, chạy được ngay
cd packages/coding-agent && bun test test/extension-event-relay-exhaustive.test.ts
```

**Cổng này có ĐỎ ĐƯỢC không, và bằng cách nào — trả lời cụ thể:**

**`bun run check:ts`: CÓ, và tôi đã chứng minh bằng `tsgo` chứ không phải suy đoán.** Tôi đã dựng một file thử với đúng hình dạng type của bảng và chạy `tsgo --noEmit` (file đã xoá sau khi đo). Kết quả:

| thay đổi | lỗi thật |
| --- | --- |
| thêm `"goal_updated"` vào key union, không có nhánh | `TS2741: Property 'goal_updated' is missing … but required in type` |
| xoá nhánh `turn_end` | `TS2741: Property 'turn_end' is missing … but required in type` |
| dùng `Record<RelayableEventKind, (event: AgentSessionEvent) => …>` (phác thảo chữ của plan) | 5 lỗi `TS2339` — `message`, `toolResults`, `toolCallId`, `toolName`, `args` không tồn tại trên `AgentSessionEvent` |
| dispatch chỉ cast khoá, gọi trực tiếp arm | `TS2345: Argument of type 'AgentSessionEvent' is not assignable to parameter of type 'never'` (giao 3 tham số bị thu về `never` vì `type` mâu thuẫn) |

Cổng **đang sống**: tôi đã chạy `bun run check:ts` tại HEAD `65cc6c1` → **exit 0**, `@oh-my-pi/pi-coding-agent:check:types | Done in 7.20s`. Một cổng xanh ở trạng thái sạch là bằng chứng nó sống; bốn lỗi ở trên là bằng chứng nó đỏ được.

**`bun test`: CÓ, và nó đỎ ĐƯỢC — nhưng đặc tả đang hedge quá mức.** Addon native đã có: `packages/natives/native/pi_natives.darwin-arm64.node`. Tôi đã chạy thật `cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts` → `1 pass, 0 fail, 2 expect() calls`. **Không cần `brew install ninja`, không cần `bun --cwd=packages/natives run build`** — đặc tả nói cần, cây hiện tại thì không. Cổng này đỏ khi khẳng định fail; nó **không** đỏ trong kịch bản "thiếu một khoá trong bảng" (xem mục 4).

**Trạng thái đỏ thứ tư, không nằm trong ba cái trên:** `check:ts` chạy `check:tools` (`oxlint .` + `oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' …`) **trước** `check:types`. Bảng 19 nhánh viết tay sẽ lệch xuống dòng ngay, `oxfmt --check` đỏ trước, và bạn sẽ không bao giờ tới được lỗi kiểu. File test mới cũng nằm trong glob `packages/*/{test,…}/**/*.ts`. **Sau khi viết xong: `bun run fmt:ts` một lần, rồi mới `bun run check:ts`.**

**Không dùng `tsc` / `npx tsc`** — AGENTS.md cấm. Cổng kiểu là `check:ts`, nó gọi `tsgo -p tsconfig.json --noEmit` (`packages/coding-agent/package.json:523`).

---

## 6. CẠM BẪY RIÊNG CỦA WORK ITEM NÀY

Xếp theo mức khả năng làm sai.

**1. `turn_end`: tăng trước rồi quên trừ 1.** Đây là bẫy âm thầm nhất. Code cũ đọc `turnIndex` **trước** rồi mới `++`; bảng mới `++` trước rồi đọc. Nếu bạn viết `turnIndex: this.#turnIndex` sau khi `++`, **mọi extension nhận `turnIndex` lệch đúng 1 trên mọi lượt** và không có gì đỏ — payload vẫn shape đúng, kiểu vẫn đúng, test `goal_updated` vẫn xanh. Bắt buộc `this.#turnIndex - 1`.

**2. Bảng đặt trong thân method.** `message_update` chạy mỗi delta (đi qua `agent-session.ts:2934-2936`, đẩy vào `#queueExtensionEvent` không chặn). Object literal 19 closure cấp phát lại mỗi delta là chi phí per-token thật, và không test nào bắt được. Bắt buộc là **private class field**.

**3. Dùng `Record` trần thay vì mapped type.** Sai theo hai lần cùng lúc: đồng bộ (hai nhánh có mutate `#turnIndex` sẽ không còn chỗ để nằm, khiến `turnIndex` đóng băng ở 0 với mọi extension suốt phiên) và tham số không narrow (5 lỗi `TS2339` — đã đo). Đây chính là kết quả mà refactor sinh ra để loại bỏ. Bước 3.

**4. Thêm `GoalUpdatedEvent` vào khối import từ `../extensibility/extensions`.** Sẽ không resolve. Nó **không** nằm trong bất kỳ block `export type { … } from "../shared-events"` nào của `extensions/types.ts` (đã kiểm: chỉ xuất hiện ở dòng 106, thuộc khối `import type`), và không barrel nào `export *` tới `shared-events.ts`. 9 tên kia thì lấy được từ barrel. Phải là một dòng import riêng.

**5. Cast một lần thay vì hai.** `table[event.type as RelayableEventKind]` có kiểu là **union của 19 kiểu hàm**; gọi nó đòi hỏi đối số gán được cho **giao** các tham số, tức `never` — đã đo `TS2345`. Cast thêm giá trị về một chữ ký rộng. Mẫu: `event-controller.ts:851`.

**6. Xoá cả comment `model_changed`.** Chỉ mệnh đề "không có hook" là lỗi thời. Hai dòng đầu nói vì sao dùng `#emit` thay vì `#emitSessionEvent` — lý do await-trong-đường-nóng vẫn đúng, xoá đi là vứt mất lý do.

**7. `state.enabled` trong test.** `GoalUpdatedEvent.state` là **optional**, `goal` là **nullable**, repo bật `strict`. `expect(ev.state.enabled)` là `TS18048`. Phải `ev.state?.enabled` / `ev.goal?.id`.

---

## 7. GHI CHÚ MÂU THUẪN NỘI TẠI (không tự sửa)

`one_line` của đặc tả kết luận "một loại sự kiện mới **không thể** được thêm vào phiên mà không hoặc có một nhánh chuyển tiếp tương ứng, hoặc làm kiểm tra kiểu thất bại". Mệnh đề đó **nói quá**: nếu một tên bị bỏ khỏi **cả bảng lẫn union**, **không gì đỏ ở đâu cả** — vì một sự kiện phiên không ai relay là một quyết định sản phẩm hợp lệ, không phải khiếm khuyết. Chiều duy nhất được bảo vệ là **chiều ngược lại**: thêm một tên vào union mà không có nhánh thì đỏ (`TS2741`, đã đo). Cần chốt có sửa lại `one_line` không.

Hai câu hỏi còn treo, **không chặn commit 1**:

- **SẢN PHẨM — `model_changed` có hook không?** Mặc định của đặc tả: KHÔNG. Nếu có, đó là commit 2 kèm nhánh thật.
- **SẢN PHẨM/REVIEW — lỗi tiềm ẫn ở `#turnIndex`.** `this.#turnIndex++` (nay ở **:4670**) nằm **SAU** chốt `if (!this.#extensionRunner.hasHandlers(event.type)) return;` (**:4650**). Khi không extension nào đăng ký handler `turn_end`, `#turnIndex` không bao giờ tăng, nên `turnIndex` đưa cho handler suốt phiên là 0, và `turn_id` ở **:4601** (`Math.max(0, this.#turnIndex - 1)`) luôn là 0. **Đặc tả GIỮ NGUYÊN đúng hành vi này** để thành commit cơ khọc zero-diff. Sửa là commit riêng, có thay đổi hành vi, kèm test riêng. Có đưa vào M2 không?
