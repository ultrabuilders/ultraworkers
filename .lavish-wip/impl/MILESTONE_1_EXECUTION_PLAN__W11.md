# Phiếu triển khai — W11. Khoá hợp đồng `strict` qua extension-tool bridge

> Trạng thái: **đã kiểm lại toàn bộ neo tại HEAD `65cc6c1`, branch `milestone-1`.**
> Kế hoạch viết mọi số dòng theo HEAD `ecd516f` — ở HEAD hiện tại **25/42 neo đã trôi**.
> Bảng neo hỏng nằm ở cuối phiếu. Dùng số trong phiếu này, không dùng số trong kế hoạch.

---

## 1. Cái gì thay đổi, quan sát được

Một file test mới `packages/coding-agent/test/tools/strict-declaration-guard.test.ts` bắt được hai hợp đồng trên **giá trị mà bridge trả về**: `strict: true` tường minh phải sống sót qua `customToolToDefinition` → `wrapRegisteredTool` và đọc ra `=== true` ở `RegisteredToolAdapter`; tool không khai báo `strict` phải đọc ra `=== undefined`, không phải `true`. Không dòng production nào đổi, không tạo `constrained-sampling.ts`.

**Đã chạy thật, không suy luận:** bản replica nguyên văn của khối code trong kế hoạch chạy `3 pass / 0 fail` ngay tại workspace này (`bun test`, không cần build gì). Cả hai hợp đồng xanh **hôm nay** — đây là ảnh chụp trạng thái đúng, và một trong hai hợp đồng sẽ đỏ nếu `declare strict` ở `wrapper.ts:67` đổi thành field runtime thật (đã đo: xem mục 5).

---

## 2. Bảng điểm sửa

Chỉ **một** dòng trong toàn bộ công việc:

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/test/tools/strict-declaration-guard.test.ts` | *(file mới — chưa tồn tại)* | *(không có file; `ls` → `No such file or directory`)* | File test 2 `it()`, import 5 symbol, một `STUB_RUNNER` stub, hai helper `stubTool` / `toSessionAdapter` — nguyên văn khối trong §4 |

Không có file production nào khác. Tám file dưới đây chỉ **đọc**, không sửa:

`extensibility/tool-proxy.ts` · `extensibility/extensions/wrapper.ts` · `sdk.ts` · `test/task-executor-mcp-parity.test.ts` · `extensibility/custom-tools/types.ts` · `extensibility/extensions/runner.ts` · `extensibility/extensions/types.ts` · `packages/natives/native/loader-state.js`

**Số đếm đã kiểm, dùng được nguyên văn trong comment test:**

```
$ rg -c "readonly strict = " packages/coding-agent/src/ | awk -F: '{s+=$2} END {print s}'   → 40
$ rg -n "readonly strict = " packages/coding-agent/src/ | grep -c "= true"                     → 37
$ rg -rn constrainedSampling packages/                                                          → 0 hit
```

---

## 3. Các bước

### Bước 1 — Đọc cơ chế thật quyết định hợp đồng
Mở `packages/coding-agent/src/extensibility/tool-proxy.ts` (35 dòng, cả file). Đây **không** nằm ở `wrapper.ts` như kế hoạch nói.

*Neo đã kiểm — `packages/coding-agent/src/extensibility/tool-proxy.ts:6`*
```ts
export function applyToolProxy<TTool extends object>(tool: TTool, wrapper: object): void {
```

*Neo đã kiểm — `packages/coding-agent/src/extensibility/tool-proxy.ts:12`*
```ts
			if (key === "constructor" || visited.has(key) || key in wrapper) {
```
Mọi key đã có sẵn trên `wrapper` bị **bỏ qua** (`continue`), không proxy. `:16` mới là chỗ `Object.defineProperty(wrapper, key, { get() … })` — đó là cơ chế thật sự mang giá trị qua.

> ⚠️ Kế hoạch ghi `wrapper.ts:47` cho call site. **Sai.** Call site thật là `wrapper.ts:77`; `wrapper.ts:47` là một dòng comment trong docblock của hàm khác.

### Bước 2 — Vì sao `strict` sống sót: `declare` không emit
Mở `packages/coding-agent/src/extensibility/extensions/wrapper.ts` dòng **62–82** (kế hoạch ghi 32–48).

*Neo đã kiểm — `packages/coding-agent/src/extensibility/extensions/wrapper.ts:62`*
```ts
export class RegisteredToolAdapter implements AgentTool<any, any, any> {
```
*Neo đã kiểm — `wrapper.ts:67`*
```ts
	declare strict: boolean;
```
*Neo đã kiểm — `wrapper.ts:77`*
```ts
		applyToolProxy(registeredTool.definition, this);
```

`declare` là **type-only, không emit field runtime** ⇒ `"strict" in wrapper` là `false` lúc proxy chạy ⇒ `strict` **được** proxy. Đây chính là cơ chế làm tool có strict sống sót tới adapter — và là cơ chế mong manh mà hợp đồng 1 phải khoá.

Hai neo phụ cùng file (kế hoạch ghi `:32` và `:100` — **cả hai sai**):
- `wrapRegisteredTool` định nghĩa tại **`wrapper.ts:134`**: `return new RegisteredToolAdapter(registeredTool, runner);` tại `:135`
- Call site thứ hai của `applyToolProxy` trong cùng file tại **`wrapper.ts:200`** (kế hoạch ghi `:166`, thực tế `:166` là `function approvalData(value: string): string {`)

### Bước 3 — Nguồn đầu vào
Mở `packages/coding-agent/src/sdk.ts` (kế hoạch ghi `:1188`/`:1205` — **cả hai sai**).

*Neo đã kiểm — `packages/coding-agent/src/sdk.ts:1200`*
```ts
export function customToolToDefinition(tool: CustomTool, sourcePath?: string): ToolDefinition {
```
*Neo đã kiểm — `packages/coding-agent/src/sdk.ts:1212-1214`*
```ts
		// Preserved through RegisteredToolAdapter so MCP-backed tools' explicit
		// `strict: false` (#4336/#4340) survives the custom-tool → definition bridge.
		strict: tool.strict,
```
`sdk.ts:1188` thật ra là `}` đóng hàm `registerEvalCleanup()` — không liên quan.

Kiểu nguồn: `CustomTool.strict?: boolean` tại `packages/coding-agent/src/extensibility/custom-tools/types.ts:199`.

### Bước 4 — Chép khuôn khung từ test sẵn có
Mở `packages/coding-agent/test/task-executor-mcp-parity.test.ts` dòng **53–68** (kế hoạch ghi 64–80 — **sai**; `:64` là dòng giữa thân test).

*Neo đã kiểm — `task-executor-mcp-parity.test.ts:53`*
```ts
	it("survives the custom-tool → definition bridge into the registered session tool", () => {
```
*Neo đã kiểm — `task-executor-mcp-parity.test.ts:61-67`*
```ts
		const definition = customToolToDefinition(proxy);
		expect(definition.strict).toBe(false);
		const adapter = wrapRegisteredTool(
			{ definition, extensionPath: "<sdk>" } as RegisteredTool,
			{ createContext: () => ({}) } as unknown as ExtensionRunner,
		);
		expect(adapter.strict).toBe(false);
```

**Chỉ chép hình dạng**, không chép assertion: tool của nó là `strict: false`, không dùng lại được cho hợp đồng 1 (`toBe(true)`).

Import path cần dùng (lấy từ dòng 5–13 của file đó):
```ts
import type { CustomToolContext } from "../src/extensibility/custom-tools/types";
import type { ExtensionRunner } from "../src/extensibility/extensions/runner";
import type { RegisteredTool } from "../src/extensibility/extensions/types";
import { wrapRegisteredTool } from "../src/extensibility/extensions/wrapper";
import { customToolToDefinition } from "../src/sdk";
```

### Bước 5 — Viết hợp đồng 1 (opt-in sống sót qua bridge)
`CustomTool` có `strict: true` → `customToolToDefinition` → `wrapRegisteredTool` → `expect(adapter.strict).toBe(true)`.

Dùng tên tool **không** nằm trong allowlist Anthropic, để test không vô tình phụ thuộc nhánh allowlist. Allowlist thật là `new Set(["bash", "python", "edit", "find"])` tại `packages/ai/src/providers/anthropic.ts:5384`, gate lọc ở `anthropic.ts:5799-5803`.

*Neo đã kiểm — `packages/ai/src/providers/anthropic.ts:5384`*
```ts
const ANTHROPIC_STRICT_TOOL_ALLOWLIST = new Set(["bash", "python", "edit", "find"]);
```
*Neo đã kiểm — `packages/ai/src/providers/anthropic.ts:5800-5801`*
```ts
		if (!ANTHROPIC_STRICT_TOOL_ALLOWLIST.has(tool.name)) return [];
		if (tool.strict === false) return [];
```

> ⚠️ Kế hoạch ghi allowlist ở `anthropic.ts:5453` và gate ở `:5870`/`:5869`/`:5871`. **Cả bốn sai** — `:5453` là comment trong docblock, `:5870` là `case "refusal":`, `:5869` là `return "toolUse";`, `:5871` là `return "error";` (đều thuộc một hàm khác hẳn).

### Bước 6 — Viết hợp đồng 2 (vắng mặt không được bịa thành opt-in)
Tool **không khai báo** `strict` — phải **omit hẳn key**, không gán `undefined` — → `expect(adapter.strict).toBeUndefined()`.

Đây là hợp đồng phủ định có lý do cụ thể: hai provider opt-in sẽ siết ngay mọi tool extension nếu bridge có giá trị mặc định.

*Neo đã kiểm — `packages/ai/src/providers/openai-codex-responses.ts:5078`*
```ts
		const strict = !!(!NO_STRICT && tool.strict);
```
*Neo đã kiểm — `packages/ai/src/providers/devin.ts:659`*
```ts
			strict: tool.strict ?? false,
```
> Kế hoạch ghi codex là `!!(tool.strict)`. Thật là `!!(!NO_STRICT && tool.strict)` — có guard bypass toàn cục. Không đổi kết luận (vẫn opt-in). Trong comment test cứ viết ngắn `!!tool.strict`.

### Bước 7 — Comment chống hiểu sai trên hợp đồng 2
Viết ngay trên hợp đồng 2: đây **không** phải "vắng mặt = non-strict".

*Neo đã kiểm — `packages/ai/src/providers/openai-completions.ts:2594`*
```ts
		const strict = !NO_STRICT && compat.supportsStrictMode !== false && tool.strict !== false;
```
*Neo đã kiểm — `packages/ai/src/providers/openai-responses.ts:1492`*
```ts
		const strict = !NO_STRICT && strictMode && tool.strict !== false;
```

Cả hai đọc `!== false`, nên **vắng mặt vẫn ra strict** ở hai provider đó. Hợp đồng đang khoá là *"bridge không tự bịa opt-in"*, không phải *"wire mặc định là non-strict"* — đổi mặc định wire là việc khác, không thuộc W11.

### Bước 8 — Chạy cổng
Xem §5. Ngắn gọn:
```bash
bunx oxfmt --check 'packages/coding-agent/test/tools/strict-declaration-guard.test.ts'
bunx oxlint packages/coding-agent/test/tools/strict-declaration-guard.test.ts
bun run check:ts
bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts   # kỳ vọng: 2 pass
```

### Bước 9 — Ghi nhận khoảng trống cố ý
Năm dòng `readonly strict = true` của builtin **không** được khoá (xem §6 và bảng neo).

---

## 4. Hình dạng code

Khối dưới đây **đã chạy thật** tại HEAD `65cc6c1` — `3 pass / 0 fail`, không cần build native addon. Bỏ `it()` thứ ba (probe hồi quy) đi khi viết file thật.

```typescript
import { describe, expect, it } from "bun:test";
import type { CustomTool } from "../src/extensibility/custom-tools/types";
import type { ExtensionRunner } from "../src/extensibility/extensions/runner";
import type { RegisteredTool } from "../src/extensibility/extensions/types";
import { wrapRegisteredTool } from "../src/extensibility/extensions/wrapper";
import { customToolToDefinition } from "../src/sdk";

// The adapter only needs a context factory; it is never exercised on this path.
const STUB_RUNNER = { createContext: () => ({}) } as unknown as ExtensionRunner;

function stubTool(name: string, strict?: boolean): CustomTool {
	const tool: CustomTool = {
		name,
		label: name,
		description: `stub ${name}`,
		parameters: { type: "object", properties: {} },
		async execute() {
			return { content: [{ type: "text", text: "ok" }] };
		},
	};
	// Assign only when the caller asked for a value, so the "absent" case omits
	// the key outright — that omitted state is what contract 2 is about.
	if (strict !== undefined) tool.strict = strict;
	return tool;
}

function toSessionAdapter(name: string, strict?: boolean) {
	const definition = customToolToDefinition(stubTool(name, strict));
	return wrapRegisteredTool({ definition, extensionPath: "<test>" } as RegisteredTool, STUB_RUNNER);
}

describe("strict across the extension-tool bridge", () => {
	it("keeps an explicit strict:true opt-in on the registered session tool", () => {
		// applyToolProxy skips any key already present on the wrapper
		// (tool-proxy.ts:12). It works today only because `declare strict` on
		// RegisteredToolAdapter (wrapper.ts:67) emits no runtime field.
		expect(toSessionAdapter("opt-in", true).strict).toBe(true);
	});

	it("does not fabricate an opt-in for a tool that never declared strict", () => {
		// NOT "absent means non-strict": openai-completions.ts:2594 reads
		// `tool.strict !== false`, so an omitted flag is still strict there. What is
		// locked here is narrower — the bridge must not invent a value, because the
		// two opt-in providers would tighten every extension tool on its own:
		// openai-codex-responses.ts:5078 (`!!tool.strict`), devin.ts:659
		// (`tool.strict ?? false`).
		expect(toSessionAdapter("no-strict").strict).toBeUndefined();
	});
});
```

⚠️ Comment trong khối trên đã được sửa số dòng cho đúng HEAD hiện tại (`wrapper.ts:37` → `wrapper.ts:67`). Kế hoạch viết `wrapper.ts:37` — sai.

---

## 5. Cổng

### 5.1 Cổng chính — **ĐỎ ĐƯỢC, và đang XANH ngay lúc này**

```bash
bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts
# kỳ vọng: 2 pass, 0 fail
```

**Câu trả lời cụ thể: cổng này đỏ được, bằng cách nào — và nó KHÔNG bị chặn.**

Kế hoạch khẳng định cổng này **không chạy được** vì thiếu native addon, và dặn trước `bun --cwd=packages/natives run build`. **Điều đó sai ở HEAD hiện tại.** Đã kiểm:

```
$ ls -la packages/natives/native/pi_natives.darwin-arm64.node
-rwxr-xr-x  185 MB  Tue Sep 29 06:39:54  pi_natives.darwin-arm64.node

$ bun test packages/coding-agent/test/task-executor-mcp-parity.test.ts
 7 pass
 0 fail
```

Addon **đã build sẵn**. File test *đã tồn tại* chạy xanh `7 pass / 0 fail`. Cổng của W11 vì thế chạy được **ngay, không một bước build nào**, và cả hai hợp đồng đã đo là xanh.

→ **Cổng phải đỏ được bằng cơ chế thật, không phải bằng cảnh báo miệng.** Đừng biến nó thành cổng luôn xanh. Bằng chứng đỏ đã đo, chạy thật:

Giả sử ai đó đổi `declare strict: boolean;` (`wrapper.ts:67`) thành field runtime thật (`strict: boolean = false`). Field initializer chạy **trước thân constructor** nên `"strict" in this` thành `true`, guard `key in wrapper` ở `tool-proxy.ts:12` **bỏ qua** proxy, và `adapter.strict` đọc ra `false` dù definition có `strict: true`. Đo được:

```
PROBE fake field-initializer result: false
```

Silent breakage — không throw, không cảnh báo, không log. Hợp đồng 1 đỏ. Hợp đồng 2 vẫn xanh (nó vốn trả `undefined`). Vì vậy **hợp đồng 1 là hợp đồng phải có**; đừng bao giờ gộp hai cái thành một.

### 5.2 Cổng phụ — chạy được ngay

```bash
bunx oxfmt --check 'packages/coding-agent/test/tools/strict-declaration-guard.test.ts'
bunx oxlint packages/coding-agent/test/tools/strict-declaration-guard.test.ts
bun run check:ts
```

Đã kiểm: `oxfmt 0.65.0` và `oxlint 1.85.0` có sẵn qua `bunx`; `oxfmt --check` trên một file test có sẵn → `All matched files use the correct format.`

**Đỏ được không?** `oxfmt --check` và `oxlint` đỏ ngay khi file lệch format/lint — đó là điều kiện đủ để bắt lỗi cơ bản, nhưng **không** bắt được hồi quy `strict`. Đừng coi đây là cổng bảo vệ hợp đồng; nó là cổng vệ sinh. Cổng bảo vệ hợp đồng là §5.1.

`bun run check:ts` = `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types` (`package.json:90`), và `check:tools` = `oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' …` (`package.json:91`) — glob này **có** phủ file test mới, nên file nằm trong gate. Đúng như kế hoạch nói về glob; chỉ sai số dòng.

> ⚠️ `bun check` = `check:ts` + `check:rs` (`package.json:89`); `check:rs` cần cargo. Chỉ chạy `check:ts`. Tuyệt đối không `tsc`/`npx tsc`.

### 5.3 Cổng KHÔNG dùng

Đếm số tool có strict · đọc `readonly strict = true` trên 5 builtin · bất kỳ source-grep nào lên file implementation. AGENTS.md cấm source-grep trong test, và cả ba đều là static echo — xanh giả, không bắt được gì.

---

## 6. Hợp đồng test

**File:** `packages/coding-agent/test/tools/strict-declaration-guard.test.ts`
**Suite:** `describe("strict across the extension-tool bridge")` — 2 `it()`.

| # | Case | Assert | Vì sao không phải passthrough |
| --- | --- | --- | --- |
| 1 | `keeps an explicit strict:true opt-in on the registered session tool` | `expect(toSessionAdapter("opt-in", true).strict).toBe(true)` | Giá trị đi qua proxy phản ánh dùng `Reflect.ownKeys` + `Object.defineProperty` (`tool-proxy.ts:11,16`), và guard `key in wrapper` (`:12`) **có thể bỏ qua nó**. Đã chứng minh bỏ qua thật — xem §5.1. |
| 2 | `does not fabricate an opt-in for a tool that never declared strict` | `expect(toSessionAdapter("no-strict").strict).toBeUndefined()` | Hợp đồng phủ định có lý do cụ thể: `openai-codex-responses.ts:5078` (`!!tool.strict`) và `devin.ts:659` (`tool.strict ?? false`) sẽ siết **mọi** tool extension nếu bridge có giá trị mặc định. |

**Nếu hồi quy:** ai đó sửa `customToolToDefinition` (`sdk.ts:1214`) hoặc `applyToolProxy`, `strict` rơi khỏi đường extension và hành vi đổi **theo provider** — `devin`/`codex` mất strict, còn OpenAI/Anthropic không đổi (vì chúng opt-out bằng `!== false`, và `bash`/`edit` đều nằm trong allowlist `anthropic.ts:5384`). Không ai truy ra nguồn. Đó đúng là lý do file test này tồn tại.

**Khoảng trống cố ý:** năm dòng `readonly strict = true` của builtin **không** được khoá. Đã xác nhận không có cách rẻ nào khoá chúng mà không thành static echo. Xoá dòng đó chỉ đổi hành vi trên **hai** provider opt-in — một assertion đọc field class không bắt được. Khoá thật là provider round-trip, cỡ M. Với wave hiện tại (S), mặc định là **không khoá**, và người đọc phải biết khoảng trống đó còn ở đó.

*(Bốn dòng builtin trong kế hoạch đúng; `bash.ts:604` sai — xem bảng neo. Đường dẫn `edit/index.ts` sai cấp thư mục.)*

---

## 7. Cạm bẫy riêng của work item này

**Cạm bẫy 1 — sống sót sai lầm (rủi ro lớn nhất).** Ai đó đọc D-1, thấy cỡ S, rồi vẫn port vì bản gốc viết rõ: dựng `constrained-sampling.ts` cạnh `normalize.ts` và thêm field thứ hai cạnh `strict`. Kết quả là **hai nguồn sự thật** cho cùng một điều, đúng cái lỗi dossier chỉ ra ở W7. Hiện tại `rg constrainedSampling packages/` → **0 hit** — đừng làm nó thành 1.

**Cạm bẫy 2 — tin số dòng trong kế hoạch.** Kế hoạch viết mọi số theo `ecd516f`; HEAD hiện tại là `65cc6c1` và **18/24 neo đã trôi**. Viết comment trong test trích `wrapper.ts:37` sẽ trỏ vào dòng `renderCall?: (args, options, theme) => any;` — sai, và sai một cách rất khó nhận ra vì dòng đó cũng nằm trong class đó. Dùng số trong phiếu này.

**Cạm bẫy 3 — đi tìm `edit.ts` không tồn tại rồi bị kẹt.** Bề mặt edit của omp là `write` + `ast_edit` + `edit/index.ts` cộng wire alias `apply_patch`, không có file `edit.ts` đơn. Alias xác nhận tại `packages/coding-agent/test/extensions-runner.test.ts:2364`:
```ts
					tool: { ...approvalTool, name: "edit", customWireName: "apply_patch" },
```

**Cạm bẫy 4 — tin phần "Cổng hoàn thành" của kế hoạch.** Nó bảo phải build native addon trước, cảnh báo `brew install ninja`. Ở HEAD này addon đã có sẵn 185 MB. Chạy build là **lãng phí vài phút cộng rủi ro hỏng môi trường** để làm một việc đã xong.

**Cạm bẫy 5 — viết lại hai hợp đồng đã có.** `strict: false` tường minh sống sót tới wire đã có test: `packages/ai/test/openai-tool-strict-mode.test.ts:196,215,801,817,835` (đã kiểm cả 5 — đúng). Schema suy giãm xuống non-strict thay vì ném đã có: `packages/ai/test/schema-strict-mode.test.ts:742` và `:768` (kế hoạch ghi 755/781 — sai). Chỉ viết hai hợp đồng của W11.

---

## 8. Bảng neo đã kiểm

`✓` = neo đúng nguyên văn. `✗` = **HỎNG** — cột "thực tế" là vị trí đúng, tìm bằng `rg -n` / `awk`.

| Neo trong kế hoạch | Thực tế | Nội dung thật ở vị trí đúng |
| --- | --- | --- |
| `extensibility/tool-proxy.ts:12` | ✓ | `if (key === "constructor" \|\| visited.has(key) \|\| key in wrapper) {` |
| `extensibility/tool-proxy.ts:6` (định nghĩa) | ✓ | `export function applyToolProxy<TTool extends object>(tool: TTool, wrapper: object): void {` |
| `extensibility/extensions/wrapper.ts:37` | ✗ → **:67** | `declare strict: boolean;` |
| `extensibility/extensions/wrapper.ts:47` | ✗ → **:77** | `applyToolProxy(registeredTool.definition, this);` |
| `extensibility/extensions/wrapper.ts:32-48` | ✗ → **62-82** | thân `RegisteredToolAdapter` |
| `wrapper.ts:32` (RegisteredToolAdapter) | ✗ → **:62** | `export class RegisteredToolAdapter implements AgentTool<any, any, any> {` |
| `wrapper.ts:100` (wrapRegisteredTool) | ✗ → **:134** | `export function wrapRegisteredTool(registeredTool: RegisteredTool, runner: ExtensionRunner): AgentTool {` |
| `wrapper.ts:166` (call site thứ hai) | ✗ → **:200** | `applyToolProxy(tool, this);` |
| `sdk.ts:1188` | ✗ → **:1200** | `export function customToolToDefinition(tool: CustomTool, sourcePath?: string): ToolDefinition {` |
| `sdk.ts:1205` | ✗ → **:1214** | `strict: tool.strict,` (comment #4336/#4340 ở :1212-1213) |
| `test/task-executor-mcp-parity.test.ts:64-80` | ✗ → **53-68** | `it("survives the custom-tool → definition bridge…` |
| `package.json:94-95` (check:tools) | ✗ → **:91** | `"check:tools": "oxlint . && oxfmt --check 'packages/*/{test,…}/**/*.ts' …"` |
| `package.json:93` (bun check) | ✗ → **:89** | `"check": "bun run --parallel check:ts check:rs"` |
| `packages/natives/native/loader-state.js:970` | ✓ | `throw new Error(` → `Failed to load pi_natives native addon for …` |
| `openai-codex-responses.ts:5078` | ✓ | `const strict = !!(!NO_STRICT && tool.strict);` (kế hoạch ghi `!!(tool.strict)` — thiếu guard) |
| `devin.ts:659` | ✓ | `strict: tool.strict ?? false,` |
| `openai-completions.ts:2594` | ✓ | `const strict = !NO_STRICT && compat.supportsStrictMode !== false && tool.strict !== false;` |
| `openai-responses.ts:1492` | ✓ | `const strict = !NO_STRICT && strictMode && tool.strict !== false;` |
| `anthropic.ts:5453` (allowlist) | ✗ → **:5384** | `const ANTHROPIC_STRICT_TOOL_ALLOWLIST = new Set(["bash", "python", "edit", "find"]);` |
| `anthropic.ts:5870` (gate) | ✗ → **:5799-5803** | `const candidateIndexes = tools.flatMap(…)` |
| `anthropic.ts:5869` (gate) | ✗ → **:5810** | `if (strictToolCount >= MAX_ANTHROPIC_STRICT_TOOLS) break;` |
| `anthropic.ts:5871` (keyword) | ✗ → **:5802** | `if (hasAnthropicStrictIncompatibleKeyword(toolWireSchema(tool))) return [];` |
| `bash.ts:604` | ✗ → **:614** | `readonly strict = true;` |
| `read.ts:861` | ✓ | `readonly strict = true;` |
| `write.ts:440` | ✓ | `readonly strict = true;` |
| `ast-edit.ts:187` | ✓ | `readonly strict = true;` |
| `tools/edit/index.ts:329` | ✗ → **`src/edit/index.ts:329`** | `readonly strict = true;` — dòng đúng, **thiếu cấp `tools/`** trong đường dẫn |
| `extensions/types.ts:611/636` (interface) | ✗ → **:638** | `export interface ToolDefinition<TParams …> {` |
| `extensions/types.ts:636/661` (field) | ✗ → **:663** | `strict?: boolean;` |
| `ai/src/types.ts:1438` | ✗ → **:1427** | `export interface Tool<TParameters extends TSchema = TSchema> {` |
| `ai/src/types.ts:1443` | ✗ → **:1432** | `strict?: boolean;` |
| `mcp/tool-bridge.ts:665, :775` | ✓ | `readonly strict = false as const;` |
| `task/index.ts:563` | ✓ | `readonly strict = false;` |
| `CONSTRAINTS.md:51` | ✗ → **:52** | `` `tryEnforceStrictSchema` MUST return `{ strict: false, schema: original }` `` (`:51` là heading) |
| `CONSTRAINTS.md:56` | ✗ → **:57** | `Callers MUST preserve an author's explicit tool.strict === false …` |
| `normalize.ts:2436` | ✓ (thiếu path) | `export function tryEnforceStrictSchema(schema: Record<string, unknown>): {` — path thật `packages/ai/src/utils/schema/normalize.ts` |
| `extensions-runner.test.ts:2436` (apply_patch) | ✗ → **:2364** | `tool: { ...approvalTool, name: "edit", customWireName: "apply_patch" },` |
| `openai-tool-strict-mode.test.ts:196,215,801,817,835` | ✓ | cả 5 là dòng `it("preserves/omits explicit strict:false …` |
| `schema-strict-mode.test.ts:755,781` | ✗ → **:742, :768** | `it("downgrades to non-strict mode when strict enforcement throws"` · `it("degrades to non-strict when array items is an empty schema"` |
| `tools/provider-schema-compatibility.test.ts:99-101` | ✓ (lệch 1) | assert thật ở **:100-101**; kết luận (chỉ phủ giá trị tường minh) vẫn đúng |
| host-tools.ts:59 · custom-tools/wrapper.ts:27 · hooks/tool-wrapper.ts:38 | ✓ | cả 3 là call site `applyToolProxy(...)` |
| `extensions/wrapper.ts:77, :200` | ✓ | 2 call site `applyToolProxy(...)` trong file này |
| `constrainedSampling` = 0 hit | ✓ | `rg constrainedSampling packages/` → 0 |
| 40 hit / 37 `= true` / 3 opt-out | ✓ | đếm lại tại `65cc6c1`, khớp tuyệt đối |
| git HEAD `ecd516f` | ✗ → **`65cc6c1`** | branch `milestone-1` |
| "addon chưa build, `bun test` đỏ" | ✗ → **đã build** | `pi_natives.darwin-arm64.node` 185 MB; parity test `7 pass / 0 fail` |

**Tổng: 42 dòng neo — 17 ✓ · 25 ✗.** (25 dòng hỏng tập trung ở ba nhóm: dòng trong `wrapper.ts`, dòng trong `sdk.ts`, và cụm bốn neo Anthropic mà kế hoạch đặt lệch ~380 dòng.)

---

## 9. Cần người quyết (giữ nguyên từ kế hoạch, chuyển sang M2)

- **Ba trạng thái `strict: "prefer"` của `pi` hay boolean của `omp`?** Chuyển sang M2, **không** quyết ở M1. Đây là quyết định về bề mặt authoring của extension (`ToolDefinition`), đúng loại câu hỏi M2 WI-10 dành cho. M1 giữ boolean.
- **Nâng W11 lên M để khoá 5 dòng `readonly strict = true` của builtin không?** Nếu không nâng, phải ghi rõ khoảng trống này vào bảng wave để người đọc không tưởng là sót. (Khoá thật = provider round-trip, cỡ M.)
