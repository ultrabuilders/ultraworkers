# codex — chunk 6/7 (22 năng lực)

## codex.111 Giới hạn 120 FPS ở tầng driver thay vì ràng buộc mọi widget

- **where:** codex-rs/tui/src/tui/frame_rate_limiter.rs (2.1 KB) + tui/frame_requester.rs (15 KB)
- **what:** Widget gọi `schedule_frame()` bao nhiêu cũng được; một limiter duy nhất ở tầng async scheduler kẹp deadline ≥ 8.33 ms.
- **how:** `clamp_deadline(requested)` = `requested.max(last_emitted + MIN_FRAME_INTERVAL)`; tách riêng một helper thuần tuý để unit-test được.
- **solves:** Animation liên tục (shimmer, spinner, pet) không khiến CPU cháy khi người dùng nhìn không kịp.
- **port effort:** Rất thấp. ~40 dòng, có thể chép nguyên văn. | **idea only:** False
## codex.112 Bật/tắt animation 6 effect, tự dò screen reader 1 lần

- **where:** codex-rs/tui/src/screen_reader.rs (6.7 KB) + screen_reader_windows.rs + config/src/tui_effects.rs
- **what:** `[tui.effects]` có 6 công tắc (starfield, shimmer, welcome, effort, progress, title), tất cả phụ thuộc khoá tổng `[tui] animations`. Động vui tự tắt nếu phát hiện screen reader, thời gian chờ probe 450 ms, kết quả ghi nhớ để không dò lại.
- **how:** `OnceLock<MotionMode>` cho probe 1 lần; nhận `&ConfigLayerStack` để lưu xuống config mà vẫn tôn trọng lựa chọn tường minh của người dùng.
- **solves:** Tôn trọng người dùng hỗ trợ trợ năng mà không bắt họ phải tự tìm khoá cấu hình.
- **port effort:** Thấp. Cơ chân "probe 1 lần + ghi nhớ + tôn trọng override tường minh" rất dễ port. | **idea only:** True
## codex.113 Trình cải hoa/blossom chạy ngay trong terminal

- **where:** codex-rs/tui/src/empty_state_animation.rs (6.4 KB) + 6 module con {geometry,lighting,paths,policy,renderer,sequence}
- **what:** Một animation pixel ở trạng thái rảnh, vẽ trực tiếp vào `Buffer` ở 20 fps, có bóng đổ mô phỏng, tôn trọng `ComposerState::{Empty,Draft}`, và dừng bộ đếm thời gian khi bị ẩn.
- **how:** Comment đầu file: "Visible time pauses while hidden; conversation lifecycle tracking is retained for the header."
- **solves:** Trạng thái rảnh vốn chết; biến nó thành chỗ báo "tôi đang ở đây".
- **port effort:** Cao. Chủ yếu là thẩm mỹ; giá trị chuyển giao nằm ở nguyên tắc "đồng hồ dừng khi ẩn". | **idea only:** True
## codex.114 Terminal pet (8 sprite) phản hồi trạng thái task

- **where:** codex-rs/tui/src/pets/ (10 file ~130 KB): catalog, model, ambient, image_protocol, sixel, frames, preview, picker, asset_pack
- **what:** `/pets` bật pet cạnh composer, đổi khung ảnh theo trạng thái: Running 3 phút, Failed 1 giờ, Waiting 24 giờ, Review 7 ngày. Hỗ trợ 3 giao thức ảnh terminal.
- **how:** 8 pet tích hẹp. Asset tải về `$CODEX_HOME/cache/tui-pets` (pack v1, CDN oaistatic, tối đa 4 MB, timeout 60 s). Ca ghép hình 192×208, lưới 8×9.
- **solves:** Trạng thái task nhìn thấy được từ rất xa — bạn rời ghế cũng biết nó còn chạy, đang chờ, hay đã chết.
- **port effort:** Trung bình. Bản rút gọn (1 sprite, 2-3 trạng thái) rất dễ; bản đầy đủ có CDN + 3 protocol ảnh thì nặng. | **idea only:** True
## codex.115 Bốn renderer giàu nội dung bật/tắt độc lập

- **where:** codex-rs/tui/src/markdown_render.rs (112 KB) + markdown_render/math/ + codex-rs/mermaid/ + src/table_detect.rs + assets/inline_visualization/
- **what:** `[tui.rendering]` bật/tắt: mermaid, math (Unicode), tables (pipe table kể cả trong fence), lists (bullet/task-list thành ký hiệu Unicode). Tắt thì giữ nguyên nguồn.
- **how:** Cố ý tách khỏi `animations` — "Rich content rendering. Independent of animations and visual effects."
- **solves:** Markdown thô trong terminal rất khó đọc; đồng thời phải chừa đường lùi cho ai không muốn.
- **port effort:** Trung bình-Cao cho mermaid+math; tables/lists thì thấp. | **idea only:** True
## codex.116 Dashboard phân tích tài khoản ngay trong TUI

- **where:** codex-rs/tui/src/analytics/ (~40 file) + analytics/activity_chart + analytics/plot
- **what:** Một overlay toàn màn hình với tab báo cáo, biểu đồ, bảng chọn và chi tiết nội tuyến.
- **how:** `Overlay::Analytics(Box<AnalyticsView>)` là biến thể thứ 3 của pager overlay. Comment: "Authenticated account analytics dashboard. Stable report tabs share bounded account loads, selection, and inline details."
- **solves:** Xem tiêu tốn token/chi phí mà không rời luồng làm việc.
- **port effort:** Cao. Phụ thuộc backend tài khoản; chỉ phần vẽ biểu đồ trong terminal mới đáng lấy. | **idea only:** True
## codex.117 Thông báo desktop qua OSC 9 / BEL với điều kiện focus

- **where:** codex-rs/tui/src/notifications/{mod,osc9,bel}.rs + config `notification_condition`
- **what:** Backend OSC 9 cho terminal hỗ trợ, rơi về BEL. Điều kiện mặc định chỉ báo khi terminal mất focus.
- **how:** `supports_osc9()` whitelist đúng 5 terminal (Ghostty, iTerm2, Kitty, Warp, WezTerm); có test khẳng định 10 terminal còn lại phải rơi về BEL.
- **solves:** Hay báo "xong rồi" khi người dùng đang ở cửa sổ khác.
- **port effort:** Rất thấp. ~100 dòng. | **idea only:** False
## codex.118 Chế độ inline (giữ scrollback) chọn được qua `/tui` cho lần chạy sau

- **where:** codex-rs/tui/src/chatwidget/tui_mode_picker.rs + cờ `--no-alt-screen` ở tui/src/cli.rs và cli/src/main.rs
- **what:** Chọn giữa Scrollback (dùng scrollback terminal) và Fullscreen (cuộn trong chính Codex). Chân popup ghi rõ "Restart to apply. Launch overrides still apply."
- **how:** `require_explicit_confirmation: true` trên item; giá trị lưu vào local settings cho lần khởi động sau.
- **solves:** Người dùng thích copy scrollback của terminal thì không bị mất khi dùng Codex.
- **port effort:** Thấp. Cơ chân "cài xong hẹn giờ cho lần sau" là mẫu hay. | **idea only:** True
## codex.119 Lịch sử composer có chế độ tìm ngược

- **where:** codex-rs/tui/src/bottom_pane/chat_composer/history_search.rs (50 KB) + vim_history.rs (28 KB) + chat_composer_history.rs (58 KB) + footer.rs:179
- **what:** Ctrl+R mở tìm ngược (có cả biến thể Vim), Ctrl+S sang kết quả kế, Esc quay về giữ nguyên draft.
- **how:** `FooterMode` chuyển sang `HistorySearch`; draft được nhớ riêng để thoát tìm không mất.
- **solves:** Gọi lại prompt cũ rồi sửa, thay vì gõ lại từ đầu.
- **port effort:** Thấp-Trung bình. | **idea only:** True
## codex.120 Chế độ Vim đầy đủ: 4 context, 69 action

- **where:** codex-rs/tui/src/bottom_pane/textarea/vim_commands.rs + keymap.rs (4 bảng action) + keymap/vim_search.rs
- **what:** Không phải "chế độ vim giả": normal / operator / search / text-object thật — 36 + 20 + 4 + 9 action, gồm cả `d i w`, `y a (`, `c a {`.
- **how:** 4 `KeymapContext` riêng với `allows_plain_chord_prefix()` trả true — cho phép prefix 1 ký tự vì phải tránh xung đột với global.
- **solves:** Người dùng vẫn giữ được văn phong edit sau khi bật.
- **port effort:** Cao cho bản đầy đủ; normal+operator cơ bản thì trung bình. | **idea only:** True
## codex.121 Tương tác chuột chọn theo overlay

- **where:** codex-rs/tui/src/tui.rs (`enum OverlayInput`, `captures_mouse`) + tui/alternate_screen.rs + config `right_click_paste`
- **what:** `OverlayInput` quyết định overlay nào bắt chuột: transcript và usage bắt, static pager thì không (vẫn cuộn bằng alternate-scroll), mặc định theo `owned_screen`. Chuột phải bật bằng tay.
- **how:** Đăng ký chuột chỉ khi overlay cần — tránh tranh chấp với scroll của terminal.
- **solves:** Giữ được cuộn bằng scrollback terminal ở nơi còn cần, bật chuột ở nơi cần.
- **port effort:** Thấp-Trung bình. | **idea only:** True
## codex.122 Hook vòng đời hiển thị ngay trên UI

- **where:** codex-rs/tui/src/bottom_pane/hooks_browser_view.rs (57 KB) + hook_status.rs + history_cell/hook_cell.rs (27 KB) + codex-rs/hooks/
- **what:** `/hooks` mở trình duyệt hook với chi tiết lệnh; khi hook chạy, dòng trạng thái hook thay status widget trong composer; hook lỗi sinh `HookCell` trong transcript.
- **how:** Điều kiện hiển thị: `if self.status.is_none() && let Some(message) = &self.hook_status_message` — hook chỉ chiếm chỗ status khi không có việc khác.
- **solves:** Hook vốn là thứ vô hình, giờ thấy được và can thiệp được.
- **port effort:** Trung bình. | **idea only:** True
## codex.123 Chống trùng phiên: thẻ "đang mở ở app khác"

- **where:** codex-rs/tui/src/chatwidget/rendering.rs dòng 23-125 (`struct ExternalWriterNotice` + `impl Renderable`)
- **what:** Khi cùng một hội thoại được mở ở nơi khác, TUI hiện thẻ "🔒 This conversation is open in another app" kèm hàng phím `r` retry / `f` fork / `Esc` command center / `Ctrl+C` `q` exit.
- **how:** Dựng thẻ bằng `Block` + `Insets::tlbr(1,2,1,2)`, tự co dòng theo bề rộng, chân giữ riêng một hàng nếu còn chỗ.
- **solves:** Hai tiến trình cùng ghi một phiên sẽ hỏng dữ liệu; chặn ngay từ UI thay vì để người dùng phát hiện.
- **port effort:** Thấp-Trung bình. Mẫu thẻ cảnh báo + hàng hành động là phần đáng lấy. | **idea only:** True
## codex.124 Bảng quyền tác động tới việc gõ tiếp theo

- **where:** codex-rs/tui/src/bottom_pane/approval_overlay.rs (92 KB) + permissions_menu.rs + permission_popups.rs + config/src/permissions_toml.rs
- **what:** `/permissions` và `request_user_input` hiển thị quyền sắp bị xin (kể cả rule dạng prefix), cho duyệt theo phiên hoặc theo prefix, phím tắt riêng (y / a / p / d).
- **how:** `ApprovalKeymap` 8 action riêng; `open_fullscreen` mặc định `Ctrl+A` và `Ctrl+Shift+A`. Bố cục thật từ snapshot: "Would you like to run the following command?" → Environment → Reason → `$ lệnh` → "› 1. Yes, proceed (y)" → "2. No … (esc)".
- **solves:** Người dùng hiểu ngay lệnh sắp chạy, chạy ở đâu, và vì sao — rồi quyết định có nhớ hay không.
- **port effort:** Trung bình. Phần "duyệt theo prefix" (nhớ cho `git status` nhưng không nhớ cho `rm`) là ý hay nhất. | **idea only:** True
## codex.125 Sandbox / approval chọn ngay từ dòng lệnh

- **where:** codex-rs/tui/src/cli.rs (`mark_tui_args`) + codex-rs/utils/cli/src/{approval_mode_cli_arg,sandbox_mode_cli_arg}.rs + codex-rs/sandboxing/
- **what:** `--ask-for-approval`, `--sandbox`, cùng cờ nguy hiểm `--dangerously-bypass-approvals-and-sandbox`. Ở TUI, cờ bypass và `--auto-review` khai báo `conflicts_with("approval_policy")` — không cho dùng cả hai.
- **how:** Ràng buộc xung đột đặt ở tầng clap chứ không phải kiểm tra thủ công trong code chạy.
- **solves:** Không cho vô tình kết hợp hai chế độ loại trừ đối lập rồi tưởng đang ở chế độ an toàn.
- **port effort:** Thấp. Mẫu "khai báo xung đột ở tầng parser" rất đáng học. | **idea only:** True
## codex.126 Bề mặt CLI tách bạch: 30 lệnh, chỉ TUI mới là tương tác

- **where:** codex-rs/cli/src/main.rs (173 KB, enum Subcommand dòng 143) + codex-rs/exec/src/cli.rs (24 cờ `#[arg]`, enum Command có resume/fork/review)
- **what:** Mỗi lệnh nghiệp vụ có cả hai mặt: interactive (TUI, mở picker) và non-interactive (`codex exec <lệnh>`, in ra stdout). `codex exec` có `--json` (JSONL), `--output-last-message`, `--output-schema`, `--ephemeral`, `--ignore-user-config`.
- **how:** 4 lệnh (`TcpTunnel`, `ResponsesApiProxy`, `StdioToUds`, `Execpolicy`) đánh dấu `hide = true` — tồn tại nhưng không phải bề mặt người dùng.
- **solves:** Script được một CLI nghiêm ngặt, không phải một TUI bị lột vỏ.
- **port effort:** Thấp-Trung bình. Phân tách "interactive vs exec" là quyết định kiến trúc, không phải chi tiết UI. | **idea only:** True
## codex.127 Trình chẩn đoán `codex doctor` 150 KB

- **where:** codex-rs/cli/src/doctor.rs (150 KB) + cli/src/doctor/
- **what:** Lệnh tự kiểm tra cài đặt, config, auth, runtime, in ra kết quả có cấu trúc.
- **how:** Tách riêng thư mục con cho từng nhóm kiểm tra.
- **solves:** Người dùng tự chẩn đoán được thay vì gửi log.
- **port effort:** Thấp-Trung bình. Tên "doctor" là mẫu hay; nội dung kiểm tra thì tuỳ sản phẩm. | **idea only:** True
## codex.128 Nối thẳng từ "agent xong" tới "code chạy được"

- **where:** codex-rs/cli/src/main.rs (biến thể `Apply`, dòng ~198)
- **what:** `codex apply` (alias `a`) lấy diff cuối cùng agent tạo rồi áp vào cây làm việc bằng `git apply`.
- **how:** Không phải lệnh chung chung "apply patch" mà gắn với đúng diff cuối của phiên.
- **solves:** Rút ngắn đường từ "agent xong" tới "code chạy được".
- **port effort:** Thấp. Có thể thêm vào omp. | **idea only:** True
## codex.129 Quản lý session từ CLI không cần vào TUI

- **where:** codex-rs/cli/src/main.rs + tui/src/session_archive_commands.rs + session_queue_commands.rs
- **what:** `archive`, `unarchive`, `delete`, `fork`, `queue`, `resume` đều nhận cả UUID lẫn tên thread, có `--last` và `--all`.
- **how:** UUID được ưu tiên nếu parse được, với comment ghi rõ thứ tự ưu tiên.
- **solves:** Vòng đời phiên quản lý được bằng script.
- **port effort:** Thấp. | **idea only:** True
## codex.130 Sinh TypeScript bindings và JSON Schema từ app-server protocol

- **where:** codex-rs/cli/src/main.rs (`AppServerSubcommand` 5 biến thể) + codex-rs/app-server-protocol/
- **what:** `codex app-server generate-ts` và `generate-json-schema` sinh hợp đồng cho client ngoài, kèm bản internal ẩn.
- **how:** Protocol là crate riêng nên sinh code không cần chạy TUI.
- **solves:** Cho phép có client ngoài mà không phải scrape hoặc đoán.
- **port effort:** Trung bình. Cần một lớp protocol riêng — khó hơn nhiều so với làm UI. | **idea only:** True
## codex.131 Slash popup lọc bằng fuzzy match

- **where:** codex-rs/tui/src/bottom_pane/slash_commands.rs (dùng `codex_utils_fuzzy_match::fuzzy_match`) + command_popup.rs (`on_composer_text_change`)
- **what:** Gõ `/mo` thu hẹp danh sách. Có test riêng khẳng định tìm tiền tố `/ac` loại `/compact` dù `/compact` là duy nhất khớp "compact".
- **how:** Chỉ lấy token đầu sau `/` làm bộ lọc; đổi bộ lọc thì reset scroll. Bảng 49 mục hiện trong cửa sổ cao 2 dòng khi lọc.
- **solves:** Tìm lệnh mà không nhớ tên.
- **port effort:** Thấp. Cần thư viện fuzzy match dùng chung. | **idea only:** True
## codex.132 Cú phích biệt danh `/gooooal` chạy `/goal`

- **where:** codex-rs/tui/src/bottom_pane/slash_commands.rs, cuối `find_builtin_command`
- **what:** Trong `find_builtin_command`, nếu không khớp tên nào, nó thử `strip_prefix('g')` + `strip_suffix("al")` và chỉ nhận khi phần giữa toàn ký tự `o`.
- **how:** Điều kiện kép: `!repeated_os.is_empty() && repeated_os.bytes().all(|b| b == b'o')` → `.then_some(SlashCommand::Goal)`.
- **solves:** Chi tiết vui, không phải vấn đề. Ghi lại vì nó là bằng chứng registry chấp nhận cả matching ngoài enum.
- **port effort:** Không áp dụng. | **idea only:** True
