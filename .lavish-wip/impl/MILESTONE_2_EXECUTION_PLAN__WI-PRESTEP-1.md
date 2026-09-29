# Phiếu triển khai — WI-PRESTEP-1. Ghi durable turn khi bị chặn

| | |
| --- | --- |
| **Kế hoạch** | `MILESTONE_2_EXECUTION_PLAN.md` (HEAD `65cc6c1`), thân mục ở dòng **345–360** |
| **Mục tiêu dòng chốt** | `MILESTONE_2_EXECUTION_PLAN.md:5377` (hàng `WI-PRESTEP-1` của bảng *Định nghĩa hoàn thành*) |
| **omp HEAD** | `65cc6c1` |
| **dsh HEAD** (`deepseek-harness`) | `477b4f4` |
| **Ngày lập phiếu** | 2026-09-29 |
| **Số file phải chạm** | **7** (5 code + 1 test + 1 changelog) — xem bảng ở §2 |

---

## VIỆC 1 — Kiểm lại từng neo

### 1.1. Thân mục work item KHÔNG có neo `file:line` nào

Dòng 345–360 của plan — toàn bộ phần thân WI-PRESTEP-1 — **không chứa một neo dạng `đường/dẫn/tệp.ts:123` nào**. Nó chỉ nhắc tới ba thứ bằng **tên**, không kèm vị trí:

| Ký hiệu trong plan | Nhân bản | Trạng thái |
| --- | --- | --- |
| `` `agent/pre-step` `` | "là một **waterfall event**; listener có thể **reject**" | ✅ **ĐÚNG** — xem 1.2 |
| `` `session.deriveMessages()` `` | "mọi request là một phép suy ra thuần tuý từ append-only log" | ✅ **ĐÚNG** — xem 1.3 |
| `WI-1 (session log)` (dòng 359, mục *Phụ thuộc*) | | ❌ **HỎNG** — xem 1.4 |

Vì không có neo dạng `file:line` để mở, VIỆC 1 được thực hiện bằng cách **đi tìm chính các symbol mà plan nhắc tới**, đọc dòng thật, rồi ghi lại vị trí đúng. Mọi vị trí dưới đây đã được `sed -n "<n>p"` mở và đọc.

### 1.2. `agent/pre-step` là waterfall event, listener có thể reject — XÁC NHẬN

`/Users/tranquangdang21/Projects/deepseek-harness/packages/core/agent/src/runtime-types.ts`

```
:318      * @mode waterfall
:319      */
:320      'agent/pre-step'(this: Scoped<Agent>, payload: { agent: Agent; messages: UserMessage[]; turn: number; step: number; signal: AbortSignal }, next: () => Promise<PreStepDecision>): Promise<PreStepDecision>
```

JSDoc ngay trên kết thúc ở `:319` với đúng một dòng định danh chế độ — `@mode waterfall` tại `:318`. Đó là bằng chứng cơ học cho chữ "waterfall event" của plan, không phải suy luận.

`:112` cùng file là kiểu quyết định, và nhánh reject là chiếc hộp đầu tiên:

```
:112  export type PreStepDecision =
:113    | { kind: 'reject' }
:114    | {
:115        kind: 'enter'
:116        messages: UserMessage[]
```

Cả ba khẳng định của plan về dsh đều đúng. Nhưng plan **bỏ sót một điều kiện quan trọng** — xem mục 1.5.

### 1.3. `deriveMessages()` tồn tại đúng như plan nói — XÁC NHẬN

`/Users/tranquangdang21/Projects/deepseek-harness/packages/core/session/src/index.ts`

```
:860  deriveMessages(): Message[] {
```

(Đúng `session/src/index.ts:860` như WI-SESSION-LOG dẫn; file dài 1328 dòng nên `:860` nằm trong file.)

### 1.4. `WI-1 (session log)` — NEO HỎNG, trỏ nhầm work item

Plan `:359` viết: **`Phụ thuộc:** WI-1 (session log)`.

`grep -n "^## WI-1\." MILESTONE_2_EXECUTION_PLAN.md` → dòng **619**, và tiêu đề đầy đủ là:

```
619: ## WI-1. Gán timer và model-provider theo đúng extension đã tạo ra chúng, và thả chúng khi suspend
```

với phần "Thay đổi gì" ngay dòng 621: *"Khi một extension bị vô hiệu hoá, các interval nền mà nó đã lên lịch và model provider mà nó đã đăng ký ngày ngừng có tác dụng…"*. **Không liên quan gì tới session log.**

Work item mà WI-PRESTEP-1 thực sự phụ thuộc là **WI-SESSION-LOG**, ở dòng **268**:

```
268: ## WI-SESSION-LOG. Session log là nguồn sự thật duy nhất (thêm 2026-09-28)
```

> **Ghi ra, không sửa trong plan.** Khi implement, hãy coi `WI-SESSION-LOG` là tiền đề thật. Nếu theo đúng chữ, WI-PRESTEP-1 sẽ bị chặn vô lý bởi một work item về timer của extension.

### 1.5. "Khi reject, một durable turn vẫn được ghi vào session log" — ĐÚNG, NHƯNG CÓ ĐIỀU KIỆN PLAN KHÔNG NÊU

Cơ chế đúng, đọc tay tại `packages/core/agent-loop/src/agent.ts`:

```
:305      this.session.append('turn/start', { turn })
...
:316        const decision = await this.preStep(target, { turn, step })
:317        if (decision.kind === 'reject') {
:318          turnEnds = { kind: 'blocked' }
:319          return false
...
:365      } finally {
:366        try {
:368          this.session.append('turn/end', { turn, reason: turnEnds! })
```

`:305` mở turn **trước** khi pre-step chạy; `:318` đặt lý do `blocked`; `:368` trong `finally` đóng turn **bất kể điều gì xảy ra**. Lý do nằm ở `packages/core/session/src/types.ts:206`:

```
206:  blocked: { kind: 'blocked' }
```

Hợp đồng quan sát được, viết bằng test ở `packages/core/agent-loop/tests/interception.spec.ts:251`:

```
251:  it('reject closes the claimed prompt turn without a step or model call', async () => {
...
265:    expect(log.filter(e => e.type === 'turn/start' || e.type === 'turn/end').map(e => e.type))
266:      .toEqual(['turn/start', 'turn/end'])
267:    expect(log.some(e => e.type === 'user/message')).toBe(false)
268:    expect(log.some(e => e.type === 'step/start')).toBe(false)
269:    expect(reasons).toEqual([{ kind: 'blocked' }])
```

**Điều kiện plan không nêu.** `packages/core/session/src/types.ts:290-297`, JSDoc của `turn/end`, viết rõ:

> "The loop **does not await a flush at turn boundaries**: `dsh-session-checkpoint-policy` owns the per-request durability checkpoint, and consumers that read storage after `whenIdle()` flush themselves."

Nghĩa là trong dsh, "durable" nghĩa là **có trong append-only log**, chưa chắc đã nằm trên đĩa. Đó là bằng chứng rằng câu chữ plan "**vẫn truy vết được sau khi restart**" là một điều kiện mạnh hơn nhiều so với điều dsh bảo đảm — và trong omp nó còn mạnh hơn nữa (xem **Cạm bẫy #1** ở §6). Đây là lý do cổng phải được viết lại (§5).

### 1.6. Đo trên cây omp: cái plan gọi là "chỉ là thêm một event" — không có nền để thêm

Ba lệnh grep trên cây omp (không có hit nào, tôi đã chạy):

| lệnh | kết quả trên `packages/` của omp |
| --- | --- |
| `rg -n "deriveMessages" --type ts packages/` | **rỗng** |
| `rg -n "pre-step\|preStep\|PreStep" --type ts packages/` | **rỗng** |
| `rg -n "turn/start" --type ts packages/` | **rỗng** |
| `rg -n "waterfall" --type ts packages/` | **rỗng** |

omp **không có** event log turn, **không có** waterfall, **không có** `deriveMessages`. Nó ghi `SessionEntry` (một cây append-only entry, `session-entries.ts:300`) và tái dựng context qua `buildSessionContext` (`session-manager.ts:3115`). Đây là câu trả lời cho **Cổng mở bước 1** của chính mục này, và nó thay đổi cỡ ước lượng: **đây không phải "thêm một event"** — phải thêm **một loại entry mới** và **vá cổng tạo file**.

---

## VIỆC 2 — Nội dung phiếu

### 1. Cái gì thay đổi, quan sát được

> Sau khi gõ xong, bấm Esc (hoặc để một lượt bị chặn ở bước trước khi gọi model) **vẫn để lại một entry trong file session**, entry đó không bao giờ xuất hiện trong context gửi cho model, và transcript mặc định không hiện nó — người dùng phải mở mới thấy.

### 2. Bảng điểm sửa

Cột TRƯỚC trích **nguyên văn từ file thật** tại HEAD `65cc6c1`. Cột SAU là **hình dạng** sau khi sửa (không phải code hoàn chỉnh).

| path | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/session-entries.ts` | `SessionEntry` union (`:300`) + entry mới | union hiện bắt đầu `export type SessionEntry = \| SessionMessageEntry \| ModelUsageEntry` (`:300-302`); `LabelEntry` (`:184-189`) là tiền lệ của một **entry kiểm toán không-message**: `type: "label"; targetId: string; label: string \| undefined;` | Thêm một entry mới theo đúng khuôn `LabelEntry`, cạnh nó: `type: "blocked_turn"`, `reason: BlockedTurnReason`, `text: string` (prompt như đã gõ), `images?: number` (số ảnh đính kèm, **không** nhúng blob), `source: "abort" \| "preflight" \| "policy"`. **KHÔNG** dùng `custom_message` — xem Cạm bẫy #2. |
| `packages/coding-agent/src/session/session-manager.ts` | `#shouldHaveSessionFile()` (`:1137-1139`) | `return this.#forceFileCreation \|\| this.#fileIsCurrent \|\| this.#historyContainsAssistantMessage();` với `#historyContainsAssistantMessage()` (`:1133-1135`) = `return this.#entries.some(isAssistantEntry);` | Thêm một vế: `\|\| this.#historyContainsBlockedTurnEntry()`. Nếu không, lượt bị chặn **đầu tiên của một session mới** không tạo file — xem Cạm bẫy #1. |
| `packages/coding-agent/src/session/session-manager.ts` | `appendMessage` (`:2777-2786`) | `): string { const entry: SessionMessageEntry = { type: "message", ...this.#freshEntryFields(), message }; this.#recordEntry(entry); return entry.id; }` | Thêm `appendBlockedTurnEntry(input: BlockedTurnInput): string` cùng hình dạng: dựng entry `{ type: "blocked_turn", ...this.#freshEntryFields(), ...input }`, gọi `this.#recordEntry(entry)`, trả `entry.id`. **Tái dùng `#recordEntry`** (`:1580-1595`) để hưởng `#appendToSessionFile` + `#notifyEntryAppended` — không tự viết đường ghi file thứ hai. |
| `packages/coding-agent/src/session/agent-session.ts` | `prompt()` — nhánh drop (`:7014-7022`) | `outcome.sessionClaimed = dispatched;`<br>`if (!dispatched && message.role === "user") {`<br>`// An abort (Esc) or preflight denial raced turn setup: the prompt never`<br>`// reached the agent or the session file. Hand it back to the host so the`<br>`// user can edit/resubmit instead of losing it (tree/branch can't offer`<br>`// a message that was never persisted).`<br>`this.#promptDropped?.({ text: typedText, images: options?.images });`<br>`}`<br>`if (!dispatched && options?.throwOnDrop) throw new PromptDroppedError();` | Chèn `this.sessionManager.appendBlockedTurnEntry({...})` vào **trước** `this.#promptDropped?.(...)` trong cùng `if`. Comment phải viết lại vì nó **hết đúng**: "never reached the agent or the session file" không còn đúng nữa. |
| `packages/coding-agent/src/session/agent-session.ts` | `prompt()` — nhánh `AgentStartPolicyChangedError` (`:7003-7008`) | `} catch (error) {`<br>`if (error instanceof AgentStartPolicyChangedError && message.role === "user") {`<br>`this.#promptDropped?.({ text: typedText, images: options?.images });`<br>`}`<br>`throw error;`<br>`}` | Ghi entry ở đây nữa, với `reason: "policy"` — đây là lượt bị chặn bởi `before_agent_start` đổi hệ thống quá `AGENT_START_POLICY_MAX_ATTEMPTS` (hằng ở `:501`), và nó **không** đi qua nhánh `!dispatched`. Thiếu nhánh này là mất đúng trường hợp mà `AgentStartPolicyChangedError` sinh ra. |
| `packages/coding-agent/src/session/session-context.ts` | `BuildSessionContextOptions` (`:149-155`) + `appendMessage` (`:380-389`) | options: `transcript?: boolean; collapseCompactedHistory?: boolean; keepDanglingToolCalls?: boolean; resolveFrameData?: ...`<br>`appendMessage` hiện bỏ qua entry assistant lỗi khi `!options?.transcript && entry.message.role === "assistant" && (entry.message.retryRecovery \|\| isEmptyErrorTurn(entry.message))` | Thêm `revealBlockedTurns?: boolean` vào options. Trong `appendMessage`, thêm nhánh `else if (entry.type === "blocked_turn" && options?.revealBlockedTurns) { pushMessage(blockedTurnMarkerMessage(entry)) }` — và **chỉ** khi cờ bật. Không bật thì entry rơi qua mọi nhánh và không sinh message, tức **ẩn ở cả hai chế độ**. |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` (dòng 3) | dòng 3 = `## [Unreleased]`, dòng 4 trống, dòng 5 = `### Security` (mục duy nhất đang có trong Unreleased), dòng 7 = dòng entry Security, dòng 9 = `## [18.4.0] - 2026-09-28` — **mục đã phát hành, bất biến** | Một dòng ngay dưới `## [Unreleased]`, dạng: `Recorded blocked turns in the session log instead of dropping them silently`. Đặt trong section thích hợp (đây là `Added`; tạo mới nếu chưa có). **Đừng tranh thứ tự section** — `bun run release` chạy `fix-changelogs` tự chuẩn hoá, và AGENTS.md cấm flag thứ tự section trong review. Tuyệt đối không chèn vào `## [18.4.0]` trở xuống. |

**Không sửa**: `packages/coding-agent/src/session/turn-persistence.ts`, `session-loader.ts`, `interactive-mode.ts` — trừ khi bước 6 chọn phương án hiển thị cần tới (xem §3 bước 6).

### 3. Các bước

1. **Đóng băng hình dạng entry trước khi động tới code.** Đọc `session-entries.ts:184-189` (`LabelEntry`) và `session-entries.ts:280-297` (`CustomMessageEntry`) cạnh nhau. Viết ra entry mới theo khuôn `LabelEntry`, **không** theo khuôn `CustomMessageEntry`. Lý do nằm ngay trong JSDoc `:280-281`: *"Unlike CustomEntry, this **DOES participate in LLM context**."* Một marker "lượt bị chặn" đi vào context model là thứ mà toàn bộ WI-SESSION-LOG đang cố đi ngược lại. *(neo đã kiểm: `packages/coding-agent/src/session/session-entries.ts:280`, `:284-285`, `:290-291`)*

2. **Đóng băng đường ghi.** Đọc `session-manager.ts:1580-1595` (`#recordEntry`) và `session-manager.ts:2777-2786` (`appendMessage`). `appendBlockedTurnEntry` phải đi qua `#recordEntry` — không gọi `#appendToSessionFile` trực tiếp, không có đường ghi file riêng. *(neo đã kiểm: `packages/coding-agent/src/session/session-manager.ts:1593` là `this.#appendToSessionFile(entry);` bên trong `#recordEntry`)*

3. **Sửa cổng tạo file — làm bước này TRƯỚC khi nối call site.** Đọc `session-manager.ts:1133-1139`. Ghi ra bằng chữ lý do: nếu không sửa, lượt bị chặn đầu tiên của session mới sẽ nằm trong `#entries` (RAM) và **không** trong file, nên "truy vết được sau khi restart" là đúng trên giấy và sai ngoài đời. *(neo đã kiểm: `packages/coding-agent/src/session/session-manager.ts:1138`)*

4. **Nối hai call site drop, không phải một.** Cả hai đều phải ghi, và mỗi cái một `reason`. Đọc `agent-session.ts:7003-7008` và `agent-session.ts:7014-7022` trước khi sửa; cập nhật comment ở `:7016-7019` vì câu *"the prompt never reached the agent or the session file"* trở thành sai. *(neo đã kiểm: `packages/coding-agent/src/session/agent-session.ts:7003` = `} catch (error) {`, `:7004` = `if (error instanceof AgentStartPolicyChangedError && message.role === "user") {`, `:7005` = `this.#promptDropped?.({ text: typedText, images: options?.images });`, `:7015` = `if (!dispatched && message.role === "user") {`, `:7018` = `this.#promptDropped?.({ text: typedText, images: options?.images });`, `:7020` = `}` đóng if)*

5. **Thêm cờ mở, không thêm nhánh hiển thị vô điều kiện.** Đọc `session-context.ts:149-155` rồi `session-context.ts:380-389`. Thêm `revealBlockedTurns?: boolean`. Marker **chỉ** được `pushMessage` khi cờ bật. Lưu ý chiều: nhánh sẵn có ở `:383-388` đi **ngược** chiều của bạn — nó **ẩn** ở chế độ non-transcript và **hiện** ở chế độ transcript. Đừng lấy nó làm mẫu; lấy `custom_message` `display:false` (`:285-287` của `session-entries.ts`, tiêu thụ ở `modes/utils/ui-helpers.ts:196`) làm mẫu cho "có trong log, không hiện". *(neo đã kiểm: `packages/coding-agent/src/session/session-context.ts:383`, `:386`; `packages/coding-agent/src/modes/utils/ui-helpers.ts:196`)*

6. **Chốt phương án hiển thị và GHI TÊN NGƯỜI QUYẾT.** Đây là quyết định sản phẩm mà plan yêu cầu (`:363-364`: *"đó là quyết định sản phẩm, phải ghi tên người quyết (WI-10 style)"*). Ba phương án: (a) lệnh session, ví dụ `/blocked-turns`, in ra danh sách từ entry; (b) tự động hiện trong transcript dạng divider mờ, không cần lệnh; (c) chỉ hiện qua `/export`. **(a) là mặc định đề xuất** vì nó là phương án duy nhất không thêm hàng vào mọi transcript. Ghi tên người quyết và ngày vào changelog, không ghi vào code. *(chưa có neo — đây là quyết định, không phải vị trí file)*

7. **Chạy cổng, ghi biên bản đỏ-trước/xanh-sau.** Xem §5.

### 4. Hợp đồng test

**File mới:** `packages/coding-agent/test/agent-session-blocked-turn-record.test.ts`

Bốn case, mỗi case bảo vệ **một hợp đồng quan sát được khác nhau** — không được gộp, không được lặp lại nhau qua cùng một mock:

| # | Case | Khẳng định | Hợp đồng nó bảo vệ | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- | --- |
| 1 | **Lượt bị chặn đầu tiên của session mới vẫn tạo file** | Sau khi drop, `existsSync(sessionFile)` là `true`, và đọc lại file ra **một** entry có `type: "blocked_turn"` với `text` khớp prompt đã gõ | Cổng tạo file của bước 3 | Restart xong, mở session đó, và thấy **trống trơn** — lượt bị chặn biến mất sạch. Đây là hồi quy âm thầm nguy hiểm nhất. |
| 2 | **Entry không bao giờ vào context gửi cho model** | `buildSessionContext(entries)` (không truyền options) trả `messages` **không** chứa marker; nhưng `entries` **có** chứa nó | "log ≠ model-visible" | Model bắt đầu trả lời câu hỏi về một lượt mà người dùng chưa từng gửi, hoặc token tăng lên mỗi lượt bị chặn. |
| 3 | **Transcript mặc định ẩn, bật cờ thì hiện** | `buildSessionContext(entries, undefined, undefined, {})` không có marker; `{ revealBlockedTurns: true }` thì **có** đúng một | Nhánh phủ định của bước 5 | Transcript mặc định lấp đầy những dòng "đã bị chặn" của hàng chục lượt abort, hoặc — ngược lại, tệ hơn — cờ mở bị bỏ sót và người dùng không bao giờ thấy lượt nào. |
| 4 | **Cả hai call site đều ghi, với `reason` khác nhau** | Nhánh `!dispatched` cho `reason: "abort"`; nhánh `AgentStartPolicyChangedError` cho `reason: "policy"` | Bước 4 — nhánh phủ định của "chỉ nối một chỗ" | Người dùng bấm Esc thì thấy, nhưng một lượt bị chặn bởi chính sách `before_agent_start` thì không — và đó mới là lượt họ cần biết nhất. |

**Cấm tuyệt đối:** đọc file nguồn rồi khẳng định về *chữ* của nó (`expect(src).toContain("appendBlockedTurnEntry")`) — AGENTS.md cấm, và nó xanh trong lúc hành vi đã hỏng. Case 1 và 2 phải **đọc lại file JSONL thật** và `buildSessionContext` thật.

**Tiền đề môi trường (đã xác minh, plan `:57-64`, mục *Điều kiện tiên quyết*):** `bun test` chết ngay ở bước import với `'Failed to load pi_natives native addon for darwin-arm64'` nếu chưa build addon.

```bash
brew install ninja
bun --cwd=packages/natives run build
```

### 5. Cổng

#### 5.1. Cổng như plan viết — trả lời thẳng: **KHÔNG đỏ được**

Cổng hoàn thành nguyên văn của plan (`:365-366` và lặp lại ở `:5377`):

> Một lượt bị chặn **vẫn truy vết được sau khi restart**, và transcript mặc định **không** hiển thị nó trừ khi người dùng mở.

Cột "bằng chứng" của bảng `:5377` là: *"Đọc lại log của session sau khi restart và thấy lượt bị chặn; transcript mặc định không hiện nó, bật hiển thị thì hiện."*

**Vấn đề:** "bật hiển thị" là **một hành động mà plan không định nghĩa**. Không có tên lệnh, không có tên cờ, không có tên entry. Không có câu lệnh nào trong repo có thể kiểm "một người đã bật hiển thị lượt bị chặn" khi cái bật đó chưa được đặt tên. Và vế "sau khi restart" là một thao tác tay — restart một tiến trình để kiểm một entry JSONL là việc **không tự động hoá được** bằng một lệnh `grep`.

Nếu giữ nguyên, đây là một cổng **luôn xanh tệ hơn không có cổng**: nó tạo cảm giác an toàn giả cho đúng mục mà plan tự nói là "bằng chứng vĩnh viễn rằng *agent đã thử nhưng bị chặn*".

#### 5.2. Cổng viết lại — đỎ ĐƯỢC, bằng cách nào

Đặt tên cụ thể cho cả hai vế, rồi kiểm bằng lệnh thật.

| # | Điều kiện chốt | Lệnh | Đỏ được vì |
| --- | --- | --- | --- |
| G1 | Entry tồn tại và có **hai** call site nối vào | `rg -c 'appendBlockedTurnEntry' packages/coding-agent/src/session/agent-session.ts` | Định nghĩa trong `session-manager.ts` cho `>= 1`; hai call site trong `agent-session.ts` cho `>= 3` tổng cộng (def + 2 nơi gọi). Thiếu một nhánh là đỏ. |
| G2 | Cổng tạo file đã mở cho entry này | `rg -n 'historyContainsBlockedTurnEntry' packages/coding-agent/src/session/session-manager.ts` phải ra **cả hai** dòng: dòng định nghĩa và dòng dùng trong `#shouldHaveSessionFile` | Bám **tên hàm**, không bám từ khoá rời. Chỉ grep `blocked_turn` thì xanh ngay cả khi cổng tạo file vẫn đóng — đúng cái lỗi làm case 1 hỏng. |
| G3 | Bốn test case tồn tại và **xanh** | `bun test test/agent-session-blocked-turn-record.test.ts` báo `4 pass / 0 fail` | Xanh khi xanh. |
| G4 | Biên bản đỏ-trước được ghi lại | PR body có **ảnh chụp output** của cùng lệnh trên HEAD `65cc6c1` (chưa sửa) | Không có ảnh thì G3 là một lời hứa. Đây là điều kiện **mắt người**, xem 5.3. |
| G5 | Người quyết phương án hiển thị được ghi tên | `rg -n 'Blocked-turn visibility decider' packages/coding-agent/CHANGELOG.md` | Bám **nguyên văn nhãn dòng**, không bám `decider\|owner\|quyết`. Một `grep -i owner` sẽ xanh dù cột còn trống. |
| G6 | Không lọt `custom_message` | `rg -n 'type: "custom_message".*blocked' packages/coding-agent/src` rỗng | Chặn đúng cái lỗi làm marker lọt vào context model. |
| G7 | `bun run check:ts` exit 0 | `bun run check:ts; echo $?` | Đỏ thật khi type hỏng. **Không** dùng `tsc`/`npx tsc` — AGENTS.md cấm tuyệt đối. |

**Sáu trên bảy đỏ được bằng máy.** Riêng G4 là ảnh chụp phải do người gửi PR dán — máy không tự sinh được ảnh của một trạng thái quá khứ.

#### 5.3. Cổng này tự bảo vệ tới đâu — nói thẳng

Mạnh: G1, G2, G3, G6, G7 là kiểm tra cấu trúc và hành vi, đều đỏ được, đều tự động.

Yếu, và phải nói ra:

- **G4 là ảnh chụp, không phải phép đo.** Một PR có thể dán ảnh từ lần chạy thứ hai. Cách chắc hơn: chạy `bun test test/agent-session-blocked-turn-record.test.ts` trên HEAD sạch **trước khi** viết dòng đầu tiên, lưu output ra, rồi dán. Khi đó ảnh là bằng chứng, không phải lời hứa.
- **Vế "sau khi restart" trong cổng gốc không được cổng nào bảo vệ.** Case 1 chỉ chứng minh entry **có trong file**; nó không chứng minh `loadEntriesFromFile` đọc lại được. Nếu muốn phủ đúng nghĩa "sau restart", thêm case 5: nạp lại qua `loadSessionMessagesReadOnly` (`session-loader.ts:539`, đã kiểm) và khẳng định entry còn đó. Nên làm — nó là một dòng, và nó là dòng duy nhất bảo vệ đúng từ "restart" mà plan dùng.
- **Không cổng nào bảo vệ phần "trừ khi người dùng mở" ở mức con người.** G3 chứng minh cờ hoạt động. Nó không chứng minh một người dùng thật tìm thấy lệnh đó mà không cần đọc mã. Nếu phương án (a) ở bước 6 được chọn, cột bằng chứng của bảng `:5377` phải thêm một dòng tay: screenshot lệnh trong TUI.

### 6. Cạm bẫy riêng của work item này

Xếp theo mức độ sát thương nếu làm sai.

**#1 — Lượt bị chặn đầu tiên của session mới không tạo file, và test của bạn vẫn xanh.**
`session-manager.ts:1133-1139`:
```
:1133  #historyContainsAssistantMessage(): boolean {
:1134    return this.#entries.some(isAssistantEntry);
:1137  #shouldHaveSessionFile(): boolean {
:1138    return this.#forceFileCreation || this.#fileIsCurrent || this.#historyContainsAssistantMessage();
```
Lượt bị chặn không có assistant message. Trên một session **đã có** lịch sử thì `#fileIsCurrent` đã true nên entry vẫn xuống đĩa — và test của bạn sẽ xanh. Nhưng trên session **mới** — tức đúng tình huống người dùng gặp nhiều nhất — file không tồn tại. Đây là lý do case 1 của hợp đồng test phải là **lượt đầu tiên của session mới**, không phải "thêm một lượt nữa vào session đang chạy". Không có cổng nào bắt được cái này nếu test viết sai.

**#2 — Dùng `custom_message` vì nó có sẵn `display: false`, và lỡ tay làm marker đi vào context model.**
`session-entries.ts:280-281` viết rõ: *"Unlike CustomEntry, this **DOES participate in LLM context**."* `display: false` chỉ ẩn ở TUI (`modes/utils/ui-helpers.ts:196`) và ở export (`session-history-format.ts:574`) — nó **không** ẩn khỏi LLM. Đây là cái bẫy nhiều khả năng nhất vì `display: false` trông như đúng cái bạn cần. Đáp án đúng là entry **không thuộc loại message**, theo khuôn `LabelEntry` (`session-entries.ts:184-189`).

**#3 — Copy chiều của nhánn sẵn có ở `session-context.ts:383-388`.**
```
:383      if (
:384        !options?.transcript &&
:385        entry.message.role === "assistant" &&
:386        (entry.message.retryRecovery || isEmptyErrorTurn(entry.message))
:387      ) {
:388        return;
```
Nhánh này **ẩn ở non-transcript và hiện ở transcript** — ngược chiều với yêu cầu của bạn ("mặc định ẩn trong transcript, mở thì hiện"). Nó là mẫu gần nhất trong codebase nên rất dễ sao chép nhầm. Đọc nó để hiểu **cơ chế lọc**, không để sao chép **chiều**.

**#4 — Bỏ nhánh `AgentStartPolicyChangedError`.**
`agent-session.ts:7004-7008` nằm trong `catch`, tách khỏi nhánh `!dispatched` ở `:7015`. Nếu chỉ nối `!dispatched`, bạn ghi được lượt bị Esc nhưng **không** ghi được lượt bị chính sách `before_agent_start` chặn. Lượt đó mới là lượt mà người dùng cần nhìn thấy nhất, vì nó không phải họ bấm Esc. Case 4 của hợp đồng test đứng canh đúng chỗ này.

**#5 — Tin rằng "durable" trong dsh nghĩa là "đã trên đĩa".**
`packages/core/session/src/types.ts:290-297` nói thẳng loop **không** flush tại biên turn. Trong omp, `#appendToSessionFile` (`session-manager.ts:1593`) ghi đồng bộ từng entry, nên omp gần hơn — nhưng Cạm bẫy #1 vẫn phá nó. Đừng dùng "dsh làm được" làm lý do để bỏ qua bước 3.

**#6 — Sửa comment cũ cho khớp code, hoặc để nguyên comment cũ.**
`agent-session.ts:7016-7019` đang viết: *"the prompt never reached the agent or the session file"*. Sau thay đổi này câu đó **sai**, và nó sai theo hướng khiến người đọc tiếp tục tin rằng không có gì được ghi. Sửa nó cùng lúc; đây là loại bình luận mà `antislop-code` nói phải giữ giá trị, và giá trị của nó là **đúng**.

---

## Phụ lục — bảng kiểm neo (đã mở và đọc từng dòng)

| Neo | File | Nội dung dòng | Đúng không |
| --- | --- | --- | --- |
| — | `MILESTONE_2_EXECUTION_PLAN.md:345` | `## WI-PRESTEP-1. Ghi durable turn khi bị chặn (thêm 2026-09-28, đặt trước M4)` | ✅ đúng vị trí |
| — | `MILESTONE_2_EXECUTION_PLAN.md:359` | `**Phụ thuộc:** WI-1 (session log).` | ❌ **trỏ nhầm** → WI-SESSION-LOG ở `:268` |
| — | `MILESTONE_2_EXECUTION_PLAN.md:365-366` | `**Cổng hoàn thành:**` một lượt bị chặn vẫn truy vết được sau khi restart… | ⚠️ có thật, nhưng **không đỏ được** — xem §5.1 |
| — | `MILESTONE_2_EXECUTION_PLAN.md:5377` | hàng `WI-PRESTEP-1` của bảng *Định nghĩa hoàn thành* | ✅ đúng vị trí |
| dsh | `packages/core/agent/src/runtime-types.ts:320` | `'agent/pre-step'(this: Scoped<Agent>, payload: {…}, next: () => Promise<PreStepDecision>): Promise<PreStepDecision>` | ✅ đúng |
| dsh | `packages/core/agent/src/runtime-types.ts:318` | ` * @mode waterfall` (JSDoc đóng ở `:319`, chữ ký ở `:320`) | ✅ đúng — xác nhận "waterfall event" |
| dsh | `packages/core/agent/src/runtime-types.ts:112` | `export type PreStepDecision =` (`:113` = `\| { kind: 'reject' }`) | ✅ đúng — xác nhận "listener có thể reject" |
| dsh | `packages/core/agent-loop/src/agent.ts:305` | `this.session.append('turn/start', { turn })` | ✅ đúng |
| dsh | `packages/core/agent-loop/src/agent.ts:318` | `turnEnds = { kind: 'blocked' }` | ✅ đúng |
| dsh | `packages/core/agent-loop/src/agent.ts:368` | `this.session.append('turn/end', { turn, reason: turnEnds! })` | ✅ đúng |
| dsh | `packages/core/session/src/types.ts:206` | `blocked: { kind: 'blocked' }` | ✅ đúng |
| dsh | `packages/core/session/src/types.ts:290-297` | JSDoc `turn/end`: "The loop does not await a flush at turn boundaries" | ✅ có thật — **caveat plan thiếu** |
| dsh | `packages/core/session/src/index.ts:860` | `deriveMessages(): Message[] {` | ✅ đúng |
| dsh | `packages/core/agent-loop/tests/interception.spec.ts:251` | `it('reject closes the claimed prompt turn without a step or model call', …)` | ✅ hợp đồng tham chiếu |
| omp | `packages/coding-agent/src/session/agent-session.ts:506` | `super("System prompt changed repeatedly during before_agent_start; original input was not delivered.");` | ✅ đúng |
| omp | `packages/coding-agent/src/session/session-manager.ts:3115` | `buildSessionContext(options?: BuildSessionContextOptions): SessionContext {` | ✅ đúng |
| omp | `packages/coding-agent/src/session/agent-session.ts:7003-7005` | `} catch (error) {` / `if (error instanceof AgentStartPolicyChangedError && message.role === "user") {` / `this.#promptDropped?.({ text: typedText, images: options?.images });` | ✅ đúng |
| omp | `packages/coding-agent/src/session/agent-session.ts:7015` | `if (!dispatched && message.role === "user") {` | ✅ đúng |
| omp | `packages/coding-agent/src/session/agent-session.ts:7018` | `this.#promptDropped?.({ text: typedText, images: options?.images });` | ✅ đúng |
| omp | `packages/coding-agent/src/session/agent-session.ts:7022` | `if (!dispatched && options?.throwOnDrop) throw new PromptDroppedError();` | ✅ đúng |
| omp | `packages/coding-agent/src/session/agent-session.ts:501` | `const AGENT_START_POLICY_MAX_ATTEMPTS = 3;` | ✅ đúng |
| omp | `packages/coding-agent/src/session/agent-session.ts:8754` | `setPromptDropped(handler: ((prompt: DroppedPrompt) => void) \| undefined): void {` | ✅ đúng |
| omp | `packages/coding-agent/src/session/agent-session-types.ts:392` | `export interface DroppedPrompt {` (JSDoc `:389-391`: "it was never persisted to the session") | ✅ đúng |
| omp | `packages/coding-agent/src/modes/interactive-mode.ts:2819` | `#restoreDroppedPrompt(prompt: DroppedPrompt): void {` | ✅ đúng |
| omp | `packages/coding-agent/src/session/session-manager.ts:1137-1139` | `#shouldHaveSessionFile()` | ✅ đúng — **cổng tạo file, Cạm bẫy #1** |
| omp | `packages/coding-agent/src/session/session-manager.ts:1133-1135` | `#historyContainsAssistantMessage()` | ✅ đúng |
| omp | `packages/coding-agent/src/session/session-manager.ts:2777-2786` | `appendMessage(...)` | ✅ đúng — hình dạng mẫu |
| omp | `packages/coding-agent/src/session/session-manager.ts:1593` | `this.#appendToSessionFile(entry);` trong `#recordEntry` | ✅ đúng |
| omp | `packages/coding-agent/src/session/session-entries.ts:184-189` | `LabelEntry` | ✅ đúng — khuôn entry kiểm toán |
| omp | `packages/coding-agent/src/session/session-entries.ts:280-281` | "Unlike CustomEntry, this **DOES participate in LLM context**." | ✅ đúng — Cạm bẫy #2 |
| omp | `packages/coding-agent/src/session/session-entries.ts:290-291` | `display: boolean;` + JSDoc "false: hidden entirely" | ✅ đúng |
| omp | `packages/coding-agent/src/session/session-context.ts:149-155` | `BuildSessionContextOptions` | ✅ đúng |
| omp | `packages/coding-agent/src/session/session-context.ts:383-388` | nhánh lọc assistant lỗi, **ngược chiều** | ✅ đúng — Cạm bẫy #3 |
| omp | `packages/coding-agent/src/modes/utils/ui-helpers.ts:196` | `if (message.display) {` | ✅ đúng |
| omp | `packages/coding-agent/src/session/session-loader.ts:539` | `transcript: true,` trong `loadSessionMessagesReadOnly` | ✅ đúng — đường "sau restart" |
| omp | `packages/coding-agent/CHANGELOG.md:3` | `## [Unreleased]` (dòng 5 = `### Security`, dòng 9 = `## [18.4.0] - 2026-09-28` — mục đã phát hành) | ✅ xác nhận vị trí chèn |
| plan | `MILESTONE_2_EXECUTION_PLAN.md:57-64` | mục *Điều kiện tiên quyết*, tiền đề build addon native | ✅ đúng |

**Tổng: 37 dòng kiểm, mỗi dòng đều đã `sed -n "<n>p"` rồi đọc. 35 đúng vị trí và nội dung; 1 sai (`WI-1 (session log)` ở plan `:359` → phải là `WI-SESSION-LOG` ở `:268`); 1 phải viết lại (cổng ở plan `:365-366` — có thật nhưng không đỏ được, xem §5.1).**
