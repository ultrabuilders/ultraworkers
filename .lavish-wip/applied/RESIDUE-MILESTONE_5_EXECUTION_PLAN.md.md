# Phần còn sót sau lượt sửa thứ nhất — MILESTONE_5_EXECUTION_PLAN.md

Sửa HẾT các mục dưới đây. Không bỏ mục nào; mục nào không sửa được thì ghi lý do.

## R1 [stillBroken]

Line 3: the clause 'M3 và M4 không có tham chiếu nào tới thương hiệu' is factually FALSE. M3 has 31 `@oh-my-pi/*` references (34 total `oh-my-pi`: pi-tui x25, pi-utils x9, pi-agent-core x4, pi-coding-agent x4, pi-natives x2); M4 has 16 (19 total: pi-natives x7, pi-tui x5, pi-utils x4, pi-coding-agent x1). M5's own W7 at line 98 renames exactly that string ('npm scope `@oh-my-pi/` → `@ultraworkers/`', across 4118 files / 17212 occurrences), so those references ARE the brand and ARE what M5 changes.

## R2 [stillBroken]

Root cause is upstream in DECISIONS.md:162-163, not in the applied edit. The evidence grep `-E 'ultraworkers|APP_NAME|thương hiệu|rebrand'` tests for the NEW brand name and rebrand vocabulary and never for the OLD brand string `oh-my-pi` that is actually being renamed. A grep that cannot match the subject under rename cannot prove absence of that subject. The ruling is therefore 'written in one place, read in another'.

## R3 [stillBroken]

The correction overcorrected. The original hedged 'điều kiện tiên quyết THỰC TẾ' (de facto) was replaced by an absolute that is provably false, which erases a real coordination concern: M3/M4 hardcode `@oh-my-pi/pi-tui` etc. in their specs and W7 rewrites them, so M3/M4 do interact with the rebrand even though M5 is not their hard prereq.

## R4 [stillBroken]

Net: the CONCLUSION (M5 is not a hard prerequisite for M3/M4) survives and is well-supported by M5:172. Only the stated REASON is wrong. A corrected clause would be something like 'M3 và M4 không giả định tên thương hiệu đã ổn định' (they don't assume the brand is settled) rather than 'không có tham chiếu nào tới thương hiệu' (no reference at all) — the former is defensible, the latter is not.

## R5 [collateral]

COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13462 still carries the IDENTICAL old paragraph verbatim, including the exact sentence just removed from M5:3 ('...và là điều kiện tiên quyết thực tế cho M3 và M4, vì cả hai đều giả định tên thương hiệu đã ổn định.'). The claim was corrected in one copy of the paragraph and left stale in the other — a live 'written in one place, read in another' defect. NOT edited: outside the one-file mandate.

## R6 [collateral]

COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:313 propagates the same false clause and the same mis-targeted grep into the prose verdict: '...trả **1** hit ở M3 (dòng 690, một đường dẫn filesystem) và **2** hit ở M4 (dòng 1629-1630, hai đường dẫn `.lavish-wip/`) — **không milestone nào giả định tên thương hiệu**.' NOT edited: outside the one-file mandate.

## R7 [collateral]

No collateral damage inside MILESTONE_5_EXECUTION_PLAN.md itself: the diff is one prose line, no table rows, no code blocks, no anchors, and no cross-references renumbered (the edit adds no new file:line references).

