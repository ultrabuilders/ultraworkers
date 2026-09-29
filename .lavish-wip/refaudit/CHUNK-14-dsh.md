# dsh — chunk 1/5 (22 năng lực)

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
