# Extension writing surfaces

## Status

Capability registry: YES

The surface ranking below is **proposed — unratified**. It is an agent's
proposal, not an owner decision. One cell is no longer a proposal: the
capability registry's *ownership* was ruled on by the owner, and this document
carries that ruling rather than choosing again.

- **Decider:** _unassigned — owner ratification required_ for the ranking
  below. The capability-registry answer is **owner-ratified, 2026-10-01** —
  `docs/extension-trust-model.md` §8: "**M2-OQ2 = YES.**"
- **Date:** 2026-10-01
- **Work item:** `m2-wi-10-045` (MILESTONE_2_EXECUTION_PLAN · `WI-10`)
- **Anchors measured against:** `6313c713a2`, re-measured 2026-10-02

Every status in the table below was read out of the tree at that commit, not
inferred from a plan. Where this document and the tree disagree, the tree is
right and this document is the bug.

---

## 1. Surface status table

| Surface | Path | Status | What it is for | Evidence |
| --- | --- | --- | --- | --- |
| Extension factory (TypeScript) | `src/extensibility/extensions/` | CANONICAL | Everything an extension can do: events, tools, commands, renderers, provider registration | [Superset argument](#2-why-the-extension-surface-is-canonical) — four in-tree markers |
| Hooks | `src/extensibility/hooks/` | COMPATIBILITY-ONLY / FROZEN | Legacy event API; a hook module already written keeps working | `docs/extensions.md:833` marks `hookMessage` "migration only"; the hook guide at `docs/skills/authoring-hooks.md:271` points readers *away* from it toward `ExtensionAPI` |
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
- **CORE-ONLY** — core keeps it *today*. It is listed here precisely so its
  absence is a decision rather than an oversight, and so a future move to
  extension-facing is a visible change to this table. **CORE-ONLY describes who
  owns a surface now; it is not the answer to whether it should become
  extension-reachable.** For that question see the `Capability registry:` line
  at the top of this document — the two are different questions, and only the
  second one is answered `YES`.

---

## 2. Why the extension surface is canonical

### The type definitions say it in code

Four markers in the type definitions themselves say the extension surface
strictly contains the hook surface. Quoted verbatim from
`src/extensibility/extensions/types.ts` (line numbers re-measured 2026-10-02):

**(c1)** `:286`, above `ExtensionUIContext`

> // Parallel to HookUIContext: extensions expose a strictly larger UI surface
> // (custom editor component, header/footer, widgets, theming, terminal input)
> // and may be invoked from event handlers that have already taken the agent
> // loop's lock — hooks intentionally cannot.

**(c2)** `:482`, above the runtime context

> // Parallel to HookContext: extensions expose a strictly larger runtime
> // surface (model registry, system prompt, shutdown, full session manager
> // access). Field overlap is incidental; merging into a base would require
> // hooks to widen their public contract.

**(c3)** `:655`, above `ExtensionCommandContext`

> // Parallel to HookCommandContext: same method names, different invariants —
> // extension commands additionally permit `switchSession` and `reload`,
> // which hooks must not call to avoid deadlocking the agent loop.

**(c4)** `:1448`, above `RegisteredCommand`

> // Parallel to HookAPI's RegisteredCommand: extensions add
> // `getArgumentCompletions` and bind handlers to ExtensionCommandContext.

All four sit directly beneath a `// fallow-ignore-next-line code-duplication`
marker. That is worth more than a comment's presence: a duplication linter is a
machine that re-reads these two contexts on every run and is instructed to leave
the divergence alone. (c2) states the reason outright — "merging into a base
would require hooks to widen their public contract" — so the superset relation
is maintained, not merely documented.

### The documentation says it in prose

Four markers in the prose say the same thing. Quoted verbatim:

**(i)** `docs/skills/authoring-extensions.md:231`

> Extensions are a strict superset of hooks. New authoring should use `ExtensionAPI`.

**(ii)** `docs/skills/authoring-hooks.md:271`

> - `docs/extensions.md` — `ExtensionAPI` (superset of `HookAPI`)

**(iii)** `docs/skills/authoring-extensions.md:226-230` — the same table's
routing rows, which send new work away from hooks by name:

> | Legacy hook module already exists | **Hook** (`HookAPI` from `@oh-my-pi/pi-coding-agent/extensibility/hooks`) |
> | Registering a provider, shortcut, or CLI flag | **Extension only** |

**(iv)** `docs/extensions.md:833`

> | `hookMessage`                  | Legacy hook-injected message (migration only; use `custom`).               |

(i) and (ii) state the superset relation outright. (iii) and (iv) show the same
relation from the other side: the tree already labels hooks *legacy* and routes
hook-origin output toward a migration path, in two independent places. A surface
described as legacy in its own subsystem's docs is not a peer of the surface
those docs tell you to use.

The markers are deliberately many, and deliberately not two: a single
"supersets" sentence is an assertion anyone can re-litigate, while eight
independent places across four files have to be re-litigated eight times — and
the four in `types.ts` cannot be re-litigated by editing prose at all, because
they sit next to the declarations they describe.

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
  cannot register a capability provider. That measurement is unchanged; what
  changed is the answer. The question of whether the registry *should* become
  extension-reachable was ruled on — `docs/extension-trust-model.md` §8,
  `M2-OQ2 = YES`, owner-ratified 2026-10-01 — and that ruling is explicitly "a
  decision on ownership, not a completed implementation". So the seam is owed
  and does not yet exist, and building it is not this document's work. When it
  lands, this table's last row changes from CORE-ONLY, and that row changing is
  the visible record of it.
- **Reading that row as permission to remove the legacy `pi` shims would be
  wrong, and the removal is out of scope for M2 under every answer to M2-OQ2.**
  The shims are what keeps already-published extensions loading; they are not
  unfinished work.

  | shim | what it is | where |
  | --- | --- | --- |
  | `isProjectTrusted()` | Declared twice on the extension context; reports the recorded `projectTrust` decision and gates nothing | declared `extensions/types.ts:594` and `:665`; implemented `extensions/runner.ts:2020` and `session/agent-session.ts:7812`, both `isProjectTrusted: () => isProjectTrustedForScope(this.settings)` |
  | `@earendil-works/*` specifier shim | Redirects a legacy bare specifier onto the canonical package | imported at `extensions/loader.ts:54` from `../plugins/legacy-pi-compat`, installed at `:80`; the module it hands back is loaded through `loadLegacyPiModule` at `:730` |
  | package-root shims for `pi-ai`, `pi-coding-agent`, `pi-tui`, `typebox` | Re-export a canonical surface under each pre-rebrand package root | `plugins/legacy-pi-compat.ts:967`, `:978`, `:985`; `legacy-typebox.ts:12` re-exports `@oh-my-pi/omptype/typebox` |

  The five source files total **4,876 lines**, re-measured 2026-10-02:
  `legacy-pi-coding-agent-shim.ts` (1,661), `plugins/legacy-pi-compat.ts`
  (2,799), `legacy-pi-ai-shim.ts` (194), `legacy-typebox.ts` (179), and
  `legacy-pi-tui-shim.ts` (43). An earlier draft of this line said 4,697 across
  four files — arithmetically correct for the four it named, and wrong by
  omission, because `legacy-typebox.ts` is a pre-rebrand root re-export like the
  others. Line counts drift with the files; re-derive this number rather than
  inheriting it.
  They are process-global by construction: `Bun.plugin()` hooks installed by
  `legacy-pi-compat.ts` cannot be withdrawn, which is why `extensibility/utils.ts:76`
  distinguishes a handler disposer from an unload.

  **This is a decision boundary, not a task.** The answer is `YES`, and `YES`
  still leaves every one of these files exactly where it is. Making the registry
  extension-reachable is additive; it is not a licence to withdraw what keeps
  already-published extensions loading. Removing them breaks every extension
  published against the pre-rebrand specifier, so it is a breaking-change project
  with its own milestone — outside M2, and outside the M2-OQ2 answer.
  `docs/extension-trust-model.md:96` already records the same fact for
  `isProjectTrusted()`.

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
ratify it, and the ranking below does not depend on it — but it is why
"canonical" here means "the surface new authoring targets", not "the surface is
trusted". A canonical surface can still be loaded under an unratified trust
model; that ambiguity is recorded there, not resolved here. The one thing this
document does carry across is §8's ownership ruling, which is why the capability
registry's answer above is `YES` rather than a third draft's guess.

---

## 5. The accepted rule

**A new capability must name its target surface in the pull request that adds
it.** One of the six rows above, quoted by name. A PR that adds a capability
without saying which row it belongs under has not finished the change, and the
reviewer should ask before approving.

**Nothing enforces this.** There is no lint rule and no CI step that checks a PR
mentions a surface, and this document is not adding one: a "does the PR name a
surface" check has no consuming contract — nothing downstream breaks when it is
absent — which `AGENTS.md`'s Testing Guidance rejects explicitly, and a check
whose absence is invisible to every consumer is a maintenance cost with no
return. Enforcement is therefore a review norm. That is a deliberate choice, not
an oversight: the rule exists to make the reviewer ask the question, and a
reviewer who asks the question is the whole mechanism.

This rule is also what keeps the table honest. A capability that lands without a
named surface is the exact event that would make this document stale — and a
stale ranking that still reads as authoritative is the failure this work item
was written to prevent.

---

## 6. Consequences

**Measured 2026-10-02 against the ledger: this decision unblocks nothing that is
still open.** An earlier draft of this section listed three work items it
"unlocked". Two of them are already closed and the third is waiting on a
different question, so the list was credit claimed for work that had already
landed. Correcting it here rather than deleting it, because the error is the
instructive part.

| work item | status at HEAD | does M2-OQ2 = YES bear on it? |
| --- | --- | --- |
| WI-5 (`m2-wi-5-038`) — capability registry ownership | **closed** | No. Already delivered; the ruling postdates it. |
| WI-11 (`m2-wi-11-046`) — per-extension state | **closed** | No. Already delivered. |
| WI-7 (`m2-wi-7-042`) | `in_progress` | No. Its one remaining step waits on **M2-OQ4** — which tab of the settings panel an extension's key belongs in. `SettingTab` (`packages/tui/src/overlays/settings-defs.ts`) is a closed union of ten literals, so the answer is a user-facing schema decision, not an ownership one. |
| WI-12 (`m2-wi-12-047`) | **blocked** | No. It waits on the **trust-tier** question, which `docs/extension-trust-model.md` §4 answered by *deferring the behaviour change* and ratifying the shipped posture. |

So the honest statement is the negative one: **every work item this ruling
touches is either closed or blocked on a question this ruling does not answer.**
A reader looking for work to pick up from this document will not find any, and
should read that as information rather than as an omission.

What the ruling *does* do is settle a question that later proposals must not
re-open: a milestone that proposes a capability already present in the registry
will be declined, and a decomposition of `capability/` that hardcodes the
registry back into core contradicts this section. That is a constraint on future
work, not a handoff of pending work.

What it does **not** unblock:

- **No lines of code.** Implementing the M2-OQ2 answer — giving the registry an
  extension-facing registration seam — is explicitly outside M2. This document
  records a decision and its consequences; it authorises no deletion, no
  refactor, and no shim removal. A reader who takes a ratified posture for
  permission to start deleting will find nothing here that permits it, and
  §3's shim table is the part they should have read twice.