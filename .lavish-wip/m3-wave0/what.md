# M3 Wave 0 — *what*: UX mà CCB có và omp chưa có

**Câu hỏi duy nhất của wave này:** về mặt TRẢI NGHIỆM, CCB làm gì mà omp chưa làm?
Không mở lại pháp lý, không mở lại kiến trúc. Đo bằng lệnh, ghi kết quả, không đoán.

- **Nguồn (CCB):** `/Users/tranquangdang21/Projects/claude-code-ref` — 3549 file tracked, 2551 `.ts` + 701 `.tsx`
- **Đích (omp):** `/Users/tranquangdang21/Projects/ultraworkers` — 17 package, `packages/tui/src` 373 file `.ts`, `packages/coding-agent/src/modes` 67 file `.ts`

> **Ranh giới clean-room đã tôn trọng ở toàn bộ file này.** Mọi phát hiện bên dưới là *tên file*,
> *số dòng*, và *hành vi quan sát được* — không có dòng code nào của CCB được chép lại. Các
> "clean-room note" nêu ý tưởng bằng ngôn ngữ của omp.

---

## 0. Kiểm lại những gì briefing đã đo (đừng tin mù)

| Khẳng định của briefing | Lệnh | Kết quả |
|---|---|---|
| `@anthropic/ink` là workspace fork | `grep '"@anthropic/ink"' package.json` | `:91 "workspace:*"` — **đúng** |
| react 19.2.5 / react-reconciler 0.33.0 | `grep -E '"react"\|"react-reconciler"'` | `:187 ^19.2.5`, `:189 ^0.33.0` — **đúng** |
| Không có file LICENSE | `git ls-files \| grep -icE '^licen[sc]e'` | **0** — đúng |
| `CellBuffer` = 0 hit | `grep -rilE "cellbuffer\|cell-buffer" --include=*.ts --include=*.tsx .` | **0 file** — đúng |
| `src/components` = 418 | `git ls-files 'src/components/**' \| wc -l` | **418** — đúng |
| `src/utils` = 773 | `git ls-files 'src/utils/**' \| wc -l` | **781** — lệch +8 (drift) |
| `src/commands` = 392 | `git ls-files 'src/commands/**' \| wc -l` | **400** — lệch +8 (drift) |
| omp không có `registerStatusLineSegment` | `grep -rn "registerStatusLineSegment" packages/` | **0 hit** — đúng |

**Điều đáng chú ý nhất trong toàn bộ briefing:** không có mục nào sai về kết luận. Hai
con số lệch 8 là do cây đã lớn thêm sau lúc đo, không phải sai.

---

## 1. Nhóm tên component của CCB → omp đã có chưa

Đọc **tên** thôi (`git ls-files`, không mở nội dung), nhóm theo 5 trục đề bài nêu.

### 1.1 Trình bày khung hội thoại (message framing)

CCB có 45 file trong `src/components/messages/` + các file top-level:

```
AssistantTextMessage · AssistantThinkingMessage · AssistantRedactedThinkingMessage
AssistantToolUseMessage · UserBashInputMessage · UserBashOutputMessage · UserCommandMessage
UserChannelMessage · UserCrossSessionMessage · CompactBoundaryMessage · SnipBoundaryMessage
GroupedToolUseContent · CollapsedReadSearchContent · HighlightedThinkingText
Message · Messages · MessageRow · MessageSelector · MessageActions · MessageModel
MessageResponse · messageActions · MessageTimestamp · Messages

DiffDetailView · DiffDialog · DiffFileList · StructuredDiff · StructuredDiffList · colorDiff
HighlightedCode · Markdown · MarkdownTable
```

**Kết luận: omp ĐÃ CÓ, và không kém.** `packages/tui/src/chat/` có 34 file — đối chiếu
từng cái tên: `assistant-message.ts` (50 KB) `user-message.ts` `thinking-display.ts`
`read-tool-group.ts` (28 KB — tương đương `GroupedToolUseContent` + `CollapsedReadSearchContent`)
`compaction-summary-message.ts` (= `CompactBoundaryMessage`) `hook-message.ts`
`advisor-message.ts` `skill-message.ts` `late-diagnostics-message.ts` `reaction.ts`.
`packages/tui/src/components/markdown.ts` (150 KB) và `latex-block.ts` vượt xa CCB.
Render diff: `packages/tui/src/render/tool-card.ts` + `output-block.ts`.

→ **KHÔNG port.** Đây là nhóm tốn công nhất mà omp đã thắng.

### 1.2 Trạng thái tiến trình (progress) — **ĐÂY LÀ KHOẢNG TRỐNG THẬT**

CCB có `src/components/Spinner/` — **13 file**:

```
FlashingChar · GlimmerMessage · ShimmerChar · SpinnerAnimationRow · SpinnerGlyph
TeammateSpinnerLine · TeammateSpinnerTree · teammateSelectHint
useShimmerAnimation · useStalledAnimation · types · utils
```

Đây không phải "một spinner". Đây là **một máy trạng thái cảm xúc của tiến trình**. Đọc
`useStalledAnimation.ts` (75 dòng) cho ra cơ chế:

| Hành vi | Dòng | Ý nghĩa UX |
|---|---|---|
| `const isStalled = timeSinceLastToken > 3000 && !hasActiveTools` | `:42` | 3 giây không có token mới **và không có tool đang chạy** → coi là treo |
| `const intensity = isStalled ? Math.min((timeSinceLastToken - 3000) / 2000, 1) : 0` | `:43-46` | leo dần 0→1 trong 2 giây, không nhảy đột ngột |
| `if (hasActiveTools) { timeSinceLastToken = 0 }` | `:31-33` | **tool đang chạy thì KHÔNG báo treo** — spinner vẫn chạy bình thường |
| `current += diff * 0.1` | `:59` | exponential smoothing mỗi tick 50 ms, không nhấp nháy |
| `!reducedMotion && (intensity > 0 \|\| …)` | `:51` | tôn trọng giảm chuyển động — bật thì chuyển thẳng, không mượt |

Và `useShimmerAnimation.ts:16` thêm một điều nữa: `useAnimationFrame(isStalled ? null : glimmerSpeed)`
— khi `isStalled`, nó **truyền `null` để hủy đăng ký** (comment `:11-15` giải thích: nếu không,
`setInterval` vẫn quay 20 fps cho một thứ đã chết).

**omp không có gì tương đương.** `packages/tui/src/components/loader.ts` là một bộ quay
frame thuần: `#frames = ["⠋","⠙",...]`, `#intervalId`, `MAX_BACKPRESSURE_FRAME_COST_MS`.
Không biết token có đến không, không biết đã đứng im bao lâu.

- `grep -rniE "noToken|tokenStall|lastToken|waitingOn|idleSince" packages/tui/src packages/coding-agent/src` → **0 hit có nghĩa**
- `packages/tui/src/loop-watchdog.ts` **không phải** là thứ này. Đọc header (dòng 36-50): nó đo
  **event-loop lag** để chẩn đoán hiệu năng, tag theo phase. Đó là instrumentation cho dev,
  không phải thứ người dùng nhìn thấy.
- `grep -rliE "reducedMotion" packages/` → chỉ trong `export/html/template.css` và
  `tools/browser/emulation.ts`. **TUI không có khái niệm `reducedMotion` nào.**

→ **KHOẢNG TRỐNG #1 — đề xuất port mạnh nhất của wave này.**

> **Clean-room note:** ý tưởng "3 giây không token thì báo người dùng, nhưng tool đang chạy
> thì không báo" là một quy tắc trải nghiệm, không phải bản dịch. Cổng thời gian 3s/2s là
> **tham số tuning của CCB** — `what.md` này ghi nhận nó để M3 có thể tự chọn con số khác.

### 1.3 Chỉ dấu (hints / affordances)

CCB: **9 component có "hint" trong tên** — `ConfigurableShortcutHint`, `SearchExtraToolsHint`,
`SessionBackgroundHint`, `SandboxPromptFooterHint`, `useShowFastIconHint`, `useSwarmBanner`,
`teammateSelectHint`, `PluginHintMenu`, `design-system/KeyboardShortcutHint`.
Cộng `IssueFlagBanner`, `Notifications`, `PressEnterToContinue`, `OffscreenFreeze`.

**Kết luận: omp ĐÃ CÓ.** `packages/tui/src/prompt/welcome.ts` nhúng `tips.txt` lúc build
và mở rộng placeholder phím lúc render (`expandTipKeys`, `formatKeyHint`).
`packages/tui/src/chrome/keybinding-hints.ts`, `key-hint-format.ts`, `hotkeys-markdown.ts`.

→ **KHÔNG port.**

### 1.4 Phím tắt (keybindings)

**Kết luận: omp ĐÃ CÓ, mạnh hơn.** CCB: `src/keybindings/` 15 file, `defaultBindings.ts`
chứa **một context duy nhất** làm scroll:

```
src/keybindings/defaultBindings.ts:209-214
  pageup:   'scroll:pageUp'      pagedown: 'scroll:pageDown'
  wheelup:  'scroll:lineUp'      wheeldown:'scroll:lineDown'
  'ctrl+home': 'scroll:top'      'ctrl+end': 'scroll:bottom'
```

omp: `app-keybindings.ts` (21 KB) + `keybindings.ts` + `keys.ts` (17 KB) +
`keybinding-matchers.ts`, có action `app.tools.expand` mặc định `ctrl+o`
(`app-keybindings.ts:133`) và cơ chế **context-sensitive rebind** — `input-controller.ts:388`
cho phép cây selector hấp thụ `ctrl+o` khi overlay đang mở.

→ **KHÔNG port.**

### 1.5 Chữ nghệa (semantics: theme, màu, a11y) — **KHOẢNG TRỐNG #2**

CCB: `src/components/ThemePicker.tsx:75-90` — **7 lựa chọn theme** (`:78` và `:82` là hai `daltonized`):

```
Dark mode · Light mode
Dark mode (colorblind-friendly)  -> 'dark-daltonized'
Light mode (colorblind-friendly) -> 'light-daltonized'
Dark mode (ANSI colors only)     -> 'dark-ansi'
Light mode (ANSI colors only)    -> 'light-ansi'
```

Và `src/utils/theme.ts` có **7 dòng ghi chú `for deuteranopia`** (`:362 :380 :382 :419
:524 :544 :581`) phủ **16 chỗ gán màu** — tức CCB **chỉnh tay từng màu ngữ nghĩa** ở 7 khối
theme: `claude`, `success`, `warning`, `briefLabelClaude` được dời sang dải hue khác
(cam→xanh dương, xanh lá→xanh dương).

**omp ĐÃ CÓ `colorBlindMode` — nhưng chỉ chạm đúng MỘT token.** Đọc `packages/tui/src/theme/loader.ts:145-159`:

```ts
const COLORBLIND_ADJUSTMENT = { h: 60, s: 0.71 };
if (colorBlindMode) {
    const added = resolvedColors.toolDiffAdded;
    if (typeof added === "string" && added.startsWith("#")) {
        resolvedColors.toolDiffAdded = adjustHsv(added, COLORBLIND_ADJUSTMENT);
    }
}
```

Một token. `success`, `statusLineGitClean`, `error` vẫn xanh lá. Người đọc mù màu đỏ–lục
vẫn không phân biệt được "dòng diff được thêm" với "tick thành công". Ngoài ra omp có
**102 theme** (`ls packages/tui/src/theme/defaults | wc -l` → 102) trong khi CCB có 5–7.

→ **KHOẢNG TRỐNG #2 (một phần).** Đây chính là việc `M3-A9` / `s6` đã ghi — đo lại xác nhận
nó đúng và phạm vi đúng: **mở rộng từ 1 token lên ~5 token ngữ nghĩa**, có contrast harness.
Không cần port theme mới của CCB; cần *cơ chế* remap đúng hơn.

---

## 2. Ba thứ M3 đã gọi tên — trả lời thẳng

### 2.1 "Tăng tốc cuộn chuột (wheel acceleration)" — ❌ **CCB KHÔNG CÓ. M3-A3 là phát minh của omp, không phải port.**

Bằng chứng:

1. `src/keybindings/defaultBindings.ts:211-212` — `wheelup: 'scroll:lineUp'`, `wheeldown: 'scroll:lineDown'`.
   **CCB cuộn đúng 1 dòng mỗi notch.** Không hệ số, không nhân, không tăng tốc.
2. `grep -rnE "wheel|Wheel" --include=*.ts --include=*.tsx src/` → 16 file. Đọc từng cái:
   - `keybindings/defaultBindings.ts:211-212` — binding 1:1
   - `utils/fullscreen.ts` (`:47 :92 :118 :145 :171 :195`) — **không phải** tăng tốc, mà là
     **dò tìm khả năng terminal rồi degrade**
   - `components/FullscreenLayout.tsx:113 :126 :137 :143 :171` — xử lý sự kiện bị đua
     (momentum wheel, wheel-up ở `scrollTop=0`)
   - `utils/computerUse/*` — điều khiển chuột cho **browser từ xa**, không liên quan TUI

3. **Điều CCB thực sự làm — và omp thiếu — là phần dò khả năng terminal.**
   `src/utils/fullscreen.ts:180-195`, hàm `maybeGetTmuxMouseHint()`:
   - `:181` nếu `$TMUX` không set → không làm gì
   - `:191` chạy `tmux show -Av mouse` (timeout 2000 ms), `-A` để lấy giá trị có hiệu lực
   - `:195` nếu `mouse` ≠ `on`, trả về chuỗi:
     > `tmux detected · scroll with PgUp/PgDn · or add 'set -g mouse on' to ~/.tmux.conf for wheel scroll`
   - Bật **một lần mỗi session** (`:184-185` cờ `checkedTmuxMouseHint`), fire-and-forget từ REPL startup.
   - Và comment `:169-179` giải thích **tại sao KHÔNG tự sửa**: đã thử `tmux set mouse on`, nó
     đổi hành vi chuột cho **mọi pane anh em** (vim, less, htop) và rò rỉ khi kill-pane. Giờ
     để người dùng tự quyết — cùng cách vim/less/htop làm.

   Thêm `:36-51`: probe `tmux -CC control mode` bằng `spawnSync` vì **wheel chết hẳn trong
   iTerm2 `-CC`**; phải sync vì câu trả lời quyết định có vào alt-screen hay không.

   **Đo phía omp:**
   - `grep -rniE "tmux.*mouse|mouse.*tmux|set -g mouse|mouse on" packages/tui/src packages/coding-agent/src` → **0 hit** (không liên quan; 1 hit duy nhất là comment về SGR mouse)
   - `packages/tui/src/tmux.ts` (52 dòng) chỉ có **2 việc**: DCS passthrough + `#{client_termtype}`. **Không có** dò `mouse`, **không có** hint.

   → **Kết luận:** thứ thiếu thật sự là **cơ chế "phát hiện cuộn chuột không hoạt động ở đây
   và nói cho người dùng biết phải làm gì, thay vì sửa trạng thái của họ"** — không phải tăng tốc.
   Đây là ứng viên port tốt hơn nhiều so với M3-A3 hiện tại.

4. Về mặt "3 dòng mỗi notch" mà `s2` nêu: **đúng là omp không nhất quán**, nhưng không phải vì
   CCB làm khác. Đo được:
   - `packages/tui/src/overlays/agent-transcript-viewer.ts:470` → `this.#browser.scroll(event.wheel * 3)` ← **3 dòng**
   - `packages/tui/src/components/select-list.ts:229` → `handleWheel(delta: -1|1)` *"Move the selection **one step** for a wheel notch"* ← **1 bước**
   - Cùng kiểu với `settings-list.ts:241`, `session-selector.ts:588`, `oauth-selector.ts:407`, `extension-list.ts:597`, `agent-hub.ts:1247`, `git/sidebar.ts:896`

   Vậy: **CCB đồng nhất 1, omp lẫn 1 và 3.** M3-A3 sửa sự lẫn lộn nội bộ của omp (đáng làm,
   `ui.mouseWheelSpeedMultiplier` là một setting hợp lý) — nhưng **không được gọi là port**,
   vì CCB không có gì để port ở đây.

### 2.2 "Thông báo tạm thời có supersession" — ⚠️ **CCB KHÔNG CÓ hệ thống chung. Có MỘT tập pattern, đáng port nhưng không phải hàng hàng.**

Đo `grep -rnE "supersede|supersed" --include=*.ts --include=*.tsx src/` → 15 hit, phân loại:

| Nơi | Dòng | Cái thật sự là gì |
|---|---|---|
| `hooks/useVoice.ts:833` | `// Clear interim since final supersedes it` | **thay-tại-chỗ**, không append |
| `hooks/useVoice.ts:836` và `:854` | `if (prev.voiceInterimTranscript === preview) return prev` | **chống render lại** khi chuỗi không đổi (2 chỗ: final + interim) |
| `hooks/useVoice.ts:870` | `if (attemptGenRef.current !== myAttemptGen) → return` | **bỏ kết quả async cũ** bằng generation counter |
| `utils/sessionStorage.ts:1237` | `// Last-wins on restore — later entries supersede.` | last-wins khi đọc lại |
| `bridge/replBridgeTransport.ts:211,230` | `epoch superseded (409)` | epoch, không phải UI |
| `services/skillLearning/*` | `status: 'superseded'` | vòng đời skill |

Không có toast queue, không có registry, không có "thông báo mới đẩy thông báo cũ". Có
`src/components/PromptInput/Notifications.tsx` nhưng đó là dòng thông báo cố định.

**Ba pattern rút ra (đều portable sạch, đều là quy tắc chứ không phải code):**

1. **Thay tại chỗ, không nối thêm.** Một ô tạm thời (voice interim, hay là dòng "đang
   nghĩ", "đang chờ tool") được **ghi đè** bởi kết quả mới chứ không đẩy xuống scrollback.
   Trong transcript dài, đây là khác biệt giữa "tôi thấy 40 dòng thông báo cũ" và "tôi thấy
   trạng thái hiện tại".
2. **Guard bằng phép so sánh giá trị trước khi phát lại state.** `useVoice.ts:836` — một dòng
   này giữ shimmer không nhấp nháy 20 fps khi nội dung không đổi.
3. **Generation counter cho kết quả bất đồng bộ.** `useVoice.ts:870` — một retry sinh ra
   `attemptGen` mới; mọi callback của attempt cũ tới sau đều bị bỏ. Đây là lỗi kinh điển
   "cũ hơn ghi đè mới", và CCB đã học cách chặn nó.

**Đo phía omp:**
- `grep -rn "registerStatusLineSegment" packages/` → **0 hit** (đúng như briefing nói)
- omp có `packages/tui/src/status-line/` khá đầy đủ: `segments.ts` (35 KB) `component.ts`
  (120 KB) `presets.ts` `footer.ts` `context-usage.ts` `loop.ts` `metrics.ts` `types.ts`
- omp có `modes/magic-keywords.ts` với khái niệm "notice" — nhưng đó là notice **inject vào
  prompt người dùng** một lần, không phải dòng trạng thái tạm thời.

→ **Kết luận:** `M3-A7` là một ý tưởng tốt, **nhưng phải ghi rõ nó không port từ CCB** — nó là
cải tiến nội bộ của omp, cộng với 3 pattern trên mà CCB *có* và omp *chưa kiểm chứng là có*.

### 2.3 "Theme tương phản mù màu" — ✅ **CCB CÓ. omp ĐÃ CÓ NỬA — `M3-A9` xác nhận là đúng.**

Đo đã nêu ở §1.5. Tóm lại:

| | CCB | omp |
|---|---|---|
| Có khái niệm colorblind | ✅ | ✅ `colorBlindMode` |
| Phạm vi | 16 chỗ chỉnh tay trên 4 token ngữ nghĩa, 7 khối theme | **1 token**: `toolDiffAdded` |
| Hình thức | 2 theme riêng (`dark/light-daltonized`) | 1 **cờ toàn cục** áp cho 102 theme |
| Setup UI | `ThemePicker.tsx:77,81` + `Settings/Config.tsx:2067-2068` | `setup/scenes/theme.ts:29` `{value:"colorblind", label:"Colorblind colors", description:"Adjust red/green contrast"}` |

→ omp **đã có công tắc đúng hơn CCB** (cờ toàn cục > 2 theme tay). Nó chỉ thiếu **chiều rộng**.
`M3-A9` / `s6` ghi đúng chỗ này. Giữ nguyên, không viết lại.

---

## 3. Danh sách THIẾU — xếp theo giá trị, không đề xuất cái omp đã có

| # | Hạng mục | CCB | omp | Bằng chứng đo | Clean-room note (ý tưởng, không chép code) |
|---|---|---|---|---|---|
| **1** | **Spinner báo treo** — 3s không token → tín hiệu leo dần; tool đang chạy thì miễn; `reducedMotion` tắt mượt | `Spinner/useStalledAnimation.ts:31,42,43,51,59` + `useShimmerAnimation.ts:16` | **không** | `loader.ts` chỉ có `#frames`/`#intervalId`; `loop-watchdog.ts` là đo event-loop cho dev, không phải UI | "Khi luồng im lặng quá ngưỡng mà không có tool chạy, hạnh nhân tăng dần về 1 để người dùng biết tiến trình còn sống; có tool chạy thì không báo; tuỳ chọn giảm chuyển động thì chuyển thẳng không mượt." Ngưỡng là tham số của M3, không sao chép từ CCB. |
| **2** | **Dò + degrade cuộn chuột** — phát hiện môi trường wheel chết, nói cách sửa, **không tự sửa hộp người dùng** | `fullscreen.ts:180-195` (`maybeGetTmuxMouseHint`), `:191` (`tmux show -Av mouse`), `:36-51` (probe `-CC`) | **không** | `tmux.ts` 52 dòng chỉ passthrough + `client_termtype`; grep `tmux.*mouse` → 0 | "Khi phát hiện cuộn bằng chuột không tới nơi, hiện một gợi ý một-lần-per-session nói cách bật; tuyệt đối không tự sửa cấu hình tmux của người dùng vì điều đó lẩn sang các pane khác." |
| **3** | **Mở rộng colorblind** 1 token → ~5 token ngữ nghĩa + contrast harness | `theme.ts` 16 chỗ / 4 token | **1 token** | `theme/loader.ts:145-159` | Đây chính là `M3-A9`. Giữ nguyên phạm vi. |
| **4** | **Đồng nhất hoá wheel** giữa các bề mặt cuộn | CCB đồng nhất 1 dòng | **lẫn 1 và 3** | `agent-transcript-viewer.ts:470` ×3 vs `select-list.ts:229` ×1 | Là `M3-A3` hiện tại. Đáng làm như một setting — **đừng gọi là port**. |
| **5** | **Thống nhất tên hiệu tạm thời** (thay-tại-chỗ + chống render thừa + generation counter) | `useVoice.ts:833,836,870` | **không rõ/chưa có** | `registerStatusLineSegment` → 0 hit; status-line có `segments.ts` 35 KB nhưng chưa thấy nguyên tắc supersession | Là `M3-A7` + 3 guard rule từ §2.2. |

### 3.1 Những thứ CCB có mà **không nên port** (đo được, chủ đích loại)

| CCB | Vì sao bỏ |
|---|---|
| `FeedbackSurvey/` (11 file) — `useFrustrationDetection.ts:14-19` | Toàn bộ logic là `apiErrors.length >= 2` → mời **gửi transcript lên Anthropic**. Đây là **telemetry sản phẩm**, không phải UX, và `:30` còn chặn sau `isPolicyAllowed('product_feedback')`. Không phải thứ "port 100% UI" nên mang. |
| `DevBar.tsx:7-8` | `process.env.NODE_ENV === 'development' \|\| process.env.USER_TYPE === 'ant'` — thanh debug nội bộ Anthropic. |
| `StatusLine.tsx` + `BuiltinStatusLine.tsx` + `StatusNotices.tsx` | omp đã có `status-line/` (13 file, 240 KB) — thay thế đã đầy đủ hơn. |
| `agents/` (28 file) + `wizard/` + `mcp/` (14) + `permissions/` (53) | Đây là **plugin authoring UX**, không phải TUI. omp có `overlays/agents-hub.ts` (42 KB) + `agent-hub.ts` (58 KB) + `mcp-add-wizard.ts` (42 KB). Đã vượt. |
| `OffscreenFreeze.tsx:9-21` | Sửa một hạn chế của CCB: *"Any content change above the viewport forces log-update.ts into a full terminal reset"*. omp render bằng diff tăng dần, không có bản chất này — sự cố mà `OffscreenFreeze` chữa **không tồn tại ở omp**. |
| `VirtualMessageList.tsx` | `grep -rliE "virtualiz" packages/tui/src` → 0. Nhưng CCB cần nó vì React/Ink; omp đã có `scroll-view.ts` (17 KB) + `transcript-browser.ts` + `chat-transcript-builder.ts` (23 KB) giải quyết cùng bài toán theo cách khác, và có `ResizeScrollbackMode = "append" \| "rebuild" \| "preserve"` (`tui.ts:314`) — tinh vi hơn. |

---

## 4. Ba kết luận cần đưa vào kế hoạch M3

1. **M3-A3 (wheel acceleration) phải được dễn lại.** CCB không có nó. Thứ CCB có và
   omp thiếu là **cơ chế dò-khả-năng-rồi-degrade** (§2.1). Nếu M3 giữ A3, hãy ghi rõ nó là
   thiết kế của omp để sửa sự lẫn 1-vs-3 nội bộ, **không phải port** — nếu không, báo cáo
   "port 100%" sẽ tính nhầm một tính năng của riêng mình.

2. **M3-A7 (supersession) nên tách làm hai phần.** Phần *port được* là 3 pattern guard ở
   §2.2 (thay-tại-chỗ, guard so sánh trước khi setState, generation counter) — cả ba đều là
   quy tắc chứ không phải mã. Phần còn lại (hàng đợi có phím để điều hướng) là thiết kế mới.

3. **M3-A9 (daltonize) giữ nguyên, phạm vi đúng.** Đo lại độc lập xác nhận `colorBlindMode`
   của omp chỉ remap `toolDiffAdded` (`loader.ts:153-158`) trong khi CCB remap 4 token
   ngữ nghĩa. Đây là mục **duy nhất** trong ba mục được gọi tên mà CCB thật sự làm và omp
   thật sự thiếu.

**Mục tự phát đáng thêm vào wave:** **#1 spinner báo treo** — đây là khoảng trống UX lớn
nhất mà đo được, và nó **không** nằm trong 17 work item hiện có.

---

## 5. Phụ lục — lệnh đã chạy

```sh
# phía CCB
grep -nE '"(@anthropic/ink|react|react-reconciler)"' package.json
git ls-files | grep -icE '^licen[sc]e'
grep -rilE "cellbuffer|cell-buffer" --include=*.ts --include=*.tsx . | wc -l
git ls-files 'src/components/**' 'src/utils/**' 'src/commands/**' | wc -l
git ls-files 'src/components/**' | sed 's|src/components/||' | awk -F/ 'NF>1{print $1}' | sort | uniq -c | sort -rn
grep -rnE "wheel|Wheel" --include=*.ts --include=*.tsx src/
grep -rnE "supersede|supersed" --include=*.ts --include=*.tsx src/
grep -rniE "colorblind|colourblind|deuteran|protan|tritan" --include=*.ts --include=*.tsx src/
sed -n '200,220p' src/keybindings/defaultBindings.ts
sed -n '140,200p' src/utils/fullscreen.ts
sed -n '820,880p' src/hooks/useVoice.ts
sed -n '1,80p'  src/components/Spinner/useStalledAnimation.ts
sed -n '1,18p'  src/components/Spinner/useShimmerAnimation.ts
sed -n '65,95p'  src/components/ThemePicker.tsx

# phía omp
ls packages/tui/src/theme/defaults | wc -l
sed -n '140,175p' packages/tui/src/theme/loader.ts
grep -rn "registerStatusLineSegment" packages/
grep -rn "handleWheel" packages/tui/src/
grep -nE "wheel" packages/tui/src/overlays/agent-transcript-viewer.ts
grep -rliE "virtualiz" packages/tui/src packages/coding-agent/src
grep -rniE "noToken|tokenStall|lastToken|idleSince" packages/tui/src packages/coding-agent/src
grep -rliE "reducedMotion" packages/
grep -rniE "tmux.*mouse|mouse.*tmux|set -g mouse" packages/tui/src packages/coding-agent/src
cat packages/tui/src/tmux.ts
bun -e 'require("./.lavish-wip/m3-index/light.json").find(x=>x.id==="s2")'
bun -e 'require("./.lavish-wip/m3-index/light.json").find(x=>x.id==="s6")'
```

**Cảnh báo về grep:** `grep -iE "stall"` trên omp trả về 24 file — vì khớp chuỗi `"stall"`
trong `install`, `installed`. Phải dùng `\bstall(ing|ed|s)?\b` mới ra kết quả thật
(16 file, và **không cái nào** là spinner-báo-treo). Đây là cái bẫy đã làm briefing sai
tiền đề — ghi lại để wave sau không lặp.

**Ranh giới pháp lý:** file này chỉ trích **tên file, số dòng, và mô tả hành vi quan sát
được** từ CCB. Không dòng mã nào được chép. Mọi đề xuất port đều được diễn đạt lại bằng
ngôn ngữ của omp trong cột *clean-room note*.
