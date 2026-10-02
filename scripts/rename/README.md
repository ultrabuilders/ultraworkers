# `scripts/rename/` — rename decision table (W8b)

This directory holds the **disposition table**: one row per (file, decision class)
saying how many occurrences of the legacy token in that file were *decided*, and by
what rule. It exists because a bare `grep` count cannot tell a wire contract from a
stale comment, and a sweep that treats them alike breaks live clients.

| file | what it is |
| --- | --- |
| `disposition.tsv` | the decision table (6 columns, tab-separated, no quoting) |
| `check-disposition.ts` | the gate: re-derives every number and fails on disagreement |
| `check-disposition.test.ts` | fixture-driven tests for the gate's pure logic |
| `check-docs-rename.ts` | W13 — markdown surface, allow-list by path |
| `check-runtime-rename.ts` | W14 — `console.*` output, allow-list by (path, line) |
| `bucket-legacy-token.ts` | measurement only; reports, does not gate |

## The schema

```
scope	path	hits	disposition	reason	keep_refs
```

- **`scope`** — grouping label for the row's origin (`src`, `test`, …).
- **`path`** — repo-relative path. One file may have several rows.
- **`hits`** — occurrences attributed to *this* class. See "The invariant" below.
- **`disposition`** — one of a **closed** vocabulary (below).
- **`reason`** — free text, never empty. This is where ownership goes.
- **`keep_refs`** — required for every `keep-*` row: which contract authorises it.

**No comment lines and no quoting.** A parser that can skip a line is a parser that
can silently skip a decision, so every explanation belongs in `reason` or here.

## The vocabulary is closed

| disposition | means | `keep_refs` |
| --- | --- | --- |
| `rename` | the token is ours to change | — |
| `keep-wire` | a third-party contract; renaming breaks a live client | required |
| `keep-worker-selector` | the hidden argv selector (`__omp_worker_`) | required |
| `keep-path` | an on-disk path (`.omp`) | required |

A `disposition` outside this set is a **gate failure**, not a new class. Adding one
is a reviewed act — see "Open question" below for the one currently pending.

## The invariant

> For every path, the sum of `hits` across its rows equals that file's real
> occurrence count of the pinned expression.

This is what makes the table falsifiable. Without it, a missed `rename` hides under
a `keep-*` row for the same file: the file *has* a row, the gate is satisfied, and
the leftover occurrence rides along under a decision nobody made.

Splitting `hits` **per class rather than per file** is what closes that hole. A file
holding both a wire contract and a stale comment gets two rows, and each is counted
separately.

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

| class | literal | pinned count of `__omp_worker_x` |
| --- | --- | --- |
| `keep-worker-selector` | `__omp_worker_` | **0** |
| `keep-path` | `".omp"` | 0 |

`_` is excluded on both sides of the pinned expression, so the worker-selector class
is genuinely *disjoint* from it — a `keep-worker-selector` row can never be reported
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
`hitPaths(".")` from `check-disposition.ts` (glob `**/*.ts`, skipping
`node_modules/` and `.git/`) returning 706, and the same paths counted against
the gate's `PINNED` expression returning 2072. A standalone scan reproduces the
same pair, so the *scope* is settled.

**2072 is a floor, not a total.** `PINNED` is the expression quoted at line 61,
and it consumes the delimiter it matches: two tokens separated by a single
space, or by one comma, each count as **1** where 2 exist. Rewriting it with a
lookbehind fixes that without widening the scope — the `.` exclusion stays, so
`..` around the token remains 0 in both forms. That is a change to what the
gate *means*, so it is not made here: `PINNED` is a locator and its value is a
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

**Read the 51% before filling in a row.** A `rename` row is *not* automatically a
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
(*stale*), an empty `reason`, a `keep-*` row with no `keep_refs`, or rows whose
`hits` do not sum to the file's real count.

`--stage=post` fails on: a `rename` row that still has occurrences, or a `keep-*` row
that *shrank* — a signed-off contract quietly disappearing is the opposite of what
the row authorised.

A **missing table is a failure, not a pass.** Treating "no table" as "no violations"
would make the gate green precisely when it has nothing to say.

## Approval process

| step | who | what is blocked until it happens |
| --- | --- | --- |
| author writes rows | the implementer | `--stage=pre` cannot go green |
| second reviewer signs | a peer, **not** the author | the sweep does not start |
| sweep runs | the implementer, one file at a time | — |
| `--stage=post` | CI | the work item is not closed |

The gate itself only prints a warning when a second signature is missing; enforcing
that is a people problem, not a code one, and pretending otherwise would make the
gate fail on a tree nobody has reviewed yet.

## Open question — `keep-prose`

386 files carry the token **only** in comments. They currently have no lawful row,
because renaming inside prose is W13's surface and W8b's vocabulary has no class for
"prose we are not touching".

Adding `keep-prose` would let those 386 files be recorded explicitly rather than
silently out of scope. It is a one-word change to a deliberately closed vocabulary,
so it is an owner decision, not an implementer's. Until it is made, `--stage=pre`
reports those files as `missing-row` — which is the honest answer: nobody has decided
them yet.

## Not a test

AGENTS.md bans source-grep *tests* — a test asserting on an implementation file's
text breaks on harmless refactors. This is a corpus scanner wired into `check:ts`,
the same shape as W13's and W14's gates. Its pure logic is covered by fixtures in
`check-disposition.test.ts`.