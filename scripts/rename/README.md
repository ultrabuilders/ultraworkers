# `scripts/rename/` — rename decision table (W8b)

This directory holds the **disposition table**: one row per (file, decision class)
saying how many occurrences of the legacy token in that file were _decided_, and by
what rule. It exists because a bare `grep` count cannot tell a wire contract from a
stale comment, and a sweep that treats them alike breaks live clients.

| file                        | what it is                                                   |
| --------------------------- | ------------------------------------------------------------ |
| `disposition.tsv`           | the decision table (6 columns + optional `rules`; see below) |
| `check-disposition.ts`      | the gate: re-derives every number and fails on disagreement  |
| `check-disposition.test.ts` | fixture-driven tests for the gate's pure logic               |
| `check-docs-rename.ts`      | W13 — markdown surface, allow-list by path                   |
| `check-runtime-rename.ts`   | W14 — `console.*` output, allow-list by (path, line)         |
| `bucket-legacy-token.ts`    | measurement only; reports, does not gate                     |

## The schema

```
scope	path	hits	disposition	reason	keep_refs	rules
```

**Both headers parse.** The six-cell header is the base schema; `rules` is a
seventh, optional column. A table written before the column existed still carries
the six-cell header, and rejecting it would fail every row at once — the gate would
report one problem per file for a change that changed no decision.

- **`scope`** — grouping label for the row's origin (`src`, `test`, …).
- **`path`** — repo-relative path. One file may have several rows.
- **`hits`** — occurrences attributed to _this_ class. See "The invariant" below.
- **`disposition`** — one of a **closed** vocabulary (below).
- **`reason`** — free text, never empty. This is where ownership goes.
- **`keep_refs`** — required for every `keep-*` row: which contract authorises it.
- **`rules`** — optional. The `RULES_VERSION` this row's `hits` was measured under,
  or **empty** when the row predates the column. Non-empty it must equal the
  `RULES_VERSION` the checker implements (`2026-10-03.2`); a mismatch is a gate
  failure.

**Why the column exists.** `hits` is a claim about a file, and a claim is only as
good as the rule that produced it. Measured 2026-10-03: `PINNED` had been widened
twice since the table was filled and `countRename` had gained a subtraction, so rows
written under the old rules drifted by +104 and +32 on two files while the code itself
moved −3 and −1. Nothing reported it — `RULES_VERSION` guards the _ratchet's_ ceiling,
which is a different contract from row-to-rule. This column is that contract.

**Optional on purpose.** `""` means "not stated", which is **not** the same as
"wrong". Treating a missing value as drift would redden every existing row at once,
and a gate that floods is a gate that gets switched off rather than fixed.

**No comment lines and no quoting.** A parser that can skip a line is a parser that
can silently skip a decision, so every explanation belongs in `reason` or here.

## The vocabulary is closed

| disposition            | means                                                 | `keep_refs` |
| ---------------------- | ----------------------------------------------------- | ----------- |
| `rename`               | the token is ours to change                           | —           |
| `keep-wire`            | a third-party contract; renaming breaks a live client | required    |
| `keep-worker-selector` | the hidden argv selector (`__omp_worker_`)            | required    |
| `keep-path`            | an on-disk path (`.omp`)                              | required    |
| `keep-filename`        | an installed artifact whose filename is the contract  | required    |
| `keep-prose`           | prose we are not touching: history, fixture labels    | required    |
| `keep-fixture`         | a test literal the test needs in order to fail        | required    |

A `disposition` outside this set is a **gate failure**, not a new class. Adding one
is a reviewed act — see "`keep-prose`, resolved" below for the one that was pending
when this table was written. Two more have been added since, each reviewed the same
way: `keep-filename` for a quoted `omp-…` artifact name that `keep-path` structurally
cannot count, and `keep-fixture` for a literal that is the _input_ to the thing
checking it.

### `keep-fixture` is pinned, and that is the part that bites

`keep-fixture` shares `classMatcher`'s `{ pinned: true }` arm with `rename`,
`keep-wire` and `keep-prose`, so it counts the **whole file's** pinned total — not
just its own occurrences. Two consequences, both load-bearing:

- A file's `keep-fixture` and `rename` rows **cannot be checked against each other**.
  Only their **sum** is checkable, by `hits-imbalance` in the `pre` stage.
- Swapping a fixture row's label for another pinned label changes **nothing the gate
  can see**: all four return the same number. A wrong label here is invisible, which
  is why the `reason` column carries the whole judgement.

`keep-fixture` exists because the honest answer for a test literal is neither
`keep-wire` (no consumer outside the repo constrains it) nor `keep-prose` (the
occurrence is on a code line, not in prose). Writing `keep-wire` would assert an
external consumer that does not exist; writing `keep-prose` would assert the text is
prose when it is a fixture. The `reason` should say which — "renaming inverts a
negative assertion", "the literal is the ratchet's own input", "the detector matches
the old spelling on purpose".

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

**Do not copy it here.** It lives in exactly one place — the `PINNED` constant in
`check-disposition.ts` — and its docblock there is the authoritative description of
what it matches and why. A second copy in this file is a claim that can only drift
from the original, and it already did: the copy below this line was quoted from a
version that `98` has since replaced, so for a while this README documented an
expression the gate no longer used. Read the constant; if it needs explaining, fix
its docblock, which is where the next reader will look.

It is a **locator, not a judgement**, and it carries an `i` flag, so `OMP` and `omp`
are the same token. Every claim below is falsifiable — check it against the constant
rather than trusting this file, which has now been wrong here twice:

| input     | matches | what that shows                                                     |
| --------- | ------- | ------------------------------------------------------------------- |
| `omp`     | yes     | the token itself                                                    |
| `aomp`    | no      | **leading** class is `[^a-zA-Z0-9_-]` — word characters, `_`, `-`   |
| `_omp`    | no      | ditto — the leading `-` in that class is a literal `-`, not a range |
| `.omp`    | **yes** | the leading class does **not** exclude `.`                          |
| `/omp`    | **yes** | the leading class does **not** exclude `/` either                   |
| `omp.foo` | **yes** | **trailing** class is `[^a-zA-Z0-9]` — word characters only         |
| `omp-foo` | **yes** | so `.`, `-` and `/` are all admitted after the token                |
| `omp.sh`  | no      | the `(?![\.\-]sh(?![a-zA-Z0-9]))` lookahead, and nothing else       |
| `omp.shx` | **yes** | that lookahead only covers `.sh` / `.sh-`; `omp-shell` matches too  |

The homepage wire value — which appears in install, join and stream URLs — is kept out
of a rename sweep by that **lookahead**, not by the trailing class. Nothing else in the
expression is doing the work, which is why the two failure modes above matter: a
description claiming the classes exclude `.` and `/` describes an expression that would
miss every path and dotted identifier in the tree.

Two earlier versions of this file were wrong here in opposite directions — one claimed
the trailing class let `/` through, the next claimed the leading class excluded `.` and
`/`. Both were prose about the expression, and prose is what drifts. The table above is
the replacement: each row is one `PINNED.test(...)` call, so the next reader can re-run
it instead of re-reading it.

Two classes are counted by **literal**, not by this expression, and the reason is
measured rather than assumed:

| class                  | literal         | pinned count of `__omp_worker_x` |
| ---------------------- | --------------- | -------------------------------- |
| `keep-worker-selector` | `__omp_worker_` | **0**                            |
| `keep-path`            | `".omp"`        | 0                                |

`_` is excluded on both sides of the pinned expression, so the worker-selector class
is genuinely _disjoint_ from it — a `keep-worker-selector` row can never be reported
"missing", because its file may have no pinned hits at all.

### An occurrence with no row may only be a comment

`missing-row` reports pinned occurrences that no row accounts for. Those read as debt
nobody claimed, and the natural reading is that a sweeper skipped them. Measured
2026-10-03 at `3614eae6f4`, the count fell **108 → 39**, and **69 of the 108 were
comment lines** inside the 48 files that slice renamed.

So most of that population was an **artifact of the comment layer**, not unclaimed
work: the table's author counted code, and the gate counts every pinned occurrence in
the file. Before treating a rowless occurrence as debt, classify it — a comment
mentioning the old name is a documentation obligation, not a contract, and renaming it
retires it without any row ever needing to exist.

## Measured on the tree

Re-measured 2026-10-03 with the gate's own code path — `hitPaths(".")` from
`check-disposition.ts`, and the same paths counted against its `PINNED`:

```
1084 files carry the token       4153 occurrences
```

SUPERSEDED: an earlier version of this section reported `706` / `2072`, and a still
earlier one `704` / `2054`. None of those can be reproduced any more, and the reason
is not that the tree drifted — it is that **the glob grew**. `hitPaths` scans
`**/*.{ts,tsx,js,mjs,rs,py,sh}`; this file used to describe it as
`**/*.{ts,js,mjs}`, which omitted `.tsx`, `.rs`, `.py` and `.sh` entirely. A
standalone scan written to the text here matched only TypeScript and came back short
for exactly that reason. **Quote the glob with the count, or quote neither.**

`hitPaths` additionally skips `EXCLUDED_PREFIXES`, build output, and nested
repositories. A scan reproduces the pair only when it reproduces **those** rules; a
scan that merely re-implements the pattern is measuring a different scope and will
disagree for a reason that has nothing to do with the pattern.

The prose/code/comment-only split is deliberately **absent** here rather than
reproduced. It was wrong before it was stale: `PINNED` undercounts adjacent tokens,
so every bucket and every percentage derived from it moves together, and a percentage
of two low numbers cannot be trusted to the digit. A fresh breakdown must come from a
fresh count that handles the delimiter collision — not from editing these lines.

**4153 is a floor, not a total.** `PINNED` is the `PINNED` constant in
`check-disposition.ts`, and it consumes the delimiter it matches: two tokens
separated by a single space, or by one comma, each count as **1** where 2 exist.
Rewriting it with a lookbehind fixes that without widening the scope — the `.`
exclusion stays, so `..` around the token remains 0 in both forms. That is a
change to what the gate _means_, so it is not made here: `PINNED` is a locator
and its value is a ratchet baseline. It is defined in exactly one place on
purpose; see "The pinned expression" above for why this file does not quote it.

Every number above is therefore a lower bound on its own scope. Quote the scope
and the expression together, never the count alone.

The scope is **not** the whole tree: `\bomp\b` over every tracked file gives
1990 files and 32231 occurrences, and `check-runtime-rename.ts` uses that
different matcher over a different scope. Two numbers both called "occurrences
of the token" is the trap here — quote the scope whenever you quote the count.
(A previous version of this line said `1203` / `16766`; that pair is not
reproducible from the current tree either.)

**Read the shape before filling in a row.** A `rename` row is _not_ automatically a
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

### The sweep expires its own rows, and that one is not stale — it is undeclared

The case above is a row that went stale because _someone else_ moved a file. The
harder case is the row the sweeping commit invalidates **itself**, in the same commit,
with nothing else in the diff to hint at it.

Renaming occurrences lowers the file's real count. `hits` records the count as it was
_before_ the sweep, so every renamed occurrence is undeclared debt the moment the
sweep lands. Measured 2026-10-03 at `3614eae6f4`, by A/B in a worktree pinned at the
slice's exact parent `270e278db9`:

```
                     before   after
hits-imbalance          322     330     +8
rename-incomplete       182     182      0
keep-shrank               4       6     +2
missing-row             501     501      0
```

Read by **path**, not by message string: 16 paths became newly imbalanced (all 16
from that slice), 8 stopped being imbalanced, and 314 were already imbalanced and
only shifted. The real debt is larger than the +8, because a path that was already
unbalanced stays unbalanced — across the whole slice, 36 files over-claim by 144
occurrences and 4 under-claim by 11.

`rename-incomplete` not moving is not evidence the sweep did nothing: that rule fires
per `rename` **row** while any occurrence remains, so removing occurrences only clears
it when a file reaches zero.

Two rules that follow:

- **Correct `hits` in the same commit as the rename.** The table is the only record of
  what was _supposed_ to change; a renamed occurrence with an un-updated row is a
  decision nobody wrote down.
- **Attribute a `hits-imbalance` change to a slice by A/B, not by subtraction.** Two
  numbers read from a shared tree minutes apart carry every other agent's commits in
  between. Pin a worktree at the slice's parent, apply the slice inside it, re-measure.
  Subtracting "before" from "after" on the live tree is what produced a wrong
  attribution here in both directions — first blaming the slice, then wrongly clearing
  it.

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
wrong reason: `EXCLUDED_PREFIXES` in `check-docs-rename.ts` already lists
`.lavish-wip/`, `.lavish/`, `.omp/`, `.claude/` and `node_modules/`, the control
returned `[]`, and the assertion would have been satisfied by a gate that scanned
nothing at all. `bucket-legacy-token` reuses that same `isExcluded`, so it
inherited the same blind spot.

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
