# codex — chunk 5/7 (22 năng lực)

## codex.89 Guardian: LLM reviewer + host constraint enforcement

- **where:** codex-rs/core/src/guardian/ (mod.rs, decision.rs, review_session.rs) + ext/guardian-reviewer/
- **what:** Approval duoc gui den mot reviewer rieng de auto-approve/auto-deny, NHUNG core van enforce constraint va mandatory-review.
- **how:** decide_approval() -> Option<ReviewDecision>; None = "khong co contributor, dung user flow binh thuong" (comment: "No contributor is never an implicit allow"). Reviewer chi duoc override khi auto_review_required_for_model hoac reviewer config cho phep.
- **solves:** Giam prompt fatigue, nhung khong bao gio de LLM tu quyet dinh khi khong co policy dui sau.
- **port effort:** Trung binh. | **idea only:** True
## codex.90 Granular approval policy

- **where:** codex-rs/protocol/src/protocol.rs:1011
- **what:** 5 co flags bo doc lap: sandbox_approval, rules, skill_approval, request_permissions, mcp_elicitations.
- **how:** false = auto-REJECT (khong phai "im lang cho qua"). Comment tai protocol.rs:1000.
- **solves:** Admin muon cho phep phep shell approval nhung tu choi chay skill script — phai phan biet, khong phai toggle chung.
- **port effort:** Rat thap. | **idea only:** True
## codex.91 SQLite state: 6 DB tach, WAL, migration checksum + cross-version tolerate

- **where:** codex-rs/state/src/{sqlite.rs, migrations.rs}
- **what:** Moi mi domain mot file DB. runtime_migrator set ignore_missing: true de binary cu van mo duoc DB da bi binary moi migrate.
- **how:** sqlx migrate macro; ignore_missing CHI bo qua version moi hon, version da biet van check checksum.
- **solves:** Rollback version + DB da migrate = binary khong mo duoc het, mat het session.
- **port effort:** Trung binh. | **idea only:** True
## codex.92 Durable user-input queue theo thread

- **where:** codex-rs/state/src/runtime/queued_items.rs
- **what:** Message nguoi dung nhap khi agent dang chay duoc queue trong SQLite, doc lai theo revision.
- **how:** PRAGMA data_version tren mot connection detached de theo doi thay doi; changes_since(revision) loc theo thread.
- **solves:** Steer/queue input khi process bi crash hoac restart.
- **port effort:** Thap. | **idea only:** True
## codex.93 Hook lifecycle 12 diem + managed-hooks-only

- **where:** codex-rs/hooks/src/lib.rs; config/src/requirements_layers/stack.rs:233,286
- **what:** 12 hook event; admin dat allow_managed_hooks_only = true trong requirements.toml de ignore user/project/session hooks.
- **how:** Hook chay theo matcher; co output_spill.rs de giu output lon. Setting chi doc trong requirements.toml, dat trong config.toml khong co tac dung.
- **solves:** Enterprise can khoa policy hooks lai ma project config khong chong override.
- **port effort:** Trung binh. | **idea only:** True
## codex.94 Feature flag co stage vang lai

- **where:** codex-rs/features/src/lib.rs
- **what:** Stage: UnderDevelopment | Experimental | Stable | Deprecated | Removed.
- **how:** Registry + resolve effective set; ban Deprecated/Removed van parse de khong break config cu.
- **solves:** Feature flag de lau khong bi xoa, config cu khong parse.
- **port effort:** Thap. | **idea only:** True
## codex.95 Session approval cache nhieu key

- **where:** codex-rs/core/src/tools/sandboxing.rs:44-113
- **what:** ApprovalStore key = serialized approval key; mot lenh apply_patch nhieu file van chi mot prompt nhung tung key duoc cache rieng.
- **how:** with_cached_approval(keys, fetch): neu moi key da ApprovedForSession thi skip; neu approve session, ghi tung key de request sau cham mot subset van khop.
- **solves:** apply_patch modify nhieu file — neu chi cache tong command thi approve cho 1 file se approve het patch.
- **port effort:** Thap. | **idea only:** True
## codex.96 Slash command registry với ưu tiên trình bày do thứ tự enum

- **where:** codex-rs/tui/src/slash_command.rs (366 dòng) — toàn bộ registry nằm trong 1 file; popup dùng lại qua bottom_pane/slash_commands.rs
- **what:** 62 biến thể `SlashCommand` (69 chuỗi kích hoạt), mỗi lệnh mang 3 predicate: `supports_inline_args` (20 lệnh), `available_during_task` (37/62), `available_in_side_conversation` (12), cộng `is_visible()` theo OS và `cfg!(debug_assertions)`.
- **how:** Enum + strum (`serialize_all = "kebab-case"`), `#[strum(to_string=…, serialize=…)]` cho alias. Feature gating dồn vào `builtins_for_input(BuiltinCommandFlags)` — 8 cờ tập trung một chỗ.
- **solves:** Trả lời "lệnh nào tồn tại / lệnh nào chạy được lúc này" mà không phải rà tay mọi call site. Cũng giải quyết việc 2 nơi (composer + popup) phải hiện cùng một danh sách.
- **port effort:** Thấp. Chỉ là 1 enum + 1 file filter. Ý tưởng đáng mang: thứ tự khai báo enum = thứ tự hiển thị trong menu, kèm comment cấm alpha-sort. | **idea only:** True
## codex.97 Keymap context-scoped với validator xung đột chéo context

- **where:** codex-rs/tui/src/keymap.rs (4.083 dòng) + keymap/bindings.rs (bảng khai báo 1 macro) + keymap/chords.rs (738 dòng)
- **what:** 152 action trên 13 `KeymapContext`; `KeymapContext::overlaps()` định nghĩa cặp context nào được trùng key; `KeymapActionId::config_path()` sinh đường dẫn lỗi kiểu `tui.keymap.composer.submit`. `validate_conflicts()` chạy nhiều pass vì thứ tự ưu tiên thực thi lồng nhau.
- **how:** Một macro `define_runtime_action_bindings!` sinh ra 6 hàm cùng lúc: `keymap_action_id`, `configured_binding_for_action`, `keymap_action_ids`, `bindings_for_action`, `push_binding_for_action`, `runtime_action_bindings`. File doc mở đầu nêu 4 trách nhiệm và 3 phần KHÔNG phải.
- **solves:** Ngăn một phím kích hoạt 2 hành động trên cùng đường đi nhập, trả lỗi kèm đường dẫn config thay vì im lặng ưu tiên. Giải quyết bài toán app-level handler chạy trước composer nên key composer trùng sẽ bị app ăn mất.
- **port effort:** Trung bình-Cao. Bảng khai báo gọn, nhưng `overlaps()` + validate nhiều pass + cơ chế chord là phần khó. | **idea only:** True
## codex.98 Ưu tiên key mặc định nhường bước cho binding tuỳ biến sẵn có

- **where:** codex-rs/tui/src/keymap.rs — `fn from_config` (dòng ~637-700), các biến `*_default_is_shadowed`
- **what:** Khi thêm binding mặc định mới, resolver kiểm tra key/alias/chord-prefix đó đã bị user chiếm chưa; nếu rồi thì bỏ binding mặc định thay vì ghi đè hoặc báo lỗi. Có 5 cơ chế thu hẹp: side-conversation toggle, voice toggle (F8), voice mute (ctrl-x), focus_activity, open_warnings.
- **how:** Side-conversation: kiểm tra `["ctrl-/", "ctrl-7"]` đã dùng ở main surface/list/approval chưa; nếu có thì `Vec::new()`. Voice: so prefix chord `KeyCode::Char('x')` với `normalized_parts()`.
- **solves:** Cho phép thêm feature mới mà không phá khoá gõ của người dùng đã tuỳ biến.
- **port effort:** Trung bình. Khái niệm nhỏ nhưng phải áp dụng ở mọi action mới. | **idea only:** True
## codex.99 Bộ dựng khung Flex tự viết có cache chiều cao

- **where:** codex-rs/tui/src/render/renderable.rs dòng 272-360
- **what:** Layout cột dọc với hệ số flex; con không có flex lấy đúng `desired_height`, phần dư chia theo tỷ lệ, con cuối hấp thụ phần làm tròn. Có vòng lặp "thỏa mãn con flex nhỏ hơn cả phần của nó rồi chia lại" để không để lại hàng trống.
- **how:** Cache hit khi `width` khớp lần trước (`cached_height: Cell<Option<(u16,u16)>>`); `render_scrolled` cho phép vẽ thẳng từ `scroll_offset`.
- **solves:** Giải quyết layout bottom-anchored (composer dính đáy) mà transcript vẫn cuộn được — thứ ratatui `Layout` không làm trực tiếp.
- **port effort:** Trung bình (~90 dòng). Có thể port gần như nguyên văn về TS. | **idea only:** False
## codex.100 Trait Renderable với cursor + scroll offset + style

- **where:** codex-rs/tui/src/render/renderable.rs dòng 15-29; `RenderableItem::{Owned,Borrowed}` dòng 32-78; `Insets`/`RectExt::inset` trong render/mod.rs
- **what:** Một trait duy nhất thay cho widget tree: `render`, `desired_height(width)`, `render_scrolled(…, offset) -> bool` (false = caller dùng fallback vẽ toàn bộ), `cursor_pos(area)`, `cursor_style(area)`. Có impl cho `()`, `&str`, `String`, `Paragraph`, `Line`.
- **how:** Khung chat: `flex.push(1, active_cell)` rồi `flex.push(0, bottom_pane.inset(Insets::tlbr(1,0,0,0)))`; `RectExt::inset` dùng phép trừ saturating an toàn mép màn hình.
- **solves:** Cây widget hẹp (1 trait, 1 hàm) thay vì định nghĩa widget mới cho mỗi loại nội dung; `cursor_pos` trả vị trí con trỏ từ bất kỳ tầng nào.
- **port effort:** Thấp-Trung bình. Cặp `render`/`desired_height` là mẫu rất dễ mang. | **idea only:** True
## codex.101 Kiểm thử bằng golden file Buffer kèm style từng ô

- **where:** chatwidget/tests/snapshots/…__exec_approval_modal_exec.snap (80×16 Buffer + style), bottom_pane/snapshots/…__command_popup_default_items.snap (49 dòng text), tui/snapshots/…__standard_viewport_growth_1.snap
- **what:** 1329 file `.snap`, 23.873 dòng. Format phổ biến nhất là `format!("{buf:?}")` — dump Buffer ratatui kèm mảng style từng ô, nên bắt được cả thay đổi màu/sáng/đậm chứ không chỉ text.
- **how:** `insta::assert_snapshot!`. Header `.snap` ghi `source:` và `expression:` nên khi test đổi chỗ gọi, `cargo insta` chỉ ra ngay.
- **solves:** Chứng minh bề mặt hiển thị bằng bytes thật — thứ mà assert chuỗi không bắt được (mất style, lệch cột, sai canh).
- **port effort:** Thấp nếu đã có hạ tầng snapshot. Ở omp cần một backend test in frame ra text + style. | **idea only:** True
## codex.102 Backtrack bằng cặp Esc kép (chỉnh prompt cũ)

- **where:** codex-rs/tui/src/app_backtrack.rs (42 KB; module con: browsing, legacy_input, prompt_navigation)
- **what:** Máy trạng thái nhỏ: Esc lần 1 "prime" và ghi thread id gốc; Esc lần 2 mở transcript rút gọn, highlight prompt user mới nhất; ←/→ chọn prompt; Ctrl+T bật/tắt chi tiết; Esc quay lại gốc; Enter yêu cầu revert trước prompt đã chọn và mở lại trong composer để sửa.
- **how:** Comment đầu file mô tả đủ 5 bước và giải thích vì sao owned-session dùng chung viewport transcript còn inline-session vẫn dùng overlay.
- **solves:** Sửa lại prompt đã gửi mà không mất ngữ cảnh — thao tác người dùng cần thật sự hay làm, hiếm CLI nào có.
- **port effort:** Trung bình. Cơ chế "revert trước turn N" đáng lấy; phần đồng bộ live tail giữa overlay và widget thì phức tạp. | **idea only:** True
## codex.103 Trình remap phím tắt ngay trong TUI

- **where:** codex-rs/tui/src/keymap_setup.rs (70 KB) + keymap_setup/{capture,debug}.rs + chatwidget/keymap_picker.rs
- **what:** `/keymap` mở giao diện remap cho 152 action theo context, có chế độ bấm-phím-vào (`KeymapCaptureView`) và chế độ xem/gỡ (`KeymapDebugView`).
- **how:** Hai view đều là `BottomPaneView`; danh sách action lấy từ chính `keymap_action_ids()` mà validator dùng, nên không thể lệch.
- **solves:** Người dùng đổi được phím mà không cần biết đọc file config, và danh sách hiện ra luôn khớp danh sách được kiểm tra.
- **port effort:** Trung bình. Cần cơ chế capture phím (chặn input trước khi gửi đi) + ghi config. | **idea only:** True
## codex.104 Statusline và terminal title cấu hình được theo danh sách mục

- **where:** codex-rs/tui/src/bottom_pane/status_line_setup.rs (enum dòng 56) + title_setup.rs (enum dòng 39) + status_surface_preview.rs
- **what:** `/statusline` và `/title` mở picker để tick mục hiển thị. 30 `StatusLineItem` (model, context-used/remaining, 5h limit, weekly limit, git branch, PR number, branch changes, thread credits, estimated cost, task progress, raw-output, fast-mode…) và 24 `TerminalTitleItem`. Nhiều mục có alias và giá trị legacy.
- **how:** `/statusline use_colors` bật tô màu theo theme; item tự ẩn khi dữ liệu không có ("omitted when unavailable") thay vì để trống.
- **solves:** Tuỳ biến hàng trạng thái mà không phải sửa template string.
- **port effort:** Thấp-Trung bình. Mô hình "tick mục + preview + ẩn khi thiếu dữ liệu" rất dễ mang. | **idea only:** True
## codex.105 Theme `.tmTheme` bundle tìm thêm từ $CODEX_HOME/themes

- **where:** codex-rs/tui/assets/themes/*.tmTheme (6 file) + src/theme_picker.rs (21 KB) + src/style.rs + src/render/highlight.rs (61 KB) + src/terminal_probe.rs (34 KB)
- **what:** 6 theme bundle (ada, babbage, curie, cushman, dali, davinci) đóng sẵn; người dùng thêm `.tmTheme` của riêng mình vào thư mục themes, picker tự liệt kê kèm và có live preview (2 bản render: wide/narrow tuỳ bề rộng).
- **how:** `config.theme` nhận tên kebab-case; để `None` thì tự dò light/dark. Palette được đọc thật qua terminal probe chứ không đoán.
- **solves:** Tái dùng theme VS Code đã có, giữ syntax highlighting khớp nền terminal thật.
- **port effort:** Trung bình. Cơ chế "đọc theme ngoài + probe màu nền terminal" là phần đáng lấy. | **idea only:** True
## codex.106 Agent command center — bảng điều khiển nhiều task

- **where:** codex-rs/tui/src/app/agents_overview*.rs (14 file ~200 KB; agents_overview_tests.rs 101 KB) + app/agent_center/{hints,input,mod,navigation,render,rows}.rs + AgentsOverviewView trong app/agents_overview_view.rs
- **what:** `/agents` (hoặc `codex agents`) mở bảng task nhóm theo trạng thái Needs input / Working / Ready / Inactive, nhóm theo project, có bộ lọc tab, tìm kiếm, gom nhóm, và hàng phím tắt dạng cột.
- **how:** Snapshot thật: tiêu đề + hàng đếm theo trạng thái + đường kẻ + bảng phím tắt 3 cột, chân "esc back". Phân loại: `AgentsOverviewGroup::for_status` map `ThreadStatus::{Active(waiting_on_approval|waiting_on_user_input)→NeedsYou, Active→Working, Idle→Ready, SystemError→NeedsYou, NotLoaded→Finished}`.
- **solves:** Quản lý nhiều agent/task song song mà không phải chuyển cửa sổ.
- **port effort:** Cao. Bảng + nhóm + bộ lọc thì dễ; trạng thái vòng đời task, resume/archive/delete từ xa, thanh tiến trình nền thì không. | **idea only:** True
## codex.107 Phân lớp overlay: BottomPaneView stack + pager overlay

- **where:** codex-rs/tui/src/bottom_pane/bottom_pane_view.rs (trait) + bottom_pane/mod.rs (`push_view` dòng 705, `show_selection_view` dòng 1423) + src/pager_overlay.rs
- **what:** Tầng dưới: `BottomPane` giữ `Vec<Box<dyn BottomPaneView>>` — 19 view production, mỗi view tự khai báo `keymap_contexts()`, `view_id()`, `selected_index()`, `apply_text_suggestion()`, `pre_draw_tick()`. Tầng trên: `enum Overlay { Transcript, Static, Analytics }`. Có `completion() -> ViewCompletion::{Accepted, Cancelled}`.
- **how:** Trait mặc định mọi hàm là no-op nên view chỉ override cái cần. `view_id` + `selected_index` cho phép refresh nền mà giữ đúng dòng đang chọn.
- **solves:** Thêm modal mới không phải sửa switch ở nhiều nơi; tách rõ input thuộc tầng nào (bottom pane cho view cơ hội nuốt Ctrl+C trước, ChatWidget mới quyết interrupt/quit).
- **port effort:** Trung bình. Giá trị nằm ở các hook (`view_id`, `selected_index`, `apply_text_suggestion`) giải quyết refresh nền. | **idea only:** True
## codex.108 Một picker chung phục vụ 87 call site

- **where:** codex-rs/tui/src/bottom_pane/list_selection_view.rs (113 KB) + selection_popup_common.rs (39 KB) + picker_presets.rs + selection_row_layout.rs + selection_tabs.rs
- **what:** `ListSelectionView` + `SelectionViewParams` làm hàng chục menu: chọn model, theme, pet, quản lý plugin, worktree, app, lọc usage, preset review, nhánh base, commit… 51 tiêu đề phân biệt được. Có preset `SelectionViewParams::picker()` đặt `ColumnWidthMode::AutoAllRows` + ẩn mô tả khi hẹp dưới 24 cột.
- **how:** Mỗi item là `SelectionItem { name, description, is_current, is_disabled, actions: Vec<Box<dyn Fn(Tx)>>, dismiss_on_select, require_explicit_confirmation }` — hành động là closure, không phải enum variant.
- **solves:** 87 menu khác nhau mà chỉ một chỗ lo phần trình bày, cuộn, cắt chữ, tính chiều cao, wrap mô tả.
- **port effort:** Thấp-Trung bình. Rất dễ mang; đáng chú ý là dùng `Vec<closure>` cho hành động thay vì enum → menu mới không cần sửa enum trung tâm. | **idea only:** True
## codex.109 Bảng hướng dẫn phím tắt tự co cột (3→2→1)

- **where:** codex-rs/tui/src/bottom_pane/shortcut_overlay.rs (5.9 KB) + shortcut_help.rs (3.2 KB)
- **what:** Bấm `?` mở bảng phím tắt trong composer; các nhóm tự chảy từ 3 cột xuống 2 rồi 1 cột tuỳ bề rộng mà không đổi cách bắt phím. Bị cắt vẫn giữ phần tuỳ chỉnh nhìn thấy được.
- **how:** Comment đầu file: "Groups flow into three, two, or one column without changing key routing. Runtime hints remain authoritative for remapped, chorded, and disabled bindings."
- **solves:** 152 action không thể nhồi một màn hình; phải hiện phụ thuộc độ rộng mà vẫn ưu tiên đúng binding đang hoạt động.
- **port effort:** Thấp-Trung bình. Ý tưởng "hint động lấy từ keymap đã resolve, không hard-code" là phần đáng lấy. | **idea only:** True
## codex.110 Chống giật khi gõ nhanh (paste-burst) và bracketed paste

- **where:** codex-rs/tui/src/bottom_pane/paste_burst.rs (25 KB) + chat_composer/paste_input.rs + chat_composer/slash_input.rs dòng 195-206 + bottom_pane/AGENTS.md
- **what:** Tam giác "burst detect" cho phép gõ nhanh không dính placeholder; bracketed paste chuẩn hoá về 1 sự kiện; cờ `disable_paste_burst` tắt hẳn. Có biến thể `QueuedInputAction::Literal` để dán nội dung bắt đầu bằng `!` không bị hiểu thành lệnh shell.
- **how:** Trait `BottomPaneView` có `flush_paste_burst_if_due()` và `is_in_paste_burst()` để modal tái dùng ChatComposer cũng hưởng cùng cơ chế.
- **solves:** Chữ bị nuốt khi gõ tay nhanh, hoặc dán 1 dòng bị tách nhầm thành nhiều lần gửi.
- **port effort:** Thấp-Trung bình. Biến thể `Literal` chống hiểu nhầm là chi tiết đáng chú ý. | **idea only:** True
