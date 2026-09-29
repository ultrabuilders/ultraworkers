# codex — chunk 7/7 (9 năng lực)

## codex.133 Sao chép có cấu trúc: cell, dòng, cây, cả cây

- **where:** codex-rs/tui/src/clipboard_copy.rs (29 KB) + chatwidget/copy_picker.rs + markdown_copy.rs + transcript_export.rs
- **what:** `/copy` mở chọn phần nào cần chép; `/export` xuất cả hội thoại ra markdown; clipboard dạng HTML qua clipboard_html.rs.
- **how:** Clipboard chạy qua worker riêng (`ClipboardWorker` trong `tui.rs`) để không chặn vòng vẽ.
- **solves:** Chép đúng phần mình cần mà không lẫn terminal escape.
- **port effort:** Thấp-Trung bình. Copy-theo-cấu-trúc thay vì copy-theo-màu rất đáng lấy. | **idea only:** True
## codex.134 Chế độ raw scrollback để copy thuận tiện

- **where:** codex-rs/tui/src/slash_command.rs (`Raw`), keymap `toggle_raw_output` (keymap.rs:1656), cờ `raw_output_mode`
- **what:** `/raw` (mặc định `Alt+R`) tắt khung cảnh hoá tạm thời để terminal selection hoạt động như thường.
- **how:** Lệnh nằm trong cả nhóm `available_during_task` lẫn `available_in_side_conversation` — cố ý cho phép bật giữa lúc chạy.
- **solves:** Giải quyết xung đột nền tảng giữa "TUI đẹp" và "copy được".
- **port effort:** Thấp. | **idea only:** True
## codex.135 Trợ giá kiểm tra cấu hình từ trong TUI

- **where:** codex-rs/tui/src/debug_config.rs (52 KB) + chatwidget/status_surfaces.rs (51 KB) + warnings_view.rs
- **what:** `/debug-config` in ra tầng cấu hình và nguồn của từng yêu cầu; `/status` in cấu hình phiên + mức dùng token; `/warnings` giữ lại cảnh báo để xem sau.
- **how:** `DebugConfig` bị ẩn khỏi popup qua bộ lọc `starts_with("debug")` nhưng vẫn gõ tay chạy được.
- **solves:** Nguyên nhân hàng đầu của "tính năng của tôi không hoạt động" — trả lời được ngay trong app.
- **port effort:** Trung bình. File 52 KB cho thấy đây là công sức lớn; giá trị của việc trả lời câu hỏi đó thì rất cao. | **idea only:** True
## codex.136 Kiểm tra chéo cấu hình bằng chính bộ chẩn đoán

- **where:** codex-rs/config/src/{types.rs, tui_effects.rs, tui_rendering.rs, strict_config.rs} + config-schema/
- **what:** Mọi struct cấu hình dùng `#[schemars(deny_unknown_fields)]`, và `strict_config` làm lỗi khi gặp khoá không nhận ra thay vì âm thầm bỏ qua.
- **how:** AGENTS.md yêu cầu chạy `just write-config-schema` khi đổi `ConfigToml`, sinh schema đã commit.
- **solves:** Ngăn việc config sai âm thầm.
- **port effort:** Thấp-Trung bình. Rẻ hơn nhiều so với tự viết validator. | **idea only:** True
## codex.137 Chính sách không viết prompt trong mã

- **where:** codex-rs/tui/assets/prompt_for_init_command.md + codex-rs/prompts/
- **what:** Prompt nằm ở file `.md` riêng, import bằng `with { type: "text" }`, tránh tạo prompt từ string concatenation.
- **how:** Tách prompt ra file cho phép sửa/review không cần đụng code.
- **solves:** Prompt trở thành artefact review được thay vì biến số ẩn trong logic.
- **port effort:** Thấp. Đây là quy tắc AGENTS.md của chính ultraworkers — Codex chỉ thực hành, không phát minh. | **idea only:** True
## codex.138 Thư mục tự hướng dẫn trong chính mã nguồn

- **where:** codex-rs/tui/src/bottom_pane/mod.rs (20 dòng doc đầu) + codex-rs/tui/src/bottom_pane/AGENTS.md + codex-rs/AGENTS.md (22 KB)
- **what:** Module doc của `bottom_pane/mod.rs` mô tả đúng thứ tự ưu tiên Ctrl+C/Ctrl+D và ai quyết interrupt so với quit; `src/bottom_pane/AGENTS.md` yêu cầu giữ doc đồng bộ với state machine.
- **how:** Doc viết ở dạng top-down giải thích luồng.
- **solves:** Trong TUI 425k dòng, phần lớn sự phức tạp là ở thứ tự quyết định, không phải ở thuật toán — doc ở đúng chỗ là thứ giữ được.
- **port effort:** Thấp. Đáng đánh giá cao. | **idea only:** True
## codex.139 Chính sách "cho phép trong lúc task chạy"

- **where:** codex-rs/tui/src/slash_command.rs (`available_during_task`, dòng ~238-300)
- **what:** 37/62 lệnh chạy được khi task đang chạy, kể cả lệnh thuần trình bày như `/statusline`, `/title`, `/model`, `/permissions`, `/skills`.
- **how:** Predicate khai trên enum, popup lọc theo; lệnh bị chặn hiện thông báo cụ thể thay vì im lặng biến mất.
- **solves:** Người dùng không bị khoá khỏi cài đặt chỉ vì agent đang bận.
- **port effort:** Thấp. Nhưng chính sách này hiện KHÔNG nhất quán — xem finding #2. | **idea only:** True
## codex.140 Sidebar "hội thoại phụ" (`/side`, `/btw`)

- **where:** codex-rs/tui/src/slash_command.rs (`available_in_side_conversation`), chatwidget/side.rs, src/multi_agents.rs (34 KB)
- **what:** Mở nhánh hội thoại tạm trong một fork thoảng, không phá hội thoại chính; 12 lệnh vẫn dùng được bên trong.
- **how:** Popup tự ẩn phần lệnh không dùng được khi đang ở side conversation.
- **solves:** Hỏi một câu phụ mà không làm nhiễu luồng chính.
- **port effort:** Trung bình. | **idea only:** True
## codex.141 Bảng thống kê chi phí theo luồng (50 credits · ~$1.82)

- **where:** codex-rs/tui/src/status/{card.rs (35 KB), thread_usage.rs, rate_limits.rs, account.rs} + chatwidget/thread_usage.rs
- **what:** `/status` hiển thị cards: Thread usage (credits + USD), phân bổ model, phân bổ reasoning, tốc độ, token đã bill (kể cả cached), cửa sổ ngữ cảnh.
- **how:** Snapshot thật: `│  Thread usage:  50 credits · ~$1.82  │` / `│  Models: GPT-5.4 80%, GPT-5 Mini 20%  │` / `│  Billed tokens: 120 input (25 cached) + 50 output │` trong khung bo góc.
- **solves:** Thấy tiền trước khi thấy hóa đơn.
- **port effort:** Thấp-Trung bình cho phần hiển thị; phần tính tiền phụ thuộc backend. | **idea only:** True

