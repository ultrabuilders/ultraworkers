# KẾ HOẠCH THỰC THIỆN — MILESTONE 8: RANH GIỚI TIN CẬY (TRUST, APPROVAL, ENFORCEMENT)

> **Đổi tên 2026-09-29.** Milestone này từng tên *Containment*. Sau khi chủ sở hữu chốt **defer containment tầng OS**, cái tên đó mô tả phần đã bị hoãn chứ không phải phần còn làm. Nội dung còn lại là **trust + approval + enforcement** — và đó là tên ở đây. Xem *Phạm vi sau quyết định DEFER*.

> **Vì sao file này tồn tại.** `MILESTONE_6_EXECUTION_PLAN.md:1282` ghi nguyên văn *"Chọn: chưa xây trong M6"* về sandbox, và đẩy nó ra khỏi phạm vi — nhưng **không work item nào nhận nó**. Đó là một khoảng trống có chủ ở M6 và không có chủ ở đâu cả. M6 gọi đây là *"thứ tự đáng giá nhất"*, nên nó hẳn phải đứng ở đâu đó. Đây là chỗ đó.
>
> Đồng thời: M6:726 đã audit và kết luận thiếu cả tầng, còn `MILESTONE_2_EXECUTION_PLAN.md:3849` viết thẳng **"KHÔNG ĐƯỢC BIẾN THÀNH SANDBOX"**. Ba tài liệu, ba câu, không khớp nhau. M8 là để chấm dứt trạng thái đó bằng một quyết định có chủ.

**Ngày lập:** 2026-09-29 · **Đo trên:** `d5b979ad79` · **Bối cảnh:** 8 tài liệu kế hoạch trên đĩa — M1, M2–M7 và plan tổng. `MILESTONE_1B_EXECUTION_PLAN.md` **không tồn tại**; danh sách cũ từng tính nó là một tài liệu riêng nên ghi thành "10".

---

## Trạng thái hiện tại

| Số liệu | Giá trị |
| --- | --- |
| Work item | **9 hạng mục từng liệt kê — 6 còn sống.** `W1`/`W2` DEFER và `W3` BỎ; phần còn sống là `W4`, `W5`, `W6`, `W7`, `W8`, `W9` |
| Wave | **5 wave từng viết — 4 còn sống** (`0`, `1`, `3`, `4`). Wave `2` toàn bộ thuộc phần DEFER |
| Câu hỏi mở | **4** (quyết định `3`, `4`, `6`, `7`). Quyết định `1`, `2`, `5` đã chốt |
| Kích thước | **L–XL** (phần cỡ nhỏ: S) |
| Kế hoạch cha | M2 (WI-20 / `GAP-M2-13`) · M6 (hàng 8, sandbox) · M1 (W6, approval) — nhưng `M1 W6` là cha của `W3` **đã bỏ**, nên phần còn sống không phụ thuộc nó |

---

## Mục tiêu

omp phải trả lời được ba câu hỏi mà hiện tại nó trả lời bằng im lặng:

1. **Lệnh đã được duyệt chạy được ở đâu trên đĩa?** — có cần trả lời không, và câu trả lời có đo được không.
2. **Lệnh đó đi được đến đâu trên mạng?** — và đây là câu hỏi *riêng*, không suy ra được từ câu 1.
3. **Khi omp không đo được, nó nói gì?** — hiện tại: im lặng.

Ba câu đó là ranh giới giữa *"coding agent"* và *"script wrapper"*. Không có nó, mọi tính năng khác trong mục tiêu chương trình đều chạy trên nền không kiểm soát.

---

## Bằng chứng nền — đã kiểm lại

**omp không có containment tầng OS, và tài liệu của chính omp nói thẳng điều đó.**

`docs/approval-mode.md:72`, nguyên văn:

> "This pattern policy controls approval for the `bash` tool; **it is not process or filesystem containment. An approved command retains the shell's ambient filesystem, network, and subprocess access.**"

Cùng đoạn đó nói thêm một thứ chưa ai ghi vào đâu: `eval` khai tier `exec` và có thể spawn shell qua subprocess, nên một rule `bash.patterns` `deny` **không áp dụng** cho cùng lệnh đó chạy qua `eval` — dưới `yolo` thì lời gọi `exec` đó resolve thành `allow`. Vậy tồn tại **hai đường thoát khỏi chính policy đã cài**.

Đo cơ chế thật trong cây:

```
git grep -rniE 'seatbelt|landlock|seccomp|bwrap|chroot|nsjail|firejail' -- packages crates
→ 4 hit, CẢ BỐN ĐỀU LÀ COMMENT
  packages/coding-agent/src/cli.ts:414-415            (ghi chú về pidfd_open trên kernel cũ)
  packages/coding-agent/src/modes/controllers/input-controller.ts:1439  (ghi chú seccomp)
  packages/coding-agent/src/tools/file-write-fallback.ts:379          (ghi chú Seatbelt/LSM)
  packages/coding-agent/src/export/html/vendor/highlight.min.js        (từ khoá JS, nhiễu)
→ 0 cơ chế. 0 syscall. 0 profile.
```

Và mặc định approval:

```
packages/coding-agent/src/tools/settings.ts:294   default: "yolo",
packages/coding-agent/src/tools/approval.ts:80     isApprovalMode(configured) ? configured : "yolo"
```

Cài mới xong, chạy tool không hỏi. `CROSS_REPO_COMPARISON.md:895` đã đề xuất đổi sang `write` và tự ghi *"nằm ngay trong code của chính omp, không cần lấy gì từ ai"*.

---

## Phạm vi

### Vào

| ID | Hạng mục | Cỡ | Wave |
|---|---|---|---|
| ~~**W1**~~ | ~~`FileSystemSandboxPolicy` — writable-root + read-deny~~ **DEFER (2026-09-29)** | ~~L~~ | ~~1~~ |
| ~~**W2**~~ | ~~`NetworkSandboxPolicy` — egress allowlist~~ **DEFER (2026-09-29)** | ~~M~~ | ~~2~~ |
| ~~**W3**~~ | ~~`tools.approvalMode` mặc định `yolo` → `write`~~ **BỎ (2026-09-29)** — omp không cần; mặc định cài giữ nguyên | ~~S~~ | — |
| **W4** | Path rule khai báo được bằng YAML (`deny: ["**/.env", "/etc/**"]`) | **S** | 1 |
| **W5** | `tools.approval.eval` — chặn đường thoát thứ hai | **S** | 0 |
| **W6** | **Tiếp nhận `WI-20` / `GAP-M2-13`** — trust enforcement theo thư mục dự án | **L** | 3 |
| **W7** | Trạng thái ba ngày cho cổng containment: allow / deny / **không-đo-được** | **S** | 3 |
| **W8** | Sandbox của code do model viết (`eval` / code mode) | **S–M** | 4 |
| **W9** | Báo cáo trạng thái containment trong `omp doctor` — bề mặt đích do quyết định 6 chốt, vì lệnh cấp cao nhất này **chưa tồn tại** (xem quyết định 6) | **S** | 4 |

### Không làm gì — đã quyết

| Không đổi | Vì sao |
| --- | --- |
| **Containment tầng OS (W1, W2) — DEFER (2026-09-29)** | Chủ sở hữu đã chốt hoãn. Xem bên dưới. |
| Không nâng `CRITICAL_BASH_PATTERNS` thành containment | Đó là M1 W6, và nó là *approval*, không phải *isolation*. Trộn hai tầng là lỗi kiến trúc. |
| Không sửa `spawn-policy.ts` | M6:1412 nói rõ nó **đúng** và không được sửa. M8 dùng nó làm đầu vào. |
| **Không đổi mặc định `yolo`** | W3 đã bị bỏ (2026-09-29) — chủ sở hữu: omp không cần. Mặc định cài giữ nguyên, ghi rõ trong `docs/approval-mode.md`. |
| Không dùng code của `omo` (`SUL-1.0`, non-sublicensable) | Mượn **hình dạng cổng**, không mượn dòng code. |

---

## ⚠️ Phạm vi sau quyết định DEFER (2026-09-29)

Chủ sở hữu đã chốt: **hoãn containment tầng OS.** Đây là câu quyết định 1, câu hỏi chặn cả milestone.

**Cái được hoãn:** `W1` (`FileSystemSandboxPolicy`) và `W2` (`NetworkSandboxPolicy`) — tức toàn bộ phần cần kernel, syscall hoặc profile OS. Đây là phần mang tên "Containment", nên **tên milestone không còn mô tả đúng nội dung nữa**; xem *Việc cần làm ngay* bên dưới.

**Cái KHÔNG hoãn** — vì chúng không cần kernel, rẻ, và nằm trên đường sẽ đỏ sớm:

| ID | Vì sao vẫn giữ |
|---|---|
| ~~`W3` mặc định approval `yolo` → `write`~~ **BỎ (2026-09-29)** | Chủ sở hữu: *"sai cái này omp có k cần làm"*. Mặc định `yolo` **giữ nguyên**. Hệ quả: `docs/approval-mode.md` ghi rõ đây là quyết định, và `W5` (chặn `eval`) nặng tương đối hơn — vì dưới `yolo`, `bash.patterns` không chặn được lệnh chạy qua `eval`. |
| `W4` path rule khai báo bằng YAML | Rẻ, không cần kernel, và là thứ **duy nhất** chặn được `eval` chạy code không kiểm chứng. |
| `W5` `tools.approval.eval` | Đóng đường thoát thứ hai mà `docs/approval-mode.md:72` nêu tên. S, và là lỗ hổng sống. |
| `W7` trạng thái ba ngày cho cổng | XS. Không có nó thì mọi cổng của M1–M7 đỏ giả đều không phân biệt được với đỏ thật. |
| `W8` nhốt code do model viết | Khác W1/W2: cơ chế là **cấp quyền bằng cách không cấp** (realm, không import) — không cần kernel. Và codex làm thế. |
| `W9` báo trạng thái trong `omp doctor` | S. Câu *"là chỗ duy nhất để in ra"* ở các bản cũ của file này là **sai** — xem quyết định 6. |

**Cái cần một chỗ mới: `W6`** (tiếp nhận `WI-20` / `GAP-M2-13` — trust enforcement theo thư mục dự án, cỡ L). Nó **không phải** OS containment — nó là câu trả lời cho **Câu 3 đã chốt** (extension project-local không tự load, `ctx.exec` bị từ chối với extension không tin cậy), và `isProjectTrusted()` vẫn là `() => true` ở `runner.ts:1293` và `agent-session.ts:7552`. `M2:44` cấm đặt nó trong M2. **Nó cần chủ**, hoặc nó sẽ lặp lại đúng số phận của sandbox: bị ba tài liệu nhắc tới và không ai nhận.

### Việc cần làm ngay

1. **Đổi tên M8** — "Containment" giờ mô tả cái đã bị hoãn. Gợi ý: *M8 — Approval & Containment khả dụng* hoặc tách hẳn, để cái đã hoãn không bị hiểu là đang được làm.
2. **Gán chủ cho `W6`** — nó là phần cài của Câu 3, đã chốt hôm nay.
3. **Ghi quyết định defer vào `docs/approval-mode.md`** — dòng 72 hiện thừa nhận thiếu containment mà không nói đó là **quyết định**. Chính cái im lặng đó là gốc rễ: đọc tài liệu không ai biết có phải sơ suất hay chủ ý.

---

## Ràng buộc kiến trúc — không được vi phạm

> **Hai trục độc lập ngay từ ngày đầu.** M6:1282 đã viết rõ điều này và nó đúng: một enum đơn trở thành nợ kỹ thuật ngay khoảnh khắc ai thêm trục thứ hai. `FileSystemSandboxPolicy` và `NetworkSandboxPolicy` là hai interface riêng, không phải hai giá trị của một enum. Người dùng có thể bật cái này và tắt cái kia.

> **Containment không thay approval.** Chúng là hai tầng, hai câu hỏi, hai lời giải thích khi người dùng bị chặn. Một tầng hỏi *"người dùng có cho phép không"*, tầng kia hỏi *"nó có với tới được không"*. Gộp là mất thông tin.

---

## Thứ tự thực hiện

| Wave | Nội dung | Cổng |
|---|---|---|
| **0** | ~~W3 (mặc định approval) — ĐÃ BỎ~~ + W5 (chặn `eval`) | Còn lại W5 — thay đổi **hành vi mặc định** nên cần sign-off sản phẩm bằng văn bản, không phải quyết kỹ thuật. Cổng này **chưa kiểm được ở đây** (xem *Những điều chưa được kiểm chứng*) |
| **1** | ~~W1 (filesystem) trên **Linux**~~ **DEFER** + W4 (path rule YAML) | Cổng còn lại là của `W4`: hai path rule cùng khớp shape phải ra hai kết quả khác nhau. Cổng cũ (`sandbox.exec()` trả `ENOSYS`/`unsupported`) thuộc `W1`, **đã hoãn** |
| **2** | ~~W2 (network) trên Linux~~ **DEFER** | Wave này không còn hạng mục sống. `W2` vẫn bắt buộc `W7` khi được mở lại |
| **3** | W6 (tiếp nhận `WI-20`) + W7 (ba ngày) | W6 **cố ý** nằm ngoài M2 — `MILESTONE_2_EXECUTION_PLAN.md:44` cấm |
| **4** | W8 (nhốt code model viết) + W9 (báo cáo trong `omp doctor`) | Theo `GAP-D4` mọi check mới phải tự chứng minh bằng một test. Bề mặt in ra do quyết định 6 chốt — bản cũ của dòng này ghi *"W9 là chỗ duy nhất để in ra"*, câu đó **sai** (xem quyết định 6) |

**Thứ tự nền tảng (buộc, khi mở lại `W1`/`W2`):** Linux (`seccomp`/`landlock`, fallback `bwrap`) → macOS (`seatbelt` profile) → Windows (Job Object). Đừng bắt đầu từ Windows: nó khó nhất và không có cơ chế nào trong cây để kiểm chứng. Hiện tại dòng này **không ràng gì đang chạy** — cả ba tầng đó đều thuộc phần đã DEFER.

---

## Quyết định cần chốt trước khi code

| # | Quyết định | Vì sao chặn | Ai chốt |
|---|---|---|---|
| 1 | ~~**Sandbox có thực sự là thứ sản phẩm này cần không?**~~ **✅ ĐÃ CHỐT (2026-09-29): DEFER.** Chủ sở hữu quyết **hoãn containment tầng OS**. Xem *Phạm vi sau quyết định defer* bên dưới. | ~~Đây là câu hỏi chặn toàn bộ M8.~~ **Đã đóng.** | Maintainer, bằng văn bản ✅ |
| 2 | ~~Mặc định `tools.approvalMode` đổi `yolo` → `write`?~~ **✅ ĐÃ CHỐT (2026-09-29): KHÔNG — giữ `yolo`.** Chủ sở hữu: *"sai cái này omp có k cần làm"*. W3 bỏ khỏi M8. | Đã đóng. Hệ quả ghi trong `docs/approval-mode.md`: dưới `yolo`, `bash.patterns` **không** chặn được lệnh chạy qua `eval` — nên W5 nặng tương đối hơn trước. | Maintainer ✅ |
| 3 | `eval` có được quyền spawn shell không? | W5 chặn nó là thay đổi hành vi. Nếu `eval` **cần** spawn shell thì W8 phải làm trước W5, ngược thứ tự. | Maintainer + kỹ sư tool |
| 4 | W6 có nhận `WI-20` từ M2 không, hay M2 giữ? | M2:44 nói thẳng phần thực thi **nằm ngoài M2**. Chuyển nó cần một dòng owner + ngày trong bảng quyết định M2. | Maintainer |
| 5 | ~~Trục nào làm trước — filesystem hay network?~~ **Vô nghĩa sau defer** | Cả W1 và W2 đều thuộc phần đã hoãn. Tái mở chỉ khi containment tầng OS quay lại phạm vi. | — |
| 6 | Trạng thái trust/approval in ra ở đâu, theo định dạng nào? | **Tiền đề cũ của câu này sai và phải sửa trước khi trả lời.** Lệnh `omp doctor` cấp cao nhất không tồn tại — nhưng **hai** bề mặt doctor đã có: `omp plugin doctor` và `omp images doctor`. Cả hai dựng danh sách check từ mảng viết cứng trong chính file, **không có chỗ nào cho extension thêm check vào**. Nên "nó là chỗ duy nhất để in ra" sai, còn "không có seam đăng ký check" thì đúng. Và cách kiểm bằng `grep` trên tên lệnh là dạng cổng mà `AGENTS.md` cấm. Cần khớp với W18 của M1. | Kỹ sư M1 + kỹ sư M8 |
| 7 | Đường dẫn rule YAML khai ở đâu? | `.omp/config.yml` hay file riêng? Ảnh hưởng tới việc `config migrate` của M5 W5 có phải xử lý không. | Kỹ sư, sau câu 1 |

---

## Định nghĩa hoàn thành

Mỗi dòng dưới đây phải phán đoán được **đúng hoặc sai**, không có vùng xám.

| # | Điều kiện |
|---|---|
| 1 | `tools.approval.eval` tồn tại và chặn đúng lệnh mà `bash.patterns` đã chặn. Đây là **đường thoát thứ hai** mà `docs/approval-mode.md:72` nêu tên. |
| 2 | `isProjectTrusted()` **không còn** là `() => true` — có ít nhất một đường trả `false`, và test chứng minh nó. |
| 3 | Code do model viết qua `eval`/`code-mode` không thể đọc `node:fs` thật mà không báo gì. |
| 4 | Path rule YAML của `W4` nạp được và ra **hai kết quả khác nhau**: một mẫu bị `deny`, một mẫu khác cùng khớp shape bị `allow`. Nếu hai mẫu cho cùng một kết quả thì rule không có tác dụng. |
| 5 | `W7` phân biệt được **ba** trạng thái, và test chứng minh được nhánh giữa: một cổng chỉ trả `allow` hoặc `deny` là **chưa xong**. Đây là hợp đồng âm trọng tâm — nhánh *"không đo được"* là thứ duy nhất chứng minh được khác với cổng luôn xanh. |
| 6 | Trạng thái trust/approval của `W9` in ra từ một bề mặt doctor **đã tồn tại** và người dùng đọc được — không phải chỉ ghi log. Xem quyết định 6: cấp cao nhất `omp doctor` chưa có, nhưng hai bề mặt doctor dưới nó thì có. |

> **Bốn dòng cũ đã gỡ (2026-09-29) — không phải bỏ sót.**
>
> - Ba dòng đầu cũ (`sandbox.exec()` trả `ENOSYS`/`unsupported`; read-deny `["**/.env"]` dưới `yolo`; hai policy bật/tắt độc lập) đều đòi `W1`/`W2` — thuộc phần đã DEFER theo quyết định 1. Giữ chúng nghĩa là bảng này đòi ba cổng **không bao giờ có thể xanh**, và kỹ sư sẽ bị chặn ở đúng chỗ đó.
> - Dòng *"một session mới resolve ra `write`, không phải `yolo`"* là dòng **ngược lại kết quả của chính quyết định 2** — quyết định 2 đã chốt giữ `yolo` và bỏ `W3`, còn vế trong ngoặc *"chỉ khi quyết định 2 được chốt"* thì đã không còn đúng nữa. Nó ở lại đây chỉ để nhắc: dòng đó **đã bị xoá, không phải đang chờ**.
>
> Cả bốn quay lại nguyên văn nếu quyết định 1 được mở lại.

---

## Những điều chưa được kiểm chứng

1. **Phần sweep tĩnh vẫn đúng; phần "máy này không chạy được test" thì không còn.** Mọi verdict "CÓ / THIẾU" trong file này vẫn là về **sự tồn tại của mã**, không phải hành vi lúc chạy — chưa work item nào ở đây đã chạy thật. Nhưng addon native **đã build** và `bun test` **chạy được**:

   ```
   ls -la packages/natives/native/pi_natives.darwin-arm64.node
   → 185 MB, 2026-09-29 08:47

   bun test packages/utils/test/
   → 743 pass · 10 skip · 0 fail · 753 test · 80 file
   ```

   Dòng cũ trích lỗi `pi_natives.win32-x64.node` — máy đo là `darwin-arm64`, nên lỗi đó thuộc một máy khác, không thuộc cây này. Bất kỳ tài liệu nào còn dùng *"chưa build ⇒ `bun test` đỏ"* làm tiền đề thì đang mô tả một thời điểm đã qua.
2. **Quy mô thật chưa đo.** Các con số cỡ sóng trong tài liệu M6 (codex `sandboxing` 24 file/10.469 dòng, `linux-sandbox` 31/12.747, `windows-sandbox-rs` 114/28.762) **mượn từ audit M6** — `codex-ref` không có trên máy này, nên `unverifiable-here`. Cỡ **L–XL** ở đây là suy ra từ cơ chế cần có, không phải từ phép đo.
3. **Chưa kiểm tầng damage cấp Rust.** Mệnh đề "cần đổi engine" của G2 chỉ khẳng định cho tầng TypeScript. `crates/pi-natives` có thể đã có sẵn thứ gì đó liên quan.
4. **Câu hỏi "có cần cho sản phẩm này không" — đã có câu trả lời, không còn treo.** Đây là quyết định 1 ở trên và nó đã chốt (DEFER, 2026-09-29). Nó chỉ còn chặn nếu ai đó định mở lại `W1`/`W2`.
5. **`bun test` là tri-state — nhưng đó là điều kiện, không phải hiện trạng của máy đang đo.** Thiếu addon thì suite đỏ mà đó **không phải** test fail; addon đã có thì suite xanh. Máy này đang ở nhánh thứ hai. W7 là để phân biệt hai nhánh đó — và W7 phải đứng trước khi bất kỳ cổng nào của M1–M7 được coi là xanh.
6. **Các neo `file:line` chéo vào tài liệu khác đã trôi.** Số trong ngoặc dưới đây là **số cũ đang còn trong file này** — giữ nguyên để không phá tham chiếu, và nói rõ chỗ thật để người đọc không lần theo nhầm:

   | Neo cũ trong file này | Nội dung được trích | Nó nằm ở đâu bây giờ |
   |---|---|---|
   | `MILESTONE_6_EXECUTION_PLAN.md:1282` (dòng 5) | *"Chọn: chưa xây trong M6"* | hàng 8 của bảng quyết định M6, nay ở dòng 1293 |
   | `MILESTONE_6_EXECUTION_PLAN.md:726` (dòng 7) | audit kết luận thiếu cả tầng | nay ở dòng 729 |
   | `MILESTONE_2_EXECUTION_PLAN.md:3849` (dòng 7) | *"KHÔNG ĐƯỢC BIẾN THÀNH SANDBOX"* | nay ở dòng 3970 |
   | `MILESTONE_6_EXECUTION_PLAN.md:1412` (dòng 93) | `spawn-policy.ts` không được sửa | dòng 1412 nay **trống**; câu đó ở dòng 1398 và 1423 |
   | `CROSS_REPO_COMPARISON.md:895` (dòng 66) | đề xuất đổi mặc định sang `write` | dòng 895 là tiêu đề mục, câu đề xuất ở dòng 897 |

   Đã kiểm và **đúng**: `docs/approval-mode.md:72`, `MILESTONE_2_EXECUTION_PLAN.md:44`, và toàn bộ neo mã nguồn (`settings.ts:294`, `approval.ts:80`, `runner.ts:1293`, `agent-session.ts:7552`, `cli.ts:414-415`, `input-controller.ts:1439`, `file-write-fallback.ts:379`).
7. **Các cổng phụ thuộc hệ thống ngoài repo thì *chưa kiểm được ở đây*, không phải *đã biết là đỏ*.** Cổng sign-off sản phẩm bằng văn bản của wave `0` thuộc loại này: nó cần người ký, không cần máy. Không có máy nào ở đây trả lời được, kể cả theo chiều "không đỏ được".
