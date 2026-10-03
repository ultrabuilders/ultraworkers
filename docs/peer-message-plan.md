# Peer message — agent ↔ agent, cross-session — the complete plan

Written 2026-10-04. Companion to [`peer-messaging.md`](./peer-messaging.md), the
fourteen-project study this is built from; §-references point into it.

**Owner-set.** Same machine only. Own package. **Implement the complete feature
set** — not a vertical slice: peer messaging *and* the file lifecycle it depends
on, taking the best mechanism out of every reference rather than porting any of
them.

**Why this exists.** Claude Code's cross-session messaging is genuinely good and
the closest working model to what we want. It is also missing the entire file
lifecycle: it registers a socket at `/tmp/cc-socks/<PID>.sock` and **never
releases it**, has no collision handling, no locking, no reclaim, and no way to
tell a live registration from a corpse. That gap is the reason for this document.

**What changed on 2026-10-04, and why.** An earlier draft concluded that no core
change was needed. That was wrong, and it was wrong in the exact way this repo's
own docs warn about: it was inferred from the *absence* of a cross-session API
without checking whether an agent-to-agent bus already existed. One did —
`packages/coding-agent/src/irc/`, 479 lines, complete, in-process.

---

## 1. What already exists — `irc/`

`packages/coding-agent/src/irc/` is **already** agent-to-agent messaging. It is not
human collab. Read both files before designing anything:

- `irc/bus.ts` (377 lines) — `IrcBus`, the process-global mailbox bus
- `irc/messaging.ts` (102 lines) — the `send` / `wait` tool surface

| Capability | Where | Note |
| --- | --- | --- |
| Receipt with four outcomes `injected / woken / revived / failed` | `bus.ts:97-186` | `revived` distinguishes a parked recipient from a live one |
| *"the receipt reports how the message reached the recipient … not what they did with it"* | `bus.ts:57-59` | The delivery-honesty statement, already written |
| Refusals with a specific cause — unknown / hard-aborted / **read-only advisor** / no live session | `bus.ts:99-120` | Never a bare `false` |
| Parked recipients revived through `AgentLifecycleManager` | `bus.ts:137-153` | |
| `wait()` with timeout, abort signal, **and liveness** | `bus.ts:271-284` | Aborts when the sender stops running |
| Visibility scoping via `registry.listVisibleTo(senderId)` | `messaging.ts:64` | |
| Mailbox cap 100, drop-oldest, logs what it dropped | `bus.ts:304-319` | |
| No double-delivery — a delivered message never lingers in the mailbox | `bus.ts:61-66` | |
| Snowflake ids | `bus.ts:74` | Collision-free, time-sortable |
| Self-send refused; `to === "all"` broadcast | `messaging.ts:55-57, 64` | |

### 1.1 The one thing it lacks

`#mailboxes` is a `Map` in process memory. `IrcBus.global()` is a process
singleton. `AgentRegistry` is per-process.

**Agent A in session 1 cannot message agent B in session 2.** There is no
transport between processes, so there is nothing to route over.

### 1.2 Why the bus is kept

A fresh A2A package would discard the receipts, the refusal taxonomy, the
visibility scoping, the parked-revive lifecycle and the no-double-delivery
discipline — the parts of this codebase already better than most of the fourteen
references. **We add a transport. We do not write a second bus.**

---

## 2. The package

```
packages/peer/            →  @ultraworkers/peer
  identity/     closed name space, allocation, composite address
  presence/     registration file, four-signal liveness, reaper
  transport/    per-session UDS, framing, wake socket
  inbox/        durable message files, monotonic cursor, retention
  locking/      election, claim, fencing token, leases
  fence/        three-layer peer-content fencing
  index.ts      PeerTransport implementation
```

**The boundary rule is one sentence: the package owns everything that touches the
filesystem; `IrcBus` keeps everything in memory.** They meet at one interface:

```ts
interface PeerTransport {
	deliver(target: PeerAddress, message: IrcMessage): Promise<TransportOutcome>;
}
```

The package has no dependency on `coding-agent`. `coding-agent` depends on the
package, which is the normal direction — so the core change stays small.

Two reasons the boundary is worth it, and neither is about line count:

- **None of the filesystem work needs an agent.** Reaping on four-signal
  corroboration, two-phase claim by rename, fencing tokens, atomic writes,
  symlink defence, monotonic cursors, retention with an unacked guard — none of
  that mentions `IrcBus`, `AgentRegistry`, or a turn. Inside `src/irc/` none of it
  is testable without booting a whole agent.
- **This is where a bug is silent.** A reaper that fires early, or a fencing token
  that is not checked, does not throw — it lets two agents believe they own the
  same thing. That class of bug is cheapest to catch in a package with its own
  suite and no agent in the loop.

### 2.1 The core change

`IrcBus`'s constructor is already dependency-injected — tests call
`new IrcBus(agents)`, and the signature is `(registry, lifecycle?)`. Adding a third
**optional** parameter is backward-compatible, and the default stays the current
in-process path, so a single session behaves exactly as it does now.

`CHANGELOG.md:1413` already names peer messaging as the intended extension bridge,
so the direction is sanctioned. **Open:** whether to add a row to
`docs/core-seams.md`. Adding is additive, not a modification — but it is a
commitment, and `ultraworkers-d9` was asked and explicitly declined to propose it,
on the grounds that the file is a contract document. That boundary is respected
here.

### 2.2 The name, and the collision it has to carry

`peer` is already in use in this repo in **four** senses:

| Package | What `peer` means there | Conflict |
| --- | --- | --- |
| `ai/auth` | `"peer-rotated"` — the process that won a CAS on an auth row (`auth/refresh.ts:360,378`) | **Real.** Same problem domain — two processes racing on shared state — but a *contender*, not a *counterpart*. |
| `ai/auth-broker`, `ai/utils/proxy` | `peer: "host:port"` — a gRPC/proxy endpoint | None. Industry-standard. |
| `catalog` | `pricing-peer` / `peerId` — one model id's aliases | None. Standard there. |
| `wire`, `collab-web` | relay `peer: number`, guest peers | Mild. Ours; `collab-web` should say `guest`. |

**Adopted: `packages/peer/` → `@ultraworkers/peer`.** The collision that bites is
`ai/auth`'s `"peer-rotated"`, fixed by a sentence in each place rather than a
rename: *auth CAS rotation is between processes sharing a credential row; peer
messaging is between agents delivering a message.* They never meet.

`packages/agent` already says **"peer IRC"** in code (`agent-loop.ts`,
`types.ts:351,669`), so this completes a term the repo is reaching for.

**Housekeeping owed:** rename `collab-web`'s human guest terminology from `peer`
to `guest`, in a separate commit after this lands.

---

## 3. Feature A — identity and naming

### 3.1 Closed name space

From `mcp_agent_mail_rust`, verified by hand: `VALID_ADJECTIVES` is **75** words,
`VALID_NOUNS` is **132**, and a name is valid **iff it decomposes into a known
adjective and a known noun** (`mcp-agent-mail-core/src/models.rs:887-917`).
`normalize_agent_name` (`:588`) canonicalises to `PascalCase`, so uniqueness is
case-insensitive.

**75 × 132 = 9,900 names.** Exhaustion is a finite, measurable event rather than a
surprise, and the collision probability can be computed instead of discovered.

**The property that matters is not ergonomics: the space contains no role words.**
The tool contract rejects `BackendHarmonizer`, `DatabaseMigrator`, `UIRefactorer`
by name — *"names should be memorable identifiers, not role descriptions."* So the
complete set of claims an agent can make in its own name is enumerable, role-free,
and contains nothing to impersonate with. That closes §6's impersonation risk **at
the naming layer** rather than at the permission layer.

### 3.2 What ultraworkers has today, and why it does not survive a process boundary

```ts
// packages/coding-agent/src/task/output-manager.ts:112-117
 * @param id Requested ID (e.g., "Anna")
 * @returns Unique ID ("Anna" first, then "Anna-2", "Anna-3", …)
async allocate(id: string): Promise<string> { … }
```

Main agent is `"Main"` (`packages/tui/src/overlays/agent-hub-types.ts:5`). Two
properties break across processes:

1. **Uniqueness is per-session.** Two sessions each spawning an agent named
   `Anna` both get `Anna` — a silent collision between two live peers.
2. **`Anna-2` encodes occurrence order, not identity.** It is not stable and not
   meaningful to another process.

**Adopted:** machine-scoped allocation from the closed space, case-insensitively
unique, allocated under a lock from §5.

### 3.3 Two addresses, on purpose

- **Name** — the human-facing identity, from the closed space. This is what peers
  type.
- **`{ instanceId, name }`** — the wire address. Keeping the instance means a
  stale socket or a recycled name is still attributable, and ambiguity is
  impossible by construction rather than by check (§6.6's derived-ownership rule).

### 3.4 Two verbs, so reuse and spawn cannot be confused

`register_agent` **updates** an existing identity; `create_agent_identity` always
creates a new one. Adopt the same split: *join-or-refresh* and *mint-fresh*.

### 3.5 Naming hygiene worth stealing verbatim

`return_registration_token: false` exists so a secret is not echoed into
transcript scrollback — and the contract is honest that opting out costs
`verified_sender`. **A capability whose absence is priced in the response is a
better contract than one that silently degrades.**

---

## 4. Feature B — presence, discovery, release

### 4.1 Registration

Per session, at `~/.omp/run/peer/`. Reuse the shape already proven in
`collab/registry.ts:172-176`: `{ instanceId, pid, endpoint, createdAt, token }`.

Four anti-collision layers, from `pi-cross-session` (§5.1): `instanceId =
randomBytes(16)`; a namespace from `sha256(agentDir)`; a **uid prefix** so another
user on a shared `/tmp` cannot overwrite the entry; and the namespace inside the
Windows pipe name. Its comment states the rule governing all four: *"usernames from
the launch environment are not identities and must not affect peer validation."*

**Naming may be a pure function of the session id** (`pi-mesh` uses FNV-1a over a
58-word list), so a reload preserves identity with nothing persisted (§5.9).

### 4.2 Liveness: four signals, and only `ESRCH` is death

The naive rule — registration older than TTL, so reap — is wrong twice over:

- A **sleeping laptop** looks exactly like a dead one. `sting8k` requires **two
  observations five minutes apart** (`DEAD_SESSION_SWEEP_MS`).
- A **permission error is not death**. `pi-cross-session` treats **only `ESRCH`**:
  being unable to signal a process is not evidence it exited (§5.1).

`mcp_agent_mail_rust` has the most careful version — `force_release_file_reservation`
(`reservations.rs:2689`) validates **four independent signals** and requires them
to agree:

```rust
let all_signals_stale = agent_inactive && mail_stale && !recent_fs && !recent_git;
```

Two properties to copy exactly:

1. **`!recent_fs && !recent_git` is a veto.** Positive evidence of continued life
   blocks the reap even when the registration has expired. **Absence of evidence
   never kills; only corroborated absence does.**
2. **It returns `stale_reasons[]`** — the release is explainable.

**Adopted signals:** registration age · `kill(pid, 0)` · socket connect probe ·
peer liveness. All four must agree, and the reason list is returned to whoever
asked.

**Liveness is a probe, not a timestamp.** `pi-cross-session` reads every valid
registration and does *not* filter on `updatedAt`; `livePeers` opens the real
socket with a 350 ms timeout.

### 4.3 Release: on a probe, never on an age

Measured across eight projects — the owner's premise, checked rather than assumed:

| Project | Deletes lock / socket / registration? | Evidence used | Leaks on crash |
| --- | --- | --- | --- |
| `pi-parley` | **Yes** — socket, port, pid | kernel lock **+ live probe** | files, but nothing that *blocks* |
| `pi-cross-session` | **Yes** — socket + registration | probe **AND** `kill(pid,0)` | yes, until another session runs |
| `armory-mesh` | **Yes** — registration, socket | mtime TTL / broken probe | `cursors/` forever |
| `pi-peer-sting8k` | **Yes** — whole session artifacts | mtime TTL + two-observation grace | `.tmp` only |
| `agent-fleet` | Yes, but the lock is **never auto-stolen** | operator `--force` only | **yes, permanently** |
| `pi-mail` | Yes — presence files | **mtime TTL only, no probe** | **yes, permanently** |
| `pi-peer-cryptolibertus` | **No — filters only** | TTL+probe, but never deletes | descriptors + socket **forever** |

**Two projects release nothing at all, and two more release only on a timestamp
with no probe.** The pattern that works is the first row.

Stale socket reclaim, from `armory-mesh`'s `probeStale`: connect with a 250 ms
timeout, treat failure as stale, unlink, rebind.

Two failure modes worth naming because they are easy to reproduce:

- **`agent-fleet`'s lock never expires**, by explicit choice — *"No stale-lock
  stealing: recovery is an explicit operator decision"*
  (`bin/lib/workspace-safety.js:38-51`). Defensible, but its release path is a
  **silent `catch {}`** (`:57-64`), so a torn lock body is a permanent wedge **with
  no diagnostic**. Deliberate and quiet is not the same as safe.
- **A pid-only temp name is a permanent failure.** `transaction.js:82` writes
  `${path}.tmp-${process.pid}`; a recycled pid makes every later transaction fail
  `EEXIST` forever. **Put something unguessable in the temp name, not the pid**,
  and reap orphans by age.

---

## 5. Feature C — the file lifecycle

### 5.1 Four kinds of lock, and a fifth that is not a lock

| Kind | Purpose | Mechanism | Source |
| --- | --- | --- | --- |
| **Election** | exactly one owner per role | kernel lock on a lock file | `pi-parley` `.process.lock` — whoever wins *is* the owner |
| **Mutual exclusion** | one drainer at a time | two-phase claim by `rename` | `sting8k` `service.ts:322-327` |
| **Scoped lease** | hold a resource across turns | TTL lease, clamped both ends | `mail-rust` reservations |
| **Fencing** | stop a *stale* holder writing | monotonic token per acquisition | see §5.2 |

- An **election lock must be a real kernel lock**, not a file whose existence means
  "held" — that has no atomic test-and-set.
- **Any lease needs a TTL and a reaper.** TTLs clamp to `[60s, 1 year]` and the
  clamp **warns** rather than silently correcting (`macros.rs:231-237`). A lock with
  no TTL turns a crash into a permanent deadlock.
- **Re-verify authority from disk on every write**, not just at acquire.
  `pi-agent-teams` does this (`worker.ts:206-215`) — its write side is gated even
  though its read side is not.
- **An ABA epoch** — `pi-parley`'s `endpointEpoch`, a fresh UUID per registration,
  mismatch is `E_TARGET_REBOUND`. If the target re-registers between your read and
  your write, the epoch tells you.

### 5.2 Fencing — the fourth kind, and why TTL alone is not enough

A lease says *"I hold until T."* But the holder **can still be alive at T** — the
machine slept, a GC ran long, a debugger held the process. It comes back, still
believes it holds, and overwrites whoever replaced it. **A TTL decides who is
*considered* dead. It does not decide who is *prevented from writing*.**

> **Fencing:** every acquisition issues a **monotonically increasing token**; every
> write carries it; the store **rejects a stale token**.

Not hypothetical here. `epic-z4zg` (P1, open) records it: on this shared tree,
`git add <path>` stages the *entire current file content*, so one session's
`git add` put another session's lines into the index, and a third session's bare
`git commit` committed the whole index. `.git/index.lock` did its job perfectly —
it stopped two processes writing at once — and that was **not sufficient**. The
recorded rule is three-tier, and only the third is actually yours:

```
git commit <paths>         → SWEPT directories you do not own      ✗
git commit --only <path>   → your path, but the WHOLE file          ⚠️
hash-object + update-index → only the lines you actually produced    ✓
```

**Force-release is not fencing.** `force_release_file_reservation` frees a slot by
external heuristic; it does **not invalidate the holder**. A force-released agent
whose in-flight write lands is a **zombie writer**, and nothing on the write path
asks it. Age is a heuristic; a token is a guarantee.

### 5.3 A fifth, only if two leases are ever held at once

**Lock ordering.** A TTL lease does not prevent deadlock: A holds X wants Y, B
holds Y wants X, both sit until the TTL expires and both lose their work. Cheapest
fix is a **total order on resource names**. Only relevant if any path holds more
than one lease.

### 5.4 Atomic writes: `rename` is atomic but **not durable**

Across eight projects, **only `agent-fleet` calls `fsync`**, and only partially
`pi-parley`. It is the one that gets both halves right, and the half almost
everyone skips (`bin/lib/transaction.js:81-88`, verified):

```js
function fsyncPath(path) {
	const fd = openSync(path, "r");
	try { fsyncSync(fd); } finally { closeSync(fd); }
}
function durableJson(path, value) {
	const temp = `${path}.tmp-${process.pid}`;
	const fd = openSync(temp, "wx", 0o600);
	try { writeSync(fd, JSON.stringify(value, null, 2) + "\n"); fsyncSync(fd); } finally { closeSync(fd); }
	renameSync(temp, path);
	// Persist the directory entry after the atomic replacement.
	fsyncPath(dirname(path));
}
```

The last two lines are the lesson, and the comment names it: **until you `fsync` the
directory, the rename itself can be lost by power failure** even though no reader
ever sees a torn file. Every inbox write does both.

Even there the rule is inconsistently applied — the payload path has none of it
(`apply.js:710-714`). **A durable-write helper only some call sites use is the same
shape as a gate that cannot fail.**

### 5.5 Collision

The lesson from `mcp_agent_mail_rust` is that the fix is **not** making the lossy
channel better. A recipient's `.signal` file is a debounced latest-state indicator
keyed on `(signals_dir, project, agent)` — **not per message** — so two messages
within 100 ms produce one file and the second overwrites the first. The comment
(`schema.rs:2318-2322`) states the fix:

> *"cannot prove which of several concurrent messages it represents. Keep the
> durable, append-only observation separate from that mutable file."*

> **When a lossy channel is unavoidable, do not try to make it lossless — make the
> durable record independent of it and let the lossy channel be only a hint.**

The compensation table is `message_delivery_signal_receipts`, PK
`(message_id, agent_id, delivery_route)`, written `INSERT OR IGNORE … WHERE EXISTS
(SELECT 1 FROM message_recipients WHERE …)`. Three details carry: `WHERE EXISTS`
means a receipt is **not** proof the signal wrote — it is proof the pair is real;
the column is `signal_path_digest`, **not** the path, because storing the path
turns evidence into a re-identification vector; and `delivery_route` is in the PK
because one pair can travel by more than one path.

Applied here: **the socket event is a hint; the inbox file is the fact.** A wake
hint that collides loses nothing.

| Mechanism | Source | Why |
| --- | --- | --- |
| Snowflake ids | `irc/bus.ts:74` (ours) | Collision-free, no coordination |
| Atomic tmp+rename, `0600` in `0700` | `pi-ipc`, `sting8k` | No queue that can tear |
| One file per message, `${seq}-${envelopeId}.json` | `pi-ipc` | **`sort()` is the delivery order** |
| `requestId` **plus intent hash** | `agent-fleet` | Same id + different intent = hard `idempotency_conflict`, never a silent replay |
| Refuse an ambiguous target; never pick one | `pi-ipc`, `sting8k` | §6.1 |

### 5.6 Overflow is a send-side problem, not a drop

`IrcBus` caps at 100 and drops oldest with a log (`bus.ts:304-319`). Drop-oldest is
a **data-loss policy**, and the log only proves we know we lost something.

For a mailbox that *is* the truth, on overflow the honest move is to **slow the
sender**: `injected / woken / revived / failed` already has room for `failed`, with
a reason.

### 5.7 Symlink and path safety

- `canonicalize()` **before** the containment check, so symlinks and `..` are
  resolved before comparison (`mail-rust`).
- `O_NOFOLLOW`, and **re-check `ino`/`dev` before unlinking** (`agent-fleet`'s
  `task-triage-pilot-budget.ts:109` uses `O_EXCL|O_NOFOLLOW` and re-checks both).
- Component-wise symlink walk rather than one final resolve
  (`agent-fleet` `workspace-safety.js:15-28`).
- Path sanitiser strips `[^A-Za-z0-9._-]`, with `""`/`"."`/`".."` mapped to `"_"`
  **at the ownership seam**, not at the use site (`pi-cross-session`).
- An unparseable reservation pattern yields `.unwrap_or(true)` — **treated as
  overlapping**, i.e. reported as a conflict that may not exist. Conservative, and
  correct for an advisory lock.

### 5.8 Re-read ownership every tick

`sting8k` re-reads `ownsRegistration` **every tick**, never trusting a fast path,
because an mtime-based fast path **can never observe a stolen registration** — the
thief's own heartbeat keeps the record fresh.

---

## 6. Feature D — addressing

- `PeerRef` is **opaque**: a full instance id, a unique prefix ≥ 4 chars, or an
  exact name. `MIN_PREFIX = 4` is `pi-ipc`'s, commented *"shorter than this, a
  target is a guess."*
- **The endpoint is never carried in a message.** Derive it from the instance id and
  assert `stat(uid) === process.getuid()`. Three projects in the set are forgeable
  exactly because they trust a `from` field (§6.3). `pi-cross-session` recomputes
  rather than trusts; that is the shape to copy.
- **`sting8k`'s failure is worth naming precisely:** it hides the session id at
  **render time**, which is obscurity — the id is still in the file on disk, and
  the real exposure is **impersonating a peer that already exists**, which is
  exactly the multi-agent threat (§5.2).

### 6.1 Who may talk to whom

`IrcBus` already scopes with `registry.listVisibleTo`. Adopt from `sting8k` the rule
that **`$HOME` never counts as an ancestor**, so a session opened at `~` cannot see
the whole machine. The "same room or ancestor cwd" half is left as-is until there
is data on who is being locked out.

**A trap to check before shipping:** `cryptolibertus` scopes discovery to the git
root, so **a worktree link partitions the domain** and peers silently stop finding
each other (§5.3). `pi-mail` anchors to the **git common dir** instead, precisely
so worktrees share one mailbox (§5.4). Given how much of this repo is
worktree-based, follow `pi-mail`.

### 6.2 The race we cannot remove

`sting8k` documents its remaining TOCTOU and fails closed (`service.ts:385-388`):
*"a rare duplicate fails closed as ambiguous in `resolveTarget`; peer ids stay
exact."* Two processes binding at once can produce the same display name.

**Keep the part that is certain, refuse the part that is not.**

---

## 7. Feature E — transport and injection

### 7.1 Transport

Per-session Unix socket at `~/.omp/run/peer/<instanceId>.sock`, directory `0700`,
socket `0600`.

- **No broker.** A broker must stay alive to deliver, and every project with one
  learned what that costs (§6.5) — `pi-parley` loses every thread, receipt and
  mailbox when its broker exits. **The socket is a hint; the inbox is the truth**,
  which removes the broker from the failure model rather than adding it and hoping.
- Framing: 4-byte big-endian length prefix + UTF-8 JSON with a 256 KiB cap, one
  frame per connection — or newline-JSON with a 1 MiB cap. Either is fine. **The
  parser should deliver the good frame even when the next one is malformed**
  (`pi-cross-session`).
- **One drainer at a time, by rename** (`sting8k` `service.ts:322-327`): atomic on
  POSIX, only one drainer wins, losers continue.
- **Do not read `/proc` for liveness.** `pi-ipc` checks `/proc/${pid}/stat` field
  22 (`index.ts:224-232`); `/proc` is Linux-only, so on macOS the read returns
  `null` and **a session is unroutable for its entire lifetime with no retry**
  (`index.ts:148-151`). Observed on a macOS machine, not hypothesised — §6.8 in
  reverse. Use `process.kill(pid, 0)` plus a connect attempt.

### 7.2 Injection

`IrcBus` owns this and owns it well:

- **idle → real turn**, **busy → non-interrupting aside at the next step boundary**
  (`AgentSession.deliverIrcMessage`, per `bus.ts:8-9`).
- `pi-mail`'s three branches are the right shape: *steer* when busy, *wake* when
  urgent, and a **quiet nudge only when idle** — *"a nudge that interrupts cannot
  become nagging"* (§5.4).

**A peer message may wake an idle agent.** The cost is named rather than absorbed:
it requires a **session-lifetime drain timer**, or a message arriving between turns
is never noticed (`pi-team-mode` §5.7); and it makes the wake path a **real
interruption surface**, so it must respect `accept / hold / refuse` and go through
the fence — never `steer`.

### 7.3 Bounded wait, never silent

`pi-ipc` is the cautionary example and the reason for the rules: its blocking `ask`
can freeze a turn for **ten minutes producing no output**, the model **is not
warned**, Esc is the only escape, and while A is blocked, B's traffic takes the
steer path and lands mid-hang (§5.12).

So: **`wait` is opt-in, always has a ceiling, and the model is told it is blocking.**
Send is fire-and-forget by default.

---

## 8. Feature F — trust

A peer message is **input, never authority**.

### 8.1 The gate is `customType`, not `attribution`

`attribution` is a **caller-settable field** defaulting to `"agent"`
(`packages/tui/src/chat/messages.ts:162-170`), so it can never be the boundary. The
real gate:

```ts
// packages/tui/src/chat/messages.ts:282-287
export function isUserTurnInitiator(message: CustomMessage): boolean {
	return isUserInvokedSkillPrompt(message)
		|| (message.customType === COLLAB_PROMPT_MESSAGE_TYPE && message.attribution === "user");
}
```

A turn is user-initiated **only** for a skill prompt or `customType ===
"collab-prompt"`. A peer message carries its own `PEER_MESSAGE_TYPE`, so it cannot
initiate a user turn **whatever its attribution says**. `COLLAB_PROMPT_MESSAGE_TYPE
= "collab-prompt"` (`packages/wire/src/index.ts:170`) is the existing precedent: a
peer's prompt, already user-attributed.

**This must be a test, not a docblock.** A peer message asserting
`attribution: "user"` still opens no user turn. The precedent proves the *shape*,
not the safety.

- It **cannot** grant or widen a permission. Permission classes are untouched.
- Recipient-side gate: `accept` / `hold` / `refuse`, after Claude Code's
  `crossSessionInbound`. Without it, "no authority" is a sentence in a prompt
  rather than something enforced.

### 8.2 Three-layer fencing

`pi-team-mode` brackets peer content with `authority: 'peer-only'` and states that
claims inside it of user authority do not change provenance — **in the system
prompt, in the tool guidelines, and in the envelope** (§6.7).

> *Fencing at one layer is defeated by one bypass; fencing at three means a miss is
> caught twice.*

`pi-agent-teams` is the counterexample: its `---` join is **a presentation
convention, not a trust fence**, with the body interpolated unescaped and no
authority metadata (§5.8).

---

## 9. Feature G — durability and cursors

### 9.1 The constraint, stated plainly

`pi.sendMessage` and `pi.sendUserMessage` both return `void`
(`extensibility/extensions/types.ts:2211`, `:2219`). **There is no ack channel on
the public API**, so attempt-level durability is the only thing implementable
without changing a public signature. This is a constraint, not a preference.
**Nothing in this design may report a message as delivered.**

`IrcBus` already holds the right line in code — the receipt says how the message
*reached*, not what the recipient *did* with it (`bus.ts:57-59`).

### 9.2 Three states, not a boolean

From `get_message_delivery_receipt` (`messaging.rs:5247`, body at `:5286-5290`):
`persisted` (row written) → `signaled` (wake hint landed) → `acknowledged`
(recipient acted). §6.1 records five more systems reaching the same distinction
through months of incident response.

### 9.3 The most transferable idea in the study

`inbox_delivery_events` (`schema.rs:2277-2285`):

```sql
seq INTEGER PRIMARY KEY AUTOINCREMENT,
...
UNIQUE(agent_id, message_id)
```

written by a **trigger inside the same transaction** as the message
(`schema.rs:575-582`), `INSERT OR IGNORE` for idempotence, indexed
`(agent_id, seq)`.

1. **The sequence is deliberately independent of message ids.** The comment at
   `schema.rs:571-574` gives the reason: *"archive recovery and historical imports
   may preserve message ids without preserving a monitor's delivery position."* A
   cursor derived from a message id is wrong in principle.
2. **The database writes the row, not the application.** Application code can
   forget; a trigger in the same transaction cannot.

Filesystem translation: a monotonic counter per session, advanced in the same
atomic write as the message.

### 9.4 The bug in the obvious version — port the test, do not reinvent it

`sync.rs:606-631`. `seq` is a **global** autoincrement shared by every recipient, so
the gap between your cursor and your oldest event is normally **other recipients'
deliveries, not lost history**. The naive check is wrong, and the SQL shows why in
two tiers:

```sql
(SELECT MIN(seq) FROM inbox_delivery_events) AS global_oldest   -- no WHERE: global
FROM inbox_delivery_events WHERE project_id = ? AND agent_id = ? -- WHERE: per-recipient
```

The fix is a **global witness**: if seq 1 is still in the ledger, nothing has ever
been pruned, so your gap is traffic rather than loss.

> **A check that refuses when it should not is its own failure mode.** §6.1 records
> six systems choosing to refuse rather than lie; this is the seventh, where the
> refusal is itself the lie.

**Port the existing test, do not write a new one:**
`bootstrap_cursor_survives_unrelated_recipients_advancing_global_seq` (GH#238) at
`sync.rs:1464` already does exactly this. *"There must be a test"* generates a
duplicate; naming the test to port does not.

### 9.5 Retention

- **By reference, not by age** (`pi-mail` §5.4) — the best policy in the set.
- **Never prune an unacked item** (`pi-team-mode` §5.7).
- **State the horizon.** `pi-parley` caps at 8,192 records and evicts
  `not_delivered` first — past that the barrier forgets. Keep `outcomeKnown` and
  `retryable` **separate from state**; without that separation a safe retry is not
  expressible. A durability guarantee is a function, and its domain has an edge.

---

## 10. What is deliberately **not** copied

### 10.0 Read every `mail-rust` concurrency claim as engine-conditional

Verified by hand: the engine is **not SQLite**. `Cargo.toml:212-225` pins `fsqlite` /
**FrankenSQLite** (`Dicklesworthstone/frankensqlite` rev `2633b38a…`) across ~14
crates including `fsqlite-mvcc`. The concurrency model rests on a pragma that **does
not exist upstream**:

```rust
// crates/mcp-agent-mail-db/src/pool.rs:7098
pub const AUTOCOMMIT_CONCURRENT_MODE_PRAGMA: &str = "PRAGMA fsqlite.concurrent_mode = ON;";
```

`pool.rs:7126-7135` **fails startup** unless it reads back `1`, and `:7099-7101`
documents the values: `-1` not observed, `0` serialized, `1` **MVCC concurrent**.

Its own `docs/VISION.md` (verified) qualifies it three ways: `BEGIN CONCURRENT` is
opt-in **"pending the upstream MVCC snapshot-drift fix"**; **85 `BEGIN IMMEDIATE`
sites remain**, so most explicit transactions are still fully serialized; and
**"a serialized-autocommit A/B has not been run."**

So this is **the least-proven mechanism in that project, not the strongest** — an
unresolved one, with snapshot drift named as the open bug. One thing about it is
still worth copying: the mode is **pinned explicitly** rather than inherited, so an
upstream default flip cannot silently change the write path.

Two consequences:

1. **Its locks are not portable.** Every lock is `flock(2)` via `fs2`. Node has no
   `flock`. Worse, `flock` semantics differ by platform — **per
   open-file-description on Linux, per *process* on BSD/macOS** — so on our target
   platform a second `open`+`flock` in the same process **succeeds** and silently
   converts a shared lock to exclusive. `mail-rust` pays for this with a two-tier
   scheme (in-process refcounts shadowing the flock, `server/lib.rs:1341-1353`),
   which its own design doc attributes to exactly this
   (`docs/DESIGN_git_lock.md:141`). **Copy the flock half without the shadow half
   and the lock lies on our own platform.**
2. **`run_with_mvcc_retry` retries MVCC conflicts, not `SQLITE_BUSY`.** A TypeScript
   port has no MVCC, so §9's retry reasoning must be re-derived, not inherited.

What survives is the part that never needed an engine: **no daemon, open the durable
layer directly, spawn nothing** (§6.5).

**Rule: a concurrency claim sourced from `mail-rust` must always be read with
*which engine did it assume?* and *has its A/B actually been run?***

### 10.1 Licence

`mcp_agent_mail_rust` is **MIT with an OpenAI/Anthropic rider** — Anthropic PBC is a
named Restricted Party, and "use" is defined to include analysing. **We read it; we
do not copy from it.** `pi-peer-messaging` carries the same rider. `pi-mail` is
**GPL-3.0 — no code**. `pi-mesh` declares MIT in npm with **no `LICENSE` file**.

Every idea above is re-expressed in this repo's idiom — TypeScript, filesystem,
existing `IrcBus`. No Rust, no SQL, no file is ported. Recorded so a later reader
cannot mistake "informed by" for "derived from".

### 10.2 On the merits

| Not doing | Why |
| --- | --- |
| A broker daemon | §6.5 — `pi-parley` loses all state when it exits |
| `foreign_keys = OFF` | `mail-rust` sets it; the schema looks relational, the behaviour is not |
| Authorisation-free approval | `respond_contact` performs none, voiding `contacts_only` |
| A boundary declaration nobody reads | `PEER_MESSAGING_BOUNDARY` encodes eleven invariants whose **only** consumer is a test asserting the contract against its own literal — *a gate that cannot fail is worse than no gate* (§5.10) |
| An unversioned wire protocol | `pi-peer-messaging` has no handshake and no capability exchange; skew surfaces as `Unknown client message type: presence` and a dead socket |
| Re-execution to verify | §6.8 — `agent-fleet` records what the child ran; re-running would not prove the child ran it |
| Substring duplicate detection | `armory-mesh`'s `title === title` — false negatives in exactly the place that matters |
| `serve()` with no namespace and no unregister | `pi-mesh` — last-writer-wins by type (§5.9) |
| A lock that never expires with a silent release | `agent-fleet` — deliberate, but a torn body wedges forever with no diagnostic |
| A pid-only temp name | `transaction.js:82` — a recycled pid fails `EEXIST` forever |

---

## 11. Provenance — which reference contributed what

| Decision | From |
| --- | --- |
| In-process bus, four receipt outcomes, no-double-delivery | **ours (`irc/`)** |
| Socket is a hint, inbox is the truth | `mcp_agent_mail_rust` §5.5 |
| Durable record separate from a lossy hint | `mcp_agent_mail_rust` §5.5 |
| `WHERE EXISTS` guard; digest not path; route in the key | `mcp_agent_mail_rust` |
| Reap on four corroborating signals; positive life vetoes | `mcp_agent_mail_rust` `reservations.rs` |
| TTL clamped both ends, and the clamp warns | `mcp_agent_mail_rust` `macros.rs` |
| Notify the previous holder on a forced release | `mcp_agent_mail_rust` |
| Closed name space, 9,900 names, role-free | `mcp_agent_mail_rust` `models.rs` |
| Two verbs: update vs mint-fresh | `mcp_agent_mail_rust` |
| Token echo priced in the response | `mcp_agent_mail_rust` |
| Monotonic sequence independent of message ids, in-transaction | `mcp_agent_mail_rust` `schema.rs` |
| Global-witness cursor; port GH#238's test | `mcp_agent_mail_rust` `sync.rs` |
| Three delivery states | `mcp_agent_mail_rust` |
| No daemon; durable layer must not need one | `mcp_agent_mail_rust`, `pi-team-mode` |
| Stale socket reclaim: probe, unlink, rebind | `armory-mesh` `probeStale` |
| Two overlapping liveness mechanisms | `armory-mesh` |
| Election by kernel lock | `pi-parley` `.process.lock` |
| Anti-ABA epoch per registration | `pi-parley` `endpointEpoch` |
| Retention horizon; `outcomeKnown`/`retryable` separate | `pi-parley` |
| Recompute the path, never trust the registered one; uid prefix | `pi-cross-session` |
| Only `ESRCH` is death | `pi-cross-session` |
| Liveness is a real socket probe, not a TTL | `pi-cross-session` |
| Malformed frame does not lose the good one | `pi-cross-session` |
| Path sanitiser with `$HOME` excluded from ancestors | `pi-cross-session` |
| File-per-message; `sort()` is the order; tmp+rename `0600`/`0700` | `pi-ipc` |
| `MIN_PREFIX = 4`; refuse ambiguity | `pi-ipc` |
| **Never read `/proc` for liveness** | `pi-ipc` — a bug to avoid |
| Blocking `wait` freezes a turn silently | `pi-ipc` — a hazard to avoid |
| Three-layer peer fencing | `pi-team-mode` |
| Session-lifetime drain timer | `pi-team-mode` |
| Never prune an unacked message | `pi-team-mode` |
| Two-phase claim by rename | `sting8k` |
| Two observations five minutes apart before sweeping | `sting8k` |
| `$HOME` never an ancestor | `sting8k` |
| Refuse the uncertain part, keep the certain part | `sting8k` |
| Re-read ownership every tick, not on a fast path | `sting8k` |
| `fsync` file **and** directory | `agent-fleet` |
| `requestId` + intent hash → hard idempotency conflict | `agent-fleet` |
| `O_NOFOLLOW` + `ino`/`dev` re-check before unlink | `agent-fleet` |
| Component-wise symlink walk | `agent-fleet` |
| Re-verify authority from disk on every write | `pi-agent-teams` |
| Steer / wake / quiet nudge only when idle | `pi-mail` |
| Anchor to git **common** dir, not worktree root | `pi-mail` |
| Prune by reference, not by age | `pi-mail` |
| `accept` / `hold` / `refuse` inbound | Claude Code |
| "A message is input, never authority" | Claude Code |
| Delivery is a typed value, not an inference | `pi-peer-messaging` |
| Naming as a pure function of session id | `pi-mesh` |
| HKDF per-audience keypairs (future cross-machine, no seam change) | `pi-chat` |

---

## 12. Dependency order

Not phases — each step's output is a precondition for the next, and all of them
land.

**The filesystem layer**, testable with no agent at all:

1. **Identity** — closed name space, allocation under lock, composite address.
   *Test:* a name outside the space is rejected; two live allocations never collide.
2. **Durable write helper** — tmp+rename, `fsync` file, `fsync` directory, `0600`
   in `0700`, unguessable temp suffix.
   *Test:* crash between rename and directory fsync leaves a readable file; a torn
   write is never observable.
3. **Inbox** — one file per message, monotonic counter, `${seq}-${envelopeId}.json`.
   *Test:* `sort()` is the delivery order; a crash mid-write leaves no torn file.
4. **Presence + reaper** — registration, four-signal corroboration, `ESRCH`-only
   death, two observations five minutes apart, `stale_reasons[]`.
   *Tests:* a sleeping-laptop simulation is **not** reaped; `EPERM` is **not**
   death; four signals must agree before anything is removed.
5. **Locks** — election, rename claim, TTL lease, **fencing token**.
   *Tests:* a lease holder that outlives its TTL and returns is **rejected** on
   write; two processes cannot both claim the drain.
6. **Cursor** — monotonic sequence independent of any message id, global-witness
   expiry. *Test:* port GH#238's
   `bootstrap_cursor_survives_unrelated_recipients_advancing_global_seq`.

**The transport layer**, testable with two processes and no model:

7. **Socket** — per-session UDS, framing, malformed-frame tolerance, stale reclaim.
   *Test:* a wake hint that collides loses nothing.
8. **`PeerTransport`** — the interface, wired into `IrcBus`'s optional constructor
   parameter.

**The model-facing layer**, where injection is the risk:

9. **Injection** — idle turn, busy aside, session-lifetime drain, `wait` bounded
   and warned.
10. **Fence** — `PEER_MESSAGE_TYPE`, three-layer bracketing, `accept`/`hold`/`refuse`.
    *Test:* a peer message asserting `attribution: "user"` opens no user turn.
11. **Retention** — by reference, never prune unacked, stated horizon.

**Housekeeping:** rename `collab-web`'s human-guest `peer` terminology to `guest`,
in its own commit.

---

## 13. What this buys

| | Before | After |
| --- | --- | --- |
| Agent in session 1 → session 2 | **impossible** | addressed and delivered |
| Message to a parked session | no such concept | waits on disk until it returns |
| Message wakes an idle agent | no | yes |
| Files released after a crash | unmeasured | reaped on a probe, with reasons |
| Two agents both believing they own one thing | **possible** | fencing token rejects the stale writer |
| Inbox surviving power loss | no fsync | fsync file **and** directory |
| An agent naming itself a role | `DatabaseMigrator` allowed | 9,900 role-free names |

**And the thing under all of it: two agents talk without a human relaying.** In one
session of this work that happened six times by hand — each time via `SendMessage`,
then waiting, then restating in prose. That is exactly the work this package
automates, and what it changes is not that agents can speak but that **the
repository's own sessions stop depending on me to carry messages between them.**

**Out of scope, deliberately:** cross-machine (owner-set to same machine), and no
public extension seam for peer — the transport is wired by the host into `IrcBus`,
not exposed to third-party extensions.

## 14. Open — the owner's

1. **A row in `docs/core-seams.md`?** Additive, not a modification — but a
   commitment, and `ultraworkers-d9` rightly declined to propose it.
2. **Retention policy** — §9.5 recommends by-reference plus an unacked guard.
   Accept, or change before implementation?
3. **Overflow** — §5.6 recommends slowing the sender over dropping. That changes
   current `IrcBus` behaviour.
4. **Rename `collab-web`'s guest terminology** — out of scope here, queued after.