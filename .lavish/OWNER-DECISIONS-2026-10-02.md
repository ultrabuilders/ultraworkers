# Owner decisions — 7 items blocking the sweep

**Date:** 2026-10-02 · **Branch:** `feat/beads-sweep-2026-09-30`
**Prepared by:** `ultraworkers-55`, peer-reviewed by `ultraworkers-a4`

Every item below is a **decision**, not engineering work. Each was measured against a moving
tree; the measurement, the control, and the consequence are stated so the answer can be given
without re-running anything.

## Summary

| #   | Bead   | Question                                                                       | Cost of answering "no change"                                                                   |
| --- | ------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | `5125` | Is `Cost: Total` lifetime spend or context-window spend?                       | A user sees two different numbers from one session and neither says which is which              |
| 2   | `1beb` | A component factory passed to `ui.setWidget` under RPC: throw, or stay silent? | Extension authors have no way to ask, and get silence when they get it wrong                    |
| 3   | `1du7` | Do `W11:*` / `a57q:*` ref names get a definition site, or are they human-only? | 19 names covering 335 rows carry no verifiable meaning; the column's docblock implies otherwise |
| 4   | `r1t2` | Does this fork keep pi's `deferred-response`?                                  | 4 type errors persist in `packages/durable`                                                     |
| 5   | `0twi` | Raise `MIN_BUN_VERSION` 1.3.14 → 1.4.2?                                        | A workaround in `session-loader.ts` stays that could be deleted                                 |
| 6   | `q8f0` | A `rename` row that reaches 0 occurrences: delete it, or tombstone it?         | 6 rows sit red, and every future sweep repeats this                                             |
| 7   | `grse` | Which binary does the dashboard tell users to run?                             | A user who installed only the dashboard is told a command they do not have                      |

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

## 5. `epic-0twi` — raise `MIN_BUN_VERSION` to 1.4.2?

**Finding.** The workaround is real, reproduced on the installed runtime rather than inferred
from its docblock. A 1,049,018-byte file, sliced to 262,238:

```
bun 1.3.14:  slice -> HANG (>2.5s)
bun 1.3.14:  whole -> ok in 0ms (1049018B)
```

At 1.3.14 `createReadStream` is the only thing between that and an infinite wait. Upstream fixed
the underlying bug in 1.4.2.

**Blocker on measuring this one.** Only `bun 1.3.14` is installed on this machine, and it is
shared. Answering "does 1.4 regress?" requires installing 1.4.2 — which changes the machine for
every agent working on it. That is an owner's call, not a measurement I can make alone.

**Separately:** the bead claimed CI was red on `--frozen-lockfile`. That is now **stale** —
`bun install --frozen-lockfile` exits 0 and `pi-telemetry` is in `bun.lock`. Nobody needs to
re-fix the lockfile.

---

## 6. `epic-q8f0` — a row that reaches 0 occurrences

**Finding.** Six rows sit at zero, each "rows sum to N, file has 0":

```
bench.ts (9) · dry-balance.ts (5) · if-bench.ts (4)
say.ts (3)  · stream.ts (1)   · token.ts (5)
```

Four _other_ rows were stale counts on files that still hold occurrences; those were recounted
and the ratchet confirmed the movement (`hits-imbalance` 10 → 6, exactly 4).

**The consequence of each choice.** **Retire** (delete the row): `missing-row = 0` changes
meaning from "the table is complete" to "no file has been swept yet" — two different things
sharing one ratchet metric. **Tombstone** (`hits=0`): a zero row cannot protect anything, and
the post-stage gate demands `rename` reach 0, so the two gates contradict each other.

**A seventh red row appeared while this document was being written**, and it fails in the
_opposite_ direction:

```
scripts/rename/check-disposition.test.ts   rows sum to 15, file has 17
```

That is an **undercount**, not a dead row — the file gained occurrences without its row
moving. It is a peer's file (`check-disposition.test.ts`), and its last three commits are all
gate work by other agents. Two points follow, and they are the reason this is listed rather
than fixed:

- The six zero rows and this one are **different problems**, so "7 red rows" is not one backlog
  item. Six are a lifecycle decision; this one is a live recount.
- It confirms the gate does catch undercounts — which is what makes the six zero rows
  trustworthy as a signal rather than noise.

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

## Not blocking the owner

- **`omp-zzj`** — seam for approval cascade; `BLOCKED`, requires a deliberate one-time core
  change to `wrapper.ts`.
- **`epic-zcxk` / `epic-l3hn` / `epic-k9qj`** — ports in progress or awaiting peers.
- **Push** — 3 of this session's commits are unpushed. The range also contains peer commits
  (`tui`, `durable`), so a plain `git push` would publish other people's work.
