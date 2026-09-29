## WI-6. Bảng admission tool — một nguồn sự thật khai báo duy nhất cho việc tool nào được đưa tới model

**Thay đổi gì:** Thay thế chuỗi 25 nhánh `if (name === …)` bên trong `isToolAllowed` bằng một `Map` duy nhất ánh xạ tên tool → quy tắc admission, để việc một built-in tool có được nhận hay không trở thành **một mục dữ liệu** thay vì **một vị trí trong chuỗi**, và làm cho bốn khai báo tên tool chạy song song trở nên chứng minh được là khớp nhau. **Wave:** 4. **Effort:** M (~1.5 days) — chủ yếu là việc cơ học cẩn thận, cộng một test đặc tính hoá (characterization test) phải được viết và chứng minh xanh **TRƯỚC** khi refactor, không phải sau.

**Người dùng thấy:** Trực tiếp thì **không** — đúng tập tool đó đi tới model trước và sau khi thay đổi. Nó chỉ thành hữu hình thông qua công việc khác mà nó mở đường: nó gom ba site admission (`BUILTIN_TOOL_NAMES`, `BUILTIN_TOOLS`, chuỗi `isToolAllowed`) vào một định danh duy nhất, và biến việc thêm một built-in mới thành bắt buộc kèm một quyết định admission ở thời điểm biên dịch. **Phần "một built-in ra thành extension là một thay đổi một file" thuộc về WI-6 + WI-5 + WI-8a cộng lại, không phải WI-6 đứng riêng** — và tính riêng WI-6 thì nó còn làm *tăng* số file phải sửa cho thao tác đó (chuỗi `if` rời khỏi `index.ts` sang `tool-admission.ts`).

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/tools/index.ts` | sửa | Thay chuỗi 25 nhánh `isToolAllowed` (dòng 731-793) bằng một object context + một dòng gọi xuống module bảng mới. Thêm import. `BuiltinToolPlan.isAllowed` (dòng 611) và object được trả về (dòng 806) giữ nguyên hình dạng hiện tại. | **Có.** `const isToolAllowed = (name: string) => {` nằm ở dòng 731 và chuỗi đóng bằng `};` ở dòng 793. Khoảng `:725-789` mà plan nêu lệch 6 dòng ở đầu và 4 dòng ở cuối. |
| `packages/coding-agent/src/tools/tool-admission.ts` | tạo | Module mới chứa `ToolAdmissionContext`, object `ADMISSION_RULES` (`satisfies Record<BuiltinToolName \| HiddenToolName, ToolAdmissionRule>`), Map `TOOL_ADMISSION`, và helper `isToolAllowed`. | **Chưa** — file mới, chưa tồn tại (dòng 0). Tách thành module riêng thay vì thêm ~60 dòng vào `index.ts` đã dài 966 dòng; tách riêng cũng giữ cho các cfg getter import được mà không tạo vòng lặp ngược về `index.ts`. |
| `packages/coding-agent/test/tools/tool-admission-table.test.ts` | tạo | Test đặc tính hoá + hợp đồng. 6 dòng bảng mỗi dòng một nhánh khác nhau, 1 dòng extension-tool, 1 dòng prototype-safety, tất cả chạy qua `resolveBuiltinToolPlan` và khẳng định trên `.names`. | **Chưa** — file mới, chưa tồn tại (dòng 0). Đã xác nhận vắng mặt: `ls` trên đường dẫn đó trả về `No such file or directory`. Đường dẫn trong plan là đúng và trống. |
| `packages/coding-agent/src/tools/essential-tools.ts` | sửa | **Tuỳ chọn.** `name in ESSENTIAL_BUILTIN_TOOL_NAMES` → `Object.hasOwn(ESSENTIAL_BUILTIN_TOOL_NAMES, name)` tại dòng 47, vá rò rỉ khóa prototype vào `"essential"`. | **Có.** Dòng 47 là `return name in ESSENTIAL_BUILTIN_TOOL_NAMES ? "essential" : "discoverable";`. Đã xác nhận bằng thực thi rằng `defaultLoadModeForToolName("toString")` hôm nay trả về `"essential"`. Khoảng `:23-37` của chính record là đúng. |
| `packages/coding-agent/src/sdk.ts` | sửa | **Tuỳ chọn, một dòng:** chú thích `SESSION_MANAGED_BUILTIN_TOOL_NAMES` thành `readonly BuiltinToolName[]` để một chính tả trong danh sách đó là lỗi biên dịch thay vì một lượt trượt âm thầm lúc runtime. | **Có.** `const SESSION_MANAGED_BUILTIN_TOOL_NAMES = ["manage_skill", "learn", "context_notes", "new_context"];` ở dòng 1161, hiện là `string[]` không kiểu, không có liên kết biên dịch nào với union tên built-in. |
| `packages/coding-agent/src/tools/builtin-names.ts` | sửa | **Không cần thay đổi.** Đã xác minh là neo đúng và vốn đã là nguồn duy nhất cho `BUILTIN_TOOL_NAMES` (30 tên, dòng 2-31) và `HIDDEN_TOOL_NAMES` (3 tên, dòng 36). | **Có.** Đã đọc. Các neo `:2-31` và `:36` của plan là **đúng** — chỉ là các neo plan đúng ngay từ đầu trong toàn bộ mục này. `BUILTIN_TOOL_NAMES` đã được tiêu thụ như union `BuiltinToolName` bởi `tools/index.ts:554`. |

### Các bước

1. **Anchor `packages/coding-agent/src/tools/index.ts:731-793`.** Trước khi đụng vào bất cứ thứ gì, hãy viết test đặc tính hoá (bước 2) và làm cho nó **xanh** trên chuỗi `if` **hiện tại**. Cảnh báo của chính plan là đúng ở chỗ đây là nơi công việc đi sai; cách phòng ngựa duy nhất là một test từng đỏ khi hành vi khác đi, và test đó vô dụng nếu viết sau khi refactor.

2. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts` (tạo).** Dựng một helper `makeSession(overrides)` mô phỏng theo helper ở `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts:22-31` — nó **BẮT BUỘC** đặt `skipPythonPreflight: true`, nếu không `resolveBuiltinToolPlan` sẽ chờ một lần dò kernel Python thật. Dẫn mọi dòng bảng qua `resolveBuiltinToolPlan(session, toolNames)` đã export và khẳng định trên danh sách `.names` đã resolve, **không bao giờ** khẳng định vào bên trong bảng (AGENTS.md: khẳng định hợp đồng quan sát được, và plan đồng ý rằng hợp đồng là "tool nào được đưa cho model").

3. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts`.** Thêm **đúng sáu** dòng bảng, mỗi dòng một nhánh **khác nhau**, không trùng lặp: (a) `goal` ba chiều — goal.enabled tắt, và các trạng thái `getGoalModeState()` là `undefined` / `{enabled:false}` / `{enabled:false, status:"dropped"}`; (b) `wait` OR ba chiều — từng cái async / irc / launch một mình, cộng cả ba đều tắt, vì chính cái OR **là** toàn bộ luật; (c) cặp `checkpoint`+`rewind` phụ thuộc độ sâu ở `taskDepth` 0 và 1, có và không có danh sách tool tường minh; (d) `manage_skill` autolearn bật/tắt giao với cùng ma trận độ sâu; (e) `learn` = (d) cộng thêm trục memory-backend (`local` được nhận, một backend không nằm trong danh sách thì không); (f) `task` qua `canSpawnAtDepth` tại giới hạn đệ quy — đây thực sự là một fork **khác** ( nó đọc `cfgTaskMaxRecursionDepth`, không phải vế hạng từ `taskDepth === 0`), và đó là lý do nó xứng đáng một dòng riêng thay vì bị gộp vào (c)/(d).

4. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts`.** Thêm dòng mà plan gọi là bắt buộc và là dòng **hỏng trước tiên**: một tên tool do extension đăng ký mà **không phải** built-in phải sống sót qua `resolveBuiltinToolPlan` **không đổi** dưới **mọi** tổ hợp settings. Duyệt một ma trận settings đại diện (tất cả cổng tắt, tất cả cổng bật, memory backend `mnemopi`, autolearn bật, goal mode bật) và khẳng định tên extension nằm trong `.names` mỗi lần.

5. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts`.** Thêm dòng prototype-safety: một tool extension tên `toString` (và `constructor`) phải được nhận, và một tên `__proto__` phải được nhận mà **không ném lỗi**. Khẳng định bằng **định danh boolean**, không phải bằng phép lọc danh sách: `expect(plan.isAllowed("toString")).toBe(true)`, `expect(plan.isAllowed("constructor")).toBe(true)`, `expect(plan.isAllowed("__proto__")).toBe(true)`. Phải là `toBe(true)` chứ không phải `toBeTruthy()` hay "có mặt trong `.names`" — vì dưới một `Record` ngây thơ, `TABLE["toString"]?.(ctx)` trả về **chuỗi truthy** (`"[object Object]"`) và `TABLE["constructor"]?.(ctx)` trả về `{}`, mà chuỗi truthy và `true` không phân biệt được khi lọc `.names`; chỉ phép khẳng định `toBe(true)` mới đỏ. `__proto__` đỏ theo cơ chế riêng: tra ra thứ không phải hàm và ném `TypeError` khi gọi. Đây là hợp đồng **mới**, mà code cũ thoả mãn một cách tình cờ (chuỗi `if` rơi xuống `return true`) và một cách hiện thực `Record` ngây thơ sẽ phá vỡ. Đóng dấu nó trước khi refactor để lỗi trở nên quan sát được.

6. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts`.** Commit test đặc tính hoá **riêng một mình**, với mã production chưa đụng tới. Xác nhận nó xanh. Nếu không, thì chuỗi `if` không phải là thứ plan nói — dừng lại và đọc lại `tools/index.ts:731-793`.

7. **Anchor `packages/coding-agent/src/tools/tool-admission.ts` (tạo).** Tạo module mới. Khai báo interface `ToolAdmissionContext` với **một** field cho mỗi closure capture đã liệt kê trong `risk`, rồi object `ADMISSION_RULES` chú thích `satisfies Record<BuiltinToolName | HiddenToolName, ToolAdmissionRule>` — **union**, KHÔNG phải `ToolName`, vì `goal` và `think` là `HiddenToolName` còn `ToolName = BuiltinToolName` (`tools/index.ts:593`). Cho `read`/`write`/`edit`/`yield` các mục tường minh `() => true`: chúng không có nhánh nào trong chuỗi cũ, và việc nói ra chúng biến bảng thành một mô tả **đầy đủ** về admission thay vì một mô tả một phần.

8. **Anchor `packages/coding-agent/src/tools/tool-admission.ts`.** Export `TOOL_ADMISSION: ReadonlyMap<string, ToolAdmissionRule> = new Map(Object.entries(ADMISSION_RULES))` cùng helper `isToolAllowed(name, ctx)` có phép tra là `TOOL_ADMISSION.get(name)?.(ctx) ?? true`. Lớp bọc `Map` là **cố ý** và **có tải trọng thật** — đừng đơn giản hoá nó lại thành object trần; lý do nằm trong `code_shape` và được lặp lại ở mục *Đính chính so với plan*.

9. **Anchor `packages/coding-agent/src/tools/index.ts:731-793`.** Xoá toàn bộ chuỗi 25 nhánh và thay bằng một object literal `admissionCtx` cộng với `const isToolAllowed = (name: string) => evaluateToolAdmission(name, admissionCtx)`. Giữ nguyên **byte-identical** hình dạng export của `BuiltinToolPlan.isAllowed` (`tools/index.ts:611`) — `sdk.ts:3350` gọi nó trong đường reconcile settings trực tiếp và không được phép cần thay đổi.

10. **Anchor `packages/coding-agent/src/tools/index.ts:719-730`.** Kiểm kê **THỨ TỰ** các lần mutate `requestedTools` so với thời điểm dựng `admissionCtx`. `requestedTools.push("yield")` ở `:794-796` chạy **sau** khi `isToolAllowed` được định nghĩa nhưng **trước** khi nó được gọi ở `:799`/`:801`; ba luật phụ thuộc độ sâu đọc `ctx.requestedTools !== undefined`, một phép so sánh tham chiếu **sống sót** qua lệnh push, nên hành vi được giữ nguyên — nhưng hãy **kiểm chứng** thay vì phỏng đoán, và **KHÔNG** chụp `requestedTools` thành một bản sao trong context.
    *(Ghi chú kiểm chứng: các neo `:794-796`, `:799`, `:801` được lấy từ mục `risk`/`plan_corrections` của spec; cờ `verified=true` tường minh trong `files_touched` chỉ phủ khoảng `:731-793`, `:611`, `:806`, `:593`, `:554` của chính file này. Khi thực thi nên tự xác nhận lại hai dòng này.)*

11. **Anchor `packages/coding-agent/src/tools/essential-tools.ts:47`.** Tuỳ chọn nhưng rất đáng làm, và đây chính là thời điểm tự nhiên để làm nó: `defaultLoadModeForToolName` dùng `name in ESSENTIAL_BUILTIN_TOOL_NAMES` trên một object literal, nên `defaultLoadModeForToolName("toString")` hôm nay trả về `"essential"` — các key của `Object.prototype` thoả mãn phép `in`. Chuyển sang `Object.hasOwn(ESSENTIAL_BUILTIN_TOOL_NAMES, name)`. Đây là **lỗi có sẵn**, không phải hồi quy do bạn gây ra; hãy ghi rõ như vậy trong PR để không bị nhầm lẫn với công việc về bảng.

12. **Anchor `packages/coding-agent/src/tools/essential-tools.ts:23-37` (đã kiểm chứng) và `packages/coding-agent/src/sdk.ts:1161`.** Xử lý nửa "một nguồn sự thật". Cặp `BUILTIN_TOOL_NAMES` ↔ `BUILTIN_TOOLS` **đã** được ép buộc ở thời điểm biên dịch (`tools/index.ts:554`, `Record<BuiltinToolName, ToolFactory>` — trình biên dịch báo lỗi khi thiếu **lẫn** khi thừa key), nên không có gì để gộp ở đó. Hai khai báo **không** có liên kết kiểu nào là `ESSENTIAL_BUILTIN_TOOL_NAMES` (`Record<string, true>`, key không kiểu, chỉ được canh bằng test runtime tại `issue-5764-registertool-loadmode.test.ts:113`) và `SESSION_MANAGED_BUILTIN_TOOL_NAMES` (`sdk.ts:1161`, một mảng string trần). Hãy cho cái sau chú thích `readonly BuiltinToolName[]` — một thay đổi một dòng biến một độ trôi dạng âm thầm thành lỗi biên dịch. **Giữ nguyên** `ESSENTIAL_BUILTIN_TOOL_NAMES` dưới dạng record được canh lúc runtime — nó được khoá theo **hành vi lớp tool**, không theo danh tính tên, và canh chống hiện có là công cụ đúng cho việc đó.

### Hình dạng code

```typescript
// packages/coding-agent/src/tools/tool-admission.ts  (NEW)

import type { BuiltinToolName, HiddenToolName } from "./builtin-names";
import type { ToolSession } from "./index";

/** Every value the admission rules are allowed to read. One field per closure capture. */
export interface ToolAdmissionContext {
	readonly session: ToolSession;
	/** Session forces a restricted subagent set; blocks `goal` outright. */
	readonly restrictToolNames: boolean;
	/** Live array — read for `!== undefined` by the three depth-gated rules. */
	readonly requestedTools: readonly string[] | undefined;
	readonly includeYield: boolean;
	readonly enableLsp: boolean;
	readonly goalEnabled: boolean;
	readonly externalThinkingActive: boolean;
	readonly allowEval: boolean;
}

export type ToolAdmissionRule = (ctx: ToolAdmissionContext) => boolean;

/** Keyed by the UNION, not `ToolName` (= `BuiltinToolName`): `goal` and `think` carry real
 *  rules but are `HiddenToolName`, so a `Record<ToolName, …>` would not typecheck. */
const ADMISSION_RULES = {
	// --- always admitted: the three transport tools + yield had NO branch in the old chain ---
	read: () => true,
	write: () => true,
	edit: () => true,
	yield: () => true,

	// --- three-way goal rule (old `tools/index.ts:737-741`) ---
	goal: (ctx) => {
		if (!ctx.goalEnabled || ctx.restrictToolNames) return false;
		const state = ctx.session.getGoalModeState?.();
		return state === undefined || state.enabled === true || state.goal.status === "dropped";
	},

	// --- depth-gated family: the SAME `taskDepth === 0 || requestedTools !== undefined` term ---
	checkpoint: (ctx) =>
		cfgCheckpointEnabled.get(ctx.session.settings) &&
		((ctx.session.taskDepth ?? 0) === 0 || ctx.requestedTools !== undefined),
	rewind: (ctx) =>
		cfgCheckpointEnabled.get(ctx.session.settings) &&
		((ctx.session.taskDepth ?? 0) === 0 || ctx.requestedTools !== undefined),
	manage_skill: (ctx) =>
		cfgAutolearnEnabled.get(ctx.session.settings) &&
		((ctx.session.taskDepth ?? 0) === 0 || ctx.requestedTools !== undefined),
	learn: (ctx) =>
		cfgAutolearnEnabled.get(ctx.session.settings) &&
		((ctx.session.taskDepth ?? 0) === 0 || ctx.requestedTools !== undefined) &&
		["hindsight", "mnemopi", "local"].includes(cfgMemoryBackend.get(ctx.session.settings)),

	// --- three-way OR (old `:766-772`) ---
	wait: (ctx) =>
		cfgAsyncEnabled.get(ctx.session.settings) ||
		(ctx.session.enableIrc !== false && isIrcEnabled(ctx.session.settings, ctx.session.taskDepth ?? 0)) ||
		cfgLaunchEnabled.get(ctx.session.settings),

	// --- its OWN depth gate, via canSpawnAtDepth — a different fork, not a duplicate row ---
	task: (ctx) => canSpawnAtDepth(cfgTaskMaxRecursionDepth.get(ctx.session.settings), ctx.session.taskDepth ?? 0),

	// --- simple single-setting reads, one line each ---
	lsp: (ctx) => ctx.enableLsp && cfgLspEnabled.get(ctx.session.settings),
	bash: (ctx) => cfgBashEnabled.get(ctx.session.settings),
	eval: (ctx) => ctx.allowEval,
	// … 19 more, one per old branch …
} satisfies Record<BuiltinToolName | HiddenToolName, ToolAdmissionRule>;

/** `satisfies` above gives COMPILE-TIME exhaustiveness (missing AND extra keys both error).
 *  Wrapping in a Map gives PROTOTYPE-SAFE lookup: `ADMISSION['toString']` would return a
 *  callable `Object.prototype.toString` (truthy string, not a boolean) and `["__proto__"]`
 *  would return a non-function that throws when called. A plain `Record` lookup is a
 *  live hazard here because `tools/index.ts:799` already lets `"toString"` past its own
 *  `name in BUILTIN_TOOLS` gate. */
export const TOOL_ADMISSION: ReadonlyMap<string, ToolAdmissionRule> = new Map(
	Object.entries(ADMISSION_RULES),
);

/** Default-allow. A name with no rule is NOT a built-in — extension / MCP / custom tool. */
export function isToolAllowed(name: string, ctx: ToolAdmissionContext): boolean {
	return TOOL_ADMISSION.get(name)?.(ctx) ?? true;
}

// packages/coding-agent/src/tools/index.ts — the call site collapses to:
//
//   const admissionCtx: ToolAdmissionContext = {
//     session, restrictToolNames, requestedTools, includeYield,
//     enableLsp, goalEnabled, externalThinkingActive, allowEval,
//   };
//   const isToolAllowed = (name: string) => evaluateToolAdmission(name, admissionCtx);
//
// …and `isToolAllowed` keeps its exact current signature, so the `BuiltinToolPlan.isAllowed`
// contract at `tools/index.ts:611` and its consumer at `sdk.ts:3350` are untouched.
```

### Hợp đồng test

Bảo vệ: *"tập tool mà một session được nhận không thay đổi khi thang admission trở thành một bảng"*. Một hồi quy ở phía người tiêu dùng ở đây là **âm thầm và nghiêm trọng** — một tool thừa trong schema tốn token và làm rối model, một tool thiếu làm một năng lực trở nên không với tới được mà không có lỗi nào ở bất kỳ đâu. Cụ thể nó đóng dấu: luật ba chiều của `goal` **bao gồm** ngoại lệ trạng thái `dropped`; phép OR ba chiều trong `wait`; ba luật phụ thuộc độ sâu dùng chung vế hạng từ `taskDepth === 0 || requestedTools !== undefined`; fork `canSpawnAtDepth` riêng của `task`; và mặc định-cho-phép cho bất cứ thứ gì không phải built-in.

Nếu hồi quy, người tiêu dùng thấy một trong hai: hoặc một built-in tool biến mất khỏi schema của model mà không có lỗi nào báo ra, hoặc một tool không nên tới được model mà lại tới. Dòng prototype-safety là dòng bắt được một cách hiện thực `Record` ngây thơ, và dòng extension-tool là dòng bắt được một bảng vô tình khoá theo sai union hoặc một phép tra cụ thể bỏ sót mặc định `?? true` của nó.

**Tên file test:**
- `packages/coding-agent/test/tools/tool-admission-table.test.ts` (tạo mới)
- `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts` (giữ làm lưới hồi quy, phải xanh)

### Xác minh

```bash
# 1. Cổng chính, chạy được khi native addon chưa build
bun run check:ts

# 2. Test đặc tính hoá — BỊ CHẶN ở HEAD 808b365: báo 0 pass / 1 fail,
#    "Failed to load pi_natives native addon for darwin-arm64"
#    Build addon trước rồi chạy lại:
bun --cwd=packages/natives run build
cd packages/coding-agent && bun test test/tools/tool-admission-table.test.ts

# 3. Canh chống độ trôi sẵn có — phải giữ xanh
cd packages/coding-agent && bun test test/issue-5764-registertool-loadmode.test.ts

# 4. Cặp bị loại trừ khỏi họ phụ thuộc độ sâu
cd packages/coding-agent && bun test test/experimental-context-management.test.ts
```

Không dùng `tsc` — dự án cấm. `check:ts` là cổng chính.

### Cổng hoàn thành

Test đặc tính hoá ở các bước 2-6, viết và commit **trước** khi refactor, xanh **cả trước và sau**. Cụ thể: cả sáu dòng nhánh, cộng dòng extension-tool, cộng dòng prototype-safety, phải pass trên **cả hai** — chuỗi 25 nhánh lẫn bảng. Nhưng sáu dòng (a)-(f) chỉ phủ **7 trong 29** tên mà chuỗi `if` xử lý — 22 tên còn lại (`lsp`, `eval`, `think`, `todo`, `find`, `retain`/`recall`/`reflect`, `memory_edit`, `context_notes`/`new_context`, …) không có dòng nào biến động chúng, nên rơi `enableLsp` hay `externalThinkingActive` vẫn khiến cả bảy dòng kia xanh. Vì vậy phần kiểm kê phải là một test **snapshot** tự động trong `tool-admission-table.test.ts`, không phải một đợt làm tay: trên ma trận settings × độ sâu (taskDepth 0 và 1 × tất cả cổng tắt và tất cả cổng bật × memory backend `hindsight`/`mnemopi`/`local`), gọi `resolveBuiltinToolPlan` cho **từng** tên trong `BUILTIN_TOOL_NAMES` + `HIDDEN_TOOL_NAMES` (33 tên) rồi `expect(plan.isAllowed(name)).toBe(true/false)` theo một bảng kỳ vọng commit sẵn. Vì 33 tên đều có ô, một field context bị rơi làm **một** ô lệch và test đỏ ngay trong CI. Giữ thêm một đợt kiểm kê thủ công một-lần (diff danh sách `.names` byte-identical giữa commit trước và sau refactor) như **đối chiếu bổ sung**, không phải như cổng.

**Cổng này có thực sự đỏ được không: Có.** Nó đỏ được ở ba chỗ khác nhau, mỗi chỗ một cơ chế hỏng khác nhau: (1) nếu một trong tám field context bị rơi khi nâng closure lên thành field, `.names` sẽ lệch và ô tương ứng trong bảng snapshot đỏ; (2) nếu ai đó đơn giản hoá `Map` về `Record` trần, dòng prototype-safety đỏ — `toString` trả về chuỗi truthy thay vì boolean nên `toBe(true)` hỏng, còn `__proto__` ném lỗi khi gọi; (3) nếu bảng bị khoá theo `ToolName` thay vì union, `bun run check:ts` đỏ ngay tại biên dịch vì `goal`/`think` là `HiddenToolName`. Ngoài ra cổng còn đỏ sớm hơn nữa nếu không build native addon — `bun test` báo `0 pass / 1 fail` với `Failed to load pi_natives native addon for darwin-arm64`.

### Phụ thuộc

- `WI-2` (collision rules đã chốt — thứ tự đăng ký trở nên nhạy với thứ tự một khi bảng admission trở thành khai báo).
- `WI-5` (bảng tập tool mà registry chế độ sẽ rút ra, để nó bắt đầu từ một khai báo duy nhất).

Chặn:
- Lần tách built-in → extension đầu tiên dưới WI-6 / WI-8a (mục đích plan nêu: biến một thay đổi bốn file thành cơ học).
- `WI-8a` (settings ownership) — lần tách đầu tiên đáp xuống bảng này.

### Cách sai dễ nhất

Closure `isToolAllowed` bắt **tám** biến tự do trực tiếp (`session`, `restrictToolNames`, `requestedTools`, `includeYield`, `enableLsp`, `goalEnabled`, `externalThinkingActive`, `allowEval`) cộng **hai mươi ba** tên `cfg*`/helper khác nhau được đọc trong thân (`cfgAskEnabled` … `canSpawnAtDepth`, tổng 26 lần đọc). Nâng từng nhánh lên thành một `(ctx) => boolean` độc lập buộc tám biến đó trở thành field context tường minh — và đúng tám field đó là `ToolAdmissionContext`; **một field bị rơi biên dịch vẫn sạch** và âm thầm mở rộng hoặc thu hẹp admission. Cái cắn **nặng nhất** là `requestedTools`, vì nó **không phải** một bản chụp — nó là một mảng sống mà `isToolAllowed` đọc tại thời điểm gọi **sau khi** `requestedTools.push("yield")` đã mutate nó tại `tools/index.ts:794-796`.

Cái sai thứ hai, và cái này plan nêu sai hướng: rủi ro **không** phải "đảo thứ tự ưu tiên âm thầm". Cả 25 nhánh đều là `if (name === "literal")` và 29 tên phân biệt trong đó **đôi một rời nhau**, nên nhiều nhất chỉ một nhánh có thể khớp một `name` cho trước. Thứ tự nhánh vì thế **chứng minh được** là không thể làm đổi kết quả nào; cơ chế hỏng đã nêu **không thể xảy ra**. Việc cơ học là bất nhạy với thứ tự; việc ngữ nghĩa là bất nhạy với capture.

Cái sai thứ ba: dùng `Record` trần thay vì `Map`. Với một object literal và phép tra `TABLE[name]`, `TABLE["toString"]` phân giải thành `Object.prototype.toString` — một **HÀM**, nên gọi nó trả về chuỗi truthy `"[object Undefined]"` thay vì một boolean; `TABLE["constructor"]` trả về `Object`, truthy; `TABLE["__proto__"]` trả về một thứ không phải hàm và **ném lỗi** khi gọi. Đây là đường đi **thật**, không lý thuyết: `tools/index.ts:799` cổng trên `name in BUILTIN_TOOLS`, mà `in` trên một object literal cũng bị ô nhiễm prototype đúng y như vậy.

### Cần người quyết

- Bốn tên luôn được nhận (`read`, `write`, `edit`, `yield`) có nên có các dòng `() => true` tường minh, hay vắng mặt và dựa vào mặc định `?? true`? Đặc tả chọn dòng tường minh để bảng là một mô tả **đầy đủ** về admission, nhưng một người review có thể hợp lý cho rằng vắng mặt thì thành thật hơn, vì trước đó chúng không có luật nào. Đây là lựa chọn về hình thức, **không** khác nhau về hành vi — hãy chọn một và ghi lại.
- Dòng prototype-safety (một tool extension mang chính cái tên `toString` / `__proto__`) có thuộc PR này không, hay là một hạng mục hardening riêng? Đây là một rủi ro mới **thực sự** do refactor sinh ra, nên lẽ ra phải nằm trong phạm vi — nhưng nó nới bề rộng PR từ "refactor" thành "refactor + hardening".
- `SESSION_MANAGED_BUILTIN_TOOL_NAMES` có thuộc WI-6 không, hay thuộc bảng tập tool của WI-5? Plan không nhắc tới nó; nó được phát hiện khi đi tìm các khai báo song song không có kiểu, và nó cùng một lớp vấn đề.
- Hai thay đổi **tuỳ chọn** (bước 11 và vế sau của bước 12) có nằm trong phạm vi WI-6 không, hay tách ra? Bước 11 là **vá lỗi có sẵn**, không phải hồi quy do refactor này gây ra — gộp vào sẽ làm PR khó review hơn; vế `SESSION_MANAGED_BUILTIN_TOOL_NAMES` lại được plan hoàn toàn bỏ sót, nên ai đó có thể cho rằng nó thuộc WI-5.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| `packages/coding-agent/src/tools/index.ts:725-789` là chuỗi 25 nhánh `isToolAllowed`. | STALE | Chuỗi nằm ở dòng **731-793**. Lệch +6 ở đầu, +4 ở cuối. Bằng chứng: `grep -n 'const isToolAllowed' packages/coding-agent/src/tools/index.ts` → `731: const isToolAllowed = (name: string) => {`; đọc 731-793 thấy dấu `};` đóng ở 793. |
| Các neo con: `goal` ở `:731-735`, `wait` ở `:762-769`, `checkpoint`/`rewind` ở `:755-761`, `manage_skill` ở `:774-778`, `learn` ở `:779-785`, `task` ở `:786-788`, `context_notes`/`new_context` ở `:753-754`. | STALE (cả bảy) | Dòng thật: goal **737-741**, context_notes/new_context **759-760**, checkpoint/rewind **761-765**, wait **766-772**, manage_skill **777-781**, learn **782-788**, task **789-791**. Tất cả đều thấp hơn plan nói 3-6 dòng. Sao chép máy móc các neo này sẽ rơi nhầm nhánh. Bằng chứng: đếm bằng `awk` số dòng khớp `^\s*if (name ===` trong 731-793 ra **đúng 25**, xác nhận **số nhánh** plan nói là đúng dù số dòng thì không. |
| `BUILTIN_TOOLS` ở `:548-579`, `SETTINGS_GATED_BUILTIN_TOOL_NAMES` ở `:594-597`, ràng buộc `isMountableUnderXdev` ở `:899`. | STALE | Thật: `BUILTIN_TOOLS` **554-585**, `SETTINGS_GATED_BUILTIN_TOOL_NAMES` **600-602**, ràng buộc xdev ở **902**. |
| Rủi ro là "đảo thứ tự ưu tiên âm thầm": chuỗi 25 nhánh là một thang early-return, nên sắp lại nhánh trong lúc di chuyển có thể đổi luật nào thắng mà không đổi thân luật nào. | OVERSTATED — và chỉ người triển khai vào đó sẽ phí hết một ngày lẽ ra phải dành cho rủi ro thật | Cả 25 nhánh đều là `if (name === "literal")` và 29 tên phân biệt trong đó đôi một rời nhau, nên nhiều nhất một nhánh có thể khớp một `name` cho trước. Thứ tự nhánh vì thế **chứng minh được** không thể đổi bất kỳ kết quả nào. Rủi ro thật là cái plan **không** nêu tên: nâng mỗi nhánh thành một `(ctx) => boolean` độc lập đòi hỏi phải nâng **tám** biến tự do của closure thành field context tường minh, và một field bị rơi biên dịch vẫn sạch trong khi âm thầm đổi admission. Bằng chứng: trích 29 tên phân biệt từ `tools/index.ts:731-793` và xác nhận không tên nào xuất hiện ở hai nhánh: `ask ast_edit ast_grep bash checkpoint context_notes debug eval find github glob goal grep ida learn lsp manage_skill memory_edit new_context recall reflect retain rewind security_scan task think todo wait web_search`. |
| Bảng nên là `Record<ToolName, (ctx) => boolean>`. | WOULD NOT TYPECHECK | `ToolName = BuiltinToolName` (`tools/index.ts:593`), tức 30 tên built-in. Nhưng `isToolAllowed` mang luật thật, không phải mặc định, cho `goal` và `think`, và cả hai là `HiddenToolName`, không phải `BuiltinToolName`. Key phải là `BuiltinToolName \| HiddenToolName` (33 tên). Viết theo đúng cách plan nói hoặc làm typecheck hỏng, hoặc âm thầm làm rơi luật `goal` — mà luật `goal` chính là luật mang điều kiện ba chiều và ngoại lệ trạng thái `dropped`. Bằng chứng: `grep -n 'export type ToolName' tools/index.ts` → `593: export type ToolName = BuiltinToolName;`; `builtin-names.ts:36` cho `HIDDEN_TOOL_NAMES = ["yield", "goal", "think"]`; trừ 30 tên `BUILTIN_TOOL_NAMES` ra thì còn **đúng hai** tên được phủ nhưng không phải built-in. |
| Không được plan nào nhắc: một bảng admission hình `Record` tạo ra nguy cơ tra cứu theo chuỗi prototype mà code hiện tại không có. | NEW FINDING — đây là rủi ro đúng đắn nhất của cả mục | Với object literal trần và phép tra `TABLE[name]`, `TABLE["toString"]` phân giải thành `Object.prototype.toString` — một HÀM, gọi nó trả về chuỗi truthy `"[object Undefined]"` thay vì boolean; `TABLE["constructor"]` trả về `Object`, truthy; `TABLE["__proto__"]` trả về thứ không phải hàm và **ném lỗi** khi gọi. Chuỗi `if` hiện tại miễn nhiễm vì tên không khớp rơi xuống `return true`. Đường đi này là thật: `tools/index.ts:799` cổng trên `name in BUILTIN_TOOLS`, và `in` trên object literal cũng bị ô nhiễm prototype y hệt — một tool extension tên `toString` đã vượt qua cổng đó ngày hôm nay và tới `isToolAllowed`. Giảm thiểu: dựng `Map` từ `Object.entries()` của một literal `satisfies Record<…>`, giữ exhaustive ở thời điểm biên dịch trong khi tra cứu thì an toàn prototype. Bằng chứng: đã chạy một probe trên hình dạng cổng thật: `["read","toString","constructor","__proto__"].filter(n => n in BUILTIN_TOOLS)` → cả bốn đều qua. Và trên bảng đề xuất: `toString`/`constructor` → callable, truthy không phải boolean; `__proto__`/`my_ext_tool` → không callable, ném lỗi. |
| Các khai báo song song cần gộp là `BUILTIN_TOOL_NAMES` (30), `BUILTIN_TOOLS`, và `ESSENTIAL_BUILTIN_TOOL_NAMES` (13). | PARTLY REDUNDANT — một trong ba đã an toàn rồi | Cặp `BUILTIN_TOOL_NAMES` ↔ `BUILTIN_TOOLS` **đã** được ép buộc ở thời điểm biên dịch: `BUILTIN_TOOLS` khai báo là `Record<BuiltinToolName, ToolFactory>` (`tools/index.ts:554`), và TypeScript từ chối cả key thiếu lẫn key thừa. Không có gì để gộp ở đó và không có test nào cần thêm. Các khai báo thực sự thiếu liên kết kiểu là `ESSENTIAL_BUILTIN_TOOL_NAMES` (`Record<string, true>` — key không kiểu, chỉ có canh runtime) và `SESSION_MANAGED_BUILTIN_TOOL_NAMES` (`sdk.ts:1161`, `string[]` trần, **không có** canh nào cả). Plan cũng không bao giờ nhắc tới cái sau. Bằng chứng: biên dịch một probe với `bunx tsc --noEmit --strict`: `Record<"a"\|"b"\|"c", F>` với `{a,b}` → TS2741 'Property c is missing'; với một `d` thừa → TS2353 'Object literal may only specify known properties'. Baseline `bun run check:ts` xanh tại HEAD. *(Ghi chú: probe này là cách **kiểm chứng** đã dùng khi lập đặc tả, không phải một lệnh dành cho người triển khai chạy lại trong PR — dự án cấm dùng `tsc`.)* |
| `ESSENTIAL_BUILTIN_TOOL_NAMES` ở `essential-tools.ts:23-37` (13 tên) và `builtin-names.ts:2-31` (30) / `:36` (3). | CORRECT | Không thay đổi. Đây là **những neo duy nhất** trong toàn bộ mục đã đúng sẵn — đáng nói rõ tường minh để người triển khai không phải kiểm chứng lại. Bằng chứng: đọc trọn cả hai file; đếm 13 và 30 mục tương ứng. |
| Ba built-in cộng `yield` được nhận ẩn; plan không nói. | HÀNH VI CHƯA ĐƯỢC TÀI LIỆU HOÁ — KHÔNG ĐƯỢC ĐÁNH MẤT | `read`, `edit`, `write` và hidden `yield` **không có** nhánh nào trong thang và chạm tới `return true` ở cuối. Một bảng `Record` chỉ liệt kê các tool có luật sẽ **không** đổi gì hôm nay, nhưng nó để lại admission dưới dạng chưa đặc tả cho bốn trong ba mươi ba tên. Đặc tả chọn các mục `() => true` tường minh để bảng là một mô tả **đầy đủ** thay vì một phần. Bằng chứng: trừ 29 tên được phủ khỏi 30 `BUILTIN_TOOL_NAMES` còn đúng read, edit, write; trừ khỏi `HIDDEN_TOOL_NAMES` còn đúng yield. |
| (Khung nhiệm vụ) repo git HEAD là `5873776`. | STALE | HEAD là `808b365` trên nhánh `milestone-1`. Bằng chứng: `git rev-parse HEAD` → `808b365409fa36719c38319a041c0e612b4e702b`; `git log --oneline -3`. |
| Lệnh kiểm chứng `bun run check:ts && (cd packages/coding-agent && bun test test/tools/tool-admission-table.test.ts)`. | HALF-BLOCKED | `check:ts` chạy xanh tại HEAD (cả 15 package Done). Nửa lệnh test **không** chạy được: `bun test` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64`. Phải build addon bằng `bun --cwd=packages/natives run build` trước khi nửa test của cổng này có ý nghĩa. Đã xác nhận bằng cách thực sự chạy cả hai lệnh tại HEAD 808b365. |
