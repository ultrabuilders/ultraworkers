## WI-3. Bảng relay sự kiện đầy đủ, được trình biên dịch kiểm tra

**Thay đổi gì:** Thay chuỗi `if/else` 19 nhánh chuyển tiếp sự kiện phiên sang cho extension bằng một bảng tra cứu được khai báo, tập khoá của bảng là một tập con 19 phần tử có tên, để một loại sự kiện mới không thể được thêm vào phiên mà không hoặc có một nhánh chuyển tiếp tương ứng, hoặc làm kiểm tra kiểu thất bại.

**Wave:** 3. WI-3 là 2 commit, tự ship một mình; độc lập với WI-1 và WI-2, có thể chạy song song. Mối nối duy nhất: file dùng chung `session/agent-session.ts` với M2-OQ6 (câu hỏi 46-overload → interface `Events` khai báo ở cấp module, phải quyết trước khi đụng vào cả hai), và từ khoá `export` một từ trên `extensions/runner.ts`.

**Effort:** S — vài giờ. Một từ trong `runner.ts`, một bảng 19 nhánh, một dispatcher bốn dòng, một lần viết lại comment năm dòng, một file test. Xếp hạng "S-M" của plan là do quyết định sản phẩm về `model_changed` làm thổi phồng; nửa cơ khọc thực sự là S và trình biên dịch lo phần kiểm tra.

**Người dùng thấy:** trực tiếp thì không có gì — không thay đổi hành vi. Hệ quả người dùng thấy là ở phía tác giả plugin: tập hợp sự kiện mà extension có thể đăng ký nay được nêu ở một chỗ duy nhất, và một sự kiện phiên không có hook extension nào (ví dụ `model_changed`) không còn bị mô tả trong văn xuôi như thể nó có. Nói cách khác: nội bộ, người dùng cuối không thấy — chỉ tác giả plugin hưởng được.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | Thêm từ khoá `export` vào `type RunnerEmitEvent = Exclude<ExtensionEvent, ...>`. File đã dùng type này ở 361, 371, 1364, 1372, 1464; không có thay đổi nào khác. Barrel `src/extensibility/extensions/index.ts` đã có `export * from "./runner"`, nên type trở nên import được từ `../extensibility/extensions` mà không cần sửa barrel. | **Có** (`verified: true`). Ghi chú: plan ghi dòng 344 — khai báo thật ở 347 (comment tài liệu chiếm 343-346). `agent-session.ts` đã import các type sự kiện anh em từ `../extensibility/extensions` (khối ở 139-156), nên không sinh đường dẫn import mới. |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | Thêm `type RelayableEventKind` (19 tên) ở cấp module và `type SessionEventRelays` (mapped type trên kiểu đó) ở cấp module, rồi thêm private class field `#sessionEventRelay` giữ object literal 19 nhánh đóng bằng `} satisfies SessionEventRelays;`. Thay toàn bộ thân `#emitExtensionEvent` (hiện là 4602-4747) bằng một dispatch bốn dòng tra nhánh rồi `await` nó. | **Có** (`verified: true`). Ghi chú: plan ghi 4572-4770. Method thật là `async #emitExtensionEvent(event: AgentSessionEvent): Promise<void>` ở 4602-4747; 19 phép so sánh `event.type ===` nằm ở 4604, 4611, 4615, 4622, 4631, 4637, 4644, 4657, 4666, 4675, 4684, 4690, 4700, 4709, 4717, 4725, 4731, 4733, 4740 (đếm đủ 19 bằng grep). Vùng này có 0 `case` và 0 `satisfies` (đã kiểm chứng). |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | Viết lại comment văn xuôi 5 dòng ngay trên `if (isChanging) { this.#emit({ type: "model_changed" }); }` trong `setModel`. Giữ lại lý do kỹ thuật (`#emit` đồng bộ tránh việc thêm một await giao tới extension vào mọi lần đổi model, kể cả retry-fallback trên nhánh lỗi). Chỉ xoá mệnh đề khẳng định sự thật hiện thực rằng relay không map `model_changed`, và thay bằng một con trỏ tới `RelayableEventKind`. Văn bản hiện tại nằm nguyên văn ở phần các bước. | **Có** (`verified: true`). Ghi chú: plan ghi 9442-9443. Comment thật là 9523-9527. KHÔNG xoá cả comment — lý do await-trong-đường-nóng vẫn đúng và còn giá trị; chỉ khẳng định "no extension-facing hook" mới lỗi thời khi relay thành bảng. |
| `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts` | tạo | File test mới. Một dòng runtime: extension handler đã đăng ký `goal_updated` nhận payload của goal bị drop, đi hết đường qua bảng relay. Chép khung dựng từ `test/agent-session-aside-delivery.test.ts:890-935` (TempDir + AuthStorage + ModelRegistry + createMockModel + SessionManager.inMemory + ExtensionRuntime + loadExtensionFromFactory + new ExtensionRunner + new AgentSession với `extensionRunner` trong config) và chạy nó bằng `session.setGoalModeState(...)` rồi `await session.goalRuntime.dropGoal()`. | **Có** (`verified: true`). Ghi chú: `GoalModeState` = `{ enabled: boolean; mode: "active" \| "exiting"; reason?: "completed"; goal: Goal }` tại `src/goals/state.ts:4-9`. `setGoalModeState` là setter thuần tại `src/session/agent-session.ts:6159` và KHÔNG emit; `dropGoal()` (`src/goals/runtime.ts:456`) mới là thứ emit `goal_updated` qua cầu nối `GoalRuntimeHost.emit` tại `src/session/agent-session.ts:1916-1920`. Tới được relay mà không cần stream model và không cần chạy tool. |

> Lưu ý về độ chắc của neo: cả bốn mục trên đều mang `verified: true`, tức đã đối chiếu với source thật ở HEAD `808b365`. Nếu cây thư mục dịch chuyển trước khi bắt tay vào, phải kiểm chứng lại bốn neo trong `agent-session.ts` (4602, 4747, 9523, 837) trước khi sửa.

### Các bước

1. **Neo `packages/coding-agent/src/extensibility/extensions/runner.ts:347`** — Đổi `type RunnerEmitEvent = Exclude<` thành `export type RunnerEmitEvent = Exclude<`. Một từ. Không sửa gì khác trong file này.

2. **Neo `packages/coding-agent/src/session/agent-session.ts` (cấp module, cạnh các module-scope type khác)** — Thêm kiểu khoá. Nó PHẢI là `Extract<AgentSessionEvent["type"], ...>` trên đúng 19 tên sau và KHÔNG phải `AgentSessionEvent["type"]` trần: `agent_start`, `agent_end`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `auto_compaction_start`, `auto_compaction_end`, `auto_retry_start`, `auto_retry_end`, `retry_fallback_applied`, `retry_fallback_succeeded`, `ttsr_triggered`, `todo_reminder`, `goal_updated`. Thêm doc comment nói rõ tập con này là cố ý, và việc thêm một tên mà không có nhánh chính là lỗi biên dịch mà toàn bộ work item này sinh ra để bắt.

3. **Neo `packages/coding-agent/src/session/agent-session.ts` (ngay sau `RelayableEventKind`)** — Thêm kiểu MAPPED, không phải `Record` trần. `type SessionEventRelays = { [E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent | undefined> };`. Đây là nửa mà plan cảnh báo không được bỏ qua, và lý do là cơ học chứ không phải thẩm mỹ: chỉ dạng mapped mới contextually định kiểu tham số `event` của từng nhánh theo biến thể của chính nhánh đó, nhờ đó `event.message` / `event.toolCallId` typecheck được bên trong nhánh. Dạng `Record<RelayableEventKind, (event: AgentSessionEvent) => ...>` sẽ buộc phải cast ở cả 19 nhánh.

4. **Neo `packages/coding-agent/src/session/agent-session.ts` (khu vực class field, cạnh các private field khác quanh dòng 837-849)** — Thêm `#sessionEventRelay = { ...19 nhánh... } satisfies SessionEventRelays;` như một private class field — KHÔNG phải biến cục bộ bên trong `#emitExtensionEvent`. `message_update` bắn ra mỗi delta được stream; dựng lại object literal 19 closure trên mỗi sự kiện là một chi phí per-token thật sự. Field initializer chạy lúc khởi tạo; các nhánh chỉ đọc `this.#turnIndex` khi được gọi, nên thứ tự khai báo so với `#turnIndex` (dòng 849) không phải ràng buộc.

5. **Neo `packages/coding-agent/src/session/agent-session.ts:4602-4747` (`#emitExtensionEvent`)** — Chuyển toàn bộ thân 19 nhánh vào bảng, nguyên văn, giữ nguyên hình dạng local có annotation của từng nhánh (`const hookEvent: TurnStartEvent = { ... }; return hookEvent;`). Phần import: tám type `TurnStartEvent`, `TurnEndEvent`, `MessageStartEvent`, `MessageUpdateEvent`, `MessageEndEvent`, `ToolExecutionStartEvent`, `ToolExecutionUpdateEvent`, `ToolExecutionEndEvent` đã nằm trong khối 139-156. `code_shape` còn dùng MƯỚI type nữa mà file hiện chưa import: `AgentStartEvent`, `AutoCompactionStartEvent`, `AutoCompactionEndEvent`, `AutoRetryStartEvent`, `AutoRetryEndEvent`, `RetryFallbackAppliedEvent`, `RetryFallbackSucceededEvent`, `TtsrTriggeredEvent`, `TodoReminderEvent`, `GoalUpdatedEvent` — cộng `RunnerEmitEvent` từ bước 1. Chín `GoalUpdatedEvent` KHÔNG lấy được từ `../extensibility/extensions`: nó chỉ được `extensions/types.ts` import vào union `ExtensionEvent` (dòng 1147) chứ không re-export, định nghĩa thật ở `src/extensibility/shared-events.ts:147`. Phải thêm một dòng import riêng ngay cạnh khối 139-156: `import type { GoalUpdatedEvent } from "../extensibility/shared-events";`. Không thêm `import type { AgentSessionEvent }` — nó đã có, là kiểu tham số của chính method.

6. **Neo `packages/coding-agent/src/session/agent-session.ts` — nhánh `agent_start`** — Nhánh `agent_start` giữ phần reset bộ đếm lượt và trả về payload: `agent_start: async () => { this.#turnIndex = 0; const extensionEvent: AgentStartEvent = { type: "agent_start" }; return extensionEvent; },`. Thêm `AgentStartEvent` vào khối import 139-156 nếu dùng annotation; bỏ local annotation và trả thẳng object literal cũng typecheck dưới mapped type và ít code hơn.

7. **Neo `packages/coding-agent/src/session/agent-session.ts` — nhánh `agent_end`** — `agent_end: async () => undefined,` kèm comment nêu chỗ emit thật nằm ở đâu: `#emitAgentEndNotification` (agent-session.ts:4538-4544), thứ emit `{ type: "agent_end", messages, willContinue }` từ đường bảo trì đã lắng xuống để các control hook `session_stop` không bị chặn. Đây là một quyết định định tuyến có tài liệu, không phải một tính năng còn thiếu — hãy nói rõ điều đó trong comment, vì một nhánh no-op không giải thích đúng là đúng cái mùi mà WI-3 sinh ra để dẹp. Tiền lệ no-op trong TUI: `event-controller.ts:287` (`turn_start: async () => {}`) và `:356` (`goal_updated: async () => {}`).

8. **Neo `packages/coding-agent/src/session/agent-session.ts` — nhánh `turn_end`** — Chuyển `this.#turnIndex++` VÀO trong nhánh, ngay trước `return`. Hiện nó nằm sau `await emit(...)` ở dòng 4630; bảng trả về payload và dispatcher phát, nên phép tăng buộc phải nằm trước lúc emit. Điều này tương đương về mặt quan sát được: `#turnIndex` chỉ được đọc bởi các nhánh `turn_start`/`turn_end` (4618, 4625) và bởi `turn_id: Math.max(0, this.#turnIndex - 1)` ở 4561, tất cả đều chạy sau hẳn trong vòng đời lượt, không bao giờ tái-đệ quy từ bên trong một extension handler `turn_end` (handler nhận `ExtensionContext` và không với tới được nội bộ session). Nêu lý do này trong PR body — nếu không, người review sẽ đọc nó thành một thứ tự sắp xếp nhầm.

9. **Neo `packages/coding-agent/src/session/agent-session.ts` — nhánh `message_end`** — Giữ clone payload: `const extensionEvent: MessageEndEvent = { type: "message_end", message: cloneMessageEndNotification(event.message) };`. Helper là một hàm module-scope trong chính file này ở 612-630; comment 5 dòng giải thích VÌ SAO payload bị tách ra (một observer bất đồng bộ sửa event sau một `await` không được phép viết lại request kế tiếp tới provider) phải chuyển vào nhánh, không được xoá.

10. **Neo `packages/coding-agent/src/session/agent-session.ts:4602` (thân method mới)** — Thay toàn bộ chuỗi bằng dispatch sau, giữ nguyên thứ tự của hai cổng chặn sẵn có:

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

    Hai cast, không phải một: cast khoá (`as RelayableEventKind`) thu hẹp union 28 phần tử xuống 19 mà bảng phủ, và cast giá trị gộp union 19 kiểu hàm thành một chữ ký gọi được. Cast giá trị đúng là tiền lệ mà plan đã trích cho TUI rồi không mang sang — `event-controller.ts:851` làm `const run = this.#handlers[event.type] as (e: AgentSessionEvent) => Promise<void>;`.

11. **Neo `packages/coding-agent/src/session/agent-session.ts:9523-9527`** — Thay comment 5 dòng. Văn bản hiện tại, nguyên văn:

    ```typescript
    // Fan-out uses the synchronous `#emit`, matching `thinking_level_changed`:
    // `model_changed` has no extension-facing hook (`#emitExtensionEvent`
    // never maps it), so routing it through `#emitSessionEvent` would only
    // add an extension-delivery await inside every model switch — including
    // retry-fallback on the error path.
    ```

    Thay bằng:

    ```typescript
    // Fan-out uses the synchronous `#emit`, matching `thinking_level_changed`:
    // routing it through `#emitSessionEvent` would add an extension-delivery await
    // inside every model switch — including retry-fallback on the error path.
    // `model_changed` is deliberately absent from `RelayableEventKind`; add it
    // there together with a real relay arm, never on its own.
    ```

    Hai dòng đầu là lý do kỹ thuật mang trọng — không được xoá.

12. **Neo `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts` (file mới)** — Viết một dòng runtime. Đăng ký `pi.on("goal_updated", ...)` trong một extension tạo bằng `loadExtensionFromFactory`, đẩy event nhận được vào một mảng, dựng runner và session theo khung ở `test/agent-session-aside-delivery.test.ts:890-935`, rồi `session.setGoalModeState({ enabled: true, mode: "active", goal: { id: "g-relay", objective: "Prove the relay table is live", status: "active", tokensUsed: 0, timeUsedSeconds: 0, createdAt: 0, updatedAt: 0 } })`, sau đó `await session.goalRuntime.dropGoal()`. Khẳng định handler nhận đúng một event có `goal.id === "g-relay"`, `goal.status === "dropped"` và `state.enabled === false`. Dọn dẹp bằng `await session.dispose()`, `authStorage.close()`, `tempDir.removeSync()` trong `afterEach`, khớp với `agent-session-aside-delivery.test.ts:29-47`. Không `mock.module()`, không đột biến global `Bun.*`.

13. **Neo `packages/coding-agent/package.json` (không sửa)** — KHÔNG thêm test kiểu bằng `@ts-expect-error`, và KHÔNG export bảng ra để test. AGENTS.md cấm test placeholder/tautological, và một case object cố tình thiếu dưới `@ts-expect-error` không phát hiện được thất bại mà work item này sinh ra để ngăn: lỗi thiếu khoá nằm trong một literal độc lập sai hoài bất kể bảng production làm gì, và `@ts-expect-error` chỉ nổ khi lỗi BIẾN MẤT. Tính đầy đủ hoàn toàn do `satisfies` trên bảng production cộng `bun run check:ts` gánh.

14. **Neo `commit`** — Commit 1 = bước 1-12 gộp thành một commit (xanh độc lập). Commit 2 CHỈ khi sản phẩm trả lời câu hỏi mở về `model_changed` là "có, ship một hook": thêm `model_changed` vào `RelayableEventKind` và một nhánh thật trong CÙNG commit đó. Không bao giờ thêm tên vào union với một nhánh rỗng — đó đúng là lỗi mà WI-3 sinh ra để tiêu diệt. Không gộp kèm việc gom các call site `extensionRunner.emit(...)` rải rác ở nơi khác trong file; đó là refactor khác, mức rủi ro khác.

### Hình dạng code

```typescript
// ---- module scope, near the top of agent-session.ts ----

/**
 * Session event kinds the extension relay forwards.
 *
 * Deliberately a subset of `AgentSessionEvent["type"]`: `model_changed`,
 * `config_warnings_changed`, `advisor_cost_changed`, `advisor_yielded`,
 * `todo_auto_clear`, `irc_message`, `notice`, `thinking_level_changed` and
 * `tool_stream_update` are delivered to in-process subscribers only and have no
 * extension-facing hook. Adding a name here without adding an arm below is a
 * compile error, which is the entire point of this table.
 */
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

/**
 * MAPPED type, not `Record<...>`. The `Extract` in the value position is what
 * gives each arm its own event variant, so arm bodies narrow without casts.
 * The return is a Promise because arms also carry the relay's non-emit side
 * effects (the `agent_start` counter reset, the `turn_end` increment); a pure
 * synchronous `event -> RunnerEmitEvent` signature would silently drop them.
 */
type SessionEventRelays = {
	[E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent | undefined>;
};

// ---- class field, next to #extensionRunner (line 837) / #turnIndex (line 849) ----

#sessionEventRelay = {
	agent_start: async () => {
		// Ungated in the dispatcher: this reset also feeds `turn_id` at the
		// session_stop continuation path, which must not depend on any
		// extension being subscribed.
		this.#turnIndex = 0;
		return { type: "agent_start" } satisfies AgentStartEvent;
	},
	// No payload from the session path. The extension `agent_end` notification is
	// emitted from `#emitAgentEndNotification` (this file) so `session_stop` control
	// hooks are not blocked by unrelated notification-only work. Routing decision,
	// not a missing arm.
	agent_end: async () => undefined,
	turn_start: async () => {
		return { type: "turn_start", turnIndex: this.#turnIndex, timestamp: Date.now() } satisfies TurnStartEvent;
	},
	turn_end: async event => {
		// Increment moved ahead of the emit (the table returns, the dispatcher emits).
		// Safe: #turnIndex is read only by the arms above and by `turn_id` at the
		// session_stop path, all strictly later in the turn lifecycle.
		this.#turnIndex++;
		return { type: "turn_end", turnIndex: this.#turnIndex - 1, message: event.message, toolResults: event.toolResults } satisfies TurnEndEvent;
	},
	message_start: async event => ({ type: "message_start", message: event.message }) satisfies MessageStartEvent,
	message_update: async event =>
		({ type: "message_update", message: event.message, assistantMessageEvent: event.assistantMessageEvent }) satisfies
			MessageUpdateEvent,
	message_end: async event => {
		// Detach the payload from agent-owned history so an async observer that mutates
		// the event after an `await` cannot race mid-run maintenance and enlarge (or
		// otherwise rewrite) the next provider request after its threshold check.
		return { type: "message_end", message: cloneMessageEndNotification(event.message) } satisfies MessageEndEvent;
	},
	tool_execution_start: async event =>
		({
			type: "tool_execution_start",
			toolCallId: event.toolCallId,
			toolName: event.toolName,
			args: event.args,
			intent: event.intent,
		}) satisfies ToolExecutionStartEvent,
	tool_execution_update: async event =>
		({
			type: "tool_execution_update",
			toolCallId: event.toolCallId,
			toolName: event.toolName,
			args: event.args,
			partialResult: event.partialResult,
		}) satisfies ToolExecutionUpdateEvent,
	tool_execution_end: async event =>
		({
			type: "tool_execution_end",
			toolCallId: event.toolCallId,
			toolName: event.toolName,
			result: event.result,
			isError: event.isError ?? false,
		}) satisfies ToolExecutionEndEvent,
	auto_compaction_start: async event =>
		({ type: "auto_compaction_start", reason: event.reason, action: event.action }) satisfies AutoCompactionStartEvent,
	auto_compaction_end: async event =>
		({
			type: "auto_compaction_end",
			action: event.action,
			result: event.result,
			aborted: event.aborted,
			willRetry: event.willRetry,
			errorMessage: event.errorMessage,
			skipped: event.skipped,
		}) satisfies AutoCompactionEndEvent,
	auto_retry_start: async event =>
		({
			type: "auto_retry_start",
			attempt: event.attempt,
			maxAttempts: event.maxAttempts,
			delayMs: event.delayMs,
			errorMessage: event.errorMessage,
			errorId: event.errorId,
		}) satisfies AutoRetryStartEvent,
	auto_retry_end: async event =>
		({
			type: "auto_retry_end",
			success: event.success,
			attempt: event.attempt,
			finalError: event.finalError,
			retryErrors: event.retryErrors,
		}) satisfies AutoRetryEndEvent,
	retry_fallback_applied: async event =>
		({ type: "retry_fallback_applied", from: event.from, to: event.to, role: event.role, reason: event.reason }) satisfies
			RetryFallbackAppliedEvent,
	retry_fallback_succeeded: async event =>
		({ type: "retry_fallback_succeeded", model: event.model, role: event.role }) satisfies RetryFallbackSucceededEvent,
	ttsr_triggered: async event => ({ type: "ttsr_triggered", rules: event.rules }) satisfies TtsrTriggeredEvent,
	todo_reminder: async event =>
		({ type: "todo_reminder", todos: event.todos, attempt: event.attempt, maxAttempts: event.maxAttempts }) satisfies
			TodoReminderEvent,
	goal_updated: async event => ({ type: "goal_updated", goal: event.goal, state: event.state }) satisfies GoalUpdatedEvent,
} satisfies SessionEventRelays;

// ---- method ----

async #emitExtensionEvent(event: AgentSessionEvent): Promise<void> {
	const runner = this.#extensionRunner;
	if (!runner) return;
	const arm = this.#sessionEventRelay[event.type as RelayableEventKind] as
		| ((event: AgentSessionEvent) => Promise<RunnerEmitEvent | undefined>)
		| undefined;
	if (!arm) return;
	if (event.type !== "agent_start" && !runner.hasHandlers(event.type)) return;
	const payload = await arm(event);
	if (payload) await runner.emit(payload);
}
```

### Hợp đồng test

**Hợp đồng quan sát được:** một extension handler đã đăng ký `goal_updated` nhận được event, mang theo danh tính goal và trạng thái đã drop mà session tạo ra.

**Nếu hồi quy, người tiêu dùng thấy gì:** mảng `received` của handler vẫn rỗng — `pi.on("goal_updated", ...)` của tác giả plugin âm thầm không bao giờ bắn — khi tra bảng trượt (sai cast `as`, khoá đảo, nhánh trả `undefined` thay vì payload), hoặc khi dispatcher ngừng định tuyến qua `#emitExtensionEvent`. Nếu chỉ payload sai, các khẳng định về `goal.id` / `goal.status === "dropped"` / `state.enabled === false` sẽ fail, bắt được một nhánh chuyển tiếp bị map nhầm hoặc bị cắt cụt vẫn còn tới được handler.

**Vì sao đây không phải một phép so sánh chu kỳ với chính nó:** object goal do `GoalRuntime.dropGoal` tạo ra (chính nó đặt `status: "dropped"` và `state.enabled: false` ở `goals/runtime.ts:456-471`) và đi qua chuỗi runtime → cầu nối `GoalRuntimeHost.emit` (`agent-session.ts:1916-1920`) → `#emitSessionEvent` → `#emitExtensionEvent` → bảng → `ExtensionRunner.emit` → handler. Relay không khẳng định gì; nó chỉ di chuyển payload. Không có fixture nào được so với chính nó.

**Điều nó cố ý KHÔNG bảo vệ: tính đầy đủ.** Một dòng runtime chỉ một sự kiện không thể fail khi ai đó thêm một khoá vào bảng, và cũng không thể fail khi một tên bị bỏ hẳn ra khỏi `RelayableEventKind`. Hợp đồng đó được gánh 100% bởi `satisfies SessionEventRelays` trên bảng production cộng `bun run check:ts` — và claim của plan rằng dòng runtime này sẽ fail trong kịch bản đó là sai (xem mục Đính chính so với plan).

**Tên file test:** `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts`

### Xác minh

Chạy được ngay hôm nay (đã kiểm chứng xanh tại HEAD `808b365`, exit 0):

```bash
bun run check:ts
```

Chạy được sau khi đã build native addon (hiện đang bị chặn — `bun test` báo `0 pass, 1 fail`, `Failed to load pi_natives native addon for darwin-arm64`; đã xác nhận bằng cách chạy `cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts`):

```bash
cd packages/coding-agent && bun test test/extension-event-relay-exhaustive.test.ts
```

Lệnh kết hợp (của plan), chỉ hợp lệ sau `bun run build:native`:

```bash
bun run check:ts && (cd packages/coding-agent && bun test test/extension-event-relay-exhaustive.test.ts)
```

`check:ts` không phải nghi thức hình thức: nó chạy `oxlint` + `oxfmt --check` rồi `tsgo -p tsconfig.json --noEmit` theo từng package, và `packages/coding-agent/tsconfig.json` bao gồm `["src", "test", "scripts"]` — nên cả bảng lẫn file test mới đều được kiểm tra kiểu bởi nó.

Lệnh sửa khi native addon chưa build, theo gợi ý trong thông báo lỗi: `bun --cwd=packages/natives run build`.

Không dùng `tsc` — dự án cấm. Cổng kiểm tra là `bun run check:ts`.

### Cổng hoàn thành

`bun run check:ts` exit 0. Đây là cổng mang trọng và nó thực sự mang trọng: nếu người triển khai thêm một tên vào `RelayableEventKind` mà không có nhánh, mapped type đòi property còn thiếu và tsgo fail. Nếu họ viết dạng `Record<RelayableEventKind, (event: AgentSessionEvent) => ...>` trần từ phác thảo của plan, mọi nhánh chạm vào trường riêng của biến thể sẽ fail biên dịch. Nếu họ dùng `HookEvent` làm kiểu khoá, `Extract` sẽ co lại thành `never` và bảng hỏng. Cổng thứ hai, sau khi addon được build: `cd packages/coding-agent && bun test test/extension-event-relay-exhaustive.test.ts` exit 0 với đúng 1 test pass.

Trạng thái đỏ thứ tư, không nằm trong ba cái trên: `code_shape` ở trên được viết theo kiểu xuống dòng thủ công, nên `oxfmt --check` sẽ đỏ NGAY CẢ KHI phần kiểu hoàn toàn đúng. Vì `check:ts` chạy `check:tools` (oxlint + oxfmt) trước `check:types`, lệch format sẽ che mất lỗi kiểu. Sau khi viết xong bảng và dispatcher, chạy `bun run fmt:ts` một lần rồi mới chạy lại `bun run check:ts`.

**Cổng có thực sự đỏ được không:** CÓ với `check:ts`, và đó là cổng quan trọng. Ba trạng thái đỏ cụ thể: (1) thêm `"model_changed"` vào `RelayableEventKind` mà không có nhánh → TS2741 missing property, tsgo exit khác 0. (2) xoá nhánh `turn_end` → tương tự. (3) đổi annotation `satisfies TurnEndEvent` thành một interface sự kiện sai → TS2322 trên object literal. Nó đã được quan sát là xanh ở HEAD (`bun run check:ts` → exit 0) nên chứng minh là sống. KHÔNG với nửa `bun test` hôm nay: native addon chưa build, nên toàn bộ suite báo 0 pass bất kể code. Nửa đó chỉ là cổng thật sau `bun run build:native`; cho tới đó đừng coi sự im lặng của nó là xanh.

### Phụ thuộc

- `depends_on`: không.
- `blocks`: không.
- Mối nối phối hợp (không phải phụ thuộc theo nghĩa chặn): file dùng chung `session/agent-session.ts` với M2-OQ6 — câu hỏi 46-overload → interface `Events` khai báo ở cấp module; phải quyết trước khi đụng vào cả hai. Ngoài ra một từ `export` trên `extensions/runner.ts`.

### Cách sai dễ nhất

Cách nhiều khả năng nhất để làm sai: cầm phác thảo chữ-literal của plan — `satisfies Record<RelayableEventKind, (event: AgentSessionEvent) => RunnerEmitEvent | undefined>` — sai theo hai lần. Nó ĐỒNG BỘ, nên phép reset `#turnIndex` trong `agent_start` và phép tăng trong `turn_end` không còn chỗ để nằm và bị âm thầm rơi mất, để lại `turnIndex` đóng băng ở 0 với mọi extension mãi mãi. Và nó định kiểu tham số của mọi nhánh là `AgentSessionEvent` đủ 28 phần tử, không narrow theo nhánh, nên `event.message` / `event.toolCallId` không typecheck và cả 19 nhánh đều cần cast — tức là đúng kết quả mà refactor này sinh ra để loại bỏ. Dạng đúng là mapped `SessionEventRelays` với kiểu trả về async, chép từ `event-controller.ts:107-109` + `:284-357`, cộng thêm cast giá trị tại chỗ tra mà plan cũng bỏ sót (tiền lệ TUI: `event-controller.ts:851`).

Khả năng sai thứ hai: đặt bảng bên trong thân method thay vì làm class field, cấp phát 19 closure mỗi delta `message_update`. Khả năng sai thứ ba: xoá cả comment `model_changed` thay vì chỉ mệnh đề lỗi thời của nó, vứt mất lý do await-trong-đường-nóng.

### Cần người quyết

Câu hỏi **chặn commit 2** nhưng không chặn commit 1:

- **SẢN PHẨM — `model_changed`: ship một extension hook hay không?** Mặc định của đặc tả là KHÔNG: để nó ngoài `RelayableEventKind` và giữ con trỏ trong comment. Một hook sẽ bắn ở mọi lần đổi model kể cả retry-fallback trên nhánh lỗi, và `setModel` nằm trên đường nóng. Nếu câu trả lời là có, đó là commit 2 và phải đi kèm một nhánh thật — không bao giờ là một cái tên trong union với nhánh rỗng.

Hai câu hỏi dưới đây không chặn việc bắt đầu commit 1; mặc định của đặc tả đã đủ để làm:

- **SẢN PHẨM/REVIEW — lỗi tiềm ẩn ở `#turnIndex` mà refactor này làm lộ ra:** `this.#turnIndex++` (agent-session.ts:4630) hiện nằm SAU chốt chặn `if (!runner.hasHandlers(event.type)) return;` ở 4610. Khi không extension nào đăng ký handler `turn_end`, `#turnIndex` vì thế không bao giờ tăng, nên `turnIndex` đưa cho handler `turn_start`/`turn_end` suốt phiên là 0 và `turn_id` ở 4561 (`Math.max(0, this.#turnIndex - 1)`) luôn là 0. Đặc tả GIỮ NGUYÊN đúng hành vi này để WI-3 thành một commit cơ khọc zero-diff. Sửa nó là một commit riêng, nhỏ, có thay đổi hành vi, kèm test runtime riêng. Có nên ghi thành một mục follow-up, và có ai muốn đưa nó vào M2 không?
- **REVIEW — giữ `agent_end` là một nhánh `async () => undefined` có tài liệu, hay nên bỏ `agent_end` khỏi `RelayableEventKind` (còn 18 khoá) vì nó không có payload nào từ đường session?** Đặc tả giữ ở 19 để khớp số nhánh hiện tại và buộc người viết tương lai phải đối diện với quyết định định tuyến; TUI có tiền lệ cho nhánh no-op (`event-controller.ts:287`, `:356`). Người review bất đồng chỉ cần xoá một khoá và một nhánh.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| Kiểu giá trị của bảng là `(event: AgentSessionEvent) => RunnerEmitEvent \| undefined` (một `Record<RelayableEventKind, …>` trần kèm `satisfies`). | **SAI** — và làm theo chữ nghĩa ra tốn một lần làm lại toàn bộ 19 nhánh | Dùng kiểu MAPPED với kiểu trả về ASYNC: `type SessionEventRelays = { [E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent \| undefined> };`. Hai lỗi độc lập trong dạng của plan. (a) Nó đồng bộ, nên hai nhánh có mutate trạng thái relay — `this.#turnIndex = 0` (4605) và `this.#turnIndex++` (4630) — không còn chỗ để nằm và bị rơi, đóng băng `turnIndex` ở 0 với mọi extension suốt phiên. (b) Tham số của nó là `AgentSessionEvent` đủ 28 phần tử, không narrow theo nhánh, nên `event.message` / `event.toolCallId` / `event.goal` không typecheck và cả 19 nhánh cần cast — đúng kết quả mà refactor này sinh ra để loại bỏ. Plan có gần như chỉ tới đáp án đúng ("copy BOTH halves, not just the object literal") nhưng rồi lại viết phác thảo của nửa không dùng được.<br>Bằng chứng: `packages/coding-agent/src/modes/controllers/event-controller.ts:107-109` — `type AgentSessionEventHandlers = { [E in AgentSessionEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<void>; };`, đóng ở `:357` bằng `} satisfies AgentSessionEventHandlers;`. Các nhánh ở đó đọc `e` với narrowing biến thể đầy đủ (`event-controller.ts:287-300`). `AgentSessionEventKind = AgentSessionEvent["type"]` ở `:74`. |
| Dispatch là `relayTable[event.type as RelayableEventKind]?.(event)` — "cast `as` tại chỗ tra là nơi duy nhất cần cast". | **SAI** — cần hai cast | `this.#sessionEventRelay[event.type as RelayableEventKind]` có kiểu `SessionEventRelays[RelayableEventKind]`, tức là một union của 19 kiểu hàm. Gọi một union các kiểu hàm đòi hỏi đối số gán được cho PHÉP GIAO các tham số của chúng, và một `AgentSessionEvent` đầy đủ không gán được cho `Extract<AgentSessionEvent, { type: "turn_start" }>`. Chỗ tra còn phải cast GIÁ TRỊ về một chữ ký rộng duy nhất: `as ((event: AgentSessionEvent) => Promise<RunnerEmitEvent \| undefined>) \| undefined`. TUI làm đúng như vậy và plan đã trích TUI làm khuôn mẫu mà không mang nửa dispatch sang.<br>Bằng chứng: `packages/coding-agent/src/modes/controllers/event-controller.ts:851` — `const run = this.#handlers[event.type] as (e: AgentSessionEvent) => Promise<void>;` |
| Dòng test runtime "là thứ FAIL nếu ai đó bỏ sót một biến thể khỏi `RelayableEventKind` rồi thêm nó vào bảng". | **SAI NHIỀU CÁCH** — claim tự mâu thuẫn và không dòng test một sự kiện nào có thể giữ được | Hai nửa câu mô tả hai tình huống trái ngược nhau và không nửa nào làm cho dòng runtime mang trọng. Nếu một tên được thêm vào BẢNG nhưng không có trong union, `satisfies` fail như excess-property error — đó là `bun run check:ts`, không phải dòng runtime. Nếu một tên bị bỏ khỏi CẢ HAI, không gì fail ở đâu cả: một sự kiện phiên mới mà không ai relay là một quyết định sản phẩm hợp lệ, không phải khiếm khuyết. Cái dòng runtime thực sự bảo vệ hẹp hơn và vẫn đáng có: bảng LÀ đường dispatch sống, và payload tới handler là payload do session tạo ra. Hãy phát biểu như vậy; đừng để người review tin rằng test chắn được tính đầy đủ.<br>Bằng chứng: `packages/coding-agent/tsconfig.json` bao gồm `["src", "test", "scripts"]`, nên `tsgo --noEmit` kiểm tra kiểu cả bảng — đó là toàn bộ cổng đầy đủ. Một test runtime một sự kiện chỉ quan sát việc giao của một sự kiện và không gì về 18 sự kiện kia. |
| Bảng khoá `AgentSessionEvent["type"]` trần "sẽ đòi hơn mười nhánh `() => undefined`". | **ĐÚNG THỰC CHẤT, SAI CON SỐ** | Đúng 9, không phải "hơn mười". `AgentSessionEvent` có 28 tên type khác nhau (11 từ `AgentEvent` + 17 do union của session thêm vào); 19 relayable, còn lại 9: `tool_stream_update`, `model_changed`, `config_warnings_changed`, `advisor_cost_changed`, `advisor_yielded`, `todo_auto_clear`, `irc_message`, `notice`, `thinking_level_changed`. Kết luận — dùng `Extract` 19 phần tử — không đổi. Đáng viết đúng 9 tên đó vào doc comment của `RelayableEventKind` để người viết kế tiếp biết có hai lựa chọn hợp lệ.<br>Bằng chứng: `packages/coding-agent/src/session/agent-session-events.ts:13-80` (union; 17 biến thể chỉ-của-session ở 29-80). `packages/agent/src/types.ts:1197-1219` — `AgentEvent` có 11 biến thể, kết thúc ở 1219. Đối chiếu chéo: bảng handler của TUI (`event-controller.ts:284-357`) có nhánh thật cho cả 28, vì TUI đăng ký tất cả. |
| `model_changed`: "hoặc xoá văn xuôi ở agent-session.ts:9442-9443". | **SAI NEO, VÀ XOÁ CẢ COMMENT LÀ CÁCH SỬA SAI** | Comment nằm ở 9523-9527, không phải 9442-9443, và chỉ mệnh đề thứ ba của nó mới lỗi thời. Dòng 1-2 ("Fan-out uses the synchronous `#emit` … would only add an extension-delivery await inside every model switch — including retry-fallback on the error path") là lý do mang trọng cho việc dùng `#emit` thay vì `#emitSessionEvent`, và chúng vẫn đúng. Xoá khẳng định "`model_changed` has no extension-facing hook (`#emitExtensionEvent` never maps it)" và thay bằng một con trỏ tới `RelayableEventKind`. Văn bản thay thế chính xác nằm ở bước 11.<br>Bằng chứng: `packages/coding-agent/src/session/agent-session.ts:9523-9527`, đọc trực tiếp; theo sau ở 9528-9530 là `if (isChanging) { this.#emit({ type: "model_changed" }); }`. |
| 19 nhánh relay nằm ở `agent-session.ts:4572-4770`, tên nhánh lấy từ `:4572-4720`; ghi chú `model_changed` ở `:9442-9443`; `RunnerEmitEvent` ở `extensions/runner.ts:344`; `ExtensionEvent` ở `extensions/extensions/types.ts:1095`; `AgentSessionEvent` ở `session/agent-session-events.ts:13-77`; `AgentEvent` ở `agent/src/types.ts:1189`; khuôn mẫu TUI ở `event-controller.ts:106-108` và `:279-352`. | **SAI BẢY NEO** — số dòng đã kiểm chứng bên dưới | Dùng các neo sau, tất cả đã xác nhận bằng `git grep -n` / `sed -n` tại HEAD `808b365`: method relay 4602-4747; 19 phép so sánh `event.type ===` ở 4604, 4611, 4615, 4622, 4631, 4637, 4644, 4657, 4666, 4675, 4684, 4690, 4700, 4709, 4717, 4725, 4731, 4733, 4740; ghi chú `model_changed` 9523-9527; `RunnerEmitEvent` runner.ts:347; `ExtensionEvent` extensions/types.ts:1120; `AgentSessionEvent` agent-session-events.ts:13-80; `AgentEvent` agent/src/types.ts:1197-1219; kiểu mapped của TUI event-controller.ts:107-109 và object literal 284-357 (`satisfies` đóng ở 357).<br>Bằng chứng: đọc trực tiếp từng file; `agent-session.ts:4746-4747` cho thấy dấu `}` đóng chuỗi và dấu `}` của method; `event-controller.ts:357` là `} satisfies AgentSessionEventHandlers;`. |
| Repo đang ở git HEAD `5873776` trên branch milestone-1. | **LỖI THỜI** — commit đó không tồn tại trong repo này | HEAD thật là `808b365` ("docs(plan): fold the spec-verified M1 execution plan into the upgrade plan"), branch milestone-1, working tree sạch. `git cat-file -t 5873776` trả về 'fatal: Not a valid object name'. Mọi số dòng trong đặc tả này đã được kiểm chứng trên `808b365`; nếu cây thư mục dịch chuyển trước khi triển khai, hãy kiểm chứng lại bốn neo trong `agent-session.ts` (4602, 4747, 9523, 837) trước khi sửa.<br>Bằng chứng: `git rev-parse --short HEAD` → `808b365`; `git log --oneline -3` → `808b365`, `33d6e33`, `ecd516f`. |
| `HookEvent` là union 15 phần tử ở `extensibility/hooks/types.ts:393` và thiếu 9 type chỉ-có-relay. | **ĐÃ XÁC NHẬN** — cảnh báo kiểu sắc nhất của plan vẫn đúng | Đã xác minh đúng 15 phần tử (394-408) và số dòng là chính xác. Liệt kê ở đây để người triển khai không phải tự suy lại: SessionEvent, ContextEvent, BeforeAgentStartEvent, AgentStartEvent, AgentEndEvent, TurnStartEvent, TurnEndEvent, AutoCompactionStartEvent, AutoCompactionEndEvent, AutoRetryStartEvent, AutoRetryEndEvent, TtsrTriggeredEvent, TodoReminderEvent, ToolCallEvent, ToolResultEvent. 9 type chỉ-có-relay (message_start/update/end, tool_execution_start/update/end, retry_fallback_applied, retry_fallback_succeeded, goal_updated) vắng mặt — dùng nó làm kiểu khoá làm `Extract` co lại thành `never`.<br>Bằng chứng: `packages/coding-agent/src/extensibility/hooks/types.ts:393-408`. `ExtensionEventType` cũng được xác nhận là không tồn tại: `git grep -n ExtensionEventType -- packages` không trả về gì. |
| Ghi chú môi trường: `bun test` bị chặn bởi native addon chưa build; `bun run check:ts` chạy được. | **ĐÃ XÁC NHẬN** — và hệ quả đối với cổng đã nêu trong `gate` | Đã chạy: `cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts` → '0 pass, 1 fail, 1 error', 'Failed to load pi_natives native addon for darwin-arm64', gợi ý sửa `bun --cwd=packages/natives run build`. `bun run check:ts` tại HEAD exit 0 (đã kiểm chứng, chạy đầy đủ). Nên cổng DUY NHẤT còn sống hôm nay là `check:ts` — may mắn thay, đó cũng là cổng mang tính đầy đủ. Đừng báo test là pass trước khi addon được build.<br>Bằng chứng: các lần chạy thật; đầu ra `bun run check:ts` kết thúc bằng `check:types \| Done` của mọi package và `[exited with code 0]`. |

## Cần người xác nhận

Mâu thuẫn nội tại trong chính đặc tả — không tự sửa, nêu ra ở đây:

- **`one_line` và `plan_corrections` #3 nói ngược nhau.** `one_line` kết luận rằng "một loại sự kiện mới không thể được thêm vào phiên mà không hoặc có nhánh chuyển tiếp, hoặc làm kiểm tra kiểu thất bại". Nhưng `plan_corrections` #3 nói: nếu một tên bị bỏ khỏi CẢ bảng lẫn union thì không gì fail ở đâu cả, vì một sự kiện phiên mới không ai relay là một quyết định sản phẩm hợp lệ. Cái thật sự được bảo vệ chỉ là chiều ngược lại — thêm một tên vào union mà không có nhánh thì fail — chứ không phải chiều trong `one_line`. Cần chốt xem `one_line` có phải sửa lại không, hay giữ nguyên và để mục Đính chính so với plan đứng sau nó.
- **Bước 12 tự tham chiếu chính nó.** Câu "dựng runner và session theo khung ở bước 12" nằm ngay trong bước 12. Khung thật sự được định nghĩa ở mục File cần chạm tới: `test/agent-session-aside-delivery.test.ts:890-935`. Mục Các bước đã dùng neo đó.
