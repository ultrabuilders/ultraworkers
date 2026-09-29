# WI-13 — Phiếu triển khai

**Kế hoạch:** `MILESTONE_2_EXECUTION_PLAN.md` mục `## WI-13.`
**Cây kiểm tra:** `65cc6c1` (nhánh `milestone-1`)
**Ngày kiểm:** 2026-09-29

> **Cảnh báo đầu phiếu — HEAD đã dịch so với lúc tài liệu viết.**
> Phiếu trong tài liệu được viết cho `808b365`. Cây hiện tại là `65cc6c1`, sau một
> `Sync from upstream omp 18.4.0 (167 commits, squashed)` (`f804d66`) đã dịch **mọi** neo ở
> `runner.ts`, `session/agent-session.ts`, `interactive-mode.ts`, `types.ts` và file test.
> Tôi đã mở từng dòng ở `65cc6c1` và ghi lại vị trí thật ở mục 7. **Dùng số ở mục 7, đừng
> dùng số trong tài liệu.** Độ trôi KHÔNG đều — cùng một file vừa có neo `+4` vừa có neo `+29`.

---

## 1. Cái gì thay đổi, quan sát được

Một extension gọi `ctx.ui.setHeader(...)` hay `ctx.ui.setFooter(...)` nay nhận một `Error`
nêu đúng tên phương thức đã gọi cùng hai cách vẽ thật sự chạy được (`setWidget` /
`setEditorComponent`), thay vì trả về `undefined` im lặng; và bấm `/new` không còn xoá widget
của một extension vẫn đang chạy.

Hai PR, gate khác nhau:
- **PR 1** — bốn chỗ ném lỗi. **Đây là thứ duy nhất gate wave 6 chạy.**
- **PR 2** — nửa chủ sở hữu. Không gate ở wave 6, nhưng **phải land trước WI-9 (wave 7)**.

---

## 2. Bảng điểm sửa

Cột "TRƯỚC" trích nguyên văn từ file ở `65cc6c1`, đã `sed -n` mở đọc.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:157` | `uiContext.setFooter` (đường TUI) | `setFooter: () => {},` | `setFooter: () => { throw new Error(noFrameSurfaceError("setFooter")); },` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:158` | `uiContext.setHeader` (đường TUI) | `setHeader: () => {},` | `setHeader: () => { throw new Error(noFrameSurfaceError("setHeader")); },` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:428` | `noOpUIContext.setFooter` | `setFooter: () => {},` | `setFooter: () => { throw new Error(noFrameAtAllError("setFooter")); },` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:429` | `noOpUIContext.setHeader` | `setHeader: () => {},` | `setHeader: () => { throw new Error(noFrameAtAllError("setHeader")); },` |
| `packages/coding-agent/src/session/agent-session.ts:558` | `noOpUIContext.setFooter` (bản thứ hai, tách biệt) | `setFooter: () => {},` | `setFooter: () => { throw new Error(noFrameAtAllError("setFooter")); },` |
| `packages/coding-agent/src/session/agent-session.ts:559` | `noOpUIContext.setHeader` (bản thứ hai) | `setHeader: () => {},` | `setHeader: () => { throw new Error(noFrameAtAllError("setHeader")); },` |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:581` | `createAcpExtensionUiContext` → `setFooter` | `setFooter: () => {},` | `setFooter: () => { throw new Error(noFrameAtAllError("setFooter")); },` — **chỉ sau khi quyết định ACP** |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:582` | `createAcpExtensionUiContext` → `setHeader` | `setHeader: () => {},` | `setHeader: () => { throw new Error(noFrameAtAllError("setHeader")); },` — **chỉ sau khi quyết định ACP** |
| `packages/coding-agent/src/extensibility/extensions/types.ts:274` | JSDoc `setFooter` | `/** Set a custom footer component, or undefined to restore the built-in footer. */` | JSDoc nói hợp đồng thật: ném lỗi, trỏ `setWidget`/`setEditorComponent` |
| `packages/coding-agent/src/extensibility/extensions/types.ts:277` | JSDoc `setHeader` | `/** Set a custom header component, or undefined to restore the built-in header. */` | như trên |
| `packages/coding-agent/src/extensibility/extensions/ui-context-errors.ts` | **TẠO MỚI** | (không tồn tại) | hai hàm `noFrameSurfaceError(method)` và `noFrameAtAllError(method)`, **hai thông điệp khác nhau** |
| `packages/coding-agent/src/extensibility/extensions/index.ts` | barrel | `export * from "./runner";` … `export * from "./types";` | thêm `export * from "./ui-context-errors";` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:87` | `#hookWidgetsAbove` (PR 2) | `#hookWidgetsAbove = new Map<string, ExtensionUiComponent>();` | `#hookWidgetsAbove = new Map<string, Map<string, HookWidgetEntry>>();` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:88` | `#hookWidgetsBelow` (PR 2) | `#hookWidgetsBelow = new Map<string, ExtensionUiComponent>();` | `#hookWidgetsBelow = new Map<string, Map<string, HookWidgetEntry>>();` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:354` | `setHookWidget` (PR 2) | `target.set(key, this.#createHookWidget(content));` | `target.set(key, { content, component: this.#createHookWidget(content) });` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:1210-1220` | `clearHookWidgets()` (PR 2) | `clearHookWidgets(): void { … this.#hookWidgetsAbove.clear(); this.#hookWidgetsBelow.clear(); this.#rebuildHookWidgets(); }` | thêm `remountHookWidgets()` giữ `content`, dispose rồi dựng lại |
| `packages/coding-agent/src/modes/interactive-mode.ts:6034` | call site thứ 5 (PR 2) | `this.#extensionUiController.clearHookWidgets();` | `this.#extensionUiController.remountHookWidgets();` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1284` | `createContext()` → `ui` (PR 2) | `ui: this.#uiContext,` | `ui: extensionPath !== undefined ? this.createUIContext(extensionPath) : this.#uiContext,` |
| `packages/coding-agent/CHANGELOG.md:3` | `[Unreleased]` | `## [Unreleased]` rồi thẳng `## [18.3.3]` | thêm mục dưới `### Fixed` (mục này **chưa tồn tại** ở `65cc6c1`) |

---

## 3. Các bước, mỗi bước có neo đã kiểm

Mọi neo dưới đây tôi đã `sed -n "<n>p"` mở và đọc ở `65cc6c1`.

### PR 1

**Bước 1 — Xác nhận cây.** `git rev-parse --short HEAD` trả về **`65cc6c1`**, KHÔNG phải
`808b365` như tài liệu ghi. `git status --short -- packages/` chỉ hiện một dòng `??`
(`test/collab/web-wire.types.ts`), không có ` M`/`MM` nào — cây sạch, nhưng **đã dịch**.
Dùng bảng neo ở mục 7.

**Bước 2 — CỔNG DỪNG: chốt phương án (A) hay (B) bằng văn bản trước khi viết code.**
Khuyến nghị **(B)**: cả hai phương thức ném lỗi, thông điệp trỏ `setWidget` + `setEditorComponent`.
Tôi đã xác minh điều kiện để loại (A): `packages/tui/src/tui.ts` dài 3633 dòng, chứa **zero**
`setHeader` / `setFooter` / `headerComponent` / `footerComponent`. Trên toàn `packages/tui/src`
chỉ có **hai** hit, cả hai đều private và thuộc component khác —
`components/wizard-step.ts:132` (`setFooter(footer: Component | undefined): void;`) và
`prompt/composer.ts:823` (`setHeaderExtras(before: readonly Component[], after: readonly Component[]): void;`).
Nếu chọn (A), `packages/tui` có public API mới và mệnh đề §4.2 phải sửa bằng văn bản.

**Bước 3 — Viết hai thông điệp lỗi thành helper dùng chung**, KHÔNG phải hai string literal.
Tạo `packages/coding-agent/src/extensibility/extensions/ui-context-errors.ts` và thêm
`export * from "./ui-context-errors";` vào `index.ts`.

Lý do đặt ở đây — tôi đã kiểm: `grep 'modes/' packages/coding-agent/src/extensibility/extensions/runner.ts`
trả về **không có dòng nào**, xác nhận `runner.ts` không có cạnh import vào `modes/`.

> **Sửa một lỗi trong tài liệu:** tài liệu viết "cả bốn site tiêu thụ đã import barrel
> `extensibility/extensions`". **Sai với `runner.ts`.** `index.ts` chứa `export * from "./runner";` —
> `runner.ts` **là nguồn của barrel**, không thể import chính nó mà không tạo vòng. Nó dùng
> import anh em (`./managed-timers`, `./model-api`). Nên `runner.ts` phải import
> `from "./ui-context-errors"`, **không** phải từ barrel. Ba site kia đúng:
> `extension-ui-controller.ts:24`, `acp-agent.ts:54`, `agent-session.ts:158-159`.

**Bước 4 — Site 1/4 (TUI).** `extension-ui-controller.ts:157-158`. Đã đọc:
```
157| 			setFooter: () => {},
158| 			setHeader: () => {},
159| 			setEditorComponent: factory => this.ctx.setEditorComponent(factory),
```
Đây là site **duy nhất** trong bốn site mà một frame thật sự có mặt — nên thông điệp của nó
trỏ hai phương thức vẽ được, **không** trỏ `ctx.hasUI`.

**Bước 5 — Site 2–4/4 (no-frame).** Ba site còn lại, giữ nguyên mọi thành viên no-op xung quanh:
- `runner.ts:428-429` — `noOpUIContext` của runner (khai báo `:419`).
- `session/agent-session.ts:558-559` — `noOpUIContext` **thứ hai, tách biệt hoàn toàn**
  (khai báo `:536`). Đây là bản thứ hai, không phải import của bản trong runner — đó là lý do
  thông điệp phải đến từ helper và **không bao giờ** viết hai lần.
- `modes/acp/acp-agent.ts:581-582` — **chỉ làm nếu** câu hỏi mở về ACP được quyết định (mục 5).

Đã đọc `#createCommandContext()` tại `agent-session.ts:7540`, dùng tại `:7546`
(`ui: noOpUIContext,` cùng `mode: "print"`, `hasUI: false` ở `:7547-7548`), với comment ở
`:7553-7554`: *"Used only when the session has no extension runner… so only hand-constructed
sessions land here."* Vẫn với tới được, vẫn im lặng.

**Bước 6 — Cập nhật JSDoc.** `types.ts:274` và `types.ts:277` (xem bảng mục 2). Nếu site ACP
được đổi, sửa JSDoc `createAcpExtensionUiContext` ở `acp-agent.ts:408-423` **cùng commit** —
tôi đã đọc, nó ghi: *"The non-elicitation surface (custom components, theming, terminal input)
remains stubbed — ACP clients render those themselves or not at all."* Để nguyên là doc trái
ngược code.

**Bước 7 — Viết đúng hai test.** Xem mục 4.

**Bước 8 — Changelog + chạy cổng.** Thêm mục dưới `### Fixed` (phải tạo mục này — xem mục 7).
Land PR 1 riêng. **Không bắt đầu PR 2 trong cùng nhánh.**

### PR 2

**Bước 9 — Đổi kiểu giá trị của bản đồ để giữ `content`.** Tôi đã đọc `setHookWidget`
(`extension-ui-controller.ts:343-356`): `content` là biến cục bộ chết ở `:354`. Với nội dung
dạng mảng, `#createHookWidget` (`:364-379`) dựng `Container` mới từ `content.slice(0, MAX_WIDGET_LINES)` —
`MAX_WIDGET_LINES = 10` ở `:39`, và thêm `... (widget truncated)` khi dài hơn. **Các dòng gốc
biến mất hoàn toàn**, nên "remount bằng cách gọi lại factory" không viết được nếu chưa đổi
bản đồ. Kiểu mới: `interface HookWidgetEntry { content: ExtensionWidgetContent; component: ExtensionUiComponent }`.
`#removeHookWidget` (`:358-362`) hiện gọi `existing?.dispose?.();` — giữ nguyên optional-chaining;
`ExtensionUiComponent` là `Component & { dispose?(): void }` (`packages/tui/src/chat/extension-types.ts:5`,
đã đọc đúng dòng 5).

**Bước 10 — Thêm tầng theo từng extension.** `Map<extensionPath, Map<string, HookWidgetEntry>>`.
Cho controller một method dispose widget của **một** extension. Đó là điểm nối WI-9 gọi.
**Đừng** hiện thực unload ở đây — tôi đã chạy `grep -rn "unloadExtension" packages/coding-agent/src`
và nó trả về **không dòng nào**; WI-9 mới tạo ra entry point đó.

**Bước 11 — Object literal `uiContext` (`:119-163`) thành factory nhận `extensionPath`.**
Đã đọc `:163-164`: `this.ctx.setToolUIContext(uiContext, true); this.#toolUIContext = uiContext;`.
Đây là bản dùng chung/mặc định và **phải tiếp tục chạy không đổi**. Bước này là **tiền đề** cho
thay đổi phía runner — không làm ngược.

**Bước 12 — `createUIContext(extensionPath)` trong runner + tham số tuỳ chọn cho `createContext()`.**
`createContext(` khai báo tại `runner.ts:1271`, `ui: this.#uiContext,` tại `:1284`.
Tôi đã đếm `this.createContext(` trong `runner.ts` = **16 call site**, không phải "~12".
Hai trampoline không tham số nằm ở `:784` và `:803`.

> **Sửa một lỗi trong tài liệu:** `hasUI()` ở `runner.ts:952-953` là
> `return this.#uiContext !== noOpUIContext;` — so sánh **danh tính**. Tôi đã đọc. Nó **an toàn**
> với hình dạng `{...this.#uiContext, setWidget: ...}` vì `#uiContext` không đổi. Nó **chỉ** hỏng
> nếu ai đó gán object theo từng extension trở lại vào `#uiContext`. Cấm làm vậy.

**Bước 13 — Xoá toàn cục → remount, tại NĂM call site, không phải bốn.** Đã xác minh đủ NĂM:
- `extension-ui-controller.ts:246` (`newSession`, khối `actions` khai báo `:183`)
- `extension-ui-controller.ts:307` (`switchSession`, khối 1)
- `extension-ui-controller.ts:478` (`newSession`, khối `actions` khai báo `:416`)
- `extension-ui-controller.ts:536` (`switchSession`, khối 2)
- `interactive-mode.ts:6034` (ngoài controller)

Tôi đã đọc cả hai khối: chúng song sinh giống hệt từng byte, đều là
`await this.ctx.prepareSessionSwitch();` → `this.ctx.clearTransientSessionUi();` →
`this.clearExtensionTerminalInputListeners();` → `this.clearHookWidgets();`.
Sửa một bỏ trống bản kia là một khoảng trống im lặng mà không test nào nhìn thấy.
Giữ lời gọi `#rebuildHookWidgets()` — ở `clearHookWidgets` nó nằm ở `:1219`, ngay sau lần xoá.

**Bước 14 — Xác minh bằng tay, và BẤT BUỘC test.** Xem mục 5 — tài liệu nói PR 2 "ship KHÔNG có
test"; tôi đã chứng minh điều đó **không bắt buộc**, xem mục 5.

**Bước 15 — Changelog thứ hai + `bun run check:ts` + chạy lại test wave 6.** Land trước WI-9.

---

## 4. Hợp đồng test

### Dòng (1) — hợp đồng phủ định, đường CÓ UI

**File:** `packages/coding-agent/test/modes/controllers/extension-ui-controller.test.ts` (đã có, 509 dòng)

**Neo đã kiểm:** import `ExtensionUiController` ở `:8`; `function makeHarness()` ở `:23`;
`const controller = new ExtensionUiController(ctx);` ở `:67`; `async init()` ở `:89-93`:
```
89| 		async init(): Promise<ExtensionUIContext> {
90| 			await controller.initHooksAndCustomTools();
91| 			expect(uiContext).toBeDefined();
92| 			return uiContext!;
93| 		},
```
`uiContext` được ghi vào bởi `setToolUIContext` (`:58-61`), và chính object đó là literal chứa hai
stub ở `extension-ui-controller.ts:157-158`.

**Case:**
```ts
it('setHeader/setFooter throw instead of drawing nothing', async () => {
  const harness = makeHarness();
  const ui = await harness.init();
  expect(() => ui.setHeader(factory)).toThrow(/setHeader/);
  expect(() => ui.setFooter(factory)).toThrow(/setFooter/);
  // cả hai thông điệp phải nêu CẢ HAI phương thức thay thế
  expect(() => ui.setHeader(factory)).toThrow(/setWidget/);
  expect(() => ui.setHeader(factory)).toThrow(/setEditorComponent/);
});
```

> **TUYỆT ĐỐI KHÔNG dựng `ExtensionRunner` rồi gọi `initialize(...)` với context tự chế cho dòng (1).**
> `getUIContext()` (`runner.ts:948-949`) chỉ trả về đúng object test truyền vào, nên khẳng định
> trên đó là khẳng định trên fixture của chính test — và sẽ xanh ngay trên HEAD.

**Tôi đã chạy probe thật trên `65cc6c1`:** `ui.setHeader(...)` trả về `undefined`, không ném.
Kết quả: `Received function did not throw`. → **Dòng (1) ĐỎ trên HEAD. Đã chứng minh bằng chạy thật.**

### Dòng (2) — hợp đồng phủ định, đường no-UI

**File MỚI:** `packages/coding-agent/test/extension-ui-header-footer.test.ts`
(tôi đã xác nhận: `ls` → *No such file or directory*)

**Mẫu dựng runner rẻ nhất trong cây** — `packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts:6-11`:
```ts
const runtime = { flagValues: new Map(), pendingProviderRegistrations: [] } as unknown as ExtensionRuntime;
return new ExtensionRunner([], runtime, "/tmp", { getCwd: () => "/tmp" } as never, {} as never);
```
Constructor thật ở `runner.ts:630-643` cần **5** tham số bắt buộc; mẫu trên đã dùng `as never`
cho `sessionManager` và `modelRegistry`, nên dòng (2) rẻ như tài liệu nói.

**Case:**
```ts
it('no-UI path names ctx.hasUI and reports hasUI() false', () => {
  const runner = new ExtensionRunner([], runtime, "/tmp", { getCwd: () => "/tmp" } as never, {} as never);
  const ui = runner.getUIContext();
  expect(() => ui.setHeader(factory)).toThrow(/hasUI/);
  expect(() => ui.setFooter(factory)).toThrow(/hasUI/);
  expect(runner.hasUI()).toBe(false);   // chứng minh đã đi qua noOpUIContext
});
```
Khẳng định `hasUI()` false là thứ phân biệt dòng này khỏi object literal của TUI.
Thông điệp phải **khác** dòng (1) — nói mode không có frame và bảo chặn bằng `ctx.hasUI`.

**Dòng (2) ĐỎ trên HEAD, độc lập với dòng (1)** — nó chạm `runner.ts:428-429`, một object literal
khác. Nếu chỉ làm dòng (2) đỏ bằng cách phá dòng (1), cách chia đó sai.

### Điều KHÔNG có test nào che

Ba điều sau **không** do WI-13 test: widget thực sự xuất hiện trong khung hình; gỡ một extension
chỉ gỡ widget của nó; hai extension cùng key được báo cáo. Tài liệu gán chúng cho
`test/extension-unload.test.ts` của WI-9 (tôi đã xác nhận file đó không tồn tại — đúng, và
`test/fixtures/outsider-extension/` cũng không tồn tại).

**Riêng về điều thứ nhị:** tôi đã chạy probe và phát hiện harness hiện tại **không** dựng được
widget. `ctx` ở `extension-ui-controller.test.ts:44-65` không có `hookWidgetContainerAbove` /
`hookWidgetContainerBelow`. Gọi `ui.setWidget(...)` ném:
```
TypeError: undefined is not an object (evaluating 'container.clear')
  at #renderHookWidgetContainer (extension-ui-controller.ts:393:3)
```
Đây là lý do thật khiến PR 2 "không thể có test" theo tài liệu — và nó **sửa được**, xem mục 5.

---

## 5. Cổng

### PR 1 (cổng của wave 6)

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent \
  && bun test test/extension-ui-header-footer.test.ts
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent \
  && bun test test/modes/controllers/extension-ui-controller.test.ts -t 'setHeader/setFooter throw'
cd /Users/tranquangdang21/Projects/ultraworkers \
  && grep -rnE 'set(Header|Footer): *(\(\) *=> *(\{\}|undefined)|[^=]*=>)|set(Header|Footer)\(\) *\{' \
       packages/coding-agent/src      # phải trả ZERO hit
```

> **Bỏ dòng preflight `bun --cwd=packages/natives run build` khỏi lệnh đo.**
> Tôi đã kiểm trên máy này: `packages/natives/native/pi_natives.darwin-arm64.node` **đã tồn tại**,
> `ninja` ở `/opt/homebrew/bin/ninja`, và `bun test test/modes/controllers/extension-ui-controller.test.ts`
> chạy ra **17 pass / 0 fail**. Cảnh báo "Failed to load pi_natives native addon" trong tài liệu là
> cảnh báo cho máy chưa build; ở đây nó không áp dụng. Giữ dòng preflight chỉ khi bạn gặp đúng
> thông điệp đó.

**Có ĐỎ ĐƯỢC không? Có — từng điều khoản một:**

| ĐK | Đỏ được bằng cách nào | Tôi đã kiểm |
| --- | --- | --- |
| (a) `check:ts` xanh | Script có thật ở `package.json:90`; bất kỳ lỗi kiểu nào làm đỏ | ✔ script tồn tại |
| (b) 2 test pass | Tôi đã **chạy thật**: `setHeader` trả `undefined`, `toThrow` fail → dòng (1) đỏ. Dòng (2) chạm stub riêng ở `runner.ts:428-429` → đỏ độc lập | ✔ **đã chạy**, môi trường OK |
| (c) grep zero hit | Hiện trả về **8 hit / 4 site**. Tôi đã thử regex với 6 chính tả im lặng (`() => {}`, `() => undefined`, `setHeader() {`, `(factory) => {}` ×2) — **bắt hết 6/6** | ✔ **đã chạy** |
| (d) cả 2 test FAIL trên HEAD | **KHÔNG phải lệnh** — đây là nghĩa vụ quy trình, phải chạy và ghi lại trước khi sửa | ⚠ thủ công |

Đừng thu hẹp regex về một chữ. `setHeader: () => {}` chỉ bắt một chính tả; `setHeader: () => undefined`
và `setHeader() {}` đều thoả `ExtensionUIContext` (`types.ts:278`), đều im lặng, đều làm (c) xanh.

### PR 2 (nửa chủ sở hữu) — cổng này tài liệu nói **không thể đỏ**

Tài liệu viết thẳng: *"PR 2 ship KHÔNG có test cho hành vi chủ sở hữu, theo thiết kế"*, và cổng chỉ
gồm `check:ts` + "đếm NĂM call site" + "kiểm `/new` bằng tay". **Đó là một cổng luôn xanh.** Tôi đã
chạy probe và tìm ra nó KHÔNG phải giới hạn của tài liệu, mà là một thiếu sót:

**Harness thiếu đúng hai dòng.** `ctx` ở `extension-ui-controller.test.ts:44-65` không có
`hookWidgetContainerAbove` / `hookWidgetContainerBelow`. Thêm chúng vào — `Container` **đã được**
import ở `:2` — là mở khoá test sở hữu. Tôi đã chạy thử bằng bản vá tạm và đo được trên HEAD:

```
BEFORE (sau setWidget):   [EditorTopGap, Container[Text("line one")]]
AFTER  (sau clearHookWidgets): [EditorTopGap]          ← widget biến mất
```

**Đây chính là hồi quy `/new` mà tài liệu nói không test được — và nó ĐỎ ĐƯỢC.**

Cổng PR 2, viết lại để đỏ được:

```bash
# (i) type check
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts

# (ii) hợp đồng sở hữu — ĐỎ trên HEAD
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent \
  && bun test test/modes/controllers/extension-ui-controller.test.ts -t 'widget survives session switch'

# (iii) hợp đồng va chạm key — ĐỎ trên HEAD
#       hai extensionPath khác nhau, cùng key "k" → cả hai widget còn trong frame

# (iv) hai test của PR 1 vẫn xanh (chống hồi quy)
# (v) đếm NĂM call site, không liếc mắt:
cd /Users/tranquangdang21/Projects/ultraworkers \
  && grep -cn 'remountHookWidgets()' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts \
     packages/coding-agent/src/modes/interactive-mode.ts   # 4 + 1 + 1 định nghĩa
```

**Câu trả lời thẳng: cổng PR 1 có đỏ được — tôi đã chứng minh bằng chạy thật cho cả (b) và (c).
Cổng PR 2 của tài liệu thì không, và tôi đã viết lại nó ở trên thành cổng đỏ được.**

---

## 6. Cạm bẫy riêng của work item này

1. **Đếm site, đừng tin hai.** Tài liệu nói "hai chỗ ném lỗi"; thực tế có **BỐN** (tám dòng). Hai
   test vẫn xanh nếu bạn chỉ sửa `extension-ui-controller.ts:157-158` và `runner.ts:428-429`,
   vì site ACP và `agent-session.ts` không test nào chạm tới. **Đây là lý do điều khoản grep tồn
   tại** — nó là thứ bắt, không phải thừa.

2. **Ba trong bốn site không cùng ý định.** `extension-ui-controller.ts:157-158` là sơ suất.
   `agent-session.ts:558-559` là sơ suất thứ hai. Nhưng `acp-agent.ts:581-582` có JSDoc ở
   `:408-423` **cố ý** tài liệu hoá sự im lặng là một quyết định thiết kế. Sửa nó máy móc là
   đảo một quyết định đã có chủ đích mà không hỏi. Nếu quyết định "ACP không có frame, hãy ném
   lỗi", sửa JSDoc **cùng commit**.

3. **`hasUI()` là so sánh danh tính.** `runner.ts:952-953` là
   `return this.#uiContext !== noOpUIContext;`. Dùng `{...this.#uiContext, setWidget: ...}`
   thì an toàn. **Gán** object theo từng extension trở lại vào `#uiContext` thì `hasUI()` nói dối
   và test (2) sẽ xanh vì sai lý do.

4. **Bản đồ widget hiện tại vứt mất `content`.** Đây là lỗi làm cháy kỹ sư nhiều khả năng nhất ở
   PR 2. `content` là biến cục bộ chết ở `extension-ui-controller.ts:354`; `#createHookWidget`
   (`:364-379`) đã dựng xong `Container` từ nó. Với nội dung dạng `string[]`, các dòng gốc **không
   còn đâu**. "Remount bằng cách gọi lại factory" **không viết được** cho tới khi đổi kiểu giá trị
   của bản đồ. Đừng viết `remountHookWidgets()` trước bước 9.

5. **Thứ tự remount tại `:246` / `:307` / `:478` / `:536`.** Cả bốn đều gọi `clearHookWidgets()`
   **TRƯỚC** `await this.ctx.session.newSession(...)`. Remount tại đó dựng widget trên session
   **cũ**. Factory nào đóng trên state của session sẽ render state cũ. Đây là rủi ro thật, không
   phải giả định.

6. **Đừng mở rộng ra mọi thành viên im lặng.** `setStatus`, `setWidget`, `setWorkingMessage` vẫn là
   no-op ở cả ba site no-frame. Mở rộng là một thay đổi khác, cần review riêng — và sẽ phá regex
   của điều khoản (c) theo hướng ngược lại.

7. **Đừng tin số dòng trong tài liệu.** HEAD đã dịch. Độ trôi không đều: `runner.ts` vừa `+4` ở
   `noOpUIContext` vừa `+29` ở `createContext`; `agent-session.ts` vừa `+18` ở khai báo vừa `+146`
   ở chỗ dùng. Một số neo **không dịch** (`extension-ui-controller.ts` toàn bộ, `acp-agent.ts`,
 và các neo của file test) — nên "cứ cộng đều N" cũng sai. Dùng mục 7.

---

## 7. Bảng neo đã kiểm — vị trí THẬT tại `65cc6c1`

`✅` = đúng nguyên vị trí tài liệu. `→` = đã dịch, ghi vị trí thật.

### `packages/coding-agent/src/extensibility/extensions/types.ts` (1874 dòng)
| tài liệu | thật | nội dung |
| --- | --- | --- |
| `WidgetPlacement` `:205` | **`:207`** | `export type WidgetPlacement = "aboveEditor" | "belowEditor";` ✔ |
| interface `ExtensionUIContext` `:235` | **`:237`** | ✔ |
| `setStatus` `:264` | **`:266`** | `setStatus(key: string, text: string \| undefined): void;` ✔ |
| `setWidget` `:270` | **`:272`** | `setWidget(key: string, content: ExtensionWidgetContent, options?: ExtensionWidgetOptions): void;` ✔ |
| JSDoc `setFooter` `:273` | **`:274`** | `/** Set a custom footer component, or undefined to restore the built-in footer. */` ✔ |
| `setFooter` `:276` → JSDoc | **`:275`** | `setFooter(factory: ExtensionUiComponentFactory \| undefined): void;` ✔ |
| `setHeader` | **`:277`** JSDoc / **`:278`** chữ ký | ✔ |
| `setEditorComponent` `:329-331` | **`:331-333`** | ✔ |
| `hasUI: boolean` `:464` | **`:466`** | ✔ — nhưng nó nằm trong `ExtensionContext` (khai báo `:454`), KHÔNG phải `ExtensionUIContext` (`:237`) |

### `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts` (1342 dòng) — **KHÔNG dịch**
Tất cả ✅: `:39` (`const MAX_WIDGET_LINES = 10;`), `:87-88` (hai bản đồ), `:99` (`#toolUIContext`),
`:118`, `:119-163`, `:130` (chuyển tiếp `setWidget`), **`:157-158`** (hai stub im lặng), `:159`,
`:163-164`, `:183` (khối `actions` 1), **`:246`**, **`:307`**, `:339-341` (`getToolUIContext`),
`:343-356`, `:353-354`, `:358-362`, `:364-379`, `:381-385`, `:387-408`, `:410`, `:416` (khối 2),
**`:478`**, **`:536`**, `:591-592` (`setHookStatus`), `:1210-1220` (`clearHookWidgets`), `:1219`.

### `packages/coding-agent/src/extensibility/extensions/runner.ts` (1992 dòng; tài liệu ghi 1963)
| tài liệu | thật | delta |
| --- | --- | --- |
| `noOpUIContext` khai báo `:415` | **`:419`** | +4 |
| cặp im lặng `:424-425` | **`:428-429`** | +4 |
| `#uiContext` `:459` | **`:463`** | +4 |
| fallback constructor `:640` | **`:644`** | +4 |
| fallback lúc init `:740` | **`:744`** | +4 |
| comment "takes no extension argument" `:758` | **`:762`** | +4 |
| khối comment `:756-777` | **`:760-779`** | +4 |
| trampoline 1 `:780` | **`:784`** | +4 |
| trampoline 2 `:799` | **`:803`** | +4 |
| `getUIContext()` `:919-921` | **`:948-949`** | +29 |
| `hasUI()` `:923-925` | **`:952-953`** | +29 |
| `getExtensionPaths()` `:927-929` | **`:956-958`** | +29 |
| `createContext(` `:1242` | **`:1271`** | +29 |
| `ui: this.#uiContext,` `:1255` | **`:1284`** | +29 |

Nội dung đều đúng. `hasUI()` (`:952-953`) = `return this.#uiContext !== noOpUIContext;` —
so sánh danh tính, đã xác nhận. `this.createContext(` xuất hiện **16** lần (tài liệu ghi "~12").
Constructor `:630-643` cần 5 tham số bắt buộc.

### `packages/coding-agent/src/modes/interactive-mode.ts`
| tài liệu | thật | delta |
| --- | --- | --- |
| `clearHookWidgets()` `:6020` | **`:6034`** | +14 |
| `initializeHookRunner` `:6269-6270` | **`:6283-6284`** | +14 |
| `setEditorComponent` `:6273` | **`:6287`** | +14 |

### `packages/coding-agent/src/session/agent-session.ts` (12352 dòng)
| tài liệu | thật | delta |
| --- | --- | --- |
| `noOpUIContext` khai báo `:518` | **`:536`** | +18 |
| cặp im lặng `:540-541` | **`:558-559`** | +18 |
| dùng tại `:7400` | **`:7546`** | +146 |
| comment `:7407-7408` | **`:7553-7554`** | +146 |

`#createCommandContext()` khai báo tại **`:7540`**. Độ trôi **không đều ngay trong một file**.

### `packages/coding-agent/src/modes/acp/acp-agent.ts` — **KHÔNG dịch**
Tất cả ✅: JSDoc `:408-423`, `export function createAcpExtensionUiContext(` `:424`,
cặp stub `:581-582`.

### `packages/coding-agent/test/modes/controllers/extension-ui-controller.test.ts`
| tài liệu | thật |
| --- | --- |
| dài 525 dòng | **509 dòng** |
| import `ExtensionUiController` `:8` | ✅ `:8` |
| `makeHarness()` `:23` | ✅ `:23` |
| `new ExtensionUiController(ctx)` `:67` | ✅ `:67` |
| `async init()` `:89-93` | ✅ `:89-93` |

`ctx` stub ở `:44-65` — **thiếu `hookWidgetContainerAbove` / `hookWidgetContainerBelow`** (mục 5).
`Container` đã được import ở `:2`.

### File chưa tồn tại (đã xác nhận bằng `ls` → *No such file or directory*)
`test/extension-ui-header-footer.test.ts` ✔, `test/extension-unload.test.ts` ✔,
`test/fixtures/outsider-extension/` ✔.

### `packages/coding-agent/CHANGELOG.md` — **tài liệu SAI**
Tài liệu: *"`## [Unreleased]` có mặt và hiện đang rỗng, nằm ngay trên `## [18.3.3] - 2026-09-27`"*.
Thật ở `65cc6c1`: `## [Unreleased]` ở `:3`, **KHÔNG rỗng** — có `### Security` với một mục ở `:7`
(về project-scope MCP config), và nó nằm trên `## [18.4.0] - 2026-09-28` ở `:9`, không phải `18.3.3`.
Đã kiểm tại `808b365`: `## [Unreleased]` **rồng** và `## [18.3.3]` ở `:5` — tài liệu đúng cho cây cũ.
Hệ quả: **không có mục `### Fixed` nào dưới `[Unreleased]` ở `65cc6c1`** — phải tạo mới.

### Neo khác
| mục | tài liệu | thật | kết quả |
| --- | --- | --- | --- |
| `packages/tui/src/tui.ts` dài 3633, zero header/footer | 3633 | 3633 | ✅ |
| `components/wizard-step.ts` | `:132` | `:132` `setFooter(footer: Component \| undefined): void;` | ✅ |
| `prompt/composer.ts` | `:822` | **`:823`** | +1 (tài liệu tự đã ghi "dòng thật là 823") |
| `packages/tui/src/chat/extension-types.ts` | `:5` | `:5` `export type ExtensionUiComponent = Component & { dispose?(): void };` | ✅ |
| `loader.ts` `discoverAndLoadExtensions` | `:668-677` | `:668`, file 677 dòng | ✅ |
| `unloadExtension` trong `src` | không có | `grep -rn` → **0 dòng** | ✅ xác nhận |
| `setHookStatus` | `:591-592` | ✅ | ✅ |
| `runner.ts` có cạnh import vào `modes/`? | không | `grep 'modes/'` → 0 | ✅ |
| 4 site import barrel | đều | `extension-ui-controller.ts:24`, `acp-agent.ts:54`, `agent-session.ts:158-159`; **`runner.ts` thì KHÔNG** (nó là nguồn barrel) | ❌ sửa mục 3 |
| "chỉ 1 file test dựng controller" | đúng | **SAI** — `new ExtensionUiController` ở **10 chỗ / 6 file test khác**: `btw-session-lifecycle.test.ts:283`, `hook-editor.test.ts:451,481,523,559,584`, `repro-issue-1955-sendmessage-double-render.test.ts:164`, `repro-issue-1020-ctx-shutdown.test.ts:75`, `collab/guest-ui-request.test.ts:840` | ❌ (file chuẩn vẫn đúng chỗ để viết) |

### Cổng grep — đo thật tại `65cc6c1`
```
extension-ui-controller.ts:157, :158
acp-agent.ts:581, :582
runner.ts:428, :429
agent-session.ts:558, :559
```
**8 dòng = 4 site.** Tài liệu đúng về số, sai về vị trí.
