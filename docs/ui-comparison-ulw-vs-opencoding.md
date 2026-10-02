claude --resume d5884351-0d86-4c51-8465-3fbc06446635

# So sánh bề mặt UI — ULW (`ultraworkers`) vs `opencoding`

**Đo:** 2026-10-02 · ULW **`36d9ba9496`** `packages/tui/src/` · opencoding **v2.8.4**, snapshot `.tmp/opencoding-main`
*(đo lần 1 ghim `1fc59d9`; lần 2 đo lại trên HEAD hiện tại — xem [Các neo đã rotted](#các-neo-đã-rotted))*
**Mục đích:** owner chọn cái nào để dựng lại trong `~/.ultraworkers/extension/ulw-openTUI`.

> 🎯 **Quyết định của owner (2026-10-02):** dựng một UI hỗn hợp — **bề mặt lấy của opencoding, ruột lấy của ULW.**
> Câu trả lời cho *"làm được không"*: **Có, sáu nhóm trên bảy làm được ngay hôm nay bằng extension, không sửa một dòng core nào.**
> Phần còn lại — xem [§Kết luận khả thi](#kết-luận-khả-thi-có-làm-được-và-phần-nào-cần-core).

> ⚠️ **Hai bên vẽ bằng hai thứ khác nhau.** opencoding dùng **React + fork riêng của [`vadimdemedes/ink`](https://github.com/vadimdemedes/ink)** (441 + 409 import);
> ULW dùng **TUI tự viết, differential rendering** (1 file import react trong `src/`).
> Extension ULW nhận `ExtensionUiComponentFactory = (tui, theme) => ExtensionUiComponent` — **component của ULW, không phải cây React**.
> ⇒ **Không chép code được.** Chép *thiết kế*, viết lại trên primitive ULW.
>
> 📎 **Bằng chứng `@opencoding/ink` là fork của `vadimdemedes/ink` (đo 2026-10-02).** Không suy từ tên:
> - `packages/@opencoding/ink/src/core/reconciler.ts:33` trích trực tiếp issue upstream
>   `https://github.com/vadimdemedes/ink/issues/384`
> - Tập dependency **trùng khớp từng cái** với ink upstream: `react-reconciler` ^0.33 · `chalk` ^5.6 ·
>   `figures` ^6.1 · `wrap-ansi` ^10 · `bidi-js` ^1 · `cli-boxes` ^4 · `usehooks-ts` ^3.1 ·
>   `emoji-regex` ^10.6 · `get-east-asian-width` ^1.5 · `indent-string` ^5 · `auto-bind` ^5 ·
>   `signal-exit` ^4.1 · `strip-ansi` ^7.2 · `supports-hyperlinks` ^4.4 · `type-fest` ^5.5
> - `package.json`: `"private": true`, `"version": "1.0.0"` — **không** phải bản phát hành có số của upstream
>
> ⚠️ **Hệ quả cho chương trình:** ink upstream là **MIT**, nên đường pháp lý của opencoding ở chỗ này là sạch
> (khác `claude-code` — không có giấy phép). Nhưng repo `opencoding` phát hành **Unlicense**, và fork
> `private` không có file `LICENSE` riêng ⇒ **không rõ chỗ nào dừng bản quyền**. Nếu chép *thiết kế* thì không
> vướng gì; nếu chép *dòng* thì phải hỏi tác giả trước. Đây là cùng ranh giới M6 vạch cho `opencode` (MIT) và
> `oh-my-openagent` (SUL-1.0, có điều kiện).

> ⚠️ **Cột "Làm được băng extension?"** — ô ✅ nghĩa là qua `setWidget`/`setHeader`/`setFooter`/`setEditorComponent`/`showOverlay`,
> **làm được ngay hôm nay**. Ô ❌ nghĩa là cần `registerEntryRenderer` (0 hit ở ULW, bead `m2-wi-16` đang `deferred`).
> Ô 🔒 nghĩa là **nằm ngoài mọi seam** — không phải chờ việc bao trọn `pi`, mà là việc chưa tồn tại.

Ô trống = **bên đó không có**.

> ⚠️ **Đo lại đã sửa hai kết luận của lần 1.** Cả hai nằm ở phần "Có làm được bằng extension?":
> 1. **Nhóm A không cần `m2-wi-16` toàn bộ.** `registerMessageRenderer` **đang chạy** — chỉ áp cho message *của riêng extension*.
> 2. **Dòng 🔒 "Chỉ báo chế độ" không chết** — có workaround qua `setHeader`, không cần mở core.
> Chi tiết và bằng chứng: [§Kết luận khả thi](#kết-luận-khả-thi-có-làm-được-và-phần-nào-cần-core).

---



## A. Hiển thị hội thoại


| Chức năng             | ULW                                              | opencoding                                                                                                                      | Extension? |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Tin nhắn assistant    | `tui/chat/assistant-message.ts` (70 KB)          | `messages/AssistantTextMessage.tsx` (6.4 KB)                                                                                    | opencoding |
| Tin nhắn thinking     | `tui/chat/thinking-display.ts` (14 KB)           | `messages/AssistantThinkingMessage.tsx` (1.5) + `HighlightedThinkingText.tsx` (2.5)                                             | opencoding |
| Tool đang chạy        | `tui/chat/tool-execution.ts` (73 KB)             | `messages/AssistantToolUseMessage.tsx` (9.6)                                                                                    | opencoding |
| Kết quả tool          | `tui/chat/tool-execution.ts`                     | `messages/UserToolResultMessage/` (8 file, 14 KB)                                                                               | opencoding |
| Tool lỗi / bị từ chối | `tui/chat/tool-execution.ts`                     | `UserToolErrorMessage` (2.5) · `UserToolRejectMessage` (1.5) · `RejectedToolUseMessage` (0.3) · `UserToolCanceledMessage` (0.3) | opencoding |
| Group đọc-file        | `tui/chat/read-tool-group.ts` (43 KB)            | `messages/CollapsedReadSearchContent.tsx` (19.1) · `GroupedToolUseContent.tsx` (2.1)                                            | opencoding |
| Tin nhắn hệ thống     | `tui/chat/late-diagnostics-message.ts` (6.1)     | `messages/SystemTextMessage.tsx` (13.7) · `SystemAPIErrorMessage.tsx` (2.0)                                                     | opencoding |
| Tin nhắn người dùng   | `tui/chat/chat-transcript-builder.ts` (24 KB)    | `messages/UserTextMessage.tsx` (6.7) · `UserPromptMessage.tsx` (3.8)                                                            | opencoding |
| Đính kèm              | `tui/prompt/composer-attachments.ts` (14 KB)     | `messages/AttachmentMessage.tsx` (18.7)                                                                                         | opencoding |
| Ảnh trong hội thoại   | `tui/components/image.ts` (37 KB)                | `messages/UserImageMessage.tsx` (1.2)                                                                                           | opencoding |
| Ranh giới compact     | `tui/chat/compaction-summary-message.ts` (12 KB) | `messages/CompactBoundaryMessage.tsx` (0.4)                                                                                     | opencoding |
| Ranh giới snip        |                                                  | `messages/SnipBoundaryMessage.tsx` (0.7)                                                                                        | opencoding |
| Xin duyệt kế hoạch    |                                                  | `messages/PlanApprovalMessage.tsx` (5.8)                                                                                        | opencoding |
| Chạm rate limit       |                                                  | `messages/RateLimitMessage.tsx` (4.0)                                                                                           | opencoding |
| Tắt máy               |                                                  | `messages/ShutdownMessage.tsx` (3.2)                                                                                            | opencoding |
| Bị người dùng ngắt    |                                                  | `messages/InterruptedByUser.tsx` (0.4)                                                                                          | opencoding |
| Nhóm đồng đội         | `tui/chat/advisor-message.ts` (8.8)              | `messages/UserTeammateMessage.tsx` (5.9) · `teamMemCollapsed.tsx` (2.4)                                                         | opencoding |
| Skill                 | `tui/chat/skill-message.ts` (10 KB)              | `messages/UserMemoryInputMessage.tsx` (1.1)                                                                                     | opencoding |
| Hook progress         | `tui/chat/hook-message.ts` (0.7)                 | `messages/HookProgressMessage.tsx` (1.8)                                                                                        | opencoding |
| Shell output          | `tui/chat/bash-execution.ts` (16 KB)             | `components/shell/OutputLine.tsx` (3.8) · `ShellProgressMessage.tsx` (2.6)                                                      | opencoding |
| Markdown render       | `tui/components/markdown.ts` (**154 KB**)        | `Markdown.tsx` (7.1) + `MarkdownTable.tsx` (13.3)                                                                               | opencoding |


> 🔍 **Đo lại: cột "Extension?" ở nhóm A gộp hai việc khác nhau — tách ra thì phần ✅ lớn hơn bảng nói.**
>
> `registerMessageRenderer(customType, renderer)` **đang chạy, không vắng.** Chứng minh bằng chuỗi đầy đủ:
> `loader.ts:599` khai → `runner.ts:1769 getMessageRenderer` → `ui-helpers.ts:360` truyền vào deps →
> **`chat-transcript-builder.ts:623`** gọi `this.#deps.getMessageRenderer?.(message.customType)`.
>
> **Nhưng nó chỉ chạy trong một arm.** Dispatch ở `chat-transcript-builder.ts:286-296` là `switch (message.role)` với
> các arm `assistant` · `toolResult` · `user` · `developer`; lời gọi renderer nằm ở arm `"hookMessage" | "custom"` (`:364-365`).
>
> | Việc cần làm | Hôm nay | Cần gì |
> | --- | --- | --- |
> | Render **message type của riêng extension** bằng component tuỳ ý | ✅ | — |
> | **Thay** rendering của message type **của core** (`assistant` / `toolResult` / `user`) | ❌ | `registerEntryRenderer` — `m2-wi-16-036`, đang `deferred` |
>
> ⇒ Vế thứ hai là toàn bộ phần cần core của nhóm A, và nó **hẹp hơn nhiều** so với "`messages/` 45 file (147 KB)" mà
> dòng tổng kết cũ ghi. Không phải 45 file chờ seam — mà là **một switch không có nhánh cắm vào**.




## B. Ô nhập

> ℹ️ **Vùng này tôi đã đánh dấu 🔒 sai lần đầu.** Nguyên nhân: tôi suy từ "nó thuộc editor" mà không kiểm
> `setEditorComponent` đã tồn tại. Nó **có**, ở HEAD, không chờ bead nào (`types.ts:414`,
> `interactive-mode.ts:6772`, `extension-ui-controller.ts:205`, `unavailable-ui.ts:74`).
> `CustomEditor` là **subpath public**: `packages/tui/package.json` có `"./*": "./src/*.ts"`, nên
> `@oh-my-pi/pi-tui/prompt/custom-editor` import được từ ngoài repo.
> Đo trong `custom-editor.ts`: shimmer **18** hit, queue **33**, chips **8**, placeholder **3**.
> ⇒ Tất cả nằm trong `CustomEditor` → ✅ hết.
>
> **Cái giới hạn thật:** core **gán đè** sau khi factory trả về (sau `interactive-mode.ts:6838`) —
> `placeholder`, `composerState`, `attachmentChips`, `imageReferenceHyperlink`, `skillFilePath`,
> `modelMentionLabel`, `magicKeywordsEnabled`, viewport, vim, spelling. Thay editor ≠ mua được
> `placeholder` tuỳ ý; phải đi qua closure core đặt sẵn.
>
> 📌 **Handle editor đã bị thu hẹp — và đây là chi tiết quan trọng nhất của nhóm B.**
> `setEditorComponent` (`:6838`) khai factory là
> `((tui: ExtensionTUISurface, theme: EditorTheme, keybindings: KeybindingsManager) => CustomEditor)`,
> **không phải** `TUI`. Xem `ExtensionTUISurface` ở `packages/tui/src/tui.ts:762`: nó `extends Container`
> (⇒ có `addChild`/`removeChild`/`invalidate`/`render`) cộng đúng 10 thành viên —
> `requestRender` · `requestComponentRender` · `renderNow` · `showOverlay` · `hideOverlay` · `hasOverlay` ·
> `stop` · `start` · `getFocused` · `setFocus`.
> **Bị cắt** (có trong `TUI` đầy đủ, không có ở đây): `setFrameProvider`, `injectDebugInput`,
> `getMutableViewport`, `addPaintListener`, `setInlineMouseTrackingProvider`, `getDebugPaint`.
> ⇒ Đủ để dựng UI thật, **không** đủ để tự chế bộ khung hiển thị. Đây là ranh giới nằm ở tầng kiểu, đúng như
> nguyên tắc trong `AGENTS.md`: extension không thể với tới `setFrameProvider` trần trụi của core.


| Chức năng    | ULW                                                                          | opencoding                                                                                                                     | Extension? |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Ô nhập chính | `tui/prompt/composer.ts` (42 KB) + `tui/components/editor.ts` (**174 KB**)   | `PromptInput/PromptInput.tsx` (**96.3 KB**)                                                                                    | opencoding |
| Chân ô nhập  | `tui/status-line/footer.ts` (15 KB) — ⚠️ **code chết, xem ghi chú bên dưới** | `PromptInput/PromptInputFooter.tsx` (15.5) + `PromptInputFooterLeftSide.tsx` (25.4) + `PromptInputFooterSuggestions.tsx` (7.6) | opencoding |


> ⚠️ `status-line/footer.ts` **là code chết ở production** — tôi đã ghi nó như một mặt UI
> đang chạy, sai. Đo: `new FooterComponent` trong source = **0**, chỉ 1 chỗ ở
> `test/footer-jj-label-sanitize.test.ts:84`; `import ".../status-line/footer"` trong source
> = **1**, chỉ `export `* trong `modes/components/index.ts:17`.
> Thứ thật sự render status line là `StatusLineComponent` (`component.ts` **139 KB**),
> dựng ở `interactive-mode.ts:1749`.
> **Cột ✅ ở dòng này là của status line gốc**, không phải của file 15 KB này.
> | Thông báo trong ô nhập | `tui/prompt/composer-attachments.ts` | `PromptInput/Notifications.tsx` (10.6) | ✅ |
> | Chip đính kèm | `tui/prompt/attachment-chips.ts` (11 KB) | | ✅ |
> | Gợi ý nơi nhập | `tui/prompt/welcome.ts` (32 KB) | `usePromptInputPlaceholder.ts` (2.3) | ✅ |
> | Ô nhập lấp lánh | `tui/theme/shimmer.ts` (12 KB) | `PromptInput/ShimmeredInput.tsx` (4.0) | ✅ |
> | Lệnh đã xếp hàng | `tui/prompt/queued-messages.ts` (3.2) | `PromptInput/PromptInputQueuedCommands.tsx` (5.5) | ✅ |
> | Chỉ báo chế độ | `tui/status-line/component.ts` (badge plan/bypass, **5** hit; `segments.ts` chỉ 2) | `PromptInput/PromptInputModeIndicator.tsx` (2.8) | ✅\* |
> | Mic | `tui/prompt/video.ts` (1.5) | `PromptInput/VoiceIndicator.tsx` (2.0) | ✅ |
> | Menu trợ giúp | `tui/prompt/composer-hints.ts` (3.0) | `PromptInput/PromptInputHelpMenu.tsx` (4.7) | ✅ |
> | Cảnh báo sandbox | | `PromptInput/SandboxPromptFooterHint.tsx` (1.7) | ✅ |
> | Autocomplete ký tự | `tui/prompt/word-completion.ts` (8.6) + `macos-spelling.ts` (13 KB) | | |
> | Autocomplete emoji | `tui/prompt/emoji-autocomplete.ts` (9.2) | | |
> | Autocomplete model | `tui/prompt/model-mention-autocomplete.ts` (4.2) | | |
> | Autocomplete GitHub ref | `tui/prompt/github-ref-autocomplete.ts` (3.3) | | |
> | Autocomplete hành động | `tui/prompt/prompt-action-autocomplete.ts` (12 KB) | | |

> ⭐ **Dòng `Chỉ báo chế độ`: đổi 🔒 → ✅\*.** Lần đo 1 đánh 🔒 vì nó nằm trong `StatusHost` — slot đơn,
> `setComponent` thay thế chứ không cộng dồn. **Ràng buộc đó có thật** (xem dưới đây), nhưng **kết luận
> "nằm ngoài mọi seam" thì sai**: `setHeader` và `setWidget` nằm ngay trên nó.
>
> **Bằng chứng cấu trúc:** `composer.ts:131` `class StatusHost implements Component`, `:134` `setComponent`,
> gọi ở `:341` và `:925`, mount bằng `this.ui.addChild(this.#statusHost)` (`:363`). Đúng là một slot.
>
> **Nhưng layout ghép lại là** `composer.ts:377` và `:784`:
> `[this.extensionHeader, ...this.#runtimeChildren, this.extensionFooter, this.#statusHost]`
> — `extensionHeader` nằm **trên** status line và `#runtimeChildren` (khai `:239`, gán ở `:953`) nằm giữa.
> ⇒ Mode chip 2.8 KB của opencoding dựng trong `setHeader` là xong. **Không cần mở `StatusHost`.**
> Dấu `*` = "làm được, nhưng qua đường vòng; không vào đúng slot mà bản gốc dùng".



## C. Chrome & trạng thái


| Chức năng        | ULW                                                                 | opencoding                                                                      | Extension? |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------- |
| Status line      | `tui/status-line/component.ts` (**139 KB**) + `segments.ts` (50 KB) | `components/StatusLine.tsx` (21.0)                                              | opencoding |
| Chân status      | `tui/status-line/footer.ts` (15 KB)                                 | `components/BuiltinStatusLine.tsx` (3.8)                                        | opencoding |
| Mức dùng context | `tui/status-line/context-usage.ts` (32 KB)                          | `components/ContextVisualization.tsx` (16.6) + `MemoryUsageIndicator.tsx` (1.2) | opencoding |
| Khung tin nhắn   | `tui/chrome/message-frame.ts` (7.2)                                 |                                                                                 | ulw        |
| Khối hội thoại   | `tui/chrome/transcript-container.ts` (48 KB)                        | `components/VirtualMessageList.tsx` (42.6)                                      | opencoding |
| Bộ đệm tin nhắn  |                                                                     | `components/Messages.tsx` (46.9) + `MessageSelector.tsx` (28.5)                 | opencoding |


> ℹ️ **"Cuộn" — tôi đánh 🔒 sai, lần thứ hai trong cùng bảng này.**
> Tôi so `scroll-view.ts` của ULW với `ScrollKeybindingHandler.tsx` của opencoding, rồi kết luận
> ULW không có bản tương đương. **Sai.** ULW có: `chat/transcript-browser.ts` (9 KB) — đó là
> "mũi tên lên xem lại input", có `OutlineColumn` và chọn dòng.
>
> **Bằng chứng quyết định:** `custom-commands/bundled/annotate/text-source.ts:127`
> đã `new CopySelectorComponent(...)` — một custom command của chính ULW instantiate
> overlay này rồi dùng, **không sửa một dòng core nào**. `TranscriptBrowser` là
> `export class … implements Component` (`:97`) và nằm trong wildcard `./*` của
> `packages/tui/package.json`.
> | Dải phân cách | `tui/chrome/message-divider.ts` (3.0) | | |
> | Lưu ý dưới tin nhắn | `tui/chrome/message-notice.ts` (5.6) + `status-notice.ts` (1.5) | | |
> | Hộp phủ | `tui/chrome/overlay-box.ts` (12 KB) | | |
> | QR | `tui/chrome/qrcode.ts` (19 KB) + `collab-qrcode.ts` (4.2) | `components/CollapedQrCode` | ✅ |
> | Hẹn giờ đếm ngược | `tui/chrome/countdown-timer.ts` (2.6) | | |
> | Ngưỡng context | `tui/chrome/context-thresholds.ts` (3.6) | | |
> | Diff trong chrome | `tui/chrome/diff.ts` (12 KB) | `StructuredDiff/Fallback.tsx` (14.8) + `colorDiff.ts` | ✅ |
> | Bảng chọn | `tui/components/select-list.ts` (30 KB) | `CustomSelect/select.tsx` (28.5) + `SelectMulti.tsx` (6.3) | ✅ |
> | Cây chọn | `tui/components/tree-view.ts` (20 KB) | `components/ui/TreeSelect.tsx` (9.5) | ✅ |
> | Bảng | `tui/components/table.ts` (5.9) | `components/MarkdownTable.tsx` (13.3) | ✅ |
> | Tab | `tui/components/tab-bar.ts` (11 KB) | `components/TagTabs.tsx` (5.4) | ✅ |
> | Danh sách key-value | `tui/components/key-value-list.ts` (4.0) | | |
> | Thanh tiến | `tui/components/progress-bar.ts` (6.9) | | |
> | Cuộn | `tui/components/scroll-view.ts` (18 KB) + `scroll-viewport.ts` (5.5) + `tui/chat/transcript-browser.ts` (9.0) | `ScrollKeybindingHandler.tsx` (46.2) | ✅ |
> | Hộp | `tui/components/box.ts` (8.7) | | |
> | Mô tả mở/đóng | `tui/components/disclosure.ts` (9.1) | | |
> | Biểu đồ metric | `tui/components/metric.ts` (6.2) | | |



### C1. Status line: ULW **đã có** custom, nhưng catalog là **đóng** — đây là câu trả lời cho "đã có kế hoạch hay đã làm chưa"

Câu hỏi: *"ULW đã có kế hoạch hay đã làm để custom status line chưa?"* → **Đã làm, và làm cho người dùng qua settings, không phải cho extension.**

**Đã có (settings-driven, chạy thật):**

| Setting | Kiểu | Nguồn |
| --- | --- | --- |
| `statusLine.preset` | — | `modes/settings.ts:152` |
| `statusLine.separator` | — | `:174` |
| `statusLine.leftSegments` | `array` của `StatusLineSegmentId` | `:277` |
| `statusLine.rightSegments` | `array` của `StatusLineSegmentId` | `:284` |
| `statusLine.segmentOptions` | `record` | `:291` |
| + `contextLine` `:196` · `sessionAccent` `:227` · `transparent` `:239` · `compactThinkingLevel` `:252` · `showHookStatus` `:265` | | |

Catalog là `STATUS_LINE_SEGMENT_IDS` (`packages/tui/src/status-line/schema.ts:2-30`) — **28 phần tử**, và nó
**đóng**: `leftSegments` khai `items: { values: STATUS_LINE_SEGMENT_IDS }` (`modes/settings.ts:280`, và `:287` cho phía phải), tức
type-checker cấm một id ngoài danh mục. Có sẵn `CUSTOM_STATUS_LINE_DEFAULTS` với `left`/`right` riêng.

**Chưa có, và đây là phần cần nói thẳng — không có bead nào cho nó:**

| Việc | Trạng thái |
| --- | --- |
| **Extension đăng ký segment MỚI** vào status line | ❌ **không có seam.** Catalog đóng, không có `registerStatusLineSegment` (grep 0 hit) |
| **Extension đổi nội dung/render** của segment đã có | ❌ không có seam |
| **Chỉ báo approval/bypass mode** (`always-ask` / `write` / `yolo`) | ❌ **không tồn tại.** `grep -rn "bypass\|permissionMode\|approvalMode" packages/tui/src/status-line/` → **0 hit**. Cả package `tui` không có khái niệm approval mode — nó thuộc `coding-agent` (`tools/approval.ts:21`) |
| **`shift+click` → native select** | ❌ không tồn tại; grep `shift+click\|native select` trong `docs/*.md` → 0 hit |

**Còn cái làm được ngay hôm nay, không cần mở catalog:**

`setWidget(key, content, options)` — `types.ts:345`, với `WidgetPlacement = "aboveEditor" | "belowEditor"`
(`types.ts:231`). Nội dung là `string[]` **hoặc** component factory nhận `TUI` thật.
⇒ Dòng hint kiểu `⏵⏵ bypass permissions on (shift+tab to cycle) · shift+click to native select`
làm được **ngay** qua `placement: "belowEditor"`. Thêm nữa: `setStatus(key, text)` (`:329`, *"status text in the
footer/status bar"* — **chỉ text, không component**) và `setHeader` / `setFooter`.

**Extension có biết approval mode không?** Có, nhưng **event-driven**: `on("tool_approval_requested", …)` trả
`ToolApprovalRequestedEvent.approvalMode: ApprovalMode` (`types.ts:1176`, `:1577`). Nhưng nó **chỉ bắn khi
tool cần duyệt**, không bắn khi người dùng đổi mode — nên extension muốn hiện badge phải tự lưu trạng thái
và sẽ không có giá trị ban đầu.

⚠️ **Một sự thật phải nói trước khi dựng badge đó:** trong ULW, `shift+tab` **không** đổi approval mode.
`packages/tui/src/app-keybindings.ts:108-111` gán nó cho **`app.thinking.cycle` — "Cycle thinking level"**.
Viết đúng câu *"shift+tab to cycle"* vào badge bypass-permissions sẽ **dạy người dùng một phím tắt sai**.



## D. Bộ chọn & hộp thoại


| Chức năng         | ULW                                                                                           | opencoding                                                                                                 | Extension? |
| ----------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| Chọn model        | `tui/overlays/model-picker.ts` (18 KB) + `model-hub.ts` (137 KB) + `model-browser.ts` (73 KB) | `components/ModelPicker.tsx` (13.6)                                                                        | ULW        |
| Hub agent         | `tui/overlays/agent-hub.ts` (94 KB) + `agents-hub.ts` (65 KB)                                 | `components/agents/AgentsList.tsx` (9.5) + `AgentsMenu.tsx` (11.3)                                         | opencoding |
| Cấu hình advisor  | `tui/overlays/advisor-config.ts` (45 KB)                                                      | `components/AdvisorMessage`                                                                                | opencoding |
| Mức cố gắng       |                                                                                               | `EffortPanel/EffortPanel.tsx` (14.3) + `EffortCallout.tsx` (5.2) + `EffortIndicator.ts` (1.2)              | opencoding |
| Cài MCP           | `tui/overlays/mcp-add-wizard.ts` (50 KB)                                                      | `components/mcp/MCPSettings.tsx` (7.6) + `MCPRemoteServerMenu.tsx` (27.6) + `MCPStdioServerMenu.tsx` (7.2) | opencoding |
| Elicitation MCP   | `tui/overlays/mcp-elicitation-form.ts` (6.0)                                                  | `components/mcp/ElicitationDialog.tsx` (**47.3**)                                                          | opencoding |
| Danh sách MCP     |                                                                                               | `components/mcp/MCPListPanel.tsx` (11.7) + `MCPToolDetailView.tsx` (4.0)                                   | opencoding |
| Hỏi người dùng    | `tui/overlays/ask-dialog.ts` (58 KB)                                                          | `permissions/AskUserQuestionPermissionRequest/` (7 file, 62 KB)                                            | opencoding |
| Xin duyệt         | `tui/overlays/login-dialog.ts` (15 KB)                                                        | `permissions/` (15 file + 13 nhánh, 68+ KB)                                                                | opencoding |
| Chọn bản ghi      | `tui/overlays/copy-selector.ts` (43 KB)                                                       |                                                                                                            | ulw        |
| Chú thích         | `tui/overlays/annotation-overlay.ts` (54 KB)                                                  |                                                                                                            | ulw        |
| Panel "btw"       | `tui/overlays/btw-panel.ts` (8.2) + `btw-history-panel.ts` (28 KB)                            |                                                                                                            | ulw        |
| Panel cleanse     | `tui/overlays/cleanse-panel.ts` (9.1)                                                         |                                                                                                            | ulw        |
| Panel việc        | `tui/overlays/jobs-panel.ts` (3.6)                                                            | `tasks/` (14 file) + `BackgroundTasksDialog.tsx` (31.6)                                                    | ulw        |
| Hoạt động agent   | `tui/overlays/agent-activity.ts` (3.3)                                                        | `components/AgentProgressLine.tsx` (2.5) + `CoordinatorAgentStatus.tsx` (7.8)                              | opencoding |
| Chọn hook         | `tui/overlays/hook-selector.ts` (35 KB) + `hook-editor.ts` (14 KB)                            | `hooks/` (6 file) + `HooksConfigMenu.tsx` (10.5)                                                           | opencoding |
| Tìm trong lịch sử | `tui/overlays/history-search.ts` (13 KB) + `tui/chat/transcript-browser.ts` (9.0)             | `HistorySearchDialog.tsx` (4.5) + `GlobalSearchDialog.tsx` (10.4)                                          | ulw        |
| Cài đặt           | `tui/components/settings-list.ts` (41 KB)                                                     | `Settings/` (4 file) + `Config.tsx` (**80 KB**)                                                            | ulw        |
| Trợ giúp          |                                                                                               | `HelpV2/` (3 file) + `Commands.tsx` (2.0)                                                                  | opencoding |
| Chủ đề            | `tui/theme/loader.ts` (9.0) + `theme.ts` (31 KB)                                              | `components/ThemePicker.tsx` (7.2)                                                                         | opencoding |
| Bảng chọn tệp     |                                                                                               | `components/MemoryFileSelector.tsx` (10.8)                                                                 | opencoding |
| Băng chào         | `tui/setup/startup-splash.ts` (4.1) + `tui/prompt/welcome.ts` (32 KB)                         | `Onboarding.tsx` (8.3)                                                                                     | opencoding |
| Trình hướng dẫn   | `tui/setup/wizard.ts` + `wizard-overlay.ts` (14 KB)                                           | `wizard/` (6 file)                                                                                         | opencoding |
| Thẻ sở hữu        |                                                                                               | `TrustDialog/` (14 KB)                                                                                     | opencoding |
| Phản hồi          |                                                                                               | `FeedbackSurvey/` (11 file, 47 KB)                                                                         | opencoding |
| Nhật ký           | `tui/overlays/`                                                                               | `LogSelector.tsx` (44.7)                                                                                   | opencoding |




## E. Spinner & hiệu ứng


| Chức năng            | ULW                                             | opencoding                                                                      | Extension? |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- | ---------- |
| Spinner              | `tui/components/loader.ts` (18 KB)              | `Spinner/Spinner.tsx` (23.1) + `SpinnerAnimationRow.tsx` (12.4)                 | opencoding |
| Spinner nhóm         |                                                 | `Spinner/TeammateSpinnerLine.tsx` (10.2) + `TeammateSpinnerTree.tsx` (4.5)      | opencoding |
| Chớp ký tự           | `tui/theme/shimmer.ts` (12 KB)                  | `Spinner/ShimmerChar.tsx` (0.6) + `useShimmerAnimation.ts` (1.2)                | opencoding |
| Nhấp nháy            |                                                 | `Spinner/FlashingChar.tsx` (1.1) + `useStalledAnimation.ts` (2.4)               | opencoding |
| Glyph spinner        |                                                 | `Spinner/SpinnerGlyph.tsx` (2.1)                                                | opencoding |
| Pháo hoa reset       | `tui/overlays/codex-reset-fireworks.ts` (14 KB) |                                                                                 | ulw        |
| Logo động            |                                                 | `LogoV2/AnimatedAsterisk.tsx` (1.9) + `AnimatedClawd.tsx` (3.3)                 | opencoding |
| Logo / màn hình chào |                                                 | `LogoV2/LogoV2.tsx` (16.7) + `WelcomeV2.tsx` (11.3) + `CondensedLogo.tsx` (4.1) | none logo  |
| Bảng chữ chạy        |                                                 | `LogoV2/Feed.tsx` (2.8) + `FeedColumn.tsx` (0.8) + `Clawd.tsx` (3.4)            | opencoding |




## F. Tool renderer


| Chức năng          | ULW                                                             | opencoding                              | Extension? |
| ------------------ | --------------------------------------------------------------- | --------------------------------------- | ---------- |
| **Todo**           | `tui/tools/todo.ts` (**27 KB**)                                 | *(render trong* `messageActions.tsx`*)* | ULW        |
| **Web search**     | `tui/tools/web-search.ts` (14 KB) + `web-search-types.ts` (2.7) | *(render trong* `messageActions.tsx`*)* | ULW        |
| Ô code             | `tui/render/code-cell.ts` (12 KB)                               | `components/HighlightedCode.tsx` (4.2)  | opencoding |
| Danh sách tệp      | `tui/render/file-list.ts` (3.2)                                 |                                         | ULW        |
| Cây kết quả        | `tui/render/tree-list.ts` (8.7)                                 |                                         | ULW        |
| Thẻ tool           | `tui/render/tool-card.ts` (15 KB)                               |                                         | ULW        |
| Khối output        | `tui/render/output-block.ts` (14 KB) + `output-pane.ts` (12 KB) |                                         | ULW        |
| Sixel / ảnh        | `tui/render/sixel.ts` (2.3)                                     |                                         | ULW        |
| Siêu liên kết      | `tui/render/hyperlink.ts` (9.4)                                 |                                         | ULW        |
| Nghiên cứu tự động | `tui/tools/autoresearch.ts` (15 KB)                             |                                         | ULW        |




## G. Bảng điều khiển (app)


| Chức năng               | ULW                                          | opencoding                            | Extension? |
| ----------------------- | -------------------------------------------- | ------------------------------------- | ---------- |
| Bảng thống kê           | `tui/apps/ps-top.ts` (28 KB) + `ps-data.ts`  | `components/Stats.tsx` (34.3)         | opencoding |
| Nghiên cứu              | `tui/apps/autoresearch-dashboard.ts` (33 KB) |                                       | ulw        |
| Trực quan hoá trực tiếp | `tui/apps/live-visualizer.ts` (10 KB)        |                                       | ulw        |
| Cleanse                 | `tui/apps/cleanse-board.ts` (20 KB)          |                                       | ulw        |
| Chọn phiên              | `tui/apps/session-picker.ts` (3.2)           | `screens/ResumeConversation.tsx` (16) | opencoding |
| Chẩn đoán               | `tui/apps/`                                  | `screens/Doctor.tsx` (15)             | opencoding |
| Git                     | `tui/apps/git/`                              |                                       | ulw        |
| Debug                   | `tui/apps/debug/`                            |                                       | ulw        |


---



## Tóm tắt cho owner


|                            | ULW                          | opencoding                                |
| -------------------------- | ---------------------------- | ----------------------------------------- |
| Tổng file UI               | ~390 file `packages/tui/src` | 418 file `src/components` + `src/screens` |
| Hệ hiển thị                | TUI tự viết, differential    | React + fork của [`vadimdemedes/ink`](https://github.com/vadimdemedes/ink) |
| Chép code được?            | —                            | ❌ **không**                               |
| Làm bằng extension hôm nay | ✅                            | ~373/418 file *(đo lại: xem dưới)*         |
| Cần `m2-wi-16` trước       | —                            | ~~`messages/` 45 file (147 KB) + nhóm E~~ → **đã thu hẹp, xem dưới** |

> ⚠️ **Dòng cuối của bảng trên là của lần đo 1 và đã sai.** Đo lại cho thấy `m2-wi-16` chỉ chặn **một** thứ:
> thay rendering của message type **của core**. Nó **không** chặn nhóm E (spinner — đi qua `setWidget`), và nó
> **không** chặn message type của chính extension (`registerMessageRenderer` đang chạy).
> Số đúng là: **6 nhóm trên 7 làm được ngay hôm nay.** Xem [§Kết luận khả thi](#kết-luận-khả-thi-có-làm-được-và-phần-nào-cần-core).




### Trả lời: "làm bao trọn `pi` thì 🔒 có mở không?"

**Vùng ô nhập (nhóm B): không — và không cần.** 🔒 ở đó là tôi đánh dấu sai ở lần đầu.
`setEditorComponent` đã có sẵn ở HEAD. **Bao trọn** `pi` **không mở thêm khoá nào ở nhóm B.**

**Bao trọn** `pi` **mở vùng hội thoại (nhóm A)** — qua `registerEntryRenderer`, bead `m2-wi-16`
(id thật: `m2-wi-16-036`, hiện `deferred`).

### 🔒 **0 dòng** — dòng duy nhất của lần đo 1 đã tìm ra đường vòng


| Dòng                                   | Lần đo 1 nói                    | Lần đo 2                                                                                                                        |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Chỉ báo chế độ** (badge plan/bypass) | `StatusHost` là slot đơn, không seam nào cho extension | **Slot đơn thì đúng** (`composer.ts:131` / `:134` / `:341` / `:925`), **nhưng `setHeader` nằm ngay trên nó** → dựng chip trong `setHeader`. **✅\*** |

⇒ **Không còn dòng 🔒 nào trong bảng.** Xem phần chứng minh ở [nhóm B](#b-ô-nhập).




<a id="kết-luận-khả-thi-có-làm-được-và-phần-nào-cần-core"></a>
## Kết luận khả thi: CÓ, và phần nào cần core

Câu hỏi là *"bề mặt lấy opencoding, ruột lấy ULW — làm được không"*. Đo lại trên `36d9ba9496`: **làm được,
và chỉ một lát nhỏ là cần core.** Bốn primitive bên dưới là lý do.

> ⚠️ **Bảng này ở lần đo 2 mới đúng về mặt cấu trúc, và chưa đúng về mặt kỳ vọng.** Ba điều phải nói trước:
> **(1)** tôi bỏ sót `ctx.ui.custom()` — seam mạnh nhất hệ thống, xem primitive 4.
> **(2)** cột "Extension?" ở trên gộp **ba loại việc khác nhau** — có cái là UI, có cái là *feature chưa tồn tại*.
> Xem [§Ba loại việc](#ba-loại-việc-bảng-cột-extension-gộp-mất).
> **(3)** "Có seam" ≠ "có dữ liệu để vẽ". Xem [§Dữ liệu](#dữ-liệu-extension-có-nhìn-thấy-gì).

### Bốn primitive làm cho nó thành khả thi

**1. `@oh-my-pi/pi-tui` có public wildcard subpath — "ruột lấy của ULW" là import được, không phải ảo.**

`packages/tui/package.json` khai 11 subpath, trong đó **4 wildcard**: `./*`, `./theme/*`, `./components/*`, `./*.js`.
Extension ở `~/.ultraworkers/extension/` import được **mọi** component ULW: `select-list` (30 KB), `table`,
`tree-view`, `editor` (174 KB), `markdown` (154 KB), `overlay-box`, `box`, `disclosure`, `progress-bar`,
`metric`, `scroll-view`, `transcript-browser`, `qrcode`…
⇒ "chép thiết kế, viết lại trên primitive ULW" là việc làm được, không phải câu khẩu hiệu.

**2. Extension nhận instance TUI thật — nhưng ở hai độ rộng khác nhau, và cái thứ hai đã bị thu hẹp.**

| Bề mặt | Kiểu khai | Nguồn |
| --- | --- | --- |
| `setWidget` / `setHeader` / `setFooter` | `(tui: TUI, theme: Theme)` | `packages/tui/src/chat/extension-types.ts:7` |
| `setEditorComponent` / `custom` | `(tui: ExtensionTUISurface, theme, keybindings)` | `interactive-mode.ts:6838` · `types.ts:369` |

Về runtime **cùng một instance** — `extension-ui-controller.ts:552` truyền `factory(this.ctx.ui, theme)`.
Khác biệt nằm ở **tầng kiểu**, và đó là điểm tốt: `ExtensionTUISurface` (`packages/tui/src/tui.ts:762`)
`extends Container` + đúng 10 thành viên, **không** có `setFrameProvider` · `injectDebugInput` ·
`getMutableViewport` · `addPaintListener`. Extension đủ sức dựng UI thật và **không** với tới được khung hiển thị trần.

**3. `registerMessageRenderer` đang chạy, và vòng emit→render khép kín.**
Chuỗi đầy đủ ở phần [nhóm A](#a-hiển-thị-hội-thoại). Mặt emit: `sendMessage<T>` (`types.ts:2077`) nhận
`CustomMessagePayload` = `string | { customType, content, display, details, attribution }`
(`packages/tui/src/chat/messages.ts:42-45`; `CustomMessage` đầy đủ ở `:229-237`).
⇒ extension phát ra message của riêng nó, đăng ký renderer theo `customType`, vòng kín.

**4. `ctx.ui.custom<T>()` — overlay toàn màn hình có focus, trả Promise.** `types.ts:369-378`.

```ts
custom<T>(factory: (tui, theme, keybindings, done: (result: T) => void) => Component,
          options?: { overlay?, overlayOptions?, onHandle?, signal? }): Promise<T>
```

Đây là **seam mạnh nhất** và nó phục vụ đúng những bề mặt mà `setWidget` không phục vụ được:
`LogSelector` (44.7 KB) · `TrustDialog` (14 KB) · `wizard/` (6 file) · `Onboarding.tsx` (8.3 KB) ·
`HistorySearchDialog` · `GlobalSearchDialog`. Tất cả là **full-screen có bàn phím**, không phải widget dải.

### Phán quyết theo nhóm

| Nhóm | Seam | Cần sửa core? |
| --- | --- | --- |
| **B. Ô nhập** | `setEditorComponent` → `#runtimeChildren` (`composer.ts:239`, mount `:377`/`:784`) | ❌ **không** |
| **C. Chrome & trạng thái** | `setWidget` / `setHeader` / `showOverlay` | ❌ **không** |
| **D. Bộ chọn & hộp thoại** | `showOverlay` + component ULW | ❌ **không** |
| **E. Spinner & hiệu ứng** | `setWidget` | ❌ **không** |
| **F. Tool renderer** | `renderCall`/`renderResult` trên tool definition | ❌ **không** |
| **A. Hội thoại — message của extension** | `sendMessage` + `registerMessageRenderer` | ❌ **không** |
| **A. Hội thoại — message của core** | `registerEntryRenderer` — `m2-wi-16-036` `deferred` | ✅ **có** |

<a id="ba-loại-việc-bảng-cột-extension-gộp-mất"></a>
### Ba loại việc — cột "Extension?" ở trên gộp mất

Cột ✅ của bảng trên chỉ trả lời *"chỗ vẽ có không"*. Nó **không** trả lời *"vẽ cái gì"*. Ba loại:

| Loại | Ví dụ trong bảng | Đáp ứng? |
| --- | --- | --- |
| **UI tái dựng** — dữ liệu đã có sẵn trong ULW | `PlanApprovalMessage` · `CompactBoundaryMessage` · `SystemAPIErrorMessage` | ✅ |
| **UI cần dữ liệu** — extension tự tích từ event | `RateLimitMessage` · `CollapsedReadSearchContent` | ✅ *đủ, xem dưới* |
| **UI cần FEATURE mà ULW không có** | `FeedbackSurvey/` (47 KB) · `TrustDialog/` · `LogSelector` · `MemoryFileSelector` · `HelpV2/` | ❌ **không phải việc UI** |

⚠️ **Hàng thứ ba là chỗ dễ hứa quá.** `FeedbackSurvey` cần một feedback system — ULW không có.
`TrustDialog` cần trust posture — ULW không có (`isProjectTrusted()` vẫn là `() => true`; đó là **M2 WI-20
đang `deferred`**). **Extension không tạo được feature, chỉ tạo được UI cho cái đã tồn tại.**
⇒ Nếu bảng này được đọc như "mọi dòng ✅ nghĩa là dựng lại được", thì **sai**. Đúng là: dựng lại được phần
*trình bày*; phần *dữ liệu* thì phải tự tích hoặc phải mở feature ở core.

<a id="dữ-liệu-extension-có-nhìn-thấy-gì"></a>
### Dữ liệu — extension có nhìn thấy gì

36 event (`types.ts`, `on(event: …)`). Đọc payload thật cho từng message opencoding cần:

| Message opencoding | Nguồn dữ liệu | Đủ? |
| --- | --- | --- |
| `RateLimitMessage` | `AutoRetryStartEvent{attempt, maxAttempts, delayMs, errorMessage, errorId?}` — `extensibility/shared-events.ts:249-256` | ✅ **đúng thứ cần** |
| `PlanApprovalMessage` | `tool_approval_requested` → `approvalMode: "always-ask" \| "write" \| "yolo"` — `tools/approval.ts:21` | ✅ |
| `CompactBoundaryMessage` | `session_compact` | ✅ |
| `SystemAPIErrorMessage` | `message_end` · `retry_fallback_applied` | ✅ |
| `ShutdownMessage` | `SessionShutdownEvent` — `shared-events.ts:98-100` | ⚠️ payload là **`{}` rỗng**: biết có shutdown, **không biết lý do** |
| `InterruptedByUser` | `TurnEndEvent{turnIndex, message, toolResults}` — `:218-223` | ⚠️ **không có cờ `interrupted`**; phải suy từ `message.stopReason` |
| `CollapsedReadSearchContent` | `tool_call` + `tool_result` | ⚠️ tự gom được, nhưng `#readGroup` của core là **state nội bộ** → phải dựng lại |
| `SnipBoundaryMessage` | ❌ không có `snip` event | ❌ |

**Nhóm F có một cái bẫy riêng, và nó đã được ULW đóng đúng.** `toolRenderers` là
`Readonly<Record<…>> = Object.freeze(…)` — `packages/tui/src/tools/index.ts:34-39`, docblock tự nói lý do:
*"Frozen: this is core's built-in presentation, not an extension point… A plugin that wants a different
transcript for its own tool declares `renderCall`/`renderResult` on the tool definition."*
⇒ Đường đúng cho extension là per-tool, **đã mở sẵn**. Đừng cố ghi vào `toolRenderers` — bead M2 WI-4
đóng backdoor đó có chủ đích.

### Ba khoảng trống thật — đọc cái này trước khi hứa ai

1. **`registerEntryRenderer`** — thay rendering của message type **của core**. Bead `m2-wi-16-036`,
   `deferred`. Chặn **đúng một dòng bảng**.
2. **Catalog status line đóng** — không đăng ký segment mới (`modes/settings.ts:280` +
   `packages/tui/src/status-line/schema.ts:2-30`). Và không có chỗ nào hiện approval mode
   (`grep -rn "bypass\|permissionMode\|approvalMode" packages/tui/src/status-line/` → **0 hit**).
3. **Không có seam cho feature-mới.** Đây là cái quan trọng nhất về mặt kỳ vọng: extension tạo được
   *trình bày*, không tạo được *tính năng*. `FeedbackSurvey` hay `TrustDialog` *thật* là việc khác hẳn và
   phải mở ở core (hàng thứ ba của [§Ba loại việc](#ba-loại-việc-bảng-cột-extension-gộp-mất)).

### Thứ tự làm — **không mở `m2-wi-16` ngay**

Nó chỉ chặn một dòng bảng, không chặn sáu dòng còn lại. Mở nó lúc này là chi phí lớn nhất đổi lấy
ít giá trị nhất.

1. **Dựng thử hai component đại diện, mỗi thứ một seam** — đừng dựng thử hai cái qua cùng một seam, vì
   khi cái thứ hai hỏng thì không biết seam nào có vấn đề:
   - `PromptInputModeIndicator.tsx` của opencoding chỉ **2.8 KB**, dựng trong **`setHeader`** → trả lời
     *dải/chrome dải được không*.
   - `HistorySearchDialog` (4.5 KB) qua **`ctx.ui.custom()`** → trả lời *full-screen có focus được không*.
   
   Phép thử này rẻ nhất và nó đo **cả hai tầng seam** thay vì một.
2. **Cập nhật bảng này theo kết quả** — mỗi dòng ✅ chuyển thành "đã dựng thật, kèm ảnh chụp", không phải "seam có sẵn".
3. **Chỉ mở `m2-wi-16`** nếu owner thực sự muốn thay *cách hiển thị assistant/tool của core*. Đó là quyết định
   khác hẳn và đắt hơn nhiều: nó đụng `chat-transcript-builder.ts:286-296`, tức **đường dữ liệu hiển thị của mọi lượt**.

### Giới hạn của phép đo này

- Bảng có 279 dòng. Đo lại này xác minh **các claim mang tải quyết định** (seam, renderer, `StatusHost`,
  export map, độ rộng handle) — **không** kiểm từng dòng của bảng.
- opencoding là **snapshot tĩnh v2.8.4 không có `.git`** (`.tmp/opencoding-main`, bị `.gitignore:32` bỏ qua).
  Không pull được; nếu upstream đã tiến, phần *nội dung* so sánh có thể lệch. Phần *seam của ULW* thì đo
  trực tiếp trên cây này nên không lệch.



### Sai lầm của tôi trong chính bảng này — ghi lại để không ai tin bảng mù

Tôi **đánh 🔒 sai 3 lần**, cùng một cách: **đọc tên file rồi suy quan hệ, không kiểm chỗ dùng thật.**


| #   | Tôi ghi                                | Thật                                                                                      |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | `prompt/input-modes`                   | **không tồn tại** trong `packages/tui/src/prompt/`                                        |
| 2   | `status-line/footer.ts` là mặt UI chạy | **code chết** — 0 chỗ mount trong source; thật là `StatusLineComponent`                   |
| 3   | ULW không có transcript browser        | **có** — `chat/transcript-browser.ts` 9 KB, và `annotate/text-source.ts:127` đã dùng thật |


Cách thoát, áp dụng từ đây: **tìm chỗ ULW đã instantiate component đó ở đâu** — nếu chính ULW đã
`new` nó mà không sửa core, nó làm được. Đừng suy từ tên file.

<a id="các-neo-đã-rotted"></a>
### Các neo đã rotted — và hai chỗ đo lại đã sai

Bảng này đo ở `1fc59d9`; đo lại ở `36d9ba9496`. Số dòng **đã trôi**, và một neo đã trôi vào chỗ sai hoàn toàn:

| Neo cũ (lần đo 1) | Đúng ở `36d9ba9496` | Hậu quả |
| --- | --- | --- |
| `interactive-mode.ts:6772`, `:6791+` (setEditorComponent) | **`interactive-mode.ts:6838`** | Hai dòng cũ trỏ vào **code shutdown/teardown**, không phải editor |
| `composer.ts:922` (statusHost.setComponent) | `composer.ts:925` | Lệch 3 dòng — vô hại |
| `composer.ts:131` (StatusHost) | `composer.ts:131` ✅ | Không đổi |
| `types.ts:414`, `extension-ui-controller.ts:205`, `unavailable-ui.ts:74` | ✅ cả ba | Không đổi |

**Hai kết luận sai hơn là do đo, không phải do trôi neo:**

| # | Lần đo 1 nói | Lần đo 2 |
| --- | --- | --- |
| 4 | Nhóm A cần `registerEntryRenderer` cho **mọi** thứ | `registerMessageRenderer` **đang chạy** — chỉ không phủ message type của core. Khoá **hẹp hơn nhiều**. |
| 5 | "Chỉ báo chế độ" 🔒 — *nằm ngoài mọi seam* | Ràng buộc slot đơn thì đúng; **kết luận thì sai** — `setHeader` nằm ngay trên nó |

⇒ Bài học của lần đo 1 **không chỉ** là "đừng suy từ tên file". Lần này thêm một: **đừng suy từ tên file *của loại
thứ***. Nhóm F có tám dòng, ULW đã có sẵn bản riêng cho `todo` và `websearch`, nên rất dễ đoán "phần tool
renderer thì không có seam nào". **Sai** — chính docblock của `toolRenderers` (`tools/index.ts:34-39`) đã ghi
đường thay thế bằng văn bản. Đọc docblock trước khi kết luận về một registry.

### Một neo đã rotted **sau** lần đo 2 — đo lại ở `80d3882e5a` (2026-10-02)

Dòng 462 trong phần `TrustDialog` ghi: *"`isProjectTrusted()` vẫn là `() => true`; đó là **M2 WI-20 đang
`deferred`**"*. **Cả hai vế sai**, và tôi để nguyên dòng đo cũ vì nó **đúng lúc đo**:

| vế | lần đo 2 nói | đúng ở `80d3882e5a` |
| --- | --- | --- |
| `isProjectTrusted()` | `() => true` | `() => isProjectTrustedForScope(this.settings)` — `extensions/runner.ts:2020`, `session/agent-session.ts:7795` |
| `m2-wi-20-049` | `deferred` | **`open`** (đọc thẳng `.beads/issues.jsonl`, không phải từ ghi chú) |

**Kết luận của dòng đó vẫn đúng** — ULW không có trust posture ở tầng nạp — nhưng **lý do** đã cũ. Nay còn
thêm một điều mà lúc đo chưa có: `assertTrusted` **tồn tại** và `ProjectTrustError` **tồn tại**, chỉ là
**không có caller trong `src/`**. Tức quyết định đã lưu được, hiển thị được, và **không ai gọi tới nó**.

Bài học bổ sung: một neo có thể rotted theo **hai** chiều — dòng trôi, **và trạng thái bead đổi**. Lần đo 2
ghim một sha, nhưng `deferred`/`open` là trạng thái tracker, không phải thuộc tính của commit đó.

**Hai bên đều có** `todo` và `websearch` — ULW có bản riêng (`todo.ts` 27 KB, `web-search.ts` 14 KB), opencoding render chung trong `messageActions.tsx`. **Ở phần này nên giữ UI của ULW**, đúng như bạn nói.