# Phiếu triển khai — M4-14 (ghi chú định danh)

**Work item trong kế hoạch:** `MILESTONE_4_EXECUTION_PLAN.md:2149` — `## GAP-M4-13. Cặp audit bền vững cho mỗi lần hỏi quyền: sau một crash, trả lời được "ai đã duyệt cái này" (sóng B)`

> **Lệch định danh — đọc trước khi gõ.** Harness giao nhiệm vụ là `M4-14`, nhưng tiêu đề `Cặp audit bền vững cho mỗi lần hỏi quyền` nằm ở hàng **2149** dưới heading `GAP-M4-13`. Hàng 2302 mới là `GAP-M4-14` (`Bảng feature → cơ chế`, sóng D, không liên quan). Tôi bám **tiêu đề**, vì tiêu đề khớp nguyên văn; số thứ tự thì lệch một. File này ghi theo tên file mà nhiệm vụ chỉ định. Nếu bạn muốn `M4-14` mang nghĩa khác, đổi tên file, đừng đổi nội dung.

**Ngày kiểm:** 2026-09-29 · **Cây đã mở:** `ultraworkers` (omp). Bảy cây tham chiếu (`pi-ref`, `deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref`, `senpi-ref`) đều tồn tại nhưng work item này không trỏ vào chúng — mọi neo nằm trong `packages/coding-agent/src/` của omp. Tôi đã quét tìm tiền lệ "approval audit bền vững" trong cả bảy cây: không có cây nào có tương đương, nên không có mẫu tham chiếu để trích.

---

## 1. Cái gì thay đổi, quan sát được

Sau một crash, `omp approval-audit --call-id <id>` in ra ai đã hỏi quyền, ai đã bấm, chính sách nào đã được chọn, và tool có chạy không — trong khi hôm nay transcript cho thấy một `tool_use` không có `tool_result` và không phân biệt được "người đã duyệt rồi máy chết" với "cổng quyền chưa từng chạy".

---

## 2. Bảng điểm sửa

| đường/dẫn | symbol | TRƯỚC (nguyên văn từ file) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/session-entries.ts` | `ApprovalEntry` (chưa có) | union `SessionEntry` kết thúc ở `\| ResetBoundaryEntry;` — không có biến thể approval | thêm `export interface ApprovalEntry extends SessionEntryBase { type: "approval"; … }` và thêm `\| ApprovalEntry` vào union |
| `packages/coding-agent/src/session/session-manager.ts` | `appendApproval` (chưa có) | `appendCustomEntry(customType: string, data?: unknown): string {` (`:2951`) và `appendModelChange(model: string, role?: string, resolvedModelIsFallback = false): string {` (`:2873`) | thêm `appendApproval(...)` theo **đúng khuôn** của hai hàm trên: dựng entry, `...this.#freshEntryFields()`, `this.#recordEntry(entry)`, `return entry.id` |
| `packages/coding-agent/src/extensibility/extensions/wrapper.ts` | khối `if (approvalCheck.required)` | `const hasApprovalHandlers = this.runner.hasHandlers("tool_approval_requested") \|\| this.runner.hasHandlers("tool_approval_resolved");` (`:323`) — **cả khối emit nằm sau cổng này** | ghi audit **ngoài** `hasApprovalHandlers`, ngay trên `if (approvalCheck.required)`, để bản ghi không phụ thuộc việc có extension handler hay không |
| `packages/coding-agent/src/cli-commands.ts` | `commands` | `export const commands: CommandEntry[] = [` (`:27`), hiện có `stats`, `render`, `skill`, `token`… | thêm một entry `{ name: "approval-audit", load: () => import("./commands/approval-audit").then(m => m.default), help: commandHelp.approvalAuditHelp }` |
| `packages/coding-agent/src/cli/command-help.ts` | `approvalAuditHelp` (chưa có) | — | thêm help text, theo khuôn các help đứa cạnh |

---

## 3. Các bước — mỗi bước có neo đã kiểm

### Bước 1 — Dừng lại và đọc mục 5. Mục này **chưa sẵn sàng để gõ**, vì hai điều quyết định còn treo và tôi đã tìm ra một lý do kỹ thuật làm một trong hai câu trả lời gần như chắc chắn sai.

Câu hỏi treo thứ nhất là `EPHEMERAL_MODEL_CHANGE_ROLE` có phải cơ chế "trong log, không trong model" không. **Nó không phải.** Tôi đã mở định nghĩa:

```
packages/coding-agent/src/session/session-entries.ts:33
	export const EPHEMERAL_MODEL_CHANGE_ROLE = "fallback";
```

Đó là một **chuỗi vai trò model** đánh dấu một lần đổi model tạm. Đọc hết mọi chỗ dùng trong `src/`:

```
session-context.ts:129      if (... lastModelChangeRole === EPHEMERAL_MODEL_CHANGE_ROLE)   → chọn model khôi phục
model-controls.ts:284       options?.ephemeral ? EPHEMERAL_MODEL_CHANGE_ROLE : "temporary"  → đặt vai trò khi ghi
turn-recovery.ts:1686       nếu role === EPHEMERAL… thì bỏ qua gợi ý retry
turn-recovery.ts:1958       appendModelChange(sel, EPHEMERAL_MODEL_CHANGE_ROLE, true)
turn-recovery.ts:2174       appendModelChange(base, EPHEMERAL_MODEL_CHANGE_ROLE, true)
turn-recovery.ts:2241       appendModelChange(primary, EPHEMERAL_MODEL_CHANGE_ROLE)
persisted-agents.ts:230/328 bỏ qua khi lưu agent đã persist
```

Không chỗ nào lọc context của model. Cơ chế thật nằm ở chỗ khác, và tôi đã mở nó:

```
packages/coding-agent/src/session/session-context.ts:212
	export type TranscriptEntry = SessionMessageEntry | CustomMessageEntry;
packages/coding-agent/src/session/session-context.ts:214
	export function isTranscriptEntry(entry: SessionEntry): entry is TranscriptEntry {
	packages/coding-agent/src/session/session-context.ts:215
		return entry.type === "message" || entry.type === "custom_message";
	packages/coding-agent/src/session/session-context.ts:218
	export function buildSessionContext(
```

Đó mới là "trong log, không trong model": **bất kỳ entry nào `type` không phải `message` và không phải `custom_message` thì bị loại khỏi context một cách cấu trúc.** `ApprovalEntry` với `type: "approval"` được miễn nhiễm theo định nghĩa, không cần thêm bộ lọc nào — đúng tinh thần "đừng nhân bản đường lọc" mà work item muốn, nhưng vì một lý do khác và không cần đụng tới `EPHEMERAL_MODEL_CHANGE_ROLE`.

→ Viết lại bước này thành: **tái dùng `isTranscriptEntry` (tức là: chọn `type` không thuộc `{message, custom_message}`), đừng tái dùng `EPHEMERAL_MODEL_CHANGE_ROLE`, và đừng thêm bộ lọc thứ hai.**

### Bước 2 — Chỗ ghi bản ghi: kế hoạch trỏ sai, và cái sai nằm đúng chỗ dễ sai nhất

Kế hoạch viết: "`resolveApproval` (`wrapper.ts:290`) là nơi duy nhất quyết định chính sách, nên bản ghi phải lấy từ **đó**". Tôi đã mở `wrapper.ts:290`:

```
		const resolved = resolveApproval(this.tool, resolvedArgs, approvalMode, userPolicies);
```

Đó là **call site**, không phải định nghĩa. `wrapper.ts:18` chỉ `import { resolveApproval }` từ `../tools/approval`. Định nghĩa thật:

```
packages/coding-agent/src/tools/approval.ts:203
	export function resolveApproval(
		tool: ApprovalSubject,
		args: unknown,
		mode: ApprovalMode,
		userConfig: Record<string, unknown> = {},
	): ResolvedApproval {
```

Đây là một hàm thuần bốn tham số, **không có session handle, không có context**. Không thể ghi vào transcript từ trong nó mà không đổi chữ ký thành một callback tùy ý — tức là biến một hàm thuần thành hàm có tác dụng phụ, đúng cái làm mất khả năng suy luận của nó.

Và nếu quay sang phương án còn lại là "ghi ở call site", `resolveApproval` có **bảy** call site trong `src/`:

```
cursor.ts:341          cursor.ts:1012        modes/controllers/event-controller.ts:1778
tools/approval.ts:346  speculation/host.ts:135   eval/preludes.ts:99
extensibility/extensions/wrapper.ts:233   wrapper.ts:290
```

Không phải một, mà là bảy. Nên "chỗ ghi phải là `resolveApproval` chứ không phải call site" — câu mà work item dùng làm **ràng buộc quan trọng nhất** và làm cả cổng (2) — không thể thực hiện được như đang viết, và cách viết nó **đúng bằng loại sai mà mục "Cách sai dễ nhất" cảnh báo**.

→ Viết lại thành: **một chỗ ghi duy nhất, đặt ở `wrapper.ts` ngay trên `if (approvalCheck.required)` (`:314`), đọc chính sách từ biến `resolved` đã có sẵn từ `:290`, và thêm một assertion/hằng số buộc `resolved` là nguồn duy nhất.** Sử dụng `resolved.policy` (`ApprovalPolicy = "allow" | "deny" | "prompt"`, `approval.ts:16`) thay cho `resolvedPolicy: string` tự do — điều work item đã tự hỏi ở mục "Cần người quyết" và giờ đã có câu trả lời: lấy nguyên `ResolvedApproval` (`approval.ts:85`) vào bản ghi, đừng phẳng thành chuỗi.

### Bước 3 — Chặn cổng `hasApprovalHandlers` (đây là lỗi âm thầm, không ai nêu trong work item)

`wrapper.ts:323-334`:

```
		const hasApprovalHandlers =
			this.runner.hasHandlers("tool_approval_requested") || this.runner.hasHandlers("tool_approval_resolved");
		const sessionId = context?.sessionManager?.getSessionId() ?? "";
		if (hasApprovalHandlers) {
			await this.runner.emit({
				type: "tool_approval_requested",
```

Cả hai event approval đều **nằm sau** cổng này. Tôi đã quét toàn cây: `tool_approval_requested` có **đúng một** subscriber — `modes/warp-events.ts:197`, và subscriber đó chỉ chuyển tiếp ra log sự kiện ngoài. `rg` trên `src/` cho `tool_approval_requested` trả về đúng: `warp-events.ts:197`, `speculation/host.ts:71`, `wrapper.ts:324`, `wrapper.ts:328`, `types.ts:985`, `types.ts:1359`.

Hệ quả: nếu bạn dựng bản ghi audit lên hai event này, thì trong một phiên TUI bình thường — không có warp client kết nối — **không có event nào được phát ra, và bản ghi sẽ rỗng**. Cổng (2) của work item vẫn xanh vì nó chỉ kiểm tra entry không lọt vào context — vốn đã đúng sẵn vì `type` mới. Cổng đó **không** bắt được "bản ghi không bao giờ được ghi".

→ Ghi audit **trước** `const hasApprovalHandlers`, ngay trên `if (approvalCheck.required)` (`:314`).

### Bước 4 — Union `SessionEntry`: neo lệch một dòng, số thành viên thì đúng

Kế hoạch ghi union ở `:300-315`. Tôi đã mở:

```
session-entries.ts:300   export type SessionEntry =
session-entries.ts:301-316   16 biến thể
session-entries.ts:316     | ResetBoundaryEntry;
```

Union thật là **`:300-316`**, không phải `:300-315` — dòng cuối là 316. Số thành viên **16** thì đúng. `grep -c "Approval"` trên file trả **0**, đúng như kế hoạch nói. File dài 360 dòng.

### Bước 5 — Backward compatibility: đã có sẵn, gần như miễn phí

`session-migrations.ts` chỉ có `migrateV1ToV2` và `migrateV2ToV3`, và `CURRENT_SESSION_VERSION = 3` (`session-entries.ts:13`). Không có bước nào liệt kê các `type` hợp lệ — loader đọc JSONL thô (`session-loader.ts:326` `parseSessionEntries`, `:90` `parseSessionContent`). Một transcript cũ không có entry approval vẫn parse được, vì không có gì phải migrate.

Đây là hợp đồng **âm** — sự vắng mặt có ý nghĩa — nên nó xứng đáng một test riêng, và là test rẻ nhất trong cả ba.

### Bước 6 — Lệnh chỉ-đọc: chưa có, và tiền lệ M4-9 thật sự chưa tồn tại

Tôi đã `rg "extensions-triage"` trên toàn `packages/` — **không có kết quả nào**. Lệnh của M4-9 chưa tồn tại, đúng như work item ghi. Nên "cùng họ với `omp extensions-triage`" là một lời hứa với một thứ chưa sinh ra; đừng chờ nó.

Đường ghi lệnh: `cli-commands.ts:27` `export const commands: CommandEntry[] = [`. Đọc session từ file: `session-loader.ts:531` `loadSessionMessagesReadOnly(filePath: string)`. Nhưng lệnh audit cần **entry**, không cần **message** — nên nó phải dùng `parseSessionEntries` / `loadSessionFile` (`session-loader.ts:353`), rồi lọc `entry.type === "approval"`, **không** dùng `loadSessionMessagesReadOnly` (hàm đó bỏ sạch các entry không phải message — tức là bỏ sạch chính thứ bạn cần). Đây là cái bẫy dễ sai nhất khi gõ lệnh này.

### Bước 7 — Cổng chạy

Xem mục 5.

---

## 4. Hợp đồng test

**Tên file đúng** (work item liệt kê 7 file, **6 file không tồn tại** — tôi đã `ls` và kiểm từng cái):

| work item ghi | thực tế |
| --- | --- |
| `packages/coding-agent/test/session-entries.test.ts` | **KHÔNG tồn tại** |
| `packages/coding-agent/test/approval-audit.test.ts` | **KHÔNG tồn tại** (đây là file mới, phải tạo) |
| `packages/coding-agent/test/extension-tool-wrapper.test.ts` | **KHÔNG tồn tại** |
| `packages/coding-agent/test/extensions-runner.test.ts` | tồn tại ✓ (đã chạy thử: 87 pass, 0 fail) |
| `packages/coding-agent/test/approval-mode.test.ts` | **KHÔNG tồn tại** — file thật ở `packages/coding-agent/test/tools/approval-mode.test.ts` |
| `packages/coding-agent/test/session-restore.test.ts` | **KHÔNG tồn tại** |
| `packages/coding-agent/test/session-compaction.test.ts` | **KHÔNG tồn tại** — file thật gần nhất: `agent-session-compaction.test.ts` |

**Ba nhà ở thật** cho ba hợp đồng:

1. **Một cặp, đúng một mỗi nửa** → `packages/coding-agent/test/approval-audit.test.ts` (mới), cộng `packages/coding-agent/test/extensions-runner.test.ts`.
2. **Không vào context của model** → `packages/coding-agent/test/session-messages.test.ts` (tồn tại, 16 KB) — đây là nơi đúng để khẳng định chuỗi message đi tới provider không chứa entry approval. Nối vào `buildSessionContext` / `isTranscriptEntry` (`session-context.ts:214`).
3. **Tương thích ngược** → `packages/coding-agent/test/session-read-only-hydration.test.ts` (tồn tại) — đã có sẵn đúng khuôn: nó dựng header `{ type: "session", version: 3, … }` bằng tay và nối `parseSessionEntries`/`resolveBlobRefsInEntries`. Viết case "transcript không có entry approval nào vẫn đọc được" theo đúng khuôn đó, và "lệnh audit báo *không có bản ghi* chứ không throw".

**Các case:**

- `ghi đúng một cặp khoá theo toolCallId` — một lần hỏi quyền sinh đúng một entry hỏi + một entry trả lời.
- `bản ghi được ghi khi không có extension handler nào` — hợp đồng bắt được lỗi ở Bước 3. Chạy approval với `runner` không đăng ký handler `tool_approval_requested`, rồi khẳng định transcript **vẫn có** cặp entry. Không có case này thì lỗi cổng `hasApprovalHandlers` đi lọt.
- `entry approval không xuất hiện trong context của model kể cả khi decision là denied` — hàng âm bắt buộc, khẳng định **sự vắng mặt**.
- `resolvedPolicy lấy từ chính sách đã quyết, không phải giá trị giao diện giả định` — đây là hợp đồng mà cổng máy **không** bắt được (xem Bước 2 và mục 5); nó chỉ đỏ được bằng cách so sánh `resolved.policy` với giá trị mà chính sách trả về.
- `transcript cũ không có entry approval vẫn mở được; lệnh audit báo không có bản ghi, không throw`.

**Điều người dùng thấy nếu hồi quy:** sau một crash, `omp approval-audit --call-id bash_01` in ra "không có bản ghi" cho một lần hỏi quyền **đã có người bấm duyệt** — đúng cái mất mát mà work item nêu tên, và nó im lặng, không báo lỗi.

---

## 5. Cổng

```bash
# 0. Tiền đề môi trường — ĐÃ ĐÚNG trên máy này:
#    packages/natives/native/pi_natives.darwin-arm64.node tồn tại, ninja ở /opt/homebrew/bin/ninja.
#    Nếu mất, chạy: bun --cwd=packages/natives run build
#    (KHÔNG cần `brew install ninja` — đã có.)

# 1. Cặp audit (file mới)
bun test packages/coding-agent/test/approval-audit.test.ts

# 2. Hàng âm: entry approval không lọt vào context của model
bun test packages/coding-agent/test/session-messages.test.ts

# 3. Tương thích ngược
bun test packages/coding-agent/test/session-read-only-hydration.test.ts

# 4. Không hồi quy ở tầng approval (đường dẫn đúng, khác work item)
bun test packages/coding-agent/test/extensions-runner.test.ts packages/coding-agent/test/tools/approval-mode.test.ts packages/coding-agent/test/tools/approval.test.ts

# 5. Types + lint
bun run check:ts
bun run lint
```

Đã xác nhận `bun run check:ts` và `bun run lint` tồn tại ở `package.json:90` và `:93`. Đã xác nhận `bun test` chạy được: `extensions-runner.test.ts` → 87 pass, 0 fail.

### Cổng này có ĐỎ ĐƯỢC không, và bằng cách nào

**Cổng (2) — hàng âm — CÓ đỏ được.** Bỏ cơ chế "loại khỏi context" đi, tức là đặt `ApprovalEntry.type = "message"` hoặc đưa nó vào `TranscriptEntry` (`session-context.ts:212`), thì entry approval đi thẳng vào chuỗi message đi tới provider và `session-messages.test.ts` đỏ. Đây là cổng máy chạy được, và nó là cổng duy nhất trong work item là thật.

Một lưu ý về lịch sử: work item viết "Đã từng thấy đỏ khi bỏ cơ chế `EPHEMERAL_MODEL_CHANGE_ROLE`". Tôi **không chứng kiến** lần đỏ đó và không truy được nó trong cây, nên đừng dựa vào nó. Lập luận đỏ ở trên là của tôi, dựng từ `isTranscriptEntry` (`session-context.ts:214`) — và nó đỏ được **bất kể** cơ chế nào bị bỏ, vì nó kiểm tra hệ quả chứ không kiểm tra nguyên nhân.

**Nhưng vì kế hoạch đặt sai chỗ ghi, cổng (2) không bắt được lỗi lớn nhất của item này.** Cụ thể:

- **Ghi bản ghi ở call site thay vì ở chính sách** — mọi cổng ở trên vẫn xanh, vì cả hai cách đều ra một cặp entry khoá theo `toolCallId`, và `resolvedPolicy` chỉ sai khi giá trị mà giao diện giả định khác giá trị chính sách quyết. Work item tự thừa nhận điều này ở "Cách sai dễ nhất" và nói đó là kiểm tra của con người. Tôi giữ nguyên kết luận đó — nhưng thêm một điều: sau khi Bước 2, đây không còn là lựa chọn "ghi ở đâu" nữa, vì `resolveApproval` không thể ghi được. Cổng máy bảo vệ được phần "đúng một nguồn sự thật", con người bảo vệ phần "giá trị đúng".
- **Bản ghi không bao giờ được ghi** (Bước 3) — cổng này **đang xanh trong kế hoạch và sẽ xanh sau khi gõ**. Không cổng nào trong work item bắt được nó. Đây là lỗi tôi phát hiện, không phải lỗi kế hoạch nêu.

→ **Viết lại cổng (1) cho đỏ được**, bổ sung vào khối Xác minh:

```
# 1b. Cổng riêng cho lỗi cổng hasApprovalHandlers — BẮT BUỘC, không có nó thì
#     toàn bộ item có thể ship với bản ghi rỗng mà mọi cổng khác vẫn xanh.
#     Case: approval chạy với runner KHÔNG đăng ký handler tool_approval_requested
#     → transcript vẫn phải có đủ một cặp entry khoá theo toolCallId.
```

Cổng này đỏ được theo cách cụ thể: dựng một `ExtensionRunner` không extension nào, chạy một tool cần approval, đọc lại session file, đòi `type === "approval"` phải có **hai** entry. Nếu ai đó lại ghi sau `hasApprovalHandlers`, entry count = 0 và cổng đỏ.

---

## 6. Cạm bẫy riêng của work item này

1. **`wrapper.ts:290` là call site, không phải định nghĩa.** Đây là cái bẫy lớn nhất. Work item dùng `:290` làm neo cho ràng buộc "bản ghi phải lấy từ `resolveApproval`", nhưng dòng đó là `const resolved = resolveApproval(...)` — lời gọi. Ai đó mở file, thấy đúng dòng, và ghi xuống dưới nó; mọi cổng vẫn xanh. Định nghĩa ở `tools/approval.ts:203`, và nó thuần.

2. **`EPHEMERAL_MODEL_CHANGE_ROLE` không phải cơ chế lọc context.** Nó là `= "fallback"`, một chuỗi vai trò model (`session-entries.ts:33`). Bảng "Đính chính so với plan" của work item ghi "Mọi neo đo được trong sổ | XÁC NHẬN CHÍNH XÁC — toàn bộ", và các số dòng **đều đúng** — nhưng kết luận rút ra từ chúng ("đã có tiền lệ 'trong log, không trong model'") thì sai. Số dòng đúng không cứu được một diễn giải sai. Cơ chế thật là `isTranscriptEntry` (`session-context.ts:214`).

3. **Cổng `hasApprovalHandlers` (`wrapper.ts:323`) nuốt mất cả hai event.** Bản ghi đặt trên event thì rỗng trong phiên TUI thường. Xem Bước 3.

4. **Lệnh audit phải đọc entry, không đọc message.** `loadSessionMessagesReadOnly` (`session-loader.ts:531`) lọc ra đúng những thứ bạn cần. Dùng `parseSessionEntries` (`:326`) hoặc `loadSessionFile` (`:353`).

5. **Sáu trong bảy tên test trong work item không tồn tại.** `bun test <đường/dẫn-không-có>` fail ngay. Hai cái sai chỗ: `approval-mode.test.ts` nằm ở `test/tools/`, không phải `test/`.

6. **`gate` — câu hỏi treo mà tôi đã đối chiếu được.** Work item hỏi "union 4 giá trị `tui | acp | xdev | policy` có đúng không?". Đối chiếu với cây: `tui` → `wrapper.ts:351` `if (!this.runner.hasUI())` (`runner.ts:952` `hasUI()` là `this.#uiContext !== noOpUIContext`); `acp` → `wrapper.ts:305` `acpApprovedArgs` + `session/acp-permission-gate.ts:7` `PERMISSION_REQUIRED_TOOLS` + `session-tools.ts:930`; `xdev` → `wrapper.ts:302` `xdevApproved` + `internal-urls/xd-protocol.ts:107`; `policy` → `resolved.policy === "deny"` không hỏi ai. Bốn giá trị **phủ đúng** các bề mặt có trong `wrapper.ts`. Nhưng cảnh báo số 2 trong "Cần người xác nhận" vẫn đúng ở chỗ khác: `resolveApproval` còn được gọi từ `speculation/host.ts:135` và `cursor.ts:341/1012`, hai đường **không đi qua** `wrapper.ts` — nếu chúng cũng hỏi quyền thì `gate` sẽ không phân biệt được. Đó là câu hỏi cần trả lời trước khi chốt union, không phải câu hỏi về số lượng giá trị.

7. **`resolvedPolicy: string` nên là `ApprovalPolicy`.** `approval.ts:16` đã có `type ApprovalPolicy = "allow" | "deny" | "prompt"`, và `ResolvedApproval` (`approval.ts:85`) đã mang `policy`, `tier`, `reason`, `override`, `source`, `policyKey`. Phẳng xuống một chuỗi tự do là tự tạo lại đúng lớp lỗi mà M4 cấm.

---

## Phụ lục — bảng neo đã kiểm

| neo trong work item | kết quả | thực tế |
| --- | --- | --- |
| `session/session-entries.ts:300-315` | **LỆCH 1 DÒNG** | union là `:300-316`; 16 thành viên đúng; `grep -c Approval` = 0 đúng |
| `wrapper.ts:290` = `resolveApproval` | **HỎNG (ngữ nghĩa)** | là call site; định nghĩa ở `tools/approval.ts:203` |
| `wrapper.ts:233` | ĐÚNG | `const preResolved = resolveApproval(...)` |
| `wrapper.ts:328` | ĐÚNG | `type: "tool_approval_requested",` |
| `wrapper.ts:340` | ĐÚNG | `type: "tool_approval_resolved",` |
| `extensibility/extensions/types.ts:985` | ĐÚNG | `type: "tool_approval_requested";` |
| `types.ts:994` | ĐÚNG | `type: "tool_approval_resolved";` |
| `modes/warp-events.ts:197-203` | ĐÚNG | `:197` là `api.on("tool_approval_requested", event => {` |
| `turn-recovery.ts:72` | ĐÚNG (import) | nhưng symbol này không làm việc work item gán cho nó |
| `turn-recovery.ts:1686` | ĐÚNG | `role === EPHEMERAL_MODEL_CHANGE_ROLE` |
| `turn-recovery.ts:1958` | ĐÚNG | `appendModelChange(sel, EPHEMERAL_MODEL_CHANGE_ROLE, true)` |
| 7 tên test | **6 HỎNG** | chỉ `extensions-runner.test.ts` tồn tại |
| `omp extensions-triage` (M4-9) | ĐÚNG là chưa có | `rg` toàn `packages/` không có kết quả |
