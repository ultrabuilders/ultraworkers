# Dynamic Workflows — Implementation Plan

> **Status:** approved, awaiting implementation · **Date:** 2026-10-04
> **Author:** Claude Code · **Reviewer:** `ultraworkers-d9`
> **Decisions locked with owner:** `Workflow` is a builtin · scripts are JavaScript ESM

---

## Table of contents

1. [Context](#context) · 2. [Architectural decision](#architectural-decision) · 3. [Traceability matrix](#traceability-matrix)
4. [Keep/cut ledger](#keepcut-ledger) · 5. [Target file tree](#target-file-tree) · 6. [Phases 1–8](#phase-1--engine)
7. [Definition of done](#definition-of-done) · 8. [Risks](#risks) · 9. [Verification](#verification)

---

## Context

Subagents today push results into context **on every turn**. A workflow holds them in the script,
and context receives only the final result. That is why `/ultracode` is still a badge rather than a
real fan-out run.

**This repo had no workflow concept at all** — blank slate, not a refactor. Measured before the
implementation landed:

```
$ grep -rni workflow packages/coding-agent/src
  → gh-run-watch.ts (GitHub Actions), a few security-pipeline mentions
$ find packages -type d -name "*workflow*"
  → (empty)
```

⚠️ **Re-run both before citing them as current.** The `find` half is still accurate today — the
destination `packages/coding-agent/src/workflows/` does not exist yet and the move has not landed.
The `grep` half is **already stale**: it returns **141** hits, not the handful quoted, because the
word "workflow" is common in CI and commit machinery
(`src/commit/agentic/validation.ts`, `src/cleanse/checkers.ts`, …) — none of them the concept.
Treat the numbers above as the historical baseline that justified building rather than refactoring.

### Reference sources

| Repo | License | Version | Last commit | `src/` LOC | Role |
|---|---|---|---|---|---|
| [`quintinshaw/pi-dynamic-workflows`](https://github.com/quintinshaw/pi-dynamic-workflows) | MIT © 2026 QuintinShaw | 3.13.1 | 2026-09-29 | 24,740 | **Primary source — copy** |
| [`tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents) | MIT © 2026 tintinweb | 0.19.0 | 2026-09-03 | 20,929 | **Read to rule out** |
| `code.claude.com/docs/en/workflows` | docs | — | — | — | UI reference, not a repo |

Copies live in `.tmp/ref/`. **Every line number in this plan refers to `pi-dynamic-workflows`.**
When a step says `workflow.ts:1802` that is `.tmp/ref/pi-dynamic-workflows/src/workflow.ts`
line 1802.

---

## Architectural decision

**Built into the package: `packages/coding-agent/src/workflows/`.**

> Superseded 2026-10-04 by the owner. The previous decision — build it as an out-of-repo extension
> under `.claude/plugins/workflow/` — is **withdrawn**. Verbatim, on `epic-dynamic-workflows-259n`:
>
> > "check ultraworkers-b9 hiện tại peer đang hiểu nhầm nên implement vào `.claude` đó là sai
> > **trong khi chúng ta đang build in logic implement ở package mà**"
>
> Recorded in the ledger at commit `2f7b1d5fa6`, so it can be checked rather than taken on trust:
>
> ```bash
> $ grep -c "QUYẾT ĐỊNH CỦA OWNER" .beads/issues.jsonl   # → 2
> ```

**Why the old placement could not load — measured, not asserted.** The extension loader reads
`providers: ["native"]` (`loader.ts:1108`), which resolves the source to `claude`
(`builtin.ts:44` `SOURCE_PATHS.native`), and `discoverExtensionModulePaths` scans only
**`<configDir>/extensions`** (`builtin.ts:491`). `.claude/plugins/workflow/` is **not in any scan
root**, so it never loaded at all. That is why the destination is `src/workflows/` rather than a
judgment about where extensions belong.

**History is preserved by `git mv`, not by rewriting files.** A file moved with `git mv` keeps
its history; the same file written afresh does not.

### What the seam table still establishes

The five seams AGENTS.md names all exist, measured at
`packages/coding-agent/src/extensibility/extensions/types.ts`:

| Needed | Verbatim | Line |
|---|---|---|
| tool | `registerTool` | `:1658` |
| slash command | `registerCommand` | `:1936` |
| config key | `registerSetting` | `:2054` |
| lifecycle hook | `on(event, handler)` — 35 events | `:1568-1651` |
| TUI panel | `setWidget` / `setStatus` / `setFooter` / `setHeader` | `:371` / `:355` / `:390` / `:398` |

⚠️ **Do not grep for `registerHook`** — it does not exist, `0` hits. The real name is `on(...)`.
Measuring by a guessed name returns zero; measuring by the real name returns the seam.

### What changed, and what did not

The old section argued that shipping into core "proves nothing". **That argument was correct about
the out-of-repo tree and has been overruled for this epic** — the tree it described did not load,
so it could not demonstrate anything either way. The boundary that survives is narrower and still
fenceable:

> **259n's implementation may touch `packages/coding-agent/src/workflows/`. What is forbidden is
> touching anything outside it.**

This retires the earlier "zero core diff" criterion (`d5579c400`), which rested on the withdrawn
decision. `core-diff.test.ts` keeps its rows but must watch the **destination** tree once the move
lands; a fence guarding a path that no longer exists is a dead fence.

### Route into the builtin registry — only if later forced

Three places must change **together**:

| Location | Content |
|---|---|
| `tools/builtin-names.ts:1` | add the name to `BUILTIN_TOOL_NAMES`; `:34` derives `BuiltinToolName` from it |
| `tools/index.ts:570` | entry in `BUILTIN_TOOLS` |
| `tools/tool-admission.ts:99` | `ADMISSION_RULES` is `satisfies Record<BuiltinToolName \| HiddenToolName, ToolAdmissionRule>` ⇒ **a missing rule is a compile error** |

`tool-admission.ts:179` (`?? true`) is where *unknown names are admitted* — the slot for
runtime-registered tools, so `registerBuiltinTool` (`:642`) needs no rule.

⚠️ **Re-measure before relying on these line numbers** — the tree has many agents on it.

### Route into core — only if later forced

Three places must change **together**:

| Location | Content |
|---|---|
| `tools/builtin-names.ts:1` | add the name to `BUILTIN_TOOL_NAMES`; `:34` derives `BuiltinToolName` from it |
| `tools/index.ts:570` | entry in `BUILTIN_TOOLS` |
| `tools/tool-admission.ts:99` | `ADMISSION_RULES` is `satisfies Record<BuiltinToolName \| HiddenToolName, ToolAdmissionRule>` ⇒ **a missing rule is a compile error** |

`tool-admission.ts:179` (`?? true`) is where *unknown names are admitted* — the slot for
runtime-registered tools, so `registerBuiltinTool` (`:642`) needs no rule.

⚠️ **Re-measure before relying on these line numbers** — the tree has many agents on it.

---

## Traceability matrix

Each row: *requirement* → *evidence in the reference repo* → *our target file* → *proving test*.

| # | Requirement | Copy source | Target file | Test |
|---|---|---|---|---|
| 1 | Parse `export const meta` | `workflow.ts:2011-2071` | `src/engine/parse.ts` | `parse.test.ts` |
| 2 | Reject `__proto__` in literals | `workflow.ts:2083-2085` | `src/engine/parse.ts` | `parse.test.ts` |
| 3 | vm sandbox, no host built-ins | `workflow.ts:1799-1817` | `src/engine/vm.ts` | `determinism.test.ts` |
| 4 | `Math.random` / `Date.now` throw | `workflow.ts:529-546` | `src/engine/vm.ts` | `determinism.test.ts` |
| 5 | 19 globals for the script | `workflow.ts:1776-1798` | `src/engine/contract.ts` | `contract.test.ts` |
| 6 | `agent()` returns `null`, never throws | `workflow.ts:758-760`, `:2346` | `src/agent-bridge.ts` | `agent-null.test.ts` |
| 7 | Schema bypasses the emptiness check | `workflow.ts:2346-2348` | `src/agent-bridge.ts` | `agent-null.test.ts` |
| 8 | `assembleRuntimeBindings` | `capability-contract.ts:107-132` | `src/engine/contract.ts` | `contract.test.ts` |
| 9 | `diagnoseAlignment` detects drift | `:154-159`, `:787-837` | `src/engine/contract.ts` | `contract.test.ts` |
| 10 | Block subagent recursion | `agent.ts:771` | `src/agent-bridge.ts` | `recursion.test.ts` |
| 11 | All-settled fan-out | `task/parallel.ts:98` | reuse, do not copy | `fanout.test.ts` |
| 12 | Model routing per phase | `model-routing.ts:73` | `src/engine/routing.ts` | `routing.test.ts` |
| 13 | `deltaKey = ${runId}:${callIndex}` | `workflow.ts:892-914` | `src/persistence/store.ts` | `resume.test.ts` |
| 14 | Delta-append JSONL format | `run-record-store.ts:75-98` | `src/persistence/store.ts` | `store-format.test.ts` |
| 15 | Lease against two processes | `run-persistence.ts:250-261` | `src/persistence/lease.ts` | `lease.test.ts` |
| 16 | On-disk paths | `workflow-paths.ts:43-63` | `src/persistence/paths.ts` | `paths.test.ts` |
| 17 | Persist **before** observable | `workflow-manager.ts:748-776` | `src/manager.ts` | `durable-order.test.ts` |
| 18 | pause/resume/stop state machine | `workflow-control-tool.ts:216-229` | `src/manager.ts` | `control-schema.test.ts` |
| 19 | Object schema, never `anyOf` | `workflow-tool.ts:8-15` | `src/tools/workflow-control.ts` | `control-schema.test.ts` |
| 20 | Structured errors, never thrown at the model | `workflow-control-tool.ts:209-214` | `src/tools/workflow-control.ts` | `control-schema.test.ts` |
| 21 | Three-tier navigator | `workflow-ui.ts:108` | `src/ui/navigator.ts` | `keybindings.test.ts` |
| 22 | 16 keys + text modes swallow all keys | `workflow-ui.ts:1891-1950`, `:2102` | `src/ui/keymap.ts` | `keybindings.test.ts` |
| 23 | Double-tap confirmation | `workflow-ui.ts:2150-2162`, `:937-958` | `src/ui/navigator.ts` | `keybindings.test.ts` |
| 24 | Two panes; narrow terminal → one pane | `workflow-ui.ts:1163-1290`, `:1316` | `src/ui/layout.ts` | `layout.test.ts` |
| 25 | Panel takes no input | `task-panel.ts:1761-1762` | `src/ui/panel.ts` | `panel.test.ts` |
| 26 | Token `""` when unknown, `~` when estimated | `display.ts:142-160` | `src/ui/format.ts` | `format.test.ts` |
| 27 | User script shadows built-in | `builtin-workflows.ts:145-155` | `src/workflows/registry.ts` | `registry.test.ts` |
| 28 | `/ultracode` is a slash command | `effort-command.ts:71-87` | `src/commands/ultracode.ts` | `ultracode.test.ts` |
| 29 | Five quality helpers | `workflow.ts:1468-1630` | `src/engine/helpers.ts` | `helpers.test.ts` |
| 30 | Approval gate — **our design** | *absent from the reference repo* | `src/consent.ts` | `consent.test.ts` |

---

## Keep/cut ledger

| Ref file | LOC | Action | Reason |
|---|---|---|---|
| `workflow.ts` | 2406 | **copy ~700** | parse + vm + prelude + `agent` + `parallel`/`pipeline` + 5 helpers |
| `workflow-capability-contract.ts` | 848 | **copy ~180** | `WorkflowRuntimeImplementations` + `assembleRuntimeBindings` + `diagnoseAlignment` |
| ↳ `capabilities` descriptors | ~330 | **CUT** | generates markdown; we have our own skill system |
| ↳ `AGENT_OPTIONS` etc. shapes | ~90 | **CUT** | same reason |
| `workflow-comprehension.ts` | 1673 | **CUT** | generates docs from descriptors |
| `workflow-authoring-coverage.ts` | 502 | **CUT** | checks docs ↔ code; we author our own docs |
| `run-persistence.ts` | 790 | **copy ~300** | types + lease + `createRunPersistence` |
| ↳ full `RunPersistenceOptions` | ~15 | **CUT** | not all used |
| ↳ list cache TTL | ~5 | **CUT** | not needed |
| `run-record-store.ts` | 500 | **copy ~250** | delta-append format |
| `fs-persistence.ts` | 210 | **copy interface** | `PersistenceFsLayer` for test injection |
| `workflow-manager.ts` | 2412 | **copy ~600** | `startInBackground`, pause/resume/stop, events |
| ↳ `adoptLiveRunsToSession` | ~40 | **CUT** | their own session-id system |
| ↳ model registry plumbing | ~60 | **CUT** | replaced by `@oh-my-pi/pi-catalog` |
| `workflow-ui.ts` | 2346 | **copy ~1200** | navigator, keymap, layout |
| ↳ `savedDetail` view | ~90 | **keep** | needed for user scripts |
| `task-panel.ts` | 1782 | **copy ~400** | compact + detailed panel |
| `display.ts` | 469 | **copy ~180** | token/cost/tree formatting |
| `workflow-tool.ts` | 548 | **copy ~300** | schema + descriptions |
| `workflow-control-tool.ts` | 285 | **copy ~200** | five verbs + state machine |
| `builtin-workflows.ts` | 155 | **copy ~80** | saved → built-in lookup |
| `workflow-saved.ts` | 392 | **copy ~150** | reading scripts from disk |
| `workflow-settings.ts` | 250 | **copy ~80** | a few settings |
| `workflow-editor.ts` | 444 | **copy ~200** | `hasTrigger` + arming |
| `effort-command.ts` | 88 | **copy 88** | short and correct |
| `builtin-commands.ts` | 610 | **copy ~150** | `/workflows` + `/ultracode` |
| `workflow-commands.ts` | 346 | **copy ~250** | `run`/`status`/`rm`/… verbs |
| `structured-output.ts` | 47 | **copy 47** | schema ⇒ terminating tool |
| `errors.ts` | 227 | **copy ~120** | `WorkflowError` + codes |
| `config.ts` | 55 | **copy ~30** | defaults |
| `agent-usage.ts` | 139 | **copy ~100** | token accounting |
| `logger.ts` | 102 | **copy ~60** | log persistence |
| `model-spec.ts` | 361 | **copy ~80** | thinking-level validation |
| `model-routing.ts` | 73 | **copy 73** | per-phase routing |
| `agent-registry.ts` | 233 | **CUT** | pi agent types; we have none |
| `agent.ts` | 1599 | **copy ~250** | bridge portion only |
| `agent-history.ts` | 157 | **copy ~80** | |
| `shared-store.ts` | 329 | **copy ~120** | delta key |
| `worktree.ts` | 148 | **copy ~100** | isolation |
| `agent-history`, `usage-limit-scheduler` | 566+ | **CUT** | no usage-limit here |
| `deep-research.ts` | 135 | **CUT** | see "What you need to know" |
| `adversarial-review.ts` | 120 | **copy ~100** | real voting |
| `code-review.ts`, `workflow-context-measurement` | 183+262 | **CUT** | out of scope |
| `workflow-release-gate.ts` | 526 | **CUT** | their own gate |
| `pi-extension.ts` | 378 | **copy ~120** | the registration portion |
| **TOTAL** | 24,740 | **~6,700** | |

---

## Target file tree

The implementation lives at **`packages/coding-agent/src/workflows/`**. It is moved with `git mv`,
so this is a relocation of the tree below, not a rewrite of it.

```
.claude/plugins/workflow/src/   →   packages/coding-agent/src/workflows/
├── engine/parse.ts                    engine/journal.ts
│                                     engine/journal-delta.ts
│                                     engine/contract.ts
│                                     engine/paths.ts
│                                     engine/vm.ts
├── errors.ts                          status.ts
├── types.ts                           config.ts
├── manager.ts
├── agent-bridge.ts                    agent-runner.ts
├── agent-usage.ts                     agent-history.ts
├── usage.ts
├── persistence/lease.ts               persistence/record-store.ts
│                                     persistence/resume-journal.ts
│                                     persistence/run-persistence.ts
│                                     persistence/run-agent-settlement.ts
├── tools/workflow-control.ts
└── ui/panel.ts                        ui/format.ts
                                      ui/keymap.ts
                                      ui/layout.ts
```

Reference-repo provenance for the files above is in `NOTICE.md`, moved alongside them.

⚠️ **The plan this tree was first drawn from named files that were never built** —
`engine/routing.ts`, `engine/helpers.ts`, `commands/`, `settings.ts`, `workflows/registry.ts`,
`structured-output.ts`, `persistence/fs.ts`, and `logger.ts` appear in the original mapping and do
not exist. Treat a target name in that table as a *proposal*, never as a fact about the tree;
`find .claude/plugins/workflow/src -name '*.ts'` is the measurement.

Tests live beside them at `packages/coding-agent/test/workflows/`.

**Files may land in `packages/coding-agent/src/workflows/` — that is now the destination.** The
withdrawn rule was "no file lands in `packages/`"; it is replaced by the narrower boundary above:
implementation may touch that directory and nothing outside it.

---

## Phase 1 — Engine: parse + vm + determinism

### 1.1 `parseWorkflowScript` — copy `workflow.ts:2011-2071`

**Check order must not be reversed** — blocklist first, AST second.

| # | Check | Line | Error when violated |
|---|---|---|---|
| 1 | Blocklist | `:2012-2018` | `SCRIPT_VALIDATION_ERROR`, `recoverable: false` |
| 2 | `parse(…)` | `:2020-2026` | — |
| 3 | `body[0]` is `ExportNamedDeclaration` | `:2028-2035` | `must be the first statement` |
| 4 | `kind === "const"` | `:2038-2046` | `must be 'export const meta = …'` |
| 5 | exactly one declarator | `:2047-2051` | `must declare only 'meta'` |
| 6 | named `meta` | `:2053-2058` | — |
| 7 | has an initializer | `:2059-2062` | `must have a literal value` |
| 8 | `evaluateLiteral` + `validateMeta` | `:2064-2065` | — |
| 9 | strip the export from the body | `:2069` | `slice(0,first.start)+slice(first.end)` |

Blocklist (`:514`):
```ts
const DETERMINISM_BLOCKLIST = /\bDate\s*\.\s*now\b|\bMath\s*\.\s*random\b|\bnew\s+Date\s*\(\s*\)/;
```

⚠️ **Swap the parser.** The reference repo uses `acorn` (`:3-4`). We **do not have acorn**; we have
`@babel/parser` ^7.29.7 (`package.json:17`, catalog dep). Equivalent:
`parse(code, { sourceType: "module", plugins: ["topLevelAwait"] })`. The eight-step logic stays
as-is; only the AST layer changes.

### 1.2 `evaluateLiteral` — copy `:2073-2109`

Accepts only `ObjectExpression`, `ArrayExpression`, `Literal`, non-interpolated `TemplateLiteral`,
and negative-number `UnaryExpression`. Rejects: spread, computed keys, methods/accessors, sparse
arrays, interpolated templates.

**Prototype-pollution guard** (`:2083-2085`) — keep verbatim:
```ts
if (key === "__proto__" || key === "constructor" || key === "prototype") {
  throw new Error(`reserved key name not allowed in ${path}: ${key}`);
}
```

`validateMeta` (`:2118-2133`): `name` and `description` are required non-empty strings; `model` must
be a string; `phases` is an array whose every element has a string `title`. **Unknown keys are not
rejected** — meta is permissive. Keep that property.

### 1.3 Sandbox — copy `:1799-1817`

```ts
const { globals: projectGlobals, diagnostics } =
  WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings(runtimeImplementations);
const context = vm.createContext({
  ...projectGlobals,
  // Object/Array/JSON/Math/Date/Promise/Set/Map… come from the vm realm itself.
  // We deliberately do NOT inject host built-ins: their .constructor would be
  // the host Function (a determinism-guard bypass).
});
const wrapped = `${DETERMINISM_PRELUDE}\n(async () => {\n${body}\n})()`;
const result = await new vm.Script(wrapped, { filename: `${meta.name || "workflow"}.js` })
  .runInContext(context);
```

⚠️ **Scripts have no `import`.** The body is wrapped in an IIFE with no module resolution.

### 1.4 `DETERMINISM_PRELUDE` — copy `:529-546` **verbatim**

This is a **contract, not an option**. Remove it and `r` (restart) and resume become lies.

```js
"use strict";
Math.random = () => { throw new Error("Math.random() is unavailable in a workflow (it breaks resume); pass randomness via args or vary by index"); };
{
  const RealDate = Date;
  const fail = (w) => { throw new Error(w + " is unavailable in a workflow (it breaks resume); pass a timestamp via args"); };
  const SafeDate = function (...a) {
    if (!new.target) fail("Date()");
    if (a.length === 0) fail("new Date()");
    return Reflect.construct(RealDate, a, SafeDate);
  };
  SafeDate.UTC = RealDate.UTC;
  SafeDate.parse = RealDate.parse;
  SafeDate.now = () => fail("Date.now()");
  SafeDate.prototype = RealDate.prototype;
  globalThis.Date = SafeDate;
}
```

⚠️ **Write the limitation into the docs.** The reference repo's docblock (`:516-528`): *"vm is
not a security sandbox — an injected bridge function's `.constructor` is still the host Function
… best-effort against ACCIDENTAL nondeterminism from trusted (user / guided-LLM) scripts, **not
a security wall**."* Copy that warning verbatim.

### 1.5 Globals — copy `:1776-1798`

```ts
const runtimeImplementations = {
  agent, parallel, pipeline, workflow: workflowFn,
  verify, judgePanel, loopUntilDry, completenessCheck,
  retry, gate, checkpoint, log, phase,
  args: options.args,
  cwd: options.cwd ?? process.cwd(),
  process: Object.freeze({ cwd: () => options.cwd ?? process.cwd() }),
  budget,
  console: { log, info: log, warn: m => log(`[warn] ${String(m)}`), error: m => log(`[error] ${String(m)}`) },
} satisfies WorkflowRuntimeImplementations;
```

19 globals. Phase 2 is built from this.

---

## Phase 2 — Capability contract: the API-export layer

`workflow-capability-contract.ts` (848 LOC) **is** the answer to "export APIs so users can fully
customise". This is not a new design — it is copy.

### 2.1 Interface — copy `:113-132`

```ts
export interface WorkflowRuntimeImplementations {
  agent: unknown; parallel: unknown; pipeline: unknown; workflow: unknown;
  verify: unknown; judgePanel: unknown; loopUntilDry: unknown; completenessCheck: unknown;
  retry: unknown; gate: unknown; checkpoint: unknown; log: unknown; phase: unknown;
  args: unknown; cwd: unknown; process: unknown; budget: unknown; console: unknown;
}
```

**`unknown`, not concrete types.** This is the crux: the contract does not constrain the
implementation. An owner may pass `agent` as their own function, a wrapper around
`runStructuredSubagent`, or a queue — the contract does not care.

### 2.2 Three levels of customisation

**Level 1 — the script DSL.** The 19 globals from 1.5.

**Level 2 — the runtime, with owner-supplied `deps`.** `assembleRuntimeBindings(impls)` returns
`{ globals, diagnostics }` (`:107-110`):
```ts
const { globals } = WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings({
  agent: myAgent,        // swap runStructuredSubagent for IRC / worktree / your own provider
  parallel: myParallel,  // swap fan-out semantics
});
const context = vm.createContext({ ...globals });
```
The engine does not change by a single line.

**Level 3 — replace the engine entirely.** `Workflow` is a tool registered by an extension. Do not
want it → do not register it → it does not exist. Want a full replacement → write your own
extension registering a tool of the same name.

### 2.3 `diagnoseAlignment` — `:154-159`, `:787-837`

```ts
diagnoseAlignment(evidence: { suppliedImplementations?; observedProjectGlobals? }): CapabilityDiagnostic[]
```
Compares the actual implementations against the contract. `deepFreeze` (`:839-845`) runs once
inside `defineWorkflowCapabilityContract`.

**Used as a test**: the script declares 19 globals, the engine injects 18 ⇒ the test fails naming
the missing global.

### 2.4 Authoring skill — copy selectively

Keep: `SKILL.md`, `references/runtime.md`, `helpers.md`, `common-helpers.md`,
`quality-helpers.md`, `retry-helper.md`, and six examples — `fan-out-and-synthesize.js` ·
`structured-output.js` · `adversarial-verification.js` · `phased-budgets.js` ·
`validated-gate.js` · `loop-until-done.js`.

**Drop**: `registry-ownership.md` (their ownership model), `versions.md`, `review.md`,
`debugging.md`.

---

## Phase 3 — Agent bridge

### 3.1 `agent()` → `runStructuredSubagent`

The seam is `WorkflowAgentRunner` (`workflow.ts:182-184`):
```ts
export interface WorkflowAgentRunner {
  run(prompt: string, options?: AgentRunOptions<TSchema>): Promise<unknown>;
}
```

An adapter calls `runStructuredSubagent` (`task/structured-subagent.ts:707`):
```ts
{
  session, invocationKind: "task",
  assignment: prompt,
  outputSchema: options.schema,        // "presence, not truthiness = highest priority" (:110)
  model: options.model, effort: options.effort, signal: options.signal,
  onProgress: options.onProgress,
  blockedAgent: /* parent agent name — blocks recursion */,
  maxRuntimeMs: options.timeoutMs ?? 0,
}
```

Read from `result.result.structuredOutput` (`tui/src/tools/task.ts:2119-2126`):
```ts
{ source, mode, status: "valid"|"invalid"|"unavailable", data?, error? }
```
⚠️ **`data` is present even when strict validation rejected it** — check `status === "valid"`
before trusting it.

### 3.2 `agent()` returns `null`, never throws — `:758-760`, `:2346-2348`

```ts
export type AgentRunResult<TSchemaDef extends TSchema | undefined> =
  TSchemaDef extends TSchema ? /* object */ : string;

function isEmptyTextAgentResult(result: unknown, schema: TSchema | undefined): boolean {
  return schema === undefined && typeof result === "string" && result.trim().length === 0;
}
```
An agent with a schema **bypasses** the emptiness check — valid data may legitimately be empty.

### 3.3 Block recursion — `agent.ts:771`

`DEFAULT_EXCLUDED_SUBAGENT_TOOLS = ["workflow", "workflow_control"]`. Without this a subagent that
sees `workflow` spawns workflows without bound. Use `subagentExcludedTools()` (`agent.ts:788`).

### 3.4 Concurrency — reuse, do not write

| Need | Reuse | Location |
|---|---|---|
| Limiting | `mapWithConcurrencyLimitAllSettled` | `task/parallel.ts:98` |
| Queueing | `Semaphore` (`acquire`/`release`/`resize`) | `task/parallel.ts:140` |
| Normalisation | `normalizeConcurrencyLimit` (`max<=0` = unbounded) | `task/parallel.ts:135` |
| Reference implementation | `cleanse/agent.ts:127-224` | builds its own `ToolSession`, `dispatchWorker`, `followUp` |

The reference repo's `parallel()` is **fail-fast**; we use the all-settled variant, which matches
`agent()` returning `null`.

### 3.5 Model routing — copy `model-routing.ts:73`

`meta.phases[].model` with `meta.model` as default, via `resolveModelForPhase`.
⚠️ AGENTS.md forbids hard-coding model-conditional policy in TypeScript. The reference file only
reads strings from `meta` and **consults the catalog** — there is no `id.includes("claude")`. Keep
that principle and go through `resolveModelPolicy` in `@oh-my-pi/pi-catalog`.

---

## Phase 4 — Durability (BEFORE UI)

### 4.1 Why we must write our own

Measured at `async/job-manager.ts`: **four imports, all `import type`** (`:1-4`). Zero runtime
imports. `#jobs = new Map` (`:254-264`), a process-global singleton (`:236`), eviction after five
minutes (`:11`). **It does not survive a restart.**

`@ultraworkers/pi-durable` (`packages/durable`) exists and **nobody uses it** — the async module
does not. Measure whether it fits before committing to it; do not assume.

### 4.2 On-disk format — copy `run-record-store.ts:99`

```
FORMAT = "pi-workflow-run-v2"     →  "ultraworkers-workflow-run-v1"
<runPath>.events.jsonl             (:221)
```
Each line is append-only: `HEAD` (full snapshot) or `DELTA` (the difference). `MAX_CACHE_ENTRIES = 8`,
`MAX_CACHE_BYTES = 16 * 1024 * 1024` (`:100-101`).

### 4.3 Paths — copy `workflow-paths.ts:43-63`

```ts
// ref: WORKFLOW_HOME_RELATIVE_DIR = ".pi/workflows"
WORKFLOW_HOME_RELATIVE_DIR = ".ultraworkers/workflows"

workflowHomeDir()      → ~/.ultraworkers/workflows
workflowUserSavedDir() → ~/.ultraworkers/workflows/saved
workflowProjectKey(cwd)→ `${slug}-${sha256(resolve(cwd)).slice(0,12)}`
workflowProjectPaths() → ~/.ultraworkers/workflows/projects/<key>/{runs,saved}
```
`sanitizePathSegment` (`:64`): lowercase, `[^a-z0-9._-]+` → `-`, cut to 48 characters.

### 4.4 Lease — copy `run-persistence.ts:250-261`

```ts
interface LockFile { runId: string; runPath: string; pid: number; startedAt: string; token: string }
```
`acquireRunLease(runId)` → `RunLease | null`, `token` = `crypto.randomUUID`.
`recoverStaleRuns()` (`workflow-manager.ts:609`) scans for leases whose `pid` is dead.

### 4.5 Identity — copy `:892-914`, keeping the reasoning verbatim

```ts
const callIndex = state.callSeq++;
const deltaKey  = `${runId}:${callIndex}`;
```
`callSeq` **must stay lexical** (`:919`: *"callIndex/agentCount must stay lexical"*).

⚠️ **`deltaKey` must include `runId`.** The comment at `:902-913`: a nested `workflow()` restarts
`callSeq` at 0, so a child's `callIndex` 0 collides with the parent's. `deltaKey` is at once the
`SharedStore` delta key **and** the event id for `onAgentStart`/`onAgentEnd`/`onAgentHistory`. A
collision is a real defect, not a theoretical one.

Resume replays from `callIndex 0` (`:624`); `callIndex < firstMiss` is a cache hit, everything from
there runs live (`:506`).

---

## Phase 5 — Manager + control tool

### 5.1 `WorkflowManager` — copy `workflow-manager.ts:426-2412`, trimmed

`extends EventEmitter`. Eleven events the UI subscribes to (`:1996-2017`).

| Method | Line |
|---|---|
| `startInBackground` | `:682` |
| `runSync` | `:798` |
| `pause` | `:1726` |
| `attachCheckpointResponse` | `:1747` |
| `resume` / `stop` | ~`:1850` / `:1900` |
| `listLiveRuns` | `:554` |
| `recoverStaleRuns` | `:609` |
| `getSnapshot` / `getRun` | ~`:1350` / `:1400` |

**Drop**: `adoptLiveRunsToSession` (`:570`), model-registry plumbing.

⚠️ **Persistence must run BEFORE state becomes observable.** `startInBackground` (`:748-771`)
persists the initial state and only then executes; on failure it releases the lease and deletes the
run (`:772-776`).

`pause()` returns `false` when the run is not `running` (`:1727`) — it does not throw.

### 5.2 State machine — copy `workflow-control-tool.ts:216-229`

```
running             → [status, pause, stop]
paused              → [status, resume, stop]
failed | pending    → [status, resume]
completed | aborted → [status]
```

### 5.3 `workflow_control` tool — copy `workflow-control-tool.ts`

The registered name is exactly **`workflow_control`** (snake_case, `:87`).

⚠️ **The schema must be an object, never a union.** The comment at `workflow-tool.ts:8-15`: a
discriminated union serialises to a top-level `anyOf` with no `type`, and strict providers
(DeepSeek) reject it with *"schema must be type object, got type: null"*.

```ts
const allowedKeys = input.action === "list" ? new Set(["action"])
  : input.action === "resume" ? new Set(["action", "runId", "checkpointId"])
  : new Set(["action", "runId"]);
const extraKey = Object.keys(input).find(k => !allowedKeys.has(k));
if (extraKey) throw new Error(`workflow_control action "${input.action}" does not accept ${extraKey}`);
```
`checkpointId` with `status` ⇒ throws.

⚠️ **Errors return structured, never thrown at the model** (`:209-214`) — the shape of bug #87501:
```ts
result(`action=${action} result=error runId=${runId} error=${message} allowed=${allowed.join(",") || "none"}`,
       { action, result: "error", runId, error: message, allowedActions: allowed })
```

### 5.4 No `rm` at tool level

`/workflows rm` exists only as a slash command (`:286-289`). Deletion is destructive — leave it to
the human.

---

## Phase 6 — UI

### 6.1 Navigator — copy `workflow-ui.ts:108`

```
runs ──enter──▶ phases ──enter──▶ agents ──enter──▶ detail
     ◀──esc───        ◀──esc────        ◀──esc───
```
`ViewKind = "runs"|"phases"|"agents"|"detail"|"savedDetail"`. `StackFrame` (`:496-505`), `back()`
(`:801-826`).

Mount via `ctx.ui.custom()` (`types.ts:404`) — extension-side, **no core overlay needed**. That is
why we do not touch core: `custom()` already exists, keyboard-focused, returning a typed result.

### 6.2 Keys — copy `:1891-1950`

| Key | Action | Line |
|---|---|---|
| `↑`/`k` · `↓`/`j` | move ∓1 | `:1893-1900` |
| `pgup`, `ctrl+u`, `ctrl+b` | page −1 | `:1901-1904` |
| `pgdn`, `ctrl+d`, `ctrl+f` | page +1 | `:1905-1908` |
| `home`/`g` · `end`/`G` | jump | `:1911-1917` |
| `t` | toggleTail (detail only) | `:1918-1919` |
| `enter` | drill / togglePager | `:1920-1924` |
| `→` | drill / openPager | `:1925-1928` |
| `esc` / `←` | back | `:1929-1932` |
| `q` | close | `:1933-1934` |
| `p` | pause (double-tap) | `:1935-1936` |
| `x` | stop (double-tap) | `:1937-1939` |
| `/` | filter (runs only) | `:1940-1941` |
| `r` | restart | `:1942-1943` |
| `s` | save | `:1944-1946` |

⚠️ **There is NO `f` key.** Filtering is `/`. `ctrl+f` is page-down. Grepping `"f"` in
`workflow-ui.ts` returns nothing.

**Text modes swallow every key first** (`:2102-2148`) — the comment explains why: *"This prevents
pasted text, Unicode, or control sequences from leaking through to destructive browse bindings."*
Keep it; do not optimise it away.

**Double-tap** (`:2150-2162`): `confirm()` (`:937-958`) re-validates action + cursor + filter +
context against the snapshot taken when the prompt opened. Manager events **do not** cancel a
pending confirmation (`:652-656`).

### 6.3 Layout — copy `:1163-1290`

```
┌ Phases ──────────────┬ <phase> · N agents ──────────┐
│ › 1 research      2/3│ ● reviewer-a      sonnet  35k │
│   2 verify        0/4│ ● reviewer-b      sonnet  12k │
└──────────────────────┴───────────────────────────────┘
```
`computeLeftWidth` (`:1032-1050`) clamps to `[14, min(40, 45% width)]`. `RW = width - LW + 1`
(`:1229`). Narrower than `LW_MIN + RW_MIN - 1` → `renderSinglePane` (`:1316-1365`).

Our render loop: **mutate a field → `requestRender()`** (tui.ts:769). `render(width)` may return
the **same array reference** to skip repainting (tui.ts:237-242) — `AgentHubOverlayComponent` does
exactly this (`agent-hub.ts:455`, invalidated at `:473-476`).

### 6.4 Panel — copy `task-panel.ts:1761-1780`

```ts
ctx.ui.setWidget("workflow-tasks", renderPanel(...), { placement: "belowEditor" });
```
Compact (`:1501-1529`): `◆ name  3/7 agents · phase`. Detailed (`:1652-1711`): plus tokens · cost ·
`~820 tok/s` (a 10s rolling window, `RATE_WINDOW_MS` `:1534`).

⚠️ **The panel takes no input** (`task-panel.ts:1761-1762`): *"Purely informational … the panel
takes no input."* No focus, no expansion, no `handleInput`. **Do not** add keys to the panel.

⚠️ **`setFooter`/`setHeader` throw outside the interactive TUI.** `hasUI` is **not** a valid guard
— it is `true` in RPC and in ACP-with-`elicitation.form`, and both throw (`types.ts:310-330`).
The correct guard is `canMount("header"|"footer"|"custom")` (`:324`).

### 6.5 Token formatting — copy `display.ts:142-160`

`fmtTokenSegment` returns `""` when unknown, so a surface **never** prints a false `0 tok`. Prefix
`~` when the figure is an estimate. `fmtCost` floors at `"<$0.0001"`.

---

## Phase 7 — User scripts + approval gate

### 7.1 Reading scripts from disk — copy `workflow-saved.ts` + `builtin-workflows.ts:145-155`

Lookup order: **saved first, built-in second** (`builtin-commands.ts:373-376`
`SHADOW_WHOLE_STRING_PRIMARY`) — a user script shadows a built-in of the same name.

⚠️ **Security risk — must be stated explicitly.** Reading arbitrary scripts is executing arbitrary
code. The vm realm is **not** a security sandbox (see 1.4). Scripts live only in user- or
project-owned directories — **never downloaded from a remote registry, never run from someone
else's script**.

### 7.2 Approval gate — our design, NOT a copy

Measured: the reference repo has **no** approval gate. `grep -rn "ui.confirm|ui.select" src/`
returns only `workflows-models-command.ts` (changing model tiers). There is no `permissionMode`, no
`allowAlways`, and no consent field in `WorkflowSettings` (`:13-74`). `startInBackground`
(`:271-285`) runs immediately.

⚠️ **I previously described this gate as coming from the reference repo** — it came from the Claude
Code docs. We can build it because `ui.confirm` exists (`types.ts:337`) and we have permission modes.

Design:
- Ask **once per fingerprint** = `sha256(script + toolset + cwd)`.
- Store in `~/.ultraworkers/workflows/consent.json`, scoped `user|project`.
- `setFooter` shows current status: *"This workflow is approved for this project — `x` to revoke"*.
- Without persistence we would ask every time, which means **more** prompting, not less.

### 7.3 `/ultracode` — copy `effort-command.ts:71-87`

It is a **slash command**, not a free-text keyword. Measured: there is no detection of the literal
string `ultracode` anywhere in the reference repo's `src/`.

Auto-arming is a separate system (`workflow-editor.ts:303-384`), gated by `hasTrigger` (`:37-39`)
with lookarounds excluding `/`, `\`, `$`, and Unicode identifier characters — so `myworkflow` and
`workflow_name` do **not** trigger. `isSubstantive` (`effort-command.ts:45-48`): `length >= 16 &&
!startsWith("/")`.

⚠️ `suppressedKeywordText` (`workflow-editor.ts:50`) is an **escape hatch with no producer** — every
write in `src/` assigns `undefined`, and only a test ever sets a value. There is no dismissal UI in
shipped code. If we keep it, we must add a real producer.

---

## Five quality helpers — copy `:1468-1630`

| Helper | Signature | Line |
|---|---|---|
| `verify` | `(item, opts?: { reviewers?; threshold?; lens? })` | `:1468` |
| `judgePanel` | `(attempts, opts?: { judges?; rubric? })` | `:1507` |
| `loopUntilDry` | `({ round, key?, consecutiveEmpty?, maxRounds? })` | `:1545` |
| `completenessCheck` | `(taskArgs, results)` | `:1588` |
| `retry` | `(thunk, opts?: { attempts?; until? })` | `:1605` |
| `gate` | `(thunk, validator, opts?: { attempts? })` | `:1619` |

⚠️ Each helper calls `ensureAgentCapacity()` **before** running — the slot count is `reviewers`,
`attempts.length × judges`, or `1`. `maxAgents` must cover the whole tree, not a single call.
Keep `retry` returning the **last result** when attempts run out (`:1615`) — the caller inspects it.

---

## Deliberately NOT doing (measured — do not "add later")

| Not doing | Evidence |
|---|---|
| An `f` key | filtering is `/`; grep `"f"` in `workflow-ui.ts` returns nothing |
| Elapsed time in the navigator | grep `duration\|elapsed\|startedAt\|Date.now` returns nothing; only in `/workflows status` (`:114`) |
| Panel taking input | `task-panel.ts:1761-1762` |
| A "replayed agent" badge | `WorkflowAgentSnapshot` (`display.ts:10-35`) has no `replayed` field |
| `unverified` vs `refuted` | exists nowhere in the reference repo |
| `rm` at tool level | slash command only |
| Conditional persistence | `WorkflowSettings` has no consent field |
| Descriptors that generate docs | we have our own skill system |

**An opportunity to do better** (recorded so the two do not get conflated): a replay badge —
`workflow-manager.ts:212` already tracks `replayedAgentCalls` but never puts it on the snapshot.

---

## What you need to know: `deep-research` does NOT verify

Measured at `deep-research.ts:61-67`: the Verify phase is **a single `agent()` call**, one pass, no
voting. `minSupport` (default 2, `:34`) is **interpolated into the prompt text**, not enforced in
code — and the clause *"OR by one clearly authoritative source"* means a claim can pass on **one**
source.

Adversarial voting **does** exist, at `adversarial-review.ts:45-62`: N reviewers per finding,
surviving when `ratio >= threshold` (default `0.5`, `:36`).

And `verdict.discarded` is **dropped on the floor** — the schema requests it (`:66`), the script
never reads it (`:77`).

**If you want real cross-checking: copy `verify()` + `judgePanel()`, not `deep-research`.**

---

## Trap: the opposing architecture in `pi-subagents`

| | `pi-dynamic-workflows` | `pi-subagents` |
|---|---|---|
| Execution | in-process in a vm realm | `workflow/worker-source.ts` (781 LOC) generates source then **spawns processes** |
| Orchestration | `workflow-manager.ts` | `agent-manager.ts` (1581) |

⚠️ **Copying the `pi-subagents` branch copies the exact defect a rule of ours was written to
prevent.** AGENTS.md: *"workers re-enter the CLI entrypoint; never spawn separate worker entry
modules"* — written after issue #1150 (`with { type: "file" }` made workers crash silently in
compiled binaries).

All sixteen of our worker selectors (`utils/src/worker-host.ts:18`) derive from
`WORKER_HOST_SELECTOR_PREFIX`. Workflows run in-process ⇒ **no new worker needed**, no touching
`cli.ts`, no touching the smoke test.

---

## Definition of done

A phase is done only when **its verification column is green** *and* the following hold.

| Phase | Done when | Blocks the next |
|---|---|---|
| 1 | parse test + determinism test green; `Date.parse` and `new Date("2026-01-01")` **still work** | 2, 3 |
| 2 | the script declares 19 globals and the engine injects exactly 19; injecting 18 makes `diagnoseAlignment` name the missing one | 3 |
| 3 | a failing `agent()` returns `null` and **does not throw**; a subagent that sees `workflow` does not recurse | 4 |
| 4 | kill the process mid-run, reopen, and get the same result; two processes ⇒ only one holds the lease | 5 |
| 5 | `checkpointId` + `status` throws; errors return structured and are **not** thrown at the model | 6 |
| 6 | all three tiers traverse with esc; pasted text never triggers a destructive binding | 7 |
| 7 | after `consent.json` is written it does not ask again; a different fingerprint does ask | — |
| 8 | **implementation touches `packages/coding-agent/src/workflows/` and nothing outside it** | — |

⚠️ Row 8 was `git diff <base>...HEAD -- packages/` is empty. That criterion is **withdrawn**
(`d5579c400`): it rested on the out-of-repo placement, which the owner overruled on 2026-10-04.
The replacement is narrower and still fenceable — the implementation may touch the destination
directory, and touching anything outside it is the violation. A row that names a withdrawn rule is
worse than no row: it reports green for a condition nobody intends to hold.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| UI before durability ⇒ `r` is pressable but does nothing | High | The plan forces phase 4 before 5–6 |
| Copying acorn ⇒ adding a dependency outside the catalog | Medium | 1.1 uses `@babel/parser` |
| Reading arbitrary scripts ⇒ running someone else's code | High | 7.1 restricts to user/project dirs; docs state the vm is not a sandbox |
| `deltaKey` collisions in nested workflows | Medium | 4.5 keeps `${runId}:${callIndex}` |
| `AsyncJobManager` does not survive a restart | Already handled | 4.1 measures first, then we write our own persistence |
| File contention with other agents on the shared tree | Medium | `check_file_reservation_conflicts` before writing; `stage-lines.ts` on shared files |
| `packages/durable` not matching our assumptions | Low | Measure in 4.1 before committing; fall back to plain JSONL |

---

## Verification

⚠️ **The `test/workflow/*.test.ts` paths below are relative to the workflow project root, not the
repo root.** From the repo root they must be prefixed — today
`.claude/plugins/workflow/test/workflow/`, and after the move
`packages/coding-agent/test/workflows/`. Run them from the project directory and the bare paths
work; run them from the repo root and every one silently matches no file, which `bun` reports as a
filter miss rather than an error. That is a green-looking shell and a red-looking suite.

```bash
# 1. Seam test — the only question AGENTS.md asks.
#    Red until the entrypoint exists (commit 93d292395c) — a green row here that reaches
#    nothing is the epic-jwsy.11 shape, so the red is the honest state until then.
bun test ./test/extensions/workflow-seam.test.ts

# 2. Determinism + sandbox
bun test test/workflow/determinism.test.ts   # Math.random, Date.now, Date(), new Date() all throw
                                           # Date.parse and new Date("2026-01-01") STILL work
bun test test/workflow/parse.test.ts        # meta in the wrong position, __proto__ in a literal,
                                           # let instead of const, 2 declarators, missing initializer

# 3. agent() null, never throw → the failure path runs all the way through
bun test test/workflow/agent-null.test.ts
bun test test/workflow/contract.test.ts    # injecting one fewer global ⇒ diagnoseAlignment names it
bun test test/workflow/recursion.test.ts    # a subagent does not spawn workflows

# 4. Real resume, mid-run
bun test test/workflow/resume.test.ts       # kill mid-run, reopen, same result
bun test test/workflow/lease.test.ts        # two processes, one lease
bun test test/workflow/store-format.test.ts # HEAD/DELTA round-trip

# 5. Control tool
bun test test/workflow/control-schema.test.ts  # checkpointId + status ⇒ throws
                                              # schema is an object, NOT anyOf
                                              # errors structured, not thrown at the model

# 6. UI
bun test test/workflow/keybindings.test.ts   # text modes swallow every key; double-tap; 3-tier esc
bun test test/workflow/layout.test.ts       # two panes; narrower than the threshold ⇒ one pane
bun test test/workflow/format.test.ts       # unknown ⇒ "" rather than "0 tok"

# 7. No new worker ⇒ the smoke probe is unchanged
bun run build && bun run --smoke-test

# 8. Approval gate
bun test test/workflow/consent.test.ts      # asks once, asks again for a different script,
                                           # does NOT ask again for the same fingerprint
```

**The evidence must be:** the workflow implementation at
`packages/coding-agent/src/workflows/` registering a tool + command + setting + hook + panel, and
running a real workflow, with its diff **contained to that directory** — nothing outside it.

*(This was "an extension written outside the repo … with `git diff -- packages/` empty". The
out-of-repo form is withdrawn with the placement it depended on; the tree it named did not load.
See [Architectural decision](#architectural-decision).)*

---

## Ordering

| # | Step | Why here |
|---|---|---|
| 1 | `parseWorkflowScript` + `@babel/parser` | without it everything downstream is a daydream |
| 2 | vm + `DETERMINISM_PRELUDE` | determinism is a contract; it must exist before any agent runs |
| 3 | capability contract + `assembleRuntimeBindings` | **before** the agent bridge: it is where `agent` is injected |
| 4 | agent bridge → `runStructuredSubagent` | the two map 1:1 |
| 5 | persistence + lease | **before** manager/UI: the navigator's `p`/`x`/`r` is UI over things that must really exist |
| 6 | manager + `workflow_control` | after 5 because resume needs the lease |
| 7 | navigator + panel | after 6 because the UI reads state |
| 8 | approval gate + scripts from disk + `/ultracode` | last; needs a real run to measure a fingerprint |

**3 before 4** because `WorkflowRuntimeImplementations` (`agent: unknown`) is exactly where the
bridge plugs in — the other order forces a refactor.

**5 before 6–7** because `AsyncJobManager` does not survive a restart (measured in 4.1) and resume
is the feature's core. UI first produces a `r` that is pressable but does nothing.