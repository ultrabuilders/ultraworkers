# Extension trust model

## Status

**Proposed — unratified.** The decision below is an agent's proposal, not an
owner decision.

- **Decider:** DustyCat (agent) for the choice recorded in section 4, which is a
  **proposal**. Ratification belongs to `tranquangdang21`, the assignee of
  `m2-wi-0-030`; nobody has ratified it.
- **Date:** 2026-10-02 — the date this revision was written and measured.
  First proposed 2026-10-01, re-derived 2026-10-02 against `f6a303150c`, and
  corrected 2026-10-02 again after cross-review found the writability error in
  section 1(e).
- **Work item:** `m2-wi-0-030` (MILESTONE_2_EXECUTION_PLAN · `WI-0`)
- **Anchors measured against:** `f6a303150c`

Section 1 is settled fact, measured against the tree. Section 2 is analysis.
Section 4 is the decision; it is written, and it is the one the shipped code is
built towards. It is recorded here so it is visible rather than implicit — but
ratifying it is the owner's call, and until it is ratified this document is a
proposal, not a policy.

> **Re-derived 2026-10-02.** The previous revision decided **Option C** on the
> ground that `isProjectTrusted()` was the literal `() => true` and that
> ratifying that was merely writing it down. Bead `m2-wi-20-049` then landed and
> made it a real three-valued decision that **refuses by default**, so the
> premise of C is gone: there is no longer a `() => true` posture to ratify.
> Leaving the text as it stood would have had this document assert, as settled
> fact, something the tree had stopped doing. Sections 1(d), 1(e), 2, 3, 4 and 5
> are rewritten accordingly; the threat model in section 2 is unchanged, because
> nothing about the attacker or the asset moved.

---

## 1. What ships today

Five statements about the code as it is. No judgement here — that is section 2.

**(a) Project-scoped extension input is discovered and loaded, and the only
condition on it is a CLI flag, not a trust decision.**

```
packages/coding-agent/src/main.ts:2235
    parsedArgs.trustedExtensions?.length
        ? await loadTrustedSessionExtensions(sessionOptions, cwd, eventBus)
        : await loadSessionExtensions(sessionOptions, cwd, settingsInstance, eventBus);
```

The same two-branch shape appears at `main.ts:535`. Nothing else gates the load:
no prompt, no allowlist, no per-project decision.

**(b) The two load paths resolve their project root differently, and they are not
the same path.**

The `.omp` path resolves its project root to the workspace:

```
packages/coding-agent/src/discovery/omp-extension-roots.ts:162
    project: path.join(ctx.cwd, ".omp"),
```

The plugin path does not. Its root is `entry.installPath`, read from a registry
entry:

```
packages/coding-agent/src/discovery/helpers.ts:1318-1326
    projectRoots.push({
        id: pluginId,
        ...
        path: entry.installPath,
        scope: "project",
        origin: "omp",
    });
```

That path comes from the nearest ancestor `.omp/plugins/installed_plugins.json`
(`discovery/helpers.ts:1049`, `resolveActiveProjectRegistryPath`). The only
filter applied to a registry entry is:

```
packages/coding-agent/src/discovery/helpers.ts:1317
    if (entry.enabled === false) continue;
```

So a plugin's code can live outside `<cwd>/.omp` entirely. These are two different
exposures and are not merged into one claim anywhere in this document.

**(b′) Project-scoped plugin entries take precedence over the user's own entries
for the same plugin ID.**

```
packages/coding-agent/src/discovery/helpers.ts:1335-1341
    // Project entries shadow user entries for the same plugin ID.
    if (projectRoots.length > 0) {
        const projectIds = new Set(projectRoots.map(r => r.id));
        const deduped = roots.filter(r => !projectIds.has(r.id));
        roots.length = 0;
        roots.push(...projectRoots, ...deduped);
    }
```

This is not an ordering preference — the `filter` **removes** the user's own
entry for a colliding plugin ID before the merged list is rebuilt. A cloned
repository's registry therefore substitutes for what the user installed rather
than adding to it. From there, `plugins/loader.ts:95` enumerates
`<root>/node_modules` per root and `plugins/loader.ts:331`/`:407` resolve the
`omp.extensions` manifest key, so the shadowed plugin's extension modules load as
project-scoped roots.

**(c) `isProjectTrusted()` is declared twice on the extension-facing context.**

```
packages/coding-agent/src/extensibility/extensions/types.ts:594
packages/coding-agent/src/extensibility/extensions/types.ts:665
```

**Their doc comments were stale, and are now corrected.**
Both blocks asserted the pre-WI-20 behaviour — `types.ts:577-579` said "OMP
performs no project-trust gating … so this always returns `true`", and
`types.ts:645-650` said the method "always returns `true`, truthfully reflecting
that OMP already trusts project-local inputs by default". Neither was true of the
code beneath them, and the second named `docs/extension-loading.md` as its
authority — a file that was silent on trust, so the pointer resolved to a
document that could not answer the question it was cited for.

Both are fixed, along with a trust section in `docs/extension-loading.md`. The fix
is **not** part of this work item: this bead forbids a `.ts` file in its diff,
because a decision record that edits code is a change made before the decision is
ratified, which is the failure the plan names. So the correction landed under the
bead that changed the behaviour (`m2-wi-20-049`), and this paragraph records the
sequence rather than claiming the credit.

**(d) Both implementations are now a real value, and it defaults to `false`.**
This is the fact that changed under this document, so it is stated at length
because it is the one most likely to be misread.

```
packages/coding-agent/src/extensibility/extensions/runner.ts:2020
    isProjectTrusted: () => isProjectTrustedForScope(this.settings),
packages/coding-agent/src/session/agent-session.ts:7812
    isProjectTrusted: () => isProjectTrustedForScope(this.settings),
```

**Two answering sites, not one** — and this is the fact that makes the remaining
gap smaller than it reads. `isProjectTrusted` is **wired at both**, both delegate
to the same function, and both are live. It is not one callback with a second
copy in reserve: an extension reaches it through the extension context _and_
through the session context, and either path answers today.

Both delegate to one function, `isProjectTrustedForScope` in
`packages/coding-agent/src/config/project-trust.ts:183`, which reads a recorded
three-valued decision (`yes` / `no` / `undecided`, `project-trust.ts:56`) and
answers `true` only for `yes`. An undecided project answers `false`
(`project-trust.ts:184`, `:186`). The value is therefore **real and
falsifiable**, where the previous literal could not be false at all.

Both call sites are assignments, and neither is a call _on core's behalf_. Core
asks nowhere; it only makes the answer available. That asymmetry is the whole
of the remaining gap, and section 5 states it as one thing rather than two.

**(e) No prompt, allowlist, or gate exists anywhere on the load path — and
`assertTrusted`, the one function that could refuse, is never called outside
tests.**

Measured by grepping every use of each exported primitive across `src/` and
`test/`, excluding its own module:

| primitive                  | uses in `src/`              | uses in `test/`                        |
| -------------------------- | --------------------------- | -------------------------------------- |
| `assertTrusted`            | **0**                       | 11 (`test/project-trust-gate.test.ts`) |
| `isResourceTrusted`        | **0**                       | 2                                      |
| `resolveProjectTrust`      | **0**                       | 6                                      |
| `setProjectTrust`          | **0**                       | 11                                     |
| `isProjectTrustedForScope` | 2 (the call sites in `(d)`) | 4                                      |
| `ProjectTrustError`        | **0**                       | 6                                      |

So the load path is still ungated, exactly as before: `.omp/extensions` and
project-scoped plugin entries load unconditionally. What WI-20 built is the
**decision**, its storage, its UI, and its refusals — and no consumer of the
refusal.

> **`setProjectTrust` having no caller does not mean the decision is unwritable.**
> `cfgProjectTrust` is registered with `ui.tab: "tools"`, and the settings host is
> generic: it walks `orderedSettings()`, keeps anything whose `ui.tab` matches
> (`config/settings-ui.ts:68`), and writes through `writeGlobalSetting` for _any_
> setting carrying `ui` (`:96`). The config CLI reaches the same key through the
> same generic call (`cli/config-cli.ts:324`). So there are two writers, neither
> of which mentions `setProjectTrust` by name, and the decision persists — it
> survives a flush and a reload. Counted as "0 callers" the table above is
> accurate; read as "the value can never change" it is badly wrong, and that is
> the reading this section exists to prevent.

> **The asymmetry, which is the security-relevant part.** Because a value _can_ be
> written, the two answers are not equivalent:
>
> - `yes` **has an effect** — `isProjectTrusted()` returns `true`, so an extension
>   that branches on it takes the trusted branch.
> - `no` and `undecided` **have no effect on loading at all** — nothing calls
>   `assertTrusted`, so project code loads either way.
>
> So the setting can turn a permission on and cannot turn it off. A user who sets
> `yes` gets a promise; a user who sets `no` gets a record of their intent and
> nothing else. Any panel text implying otherwise overstates in the direction that
> costs the user their protection.

> **The trap worth naming.** `isProjectTrusted()` returns `false` for an
> undecided project, and `assertTrusted` would throw. Neither is reachable from
> the load path. A reader who sees a function returning `false`, and a function
> that throws `ProjectTrustError`, and concludes that project extensions are
> blocked, has concluded the opposite of the truth. The gate is **not wired**.
> This is the same shape as a gate that is exercised only by its own tests: it
> is green, it is real, and nothing calls it.

> **Anchor note.** The work item cites `runner.ts:1264`, `agent-session.ts:7406`,
> `types.ts:487-494`, and `types.ts:548-561`. All four had drifted and none points
> at these sites. The work item also ships its own correction table measured on
> `65cc6c1`; every anchor in that table has drifted again and none matches this
> commit. Verify against the symbol, not the line number.
>
> This has now happened three times, so treat the numbers as a convenience
> rather than a citation. Re-measured 2026-10-02 against `f6a303150c`: the two
> `isProjectTrusted` declarations (`types.ts:558`/`:625` → `:583`/`:650`), both
> implementations (`runner.ts:1810`/`agent-session.ts:7708` → `:2020`/`:7812`),
> the `ctx.exec` declaration (`:1989` → `:2105`), the load branch
> (`main.ts:2234` → `:2235`), the two posture comments (`:551-557`/`:613-624` →
> `:576-583`/`:642-650`), and the `#7955` changelog entry (`:1587` → `:1644` at
> `f6a303150c`, then `:1645` once this document added its own changelog line —
> a reminder that writing here moves the thing being cited).
> The five that survived were re-checked by content, not by line. If you are
> citing this document, cite the symbol.
>
> A line number rotting is a citation that got stale. Section 1(d) rotting is not
> that: the _claim_ became false, and every number in it stayed well-formed. A
> mechanical anchor check would have passed that section indefinitely.

---

## 2. Threat model

**The attacker is anyone who controls a repository you clone, or a pinned plugin
version in that repository's lockfile. The asset is arbitrary code execution with
your credentials and shell, reached by running `ultraworkers` inside a directory you were
told was safe to open.**

**Reach, in order of how easily it is obtained:**

1. **Anyone who can write to a repository you clone.** `.omp/extensions/` is
   inside the workspace (`(b)`, first half), so a commit can add extension code
   that loads with the session's full privileges. Reviewing the diff is currently
   the only control.
2. **A plugin registry entry, which is strictly worse than (1) under `(b′)`.** The
   code need not be in the workspace at all, and the entry can shadow the user's
   own plugin of the same ID. Whatever writes that registry decides what runs.
3. **A transitive dependency**, which reaches (1) if it can write into the
   workspace — and it does not need to be an extension to get there.

**What an extension reaches once loaded.** Extensions are TypeScript modules
evaluated in-process, not a sandboxed format. The question is not "what does the
flag allow" but "what does the process allow" — everything the agent can do.

**What `isProjectTrusted()` buys today.** A real value (`(d)`) and **no
enforcement** (`(e)`). An extension calling it now learns whether the user
recorded a decision, so code written against it can branch on a value that can be
either — but the branch it is about to take is not itself gated, because nothing
consults the decision before loading. The function became honest without becoming
load-bearing.

**This is already true today, not a future risk.** Project-scoped extension code
loads unconditionally from both paths in `(b)`, with project entries shadowing
user entries for the same plugin ID `(b′)`. That part is unchanged and is what
makes this a schedule problem rather than a hypothetical.

**One shipped sentence is now wrong, and is being left in place.**
`packages/coding-agent/CHANGELOG.md:1645`, the released entry for #7955, reads
"(always `true`, since OMP applies no project-trust gating)". `always true` is
false as of WI-20. It stays wrong on purpose: released sections are immutable
(`AGENTS.md`, Changelog), and a documentation fix that rewrites history is worse
than a stale line. The correction belongs to the next release's entry, and the
next release's entry is section 7's business — not this document's.

---

## 3. What `ctx.exec` means here (M2-OQ5)

**Answer: `ctx.exec` is outside the trust decision entirely, deliberately, on the
reasoning that an extension which has loaded at all has already been trusted —
and the decision has to say that `ctx.exec` is outside the _decision_, not merely
outside an enforcement that happens not to exist yet.**

It is declared on the extension context at
`packages/coding-agent/src/extensibility/extensions/types.ts:2105`:

```
exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
```

Two things must be said together, or this section is the failure the work item
names — a document that _looks_ safe and is not:

1. **By choice.** A gate whose boundary is module load, with `ctx.exec` left
   reachable from anything that passed it, is a boundary drawn in the wrong
   place. `ctx.exec` is not an escape from a trust decision; it is the reason the
   decision has to be made about the load path rather than about individual
   capabilities afterwards.
2. **And currently moot.** Per `(e)`, no gate is wired, so `ctx.exec` is not
   outside a working gate — it is outside a _proposed_ one. Recording this answer
   now is what keeps the future gate honest: whoever wires `assertTrusted` into
   the load path inherits this sentence as a commitment, and a gate that admits
   modules while leaving process-spawning reachable is not the gate this document
   decided on.

The consequence is accepted rather than mitigated: the trust boundary is the load
path, and everything reachable from a loaded extension — including `ctx.exec` — is
inside the blast radius by design.

---

## 4. The decision

**Option B — the supply-chain boundary lives in configuration: a recorded,
per-project, three-valued decision, read from `config.yml`, with no prompt.**

The decision record, its storage, its UI, and its refusals already exist
(`config/project-trust.ts`, registered as the `projectTrust` setting,
`project-trust.ts:95`, defaulting to `undecided` and refusing). What does not
exist is the enforcement. So B is not a proposal here; it is a **direction with
its first half built**, and the honest way to record it is to name which half.

**The friction B was supposed to cost is already paid**, which an earlier
revision of this section got wrong. The declaration surface exists and works: the
settings panel and the config CLI's `config set` writes the decision generically, it
persists, and it survives a restart (see the writer note in section 1(e)). B is
not waiting on a mechanism. It is waiting on a call to `assertTrusted` at the
load path — _the same missing caller A is waiting on_. So the difference between
A and B is not the cost of recording a decision; that is done. It is whether the
user is asked once, or is expected to have found a settings panel.

**What both options must fix regardless of which is chosen.** The decision is
asymmetric today: `yes` takes effect, `no` and `undecided` do not (section 1(e)).
Neither A nor B changes that by itself. Both have to close the gap between what
the panel says and what the three answers do, because a setting that can grant
permission and cannot withdraw it is the shape of bug that is invisible until
someone relies on the withdrawal.

**Why not A (prompt per project).** It is the cheapest in code — the seam already
has the right shape — and it is the option that would have produced a gate
without this ambiguity, because a prompt is self-enforcing at the one moment
enforcement matters. It is not chosen because it is also the only one that
changes user-visible behaviour on upgrade: a prompt appears for every existing
install's projects, on first run, with no default that is not itself a decision.
The cost of A is not code, it is the `CONFIG_DIR_NAME`-class upgrade hazard that
`extensibility/hooks/trust.ts` already reasoned its way around by making approval
implicit and one-time — and that reasoning is not available here, because trust
is per-_directory_ and a repository can be untrusted without any single file
having changed.

Note what the previous revision claimed about A's cost and what is now true of it:
the two tests it predicted would go red
(`test/extension-context-project-trust.test.ts`,
`test/issue-7955-extension-project-trusted.test.ts`) have both been **rewritten**
and neither asserts the old value. Their cost is gone, because WI-20 already paid
it. A still stands against a released changelog entry at
`CHANGELOG.md:1645`. Its blast radius also exceeds this ADR: the `types.ts:642-650`
comment describes project trust as covering `extensions, settings, skills,
resources`, so A either gates more than this document decides or contradicts
itself.

**Why not C (defer, and document the shipped posture).** C was correct on 2026-10-01
and is **unavailable** now. C's content was "ratify `isProjectTrusted() === true`
as the shipped posture" — and WI-20 replaced that literal with a real value that
refuses by default. There is no unchanged posture left to ratify, so choosing C
today would mean documenting a state the tree is not in. C is not rejected on the
merits; it has been overtaken by a change made under bead `m2-wi-20-049` while
this decision was still unratified. That ordering is itself a fact worth
recording: **the code moved first, and this document is catching up.**

**The scope statement B requires.**

M2 **asserts**: project-scoped extension code loads unconditionally, from both
`.omp/extensions` and project-scoped plugin registry entries; project entries
shadow user entries for the same plugin ID; the project's trust decision is
three-valued and defaults to refusing; `isProjectTrusted()` reports that decision
and is a real value, not a compatibility shim; `ctx.exec` is outside the decision
by choice, per section 3; and **none of this is enforced on the load path**.

M2 **does not assert**: that any of it is correct. That the two paths in `(b)`
deserve the same treatment — `(b′)` says they are not the same exposure. That
`undecided`-refuses is the right default, as opposed to merely the safe one. That
a future gate would be cheap. Silence on any of these would make this decision
indistinguishable from never having decided.

**Cost of choosing B, stated plainly:** the exposure in section 2 ships
unmitigated past M2, and B is _specifically_ the option that does not mitigate
it. A configuration boundary is a boundary only where something reads the
configuration; per `(e)`, nothing does. Choosing B therefore buys a decision
without a gate, and the entire remaining risk of this document is concentrated in
the gap between the two. The execution item in section 5 is what makes that a
scheduled cost rather than a permanent one — and it is the only part of this
decision that is not already done.

---

## 5. Consequences and the owned execution item

**Unblocked by this decision:** extension authors can rely on two things, and the
second one changed under the previous revision of this document, so it is stated
again explicitly. They can rely on **unconditional project-local loading** — that
is still true, per `(e)`. They can **no longer** rely on
`isProjectTrusted() === true`: that was the compatibility shim, and it is gone.
Code that branches on it now takes a different branch for an undecided project,
which is the intended behaviour and is a breaking change for an extension that
assumed the shim. `test/issue-7955-extension-project-trusted.test.ts` asserts
presence and consistency rather than the old value for exactly this reason.

**The implementation is M–L and outside M2. No milestone in the programme owns
it, including M3. This ADR assigns it:**

- **Name:** `M–L` — wire `assertTrusted` into the project-scoped extension load paths
- **Owner:** _unassigned_
- **Date:** _not scheduled_

> Owner has not ratified this decision, so no owner and no date are recorded here
> deliberately. A deadline invented to satisfy a completeness gate is worse than
> no deadline: it reads as a commitment nobody made and will be treated as one.

The scope is now narrower and more specific than "gate project-scoped extension
loading", because the decision record it needs already exists. Per the measured
facts above:

- The two load paths in `(b)` must be decided **separately** — `(b′)` shows they
  are not equivalent exposures, and a single gate applied uniformly would paper
  over the worse one. A plugin entry's `installPath` need not be inside the
  workspace at all, so a gate keyed on `<cwd>/.omp` does not cover it.
- The gate must call `assertTrusted` (`project-trust.ts:202`) at the load
  boundary, not merely exist. Per `(e)`, the current state is a decision with no
  consumer, and the consumer is the whole of the remaining work.
- **The mechanism is not missing; core's use of it is.** Per `(d)` the decision
  is already answerable at two live sites — `runner.ts:2020` and
  `agent-session.ts:7812`, both `isProjectTrusted: () =>
isProjectTrustedForScope(this.settings)`. So this item does not build a way to
  ask the question; it asks it earlier. That distinction is why the scope is
  "M–L" and not "M–XL": the decision, its storage, its UI, and its refusals are
  built and tested (`test/project-trust-gate.test.ts`, 11 rows). What is absent
  is a single question asked at the load boundary, and both of the open branches
  below — enforce or state honestly — are waiting on exactly that one thing.
- It must define what happens when the decision is `undecided`, since `undecided`
  refuses and every existing install is `undecided`. The upgrade path that
  `extensibility/hooks/trust.ts` used — record on first sight, then treat as
  approved — is available here too, and choosing it is part of this item rather
  than a detail of it.
- Any such gate must include `ctx.exec` (section 3) or it is not a gate.

---

## 6. Revisit triggers

Reopen this decision if any of the following becomes true:

- A marketplace or plugin registry gains install-from-network semantics, so
  `(b′)` is reachable without a clone.
- A sandbox or process-isolation boundary lands for extensions, making `ctx.exec`
  bounded and section 3's reasoning change.
- The `types.ts:642-650` scope (`extensions, settings, skills, resources`) gains a
  second implementation, making a partial gate actively misleading.
- The `projectTrust` decision is actually enforced, at which point the difference
  between "the user has not decided" and "the user said no" becomes visible in
  the load path — and the `undecided` upgrade question in section 5 has to be
  answered before it can be, not after.
- Issue #7955's premise is revisited upstream in Pi, changing what the value must
  mirror.

---

## 7. Collateral decision, still open

Two extensions registering the same CLI flag name currently both receive the
command-line value (`setFlagValue` applies to every extension declaring it).
Whether a collision should be rejected at load, namespaced, or warned about is
undecided. See bead `m2-wi-11-046`.

## 8. Owner ruling: the capability registry is extension-reachable

**RATIFIED — owner decision, 2026-10-01.** Relayed by peer `ultraworkers-a4`;
recorded here so the next reader does not have to re-derive it.

**M2-OQ2 = YES.** The capability registry becomes a surface an out-of-repo
extension can reach, on the same terms as every other registration seam in this
programme. It is `packages/coding-agent/src/capability/index.ts` — **718 lines**
measured 2026-10-02, not the 614 quoted on 2026-10-01 and the 588 before that; the
figure moves with the file, so treat it as a snapshot, not a specification.

This is a _ruling on ownership_, not a completed implementation. It settles the
question "does an extension have a seam to reach this?" — the registry is in
scope for decomposition, and a milestone proposing a capability that already
exists there will be declined. It does **not** by itself create the seam, and it
does not say which limb the capability lands in.

Two consequences worth stating so they are not re-litigated:

- A decomposition of `capability/` must keep the registration seam reachable
  from outside the repo. A move that hardcodes the registry back into core
  contradicts this section.
- The programme's single test still governs: an extension written outside this
  repo must reach the capability registry **without changing a line of core**.

Tracked by `m2-wi-5-038`. Sections 1-7 above are unaffected by this ruling; it
adds a ratified decision, it does not ratify the proposal in Section 4.

## 9. Open question: which resources a refusal must cover

**OPEN — not decided here, and deliberately unanswered.** Raised by peer review
2026-10-02.

`assertTrusted(resource, scope)` (`project-trust.ts:202`) takes a
`ProjectTrustResource` so the thrown `ProjectTrustError` can name what was
refused. The list those names come from is already concrete:
`PROJECT_TRUSTED_RESOURCES` is `["extensions", "plugins", "settings", "skills"]`
(`project-trust.ts:63`), and `ProjectTrustResource` is derived from it at `:65`.

So the enumeration is not the open part. **Which of the four must actually be
refused in an untrusted project is**, and that is a product decision, not an
implementation detail:

- `extensions` and `plugins` are the exposures this document is about — code that
  runs. Refusing them is the decision every other section assumes.
- `settings` is not the same kind of thing. The project-scoped settings file
  configures the agent; refusing it means a project cannot set a preference
  without also being trusted to ship code. Whether a directory earns trust _to
  configure_ before it earns it _to execute_ is exactly the question.
- `skills` sits between the two — a skill is content the agent reads, which is
  closer to configuration than to execution.

The answer changes what M–L means. Gating `extensions` and `plugins` is the
item section 5 scopes; gating `settings` as well is a larger upgrade hazard,
because every existing install is `undecided` and would stop reading its own
project configuration.

**Nothing above is a recommendation.** This is recorded so the owner rules on it
rather than having the first implementation pick by omission.
