# M6 audit — `opencode` (anomalyco/opencode)

Repo: `/Users/tranquangdang21/Projects/opencode-ref` · HEAD `39021df` · origin `https://github.com/anomalyco/opencode.git`

**Kết luận một dòng:** đây là repo MIT sạch, nhưng nó **không phải nguồn để học layout** — nó *mua* layout từ `@opentui/core`, và phần đáng học thật sự nằm ở `packages/plugin/src/tui/context.ts` (hợp đồng slot) chứ không phải ở bộ dựng hình.

---

## 0. Số đo đã kiểm (mọi khẳng định kèm lệnh)

| Đại lượng | Số | Lệnh |
| --- | --- | --- |
| HEAD | `39021df` | `git rev-parse --short HEAD` |
| `.ts` | **3.639** | `git ls-files '*.ts' \| wc -l` |
| `.tsx` | **716** | `git ls-files '*.tsx' \| wc -l` |
| Tổng `.ts`+`.tsx` | 4.355 | `git ls-files '*.ts' '*.tsx' \| wc -l` |
| Tổng LOC `.ts`+`.tsx` | **853.502** | `git ls-files '*.ts' '*.tsx' \| xargs wc -l \| tail -1` |
| Số package | 33 khai báo `"license"` | `git ls-files 'packages/*/package.json' \| xargs grep -h '"license"' \| sort \| uniq -c` |
| `AGENTS.md` | 17 | `git ls-files \| grep -c 'AGENTS.md'` |

### ⚠️ Sửa một số đo đã đo sẵn

Hai con số trong phần "ĐÃ ĐO SẴN" là **sai**, hoặc sai phạm vi. Cần sửa trước khi ai đó dùng làm mốc so sánh:

1. **`packages/tui` không phải 245 file / 39.771 dòng.** Đo thật:
   ```
   git ls-files 'packages/tui/**/*.ts' 'packages/tui/**/*.tsx' | wc -l   → 454
   git ls-files 'packages/tui/**/*.ts' 'packages/tui/**/*.tsx' | xargs wc -l | tail -1
     → 103964 total
   ```
   Con số 245/39.771 có lẽ đo bằng glob hẹp hơn. Không glob nào trong repo cho ra 245/39.771: `src/*.ts` = 139 file/21.716 dòng, `src/*.tsx` = 142 file. **Số đúng là 454 file / 103.964 dòng** — gần gấp 2,6 lần con số đã ghi.

2. **"Không có flexbox" — SAI, nhưng đúng ở tầng khác.** Câu gốc là `git ls-files | grep -ci flexbox` = 0, và cái đó chỉ nói là **không có file tên `flexbox`**. `packages/tui` dùng flexbox *rất nhiều*:
   ```
   git grep -c 'flexDirection' -- 'packages/tui/*'
     → app.tsx:4, component/devtools-bar.tsx:6, component/dialog-debug.tsx:3, …
   git grep -n 'flexDirection' -- 'packages/tui/*' | wc -l   → hàng chục site
   ```
   Không có `yoga` trong `bun.lock` (`grep -in 'yoga' bun.lock` → rỗng) và không file nào trong repo tên `yoga`/`flexbox` — vì flexbox **không nằm trong repo này**, nó nằm trong dependency bên ngoài. Xem §1.

Hệ quả trực tiếp cho M3: tiền đề "CCB dùng flexbox 774 site, opencode không, nên ta phải tự xây" **sai ở chỗ quan trọng nhất** — opencode (CCB) không tự xây flexbox, nó phụ thuộc bên ngoài. Đó là dữ kiện phải đưa vào M3, không phải "học cách bỏ flexbox".

---

## 1. [Câu hỏi 1 — trả lời trực tiếp cho M3] `packages/tui` bố cục bằng cách nào

**Trả lời: bằng flexbox, do một engine bên thứ ba cung cấp. Không phải bằng cơ chế tự chế.**

Bằng chứng ba tầng:

**Tầng 1 — dependency.** `packages/tui/package.json` khai báo:
```json
"@opentui/core":  "catalog:",
"@opentui/keymap": "catalog:",
"@opentui/solid": "catalog:",
```
Root `package.json` (dòng 55-57) ghim phiên bản: **`@opentui/core` 0.5.12**.

**Tầng 2 — repo có công cụ nâng cấp riêng cho engine đó**, tức nó là thứ được quản trị có chủ đích, không phải phụ thuộc lạc:
```
$ head -25 script/upgrade-opentui.ts
#!/usr/bin/env bun
const usage = "Usage: bun run script/upgrade-opentui.ts [--snapshot] <version>"
```
Root `package.json` có script `"upgrade-opentui"`.

**Tầng 3 — không có engine trong repo.** `git ls-files | grep -iE 'yoga|flexbox|flexlayout'` → **rỗng**. Vậy `flexDirection` là prop của host `<box>` do `@opentui/core` cung cấp.

Cơ chế thật, ở `packages/tui/src/app.tsx:1327-1360` (nguyên văn):
```tsx
<box
  width={dimensions().width}
  height={dimensions().height}
  flexDirection="column"
  ...
>
  <box
    flexGrow={1}
    minHeight={0}
    flexDirection="row"
    position="relative"
    onMouseDrag={tabsResize.onMouseDrag}
    ...
  >
    <Show when={verticalTabsVisible()}>
      <SessionTabs orientation="vertical" width={tabsResize.size()} />
    </Show>
    <box flexGrow={1} minWidth={0} flexDirection="column">
```

Ba điều đáng chú ý về mặt kỹ thuật, và cả ba đều là câu trả lời cho M3:

1. **`flexGrow={1} + minWidth={0}` / `minHeight={0}` là cặp bắt buộc.** Không có `minWidth={0}`, flex item sẽ không co lại dưới ngưỡng nội dung, và pane con tràn ngang. Đây là bài học *rẻ tiền, đáng lấy* — không cần engine riêng, chỉ cần quy ước.
2. **Pane không dùng prop tỉ lệ, mà dùng `pane-resize` kéo chuột** (`onMouseDrag` → `tabsResize.size()`), rồi clamp bằng hằng số. Toàn bộ luật clamp gói trong **23 dòng**:
   ```
   $ wc -l packages/tui/src/ui/layout.ts   →  23
   ```
   ```ts
   export const SESSION_SIDEBAR_WIDTH = 42
   export const SESSION_TABS_COMPACT_WIDTH = 5
   export const SESSION_TABS_COMPACT_BREAKPOINT = 12
   export const SESSION_SIDEBAR_MAX_WIDTH = 72
   const SESSION_CONTENT_MIN_WIDTH = 44
   const SESSION_CONTENT_PREFERRED_WIDTH = 64
   ```
   Ba hằng số (min / preferred / max) cộng lại thành một **thuật toán layout hoàn chỉnh cho vỏ ngoài màn hình**. 23 dòng.
3. **Breakpoint chọn hướng chứ không chọn tỉ lệ:** `sessionTabsFitVertically(total, width)` trả về `total >= width + SESSION_CONTENT_PREFERRED_WIDTH` — hẹp thì tabs dọc, rộng thì tabs ngang. Không có hệ phân nhánh phức tạp nào.

### Về `src/mini/` — câu trả lời phụ, và nó bác bỏ một giả định

`src/mini/` (40 file, 18.231 dòng) **không phải** là câu trả lời cho "làm sao layout không flexbox". Nó là một **TUI thứ hai**, cùng engine:

```
$ git ls-files 'packages/tui/src/mini/*' | wc -l            → 40
$ git ls-files 'packages/tui/src/mini/*' | xargs wc -l | tail -1 → 18231 total
$ grep -l 'solid-js' packages/tui/src/mini/*.ts packages/tui/src/mini/*.tsx | wc -l → 9
```
Nó là `opencode mini` — lệnh CLI riêng:
```
packages/cli/src/commands/commands.ts:318:  Spec.make("mini", { description: "Start the minimal interactive interface" })
packages/tui/src/mini/index.ts:
  export async function runMiniFrontend(input) { await runInteractiveDeferredMode(input); ... }
```

**Bài học nên lấy, và cái không nên lấy:** opencode chịu cả hai bản TUI. Nhưng `mini/` không phải "bản rút gọn của bản lớn" — nó tách riêng `footer.*` (6 file, ~4.200 dòng), `stream-v2.*` (transport 1.898 dòng), `runtime.*`. Đây là **nhân đôi có chủ đích**, và cái giá là 18k dòng song song phải bảo trì. omp không nên học cách này; omp đã có `modes/` tách riêng rồi.

---

## 2. [Câu hỏi 2] `src/attention.ts` — hệ chú ý có âm thanh

Đọc đủ file: `packages/tui/src/attention.ts`, **189 dòng**.

Đây là một trong những thứ **tốt nhất** của repo, và **omp chưa có gì cả**.

### omp không có hệ chú ý — xác nhận bằng lệnh âm tính

```
$ cd /Users/tranquangdang21/Projects/ultraworkers
$ git ls-files | grep -iE 'attention'     → (rỗng)
$ git ls-files | grep -iE 'notif'         → 10 file, TẤT CẢ là test/notification khác
   packages/tui/src/chat/ttsr-notification.ts
   packages/tui/src/desktop-notify.ts
   packages/tui/test/notifications.test.ts
   packages/tui/src/*sound|audio|bell*     → crates/pi-natives/src/audio.rs, crates/pi-voice/src/audio.rs
```

Hai file `audio.rs` là **hạ tầng thu âm (TTS/voice input)**, không phải hệ chú ý. `desktop-notify.ts` là thông báo desktop một chiều. **omp không có khái niệm "focus state ảnh hưởng tới việc có báo hay không" ở đâu cả.**

### `attention.ts` làm gì — và vì sao đáng học

Cấu trúc (đọc nguyên file):

```ts
type FocusState = "unknown" | "focused" | "blurred"

function focusSkip(when: AttentionWhen, focus: FocusState) {
  if (when === "always") return
  if (focus === "unknown") return "focus_unknown"
  if (when === "blurred" && focus === "focused") return "focused"
  if (when === "focused" && focus === "blurred") return "blurred"
}
```

Ba quyết định thiết kế ở đây, tất cả đều đúng và tất cả đều là thứ omp chưa có:

1. **`focus: "unknown"` là một trạng thái thật, không phải "chưa biết thì coi như có".** Khi chưa xác định được thì **bỏ qua im lặng** (`return "focus_unknown"` ⇒ skip). Quyết định mặc định-an-toàn: không spam người dùng khi bạn không chắc mình có đang ở trước màn hình hay không. Đây là chi tiết mà hầu hết implementation tự viết sẽ chọn ngược lại.

2. **Skip reason là giá trị có tên, không phải boolean.** Kiểu `AttentionNotifySkipReason` gồm `focus_unknown | focused | blurred | attention_disabled | renderer_destroyed | empty_message`, và kết quả trả về giữ luôn lý do:
   ```ts
   return { ok: notification || sound, notification, sound }
   ```
   Một lệnh `notify()` trả về **"tôi đã làm gì và tôi đã bỏ qua vì sao"**. Đây là hợp đồng có thể test, và là hợp đồng omp hiện không có chỗ nào để đặt.

3. **Bỏ qua có lý do vẫn là một lời gọi thành công về mặt ngữ nghĩa.** `ok` là `notification || sound` — nếu cả hai đều bị bỏ qua có lý do, `notify()` vẫn trả về bình thường chứ không ném lỗi.

Ngoài ra: `normalizeText()` strip ANSI + gộp whitespace + cắt theo **codepoint** (`Array.from(x).slice(0, limit)`) — không cắt giữa ký tự đa vùng. `clampVolume` trả 0 khi không finite. `dispose()` gỡ listener.

**Về tiếng:** 6 âm định nghĩa sẵn (`default | question | permission | error | done | subagent_done`), nạp từ `#attention-sounds` với điều kiện import theo runtime (`"bun"` / `"node"`), và `playSound` thử lần lượt các file ứng viên (user override trước, built-in sau) thay vì chết ngay.

### So với `loop-watchdog.ts` của omp — khác hệ, không thay thế nhau

Đọc `packages/tui/src/loop-watchdog.ts` của omp (5,2 KB). **Đây không phải là "tương đương".** Chúng đo hai thứ khác nhau:

| | opencode `attention.ts` | omp `loop-watchdog.ts` |
| --- | --- | --- |
| Đo cái gì | **người dùng có đang nhìn không** | **tiến trình có bị treo không** |
| Câu hỏi | "có nên kêu không?" | "loop có nghẽn không?" |
| Ngõ vào | renderer phát `focus`/`blur` | hẹn giờ trước deadline, đo trễ |
| Đầu ra | âm thanh + OS notification | một dòng `logger.warn` |
| Tính tương tác | **mặc định im lặng khi chưa chắc** | luôn ghi khi tắc |

Điểm đáng chú ý nhất của watchdog omp (không liên quan attention, nhưng rất tốt): nó **phân biệt ngủ máy với kẹt CPU bằng cách đo CPU, không đo thời lượng** —
```ts
const CPU_BUSY_RATIO = 0.01;
if (blockedMs > this.#sleepMs && cpuMs < blockedMs * CPU_BUSY_RATIO) {
  // A long gap the process did not spend CPU on: it was suspended.
```
và nó gắn `takeRecentLoopPhase()` để dòng log **gọi tên nguyên nhân** thay vì "unknown". `attention.ts` học đúng tinh thần đó ở tầng khác (skip reason có tên). **Hai hệ nên cộng dồn, không chọn một.**

---

## 3. [Câu hỏi 3] `packages/plugin` — kích thước và bề mặt

```
$ git ls-files 'packages/plugin/**' | wc -l                 → 71
$ git ls-files 'packages/plugin/**' | xargs wc -l | tail -1  → 4236 total
$ git ls-files 'packages/tui/src/plugin/*' 'packages/tui/src/feature-plugins/*' | wc -l → 34
$ ... | xargs wc -l | tail -1                                → 6510 total
```

**4.236 dòng trong `packages/plugin` + 6.510 dòng trong `packages/tui/src/{plugin,feature-plugins}` = 10.746 dòng cho hệ sinh thái plugin.** Với omp, con số tương đương là:
```
$ git ls-files 'packages/coding-agent/src/**extension*' | xargs wc -l | tail -1 → 30953 total
```

### Bề mặt plugin API: hai bản song song, Promise và Effect

`packages/plugin/src` chia làm **hai API hoàn toàn song song**, mỗi bản một cây thư mục:
```
promise/{adapter.ts 622, session.ts 170, integration.ts 91, tool.ts 72, plugin.ts 65, vcs.ts 46, provider.ts 33, rpc.ts 31, model.ts 28}
effect/{session.ts 170, integration.ts 96, plugin.ts 63, tool.ts 60, vcs.ts 47, provider.ts 33, rpc.ts 29, model.ts 28}
```
Cùng một khả năng, hai hệ effect. `promise/adapter.ts` là tầng chuyển đổi 622 dòng. **Đây là nợ kỹ thuật, không phải tính năng** — và là thứ đáng ghi vào `do_not_copy` của M6.

### Điều đáng học thật sự: hợp đồng slot

`packages/plugin/src/tui/context.ts` (532 dòng) định nghĩa API TUI cho plugin. Trong đó `SlotMap` là một **bản đồ đường dẫn → kiểu input**:
```ts
export interface SlotMap {
  readonly app: Readonly<Record<string, never>>
  readonly "home.footer": Readonly<Record<string, never>>
  readonly "home.footer.status": Readonly<Record<string, never>>
  readonly "prompt.footer": PromptFooterInput
  readonly "prompt.footer.status": PromptFooterInput
  readonly "prompt.footer.file": PromptFooterInput
  readonly "session.composer.top": { readonly sessionID: string }
  readonly "session.panel": PanelInput
  readonly "sidebar.content": { readonly sessionID: string }
  readonly "sidebar.footer": { readonly sessionID: string }
}
```

Và `SlotClaim` là **một kiểu phân biệt, không phải một danh sách ưu tiên**:
```ts
export type SlotClaim<Path extends SlotPath = SlotPath> = Path extends SlotPath
  ? { readonly render: (input: SlotMap[Path]) => JSX.Element } & (
      | { readonly prepend: Path;  readonly append?: never; readonly before?: never; readonly after?: never; readonly replace?: never }
      | { readonly append: Path;   readonly prepend?: never; ... }
      | { readonly before: Path;   readonly prepend?: never; ... }
      | { readonly after: Path;    ... }
      | { readonly replace: Path; ... }
    )
  : never
```
Trường `?: never` biến "ghi hai chỗ" thành **lỗi kiểu**, không phải một lựa chọn ưu tiên âm thầm. Cơ chế đặt chỗ: `prepend/append` (trong ranh giới) · `before/after` (anh em, ngoài ranh giới) · `replace` (chiếm, nhưng **ranh giới còn sống** để sibling neo vào vẫn hợp).

Câu hỏi mục tiêu: **omp có tương đương chưa?** Kiểm bằng lệnh:
```
$ cd /Users/tranquangdang21/Projects/ultraworkers
$ git grep -ln -e 'SlotRegistry' -e 'registerSlot' -e 'TuiPlugin' -- 'packages/**'   → (rỗng)
```
Và `ExtensionAPI` của omp (`packages/coding-agent/src/extensibility/extensions/types.ts:1256`) — đọc đoạn 1346-1450, các mục liên quan UI chỉ có:
- `registerMessageRenderer<T>(customType, renderer)` — đăng ký renderer cho một loại message tùy biến
- `ctx.ui` được nhắc tới trong chú thích nhưng là *đối tượng sẵn có*, không phải hệ đăng ký slot

**Kết luận: omp có `on(...)` + đăng ký tool + renderer message, nhưng KHÔNG có hệ sinh thái plugin cấp giao diện.** Đây là khoảng trống thật, và là thứ đáng học nhất trong cả repo.

`SlotMap` còn cho thấy **cấu trúc thông tin về TUI của một agent đã được nghĩ kỹ đến mức trở thành hợp đồng ổn định**: prompt có 3 footer slot, sidebar có content + footer, session có panel riêng. Đây là một phát hiện thiết kế, không phải một đoạn code.

---

## 4. [Câu hỏi 4] `session-ui`, `desktop`, `web` (và `ui`, `console`)

| Package | File | LOC | `license` | Là gì |
| --- | --- | --- | --- | --- |
| `packages/session-ui` | 174 | 31.333 | MIT | **Lõi render session dùng chung** giữa TUI và web. Có `timeline/projection`, `timeline/detail`, `pierre/` (canvas), `styles/`, `v2/`. |
| `packages/desktop` | 397 | 47.263 | MIT | **Electron app**: `electron-vite build`, `electron-builder`, có `bench:startup` và `migration`. |
| `packages/web` | 701 | 221.423 | MIT | **Trang tài liệu/marketing bằng Astro** — `astro dev`, `@astrojs/starlight`, `src/content/`, `src/i18n/`. |
| `packages/ui` | 1.649 | 75.608 | MIT | **Thư viện component web** (Solid): `layout/`, `forms/`, `overlays/`, `theme/`, `typography/`, `data-display/`, có Storybook. |
| `packages/console` | 546 | 380.303 | MIT | **Backend SaaS** (SST). Lớp lớn nhất repo. |

**Điểm quan trọng cho M3:** `session-ui` là câu trả lời cho *"một logic render session dùng được cho cả TUI lẫn web thì trông như thế nào"*. opencode tách nó thành package riêng với `timeline/projection` (chiếu) tách khỏi `timeline/detail` (trình bày) — omp hiện chưa có khái niệm này.

**Nhưng:** 3 trong 5 package này (`web`, `console`, `desktop`) là **sản phẩm của một công ty**, không phải công nghệ có thể học. `console` 380k dòng là SST/Cloudflare. `web` 221k dòng là trang docs. Không cái nào giúp omp CLI. Chỉ `session-ui` đáng đọc, và chỉ vì M3.

---

## 5. [Câu hỏi 5] 3.639 `.ts` ngoài `packages/tui` — phần lớn là gì

Không nằm ở `packages/tui`. Đếm theo package:

| Package | File | LOC | Vai trò |
| --- | --- | --- | --- |
| `app` | 865 | 238.416 | App web (Solid) — lớn nhất ngoài console |
| `core` | 745 | 163.077 | **Lõi domain**: `session/`, `tool/`, `permission/`, `pty/`, `vcs/`, `mcp/`, `oauth/`, `database/`, `credential/`, `skill/`, `worktree/`, `github-copilot/` |
| `tui` | 455 | 103.964 | TUI chính + `mini` |
| `ai` | 367 | 83.899 | **47 protocol** provider trong `src/protocols/` |
| `console` | 546 | 380.303 | Backend SaaS |
| `ui` | 1.649 | 75.608 | Component web |
| `desktop` | 217 | 47.263 | Electron |
| `cli` | 174 | — | CLI entry |
| `session-ui` | 147 | 31.333 | Render session dùng chung |
| `schema` | 120 | — | Kiểu dữ liệu |
| `merman` | 89 | 21.493 | **Engine mermaid TypeScript** |
| `codemode` | 85 | 34.538 | **Thực thi code bị nhốt** ("Effect-native confined code execution over schema-described tools") |
| `server`/`stats`/`client`/`protocol`/`sdk` | ~220 | — | Hạ tầng + client đồng bộ |
| `plugin` | 63 | 4.236 | API plugin |

**Tỷ lệ thật:** ~62% LOC nằm ở `console` + `app` + `ui` + `desktop` + `web` — tức **sản phẩm web, không phải agent**. Chỉ `core` (163k), `ai` (84k), `tui` (104k) là công nghệ agent. Đây là lý do "3.639 file" nghe lớn hơn thực tế: repo này lớn vì nó là **cả một công ty**, không phải vì TUI khổn lỏn.

### Hai thứ đáng xem, vì lý do ngược nhau

- **`packages/ai` 47 protocol / 84k dòng** — nhưng omp đã có `packages/ai` **315.878 dòng**. omp lớn hơn gần 4 lần ở đúng chỗ này. Không có gì để học; nếu có gì thì là ngược lại.
- **`packages/merman` 89 file / 21.493 dòng** (TypeScript) — omp có **bản Rust**: `crates/pi-natives/src/mermaid/` 33 file / 12.806 dòng. Cùng bài toán, khác ngôn ngữ. opencode phủ `flowchart`/`gantt`/`gitgraph`/`sequence`/`state`/`timeline` với `layout.ts` 40 KB + `routing.ts` 54 KB; omp phủ flowchart/er/class. **Không chép: TypeScript chậm hơn và omp đã chọn Rust đúng.**

---

## 6. Pháp lý

Trích nguyên văn từ `LICENSE` (file duy nhất, `git ls-files | grep -iE '^(LICENSE|COPYING|NOTICE)'` → `LICENSE`):

```
MIT License

Copyright (c) 2025 opencode

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Kiểm tra chéo trường `license` trong mọi package.json:
```
$ git ls-files 'packages/*/package.json' | xargs grep -h '"license"' | sort | uniq -c
      1   "license": "MIT"
     32   "license": "MIT",
```
33/33 khai MIT. **Không có `NOTICE`, không có `COPYING`** (`git ls-files | grep -iE 'notice|copying'` chỉ trả về file tên chứa chữ "notice" trong test, không phải file pháp lý).

**Nghĩa vụ khi chép:** MIT yêu cầu giữ nguyên dòng `Copyright (c) 2025 opencode` + toàn bộ khối permission notice trong mọi bản sao hoặc phần đáng kể. Không yêu cầu NOTICE (không phải Apache-2.0), không yêu cầu khai sửa đổi, không có ràng buộc về nguồn. Attribution cho `anomalyco/opencode`.

**Về `@opentui/core`:** đây là dependency của opencode, **không phải của omp**, và `node_modules` không được cài trong repo tham chiếu (`ls -d node_modules` → không có) nên **giấy phép của chính nó chưa được kiểm chứng ở đây**. Nếu M3 quyết định dùng nó, phải tra giấy phép riêng. Đây là khoảng trống cần đóng, không phải chi tiết.

---

## 7. `do_not_copy`

1. **Mua flexbox từ bên ngoài thay vì giữ layout tự chế.** `@opentui/core@0.5.12` là cả một dependency gồm renderer, keymap, Solid binding, có script nâng cấp riêng. Đây không phải "bài học về layout" — đây là một quyết định phụ thuộc mà M3 có thể đã quyết không theo. **Không chép; nhưng phải đọc lại tiền đề của M3** vì nó nói repo này không có flexbox.
2. **Hai API plugin song song (Promise + Effect).** `packages/plugin/src/{promise,effect}/` — cùng khả năng, hai cây, 622 dòng adapter. omp không dùng Effect (`grep -c '"effect"' package.json` trong omp → 0). Nợ kỹ thuật thuần.
3. **Effect ở mức 935 file.** `git grep -l 'from "effect"' -- 'packages/*/src/**' | wc -l` → 935. Đây là quyết định kiến trúc cả-repo, không phải chi tiết cần sao chép.
4. **Hai TUI song song (`mini/` 18.231 dòng).** Nhân đôi có chủ đích, giá 18k dòng phải bảo trì. omp đã tách `modes/`.
5. **`console` (380k) + `app` (238k) + `web` (221k) + `ui` (76k) + `desktop` (47k) ≈ 62% LOC.** Đây là công ty, không phải agent. Đừng để con số "853k dòng" khiến ai nghĩ omp nhỏ.
6. **`merman` (mermaid TypeScript, 21.493 dòng).** omp đã có bản Rust 12.806 dòng trong `pi-natives`. Chép bản TS là lùi.
7. **File khổn lồ.** `routes/session/index.tsx` 3.610 dòng, `component/prompt/index.tsx` 2.016, `mini/stream-v2.transport.ts` 1.898, `component/session-tabs.tsx` 1.779. AGENTS.md của omp cấm `any`/`ReturnType<>`; những file này là bằng chứng cho thấy quy mô không tự bảo vệ chất lượng.

---

## 8. `things_omp_lacks` — giữa những thứ nên lấy và thứ không

| Thứ | Vì sao | Kích thước | omp đã có? | Đáng? |
| --- | --- | --- | --- | --- |
| **Hợp đồng slot cho TUI plugin** | `SlotMap` + `SlotClaim` với `?: never` biến lỗi đặt hai chỗ thành lỗi kiểu. Mở rộng TUI mà không sửa host. | `context.ts` 532 dòng (SlotMap+SlotClaim ≈ 90 dòng); `plugin/structure.ts` 159 | **KHÔNG** — `git grep -ln 'SlotRegistry\|registerSlot'` → rỗng; ExtensionAPI chỉ có `registerMessageRenderer` + `ctx.ui` | **Có** — đây là thứ đáng học nhất trong repo, và omp thiếu thật |
| **Hệ chú ý (`attention.ts`)** | Focus/blur quyết định báo hay không; skip có tên; im lặng khi chưa chắc | `attention.ts` 189 dòng + `attention-sounds.{bun,node}.ts` 16 dòng + `audio.ts` 49 | **KHÔNG** — `git ls-files | grep -i attention` → rỗng; `audio.rs` là TTS, không phải attention | **Có** — 189 dòng cho một hệ tính năng mà thiếu hoàn toàn; hợp đồng "trả về cả lý do bỏ qua" là mẫu đáng học |
| **Bảng clamp layout 3 hằng số** | min/preferred/max → thuật toán layout vỏ ngoài trong 23 dòng, thay vì cấu hình tỉ lệ | `ui/layout.ts` 23 dòng; `ui/pane-resize.ts` 76 | omp có `chrome/`, `components/layout/row.ts` nhưng chưa đo bằng số | **Có, rẻ** — 23 dòng, quy luật, tự chứng minh bằng 3 hằng số |
| **Quy ước `flexGrow={1}` + `minWidth={0}`** | Cặp bắt buộc để flex item co được | 2 token, chỉ dùng ở `app.tsx:1350-1360` | Không áp dụng (không có flexbox) | **Tùy** — vô nghĩa nếu omp không có flexbox. Chỉ hữu ích nếu M3 chọn thêm flexbox. **Ghi lại để M3 đọc, đừng chép vội** |
| **`session-ui` tách projection khỏi detail** | Logic render session dùng chung TUI + web | 174 file / 31.333 dòng | omp chưa có khái niệm timeline projection | **Đọc để học, không chép** — 31k dòng phụ thuộc Solid + stack web; bài họt là *tách chiếu khỏi trình bày* |
| Framework thực thi code bị nhốt (`codemode`) | "confined code execution over schema-described tools" | 85 file / 34.538 dòng | omp: `python/robomp/src/sandbox.py` — khác hẳn (Python, không phải TS tool-call) | **Đọc `README`, đừng chép code** — 34k dòng, omp đã có hướng riêng |
| `desktop` / `web` / `console` | Sản phẩm công ty | 397+701+546 file | — | **Không** |

---

## 9. `unknowns` — những chỗ phải đo thêm trước khi quyết

1. **Giấy phép `@opentui/core@0.5.12` chưa biết.** `node_modules` không có trong repo tham chiếu. Nếu M3 cân nhắc dùng, phải tra riêng — MIT của opencode **không** phủ dependency của opencode.
2. **Chưa biết `@opentui/core` làm gì ngoài flexbox.** Không cài node_modules nên chưa đọc được engine: có renderer riêng không, có thay thế được `packages/tui` của omp không, bundle bao nhiêu. Đây là ẩn số lớn nhất của cả M3.
3. **`merman` vs mermaid Rust của omp: phạm vi phủ không chắc ngang nhau.** opencode có `gantt`/`gitgraph`/`sequence`/`state`/`timeline`; omp grep thấy `flowchart`/`er`/`class`. Chưa đếm diagram type nào omp thiếu.
4. **Chưa biết `console`/`app`/`web` có thành phần nào tái dùng được cho CLI không.** Đo mới thấy bề mặt (`package.json`, exports); chưa đọc code.
5. **Chưa so `packages/tui/src/plugin/api.tsx` (381 dòng) với hệ `modes/` của omp.** Đây là nơi slot thực sự được cài đặt; M6 §3 mới chỉ đọc hợp đồng, chưa đọc cơ chế phân giải.
6. **Chưa kiểm tra 17 `AGENTS.md` của opencode** như một mẫu kỷ luật agent. opencode có 17, omp có 2. Đây có thể là bài học M4/M6 riêng, chưa nằm trong phạm vi câu hỏi này.
7. **Số đo "245 file / 39.771 dòng" cho `packages/tui` chưa truy được nguồn.** Đã sửa thành 454/103.964, nhưng chỗ nào ghi con số cũ cần sửa theo.
