# Phần còn sót sau lượt sửa thứ nhất — MILESTONE_1_EXECUTION_PLAN.md

Sửa HẾT các mục dưới đây. Không bỏ mục nào; mục nào không sửa được thì ghi lý do.

## R1 [stillBroken]

DÒNG 1587 — nghiêm trọng nhất, vì nằm ngay trong §W8 dưới khối ⛔ vừa chèn 11 dòng: `**Wave:** 3a — Cache economics (ships together with W7, default-OFF).` Đây chính là mệnh đề mà Edit 3 đã xoá khỏi sơ đồ hard-edges, và là bản sao nguyên văn của phần Edit 4 + Edit 5 vừa sửa. Nó mâu thuẫn với 5 nơi khác trong cùng file sau khi sửa: bảng wave 3a (136, chỉ còn W7), dòng 1384 ('W7 ship một mình'), dòng 1538 ('W7 ship một mình'), dòng 1540 (W8 ngoài phạm vi), và chính khối ⛔ ở 1576.

## R2 [stillBroken]

DÒNG 158, 160, 161 — các gạch đầu dòng ngay dưới sơ đồ hard-edges mà Edit 3 vừa sửa vẫn mô tả W8 như đang còn phạm vi, với phụ thuộc còn sống. 160 viết `**W8 đợi W1, W2, W3** ... **và W7** (hard block) **và F6** — mà F6 chưa tồn tại trong repo` — đúng cái vế mà ghi chú italic ở 153-154 vừa tuyên bố là 'không còn đúng'. 158 giải thích vì sao W1 đứng đầu Wave 1 bằng lý do 'Qua W2, W1 còn là nền cho W8'. 161 còn giải thích W8/W2. Ba bullet này nằm ngay dưới sơ đồ không còn vẽ nhánh W8, nên phần 'Đọc hình như sau' hiện đang giải thích một cái cây không tồn tại.

## R3 [stillBroken]

DÒNG 180 — hàng 2 của bảng *Quyết định cần chốt trước khi code* vẫn ghi cột 'Ở đâu' là `W7 (chặn cả W8)`, tức là còn đang đòi một quyết định chặn cho một item đã bị gỡ. Mâu thuẫn trực tiếp với dòng 1538 vừa sửa ('bảng TTL ... giờ chỉ là tiền đề của W7'). Edit 8 đã sửa đúng bảng này nhưng bỏ sót tham chiếu W8 trong hàng 2.

## R4 [stillBroken]

DÒNG 20 — bảng *Thiết lập* ở đầu file vẫn quảng bá `Thiết lập providers.promptCacheRefresh (W8)` như một deliverable, mô tả đủ ba trạng thái `off`/`cost-gated`/`always`. Setting này không tồn tại trong repo (grep `promptCacheRefresh` trong `packages/` không ra ký tự nào) và theo khối ⛔ sẽ không bao giờ có.

## R5 [stillBroken]

DÒNG 3870 — bảng tổng kết cuối file vẫn liệt kê `| **W8** | Vòng refresh prompt-cache có cổng chi phí | TWO PARTS, ...` như một work item còn sống, cột 'đã kiểm chứng' ghi 'có'.

## R6 [stillBroken]

DÒNG 44 — đoạn cắt deadline vẫn tính W8 vào danh sách không-cắt được: 'W1–W6 và W8–W9 thì không.'

## R7 [stillBroken]

DÒNG 430 — phần lý do W1 đứng đầu Wave 1 vẫn viết `**W8** — cache warmer đăng ký một disposer lúc teardown session; ... một request đang bay bị rò`, tức là vẫn dùng W8 làm chứng cứ cho phụ thuộc đó.

## R8 [stillBroken]

DÒNG 577 — trường phụ thuộc của một work item vẫn ghi `- \`blocks\`: W8, W12.`; dòng 813 vẫn ghi `- W8 (Wave 3a) — plan yêu cầu toàn bộ công việc biên giới collab phải land trong một lượt review.`

## R9 [stillBroken]

DÒNG 1790 (và 1788-1789, 1805, 1820) — ngay trong §W8, các mục *Phụ thuộc*/*Rủi ro* vẫn khẳng định là hiện hành: '**W7 — CHẶN CỨNG.**', '**F6 ... cũng chặn**', 'Cổng đó bọc W7 và W8 cùng nhau'. Khối ⛔ không phủ được các mệnh đề này vì chúng nằm ở mục khác, không phải phần bị gạch chéo.

## R10 [collateral]

REGRESSION do chính Edit 2 — dòng 130 vẫn ghi '7 wave, 17 work item' nhưng bảng *Thứ tự thực hiện* sau khi gỡ W8 chỉ còn 16 item. Đếm bằng máy trên cột Item các hàng 134-141: W1 W2 W3 W4 W5 W6 W7 W9 W10 W11 W12 W13 W14 W15 W16 W17 = 16, và W8 là mục duy nhất vắng. Trước khi sửa, 17 khớp 17; đây là hư hỏng mới do edit gây ra, không phải tàn dư. Cần sửa `17` → `16` ở dòng 130 (hoặc giữ W8 trong bảng với nhãn ngoài phạm vi — nhưng đó là lựa chọn scope khác, không phải việc tôi tự quyết).

