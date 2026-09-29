# Phiếu triển khai — W1

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md`
**Work item:** `## W1. Khôi phục disposer mà API on() của extension và hook trả về` (dòng 218–246)
**Cây làm việc:** `/Users/tranquangdang21/Projects/ultraworkers`, nhánh `milestone-1`
**Ngày kiểm:** 2026-09-29 — mọi dòng dưới đây đã mở bằng `sed -n "<n>p"` / `rg -n` trên cây thật.

---

## 1. Cái gì thay đổi, quan sát được

`pi.on(event, handler)` trên **cả hai** surface (extension lẫn hook) trả về một hàm gọi được lần nữa; gọi nó một lần sẽ gỡ đúng handler vừa đăng ký ra khỏi danh sách và xoá luôn key của Map khi danh sách đó rỗng, còn gọi lại lần hai thì không làm gì — và một extension/hook ngoài đời gọi `api.on(ev, h)` như một câu lệnh trần thì hành vi không đổi.

---

## 2. Bảng điểm sửa

Cột TRƯỚC là văn bản trích nguyên văn từ file thật ở HEAD.

| path | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/utils.ts` | `createHandlerDisposer` (mới) | *(không tồn tại — file kết thúc bằng `withHostGuard` ở dòng 118)* | thêm hàm 8 dòng trả closure `() => void`, đóng trên `handlers`/`event`/`handler`, `indexOf` theo identity, `splice`, `delete` key khi rỗng |
| `packages/coding-agent/src/extensibility/extensions/loader.ts:40` | import từ `../utils` | `import { resolvePath, withHostGuard } from "../utils";` | `import { createHandlerDisposer, resolvePath, withHostGuard } from "../utils";` |
| `packages/coding-agent/src/extensibility/extensions/loader.ts:210` | `ConcreteExtensionAPI.on` | `	on<F extends HandlerFn>(event: string, handler: F): void {`<br>`		const list = this.extension.handlers.get(event) ?? [];`<br>`		list.push(handler);`<br>`		this.extension.handlers.set(event, list);`<br>`	}` | `	on<F extends HandlerFn>(event: string, handler: F): () => void {`<br>`		const list = this.extension.handlers.get(event) ?? [];`<br>`		list.push(handler);`<br>`		this.extension.handlers.set(event, list);`<br>`		return createHandlerDisposer(this.extension.handlers, event, handler);`<br>`	}` |
| `packages/coding-agent/src/extensibility/hooks/loader.ts:15` | import từ `../utils` | `import { resolvePath, withHostGuard } from "../utils";` | `import { createHandlerDisposer, resolvePath, withHostGuard } from "../utils";` |
| `packages/coding-agent/src/extensibility/hooks/loader.ts:93` | `on` trong object literal của `createHookAPI` | `		on(event: string, handler: HandlerFn): void {`<br>`			if (!handlers.has(event)) {`<br>`				handlers.set(event, []);`<br>`			}`<br>`			handlers.get(event)!.push(handler);`<br>`		},` | `		on(event: string, handler: HandlerFn): () => void {`<br>`			if (!handlers.has(event)) {`<br>`				handlers.set(event, []);`<br>`			}`<br>`			handlers.get(event)!.push(handler);`<br>`			return createHandlerDisposer(handlers, event, handler);`<br>`		},` |
| `packages/coding-agent/src/extensibility/extensions/types.ts:1301–1365` | 47 overload `on(...)` trong `export interface ExtensionAPI` (khai báo ở **1277**) | `	on(event: "session_start", handler: ExtensionHandler<SessionStartEvent>): void;`<br>và 46 dòng nữa, trong đó 6 dòng đóng multi-line kiểu:<br>`	on(`<br>`		event: "session_before_switch",`<br>`		handler: ExtensionHandler<SessionBeforeSwitchEvent, SessionBeforeSwitchResult>,`<br>`	): void;` | hậu tố `): void;` → `): () => void;` trên **cả 47** khai báo (41 một-dòng + 6 multi-line, hậu tố nằm ở dòng đóng 1306/1311/1316/1321/1330/1336) |
| `packages/coding-agent/src/extensibility/hooks/types.ts:471–500` | 25 overload `on(...)` trong `export interface HookAPI` (khai báo ở 469) | `	on(event: "session_start", handler: HookHandler<SessionStartEvent>): void;`<br>và 24 dòng nữa, trong đó 1 dòng đóng multi-line ở 476–479:<br>`	on(`<br>`		event: "session_before_compact",`<br>`		handler: HookHandler<SessionBeforeCompactEvent, SessionBeforeCompactResult>,`<br>`	): void;` | hậu tố `): void;` → `): () => void;` trên **cả 25** khai báo |
| `packages/coding-agent/test/extensions-disposer.test.ts` | file test mới | *(chưa tồn tại)* | file mới, 4 case × 2 surface |

**Không đụng:** `packages/coding-agent/src/extensibility/hooks/types.ts:134` —
`) => (Component & { dispose?(): void }) | Promise<Component & { dispose?(): void }>,`
Đó là `dispose` của UI component, không phải disposer của handler.

---

## 3. Các bước

Mỗi neo dưới đây tôi đã mở và đọc trên cây thật.

### Bước 1 — Ghi baseline

```bash
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types
```

Script thật là `tsgo -p tsconfig.json --noEmit` (`packages/coding-agent/package.json:523`). `tsconfig.json` có `"include": ["src", "test", "scripts"]` nên test folder nằm trong phạm vi.

**Kết quả tôi đo được ngày 29-09-2026: exit 0, KHÔNG có lỗi nào.** Cổng của bạn vì thế là **"0 lỗi"**, không phải "không lỗi mới". Chi tiết ở mục 5.

### Bước 2 — Thêm helper vào `extensibility/utils.ts`

File này có 193 dòng, 4 export: `resolvePath` (dòng 15), `createNoOpUIContext` (31), `ExtensionExitError` (54), `withHostGuard` (118). Nó **không** export `HandlerFn` và cũng không import kiểu nào từ `extensions/`.

Về câu hỏi *"`HandlerFn` có cần export không?"* trong mục *Cần người quyết* của plan: **không cần, và câu trả lời có thể giao việc luôn.** `HandlerFn` là alias cục bộ lặp y hệt ở ba chỗ — `extensions/loader.ts:61`, `extensions/types.ts:1721`, `hooks/loader.ts:22` — cả ba đều là `(...args: unknown[]) => Promise<unknown>`, và **không chỗ nào export nó**. Map mà cả hai loader đóng trên cũng cùng kiểu: `handlers: Map<string, HandlerFn[]>` (`extensions/types.ts:1831` và `hooks/loader.ts:50`).

→ Khai chữ ký helper bằng **kiểu cấu trúc**, không import, không export mới, không refactor:

```ts
/**
 * Build an identity-safe disposer for one registered handler.
 *
 * Scope note: this withdraws a single handler registration. It is NOT an
 * unload — extension modules are never unloaded, and the `Bun.plugin()` hooks
 * in extensibility/plugins/legacy-pi-compat.ts are process-global and permanent
 * by construction (see the comment at legacy-pi-compat.ts:1990-1992).
 *
 * Removal is by identity, never by index: between `on()` and the disposer call
 * the list may have shifted, and a second call to the same disposer must be a
 * no-op rather than evicting whichever neighbour moved into the old slot.
 * When the list empties, the Map key is deleted so the key set does not grow
 * across extension reloads.
 */
export function createHandlerDisposer(
	handlers: Map<string, ((...args: unknown[]) => Promise<unknown>)[]>,
	event: string,
	handler: (...args: unknown[]) => Promise<unknown>,
): () => void {
	return () => {
		const list = handlers.get(event);
		if (!list) return;
		const index = list.indexOf(handler);
		if (index === -1) return;
		list.splice(index, 1);
		if (list.length === 0) handlers.delete(event);
	};
}
```

Đặt ngay trước `export async function withHostGuard` (dòng 118). Kiểu ở trên **giống hệt** `HandlerFn` (cùng cây vị trí, cùng kiểu trả về), nên `Map<string, HandlerFn[]>` truyền vào được không cần ép.

Về *"helper đặt ở đâu?"*: giữ ở `extensibility/utils.ts`. Cả hai loader đã có sẵn `import { resolvePath, withHostGuard } from "../utils";` (`extensions/loader.ts:40`, `hooks/loader.ts:15`) — chỉ thêm một cái tên vào import đã có, không module mới, không dynamic import.

### Bước 3 — Sửa phía extension

`packages/coding-agent/src/extensibility/extensions/loader.ts`

- Dòng **210**: `on<F extends HandlerFn>(event: string, handler: F): void {` → `): () => void {`
- Thêm `return createHandlerDisposer(this.extension.handlers, event, handler);` ngay trước dấu `}` đóng ở dòng **214**
- Dòng **40**: thêm `createHandlerDisposer` vào import

Kiểm tra bắt buộc: dòng **179** là `class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime {` — `implements` là kiểm tra cấu trúc cứng, nên nếu bạn sửa 47 overload ở `types.ts` mà quên dòng 210 thì `check:types` **đỏ ngay**. Đây là nửa an toàn.

Không cấu trúc lại thân hàm. Cặp `list.push(handler)` (dòng **212**) + `set` (213) đã đúng identity: function của caller được lưu **nguyên tham chiếu, không bọc**. Constructor ở dòng **196–207** chỉ rebind method của prototype lên instance cho callback tách rời an toàn, không đụng identity handler.

### Bước 4 — Sửa phía hook

`packages/coding-agent/src/extensibility/hooks/loader.ts`

- Dòng **93**: `on(event: string, handler: HandlerFn): void {` → `): () => void {`
- Thêm `return createHandlerDisposer(handlers, event, handler);` ngay trước `},` ở dòng **98**
- Dòng **15**: thêm `createHandlerDisposer` vào import
- `handlers` là tham số đã capture trong closure của `createHookAPI` (khai báo dòng **76**), không phải biến `this.*`

Giữ nguyên `} as HookAPI;` ở dòng **128**. Dòng 92 là `const api = {`, dòng **90–91** chỉ là comment hai dòng nhắc tới cast — đừng đi săn dòng 92.

### Bước 5 — Sửa 47 overload phía extension

`packages/coding-agent/src/extensibility/extensions/types.ts`, khoảng **1301–1365**, bên trong `export interface ExtensionAPI` khai báo ở dòng **1277**.

Dạng cơ học an toàn nhất: chỉ trong khoảng 1301–1365, thay hậu tố `): void;` ở dòng **đóng** của một khai báo `on(`. 6 khai báo multi-line đóng ở 1306, 1311, 1316, 1321, 1330, 1336 — hậu tố của chúng không nằm trên dòng mở `on(`.

**KHÔNG** thay toàn cục `): void;`. File này còn có `notify(...): void;` (260), `setStatus(...): void;` (266), `setWorkingMessage(...): void;` (269), `setWidget(...): void;` (272), `setFooter` (275), `setHeader` (278), `setTitle` (281), `setEditorText` (295), `pasteToEditor` (303), `addAutocompleteProvider` (322), một dòng đóng ở 333, `setToolsExpanded` (351), `abort` (482), `shutdown` (486), `clearTimer` (526), `addAdditionalContext?` (533) — tất cả phải giữ `void`.

**Số đúng là 47, không phải 41.** `rg -c 'on\(event: "'` cho 41 vì regex đó không khớp 6 khai báo multi-line (chúng viết `on(` rồi xuống dòng). Đếm đúng:

```bash
awk 'NR>=1277' packages/coding-agent/src/extensibility/extensions/types.ts | rg -c '^\s*on\('   # → 47
```

Kiểm sau khi sửa: `git diff --stat` phải ra **47** dòng đổi trong file này.

### Bước 6 — Sửa 25 overload phía hook

`packages/coding-agent/src/extensibility/hooks/types.ts`, khoảng **471–500**, bên trong `export interface HookAPI` khai báo ở dòng **469**.

Một khai báo multi-line ở **476–479** (`session_before_compact`), hậu tố `): void;` nằm ở dòng 479.

**Số đúng là 25, không phải 24** — 24 một-dòng + 1 multi-line. `ttsr_triggered` nằm ở dòng **497** (một dòng). Kiểm:

```bash
awk 'NR>=469' packages/coding-agent/src/extensibility/hooks/types.ts | rg -c '^\s*on\('   # → 25
```

Lưu ý `rg -c 'on\(event: "'` trên file này cho 24, và sẽ cho 25 sau khi bạn gộp dòng 476–479 thành một dòng — **đừng dùng con số đó làm cổng.**

### Bước 7 — Viết 4 test case

`packages/coding-agent/test/extensions-disposer.test.ts` (mới; thư mục `test/` hiện có 791 file `.test.ts`).

Import path bắt buộc (theo đúng mẫu file đang có):
```ts
import { afterEach, describe, expect, it } from "bun:test";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { loadHooks } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/loader";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
```

Chữ ký thật đã mở và đọc:
- `loadExtensionFromFactory(factory: ExtensionFactory, cwd: string, eventBus: EventBus, runtime: IExtensionRuntime, name = "<inline>"): Promise<Extension>` — `extensions/loader.ts:464`; nhận factory **inline** nên closure giữ được disposer, **không cần file tạm**.
- `loadHooks(paths: string[], cwd: string): Promise<LoadHooksResult>` — `hooks/loader.ts:191`; `LoadHooksResult = { hooks: LoadedHook[]; errors: Array<{ path: string; error: string }> }` (`hooks/loader.ts:64`); `LoadedHook.handlers: Map<string, HandlerFn[]>` (`hooks/loader.ts:50`). Hàm `createHookAPI` **không export**, nên phía hook buộc phải đi qua `loadHooks`, tức dynamic-import một file thật.
- Vì vậy module hook tạm phải trả disposer về qua `globalThis` — đúng mẫu bàn giao đã dùng tại `extension-prepared-rebind.test.ts:46` (`const bindings = Reflect.get(globalThis, bindingsKey) as ExtensionAPI[];`).

Dọn key `globalThis` trong `afterEach` bằng `Reflect.deleteProperty`.

**Không** dùng `mock.module()` ở bất cứ đâu. **Không** cần `vi.spyOn`.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/extensions-disposer.test.ts`

**Tóm tắt:** Rút một đăng ký handler sẽ gỡ đúng handler đó, để anh em vẫn còn đăng ký và vẫn chạy, và không để lại key event rỗng. Dispose lặp lại là vô hại chứ không phải đuổi nhầm người kế bị trượt vào ô trống.

Mỗi case chạy trên **cả hai** surface (extension + hook) — hai object khác nhau, hai Map handler khác nhau.

### Case 1 — Sibling sống sót sau một lần gỡ

Đăng ký A, B, C cho một event. Dispose A. Khẳng định danh sách còn lại là **đúng `[B, C]`** theo **identity của function**, không phải theo số đếm.

**Người dùng thấy gì nếu hồi quy:** một handler đơn giản ngừng chạy, không có lỗi nào ở đâu. Mọi điểm dispatch đều guard bằng độ dài danh sách — `hooks/runner.ts:174` (`if (handlers && handlers.length > 0)`), `hooks/runner.ts:286` (`if (!handlers || handlers.length === 0) continue`), `extensions/runner.ts:1193` (cùng dạng). Hệ quả **không phải crash** — đó là lý do phải khẳng định identity chứ không khẳng định count: một khẳng định chỉ-đếm vẫn xanh với cả bug hoán đổi hai phần tử.

### Case 2 — Key Map bị xoá khi danh sách rỗng

Dispose handler cuối cùng, khẳng định `handlers.has(event) === false` **đọc trực tiếp trên Map**, không kiểm qua dispatch.

**Vì sao phải đọc thẳng Map:** tôi đã grep toàn `packages/coding-agent/src/` — **không có chỗ nào duyệt key của Map handler**. Cả **20** điểm đọc đều là `.get(eventType)` rồi guard độ dài (`hooks/runner.ts:173, 285, 333, 365, 402` — 5 chỗ; `extensions/runner.ts:919, 1192, 1505, 1517, 1563, 1625, 1676, 1710, 1750, 1772, 1794, 1852, 1887, 1915, 1970` — 15 chỗ). Một mảng rỗng để lại dưới key là **vô hình về hành vi**, nên khẳng định dựa trên dispatch sẽ **xanh trên cả bản cài đặt hỏng** và tạo cảm giác an toàn giả.

### Case 3 — Dispose hai lần là vô hại

Đăng ký A, B, C. Dispose B (handler ở **giữa**) → danh sách là `[A, C]`. Dispose B lần nữa → danh sách **vẫn** `[A, C]` và dài 2.

**Người dùng thấy gì nếu hồi quy:** đây là cái bẫt lệch-neighbour mà cả work item sinh ra để chặn. Sau lần splice đầu, C đã trượt vào ô mà B đang chiếm. Một disposer khóa theo **chỉ số** bắt được thay vì khóa theo identity sẽ đuổi C ở lần gọi thứ hai — một handler mà caller chưa từng chạm tới biến mất, và danh sách handler cứ thu nhỏ mỗi lần thử lại. `indexOf` theo identity + `return` sớm khi `=== -1` chính là thứ làm lần gọi thứ hai thành no-op.

### Case 4 — Caller bỏ qua giá trị trả về thì không bị ảnh hưởng

Trong một factory extension inline / module hook tạm, gọi `api.on(event, h)` như một câu lệnh trần (bỏ giá trị trả về), rồi đăng ký thêm handler thứ hai cho cùng event. Khẳng định danh sách có **cả hai, đúng thứ tự**, và `handlers.has(event)` là `true`.

**Người dùng thấy gì nếu hồi quy:** kiểu trả về của một API công khai đổi từ `void` sang `() => void`. Các module extension và hook ngoài đời bỏ qua giá trị đó. Nếu refactor vô tình đổi đường đăng ký (push hai lần, return sớm, đảo thứ tự) thì các caller đó hỏng mà **không có lỗi biên dịch nào** — một giá trị trả về bị bỏ thì type-check kiểu nào cũng qua.

### Cấm trong test này

`mock.module()` (mutate global module registry, rò sang file khác — Bun #12823). Source-grep `loader.ts` để khẳng định disposer tồn tại — hãy khẳng định trên Map và closure trả về. `not.toThrow()` trần, hay check "không rỗng" — chúng không phân biệt được bản đã sửa với bản hỏng. Mọi mutation `globalThis` lâu dài — mọi key stash vào phải bị xoá trong `afterEach`.

### Stub trong test khác: không cần sửa

Grep toàn repo xác nhận chỉ có **hai** cài đặt production: `ConcreteExtensionAPI` (`extensions/loader.ts:179`, `implements` cứng) và object literal của hook (`hooks/loader.ts:128`, `as HookAPI`). Sáu file test dựng stub một phần qua double assertion nên không có kiểm tra tương thích nào bắn vào: `autoresearch-tools.test.ts:70`, `autoresearch-git.test.ts:40`, `autoresearch-state.test.ts:474` và `:620`, `autoresearch-before-agent-start.test.ts:43` (đều là `} as unknown as ExtensionAPI;`), `modes/warp-events.test.ts:47` (là `} as never as ExtensionAPI;`). Biết để khỏi đi săn implementer thứ năm là đủ.

---

## 5. Cổng

### Lệnh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types

cd /Users/tranquangdang21/Projects/ultraworkers && \
  bun test packages/coding-agent/test/extensions-disposer.test.ts

cd /Users/tranquangdang21/Projects/ultraworkers && \
  bun test packages/coding-agent/test/extensions-runner.test.ts \
            packages/coding-agent/test/extensions-discovery.test.ts \
            packages/coding-agent/test/plugin-extensions-discovery.test.ts
```

### Cổng này có ĐỎ ĐƯỢC không, bằng cách nào

**Có, nhưng phải bỏ một bằng chứng giả mà plan đang dùng.**

| cổng | baseline tôi đo ngày 29-09-2026 | đỏ được? |
| --- | --- | --- |
| `bun test .../extensions-disposer.test.ts` | file chưa tồn tại | **CÓ, thật.** Trước khi viết test, file không có → `bun test` báo không tìm thấy file. Sau khi viết test mà chưa sửa loader, `on` vẫn trả `undefined`, nên case gọi closure sẽ ném `TypeError: disposeA is not a function` → đỏ thật chứ không phải đỏ giả. |
| `bun run check:types` (nửa extension) | **exit 0, sạch tuyệt đối** | **CÓ, thật.** `class ConcreteExtensionAPI implements ExtensionAPI` (dòng 179) là kiểm tra cấu trúc cứng → sửa 47 overload mà quên dòng 210 thì đỏ ngay. |
| `bun run check:types` (nửa hook) | exit 0, sạch | **KHÔNG.** Đây là điểm quan trọng nhất. Cast `} as HookAPI;` (dòng 128) là **assertion**, không phải `implements`. Một hàm trả `() => void` gán được cho chữ ký trả `void` (quy tắc return-type-void của TypeScript), và phép so sánh cho `as` được thoả nếu **một** trong hai chiều đúng. Sửa `hooks/types.ts` mà quên `hooks/loader.ts` vẫn nhiều khả năng compile sạch và ship một disposer trả `undefined` lúc runtime. |
| 3 file regression suite | `extensions-runner.test.ts` chạy được: **87 pass, 0 fail** | **CÓ, thật** (nhưng là cổng hồi quy, không phải cổng chứng minh W1 xong). |

**Sửa lại cổng cho đỏ được:** cột "nửa hook" ở trên **phải bị loại khỏi danh sách cổng và chuyển thành lời cảnh báo**. `check:types` xanh **không** phải bằng chứng cho W1. Bằng chứng duy nhất cho nửa hook là **case 2 và case 3 chạy trên surface hook** — vì chúng gọi thật closure mà `loadHooks` trả về. Đừng để ai chạy `check:types` xanh rồi kết luận W1 xong.

### Đính chính: hai tuyên bố của plan về baseline đã hỏng

1. **"`bun run check:types` FAIL với đúng một lỗi — `test/collab/w3-probe.test.ts(76,15): error TS2352`"** → **SAI.** File đó **không tồn tại**: `ls packages/coding-agent/test/collab/w3-probe.test.ts` → không có; `git ls-files --error-unmatch` → không có trong index; thư mục `test/collab/` không chứa file nào tên `w3-probe`. Tôi đã chạy `bun run check:types` thật: **exit 0, không dòng lỗi nào**. Bước 1 của plan (dời file ra `/tmp/` rồi khôi phục lại) và câu chữ "lỗi DUY NHẤT còn lại là `w3-probe`" đều không còn tác dụng. **Cổng của bạn là 0 lỗi, không phải "không lỗi mới".** Câu hỏi *"file untracked w3-probe sẽ bị xoá, commit, hay để lại?"* trong *Cần người quyết* đã tự giải: không còn file nào để quyết.
2. **"cây bẩn — `packages/coding-agent/src/collab/crypto.ts` đang modified, chưa commit, +42/-1"** → **SAI.** `git status --short packages/coding-agent/src/collab/crypto.ts` → rỗng, cây sạch đối với file đó. (Mặt định cast mù **vẫn còn**: `crypto.ts:57` là `return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;` — đó là việc W3, chưa ai làm.) Bước kiểm `git status` cuối plan vì thế không cần phần "đừng revert cái trước".

### Về `bun check` và addon native

- **Không dùng `bun check` làm cổng** — nó là `check:ts` + `check:rs`; nửa Rust cần cargo toolchain và mất nhiều phút. `check:types` trong `packages/coding-agent` là cổng nhanh và đủ.
- **Addon native đã được build sẵn**: `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại (185 MB). Tôi đã xác nhận bằng cách chạy thật `bun test packages/coding-agent/test/extensions-runner.test.ts` → **87 pass, 0 fail**. Nên bước 8 của plan (build addon) không bắt buộc trên cây này — nhưng **kiểm tra lại trước khi tin**, vì nếu thiếu thì `bun test` báo 0 pass với `Failed to load pi_natives native addon` và bạn không phân biệt được "test pass" với "test không hề chạy".
- Cổng hồi quy đúng 3 file trong plan: `extensions-discovery.test.ts` và `plugin-extensions-discovery.test.ts` tôi **không chạy** (ngoài phạm vi kiểm neo của phiếu này) — hãy tự chạy.

---

## 6. Cạm bẫy riêng của work item này

### Cạm bẫy 1 — Tin `check:types` làm bằng chứng cho nửa hook

Chi tiết ở mục 5. Đây là cạm bẫy lớn nhất của W1: nó **im lặng** pass. Nửa extension có `implements` cứng nên tự bảo vệ; nửa hook có `as HookAPI` nên không. `check:types` xanh với một `hooks/loader.ts` **hoàn toàn chưa sửa**, và người đó sẽ ship `off is not a function`. Chỉ case 2/case 3 trên surface hook mới bắt được.

### Cạm bẫy 2 — Đếm sai 41 / 24 rồi dùng con số sai làm cổng

`rg -c 'on\(event: "'` cho **41** ở file extension và **24** ở file hook, nhưng con số thật là **47** và **25**. Regex bỏ sót các khai báo multi-line vì chúng viết `on(` rồi xuống dòng. Hai hệ quả:
- Nếu bạn tin 41 và sửa bằng `sed` trên khoảng 1301–1365, bạn sẽ sửa cả 47 — tốt — nhưng rồi `git diff --stat` ra 47, khác 41, và bạn **nghi ngờ mình làm sai** rồi revert. Đó là thời điểm plan giết bạn.
- Nếu bạn sửa bằng regex chỉ khớp `on(event: "...")`: void;` trên một dòng, bạn sửa 41/24 và **bỏ sót 6/1 khai báo multi-line** → `check:types` đỏ ở nửa extension (vì `implements` cứng), còn nửa hook thì lại **xanh** với `on(event: "session_before_compact", ...): void;` còn sót. Đó là một hợp đồng nửa vời.

Cổng đúng, đã kiểm:
```bash
awk 'NR>=1277' packages/coding-agent/src/extensibility/extensions/types.ts | rg -c '^\s*on\('   # 47
awk 'NR>=469'  packages/coding-agent/src/extensibility/hooks/types.ts       | rg -c '^\s*on\('   # 25
```

### Cạm bẫy 3 — Khoảng dòng trong plan lệch đủ xa để dẫn sang interface khác

Plan ghi `export interface ExtensionAPI` ở dòng **1256** và overload ở **1280–1340**. Dòng 1256 thật ra là `}` — interface thật ở **1277**, overload thật ở **1301–1365**. `sed -n '1280,1340p'` vẫn cho bạn một khối overload trông quen (chỉ thiếu 7 cái đầu), nên bạn có thể sửa xong tưởng đã xong. Tương tự: plan ghi `ToolDefinition` ở 636 (thật là dòng comment ` * Tool definition for registerTool().`; khai báo ở **638**) và `ToolSessionEvent` ở 611 (thật là dòng comment; khai báo ở **618**). Hai cái sau vô hại vì W1 không sửa chúng — nhưng chúng cho thấy độ tin cậy của nhóm neo dòng trong plan, và interface `ExtensionAPI` thì **không** vô hại.

### Cạm bẫt 4 — Port nhầm tầng bọc của `pi-ref`

Plan đánh dấu `pi-ref/.../extensions/loader.ts:256-271` là **UNVERIFIABLE — path không tồn tại**. **Điều đó sai.** `pi-ref` tồn tại là **project anh em** ở `/Users/tranquangdang21/Projects/pi-ref`, và neo 256–271 **chính xác tuyệt đối** — đúng 16 dòng, đúng một `on()` trả disposer. Nghiên cứu chỉ chạy `find . -maxdepth 3 -name pi-ref` (tức trong repo `ultraworkers`) nên không thấy nó.

Bản tham chiếu đó **có** bọc handler:
```ts
on(event: string, handler: HandlerFn): () => void {
    assertActive();
    const registeredHandler: HandlerFn = (...args) => handler(...args);
    list.push(registeredHandler);
    ...
    return () => { ... handlers.indexOf(registeredHandler) ... };
}
```
Hai kết luận khác nhau, đừng trộn:
- Plan đúng khi nói **omp không bọc** — `extensions/loader.ts:212` là `list.push(handler);` trần, `hooks/loader.ts:97` là `handlers.get(event)!.push(handler);` trần. Nên đóng over `handler` rồi `indexOf(handler)` là **đúng trong omp**, và test phải khẳng định trên `handler` gốc.
- Nhưng lý do plan đưa ra ("tham chiếu không tồn tại, đừng dựa vào nó") thì sai. Hệ quả thực tế: đừng **sao chép** tầng `registeredHandler` của `pi-ref` vào omp. Làm vậy vẫn chạy, nhưng bạn thêm một lớp gián tiếp không cần thiết mà không có test nào bắt được. Và **đừng** "sửa" `indexOf(handler)` thành `indexOf(registeredHandler)` — biến đó không tồn tại trong omp.
- `pi-ref` còn có `assertActive()` ở dòng 257 — omp không có. Không port cái đó; nó thuộc về một cơ chế stale-context khác.

### Cạm bẫy 5 — Case 2 viết thành "event không còn dispatch"

Đã nêu ở mục 4 nhưng đáng nhắc lại vì nó là cái âm thầm nhất: tôi grep toàn `packages/coding-agent/src/` và **không có consumer nào duyệt key của Map handler** — cả 20 điểm đọc đều là `.get(eventType)` + guard độ dài. Nên khẳng định "dispatch thì im" sẽ **xanh trên cả bản cài đặt hỏng**. Phải đọc thẳng `handlers.has(event)`.

### Cạm bẫy 6 — Chạm nhầm `dispose` của UI component

`packages/coding-agent/src/extensibility/hooks/types.ts:134`:
`) => (Component & { dispose?(): void }) | Promise<Component & { dispose?(): void }>,`
Cùng tên, khác nghĩa. Không sửa. Nếu bạn thấy mình gõ `dispose` trong `hooks/types.ts`, dừng lại và kiểm tra dòng.

### Cạm bẫy 7 — `createHookAPI` không export

Phía hook, `on` nằm trong `async function createHookAPI(...)` (`hooks/loader.ts:76`, không export). Test **không** import được nó. Bắt buộc đi qua `loadHooks` (`hooks/loader.ts:191`), tức phải `Bun.write` một file hook tạm, và module đó trả disposer về qua `globalThis`. Đừng cố export `createHookAPI` chỉ để test — đó là thay đổi API production cho một work item về disposer.

---

## 7. Phụ thuộc

- `depends_on`: không.
- `blocks`: **W2** — helper drain theo thứ tự ngược của W2 chỉ rút được disposer nếu disposer tồn tại.

---

## 8. Nhật ký kiểm neo

62 neo đã mở bằng `sed -n "<n>p"` hoặc `rg -n`. 43 neo đúng như plan nói. 19 sai hoặc đã lỗi thời:

| # | plan nói | thực tế | ảnh hưởng |
| --- | --- | --- | --- |
| 1 | `check:types` FAIL 1 lỗi ở `test/collab/w3-probe.test.ts(76,15): error TS2352` | file không tồn tại; `check:types` **exit 0, sạch** | **cao** — đổi baseline cổng thành 0 lỗi |
| 2 | 41 overload ở `extensions/types.ts` | **47** | **cao** — con số dùng làm cổng sai |
| 3 | 24 overload ở `hooks/types.ts` | **25** | **cao** — như trên |
| 4 | `export interface ExtensionAPI` ở `extensions/types.ts:1256` | dòng 1256 là `}`; thật ở **1277** | **cao** — dẫn sang sai interface |
| 5 | overload ở `extensions/types.ts:1280-1340` | thật **1301–1365** | **cao** |
| 6 | overload ở `hooks/types.ts:471-500` | đúng | — |
| 7 | `extensions/types.ts:611` = `ToolSessionEvent` | 611 là dòng comment; khai báo ở **618** | thấp (không sửa file này) |
| 8 | `extensions/types.ts:636` = `ToolDefinition` | 636 là dòng comment; khai báo ở **638** | thấp |
| 9 | `extensions/types.ts:1696` = `HandlerFn` | thật ở **1721** | thấp (dùng để cân nhắc refactor) |
| 10 | `hooks/loader.ts:21` = `HandlerFn` | thật ở dòng **22** | thấp |
| 11 | `extensions/runner.ts:1163` = `handlers && handlers.length > 0` | dòng 1163 là `}`; cặp thật ở **1192/1193** | trung bình (dùng để lập luận về guard) |
| 12 | `extensions/runner.ts:1476/1488/1534/1596` | cả bốn sai; dispatch thật ở 919, 1192, 1505, 1517, 1563, 1625, 1676, 1710, 1750, 1772, 1794, 1852, 1887, 1915, 1970 | thấp (luận điểm "không ai duyệt key" vẫn đúng) |
| 13 | `hooks/runner.ts:173` = guard | 173 là `.get(...)`; guard ở **174** | thấp |
| 14 | `hooks/runner.ts:285`/`286` | đúng | — |
| 15 | `legacy-pi-compat.ts:1990-1992` | đúng | — |
| 16 | `extension-prepared-rebind.test.ts:46` | đúng | — |
| 17 | `collab/crypto.ts` modified (+42/-1) | **cây sạch**; cast mù ở `:57` vẫn còn | trung bình (bỏ bước kiểm `git status` cuối) |
| 18 | `modes/warp-events.test.ts:47` = `as unknown as` | là `} as never as ExtensionAPI;` | rất thấp |
| 19 | `pi-ref/.../extensions/loader.ts:256-271` **UNVERIFIABLE** | project **tồn tại** ở `/Users/tranquangdang21/Projects/pi-ref`; neo 256–271 **chính xác tuyệt đối** | **cao** — đổi lý do cấm port tầng bọc |
| 20 | `test/` có 791 file `.test.ts` | đúng | — |
| 21 | `package.json:523` = `check:types` | đúng | — |
| 22 | addon native cần build | **đã build**; `extensions-runner.test.ts` chạy 87 pass / 0 fail | thấp |
