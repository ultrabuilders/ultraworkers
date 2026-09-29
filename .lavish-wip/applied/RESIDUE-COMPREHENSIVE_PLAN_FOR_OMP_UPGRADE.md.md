# Phần còn sót sau lượt sửa thứ nhất — COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md

Sửa HẾT các mục dưới đây. Không bỏ mục nào; mục nào không sửa được thì ghi lý do.

## R1 [stillBroken]

Fix 6 cites the WRONG FILE for the evidence-gap correction. COMPREHENSIVE:43 says 'Xem `MILESTONE_1B_EXECUTION_PLAN.md:64`', but DECISIONS.md canonical answer says `MILESTONE_1_EXECUTION_PLAN.md:64` (and its placement table marks M1 64-75 'Giữ nguyên — đây là nơi đã điền lỗ hổng'). Verified: MILESTONE_1B_EXECUTION_PLAN.md:64 is 'thông qua **Bun.plugin `onResolve` shim** trong `legacy-pi-compat.ts`' — an unrelated topic. MILESTONE_1_EXECUTION_PLAN.md:64-75 is exactly the 'Cập nhật 2026-09-28 — lỗ hổng này ĐÃ ĐƯỢC ĐIỀN' block. The fix introduced the bad citation.

## R2 [stillBroken]

Internal contradiction the fix half-created: line 42-43 now says the durable 'document' evidence gap 'ĐÃ ĐƯỢC ĐIỀN', but line 522 — the same file, the M1 section — still reads 'không có thay thế nào đã được xác minh, và đây là điểm duy nhất trong milestone không có bằng chứng nào đứng sau ... Nó là một lỗ hổng bằng chứng'. MILESTONE_1_EXECUTION_PLAN.md resolves this by keeping the original paragraph AND appending a '> Cập nhật 2026-09-28 — lỗ hổng này ĐÃ ĐƯỢC ĐIỀN' blockquote (its lines 67-75); COMPREHENSIVE's copy of that paragraph was never given the same blockquote. This is the 'written in one place, read in another' shape DECISIONS.md is built to prevent.

## R3 [stillBroken]

Appendix checkout table was not fixed. Line 22065 (mục *PHỤ LỤC — PROVENANCE*, '### Checkout đã đọc') still reads '| oh-my-pi (đích) | `~/Projects/oh-my-pi` | `5873776` | tất cả |'. Both verified nonexistent. The new warning at lines 358-361 scopes itself to 'Hàng đầu bảng này' and never mentions this duplicate table, so a reader in the appendix gets a broken anchor with no caveat. Fix 2 corrected one of two identical tables.

## R4 [stillBroken]

Three license rows still name the nonexistent target checkout: line 21840 'oh-my-pi (target) — ~/Projects/oh-my-pi', line 21884 'oh-my-pi (~/Projects/oh-my-pi) — the TARGET repo', line 21904 'oh-my-pi (TARGET) — ~/Projects/oh-my-pi'. `ls -d ~/Projects/oh-my-pi` → No such file or directory.

## R5 [stillBroken]

Nonexistent commit 5873776 survives as a live measurement anchor in two places the fixes did not touch: line 391 ('thực ra chưa tồn tại ở HEAD `5873776`') and line 21753 ('Confirmed absent at HEAD 5873776 by three independent checks'). `git cat-file -t 5873776` → 'fatal: Not a valid object name'. This is precisely the defect class fixes 1 and 2 were written to remove.

## R6 [stillBroken]

Fixes 16/17/18 introduce a NEW anchor of the same class they were correcting: the verbatim SUL-1.0 license quote is sourced to '`LICENSE.md` trên HEAD `bc67110e`' (lines 18396, 18404 area and the M6 row at 21761), but there is no oh-my-openagent checkout in ~/Projects, so the quote cannot be re-verified by re-running its measuring command. The SHA is corroborated independently by RESEARCH_FINDINGS_2026-09-28.md:11 ('oh-my-openagent | bc67110e (2026-09-28) | SUL-1.0'), so the value is probably right — but it is unverifiable here, which is what the NGUỒN rule added at 358-361 forbids.

## R7 [stillBroken]

Not covered by DECISIONS.md, so I could not check fixes 7 and 8 against a canonical answer: DECISIONS.md's own Ghi chú explicitly defers 'việc thêm hai hàng M1B/M7 vào bảng đó ... chưa quyết ở file này'. The added R0/M1B/M7 milestone rows are internally consistent (M1B depends on M1; M7 on M1B, M2; chain at line 302 matches the table), but the R0 row asserts M1 depends on R0, which nothing else in the file corroborates.

## R8 [stillBroken]

Unresolved arithmetic, outside this file: COMPREHENSIVE now says M2 has 17 work items (fix 10), matching MILESTONE_2_EXECUTION_PLAN.md:5's own '17 work item trong 8 wave'. But the unique WI ids in M2 are WI-0…WI-13 plus WI-4b, WI-8a, WI-8b = 17 total, and excluding WI-4b (which DECISIONS.md's wi-4b ruling says is absorbed into WI-4 and is not a work item) gives 16; M2's wave table (lines 79-177) lists only 15 (WI-8 is absent, only WI-8a/WI-8b appear). The number 17 is defensible as 'whatever M2 says about itself', but M2's internal 15-vs-16-vs-17 is genuinely inconsistent and is a M2-side problem, not fixable here.

## R9 [collateral]

Diff is exactly 93 insertions / 41 deletions and touches nothing outside the 19 declared fixes — I read the full `git diff -U0`. No unrelated paragraphs were reflowed or dropped.

## R10 [collateral]

Code fences: 526 total (even) — no unclosed fence introduced.

## R11 [collateral]

Column consistency checked programmatically on all six edited tables (package table, milestone order, TOC, *Không làm gì*, *Quyết định cần chốt*, *high* adjustment): zero mismatches. No unescaped pipe in any newly added row.

## R12 [collateral]

No new `tsc` / `npx tsc` invocation. All 8 grep hits are the existing prohibitions; the one apparent exception (line 6385, a `bunx tsc` type-probe) is pre-existing and already carries its own 'không phải một lệnh dành cho người triển khai' caveat.

## R13 [collateral]

Pre-existing, not introduced, left untouched: line 21754 has 6 pipe-delimited columns against its table's 4 (unescaped pipes inside a cell). It predates the fix and is outside the change set, but it is the one real table-rendering defect in the file.

## R14 [collateral]

Ordering nit introduced by fix 5: the struck-through `durable` row (line 37) sits AFTER the '**Tổng** | **169**' row (line 36). A total row should be last, and a 63-file row trailing a 169 total invites the reader to add it back in. Moving the struck row above the total would be cleaner.

## R15 [collateral]

Minor inconsistency introduced by fix 7: the R0 row (line 290) leaves both Wave and Effort cells empty, while the M1B row beside it says 'L (chưa ước lượng)'. Both are defensible; the file now uses two different ways to say 'not estimated'.

## R16 [collateral]

Scope note: the computed task named the file as literally '/Users/tranquangdang21/Projects/ultraworkers/undefined'. I identified the real target by content (the only file containing the master-plan structure, the milestone table, and a 22084-line body matching every cited line number) and verified that identification is unambiguous before proceeding.

## R17 [collateral]

Cross-file observation, outside my scope: MILESTONE_1_EXECUTION_PLAN.md already carries the correct three-row table (chord at :59) and the 'ĐÃ ĐƯỢC ĐIỆN' blockquote (:67-75), so it is consistent. MILESTONE_1B_EXECUTION_PLAN.md:3 and :15-38 also already say 'sáu package' and carry the *Điều chỉnh phạm vi* section that COMPREHENSIVE:37 and :445 point at. Both files are modified in the working tree and are being handled by another workflow, not by me.

