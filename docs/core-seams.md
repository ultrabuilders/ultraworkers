# Core seams

The programme's test is that an extension written **outside this repo** installs and
registers a tool, a slash command, a config key, a lifecycle hook and a TUI panel
**without changing a line of core**.

This file is the list AGENTS.md requires: what stays in core, **by name**, so that
changing it is a breaking change for anyone already published against it. A list that
names things which do not exist is worse than no list, so every row here was opened and
read before it was written down.

Measured 2026-10-03 at HEAD `2f277d83b1`. Re-verified 2026-10-04 at HEAD `340db8c24f`:
all five rows still resolve at the paths and line numbers given, so only the stamp
moved.

## What core guarantees

| Surface | Where the seam lives | Entry an extension reaches |
| --- | --- | --- |
| **Tool** | `packages/coding-agent/src/extensibility/custom-tools/` | barrel `index.ts` re-exports `loader.ts`, `types.ts`, `wrapper.ts` |
| **Slash command** | `packages/coding-agent/src/extensibility/custom-commands/` | barrel `index.ts` re-exports `loader.ts`, `types.ts`; bundled commands under `bundled/` |
| **Config key** | `packages/coding-agent/src/config/registry.ts`, consumed from `extensibility/settings.ts` | `register({ id, type, default })` — `settings.ts:6` imports it and re-exports the resulting `cfg*` settings |
| **Lifecycle hook** | `packages/coding-agent/src/extensibility/hooks/` | barrel re-exports `loader.ts`, `runner.ts`, `tool-wrapper.ts`, `trust.ts`, `result-validation.ts` |
| **TUI** | `extensions/loader.ts:599` | `registerCopyTargetProvider(provider)` — **registers a copy target, not a panel** |

## The one that is not there

**There is no TUI panel registrar.** Panels exist as a concept — `overlays/btw-panel.ts`,
`overlays/cleanse-panel.ts`, `overlays/btw-history-panel.ts` — but nothing an out-of-repo
extension can call to add one.

The only extension-callable TUI seam is `registerCopyTargetProvider`. An extension can
therefore participate in the UI, and cannot yet extend it with a panel of its own.

This is recorded rather than fixed on purpose. Building a panel registrar is a new
capability, and AGENTS.md's scope discipline says not to open a milestone for one unless
the owner asks. Naming the absence is what the core-list promise requires; the absence
itself is the owner's call.

Until one exists, the programme's test passes for **four of the five** surfaces.

## The peer package's two seams

`docs/peer-messaging.md` §16 designs two registrations for `@ultraworkers/peer`. Both now
exist, so this file's own rule applies in the other direction: name the measured path, cite
the HEAD. Landed in `34cbe1707`, re-read at HEAD `340db8c24f`.

| Seam | Where it lives | Entry an extension reaches |
| --- | --- | --- |
| **Transport** (provider-shaped) | `packages/peer/src/seam/transport.ts` | `registerPeerTransport(transport)` at `:207`, `unregisterPeerTransport(id)` at `:221` |
| **Lock backend** (fallback-shaped) | `packages/peer/src/seam/lock.ts` | `registerPeerLockBackend(backend)` at `:108` |

**Not in the table above, on purpose.** That table is the `packages/coding-agent`
extensibility surface — tool, slash command, config key, lifecycle hook, TUI. These two are
a different package's registration, and listing them beside the five would imply they are
core the way `registerCopyTargetProvider` is core. They are the seams *of a package an
extension opts into*, which is a weaker promise and should not borrow the stronger one's
table.

Two properties make them contracts rather than conveniences, so they are recorded even here:

- **`PeerTransport.capabilities` is a capability declaration** (`crossProcess`, `durable`,
  `injects`). An extension written against it and a later core that drops or reorders a field
  breaks **silently** — the transport keeps loading and stops delivering.
- **`protocolVersion` is checked at registration, not at send.** Skew surfaces where the
  reference this was copied from had no handshake, as `Unknown client message type` followed
  by a dead socket.

`PeerLockBackendOpinion` deliberately has **no `true`**. A backend may explain a denial or
name the real blocker; it cannot hand out a path core already refused. That is the whole
reason the lock seam is fallback-shaped instead of provider-shaped, and an extension
compiled against it cannot be granted the power to grant.

§16.4's requirement is covered by `packages/peer/test/seam-registration.test.ts`, which
builds the extension in `mkdtemp` outside the repo, symlinks the package into its
`node_modules`, and imports **by specifier** — `from "@ultraworkers/peer"` — so the row
fails on the import if either seam is ever made core-private.

## Also in core, and deliberately so

`./extensibility/*` publishes the whole directory, which includes the compatibility
layer: `legacy-pi-ai-shim.ts`, `legacy-pi-coding-agent-shim.ts`,
`legacy-pi-tui-shim.ts`. `legacy-typebox.ts` looks like a fourth shim by name and is
**not** one — it has no docblock, and four loaders import it as a live dependency
(`custom-tools/loader.ts`, `extensions/loader.ts`, `custom-commands/loader.ts`,
`hooks/loader.ts`). Narrowing the published surface is `epic-d6w5`'s to decide; this
file only records what is published now.