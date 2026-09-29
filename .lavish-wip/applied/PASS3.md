# Việc còn lại sau lượt sửa thứ hai

## A. Recheck: phần CÒN SÓT (verify độc lập, chạy lại lệnh gốc)

### MILESTONE_1B_EXECUTION_PLAN.md

1. DÒNG 300 — bảng *Thứ tự migrate*, hàng `chord`, cột *Vì sao ở đúng chỗ này* vẫn ghi: 'Nền của cả đợt migrate — `durable` phụ thuộc nó, và M1 W1/W2 đã tuyên bố port tay từ chính file này.' Đây đúng là lý do phải xoá mà DECISIONS.md:86 đã liệt kê ('mục 608 còn ghi `durable` phụ thuộc nó → bỏ'). R1 đã dọn câu đối lập nằm TRÊN bảng (dòng 291-294) nhưng bỏ sót ô trong chính hàng đó. Người đọc vẫn được dẫn 'vì durable phụ thuộc nó' cho một package không còn trong phạm vi. Lệnh phát hiện: `awk 'NR==300' MILESTONE_1B_EXECUTION_PLAN.md | grep -c durable` → 1.

2. DÒNG 2631 — phần mở đầu *Bảng quyết định cần bạn chốt* vẫn ghi chuỗi 7 phần tử: 'nhóm B là câu chỉ chặn một bước về sau, theo đúng thứ tự migrate (chord → protocol → server → client → durable → telemetry → evals)'. Đây là Y HỆT chuỗi mà R3 nêu ở dòng 1492 (nay là 1499) — bản sao thứ hai vẫn còn sống, chỉ là chuỗi R3 nói tới đã được sửa. Lệnh phát hiện: `grep -nE 'client → durable' MILESTONE_1B_EXECUTION_PLAN.md` → 2631.

3. DÒNG 2643, 2647, 2659, 2660, 2661, 2662, 2663, 2664 — 8 hàng `durable` trong *Bảng quyết định cần bạn chốt* vẫn được trình bày như câu hỏi MỞ cần người đọc chốt ('Đây là bảng hợp đồng của cả đợt migrate', 'chưa có mặc định — cần bạn quyết'), KHÔNG có nhãn tài liệu tham khảo — trong khi bảng va chạm ngay dưới (dòng 2735) đã được gắn nhãn '**12 hàng `durable` còn nằm trong bảng là tài liệu tham khảo, không phải việc phải làm**'. Nhãn được dán không đều: đúng cái rủi ro DECISIONS.md:307-309 cảnh báo ('người đọc sẽ giữ lại bảng 30 dòng ở mục 5 và làm theo'). Lệnh phát hiện: `awk 'NR>=2632 && NR<=2740' MILESTONE_1B_EXECUTION_PLAN.md | grep -c '^| `durable`'` → 8.

4. DÒNG 2788 — pipe CHƯA escape phá vỡ bảng *Định nghĩa hoàn thành*. Trong ô điều kiện có inline code `grep -rnE 'from "(@?vitest|autoevals)' packages/evals` chứa ký tự `|` thô. Hàng này có 5 pipe, mọi hàng khác trong cùng bảng (2781-2789) có 4 pipe → markdown sẽ tách hàng thành 5 cột thay vì 3. R13 yêu cầu đúng kiểm tra này. Lệnh phát hiện: `awk 'NR==2788' MILESTONE_1B_EXECUTION_PLAN.md | grep -o '|' | wc -l` → 5, so với 4 của các hàng 2781-2787/2789. (Nội dung hàng này không do lượt sửa này thêm — nó chỉ bị đẩy dòng — nhưng nằm trong chính bảng mà lượt sửa này đã thay tiêu đề cột và xoá hàng durable.)

### MILESTONE_2_EXECUTION_PLAN.md

1. R1 [HALF-FIXED, REMAINS] — WI-PRESTEP-1 now has a completion-table row (M2:4525), but WI-SESSION-LOG still has NONE: `awk 'NR>=4510 && NR<=4525' MILESTONE_2_EXECUTION_PLAN.md | grep -c 'WI-SESSION-LOG'` -> 0. Table holds 16 rows vs 17 declared work items. Detection: `grep -c 'WI-SESSION-LOG\|WI-PRESTEP-1' MILESTONE_2_EXECUTION_PLAN.md` returns 8 hits, but restricting to the Định nghĩa hoàn thành table (4510-4525) returns 1 (WI-PRESTEP-1 only). The gap is now declared rather than silent (M2:99 and M2:4527 both say so) and is marked 'Chưa có mặc định — cần bạn quyết' — i.e. it needs the user's ruling, not a text edit.

2. R4 [REMAINS] — THE M4 ORDERING CONSTRAINT IS STILL WRITTEN IN ONE PLACE AND READ IN NONE. Detection (re-ran the residue's exact command): `grep -rniE 'PRESTEP|SESSION-LOG|session log|durable turn' MILESTONE_4_EXECUTION_PLAN.md` -> zero hits, exit 1. Wave 1b at M2:97 still asserts '**Không chặn M4** theo thứ tự này, nhưng phải xong trước M4-4' and M4-4 (MILESTONE_4_EXECUTION_PLAN.md:448) still never learns it has an M2 predecessor. NOT FIXABLE FROM THIS FILE — the closing edit belongs in MILESTONE_4_EXECUTION_PLAN.md, which is outside this dot's permitted file scope.

3. R6 [REMAINS, UNCHANGED] — the decision tables hold 68 data rows, not the 69 claimed. Re-counted precisely: Nhóm 1 (lines 4253-4302) = 46 data rows, Nhóm 2 (lines 4303-4335) = 22 data rows, total 68. Both M2:5 and M2:4248 still say '69 câu hỏi'. Identical to HEAD (measured 68 at HEAD too), so pre-existing and untouched. Detection: count pipe rows in 4253-4335 excluding the 2 header rows and 2 separator rows -> 68.

4. R7 [collateral — STALE, AND NOW MORE STALE THAN REPORTED] — the residue recorded DECISIONS.md's M2 line anchors as stale by +4. They are now uniformly +10, because this fix added 6 more lines above them. Measured: WI-4 heading 1474 -> 1484; step 2 Readonly instruction 1512 -> 1522; the 'nên nằm trong WI-4 hay chờ WI-4b' question 1632 -> 1642; WI-4b decision-table row 4307 -> 4317; WI-4 override row 4350 -> 4360. All five resolve to their intended content at +10. DECISIONS.md itself is unchanged (lives in .lavish-wip/, outside permitted scope).

5. R8 [collateral — HOLDS] — working tree still not clean: 7 modified markdown files at HEAD 6e8109d. MILESTONE_2_EXECUTION_PLAN.md = 21 insertions / 12 deletions, and the 6 siblings' combined diff contains 0 hits for SESSION-LOG or PRESTEP (verified via `git diff -- <6 files> | grep -c 'SESSION-LOG\|PRESTEP'` -> 0), so M2 is confirmed the only file carrying these edits. Sibling line counts have grown since the residue was written: COMPREHENSIVE 198, M1B 136, M1 131, M4 26, M5 2, REORG 41 (354 insertions / 213 deletions across all 7).

6. R9 [collateral — HOLDS] — DECISIONS.md's four canonical answers (durable / third-package / m5-order / wi-4b) still cover none of the added M2 content. The 15->16->17 count change, the new Wave 1b, and the 9-wave total are not governed by any recorded decision, so nothing in DECISIONS.md contradicts them — but nothing authorizes them either.

7. NEW FINDING (network check, not in the residue list) — COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md embeds a verbatim mirror of M2's header and decision-table intro, and was NOT updated with the M2 corrections. M2:5 now says '**17 work item trong 9 wave**' while COMPREHENSIVE:4373 still says '**15 work item trong 8 wave**'; M2:4248 says '69 câu hỏi mở trên **17** work item' while COMPREHENSIVE:8454 still says 'trên **15** work item'. COMPREHENSIVE also has 0 hits for WI-SESSION-LOG / Wave 1b / WI-PRESTEP-1, so it lacks the entire Wave 1b section. This is the same 'written in one place, read in another' defect class DECISIONS.md calls out, living inside the master doc's mirror. Out of this dot's file scope, but it is the live counter-example to the claim that the 8->9 correction closed the loop.

### MILESTONE_4_EXECUTION_PLAN.md

1. LỖI THẬT TRONG FILE NÀY (do chính lượt sửa trước tạo ra, chưa ai sửa): phép thay WI-4b -> WI-4 bằng máy móc đã biến 5 mệnh đề 'đúng' thành 'sai', vì WI-4 ĐÃ nằm trong bảng wave §11 của M2 và đã đặc tả đầy đủ. M4:1157 'WI-4 của M2 phải được viết vào §11 và được thống nhất trước khi mục này mở PR'; M4:1332 'M4-7 không được mở PR trước khi WI-4 được viết vào §11 và thống nhất'; M4:1927 'M4-7 không được mở PR trước khi WI-4 được viết vào §11 và chốt'; M4:278 'WI-4 còn phải được viết và thống nhất trước khi M4-7 mở PR'; M4:1307 'Lưu ý: WI-4 phải được viết và thống nhất trước khi mục này mở PR'. Bằng chứng mâu thuẫn: M2:105 trong bảng wave §11 ghi 'Gồm: WI-1 commit 1 (timers), WI-2, WI-4.'; M2:1484 là heading work item WI-4; M2:1494 là hàng files_touched; M2:1522 là bước 2 với lệnh Readonly đúng câu; M2:1544/1561 là mã kết quả và lỗi TS2542 kỳ vọng; M2:1642 và M2:4317 đã mang nhãn 'ĐÃ CHỐT'. Ở HEAD các câu này nói 'WI-4b ... phải được viết vào §11' và ĐÚNG, vì WI-4b thật sự vắng mặt. Lưu ý: ràng buộc thật vẫn còn nguyên ở M4:379, phần giữa M4:1307 ('Quy tắc thứ tự của plan là M4-7 trước, WI-4 sau'), và đuôi M4:1927 ('trước một WI-4 đã được review'); chỉ vế 'phải được VIẾT [vào §11]' là sai, còn cổng thống nhất/review thì vẫn là cổng thật. Sửa cần câu chữ chuẩn mới về mặt 'đã viết' nên tôi KHÔNG tự sửa.

2. R2 (ngoài phạm vi file này, nhưng chưa hết): các hàng bảng ở MILESTONE_2_EXECUTION_PLAN.md:1653 và :4360 vẫn chưa mang nhãn đã chốt (verdict còn là UNDERSPECIFIED / THIẾU ĐỊNH NGHĨA). Đây là hàng thứ ba trong danh sách 'Cần xuất hiện ở' của DECISIONS.md:242 (dòng 4350, nay dịch thành 4360 do M2 đã được sửa thêm). M2 chưa sửa được vì ngoài phạm vi một file của tôi.

3. R2 tiếp (ngoài phạm vi): hệ quả đếm số chưa được chốt — M2:4248 vẫn ghi '69 câu hỏi mở trên 17 work item' và COMPREHENSIVE:8536 vẫn ghi '69 câu trên 68 dòng bảng ... 47 câu chặn bắt đầu, 22 câu chỉ chặn về sau'. Đây chính là lý do R2 nói phải restructure bảng 'Nhóm 2'. Việc restructure này lan sang hai file khác và chưa ai làm.

4. Gương chậm ở file khác (không làm M4 sai hơn, nhưng đáng báo): COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:5894 vẫn hỏi trực tiếp 'Annotation Readonly<> nên nằm trong WI-4 hay chờ "WI-4b" mà plan liên tục hoãn?' mà KHÔNG có nhãn ĐÃ CHỐT (grep -c 'ĐÃ CHỐT' trên dòng đó = 0), trong khi M2:1642, M2:4317 và toàn bộ M4 đã chốt. COMPREHENSIVE:8523 vẫn mang đáp án chuẩn ('land trong WI-4, đóng WI-4b là already done') nên nhất quán về nội dung, chỉ thiếu nhãn trạng thái. Không sửa vì ngoài phạm vi.

### MILESTONE_5_EXECUTION_PLAN.md

1. R2 — root cause UNFIXED, and it lives outside my one-file mandate. The invalid evidence grep is not in M5 (clean there), but it still exists verbatim in .lavish-wip/applied/DECISIONS.md (7 occurrences of `ultraworkers|APP_NAME|thương hiệu|rebrand`, verdict text at :159-163). I ran that exact grep to prove the defect: the '1 hit' it cites in M3 is line 690 = `cd /Users/tranquangdang21/Projects/ultraworkers`, and M4's '2 hits' are lines 1629-1630 = absolute `.lavish-wip/` paths. The grep matches the NEW brand inside filesystem paths and can never match `oh-my-pi`, the string actually being renamed — a grep that cannot match the subject cannot prove absence of the subject. Not editable by this dot.

2. R5 — STILL PRESENT. COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13475 carries the identical old paragraph verbatim, including '…và là điều kiện tiên quyết thực tế cho M3 và M4, vì cả hai đều giả đì̉m tên thương hiệu đã ổn định.' Repo-wide grep confirms this is now the ONLY remaining copy of the old clause. WORSE than a stale duplicate: M5:3 and COMPREHENSIVE:13475 now state flatly OPPOSITE conclusions about the same dependency edge. Outside the one-file mandate.

3. R6 — STILL PRESENT. COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:311-313 still carries both the mis-targeted grep AND the verdict '**không milestone nào giả định tên thương hiệu**' (wrapped across lines 312-313, which is why a naive single-line grep misses it — I had to search whitespace-flexibly). I reproduced the grep: it does return 1 hit in M3 and 2 in M4 exactly as claimed, but those hits are filesystem paths, so the conclusion does not follow from the evidence. Outside the one-file mandate.

### COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md

1. R5 (partial — new instance not named in the residue): both sites R5 cited (391 and 21753) are fixed, but the same defect class survives at line 18303 — 'Các phát hiện của M5 là omp-only và đã verify trực tiếp trên HEAD `5873776`'. That is a live measurement anchor on a nonexistent commit (`git cat-file -t 5873776` -> fatal: Not a valid object name).

2. R7: the R0 row (line 290) still asserts M1 depends on `R0`, but the chain at line 302 reads `M1 -> M1B -> M2 -> {M3, M4} -> M5 -> M6` with no R0 in it, and nothing else in the file corroborates the dependency. DECISIONS.md explicitly defers this ('việc thêm hai hàng M1B/M7 vào bảng đó ... chưa quyết ở file này'), so it cannot be closed against a canonical answer in this file.

3. R8 + cross-file knot: MILESTONE_2_EXECUTION_PLAN.md has been updated to 9 waves (line 5 says '17 work item trong 9 wave'; there are 9 `### Wave` headings including the newly added Wave 1b), but this master plan still says 8 at line 293 and at line 449 ('(8 sóng)'). Separately, M2 has 17 `## WI-` sections but only 15 in its wave table — WI-SESSION-LOG (line 231) and WI-PRESTEP-1 (line 308) appear in neither the wave table nor the count derivation.

4. R13 (pre-existing, unchanged): line 21770 has 8 unescaped pipes (7 columns) against its table's 5-column header at line 21767. Verified identical at HEAD (line 21703), so it was not introduced by this round — it is the one real table-rendering defect in the file.

5. R15: the R0 row (line 290) still leaves both Wave and Effort cells empty while the M1B row beside it says 'L (chưa ước lượng)'. Two different ways of saying 'not estimated' in one table. Minor.


## B. Sweep cơ học: lỗi còn nguyên trên TOÀN BỘ 10 file

```
KHÔNG sạch — 123 findings across 4 of 7 checks. Checks 1, 2, 4, 5, and the markdown-link half of 7 are CLEAN; three checks have real defects. Nothing was written; `git status` is byte-identical to session start.

Findings: (3) 118 table rows in 8 of 10 files carry more unescaped cells than their delimiter declares, so those rows render with the wrong column count — largest are COMPREHENSIVE L21801 (12 cells vs 5), L7933/L10782 (10 vs 3), L6707 (9 vs 3), M2 L3727 (10 vs 3), M3 L2026 (10 vs 3). Cause is a raw `|` from a shell pipeline or regex typed inside a code span, which GFM does not protect. (6) 4 broken same-file anchors from 2 defects: a partially de-accented slug `#quy-u-c-khi-đ-c` vs the real `quy-ước-khi-đọc` (M4 L286, COMPREHENSIVE L11744), and a link to `§2.0 Ràng buộc pháp lý định hình M3` that has no such heading in any of the 10 files (M3 L24, COMPREHENSIVE L8780). (7) 1 dead document reference: M4 L82 cites `.agents/notes/archived/simplification/2026-08-04-remove-tui-package.md`, but `.agents/` does not exist and has 0 tracked files.
```


Toàn bộ chi tiết sweep (118 hàng bảng, 4 anchor, 1 tài liệu chết) nằm trong phần trả về của agent.
Agent sửa PHẢI TỰ CHẠY LẠI phép đo bảng trên từng file để lấy danh sách dòng.
