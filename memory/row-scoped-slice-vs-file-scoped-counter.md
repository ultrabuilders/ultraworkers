---
name: row-scoped-slice-vs-file-scoped-counter
description: "Comparing a table row's own count against a file-wide matcher counts one error twice and can be guaranteed by the filter that selected it — my 19 'wrong rows' were an artifact, not a finding"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 97521bab-a02d-4d3e-b9b1-715cc07b7e1b
  modified: 2026-10-03T00:00:00.000Z
---

2026-10-03, auditing a 739-row rename disposition table for `hits-imbalance`. A peer had reported
**28 files** carrying at least one wrong `hits` row whose per-file sum still reconciled. I measured
**19**, could not reproduce 28, and spent several rounds isolating the gap before finding that
**my own 19 was structurally incapable of being anything else.**

## The two errors, one compounding the other

**1. I compared a slice to a total.** Each row's `hits` is a *row-scoped partition slice* of that
file's occurrences; `countClass(text, disposition)` is a *file-scoped* count. Verified directly:
`rename`, `keep-wire` and `keep-prose` all returned the **identical** number on the same text
(8/8/8, then 14/14/14) because `classMatcher` gives all three the same `{pinned:true}`.

A textbook row:

```
countRename = 8 · sum(row.hits) = 1 + 7 = 8 · reconciles ✓
  hits=1  keep-wire    countClass=8  → my probe said MISMATCH
  hits=7  keep-prose   countClass=8  → my probe said MISMATCH
```

That is a **correct 1/7 partition**. My probe demanded each slice equal the total, so it declared
a right answer wrong, and counted a single correct split as **two** errors — which is why the
per-row variant returned 29 and the per-file variant 19.

**2. My filter made the finding true by construction.** I kept only files where
`sum(row.hits) == countRename(text)` and then asked which had a mismatching row. For any file that
passes that filter, every row *is* a slice of the total while the matcher returns the total — so a
mismatch is **guaranteed** whenever the file has ≥2 rows in the pinned classes. The metric could not
come back empty.

This is the mirror of [[a-zero-in-a-pre-filtered-population-is-true-by-construction]]: there, a
pre-filter made a zero meaningless; here, a pre-filter made a nonzero meaningless.

## The rule

> **Before comparing a stored count to a computed one, check they answer the same question.**
> If the stored value is a slice of a total and the computed value is the total, the comparison is
> not noisy — it is *always* wrong, and it is wrong in a direction that scales with row count.

If a matcher cannot partition, it cannot validate a partition. "Do these rows overlap?" is then not
a mechanical check at all — it is a review question, and calling it a rule is how an artifact gets
written into a gate.

## What I should have done first

Enumerated **definitions** rather than defending one number. Seven variants yielded
19 / 19 / 203 / 203 / 18 / 29 / 10 — **none** was 28, and the one adjacent to the peer's figure was
my own per-row artifact. Enumerating is cheap and would have surfaced the unit mismatch in one run;
arguing about which of two numbers is right took far longer and produced nothing.

⇒ **When two peers disagree on a count, enumerate the definitions before picking a side.** The
disagreement is usually in the *question*, and both answers are then correct answers to different
questions — or, as here, both wrong to the same one.

Related: [[a-pair-that-measures-identically-cannot-be-evidence]], [[the-tool-under-the-measurement-decides-the-number]],
[[a-right-number-plus-a-wrong-inference-reads-as-measurement]], [[retract-the-wrong-prediction-loudly]],
[[compare-match-ranges-not-match-strings]]
