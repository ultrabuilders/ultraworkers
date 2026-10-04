# NOTICE

This plugin contains code copied from:

**pi-dynamic-workflows** — <https://github.com/quintinshaw/pi-dynamic-workflows>
Licensed under the MIT License, Copyright (c) 2026 QuintinShaw.

The full licence text is retained at `.tmp/ref/pi-dynamic-workflows/LICENSE` and
reproduced below.

## What was copied, and from where

| File here                  | Copied from                                                                                                                                                                                            | Version            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `src/errors.ts`            | `src/errors.ts` (`WorkflowErrorCode`, `WorkflowError`, `CapabilityErrorDiagnostic`, `WorkflowCapabilityContractError`)                                                                                 | 3.13.1 @ `3bea96c` |
| `src/engine/parse.ts`      | `src/workflow.ts:514`, `:2011-2133`                                                                                                                                                                    | 3.13.1 @ `3bea96c` |
| `src/engine/vm.ts`         | `src/workflow.ts:1799-1817`, `:529-546`                                                                                                                                                                | 3.13.1 @ `3bea96c` |
| `src/engine/contract.ts`   | `src/workflow-capability-contract.ts:92-101`, `:107-110`, `:113-132`, `:146-149`, `:698-760`, `:839-845`; `src/enums.ts:34-38`; the 18 `runtimeGlobal(...)` declarations at `:317-490`                 | 3.13.1 @ `3bea96c` |
| `src/agent-bridge.ts`      | `src/workflow.ts:770-786` (synchronous `timeoutMs` guard), `:1233`, `:1275-1282` (recoverable→`null` / non-recoverable→throw), `:2346-2348` (`isEmptyTextAgentResult`); `src/agent.ts:771`, `:788-790` | 3.13.1 @ `3bea96c` |
| `src/persistence/lease.ts` | `src/run-persistence.ts:374-398` (`pidIsAlive`, `readLockAt`), `:734-772` (acquire/release)                                                                                                            | 3.13.1 @ `3bea96c` |
| `src/status.ts`            | `src/workflow-control-tool.ts:216-229` (`allowedActions`); `src/run-persistence.ts:29` (`RunStatus`)                                                                                                    | 3.13.1 @ `3bea96c` |
| `src/usage.ts`             | `src/display.ts:91-100` (`tokenFigures`), `:102-118` (`aggregateAgentUsage`)                                                                                                                          | 3.13.1 @ `3bea96c` |
| `src/types.ts`             | `src/display.ts:8` (`WorkflowAgentStatus`), `:10-32` (`WorkflowAgentSnapshot`), `:37-60` (`WorkflowSnapshot`), narrowed to the fields the counting paths read                                                                                 | 3.13.1 @ `3bea96c` |
| `src/persistence/record-store.ts` | `src/run-record-store.ts:8-19` (`RunSummary`), `:22-40` (`runSummary`)                                                                                                                          | 3.13.1 @ `3bea96c` |
| `src/tools/workflow-control.ts` | `src/workflow-control-tool.ts` in full (285 lines): `:16-42` (schema), `:78-150` (tool), `:152-182` (`normalizeInput`), `:184-229` (result/error/`allowedActions`), `:231-275` (`summarizeRun`, `countAgents`), `:277-285` (`formatRun`)       | 3.13.1 @ `3bea96c` |
| `src/ui/format.ts`        | `src/display.ts:130` (`fmtTokenCount`), `:150-158` (`fmtTokenSegment`), `:161-164` (`fmtFull`), `:163` (`fmtCost`), `:167-179` (`createWorkflowSnapshot`), `:181-188` (`recomputeWorkflowSnapshot`), `:191-224` (`emptyFleetSummary`), `:222-236` (`backgroundStartNotice`), `:326-329` (per-agent token cell) | 3.13.1 @ `3bea96c` |
| `src/ui/panel.ts`         | `src/display.ts:332-424` (`renderWorkflowLines`), `:426-444` (`renderWorkflowText`, `statusLine`, `statusIcon`), `:448-457` (`shorten`, `preview`), `:240-282` (`createWidgetWorkflowDisplay`) | 3.13.1 @ `3bea96c` |
| `src/manager.ts`          | `src/workflow-manager.ts` (~600 of 2412): `:682-789` (`startInBackground`, incl. the persist-before-observe order and its release-and-delete failure path), `:798` (`runSync`), `:1726-1736` (`pause`), `:1747` (`attachCheckpointResponse`), `:554` (`listLiveRuns`), `:609` (`recoverStaleRuns`), `:1577` (`persistRun`), `:1600+` (`writeRunToDisk`) | 3.13.1 @ `3bea96c` |

`src/engine/vm.ts`'s `DETERMINISM_PRELUDE` is byte-for-byte identical to the
reference's, verified by comparing the 16 array elements.

## The one required deviation

`src/engine/parse.ts` parses with `@babel/parser` where the reference uses `acorn`.
The eight-step validation logic and its order are unchanged; only the AST layer
differs. The differences were measured against babel 7.29.9 rather than assumed,
and each is recorded at the top of that file. The load-bearing one is
`allowReturnOutsideFunction`, which babel exposes as a top-level option (as acorn
does) and not as a plugin.

## `src/tools/workflow-control.ts` — three forced adaptations

1. **ArkType, not TypeBox.** The reference builds the schema with `Type.Object`; this host
   takes ArkType (`api.arktype` is omptype's `type`). The emitted wire document was MEASURED
   before the port, not assumed: top-level `"type": "object"`, no top-level `anyOf`, `action`
   as a five-value `enum`, only `action` in `required`, and `additionalProperties: false` — the
   reference's schema with its strictness intact. Trap 1 is asserted on the emitted document in
   `test/workflow/control-schema.test.ts`, because the builder call is not what reaches the
   provider.
2. **No `prepareArguments`.** This host's `ToolDefinition`
   (`packages/coding-agent/src/extensibility/extensions/types.ts:852`) has no such hook, so a
   copied `prepareArguments: normalizeInput` would be an unknown property and the runtime checks
   would never run. `normalizeInput` is called as the first statement of `execute` instead.
   This is load-bearing rather than cosmetic: ArkType validates `parameters` first, and the one
   check it cannot express — `checkpointId` is accepted only by `resume` — is the whole reason
   `normalizeInput` exists.
3. **Registration is not here.** The reference calls `defineTool` and registers in one breath.
   This module RETURNS the definition; handing it to `api.registerTool` belongs to the extension
   entrypoint.

## `src/ui/panel.ts` — the mount guard is per-surface, not one boolean

`canMount(surface)` exists because `hasUI` reports whether DIALOGS round-trip, and that answer is
`true` in RPC and in ACP-with-`elicitation.form` — where `custom()`, `setHeader` and `setFooter`
nonetheless THROW on every call (`types.ts:328-345`). But `canMount` is scoped to exactly those
three surfaces. `setWidget` is excluded because its answer depends on the content (RPC renders a
string array and silently ignores a component factory) and `setStatus` because it never throws.

So the rule is **not** "prefer `canMount`". It is: `canMount` for the surfaces that need a frame,
`hasUI` for the ones that merely would not be seen. `canRegisterWidget` and `canMountCustom` are
separate functions on purpose — collapsing them is the bug, and a test pins that they answer
differently on the same context.

`PanelUiContext` is declared structurally rather than imported from the host, for the same reason
`WorkflowManagerLike` is: the module is testable without a host, and an out-of-core extension
should not import core for four method signatures.

## `src/manager.ts` — the lifecycle, with execution behind a seam

`executeRun`'s body (the VM, the agent bridge, the eleven progress events) is **not** copied; it is
an injected `deps.execute`. That is a real cut, not a simplification: `startInBackground`'s
ORDERING is the property this bead exists to get right, and an ordering cannot be tested against a
1,500-line executor any more cheaply than against an injected one. The default REJECTS rather than
returning a completed result, so an unwired manager fails loudly instead of reporting runs that
never ran.

`schedulePersist` (`:1524`) is copied in shape but deferred: its only caller is `executeRun`'s
progress handler, so shipping it now would be an unreachable private method. `persistRun` — the
write path the lifecycle actually reaches — is here.

Storage is the injected `WorkflowPersistence` interface rather than `persistence/lease.ts` and the
journal directly, for the same reason: the ordering is the property, and the ordering is only
observable when storage is substitutable.

---

MIT License

Copyright (c) 2026 QuintinShaw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
