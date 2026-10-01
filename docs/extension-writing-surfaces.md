# Extension writing surfaces

## Status

**Proposed — unratified.** The decision below is an agent's proposal, not an
owner decision.

- **Decider:** _unassigned — owner ratification required_
- **Date:** 2026-10-01
- **Work item:** `m2-wi-10-045` (MILESTONE_2_EXECUTION_PLAN · `WI-10`)
- **Anchors measured against:** `6313c713a2`

Every status in the table below was read out of the tree at that commit, not
inferred from a plan. Where this document and the tree disagree, the tree is
right and this document is the bug.

---

## 1. Surface status table

| Surface | Path | Status | What it is for | Evidence |
| --- | --- | --- | --- | --- |
| Extension factory (TypeScript) | `src/extensibility/extensions/` | CANONICAL | Everything an extension can do: events, tools, commands, renderers, provider registration | [Superset argument](#2-why-the-extension-surface-is-canonical) — four in-tree markers |
| Hooks | `src/extensibility/hooks/` | COMPATIBILITY-ONLY / FROZEN | Legacy event API; a hook module already written keeps working | `docs/extensions.md:827` marks `hookMessage` "migration only"; the hook guide at `docs/skills/authoring-hooks.md:271` points readers *away* from it toward `ExtensionAPI` |
| Custom tools | `src/extensibility/custom-tools/` | COMPATIBILITY-ONLY / FROZEN | Tool-focused modules; adapted into the extension path when loaded together | `src/extensibility/hooks/tool-wrapper.ts:2` — "wraps tools with hook callbacks for interception"; the tree routes hook output toward `custom` (see the `hookMessage` row above) |
| Custom commands | `src/extensibility/custom-commands/` | COMPATIBILITY-ONLY / FROZEN | Command modules authored as **TypeScript**, loaded with native Bun import; also the home of core's own bundled commands (`bundled/ci-green`, `bundled/annotate`, `bundled/review`) | `src/extensibility/custom-commands/loader.ts:2` — "loads **TypeScript** command modules using native Bun import"; the same file imports core's bundled commands from `./bundled/` (`src/extensibility/custom-commands/loader.ts:18` imports `GreenCommand`), so the directory is core infrastructure as well as a loading seam |
| Plugin manifest package | `src/extensibility/plugins/` | CANONICAL | Shipping an extension as an installable package with a `package.json` manifest | `docs/skills/authoring-extensions.md:229` — "Shipping as a marketplace plugin → **Extension** (use `package.json` manifest)" |
| Capability registry | `src/capability/index.ts` | **CORE-ONLY** | Core's own registry of what a capability (skills, context files, MCP servers, rules, settings, SSH, …) can be, and which providers are enabled for each | The registry is live, not vestigial: 15 capabilities are defined via `defineCapability` and **84 providers are registered** across 20 modules in `src/discovery/` (e.g. `discovery/claude-md.ts:24`, `discovery/cursor.ts:201-217`). Core keeps it because *core* owns what a capability is. The **capability-provider** registration function at `capability/index.ts:101` has no extension-facing seam — `ExtensionAPI` (`src/extensibility/extensions/types.ts:1365-1743`) does not import that module. Note the name collision: the `registerProvider` an extension *can* reach is `src/extensibility/extensions/types.ts:1731`, which registers **model** providers (`sdk.ts:1041`, `sdk.ts:2626`), a different registry entirely |
| Tool effect declaration | `src/tools/effects.ts` → `declareToolEffects()` | CANONICAL | Declaring which effects a tool has (`network`, `fs-write`, `subprocess`, …) so the same approval rule gates a tool published outside this repository. Import it as `@oh-my-pi/pi-coding-agent/tools/effects` — the `./tools/*` export maps `./src/tools/*.ts`, so the subpath resolves | Two documents hand this to extension authors: `docs/approval-mode.md:83-84` — "An extension declares its tool's effects by calling `declareToolEffects(name, effects)` at registration, so a tool published outside this repository is gated by the same rule" — and the docblock at `src/tools/effects.ts:42`. **No `src/` file calls it**: every call site is `test/tool-effects.test.ts`, and it is not on `ExtensionAPI` (`src/extensibility/extensions/types.ts`). Reachable and documented, but unproven in the product — which is why the import path is written out here rather than left to be inferred |

### What each status obliges

- **CANONICAL** — new authoring goes here. Adding a capability to this surface
  is additive and does not need an ADR.
- **COMPATIBILITY-ONLY / FROZEN** — it still loads and still works, and it will
  not be extended. Bugs get fixed; features do not get added. A new capability
  that would need one of these belongs on the extension-factory row.
- **CORE-ONLY** — core keeps it. It is listed here precisely so its absence is a
  decision rather than an oversight, and so a future move to extension-facing is
  a visible change to this table.

---

## 2. Why the extension surface is canonical

Four markers already in the tree say the extension surface strictly contains
the hook surface. Quoted verbatim:

**(i)** `docs/skills/authoring-extensions.md:231`

> Extensions are a strict superset of hooks. New authoring should use `ExtensionAPI`.

**(ii)** `docs/skills/authoring-hooks.md:271`

> - `docs/extensions.md` — `ExtensionAPI` (superset of `HookAPI`)

**(iii)** `docs/skills/authoring-extensions.md:226-230` — the same table's
routing rows, which send new work away from hooks by name:

> | Legacy hook module already exists | **Hook** (`HookAPI` from `@oh-my-pi/pi-coding-agent/extensibility/hooks`) |
> | Registering a provider, shortcut, or CLI flag | **Extension only** |

**(iv)** `docs/extensions.md:827`

> | `hookMessage`                  | Legacy hook-injected message (migration only; use `custom`).               |

(i) and (ii) state the superset relation outright. (iii) and (iv) show the same
relation from the other side: the tree already labels hooks *legacy* and routes
hook-origin output toward a migration path, in two independent places. A surface
described as legacy in its own subsystem's docs is not a peer of the surface
those docs tell you to use.

The four markers are deliberately four, and deliberately not two: a single
"supersets" sentence is an assertion anyone can re-litigate, while four
independent places in three files have to be re-litigated four times.

**One marker did not survive this document.** An earlier draft cited
`docs/extensions.md:992` — "**Hooks** … separate legacy event API" — as a fifth
marker. That citation no longer resolves, which is the point of recording it: Replacing the "Extensions vs hooks vs custom-tools" section below (the
one this document is ranked by) deleted that line, because it and this table
said the same thing in the same file. The surviving three are the ones that were
never in the replaced section.

Note that (ii) is written from the *hook* guide's "Further reading" list. The
superset claim is load-bearing enough that the hook guide already has to point at
it.

---

## 3. What this document does not settle

Recorded so a later reader does not mistake silence for a decision.

- **The plan named this surface "custom-command markdown"; the tree says
  TypeScript.** `src/extensibility/custom-commands/loader.ts:2` states it loads TypeScript modules via native
  Bun import, and the directory holds core's own bundled commands. If a markdown-authored command surface exists,
  it is elsewhere and this document did not find it. The row above follows the
  tree, and the discrepancy is recorded rather than resolved: deciding whether a
  markdown command surface should exist is an owner's call, not a documentation
  fix.
- **No single artifact demonstrates the whole promise.** AGENTS.md sets the
  programme's one test: an extension written outside this repo installs and
  registers a tool + slash command + config key + lifecycle hook + TUI panel
  without changing a line of core. As of this commit **no example under
  `examples/` covers all five** — `tools.ts` covers slash/hook/UI/config but no
  tool registration; `reload-runtime.ts` covers tool + slash only; `api-demo.ts`
  covers tool + hooks only. The seams exist (`ExtensionUIContext.custom()` and
  `OverlayHandle` for TUI, `on()` for hooks, `pi.setActiveTools` for tools), but
  the promise is currently argued from parts rather than shown in one run.
- **The capability registry has no extension-facing *registration* seam today.**
  Extensions read capabilities (`extensibility/skills.ts`,
  `extensibility/slash-commands.ts`) and can register *model* providers, but
  cannot register a capability provider. If that ever changes, it is a change to
  this table's last row and needs its own decision record.
- **Reading that row as permission to remove the legacy `pi` shims would be
  wrong, and the removal is out of scope for M2 under every answer to M2-OQ2.**
  The shims are what keeps already-published extensions loading; they are not
  unfinished work.

  | shim | what it is | where |
  | --- | --- | --- |
  | `isProjectTrusted()` | Declared twice on the extension context; both implementations return a constant | declared `extensions/types.ts:558` and `:625`; implemented `extensions/runner.ts:1810` and `session/agent-session.ts:7708`, both `isProjectTrusted: () => true` |
  | `@earendil-works/*` specifier shim | Redirects a legacy bare specifier onto the canonical package | installed at `extensions/loader.ts:79` (`installLegacyPiSpecifierShim()`), imported at `:53`; the module it hands back is loaded through `loadLegacyPiModule` at `:712` |
  | package-root shims for `pi-ai`, `pi-coding-agent`, `pi-tui` | Re-export a canonical surface under each pre-rebrand package root | `plugins/legacy-pi-compat.ts:967`, `:978`, `:985` |

  The four source files total **4,697 lines** (`legacy-pi-compat.ts`, then
  `legacy-pi-coding-agent-shim.ts`, `legacy-pi-ai-shim.ts`, `legacy-pi-tui-shim.ts`).
  They are process-global by construction: `Bun.plugin()` hooks installed by
  `legacy-pi-compat.ts` cannot be withdrawn, which is why `extensibility/utils.ts:76`
  distinguishes a handler disposer from an unload.

  **This is a decision boundary, not a task.** `YES`, `NO` and `DEFERRED` all
  leave these files in place for M2; none of them authorises deletion. Removing
  them breaks every extension published against the pre-rebrand specifier, so it
  is a breaking-change project with its own milestone — outside M2, and outside
  whatever M2-OQ2 is answered. `docs/extension-trust-model.md:209` already records
  the same fact for `isProjectTrusted()`.

### Measured, not assumed: two things that look like findings and are not

Recorded because both were checked and both were wrong, so a later reader does
not have to re-derive them.

- **The capability registry is not dead code.** Its provider mechanism is fully
  built — `providers` is initialised to `[]` at `capability/index.ts:93`, kept in
  priority order at `:122-127`, and `loadImpl` (`:138`) maps over exactly that
  array with no fallback loader (`defineCapability` at `:89` accepts no `load`
  function of its own). An empty provider list therefore yields an empty result,
  not a fallback — but the list is **not** empty: 84 registrations across 20
  `discovery/` modules. `loadCapability` genuinely does populate settings and
  context files, because those capabilities do have providers.
- **A grep scoped to `capability/` alone misses this.** Searching only the
  capability directory suggests the registry has no callers; the callers live in
  `discovery/`. Counting callers requires searching the tree.

---

## 4. Relationship to the trust model

`docs/extension-trust-model.md` records what extension *loading* means today and
which parts of that record are still an owner's call. This document does not
ratify it and does not depend on it — but it is why "canonical" here means
"the surface new authoring targets", not "the surface is trusted". A canonical
surface can still be loaded under an unratified trust model; that ambiguity is
recorded there, not resolved here.