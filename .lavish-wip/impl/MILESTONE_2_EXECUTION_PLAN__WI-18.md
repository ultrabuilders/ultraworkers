# WI-18 — Cổng effect: phiếu triển khai

**Kế hoạch:** `MILESTONE_2_EXECUTION_PLAN.md` §`## WI-18. GAP-M2-12` (dòng 2573)
**Nguồn sổ:** `.lavish-wip/GAP-REGISTER-2.md:1032` (GAP-M2-12)
**Trạng thái:** chưa có dòng code nào. WI-6 (bảng admission) cũng chưa có.
**Ngày kiểm:** 2026-09-29. Mọi trích dẫn dưới đây đã mở file và đọc.

---

## 0. Kết quả kiểm lại từng neo

Có **9 neo** trong work item. Bảng dưới đây là kết quả kiểm, không phải phỏng đoán.

| # | Neo trong plan | Lệnh đã chạy | Kết quả | Verdict |
|---|---|---|---|---|
| 1 | `packages/agent/src/pause.ts:24` = `AgentPauseGate` (xuất hiện 3 lần: bảng file, bước xác minh, bảng rủi ro dòng 5069) | `sed -n '24p'` | Dòng 24 là `/** Freeze switch shared by every agent loop in the process. See module docs. */` — **comment**, không phải class | **HỎNG — lệch 1 dòng.** `AgentPauseGate` ở **:25** |
| 2 | `packages/agent/src/pause.ts` (bảng file: "đọc, KHÔNG sửa") | `ls` | Tồn tại, 107 dòng | **ĐÚNG** |
| 3 | `packages/agent/src/harness/hooks.ts` (bảng file + bước 3) | `ls` trên cả 8 cây | **VÔNG HÌNH trong omp.** Có ở `pi-ref` và `senpi-ref` (533 dòng, hai bản **giống hệt nhau** — `diff` rỗng) | **HỎNG — trỏ nhầm cây** |
| 4 | `packages/agent/src/kinds/tool.ts` (bảng file + bước 2) | `find -name kinds` trên cả 8 cây | **VÔNG HÌNH ở mọi cây.** Đường dẫn thật của pi là `packages/agent/src/harness/pico3/kinds/tool.ts` (chỉ có ở `pi-ref`, **không** có ở `senpi-ref`) | **HỎNG — thiếu `harness/pico3/`** |
| 5 | `docs/approval-mode.md:72` (bước 4, cổng (4), bảng rủi ro) | `sed -n '72p'` | Đúng câu: `This pattern policy controls approval for the bash tool; it is not process or filesystem containment.` | **ĐÚNG** |
| 6 | `sed -n '24,40p' packages/agent/src/pause.ts` (lệnh xác minh) | chạy | Chạy được, in comment + class + các getter | **ĐÚNG** (nhưng comment ở dòng đầu dễ gây hiểu nhầm) |
| 7 | `sed -n '70,74p' docs/approval-mode.md` (lệnh xác minh) | chạy | Chạy được; dòng 72 là dòng 3 trong khoảng in ra | **ĐÚNG** |
| 8 | "Bảng admission của WI-6" (bước 1) | `ls packages/coding-agent/src/tools/tool-admission.ts` | `No such file or directory` — đúng như WI-6 tự mô tả (file mới) | **ĐÚNG (chưa tồn tại là đúng)** |
| 9 | `packages/agent/src/pause.ts:24` trong bảng rủi ro dòng 5069 | `sed -n '24p'` | Cùng neo #1 | **HỎNG — lệch 1 dòng** |

**Điểm quan trọng nhất phát ra từ việc kiểm lại — nằm ngoài danh sách neo:** sổ khoảng trống ghi
*"Khái niệm này không có tệp nào ở `pi` để chép; chỉ là một ranh giới trong `harness/hooks.ts` + `kinds/tool.ts`"*
(`GAP-REGISTER-2.md:1043`). **Câu đó sai.** Pi **có** tệp, và nó làm đúng việc mục này sinh ra để làm:

```
/Users/tranquangdang21/Projects/pi-ref/packages/agent/src/harness/execution/effect-gate.ts   (1.8 KB, 60 dòng)
```

Đọc file thật, từng dòng:

- `effect-gate.ts:12` — `/** Procedure-facing synchronous admission capability for one drive pass. */`
- `effect-gate.ts:13` — `export interface Gate {`
- `effect-gate.ts:18` — `/** Owner-facing lifecycle controls for one drive pass. */`
- `effect-gate.ts:19` — `export interface GateControl {`
- `effect-gate.ts:30` — `/** Create separate procedure-facing and owner-facing views of one effect gate. */`
- `effect-gate.ts:31` — `export function createGate(): { gate: Gate; control: GateControl } {`

Hai interface tách **đúng** procedure khỏi owner, và `createGate()` trả về **hai view tách biệt của một
cổng**. Đó là ranh giới mà WI-18 gọi là "tách khỏi vòng đời của chủ sở hữu" — nằm ở đây, bằng tên.

Và `hooks.ts` — file mà plan gọi là "nơi biên thủ tục tác vụ" — **tiêu thụ** cổng đó chứ không định nghĩa nó:

- `hooks.ts:3` — `import type { Gate } from "./execution/effect-gate.ts";`
- `hooks.ts:43` — `/** Invoke one accepted-operation aggregate after synchronously passing its effect gate. */`
- `hooks.ts:44` — `runWithGate<TName extends HookName>(`
- `hooks.ts:50-55` — `return gate.admit(() => { ... return this.runAdmitted(name, event, admittedContext); });`

Pi còn **tài liệu hoá** ranh giới này. `pi-ref/packages/agent/docs/harness.md:919` (mục `## 4.2 Effect gate`):

> Procedures receive only `drive.gate`; `Drive` privately retains `GateControl`, and there is no procedure-facing `assertOpen`.

Cùng file liệt kê "complete admission catalog" — 11 hook aggregate, 3 loại provider operation, và
`tool.execute` + retry timer. Câu then chốt:

> No other code calls `Gate.admit`.

**Kết luận thiết kế:** WI-18 **không phải thiết kế từ đầu**. Nửa "procedure/owner tách biệt" đã có
nguyên mẫu ở pi, MIT, chép được. Nửa "tool khai báo tập effect" thì **không có** ở pi: `ToolDeclaration`
(`pi-ref/packages/agent/src/harness/pico3/types.ts:874-881`) có `name`, `description`, `parameters`,
`replay`, `output`, `execute` — và **không có field effect nào** (`grep -n "effect"` trên file ra đúng một hit, ở dòng 438, nói về thứ khác). Nửa đó mới là việc thiết kế thật.

**Cả hai điều kiện đều đúng đồng thời:** anchor sai **và** claim "không có tệp nào ở pi" sai. Sửa neo
mà giữ claim là giữ một lời hứa giả dẫn tới viết lại cái đã có.

---

## 1. Cái gì thay đổi, quan sát được

Một tool khai báo tập effect của nó (`effects?: readonly ToolEffect[]`) thì quyết định cho phép
được hỏi **một lần cho cả tập effect, tại biên thủ tục tác vụ** — thay vì mỗi tool tự viết một
`approval` closure, và thay vì deny theo mẫu chữ câu lệnh; đồng thời `docs/approval-mode.md` nói
thẳng cổng này **không phải sandbox**, khớp từng chữ với câu ở dòng 72.

---

## 2. Bảng điểm sửa

Cột TRƯỚC trích từ file thật, đã mở.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
|---|---|---|---|
| `packages/agent/src/types.ts:1167` | `AgentTool.approval` | `/** Capability tier declaration used by approval gates. Omitted means "exec". */`<br>`approval?: ToolApproval;` | Giữ nguyên. Thêm ngay bên dưới:<br>`/** Declared effects, asked once as a set at the task-procedure boundary. */`<br>`effects?: readonly ToolEffect[] \| ((args: unknown) => readonly ToolEffect[]);` |
| `packages/agent/src/types.ts:1011-1024` | `ToolApprovalDecision` | `export type ToolApprovalDecision =`<br>`\t| ToolTier` | Thêm ngay trên, cùng file:<br>`/** Resource classes a tool declares it touches. A gate asks about the whole set at once. */`<br>`export type ToolEffect = "filesystem" \| "network" \| "process" \| "workspace-write";`<br>`export type ToolEffectDeclaration = readonly ToolEffect[] \| ((args: unknown) => readonly ToolEffect[]);` |
| `packages/coding-agent/src/extensibility/extensions/types.ts:658-659` | `ToolDefinition.approval` | `/** Tool approval tier. Defaults to \`"exec"\` when omitted.`<br>` *  \`"read"\`: read-only operations. \`"write"\`: mutations. \`"exec"\`: code execution. */`<br>`approval?: ToolApproval;` | Thêm `effects?: ToolEffectDeclaration;` — **một field, cùng hình dạng**, để tác giả plugin khai báo được mà không cần import type từ package khác. Đây là hợp đồng hồi quy quan trọng nhất. |
| `packages/coding-agent/src/tools/tool-admission.ts` | `ADMISSION_RULES` (WI-6) | *chưa tồn tại* (`ls` → `No such file or directory`) | Cột effect chung với bảng admission của WI-6 — **một khai báo**, không phải hai bảng |
| `packages/agent/src/effect-gate.ts` | `createGate` | *chưa tồn tại trong omp* | Cổng procedure/owner, port từ `pi-ref/packages/agent/src/harness/execution/effect-gate.ts:31`, MIT |
| `docs/approval-mode.md:72` | (đoạn giới hạn) | `This pattern policy controls approval for the \`bash\` tool; it is not process or filesystem containment.` | **Giữ nguyên y nguyên.** Thêm đoạn giới hạn tương ứng cho cổng effect ngay dưới, cùng cấu trúc câu |

---

## 3. Các bước, mỗi bước có neo đã kiểm

**Bước 0 — CHƯA LÀM GÌ CHO TỚI KHI BA CÂU HỎI ở `MILESTONE_2_EXECUTION_PLAN.md:5139-5141` ĐƯỢC TRẢ LỜI.**
Cả ba đều ghi `chưa có mặc định — cần bạn quyết`. Câu 1 chặn bước 2, câu 2 chặn phạm vi, câu 3
chặn bước 3. Viết code trước khi có câu trả lời là đoán, và đoán ở approval code là hậu quả bảo mật.

**Bước 1 — Chờ WI-6.** Phụ thuộc cứng, đúng như plan nói. `ls packages/coding-agent/src/tools/tool-admission.ts`
→ chưa có. Lý do phụ thuộc là đúng và đáng giữ: một bảng khai báo duy nhất.

**Bước 2 — Khai báo effect.**
Thêm `ToolEffect` + `ToolEffectDecision` vào `packages/agent/src/types.ts` (cạnh `ToolApprovalDecision` ở `:1011`),
rồi `effects?:` vào `AgentTool` tại **`packages/agent/src/types.ts:1167`** (ngay dưới `approval?: ToolApproval;`),
và `effects?:` vào `ToolDefinition` tại **`packages/coding-agent/src/extensibility/extensions/types.ts:658`** (ngay dưới `approval?: ToolApproval;`).

*Ghi chú về đường dẫn:* plan ghi `packages/agent/src/kinds/tool.ts`. Đường dẫn đó **không tồn tại ở cây nào**.
Bản pi gần nhất là `packages/agent/src/harness/pico3/kinds/tool.ts` nhưng đó là kiểu khai báo tool của
pico3, **không phải** nơi omp khai báo tool. Trong omp, `AgentTool` sống ở `packages/agent/src/types.ts:1074`.
Sửa path theo đúng cây thật, không sửa theo plan.

**Bước 3 — Cổng ở biên thủ tục tác vụ, tách khỏi lifecycle chủ sở hữu.**
Tạo `packages/agent/src/effect-gate.ts`, port nguyên mẫu từ
`/Users/tranquangdang21/Projects/pi-ref/packages/agent/src/harness/execution/effect-gate.ts` (MIT).
Bản chữ nghĩa phải giữ: một `createGate()` trả `{ gate, control }`; `gate.admit(invoke)` là **cánh cổng
hỏi duy nhất** và kiểm tra **đồng bộ**; `control` là view của chủ sở hữu, không chuyển cho procedure.

*Hai điều kiện đồng bộ lấy từ `pi-ref/packages/agent/docs/harness.md` (mục 4.2), không phải suy ra:*
- Chuẩn bị xong **trước**, rồi mới `admit`. Bọc cả phần chuẩn bị vào trong `admit` là sai — abort có
  thể thắng trong lúc chuẩn bị còn đang await.
- *"No other code calls `Gate.admit`."* Đây là hợp đồng, không phải lời khuyên. Nếu `AgentPauseGate`
  cũng gọi `admit`, ranh giới procedure/owner sụp ngay — và đó đúng là cách sai nặng nhất mà plan
  đã cảnh báo.

**Bước 4 — Ghi giới hạn vào doc. KHÔNG dùng chữ "sandbox".**
Mở `docs/approval-mode.md:72` (đã kiểm: câu `it is not process or filesystem containment.` nằm đúng
dòng 72) và thêm đoạn giới hạn tương ứng cho cổng effect ngay dưới, dùng **cùng cấu trúc câu** để hai
đoạn đọc như một. `grep -c "sandbox" docs/approval-mode.md` → **0**; giữ nguyên 0 sau khi sửa, và
kiểm cùng cách trong thông điệp lỗi.

**Bước 5 — Xếp cạnh GAP-M6-12, KHÔNG gộp.** Đúng như plan; không cần hành động code.

---

## 4. Hợp đồng test

**File:** `packages/agent/test/effect-gate.test.ts` (thư mục `packages/agent/test/` đã xác nhận tồn tại,
hàng chục file `*.test.ts` kế cận `agent-loop.test.ts` 253 KB và `agent.test.ts` 61 KB — noi theo văn phong đó).

| # | Case | Chứng minh cái gì |
|---|---|---|
| 1 | `createGate()` trả hai view **không trùng nhau**: `gate` không có `beginAbort`/`close`; `control` không có `admit` | Ranh giới procedure/owner là **hình dạng kiểu**, không phải quy ước. Đây là case quan trọng nhất — nếu chỉ hỏi ở runtime thì một lần gộp nhầm là hỏng vĩnh viễn |
| 2 | `admit` ném `AbortRequested` khi `control.beginAbort(...)` đã chạy | Cancellation thắng admission |
| 3 | `admit` ném lỗi closing khi `control.close(err)` đã chạy | Owner đóng cổng thì procedure hỏng đúng lý do |
| 4 | `gate.signal` abort đúng một lần khi `signalAbort()` | Tín hiệu tới đúng procedure, không tới owner |
| 5 | Chưa `admit` mà đã `beginAbort` → `admit` vẫn ném; `admit` xong rồi mới `beginAbort` → không ném | **Hai chiều của ranh giới thời gian.** Chỉ case này chứng minh `admit` kiểm *đồng bộ*, không phải khi resolve |
| 6 | `close` gọi hai lần → không ném lần hai | Idempotence của view chủ sở hữu |

**Case âm bắt buộc (nếu không có case này, feature có thể ship hỏng mà test vẫn xanh):**

| # | Case | Nếu hồi quy, người dùng thấy gì |
|---|---|---|
| 7 | Tác giả plugin khai báo `effects: ["filesystem"]` cho một tool **không** khai báo `approval` | Tool cứ bị coi là `exec` và bị hỏi như mọi tool lạ — khai báo của tác giả **bị bỏ qua âm thầm**. Đây là hồi quy đúng như plan mô tả: không có đường nào khác để khai báo ý định |
| 8 | Tool khai báo `effects` qua **hàm** nhận args, với hai bộ args khác nhau → hai tập effect khác nhau | Cổng hỏi sai tập: hỏi `"network"` cho một lệnh thực tế chỉ đọc file |
| 9 | Tool khai báo `effects: []` (không chạm gì) → **không** hỏi | Một tool vô hại bị hỏi. Nếu thiếu case này, `[]` và `undefined` rơi vào cùng nhánh và phân biệt được là vô nghĩa |

**Case hợp đồng doc (không source-grep):** chạy `grep -c "sandbox" docs/approval-mode.md` phải bằng `0`,
và `grep -n "is not process or filesystem containment" docs/approval-mode.md` phải trả về dòng 72.
Đây là kiểm tra **tài liệu phát hành**, chạy trong CI, không phải đọc mã nguồn.

**Bắt buộc theo AGENTS.md:** `spyOn` + `vi.restoreAllMocks()` trong `afterEach`; **không** `mock.module()`.
Test phải full-suite safe — cổng là singleton theo hình dạng, nên mỗi case tạo `createGate()` riêng,
không dùng một singleton dùng chung.

---

## 5. Cổng

```bash
# (1) TYPE — cột effect là MỘT khai báo
bun run check:ts          # exit 0

# (2) HỢP ĐỒNG CỔNG
bun test packages/agent/test/effect-gate.test.ts

# (3) KHÔNG BIẾN THÀNH SANDBOX — kiểm tài liệu phát hành
grep -c "sandbox" docs/approval-mode.md                                  # 0
grep -n "is not process or filesystem containment" docs/approval-mode.md  # dòng 72
```

`check:ts` định nghĩa ở `package.json:90`:
`"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`.
Chạy được, không cần native addon.

**Về cái plan nói "bị chặn cho tới khi có native addon":** câu đó **không còn đúng**. Đã kiểm:
`packages/natives/native/pi_natives.darwin-arm64.node` **đã có** (find trả về đường dẫn). Lệnh gỡ
chặn `bun --cwd=packages/natives run build` dẫn tới `package.json:32`:
`"build": "bun ../../scripts/bazel-natives.ts host --dest native"`. Cổng (2) chạy được ngay.

### Cổng này có ĐỎ ĐƯỢC không? Có — nhưng case 7/8/9 mới là phần quyết định

Trả lời thẳng câu quan trọng nhất:

**Cổng (1) `check:ts` KHÔNG đỏ được khi cổng hỏi hỏng sai chỗ**, và đây là điểm dễ tự lừa nhất.
`check:ts` chỉ chứng minh **kiểu** đúng. Một triển khai đặt cổng hỏi ở command boundary thay vì biên
thủ tục tác vụ — đúng cách sai thứ ba mà plan liệt kê — **vẫn exit 0**, vì hình dạng kiểu là như nhau.
Một cổng luôn xanh tệ hơn không có cổng, nên **không được dùng `check:ts` một mình làm bằng chứng.**

**Cổng (2) ĐỎ ĐƯỢC, và đỏ đúng thứ.** Case 7 là câu hỏi: `effects: ["filesystem"]` trên một tool
không khai báo `approval` → cổng phải hỏi theo tập effect. Nếu ai đó cắm `effects` vào một nhánh `if`
thứ hai bên cạnh `approval`, case 7 **đỏ**, vì nhánh `if` đó không thấy khai báo. Đó chính xác là hồi quy
mà plan nêu: *"tác giả không có đường nào khác để khai báo ý định"*. Kèm case 8 (hàm nhận args) và
case 9 (`[]` khác `undefined`), ba case này **ép** effect thành một khai báo thật.

**Cổng (3) ĐỎ ĐƯỢC, và là cổng dễ mất nhất.** `grep -c "sandbox"` trả `0` và câu ở dòng 72 phải khớp.
Điều kiện này đỏ được vì nó kiểm **tài liệu phát hành** — người đọc tài liệu, không phải người đọc mã.
Một PR thêm cổng effect mà gọi nó là sandbox sẽ đỏ ở đây.

**Điều kiện tiên quyết, không phải cổng:** ba câu hỏi ở `MILESTONE_2_EXECUTION_PLAN.md:5139-5141`
đều `chưa có mặc định`. Trước khi cổng (2) có ý nghĩa, câu 1 (tập effect lấy tên gì) phải có câu trả lời —
nếu không, case 7 assert trên một tập effect chưa ai chốt, và test sẽ bị viết lại.

---

## 6. Cạm bẫy riêng của work item này

**Cạm bẫy 1 — dùng lại `AgentPauseGate`.** Nó là cổng PAUSE toàn tiến trình, poll ở hai biên hành
động: `packages/agent/src/agent-loop.ts:1292` (trước model call) và `:3274` (trước tool call), cả hai
là `if (agentPauseGate.paused) await agentPauseGate.waitUntilResumed(...)`. Nó **không** phân biệt
procedure với owner. Dùng lại nó là giữ đúng cái nhầm mà mục này sinh ra để gỡ.

**Cạm bẫy 2 — tin dòng "không có tệp nào ở pi để chép".** Đã kiểm và đã sai. `pi-ref/.../execution/effect-gate.ts`
tồn tại, 60 dòng, làm đúng việc này. Tin câu đó sẽ viết lại một cái đã có, và làm mất nguồn MIT.

**Cạm bẫy 3 — tin đường dẫn trong bảng file.** `packages/agent/src/kinds/tool.ts` và
`packages/agent/src/harness/hooks.ts` không tồn tại trong omp. Cả hai trỏ vào cây pi, không phải cây
omp. Gõ theo đường dẫn plan sẽ tạo file mới ở chỗ sai, tách khỏi những gì đang thật sự chạy.

**Cạm bẫy 4 — đặt cổng ở command boundary.** Đây là cách sai thứ ba của plan, và nó **không đỏ
cổng (1)**. Chỉ case 7-9 mới bắt được. Đừng tin `check:ts`.

**Cạm bẫy 5 — gọi chữ "sandbox" trong doc hoặc trong thông điệp lỗi.** Đây là lời hứa giả, và lời
hứa giả trong approval code là **hậu quả bảo mật, không phải lỗi tài liệu**. `docs/approval-mode.md`
hiện có 0 lần dùng chữ đó — giữ nguyên 0.

**Cạm bẫy 6 — coi `check:ts` là bằng chứng cổng hỏi đúng biên.** Nó chỉ chứng minh kiểu. Xem mục 5.

---

## 7. Sai lệch so với cây thật (GHI RA, không sửa trong tài liệu)

| claim trong plan / sổ | Thực tế đã kiểm |
|---|---|
| `packages/agent/src/pause.ts:24` = `AgentPauseGate` | Dòng 24 là comment; class ở **:25** |
| `packages/agent/src/harness/hooks.ts` là file của omp | Không tồn tại trong omp. Có ở `pi-ref` và `senpi-ref`, hai bản giống hệt |
| `packages/agent/src/kinds/tool.ts` | Không tồn tại ở **bất kỳ** cây nào. Bản pi gần nhất: `harness/pico3/kinds/tool.ts`, chỉ ở `pi-ref` |
| Sổ: *"không có tệp nào ở pi để chép"* | Sai. `pi-ref/packages/agent/src/harness/execution/effect-gate.ts` có `createGate()` với `Gate`/`GateControl` tách đúng procedure/owner, và `harness.md` mục 4.2 tài liệu hoá ranh giới |
| `bun test` chết vì thiếu native addon | Addon đã có: `packages/natives/native/pi_natives.darwin-arm64.node` |
| Cổng (1) `check:ts` là bằng chứng cổng hỏi đúng biên | Không. Kiểu đúng cho cả hai vị trí. Chỉ case test 7-9 bắt được |
| Tác giả plugin khai báo effect sẽ được hỏi | Ông dùng `ToolDefinition` ở `extensions/types.ts:638`; đó là surface cần thêm `effects?:` cạnh `approval?:` (`:658`), không phải `AgentTool` |

---

## 8. Ba câu hỏi cần người quyết (chặn bước 2 và bước 3)

Từ `MILESTONE_2_EXECUTION_PLAN.md:5139-5141`, cả ba đều `chưa có mặt định — cần bạn quyết`:

1. **Tập effect dùng tên gì, ai sở hữu việc mở rộng?** Chặn bước 2. Phiếu này tạm đề xuất
   `"filesystem" | "network" | "process" | "workspace-write"` (4 thành viên) — nhưng đây là **đề xuất
   của phiếu, không phải quyết định**. Danh sách effect là nội dung thật của cổng.
2. **M1 W6 (deny theo mẫu lệnh bash) còn là lớp nữa?** Chặn phạm vi, chéo với M1. Đã kiểm:
   `cfgBashPatterns` khai bằng `register({` ở `packages/coding-agent/src/exec/settings.ts:120`, với
   `id: "bash.patterns"` ở `:121`; tiêu thụ ở
   `packages/coding-agent/src/tools/bash.ts:477` (`readonly approval = (args: unknown) => ToolApprovalDecision`)
   và `:480`. Đây chính là **command boundary** — nơi plan nói đừng đặt cổng.
3. **Cổng hỏi ai: người dùng hay policy đã cấu hình?** Chặn bước 3, quyết định hình dạng cổng.
