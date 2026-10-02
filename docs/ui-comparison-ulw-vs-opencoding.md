claude --resume d5884351-0d86-4c51-8465-3fbc06446635

# So sánh bề mặt UI — ULW (`ultraworkers`) vs `opencoding`

**Đo:** 2026-10-02 · ULW `packages/tui/src/` · opencoding `HEAD 1fc59d9` (`quangdang46/opencoding`)
**Mục đích:** owner chọn cái nào để dựng lại trong `~/.ultraworkers/extension/ulw-openTUI`.

> ⚠️ **Hai bên vẽ bằng hai thứ khác nhau.** opencoding dùng **React +** `@opencoding/ink` (441 + 409 import);
> ULW dùng **TUI tự viết, differential rendering** (1 file import react trong `src/`).
> Extension ULW nhận `ExtensionUiComponentFactory = (tui, theme) => ExtensionUiComponent` — **component của ULW, không phải cây React**.
> ⇒ **Không chép code được.** Chép *thiết kế*, viết lại trên primitive ULW.

> ⚠️ **Cột "Làm được băng extension?"** — ô ✅ nghĩa là qua `setWidget`/`setHeader`/`setFooter`/`setEditorComponent`,
> **làm được ngay hôm nay**. Ô ❌ nghĩa là cần `registerEntryRenderer` (0 hit ở ULW, bead `m2-wi-16` đang `deferred`).
> Ô 🔒 nghĩa là **nằm ngoài mọi seam** — không phải chờ việc bao trọn `pi`, mà là việc chưa tồn tại.

Ô trống = **bên đó không có**.

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




## B. Ô nhập

> ℹ️ **Vùng này tôi đã đánh dấu 🔒 sai lần đầu.** Nguyên nhân: tôi suy từ "nó thuộc editor" mà không kiểm
> `setEditorComponent` đã tồn tại. Nó **có**, ở HEAD, không chờ bead nào (`types.ts:414`,
> `interactive-mode.ts:6772`, `extension-ui-controller.ts:205`, `unavailable-ui.ts:74`).
> `CustomEditor` là **subpath public**: `packages/tui/package.json` có `"./*": "./src/*.ts"`, nên
> `@oh-my-pi/pi-tui/prompt/custom-editor` import được từ ngoài repo.
> Đo trong `custom-editor.ts`: shimmer **18** hit, queue **33**, chips **8**, placeholder **3**.
> ⇒ Tất cả nằm trong `CustomEditor` → ✅ hết.
>
> **Cái giới hạn thật:** core **gán đè** sau khi factory trả về (`interactive-mode.ts:6791+`) —
> `placeholder`, `composerState`, `attachmentChips`, `imageReferenceHyperlink`, `skillFilePath`,
> `modelMentionLabel`, `magicKeywordsEnabled`, viewport, vim, spelling. Thay editor ≠ mua được
> `placeholder` tuỳ ý; phải đi qua closure core đặt sẵn.


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
> | Chỉ báo chế độ | `tui/status-line/component.ts` (badge plan/bypass, **5** hit; `segments.ts` chỉ 2) | `PromptInput/PromptInputModeIndicator.tsx` (2.8) | 🔒 |
> | Mic | `tui/prompt/video.ts` (1.5) | `PromptInput/VoiceIndicator.tsx` (2.0) | ✅ |
> | Menu trợ giúp | `tui/prompt/composer-hints.ts` (3.0) | `PromptInput/PromptInputHelpMenu.tsx` (4.7) | ✅ |
> | Cảnh báo sandbox | | `PromptInput/SandboxPromptFooterHint.tsx` (1.7) | ✅ |
> | Autocomplete ký tự | `tui/prompt/word-completion.ts` (8.6) + `macos-spelling.ts` (13 KB) | | |
> | Autocomplete emoji | `tui/prompt/emoji-autocomplete.ts` (9.2) | | |
> | Autocomplete model | `tui/prompt/model-mention-autocomplete.ts` (4.2) | | |
> | Autocomplete GitHub ref | `tui/prompt/github-ref-autocomplete.ts` (3.3) | | |
> | Autocomplete hành động | `tui/prompt/prompt-action-autocomplete.ts` (12 KB) | | |



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
| Hệ hiển thị                | TUI tự viết, differential    | React + `@opencoding/ink`                 |
| Chép code được?            | —                            | ❌ **không**                               |
| Làm bằng extension hôm nay | ✅                            | ~373/418 file                             |
| Cần `m2-wi-16` trước       | —                            | `messages/` 45 file (147 KB) + nhóm E     |




### Trả lời: "làm bao trọn `pi` thì 🔒 có mở không?"

**Vùng ô nhập (nhóm B): không — và không cần.** 🔒 ở đó là tôi đánh dấu sai ở lần đầu.
`setEditorComponent` đã có sẵn ở HEAD. **Bao trọn** `pi` **không mở thêm khoá nào ở nhóm B.**

**Bao trọn** `pi` **mở vùng hội thoại (nhóm A)** — qua `registerEntryRenderer`, bead `m2-wi-16`
(id thật: `m2-wi-16-036`, hiện `deferred`).

### 🔒 còn đúng **1 dòng**, và nó **không** thuộc phạm vi bao trọn `pi`


| Dòng                                   | Vì sao                                                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Chỉ báo chế độ** (badge plan/bypass) | Nằm trong `StatusLineComponent` (`component.ts` **139 KB**), mount vào `#statusHost` — và `StatusHost` là **slot đơn**: `setComponent` **thay thế**, không cộng dồn (`composer.ts:131`, `:922`). Không seam nào cho extension. |




### Sai lầm của tôi trong chính bảng này — ghi lại để không ai tin bảng mù

Tôi **đánh 🔒 sai 3 lần**, cùng một cách: **đọc tên file rồi suy quan hệ, không kiểm chỗ dùng thật.**


| #   | Tôi ghi                                | Thật                                                                                      |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | `prompt/input-modes`                   | **không tồn tại** trong `packages/tui/src/prompt/`                                        |
| 2   | `status-line/footer.ts` là mặt UI chạy | **code chết** — 0 chỗ mount trong source; thật là `StatusLineComponent`                   |
| 3   | ULW không có transcript browser        | **có** — `chat/transcript-browser.ts` 9 KB, và `annotate/text-source.ts:127` đã dùng thật |


Cách thoát, áp dụng từ đây: **tìm chỗ ULW đã instantiate component đó ở đâu** — nếu chính ULW đã
`new` nó mà không sửa core, nó làm được. Đừng suy từ tên file.

**Hai bên đều có** `todo` và `websearch` — ULW có bản riêng (`todo.ts` 27 KB, `web-search.ts` 14 KB), opencoding render chung trong `messageActions.tsx`. **Ở phần này nên giữ UI của ULW**, đúng như bạn nói.