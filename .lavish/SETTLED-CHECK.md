# Đã chốt hết chưa? — rà soát 10 tài liệu kế hoạch

**Ngày rà:** 2026-09-29 · **HEAD:** `bf3a2f6` · `git pull` → `Already up to date` · working tree sạch.

---

## (1) Trả lời thẳng

**Chưa. Không tài liệu nào trong 10 tài liệu này chốt trọn vẹn.**

M5 gần chốt nhất. Còn lại thì **8/10 chưa chốt**, và trong đó có 3 mức khác nhau:

- **Chặn thật** — không ai gõ được dòng code đầu tiên, hoặc cổng tự mâu thuẫn với chính nó: M8, M7, M1, M2, M4.
- **Gần chốt, thiếu hình thức** — nội dung tốt nhưng thiếu đơn vị công việc hoặc cổng: M3, M6, REORG, COMPREHENSIVE.

Riêng **M8 là nặng nhất**: nó không có work item nào (0 mục `## W*` trong toàn file), trong khi bảng quyết định của nó tham chiếu W1–W9 và bảng thứ tự ở file tổng bảo M8 có 5 work item. Mở M8 ra và gõ tuần tự là gặp quyết định về W5/W6/W7/W8 mà **không có đặc tả nào cho chúng ở bất kỳ đâu**.

---

## (2) Bảng tổng

| Tài liệu | work item | có điều kiện hoàn thành | cổng không đỏ được | câu hỏi thiếu mặc định | CHỐT? |
|---|---|---|---|---|---|
| **M1** | 36 (thân có 22 mục `## W`) | **10/36** — 16/22 hàng bảng DoD bị cắt bằng `…` | 12, trong đó 4 mâu thuẫn cùng-mục (W18/W22/W21/W10) | 28 | **KHÔNG** |
| **M2** | 25 | 22/25 | 21 | 49/89 | **KHÔNG** |
| **M3** | 15 ⚠️ | 15/15 | 9, đều tự thừa nhận | 28/52 | **KHÔNG** |
| **M4** | 11 ⚠️ | 10/11 | 2 đã công khai + 1 **thiếu hẳn** | 13 + 3 ngoài bảng | **KHÔNG** |
| **M5** | 16 ⚠️ | 16/16 | 2, đều hệ thống ngoài repo | 3 | **GẦN CHỐT** |
| **M6** | 9 | 9/9 | 1 — trỏ sai thư mục | 3 | **KHÔNG** |
| **M7** | 8 | **0/8** | 7, trong đó 2 cổng chết vì cấu trúc | 9 | **KHÔNG** |
| **M8** | 8 ⚠️ (0 mục `## W*`) | 5/8 nhưng 3/7 dòng DoD trỏ phạm vi đã DEFER | 3/5 wave không có cổng | 4/7 | **KHÔNG** |
| **COMPREHENSIVE** | 80 ⚠️ | 80/80 (theo mục `### Xác minh`) | 5 | 116 | **KHÔNG** |
| **PACKAGE_REORG** | 7 (0 mục `## <ID>`) | **0/7** | 5 chính sách, không cổng nào đỏ được | 9 | **KHÔNG** |

⚠️ = số work item trong bản rà soát **tự mâu thuẫn**, xem mục (6).

### Những gì tôi tự đo lại hôm nay (không lấy từ bản rà soát)

| Phép đo | Kết quả | Ý nghĩa |
|---|---|---|
| `packages/natives/native/pi_natives.darwin-arm64.node` | 185 MB, 2026-09-29 08:47 | **Addon đã build** |
| `bun test packages/utils/test/` | **743 pass / 10 skip / 0 fail**, 753 test, 80 file, 15.17s | Mọi claim "bun test bị chặn" là cũ |
| `bun run check:ts` | **exit 0**, tất cả package Done | Mọi claim "check:ts không bao giờ xanh" là cũ |
| Số package có `check:types` | **16 / 16** | Chốt số 16; 12, 14, 15 đều sai |
| Mục `### Phiếu triển khai` | M1=**31**, M2=**25**, M5=**16**, M4=**9**, M3/M6/M7/M8/COMPREHENSIVE/REORG=**0** | Quy ước đã thành hành, 6 file không theo |

---

## (3. Những thứ CHẶN — theo mức độ

### 🔴 Chặn cứng: kỹ sư không gõ được dòng code đầu tiên

1. **M8 không có work item nào.** 0 mục `## W*` trong toàn file, nhưng bảng quyết định tham chiếu W1, W2, W3, W5, W6, W7, W8, W18. Việc thật sự còn lại chỉ là W4/W5/W7/W8/W9.
2. **M8 chưa tự cập nhật sau chính quyết định của nó.** Đoạn 152–153 đã CHỐT "defer containment" và "giữ `yolo`, bỏ W3". Nhưng dòng DoD 172 vẫn đòi *"session mới → resolve ra `write`, không phải `yolo`"* kèm điều kiện "(Chỉ khi quyết định 2 được chốt)". **Cả hai vế đều sai**: quyết định đã đóng, và nội dung khẳng định ngược lại kết quả của chính nó. Ba dòng DoD đầu (sandbox.exec, FileSystemSandboxPolicy read-deny, hai trục độc lập) đều thuộc phần đã hoãn.
3. **M1 — 16/22 hàng bảng Định nghĩa hoàn thành bị cắt bằng `…`**, hàng `evals` của Phần B dừng giữa lệnh grep. Chỉ còn 10/36 work item có ô DoD đọc trọn. Bảng này chính là thứ người đọc tìm để biết "xong khi nào".
4. **M1 — 4 mâu thuẫn cùng-mục** giữa bảng DoD và chính mục Cổng hoàn thành của cùng work item, cả bốn đều đánh dấu cột "Cổng đỏ được?" là **có**: W18 (`grep` + `bun run doctor` — không có script `doctor` nào tồn tại), W22 (cùng loại source-grep), W21 (tiêu chí 4 đòi lọc vào "cả hai đường spawn" mà chính tài liệu nói không tồn tại), W10 (tiêu chí b đòi "đúng sáu file" mà chính mục cổng nói không bao giờ khớp).
5. **M7 — 17 sửa bắt buộc do 3 vòng phản biện trong chính tài liệu đề ra: 0/17 được áp.** Dòng :1097/:1571/:1916 khẳng định ngược lại rằng chúng "đã được đưa vào thân work item". Nặng nhất: `before_agent_start` còn ghi "0 builtin" trong khi :1241 liệt kê 7 và gọi đây là lỗi nặng nhất.
6. **M7 — cổng chết vì cấu trúc, không phải vì hệ thống.** `R2` yêu cầu xác nhận bằng `git log -S`, nhưng toàn bộ `src/` đến từ **một** commit bóp phẳng `ecd516f` → mọi chuỗi đều trả về đúng commit đó. `G-L1-4` đỏ ngay trên cây sạch (25/8/30/25 hit cho 4 tên model). `G-L1-5` và `G7` đòi `NOTICE.md` ở root trong khi W0 B3 **cấm tạo file đó** → kỹ sư làm đúng W8 thì cổng vẫn đỏ.
7. **M4 — GAP-M4-16 có 0 phần đặc tả.** Không mục `##`, không bước, không hợp đồng test, không cổng, không phiếu, không thuộc Wave D, không có trong bảng quyết định — dù bảng đầu file hứa 11 work item.
8. **M4 — mâu thuẫn thứ tự merge** GAP-M4-10 vs GAP-M1-18: dòng 14 nói M1-18 merge trước, còn 5 chỗ khác nói ngược lại. Chọn sai là hỏng cứng vì `omp doctor` không có gì để báo nếu thiếu `LEDGER.md`.
9. **M2 — 37 câu hỏi chặn bắt đầu work item không có mặc định**, gồm toàn bộ 4 câu của WI-0. Chính tài liệu nói nhóm này "không có gì trong CI đỏ".
10. **M1 — 7 work item thuộc phạm vi Phần B không có hàng DoD nào** (WI-ECOSYS-1/2/3, GAP-M1B-1/2/3/5), trong khi câu "Cả đợt migrate xong khi nào" chỉ đòi "cả sáu package".
11. **M6 — cổng của GAP-M6-11 trỏ vào thư mục không tồn tại.** `packages/coding-agent/test/extensions/` — thật là `test/extensibility/`. Đỏ vĩnh viễn vì lý do sai, không phân biệt được "làm đúng" với "chưa làm". Lại là item phụ thuộc cứng nhất (M3 Sóng 4 + M7 Sóng 0b).

### 🟠 Chặn về hình thức: nội dung có, cấu trúc để gõ thì không

12. **REORG — 0 mục `## <ID>` trong toàn file.** 7 "giai đoạn" đều là hành động, không phải trạng thái phán đoán được. Điều kiện hoàn thành là "chạy 1 lần `bun check`". Cổng test coding-agent **không có ngưỡng** — khi bộ test đã xanh thì mọi số fail mới đều biện minh được là "không tệ hơn baseline". Đây là cổng luôn xanh theo nghĩa đen.
13. **REORG — `ai/src/auth` bị ra lệnh ngược chiều.** 3 chỗ cấm cắt (dòng 304, 1112, 1255) vs 3 chỗ bắt cắt với ưu tiên cao nhất (dòng 934, 961, 1075). §3.1 không nhắc `pi/ai/src/auth/` đã tồn tại — đó mới là lý do cả 3 mục kia viện dẫn. Kỹ sư đọc tuần tự sẽ làm đúng cái bị cấm.
14. **REORG — cùng một định nghĩa, hai số khác nhau ở 29 thư mục** (§1 dòng 103-145 vs §1.2 dòng 378-408): `config` 949 vs 56, `session` 769 vs 44, `tools` 444 vs 37, `capability` 136 vs 74, `web` 66 vs 9. **Toàn bộ phân loại Nhóm A/B/C và ngưỡng ">200 = xương sống" dựa trên cột nào** — tài liệu không nói.
15. **COMPREHENSIVE — §ĐIỀU KIỆN MÔI TRƯỜNG (dòng 244–258) nói sai hiện trạng.** Khẳng định `bun test` báo 0 pass kèm `Failed to load pi_natives` và lệnh build "chưa được xác minh". Tôi đo lại: addon 185 MB có mặt, `bun test packages/utils/test/` = 743 pass / 0 fail. Mục này được dẫn *"Đọc mục này trước khi chạy bất kỳ lệnh nào"* — người đọc tuần tự sẽ tin sai ngay từ đầu.
16. **M3 — 0 Phiếu triển khai trong toàn file**, dù có 16 mục `Cổng hoàn thành`. Đây là plan lớn thứ hai trong repo mà thiếu hoàn toàn.
17. **M6, M7, M8 — cùng tình trạng 0 Phiếu triển khai.**

### 🟡 Chặn lớp điều phối (bảng thứ tự, số đếm, chỗ trỏ file)

18. **`ordering_coherent = FALSE`.** Hàng M5 trong bảng thứ tự ghi "Phụ thuộc: M1–M4", còn `MILESTONE_5:3` nói thẳng nó "chỉ phụ thuộc cứng M2" và "KHÔNG phải tiền đề của M3 hay M4" — và văn xuôi của chính file tổng ủng hộ M5. Tức ô trong bảng sai so với cả hai.
19. **Số đếm trong bảng tổng hỏng:** 99 work item / 46 wave, trong khi bảng Thống kê toàn cục ngay trên đó ghi 83 / 36. M2 15/8 vs 25/11; M3 16/6 vs 22/6; M8 5/4 vs 8 mục còn sống.
20. **Neo `file:line` giữa các tài liệu markdown đã trôi ở 6/7 chỗ kiểm được** — đúng quy ước mà file tổng tuyên bố là gánh trọng ("Nếu một file:line lệch, tài liệu này hỏng"). Sai: M6:1282→1293, M6:726→729, M2:3849→3970, M6:1412→1398, M1:3730→5806 (lệch 2076 dòng), M1:1864→1877. Neo mã nguồn thì vẫn đúng.
21. **M1B là file không tồn tại nhưng vẫn được tính là tài liệu sống:** `MILESTONE_8:9` liệt kê "M1, M1B, M2–M7 + plan tổng" — tôi kiểm: `MILESTONE_1B_EXECUTION_PLAN.md` **không có trên đĩa**. M1 thì xử lý đúng (14 tham chiếu, đều ghi chú là đã gộp — `M1:7212` nói rõ neo cũ giờ trỏ vào chính M1), nhưng M8 vẫn đếm nó. Danh sách đó cũng tự đếm ra 9 mục chứ không phải 10.
22. **214 năng lực thiếu không xuất hiện trong bất kỳ plan nào** (trong tổng 249 năng lực "thiếu" của 810). Nặng nhất: **orchestration multi-agent** — 29 file `src/task/*` đã ship, 0 work item phát triển chúng; "M9" chỉ nằm trong chính file G1 đề xuất. Cùng loại: trust, containment sau khi defer, secret store, SSRF guard, write-ahead crash recovery, checkpoint/rewind, VCS (~12.5K dòng Rust, 0 work item), cross-session memory, cron, chiến lược compaction.

---

## (4. Chưa chốt nhưng KHÔNG chặn — cần biết để không phí công

Những thứ dưới đây là **tồn**, không phải **cản**. Đọc tuần tự vẫn gõ được.

- **Cổng không đỏ được nhưng đã tự thừa nhận** — đây là loại tốt, chấp nhận được: M3 B1 (tự ghi "đừng tính nó là bằng chứng B1 đã làm việc"), chân (4) Sóng 5 ("hàng rào bảo trì, không phải cổng"), ctx1 chân (3), P0/P1 Sóng 1; M2 WI-10/WI-11/WI-12 (quyết định bằng văn bản, không CI nào canh); M4 GAP-M4-15 cổng (5); M6 điều kiện C (layout M3, giờ đã có câu trả lời trong bảng quyết định).
- **Cổng phụ thuộc hệ thống ngoài repo** — hợp lệ: M5 W12 (codesign, cần Apple identity), M5 W13p (pytest cần `uv venv`), M3 probe reduced-motion (cần terminal có tín hiệu), M8 wave 0 (sign-off sản phẩm bằng văn bản).
- **Cổng chỉ đỏ được bằng con người** — M3 GAP-M3-B7(d), B9(c) (tự ghi *"Đừng viết một test `not.toThrow()` cho nó"*), GAP-M3-B6; M2 WI-10/12.
- **28 + 11 câu hỏi mở ở M1, 28 ở M3, 4 ở M8, 3 ở M5** — tài liệu tự quy ước điền "chưa có mặc định — cần bạn quyết" thay vì bịa. Đây là **hành vi đúng**; chỉ chặn nếu nó nằm trên đường găng của wave đầu.
- **Thiếu Phiếu triển khai ở M3/M6/M7/M8/REORG** — chặn *hình thức*, không chặn *đọc*. Nội dung vẫn đủ để hiểu; chỉ thiếu bằng chứng "đã kiểm trên cây".
- **M1 — W8 và mục 5 `durable` không có phiếu** — chấp nhận được: W8 đã gạch ngoài phạm vi, `durable` tự khai là tài liệu tham khảo.
- **M2 — WI-20/WI-21 không có hàng DoD** — tài liệu tuyên bố **cố ý** vì ở wave 9, enforcement M–L nằm ngoài M2. Lý do hệ thống, chấp nhận được.
- **M1 — nhóm "bun test bị chặn" ở W3/W10/W15/W16 đã được đính chính đúng**, kèm số đo thật. Phần này của tài liệu lành. Vấn đề chỉ nằm ở `:108` và `:833`.

---

## (5) Phần chưa ai kiểm — bản rà soát này KHÔNG đủ sức kết luận

1. **Chất lượng thiết kế có đúng không.** Rà soát này chỉ kiểm *cấu trúc tài liệu* (cổng đỏ được không, điều kiện hoàn thành có đọc được không, số có khớp không). **Không ai đã đánh giá liệu các quyết định kỹ thuật trong đó là đúng.** Đây là khoảng trống lớn nhất.
2. **249 năng lực "thiếu" — chỉ 35 được trích ở đâu đó.** 214 năng lực còn lại tôi chỉ xác nhận là *không xuất hiện trong text plan*, chưa kiểm tra `.lavish-wip/refaudit/` xem có phải chúng đã được phân loại ở đó không.
3. **Các cổng ghi "không đỏ được" vì lý do hệ thống — chưa thử chạy.** Không có máy Windows, không có Apple identity, không có container, không có `uv`. Các cổng đó **không nên bị tính là đã kiểm chứng theo chiều nào cả** — kể cả chiều "không đỏ được".
4. **Cổng dạng source-grep.** Nhiều cổng vi phạm chính luật của `AGENTS.md` mà cấm source-grep (`grep -c 'name: "doctor"'`, `grep -c 'name: "session"'`, `grep -c 'shadowingSource'`). Tôi **không** chạy chúng để xác nhận đỏ/đỏ-sai — chỉ đọc. Cần một vòng riêng để đề xuất thay bằng assert hành vi.
5. **Compile/type-check có pass thật không sau khi sửa tài liệu.** Khi vá lại các điều kiện hoàn thành, một số có thể phát sinh mâu thuẫn mới với bản gốc. Chưa có vòng nào kiểm điều đó.
6. **Đường dẫn trong `.lavish-wip/`.** Input dẫn `.lavish/applied/DECISIONS-RESOLVED.md` nhưng đường dẫn đó không tồn tại; file thật ở `.lavish-wip/applied/`. Tôi **không** mở `.lavish-wip/` để rà — phạm vi ngoài yêu cầu.
7. **`MILESTONE_1B` residue.** Có hồ sơ residue cho một file không còn tồn tại. Chưa kiểm hồ sơ đó còn được tham chiếu ở đâu.

---

## (6) Chỗ dữ liệu đầu vào tự mâu thuẫn — không tự chọn

Theo yêu cầu, tôi **ghi ra mâu thuẫn thay vì chọn một số**:

| Vấn đề | Các số đang cạnh tranh |
|---|---|
| **Số work item M3** | **15** (bản rà M3) · **22** — "A1–A9, B1–B9, C2, D1–D3" (bản rà COMPREHENSIVE) · **16** — "16 work item gốc" (cùng file M3) · **7** — "7 seam, không phải 22 work item" (cùng file M3). Bốn số trong một tài liệu. |
| **Số work item M1** | **36** (bản rà M1) · **22** mục `## W` thực sự có trong file · **21** — "8 wave, 21 work item" (file tổng dòng 579) · **"10 trên 21"** (dòng 480). Tài liệu không nói cái nào là cái nào. |
| **Số work item M5** | **16** (đếm tay, khớp "tổng n_files của 16 work item") vs **12** — "M5 đã có 12 work item; thêm 5 cái nữa làm mất khả năng đọc" (bảng quyết định M7, lặp lại ở 2 chỗ). |
| **Tổng work item** | **80** (bản rà COMPREHENSIVE) · **83** (bảng Thống kê toàn cục dòng 275) · **88** (đếm tay theo mục H2). Chênh 5 — bằng đúng số WI-A..WI-E chưa được gộp. |
| **Số work item M2** | **25** (bản rà M2) vs **15** (bảng thứ tự file tổng đếm M2). |
| **Số work item M4** | **11** ("4 gốc + 7 GAP") vs **10** ("nay có 10 work item thay vì 4") vs **"sáu mục"** — ngay trong cùng một bảng đầu file. |
| **Cụm "Bị chặn cho tới khi có native addon"** | Input ghi **8 lần** ở M2; tôi đếm được **9**. Báo cáo dùng số đo của tôi. |
| **Số file test `tui` chạy được** | M3 dòng 1312: "205/222 chết, chỉ **17** file thuần chạy" (222−205=17) vs dòng 3254/3173: "mouse.test.ts là file tui chạy được **duy nhất**". 17 ≠ 1, và "149 pass" ngay cạnh chứng minh con số "duy nhất" sai. |
| **Số package tại cùng HEAD** | **12** (bảng thống kê) · **14** (M1 sau đợt đo 29/09) · **15** (M3:2202) · **16** (M3:278, M2 nhiều chỗ, và **đo thật hôm nay = 16, cả 16 đều có `check:types`**). File tổng có hàng đính chính chuyên xử lý đúng lớp lỗi này (12↔16) nhưng bỏ sót 15. |
| **Số tài liệu kế hoạch** | **8** (thực tế: 8 file `MILESTONE_*` + 1 `COMPREHENSIVE`) vs **"bảy"** (file tổng dòng 303) vs **"10"** (M2:261 và M8:9, danh sách tự đếm ra 9 mục và tính M1B là file riêng). |

---

## (7) Nếu chỉ làm 3 việc

Xếp theo tỉ lệ chặn/công sức:

1. **Dựng lại M8.** 0 work item nhưng bảng quyết định tham chiếu 9 mục. Tốn một buổi, gỡ file chặn nặng nhất.
2. **Sửa lớp claim môi trường.** `COMPREHENSIVE:244–258`, `M1:108`, `M1:833`, và 9 chỗ "Bị chặn cho tới khi có native addon" ở M2. Đo thật: addon 185 MB, `check:ts` exit 0, `bun test packages/utils/test/` 743 pass. Đây là sửa **một con số**, không phải sửa thiết kế.
3. **Đóng `ordering_coherent = FALSE` của bảng thứ tự.** Sửa ô M5, rồi đồng bộ số work item giữa bảng thứ tự và bảng thống kê toàn cục.

Còn lại — 4 mâu thuẫn cùng-mục của M1, 17 sửa chưa áp của M7, `ai/src/auth` của REORG, định tạo của GAP-M4-16 — là việc sửa nội dung, cần người quyết chứ không sửa máy được.
