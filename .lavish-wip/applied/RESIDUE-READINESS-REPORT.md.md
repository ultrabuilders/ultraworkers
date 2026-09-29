# Phần còn sót sau lượt sửa thứ nhất — READINESS-REPORT.md

Sửa HẾT các mục dưới đây. Không bỏ mục nào; mục nào không sửa được thì ghi lý do.

## R1 [collateral]

OUT OF SCOPE, applied anyway — MILESTONE_1_EXECUTION_PLAN.md W8 removal is HALF-APPLIED. DECISIONS.md:341-345 says explicitly 'W8 ở M1 … không nằm trong bốn câu hỏi này và tôi quyết ở đây'. The pass added a ⛔ block at :1576-1583, dropped W8 from the 3a row at :136 and from the hard-edges diagram at :147-152, and rewrote the W7 dependency lines at :1384/:1538/:1540. But §W8 survives as a full work item spanning :1574-1830, is still in the *Định nghĩa hoàn thành* table at :3707 and :3709, and ~20 further W8 references are untouched (:20, :40, :44, :158, :160, :161, :180, :215, :430, :577, :813, :1489, :1546, :1782, :1788-1791, :1797, :1805, :1820). The one anchor the ⛔ block cites is correct: the `test ! -e packages/coding-agent/src/session/cache-warmer.ts` gate really is at :1762, and `packages/coding-agent/src/session/cache-warmer.ts` does exist.

## R2 [collateral]

OUT OF SCOPE, applied anyway — the R0/M1B/M7 milestone rows in COMPREHENSIVE:288-296. DECISIONS.md:342-345 defers the navigation-table blocking to a separate decision. The rows added are internally correct and nothing else contradicts them, so this is safe, but it was not authorised by DECISIONS.md.

## R3 [collateral]

OUT OF SCOPE, applied anyway — the SUL-1.0 legal reversal in COMPREHENSIVE:100-104 and :18391-18412, plus a new M6 row in the 'Mức độ: high' correction table (:21761). I verified the citation it makes: COMPREHENSIVE:21762 cites `MILESTONE_6_EXECUTION_PLAN.md:32-46`, and that range does contain the same corrected text. The companion '51 claim' count bump (:280, :376, :388, :432) correctly matches the one added row.

## R4 [collateral]

VERIFIED CORRECT, worth keeping — MILESTONE_2_EXECUTION_PLAN.md's work-item count 15 → 17 (:5, :4242, :4526) and the matching COMPREHENSIVE cells. `grep -c '^## WI-'` returns exactly 17 (WI-SESSION-LOG, WI-PRESTEP-1, WI-0..WI-7, WI-8a, WI-8b, WI-9..WI-13). Not a regression.

## R5 [collateral]

VERIFIED CORRECT, worth keeping — MILESTONE_2_EXECUTION_PLAN.md:91-94 adds 'Wave 1b — Session log và durable turn' covering WI-SESSION-LOG and WI-PRESTEP-1, which is what makes 17 rather than 15.

## R6 [collateral]

OUT OF SCOPE, applied anyway — PACKAGE_REORGANIZATION_PLAN.md gains a 'Bất biến số file' merge invariant (:49-56) and a `tools/puppeteer` correction (:651-653, :675-690) that retracts an earlier '0 file, nên xoá'. The retraction is internally coherent and the two halves agree. Not from DECISIONS.md.

## R7 [collateral]

MINOR — COMPREHENSIVE:13-14 still says M1's 'Không làm gì' section 'hiện ghi `chord`, `durable` và `session-backends` là đã waive'. M1's section was rewritten, so 'hiện ghi' is now describing a state that no longer exists. Reads as historical framing, so low severity.

## R8 [collateral]

MINOR — CROSS_REPO_COMPARISON.md:89 claims the durable fix was already made: 'Đã sửa `MILESTONE_1B_EXECUTION_PLAN.md` mục 5, và đánh dấu lại dòng `src/storage/jsonl/storage.ts` trong bảng chép.' The §5 copy table was not actually marked, so this claim is currently unsupported.

## R9 [collateral]

NOT A DEFECT, checked and cleared — the '(1/7)'…'(7/7)' fractions at M1B:2688-2694 and :2706-2712 are per-package collision counts (chord has 7 collisions, server has 7), not package totals. Similarly '7 file' at :886, 'bảy dependency' at :206/:302, 'bảy mục' at :2517 and 'bảy cái' at :2521 are dependency/collision counts. These correctly stay.

