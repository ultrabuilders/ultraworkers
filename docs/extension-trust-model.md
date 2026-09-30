# Extension trust model

## Status

**Proposed — decision pending.**

- **Decider:** _unassigned_
- **Date:** 2026-10-01
- **Work item:** `m2-wi-0-030` (MILESTONE_2_EXECUTION_PLAN · `WI-0`)

"What ships today" below is settled fact, measured against the tree. The threat
model is analysis. **The open decision has not been made, and nothing in it has
been chosen.**

---

## 1. What ships today

Five statements about the code as it is. No judgement here — that is section 3.

**(a) Project-scoped extension input is discovered and loaded conditionally.**
The condition is on whether `--trusted-extensions` was passed, not on any trust
check:

```
packages/coding-agent/src/main.ts:2234
    parsedArgs.trustedExtensions?.length
        ? await loadTrustedSessionExtensions(sessionOptions, cwd, eventBus)
        : await loadSessionExtensions(sessionOptions, cwd, settingsInstance, eventBus);
```

The same two-branch shape appears at `main.ts:535`.

**(b) The two load paths resolve their project root differently, and they are
not the same path.**

The `.omp` path resolves its project root to the workspace:

```
packages/coding-agent/src/discovery/omp-extension-roots.ts:162
    project: path.join(ctx.cwd, ".omp"),
```

The plugin path does not. Its root is `entry.installPath`, read from a registry
entry, and deduped by that same value:

```
packages/coding-agent/src/discovery/helpers.ts:1226
    path: entry.installPath,
packages/coding-agent/src/discovery/helpers.ts:1268
    if (roots.some(r => r.id === pluginId && r.path === entry.installPath)) continue;
```

So a plugin's code can live outside `<cwd>/.omp` entirely. These are two
different exposures and are not merged into one claim anywhere in this document.

**(c) `isProjectTrusted()` is declared twice on the extension-facing context.**

```
packages/coding-agent/src/extensibility/extensions/types.ts:520
packages/coding-agent/src/extensibility/extensions/types.ts:587
```

**(d) Both implementations are the literal `() => true`.**

```
packages/coding-agent/src/extensibility/extensions/runner.ts:1515
    isProjectTrusted: () => true,
packages/coding-agent/src/session/agent-session.ts:7605
    isProjectTrusted: () => true,
```

**(e) No prompt, allowlist, or gate exists anywhere on the load path.** A search
of `src/discovery/` and `src/extensibility/extensions/loader.ts` for trust
machinery returns nothing; the only hits are unrelated prose in
`builtin-rules/*.md` about TypeScript type trust.

> **Anchor note.** The four anchors cited by the work item
> (`runner.ts:1264`, `agent-session.ts:7406`, `types.ts:487-494`,
> `types.ts:548-561`) had all drifted and no longer point at these sites. The
> values above were re-measured. Any document quoting the originals is quoting
> the wrong lines.

---

## 2. Threat model

**Who can write extension code you will load.**

1. **Anyone who can write to a repository you clone.** `.omp/extensions/` is
   inside the workspace (`(b)`, first half), so a commit — yours, a
   collaborator's, or a dependency's — can add extension code that loads with
   the session's full privileges. Reviewing the diff is currently the only
   control.
2. **A plugin entry in the registry.** The plugin path resolves to
   `entry.installPath` (`(b)`, second half), so the code that runs need not be
   in the workspace at all. Whatever writes that registry decides what runs.
3. **A transitive dependency.** Same reach as (1) if it can write into the
   workspace, and it does not need to be an extension to get there.

**What an extension can reach once loaded.** Extensions are TypeScript modules
evaluated in-process, not a sandboxed plugin format. They see the extension API
and the session context, so the relevant question is not "what does the flag
allow" but "what does the process allow" — which is everything the agent can do.

**What `isProjectTrusted()` does and does not buy.** Today it returns `true`
(`(d)`). An extension calling it learns nothing. It is a question without an
answer, which is worse than no question: code written against it will branch on
a value that cannot be false, so the branch is untested and the safe path is
never taken.

**What is *not* claimed here.** No statement is made about whether the current
behaviour is acceptable. That is section 4, and it is not written yet.

---

## 3. The open decision

Not chosen. Recorded here so the question is not lost.

The shape of the question: `applyExtensionFlags`-style shared state aside, the
decision is what `isProjectTrusted()` should mean, given that project-scoped
code is already loadable from inside the repository.

The decision needs an owner because it is a product judgement — who is expected
to be running omp, and what they are expected to have already trusted — not a
technical one. Every option below is implementable; they differ in who gets
surprised.

- **(A)** Leave the seam, make it real: prompt once per project, cache the answer.
- **(B)** Make it a declaration — the project states its trust in config, and the
  runner refuses to load otherwise.
- **(C)** Split the two paths — treat `.omp/extensions` (inside the repo, visible
  in the diff) differently from plugin entries (outside it, not visible), because
  they are different exposures per `(b)`.

**(C) is the option the code most supports**, since `(b)` already shows the two
paths resolve differently and conflating them is the error to avoid. That is an
observation about the code, not a recommendation, and it is not a decision.

### Collateral decision, still open

A second, smaller question rides along: two extensions registering the same CLI
flag name currently both receive the command-line value (`setFlagValue` applies
to every extension declaring it). Whether a collision should instead be rejected
at load, namespaced, or warned about is undecided. See bead `m2-wi-11-046`.
