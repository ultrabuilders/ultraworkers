# Decisions a future agent must not reverse by reading only the reference

This is bead `epic-dynamic-workflows-259n.11` — a **recording**, not a task. Both entries below
are decisions already made. They are written down because the reference repo argues *against* us
on both counts, and an agent that reads only the reference will reach the opposite conclusion.

Every figure here was measured in this tree; the command is given so a reader can re-run it
rather than trust the number.

---

## TRAP 1 — `pi-subagents` uses the worker-spawn architecture our rules forbid

`.tmp/ref/pi-subagents` solves the same problem with the opposite architecture.

| | `pi-dynamic-workflows` | `pi-subagents` |
|---|---|---|
| Execution | in-process in a `node:vm` realm | `src/workflow/worker-source.ts` (781) GENERATES SOURCE then spawns |
| Orchestration | `src/workflow-manager.ts` (2412) | `src/agent-manager.ts` (1581) |
| Widget | `src/task-panel.ts` (1782) | `src/ui/agent-widget.ts` (659) |

```sh
cd .tmp/ref
for f in pi-subagents/src/workflow/worker-source.ts \
         pi-subagents/src/agent-manager.ts \
         pi-subagents/src/ui/agent-widget.ts \
         pi-dynamic-workflows/src/workflow-manager.ts \
         pi-dynamic-workflows/src/task-panel.ts \
         pi-dynamic-workflows/src/deep-research.ts; do
  printf '%-52s %s\n' "$f" "$(wc -l < "$f")"
done
```

> **The bead's path for `worker-source.ts` is wrong.** It gives `pi-subagents/workflow/worker-source.ts`;
> the file is at **`pi-subagents/src/workflow/worker-source.ts`**. An agent grepping the stated path
> finds nothing and may conclude the architecture does not exist. Corrected here.

The spawn itself, in production source (not a test):

```sh
grep -rn 'new Worker' .tmp/ref/pi-subagents/src/
# src/workflow/runtime.ts:719:  const worker = new Worker(WORKER_SOURCE, {
```

`worker-source.ts` is 781 lines of JavaScript held as an inlined string, spawned with
`{ eval: true }`.

AGENTS.md forbids exactly this shape:

> **Worker scripts**: workers re-enter the CLI entrypoint; never spawn separate worker entry
> modules.

That rule was written after issue #1150, where `with { type: "file" }` copied the entry as a raw
asset and workers **crashed silently in compiled binaries** (issues #1011, #1027).

**Decision: in-process, no new worker.** Workflows run via `runStructuredSubagent` inside the host
process.

### What the reference says, and why we are not persuaded

The reference is not wrong here, and pretending otherwise is how this decision gets reversed.
Its own docblock gives the reason, and it is a good one:

> The worker/host split exists for *killability*: `worker.terminate()` stops a runaway script
> mid-loop, which an in-process `vm` timeout cannot do once the script is inside an `await`.

So the two architectures differ on a real property, not on taste. We chose the side AGENTS.md
mandates — but the price is paid in killability, and **the price is not yet covered**:

```sh
grep -n 'timeout\|terminate\|abort\|signal' .claude/plugins/workflow/src/engine/vm.ts
# (no output)
```

`engine/vm.ts` contains **no** timeout, no `terminate`, no abort, no signal. There is an
agent-level timeout concept — `validateAgentTimeoutMs` in `src/agent-bridge.ts:86` — but it is not
the VM's, and nothing in the VM can stop a script that is inside an `await`.

**Therefore, as of this writing, the honest statement is: we traded a working kill mechanism for
the architecture our rules require, and have not yet bought one back.** Anyone who needs
runaway-script termination must treat closing this as new work, not as something already solved.
Reading only the reference will tell them the opposite.

---

## TRAP 2 — `deep-research.ts` does not verify, and looks like it does

`pi-dynamic-workflows/src/deep-research.ts` (135 LOC) is **cut**. The cut itself is already
enforced by `test/workflow/cut-ledger.test.ts:36`, which fails if the file reappears.

What the ledger does **not** preserve is the reason, and the reason is the whole point — the file
is not merely redundant, it is *misleading* about its own guarantees:

- The Verify phase (`:61-67`) is **one** `agent()` call, one pass, no voting.
- `minSupport` (default 2, `:34`) is **interpolated into the prompt**, not enforced in code.
- The clause "OR by one clearly authoritative source" lets a claim pass on a **single** source.
- `verdict.discarded` is requested by the schema (`:66`) and **never read**. Proof by whole-file
  count, which is stronger than pointing at the return: `grep -n 'discarded'` returns exactly
  **one** hit — the declaration itself. The `return` at `:77` reads `verdict.supported` only.

A file whose schema asks for a field nothing reads, and whose threshold is a string in a prompt
rather than a comparison, will survive a skim looking like a consensus verifier.

```sh
sed -n '34p;61,67p;77p' .tmp/ref/pi-dynamic-workflows/src/deep-research.ts
```

**Do not restore it, and do not "fix" it into shape** — there is no verification here to repair,
and adopting it would give callers a quorum guarantee that does not exist.

---

## What this recording does and does not enforce

TRAP 2 has an executable guard (the cut ledger). **TRAP 1 has none, deliberately.** A guard would
have to read source text to notice a spawn, and a source-grep test is banned by AGENTS.md: it
tests how code looks, breaks on harmless refactors, and passes while the behaviour is broken.

The nearest honest executable form — asserting this markdown file exists — is also banned, as a
"document exists" check with no semantic assertion. So this file stands on being read, and that
limitation is stated here rather than papered over with a green row.