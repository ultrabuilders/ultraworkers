# G1 — Khoảng trống năng lực: còn thiếu gì để là "một coding agent hoàn chỉnh"

Đo trên `HEAD d5b979ad79`, cây làm việc sạch. Mọi dòng dưới đây tôi vừa chạy lại; vài dòng trích trong bản nháp đầu vào **sai số dòng** và đã được sửa ở chỗ (mục 6).

---

## 1. Kết luận một dòng

omp thiếu **hai tầng nguyên thủy** chưa milestone nào nhận — **containment ở tầng OS** và **orchestration multi-agent** — cộng một danh sách 7 việc nhỏ đã được chương trình tự nhận là cần nhưng không có work item id; plugin/extension, MCP, ACP, telemetry, image, LSP, memory-backend, headless, async-job đều **đã có chủ** và không nên đề xuất lại.

---

## 2. Khoảng trống thật, đã loại phần đã có kế hoạch

| # | Khoảng trống | Milestone đã phủ? | Bằng chứng | Cỡ |
|---|---|---|---|---|
| **1** | **Containment tầng OS cho `bash`/`exec`** — lệnh được duyệt vẫn có toàn quyền user | **KHÔNG.** M6 hàng 8 (`:1282`) ghi nguyên văn *"Chọn: chưa xây trong M6"*; M6:726 đã audit và kết luận *"thiếu cả tầng"*; nhưng sổ M6 chỉ có `GAP-M6-08..16` (9 mục, `grep -nE '^## GAP-M6'`), **không mục nào là sandbox**. M4/M7: 0 hit | `docs/approval-mode.md:72`: *"it is not process or filesystem containment. An approved command retains the shell's ambient filesystem, network, and subprocess access."* — `git grep -niE 'seatbelt\|landlock\|seccomp\|bwrap\|chroot\|nsjail\|firejail' -- packages crates`: chỉ 3 comment (`cli.ts:414-415`, `input-controller.ts:1439`, `file-write-fallback.ts:379`) + nhiễu `SearchRoot` khớp `chroot`; **0 cơ chế**. M2:3849 còn *cấm* hướng đi: *"KHÔNG ĐƯỢC BIẾN THÀNH SANDBOX"* | **L** |
| **2** | **Multi-agent / subagent orchestration** — số lượng agent, chính sách ủy quyền, tổng hợp kết quả con, handoff | **KHÔNG.** `grep -ci subagent` trên 8 plan = 22 dòng (M1=10, M1B=3, M3=5, M2=2, M6=2, M4/M5/M7=0) và `grep -nE '^## ' MILESTONE_* \| grep -i subagent` → **rỗng**. Mục duy nhất chạm là một cổng **chặn**, không phải orchestration: `GAP-M6-09` (M6:1375), 95 dòng predicate, `spawn-policy.ts` **không được sửa** (M6:1412) | `git ls-files 'packages/coding-agent/src/task/*' \| wc -l` → **29** file: `spawn-policy.ts`, `parallel.ts`, `workpool.ts`, `isolation-runner.ts`, `structured-subagent.ts`, `persisted-revive.ts`, `worktree.ts` | **XL** |
| **3** | **Mặc định approval là `yolo`** — cài mới xong chạy tool không hỏi | **KHÔNG.** M1 W6 (`:1864`) chỉ làm `CRITICAL_BASH_PATTERNS` trả `deny` *dưới* yolo. `grep -cw yolo` = M1:59, M4:1, M6:1 — mọi hit đều mô tả yolo là *"chế độ mặc định"*, **không hit nào đề xuất đổi fallback** | `tools/approval.ts:17` (3 mode: `always-ask`/`write`/`yolo`), `:80` `isApprovalMode(configured) ? configured : "yolo"`; `tools/settings.ts:294` `default: "yolo"`; `CROSS_REPO_COMPARISON.md:895` đã đề xuất đổi sang `write` và tự ghi *"nằm ngay trong code của chính omp, không cần lấy gì từ ai"* | **S** (3 dòng code + doc) |
| **4** | **Thực thi trust theo thư mục dự án** | **Có tên, không có chủ.** `WI-20`/`GAP-M2-13` được ghi rõ là **chưa giao**: M2:44 *"Đừng đọc WI-20 là 'tư thế tin cậy đã có'"* | Code: `isProjectTrusted: () => true` tại `extensibility/extensions/runner.ts:1293` và `session/agent-session.ts:7552`; M2:31: *"**M2 không làm `isProjectTrusted()` thành giá trị thật**… phần cài thật là công việc M–L, nằm ngoài M2"* | **L** |
| **5** | **Compaction: chiến lược, không phải sàn/biên** — cái gì được giữ, cái bị bỏ | **Một nửa.** Sàn: `GAP-M6-08` (M6:1329). Biên: `GAP-M7-02` (:629), `GAP-M7-04` (:795). Nhưng `grep -inE 'chiến lược compaction\|compaction strategy\|summarization policy\|giữ gì'` trên 8 plan → **0 hit liên quan** | `docs/compaction.md` tồn tại, **42.478 byte** — chưa lăng kính nào mở; claim "không có chiến lược compaction" hiện là **suy đoán chưa kiểm chứng** | **M** (sau khi đọc doc) |
| **6** | **Checkpoint / rewind** | **Được nhắc, không ai phát triển.** Chỉ xuất hiện trong bảng admission của M2 WI-6 (`MILESTONE_2_EXECUTION_PLAN.md:3248`, `:3310` `checkpoint`/`rewind`) | `git ls-files packages/coding-agent/src/tools/checkpoint.ts` → tồn tại (cả `CheckpointTool` lẫn `RewindTool`) | **S–M** |
| **7** | **Session branching / fork như một tính năng** | **Được bảo vệ, không được phát triển.** M1 W22 (`:6722`) nâng 4 điều bảo toàn thành hợp đồng test: `"/resume" "/fork" trong TUI không đổi"` (`:6770`, `:6915`) | `omp find` giữ từng byte; `/fork` bị khoá chống hồi quy, **không được mở rộng** | **M** |
| **8** | **Git/VCS như bề mặt sản phẩm** (branching, `jj`, worktree) | **KHÔNG.** 14 dòng khớp `worktree\|jujutsu` trong plan, tất cả là snippet `git restore --worktree` (M5), fixture gallery (M5:3607), inventory opencode (M6:441), mô tả robomp (M6:722), quyết định sandbox (M6:1282), mẫu lệnh (M1:6887). `GAP-M6-15` chỉ ghim SHA qua `parseGitUrl` — thuộc provenance, không thuộc VCS surface | `crates/pi-vcs/` = backend `git/` (~9.625 dòng) + `jj/` (~1.345 dòng) + `crates/pi-natives/src/vcs.rs` (1.538) ≈ **12.500 dòng Rust**, chưa work item nào chạm | **XL** |
| **9** | **Cross-session memory như một hạng mục phát triển** | **KHÔNG.** 59 occurrence `mnemopi` trong plan nhưng tất cả nằm trong ma trận nghiệm thu (`M2:2367` `["hindsight","mnemopi","local"]`) và interface (WI-11), không work item nào lấy memory làm chủ đề | `tools/memory-{retain,recall,reflect,edit}.ts` + `packages/mnemopi` (bảng `memory_embeddings`, `core/vector-index.ts`, `EMBEDDING_DIM=384`) | **M–L** |
| **10** | **7 quyết định "lấy" của M6 không có work item id** | **Quyết trình, không phải quyết định.** Bảng M6:1275–1284 có 10 hàng; sổ bản vá chỉ nhận 9 hàng từ bảng gajae | Hàng 6 `SlotMap`/`SlotClaim` (:1280), hàng 7 `.gjc/qa/` snapshot grid (:1281 — tự ghi *"ứng viên đầu tiên nên làm"*), hàng 9 `match`/`not_match`+`justification` (:1283) | **S–M** |
| **11** | **Đăng ký MCP server lúc runtime từ extension còn sống** | **Có tên, cấm code.** M2:41: WI-12 *"chỉ là một tài liệu quyết định… KHÔNG build gì cả"*, gate đòi `git diff --stat HEAD` không có gì dưới `packages/` | Đăng ký lúc load đã ship: `discovery/omp-plugins.ts:275` đọc `.mcp.json`, `:293` `loadMCPServers`, `:423` provider `mcpCapability` | **M** |
| **12** | **Scheduling / cron** | **KHÔNG.** `grep -inE 'scheduled task\|cron\|định kỳ'` → 1 hit giả (M5:6682 "chạy định kỳ" cho cổng âm CI) | `async/job-manager.ts` đã có job nền/detach; thiếu mốc lịch | **S** |

### Đã có chủ — KHÔNG đề xuất lại

Plugin/ecosystem (M2 24 mục `WI-0..WI-21` + `WI-SESSION-LOG` + `WI-PRESTEP-1`; M1 W1/W2/W11; M1B; M4 Wave D; M6 `GAP-M6-15`; M3 Sóng 4–5) · permission model (M1 W6/W20, M2 WI-0/WI-14, M4 `GAP-M4-13`) · MCP (`GAP-M7-01/-03`, M6 `GAP-M6-12`, M3 D1 elicitation) · ACP (≥5 milestone) · telemetry/cost (M1 W7/W9/W10, M1B mục 6, M3 A1, M6 `GAP-M6-10`) · image (M7 LOOKAT L1a–L1d) · LSP (M1 `GAP-M1-21`, M5 W9, M2 WI-8b) · background job (đã ship + `COMPREHENSIVE:26040-26041` W12a/W12b) · eval-driven (M1B mục 7, :2396) · status-line plugin (M3 Sóng 5 C2/D2) · snapshot golden (quyết định M6 hàng 1+7, chưa có GAP id) · headless (M1 W13, M2 WI-13, M3 D1) · diff review (0 work item, nhưng `extensibility/custom-commands/bundled/review/diff.ts` đã có) · semantic code index (`find` = cascade 4 bước, bước 3–4 có model judge).

---

## 3. Đề xuất milestone mới

Chỉ **hai** việc đủ lớn để mở milestone. Phần còn lại ở mục 4, không cần milestone.

### M8 — Containment: hai trục tách rời

- **Phạm vi.** (a) `FileSystemSandboxPolicy` — writable-root + read-deny, (b) `NetworkSandboxPolicy` — egress allowlist, **hai trục độc lập ngay từ đầu**, đúng ràng buộc M6:1282 đã viết. Thứ tự: Linux (seccomp/landlock, fallback `bwrap`) → macOS (seatbelt profile) → Windows (Job Object). Thêm luôn **path rule khai báo được bằng YAML** (`deny: ["**/.env", "/etc/**"]`) vì hook `tool_call` đã chặn được nhưng chỉ bằng plugin TS.
- **Cỡ.** **L–XL.** M6:1282 đã đo đối chiếu: codex `sandboxing` 24 file/10.469 dòng + `linux-sandbox` 31/12.747 + `windows-sandbox-rs` 114/28.762. Con số này **mượn từ audit M6, `codex-ref` không có trên máy này → unverifiable-here**.
- **Vì sao phục vụ mục tiêu.** Đây là ranh giới giữa "coding agent" và "script wrapper". Không có nó, mọi tính năng khác trong mục tiêu đều chạy trên nền không kiểm soát.

### M9 — Orchestration: từ 29 file sẵn có đến một chiến lược

- **Phạm vi.** Registry agent → chính sách ủy quyền (ai được gọi, với ngân sách gì, dừng khi nào) → gom kết quả con → handoff giữa các run. Bám sẵn `spawn-policy.ts` (đang đúng, **không sửa** — M6:1412), `parallel.ts`, `workpool.ts`, `structured-subagent.ts`.
- **Cỡ.** **XL**, nhưng phần 1 (registry + policy + budget kế thừa `task.softRequestBudget`) làm được trước và độc lập. **[Đính chính 2026-09-29: framing gốc sai.]** 29 file `src/task/*` là hệ thống multi-agent **đã ship và đang được bảo trì** (13.695 dòng, test theo issue, `omp-command.ts` spawn subprocess thật) — không phải mồ côi. M9 không đề xuất xây nó; M9 đề xuất thêm một lớp quyết định phía trên. Bỏ M9 không bỏ code nào chết.
- **Vì sao phục vụ mục tiêu.** "workflow tốt" là nhãn này; 29 file đã tồn tại nhưng 0/84 work item phát triển chúng.

---

## 4. Việc phải làm tiếp theo

Thứ tự, mỗi dòng một chủ:

| # | Việc | Chủ | Cỡ | Cổng nghiệm thu |
|---|---|---|---|---|
| 1 | Chốt `tools.approvalMode` mặc định `yolo` → `write`. Sửa `approval.ts:80` + `settings.ts:294` + `docs/approval-mode.md:22`. **Cần sign-off sản phẩm, không sửa ngược được** | Maintainer, bằng văn bản | S | Test approval hiện có phải xanh không sửa; thêm test âm: session mới không có `tools.approvalMode` → phải ra `prompt` |
| 2 | Gán `WI-20`/`GAP-M2-13` (trust enforcement) cho M8, **không** nhét vào M2 — M2:44 đã cấm | Maintainer | S (gán) | Chỉ cần một dòng owner + ngày trong bảng quyết định M2 |
| 3 | Mở `GAP-M6-17` (snapshot golden đa trạng thái) gắn cột `proof` của `GAP-M4-14`; gộp với quyết định hàng 1 + hàng 7 của M6 | M6 owner | M | `packages/tui` có **0** `.snap` / `toMatchSnapshot`; cổng: một fixture 3 trạng thộng (`states.join("\n\n")`) bắt composer + status + lịch sử |
| 4 | Đọc `docs/compaction.md` (42 KB) rồi mới kết luận về mục 5. **Đây là bước loại giả-thiếu rẻ nhất** | G1 owner | S | Viết 8 dòng: giữ gì / bỏ gì / ngân sách token của compaction |
| 5 | Gán owner cho 6 hàng "lấy" còn lại của M6 (`SlotMap`, `.gjc/qa/`, `match`/`not_match`, layout, `MAINTAINERS.md`, `session-ui`) | M6 owner | S (gán) | 6 dòng trong bảng quyết định M6 |
| 6 | Đọc `crates/pi-vcs/` và `commands/worktree.ts`, viết một work-item sheet VCS | M9 owner | M (sheet) | Sheet phải nêu jj đã có backend gì, còn thiếu gì |
| 7 | `GAP-M6-17` + M8 + M9 mở file plan mới, **không sửa file milestone cũ** | Maintainer | — | 3 file mới, mỗi work item có id + owner + ngày |

Không làm: đề xuất lại plugin/MCP/ACP/telemetry/image/LSP/memory-backend/headless/async — đã có chủ, xem mục "Đã có chủ".

---

## 5. Điều CHƯA biết

1. **Chưa chạy gì.** Sweep tĩnh. Không chạy omp, không chạy tool, **không chạy `bun test`** (native addon hỏng trên máy này — ràng buộc đã giao). Mọi verdict "CÓ/THIẾU" là về *sự tồn tại của mã*, không phải hành vi lúc chạy.
2. **M6 chưa đọc.** `docs/compaction.md`, `docs/memory.md`, `docs/lsp-config.md` lần này vẫn chưa ai mở. Mục 5 và mục 9 có thể là khoảng trống giả.
3. **Chưa đọc `SENPI_FINDINGS.md`** (434 KB, 6.709 dòng) dù M7:7 nói *"toàn bộ số liệu và lập luận nền nằm ở đó"* — có thể còn nhóm work item thứ tư chưa rải vào milestone nào.
4. **Sáu checkout tham chiếu vắng mặt** (`pi-ref`, `gajae-ref`, `codex-ref`, `opencode-ref`, `claude-code-ref`). Ba cái có (`deepseek-harness`, `oh-my-openagent`, `cordis-upstream-cordiverse`) tôi **không mở**. Mọi số so sánh "codex có X" trong bảng trên — 9 crate sandbox, 1.429 file `.snap` — là **trích M6, unverifiable-here**. Chỉ phía omp là tôi tự đo.
5. **Con số work item chưa thống nhất.** Đếm heading thật cho 97; `.lavish-wip/impl/` có 82 sheet; "84" chỉ nằm trong message của một commit. Tôi **không** tái lập được 84. Ảnh hưởng: mục 2 dùng con số "0/84" — nếu số đúng là 97 hay 82 thì kết luận "0 work item subagent" không đổi, nhưng mẫu số thì đổi.
6. **Sandbox có cần cho sản phẩm này không, chưa ai quyết.** `docs/approval-mode.md:72` thừa nhận thiếu containment nhưng không nói đó là *chọn*. Nếu maintainer đã chốt approval-only, M8 rút xuống còn "ghi quyết định vào doc" — và mục 3 (path rule YAML) vẫn đứng vững vì rẻ và không cần kernel.
7. **Số dòng trích trong bản nháp đầu vào bị sai ở 5 chỗ**, đã sửa ở đây: M2 "KHÔNG ĐƯỢC BIẾN THÀNH SANDBOX" ở **:3849** (không phải :2658) · câu `isProjectTrusted` ở **M2:31** và WI-20 ở **:44** (không phải :5018/:4855) · W6 ở **M1:1864** (không phải :1224) · bốn điều bảo toàn W22 ở **:6770**/:6915 (không phải :4246/:4266) · `yolo` trong plan là **61 dòng** (`grep -cw`, M1=59/M4=1/M6=1), không phải 20.