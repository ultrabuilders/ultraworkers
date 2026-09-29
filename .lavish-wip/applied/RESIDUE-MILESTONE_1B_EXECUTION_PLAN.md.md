# Phần còn sót sau lượt sửa thứ nhất — MILESTONE_1B_EXECUTION_PLAN.md

Sửa HẾT các mục dưới đây. Không bỏ mục nào; mục nào không sửa được thì ghi lý do.

## R1 [stillBroken]

[Nặng — chính là lỗi mà sửa 3 sinh ra để diệt] Dòng 288-291, ngay TRÊN bảng vừa sửa: `Bằng chứng ngay trong bảng: pi-durable mới là package lớn nhất (63 file / 807.033 byte) mà lại đứng thứ năm, còn chord đứng đầu dù nhỏ hơn (62 file / 690.344 byte) — và lý do không phải vì lớn, mà vì pi-durable phụ thuộc nó.` Câu này nói thẳng `Bằng chứng ngay trong bảng` rồi chỉ vào một bảng không còn hàng đó, và gán durable vị trí thứ 5. Tiếp ngay dòng 291: `pi-telemetry là 12 file / 62.831 byte, nhỏ nhất trong bảy, và đứng thứ sáu` — sai cả đếm (7) lẫn thứ tự (telemetry nay là hàng 5). Sửa 3 đã dọn câu ĐỐI LẬP nằm dưới bảng mà bỏ câu đối lập nằm trên bảng.

## R2 [stillBroken]

[Nặng — hứa cả một package ngoài phạm vi] Dòng 194-199, mục *Mục tiêu*: `đợt này mở ra sáu package có thể import từ catalog: @oh-my-pi/chord, @oh-my-pi/pi-protocol, @oh-my-pi/pi-server, @oh-my-pi/pi-client, @oh-my-pi/pi-durable, @oh-my-pi/pi-telemetry.` Từ `sáu` giờ đúng số nhưng SÁCH LẠI: vẫn chứa `pi-durable` và vẫn thiếu `pi-evals` — trái ngược với danh sách sửa 1 vừa sửa. Ngay trên, dòng 194-195 vẫn liệt kê `Một runtime hội thoại/task/tài liệu bền vững (pi-durable): bảng session, tài liệu, checkpoint + migration, fork, ... ba tầng lưu trữ memory / JSONL / SQLite` như một thành phẩm của đợt này. Đây là chỗ đầu tiên người đọc gặp sau mục Điều chỉnh phạm vi.

## R3 [stillBroken]

[Nặng — bản sao y nguyên của câu sửa 5 đã sửa, còn sống] Dòng 1492, mục 4 `client`: `Vị trí trong thứ tự migrate: thứ 4 trong 7, theo thứ tự bắt buộc chord → protocol → server → client → durable → telemetry → evals.` Đây chính là câu mà sửa 5 đã gỡ `durable` ở dòng 1003 — sửa 1 trong 5 bản sao, bỏ sót bản của chính mục client.

## R4 [stillBroken]

[Nặng — 4 tiêu đề mục còn lại, không mục nào được đụng] Dòng 611 (mục 1 chord): `thứ nhất trong bảy package ... durable phụ thuộc nó ... bốn package anh em dùng ngay (pi-server, pi-client, pi-durable, pi-protocol)`. Dòng 1230 (mục 3 server): `thứ 3 trong 7`. Dòng 2162 (mục 6 telemetry): `thứ 6 trong 7, đứng sau durable và trước evals` — sai cả đếm lẫn thứ tự. Dòng 2354 (mục 7 evals): `thứ 7, package cuối cùng`. Tức là 5 mục có câu `Vị trí trong thứ tự migrate` (611, 1003, 1230, 1492, 2162, 2354) thì chỉ 1 cái (1003) được chuẩn hoá còn 6 — thực tế 5 cái sai.

## R5 [stillBroken]

[Nặng — lệnh DoD cho code chết; DECISIONS.md:85 đã yêu cầu mà không làm] Dòng 2788-2792, mục *Những điều chưa được kiểm chứng*. 2788: `Bảy package ở bảng trên chưa vào cây` — bảng ngay phía trên (sau sửa 8+10) chỉ còn 6 hàng. 2790: `Hệ quả không lan sang cả bảy package: ... chord, protocol, client, telemetry, durable chỉ import node builtin + chord + typebox, đều chạy được. Hệ quả: 41 case của server và 4 file của evals chưa có kết quả; 28 case của protocol và toàn bộ test của durable chạy được ngay.` Câu cuối bảo người đọc mong chờ kết quả test của một package không được chép. 2789 và 2792 cũng còn `bảy`.

## R6 [stillBroken]

[Nặng — DECISIONS.md:81 liệt kê đúng dòng này, chưa áp dụng] Dòng 2730: `Lưu ý chung cho cả bảy package: package.json và tsconfig.build.json KHÔNG được chép nguyên văn. Sáu package chép (chord, protocol, server, client, durable, telemetry) mang script tsc` — từ đếm là `bảy`, còn danh sách tên là SÁU cái sai (có durable, thiếu evals). DECISIONS.md:81 yêu cầu `bỏ durable, sửa thành 5 + evals`.

## R7 [stillBroken]

[Trung bình — hàng dependency] Dòng 331, bảng dependency: hàng `shx` vẫn liệt `pi-durable` là người dùng, vẫn nói `là devDependency của sáu package` và `shx rm -rf dist ở sáu package đầu`. Gỡ durable thì tập shx còn 5 (chord, protocol, server, client, evals) + telemetry là ngoại lệ. Không nằm trong 10 sửa đã báo cáo, cũng không có trong DECISIONS.

## R8 [stillBroken]

[Trung bình — số byte của 7 package sót lại trên đúng dòng sửa 1] Dòng 6: `169 file nguồn / 1.934.626 byte, 245 file sẽ chép vào, 516 symbol công khai, 56 va chạm`. 1.934.626 là TỔNG CỦA BẢY package: chord 690.344 + durable 807.033 + evals 133.025 + telemetry 62.831 = 1.693.233, còn lại 241.393 cho protocol+server+client (65 file) — hợp lý. Tổng sáu package phải là **1.127.593**. Dòng này giờ trộn số file của 6 với tổng byte của 7. Lưu ý công bằng: DECISIONS.md chỉ bắt buộc đổi 232→169, chưa bắt buộc tính lại byte — nên đây là sơ suất đã biết hơn là sai sót mới.

## R9 [stillBroken]

[Trung bình — bảng va chạm chưa hề được thu hẹp] Dòng 2728: `Bảng dưới đây ghi nốt các va chạm còn lại giữa bảy package chép từ pi` — nhưng chỉ 6 package được chép, và bảng bên dưới vẫn còn **12 hàng `durable`** (đếm bằng `awk 'NR>=2729 && NR<=2765' | grep -c '^| durable'`). Con số `56 va chạm` ở dòng 6 nhiều khả năng vẫn tính cả durable.

## R10 [stillBroken]

[Trung bình — hàng AGENTS.md tự mâu thuẫn với chính nó] Dòng 2782: sửa 9 đã đổi cột điều kiện sang 6 package, nhưng cột bằng chứng ngay cùng hàng vẫn đếm durable: `private 87 (server) + 66 (durable) + 30 (protocol) + 1 (telemetry); ReturnType< 11 (durable) + 3 (chord) + 1 (client); new Promise( 3 (durable) + 2 (server)`. Cổng grep giờ không thể nào sinh ra các số hạng durable mà bằng chứng của chính nó dẫn.

## R11 [stillBroken]

[Nhẹ — các con số `bảy` còn sót, cùng lớp với sửa 5 nhưng chỉ sai số đếm] Dòng 267 (`không package nào trong bảy package có file LICENSE/NOTICE riêng` — và ngay sau còn bảo tạo `packages/durable/LICENSE`), 342 (`bảy package đều là 0.87.1`), 379 (`kém giá nhất trong bảy`), 325 (`duy nhất của cả bảy package`), 495 (`cổng bun test của cả bảy`), 512 (`cổng chặn GATE 1 của cả bảy`), 992, 1005, 1208, 1216, 1463 (`package này là sau cùng trong bảy package`), 1480 (`Đợt 7 package có tên gọi gì`), 2643, 2772 (`chưa chạy trên cây có bảy package`).

## R12 [stillBroken]

[Không phải lỗi — báo cáo để bạn biết đã soi và loại] Dòng 206 `trong bảy dependency của pi-evals` là bảy DEPENDENCY của evals, không phải bảy package — câu này ĐÚNG, đừng sửa. Dòng 363 (hàng `packages/durable/` trong bảng kiểm kê nguồn) chấp nhận được như tài liệu tham khảo. Dòng 527 và 2620 (`33 câu hỏi mỏ ... trải trên bảy package (chord 6, protocol 1, server 1, client 6, durable 8, ...)`) mô tả nội dung file `m1b-index/questions.json` — file đó thật sự có 7 package — nên sai lệch so với phạm vi nhưng không sai sự thật.

## R13 [collateral]

Không có hư hỏng cấu trúc nào. Code fence vẫn 30 (chẵn, trước và sau giống nhau — diff không thêm fence nào). 24 tiêu đề cấp 2, đủ mục 1-7, không mất mục nào. Bảng *Thứ tự migrate* có 6 pipe mỗi hàng (5 cột) đều đều, kể cả 2 hàng mới đánh lại số. Hàng AGENTS.md dùng brace-expansion `{...}` chứ không phải pipe nên không có rủi ro escape. Blockquote mới ở 304-307 có dòng trống cả trên lẫn dưới nên không bị markdown nuốt vào hàng bảng kế cận.

## R14 [collateral]

Không có `tsc` mới nào được thêm vào: `git diff | grep '^+' | grep -c tsc` = 0. (Các câu nói về `tsc` còn lại trong file là văn xuôi giải thích vì sao KHÔNG được chép script tsc — có sẵn từ trước.)

## R15 [collateral]

Đáng lưu ý: chính sửa 2 và sửa 8/10 đã TẠO RA hai câu trả lời ngược mới. Xoá hàng durable (sửa 2) làm câu `pi-telemetry ... đứng thứ sáu` ở dòng 291 thành sai. Xoá hàng durable khỏi bảng DoD (sửa 8+10) làm câu `Bảy package ở bảng trên` ở dòng 2788 thành sai. Đây không phải hư hỏng của văn xuôi tốt, nhưng là bằng chứng cho thấy lượt sửa dừng giữa chừng và tự sinh mâu thuẫn mới.

## R16 [collateral]

Không sửa gì cả — tôi làm đúng như mệnh lệnh `KHONG sua gi - chi kiem va bao cao`. Cây làm việc không bị chạm vào.

