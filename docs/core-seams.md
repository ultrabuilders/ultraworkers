# Core seams

The programme's test is that an extension written **outside this repo** installs and
registers a tool, a slash command, a config key, a lifecycle hook and a TUI panel
**without changing a line of core**.

This file is the list AGENTS.md requires: what stays in core, **by name**, so that
changing it is a breaking change for anyone already published against it. A list that
names things which do not exist is worse than no list, so every row here was opened and
read before it was written down.

Measured 2026-10-03 at HEAD `2f277d83b1`. Corrected twice more on 2026-10-04: the TUI
row named a line that was not the function it claimed, the "four of the five" conclusion
was wrong (`programme-acceptance-five-surfaces.test.ts` passes all five), and the row that
replaced it claimed no top-level registrar exists when two do. The TUI section records
all three errors, because a reader arriving at a corrected claim deserves to know how
many wrong claims preceded it.

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
| **TUI** | `extensibility/extensions/types.ts` (`ExtensionUIContext`) | `ctx.ui.setHeader(factory, opts)` / `setFooter(factory, opts)` — mount a component into the composer's header or footer band. The **controller** owns it, so it outlives the hook that registered it. Reached from a lifecycle hook's `ctx`; `ExtensionAPI` exposes no `ui`, so there is no **load-time** registrar |

## The TUI seam mounts a band that outlives its hook

`ctx.ui.setHeader` / `setFooter` take a **component factory**, and
`ExtensionUiController.setExtensionSurface` keeps the product in `#extensionHeaders` /
`#extensionFooters`, keyed by owner. The `ctx` is the factory's *argument*; it is not
where the component lives. A band registered from a hook therefore stays mounted after
that hook returns.

`test/extensions/header-footer-band.test.ts` is what makes that a measurement rather
than a reading: one row installs a **second** ui context over the first — one with no
`setHeader` at all — and asserts the band is still in the container. Asserting straight
after registration cannot tell the two designs apart, because both pass.

**This section has been wrong twice, in opposite directions**, and both errors are worth
recording because the file's own rule ("a list that names things which do not exist is
worse than no list") is what caught them:

- The first draft's TUI row named `loader.ts:599` — a line inside
  `registerHostRenderStrategy` — and described `registerCopyTargetProvider` as "a copy
  target, not a panel", then concluded the programme's test passed for *four* of five
  surfaces. The row named the wrong line, and `programme-acceptance-five-surfaces.test.ts`
  passes all five.
- Correcting that produced a second false claim: that there was **no** top-level
  registrar at all. `registerMode` and `registerHostRenderStrategy` both exist on
  `ExtensionAPI` and are both implemented in `loader.ts`.
- Correcting *that* produced the third: that a panel wanting to persist "has nothing to
  hold it open with". False — `setHeader`/`setFooter` hold it open. The confusion was
  between **reactive in time** (declared when an event fires) and **reactive in
  lifetime** (dies with the hook). Only the first is true.

What survives measurement is narrower and is the only part that is a gap:

- **Reach** — yes. An out-of-repo extension gets a persistent, component-owning surface.
- **Lifetime** — yes, it outlives the hook.
- **Declaration time** — **no.** `ExtensionAPI` exposes no `ui`, and none of its
  `register*` methods registers a surface. A panel that should exist *before any event
  fires* has no seam to be declared through.

So what is missing is a **load-time** registrar, not a panel registrar. That is a new
capability, and AGENTS.md's scope discipline says not to open a milestone for one unless
the owner asks. Naming the absence is what the core-list promise requires; the absence
itself is the owner's call.

The panels that ship are core-owned and mounted by import, not registration:
`btw-controller.ts` imports `BtwPanelComponent` and `BtwHistoryPanel` directly, and
`cleanse-command-controller.ts` imports `CleansePanelComponent`.

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