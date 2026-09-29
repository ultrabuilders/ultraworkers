# Phiếu triển khai — `WI-SESSION-LOG. Session log là nguồn sự thật duy nhất`

Kế hoạch: `MILESTONE_2_EXECUTION_PLAN.md:268-313` (thân mục), `:104-110` (Wave 1b), `:5376` (hàng *Định nghĩa hoàn thành*).
Đo trên `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `65cc6c1`, ngày 2026-09-29.
Cây tham chiếu: `~/Projects/deepseek-harness` (toàn bộ neo `packages/core/*` nằm ở đây, **không** có trong omp).
**Không sửa file kế hoạch nào.** File này chỉ là phiếu.

---

## 1. Cái gì thay đổi, quan sát được

> Sau work item này, câu hỏi *"những byte này có thật sự là thứ omp đã gửi cho model không?"* có **một câu trả lời cơ học, trả bằng số** thay vì một cảm giác: repo chứa một bảng 7 dòng đo từng bề mặt (resume / fork / transcript / compaction / cache-state / telemetry / replay) với nhãn *đang giữ state riêng* hay *đọc lại từ nguồn*, một con số **5/7**, và một bộ test đỏ được khi thứ đang gửi đi không còn tái dựng được từ `#state.messages` qua đúng pipeline đã ghi ra.

Không có thay đổi hành vi người dùng thấy. Đây là mục đo + một invariant **chỉ chạy trong test**, không phải một lỗi mới.

---

## 2. VIỆC 1 — Kết quả kiểm lại từng neo

Neo nào trong thân mục `WI-SESSION-LOG` (tức dòng 268-313 của plan) được mở và đọc thật:

| neo trong plan | file thật | dòng đó nói gì | kết luận |
| --- | --- | --- | --- |
| `packages/core/session/src/index.ts:860` | `~/Projects/deepseek-harness/packages/core/session/src/index.ts` | `  deriveMessages(): Message[] {` | ✅ **ĐÚNG Y HỆT** |
| `packages/core/tools/src/types.ts:37` | cùng repo | `     * call abandoned in the queue logs nothing. Log-only: \`deriveMessages()\`` | ✅ **ĐÚNG Y HỆT** |
| `packages/core/tools/src/types.ts:52` | cùng repo | `     * Log-only: \`deriveMessages()\` ignores it, so sub-calls never re-enter` | ✅ **ĐÚNG Y HỆT** |
| `packages/core/agent-loop/src/invariant.ts` (không đánh số dòng) | cùng repo, 65 dòng | xem bên dưới | ✅ **ĐÚNG, từng câu** |
| `derivedGeneration` / `derivedNodes` | `packages/core/session/src/index.ts:840` / `:838` | `private derivedGeneration = 0` / `private derivedNodes = 0` | ✅ **ĐÚNG** |
| `surfaceOp`: `append` / `replace` | `packages/core/session/src/types.ts:463-464` | `\| 'append'` / `\| { op: 'replace'; startSeq: SessionSeq; endSeq: SessionSeq }` | ✅ **ĐÚNG** |
| chuỗi migration `v0→v1 … v3→v4` | `packages/session/session-format-{catalog,v0-to-v1,v1-to-v2,v2-to-v3,v3-to-v4}` | 5 package, mỗi cái một bước | ✅ **ĐÚNG** |
| `assistant/chunk` là sự kiện log không chiếu | `packages/core/session/src/types.ts` | **không có `chunk` trong file** | ❌ **NEO HỎNG — xem 2.1** |
| danh sách "kiểu sự kiện bền vững" (15 tên) | `packages/core/session/src/known-event-types.ts:22-82` | 60 tên; 3 tên plan liệt kê **không có trong đó** | ❌ **Nhãn SAI — xem 2.2** |

### 2.1 `assistant/chunk` không phải sự kiện bền vững của format hiện hành

Plan viết: *"không có dấu — `assistant/chunk`, turn boundary. Log có đầy đủ, transcript vắng mặt một cách đúng đắn."*

`grep -n "chunk" packages/core/session/src/types.ts` → **0 hit**. `KNOWN_SESSION_EVENT_TYPES` (`known-event-types.ts:22-82`) không có nó. Nó chỉ tồn tại ở **codec v0 đã đóng băng**:

```
packages/session/session-format-v0-to-v1/src/codec.ts:289:      type: 'assistant/chunk',
packages/session/session-format-v0-to-v1/src/dispositions.ts:46:  'assistant/chunk': disposition(['turn', 'step', 'chunk']),
```

Nghĩa là `assistant/chunk` là **input** của migration v0→v1 (một luồng `text-chunks` / `reasoning-chunks` được bung thành bản ghi chunk), không phải **output**. Symbol đúng của format hiện hành cho đúng ý plan là `assistant/attempt`:

```
packages/core/session/src/types.ts:352  /**
packages/core/session/src/types.ts:353   * One model attempt that committed no surface message. The embedded stream
packages/core/session/src/types.ts:354   * preserves a failed, retried, cancelled, or stream-error attempt that
packages/core/session/src/types.ts:355   * reached settlement without fabricating model-visible history. */
```

**Hậu quả khi gõ:** nếu ai đó viết test invariant dựa trên `assistant/chunk` thì test đó sẽ không bao giờ đỏ, vì lo sự kiện đó không tồn tại trong log của build hiện hành. Đây là loại "cổng luôn xanh" mà chính work item này cảnh báo.

### 2.2 Danh sách kiểu sự kiện bền vững gộp hai loại thứ khác nhau

Plan liệt kê 15 tên là "kiểu sự kiện bền vững": `session/created`, `turn/start|end`, `step/start`, `user/message`, `assistant/attempt|chunk|message`, `tool/call|result`, `request/header`, `session/flush`, `session/disposed`.

- `session/created` (`index.ts:55`), `session/disposed` (`index.ts:65`), `session/flush` (`index.ts:86`) nằm trong khối `declare module '@deepseek-ai/cordis'` bắt đầu ở `index.ts:38` — chúng là **sự kiện vòng đời của service Cordis**, không phải thành viên `SessionEventMap`. Không cái nào có trong `KNOWN_SESSION_EVENT_TYPES`.
- Danh sách thiếu **60 − 15 = 45** sự kiện bền vững thật, trong đó có `system/message` (`known-event-types.ts:63`) và `developer/message` (`:37`) — **đúng hai loại sinh ra surface node**, tức là "surface node 0" mà `invariant.ts:45` dựa vào khi nó kiểm `options.system === undefined`. Bỏ hai tên này khỏi danh sách là mất đúng cái cặp mà invariant cần.

### 2.3 `invariant.ts` — plan đọc đúng, từng dòng

File 65 dòng, mọi khẳng định của plan về nó đều đúng, kể cả chú thích:

```
:20   // Prepend prevents a short-circuiting replay listener from silencing the check.
:21   ctx.on('llm/stream', (options: GenerateOptions, next) => {
:22     if (!isAgentLoopRequest(options)) return next()
:23     if (!Object.isFrozen(options)) fail('a loop-built request must be frozen')
:27     if (!Object.isFrozen(options.messages)) {
:40     const expected = session.deriveMessages()
:41     if (JSON.stringify(options.messages) !== JSON.stringify(expected)) {
:42       fail(`llm request for session "${String(session.id)}" diverges from the dispatch-time durable derivation (log-reconstruction desync)`)
:45     // The system prompt travels inside `messages` as surface node 0, never as `system`.
:56   }, { global: true, prepend: true })
```

Hai điều plan **không** nhắc nhưng phải biết trước khi gõ: `invariant.ts:24-26` còn đòi `options.sessionId` phải tồn tại và resolve được tới session sống; và `isAgentLoopRequest` ở `:22` là **cổng lọc** — chỉ request của loop mới bị kiểm, request phụ không.

---

## 3. VIỆC 1 (tiếp) — Đo trên omp: cả ba cổng mở

Chạy đúng hai lệnh mà hàng *Định nghĩa hoàn thành* (:5376) ghi:

```
$ grep -rn "deriveMessages" --include='*.ts' packages/ | wc -l
0
$ grep -rn "llm/stream" --include='*.ts' packages/ | wc -l
0
$ grep -rn "surfaceOp" packages/ | wc -l
0
```

**Trả lời bước 2 của Cổng mở (plan:311) — `deriveMessages` của omp ngày nay là gì:**
> **Không có, và cũng không có dưới tên khác.** Cả ba tên của dsh đều 0 hit trên toàn bộ `packages/`. Cái đóng vai `deriveMessages` là chuỗi 4 bước trong `prepareProviderCall` (`packages/agent/src/agent-loop.ts:1867-1921`), không phải một hàm có tên.

Nhưng **kết luận mà plan rút ra từ số 0 — "chưa có nguồn thứ hai để so, nên phương án A dựng không được" — là SAI**, và đây là phát hiện quan trọng nhất của phiếu này. Nguồn thứ hai **có**, và nó tên rõ:

| vai trò trong dsh | omp |
| --- | --- |
| seam `llm/stream` | `packages/agent/src/agent-loop.ts:2038` — `let response = await streamFunction(model, llmContext, {` |
| nơi cắm listener | `packages/agent/src/agent-loop.ts:1945` — `const streamFunction = streamFn || streamSimple;`, kiểu `StreamFn` ở `packages/agent/src/types.ts:31` |
| `session.deriveMessages()` | chuỗi `transformContext` → `convertToLlm` → `normalizeMessagesForProvider` → `appendOnlyContext.build()`, ở `agent-loop.ts:1875`, `:1878-1879`, `:1885-1887`, toàn bộ nằm trong `prepareProviderCall` (`:1867-1921`) |
| session (nguồn thứ hai) | `packages/coding-agent/src/session/agent-session.ts:6135` — `get messages(): AgentMessage[] { return this.agent.state.messages; }` |

Và **bề mặt lệch thật thì có tên, không phải suy đoán** — `packages/coding-agent/src/extensibility/shared-events.ts:181-184`:

```
export interface ContextEvent {
	type: "context";
	/** Messages about to be sent to the LLM (deep copy, safe to modify) */
	messages: AgentMessage[];
}
```

Chú thích ngay dưới đó (`:176-179`) nói thẳng: *"Original session messages are NOT modified - only the messages sent to the LLM are affected when a handler returns a replacement."* Hiện thực nằm ở `packages/coding-agent/src/sdk.ts:3922-3925`:

```
const transformContext = async (messages: AgentMessage[], signal?: AbortSignal) => {
	const withContext = await extensionRunner.emitContext(messages, signal);
	return wrapSteeringForModel(withContext);
};
```

`emitContext` bắn ở `packages/coding-agent/src/extensibility/hooks/runner.ts:370` và `packages/coding-agent/src/extensibility/extensions/runner.ts:1798`.

**Nghĩa là:** một hook hoặc extension có thể trả về một mảng message thay thế, mảng đó đi thẳng ra model, và **không gì ghi nó xuống đâu**. Đây chính xác là câu hỏi M4 đặt ra, ở tầng thấp, có cơ chế. `.lavish-wip/DECISION-WI-SESSION-LOG.md` đã kết luận ngược lại ("`ContextEvent` chỉ mang `messages`" nên không có nguồn thứ hai) — chỗ đó đọc thiếu: `ContextEvent` mang `messages` **đã biến đổi**, và nguồn thứ hai là `agent.state.messages` phía trên nó.

---

## 4. Bảng lỗ hổng 7 dòng — kèm con số

Đây là phép đo mà hàng *Định nghĩa hoàn thành* (:5376) đòi. Mỗi dòng gắn đúng một trong hai nhãn.

| bề mặt | nhãn | bằng chứng trong cây |
| --- | --- | --- |
| `resume` | **đọc lại từ nguồn** | `packages/coding-agent/src/session/session-loader.ts:353 loadSessionFile`, `:531 loadSessionMessagesReadOnly(filePath)` — đọc JSONL. Nhưng nó **không** chạy `transformContext`/`convertToLlm`, nên là một phép chiếu khác hình dạng, không phải một phép dẫn. |
| `fork` | **đang giữ state riêng** | `packages/coding-agent/src/session/agent-session.ts:8992 async fork()`, `:9042 await copySessionArtifacts(...)`. Và `packages/coding-agent/src/session/session-maintenance.ts:697-700` thừa nhận bằng văn bản: *"the session file must match the live (pruned) context or file-based forks (`/fork`, `/tan`) and resume rebuild a divergent prefix and cold-miss the provider prompt cache."* |
| `transcript` | **đọc lại từ nguồn** | `packages/coding-agent/src/session/session-context.ts:214 isTranscriptEntry`. Nội dung message đến từ entry; chỉ có **trạng thái trình bày** (nhóm dòng read bị gộp — `packages/coding-agent/src/modes/interactive-mode.ts:3275`) là của riêng TUI, và nó không quay lại model. |
| `compaction` | **đang giữ state riêng** | `packages/agent/src/compaction/pruning.ts:306` và `:416` gọi `invalidateMessageCache` sau khi sửa message **tại chỗ**. Hợp đồng bắt buộc nằm ở `packages/agent/src/compaction/message-cache.ts:19-22`: *"`pruneToolOutputs` / … rewrite message content in place under a stable identity. Each MUST call `invalidateMessageCache`"*. Quên một lần là cache đọc giá trị cũ. |
| `cache-state` | **đang giữ state riêng** | `message-cache.ts` đặt version tag lên chính object message; `packages/agent/src/append-only-context.ts:139 build()` và `:347 syncMessages()` giữ snapshot tiền tố. 6 call site `invalidateMessageCache` rải ở `coding-agent/src/advisor/tool-result-eviction.ts:105`, `session/messages.ts:726`, `session/session-maintenance.ts:843`, `session/prewalk.ts:347`, `compaction/shake.ts:449,460`, `compaction/pruning.ts:306,416`. |
| `telemetry` | **đang giữ state riêng** | `packages/agent/src/run-collector.ts:147 export class AgentRunCollector`, được dựng riêng ở `packages/agent/src/telemetry.ts:442 collector: new AgentRunCollector()`. Bộ đếm độc lập với history. |
| `replay` | **đang giữ state riêng** | `packages/agent/src/replay-policy.ts:12 filterProviderReplayMessages` — bộ lọc **khác** với lọc ở `sdk.ts:3917` trên đường convert; `run-collector.ts:25 ChatRecord` là bản ghi thứ hai. |

**Con số phải ghi bằng số: `5 / 7` đang giữ state riêng** (fork, compaction, cache-state, telemetry, replay); `2 / 7` đọc lại từ nguồn (resume, transcript).

**Đọc đúng con số này thì sao:** nó **lớn hơn 0**, nên quy tắc dừng ở plan:322-324 (*"nếu số vi phạm bằng 0 thì ghi thẳng 'không có bằng chứng omp cần B' rồi dừng"*) **không kích hoạt**. Nhưng 5/7 không phải bằng chứng cho B: `fork` và `compaction` phân kỳ **có chủ ý và đã được ghi**, `telemetry`/`replay` là bản ghi quan sát chứ không phải nguồn thứ hai để suy ra. Chỉ `cache-state` là ứng viên thật — và nó là **lỗi quên-vô-hại**, không phải lệch kiến trúc. Xem mục 8.

---

## 5. Bảng điểm sửa

Không sửa file nào trong bước đo. Bảng này là **hình dạng sau** của ba file sẽ phải chạm vào ở phương án A (bước 4-6).

| đường/dẫn | symbol | TRƯỚC (trích từ file thật) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/agent/src/agent-loop.ts` | `dispatchChat`, quanh `:1945` | `const streamFunction = streamFn \|\| streamSimple;` | `const streamFunction = wrapWithDerivationInvariant(streamFn ?? streamSimple, config.derivationInvariant);` — mặc định `config.derivationInvariant` là `undefined` nên đường production không đổi hành vi |
| `packages/agent/src/derivation-invariant.ts` | **tạo mới** | (không có) | `export function assertDerivable(messages: readonly AgentMessage[], from: readonly AgentMessage[], transform: (…) => …, convert: (…) => …): void` — ném `Error` khi `JSON.stringify` hai mảng lệch; không giữ state, không ghi log, không I/O |
| `packages/agent/src/agent-loop.ts` | `prepareProviderCall` `:1867-1921` | `messages = await config.transformContext(messages, signal);` | giữ nguyên; thêm export `prepareProviderCall` để test gọi lại đúng pipeline thay vì dựng lại |
| `packages/agent/test/derivation-invariant.test.ts` | **tạo mới** | (không có) | 4-6 case, xem mục 7 |
| `packages/agent/CHANGELOG.md` | `## [Unreleased]` | dòng 3 là `## [Unreleased]`, dòng 4 trống, dòng 5 là `## [18.4.0] - 2026-09-28` | thêm `### Added` ngay dưới dòng 3, một dòng. **Không** sửa `## [18.4.0]` — đã phát hành, bất biến |

---

## 6. Các bước

1. **Ghi lại số đo, không suy diễn thêm.** Dán nguyên văn kết quả ở mục 3 (ba lệnh, ba số `0`) và bảng 7 dòng ở mục 4 kèm con số `5 / 7` vào thân mục work item. Đây là phần *Định nghĩa hoàn thành* :5376 đã chốt; làm nó trước, vì nó là tiền đề của mọi thứ sau.

2. **Sửa ba sai lệch về dsh trong tài liệu, bằng ghi chú chứ không bằng sửa âm thầm.** `assistant/chunk` → `assistant/attempt` (mục 2.1). Danh sách "kiểu sự kiện bền vững" → tách `session/created` / `session/disposed` / `session/flush` ra thành "sự kiện vòng đời Cordis", và thêm `system/message` + `developer/message` (mục 2.2). Ghi vào `.lavish-wip/`, **không** sửa `MILESTONE_2_EXECUTION_PLAN.md`.

3. **Đo con số quyết định trước khi viết dòng nào.** Chạy invariant dưới dạng script tạm trên toàn suite, đếm số lần đỏ. Lệnh cụ thể ở mục 8. **Nếu số đó là 0, dừng** — ghi thẳng *"không có bằng chứng omp cần B"* theo plan:322-324 và dừng mục này. Đừng mở rộng.

4. **Viết `packages/agent/src/derivation-invariant.ts`.** Hàm thuần, không I/O: nhận mảng đã gửi + mảng nguồn + hai bước transform, tự chạy lại `transformContext` rồi `convertToLlm`, so `JSON.stringify`. Chỉ so **`Message[]` sau convert** — không so `AgentMessage[]` trước convert, vì `convertToLlm` cố ý bỏ custom type (`agent-session.ts:3293`: *"`convertToLlm` still strips their incomplete thinking from replay"*) và so cả hai phía sẽ đỏ vĩnh viễn vì lý do đúng.

5. **Cắm vào `agent-loop.ts:1945`, mặc định tắt.** Đường production phải **giống hệt** khi không bật. Đừng đặt invariant ở `sdk.ts` hay `agent-session.ts` — đặt ở `packages/agent` để nó kiểm được cả SDK embed lẫn CLI, và để `packages/agent` không phải import ngược từ `coding-agent`.

6. **Viết test.** Mục 7.

7. **Một dòng changelog** dưới `## [Unreleased]` của `packages/agent/CHANGELOG.md`, trong một `### Added` mới. Dẫn đầu bằng thứ người đọc tìm được. **Không commit nếu không được yêu cầu.**

---

## 7. Hợp đồng test

**File:** `packages/agent/test/derivation-invariant.test.ts` (mới). Dùng `bun:test` — `import { describe, expect, test } from "bun:test"`, đúng như `packages/agent/test/message-cache.test.ts:1`.

Mỗi case phải bảo vệ **một hợp đồng quan sát được**, và phải **đỏ được**. Cụ thể:

| case | nó bảo vệ điều gì | đỏ khi nào |
| --- | --- | --- |
| `round-trip: derive mà không transformContext thì bằng` | đường hạnh phúc cơ bản | ai thêm một bước vào pipeline mà không cập nhật invariant |
| `transformContext trả về mảng thay thế thì đỏ` | **đây là hợp đồng quan trọng nhất** — nó là bằng chứng cơ học cho "những byte này không tái dựng được" | ai gỡ `transformContext` khỏi chuỗi dẫn |
| message bị sửa tại chỗ mà không `invalidateMessageCache` thì đỏ | bắt đúng lớp lỗi `message-cache.ts:19-22` mô tả | ai thêm một đường rewrite mà quên invalidate — **đây là lỗi thật, đã có tiền lệ** |
| ``pruneToolOutputs` chạy rồi `invalidateMessageCache` thì xanh` | nhánh phủ định: cơ chế đúng **không** được báo động | ai làm hỏng chính cơ chế cache |
| `request đầu tiên của phiên (mảng rỗng) không đỏ` | ranh giới: mảng rỗng ở cả hai phía phải bằng nhau | ai thêm tiền đối chiếu độ dài rỗng |

**Không** thêm: test "constructor copy", test `toBe(x)` cho giá trị do chính test truyền vào, test đếm độ dài tăng, test source-grep (AGENTS.md cấm).

**Người dùng thấy gì nếu hồi quy:** không có gì trực tiếp — đây là invariant chỉ chạy trong test. Nhưng hậu quả là có: khi `transformContext` bắt đầu trả về thứ gì đó mà `#state.messages` không biết, request vẫn đi ra provider bình thường, model trả lời bình thường, và **không ai có bằng chứng** rằng lịch sử phiên và thứ đã gửi đang lệch nhau. Đó đúng là "báo applied nhưng không có gì thay đổi" mà M4-4 nói tới, chỉ là ở tầng thấp hơn và hiện vẫn vô hại vì `transformContext` chưa từng được dùng để sửa nội dung.

---

## 8. Cổng

### 8.1 Cổng đo (lấy nguyên từ hàng :5376)

```
grep -rn "deriveMessages" --include='*.ts' packages/ | wc -l     # phải ra 0
grep -rn "llm/stream"      --include='*.ts' packages/ | wc -l     # phải ra 0
```

**Cổng này CÓ ĐỎ ĐƯỢC KHÔNG?** **Có, nhưng chỉ bằng trôi chứ không bằng hồi quy hành vi.** Nó đỏ khi ai đó thêm `deriveMessages` hoặc một seam `llm/stream` vào omp — tức là khi dsh bắt đầu được port. Đó là một loại đỏ thật, nhưng nó không bắt được một bug. **Nó là một cổng chống trôi, không phải cổng nghiệm thu.** Giữ nó, đừng dựa vào nó.

### 8.2 Cổng hành vi (cổng thật)

```
bun test packages/agent/test/derivation-invariant.test.ts
```

**Cổng này CÓ ĐỎ ĐƯỢC KHÔNG?** **Có, và bằng cách cụ thể:** bỏ `transformContext` khỏi chuỗi dẫn ở `agent-loop.ts:1875`, chạy lại, case `transformContext trả về mảng thay thế thì đỏ` phải chuyển từ xanh sang đỏ. **Bắt buộc phải quan sát đỏ trước, rồi khôi phục, rồi quan sát xanh** — một test chỉ được nộp khi đã tự chứng minh mình đỏ được. Đây là điều kiện giống hàng WI-13 trong cùng bảng và không có ngoại lệ.

### 8.3 Cổng quyết định sau A (bắt buộc, và là cổng quan trọng nhất của mục này)

```
bun test packages/agent packages/coding-agent 2>&1 | tee /tmp/wi-session-log.txt
grep -c "derivation invariant" /tmp/wi-session-log.txt
```

**Đây là cổng mà cả phiếu này dựng lên.** Nó hỏi: invariant mới bắt được **bao nhiêu** lần hỏng trên corpus hiện có, và câu trả lời phải là **một con số viết ra**. Nếu con số là **0**, quy tắc dừng ở plan:322-324 kích hoạt: ghi thẳng *"không có bằng chứng omp cần B"* và dừng. Đừng lật mô hình vì nó trông đúng.

**Preflight bắt buộc** (thiếu thì cổng treo, không phải cổng đỏ — xem `MILESTONE_2_EXECUTION_PLAN.md:55-64`): addon native phải build. **Trên checkout này nó ĐÃ build** — `find packages/natives -name '*.node'` ra `packages/natives/native/pi_natives.darwin-arm64.node`. Đã xác nhận suite chạy được:

```
$ bun test packages/agent/test/message-cache.test.ts
 10 pass  0 fail  22 expect() calls   [149ms]
```

Ghi chú: `.lavish-wip/DECISION-WI-SESSION-LOG.md` dẫn số `913 pass / 1445 fail` tại HEAD `6e8109d` và nói cổng (a) "**sẽ không bao giờ thoả** ở đây". **Con số đó đã hết hạn** — HEAD hiện tại là `65cc6c1` và addon đã có. Cổng chạy được. Đừng dùng số cũ làm lý do trì hoãn.

### 8.4 Kiểm tra kiểu

```
bun run check:ts
```

Không dùng `tsc` / `npx tsc` — AGENTS.md cấm.

---

## 9. Cạm bẫy riêng của work item này

1. **`Object.isFrozen` không port được.** `invariant.ts:23,27` kiểm `options` và `options.messages` đã đóng băng. Kiểm bằng `grep -rn "Object.freeze" --include='*.ts' packages/agent/src packages/ai/src packages/coding-agent/src/session`: **không có lần nào** đóng băng đường request trong omp. Port nguyên văn ⇒ invariant đỏ trên **mọi** request ⇒ xoá cổng sau một tuần vì "nó ồn". Đây là cái bẫy đắt nhất: một cổng đỏ 100% là cổng bị xoá, và xoá nó còn tệ hơn là không có.

2. **Tên `llm/stream` và `deriveMessages` không tồn tại — đừng tạo chúng chỉ để khớp plan.** Seam thật là `streamFn` (`agent-loop.ts:1945`) và chuỗi `prepareProviderCall`. Đặt tên theo dsh là thêm một lớp gián tiếp không mang thông tin.

3. **So `Message[]` (sau convert), không phải `AgentMessage[]` (trước convert).** `convertToLlm` cố ý bỏ custom type — `agent-session.ts:3293`. So sai phía thì đỏ vĩnh viễn với một lý do **đúng**, tệ hơn hẳn đỏ với lý do sai.

4. **`transformContext` hợp pháp phải làm đỏ — nhưng chỉ trong test.** Hook `context` và extension `context` được phép sửa messages theo thiết kế (`shared-events.ts:176-179` nói rõ). Nếu invariant chạy ở production, nó sẽ giết mọi session có hook `context`. Vì vậy nó **phải** là tuỳ chọn, mặc định tắt. Đây là lý do cột "SAU" ở mục 5 ghi `config.derivationInvariant` mặc định `undefined` — đừng "tối ưu" nó thành luôn bật.

5. **Đừng đọc 5/7 là "cần B".** Bốn trong năm bề mặt giữ state riêng là bằng chứng **cho** một mô hình nhiều nguồn, và một mô hình nhiều nguồn có thể là đúng. Bằng chứng *chống* B là: 2/7 (resume, transcript) đã đọc lại từ nguồn, và `fork` phân kỳ là **có chủ ý, đã được ghi bằng văn bản** ở `session-maintenance.ts:697-700`. Chỉ `cache-state` là lỗi thật — và nó là lỗi quên invalidate, sửa được bằng một test, không cần lật mô hình.

6. **`WI-SESSION-LOG` và `WI-PRESTEP-1` là hai việc.** Plan:270 nói rõ. Cùng đụng một bề mặt log nhưng **không** gộp. Nếu bạn đang gõ PR cho cái này, đừng kéo `WI-PRESTEP-1` vào.

7. **Cái bẫy của chính tài liệu này:** nó dẫn `packages/core/*` của dsh mà không nói repo nào. Trong omp `packages/` có `agent, ai, browser-relay, catalog, coding-agent, collab-web, metaharness, mnemopi, natives, omptype, snapcompact, stats, tui, typescript-edit-benchmark, utils, wire` — **không có `core`**. Mọi neo dsh của work item này chỉ resolve trong `~/Projects/deepseek-harness`. Đừng tìm trong omp và đừng kết luận "file vô tồn tại".
