# Extension trust model

## Status

**Proposed — decision recorded, ratification pending.**

- **Decider:** `tranquangdang21` (product owner) — ratification outstanding
- **Date:** 2026-10-01
- **Work item:** `m2-wi-0-030` (MILESTONE_2_EXECUTION_PLAN · `WI-0`)
- **Anchors measured against:** `895fd263a2`

Section 1 is settled fact, measured against the tree. Section 2 is analysis.
Section 4 is the decision; it is written, and it is the one the shipped code
already implements. It is recorded here so it is visible rather than implicit —
but ratifying it is the owner's call, and until it is ratified this document is a
proposal, not a policy.

---

## 1. What ships today

Five statements about the code as it is. No judgement here — that is section 2.

**(a) Project-scoped extension input is discovered and loaded, and the only
condition on it is a CLI flag, not a trust decision.**

```
packages/coding-agent/src/main.ts:2234
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
packages/coding-agent/src/discovery/helpers.ts:1297
    // Project entries take precedence over user entries for the same plugin ID.
```

This is stated in the code and is the load-order consequence that matters: a
cloned repository's registry can shadow, not merely add to, what the user has
installed. From there, `plugins/loader.ts:95` enumerates `<root>/node_modules`
per root and `plugins/loader.ts:331`/`:407` resolve the `omp.extensions` manifest
key, so the shadowed plugin's extension modules load as project-scoped roots.

**(c) `isProjectTrusted()` is declared twice on the extension-facing context.**

```
packages/coding-agent/src/extensibility/extensions/types.ts:520
packages/coding-agent/src/extensibility/extensions/types.ts:587
```

**(d) Both implementations are the literal `() => true`.**

```
packages/coding-agent/src/extensibility/extensions/runner.ts:1589
    isProjectTrusted: () => true,
packages/coding-agent/src/session/agent-session.ts:7701
    isProjectTrusted: () => true,
```

**(e) No prompt, allowlist, or gate exists anywhere on the load path.**

> **Anchor note.** The work item cites `runner.ts:1264`, `agent-session.ts:7406`,
> `types.ts:487-494`, and `types.ts:548-561`. All four had drifted and none points
> at these sites. The work item also ships its own correction table measured on
> `65cc6c1`; every anchor in that table has drifted again and none matches this
> commit. Verify against the symbol, not the line number.

---

## 2. Threat model

**The attacker is anyone who controls a repository you clone, or a pinned plugin
version in that repository's lockfile. The asset is arbitrary code execution with
your credentials and shell, reached by running `omp` inside a directory you were
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

**What `isProjectTrusted()` buys today.** Nothing (`(d)`). An extension calling it
learns that the value is `true`, so code written against it branches on a value
that cannot be false: the branch is never exercised and the safe path is never
taken. That is worse than its absence, because absence is visible and this is not.

**This is already true today, not a future risk.** The posture is stated three
times in shipped code and docs — `types.ts:513-520`, `types.ts:582-586` ("OMP has
no equivalent per-directory trust gate … always returns `true`, truthfully
reflecting that OMP already trusts project-local inputs by default"), and the
released changelog entry for #7955 (`packages/coding-agent/CHANGELOG.md:1394`).
The gap is the absence of a decision, not the presence of a defect.

---

## 3. What `ctx.exec` means here (M2-OQ5)

**Answer: `ctx.exec` is deliberately outside the gate, on the reasoning that an
extension which has loaded at all has already been trusted.**

It is declared on the extension context at
`packages/coding-agent/src/extensibility/extensions/types.ts:1653`:

```
exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
```

This is stated explicitly because the alternative — blocking module load while
leaving `ctx.exec` outside — would produce a document that *looks* safe and is
not. Any gate on loading is worthless unless this call is inside it, and under
this decision it is not, by choice.

The consequence is accepted rather than mitigated: the trust boundary is the load
path, and everything reachable from a loaded extension — including `ctx.exec` — is
inside the blast radius by design.

---

## 4. The decision

**Option C — defer the behaviour change, and record explicitly what M2 asserts and
does not assert.** The shipped posture is ratified as the documented posture
rather than changed.

**Why not A (prompt per project).** It is the cheapest in code — the seam already
has the right shape — but it is not free, and the ADR should say so rather than
summarize it away. Two implementations must change (`runner.ts:1589`,
`agent-session.ts:7701`); two existing tests assert the current value
(`test/extension-context-project-trust.test.ts`,
`test/issue-7955-extension-project-trusted.test.ts`) and go red; and it
contradicts a **released** changelog entry at `CHANGELOG.md:1394`, making it a
user-visible behaviour change requiring its own changelog entry and issue link.
Its blast radius also exceeds this ADR: the `types.ts:582-586` comment describes
project trust as covering `extensions, settings, skills, resources`, so A either
gates more than this document decides or contradicts itself.

**Why not B (declaration in config).** No prompt and zero friction, with the
supply-chain boundary living in configuration — but it demands an explicit
user-scope entry, which is friction moved rather than removed.

**The scope statement C requires.**

M2 **asserts**: project-scoped extension code loads unconditionally, from both
`.omp/extensions` and project-scoped plugin registry entries; project entries
shadow user entries for the same plugin ID; `isProjectTrusted()` returns `true`
by design and is a compatibility shim for upstream Pi, not an unfinished
feature; and `ctx.exec` is outside the gate by decision, per section 3.

M2 **does not assert**: that this is correct. That the two paths in `(b)` deserve
the same treatment. That a future gate would be cheap. Silence on any of these
would make this deferral indistinguishable from never having decided.

**Cost of choosing C, stated plainly:** the exposure in section 2 ships
unmitigated past M2. The execution item in section 5 is what makes that a
scheduled cost rather than a permanent one.

---

## 5. Consequences and the owned execution item

**Unblocked by this decision:** extension authors can rely on
`isProjectTrusted() === true` and on unconditional project-local loading, and both
are now written down rather than inferred from a changelog line.

**The implementation is M–L and outside M2. No milestone in the programme owns
it, including M3. This ADR assigns it:**

- **Name:** `M–L` — gate project-scoped extension loading
- **Owner:** `tranquangdang21` (product owner)
- **Date:** 2026-12-31

Scope for that item, per the measured facts above: the two load paths in `(b)`
must be decided **separately** — `(b′)` shows they are not equivalent exposures,
and a single gate applied uniformly would paper over the worse one. Any such
gate must include `ctx.exec` (section 3) or it is not a gate.

---

## 6. Revisit triggers

Reopen this decision if any of the following becomes true:

- A marketplace or plugin registry gains install-from-network semantics, so
  `(b′)` is reachable without a clone.
- A sandbox or process-isolation boundary lands for extensions, making `ctx.exec`
  bounded and section 3's reasoning change.
- The `types.ts:582-586` scope (`extensions, settings, skills, resources`) gains a
  second implementation, making a partial gate actively misleading.
- Issue #7955's premise is revisited upstream in Pi, changing what the shim must
  mirror.

---

## 7. Collateral decision, still open

Two extensions registering the same CLI flag name currently both receive the
command-line value (`setFlagValue` applies to every extension declaring it).
Whether a collision should be rejected at load, namespaced, or warned about is
undecided. See bead `m2-wi-11-046`.
