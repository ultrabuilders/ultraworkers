# Owner decisions — 8 items blocking the sweep

**Date:** 2026-10-02, item 5 and item 8 corrected 2026-10-03 · **Branch:** `feat/beads-sweep-2026-09-30`
**Prepared by:** `ultraworkers-55`, peer-reviewed by `ultraworkers-a4`

Every item below is a **decision**, not engineering work. Each was measured against a moving
tree; the measurement, the control, and the consequence are stated so the answer can be given
without re-running anything.

> **The runtime moved between sessions, and its version label lies.** `bun test` printed
> `v1.3.14` early in the sweep and `v1.4.2` later. The reason is not a runtime change:
> `/opt/homebrew/Cellar/bun/` holds a keg _named_ `1.3.14` whose binary was rewritten
> 2026-09-05 and reports `1.4.2`. **A version has three sources — the binary's own answer, the
> keg/manifest name, and the runner banner — and only the binary's answer is a measurement.**
> Anyone labelling a run from `brew list` will label a 1.4.2 run "1.3.14", which is exactly
> what happened to item 5. A real 1.3.14 binary now exists at `/tmp/bun1314`, so item 5 is an
> A/B pair rather than a claim.

## Summary

| #   | Bead   | Question                                                                       | Cost of answering "no change"                                                                   |
| --- | ------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | `5125` | Is `Cost: Total` lifetime spend or context-window spend?                       | A user sees two different numbers from one session and neither says which is which              |
| 2   | `1beb` | A component factory passed to `ui.setWidget` under RPC: throw, or stay silent? | Extension authors have no way to ask, and get silence when they get it wrong                    |
| 3   | `1du7` | Do `W11:*` / `a57q:*` ref names get a definition site, or are they human-only? | 19 names covering 335 rows carry no verifiable meaning; the column's docblock implies otherwise |
| 4   | `r1t2` | Does this fork keep pi's `deferred-response`?                                  | 4 type errors persist in `packages/durable`                                                     |
| 5   | `0twi` | Is the runtime floor 1.3.14 or 1.4.2?                                          | A workaround in `session-loader.ts` stays that could be deleted                                 |
| 6   | `q8f0` | Does `hits=0` mean "swept", or "the regex can't see it"?                       | The disposition gate and docs gate disagree on what a legacy occurrence is                      |
| 7   | `grse` | Which binary does the dashboard tell users to run?                             | A user who installed only the dashboard is told a command they do not have                      |
| 8   | —      | Is `.omp` on disk a contract, or old branding?                                 | `check-docs-rename.ts` stays red on 1 file, and re-litigated every sweep                        |

Item 3 was reduced by a peer's commit (`194952ede6`) that landed while this document was being
written; the entry above reflects what is still open.

Items 1 and 2 have already been narrowed by measurement to a single question each — the
original framing in both beads presented more options than actually remain.

---

## 1. `epic-5125` — what does "Cost: Total" mean?

**Finding.** The TUI and `/cost` are not disagreeing through arithmetic error. They answer two
different questions, deliberately:

```
ACP /cost  :  acp-agent.ts → sessionManager.getUsageStatistics()  = lifetime
TUI        :  session-stats.ts:279 → activeModelUsageEntries()    = current window
```

The window filter is **intentional and stated in the source**, `session-stats.ts:70`:

> `/** Model calls belonging to the same active transcript window as \`agent.state.messages\`. */`

and it executes that promise — `startIndex` follows `firstKeptEntryId`, then walks back through
`isUsageWindowBoundary`, the same boundary set `buildSessionContext` uses.

**Why it matters.** Both `Tokens` and `Cost` in the "Totals" block come from the same loop, so
the whole block is windowed — not just the cost line. A user's bill does not shrink when context
compacts; the displayed number does. Divergence ranges **0.0909 – 0.9091** of the total,
tracking the before/after-compaction spend ratio. "30.8%" in the original bead was one sample,
not a property.

**The question.** If lifetime: the "Totals" block needs the assistant branch too, and the
existing subagent-window test may need splitting rather than deleting. If window: the label
must stop promising "Total", and `/cost` + ACP must say they are lifetime.

**Note.** No test currently takes a main-loop assistant turn through a compaction and checks
cost — verified by intersecting the files that call `getSessionStats` with the files that
exercise compaction, not by reading each file.

---

## 2. `epic-1beb` — a factory passed to `ui.setWidget` under RPC

**Finding.** One call, three behaviours (`rpc-mode.ts:941-954`):

| `content`         | result                                        |
| ----------------- | --------------------------------------------- |
| `undefined`       | sends a frame                                 |
| `string[]`        | sends a frame                                 |
| component factory | **silent** — no error, no factory run, no log |

Its two neighbours `setFooter` / `setHeader` **throw**. The comment at `custom()` names this
exact failure class: _"a false report of one: the author got `undefined`, no error, and no
factory run."_ So one site was treated and one was not.

**Why it is not a parity question.** `pi` has the identical silent branch, and is _worse_ at
the two neighbours (no-op stubs where this repo throws). There is no upstream answer to copy.

**Blast radius is small.** 4 call sites in this repo pass a factory; **none is an extension**,
and the single production one is already guarded. In `pi`, 5 call sites pass none.

**The question.** `(a)` throw like the neighbours — breaks extensions relying on the no-op, but
only under RPC where they are currently doing nothing; `(b)` let `canMount` answer per-content —
breaks no one, changes a signature; `(c)` log a warning — cheapest, but the user still sees
nothing.

---

## 3. `epic-1du7` — the vocabulary of `keep_refs`

> **Partly answered while this document was being written.** Commit `194952ede6`
> ("resolve keep_refs, or report the ones that cannot be") added a resolver and a
> `dangling-keep-ref` rule. What remains is below.

**Finding.** The gate checks that a `keep-*` row has _a_ reference, not that it points at
anything real (`check-disposition.ts:591`). With 24 distinct names, 21 of them exist in exactly
one place: the table itself.

**Five rows cite a reference that resolves to nothing:**

```
N3  catalog/src/wire/codex.ts
N4  coding-agent/src/modes/warp-events.ts
N5  coding-agent/src/modes/acp/acp-agent.ts
N6  ai/src/providers/gitlab-duo-workflow.ts
N7  coding-agent/src/telemetry-export-otlp.ts
```

`W9` does resolve — a node of a `MILESTONE_*_EXECUTION_PLAN.md` document. `N3`–`N7` have no
backing file anywhere (`find` returns empty).

**What the peer's change does, and does not, settle.** The resolver reads the plan documents,
so bare `W<n>` refs resolve by construction. Refs with no definition site — the `W11:*`,
`a57q:*` names and the five bare `N3`–`N7` — are **reported, not enforced**, and the gate
prints `keep-refs-not-checkable` rather than failing on them. That is the right call: a check
that cannot be satisfied is not a check.

**The question that remains.** `W11:*` and `a57q:*` are contract names with **no definition
site** — 19 of them, used by 335 rows. Either they get one (a registry, a section in a plan
document), or the table's `keep_refs` column is understood as a _human_ annotation that the
gate deliberately does not verify. The second is defensible, but the table's own docblock
describes a ref as "an approval nobody signed", which reads as a promise.

---

## 4. `epic-r1t2` — keep `deferred-response`?

**Finding.** `StopReason` here is
`"stop" | "length" | "toolUse" | "error" | "aborted"` — no `"pending"`, no `"deferred"`.
(`pi` has both.) The consequence is live in `packages/durable`:

```
src/harness/context.ts(8,7)  TS2322  Type '"deferred"' is not assignable to type 'StopReason'
```

**Careful with a naive grep.** `grep -c deferred` returns 5/10/6/4 across `agent-loop.ts`,
`agent.ts`, `live-steering.ts`, `speculative-execution.ts` — which reads as "already
supported". Opening them: every hit is speculative execution, or a `deferred: string[]` field.
**None** is the `StopReason` variant.

**The question.** If "drop it deliberately", those errors become **code deletion** — cheaper and
independent of the `SystemMessage` question. If "keep it", it is a real feature into `pi-ai`.

---

## 5. `epic-0twi` — is our runtime floor 1.3.14 or 1.4.2?

> **Both halves of this entry were wrong when first written, in opposite directions.** The
> version label came from a package manager, not from the binary. Corrected 2026-10-03.

**The machine is on 1.4.2 — and its own package manager disagrees.**

```
$ bun --version                    1.4.2          ← the binary's own answer
$ brew list --versions bun         bun 1.3.14     ← what the keg is NAMED
$ ls /opt/homebrew/Cellar/bun/     1.3.14         ← directory name
$ stat …/Cellar/bun/1.3.14/bin/bun 2026-09-05     ← but the binary was rewritten Sep 5
```

The keg directory and `brew list` both say `1.3.14`; the binary inside it was replaced on
2026-09-05 and reports `1.4.2`. **The version label follows the directory name.** So a probe
that writes "bun 1.3.14" because `brew list` said so is labelling a 1.4.2 run — which is what
this entry did.

**What actually reproduces, measured as a pair** (a real 1.3.14 binary was fetched to
`/tmp/bun1314`, so both sides are now binaries rather than labels):

```
1.3.14   slice(0, 262238).stream()  ->  HANG past a 2.5s race,  3/3 runs
1.4.2    slice(0, 262238).stream()  ->  completed 262238B, 0.25–0.47ms, 3/3 runs
```

The hang is real, the 1.4.2 fix is real, and `createReadStream` is load-bearing at the declared
floor. What decides it is the **file**, not the slice — under real 1.3.14 on an 8,000,000-byte
file, `slice(0, 1)` and `slice(0, 1000)` both hang while `slice(0, 7_999_999)` completes; a
1-byte slice hangs at 4 MB, 8 MB, 20 MB and 40 MB alike.

**So the conclusion is unchanged; only the label was wrong.** The workaround stays, and it
should be deleted when the floor moves to 1.4+ — not before. The earlier note's numbers were
real measurements of a real bug, taken on a 1.4.2 binary and filed under a 1.3.14 name.

**The decision, stated so it can be answered without installing anything.** The declared floor
lives in two places that currently agree: `scripts/install.sh:16`
(`MIN_BUN_VERSION="1.3.14"`) and `packages/durable`'s `engines.bun: ">=1.3.14"`.

**The same question, second reason.** `packages/durable` ships `storage/sqlite/node.ts`, which
imports `node:sqlite`. That built-in resolves fine on 1.4.2 — but a package that declares
`>=1.3.14` while depending on a built-in is making a claim about the floor that its own
engines field has to honour. One floor question, two independent reasons to answer it.

**Separately:** the bead claimed CI was red on `--frozen-lockfile`. That is now **stale** —
`bun install --frozen-lockfile` exits 0 and `pi-telemetry` is in `bun.lock`. Nobody needs to
re-fix the lockfile.

---

## 6. `epic-q8f0` — a row that reaches 0 occurrences

> **Largely resolved 2026-10-03 while this document was open.** The gate is now **clean over
> 823 rows** with all four metrics at 0. What follows is kept because the general question is
> not settled by this instance — only this instance was answered.

**How it stood when first written.** Six rows sat at zero, each "rows sum to N, file has 0":

```
bench.ts (9) · dry-balance.ts (5) · if-bench.ts (4)
say.ts (3)  · stream.ts (1)   · token.ts (5)
```

Four _other_ rows were stale counts on files that still hold occurrences; those were recounted
and the ratchet confirmed the movement (`hits-imbalance` 10 → 6, exactly 4).

**What actually resolved it.** A peer commit, `f1fc167cec` ("record that the sweep consumed
six command rows, keeping their refs"), swept those six command files. The rows now legitimately
declare `hits=0` because the literals are **gone**, not because the rows went stale. That is the
"tombstone" answer arriving by a third route: the work happened, so the question dissolved.

**What this teaches about the decision, and why it is not closed.** The choice was
retire-vs-tombstone, and this instance answered it by _doing the work_ — which is available only
when the row is a `rename` whose literals were removable. Neither option is safe in general:

- **Retire** (delete the row) makes `missing-row = 0` mean two different things — "the table is
  complete" and "no file has been swept yet."
- **Tombstone** (`hits=0`) leaves a row that protects nothing, while the post-stage gate demands
  `rename` reach 0. A `keep-*` row at `hits=0` is the genuinely ambiguous case, and it is what
  the peer's audit below found several of.

**The audit finding that does NOT go away.** A row at `hits=0` under `PINNED` does not mean the
legacy brand is absent from the file — it means the _bare_ token `omp` is absent. The same six
files carry the old brand as `oh-my-pi` (2–7 occurrences each), and `PINNED` cannot see it:

```ts
// scripts/rename/check-disposition.ts:101
const PINNED = /(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)/;
```

Verified directly: this expression returns `false` for `.omp`, `HOME/.omp/agent/`, `.omp-session`,
`x-omp-app` and `OMP_APP_NAME`. Its leading class excludes `.` and it is case-sensitive, so the
whole `.omp` **path** vocabulary is invisible to it.

**So the standing question is narrower than "retire or tombstone":** is `hits=0` under an
expression that cannot see `.omp` paths or `oh-my-pi` a _result_ or a _blind spot_? The docs gate
uses a different expression, `\bomp\b`, which **does** match `.omp` — so the two gates do not
agree on what a legacy occurrence is. That divergence is unowned.

---

## 7. `epic-grse` — which binary should the dashboard name?

**Finding.** `@oh-my-pi/omp-stats` is published as its own npm package, `bin: { "omp-stats" }`,
and its dependencies do **not** include `pi-coding-agent` — the package that provides the
`ultraworkers` bin. So:

```
npm i -g @oh-my-pi/omp-stats   →   dashboard yes, `ultraworkers` no
```

…and that user is told to run `ultraworkers stats`
(`frustration.ts:103`, `FrustrationRoute.tsx:197`) and `ultraworkers usage`
(`ProvidersRoute.tsx:92`).

**All three answers are defensible.** `omp-stats` is right for a dashboard-only install and
wrong for a coding-agent-only one. `ultraworkers stats` is the current behaviour and is wrong
for the first user. Naming both is never wrong, only longer.

A gate is in place at `packages/stats/test/advised-command-resolves.test.ts`: it reads the real
command table, and goes red if a dispatched subcommand is renamed. If the answer is `omp-stats`,
the gate **should** go red — that is the signal to extend the valid set, not to loosen it.

---

## 8. Is `.omp` on disk a contract, or old branding?

**No bead.** This one surfaced while verifying the others, and it is the cheapest item here:
one yes/no, and it un-reds a gate.

**The gate is red, on one file.**

```
$ bun scripts/rename/check-docs-rename.ts .
FAIL ruleA 8 docs/ui-comparison-ulw-vs-opencoding.md
FAIL ruleA 1 file(s) carry the legacy display token without an accepted reason.
```

**The 8 occurrences are real directories, not stale prose.** `docs/ui-comparison-ulw-vs-opencoding.md`
cites `~/.omp/agent/extensions/` and `<cwd>/.omp/extensions/`, and on disk `.omp/`,
`.omp/skills/` and `.omp/commands/` all exist. `packages/utils/src/dirs.ts:42` declares
`CONFIG_DIR_NAME = ".omp"`. Renaming those strings would describe a layout the repository does
not have.

**The seam is already open — no milestone needed.** A peer first guessed the allowlist was
per-file only; that was wrong. `scripts/rename/docs-legacy-allowlist.txt` already carries **99
budget lines** of the form `path<TAB>N`, pinning an occurrence count per file, with `#` reason
lines that the gate parses. The gate asks for exactly what the file already knows how to
express:

```
AGENTS.md                    5
docs/advisor-watchdog.md     5
docs/agent-hub.md            1
```

**The question.** Is `.omp` on disk a **contract** — the discovery root, which renaming breaks
for existing users — or **old branding** that a future release should migrate? If contract, the
allowlist entry is the correct and permanent answer, the gate goes green, and nobody touches
code. That is the cheap answer; it is not mine to pick, because it decides what happens to every
existing user's `~/.omp/` directory.

---

## Not blocking the owner

- **`omp-zzj`** — seam for approval cascade; `BLOCKED`, requires a deliberate one-time core
  change to `wrapper.ts`.
- **`epic-zcxk` / `epic-l3hn` / `epic-k9qj`** — ports in progress or awaiting peers.
- **Push** — 3 of this session's commits are unpushed. The range also contains peer commits
  (`tui`, `durable`), so a plain `git push` would publish other people's work.
