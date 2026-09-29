# CẦN BẠN QUYẾT — 11 việc không thể tự giải

Ngày 2026-09-29. Đo trên `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `6e8109d`.

Tài liệu này gom các điểm còn treo trong 16 mục rời rạc, bỏ trùng, xếp theo mức chặn.
Mỗi mục có: **câu hỏi**, **vì sao chặn**, **phương án** (kèm điểm yếu của từng phương án),
và **khuyến nghị của tôi** kèm lý do.

Tôi không tự chọn ở đâu cả. Mọi phương án dưới đây đều để ngỏ cho bạn.

---

## Đọc trước: 4 mục trong danh sách gốc đã hết hạn

Danh sách 16 mục bạn đưa được soạn từ ảnh chụp cũ hơn. Tôi đã chạy lại từng mục và **4 mục
đã được sửa xong trong lúc các lượt sửa khác chạy song song**. Tôi không đưa chúng vào danh
sách cần quyết, nhưng cũng không giấu đi — bạn cần biết để không đi tìm lại:

| Mục gốc nói | Thực tế đã là gì |
|---|---|
| "M2 dòng 1636 vẫn đang hỏi live về WI-4b" | **Đã sửa.** Dòng 1642, 1653, 4317, 4360 đều đã gạch câu hỏi và ghi **ĐÃ CHỐT**. |
| "Cần đánh dấu ĐÃ CHỐT 3 dòng ở M2" (mục M4-R1) | **Đã sửa** — cùng 4 dòng trên. Không còn việc. |
| "Sửa M2:3 — câu 'M3 và M4 không có tham chiếu nào tới thương hiệu' là sai" (mục M5-R1) | **Đã sửa.** `MILESTONE_5_EXECUTION_PLAN.md:3` giờ ghi đúng "không **giả định** tên đã ổn định" và kèm số đo 31/16 dòng. |
| "`prompts/` ghi 223 file, thật ra 227" | **Đã sửa** ở `PACKAGE_REORGANIZATION_PLAN.md:694`. |

Hai mục nữa **giảm hẳn phạm vi** so với lời mô tả gốc, và tôi đã gộp chúng vào mục khác:
- Mục "con số 141" — chính file M1 đã tự giải thích con số này ở dòng 3931. Xem mục 11.
- Mục "cổng cache-warmer luôn đỏ" — khối ⛔ đã nói rõ "đừng chạy nó". Xem mục 7.

Còn lại **11 mục dưới đây là thật**, đã đo lại từ cây hiện tại.

---

# Nhóm A — Chặn việc bắt đầu

## 1. Bảng milestone nói M1 phụ thuộc R0, nhưng tài liệu nguồn của R0 nói ngược lại

**Câu hỏi:** `R0` (kế hoạch tổ chức lại package) là tiền đề của **M1**, hay của **M1B**?

**Vì sao chặn:** Đây là bảng điều hướng — ai cũng đọc nó trước khi xếp lịch. Nhưng nó đang
tự mâu thuẫn với đúng tài liệu mà nó trỏ tới. Tôi đã đối chiếu:

| Nơi | Nói gì |
|---|---|
| `PACKAGE_REORGANIZATION_PLAN.md:1` | "Tài liệu này **không thuộc sáu milestone**" |
| `PACKAGE_REORGANIZATION_PLAN.md:3` | "nó là **điều kiện tiên quyết để `MILESTONE_1B_EXECUTION_PLAN.md`** thật sự rẻ và an toàn" |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:290` (hàng M1) | cột *Phụ thuộc* ghi **R0** |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:291` (hàng M1B) | cột *Phụ thuộc* ghi **M1** — không ghi R0 |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:302` (chuỗi phụ thuộc) | `M1 → M1B → M2 → {M3, M4} → M5 → M6` — **không có R0 ở đâu cả** |

Nói cách khác: tài liệu reorg tự mô tả mình là tiền đề của **M1B**, còn bảng điều hướng lại
gán nó cho **M1**, và chuỗi phụ thuộc ngay dưới thì không chứa R0. Ba chỗ, ba câu.

Tôi không tự sửa vì đây là phát biểu về **thứ tự thực thi**, và `DECISIONS.md` đã nói thẳng
rằng việc bổ sung các hàng vào bảng này "chưa quyết ở file này". Hàng R0 do một lượt sửa
trước thêm vào, không có ai ký.

**Phương án:**

- **(a) Sửa bảng theo lời tài liệu nguồn.** M1 → phụ thuộc `—`; M1B → `M1, R0`; chuỗi ở
  dòng 302 thêm R0 vào đúng chỗ. *Nhược điểm:* bạn đang chọn tin `PACKAGE_REORGANIZATION_PLAN.md`
  hơn tin bảng điều hướng — và nếu thực ra R0 nên chạy song song M1 thì bạn vừa làm chậm
  M1 một cách không cần thiết.
- **(b) Giữ `M1 ← R0`, sửa ngược lại `PACKAGE_REORGANIZATION_PLAN.md:3`** để nó nói R0 là
  tiền đề của M1. *Nhược điểm:* phải mở file thứ hai để sửa một câu, trong khi câu đó là
  mô tả về chính file reorg — viết lại nó để phục vụ bảng điều hướng là đảo chiều.
- **(c) Gỡ hàng R0 khỏi bảng milestone**, để nó chỉ tồn tại dưới dạng tài liệu tham chiếu
  được trỏ tới bằng văn xuôi. *Nhược điểm:* bảng mất một mốc; người đọc chỉ bảng sẽ không
  thấy công việc tổ chức lại package tồn tại.

**Khuyến nghị của tôi: (a).** Đây là phương án duy nhất bám theo nguồn, và nó giải quyết
cả mâu thuẫn ở dòng 302 chứ không chỉ hai ô trong bảng. Tôi hiểu vì sao bạn chưa muốn tôi
đụng vào: nó biến một dòng bảng thành lời cam kết về thứ tự làm việc, và đó đúng là loại
quyết định mà tài liệu quyết định nói ai cũng chưa chốt.

---

## 2. M2 nói "phải xong trước M4-4", nhưng M4 hoàn toàn không biết điều đó

**Câu hỏi:** Có thêm ràng buộc "M2 xong trước M4-4" vào `MILESTONE_4_EXECUTION_PLAN.md` không?

**Vì sao chặn:** `MILESTONE_2_EXECUTION_PLAN.md:97` viết: *"**Không chặn M4** theo thứ tự này,
nhưng phải xong trước M4-4."* Tôi đã kiểm lại: `grep -icE 'prestep|session-log|durable turn'
MILESTONE_4_EXECUTION_PLAN.md` trả **0** (thoát mã 1). M4-4 không hề biết mình có tiền đề.

Đây đúng là lớp lỗi mà chính `DECISIONS.md` sinh ra để chặn: **một ràng buộc viết ở một chỗ,
đọc ở một chỗ khác** — hoặc đúng hơn, ở đây nó được viết ở một chỗ và **không chỗ nào đọc**.

Đáng chú ý: `MILESTONE_4_EXECUTION_PLAN.md:16` vốn đã nói hai mục của M4 phụ thuộc việc M2
chưa làm. Đây là câu đó thiếu ví dụ thứ hai.

**Phương án:**

- **(a) Thêm một dòng "Cần trước khi bắt đầu" vào M4-4**, nói rõ tên `WI-PRESTEP-1` và trỏ
  ngược về Wave 1b của M2 — y hệt cách các wave trong M2 trỏ chéo lẫn nhau. *Nhược điểm:* thêm
  một dòng vào file 314 KB, và người đọc M4 phải nhảy sang file khác mới hiểu.
- **(b) Đưa vào bảng "Cổng đang đỏ ngay bây giờ" của M4** (dòng ~13) để phụ thuộc M2 hiện ra
  ngay trong phần tóm tắt cổng. *Nhược điểm:* đó là bảng về cổng kiểm thử, không phải bảng về
  tiền đề — nhồi tiền đề vào đó là lệch chức năng.
- **(c) Bỏ câu "phải xong trước M4-4" khỏi M2**, để M4 tự điều phối. *Nhược điểm:* phá mất
  một ràng buộc có thật, và nếu ràng buộc đó đúng thì bạn sẽ phát hiện vi phạm quá muộn.

**Khuyến nghị của tôi: (a), và làm kèm (b).** Ràng buộc thuộc về chỗ bắt đầu, nên (a) là chỗ
đúng. Tôi vẫn khuyên (b) đi kèm vì nó gần như miễn phí và biến một ràng buộc chỉ ai đọc M2
mới thấy thành thứ ai đọc M4 cũng thấy. Nếu bạn chỉ làm một cách thì làm (a).

---

## 3. `WI-SESSION-LOG` không có điều kiện hoàn thành — nên M2 không thể đóng

**Câu hỏi:** `WI-SESSION-LOG` xong khi nào, hay nó không thuộc M2?

**Vì sao chặn:** M2 tự tuyên bố 17 work item. Bảng *Định nghĩa hoàn thành* có 16 hàng —
hàng thứ 17 là `WI-SESSION-LOG`. Chính file đã nói thẳng ở dòng 4527:

> *"**16 dòng là chưa đủ, và phải nói thẳng vì sao:** … `WI-SESSION-LOG` chưa có hàng ở đây,
> vì nó **chưa từng có điều kiện hoàn thành nào được viết ra ở bất kỳ đâu** … Nó vẫn là một
> trong 17 mục M2 tuyên bố, nên **M2 không thể đóng**. … Chưa có mặc định — **cần bạn quyết**."*

Đây không phải sự lơ ý của tôi; đây là chỗ plan đã dành sẵn chỗ cho câu trả lời của bạn.
Mục đó chỉ có *cổng mở* (đo trước khi viết) và *cổng quyết định sau phương án A*, không có
*cổng hoàn thành*.

`WI-PRESTEP-1` thì đã có hàng rồi — chỉ mục này là thiếu.

**Phương án:**

- **(a) Phương án A chính là toàn bộ M2 của mục này.** Xong = có listener kiểu `llm/stream` đã
  bắt được sai lệch giữa thứ gửi cho model và thứ tái dựng từ lịch sử, đỏ trên một ca sai lệch
  dựng sẵn, và **số việc phạm mà nó bắt được trên toàn bộ test suite được ghi bằng số**. Quy
  tắc dừng đã có sẵn ở dòng 99: nếu số đó bằng 0 thì ghi thẳng "không có bằng chứng omp cần
  B" rồi dừng. *Nhược điểm:* bảng *Định nghĩa hoàn thành* sẽ có một hàng mà điều kiện là
  "đo ra con số" chứ không phải "đạt trạng thái" — lệch với 16 hàng kia.
- **(b) Hàng của nó chỉ ghi phần đo** (bảng lỗ hổng resume/fork/transcript/compaction/cache/
  telemetry/replay, mỗi dòng đánh dấu "đang giữ state riêng" hay "đọc lại từ nguồn"), và nói
  rõ phần bất biến session để sau. *Nhược điểm:* bảng sẽ trông xong trong khi mục lớn nhất
  của nó chưa làm — đúng cái bẫy mà mục *Bàn giao* của Wave 1b cảnh báo.
- **(c) Gỡ `WI-SESSION-LOG` khỏi phạm vi M2**, ghi rõ ở đầu mục. *Nhược điểm:* số đầu file
  (dòng 5) và bảng milestone trong plan tổng phải rớt từ 17 xuống 16, và đây là quyết định
  **thu hẹp phạm vi** — chỉ bạn mới gọi tên được.

**Khuyến nghị của tôi: (a).** Đây là phương án duy nhất khớp với mặc định mà chính mục đó đã
tự đặt ra ("làm A trước, đo lại, rồi mới cân nhắc B"), và nó giữ cho trạng thái "xong" của
M2 quyết định được bằng **một con người cộng một con số** — đúng thứ mà chính dòng 75 của
M2 đòi mọi cổng phải có. Nếu bạn không muốn làm việc mô hình session trong M2 thì (c) là
lựa chọn trung thực, **nhưng khi đó số 17 ở dòng 5 phải xuống 16** và đó là quyết định cắt
phạm vi, tôi không tự làm.

---

# Nhóm B — Một tài liệu đang nói sai

## 4. Lệnh kiểm chứng của phán quyết thương hiệu đo **ngược chiều** — và nó đã bị sao chép ra hai chỗ

*(Gộp 3 mục gốc: "sửa lệnh grep ở DECISIONS.md", "COMPREHENSIVE dòng 13462 còn đoạn cũ",
"COMPREHENSIVE dòng 313 còn mệnh đề sai" — chúng là cùng một câu sai ở ba chỗ. Khi kiểm, tôi
thấy nó hỏng ở **bốn** chỗ, vì bảng phân rã ngay trong `M5:3` cũng sai theo.)*

**Câu hỏi:** Có mở `.lavish-wip/applied/DECISIONS.md` để sửa bằng chứng của phán quyết
`m5-order` không?

**Vì sao chặn:** M5 đổi tên thương hiệu `oh-my-pi` → `ultraworkers`. Nhưng lệnh dùng làm
bằng chứng là:

```
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand'
```

Lệnh này chỉ tìm **tên mới** và từ vựng đổi tên. Nó **không bao giờ** tìm chuỗi **cũ**
`oh-my-pi` — đúng cái đang được đổi tên. Một lệnh không dò được đối tượng của nó thì không
chứng minh được đối tượng đó vắng mặt. Đo lại đúng chiều (chạy lại được):

```
grep -c '@oh-my-pi/' MILESTONE_3_EXECUTION_PLAN.md   # 31 dòng
grep -c '@oh-my-pi/' MILESTONE_4_EXECUTION_PLAN.md   # 16 dòng
grep -o '@oh-my-pi/pi-[a-z-]*' MILESTONE_3_EXECUTION_PLAN.md | sort | uniq -c
#   25 pi-tui · 9 pi-utils · 4 pi-agent-core · 4 pi-coding-agent · 2 pi-natives
grep -o '@oh-my-pi/pi-[a-z-]*' MILESTONE_4_EXECUTION_PLAN.md | sort | uniq -c
#   7 pi-natives · 5 pi-tui · 4 pi-utils · 1 pi-coding-agent
```

Tức **31 dòng ở M3 và 16 dòng ở M4 thật sự ghi scope cũ** — con số này đúng, và bản sửa trước
đã dán nó vào `M5:3`.

Một chi tiết mới tôi phát hiện khi kiểm: **tổng của `M5:3` đúng, nhưng bảng phân rã bên cạnh
thì sai.** Ở `M5:3` ghi *"M3: `pi-tui` 17, `pi-utils` 6…"* trong khi đo thật là `pi-tui` 25
và `pi-utils` 9. Bản phân rã của M4 thì khớp (7/5/4/1), nhưng cộng ra 17 — đó là **số lần
xuất hiện**, còn 16 là **số dòng**; hai đơn vị khác nhau được trộn trong cùng một câu.

**Phần kết luận vẫn đúng** (M5 không phải tiền đề cứng của M3/M4, và tiền đề thật là M2);
chỉ có phần *bằng chứng* là hỏng. Nhưng bằng chứng hỏng trong một tài liệu mà các tài liệu
khác trích dẫn thì vẫn là lỗi — và giờ nó hỏng ở **hai** tầng: lệnh gốc trong
`DECISIONS.md`, và bảng phân rã trong chính `M5:3`.

Và câu sai đó đã lan ra hai chỗ nữa mà lượt sửa kia không chạm tới:
- `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13475` — vẫn còn nguyên văn câu *"…và là điều kiện
  tiên quyết thực tế cho M3 và M4, vì cả hai đều giả định tên thương hiệu đã ổn định"*, đúng
  câu vừa bị gỡ khỏi `M5:3`.
- `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:311-313` — vẫn còn nguyên lệnh grep cũ và vế
  *"**không milestone nào giả định tên thương hiệu**"*.

**Phương án:**

- **(A) Sửa cả bốn chỗ trong một đợt.** Đổi lệnh thành `grep -c '@oh-my-pi/'` cho ra 31 và 16,
  sửa vế kết luận thành "không **giả định** tên đã ổn định" (M3/M4 vẫn *va chạm* với đợt đổi
  tên, chỉ không phải kiểu tiền đề), sửa bảng phân rã ở `M5:3` (M3: `pi-tui` **25**, `pi-utils`
  **9**; M4: nói rõ 17 lần xuất hiện nằm trên 16 dòng), và thay đoạn ở dòng 13475 bằng bản đã
  chốt ở `M5:3`. *Nhược điểm:* đụng vào `DECISIONS.md`, file mà các đợt sửa trước đều bị cấm
  không chạm.
- **(B) Chỉ sửa hai bản sao ở plan tổng, giữ nguyên `DECISIONS.md`.** *Nhược điểm:* để lại
  đúng cái lỗi mà `DECISIONS.md` tự đặt ra làm bài học chung. Lượt sửa sau lại sẽ đọc lại
  lệnh grep cũ và tin nó — đây chính là vòng lặp mà đợt sửa này sinh ra để dẹp.
- **(C) Ghi chú bên cạnh phán quyết rằng lệnh gốc không đo được đối tượng của nó**, không sửa
  con số. *Nhược điểm:* hai bản sao ở plan tổng vẫn sai; người đọc thường đọc plan tổng, không
  đọc file chú thích.

**Khuyến nghị của tôi: (A).** Số thay thế đã đo sẵn nên gần như không tốn công. Tôi hiểu
lý do bạn giữ ranh giới đó — nhưng lần này khác: đây không phải sửa văn xuôi, đây là sửa
**bằng chứng** của một phán quyết đang được trích lại. Nếu bạn không muốn mở
`DECISIONS.md` lượt này, thì (C) là sàn tối thiểu mà tôi vẫn khuyên hơn (B).

---

## 5. Bảng va chạm của M1B lẫn package ngoài phạm vi, và con số trên đầu không khớp số hàng thật

*(Gộp 2 mục gốc: "số va chạm 56/61/64 không khớp" và "12 hàng durable còn nằm trong bảng" —
vì số đếm phụ thuộc vào việc 12 hàng đó còn lại hay không.)*

**Câu hỏi:** Bảng *Va chạm với thứ omp đã có* giữ hay bỏ 12 hàng `durable`, và con số tổng
nên viết là bao nhiêu?

**Vì sao chặn:** Tôi đã đếm lại từng hàng trong cả hai bảng:

| | Hàng đếm được | Văn xuôi trong file nói |
|---|---|---|
| Bảng 1 (dòng 2696–2731) | **32** (chord 6, protocol 11, server 7, client 8) | dòng 2691: "**33** trong 61 va chạm" |
| Bảng 2 (dòng 2735–2771) | **31** (client 1, durable 12, evals 13, telemetry 5) | dòng 2691: "**28** va chạm còn lại" |
| **Tổng** | **63** | 33 + 28 = **61** |
| Trong đó `durable` (ngoài phạm vi) | **12** | — |
| Thuộc 6 package trong phạm vi | **51** | — |

Nghĩa là **không con số nào trong danh sách gốc đưa ra là đúng** — không phải 56, không phải
61, không phải 64, cũng không phải 52. Lệch ở cả hai bảng: bảng 1 có 32 hàng chứ văn xuôi nói
33; bảng 2 có 31 hàng chứ văn xuôi ngầm định 28. Ba con số đang cùng sống trong một file và
không con số nào tự kiểm được.

Về 12 hàng `durable`: chúng **là** bằng chứng cho chính quyết định đã chốt (chép tầng lưu của
`durable` vào omp là lùi vì hình dạng truncate của nó xung đột với `pi-tui`) — ví dụ hàng
`TruncationResult` giải thích vì sao **không** nên chép. Xoá đi là mất lý do. Nhưng giữ
nguyên như hiện tại thì người đọc có thể tưởng đó là việc phải làm. Ghi chú ở dòng 2735 đã
nói rõ là tài liệu tham khảo, nhưng bảng thì vẫn trông như danh sách việc.

**Phương án:**

- **(a) Giữ 12 hàng + ghi chú (hiện tại), và chuẩn hoá mọi con số về 63, kèm một câu nói rõ
  12 hàng đó là tham khảo nên phần trong phạm vi là 51.** *Nhược điểm:* đầu file (dòng 6,
  dòng 396) và bảng (dòng 2691) phải sửa cùng lúc; nếu sửa lệch chỗ thì ta lại tạo mâu
  thuẫn mới — đúng cái đã xảy ra hai lần trong các lượt trước.
- **(b) Chuyển 12 hàng `durable` xuống một phụ lục riêng cuối mục, để bảng va chạm chỉ còn
  việc thật, rồi chuẩn hoá số về 51.** *Nhược điểm:* phải di chuyển 12 hàng (mỗi hàng dài vài
  trăm chữ) — công việc cơ học lớn, và làm file nặng thêm một lần nữa trong khi file đã 627 KB.
- **(c) Xoá hẳn 12 hàng.** *Nhược điểm:* mất lý do đã chốt không chép. Đây cũng là phương
  án ít nhất trong ba cái, tôi không khuyên.

**Khuyến nghị của tôi: (a).** 63 là con số trung thực nhất vì nó đếm được, lặp lại được, và
khớp với cả hai bảng. Giữ 12 hàng làm tài liệu tham khảo là đúng vì chúng là **bằng chứng**,
không phải **việc** — và bảng va chạm vốn đã mang hai vai trò đó lẫn vào nhau, nên việc thêm
một câu phân định rẻ hơn nhiều so với di chuyển cả khối. Nếu bạn muốn bảng chỉ gồm việc
thật thì (b) sạch hơn, nhưng đổi lại phải sống với một lần sửa cơ học lớn.

Lưu ý khi bạn chọn: **đừng chọn 56 hay 61 chỉ vì chúng đã xuất hiện nhiều lần.** Cả hai đều
không khớp số hàng. 56 xuất hiện ở dòng 6 và 396; 61 chỉ là 33 + 28 từ dòng 2691.

---

## 6. Hai câu hỏi đã đóng vẫn đang được đếm như câu hỏi mở

**Câu hỏi:** Có rút hai hàng `WI-4` ra khỏi nhóm "câu hỏi chưa có mặc định" và cập nhật số
đếm không?

**Vì sao chặn:** Phần "đánh dấu ĐÃ CHỐT" đã xong — nhưng phần "rút khỏi nhóm và đếm lại"
thì chưa, và nó kéo theo số ở **hai file**. Cụ thể:

- `MILESTONE_2_EXECUTION_PLAN.md:4317` và `:4360` — hai hàng `WI-4` đã ghi **ĐÃ CHỐT**, nhưng
  vẫn nằm trong bảng mà dòng 4330 đếm là "69 câu trên 68 dòng bảng … 47 câu chặn bắt đầu,
  22 câu chỉ chặn về sau".
- Dòng 5 và dòng 4248 cũng đang ghi "69 câu hỏi còn mở".
- `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:8523` vẫn mang hàng `WI-4` nguyên dạng, còn ghi
  *"Không chặn: WI-4b không có trong wave table M2 nên không ai sở hữu nó"* — tức vẫn mô tả
  `WI-4b` như thứ đang tồn tại và đang chờ người quyết.

Nói cách khác: quyết định đã chốt, nhưng **số đếm và bản sao ở file khác vẫn nói ngược**.
Đây là mẫu lỗi mà `DECISIONS.md` gọi tên ngay trong phần bài học chung.

**Phương án:**

- **(a) Một đợt riêng sửa đồng thời M2 và plan tổng**: rút hai hàng ra, cập nhật "69" thành
  con số mới ở cả dòng 5, 4248, 4330 và ở plan tổng. *Nhược điểm:* phải mở hai file, và phải
  đếm lại từ đầu xem còn bao nhiêu câu thật.
- **(b) Chỉ thêm nhãn "đã chốt — không chặn" ngay tại dòng 4317 và 4360**, giữ nguyên mọi số
  đếm. *Nhược điểm:* số đếm vẫn đếm cả câu đã đóng — nhưng ít nhất thì đọc được là câu nào
  còn sống, câu nào đã chết.
- **(c) Không làm gì.** `DECISIONS.md:232-233` tự hạ cấp mức độ của nó: *"M2:4307 đã có sẵn
  mặc định đúng … và **không chặn** gì."* *Nhược điểm:* để lại một câu hỏi đã có đáp án đang
  được tính vào "chặn bắt đầu", và plan tổng vẫn mở lại `WI-4b`.

**Khuyến nghị của tôi: (a).** Đây là loại việc rẻ ngay bây giờ nhưng đắt nếu hoãn — mỗi lượt
sửa thêm vào M2 làm các số ở dòng 5/4248/4330 lệch thêm. Nếu một đợt phải gộp nhiều thứ và
bạn không kham nổi, chọn **(b)** thay vì (c): nó rẻ, chỉ đụng một file, và ngăn không cho câu
hỏi đã chết tiếp tục đọc như câu hỏi sống.

---

# Nhóm C — Còn vết của một mục đã gỡ

## 7. Thân §W8 vẫn còn trong M1 — giữ làm vết hay thu gọn?

*(Gộp 2 mục gốc: "thân §W8 còn nguyên" và "cổng cache-warmer luôn đỏ".)*

**Câu hỏi:** §W8 (dòng 1570–1830 của `MILESTONE_1_EXECUTION_PLAN.md`) nên giữ nguyên thân,
hay thu gọn lại?

**Vì sao chặn:** W8 đã bị gỡ khỏi phạm vi ngày 2026-09-28 (upstream 18.3.5 đã tự dựng
`cache-warmer.ts` 599 dòng thay cho tầng mà W8 định sửa). Khối ⛔ đã được chèn ở đầu mục, các
bảng đã gạch dòng, số đếm đã hạ 17 → 16. Nhưng **thân mục vẫn còn nguyên 260 dòng** với đầy
đủ *Thay đổi gì*, *File cần chạm tới*, *Các bước*, *Cổng*, *Phụ thuộc* — đọc lên vẫn là một
spec có thể bắt tay làm.

Về nét chi tiết nhỏ đi kèm: khối ⛔ đã nói rõ cổng `test ! -e …/cache-warmer.ts` là
**"đỏ vĩnh viễn; đừng chạy nó, đừng cố làm nó xanh"** — phần này ổn rồi. Chỉ còn hai thứ nhỏ:
khối ⛔ trỏ "dòng 1762" trong khi cổng thật nằm ở dòng **1758**; và dòng lệnh đó vẫn nằm
nguyên trong mục *Cổng* như một lệnh chạy được.

**Phương án:**

- **(a) Giữ nguyên như hiện tại**, gạch riêng dòng cổng ở 1758 và sửa neo 1762 → 1758.
  *Nhược điểm:* 260 dòng vẫn ở đó, và bất kỳ ai lướt nhanh đều có thể đọc nhầm là việc.
- **(b) Thu gọn §W8** còn khối ⛔ + một đoạn tóm tắt về sao bị gỡ, xoá phần thân. *Nhược điểm:*
  mất vết lịch sử, và mất các đính chính đã kiểm chứng về `anthropic.kdl` mà W7 vẫn dùng.
- **(c) Chuyển §W8 xuống phụ lục đánh số riêng** cuối file. *Nhược điểm:* tạo thêm một cấu
  trúc mới, và mọi neo dòng trỏ vào §W8 (ở 1782, 1788-1791, 1797, 1805, 1820) sẽ hỏng.

**Khuyến nghị của tôi: (a).** File này đã chọn nhất quán cách "giữ vết + gạch chỗ sai" — ở
dòng 3708, 3739 và 3884 nó giữ hàng W8 và ghi rõ đó là vết của spec cũ, và câu *"§W8 vẫn còn
nguyên trong file này như vết của spec cũ"* đã nằm sẵn trong văn xuôi. Xoá thân sẽ phá vỡ
mối liên hệ đó và làm các sửa tiếp theo khó kiểm chứng hơn. Tôi chỉ khuyên thêm phần gạch
dòng cổng ở 1758, vì khối ⛔ nói "đừng chạy" thì không đủ — **lệnh vẫn nằm trong mục Cổng
như lệnh chạy được**.

---

## 8. `DECISIONS.md` đang trỏ sai dòng trong M2

**Câu hỏi:** Có cập nhật lại các neo dòng trong `DECISIONS.md` không, và có đổi sang trỏ
theo tên mục thay vì theo số dòng không?

**Vì sao chặn:** Tôi đã đo lại cả 5 neo, và chúng đều lệch **đều 10 dòng**:

| `DECISIONS.md` nói | Thực tế nằm ở | Nội dung đúng như đã định |
|---|---|---|
| 1474 | **1484** | tiêu đề `## WI-4. Đóng backdoor toolRenderers` |
| 1512 | **1522** | bước 2, lệnh thay dòng khai báo `Readonly<>` |
| 1632 | **1642** | câu hỏi, nay đã gạch và ghi ĐÃ CHỐT |
| 4307 | **4317** | hàng bảng, nay đã ghi ĐÃ CHỐT |
| 4350 | **4360** | hàng bảng, nay đã ghi ĐÃ CHỐT |

Không có chỗ nào hỏng nội dung — chỉ lệch vị trí. Nhưng lý do tồn tại của cả đợt sửa này là
"quyết định viết ở một chỗ, đọc ở chỗ khác"; để neo trỏ lệch 10 dòng là giữ nguyên cái lỗi
đó ở dạng nhẹ nhất.

Tôi không tự sửa được vì `DECISIONS.md` nằm trong `.lavish-wip/`, ngoài phạm vi một file mà
đợt này được phép chạm.

**Phương án:**

- **(a) Cập nhật 5 neo, thay `+4` bằng `+10` ở đúng 5 dòng đó.** Rẻ, và 5 giá trị đúng đã được
  ghi ở bảng trên nên không cần đo lại. *Nhược điểm:* lần sửa văn xuôi kế tiếp trong M2 sẽ
  lại làm hỏng chúng. Đây là vá, không phải chữa.
- **(b) Đổi `DECISIONS.md` sang trỏ theo tiêu đề/nội dung thay vì theo số dòng**, để lượt sửa
  văn xuôi sau không vô hiệu hoá được chúng nữa. *Nhược điểm:* phải viết lại cơ chế tra
  cứu, và ai đó phải biết tìm mục đó ở đâu.
- **(c) Cả (a) và (b).** *Nhược điểm:* nhiều việc hơn một lượt sửa văn xuôi.

**Khuyến nghị của tôi: (a) ngay, (b) sau.** Nếu chỉ làm một cách thì (a) giữ cho các neo
nói đúng sự thật hôm nay. Nhưng nếu bạn định còn chạy thêm nhiều đợt sửa văn xuôi trên
M2 — mà danh sách cho thấy vẫn còn — thì (b) mới là cách đóng lỗi thật, vì (a) chỉ hoãn
nó. Lưu ý: mục 4 ở trên cũng cần mở đúng file này; nếu bạn gộp hai việc thì chỉ mở một
lần.

---

# Nhóm D — Quyết định thiết kế, không gấp

## 9. Tên package `@oh-my-pi/pi-durable` trong kế hoạch tổ chức lại

**Câu hỏi:** Cắt `blob-broker` ra thành package tên gì?

**Vì sao chặn:** `PACKAGE_REORGANIZATION_PLAN.md` đề xuất cắt `blob-broker` thành
`@oh-my-pi/pi-durable` (dòng 234, 274, 1158, và *Giai đoạn 3* ở dòng 1202), với lý do ghi
ở dòng 281: *"`blob-broker` là ứng viên tốt nhất nếu muốn khớp pi: nó là thứ gần nhất với
`pi/durable`"*. Nhưng phán quyết `durable` đã gọi `pi/durable` là **package chết** — 0
package nào ngoài nó import — và đã loại nó khỏi phạm vi chép. Tên được mượn từ một package
mà repo vừa phân loại là chết sẽ dẫn người đọc sai ngay từ cái tên.

Đây **không phải** câu hỏi về phạm vi chép (phần đó đã chốt: sáu package, 169 file). Nó là câu
hỏi: omp có **nên tạo** một package mang cái tên đó, và cắt `blob-broker` ra có còn đúng là
cắt đầu tiên nên làm không.

**Phương án:**

- **(a) Giữ phần cắt, đổi tên** — ví dụ `@oh-my-pi/pi-storage` — và viết lại lý do thành
  "khớp vai trò lưu trữ/xuất bản của pi" thay vì "khớp `pi/durable`". *Nhược điểm:* đổi tên
  là thay đổi nhìn thấy được, và tên mới cũng là một lựa chọn phải sống với.
- **(b) Giữ tên `pi-durable`, thêm một dòng trỏ về phán quyết** để thừa nhận là trùng tên có
  chủ ý. *Nhược điểm:* một tên gợi ý sai vẫn tồn tại, chỉ được chú thích.
- **(c) Bỏ hẳn lý do "khớp `pi/durable`"**, biện minh việc cắt `blob-broker` bằng số đo của
  chính nó: 27 file, 8.944 dòng, 18 nơi import, 3 vòng. *Nhược điểm:* mất cơ sở để so sánh với
  pi, tức mất luôn lý do vì sao **vị trí** đó hợp với kiến trúc pi.

**Khuyến nghị của tôi: (a).** Số đo của `blob-broker` đứng vững không cần đến pi, nên việc cắt
là có cơ sở; nhưng một cái tên mượn từ package chết sẽ dẫn người đọc sai — đúng cái kiểu
hỏng mà `DECISIONS.md` viết ra để chặn. Nếu bạn chưa muốn đụng tên lúc này thì (c) là cách
ít rủi ro nhất: nó giữ nguyên mọi thứ, chỉ bỏ một lý do đã hỏng.

---

## 10. Các số đếm thư mục trong kế hoạch tổ chức lại dùng hai quy ước khác nhau

**Câu hỏi:** Có dành một đợt đo lại toàn bộ số đếm thư mục trong `PACKAGE_REORGANIZATION_PLAN.md`
và thống nhất một quy ước không?

**Vì sao chặn:** Tôi đã đo lại `packages/coding-agent/src/tools/` bằng hai cách:

```
find tools -type f | wc -l                                    # 174 — tất cả file
find tools -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l   # 149 — chỉ .ts/.tsx
```

**Cả 174 và 149 đều đúng** — chúng chỉ khác nhau ở câu hỏi "tính file nào". Vấn đề là file
không bao giờ nói ra mình đang dùng cách nào, và vì vậy hai bảng đã trở thành mâu thuẫn thuần:

| Chỗ | Ghi | Đo lại |
|---|---|---|
| `PACKAGE_REORGANIZATION_PLAN.md:16`, `:101`, `:1227` | `tools` = **149** file | 149 — đúng, và là số **.ts/.tsx** |
| `PACKAGE_REORGANIZATION_PLAN.md:646` (§4.2) | `tools` = **147** file | **147 là số cũ**; nó không khớp 149 lẫn 174 |
| `PACKAGE_REORGANIZATION_PLAN.md:335`, `:448` | `tools` = 147 file / 59.871 dòng | Số dòng ở §1 là 61.718 — đo thật là 61.700 (chỉ .ts/.tsx) |
| `PACKAGE_REORGANIZATION_PLAN.md:650` | `tools/browser` = **50**, `tools/computer` = **7** | 59 và **9** — cả hai cũ |
| `PACKAGE_REORGANIZATION_PLAN.md:650` | `tools/jfind` = 8 | 8 — đúng |
| `PACKAGE_REORGANIZATION_PLAN.md:650` | "84 file nằm ở gốc `tools/`" | 84 — đúng |

Nói cách khác: **149 là con số duy nhất trong bảng trên còn đúng**, và nó đúng theo cách đếm
`.ts/.tsx`. 147, 50 và 7 là số cũ. Số 61.718 thì gần đúng (lệch 18 dòng).

Những số này không phá cổng nghiệm thu (chỉ §4.7/prompts mới dính vào bất biến số file),
nhưng chúng là **cùng loại lỗi** mà danh sách này gồm: một sự thật viết ở một chỗ rồi đọc ở
chỗ khác. Sửa từng cái một sẽ tái tạo đúng cái lỗi mà đợt này vừa dẹp.

**Phương án:**

- **(a) Dành một đợt riêng**, viết quy ước đếm vào đầu file **trước**, rồi mới đo lại và sửa
  toàn bộ. *Nhược điểm:* tốn một lượt nữa, và phải đo lại nhiều thư mục.
- **(b) Chỉ sửa ba số đã lỗi thời** (147 → 149, browser 50 → 59, computer 7 → 9), để lại
  phần còn lại. *Nhược điểm:* không xoá được nguyên nhân, và lượt sau lại phải đoán quy ước cho
  từng số mới.
- **(c) Để nguyên.** *Nhược điểm:* để lại hai số mâu thuẫn trong cùng một file; và §4.7 vừa
  được sửa thành 227 thì số đúng ở một chỗ, số cũ ở chỗ khác lại nổi lên.

**Khuyến nghị của tôi: (a), ở một đợt riêng, và viết quy ước vào file trước tiên.** Chỉ sửa
mâu thuẫn mà không chốt quy ước là sửa triệu chứng — và chính bài học của đợt này là các số
đếm cứ trôi mỗi khi thêm dòng.

---

## 11. Con số "141 đính chính" trong M1

**Câu hỏi:** Con số 141 có phải phản ánh phạm vi hiện hành không?

**Vì sao chặn:** Thực ra câu hỏi này gần như đã tự trả lời trong file, và tôi nêu ra để bạn
không phải đi tìm: `MILESTONE_1_EXECUTION_PLAN.md:3931` viết rõ *"141 đính chính ở mục [Đính
chính so với plan tổng] là những điểm cụ thể mà phần M1 của plan tổng **không còn đúng**"* —
tức nó định nghĩa 141 là **số chênh lệch so với plan gốc**, không phải số việc còn sống. Và
file đã tách số việc còn sống ra riêng: dòng 3887 ghi *"Milestone 1 hoàn thành khi cả **16**
dòng còn trong phạm vi ở trên đều đạt (17 dòng nếu tính hàng ~~W8~~ đã gạch)"*.

Vậy nên câu hỏi thật không phải "141 có đúng không" mà là **"141 có còn là con số người đọc
cần không"**.

**Phương án:**

- **(a) Giữ nguyên 141.** Đúng nghĩa gốc của nó. *Nhược điểm:* con số này không tự kiểm được
  bằng lệnh, và sẽ không bao giờ tự sửa nếu ai đó thêm/xoá một hàng.
- **(b) Đếm lại theo phạm vi hiện hành** (tức bỏ hàng W8 đã gạch) và ghi kèm chú thích phạm vi.
  *Nhược điểm:* phá đúng cái định nghĩa mà dòng 3931 đã viết ra. Sau này sẽ không còn tài
  liệu nào cho biết M1 sai ở 141 chỗ so với plan gốc — mà đó mới là giá trị của bảng.
- **(c) Giữ 141 và thêm một câu ngắn ở dòng 3814** nói rõ đó là số chênh lệch với plan gốc,
  không phải số việc còn lại. *Nhược điểm:* thêm một câu để giải thích một con số mà đã có
  câu giải thích ở dòng 3931.

**Khuyến nghị của tôi: (a).** Mục đó tự nói nó ghi lại "plan gốc đã nói gì và sai ở đâu";
đổi con số sẽ làm sai bản chất của nó, và dòng 3931 cũng đã nói thẳng như vậy. Đây là mục
nhẹ nhất trong 11 mục — nếu bạn không muốn mất thời gian, **bỏ qua mục này cũng được**.

---

# Nếu bạn chỉ kịp chọn một thứ

Theo thứ tự tôi đề xuất, dựa trên cái gì chặn người khác làm việc sai hôm nay:

1. **Mục 1** — bảng điều hướng đang sai. Ai cũng đọc nó trước khi xếp lịch.
2. **Mục 2** — ai đó có thể bắt đầu M4-4 ngay hôm nay mà không biết mình đang vi phạm thứ tự.
3. **Mục 3** — M2 không thể đóng cho tới khi bạn trả lời, và chính file đã dành chỗ cho câu
   trả lời đó.
4. **Mục 4** — sửa lệnh đo sai chiều, vì nó đã lan sang hai bản sao.

Mục 5–8 sửa được trong một đợt văn xuôi. Mục 9–11 không gấp.

---

*Không có mục nào trong file này đã được tôi tự quyết. Mọi phương án đều còn ngỏ cho bạn.*
