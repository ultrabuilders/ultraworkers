# WI-19 — Context của extension tự vô hiệu hoá sau unload (GAP-M2-9)

**Kế hoạch:** `MILESTONE_2_EXECUTION_PLAN.md`, mục `## WI-19` (dòng 3889)
**HEAD đã đối chiếu:** `65cc6c1` (nhánh `milestone-1`)
**Ngày đối chiếu:** 2026-09-29
**Trạng thái:** phụ thuộc cứng WI-9 chưa tồn tại. `unloadExtension` = 0 hit. **Chưa thể gõ PR này độc lập.**

---

## 1. Cái gì thay đổi, quan sát được

Sau khi một extension bị unload, `ctx` cũ của nó **ném ra một lỗi có tên** (`ExtensionContextDisposed`) ở **mọi** method thay vì âm thầm đọc `#field` của runner — kể cả getter `model` — và vì thế một extension đã bị gỡ không thể điều khiển session, không thể điều khiển nhầm **runner mới** đã thay thế nó.

Không có gì thay đổi với người dùng khi hành vi đúng. Hành vi sai hôm nay là **im lặng**: extension đã xoá vẫn điều khiển session, hoặc tệ hơn, điều khiển runner của extension mới.

---

## 2. Bảng điểm sửa

| đường/dẫn | symbol | TRƯỚC (nguyên văn từ file thật) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1281` | `getModel` (local của `createContext`) | `const getModel = model ? () => model : this.#getModel;` | Giữ nguyên. **Đây là bẫy:** khi `model` được truyền vào, `getModel` chụp lại `model` theo giá trị và **không** đụng `#getModel` — nên một guard chỉ đặt trên đường `#getModel` sẽ **không** bắt được `ctx.model` mà có `model` cố định. Guard phải nằm ở getter, không ở hàm. |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1286` | `getContextUsage` | `getContextUsage: () => this.#getContextUsageFn(),` | `getContextUsage: () => { guard(); return this.#getContextUsageFn(); },` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1287` | `compact` | `compact: instructionsOrOptions => this.#compactFn(instructionsOrOptions),` | `compact: instructionsOrOptions => { guard(); return this.#compactFn(instructionsOrOptions); },` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1288` | `getAsyncJobSnapshot` | `getAsyncJobSnapshot: () => this.#getAsyncJobSnapshotFn(),` | bọc guard |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1295-1297` | getter `model` | `get model() {`<br>`\treturn getModel();`<br>`},` | `get model() {`<br>`\tguard();`<br>`\treturn getModel();`<br>`},` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1299` | `isIdle` | `isIdle: () => this.#isIdleFn(),` | bọc guard |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1300` | `abort` | `abort: () => this.#abortFn(),` | bọc guard |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1301` | `hasPendingMessages` | `hasPendingMessages: () => this.#hasPendingMessagesFn(),` | bọc guard |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1302` | `shutdown` | `shutdown: () => this.#shutdownHandler(),` | bọc guard |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1303` | `getSystemPrompt` | `getSystemPrompt: () => this.#getSystemPromptFn(),` | bọc guard |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1304` | `runEphemeralTurn` | `runEphemeralTurn: runEphemeralTurn`<br>`\t? async options => {`<br>`\t\tif (this.#ephemeralTurnBlocker.getStore()) {` | thêm `guard()` làm dòng đầu tiên trong thân async |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1333-1335` | `setInterval` / `setTimeout` / `clearTimer` | `setInterval: (callback, ms, ...args) => this.#managedTimers.setInterval(callback, ms, ...args),` | bọc guard (3 dòng) |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1337-1348` | `invokeTool` | `invokeTool:`<br>`\tdelegation !== undefined && this.hasNativeTool(delegation.toolName)` | bọc guard bên trong nhánh arrow |
| **`packages/coding-agent/src/extensibility/extensions/runner.ts:1382`** | `createCommandContext` → `getContextUsage` | `getContextUsage: () => this.#getContextUsageFn(),` | **BẮT BUỘC bọc guard.** Dòng này **ghi đè** member đã được spread ở `:1381`. Đây là lỗ hổng thật, xem §6. |
| **`packages/coding-agent/src/extensibility/extensions/runner.ts:1389`** | `createCommandContext` → `compact` | `compact: instructionsOrOptions => this.#compactFn(instructionsOrOptions),` | **BẮT BUỘC bọc guard.** Ghi đè member đã spread. |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:488` | `#initialized` (tiền lệ) | `#initialized = false;` | thêm `#contextsDisposed = false;` ngay cạnh, theo đúng tiền lệ sẵn có |
| **`packages/coding-agent/src/extensibility/extensions/runner.ts:1293`** | `isProjectTrusted` | `isProjectTrusted: () => true,` | **GIỮ NGUYÊN.** Đây là hợp đồng âm (WI-20). |
| **`packages/coding-agent/src/session/agent-session.ts:7552`** | `isProjectTrusted` | `isProjectTrusted: () => true,` | **GIỮ NGUYÊN.** |
| `packages/coding-agent/test/extension-unload.test.ts` | — | **không tồn tại** | tạo (cùng PR WI-9) |

**KHÔNG sửa:** `types.ts:496` và `types.ts:563` (`isProjectTrusted(): boolean;`) và `types.ts:454-564` (`ExtensionContext`) — hợp đồng công khai, đã phát hành.

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

### Bước 0 — CỔNG CẨN. Xác nhận WI-9 đã xuống đất, ngay trong PR này.

```bash
grep -rn 'unloadExtension' packages/coding-agent/src --include='*.ts' | grep -v /test/
```

Trên `65cc6c1` lệnh này trả **0 hit** (đã chạy, exit 1). Nếu sau khi bạn viết xong nó vẫn 0 hit, bạn đã gõ sai việc. `unloadExtension` phải tồn tại **do chính PR này** tạo ra (WI-9), và nó là nơi gọi `markContextsDisposed()`.

*Neo đã kiểm:* `packages/coding-agent/src/extensibility/extensions/runner.ts:1355` (`shutdown(): void {`), `:1365` (`clearManagedTimers(): void {`), `:1375` (`disposeFileFallbacks(): void {`) — ba phương thức teardown sẵn có, là mẫu để đặt method mới cạnh.

### Bước 1 — Thêm cờ trạng thái trên runner

Thêm `#contextsDisposed = false;` ngay cạnh `#initialized = false;` tại `runner.ts:488`. Đây là **tiền lệ có sẵn** — runner đã dùng đúng kỹ thuật này cho `#initialized`, với guard ở `runner.ts:869` và `runner.ts:895`.

*Neo đã kiểm:* `runner.ts:488` — `#initialized = false;`; `runner.ts:869` — `if (!this.#initialized) {`; `runner.ts:895` — `if (!this.#initialized) {`.

### Bước 2 — Định nghĩa lỗi có tên

Đặt class lỗi ở `packages/coding-agent/src/extensibility/extensions/types.ts`, cạnh `ExtensionContext` (`types.ts:454`), và export nó. Tên: `ExtensionContextDisposedError`. **Bắt buộc** là class có tên vì lỗi vô danh ở đây trông y hệt bug của extension và bị điều tra sai chỗ — đây là lý do cổng (2) của plan nêu "không phải `TypeError` vô danh".

*Neo đã kiểm:* `types.ts:454` — `export interface ExtensionContext {`.

### Bước 3 — Bọc guard vào TỪNG method của `createContext()`

13 vị trí closure đã liệt kê ở §2 (`runner.ts:1286, 1287, 1288, 1299, 1300, 1301, 1302, 1303, 1304, 1333, 1334, 1335, 1337`) cộng getter `model` (`:1295`). **Không** gom thành một `Proxy` — `ExtensionContext` có getter `model` (`runner.ts:1295`) và các property thuần (`ui`, `mode`, `cwd`…), một `Proxy` sẽ thay đổi hình dạng quan sát được của object mà extension nhận.

Ba thành viên **không** cần guard và phải nói rõ là cố ý bỏ qua:
- `ui` / `mode` / `hasUI` / `cwd` / `sessionManager` / `modelRegistry` / `agent` (`runner.ts:1284-1294`) — **snapshot** lúc tạo, đọc `this.#field` một lần rồi giữ giá trị. Chúng không đọc `#field` tại thời điểm gọi nên không thể "đọc `#field` của runner đã bị tháo". Guard chúng sẽ là canh cửa không có cửa.
- `models` (`runner.ts:1298`) — `createExtensionModelQuery(...)` chụp `getModel` theo giá trị.
- `memory` (`runner.ts:1332`) — `this.#getMemoryFn?.()` đã gọi xong lúc tạo.

*Neo đã kiểm:* `runner.ts:1283-1349` — thân hàm `createContext()`, 26 thành viên.

### Bước 4 — Bọc guard vào HAI dòng ghi đè trong `createCommandContext()`

`runner.ts:1382` (`getContextUsage`) và `runner.ts:1389` (`compact`) **ghi đè** member đã được spread ở `runner.ts:1381`. Bỏ qua hai dòng này thì `ctx` của extension command vẫn sống sau unload — và test sẽ xanh. Xem §6.

*Neo đã kiểm:* `runner.ts:1379-1391` — thân `createCommandContext()`.

### Bước 5 — `unloadExtension` chuyển state sang `disposed`

`unloadExtension` (tạo ở WI-9) gọi `this.#contextsDisposed = true;` **một lần** khi extension thực sự bị tháo.

Đây là cờ **toàn runner**, không phải per-extension: khi runner được thay thế, runner cũ đi kèm. Cờ per-extension sẽ yêu cầu mỗi context mang id của mình và tra cứu registry — phức tạp hơn, và bản thân việc tra cứu đó là một đường đọc trạng thái mà unload có thể đã phá.

*Neo đã kiểm:* `runner.ts:1355`, `:1365`, `:1375` — ba phương thức teardown sẵn có để đặt cạnh.

### Bước 6 — GIỮ `isProjectTrusted()` trả `true` ở CẢ HAI call site

```bash
grep -n 'isProjectTrusted' packages/coding-agent/src/extensibility/extensions/runner.ts \
  packages/coding-agent/src/session/agent-session.ts
```

Kết quả đã đo trên `65cc6c1`: `runner.ts:1293` và `agent-session.ts:7552`. Cả hai phải giữ `() => true`. **Không** nối trust thật vào đây — đó là WI-20, riêng, effort L, ngoài M2.

*Neo đã kiểm:* `runner.ts:1293` — `isProjectTrusted: () => true,`; `agent-session.ts:7552` — `isProjectTrusted: () => true,`.

### Bước 7 — Ship CÙNG PR với WI-9

Một PR tháo extension mà để lại context sống là một PR **tạo lỗi mới trong lúc đang đóng lỗi cũ**. Tách thành PR riêng đi sau là cách chắc chắn nhất để nó không bao giờ được làm.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/extension-unload.test.ts` — **tạo mới**, cùng PR với WI-9. Đã xác nhận file này **không tồn tại** trên `65cc6c1`.

**Bốn case:**

1. **`ctx` cũ ném lỗi có tên sau dispose.** Gọi `ctx.abort()` sau khi `unloadExtension` trả `true` → `expect(() => ctx.abort()).toThrow(ExtensionContextDisposedError)`. Không được là `TypeError`.

2. **Getter `model` đi qua cùng một kiểm tra.** `expect(() => ctx.model).toThrow(...)`. Case này bắt đúng lỗi ở `runner.ts:1281` — `createContext(model)` chụp `model` theo giá trị, nên guard đặt sai chỗ sẽ xanh ở case 1 và **đỏ** ở case 2.

3. **Không điều khiển nhầm runner mới.** Dựng runner A, lấy `ctx` của nó, `unloadExtension`, dựng runner B thay thế, rồi gọi `ctx.cwd`/`ctx.abort()` cũ → phải ném. Đây là case **phân biệt** — một implementation chỉ so sánh `this.#generation` chạy đúng khi không có runner mới.

4. **Hợp đồng âm: `isProjectTrusted()` vẫn trả `true`.** Hai test này **đã tồn tại và đang xanh** trên `65cc6c1` (đã chạy: `3 pass / 0 fail`):
   - `packages/coding-agent/test/extension-context-project-trust.test.ts:14` — `expect(runner.createContext().isProjectTrusted()).toBe(true);`
   - `packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts:19` — `expect(ctx.isProjectTrusted()).toBe(true);`
   - `packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts:24` — `expect(ctx.isProjectTrusted()).toBe(true);` (command context)

   Chúng phải **tiếp tục xanh**. Đỏ = đã vô tình biến mục này thành WI-20.

**Người dùng thấy gì nếu hồi quy:** một extension đã bị gỡ vẫn điều khiển được session; tệ hơn, nó điều khiển **runner mới** — hai extension cùng tên bắt đầu điều khiển lẳng nhau, không có dấu vết nào cho biết vì sao. Hôm nay hành vi này **im lặng**, nên hồi quy cũng im lặng.

---

## 5. Cổng

### Cổng (1) — TYPE

```bash
bun run check:ts
```

**ĐỎ ĐƯỢC KHÔNG? Có.** Đã chạy trên `65cc6c1`: **exit 0**. Nó đỏ khi thêm `ExtensionContextDisposedError` mà không cập nhật chữ ký, hoặc khi bỏ sót member nào gây lỗi kiểu. Nhưng nó **không** bắt được lỗi logic — xem cổng (2).

### Cổng (2) — HÀNH VI

```bash
bun test packages/coding-agent/test/extension-unload.test.ts
```

**ĐỎ ĐƯỢC KHÔNG? Có, và đây là cổng thật.** Bốn case ở §4. Đỏ trước khi sửa — bắt buộc quan sát đỏ **trên HEAD, trước khi viết dòng đầu tiên**, rồi xanh sau.

**Sửa lại cổng của plan:** plan ghi *"sau dispose, gọi lại bất kỳ method nào của `ctx` cũ ném lỗi có tên"* — "bất kỳ method nào" không kiểm được như một câu lệnh, và người ta sẽ pass bằng cách chọn một method dễ. Cổng phải là **danh sách đóng 13 method + getter `model`** (đúng 13 dòng ở Bước 3, cộng `runner.ts:1382` và `:1389` của `createCommandContext`), mỗi cái một dòng, không dòng nào được bỏ trống.

### Cổng (3) — KHÔNG ĐIỀU KHIỂN NHẦM RUNNER MỚI

Case 3 ở §4. **ĐỎ ĐƯỢC KHÔNG? Có** — nhưng chỉ khi case viết đúng: phải dựng **hai runner**. Nếu chỉ dựng một runner rồi dispose, một implementation so sánh `this.#generation` sẽ xanh. Đây là cổng nói "một kiểm tra state chỉ ở một nửa danh sách method sẽ xanh mà không bắt được nó" — và nửa kia ở đây cụ thể là `createCommandContext`.

### Cổng (4) — HỢP ĐỒNG ÂM

```bash
bun test packages/coding-agent/test/extension-context-project-trust.test.ts \
          packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts
grep -n 'isProjectTrusted' packages/coding-agent/src/extensibility/extensions/runner.ts \
                        packages/coding-agent/src/session/agent-session.ts
```

**ĐỎ ĐƯỢC KHÔNG? Có.** Ba assert `toBe(true)` đỏ nếu ai đó nối trust thật vào; grep đỏ nếu một call site biến mất. Đã xác nhận cả ba assert **xanh trên HEAD** — nên chúng là hợp đồng âm thật, không phải trang giấy.

### Về `bun test` và native addon

Plan (§ "Xác minh") nói `bun test` chết ở bước import với `"Failed to load pi_natives native addon"`. **Đã kiểm: addon ĐÃ CÓ** — `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại, và `bun test` chạy được (3 pass, 0 fail, 239ms). Câu đó của plan **stale** trên máy này. Không cần `bun --cwd=packages/natives run build` trước khi chạy cổng. Nếu máy kỹ sư thiếu addon thì đây là lỗi môi trường, không phải lỗi mục này.

### Trung thực về độ mạnh của cổng

`check:ts` là typecheck + oxlint, **không** kiểm bất kỳ hành vi runtime nào. Nếu kỹ sư chỉ chạy cổng (1) và báo xong, cổng (2)(3)(4) đều chưa từng chạy. Cổng (1) **không thay được** ba cổng còn lại.

---

## 6. Cạm bẫy riêng của work item này

### Cạm bẫy 1 — `createCommandContext()` ghi đè sau spread, làm lỗi trở nên vô hình

`runner.ts:1381` là `...this.createContext()`, và `runner.ts:1382` / `runner.ts:1389` **ghi đè** hai member vừa được spread. Đã kiểm chứng bằng probe: object spread **không** mang theo getter, và một member bị ghi đè sau spread **hoàn toàn bỏ qua** guard của đối tượng gốc.

Hệ quả: sửa đủ 13 closure trong `createContext()` và test vẫn xanh, vì `ctx` của **extension command** vẫn gọi thẳng `this.#compactFn(...)`. Extension command là đường thật — `input-controller.ts:2538` và `agent-session.ts:7524` đều lấy `createCommandContext()`.

Đây là biến thể cụ thể, chính xác nhất, của cảnh báo "kiểm tra state chỉ ở một nửa danh sách method sẽ xanh mà không bắt được nó" mà plan cảnh báo chung.

### Cạm bẫy 2 — `get model` không đi qua `#getModel` khi có `model` truyền vào

`runner.ts:1281`: `const getModel = model ? () => model : this.#getModel;`

Nhánh đúng **chụp giá trị `model`**, không đụng `#getModel` cả đời. Nếu chỉ đặt guard bên trong `#getModel`, `ctx.model` của một context có model cố định sẽ **không bao giờ** ném. Guard phải nằm ở **getter** (`runner.ts:1295`), và case 2 ở §4 phải dùng đúng context đó.

Đây chính là câu hỏi "getter `model` có ném hay không" mà plan đẩy cho người quyết — câu trả lời bắt buộc là **có**, vì nếu không thì `ctx.model` là đường đọc trạng thái sống còn sót lại.

### Cạm bẫy 3 — `agent-session.ts:7552` không phải call site thứ hai cùng loại

Plan nói "call site thứ hai — không phải một", và đúng là có hai dòng `isProjectTrusted: () => true`. Nhưng chúng **không cùng loại**:

`agent-session.ts:7552` nằm trong `#createCommandContext()`, sau một guard tại `agent-session.ts:7541` (`if (this.#extensionRunner) { return this.#extensionRunner.createCommandContext(); }`). Nó là **nhánh fallback dựng tay** cho session không có extension runner — và chính comment tại `agent-session.ts:7553-7554` nói: *"Used only when the session has no extension runner. `createAgentSession` always builds one (carrying the real identity), so only hand-constructed sessions land here."*

Hệ quả cho gate: dòng này **không** đi qua `createContext()` nên **không** được hưởng guard. Nhưng nó cũng **không cần** guard — nó không đọc `#field` của runner, và nó được dựng lại mỗi lần gọi chứ không phải context sống. Việc đúng ở đây là **giữ nguyên hình dạng**, đúng như plan nói — nhưng lý do phải nói đúng, không phải vì "nó là call site thứ hai của cùng một cơ chế".

Còn một điểm nữa cần biết: `agent-session.ts:7641-7644` làm `{...baseCtx, hasQueuedMessages: baseCtx.hasPendingMessages} as unknown as CustomCommandContext`. Một lần spread nữa, cho custom command. Cùng nguy cơ.

### Cạm bẫy 4 — `isProjectTrusted` xuất hiện hai lần trong `types.ts`, và một lần đã phát hành

`types.ts:496` và `types.ts:563` đều khai `isProjectTrusted(): boolean;` — trong cùng một `ExtensionContext` (bắt đầu `types.ts:454`, kết thúc `types.ts:564`), với hai doc comment dài khác nhau. `:496` nằm trong interface, `:563` là bản lặp gần cuối interface. `ExtensionCommandContext` (`types.ts:574`) `extends` chứ không khai lại.

Và `packages/coding-agent/CHANGELOG.md:1117` — mục **ĐÃ PHÁT HÀNH** dưới `## [18.1.16] - 2026-09-09` — nói nguyên văn: *"the extension context now exposes it (always `true`, since OMP applies no project-trust gating)"*.

Đổi hành ở đây mà không có changelog entry làm bản ghi đã phát hành trông như bị đảo ngược. Đây là lý do WI-20 là effort L chứ không phải M, dù phần code có vẻ nhỏ.

### Cạm bẫy 5 — `AGENTS.md` cấm source-grep trong test

Không được viết test kiểu `expect(src).toContain("guard")`. Test phải **gọi** `ctx.abort()` và kiểm tra lỗi. Tương tự: đừng khẳng định "13 method đều có guard" bằng cách đếm dòng trong file.

---

## 7. Đính chính so với plan

| claim trong plan | verdict | correction |
| --- | --- | --- |
| `createContext()` ở `runner.ts:1271` | **ĐÚNG** | Xác nhận `runner.ts:1271` = `createContext(`. Thân hàm dài tới `:1350`. |
| `isProjectTrusted` ở `runner.ts:1293` | **ĐÚNG** | Xác nhận `runner.ts:1293` = `isProjectTrusted: () => true,`. |
| `isProjectTrusted` ở `agent-session.ts:7552` | **ĐÚNG** | Xác nhận `agent-session.ts:7552` = `isProjectTrusted: () => true,`. |
| Bảng "Đính chính" của WI-19 nói WI-0 ghi neo `runner.ts:1264` / `agent-session.ts:7406`, và gọi neo của sổ là STALE | **NGƯỢC LẠI — cả hai đều sai** | Trên `65cc6c1`: `runner.ts:1264` là dòng JSDoc `"names an existing native built-in, the context carries an invokeTool that runs it (see"`, và `agent-session.ts:7406` là `"// Auto thinking: classify this real user turn and set the effective level"`. Cả hai **không liên quan gì** tới `isProjectTrusted`. Neo của sổ (`:1293`, `:7552`) mới đúng. **Không** dùng `:1264`/`:7406`. |
| Plan §"Xác minh": `bun test` chết vì thiếu native addon | **STALE trên máy này** | `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại; `bun test` chạy được (3 pass / 0 fail / 239ms). Cổng hành vi dùng được ngay. |
| Plan: `test/extension-unload.test.ts` là "file test của WI-9" | **ĐÚNG, và chưa tồn tại** | Xác nhận không tồn tại. Vị trí đúng: `packages/coding-agent/test/`, không phải `test/`. |
| Plan: cổng (2) "gọi lại **bất kỳ** method nào" | **KHÔNG KIỂM ĐƯỢC** | Xem §5 — phải là danh sách đóng 13 method + getter `model`. |
| Plan: cần người quyết "getter `model` có ném không" | **TRẢ LỜI ĐƯỢC TỪ CÂY** | Phải **có** — vì `runner.ts:1281` chụp `model` theo giá trị, nên getter là đường đọc trạng thái sống cuối cùng không bị chặn. Xem Cạm bẫy 2. |
| Plan: WI-20 cites `CHANGELOG.md:1057` | **LỆCH 60 DÒNG** | `:1057` là mục `compat.stripImageInput` (#11697). Mục `isProjectTrusted` thật ở **`:1117`**, dưới `## [18.1.16] - 2026-09-09` — **đã phát hành**. |
| Plan: "không có `invalidated` / `disposed` discriminator nào trên context" | **ĐÚNG** | `grep -n 'invalidat\|DisposedContext\|disposed'` trên `types.ts` → 0 hit. Trên `runner.ts` chỉ có 2 hit, cả hai trong comment (`runner.ts:1363`, `:1376`). |
| Plan: "context đã dispose **ném** lỗi" ở mọi method | **CẦN LÀM RÕ** | 9 thành viên là **snapshot** lúc tạo (`ui`, `mode`, `hasUI`, `cwd`, `sessionManager`, `modelRegistry`, `agent`, `models`, `memory`) — chúng không thể ném vì không còn đọc `#field`. Xem Bước 3. |
| Không có trong plan: `createCommandContext()` ghi đè sau spread | **THIẾU — lỗ hổng thật** | `runner.ts:1382` và `:1389` ghi đè member đã spread ở `:1381`. Không sửa hai dòng này thì lỗi sống và test xanh. Xem Cạm bẫy 1. |
| Phụ thuộc cứng WI-9 | **ĐÚNG, đã đo lại** | `grep -rn 'unloadExtension' packages/coding-agent/src --include='*.ts' \| grep -v /test/` → **0 hit** trên `65cc6c1`. |

---

## 8. Lệnh đã chạy

```bash
# Xác minh neo
grep -n 'createContext\|isProjectTrusted' packages/coding-agent/src/extensibility/extensions/runner.ts
# → 1271: createContext(   |   1293: isProjectTrusted: () => true,
grep -n 'createContext\|isProjectTrusted' packages/coding-agent/src/session/agent-session.ts
# → 7552: isProjectTrusted: () => true,

# Phụ thuộc cứng
grep -rn 'unloadExtension' packages/coding-agent/src --include='*.ts' | grep -v /test/
# → (0 hit, exit 1)

# Hai neo SAI mà bảng "Đính chính" của plan khuyên dùng
sed -n '1264p' packages/coding-agent/src/extensibility/extensions/runner.ts
# → "	 * names an existing native built-in, the context carries an `invokeTool` that runs it (see"
sed -n '7406p' packages/coding-agent/src/session/agent-session.ts
# → "			// Auto thinking: classify this real user turn and set the effective level"

# Gate
bun run check:ts                                    # → exit 0
bun test packages/coding-agent/test/extension-context-project-trust.test.ts \
          packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts
# → 3 pass, 0 fail, 239ms
ls packages/coding-agent/test/extension-unload.test.ts   # → No such file
ls packages/natives/native/pi_natives.darwin-arm64.node # → tồn tại (addon ĐÃ build)
```

**Cây tham chiếu:** grep `unloadExtension|invalidateContext|disposedContext` trên `pi-ref`, `deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref`, `senpi-ref` → **0 hit trên tất cả**. Không có tiền lệ để sao chép; phải thiết kế.

---

## 9. Cần người quyết (chặn bước 2)

Ba câu hỏi của plan vẫn còn, nhưng câu thứ hai **đã trả lời được** từ cây (xem §7 và Cạm bẫy 2). Còn lại:

1. **Hình dạng lỗi** — class riêng (`ExtensionContextDisposedError`) hay mã chẩn đoán? Đề xuất: class riêng, extends `Error`, `name` đặt tên. Chặn bước 2.
2. ~~Getter `model` có ném không?~~ → **CÓ**, chốt từ `runner.ts:1281`.
3. **`revalidate`/`refresh` sau dispose, hay chết vĩnh viễn?** Cần chốt trước khi thiết kế `#state`. Đề xuất: chết vĩnh viễn, một chiều — vì `revalidate` sẽ mở lại đúng cái lỗ mà cổng (3) đang đóng.
4. **`isProjectTrusted()` có ném sau dispose không?** — câu này plan **không hỏi**, và đó là khoảng trống. Nó là closure thuần, `() => true`, không đọc `#field` nào, nên theo Bước 3 nó không cần guard. Nhưng nó cũng là **surface công khai đã phát hành** (`CHANGELOG.md:1117`: *"always `true`"*). Hai lựa chọn, cả hai đều hợp lý: (a) không guard — giữ đúng lời hứa đã phát hành, và một extension đang teardown vẫn hỏi được nó; (b) guard — vì nó là context đã chết và nên nói thẳng. **Đề xuất (a)**, và nếu chọn (b) thì phải có changelog entry vì nó lật một mục đã phát hành. Cần người quyết trước khi viết Bước 3.
