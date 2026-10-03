# Peer message — agent ↔ agent, cross-session — the plan

Written 2026-10-04. Companion to [`peer-messaging.md`](./peer-messaging.md), the
fourteen-project study this is built from; §-references point into it.

**Owner-set:** same machine only. Learn the best of every reference rather than
port any of them.

**Why this exists.** Claude Code's cross-session messaging is genuinely good and is
the closest working model to what we want. It is also missing the entire file
lifecycle: it registers a socket at `/tmp/cc-socks/<PID>.sock` and **never
releases it**, has no collision handling, no locking, no reclaim, and no way to
tell a live registration from a corpse. That gap is the reason for this plan —
not the transport, which Claude Code already gets right.

**What changed on 2026-10-04, and why.** An earlier draft concluded that no core
change was needed. That was wrong, and it was wrong in the exact way this repo's
own docs warn about: it was inferred from the *absence* of a cross-session API
without checking whether an agent-to-agent bus already existed. One did —
`packages/coding-agent/src/irc/`, 479 lines, complete, in-process. Everything below
is built on it.

---

## 1. What already exists — `irc/`

`packages/coding-agent/src/irc/` is **already** agent-to-agent messaging. It is not
human collab. Read these two files before designing anything:

- `irc/bus.ts` (377 lines) — `IrcBus`, the process-global mailbox bus
- `irc/messaging.ts` (102 lines) — the `send` / `wait` tool surface

It already has most of what the fourteen projects had to build:

| Capability | Where | Note |
| --- | --- | --- |
| Receipt with four outcomes `injected / woken / revived / failed` | `bus.ts:97-186` | `revived` distinguishes a parked recipient from a live one |
| *"the receipt reports how the message reached the recipient … not what they did with it"* | `bus.ts:57-59` | The delivery-honesty statement, already written |
| Refusals with a specific cause — unknown / hard-aborted / **read-only advisor** / no live session | `bus.ts:99-120` | Never a bare `false` |
| Parked recipients revived through `AgentLifecycleManager` | `bus.ts:137-153` | |
| `wait()` with timeout, abort signal, **and liveness** — aborts when the sender stops running | `bus.ts:271-284` | |
| Visibility scoping via `registry.listVisibleTo(senderId)` | `messaging.ts:64` | The §4.1 scoping rule already exists |
| Mailbox cap 100, drop-oldest, **logs what it dropped** | `bus.ts:304-319` | |
| No double-delivery — a delivered message never lingers in the mailbox | `bus.ts:61-66` | |
| Snowflake ids | `bus.ts:74` | Collision-free, time-sortable |
| Self-send refused; `to === "all"` broadcast | `messaging.ts:55-57, 64` | |

### 1.1 The one thing it lacks

`#mailboxes` is a `Map` in process memory. `IrcBus.global()` is a process
singleton. `AgentRegistry` is per-process.

**Agent A in session 1 cannot message agent B in session 2.** Not a design gap —
there is no transport between processes, so there is nothing to route over.

**The whole of this plan is that one hole.**

### 1.2 Why a new package would be the wrong answer

Building a fresh A2A package discards the receipts, the refusal taxonomy, the
visibility scoping, the parked-revive lifecycle and the no-double-delivery
discipline — i.e. precisely the parts of this codebase that are already better
than most of the fourteen references. **We add a transport. We do not write a
second bus.**

---

## 2. The shape

```
session A                          session B
┌──────────────────────────┐       ┌──────────────────────────┐
│ IrcBus (existing)        │       │ IrcBus (existing)        │
│   ↕ transport iface      │       │   ↕ transport iface      │
│ PeerTransport (NEW)      │◄─────►│ PeerTransport (NEW)      │
│   ├ UDS wake socket      │       │   ├ UDS wake socket      │
│   └ inbox writer ────────┼──────►│   └ inbox reader         │
└──────────────────────────┘  files└──────────────────────────┘
```

**The socket is a hint. The inbox is the truth.**

That single sentence is the design. It is the lesson from `mcp_agent_mail_rust`'s
signal collision (§4.1) applied to transport, and it resolves the delivery/offline
tension without a broker: a live session is woken over the socket; a parked or
absent session still has its messages waiting on disk when it returns.

**No broker.** A broker must stay alive to deliver, and every project that had one
learned what that costs (§6.5) — `pi-parley` loses every thread, receipt and mailbox
when its broker exits. Here the broker would be the *only* path to a parked peer.

### 2.1 The core change, which is small and additive

`IrcBus`'s constructor is already dependency-injected — tests call
`new IrcBus(agents)`, and the signature is `(registry, lifecycle?)`. Adding a
third **optional** parameter is backward-compatible:

```ts
interface PeerTransport {
  deliver(target: AgentRef, message: IrcMessage): Promise<TransportOutcome>;
}
```

Default remains the current in-process path, so nothing changes for a single
session. This is additive, not a modification of the core list's existing rows —
and `CHANGELOG.md:1413` already names peer messaging as the intended extension
bridge, so the direction is sanctioned.

**Owner decision, and it is the only one that needs one:** adding a row to
`docs/core-seams.md`. `ultraworkers-d9` was asked and explicitly declined to
propose it, on the grounds that the file is a contract document and a new row is a
commitment. That boundary is respected here.

### 2.2 Yes — own package. The owner's call, and mine was wrong

An earlier draft recommended *against* a package, on the reasoning that the
transport is only a few hundred lines and a package adds an export surface for
nothing. That was wrong, and the reason it was wrong is structural rather than
numerical:

**Everything the transport needs to do is filesystem work, and none of it needs an
agent.** Reaping a stale registration on four-signal corroboration, two-phase claim
by rename, fencing tokens, atomic tmp+rename, symlink defence, monotonic cursors,
retention with an unacked-item guard — none of that mentions `IrcBus`, `AgentRegistry`
or a turn. Putting it inside `coding-agent/src/irc/` means none of it can be tested
without booting a whole agent, and none of it can be reused.

```
packages/peer-bus/            ← owns the filesystem, knows nothing about IrcBus
  transport/    socket, inbox, reaper
  locking/      election, claim, fencing token
  naming/       closed name space, allocation
  cursor/       monotonic sequence, expiry witness
```

The boundary rule is one sentence: **the package owns everything that touches the
filesystem; `IrcBus` keeps everything in memory.** They meet at `PeerTransport`, which
is one interface with one method. The package has no dependency on `coding-agent`,
and `coding-agent` depends on the package — which is the normal direction, and is why
the core change in §2.1 stays three lines.

A second reason to keep it separate: this is the code where a bug is **silent**. A
reaper that fires early, or a fencing token that is not checked, does not throw — it
lets two agents believe they own the same thing. That class of bug is cheapest to
catch in a package with its own test suite and no agent in the loop.

---

## 3. File lifecycle — RELEASE

*The thing Claude Code does not do at all.*

### 3.1 Stale socket reclaim

Claude Code registers `/tmp/cc-socks/<PID>.sock` and never removes it, so a crashed
session leaves a socket file that later looks routable. `armory-mesh` has the
reclaim: `probeStale` — **connect with a 250 ms timeout, treat failure as stale,
unlink, rebind** (§5.5). Adopt verbatim.

### 3.2 A reap needs corroboration from independent signals

The naive rule — registration older than TTL, so reap — is wrong twice over:

- A **sleeping laptop** looks exactly like a dead one. `sting8k` requires **two
  observations five minutes apart** (`DEAD_SESSION_SWEEP_MS`) before sweeping.
- A **permission error is not death**. `pi-cross-session` treats **only `ESRCH`**
  as death: being unable to signal a process is not evidence it exited (§5.1).

`mcp_agent_mail_rust` has the most careful version — `force_release_file_reservation`
(`reservations.rs:2689`) validates **four independent signals** and requires them to
agree:

```rust
// reservations.rs, ~2852
let all_signals_stale = agent_inactive && mail_stale && !recent_fs && !recent_git;
```

Two properties worth copying exactly:

1. **`!recent_fs && !recent_git` is a veto.** Positive evidence of continued life
   blocks the reap, even when the registration has expired. Absence of evidence
   never kills; only corroborated absence does.
2. **It returns `stale_reasons[]`** — the release is *explainable*. Same principle
   as `pi-team-mode`'s `reasons[]`.

Adopt four signals here: **registration age · pid probe · socket probe · peer
liveness**. All four must agree before a reaper removes anything, and the reason
list is returned to whoever asked.

### 3.3 Never take a reap on permission

From §3.2: an `EPERM`/`EACCES` is not death. Only `ESRCH` is. A reap that cannot
tell them apart will reap live sessions it is not allowed to signal.

### 3.4 Notify the previous holder

`force_release_file_reservation` takes `notify_previous` (default true) and sends
the new holder a message summarising the heuristics. Forced release is destructive
to someone else's claim, so it must leave a trace. This reuses `IrcBus` itself.

### 3.5 TTL is clamped, and both ends are logged

```rust
// build_slots.rs:465 — 1 hour default
let ttl = ttl_seconds.map_or(3600, |t| t.clamp(60, 31_536_000)); // [60s, 1 year]
```

And the clamp **warns** rather than silently correcting (`macros.rs:231-237`).
Unbounded TTLs turn a crashed holder into a permanent lock; a TTL too short turns a
live slow holder into a released one. Both directions get a named constant and a
log line.

### 3.6 Liveness is a probe, not a timestamp

`pi-cross-session` reads every valid registration and **does not filter on
`updatedAt`**; `livePeers` opens the real socket with a 350 ms timeout (§5.1).
`pi-team-mode` uses `process.kill(pid, 0)`. Neither trusts an age field alone.

### 3.7 Anchoring

`pi-mail` anchors its store to the **git common dir**, not the worktree root, so
worktrees share one mailbox (§5.4). `cryptolibertus` scopes to the worktree root and
therefore **a worktree link partitions the domain** — peers silently stop finding
each other (§5.3). This repo is heavily worktree-based, so follow `pi-mail`.

---

## 4. File lifecycle — COLLISION

### 4.1 The lesson, from `mcp_agent_mail_rust`

A recipient's `.signal` file is a debounced latest-state indicator whose key is
`(signals_dir, project, agent)` — **not per message**. Two messages within 100 ms
produce **one** signal file; the second overwrites the first. No message is lost —
they are in the database — but a *hint* is.

The interesting part is the fix, which is **not** making the file better:

```rust
// schema.rs:2318-2322
// A recipient's `.signal` file is a debounced latest-state indicator and
// cannot prove which of several concurrent messages it represents. Keep
// the durable, append-only observation separate from that mutable file so
// callers can distinguish a persisted message from one whose signal write
// actually completed for this exact recipient and route.
```

**When a lossy channel is unavoidable, do not try to make it lossless — make the
durable record independent of it and let the lossy channel be only a hint.**

The compensation table, `message_delivery_signal_receipts`, PK
`(message_id, agent_id, delivery_route)`, written `INSERT OR IGNORE … WHERE EXISTS
(SELECT 1 FROM message_recipients WHERE …)`:

- **`WHERE EXISTS`** — a receipt is not proof the signal was written; it is proof the
  message-recipient pair is real.
- **`signal_path_digest`, not the path** — storing the path would turn evidence into
  a re-identification vector.
- **`delivery_route` in the PK** — one `(message, agent)` pair can travel by more
  than one route.

Net: `persisted` ≠ `signaled` ≠ `acknowledged`, and **the middle state is the one
that collides**.

Applied here: the socket event is a hint. **The inbox file is the fact.** A wake hint
that collides loses nothing.

### 4.2 Collision avoidance, ranked by how much it costs

| Mechanism | Source | Why |
| --- | --- | --- |
| Snowflake ids | `irc/bus.ts:74` (already ours) | Time-sortable, collision-free, no coordination |
| Atomic tmp+rename, `0600` in `0700` | `pi-ipc`, `sting8k` | No queue that can tear |
| One file per message, `${seq}-${envelopeId}.json` | `pi-ipc` | `sort()` **is** the delivery order |
| `UNIQUE` + `INSERT OR IGNORE` | `mail-rust` | Retry is idempotent |
| Refuse an ambiguous target; never pick one | `pi-ipc`, `sting8k` | §6.1 |

### 4.3 Two-phase claim by rename

`sting8k` (`service.ts:322-327`) claims the drain by `rename` — atomic on POSIX,
only one drainer wins, losers `continue` (§5.2). This is the filesystem mutex, and
it needs no lock file at all.

**The counterpart subtlety:** `ownsRegistration` is re-read **every tick**, never
trusted on a fast path, because an mtime-based fast path **can never observe a
stolen registration** — the thief's own heartbeat keeps the record fresh.

### 4.4 A race we cannot remove — refuse, don't guess

`sting8k` documents its remaining TOCTOU and fails closed (`service.ts:385-388`):
*"a rare duplicate fails closed as ambiguous in `resolveTarget`; peer ids stay
exact."*

Two processes binding at once can produce the same display name. The disposition is
the lesson: **keep the part that is certain, refuse the part that is not.** The
exact peer id stays unique; the ambiguous name is refused, never guessed.

### 4.5 Bounded memory, and log what you drop

`IrcBus` already caps the mailbox at 100 and logs the drop
(`bus.ts:304-319`). Keep it, and apply the same rule to any new map: **a cap
without a log line is a silent data loss.**

---

## 5. File lifecycle — LOCKS

Three different things, and conflating them is a common bug.

| Kind | Purpose | Mechanism | Source |
| --- | --- | --- | --- |
| **Election** | exactly one owner per role | kernel lock on a lock file | `pi-parley` `broker.ownership/.process.lock` — whoever wins the kernel lock becomes the broker |
| **Mutual exclusion** | one drainer at a time | two-phase claim by `rename` | `sting8k` |
| **Scoped lock** | hold a resource across turns | TTL lease, clamped both ends | `mail-rust` reservations |

- **Election lock must be a real kernel lock**, not a file whose existence means
  "held" — that has no atomic test-and-set. Whoever wins *is* the owner, and the
  losers take the alternate path rather than retrying.
- **Any lock needs a TTL and a reaper.** `mail-rust` clamps to `[60s, 1 year]` and
  warns on clamp. A lock with no TTL converts a crash into a permanent deadlock.
- **Re-read authority from disk on every write**, not just at acquire.
  `pi-agent-teams` does exactly this (`worker.ts:206-215`) — its write side is gated
  even though its read side is not (§5.8).
- **`parley`'s `endpointEpoch`** — a fresh UUID per registration, mismatch is
  `E_TARGET_REBOUND` — is an **anti-ABA** measure. If the target re-registers
  between your read and your write, the epoch tells you. Worth carrying.
- `mail-rust` also runs a **global activity lockfile** that both stdio and HTTP must
  contend for. With UDS-only transport we have one path, so this cost disappears —
  which is an argument for same-machine scope.

### 5.1 The fourth kind: fencing — and a TTL lease alone is not enough

The three kinds above are all **mutual exclusion**. A TTL lease is *not* safe on
its own, and the reason is worth stating precisely, because it is the failure this
repo has already paid for.

A lease says *"I hold until T."* But the holder **can still be alive at T** — the
machine slept, a GC ran long, a debugger held the process. It comes back, still
believes it holds, and overwrites whoever replaced it. **A TTL decides who is
*considered* dead. It does not decide who is *prevented from writing*.**

> **Fencing:** every acquisition issues a **monotonically increasing token** from
> the store; every write must carry that token; the store **rejects a stale token**.

Without it, kind #3 above is a hope rather than a guarantee.

**This is not hypothetical here.** `epic-z4zg` (P1, open) records it: on this shared
tree, `git add <path>` stages the *entire current file content*, so one session's
`git add` put another session's lines into the index, and a third session's bare
`git commit` committed the whole index. `.git/index.lock` did its job perfectly —
it stopped two processes writing at once — and that was **not sufficient**, because
nothing stopped a value staged by one session being read as valid by another. The
recorded rule is three-tier, and only the third is actually yours:

```
git commit <paths>         → SWEPT directories you do not own      ✗
git commit --only <path>   → your path, but the WHOLE file          ⚠️
hash-object + update-index → only the lines you actually produced    ✓
```

**Distinct from reaping.** `force_release_file_reservation` uses external
heuristics — the holder is inactive, no recent mail/git/filesystem activity — to
free a slot. It does **not invalidate the holder**. A force-released agent whose
in-flight write lands afterwards is a **zombie writer**, and nothing on the write
path asks it. Age is a heuristic; a token is a guarantee. `lsof` decides whether
something is held *now*; it cannot decide whether it is still *valid*.

### 5.2 A fifth, only if we ever hold two leases

**Lock ordering.** A TTL lease does not prevent deadlock: A holds X wants Y, B
holds Y wants X, and both sit there until the TTL expires and both lose their work.
Cheapest fix is a **total order on resource names** — always acquire in name order
— which is far cheaper than deadlock detection.

Only write this down if some path in the plan holds more than one lease. **One lease
per agent makes ordering meaningless.**

### 5.3 Overflow is a send-side problem, not a drop

`IrcBus` caps its mailbox at 100 and drops the oldest, with a log line
(`bus.ts:304-319`). Drop-oldest is a **data-loss policy**, and the log only proves
we know we lost something.

For a mailbox that *is* the truth, drop may be legitimate — that is what mailboxes
do. But on overflow the honest move is to **slow the sender, not silently drop**.
`injected / woken / revived / failed` already has room for it: a full recipient is
`failed`, with a reason.

---

## 6. Addressing and identity

- `PeerRef` is **opaque**: a full instance id, a unique prefix ≥ 4 chars, or an
  exact name. `MIN_PREFIX = 4` is `pi-ipc`'s, commented *"shorter than this, a target
  is a guess."* §4.4 governs ambiguity.
- **The endpoint is never carried in a message.** Derive it from the instance id and
  assert `stat(uid) === process.getuid()`. Three projects in the set are forgeable
  exactly because they trust a `from` field (§6.3). `sting8k` hides the session id at
  **render time**, which is obscurity — the id is still in the file on disk, and the
  real exposure is **impersonating a peer that already exists**, which is exactly the
  multi-agent threat (§5.2).
- `pi-cross-session`'s rule, worth stating verbatim in the code:
  *"usernames from the launch environment are not identities and must not affect
  peer validation."* Four anti-collision layers: `randomBytes(16)`, namespace from
  `sha256(agentDir)`, a **uid prefix** so another user on a shared `/tmp` cannot
  overwrite the entry, and the namespace inside the Windows pipe name.
- **Naming may be a pure function of the session id** (`pi-mesh` uses FNV-1a over a
  58-word list), so a reload preserves identity with nothing persisted (§5.9).
- Visibility scoping already exists — `registry.listVisibleTo` (§1). `sting8k` adds
  the rule worth adopting: same room or ancestor cwd, and **`$HOME` never counts as
  an ancestor**, so a session opened at `~` cannot see the whole machine (§5.2).

### 6.1 Every agent needs a name — and ours are currently session-local

**Owner decision: yes, each agent carries its own name.** The machinery is already
here:

```ts
// packages/coding-agent/src/task/output-manager.ts:112-117
 * @param id Requested ID (e.g., "Anna")
 * @returns Unique ID ("Anna" first, then "Anna-2", "Anna-3", …)
async allocate(id: string): Promise<string> { … }
```

and `task/index.ts:748` feeds it `spawn.name?.trim() || generateTaskName()`. The
main agent is `"Main"` (`packages/tui/src/overlays/agent-hub-types.ts:5`).

**Two properties of this scheme do not survive crossing a process boundary:**

1. **Uniqueness is per-session.** The allocator is an `OutputManager` owned by one
   session, so two sessions each spawning an agent named `Anna` both get `Anna`.
   Cross-session, that is a silent collision between two live peers.
2. **`Anna-2` is disambiguation, not identity.** It encodes *how many* same-named
   agents that one session happened to create. It is not stable, and it is not
   meaningful to another process.

So the name must be resolved against a **machine-scoped** namespace, and the
addressing key must carry the instance, not just the name. Two workable shapes:

- **(a) machine-scoped name allocation** — `Anna` is unique across every live
  session, so the name alone addresses. Needs its own lock (§5) to be race-free.
- **(b) composite address** `{ instanceId, name }` — no new allocator, and
  **ambiguity is impossible by construction** rather than by check.

**Prefer (b).** It is §6.6's derived-ownership lesson: making the mistake
unrepresentable beats validating against it, and it needs no cross-session lock to
stay correct. (a) is nicer to type and reintroduces exactly the allocation race
that §5 exists to handle.

Either way the name must be **discoverable but not guessable into someone else's
identity** — §6.3's impersonation risk, and `sting8k`'s exact failure.

### 6.2 `mcp_agent_mail_rust` solves this better than either of us

Its name space is **closed and enumerable**: `VALID_ADJECTIVES` is **75** words,
`VALID_NOUNS` is **132**, and a name is valid **iff it decomposes into a known
adjective and a known noun**. `split_valid_agent_name`
(`mcp-agent-mail-core/src/models.rs:887-917`) tries every adjective length in
descending order and binary-searches each half against sorted lookup tables.
`normalize_agent_name` (`:588`) canonicalises to `PascalCase`, so names are
**case-insensitively unique**.

**75 × 132 = 9,900 names.** On one machine, with dozens of live agents, that is
generous — and crucially, **exhaustion is a finite, measurable event** rather than a
surprise. You can compute the collision probability instead of discovering it.

Three properties transfer, and the third is why this matters more than the ergonomics:

1. **The name space contains no role words.** The tool contract states it outright:
   *"INVALID examples: `BackendHarmonizer`, `DatabaseMigrator`, `UIRefactorer` … names
   should be memorable identifiers, not role descriptions."* A descriptive name is a
   claim about what the agent does, which goes stale, and it lets an agent claim a
   role it does not hold.
2. **No counter suffix.** `GreenLake` is one name, not a family. `Anna-2` encodes
   occurrence order, which is not identity and is not meaningful to another process.
3. **It makes impersonation by name structurally impossible.** With a free-form name,
   any agent may call itself `DatabaseMigrator`, or another agent's name. With a
   closed space, **the complete set of claims an agent can make in its own name is
   enumerable, role-free, and contains nothing to impersonate with.** That is §6.3's
   impersonation risk closed at the naming layer rather than at the permission layer.

**This replaces the composite-address recommendation above.** Adopt the closed name
space, machine-scoped, case-insensitively unique — and keep `{ instanceId, name }` as
the *transport* address so a stale socket is still attributable. The name becomes the
human-facing identity; the composite stays the wire identity.

Note the asymmetry that makes this trustworthy: registration in `mail-rust` can be
strong — there is an **optional Ed25519 proof gate** that binds identity, project,
program, model and capability scope, and **fails closed** when enabled — while its
*send* path has no gate at all (§5.11). Good naming does not fix a missing
authorisation check; it just removes one whole class of attack before it starts.

### 6.3 Naming hygiene worth stealing verbatim

- **`return_registration_token: false`** exists so a secret is not echoed into MCP
  scrollback — and the contract is honest that opting out costs you
  `verified_sender: false` unless you obtain the token another way. A capability whose
  absence is *priced* in the response is a better contract than one that silently
  degrades.
- `register_agent` **updates** an existing identity; `create_agent_identity` **always
  creates a new one**. Two verbs, so "reuse" and "spawn fresh" cannot be confused.

---

## 7. Injection

**Owner decision: a peer message may wake an idle agent. Yes, definitely.**

That is not free, and the cost is named rather than absorbed:

- it requires a **session-lifetime drain timer**, not only turn-boundary drains, or a
  message that arrives between turns is never noticed (`pi-team-mode` §5.7);
- it makes the wake path a **real interruption surface**, so it must respect
  `accept / hold / refuse` (§8) and must go through the fence, never `steer`.

`IrcBus` already owns the mechanics:

- **idle → real turn**, **busy → non-interrupting aside at the next step boundary**
  (`AgentSession.deliverIrcMessage`, per `bus.ts:8-9`).
- `pi-mail`'s three branches are the right shape and worth matching: *steer* when
  busy, *wake* when the peer is urgent, and a **quiet nudge only when idle** —
  *"a nudge that interrupts cannot become nagging"* (§5.4).
- `pi-team-mode` runs a **session-lifetime timer** so a message arriving between
  turns **wakes the agent** (§5.7). If a peer message should be able to start work,
  the drain must not only happen at turn boundaries.
- **Warn the model.** `pi-ipc`'s worst case is a turn frozen for ten minutes
  producing nothing, undocumented, with Esc as the only escape — and while A is
  blocked, B's traffic takes the steer path and lands mid-hang (§5.12).

---

## 8. Trust and authority

A peer message is **input, never authority**.

- It **cannot** initiate a user turn. The gate is `customType`, not `attribution` —
  `attribution` is a caller-settable field defaulting to `"agent"`
  (`packages/tui/src/chat/messages.ts:162-170`), so it can never be the boundary.
  The real gate:

  ```ts
  // packages/tui/src/chat/messages.ts:282-287
  export function isUserTurnInitiator(message: CustomMessage): boolean {
  	return isUserInvokedSkillPrompt(message)
  		|| (message.customType === COLLAB_PROMPT_MESSAGE_TYPE && message.attribution === "user");
  }
  ```

  A peer message carries its own `customType`, so it cannot open a user turn
  **whatever its attribution says**. `COLLAB_PROMPT_MESSAGE_TYPE = "collab-prompt"`
  (`packages/wire/src/index.ts:170`) is the existing precedent: a peer's prompt,
  already user-attributed.

  **This must be a test, not a docblock.** Peer message asserting
  `attribution: "user"` still opens no user turn. `ultraworkers-d9`'s warning is
  right: the precedent proves the *shape*, not the safety.

- It **cannot** grant or widen a permission.
- Recipient-side gate: `accept` / `hold` / `refuse`, after Claude Code's
  `crossSessionInbound`. Without it, "no authority" is a sentence in a prompt rather
  than something enforced. Only Claude Code has it.
- Fence peer content in **three layers** — envelope, bracketed body delimiter, and a
  session notice — because *fencing at one layer is defeated by one bypass; fencing
  at three means a miss is caught twice* (`pi-team-mode` §6.7). `pi-agent-teams` is
  the counterexample: its `---` join is **a presentation convention, not a trust
  fence**, with the body interpolated unescaped and no authority metadata (§5.8).

---

## 9. Durability and cursors

### 9.1 The constraint, stated plainly

`pi.sendMessage` and `pi.sendUserMessage` both return `void`
(`extensibility/extensions/types.ts:2211`, `:2219`). **There is no ack channel on
the public API**, so attempt-level durability is the only thing implementable
without changing a public signature. This is a constraint, not a preference.
**Nothing in this design may report a message as delivered.**

`IrcBus` already holds the right line in code — the receipt says how the message
*reached*, not what the recipient *did* with it (`bus.ts:57-59`). Keep that
distinction verbatim.

### 9.2 Three states, not a boolean

From `get_message_delivery_receipt` (`messaging.rs:5247`, body at `:5286-5290`):
`persisted` (the row is written) → `signaled` (the wake hint landed) →
`acknowledged` (the recipient acted). `pi-peer-messaging`'s
`delivered | delivery_failed` is the cheap version, and §6.1 records five more
systems reaching the same distinction through months of incident response.

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
   may preserve message ids without preserving a monitor's delivery position."*
   A cursor derived from a message id is wrong in principle.
2. **The database writes the row, not the application.** Application code can forget;
   a trigger in the same transaction cannot.

Filesystem translation: a monotonic counter per session, advanced in the same atomic
write as the message. The cursor is that counter, never a message id.

### 9.4 The bug in the obvious version — port the test, don't reinvent it

`sync.rs:606-631`. `seq` is a **global** autoincrement shared by every recipient, so
the gap between your cursor and your oldest event is normally **other recipients'
deliveries, not lost history**. The naive check `after < oldest_for_me →
CURSOR_EXPIRED` is therefore wrong, and the SQL shows why in two tiers:

```sql
(SELECT MIN(seq) FROM inbox_delivery_events) AS global_oldest   -- no WHERE: global
FROM inbox_delivery_events WHERE project_id = ? AND agent_id = ? -- WHERE: per-recipient
```

The fix is a **global witness**:

```rust
let retention_has_pruned = global_oldest_cursor.is_some_and(|global| global > 1);
if let Some(oldest) = oldest_available_cursor
    && retention_has_pruned
    && after < oldest.saturating_sub(1)
{ return Err(CursorExpired { .. }); }
```

If seq 1 is still in the ledger, nothing has ever been pruned, so your gap is
traffic rather than loss. Comment at `:607-614` names the casualty: a monitor that
positioned on an *empty* inbox holds cursor 0, its first delivery lands at a high
global seq because everyone else was busy, and the naive check refuses to start it
(GH#238).

**A check that refuses when it should not is its own failure mode.** §6.1 records six
systems choosing to refuse rather than lie; this is the seventh, where the refusal is
itself the lie.

**Port the existing test, do not write a new one:**
`bootstrap_cursor_survives_unrelated_recipients_advancing_global_seq` (GH#238) at
`sync.rs:1464` already does exactly this. "There must be a test" generates a
duplicate; naming the test to port does not. (Correction owed to `ultraworkers-d9`,
who caught the earlier phrasing.)

### 9.5 Retention needs a horizon

`pi-parley` caps its dispatch log at 8,192 records, evicting `not_delivered` first —
past that the barrier forgets (§6.4). Keep `outcomeKnown` and `retryable` **separate
from state**; without that separation a safe retry is not expressible. `pi-mail`
offers a better policy for pruning: **by reference, not by age** (§5.4). And
`pi-team-mode`'s prune **refuses to delete a message whose receipt is unacked**.

A durability guarantee is a function, and its domain has an edge — state the edge.

---

## 10. Provenance — which reference contributed what

| Decision | From |
| --- | --- |
| In-process bus with receipts, four outcomes, no-double-delivery | **ours (`irc/`)** — already there |
| Socket is a hint, inbox is the truth | `mcp_agent_mail_rust` §4.1 |
| Reap needs four corroborating signals; positive life vetoes | `mcp_agent_mail_rust` `reservations.rs` |
| TTL clamped both ends, and the clamp warns | `mcp_agent_mail_rust` `macros.rs:231-237` |
| Notify the previous holder on a forced release | `mcp_agent_mail_rust` `force_release_file_reservation` |
| Durable sequence independent of message ids; written in-transaction | `mcp_agent_mail_rust` `schema.rs:571-582` |
| Global-witness cursor; port GH#238's test | `mcp_agent_mail_rust` `sync.rs:606-631` |
| Three delivery states | `mcp_agent_mail_rust` `get_message_delivery_receipt` |
| No broker; durable layer must not need the daemon | `mcp_agent_mail_rust`, `pi-team-mode` §6.5 |
| Stale socket reclaim: probe, unlink, rebind | `armory-mesh` `probeStale` |
| Signature/checksum verified **before** touching any replay window | `armory-mesh` `mesh.rs:269` |
| Election by kernel lock on a lock file | `pi-parley` `.process.lock` |
| Anti-ABA epoch per registration | `pi-parley` `endpointEpoch` |
| Retention horizon; `outcomeKnown`/`retryable` separate | `pi-parley` §6.4 |
| Recompute the path, never trust the registered one; uid prefix | `pi-cross-session` |
| Only `ESRCH` is death | `pi-cross-session` |
| Liveness is a real socket probe, not a TTL | `pi-cross-session` |
| Queue: reject `busy`, reject `queue_full`, never drop | `pi-cross-session` |
| File-per-message; `sort()` is the order; tmp+rename `0600`/`0700` | `pi-ipc` |
| `MIN_PREFIX = 4`; refuse ambiguity | `pi-ipc` |
| **Never read `/proc` for liveness** (Linux-only; macOS is unroutable) | `pi-ipc` — a bug to avoid |
| Three-layer peer fencing | `pi-team-mode` §6.7 |
| Session-lifetime drain timer so a message between turns wakes the agent | `pi-team-mode` |
| Two-phase claim by rename | `sting8k` |
| Two observations five minutes apart before sweeping | `sting8k` |
| `$HOME` never counts as an ancestor | `sting8k` |
| Refuse the uncertain part, keep the certain part | `sting8k` |
| Re-verify authority from disk on every write | `pi-agent-teams` |
| Steer / wake / quiet nudge only when idle | `pi-mail` |
| Anchor to git **common** dir, not worktree root | `pi-mail` |
| Prune by reference; never delete an unacked message | `pi-mail`, `pi-team-mode` |
| `accept` / `hold` / `refuse` inbound | Claude Code |
| "A message is input, never authority" | Claude Code |
| Delivery is a typed value, not an inference | `pi-peer-messaging` |
| Naming as a pure function of session id | `pi-mesh` |
| HKDF per-audience keypairs (future cross-machine, no seam change) | `pi-chat` |

---

## 11. What is deliberately **not** copied

### 11.1 Licence

`mcp_agent_mail_rust` is **MIT with an OpenAI/Anthropic rider** — Anthropic PBC is a
named Restricted Party, and "use" is defined to include analysing. **We read it; we
do not copy from it.** Every idea above is re-expressed in this repo's idiom —
TypeScript, filesystem, existing `IrcBus`. No Rust, no SQL, no file is ported.
`pi-peer-messaging` carries the same rider. `pi-mail` is **GPL-3.0 — no code**.
`pi-mesh` declares MIT in npm with **no `LICENSE` file**.

Recorded so a later reader cannot mistake "informed by" for "derived from". See
`peer-messaging.md` §1.1.

### 11.2 On the merits

| Not doing | Why |
| --- | --- |
| A broker daemon | §6.5 — `pi-parley` loses all state when it exits |
| `foreign_keys = OFF` | `mail-rust` sets it; the schema looks relational, the behaviour is not |
| Authorisation-free approval | `respond_contact` performs none, voiding `contacts_only` |
| A boundary declaration nobody reads | `PEER_MESSAGING_BOUNDARY` encodes eleven invariants whose **only** consumer is a test asserting the contract against its own literal — *a gate that cannot fail is worse than no gate* (§5.10) |
| An unversioned wire protocol | `pi-peer-messaging` has no handshake and no capability exchange; skew surfaces as `Unknown client message type: presence` and a dead socket |
| Re-execution to verify | §6.8 — `agent-fleet` records what the child ran; re-running would not prove the child ran it |
| Substring duplicate detection | `armory-mesh`'s `title === title` — false negatives in exactly the place that matters |
| `serve()` with no namespace and no unregister | `pi-mesh` — last-writer-wins by type, two packages silently overwrite each other (§5.9) |

---

## 12. Build order

Each step is independently testable; 1–4 need no model involvement at all.

1. **`PeerTransport` interface + the in-process default.** Proves the seam is
   additive before anything depends on it.
2. **Inbox files.** Monotonic counter, atomic tmp+rename, `0600` in `0700`,
   anchored to the git common dir (§3.7). **Test:** `sort()` is the order; a crash
   mid-write leaves no torn file.
3. **Reaper.** Four-signal corroboration, `ESRCH`-only death, two observations five
   minutes apart, `stale_reasons[]` returned. **Tests:** a sleeping-laptop
   simulation is **not** reaped; `EPERM` is **not** death; four signals must agree.
4. **Socket reclaim + wake.** `probeStale` verbatim; a wake hint that collides loses
   nothing because the inbox is the truth (§4.1). **Test:** two messages, one wake.
5. **Addressing.** `PeerRef`, `MIN_PREFIX = 4`, derived endpoint, uid check.
   **Test:** ambiguous prefix is refused, never guessed.
6. **Injection**, matching `pi-mail`'s three branches plus a session-lifetime drain.
7. **Trust**: peer `customType`, three-layer fence, `accept`/`hold`/`refuse`.
   **Test:** a peer message asserting `attribution: "user"` opens no user turn.
8. **Cursor** (§9.3-9.4). **Test:** port GH#238's
   `bootstrap_cursor_survives_unrelated_recipients_advancing_global_seq`.

---

## 13. Open — the owner's

1. **A row in `docs/core-seams.md`?** Additive, not a modification — but a
   commitment, and `ultraworkers-d9` rightly declined to propose it.
2. **Who decides when an inbound message is delivered?** Not the seam — this. It is
   the decision that costs.
3. **Distribution:** bundled extension, or published separately?
4. **Does a peer message need to wake an idle agent?** `pi-team-mode` says yes. It
   costs a session-lifetime timer and makes the wake path a real interruption
   surface.