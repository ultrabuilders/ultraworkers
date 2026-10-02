# The `check:ts` chain — what each of the 14 links does

`check:ts` is a `&&` chain of 14 links (`package.json:99`). `&&` stops at the first failure, so in
ordinary use **everything after the first red link has not run** — not "ran and passed". This file
exists so that when someone reports "check:ts is red", the next question is *which* link.

Measured on an **isolated `git worktree` at one fixed `HEAD`**, each link run alone, never through
the chain. On the shared working tree the answer changes while you measure it, and not
hypothetically — see the last section, where two links red at `HEAD` are green on the shared tree.

## Measured at `HEAD=f9cc4889de`, clean tree throughout

| # | link | reads | exit | ms |
|---|------|-------|------|----|
| 1 | `check:tools` | `oxlint .` then `oxfmt --check` over the source globs | **1** | 297 |
| 2 | `check:ts:tools` | `tsconfig.tools.json` (tsgo `--noEmit`) | 0 | 3402 |
| 3 | `check:file-counts` | `scripts/check-grp-c-file-counts.ts` + `scripts/r0-grp-c-file-counts.json` | 0 | 113 |
| 4 | `check:invariants` | `scripts/run-node-invariants.mjs` — reported **6180 files scanned** | 0 | **17557** |
| 5 | `check:docs-rename` | `scripts/rename/check-docs-rename.ts` + `docs-legacy-allowlist.txt` | 0 | 100 |
| 6 | `check:runtime-rename` | `scripts/rename/check-runtime-rename.ts` + `runtime-legacy-allowlist.txt` | 0 | 425 |
| 7 | `check:test-rename-literals` | `scripts/ci-rename-test-literals.ts` | 0 | 524 |
| 8 | `check:bench-reporting` | `scripts/check-bench-reporting.ts` | 0 | 42 |
| 9 | `check:entry-graphs` | `scripts/check-entry-graphs.mjs` | 0 | 47 |
| 10 | `check:census` | `scripts/check-census-self-blindness.ts` | 0 | 998 |
| 11 | `check:await-import` | `scripts/check-await-import.ts` | 0 | 395 |
| 12 | `measure:fan-in:check` | `scripts/measure-fan-in.ts --check` — 83 modules, 1379 files, 7896 edges | 0 | 218 |
| 13 | `check:types` | every `packages/*/tsconfig.json`, via `bun run --filter` | **1** | 15346 |
| 14 | `check:test-baseline` | `scripts/check-grp-c-test-baseline.ts` + `scripts/r0-grp-c-test-baseline.json` | **not run** | — |

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

## Link 14 was deliberately not run

`collectFailures(target = SUITE)` spawns `bun test` against the **whole suite**, out of scope here.
Its row says "not run" rather than carrying a number nobody measured. It is the one link whose cost
nothing above bounds.

## No link writes

Every link ran against a detached worktree at a fixed `HEAD`, with `git status --porcelain`
compared around each one. It stayed at 0 for all thirteen.

That is not answerable on the shared tree. A peer committing and a gate writing produce the *same*
observable — the tree changed, `HEAD` moved. Measured there: link 4 exits 0 and writes nothing, yet
the before/after diff around that same run showed **67 paths** changing, every one dirty→clean,
with `HEAD` moving across the run. No amount of care with snapshots separates those two. They are
the same event as far as the tree is concerned.

## How to build a worktree that measures something that exists

Two traps, both of which produce confident wrong answers rather than errors.

**Symlink `node_modules` wholesale and workspace packages resolve into the shared tree.** The
`@oh-my-pi/*` entries are relative symlinks (`../../packages/x`), so a symlinked `node_modules`
resolves them against the *shared* checkout. You then typecheck the worktree's tests against the
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

**Rule that follows:** before reporting "link N is red at HEAD", confirm the worktree was prepared
the way CI prepares one. Otherwise you file a complaint against the instrument.

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

A probe that keeps only a tail is measuring a *suffix*. Counting findings over a truncated capture
is the same error as counting them over a filtered one. Store the whole output and count over that;
keep tails for reading.
