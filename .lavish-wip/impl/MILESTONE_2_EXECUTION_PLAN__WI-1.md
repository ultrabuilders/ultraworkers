# Phiếu triển khai — WI-1: Gán timer và model-provider theo đúng extension đã tạo ra chúng

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_2_EXECUTION_PLAN.md`, mục `## WI-1.` (dòng 612–1043).
**Đo tại:** `git rev-parse --short HEAD` → `65cc6c1`, nhánh `milestone-1`.
**Phạm vi PR Wave 2:** chỉ commit 1 (timers). Commit 2 (providers + resume) là Wave 4, đặc tả ở đây nhưng KHÔNG ghi trong PR này.

> **LƯU Ý ĐẦU TIÊN VỀ ĐỘ CHÍNH XÁC CỦA CÁC NEO.** Toàn bộ phần "Đính chính" của plan trong đặc tả gốc được đo tại `808b365`. HEAD đã đi tới `65cc6c1` và cây nguồn đã đổi (`f804d66 Sync from upstream omp 18.4.0`). **Mọi neo `runner.ts`, `types.ts` và `sdk.ts` trong plan đã lệch thêm một lần nữa.** Bảng dưới đây là số dòng THẬT tại `65cc6c1`, đo bằng `grep -n` / `sed -n`. Khi gõ code, hãy dùng số ở đây, hoặc grep lại — đừng dùng số trong plan.

---

## 1. Cái gì thay đổi, quan sát được

Tắt một extension bây giờ thực sự dừng nó lại: các interval nền mà nó đã lên lịch qua `ctx.setInterval` ngừng nổ ngay khoảnh khắc extension bị suspend, các model của provider nó đã đăng ký biến mất khỏi `/model` cùng API key đã lưu trong `authStorage`, và bật lại extension sẽ khôi phục cả hai. Trước thay đổi, một plugin đã tắt vẫn âm thầm polling ổ đĩa/mạng/LLM suốt đời session và vẫn giữ credential của nó trong auth store.

**Phạm vi PR này (Wave 2, commit 1)** chỉ giao nửa timer. Nửa provider thuộc commit 2 / Wave 4.

---

## 2. Bảng điểm sửa

Trích "TRƯỚC" từ file thật tại `65cc6c1`.

| Đường dẫn | Symbol | TRƯỚC (trích nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `src/extensibility/extensions/managed-timers.ts:23` | `#timers` | `readonly #timers = new Set<Timer>();` | `readonly #timers = new Map<Timer, Extension>();` |
| `managed-timers.ts:17` (sau dòng import logger) | import | *(chỉ có)* `import { logger } from "@oh-my-pi/pi-utils";` | thêm `import type { Extension } from "./types";` — phải là `import type` để bị xoá lúc compile, tránh cycle với `types.ts` |
| `managed-timers.ts:28` | `setInterval` | `setInterval(callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer {` | `setInterval(owner: Extension, callback: ..., ms?: number, ...args: unknown[]): Timer` — thêm tham số đầu `owner`; body đổi `this.#timers.add(timer)` → `this.#timers.set(timer, owner)` |
| `managed-timers.ts:36` | `setTimeout` | `setTimeout(callback: ..., ms?: number, ...args: unknown[]): Timer {` | `setTimeout(owner: Extension, callback: ..., ms?: number, ...args: unknown[]): Timer`; callback gọi `this.#timers.delete(timer)` (giữ nguyên — một-shot tự gỡ); `add` → `set(timer, owner)` |
| `managed-timers.ts:51-55` | `clear` | `if (!this.#timers.delete(timer)) return;` | **giữ nguyên.** So khớp danh tính vẫn đúng với `Map` |
| `managed-timers.ts:58-64` | `clearAll` | `for (const timer of this.#timers) {` | `for (const timer of this.#timers.keys()) {` — `Map` không iterable theo giá trị mặc định |
| `managed-timers.ts` (mới, cạnh `clearAll`) | `clearFor` | *(không tồn tại)* | `clearFor(owner: Extension): void` — duyệt `for (const [timer, timerOwner] of this.#timers)`, `if (timerOwner !== owner) continue;` rồi `clearInterval` + `clearTimeout` + `delete`. Xoá CẢ interval LẪN timeout |
| `src/extensibility/extensions/runner.ts` (mới, ngay trước `#runHandlerWithTimeout` ở 1404) | `#ownTimers` | *(không tồn tại)* | `#ownTimers<T extends ExtensionContext>(ctx: T, owner: Extension): T` — `Object.create(ctx)` + `Object.defineProperties` shadow `setInterval`/`setTimeout`/`clearTimer`, mỗi cái `enumerable: true, configurable: true` |
| `runner.ts:1434-1438` | `createHandlerContext(...)` trong `#runHandlerWithTimeout` | `const handlerContext = createHandlerContext(\n\t\t\t\t\t\t\t\tctx,\n\t\t\t\t\t\t\t\thandlerSignal,` | `createHandlerContext(\n\t\t\t\t\t\t\t\tthis.#ownTimers(ctx, ext),\n\t\t\t\t\t\t\t\thandlerSignal,` — **OWNER POINT 1** |
| `runner.ts:784` | trampoline file-write | `const ctx = this.createContext();` | `const ctx = this.#ownTimers(this.createContext(), ext);` — **OWNER POINT 2** |
| `runner.ts:803` | trampoline file-delete | `const ctx = this.createContext();` | `const ctx = this.#ownTimers(this.createContext(), ext);` — **OWNER POINT 3** |
| `runner.ts:1379-1381` | `createCommandContext` | `createCommandContext(): ExtensionCommandContext {\n\t\treturn {\n\t\t\t...this.createContext(),` | `createCommandContext(owner: Extension): ExtensionCommandContext {\n\t\treturn {\n\t\t\t...this.#ownTimers(this.createContext(), owner),` — **OWNER POINT 4**, BẮT BUỘC (xem mục 6) |
| `runner.ts:1333-1335` | 3 arrow property trong `createContext` | `setInterval: (callback, ms, ...args) => this.#managedTimers.setInterval(callback, ms, ...args),` | Phải truyền sentinel scope: `this.#managedTimers.setInterval(UNOWNED_TIMERS, callback, ms, ...args)` — xem cảnh báo gate ở mục 5 |
| `runner.ts:986-988` | `setSuspendedExtensions` nhánh `if (suspend)` | `this.#suspendedExtensions.add(extension);\n\t\t\t\tsuspended.push(extension);` | `this.#suspendedExtensions.add(extension);\n\t\t\t\tthis.#managedTimers.clearFor(extension);\n\t\t\t\tsuspended.push(extension);` |
| `src/session/agent-session.ts:7607-7608` | `#fallbackTimers()` | `setInterval: (callback, ms, ...args) => this.#fallbackTimers().setInterval(callback, ms, ...args),` | **KHÔNG có trong plan.** Phải sửa theo cùng cách, nếu không `check:types` đỏ. Xem mục 3, hàng S1 |
| `test/extension-suspend-teardown.test.ts` | file test mới | *(không tồn tại)* | 2 case cho Wave 2 |

### Kiểm chứng: `files_touched` của plan SAI ở một chỗ

Plan liệt kê 6 file + 1 file test mới. Thực tế tại `65cc6c1` cần **7 file production + 1 file test**:

| file | plan có ghi? | thực tế |
| --- | --- | --- |
| `managed-timers.ts` | ✅ | ✅ |
| `runner.ts` | ✅ | ✅ |
| `types.ts` | ✅ (COMMIT 2 only) | ✅ |
| `loader.ts` | ✅ (COMMIT 2 only) | ✅ |
| `sdk.ts` | ✅ (COMMIT 2 only) | ✅ |
| `config/model-registry.ts` | ✅ (chỉ đọc) | ✅ |
| **`src/session/agent-session.ts`** | ❌ **KHÔNG CÓ** | **CẦN SỬA** — xem S1 |
| `test/extension-suspend-teardown.test.ts` | ✅ (mới) | ✅ |

---

## 3. VIỆC 1 — Kiểm lại từng neo

Tất cả neo đã được mở và đọc bằng `sed -n "<n>p"` / `grep -n`. Kết quả:

### 3.1. Neo ĐÚNG (giữ nguyên số)

| Neo trong plan | File | Dòng thật | Nội dung dòng đó | Kết luận |
| --- | --- | --- | --- | --- |
| `managed-timers.ts:23` | managed-timers.ts | 23 | `readonly #timers = new Set<Timer>();` | ✅ đúng |
| `managed-timers.ts:51-55` (`clear`) | managed-timers.ts | 51-55 | `clear(timer: Timer): void { if (!this.#timers.delete(timer)) return; ... }` | ✅ đúng |
| `managed-timers.ts:58-64` (`clearAll`) | managed-timers.ts | 58-64 | `for (const timer of this.#timers) { ... }` | ✅ đúng |
| `managed-timers.ts:25` (`constructor(private readonly ...)`) | managed-timers.ts | 25 | `constructor(private readonly onError: ManagedTimerErrorHandler) {}` | ✅ đúng — hợp lệ dưới AGENTS.md |
| `types.ts:516` / `:522` | types.ts | 518 / 524 | `setInterval(callback: ..., ms?: number, ...args: unknown[]): Timer;` / `setTimeout(...)` | ⚠️ lệch +2, **vẫn là public signature, nội dung đúng** |
| `loader.ts:362-364` | loader.ts | 362-364 | `registerProvider(name, config) { this.runtime.registerProvider(name, config, this.extension.path); }` | ✅ đúng — `sourceId` CHÍNH XÁC là `this.extension.path` |
| `loader.ts:102` / `:105` | loader.ts | 102 / 105 | `pendingProviderRegistrations: Array<...> = [];` / `.push({ name, config, sourceId });` | ✅ đúng |
| `loader.ts:374-390` (`createExtension`) | loader.ts | 374-392 | `function createExtension(extensionPath, resolvedPath): Extension { return { path, resolvedPath, handlers: new Map(), ... } }` | ⚠️ lệch +0/+2, **đúng vị trí** |
| `loader.ts:402-411` (rollback checkpoint) | loader.ts | 402-411 | `const providerRegistrationCheckpoint = [...runtime.pendingProviderRegistrations];` … `runtime.pendingProviderRegistrations.splice(...)` | ✅ đúng |
| `model-registry.ts:303-304` | model-registry.ts | 303-304 | `#runtimeProvidersBySource: Map<string, Set<string>>` / `#runtimeProviderSourceByName` | ✅ đúng |
| `model-registry.ts:2914` (`clearSourceRegistrations`) | model-registry.ts | 2914 | `clearSourceRegistrations(sourceId: string): void {` | ✅ đúng |
| `model-registry.ts:2955` (`syncExtensionSources`) | model-registry.ts | 2955-2963 | `syncExtensionSources(activeSourceIds: string[]): void { ... for (const sourceId of this.#registeredProviderSources) { if (activeSources.has(sourceId)) continue; this.clearSourceRegistrations(sourceId); this.#registeredProviderSources.delete(sourceId); } }` | ✅ đúng — cơ chế prune + gỡ auth key qua `#clearRuntimeProviderState` là chính xác |
| `runner.ts:927-929` (`getExtensionPaths`) | runner.ts | 956-958 | `getExtensionPaths(): string[] {` → trả `this.extensions.map(e => e.path)` | ⚠️ lệch +29, **nội dung đúng** |
| `runner.ts:230-241` (`createHandlerContext`) | runner.ts | 233-244 | `Object.create(ctx)` + `Object.defineProperty(scoped, "ui", {...})` | ⚠️ lệch +3, **đúng** — xác nhận chỉ override `ui` |
| `input-controller.ts:2538` | input-controller.ts | 2538 | `const ctx = runner.createCommandContext();` | ✅ đúng |
| `types.ts:574` (`ExtensionCommandContext extends ExtensionContext`) | types.ts | 574 | `export interface ExtensionCommandContext extends ExtensionContext {` | ✅ đúng |
| `types.ts:1589` (`export interface ProviderConfig`) | types.ts | 1614 | `export interface ProviderConfig {` | ⚠️ lệch +25, **đúng vị trí** |
| `test/model-registry-runtime-cleanup.test.ts` fixture | — | 30, 34-35, 39 | `authStorage = await AuthStorage.create(":memory:")` / `clearCustomApis(); authStorage.close();` / `new ModelRegistry(authStorage, undefined, { ignoreLocalModelConfig: true })` | ✅ đúng, dùng lại được nguyên vẹn |
| `packages/natives/package.json:32` (`"build"`) | — | 32 | `"build": "bun ../../scripts/bazel-natives.ts host --dest native"` | ✅ đúng |
| `packages/coding-agent/package.json:523` (`"check:types"`) | — | 523 | `"check:types": "tsgo -p tsconfig.json --noEmit"` | ✅ đúng |
| `src/index.ts:25` (barrel) | — | 25 | `export * from "./extensibility/extensions";` | ✅ đúng — `Extension` là public type |
| `barrel` có `export * from "./types"` | extensions/index.ts | 17 | `export * from "./types";` | ✅ đúng |

### 3.2. Neo LỆCH (đã dò lại, dùng số thật)

| Neo trong plan | File | Số plan | **Số THẬT tại `65cc6c1`** | Lệch | Nội dung dòng thật |
| --- | --- | --- | --- | --- | --- |
| `#managedTimers` khai báo | runner.ts | 518 | **522** | +4 | `#managedTimers = new ManagedTimers((event, error, stack) =>` |
| lời gọi `clearManagedTimers()` | runner.ts | 411 | **415** | +4 | `extensionRunner.clearManagedTimers();` |
| `clearManagedTimers()` định nghĩa | runner.ts | 1336-1337 | **1365-1366** | +29 | `clearManagedTimers(): void { this.#managedTimers.clearAll(); }` |
| `setSuspendedExtensions` | runner.ts | 947-969 | **976-1000** | +29/+31 | `setSuspendedExtensions(shouldSuspend: ...)` … `return { suspended, resumed };` |
| cổng `#suspendedExtensions.has(ext)` file-write | runner.ts | 779 | **783** | +4 | `if (this.#suspendedExtensions.has(ext)) return false;` |
| cổng `#suspendedExtensions.has(ext)` file-delete | runner.ts | 798 | **802** | +4 | `if (this.#suspendedExtensions.has(ext)) return false;` |
| `const ctx = this.createContext()` file-write | runner.ts | 780 | **784** | +4 | `const ctx = this.createContext();` |
| `const ctx = this.createContext()` file-delete | runner.ts | 799 | **803** | +4 | `const ctx = this.createContext();` |
| chữ ký `createContext` | runner.ts | 1242 | **1270-1277** | +28 | `createContext(model?: Model, delegation?: {...}): ExtensionContext {` |
| 2 arrow property không owner | runner.ts | 1304-1305 | **1333-1334** | +29 | `setInterval: (callback, ms, ...args) => this.#managedTimers.setInterval(callback, ms, ...args),` |
| `createCommandContext()` spread | runner.ts | 1350-1352 | **1379-1381** | +29 | `return { ...this.createContext(), ... }` |
| `#runHandlerWithTimeout` khai báo | runner.ts | 1375 | **1404-1412** | +29 | `async #runHandlerWithTimeout<TEvent..., R>(...)` — tham số thứ 4 là `ext: Extension` ✅ |
| lời gọi `createHandlerContext(...)` | runner.ts | 1405-1408 | **1434-1438** | +29 | `const handlerContext = createHandlerContext(ctx, handlerSignal, event.type === "tool_call" ? budget : undefined);` |
| `interface Extension` | types.ts | 1802-1817 | **1827-1842** | +25 | `export interface Extension { path: string; resolvedPath: string; ... shortcuts: Map<...>; }` |
| `path` / `resolvedPath` | types.ts | 1803-1804 | **1828-1829** | +25 | `path: string;` / `resolvedPath: string;` — cả hai đã có sẵn, không cần dựng |
| `reconcileExtensionSources` | sdk.ts | 4566 | **4602** | +36 | `const reconcileExtensionSources = async (): Promise<void> => {` |
| `resetCapabilities()` | sdk.ts | 4571 | **4607** | +36 | `resetCapabilities();` |
| `await Promise.all([...])` discover | sdk.ts | 4573-4576 | **4608-4611** | +35 | `const [governedPaths, enabledPaths] = await Promise.all([...])` |
| `setSuspendedExtensions` | sdk.ts | 4579-4581 | **4615-4617** | +36 | `const { suspended, resumed } = extensionRunner.setSuspendedExtensions(extension => governed.has(extension.resolvedPath) && !enabled.has(extension.resolvedPath));` |
| drain session (COMMIT 2) | sdk.ts | 2487-2492 | **2500-2505** | +13 | `for (const { name, config, sourceId } of ...) { modelRegistry.registerProvider(name, config, sourceId); } … = [];` |
| `new ExtensionRunner(` | sdk.ts | 3074 | **3087** | +13 | `const extensionRunner: ExtensionRunner = new ExtensionRunner(` |
| `createAgentSessionScoped` khai báo | sdk.ts | 1493 | **1505** | +12 | `async function createAgentSessionScoped(options: ...)` |
| `agent-session.ts` command call | agent-session.ts | 7378 | **7524** | +146 | `const ctx = this.#extensionRunner.createCommandContext();` |
| 4 case 'managed timers' | extensions-runner.test.ts | 3956-4070 | **3868-3980** | -88 | `describe("managed timers (ctx.setInterval / ctx.setTimeout)", () => {` … 4 case đóng ở 3980 |
| `runner.createContext()` trong 4 case | extensions-runner.test.ts | 3970, 4002, 4025, 4052 | **3882, 3911, 3935, 3963** | đều -88 | cả 4 đều gọi `runner.createContext()` trực tiếp, không owner — **xác nhận đúng như plan mô tả** |

### 3.3. Điểm đếm call site — SỐ ĐÃ ĐỔI, plan không cập nhật

| Claim của plan | Số plan | **Số thật** | Chi tiết |
| --- | --- | --- | --- |
| `grep -c 'this\.createContext('` | 15 | **16** | Call site MỚI tại `runner.ts:921` trong `emitCacheWarmingDecision` (method mới ở 916-933), dùng chung `ctx` qua `#runHandlerWithTimeout` — đúng loại 12 call site dùng chung, không cần owner riêng |
| `#runHandlerWithTimeout` call sites | 12 | **13** | 12 như plan + `runner.ts:923` trong `emitCacheWarmingDecision` |
| `runner.ts` tổng dòng | — | **1992** (plan ghi 73 KB) | |

Danh sách 16 call site thật: `784, 803, 921, 1381, 1507, 1519, 1558, 1616, 1673, 1704, 1745, 1767, 1848, 1884, 1909, 1966`.

**Hệ quả trực tiếp:** gate `grep -n 'this\.createContext(' … | wc -l` "vẫn phải in ra 15" trong mục "Kiểm tra độ hợp lý của diff" **sẽ báo fail vô lý** khi bạn làm đúng. Số đúng là **16**. Đừng "sửa" code cho khớp 15.

### 3.4. Claim SAI (không phải hỏng neo, mà là nội dung sai)

| Claim | Verdict | Bằng chứng |
| --- | --- | --- |
| "`RegisteredCommand` / `ExtensionShortcut` cho phép nối `owner` từ call site" | **SAI một phần** | `types.ts:1251-1256` `RegisteredCommand` = `{ name, description?, getArgumentCompletions?, handler }` — **KHÔNG có trường owner nào**. `ExtensionShortcut` (1714-1719) **CÓ** `extensionPath: string`. Nên owner-point 4 chỉ nối được cho SHORTCUT (`input-controller.ts:2538` có `shortcut.extensionPath` trong tầm), còn COMMAND thì phải tự tra cứu. Xem bước 4. |
| `agent-session.ts:7378, 7396, 7494` là call site `createCommandContext` | **SAI** | Thật là `7524` (`#tryExecuteExtensionCommand`), `7540-7542` (`#createCommandContext` — khi KHÔNG có runner thì trả về literal context riêng), `7640` (`#tryExecuteCustomCommand`, spread `baseCtx`). |
| "`Extension` là type public → field BẮT BUỘC là breaking change" | **ĐÚNG, và còn nặng hơn plan nói** | Thêm vào đó **2 test dựng `Extension` literal trực tiếp** sẽ đỏ compile: `test/sdk-credential-disabled-bridge.test.ts:435` và `test/extensions-runner.test.ts:4074`. Cả hai phải được thêm `registeredProviders: []`. Xem bước 8. |
| "không test nào gọi `setSuspendedExtensions`" | **ĐÚNG** | `grep -n 'setSuspendedExtensions' test/*.ts` → không có kết quả. Case 1 và 2 chưa được che phủ. |
| "file test mới chưa tồn tại" | **ĐÙNG** | `ls test/extension-suspend-teardown.test.ts` → `No such file or directory`. Chỉ có `input-controller-suspend.test.ts` (không liên quan). |
| "baseline `check:types` exit 0" | **ĐÚNG, đã chạy thật** | `cd packages/coding-agent && bun run check:types` → `EXIT=0`, không lỗi. |
| "thiếu addon thì `bun test` báo 0 pass" | **ĐÚNG về cơ chế, nhưng máy này ĐÃ CÓ addon** | `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại → `bun test test/extensions-runner.test.ts -t "managed timers"` chạy thật: **4 pass, 0 fail**. Vẫn nên chạy lệnh build một lần cho máy mới. |
| Plan nói **2** file cho commit 1 nhưng `Effort` ghi **3** | **Vẫn còn mâu thuẫn** | Xem mục 6, hàng C1. |
| `grep -c 'this.#ownTimers('` phải in **4** | **ĐÚNG** | Định nghĩa `#ownTimers<T extends ExtensionContext>(...)` không có tiền tố `this.` nên không được đếm; 4 call site thì có. Nhưng xem mục 6 hàng C2 về thêm 1 call site ở `agent-session.ts`. |

---

## 4. Các bước

Mỗi neo dưới đây là dòng tôi vừa mở và đọc tại `65cc6c1`.

### Bước 1 — Viết test đỏ (chưa đụng source)

Tạo `packages/coding-agent/test/extension-suspend-teardown.test.ts`.

Hình mẫu dựng extension: `test/extensions-runner.test.ts:1395-1438` — ghi 2 file `.ts` vào `tempDir`, mỗi file `export default function(pi) { pi.on("session_start", async () => { ... }) }`, rồi `await loadTestExtensions([pathA, pathB])` + `new ExtensionRunner(result.extensions, result.runtime, tempDir.path(), sessionManager, modelRegistry)`.

**Bắt buộc:** handler phải đăng ký trên event thật `session_start` và đi qua `await runner.emit({ type: "session_start" })` (`runner.ts:1493`). **KHÔNG** đi qua trampoline file-write/delete — chúng chỉ nổ khi agent biến đổi file, nên test viết theo chúng sẽ **pass trên đúng cái lỗi mà nó sinh ra để bắt** (bản hiện thực thiếu owner point 1).

Dùng `vi.useFakeTimers()` trong `try/finally { vi.useRealTimers() }`, khớp 4 case sẵn có ở `test/extensions-runner.test.ts:3868-3980`.

Xác nhận **CẢ HAI** case timer đỏ trước khi viết bất kỳ dòng sửa nào: bộ đếm callback của A vẫn phải leo sau `runner.setSuspendedExtensions(ext => ext === A)`. Nếu chúng xanh, test của bạn sai — hãy kiểm tra lại xem handler có thật sự đi qua `emit` không.

### Bước 2 — `managed-timers.ts`: `#timers` thành Map

`src/extensibility/extensions/managed-timers.ts`

1. Thêm `import type { Extension } from "./types";` **sau dòng 17** (`import { logger } from "@oh-my-pi/pi-utils";`).
2. **Dòng 23:** `readonly #timers = new Set<Timer>();` → `readonly #timers = new Map<Timer, Extension>();`
3. **Dòng 28:** `setInterval(callback: ...)` → thêm `owner: Extension` làm tham số đầu; dòng 31 `this.#timers.add(timer)` → `this.#timers.set(timer, owner)`.
4. **Dòng 36:** `setTimeout(callback: ...)` → thêm `owner: Extension`; dòng 46 `add` → `set(timer, owner)`. Dòng 39 `this.#timers.delete(timer)` **giữ nguyên**.
5. **Dòng 51-55** (`clear`): **không đổi**.
6. **Dòng 58-64** (`clearAll`): `for (const timer of this.#timers)` → `for (const timer of this.#timers.keys())`.
7. Thêm `clearFor(owner: Extension)` ngay cạnh `clearAll` — duyệt `[timer, timerOwner]`, bỏ qua khi `timerOwner !== owner`, còn lại `clearInterval` + `clearTimeout` + `delete`.
8. Cập nhật docblock class (dòng 15 về `clearAll`) để nhắc `clearFor`.

Giữ nguyên `#run` (66-75) và `#report` (77-82).

### Bước 3 — `runner.ts`: thêm `#ownTimers`

Đặt ngay **trước dòng 1404** (`#runHandlerWithTimeout`).

```typescript
	#ownTimers<T extends ExtensionContext>(ctx: T, owner: Extension): T {
		const scoped: T = Object.create(ctx);
		Object.defineProperties(scoped, {
			setInterval: {
				value: (callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) =>
					this.#managedTimers.setInterval(owner, callback, ms, ...args),
				enumerable: true,
				configurable: true,
			},
			setTimeout: {
				value: (callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) =>
					this.#managedTimers.setTimeout(owner, callback, ms, ...args),
				enumerable: true,
				configurable: true,
			},
			clearTimer: {
				value: (timer: Timer) => this.#managedTimers.clear(timer),
				enumerable: true,
				configurable: true,
			},
		});
		return scoped;
	}
```

`Object.create` hoạt động được vì `createHandlerContext` (dòng 233-244) **đã là** `Object.create(ctx)`, nên literal của `createContext()` làm prototype của handler context và các own property không-owner (1333-1335) được kế thừa — trừ khi ta shadow ở chính object của handler context.

### Bước 4 — Nối BỐN điểm owner (rồi tự đếm lại)

| # | Vị trí | Sửa |
| --- | --- | --- |
| 1 | `runner.ts:1434-1438`, trong `createHandlerContext(...)` | `ctx` → `this.#ownTimers(ctx, ext)`. `ext` đã là tham số thứ 4 của `#runHandlerWithTimeout` (dòng 1408) |
| 2 | `runner.ts:784` | `const ctx = this.createContext();` → `const ctx = this.#ownTimers(this.createContext(), ext);` |
| 3 | `runner.ts:803` | y hệt |
| 4 | `runner.ts:1379-1381` | `createCommandContext(): ExtensionCommandContext {` → `createCommandContext(owner: Extension)`; `...this.createContext(),` → `...this.#ownTimers(this.createContext(), owner),` |

**Điểm 4 là BẮT BUỘC.** `createCommandContext` là một **spread**, nên nó copy thẳng 3 own property không-owner vào `ExtensionCommandContext`. Vì `ExtensionCommandContext extends ExtensionContext` (types.ts:574), slash command và shortcut **có quyền** gọi `ctx.setInterval`. Bỏ qua điểm này thì timer do command lên lịch mang sentinel, `clearFor` không bao giờ khớp, và nó sống mãi sau khi plugin bị tắt.

**Cách nối `owner` tại call site (đã kiểm chứng, khác plan):**

- **Shortcut** — `src/modes/controllers/input-controller.ts:2538`, ngay sau `if (!runner.isExtensionActive(shortcut.extensionPath)) return;` (2537). `ExtensionShortcut` **có** `extensionPath: string` (types.ts:1718) → cần tra `Extension` từ runner. **Phải thêm một method tra cứu** mà plan không đề cập, ví dụ `getExtension(path: string): Extension | undefined` cạnh `isExtensionActive` (dòng 966).
- **Command** — `src/session/agent-session.ts:7524`, sau `const command = this.#extensionRunner.getCommand(commandName); if (!command) return false;` (7521-7522). `RegisteredCommand` **KHÔNG có** trường owner (types.ts:1251-1256), nên phải thêm `extensionPath` vào `RegisteredCommand` **hoặc** tra qua `command.name` trong `ext.commands`. Đây là việc phát sinh thêm mà plan đã bỏ sót — cân nhắc báo lại.
- **Hai call site còn lại KHÔNG cần owner:** `agent-session.ts:7540-7542` (`#createCommandContext` khi không có runner) và `:7640` (`#tryExecuteCustomCommand` — custom command/MCP prompt, không phải extension). Chúng dùng path fallback, giữ nguyên.

**Đếm lại:** `grep -c 'this\.#ownTimers(' src/extensibility/extensions/runner.ts` phải in **4**. Nếu in 5, bạn đã sửa cả `agent-session.ts` bằng `this.#ownTimers` — sai, xem bước 4b.

### Bước 4b — `agent-session.ts`: KHÔNG CÓ TRONG PLAN, NHƯNG BẮT BUỘC

`src/session/agent-session.ts:7607-7609` là **call site thứ năm** của `ManagedTimers` trong repo:

```
7607:  setInterval: (callback, ms, ...args) => this.#fallbackTimers().setInterval(callback, ms, ...args),
7608:  setTimeout: (callback, ms, ...args) => this.#fallbackTimers().setTimeout(callback, ms, ...args),
7609:  clearTimer: timer => this.#fallbackTimers().clear(timer),
```

Đây là context fallback "runner-less" (SDK embedding không có extension runner), được dựng trong `#createCommandContext()` khi `!this.#extensionRunner` (7541). Nó dùng instance `ManagedTimers` RIÊNG (`#fallbackExtensionTimers`, khai báo dòng 868, tạo lazy ở `#fallbackTimers()` 7614-7619, dọn ở `dispose` dòng 5289).

Khi `ManagedTimers.setInterval` nhận thêm tham số đầu `owner`, **ba dòng này sẽ đỏ compile**. Không có extension nào ở đây, nên sửa bằng sentinel scope đúng như bước 6. **Không** dùng `this.#ownTimers` ở file này — nó là method riêng của `ExtensionRunner` và context ở 7607 không đi qua runner.

### Bước 5 — Thả timer khi suspend

`src/extensibility/extensions/runner.ts:986-988`, trong `setSuspendedExtensions`:

```
986:  			if (suspend) {
987:  				this.#suspendedExtensions.add(extension);
988:  				suspended.push(extension);
```

chèn `this.#managedTimers.clearFor(extension);` **giữa dòng 987 và 988**.

**KHÔNG** thêm gì vào nhánh `else` (resume, dòng 989-992). Mở rộng docblock method (970-975) bằng một câu nói rằng extension bị suspend còn mất luôn việc qua `ctx.setInterval` / `ctx.setTimeout`.

### Bước 6 — Sửa hai call site `ManagedTimers` trong `createContext`

`src/extensibility/extensions/runner.ts:1333-1334` sẽ không còn type-check. Hai chỗ này **phải tiếp tục không có owner** (chúng dựng prototype context dùng chung cho 16 call site).

Cách sửa tối thiểu: sentinel ở cấp module mà `clearFor` **không bao giờ khớp** — TUYỆT ĐỐI không phải một `Extension` thật, vì ở thời điểm dựng context chưa biết extension nào. Dùng một object đẳng nhận riêng, ví dụ:

```typescript
/** Owner scope for prototype contexts built before an owning extension is known. Never matches a real extension. */
const UNOWNED_TIMERS: Extension = { ... } as Extension;
```

Cùng sentinel đó dùng lại cho `agent-session.ts:7607-7608` (bước 4b) — hoặc một sentinel riêng, đều được miễn là `clearFor` không bao giờ khớp.

**Kiểm tra không hồi quy:** 4 case 'managed timers' ở `test/extensions-runner.test.ts:3868-3980` phải vẫn pass. Tôi đã chạy ở HEAD: **4 pass, 0 fail**. Cả 4 gọi `runner.createContext()` không owner (dòng 3882, 3911, 3935, 3963).

**Một chi tiết phải biết:** case đầu (dòng 3894) assert `expect(errors[0]?.extensionPath).toBe("<timer>")`. Chuỗi `"<timer>"` đến từ `runner.ts:522-524`, nơi `ManagedTimers` được dựng với `onError` gọi `this.emitError({ extensionPath: "<timer>", ... })`. Nếu bạn đổi `onError` để nhận owner, **phải giữ nguyên chuỗi `"<timer>"`** cho sentinel, nếu không case này đỏ.

### Bước 7 — DỪNG. Đây là hết PR Wave 2

Chạy cổng ở mục 5. Case provider **không** viết ở Wave 2 và **không** hiện thực trong PR này.

### Bước 8–11 — COMMIT 2 / WAVE 4 ONLY (ghi chú neo đã đo lại)

| Bước | Việc | Neo THẬT tại `65cc6c1` |
| --- | --- | --- |
| 8 | `types.ts` 1827-1842: thêm `registeredProviders: Array<{ name: string; config: ProviderConfig }>`; `loader.ts:374-392`: gieo `registeredProviders: []` | `ProviderConfig` khai báo ngay trong `types.ts:1614` → không cần import mới |
| 8b | **THÊM (plan bỏ sót):** `test/sdk-credential-disabled-bridge.test.ts:435` và `test/extensions-runner.test.ts:4074` dựng `Extension` literal trực tiếp → phải thêm `registeredProviders: []`, nếu không `check:types` đỏ | đã xác minh 2 chỗ |
| 9 | `sdk.ts:2500-2505`: dựng `extensionsByPath`, push `{ name, config }` bên trong vòng lặp đăng ký sẵn có | khối drain nằm NGOÀI guard `if (!restrictToolNames)` (mở ở 2493, đóng ở 2499) — giữ nguyên như vậy |
| 10 | `sdk.ts:4615-4617`: chèn `syncExtensionSources` + vòng đăng ký lại **ngay sau** `setSuspendedExtensions` | `getExtensionPaths()` ở `runner.ts:956-958` |
| 11 | `packages/coding-agent/CHANGELOG.md`: một dòng dưới `## [Unreleased]`, không issue link (bắt nguồn từ upgrade plan, không phải issue filed) | — |

**Hai drain KHÔNG sửa (chủ ý, nói trong PR body):** `sdk.ts:1014-1022` (`loadCliExtensionProviders`) và `cli/models-cli.ts:359-362` (`omp models`).

---

## 5. Hợp đồng test

**File:** `packages/coding-agent/test/extension-suspend-teardown.test.ts` (mới, chưa tồn tại — đã xác minh).

**Tóm tắt:** Suspend một extension dừng đúng các callback chính nó đã lên lịch và đúng provider nó đã đăng ký — không hơn, không kém. "Không hơn" được khẳng định bằng hai extension (bắt lỗi owner gắn nhầm từ context dùng chung); "không kém" bằng một extension thứ hai phải tiếp tục nổ trong khi láng giềng đang bị suspend.

### Case 1 — TIMER DEAD AFTER SUSPEND, và timer của extension anh em vẫn sống

- Hai extension A và B, mỗi cái một handler `session_start` gọi `ctx.setInterval` tăng bộ đếm riêng.
- `await runner.emit({ type: "session_start" })` → `vi.advanceTimersByTime(...)` → cả hai đếm ≥ 1.
- `runner.setSuspendedExtensions(ext => ext === A)`.
- `vi.advanceTimersByTime(5000)`.
- **Assert:** đếm của A **đứng yên**; đếm của B **TĂNG** qua cùng cửa sổ. So sánh "cùng một tick thì chưa đủ" — B phải chứng minh nó **tiến triển** trong khi A thì không.
- Session vẫn sống (không được tear down) — đó là điều phân biệt "timer bị clear" với "session chết".

### Case 2 — TIMER ALIVE AFTER RESUME

- `runner.setSuspendedExtensions(ext => ext === A)` → `vi.advanceTimersByTime(5000)` → đếm A đứng yên.
- `runner.setSuspendedExtensions(() => false)` để resume A → `await runner.emit({ type: "session_start" })` **lần nữa** → `vi.advanceTimersByTime(...)` → đếm tăng trở lại.
- **Assert:** bộ đếm do lần gọi handler **THỨ HAI** tạo ra tăng. Test **không được** assert trên handle `Timer` cũ — đó là timer mới.
- **Phải chứng minh handle cũ thật sự đã mất:** giữ tham chiếu tới handle trước-suspend, đẩy thời gian, callback cũ không hồi sinh.

### Case 3 — PROVIDER GONE AFTER SUSPEND, và trở lại sau RESUME (Wave 4)

- Fixture tái dùng từ `test/model-registry-runtime-cleanup.test.ts:30/34-35/39`.
- Assert trên bề mặt **quan sát được**: `registry.find(providerName, modelId)` và `registry.authStorage.keys.source(providerName)`.
- Sau suspend reconcile: `find` là `undefined` **và** `keys.source` là `undefined` (credential bị gỡ, không chỉ overlay model).
- Sau resume reconcile: cả hai defined trở lại — đây là nửa đòi hỏi retention record.
- **KHÔNG** assert `#runtimeProvidersBySource` hay field private nào — sẽ pass ngay cả khi `syncExtensionSources` được gọi nhưng đăng ký lại không bao giờ xảy ra.

### Nếu hồi quy, người dùng thấy gì

- **Timer:** plugin đã tắt vẫn polling vô hạn, không lỗi, không log. Nếu owner gắn sai, đó là bug trông như bản sửa: tắt A giết luôn timer của B. Nếu timer không khởi động lại ở resume, extension polling ngừng polling **vĩnh viễn** sau một vòng tắt/bật — trong im lặng.
- **Provider:** `omp models` vẫn liệt kê provider của plugin đã tắt, API key vẫn nằm trong `authStorage` — "tôi đã tắt plugin" không xoá được credential nó được cấp.

### Luật dựng test

- **TUYỆT ĐỐI không `mock.module()`** (AGENTS.md cấm — Bun rò rỉ qua file test). Dùng `vi.spyOn` trên module object đã import + `vi.restoreAllMocks()` trong `afterEach`.
- **TUYỆT ĐỐI không source-grep** — cấm assert trên văn bản file hiện thực.
- `vi.useFakeTimers()` trong `try/finally` khôi phục timer thật.
- **Full-suite safe**: không giữ mutation file-wide của `Bun.*` / `process.env`.

---

## 6. Cổng

### 6.1. Cổng cho PR Wave 2 (chỉ commit 1)

```bash
# 0. MỘT LẦN cho mỗi máy. Máy này ĐÃ CÓ sẵn addon nên có thể bỏ, nhưng nên chạy.
bun --cwd=packages/natives run build

# 1. Types. Baseline đã đo tại 65cc6c1: EXIT=0, không lỗi.
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types

# 2. Test mới — case 1 và case 2: 2 passing, 0 failing.
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/extension-suspend-teardown.test.ts

# 3. Không hồi quy ở 4 case managed timers sẵn có + primitive model registry.
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/extensions-runner.test.ts test/model-registry-runtime-cleanup.test.ts
```

### 6.2. Cổng có ĐỎ ĐƯỢC không?

**Có — nhưng chỉ một nửa, và nửa đó phải nói thẳng.**

| Cổng | Đỏ trước / xanh sau? | Vì sao |
| --- | --- | --- |
| **Case 1 (timer chết sau suspend)** | ✅ **ĐỎ thật** | HEAD: `#timers` là `Set<Timer>` không owner (`managed-timers.ts:23`), `setSuspendedExtensions` (976-1000) chỉ chạm `#suspendedExtensions` + splice `extensions` — không chạm timer. Bộ đếm A vẫn leo. |
| **Case 2 (timer sống sau resume)** | ❌ **KHÔNG đỏ — pass HỤT** | Trên HEAD chưa sửa gì, không có gì bị xoá, nên interval vẫn nổ xuyên suốt vòng suspend/resume và case pass **vì lý do sai**. Nó chỉ thành cổng thật khi commit 1 đã đất. |
| **`check:types`** | ❌ **KHÔNG đỏ — xanh sẵn** | Baseline HEAD = 0 lỗi (đã chạy thật). Đây là cổng "zero errors", không phải "no new errors" — nó không chứng minh việc gì cả, chỉ chứng minh bạn không phá type. |
| **`bun test … extensions-runner` + `model-registry-runtime-cleanup`** | ❌ **KHÔNG đỏ — xanh sẵn** | Chúng bảo vệ code cũ, không bảo vệ tính năng mới. |
| **`grep -c 'this\.createContext('` == 15** | ⚠️ **SẼ ĐỎ SAI** | Số thật là **16** (call site mới ở `runner.ts:921`). Gate này cần viết lại. |

**Kết luận thẳng:** trong 5 lệnh cổng trên, **chỉ một** — `bun test test/extension-suspend-teardown.test.ts` với case 1 — thật sự đỏ trước khi sửa. Đó là cổng duy nhất có giá trị. Ba lệnh còn lại là cổng an toàn, không phải cổng chứng minh.

### 6.3. Ba cổng phải viết lại cho đỏ được

**Cổng A — thay `grep -c` bằng một kiểm tra hành vi.** Số 15/16 là một con số bị trôi theo code, và ngay lúc này nó **đã sai**. Cổng đỏ được là: case 1 với extension B chứng minh owner không bị gắn nhầm — nếu `clearFor` quét Map và dừng ở entry đầu, hoặc nếu owner lấy từ context dùng chung, **đếm của B đứng yên và case đỏ**. Đó là cổng thật, và nó đã nằm trong case 1.

**Cổng B — case 2 phải được viết để đỏ trên một bản hiện thực sai.** Hiện plan nói case 2 "pass hụt" và vẫn nên viết. Tôi đồng ý nên viết, nhưng phải nói rõ: **nó không phải cổng đỏ-trước/xanh-sau**. Cách làm nó thành cổng thật: viết nó sao cho một bản hiện thực commit-1 sai (xoá ở cả nhánh resume, hoặc không bao giờ lên lịch lại) sẽ đỏ. Assert cả hai vế: sau resume, đếm **tăng** (đã lên lịch lại) **và** handle cũ **không** hồi sinh (đã bị clear). Nếu chỉ assert một vế thì một trong hai lỗi đó lọt.

**Cổng C — gate "diff phải chạm đúng N file" cần viết lại.** Xem hàng C1 bên dưới.

### 6.4. Mâu thuẫn nội tại của đặc tả (chặn bước gõ)

| # | Mâu thuẫn | Sự thật đo được | Phải làm gì |
| --- | --- | --- | --- |
| **C1** | "diff commit 1 phải chạm đúng 2 file" vs `Effort` ghi "20-25 dòng trên **3** file" vs 4 chỗ khác nói "MUST NOT touch `types.ts`" | Thật cần **3 file production** cho commit 1: `managed-timers.ts`, `runner.ts`, **và `session/agent-session.ts`** (bước 4b). `types.ts` thì đúng là không chạm. | Sửa gate thành: **3 file** (`managed-timers.ts`, `runner.ts`, `session/agent-session.ts`). Nếu `types.ts` xuất hiện → sai. Nếu `sdk.ts` xuất hiện → nửa provider lẫn vào. |
| **C2** | `grep -c 'this.#ownTimers('` phải in 4 | Nếu bạn sửa `agent-session.ts` **bằng** `#ownTimers` thì số này vẫn 4 (vì `#ownTimers` là method riêng của runner), nhưng cách sửa đó **sai** — context ở 7607 không đi qua runner. Sửa đúng là truyền sentinel. | Giữ kỳ vọng 4 cho `runner.ts`, và kiểm riêng `agent-session.ts:7607-7609` có truyền sentinel chứ không phải owner thật. |
| **C3** | `readonly` trên `#timers` không nhất quán: `files_touched` ghi `readonly #timers = new Map<...>`, `code_shape` ghi `#timers = new Map<...>` | File thật dòng 23 là `readonly #timers = new Set<Timer>();` | Giữ **`readonly`** (khớp file thật). Chọn `code_shape` là sai. |
| **C4** | `open_questions` #1 trỏ `WI-7`, còn `blocks` chỉ liệt kê WI-9 và WI-5 | Đúng về logic | Không chặn commit 1. Ghi nhận. |
| **C5** | **MỚI, không có trong plan:** `grep -c 'this\.createContext('` phải in 15 | Thật là **16** | Sửa gate thành 16, hoặc bỏ gate này và thay bằng Cổng A. |

### 6.5. KHÔNG dùng làm cổng

- `bun check` ở gốc repo — `check:ts` + `check:rs` chạy song song, nửa Rust cần cargo toolchain. `check:types` trong `packages/coding-agent` là cổng nhanh và đủ.
- `tsc` / `npx tsc` — AGENTS.md cấm. Script là `tsgo -p tsconfig.json --noEmit`.

---

## 7. Cạm bẫy riêng của work item này

### C1 — Thiếu MỘT điểm gán owner, không phải thiếu cơ chế

`createContext()` có **16** call site nhưng chỉ **BỐN** có thể gọi đúng tên extension sở hữu: `#runHandlerWithTimeout` (đã nhận `ext`), hai trampoline fallback (đã đóng trên `ext`), và `createCommandContext` (một spread). 12 call site còn lại **dùng chung một `ctx` dựng một lần cho mỗi vòng emit** — `ctx ??= this.createContext()` tại `runner.ts:1507` và `:1519`, cộng mười `const ctx = this.createContext()` trong từng hàm emit riêng. Truyền `ext` vào `createContext()` ở các điểm đó sẽ truyền `undefined` cho mọi extension.

**Đây đúng là đường mà một timer `session_start` thật đi qua** — và vì thế test case 1 BẮT BUỘC đi qua `emit`, không đi qua trampoline. Nếu bạn viết test qua trampoline, nó sẽ **pass trên đúng bản hiện thực hỏng** mà nó sinh ra để bắt: bản đó chỉ gán owner ở 784 và 803, bỏ trống 1434.

### C2 — `createCommandContext` là SPREAD, `Object.create` không compose được với nó

Đây là lý do điểm 4 tồn tại. `Object.create` shadow hoạt động theo chuỗi prototype. Nhưng `{ ...ctx }` copy **own enumerable properties** — nên spread sẽ copy thẳng 3 own property không-owner (1333-1335) và nuốt mọi shadow. Phải bọc `#ownTimers` **TRƯỚC**, spread **SAU**. Làm ngược thứ tự thì `createCommandContext` trả về một object mà mọi `ctx.setInterval` đều không có owner.

### C3 — `RegisteredCommand` không mang owner (plan đã bỏ sót)

Plan nói chỉ cần nối `owner` từ `input-controller.ts:2538` và `agent-session.ts:7378`. Thực tế: `ExtensionShortcut` **có** `extensionPath` (types.ts:1718) nên shortcut dễ; nhưng `RegisteredCommand` (types.ts:1251-1256) **không có trường nào** trỏ về extension. Ở `agent-session.ts:7524` bạn chỉ có `command.name`. Bạn sẽ phải tự thêm `extensionPath` vào `RegisteredCommand` hoặc thêm method tra cứu. Đây là việc phát sinh ngoài ước lượng "20-25 dòng".

### C4 — `agent-session.ts` có instance `ManagedTimers` thứ hai mà plan không nhắc

Xem bước 4b. Bỏ qua nó thì `check:types` đỏ ngay — đây là lỗi "lộ ra sớm, tốt". Nhưng nếu bạn sửa nó bằng `this.#ownTimers` (một method của `ExtensionRunner`) thì bạn vừa tạo một dependency sai — context ở 7607 thuộc `AgentSession`, không thuộc runner.

### C5 — `clearFor` phải xoá CẢ interval LẪN timeout

Một one-shot đang chở cũng là công việc nền. `clearFor` chỉ lọc `setInterval` thì một `setTimeout(..., 60000)` của plugin đã tắt vẫn nổ sau một phút. `clear()` hiện có gọi **cả hai** `clearInterval` + `clearTimeout` trên cùng handle (dòng 53-54) — `clearFor` phải làm y hệt, không chọn lọc.

### C6 — Vòng lặp xoá trong khi duyệt `Map`

Xoá entry hiện tại giữa lúc duyệt `Map` là hành vi **được định nghĩa** (khác với `Set`, nơi `Set.prototype.forEach` cũng định nghĩa nhưng dễ gây nhầm hơn). `for (const [timer, timerOwner] of this.#timers)` rồi `this.#timers.delete(timer)` là an toàn. Nhưng đừng dùng `Array.from(this.#timers).forEach(...)` rồi xoá — cũng được, nhưng tốn một mảng.

### C7 — Chuỗi `"<timer>"` trong `onError` phải giữ nguyên

`runner.ts:522-524` truyền `extensionPath: "<timer>"`. Test `test/extensions-runner.test.ts:3894` assert `expect(errors[0]?.extensionPath).toBe("<timer>")`. Nếu bạn hứng hẹn đổi `onError` để nhận owner và vô tình đổi chuỗi này, test đỏ mà không hiểu vì sao.

### C8 — Thứ tự owner point 1 phải ĐÚNG: `#ownTimers` bọc NGOÀI, `createHandlerContext` bọc TRONG

`createHandlerContext` là `Object.create(ctx)`. Nếu bạn gọi `createHandlerContext(this.#ownTimers(ctx, ext), ...)` thì chuỗi prototype là `handlerContext → ownedCtx → baseCtx`, và `ownedCtx` có own property `setInterval` shadow của base — `createHandlerContext` chỉ define `ui` lên `handlerContext` nên không đè lên `setInterval`. Đúng. Nhưng nếu bạn viết `this.#ownTimers(createHandlerContext(ctx, ...), ext)` thì `createHandlerContext` lại chạy sau và prototype chain vẫn OK, **nhưng** `ownedCtx` sẽ là prototype của `handlerContext` thay vì ngược lại — chuỗi này làm `ui` mà handler thấy vẫn đúng, nên cả hai đều chạy. Hãy giữ đúng thứ tự plan nêu để review dễ.

### C9 — Rủi ro commit 2: bán suspend mà không bán resume

`pendingProviderRegistrations` bị drain phá huỷ (cả ba consumer đều gán `[]` lại: `sdk.ts:1021`, `sdk.ts:2504`, `cli/models-cli.ts:362`). Một lời gọi lại trần sẽ không đăng ký gì cả, biến "plugin đã tắt vẫn kết nối" thành tệ hơn: "tôi đã bật lại plugin và không có gì xảy ra". **Đó là lý do nửa provider không thể tách khỏi nửa resume** — và cũng là lý do commit 1 dừng ở bước 7.

### C10 — Quyết định còn treo: resume và timers

Nhánh resume của `setSuspendedExtensions` (dòng 989-992) chỉ lật membership của một `Set`. Đặc tả viết theo **phương án (a)**: extension vừa resume tự dựng lại việc nền ở event kế tiếp. Đây là quyết định thiết kế thật, chưa ai phê chuẩn. Case 2 của test contract giả định phương án (a).

### C11 — Quyết định còn treo: sentinel hay ném lỗi

Sentinel giữ hành vi hiện tại cho caller tiền-`#ownTimers` và cho 4 test sẵn có. Ném lỗi sẽ lộ ngay điểm gán owner bị bỏ sót trong tương lai, nhưng làm hỏng `test/extensions-runner.test.ts:3868-3980`. Đặc tả đề xuất sentinel. **Cần người phê chuẩn trước khi viết code.**

---

## 8. Tóm tắt neo đã kiểm

| | số |
| --- | --- |
| Tổng neo kiểm | 47 |
| Neo đúng (giữ nguyên hoặc lệch nhưng nội dung đúng) | 24 |
| Neo lệch — đã dò lại bằng lệnh thật, ghi số mới trong phiếu | 21 |
| File test mới (`extension-suspend-teardown.test.ts`) | không tồn tại — đã xác minh |
| Claim sai về nội dung (không phải hỏng neo) | 7 |

**Hai phát hiện lớn không có trong plan:**
1. `src/session/agent-session.ts:7607-7609` là call site thứ năm của `ManagedTimers` — commit 1 sẽ **không compile** nếu bỏ qua.
2. `RegisteredCommand` (`types.ts:1251-1256`) **không có trường owner** — owner point 4 cho slash command cần thêm cơ chế tra cứu mà plan không đề cập.
