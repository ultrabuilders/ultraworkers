# Phần còn sót sau lượt sửa thứ nhất — MILESTONE_2_EXECUTION_PLAN.md

Sửa HẾT các mục dưới đây. Không bỏ mục nào; mục nào không sửa được thì ghi lý do.

## R1 [stillBroken]

A. MAJOR 6 ONLY HALF-FIXED. READINESS-REPORT.md:298 named TWO defects — the items were 'không nằm trong bất kỳ wave nào **và không có hàng nào trong bảng Định nghĩa hoàn thành**'. Only the wave was added. The Định nghĩa hoàn thành table (:4502-4520) still has exactly 15 rows (WI-0, WI-1, WI-2, WI-3, WI-4, WI-5, WI-6, WI-7, WI-8a, WI-8b, WI-9, WI-10, WI-11, WI-12, WI-13) and no row for WI-SESSION-LOG or WI-PRESTEP-1. Two of the 17 declared work items have no completion criteria anywhere in the plan.

## R2 [stillBroken]

B. NEW CONTRADICTION INTRODUCED BY THIS FIX — '8 wave' is now false. Line 5 was edited to '17 work item' but left 'trong 8 wave'. There are now 9 `### Wave` headings, at lines 81, 91, 95, 107, 119, 133, 143, 155, 169. HEAD had 8. The fix's own Wave 1b insertion is what made the count wrong, and edit 2 touched that very line without noticing.

## R3 [stillBroken]

C. WAVE 1b HAS NO COMPLETION GATE. All eight pre-existing waves share the same four paragraphs: **Bàn giao:**, **Gồm:**, **Cần trước khi bắt đầu:**, **Đúng sau khi nó kết thúc:**. Wave 1b has a single paragraph cramming three of those labels into one line, and has no **Bàn giao:** and no **Đúng sau khi nó kết thúc:**. The wave therefore has no 'done' condition — precisely the gate the plan's own note at :75 insists must be runnable and recorded.

## R4 [stillBroken]

D. THE M4 ORDERING CONSTRAINT IS WRITTEN IN ONE PLACE AND READ IN NONE. Wave 1b asserts '**Không chặn M4** theo thứ tự này, nhưng phải xong trước M4-4'. I searched MILESTONE_4_EXECUTION_PLAN.md with `rg -i 'PRESTEP|SESSION-LOG|session log|durable turn'` — zero hits, exit 1. M4-4 (MILESTONE_4_EXECUTION_PLAN.md:448, 'Ghi trạng thái bền vững và sự thật của bảng settings (sóng B)') never learns it has an M2 predecessor. The fix copied the constraint out of the report verbatim instead of closing the loop — the exact 'ghi ở một chỗ, đọc ở chỗ khác' defect class DECISIONS.md calls out as the most important.

## R5 [stillBroken]

E. PRE-EXISTING, NOT A REGRESSION — the WI-0 row of the Định nghĩa hoàn thành table is malformed. Line 4504 carries only 2 pipes (its third cell, 'Bằng chứng cụ thể', is missing), and that evidence text sits at :4506 outside the table, separated by a blank line and a blockquote. Verified identical at HEAD (:4500 = 2 pipes, :4502 = blockquote). So the table already rendered one row wrong before this fix; the fix did not cause it and did not fix it.

## R6 [stillBroken]

F. MINOR — the decision tables hold 68 data rows, not the 69 the :4242 sentence claims. Pre-existing and untouched by the fix, but the report's claim 3 described it as 'the 69-row open-question table' when the count is 68 (72 pipe-lines minus 2 headers and 2 separators per group). One row may carry two questions; I could not verify which.

## R7 [collateral]

DECISIONS.md (.lavish-wip/applied/DECISIONS.md) line anchors into M2 are now stale by exactly +4 from the 4-line Wave 1b insertion. I verified all five now resolve to their intended content at +4: 1474→1478 (WI-4 heading), 1512→1516 (step 2, the Readonly replacement instruction), 1632→1636 (the "nên nằm trong WI-4 hay chờ WI-4b" question), 4307→4311 (WI-4b decision-table row), 4350→4354 (WI-4 override row). Left unedited — DECISIONS.md is in .lavish-wip/ and outside my permitted file scope.

## R8 [collateral]

Working tree was NOT clean before verification, contrary to the pre-flight expectation: 7 modified markdown files. HEAD matches 6e8109d. MILESTONE_2_EXECUTION_PLAN.md is the only one carrying these 4 edits (7 insertions / 3 deletions); the other 6 (COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE, MILESTONE_1B/1/4/5_EXECUTION_PLAN, PACKAGE_REORGANIZATION_PLAN — 194 insertions / 100 deletions) are from sibling steps in the same run and none of them reference SESSION-LOG or PRESTEP-1. Reporting rather than halting, per instructions.

## R9 [collateral]

DECISIONS.md's four canonical answers (durable / third-package / m5-order / wi-4b) cover none of the newly added M2 content. The 15→17 count change and the new Wave 1b are not governed by any recorded decision, so there is nothing in DECISIONS.md to contradict — but also nothing authorizing the wave count to stay at 8.

