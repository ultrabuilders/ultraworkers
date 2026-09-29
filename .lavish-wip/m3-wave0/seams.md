# M3 wave 0 — seam audit (phần CÒN LẠI)

Môi trường: `/Users/tranquangdang21/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `4a3fd1f`.
Mọi khẳng định dưới đây kèm lệnh đã chạy. `measured` = true/false ở phần cuối mỗi mục.

---

## 1. Kiểm chứng phần thiếu — `registerStatusLineSegment`

**Kết luận: KHÔNG tồn tại. 0 hit trong toàn bộ mã nguồn.**

```bash
$ git grep -n "registerStatusLineSegment" | wc -l          # 2 file
$ git grep -c "registerStatusLineSegment" -- packages/ | wc -l   # 0
$ git grep -n "registerStatusLineSegment" -- '*.ts' '*.tsx' '*.js' | wc -l  # 0
```

Hai file hit **đều là tài liệu kế hoạch**, không phải code:

- `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (8755, 8885, 9314, 9837, 9865, 9873, 10527, 10552, 11039, 11279, 11287, 11313, 18163)
- `MILESTONE_3_EXECUTION_PLAN.md` (52, 182, 611, 1134, 1162, 1170, 1824, 1849, 2336, 2576, 2584, 2610)

### 1.1. Các tên gần giống CÓ THẬT (và cái thật sự tồn tại)

`registerStatusLineSegment` không tồn tại, **nhưng cái nó định đăng ký thì có** — chỉ là đăng ký bằng **union biên dịch đóng**, không phải registry runtime.

| Tên có thật | Nơi | Lệnh |
| --- | --- | --- |
| `STATUS_LINE_SEGMENT_IDS` | `packages/tui/src/status-line/schema.ts:2-30` — mảng `as const` 27 phần tử | `cat -n packages/tui/src/status-line/schema.ts` |
| `StatusLineSegmentId` | `schema.ts:33` — union kiểu `(typeof STATUS_LINE_SEGMENT_IDS)[number]` | idem |
| `SEGMENTS` | `packages/tui/src/status-line/segments.ts:919-947` — `Record<StatusLineSegmentId, StatusLineSegment>`, **27 entry** | `sed -n '915,960p' …/segments.ts` |
| `renderSegment` | `segments.ts:949-955` | idem |
| `ALL_SEGMENT_IDS` | `segments.ts:957` — `Object.keys(SEGMENTS)` | idem |
| `cfgStatusLineSegmentOptions` | `packages/coding-agent/src/modes/settings.ts:290` — `register({…})` của hệ settings | `git grep -n cfgStatusLineSegmentOptions -- packages/` |
| `setStatus` | 74 site `setStatus` trong `packages/tui/src` + `packages/coding-agent/src` | `git grep -n setStatus -- packages/tui/src packages/coding-agent/src \| wc -l` |

**Tên KHÔNG tồn tại (đã kiểm, đều 0 hit trong `packages/`):**

| Tên | Kết quả | Lệnh |
| --- | --- | --- |
| `registerStatusLineSegment` | 0 | `git grep -c … -- packages/ \| wc -l` |
| `ShowStatusOptions` | 0 | `git grep -n ShowStatusOptions -- packages/ \| wc -l` |
| `StatusSegmentRegistry` / `statusSegmentRegistry` | 0 | `git grep -n "statusSegmentRegistry" -- packages/` |
| `registerSegment` | 0 | `git grep -n "registerSegment" -- packages/` |
| `packages/tui/test/status-line-extension-mode.test.ts` | không tồn tại | plan tự ghi nhận; artifact tương lai bị chặn bởi M2-OQ3 |

**Đính chính so với giả định của nhiệm vụ:** `ShowStatusOptions` được coi là "tên gần giống cần liệt kê" — nó **không tồn tại**, nên danh sách "tên gần giống có thật" ở trên là bảy dòng đầu, không phải tám.

**`measured: true`**

---

## 2. Seam status-line omp ĐÃ CÓ

### 2.1. Thư mục và kích thước

```bash
$ ls -la packages/tui/src/status-line/
$ wc -l packages/tui/src/status-line/*.ts | sort -rn
```

| File | Dòng |
| --- | --- |
| `component.ts` | 3.072 |
| `segments.ts` | 957 |
| `context-usage.ts` | 700 |
| `footer.ts` | 323 |
| `types.ts` | 236 |
| `presets.ts` | 107 |
| `host.ts` | 99 |
| `metrics.ts` | 94 |
| `schema.ts` | 57 |
| `separators.ts` | 55 |
| `git-utils.ts` | 42 |
| `loop.ts` | 28 |
| `index.ts` | 6 |
| **tổng** | **5.776** |

`index.ts` là barrel 6 dòng, `export *` 6 module, **không có `register*` nào**:
`export * from "./component" | "./metrics" | "./presets" | "./segments" | "./separators" | "./types"`.

### 2.2. Ai đọc (importers) — 49 file, 14 trong `src/`, 35 trong `test/`

```bash
$ git grep -c "pi-tui/status-line" -- packages/ | sort -t: -k2 -rn
```

**Người ghi (producers) — 14 file `src/`:**

| File | Import gì |
| --- | --- |
| `coding-agent/src/modes/interactive-mode.ts` | barrel + `/loop` |
| `coding-agent/src/modes/types.ts` | barrel + `/loop` |
| `coding-agent/src/modes/components/index.ts` | barrel + `/footer` |
| `coding-agent/src/modes/status-line-host.ts` | `/host` |
| `coding-agent/src/modes/settings.ts` | `/schema` |
| `coding-agent/src/modes/loop-condition.ts` | `/loop` |
| `coding-agent/src/modes/loop-limit.ts` | `/loop` |
| `coding-agent/src/modes/controllers/command-controller.ts` | `/context-usage` |
| `coding-agent/src/advisor/watchdog.ts` | `/host` |
| `coding-agent/src/collab/protocol.ts` | `/types` |
| `coding-agent/src/extensibility/extensions/types.ts` | `/types` |
| `coding-agent/src/system-prompt.ts` | `/host` |
| `coding-agent/src/utils/active-repo-context.ts` | `/host` |
| `coding-agent/src/session/{agent-session,context-usage-runtime,session-advisors,session-maintenance,session-stats,session-tools}.ts` | `/context-usage` (6 file) |
| `coding-agent/src/cli/gallery-fixtures/{composer,status-line,segments}.ts` | barrel + `/schema` + `/segments` + `/types` |
| `coding-agent/scripts/measure-prompt-tokens.ts` | `/context-usage` |

**Người đọc (consumers) trong test — 35 file**, đáng chú ý: `status-line-overflow` (4 import), `usage`/`time-spent` (3), `vcs-refresh`/`token-rate`/`settings-cache`/`pr-lookup-timeout`/`dispose-async-leak`/`colocated-jj` (2), còn lại 1.

### 2.3. Seam "hot" đã đóng băng — `host.ts` (99 dòng)

`host.ts` là **hợp đồng capability** mà renderer chỉ tiêu thụ, không sở hữu:

- `StatusLineSession` (`:22-64`) — 30+ getter bắt buộc: `sessionManager.getUsageStatistics()` (10 trường), `getContextUsage()`, `getAsyncJobSnapshot()`, `getGoalModeState()`, `getAdvisorStatusOverview?()`…
- `StatusLineHost` (`:79-95`) — 15 method: `getSettings()`, `gitEnabled()`, `computeCompactionBoundaries()`, `fetchUsageReports()`…
- `FooterHost` (`:97-99`) — 1 method.

Các dấu `?` (`:57 getAnthropicSlowModeLabel?`, `:58 getPrewalkState?`, `:61 getAdvisorStatusOverview?`) là **optional capability probe** — đây chính là cơ chế thật để thêm segment mà **không** phải mở union.

### 2.4. Đường `setStatus` — đã nối trọn vẹn, tôi tự kiểm chứng

```bash
$ git grep -n "setStatus" -- packages/coding-agent/src/modes/types.ts \
    packages/coding-agent/src/modes/controllers/extension-ui-controller.ts
$ sed -n '955,975p' packages/tui/src/status-line/component.ts
```

- `extension-ui-controller.ts:128` — `setStatus: (key, text) => this.setHookStatus(key, text),`
- `component.ts:959` — `setHookStatus(key: string, text: string | undefined): void {`
- `component.ts:963` — `if (this.#hookStatuses.get(key) === text) return;`  ← **short-circuit**
- `component.ts:966-969` — sắp xếp lại Map + `this.#invalidateStatusLineRenderCache();`

**Đính chính neo:** s5.md:30 và tài liệu kế hoạch ghi `controller.ts:128` / `controller.ts:591-594`. File thật là **`extension-ui-controller.ts:128`**; `component.ts:958-971` thì đúng.

Vì key là khoá Map và `:963` short-circuit, **"đúng một lần" đã là hợp đồng có sẵn** — C2 không cần viết nó.

### 2.5. Ràng buộc vị trí test (cứng)

```bash
$ bun -e 'const p=require("./packages/tui/package.json"); …'
deps: @oh-my-pi/omptype, pi-agent-core, pi-ai, pi-catalog, pi-natives, pi-utils, pi-wire, snapcompact
HAS coding-agent dep: false
```

`packages/tui` **không** phụ thuộc `@oh-my-pi/pi-coding-agent`. Hệ quả: một test `StatusLineComponent` thật **không thể** nằm ở `packages/tui/test/`; nó phải ở `packages/coding-agent/test/`. Fixture sẵn có: `packages/coding-agent/test/helpers/status-line.ts:6` và `createGallerySegmentContext` tại `cli/gallery-fixtures/segments.ts:24`.

**`measured: true`**

---

## 3. Từ 16 work item của M3, suy ra seam từng mục

Nguồn: `.lavish-wip/m3-index/light.json` (10 lát cắt) → `.lavish-wip/m3-md/sections/{ctx1,ctx2,s1..s6,tail1}.md`.
Tổng **16 work item code**: A1–A9, B1–B3, C2, D1–D3. (4 lát cắt còn lại — `ctx1`, `ctx2`, `tail1`, `tail2` — là tài liệu/gate, không mở seam.)

### 3.0. Trước hết: 32/34 file đích đã tồn tại

```bash
$ for f in …; do [ -e "$f" ] || echo "MISSING $f"; done
MISSING  packages/tui/src/mouse-wheel.ts
MISSING  packages/tui/src/theme/daltonize.ts
```

**Chỉ 2 file trong toàn bộ danh sách M3 là file MỚI**; 32 file còn lại đã có. Đây là tín hiệu mạnh rằng phần lớn M3 là *viết bằng primitive có sẵn*.

---

### Nhóm A — status line

#### A1 — `usage` vào preset · **KHÔNG cần mở seam**

| | |
| --- | --- |
| Cần seam | id `usage` trong union + renderer trong `SEGMENTS` + preset membership |
| omp ĐÃ CÓ | id tại `schema.ts:26`; renderer `usageSegment` tại `segments.ts:864-913` (~50 dòng, đủ `tier`/`5h`/`1d`/`7d`/`monthly`/`resetCredits`) |
| omp THIẾU | **chỉ** preset membership |

```bash
$ grep -n "usage\|cache_hit" packages/tui/src/status-line/presets.ts
40:			"cache_hit",
```

Một hit duy nhất, và nó là `cache_hit` — `usage` xuất hiện ở **0/7 preset**. A1 là **sửa mảng dữ liệu thuần**, **0 dòng core**.

#### D2 — segment `cache_hit_rate` · **ĐÃ CÓ SẴN DƯỚI TÊN KHÁC**

Đây là phát hiện mạnh nhất của đợt audit này, và nó **mới**, không nằm trong s5.md:

```bash
$ grep -n "cacheHitSegment" -A 25 packages/tui/src/status-line/segments.ts
718:const cacheHitSegment: StatusLineSegment = {
719:	id: "cache_hit",
724:		// Hit rate = cacheRead / total prompt tokens. …
729:		const total = cacheRead + cacheWrite + input;
731:		const rate = (cacheRead / total) * 100;
```

`cacheHitSegment` (`segments.ts:718-738`) **đã tính đúng cái tỉ lệ hit mà D2 định thêm**, với đúng biên đoạn mà s5.md mô tả. Và:

```bash
$ grep -n "cache_hit" packages/tui/src/status-line/presets.ts
40:			"cache_hit",        # ← trong preset `full`.rightSegments
```

`cache_hit` **đã bật trong preset `full`**. D2 về vật chất là **thêm một bí danh thứ hai cho một con số đã hiển thị** — 1 union member thứ 28 + 1 entry `SEGMENTS` thứ 28 render lại đúng số `cache_hit` đã có.

s5.md:105 thừa nhận "báo đúng tỉ lệ hit mà segment `cache_hit` sẵn có đã tính", nhưng vẫn xếp D2 là "thêm một thành viên union, một entry registry, một file test" (s5.md:7) — tức **vẫn tính là mở seam lõi**, dù phần lõi cần mở chỉ là tên.

**Khuyến nghị:** D2 nên hạ về "đổi tên / alias" và chạy **cùng sóng A1** (cùng sửa `presets.ts`), hoặc bỏ hẳn.

#### C2 — plugin ví dụ chạy shell của user · **KHÔNG cần mở seam, bị chặn bởi CHÍNH SÁCH**

| | |
| --- | --- |
| Cần seam | một segment giá trị đến từ tiến trình con, đăng ký runtime |
| omp ĐÃ CÓ | `ctx.ui.setStatus` nối trọn vẹn (§2.4). C2 ghi một hook status — **không đụng status line** |
| omp THIẾU | gì cả về mặt seam |

Khoá của C2 là **§10 Q6 (trust)**, chưa trả lời (s5.md:24, :151, :163), và `getPluginSettings` trả `undefined` cho khoá vắng mặt nên chỉ `=== true` mới an toàn (s5.md:159). Đây là **cổng quyền lực, không phải cổng kỹ thuật**.

M2-OQ3 chỉ còn quyết **hợp đồng âm** (id không ai đăng ký thì sao) — s5.md:175 nói rõ "Hãy viết các mục; **đừng** chặn chúng sau seam."

---

### Nhóm B — MCP elicitation

#### A2 — khai báo capability · **MỞ SEAM LÕI (nhỏ), phải đi cùng D1**

```bash
$ sed -n '99,108p' packages/coding-agent/src/mcp/client.ts
	const params: MCPInitializeParams = {
		protocolVersion: MCP_PROTOCOL_VERSION,
		capabilities: {
			roots: { listChanged: false },
		},
```

```bash
$ sed -n '1030,1042p' packages/coding-agent/src/mcp/manager.ts
	async #handleServerRequest(method: string, _params: unknown): Promise<unknown> {
		switch (method) {
			case "ping": return {};
			case "roots/list": return this.#getRoots();
			default:
				throw Object.assign(new Error(…), { code: -32601 });
```

Hai chỗ sẽ phải sửa: thêm key `elicitation` vào object `capabilities` (client.ts:101-103) và thêm `case` vào switch (manager.ts:1031-1039).

**Cạm bẫy đo được:** khai báo capability là thứ **gửi tín hiệu cho server**, nên server sẽ *bắt đầu* gửi `elicitation/create` — mà handler chưa có thì rơi vào `default:` và ném `-32601`. Đây là lý do trực tiếp s3.md yêu cầu A2+D1 trong **một commit**: A2 một mình là **một hợp đồng phá vỡ**, không phải một bổ sung.

#### D1 — form elicitation · **MỞ SEAM LÕI (surface giao thức mới duy nhất của M3)**

```bash
$ find packages -name "form.ts" -not -path "*/node_modules/*"
packages/tui/src/components/form.ts          # 16 KB — form đa trường ĐÃ CÓ

$ git grep -in "elicit" -- packages/coding-agent/src/ | head
…/modes/acp/acp-agent.ts:295-381  elicitFormFromAcpClient / elicitFromAcpClient
```

Đo được: `elicit` chỉ nằm ở **2 file**, cả hai đều là **ACP**, không phải MCP. `acp-agent.ts:295-381` đã có cầu nối `ExtensionUIContext` → `unstable_createElicitation`, kèm dọn listener để không trần `MaxListeners` (`:345-347`) và ngắn-circuits qua `dialogOptions.signal` (`:297`).

D1 nhỏ hơn nó tỏ ra: **widget form có sẵn, cầu nối ACP có sẵn**. Phần thiếu là handler MCP + chính sách per-mode (interactive/ACP/RPC/headless) + ba kết cục wire.

---

### Nhóm C — chuột / cuộn

#### A3 — tăng tốc bánh xe · **FILE MỚI, không phá hợp đồng**

```bash
$ ls packages/tui/src/mouse-wheel.ts     # MISSING
$ sed -n '70,90p' packages/tui/src/mouse.ts
73:export interface SelectListMouseTarget {
74:	handleWheel(delta: -1 | 1): void;
…
86:	if (event.wheel !== null) {
87:		target.handleWheel(event.wheel);
```

```bash
$ git grep -c "handleWheel(delta" -- packages/tui/src
apps/git/sidebar.ts:1   components/select-list.ts:1   components/settings-list.ts:1
mouse.ts:1              overlays/agent-hub.ts:1     overlays/extensions/extension-list.ts:1
overlays/oauth-selector.ts:1                         overlays/session-selector.ts:1
```

**8 file chứa `handleWheel(delta`, trong đó `mouse.ts:74` là khai báo interface chứ không phải cài đặt** → **7 cài đặt thật** (kèm `settings-list.ts:249 handleWheelAt` gọi lại). Điểm dispatch tập trung `mouse.ts:87` **đã có**; thiếu duy nhất là hệ số nhân dùng chung.

s2.md cảnh báo "sáu `handleWheel`" — con số thực là **7** (8 nếu tính cả interface). Các file còn lại trong danh sách s2 (`rewind-selector`, `copy-selector`, `raw-sse`, `log-viewer`, `usage-dashboard`) là **scroll site**, không phải wheel site — khớp với "nine scroll sites".

#### D3 — chrome cuộn transcript · **KHÔNG cần mở seam**

s2.md:9 nêu rõ phần khó nhất — neo theo index message, sống sót qua reflow — **đã cài rồi**: `ChatTranscriptBuilder.rowForEntry` → `ScrollRangeAnchor` → `ScrollView.revealRange`. D3 còn lại là render + keybinding.

---

### Nhóm D — plugin surface

#### B1 — ghim lỗ hổng tool-renderer · **KHÔNG cần mở seam (0 dòng core)**

```bash
$ git grep -n "registerToolRenderer\|toolRenderer" -- packages/ | head
…/extensions/types.ts:1450:  registerMessageRenderer<T>(customType, renderer): void;
…/extensions/types.ts:1453:  registerAssistantThinkingRenderer(renderer): void;
…/extensions/types.ts:1812:  messageRenderers: Map<string, MessageRenderer>;
…/tui/src/tools/index.ts:35:  export const toolRenderers: Record<string, ToolRenderer> = {
…/tui/src/chat/tool-execution.ts:355:  this.#renderer = options.useBuiltInRenderer === false ? undefined : toolRenderers[toolName];
```

API extension có **hai** hàm `register*Renderer` và **không** có `registerToolRenderer`. **Đó chính là lỗ hổng** — B1 ghim nó bằng fixture, cố tình **không** forge API (s4.md:11; câu handoff M4/M5 #4). Đây là mục đã xong về mặt khảo sát.

#### A4 — mask setting bí mật · **KHÔNG cần mở seam**

```bash
$ grep -n "secret" packages/tui/src/overlays/plugin-settings.ts
31:	secret?: boolean;
152:		const displayValue = schema.secret && currentValue ? "••••••••" : String(currentValue ?? "(not set)");
667:		secret: schema.secret,
$ grep -c "secret\|mask" packages/tui/src/components/settings-list.ts   # 0
```

Mask **giá trị hiện tại** đã có (`plugin-settings.ts:152`); mask ở **hàng enum** thì chưa — `settings-list.ts` có 0 hit. A4-display là sửa hiển thị trong overlay có sẵn. A4-**PERSIST** (`manager.ts:942-949`) là nửa còn lại, cần M2 WI-8a.

#### B2 — sanitize working message · **KHÔNG cần mở seam**

```bash
$ git grep -n "workingMessage\|WorkingMessage" -- packages/
…/extensions/types.ts:267:        setWorkingMessage(message?: string): void;
…/modes/controllers/extension-ui-controller.ts:129:  setWorkingMessage: message => this.ctx.setWorkingMessage(message),
…/modes/controllers/event-controller.ts:616:  #updateWorkingMessageFromIntent(intent: unknown): void {
…/modes/controllers/event-controller.ts:627:    this.ctx.setWorkingMessage(trimmed);
```

Cả ba chặng đã nối. B2 chỉ là siết sanitize trên đường đã có.

#### A8 / B3 — gợi ý phím + tmux · **KHÔNG cần mở seam**

```bash
$ wc -l packages/tui/src/chrome/keybinding-hints.ts          # 80
$ grep -n "tmux\|TMUX" packages/tui/src/chrome/keybinding-hints.ts   # 0 hit
```

Cả hai item cùng sửa **một** file 80 dòng. Không có `tmux` ở đâu trong file → đây là **dữ liệu mới**, không phải seam. Hai item nên gộp.

---

### Nhóm E — vòng lặp / nhóm đọc / theme

#### A5 — chỉ báo stall · **MỞ seam (bề mặt render mới)**

```bash
$ wc -l packages/tui/src/loop-watchdog.ts   # 141
$ grep -n "export" packages/tui/src/loop-watchdog.ts
4:export interface LoopWatchdogOptions {
57:export class LoopWatchdog {
```

Phần **sinh** tín hiệu đã có (phân loại theo CPU time, `:51`). Thiếu **trailer hiển thị**. Additive.

#### A6 — predicate thành viên nhóm đọc · **MỞ seam (predicate mới)**

```bash
$ wc -l packages/tui/src/chat/read-tool-group.ts   # 872
30:export function readArgsHaveTarget(args: unknown): boolean {
41:export function readArgsCollapseIntoGroup(args: unknown): boolean {
54:export function groupedReadUsageCallIds(message): string[] | undefined {
310:export class ReadToolGroupComponent extends Container implements ToolExecutionHandle {
```

Module có sẵn và đã sở hữu ba consumer (`read-tool-group.ts:59`, `chat-transcript-builder.ts:443`, `:507`). Tên `readCollapsesIntoGroup` của plan **không tồn tại** — nhưng `readArgsCollapseIntoGroup` **đã có** ở `:41`. Và `getTool` đã nằm trong `ChatTranscriptBuilderDeps` (`:67`), đã dùng ở `:475` (ctx2.md mục 10). Đây là predicate mới trong module có chủ sở hữu — **rẻ nhất trong nhóm "mở seam"**.

#### A9 — theme daltonized · **FILE MỚI + mở rộng switch có sẵn**

```bash
$ ls packages/tui/src/theme/daltonize.ts        # MISSING
$ sed -n '142,153p' packages/tui/src/theme/loader.ts
142:	colorBlindMode?: boolean;
145:/** HSV adjustment to shift green toward blue for colorblind mode (red-green colorblindness) */
149:	const { mode, symbolPresetOverride, colorBlindMode } = options;
153:	if (colorBlindMode) {
```

Cờ `colorBlindMode` **đã chạy trọn vẹn** (`theme/theme.ts:138-164`, `prompt/composer-cache.ts:214-244`, `setup/scenes/theme.ts:109,274,309,329-331`). A9 = file mới + mở rộng phạm vi một khối `if` có sẵn.

---

## 4. Mỗi seam còn thiếu: mở được không, và phá hợp đồng nào

| Seam | Mở KHÔNG sửa hành vi đang chạy? | Lý do cụ thể | Hợp đồng bị phá nếu mở sai |
| --- | --- | --- | --- |
| `mouse-wheel.ts` (A3) | **CÓ** | File mới, 7 call-site chỉ cần *opt in*. Dispatch `mouse.ts:87` không đổi | Nếu đổi chữ ký `handleWheel(delta: -1\|1)` thì vỡ `SelectListMouseTarget` (`:73-78`) + 6 cài đặt. Giữ nguyên chữ ký, nhân bên trong. |
| `daltonize.ts` (A9) | **CÓ** | File mới; chỉ mở rộng khối `if (colorBlindMode)` ở `loader.ts:153` | Nếu áp delta đồng nhất lên cả 5 token, chúng va chạm (rủi ro s6.md ghi). Bảo toàn `composer-cache.ts:214-244` (cache key phải phản ánh mọi input). |
| Predicate read-collapse (A6) | **CÓ** | Hàm thuần trong module đã có chủ sở hữu; thêm export không đổi call-site nào | Ranh giới group: đổi `read-tool-group.ts:41` in-place sẽ đổi cách **collapse transcript hiện đang render**, tức đổi hành vi nhìn thấy được. Phải là hàm mới. |
| Trailer stall (A5) | **CÓ** | `LoopWatchdog` đã có, chỉ thêm bề mặt render | `LoopWatchdog` phân loại theo **CPU time** (`:51`) — đổi sang wall-clock sẽ đổi ngưỡng đang chạy. Giữ nguyên phân loại. |
| Hàng notice (A7) | **CÓ, NHƯNG** | Không dùng chrome composer: `EditorTopBorder` là **chuỗi** `{ content; width; revision? }`, không phải chỗ cắm Component | Phải là **Container mới trong mảng bố cục**. Cắm vào chrome sẽ phá `setTopBorderProvider` trong `syncComposerShape`. Hợp đồng cần giữ: hàng notice **không nằm trong transcript**. |
| `elicitation` capability (A2) | **KHÔNG — một mình** | Khai báo làm server **bắt đầu gửi** `elicitation/create`; chưa có handler thì rơi vào `manager.ts:1038 default:` và ném `-32601` | Đây là seam duy nhất trong M3 **không thể mở độc lập**. Bắt buộc chung commit với D1. |
| Handler `elicitation/create` (D1) | **CÓ** | Thêm `case` vào switch; `default` còn nguyên cho method lạ | Ba kết cục wire phải phân biệt được (decline/cancel/timeout). Số nguyên bị sanitize (`acp-agent.ts:299-300` nói ACP không có `cancel_elicitation` cho form-mode → phải map về cancel, **không** map về decline). |
| `cache_hit_rate` union member (D2) | **CÓ** | 1 phần tử union + 1 entry `Record` | `Record<StatusLineSegmentId, StatusLineSegment>` ở `segments.ts:919` là **bắt buộc đủ** — thêm id mà quên entry thì `renderSegment` (`:951-953`) trả `{ content:"", visible:false }`, **âm thầm**, không throw. Đó là cách hỏng âm thầm của seam này. |
| `usage` vào preset (A1) | **CÓ** | Sửa mảng `leftSegments`/`rightSegments` | `Record<StatusLinePreset, PresetDef>` (`:4`) + `getPreset` fallback (`:105-107`). Thêm id vào `full` mà không sửa `nerd` sẽ tạo **width ladder** — 7 preset đang có 2 `rightSegments` rất khác nhau. |

---

## 5. Thứ tự mở

### 5.1. Ràng buộc cứng duy nhất

```
A2 ──(bắt buộc cùng commit)── D1
```

Đây là **cặp duy nhất** trong M3 có ràng buộc mã. Không phải vì lịch trình — vì khai báo capability mà thiếu handler là `-32601` lúc runtime.

### 5.2. Chặn M2 (ràng buộc bên ngoài, đã biết)

| Bị chặn bởi | Ai chặn | Ghi chú |
| --- | --- | --- |
| A4-PERSIST (`manager.ts:942-949`) | M2 WI-8a | A4-**display**, B1, B2, B3 **không** bị chặn |
| C2 | §10 Q6 (trust) | Chưa trả lời. Q6 là cổng quyền lực, **không** phải cổng kỹ thuật |
| C2, D2 | M2-OQ3 | **Chỉ** cho hợp đồng âm (id lạ). Dưới phương án 2/3 thì **không** cái nào bị chặn (s5.md:175) |

**Không có work item M3 nào bị chặn bởi M2 vì lý do seam.** M2-OQ3 chỉ còn là quyết định hình thức.

### 5.3. Thứ tự đề xuất

```
BƯỚC 0 (song song, 0 ràng buộc, 0 dòng core)   ← 9 mục, gần hết M3 nằm ở đây
  ├─ A1 + D2   cùng sửa presets.ts            (D2 nên hạ thành alias của cache_hit)
  ├─ A8 + B3   cùng sửa keybinding-hints.ts    (2 mục, 1 file 80 dòng)
  ├─ B1        ghim lỗ hổng, 0 dòng core
  ├─ B2        sanitize trên đường đã nối
  ├─ A4-display sửa hiển thị trong overlay có sẵn
  ├─ A6        predicate mới, module đã có chủ sở hữu
  ├─ D3        neo theo index đã có sẵn
  └─ A5, A9    file mới + mở rộng if có sẵn

BƯỚC 1 (cần một commit duy nhất, ~5 ngày, không được cắt)
  └─ A2 + D1   MỘNG CHÍNH MỘNG

BƯỚC 2 (đo trước, rồi mới viết)
  └─ A3        bảng đo bánh xe là thời gian lịch, không phải code
               → phải đi SAU A6 vì cùng vùng transcript-viewer? KHÔNG —
                 A3 và D3 cùng file agent-transcript-viewer.ts, D3 ở BƯỚC 0.
                 Đổi tên: A3 phải đi TRƯỚC D3, cùng file.

BƯỚC 3 (đằng sau, tự quyết)
  └─ A7        Container mới trong mảng bố cục + chứng minh "không lẫn transcript"
  └─ C2        chỉ khi Q6 có câu trả lời bằng văn bản
```

**Sửa so với thứ tự trong kế hoạch:** D3 đang ở sóng 2 cùng A3, nhưng D3 **không chặn** A3 — ngược lại. `s2.md:8` nói "M3-D3 must land AFTER M3-A3" vì cùng file. Nhưng D3 không cần seam mới, nên nó có thể đi BƯỚC 0 **với điều kiện A3 sửa `agent-transcript-viewer.ts` trước**.

---

## 6. Đếm: mở seam core hay viết bằng primitive có sẵn

| # | Work item | Phân loại | Seam phải tạo |
| --- | --- | --- | --- |
| 1 | **A1** usage preset | **CÓ SẴN** | không — sửa mảng preset |
| 2 | **A2** capability | **MỞ LÕI** | key `elicitation` trong `client.ts:101-103` + `case` ở `manager.ts:1031` |
| 3 | **A3** wheel | **MỞ LÕI** | `mouse-wheel.ts` (file mới) |
| 4 | **A4** secret mask | **CÓ SẴN** | không — `plugin-settings.ts` đã mask |
| 5 | **A5** stall trailer | **MỞ LÕI** | bề mặt render mới |
| 6 | **A6** read predicate | **MỞ LÕI** | predicate mới trong module có chủ sở hữu |
| 7 | **A7** notice queue | **MỞ LÕI** | Container mới trong mảng bố cục |
| 8 | **A8** tmux hints | **CÓ SẴN** | không — dữ liệu mới |
| 9 | **A9** daltonize | **MỞ LÕI** | `daltonize.ts` (file mới) + mở rộng `loader.ts:153` |
| 10 | **B1** renderer pin | **CÓ SẵN** | không — ghim lỗ hổng, 0 dòng core |
| 11 | **B2** working msg | **CÓ SẴN** | không — 3 chặng đã nối |
| 12 | **B3** key-hint strip | **CÓ SẴN** | không — cùng file A8 |
| 13 | **C2** user shell | **CÓ SẴN** | không — `setStatus` đã nối; bị chặn bởi Q6 |
| 14 | **D1** elicitation form | **MỞ LÕI** | method giao thức MCP mới |
| 15 | **D2** hit rate | **CÓ SẴN** | không — `cache_hit` đã có, đã bật trong `full` |
| 16 | **D3** scroll chrome | **CÓ SẴN** | không — `rowForEntry`→`ScrollRangeAnchor` đã có |

```
MỞ SEAM LÕI           : 7   (A2, A3, A5, A6, A7, A9, D1)
VIẾT BẰNG CÓ SẴN      : 9   (A1, A4, A8, B1, B2, B3, C2, D2, D3)
                        ───
                        16
```

### Nhưng 9 cái "có sẵn" cần thu hẹp thêm

- **D2** không chỉ "có sẵn" — **cái nó làm đã tồn tại và đã bật** (`cache_hit` trong preset `full`). Nó là bí danh thứ hai cho một số đã hiển thị. **Nên bỏ hoặc hạ xuống một dòng preset.**
- **B1** không cần seam vì nhiệm vụ của nó **là** ghim lỗ hổng. Giá trị nằm ở bằng chứng, không ở code.
- **C2** có seam đủ rồi; nó trượt vì **chính sách**, không vì kỹ thuật.
- **A1, A8, B3** thuần tuý sửa dữ liệu — gộp lại: A1+D2 một commit `presets.ts`, A8+B3 một commit `keybinding-hints.ts`.

### Con số quyết định

**Việc thật còn lại của M3 là 7 seam, không phải 16 work item.** Trong 7 seam đó:

- **1 cặp bắt buộc đi cùng nhau** (A2+D1) — và nó là ~5 ngày, item đắt nhất, theo s3.md **không được cắt ngân sách**.
- **2 file mới** (`mouse-wheel.ts`, `daltonize.ts`) — 32/34 file đích còn lại đã tồn tại.
- **1 file mới dễ nhất** (A6, predicate mới trong module 872 dòng đã có chủ sở hữu).
- **0 seam nào cần M2 để mở** — M2-OQ3 còn lại chỉ là hợp đồng âm.

### Rủi ro âm thầm chung của cả nhóm status-line

`renderSegment` (`segments.ts:949-955`) trả `{ content: "", visible: false }` khi `SEGMENTS[id]` thiếu — **không throw**. Vậy thêm union member mà quên entry registry sẽ **biến mất âm thầm**, không đỏ. Đây là kênh hỏng chính của A1/D2/C2 và cần một assertion kiểu `ALL_SEGMENT_IDS.length === STATUS_LINE_SEGMENT_IDS.length` (tức 27 === 27, đo được ở `segments.ts:957`).

---

## Phụ lục — lệnh đã chạy

```bash
git grep -n "registerStatusLineSegment" | wc -l                                    # 2 (docs)
git grep -c "registerStatusLineSegment" -- packages/ | wc -l                        # 0
git grep -n "registerStatusLineSegment" -- '*.ts' '*.tsx' '*.js' | wc -l           # 0
git grep -n ShowStatusOptions -- packages/ | wc -l                                 # 0
ls -la packages/tui/src/status-line/
wc -l packages/tui/src/status-line/*.ts | sort -rn                                 # 5776
cat -n packages/tui/src/status-line/schema.ts
sed -n '915,960p' packages/tui/src/status-line/segments.ts                          # SEGMENTS: 27
cat -n packages/tui/src/status-line/presets.ts
grep -n "cacheHitSegment" -A 25 packages/tui/src/status-line/segments.ts           # :718-738
grep -n "usageSegment" -A 20 packages/tui/src/status-line/segments.ts              # :864
git grep -c "pi-tui/status-line" -- packages/ | sort -t: -k2 -rn
git grep -n setStatus -- packages/tui/src packages/coding-agent/src | wc -l        # 74
sed -n '955,975p' packages/tui/src/status-line/component.ts                        # setHookStatus
git grep -n setStatus -- packages/coding-agent/src/modes/types.ts \
    packages/coding-agent/src/modes/controllers/extension-ui-controller.ts         # :128
bun -e '…packages/tui/package.json'                                                # no coding-agent dep
sed -n '99,108p' packages/coding-agent/src/mcp/client.ts                           # capabilities
sed -n '1030,1042p' packages/coding-agent/src/mcp/manager.ts                       # -32601
find packages -name form.ts -not -path "*/node_modules/*"                          # components/form.ts
git grep -in elicit -- packages/coding-agent/src/ | head                           # 2 file, ACP
git grep -c "handleWheel(delta" -- packages/tui/src                                 # 8 (7 impl)
sed -n '70,90p' packages/tui/src/mouse.ts
git grep -n "registerToolRenderer\|toolRenderer" -- packages/ | head
grep -n "secret" packages/tui/src/overlays/plugin-settings.ts
grep -c "secret\|mask" packages/tui/src/components/settings-list.ts                # 0
grep -n "workingMessage\|WorkingMessage" -- packages/ (git grep)
wc -l packages/tui/src/chrome/keybinding-hints.ts ; grep -c tmux …                 # 80 / 0
wc -l packages/tui/src/loop-watchdog.ts ; grep -n export …
wc -l packages/tui/src/chat/read-tool-group.ts ; grep -n "export function"
ls packages/tui/src/mouse-wheel.ts packages/tui/src/theme/daltonize.ts             # both MISSING
sed -n '142,153p' packages/tui/src/theme/loader.ts
grep -rn "flexDirection" packages/tui/src/ | wc -l ; grep -rn "yoga" … | wc -l    # 0 / 0
```
