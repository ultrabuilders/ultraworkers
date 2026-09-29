# Phần còn sót sau lượt sửa thứ nhất — PACKAGE_REORGANIZATION_PLAN.md

Sửa HẾT các mục dưới đây. Không bỏ mục nào; mục nào không sửa được thì ghi lý do.

## R1 [stillBroken]

§4.7 `prompts/` (line 693) — heading claims `223 file .md`; true count is 227.

## R2 [stillBroken]

Line 793 — the same stale `prompts/` 223 figure repeated in the ranked-list section.

## R3 [stillBroken]

Root cause proven, not guessed: 223 was correct at ecd516f (initial publish). The upstream sync f804d66 added exactly 4 files to that directory (auto-thinking-solution-space-question.md, length-stop-retry.md, session-agent-notice.md, wait-no-message.md), giving 227. I confirmed all 227 tracked files are .md with no non-md entries, so the two numbers are not reconcilable by a different filter — the figure is simply stale in two places.

## R4 [stillBroken]

Interaction with edit 1 worth flagging: the new invariant (line 51) explicitly names `prompts/` as a directory to measure on every merge commit. That makes the stale 223 reachable by a reader following the new gate. This is exactly the failure mode DECISIONS.md:331-337 describes as the repo's central bug — a late-arriving fact written once and then read elsewhere. Edit 1 did not create the error but is what surfaces it.

## R5 [stillBroken]

Severity: low-to-moderate, and not gate-breaking. The invariant instructs measuring with the command, not copying 223, so a follower still gets the right number. Fixing means changing `223` to `227` at both line 693 and line 793. I did not apply this, per the task's no-edit instruction.

## R6 [collateral]

None. The three edits broke nothing else in the file.

## R7 [collateral]

Minor, not a defect: the §4.6 instruction `Đọc mục này TRƯỚC mục 4.2` is unfulfillable in normal reading order, since §4.6 comes after §4.2 in the document. It is harmless because §4.2 now already carries "KHÔNG xoá — xem mục 4.6", so a reader arriving at 4.2 first is redirected correctly regardless.

## R8 [collateral]

Minor imprecision: the appendix at line 822 says the payloads are loaded by `tools/browser/*` (a plural wildcard), while §4.6 says `đúng một file: tools/browser/launch.ts`. The git grep I ran supports the §4.6 version; the appendix is merely looser, not wrong.

## R9 [collateral]

Explicitly NOT verified: the pre-existing figures `913 pass / 1.445 fail` at line 46. Confirming them would require running the full coding-agent suite, which the missing native addon blocks anyway. I verified only the underlying premise (addon unbuilt), which does hold. This text predates the three fixes and is not part of them.

## R10 [collateral]

Process note: the task text specified `FILE: .../ultraworkers/undefined`, which is a script interpolation bug — no such file exists. I identified the real target by content (the REORG gate, §4.2/§4.6 puppeteer sections) as PACKAGE_REORGANIZATION_PLAN.md. Flagging so the orchestrator can fix the harness.

