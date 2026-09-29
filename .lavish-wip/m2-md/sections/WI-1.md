## WI-1. Gán timer và model-provider theo đúng extension đã tạo ra chúng, và thả chúng khi suspend

**Thay đổi gì:** Khi một extension bị vô hiệu hoá, các interval nền mà nó đã lên lịch và model provider mà nó đã đăng ký ngừng có tác dụng — và cả hai trở lại khi nó được bật lại.
**Wave:** Wave 2 — commit 1 (timers) ONLY. Commit 2 (providers + resume) thuộc Wave 4, được đặc tả ở đây nhưng MUST NOT được hiện thực trong PR của Wave 2.
**Effort:** Commit 1: XS — khoảng 20-25 dòng production đổi trên 3 file có sẵn, không file mới, không đổi public API. Commit 2: S — một field mới ~2 dòng trên interface `Extension`, một chỗ điền ~4 dòng trong một khối drain, một chèn ~6 dòng trong `reconcileExtensionSources`, cộng một file test mới. Tính cả file test: khoảng 120 dòng đổi.

**Người dùng thấy:** Tắt một extension trong phần cài đặt giờ thực sự dừng nó lại. Ngày nay một extension đã tắt mà đã lên lịch `ctx.setInterval` vẫn tiếp tục polling trên session sống mãi, và model provider tùy chỉnh của một extension đã tắt vẫn nằm trong `ModelRegistry` còn API key của nó vẫn nằm trong `authStorage` — nên một plugin mà người dùng đã tắt vẫn còn chạm tới mạng. Sau thay đổi này callback của interval ngừng gọi ngay khoảnh khắc extension bị suspend, các model của provider biến mất khỏi `/model` và key đã lưu của nó bị gỡ, và bật lại extension sẽ khôi phục cả hai. Người dùng thấy điều này qua luồng cài đặt sẵn có 'Restart omp to load newly enabled extensions': bật/tắt `extensions` / `disabledExtensions` giờ có tác dụng với công việc nền và provider, thay vì chỉ có tác dụng với commands, tools và renderers.

### File cần chạm tới

Quy tắc trích dẫn: chỉ mọi neo `file:line` xuất phát từ entry `verified: true` mới được coi là đã kiểm chứng. Entry của file test mới là `verified: false`; các neo tham chiếu tới file test khác (ví dụ `test/extensions-runner.test.ts:3956-4070`) cũng phải kiểm lại bằng lệnh thật trước khi dùng làm neo.

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/managed-timers.ts` | sửa | `readonly #timers = new Set<Timer>()` -> `readonly #timers = new Map<Timer, Extension>()`; `setInterval` và `setTimeout` nhận thêm tham số đầu `owner: Extension` và ghi lại nó; thêm `clearFor(owner: Extension)`; `clearAll()` duyệt `.keys()` thay vì duyệt trực tiếp tập. `clear(timer)` giữ nguyên ngữ nghĩa so khớp danh tính. `clearFor` phải xoá CẢ interval lẫn timeout thuộc extension đó, không chỉ interval — một one-shot đang chờ cũng là công việc nền. | có (verified: true) |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | Thêm private method `#ownTimers<T extends ExtensionContext>(ctx: T, owner: Extension): T` Object.create context và shadow `setInterval`/`setTimeout`/`clearTimer` bằng bản định tuyến owner. Áp dụng đúng bốn điểm: (1) lời gọi `createHandlerContext(...)` trong `#runHandlerWithTimeout` (~line 1405) thành `createHandlerContext(this.#ownTimers(ctx, ext), handlerSignal, ...)`; (2) trampoline file-write `const ctx = this.createContext()` (line 780) thành `this.#ownTimers(this.createContext(), ext)`; (3) trampoline file-delete, dòng line 799, y hệt; (4) `createCommandContext()` (runner.ts:1350-1352) là một **spread** — `{ ...this.createContext(), … }` — nên phải gọi `#ownTimers` TRƯỚC khi spread, đổi chữ ký thành `createCommandContext(owner: Extension)` và nối `owner` từ call site (`modes/controllers/input-controller.ts:2538`, `session/agent-session.ts:7378`). Điểm (4) là BẮT BUỘC, không tuỳ chọn: `ExtensionCommandContext extends ExtensionContext` (types.ts:572) nên slash command và shortcut có quyền gọi `ctx.setInterval`, mà spread hiện tại copy thẳng ba own property không-owner (`runner.ts:1304-1306`) vào command context. Bỏ qua nó thì timer do command/shortcut lên lịch mang owner sentinel, `clearFor` không bao giờ khớp, và timer sống mãi sau khi plugin bị tắt. Trong `setSuspendedExtensions` (~line 947-969) thêm `this.#managedTimers.clearFor(extension)` bên trong nhánh `if (suspend)`, sau `#suspendedExtensions.add(extension)`. | có (verified: true) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | COMMIT 1: KHÔNG thay đổi — chữ ký public `ExtensionContext.setInterval/setTimeout` (lines 516 và 522) phải giữ nguyên hình dạng hiện tại. COMMIT 2 ONLY: thêm `registeredProviders: Array<{ name: string; config: ProviderConfig }>` vào interface `Extension` (1802-1817). LƯU Ý API: `Extension` là type public — `src/index.ts:25` re-export barrel `src/extensibility/extensions`, và barrel đó có `export * from "./types"` — nên một field BẮT BUỘC (không phải optional) là một thay đổi type phá vỡ tương thích với code dựng `Extension` bên ngoài repo. `createExtension` (loader.ts:374, gọi từ 450 và 471) là nơi DUY NHẤT dựng object `Extension`, nên seed tại đó là đủ và `check:types` bắt được chỗ sót; nhưng bước 11 phải nêu việc này trong PR body, không chỉ nêu hành vi người dùng. | có (verified: true) |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | COMMIT 2 ONLY: gieo `registeredProviders: []` vào object literal trả về bởi `createExtension` (lines 374-390). Không thay đổi gì khác — `registerProvider` ở line 362-364 đã truyền `this.extension.path` làm sourceId. | có (verified: true) |
| `packages/coding-agent/src/sdk.ts` | sửa | COMMIT 2 ONLY, hai chỗ sửa. (a) Tại khối drain của session (lines 2487-2492, bên trong `createAgentSessionScoped` khai báo ở 1493): dựng `new Map(extensionsResult.extensions.map(e => [e.path, e]))`, và bên trong vòng lặp đăng ký sẵn có thì push `{ name, config }` vào `extensionsByPath.get(sourceId)?.registeredProviders`. (b) Trong `reconcileExtensionSources` (lines 4566-4630), ngay sau lời gọi `setSuspendedExtensions` tại 4579-4581: gọi `modelRegistry.syncExtensionSources(extensionRunner.getExtensionPaths())`, rồi duyệt `for (const extension of resumed)` gọi lại `modelRegistry.registerProvider(name, config, extension.path)` từ `extension.registeredProviders`. | có (verified: true) |
| `packages/coding-agent/src/config/model-registry.ts` | không sửa (chỉ đọc) | NO CHANGE. File này được đọc, không sửa: `syncExtensionSources` (2955-2965) và `clearSourceRegistrations` (2914-2932) là các primitive mà commit 2 tái sử dụng, còn `#runtimeProvidersBySource` / `#runtimeProviderSourceByName` (303-304) là tiền lệ đã có cho quan hệ source↔name mà retention record của WI-1 phản chiếu ở một tầng cao hơn. Nếu bạn thấy mình đang sửa file này thì call site mới sai, không phải primitive. | có (verified: true) |
| `packages/coding-agent/test/extension-suspend-teardown.test.ts` | tạo | File test mới, ba case theo `test_contract`: (1) timer chết sau suspend, có một extension thứ hai chứng minh extension bên cạnh còn sống; (2) timer sống sau resume; (3) provider biến mất sau suspend và trở lại sau resume. | **KHÔNG** — `verified: false`. File chưa tồn tại: `ls packages/coding-agent/test/ \| grep -i suspend` chỉ trả về `input-controller-suspend.test.ts` (về input controller ở interactive mode, không liên quan tới suspend extension). Không test nào trong repo hiện gọi `setSuspendedExtensions` (`grep -ln setSuspendedExtensions test/*.ts` trả về rỗng), nên case 1 và 2 thực sự chưa được che phủ. |

Ghi chú đã kiểm chứng cho từng file production:

- `managed-timers.ts`: file tồn tại, 2.9 KB, 83 dòng. `#timers` ở line 23; `clear` ở 51-55; `clearAll` ở 58-64. Câu `constructor(private readonly onError: ...)` ở line 25 ĐÃ hợp lệ dưới AGENTS.md (từ khoá `private` được phép trên constructor parameter property) — để nguyên. Lệnh import mới `import type { Extension } from "./types"` là type-only và bị xoá lúc compile; `types.ts` không import `managed-timers.ts` nên không sinh runtime cycle.
- `runner.ts`: file tồn tại, 73 KB. Số dòng đã kiểm chứng tại HEAD `808b365`, và chúng LỆCH so với plan khoảng +13: `#managedTimers` ở 518 (plan nói 507); lời gọi `clearManagedTimers()` duy nhất ở 411 (plan nói 408); `setSuspendedExtensions` trải 947-969 (plan nói 934-956); hai cổng `#suspendedExtensions.has(ext)` của trampoline ở 779 và 798 (plan nói 766 và 785); chữ ký `createContext` ở 1242 (plan nói 1229); hai arrow property `setInterval`/`setTimeout` không owner ở 1304-1305 (plan nói 1290-1291); `clearManagedTimers()` định nghĩa ở 1336-1337; `createHandlerContext` ở 230-241 (plan nói 227-239); `#runHandlerWithTimeout` khai báo ở 1375 (plan nói 1361). 12 call site của `#runHandlerWithTimeout` là 1480, 1493, 1538, 1600, 1651, 1686, 1723, 1770, 1831, 1869, 1896, 1945 — đếm 12 ĐÃ XÁC NHẬN, mỗi cái lệch +14 so với danh sách của plan. `getExtensionPaths()` ở 927-929. `#suspendedExtensions` khai báo ở 487.
- `types.ts`: COMMIT 1 MUST NOT chạm file này — đó chính là ý nghĩa của việc định tuyến owner qua chữ ký internal của `ManagedTimers` thay vì qua chữ ký public. Với commit 2: interface `Extension` ở 1802-1817, KHÔNG phải 1777-1792 như plan trích (xem đính chính #4). `path` là 1803, `resolvedPath` là 1804 — cả hai đã có sẵn, nên tương ứng resolvedPath→path mà plan yêu cầu không cần dựng. `ProviderConfig` được KHAI BÁO ngay trong file này (`export interface ProviderConfig` ở line 1589; dùng ở 1570, 1741, 1743), nên không cần import mới.
- `loader.ts`: COMMIT 1 MUST NOT chạm file này. Đã kiểm chứng: `pendingProviderRegistrations` khai báo ở line 102 và push ở 105, khớp plan chính xác; `registerProvider(name, config, sourceId)` ở line 362 với `this.runtime.registerProvider(name, config, this.extension.path)` ở line 363 — cũng chính xác. Checkpoint rollback factory ở 402-411 splice cùng mảng đó, nên một factory ném lỗi sẽ unwind các đăng ký đang chờ; đường đó không bị ảnh hưởng vì retention record chỉ được ghi ở drain, sau khi load đã thành công.
- `sdk.ts`: COMMIT 1 MUST NOT chạm file này — nếu chạm thì nửa provider đã lẫn vào PR của Wave 2. Tại HEAD các neo sdk.ts là khớp tốt nhất của plan: 1002-1004 (sync/clear trong `loadCliExtensionProviders`, khai báo ở 995) và 1006-1009 (drain một lần) là CHÍNH XÁC; 2482 và 2484 (sync/clear) là CHÍNH XÁC; 2487-2491 lệch một dòng (khối đóng ở 2492); `new ExtensionRunner(` ở 3074 là CHÍNH XÁC. Các neo reconcile lệch +6 so với plan: hàm ở 4566 (plan nói 4560), `resetCapabilities()` ở 4571 (plan nói 4565), `await Promise.all([...])` ở 4573-4576 (plan nói 4567-4570), `setSuspendedExtensions` ở 4579 (plan nói 4573). Một chi tiết cấu trúc có ý nghĩa: khối drain 2487-2492 cố ý nằm NGOÀI guard `if (!restrictToolNames)` bọc quanh 2481-2486, nên retention record vẫn được ghi kể cả trong session giới hạn tool name — giữ nguyên như vậy. `getExtensionPaths()` trả `this.extensions.map(e => e.path)`, và `setSuspendedExtensions` đã splice mảng đó về tập active, nên nó đúng là danh sách source-id active mà `syncExtensionSources` cần.
- `config/model-registry.ts`: cả ba neo của plan đều CHÍNH XÁC và còn hiện hành: 303-304, 2914, 2955. `syncExtensionSources` prune mọi entry của `#registeredProviderSources` (khai báo 271, điền ở 3009) vắng mặt khỏi danh sách active, gọi `clearSourceRegistrations` rồi xoá entry khỏi set — điều đó kéo theo việc gỡ auth key qua `#clearRuntimeProviderState` (quanh 2905-2909, `this.authStorage.keys.removeConfig(providerName)`). Đó chính là cơ chế mà case 3 của test contract quan sát.

### Các bước

1. **Viết test đỏ trước, chưa đụng source.** File: `packages/coding-agent/test/extension-suspend-teardown.test.ts`. Case 1 và 2 (timers) đi qua ĐƯỜNG EVENT: nạp hai file fixture extension, mỗi cái đăng ký một handler `session_start` gọi `ctx.setInterval`; dựng runner bằng `loadExtensions` + `new ExtensionRunner(...)` theo đúng hình dạng dùng ở `test/extensions-runner.test.ts:3956-4070`; chạy bằng `await runner.emit({ type: 'session_start' })`; rồi gọi `runner.setSuspendedExtensions(ext => ext === a)` và đẩy fake timer. Case 3 (providers) dùng lại fixture `ModelRegistry` từ `test/model-registry-runtime-cleanup.test.ts`. Xác nhận cả hai case timer đỏ vì đúng lý do (bộ đếm callback vẫn leo) trước khi viết bất kỳ bản sửa nào. Case provider (case 3) KHÔNG viết ở PR Wave 2 — nó thuộc commit 2 / Wave 4, và gate của Wave 2 là 2 passing, 0 failing (xem mục "Cổng hoàn thành").
2. **Sửa `managed-timers.ts`** (`packages/coding-agent/src/extensibility/extensions/managed-timers.ts`). Áp khối managed-timers trong `code_shape`: thêm `import type { Extension } from "./types"` (khoảng line 18, sau import logger sẵn có), đổi `#timers` thành `Map<Timer, Extension>`, thêm tham số đầu `owner: Extension` cho `setInterval` và `setTimeout` với `this.#timers.set(timer, owner)`, và thêm `clearFor(owner: Extension)` cạnh `clearAll()`. Để nguyên ngữ nghĩa `clear()` và thân `#run` / `#report`. Cập nhật câu về `clearAll` trong docblock của class để nhắc `clearFor`.
3. **Thêm method `#ownTimers` vào `runner.ts`** (`packages/coding-agent/src/extensibility/extensions/runner.ts`). Thêm private method `#ownTimers<T extends ExtensionContext>(ctx: T, owner: Extension): T`. Đặt nó ngay trước `#runHandlerWithTimeout` (~line 1375), để cơ chế và bốn call site của nó nằm cạnh nhau. Method phải dùng `Object.create(ctx)` cộng `Object.defineProperties` với `enumerable: true, configurable: true` — khớp cách `createHandlerContext` (line 236-239) định nghĩa override `ui`, để các timer bị shadow nhìn thấy được qua liệt kê thuộc tính y như những cái mà nó thay thế.
4. **Nối BỐN điểm owner, và tự đếm lại xem có đúng bốn không.** (0) Điểm thứ tư mà bản thảo ban đầu bỏ sót: `createCommandContext()` (`runner.ts:1350-1352`) làm `{ ...this.createContext(), … }` — một **spread**, nên nó copy thẳng ba own property không-owner (`setInterval`/`setTimeout`/`clearTimer` ở `runner.ts:1304-1306`) vào `ExtensionCommandContext`. Vì `ExtensionCommandContext extends ExtensionContext` (`types.ts:572`), một slash command hay shortcut **có quyền** gọi `ctx.setInterval` — và đường đó đang sống: `modes/controllers/input-controller.ts:2538` và `session/agent-session.ts:7378, 7396, 7494`. Bỏ qua điểm này thì timer do command/shortcut lên lịch mang owner là sentinel `UNOWNED_TIMERS`, `clearFor(extension)` quét Map thấy `timerOwner !== owner` nên bỏ qua, và timer sống mãi sau khi plugin bị tắt. Sửa bằng cách gọi `#ownTimers` trong `createCommandContext` **trước** khi spread. (1) ở ~line 1405, đổi `createHandlerContext(ctx, handlerSignal, event.type === 'tool_call' ? budget : undefined)` để truyền `this.#ownTimers(ctx, ext)` làm đối số đầu. (2) ở line 780 (trampoline file-write) đổi `const ctx = this.createContext();` thành `const ctx = this.#ownTimers(this.createContext(), ext);`. (3) ở line 799 (trampoline file-delete), đổi y hệt. Sau đó chạy `grep -c 'this.#ownTimers(' packages/coding-agent/src/extensibility/extensions/runner.ts` — nó phải in ra **4**: `grep -c` đếm SỐ DÒNG khớp, định nghĩa method ở bước 3 là `#ownTimers<T extends ExtensionContext>(...)` nên KHÔNG có tiền tố `this.` và không được đếm, còn lại đúng bốn call site. Đối chiếu bằng tay với bốn điểm — đây đúng là chỗ dễ bỏ sót mà khiến lỗi vẫn sống. (Xem mục "Cần người xác nhận" về cách đếm mâu thuẫn trong đặc tả.)
5. **Thả timer khi suspend.** Trong `setSuspendedExtensions` (~947-969), thêm `this.#managedTimers.clearFor(extension);` bên trong nhánh `if (suspend)`, giữa `this.#suspendedExtensions.add(extension)` và `suspended.push(extension)`. KHÔNG thêm gì vào nhánh `else` (resume). Mở rộng docblock của method bằng một câu nói rằng một extension bị suspend còn mất luôn việc qua `ctx.setInterval` / `ctx.setTimeout`, vì đó là hành vi người gọi giờ quan sát được.
6. **Cập nhật hai call site `ManagedTimers` bên trong `createContext`** (`packages/coding-agent/src/extensibility/extensions/runner.ts`, lines 1304-1305) — chúng không còn type-check vì `setInterval` đã có tham số đầu `owner`. Hai chỗ này PHẢI tiếp tục không có owner (chúng dựng prototype context dùng chung); cách sửa tối thiểu là truyền sentinel scope của chính context. Nếu TypeScript bắt buộc một giá trị thật, câu trả lời đúng là sentinel `const UNOWNED_TIMERS: Extension = ...` ở cấp module mà `clearFor` không bao giờ khớp, TUYỆT ĐỐI KHÔNG phải một extension thật — vì ở thời điểm đó chưa biết extension nào. Kiểm bốn case 'managed timers' có sẵn ở `test/extensions-runner.test.ts:3956-4070` vẫn pass: CẢ BỐN case đều gọi trực tiếp `runner.createContext()` không owner (dòng 3970, 4002, 4025, 4052) và phải tiếp tục chạy được. (Neo test chưa được đánh dấu verified.)
7. **DỪNG TẠI ĐÂY. Đây là hết PR của Wave 2.** Kiểm bằng `cd packages/coding-agent && bun run check:types` (baseline 0 lỗi, exit 0) và `bun --cwd=packages/natives run build && cd packages/coding-agent && bun test test/extension-suspend-teardown.test.ts test/extensions-runner.test.ts test/model-registry-runtime-cleanup.test.ts` (0 failure). Case provider chưa được viết ở Wave 2 và cũng không được hiện thực trong PR này — nó thuộc commit 2 / Wave 4, nơi bar mới là 3 passing, 0 failing.
8. **COMMIT 2 / WAVE 4 ONLY.** Thêm `registeredProviders: Array<{ name: string; config: ProviderConfig }>` vào interface `Extension` (`types.ts:1802-1817`) kèm docblock trong `code_shape`, và gieo `registeredProviders: []` trong `createExtension` ở `loader.ts` (374-390). Sửa cả hai hoặc không sửa cái nào — thiếu seed sẽ làm vòng drain ném lỗi ở `undefined.push`.
9. **COMMIT 2 / WAVE 4 ONLY.** Tại drain của session (`sdk.ts:2487-2492`), dựng map `extensionsByPath` và push `{ name, config }` vào extension khớp bên trong vòng lặp đăng ký sẵn có. Để nguyên drain `sdk.ts:1006-1009` (`loadCliExtensionProviders`) và drain `cli/models-cli.ts:359-362` — nói rõ trong PR body thay vì âm thầm bỏ qua, vì cả hai là chủ ý, không phải sơ suất.
10. **COMMIT 2 / WAVE 4 ONLY.** Trong `reconcileExtensionSources`, chèn cặp prune-rồi-đăng-ký-lại ngay sau lời gọi `setSuspendedExtensions` tại 4579-4581. Thứ tự có tính tải trọng: `syncExtensionSources` trước (nó prune mọi source đã đăng ký mà vắng khỏi danh sách), rồi mới vòng đăng ký lại khi resume. Đảo thứ tự sẽ thêm lại một source rồi lập tức bị sync kế tiếp loại bỏ. Chú thích lời gọi bằng lý do `extension.path` là khoá đúng còn `resolvedPath` thì không.
11. **COMMIT 2 / WAVE 4 ONLY.** Thêm mục changelog dưới `## [Unreleased]` trong `packages/coding-agent/CHANGELOG.md`, một dòng, hướng tới người dùng: tắt một extension giờ dừng các timer nền của nó và gỡ model provider của nó, và bật lại sẽ khôi phục. Không có issue link nào khả dụng (điều này bắt nguồn từ upgrade plan, không phải issue đã filed), nên để trống attribution thay vì bịa một số.

### Hình dạng code

```typescript
// ---------------------------------------------------------------------------
// COMMIT 1 — managed-timers.ts. `#timers` becomes Map<Timer, Extension> so a
// timer remembers WHO scheduled it. `clearAll()` stays for session teardown.
// The import is `import type` so it is erased at compile time and cannot form a
// runtime cycle with types.ts (types.ts never imports managed-timers.ts).
// ---------------------------------------------------------------------------
import type { Extension } from "./types";

export class ManagedTimers {
	#timers = new Map<Timer, Extension>();

	constructor(private readonly onError: ManagedTimerErrorHandler) {}

	setInterval(owner: Extension, callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer {
		const timer = setInterval(() => this.#run("interval", callback, args), ms, ...args);
		timer.unref?.();
		this.#timers.set(timer, owner);
		return timer;
	}

	setTimeout(owner: Extension, callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer {
		const timer = setTimeout(
			() => {
				this.#timers.delete(timer);
				this.#run("timeout", callback, args);
			},
			ms,
			...args,
		);
		timer.unref?.();
		this.#timers.set(timer, owner);
		return timer;
	}

	/** Clear one managed timer. Accepts an interval or timeout handle. */
	clear(timer: Timer): void {
		if (!this.#timers.delete(timer)) return;
		clearInterval(timer);
		clearTimeout(timer);
	}

	/**
	 * Clear every timer one extension scheduled, leaving every other extension's
	 * timers running. Called when an extension is suspended: a disabled extension
	 * must stop doing background work, but its neighbours must not.
	 */
	clearFor(owner: Extension): void {
		// Deleting the current entry mid-iteration is defined for Map.
		for (const [timer, timerOwner] of this.#timers) {
			if (timerOwner !== owner) continue;
			clearInterval(timer);
			clearTimeout(timer);
			this.#timers.delete(timer);
		}
	}

	/** Clear every outstanding managed timer. Called on session teardown. */
	clearAll(): void {
		for (const timer of this.#timers.keys()) {
			clearInterval(timer);
			clearTimeout(timer);
		}
		this.#timers.clear();
	}
	// #run / #report unchanged
}

// ---------------------------------------------------------------------------
// COMMIT 1 — runner.ts. ONE new private method is the whole mechanism; there is
// no DisposableList, no effect() helper, no disposer registry. Object.create
// shadowing is what makes this work: createContext() returns a plain object
// literal whose OWN setInterval/setTimeout/clearTimer properties are the
// ownerless versions (runner.ts:1304-1306), and createHandlerContext
// (runner.ts:230-241) is already Object.create(ctx) — so that literal becomes
// the handler context's prototype and the ownerless versions are inherited
// unless we shadow them on the handler context's own object.
// ---------------------------------------------------------------------------

	/**
	 * Bind a context to the extension whose handler is about to run, so every
	 * timer it schedules through `ctx.setInterval` / `ctx.setTimeout` records an
	 * owner and can be released the moment that extension is suspended.
	 *
	 * This is the ONLY place owner is attached, and it is a method (not a
	 * `createContext()` parameter) because 12 of the 15 `createContext()` call
	 * sites feed ONE shared per-event context into `#runHandlerWithTimeout` — an
	 * owner threaded through there would be `undefined` for all of them. The 15
	 * split as 2 file trampolines (780, 799) + 1 `createCommandContext` spread
	 * (1352) + these 12.
	 */
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

	// OWNER POINT 1 of 4 — runner.ts:1375 `#runHandlerWithTimeout` already
	// receives `ext` as its 4th parameter. Hand it the owned context instead of
	// the raw one; createHandlerContext then layers `ui` on top of the owned
	// object, so the owner shadow survives the second Object.create.
	//
	//   BEFORE (runner.ts:1405-1408)
	//     const handlerContext = createHandlerContext(
	//         ctx, handlerSignal,
	//         event.type === "tool_call" ? budget : undefined,
	//     );
	//   AFTER
	//     const handlerContext = createHandlerContext(
	//         this.#ownTimers(ctx, ext),
	//         handlerSignal,
	//         event.type === "tool_call" ? budget : undefined,
	//     );

	// OWNER POINTS 2 and 3 of 4 — the two file-fallback trampolines. These call
	// the handler DIRECTLY (runner.ts:781 and :800), never through
	// #runHandlerWithTimeout, and they already close over `ext`. Same one-liner:
	//
	//   BEFORE (runner.ts:780)   const ctx = this.createContext();
	//   AFTER                   const ctx = this.#ownTimers(this.createContext(), ext);
	//   BEFORE (runner.ts:799)   const ctx = this.createContext();
	//   AFTER                   const ctx = this.#ownTimers(this.createContext(), ext);
	//
	// These two are NOT redundant with owner point 1: they are the only handlers
	// that bypass #runHandlerWithTimeout.

	// OWNER POINT 4 of 4 — runner.ts:1350-1352 `createCommandContext`. This one is
	// a SPREAD, so #ownTimers must run BEFORE the spread; the owner is whichever
	// extension registered the command / shortcut, threaded in by the caller.
	//
	//   BEFORE (runner.ts:1350-1352)
	//     createCommandContext(): ExtensionCommandContext {
	//       return { ...this.createContext(), /* ... */ };
	//   AFTER
	//     createCommandContext(owner: Extension): ExtensionCommandContext {
	//       return { ...this.#ownTimers(this.createContext(), owner), /* ... */ };
	//
	// Call sites to thread `owner` from: modes/controllers/input-controller.ts:2538
	// (the shortcut's own registration) and session/agent-session.ts:7378 / :7396
	// (the command's own registration). Object.create shadowing cannot compose with
	// a spread on its own — wrap FIRST, spread second.

	// Release on suspend — runner.ts:947-969 `setSuspendedExtensions`, the
	// `if (suspend)` branch. `clearFor` is scoped to this one extension, so a
	// sibling extension's timers keep firing.
	//
	//     if (suspend) {
	//         this.#suspendedExtensions.add(extension);
	//         this.#managedTimers.clearFor(extension);
	//         suspended.push(extension);
	//     }
	//
	// Do NOT add a clearFor call to the `else` (resume) branch. A resumed
	// extension's timers were already destroyed; see open_questions #1.

// ---------------------------------------------------------------------------
// COMMIT 1 — types.ts. NO CHANGE. `ExtensionContext.setInterval/setTimeout`
// (types.ts:516 and :522) are the extension-facing public API and keep their
// current `(callback, ms?, ...args)` shape; only the INTERNAL ManagedTimers
// signature gains the leading owner. If you find yourself wanting to change
// types.ts here, you have changed a public API that extensions already call.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// COMMIT 2 — types.ts:1802-1817. The retention record lives on `Extension`,
// NOT on `ExtensionRuntime`: ExtensionRuntime is ONE instance per session
// (loader.ts:101), so a per-extension map hung off it is precisely the
// shared-state-without-an-owner defect this work item exists to fix.
// ---------------------------------------------------------------------------
export interface Extension {
	path: string;
	resolvedPath: string;
	// ... existing fields, unchanged ...
	/**
	 * Providers this extension registered, retained for the life of the
	 * extension. `runtime.pendingProviderRegistrations` is destructively drained
	 * (all three consumers reassign `[]`), so a resume cannot re-read it — this is
	 * the only record that survives a suspend/resume cycle.
	 */
	registeredProviders: Array<{ name: string; config: ProviderConfig }>;
}

// loader.ts:374-390 `createExtension` must seed the new field:
//     registeredProviders: [],
// A missing seed means `undefined.push(...)` throws inside the drain loop.

// ---------------------------------------------------------------------------
// COMMIT 2 — sdk.ts:2487-2492, the SESSION drain inside
// createAgentSessionScoped (declared at sdk.ts:1493). This is the only drain
// that matters, because the Extension objects it drains into are the same
// objects handed to `new ExtensionRunner(extensionsResult.extensions, ...)` at
// sdk.ts:3074 — i.e. the same objects setSuspendedExtensions hands back to the
// reconcile loop. Do NOT replicate this in the other two drains:
//   sdk.ts:1006-1009  loadCliExtensionProviders — one-shot CLI commands only,
//                     never reached from createAgentSessionScoped. Filling the
//                     record here leaves it empty in every interactive session.
//   cli/models-cli.ts:359-362 — `omp models`, a one-shot command with no
//                     suspend/resume cycle. Out of scope, say so in the PR body.
// ---------------------------------------------------------------------------
	if (extensionsResult.runtime.pendingProviderRegistrations.length > 0) {
		// One pass over the drained queue: register into the registry AND retain for
		// a later resume. `sourceId` IS `extension.path` — loader.ts:363 passes
		// `this.extension.path` down to `runtime.registerProvider` — so the lookup
		// is exact and needs no resolvedPath->path normalisation.
		const extensionsByPath = new Map(extensionsResult.extensions.map(extension => [extension.path, extension]));
		for (const { name, config, sourceId } of extensionsResult.runtime.pendingProviderRegistrations) {
			modelRegistry.registerProvider(name, config, sourceId);
			extensionsByPath.get(sourceId)?.registeredProviders.push({ name, config });
		}
		extensionsResult.runtime.pendingProviderRegistrations = [];
	}

// ---------------------------------------------------------------------------
// COMMIT 2 — sdk.ts:4566-4630 `reconcileExtensionSources`. The insertion goes
// AFTER the `await Promise.all([...])` at :4573-4576 and AFTER the
// `setSuspendedExtensions` call at :4579, for three reasons:
//   (1) it is a synchronous prune + re-register; placing it after the discover
//       await keeps the reconcile loop from blocking on it,
//   (2) it must observe the post-suspend `this.extensions` splice that
//       setSuspendedExtensions performs at :966-967,
//   (3) resetCapabilities() at :4571 runs before the await and is about the
//       filesystem cache, not provider state — there is no ordering constraint
//       between them, so leave it where it is.
// PRUNE FIRST, then RE-REGISTER. The reverse order re-adds a source and then
// immediately prunes it, because syncExtensionSources drops every registered
// source not present in the active list.
// ---------------------------------------------------------------------------
		const { suspended, resumed } = extensionRunner.setSuspendedExtensions(
			extension => governed.has(extension.resolvedPath) && !enabled.has(extension.resolvedPath),
		);

		// A suspended extension must stop contributing model providers. The active
		// source ids are `extension.path` — the same key registerProvider was called
		// with (loader.ts:363) — not `resolvedPath`, which is only the key the
		// governed/enabled sets above are built in.
		modelRegistry.syncExtensionSources(extensionRunner.getExtensionPaths());
		// Resume cannot re-read pendingProviderRegistrations: it is destructively
		// drained at :2491. The retained per-extension record is the only source.
		for (const extension of resumed) {
			for (const { name, config } of extension.registeredProviders) {
				modelRegistry.registerProvider(name, config, extension.path);
			}
		}

// `getExtensionPaths()` (runner.ts:927-929) is `this.extensions.map(e => e.path)`,
// and setSuspendedExtensions has already spliced this.extensions down to the
// active set — so it is exactly the active source id list syncExtensionSources
// needs. No new runner method is required.
```

### Hợp đồng test

Tóm tắt: Suspend một extension dừng đúng các callback mà chính extension đó đã lên lịch và đúng provider mà nó đã đăng ký — không hơn, không kém — và resume khôi phục cả hai. Nửa "không hơn" được khẳng định bằng hai extension để bắt được lỗi owner gắn nhầm từ context dùng chung; nửa "không kém" được khẳng định bằng một extension thứ hai có timer phải tiếp tục chạy trong khi láng giềng của nó đang bị suspend.

Nếu hồi quy, người tiêu dùng thấy:

- **Với timer:** ngày nay `ctx.setInterval` của một extension đã tắt vẫn nổ suốt đời session. Không gì ném lỗi, không gì được ghi log — một plugin đã tắt âm thầm vẫn polling ổ đĩa, mạng, hay một LLM. Nếu owner bị gán sai từ `ctx` dùng chung, lỗi đó là một bug-DISABLED trông như một bản sửa: suspend extension A cũng giết luôn timer khoẻ của extension B, và B vẫn chết sau khi A được resume. Nếu timer không bao giờ được khởi động lại trên đường resume, một extension vốn polling sẽ ngừng polling vĩnh viễn sau một vòng tắt/bật.
- **Với provider:** provider tùy chỉnh của một extension đã tắt vẫn resolve được qua `ModelRegistry`, API key đã lưu vẫn nằm trong `authStorage.keys`, và `omp models` vẫn liệt kê nó — nên "tôi đã tắt plugin" không xoá được credential mà nó được cấp. Nếu thiếu resume, lỗi đối xứng còn tệ hơn: bật lại plugin không khôi phục gì cả và provider của người dùng đơn giản là biến mất mà không có lỗi nào ở đâu.

Các case cụ thể, với tên file test: `packages/coding-agent/test/extension-suspend-teardown.test.ts` (file mới, chưa tồn tại — `verified: false`).

1. **TIMER DEAD AFTER SUSPEND, and the sibling extension's timer survives** — bảo vệ hợp đồng duy nhất "tắt một extension dừng việc nền của nó, và chỉ của nó". Trên HEAD nó đỏ vì bộ đếm callback vẫn tăng sau khi suspend: `#timers` là một `Set<Timer>` (`managed-timers.ts:23`) không có owner, và `setSuspendedExtensions` (`runner.ts:947-969`) chỉ chạm vào `#suspendedExtensions` cùng mảng `extensions` — không gì tới timer. Chi tiết then chốt: handler BẮT BUỘC được đăng ký trên một event thật (`session_start`) và đi qua `runner.emit(...)`, KHÔNG đi qua các trampoline fallback ghi/xoá file. Các trampoline chỉ nổ khi agent cố biến đổi file, nên test viết theo chúng sẽ pass trên một bản hiện thực chỉ gán owner ở `runner.ts:779-780` và `:798-799` — tức là pass trên đúng cái lỗi mà nó sinh ra để bắt. Assertions: bộ đếm tick của extension A >= 1 trước khi suspend; sau `runner.setSuspendedExtensions(ext => ext === A)`, `vi.advanceTimersByTime(5000)` giữ nguyên bộ đếm của A trong khi session vẫn sống; bộ đếm của extension B TĂNG qua cùng cửa sổ đó — so sánh cùng một tick thì chưa đủ, B phải chứng minh được nó tiến triển trong khi A thì không.
2. **TIMER ALIVE AFTER RESUME** — bảo vệ việc xoá lúc suspend không biến thành "xoá vĩnh viễn". Một extension bị suspend không phải bị unload, nên ngay khoảnh khắc nó resume handler phải lên lịch được việc nền có quản lý và việc đó phải nổ. Nếu commit 1 sai (thỏa mãn gate 1 bằng cách không bao giờ lên lịch interval, hoặc bằng cách xoá ở cả nhánh resume lẫn nhánh suspend) thì bộ đếm vẫn bằng 0 sau resume. Case này pass hụt trên HEAD chưa sửa gì vì chưa có gì bị xoá. Assertions: sau `runner.setSuspendedExtensions(ext => ext === A)` với A không còn khớp, emit lại event đó sẽ chạy lại handler của A; bộ đếm do lần gọi handler THỨ HAI tạo ra tăng — đây là timer mới, không phải timer trước suspend, và test không được assert trên handle `Timer` cũ; handle trước-suspend thực sự đã mất: giữ tham chiếu tới nó rồi đẩy thời gian không hồi sinh callback cũ.
3. **PROVIDER GONE AFTER SUSPEND, and back after RESUME** — bảo vệ việc một extension đã tắt không đóng góp model provider và không giữ credential, và bật lại khôi phục cả hai. Trên HEAD nó đỏ vì `reconcileExtensionSources` (`sdk.ts:4566-4630`) chỉ gọi `resetCapabilities()` (`:4571`) và `setSuspendedExtensions()` (`:4579`). Nó không bao giờ gọi `modelRegistry.syncExtensionSources`, nên provider vẫn đăng ký và key vẫn nằm trong auth storage. Assertions: `registry.find(providerName, modelId)` defined sau khi đăng ký; sau suspend reconcile thì `registry.find(providerName, modelId)` là `undefined`; sau suspend reconcile thì `registry.authStorage.keys.source(providerName)` là `undefined` — credential bị gỡ, không chỉ overlay model; sau resume reconcile thì cả hai defined trở lại — đây là nửa đòi hỏi retention record, vì `pendingProviderRegistrations` đã bị drain phá huỷ. Chi tiết then chốt: assert trên bề mặt QUAN SÁT ĐƯỢC (`registry.find(...)`, `registry.authStorage.keys.source(...)`), đúng kiểu đã được chứng minh trong `test/model-registry-runtime-cleanup.test.ts`. KHÔNG assert `#runtimeProvidersBySource` hay field private nào khác — một assertion trên field private sẽ pass ngay cả khi `syncExtensionSources` được gọi nhưng việc đăng ký lại không bao giờ xảy ra.

Quy tắc dựng test:

- TUYỆT ĐỐI không dùng `mock.module()` — AGENTS.md cấm vì cách hiện thực của Bun rò rỉ qua các file test. Dùng `vi.spyOn` trên module object đã import, kèm `vi.restoreAllMocks()` trong `afterEach`.
- TUYỆT ĐỐI không đọc một file hiện thực rồi assert trên văn bản của nó. Gate 1 và gate 3 phải đỏ được khi source chưa đụng tới.
- Dùng `vi.useFakeTimers()` / `vi.advanceTimersByTime` trong try/finally khôi phục timer thật, khớp bốn case 'managed timers' sẵn có ở `test/extensions-runner.test.ts:3956-4070`. File đó là hình mẫu tham chiếu cho `new ExtensionRunner(extensions, new ExtensionRuntime(), cwd, sessionManager, modelRegistry)` dạng trần.
- Với case provider, dùng lại fixture từ `test/model-registry-runtime-cleanup.test.ts`: `AuthStorage.create(':memory:')` và `new ModelRegistry(authStorage, undefined, { ignoreLocalModelConfig: true })`, kèm `clearCustomApis()` và `authStorage.close()` trong `afterEach` để test an toàn khi chạy cả suite.

### Xác minh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun --cwd=packages/natives run build   # MỘT LẦN cho mỗi máy; thiếu nó thì mọi `bun test` đều báo 0 pass kèm 'Failed to load pi_natives native addon for darwin-arm64' (tái hiện tại HEAD: 0 pass, 1 fail, 1 error)
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types   # tsgo -p tsconfig.json --noEmit; baseline tại 808b365 là exit 0 với không lỗi nào, nên thanh là KHÔNG lỗi
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/extension-suspend-teardown.test.ts   # file mới; ở Wave 2 case 1 và case 2 phải là 2 passing, 0 failing, và lần chạy KHÔNG được in lỗi addon pi_natives
# File mới test/extension-suspend-teardown.test.ts ở PR Wave 2 chỉ chứa case 1 và case 2 và phải xanh hết;
# case provider KHÔNG được viết cho tới Wave 4 — bar đầy đủ 3 case chỉ thành cổng ở Wave 4.
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/model-registry-runtime-cleanup.test.ts   # không hồi quy ở primitive mà call site mới tái sử dụng
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/extensions-runner.test.ts   # bốn case 'managed timers' sẵn có ở :3956-4070 phải vẫn pass; CẢ BỐN đều gọi trực tiếp `runner.createContext()` không owner (dòng 3970, 4002, 4025, 4052), nên chúng cố tình đi trên đường context không owner
```

Kiểm tra độ hợp lý của diff:

```bash
# `git diff --stat` của commit 1 phải chạm đúng 2 file: src/extensibility/extensions/managed-timers.ts và src/extensibility/extensions/runner.ts. Nếu file thứ ba xuất hiện, đó là types.ts bị lỡ tay — bốn chỗ khác trong đặc tả nói commit 1 KHÔNG được chạm types.ts (xem mục "Cần người xác nhận"). Nếu file thứ tư xuất hiện, một abstraction mới đã lọt vào: quy tắc Central Utilities của AGENTS.md cộng lệnh cấm DisposableList / effect() của plan nghĩa là `ManagedTimers.clearFor` phải là bề mặt mới DUY NHẤT.
grep -n 'this\.createContext(' packages/coding-agent/src/extensibility/extensions/runner.ts | wc -l   # vẫn phải in ra 15. Nếu in 16, ai đó đã luồn owner qua `createContext()` — đó là thiết kế sai và 12 call site dùng chung ctx sẽ nhận `undefined`.
# diff của commit-1 KHÔNG được chạm sdk.ts. Nếu chạm, nửa provider đã lẫn vào PR Wave 2.
```

KHÔNG dùng làm cổng:

- `bun check` ở thư mục gốc repo — nó là `check:ts` + `check:rs` chạy song song và nửa Rust cần cargo toolchain trong nhiều phút. `bun run check:types` bên trong `packages/coding-agent` là cổng nhanh và đủ cho thay đổi này.
- `tsc` / `npx tsc` — bị AGENTS.md cấm; script của package là `tsgo -p tsconfig.json --noEmit`.
- Một source grep kiểu `grep -c clearFor runner.ts` — AGENTS.md cấm các test assert trên văn bản file hiện thực, và như một kiểm tra thủ công thì nó không chứng minh gì về hành vi.

### Cổng hoàn thành

Ba khẳng định. (1) và (3) đỏ trên HEAD hôm nay và xanh khi công việc này đáp; (2) pass hụt trên HEAD và chỉ thành một cổng thật khi commit 1 đã đất (xem đính chính #7 — KHÔNG báo nó là đỏ-trước / xanh-sau).

1. **TIMER DEAD AFTER SUSPEND** — một extension lên lịch `ctx.setInterval` từ một EVENT handler `session_start`, bị suspend qua `setSuspendedExtensions`, và callback của nó được quan sát là KHÔNG nổ trong khi session vẫn sống. Khẳng định nằm trên bộ đếm callback, không bao giờ trên việc một field nội bộ bị làm rỗng, vì một "bản sửa" chưa từng bắt đầu timer cũng làm rỗng field đó. Hai extension cùng lên lịch timer; suspend một thì cái kia vẫn phải nổ.
2. **TIMER ALIVE AFTER RESUME** — cùng extension đó được resume, handler chạy lại, và callback vừa được lên lịch lại nổ trở lại. Điều này chặn việc commit 1 được thỏa mãn bởi một timer chưa từng được bắt đầu.
3. **PROVIDER GONE AFTER SUSPEND** — một extension gọi `pi.registerProvider`; sau suspend reconcile thì tên provider không còn resolve qua `ModelRegistry` và `registry.authStorage.keys.source(name)` là `undefined`; sau resume thì cả hai trở lại.

Lệnh cổng cho PR Wave 2 (chỉ commit 1): `bun --cwd=packages/natives run build` một lần (`bun test` là 0-pass nếu thiếu addon), rồi `cd packages/coding-agent && bun run check:types` (0 lỗi; baseline hiện là 0 lỗi, exit 0), rồi `cd packages/coding-agent && bun test test/extension-suspend-teardown.test.ts` (case 1 và case 2: 2 passing, 0 failing, KHÔNG phải '0 pass' kèm lỗi pi_natives addon), rồi `cd packages/coding-agent && bun test test/extensions-runner.test.ts test/model-registry-runtime-cleanup.test.ts` (0 failure). Case provider KHÔNG được viết cho tới Wave 4.

Lệnh cổng cho commit 2 (Wave 4): `bun --cwd=packages/natives run build` một lần, rồi `cd packages/coding-agent && bun run check:types` (0 lỗi), rồi `cd packages/coding-agent && bun test test/extension-suspend-teardown.test.ts test/model-registry-runtime-cleanup.test.ts test/extensions-runner.test.ts` (3 passing, 0 failing — bar đầy đủ của cả ba case trong `test_contract`, KHÔNG phải '0 pass' kèm lỗi pi_natives addon).

Cổng này CÓ thực sự đỏ được: có. Vì trên HEAD `#timers` là `Set<Timer>` không owner (`managed-timers.ts:23`) và `setSuspendedExtensions` (`runner.ts:947-969`) không chạm tới timer nào, nên bộ đếm callback vẫn leo sau khi suspend và `registry.find(...)` vẫn defined sau suspend reconcile. Riêng gate (2) thì không đỏ trên HEAD — nó pass hụt vì chưa có gì bị xoá — và chỉ thành cổng thật ngay khoảnh khắc commit 1 đáp.

### Phụ thuộc

Không (không phụ thuộc work item nào khác).

Chặn những gì sau:

- WI-9 — inventory unload không thể quét các tài nguyên không có owner, nên nó cần trạng thái timer và provider capability đã được gắn nhãn.
- WI-5 commit 2-3 — tool admission và capability state được dựng trên cùng một hợp đồng trust-and-ownership.
- Cổng Wave 4 — mọi wave M2 sau đều coi suspend là đáng tin; đây là tiền đề làm cho điều đó thành hiện thực.

### Cách sai dễ nhất

Thiếu một ĐIỂM GÁN OWNER, không phải thiếu cơ chế. `createContext()` có 15 call site nhưng chỉ BỐN trong số đó có thể gọi đúng tên extension sở hữu: `#runHandlerWithTimeout` (vốn đã nhận `ext`), hai trampoline fallback đọc/ghi file (vốn đã đóng trên `ext`), và `createCommandContext` (một spread tại `runner.ts:1352`, phải gọi `#ownTimers` TRƯỚC khi spread — xem owner point 4). 12 call site còn lại dùng chung một `ctx` dựng một lần cho mỗi vòng emit (`ctx ??= this.createContext()` tại `runner.ts:1478` và `:1490`), nên truyền `ext` vào `createContext()` ở các điểm đó sẽ truyền `undefined` cho mọi extension và lỗi vẫn sống trên đường event đa-extension — đúng đường mà một timer `session_start` / `user_bash` thật đi qua. Một test chỉ assert một field đã bị xoá sẽ pass trên bản hiện thực hỏng đó.

Rủi ro thứ hai, riêng cho commit 2, là bán suspend mà không bán resume: `pendingProviderRegistrations` bị drain phá huỷ (cả ba consumer đều gán `[]` lại), nên một lời gọi lại sẽ không đăng ký gì cả, biến "một plugin đã tắt vẫn kết nối" thành tệ hơn: "tôi đã bật lại plugin và không có gì xảy ra". Đó là lý do nửa provider không thể tách khỏi nửa resume.

### Cần người quyết

Chặn việc bắt đầu commit 1 (Wave 2 PR):

- **RESUME VÀ TIMERS** — đây là quyết định thiết kế thật, và plan không trả lời. Xoá lúc suspend thì không mơ hồ. Điều xảy ra lúc resume thì có: nhánh resume của `setSuspendedExtensions` chỉ lật membership của một Set, nên việc nền của một extension vừa resume là mất cho tới khi handler của nó chạy lại. Một extension polling vì thế ngừng polling vĩnh viễn sau một vòng tắt/bật, trong im lặng. Ba lựa chọn: (a) chấp nhận và tài liệu hoá rằng extension vừa resume tự dựng lại việc nền của mình ở event kế tiếp — rẻ nhất, và là điều case 2 của đặc tả này giả định; (b) cho nhánh resume phát một event khởi động tổng hợp để handler dựng lại subscription — đúng hơn, lớn hơn, và có lẽ thuộc về công việc vòng đời của WI-7; (c) nhớ các timer đã xoá và re-arm chúng khi resume, điều này trái ngược đúng thứ đáng giá của việc xoá. Một con người phải chọn trước khi viết code. Đặc tả này viết theo phương án (a) và nêu ra thay vì giấu đi.
- **COMMIT 1 — sentinel `UNOWNED_TIMERS` ở bước 6 có chấp nhận được không, hay các helper timer của `createContext` nên ném lỗi?** Một sentinel âm thầm sinh ra timer không owner giữ nguyên hành vi hiện tại cho các caller tiền-`#ownTimers` của trampoline và cho hai test đơn vị sẵn có. Ném lỗi sẽ lộ ngay bất kỳ điểm gán owner nào bị bỏ sót trong tương lai, nhưng làm hỏng bốn test sẵn có ở `test/extensions-runner.test.ts:3956-4070` vốn dựng context trực tiếp. Đặc tả đề xuất sentinel; một con người nên phê chuẩn.

Không chặn PR của Wave 2, nhưng phải quyết trước commit 2 (Wave 4):

- **COMMIT 2 — việc đăng ký lại lúc resume có cần `refreshRuntimeProviders()` phía sau không?** Các đường lạnh ở `sdk.ts:1010`, `sdk.ts:2499` và `cli/models-cli.ts:364` đều gọi nó sau khi đăng ký, và đây là call site đăng ký duy nhất sẽ không gọi. Lập luận ngược lại là `reconcileExtensionSources` là một đường nóng của listener cài đặt và `clearSourceRegistrations` vốn đã buộc phải nạp lại static model. Đặc tả giả định KHÔNG refresh (giữ đường nóng rẻ). Xác nhận hoặc bác bỏ.
- **COMMIT 2 — bất đối xứng `restrictToolNames`.** Cặp `syncExtensionSources` / `clearSourceRegistrations` tại `sdk.ts:2481-2486` nằm bên trong `if (!restrictToolNames)`, nhưng phần điền retention record ở 2487-2492 nằm NGOÀI nó. Nên trong một session giới hạn tool name, provider vẫn được đăng ký và vẫn được ghi lại, trong khi nhánh prune chưa từng chạy. Điều này có sẵn từ trước và ngoài phạm vi, nhưng lời gọi mới trong `reconcileExtensionSources` sẽ chạy ở session giới hạn nữa, nghĩa là các session giới hạn sẽ có một prune mà trước đó chưa từng có. Xác nhận rằng điều đó là mong muốn chứ không phải bất ngờ.
- **COMMIT 2 — có nên xoá retention record nếu extension gọi `pi.unregisterProvider` không?** `ExtensionRuntime.unregisterProvider` (`loader.ts:108-111`) gỡ một entry khỏi `pendingProviderRegistrations`, mà vốn đã bị drain. Sau drain nó là no-op. Một lần resume sau đó sẽ đăng ký lại một provider mà extension đã rút lại. Có lẽ hiếm, nhưng cách sửa chỉ một dòng (lọc record khi unregister) và không rõ có đáng bề mặt hay không.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Repo state: 'git HEAD 5873776, currently on branch milestone-1'. | STALE — commit không tồn tại | HEAD là `808b365` ('docs(plan): fold the spec-verified M1 execution plan into the upgrade plan'). `git cat-file -t 5873776` trả về 'fatal: Not a valid object name'. Đúng nhánh (milestone-1). Mọi số dòng dưới đây đo trên `808b365`. Evidence: `git rev-parse --short HEAD` -> 808b365; `git cat-file -t 5873776` -> fatal; `git branch --show-current` -> milestone-1 |
| runner.ts anchors: `#managedTimers` at :507, `clearManagedTimers()` call at :408, `setSuspendedExtensions` at :934-956, `createContext` signature at :1229, trampoline gates at :766/:785, `#runHandlerWithTimeout` at :1361, `createHandlerContext` at :227-239, timer arrow props at :1290-1291. | STALE — lệch có hệ thống | Mọi neo runner.ts trong plan đều sai. Đo tại HEAD: `#managedTimers` = 518, lời gọi `clearManagedTimers()` = 411, method định nghĩa = 1336-1337, `setSuspendedExtensions` = 947-969, cổng trampoline = 779 và 798, chữ ký `createContext` = 1242, arrow property timer = 1304-1305, `#runHandlerWithTimeout` = 1375, `createHandlerContext` = 230-241, lời gọi `createHandlerContext(...)` = 1405-1408. Mức lệch không đều: +11, +3, +13, +13, +3, +14, +14, +3, +14. Đừng `sed -n '507p'` file này — hãy suy lại mọi neo bằng grep. Evidence: `grep -n '#managedTimers\|clearManagedTimers\|setSuspendedExtensions\|runHandlerWithTimeout\|createHandlerContext' packages/coding-agent/src/extensibility/extensions/runner.ts` |
| sdk.ts anchors: `reconcileExtensionSources` at 4560-4624, `resetCapabilities()` at :4565, `setSuspendedExtensions` at :4573, the discover await at :4567-4570. | STALE — lệch đều +6 | Đo tại HEAD: `const reconcileExtensionSources` = 4566, `resetCapabilities()` = 4571, `await Promise.all([...])` = 4573-4576, `const { suspended, resumed } = extensionRunner.setSuspendedExtensions(` = 4579-4581, hàm kết thúc ở 4630 (đã đo; 4631 là `cfgExtensionSources.listen(session, …)`). Cả bốn đều +6. CÁC neo sdk.ts KHÁC trong plan là chính xác: 1002-1004, 1006-1009, 2482, 2484, và 3074. Khối drain 2487-2491 chỉ lệch một dòng, ở dấu ngoặc đóng (2492). Evidence: `grep -n 'resetCapabilities()\|setSuspendedExtensions(' packages/coding-agent/src/sdk.ts` -> 4571, 4579; `sed -n '4566,4584p' packages/coding-agent/src/sdk.ts` |
| The retention record lives on the `Extension` interface at `types.ts:1777-1792`. | STALE — sai vị trí | `export interface Extension` ở `types.ts:1802-1817`, không phải 1777-1792. Claim ở dòng 1777-1779 của plan rằng `Extension` 'đã có cả path và resolvedPath' là đúng nhưng ở 1803-1804, muộn hơn 25 dòng. `types.ts:1777-1792` thực tế chứa `ExtensionCommandContextActions` và `ExtensionRuntime`. Kết luận thiết kế không đổi — record vẫn thuộc về `Extension`, không phải `ExtensionRuntime` — nhưng đừng mở 1777. Evidence: `grep -n '^export interface Extension ' packages/coding-agent/src/extensibility/extensions/types.ts` -> 1802; `sed -n '1770,1800p'` cho thấy ExtensionCommandContextActions / ExtensionRuntime |
| Two constraints on commit 1 that read as design inputs are not. | CONFIRMED TRUE — ghi lại vì đây là insight mang tải trọng | Cả hai đều đúng như đã nêu, và chúng là lý do work item này không phải một dòng đơn. (a) `createContext()` có đúng 15 call site — `grep -n 'this\.createContext(' packages/coding-agent/src/extensibility/extensions/runner.ts \| wc -l` -> 15 — trong đó 2 (lines 780, 799) là trampoline fallback đọc/ghi file gọi handler trực tiếp, 1 (line 1352) là spread trong `createCommandContext`, và 12 dùng chung một context qua mọi extension trong vòng emit (hai điểm `ctx ??= this.createContext()` tại lines 1478 và 1490, cộng mười `const ctx = this.createContext()` trong từng hàm emit riêng). Truyền `ext` vào `createContext()` sẽ truyền `undefined` ở cả 12. (b) `createHandlerContext` (230-241) là `Object.create(ctx)` chỉ override `ui`, nên các `setInterval`/`setTimeout` không owner mà `createContext()` cài ở 1304-1305 được mọi handler kế thừa. Cả hai đều đã kiểm chứng, cả hai đều quyết định. Evidence: 15 call site liệt kê tại 780, 799, 1352, 1478, 1490, 1529, 1587, 1644, 1675, 1716, 1738, 1819, 1855, 1880, 1937; #runHandlerWithTimeout được gọi từ đúng 12 điểm: 1480, 1493, 1538, 1600, 1651, 1686, 1723, 1770, 1831, 1869, 1896, 1945 |
| 'Commit 2 must join the resume record, and the two `createContext` caller shapes mean only three owner points exist' — tức là hình dạng của toàn bộ bản sửa. | CONFIRMED, kèm một điểm tinh chỉnh mà plan nói quá | Ba điểm gán owner là đúng. Điểm tinh chỉnh: plan nói đường reconcile 'hoạt động trong không gian resolvedPath, nên hai không gian phải được nối qua một mapping không dùng trực tiếp được' (và lặp lại điều đó dưới mục 'where the record lives'). Điều đó đúng cho các tập `governed`/`enabled` tại 4577-4578, nhưng KHÔNG áp cho phần provider. `setSuspendedExtensions` trả về các OBJECT `Extension`, và `Extension` mang cả `path` lẫn `resolvedPath` — nên source id chỉ là một lần đọc `.path`, và `sourceId` chính xác là `extension.path` theo cách dựng (loader.ts:363). `extensionRunner.getExtensionPaths()` (927-929) trao cả danh sách active trong đúng không gian khoá chỉ bằng một lời gọi. Không cần mapping ở bất kỳ đâu trong nửa provider, và dựng một cái sẽ là sai. Evidence: `sed -n '4577,4582p' packages/coding-agent/src/sdk.ts` (predicate dùng `.resolvedPath`); `sed -n '362,364p' packages/coding-agent/src/extensibility/extensions/loader.ts` (sourceId CHÍNH XÁC là `this.extension.path`); `sed -n '927,929p' .../runner.ts` (`this.extensions.map(e => e.path)`) |
| Test rows 1-2 fail on HEAD; row 3 also fails on HEAD. | PARTLY WRONG — row 2 pass hụt trên HEAD | Row 1 và row 3 đúng là đỏ trên HEAD. Row 2 (TIMER ALIVE AFTER RESUME) thì KHÔNG: trên HEAD chưa sửa gì, không có gì bị xoá, nên một interval vẫn nổ xuyên suốt vòng suspend/resume và row pass vì lý do sai. Nó chỉ thành cổng thật khi commit 1 đã đất — nó chặn một bản hiện thực commit-1 thỏa mãn row 1 bằng cách không bao giờ lên lịch, hoặc bằng cách xoá ở cả nhánh resume. Vẫn nên viết nó (nó là một regression guard thật), nhưng đừng báo nó là đỏ-trước / xanh-sau. Evidence: managed-timers.ts không có khái niệm owner và setSuspendedExtensions (947-969) chỉ chạm `#suspendedExtensions` cùng mảng `extensions`; do đó mọi timer đã lên lịch vẫn chạy bất kể trạng thái suspend tại HEAD. |
| Wave split: commit 1 ships in Wave 2, commit 2 (suspend + resume together) in Wave 4. | CONFIRMED — đặc tả này chỉ chở nửa Wave 2 | Theo chính bảng wave của plan (section 6.1, line 4693) và lập luận nó nêu ở 4866-4869: nửa provider không thể chỉ ship suspend, vì `pendingProviderRegistrations` bị drain phá huỷ bởi cả ba consumer (loader.ts:102/105 khai báo và push; sdk.ts:1009, sdk.ts:2491, cli/models-cli.ts:362 mỗi cái gán lại `[]`), nên một lời gọi lại trần sẽ không đăng ký gì. Plan không ship bất kỳ bước tăng provider chỉ-suspend nào cho người dùng. Vì vậy PR của Wave 2 chỉ chứa các bước 1-7. Evidence: Plan lines 4693, 4860-4869, 4718-4720; `grep -n 'pendingProviderRegistrations' packages/coding-agent/src` -> sdk.ts:1006,1009,2487,2488,2491; cli/models-cli.ts:359,362; loader.ts:102,105 |
| Environment: `bun test` reports 0 pass because the pi_natives addon is not built. | CONFIRMED — đã tái hiện nguyên văn | Tái hiện tại HEAD: `bun test test/model-registry-runtime-cleanup.test.ts` -> '0 pass, 1 fail, 1 error' với 'Failed to load pi_natives native addon for darwin-arm64'. Cách gỡ là `bun --cwd=packages/natives run build` (package script đã kiểm chứng ở `packages/natives/package.json:32`). Riêng biệt, baseline type sạch và nên được ghi lại: `cd packages/coding-agent && bun run check:types` exit 0 với không lỗi nào tại HEAD, nên cổng là 'zero errors' thật sự, không phải 'no new errors'. Evidence: `bun test test/model-registry-runtime-cleanup.test.ts` (output ở trên); `grep -n '"build"' packages/natives/package.json` -> line 32; `bun run check:types` -> EXIT=0 |

## Cần người xác nhận

Các điểm dưới đây là mâu thuẫn nội tại của chính đặc tả. Không tự sửa — ghi lại để người đọc quyết.

- **`git diff --stat` của commit 1 phải chạm đúng 3 file, một trong số là `types.ts`** — mâu thuẫn với bốn chỗ khác trong cùng đặc tả nói commit 1 KHÔNG được chạm `types.ts`: mục file cần chạm tới ("COMMIT 1 MUST NOT TOUCH THIS FILE — that is the whole point of routing the owner through the internal ManagedTimers signature rather than the public one"), khối `code_shape` ("COMMIT 1 — types.ts. NO CHANGE"), và ghi chú `loader.ts`/`sdk.ts` theo cùng logic. Nếu commit 1 thực sự không đụng `types.ts` thì con số file phải là 2, không phải 3. Trường `effort` cũng viết "20-25 changed production lines across 3 existing files", cùng hướng với con số 3.
- **Con số mà `grep -c` ở bước 4 phải in ra.** Bước 4 chạy `grep -c 'this.#ownTimers(' packages/coding-agent/src/extensibility/extensions/runner.ts`. `grep -c` đếm SỐ DÒNG khớp: định nghĩa method ở bước 3 là `#ownTimers<T extends ExtensionContext>(...)` — KHÔNG có tiền tố `this.` nên không được đếm; chỉ bốn call site mới khớp, nên con số kỳ vọng là `4`. Nếu người viết đọc "3" (cơ chế + hai call site) thì lệnh sẽ báo fail ngay cả khi bước 4 làm đúng. (Câu mà bản nháp này trích trước đây — "and confirm it prints 3 (definition + 2 calls) plus the one inside step 1's edit" — không còn tồn tại trong tài liệu: nó đã bị sửa khỏi bước 4.)
- **`readonly` trên `#timers` không nhất quán.** `files_touched` ghi `` `readonly #timers = new Set<Timer>()` -> `readonly #timers = new Map<Timer, Extension>()` ``, còn `code_shape` viết `#timers = new Map<Timer, Extension>();` không có `readonly`. Chọn một và giữ nhất quán.
- **Đường dẫn trong `open_questions` #1 trỏ tới `WI-7`**, trong khi `blocks` của WI-1 chỉ liệt kê WI-9 và WI-5. Không mâu thuẫn logic, nhưng phụ thuộc đó không xuất hiện ở danh sách chặn — nếu WI-7 chưa được lập kế hoạch thì lựa chọn phương án (b) trong câu hỏi về resume không có chỗ đổ.
