# PHIẾU TRIỂN KHAI — WI-9. `ExtensionRunner.unloadExtension()`

**Kế hoạch:** `MILESTONE_2_EXECUTION_PLAN.md:3566-3569`
**HEAD đã kiểm:** `65cc6c1` (plan tự ghi neo của nó ở HEAD `808b365` — đã trượt)
**Ngày kiểm:** 2026-09-29
**Kết luận kiểm neo:** 53 neo đã mở và đọc. **17 đúng nguyên vẹn, 36 phải sửa** (trong đó 3 đúng nội dung nhưng lệch phạm vi dòng). Chi tiết ở §7.
**Cổng có thể đỏ ngay hôm nay:** CÓ — cả hai. Plan nói `bun test` bị chặn vì thiếu native addon là **stale**; addon đã build sẵn trên máy này.

---

## 1. Cái gì thay đổi, quan sát được

Sau khi `runner.unloadExtension("/abs/path/to/ext.ts")` trả `true`, extension đó biến mất khỏi runner theo **mọi** mặt đo được: nó vắng trong `getLoadedExtensions()` và `isExtensionActive()`, cả 11 bucket đăng ký của nó đều rỗng, trampoline `file-write`/`file-delete` mà nó cài vào registry toàn-tiến-trình đã được rút (nên `hasFileWriteFallback()` trở lại `false` nếu không còn ai đăng ký), và `flagValues` của nó biến mất khỏi map — trong khi mọi extension **khác** vẫn chạy nguyên trạng, gọi `unloadExtension` với một path lạ trả `false` chứ không ném.

Ngày hôm nay "disable" chỉ là `setSuspendedExtensions` (`runner.ts:976`) — module state, 11 bucket và trampoline đều được giữ nguyên có chủ đích. `unloadExtension` là đường teardown thật, khác hẳn.

---

## 2. Bảng điểm sửa

Mọi trích dưới đây lấy từ file đã mở ở HEAD `65cc6c1`, không viết lại từ trí nhớ.

### 2.1 `packages/coding-agent/src/extensibility/extensions/runner.ts`

| dòng thật | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| **541** | `#fileFallbackDisposers` | `#fileFallbackDisposers: Array<() => void> = [];` | `#fileFallbackDisposers = new Map<string, Array<() => void>>();` |
| **781-797** | push site, write seam | `if (ext.fileWriteFallbackHandlers.length > 0) {`<br>`    this.#fileFallbackDisposers.push(`<br>`        `addFileWriteFallback(async req => {` | `const bucket = this.#fileFallbackDisposers.get(ext.path) ?? [];`<br>`bucket.push(addFileWriteFallback(async req => { /* closure giữ nguyên */ }));`<br>`this.#fileFallbackDisposers.set(ext.path, bucket);` |
| **800-818** | push site, delete seam | `if (ext.fileDeleteFallbackHandlers.length > 0) {`<br>`    this.#fileFallbackDisposers.push(`<br>`        `addFileDeleteFallback(async req => {` | tương tự, vào bucket của `ext.path` |
| **1375-1377** | `disposeFileFallbacks()` | `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();` | LIFO + chứa lỗi:<br>`const all = [...this.#fileFallbackDisposers.values()].flat();`<br>`this.#fileFallbackDisposers.clear();`<br>`for (const dispose of all.reverse()) {`<br>`  try { dispose(); } catch (error) { logger.warn(...); }`<br>`}` |
| **999→1001** | **MỚI** `unloadExtension` | (không có) | xem §3 bước 7 |
| **1123-1125** | `getFlagValues()` | `return new Map(this.runtime.flagValues);` | flatten theo `this.extensions` (đọc mặt, last-writer-wins), xem §3 bước 5 |
| **1127-1129** | `setFlagValue(name, value)` | `this.runtime.flagValues.set(name, value);` | **để ngỏ** — chờ quyết định §6 |

### 2.2 `packages/coding-agent/src/extensibility/extensions/loader.ts`

| dòng thật | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| **101** | `ExtensionRuntime.flagValues` | `flagValues = new Map<string, boolean \| string>();` | `flagValues = new Map<string, Map<string, boolean \| string>>();` |
| **184** | `ConcreteExtensionAPI.flagValues` | `readonly flagValues = new Map<string, boolean \| string>();` | **xoá hẳn** (chết — xem bằng chứng ở bước 2) |
| **263-266** | `registerFlag` | `this.extension.flags.set(name, { name, extensionPath: this.extension.path, ...options });`<br>`if (options.default !== undefined) {`<br>`    this.runtime.flagValues.set(name, options.default);`<br>`}` | giữ guard ở 264 nguyên vẹn; 265 thành get-or-create map trong dưới `this.extension.path` |
| **293** | `getFlag` | `return this.runtime.flagValues.get(name);` | `return this.runtime.flagValues.get(this.extension.path)?.get(name);` (giữ nguyên gate ở **292**: `if (!this.extension.flags.has(name)) return undefined;`) |

### 2.3 `packages/coding-agent/src/extensibility/extensions/types.ts`

| dòng thật | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| **1764** | `ExtensionRuntimeState.flagValues` | `flagValues: Map<string, boolean \| string>;` | `flagValues: Map<string, Map<string, boolean \| string>>;` |
| **1827-1842** | `interface Extension` — **11 bucket** | `handlers` 1831, `tools` 1832, `toolRegistrationListeners?` 1833, `assistantThinkingRenderers` 1834, `fileWriteFallbackHandlers` 1835, `fileDeleteFallbackHandlers` 1836, `messageRenderers` 1837, `composerShapes` 1838, `commands` 1839, `flags` 1840, `shortcuts` 1841 | **KHÔNG đổi.** Chúng đã là per-extension sẵn. Đếm đủ 11 — khớp `code_shape` của plan. |

### 2.4 `packages/coding-agent/src/main.ts`

| dòng thật | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| **2222-2224** | `extensionFlagSink.setFlagValue` | `setFlagValue: (name, value) => {`<br>`    extensionsResult.runtime.flagValues.set(name, value);`<br>`},` | phải đi qua runner (xem §6 câu hỏi 1). **Đây là writer phẳng thứ 3 và là writer duy nhất bỏ qua runner.** |
| **551-553** | passthrough thứ hai | `setFlagValue: (name, value) => {`<br>`    runner.setFlagValue(name, value);`<br>`},` | **KHÔNG cần sửa.** Plan gọi đây là "writer thứ tư phải di" — sai. Nó chỉ gọi `runner.setFlagValue(name, value)` mà chữ ký không đổi, nên nó typecheck xanh nguyên vẹn. |

### 2.5 File mới

`packages/coding-agent/test/extension-unload.test.ts` — 15 dòng, xem §4.

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

Mọi neo dưới đây tôi đã `sed -n "<n>p"` mở và đọc. Số là **số thật ở HEAD `65cc6c1`**, không phải số của plan.

---

**Bước 1 — Đổi hình dạng `flagValues` thành per-extension (2 chỗ khai báo).**

- `types.ts:1763` → `export interface ExtensionRuntimeState {`
- `types.ts:1764` → `flagValues: Map<string, boolean | string>;`
- `loader.ts:101` → `flagValues = new Map<string, boolean | string>();`

Sau: `Map<string, Map<string, boolean | string>>`, khoá ngoài là `ext.path`.

**Vì sao KHÔNG lấy `unregisterProvider` làm tiền lệ** — neo `types.ts:1770`:
`unregisterProvider(name: string, sourceId: string): void;`
Chữ ký có `sourceId`, nhưng **hiện thực bỏ nó**. Chuỗi bỏ mất sourceId đã mở và đọc:
- `loader.ts:366-367` — `unregisterProvider(name: string): void { this.runtime.unregisterProvider(name, this.extension.path); }` → **sourceId ĐƯỢC truyền đúng ở đây.**
- `loader.ts:108-111` — `unregisterProvider(name: string): void { const remaining = this.pendingProviderRegistrations.filter(registration => registration.name !== name); ... }` → **chết ngay khung hình sau đó, chỉ lọc theo tên.**
- `runner.ts:717-719` — `this.runtime.unregisterProvider = name => { this.modelRegistry.unregisterProvider(name); };` → rebind sau `initialize()`, `sourceId` biến mất hoàn toàn.

Plan đúng khi gọi đây là `WRONG PREMISE`. Plan **thiếu một mắt xích**: `loader.ts:366-367` cho thấy plumbing theo extension path **đã tồn tại** ở biên API, nó chỉ chết ở `ExtensionRuntime`. Nghĩa là fix không cần thiết kế mới từ đầu — chỉ cần hiện thực `ExtensionRuntime.unregisterProvider(name, sourceId)` tôn trọng tham số thứ hai.

**Bước 2 — Xoá `ConcreteExtensionAPI.flagValues` chết.**

- `loader.ts:179` → `class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime {`
- `loader.ts:184` → `readonly flagValues = new Map<string, boolean | string>();`

Bằng chứng nó chết (chạy trên toàn package):
```
$ grep -rn "flagValues" packages/coding-agent/src --include='*.ts'
main.ts:2223                          extensionsResult.runtime.flagValues.set(...)
runner.ts:1124                        return new Map(this.runtime.flagValues);
runner.ts:1128                        this.runtime.flagValues.set(...)
types.ts:1764                         flagValues: Map<...>;
loader.ts:101                         flagValues = new Map<...>;          ← ExtensionRuntime
loader.ts:184                         readonly flagValues = new Map<...>; ← CHẾT
loader.ts:265                         this.runtime.flagValues.set(...)
loader.ts:293                         return this.runtime.flagValues.get(name);
```
Không dòng nào chạm `this.flagValues` (bản `ConcreteExtensionAPI`) — mọi đường đi qua `this.runtime`. Xoá nó là điều khiến bước 1 thành **một** đổi hình dạng thật, không phải hai map song song.

⚠️ `IExtensionRuntime` (`types.ts:1821`) **extends** `ExtensionRuntimeState`, nên nó *yêu cầu* `flagValues`. Xoá field ở phía implement sẽ **làm hỏng typecheck** — phải xoá `IExtensionRuntime` khỏi clause `implements` ở `loader.ts:179` cùng lúc. Đây chính là chỗ "Cần người xác nhận" #2 của plan đọc ngược; bản đọc đúng là **xoá vô điều kiện + sửa clause `implements`**, không phải "nếu interface vẫn yêu cầu thì xoá".

**Bước 3 — `registerFlag` ghi vào map trong.**

- `loader.ts:263` → `this.extension.flags.set(name, { name, extensionPath: this.extension.path, ...options });`
- `loader.ts:264` → `if (options.default !== undefined) {`  ← **giữ nguyên vẹn**
- `loader.ts:265` → `this.runtime.flagValues.set(name, options.default);`

Chỉ 265 đổi thành get-or-create map trong dưới `this.extension.path`. Một flag không có `default` vẫn **không** tạo entry trong map trong — giữ nguyên, vì nếu không thì `getFlagValues()` sẽ trả về entry trống cho mọi flag không default.

**Bước 4 — `getFlag` đọc map trong, gate giữ nguyên.**

- `loader.ts:292` → `if (!this.extension.flags.has(name)) return undefined;`  ← **giữ nguyên vẹn**
- `loader.ts:293` → `return this.runtime.flagValues.get(name);`

Chỉ 293 thành `this.runtime.flagValues.get(this.extension.path)?.get(name)`. Gate ở 292 vốn **đã là per-extension** — nó là thứ chặn hai extension cùng tên flag đọc lẩn nhau, và nó không cần sửa.

**Bước 5 — `getFlagValues()` flatten theo `this.extensions`.**

- `runner.ts:1123` → `getFlagValues(): Map<string, boolean | string> {`
- `runner.ts:1124` → `return new Map(this.runtime.flagValues);`
- `runner.ts:1119-1121` là `getFlags()` → `return ExtensionRunner.aggregateFlags(this.extensions);` — **dùng làm mẫu**: nó đã làm đúng việc "gộp theo `this.extensions`, extension khai báo sau thắng" mà bạn đang viết lại cho map value.

Sau:
```typescript
getFlagValues(): Map<string, boolean | string> {
    const flattened = new Map<string, boolean | string>();
    for (const ext of this.extensions) {
        for (const [name, value] of this.runtime.flagValues.get(ext.path) ?? []) {
            flattened.set(name, value);
        }
    }
    return flattened;
}
```
Sở hữu chính xác; thứ tự ưu tiên chỉ là chuyện của **mặt đọc**.

Bằng chứng đây là đổi hình dạng **miễn phí về call site**:
```
$ grep -rn "getFlagValues" packages/ --include='*.ts' | grep -v node_modules
packages/coding-agent/src/extensibility/extensions/runner.ts:1123:  getFlagValues(): Map<string, boolean | string> {
```
**Đúng một dòng — chính khai báo.** Không caller nào. Câu hỏi mở #2 của plan: **đã đóng, câu trả lời là không.**

**Bước 6 — `disposeFileFallbacks()` drain mọi bucket, LIFO, chứa lỗi.**

- `runner.ts:1375` → `disposeFileFallbacks(): void {`
- `runner.ts:1376` → `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();`

Hai call site phải hành xử **y hệt** hôm nay:
- `runner.ts:414` → `extensionRunner.disposeFileFallbacks();` (trong `finally` của `emitSessionShutdownEvent`, `runner.ts:405-417`)
- `runner.ts:751` → `this.disposeFileFallbacks();` (guard re-`initialize()`, ngay trước vòng `for (const ext of this.getLoadedExtensions())` ở 753)

⚠️ **Bẫy FIFO đã có sẵn.** 1376 là FIFO không try/catch trên registry toàn-tiến-trình: **một disposer ném làm mồ côi mọi fallback còn lại.** Đây không phải yêu cầu của WI-9 — nó là lỗi có sẵn mà bước 6 đi ngang qua. Sửa nó ở đây **tốn 2 dòng** (`all.reverse()` + `try/catch`), và không sửa thì `unloadExtension` thừa hưởng đúng lỗi đó.

Tham chiếu thứ tự (Cordis, đã mở và đọc):
- `deepseek-harness/vendor/cordis/src/utils.ts:27-31` → `clear() { const values = [...this.map.values()]; this.map.clear(); return values.reverse(); }` → **LIFO**.
- `deepseek-harness/vendor/cordis/src/fiber.ts:120` → `/** Notify plugin teardown without allowing one observer to break ownership cleanup. */` `function emitPluginDisposed(...)` → **chứa lỗi theo observer**.

⚠️ Khi `catch`, dùng `logger.warn` (`@oh-my-pi/pi-utils`) — **không** `console.*`. Runner chạy trong TUI/RPC/SDK/worker, `AGENTS.md` cấm.

**Bước 7 — `unloadExtension(extensionPath: string): boolean`.**

Chèn **ngay sau dòng 999** (dấu `}` đóng `setSuspendedExtensions`; method bắt đầu ở 976, doc comment 970-975).

Thứ tự trong thân hàm có ý nghĩa:
```typescript
unloadExtension(extensionPath: string): boolean {
    const liveIndex = this.extensions.findIndex(ext => ext.path === extensionPath);
    const orderIndex = this.#loadOrder?.findIndex(ext => ext.path === extensionPath) ?? -1;
    if (liveIndex === -1 && orderIndex === -1) return false;
    const extension = liveIndex === -1 ? this.#loadOrder![orderIndex] : this.extensions[liveIndex];
    if (liveIndex !== -1) this.extensions.splice(liveIndex, 1);
    if (this.#loadOrder && orderIndex !== -1) this.#loadOrder.splice(orderIndex, 1);
    this.#suspendedExtensions.delete(extension);
    for (const dispose of this.#fileFallbackDisposers.get(extensionPath) ?? []) dispose();
    this.#fileFallbackDisposers.delete(extensionPath);
    // WI-1 (chưa có trên HEAD) — xem §6 câu hỏi 3
    this.runtime.flagValues.delete(extensionPath);
    extension.handlers.clear();
    extension.tools.clear();
    extension.toolRegistrationListeners?.clear();
    extension.assistantThinkingRenderers.length = 0;
    extension.fileWriteFallbackHandlers.length = 0;
    extension.fileDeleteFallbackHandlers.length = 0;
    extension.messageRenderers.clear();
    extension.composerShapes.clear();
    extension.commands.clear();
    extension.flags.clear();
    extension.shortcuts.clear();
    return true;
}
```

Bốn thứ đã mở và đọc, không đoán:
- `runner.ts:490` → `#loadOrder: Extension[] | undefined;`
- `runner.ts:491` → `#suspendedExtensions = new Set<Extension>();`
- `runner.ts:962` → `return this.#loadOrder ?? this.extensions;` (thân `getLoadedExtensions`, 961-963)
- `runner.ts:753` → `for (const ext of this.getLoadedExtensions()) {`

⚠️ **Vì sao phải xoá khỏi `#loadOrder` chứ không chỉ `this.extensions`:** `initialize()` cài trampoline bằng `this.getLoadedExtensions()`, mà nó là `#loadOrder ?? this.extensions` (962). Chỉ xoá `this.extensions` thì một lần `initialize()` sau (mode switch — `runner.ts:751` đã gọi `disposeFileFallbacks()` rồi cài lại) sẽ **hồi sinh trampoline cho một extension không còn tồn tại**. Plan nêu đúng cơ chế này.

⚠️ **`this.runtime.flagValues.delete(extensionPath)`** — prose của plan bước 9 nói "delete `this.runtime.flagValues.get(path)`". `.get()` không xoá gì, đó là **lệnh no-op**. Dùng `.delete()`. (Đây là mâu thuẫn tự thấy trong plan; xem "Cần người xác nhận" #1.)

**Bước 8 — KHÔNG phơi `unloadExtension` lên `ExtensionAPI`.**

Không có file kế hoạch nào được sửa. Không export nó qua `types.ts` interface `ExtensionAPI` (`types.ts:1603` là `unregisterProvider(name: string): void;` — API bề mặt, để nguyên).

⚠️ Đừng thử `DisposableList`: nó biến 9 phương thức đăng ký thành phương thức trả effect. 11 bucket trên `types.ts:1827-1842` **chính là** sổ sở hữu rồi.

**Bước 9 — Tạo file test.**

`packages/coding-agent/test/extension-unload.test.ts` — xem §4.
Harness lấy từ `packages/coding-agent/test/extensions-runner.test.ts:60-95`:
- 61-62: `tempDir = TempDir.createSync("@pi-runner-test-");` / `extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");`
- 63: `fs.mkdirSync(extensionsDir, { recursive: true });`
- 64: `sessionManager = SessionManager.inMemory();`
- 73-95: `loadTestExtensions` — `loadExtensions([...], tempDir.path())`, lọc `extension.path` theo test root
- 49-53: `AuthStorage.create(...)` + `new ModelRegistry(authStorage)` dựng **một lần** trong `beforeAll` (comment 41-44 giải thích: constructor sync-load toàn bộ ~100ms bundled models)
- Constructor (`runner.ts:630-647`): `new ExtensionRunner(result.extensions, result.runtime, tempDir.path(), sessionManager, modelRegistry)` — mẫu thật ở `extensions-runner.test.ts:105`

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/extension-unload.test.ts` (mới — xác nhận vắng mặt trên HEAD).

**Hợp đồng quan sát được:** sau khi `unloadExtension(path)` trả `true`, extension đó **không đóng góp gì** cho runner — vắng trong `getLoadedExtensions()` / `isExtensionActive()`, cả 11 bucket rỗng — trong khi mọi extension **khác** vẫn chạy, và một giá trị flag do extension còn sống khai báo vẫn đọc được.

**Nếu hồi quy, người dùng thấy:** lệnh ma, mô tả tool cũ, shortcut chết, flag trùng lặp, hoặc một file-write fallback âm thầm làm trung gian lệnh ghi của họ cho một broker mà họ vừa tắt.

### 15 dòng

**11 dòng bucket** — mỗi dòng một hợp đồng, mỗi dòng một mutation làm nó đỏ:

| # | bucket | mutation làm dòng này đỏ | import kiểm |
| --- | --- | --- | --- |
| 1 | `handlers` | xoá dòng `extension.handlers.clear()` → `runner.hasHandlers("custom_event")` vẫn `true` | `runner.hasHandlers()` |
| 2 | `tools` | xoá `tools.clear()` → `getAllRegisteredTools()` vẫn chứa tool | `getAllRegisteredTools()` (`runner.ts:1002`) |
| 3 | `toolRegistrationListeners?` | xoá dòng clear → xem dòng (c) | — |
| 4 | `assistantThinkingRenderers` | xoá `length = 0` | đọc trực tiếp từ object `Extension` |
| 5 | `fileWriteFallbackHandlers` | xoá `length = 0` **mà không** rút disposer → xem dòng (a) | — |
| 6 | `fileDeleteFallbackHandlers` | xoá `length = 0` | — |
| 7 | `messageRenderers` | xoá `clear()` | — |
| 8 | `composerShapes` | xoá `clear()` → `getComposerShapes()` (`runner.ts:1095`) vẫn trả shape | `getComposerShapes()` |
| 9 | `commands` | xoá `clear()` | — |
| 10 | `flags` | xoá `clear()` → `getFlags()` (`runner.ts:1119`) vẫn còn | `getFlags()` |
| 11 | `shortcuts` | xoá `clear()` | đọc trực tiếp |

**Dòng (a) — file-write seam, hai nửa:**
- (i) handler của extension đã bị unload **không** được gọi khi có một lần ghi bị từ chối quyền;
- (ii) `hasFileWriteFallback()` trở lại `false` — import từ `@oh-my-pi/pi-coding-agent/tools/file-write-fallback`, hàm ở `file-write-fallback.ts:231`.
  **Nửa (ii) là dòng fail nếu unload rút bucket mà quên disposer của trampoline.** `addFileWriteFallback` (`file-write-fallback.ts:240-246`) trả disposer splice theo `indexOf(handler)`; nếu không gọi nó, registry toàn-tiến-trình vẫn còn entry → `hasFileWriteFallback()` vẫn `true` dù mọi mảng handler đã rỗng.

**Dòng (b) — hai extension cùng tên flag, default khác nhau:** unload một cái, giá trị đọc được phải là default của extension **CÒN LẠI** — không phải `undefined`, không phải giá trị của extension đã bị unload. **Dòng duy nhất bắt được bug xoá nhầm entry.** Mutation: đổi `this.runtime.flagValues.delete(extensionPath)` thành xoá cả `get(ext.path)?.clear()` toàn cục, hoặc `delete` trên tên flag chứ không phải path.

**Dòng (c) — `toolRegistrationListeners`:** listener `onToolRegistered` do extension A đăng ký không bắn khi extension B đăng ký tool sau khi A đã unload. Cơ chế đã mở và đọc:
- `loader.ts:223` → `for (const listener of this.extension.toolRegistrationListeners ?? []) listener(tool.name);` — reader duy nhất.
- `runner.ts:1069-1071` → đăng ký `wrapped` vào `extension.toolRegistrationListeners`.
- `runner.ts:1073-1077` → disposer đóng trên mảng `subscriptions` cục bộ (khai ở 1027), huỷ một lệ đăng ký trên **mọi** extension cùng lúc.
⚠️ Viết dòng này theo **hành vi** (listener không bắn), không theo cơ chế. Cơ chế "không còn đăng ký được tool" chỉ đúng ở đường lúc-load; object API của A vẫn giữ `Extension` của A sau unload, nên một closure async đã giữ lại vẫn drain được set của A. Viết theo hành vi thì đúng bất kể thế nào.

**Dòng BASELINE (có nhãn):** một runner không có extension nào đăng ký fallback thì không cài trampoline nào — `hasFileWriteFallback()` và `hasFileDeleteFallback()` đều `false` ngay từ đầu.
Đã mở và xác nhận cơ chế: `runner.ts:759` → `if (ext.fileWriteFallbackHandlers.length === 0 && ext.fileDeleteFallbackHandlers.length === 0) continue;` — skip-guard có sẵn, **dòng này xanh ngay trên HEAD không cần sửa gì.** Giữ lại: nó là điểm sắc nhất của item, và nó làm cho dòng (a)(ii) có nghĩa (đỏ lại **vì** trước đó xanh).

**Quy tắc bắt buộc:** trước khi tick dòng nào, phải viết được mutation nào làm nó đỏ — dưới dạng comment ngay trong file test. Một dòng không trả lời được câu đó không phải là một dòng test.

---

## 5. Cổng

### Cổng chạy được ngay hôm nay, không cần build gì

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
bun run check:ts
```
**Đã chạy ở HEAD `65cc6c1`: 12/12 package `Done`, exit 0.**

**Cổng này có ĐỎ ĐƯỢC không — CÓ, bằng cách nào:** nó bắt được **3 writer phẳng** của `flagValues` (`loader.ts:265`, `runner.ts:1128`, `main.ts:2223`) và bắt được `check:tools` (oxlint + oxfmt — sẽ đỏ vì `disposeFileFallbacks` mới dùng `this.#fileFallbackDisposers.values()` mà nếu quên đổi `clear()` thành `Map.clear()` thì type lệch). Nó **không** bắt được hành vi teardown.

### Cổng phân biệt — và plan SAI ở đây

Plan nói (`Đính chính`, hàng cuối) rằng `bun test` **bị chặn** vì thiếu native addon, và phải `brew install ninja` + `bun --cwd=packages/natives run build` trước.

**Điều đó stale trên máy này. Addon đã build sẵn.** Đã chạy:
```
$ bun test packages/coding-agent/test/extension-flag-dispatch.test.ts
 1 pass  0 fail  2 expect() calls          ← plan gọi đây là "0 pass / 1 fail"
$ bun test packages/coding-agent/test/extensions-runner.test.ts
 87 pass  0 fail  216 expect() calls
```

Nên cổng thật là:

```bash
bun run check:ts && bun test packages/coding-agent/test/extension-unload.test.ts packages/coding-agent/test/extensions-runner.test.ts
```

**Câu trả lời thẳng: cổng này CÓ ĐỎ ĐƯỢC, ngay bây giờ, không cần build gì.** File mới phải báo **15 pass / 0 fail**; `extensions-runner.test.ts` phải giữ **87 pass / 0 fail** (nếu nó tụt, bạn đã phá hành vi cũ — ví dụ `disposeFileFallbacks` không còn drain hết, hoặc `getFlagValues` đổi hình dạng phá ai đó).

**Cổng phân biệt là dòng (a)(ii) + dòng (b).** Hai mutation này **vô hình với `check:ts`**:
- rút bucket `fileWriteFallbackHandlers` mà quên gọi disposer → 11 dòng bucket vẫn xanh, chỉ dòng (a)(ii) đỏ vì `hasFileWriteFallback()` còn `true`;
- `flagValues.delete(path)` gõ thành xoá nhầm → 11 dòng bucket vẫn xanh, chỉ dòng (b) đỏ vì giá trị của extension còn lại biến mất.

Đó là lý do `check:ts` **không được** tick một mình. Plan nói đúng: "một cổng luôn xanh tệ hơn không có cổng".

### DONE đòi TẤT CẢ

1. `bun run check:ts` exit 0 (12/12 Done).
2. `packages/coding-agent/test/extension-unload.test.ts` tồn tại, đủ **15 dòng**, 11 dòng là một-bucket-mỗi-dòng, và **mutation phân biệt của từng dòng viết dưới dạng comment trong file**.
3. `bun test packages/coding-agent/test/extension-unload.test.ts` báo **15 pass / 0 fail** — chạy được ngay, addon đã có.
4. `grep -rn "flagValues" packages/coding-agent/src --include='*.ts'` không còn dòng phẳng nào dạng `.set(name, ...)` / `.get(name)` gọi trực tiếp lên `runtime.flagValues`.
5. `runner.ts` **không** còn `Array<() => void>` phẳng nào cho fallback disposer.

---

## 6. Cạm bẫy riêng của work item này

**1. Đếm sai số dòng là bẫy lớn nhất, và nó đã xảy ra 27/52 lần.** Plan viết neo ở HEAD `808b365`; HEAD hiện tại là `65cc6c1`. Mọi neo trong `runner.ts` **từ 970 trở đi lệch ~29 dòng**, mọi neo trong `types.ts` lệch ~25, neo `main.ts` lệch ~8-13. `runner.ts:1094` — mà plan dùng cho `getFlagValues()` — thật ra là **doc comment của `getComposerShapes()`**. Đừng tin số của plan; hãy `grep -n` lại tên symbol. Nhưng cũng **đừng tin số của tôi** khi bạn bắt đầu: tôi đã mở và đọc từng dòng ở `65cc6c1`, hãy xác nhận lại một lần trước khi gõ.

**2. Ba dòng "không cần sửa" mà plan nói phải sửa.** Nếu bạn sửa chúng, bạn đang làm việc vô nghĩa và có thể làm hỏng typecheck:
- `main.ts:551-553` **không** phải writer thứ tư — nó là passthrough tới `runner.setFlagValue(name, value)`, chữ ký không đổi, typecheck xanh nguyên vẹn. Writer phẳng thật sự là **ba**, không phải bốn.
- `loader.ts:292` (gate `flags.has(name)`) và `loader.ts:264` (guard `options.default !== undefined`) phải giữ **nguyên vẹn**. Chúng là hợp đồng, không phải code thừa.
- 11 bucket trên `types.ts:1827-1842` **không** đổi hình dạng. Chúng đã là per-extension. Đếm đủ 11: 1831, 1832, 1833, 1834, 1835, 1836, 1837, 1838, 1839, 1840, 1841.

**3. Xoá `loader.ts:184` mà không sửa clause `implements` là hỏng typecheck.** `IExtensionRuntime` (`types.ts:1821`) extends `ExtensionRuntimeState` (`types.ts:1763`) nên nó yêu cầu `flagValues`. Xoá field ở implement → đỏ. Sửa `loader.ts:179` `implements ExtensionAPI, IExtensionRuntime` → `implements ExtensionAPI` **cùng lúc**.

**4. `.get()` không xoá gì.** Plan mâu thuẫn nội tại ở đây: prose bước 9 yêu cầu "delete `flagValues.get(path)`" (no-op), `code_shape` dùng `.delete(extensionPath)` (đúng). Dùng `.delete()`.

**5. Xoá `this.extensions` mà quên `#loadOrder` là lỗi âm thìm.** `getLoadedExtensions()` là `#loadOrder ?? this.extensions` (`runner.ts:962`), và `initialize()` cài trampoline qua nó (`runner.ts:753`). Thiếu `splice` ở `#loadOrder` ⇒ một lần mode switch (`runner.ts:751` drain rồi cài lại) **hồi sinh trampoline cho extension đã chết**. Test (a)(ii) sẽ bắt, nhưng chỉ nếu test đó gọi `initialize()` lần hai — phải viết test theo đúng như vậy.

**6. FIFO không chứa lỗi ở `runner.ts:1376` là lỗi có sẵn, không phải của WI-9.** Một disposer ném làm mồ côi mọi fallback còn lại. `unloadExtension` thừa hưởng đúng lỗi đó. Sửa ở bước 6 tốn 2 dòng. Nhưng **đừng biến nó thành refactor lớn** — chỉ `reverse()` + `try/catch` + `logger.warn`.

**7. Hai câu hỏi mở chặn — cần một con người, đừng tự bịa.**

- **Câu 1 (chặn dòng test (b)) — giá trị flag do CLI cấp sống sót thế nào?** `runner.ts:1127 setFlagValue(name, value)` và `main.ts:2223` đều ghi không gắn extension. Dưới `Map<path, Map<name, value>>` không có chỗ rõ ràng cho `--flag=value` của người dùng. Ứng viên: **(a)** lớp `flagValueOverrides: Map<string, boolean|string>` riêng, thắng lúc đọc, không bị unload đụng; **(b)** `setFlagValue` fan ra mọi extension khai báo. (a) sạch hơn — một giá trị người dùng đặt phải sống sót sau khi unload extension chỉ cung cấp *default*. **Phải có người chọn trước khi viết dòng (b).**
- **Câu 2 (chặn đóng item) — `unloadExtension` gỡ provider theo tên nào?** Tên là do extension tự chọn (`pi.registerProvider("anthropic", …)`), nên `(extensionPath, extensionPath)` **không bao giờ khớp**. Tệ hơn: sau khi `runner.ts:717-719` rebind, nó lại xoá một *model provider* theo tên đường dẫn file.
  **Tin tốt tôi đo được, plan nói "chưa tồn tại" và đó là ước lượng quá nặng:** `model-registry.ts:303-304` đã có sẵn index theo source:
  ```
  #runtimeProvidersBySource: Map<string, Set<string>> = new Map();
  #runtimeProviderSourceByName: Map<string, string> = new Map();
  ```
  và `unregisterProvider(providerName)` (`model-registry.ts:2936-2945`) **đã** đọc ngược từ tên về `sourceId` qua `#runtimeProviderSourceByName`. Một `unregisterProvidersForSource(sourceId)` thật là **~5 dòng** trên state có sẵn. Cộng với `loader.ts:366-367` đã truyền đúng `this.extension.path`, toàn bộ chuỗi provider chỉ thiếu đúng hai mảnh. **Hãy đo lại chi phí này trước khi coi nó là blocker.**

**8. `unloadExtension` phải trả `boolean`, không trả object.** Plan không nói. `boolean` khớp `isExtensionActive` (`runner.ts:966`) và biến double-unload thành no-op. Trả object mời lời một đường add-lại chưa ai thiết kế.

**9. Đừng đụng module graph.** Cache-busting **đã có sẵn và đã per-load** — plan đã tự đính chính đúng, tôi xác nhận:
- `legacy-pi-compat.ts:2099-2104` → `let legacyPiLoadTag = 0;` / `legacyPiLoadTag = Math.max(legacyPiLoadTag + 1, Date.now());`
- `legacy-pi-compat.ts:2630` → `return await import(\`${entrySpecifier}?mtime=${nextLegacyPiLoadTag()}\`);`

Nếu reload có trong phạm vi, nó thừa hưởng cơ chế này miễn phí. Nếu không, WI-9 thuần tuý là teardown.

**10. Đây là `unload`, không phải `reload`.** `getLoadedExtensions()` trả `readonly Extension[]` (`runner.ts:961`) — không có đường add-lại. Đừng mở rộng phạm vi.

**11. WI-19 đi cùng PR.** Sau khi extension bị unload, `ctx` cũ của nó vẫn gọi được vào runner (`runner.ts:1271 createContext` trả object phẳng, mọi method là closure đọc `#field` **tại thời điểm gọi**). Một PR tháo extension mà để lại context sống là một PR **tạo lỗi mới trong lúc đang đóng lỗi cũ**. Giữ `isProjectTrusted: () => true` nguyên vẹn ở **cả hai** call site (`runner.ts:1293` và `agent-session.ts:7552` — tôi đã mở và đọc cả hai).

---

## 7. Bảng kiểm neo — 53 neo, 17 đúng / 36 lệch

Cột "thật" = vị trí tôi đã mở và đọc ở HEAD `65cc6c1`.

| # | Plan ghi | Thật | Trạng thái |
| --- | --- | --- | --- |
| 1 | `runner.ts:537` field `#fileFallbackDisposers` | **`runner.ts:541`** | LỆCH +4. 537 là dòng doc "trampoline at all, which keeps the registry empty…" |
| 2 | `runner.ts:778` push write | **`runner.ts:781`** (`push(`), 782 (`addFileWriteFallback(`) | LỆCH +3 |
| 3 | `runner.ts:797` push delete | **`runner.ts:800`** (`push(`), 801 (`addFileDeleteFallback(`) | LỆCH +3 |
| 4 | `runner.ts:410` shutdown call | **`runner.ts:414`** `extensionRunner.disposeFileFallbacks();` | LỆCH +4. 410 là `type: "session_shutdown",` |
| 5 | `runner.ts:747` re-init guard call | **`runner.ts:751`** `this.disposeFileFallbacks();` | LỆCH +4. 747 là dòng trống |
| 6 | `runner.ts:1346-1348` `disposeFileFallbacks` | **`runner.ts:1375-1377`** | LỆCH +29. **Plan tự mâu thuẫn:** hàng Cordis của chính nó nói `1375-1376` — hàng đó ĐÚNG |
| 7 | `runner.ts:1375-1376` FIFO dispose | **`runner.ts:1375-1376`** | ✅ ĐÚNG |
| 8 | `runner.ts:970` hết `setSuspendedExtensions` | **`runner.ts:999`** (`}`). 970 là dòng ĐẦU doc comment; method ở 976 | LỆCH +29, **và neo trỏ vào sai vị trí ngữ nghĩa** (đầu chứ không phải cuối) |
| 9 | `runner.ts:947` (bước 10) | **`runner.ts:976`** | LỆCH +29. 947 là dòng trống |
| 10 | `runner.ts:937` `isExtensionActive` | **`runner.ts:966`** | LỆCH +29 |
| 11 | `runner.ts:1094-1096` `getFlagValues` | **`runner.ts:1123-1125`** | LỆCH +29. 1094-1100 là `getComposerShapes()` |
| 12 | `runner.ts:1098` `setFlagValue` | **`runner.ts:1127-1129`** | LỆCH +29 |
| 13 | `runner.ts:1099` `setFlagValue` (bảng đính chính) | **`runner.ts:1127-1129`** | LỆCH +28 |
| 14 | `runner.ts:713` rebind provider | **`runner.ts:714-716`** (register), **`717-719`** (unregister) | LỆCH +1..+4. **Nội dung đúng**: `sourceId` bị bỏ |
| 15 | `runner.ts:997` chữ ký `onToolRegistered` | **`runner.ts:1026`** | LỆCH +29 |
| 16 | `runner.ts:1027-1040` wrapper per-ext | **`runner.ts:1056-1068`** | LỆCH +29 |
| 17 | `runner.ts:1044-1048` disposer | **`runner.ts:1073-1077`** | LỆCH +29 |
| 18 | `runner.ts:1031-1035` (claim gốc) | **`runner.ts:1073-1077`** | LỆCH +42 |
| 19 | `runner.ts:755` skip-guard | **`runner.ts:759`** | LỆCH +4 |
| 20 | `runner.ts:749` `getLoadedExtensions()` trong init | **`runner.ts:753`** | LỆCH +4. 749 là comment |
| 21 | `runner.ts:1304-1306` bộ ba timer | **`runner.ts:1333-1335`** | LỆCH +29. Nội dung đúng: cả 3 uỷ quyền `#managedTimers` |
| 22 | `runner.ts:1271` `createContext()` | **`runner.ts:1271`** | ✅ ĐÚNG |
| 23 | `runner.ts:1293` `isProjectTrusted` | **`runner.ts:1293`** | ✅ ĐÚNG. Ghi chú WI-19 nói WI-0 xác minh là `1264` — **SAI** |
| 24 | `runner.ts:1501-1511` session_shutdown | **`runner.ts:1501-1514`**, `Promise.all` ở **1512**; containment thật trong `#runHandlerWithTimeout` (**1404**) | ĐÚNG một nửa. "Promise.all try/catch theo handler" — try/catch nằm ở 1404, không phải ở 1501 |
| 25 | `runner.ts:490` / `491` (`#loadOrder` / `#suspendedExtensions`) | **`runner.ts:490`** / **`491`** | ✅ ĐÚNG (neo tôi thêm, không có trong plan) |
| 26 | `loader.ts:101` | **`loader.ts:101`** | ✅ ĐÚNG |
| 27 | `loader.ts:184` | **`loader.ts:184`** | ✅ ĐÚNG |
| 28 | `loader.ts:259-267` `registerFlag` | **`loader.ts:259-267`** | ✅ ĐÚNG |
| 29 | `loader.ts:291-294` `getFlag` | **`loader.ts:291-294`** | ✅ ĐÚNG |
| 30 | `loader.ts:223` reader listener | **`loader.ts:223`** | ✅ ĐÚNG |
| 31 | `loader.ts:179` `implements IExtensionRuntime` | **`loader.ts:179`** | ✅ ĐÚNG |
| 32 | `loader.ts:108` bỏ `sourceId` | **`loader.ts:108-111`** | ✅ ĐÚNG. **Thiếu `loader.ts:366-367`** — nơi `sourceId` ĐƯỢC truyền đúng rồi chết ở 108 |
| 33 | `types.ts:1738` khai báo interface | **`types.ts:1763`** | LỆCH +25 |
| 34 | `types.ts:1739` `flagValues` | **`types.ts:1764`** | LỆCH +25 |
| 35 | `types.ts:1745` `unregisterProvider` | **`types.ts:1770`** | LỆCH +25. Gap thật là **6 dòng** (1764→1770), không phải "hai dòng bên dưới" như "Cần người xác nhận" #3 nói |
| 36 | `types.ts:1801-1817` `interface Extension` | **`types.ts:1827-1842`** | LỆCH +26 |
| 37 | `types.ts:1806-1816` (claim gốc) | **`types.ts:1831-1841`** | LỆCH +25 |
| 38 | `types.ts:1808` `toolRegistrationListeners` | **`types.ts:1833`** | LỆCH +25. Đếm 11 bucket của plan **đúng** |
| 39 | `types.ts:1783` (claim gốc) | **`types.ts:1833`** | LỆCH +50 |
| 40 | `main.ts:2210` `flagValues.set` | **`main.ts:2223`** (literal 2220-2225) | LỆCH +13 |
| 41 | `main.ts:2207-2212` literal | **`main.ts:2220-2225`** | LỆCH +13 |
| 42 | `main.ts:543-544` writer thứ tư | **`main.ts:551-553`** | LỆCH +8 **VÀ over-claim** — đây là passthrough, không phải writer phẳng |
| 43 | `managed-timers.ts:22-68` | **`managed-timers.ts:22-75`**; `#timers` 23, `clear` 51, `clearAll` 58-64 | ĐÚNG nội dung, hơi lệch phạm vi. Không `clearExtension` — xác nhận |
| 44 | `cli/extension-flags.ts:9` | **`cli/extension-flags.ts:9`** | ✅ ĐÚNG |
| 45 | `package.json:94` (check:ts) | **`package.json:90`** | LỆCH +4. 94 là `"lint:ts"` |
| 46 | `extensions-runner.test.ts:1-97` harness | **`extensions-runner.test.ts:60-95`** (first `it(` ở 97) | ĐÚNG |
| 47 | `test/extension-unload.test.ts` vắng mặt | **vắng mặt, xác nhận** | ✅ ĐÚNG |
| 48 | `unloadExtension` grep → 0 hit | **0 hit** trong `src` + `test` | ✅ ĐÚNG |
| 49 | `unregisterProvidersForSource` → rỗng | **rỗng** | ✅ ĐÚNG, **nhưng kết luận "chưa tồn tại, phải thiết kế mới" thì nặng quá** — xem §6 cạm bẫy 7 |
| 50 | `getFlagValues` 0 caller | **0 caller**, chỉ khai báo ở 1123 | ✅ ĐÚNG |
| 51 | cordis `fiber.ts:112`, `:515`, `:120` | **`deepseek-harness/vendor/cordis/src/fiber.ts:112 / 515 / 120`** | ✅ ĐÚNG cả ba |
| 52 | cordis `core/src/utils.ts:26-30` | **`deepseek-harness/vendor/cordis/src/utils.ts:27-31`** | LỆCH +1 **VÀ SAI ĐƯỜNG DẪN** (không có `core/` trong cây vendor) |
| 53 | `shared.ts:66` `console.log` | **`deepseek-harness/vendor/logger-console/src/shared.ts:70`** | LỆCH +4. 66 là `}` |

### Hai kết luận về cổng mà plan nói sai

- **Sai (đã đúng trong bảng đính chính của chính nó):** `check:ts` xanh ngay cả khi xoá sạch 15 dòng test. Đúng, và đó là lý do phải có cổng thứ hai.
- **Sai (chưa ai sửa):** "Cần addon native trước" / "0 pass / 1 fail với `Failed to load pi_natives native addon`". **Đo lại ở HEAD `65cc6c1`: addon đã build, `bun test` chạy bình thường** — `extensions-runner.test.ts` báo 87 pass / 0 fail. Cổng phân biệt chạy được **ngay hôm nay**, không cần `brew install ninja`, không cần `bun --cwd=packages/natives run build`. Đừng báo gate là "đạt" nếu bạn chưa chạy; nhưng cũng đừng dùng "thiếu addon" làm lý do trì hoãn.

### Ba điều kiện tiên quyết — trạng thái thật trên HEAD

| Điều kiện | Trạng thái đo được |
| --- | --- |
| **WI-1 cả hai nửa** (timer + provider theo source) | **CHƯA CÓ.** `managed-timers.ts` vẫn là `Set<Timer>` phẳng, chỉ `clear`/`clearAll`. `runner.ts:717-719` vẫn rebind một tham số. `grep clearExtension` trong runner/managed-timers → 0 hit. |
| **WI-8a** (`registerPluginSetting`, `sanitizePluginSegment`) | **CHƯA CÓ trong src** (0 hit). Nhưng spec **đã có**: `.lavish-wip/m2-specs/WI-8a.spec.json` (39 KB). |
| **WI-8b** (`registerOwned`) | **CHƯA CÓ trong src** (0 hit). Spec có: `.lavish-wip/m2-specs/WI-8b.spec.json` (48 KB). |
| **WI-9 spec** | **Đã có**: `.lavish-wip/m2-specs/WI-9.spec.json` (35 KB) — nên đọc nó trước khi gõ, nó có thể đã chốt những câu hỏi mở ở §6. |
| **WI-19 spec** | Không có file. Đi cùng PR WI-9. |
