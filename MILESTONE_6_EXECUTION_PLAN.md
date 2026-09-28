# KẾ HOẠCH THỰC THIỆN — MILESTONE 6: BÀI HỌC TỪ CODEX, OPENCODE, GAJAE-CODE

Milestone này **không đề xuất tính năng mới**. Nó làm một việc: kiểm chứng bốn repo tham chiếu
bằng lệnh thật, rồi chỉ ra cái gì đáng mang về và **cái gì không**. Sai lúc học tốn hơn không
học.

Bốn nguồn, đã audit:

| Nguồn | HEAD | Quy mô | Giấy phép | Kết luận một dòng |
|---|---|---|---|---|
| `openai/codex` | `e72da2b` | 758 TS + **4.925 Rust** + 1.429 `.snap` | **Apache-2.0** | Rust-heavy, khác hẳn omp |
| `anomalyco/opencode` | `39021df` | 3.639 TS + 716 TSX, có TUI 39.771 dòng | **MIT** | quyết định layout của M3 |
| `gajae-code` | `5c52314` | 4.459 TS | **MIT** | xem §G0 |
| `claude-code-best/claude-code` | `77a7934` | 2.551 TS + 701 TSX | **KHÔNG CÓ** | đã ở M6 §0 của plan tổng |

## 0. Nguồn thứ tư đã được thêm vào M6: `code-yeongyu/oh-my-openagent`

M6 ban đầu có ba nguồn tham chiếu. `oh-my-openagent` được thêm vào **đây**, không phải vào M3, và lý do
cần nói rõ vì ban đầu nó được đề xuất cho M3:

**Về danh tính.** Repo tên là `oh-my-openagent` nhưng tên thật trong `package.json` là
`oh-my-opencode` v5.0.1 — nó là **plugin cho OpenCode**, không phải hậu duệ hay fork của oh-my-pi. Trong
~49 package, không package nào trùng tên với omp (trừ `utils`). M6 đã lấy bài học từ **OpenCode**, nên
một plugin cho OpenCode thuộc đúng phạm vi đó.

**Về kỹ thuật — 0/17 work item của M3 có tương ứng.** Grep 0 hit trên toàn bộ `.ts`/`.tsx` của repo đó cho
`elicit`, `colorblind|dalton`, `registerStatusLineSegment`, `readCollapsesIntoGroup`, `MEASURED_THRESHOLDS`,
`setWorkingMessage`. Lý do gốc đo được: **repo đó không sở hữu mã nguồn trình bày terminal nào** — phần
tui/sidebar tự viết là 12.053 dòng so với 189.051 dòng của `packages/tui` của omp (gấp 15,7 lần), và TUI
của họ là mua từ npm qua `overrides`. Trong khi toàn bộ 17 work item của M3 nằm trên bề mặt terminal.

**Về pháp lý — không lấy được dòng code nào.** Giấy phép là **SUL-1.0** (Sustainable Use License), không
phải open source. `LICENSE.md:20-22`: *"non-exclusive, royalty-free, worldwide, **non-sublicensable**,
non-transferable"*. `LICENSE.md:24-29`: *"only for your own internal business purposes or for
non-commercial or personal use"*. `LICENSE.md:53-57`: vi phạm thì giấy phép **tự động chấm dứt, và lần
vi phạm thứ hai sau khi khôi phục thì chấm dứt vĩnh viễn**. Với một dự án mục tiêu phát hành MIT công khai,
điều khoản `non-sublicensable` tự nó đã đóng phương án dùng code — không cần tranh luận về "free of charge
có bằng non-commercial không". SUL **không** bảo hộ ý tưởng, nên **đọc để học thì được**.

**Còn sự lộn xộn trong khai báo giấy phép, phải biết trước khi tin bất cứ thứ gì.** `package.json` gốc khai
`"license": "SUL-1.0"`, nhưng 14 package con khai `"MIT"` và **35 package không khai gì**. Trong 14 cái
khai MIT, phần lớn là **binary prebuild của chính dự án SUL** được dán nhãn MIT. Vậy nên: **đừng coi
package nào ở đó là MIT chỉ vì `package.json` của nó ghi vậy.**

**Bảy ý tưởng đáng học sạch** (ý tưởng chung không được bảo hộ bản quyền; **không chép dòng nào**):

1. **Thuật toán cấp phát độ rộng** — hằng số khai trước rồi mới chọn. Đây là câu trả lời trực tiếp cho
   §4.1 của M3, vốn tự cảnh báo thang độ rộng là chỗ dễ sai nhất.
2. **Ngữ pháp status line là túi TOKEN có thứ tự ưu tiên**, không phải một hàm format chuỗi.
3. **Thang động từ**: hàng không được tuyên bố chuyển động trước khi nó thật sự chuyển động.
4. **Hợp đồng phủ định** là cách viết test cho D2: assert sự vắng mặt trên những hàng mà số liệu CÓ.
5. **Biên nhận giao hàng thay vì hàng đợi toast** — câu trả lời cho A7 của M3.
6. **Mọi status surface mới nên có**: event-driven + debounce + latest-wins + timer tiêm vào được để test
   không cần thời gian thật.
7. **Phủ định đáng giá nhất: đừng học cách họ làm tầng model.** Họ hardcode hàng nghìn model-id literal
   trong TypeScript và có **0** provider implementation. Đó là chiều ngược lại luận điểm M2.

Bản audit đầy đủ: `~/Documents/omo-audit/report.md` (2026-09-27, commit `6c9e0aa`).

---

---

## Điều chỉnh sau khi so sánh: `gajae` là fork của dòng omp, không phải repo độc lập

Các audit ở dưới dựa trên giả định rằng bốn nguồn là bốn repo độc lập. **Đo lại thì ba trong bốn đúng, một
sai, và sai theo hướng quan trọng.**

`gajae-code` **không** là nguồn tham chiếu độc lập. Nó là **fork của chính dòng `omp`/`pi`**:

- `crates/pi-ast`, `crates/pi-iso` còn nguyên trong repo nó.
- Nó dùng chung đường dẫn với omp: `packages/ai/src/model-thinking.ts`, `packages/agent/src`.
- Nó còn **mới hơn `pi`**.

Hệ quả cho việc đọc audit của nó: **những gì `gajae` làm thêm là hướng đi của một fork, không phải chuẩn để
học vào.** Nó vẫn đáng đọc — nó là mốc thời gian của một nhánh phát triển — nhưng phải đọc với con dấu đó,
và cơ chế "port từ `gajae`" trong bất kỳ tài liệu nào là sai.

Một ví dụ đo được, và nó minh hoạ vì sao con dấu này quan trọng: `gajae` **đã gỡ** cây KDL của omp. Hậu
quả là `model-thinking.ts` thành **1.179 dòng chứa 86 model id hardcode** và `model-pricing.ts` chỉ còn
101 dòng hằng số giá viết tay — đúng thứ `AGENTS.md` của omp cấm. Đó là phép thử tự nhiên chứng minh kiến
trúc KDL đáng giữ, do một fork thực sự đã bỏ nó rồi đo hậu quả.

### Và một tiền đề nữa cũng sai: `pi` không có MCP, cũng không có ACP

Đo: `git ls-files | grep -ic mcp` → **0**; `grep -ic acp` → **0**. Hàng duy nhất nhắc MCP là một optional
peerDependency của `@google/genai`, không phải code của `pi`. `protocol`/`client`/`server` của `pi` là
**CBOR trên Unix socket** để điều phối nội bộ. Đừng coi chúng là tương đương MCP/ACP.

## Ranh giới pháp lý — đọc để học, chép dòng nào thì không

Ba repo đầu đều cho phép chép với nghĩa vụ giữ notice (MIT; Apache-2.0 thêm yêu cầu NOTICE và
tuyên bố sửa đổi). Riêng `claude-code-best` **không có `LICENSE`**, `package.json` không khai
`license`, README gõ *"educational and research purposes only. All rights to Claude Code belong to
Anthropic"* — **không phải mã nguồn mở**, không được chép dòng nào.

## Ba câu hỏi mỗi audit phải trả lời bằng số

1. **Nó là gì, đo bằng lệnh** — không mô tả bằng cảm giác.
2. **`omp` đã có tương đương chưa** — kiểm bằng `git grep` trên cây thật. Không đoán, và **không mặc
   định là chưa có**; omp rất lớn và nhiều thứ đã có.
3. **Có đáng mang về không** — kèm kích thước đo được.

## Điều kiện tiên quyết

Các audit dưới đây là **nghiên cứu tĩnh**: đo trên cây nguồn, chưa chạy hành vi. Mọi kết luận
"đáng mang về" là đề xuất, chưa phải cam kết. Xem mục *Những điều chưa được kiểm chứng* ở cuối.

## Thứ tự đọc

1. **`opencode`** — đọc trước. Nó trả lời câu hỏi lớn nhất của M3: một TUI trưởng thành bố cục
   bằng cách nào khi không muốn tự viết layout engine.
2. **`codex`** — phần Rust và snapshot test.
3. **`gajae-code`** — đọc §G0 trước, vì kết luận dẫn đầu quyết định có nên học gì từ đây không.
4. **`claude-code-best`** — đã ở §0 của plan tổng; chỉ đọc nếu bạn định port UI.

---

## Audit `opencode` — MIT — quyết định layout cho M3
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

---

## Audit `openai/codex` — Apache-2.0 — Rust và snapshot test
Repo: `/Users/tranquangdang21/Projects/codex-ref` · HEAD `e72da2b` · origin `https://github.com/openai/codex.git`

**Kết luận một dòng:** đây **đúng là Codex của OpenAI** (first-party, không phải fork trùng tên), Apache-2.0 nên chép được — nhưng nó **không phải nguồn để học layout** (Rust thuần, 135 crate, khác hệt omp). Chỉ **một** thứ trong repo này là bài học thật sự dùng được cho omp: **snapshot test khung hình render TUI** (1.329 file `.snap` cho 1.054 file nguồn TUI). Phần còn lại — đặc biệt sandbox OS và blob `models.json` — là **điểm chép là sập**.

---

## 0. Số đo đã kiểm (mọi khẳng định kèm lệnh)

| Đại lượng | Số | Lệnh |
| --- | --- | --- |
| HEAD | `e72da2b53805…` (2026-09-26, #48353) | `git log -1 --format='%H %ad %s'` |
| File theo dõi | **8.693** | `git ls-files \| wc -l` |
| Dung lượng | **123 MB** (`.git` 19 MB) | `du -sh . .git` |
| `.rs` | **4.925** | `git ls-files \| sed 's/.*\.//' \| sort \| uniq -c` |
| Tổng LOC `.rs` | **1.943.003** | `git ls-files '*.rs' \| xargs wc -l \| tail -1` |
| LOC `.rs` trừ test | **1.072.974** | `git ls-files '*.rs' \| grep -vE "tests?/\|_tests\.rs\|/tests/" \| xargs wc -l \| tail -1` |
| `.snap` | **1.429** (1.298.261 byte ≈ 1,24 MB) | `git ls-files '*.snap' \| wc -l` / `\| xargs wc -c \| tail -1` |
| `.ts`+`.tsx` | **758** — nhưng 734 là **sinh tự động**, chỉ **24** là tay viết | xem §1 |
| Crate Rust | **135** thư mục có `Cargo.toml` | `git ls-files 'codex-rs/**/Cargo.toml' \| wc -l` |
| Tổng LOC TypeScript tay viết | **24 file** (chỉ `sdk/typescript`) | `git ls-files '*.ts' '*.tsx' \| grep -v schema/ \| wc -l` |

### Crate Rust lớn nhất (`git ls-files 'codex-rs/<c>/**/*.rs' | xargs wc -l`)

| Crate | File | Dòng |
| --- | --- | --- |
| `core` | 787 | 425.831 |
| `tui` | 1.054 | 425.296 |
| `app-server` | 330 | 185.929 |
| `exec-server` | 168 | 62.141 |
| `core-plugins` | 90 | 47.665 |
| `cli` | 100 | 40.159 |

Ba crate đầu đã chiếm 1.037.056 dòng — hơn một nửa toàn repo.

---

## 1. Câu hỏi 1 — phần Rust (4.925 file) làm gì: core, binding, hay công cụ?

**Trả lời: đây là core. Toàn bộ sản phẩm là Rust. TypeScript chỉ là cái vỏ sinh tự động.**

Bằng chứng ba tầng, không suy đoán:

**Tầng 1 — `codex-cli` không có logic ứng dụng.** Nó là một shim Node 8,6 KB:
```
$ ls codex-cli/bin          → codex.js
$ wc -c codex-cli/bin/codex.js  → 8639
$ head -3 codex-cli/bin/codex.js
#!/usr/bin/env node
// Unified entry point for the Codex CLI.
import { spawn } from "node:child_process";
```
Nó spawn một binary Rust dựng sẵn theo platform (`@openai/codex-darwin-arm64`, `@openai/codex-linux-x64`, …). Không có TypeScript nào trong sản phẩm.

**Tầng 2 — 758 `.ts/.tsx` không phải code ứng dụng.** Tất cả 734 file trong `codex-rs/` nằm ở **một** thư mục:
```
$ git ls-files 'codex-rs/**/*.ts' | awk -F/ '{print $4}' | sort | uniq -c
    734 typescript
$ head -3 codex-rs/app-server-protocol/schema/typescript/AbsolutePathBuf.ts
// GENERATED CODE! DO NOT MODIFY BY HAND!
```
Chúng do `ts-rs` sinh từ các `#[derive(TS)]` bên Rust, tái sinh bằng `codex-rs/app-server-protocol/src/schema_fixtures.rs` (`/// Regenerates schema/typescript/, schema/json/, …`). **24 file TypeScript tay viết duy nhất** nằm trong `sdk/typescript/` — SDK cho client, không phải agent.

**Tầng 3 — phân tầng rõ ràng.** Agent loop = `core` (787 file). Giao diện = `tui` (1.054 file, ratatui). Mọi thứ khác là protocol/plumbing quanh hai đáy đó.

### Tương đương ở omp?

**Có, nhưng tỉ lệ ngược.** omp cũng coi Rust là native layer, không phải binding:
```
$ git ls-files 'crates/*/Cargo.toml' | sed 's|/Cargo.toml||'
crates/pi-ast  pi-builtins  pi-diff  pi-edit  pi-iso  pi-natives  pi-predict
crates/pi-shell  pi-vcs  pi-vfs  pi-voice  pi-walker  (+ 3 vendor)
$ git ls-files 'crates/**/*.rs' | xargs wc -l | tail -1   →  308105 total
$ git ls-files 'crates/pi-natives/**' | wc -l            →  210
```
Điểm khác biệt quyết định: **omp đặt ranh giới ở _loại việc_, codex đặt ở _ngôn ngữ_.** `crates/pi-natives` (210 file) là "phần nóng" — text/grep/image — còn agent loop, TUI, tool dispatch vẫn là TypeScript ở `packages/`. codex đẩy ranh giới xa hơn hẳn: agent loop **và** TUI đều là Rust (851K dòng).

**Học gì:** ranh giới của omp là hợp lý và **không nên di chuyển**. Việc chuyển TUI/agent-loop sang Rust để giống codex là chi phí 800K dòng mà không đổi contract. Điều đáng chú ý hơn là codex cho thấy `core` + `tui` chiếm đúng hai vùng "khó sửa nhất" — và cả hai đều **có** bộ test riêng đậm đặc. Phần còn lại thì không.

---

## 2. Câu hỏi 2 — 1.429 file `.snap` dạy được gì về cách kiểm thử output của agent?

**Trả lời: chúng dạy một điều rất cụ thể và rất đáng học — _đơn vị khẳng định của một TUI là khung hình đã render_, không phải giá trị trả về.**

### Chúng nằm ở đâu

```
$ git ls-files '*.snap' | awk -F/ '{print $2}' | sort | uniq -c | sort -rn
   1329 tui
     72 core
     19 cli
      7 mermaid
      1 ext
      1 codex-mcp
```
**1.329 / 1.429 = 93%** nằm trong đúng một crate. Bên trong `tui`:
```
$ git ls-files '*.snap' | awk -F/ '{print $3"/"$4}' | sort | uniq -c | sort -rn | head -6
   404 tui/src/chatwidget
   344 tui/src/bottom_pane
   189 tui/src/snapshots
   138 tui/src/app
    91 tui/src/history_cell
    33 tui/src/transcript_view
```

### Chúng trông như thế nào

Đây là `insta`, và body là **văn bản terminal thật, đã bỏ màu**:
```
$ head -25 codex-rs/tui/src/chatwidget/realtime/snapshots/…voice_footer_renders….snap
---
source: tui/src/chatwidget/realtime/recording_controls_tests.rs
expression: "states.join(\"\n\n\")"
---
connecting:
 voice ◌ connecting                                                 /voice stop

› Ask Codex to do anything

  status line stays visible

listening:
 voice ● listening                                  ctrl+x mute     /voice stop
   mic ▁▁▁▁▁▁  codex ▁▁▁▁▁▁
…
```

Ba bài học cụ thể từ đúng file này:

1. **Một `.snap` giữ nhiều trạng thái, không phải một.** File trên gộp `connecting` / `listening` / `speaking` vào **một** assertion (`states.join("\n\n")`). Vì vậy 1.329 file đỡ được hàng nghìn test case. Đây là bài học tiết kiệm nhất.
2. **Cả khung hội thoại nằm trong khung hình.** Không chỉ dòng đang render — cả composer, cả status line, cả phần trượt bên dưới. Một regression làm hỏng bố cục chỉ lộ ra ở đây, không lộ ra ở test hàm.
3. **Bố cục được assert bằng byte, không bằng ý nghĩa.** Khoảng cách cột, ký tự `▌` hay `◌`, vị trí `/voice stop` — tất cả là ký tự thật. Đây là thứ mà test dựa trên `toContain` **không bắt được**.

### Vế còn lại — cái giá, phải nói thẳng

**1.329 file `.snap` cho 1.054 file nguồn `.rs` trong crate `tui`.** Corpus snapshot lớn hơn chính code nó bảo vệ. Mỗi thay đổi UI có chủ đích là một đợt viết lại hàng loạt file, và mọi snapshot đều có thể được `cargo insta accept` mà không ai đọc. Đây là chi phí bảo trì thật, không phải chiến lợi phí miễn phí.

### omp đã có tương đương chưa?

**Chưa có. Đo ra là 0 tuyệt đối:**
```
$ git ls-files '*.snap' | wc -l              → 0
$ git ls-files '**/__snapshots__/**' | wc -l  → 0
```
omp kiểm thử render bằng **assertion tay trong test**. Ví dụ `packages/tui/test/apply-patch-preview-render.test.ts`:
```ts
const rendered = Bun.stripANSI(
  editToolRenderer.renderCall({}, {expanded:false, isPartial:true, spinnerFrame:0, renderContext}, uiTheme)
    .render(160).join("\n"));
expect(rendered).toContain("src/a.ts");
expect(rendered).toContain("new a");
```
Quy mô: `git ls-files 'packages/tui/test/**' | wc -l` → **233 file test**. Nghĩa là omp có *nhiều hơn nhiều* bài kiểm tra hơn codex, nhưng **không bài nào** chụp lại toàn bộ khung hình.

omp **có** golden file ở đúng một nơi: `crates/pi-edit/tests/fixtures/apply_patch/scenarios/` — **25** kịch bản đánh số, mỗi cái có `input/`, `expected/`, `patch.txt`. Đây là cùng ý tưởng, nhưng bó trong một tool.

**Kết luận:** khoảng trống có thật, và là khoảng trống *có hình dạng rõ* — không phải "thêm test", mà là "thêm một tầng khẳng định ở trên tầng `toContain` sẵn có".

---

## 3. Câu hỏi 3 — cơ chế sandbox/approval nào omp chưa có?

### Sandbox: omp không có. Đo ra rất rõ.

```
$ git ls-files | grep -i sandbox
python/robomp/src/sandbox.py
python/robomp/tests/test_sandbox.py

$ git grep -ril "seatbelt\|landlock\|bubblewrap\|bwrap\|sandbox-exec" -- packages/ crates/
packages/coding-agent/src/tools/file-write-fallback.ts

$ git grep -rn "sandboxMode\|sandbox_mode" -- packages/
packages/ai/src/providers/cursor/proto/agent.proto:3931  ← tên một kiểu trong protobuf của Cursor
```
Hai kết quả đầu **không phải sandbox của omp**:
- `python/robomp/src/sandbox.py` tự mở đầu là "Per-issue workspace lifecycle: clone pool + git worktrees" — nó là quản lý vòng đời worktree và phân vùng quyền sở hữu file (`u=rwX,g=rwX,o=`), không gọi kernel.
- `file-write-fallback.ts` là một nhánh dự phòng khi không thể ghi file.
- Kết quả thứ ba là **một cái tên trong protobuf vendored của bên thứ ba**, không phải tính năng.

**Kết luận: omp không có nhốt sandbox ở tầng OS. Không phải "thiếu một option", mà là thiếu cả tầng.**

### codex có gì

**9 crate liên quan sandbox** (`git ls-files 'codex-rs/**/Cargo.toml' | grep -iE 'sandbox|execpolicy|bwrap|approval'`):

| Crate | File `.rs` | Dòng | Vai trò |
| --- | --- | --- | --- |
| `sandboxing` | 24 | 10.469 | **Điều phối đa-OS**: `seatbelt.rs` (macOS), `landlock.rs`+`bwrap.rs`+`linux_pid_namespace.rs` (Linux), `windows.rs`+`windows_mxc.rs` (Windows), `manager.rs`, `spawn.rs`, `violation.rs`, `denial.rs` |
| `linux-sandbox` | 31 | 12.747 | Bubblewrap; có `[[bin]] name="codex-linux-sandbox"` — binary riêng, dep `landlock`, `globset`, `libc` |
| `windows-sandbox-rs` | 114 | 28.762 | Windows |
| `windows-sandbox-service` | 29 | 5.375 | Service đi kèm |
| `mxc-sandbox` | 7 | 1.781 | sandbox thứ cấp |
| `bwrap` | 2 | 151 | Bọc/bundled bubblewrap (`config.h` + `build.rs`) |
| `execpolicy` | 13 | 2.975 | Ngôn ngữ chính sách lệnh (xem dưới) |
| `utils/approval-presets` | 1 | 77 | preset duyệt |
| `network-proxy` | 62 | 29.919 | Chặn egress, khớp với sandbox |

**Và 4 hồ sơ Seatbelt, 343 dòng** — toàn bộ chính sách macOS nằm ở dạng đọc được:
```
$ git ls-files '*.sbpl'
codex-rs/sandboxing/src/seatbelt_base_policy.sbpl
codex-rs/sandboxing/src/seatbelt_network_policy.sbpl
codex-rs/sandboxing/src/seatbelt_preferences_policy.sbpl
codex-rs/sandboxing/src/seatbelt_read_only_platform_defaults.sbpl
```
`seatbelt.rs` ghép chúng với `FileSystemSandboxPolicy`, `NetworkSandboxPolicy`, `WritableRoot` — tức là *filesystem sandbox và network sandbox là hai trục độc lập*, không gộp làm một.

### Approval: omp **đã có** và không cần học

```
$ wc -l packages/coding-agent/src/tools/approval.ts        → 387
$ wc -l packages/coding-agent/test/tools/approval*.test.ts  → 959 + 318
$ wc -l packages/coding-agent/test/tools/*ssh-url-approval*.test.ts → 129 + 76
$ head -3 docs/approval-mode.md
# Tool approval mode
Tool approval has three inputs:
```
omp có: **3 tầng tool** (`read`/`write`/`exec`), **3 chế độ** (`always-ask`/`write`/`yolo`), **3 quyết định** (`allow`/`deny`/`prompt`), cộng user-override. Đây là một hệ thống **đã hoàn chỉnh và đã kiểm thử 1.482 dòng**.

codex có enum khác hẳn (`codex-rs/protocol/src/protocol.rs:986`):
```rust
pub enum AskForApproval {
    UnlessTrusted,          // "untrusted"
    OnRequest,              // default, serde alias "on-failure"
    Granular(GranularApprovalConfig),
    Never,
}
```

**Hai mô hình này không cạnh tranh — chúng trục giao nhau.** codex hỏi *"khi nào hỏi con người"*; omp hỏi *"lớp rủi ro nào"* rồi suy ra lúc hỏi. codex ghép approval với sandbox (`SandboxPolicy`); omp ghép approval với tool tier. **Đừng port enum của codex sang omp** — sẽ phá `docs/approval-mode.md` và 1.482 dòng test đang đúng.

### execpolicy — thứ omp *thật sự* thiếu, và là thứ đáng học

`codex-rs/execpolicy/README.md`, trích nguyên văn:
> Policy engine and CLI built around `prefix_rule(pattern=[...], decision?, justification?, match?, not_match?)` plus `host_executable(name=..., paths=[...])`.

Ba ý thiết kế đáng chú ý:

1. **Quyết định là `allow` / `prompt` / `forbidden`**, gộp "có hỏi không" và "có cấm không" vào một trục duy nhất. omp tách thành `allow`/`deny`/`prompt` — cùng ba giá trị, khác vị trí trên trục.
2. **`match` / `not_match` là ví dụ kiểm thử nhúng trong luật.** README: *"`match` / `not_match` supply example invocations that are validated at load time (think of them as unit tests)"*. Luật mang theo bằng chứng rằng nó khớp và không khớp — tự bảo vệ khỏi việc trở thành bảo vệ mù.
3. **`justification` là trường bắt buộc về mặt ngữ nghĩa**: *`"Use jj instead of git."`* — cấm lệnh phải kèm đường thoát.

**Nhưng omp không hoàn toàn trắng.** `packages/coding-agent/src/tools/bash-interceptor.ts` đã có `BashInterceptorRule` biên dịch sang `RegExp` (`new RegExp(rule.pattern, flags)`, bỏ qua regex hỏng). Khác biệt là **mục đích**: interceptor *chặn để chỉ sang tool tốt hơn* (gõ `grep` → bảo dùng ripgrep), còn execpolicy *ra quyết định an toàn* với ba mức. Không thay thế nhau.

---

## 4. Câu hỏi 4 — đây là Codex của OpenAI hay một fork cùng tên?

**Đây là Codex của OpenAI. Không phải fork trùng tên.** Vì vậy cái học được **có giá trị** — nhưng vẫn phải lọc.

```
$ git remote -v
origin  https://github.com/openai/codex.git (fetch)
origin  https://github.com/openai/codex.git (push)
$ head -1 README.md
<p align="center"><strong>Codex CLI</strong> is a coding agent from OpenAI that runs locally on your computer.
$ grep Copyright LICENSE | tail -1
Copyright 2025 OpenAI
$ cat NOTICE
OpenAI Codex
Copyright 2025 OpenAI
This project includes code derived from [Ratatui](…/ratatui), licensed under the MIT license.
Copyright (c) 2016-2022 Florian Dehau
Copyright (c) 2023-2025 The Ratatui Developers
```
Ba dấu hiệu độc lập cùng chỉ một hướng: origin trùng tên chính thức, README tự nhận, `Copyright 2025 OpenAI` trong cả LICENSE lẫn NOTICE.

---

## 5. Pháp lý — nghĩa vụ khi chép

**Apache License, Version 2.0.** `LICENSE` dài 201 dòng, dòng 1-4 nguyên văn:
```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
```
Phụ lục cuối file, nguyên văn:
```
Copyright 2025 OpenAI

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
```
Khai báo `"license"` trong mọi `package.json` có trường đó:
```
$ git ls-files '*package.json' | ...
codex-cli/package.json                          :: "license": "Apache-2.0"
codex-rs/responses-api-proxy/npm/package.json   :: "license": "Apache-2.0"
sdk/typescript/package.json                     :: "license": "Apache-2.0"
package.json (gốc, private)                    :: <no license field>
```

### Nghĩa vụ cụ thể khi lấy code từ đây

Apache-2.0 **cho phép** chép, sửa, phân phối thương mại, và **không** có ràng buộc kiểu viral. Nhưng nghĩa vụ gồm **ba** mục, đều bắt buộc:

1. **Giữ nguyên văn `LICENSE`** (cả 201 dòng) trong bản phân phối.
2. **Giữ `NOTICE`, và giữ nguyên nó kể cả khi sửa.** `NOTICE` ở đây không rỗng — nó ghi công Ratatui:
   > This project includes code derived from Ratatui, licensed under the MIT license. Copyright (c) 2016-2022 Florian Dehau / Copyright (c) 2023-2025 The Ratatui Developers

   Đây là nghĩa vụ riêng của Điều 4(d). Xoá dòng này là **vi phạm**, không phải làm rõ.
3. **Tuyên bố đã sửa đổi** ở nơi phân phối (Điều 4(b)). Không được im lặng.

Apache-2.0 **không** yêu cầu ghi nguồn gốc dòng nào cũng phải mở. omp vẫn là MIT của chính mình; chỉ là phần *mượn* phải giữ nghĩa vụ Apache.

> ⚠️ **Cảnh báo đan xen.** `NOTICE` chứng minh codex đã vay code MIT của Ratatui. Nếu bao giờ lấy đúng phần code `tui` của codex, luồng nghĩa vụ là **Apache-2.0 + giữ phần Ratatui MIT** (giữ copyright Florian Dehau + The Ratatui Developers và permission notice của MIT). Đây là lý do `docs/sandbox.md` và `docs/execpolicy.md` ở codex chỉ là 150 byte — chúng là link ra ngoài, và phần cảnh báo thật sự nằm ở `NOTICE`, không nằm trong tài liệu.

---

## 6. Danh sách thứ omp chưa có — xếp theo đáng/không đáng

### Đáng

**1. Snapshot test khung hình cho TUI.**
- **Cỡ:** codex 1.329 `.snap` / 1,24 MB cho crate `tui`. omp: **0**.
- **Vì sao đáng:** là khoảng trống thật, hình dạng rõ, và bổ sung chứ không thay thế tầng `toContain` sẵn có của omp (`packages/tui/test/`, 233 file). Kỹ thuật đáng chép: gộp nhiều trạng thái vào một `.snap` bằng `states.join("\n\n")`, assert **toàn khung** (composer + status + lịch sử), byte thật sau khi bỏ màu.
- **omp đã có tương đương chưa:** không. Nhưng omp **đã** có mô hình golden ở `crates/pi-edit/tests/fixtures/apply_patch/scenarios/` (25 kịch bản `input/expected/patch.txt`) — nghĩa là đường ray sẵn có, chỉ chưa mở rộng ra TUI.
- **Cảnh báo:** **không** bê nguyên 1.329 file. Đó là chi phí bảo trì của họ, không phải mẫu. Chọn lọc — `bottom_pane` (344) và `chatwidget` (404) là hai vùng dày nhất và cũng là hai vùng khó sửa nhất, nên bắt đầu từ đó.

**2. Tách filesystem-sandbox khỏi network-sandbox thành hai trục.**
- **Cỡ:** `SandboxPolicy` + `NetworkSandboxPolicy` + `WritableRoot`; 343 dòng `.sbpl`; `network-proxy` 62 file / 29.919 dòng.
- **Vì sao đáng:** ngay cả khi omp chưa làm sandbox, **tách hai trục ngay từ đầu** rẻ hơn nhiều so với gộp rồi tách sau. Hiện tại omp không có khái niệm nào cả hai; khi thêm, một enum đơn lẻ sẽ thành nợ kỹ thuật.
- **omp đã có tương đương chưa:** không (`git grep sandboxMode` trên `packages/` → 0 hit ngoài protobuf vendored).

**3. `match` / `not_match` — luật mang theo bằng chứng.**
- **Cỡ:** `codex-rs/execpolicy/src/rule.rs` + `parser.rs`, tổng crate 13 file / 2.975 dòng.
- **Vì sao đáng:** ý *"example invocations validated at load time (think of them as unit tests)"* giải đúng một bài toán mà mọi hệ thống allowlist đều mắc: luật regex viết sai thì fail-closed một cách âm thầm. Đây là bài học **thiết kế luật**, không phụ thuộc ngôn ngữ, không phụ thuộc Rust.
- **omp đã có tương đương chưa:** một nửa. `bash-interceptor.ts` đã biên dịch `BashInterceptorRule` → `RegExp` và bỏ qua regex hỏng — nhưng là để *chuyển hướng tool*, không phải để *ra quyết định an toàn*. Không có tầng ví dụ kiểm thử nhúng trong luật.

**4. `justification` bắt buộc kèm lệnh cấm.**
- **Cỡ:** một trường trong `prefix_rule` (`codex-rs/execpolicy/README.md`).
- **Vì sao đáng:** nguyên văn README khuyến nghị `"Use jj instead of git."` — cấm một lệnh mà không chỉ đường thoát là cấm mà người dùng không biết cách vây. Rẻ, và nâng chất một hệ thống policy rất nhiều.
- **omp đã có tương đương chưa:** không. `packages/coding-agent/src/tools/ssh-url-approval.ts` là hẹn giờ duy nhất liên quan.

### Không đáng

**5. `models.json` dạng blob sinh sẵn 405 KB.**
```
$ wc -c codex-rs/models-manager/models.json   → 405645
$ head -c 200 codex-rs/models-manager/models.json
{"models":[{"slug":"gpt-6.astra","prefer_websockets":true,…}]}
```
Cấu trúc này gắn chặt với một hệ OpenAI: `use_responses_lite`, `multi_agent_version`, `tool_mode: "code_mode_only"`, `prefer_websockets`. `codex-rs/model-provider-info` là **registry Rust** với provider mặc định nằm trong binary cộng override ở `~/.codex/config.toml`.

omp đã ở hướng ngược lại và **đi xa hơn**: `git ls-files 'packages/catalog/src/compat/rules/**' | wc -l` → **222 file KDL**, biên dịch bằng `bun run gen:compat` thành `rules.json`, với các trục `taxonomy` / `classes` / `providers` / `runtime`, và quy tắc của omp (`AGENTS.md`) cấm rõ ràng mọi điều kiện theo danh tính model trong TypeScript. Cách đó **kiểm toán được trong nguồn**; blob JSON thì không. **Không chép.**

**6. Biến `core` + `tui` thành Rust.**
- 851K dòng (`core` 425.831 + `tui` 425.296) để đổi một ngôn ngữ, không đổi một contract. Ranh giới hiện tại của omp — Rust cho phần nóng (`crates/pi-natives`, 210 file), TypeScript cho agent loop và TUI — là quyết định đúng. **Giữ nguyên.**

**7. `network-proxy` 29.919 dòng.**
Đây là công cụ kiểm soát egress của một hãng, phục vụ chính sách doanh nghiệp. Không thuộc phạm vi sản phẩm cá nhân. **Bỏ qua.**

**8. `app-server` (330 file / 185.929 dòng) + `codex-mcp` + `rmcp-client`.**
omp đã có `modes/rpc/` (11 file) và `mcp/json-rpc.ts`. Chênh lệch là **cấp độ protocol**, chứ không phải thiếu hẳn. Xem lại ở milestone khác, không phải M6.

---

## 7. Danh sách "đừng chép" — gói gọn

| # | Thứ | Vì sao |
| --- | --- | --- |
| 1 | Layout Rust thuần (135 crate) | omp đã chọn ranh giới theo *loại việc*; đổi sang theo *ngôn ngữ* là 851K dòng không đổi contract |
| 2 | `models.json` blob 405 KB | Gắn chặt OpenAI; omp đã có 222 file KDL kiểm toán được, đi xa hơn |
| 3 | Enum `AskForApproval` (unless-trusted/on-request/granular/never) | Phá `docs/approval-mode.md` + 1.482 dòng test đang đúng; hai mô hình trục giao nhau, không thay thế |
| 4 | Toàn bộ 1.329 file `.snap` | Corpus lớn hơn code; chọn lọc `bottom_pane` + `chatwidget` |
| 5 | `analytics` crate (27 file / 16.543 dòng) | Telemetry sản phẩm OpenAI; chỉ tắt được qua `config.analytics = false` (`codex-rs/config/src/types.rs:226`) |
| 6 | `network-proxy` (62 file / 29.919 dòng) | Kiểm soát egress doanh nghiệp, ngoài phạm vi sản phẩm cá nhân |
| 7 | `app-server` + `rmcp-client` (429 file) | omp đã có RPC ở cấp khác; chênh lệch cấp độ protocol, không phải M6 |
| 8 | `codex-cli/bin/codex.js` | Shim 8,6 KB spawn binary dựng sẵn — không có gì để học |

---

## 8. Không biết / cần kiểm thêm

- **Chưa đọc** 4 file `.sbpl` (343 dòng) và `landlock.rs`. Đủ để kết luận "có sandbox ba lớp", chưa đủ để đề xuất port — cần đọc trước khi có bất kỳ kế hoạch sandbox nào cho omp.
- **Chưa đọc** `codex-rs/core/tests/suite/approvals.rs` (176 KB — file test lớn nhất tìm thấy). Đáng đọc nếu M-scope nào đụng approval.
- **Chưa xác minh** `ext/` (17 crate con, 275 file) có phải hệ plugin mở rộng được bên ngoài hay chỉ là nội bộ. `codex-rs/ext/extension-api/` gợi ý là API thật, nhưng chưa đo API surface.
- **Chưa so** `guardian-v2` (auto-review: 37 file / 12.225 dòng) với `packages/coding-agent/src/prompts/agents/reviewer.md` của omp. omp có prompt reviewer; codex có cả scorer async lẫn reviewer sync. Chưa rõ tương đương tới đâu.
- **Chưa xác minh** `code-mode` (`code-mode`, `code-mode-host`, `code-mode-runtime`, `code-mode-protocol` — 104 file, ~30K dòng) là gì. Tên gợi ý thay thế tool-call bằng code thay vì gọi tool. Nếu đúng, đây là ứng viên M-scope lớn và **chưa được đánh giá**.
- **Chưa đo** tỉ lệ test của `core` so với code chạy thật (1.072.974 dòng không test trên 4.925 file), nên chưa nói được `core` được kiểm thử tốt hay kém.
- **Môi trường đo chỉ là checkout Darwin.** Không kiểm hành vi Windows sandbox (`windows-sandbox-rs` 114 file) hay WSL — những phần đó chỉ được đọc qua tên file.

---

## 9. Một câu để M6 mang đi

Mọi repo đã audit sẵn đều dạy omp *cách dựng*. `codex` là repo đầu tiên trong loạt này dạy **cách kiểm thử** — và nó dạy bằng cách phủ nhận: 1.054 file nguồn TUI, 1.329 file snapshot, **một** mẫu học. Nếu M6 chỉ lấy đúng một thứ từ đây, hãy lấy `states.join("\n\n")` — gộp nhiều trạng thái vào một assertion, chụp **toàn khung** chứ không chụp từng dòng — rồi bắt đầu từ `bottom_pane`. Đừng lấy phần còn lại.

---

## Audit `gajae-code` — MIT
**Repo:** `/Users/tranquangdang21/Projects/gajae-ref` · remote `https://github.com/Yeachan-Heo/gajae-code.git`
**HEAD:** `5c5231418930673e42cc5d08ebe4376e03187533` (2026-09-26 01:26:07 +0900) — `chore: bump version to 0.17.7`
**Local clone is a SQUASH:** `git log --oneline | wc -l` → **1**. Không dùng được lịch sử để truy nguồn.

---

## 0. KẾT LUẬN QUAN TRỌNG NHẤT — đọc trước mọi thứ khác

**gajae-code KHÔNG phải người ngang hàng của omp. Nó là chính omp, đã đổi tên, ở một bản pin cũ hơn.**

```
$ git grep -n 'oh-my-pi' -- docs/rust-porting-inventory.md
docs/rust-porting-inventory.md:7:Upstream pin: `can1357/oh-my-pi@a85bd5228d9f0f619deade1db78fa49420a721e1`
```

```
$ git grep -n 'oh-my-pi' -- NOTICE.md
NOTICE.md:5:- [`oh-my-pi`](https://github.com/can1357/oh-my-pi) — the upstream red-claw lineage and implementation DNA.
```

Hệ quả trực tiếp, áp dụng cho cả M6:

- **Câu hỏi "học gì từ gajae" phải được đổi thành "học gì từ chính bản cũ của mình, đã đi qua một người khác".** Đây là timeline đảo ngược, không phải so sánh ngang hàng.
- `packages/*` của gajae giữ **nguyên bộ tên thư mục** của omp: `agent/ ai/ coding-agent/ natives/ stats/ tui/ utils/`. Chỉ khác scope: `@oh-my-pi/*` → `@gajae-code/*`.
- `packages/coding-agent/src/extensibility/` ở gajae **giữ nguyên đường dẫn, tên file, cả tên thư mục con** mà omp vẫn còn hôm nay (`custom-tools/loader.ts`, `custom-commands/bundled/ci-green/index.ts`, `extensibility/extensions/{loader,runner,wrapper}.ts`). Đây không phải "gợi ý kiến trúc" — đây **là code của chính omp đã đổi tên**.
- Vì vậy phần lớn "sự khác biệt" quan sát được giữa hai bên là **omp đã tiến**, không phải gajae sáng tạo ra. Chỉ vài mục dưới đây là nơi gajae thực sự đi trước.

---

## 1. Nó là gì? (câu hỏi riêng #1)

**Trả lời thẳng: đó là một coding-agent CLI — bản fork-đổi-tên của chính omp.**

`README.md:44` (nguyên văn):
> Gajae-Code (`gjc`) is an external coding-agent harness: drop it into any repository or worktree. No separate API billing. No per-token anxiety. No terminal babysitting.

Cấu trúc `packages/` (15 thư mục + 1 file tsconfig), tất cả khai `MIT`:

| Thư mục | npm name | So với omp |
| --- | --- | --- |
| `packages/agent` | `@gajae-code/agent-core` | có (omp: `agent/`) |
| `packages/ai` | `@gajae-code/ai` | có |
| `packages/coding-agent` | `@gajae-code/coding-agent` | có |
| `packages/tui` | `@gajae-code/tui` | có |
| `packages/utils` | `@gajae-code/utils` | có |
| `packages/natives` (+5 bản platform) | `@gajae-code/natives-*` | có |
| `packages/stats` | `@gajae-code/stats` | có |
| `packages/gajae-code` | `gajae-code` (CLI) | `packages/coding-agent` của omp |
| `packages/bridge-client` | — | không có ở omp |
| `packages/orchestration-token-benchmark` | `@gajae-code/orchestration-token-benchmark` | omp có `typescript-edit-benchmark` cùng vai |
| `packages/typescript-edit-benchmark` | `@gajae-code/typescript-edit-benchmark` | có |
| **không có** | **`catalog/`, `omptype/`, `metaharness/`, `wire/`, `mnemopi/`, `collab-web/`, `snapcompact/`, `browser-relay/`** | omp có 8 package này |

`git ls-files | grep -iE '\.kdl$'` → **0 file**. `ls packages | grep -i catalog` → **rỗng**.
→ gajae đã **xoá sạch** `packages/catalog/` và cây rule KDL của omp, gộp model catalog về một file phẳng `packages/ai/src/models.json`. Chi tiết ở § "do not copy".

Rust: `git ls-files '*.rs' | wc -l` → **266**, `wc -l` → **113.447 dòng**. Đây là port Rust của natives (có `docs/rust-porting-inventory.md` ghim đúng commit upstream). omp có `crates/` với 559 file `.rs`.

---

## 2. 4.459 file `.ts` làm gì? (câu hỏi riêng #2)

`git ls-files '*.ts' | wc -l` → **4459**. Nhưng con số đó gồm cả test, và test là phần lớn:

```
$ git ls-files '*.ts' | awk -F/ '{c="OTHER"; for(i=1;i<=NF;i++){if($i=="test"){c="TEST";break}; if($i=="src"){c="SRC";break}} print c}' | sort | uniq -c
   310 OTHER
  1810 SRC
  2339 TEST
```

Dòng code (`wc -l` trên tập file tương ứng):

| Nhóm | LOC |
| --- | --- |
| `.ts` trong `test/` | **860.631** |
| `.ts` trong `src/` | **833.264** |
| tổng `.ts` | 1.778.880 |
| `.rs` | 113.447 |

**53% file / 48% dòng là test.** Đây là câu trả lời: repo không "làm gì" với 4459 — nó **kiểm thử** bằng 4459. Đây là mật độ test cao hơn omp (omp: 5407 `.ts` tổng).

Phân bố theo package (`git ls-files '*.ts' | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn`):

```
3339 packages/coding-agent
 561 packages/ai
 141 packages/tui
 130 scripts
 112 packages/agent
  87 packages/utils
  33 packages/natives
  24 packages/stats
  15 packages/orchestration-token-benchmark
  13 packages/typescript-edit-benchmark
   2 docs / 1 types / 1 sdk-skills
```

Phân bộ sâu trong `packages/coding-agent` — thư mục lớn nhất toàn repo:

```
1745 test     ← thư mục .ts đơn lẻ lớn nhất của cả repo
1459 src
  48 vendor   (markit-ai 0.5.3, xem § pháp lý)
  34 scripts
  32 examples
  21 bench
```

Vào `src/`:

```
175 src/modes        174 src/sdk       140 src/tools      109 src/web
 92 src/prompts       78 src/cli        73 src/extensibility
 62 src/gjc-runtime   56 src/commit     45 src/session     43 src/commands
 39 src/config        36 src/utils      34 src/runtime-mcp
 28 src/eval          28 src/defaults   25 src/task        21 src/setup
 20 src/discovery     19 src/harness-control-plane
```

So sánh cùng phép đo trên omp: `packages/coding-agent` 2971 `.ts`, `packages/ai` 787, `packages/tui` **622** (gajae chỉ 141), `packages/catalog` 221, `packages/utils` 218, `packages/mnemopi` 145, `packages/omptype` 107.

→ **gajae nhỏ hơn omp ở TUI (141 vs 622) và thiếu hẳn `catalog`/`omptype`/`mnemopi`.** 4459 nhìn có vẻ to nhưng là *nhỏ hơn* omp ở những nơi quan trọng, và *to hơn* chỉ vì test.

---

## 3. Có phần nào là UI không? Bố cục dùng gì? (câu hỏi riêng #3 — liên quan M3)

**Có, nhưng chỉ TUI + một dashboard thống kê. Không có web UI chính thức.**

**TUI** — `packages/tui`: 141 `.ts` (34 file trong `src/`).

```
$ wc -l packages/tui/src/tui.ts packages/tui/src/components/box.ts
 6135 packages/tui/src/tui.ts
  173 packages/tui/src/components/box.ts
```

**Về bố cục (layout): gajae KHÔNG có hệ thống layout.** `ls packages/tui/src/components/` cho ra đúng 18 file, và **không có thư mục `layout/`**:

```
box.ts cancellable-loader.ts editor.ts gajae-pet.ts image.ts input.ts
loader.ts markdown.ts ouroboros-pet-frames.json ouroboros-pet.ts
secret-input.ts select-list.ts settings-list.ts spacer.ts tab-bar.ts
text.ts truncated-text.ts
```

Primitively duy nhất là `box.ts` (173 dòng). Còn omp:

```
$ ls packages/tui/src/components/layout/
geometry.ts  row.ts  split-pane.ts  stack.ts
$ wc -l packages/tui/src/tui.ts packages/tui/src/components/box.ts
 3633 packages/tui/src/tui.ts
  246 packages/tui/src/components/box.ts
```

omp có `layout/{geometry,row,split-pane,stack}` + `scroll-view/`, `scroll-viewport/`, `split-pane`, `form.ts`, `table.ts`, `tree-view.ts`, `wizard-step.ts`, `disclosure.ts`, `key-value-list.ts`, `metric.ts`, `progress-bar.ts`, `menu-selection.ts`, `section.ts`, và `components/composer/` (10 file, có `registry.ts` + các biến thể `claude.ts`/`pi.ts`/`band.ts`/`rail.ts`/`rule.ts`).

→ **Kết luận M3: về bố cục, gajae là bản cũ. Không có gì để học. omp đi trước rõ ràng.**

Thứ duy nhất trong TUI gajae mà omp không có là **thẩm mỹ**: `gajae-pet.ts` (36 KB), `ouroboros-pet.ts` + `ouroboros-pet-frames.json`, và bộ theme `red-claw` / `blue-crab`. Ràng buộc trọng lực rõ.

**Dashboard thống kê** — toàn bộ 15 file `.tsx` của repo nằm ở `packages/stats/src/client/` (App, BehaviorChart, CostChart, ModelsTable, RequestList, …). omp có đúng cùng package, và giàu hơn (`app/AppLayout.tsx`, `app/NavRail.tsx`, `app/TopBar.tsx`, `data/useHashRoute.ts`).

**Cái tên dễ gây hiểu nhầm:** `packages/coding-agent/src/web/` (109 file) **KHÔNG phải UI**. Nó là engine **tìm kiếm/fetch web**: 79 scraper (`scrapers/{github,arxiv,crates-io,huggingface,devto,hackernews,…}.ts`) + 18 search provider (`search/providers/{brave,exa,tavily,kagi,searxng,perplexity,xai,zai,…}.ts`) + `insane/bridge.ts` (port của insane-search).

**Web GUI là của bên thứ ba.** `README.md:22` (nguyên văn):
> **Experimental, community-built third-party project — not an official first-party Gajae-Code app.**

(trỏ tới `github.com/devswha/gajae-code-app`).

**Nhưng có một thứ UI đáng chú ý:** corpus ảnh chụp TUI được commit vào repo tại `.gjc/qa/` — 83 file, 1.622 dòng `.txt`+`.html`, theo lưới **viewport × render-mode**:

```
.gjc/qa/sticky-viewport-5219/capacity-{zero,one,many}/{48x10,80x24,120x36}/{ascii-no-color,unicode-color}/
  → metadata.json · terminal.txt · terminal-ansi.txt · terminal.html
```

`metadata.json` có `schema_version: 2`, `fixture_revision`, `command_or_replay_source` trỏ tới `packages/coding-agent/scripts/capture-sticky-viewport-showcase.ts`, và cả **mảng `resize_probes`** ghi lại cách layout tách phân khi đổi kích thước. Trong `metadata.json` còn viết thẳng chính sách: độ cao bị siết thì bỏ notice → rồi pet trang trí → rồi hook ưu tiên thấp, **không cắt status đã ghim hay composer đang focus**.

omp **không có** thứ này. `git ls-files | grep -icE 'golden|snapshot'` trên omp → 23, nhưng đều là unit snapshot đơn lẻ (`shell-snapshot.test.ts`, `mcp-runtime-snapshot.test.ts`, `crates/pi-edit/tests/fixtures/notebooks/*.golden.json`), **không có lưới multi-viewport × multi-render-mode** trong repo.

---

## 4. Cơ chế plugin/extension? (câu hỏi riêng #4)

Có, và **sau omp, không trước**.

| Phép đo | gajae | omp |
| --- | --- | --- |
| `coding-agent/src/extensibility/**` | **73** file | **71** file |
| `coding-agent/src/capability/**` | không có | **18** file |
| `coding-agent/src/discovery/**` | 20 file | **56** file |

gajae có thêm `src/extensibility/gjc-plugins/` (**25** file) với các mô-đun mà tên rất đáng chú ý về mặt an toàn: `runtime-quarantine.ts`, `subskill-authority.ts`, `mcp-policy.ts`, `constrained-hooks.ts`, `lifecycle-reconciliation.ts`, `validation.ts`. Tương đương phía omp nằm ở `capability/extension.ts`, `capability/extension-module.ts`, `discovery/agent-plugins.ts`, `discovery/claude-plugins.ts`, `discovery/omp-extension-roots.ts`.

`plugins/` ở gajae (12 file) chỉ là **manifest marketplace theo định dạng Claude Code / Codex** để bot bên ngoài cài delegate commands + MCP. omp có `docs/skills/authoring-marketplaces.md` + `docs/skills/examples/mini-marketplace/`.

Skills: gajae bundle 4 skill workflow (`src/defaults/gjc/skills/{deep-interview,ralplan,ultragoal,autoresearch}/SKILL.md`); omp bundle 3 (`.omp/skills/{semantic-compression,system-prompts,tool-prompt-optimization}/`) — và `.omp/commands/` có 5 lệnh.

→ **Không copy gì từ đây. omp đã có, và có rộng hơn.**

---

## 5. Repo Việt Nam / vận hành cộng đồng? (câu hỏi riêng #5)

**Đo được: KHÔNG phải repo Việt Nam.** Nói thẳng vì giả định trong đề bài không đúng.

```
$ git ls-files | grep -iE 'vi[.-]|vietnam|\.vn'          → 0
$ grep -ril 'tiếng việt\|vietnam' --include='*.md' .      → 0
```

Bằng chứng ngược lại:

- Bảo trì: `Yeachan-Heo` (chủ sở hữu, tài khoản cá nhân), `probepark`, `snowykr`, `HaD0Yun`, `IYENTeam` (`MAINTAINERS.md`).
- Bốn bản README khu vực: `README.ja.md` **37 KB**, `README.ko.md` **33 KB**, `README.md` 29 KB, `README.zh-CN.md` 15 KB. Bản Hàn **lớn hơn bản tiếng Anh**; không có bản Việt.

**Phần vận hành thì có thật và đáng học:**

`MAINTAINERS.md` là một văn bản hiếm — nó ghi rõ **tại sao** không dùng được role chuẩn của GitHub org:
> Because `gajae-code` is owned by a personal account, GitHub does not expose the org-only `maintain`/`triage` roles; the closest equivalent is the **write** (push) role…

và chốt chính sách nhánh: **PR hết về `dev`; `main` chỉ dành cho release do maintainer dẫn.**

Hạ tầng còn lại: `.github/CODEOWNERS`, 3 issue template (`bug_report/feature_request/question.yml`), `PULL_REQUEST_TEMPLATE.md`, `SECURITY.md`, `dependabot.yml`, và **6 workflow**: `ci.yml`, `dev-ci.yml`, `pr-validation.yml`, `public-site-sync.yml`, `spoofed-version-sync.yml` + action dựng riêng. Có Discord invite, có `.mailmap` (2.4 KB), có `scripts/install.sh` phân kênh `nightly`.

Quy trình có hệ thống: `.plans/` (4 plan đặt tên theo ngày), `issues/` với `README.md` + kho `archive/` 21 issue đã đóng có đánh số — mô hình "issue archive số hoá thay vì đóng GitHub issue".

---

## PHÁP LÝ (trích nguyên văn)

**Giấy phép: MIT.** `LICENSE` (1.1 KB):

> MIT License
>
> Copyright (c) 2025-2026 Yeachan-Heo and Gajae Code Contributors

Và **cả 15** `packages/*/package.json` đều khai `"license": "MIT"`.

**Nhưng phải đọc `NOTICE.md` — có ba tầng pháp lý khác nhau:**

1. **Dòng dõi từ chính omp.** `NOTICE.md:5`:
   > [`oh-my-pi`](https://github.com/can1357/oh-my-pi) — the upstream red-claw lineage and implementation DNA.

   Nghĩa vụ khi chép: MIT → **giữ nguyên dòng copyright + toàn văn permission notice**. Với nội dung kế thừa trực tiếp từ omp, copyright thuộc về **cả hai phía**; đặt tên riêng không xoá được nghĩa vụ của dòng gốc. `docs/rust-porting/upstream-workspace-deps@a85bd522.toml:3` nguyên văn:
   > `# Copyright (c) the oh-my-pi authors. Licensed under the MIT License.`

2. **MuPDF = AGPL-3.0.** `NOTICE.md` (nguyên văn):
   > PDF extraction uses MuPDF.js, copyright (C) 2004–2026 Artifex Software, Inc., distributed under **GNU Affero General Public License version 3 or later**. MuPDF is provided without warranty; **the repository's MIT license does not replace MuPDF's license.**

   → **Đây là giấy phép hạn chế mạnh. Không được chép dòng nào** trong đường PDF/MuPDF vào omp (omp là MIT, không tương thích AGDL/AGPL). Và chính NOTICE cũng thừa nhận giới hạn:
   > this notice or a successful build check alone is not license clearance.

3. **Vendor còn lại (đều MIT, nhưng có điều kiện):**
   - `insane-search` (MIT) — vendor làm provider search/fetch fallback. `scripts/verify-insane-vendor.ts` (4 KB) chạy kiểm tra vendor.
   - `markit-ai` 0.5.3 (MIT) — 48 file `.ts` trong `packages/coding-agent/vendor/markit-ai`; NOTICE: *"Its license, upstream package metadata, integrity/hash inventory and reproducible patch are retained alongside the vendored code."* Tức là khi chép phải chép **cả** bản vá tái lập được, không chép mỗi file nguồn.

**Kết luận pháp lý:** repo này **là** mã nguồn mở (MIT), nhưng **không đồng nhất** — có một phần AGPL nằm trong đường PDF. Chép bất kỳ thứ gì từ đây về phía omp phải: (a) loại trừ toàn bộ đường MuPDF/PDF; (b) giữ copyright + permission notice MIT; (c) nếu chạm vendor, giữ luôn bản vá + hash inventory.

---

## BẢNG: THỨ omp CHƯA CÓ

| # | Thứ | Vì sao đáng | Cỡ (đo được) | omp đã có tương đương? | Đáng không |
| --- | --- | --- | --- | --- | --- |
| 1 | **Corpus ảnh chụp TUI đa-viewport đa-render-mode commit vào repo** (`.gjc/qa/`) | ôm đúng thứ khó nhất của M3: chứng minh layout không vỡ ở 48×10 lẫn 120×36, ascii lẫn unicode, màu lẫn không màu. `metadata.json` còn máy hóa **thứ tự ưu tiên cắt bỏ** khi thiếu chỗ | **83 file, 1.622 dòng**; 2 script sinh/verify (`capture-sticky-viewport-showcase.ts`, `verify-sticky-viewport-showcase.ts`) | omp: chỉ 23 file golden/snapshot, đều đơn lẻ theo test — **không có lưới** | **Đáng.** Rẻ, tự kiểm chứng, không đụng kiến trúc |
| 2 | **`MAINTAINERS.md` — bảng roster + lý do + chính sách nhánh** | omp sở hữu repo cá nhân y hệt, cũng không dùng được role `maintain`/`triage`. Đây là bài học vận hành đã gặp chứng | **1.3 KB** | omp không có (chỉ có `CONTRIBUTING.md` 101 dòng) | **Đáng.** Gần như miễn phí |
| 3 | **Bus chat ngoài terminal: Telegram/Discord/Slack với giao thức `action_needed`/`reply`** | câu trả lời "agent hỏi lúc 2h sáng" — đúng khoảng trống M3. Đã có `ask` tool nhưng chưa có đường vận chuyển ra ngoài | `src/sdk/bus/**` = **60 file**; `src/daemon/**` = 4; `telegram-daemon.ts`, `discord-daemon.ts`, `slack-daemon.ts`, `notification-orchestration.ts` | `git grep -ril telegram -- packages` trên omp → **0 file**. omp có `blob-broker/daemon.ts` nhưng là blob, không phải chat | **Đáng về khái niệm, KHÔNG đáng về cỡ.** 60 file là cả một hệ thống; chép nguyên khối là tự tạo nợ kỹ thuật không ai bảo trì |
| 4 | **Cổng điều khiển ngoài tiến trình có receipt + lease** (`harness-control-plane/`) | ý tưởng đáng: mọi lệnh điều khiển từ bot/SDK đều để lại **receipt spool** trên đĩa, `session-lease` chống hai owner tranh nhau. Là nền cho #3 mà không cần Telegram | **19 file** (`receipt-spool.ts`, `session-lease.ts`, `state-machine.ts`, `seams.ts`, `classifier.ts`…) | `git grep -ril 'sessionLease\|receiptSpool' -- packages` trên omp → **0** | **Cân nhắc.** Chỉ lấy `receipt-spool` + `session-lease`; cả 19 file là một state machine đầy đủ, quá nặng cho nhu cầu hiện tại |
| 5 | **Skill quy trình 4 bước có gate**: `deep-interview → ralplan → ultragoal` (+`autoresearch`) | khớp trực tiếp "plan trước khi mutate" — mà omp chưa có tên gọi này | **10 file `.md`** trong `src/defaults/gjc/skills/` | `git grep -ril ultragoal\|deep-interview\|ralplan` trên omp → **0 file** (0/154/187 hit) | **Đáng, nhưng nhẹ.** Chỉ là prompt/skill markdown, không kéo theo runtime. `ultragoal` gắn với `gjc-runtime/goal-mode-request.ts` — phần runtime đó thì thôi |
| 6 | **Kho issue đánh số `issues/` + `issues/archive/`** | thay vì đóng GitHub issue, giữ backlog số hoá trong repo | 23 file, 21 issue đã archive có số | omp không có thư mục tương đương | **Tùy.** Chỉ hợp nếu omp muốn backlog sống trong cây; nếu không thì GitHub issue đã đủ |
| 7 | Manifest sinh tự động: `generate-telegram-baseline-manifest.ts`, `generate-sdk-operation-inventory.ts`, `generate-sdk-adapter-parity-manifest.ts`, `run-test-manifest.ts` | ý tưởng tốt: một script sinh ra **bằng chứng bao phủ** thay vì giữ thủ công | 4 script trong tổng 34 script của `coding-agent/scripts/` | omp có script sinh riêng lẻ (`gen-nix-bun.ts`, `gen-bazel-lock.ts`…) nhưng không có nhóm "manifest bao phủ" | **Đáng**, nếu gắn với một bề mặt cụ thể; không chép cả bộ |

---

## DO NOT COPY

1. **Cấu trúc `models.json` phẳng của `packages/ai/`.** Đây là **hồi quy so với chính omp**, không phải bài học. gajae không có `packages/catalog/` và không có file `.kdl` nào (`git ls-files | grep -iE '\.kdl$'` → 0), trong khi omp có **221 file KDL** dưới `packages/catalog/src/compat/rules/{taxonomy,classes,providers,runtime}/`. `AGENTS.md` của omp ghi rõ: *"NEVER hard-code model- or provider-conditional policy in TypeScript… All of it belongs in the KDL rule tree."* Chép cách gajae là **xoá ngược** lớp trừng phạt mà omp đã xây.

2. **Cái monolith `packages/tui/src/tui.ts` — 6.135 dòng.** omp đã tách: cùng file đó chỉ còn 3.633 dòng, và phần còn lại đã đi vào `apps/{git,debug}/` + `components/layout/`. Chép ngược là bước lùi.

3. **Cái SDK 127.978 dòng.** `git ls-files 'packages/coding-agent/src/sdk/*' | wc -l` → 174 file, `wc -l` → 127.978. Một "SDK" 128k dòng là diện tích API công khai khổng lồ và là nghĩa vụ tương thích vĩnh viễn. omp hiện không có `src/sdk/` nào (`git ls-files … | grep -cE '/sdk/'` → 0) và vẫn ổn. Lấy ý tưởng, không lấy khối lượng.

4. **Bất kỳ dòng nào nào trong đường MuPDF/PDF.** AGPL-3.0, và chính `NOTICE.md` nói thẳng MIT của repo **không** thay thế giấy phép đó. omp là MIT. Ranh giới đỏ.

5. **`insane-search` vendored.** MIT nên chép được, nhưng phải chép **kèm** `scripts/verify-insane-vendor.ts` và cả hash inventory. Chép mỗi file provider là tự tạo nợ.

6. **Đừng học theo tinh thần "cái này gajae làm tốt hơn omp".** Vì §0: phần lớn khác biệt là **omp đã đi trước rồi lùi lại không**. Cụ thể đã đo: tui 141 vs 622; extensibility 73 vs 71 nhưng omp thêm `capability/` 18 + `discovery/` 56; thiếu hẳn `catalog`, `omptype`, `mnemopi`, `collab-web`, `metaharness`, `wire`, `snapcompact`, `browser-relay`.

7. **Cách viết README.** Câu *"The default dark TUI identity is the GJC red-claw theme; light-appearance terminals default to the bundled blue-crab theme."* xuất hiện **4 lần** trong `README.md` (dòng 209, 224, 380, 448), và có một heading `## Theme defaults` đứng cạnh một đoạn trùng lặp ngay dưới `## Spend fewer tokens`. Bản `.ja`/`.ko` cũng nhân bản. Đây là bằng chứng biên tập lỏng — nếu omp học "văn phong README" từ đây thì học cả cái lỗi.

---

## UNKNOWNS

1. **Không lấy được lịch sử.** Local clone là **1 commit** đã squash. Không biết gajae bắt đầu từ đâu, ai dùng gì, thay đổi nào là của Yeachan-Heo và thay đổi nào là trôi theo upstream. Đây là giới hạn lớn nhất của audit này — mọi phán đoán "ai nghĩ ra cái gì" đều không kiểm chứng được.
2. **Sai lệch so với pin thật.** `a85bd5228d9f0f619deade1db78fa49420a721e1` là commit của omp tại thời điểm port, **không** phải HEAD hiện tại. Để biết chính xác gajae đã *thêm* gì so với *bỏ* gì thì phải clone `can1357/oh-my-pi` tại đúng pin đó rồi diff — việc này chưa làm.
3. **Chưa đo chất lượng thực tế.** Tỷ lệ 53% test cho biết mật độ, không cho biết test có bắt được lỗi thật hay không. Không có CI run nào được kiểm chứng.
4. **Chưa đọc nội dung `NOTICE.md` về `markit-ai` đủ sâu** để khẳng định bản vá có tái lập được thật hay không.
5. **`.gjc/qa/` chỉ có một fixture** (`sticky-viewport-5219`). Chưa biết đây là chính sách đang được áp dụng rộng hay một trường hợp cá nhân bị commit nhầm. `schema_version: 2` gợi ý có hệ thống, nhưng chỉ thấy một entry.
6. **Chưa xác minh bao nhiêu phần của 60 file `sdk/bus/` thực sự là Telegram/Discord/Slack** so với phần là hạ tầng chung. Con số "60 file" có thể phồng lên vì cả bus trung gian.
7. **Chưa đọc `AGENTS.md` của gajae ở mức từng dòng** (201 dòng, ngắn hơn omp 345) — có thể có điều khoản đáng học, chưa đánh giá.

---

## TÓM LƯỢC CHO M6

gajae-code là **omp đã đổi tên và pin cũ**, không phải một nguồn học độc lập. Vì vậy:

- **Học được (3 thứ, đều nhỏ, đều rẻ):** lưới ảnh chụp TUI đa-viewport ở `.gjc/qa/`; `MAINTAINERS.md`; bốn skill quy trình có gate.
- **Cân nhắc (2 thứ, phải cắt nhỏ trước khi lấy):** `receipt-spool` + `session-lease`; nhóm script sinh manifest bao phủ.
- **Không học (đã có rồi hoặc là hồi quy):** extension system, auth-broker/gateway, session import, TUI layout, mọi thứ liên quan model catalog.
- **Cấm:** toàn bộ đường MuPDF/PDF (AGPL), `insane-search` vendor, `models.json` phẳng, `tui.ts` 6k dòng, SDK 128k dòng.

---

## Bảng quyết định cần bạn chốt

Mỗi hàng là **một quyết định**, không phải một ghi chú. Cột *Điểm đã đo được* chỉ chứa số và đường dẫn truy được về ba file audit; cột *Chọn gì* luôn nêu kèm cái giá.

| # | Quyết định | Điểm đã đo được | Chọn gì, và đánh đổi |
| --- | --- | --- | --- |
| 1 | **Layout cho TUI** — `yoga-layout` một mình, `@opentui/core` trọn vẹn, hay tiếp tục compose string row? | opencode **không tự xây flexbox**: `packages/tui/package.json` khai `@opentui/core` + `@opentui/keymap` + `@opentui/solid`, root `package.json:55-57` ghim **0.5.12**, có `script/upgrade-opentui.ts` riêng. `git ls-files \| grep -iE 'yoga\|flexbox\|flexlayout'` → **rỗng**; `grep -in 'yoga' bun.lock` → rỗng. Toàn luật clamp vỏ ngoài nằm trong `packages/tui/src/ui/layout.ts` = **23 dòng / 6 hằng số**; cặp bắt buộc `flexGrow={1}` + `minWidth={0}` ở `packages/tui/src/app.tsx:1327-1360`. omp: `components/layout/{geometry,row,split-pane,stack}.ts`, `box.ts` 246 dòng, `tui.ts` 3.633 dòng. | **Chọn (iii): tiếp tục compose string row, và chỉ mượn hai thứ rẻ của opencode** — bảng 6 hằng số ở `layout.ts` và quy tắc co-lại dưới ngưỡng nội dung. Cái giá: từ bỏ mọi thứ phái sinh của flexbox và phải tự giữ quy tắc co-lại; `(i)` lẫn `(ii)` đều chưa đo được kích thước vì repo tham chiếu **không có `node_modules`** — đây là "ẩn số lớn nhất của cả M3". **Cổng kiểm trước khi chốt:** layout phải qua lưới đa-viewport 48×10 → 120×36 × ascii/unicode × màu/không màu (hàng 7), vì đó là thứ quyết định, không phải cảm giác. Với `(ii)`, phải tra giấy phép `@opentui/core@0.5.12` **trước khi đánh giá được** — MIT của opencode không phủ dependency của opencode. |
| 2 | **Có học gì từ `gajae-code` không?** | `docs/rust-porting-inventory.md:7` ghim `can1357/oh-my-pi@a85bd522…`; `NOTICE.md:5` gọi đó là "upstream red-claw lineage"; local clone là **1 commit squash**. TUI 141 vs omp 622 file `.ts`; `extensibility/` 73 vs 71 nhưng omp thêm `capability/` 18 + `discovery/` 56; `grep -iE '\.kdl$'` → **0** trong khi omp có 221 file KDL. | **Chọn: có, nhưng chỉ 3 thứ, đều nhỏ.** Nguyên văn kết luận dẫn đầu quyết định này: *"**gajae-code KHÔNG phải người ngang hàng của omp. Nó là chính omp, đã đổi tên, ở một bản pin cũ hơn.**"* → *"**Câu hỏi "học gì từ gajae" phải được đổi thành "học gì từ chính bản cũ của mình, đã đi qua một người khác".** Đây là timeline đảo ngược, không phải so sánh ngang hàng."* Lấy: `.gjc/qa/` (hàng 7), `MAINTAINERS.md` 1,3 KB, 4 skill quy trình 10 file `.md`. **Cái giá:** 2 mục còn lại phải cắt nhỏ trước khi lấy — `receipt-spool` + `session-lease` (trong 19 file), và nhóm script sinh manifest. |
| 3 | **Có lấy snapshot test của codex không?** | **1.429 file `.snap`** = 1.298.261 byte; **1.329 / 1.429 = 93%** nằm trong crate `tui` (1.054 file `.rs` / 425.296 dòng). Dày nhất: `chatwidget` 404, `bottom_pane` 344, `tui/src/snapshots` 189, `tui/src/app` 138. omp: `git ls-files '*.snap' \| wc -l` → **0**, `__snapshots__` → **0**, nhưng có 233 file test trong `packages/tui/test/`. | **Chọn: có, nhưng chọn lọc — bắt đầu từ `bottom_pane` + `chatwidget`**, dùng đúng một mẫu: gộp nhiều trạng thái bằng `states.join("\n\n")` vào **một** assertion, chụp **toàn khung** (composer + status + lịch sử), byte thật sau khi bỏ màu. **Cái giá đo được:** corpus 1.329 file lớn hơn chính code nó bảo vệ; mỗi thay đổi UI có chủ đích là một đợt viết lại hàng loạt file, và mọi snapshot đều có thể bị accept mà không ai đọc. **Đừng bê nguyên 1.329 file.** |
| 4 | **`packages/tui` của omp có thay thế được nếu chọn (ii) ở hàng 1 không?** | opencode `packages/tui` = **454 file / 103.964 dòng** (đã sửa từ con số sai 245/39.771), trong đó `src/mini/` là một **TUI thứ hai**: 40 file / 18.231 dòng. omp `packages/tui` = **622 file `.ts`** và **không có số dòng đo được** trong ba audit này — **con số 189.051 dòng không xuất hiện ở bất kỳ đâu trong ba file audit, nên không thể nêu như một số đã đo**. | **Chọn: (ii) chỉ thay thế được nếu chấp nhận viết lại lớp dựng hình trên renderer + keymap + Solid binding của bên thứ ba.** Cái giá cụ thể: mất toàn bộ quy ước đã có — `components/layout/{geometry,row,split-pane,stack}.ts`, `components/composer/` (10 file, có `registry.ts` + 5 biến thể), `chrome/`; và `tui.ts` đã được rút từ 6.135 xuống 3.633 dòng nhờ tách ra `apps/{git,debug}/` + `components/layout/`, việc đó sẽ bị làm lại. Đổi lại được: layout dọc/nhọn theo breakpoint, và `layout.ts` 23 dòng trở thành tùy chọn thay vì bắt buộc. **Chưa có đủ dữ kiện để chốt** — xem đoạn dưới bảng. |
| 5 | **Hệ chú ý / âm thanh của opencode — có đưa vào không?** | `packages/tui/src/attention.ts` = **189 dòng**; `attention-sounds.{bun,node}.ts` 16 dòng; `audio.ts` 49 dòng; 6 âm `default/question/permission/error/done/subagent_done`; `FocusState = unknown/focused/blurred`; **6 giá trị skip có tên** `focus_unknown/focused/blurred/attention_disabled/renderer_destroyed/empty_message`. omp: `git ls-files \| grep -iE 'attention'` → **rỗng**; `audio.rs` là TTS, `desktop-notify.ts` là thông báo một chiều, `loop-watchdog.ts` 5,2 KB đo **tiến trình có treo không** chứ không đo **người dùng có nhìn không**. | **Chọn: có — nhưng chỉ hai ý, không chép bộ 6 âm.** Ý một: `focus: "unknown"` là trạng thái thật và mặc định là **im lặng**. Ý hai: `notify()` trả về cả lý do bỏ qua, nên hợp đồng test được. **Cái giá:** cần thêm 6 asset âm thanh, một loader chạy theo runtime (`"bun"`/`"node"`), và renderer phải phát `focus`/`blur` — cả ba đều là việc mới. Đổi lại: một hợp đồng có thể assert, hiện omp không có chỗ nào để đặt. Hai hệ này **cộng dồn**, không thay nhau. |
| 6 | **Hợp đồng slot cho TUI plugin — có lấy không?** | `packages/plugin/src/tui/context.ts` = **532 dòng** (`SlotMap` + `SlotClaim` ≈ 90 dòng), `plugin/structure.ts` 159 dòng; 9 slot; `?: never` biến "ghi hai chỗ" thành **lỗi kiểu**. omp: `git grep -ln 'SlotRegistry\|registerSlot\|TuiPlugin'` → **rỗng**; `ExtensionAPI` (`packages/coding-agent/src/extensibility/extensions/types.ts:1256`) chỉ có `registerMessageRenderer` + `ctx.ui`. Hệ sinh thái plugin: opencode 4.236 + 6.510 = **10.746 dòng**; omp `**extension*` = **30.953 dòng**. | **Chọn: lấy hợp đồng (`SlotMap` + `SlotClaim`), không lấy cả hệ plugin.** Đây là thứ đáng học nhất trong repo opencode và là khoảng trống thật của omp. **Cái giá:** phải tự viết cơ chế phân giải slot — nơi slot thực sự được cài đặt là `packages/tui/src/plugin/api.tsx` (381 dòng) của opencode, và audit **chưa đọc file đó**. Nếu lấy cả hai API Promise + Effect (622 dòng adapter) thì đó là nợ kỹ thuần, không phải tính năng. |
| 7 | **Có lấy lưới ảnh chụp đa-viewport của gajae (`.gjc/qa/`) không?** | **83 file / 1.622 dòng** `.txt`+`.html`; lưới `capacity-{zero,one,many}` × `{48x10, 80x24, 120x36}` × `{ascii-no-color, unicode-color}`; mỗi ô có `metadata.json` + `terminal.txt` + `terminal-ansi.txt` + `terminal.html`; `schema_version: 2`, mảng `resize_probes`, và chính sách **thứ tự ưu tiên cắt bỏ** máy hoá trong `metadata.json` (bỏ notice → pet → hook ưu tiên thấp; không cắt status đã ghim hay composer đang focus); 2 script sinh/verify. omp: `grep -icE 'golden\|snapshot'` → **23**, đều là unit snapshot đơn lẻ. | **Chọn: có — đây chính là cổng kiểm mà hàng 1 cần, và là ứng viên đầu tiên nên làm.** Cái giá: repo phình thêm artifact đã sinh phải bảo trì, và `.gjc/qa/` **chỉ có một fixture** (`sticky-viewport-5219`) nên chưa biết đó là chính sách đang áp dụng rộng hay một trường hợp cá nhân bị commit nhầm — cần sinh thêm ít nhất một fixture thứ hai trước khi coi là chuẩn. |
| 8 | **Sandbox — có xây không, và nếu xây thì tách thế nào?** | omp **không có** sandbox ở tầng OS: `grep -i sandbox` chỉ ra `python/robomp/src/sandbox.py` (quản lý worktree, không gọi kernel), `file-write-fallback.ts`, và một tên trong protobuf vendored của Cursor. codex có **9 crate**: `sandboxing` 24 file/10.469 dòng, `linux-sandbox` 31/12.747, `windows-sandbox-rs` 114/28.762, `network-proxy` 62/29.919, `execpolicy` 13/2.975; **4 hồ sơ `.sbpl` = 343 dòng**. | **Chọn: chưa xây trong M6 — nhưng nếu xây thì `FileSystemSandboxPolicy` và `NetworkSandboxPolicy` phải là hai trục độc lập ngay từ đầu**, không gộp làm một rồi tách sau. Cái giá của việc trì hoãn: một enum đơn lẻ sẽ thành nợ kỹ thuật ngay khi người ta thêm chặn egress. Còn `network-proxy` 29.919 dòng là công cụ egress doanh nghiệp — **bỏ qua, ngoài phạm vi sản phẩm cá nhân**. |
| 9 | **`execpolicy` — có mang `match`/`not_match` + `justification` sang không?** | Crate `execpolicy` = 13 file / **2.975 dòng**. Nguyên văn README: `match`/`not_match` *"supply example invocations that are validated at load time (think of them as unit tests)"*; `justification` bắt buộc cho lệnh cấm, ví dụ `"Use jj instead of git."`. omp đã có một nửa: `packages/coding-agent/src/tools/bash-interceptor.ts` biên dịch `BashInterceptorRule` → `RegExp` và bỏ qua regex hỏng — nhưng để **chuyển hướng tool**, không phải để **ra quyết định an toàn**. | **Chọn: mang hai ý vào luật của interceptor, không dựng cả `execpolicy`.** Cái giá: luật sẽ mang bằng chứng theo mình, nên phải cập nhật ví dụ mỗi khi luật đổi — đổi lại regex viết sai **fail-closed ngay lúc load** thay vì im lặng, và cấm một lệnh luôn kèm đường thoát. Không đụng enum `AskForApproval` của codex: nó phá `docs/approval-mode.md` cùng 1.482 dòng test đang đúng. |
| 10 | **`session-ui` — có tách projection khỏi detail không?** | `packages/session-ui` = **174 file / 31.333 dòng**, tách `timeline/projection` (chiếu) khỏi `timeline/detail` (trình bày). omp chưa có khái niệm này. | **Chọn: đọc để học, không chép.** Bài học là *tách chiếu khỏi trình bày* — 5 từ, không phụ thuộc stack. **Cái giá của việc chép:** 31k dòng phụ thuộc Solid và stack web, trong khi omp không có web UI chính thức. Chỉ nên mở lại nếu omp tự tạo ra một frontend web thứ hai. |

Bằng chứng cụ thể nhất đằng sau hàng 1 — toàn bộ thuật toán layout vỏ ngoài của opencode, nguyên văn `packages/tui/src/ui/layout.ts` (23 dòng):

```ts
export const SESSION_SIDEBAR_WIDTH = 42
export const SESSION_TABS_COMPACT_WIDTH = 5
export const SESSION_TABS_COMPACT_BREAKPOINT = 12
export const SESSION_SIDEBAR_MAX_WIDTH = 72
const SESSION_CONTENT_MIN_WIDTH = 44
const SESSION_CONTENT_PREFERRED_WIDTH = 64
```

---

**Đã đo được, không còn là câu hỏi nữa.** (1) opencode **có** flexbox và dùng nó rất nhiều (`flexDirection` xuất hiện ở hàng chục site trong `packages/tui`) — nó chỉ không chứa engine trong repo mình; tiền đề "opencode không có flexbox nên ta phải tự xây" sai ở chỗ quan trọng nhất. (2) `packages/tui` của opencode là **454 file / 103.964 dòng**, không phải 245/39.771. (3) codex **là** Codex của OpenAI (origin trùng tên, `Copyright 2025 OpenAI` trong cả LICENSE lẫn NOTICE), Apache-2.0 nên chép được — nhưng 758 file `.ts/.tsx` trong đó **734 là sinh tự động**, chỉ 24 file tay viết trong `sdk/typescript`. (4) Ranh giới ngôn ngữ của omp là quyết định đúng và **không nên di chuyển**: `core` + `tui` của codex là 851K dòng để đổi ngôn ngữ chứ không đổi contract. (5) Approval của omp đã hoàn chỉnh — 3 tầng tool, 3 chế độ, 1.482 dòng test. (6) omp đã đi trước ở model catalog (222 file KDL kiểm toán được, so với blob JSON 405 KB của codex và `models.json` phẳng của gajae). (7) Mật độ test của gajae là 53% file / 48% dòng, nhưng đó là mật độ chứ không phải chất lượng.

**Chưa đo được — đừng tưởng đã biết.** (1) **Giấy phép `@opentui/core@0.5.12` chưa kiểm chứng**: repo tham chiếu không có `node_modules`, và MIT của opencode không phủ dependency của opencode. (2) **`@opentui/core` làm gì ngoài flexbox** — có renderer riêng không, bundle bao nhiêu, có thay thế được `packages/tui` của omp không. Đây là ẩn số lớn nhất của cả M3, và hàng 1 + hàng 4 **không thể chốt** khi nó còn nguyên. (3) **Con số 189.051 dòng cho `packages/tui` của omp không truy được về ba audit**; ba file chỉ đo được 622 file `.ts`, không có số dòng — đừng dùng 189.051 làm mốc so sánh cho tới khi đo lại. (4) codex `code-mode` (4 crate, 104 file, ~30K dòng) **chưa được đánh giá** — nếu đúng nghĩa là thay tool-call bằng code, đây là ứng viên milestone lớn. (5) `ext/` của codex (17 crate con, 275 file) chưa đo API surface, nên chưa biết là plugin mở rộng bên ngoài hay nội bộ. (6) Chênh lệch thật giữa gajae và pin `a85bd522` **chưa diff**; local clone là 1 commit squash nên không phán đoán được ai nghĩ ra cái gì. (7) Tỉ lệ test của crate `core` codex chưa đo; môi trường đo chỉ là checkout Darwin, chưa hành vi Windows sandbox hay WSL.

---

## Định nghĩa hoàn thành và những điều chưa được kiểm chứng

Phần KẾT của kế hoạch M6. Đọc sau ba audit (`sections/opencode.md`, `sections/codex.md`, `sections/gajae.md`).

---

## Định nghĩa hoàn thành

M6 là milestone **nghiên cứu**. Nó không thêm dòng code nào, nên "xong" không thể có nghĩa là test xanh hay build qua. "Xong" có nghĩa là: **một maintainer lạ, không hỏi tác giả, chạy lại được mọi thứ tài liệu nói và ra cùng kết luận.** Dưới đây là bốn điều kiện, mỗi điều kiện đều kiểm được bằng thao tác cụ thể.

### A. Mọi claim phải có lệnh tái lập được

Một *claim* là bất kỳ câu nào trong ba audit có con số hoặc khẳng định có/không. Mỗi claim phải đi kèm **một lệnh shell dán được, chạy trong đúng repo đó, cho ra đúng con số đó**. Không lệnh ⇒ claim chưa tồn tại, bất kể nó đúng hay sai.

Quy tắc kiểm: đọc tài liệu, lấy từng con số, tìm lệnh của nó. Claim nào phải đoán mới lệnh thì chưa đạt.

**Chuyện này hiện đang hỏng, và tệ hơn tưởng — không phải vì thiếu lệnh, mà vì thiếu lệnh đã sinh ra mâu thuẫn nội tại.** Trong `opencode.md`, §4 và §5 là hai bảng cùng nội dung nhưng lệch số ở bốn chỗ, và **không bảng nào có cột lệnh**:

| Package | §4 (dòng 273-279) | §5 (dòng 291-306) | Chênh |
| --- | --- | --- | --- |
| `session-ui` | 174 file | 147 file | 27 |
| `desktop` | 397 file | 217 file | 180 |
| `plugin` | 71 file *(§3, **có lệnh**)* | 63 file | 8 |
| `tui` | 454 file *(§0, **có lệnh**)* | 455 file | 1 |

Hai trong bốn giá trị trên có lệnh, và lệnh nằm ở §0/§3 chứ không ở §4/§5. Nghĩa là: người đọc §5 không có cách nào biết 63 hay 71 là đúng, và không cách nào biết vì sao §4 với §5 không khớp. Một tài liệu nghiên cứu tự mâu thuẫn ở cột số thì mọi kết luận dựa trên cột số đó cũng mất phần đáng tin.

Đóng điều kiện A nghĩa là: **mọi dòng số trong mọi bảng phải mang theo lệnh của nó**, không phải chỉ bảng §0.

### B. Mọi kết luận "đáng mang về" phải có số đo kích thước

"Đáng mang về" là một claim của cùng loại, nhưng nặng hơn: nó đề xuất cắt vài chục nghìn dòng của repo khác vào omp. Không có số đo thì đó là ý kiến, không phải kết luận nghiên cứu.

Một dòng quyết định chỉ đạt khi nó có **ba** số:

1. **Cỡ bên nguồn** — bao nhiêu file / bao nhiêu dòng, đo bằng lệnh.
2. **Cỡ tương đương bên omp** — omp đã có tương đương chưa, và lệnh chứng minh là không.
3. **Số phải cắt bỏ** — nếu phải "đọc để học, đừng chép" thì cắt ở đâu; nếu chép nguyên khối thì bao nhiêu dòng nợ kỹ thuật sẽ phát sinh.

Cột "Cỡ" thiếu ở đúng một dòng ngay bây giờ: `codex.md` §6 mục 4 (`justification` bắt buộc kèm lệnh cấm) ghi *"một trường trong `prefix_rule`"* — đó là mô tả, không phải số đo, và mục đó cũng là mục duy nhất trong tám mục không kèm lệnh `git grep` chứng minh omp chưa có.

Ba con số trên chỉ có ý nghĩa nếu chúng cùng một đơn vị. `opencode.md` §3 nói `packages/plugin` + `packages/tui/src/{plugin,feature-plugins}` = 4.236 + 6.510 dòng rồi cộng thành 10.746 — đúng, nhưng cột "File" của cùng bảng đó lại không cộng (71 + 34 = 105, không được ghi ra). Quy ước: **mọi tổng phải cho cả số dòng và số file, hoặc ghi rõ là chỉ cộng dòng.**

### C. Mỗi quyết định ở bảng quyết định phải có câu trả lời

Ba bảng quyết định, tổng cộng **22 dòng**:

| Bảng | Vị trí | Số dòng |
| --- | --- | --- |
| `things_omp_lacks` | `opencode.md` §8 | 7 |
| Đáng / Không đáng | `codex.md` §6 | 8 |
| Thứ omp chưa có | `gajae.md` (bảng sau mục pháp lý) | 7 |

Mỗi dòng phải kết thúc bằng **một trong ba phán quyết đóng**: `lấy` / `không lấy` / `chờ — chờ sự kiện X, người phụ trách Y`. "Chờ" là phán quyết hợp lệ, nhưng phải **có tên sự kiện và tên người**; không có tên thì "chờ" chỉ là cách viết mềm của "chưa biết".

Hiện trạng: **2 trên 22 dòng chưa có câu trả lời** — `opencode.md` §8 dòng 4 (`flexGrow` + `minWidth`) ghi "Tùy" và `gajae.md` dòng 4 (`receipt-spool` + `session-lease`) ghi "Cân nhắc". Cả hai đều đang đợi cùng một quyết định chưa có: **M3 chọn hay không thêm flexbox**. Đó là một sự kiện có tên (quyết định layout của M3), nên điều kiện C có thể đóng bằng cách viết lại hai ô đó thành `chờ — M3 chốt layout` thay vì để là "Tùy".

Thêm một ràng buộc nhỏ nhưng đáng: cột phán quyết hiện dùng **sáu cách viết khác nhau cho bảy dòng** ("Có", "Có, rẻ", "Tùy", "Đọc để học, không chép", "Đọc `README`, đừng chép code", "Không"). Không đọc được bằng mắt thì không lọc được bằng máy, và người đọc phải tự dịch mỗi ô về ba giá trị gốc. Chốt một enum và bỏ phần chú thích vào cột kế bên.

### D. Điều kiện để biết tài liệu này còn đúng

> **Quy tắc 90 ngày.** Tài liệu này còn đúng **khi và chỉ khi** một maintainer chạy *danh sách kiểm* — một khối lệnh cố định, kèm sẵn output kỳ vọng — và **không dòng nào lệch**. Lệch một dòng là tài liệu đã cũ, kể cả khi phần còn lại vẫn đúng.

Danh sách kiểm phải phủ đúng bốn nhóm, ước khoảng 15 lệnh:

1. **Ba HEAD** (mục "Những điều chưa được kiểm chứng" bên dưới). Lệch ⇒ mọi số đo cũ, phải đo lại.
2. **Năm số đo lớn nhất mỗi repo** — tổng LOC, tổng file, tỉ lệ test, số crate/package, tỉ lệ LOC nằm ngoài phạm vi agent. Đây là các số mà kết luận "repo to vì là cả công ty" đứng trên.
3. **Ba lệnh âm tính trên omp** — `git ls-files | grep -i attention` (rỗng), `git ls-files '*.snap' | wc -l` (0), `git ls-files | grep -icE 'golden|snapshot'` (23). Ba cái này là **tiền đề của ba khoảng trống** mà M6 kết luận là omp đang thiếu. Chúng từng đúng; chúng sẽ hỏng vào đúng ngày omp thêm thứ đó — và khi đó tài liệu phải hỏng theo, im lặng là sai.
4. **Hai lệnh pháp lý** — `LICENSE`/`NOTICE` của cả ba repo, và kiểm tra `AGPL`/`MuPDF` trong `gajae` (xem dưới).

Hình dạng nó phải có — toàn bộ lệnh dưới đây đã được chạy ít nhất một lần trong lúc audit, chỉ là chưa gom lại:

```bash
# 1. ba HEAD — chạy trong từng repo tham chiếu
git -C <repo> rev-parse --short HEAD

# 2. năm số đo lớn mỗi repo
git -C <repo> ls-files '*.ts' '*.tsx' | wc -l
git -C <repo> ls-files '*.ts' '*.tsx' | xargs wc -l | tail -1
git -C <repo> ls-files '*.snap' | wc -l

# 3. ba lệnh âm tính trên omp — tiền đề của ba khoảng trống
git ls-files | grep -ci attention                     # 0
git ls-files '*.snap' | wc -l                          # 0
git ls-files | grep -icE 'golden|snapshot'             # 23

# 4. hai lệnh pháp lý
git -C <repo> ls-files | grep -iE '^(LICENSE|COPYING|NOTICE)'
git -C <gajae> grep -ri 'agpl\|mupdf' -- NOTICE.md
```

Điều kiện này **chưa được đạt**: các lệnh hiện nằm rải rác trong ba file, không có khối tập trung nào, và **cột output kỳ vọng còn trống** ở mọi dòng. Việc cần làm là gom chúng thành một khối ~15 dòng và **đính kèm output** — không phải chỉ ghi lệnh.

Có một loại thứ **không bao giờ cũ** và không cần nằm trong danh sách kiểm: **ranh giới pháp lý**. MuPDF là AGPL-3.0 nên đường PDF của `gajae` là vùng cấm tuyệt đối với omp (MIT) — đúng cho tới khi `NOTICE.md` của họ đổi. `NOTICE` của `codex` ghi công Ratatui theo MIT, nên phần mượn từ đó là `Apache-2.0 + giữ phần Ratatui` — đúng cho tới khi `NOTICE` đổi. Dòng `Copyright (c) the oh-my-pi authors` trong `docs/rust-porting/` của `gajae` là bằng chứng rằng tên riêng không xoá được nghĩa vụ dòng gốc. Ba điều này là **kết luận**, không phải số đo: chúng đúng hoặc sai theo văn bản giấy phép, không trôi theo commit.

---

## Những điều chưa được kiểm chứng

Mục này ngắn vì nó nên ngắn. Nhưng nó là mục quan trọng nhất của cả milestone.

**Không hành vi nào được chạy.** Cả ba audit là **phân tích tĩnh trên cây nguồn tại một commit**: đếm file, `wc -l`, `grep`, đọc file, `head`. Không build, không chạy test, không chạy binary, không dựng lại một `.snap` nào của `codex`, không render một khung hình TUI nào. Các khối code trích trong ba audit đều là **kết quả `head`/`cat`**, không phải output của chương trình. Và cả ba claim dạng "omp đang thiếu X" đều dựa trên `grep` — nên chúng chứng minh *không tìm thấy*, không chứng minh *không tồn tại*; một tính năng đặt tên khác vẫn thoát.

**HEAD đã dùng để đo** — số liệu sẽ trôi khi các repo đó phát triển:

| Repo | HEAD | Ngày |
| --- | --- | --- |
| `opencode` (`anomalyco/opencode`) | `39021df` | — |
| `codex` (`openai/codex`) | `e72da2b53805…` (#48353) | 2026-09-26 |
| `gajae-code` (`Yeachan-Heo/gajae-code`) | `5c5231418930673e42cc5d08ebe4376e03187533` | 2026-09-26 01:26:07 +0900 |

Phía omp thì **yếu hơn nữa**: ba file audit không ghim commit nào của chính repo này, mọi số đo bên omp lấy từ cây nguồn cục bộ ở nhánh `milestone-1`. Đó là khoảng trống của chính tài liệu, không phải của người đo.

**`@opentui/core`.** Giấy phép đã được xác nhận **MIT qua metadata npm và README** — nhưng đó là tầng bằng chứng yếu hơn việc đọc `LICENSE` trong một bản cài. Và **chưa ai thử cài nó**. Chưa biết nó chạy được trong omp hay không: có thay thế được `packages/tui` không, bundle bao nhiêu, đụng native addon nào. Đây là **cổng đầu tiên phải đóng trước khi chốt bất kỳ layout nào** — vì `opencode.md` §0 đã sửa tiền đề của M3: opencode không phải "không có flexbox", nó **mua** flexbox từ `@opentui/core@0.5.12`. Lưu ý mâu thuẫn chưa giải quyết: `opencode.md` §9 mục 1-2 vẫn ghi giấy phép này là *chưa biết*; nếu tầng metadata là đủ thì phải sửa §9, nếu không thì mục "Những điều chưa được kiểm chứng" ở trên đang nói quá.

**Cổng kiểm của M3 (`bun test packages/tui`) còn bị chặn một phần bởi native addon.** Hệ quả trực tiếp: con số "omp: 0 file snapshot, 233 file test" mới chỉ mô tả **cây nguồn**, chưa chứng minh 233 file test đó chạy xanh. Nên chiến lược snapshot mà `codex.md` §6 khuyến nghị **chưa thể kiểm chứng là chạy được** cho tới khi cổng này mở.

**Có tìm ra điều gì trong `unknowns` không — có, 21 mục (7 mỗi audit).** Rút gọn còn những cái có khả năng đổi kết luận:

- *opencode*: chưa đọc `packages/tui/src/plugin/api.tsx` (381 dòng) — tức **chỉ đọc hợp đồng slot, chưa đọc cơ chế phân giải**; phạm vi `merman` so với bản Rust của omp chưa đối chiếu; 17 `AGENTS.md` của opencode chưa xem như một mẫu kỷ luật agent.
- *codex*: `code-mode` (4 crate, 104 file, ~30k dòng) **chưa xác minh là gì** — tên gợi ý thay tool-call bằng code; nếu đúng thì đây là ứng viên milestone lớn chưa được đánh giá. Môi trường đo **chỉ là checkout Darwin**, nên Windows sandbox (114 file) và WSL chỉ được biết qua tên file. Chưa đo tỉ lệ test của `core`.
- *gajae*: clone cục bộ là **squash 1 commit** — không suy ra được ai nghĩ ra cái gì, và chưa diff với pin thật `a85bd522…`, nên không phân biệt được gajae *thêm* gì với *xoá* gì. Chưa kiểm chứng CI run nào; tỷ lệ 53% test nói ra **mật độ**, không nói ra test có bắt được lỗi thật không. `.gjc/qa/` chỉ có **một fixture** — chưa biết là chính sách hay một ca commit nhầm.

Không có claim nào trong ba audit khẳng định hành vi runtime, hiệu năng, hay chất lượng test mà không kèm cảnh báo ở trên.
