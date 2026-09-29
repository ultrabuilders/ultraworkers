Verification complete. All load-bearing claims reproduce. Writing the synthesis.

---

# G3 — codex `code-mode`: TỔNG HỢP ĐỂ DUYỆT

**Ref đã mở:** `openai/codex` @ `c248f6d48b97eb4a2aa56147a0b11b7d763278b9` (`main`, xác nhận qua `git ls-remote` 2026-09-29). Lưu ý: một số claim trong corpus ghim `3226512d…`; cả hai đều là `main`, nội dung có thể trôi.

---

## 1. Kết luận một dòng

**Không đáng milestone — và tiền đề của M6 sai, không chỉ là số liệu.** Code mode là "gọi tool bằng cách viết JavaScript", omp **đã có sẵn adapter 198 dòng** cho nó và đã wire vào đường chạy thật; con số 30K dòng là hạ tầng native (gRPC + V8 embed + host process) mà omp không cần và không nên có. Việc thật còn lại là **nhốt code do model viết** — một work item S, không phải một milestone.

---

## 2. Khoảng trống thật (đã loại phần đã có kế hoạch)

| # | Khoảng trống | Milestone đã phủ | Bằng chứng | Cỡ |
|---|---|---|---|---|
| A | **Code do model viết có ambient authority thật** — `process` thật, `Bun` thật, `node:fs` thật, `npm install` | **KHÔNG** | `eval/js/shared/runtime.ts:716` — comment nguyên văn: *"`process` is intentionally not overridden — user code gets the host worker's real…"*; `eval/js/shared/local-module-loader.ts:1,107` (`import * as fs from "node:fs"` → `fs.readFileSync`); prompt `prompts/tools/eval-code-mode.md:5` tự dạy *"Prefer `tool.*` over raw `Bun.file`/fs"* → `Bun.file` reachable. Ngược lại codex: `module_loader.rs:225-230` throw `Unsupported import in exec: {specifier}` cho **mọi** specifier; `globals.rs:17-20` xoá `console`/`Atomics`/`SharedArrayBuffer`/`WebAssembly` | **S–M** |
| B | **Lớp tool bridged im lặng** — gọi tool qua eval bridge không phát `tool_execution_start/end`, không có entry `toolResult` | **KHÔNG** (vá từng tool, không audit) | `eval/js/tool-bridge.ts:325` gọi thẳng `tool.execute(...)`, đi vòng agent loop; `git grep tool_execution_start -- packages/agent/src` → chỉ `agent-loop.ts:3214,3304,3781` (loop là emitter **duy nhất**). `goal` không nằm trong `CODE_MODE_KEEP_TOOLS` (`code-mode.ts:17-37`) nên nhánh `agent-session.ts:3605-3607` không chạy. Bằng chứng đây là lớp lỗi thật: tác giả phải tiêm lại side-effect thủ công tại `tool-bridge.ts:332-338` | **S** |
| C | **Thiếu budget schema** — description `eval` dài tuyến tính theo roster, code mode lại TẮT luôn kênh `xd://` | **KHÔNG** | omp: `git grep schemaMaxBytes\|schema_max_bytes` trong `coding-agent/src` + `tui/src` → **0 hit**. codex có: `code-mode/features/src/feature_configs.rs:38` `pub tool_input_schema_max_bytes: Option<NonZeroUsize>` | **S** |
| D | **Vi phạm luật KDL của AGENTS.md** — hard-code chuỗi provider trong TS | **KHÔNG** | `session/code-mode.ts:54` `args.provider === "openai-codex" &&` là điều kiện duy nhất quyết định bật. `git grep -i 'code-mode\|code_mode\|toolMode' -- packages/catalog/src/compat/rules/` → **0 hit** trong **221 file .kdl** | **S** |
| E | **Lệch danh tính wire** — codex `exec`/`wait`, omp `eval` với schema `{language, code}` | **KHÔNG** | codex `code-mode-protocol/src/lib.rs:52-53` `PUBLIC_TOOL_NAME = "exec"` / `WAIT_TOOL_NAME = "wait"`. omp: `grep -c customWireName tools/eval.ts` → **0**; `eval.ts:447` trả `evalSchema`. Model `code_mode_only` được huấn luyện với hợp đồng `exec` | **S** (xem §5) |
| — | ~~Port 30K dòng codex~~ | — | **ĐÃ BỊ BÁC.** Đã có: 120 + 61 + 17 = **198 dòng** production, chạy thật | ✗ |

**Đã loại khỏi danh sách việc** (vì đã có kế hoạch hoặc đã sai): port code-mode (đã có); hạ tầng gRPC/host của codex (omp không cần); bật mặc định code mode (cần A/B, xem §4).

---

## 3. Đề xuất milestone mới

**Không tạo milestone.** Đề xuất thay bằng **4 work item S** (A, B, C, D) gom vào M6, tổng **~1–2 engineer-week** — nhỏ hơn M1 (~4 tuần) và nhỏ hơn M2 (8–10 engineer-weeks / 25 work item) hơn một bậc.

Lý do **không** để thành milestone: bốn mục trên đều là sửa lỗi/siết trên code đang chạy, không mở bề mặt sản phẩm mới, và **không cái nào phục vụ trực tiếp mục tiêu "mọi thứ là plugin"** — chúng là điều kiện để code mode bật được an toàn, không phải tính năng.

Nếu buộc phải gom: đặt tên **"Code Mode: siều chặt + khép gap"**, phạm vi A+B+C+D, cỡ S. Không tách khỏi M6.

---

## 4. Việc phải làm tiếp theo

1. **Sửa M6 — xoá tiền đề sai** (chủ: người giữ M6). Ba chỗ: `:928`, `:1301`, `:1898` đều viết *"chưa được đánh giá"* / *"nếu đúng nghĩa là thay tool-call bằng code, đây là ứng viên milestone lớn"*. Số đo (4 crate, 104 file, ~30K) **đúng** — giữ. Chỉ sửa **kết luận**: không phải milestone, adapter đã có 198 dòng. Việc này đóng luôn ẩn số #4.
2. **A/B nhỏ trên `gpt-6-luna`** (chủ: người vận hành). Bật/tắt `providers.openai-codex.codeMode`, đo **số turn** và **context token**. Đây là câu hỏi quyết định duy nhất còn mở, và nó là quyết định sản phẩm chứ không phải kỹ thuật — codex `gpt-5.6`+ là model line đang ship với `tool_mode: code_mode_only`.
3. **Chỉ mở work item A** (nhốt code) **nếu (2) cho thấy lợi ích thật**. A là việc duy nhất còn lại đáng làm; B/C/D thì rẻ và làm luôn được nếu muốn.
4. **Đưa quyết định code mode về KDL** (D) — trục nhỏ trên `providers/openai-codex.kdl` hoặc `classes/*.kdl`. Làm sớm vì nó là tiền lệ cho câu hỏi lớn hơn: còn bao nhiêu chỗ nữa trong omp vi phạm luật này.

---

## 5. Điều CHƯA biết

- **Phía server, cái duy nhất chặn việc bật rộng.** `tool_namespaces_info` và cờ `tool_mode` do backend Codex xử lý; backend không có trong repo. Không biết server có định tuyến/training khoá trên tên `exec` không — nếu có, wire name `eval` của omp sẽ không được nhận diện và **không có tín hiệu nào báo**. Cần người có backend trả lời.
- **Hiệu quả.** Đo được **cấu trúc**, không đo được **hiệu quả**. Không có số nào trong repo codex về code mode vs direct tools. Đây là lý do M6 nói "chưa đánh giá" vẫn đúng ở chỗ này — nhưng là đánh giá *hiệu quả*, không phải *tồn tại*.
- **Có siết được `Bun.*` trong realm không, hay phải rewrite mọi builtin specifier lúc parse** (work item A). Ẩn số kỹ thuật duy nhất còn mở trong A.
- **Hành vi Windows.** Chỉ thấy `connection.rs:158-168`: `Command::new`, `process_group(0)`, `creation_flags(0x0800_0000)`, `kill_on_drop`, scrub env. Không có nhánh Windows nào khác trong 4 crate. Không suy ra hành vi thật khi chưa build.
- **Không chạy test.** `bun test` hỏng native addon trên máy này, nên **mọi** phát biểu về hành vi ở trên đọc từ source, không phải từ test chạy.

---

## 6. Ghi chú cho người phê duyệt

Hai điều chỉnh lại so với phần lớn material G3:

- **"Sandbox của code-mode"** là từ dễ gây hiểu nhầm. Cơ chế nhốt thật của codex là **cấp quyền bằng cách không cấp** (không fs, không network, không import, không `console`, không WASM) + V8 cage + một tiến trình riêng. Không có seatbelt/seccomp/landlock/rlimit/chroot ở đâu trong 4 crate. Nếu ai đó port theo tưởng có OS sandbox, họ sẽ dựng một lớp trừng phạt giả.
- **Chi phí thật của code mode là latency, không phải token.** Cell dài hạn tốn thêm một vòng model: `exec` yield → `Script running with cell ID N` → model phải gọi `wait`. Rẻ token thì có thể; thêm round-trip thì đắt. Nên bất kỳ kỳ vọng nào về "code mode rẻ hơn" phải tính cả hai vế.