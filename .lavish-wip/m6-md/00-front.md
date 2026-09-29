# KẾ HOẠCH THỰC THIỆN — MILESTONE 6: BÀI HỌC TỪ CODEX, OPENCODE, GAJAE-CODE

Milestone này **không đề xuất tính năng mới**. Nó làm một việc: kiểm chứng bốn repo tham chiếu
bằng lệnh thật, rồi chỉ ra cái gì đáng mang về và **cái gì không**. Sai lúc học tốn hơn không
học.

Bốn nguồn, đã audit:

| Nguồn | HEAD | Quy mô | Giấy phép | Kết luận một dòng |
|---|---|---|---|---|
| `openai/codex` | `e72da2b` | 758 TS + **4.925 Rust** + 1.429 `.snap` | **Apache-2.0** | Rust-heavy, khác hẳn omp |
| `anomalyco/opencode` | `39021df` | 3.639 TS + 716 TSX, có TUI 39.771 dòng | **MIT** | quyết định layout của M3 |
| `gajae-code` | `5c52314` | 4.459 TS | **MIT** | xem §G0 |
| `claude-code-best/claude-code` | `77a7934` | 2.551 TS + 701 TSX | **KHÔNG CÓ** | đã ở M6 §0 của plan tổng |

## 0. Nguồn thứ tư đã được thêm vào M6: `code-yeongyu/oh-my-openagent`

M6 ban đầu có ba nguồn tham chiếu. `oh-my-openagent` được thêm vào **đây**, không phải vào M3, và lý do
cần nói rõ vì ban đầu nó được đề xuất cho M3:

**Về danh tính.** Repo tên là `oh-my-openagent` nhưng tên thật trong `package.json` là
`oh-my-opencode` v5.0.1 — nó là **plugin cho OpenCode**, không phải hậu duệ hay fork của oh-my-pi. Trong
~49 package, không package nào trùng tên với omp (trừ `utils`). M6 đã lấy bài học từ **OpenCode**, nên
một plugin cho OpenCode thuộc đúng phạm vi đó.

**Về kỹ thuật — 0/17 work item của M3 có tương ứng.** Grep 0 hit trên toàn bộ `.ts`/`.tsx` của repo đó cho
`elicit`, `colorblind|dalton`, `registerStatusLineSegment`, `readCollapsesIntoGroup`, `MEASURED_THRESHOLDS`,
`setWorkingMessage`. Lý do gốc đo được: **repo đó không sở hữu mã nguồn trình bày terminal nào** — phần
tui/sidebar tự viết là 12.053 dòng so với 189.051 dòng của `packages/tui` của omp (gấp 15,7 lần), và TUI
của họ là mua từ npm qua `overrides`. Trong khi toàn bộ 17 work item của M3 nằm trên bề mặt terminal.

**Về pháp lý — không lấy được dòng code nào.** Giấy phép là **SUL-1.0** (Sustainable Use License), không
phải open source. `LICENSE.md:20-22`: *"non-exclusive, royalty-free, worldwide, **non-sublicensable**,
non-transferable"*. `LICENSE.md:24-29`: *"only for your own internal business purposes or for
non-commercial or personal use"*. `LICENSE.md:53-57`: vi phạm thì giấy phép **tự động chấm dứt, và lần
vi phạm thứ hai sau khi khôi phục thì chấm dứt vĩnh viễn**. Với một dự án mục tiêu phát hành MIT công khai,
điều khoản `non-sublicensable` tự nó đã đóng phương án dùng code — không cần tranh luận về "free of charge
có bằng non-commercial không". SUL **không** bảo hộ ý tưởng, nên **đọc để học thì được**.

**Còn sự lộn xộn trong khai báo giấy phép, phải biết trước khi tin bất cứ thứ gì.** `package.json` gốc khai
`"license": "SUL-1.0"`, nhưng 14 package con khai `"MIT"` và **35 package không khai gì**. Trong 14 cái
khai MIT, phần lớn là **binary prebuild của chính dự án SUL** được dán nhãn MIT. Vậy nên: **đừng coi
package nào ở đó là MIT chỉ vì `package.json` của nó ghi vậy.**

**Bảy ý tưởng đáng học sạch** (ý tưởng chung không được bảo hộ bản quyền; **không chép dòng nào**):

1. **Thuật toán cấp phát độ rộng** — hằng số khai trước rồi mới chọn. Đây là câu trả lời trực tiếp cho
   §4.1 của M3, vốn tự cảnh báo thang độ rộng là chỗ dễ sai nhất.
2. **Ngữ pháp status line là túi TOKEN có thứ tự ưu tiên**, không phải một hàm format chuỗi.
3. **Thang động từ**: hàng không được tuyên bố chuyển động trước khi nó thật sự chuyển động.
4. **Hợp đồng phủ định** là cách viết test cho D2: assert sự vắng mặt trên những hàng mà số liệu CÓ.
5. **Biên nhận giao hàng thay vì hàng đợi toast** — câu trả lời cho A7 của M3.
6. **Mọi status surface mới nên có**: event-driven + debounce + latest-wins + timer tiêm vào được để test
   không cần thời gian thật.
7. **Phủ định đáng giá nhất: đừng học cách họ làm tầng model.** Họ hardcode hàng nghìn model-id literal
   trong TypeScript và có **0** provider implementation. Đó là chiều ngược lại luận điểm M2.

Bản audit đầy đủ: `~/Documents/omo-audit/report.md` (2026-09-27, commit `6c9e0aa`).

---

---

## Ranh giới pháp lý — đọc để học, chép dòng nào thì không

Ba repo đầu đều cho phép chép với nghĩa vụ giữ notice (MIT; Apache-2.0 thêm yêu cầu NOTICE và
tuyên bố sửa đổi). Riêng `claude-code-best` **không có `LICENSE`**, `package.json` không khai
`license`, README gõ *"educational and research purposes only. All rights to Claude Code belong to
Anthropic"* — **không phải mã nguồn mở**, không được chép dòng nào.

## Ba câu hỏi mỗi audit phải trả lời bằng số

1. **Nó là gì, đo bằng lệnh** — không mô tả bằng cảm giác.
2. **`omp` đã có tương đương chưa** — kiểm bằng `git grep` trên cây thật. Không đoán, và **không mặc
   định là chưa có**; omp rất lớn và nhiều thứ đã có.
3. **Có đáng mang về không** — kèm kích thước đo được.

## Điều kiện tiên quyết

Các audit dưới đây là **nghiên cứu tĩnh**: đo trên cây nguồn, chưa chạy hành vi. Mọi kết luận
"đáng mang về" là đề xuất, chưa phải cam kết. Xem mục *Những điều chưa được kiểm chứng* ở cuối.

## Thứ tự đọc

1. **`opencode`** — đọc trước. Nó trả lời câu hỏi lớn nhất của M3: một TUI trưởng thành bố cục
   bằng cách nào khi không muốn tự viết layout engine.
2. **`codex`** — phần Rust và snapshot test.
3. **`gajae-code`** — đọc §G0 trước, vì kết luận dẫn đầu quyết định có nên học gì từ đây không.
4. **`claude-code-best`** — đã ở §0 của plan tổng; chỉ đọc nếu bạn định port UI.
