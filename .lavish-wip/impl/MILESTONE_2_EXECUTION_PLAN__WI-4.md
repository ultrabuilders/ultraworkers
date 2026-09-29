# WI-4 — Đóng backdoor `toolRenderers`

Nguồn: `MILESTONE_2_EXECUTION_PLAN.md` mục `## WI-4` (dòng 1809–1975).
Mọi neo dưới đây đã mở và đọc trên cây hiện tại. Số dòng trong "TRƯỚC" là số thật đã đo.

---

## 1. Cái gì thay đổi, quan sát được

Một plugin bên thứ ba gán `toolRenderers.grep = …` hôm nay cướp được transcript của **mọi** lệnh gọi grep trong **mọi** session của tiến trình đó; sau thay đổi này, lệnh gán đó ném `TypeError` ngay lúc extension ESM được load, và một contributor viết dòng ghi đó không còn type-check được nữa — trong khi renderer do chính tool definition mang vẫn thắng renderer có sẵn y như cũ.

---

## 2. Bảng điểm sửa

| path | symbol | TRƯỚC (trích nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/tui/src/tools/index.ts:35` | `toolRenderers` (khai báo) | `export const toolRenderers: Record<string, ToolRenderer> = {` | `export const toolRenderers: Readonly<Record<string, ToolRenderer>> = Object.freeze<Record<string, ToolRenderer>>({` |
| `packages/tui/src/tools/index.ts:70` | đóng object literal | `};` | `});` |
| `packages/tui/src/tools/index.ts:73` | `setXdevRendererLookup(name => toolRenderers[name]);` | **không đổi** | **không đổi** — closure chỉ-đọc |
| `packages/tui/test/tool-renderers-frozen.test.ts` | file mới | không tồn tại | 3 test (xem §4) |
| `packages/coding-agent/test/extension-tool-renderer-registration.test.ts` | file mới | không tồn tại | 1 test (xem §4) |
| `packages/tui/package.json:94-97` | `"./*"` export-map | **không chạm tới** | **không chạm tới** |

31 entry renderer (dòng 36–69) giữ nguyên — đã đếm: `awk 'NR>=36 && NR<=69' … | grep -cE '^\t[a-z_]+:'` → `31`.

---

## 3. Các bước

### Bước 1 — Chạy lại kiểm kê zero-writer (tiền đề, phải chạy lại vào ngày làm)

```bash
git grep -nE 'toolRenderers\[[^]]*\] *=|toolRenderers\.[A-Za-z_$]+ *=|delete toolRenderers' -- packages
```
Đã chạy: **0 hit**, exit 1. Cả mẫu rộng của cổng (b) cũng 0 hit.

```bash
git grep -n toolRenderers -- packages
```
Đã chạy: **13 hit trên 5 file** — xem bảng dưới. (Plan ghi 14; xem §6 cạm bẫp 1.)

| file | dòng | số hit |
| --- | --- | --- |
| `packages/coding-agent/src/cli/gallery-cli.ts` | 16, 141, 307, 344 | 4 |
| `packages/coding-agent/test/gallery-cli.test.ts` | 18, 79 | 2 |
| `packages/coding-agent/test/tools/apply-patch-renderer.test.ts` | 8, 73, 86 | 3 |
| `packages/tui/src/chat/tool-execution.ts` | 17, 355 | 2 |
| `packages/tui/src/tools/index.ts` | 35, 73 | 2 |

Tất cả đều là lượt đọc. Dừng lại và kiểm kê lại nếu số đã dịch chuyển — một writer mới nghĩa là freeze không còn là XS.

### Bước 2 — Sửa dòng khai báo

Neo: `packages/tui/src/tools/index.ts:35`. Thay nguyên dòng 35 bằng dòng trong bảng §2. **Giữ nguyên** dòng comment 34 và cả 31 entry.

Type argument tường minh `<Record<string, ToolRenderer>>` trên `Object.freeze` là điểm mấu chốt: nó định kiểu object literal thành `Record<string, ToolRenderer>` (nên 31 renderer dị dạng vẫn được kiểm tra y như hiện tại), trong khi kiểu của `const` mang `Readonly` — và đó mới là thứ biến một lệnh ghi thành lỗi compile.

### Bước 3 — Đóng lời gọi

Neo: `packages/tui/src/tools/index.ts:70`. `};` → `});`. Không di chuyển dòng 73.

### Bước 4 — `packages/tui/test/tool-renderers-frozen.test.ts` (file mới, mã dưới đây đã chạy xanh)

### Bước 5 — `packages/coding-agent/test/extension-tool-renderer-registration.test.ts` (file mới, mã dưới đây đã chạy xanh)

### Bước 6 — Chạy cổng theo thứ tự §5

---

## 4. Hợp đồng test

Hai file, **không trùng lặp**: file 1 chứng minh global đã đóng, file 2 chứng minh cánh cửa bên cạnh vẫn mở.

### (1) `packages/tui/test/tool-renderers-frozen.test.ts` — 3 test

Mã này đã chạy thật: **3 pass / 0 fail**.

```ts
import { beforeAll, describe, expect, it, vi } from "bun:test";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import { Text } from "@oh-my-pi/pi-tui";
import { ToolExecutionComponent } from "@oh-my-pi/pi-tui/chat/tool-execution";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import { toolRenderers } from "../src/tools/index";

const ui = () => ({
	requestRender: vi.fn(),
	requestComponentRender: vi.fn(),
	resetDisplay: vi.fn(),
});

const stripAnsi = (s: string): string => s.replace(/\[[0-9;]*m/g, "");

describe("built-in tool renderer registry", () => {
	beforeAll(async () => {
		await initTheme();
	});

	it("is read-only at the type level, not only at runtime", () => {
		const _typeOnly = (): void => {
			// @ts-expect-error toolRenderers must refuse writes — the backdoor is closed.
			toolRenderers.probe_backdoor = toolRenderers.bash;
		};
		expect(_typeOnly).toBeDefined();
	});

	it("rejects an out-of-band write from a third-party importer", () => {
		expect(() => {
			(toolRenderers as Record<string, unknown>).probe_backdoor = toolRenderers.bash;
		}).toThrow(TypeError);
		expect((toolRenderers as Record<string, unknown>).probe_backdoor).toBeUndefined();
	});

	it("still lets a tool definition's own renderResult override the frozen global", () => {
		const marker = "EXTENSION-OWNED-RENDER";
		const tool = {
			name: "bash",
			label: "Bash",
			renderResult: () => new Text(marker, 0, 0),
		} as unknown as AgentTool;

		expect(toolRenderers.bash).toBeDefined();

		const component = new ToolExecutionComponent("bash", { command: "echo hi" }, {}, tool, ui());
		component.setExecutionStarted();
		component.updateResult({ content: [{ type: "text", text: "hi" }] }, false);

		expect(stripAnsi(component.render(80).join("\n"))).toContain(marker);
	});
});
```

**Vì sao chọn tên `bash` trong test 3:** đó là một key thật của registry (`toolRenderers.bash` được assert `toBeDefined()` ngay trước đó), nên test chỉ pass khi hook per-tool thắng — không thể pass do global vắng mặt. Đây là cách chứng minh freeze không biến global thành đường bắt buộc.

**Nếu hồi quy, người dùng thấy:** một plugin gán `toolRenderers.grep = …` âm thầm cướp transcript của mọi lệnh gọi grep trong mọi session, cho mọi importer của module đó, không chủ sở hữu, không thứ tự, không gỡ xuống được.

### (2) `packages/coding-agent/test/extension-tool-renderer-registration.test.ts` — 1 test

Mã này đã chạy thật: **1 pass / 0 fail**. Bám khuôn `test/issue-13081-extension-renderer-theme-slot.test.ts`.

```ts
import { describe, expect, test } from "bun:test";
import { Text, type Component } from "@oh-my-pi/pi-tui";
import { getThemeByName, type Theme } from "@oh-my-pi/pi-tui/theme";
import { ExtensionRuntime, loadExtensionFromFactory } from "../src/extensibility/extensions/loader";
import { ExtensionRunner } from "../src/extensibility/extensions/runner";
import type { ToolRenderResultOptions } from "../src/extensibility/extensions/types";
import { wrapRegisteredTools } from "../src/extensibility/extensions/wrapper";
import { EventBus } from "../src/utils/event-bus";

const okResult = { content: [{ type: "text" as const, text: "ok" }] };
const MARKER = "EXT-OWNED-RESULT";

const uiTheme = await getThemeByName("dark");
if (!uiTheme) throw new Error("dark theme missing");

/** `AgentTool.renderResult` (packages/agent/src/types.ts:1179) nhận BA đối số. */
type RenderResult = (result: unknown, options: ToolRenderResultOptions, theme: Theme) => Component;

function isComponent(value: unknown): value is Component {
	return !!value && typeof value === "object" && "render" in value && typeof value.render === "function";
}

async function renderRegisteredToolResult(): Promise<string> {
	const renderResult: RenderResult = () => new Text(MARKER, 0, 0);

	const runtime = new ExtensionRuntime();
	const extension = await loadExtensionFromFactory(
		pi => {
			pi.registerTool({
				name: "bash",
				label: "Bash",
				description: "extension-owned tool reusing a built-in name",
				parameters: pi.arktype({}),
				execute: async () => okResult,
				renderResult,
			});
		},
		"/project",
		new EventBus(),
		runtime,
		"@ext/probe@1.0.0",
	);

	const runner = new ExtensionRunner(
		[extension],
		runtime,
		"/project",
		{ getCwd: () => "/project" } as never,
		{} as never,
	);
	const tool = wrapRegisteredTools(runner.getAllRegisteredTools(), runner)[0];
	if (!tool?.renderResult) throw new Error("renderResult missing on wrapped tool");

	const rendered = tool.renderResult(okResult, { expanded: false, isPartial: false }, uiTheme);
	if (!isComponent(rendered)) throw new Error("renderer returned no component");
	return Bun.stripANSI(rendered.render(80).join("\n"));
}

describe("extension tool renderer registration", () => {
	test("a definition's own renderResult survives the frozen built-in registry", async () => {
		expect(await renderRegisteredToolResult()).toContain(MARKER);
	});
});
```

**Nếu hồi quy, người dùng thấy:** tool definition mang `renderResult` của riêng nó không còn render ra byte của nó. Đây là chế độ hỏng **tinh vi**: nó không nổ tung ồn lào, chỉ đẩy tác giả extension quay lại mutate global — phá hủy toàn bộ ý nghĩa của mục này trong khi mọi test khác vẫn xanh.

---

## 5. Cổng

### Các lệnh (đã chạy thật trên cây đã vá)

```bash
# 1
bun run --cwd packages/tui check:types
# 2
bun run --cwd packages/coding-agent check:types
# 3
bunx oxlint packages/tui/src/tools/index.ts && bunx oxfmt --check packages/tui/src/tools/index.ts
# 4
bun run check:ts
# 5
(cd packages/tui && bun test test/tool-renderers-frozen.test.ts)
# 6
(cd packages/coding-agent && bun test test/extension-tool-renderer-registration.test.ts)
# 7 — bất biến, phải rộng hơn mẫu kiểm kê ở bước 1
git grep -nE 'toolRenderers\[[^]]*\] *=|toolRenderers\.[A-Za-z_$]+ *=|delete toolRenderers|Object\.assign\(toolRenderers|Reflect\.(set|defineProperty)\(toolRenderers' -- packages
```

**Kết quả đo trên cây đã vá:** lệnh 1 exit 0; lệnh 2 exit 0; lệnh 3 lint 0, `oxfmt --check` "All matched files use the correct format"; lệnh 4 (`check:ts` toàn repo) exit 0; lệnh 5 **3 pass / 0 fail**; lệnh 6 **1 pass / 0 fail**; lệnh 7 **0 hit**.

### Cổng này có ĐỎ ĐƯỢC không — và bằng cách nào

**Có, nhưng phải đo từng nửa.** Đây là phần quan trọng nhất, và hai nửa đỏ **khác nhau**:

| trạng thái | `check:ts` | `bun test` file (1) |
| --- | --- | --- |
| Đầy đủ (`Readonly` + `Object.freeze`) | xanh | 3 pass |
| **Bỏ `Readonly`, giữ `Object.freeze`** | **ĐỎ** `test/tool-renderers-frozen.test.ts(39,4): error TS2578: Unused '@ts-expect-error' directive.` | **vẫn 3 pass — xanh giả** |
| **Giữ `Readonly`, bỏ `Object.freeze`** | xanh | **ĐỎ** `Expected constructor: TypeError / Received function did not throw` |

Đọc bảng: **không nửa nào tự đỏ.** Một `Object.freeze` trần, không kèm `Readonly`, là thay đổi **hoàn toàn vô hình** với toàn bộ cổng — type check xanh, ba test xanh, lint xanh. Chỉ có khẳng định `@ts-expect-error` trong test (1) mới biến nó thành đỏ (TS2578).

Ngược lại, `Readonly` không kèm `Object.freeze` thì type check xanh và chỉ test runtime bắt được — vì một `const` khai báo kiểu `Readonly` vẫn gán được ở runtime.

**Kết luận: giữ cả hai nửa, và giữ cả hai file test.** Bỏ `@ts-expect-error` đi là biến cổng (a) thành xanh giả. Bỏ `Object.freeze` đi là biến test runtime thành cổng duy nhất canh nửa runtime.

### KHÔNG phải cổng

`bun test` nói chung **không phải** tiền đề ở checkout này — xem §6 cạm bẫp 2, plan đã lỗi thời ở đây. Lệnh 5 và 6 là regression pin, không phải điều kiện để merge.

---

## 6. Cạm bẫp riêng của work item này

**1. Con số kiểm kê trong plan đã cũ (13, không phải 14).** Bước 1 của plan liệt kê `apply-patch-renderer.test.ts:8,29,77,90` (4 hit). Đo lại hôm nay: file đó có **3 hit tại 8, 73, 86**; tổng là **13 hit trên 5 file**, không phải 14. Cũng lưu ý đính chính #6 của plan tự mâu thuẫn với chính nó: một bản nói "23 module renderer con", một bản nói "20". Lời khuyên: chạy `git grep -n toolRenderers -- packages` và **dùng số đo được**, đừng dán danh sách của plan vào PR description.

**2. "Cần build native addon" trong plan đã lỗi thời — cả hai file test chạy được ngay.** Plan dành cả một mục "Xác minh" cho việc này và dựng cả cổng (c) "hai file test chưa commit được vì chưa chạy được ở đây". Trên cây hiện tại `packages/natives/native/pi_natives.darwin-arm64.node` **đã tồn tại** (185 MB). Đo lại: `bun test test/countdown-timer.test.ts` → 2 pass; `bun test test/tools/apply-patch-renderer.test.ts` → 7 pass; probe import `../src/tools/index` → pass; probe import `wrapRegisteredTools` → pass. **Cả hai file test trong §4 đều chạy và xanh.** `bazel`/`bazelisk` không có trên PATH nhưng `ninja` thì có (`/opt/homebrew/bin/ninja`) — và không cần đến. Đừng dùng cổng (c) làm lý do để commit test đỏ.

**3. Bẫy lớn nhất: đừng viết khẳng định kiểu như một assert runtime thật.** Bản `@ts-expect-error` mà plan viết đặt thẳng vào thân `test()`:

```ts
// SAI — ném TypeError ngay trong test, test đỏ dù code đúng
test("...", () => {
    expect(toolRenderers.bash).toBeDefined();
    // @ts-expect-error ...
    toolRenderers.probe_backdoor = toolRenderers.bash;
});
```

Đã thử: fail với `TypeError: Attempting to define property on object that is not extensible.` Nguyên nhân: file test ESM strict-mode, `Object.freeze` khiến phép gán ném thật. Sửa đúng là bọc vào một hàm **không bao giờ được gọi** (`const _typeOnly = (): void => { … }`) — type checker vẫn kiểm tra, runtime không chạy. Đây cũng đúng nguyên tắc AGENTS.md: "Compile-time guarantees → type checks/type tests, not runtime placeholders."

**4. `AgentTool.renderResult` nhận BA đối số, không phải bốn.** `packages/agent/src/types.ts:1179` khai báo `(result, options, theme)`. Đối số `args` thứ tư chỉ là tham số nội bộ mà `RegisteredToolAdapter` dùng để gọi `definition.renderResult` (`wrapper.ts:92-99`). Đã thử truyền 4 đối số → `test/extension-tool-renderer-registration.test.ts(69,95): error TS2554: Expected 3 arguments, but got 4.`

**5. `tool-execution.ts:355` chỉ là một lượt đọc — đừng sửa nó.** `this.#renderer = options.useBuiltInRenderer === false ? undefined : toolRenderers[toolName];`. `Readonly` không đụng tới index-read. Trường `useBuiltInRenderer` trong `ToolExecutionOptions` (`tool-execution.ts:156-160`) là đường thoát thứ hai đã có sẵn, và nó **không** cần thay đổi.

**6. Đừng gộp việc thu hẹp export-map.** `packages/tui/package.json:94-97` là `"./*"`, và entry `"./tools"` thật sự dùng trong repo nằm ở **dòng 86** — một entry riêng, tường minh, không bị wildcard che. (Plan ghi 93-96; đính chính của plan ghi 94-97 — **đính chính đúng**, đo lại xác nhận 94.) Việc này đổi bề mặt công khai, là câu hỏi mở riêng, và không cần cho freeze. Nếu bạn thấy mình đang mở `package.json` thì bạn đang làm sai work item.

**7. Cạm bẫp còn lại theo plan:** đừng gộp `"});"` vào một dòng khác (ví dụ gộp với `write: writeToolRenderer,`); giữ nguyên dòng 73 `setXdevRendererLookup(name => toolRenderers[name]);` — nó là closure chỉ-đọc và phải tiếp tục chạy.

---

## Phụ lục — neo đã kiểm

| neo trong plan | trạng thái |
| --- | --- |
| `packages/tui/src/tools/index.ts:35` | **ĐÚNG** — `export const toolRenderers: Record<string, ToolRenderer> = {` |
| `packages/tui/src/tools/index.ts:70` | **ĐÚNG** — `};` (đóng literal) |
| `packages/tui/src/tools/index.ts:73` | **ĐÚNG** — `setXdevRendererLookup(name => toolRenderers[name]);` |
| `packages/tui/src/tools/xdev.ts:48` | **ĐÚNG** — `export function setXdevRendererLookup(lookup: (name: string) => ToolRenderer \| undefined): void {` |
| `packages/tui/src/chat/tool-execution.ts:17,355` | **ĐÚNG** |
| `packages/coding-agent/src/cli/gallery-cli.ts:16,141,307,344` | **ĐÚNG** (4 hit) |
| `packages/coding-agent/test/gallery-cli.test.ts:18,79` | **ĐÚNG** (2 hit) |
| `packages/coding-agent/test/tools/apply-patch-renderer.test.ts:8,29,77,90` | **CŨ** — thật là 8, 73, 86 (3 hit, không phải 4) |
| "14 hit trên 5 file" | **CŨ** — 13 hit trên 5 file |
| `packages/tui/package.json:93-96` | **CŨ** — thật là 94-97 (`"./*"`); entry `"./tools"` ở dòng 86 |
| `packages/coding-agent/src/extensibility/extensions/types.ts:1322` | **CŨ HƠN NỮA** — dòng 1322 nay là `on(event: "session_compact", …)`, không phải `tool_execution_end` lẫn không phải tool path. Đo lại: `interface ToolDefinition` ở **638** (plan nói 636); `renderCall?` ở **694** (plan nói 686); `renderResult?` ở **697** (plan nói 689); `registerTool<TParams` ở **1372** (plan nói 1347) |
| `wrapper.ts:54-62` / `54-63` / `54-66` | **CŨ CẢ BA** — dải gán render hook thật là **84-99**: `if (registeredTool.definition.renderCall) {` ở 84, `if (registeredTool.definition.renderResult) {` ở 92, đóng ở 99. Dòng 62 là `export class RegisteredToolAdapter`, 69-70 là khai báo field. `wrapRegisteredTools` ở **141** |
| `packages/tui/src/theme/theme.ts:3` | **ĐÚNG** — `import { detectMacOSAppearance, MacAppearanceObserver } from "@oh-my-pi/pi-natives";` (đúng là value import gây chặn, nhưng cơ chế chặn **không còn hiện hữu** vì addon đã build) |
| `packages/tui/tsconfig.json` include `["src","test"]` | **ĐÚNG** |
