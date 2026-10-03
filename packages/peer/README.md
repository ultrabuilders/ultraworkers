# @ultraworkers/peer

Cross-session agent messaging and file leases with fencing, for `ultraworkers`.

Two sessions in different processes are separate systems that happen to share a
machine. This package is the small, durable layer between them: a name for each
session, a place to put a message it may not read for hours, and a way to say
"this path is mine" in terms a third party cannot forge.

## What it is

- **Identity** — every session gets an adjective + noun name, allocated once from
  a closed space of 9,900 and never recomputed. Not from the working directory,
  not from the PID, not from a counter, because a name derived from mutable
  ambient state cannot be an address. A restart mints a new name: the session
  that restarted genuinely is not the session its peers were talking to. `/rename`
  accepts any string, and a vacated name is **held for 24 hours** rather than
  deleted — so a send can distinguish *that name expired* from *unknown name*, and
  the sender can ask for the new one instead of assuming the peer never existed.
- **Inbox** — durable per-session mailboxes. Overflow **refuses** the send rather
  than dropping the oldest message, because discarding unread mail because a
  backlog built while nothing was running is the one failure a durable store
  must not have.
- **Lease** — namespaced claims over paths, each carrying a monotonic fence
  token. A write or release naming a stale token is refused, so a holder that
  was reaped and re-claimed cannot act on the claim it thinks it still has.
- **Presence** — four independent signals judge a peer live. Only a dead process
  counts as dead; idle, quiet and reachable are all evidence of life.

## The agent surface is four verbs

| Tool | What it does |
| --- | --- |
| `peer.list` | Peer roster. `unread: true` returns counts and subjects — never message bodies. |
| `peer.send` | Send to a peer, or `all`. `notify_when_idle` asks for one notice, never a watch loop. |
| `peer.lock` | Claim a path, returning its fence token. A held path reports its holder instead of failing; `probe: true` answers without claiming. |
| `peer.release` | Give a claim back, proving ownership with its token. |

`/list-agents` (alias `/peers`) and `/rename` are **human** slash commands, not
agent tools — renaming is a human decision, and keeping it off the tool surface
is part of what keeps that surface at four.

**`force_release` is deliberately absent.** It is the one operation here that can
destroy work another agent is actively doing. The equivalent stays a human
calling it on the mail server directly.

## Extending it

Both seams are provider-shaped or fallback-shaped, copied from seams that already
existed rather than invented:

- `pi.registerPeerTransport(impl)` / `pi.unregisterPeerTransport(id)` — registering
  an override and then unregistering it **restores the built-in**.
- `pi.registerPeerLockBackend(impl)` — consulted only once core has **refused** a
  claim. Core keeps ownership of locking.

A transport declares what it can do:

```ts
pi.registerPeerTransport({
  id: "my-transport",
  protocolVersion: 1,
  capabilities: { crossProcess: true, durable: true, injects: true },
  deliver: async (target, message) => ({ outcome: "persisted" }),
});
```

**Those declarations are enforced, not documentation.** They exist because
`success: true` for a message that was never received is a real bug class, and a
replaceable transport makes it easier to write. An `injected` outcome from a
transport declaring `injects: false` is downgraded to `refused`, and
`list --unread` says *why* it is empty rather than returning an array that reads
as "no peer has written to you". A `protocolVersion` that does not match is
refused at load, and the refusal is scoped to that one transport.

## Licence

MIT. See [LICENSE](./LICENSE).