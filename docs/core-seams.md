# Core seams

The programme's test is that an extension written **outside this repo** installs and
registers a tool, a slash command, a config key, a lifecycle hook and a TUI panel
**without changing a line of core**.

This file is the list AGENTS.md requires: what stays in core, **by name**, so that
changing it is a breaking change for anyone already published against it. A list that
names things which do not exist is worse than no list, so every row here was opened and
read before it was written down.

Measured 2026-10-03 at HEAD `2f277d83b1`. Corrected three times on 2026-10-04 — the TUI
row named a line that was not the function it claimed, the "four of the five" conclusion
was wrong (`programme-acceptance-five-surfaces.test.ts` passes all five), the row that
replaced it claimed no top-level registrar exists when two do, and the row after that
denied a panel could persist without measuring whether it could. The TUI section records
each error, because a reader arriving at a corrected claim deserves to know how many
wrong claims preceded it. Re-measured at `e5da38df0` for the load-time row.

Line numbers are deliberately absent from the rows below. A number is a claim about a
revision, and this file outlives revisions; a path and a symbol name are the parts that
stay true. Where a line is given it is incidental, not load-bearing.

## What core guarantees

| Surface            | Where the seam lives                                                                                       | Entry an extension reaches                                                                                                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tool**           | `packages/coding-agent/src/extensibility/custom-tools/`                                                    | barrel `index.ts` re-exports `loader.ts`, `types.ts`, `wrapper.ts`                                                                                                                                                                                                                       |
| **Slash command**  | `packages/coding-agent/src/extensibility/custom-commands/`                                                 | barrel `index.ts` re-exports `loader.ts`, `types.ts`; bundled commands under `bundled/`                                                                                                                                                                                                  |
| **Config key**     | `packages/coding-agent/src/config/registry.ts`, consumed from `extensibility/settings.ts`                  | `register({ id, type, default })` — `settings.ts:6` imports it and re-exports the resulting `cfg*` settings                                                                                                                                                                              |
| **Lifecycle hook** | `packages/coding-agent/src/extensibility/hooks/`                                                           | barrel re-exports `loader.ts`, `runner.ts`, `tool-wrapper.ts`, `trust.ts`, `result-validation.ts`                                                                                                                                                                                        |
| **TUI**            | `extensibility/extensions/surface-registry.ts` (`registerSurface`), `extensions/types.ts` (`ExtensionAPI`) | `pi.registerSurface(band, factory, opts?)` — declare a header or footer band at **load** time, before any hook runs. The reactive twin is `ctx.ui.setHeader` / `setFooter`, reached from a lifecycle hook's `ctx`; the controller owns the component either way, so it outlives the hook |

## The TUI seam: one surface policy, two ways to reach it

A component reaches the composer's header or footer band by **one** method,
`ExtensionUiController.setExtensionSurface`, from two directions:

- **At load** — `pi.registerSurface(band, factory, options?)` on `ExtensionAPI`,
  implemented in `loader.ts`. The declaration goes to `extensionSurfaceRegistry`,
  a process-global keyed by owner, and `ExtensionUiController` drains it at the
  head of `initHooksAndCustomTools()`.
- **From a lifecycle hook** — `ctx.ui.setHeader(factory, opts)` / `setFooter`,
  which reach the same method directly.

Both land in the same place, so **collision, withdrawal and disposal have exactly
one implementation**: a key two extensions share keeps both (the second is
suffixed, a warning names both), and withdrawal is scoped by owner rather than by
key. The registry is deliberately keyed by **owner**, not by `key` — `key` is a
label two extensions may share, and keying the registry by it would refuse the
second one at load with no warning and no band, which is the silent loss the
collision policy exists to prevent.

Ordering is measured, not assumed: extensions load in `main.ts` before
`InteractiveMode.init` runs `initHooksAndCustomTools`, so a one-shot drain sees
every declaration. A subscription could miss one made in between.

`test/extensions/load-time-surface.test.ts` proves the load-time half
end-to-end — a real `.ts` module written to `os.tmpdir()`, reached only through
`loadExtensions`, importing nothing from this repo. Removing the drain reds its
mount rows; removing `registerSurface` from the API object reds the two
end-to-end rows, which is what makes them a claim about the seam rather than
about the registry.

**This section was wrong three times before it was right**, and the errors are
recorded because the file's own rule is what caught them:

- The first draft's TUI row named `loader.ts:599` — a line inside
  `registerHostRenderStrategy` — described `registerCopyTargetProvider` as "a copy
  target, not a panel", and concluded the programme's test passed for _four_ of
  five surfaces. The row named the wrong line, and
  `programme-acceptance-five-surfaces.test.ts` passes all five.
- Correcting that produced a second false claim: that there was **no** top-level
  registrar at all. `registerMode` and `registerHostRenderStrategy` both exist on
  `ExtensionAPI` and are both implemented in `loader.ts`.
- Correcting _that_ produced the third: that a panel wanting to persist "has
  nothing to hold it open with". False — `setHeader`/`setFooter` hold it open. The
  confusion was between **reactive in time** (declared when an event fires) and
  **reactive in lifetime** (dies with the hook). Only the first was true, and I
  used it to deny the second without measuring the second.
- What survived all three corrections was a real but smaller gap: a panel had no
  way to be declared **before any event fired**, because `ExtensionAPI` exposed no
  `ui`. `registerSurface` closes exactly that, and nothing more.

The panels that ship are core-owned and mounted by import, not registration:
`btw-controller.ts` imports `BtwPanelComponent` and `BtwHistoryPanel` directly, and
`cleanse-command-controller.ts` imports `CleansePanelComponent`.

## The peer package's two seams — shipped

Both now exist, so per this file's own rule they are rows and not a note.

| Surface               | Where the seam lives                              | Entry an extension reaches                                                                                                                                                   |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Peer transport**    | `packages/coding-agent/src/irc/peer-transport.ts` | `registerPeerTransport(impl)` / `unregisterPeerTransport(id)` on `ExtensionAPI` (`extensions/types.ts:1707`, `:1710`); registry `addPeerTransport` (`peer-transport.ts:112`) |
| **Peer lock backend** | same file                                         | `registerPeerLockBackend(impl)` on `ExtensionAPI`; registry `addPeerLockBackend` (`peer-transport.ts:134`)                                                                   |

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
_"because every send reports success, no fallback can trigger."_ A replaceable transport
makes that easier to write, so `deliverPeerMessage` checks the declaration against the
outcome **after** the transport returns: an `injected` outcome from a transport declaring
`injects: false` still yields `refused`, and `unreadUnavailableReason()` makes
`list --unread` say _why_ it is empty rather than returning an array that reads as
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
