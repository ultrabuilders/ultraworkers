# Peer message — agent ↔ agent, cross-session — plan

Written 2026-10-04. Companion to [`peer-messaging.md`](./peer-messaging.md), which is
the study this plan is built from; §-references below point into it.

**Decided by the owner, not derived:** same machine only; ship as a new package;
trust and durability rules taken from the fourteen-project study with
`mcp_agent_mail_rust` weighted heaviest.

---

## 1. The finding that settles the architecture

**No core change is required.** An extension can already do all of it. Verified by
hand, not inferred:

| Fact | Where |
| --- | --- |
| `CustomMessagePayload<T>` = `string \| Partial<Pick<CustomMessage<T>, "customType" \| "content" \| "display" \| "details" \| "attribution">>` | `packages/tui/src/chat/messages.ts:42-44` |
| `normalizeCustomMessagePayload` defaults `attribution: "agent"` | `packages/tui/src/chat/messages.ts:162-170` |
| `pi.sendMessage(payload, {triggerTurn, deliverAs})` injects into the extension's **own** session | `packages/coding-agent/src/extensibility/extensions/types.ts:2211` |
| extensions may register `session_start` / `turn_start` / `turn_end` / `tool_call` | `packages/coding-agent/src/extensibility/hooks/types.ts:495-532` |

So the loop closes without us writing any injection machinery: the package listens
on its own socket, drains its inbox on `turn_start`, and calls the **existing**
`sendMessage`. The seam we were about to add already exists — the host routing
inbound to a registered extension *is* the seam.

This also corrects a framing that was wrong before it reached you. A peer channel
being **inbound** does not force a core change, because inbound delivery to an
extension is something the host already does. What forces a core change would be
injecting into a session the host does not route to, and we never need that: each
package instance injects only into its own session.

### 1.1 `attribution` is not the gate — `customType` is

`attribution` is a **caller-settable field** on the payload, defaulting to
`"agent"`. It cannot be the security boundary, because the caller chooses it.

The actual gate is here:

```ts
// packages/tui/src/chat/messages.ts:282-287
export function isUserTurnInitiator(message: CustomMessage): boolean {
	return (
		isUserInvokedSkillPrompt(message) ||
		(message.customType === COLLAB_PROMPT_MESSAGE_TYPE && message.attribution === "user")
	);
}
```

A turn is user-initiated **only** for a skill prompt, or for `customType ===
"collab-prompt"`. A peer message carries a new `PEER_MESSAGE_TYPE`, so it cannot
initiate a user turn **whatever its attribution field says**. The mistake is
unrepresentable rather than rejected — §6.6's derived-ownership lesson, already
implemented here.

The precedent is one line away: `COLLAB_PROMPT_MESSAGE_TYPE = "collab-prompt"`
(`packages/wire/src/index.ts:170`) is *already* a peer's prompt and is *already*
user-attributed. The concept exists; it is scoped to collab.

**Therefore: do not add `"peer"` to `MessageAttribution`.** Add a `customType`.

---

## 2. Package shape

`packages/peer-bus/` — name is the owner's to pick. Ships as an extension; the
library part is importable on its own.

```
src/
  transport/   per-session UDS server + client
  registry/    presence files on disk
  inbox/       durable per-session message log + cursor
  envelope/    peer message construction, three-layer fencing
  addressing/  PeerRef resolution, ambiguity refusal
  index.ts     extension entry: hook registration, drain loop
```

---

## 3. Transport

Per-session Unix socket, in the Claude Code shape rather than the broker shape.

- `~/.omp/run/peer-bus/<instanceId>.sock`, directory `0700`, socket `0600`.
- **No daemon.** Each session owns its socket; senders connect *out*. Nothing
  central exists to die — §6.5, where `pi-parley` loses every thread, receipt and
  mailbox when its broker exits.
- Registry entry reuses the shape already proven in `collab/registry.ts:172-176`:
  `{ instanceId, pid, endpoint, createdAt, token }`.
- **Liveness must not read `/proc`.** `pi-ipc` checks `/proc/${pid}/stat` field 22
  (`index.ts:224-232`); `/proc` is Linux-only, so on macOS the read returns `null`
  and **a session is unroutable for its entire lifetime with no retry**
  (`index.ts:148-151`). That was observed on a macOS machine, not hypothesised —
  §5.12, and §6.8 in reverse. Use `process.kill(pid, 0)` plus a connect attempt as
  the witness.

---

## 4. Addressing

```ts
type PeerRef = string; // full instance id, unique prefix >= 4 chars, or exact name
```

- `MIN_PREFIX = 4`, from `pi-ipc`'s comment *"shorter than this, a target is a
  guess."*
- **Refuse an ambiguous prefix; never pick one** — §6.1, at 710 lines.
- **The endpoint is never carried in a message.** Derive it from the instance id
  and assert `stat(uid) === process.getuid()` on the socket. A `from` field is
  forgeable — three projects in the set are broken exactly this way (§6.3, §5.2,
  §5.4, §5.3). `pi-cross-session` recomputes rather than trusts; that is the shape
  to copy.

---

## 5. Injection

Drain on `turn_start` and `turn_end`.

| Recipient state | Call |
| --- | --- |
| idle | `sendMessage(payload, { triggerTurn: true, deliverAs: "followUp" })` |
| mid-turn | `sendMessage(payload, { deliverAs: "steer" })` |

`steer` is Claude Code's behaviour: the message lands **inside the running turn**,
alongside the next tool result, rather than as a separate turn.

**Warn the model.** `pi-ipc`'s worst case is that the turn freezes for ten minutes
producing nothing, and the model is not told — the escape is Esc, and while A is
blocked, traffic from B takes the steer path, so chatter lands mid-hang. That is a
real hazard caused by an undocumented tool description (§5.12).

---

## 6. Trust — the answer to Q3

A peer message is **input, never authority**.

- It **cannot** start a user turn (§1.1 — the gate is structural).
- It **cannot** grant, widen or alter a permission. Permission classes are
  untouched by anything in this package.
- Recipient-side gate: `peer.inbound: "accept" | "hold" | "refuse"`, after Claude
  Code's `crossSessionInbound`. **Without this, "no authority" is a sentence in a
  prompt rather than something enforced.** Only Claude Code has it; it is the one
  primitive in the study that makes the trust model real.
- Attribution is resolved on the **receiving** side from the socket, never from a
  field the sender controls.

Fence the content in **three layers**, from `pi-team-mode` (§6.7): the envelope, a
bracketed `authority: peer-only` delimiter in the body, and a session-level notice.
One layer is a convention; three is a boundary. `pi-agent-teams`'s `---` join is
the counterexample — a formatting convention whose body interpolates unescaped.

---

## 7. Durability — the answer to Q4

### 7.1 The constraint, said out loud

`sendUserMessage` returns `void` (`types.ts:2219`) and `sendMessage` returns
`void` (`types.ts:2211`). **There is no ack channel on the public API.** Attempt-level
durability is therefore the only thing implementable without changing a signature —
a constraint, not a preference. Nothing in this design may report a message as
delivered.

### 7.2 Three states, not a boolean

From `get_message_delivery_receipt` (`messaging.rs:5247`, body verified at
`:5286-5290`):

| State | Meaning |
| --- | --- |
| `persisted` | the row is written, in the same transaction as the message |
| `signaled` | the wake hint landed |
| `acknowledged` | the recipient actually acted |

`pi-peer-messaging`'s `delivered \| delivery_failed` is the cheap version of this
and the other five systems reached the same distinction through months of incident
response (§6.1). Keep all three.

### 7.3 No SQLite — file-per-message with a monotonic sequence

The `pi-ipc` shape, which is the cheapest correct design in the set (§5.12):

- one file per message at `~/.omp/run/peer-bus/inbox/<instanceId>/`
- named `${seq}-${envelopeId}.json`, so **`sort()` is the delivery order**
- atomic tmp-plus-rename, `0600` files inside `0700` directories
- **there is no queue that can tear**

### 7.4 The most transferable idea in the study

`inbox_delivery_events` (`crates/mcp-agent-mail-db/src/schema.rs:2277-2285`):

```sql
seq INTEGER PRIMARY KEY AUTOINCREMENT,
...
UNIQUE(agent_id, message_id)
```

written by a **trigger inside the same transaction** as the message
(`schema.rs:575-582`), with `INSERT OR IGNORE` for idempotence, and indexed
`(agent_id, seq)`.

Two properties carry over:

1. **The sequence is deliberately independent of message ids.** The comment at
   `schema.rs:571-574` gives the reason: *"archive recovery and historical imports
   may preserve message ids without preserving a monitor's delivery position."*
   Deriving a cursor from a message id is therefore wrong in principle.
2. **The database writes the row, not the application.** Application code can
   forget; a trigger in the same transaction cannot.

Filesystem translation: a monotonic counter per session, advanced in the same
atomic write as the message. Cursor is that counter, never a message id.

### 7.5 The bug in the obvious version of §7.4 — read before implementing

`sync.rs:606-631`, verified by hand. `seq` is a **global** autoincrement shared by
every recipient, so the gap between your cursor and your oldest event is normally
**other recipients' deliveries, not lost history**.

The naive check — `after < oldest_for_me → CURSOR_EXPIRED` — is therefore wrong.
`mcp_agent_mail_rust` uses a **global witness** instead:

```rust
let retention_has_pruned = global_oldest_cursor.is_some_and(|global| global > 1);
if let Some(oldest) = oldest_available_cursor
    && retention_has_pruned
    && after < oldest.saturating_sub(1)
{ return Err(CursorExpired { .. }); }
```

If seq 1 is still in the ledger, nothing has ever been pruned, so your gap is
traffic rather than loss.

The comment at `:607-614` names the exact casualty: a monitor that called
`--position-now` on an *empty* inbox holds cursor 0; its first delivery lands at
seq 4821 because everyone else was busy; the naive check tells it its history is
gone and it refuses to start (GH#238).

**A check that refuses when it should not is its own failure mode.** §6.1 records
six systems choosing to refuse rather than lie. This is the seventh case, where the
refusal is itself the lie. There must be a test that a fresh cursor of 0 with a high
first `seq` is accepted, not rejected.

### 7.6 Retention needs a horizon

`pi-parley` caps its dispatch log at 8,192 records and evicts `not_delivered`
first — past that the barrier forgets (§6.4). Keep `outcomeKnown` and `retryable`
**separate from state**; without that separation a safe retry is not expressible.
A durability guarantee is a function, and its domain has an edge — state the edge.

---

## 8. What is deliberately **not** copied

### 8.1 Licence

`mcp_agent_mail_rust` is **MIT with an OpenAI/Anthropic rider** — Anthropic PBC is
a named Restricted Party, and "use" is defined to include analysing. **We read it;
we do not copy from it.** Every idea above is re-expressed in this repo's idiom —
TypeScript, filesystem, extension API. No Rust, no SQL, no file is ported. Recorded
here so a later reader cannot mistake "informed by" for "derived from". See
`peer-messaging.md` §1.1.

### 8.2 On the merits

| Not doing | Why |
| --- | --- |
| A broker daemon | §6.5 — `pi-parley` loses all state when it exits |
| `foreign_keys = OFF` | `mail-rust` sets it; the schema looks relational, the behaviour is not |
| Signal-file debounce | its key is `(dir, project, agent)`, so two messages within 100 ms produce one signal — the *hint* is lost |
| Authorisation-free approval | `respond_contact` performs none, which voids `contacts_only` entirely |
| Re-execution to verify | §6.8 — `agent-fleet` records what the child ran; re-running would not prove the child ran it |

---

## 9. Open questions — these are the owner's

1. **Who decides when an inbound message is delivered?** Not the seam — this. It is
   the decision that costs.
2. **Distribution**: bundled extension, or published separately?
3. **A row in `docs/core-seams.md`?** Adding is not the same as removing — the
   promise in that file is about changing the list — but a new row is a commitment,
   and it should be published deliberately rather than slipped in.

`ultraworkers-d9` was asked for a position on all three and explicitly declined to
propose (3), on the grounds that `core-seams.md` is a contract document and adding
to it is the owner's call. That is the correct boundary and it is respected here.

---

## 10. Build order

1. **`PeerRef` + addressing**, with the ambiguity-refusal test. Nothing else can be
   tested until a wrong target is provably impossible.
2. **Transport + registry**, with the macOS liveness test — a session must be
   routable on this platform, which `pi-ipc` is not (§7).
3. **Inbox + cursor**, including the §7.5 regression test: cursor 0, first `seq`
   high, must be accepted.
4. **Envelope + fencing**, including the negative test that a peer message cannot
   start a user turn whatever `attribution` it carries.
5. **`inbound` policy** (`accept`/`hold`/`refuse`).
6. **Extension entry** — hooks, drain loop, tool, slash command, config key.

Each step is independently testable, and steps 1–3 have no dependency on the model
ever seeing a peer message.