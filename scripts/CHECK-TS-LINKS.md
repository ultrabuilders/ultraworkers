# The `check:ts` chain — what each of the 14 links does

`check:ts` is a `&&` chain of 14 links (`package.json:99`). `&&` stops at the first failure, so in
ordinary use **everything after the first red link has not run** — not "ran and passed". This file
exists so that when someone reports "check:ts is red", the next question is _which_ link.

Measured on an **isolated `git worktree` at one fixed `HEAD`**, each link run alone, never through
the chain. On the shared working tree the answer changes while you measure it, and not
hypothetically — see the last section, where two links red at `HEAD` are green on the shared tree.

Links 1–13 were measured at `HEAD=f9cc4889de`. **Link 14 was measured separately, at
`HEAD=f5ad5401fb`, and needs a worktree with the native addon built** — see "The third trap"
below. Its row is in the table for completeness; its number belongs to a different `HEAD` and a
different tree state, and reading it as comparable to the thirteen would be wrong.

## Measured at `HEAD=f9cc4889de`, clean tree throughout

| #   | link                         | reads                                                                          | exit  | ms        |
| --- | ---------------------------- | ------------------------------------------------------------------------------ | ----- | --------- |
| 1   | `check:tools`                | `oxlint .` then `oxfmt --check` over the source globs                          | **1** | 297       |
| 2   | `check:ts:tools`             | `tsconfig.tools.json` (tsgo `--noEmit`)                                        | 0     | 3402      |
| 3   | `check:file-counts`          | `scripts/check-grp-c-file-counts.ts` + `scripts/r0-grp-c-file-counts.json`     | 0     | 113       |
| 4   | `check:invariants`           | `scripts/run-node-invariants.mjs` — reported **6180 files scanned**            | 0     | **17557** |
| 5   | `check:docs-rename`          | `scripts/rename/check-docs-rename.ts` + `docs-legacy-allowlist.txt`            | 0     | 100       |
| 6   | `check:runtime-rename`       | `scripts/rename/check-runtime-rename.ts` + `runtime-legacy-allowlist.txt`      | 0     | 425       |
| 7   | `check:test-rename-literals` | `scripts/ci-rename-test-literals.ts`                                           | 0     | 524       |
| 8   | `check:bench-reporting`      | `scripts/check-bench-reporting.ts`                                             | 0     | 42        |
| 9   | `check:entry-graphs`         | `scripts/check-entry-graphs.mjs`                                               | 0     | 47        |
| 10  | `check:census`               | `scripts/check-census-self-blindness.ts`                                       | 0     | 998       |
| 11  | `check:await-import`         | `scripts/check-await-import.ts`                                                | 0     | 395       |
| 12  | `measure:fan-in:check`       | `scripts/measure-fan-in.ts --check` — 83 modules, 1379 files, 7896 edges       | 0     | 218       |
| 13  | `check:types`                | every `packages/*/tsconfig.json`, via `bun run --filter`                       | **1** | 15346     |
| 14  | `check:test-baseline`        | `scripts/check-grp-c-test-baseline.ts` + `scripts/r0-grp-c-test-baseline.json` | **1** | see below |

**`git status --porcelain` was 0 before and after every one of the thirteen.** No link writes, and
that is measured rather than assumed — see "No link writes" below for why it is not answerable on
the shared tree.

### Both reds are in `packages/durable/test/`

They are one piece of unfinished work, not two unrelated problems.

**Link 1** — `oxlint`, one error-severity finding in the whole repo:

```
packages/durable/test/harness-tasks-recovery.test.ts:690:7
  error eslint(prefer-const): `harnessRef` is never reassigned
```

`oxfmt` is clean. Note what this link does when it fails: it prints ~64 lines of
`no-unused-vars` **warnings**, none of which is the reason it exited non-zero. Read the exit code,
not the volume.

This one is left unfixed deliberately. The two neighbouring declarations use the same
declare-then-assign shape, so `const` means moving the initialisation and changing scope — a code
decision, not a mechanical rewrite, and not something to fold into a formatting commit.

**Link 13** — one package fails to typecheck:

```
@oh-my-pi/pi-durable:check:types | test/harness-tasks.test.ts(198,36): error TS2769
  runtime.memo("choice", "a", ctx) — Type '"a"' is not assignable to type '"b"'
```

An earlier red here, in `extensions-discarded-handler-result.test.ts`, was fixed separately. This is
a different file and a different failure.

## Link 14 is a baseline gate, not a suite-green gate

An earlier version of this file said link 14 "runs the whole suite" and used that to conclude CI
was not green. The first half is right — `collectFailures(target = SUITE)` does spawn `bun test` —
but the conclusion is wrong, and the distinction is the whole point of the gate:

> This gate protects against **regression**: a failure name that was not in the baseline. […] A
> green run means "no NEW failures" — it does NOT mean "the baseline is right". […] `packages/
coding-agent/test/` is not green at HEAD. […] running the suite and requiring exit 0 is always
> red, and a permanently red gate gets switched off within a day.

So link 14 passing does not require the suite to be green, and its absence from a measurement says
nothing about CI.

## Link 14, measured at `HEAD=f5ad5401fb`: exit 1, **16 NEW failures**

```
grp-c baseline gate: 16 NEW failure(s) not in the baseline:
  ~ DAP launch failure handling > kills the detached adapter process …   ← the gate's own
                                                                          load verdict
baseline: …/scripts/r0-grp-c-test-baseline.json   (713 entries)
full output: …/grp-c-test-baseline/53135-current.log   (76 `(fail)` blocks)
```

76 failures in the log, 16 of them new; the other 60 are baseline. That is the gate working as
designed — it is a regression detector, not a suite-green check — so **exit 1 here is not a
finding about the tree**, it is the count of things that got worse since the baseline was taken.

Two things about the number itself:

- The gate **re-runs each failure in isolation** and prints the ones that do not reproduce as
  load (`~`, not `+`). One of the 17 candidates was separated that way. That discrimination is
  the gate's, not the reader's.
- It was measured **under contention** — three peer suites running concurrently, load average
  20–24 on 10 cores. So this is a number from a loaded machine and is **not** a CI number. The
  worktree had no compiled binary; CI does. Do not quote it as CI's.

It is also **already stale**: `f5ad5401fb` is several commits behind, and the gate compares
against a baseline file that moves with the tree. The number answers a question about that
`HEAD`, not about yours.

## Both earlier reds are fixed

At `HEAD=5b99427a1a` — worktree, clean, `git status` 0 before and after every link — **all
thirteen measured links exited 0**, 45.6s total, and `check:disposition-ratchet` exited 0 with
`stale-row = 0` and `dangling-keep-ref = 0`. The two reds recorded above (`prefer-const` in
`packages/durable/test/harness-tasks-recovery.test.ts`, and the `pi-durable` `memo` overload) were
fixed by other agents in `d0f0af741d` and `90809c775c`; both commits are ancestors of that HEAD.

What this does **not** establish is that CI is green. The test jobs are separate — `ci.yml` runs
them as `test_workspace`, `test_coding_agent_native` and `test_coding_agent_singleton`, none of
which `ci:check:full` invokes. Two independent halves, and only one has been measured.

## No link writes — except link 14, which writes three

Every one of the thirteen ran against a detached worktree at a fixed `HEAD`, with
`git status --porcelain` compared around each. It stayed at **0** for all thirteen.

**Link 14 does not qualify, and it is the only one that does.** Its suite leaves three
untracked files in the repository root:

```
ultraworkers-session-s1.markdown
ultraworkers-session-s1.md
ultraworkers-session-s1.probe
```

They are **not** gitignored — `git check-ignore` matches none of them — so a link-14 run on
anyone's checkout leaves the tree dirty in a way `git status` reports and no cleanup step owns.
On the shared tree that is indistinguishable from a peer's work in progress.

That is not a complaint about the gate, which is doing its job. It is a fact about what running
it costs the tree, and it belongs next to the exit code rather than in a footnote.

That is not answerable on the shared tree. A peer committing and a gate writing produce the _same_
observable — the tree changed, `HEAD` moved. Measured there: link 4 exits 0 and writes nothing, yet
the before/after diff around that same run showed **67 paths** changing, every one dirty→clean,
with `HEAD` moving across the run. No amount of care with snapshots separates those two. They are
the same event as far as the tree is concerned.

## How to build a worktree that measures something that exists

Three traps, all of which produce confident wrong answers rather than errors.

**Symlink `node_modules` wholesale and workspace packages resolve into the shared tree.** The
`@oh-my-pi/*` entries are relative symlinks (`../../packages/x`), so a symlinked `node_modules`
resolves them against the _shared_ checkout. You then typecheck the worktree's tests against the
main tree's source — a tree that exists at no commit. Build a real `node_modules` directory:
symlink each third-party entry, and recreate `@oh-my-pi/*` with relative links so they land inside
the worktree. Verify before running, per package:

```
all 24 workspace packages resolve INSIDE the worktree
/private/tmp/ct3/packages/utils/src/env.ts
```

**Run the `prepare` step CI runs.** `export/html/tool-views.generated.js` is untracked and
gitignored, produced by `"prepare": "bun run gen:tool-views"` on `bun install`. A worktree that
skips install is missing it, and link 4 then correctly reports a relative import naming a file that
does not exist — which reads exactly like a defect in the commit. `bun run gen:tool-views`, then
re-run. It leaves `git status` at 0, so the write check above stays meaningful.

**Build the native addon, or do not run link 14 there at all.** `packages/natives/native/*.node`
is a compiled Rust artifact and a fresh worktree does not have it. Without it every test that
touches `@oh-my-pi/pi-natives` dies at **module load**, not at an assertion:

```
error: Failed to load pi_natives native addon for darwin-arm64.
    Cannot find module '…/packages/natives/native/pi_natives.darwin-arm64.node'
```

Measured on the same `HEAD`, same tree, addon present vs absent:

|                                          | addon absent | addon present |
| ---------------------------------------- | ------------ | ------------- |
| `Failed to load pi_natives native addon` | 1634         | **0**         |
| `(fail)` blocks caused by that crash     | **48 of 55** | **0 of 76**   |
| failures the gate called NEW             | **54**       | **16**        |

A 54 that is 38 fabricated. The gate cannot tell the two apart — it counts failure _names_, and
a module-load crash produces a perfectly good failure name — so nothing upstream warns you.

Copying the addon across is legitimate **only after proving the inputs are identical**, because
otherwise you are measuring an artifact from another tree. At `f5ad5401fb` vs the tree it was
built from:

```
crates/pi-natives  9ea2b2fec == 9ea2b2fec      packages/natives      6c1d6f7f0 == 6c1d6f7f0
crates/pi-edit     79e182ce3 == 79e182ce3      Cargo.toml/lock      identical
.cargo/config.toml identical                   rust-toolchain.toml identical
```

Equal inputs ⇒ equal binary. Anything that differs ⇒ build it (`bun --cwd=packages/natives run
build`), do not copy.

**Rule that follows:** before reporting "link N is red at HEAD", confirm the worktree was prepared
the way CI prepares one — including its build step, not just its `prepare` script. Otherwise you
file a complaint against the instrument.

## The shared tree hides both of these

Minutes before the isolated run, on the shared working tree, links 1 and 13 were **green**. Each had
an uncommitted local fix — `src/tools/computer/prelude.js` reformatted, and
`extensions-discarded-handler-result.test.ts` edited from `pi.on(…)` to `handlers.set(…)`. A
working copy that is ahead of its commit will report a green that the commit does not have. That is
the failure this file exists to prevent.

## `check:disposition` is not in this chain — and it is not ungated

The chain is only one of the two things CI runs:

```
package.json:99    check:ts                 = the 14 links above
package.json:108   check:disposition-ratchet
package.json:135   ci:check:full            = bun scripts/ci-check-full.ts
.github/workflows/ci.yml:190   run: bun run ci:check:full
scripts/ci-check-full.ts:42    GATES = [ check:ts, check:disposition-ratchet ]
```

`rename-incomplete` **is** gated, as CI's second gate, running whether or not `check:ts` is red.
Its docblock records why it was moved out of the `&&` chain:

> "The ratchet was in fact wired as the eighth link of `check:ts`, behind `check:tools` and
> `check:test-rename-literals`, both of which are red on this tree. It would never have run."

A link that never executes is worse than no link, because it reads as coverage nobody has to
reason about. Reading `package.json:99` and concluding "nothing gates this" repeats that error one
level up.

## Counting findings: never over a tail

An earlier draft of this file reported "oxlint: 18 warnings, **0 errors**" and concluded link 1 was
a formatting failure. That count came from the **last 25 lines of a 65-line output**. The error sat
earlier in the stream and the tail had cut it off — and it was in the commit.

A probe that keeps only a tail is measuring a _suffix_. Counting findings over a truncated capture
is the same error as counting them over a filtered one. Store the whole output and count over that;
keep tails for reading.
