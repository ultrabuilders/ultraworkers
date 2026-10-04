# Core seams

The programme's test is that an extension written **outside this repo** installs and
registers a tool, a slash command, a config key, a lifecycle hook and a TUI panel
**without changing a line of core**.

This file is the list AGENTS.md requires: what stays in core, **by name**, so that
changing it is a breaking change for anyone already published against it. A list that
names things which do not exist is worse than no list, so every row here was opened and
read before it was written down.

Measured 2026-10-03 at HEAD `2f277d83b1`. Corrected 2026-10-04 at HEAD `6f87a78be7`:
the TUI row named a line that was not the function it claimed, and the "four of the five"
conclusion below was wrong — the acceptance test passes all five.

Line numbers are deliberately absent from the rows below. A number is a claim about a
revision, and this file outlives revisions; a path and a symbol name are the parts that
stay true. Where a line is given it is incidental, not load-bearing.

## What core guarantees

| Surface | Where the seam lives | Entry an extension reaches |
| --- | --- | --- |
| **Tool** | `packages/coding-agent/src/extensibility/custom-tools/` | barrel `index.ts` re-exports `loader.ts`, `types.ts`, `wrapper.ts` |
| **Slash command** | `packages/coding-agent/src/extensibility/custom-commands/` | barrel `index.ts` re-exports `loader.ts`, `types.ts`; bundled commands under `bundled/` |
| **Config key** | `packages/coding-agent/src/config/registry.ts`, consumed from `extensibility/settings.ts` | `register({ id, type, default })` — `settings.ts:6` imports it and re-exports the resulting `cfg*` settings |
| **Lifecycle hook** | `packages/coding-agent/src/extensibility/hooks/` | barrel re-exports `loader.ts`, `runner.ts`, `tool-wrapper.ts`, `trust.ts`, `result-validation.ts` |
| **TUI** | `extensibility/extensions/types.ts` (`ExtensionUIContext`) | `ctx.ui.setWidget(key, content, options)` — reached from a lifecycle hook's `ctx`, **not** from a top-level registrar |

## The TUI seam is reactive, and that is the whole of the limit

`ctx.ui.setWidget` (`types.ts:371`) is a real out-of-repo seam, and the acceptance test
proves it: `programme-acceptance-five-surfaces.test.ts` mounts a panel from a hook's `ctx`
and asserts the host rendered it. So an extension **can** put a panel on screen.

What does not exist is a **top-level registrar** — a way to declare a panel once, at load,
independently of any event. The two differ in lifetime, not in reach: `setWidget` is
reactive and lives inside the hook that ran, so a panel an extension wants to *keep*
between events has nothing to hold it open with.

The panels that ship are core-owned and mounted by import, not registration:
`btw-controller.ts` imports `BtwPanelComponent` and `BtwHistoryPanel` directly, and
`cleanse-command-controller.ts` imports `CleansePanelComponent`. `registerMode`
(`loader.ts:434`) is declared and implemented but has **no caller** — so the registry an
extension would extend exists, and nothing has ever been put in it.

Recorded rather than fixed on purpose. A top-level registrar is a new capability, and
AGENTS.md's scope discipline says not to open a milestone for one unless the owner asks.
Naming the absence is what the core-list promise requires; the absence itself is the
owner's call.

Until one exists, the programme's test passes for **five of the five** surfaces — via the
reactive seam — and what is missing is the *declarative* form, not the surface.

## The peer package's two seams — shipped

Both now exist, so per this file's own rule they are rows and not a note.

| Surface | Where the seam lives | Entry an extension reaches |
| --- | --- | --- |
| **Peer transport** | `packages/coding-agent/src/irc/peer-transport.ts` | `registerPeerTransport(impl)` / `unregisterPeerTransport(id)` on `ExtensionAPI` (`extensions/types.ts:1707`, `:1710`); registry `addPeerTransport` (`peer-transport.ts:112`) |
| **Peer lock backend** | same file | `registerPeerLockBackend(impl)` on `ExtensionAPI`; registry `addPeerLockBackend` (`peer-transport.ts:134`) |

Measured 2026-10-04 at HEAD `801b020431`. Proven by
`packages/coding-agent/test/irc/peer-transport-extension.test.ts`, which writes an
extension into a temp directory **outside this repo**, imports nothing from it, and
registers both — core unedited.

**The two shapes differ on purpose, copied from seams that already existed:**

- **Transport is provider-shaped**, like `registerProvider`/`unregisterProvider`. An
  override that is then unregistered **restores the built-in**, so "full custom" has a
  defined exit rather than a permanent takeover.
- **Lock backend is fallback-shaped**, like `registerFileWriteFallback`. Core keeps
  ownership; the backend is consulted only once core has **refused**, because an
  extension's claim is "this path is fine on my host", not "I will do the locking".

**`PeerTransport.capabilities` is a contract, not documentation.** It exists because
§15.1 found Claude Code's worst bug (`#87501`): `success: true` for a message that was
never received. Three Windows bugs share that shape, and the reporter's conclusion was
*"because every send reports success, no fallback can trigger."* A replaceable transport
makes that easier to write, so `deliverPeerMessage` checks the declaration against the
outcome **after** the transport returns: an `injected` outcome from a transport declaring
`injects: false` still yields `refused`, and `unreadUnavailableReason()` makes
`list --unread` say *why* it is empty rather than returning an array that reads as
"no peer has written to you".

A `protocolVersion` that does not match is refused **at load**, and the refusal is scoped
to that one transport — logged, not thrown, because one extension built against another
wire version must not take every other extension's seams down with it.

## In core, and promised — with a limit that is part of the promise

**The peer lease fence protects a row, not a file.** Stated here because this file's
own rule is that core's guarantees are published by name, and a guarantee read one
way by a reader is worse than a smaller one stated accurately.

```
agent A: lock("src/x.ts")  → token 7
  …A descheduled an hour; its TTL expires…
agent B: lock("src/x.ts")  → token 8, reaps A's row
  …A wakes, still believing it holds the path…
A: edit("src/x.ts")        ← lands in the tree. Nothing asks the lease store.
```

`edit`, `write`, `ast_edit` and `git` write straight to the filesystem; no write path
consults `peer_leases`, so the `WHERE fence_token = ?` guard **never runs for a file**.
The holder is refused in the database and successful on disk — a zombie writer.

The store is not at fault and no test of the store can see this: it refuses correctly
throughout. It answers a question nobody asks about the thing that matters. So the
claim is kept executable rather than only written down —
`packages/peer/test/lease-fence-does-not-protect-files.test.ts` asserts both halves in
one row, because asserting only the database refusal passes on a store that is correct
and useless.

**Not in core, and deliberately so: a write-path seam that consults leases.** Building
one is a new capability, which is the owner's call, not a repair. Until it exists, a
peer lease is an advisory claim with a hard expiry — true, enforced, and not a lock on
the bytes.

## Also in core, and deliberately so

`./extensibility/*` publishes the whole directory, which includes the compatibility
layer: `legacy-pi-ai-shim.ts`, `legacy-pi-coding-agent-shim.ts`,
`legacy-pi-tui-shim.ts`. `legacy-typebox.ts` looks like a fourth shim by name and is
**not** one — it has no docblock, and four loaders import it as a live dependency
(`custom-tools/loader.ts`, `extensions/loader.ts`, `custom-commands/loader.ts`,
`hooks/loader.ts`). Narrowing the published surface is `epic-d6w5`'s to decide; this
file only records what is published now.