# Phiếu triển khai — WI-6: Bảng admission tool

> Nguồn: `MILESTONE_2_EXECUTION_PLAN.md:2258-2479` (`## WI-6.`)
> Cây kiểm: `/Users/tranquangdang21/Projects/ultraworkers` @ HEAD `65cc6c1`, nhánh `milestone-1`
> Ngày kiểm: 2026-09-29
> **Số neo đã mở và đọc: 30. Đúng sẵn: 8. Lệch: 22.**

---

## 0. Cảnh báo đầu tiên, đọc trước khi gõ dòng nào

`bun run check:ts` **đang ĐỎ ở HEAD**, vì hai lý do **không liên quan gì tới WI-6**:

```
packages/tui/test/probe-frozen.test.ts   → Format issues found in above 1 files   (oxfmt --check)
packages/coding-agent/test/extension-tool-renderer-registration.test.ts(69,95):
    error TS2554: Expected 3 arguments, but got 4.
```

Cả hai file đều là **untracked** (`git status --porcelain` → `??`), tức là WIP của một work stream khác đang nằm trong cây. Nửa còn lại của cổng — `bun run --filter './packages/*' --sequential --if-present check:types` — chạy xanh `Done` cho 7 package rồi chết đúng ở `pi-coding-agent` vì file untracked kia.

**Hệ quả cho bạn:** trước khi sửa bất cứ thứ gì, hãy chạy `bun run check:ts` một lần và **lưu lại output đỏ đó**. Đó là baseline của bạn. Sau khi sửa xong, cổng xanh trở lại đúng bằng chỗ đó — không phải bằng "0 lỗi".

---

## 1. Cái gì thay đổi, quan sát được

Số built-in tool đi tới model là **không đổi trước và sau**; nhưng kể từ đây việc một built-in có được nhận hay không là **một mục trong `ADMISSION_RULES`** chứ không phải **một nhánh `if` thứ N** trong một chuỗi 25 nhánh, và `bun run check:ts` sẽ **đỏ lúc biên dịch** nếu có bất kỳ tên tool nào của `BUILTIN_TOOL_NAMES` hoặc `HIDDEN_TOOL_NAMES` mà không có mục nào trong bảng.

---

## 2. Bảng điểm sửa

Tất cả `TRƯỚC` dưới đây trích từ cây thật @ `65cc6c1`, đã mở và đọc.

### 2.1 `packages/coding-agent/src/tools/index.ts`

| vị trí | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| **738** (plan ghi 731) | `const isToolAllowed` | `const isToolAllowed = (name: string) => {` | `const isToolAllowed = (name: string) => evaluateToolAdmission(name, admissionCtx);` |
| **744-798** (plan ghi 737-791) | 25 nhánh `if (name === …)` | xem 2.2 | xoá hết, chuyển thành 33 mục trong `ADMISSION_RULES` |
| **800** (plan ghi 793) | đóng closure | `};` | `const admissionCtx: ToolAdmissionContext = { session, restrictToolNames, requestedTools, includeYield, enableLsp, goalEnabled, externalThinkingActive, allowEval };` đặt **trước** dòng `isToolAllowed` |
| **618** (plan ghi 611) | `BuiltinToolPlan.isAllowed` | `isAllowed(name: string): boolean;` | **không đổi** |
| **813** (plan ghi 806) | object trả về | `return { requestedTools, names, isAllowed: isToolAllowed };` | **không đổi** |
| **600** (plan ghi 593) | `ToolName` | `export type ToolName = BuiltinToolName;` | **không đổi** — nhưng đây là lý do `Record<ToolName, …>` **không typecheck** (xem §6.3) |
| **561** (plan ghi 554) | `BUILTIN_TOOLS` | `export const BUILTIN_TOOLS: Record<BuiltinToolName, ToolFactory> = {` | **không đổi** — đã ép buộc exhaustive ở biên dịch rồi |
| **806** (plan ghi 799) | cổng lọc | `name => (name in BUILTIN_TOOLS \|\| name in HIDDEN_TOOLS) && isToolAllowed(name),` | **không đổi** — xem cảnh báo prototype ở §6.2 |
| **808** (plan ghi 801) | nhánh không-explicit | `...Object.keys(BUILTIN_TOOLS).filter(isToolAllowed),` | **không đổi** |
| đầu file, vùng import | — | — | thêm `import { isToolAllowed as evaluateToolAdmission, type ToolAdmissionContext } from "./tool-admission";` |

### 2.2 Khối 25 nhánh (dòng 738-800) — văn bản thật, dùng để đối chiếu từng mục

Đã đếm: **25** dòng khớp `if (name ===` (đúng con số plan nói), **29** tên phân biệt, trong đó 29 tên **đôi một rời nhau** — không tên nào xuất hiện ở hai nhánh. Con số "tám biến tự do / 23 helper / 26 lần đọc" của plan cũng **chính xác** (đo lại bằng `grep -o`).

```
744		if (name === "goal") {
745			if (!goalEnabled || restrictToolNames) return false;
746			const goalState = session.getGoalModeState?.();
747			return goalState === undefined || goalState.enabled === true || goalState.goal.status === "dropped";
748		}
749		if (name === "lsp") return enableLsp && cfgLspEnabled.get(session.settings);
750		if (name === "bash") return cfgBashEnabled.get(session.settings);
751		if (name === "eval") return allowEval;
752		if (name === "debug") return cfgDebugEnabled.get(session.settings);
753		if (name === "ida") return cfgIdaAvailable.get(session.settings);
754		if (name === "todo")
755			return (!includeYield || session.prewalkArmed === true) && cfgTodoEnabled.get(session.settings);
756		if (name === "glob") return cfgGlobEnabled.get(session.settings);
757		if (name === "grep") return cfgGrepEnabled.get(session.settings);
758		if (name === "find") return isFindEnabled(session);
759		if (name === "github") return cfgGithubEnabled.get(session.settings);
760		if (name === "ast_grep") return cfgAstGrepEnabled.get(session.settings);
761		if (name === "ast_edit") return cfgAstEditEnabled.get(session.settings);
762		if (name === "web_search") return cfgWebSearchEnabled.get(session.settings);
763		if (name === "security_scan") return cfgSecurityEnabled.get(session.settings);
764		if (name === "think") return externalThinkingActive;
765		if (name === "ask") return cfgAskEnabled.get(session.settings);
766		if (name === "context_notes" || name === "new_context")
767			return cfgCompactionExperimentalContextManagement.get(session.settings);
768		if (name === "checkpoint" || name === "rewind")
769			return (
770				cfgCheckpointEnabled.get(session.settings) &&
771				((session.taskDepth ?? 0) === 0 || requestedTools !== undefined)
772			);
773		if (name === "wait") {
774			return (
775				cfgAsyncEnabled.get(session.settings) ||
776				(session.enableIrc !== false && isIrcEnabled(session.settings, session.taskDepth ?? 0)) ||
777				cfgLaunchEnabled.get(session.settings)
778			);
779		}
780		if (name === "retain" || name === "recall" || name === "reflect") {
781			return ["hindsight", "mnemopi"].includes(cfgMemoryBackend.get(session.settings));
782		}
783		if (name === "memory_edit") return cfgMemoryBackend.get(session.settings) === "mnemopi";
784		if (name === "manage_skill")
785			return (
786				cfgAutolearnEnabled.get(session.settings) &&
787				((session.taskDepth ?? 0) === 0 || requestedTools !== undefined)
788			);
789		if (name === "learn") {
790			return (
791				cfgAutolearnEnabled.get(session.settings) &&
792				((session.taskDepth ?? 0) === 0 || requestedTools !== undefined) &&
793				["hindsight", "mnemopi", "local"].includes(cfgMemoryBackend.get(session.settings))
794			);
795		}
796		if (name === "task") {
797			return canSpawnAtDepth(cfgTaskMaxRecursionDepth.get(session.settings), session.taskDepth ?? 0);
798		}
799		return true;
800	};
```

Bốn tên **không** có nhánh nào: `read`, `write`, `edit` (built-in) và `yield` (hidden). Chúng rơi xuống `return true` ở dòng 799. `30 built-in − 29 tên có nhánh = {read, edit, write}`; `3 hidden − yield = 2` → đúng ba tên còn lại là `goal`, `think` (đã có nhánh).

### 2.3 `packages/coding-agent/src/tools/tool-admission.ts` — TẠO MỚI

`ls` → `No such file or directory`. Xác nhận chưa tồn tại.

Nguồn import cần dùng (đã kiểm, **không** có vòng lặp runtime):

| cần | import từ | neo đã kiểm |
| --- | --- | --- |
| `cfg*` (17 handle) | `./settings` | `index.ts:81-95` đang import từ đây |
| `canSpawnAtDepth` | `../task/types` | `index.ts:40` |
| `isIrcEnabled` | `../irc/messaging` | `index.ts:61` |
| `isFindEnabled` | `./jfind` | `index.ts:62` |
| `BuiltinToolName`, `HiddenToolName` | `./builtin-names` | `builtin-names.ts:34`, `:38` |
| `ToolSession` (**type-only**) | `./index` | `index.ts:208` |

```typescript
import { canSpawnAtDepth } from "../task/types";
import { isIrcEnabled } from "../irc/messaging";
import { isFindEnabled } from "./jfind";
import type { HiddenToolName, BuiltinToolName } from "./builtin-names";
import type { ToolSession } from "./index";
import {
	cfgAskEnabled, cfgAstEditEnabled, cfgAstGrepEnabled, cfgAsyncEnabled,
	cfgAutolearnEnabled, cfgBashEnabled, cfgCheckpointEnabled,
	cfgCompactionExperimentalContextManagement, cfgDebugEnabled, cfgGithubEnabled,
	cfgGlobEnabled, cfgGrepEnabled, cfgIdaAvailable, cfgLaunchEnabled, cfgLspEnabled,
	cfgMemoryBackend, cfgSecurityEnabled, cfgTaskMaxRecursionDepth, cfgTodoEnabled,
	cfgWebSearchEnabled,
} from "./settings";
```

### 2.4 `packages/coding-agent/src/tools/essential-tools.ts` — tuỳ chọn, vá lỗi có sẵn

| vị trí | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| **47** | `defaultLoadModeForToolName` | `return name in ESSENTIAL_BUILTIN_TOOL_NAMES ? "essential" : "discoverable";` | `return Object.hasOwn(ESSENTIAL_BUILTIN_TOOL_NAMES, name) ? "essential" : "discoverable";` |

`ESSENTIAL_BUILTIN_TOOL_NAMES` ở **23-37** (13 tên, 24-36) — **đúng sẵn**, plan ghi 23-37 là chính xác.
Đã chạy thật: `"toString" in ESSENTIAL` → `true`, `Object.hasOwn(ESSENTIAL, "toString")` → `false`. Lỗi có sẵn, **không** phải hồi quy do bạn gây ra.

### 2.5 `packages/coding-agent/src/sdk.ts` — tuỳ chọn, một dòng

| vị trí | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| **1173** (plan ghi 1161) | `SESSION_MANAGED_BUILTIN_TOOL_NAMES` | `const SESSION_MANAGED_BUILTIN_TOOL_NAMES = ["manage_skill", "learn", "context_notes", "new_context"];` | `const SESSION_MANAGED_BUILTIN_TOOL_NAMES: readonly BuiltinToolName[] = [...]` |

Cần thêm `import type { BuiltinToolName } from "./tools/builtin-names";` (kiểm `sdk.ts` đã import gì từ `./tools` trước khi thêm).

### 2.6 `packages/coding-agent/src/tools/builtin-names.ts` — KHÔNG SỬA

Đã đọc trọn 40 dòng. `BUILTIN_TOOL_NAMES` tên nằm ở **2-31** (30 tên), `HIDDEN_TOOL_NAMES` ở **36** (`["yield", "goal", "think"]`). **Hai neo plan này đúng sẵn.**

---

## 3. Các bước (mỗi bước có neo đã kiểm)

1. **Ghi baseline cổng.** Chạy `bun run check:ts 2>&1 | tail -25`, lưu vào một file tạm. Đỏ 2 lỗi ở §0 là baseline, không phải lỗi của bạn.

2. **Viết test đặc tính hoá TRƯỚC.** Tạo `packages/coding-agent/test/tools/tool-admission-table.test.ts`. Copy `makeSession` từ `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts:22-31` (đã đọc, đúng sẵn):
   ```typescript
   function makeSession(over: Record<string, unknown> = {}, extra: Partial<ToolSession> = {}): ToolSession {
       return {
           cwd: "/tmp/test",
           hasUI: false,
           skipPythonPreflight: true,
           getSessionFile: () => null,
           getSessionSpawns: () => "*",
           settings: Settings.isolated(over),
           ...extra,
       } as ToolSession;
   }
   ```
   Bắt buộc có `skipPythonPreflight: true` (`index.ts:645` đọc nó để bỏ qua probe Python) và **phải** truyền qua `Settings.isolated(over)` — mẫu gốc ở `issue-5764:22-31` **không** có tham số `over`, bạn phải thêm. Mẫu có sẵn tham số `over` nằm ở `packages/coding-agent/test/autolearn-tools-gating.test.ts:20-29`.

3. **Dòng (a) `goal` ba chiều** — neo `index.ts:744-748`. Đo thật, cho ra:

   | `getGoalModeState()` trả về | `plan.isAllowed("goal")` |
   | --- | --- |
   | `undefined` | `true` |
   | `{ enabled: true, goal: { status: "active" } }` | `true` |
   | `{ enabled: false, goal: { status: "active" } }` | `false` |
   | `{ enabled: false, goal: { status: "dropped" } }` | **`true`** ← ngoại lệ |

   Cột `dropped` là ô khó nhất trong cả WI-6: nó là cái phân biệt "ba chiều" với "hai chiều". Thiếu nó thì test vẫn xanh.

4. **Dòng (b) `wait` OR ba chiều** — neo `index.ts:773-779`. Ba nhánh: `cfgAsyncEnabled` (id `irc.async.enabled` hoặc tương tự — tra `tools/settings.ts`), `session.enableIrc !== false && isIrcEnabled(settings, taskDepth ?? 0)`, `cfgLaunchEnabled`. Bốn tổ hợp: chỉ-async, chỉ-irc, chỉ-launch, tất cả-tắt. Không cần `explicit` list.

5. **Dòng (c) `checkpoint`+`rewind` theo độ sâu** — neo `index.ts:768-772`. **BẪY, xem §6.1: bắt buộc `Settings.isolated({ "checkpoint.enabled": true })`**, vì `cfgCheckpointEnabled` có `default: false` (`tools/settings.ts:641-645`). Đo thật với setting bật:

   | `taskDepth` | có danh sách tool tường minh? | `isAllowed("checkpoint")` |
   | --- | --- | --- |
   | 0 | không | `true` |
   | 0 | có (`["read"]`) | `true` |
   | 1 | không | **`false`** |
   | 1 | có | **`true`** |

   Ô (1, không) là ô duy nhất phân biệt vế hạng `taskDepth === 0 || requestedTools !== undefined`. Không có nó thì dòng này vô nghĩa.

6. **Dòng (d) `manage_skill` autolearn** — neo `index.ts:784-788`. Cùng ma trận độ sâu, với `Settings.isolated({ "autolearn.enabled": true })`.

7. **Dòng (e) `learn` = (d) + trục backend** — neo `index.ts:789-795`. `memory.backend` ∈ `hindsight` / `mnemopi` / `local` → `true`; backend khác → `false`. Cần thêm trục `taskDepth` 0/1 × có/không danh sách tường minh như (d).

8. **Dòng (f) `task` qua `canSpawnAtDepth`** — neo `index.ts:796-798`. Đọc `cfgTaskMaxRecursionDepth`, **không** phải vế hạng `taskDepth === 0`. Đây là fork khác; đừng gộp vào (c)/(d).

9. **Dòng extension-tool** — `resolveBuiltinToolPlan(s, ["my_ext_tool"])` phải trả `["my_ext_tool"]` trong `.names`, qua mọi tổ hợp settings. **Đừng** dùng `toString` ở dòng này — xem §6.2.

10. **Dòng prototype-safety** — neo `index.ts:806` và `:799`. Khẳng định bằng **boolean**, không phải lọc danh sách:
    ```typescript
    expect(plan.isAllowed("toString")).toBe(true);
    expect(plan.isAllowed("constructor")).toBe(true);
    expect(plan.isAllowed("__proto__")).toBe(true);
    ```
    Đo thật trên code hiện tại: cả ba trả `true` (rơi xuống `return true` ở `:799`). Đo thật trên `Record` trần: `TABLE["toString"]` là **function**, `TABLE["constructor"]` là **function**, `TABLE["__proto__"]` là **object không gọi được → `TypeError`**. Đây là hợp đồng mà refactor sinh ra rủi ro phá; nó **xanh sẵn** và phải được viết **trước** để đỏ nếu ai đó dùng `Record` trần.

11. **Snapshot 33 tên (bắt buộc)** — plan nói đúng ở đây và đây là phần cứng nhất. 33 tên = `BUILTIN_TOOL_NAMES` (30) + `HIDDEN_TOOL_NAMES` (3). Duyệt ma trận `taskDepth ∈ {0,1}` × `explicit list ∈ {có, không}` × settings (tất cả tắt / tất cả bật / backend `hindsight` / `mnemopi` / `local`) và `expect(plan.isAllowed(name)).toBe(<bool>)` cho từng ô. Bảng kỳ vọng commit sẵn, sinh ra bằng probe một lần rồi **đóng băng**. Đo thật, `Settings.isolated()` rỗng, không explicit, depth 0:
    ```
    read=true bash=true edit=true ast_grep=false ast_edit=true ask=true debug=true
    ida=false eval=true github=false glob=true grep=true find=false lsp=true
    checkpoint=false rewind=false context_notes=false new_context=false
    security_scan=false task=true wait=true todo=true web_search=true write=true
    memory_edit=false retain=false recall=false reflect=false learn=false
    manage_skill=false yield=true goal=true think=false
    ```
    (33 dòng, `.names` tương ứng dài 15: `read bash edit ast_edit ask debug eval glob grep lsp task wait todo web_search write`.)

12. **Commit riêng test, production chưa đụng.** Xanh trên chuỗi `if` hiện tại. Nếu đỏ ở bước này thì `resolveBuiltinToolPlan` đã đổi — dừng lại, đọc lại `index.ts:626-813`.

13. **Tạo `src/tools/tool-admission.ts`.** `ToolAdmissionContext` với **đúng tám** field (đo lại, khớp 100% với biến tự do của closure). `ADMISSION_RULES` chú thích `satisfies Record<BuiltinToolName | HiddenToolName, ToolAdmissionRule>` — **union**, xem §6.3. 33 mục. `read`/`write`/`edit`/`yield` là `() => true` tường minh. Bốn mục `() => true` này làm bảng thành mô tả **đầy đủ**, không phải một phần.

14. **Export `TOOL_ADMISSION`.** `new Map(Object.entries(ADMISSION_RULES))` — lớp bọc `Map` là **có tải trọng**, xem §6.2.

15. **Gộp call site.** Ở `index.ts`, thay khối 738-800 bằng `admissionCtx` + một dòng gọi. Giữ **byte-identical** hình dạng export `BuiltinToolPlan.isAllowed` (`index.ts:618`) và object trả về (`index.ts:813`) vì `sdk.ts:3363` gọi nó trong đường reconcile settings.

16. **Kiểm thứ tự mutate `requestedTools`.** Đo thật, không phỏng đoán:
    - `requestedTools` khai báo ở `index.ts:630-635` (`string[] | undefined`)
    - block mutate chạy ở **719-737** (gồm `requestedTools.push("goal")` ở 640, `"think"` ở 720, `manage_skill`/`learn` ở 728-734, `ast_grep`/`ast_edit` ở 703/708, `recall`/`retain`/`reflect` ở 713-716, `memory_edit` ở 719, và `"yield"` ở **802-803**)
    - chuỗi `if` định nghĩa ở **738-800**
    - **gọi lần đầu ở 806 và 808**

    Nghĩa là `push("yield")` ở 802-803 chạy **sau khi** chain được định nghĩa nhưng **trước** khi chain được gọi ở 806/808. Vì `ctx.requestedTools` chỉ được so sánh bằng `!== undefined` (tham chiếu sống), hành vi giữ nguyên. **KHÔNG chụp `requestedTools` thành bản sao trong `admissionCtx`** — chính comment của plan ở `index.ts:626` nói rõ đây là chỗ dễ phá nhất.

17. **Tuỳ chọn — `essential-tools.ts:47`.** `in` → `Object.hasOwn`.

18. **Tuỳ chọn — `sdk.ts:1173`.** Thêm chú thích `readonly BuiltinToolName[]`.

---

## 4. Hợp đồng test

**Tên file:** `packages/coding-agent/test/tools/tool-admission-table.test.ts` (tạo mới).
**File phải giữ xanh:** `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts` (đã chạy: **6 pass / 0 fail**).

Bảo vệ: *"tập tool mà một session được nhận không thay đổi khi thang admission trở thành một bảng"*.

**Người dùng thấy gì nếu hồi quy** — một trong hai, không cái nào báo lỗi:
- **Một built-in biến mất khỏi schema tool của model.** Không có dòng log, không có exception. Model chỉ đơn giản không còn gọi được `checkpoint` / `wait` / `learn`, và người dùng thấy agent "chậm hẳn" hoặc "không nhớ nữa" mà không có manh mối.
- **Một tool lẽ ra không được đưa cho model lại được đưa.** Schema phình, token tăng, và tool đó có thể **viết** (`manage_skill` khi `autolearn` tắt; `memory_edit` khi backend không phải `mnemopi`). Đây là hậu quả nặng hơn: tool ghi được nhận khi nó không nên.

Cụ thể snapshot 33 tên đóng dấu: ngoại lệ `dropped` của `goal`; OR ba chiều của `wait`; vế hạng dùng chung của ba luật phụ thuộc độ sâu; fork `canSpawnAtDepth` của `task`; mặc định-cho-phép cho mọi thứ không phải built-in.

**Dòng prototype-safety** bắt đúng cơ chế `Record` ngây thơ. **Dòng extension-tool** bắt một bảng khoá theo sai union, hoặc một phép tra cụ thể bỏ sót mặc định `?? true`.

---

## 5. Cổng

```bash
# 0. BASELINE — chạy TRƯỚC khi sửa, lưu lại output
bun run check:ts 2>&1 | tail -25

# 1. Cổng chính
bun run check:ts 2>&1 | tail -25

# 2. Test đặc tính hoá + hợp đồng
cd packages/coding-agent && bun test test/tools/tool-admission-table.test.ts

# 3. Canh chống độ trôi có sẵn
cd packages/coding-agent && bun test test/issue-5764-registertool-loadmode.test.ts

# 4. Cặp bị loại trừ khỏi họ phụ thuộc độ sâu
cd packages/coding-agent && bun test test/experimental-context-management.test.ts
```

Tuyệt đối không `tsc` / `npx tsc` — dự án cấm.

### 5.1 `check:ts` có ĐỎ ĐƯỢC không? **CÓ — ba cơ chế, đã kiểm từng cái**

| cơ chế | bằng chứng |
| --- | --- |
| **(1) Rơi một field context** | Một trong tám field không được đưa vào `admissionCtx` → luật đọc `undefined` → ô tương ứng trong snapshot 33 tên lệch → đỏ. Đây là cơ chế duy nhất bắt được lỗi nguy hiểm nhất, và **chỉ** vì có snapshot đó. Sáu dòng (a)-(f) phủ 7/33 tên — rơi `enableLsp` hay `externalThinkingActive` vẫn xanh cả bảy. |
| **(2) `Map` → `Record` trần** | Đo thật: `TABLE["toString"]` → function, `TABLE["constructor"]` → function, `TABLE["__proto__"]` → object không gọi được → `TypeError`. `expect(isAllowed("toString")).toBe(true)` đỏ vì trả function chứ không phải `true`; `isAllowed("__proto__")` **ném** chứ không chỉ đỏ. |
| **(3) Khoá bảng theo `ToolName`** | `Record<ToolName, …>` không typecheck vì `goal`/`think` là `HiddenToolName` → `bun run check:types` đỏ ở `pi-coding-agent`. |

### 5.2 Hai tuyên bố trong plan về cổng là SAI cho cây này — đã kiểm

- **"Test đặc tính hoá — CẦN ADDON NATIVE. `brew install ninja` … `bun --cwd=packages/natives run build`"** → **không cần**. Addon đã có sẵn: `packages/natives/native/pi_natives.darwin-arm64.node`. Tôi đã chạy một probe thật gọi `resolveBuiltinToolPlan` với `makeSession` tối thiểu: **3 pass / 0 fail / 493ms**, không lỗi addon. Bỏ bước `ninja`/`build` khỏi checklist; nó chỉ thừa khi bạn vừa `git clean` sạch `packages/natives/native/`.
- **"Baseline `bun run check:ts` xanh tại HEAD"** → **đỏ**, xem §0.

### 5.3 Điều kiện để cổng thật sự đỏ được (viết lại cho đỏ được)

Cổng chỉ đỏ được nếu **cả ba** điều sau đúng:

1. Snapshot 33 tên được commit với bảng kỳ vọng **đóng băng**, không phải sinh lại ở mỗi lần chạy.
2. Dòng prototype-safety dùng `toBe(true)`, **không** dùng `toBeTruthy()` và **không** dùng "có mặt trong `.names`" — vì `function` và `true` đều truthy, chỉ `toBe(true)` mới đỏ.
3. Bước 4 của §3 (ô `taskDepth=1` / không có danh sách tường minh) được viết và **được giữ** — bỏ nó đi thì cơ chế (1) mất một nửa độ phủ.

Nếu không làm (1), cổng là **xanh giả**: nó chứng minh code biên dịch được, không chứng minh admission không đổi.

---

## 6. Cạm bẫy riêng của WI-6 này

### 6.1 Dòng test (c) sẽ **trống** nếu bạn quên bật setting

`cfgCheckpointEnabled` có `default: false` (`tools/settings.ts:641-645`). Đo thật ở `Settings.isolated()` rỗng:

```
depth=0 explicit=false checkpoint=true  ← không, đây là KHI ĐÃ BẬT setting
```

Với setting **tắt** (mặc định), cả bốn tổ hợp đều trả `false` → dòng (c) không phân biệt được vế hạng `taskDepth === 0 || requestedTools !== undefined`, và test xanh **vì lý do sai**. Cùng cảnh báo áp cho (d) `autolearn.enabled` và (e) `memory.backend`.

### 6.2 `name in BUILTIN_TOOLS` ở `index.ts:806` vẫn còn ô nhiễm prototype — và `Map` **không** sửa nó

Đo thật, hôm nay:
```
resolveBuiltinToolPlan(session, ["my_ext_tool", "toString"]).names
  → ["toString"]
```
Một tool extension tên `toString` **lọt vào `.names`** ngay bây giờ, qua `name in BUILTIN_TOOLS` ở dòng 806 (`in` trên object literal bị ô nhiễm prototype y hệt). `TOOL_ADMISSION` dạng `Map` chỉ sửa **phép tra trong bảng admission**, không đụng tới cổng ở 806.

Hệ quả cho test: **đừng** viết dòng extension-tool dưới dạng "tên `toString` phải sống sót" — nó xanh sẵn, xanh sau, và **không kiểm tra gì về admission**. Hợp đồng prototype-safety thật của WI-6 chỉ là ba khẳng định boolean ở bước 10. Việc vá cổng 806 là một work item riêng; ghi vào sổ khoảng trống, đừng gộp vào đây.

### 6.3 `Record<ToolName, …>` không typecheck — và vì sao

`index.ts:600`: `export type ToolName = BuiltinToolName;` → 30 tên. Nhưng `goal` và `think` là `HiddenToolName` (`builtin-names.ts:36`) và mang luật **thật**, không phải mặc định. Key phải là `BuiltinToolName | HiddenToolName` (33). Viết theo đúng plan gốc sẽ hoặc làm typecheck hỏng, hoặc âm thầm làm rơi luật `goal` — tức luật ba chiều có ngoại lệ `dropped`, tức chính dòng test (a).

### 6.4 Tên hàm tự mâu thuẫn giữa bước 8 và bước 9 của plan

Bước 8 export `isToolAllowed(name, ctx)`; bước 9 lại gọi `evaluateToolAdmission(name, admissionCtx)`. Ngoài ra `index.ts:738` **đã** có một `const isToolAllowed` cục bộ — import thẳng tên sẽ đụng tên. Dùng import alias, ví dụ:

```typescript
import { isToolAllowed as evaluateToolAdmission, type ToolAdmissionContext } from "./tool-admission";
```

### 6.5 Lý do "tách module riêng để tránh vòng lặp ngược về `index.ts`" trong plan là **sai**

`ToolSession` được định nghĩa tại `index.ts:208`, và code shape của chính plan làm `import type { ToolSession } from "./index"`. Đó là một vòng lặp **mức kiểu** (type-only → bị xoá lúc biên dịch, vô hại với runtime). Lý do đúng để tách module là giữ `index.ts` (giờ **973** dòng) không dài thêm ~60 dòng, và cho phép import cfg handle trực tiếp từ `./settings` — đừng viết lý do vòng lặp vào PR.

### 6.6 Đừng đơn giản hoá `Map` về object trần "cho gọn"

Đó là cơ chế hỏng số 2 ở §5.1, và nó **im lặng**: `isAllowed("toString")` trả một `function` — truthy, nên `.names` vẫn "đúng", và mọi phép lọc vẫn cho kết quả giống nhau. Chỉ `toBe(true)` mới thấy. Đừng tối ưu `Map` đi.

### 6.7 Thứ tự nhánh **không** phải rủi ro — plan nói đúng khi đính chính

25 nhánh, 29 tên phân biệt, **không tên nào lặp** → nhiều nhất một nhánh khớp một `name`. Việc cơ học là bất nhạm với thứ tự. **Rủi ro thật là capture**: tám biến tự do thành tám field context, và **một field rơi thì biên dịch vẫn sạch**. Đừng dồn thời gian vào sắp xếp lại thứ tự.

### 6.8 `requestedTools` là mảng sống, không phải ảnh chụp

`ctx.requestedTools` được đọc bằng `!== undefined` ở ba luật. Giữ nguyên tham chiếu. Chụp bản sao (`[...requestedTools]`) sẽ làm sai mọi thứ ở dòng (c)/(d)/(e) mà test vẫn có thể xanh nếu bạn chỉ test depth 0.

### 6.9 Sai lệch chung của cả mục: file đã dài thêm 7 dòng kể từ lúc plan được viết

Mọi neo `index.ts` trong WI-6 lệch **đều +7**; `sdk.ts:1161` lệch **+12**, `sdk.ts:3350` lệch **+13**. Nếu bạn `sed -n '731p'` bạn sẽ đọc trúng nhánh `learn`, không phải dòng mở đầu. Dùng bảng neo đã sửa ở §2.1, hoặc grep theo tên (`grep -n 'const isToolAllowed' …`).

---

## 7. Phụ thuộc

- `WI-2` (collision rules), `WI-5` (capability registry).
- Chặn: lần tách built-in → extension đầu tiên dưới WI-6/WI-8a; `WI-8a`.
- Cùng wave, không chặn: `WI-17` (`:2485`).

## 8. Cần người quyết (chưa có câu trả lời trong plan)

1. Bốn dòng `() => true` tường minh hay để mặc định `?? true`? — hình thức, không khác hành vi. **Khuyến nghị: tường minh** (bảng thành mô tả đầy đủ).
2. Dòng prototype-safety nằm trong PR này hay tách hardening? — **Khuyến nghị: nằm trong**, vì nó là hợp đồng mà chính refactor này tạo ra.
3. `SESSION_MANAGED_BUILTIN_TOOL_NAMES` thuộc WI-6 hay WI-5? — **Khuyến nghị: WI-6**, cùng lớp vấn đề.
4. Hai thay đổi tuỳ chọn (bước 17, 18) ở trong phạm vi không? — **Khuyến nghị: `essential-tools.ts:47` TÁCH RA** (lỗi có sẵn, không liên quan bảng); `sdk.ts:1173` GIỮ (một dòng, cùng chủ đề "một nguồn sự thật").
