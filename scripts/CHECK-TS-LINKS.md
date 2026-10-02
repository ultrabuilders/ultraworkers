# The `check:ts` chain — what each of the 14 links does

`check:ts` is a `&&` chain of 14 links (`package.json`). `&&` stops at the first failure, so in
ordinary use **everything after the first red link has not run** — not "ran and passed". This file
exists so that when someone reports "check:ts is red", the next question is *which* link, and the
answer does not require re-deriving it.

Every row below was measured by running that link **on its own**, never through the chain, and
each is stamped with the `HEAD` it ran at. The tree was moving during the measurement — a peer
committed mid-run — so a number without its `HEAD` here is not comparable to one taken minutes
later.

## Measured state

Run of 2026-10-03. Links 1–4 at `HEAD=bfa783a13a`, links 5–13 at `HEAD=c284464c4e`.
`dirty` is the number of paths `git status --porcelain` reported; the tree never went clean.

| # | link | reads | exit | ms | writes? |
|---|------|-------|------|----|---------|
| 1 | `check:tools` | `oxlint .` + `oxfmt --check` over the source globs | 0 | 923 | no |
| 2 | `check:ts:tools` | `tsconfig.tools.json` (tsgo `--noEmit`) | 0 | 873 | no |
| 3 | `check:file-counts` | `scripts/check-grp-c-file-counts.ts` + `scripts/r0-grp-c-file-counts.json` | 0 | 116 | no |
| 4 | `check:invariants` | `scripts/run-node-invariants.mjs` — reported **6183 files scanned** | 0 | **30167** | **not measurable, see below** |
| 5 | `check:docs-rename` | `scripts/rename/check-docs-rename.ts` + `docs-legacy-allowlist.txt` | 0 | 322 | no |
| 6 | `check:runtime-rename` | `scripts/rename/check-runtime-rename.ts` + `runtime-legacy-allowlist.txt` | 0 | 536 | no |
| 7 | `check:test-rename-literals` | `scripts/ci-rename-test-literals.ts` | 0 | 613 | no |
| 8 | `check:bench-reporting` | `scripts/check-bench-reporting.ts` | 0 | 29 | no |
| 9 | `check:entry-graphs` | `scripts/check-entry-graphs.mjs` | 0 | 45 | no |
| 10 | `check:census` | `scripts/check-census-self-blindness.ts` | 0 | 995 | no |
| 11 | `check:await-import` | `scripts/check-await-import.ts` | 0 | 397 | no |
| 12 | `measure:fan-in:check` | `scripts/measure-fan-in.ts --check` — reported 83 modules, 1379 files, 7896 edges | 0 | 270 | no |
| 13 | `check:types` | every `packages/*/tsconfig.json`, via `bun run --filter` | **1** | 12810 | no |
| 14 | `check:test-baseline` | `scripts/check-grp-c-test-baseline.ts` + `scripts/r0-grp-c-test-baseline.json` | **not run** | — | — |

**Link 4 alone is 30.2s of the 48.1s all thirteen measured links took** — 63% of the chain's wall
time in one link, while the other twelve together take 17.9s. Worth knowing before adding a
fifteenth.

## Link 14 was deliberately not run

`collectFailures(target = SUITE)` spawns `bun test` against the **whole suite**. Running it was
out of scope for the measurement that produced this file, so its row says "not run" rather than
carrying a number nobody measured. It is the one link in the chain whose cost is unbounded by
anything above.

## The one red link, and why it will also be red in CI

Link 13, `check:types`, at `c284464c4e`:

```
packages/coding-agent/test/extensions-discarded-handler-result.test.ts(51,10): error TS2769
  Argument of type '"tool_approval_requested"' is not assignable to
  parameter of type '"mcp_notification"'.
```

That file was **staged and committed during this measurement** (it appeared as `A` in an
earlier snapshot and is tracked now). So this red is a property of the commit, not of anybody's
uncommitted work: **CI sees it too.** It is not local noise.

## Disk-reading vs commit-reading, with one measured example of each

This is not a cosmetic distinction — it decides whether a red you see locally is a red CI has.

**Disk-only red (CI would be green).** At `HEAD=def931c391`, link 2 was red with seven
`prefer-const` errors in `packages/durable/test/harness-tasks.test.ts` — an **untracked** file.
Nothing in the commit had that error. A peer has since taken the file; link 2 is green in the
table above. This is the shape of red worth double-checking before filing: *is the file it is
naming actually in the commit?*

**Commit-visible red (CI is red too).** Link 13 today, above.

Links 1 and 2 read the filesystem by construction (`oxlint`/`oxfmt`/`tsgo` take paths, not
revisions). For the remaining links the disk-vs-commit split was **not** established by
measurement here — see the caveat below.

## "Does this link write?" is not answerable on a shared tree

The question that matters most for a gate is whether it modifies the tree, because a gate that
does can turn itself green by overwriting its own evidence. The prescribed method — snapshot
`git status` before and after, compare — **does not work while peers are committing**, and this
is not a theoretical caveat.

Link 4, run on its own, exits **0** and writes nothing. Yet the before/after diff around that
same run reports **67 changed paths**, every one of them a path that went *from dirty to clean* —
the signature of a peer **committing**, not of this link writing. `HEAD` moved
`c86407552d` → `a431592168` across the run. Dirty count: 623 → 622.

A link that writes nothing, and a link whose neighbour commits, are **indistinguishable** by this
method here. So the `writes?` column reads "no" only where nothing changed *and* `HEAD` held
still; for link 4 the honest entry is "not measurable", not "no".

What would settle it: run each link in an isolated checkout at a fixed `HEAD`, where no peer can
move the tree underneath the snapshot. That was not done, so it is not claimed.

## Not in this chain

`check:disposition` / `check:disposition-ratchet` is a real gate over
`scripts/rename/disposition.tsv` and it is **not** one of these 14 links. The `rename-incomplete`
backlog it reports is therefore not what makes `check:ts` red, and should not be blamed for a
`check:ts` failure.
