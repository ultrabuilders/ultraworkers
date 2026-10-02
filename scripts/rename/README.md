# `scripts/rename/` — rename decision table (W8b)

This directory holds the **disposition table**: one row per (file, decision class)
saying how many occurrences of the legacy token in that file were _decided_, and by
what rule. It exists because a bare `grep` count cannot tell a wire contract from a
stale comment, and a sweep that treats them alike breaks live clients.

| file                        | what it is                                                  |
| --------------------------- | ----------------------------------------------------------- |
| `disposition.tsv`           | the decision table (6 columns, tab-separated, no quoting)   |
| `check-disposition.ts`      | the gate: re-derives every number and fails on disagreement |
| `check-disposition.test.ts` | fixture-driven tests for the gate's pure logic              |
| `check-docs-rename.ts`      | W13 — markdown surface, allow-list by path                  |
| `check-runtime-rename.ts`   | W14 — `console.*` output, allow-list by (path, line)        |
| `bucket-legacy-token.ts`    | measurement only; reports, does not gate                    |

## The schema

```
scope	path	hits	disposition	reason	keep_refs
```

- **`scope`** — grouping label for the row's origin (`src`, `test`, …).
- **`path`** — repo-relative path. One file may have several rows.
- **`hits`** — occurrences attributed to _this_ class. See "The invariant" below.
- **`disposition`** — one of a **closed** vocabulary (below).
- **`reason`** — free text, never empty. This is where ownership goes.
- **`keep_refs`** — required for every `keep-*` row: which contract authorises it.

**No comment lines and no quoting.** A parser that can skip a line is a parser that
can silently skip a decision, so every explanation belongs in `reason` or here.

## The vocabulary is closed

| disposition            | means                                                 | `keep_refs` |
| ---------------------- | ----------------------------------------------------- | ----------- |
| `rename`               | the token is ours to change                           | —           |
| `keep-wire`            | a third-party contract; renaming breaks a live client | required    |
| `keep-worker-selector` | the hidden argv selector (`__omp_worker_`)            | required    |
| `keep-path`            | an on-disk path (`.omp`)                              | required    |
| `keep-prose`           | prose we are not touching: history, fixture labels    | required    |

A `disposition` outside this set is a **gate failure**, not a new class. Adding one
is a reviewed act — see "`keep-prose`, resolved" below for the one that was pending
when this table was written.

## The invariant

> For every path, the sum of `hits` across its rows equals that file's real
> occurrence count of the pinned expression.

This is what makes the table falsifiable. Without it, a missed `rename` hides under
a `keep-*` row for the same file: the file _has_ a row, the gate is satisfied, and
the leftover occurrence rides along under a decision nobody made.

Splitting `hits` **per class rather than per file** closes _that_ hole: a file holding
both a wire contract and a stale comment gets two rows, so neither can hide inside the
other's count.

**It does not close a second one, and the gate cannot see this.** The invariant is a
**sum**, so it constrains the total and says nothing about _which_ class received
_which_ occurrence. A split that is wrong but balances is green. Measured
2026-10-02 on `packages/utils/src/dirs.ts` (6 pinned occurrences, spread 1/1/1/1/2
over lines 75, 83, 84, 137, 138): rows were written as `keep-wire 5` + `rename 1`,
which sums to 6 and passes — while the reasoning recorded alongside those numbers
described a **3/3** split across different lines. Right total, wrong attribution,
nothing red.

So the per-class split buys reviewability, not enforcement. Any `keep-*` row with
`hits > 1` has to be checked **by reading the file**, because that is the only place
the attribution is verified.

### The pinned expression

```
(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)
```

It is a **locator, not a judgement**. Note the deliberate asymmetry, inherited from
the bead: the leading class excludes `.` and `/` (so `pi-omp` and `sub/omp` do not
match) while the trailing class does not exclude `/` (so `"./omp/"` matches its
trailing edge).

Two classes are counted by **literal**, not by this expression, and the reason is
measured rather than assumed:

| class                  | literal         | pinned count of `__omp_worker_x` |
| ---------------------- | --------------- | -------------------------------- |
| `keep-worker-selector` | `__omp_worker_` | **0**                            |
| `keep-path`            | `".omp"`        | 0                                |

`_` is excluded on both sides of the pinned expression, so the worker-selector class
is genuinely _disjoint_ from it — a `keep-worker-selector` row can never be reported
"missing", because its file may have no pinned hits at all.

## Measured on the tree at the time of writing

```
706 files carry the token        2072 occurrences
  1047  prose inside comments    (51%)
  1007  code

318 files have >=1 code occurrence   (164 source + 154 test)
386 files are comment-only
```

DRIFT, corrected 2026-10-02: the file/occurrence totals were `704` / `2054`,
stale by 2 files and 18 occurrences. Measured with the gate's own code path —
`hitPaths(".")` from `check-disposition.ts` returning 706, and the same paths counted
against the gate's `PINNED` expression returning 2072.

**The glob is `**/*.{ts,js,mjs}`, not `*.ts`** — this paragraph used to say `*.ts`,
which is wrong, and it cost a real measurement. A standalone scan written to the text
here matched only TypeScript and came back 3 files and 6 occurrences short, because
`hitPaths` also reads `.js` and `.mjs`. `hitPaths` additionally skips
`EXCLUDED_PREFIXES`, build output, and nested repositories. A scan reproduces the pair
only when it reproduces **those** rules; a scan that merely re-implements the pattern
is measuring a different scope and will disagree for a reason that has nothing to do
with the pattern.

**2072 is a floor, not a total.** `PINNED` is the expression quoted at line 61,
and it consumes the delimiter it matches: two tokens separated by a single
space, or by one comma, each count as **1** where 2 exist. Rewriting it with a
lookbehind fixes that without widening the scope — the `.` exclusion stays, so
`..` around the token remains 0 in both forms. That is a change to what the
gate _means_, so it is not made here: `PINNED` is a locator and its value is a
ratchet baseline. It is written out once, at line 61, on purpose: repeating the
literal here spends the file's allowlist budget on a copy of a claim that can
only drift from the original.

Every number above is therefore a lower bound on its own scope. Quote the scope
and the expression together, never the count alone.

The scope is **not** the whole tree: `\bomp\b` over every tracked file gives
1203 files and 16766 occurrences, and `check-runtime-rename.ts` uses that
different matcher over a different scope. Two numbers both called "occurrences
of the token" is the trap here — quote the scope whenever you quote the count.

The prose/code/comment-only breakdown below is **wrong under the current
matcher, not merely stale**. `PINNED` undercounts every bucket, because the
collision it has on adjacent tokens loses hits wherever tokens sit side by side,
and each bucket's own percentage therefore moves too — "51%" is a ratio of two
low numbers and cannot be trusted to the digit. Only the two totals were
re-measured here. A fresh breakdown must come from a fresh count, and until then
treat these four lines as an indication of shape, not as figures to quote.

**Read the 51% before filling in a row.** A `rename` row is _not_ automatically a
code edit: renaming inside a comment is W13's job, not this table's.

### A row expires when its file moves, and that is not an authoring error

`hits` is a photograph of one file at one commit, so it goes stale without anyone
touching the table. The first row to expire here did so three commits after it was
written, and it was **correct** when it was written:

```
d69fd189d8   7 occurrences   ← the row was authored against this
f28b972eba  10               ← a stale-assertion fix, +29 lines, unrelated to renaming
HEAD        10
```

The author counted correctly and the file then changed underneath the table. The gate
reported `hits-imbalance`, and that is the gate **working**: it is the one check here
that can tell a stale number from a wrong one.

Two consequences, because both look like defects and neither is:

- **A red `hits-imbalance` is not evidence of carelessness.** Run `git log -S` on that
  file before reading the row. If the count moved after the row was authored, the row
  is stale rather than wrong, and the fix is to re-count — not to re-litigate the class.
- **A row can expire with no commit touching the table.** The sweeping commit's diff
  says nothing about it, so this table's diff needs the same reading as the code's.

The same holds for `keep_refs`, and there it is worse, because a stale count at least
disagrees with itself. A ref can name a contract that has since been retired — one row
here froze "the name a user has on their PATH" after the installed binary had already
been renamed, so the ref kept authorising rows on a premise that was no longer true.
Check that the named contract still exists before trusting the row it justifies.

## Two stages, and why one is not enough

```bash
bun scripts/rename/check-disposition.ts --stage=pre    # table is complete & reviewable
bun scripts/rename/check-disposition.ts --stage=post   # the sweep is done
```

Before the sweep, a `rename` row legitimately still has occurrences. After it, 0 is
the only legal value. Running only one stage means half the table is never checked
at the moment it matters.

`--stage=pre` fails on: a hit file with no row, a row for a file with no hits
(_stale_), an empty `reason`, a `keep-*` row with no `keep_refs`, or rows whose
`hits` do not sum to the file's real count.

`--stage=post` fails on: a `rename` row that still has occurrences, or a `keep-*` row
that _shrank_ — a signed-off contract quietly disappearing is the opposite of what
the row authorised.

A **missing table is a failure, not a pass.** Treating "no table" as "no violations"
would make the gate green precisely when it has nothing to say.

## Approval process

| step                  | who                                 | what is blocked until it happens |
| --------------------- | ----------------------------------- | -------------------------------- |
| author writes rows    | the implementer                     | `--stage=pre` cannot go green    |
| second reviewer signs | a peer, **not** the author          | the sweep does not start         |
| sweep runs            | the implementer, one file at a time | —                                |
| `--stage=post`        | CI                                  | the work item is not closed      |

The gate itself only prints a warning when a second signature is missing; enforcing
that is a people problem, not a code one, and pretending otherwise would make the
gate fail on a tree nobody has reviewed yet.

## `keep-prose`, resolved

**This section was wrong for its whole life.** It was written by `0ce7a29826` — the
same commit that added `keep-prose` to `DISPOSITIONS` — and it described the class as
an open question, an owner decision not yet made, and something with no lawful row.
The code has carried the class since that commit; six later commits edited this file
and none corrected the claim. A reader who trusted the prose would conclude that the
class did not exist.

Why it matters more than a stale number: `keep-prose` is what makes the largest group
of files recordable at all. Files carrying the token **only** in comments had no
lawful row while the section said the class was pending, so `--stage=pre` reported
them as `missing-row` — which was the honest answer then, and is a false description
of the gate now.

Measured 2026-10-02 at `15449ede24`, with the gate's own `isCommentLine` rather than a
separate scan: of the 493 files then carrying a hit and holding no row, **348 were
comment-only** (no code occurrence, and neither of the two literal-counted classes).
Those are the files this class exists for, and they are recorded now rather than left
to read as undecided.

Note what the class does **not** say. It does not mean "comments are out of scope":
renaming inside prose is W13's surface, and a comment describing our own behaviour is
a `rename` row. `keep-prose` is for prose that records history, or names a legacy
value as a fixture label — occurrences where a sweep would churn the file without
changing anything it proves.

## Writing a test in this directory

Two costs here are paid at the moment of writing, and both were measured while
landing `epic-wh2q`. They are cheap to avoid and expensive to discover later.

### A control only means something on the gate it was written for

A test's positive control has to be able to come back **non-zero on that specific
gate**. Controls do not transfer between gates, because the gates do not share an
exclusion policy.

The concrete case: `.omp/skills/a.md` is the right control for
`check-disposition` — `.omp/tools/tui.ts` is a tracked file of this repository
with a live hit, so that gate _must_ reach into dot-directories. Copying that
control into `check-docs-rename.test.ts` produced a test that passed for the
wrong reason: `EXCLUDED_PREFIXES` at `check-docs-rename.ts:71` already lists
`.lavish-wip/`, `.lavish/` and `.omp/`, the control returned `[]`, and the
assertion would have been satisfied by a gate that scanned nothing at all.
`bucket-legacy-token` reuses that same `isExcluded`, so it inherited the same
blind spot.

That failure mode is worse than a red test, because it looks like a success.
Before trusting a green, check the control was non-zero _first_.

### Every test added here needs a disposition row, in the same commit

A test under `scripts/rename/` that constructs a legacy token adds an occurrence
to a file the gate scans, so the file's row count goes stale and the gate reports
`hits-imbalance`. The row moves in the **same commit** as the test that moved the
number — not as a follow-up, because by then the count has already been wrong on
someone else's tree, which is how it happened twice in one hour.

### The same rule for this file, which is the one that bites

This README is itself allow-listed at a **pinned** count, so the identical trap
applies in markdown: an edit that quotes the token raises the file above its
budget and `check:docs-rename` goes red — in `bun check`, for the next person,
not for you.

It cost a committed red here. The section above moved the count from 5 to 9 and
the budget still read 6, so `bun check` was failing on the tree before this fix
and the commit that caused it had already landed. Move the budget in the same
commit, and prefer wording that does not need the token at all — the rules above
are all statable without it, and only their _evidence_ needs the literal paths.

## Not a test

AGENTS.md bans source-grep _tests_ — a test asserting on an implementation file's
text breaks on harmless refactors. This is a corpus scanner wired into `check:ts`,
the same shape as W13's and W14's gates. Its pure logic is covered by fixtures in
`check-disposition.test.ts`.
