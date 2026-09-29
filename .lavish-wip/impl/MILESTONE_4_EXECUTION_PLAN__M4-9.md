# Phiếu triển khai — M4-9. Khả năng nhìn thấy triage (sóng D)

**Kế hoạch:** `MILESTONE_4_EXECUTION_PLAN.md` §`## M4-9. Khả năng nhìn thấy triage (sóng D)`
**HEAD khi kiểm:** `47720fd` — `docs(plans): the native addon is built, so "bun test is blocked" is false` (nhánh `milestone-1`)
**Addon native:** đã build — `packages/natives/native/pi_natives.darwin-arm64.node`, 185 MB, 2026-09-29 07:32
**Phạm vi:** phương án **(a)** — `shippable: false`, chờ uỷ quyền bằng văn bản của Wave D.

> **Sửa so với tài liệu gốc:** M4-9 ghi phụ thuộc "M2 WI-2" là *đã thoả* ở bảng tổng, nhưng bước 2 và cổng hoàn thành ghi rõ là *chưa*. Bảng tổng dễ khiến người đọc nghĩ nó đã hạ cánh. Ở đây coi nó là **tiền đề chưa thoả**: `packages/coding-agent/test/extension-load-order-determinism.test.ts` vẫn không tồn tại (đo lại 2026-09-29). Đây là **điều kiện bắt đầu**, không phải lỗi tài liệu.

---

## 1. Cái gì thay đổi, quan sát được

`omp extensions-triage` in ra, cho **mọi** extension mà loader đã khám phá, một hàng mang `state` và — với bất kỳ hàng nào không active — lý do đã chặn nó, và tập hàng đó khớp từng dòng với những gì dashboard `/extensions` hiện ra cho cùng cwd.

Không phải "thêm một lệnh". Khác biệt quan sát được so với hôm nay: hôm nay một plugin bị chặn âm thầm **không có cách nào** hỏi trên CLI — bạn phải mở TUI. Sau thay đổi, `omp extensions-triage` trả lời được, và nếu nó lệch với dashboard thì đó là bug đã bị bắt, không phải câu hỏi mới.

**Phạm vi (a) nghĩa là gì, bằng mã:** `ExtensionTriageRow.shadowedBy` luôn là `undefined`. Không phải vì ta quên, mà vì `grep -rn "getShadowedBy" packages/` trả về **đúng 2 dòng** — cả hai đều là *khai báo* và *đọc*, không chỗ nào *truyền*:

```
packages/coding-agent/src/modes/components/extensions/state-manager.ts:81:		getShadowedBy?: (item: T) => string | undefined;
packages/coding-agent/src/modes/components/extensions/state-manager.ts:103:				shadowedBy: opts?.getShadowedBy?.(item),
```

Sáu call site `addItems` (`:116` skill, `:127` rule, `:138` tool, `:149` extension-module, `:209` prompt, `:220` slash-command) đều **không** truyền option đó. Không có mã nào tạo ra giá trị. Đây là lý do (a) là S thật, và lý do phương án (b) là việc riêng.

---

## 2. Bảng điểm sửa

| đường/dẫn | symbol | TRƯỚC (nguyên văn từ file) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli/extensions-triage-cli.ts` | *(tạo mới)* | *(không tồn tại)* | `ExtensionTriageRow` + `ExtensionTriageArgs` + `toTriageRow(ext): ExtensionTriageRow` thuần + `runExtensionsTriage(args): Promise<void>` |
| `packages/coding-agent/src/commands/extensions-triage.ts` | *(tạo mới)* | *(không tồn tại)* | `export default class ExtensionsTriage extends Command`, `static flags = { json, cwd }` |
| `packages/coding-agent/src/cli/command-help.ts` | `extensionsTriageHelp` | *(chưa có)* | `export const extensionsTriageHelp = { description: "…" } satisfies CommandMetadata;` đặt cạnh `acpHelp` ở `:3-5` |
| `packages/coding-agent/src/cli-commands.ts` | `commands[]` | `{\n\t\t\tname: "config",\n\t\t\tload: () => import("./commands/config").then(m => m.default),\n\t\t\thelp: commandHelp.configHelp,\n\t\t},` (`:98-101`) | thêm một entry cùng hình dạng: `{ name: "extensions-triage", load: () => import("./commands/extensions-triage").then(m => m.default), help: commandHelp.extensionsTriageHelp }` |
| `packages/coding-agent/test/extensions-triage-cli.test.ts` | *(tạo mới)* | *(không tồn tại)* | 5 case hợp đồng, xem §4 |
| `packages/coding-agent/test/cli-argv-routing.test.ts` | `describe(...)` mới | file có 2 describe, không đề cập `extensions-triage` | **thêm** 1 describe + 1 test khẳng định routing (xem §5 — đây là cổng mới, không có trong tài liệu gốc) |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` → `### Added` | `## [Unreleased]\n\n### Security\n\n- Project-scope MCP config…` | một dòng `### Added`, **chỉ sau khi** có uỷ quyền bằng văn bản |
| `packages/coding-agent/src/capability/index.ts` | `seen` / `deduped` | `const seen = new Set<string>();` (`:228`) | **CHỈ (b)** — `new Map<string, T & { _source: SourceMeta }>()` |
| `packages/coding-agent/src/capability/types.ts` | `CapabilityResult.all` | `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>;` (`:165`) | **CHỈ (b)** — thêm `_shadowedBy?: string` |
| `packages/coding-agent/src/modes/components/extensions/state-manager.ts` | `addItems` opts | `getShadowedBy?: (item: T) => string \| undefined;` (`:81`) | **CHỈ (b)** — 6 call site bắt đầu truyền getter thật |

### Điểm phải sửa mà tài liệu gốc **không** nêu

| đường/dẫn | vấn đề | sửa |
| --- | --- | --- |
| `packages/coding-agent/src/commands/extensions-triage.ts` | `ExtensionTriageArgs.flags.cwd` trong hình dạng code là **không với tới được** nếu `Command` không khai báo cờ `cwd`. `--cwd` là *launch-global flag* (`cli/flag-tables.ts:114`) và `LAUNCH_FLAG_COMMANDS = { launch: true, acp: true }` (`cli-commands.ts:298`) — nên `omp --cwd /x extensions-triage` bị **gỡ** flag trước khi tới lệnh (`cli-commands.ts:406-417`, `:447`). | khai báo `cwd: Flags.string({ description: "…" })` trong `static flags` (mẫu: `commands/shell.ts:13`); người dùng gõ `omp extensions-triage --cwd /x` |

---

## 3. Các bước, mỗi bước có neo đã kiểm

### Bước 0 — TIỀN ĐỀ, kiểm trước mọi thứ khác

M4-9 **không khởi động được** cho tới khi M2 WI-2 merge. Cổng là sự tồn tại của:

```
packages/coding-agent/test/extension-load-order-determinism.test.ts
```

Đo 2026-09-29: **không tồn tại**. `git grep -n 'extension-load-order' packages/coding-agent/` → 0 hit. Nếu vẫn vắng, **DỪNG**.

### Bước 1 — Ghi lại quyết định phạm vi, bằng văn bản, trước khi viết code

Chọn (a) — hẹp — hay (b) — đầy đủ. Ghi lựa chọn + một câu lý do vào mô tả PR.

**Khuyến nghị: (a).** Trong cây hiện tại, `shadowedBy` không thể được điền mà không có code mới (`getShadowedBy` chỉ có 2 hit, cả hai đều là khai báo/đọc). (a) trả lời đúng câu hỏi triage và giữ `capability/index.ts` ra khỏi một PR CLI. (b) là thay đổi thật đối với trạng thái khám phá dùng chung — tách thành work item riêng.

> **Neo đã kiểm:** tiêu đề work item trong tài liệu tổng **không còn ở dòng 11524**. `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` giờ dài **26 378 dòng**; dòng 11524 là "A7 BƯỚC 4 — định tuyến sự kiện thông báo" và `:11538-11539` là mã `mouse-wheel.ts`. Bản M4-9 thật nằm ở **`:15148`** (đầu đề) và **`:15170`** (hai nhánh (a)/(b)) — và đó chính là bản sao hợp nhất của chính tài liệu kế hoạch này, không phải dossier gốc. **Tra bằng nội dung, không bằng số dòng.**

### Bước 2 — Đọc ba nơi tiêu thụ trước khi thiết kế hình dạng hàng

| file | dòng | nội dung thật |
| --- | --- | --- |
| `packages/tui/src/overlays/extensions/types.ts` | `:68` | `shadowedBy?: string;` |
| `packages/tui/src/overlays/extensions/types.ts` | `:83` | `export function isShadowedExtension(ext: Extension): boolean {` |
| `packages/tui/src/overlays/extensions/inspector-model.ts` | `:466` | `export function enablementLabel(state: ExtensionState, reason?: string, shadowedBy?: string): string {` |
| `packages/tui/src/overlays/extensions/inspector-panel.ts` | `:654` | `#getStatusBadge(state: ExtensionState, reason?: string, shadowedBy?: string): string {` |

Cả bốn neo **đúng**. Lưu ý `:482`:

```ts
return `Shadowed${shadowedBy ? ` by ${sanitizeDisplayText(shadowedBy)}` : ""}`;
```

Nhánh "Shadowed by X" **đã** được render hôm nay và **không bao giờ** nhận giá trị. Dưới (a) hãy giữ CLI độc lập với nó, và ghi lại bằng một dòng chú thích rằng khoảng trống này là có chủ đích.

Hai union cần import làm type trong test:

```ts
// packages/tui/src/overlays/extensions/types.ts:31
export type ExtensionState = "active" | "disabled" | "shadowed";
// packages/tui/src/overlays/extensions/types.ts:36
export type DisabledReason = "provider-disabled" | "user-opt-in" | "item-disabled" | "shadowed";
```

### Bước 3 — Tạo `src/cli/extensions-triage-cli.ts`

Phép chiếu thuần. Nhân bản **chính xác** ba dòng này:

```ts
// packages/coding-agent/src/modes/acp/acp-agent.ts:1191-1193
const sm = await Settings.init();
const disabledIds = cfgDisabledExtensions.get(sm);
const extensions = await loadAllExtensions(cwd, disabledIds);
```

Khối chứa chúng là `case "_omp/extensions": {` tại **`:1189-1195`**; `:1196` là route kế tiếp (`case "_omp/extensions/toggle": {`) — khối trong tài liệu gốc ghi 1189-1196, lệch một ở cuối.

**Vì sao `disabledIds` là toàn bộ tròng game — cơ chế chính xác, không phải heuristic:**

```ts
// state-manager.ts:69-72
export async function loadAllExtensions(cwd?: string, disabledIds?: string[]): Promise<Extension[]> {
	const extensions: Extension[] = [];
	const effectiveDisabledIds = disabledIds ?? [];
	const disabledExtensions = new Set<string>(effectiveDisabledIds);
```

```ts
// state-manager.ts:109-111
const loadOpts = cwd
	? { cwd, includeDisabled: true, disabledExtensions: effectiveDisabledIds }
	: { includeDisabled: true, disabledExtensions: effectiveDisabledIds };
```

`effectiveDisabledIds` **luôn là một mảng, không bao giờ `undefined`**. Nên fallback ở loader:

```ts
// packages/coding-agent/src/capability/index.ts:150-152
const disabledExtensionIds = new Set<string>(
	options.disabledExtensions ?? (settings ? cfgDisabledExtensions.get(settings) : undefined) ?? [],
);
```

**không bao giờ được chạm tới** khi đi qua `loadAllExtensions`. Truyền `undefined` không chỉ làm rỗng Set mà `resolveState` tham vấn — nó còn làm rỗng Set mà **loader** dùng để lọc ở tầng discovery. Hai tầng cùng sai, cùng một lần.

**Hiển thị.** `--json` phát `{ "extensions": [...] }`. Dạng đọc được: mỗi hàng một dòng, SPACE làm dấu phân cột. Chạy qua helper trung tâm:

```ts
// packages/coding-agent/src/extensibility/extensions/load-errors.ts:1  (đường dẫn đúng; tài liệu gốc ghi "load-errors.ts:1" nhưng ngữ cảnh gợi ý src/cli/)
import { replaceTabs, shortenPath, TRUNCATE_LENGTHS, truncateToWidth } from "@oh-my-pi/pi-tui/render/render-utils";
```

(`lsp/tool.ts:16` là mẫu thứ hai cho đúng import đó.) Không tự chế hằng số cắt chuỗi — `TRUNCATE_LENGTHS.LINE` là 110 (`render-utils.ts:185-198`).

Dùng `console.log`: đây là CLI thoát ra không vào TUI, đúng ngoại lệ của AGENTS.md. Nếu sau này được render trong TUI thì chuyển sang `logger` tại điểm đó.

### Bước 4 — Tạo `src/commands/extensions-triage.ts`

Mẫu tham chiếu: `packages/coding-agent/src/commands/config.ts`. Ba phần bắt buộc:

1. `export default class … extends Command` — vì `cli-commands.ts:99` làm `.then(m => m.default)`
2. import module triển khai bằng import **top-level** (không bao giờ `await import`)
3. `static flags = { json: Flags.boolean(…), cwd: Flags.string(…) }` — xem §2, mục "Điểm phải sửa"

### Bước 5 — Thêm `extensionsTriageHelp` vào `command-help.ts`

Đặt cạnh `acpHelp` ở `:3-5`:

```ts
export const acpHelp = {
	description: "Run omp as an ACP (Agent Client Protocol) server over stdio",
} satisfies CommandMetadata;
```

Interface đích ở `packages/utils/src/cli.ts:136-142`.

### Bước 6 — Đăng ký trong `cli-commands.ts`

Một entry, đúng hình dạng `config` tại `:98-101`. **Đây là toàn bộ phần nối** giữa lệnh và người dùng — xem §5 về lý do nó cần một test riêng.

### Bước 7 — Viết test hợp đồng

Xem §4.

### Bước 8 — Chạy cổng

Xem §5.

### Bước 9 — Chạy thử binary thật, rồi mới xin uỷ quyền changelog

```bash
omp extensions-triage
omp extensions-triage --json
```

Đối chiếu tập hàng với dashboard `/extensions` cho cùng cwd. Lệch = phép nhân bản `disabledIds` ở bước 3 sai. Chỉ sau khi qua mới xin uỷ quyền `shippable: false` của Wave D bằng văn bản, rồi mới viết dòng CHANGELOG.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/extensions-triage-cli.test.ts` (mới)
**Đọc lấy fixture, không nhân bản:** `packages/coding-agent/test/discovery/disabled-extensions.test.ts` (165 dòng) và `packages/coding-agent/test/extension-dashboard-mcp-parity.test.ts` (310 dòng).

### Fixture đã có sẵn, dùng lại thay vì dựng cây thứ hai

`disabled-extensions.test.ts:129-143` đã dựng sẵn đúng cái tình huống "một bản bị che":

```ts
// :129  test("deduplicates against an empty snapshot when the caller omits disabled IDs", async () => {
// :132  	await fs.writeFile(path.join(tempDir, ".omp", "AGENTS.md"), "# lower-priority project instructions\n");
// :133  	await fs.mkdir(path.join(tempDir, ".gemini"), { recursive: true });
// :134  	await fs.writeFile(path.join(tempDir, ".gemini", "GEMINI.md"), "# higher-priority project instructions\n");
// :136  	initializeWithSettings(Settings.isolated({ disabledExtensions: ["context-file:project:GEMINI.md"] }));
// :138  	const dashboard = await loadAllExtensions(tempDir);
// :141  	expect(agents?.state).toBe("shadowed");
// :142  	expect(gemini?.state).toBe("active");
```

Đây là một `context-file` cùng khoá ở hai cấp ưu tiên — đúng cái mà tài liệu gốc mô tả là "một skill cùng tên ở hai cấp", nhưng đã có sẵn, đã chạy, và **không cần** bạn đoán key của skill. `loadAllExtensions(tempDir)` với `tempDir` này trả về đúng một hàng `shadowed` và một hàng `active`.

Mẫu khởi tạo (từ `extension-dashboard-mcp-parity.test.ts:60-61`):

```ts
const settings = await Settings.init({ inMemory: true, cwd: projectDir });
initializeWithSettings(settings);
```

Rồi `setAgentDir(userAgentDir)` để không đụng profile thật (`:36`), và `afterEach` gọi `resetSettingsForTest()` + `__resetDirsFromEnvForTests()` + `removeWithRetries(...)` (`:64-69`).

**Không `mock.module()`.** Dùng `vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach`.

### Các case

| # | Khẳng định | Hợp đồng bảo vệ | Hồi quy → người dùng thấy |
| --- | --- | --- | --- |
| 1 | `toTriageRow` là **tổng** của `loadAllExtensions`: `rows.length === extensions.length`, và `rows.map(r => r.id)` có **một id duy nhất** cho mỗi id khám phá | mỗi extension xuất hiện đúng một lần, khoá theo id | một hàng bị nhân đôi khiến người dùng tưởng có hai plugin |
| 2 | Mọi `row.state` thuộc `ExtensionState` thật (`"active" \| "disabled" \| "shadowed"`) và mọi `row.disabledReason` khác rỗng thuộc `DisabledReason` thật | state/reason không phải chuỗi tự do | một reason mới bịa ra mà dashboard không hiểu |
| 3 | Đúng một hàng `state === "shadowed"` | phép chiếu không làm mất hàng bị che | câu hỏi "plugin của tôi có nạp không" không có câu trả lời |
| 4 | Hàng `shadowed` đó có `shadowedBy === undefined` | khoảng trống đã ghi nhận — dưới (a) đây là hợp đồng có chủ đích | dưới (b) test này **phải lật** thành `shadowedBy` khác rỗng |
| 5 | Hàng bị chính sách disable mang `disabledReason` khác rỗng **và khác `"shadowed"`** (`"item-disabled"` theo `state-manager.ts:54`) | phép nhân bản `disabledIds` thật sự chạy | **đây là case quan trọng nhất** — xem §5 |

**Cấm:** snapshot CSV/text, khẳng định chuỗi help, khẳng định có bao nhiêu dòng, `expect(output).toContain("Shadowed by")`. Định dạng văn bản không phải hợp đồng được bảo vệ.

**Nếu chọn (b):** phần khẳng định phần tử thắng được ghi **phải** nằm trong `packages/coding-agent/test/capability/` (hiện có `fs-special-files.test.ts`, `rule-agents.test.ts`, `rule-buckets.test.ts`) — đúng tầng sở hữu `seen`/`deduped`, không đi qua CLI.

---

## 5. Cổng

```bash
# 0. tiền đề (đã xong 2026-09-29 — không cần chạy lại nếu .node đã có)
ls packages/natives/native/pi_natives.darwin-arm64.node
# nếu vắng: brew install ninja && bun --cwd=packages/natives run build

# 1. type + lint + format
bun run check:ts

# 2. test của work item này
bun test packages/coding-agent/test/extensions-triage-cli.test.ts

# 3. đăng ký lệnh (XEM §5.1 — không có trong tài liệu gốc)
bun test packages/coding-agent/test/cli-argv-routing.test.ts

# 4. hồi quy do (b) chạm shared discovery
bun test packages/coding-agent/test/extensions-discovery.test.ts \
           packages/coding-agent/test/extensions-runner.test.ts \
           packages/coding-agent/test/discovery/disabled-extensions.test.ts \
           packages/tui/test/extension-inspector.test.ts
```

### Trả lời thẳng: cổng này có đỏ được không

| cổng | đỏ được? | bằng cách nào |
| --- | --- | --- |
| (1) `bun run check:ts` | **CÓ** | `check:ts` = `check:tools && … check:types` (`package.json:90`), mà `check:tools` = `oxlint . && oxfmt --check …` (`:91`). Sửa sai kiểu → đỏ. Sai format → đỏ. |
| (2) `bun test …/extensions-triage-cli.test.ts` | **CÓ** | File vắng → bun báo lỗi. File có mà assertion sai → đỏ. |
| (2b) case 5 (`disabledReason` khác `"shadowed"`) | **CÓ, và đây là cổng thật sự quan trọng nhất** | Xoá đúng hai dòng `Settings.init()` + `cfgDisabledExtensions.get(sm)`: JSON **vẫn trông rất hợp lý** (mọi hàng đều có `id`, `state`, `path` hợp lệ), nhưng mọi disable cấp item lật sang `active` → case 5 đỏ. Không thể bỏ sót âm thầm. |
| (3) đăng ký lệnh | **CÓ — tài liệu gốc nói sai** | xem §5.1 |
| (4) uỷ quyền `shippable: false` bằng văn bản | **KHÔNG** | Không có lệnh nào làm nó đỏ. Đây là một **grant của con người**. Chỉ có thể là một ô tick trong PR body, ký tay. |
| (5) dòng CHANGELOG tồn tại | **KHÔNG** | Cùng lý do — và bị (4) chặn trước. |

> **Sửa cổng (4)+(5):** đừng giữ chúng như hai dòng checklist cùng cấp với (1)-(3). Gộp thành **một** điều kiện văn bản duy nhất ghi trong PR body, và **không** ghi vào checklist tự động. Một cổng luôn xanh còn tệ hơn không có cổng — nó tạo cảm giác an toàn giả, đúng như bản thân tài liệu ghi ở M4-7.

### 5.1. Điểm mù mà tài liệu gốc nói là không có cổng nào bắt được — **SAI**

Tài liệu gốc viết: *"liệu lớp `Command` mới đã thực sự được đăng ký trong `cli-commands.ts` hay chưa … không test nào liệt kê ở đây sẽ nhận ra"*, và `GAP-M4-15` cảnh báo rằng thêm lệnh thứ hai cùng sóng biến thành hai điểm mù.

Điều đó **đúng về mặt `bun test`**, nhưng **sai về mặt hợp đồng** — và đây là phát hiện lớn nhất của phiếu này. Coi đường đi của argv:

```ts
// packages/coding-agent/src/cli-commands.ts:450
return { argv: ["launch", ...argv] };   // ← fallback khi KHÔNG đăng ký
// :427-434
export function resolveCliArgv(argv: string[]): ResolvedCliArgv {
	const first = argv[0];
	…
	if (isSubcommand(first)) return { argv };   // ← đường đi khi CÓ đăng ký
```

`isSubcommand` (`:301-304`) tra `SUBCOMMAND_NAMES`, được dựng từ chính mảng `commands` (`:289-295`). Nghĩa là **đăng ký hay không là một hợp đồng quan sát được từ bên ngoài, assert được, không cần spawn process** — và đã có sẵn file test chuyên dụng cho nó:

`packages/coding-agent/test/cli-argv-routing.test.ts` (tồn tại, 2 describe) — ví dụ ở `:16-19`:

```ts
expect(resolveCliArgv(["--approval-mode=yolo", "acp"])).toEqual({ argv: ["acp", "--approval-mode=yolo"] });
```

và fallback được chứng minh ở `:34-37`:

```ts
expect(resolveCliArgv(["--model", "acp"])).toEqual({ argv: ["launch", "--model", "acp"] });
```

**Thêm vào file đó, không cần file mới:**

```ts
describe("resolveCliArgv keeps extensions-triage off the launch prompt path (#1496)", () => {
	test("`extensions-triage` dispatches the subcommand instead of becoming a model prompt", () => {
		expect(resolveCliArgv(["extensions-triage"])).toEqual({ argv: ["extensions-triage"] });
	});

	test("`extensions-triage --json` keeps the subcommand in front", () => {
		expect(resolveCliArgv(["extensions-triage", "--json"])).toEqual({
			argv: ["extensions-triage", "--json"],
		});
	});
});
```

Bỏ entry khỏi `commands[]` → hai case này **đỏ ngay**, với `actual: { argv: ["launch", "extensions-triage"] }`. Đó chính là hồi quy #1496, bắt được bằng máy.

**Tên `extensions-triage` không đụng `RESERVED_TOP_LEVEL_WORDS`.** Bảng reserved đã có `extensions` tại `cli-commands.ts:315`, nhưng tra cứu ở `:355` là so khớp **chính xác** `argv[0]`, không phải tiền tố — nên `extensions-triage` không bị chặn nhầm. Đã kiểm, không phải rủi ro.

**Và `--cwd` bị gỡ trước lệnh** — đã kiểm ở `cli-argv-routing.test.ts:53-55` (`resolveCliArgv(["--cwd", "/tmp", "update"])` → `{ argv: ["update"] }`). Vì `extensions-triage` không nằm trong `LAUNCH_FLAG_COMMANDS` (`:298`), `omp --cwd /x extensions-triage` sẽ **mất** `--cwd /x`. Đó là lý do cờ `cwd` phải tự khai trong `static flags` (§2).

### 5.2. Lệnh của tài liệu gốc: **bỏ đi, đừng chạy**

Tài liệu gốc dùng `bun test packages/coding-agent/test/ -t 'acp'`. Chạy thật 2026-09-29:

```
bun test v1.3.14 (0d9b296a)
 4 pass
317 skip
 0 fail
Ran 321 tests across 1513 files. [2.68s]
```

**Xanh. Exit 0. Hôm nay.** Chạy **0 dòng** mã mới — filter khớp `describe("ACP agent")` ở `acp-agent.test.ts:556` và hai describe anh em.

Tài liệu gốc tự ghi *"vì file test chưa tồn tại, lệnh này đang ĐỎ (exit 1, 'filters did not match any test files')"*. **Đo lại: sai.** Nó không đỏ-vì-file-vắng; nó **đã là xanh giả từ hôm nay**. Điều này làm phát hiện **mạnh hơn**, không yếu hơn: lệnh này sẽ xanh với một cài đặt hoàn toàn hỏng, kể cả sau khi bạn thêm cả ba file.

`bun test -t <pattern>` lọc theo **TÊN test**, không theo tên tệp. Test mới sẽ không mang tên "acp".

---

## 6. Cạm bẫy riêng của work item này

**1. Truyền `undefined` cho `disabledIds` — im lặng, hai tầng cùng sai.**
Đã phân tích cơ chế ở §3: `loadAllExtensions` luôn đặt `disabledExtensions: effectiveDisabledIds` (mảng, không bao giờ `undefined`) vào `loadOpts` (`state-manager.ts:109-111`), nên fallback `options.disabledExtensions ?? cfgDisabledExtensions.get(settings) ?? []` ở `capability/index.ts:150-152` **không bao giờ chạy**. Bỏ phép nhân bản `acp-agent.ts:1191-1193` → cả bộ lọc loader lẫn `resolveState` cùng rỗng → mọi hàng bị disable cấp item báo `active`. Đầu ra vẫn parse được, JSON vẫn đẹp. Đây là lỗi số một.

**2. Tên `shadowedBy` đã mang hai nghĩa khác trong codebase, cả hai đều không phải capability-shadowing.**

| hệ thống | vị trí | nghĩa |
| --- | --- | --- |
| marketplace plugin | `src/extensibility/plugins/marketplace/types.ts:196` (`shadowedBy?: "project"`, doc ở `:188`; gán ở `manager.ts:680`; render ở `builtin-marketplace.ts:197`) | "plugin user bị project ghi đè" |
| cfg protocol | `src/internal-urls/cfg-protocol.ts:83` (`shadowedBy?: string`; gán ở `:427`; render ở `interactive-mode.ts:5984-5985`) | "config của bạn bị project ghi đè" |
| **extension scope** | `src/modes/components/extensions/types.ts:68` | ← **cái work item này nói tới** |

Nhập lẫn ba cái là lỗi dễ nhất trong file này, và nó tạo ra một bản kiểm kê báo shadowing ở tầng plugin trông như shadowing ở tầng capability.

**3. Registry entry là điểm mù duy nhất — và nó CÓ cổng, chỉ là không ai viết.**
Xem §5.1. Đây là bẫy mà chính tài liệu gốc tự gọi ra rồi kết luận nhầm là không giải được.

**4. `flags.cwd` không tới được nếu không tự khai.**
Xem §2 và §5.1. Không khai thì `args.flags.cwd` luôn `undefined`, và cổng parity (3) chỉ có thể chạy với `process.cwd()` — tức là **không so được với dashboard cho một cwd khác**, tức là cổng tự nó vô hiệu.

**5. `commands/config.ts` gọi `await initTheme()` trước khi chạy lệnh.**
Không bắt buộc nếu renderer dùng chuỗi thuần như hình dạng code trong tài liệu gốc. Nhưng nếu bạn dùng `theme.fg(...)` cho cột state, phải khởi tạo theme trước, nế không sẽ ném lỗi lúc chạy chứ không phải lúc type-check.

**6. Đừng khẳng định `shadowedBy === undefined` như sự thật vĩnh viễn.**
Dưới (a) nó là hợp đồng **có chủ đích**; dưới (b) nó lật thành hồi quy. Không có test nào sống được cả hai. Ghi rõ trong PR phương án nào đã chọn.

**7. Bẫy kiểu test của AGENTS.md.**
Đừng snapshot output văn bản. Không có consumer nào parse dòng in ra. `toTriageRow` là hàm thuần được export **đúng lý do này** — assert trên nó, không assert trên stdout.

---

## Phụ lục — nhật ký kiểm neo

Đo 2026-09-29 tại HEAD `47720fd`. `file:line` = đúng; `HỎNG` = con trỏ chết hoặc sai.

| neo | kết quả | nội dung thật đã đọc |
| --- | --- | --- |
| `state-manager.ts:69` | ĐÚNG | `export async function loadAllExtensions(cwd?: string, disabledIds?: string[]): Promise<Extension[]> {` |
| `state-manager.ts:81` | ĐÚNG | `getShadowedBy?: (item: T) => string \| undefined;` |
| `state-manager.ts:86-89` | ĐÚNG | `resolveState(item._source, disabledExtensions.has(id), (item as {_shadowed?})._shadowed)` |
| `state-manager.ts:103` | ĐÚNG | `shadowedBy: opts?.getShadowedBy?.(item),` |
| `state-manager.ts:116,127,138,149,209,220` | ĐÚNG | 6 call site `addItems`; không cái nào truyền `getShadowedBy` |
| `state-manager.ts:180,236,267` | ĐÚNG | `resolveState` thủ công cho mcp / hook / context-file |
| `state-manager.ts:150-152` | **BỔ SUNG** | `options.disabledExtensions ?? (settings ? cfgDisabledExtensions.get(settings) : undefined) ?? []` — cơ chế của cạm bẫy #1; tài liệu gốc không trích dòng này |
| `capability/index.ts:228` | ĐÚNG | `const seen = new Set<string>();` |
| `capability/index.ts:242` | ĐÚNG | `const keySeen = key !== undefined && seen.has(key);` |
| `capability/index.ts:246` | ĐÚNG | `deduped.some(existing => !disabledItems.has(existing) && equivalent(existing, item));` |
| `capability/index.ts:247` | ĐÚNG | `if (keySeen \|\| aliasSeen) item._shadowed = true;` |
| `capability/index.ts:255` | ĐÚNG | `if (key !== undefined) seen.add(key);` |
| `capability/index.ts:264` | ĐÚNG | `const keySeen = seen.has(key);` |
| `capability/index.ts:265` | ĐÚNG | `seen.add(key);` |
| `capability/index.ts:269` | ĐÚNG | `deduped.some(…)` (lần hai) |
| `capability/index.ts:271` | ĐÚNG | `item._shadowed = true;` |
| `capability/index.ts:273` | ĐÚNG | `deduped.push(item);` — nhánh phần tử thắng sống sót |
| `capability/index.ts:144,145,146,211,218` | ĐÚNG | `T & { _source: SourceMeta; _shadowed?: boolean }` — 5 kiểu giao nội tuyến |
| `capability/types.ts:165` | ĐÚNG | `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>;` |
| `acp-agent.ts:1189-1195` | ĐÚNG (sửa 1) | `case "_omp/extensions": {` … `}` — `:1196` là route kế tiếp |
| `acp-agent.ts:1191-1193` | ĐÚNG | `Settings.init()` / `cfgDisabledExtensions.get(sm)` / `loadAllExtensions(cwd, disabledIds)` |
| `cli-commands.ts:98-101` | ĐÚNG | entry `config` |
| `cli-commands.ts:99` | ĐÚNG | `load: () => import("./commands/config").then(m => m.default),` |
| `cli-commands.ts:1-10` | ĐÚNG | header dẫn #1496 |
| `cli-commands.ts:450` | **BỔ SUNG** | `return { argv: ["launch", ...argv] };` — cơ chế rò argv, là cổng §5.1 |
| `cli-commands.ts:298` | **BỔ SUNG** | `LAUNCH_FLAG_COMMANDS = { launch: true, acp: true }` |
| `cli-commands.ts:315,355` | **BỔ SUNG** | `RESERVED_TOP_LEVEL_WORDS.extensions` — so khớp chính xác, không phải tiền tố |
| `cli/flag-tables.ts:114` | **BỔ SUNG** | `"--cwd": (result, value) => { result.cwd = value; … }` |
| `command-help.ts:3-5` | ĐÚNG | `acpHelp` |
| `packages/utils/src/cli.ts:136-142` | ĐÚNG | `interface CommandMetadata` |
| `tui/.../types.ts:31,36` | **BỔ SUNG** | `ExtensionState` / `DisabledReason` unions — cần cho type trong test |
| `tui/.../types.ts:68` | ĐÚNG | `shadowedBy?: string;` |
| `tui/.../types.ts:83` | ĐÚNG | `export function isShadowedExtension(…): boolean {` |
| `tui/.../types.ts:183` | **BỔ SUNG** | `export function makeExtensionId(kind, name)` |
| `inspector-model.ts:466-482` | ĐÚNG | `enablementLabel`; `:482` là `Shadowed${shadowedBy ? …}` |
| `inspector-panel.ts:654-661` | ĐÚNG | `#getStatusBadge` |
| `plugin-cli.ts:644` | ĐÚNG | `plugin.shadowedBy ? chalk.dim(" [shadowed]") : ""` — nghĩa marketplace, không phải extension |
| `plugin-cli.ts:646` | ĐÚNG | `console.log(\`  ${plugin.id} (${version})${scopeLabel}${shadowLabel}\`);` — mẫu nhịp in |
| `marketplace/types.ts:188,196` | ĐÚNG | doc + `shadowedBy?: "project";` |
| `cfg-protocol.ts:83` | ĐÚNG | `shadowedBy?: string;` |
| `interactive-mode.ts:5970-5971` | **HỎNG** | dòng thật là **`:5984-5985`** (`request.shadowedBy ? \`\n⚠️ Overridden by your …\``). `:5970-5971` là `#promptAutoQaConsent` — không liên quan. |
| `commands/config.ts` | ĐÚNG | mẫu `Command` wrapper đầy đủ |
| `commands/shell.ts:13` | **BỔ SUNG** | mẫu khai cờ `cwd: Flags.string({…})` |
| `command-help.ts` (~49 entry) | ĐÚNG | có 50 `help:` trong `cli-commands.ts` |
| `src/cli/*-cli.ts` = 33, `src/cli/` = 62 | ĐÚNG | đo lại: 33 và 62 |
| `src/commands/*.ts` = 52, đăng ký 50 | ĐÚNG | 52 module, `grep -cE '^\t\tname: "'` → 50 |
| `load-errors.ts:1` | ĐÚNG, **sai ngữ cảnh đường dẫn** | file thật ở `src/extensibility/extensions/load-errors.ts`, không phải `src/cli/`. Dòng 1 đúng nguyên văn. |
| `lsp/tool.ts:16` | ĐÚNG | `import { replaceTabs, shortenPath } from "@oh-my-pi/pi-tui/render/render-utils";` |
| `package.json:94` (`check:ts`) | **HỎNG** | `check:ts` ở **`:90`**. `:94` là `lint:ts`. |
| `package.json:89` (`test`) | **HỎNG** | `test` ở **`:85`**. `:89` là `check`. |
| `package.json` (bằng chứng #5: ":89 test, :93 check, :94 check:ts") | **HỎNG, cả ba** | thật: `:85` test, `:89` check, `:90` check:ts, `:92` check:rs. **Tên lệnh thì đúng, chỉ số dòng sai.** |
| `acp-agent.test.ts:556` | ĐÚNG | `describe("ACP agent", () => {` — tên, không phải tên tệp |
| `extension-dashboard-mcp-parity.test.ts:24-77` | ĐÚNG | describe `:24`; `:60-61` mẫu `Settings.init` + `initializeWithSettings`; `:72` `loadAllExtensions(projectDir, [])` |
| `cli-argv-routing.test.ts` | **BỔ SUNG** | tồn tại, 2 describe — nơi đặt cổng §5.1 |
| `extensions-discovery.test.ts` | ĐÚNG (kích thước sai nhỏ) | tồn tại, **28 KB** (tài liệu ghi 32 KB) |
| `discovery/disabled-extensions.test.ts` | ĐÚNG | tồn tại, 165 dòng; `:129-143` là fixture shadowed dựng sẵn |
| `packages/coding-agent/test/capability/*.test.ts` | ĐÚNG | có 3 file: `fs-special-files`, `rule-agents`, `rule-buckets` |
| `tui/test/extension-inspector.test.ts` | ĐÚNG | 935 dòng |
| `extensions-runner.test.ts` | ĐÚNG | 4193 dòng |
| `test/extension-load-order-determinism.test.ts` | **VẮNG (đúng thiết kế)** | cổng tiền đề — chưa thoả |
| `CHANGELOG.md` `## [Unreleased]` | ĐÚNG | hiện có `### Security`; thêm `### Added` **sau** uỷ quyền |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:11524-11545` | **HỎNG** | file nay **26 378 dòng**. `:11524` là "A7 BƯỚC 4 — định tuyến sự kiện thông báo". Mục M4-9 thật ở **`:15148`** (đầu đề) / **`:15170`** (nhánh a/b). |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:11538-11539` | **HỎNG** | `:11538-11539` là mã `mouse-wheel.ts`; nhánh (a)/(b) ở **`:15170`**. |
| `bun test … -t 'acp'` trạng thái | **SAI so với tài liệu** | tài liệu ghi "ĐỎ, exit 1". **Đo thật: 4 pass / 317 skip / 0 fail, exit 0** — đã là xanh giả ngay hôm nay. |
| `src/cli/extensions-triage-cli.ts` | VẮNG (đúng) | chưa tồn tại |
| `src/commands/extensions-triage.ts` | VẮNG (đúng) | chưa tồn tại |
| `src/cli/command-help.ts` → `extensionsTriageHelp` | VẮNG (đúng) | chưa có |
| `src/cli-commands.ts` → entry `extensions-triage` | VẮNG (đúng) | chưa có |
