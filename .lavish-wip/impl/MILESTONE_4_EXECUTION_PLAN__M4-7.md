# Phiếu triển khai — M4-7. Hợp đồng render có kiểu (sóng C)

Kế hoạch: `MILESTONE_4_EXECUTION_PLAN.md` §M4-7 (dòng 1183–1360).
Ngày kiểm: 2026-09-29. Cây tham chiếu: `/Users/tranquangdang21/Projects/ultraworkers` (nhánh `milestone-1`).

**Kết luận một dòng:** toàn bộ neo trong §M4-7 đã được mở và đọc; **21/55 neo đúng tuyệt đối, 33 neo lệch số dòng (2–46 dòng), 1 neo sai về nội dung (`wrapper.ts` `renderCall` không forward `options` nguyên khối như plan nói), 1 claim sai hoàn toàn (`extensions/types.ts` KHÔNG hề "không type-coupled" với `pi-tui`)**. Vì vậy **đừng dùng số dòng của plan làm neo** — bảng điểm sửa bên dưới đã thay bằng số dòng thật, đã kiểm.

---

## 0. Tree nào thật sự liên quan

| Cây | Kết luận |
| --- | --- |
| `ultraworkers` (omp) | **Toàn bộ mục nằm ở đây.** `packages/tui/`, `packages/coding-agent/`. |
| `pi-ref` | **Không có neo nào của M4-7 chạm tới.** Đã kiểm: `grep -rn "__partialJson" packages` → **0 hit**; `grep -rn "rawArgs" packages` → chỉ 2 hit trong `read.ts:152-153` là tên tham số cũ `renderCall(rawArgs, theme, context)` (arity 3 kiểu pi-era), không phải channel. `packages/tui/src/tools/` **không tồn tại** trong pi-ref. Interface `ToolRenderResultOptions` của pi-ref nằm ở `packages/coding-agent/src/core/extensions/types.ts:423` — đường khác hoàn toàn. |
| `deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref`, `senpi-ref` | Không chứa symbol `RenderResultOptions` / `__partialJson` của work item này. Không cần mở. |

Hệ quả thực tế: đây là một work item **thuần omp**. Mọi claim "kiểm chứng" trong plan đều là claim về cây `ultraworkers`, và những cái sai đều sai vì đã lệch so với cây đó.

---

## 1. Cái gì thay đổi, quan sát được

Một extension viết ngoài repo, đăng ký qua `registerTool({ renderResult })`, lần đầu nhận được `options.argsComplete`, `options.executionStarted` và `options.rawArgs` trên options object của nó; và một device `xd://` lần đầu thấy tiền tố JSON **bên ngoài** của write-call (chứa `"path":"xd://probe"`) thay vì chỉ thấy payload device **bên trong** — đồng thời card `xd://` không còn đóng băng giữa lúc stream.

---

## 2. Bảng điểm sửa

Mọi ô TRƯỚC dưới đây là **văn bản thật trích từ file đã mở**, không viết lại từ trí nhớ.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/tui/src/tools/renderer.ts` (`:10-27`) | `RenderResultOptions` | khối `expanded`/`isPartial`/`spinnerFrame?`/`argsComplete?`/`executionStarted?`; đóng `}` ở `:27` | thêm `rawArgs?: RawToolArgs;` ở cuối khối |
| `packages/tui/src/tools/renderer.ts` (trên `:10`) | *(mới)* `RawToolArgs` | — | `export interface RawToolArgs { json: string; complete: boolean }` |
| `packages/coding-agent/src/extensibility/extensions/types.ts` (`:608-615`) | `ToolRenderResultOptions` | `export interface ToolRenderResultOptions {` … `spinnerFrame?: number;` … `}` — chỉ 3 field | thêm `argsComplete?`, `executionStarted?`, `rawArgs?` |
| `packages/coding-agent/src/extensibility/extensions/wrapper.ts` (`:96`) | `RegisteredToolAdapter.renderResult` (ctor `:92-100`) | `{ expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame },` | `options,` (forward nguyên đối tượng) |
| `packages/coding-agent/src/sdk.ts` (`:1229`) | `customToolToDefinition` (`:1200`) → `renderResult` (`:1225-1235`) | `{ expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame },` | `options,` (forward nguyên đối tượng) |
| `packages/tui/src/chat/tool-execution.ts` (`:387-397`) | `ToolExecutionComponent.updateArgs` | `updateArgs(args: unknown, _toolCallId?: string): void {` … `if (args === this.#args) return;` … `this.#displayInputVersion++;` | `updateArgs(args: unknown, _toolCallId?: string, rawArgs?: RawToolArgs): void`; guard so sánh cả `args` (tham chiếu) lẫn `rawArgs.json` (giá trị) |
| `packages/tui/src/chat/tool-execution.ts` (`:163`) | `ToolExecutionHandle.updateArgs` | `updateArgs(args: unknown, toolCallId?: string): void;` | thêm tham số optional thứ ba |
| `packages/tui/src/chat/tool-execution.ts` (`:328-340`) | `#renderState` (type literal + init) | type literal có `spinnerFrame?`, `expanded`, `isPartial`, `argsComplete?`, `executionStarted?`, `renderContext?` | thêm `rawArgs?: RawToolArgs;` vào type literal |
| `packages/tui/src/chat/tool-execution.ts` (`:926-932`) | `#rebuildDisplay` | 5 phép gán `this.#renderState.expanded/isPartial/argsComplete/executionStarted/spinnerFrame` (`:928-932`) | thêm `this.#renderState.rawArgs = this.#rawArgs;` |
| `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts` (`:7`) | `ToolArgsRevealComponent` | `updateArgs(args: unknown, toolCallId?: string): void;` | thêm tham số optional thứ ba |
| `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts` (`:396-432`) | `displayArgsForPrefix` → `DisplayArgsStep` | trả `{ args, changed }` | thêm thành viên raw vào step trả về, lấy từ `displayPrefix` ở `:427` |
| `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts` (`:615`, `:566`) | `#tick` / `flushAll` | `entry.component.updateArgs(display.args, id);` / `entry.component.updateArgs(displayArgsForPrefix(entry, entry.target, true).args, id);` | truyền thêm raw channel làm tham số thứ ba |
| `packages/coding-agent/src/modes/controllers/event-controller.ts` (`:1434`, `:1750`) | hai call site `component.updateArgs(...)` | `component.updateArgs(renderArgs, content.id);` / `component.updateArgs(event.args, event.toolCallId);` | truyền raw channel — **file KHÔNG có trong danh sách file của plan, xem §7** |
| `packages/coding-agent/src/modes/utils/ui-helpers.ts` (`:604-611`) | ternary `renderArgs` + `new ToolExecutionComponent(` | `decodeStreamedToolArgs(partialJson, {...})` → `: content.arguments;` → `new ToolExecutionComponent(renderToolName, renderArgs, {...}, ...)` | truyền `partialJson` vào constructor dưới dạng `rawArgs` |
| `packages/tui/src/tools/xdev.ts` (`:57`, `:114`) | `decodeInnerArgs` / `displayDeviceArgs` | `args.__partialJson = raw;` / `const { __partialJson: _partial, ...rest } = args;` | đổi tên khóa inner thành tên private ở cả hai chỗ (**sau khi** câu hỏi mở 1 được giải quyết) |
| `packages/tui/src/tools/xdev.ts` (`:159`, `:168`, `:191`) | `renderXdevCall` / `renderXdevResult` | `renderer.renderCall(args, options, theme);` | forward tiền tố raw **bên ngoài** qua `options.rawArgs` |
| `packages/tui/src/tools/json-tree.ts` (`:23`) | `HIDDEN_ARG_KEYS` | `const HIDDEN_ARG_KEYS = { [INTENT_FIELD]: 1, __partialJson: 1 };` | thêm tên khóa inner mới (giữ `__partialJson`) |

---

## 3. Các bước — mỗi bước gắn neo **đã kiểm**

> Mọi số dòng trong phần này là số dòng **thật đã mở và đọc**, không phải số trong plan.

### Bước 1 — Đọc trước khi sửa (bắt buộc)

```bash
sed -n '387,397p' packages/tui/src/chat/tool-execution.ts   # updateArgs + comment sai-lệch
sed -n '424,431p' packages/coding-agent/src/modes/controllers/tool-args-reveal.ts
sed -n '543p'    packages/coding-agent/src/modes/controllers/tool-args-reveal.ts
sed -n '396,403p' packages/tui/src/tools/renderer.ts
```

Đọc và ghi nhận: comment ở `tool-execution.ts:388-391` là

```
// Reference-equality short-circuit before any further work. Callers
// always allocate a new arg object on each streamed delta (see
// event-controller.ts and ui-helpers.ts), so a same-reference assignment
// signals "nothing meaningful changed" and the renderer can skip.
```

Câu đó **đúng hôm nay** (`tool-args-reveal.ts:424` `const rawPrefixChanged = entry.exposeRawPartialJson && prefix !== entry.displayPrefix;` → literal mới ở `:428` → `changed: true` → `#tick` gọi `updateArgs` ở `:615`) và **sai ngay khi bước 2 land**. Phải viết lại, không được giữ.

### Bước 2 — Khai báo + export `RawToolArgs`

`packages/tui/src/tools/renderer.ts`, chèn ngay trên dòng `:10`:

```ts
export interface RawToolArgs {
	/** Raw JSON prefix of THIS tool call's argument stream, growing until it closes. */
	json: string;
	/** True once the argument buffer closed (message_end / setArgsComplete). */
	complete: boolean;
}
```

rồi thêm `rawArgs?: RawToolArgs;` vào cuối `RenderResultOptions` (ngay sau `executionStarted?: boolean;` ở `:26`).

- Kiểu `RenderResultContextOptions` ở `:30` là `RenderResultOptions & { renderContext?: … }` → signature built-in ở `:75` (`options: RenderResultContextOptions`) **tự nhận field mới, không sửa thêm**.
- Không dùng `private`/`public`; không dùng `ReturnType<>`.
- Import vào `tool-execution.ts` bằng `import type { RawToolArgs } from "../tools/renderer";` (file đó đã import nhiều thứ từ `../tools/*`, xem `:19-27`).

### Bước 3 — Nới rộng `ToolRenderResultOptions`

`packages/coding-agent/src/extensibility/extensions/types.ts`, interface ở **`:608-615`** (doc comment ở **`:607`**), thêm ba thành viên optional kèm jsdoc.

⚠️ **Cần người quyết — xem §8 mục (a).** Plan bảo "không `import type` từ `@oh-my-pi/pi-tui` vì hai package không type-coupled". Lý do đó **sai** (xem neo #52 ở §9), nhưng kết luận thì vẫn dùng được. Tóm lại: khai báo cấu trúc, đừng import — và **đừng viết lý do "không type-coupled" vào comment hay PR description**, vì reviewer sẽ mở file và thấy 17 dòng import `pi-tui` trong chính file này.

### Bước 4 — Sửa short-circuit **TRƯỚC** khi nối channel mới (thứ tự chống đỡ)

`packages/tui/src/chat/tool-execution.ts:387-397`:

```ts
updateArgs(args: unknown, _toolCallId?: string, rawArgs?: RawToolArgs): void {
	// Hai tín hiệu tươi độc lập. Args đã decode so sánh theo tham chiếu
	// (caller cấp phát object mới ở mỗi delta streamed), nhưng raw channel
	// so sánh THEO GIÁ TRỊ vì nó là side channel: một frame có thể mang
	// tiền tố raw dài hơn trong khi object args đã decode giữ nguyên
	// tham chiếu, và renderer tiêu thụ raw vẫn phải repaint cho frame đó.
	const argsChanged = args !== this.#args;
	const rawChanged = !!rawArgs?.json && rawArgs.json !== this.#rawArgsJson;
	if (!argsChanged && !rawChanged) return;
	this.#args = args;
	this.#rawArgsJson = rawArgs?.json ?? "";
	this.#displayInputVersion++;   // :394 — phải nằm SAU cả hai tín hiệu
	this.#updateSpinnerAnimation();
	this.#updateDisplay();
}
```

Phản chiếu tham số optional thứ ba trên `tool-execution.ts:163` và `tool-args-reveal.ts:7`. Cả hai là optional nên caller cũ vẫn compile.

### Bước 5 — Publish channel vào `#renderState`

- Nới type literal `#renderState` ở `tool-execution.ts:328-340` bằng `rawArgs?: RawToolArgs;`
- Gán trong `#rebuildDisplay` (hàm bắt đầu ở **`:926`**), ngay sau khối gán sẵn có ở **`:928-932`**.

**Không call site render nào cần sửa** — `this.#renderState` được truyền nguyên khối ở `:979` (custom `renderCall`), `:1016` (custom `renderResult`), `:1083` (built-in multi-file `renderResult`), `:1137` (built-in `renderCall`), `:1164` (built-in `renderResult`), `:1362` (default card). *(Plan ghi `:971, :1002, :1129, :1150` — cả bốn đều lệch.)*

### Bước 6 — Forward toàn bộ options ở **cả hai** adapter site

Đây là bước làm field trở thành thật, và là bước mà **không type-checker nào bắt được**.

```ts
// packages/coding-agent/src/extensibility/extensions/wrapper.ts:96
// TRƯỚC:
{ expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame },
// SAU:
options,
```

```ts
// packages/coding-agent/src/sdk.ts:1229 — y hệt
```

- **Đừng đụng `renderCall`.** Ở `wrapper.ts:84-91` nó forward qua `renderOptionsWithTheme(options, theme as Theme)` — một `Proxy` (định nghĩa ở `:43-57`) giữ nguyên own-key của options và chỉ bổ sung fallback theme. Không mất field nào. *(Plan mô tả nó là "forward `options` nguyên khối" — sai; xem neo #10.)* Ở `sdk.ts:1224` nó là `renderCall: tool.renderCall` — tham chiếu trần, không có wrapper.
- **Đừng xoá cast** ở `tool-execution.ts:1004-1009` (`tool.renderResult as (…, options: { expanded: boolean; isPartial: boolean; spinnerFrame?: number }, …)`). Cast chỉ có tác dụng lúc compile; runtime vẫn truyền `this.#renderState` — nên `bun run check:ts` **vẫn xanh kể cả khi field bị ném**. Đó chính là máy phát hiện im lặng.

### Bước 7 — Thread tiền tố raw từ đường reveal sống

Trong `displayArgsForPrefix` (`tool-args-reveal.ts:396-432`), trả tiền tố raw như **thành viên thứ ba** của step trả về, lấy từ **đúng** `displayPrefix` tính ở `:427` — đừng tính lại, nếu không hai bên lệch nhau ở frame đã throttle.

Đẩy vào **cả ba** chỗ gọi `updateArgs` trên component thật:

| call site | dòng | ghi chú |
| --- | --- | --- |
| `#tick` | `:615` | chỉ bên trong guard `if (display.changed)` sẵn có (`:614`) |
| `flushAll` | `:566` | |
| **`event-controller.ts` `message_update`** | **`:1434`** | **plan không liệt kê — xem §7** |

**Để `decodeStreamedToolArgs` (`:455`) yên** — shape trả về của nó có test assert trực tiếp.

### Bước 8 — Thread tiền tố raw từ đường rebuild

`ui-helpers.ts:604-611`. `decodeStreamedToolArgs(partialJson, {...})` vốn đã cầm raw buffer ở tham số đầu tiên — truyền đúng `partialJson` đó vào constructor `new ToolExecutionComponent(` ở `:611`.

Nhánh fallback ở `:610` (`: content.arguments` khi `partialJson` falsy) **không có raw buffer** → truyền `undefined`, đừng bịa chuỗi rỗng.

Xác nhận: `grep -n updateArgs packages/coding-agent/src/modes/utils/ui-helpers.ts` → đúng **3 hit**, tất cả là `readGroup.updateArgs(...)` ở `:562`, `:576`, `:697` — **không có** `component.updateArgs(...)` nào trong file này. Plan ghi đúng.

### Bước 9 — Câu hỏi mở 1 (đổi tên khóa magic), **CUỐI CÙNG**

Ba writer của `__partialJson` trong `src` (grep `packages/*/src`):

| dòng | file | nghĩa |
| --- | --- | --- |
| `tool-args-reveal.ts:380` | `return { __partialJson: "" };` | outer, init rỗng |
| `tool-args-reveal.ts:399` | `const args = { input: prefix, __partialJson: prefix };` | **outer** |
| `tool-args-reveal.ts:428` | `{ ...entry.parsedArgs, __partialJson: displayPrefix }` | **outer** |
| `tool-args-reveal.ts:457` | `{ input: partialJson, __partialJson: partialJson }` | **outer** |
| `tool-args-reveal.ts:463` | `args.__partialJson = partialJson;` | **outer** |
| **`xdev.ts:57`** | `args.__partialJson = raw;` | **INNER** ← kẻ phá luật duy nhất |

Nhánh **được khuyến nghị**: chỉ đổi tên writer `xdev.ts:57` + strip `xdev.ts:114` + đăng ký tên mới vào `json-tree.ts:23`. `bash.ts:196/197/206/237`, `edit.ts:251`, `eval.ts:98` đọc **outer** → **không đụng tới**, và sáu file test ghim literal **không cần sửa**.

Vì sao `HIDDEN_ARG_KEYS` là backstop thật (không phải phòng thủ hình thức): `decodeInnerArgs` output đi tới **ba** nơi, chỉ một nơi được strip:

- `xdev.ts:128` → `displayDeviceArgs(args)` — **đã strip**
- `xdev.ts:159` → `renderer.renderCall(args, options, theme)` — **KHÔNG strip**
- `xdev.ts:162` → `renderDefaultToolExecution({ label, args, options }, theme)` — **KHÔNG strip** → đi thẳng vào `formatArgsInline`

Cùng một lượt đó, cho `renderXdevCall` forward tiền tố raw **bên ngoài** qua `options.rawArgs`: hôm nay nó chỉ nhận `args.content` (từ `write.ts:467`, `renderXdevCall(xdev.name, args.content, options, uiTheme, options.renderContext?.resolveXdevMounted)`), nên buffer ngoài **chưa bao giờ** tới được device renderer.

### Bước 10 — Chỉ sửa test thực sự đổi nghĩa

Sáu file tham chiếu `__partialJson` (đã đối chiếu tồn tại, đọc **output đã render** chứ không source-grep):

`coding-agent/test/tool-args-reveal.test.ts:34,36,260` · `coding-agent/test/tools/edit-renderer.test.ts:53,405` *(plan ghi `:417` — lệch)* · `coding-agent/test/modes/controllers/event-controller-args-reveal.test.ts:140,141,183` · `tui/test/bash-render.test.ts:57` · `tui/test/json-tree-render.test.ts:32` · `tui/test/tool-execution-custom-repaint.test.ts:23,88,98,144,161`

Dưới nhánh khuyến nghị (chỉ đổi tên khóa inner) **không file nào cần sửa**. Nếu bạn thấy mình đang viết lại cả sáu → bạn đã đi sang nhánh kia → đọc lại câu hỏi mở 1.

### Bước 11 — Viết test quyết định (hàng nhất)

`packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` (tạo mới). Source đã verify chạy và **ĐỎ** — xem §5 G1.

---

## 4. Hợp đồng test

Ba hợp đồng quan sát được, một trong số là hàng quyết định.

### (1) Đơn điệu của stream bên ngoài — `packages/tui/test/tool-execution-xdev-render.test.ts`

File này tồn tại, 89 dòng, có 2 test sẵn (:72 và :80). Thêm test mới.

- **Case:** stream một `write` có path `xd://probe` qua các tiền tố argument tăng dần, xuyên qua một `ToolExecutionComponent` thật. `probeTool.renderCall` (hiện là `() => new Text("PROBE-CALL", 0, 0)` ở `:26` — cần đổi thành nhận `(args, options)`) ghi lại `options.rawArgs.json` mỗi lần được mount.
- **Assert:** chuỗi ghi được không giảm theo chiều dài; mỗi chuỗi là tiền tố của chuỗi kế tiếp; chuỗi cuối **chứa** `"path":"xd://probe"` và **không** phải JSON device bên trong.
- **Người dùng thấy gì nếu hồi quy:** một card `xd://` đóng băng phần preview raw ở checkpoint parse đầu tiên, hoặc hiện JSON device **bên trong** trong khi stream **bên ngoài** vẫn đang lớn dần — card bịu diễn sai mức độ hoàn tất của lệnh gọi.

### (2) Cân bằng giữa rebuild và live — cùng file

- **Case:** chạy cùng một tool call hai lần — một lần qua đường reveal sống (`event-controller.ts` → `#tick`), một lần qua đường rebuild (`ui-helpers.ts:605`) — assert render cuối **giống hệt từng byte**.
- **Người dùng thấy gì nếu hồi quy:** card **đổi diện mạo** khi người dùng đổi theme, bật/tắt một setting, hoặc đổi focus giữa lúc stream.
- ⚠️ Test này bảo vệ **đường thứ ba mà plan định vị sai file**. File plan nêu (`chat-transcript-builder.ts`) **hoàn toàn không có plumbing raw-arg** — đã kiểm: `grep -c 'partialJson\|__partialJson\|decodeStreamedToolArgs' packages/tui/src/chat/chat-transcript-builder.ts` → **0** trên 597 dòng. Nếu theo plan, test này được viết trên một seam **không thể đỏ**.

### (3) Hợp đồng đến-tay-adapter — `packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` — **HÀNG QUYẾT ĐỊNH**

- **Case 1 (wrapper):** dựng `RegisteredToolAdapter` mà `definition` cấp `renderResult` bắt tham số thứ hai. Gọi `adapter.renderResult(result, options, theme, args)` với `options` mang `rawArgs`, `argsComplete: true`, `executionStarted: true`. Assert cả ba tới nơi. Shape dựng tool: sao chép `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts:59-73` (`definition` / `extensionPath` / `sourceInfo` từ `extensionToolSourceInfo` — import từ **`.../extensions/loader`**, không phải `source-info` — và stub `runner`).
- **Case 2 (sdk):** gọi `customToolToDefinition({ ..., renderResult })` đã export, assert ba field sống sót giống hệt. Theo `packages/coding-agent/test/tools/approval.test.ts:216`.
- **Case 3 (phủ định, bắt buộc):** một field chưa từng nằm trên options object không được materialize → để cách sửa không trôi thành blanket passthrough và không làm lộ sổ ghi render nội bộ.
- **Cấm:** không test nào được đọc file source, không `mock.module()` (AGENTS.md).
- **Người dùng thấy gì nếu hồi quy:** một extension ngoài repo gate preview streaming trên `options.argsComplete` sẽ render như thể chưa từng có gì hoàn tất, **vĩnh viễn** — vì field được khai báo trong type rồi bị vứt ở adapter.

**Đừng test:** rằng interface có N thành viên; rằng `rawArgs` tồn tại; rằng code "đã chạy".

---

## 5. Cổng

Mỗi cổng dưới đây đã được **chạy thật trên cây trước thay đổi**. Không cổng nào ở đây là cổng xanh.

### G1 — ADAPTER REACH (cổng quyết định) — ✅ **ĐỎ ĐƯỢC, đã chứng minh bằng chạy**

```bash
bun test packages/coding-agent/test/extensions/raw-args-render-channel.test.ts
```

**Đã chạy, kết quả thật:**

```
(fail) rawArgs render channel survives both adapters > wrapper: RegisteredToolAdapter forwards every options field
       Expected: true   Received: undefined
(fail) rawArgs render channel survives both adapters > sdk: customToolToDefinition forwards every options field
       Expected: true   Received: undefined
 1 pass  2 fail
```

Probe bổ sung in ra đúng cái adapter giữ lại:

```
WRAPPER captured keys: [ "expanded", "isPartial", "spinnerFrame" ]
SDK captured keys:     [ "expanded", "isPartial", "spinnerFrame" ]
```

**Cách chứng minh cổng này có răng** (bắt buộc làm trước khi mở PR): chỉ thêm field `rawArgs` vào **hai interface**, **không sửa gì khác**, chạy lại, quan sát nó vẫn **XANH**. Đó là bằng chứng cổng có hàm vi ngoài một sửa đổi type. Lý do kỹ thuật: assertion của test soi **runtime keys**, mà type bị erase — nên một sửa đổi thuần type không thể đổi kết quả. Test case 3 (phủ định) hôm nay **xanh sẵn** vì literal ba-field của adapter vốn đã thỏa; nó chỉ bảo vệ sau khi sửa, chống việc trôi thành spread `any`.

Source test đã verify (dán nguyên văn vào file đích):

```ts
import { describe, expect, it } from "bun:test";
import type { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { RegisteredToolAdapter } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import { extensionToolSourceInfo } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { customToolToDefinition } from "@oh-my-pi/pi-coding-agent/sdk";

const OPTIONS = {
	expanded: false, isPartial: true, spinnerFrame: 3,
	argsComplete: true, executionStarted: true,
	rawArgs: { json: '{"path":"xd://probe","con', complete: false },
};
const stub = { render: () => [] };

describe("rawArgs render channel survives both adapters", () => {
	it("wrapper: RegisteredToolAdapter forwards every options field", () => {
		let captured: Record<string, unknown> | undefined;
		const adapter = new RegisteredToolAdapter(
			{
				definition: {
					name: "probe", label: "Probe", description: "probe",
					parameters: { type: "object" },
					execute: async () => ({ content: [], isError: false }),
					renderResult: (_r: unknown, options: unknown) => { captured = options as Record<string, unknown>; return stub; },
				} as never,
				extensionPath: "<test>",
				sourceInfo: extensionToolSourceInfo({ name: "probe" } as never, "<test>"),
			} as never,
			{} as ExtensionRunner,
		);
		adapter.renderResult!({ content: [] }, OPTIONS as never, {} as never);
		expect(captured!.argsComplete).toBe(true);
		expect(captured!.executionStarted).toBe(true);
		expect(captured!.rawArgs).toEqual(OPTIONS.rawArgs);
	});

	it("sdk: customToolToDefinition forwards every options field", () => {
		let captured: Record<string, unknown> | undefined;
		const def = customToolToDefinition({
			name: "probe2", label: "Probe2", description: "probe",
			parameters: { type: "object" },
			execute: async () => ({ content: [], isError: false }),
			renderResult: (_r: unknown, options: unknown) => { captured = options as Record<string, unknown>; return stub; },
		} as never);
		def.renderResult!({ content: [] }, OPTIONS as never, {} as never);
		expect(captured!.argsComplete).toBe(true);
		expect(captured!.executionStarted).toBe(true);
		expect(captured!.rawArgs).toEqual(OPTIONS.rawArgs);
	});

	it("negative: a field that never existed on options is not materialised", () => {
		let captured: Record<string, unknown> | undefined;
		const def = customToolToDefinition({
			name: "probe3", label: "Probe3", description: "probe",
			parameters: { type: "object" },
			execute: async () => ({ content: [], isError: false }),
			renderResult: (_r: unknown, options: unknown) => { captured = options as Record<string, unknown>; return stub; },
		} as never);
		def.renderResult!({ content: [] }, { ...OPTIONS, notARealField: "boom" } as never, {} as never);
		expect(captured).not.toHaveProperty("notARealField");
	});
});
```

### G2 — ĐƠN ĐIỆU STREAM — ✅ **ĐỎ ĐƯỢC, đã chứng minh bằng chạy**

```bash
bun test packages/tui/test/tool-execution-xdev-render.test.ts
```

Probe chạy thật trên `renderXdevCall` + `ToolExecutionComponent` thật, in ra:

```
XDEV device renderer args keys:       [ "command", "__partialJson" ]
XDEV device renderer args.__partialJson: {"command":"Write-Output 42
XDEV device renderer options keys:    [ "expanded", "isPartial", "executionStarted", "argsComplete" ]
XDEV outer raw buffer was:            {"path":"xd://probe","content":"{\"command\":\"Write-Output 42\"}
LIVE options has rawArgs?:            false
```

Nghĩa là: device renderer hôm nay nhận **payload device bên trong** làm `__partialJson`, và `options` **không có** key `rawArgs` nào. Test assert `options.rawArgs.json` chứa `"path":"xd://probe"` sẽ **đỏ ngay** — không cần suy luận.

### G3 — CÂN BẰNG REBUILD — 🟡 **ĐỎ ĐƯỢC, nhưng CHƯA chạy** (cần code mới để đỏ)

Cùng file `tool-execution-xdev-render.test.ts`.

- **Cơ chế đỏ (chưa verify bằng chạy, nói thẳng):** `ui-helpers.ts:604-611` dựng `ToolExecutionComponent` mà **không** truyền raw channel, trong khi đường live sẽ có. Hai card cùng một tool call sẽ khác nhau → assert "byte-for-byte equal" đỏ.
- **Cách làm nó đỏ ngay, không cần chờ code mới:** tạm thêm vào test một bản dựng card thủ công **không** truyền `rawArgs`, rồi so với bản dựng qua `ui-helpers`. Hoặc đơn giản hơn: sau khi bước 8 xong mà bỏ sót `ui-helpers.ts`, test đỏ — đó là hành vi cần bảo vệ.
- **Không được** viết test này trên `chat-transcript-builder.ts` (xem §4 case 2).

### G4 — PHỦ ĐỊNH KHÓA ẨN — ✅ **ĐỎ ĐƯỢC, đã chứng minh bằng chạy**

```bash
bun test packages/tui/test/json-tree-render.test.ts
```

Seam: `formatArgsInline` (`json-tree.ts:74`), dùng filter `if (key in HIDDEN_ARG_KEYS) continue;` ở `:97`. Test sẵn có ở `json-tree-render.test.ts:31-34`:

```ts
test("hidden meta keys are skipped", () => {
	const out = formatArgsInline({ [INTENT_FIELD]: "noise", __partialJson: "{}", path: "src/foo.ts" }, 80);
	expect(out).toBe('path="src/foo.ts"');
});
```

Probe chạy thật với một tên khóa **chưa** đăng ký:

```
G4 probe output: __xdInnerPrefix="{"command":"x", path="xd://probe"
```

Nó **lộ ra**. Đỏ ngay lúc ai đó đổi tên `xdev.ts:57` mà quên `json-tree.ts:23`. Đây là rủi ro thầm lặng plan cảnh báo — và nó thật, vì `xdev.ts:159` và `xdev.ts:162` truyền inner args **không strip** thẳng tới `formatArgsInline`.

### G5 — TYPES + LINT/FORMAT — ✅ **ĐỎ ĐƯỢC, đã chứng minh bằng chạy**

```bash
bun run check:ts
```

Đã xác minh: `check:ts` = `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`; `check:tools` = `oxlint . && oxfmt --check …`; và **đúng 16 package** có `check:types` (đã đếm: agent, ai, browser-relay, catalog, coding-agent, collab-web, metaharness, mnemopi, natives, omptype, snapcompact, stats, tui, typescript-edit-benchmark, utils, wire).

Chứng minh đỏ: file .ts sai format trong glob → `oxfmt --check` exit **1** (đã chạy, output `Format issues found in above 1 files`). Nên cổng này đỏ được cả khi jsdoc sai, không chỉ khi type sai.

### Thứ tự chạy (giữ nguyên)

```bash
bun run check:ts
# BẮT BUỘC: build native của packages/natives đi qua Bazel → opusic-sys → cmake + Ninja.
# Thiếu Ninja thì build exit 1 với "CMake was unable to find a build program
# corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
# Nguồn: MODULE.bazel:171 "# opusic-sys builds its bundled Opus via `cmake` and selects Ninja from PATH."
# Máy này đã có: /opt/homebrew/bin/ninja, /opt/homebrew/bin/cmake
brew install ninja   # chỉ khi thiếu
bun --cwd=packages/natives run build
bun test packages/coding-agent/test/extensions/raw-args-render-channel.test.ts
bun test packages/tui/test/tool-execution-xdev-render.test.ts \
          packages/tui/test/tool-execution-custom-repaint.test.ts \
          packages/coding-agent/test/tool-args-reveal.test.ts
bun test packages/tui/test/ packages/coding-agent/test/
```

Baseline đã đo: `bun test packages/tui/test/tool-execution-xdev-render.test.ts packages/tui/test/tool-execution-custom-repaint.test.ts` → **9 pass, 0 fail**.

Câu lệnh của plan, `bun test packages/tui/test/ packages/coding-agent/test/ -t 'render' && bun check`, **yếu hơn**: `-t 'render'` không chọn tên test quyết định, và `bun check` rộng hơn lẫn chậm hơn `bun run check:ts`.

---

## 6. Cạm bẫy riêng của work item này

**Cạm bẫy 1 — Thay đổi chỉ nằm trên type: xanh mọi nơi, không chạm gì cả.** Thêm `rawArgs` vào hai interface rồi dừng. `bun run check:ts` xanh (cả hai interface đều structurally satisfiable), test built-in `xd://` xanh (TUI truyền `this.#renderState` nguyên khối nên built-in thấy field mới **miễn phí**), và **không** thay đổi gì với extension nào — vì `wrapper.ts:96` và `sdk.ts:1229` dựng lại object từ ba field có tên rồi vứt mọi thứ còn lại. Field được khai báo mà không với tới được. Không gì trong type checker nhìn thấy.

**Cạm bẫy 2 — Đảo ngược thứ tự bước.** Sửa forward ở adapter **trước** short-circuit ở `updateArgs` → renderer tiêu thụ raw bỏ lỡ repaint ở trạng thái trung gian. Đổi tên khóa magic **trước** khi channel có kiểu tồn tại → mọi reader built-in (`bash.ts:196-237`, `edit.ts:251`, `eval.ts:98`) đọc một khóa không ai ghi nữa. Cả hai hỏng hóc **thầm lặng** — sinh ra một card trông hợp lý, không phải một lỗi.

**Cạm bẫy 3 — Tin số dòng của plan.** 33/55 neo lệch 2–46 dòng, và ba trong số đó lệch vào **nhầm vùng code** (xem §9). Sửa `wrapper.ts:62` theo plan = sửa dòng khai báo class. Đã có người bị vấp.

**Cạm bẫy 4 — Cứu `renderCall` cho "đối xứng".** `renderCall` ở `wrapper.ts` **không** hề bị thu hẹp. Thêm cast hay wrapper ở đó là phá đúng con đường đang chạy tốt. (Và plan mô tả sai nó là "forward nguyên khối" — nó đi qua `renderOptionsWithTheme` Proxy.)

**Cạm bẫy 5 — Để một test đang ghim hành vi thật bị viết lại thành hành vi mới.** Một test ghim "renderer nhận raw prefix" không được lặng lẽ đổi thành "renderer nhận inner args" chỉ vì giờ code làm thế. Sự đảo ngược đó đúng là hỏng hóc plan cảnh báo.

**Cạm bẫy 6 — Dùng lại `rawArgs` cho cả hai nghĩa.** `__partialJson` hôm nay mang **hai** nghĩa: outer (5 writer trong `tool-args-reveal.ts`) và inner (1 writer ở `xdev.ts:57`). Nếu bạn định nghĩa `RawToolArgs` là "buffer của lời gọi này" rồi đổ cả hai vào cùng một field, bạn vừa hồi sinh đúng cái mơ hồ mà mục này sinh ra để diệt. Contract phải là: `rawArgs` = **outer, một nghĩa duy nhất**; inner tiền tố của device không sống ở đây.

**Cạm bẫy 7 — Cắt ngang `event-controller.ts`.** Xem §7.

---

## 7. Phát hiện mới — không có trong plan

Plan liệt kê `ui-helpers.ts:611` là **call site duy nhất** dựng `ToolExecutionComponent` từ raw buffer, và chỉ nêu hai nơi đẩy raw vào `updateArgs` (`:566`, `:615`). Đã kiểm toàn bộ `grep -rn "updateArgs" packages/tui/src packages/coding-agent/src`:

| call site | dòng | component | plan có nhắc? |
| --- | --- | --- | --- |
| `tool-args-reveal.ts` `#tick` | `:615` | `ToolExecutionComponent` | ✅ |
| `tool-args-reveal.ts` `flushAll` | `:566` | `ToolExecutionComponent` | ✅ |
| **`event-controller.ts` `message_update`** | **`:1434`** | `ToolExecutionComponent` | ❌ |
| **`event-controller.ts` `tool_execution_start`** | **`:1750`** | `ToolExecutionComponent` | ❌ |
| `ui-helpers.ts` | `:562`, `:576`, `:697` | `ReadToolGroupComponent` | ✅ (đúng là không liên quan) |
| `chat-transcript-builder.ts` | `:446`, `:454`, `:513` | `ReadToolGroupComponent` | ✅ (đúng là không liên quan) |
| `gallery-fixtures/fs.ts` | `:65`, `:66` | `ToolExecutionComponent` | ❌ (fixture, không sao) |

Còn `new ToolExecutionComponent(` xuất hiện ở **hai** nơi, không phải một:

- `ui-helpers.ts:611` — đường rebuild (plan nêu ✅)
- `event-controller.ts:1406` — **đường live**, dựng card lần đầu từ `message_update` (plan **không** nêu)

**Vì sao quan trọng.** `setTarget` (`tool-args-reveal.ts:501-544`) **không** gọi `component.updateArgs` — nó chỉ `return displayArgsForPrefix(...)` ở `:543`. Component được đẩy args qua bốn đường riêng. Nếu bạn chỉ đẩy raw ở hai đường mà plan nêu, thì ở `:1434` (đường **chính** của `message_update`) raw channel sẽ không bao giờ được nạp — và đó là nơi `entry.displayArgs` có thể trả về **cùng tham chiếu** khi `parsedChanged` lẫn `rawPrefixChanged` đều false (`:425`), tức đúng trường hợp mà guard ở `tool-execution.ts:392` nuốt frame.

→ **Sửa bước 7 và bước 8 của plan: phải nối `event-controller.ts:1406` (constructor) và `:1434` / `:1750` (updateArgs), và thêm `event-controller.ts` vào danh sách file cần chạm.** Đây là phần mở rộng ngoài phạm vi plan, cần nói với maintainer.

---

## 8. Câu hỏi mở — cần người quyết trước khi mở PR

**(a) `ToolRenderResultOptions` có import `RawToolArgs` từ `@oh-my-pi/pi-tui` không?** Plan bảo không, với lý do "hai package không được type-coupled". **Lý do đó sai** — `packages/coding-agent/src/extensibility/extensions/types.ts` có **17+ dòng** import `@oh-my-pi/pi-tui/*` (`:68` barrel, `:74 tools/edit`, `:82 theme`, `:90 tools/read`, …), và `packages/coding-agent/src/extensibility/custom-tools/types.ts:22` đã import đúng `RenderResultOptions` từ `@oh-my-pi/pi-tui/tools/renderer`. **Kết luận của plan vẫn dùng được** (khai báo cấu trúc, giữ surface tác giả công khai ổn định), nhưng **đừng viết lý do đó vào comment hay PR description** — reviewer sẽ mở file và thấy ngay. Nếu muốn một nguồn sự thật duy nhất thì `export type ToolRenderResultOptions = RenderResultOptions;` là đường đi, nhưng nó đổi tính danh của public type → quyết định của maintainer.

**(b) Khóa nào được đổi tên?** Khuyến nghị: **chỉ** writer `xdev.ts:57` (inner) + strip `xdev.ts:114` + đăng ký `json-tree.ts:23`. Nhánh thay thế (bỏ `__partialJson` khỏi args ngoài, chuyển bash/edit/eval sang `options.rawArgs.json`) khớp với kỳ vọng của plan rằng sáu file test cần cập nhật, và gấp ~3× diện tích. Đây là quyết định của maintainer, không phải người triển khai.

**(c) `rawArgs.complete` có dư thừa với `argsComplete` không?** `RenderResultOptions` đã mang `argsComplete?: boolean`. Khuyến nghị: giữ cả hai tạm — `argsComplete` là sự kiện vòng đời (set từ `setArgsComplete`), `rawArgs.complete` mô tả buffer renderer thật sự cầm. **Nếu thấy hai cái lệch nhau, đó là phát hiện — phải nêu ra, đừng xoa dịu.**

**(d) `renderContext` có sửa luôn không?** Cùng hai adapter cũng ném nó. Gán ở `tool-execution.ts:887` (`??=`), `:968` (custom), `:1070` + `:1130` (built-in) — **bốn chỗ**. `RenderResultContextOptions` (`renderer.ts:30`) sinh ra chính là để mang nó. Khuyến nghị: **đừng sửa ở đây** (là thay đổi hành vi quan sát được riêng, mục này đã ở mức churn cả ba sóng) — nhưng **phải ghi lại là follow-up đã biết**, vì để yên nghĩa là cách sửa forward vẫn còn dang dở và người đọc kế tiếp sẽ không biết đó là một quyết định.

**(e) Dòng changelog.** Adapter-forward sửa một bug đang sống mà không ai nhìn thấy. Xác nhận trước khi viết PR rằng nó gộp vào cùng một dòng với việc đổi tên `__partialJson` — vì một người viết extension ngoài repo đúng là người sẽ nhận ra.

---

## 9. Kiểm toán neo — kết quả VIỆC 1

Tổng **55** neo/claim đã kiểm. **21 đúng tuyệt đối · 33 lệch số dòng · 1 sai nội dung · 1 sai hoàn toàn · (5 về file không tồn tại — xem cuối bảng).**

| # | Neo trong plan | Thực tế đã đọc | Kết luận |
| --- | --- | --- | --- |
| 1 | `renderer.ts:10-27` `RenderResultOptions` | đúng `:10-27` | ✅ |
| 2 | `renderer.ts:21` `argsComplete?` | đúng | ✅ |
| 3 | `renderer.ts:26` `executionStarted?` | đúng | ✅ |
| 4 | `renderer.ts:30` `RenderResultContextOptions` | đúng | ✅ |
| 5 | `renderer.ts:75` signature built-in | đúng `:75 options: RenderResultContextOptions` | ✅ |
| 6 | `types.ts:606-613` `ToolRenderResultOptions` | **`:608-615`** (doc `:607`) | ⚠️ lệch +2 |
| 7 | `types.ts:686` / `:691` (site dùng) | **`:694`** (`renderCall`) / **`:699`** (`renderResult`) | ⚠️ lệch +8 |
| 8 | `wrapper.ts:59-65` `RegisteredToolAdapter.renderResult` | class ở **`:62`**; field ở **`:70`**; thân ở **`:92-100`** | ⚠️ lệch |
| 9 | `wrapper.ts:62` object literal | **`:96`** | ⚠️ lệch +34 |
| 10 | `wrapper.ts:55-57` "forward `options` nguyên khối" | **`:84-91`**, và nó đi qua `renderOptionsWithTheme` **Proxy** (`:43-57`) | ❌ **SAI NỘI DUNG** |
| 11 | `wrapper.ts:59` tham số gõ `any` | `:93` | ⚠️ lệch |
| 12 | `sdk.ts:1188` `customToolToDefinition` | **`:1200`** | ⚠️ lệch +12 |
| 13 | `sdk.ts:1214-1223` wrapper `renderResult` | **`:1225-1235`** | ⚠️ lệch +11 |
| 14 | `sdk.ts:1217` object literal | **`:1229`** | ⚠️ lệch +12 |
| 15 | `sdk.ts:1212` `renderCall: tool.renderCall` | **`:1224`** | ⚠️ lệch +12 |
| 16 | `tool-execution.ts:387-397` `updateArgs` | đúng | ✅ |
| 17 | `tool-execution.ts:388-391` comment | đúng | ✅ |
| 18 | `tool-execution.ts:392` early return | đúng | ✅ |
| 19 | `tool-execution.ts:394` `#displayInputVersion++` | đúng | ✅ |
| 20 | `tool-execution.ts:163` `ToolExecutionHandle.updateArgs` | đúng | ✅ |
| 21 | `tool-execution.ts:328-340` `#renderState` | đúng | ✅ |
| 22 | `tool-execution.ts:926-930` phép gán | **`:928-932`** | ⚠️ lệch +2 |
| 23 | `tool-execution.ts:924-931` `#rebuildDisplay` | **`:926-932`** | ⚠️ lệch +2 |
| 24 | `tool-execution.ts:950` nhánh custom | **`:958`** | ⚠️ lệch +8 |
| 25 | `tool-execution.ts:1041` nhánh built-in | **`:1049`** | ⚠️ lệch +8 |
| 26 | `tool-execution.ts:996-1001` cast | **`:1004-1009`** | ⚠️ lệch +8 |
| 27 | `tool-execution.ts:971, 1002, 1129, 1150` call site render | **`:979, :1016, :1083, :1137, :1164`** (+ `:1362`) | ⚠️ lệch, **thiếu 2 site** |
| 28 | `tool-execution.ts:960, 1062, 1122, 885` gán `renderContext` | **`:968, :1070, :1130, :887`** | ⚠️ lệch |
| 29 | `tool-args-reveal.ts:5-8` / `:7` | đúng | ✅ |
| 30 | `tool-args-reveal.ts:396-432` `displayArgsForPrefix` | đúng | ✅ |
| 31 | `tool-args-reveal.ts:424` `rawPrefixChanged` | đúng | ✅ |
| 32 | `tool-args-reveal.ts:427-429` literal | `:427-430` | ✅ (sát) |
| 33 | `tool-args-reveal.ts:455` `decodeStreamedToolArgs` | đúng | ✅ |
| 34 | `tool-args-reveal.ts:566` `flushAll` | đúng | ✅ |
| 35 | `tool-args-reveal.ts:613-616` `#tick` | đúng | ✅ |
| 36 | `ui-helpers.ts:604-611` đường rebuild | đúng | ✅ |
| 37 | `ui-helpers.ts:562, 576, 697` `readGroup.updateArgs` | đúng cả 3 | ✅ |
| 38 | `xdev.ts:57` writer inner | đúng | ✅ |
| 39 | `xdev.ts:113-116` / `:114` strip | đúng | ✅ |
| 40 | `xdev.ts:145` `renderXdevCall` | đúng | ✅ |
| 41 | `write.ts:467` call site | đúng | ✅ |
| 42 | `json-tree.ts:23` `HIDDEN_ARG_KEYS` | đúng | ✅ |
| 43 | `tool-execution-custom-repaint.test.ts:88` | đúng | ✅ |
| 44 | `json-tree-render.test.ts:32` | đúng (seam `formatArgsInline`) | ✅ |
| 45 | `issue-5764-…test.ts:59` | đúng | ✅ |
| 46 | `approval.test.ts:216` | đúng | ✅ |
| 47 | `bash.ts:196-237` | `:196-199` reader, `:237` writer | ✅ |
| 48 | `edit.ts:251` | đúng | ✅ |
| 49 | `eval.ts:98` | đúng (khai báo field) | ✅ |
| 50 | 6 file test ghim `__partialJson` | đủ 6; `edit-renderer.test.ts` ở **`:53, :405`** (plan ghi `:417`) | ⚠️ 1 dòng lệch |
| 51 | `chat-transcript-builder.ts` không có raw plumbing | **0 hit / 597 dòng** — đính chính của plan là **đúng** | ✅ |
| 52 | `types.ts` "không có import `pi-tui`" | **17+ dòng import `@oh-my-pi/pi-tui/*`** | ❌ **SAI HOÀN TOÀN** |
| 53 | `check:ts` có "16 target `check:types`" | đếm được **16** | ✅ |
| 54 | Ninja/cmake/opusic là bắt buộc | `MODULE.bazel:171` xác nhận; ninja + cmake đã có trên máy | ✅ |
| 55 | `tool-execution-xdev-render.test.ts` tồn tại | 89 dòng, 2 test | ✅ |

**Hai claim trong bảng "Đính chính so với plan" của chính §M4-7 cần sửa thêm ngoài bảng trên:**

- Plan đính chính: "`ToolRenderResultOptions` nằm ở types.ts:606-613" → thực tế **`:608-615`**; "dùng ở `:686`/`:691`" → thực tế **`:694`/`:699`**. Đính chính này chỉ sửa được một phần vì nó sửa từ con số của plan (`:581-588`/`:661`/`:664`) sang con số khác — **cả hai vẫu lệch**.
- Plan đính chính: "`wrapper.ts:55-57` forward `options` nguyên khối cho `renderCall`" → sai; nó forward qua **Proxy** `renderOptionsWithTheme`. Kết luận "đừng sửa `renderCall`" vẫn đúng (Proxy giữ nguyên own-key, không mất field), nhưng lý do phải viết lại.

**File không tồn tại trong bất kỳ cây nào** (đã kiểm `find` + `ls`): `packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` (đúng — mục này ghi "tạo"), và `packages/tui/src/tools/renderer-registry` (đúng — plan nói không tồn tại, và xác nhận không có).

---

## 10. Ràng buộc thứ tự (giữ nguyên, đã đối chiếu)

- `depends_on`: rỗng. Không có coupling tầng build — `git grep 'packages/tui/src/tools/renderer-registry'` không có file nào như vậy.
- Wave C là `shippable: false`. Mục này merge như một phần của **quyết định changelog M4 duy nhất** bao trùm Wave B, C, D. **Không** thêm mục CHANGELOG trong PR này.
- Thứ tự bề mặt với **M2 WI-4**: mục này land thành commit riêng, trước WI-4. PR không được merge trước một WI-4 đã được review.

## 11. Luật đã tuân thủ

- Không dùng `tsc` / `npx tsc` (chỉ `bun run check:ts` / `oxfmt`).
- **Không sửa file kế hoạch nào.** Phiếu này là file riêng.
- Không bịa: mọi trích dẫn TRƯỚC trong §2 lấy từ file đã mở bằng `awk NR>=a&&NR<=b`; mọi kết luận "ĐỎ ĐƯỢC" trong §5 đều kèm output chạy thật.
- Mọi file probe đã xoá sau khi chạy; `git status packages/` chỉ còn `?? packages/coding-agent/test/collab/web-wire.types.ts` — vốn đã untracked từ trước phiên này.
