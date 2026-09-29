# Phiếu triển khai — W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer

> Trạng thái: **đã mở và đọc 93 neo tại HEAD `65cc6c1`, branch `milestone-1`.**
> 84 neo đúng nguyên văn. **9 neo hỏng** — 6 sai vị trí, 3 sai về sự thật. Bảng neo hỏng ở §7.
> Ngoài ra kế hoạch **bỏ sót 2 file** mà `tsgo` bắt buộc phải có (`: modes/types.ts`, `interactive-mode.ts`) — §2.
>
> **Sửa lớn nhất so với kế hoạch: cổng test KHÔNG bị chặn.** Kế hoạch nói `bun test` chết vì
> `Failed to load pi_natives native addon for darwin-arm64`. **Đã chạy thật hôm nay: xanh.**
> Chi tiết ở §5. Đừng đánh dấu W15 là `test-pending`.
>
> Nguồn port nằm **ngoài repo**: `/Users/tranquangdang21/Projects/pi-ref` (HEAD `d6af72e18`).
> Trong cây `ultraworkers` không có `pi-ref/` — `ls -d pi-ref` trả về không có file như vậy.

---

## 1. Cái gì thay đổi, quan sát được

Bấm `Ctrl+Shift+F` khi không có overlay nào mở sẽ vẽ một overlay fullscreen chứa **bản replay của toàn bộ transcript của phiên** cộng một thanh tìm 3 dòng ở đáy; gõ để lọc, thanh tìm đếm khớp (`"7/23"` hoặc `"No matches"`), `Enter` cuộn viewport tới và tô sáng kết quả kế tiếp, `Shift+Enter` lùi một kết quả, `Escape` đóng và trả focus về prompt. Không key, layout, hay render path hiện hữu nào bị đụng tới.

**Đã đo trước khi viết phiếu này (chạy thật tại HEAD, không suy luận):**

```
$ bun test packages/tui/test/scroll-view.test.ts            → 13 pass / 0 fail
$ bun test packages/tui/test/keybindings.test.ts \
                packages/tui/test/input.test.ts             → 28 pass / 0 fail
$ bun test packages/tui/test/render-utils.test.ts \
                packages/tui/test/autocomplete.test.ts      → 119 pass / 0 fail   ← 2 file này import @oh-my-pi/pi-natives
$ bun run --cwd=packages/tui check                          → exit 0
$ bun run --cwd=packages/coding-agent check:types           → exit 0
```

Không cần `brew install ninja`, không cần `bun --cwd=packages/natives run build`. Cổng 1 và cổng 2 xanh sẵn, cổng 3 xanh sẵn.

---

## 2. Bảng điểm sửa

Kế hoạch liệt kê 9 file. Thực tế là **11 file** — kế hoạch bỏ sót hai dòng bắt buộc (đánh dấu ⚠).

| đường/dẫn | symbol | TRƯỚC (trích nguyên văn từ file) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/tui/src/chat/transcript-search-index.ts` | *(file mới)* | *(không tồn tại)* | Port `pi-ref/.../alt-screen-search.ts:4-194`. Đổi `getGraphemeSegmenter` → `getSegmenter`. `AltScreenSearch*` → `TranscriptSearch*` |
| `packages/tui/src/overlays/transcript-search.ts` | *(file mới)* | *(không tồn tại)* | `TranscriptSearchComponent` (port `pi:197-326`) + `TranscriptSearchOverlay` (mới, không có ở pi) |
| `packages/tui/src/keybindings.ts` | `interface Keybindings` | dòng 42: `"tui.select.cancel": true;` rồi dòng 43 là `}` | thêm `"tui.transcript.searchNext": true;` + `"tui.transcript.searchPrevious": true;` **trước** `}` |
| `packages/tui/src/keybindings.ts` | `TUI_KEYBINDINGS` | dòng 138-141: `"tui.select.cancel": { defaultKeys: ["escape","ctrl+c"], description: "Cancel selection" },` rồi `} as const satisfies KeybindingDefinitions;` | thêm 2 entry ngay trước `}`; `searchNext` `defaultKeys: ["enter"]`, `searchPrevious` `defaultKeys: ["shift+enter"]` |
| `packages/tui/src/app-keybindings.ts` | `interface AppKeybindings` | dòng 64: `"app.live.toggle": true;` | thêm `"app.transcript.search": true;` — **không** đụng dòng 68 |
| `packages/tui/src/app-keybindings.ts` | `KEYBINDINGS` | dòng 236-239: `"app.history.search": { defaultKeys: "ctrl+r", description: "Search history" },` | thêm entry `defaultKeys: "ctrl+shift+f"` ngay sau dòng 239 |
| `packages/tui/src/hotkeys-markdown.ts` | bảng hotkeys | dòng 79: `` `\| \`${hotkeyLabel(bindings, "app.history.search")}\` \| Search prompt history \|`, `` | thêm 1 dòng `` `\| \`${hotkeyLabel(bindings, "app.transcript.search")}\` \| Search transcript \|`, `` ngay sau |
| `packages/coding-agent/src/modes/controllers/selector-controller.ts` | `showTranscriptSearch()` | ngay sau khối `showCopySelector()` kết thúc ở dòng 1257 (`this.ctx.ui.requestRender();` / `}`) | method mới, copy nguyên hình dạng `showCopySelector` (`:1204-1257`) |
| `packages/coding-agent/src/modes/controllers/input-controller.ts` | `#globalEditorActionsListener` | dòng 331-337: nhánh `app.history.search` (`if (this.ctx.keybindings.matches(data, "app.history.search")) { if (this.ctx.ui.hasOverlay() \|\| this.ctx.ui.getFocused() instanceof HistorySearchComponent) { return undefined; } this.ctx.showHistorySearch(); return { consume: true }; }`) | thêm nhánh `app.transcript.search` ngay sau dòng 337, chỉ có `hasOverlay()` |
| ⚠ `packages/coding-agent/src/modes/types.ts` | `InteractiveModeContext` | dòng 476: `showCopySelector(): void;` | thêm `showTranscriptSearch(): void;` ngay sau. **Kế hoạch không liệt kê file này.** Không có nó thì `this.ctx.showTranscriptSearch()` ở input-controller **không typecheck** |
| ⚠ `packages/coding-agent/src/modes/interactive-mode.ts` | `InteractiveMode` | dòng 7116-7118: `showCopySelector(): void {` / `this.#selectorController.showCopySelector();` / `}` | thêm `showTranscriptSearch(): void { this.#selectorController.showTranscriptSearch(); }`. **Kế hoạch không liệt kê file này.** Không có nó thì `InteractiveMode` không còn implement `InteractiveModeContext` |
| `packages/tui/test/transcript-search.test.ts` | *(file mới)* | *(không tồn tại)* | 6 `it()` theo §4 |
| `packages/tui/CHANGELOG.md` | `[Unreleased]` | dòng 3 là `## [Unreleased]`, dòng 4 trống, dòng 5 là `## [18.4.0]` — **chưa có mục `### Added`** | thêm `### Added` + 1 dòng dưới `[Unreleased]` |
| `packages/coding-agent/CHANGELOG.md` | `[Unreleased]` | dòng 3 `## [Unreleased]`, dòng 5 `### Security` — **chưa có `### Added`** | thêm `### Added` (đặt **sau** `### Security`, theo thứ tự AGENTS.md: Breaking → Added → Changed → Fixed → Removed) + 1 dòng |

### 2b. Bảng "chỉ đọc, không sửa" — 16 file

`packages/tui/src/utils.ts` · `packages/tui/src/key-hint-format.ts` · `packages/tui/src/components/input.ts` · `packages/tui/src/tui.ts` · `packages/tui/src/chat/chat-transcript-builder.ts` · `packages/tui/src/chat/transcript-browser.ts` · `packages/tui/src/chat/transcript-outline.ts` · `packages/tui/src/components/scroll-view.ts` · `packages/tui/src/chrome/transcript-container.ts` · `packages/tui/src/overlays/copy-selector.ts` · `packages/tui/src/overlays/history-search.ts` · `packages/coding-agent/src/session/session-context.ts` · `packages/coding-agent/src/modes/types.ts` ⚠ *(nằm trong cả hai bảng: đọc để biết chỗ chèn, sửa 1 dòng)* · `packages/tui/src/keys.ts` · `.oxlintrc.json` · `packages/tui/package.json`

---

## 3. Các bước

Mỗi bước dưới đây đi kèm neo **tôi đã mở và đọc ở HEAD `65cc6c1`**.

### Bước 0 — Kiểm chord còn trống (chạy lại, đừng tin kế hoạch)

```bash
for k in ctrl+shift+f ctrl+shift+e ctrl+shift+k alt+k alt+x ctrl+g; do
  printf '%s -> ' "$k"; rg -F -c "$k" packages/tui/src packages/coding-agent/src 2>/dev/null | wc -l | tr -d ' '
done
```

Đã đo ở HEAD: `ctrl+shift+f` **0**, `ctrl+shift+e` **0**, `ctrl+shift+k` **0**, `alt+k` **0**, `alt+x` **1**, `ctrl+g` **4**.

*Neo đã kiểm — `packages/tui/src/app-keybindings.ts:141`* (`ctrl+g` bị chiếm, dòng plan chỉ nói 1 chỗ — thực tế 4):
```ts
		defaultKeys: "ctrl+g",
```
Ba hit còn lại: `packages/tui/src/keybinding-matchers.ts:63` (`return matchesKey(data, "ctrl+g");`), `packages/tui/src/overlays/hook-editor.ts:88` (`const externalEditorKey = editorKey("app.editor.external") || formatKeyHint("ctrl+g");`), `packages/coding-agent/src/extensibility/extensions/runner.ts:1140` (`"ctrl+g": true,`).

*Hit duy nhất của `alt+x` — doc comment, không phải binding: `packages/tui/src/keys.ts:544`*
```ts
 * - Combined modifiers: "shift+ctrl+p", "ctrl+alt+x"
```
→ `alt+x` **về mặt chức năng vẫn trống**. Kế hoạch ghi "0 hit" là sai.

**Kết luận bước 0:** mang `["enter"]` / `["shift+enter"]` sang, **không** mang `ctrl+g` của pi. `ctrl+shift+f` trống → dùng.

> ⚠️ Kế hoạch gắn neo `packages/tui/src/keybindings.ts:186` cho bước này. `:186` là `const code = key.charCodeAt(0);` bên trong `isAsciiUppercaseLetter` — **không liên quan gì** tới việc chord trống hay không. Dùng `packages/tui/src/app-keybindings.ts:141` (bảng binding) làm neo thay thế.

### Bước 1 — Copy `transcript-search-index.ts` (không viết lại)

Nguồn: `/Users/tranquangdang21/Projects/pi-ref/packages/tui/src/alt-screen-search.ts`, HEAD `d6af72e18`, **327 dòng** (đã `wc -l`).

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:4`* — import cần sửa:
```ts
import { getGraphemeSegmenter, stripTerminalSequences, truncateToWidth, visibleWidth } from "./utils.ts";
```
*Đã grep:* `rg -n "getGraphemeSegmenter" packages/` → **0 hit**. Symbol không tồn tại trong omp.

*Neo đã kiểm — `packages/tui/src/utils.ts:226`* — thay thế:
```ts
export function getSegmenter(): Intl.Segmenter {
```
Hai import còn lại có sẵn: `packages/tui/src/utils.ts:318` (`export function visibleWidth(str: string): number {`) và `packages/tui/src/utils.ts:388` (`export function stripTerminalSequences(str: string): string {`).

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:32` và `:34`*
```ts
const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;

function buildSearchCorpus(lines: readonly string[]): SearchCorpus {
```

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:53-72`* — fast path ASCII, **giữ nguyên từng byte**:
```ts
		if (PRINTABLE_ASCII.test(line)) {
			let index = 0;
			while (index < line.length) {
				if (line.charCodeAt(index) === 0x20) {
					if (textLength > 0) pendingSeparator = true;
					column += 1;
					index += 1;
					continue;
				}
				let end = index + 1;
				while (end < line.length && line.charCodeAt(end) !== 0x20) end += 1;
				appendSeparator();
				const text = line.slice(index, end);
				chunks.push(text);
				spans.push({
					textStart: textLength,
					textEnd: textLength + text.length,
					row,
					startCol: column,
					endCol: column + text.length,
					linearColumns: true,
				});
```

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:80-101`* — slow path grapheme, `linearColumns: false`:
```ts
		} else {
			for (const grapheme of segmenter.segment(line)) {
				const text = grapheme.segment;
				const width = visibleWidth(text);
				...
					linearColumns: false,
```

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:107`* và `:111`*
```ts
function normalizeQuery(query: string): string {
	return query.replace(/\s+/gu, " ").trim();
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:127-135`* — phép map span → cột, **đây là chỗ dễ sai nhất**:
```ts
			const startCol = span.linearColumns
				? span.startCol + Math.max(start, span.textStart) - span.textStart
				: span.startCol;
			const endCol = span.linearColumns ? span.startCol + Math.min(end, span.textEnd) - span.textStart : span.endCol;
```

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:162-183`* — `search()`, so sánh element-wise:
```ts
	search(lines: readonly string[], query: string): AltScreenSearchResult {
		let sourceChanged = this.sourceLines?.length !== lines.length;
		if (!sourceChanged && this.sourceLines) {
			for (let index = 0; index < lines.length; index++) {
				if (this.sourceLines[index] === lines[index]) continue;
				sourceChanged = true;
				break;
			}
		}
		if (sourceChanged || !this.corpus) {
			this.sourceLines = Array.from(lines);
			this.corpus = buildSearchCorpus(lines);
		}
		const normalizedQuery = normalizeQuery(query);
		const changed = sourceChanged || normalizedQuery !== this.normalizedQuery;
		...
		return { matches: this.matches, changed };
```

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:186` và `:191`*
```ts
export function findAltScreenSearchMatches(lines: readonly string[], query: string): AltScreenSearchMatch[] {
	const normalizedQuery = normalizeQuery(query);
	return normalizedQuery ? findSearchCorpusMatches(buildSearchCorpus(lines), normalizedQuery) : [];
}

export function getAltScreenSearchMatchKey(match: AltScreenSearchMatch): string {
	const first = match.segments[0];
	const last = match.segments[match.segments.length - 1];
	return first && last ? `${first.row}:${first.startCol}:${last.row}:${last.endCol}` : "";
}
```

Non-null assertion (`corpus.spans[spanIndex]!`) là hợp lệ: `.oxlintrc.json:26` → `"typescript/no-non-null-assertion": "off",`.

### Bước 2 — Port `TranscriptSearchComponent` (3 chỉnh bắt buộc)

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:197`* — điểm bắt đầu:
```ts
export class AltScreenSearchComponent implements Component, Focusable {
	private readonly input = new Input({
		prompt: " ",
		placeholder: "Find in transcript",
		placeholderStyle: (text) => `\x1b[2m${text}\x1b[22m`,
	});
```

*Neo đã kiểm — `packages/tui/src/components/input.ts:53`* — Input của omp **không có constructor**:
```ts
export class Input implements Component, Focusable {
```
*Đã đọc tiếp `input.ts:58-62`* — chỉ có field mutable công khai, **không có placeholder**:
```ts
	/** Rendered before the editable area; set to "" for chrome-less embedding. */
	prompt = "> ";
	/** Render the editable value as bullets while retaining the real value internally. */
	mask = false;
	onSubmit?: (value: string) => void;
	onEscape?: () => void;
```
→ `new Input()` rồi `this.#input.prompt = "Find: "`. Bỏ hẳn `placeholder` / `placeholderStyle`.
`getValue()` tồn tại: `input.ts:84` → `getValue(): string {`. `handleInput` dùng được cho `handleInput` của component.

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:260`*:
```ts
	render(width: number): string[] {
```
*Neo đã kiểm — `packages/tui/src/tui.ts:241`*:
```ts
	render(width: number): readonly string[];
```
→ đổi thành `readonly string[]`.

*Neo đã kiểm — `packages/tui/src/tui.ts:296-301`* — `Focusable` chỉ cần `focused` (+ optional `setUseTerminalCursor`):
```ts
export interface Focusable {
	/** Set by TUI when focus changes. Component should emit CURSOR_MARKER when true. */
	focused: boolean;
	/** Set by TUI when hardware cursor rendering is enabled or disabled. */
	setUseTerminalCursor?(useTerminalCursor: boolean): void;
}
```
→ getter/setter `focused` của pi port thẳng, nhưng mọi `private` → `#field`.

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:290-303`* — logic thu hẹp theo width, **giữ nguyên**:
```ts
		let previousButton = `↑ ${previousKey}`;
		let nextButton = `↓ ${nextKey}`;
		let separator = " · ";
		const outerGapWidth = 1;
		const availableControlsWidth = Math.max(0, innerWidth - outerGapWidth * 2 - 1);
		let controlsWidth = visibleWidth(previousButton) + visibleWidth(separator) + visibleWidth(nextButton);
		if (controlsWidth > availableControlsWidth) {
			previousButton = "↑";
			nextButton = "↓";
			separator = " ";
			controlsWidth = visibleWidth(previousButton) + visibleWidth(separator) + visibleWidth(nextButton);
		}
```

### Bước 3 — Xoá `formatKey` cục bộ, dùng `formatKeyHints`

*Neo đã kiểm — `pi-ref/.../alt-screen-search.ts:263-272`* — helper trùng lặp, **xoá**:
```ts
		const formatKey = (key: string | undefined): string =>
			key
				? key
						.split("+")
						.map((part) => {
							if (process.platform === "darwin" && part.toLowerCase() === "alt") return "Option";
							return part.charAt(0).toUpperCase() + part.slice(1);
						})
						.join("+")
				: "Unbound";
		const keybindings = getKeybindings();
		const previousKey = formatKey(keybindings.getKeys("tui.altScreen.searchPrevious")[0]);
		const nextKey = formatKey(keybindings.getKeys("tui.altScreen.searchNext")[0]);
```

*Neo đã kiểm — `packages/tui/src/key-hint-format.ts:114`*:
```ts
export function formatKeyHints(keys: KeyName | readonly KeyName[]): string {
	return typeof keys === "string" ? formatKeyHint(keys) : keys.map(formatKeyHint).join("/");
```
→ `formatKeyHints(getKeybindings().getKeys("tui.transcript.searchPrevious")[0])`.

`getKeybindings()` tồn tại trong omp: `packages/tui/src/keybindings.ts:346` → `export function getKeybindings(): KeybindingsManager {`, `getKeys` ở `:309` → `getKeys(keybinding: Keybinding): KeyId[] {`. Pi đọc hai binding này qua cùng đường đó — port không đổi gì.

### Bước 4 — Đăng ký 2 binding tầng TUI

*Neo đã kiểm — `packages/tui/src/keybindings.ts:7`*:
```ts
export interface Keybindings {
```
*Đã đọc `keybindings.ts:38-43`* — member cuối **ở dòng 42**, dòng 43 là `}`:
```ts
	"tui.select.confirm": true;
	"tui.select.cancel": true;
}
```
> ⚠️ Kế hoạch ghi "member cuối `tui.select.cancel` ở dòng 43". Thực tế **dòng 42**; 43 là dấu `}` đóng interface. Chèn vào dòng 43 (trước `}`).

*Neo đã kiểm — `packages/tui/src/keybindings.ts:58`*:
```ts
export const TUI_KEYBINDINGS = {
```
*Đã đọc `keybindings.ts:138-142`* — entry cuối:
```ts
	"tui.select.cancel": {
		defaultKeys: ["escape", "ctrl+c"],
		description: "Cancel selection",
	},
} as const satisfies KeybindingDefinitions;
```
Thêm trước `}`:
```ts
	"tui.transcript.searchNext": { defaultKeys: ["enter"], description: "Jump to the next transcript search match" },
	"tui.transcript.searchPrevious": {
		defaultKeys: ["shift+enter"],
		description: "Jump to the previous transcript search match",
	},
```

> ⚠️ **`satisfies KeybindingDefinitions` KHÔNG bắt buộc đủ.** `keybindings.ts:55` → `export type KeybindingDefinitions = Record<string, KeybindingDefinition>;` — `Record<string, …>` không exhaustive. Thêm member vào interface mà quên entry trong bảng **vẫn typecheck**. Xem §5 cổng 1b.

### Bước 5 — Đăng ký chord mở overlay (2 chỗ, không phải 3)

*Neo đã kiểm — `packages/tui/src/app-keybindings.ts:26`*:
```ts
interface AppKeybindings {
```
*Đã đọc `app-keybindings.ts:64-71`* — member cuối dòng 64, dòng 68 là type alias, dòng 69-71 là **cầu nối kiểu quan trọng nhất của cả công việc**:
```ts
	"app.live.toggle": true;
}

/** Application action identifier registered alongside the base TUI keybindings. */
export type AppKeybinding = keyof AppKeybindings;

declare module "./keybindings" {
	interface Keybindings extends AppKeybindings {}
}
```
Dòng 69-71 là lý do `this.ctx.keybindings.matches(data, "app.transcript.search")` typecheck: augmentation đổ `AppKeybindings` vào `Keybindings`, mà `keybindings.ts:45` → `export type Keybinding = keyof Keybindings;`. **Không sửa dòng 68.**

*Neo đã kiểm — `packages/tui/src/app-keybindings.ts:236-239`*:
```ts
	"app.history.search": {
		defaultKeys: "ctrl+r",
		description: "Search history",
	},
```
Thêm ngay sau dòng 239 (trước `"app.stt.toggle"` ở dòng 240):
```ts
	"app.transcript.search": {
		defaultKeys: "ctrl+shift+f",
		description: "Search rendered transcript",
	},
```

*Đã đọc `app-keybindings.ts:86`* → `export const KEYBINDINGS = {` và `:248` → `} as const satisfies KeybindingDefinitions;` — cùng lưu ý không-exhaustive như bước 4.

### Bước 6 — Tạo `TranscriptSearchOverlay` (phần plan gọi "bước plan làm sai")

*Neo đã kiểm — `packages/tui/src/chat/chat-transcript-builder.ts:112`*:
```ts
	/** Discard all components and rebuild the whole transcript from `entries`. */
	rebuild(entries: TranscriptEntry[]): void {
```
*Đã đọc `chat-transcript-builder.ts:80`* → `readonly container = new TranscriptContainer();` — nên `this.#builder.container.children` đọc được từ ngoài overlay.

*Đã đọc `packages/tui/src/overlays/copy-selector.ts:101`* → `const INITIAL_ENTRIES = 600;` và `:494` → `function recentEntries(entries: TranscriptEntry[], limit: number): TranscriptEntry[] {`. Đây là cửa sổ mà W15 **phải bỏ qua**: nó replay đuôi, còn tìm kiếm cần toàn bộ branch → `builder.rebuild(entries)` với entries đầy đủ.

*Neo đã kiểm — `packages/tui/src/chat/transcript-outline.ts:80-93`* — hợp đồng identity-stable mà `#plainLines` dựa vào:
```ts
	rows(children: readonly Component[], width: number): Array<readonly string[]> {
		const columns: Array<readonly string[]> = [];
		for (const child of children) {
			const rows = child.render(width);
			const cached = this.#stripped.get(child);
			if (cached && cached.rows === rows) {
				columns.push(cached.stripped);
				continue;
			}
			const stripped = stripPromptZones(rows);
			this.#stripped.set(child, { rows, stripped });
			columns.push(stripped);
		}
		return columns;
	}
```
`cached.rows === rows` — so sánh **tham chiếu mảng**. Vì vậy `#plainLines` phải flatten ra một mảng phẳng mới, không được dùng `prepareOutline` / `renderOutlineRows` (nó cắt prompt zone và dịch cột).

*Neo đã kiểm — `packages/tui/src/chat/transcript-browser.ts:22-31`* — hợp đồng frame phải khớp chính xác:
```ts
export interface TranscriptBrowserBody {
	lines: readonly string[];
	anchor?: ScrollRangeAnchor;
}

/** One complete browser frame. Header and footer rows are inset by one column. */
export interface TranscriptBrowserFrame {
	header: readonly string[];
	body: TranscriptBrowserBody;
	footer: readonly string[];
}
```
*Neo đã kiểm — `packages/tui/src/chat/transcript-browser.ts:237`* — tô sáng **trong** frame callback là đúng:
```ts
		this.#scrollView.setLines(frame.body.lines);
```

*Neo đã kiểm — `packages/coding-agent/.../selector-controller.ts:1204-1206`* — nguồn entries:
```ts
	showCopySelector(): void {
		const entries = this.ctx.sessionManager.getBranch().filter(isTranscriptEntry);
		if (entries.length === 0) {
```
*Đã đọc `session-context.ts:213-214`* — `isTranscriptEntry` thật là:
```ts
export function isTranscriptEntry(entry: SessionEntry): entry is TranscriptEntry {
	return entry.type === "message" || entry.type === "custom_message";
}
```
(dòng 213 là signature, dòng 214 là body — kế hoạch ghi `:214` cho cả cái.)

*Đã đọc `packages/tui/src/overlays/copy-selector.ts:135-142`* — hình dạng `TranscriptBrowser`:
```ts
		this.#browser = new TranscriptBrowser({
			getHeight: () => this.deps.ui.terminal?.rows || process.stdout.rows || 40,
			frame: context => this.#frame(context.contentWidth),
		});
```

### Bước 7 — Scroll tới match

*Neo đã kiểm — `packages/tui/src/components/scroll-view.ts:50-56`* — **anchor là hàng, không phải ký tự**:
```ts
export interface ScrollRangeAnchor {
	id: string;
	start: number;
	end: number;
	margin?: number;
	alignment?: ViewportAlignment;
	mode?: "selection" | "once";
```
*Neo đã kiểm — `packages/coding-agent/.../selector-controller.ts:1249-1255`* — anchor hiện có:
```ts
		const overlayHandle = this.ctx.ui.showOverlay(selector, {
			anchor: "bottom-center",
			width: "100%",
			maxHeight: "100%",
			margin: 0,
			fullscreen: true,
		});
```
*Neo đã kiểm — `packages/tui/src/components/scroll-view.ts:267`*:
```ts
	setActiveRow(row: number | undefined, alignment: ViewportAlignment = "nearest"): void {
```
→ `body.anchor = { id: getTranscriptSearchMatchKey(matches[cursor]), start: first.row, end: last.row }`.

### Bước 8 — `showTranscriptSearch()` + 2 file bị bỏ sót

*Đã đọc `packages/coding-agent/src/modes/types.ts:476`*:
```ts
	showCopySelector(): void;
```
*Đã đọc `packages/coding-agent/src/modes/interactive-mode.ts:7116-7118`*:
```ts
	showCopySelector(): void {
		this.#selectorController.showCopySelector();
	}
```
Thêm cả hai. Bỏ trống thì `this.ctx.showTranscriptSearch()` ở input-controller **fail tsgo** — đây là lý do tệ nhất khi gõ: bạn sửa xong 9 file theo kế hoạch, chạy cổng 1, và nó đỏ ở một file không hề có trong danh sách.

### Bước 9 — Handler trong `#globalEditorActionsListener`

*Đã đọc `input-controller.ts:321-322`* — block guard:
```ts
		if (!this.#globalEditorActionsListenerInstalled) {
			this.#globalEditorActionsListenerInstalled = true;
```
> ⚠️ Kế hoạch ghi "block bắt đầu dòng 319". `:319` là `});` đóng listener trước; guard ở **:321**.

*Neo đã kiểm — `input-controller.ts:331`* (đúng, kế hoạch chỉ đúng chỗ này):
```ts
				if (this.ctx.keybindings.matches(data, "app.history.search")) {
```
*Neo đã kiểm — `input-controller.ts:332`*:
```ts
					if (this.ctx.ui.hasOverlay() || this.ctx.ui.getFocused() instanceof HistorySearchComponent) {
```
Chèn ngay sau dòng 337:
```ts
				if (this.ctx.keybindings.matches(data, "app.transcript.search")) {
					if (this.ctx.ui.hasOverlay()) return undefined;
					this.ctx.showTranscriptSearch();
					return { consume: true };
				}
```
Không self-guard `instanceof`: `showHistorySearch` đi qua `showSelector` (đổi editor slot, **không** tạo overlay — `selector-controller.ts:228-245`), còn W15 mount qua `showOverlay`, nên `hasOverlay()` đã phủ.

*Đã đọc `selector-controller.ts:228`* → `showSelector(create: (done: () => void) => { component: Component; focus: Component }): void {` và `:245` → `}` — xác nhận lý do bỏ self-guard.

### Bước 10 — Hotkeys + changelog

*Neo đã kiểm — `packages/tui/src/hotkeys-markdown.ts:79`*:
```ts
		`| \`${hotkeyLabel(bindings, "app.history.search")}\` | Search prompt history |`,
```
*Đã đọc `hotkeys-markdown.ts:15-16`*:
```ts
function hotkeyLabel(bindings: HotkeysMarkdownBindings, action: AppKeybinding): string {
	return bindings.keybindings.getDisplayString(action) || "Disabled";
}
```
`action: AppKeybinding` → dòng mới cũng là một cổng typecheck thứ (xem §5 cổng 1c).

*Đã đọc `packages/tui/CHANGELOG.md:3-5`* — `## [Unreleased]` rồi `## [18.4.0]`, **chưa có `### Added`**. *Đã đọc `packages/coding-agent/CHANGELOG.md:3-5`* — `## [Unreleased]` → `### Security` → `## [18.4.0]`, cũng chưa có `### Added`.

---

## 4. Hợp đồng test

File: `packages/tui/test/transcript-search.test.ts` (mới). Quy ước thư mục đã kiểm: `packages/tui/test/` có **222** file `*.test.ts` (kế hoạch ghi 235 — sai).

Không `mock.module`, không `not.toThrow()` trần, không source-grep.

| # | tên `it()` | dựng gì | khẳng định gì | **người dùng thấy gì nếu hồi quy** |
| --- | --- | --- | --- | --- |
| 1 | `findTranscriptSearchMatches` trả **một** match với **hai** segment khi query cắt qua ngắt dòng | buffer nhiều dòng, không render: `["alpha beta", "gamma delta"]`, query `"beta gamma"` | `matches.length === 1`; `segments.length === 2`; `segments[0]` = `{row:0, startCol:6, endCol:10}`, `segments[1]` = `{row:1, startCol:0, endCol:5}` | Thanh tìm đếm `1/1` đúng, viewport nhảy đúng, nhưng highlight vẽ đè lên `"alpha"` và `"delta"` |
| 2 | match ở dòng sau nhận `row` của dòng đó, không phải dòng 0 | buffer dài ≥ 5 dòng, query chỉ xuất hiện ở dòng 3 | `segments.every(s => s.row === 3)`; `startCol` tính từ đầu dòng 3 | Highlight nhảy lên dòng 0 (đầu buffer) — người dùng thấy text được tô ở chỗ không có match |
| 3 | `changed: false` khi truy vấn lại y hệt; `changed: true` + match mới khi buffer thêm dòng | `TranscriptSearchIndex` chạy thẳng: search → thêm 1 dòng có match → search lại → search lại buffer cũ? không: search lại buffer mới **cùng query** | lần 1 `changed === true`; sau khi append `changed === true` và match mới xuất hiện; search lại buffer mới, cùng query → `changed === false` | Mỗi lần gõ phím overlay re-render lại 200k dòng; gõ xong lag, phím Enter cảm giác "dính" |
| 4 | điều hướng vòng qua cả hai đầu | 3 match, `next` từ index 2, `previous` từ index 0 | `next(2) === 0`; `previous(0) === 2` | Bấm `Enter` ở match cuối → thanh tìm nhảy `0/3` thay vì `1/3` |
| 5 | query không khớp trả `[]`, thanh tìm in `"No matches"` | query `"zzzz"` trên buffer có text | `findTranscriptSearchMatches(lines, "zzzz")` **bằng** `[]`; `getTranscriptSearchMatchKey` trên mảng rỗng trả `""`; render bar cho `"No matches"` | Highlight path `matches[cursor].segments[0]` ném `undefined` → crash overlay mỗi lần gõ chữ không có trong transcript |
| 6 | index trên 5.000 dòng trả đúng **một** match, các segment chỉ chạm dòng chứa text | 5.000 dòng, đúng một lần xuất hiện của `"needle"` | `matches.length === 1`; `segments.every(s => s.row >= 0 && s.row < 5000)`; và `mọi row trong segments phải thuộc tập row thực sự chứa "needle"` | Ai thay fast path index-theo-run bằng rebuild per-cell → index thành O(rows × cells), mỗi lần gõ kéo dài giây |

Không test có chủ ý: layout pixel của thanh tìm, chord, cách mount overlay — đó là wiring, và AGENTS.md cấm test khẳng định constructor chép lại fixture.

---

## 5. Cổng

### Cổng 0 (mới, chặn) — không có source nào của `AltScreenSearch` còn sót

```bash
rg -n "AltScreenSearch" packages/     # kỳ vọng: 0 hit
```
Đỏ được bằng cách: port sót một identifier `AltScreenSearch*`. Không có cổng này thì tên cũ lọt vào file mới và người đọc sau không biết đó là gì.

### Cổng 1 — registry (thật, đỏ rất cụ thể)

```bash
bun run --cwd=packages/tui check && bun run --cwd=packages/coding-agent check:types
```

**Có đỏ được không — CÓ, và tôi đã truy ngược lý do chứ không tin kế hoạch:**

*Neo đã kiểm — `packages/coding-agent/src/modes/controllers/input-controller.ts:13`*
```ts
import { formatDoubleTap } from "@oh-my-pi/pi-tui/app-keybindings";
```
Dòng import này kéo `app-keybindings.ts` vào type graph, kích hoạt augmentation ở `app-keybindings.ts:69-71` (`interface Keybindings extends AppKeybindings {}`). `KeybindingsManager` của app (`app-keybindings.ts:579` → `export class KeybindingsManager extends TuiKeybindingsManager {`) **không override `matches`**, nên nó dùng `keybindings.ts:293`:

*Neo đã kiểm — `packages/tui/src/keybindings.ts:293`*
```ts
	matches(data: string, keybinding: Keybinding): boolean {
```

Nếu xoá `"app.transcript.search": true;` khỏi `interface AppKeybindings`, `"app.transcript.search"` biến mất khỏi `keyof Keybindings` → **TS2345 Argument of type '"app.transcript.search"' is not assignable to parameter of type 'Keybinding'** tại `input-controller.ts` dòng call site. Cụ thể, đúng chỗ. Đỏ thật.

**Cổng 1b — KHÔNG có cổng nào bắt chiều ngược lại.** `keybindings.ts:55` → `export type KeybindingDefinitions = Record<string, KeybindingDefinition>;`. `Record<string, …>` không exhaustive, nên thêm member vào `interface AppKeybindings` mà **quên** entry trong `KEYBINDINGS` **vẫn exit 0**. Người dùng bấm `Ctrl+Shift+F`, không có gì xảy ra, không có lỗi ở đâu. → kiểm thủ công: `rg -c '"app.transcript.search"' packages/tui/src/app-keybindings.ts` phải trả **2** (interface + bảng), không phải 1.

**Cổng 1c — cổng thứ, không nằm trong kế hoạch, nhưng thật.** `packages/tui/src/hotkeys-markdown.ts:15` → `action: AppKeybinding`. Nếu bỏ dòng hotkey mà vẫn có binding thì không sao; nhưng nếu thêm binding mà bỏ dòng hotkey thì cũng không đỏ. Chiều ngược lại: thêm dòng hotkey mà quên member interface → TS2345 tại `hotkeys-markdown.ts`. Nên `rg -c '"app.transcript.search"' packages/coding-agent/src packages/tui/src` phải trả **3** (types.ts không chứa chuỗi này).

### Cổng 2 — lint + format + types (thật, xanh sẵn)

```bash
bun run --cwd=packages/tui check
bun run --cwd=packages/coding-agent check:types
```

Đã chạy ở HEAD, cả hai exit 0. Bắt được: `getGraphemeSegmenter` còn sót, `new Input({...})`, `render(): string[]` thay vì `readonly string[]`, `private` chưa đổi thành `#field`, `tsgo` bắt 2 file bị bỏ sót ở bước 8.

### Cổng 3 — test (THẬT, VÀ ĐANG XANH)

```bash
bun test packages/tui/test/transcript-search.test.ts
```

> **Sửa kế hoạch.** Kế hoạch viết: *"BỊ CHẶN Ở HEAD — 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64`… Phải build addon trước bằng `bun --cwd=packages/natives run build`"*, và kết luận *"W15 là type-complete, test-pending"*. **Điều đó sai ở HEAD `65cc6c1`.**

Đo thật:
```
$ bun test packages/tui/test/scroll-view.test.ts                       → 13 pass / 0 fail
$ bun test packages/tui/test/keybindings.test.ts packages/tui/test/input.test.ts  → 28 pass / 0 fail
$ bun test packages/tui/test/render-utils.test.ts packages/tui/test/autocomplete.test.ts  → 119 pass / 0 fail
```
Hai file cuối **có** `import … "@oh-my-pi/pi-natives"` — nên addon được load thành công. Không cần Ninja, không cần build native.

**Cổng này có đỏ được không — CÓ, rất cụ thể:** đỏ ở từng `it()` của §4, theo đúng cột "người dùng thấy gì". Đặc biệt `it()` #1 đỏ nếu ai đó bỏ nhánh `linearColumns` ở `pi:129-131` (highlight vẽ đè lên từ khác), và `it()` #6 đỏ nếu ai đó thay fast path index-theo-run bằng rebuild per-cell.

**Không chạy** `brew install ninja`, không chạy `bun --cwd=packages/natives run build`, không đánh dấu W15 là `test-pending`.

---

## 6. Cạm bẫy riêng của W15

1. **Cây thật không có `ScrollView` sau transcript sống.** Kế hoạch gốc nói "rendered line buffer thuộc `packages/tui/src/components/scroll-view.ts`" — sai. *Neo đã kiểm — `packages/tui/src/chrome/transcript-container.ts:150`*: `export class TranscriptContainer extends Container {`; *đã đọc `interactive-mode.ts:879`*: `chatContainer: TranscriptContainer;`. Nó đẩy block đã xong vào scrollback **native** của terminal và gỡ khỏi `.children`. Tin kế hoạch → ship tính năng âm thầm bỏ qua mọi thứ ngoài screenful cuối. Đây là bẫy đắt nhất; đã sửa trong kế hoạch này.

2. **Hai file bị bỏ sót, và cổng 1 đỏ ở đó chứ không ở chỗ bạn nghĩ.** `modes/types.ts:476` + `interactive-mode.ts:7116`. Sửa 9 file đúng như kế hoạch rồi chạy cổng 1 → TS2339/TS2741 ở file không có trong danh sách.

3. **`satisfies Record<string, …>` không bắt thiếu entry.** Đã nêu ở cổng 1b. Đây là loại lỗi **xanh toàn bộ cổng** — nguy hiểm hơn hẳn lỗi đỏ. Phải đếm bằng `rg -c` thủ công.

4. **`private` → `#field`, không phải `private`.** 6 field của `AltScreenSearchComponent` đều là `private` trong pi. AGENTS.md cấm keyword `private` trên field. Sửa 3 tên còn sót là oxfmt/oxlint không bắt được, chỉ có review.

5. **Bỏ `ctrl+g` mang theo từ pi.** Pi mặc định `["enter","ctrl+g"]` / `["shift+enter","ctrl+shift+g"]` (*đã đọc `pi-ref/packages/tui/src/keybindings.ts:196-207`*). `ctrl+g` đã bị `app.editor.external` chiếm và còn 3 chỗ nữa. Mang sang = phá external editor của người dùng. Đây là hồi quy **không test nào bắt được** vì nó nằm ở tầng binding, không ở tầng index.

6. **`this.#input.prompt = "Find: "` phải set SAU `new Input()`.** Không có constructor options. Set trước khi gán sẽ ghi đè bằng `"> "`.

7. **Phải flatten ra mảng phẳng mới, không dùng `prepareOutline`/`renderOutlineRows`.** Chúng cắt prompt zone và dịch cột — toàn bộ phép map match → `(row, startCol)` dựa vào cột tuyệt đối. Dùng chúng là highlight lệch cột. `#plainLines` mới đúng, và identity-stable vì `transcript-outline.ts:80-93` đang dựa vào đúng tính chất đó.

8. **`body.anchor` là `{id, start, end}` với `start`/`end` là CHỈ SỐ HÀNG** (`scroll-view.ts:50-56`), không phải ký tự, không phải chỉ số phẳng của mảng đã highlight. Truyền `endCol` vào `end` sẽ revealRange tới hàng 250 trên một buffer 20 dòng.

---

## 7. Bảng neo hỏng

| neo trong kế hoạch | kế hoạch nói | thực tế tại `65cc6c1` | verdict |
| --- | --- | --- | --- |
| `packages/coding-agent/src/modes/controllers/input-controller.ts:19` | "import ở `:19` đúng và còn hiện hành" (Đính chính, dòng nói đây là import `HistorySearchComponent`) | `:19` = `import { AssistantMessageComponent } from "@oh-my-pi/pi-tui/chat/assistant-message";`. Import `HistorySearchComponent` ở **`:21`** | `stale-anchor`, lệch 2 |
| `packages/coding-agent/src/modes/controllers/input-controller.ts:319` | "block `#globalEditorActionsListener` bắt đầu dòng 319" | `:319` = `});` đóng listener trước. Guard `if (!this.#globalEditorActionsListenerInstalled) {` ở **`:321`**, install ở `:322` | `stale-anchor`, lệch 2 |
| `packages/coding-agent/src/modes/controllers/selector-controller.ts:92` | "import `HistorySearchComponent` ở `:92`" | `:92` = `import { listLiveToolRecords, liveToolRecordFromSession } from "@oh-my-pi/pi-tui/overlays/extensions/live-tool-session";`. Import `HistorySearchComponent` ở **`:94`** | `stale-anchor`, lệch 2 |
| `packages/tui/src/keybindings.ts:43` | "member cuối `tui.select.cancel` ở dòng 43" | `:42` = `"tui.select.cancel": true;`. `:43` = `}` đóng interface | `stale-anchor`, lệch 1 |
| `packages/tui/src/keybindings.ts:186` | neo của bước 0 (kiểm chord trống) | `:186` = `const code = key.charCodeAt(0);` trong `isAsciiUppercaseLetter` — không liên quan | `irrelevant-anchor` |
| `packages/coding-agent/src/session/session-context.ts:214` | "`isTranscriptEntry` nằm ở `:214`" | `:213` = signature `export function isTranscriptEntry(…)`, `:214` = dòng `return entry.type === …` | `off-by-one` (nhẹ — vẫn dùng được) |
| bảng "File cần chạm tới" | `packages/tui/test/` "chứa 235 file `*.test.ts`" | `ls packages/tui/test/*.test.ts \| wc -l` = **222** | `wrong-count` |
| mục "Cổng hoàn thành" cổng 3 | "BỊ CHẶN Ở HEAD — 0 pass / 1 fail, `Failed to load pi_natives native addon`"; "tracker nên coi W15 là type-complete, test-pending" | `bun test` trên `packages/tui` **xanh** (13 / 28 / 119 pass), kể cả 2 file có import `@oh-my-pi/pi-natives` | **`wrong`** — nguy hiểm nhất: sai này thì cả sprint ghi W15 là `test-pending` |
| mục "Đính chính" dòng cuối | "HEAD thực tế là `ecd516f`" | `git rev-parse --short HEAD` = **`65cc6c1`**, branch `milestone-1` | `stale` (đã trôi) |
| bảng "File cần chạm tới" | không liệt kê | `packages/coding-agent/src/modes/types.ts` và `packages/coding-agent/src/modes/interactive-mode.ts` **bắt buộc** cho `this.ctx.showTranscriptSearch()` | `omission` |

### Xác nhận những thứ kế hoạch nói ĐÚNG (đã mở đọc, không phải tin)

`pi-ref` HEAD `d6af72e18`, `alt-screen-search.ts` 327 dòng · `PRINTABLE_ASCII` ở `:32` · `buildSearchCorpus` ở `:34` · loop 47-78 · `linearColumns` trên **cả hai** nhánh · `findAltScreenSearchMatches` `:186` · `getAltScreenSearchMatchKey` `:191` · class `:197` · `formatKey` `:263-272` · `getGraphemeSegmenter` import ở `:4` · `pi` keybindings `:196-207` default `["enter","ctrl+g"]` / `["shift+enter","ctrl+shift+g"]` · `getGraphemeSegmenter` **0 hit** trong `packages/` · `utils.ts:226/:318/:388` · `key-hint-format.ts:114` · `input.ts:53` không constructor, không placeholder · `tui.ts:241` `readonly string[]` · `chat-transcript-builder.ts:112` `rebuild(entries)` · `transcript-browser.ts:237` `setLines(frame.body.lines)` · `transcript-outline.ts:80-93` identity-stable · `scroll-view.ts:267` `setActiveRow` · `transcript-container.ts:150` · `interactive-mode.ts:879` `chatContainer: TranscriptContainer` · `.oxlintrc.json:26` no-non-null-assertion off · `keys.ts:544` là doc comment chứa `alt+x` · `grep -c overlays packages/tui/src/index.ts` = **0** · subpath `@oh-my-pi/pi-tui/overlays/*` resolve được qua wildcard `"./*"` ở `packages/tui/package.json:94-97` (và đã dùng sẵn ở `input-controller.ts:21`) · `selector-controller.ts:1204/1205/1206/1217-1226/1249-1255` · `input-controller.ts:331-337/332` · `app-keybindings.ts:26/64/68/86/236-239` · `keybindings.ts:7/45/58/293` · `hotkeys-markdown.ts:79` · `app-keybindings.ts:141` `ctrl+g` của `app.editor.external` · `cổng 1` (module augmentation `app-keybindings.ts:69-71` + `matches` ở `keybindings.ts:293` không bị override) là cổng đỏ thật.

---

## 8. Sai lệch so với kế hoạch mà kỹ sư phải biết

| claim của kế hoạch | verdict | correction |
| --- | --- | --- |
| Effort "M cho phần port" | `understated` | Port đúng 327 dòng, nhưng `TranscriptSearchOverlay` **không có trong pi**. Đó là thiết kế mới: flatten line buffer, tô sáng, quản lý con trỏ match, cuộn. M+ là đúng |
| "Hai chỗ sửa trong `app-keybindings.ts`, không phải ba" | `correct` | Đã xác nhận: `app-keybindings.ts:68` tự suy ra |
| "Cổng 3 bị chặn, W15 là type-pending" | **`wrong`** | Đo thật §5 cổng 3 |
| "235 file test" | `wrong-count` | 222 |
| Danh sách file cần chạm tới | `incomplete` | Thiếu `modes/types.ts` + `interactive-mode.ts` |
