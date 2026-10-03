# Extension state persistence

## Status

**Proposed — unratified.** The decision below is a proposal, not an owner decision.

- **Decider:** _unassigned — owner ratification required_
- **Date:** 2026-10-01
- **Work item:** `m2-wi-11-046` (MILESTONE_2_EXECUTION_PLAN · `WI-11`)
- **Anchors measured against:** `d87f5d5e2a`

Anchors are **symbol names, not line numbers**: the plan's line numbers were
already stale, and the extension tree was being edited during this survey —
`flags: Map<string, ExtensionFlag>` moved between two consecutive reads. A line
number is a claim about a moment; a symbol is a claim about the code. Sections
are marked **[measured]** or **[recommendation]**; nothing in a `[recommendation]`
block exists in the tree today.

## What an author can reach today **[measured]**

- **`ExtensionAPI` has no state primitive** — no member named for state, storage,
  persistence, or a key-value bag. `appendEntry` is the only persistence entry
  point, and it is session-scoped by construction. `ExtensionContext` has 27
  members, none a store.
- **No shipped example persists anything.** Searching
  `packages/coding-agent/examples/extensions/` for `Bun.write`, `Bun.file`,
  `readFileSync`, `writeFileSync` returns **zero hits**. The common claim that
  extensions "roll their own files" is therefore _not observable in this repo_;
  what is observable is the absence of a primitive.
- **The shipped baseline is session-entry replay** (`docs/extensions.md`,
  `## Session and state patterns`): persist with
  `pi.appendEntry("com.example.my-extension.state", data)`, rebuild from
  `ctx.sessionManager.getBranch()` on the `session_*` events. Still correct
  advice for session-scoped state; this document does not rewrite it.
- **Two ownership precedents already exist**, and the design borrows both.
  **Keys come from the resolved path, not a name:** `extensionSettingOwner`
  returns `extension:${resolvedPath}`, and `unloadExtension` calls
  `unregisterOwned(extensionSettingOwner(extension))`. **Identity is recorded,
  not derived:** `settingIds: string[]` notes that the id prefix is a convention
  the author can get wrong.

## The design question (Câu hỏi thiết kế)

> Does an extension get a namespaced key-value store inside the existing layered
> `Settings`, or a dedicated per-extension store with its own lifecycle and
> cleanup at unload?

**(A) Namespaced key-value inside the layered `Settings`.** Cheapest of the
three: `SettingProvenance` already has six layers, so an overlay is nearly free.
**Rejected.** `Settings` is a YAML file the user hand-edits, and plugin-internal
state is not user configuration — a user who reformats their settings silently
deletes plugin state. Worse, all six layers (`env`, `runtime`, `overlay`,
`project`, `global`, `default`) name where a value came from **for a human**;
none describes "a plugin cache entry", so a sixth-way meaning must be encoded as
an overlay and then explained in a config file. It also inherits a settings
lifecycle with no cleanup path — the exact property being sought.

**(B) A dedicated per-extension store with its own lifecycle and unload cleanup —
RECOMMENDED. [recommendation]** More expensive: one path helper in
`packages/utils/src/dirs.ts` beside `getPluginsDir()`, one runtime map, one
release step in `unloadExtension`. **Recommended** because it is the only one of
the three that can carry a single, statable lifecycle property — plugin state is
not user configuration, so it does not belong in a file the user edits, and
"these values go away when this extension goes away" cannot be expressed in terms
that already mean something else.

**(C) Session-entry replay.** Free, documented, and already the shipped guidance.
**Rejected as the answer to _this_ question, not as bad advice.** A custom entry
lives on a session branch, so it does not survive the session, and the pattern is
append-and-replay — nearest matching entry wins — not get/set by key.

## Recommended shape (Hình dạng khuyến nghị) **[recommendation]**

**Ownership is by extension identity, not by `ExtensionContext`** — a context is
rebuilt per invocation, so a handle hung off it is per-call and would appear to
lose its state on every hook. **The host map is keyed by installation path**, the
way `extension.flags` is: `ExtensionFlag` carries `extensionPath`.

> The plan asked this document to contrast that against `runtime.flagValues` being
> keyed by bare flag name. **That contrast is obsolete and is not asserted here.**
> `runtime.flagValues` no longer exists in `src/`; the shared value map was
> removed and `ExtensionFlag` now carries its own `value`, with the original
> rationale in its doc comment — a shared map let the last extension to register a
> name decide what all the others read. The tree already resolved this question
> in the direction recommended above.

**On-disk path:** one JSON file per extension,
`<state-root>/extensions-state/<extension-id>.json`, via a new
`getExtensionsStateDir()` in `packages/utils/src/dirs.ts` beside
`getPluginsDir()`. The `state` root, not `data`: `data` means durable user
content that outlives the tool, and these values do not — the unload contract
deletes them. Spelled through the resolver rather than a literal `~/.omp/...`, so
it follows the config-root split instead of pinning one root name.

```ts
// Sketch for review only — never copied into src/ by this item.
interface ExtensionStateStore {
	get<T>(key: string): T | undefined;
	set<T>(key: string, value: T): void;
	delete(key: string): void;
	keys(): string[];
}

// The only surface this design would authorise: one member on the 27-member
// ExtensionContext. Host side: Map<extensionPath, ExtensionStateStore>.
```

## Contracts a later build must protect **[recommendation]**

Present tense because these are obligations on code that does not exist yet, not
notes about code that does.

1. **Unload isolation.** An extension's state is dropped when that extension is
   unloaded, and dropping one extension's state never makes another extension's
   values unreadable — including when two extensions once claimed the same key
   name. Per-path ownership is what makes this true; a store keyed by key name, or
   shared through `Settings`, cannot satisfy it.

2. **Identity change is not silent loss.** An extension that changes its id or
   installation path must not quietly abandon values written under the old
   identity. **The policy is stated, not just the prohibition:** old values are
   **migrated** to the new identity, with the previous path recorded in the
   store's own metadata so a move back is not a second loss.

   > _Flagged for the owner:_ the one place this document decides rather than
   > reads, because the plan leaves it open. Migrate was chosen over "reject the
   > rename" (which punishes a user for moving a directory) and over "record as
   > abandoned" (silent loss wearing a comment). Re-check it first.

**An unresolved tension in contract 1 [measured].** `unloadExtension` **has no
production caller.** It is defined in `runner.ts`, covered by
`test/extension-unload.test.ts`, and every call site in the repo is a test. The
mechanism exists and is tested; the wiring does not — which is exactly why this
build cannot land yet, and sharpens the plan's reason: cleanup-on-unload is not
feasible until WI-9 provides a real unload. It also means contract 1 cannot say
only "on unload" without naming the event — a runner reloading an extension's
code would destroy the extension's state. **Cleanup must be bound to the
extension leaving the machine, not to a runtime instance being dropped.**

## Conditional on M2-OQ2 **[measured]**

**M2-OQ2 — "does the capability registry become extension-reachable?" — has no
answer.** Neither `docs/extension-trust-model.md` nor
`docs/extension-writing-surfaces.md` records `YES`, `NO`, or `DEFERRED`, and the
plan requires one of those three words on a line of its own.

This recommendation is therefore **conditional**. It assumes a per-extension store
owned by the host and unreachable from the capability registry. If M2-OQ2 is
answered `YES` and capability providers gain a registration seam, this must be
re-examined before it is built — a store reachable through the registry is a
different ownership question, not an extension of this one. M2-OQ2 is not idle:
`WI-5` commit 2 is gated on it being `YES` and stops outright on `NO`. It is an
owner decision with work behind it.

## Status: designed, build unowned

**This document is a design. Nothing described in it has been built.**

- **The build is a work item nobody has claimed** — no bead, no milestone, no owner.
- **Its technical condition is WI-9** (wave 7). The plan records verbatim:
  _"cleanup khi uninstall không thi triển khả thi tới khi WI-9 có một unload
  thật."_ The measurement above confirms that condition is still unmet.
- **If the build is pulled into M2 after wave 7, a green WI-9 is necessary but not
  sufficient.** It supplies the unload; it does not supply the decision about
  which unload event deletes state, which is unresolved above.
- The plan requires this deferral to be named and dated before M2 closes.

No phase labels are used here. The plan has no phase concept.

## The five questions this document must answer

A maintainer should answer all five from the text alone.

| #   | Question                                                                     | Answer                                                                                                                                                                            | Where                             |
| --- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| a   | Which foundation won, and why were the others rejected?                      | (B), on a statable lifecycle property. (A) rejected: plugin state is not user config, and the provenance layers name human intent. (C) rejected: session-scoped append-and-replay | "The design question"             |
| b   | Where does the data live on disk?                                            | `<state-root>/extensions-state/<extension-id>.json`, via a new `getExtensionsStateDir()` beside `getPluginsDir()`                                                                 | "Recommended shape"               |
| c   | What happens to an extension's state on unload, and does that affect others? | Dropped for that extension only; per-path ownership keeps others readable even across a shared key name                                                                           | "Contracts", 1                    |
| d   | What happens when an extension's identity changes?                           | Values are migrated to the new identity, previous path recorded — stated, not merely prohibited                                                                                   | "Contracts", 2                    |
| e   | Who owns the build and what blocks it?                                       | Nobody owns it; WI-9 (wave 7) is the technical condition, and the unload-event question is open                                                                                   | "Status: designed, build unowned" |
