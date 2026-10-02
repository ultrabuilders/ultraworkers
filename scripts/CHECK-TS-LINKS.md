# The `check:ts` chain — what each of the 14 links does

`check:ts` is a `&&` chain of 14 links (`package.json:99`). `&&` stops at the first failure, so in
ordinary use **everything after the first red link has not run** — not "ran and passed". This file
exists so that when someone reports "check:ts is red", the next question is *which* link.

The map below was measured on an **isolated `git worktree` at one fixed `HEAD`**, each link run on
its own, never through the chain. That matters: on the shared working tree the answer changes
while you measure it, and the changes are not hypothetical — see the last section, where two
links that are red at `HEAD` were green on the shared tree.

## Measured at `HEAD=3f19d4e552`, working tree clean throughout

| # | link | reads | exit | ms |
|---|------|-------|------|----|
| 1 | `check:tools` | `oxlint .` then `oxfmt --check` over the source globs | **1** | 670 |
| 2 | `check:ts:tools` | `tsconfig.tools.json` (tsgo `--noEmit`) | 0 | 7916 |
| 3 | `check:file-counts` | `scripts/check-grp-c-file-counts.ts` + `scripts/r0-grp-c-file-counts.json` | 0 | 92 |
| 4 | `check:invariants` | `scripts/run-node-invariants.mjs` — reported **6180 files scanned** | 0 | **15645** |
| 5 | `check:docs-rename` | `scripts/rename/check-docs-rename.ts` + `docs-legacy-allowlist.txt` | 0 | 111 |
| 6 | `check:runtime-rename` | `scripts/rename/check-runtime-rename.ts` + `runtime-legacy-allowlist.txt` | 0 | 536 |
| 7 | `check:test-rename-literals` | `scripts/ci-rename-test-literals.ts` | 0 | 732 |
| 8 | `check:bench-reporting` | `scripts/check-bench-reporting.ts` | 0 | 39 |
| 9 | `check:entry-graphs` | `scripts/check-entry-graphs.mjs` | 0 | 46 |
| 10 | `check:census` | `scripts/check-census-self-blindness.ts` | 0 | 1113 |
| 11 | `check:await-import` | `scripts/check-await-import.ts` | 0 | 561 |
| 12 | `measure:fan-in:check` | `scripts/measure-fan-in.ts --check` — 83 modules, 1379 files, 7896 edges | 0 | 294 |
| 13 | `check:types` | every `packages/*/tsconfig.json`, via `bun run --filter` | **1** | 22018 |
| 14 | `check:test-baseline` | `scripts/check-grp-c-test-baseline.ts` + `scripts/r0-grp-c-test-baseline.json` | **not run** | — |

**Two of thirteen are red, and both reds are in the commit.**

### Link 1 — two independent causes, and my first report of it was wrong

An earlier draft of this file said link 1 was "`oxfmt`, not `oxlint`", on the grounds that oxlint
reported 18 warnings and **0 errors**. That count came from the **last 25 lines** of a 70-line
capture. The tail did not contain the error; the error was earlier in the output and had been cut
off. Both causes are real:

```
oxfmt  : packages/coding-agent/src/tools/computer/prelude.js — format issues   (fixed in d81ef0c61d)
oxlint : packages/durable/test/harness-tasks-recovery.test.ts:690
         error eslint(prefer-const): `harnessRef` is never reassigned
```

The oxlint finding is the only **error-severity** result anywhere in the repo, and that file is
tracked and clean, so it is in the commit. It is a code decision rather than a mechanical
rewrite — the two neighbouring declarations use the same declare-then-assign shape — so it is
recorded here rather than fixed in a formatting commit.

**So link 1 is still red at `3f19d4e552`, for the lint reason rather than the format one.** If you
are reading a wall of `no-unused-vars` warnings before the exit code: those warnings are not why
it failed.

The generalisable part: a probe that keeps only a tail is measuring a *suffix*, and reporting it
as the whole output. Counting findings over a truncated capture is the same error as counting them
over a filtered one.

### Link 13 — the committed test does not typecheck

```
test/extensions-discarded-handler-result.test.ts(51,10): error TS2769
test/extensions-discarded-handler-result.test.ts(72,10): error TS2769
  Argument of type '"tool_approval_requested"' is not assignable to
  parameter of type '"mcp_notification"'.
```

Both lines are `pi.on("tool_approval_requested", () => VETO);` in the committed text. The
overload exists (`extensions/types.ts:1623`), so this is overload resolution against the type `pi`
has in the test, not a missing declaration.

**Neither red is local noise.** Both were measured on a checkout containing nothing but `HEAD`.

## Link 14 was deliberately not run

`collectFailures(target = SUITE)` spawns `bun test` against the **whole suite**, which is out of
scope for this map. Its row says "not run" rather than carrying a number nobody measured. It is
the one link whose cost nothing above bounds.

## No link writes

Every link was run against a detached worktree at a fixed `HEAD`, and `git status --porcelain` was
compared before and after each one. **It stayed at 0 for all thirteen.** So unlike the shared-tree
attempt — where a peer's commit produced a 67-path delta around a link that writes nothing, and
the two were indistinguishable — the write question is answered here rather than marked unknown.

That is the whole reason for using a worktree, and it is not reproducible on the shared tree: a
peer committing and a gate writing produce the same observable, and no amount of care with
snapshots separates them.

## The shared tree was masking both reds

Measured on the shared working tree minutes earlier, links 1 and 13 were **green**, and link 4 was
green too. All three had uncommitted local fixes:

| link | at `HEAD` | on the shared tree | why they differ |
|---|---|---|---|
| 1 | red | green | `prelude.js` is tracked and locally ` M` — someone reformatted it without committing |
| 4 | green* | green | *see below* |
| 13 | red | green | `extensions-discarded-handler-result.test.ts` is locally ` M` — the committed text calls `pi.on(…)`, the working tree calls `handlers.set(…)` |

\* Link 4 was red in the first isolated run and green in the second, and the cause is worth
recording because it looks like a HEAD defect and is not. `export/html/tool-views.generated.js`
is **untracked** — a build artifact. CI gets it because `package.json:176` declares
`"prepare": "bun run gen:tool-views"`, and `prepare` runs on `bun install`, which the CI
`bun-install` action performs before any gate. My worktree symlinked `node_modules` instead of
installing, so the artifact was absent and link 4 correctly reported a relative import naming a
file that did not exist. Generating it made link 4 green.

**Practical rule:** before reporting "link N is red at HEAD", confirm the worktree was prepared
the way CI prepares one. Otherwise you will file a defect in the harness.

## `check:disposition` is not in this chain — and it is not ungated

Worth stating because the chain is only one of the two things CI runs:

```
package.json:99    check:ts                 = the 14 links above
package.json:108   check:disposition-ratchet
package.json:135   ci:check:full            = bun scripts/ci-check-full.ts
.github/workflows/ci.yml:190   run: bun run ci:check:full
scripts/ci-check-full.ts:42    GATES = [ check:ts, check:disposition-ratchet ]
```

So `rename-incomplete` **is** gated — as CI's second gate, running whether or not `check:ts` is
red. Its own docblock records why it was moved out of the `&&` chain:

> "The ratchet was in fact wired as the eighth link of `check:ts`, behind `check:tools` and
> `check:test-rename-literals`, both of which are red on this tree. It would never have run."

A link that never executes is worse than no link, because it reads as coverage nobody has to
reason about. Reading `package.json:99` and concluding "nothing gates this" repeats exactly that
error one level up.
