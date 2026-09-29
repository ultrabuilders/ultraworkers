# Quyết định: con số "141 đính chính" trong M1

Trả lời mục 11 của `applied/NEEDS-OWNER-DECISION.md`.

**Mặc định được chọn: sửa `141` thành `22`, và thêm một câu nói rõ mục này chỉ phủ W1–W3.**
Không xoá dòng nào, không đánh số lại, không đụng 21 mục W còn lại.

**Đo trên `~/Projects/ultraworkers` @ `e55bbee`, ngày 2026-09-29.**

---

## Vì sao mục này không còn là câu hỏi "giữ hay đổi con số"

`NEEDS-OWNER-DECISION.md` mục 11 đặt ba phương án, cả ba đều giả định **141 là một số đúng
nhưng không tự kiểm được**. Đo ra thì giả định đó không đúng: **141 không bao giờ đúng ở bất
kỳ commit nào trong lịch sử.** Đây không phải chuyện "con số có còn là con số người đọc cần
không" — đây là một **tuyên bố trọn vẹn sai**, và nó đang được dùng làm giấy chứng nhận rằng
M1 đã được kiểm chứng so với plan gốc.

## Bằng chứng

| câu hỏi | lệnh | kết quả |
|---|---|---|
| Bảng đính chính có bao nhiêu dòng? | `awk 'NR>=4409 && NR<=4461' MILESTONE_1_EXECUTION_PLAN.md \| grep -c "^\| [0-9]"` | **22** |
| Những dòng đó thuộc mục nào? | `grep -E "^### W[0-9]+ —" MILESTONE_1_EXECUTION_PLAN.md` | **W1 (9) + W2 (7) + W3 (6) = 22** |
| M1 có bao nhiêu work item? | `grep -cE "^## W[0-9]+\." MILESTONE_1_EXECUTION_PLAN.md` | **22** (W1–W22) |
| 141 có từng đúng không? | `git show 33d6e33:MILESTONE_1_EXECUTION_PLAN.md \| awk '/^## Đính chính so với plan tổng/,0' \| grep -c "^\| [0-9]"` | **22** — ngay tại commit đầu tiên (`33d6e33`), khi plan còn có 17 mục W. `grep -c "^### W"` = **3**. Con số 141 xuất hiện nguyên văn từ đó và chưa bao giờ khớp. |
| Có gì để đính chính cho W4–W22 không? | `grep -nE "^#+.*\bW[0-9]+" COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | **Có.** Plan gốc có đủ W1–W22 (dòng 639–4616). Vậy W4–W22 **có** chất đính chính, chỉ là chưa ai viết ra. |
| Chính phần mở đầu của mục này nói về W nào? | `sed -n '4418,4422p' … \| grep -oE "W[0-9]+" \| sort -u -V` | **W1…W17** — "13 mục (W3, W4, W5, W6, W7, W9, W10, W11, W12, W13, W15, W16, W17)", 12 mục trích `pi-ref`, 3 mục gọi `bun check`, 5 mục bị gộp môi trường |
| Bảng ngay sau đó phủ W nào? | `grep -E "^### W[0-9]+ —" … \| grep -oE "W[0-9]+"` | **W1, W2, W3** |

**Đọc hai dòng cuối cạnh nhau:** phần mở đầu mô tả đính chính cho **17 mục W**, bảng bên dưới
chỉ có **3**. Mục này không phải "đếm lại theo phạm vi" — nó là **một bảng bị cắt cụt**.

## Ba phương án trong tài liệu nguồn, và vì sao cả ba đều không đúng

- **(a) Giữ nguyên 141.** Bác bỏ. `:4415` viết *"Bảng dưới liệt kê **đủ** 141 đính chính"* — chữ
  "đủ" là một lời hứa trọn vẹn, và nó sai. Tệ hơn: `:4537` dùng chính con số đó để bảo người
  đọc *"Hãy dùng tài liệu này làm nguồn, và coi plan tổng là bản khảo sát ban đầu"*. Người đọc
  tin 141 sẽ tin rằng cả 22 mục W đã được đối chiếu. **19/22 mục (86%) chưa từng được.**
- **(b) Đếm lại theo phạm vi hiện hành, bỏ hàng W8 đã gạch.** Tiền đề hỏng. W8 **không có dòng
  nào** trong bảng đính chính — bỏ W8 ra khỏi phạm vi không làm thay đổi con số. Dưới mọi cách
  đọc, con số là **22**.
- **(c) Giữ 141, thêm câu giải thích ở dòng 3814.** Không đủ. Sai là **con số**, không phải
  chú thích của nó. Thêm câu "141 nghĩa là số chênh lệch" vào một bảng có 22 dòng vẫn là một
  tuyên bố sai, chỉ thêm chữ.

**Lập luận mà tài liệu nguồn dùng để bảo vệ 141 là vòng tròn.** Nó nói `:3931` (nay là
`:4537`) *"đã định nghĩa 141 là số chênh lệch so với plan gốc"*. Đọc `:4537` thật:

> "141 đính chính ở mục [Đính chính so với plan tổng](#đính-chính-so-với-plan-tổng) là những
> điểm cụ thể mà phần M1 của plan tổng **không còn đúng**."

Câu đó **trỏ ngược lại chính cái bảng** để giải thích con số trong bảng. Nó không nói vì sao là
141 chứ không phải 22. Đó không phải là một định nghĩa, đó là một lần lặp lại.

## Mặc định

Sửa đúng hai chỗ trong `MILESTONE_1_EXECUTION_PLAN.md`, thêm một câu phạm vi, **giữ nguyên 22
dòng đính chính và cả ba tiêu đề con W1/W2/W3**:

1. `:4415` — `đủ **141** đính chính` → `đủ **22** đính chính`.
2. `:4537` — `141 đính chính ở mục […]` → `22 đính chính ở mục […]`.
3. Ngay dưới phần mở đầu, thêm một câu: mục này hiện phủ **W1–W3**; W4–W22 **chưa** có bảng
   đính chính, và câu "dùng tài liệu này làm nguồn" ở `:4537` chỉ đúng trong phạm vi W1–W3.

Vì sao đây là mặc định an toàn: nó **không xoá thông tin nào** (22 dòng thật giữ nguyên), **không
đụng bề mặt công khai** (đây là tài liệu kế hoạch nội bộ, không phải API ship), **không đổi hành
vi của bất kỳ mục W nào**, và nó làm tài liệu **bớt nói dối chứ không nói nhiều hơn**. Quan trọng
nhất: nó **nêu khoảng trống** thay vì che nó. Một người đọc sau này phải tự biết rằng W4–W22
chưa được đối chiếu, thay vì tin rằng đã.

## Điều mặc định này KHÔNG làm

Nó **không** đóng khoảng trống thật. Sau khi sửa, M1 vẫn chỉ có 22/141 đính chính (nếu 141 là
con số gốc) cho 3/22 mục W. Việc viết bảng đính chính cho W4–W22 là **việc riêng**, chưa nằm
trong quyết định này. Con số 141 có lẽ là con số dự kiến cho toàn bộ 22 mục — nhưng đó là suy
đoán; cách duy nhất biết nó là viết nốt 19 mục rồi đếm lại.

## Vì sao KHÔNG chặn ai

Mỗi mục W4–W22 tự mang spec đã kiểm chứng riêng — cột `đã kiểm chứng?` với anchor `git grep`
cụ thể (ví dụ W4 ở `:850`: `case "_omp/usage":` tại `:1180`, xác nhận bằng 7 anchor
`#sessions.get`). Con số sai làm hỏng **tuyên bố về độ phủ kiểm chứng**, không làm hỏng **spec
của từng mục**. Người ta vẫn bắt đầu W4, W12 hay W17 hôm nay như bình thường.

Nó chỉ chặn một việc: **ai đó dùng mục này để kết luận rằng M1 đã được đối chiếu với plan gốc
xong rồi.** Đó là một kiểm tra bao phủ, và nó nên bị chặn — nhưng nó không chặn việc làm.

## Blast radius — con số này đã lan ra 6 chỗ

Sửa M1 một mình là **chưa đủ**; bản sao trong plan tổng vẫn sai, và nó còn cộng vào một tổng
đếm toàn cục:

| file | dòng | nội dung |
|---|---|---|
| `MILESTONE_1_EXECUTION_PLAN.md` | 4415 | "đủ **141** đính chính" |
| `MILESTONE_1_EXECUTION_PLAN.md` | 4537 | "**141** đính chính … dùng tài liệu này làm nguồn" |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 4836 | "đủ **141** đính chính" (bản sao nguyên văn) |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 4958 | "**141** đính chính …" (bản sao nguyên văn) |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 354 | "thêm **141** ở M1" |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 265 | "**50** (toàn cục) + **141** ở M1 + **129** ở M2 + **134** ở M3 + **34** ở M4 + **146** ở M5" |

Dòng 265 là **sổ cái tổng**: nó cộng 141 vào một bảng tổng 634 con số. Sửa M1 mà không đụng dòng
265 sẽ để lại một sổ cái không cộng với chính nó. Vì hai file cùng nội dung, sửa cả hai cùng lúc
là rẻ hơn sửa một rồi phát hiện còn cái thứ hai.

## Cách đảo ngược

Sáu chỗ trên. Đổi `22` về lại `141` và xoá câu phạm vi thêm vào. Không có gì khác phải gỡ: mục
đính chính, 22 dòng, ba tiêu đề con và phần "ĐỊNH NGHĨA HOÀN THÀNH" đều không bị đụng. Không có
migrate, không có state, không có code nào đọc con số này.

## Cách kiểm lại

```bash
cd ~/Projects/ultraworkers
# số dòng đính chính thật (kỳ vọng sau khi sửa: con số trong văn bản khớp con số này)
awk '/^## Đính chính so với plan tổng/,/^## ĐỊNH NGHĨA HOÀN THÀNH/' MILESTONE_1_EXECUTION_PLAN.md \
  | grep -c '^| [0-9]'                      # hiện: 22
# mục W thật sự được phủ
grep -E '^### W[0-9]+ —' MILESTONE_1_EXECUTION_PLAN.md   # hiện: W1, W2, W3
# tổng work item trong milestone
grep -cE '^## W[0-9]+\.' MILESTONE_1_EXECUTION_PLAN.md   # hiện: 22
# bản sao trong plan tổng — phải khớp M1
grep -n '141' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md      # hiện: 265, 354, 4836, 4958
```

Lệnh kiểm mạnh nhất không phải `grep '141'` — mà là so **số trong văn bản** với
`grep -c '^| [0-9]'`. Mọi lần thêm/xoá một dòng đính chính sau này, hai số phải bằng nhau. Đó là
thứ mà 141 hiện không làm: nó không tự kiểm được, và 5 commit rồi nó vẫn sai.
