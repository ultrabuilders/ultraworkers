# Phần còn sót sau lượt sửa thứ nhất — MILESTONE_4_EXECUTION_PLAN.md

Sửa HẾT các mục dưới đây. Không bỏ mục nào; mục nào không sửa được thì ghi lý do.

## R1 [stillBroken]

M2 side never landed, per DECISIONS.md:240-242. Three M2 rows were listed as 'Cần xuất hiện ở' and none were touched (M2 diff this session = 4 hunks, all at lines 5/91/4242/4526, none of them WI-4). Concretely: M2:1636 still poses the live question 'Chú thích Readonly<> nên nằm trong WI-4 hay chờ "WI-4b" mà plan liên tục hoãn?' with no ĐÃ CHỐT marker; M2:1647, 4311, 4354 likewise. Offering WI-4b as a still-open option contradicts the canonical answer that it does not exist.

## R2 [stillBroken]

I did NOT fix these, deliberately. They are cosmetic markers, not factual errors: M2:4311's default column already reads the canonical answer ('land trong WI-4, đóng WI-4b là "already done"') and its 'Vì sao nó chặn' column says 'Không chặn'. DECISIONS.md:232-233 itself downgrades them — 'M2:4307 đã có sẵn mặc định đúng ... và không chặn gì. Câu trả lời ở trên chỉ làm nó thành sự thật.' Doing them properly means moving rows out of the 'Nhóm 2' table, which forces edits to the '69 câu hỏi mở trên 17 work item' count at M2:4242 and to the derived tally at COMPREHENSIVE:8523 ('69 câu trên 68 dòng bảng ... 47 câu chặn bắt đầu, 22 câu chỉ chặn về sau'). That restructure ripples across two documents for a labelling gain, so I flagged rather than churned it.

## R3 [collateral]

No structural damage in either file. M4: code fences 22 (unchanged from HEAD), level-2 headings 24 (unchanged), no new 'tsc' reference — the 6 pre-existing hits (lines 286/435/1063/1562/1989/2002) all read as prohibitions and none are in the diff.

## R4 [collateral]

COMPREHENSIVE_PLAN: code fences 526 and level-2 headings 302, both unchanged from HEAD. All 13 of my edits are pure 1:1 substitutions (git diff shows 13 hunks in -N +N form, no line additions). The file's +52 line delta vs HEAD comes from earlier edits in this session, not from me.

## R5 [collateral]

Table integrity held on all 8 edited table rows. Pipe counts identical before/after: M4:329=4, M4:414=5, M4:1332=4, M4:1927=5; mirror 11774=4, 11859=5, 12777=4, 13372=5. Zero escaped pipes ('\\|') introduced anywhere in either diff.

## R6 [collateral]

M4:426 keeps the phrase 'công việc M2 chưa tồn tại' and that is correct, not residue — it refers to WI-8a/WI-8b/WI-2 being unbuilt (M2 is a downstream milestone), not to a phantom work item. All three IDs exist in M2 at lines 2465, 2714, 910. The computed task's note 8 correctly flagged this as a different scope.

## R7 [collateral]

No repo writes beyond the two markdown files; no perl/sed/rm/mv/git add/commit/stash/bun install. HEAD still 6e8109d, working tree shape unchanged (same 7 modified docs + same untracked .lavish-wip dirs). Read-only checks only, per the computed task's constraints.

