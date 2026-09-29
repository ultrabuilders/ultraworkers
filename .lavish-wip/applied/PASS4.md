# Lượt 4 — bằng chứng đo ngược chiều (đã kiểm chứng)

## Bằng chứng

M5 dùng lệnh này làm bằng chứng cho phán quyết "M5 không phải tiền đề của M3/M4":

    grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md   # → 1
    grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md   # → 2

Lệnh này CHỈ tìm tên MỚI. Nó KHÔNG BAO GIỜ tìm được chuỗi CŨ `@oh-my-pi/` — đúng thứ đang
được đổi tên. Một lệnh không dò được đối tượng của nó thì không chứng minh được đối tượng đó
vắng mặt. Số 1 và 2 trên đó là bằng chứng rỗng.

## Số đo đúng chiều (đã chạy, HEAD hiện tại)

    grep -c '@oh-my-pi/' MILESTONE_3_EXECUTION_PLAN.md     # 31 DÒNG
    grep -c '@oh-my-pi/' MILESTONE_4_EXECUTION_PLAN.md     # 16 DÒNG

Phân rã — SỐ LẦN XUẤT HIỆN khác SỐ DÒNG, và tài liệu đã trộn hai đơn vị này:

    M3: 44 lượt trên 31 dòng — pi-tui 25, pi-utils 9, pi-agent-core 4, pi-coding-agent 4, pi-natives 2
    M4: 17 lượt trên 16 dòng — pi-natives 7, pi-tui 5, pi-utils 4, pi-coding-agent 1

## Việc phải sửa — 4 chỗ, cùng một câu sai

1. `MILESTONE_5_EXECUTION_PLAN.md:3` — bảng phân rã ghi M3 là `pi-tui 17, pi-utils 6`; đo thật
   là `pi-tui 25, pi-utils 9`. M4 ghi đúng 7/5/4/1 nhưng cộng ra 17 rồi đặt cạnh 16 mà không
   nói rõ 17 là lượt còn 16 là dòng.
2. `MILESTONE_5_EXECUTION_PLAN.md:3` — thay lệnh bằng chứng bằng lệnh đo đúng chiều ở trên.
3. `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:311-313` — vẫn còn nguyên lệnh grep cũ và vế
   "**không milestone nào giả định tên thương hiệu**". Vế này sai theo nghĩa: M3/M4 KHÔNG
   *phụ thuộc cứng* vào M5 (đó là kết luận đúng), nhưng chúng CÓ ghi scope cũ nên chúng *va chạm*
   với đợt đổi tên. Phải phân biệt hai điều đó.
4. `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13475` — vẫn còn nguyên văn câu "…là điều kiện tiên
   quyết thực tế cho M3 và M4, vì cả hai đều giả định tên thương hiệu đã ổn định" — đúng câu
   vừa bị gỡ khỏi M5:3.

Ngoài ra `.lavish-wip/applied/DECISIONS.md` vẫn giữ lệnh gốc sai. Lượt sửa sau sẽ đọc lại
nó và tin. Cần bạn quyết có mở file đó không (xem NEEDS-OWNER-DECISION.md mục 4).

## KẾT LUẬN KHÔNG ĐỔI

M5 không phải tiền đề cứng của M3/M4; tiền đề thật của M5 là M2. Chỉ có phần BẰNG CHỨNG là
hỏng, không phải phần kết luận.
