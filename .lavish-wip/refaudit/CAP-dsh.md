# Năng lực đo được — `dsh` — 109 mục

deepseek-harness — the DISCIPLINE source: 'Everything is a Plugin'.

Nguồn: 6 lens (structure, agent-core, plugin, surface, integration, ops); mọi con số đo bằng lệnh thật.
`idea only=true` = KHÔNG được chép code, chỉ mang ý tưởng.
`port effort` là ước lượng của người kiểm kê, KHÔNG phải số đo.

## dsh.1 Service Definition / Consumer / Provider ba cap

- **where:** packages/shell/ (shell, bash-local, bash-sandbox, tool-bash); quy tac tai packages/AGENTS.md
- **what:** Moi capability tach thanh 3 vai: `shell` (seam, chi khai bao abstract Service), `bash-local`/`bash-sandbox` (provider hien thuc), `tool-bash` (consumer lo model).
- **how:** Seam khai bao abstract class + JSDoc contract; provider `extends` seam va default-export service class; consumer inject seam qua `inject`. Khong provider nao biet tool schema.
- **solves:** Cho phep thay implementation ma khong doi contract — va giu model-facing schema o tang Consumer de 1 Consumer khong dieu kien hoa service contract.
- **port effort:** thap — chi can quy uoc, khong can code | **idea only:** True

## dsh.2 DI bang TypeScript module augmentation

- **where:** 148 file trong packages/ + apps/ (vd packages/shell/shell/src/index.ts); convention tai packages/AGENTS.md
- **what:** Service duoc khai bao vao Context bang `declare module '@deepseek-ai/cordis' { interface Context { shell: ShellExecutor } }`. Keyspace co 138 `ctx.*` service distinct, type-check o compile time.
- **how:** Interface augmentation hop le — moi provider/service tu them key vao mot interface global, khong can registry code.
- **solves:** Loai bo toan bo ma dang ky DI; contract la type, khong phai convention.
- **port effort:** trung binh — can mot Context class ho tro `declare module` | **idea only:** True

## dsh.3 Subagent backend registry (da co Codex + Claude Code)

- **where:** packages/subagent/ (10 package), README bang `ctx key`
- **what:** Mot seam `ctx.subagents` co 5 backend con thay the nhau: in-process moi, in-process fork theo history, ACP, Codex qua app-server protocol chinh thuc, Claude Code qua Agent SDK chinh thuc, va dsh-sdk. `tool-subagent` expose len model.
- **how:** Moi backend `registers on ctx.subagents`; provider registry cho phep nhieu backend cung ton tai, chon theo config.
- **solves:** Delegate mot subtask cho bat ky runtime nao (ke ca CLI cua hang khac) ma khong doi tool schema.
- **port effort:** cao — backend thi de port, seam + registry thi de lay y tuong | **idea only:** True

## dsh.4 Hook bridge — chay hooks.json cua Claude Code va Codex

- **where:** packages/hooks/{hook-protocol, hooks-claude-code, hooks-codex}
- **what:** Doc `hooks.json` san co cua Claude Code va Codex chay trong agent run (session start, prompt, tool, stop). Hook co the chan prompt/tool voi thong diep model-readable, them context, hoac yeu cau continue. Chi ho tro command-hook subset.
- **how:** Mot shared engine (hook-protocol) + hai bridge; ca hai map vao mot typed-Decision interception surface.
- **solves:** Giup nguoi dung chuyen sang harness ma khong mat hook da viet.
- **port effort:** trung binh | **idea only:** True

## dsh.5 Profile + bundle: config la YAML patch xep layer

- **where:** packages/bundle/*/cordis.patch.yml; giai thich tai docs/architecture.md
- **what:** Composition khong phai code ma la YAML. base = 93 dong; web-app them 85; sdk-minimal 32. Mot patch target row theo `id` va thay the ca config cua row (khong merge), last write wins. Co the disable bang `disabled: !!js "!ctx.get('profileContext')"`.
- **how:** Bundle khai bao trong `package.json` qua `dsh.bundle` / `dsh.profile`; xem cay that bang `dsh --profile web --dump-config`.
- **solves:** Tach cau hinh khoi code; user override duoc ma khong fork code.
- **port effort:** cao — can he thong patch + launcher | **idea only:** True

## dsh.6 Activation service-availability driven, khong phai thu tu

- **where:** packages/bundle/base/cordis.patch.yml (comment dau file); docs/architecture.md muc "Cordis"
- **what:** Comment trong base patch: "Row order carries no load semantics (activation is service-availability driven)". Mot plugin tu active khi moi injection cua no san sang.
- **how:** Cordis fiber: effect co the bi veto; provider service chen vao store khi active.
- **solves:** Bo page ordering trong config; them/bot plugin khong phai suy lai thu tu.
- **port effort:** cao | **idea only:** True

## dsh.7 Generated, boot-verified doc corpus

- **where:** scripts/gen-tool-catalog.ts, gen-doc-graphs.ts; docs/*.md
- **what:** config-catalog.md 203KB, tool-catalog.md 2719 dong / 70 tool, dependency-catalog.json 164KB, composition.md (mermaid). Khong tai lieu nao la text tay.
- **how:** Generator BOOT that tool plugin tren context that roi doc `ctx.tools.schemas()` — comment ghi ro "a tool schema is not statically knowable". Co completeness guard glob `packages/*/tool-*` fail neu package moi bi bo qua.
- **solves:** Tai doc contract mat tinh tai, va bat loi doc cu.
- **port effort:** trung binh | **idea only:** True

## dsh.8 Quy tac ky eng gan voi postmortem

- **where:** packages/AGENTS.md; docs/postmortem/0001..0004; .agents/notes/
- **what:** packages/AGENTS.md ~20 quy tac vi du, moi quy tac gan 1 postmortem/agent-note. Vi du: "Optional services use ctx.get(name) — property proxy la topology-sensitive"; "Design Service Definitions for all current Consumers"; "Enforce a decision in the operation that makes it"; "Publish state only at its commit point".
- **how:** Moi quy tac tro ve mot `.agents/notes/` entry co filename dat theo ngay + chu de.
- **solves:** Bien loi kinh nghiem postmortem thanh rule ma reviewer enforce duoc.
- **port effort:** trung binh | **idea only:** True

## dsh.9 Design-note lifecycle lam bang file, khong issue tracker

- **where:** .agents/notes/{proposed,implemented,rejected,archived}/
- **what:** 2412 note / 129,002 dong trong 4 trang thai: proposed 80, implemented 1020, rejected 28, archived 1281.
- **how:** Moi note la 1 file markdown, ten co ngay + chu de; phan loai theo feature/architecture/bug-fix/simplification/process/testing.
- **solves:** Giu rationale khai trien sau khi code da merge.
- **port effort:** thap | **idea only:** True

## dsh.10 Build face tach host/client o cap tsconfig

- **where:** tsconfig.host.json, tsconfig.client.json, tsconfig.base.client.json; packages/client/*/tsconfig.json
- **what:** Mot package co the tach 2 compiler face: tsconfig.host.json (270 project refs) va tsconfig.client.json (83 refs). `tsdown --env.DSH_BUILD_FACE host|client` sinh 2 bundle.
- **how:** Client package extends `tsconfig.base.client.json` (React); host extends `tsconfig.base.json`. Package chi tach khi that su can.
- **solves:** Chay cung mot codebase duoi Node host va trinh duyet, khong du dung mot ban build chung.
- **port effort:** trung binh | **idea only:** True

## dsh.11 Vendor framework tai chu de thay vi phu thuoc npm

- **where:** vendor/{cordis,cosmokit,schemastery,loader,include,group,timer,hmr,logger-console}/
- **what:** 9 package Cordis ecosystem duoc copy vao repo, doi thanh `@deepseek-ai/*`, giu lai LICENSE upstream, va co manifest + commit hash. README ghi ro: "so the harness fully owns its framework layer (auditable, patchable, pinned)".
- **how:** Manifest table anh dir <-> npm name <-> upstream name + version + commit; co `pnpm run rescope-vendor --apply` de apply lai sau moi sync.
- **solves:** Framework tang 1 co audit va patch duoc, khong bi pin bang semver npm.
- **port effort:** cao | **idea only:** True

## dsh.12 Typed append-only session event log as the single source of truth

- **where:** packages/core/session/src/types.ts:281 (SessionEventMap), :493 (SessionEvent envelope), packages/core/session/src/index.ts:446 (class Session)
- **what:** A `SessionEventMap` interface maps ~13 core event names to exact payload shapes, and every runtime concern is a fold over the log. `Session.append` is the only writer; the log is the only truth.
- **how:** Each event carries `{ type, seq, time, data, surfaceOp?, sourceEventSeqs? }`. `adoptSessionEvent` (index.ts:171) runtime-validates data as JSON and asserts message shape before it is admitted, so a malformed event is rejected at the source rather than at persistence. `foldRequestHeader` (request-header.ts:53) reconstructs any request offline from log + code.
- **solves:** Makes crash recovery, replay, compaction, forking, token accounting, and tool history all fall out of one mechanism instead of five parallel state stores. It also makes the loop's failure modes *inspectable*: an orphaned `compaction/start` or a `tool/call` with no `tool/result` is a detectable corruption, not a silent state bug.
- **port effort:** High to port the mechanism, trivial to port the idea. omp would need its own event map (~1 day) and one projection registry; the payoff is that every future feature becomes a fold rather than new mutable state. | **idea only:** True

## dsh.13 Plugins extend the event vocabulary by TypeScript declaration merging

- **where:** Example: packages/core/tools/src/types.ts:44 declares `tool/ptc-dispatch-start` and `tool/ptc-dispatch`; same pattern in compaction/compaction/src/types.ts, subagent/subagent/src/catalog.ts, sandbox/sandbox-policy/src/session-mode.ts, workflow/tool-workflow/src/types.ts, and ~32 more
- **what:** ~36 production packages add their own event types to `SessionEventMap` via `declare module '@deepseek-ai/dsh-session/types' { interface SessionEventMap { … } }`. This is the type-level enforcement of "everything is a plugin".
- **how:** A plugin ships a `types.ts` with a `declare module` block; the core's `SessionEventType = keyof SessionEventMap` union widens automatically. A plugin cannot append an event the core's validator does not know about, because `append` is typed against the same merged map.
- **solves:** Makes plugin extension *compile-checked*. A third-party plugin that logs a custom event gets the same runtime validation and the same append path as a core event, with zero core edits.
- **port effort:** Very low if omp's session type is already an interface. This is the cheapest high-value item in the whole repo. | **idea only:** True

## dsh.14 Surface layer: an ordered, model-visible projection over the log

- **where:** packages/core/session/src/surface.ts (30 KB); eligible-type set at surface.ts:47-52
- **what:** A separate fold produces the exact ordered list of messages the model sees, distinct from the log. Only 5 event types are surface-eligible (`system/message`, `developer/message`, `user/message`, `assistant/message`, `tool/result`); everything else is log-only.
- **how:** The surface carries two monotonic counters — `replaceGeneration` (positional replacements only) and `contentGeneration` (replacements + plugin message projections). Compaction and the overflow-recovery loop both use `replaceGeneration` as proof that a retry will actually see different bytes. Node 0 is protected: a replacement covering it is rejected unless it is a `system/message` over exactly that node (surface.ts:511).
- **solves:** Lets you rewrite history (compaction, tool-result pruning) without touching the log, while the log stays a complete record. The `replaceGeneration` counter turns "did compaction help?" from a guess into an assertable fact.
- **port effort:** Medium. The two-counter idea alone is worth taking regardless of the full fold. | **idea only:** True

## dsh.15 Explicit phase state machine for the loop driver

- **where:** packages/core/agent-loop/src/agent.ts:42-51 (type Phase), :98 (class ReactLoopAgent)
- **what:** The agent's lifecycle is a three-state machine (`idle` | `maintenance` | `running`), with the running state carrying the AbortController, turn, step, and a wake latch.
- **how:** Every phase transition goes through `setPhase`. Cancellation is a phase-owned AbortController, and on wake it is *replaced* with a fresh one (`phase.abort = new AbortController()` at agent.ts:369) so a latch set on the dead controller cannot fire again. `preStep` asserts the running phase and `step` asserts it again, so an internal ordering bug fails loudly instead of silently running.
- **solves:** Cancellation and wakeup in agent loops are where most harnesses leak: stale abort listeners, double-firing latches, and "turn without driver reservation" races. Encoding phase as a discriminated union makes all of these type errors.
- **port effort:** Low. ~50 lines. Directly portable as a shape. | **idea only:** True

## dsh.16 Sticky terminal turn reason

- **where:** packages/core/agent-loop/src/agent.ts:333-336, with the comment 'max-tokens stays sticky: once any step hits the ceiling, later steps that complete normally must not downgrade the turn outcome'
- **what:** Once any step in a turn hits `max-tokens`, the turn's outcome is pinned to `max-tokens`; a later step that completes normally cannot downgrade it.
- **how:** `if (turnEnds === null || turnEnds.kind !== 'max-tokens') turnEnds = stepEnd`. Note it is *not* sticky in general — a `completed` followed by a tool-calling step does reset to `null`, which is correct (a completed step that issued tool calls must not end the turn).
- **solves:** A truncated-but-valid response that then makes tool calls would otherwise be reported as a clean completion, and callers (compaction, goal driver, UI) would treat a truncated turn as successful.
- **port effort:** Very low — three lines and a comment. | **idea only:** True

## dsh.17 Two-phase assistant settlement: message vs attempt

- **where:** packages/core/session/src/types.ts (both entries in SessionEventMap); settlement logic at packages/core/agent-loop/src/agent.ts:425-505
- **what:** A model step settles as one of exactly two durable events. `assistant/message` when the adapter produced content; `assistant/attempt` when it did not. Both embed the complete timed stream.
- **how:** On a stream error, retry, or abort, the loop appends `assistant/attempt` (or `assistant/message` with `interrupted: true` if partial content was delivered) *before* rethrowing, so a failed attempt is still reconstructable. A settlement rejection is wrapped in an `AggregateError` with both causes (agent.ts:455-461) rather than replacing the original failure.
- **solves:** Retry loops normally destroy the evidence of what went wrong. Here a 429 + retry is replayable at full fidelity, and an abort mid-stream is distinguishable from a clean stop without re-deriving it from turn boundaries.
- **port effort:** Low. The two-event split is the idea; the exact settle/rethrow choreography is copyable. | **idea only:** True

## dsh.18 Delta-packed durable stream records

- **where:** packages/llm/llm/src/assistant-stream.ts:20-46 (AssistantStreamRecord), :100 (AssistantStreamAccumulator), :202 (expandAssistantStream)
- **what:** Stream chunks are stored as compact runs rather than a flat chunk list: a `time0` base plus relative `dt[]` and a `texts[]`/`args[]` array.
- **how:** Text, reasoning, and tool-call deltas pack into runs; non-delta chunk types stay raw. Record-level readers (`assistantStreamFirstTokenTime`, `joinAssistantStreamText`, `assistantStreamHasVisibleContent`) answer common consumer questions *without materializing* the chunks. `expandAssistantStream` is the validating path used only at a durable boundary.
- **solves:** A long session's raw chunk log is the dominant storage cost. Packing plus non-materializing readers lets telemetry and UI stats read a multi-megabyte stream record without expanding it.
- **port effort:** Low. Self-contained, no dependencies beyond the block assembler. Highly portable. | **idea only:** True

## dsh.19 Durable inbox: queued input is a projection, not memory

- **where:** packages/core/agent-loop/src/inbox.ts:26-64 (inboxProjectionDefinition), :71 (class ReactLoopInbox)
- **what:** Pending user messages are reconstructed by folding `agent/inbox/spliced` events. The queue survives a crash because it was never memory.
- **how:** Two targets — `next-turn` and `next-step` — each an array of UserMessage. The fold validates every splice (bounds, non-negative counts) and enforces a global no-duplicate-message-id invariant across both lists, throwing `invalid persisted inbox splice at session seq N` with the cause chained.
- **solves:** A user who types while the agent is mid-turn has their message silently lost on crash in most harnesses. Here it is a log event, so `claim()` after resume returns it. Also gives the loop a clean wake condition (`inbox.hasPending`).
- **port effort:** Medium — needs the log and a projection registry first, but the payload is tiny. | **idea only:** True

## dsh.20 Ordered tool scheduler with live concurrency reclassification

- **where:** packages/core/agent-loop/src/tool-calls.ts:57 (executeToolCalls), :122 (runGroup), :196 (fillPool barrier re-read); mode type at packages/core/tools/src/index.ts:358
- **what:** Tool calls run in a bounded rolling pool, but each call's mode (`parallel` | `exclusive`) is re-read from the registry immediately before it starts, so a plugin can turn a later call into a barrier mid-flight.
- **how:** `commitReady` advances a `committed` cursor only across contiguous model-order slots, so results commit in model order even when call 3 finishes before call 2. Calls that skip the pool on abort get a synthetic `tool/result` with code `TOOL_ABORTED_BEFORE_DISPATCH`, keeping replay valid. A terminal scheduler failure preserves recorded `tool/call` events *without* fabricating results — the asymmetry is deliberate and documented.
- **solves:** Parallel tool execution is where harnesses produce out-of-order results that confuse the model, and mid-flight policy changes (a plugin revoking a tool) that get ignored. Reclassifying at start time plus ordered commit gets both right.
- **port effort:** Medium-high. The idea (reclassify-before-start + ordered commit cursor) is portable; the full `TOOL_RUNTIME_SCHEDULER` prepare/dispatch/finalize protocol is not worth copying. | **idea only:** True

## dsh.21 Durability barrier before the model call

- **where:** packages/session/session-checkpoint-policy/src/index.ts:31-40 (afterCheckpoint), and the `session/flush` entry point at packages/core/session/src/index.ts:1194
- **what:** The downstream model stream is not even constructed until the complete logged request prefix is durable. A checkpoint rejection prevents adapter dispatch entirely.
- **how:** `(async function* () { await ctx.sessions.flush(session); yield* next() })()`. `flush` uses `Promise.allSettled` over all listeners, then rethrows the first rejection *after* every listener has settled — so one slow or failing persistence backend cannot starve the others.
- **solves:** Closes the window where the model has already produced tokens that reference a request prefix that was never written. A crash there loses the request but keeps the response, producing an unreplayable session.
- **port effort:** Medium. Depends on the event log, but the "await durability before dispatch, not after" ordering is a one-line port once omp has a session store. | **idea only:** True

## dsh.22 Request-header series management for provider prefix reuse

- **where:** packages/core/agent-loop/src/agent.ts:585-633 (buildRequest), packages/core/session/src/tool-history.ts (ToolHistoryProjection), packages/core/session/src/request-header.ts:44 (headerEquals)
- **what:** Request headers are logged as a new "series" only when the conversation genuinely forks from the cached prefix; a tool-set change mid-series is recorded as a `developer/message` with tool-addition/tool-removal blocks instead.
- **how:** `reason` is one of `initial | resume | change | series` plus an orthogonal `startsSeries?: true`. `ToolHistoryProjection` keeps a baseline header plus an ordered `updates[]` list, and resets the series only on 'series', `startsSeries`, or a *genuinely redefined* tool. `headerEquals` is what suppresses a redundant header log.
- **solves:** Naively re-logging a full header whenever the tool list changes invalidates the provider's prompt cache on every MCP reconnect, which is a silent and expensive regression. This keeps prefix reuse across the common case.
- **port effort:** Medium. Directly relevant to omp's MCP-driven tool churn. | **idea only:** True

## dsh.23 Compaction as a log-bracketed transaction

- **where:** packages/compaction/compaction-basic/src/region.ts:173 (compactSurfaceRegion), :117 (selectCompactableRange); documented in docs/subsystems/compaction.md
- **what:** Compaction acquires a durable lock (`compaction/start`), summarizes, commits a single surface replacement, and releases (`compaction/end`) — with the opening marker deliberately appended *last* in release order so a crash leaves a detectable orphan rather than a false success.
- **how:** Range selection (:117) retains a priced token tail, walks backward until `toolPairingBalancedBefore` holds so a tool-call/result pair is never split, and refuses to include surface node 0. Mid-flight the region is re-validated against the live surface (`assertSelectedSpanStable`, :447) because summarization yields. Exactly one `compaction/end` attempt is made on any failure, and a failed close deliberately leaves the unmatched start detectable.
- **solves:** The classic compaction bugs: splitting an assistant tool-call from its result (invalid on every provider), summarizing a range that shifted while the LLM was working, and reporting success for a transaction that never committed.
- **port effort:** Medium-high for the transaction, low for the range-selection rules. Both are worth taking. | **idea only:** True

## dsh.24 Context-overflow recovery loop with durable-progress proof

- **where:** packages/compaction/compaction-basic/src/index.ts:190-234, :155-178 (pressure-triggered pre-step compaction)
- **what:** When a request fails with CONTEXT_WINDOW_EXCEEDED, compaction runs and the step is retried — but only if the surface's `replaceGeneration` actually advanced. A failed compaction that nonetheless landed a model-free prune is accepted as sufficient proof.
- **how:** Retries are bounded per agent by `policy.maxOverflowRetries` and reset on `agent/status === 'idle'` or on any `assistant/message`. The failure path checks `signal.aborted` first (cancellation always wins), then compares `agent.session.surface.replaceGeneration > generation`.
- **solves:** Naive "compact and retry on overflow" loops forever when compaction cannot free enough, and retries pointlessly when it freed nothing. Tying the retry decision to an observable surface counter makes both cases decidable.
- **port effort:** Low-medium, and highly portable in spirit: retry only on *proven* progress. | **idea only:** True

## dsh.25 KV-cache-aligned summarization

- **where:** packages/compaction/compaction-basic/src/summarizer.ts:22-32 (COMPACTION_INSTRUCTION), :71-84 (SummarizationInput doc), :90+
- **what:** The compaction call replays the conversation's own system prompt, tools, and leading messages verbatim, and delivers the compaction directive as the *final user message* rather than as a separate summarizer system prompt — so the auxiliary call is a true prefix of the last real request.
- **how:** The directive explicitly acknowledges a prior `<compacted-summary>` block and instructs the model to merge rather than copy it forward, and forbids mentioning the compaction itself. A fixed 7-section Markdown schema with "write (none), never drop a section" makes checkpoints comparable across compaction events.
- **solves:** Most harnesses invalidate the KV cache on every compaction, making compaction the single most expensive operation in a long session. Also solves checkpoint-stacking: without the merge instruction, a second compaction copies the first checkpoint forward verbatim.
- **port effort:** Low. The prefix-alignment insight is portable in a day; the 7-section schema is a reasonable starting template. | **idea only:** True

## dsh.26 Provider-owned retry policy executed at a loop extension point

- **where:** packages/llm/llm/src/retry-policy.ts (policy shape + resolution), packages/llm/llm-retry/src/index.ts:195, :243
- **what:** Retry is not built into the loop. Adapters own a `retryPolicy` per route; the optional `llm-retry` plugin executes it on `agent/request-error`, and the loop's own behaviour is only "ask, and retry if someone says retry".
- **how:** Bounded exponential backoff with symmetric jitter, capped by `maxDelayMs` and by `MAX_TIMER_DELAY_MS`; the delay is cancellable via AbortSignal. Default retryable set is `EMPTY_RESPONSE, RATE_LIMIT, SERVER, TIMEOUT, TRANSPORT` — note `INVALID_CREDENTIAL` is explicitly excluded with the reasoning that a malformed credential fails identically on every attempt. Each scheduled retry is durable before its cancellable wait.
- **solves:** Retries are provider-specific and rarely uniform. Keeping the policy in the adapter config and the executor in a plugin means a deployment can drop retries entirely, or switch to `mode: 'always'`, without touching the loop.
- **port effort:** Low. The backoff math is trivial; the *placement* (extension point, not loop code) is the idea. | **idea only:** True

## dsh.27 Depth-budgeted continuable subagents

- **where:** packages/subagent/subagent/src/child-agent.ts:52 (resolveChildDepth), packages/subagent/subagent/src/continuation.ts:1-14 (contract), packages/subagent/subagent/src/continuation-activation.ts (35 KB)
- **what:** Delegation depth is derived from the parent's persisted header (a monotone floor), so a resumed parent cannot delegate as if it were top-level. A continuable child has one durable Session and at most one process-local Activation.
- **how:** `resolveChildDepth` throws `SubagentDepthError` past the cap and `RangeError` outside safe-integer range. The stated contract: "The Agent inbox is the only turn queue, so this manager owns durable orchestration while the Agent loop owns all turn ordering and execution. No continuable path creates a Task or an intermediate result-bearing wrapper." Backends: in-process spawn, in-process fork (history-seeded), ACP, real Codex app-server, real Claude Code Agent SDK, and Harness-over-SDK.
- **solves:** Subagent depth limits are usually advisory and bypassable on resume, because depth lives in process memory. Deriving it from the parent's persisted header makes it survive restart. The "inbox is the only turn queue" constraint avoids the double-queueing bug where a subagent has both an agent queue and a wrapper-level task queue.
- **port effort:** Medium. The depth-from-persisted-header rule is the portable part; the six backends are not. | **idea only:** True

## dsh.28 Scoped agent event dispatch where subject and scope cannot diverge

- **where:** packages/core/agent/src/dispatch.ts:20-30 (AgentSubjectEvent type derivation), :76+ (agentEvents)
- **what:** `agentEvents` fuses the event's `agent` subject with its scope carrier, so a listener can never observe one agent's payload in another agent's scope.
- **how:** The event set is derived by *type*, not a hand-maintained list: an event qualifies only if its first parameter carries `{ agent: Agent }` AND its `this` is `Scoped<Agent>`. The `this` check is what excludes zero-arg events and payload-happens-to-carry-an-Agent events. The carrier is stateless and built once per agent, keeping hot-path dispatch allocation-free.
- **solves:** Multi-agent routing bugs where a listener for agent A fires on agent B's event. Deriving the routable set from the type signature means a new agent-scoped event is automatically scoped — no registry to forget to update.
- **port effort:** Low. The type-level derivation is the whole trick. | **idea only:** True

## dsh.29 Model-free context reduction as a separate concern from summarization

- **where:** packages/compaction/compaction-tool-result-pruner/src/index.ts:40 (ToolResultPruner, requires tokenMeter), packages/spill/spill-policy/src/index.ts:22, packages/spill/spill/src/types.ts (SpillRef)
- **what:** Tool-result pruning (head/middle/tail character budgets) and output spilling (token-budgeted, with a recoverable locator) are separate plugins from summary compaction, so a deployment can run the cheap reduction without ever calling a summarizer.
- **how:** The pruner emits a `PRUNE_MARKER` in place of removed middle content and requires the token meter because each shadowed node is priced by its own logged shadow-price event. The spill policy keeps recoverable text behind an opaque `SpillLocator` that consumers render via `retrievalHint` and are forbidden to parse; missing recovery storage keeps the original content and logs the reason.
- **solves:** Most of a context window is usually old tool output, not conversation. Reducing it deterministically is cheaper, faster, and lossless-ish compared to summarizing, and keeping the artifact recoverable means the model can re-read it.
- **port effort:** Low-medium. Both plugins are small and self-contained. | **idea only:** True

## dsh.30 Session format as a versioned migration chain

- **where:** packages/core/session/src/types.ts:89, packages/session/session-format{,-v0-to-v1,-v1-to-v2,-v2-to-v3,-v3-to-v4}/, packages/session/session-format/src/chain.ts
- **what:** `SESSION_FORMAT_VERSION = 4` with four independent migration packages, each re-exporting its predecessor's released codec so a v0 log can be read without a fallback path.
- **how:** Each successor exports `releasedV<N-1>SessionFormatCodec` and its own `assertReleasedV<N>Header` validators. AGENTS.md states the rule: "may add a version-named successor but never move, overwrite, or delete committed generations; predecessors imply neither fallback nor downgrade support."
- **solves:** Session formats drift. Without a chain, upgrading the harness orphans every existing session. With one, old logs stay readable and each generation is independently testable.
- **port effort:** Low to establish the rule early, high to retrofit. This is a "decide now, pay later" item. | **idea only:** True

## dsh.31 MCP tool-name contract: server-qualified, pure, collision-proof public names

- **where:** packages/mcp/mcp-client/src/tools.ts:81-87 (`publicToolName`); contract pinned in .agents/notes/implemented/feature/2026-07-07-mcp-client-plugin.md
- **what:** Derives the model-facing tool name as a pure function of the pair (serverName, rawName) — `mcp__<serverName>__<rawName>` — normalized to a 64-char `[A-Za-z0-9_-]` contract. If normalization is lossy (any char replaced OR length > 64), a 12-hex-char SHA-256 of `serverName\0rawName` is appended to the 51-char stem, so distinct identities can never collapse. The raw name is the only thing ever sent on the wire; the public name is never parsed back.
- **how:** Deterministic pure function, unit-tested as a v1 contract. `scopeOf(ctx)` scopes the namespace so two agents can both mount a `github` server without colliding.
- **solves:** Session history, permission rules, and KV-cache prefixes survive server restarts, HMR hot-swaps, and unrelated servers' tool-list changes. Without the hash, a long or punctuated upstream name could silently map two different MCP tools onto one model-visible name.
- **port effort:** Small — the function is ~7 lines; the expensive part is the invariant that the name is a pure function of local config and never of the remote `serverInfo.name` (untrusted, not unique across deployments, changes on upgrade). | **idea only:** True

## dsh.32 Generation swap: full-set-or-nothing tool registry sync

- **where:** packages/mcp/mcp-client/src/tools.ts:113-162; serialization via `syncChain` in connection.ts:168-177
- **what:** `syncTools` runs in two phases. Phase 1 fetches and builds the ENTIRE next generation into a Map without touching the registry — any throw (network failure, duplicate raw name) leaves the previous generation registered and untouched. Phase 2 disposes the previous generation and registers the new one; if ANY registration conflicts, every disposer collected so far runs and the server is left with ZERO tools, never a partial set.
- **how:** A registration conflict on an `mcp__<server>__` name can only mean a foreign registration squats the namespace, so partial registration is never the right answer. Initial sync may use `registrationFailure: 'throw'` (when `failOnStartupError`) so activation rejects; re-syncs always 'contain'.
- **solves:** A model never sees half a server's tool set, and a transient discovery failure never silently drops working tools. A promise chain (`syncChain`) serializes initial, notification, and reconnect syncs so two swaps can never interleave and double-dispose one generation.
- **port effort:** Small — ~50 lines plus the serialization chain. Directly portable to any registry that swaps a set of registrations. | **idea only:** True

## dsh.33 Outage-budget reconnect supervisor that survives crash loops

- **where:** packages/mcp/mcp-client/src/connection.ts:211-245 (`scheduleReconnect`), :257-343 (`connectGeneration`)
- **what:** One shared budget per outage: `maxAttempts` consecutive failures, delays doubling `initialDelayMs`→`maxDelayMs`. The budget resets only when a connection stays up longer than `maxDelayMs` — so a server that connects briefly then crashes still exhausts the cap instead of restarting forever. Reconnect timers are `.unref()`'d so an armed retry never holds the process open.
- **how:** `connectedAt` is compared against `maxDelayMs` at the moment of loss (line 222) to decide whether the outage ended. Exhaustion unregisters tools and stops; disposal (HMR or restart) is the only way back.
- **solves:** Distinguishes 'server is flapping' from 'server is down' without a separate flapping detector, and prevents a reconnect loop from becoming a process-lifetime resource leak.
- **port effort:** Medium — the state machine (client, closeClient, disposers, reconnectTimer, failedAttempts, connectedAt, isCurrent guard) is ~120 lines. The isCurrent-guard-per-generation pattern is the reusable part. | **idea only:** True

## dsh.34 Egress-test discipline: one proxy-driven transport test per outbound call site

- **where:** packages/util/http-proxy/README.md ("Writing a new outbound call"); the 9 files found by `find . -name egress.spec.ts`
- **what:** Each package that makes an outbound HTTP call carries a `tests/egress.spec.ts` that drives its ACTUAL transport through a fake proxy and asserts the observed route. 9 such files exist. The README states the rule as mandatory: "Every new outbound call site must include that transport test."
- **how:** The proxy installer patches the global undici dispatcher. Because an SDK's routing lives inside the SDK, a lint rule cannot see it — so a real request through a fake proxy is the only assertion that catches a dependency silently switching transports.
- **solves:** Detects dependency upgrades that reroute traffic away from the proxy with no change at the call site — the exact failure a unit test with a mocked fetch would miss.
- **port effort:** Very low as a rule (one spec file per outbound package). The 681-line http-proxy implementation itself is the expensive part. | **idea only:** True

## dsh.35 Process-wide proxy as an installed global, not a plugin

- **where:** packages/util/http-proxy/src/{policy,install}.ts (681 lines); README rationale: "transport policy has one answer per process"
- **what:** `dsh-http-proxy` is a library, not a Cordis plugin: the launcher resolves the policy once per process and installs a global undici dispatcher, so plain `fetch()` and any SDK reaching `globalThis.fetch` (MCP HTTP transport, the pi-ai provider stack) are proxied with zero call-site change. Loopback always bypasses. Unsupported proxy schemes (SOCKS/PAC) are reported and skipped rather than failing startup.
- **how:** `proxyRouteFor(url)` returns the transport the answer assumed (its proxied arm carries the dispatcher), so a caller cannot read the policy then build a transport that bypasses it after an unmount. `verify-no-bare-dispatcher` rejects `new Agent(...)` outside this package; `web-fetch-http` has one legitimate exemption marked with a `proxy-exempt:` comment.
- **solves:** Proxies every future outbound call without touching it, and makes the one exemption explicit and greppable instead of an invisible divergence.
- **port effort:** High to port the implementation; low to adopt the 'library not plugin' shape and the `proxy-exempt:` comment convention. | **idea only:** True

## dsh.36 Compat 'drift gates' that fail compilation when upstream adds a member

- **where:** packages/llm/llm-pi-ai/src/catalog.ts:99-160 (THINKING_FORMAT_GATE, MAX_TOKENS_FIELD_GATE, THINKING_TOKEN_BUDGET_FIELD_GATE, CACHE_CONTROL_FORMAT_GATE, CHAT_TEMPLATE_VAR_GATE, protocol→gate map at :312-316)
- **what:** A `Record<UpstreamUnion, true>` typed as a const map forces every member of the upstream compat union to be named in one place. If pi-ai adds a new thinking format or token-budget spelling, the key type no longer matches and the build FAILS until a maintainer classifies it. Currently: 12 thinking formats, 2 maxTokensField spellings, 3 thinkingTokenBudgetField spellings, 1 cacheControlFormat, 3 chatTemplateVars, 5 protocol names.
- **how:** Also used for a second purpose: a switch settable on one protocol is inherited by the three Responses protocols because they share a compat type, so the gate is shared deliberately rather than duplicated.
- **solves:** The offer can never silently lag the upstream option set — there is no runtime 'unknown value' path, because a new value cannot compile until someone decides its disposition.
- **port effort:** Low. This is the closest thing in dsh to omp's `packages/catalog/src/compat/rules/` KDL discipline — same intent (no hard-coded model policy in TS, exhaustive classification), different mechanism (compile-time exhaustiveness vs. generated rule tree). | **idea only:** True

## dsh.37 Vendored framework with an exhaustive 22-entry local-patch ledger

- **where:** vendor/README.md (Manifest table, 9 rows; 'Local modifications', 22 numbered entries); vendor/AGENTS.md; docs/rescope.md; `pnpm run rescope-vendor --apply`
- **what:** All 9 Cordis foundation packages (cordis, cosmokit, schemastery, loader, include, group, timer, hmr, logger-console) are source-vendored, rescoped to `@deepseek-ai/*`, with upstream commit SHAs recorded per package and a numbered ledger of all 22 divergences — each with rationale and named covering tests. Includes real behavioral patches: `fiber.ts` reentrant-disposal hardening, a port of cordiverse/cordis#41 lazy config resolution, durable debounced config writes.
- **how:** Entry 11 is the discipline exemplar: `applyPatches` was extracted from a private method into an exported pure function SPECIFICALLY so `dsh --dump-config` would reuse it rather than reimplement and drift — and the extraction surfaced a real upstream bug (the id index was built before the patch loop, leaving inserted rows unpatchable).
- **solves:** Makes a 9-package framework fork auditable and re-syncable. The 'every divergence must be listed, with its covering test' rule is what keeps the fork from rotting.
- **port effort:** High to adopt wholesale. The reusable part is the LEDGER DISCIPLINE + the 'extract so config tooling cannot drift' rule, which applies to any vendored dependency. | **idea only:** True

## dsh.38 ACP server that lets a remote client attach MCP servers to a harness session

- **where:** packages/acp/acp/src/{index,content,codec,model-control,mcp,session,updates}.ts; run via `pnpm dsh --profile acp`; mirrored by packages/subagent/subagent-acp (the client side)
- **what:** `dsh-acp` is a full ACP v1 server over JSON-RPC stdio: `session/new`, `session/list`, `session/resume`, `session/close`, `session/set_config_option`, `session/prompt`, `session/cancel`, `session/update`, `session/request_permission`. A client can hand it stdio or Streamable-HTTP MCP server definitions, which dsh validates (absolute command+env, absolute HTTP(S) URL+headers) and mounts into that session's agent scope; any connection or discovery failure rolls back the unpublished agent.
- **how:** Deliberately automation-only: the wire carries committed messages/thoughts, generic tool lifecycle, config, and context usage — never raw provider deltas, retry attempts, or DSH presentation data. One in-flight prompt per session; a prompt snapshots its provider/model/effort and pins it across every model step in that turn, so a concurrent option change applies to the NEXT turn.
- **solves:** Gives an external controller (test runner, other harness) full agent lifecycle over a STANDARD protocol without exposing dsh's internal presentation, and without a client having to pre-mount MCP servers itself.
- **port effort:** High (7 source files + a matching client). `reusable_idea_only` because it is bound to Cordis scope disposal and the dsh session model. | **idea only:** True

## dsh.39 Scoped resource registry where the first provider mounts shared tools and the last unmounts them

- **where:** packages/mcp/mcp-resources/src/index.ts:80-119 (register + registerTools)
- **what:** `McpResourceRuntime` (ctx.mcpResources) holds per-scope `NamedEntries<McpResourceProvider>`. Registering the FIRST provider in a scope mounts the 3 shared resource tools; removing the LAST removes them — but the tools are registered on a `selfCtx` child scope, NOT on any individual server's context, so unloading one server can never remove tools another server still needs.
- **how:** `ScopedLayers` merges across agent scopes so a subagent sees only its own servers; `this.layers.merge(exec.agent, l => l.servers).get(server)` resolves the caller-visible provider before any network call, so an unknown server fails fast.
- **solves:** Makes N servers share one fixed tool surface (3 schemas instead of 3N), while keeping per-scope isolation and correct shared-tool lifetime.
- **port effort:** Medium (~130 lines) and it depends on dsh's ScopedLayers. The lifetime rule ('first mounts, last unmounts, owned by the service not the provider') is the portable idea. | **idea only:** True

## dsh.40 git integration through plumbing subcommands, never through a shell or a model-facing tool

- **where:** packages/deliverables/workspace-changes/src/git.ts (279 lines; package 1302 lines), plus packages/boot/plugin-manager/src/github-connection.ts for the GitHub install path
- **what:** `GitRunner` runs `git <args>` through the harness `SubprocessRuntime` seam (never a shell) with a 2s terminate grace, 16 KiB stderr tail, and a `TERM` scrub. It uses 8 plumbing subcommands — `rev-parse`, `ls-files`, `ls-tree`, `cat-file`, `diff-tree`, `check-ignore`, `write-tree`, `add` — to take working-tree snapshots and diffs for the deliverables/workspace-changes feature.
- **how:** A nonzero exit is a RESULT (`GitRunResult{exitCode, stdout, stderr, truncated}`), not an exception. Index+worktree snapshots are compared through object hashes rather than text diffs.
- **solves:** Produces reliable, cheap per-turn change sets without ever exposing arbitrary git to the model — and without the shell-injection surface a `git` tool would need.
- **port effort:** Medium (~280 lines) and dsh-specific in that it returns to a SubprocessRuntime seam. Note: omp's `@oh-my-pi/pi-natives/vcs` is the sanctioned equivalent and may already cover it. | **idea only:** True

## dsh.41 Credential-reference seam: config never holds a secret, resolution happens per request

- **where:** packages/credentials/{credentials,credentials-local,authorization}/; packages/llm/llm-pi-ai/src/auth.ts (credentialStoreFrom/authContextFrom) and src/login.ts; base profile rows `authorization` + `credentials-local`
- **what:** Settings carry REFERENCES, not values. An adapter resolves `apiKeyEnv` through `ctx.credentials` at request time, so rotating a key takes effect on the next request with no restart, and no secret is ever written into a profile file. Missing resolution fails the request with a stable code (`MISSING_CREDENTIAL`); an unusable credential fails with `INVALID_CREDENTIAL`. The managed store is `$DSH_HOME/.credentials.yaml` and is never materialized into the process environment.
- **how:** Provider logins (browser PKCE for DeepSeek accounts, OAuth/interactive-key for pi-ai routes) write records addressed as `llm-pi-ai/<provider id>`; refresh happens under the store's CROSS-PROCESS LOCK. A hand-declared route id outside the lowercase-hyphenated grammar is refused with `UNSTORABLE_PROVIDER_ID` rather than silently accepting an unaddressable record.
- **solves:** Keeps secrets out of config files and out of `process.env` dumps, while still allowing live rotation. The cross-process lock is what makes two concurrent dsh processes safe against the same store.
- **port effort:** Medium. The grammar rule (only addressable ids may be stored) and the 'resolve per request, never at load' rule are the portable parts. | **idea only:** True

## dsh.42 Multi-provider adapter dormant by default, activated purely by user settings

- **where:** packages/llm/llm-pi-ai/src/{index,adapter,config,catalog,stream}.ts; base profile row `llm-pi-ai` (packages/bundle/base/cordis.patch.yml:127) with an explanatory comment
- **what:** `dsh-llm-pi-ai` is mounted in the base profile with NO config and zero routes. It activates only when a `llm-pi-ai:` settings section supplies provider profiles, and drops back to zero routes when that section empties. Each operation captures an immutable snapshot (profiles + a `createModels()` collection) before its first await, so a request that started under one configuration never finishes under another.
- **how:** A route naming an installed pi-ai provider inherits its endpoint, protocol, and model catalog; a route pi-ai does not ship must declare `api` + `baseURL` + a non-empty `models` list. `models` REPLACES a route's catalog (each entry defaulting from the installed model of the same id); `modelOverrides` reshapes individual installed models and is REFUSED beside `models`, on hand-declared routes, or naming an unknown model — 'because a silently unchanged model would be a typo someone hunts for later'.
- **solves:** Which adapters exist is composition; which providers run is the user's settings document. And a half-applied config change can never be observed by an in-flight request.
- **port effort:** N/A for omp — this IS omp's `packages/ai`. For dsh the interesting part is the dormant-by-default mounting and the refuse-rather-than-silently-ignore rule for `modelOverrides`. | **idea only:** False

## dsh.43 PTC mode: model writes a program that calls tools, instead of one tool call per turn

- **where:** packages/core/tools/src/ptc.ts, ts-types.ts, py-types.ts, presentation.ts; packages/ptc-runtime/{ptc-runtime,ptc-runtime-node}; base profile rows `ptc-runtime` + `workflow-ptc`
- **what:** `dsh-tools` supports three presentation modes: native Function Calling, PTC (programmatic tool calling) where the model emits a `run_code` program against a generated SDK, or both. Sub-calls get ids `<parent>:ptc:<n>` that consumers treat as opaque and correlate by exact equality. Two runtimes are generated: TypeScript and Python (`ts-types.ts` 317 lines, `py-types.ts` 46KB, `ptc.ts` 38KB).
- **how:** Tool definitions are CODE-GENERATED into an SDK, so tool schemas leave the request prompt entirely; `dsh-ptc-runtime-node` is the sandboxed Node execution capability. The `tools:sdk` prompt section uses first-party order 5000 and DISABLES prompt-variable interpolation, preserving literal `{{…}}` text inside tool descriptions — a subtle correctness detail (otherwise a tool description containing braces would be interpolated).
- **solves:** Trades N tool schemas for one transport schema + generated SDK text. Also gives structured control flow (loops, conditionals over tool results) that per-call function calling cannot express.
- **port effort:** Very high (a code generator plus a sandboxed runtime plus Python and TS targets). The `interpolate: false` on the SDK prompt section is a cheap, independently valuable lesson. | **idea only:** True

## dsh.44 Single-slot capability registry for browser providers

- **where:** packages/browser-use/browser-use/src/index.ts (49 lines)
- **what:** `BrowserUseRegistry` permits exactly ONE browser provider at a time. `register(name)` throws `'browser use provider "X" is already registered'` on a second call — even a repeat of the same name. `providerName` remains readable while the provider's resources are closing, and the provider must stop admitting calls and await owned work BEFORE releasing the registration.
- **how:** `register` returns the effect disposer from `ctx.effect(...)`, so the slot frees automatically on unload. Providers call `ctx.browserUse.register(BrowserUseProviderName(name))` under `ctx.inject(['browserUse'])`.
- **solves:** Two browser backends fighting over one model-visible tool namespace is a silent correctness bug; failing at registration with a named message turns it into a load-time error.
- **port effort:** Very low — 49 lines. | **idea only:** True

## dsh.45 Three browser backends, two of which are MCP servers wrapped as providers

- **where:** packages/experimental/{browser-use-playwright-mcp, browser-use-chrome-devtools-mcp, browser-use-stagehand-native, browser-use-runtime}/
- **what:** Four providers under `packages/experimental/`: Playwright (`@playwright/mcp@0.0.80`), chrome-devtools-mcp (`1.9.0`), Stagehand native (`@puppeteer/browsers@3.2.2`), and `browser-use-runtime` which has its own `src/mcp.ts` — it presents an MCP server as a browser-use provider. The Stagehand provider contributes 6 model-facing tools (`stagehand_act`, `_extract`, `_navigate`, `_observe`, `_screenshot`, `_tabs`).
- **how:** Each registers into the single slot above. `browser-use-runtime` reuses the MCP client stack rather than reimplementing browser driving.
- **solves:** One tool surface over three very different browser automation stacks, and reuses the MCP bridge instead of a third protocol implementation.
- **port effort:** N/A — the right lesson is 'wrap external browser MCP servers through the existing MCP bridge rather than writing a new adapter'. | **idea only:** True

## dsh.46 Seam-and-provider pattern for shell, subprocess, fs, sandbox, terminal, storage, web

- **where:** packages/shell/*, packages/subprocess/*, packages/terminal/*, packages/storage/*, packages/web/*, packages/ssh/*, packages/fs/*
- **what:** Each external capability is an abstract Service plus N interchangeable providers, selected by config. shell: seam + bash-local/bash-sandbox/pwsh-local/pwsh-sandbox. subprocess: seam (managed process groups) + subprocess-local + subprocess-ssh. terminal: seam (owner-scoped PTY ids, backend registry) + terminal-bash. storage: hub + json + sqlite backends + a schema-validated `storage-domain` form. web: ctx.web seam + 3 search providers + 1 fetch provider. fs and sandbox each have local + ssh providers.
- **how:** Local vs remote is a provider swap, not a code path. `dsh-tool-bash` is 'a model-facing bash tool with optional generic background-job and sandbox-escalation support' — the escalation is what lets an untrusted session earn a wider sandbox without restart.
- **solves:** Makes 'run this on an SSH host instead' a configuration change, and keeps the model-facing tool definition identical across every backend.
- **port effort:** The pattern is architectural, not code — omp already has a similar shape. The specific gap dsh covers that omp may not: terminal (owner-scoped persistent PTY with 6 tools) and the sandbox-escalation path. | **idea only:** True

## dsh.47 Seam-and-provider pattern for subagents, with 6 backends including Codex and Claude Code

- **where:** packages/subagent/{subagent,subagent-spawn-in-process,subagent-fork-in-process,subagent-acp,subagent-dsh-sdk,subagent-codex,subagent-claude-code,subagent-in-process-driver,tool-subagent,tool-subagent-control}/
- **what:** `ctx.subagents` is a named-provider registry for delegating to child agents. Six backends: spawn-in-process (fresh child), fork-in-process (child seeded with a PREFIX OF THE PARENT'S LOG — provider/model stay equal to the parent so inherited history remains KV-cache eligible), subagent-acp (out-of-process over ACP), subagent-dsh-sdk (child harness subprocess over stdio JSON-RPC), subagent-codex (one-shot, official app-server protocol), subagent-claude-code (one-shot, official Agent SDK). `tool-subagent-control` adds globally named `send_message`, `interrupt_agent`, `list_agents` over continuations.
- **how:** Each delegation tool names a `provider` + `toolName` + `backgroundMode` (one-shot vs continuable). The two external CLI agents are mounted `disabled: true` in the standard preset with `maxDepth: provider-managed`. The fork backend deliberately OMITS model selection so KV cache is reused.
- **solves:** Delegation is provider-agnostic: the same tool can spawn an in-process child, fork a KV-warm copy, or shell out to Codex or Claude Code.
- **port effort:** High. Directly answers the 'codex' part of the request: dsh has a first-class Codex app-server subagent backend, disabled by default. | **idea only:** True

## dsh.48 Snapshot-per-operation config model for the LLM adapter

- **where:** packages/llm/llm-pi-ai/src/{index,adapter,config}.ts; the README's 'Understand the implementation' section
- **what:** Each LLM operation captures the whole `providers` Config reference plus a `createModels()` collection holding every built `Provider` before its first `await`. A config change builds a NEW collection rather than mutating the one in use, so a request that began under one configuration can never finish under another. Route-set or retry-policy changes re-register the same adapter instance in place, preserving previous routes when another adapter already owns a requested one.
- **how:** The credential store and auth context are deliberately stable ACROSS snapshots, so a config change rebuilds the collection without forgetting who is signed in. The adapter's own `apiKey` option is pi-ai's highest-priority auth override — that is what makes a fail-loud `apiKeyEnv` reference possible.
- **solves:** Removes an entire class of torn-config bug that is otherwise very hard to reproduce, and keeps auth state independent of the config snapshot lifecycle.
- **port effort:** Medium; the concept transfers to any adapter whose configuration can change at runtime. | **idea only:** True

## dsh.49 Model discovery over the wire, per protocol, with tolerant parsing

- **where:** packages/llm/llm-pi-ai/src/discovery.ts (363 lines)
- **what:** The adapter answers 'which models can this provider serve?' for settings surfaces. A route pi-ai SHIPS is answered from its catalog with no network call (preserving its `input` array as discovery `inputModalities`); only an unknown route is interrogated. `openai-completions`/`openai-responses` use `GET {baseURL}/models` with bearer auth; `anthropic-messages` uses native `GET /v1/models?limit=1000` with `x-api-key` + `anthropic-version`. The parser accepts a standard `data` array OR an enriched `models` map, and handles `max_input_tokens`/`max_tokens`, a map key that stays the request id even when the entry names a different canonical id, primitive-valued map properties, and a missing display name (falls back to the request id).
- **how:** The Anthropic listing URL accepts the API root with or without a trailing `/v1` because gateway docs publish both spellings, and ONLY that listing URL normalizes the segment — model requests receive `baseURL` unchanged. The reply is candidate metadata a surface may offer for adoption; nothing is stored.
- **solves:** 'Add a provider' becomes a form that asks the endpoint what it serves instead of a hand-written model list that goes stale.
- **port effort:** Medium. omp's `packages/catalog/scripts/generate-models.ts` already does upstream-driven generation; the delta is the per-PROTOCOL live discovery at settings time. | **idea only:** True

## dsh.50 Config layers as ordered patch rows, not a merge tree

- **where:** packages/bundle/*/cordis.patch.yml (base, web-app, headless, sdk-app, sdk-minimal, acp-app) + packages/bundle/web-app/presets/{minimal,standard,ptc}.patch.yml
- **what:** The base profile is ONE `insert` over an empty root. Later bundle patches and the user's profile `cordis.patch.yml` address rows BY ID, last write wins per row. A patch REPLACES the row's whole `config` rather than merging into it, so a row whose value differs by mode lives in that mode's bundle instead of base.
- **how:** Rows support `disabled: !!js <expr>` (vendor patch entry 18: the ONLY interpolated metadata field, evaluated at every mount decision, keeping the `!!js` form on write-back). Agent presets are themselves rows (`dsh-agent-preset`) with `cordis:group` blocks carrying `isolate:` keys (planMode, compaction, toolResultPruner, workflowEngine, terminals) so a preset can scope a capability to a mode.
- **solves:** Makes 'user overrides one setting' a one-row patch, and makes the default composition fully readable as a single ordered list.
- **port effort:** Medium; the `isolate:` key concept (scoping a capability to a mode without a new plugin) is the notable piece. | **idea only:** True

## dsh.51 Per-tool 'Model Experience' documentation contract

- **where:** packages/mcp/mcp-client/README.md, packages/mcp/mcp-resources/README.md, packages/core/tools/README.md; the pattern is repo-wide across package READMEs
- **what:** Every package README carries a `## Model Experience` section that, for each model-visible surface, states three things in fixed form: **What the model sees**, **Token effect**, and **KV Cache effect**. The MCP resource README, for instance, says the 3 shared definitions contribute fixed schema cost, that adding the FIRST visible server or removing the LAST changes the next tool-schema prefix, and that a reconnect recovering an UNCHANGED tool list reproduces identical definitions and stays prefix-stable.
- **how:** Every package README also carries a `## Known Limitations and Deferred Work` section with an explicit disclaimer that these are shipped constraints, not a backlog, plus a `## Dev Note` for open, explicitly non-authoritative directions.
- **solves:** Forces KV-cache stability to be a stated design constraint of every tool addition, not an afterthought — and makes cache regressions reviewable at the PR level.
- **port effort:** Very low as a documentation template; high value, and it is the single most transferable non-code practice in the repo. | **idea only:** True

## dsh.52 Plugin entrypoint: ba hình dạng, một hợp đồng

- **where:** vendor/cordis/src/registry.ts:8-146 (type + resolve + runtime), :316-336 (plugin())
- **what:** Một plugin là function (ctx, config), class new (ctx, config), hoặc object {apply(ctx, config)}. Mọi hình dạng đều mang metadata tùy chọn: name, Config (StandardSchemaV1 validator), inject (dịch vụ bắt buộc), provide (tên dịch vụ cung cấp), intercept. RegistryService.resolve() chuẩn hoá cả ba về một callback là khoá danh tính; Plugin.Runtime được cache theo callback nên nhiều ctx.plugin() trên cùng một callback dùng chung runtime.
- **how:** Đọc trực tiếp; ví dụ thật trong docs/cookbook/extension-cookbook.md (export const name = 'permission-gate'; export const inject = ['agents']; export function apply(ctx) {…})
- **solves:** Cho phép một package viết bất kỳ tích hợp nào cũng có cùng một entrypoint, và cho phép registry gom nhiều lần mount của cùng một plugin vào một runtime dùng chung.
- **port effort:** Thấp nếu đã có DI container; cao nếu chưa — đây là lớp nền, mọi thứ khác đứng trên nó. | **idea only:** True

## dsh.53 Fiber: máy trạng thái 6 trạng thái + epoch

- **where:** vendor/cordis/src/fiber.ts:147-154 (enum), :356-400 (_execute), :415-561 (effect), :611-639 (_refresh/_setEpoch)
- **what:** FiberState = PENDING | LOADING | ACTIVE | FAILED | DISPOSED | UNLOADING. Chuyển trạng thái đi qua _setEpoch(epoch): INACTIVE→active là _reload(), ngược lại là _unload(). Epoch là chuỗi ':'.join(inject-uid) nên tự động reload khi một dependency bị thay thế. Fiber.effect chịu 5 hình dạng trả về (disposer / promise / iterable / asyncIterable / nullish) và gom disposer theo thứ tự đảo khi dispose.
- **how:** Đọc; FiberState được re-export qua vendor/cordis/src/index.ts:6
- **solves:** Biến 'load order' thành hệ quả của yêu cầu dịch vụ, và làm cho unload/restart là một phép toán xác định thay vì một quy trình thủ công.
- **port effort:** Trung bình — logic thuần, không I/O, port trực tiếp được nếu ngôn ngữ đích có async iterable. | **idea only:** True

## dsh.54 Mọi đăng ký là effect có disposer — HMR và teardown miễn phí

- **where:** vendor/cordis/src/fiber.ts:110-117 (effectInertia), :415-561, :565-572 (getEffects)
- **what:** ctx.effect(execute, label) chạy ngay, thu disposer, dispose theo thứ tự đảo. Wrapper được ĐẨY VÀO OWNER LIST TRƯỚC KHI BODY CHẠY để unload khởi động từ trong setup vẫn chờ setup + cleanup. Async cleanup ẩn trong effectInertia WeakMap để owner khác JOIN cleanup đang chạy thay vì chạy lần hai. EffectMeta dựng cây nhãn phục vụ chẩn đoán.
- **how:** Đọc; ledger mục #6 trong vendor/README.md mô tả chính xác ba lỗ hổng reentrant này
- **solves:** Loại bỏ hoàn toàn khái niệm 'dọn dẹp thủ công': hot-reload trở thành hệ quả, không phải tính năng phải xây.
- **port effort:** Thấp — đây là ý tưởng, không phải code. | **idea only:** True

## dsh.55 Loader: cây entry có địa chỉ id, vá theo id, ghi lại xuống đĩa

- **where:** vendor/loader/src/config/{tree,group,entry,isolate}.ts, vendor/loader/src/index.ts:171-173 (root write no-op)
- **what:** EntryTree → EntryGroup → Entry → Fiber. EntryOptions = {id, name, config, group, disabled, inject}. EntryTree.write() là abstract; Loader root override thành no-op (in-memory), còn Include và preset thay bằng persist thật. Entry.getOuterStack() dựng call stack ảo theo baseUrl#entryId để lỗi plugin trỏ về đúng dòng YAML.
- **how:** Đọc entry.ts; chạy thực tế qua `dsh --dump-config` (xem ledger mục #11)
- **solves:** Biến 'cấu hình' thành dữ liệu có địa chỉ ổn định, nên vá, disable, và hot-reload đều là thao tác trên một hàng có id chứ không phải sửa một danh sách plugin.
- **port effort:** Trung bình — cần một định dạng cây entry + cơ chế vá + một lớp persist. | **idea only:** True

## dsh.56 Ngôn ngữ YAML !!js — cấu hình là biểu thức sống

- **where:** vendor/include/src/index.ts:9-22 (js-yaml Type + entryListSchema), vendor/loader/src/config/entry.ts:85-97 (disabledOf/evaluate), vendor/loader/src/index.ts:104-113 (internal/config interpolate + marker EntryGroup.key)
- **what:** `!!js "<expr>"` biến một scalar thành node biểu thức. Interpolate CHỈ trên hai trường: config (sau khi inject đã active, resolve trong chính context của plugin) và disabled (ở MỖI lần quyết định mount, resolve trong context của loader). Node thô giữ nguyên khi ghi lại nên vẫn hiện !!js. Metadata còn lại giữ literal. Đây là cơ chế duy nhất cho conditional composition.
- **how:** Đọc; ví dụ thật: packages/bundle/base/cordis.patch.yml `plugin-manager: disabled: !!js "!ctx.get('profileContext')"` (8 dòng dùng !!js disabled trong base)
- **solves:** Cho phép cùng một cây cấu hình phục vụ nhiều profile/mode mà không cần fork file — và cho phép `dsh --dump-config` in ra đúng thứ mà include sẽ mount, vì nó dùng CHUNG applyEntryPatches (ledger #11).
- **port effort:** Thấp-Trung bình — cần một YAML type tag + một evaluator; cần cẩn thận về thứ tự resolve. | **idea only:** True

## dsh.57 33 seam: interface + registry provider có tên + disposer + mã lỗi chọn provider

- **where:** packages/web/web/src/index.ts:98-191, packages/lsp/lsp/src/index.ts:90-137; phân loại tại docs/capability-seams.md
- **what:** Định nghĩa chuẩn: service khai register*(provider) => () => void, từ chối trùng id với mã lỗi riêng, và lộ VÀI LỖI CHỌN PROVIDER CÓ MÃ thay vì im lặng fallback — ví dụ WEB_PROVIDER_CONFIGURED_MISSING / _UNAVAILABLE / _AMBIGUOUS, LSP_CONFLICT, LSP_INVALID_PROVIDER. Danh sách seam: shell, fs, sandbox, subprocess, terminals, storage, session-query, web, subagents, lsp, skills, compaction, jobs, spill, webServer, directoryPicker, workflow, speechToText, browserUse, computerUse, credentials, deepseekAccount, authorization, sessionTelemetry, sessionTitle, fileReferences, mcpResources, userQuestions, ptcRuntime, spillStore, sessionReferenceResolver.
- **how:** Đọc 2 seam đại diện + cột 'Writes / affects' trong bảng capability-seams
- **solves:** Tách 'cái gì' khỏi 'cài đặt cụ thể': bash-sandbox thay bash-local mà không sửa tool-bash; fs-ssh thay fs-local mà không sửa tool-fs. Đây là thứ biến 'mọi thứ là plugin' từ khẩu hiệu thành cấu trúc.
- **port effort:** Trung bình — ý tưởng rẻ, nhưng phải cả quy ước đặt tên lỗi và quy tắc provider-mặc-định. | **idea only:** True

## dsh.58 Bốn bảng 'tại sao' đều SINH TỰ ĐỘNG và có freshness gate

- **where:** scripts/gen-doc-graphs.ts, scripts/gen-cordis-catalog.ts (64KB), scripts/gen-tool-catalog.ts, scripts/gen-cordis-api.ts, packages/typert/generator/src/cordis-catalog.ts; 63 script verify-*
- **what:** Đây là câu trả lời trực tiếp cho câu hỏi 'đây là API công khai hay chỉ là nơi gọi nội bộ': NÓ CÔNG KHAI, VÀ MÁY CHỨNG MINH. (a) docs/capability-seams.md — 90 dịch vụ phân loại core/seam/service/bundle, với implementor và consumer, do gen-doc-graphs.ts sinh kèm completeness guard. (b) docs/subsystems/*.md — 55 trang có block BEGIN GENERATED cordis-surface với JSDoc gốc, kiểm bằng verify-cordis-catalog. (c) tool-catalog.md — 30 gói tool / 95 tên tool, BOOT THẬT rồi đọc ctx.tools.schemas() vì schema tool không suy ra được tĩnh. (d) api-catalog.ts — cùng AST walk. 11 catalog khác cũng có gate riêng.
- **how:** Đọc header của từng file sinh; `pnpm run doc-sync` = `tsx scripts/run-gates.ts doc-sync`
- **solves:** Ngăn tài liệu lệch với code mà không cần kỷ luật thủ công — đây là thứ biến 'luận điểm' thành thứ kiểm chứng được.
- **port effort:** Cao về công cụ (cần AST walk + renderer + gate CI), nhưng ý tưởng ('sinh tài liệu từ một nguồn duy nhất, gate freshness') thì rẻ và nên chép ngay. | **idea only:** True

## dsh.59 Harness tự mô tả chính nó cho model lúc chạy

- **where:** packages/extensions/tool-cordis/src/{providers,api-catalog,config,present,host}.ts; 2 provider đăng ký tại providers.ts:38-60
- **what:** cordis_inspect_list / cordis_inspect_query phục vụ SERVICE_API (89) + EVENT_API (81) + TYPE_API (926) + INHERITED_CTX_API (9 nhóm). Hai tầng: gọi không có tham số → directory gọn; gọi có tên → MỘT hợp đồng đầy đủ kèm referencedTypeClosure() chỉ trả về đúng các type mà chữ ký tham chiếu. Có thêm provider Config đọc schema Config sống từ cây Loader đang chạy, phân loại trạng thái schema|absent|unsupported|tree|inactive.
- **how:** Đọc queryServiceApi/queryEventApi ở cuối api-catalog.ts và hostInspectProviders
- **solves:** Model viết plugin mà không cần snippet cứng trong prompt, và không bị mơ hồ khi API đổi.
- **port effort:** Trung bình-Cao — cần bộ sinh catalog trước, rồi phần serve là mảnh nhỏ. | **idea only:** True

## dsh.60 89 UI slot có hợp đồng sinh tự động (cardinality, scope, occupants, replaceRisk)

- **where:** packages/extensions/cordis-client-runner/src/client/slot-catalog.ts (4132 dòng, 89 slot), sinh bởi scripts/gen-client-catalog.ts
- **what:** Mỗi slot mang kind (single/list/keyed/chain), scope (root/session/session-maybe), registerOptions có requirement từng option, ownerProps, keyDomain, slotInject, declaredBy, occupants (ai đã ngồi chỗ đó), và replaceRisk ('shadows-shipped-ui' khi đăng ký vào đây sẽ thay UI có sẵn). Kèm một browser-half tối thiểu làm ví dụ. CLIENT_NOTES bắt buộc inject: ['slots'] và bọc trong ctx.slots.inject(key, () => ctx.slots.register(...)) — slot chỉ tồn tại khi entry khai nó đang mount, đăng ký vào slot chưa khai sẽ throw.
- **how:** Đọc ClientSlotEntry + CLIENT_NOTES
- **solves:** Trả lời câu hỏi khó nhất của UI plugin ('nếu tôi đăng ký vào chỗ này, tôi có làm hỏng UI có sẵn không?') bằng dữ liệu, không bằng đọc code.
- **port effort:** Cao nếu bạn có UI plugin; trung bình nếu chỉ chép mô hình cardinality + occupants. | **idea only:** True

## dsh.61 Đăng ký invariant theo gói qua export ./invariant riêng

- **where:** packages/runtime-diagnostics/invariants/src/index.ts (200 dòng); ví dụ packages/interaction/commands/src/index.ts:~6
- **what:** InvariantInstaller {(ctx, fail), inject?} — mỗi package tự đăng ký check của mình qua ctx.invariants.register(PACKAGE_NAME, install); lọc bằng allowlist/blocklist regex theo tên package; vi phạm ném InvariantError với code='INVARIANT' và packageName. Quy tắc repo (AGENTS.md:132): CHỈ publish ./invariant khi hai quan sát độc lập thực sự có thể phân kỳ; check 'service có tồn tại', 'metadata plugin', 'fixed example' bị coi là vô hiệu.
- **how:** Đọc; verify-package-invariants + verify-built-package-invariants chạy trong CI
- **solves:** Giữ được ràng buộc kiến trúc (ví dụ 'mọi thứ là plugin') như một kiểm tra chạy được thay vì một đoạn AGENTS.md.
- **port effort:** Thấp — pattern nhỏ, tự chứa. | **idea only:** True

## dsh.62 Hook: một protocol chung + bridge ra dialect bên ngoài

- **where:** packages/hooks/hook-protocol/src/ (855 dòng), packages/hooks/hooks-claude-code/, packages/hooks/hooks-codex/
- **what:** hook-protocol định nghĩa HookInvocation {turn, point, dialect, handlerId, matcher} và cặp event bền hook/invoked + hook/result, kèm matcher/merge/runner/codec. hooks-claude-code và hooks-codex map config file bên ngoài lên các extension point của harness, dùng CHUNG một số default (DEFAULT_STDERR_SUMMARY_MAX_CHARS = 500 đặt ở lib chung để 2 bridge không trôi nhau). Ràng buộc: hook phải turn-enclosed và invoked/result phải cặp.
- **how:** Đọc events.ts + runner.ts; extension-cookbook cho biết bridge map lên agent/created, agent/pre-step, agent/request, tools/pre-execute, tools/post-execute, agent/turn-stopping
- **solves:** Tái sử dụng hệ sinh thái hook đã có (Claude Code, Codex) mà không nhân bản semantics vào từng bridge.
- **port effort:** Trung bình. | **idea only:** True

## dsh.63 Plugin hai mặt (host + client) khai bằng manifest dsh.client

- **where:** packages/client/modules/src/index.ts:1-30, packages/client/modules/src/client/{manifest,entries,entry-lifecycle}.ts; ví dụ manifest packages/experimental/client-ui-voice-input/package.json
- **what:** Đây là DUY NHẤT chỗ manifest ghi 'tôi là plugin': dsh.client = {inject, platform, external, immediately} và dsh.bundle.patch = './cordis.patch.yml'. Node half quét các entry của Loader đang sống, dựng window.__DSH_BOOT__ theo thứ tự module-graph, phục vụ bundle + sourcemap, và QUÉT INCREMENTAL — mỗi event internal/plugin đánh dấu tên entry bẩn, một microtask flush đối chiếu với entry đang sống; metadata (kể cả phán quyết 'không phải client package') cache theo specifier.
- **how:** Đọc docstring module; ví dụ manifest thật ở packages/experimental/inspector/package.json
- **solves:** Một plugin = một package npm, có nửa Node và nửa trình duyệt, với đồ thị entry phía browser dựng tự động — không cần bước build riêng cho UI.
- **port effort:** Cao — đây là phần đắt nhất để chép, và cũng là phần M4 có thể bỏ qua ban đầu. | **idea only:** True

## dsh.64 Composition point: preset = cả một Loader tree, mount theo revision

- **where:** packages/preset/agent-preset-registry/src/{mount,composition-inventory,index}.ts (1122 dòng)
- **what:** PresetTree extends EntryTree với override write(): void {} (chỉ config editor bền vững mới ghi). Registry giữ MỌI composition còn sống; mounts là module state nên có thể vượt qua ranh giới runtime Cordis, và người đọc phải truyền root fiber để không lẫn preset giữa hai runtime. Có CompositionRowEnablement = boolean | 'conditional' — khi !!js không evaluate được ngoài mount thì báo 'conditional' chứ không đoán.
- **how:** Đọc mount.ts:8-24 và composition-inventory.ts:10-35
- **solves:** Cho phép 'cá nhân hoá agent' là một cây plugin hoàn chỉnh thay vì một danh sách cờ bật/tắt — và cho phép giữ revision đã bị thay thế cho tới khi người dùng cuối buông.
- **port effort:** Cao. | **idea only:** True

## dsh.65 Volatile config: commit tham chiếu sống mà không remount

- **where:** vendor/loader/src/config/entry.ts:157-195, vendor/loader/src/config/diff.ts (45 dòng); ledger mục #22
- **what:** Khi chỉ giá trị volatile đổi, Entry._commitVolatile() re-parse raw config, so sánh giá trị thường, commit tham chiếu tại chỗ và phát loader/volatile-update CHỈ CHO FIBER SỞ HỮU; nếu một giá trị thường đổi theo thì rơi về vòng remount thường. equalExceptVolatile bỏ qua các đường dẫn volatile cố định bằng schema metadata mà KHÔNG chạy hook/validation.
- **how:** Đọc; test ở scripts/loader-volatile-update.spec.ts và scripts/volatile-config.spec.ts
- **solves:** Cho phép settings đổi trực tiếp một giá trị đang được đọc bởi code đang chạy, mà không mất state của plugin — điều mà reload/remount không làm được.
- **port effort:** Cao — cần cả tầng cosmokit (reference + commit) lẫn diff dựa trên schema. | **idea only:** True

## dsh.66 Slash command và Settings: hai bảng đăng ký nhỏ, tách khỏi model

- **where:** packages/interaction/commands/src/index.ts:69-81, packages/settings/settings/src/index.ts (SettingsForms tại dòng 223)
- **what:** Command: CommandDefinition {definitionId, name, description, input, recordInput, handler}, tên ràng buộc /^[a-z][a-z0-9_-]*$/u, đăng ký qua ctx.invariants.register (tức là cũng là một effect). recordInput: false cho command mà domain event đã giữ payload — tránh ghi trùng vào session log. Settings: SettingsDescriptor + SettingsForms extends Service, form chiếu trường Config volatile, edit ủy quyền cho config-editor (ghi patch dưới file lock + hàng đợi HMR).
- **how:** Đọc; 8 package đăng ký command: plan-mode, command-compact, command-feedback, session-log-export, file-upload, permission-presets, command-goal, client/ui-conversation
- **solves:** Tách 'việc người dùng gõ' khỏi 'việc model gọi' — command không đi qua model, nhưng vẫn là plugin có disposer.
- **port effort:** Thấp. | **idea only:** True

## dsh.67 Service isolation realm: cùng một service, nhiều thế giới song song

- **where:** vendor/cordis/src/context.ts:121-125, vendor/loader/src/config/isolate.ts:5-50, vendor/cordis/src/service.ts:86-102
- **what:** ctx.isolate(name, label) tạo child context nơi service name resolve theo label thay vì theo cha. Loader mở rộng thành Realm với LocalRealm (theo entry) và nhãn dùng chung. Service[resolveConfig] gộp config từ ancestor (gần root trước), dùng Config.merge nếu service có.
- **how:** Đọc; loader tự mount ctx.plugin(isolate) tại vendor/loader/src/index.ts:168
- **solves:** Cho phép hai plugin cùng kiểu dùng khác nhau mà không cần fork service — vd hai backend cùng tên khác instance.
- **port effort:** Trung bình. | **idea only:** True

## dsh.68 Bảng feature → cơ chế, tự đặt làm proof obligation

- **where:** docs/cookbook/extension-cookbook.md#the-feature--mechanism-map, .agents/notes/implemented/architecture/2026-06-11-microkernel-event-taxonomy.md
- **what:** ~28 dòng ánh xạ từng tính năng sản phẩm sang cơ chế plugin: 'Hook system → listener trên agent/created, agent/pre-step, agent/request, tools/pre-execute, tools/post-execute, agent/turn-stopping'; 'MCP → một plugin mỗi server: discover tools → ctx.tools.register()'; 'Context compaction → seam ctx.compaction + dsh-compaction-basic'; 'Plugin hot-reload → mọi đăng ký là ctx.effect'. Doc tự nói: 'No row modifies the loop.'
- **how:** Đọc cả bảng và agent note
- **solves:** Đây là hình thức cụ thể nhất của 'mọi thứ là plugin': biến luận điểm kiến trúc thành một danh sách có thể kiện. Đáng chép nhất về mặt kỷ luật.
- **port effort:** Rất thấp — chỉ là một bảng markdown, nhưng phải thực sự cập nhật khi thêm cơ chế. | **idea only:** True

## dsh.69 Per-platform shortcut registry with a configurable/fixed split

- **where:** packages/client/shortcuts/ (registry, protocol, persistence), packages/client/ui-shortcuts/ (reference sheet + `settings.general.item` row), apps/desktop/src/keybindings.ts + keyboard.ts (native bridge). 10 owning UI packages register into it.
- **what:** 18 configurable commands × 6 platform profiles (desktop:macos/windows/linux, web:macos/windows/linux) + 11 non-editable `registerFixed` rows in 2 groups (`input`, `approval`) plus menu-arrows rows. Every command declares per-profile defaults; an omitted profile is unbound. Registration rejects duplicate ids and overlapping defaults. Preferences store only overrides (`null` clears, absent inherits). Web persists to origin-local `dsh.keybindings.v1`; Desktop to Electron `userData/keybindings.json` via `writeFileAtomic` — deliberately independent of the harness home. Windows/macOS Desktop support two-key chords with overlapping presses in either order; Web rejects `secondCode` entirely.
- **how:** Feature plugins call `ctx.shortcuts.register({ id, label, aliases, defaults, regions, modals, resolve })` inside `ctx.effect()`. `resolve` returns `{status:'handled', run}` or `{status:'blocked', reason}` — a command is never silently dead; it renders a localized reason. `regions: ['page','editable','terminal']` and `modals: [...]` declare where the command is allowed to fire.
- **solves:** A terminal app normally has one keymap. This makes the keymap a first-class, inspectable, per-device, user-overridable artifact with a generated reference sheet — the exact thing a TUI hand-rolls badly and then cannot debug. The `resolve`-returns-a-reason shape is the part worth stealing: it makes "why didn't my key do anything" answerable.
- **port effort:** Medium. The model (id, regions, modals, blocked-reason) ports directly; the two-key chord and 6-profile matrix are Desktop/Web-specific complexity that a TUI can drop entirely. | **idea only:** True

## dsh.70 Slash commands that never become a model message

- **where:** packages/interaction/commands/ (registry, brand, invariant), 6 producer packages, packages/client/ui-commands/ (the `/` source, 3-kind dispatch: `leadingInput` | `popupSelect` | `execute`), docs/subsystems/commands.md.
- **what:** 6 host commands (`/plan /feedback /export /compact /goal /permission`) + 3 client-only (`/model` popup, `/file` action, `/permission` decoration). Commands run directly against the agent; the result is rendered outside model history and adds **zero model tokens**. Syntax is strict: slash at byte zero, lowercase `[a-z0-9_-]`, then EOI or whitespace. An unknown `/x` line is **rejected**, never downgraded to a prompt. Agent-scoped registrations shadow a same-named global for one agent. Attachment admission is declared, not assumed: an undeclared attachment, an unknown upload receipt, or an over-limit image batch settles as an error before the handler runs, and a refusal preserves the composer's draft and attachment cards.
- **how:** `ctx.commands.register({ name, description, input:{hint,attachments}, handler, recordInput })`; adapter calls `execute(agent, line, attachments, signal)`. Lifecycle: `command/run` appended before the handler, `command/done` at settlement, paired by invariant, appended standalone (no turn wraps them) so persistence drains them at ordinary checkpoints. `commands/change` notifies live adapters; observer failure is logged and cannot veto the mutation.
- **solves:** Most agents let a mistyped slash command silently become a model prompt — the user pays tokens and gets a hallucinated answer. This makes the command plane a typed, zero-token, discoverable surface with an explicit rejection path. The `recordInput: false` escape hatch (for commands whose own domain event already carries the payload) is the detail most hand-rolled implementations miss.
- **port effort:** Low. Pure logic, no React, no platform. The registry + a REPL adapter is a few hundred lines. | **idea only:** False

## dsh.71 Composer trigger pipeline with a grouped, sticky-dismiss candidate menu

- **where:** packages/client/ui-input-trigger/ (detect, menu, pick pipeline), packages/client/ui-skill/src/client/index.ts:160, packages/client/ui-reference/src/client/index.ts:55, packages/client/ui-commands/src/client/service.ts:115.
- **what:** 3 registered sources (`/commands`, `/skills`, `@references`). Menu rows carry icon, title, trailing `name` alias when the label differs in case, and right-aligned description; query matches name or label by ordered case-insensitive subsequence with prefix hits first. Layering is explicit: Tab settles the highlight (drill or pick), Escape and Shift+Tab always leave without settling, and a dismissed menu **stays dismissed for the same token+query** so restoring the caret cannot resurrect it. Space/Enter arbitration polls optional `matchSpace`/`matchEnter` hooks in registration order; first non-undefined wins; a source can refuse a submission it cannot consume whole.
- **how:** `ctx.inputTriggers.registerSource({ trigger: '/'| '@', name, order, candidates, warm, onPick, openReference, header?, showGroupTitle? })`. Draft stays valid across the whole exchange: errors preserve the draft, refusals preserve attachment cards.
- **solves:** Completion popups that eat keystrokes, resurrect after dismissal, or convert a half-typed token into a sent message. The sticky-dismiss rule and the 'refuse rather than mangle' arbitration hook are the two rules worth copying verbatim.
- **port effort:** Medium. The detection/arbitration core is platform-free; rendering is React. | **idea only:** True

## dsh.72 Slot system where declaration == render authorization

- **where:** packages/client/ui-slots/ (zero-dependency registry core), packages/client/ui-renderer/ (React install), packages/client/store/. `SlotMap`/`SlotFactoryMap`/`LocaleNamespaceMap` are empty interfaces extended by `declare module`.
- **what:** 4 cardinalities (`single`/`list`/`keyed`/`chain`) × 3 scopes (`root`/`session-maybe`/`session`), plus Component Factories (a reusable assembly rendered by unrelated parents, with per-occurrence local Components). Five framework prop shares are derived from declaration merging: runtime, child-render, factory-render, store, business. A disposer collapses declared child slots **recursively** so ledger rows, contributions, and store mounts die on one lifecycle axis.
- **how:** Declaring a slot claims it: registering into an undeclared slot, re-declaring, mounting one shared store handle under two scopes, or registering a chain without `select` **throws at plugin load**. `chain` entries elect themselves via ascending-`priority` selectors; first non-null wins and becomes the component's `matched` prop.
- **solves:** Panel/extension systems normally leak: a plugin unloads but its rows stay, or two plugins fight over a region with last-writer-wins. Load-time throw + recursive collapse makes the failure loud and the teardown total.
- **port effort:** Medium-high. The type-level declaration-merging trick is what makes it safe; a TUI can use a much simpler map with the same load-time validation discipline. | **idea only:** True

## dsh.73 Dockable per-session side panel with an invertible split tree

- **where:** packages/client/ui-dockkit/ (pure engine, no UI framework, no DOM, no host concepts), packages/client/ui-sidebar-right/ (surface, tab registry, navigation), packages/client/resources/ (address → live value), packages/util/workspace-path/ (address grammar), docs/subsystems/sidebar-right.md.
- **what:** A column of panes/tabs beside the conversation. `applyOp(state, op)` returns the next state **and the operations that undo it** (inverses captured at apply time, because the pre-state is gone by undo time); `replay(initial, ops)` reproduces the tree. Tab identity is `(kind, address)`, so the same address through two types is two tabs. Routing is a ranked claim: priority band (`extension` > `builtin` > `fallback`) → longest matched glob → registration order; an address no type claims throws as a wiring bug, not a user error. Layout persists per session; a docked pane never stays empty.
- **how:** `ctx.sidebarRightTabs.register({ id, kind, patterns, priority, canOpen, title, keepMounted, guide })` + a keyed slot registration for the body. Addresses: `dsh-resource://<type>/…` (one scheme, protocol-namespaced) and `sidebar://<kind>`. Branded `PaneId`/`SplitId`/`TabId` minted only by the kit, so a pane never stands in for a tab.
- **solves:** Panels that leak, lose focus across tab switches, and cannot be undone. The captured-inverse model and the `(kind, address)` identity pair are the two ideas that generalize.
- **port effort:** Medium for the engine + registry; the React surface is not portable. | **idea only:** True

## dsh.74 Settings as a single served-namespace mirror with conditional page registration

- **where:** packages/client/ui-settings/ (base: transport, schema, slot-type contract, no UI), ui-settings-shell/ + ui-settings-general/ (the shell), 4 companion page packages riding `whileServed`, packages/settings/ (host), docs/subsystems/settings.md.
- **what:** One shared browser-side mirror of the Host settings document; **every** derived surface reads it, so any instant shows the same revision. `ctx.configForms.get(entryId)` gives accepted values + a write queue shared by every editor of that entry; snapshots carry `value`, `base`, `user`, `revision`, writable, persistence mode. `ctx.configForms.whileServed(namespaces, register)` registers a page only while the Host actually serves a namespace and **withdraws it** when it stops — so a deployment without that feature shows no trace of the page. Staged editors pin the revision read before editing; a conflict preserves the draft. An overridden field shows an "Overridden" badge plus "Reset to default"; nothing is written until Save; an empty field saves as a reset.
- **how:** `set` / `unset` = one operation; `mutate` = one atomic operation list. A refused write refreshes latest Host values. Browser validation uses the serialized Config schema; the Host validates the complete configuration including non-serializable checks.
- **solves:** Settings UIs that show stale values, silently overwrite concurrent edits, or render pages for features this deployment does not have. `whileServed` is the specific idea: feature-detect the config namespace, not the plugin.
- **port effort:** Low-medium. The mirror + revision model is platform-free; the form rendering is React. | **idea only:** True

## dsh.75 Pre-paint theme bootstrap (no flash of wrong theme)

- **where:** packages/client/ui-theme/ (src/boot-theme.ts, theme-settings.ts, styles/*.css, AppearanceRow.tsx, FontSizeRow.tsx), apps/desktop/src/preload-theme.ts, apps/web/index.html.
- **what:** light / dark / system, resolved through `prefers-color-scheme`, published as immutable `ThemeSnapshot`s; content font 12–17 px (default 14) that scales headings, base text, the user bubble and the composer draft by the same increment while small text and code stay fixed. The Host embeds the resolved palette into **each index response**; head CSS picks the document canvas color scheme before any script runs; a body script then sets `body[data-ds-dark-theme]` and `--dsh-content-font-size` **before the loading page and application scripts**. Third-party themes register alias-token overrides via `ctx.theme`, folded into the active snapshot in registration order; removing one never overwrites the durable built-in preference.
- **how:** `--dsw-*` design tokens; `ctx.theme` publishes snapshots that ui-layout applies to the document. Token stylesheets live in the package so plugins read tokens, never raw colors.
- **solves:** Theme flash on load, and a settings UI that lets a third-party theme permanently clobber the user's built-in choice. The synchronous pre-paint bootstrap is the load-bearing idea.
- **port effort:** Low for a TUI (ANSI 256/truecolor palette + one style attribute map). The pre-paint trick does not apply. | **idea only:** True

## dsh.76 Shell overlays that own input while open, and a quit gate driven by live host state

- **where:** apps/desktop/src/update-overlay.ts, mandatory-update-window.ts, quit-confirmation.ts, background-notice.ts, keyboard.ts (input state), main.ts (orchestration).
- **what:** Overlays are transparent child windows that follow the parent's bounds, visibility, and lifetime, and they hold an explicit **input-state capability** `{revision, blocked}` shared with the shortcut adapter — product shortcuts and editing-key delivery to the parent and its browser guests are blocked from creation until the last overlay closes, and every open/close invalidates pending chord state. Separately, every quit entry (⌘Q, menu, Dock, tray, caption menu, welcome/mandatory-update window close) asks the Host what it would interrupt: active tasks + armed schedule reminders. Neither → silent; either → one native box, Quit default, platform-mirrored button order, concurrent quits join the open box instead of stacking, and a Host that misses a 2 s deadline is treated as "tasks running".
- **how:** Input state is a `{revision, active, get blocked()}` counter per parent window, bumped on every overlay open/close; the shortcut adapter re-reads it before dispatch. `inspectQuit()` over private Node IPC answers with two facts, and a failed inspect is deliberately treated as the pessimistic answer.
- **solves:** Overlays that leak keystrokes to the window underneath, and a quit that silently kills running agent work. The pessimistic-on-timeout rule and the 'join, don't stack' dedup are the transferable parts.
- **port effort:** High if ported literally (Electron). Low if the idea is reduced to: a modal stack owns stdin, and quit consults a busy-check with a pessimistic timeout. | **idea only:** True

## dsh.77 Plugin Manager as a first-class user surface, separate from Settings

- **where:** packages/boot/plugin-manager/ (host, also the `plugin_manager` tool), packages/client/ui-plugin-manager/ + ui-settings-plugins/ + ui-settings-plugin-inventory/ (UI), apps/cli `dsh plugin --profile <name> add <pkg>` (pnpm passthrough).
- **what:** Users install, remove, enable/disable, and configure profile bundles from a sidebar page — the same operations the `plugin_manager` tool exposes to the agent. Every tool action requires `danger-full-access` or per-call approval; under `ask` it requests approval and leaves the session permission mode unchanged; `never`/rejection/cancellation blocks it. The Settings plugin list is deliberately **read-only** so there is one writable place. With HMR on, config changes apply immediately; without it, the running composition survives until restart. Changes affect every session using the profile.
- **how:** Plugin bundle responses carry `no-store` because per-launch revisions would otherwise accumulate in the Chromium disk cache. Desktop supplies its bundled pnpm under Electron RunAsNode so no pnpm on PATH is required.
- **solves:** 'Install a plugin' as a chat-only feature means the user cannot audit or undo it. Having the GUI be the primary and the tool a mirror of the same operations is the right split.
- **port effort:** Medium. The approval semantics and the read-only-settings split port; the pnpm/profile machinery does not. | **idea only:** True

## dsh.78 Web trust fence and a deliberate refusal of `0.0.0.0`

- **where:** packages/bundle/web-app/src/startup.ts:73-75 (refusal), :54 (--trusted-host), packages/api/gateway/src/stream-server.ts:431, apps/cli/reference/README.md:115.
- **what:** The web server refuses `--host 0.0.0.0` with a usage error that names the reason ("it would expose remote code execution to the network; use 127.0.0.1 instead") rather than a generic failure. `/api` sits behind a browser-trust fence that accepts only loopback plus explicitly named authorities added via `--trusted-host <authority...>`. Over SSH (`SSH_CONNECTION`/`SSH_TTY` non-empty) the browser handoff is suppressed and only the URL is printed, because the SSH client owns the local forwarded address.
- **how:** Plain commander validation; the fence is a gateway-level status. Refusal is a usage error (nonzero exit), distinct from a runtime failure.
- **solves:** A local agent harness that binds all interfaces by default. Naming the threat in the error is a small thing that measurably changes user behavior.
- **port effort:** Low. Few lines; the idea is the point. | **idea only:** True

## dsh.79 Tool presentation separated from tool execution

- **where:** packages/client/ui-tool/src/client/tool/toolviews/ (details-row carries 38 registrations, plus web/todo/read/read-image/file-mutation/ask-question/bash-sample rows), packages/client/ui-tool/src/client/tool/components/ToolRow.tsx, docs/tool-catalog.md, packages/core/agent-tool-presentation/.
- **what:** 65 model-facing tools across 24 packages, with rendering owned by the client via a keyed `tool.call.toolview` slot plus `tool.call.images`. The model-facing tool and its card are separate packages, so a tool can ship without a view and a view can be replaced without touching the tool. Rows render from the **recorded call and result**, so transcript replay shows the same card as the live run. Failures — including a correlated activation failure after a successful run receipt — keep the ordinary business glyph. `packages/core/agent-tool-presentation` owns the shared presentation contract.
- **how:** Keyed slot registration keyed by tool identity; the host forwards the recorded call + result, the client renders. Streaming previews and rebuilt transcripts both go through the same decode path.
- **solves:** The generic 'tool called X' row. The render-from-record rule (not render-from-live-state) is what makes replay and rebuild agree — the failure mode most tool renderers get wrong.
- **port effort:** Medium. The slot contract ports; the React rows do not. | **idea only:** True

## dsh.80 Browser-half plugin runtime for dynamically generated packages

- **where:** packages/extensions/cordis-host-runner/, cordis-client-runner/ (+ slot-catalog.ts), ui-cordis/, tool-cordis/ (`cordis_define`/`cordis_run`/`cordis_stop`/`cordis_undefine` cards).
- **what:** A host runner (`cordis-host-runner`) + browser runner (`cordis-client-runner`) split so a dynamically defined package can have a host half in the process and a browser half in the page. The browser half is plain JavaScript — no JSX, no TS, no module imports — running as an async function with a fixed name set (`React`, `console`, `styles`, `host`); browser globals like `fetch`/`setTimeout` are unavailable; it may use only the services it declared in its own `inject`; `host.call(method, args)` reaches its host half. A crash **during React render** is reported to the host with the slot, whether the crash removed the entry, and a message written for the author. A run surface (rendered by `ui-cordis` as a sidebar footer action with a running/waiting badge) can approve a pending request, optionally cover future versions, decline, or start a definition at the user's own gesture — which itself authorizes it. Loading is idempotent per revision; a page refresh starts clean by design.
- **how:** The run surface distinguishes two independent facts per row — what the host runs and what *this page* has loaded — and maps them to a shared status marker (idle / ongoing / done / warning / error). A reloaded page offers "load back into this page" before the global stop. The row carries this page's last render failure inline, in the same place as a load failure, because "never loaded" and "loaded then threw" are different bugs.
- **solves:** Agent-authored UI that has to run somewhere the user can see and revoke, without giving the agent arbitrary page JS. The two-fact row (host state vs page state) and the render-crash-with-context report are the ideas worth taking.
- **port effort:** Very high (a second plugin runtime plus a browser half). Relevant as an architectural precedent for 'everything is a plugin', not as code. | **idea only:** True

## dsh.81 Per-call sandbox policy carried on the call, with fail-closed refusal

- **where:** packages/sandbox/sandbox/src/index.ts:30-180 (seam + SANDBOX_UNAVAILABLE at :125), packages/sandbox/sandbox-policy/src/index.ts:110-181 (`resolve()` at :164), packages/sandbox/sandbox-local/src/index.ts:252-577 (LocalSandboxProvider)
- **what:** A `SandboxPolicy { mode, workspaceRoot, sessionId }` is resolved by a dedicated policy service at EVERY capability call and handed to the enforcer; the provider is forbidden from ever returning unconfined argv. `SandboxProvider.confine()` either resolves enforcing argv or rejects with `SandboxUnavailableError` / code `SANDBOX_UNAVAILABLE` — silent passthrough is documented as forbidden in the abstract class contract.
- **how:** `ctx.sandboxPolicy.resolve({session})` = `approvedMode ?? lastSandboxModeEvent(session) ?? deploymentDefault`, root = `session.header.cwd ?? configuredRoot`; `LocalSandboxProvider.confine()` picks a runner per platform and returns `{argv, enforcement, denialSignatures, runnerFailureRules}`. Fail-closed at `selectRunner()` -> `throw new SandboxUnavailableError(mode)` when no rung passes.
- **solves:** Prevents "sandbox silently not applied" — the most common agent-harness security bug. Also makes the policy resolution auditable from one seam instead of per-tool.
- **port effort:** High — needs a policy service, a per-call policy carrier on every execution signature, and an abstract provider with a hard no-passthrough contract. The vocabulary (three modes, `enforcement: full|partial`) is small; the plumbing is not. | **idea only:** False

## dsh.82 Functional runner probes with per-backend enforcement completeness

- **where:** packages/sandbox/sandbox-local/src/index.ts:69-113 (probes), :160-189 (PLATFORM_CHAINS + STATIC_ENFORCEMENT), :497-545 (chainVerdict/probeRunner); packages/sandbox/sandbox/src/diagnostics.ts:65-100
- **what:** Platform chain `linux:[bwrap,landlock] darwin:[seatbelt] win32:[windows-acl]`. A sole candidate is selected without probing; multiple candidates are arbitrated by ACTUALLY RUNNING the real profile around `true`/`cmd /c exit 0`. Every wrap carries `enforcement: 'full'|'partial'`, the backend's own `denialSignatures` (never a cross-backend union), and structured `runnerFailureRules`.
- **how:** `chainVerdict()` walks PLATFORM_CHAINS in order; `probeRunner` returns `SandboxEnforcement | 'unusable'`; verdict cached for the provider lifetime. windows-acl is hard-coded `partial` (NTFS hard-link aliasing, unconfined reads, AppContainer ACLs).
- **solves:** A configured runner that exists on PATH but cannot enforce is the classic silent-failure. Probing turns it into a hard `SANDBOX_UNAVAILABLE`. The `full|partial` return also lets a strict consumer reject a weaker boundary.
- **port effort:** High — probing is cheap to add once you have per-backend profile builders, but the `enforcement`/`denialSignatures`/`runnerFailureRules` triple must be threaded through every consumer. | **idea only:** False

## dsh.83 Strictly-wider escalation ladder resolved BEFORE execution

- **where:** packages/sandbox/sandbox/src/escalation.ts:28-208 (whole file); consumers: packages/shell/tool-bash/src/index.ts:224-253, packages/fs/tool-fs/src/sandbox.ts:45-110
- **what:** Closed `WIDER_MODES` table checked at execution time (never baked into the tool schema, because the schema enum is registry-global while the effective mode is per-call truth). `sandbox_permissions`+`justification` must travel together with a non-empty justification. Repeating the effective mode needs no approval; anything narrower/unsupported throws.
- **how:** `approveEscalation(request, approval)` returns early when `requestedMode === effectiveMode`, throws on a non-wider target, then calls `approval.approver.request(...)`. `EscalationApprover`/`EscalationOutcome` are declared STRUCTURALLY in this package so it never imports the approval or agent packages — the tool layer closes over `ctx.approval.request`.
- **solves:** A denial with no recovery path is terminal, which pressures operators into globally disabling the sandbox. One-shot widening gives the model a sanctioned retry without a persistent privilege.
- **port effort:** Medium — the ladder + validation are ~50 lines; the value is the structural decoupling (a channel interface, not a service import) plus ONE shared vocabulary for bash and fs so the two families cannot drift. | **idea only:** False

## dsh.84 Approval seam that fails closed on every bad answerer

- **where:** packages/interaction/user-approval/src/index.ts:55-308; waterfall event declared at packages/interaction/user-approval/src/types.ts:82-92
- **what:** Closed 4-outcome union `allowed-once | rejected | cancelled | unavailable`. A missing, throwing, non-owning, or non-conforming answerer all resolve `unavailable`, and callers deny. The `never` policy is evaluated INSIDE `decide()` before dispatch, with a comment explaining exactly why (a `prepend:true` listener registered after mount would otherwise sit ahead of a gate LISTENER and break the promise).
- **how:** `ctx.waterfall(scopeTarget(agent,agent), 'approval/request', req, () => Promise.resolve('unavailable'))`, entered as `Promise.resolve().then(() => ...)` so a SYNCHRONOUS throw from an answerer lands in the same rejection path; `.then(outcome => OUTCOMES.includes(outcome) ? outcome : 'unavailable', () => 'unavailable')`.
- **solves:** An approval channel is the highest-value gate in the system; every plausible failure mode (missing UI, crashed answerer, buggy answerer returning garbage) must deny, not open.
- **port effort:** Low — ~150 lines, no dependencies, and the two non-obvious parts (evaluate `never` before dispatch; enter the promise chain before calling) are cheap to port and high-value. | **idea only:** True

## dsh.85 Turn-enclosed durable audit pair for every approval

- **where:** packages/interaction/user-approval/src/index.ts:77-105 (hasOpenTurn, setApprovalPolicy), :215-234 (request)
- **what:** `approval/asked` + `approval/decided` (paired by a fresh `randomUUID`) are appended to the session log exactly once per ask, and `request()` REFUSES (throws) unless a `turn/start` is still open, because the turn is the durable log's commit/replay boundary — a bare event between turns is indistinguishable from a crash tail and gets dropped on reload.
- **how:** `hasOpenTurn(session)` walks `session.eventAt(seq)` backwards to the nearest `turn/start`/`turn/end`; `request()` throws before appending anything if no turn is open.
- **solves:** Audit records that can be silently lost on reload are worse than none — you think you have a record and you do not.
- **port effort:** Medium — cheap to copy the shape, but it only works if your event log has an explicit commit boundary. Without one the invariant is unimplementable. | **idea only:** False

## dsh.86 Monotonic tool guard layered after the extensible pre-execute waterfall

- **where:** packages/core/tools/src/index.ts:153 (event), :607-613 (PreToolDecision), :724-735 (ToolGuard), :766 (guardReason), :1127 & :1484-1507
- **what:** A second guard layer (`ToolGuard`) runs AFTER every `tools/pre-execute` listener and has no allow result — it can only return a denial reason. Registration order therefore cannot turn a denial back into permission.
- **how:** `ToolLayer.guards: AnonymousEntries<ToolGuard>`; `guardReason(exec)` returns the FIRST non-undefined reason; the scheduler runs the `pre-execute` waterfall then the guard chain.
- **solves:** In a waterfall, whichever listener is registered first effectively decides. This makes a hard denial order-independent.
- **port effort:** Low — small, self-contained, and one of the highest-leverage permission primitives in the repo. | **idea only:** True

## dsh.87 Two independent knobs (sandbox mode x approval policy) bundled into user-facing presets

- **where:** packages/interaction/permission-presets/src/index.ts:79-82 (sentinels), :182-199 (schema+defaults), :219-226 (misconfiguration guards), :343-361 (derive), :428-456 (pinInitialPermission); shipped table in packages/bundle/base/cordis.patch.yml:250-262
- **what:** One product-facing select writes BOTH knobs through their canonical setters; a `permission/preset` event preserves user intent when two bundles are identical; unmatched values fold to a reserved `custom` sentinel that is never a switch target. The service FAILS LOUD at construction if composed over a non-confining executor (`ctx.shell.sandboxMode === undefined`).
- **how:** A `sessionProjections.register({key:'permissions', stateVersion:2, stateSchema, init, apply, wire})` folds `permission/preset`/`sandbox/mode`/`approval/policy`/`session/end-seed`; `apply()` records the preset then writes only the knobs that actually changed. `/permission` is the single write path for a web client.
- **solves:** Two coupled knobs are unusably fine-grained for an end user and un-trackable for replay; one preset with a durable identity keeps both.
- **port effort:** Medium — the projection registry it depends on is the real prerequisite. | **idea only:** False

## dsh.88 Bootstrap-environment denylist for discovered .env files

- **where:** packages/boot/app-boot/src/index.ts:132-250
- **what:** A `.env` file that arrives with a clone cannot set 49 exact names and 4 prefixes (PATH, HOME, NODE_OPTIONS, NODE_PATH, LD_PRELOAD, LD_LIBRARY_PATH, BASH_ENV, ENV, PYTHONPATH, RUBYOPT, GIT_SSH, GIT_SSH_COMMAND, GIT_ASKPASS, SSH_ASKPASS, NODE_TLS_REJECT_UNAUTHORIZED, SSL_CERT_FILE/DIR, HTTP(S)_PROXY/ALL_PROXY/NO_PROXY, DEEPSEEK_BASE_URL, ...; prefixes `DSH_ XDG_ DYLD_ BASH_FUNC_`). Violation THROWS and refuses the whole file. Only proxy vars are exempted, and only from the harness-home file.
- **how:** `readEnvLayer()` parses the file, validates every name against `isBootstrapOnly()`, and throws with a per-name remedy message before any value is materialized. `loadLayeredEnv` parses BOTH files before applying either ("a rejection must not leave one file applied").
- **solves:** Kills the standard agent-harness supply-chain attack: running the CLI inside an untrusted repo whose `.env` sets `LD_PRELOAD`/`NODE_OPTIONS`/`BASH_ENV` to hijack the agent, or redirects `DEEPSEEK_BASE_URL`/proxy/CA to an attacker's endpoint.
- **port effort:** Low — one Set, one prefix list, one throw. The only cost is knowing the list, and the list is the value. | **idea only:** True

## dsh.89 Owner-only secret storage with cross-process writer locks and no fsync claim

- **where:** packages/util/atomic-write/src/index.ts:24-268; used at mode 0o600/dirMode 0o700 at packages/credentials/credentials-local/src/index.ts:691,712,764,834
- **what:** `writeFileAtomic` writes a random-suffix sibling with `flag:'wx'` (refuses to follow a symlink planted at the temp path) and the caller's `mode`, then renames; replacing a wider-permission file NARROWS it with no chmod race. `withFileLock` serializes writers via a `<file>.lock` sibling holding `<pid>\n`; takeover requires ESRCH on that PID plus a sha256-named claim file; PID reuse is deliberately NOT treated as death.
- **how:** `writeFile(temp, content, {mode, flag:'wx'})` -> `renameAtomicTemp` (8 retries, 20->200ms backoff on Windows EACCES/EBUSY/EPERM) -> on failure `rm(temp)` + rethrow. `holderExited()` rejects pid 0, non-int32, self, and any record not matching `/^\d+\n$/`.
- **solves:** Read-modify-write on a shared credentials file can resurrect another writer's state; symlink planting at a predictable temp path is a classic local privilege attack; Windows rename transients otherwise throw as unhandled rejections.
- **port effort:** Low — ~200 lines, zero dependencies, directly liftable. Note the explicit `TODO(settings-atomic-durability)`: fsync is out of scope, so a crash can lose the last write. | **idea only:** False

## dsh.90 Schema-declared secret redaction with a write-only-slot sidecar

- **where:** packages/settings/settings/src/redact.ts:47-116; enforcement at packages/settings/settings/src/index.ts:323-330 and packages/api/settings-controller/src/index.ts:103,206
- **what:** Any schemastery field marked `role('secret')` is structurally removed before a value crosses a wire boundary, and a sidecar records EVERY reachable secret position plus whether it currently holds a value — including unset object properties, so a settings form can render a write-only input without ever receiving the secret.
- **how:** `walk()` recurses through object/dict/array/union/intersect/transform nodes; every union branch is visited and ANY branch declaring a field secret removes it (conservative). The position list is deduped by JSON-stringified path with `set` OR-ed across branches.
- **solves:** Secret leakage through settings/describe responses — the most common accidental API leak in agent harnesses.
- **port effort:** Low, provided the settings schema uses one validation library and exposes live nodes (schemastery does). | **idea only:** True

## dsh.91 Layered credential precedence where the environment is explicitly read-only

- **where:** packages/credentials/credentials-local/src/index.ts:1-80 (precedence contract), :676-840 (write paths)
- **what:** `inherited process env (read-only, wins) > $DSH_HOME/.credentials.yaml (managed, writable) > <cwd>/.env > $DSH_HOME/.env`. Every write re-reads the document under a cross-process writer lock and patches only its own key, so comments and untouched entries survive; a chokidar watcher hot-publishes external edits and each reload replaces the snapshot wholesale so a deleted entry never lingers. The managed document is never materialized into the process environment.
- **how:** `withFileLock(filename, async () => { re-parse; patch own key; writeFileAtomic(..., {mode:0o600, dirMode:0o700}) })`. The YAML `Document` AST is edited in place, not re-serialized.
- **solves:** An env layer that can be silently shadowed by a managed store makes non-secret entries unreachable; a managed store that also served as the env layer could not be trusted not to leak.
- **port effort:** Medium — the precedence reasoning is the reusable part; the YAML-AST-preserving write needs a structured parser. | **idea only:** False

## dsh.92 Signed authority-bound browser session cookie + Host/Origin rebinding fence

- **where:** packages/client/connection/src/browser-auth.ts:100-311; packages/client/connection/src/api-request-trust.ts:49-118
- **what:** Two independent fences on every `/api` request. (1) HMAC-SHA256 signed cookie (`v1.<b64url(json)>.<b64url(sig)>`), both comparisons via `timingSafeEqual` with a byteLength pre-check, bound to the request authority and capped at the configured max age. (2) `isTrustedApiRequest` applies the Host fence to EVERY request with no browser-marker shortcut, refuses `sec-fetch-site: cross-site` unconditionally, requires Origin == Host exactly, refuses literal `"null"`, and restricts non-loopback hosts to a declared `trustedHosts` list whose entries must survive WHATWG canonicalization.
- **how:** The launch token (32 random bytes, per process) is exchanged for the cookie on a GET of `/` and redirected 303 to `./` with `cache-control: no-store; referrer-policy: no-referrer`. `assertTrustedAuthority` load-fails on `0x7f.0.0.1`, percent-encoding, unbracketed IPv6, `user@host`, and zero-padded ports.
- **solves:** DNS rebinding (a rebound page carries the attacker's domain in Host) and cross-site request forgery against a loopback API. `trustedHosts` canonicalization prevents a typo'd entry from silently broadening or narrowing a grant.
- **port effort:** Medium — ~250 lines total, no deps. Note the cookie has NO `Secure` flag (the carrier is plain-HTTP loopback); binding to a non-loopback interface would need it. | **idea only:** False

## dsh.93 Kernel-level session write lease (flock / named semaphore), never an expiring lock

- **where:** packages/session/session-persistence-jsonl/src/lease.ts:1-135; mkdir mode 0o700 at :74
- **what:** Cross-process write ownership for one session's artifact directory is arbitrated by the KERNEL: non-blocking `flock(2)` on POSIX, a named kernel semaphore on Windows — never a file lock or handle, so readers, searches, and directory removal proceed freely. Deliberately no expiry: "there is deliberately no expiry that could expropriate a stalled writer whose resumed appends would tear the log."
- **how:** `tryLockExclusive()` from `@deepseek-ai/node-addon-system/flock` (native addon, verified present in this repo as `native/system/packages/entry/src/flock.c`); contention (EAGAIN/EWOULDBLOCK) maps to `SessionAlreadyOwnedError`. Because a POSIX lock names an inode, not a path, the holder re-verifies after locking that the locked inode is still the file at the lock path, and retries otherwise.
- **solves:** Torn session logs from two writers, and the classic "my lock timed out and corrupted the file" class of bug.
- **port effort:** High — depends on a native flock binding per platform. The reasoning (kernel arbiter, no expiry, inode re-verification) ports; the addon does not. | **idea only:** True

## dsh.94 Semantic durability checkpoints (fail-closed) at model and tool boundaries

- **where:** packages/session/session-checkpoint-policy/src/index.ts:1-90
- **what:** Downstream model streaming is delayed until the complete logged request prefix is durable; top-level tool dispatch checkpoints its recorded call before the body; the next request boundary checkpoints the response/result batch. A checkpoint failure prevents adapter dispatch and prevents the tool body.
- **how:** `afterCheckpoint()` is an async generator that `await ctx.sessions.flush(session)` before `yield* next()`; nested tool dispatches reuse the durable outer call.
- **solves:** A crash between "we told the model this" and "we wrote this" loses or reorders history.
- **port effort:** Medium — requires a session log with an explicit flush boundary and idempotent replay. | **idea only:** False

## dsh.95 Bounded background jobs with per-owner admission and archive-time kill

- **where:** packages/jobs/jobs-local/src/index.ts:30-60 (defaults), :199-232 (admission), :186-189 (teardown effect); packages/jobs/jobs-local/src/ring.ts:1-113; packages/jobs/jobs/src/archive-admission.ts:1-48
- **what:** Defaults: 10 concurrent jobs per exact owner, 256 KiB live ring retention per job, 16 KiB retained after settlement, 150ms pull pump. Offsets stay absolute across head eviction so a reader can always tell it lost data (`lossy`). `workspace/session-stop` kills every running/stopping job the archived Session owns.
- **how:** `activeJobCount(owner) >= maxConcurrentJobsPerOwner` throws a model-facing `use job_kill to stop an unneeded job, wait for it to finish, then retry`. `OutputRing` trims the head to `cap` while `earliest` only advances; `utf8Tail` advances past UTF-8 continuation bytes so a surviving tail never starts inside a code point.
- **solves:** Unbounded background process/memory growth, and orphaned jobs outliving the session that started them.
- **port effort:** Medium — the ring + admission are easy; the ownership/archive integration is the part worth copying. | **idea only:** False

## dsh.96 Foreground-timeout promotion instead of kill

- **where:** packages/shell/tool-bash/src/index.ts:34-56 (Config), :206-212 (promote derivation), :508-527 (execute)
- **what:** With a job registry composed, a foreground command that hits its timeout is promoted to a background job (returning the job id) instead of being killed; a job the registry refuses at admission falls back to the executor deadline kill, and the refusal is logged. Without a registry the tool is foreground-only.
- **how:** `promoteOnTimeout` default true ANDed with `enableRunInBackground`; `ctx.shell.resolve({...request, onExpiry:'none'})` then `startJob(...)` inside try/catch, falling through to `ctx.shell.execute(...)` on throw.
- **solves:** Losing a long-running build/test to a tool timeout.
- **port effort:** Low — a policy flag plus a try/catch fallback. | **idea only:** True

## dsh.97 Cooperative, scoped timeout with signal swap-and-restore

- **where:** packages/guard/timeout-policy/src/index.ts:1-81
- **what:** Reads `timeoutMs` off the dispatched tool definition (so a mistyped name is impossible and undeclared tools delegate untouched), arms a deadline, swaps the derived signal onto `exec` for dispatch, restores the caller's signal in `finally`, and replaces the result ONLY when its own timer fired — scoped by code so a nested outer deadline is not misread as its own.
- **how:** `deadline(exec.signal, timeoutMs, TOOL_TIMEOUT)`; `timeoutOf(d.signal, TOOL_TIMEOUT) !== undefined` decides replacement; the result carries `error.info = {name:'ToolTimeoutError', code:'TOOL_TIMEOUT'}` so a retry/sandbox plugin can route on it.
- **solves:** Nested timeout wrappers misattributing each other's deadline, and post-execute listeners seeing an already-aborted signal they did not own.
- **port effort:** Low — the code-scoping trick and the signal restore are the reusable ideas. It CANNOT hard-stop a tool that ignores cancellation; that limit is documented. | **idea only:** True

## dsh.98 Subprocess runner-failure vs denial classification (outranks correctly)

- **where:** packages/sandbox/sandbox/src/diagnostics.ts:65-100; rules at packages/sandbox/sandbox-local/src/index.ts:233-242; consumption at packages/shell/bash-sandbox/src/index.ts:115-176
- **what:** Runner failure OUTRANKS denial ("the command did not run"): a rule must match a fatal stderr signature after informational lines are excluded AND satisfy its exit-code gate. bwrap and seatbelt are signature-only; landlock is gated on exit 125; windows-acl is gated on exit 127 precisely so a confined command that merely PRINTS `windows-acl-run: ` is not misclassified.
- **how:** `isRunnerSpawnFailure()` additionally requires `error.path === runnerProgram` (or absent path with `syscall === 'spawn <runner>'`) AND an independently-usable workdir — the workdir is checked at classification time, not atomically with spawn, and the code says so.
- **solves:** Without this, a broken sandbox is indistinguishable from a policy denial, and the model retries a command that never ran.
- **port effort:** Medium — the classification module is small; the per-backend signature tables are the maintenance cost. The README honestly documents that a child mimicking its runner can still cause false attribution (it cannot bypass confinement). | **idea only:** False

## dsh.99 Fresh-canonicalize-then-delegate fs fence (TOCTOU-narrowed, honest about its limits)

- **where:** packages/fs/fs-sandbox/src/index.ts:122-144; packages/fs/fs-sandbox/src/containment.ts:19-76
- **what:** `read-only` throws `FS_SANDBOX_DENIED` on the very first branch; `workspace-write` RE-RESOLVES the path immediately before the mutation and returns the FRESH target, so the identity that was checked is the identity that is written. Alias-equivalent roots (Windows 8.3, casing) are handled by walking existing ancestors and comparing `dev`+`ino`, not by string prefix.
- **how:** `resolve()` realpaths the deepest existing ancestor (so a swapped symlink ancestor is reflected); `isPathUnder(fresh.targetKey, root)` per writable root from the SHARED `writableRoots(policy)` helper the Seatbelt profile also uses, so the two cannot drift.
- **solves:** Check-here-write-there TOCTOU, and Windows alias escapes that a lexical prefix check misses.
- **port effort:** Medium. The header is explicit that this is "containment, not a security boundary" with an accepted residual TOCTOU — kernel-grade isolation of untrusted CODE stays the shell executor's job. | **idea only:** False

## dsh.100 Hook protocol: hooks never fail a turn, but PreToolUse can still deny

- **where:** packages/hooks/hook-protocol/src/runner.ts:1-106; packages/hooks/hooks-claude-code/src/index.ts:244-285; packages/hooks/hook-protocol/src/types.ts:112-119
- **what:** Hooks run through `ctx.shell` with the credential scrub, process-group cancellation and timeout machinery; a hook that cannot run becomes a non-blocking error (no exit code, message on stderr, turn proceeds). PreToolUse `permissionDecision: 'deny'` maps to a real `tools/pre-execute` `{kind:'deny'}`.
- **how:** `DEFAULT_HOOK_TIMEOUT_MS = 600_000` (both Claude Code and Codex default). A `hookSpecificOutput` block whose `hookEventName` names a DIFFERENT event is treated as malformed and its event-scoped fields are discarded.
- **solves:** Adopting Claude Code / Codex hook configs without letting a misbehaving third-party hook wedge the agent — while preserving the one decision that actually matters (deny).
- **port effort:** Medium — the codec is the bulk; the non-blocking-failure rule and the cross-event-name guard are the reusable ideas. | **idea only:** True

## dsh.101 Delegated-child permission pinning

- **where:** packages/subagent/subagent/src/child-agent.ts:225-278 (capture at :247, append at :259), :147 (cwd inheritance)
- **what:** A delegated subagent is pinned to `approvalPolicy: 'never'` whenever the approval capability exists, and captures ONLY the parent's explicit `sandbox/mode` override — never deployment defaults, never one-shot grants. Overrides are appended as `source:'delegation'` events inside the unpublished creation window so the child's effective policy is reconstructable from its log alone, and fresh policy lands after any fork seed.
- **how:** `captureDelegatedPolicyOverrides(parent)` is called synchronously before the child start's first await, "a later parent switch belongs to the parent's future, not to this child".
- **solves:** A subagent escalating past its parent's grant, or inheriting a parent's one-shot approval and reusing it.
- **port effort:** Low, given a session log that can carry `source`-tagged policy events. | **idea only:** True

## dsh.102 Telemetry that is off by default and ships its own redaction waterfall

- **where:** packages/session/session-telemetry/src/index.ts:14-45; packages/session/session-telemetry/src/coordinator.ts:179-230; packages/session/session-telemetry-otel/src/index.ts
- **what:** `session-telemetry/record` is an extension point that ships NO rules of its own — with no listener mounted, records reach the backend exactly as captured, so exported data is as clean as the rules a deployment mounts. A throwing listener withholds that ONE record (fail-closed) and never reaches the agent loop. Redaction applies to the exported COPY only; the canonical session log is never rewritten.
- **how:** The shipped mode is `FEEDBACK_ONLY` ("OTel releases a Session-log prefix only after explicit user feedback"); `DSH_TELEMETRY_DISABLED` non-empty opts out even with value '0'; the anonymous id is a random UUID in `$DSH_HOME/.anonymous-user-id`, never derived from hostname/network/git remote, deletable to reset.
- **solves:** Sessions contain prompts, tool output and file contents — accidental full-log upload is the default failure of session telemetry.
- **port effort:** Low. Weak spot: shipping zero rules means a deployment that forgets to mount one exports raw records. | **idea only:** False

## dsh.103 pnpm install-script build approval with a stale-check

- **where:** packages/boot/plugin-manager/src/build-approval.ts:1-50; apps/cli/src/plugin.ts:82
- **what:** Pending install/build scripts are read from `allowBuilds` where the value is literally the string `set this to true or false`; `approveBuilds` throws `stale-approval` if any name is no longer pending, refuses YAML anchors/aliases inside `allowBuilds`, and persists with `writeFileAtomic(..., {mode:0o600})` without running anything.
- **how:** `pnpm-workspace.yaml` is edited via the YAML `Document` AST; the profile manifest lock is held by the caller. The CLI surfaces pnpm's exact key in an error telling the user where to add it.
- **solves:** A TOCTOU where a stale UI approval silently authorizes a package that is no longer the one pending.
- **port effort:** Low. | **idea only:** True

## dsh.104 Process-tree quiescence before touching a locked profile

- **where:** packages/boot/plugin-manager/src/run-tree.ts:1-77
- **what:** After terminating a pnpm run, the caller polls the whole process GROUP every 15ms up to 5s before it restores and unlocks the profile — "so the caller restores and unlocks the profile only after the scripts it started stopped writing".
- **how:** `leadsOwnGroup()` — a run that captures output is spawned as its own POSIX group leader (tree terminated as a unit); one that inherits the caller's descriptors keeps the caller's group so an interrupt still reaches it.
- **solves:** A killed install whose orphaned grandchildren still write into a profile you just unlocked.
- **port effort:** Low. | **idea only:** True

## dsh.105 Startup diagnostics written owner-only, with a self-warning header

- **where:** apps/cli/src/startup-diagnostics.ts:1-70
- **what:** A failed boot writes a full `inspect(...)` dump to `$DSH_HOME/logs/startup-<ts>-<uuid>.log` with `mkdir(mode 0o700)` + `writeFile(flag:'wx', mode:0o600)`. The report itself begins "WARNING: Raw diagnostics may contain configuration or credential values from plugin errors." If the save fails, the FULL report is printed to stderr rather than a claimed path.
- **how:** `inspect` with `depth:null, maxArrayLength:null, maxStringLength:null, showHidden:true, customInspect:false, getters:false, colors:false`.
- **solves:** Unbounded default `inspect` truncation destroying exactly the deep config error you need — and a silently swallowed write making a boot failure undiagnosable.
- **port effort:** Low. | **idea only:** True

## dsh.106 Total error-normalization fallback

- **where:** packages/core/tools/src/index.ts:625-640
- **what:** `errorMessage()` wraps `instanceof`, property access, AND string coercion in try/catch and returns `'<unprintable thrown value>'`. A hostile thrown value can trap a getter; normalization is the outermost safety boundary, so its own fallback must be total.
- **how:** Also `errorInfo()` is try/caught, and `materializePresentation()` deep-freezes a detached snapshot or rejects lossy data.
- **solves:** A malformed thrown object crashing the process from inside a catch block.
- **port effort:** Trivial — a few lines. | **idea only:** True

## dsh.107 TLS-PSK authentication for forwarded SSH streams

- **where:** packages/ssh/ssh/src/stream-security.ts:1-47
- **what:** Forwarded sockets are authenticated with certificate-free TLS-PSK (`PSK-AES256-GCM-SHA384`, TLSv1.2 pinned as both min and max, `rejectUnauthorized:true`), using a per-stream 256-bit capability key; `disableRenegotiation()` on connect, with an explicit auth timeout. The key is never transmitted as data.
- **how:** `pskCallback: () => ({psk: Buffer.from(capability,'hex'), identity:'dsh-stream'})`; `checkServerIdentity: () => undefined` because PSK proves peer identity without X.509.
- **solves:** A remote pathname replaced by an attacker on the SSH host would otherwise receive the forwarded stream unauthenticated.
- **port effort:** Medium — the PSK handshake is small; key derivation/distribution across the SSH boundary is the real work. | **idea only:** False

## dsh.108 Bounded, offset-honest output retention with spill

- **where:** packages/util/output-retention/src/index.ts:1-260; packages/jobs/jobs-local/src/ring.ts; packages/spill/spill-policy/src/{index,retention}.ts
- **what:** A shared retention library bounds model-facing tool output by BYTES (not chars/lines), supports head/tail/both strategies, and reports `omittedBytes` so the model knows how much was dropped. Jobs back this with a bounded ring (256 KiB live / 16 KiB settled) plus a host spill file for the complete stream.
- **how:** `utf8Tail()` advances past continuation bytes so a truncated tail never starts mid-codepoint; `JobSourceRead.lossy` tells the model its cursor slid out of the retained window.
- **solves:** Silent output truncation (the model reasons about output it cannot see) and unbounded memory/disk from a chatty command.
- **port effort:** Medium — the byte-counting correctness is the reusable part. | **idea only:** False

## dsh.109 Config resolution with lazy `!!js` expressions and volatile-value tracking

- **where:** vendor/README.md entries 15, 18, 22 (the local-patch ledger); packages/boot/config-editor/src/index.ts; packages/settings/settings/src/index.ts:323-330
- **what:** Config is layered: empty profile root + each bundle's `cordis.patch.yml` + the profile's + home-level patch lists + `--patch` overlays, all as SIBLING patch lists at one include level (patches never cross an include boundary). `!!js` expressions evaluate against the loader context at every mount decision, and `disabled` is interpolated. Volatile fields (references, e.g. `{}` service instances) are tracked separately so a volatile-only change does not remount the plugin.
- **how:** `Entry.update` compares raw options strictly; for a config-only change on an active fiber it calls `equalExceptVolatile`, which narrows the Standard Schema to schemastery's `Schema` and recursively skips volatile paths using schema metadata without executing config hooks.
- **solves:** Makes "which config actually won" a first-class, inspectable artifact rather than emergent behaviour — which is also what makes the `.env` denylist enforceable.
- **port effort:** High — this is vendored-framework surgery, not application code. Port the DISCIPLINE (single declarative composition, patches as a separate layer, `--dump-config`), not the mechanism. | **idea only:** True

