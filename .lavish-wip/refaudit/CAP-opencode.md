# Năng lực đo được — `opencode` — 118 mục

opencode — MIT. M6 says its layout decision drives M3.

Nguồn: 6 lens (structure, agent-core, plugin, surface, integration, ops); mọi con số đo bằng lệnh thật.
`idea only=true` = KHÔNG được chép code, chỉ mang ý tưởng.
`port effort` là ước lượng của người kiểm kê, KHÔNG phải số đo.

## opencode.1 Layered dependency spine enforced three ways (doc + manifest + import-graph)

- **where:** AGENTS.md:2 ; packages/{schema,protocol,client,core,server,cli,sdk}/package.json ; verified: `rg 'from "@opencode/(client|protocol)' packages/core/src` returns 0
- **what:** schema -> protocol -> server; core parallel to protocol; client GENERATED from protocol; sdk composes client+core+server; cli is the only binary. The rule is stated in root AGENTS.md line 2, encoded in every package.json's dependency set, and independently verified in source.
- **how:** schema/src has 68 flat domain modules (no runtime, browser-safe). protocol/src/api.ts declares `Api<LocationId, LocationService, FormLocationId, ..., Event>` as a pure HttpApi type. server/src/handlers.ts binds services. client/src/{promise,effect}/generated are emitted, never hand-edited.
- **solves:** Stops the classic agent-HTTP-bridge rot where the CLI, the TUI, and the SDK each grow their own ad-hoc transport. The layer that owns a concern owns its type; consumers never re-declare it.
- **port effort:** MEDIUM — the *idea* (a generated-client spine with a type-only boundary between domain and transport) ports directly; the Effect `HttpApi` generics do not, since omp has no Effect. omp would substitute a hand-written contract module plus a generator over its own AST. | **idea only:** True

## opencode.2 Path-addressed packages instead of barrels

- **where:** packages/core/package.json, packages/protocol/package.json, packages/ai/package.json, packages/server/package.json, packages/util/package.json
- **what:** `"exports": {"./*": "./src/*.ts"}` — a package is addressed by module path, so `@opencode/core/session/runner/step` is a first-class import with no barrel file to grow unboundedly.
- **how:** Consumers deep-import the exact module. Root AGENTS.md bans star imports anyway (`no-star-import` ast-grep rule), so a barrel would be a lie.
- **solves:** Barrel files become accidental public API and create import cycles. Path-addressing makes the dependency graph the filesystem, and makes deep imports the norm rather than a smell.
- **port effort:** LOW — omp already uses `@oh-my-pi/pi-catalog/<module>` subpath imports; this is the same idea, formalized in the manifest. | **idea only:** True

## opencode.3 Per-runtime module resolution via an imports condition map

- **where:** packages/core/package.json `imports` block ; implementations at packages/core/src/database/sqlite.{bun,node,workerd}.ts, src/pty/pty.*.ts, src/filesystem/fff.*.ts, src/image/photon-wasm.*.ts, src/shell/parser-wasm.*.ts
- **what:** 8 virtual specifiers (#sqlite, #pty, #persistent-pty-binary, #fff, #photon-wasm, #shell-parser-wasm, #process-lock-ffi, #v1-migration), each with workerd / bun / node / default targets. One codebase compiles for Cloudflare Workers, Bun, and Node.
- **how:** Bun/Node resolve the `bun`/`node` condition; workerd resolves `workerd`; an unmatched runtime falls through to an explicit `default` (note: #pty and #fff default to **bun**, sqlite defaults to **node** — the fallbacks are not uniform and are chosen per-specifier).
- **solves:** Portable native bindings without a build-time abstraction layer, and without `import()` runtime branching scattered through call sites.
- **port effort:** LOW to MEDIUM — the pattern is plain package.json `imports`; omp can adopt it for its Rust `.node` FFI vs WASM vs native split, which has exactly this shape. | **idea only:** True

## opencode.4 One HttpApi compiled into two independent clients with a drift gate

- **where:** packages/httpapi-codegen/src/index.ts ; packages/client/script/build.ts ; packages/client/package.json scripts.check:generated
- **what:** `httpapi-codegen` (94 KB, single file, private package) turns one `ClientApi` into a Promise-flavored client AND an Effect-flavored client. `check:generated` runs the generator then `git diff --exit-code` so stale generated code fails CI.
- **how:** `compile(ClientApi, {groupNames, omitEndpoints})` is called twice with different `omitEndpoints` sets, then `Effect.all([write(emitPromise(...)), write(emitEffectImported(...)), write(emitEffectShape(...))], {concurrency:3})`. Root AGENTS.md line 1 forbids hand-editing generated client files.
- **solves:** Client/contract drift is invisible in a hand-written client and catastrophic in a 136-operation API. The diff gate makes drift a build failure, not a runtime 404.
- **port effort:** MEDIUM — the diff-gate idea is free and should be copied verbatim regardless of generator. The generator itself depends on Effect's HttpApi reflection, which omp does not have. | **idea only:** True

## opencode.5 Durable-event session: admission separated from execution

- **where:** specs/v2/session.md:5-23 ; packages/core/src/session/inbox.ts(18KB) ; packages/core/src/session/projector.ts(29KB) ; packages/core/src/database/migration/ (48 TS migrations) ; root AGENTS.md:181
- **what:** Prompt admission publishes durable `session.inbox.enqueued` whose projection inserts one `session_inbox` row; delivery publishes `session.inbox.delivered`, whose projection consumes the row and inserts the visible message in the same transaction. Execution is woken separately and only advisory.
- **how:** Delivery modes are explicit: `steer` (default) delivers at the next Safe Step Boundary; `queue` stays pending while the session can continue. Reusing an item ID is idempotent when Session+type match (first admission wins, retry payload/metadata/delivery ignored); cross-Session or cross-type reuse fails. Manual compaction and session movement ride the SAME inbox as control items, each with its own identity and delivery mode, and each forms a delivery boundary.
- **solves:** A user who types while the model is mid-turn should not have their input silently dropped, reordered, or double-inserted — and a crash between "accepted" and "delivered" must be recoverable without either losing or duplicating the message.
- **port effort:** MEDIUM to HIGH as a design, but the *vocabulary* (admission vs delivery, steer vs queue, control items as boundaries) is the valuable part and is mechanism-independent. | **idea only:** True

## opencode.6 Step / Physical-Attempt split with a bounded retry budget

- **where:** specs/v2/session.md:70-88 ; packages/core/src/session/runner/{step,retry,llm,publish-llm-event}.ts ; root AGENTS.md:185,189
- **what:** "One step is one logical LLM call; its durable record covers only the model-visible span." Most steps make one Physical Attempt; retries do not consume another agent-step allowance. Generic retries retain the logical step number and assistant message ID.
- **how:** Budget: initial request + at most 4 retries with jittered exponential backoff. An incomplete stream AFTER durable output preserves the partial assistant, adds a synthetic continuation instruction, and continues under a NEW assistant message ID. Continuation rejection permits exactly one full-context rebuild. Content-filter finish is terminal and leaves partial content visible. Root AGENTS.md:189 explicitly reserves the word "turn" for a future unit and bans "provider turn".
- **solves:** Retry logic that resets the user's step allowance silently changes what the agent is allowed to do, and a "replay the failed call" loop double-charges side effects.
- **port effort:** MEDIUM — the vocabulary (step vs physical attempt) and the "retries don't consume allowance" law are portable; the specific budget numbers are opencode's. | **idea only:** True

## opencode.7 Instructions as content-addressed value deltas, not a registry

- **where:** specs/v2/session.md:90-96 ; packages/core/src/session/{instructions,instruction-state,instruction-entry}.ts ; packages/core/src/instruction-discovery.ts ; migration 20260605042240_add_context_epoch_agent.ts ; root AGENTS.md:191
- **what:** Every source is read concurrently exactly once before each Physical Attempt, hashed (SHA-256), and one delta admitted atomically with its new blobs. The initial delta must be complete and carries no update text; later deltas freeze optional prose and project as a chronological System message.
- **how:** Literal `"removed"` marks an observed absence. An unavailable source blocks ONLY the initial delta and otherwise silently retains the stored value. An instruction epoch spans completed compactions; movement retains state (so destination changes read as chronological updates), committed revert clears it, and a fork copies messages only through its boundary but adopts the parent's newest instruction values. Root AGENTS.md:191 states plainly: "there is no instruction registry."
- **solves:** AGENTS.md/CLAUDE.md edits produce a readable, ordered, deduplicated history without re-sending the whole instruction blob each turn or losing the fact that a file changed.
- **port effort:** MEDIUM — this maps almost 1:1 onto omp's AGENTS.md/instructions concern and is probably the single highest-value idea to lift from this repo. | **idea only:** True

## opencode.8 Encode-once event feed with independent per-connection bounded queues

- **where:** specs/v2/event-stream-architecture.md (full decision record) ; packages/server/src/event-feed.ts ; packages/core/src/bus.ts(908 lines)
- **what:** One Server-scoped feed subscribes once to Core; each HTTP connection gets its own `Queue.dropping(4096)` of the SAME immutable encoded string reference. Overflow evicts only that connection; the publisher and healthy peers continue in order.
- **how:** The record rejects a shared PubSub on measured grounds: `bounded` suspends the publisher behind the slowest subscriber, `dropping` fails ALL subscribers at once, `sliding` skips silently while leaving the client connected, `unbounded` loses the bound. Memory is bounded by reference sharing (50 clients x 4096 frames ~= 1.6 MiB of references). Measured on Apple Silicon / Bun 1.3.14: 1 client +0.7%, 10 clients -89.3%, 50 clients -97.8% versus per-connection encoding.
- **solves:** N connected TUIs were re-running schema encode + JSON.stringify + SSE framing N times per event; and any shared-buffer design trades a memory bound for a head-of-line block.
- **port effort:** LOW to MEDIUM — the encode-once + independent-queue law is a direct, portable pattern for any SSE fan-out. omp should copy the *decision record format* too. | **idea only:** True

## opencode.9 AST-level architecture lint via ast-grep, with the general linter disabled

- **where:** .oxlintrc.json ; script/ast-grep/rules/*.yml ; script/ast-grep/effect-simplifications/rules/*.yml ; root package.json scripts lint:* and test:lint-rules
- **what:** oxlint runs with correctness, suspicious, pedantic, perf, style, restriction and nursery ALL set to "off", and exactly one custom rule (`no-restricted-globals` on `Reflect`). Real enforcement is 16 ast-grep rule files (11 unique rules) plus `tsgo` typecheck.
- **how:** Rules: no-star-import, no-import-alias, no-json-parse-cast, no-drizzle-column-name, no-effect-die-string, no-nested-effect-service-yield, no-effect-catch-fail/succeed, no-effect-and-then-succeed-undefined, no-effect-flat-map-suspend, no-identity-pipe. Five have separate `-tsx` variants. Each rule ships a fixture test plus a `__snapshots__` expectation, and the rules themselves are tested via `ast-grep test`.
- **solves:** Import-shape and Effect-idiom rules that no general-purpose linter can express, plus snapshot-tested rules so the rule set itself cannot silently rot.
- **port effort:** LOW — `no-star-import` / `no-import-alias` are directly portable to omp and are already omp policy; the snapshot-tested rule harness is the reusable part. | **idea only:** True

## opencode.10 Authority table + decision records instead of implementation checklists

- **where:** specs/v2/{README,session,tools,event-stream-architecture,provider-policy,catalog-config-plugin-lifecycle}.md (1230 lines)
- **what:** specs/v2/README.md names the single owner for each class of fact, then classifies documents into Current Contracts, Decision Records (with a Status column), and Historical Context.
- **how:** "HTTP operations and transport errors -> Protocol; public domain shapes and durable event payloads -> Schema; runtime behavior and persistence -> Core; contributor-critical regression guardrails -> root AGENTS.md." README closes with: "Do not add implementation checklists here. Put actionable work in GitHub issues and package-specific contributor guidance next to the code it governs."
- **solves:** Design docs rot into task lists nobody updates, and then contradict the code. Splitting Current / Decision / Historical and forbidding checklists keeps each document true for a different reason.
- **port effort:** LOW — pure process. omp's milestone plans can adopt this doc taxonomy verbatim. | **idea only:** True

## opencode.11 Scoped tool registry that replays transforms instead of mutating a list

- **where:** packages/core/src/tool/AGENTS.md ; packages/core/src/tool.ts ; packages/core/src/tool/plugin/ ; packages/core/src/tool/runtime.ts(12KB)
- **what:** `Tool.Service.transform` is the only registration path. Transforms are replayed in order against a fresh editor; disposal removes one transform and rebuilds, revealing any earlier definition it had overridden. Each model request captures a snapshot of the effective definitions.
- **how:** Tools may carry a namespace that flattens model-visible names to `<namespace>_<tool>`. MCP owns ONE stable transform that reads its latest discovered tools, so a tool-list change reloads state instead of re-registering at the end of the order — which preserves the precedence of later plugin overrides. The registry has NO Permission.Service dependency: "Tool filtering is catalog visibility, not execution authorization."
- **solves:** Order-dependent override bugs when a source re-registers (MCP refresh, plugin reload) — the classic "why did my override stop working" class.
- **port effort:** MEDIUM — the transform-replay model and the visibility-vs-authorization split are both portable and both directly applicable to omp's tool registry. | **idea only:** True

## opencode.12 Confined code execution over schema-described tools (codemode)

- **where:** packages/codemode/ (45 src files / 10764 lines, deps only `acorn` + `effect`) ; core integration at packages/core/src/codemode/ and plugin/mcp-codemode-defaults.ts
- **what:** A JS interpreter running inside Effect that executes against tools described by schema, instead of handing the model raw tool-call JSON. `codemode: false` opts a tool back onto the provider's native list.
- **how:** 34 test files, many direct ports of test262 and WPT conformance suites (parity.test.ts 78KB, stdlib.test.ts 72KB, promise-test262 54KB) with LICENSE.test262 / LICENSE.wpt vendored as fixtures.
- **solves:** Models that write JS against typed tool APIs emit fewer, larger, more correct call batches than models that emit one JSON tool call per step — and the conformance suites prove the sandbox's language semantics are real, not approximated.
- **port effort:** HIGH — this is the most expensive idea here (an interpreter plus conformance suites). The *idea* (offer the model a typed code surface over tools, keep a native-call escape hatch) is portable; the implementation is not. | **idea only:** True

## opencode.13 Explicit typed-error vs defect discipline in tool execution

- **where:** packages/core/src/tool/AGENTS.md:29 ; root AGENTS.md:52 ('Avoid try/catch where possible')
- **what:** Leaves translate only EXPECTED typed errors into `ToolFailure`. The AGENTS.md forbids `catchCause`, because interruption and defects must survive the leaf. User declines and question dismissals travel as defects and resurface as typed failures at the boundary.
- **how:** A decline WITH feedback (`Permission.CorrectedError`) stays typed so the leaf converts it into `ToolFailure` and the model continues; a plain decline does not. AGENTS.md is explicit that leaves "must never catch or convert them."
- **solves:** Catch-all error handling in tools swallows cancellation and genuine defects, so an interrupted run looks like a failed one and a real bug looks like a user refusal.
- **port effort:** LOW — a rule, not machinery. omp's tool layer can adopt the discipline immediately. | **idea only:** True

## opencode.14 Deliverable-age floor on dependency installs

- **where:** bunfig.toml [install] ; root package.json `overrides` pinning effect/solid-js/@types/bun to catalog versions
- **what:** `minimumReleaseAge = 259200` (72 hours) in bunfig.toml, with a 40-package allowlist for dependencies that legitimately must move fast (`@opentui/*`, `@opencode-ai/pty-*`, `@ff-labs/fff-*`, `electron`, `blume`, `mermaid`, `@opencode/sdk`, …).
- **how:** Also `exact = true`, a `catalog` block pinning ~90 versions centrally, and 16 `patchedDependencies` entries.
- **solves:** A supply-chain compromise published minutes ago cannot be pulled in by a routine `bun install`, without permanently blocking the handful of packages the team genuinely needs current.
- **port effort:** LOW — a few lines of config. omp should copy the allowlist pattern, not just the floor. | **idea only:** True

## opencode.15 Repo's own config is version-controlled and self-referential

- **where:** .opencode/ (37 files)
- **what:** The project ships its own `.opencode/` with `opencode.jsonc` ($schema https://opencode.ai/config.json), a separate `tui.json`, 8 custom commands, 2 custom agents, 2 custom TypeScript tools, 3 skills, 20-locale glossaries, and a theme.
- **how:** Config references take a discriminated shape: `{repository, description}` for remote sources and `{path, description}` for local ones. Trailing commas are used (JSONC).
- **solves:** The project's agent configuration is reviewable in the same diff as the code, and the config format stays exercised by its own maintainers.
- **port effort:** LOW — omp already keeps AGENTS.md checked in; the extra artifacts (glossary, skills, custom tools-as-source) are the additive part. | **idea only:** True

## opencode.16 Replayable Location-scoped catalog transforms (historical decision)

- **where:** specs/v2/catalog-config-plugin-lifecycle.md (324 lines) ; status: Historical
- **what:** A decision record preserved specifically for the OPTION COMPARISON that led to replayable Location-scoped catalog transforms, kept under 'Historical Context' rather than deleted.
- **how:** Same three-way classification as the event-stream record: current contract, accepted decision, or preserved history.
- **solves:** When a future maintainer asks "why isn't this a global service?", the answer survives instead of being re-litigated from scratch.
- **port effort:** LOW — process. | **idea only:** True

## opencode.17 Drain-based re-entrant agent loop with step continuations

- **where:** packages/core/src/session/runner/llm.ts:53-195 (drain), :187-194 (the while(true)), packages/core/src/session/runner/index.ts:20-27 (Continuation + DrainResult)
- **what:** The loop has no in-memory state. `drain` reads durable history, runs one step, and returns. DrainResult is a tagged enum {Complete | Moved | Reloaded(force, continuation)} and Continuation is just `{step: number}`, so a turn can be suspended at a step boundary and resumed in a different process at the same step index.
- **how:** `advanceToStep()` polls the inbox and prepares context; `runStep(ctx, step)` returns `needsContinuation`; step++ and loop. Moved/Reloaded bubble out of drain and execution.ts:108-112 recurses to re-enter at a new Location.
- **solves:** Makes steering, cancellation, config reload, and crash resume all one mechanism instead of four. A restarted process reconstructs the entire turn from the DB.
- **port effort:** medium — the idea (loop = re-entrant function over durable history) ports directly; the Continuation type must be stored somewhere durable | **idea only:** True

## opencode.18 Write-ahead execution claim (crash recovery as a DB property)

- **where:** packages/core/src/session/execution.ts:79-89 (claimOnCommit/releaseOnCommit), :114-151 (coordinator wiring); packages/core/src/session/store.ts:62-85 (Interface docs); packages/core/src/session/execution/restart.ts:77-99 (prepareResume), :192-232 (resumeSuspendedSessions)
- **what:** Execution.Started writes a durable "turn in flight" claim in the SAME transaction as the event. Terminals release it. Graceful shutdown deliberately PRESERVES it so the next boot resumes. A claim that survives with no terminal is the signature of a dead process.
- **how:** `resumeSuspendedSessions` sweeps `store.listSuspended()`, calls `store.countResume()` BEFORE resuming (so a crash inside the resume is counted by the next sweep), and terminalizes with RESUME_EXHAUSTED past `DEFAULT_MAX_ATTEMPTS = 10` (restart.ts:33). Deliberately at-least-once.
- **solves:** Crash/SIGKILL/eviction recovery needs no shutdown hook that may not run. The doc comment states it outright: 'recovery is a property of the database, never of a shutdown hook that may not run.'
- **port effort:** high — needs a transactional event store; the concept alone is ~50 lines | **idea only:** True

## opencode.19 One provider stream + N parallel tool fibers, settled under one uninterruptible mask

- **where:** packages/core/src/session/runner/step.ts:104-133 (fork site), :136-268 (uninterruptible settlement), :281-304 (classifyToolExits)
- **what:** A single `llm.stream(...)` is consumed with `Stream.runForEach`; each non-provider-executed `tool-call` event forks a scoped fiber. The stream keeps running while tools execute. After the stream exits, all tool fibers are joined and classified.
- **how:** `interruptTools` = `Fiber.interruptAll`; `classifyToolExits` splits settled exits into declines (typed Permission.DeclinedError) vs interrupts vs defects. Only declines and interrupts cross typed boundaries; Tool.Error is already settled inside its own fiber (step.ts:124-126).
- **solves:** Tool execution overlaps the provider stream without a shared writer queue, while guaranteeing no tool result is left unsettled and no final event is lost to cancellation.
- **port effort:** medium — the fiber-per-tool fan-out is Effect-idiomatic but translatable to any structured concurrency runtime | **idea only:** False

## opencode.20 Documented concurrency invariant for lock-free event publication

- **where:** packages/core/src/session/runner/publish-llm-event.ts:64-76 (the invariant), :77-203 (fragments), :99-119 (startAssistant)
- **what:** Provider loop and tool fibers call publisher methods concurrently with NO lock. Two rules make it safe, stated in a doc comment: (1) mark state synchronously before the first await — never a yield between a check and its mark; (2) never require cross-source event order — consumers fold by id/ordinal, not global position.
- **how:** Every mark (`stepStarted`, `tool.called`, `tool.settled`) is a plain synchronous assignment. `currentAssistantMessageID()` dies rather than guessing if a tool event arrives before Step.Started.
- **solves:** Makes the absence of a writer queue safe and reviewable — the invariant is checkable by reading the mark sites, not by reasoning about interleavings.
- **port effort:** low — pure documentation discipline, copies directly | **idea only:** True

## opencode.21 Ordinal-tagged batched delta streaming

- **where:** packages/core/src/session/runner/publish-llm-event.ts:78 (deltaBatchInterval=100), :121-204 (fragments closure), :206-276 (text/reasoning/toolInput instances), :265-270 (publishPendingDeltas)
- **what:** Text/reasoning deltas are batched on a 100 ms timer per fragment; each fragment gets a monotonic `ordinal` at start. Block STARTS are published immediately (not batched) and pending deltas are flushed first, so published order matches model order. On end, the timer is interrupted and the pending batch is published before the Ended event.
- **how:** `ordinal` is what lets the consumer reorder fragments without a global sequence. `end` interrupts the timer, calls publishDelta, then emits Ended. `flush` force-ends every open fragment in `Effect.ensuring`.
- **solves:** Thousands of bus publications per second become a manageable rate, without losing ordering or leaving a fragment open at stream end.
- **port effort:** low — the batching loop is ~50 lines and self-contained | **idea only:** True

## opencode.22 Two-sided compaction trigger (proactive estimate + reactive overflow recovery)

- **where:** packages/core/src/session/compaction.ts:742-763 (required), :174-208 (estimateTokens), :40-45 (constants: buffer 20_000, keep 15_000, OUTPUT_TOKEN_MAX 32_000); packages/core/src/session/runner/llm.ts:220-226 (proactive), :265-271 (recoverOverflow); packages/core/src/session/runner/step.ts:108-115,147-152 (reactive)
- **what:** Proactive: `required()` estimates current prompt tokens before the request and compacts when the estimate crosses a ceiling. Reactive: if the provider returns a context-overflow error AND nothing was output yet, the runner compacts and retries — but only once per logical step (`recoverOverflow` flips to false).
- **how:** promptCeiling = min(limit.input - buffer, context - max(min(limit.output, 32k), buffer)). Overflow events are intercepted BEFORE publication (step.ts:108-115) so a doomed attempt is never recorded. Two guards in `required()`: don't re-compact right after a completed checkpoint, and wait for a primary response to anchor a native window.
- **solves:** A 4-chars-per-token estimate is too crude to trust alone; the estimate is the cheap path and the overflow error is the ground truth. Splitting them means a bad estimate costs one round trip, not a broken session.
- **port effort:** medium — the trigger arithmetic and the outputStarted gate are the valuable part | **idea only:** True

## opencode.23 Structured summary with user-boundary tail retention

- **where:** packages/core/src/session/compaction.ts:46-77 (SUMMARY_TEMPLATE), :79-85 (SUMMARY_RULES), :322-362 (splitHistory/findTailStart), :638-707 (the two-request loop), :710-724 (validation failure)
- **what:** Compaction splits history at a USER message boundary (never mid tool-call/result exchange), keeps the tail verbatim, and asks the model for a fixed 7-section template (Objective/Requirements/Decisions/Work State/Next Move/Relevant Files/Important Context). The summary is validated: if no `##` heading from the template is present, ONE reminder request is issued; still failing means the compaction FAILS rather than installing a bad checkpoint.
- **how:** findTailStart walks newest→oldest on Token.estimate, always keeps at least the newest entry, then `while (start > 0 && conversation[start].message.type !== "user") start--`. If no user boundary exists it degrades to 'summarize everything, retain nothing' (:360-361). Both requests share one retry allowance; rejected output never enters the reminder request (:632).
- **solves:** Splitting at a user boundary is what keeps tool-call/result pairs intact — the classic compaction bug. Output validation means a malformed summary is a loud failure, not silent context loss.
- **port effort:** low — the template and the boundary rule are copyable as-is | **idea only:** True

## opencode.24 Native provider-checkpoint compaction with a provenance guard

- **where:** packages/core/src/session/compaction.ts:96-115 (NativeInput/NativeStrategy/Editor), :501-594 (executeProvider), :520-528 and :738-741 (dispatch); packages/core/src/session/model-request.ts:279-293 (the provenance defect)
- **what:** Some providers (Anthropic context-management, OpenAI Responses) do compaction server-side. opencode supports it via a plugin-registered NativeStrategy, but guards it hard: the route must come from catalog config, not a model.request hook rewrite, because history is selected BEFORE hooks run. If a routing hook would send an existing opaque window to a different deployment, the request DIES rather than silently corrupting the checkpoint.
- **how:** `SessionProviderContext.provenance(model)` + `.compatible(a,b)` gate every window. `original(sessionID)` re-expands the full local transcript for checkpoint-only strategies that need real user messages. Auto-overflow falls back to `recoverLocally` and marks `recoveredOverflow`.
- **solves:** Opaque provider windows are unreplayable if they leak to another deployment. The guard converts a silent-corruption class of bug into a loud defect.
- **port effort:** high — the provenance model only matters if omp also supports native checkpoints; the guard idea is portable alone | **idea only:** True

## opencode.25 Two-mode input admission: steer (mid-turn) vs queue (next turn)

- **where:** packages/core/src/session/inbox.ts:43-48 (Promotable doc), :488-528 (promote), :530-550 (pendingSteers with control hoisting); packages/core/src/session/runner/llm.ts:60-65, :79-110, :160-181; packages/core/src/session/session.ts:135-144 (steer/queue mutators)
- **what:** Pending input lives in a durable inbox table with a `delivery` column. `steer` = inject at the next step boundary mid-work; `queue` = next turn only. Control items (compaction, move) are NOT ordinary input — they are consumed by the runner at the boundary before any prompt is promoted. `promote()` returns `undefined` to mean "handle a control first".
- **how:** All inbox mutation runs under a per-session KeyedMutex (`serialized`, inbox.ts:59-63). `pendingSteers` hoists a compaction row ahead of earlier steers so their text stays verbatim after the checkpoint instead of being swallowed into the summary — but never across a `move`, which changes the Location.
- **solves:** Mid-turn steering without corrupting the step in flight, and without a control item (a manual compact, a directory move) being starved behind a queued prompt.
- **port effort:** medium — needs a durable queue; the steer/queue split and the control-priority rule are the ideas | **idea only:** True

## opencode.26 Run coordinator with a doorbell (one fiber per busy period)

- **where:** packages/core/src/session/run-coordinator.ts:32-59 (design + ASCII diagram), :74-85 (loop), :116-120 (settle), :136-145 (wake), :147-167 (interrupt), :171-176 (awaitIdle)
- **what:** One execution = one fiber per session key, from the first wake until the key would stay idle. `pendingWake` is a doorbell: work recorded DURING a drain rings it, and the loop drains again instead of ending. The doorbell explicitly closes the gap between a drain's last eligibility check and the idle transition, which cannot be one atomic step.
- **how:** Coalesced wakes keep the widest scope ('input' subsumes 'steer', line 141). The loop uses a trampoline (`Effect.yieldNow` before recursing) so synchronous drains can't grow the stack. Interrupt claims wakes recorded so far but lets wakes arriving during cleanup start a successor at settle.
- **solves:** The classic lost-wakeup race between 'no work' and 'going idle'. The diagram and the 4 comment blocks explain it better than most designs I've read.
- **port effort:** medium — a ~180-line file; conceptually a keyed mutex plus a boolean doorbell | **idea only:** True

## opencode.27 Classification-driven retry on an exhaustive error-tag switch

- **where:** packages/core/src/session/runner/retry.ts:30-65 (isRetryable), :67-92 (schedule + RETRY_AFTER_MAX), :94-120 (policy), :126-138 (transient)
- **what:** `isRetryable` is an exhaustive `switch` over `AIError.reason._tag` with a `never` check — not status codes. The comment states the policy for the default branch explicitly: unrecognized failures retry, because classification records affirmative deterministic evidence and transient failures arrive in shapes no classifier anticipates.
- **how:** Schedule = min(exponential(2s), spaced(10s)) capped by recurs(10), jittered; documented as 2,4,8,10x7 ≈ 84 s total. `x-should-retry` response header overrides both ways (:31-33). Provider `retryAfterMs` is honored but clamped to 15 minutes against a hostile/buggy header. A plugin hook can rewrite BOTH retry and delay (:106-118).
- **solves:** The retry decision is auditable by reading one switch, and adding a new error class forces the compiler to make you classify it.
- **port effort:** low — the switch shape and the bound-on-retry-after rule are directly portable | **idea only:** True

## opencode.28 Retry is split by whether output was already produced

- **where:** packages/core/src/session/runner/step.ts:167-189 (Retry vs Continue), :185-189 (startAssistant on retry), :246-254 (Continue return); packages/core/src/session/runner/llm.ts:34-35 (CONTINUE_AFTER_INCOMPLETE_STREAM), :275-297 (outcome match)
- **what:** Same failure, two different repairs. If NOTHING was output, retry transparently (state projects onto the existing assistant, which is created just for the retry). If output WAS produced, do NOT retry the request — instead publish a synthetic 'Continue from where you left off' message and start a NEW assistant message.
- **how:** `isInterruptedStream` (step.ts:274-278) admits two shapes: InvalidProviderOutput with classification 'incomplete-stream', or Transport with operation 'read'. RecoverFull (step.ts:167-173) handles 'retry-full' transport recovery by rebuilding the whole request, once per step.
- **solves:** Re-sending a request that already streamed visible text would duplicate it in the UI and double-charge. Recovery has to branch on durable fact, not on the error alone.
- **port effort:** medium — the outputStarted gate is the idea; needs the same durable output tracking | **idea only:** True

## opencode.29 Max-steps as a forced text-only final step that preserves the cache prefix

- **where:** packages/core/src/session/runner/llm.ts:227 (stepLimitReached), :235-247 (the request, with the cache comment at :244), :264-266 (needsContinuation); packages/core/src/session/runner/max-steps.ts:1-16; packages/core/src/session/runner/step.ts:88-90 (the guard)
- **what:** At the step limit, the runner appends a MAX_STEPS_PROMPT assistant message and sets toolChoice:'none' — but deliberately KEEPS the tool definitions on the request. If a tool call still arrives, it is rejected with 'Tools are disabled after the maximum agent steps'.
- **how:** Comment at llm.ts:244: 'Keep tool definitions on the final Step to preserve the provider's cached prefix.' step.ts:265 also gates `needsContinuation` on toolChoice !== 'none'.
- **solves:** Forces a real summary turn instead of a truncated trace, without invalidating the provider's prompt cache — which would cost a full re-read of the entire conversation on the most expensive request of the turn.
- **port effort:** low — the prompt is copyable; the cache-prefix reasoning is the reusable insight | **idea only:** True

## opencode.30 Subagent = an ordinary child session run by the same loop

- **where:** packages/core/src/tool/plugin/subagent.ts:29-62 (schema+description), :100-266 (execute), :118-133 (depth limit), :282-309 (dynamic tool description); packages/core/src/session/subagent-job.ts:16-59; packages/core/src/session/subagent-completion.ts:20-45
- **what:** No second agent runtime. A subagent is a child session (`parentID`) that the normal drain loop executes. Foreground blocks on `jobs.block`; background returns a sessionID immediately and the parent is woken by a durable notification when the child finishes. The tool input even supports passing an existing sessionID back to CONTINUE the same child conversation.
- **how:** Depth limit defaults to 1 (`experimental.subagent_depth ?? 1`, subagent.ts:129) — nesting is opt-in. Model precedence: explicit override > agent's model > parent's (:184). `subagent-job.ts:23-25` dedups notifications by `${childSessionID}:${startedAt}` so a continuation generation doesn't double-notify. A session hook rewrites the tool description to list available subagents on every context/compaction/generate request (:282-309).
- **solves:** Subagent recovery, compaction, retry, permissions, and crash resume all work for children because children are just sessions. Background mode returns a sessionID so the model can continue the child later without re-reading its transcript.
- **port effort:** medium — the shape ports; the Job service and notification dedup are opencode-specific | **idea only:** True

## opencode.31 Per-request tool snapshot with permission filtering at capture time

- **where:** packages/core/src/tool.ts:51-63 (Snapshot), :225-287 (snapshot), :263-284 (execute), :292-295 (whollyDisabled); packages/core/src/tool/AGENTS.md:50-54 (the explicit 'filtering is not authorization' rule); packages/core/src/session/context.ts:131-143 (merge + snapshot)
- **what:** Each model request captures the effective definitions AND executors it advertised. Later reloads/disposal affect only later snapshots. Permission filtering happens at snapshot time (catalog visibility), but the registry performs NO authorization — the leaf still runs its own policy.
- **how:** `definitions?: ReadonlyMap<string, ToolDefinition>` is threaded into execute; a call for a definition the request did not advertise returns 'Tool is not available for this request' (tool.ts:274-275) rather than executing. Hooks may RENAME a tool; the model-request layer tracks definitions by object identity so renames map back (model-request.ts:216-233). Foreign plugin errors are coerced to Tool.Error at the untrusted boundary so a call can never be left permanently unsettled (runtime.ts:31-44).
- **solves:** A session context hook that REMOVES a tool actually removes it for that request. A rename is preserved. A buggy third-party plugin cannot wedge a tool call forever.
- **port effort:** medium — the identity-through-hooks trick is the non-obvious part | **idea only:** True

## opencode.32 Token accounting anchored on the last real provider usage

- **where:** packages/core/src/session/compaction.ts:168-172 (hasInputUsage), :174-208 (estimateTokens), :210-230 (estimatePart); packages/core/src/util/token.ts:5
- **what:** Rather than estimating the whole conversation, `estimateTokens` finds the last assistant message with real input usage, adds its full usage, and estimates ONLY the local delta since then (which the provider never billed). Media uses flat estimates: image 1500, PDF 2000 tokens. Base estimator is 4 chars/token.
- **how:** cost is computed separately with TIERED pricing — it filters the cost table for the highest context tier the usage exceeds (usage.ts:22-36), not a flat rate. Compaction usage is recorded under a distinct `source: "compaction"` so it does not pollute the conversation anchor.
- **solves:** Anchor + delta is far more accurate than whole-conversation estimation, and cheap. The tiered cost table handles long-context price breaks most clients get wrong.
- **port effort:** low — the anchor+delta structure is the idea; the numbers are tuning | **idea only:** True

## opencode.33 Stale-state settlement on drain entry

- **where:** packages/core/src/session/runner/llm.ts:67-68 (call sites), :302-330 (settleStaleCompactions, newest-first), :332-355 (settleStaleToolCalls)
- **what:** Because the loop reconstructs from history, a process death leaves tool calls stuck in 'streaming'/'running' and compactions stuck in 'running'. Both are repaired at the top of every drain, before any new work.
- **how:** Compaction orphans are queried by `json_extract(data,'$.status') = 'running'` ordered by seq DESC to match event projection order. Tool orphans are walked from store.context and published as Tool.Failed with an 'interrupted' error; subagent tool metadata carrying a child sessionID is echoed back so the model can find the child.
- **solves:** Without this, a crash permanently wedges a tool call — the provider's next request would be missing a required tool_result.
- **port effort:** low — but see finding #3: the tool half is O(history) on every drain, not just after a crash | **idea only:** True

## opencode.34 Sticky WebSocket session transport with affinity key and HTTP fallback

- **where:** packages/core/src/session/model-transport.ts:25-31 (constants), :57-59 (affinity), :40-58 (State/Channel); packages/core/src/session/model-request.ts:326-350 (wiring)
- **what:** Sessions on a websocket-capable model hold one socket. The affinity key is sha256 of the URL plus the sorted headers — so changing headers transparently reopens the socket. After 5 consecutive exchanges lost to the socket, the session falls back to HTTP permanently.
- **how:** ROTATE_AFTER_MS = 55 min, CONNECT_TIMEOUT = 15 s, IDLE_TIMEOUT = 30 min (comment: 'Reasoning models can stream nothing for several minutes while still working'), MAX_STREAM_FAILURES = 5. Only the durable runner may request the websocket (`webSocket?: "session"`). Effect `Metric.counter` for lifecycle events.
- **solves:** Removes per-request TCP/TLS setup and header-roundtrip latency for long agent turns, with a bounded failure path back to plain HTTP.
- **port effort:** high — full transport lifecycle; the affinity-key and fallback-after-N ideas are cheap | **idea only:** True

## opencode.35 CodeMode — tools exposed as a JavaScript API instead of a schema list

- **where:** packages/core/src/codemode/ (catalog.ts, tool.ts), packages/codemode/src/interpreter/interpreter.ts (2334 lines), packages/codemode/src/tool-runtime.ts (459); packages/core/src/tool.ts:234-262 (split into direct vs codemode tools)
- **what:** Instead of advertising every tool as a JSON schema, tools are rendered into a typed catalog the model calls from generated code. Tools opt out with `codemode: false` (the subagent tool does, subagent.ts:104). The model gets ONE 'execute' tool.
- **how:** Catalog rendering is CACHED across steps and invalidated by (registry revision + visible tool name set) — tool.ts:246-254. The interpreter is a hand-written JS engine with generators, promises, and a scope tracker (packages/codemode/src/interpreter/*, 5905 lines total).
- **solves:** Large tool catalogs blow the context window and degrade tool selection. Collapsing them into code-shaped calls reduces both.
- **port effort:** very high — 10.7k lines including a bespoke interpreter. Distinctive but a research project, not a port. | **idea only:** True

## opencode.36 Effect-TS as the runtime substrate for the whole core

- **where:** packages/core/src/session/runner/llm.ts:361-378 (node graph), packages/core/src/session/context.ts:185-205, packages/core/src/tool.ts:328-332, packages/core/src/session/execution.ts:181-185 (makeGlobalNode)
- **what:** Not a library choice in one file — the substrate. Services via Context.Service, errors via Schema.TaggedError, cancellation/interruption as a first-class channel distinct from failure, DI via a `makeLocationNode` graph. Location-scoped vs global-scoped services are an explicit split.
- **how:** The distinction between `Effect.interrupt` (user cancel) and typed failure is load-bearing throughout: user declines tunnel through as DEFECTS so tool code cannot catch them and turn a 'no' into model-visible output (tool/AGENTS.md:29), then resurface as typed failures at model-request.ts:358-374.
- **solves:** Interrupt-vs-fail separation is the single hardest thing to get right in an agent loop, and here it is a type-level guarantee rather than a convention.
- **port effort:** very high — this is a rewrite decision, not a port. Flagging because the whole layout depends on it. | **idea only:** False

## opencode.37 Unified command model — one declaration is simultaneously a keybind, a palette entry, and a slash command

- **where:** Declaration mechanism: `packages/tui/src/context/keymap.tsx` (469 lines, `createLayer` reducer splits commands into `named` vs `inline`; module augmentation adds `opencode`, `slash` to the OpenTui `Command` interface). Palette consumer: `packages/tui/src/component/command-palette.tsx` (66 lines). Example declarations: `packages/tui/src/app.tsx:711-1103` (19 slash commands), `packages/tui/src/routes/session/index.tsx:901-1219` (10).
- **what:** Every user action is a single `KeymapCommand` object carrying `id`, `title`, `description`, `group`, `bind`, `palette: true`, `slash: {name, aliases?, arguments?}`, and `run(input)`. One declaration produces: a keybinding (looked up by `id` in the keybind table), a command-palette row (if `palette: true`), and a `/slash` completion (if `slash` is set). The palette deliberately lists the same object with its live-resolved shortcut in the footer via `shortcuts.all(command.id)`.
- **how:** `Keymap.createLayer(() => ({ mode, commands, bindings }))` registers a layer. A command with an `id` is dispatched by name through `keymap.dispatchCommand(id)`; a command without an `id` must carry a literal `bind` string and is inlined as a raw binding. `slash: {name, aliases, arguments}` is optional metadata, and the same `run(input)` receives the argument text.
- **solves:** Eliminates the classic drift where a slash command, a palette entry, and a keyboard shortcut are maintained in three parallel tables and silently disagree. Also makes the palette a complete, auto-current index of every action — the help system becomes free.
- **port effort:** Medium. The idea ports cleanly. omp already has a keymap/command layer, so this is a refactor of the registration API (add `slash`/`palette` metadata to the existing command type and make the palette read from the same registry), not a rewrite. | **idea only:** True

## opencode.38 Keymap layering with explicit input modes (base / global / modal)

- **where:** `packages/tui/src/context/keymap.tsx` — `createMode` (mode stack), `createLayer` (mode assignment), `resolveInteractivity` (global non-interactive gate), plus `packages/tui/src/context/interactivity.tsx`.
- **what:** A layered keymap where each layer declares a `mode` ("base", "global", "modal") and an `enabled` predicate. `createMode` keeps a stack of `{id, mode, enabled}` and resolves the active mode via `stack().findLast(item => item.enabled())?.mode ?? "base"` — inactive scopes retain their stack position beneath newer modes. Server events dispatch commands scoped by directory (`event.on("tui.command.execute", ...)` guards on matching directory).
- **how:** A `MODE` key (`"opencode.mode"`) is published into the keymap via `keymap.setData`, and each layer registers `context.require(MODE.key, value)`. App-level layers declare `mode: "global"` for always-on bindings (app.tsx:1225-1251, six layers incl. one gated on `enabled: () => !sessionTabs.enabled()` and one gated on the prompt being empty).
- **solves:** Modal dialogs and full-screen overlays (diff viewer, session list, model picker) need to capture keys without the rest of the app reacting, and a timed leader sequence must not fire its suffix while a modal owns the keyboard. A declarative mode stack avoids ad-hoc enable/disable bookkeeping.
- **port effort:** Medium-high. Depends on the keymap library's layer/mode primitives. If omp's keymap is a flat dispatch table, this needs real work. | **idea only:** True

## opencode.39 Timed leader key as the primary chord namespace

- **where:** `packages/tui/src/config/keybind.ts:39` (`export const LeaderDefault = "ctrl+x"`), registration in `packages/tui/src/context/keymap.tsx` via `registerTimedLeader(keymap, {trigger, name: "leader", timeoutMs: config.leader?.timeout ?? 2000})`, and display formatting in `formatOptions()` which maps the leader token to its actual key.
- **what:** A single leader key (`ctrl+x` by default, `LeaderDefault`) starts a timed sequence; every chord binding is written `<leader>e`, `<leader>b`, `<leader>s` and rendered to the user as the resolved sequence. The timeout is user-configurable.
- **how:** `registerTimedLeader` from `@opentui/keymap/addons/opentui`; the leader binding is read from the keybind table (`config.keybinds.get("leader")?.[0]?.key`) so it is itself rebindable. 25+ chords are defined as `<leader>x` in the Definitions table.
- **solves:** Gives a large action surface without monopolizing unmodified single keys, and the leader is rebindable for users whose terminal intercepts `ctrl+x`.
- **port effort:** Low-medium if omp already has a chord/prefix system; the specific value is the *timeout + rebindable trigger + display rewriting* combination. | **idea only:** True

## opencode.40 Palette-as-discovery + deliberately minimal help dialog

- **where:** `packages/tui/src/ui/dialog-help.tsx` (whole file, 38 lines). Palette: `packages/tui/src/component/command-palette.tsx`. Reachability filter: `packages/tui/src/context/keymap.tsx` `useCommands()` -> `keymap.getCommandEntries({visibility: "reachable"})`.
- **what:** The help dialog is a 6-line stub that says only "Press {shortcut for command.palette.show} to see all available actions and commands in any context." There is no static keybinding reference screen. All discovery is delegated to the palette, which is context-aware: it queries the keymap for `visibility: "reachable"` commands, so only currently-available actions appear.
- **how:** `DialogSelect` receives options built from `commands().flatMap(...)`, skipping entries with no `id`, no `palette`, or `id === COMMAND_PALETTE_COMMAND` itself. When a filter is active (`ref?.filter`) the list is commands+settings only; when idle, entries flagged `suggested` (boolean or predicate) are hoisted into a "Suggested" category and the full list is appended below. Settings rows are merged into the same list via a `setting:<id>` value prefix. `searchText` = `id + description`; `searchFooter` = `group · shortcuts`.
- **solves:** A static help screen goes stale the moment a modal opens. A reachable-commands palette is always accurate, and the "Suggested" hoist gives new users a curated entry point without hiding the full surface.
- **port effort:** Low. This is a scoping decision more than code — the risk is that omp's palette is not yet wired to the live keymap. | **idea only:** True

## opencode.41 Settings UI as a pure projection of the typed config schema

- **where:** `packages/tui/src/component/dialog-config.tsx` (410 lines, `export const settings: Setting[]`); merged into the palette in `packages/tui/src/component/command-palette.tsx` (`settingOptions`, `settingID(setting)`, `dialog.replace(() => <DialogConfig current={...} />)`).
- **what:** 34 setting entries in 8 categories, each declared once as `{title, category, path[], default, values?, labels?, step?, min?, max?, format?, keywords?}`. The dialog is generic: it reads/writes `path` into the config object, offers `values` as a select, and uses `keywords` to make the row findable by search synonyms. The same rows are injected into the command palette with a `setting:` prefix so settings are searchable from one place.
- **how:** `values: [false, true]` + `labels: ["off", "on"]` gives booleans readable labels. `keywords` are extra search terms per row (e.g. the Sidebar row carries `["side panel"]`). The palette row's `onSelect` replaces the current dialog with DialogConfig scrolled to that setting, so the palette is a settings search box.
- **solves:** Adding a setting means one declaration, not a schema edit plus bespoke UI plus palette entry plus search synonyms. Also makes the settings surface greppable and countable.
- **port effort:** Low-medium. Very portable pattern; the main work is enumerating omp's existing config keys into this shape. | **idea only:** True

## opencode.42 Theme v2: semantic roles over hue ramps, with light/dark as an overlay

- **where:** Schema + resolver: `packages/theme/src/tui/` (schema.ts 302, resolve.ts 291, expand.ts 104, v1-migrate.ts 502, v1.ts, types.ts, color.ts, select.ts — 1592 LOC total). Reference v2 theme: `packages/tui/src/theme/assets/v2/opencode.json`. The 33 shipped v1 themes remain at `packages/tui/src/theme/assets/*.json`. Rule is written down in root `AGENTS.md` section "TUI Theme Tokens".
- **what:** The shipped themes moved from 51 flat named colors (each a `{dark, light}` pair) to a semantic-role system: 60 base leaves grouped as text / background / border / scrollbar / diff / syntax / markdown / categorical, where every value is a *reference* into a 9-step hue ramp (`$hue.neutral.200`, `$hue.accent.200`) rather than a literal. Light mode is expressed as an 86-leaf override document on top of the same base, so a theme author writes dark once and patches only what differs in light. Roles are state-qualified: `text.action.{primary,secondary,destructive}`, `text.formfield.*`, `text.feedback.{error,warning,success,info}` and the mirrored `background.*` set.
- **how:** `resolveThemeDocument(document, mode)` -> `selectThemeMode` picks the base+overlay for the mode, `expandTheme(selected.theme)` flattens `$hue.x.NNN` references and aliases (accent->orange, interactive->blue, neutral->gray), then resolves to `ResolvedThemeTokens`. `packages/theme/src/tui/v1-migrate.ts` (502 lines) converts the 51-role v1 shape forward, so all 33 existing themes keep working.
- **solves:** A flat palette forces components to pick colors by hue, so a theme author cannot restyle "destructive action" without touching every component. Semantic roles make themes composable, and the ramp reference system means a theme is ~60 references instead of ~102 literals. The light overlay removes the 2x authoring burden.
- **port effort:** Medium-high for the ramp/overlay engine; low for the semantic-role discipline. The discipline (and the written rule that components must not repurpose a nearby token) is the part worth stealing immediately; the resolver is a few hundred LOC. | **idea only:** True

## opencode.43 Named attention events driving both OS notifications and sound

- **where:** `packages/tui/src/attention.ts` (189 lines, `createTuiAttention`, `BUILTIN_SOUNDS` at line 38, `focusSkip`, `soundVolume`, `normalizeText` with 80/240-char title/message limits); event wiring in `packages/tui/src/feature-plugins/system/notifications.ts` (77 lines); event type in `packages/plugin/src/tui/context.ts:285`; config in `packages/tui/src/config/index.tsx` `attention` block.
- **what:** 6 semantic events — `default`, `question`, `permission`, `error`, `done`, `subagent_done` — each mapped to a sound file and gated by a `when` policy (always / focused / blurred) with per-call overrides. Notifications and sounds are decided independently (`sound: false` suppresses only the sound; `notification: {when:"blurred"}` suppresses only the desktop notification).
- **how:** `createTuiAttention({renderer, config, audio})` subscribes to renderer focus/blur to track `FocusState`, then `soundCandidates(name)` returns `[config.attention.sounds[name], BUILTIN_SOUNDS[name]]` so a user file override wins but the builtin is the fallback. The notifications plugin dedupes per-session with `Set`s (`errored`, `terminal`, `forms`, `permissions`) so a session that fails then ends notifies once with `error` + a toast, not twice. Subagent sessions get `notification: false` (sound only) so background agents do not spam desktop notifications.
- **solves:** "Notify me when the agent needs me" is the actual requirement; a binary on/off toggle cannot express "sound always, desktop popup only when I'm looking elsewhere, and never for subagents."
- **port effort:** Low. The event taxonomy plus the independent notification/sound gating is the reusable part; the audio playback backend is platform-specific. | **idea only:** True

## opencode.44 Plugin UI slots — a fixed set of named insertion points instead of a fork

- **where:** 11 `ui.slot()` call sites; 6 unique slot names. The 23 built-in feature plugins in `packages/tui/src/feature-plugins/` are themselves written as plugins (`Plugin.define({id, setup})`) — e.g. `feature-plugins/prompt/btw.tsx` renders a `/btw` spinner into `prompt.footer.status` and registers a global keymap layer for the `session.aside` command. Plugin API: `packages/tui/src/plugin/{api.tsx,context.tsx,builtins.ts,discovery.ts,render.tsx,structure.ts,watch.ts}`.
- **what:** TUI plugins extend the layout by appending renderables into 6 declared slots: `app`, `home.footer`, `prompt.footer`, `prompt.footer.status`, `sidebar.content`, `sidebar.footer`. Plugins can also add keymap layers, dialogs, and router targets.
- **how:** `context.ui.slot({append: "prompt.footer.status", render: () => <Show when={pending() > 0}>...</Show>})`. `<Slot path="app" />` sits inside the app root box (app.tsx:1386) so slot content renders inside the theme background.
- **solves:** Lets a feature ship as an add-on without forking the shell, and makes the extension surface small enough to document (6 names) and test.
- **port effort:** Medium. The slot-name discipline is the idea; the SolidJS plugin host is not portable, but a 6-slot registry is easy to add to any TUI. | **idea only:** True

## opencode.45 Two-tier TUI: full screen TUI and a scrollback-native "mini" interface

- **where:** `packages/tui/src/mini/` — `runtime.ts` (orchestrator with a documented boot sequence), `scrollback.surface.ts` / `scrollback.writer.tsx` (append-only entry writer), `splash.ts` (307 lines, entry/exit banners), `footer.prompt.tsx` (1555), `footer.view.tsx` (1041). CLI wiring: `packages/cli/src/commands/handlers/mini.ts`. Config: the `mini` block in `packages/tui/src/config/index.tsx` (thinking, tools, shell_output, turn_summary, footer, splash, work_spinner, mono, replay, replay_limit).
- **what:** `opencode` opens the full screen TUI; `opencode mini` opens a structurally different interface (42 files, 18,231 LOC) built on immutable terminal scrollback entries rather than a re-rendered screen. It has its own footer system (split view/permission/subagent/command/menu segments), its own splash banners, its own verbosity and mono modes, and its own 10-key keymap layers.
- **how:** `entryWriter`, `turnSummaryWriter`, `spacerWriter` from `scrollback.writer.tsx` append committed rows; retained surfaces (markdown/code) stay streaming-stable and wait for image loads before their snapshot enters scrollback. `mini` has its own config namespace so the two interfaces can diverge without one breaking the other.
- **solves:** Append-only scrollback is what makes a transcript survive resize and lets the user scroll back natively with the terminal's own scrollback. A re-rendered screen cannot do that. Shipping both lets power users pick, and the split isolates the two rendering strategies.
- **port effort:** High to port wholesale; the *idea* of a second scrollback-native mode is cheap to evaluate, the 18K LOC is not. The `mini` config block pattern (independent presentation toggles per interface) is the cheap, high-value part. | **idea only:** True

## opencode.46 Session tabs as a first-class, resizable, scope-aware surface

- **where:** `packages/tui/src/component/session-tabs.tsx` (1779 lines), `session-tabs-rail.tsx` (94), `session-tabs-rail` handle in `packages/tui/src/ui/pane-resize-handle.tsx` + `pane-resize.ts`, state in `packages/tui/src/context/session-tabs.tsx` / `session-tabs-model.ts` / `session-retention.ts`. Config block `tabs` in `packages/tui/src/config/index.tsx` (mode auto/on/off, enabled legacy, scope global/cwd, layout horizontal/vertical, indicators status/numbers). Keybinds: 10 select slots, next/previous, next/previous_unread, close, reopen (ctrl+shift+t), history back/forward.
- **what:** Session tabs work as a horizontal strip or a vertical sidebar, with a drag-to-resize handle, per-tab unread markers, tab history (back/forward), quick-switch slots 1-10, pin, and a scope that can be global or per-working-directory.
- **how:** App root renders `<SessionTabs orientation="vertical" width={tabsResize.size()} />` beside the main column when `verticalTabsVisible()`, and `<SessionTabs />` above it when `tabsVisible() && !tabsVertical()`; a separate layer (app.tsx:1245) is gated on `sessionTabs.enabled` so tab bindings and pinned-session bindings are mutually exclusive. `PaneResizeHandle` is positioned at `tabsResize.size() - 1` on mouse drag.
- **solves:** Multi-session work is the normal case for a coding agent; a single-session screen forces context switching via the session list. Scope-aware tabs (global vs per-cwd) resolve the "my terminal tabs should follow my directory" tension.
- **port effort:** Medium. The interaction model (unread, history, quick slots, scope) is portable; the 1779-line component is not worth copying. | **idea only:** True

## opencode.47 Full-screen diff viewer with file tree, hunk navigation, and review marking

- **where:** `packages/tui/src/feature-plugins/system/diff-viewer.tsx` (1225), `diff-viewer-file-tree.tsx` (271), `diff-viewer-file-menu.tsx`, `diff-viewer-image.tsx`, `diff-viewer-file-tree-utils.ts`; `packages/tui/src/component/patch-diff.tsx` (228). Keybinds `diff.*` in `packages/tui/src/config/keybind.ts:63-84`; config block `diffs` in `packages/tui/src/config/index.tsx` (source, wrap word/none, tree, single, view auto/split/unified).
- **what:** A dedicated diff surface: 21 keybinds covering navigation (line/page/half-page, first/last, gg/G), hunk jumping (`]`/`[`), file jumping (`n`/`p`), split-vs-unified toggle (`v`), single-patch mode (`s`), source switch (`d`), file tree toggle (`b`), and per-file "mark reviewed" (`m`). A file menu, file tree, and image viewer are separate components.
- **how:** `/diff` slash command (diff-viewer.tsx:1184) opens it; `view: "auto"` picks split or unified from available width. `mark_reviewed` per file is the notable bit: it turns the diff into a review checklist rather than a read-only artifact.
- **solves:** Reviewing an agent's 20-file change inside a chat transcript is unusable. Split/unified + hunk/file navigation + a review checkbox is the vim-diff muscle memory, brought into the agent loop.
- **port effort:** Medium-high. The keymap vocabulary (21 bindings) and the `mark_reviewed` concept are the portable ideas. | **idea only:** True

## opencode.48 `/btw` — a side question that does not enter the conversation

- **where:** `packages/tui/src/feature-plugins/prompt/btw.tsx` (172 lines). Command id `session.aside`, keybind `<leader>`-less `"none"`, slash `/btw` with `arguments: true`, palette group "Session".
- **what:** A one-shot question answered from the session's existing context, whose answer is never added to the transcript. The whole command is 172 lines.
- **how:** Calls `session.generate` with a fixed instruction prefix: "The user is asking a quick side question about the conversation so far. Answer directly and concisely in markdown from what you already know. Do not call any tools and do not take any actions." (comment explains why: `session.generate` exposes the tools but runs no tool loop, so a tool call would surface as an empty answer). A spinner renders into `prompt.footer.status` while pending; the answer shows in a dialog with copy. Refuses with a toast if no session is open.
- **solves:** "What file does X live in?" is a question about the conversation, not a task. Without this, asking pollutes the transcript, spends a turn, and can derail the agent's plan.
- **port effort:** Low. ~150 LOC and one server call. High value per line. | **idea only:** True

## opencode.49 Background service lifecycle as a first-class CLI surface

- **where:** `packages/cli/src/commands/commands.ts` (`Spec.make("service", ...)`); handlers in `packages/cli/src/commands/handlers/service/`; connection resolution in `packages/cli/src/services/server-connection` (imported by `handlers/default.ts` and `handlers/mini.ts` as `ServerConnection.resolve({server, standalone, mismatch: "replace", onStart})`).
- **what:** `opencode service` manages a background server with 7 subcommands (start/restart/status/stop/get/set/unset) where `get`/`set`/`unset` operate on both service settings AND environment variables (nested `env-value` argument). `--standalone` runs a private server instead; `--server URL` attaches to an existing one. Version mismatch triggers an automatic restart with a preflight updater.
- **how:** `ServerConnection.resolve` yields a queue of `{reason: "missing" | "version-mismatch", previousVersion?}`; on mismatch the preflight starts the updater, writes "Restarting background server (version mismatch)..." to stderr, and forks the new version. `onStart` is the single hook every entrypoint (default TUI, mini, run) shares.
- **solves:** A coding agent that takes 2s to boot is unusable in a terminal loop. A persistent server makes startup instant, but then version skew, orphan processes, and "which server am I talking to" become real problems that need their own commands.
- **port effort:** Medium. The command surface and the shared resolve-with-mismatch policy are portable; the daemon implementation is substantial. | **idea only:** True

## opencode.50 Self-describing config with per-field descriptions that feed `--help` and the schema

- **where:** `packages/tui/src/config/index.tsx:66-246` (the `Info` struct). CLI: `packages/cli/src/commands/commands.ts` (532 lines). Project config schema: `packages/core/src/config.ts`; protocol config groups in `packages/protocol/src/groups/config.ts`.
- **what:** The TUI config is a single typed schema (17 top-level keys, 65 nested optional leaves) where every field carries `.annotate({description: "..."})`. The CLI command tree is likewise built from a typed `Spec` DSL (`Spec.make(name, {description, aliases, params})` with `Flag.withDescription` / `Argument.withDescription` / `Flag.withAlias`).
- **how:** Schema description annotations are the single source of truth; `TuiKeybind.KeybindOverrides` is itself generated from the `Definitions` table (`Object.entries(Definitions).map(([name, item]) => [name, Schema.optional(BindingValueSchema).annotate({description: item.description})])`), so every keybind in the help text is automatically in the config schema with its own description. `parse()` throws `Unrecognized keybind(s): ...` on unknown keys.
- **solves:** Config help that is written by hand drifts from the schema within a release. Deriving the schema from the same table that drives the help text makes drift structurally impossible.
- **port effort:** Low. The keybind-table-to-schema derivation alone is a small, high-leverage change. | **idea only:** True

## opencode.51 Declined bindings kept as schema no-ops for config backward compatibility

- **where:** `packages/tui/src/config/keybind.ts:78-84` — `diff.toggle`, `diff.expand`, `diff.expand_all`, `diff.collapse`, `diff.switch_focus` (all `"none"`, "Deprecated: file tree is mouse-controlled" / "keyboard navigation always controls the diff").
- **what:** Six `diff.*` bindings that were removed from the UI are retained in the Definitions table bound to `"none"` with explicit "Deprecated:" descriptions, under the comment "Retain shipped configuration names without registering the removed tree navigation commands." Because they remain schema keys, a user's existing `tui.json` still validates.
- **how:** Keeping the key with a `none` default means `parse()` accepts it, the settings UI can still show it, and no runtime binding is registered. Removing the key instead would make every existing user config fail validation on upgrade.
- **solves:** Renaming or removing a keybind silently breaks user configs on upgrade — a common source of "the app won't start after updating" reports.
- **port effort:** Very low. A convention, not code. | **idea only:** True

## opencode.52 Fixture-driven TUI storybook with state-dimension keybindings

- **where:** `packages/tui/src/feature-plugins/system/storybook/` — index.tsx, footer.tsx, one-cell-spinner.tsx, session-tabs.tsx, merman-layouts.tsx, location-missing.tsx, plus `.fixtures.ts` for one-cell-spinner and subcell-spinner. Run via `OPENCODE_STORY=<story-id> bun run dev:live`. Documented in root `AGENTS.md` sections "Live V2 TUI Testing" and "V2 TUI Stories".
- **what:** A built-in storybook inside the TUI itself, reachable as a plugin route, for exploring real components in isolation. Stories render the actual production component, expose meaningful state dimensions through story keybindings, list them in a `StoryFooter`, and provide a reset command.
- **how:** Stories register as plugin routes (`route.data.type === "plugin"` branch in app.tsx:1374 with a `PluginRouteMissing` fallback). `dev:live` discovers the running server via `opencode service status`, injects its credential from `opencode service get password`, and uses the `dev` TUI storage channel so tab state matches the installed client.
- **solves:** TUI layout bugs (narrow terminals, long paths, CJK width) are otherwise only reproducible by driving a live agent. A storybook with explicit state dimensions turns "resize until it breaks" into a repeatable command.
- **port effort:** Medium. The concept plus the `OPENCODE_STORY=<id>` entry point is cheap; the story fixtures are the labor. | **idea only:** True

## opencode.53 Deferred-binding declaration — actions registered without a key

- **where:** `packages/tui/src/config/keybind.ts` — `BindingValueSchema = Schema.Union([Schema.Literal(false), Schema.Literal("none"), BindingItem, Schema.Array(BindingItem)])`; 57 entries use `keybind("none", ...)`. Measured breakdown: 232 total, 57 none, 175 with a real default.
- **what:** 57 of the 232 keybinds default to `"none"`. These are real, dispatched commands with full descriptions that simply have no keyboard binding by default; they surface in the command palette and can be bound by the user. Examples: `help.show`, `session.fork`, `session.copy`, `prompt.stash`, `mcp.list`, `which-key.toggle`, `session.message.next`.
- **how:** `keybind` accepts `false` or `"none"` as valid values, and `createLayer` skips emitting a binding when `command.bind === false` or the resolved config value is empty. The palette still lists the command; `shortcuts.all(id)` returns empty so no key is displayed.
- **solves:** Forces an explicit decision per action (bind it or leave it palette-only) instead of an arbitrary default, and gives a clean "unbound" state that the palette renders honestly rather than showing a wrong key.
- **port effort:** Very low. A convention plus a `none` sentinel in the binding union. | **idea only:** True

## opencode.54 Custom slash commands from markdown files in the project

- **where:** `packages/core/src/command.ts` (106 lines — `Definition`, `Editor`, `NotFoundError`, `ExecutionError`, `Service` with `get`/`list`/`execute`); directory + document loading in `packages/core/src/config/plugin/command.ts` (250 lines, `loadEntry` dispatching on `entry.type === "document" | "directory"`, `ConfigMarkdown`); the on-disk convention is visible in the repo's own `.opencode/command/` directory. Sibling directories in `.opencode/`: `agent/`, `command/`, `glossary/`, `plugins/`, `skills/`, `themes/`, `tool/`.
- **what:** Users add `.md` files under a `command/` directory in their project config; each becomes a slash command with a name, description, and an execution that can shell out or invoke an agent. The command surface is a hot-reloadable service with typed NotFound/ExecutionError variants.
- **how:** A config entry is either a single `document` (one command from the file's frontmatter) or a `directory` (scanned, each file one command). `load` iterates all config entries, `reload` calls `ctx.command.reload()`. The reload feed is a single serialized trigger with one shared debounce window, subscribed before the initial scan so edits racing the scan still trigger a rebuild.
- **solves:** Lets a team encode repo-specific workflows (`/deploy-staging`, `/triage`) as files in version control, discoverable in the same palette and slash system as built-ins.
- **port effort:** Medium. The file convention and the service shape are portable; the template/handlebars execution layer is more involved. | **idea only:** True

## opencode.55 Agent Client Protocol server for editor integration

- **where:** `packages/cli/src/acp/` — 2131 LOC across service.ts (594), tool.ts (212), agent.ts, config-option.ts, connection.ts, content.ts, error.ts, event.ts, permission.ts. Registered as `Spec.make("acp", {description: "Start an Agent Client Protocol server"})` and handled by `packages/cli/src/commands/handlers/acp.ts`.
- **what:** `opencode acp` starts a server speaking the Agent Client Protocol, so the agent can be driven from an editor with session, tool, permission, and content negotiation handled for you.
- **how:** Imports request/response types from `@agentclientprotocol/sdk` 1.2.1 and adapts opencode's client/session/permission model to them, with `withTimestampedFallback` for session titles.
- **solves:** Editor integration is a per-editor protocol implementation; implementing ACP once means every ACP-capable editor works without bespoke work.
- **port effort:** High. Worth adopting the protocol as a target but not worth porting the adapter. | **idea only:** True

## opencode.56 Server-agnostic shell syntax highlighting via tree-sitter

- **where:** `packages/cli/package.json` dependencies: `tree-sitter-bash` 0.25.0, `tree-sitter-powershell` 0.25.10, `web-tree-sitter` 0.25.10. Consumed at `packages/tui/src/mini/scrollback.surface.ts` via `getTreeSitterClient` from `@opentui/core`; grammar wiring in `packages/tui/src/mini/parsers-config.ts`.
- **what:** Bash and PowerShell prompts are highlighted in the TUI using web-tree-sitter with the `tree-sitter-bash` and `tree-sitter-powershell` grammars, loaded through OpenTUI's tree-sitter client.
- **how:** `getTreeSitterClient` returns a `TreeSitterClient`; `entrySyntax` / `entryLook` in `mini/scrollback.shared.ts` select the highlight style for a rendered code block.
- **solves:** Shell output is the highest-volume, lowest-information part of an agent transcript. Proper syntax highlighting makes it skimmable instead of a wall of monospace.
- **port effort:** Low-medium. The grammar choice is a detail; the point is highlighting shell output at all. | **idea only:** True

## opencode.57 Replay-based registry substrate (State.create)

- **where:** packages/core/src/state.ts:160-252 (create), :58-75 (group/disable), :87-111 (batch/shutdown), :129-132 (inherit)
- **what:** State.create(options) is a generic registry where reads REBUILD by replaying every registered transform onto a fresh value from initial(), instead of mutating a shared structure. Scoped registrations remove themselves via Scope.addFinalizer; a rebuild is version-guarded and restarts if a transform triggers a nested change mid-rebuild. group() detaches all of one plugin's registrations synchronously when any of them throws during a rebuild.
- **how:** State.create({name, initial, editor, notify}). Returns {get, invalidate, revision, transform, reload}. transform() is an Effect that yields Scope.Scope, adds a finalizer, and bumps a version counter. get() loops: snapshot version -> initial() -> editor -> replay all transforms -> if version moved mid-loop, retry.
- **solves:** Makes arbitrary third-party transforms composable and order-independent in effect: plugin A can read what plugin B registered (docs index.mdx:122-127 says reads reflect every registration so far, including during setup), and disposal of one plugin's registration cleanly reveals the definition it was overriding, with no rollback bookkeeping.
- **port effort:** High. Requires restructuring omp's registries from mutation to replay. The payoff is the composability + safe-dispose semantics, which omp currently lacks everywhere. | **idea only:** True

## opencode.58 Content-addressed plugin activation with prefix preservation and fallback

- **where:** packages/core/src/plugin.ts:105-175 (activate), :250-263 (Slot/Activation types)
- **what:** The plugin registry's activate() diffs the requested ordered list against the running one on (id, revision). The first index where either differs is the cut point: everything before it stays alive (only its definition is refreshed), everything from it on has its Scope closed in reverse order and is reloaded. A slot whose previous activation FAILED and whose revision is UNCHANGED is carried forward without retry. If a new revision fails to load, the previous working generation is reloaded and stays active while the new error is recorded.
- **how:** const changed = definitions.findIndex((d,i) => current[i]?.plugin.id !== d.id || current[i].plugin.revision !== d.revision); const prefix = changed === -1 ? definitions.length : changed; then State.batch(...) closes slices(prefix).toReversed() and loads slices(prefix) in order.
- **solves:** Hot-reload without tearing down the world. Editing one plugin does not disturb the other 87; a broken edit degrades one slot instead of failing the generation. Solves the classic 'my reload broke the whole agent' problem with an index comparison rather than a diff algorithm.
- **port effort:** Medium. Needs a per-plugin revision token and ordered activation. The (id, revision) identity contract and the never-retry-a-failed-revision rule are the two ideas worth taking. | **idea only:** True

## opencode.59 Readiness latch so consumers never observe a torn registry

- **where:** packages/core/src/plugin/service.ts:13-16, :34; packages/core/src/plugin.ts:23-30 (holdUnsafe), :79-95 (activate)
- **what:** Plugin.Service exposes awaitActivation (a Latch) and hold() -> release. Every activation runs inside acquireUseRelease(hold(), ...). Session entry points await awaitActivation before reading commands/skills/hooks/model catalog.
- **how:** pending = Set<token>; hold() adds a token and closes the latch; the returned release deletes it and reopens when the set empties. awaitActivation = ready.await. The supervisor also takes a hold around a whole debounced re-activation.
- **solves:** A cold Location activates plugins asynchronously; without the gate an early request sees an empty registry and admits work the plugins would have shaped. The docstring at service.ts:29-33 says exactly this.
- **port effort:** Low. ~20 lines. Directly portable; omp has the same race whenever config reload is async. | **idea only:** True

## opencode.60 Per-plugin failure isolation across the whole registry

- **where:** packages/core/src/plugin.ts:39-63 (State.group wiring), :170-207 (pendingFailures worker), :281-300 (slotInfo)
- **what:** Two distinct failure paths, both isolated. (1) setup() fails -> the slot records the error, the generation survives, and the previous working generation is restored. (2) a transform throws LATER during a replay rebuild -> State.group() detaches all of that plugin's registrations synchronously, the registry queues a PendingFailure, and a dedicated worker closes the plugin's Scope and marks it disabled with 'Plugin disabled after {state}.transform failed'.
- **how:** load() wraps plugin.effect(...) in State.group((failure, refresh) => Queue.offerUnsafe(pendingFailures, {plugin, scope, failure, refresh, ref, release: holdUnsafe()})). A separate Effect.forever worker drains the queue, logs, re-runs refresh inside State.batch, publishes, and closes the scope via Effect.ensuring.
- **solves:** A plugin whose data becomes invalid at runtime (not just at load) cannot permanently poison the tool/model/command registries, and the plugin is reported as failed rather than silently contributing nothing.
- **port effort:** Medium. The idea of grouping a plugin's registrations so one bad transform disables exactly that plugin is the transferable part. | **idea only:** True

## opencode.61 Duplicate plugin ID degrades instead of killing the generation

- **where:** packages/core/src/plugin/supervisor.ts:96-110; guarded set at internal.ts:271-273; test at packages/core/test/plugin/supervisor.test.ts:80
- **what:** Registry.activate() dies on a duplicate ID, which would drop the whole generation including all 88 built-ins. The supervisor therefore pre-deduplicates: it keeps the first occurrence in boot order and reports later ones as ordinary 'failed' plugin entries with error 'Duplicate plugin ID: X'.
- **how:** const duplicate = (plugin, index) => ordered.findIndex((other) => other.id === plugin.id) !== index; return { plugins: ordered.filter((p,i) => !duplicate(p,i)), failures: [...failures, ...ordered.filter(duplicate).map(...)] }
- **solves:** A user installing a plugin whose ID collides with a built-in cannot brick the agent.
- **port effort:** Low. Small, high-value hardening. | **idea only:** False

## opencode.62 Config-string opt-out grammar with two hard-guarded IDs

- **where:** packages/core/src/config/plugin/source.ts:113-120 (parse), packages/core/src/plugin/supervisor.ts:26-27,38-45 (matches + guarded), packages/core/src/plugin/internal.ts:271-273; docs services/www/src/docs/content/plugins.mdx:68-82
- **what:** `plugins` entries are processed in order; a `-` prefix removes, `*` removes all, `prefix.*` removes by prefix, and a later bare ID re-enables. Two built-ins ignore removal so a repo cannot switch off org policy: opencode.config.policy and opencode.provider.opencode (the Console connection that delivers policy statements).
- **how:** const matches = (selector, target) => selector === '*' || (selector.endsWith('.*') ? target.startsWith(selector.slice(0,-1)) : selector === target); filter(!PluginInternal.guarded.has(plugin.id))
- **solves:** Lets a project neutralize built-ins it does not want (30 providers) with one config line, while making managed policy non-optional.
- **port effort:** Low. ~15 lines plus a guard list. omp has no equivalent per-internal opt-out. | **idea only:** True

## opencode.63 Pre/post activation layering so user config always wins

- **where:** packages/core/src/plugin/internal.ts:214-269, packages/core/src/plugin/supervisor.ts:138-152
- **what:** Built-ins activate in `pre` (infrastructure + all tools + all providers); every config adapter activates in `post`, after all user plugins. SDK- and instance-contributed plugins append to `pre` with the comment that later activation can override earlier container writes, so an instance's explicit choices beat globals.
- **how:** const ordered = [...pre.filter(enabled), ...packages.values().filter(enabled), ...post.filter(enabled)]
- **solves:** A user's opencode.json always overrides built-in defaults without the built-ins needing to know users exist.
- **port effort:** Low. Ordering discipline, not code. | **idea only:** True

## opencode.64 11 runtime hooks with a typed failure channel

- **where:** packages/plugin/src/promise/session.ts:138-151, packages/plugin/src/promise/tool.ts:38-72, packages/plugin/src/promise/permission.ts:18-24; impl packages/core/src/plugin/hooks.ts
- **what:** session.hook(name, cb, {providerID?}) covers prompt, context, compaction, generate, title, model.request, http.request, http.response, retry, and 3 experimental WebSocket hooks. Events are owned mutable drafts: set event.result to skip the model call entirely (compaction/title), mutate event.tools to remove tools, mutate event.request/response for native HTTP, and event.frame for WebSocket. tool.hook covers execute.before/after; permission.hook('evaluate') can change effect to allow/ask/deny; shell.hook('create.before') edits command/cwd/timeout/env.
- **how:** ModelHooks<Spec> = (name, cb, options?: {providerID?}) => Promise<Registration>. Provider scoping is implemented by a runtime filter in trigger() (hooks.ts:90) that reads event.model.providerID.
- **solves:** Covers the whole request lifecycle (admission -> assembly -> dispatch -> wire -> response -> retry) with one uniform registration shape, and lets a plugin REPLACE work (set result) rather than only observe it.
- **port effort:** High. The WebSocket frame hooks and the http.request/response pair are the ambitious parts; the retry-override hook and the execute.before failure channel are cheap and high value. | **idea only:** True

## opencode.65 Only one hook may reject, and it is the pre-execution one

- **where:** packages/core/src/plugin/hooks.ts:21-30, :88-95
- **what:** hooks.ts declares a per-domain failure channel via a mapped type. All are NoFailures<...> (never) except tool execute.before, which may fail with Tool.Error to reject the call before it runs. trigger() awaits each callback sequentially in registration order.
- **how:** type NoFailures<Spec> = { readonly [Name in keyof Spec]: never }; interface Failures extends Record<keyof Domains, unknown> { readonly tool: ToolFailures; ... }
- **solves:** Typing the blast radius of every hook at compile time: you cannot accidentally give a telemetry hook the power to abort a model request.
- **port effort:** Low. The type trick alone is ~10 lines and immediately clarifies a hook API's contract. | **idea only:** True

## opencode.66 Typed RPC: plugins publish methods and events other plugins/clients call

- **where:** packages/plugin/src/promise/rpc.ts, packages/plugin/src/effect/rpc.ts, packages/plugin/src/rpc.ts, adapter at packages/plugin/src/promise/adapter.ts:77-120; docs services/www/src/docs/content/build/plugins/rpc.mdx
- **what:** ctx.rpc.register(definition, handlers) publishes a typed method set plus an event channel. Definitions validate with JSON Schema or any Standard Schema validator (Zod/Valibot/ArkType). The plugin's package can export a separate ./rpc subpath so consumers import the contract WITHOUT loading the implementation.
- **how:** Rpc.define({id, methods: {name: {input, output, errors}}, events: {name: {schema}}}). Handlers receive (input, {signal, error}). RpcRegistration has dispose() and events.emit(). A ./rpc export map entry is a separate entrypoint, resolved independently by Host.resolve.
- **solves:** Lets plugins interoperate without sharing a package, and lets a consumer depend on a plugin's contract without pulling in its dependencies or side effects.
- **port effort:** High. Full RPC layer. The contract-only ./rpc subpath idea is cheap and worth stealing on its own. | **idea only:** True

## opencode.67 Per-plugin namespaced durable storage with hex-encoded keyspace

- **where:** packages/core/src/plugin/host.ts:584-611, contract at packages/plugin/src/storage.ts
- **what:** ctx.storage.get/set/remove/scan({prefix, after, limit}). Keys are namespaced by encoding every char of the plugin id to 4-hex-digit codepoints, so no plugin id (including ones with ':' or '/') can collide with or escape another plugin's keyspace. scan() transparently strips the namespace from keys and cursors.
- **how:** const namespace = 'plugin:' + pluginID.split('').map(v => v.charCodeAt(0).toString(16).padStart(4,'0')).join('') + ':'
- **solves:** Plugin isolation of persisted state without a real security boundary and without a reserved-character problem.
- **port effort:** Low. ~25 lines. The hex encoding is a neat trick; the cursor-transparent prefix stripping is the practical part. | **idea only:** False

## opencode.68 Transform digest-fingerprinted hot reload of a plugin's transitive import graph

- **where:** packages/plugin/src/source.bun.ts, packages/plugin/src/source.ts, packages/plugin/src/source.node.ts, packages/plugin/src/source.package.ts; wired in packages/core/src/plugin/module.ts:22-38
- **what:** For local plugins, the loader walks the entrypoint's ENTIRE transitive local import graph using Bun.Transpiler().scan(), sha256-digests every file (directories: sorted readdir), and re-imports only when a digest actually changed. Failed modules are cached BEFORE evaluation so import-time side effects do not repeat on every filesystem event. Missing local deps are watched as directories so creating them triggers recovery; missing package deps resolve to a tracked target.
- **how:** createPluginSources(watch) -> read(entrypoint): if every tracked digest is unchanged, return the cached module. Otherwise visit(root) recursively, delete require.cache[file] (and file+search), and track() each. watchTarget() recurses to the nearest existing ancestor when a path is missing.
- **solves:** Editing a helper file inside a plugin actually reloads the plugin, and a burst of fs events for unchanged content costs nothing.
- **port effort:** High (Bun.Transpiler is Bun-only), Medium for the digest-cache part on Node. The idea that the reload unit is the import GRAPH, not the entry file, is the takeaway. | **idea only:** True

## opencode.69 Revision derived from content mtime, not a counter

- **where:** packages/core/src/config/plugin/source.ts:173-186, packages/core/src/plugin/module.ts:123
- **what:** For a local plugin the operation carries mtime = max(mtime of all resolved entrypoints + the plugin's package.json). The generation's revision is JSON.stringify([operation, loaded.version]), so touching any file in the graph changes the revision, which is exactly what makes the prefix-preserving diff reload it.
- **how:** const times = await Effect.forEach([...Object.values(entrypoints)..., path.join(dir,'package.json')], entry => fs.stat(entry).map(info => Option.getOrElse(info.mtime, () => new Date(0)).getTime()).orElseSucceed(() => 0)); return [{...operation, mtime: Math.max(...times)}]
- **solves:** Ties the generic (id, revision) reload contract to real content change without a per-plugin version declaration.
- **port effort:** Low. Small, and it is what makes capability #2 work for local plugins. | **idea only:** True

## opencode.70 Plugin package layout resolved into three independent entrypoints

- **where:** packages/plugin/src/host.ts:17-44, packages/core/src/plugin/module.ts:94-100, packages/core/src/config/plugin/source.ts:164-172
- **what:** A plugin directory resolves to up to three entrypoints: server, tui, rpc. Subpath order is server->index, then tui, then rpc; resolution failures are tolerated only for a fixed set of module-not-found error codes, so a genuine error inside a plugin still throws. A local plugin's resolved entrypoint must pass a containment check (FSUtil.contains(root, server)) or it is dropped.
- **how:** return { server: entry(['server','']), tui: entry(['tui']), rpc: entry(['rpc']) } inside a try/catch that swallows only ENOENT|ENOTDIR|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_UNSUPPORTED_DIR_IMPORT.
- **solves:** One package can supply a server plugin, TUI extensions, and a shared contract independently; the client decides which it needs. The path-containment check stops a configured plugin directory from pointing its entrypoint outside itself.
- **port effort:** Low for the multi-entrypoint idea; the error-code allowlist and the containment check are both small and worth copying. | **idea only:** True

## opencode.71 Trust boundary implemented as a swappable layer node

- **where:** packages/server/src/workerd.ts:79-90, ConfigPluginSource.empty at packages/core/src/config/plugin/source.ts:101-110
- **what:** The workerd (Cloudflare Durable Object) profile replaces ConfigPluginSource.node with ConfigPluginSource.empty, so ONLY internal and SDK plugins load — no plugin-directory scan, no npm install, no import of plugin code from disk. The same file replaces Database, Snapshot, Vcs, FileSystem, Pty, and the process spawner.
- **how:** ConfigPluginSource.node.replace(ConfigPluginSource.empty) inside a LayerNode.Replacements array. `empty` is a second exported node whose operations() returns [] and changes() returns Stream.never.
- **solves:** 'Do not load untrusted plugins' is one line in a dependency-injection graph instead of a security check threaded through the loader.
- **port effort:** Medium. Requires the DI-graph discipline; the payoff is that sandboxing is a config decision, not a code path. | **idea only:** True

## opencode.72 Debounced, coalesced, serialized plugin re-activation

- **where:** packages/core/src/plugin/supervisor.ts:196-237
- **what:** Six trigger streams (config source changes, module-graph changes, a 24h tick, bus plugin.updated + sdk.plugin.updated, update-service changes) feed a sliding Queue of size 1. The initial activation runs immediately; later triggers are debounced 100ms. A single consumer serializes them. A generation counter discards stale async update-check results, and a hold/release brackets each activation.
- **how:** Stream.concat(Stream.succeed(0), Stream.fromQueue(triggers).pipe(Stream.debounce('100 millis'))).pipe(Stream.runForEach(target => { yield* activate(); if (observed !== target) return; const settled = release; release = undefined; if (settled) yield* settled }))
- **solves:** Saving a config file that touches 40 plugins triggers one re-activation, not 40; and a slow periodic update check cannot land on top of an in-flight reload.
- **port effort:** Low. Standard debounce+coalesce, but the 'run initial activation immediately, debounce only later' split and the observed-counter guard are the details that matter. | **idea only:** True

## opencode.73 Two-phase activation: load what is local, then install what is missing

- **where:** packages/core/src/plugin/supervisor.ts:154-174, :58-88
- **what:** resolve() is called twice: first with install:false so everything already available activates immediately; only if any operation came back `pending` (a package not yet installed) is it called again with install:true. A failed reload keeps the previously running generation in place rather than dropping the plugin.
- **how:** const immediate = yield* resolve(modules, pre, post, operations, false, running); yield* apply(immediate); const resolved = immediate.pending.length ? yield* resolve(modules, pre, post, operations, true, running) : immediate; if (resolved !== immediate) yield* apply(resolved); running = resolved.packages;
- **solves:** Startup does not block on npm install for plugins you already have; a broken new revision does not evict a working one.
- **port effort:** Medium. The 'activate local first, install in background' split is a startup-latency decision worth copying. | **idea only:** True

## opencode.74 Tool snapshot immutability under concurrent transforms

- **where:** packages/tui/../packages/core/src/tool.ts (snapshot()), tool namespace in packages/plugin/src/promise/tool.ts:26-36, host.ts:453-458; documented at services/www/src/docs/content/build/plugins/index.mdx:971-977
- **what:** Each model request captures a stable, executable tool snapshot (Tool.Service.snapshot()). Later transforms, reloads, and disposals affect only future snapshots, never the executors already captured. Namespaces prefix tool names (acme_greeting); dots and unsupported characters in namespaces become underscore.
- **how:** Because State.get() returns a NEW value per rebuild and never mutates earlier ones, a snapshot is just a retained reference. This falls out of the replay design rather than needing separate copy logic.
- **solves:** A plugin editing the tool registry mid-turn cannot change the tool set of a request already in flight.
- **port effort:** Low given the replay substrate; High if built on a mutating registry. The dependency on capability #1 should be explicit. | **idea only:** True

## opencode.75 TUI slot tree with five placements and deterministic degradation

- **where:** packages/plugin/src/tui/context.ts:180-243 (SlotMap, SlotClaim), packages/tui/src/plugin/structure.ts:60-147 (resolveSlots), packages/tui/src/plugin/api.tsx:270-284
- **what:** A SEPARATE plugin system for the terminal UI. ui.slot(claim) with exactly one of prepend/append/before/after/replace against one of 9 published paths. resolution: last-enabled wins per replace target; an ancestor replacement beats a descendant regardless of enable order ('hierarchy beats timeline'); claims inside a replaced boundary are SUPPRESSED AND RECORDED (never silently dropped); a claim aimed at a vanished path DEGRADES to append on the nearest surviving ancestor, except replacements which are suppressed outright.
- **how:** resolveSlots({paths, claims}) is a pure function — no solid, no I/O — explicitly written so every policy rule is testable as a data transform. Exactly-one-placement is enforced both by a discriminated union (?: never) and at runtime for untyped plugins.
- **solves:** Third-party UI extensions cannot corrupt the host layout, and cannot silently vanish: suppressed and degraded claims are both returned as diagnostics.
- **port effort:** High. Entirely Solid/JSX-specific to opencode's TUI. The pure-resolver-with-diagnostics shape and the degradation rule are the transferable ideas. | **idea only:** True

## opencode.76 TUI plugin context with per-activation disposal ownership

- **where:** packages/tui/src/plugin/api.tsx:81-288; public contract at packages/plugin/src/tui/plugin.ts and packages/plugin/src/tui/context.ts (532 lines)
- **what:** createPluginContext builds the whole TUI API from host services, pushing every registration's unregister onto an `owned: Dispose[]` array that is drained when the activation is disposed. Surfaces: client, data, attention, theme, keymap (layer/dispatch/shortcuts/commands/pending/active/mode), storage (namespaced plugin.<id>.<key>), markdown.registerCodeBlockRenderer, ui.dialog (alert/confirm/prompt/select), ui.toast, ui.router.register, ui.panel.open, ui.tabs, ui.model, ui.slot.
- **how:** const registration = (kind, name) => { let registered = true; const unregister = () => { if (!registered) return; registered = false; if (!input.registry.active()) return; input.registry.remove(kind, name) }; input.owned.push(async () => unregister()); return unregister }
- **solves:** A TUI plugin that throws during setup still unregisters everything it managed to register, and unregistering after deactivation is an explicit no-op rather than a race.
- **port effort:** Medium for the ownership-array pattern (portable to any UI plugin API); the specific surfaces are opencode-specific. | **idea only:** True

## opencode.77 A shipped npm package that is itself a built-in plugin

- **where:** packages/plugin-browser/src/index.ts:4-12, imported at packages/core/src/plugin/internal.ts:89 and listed at :217; packages/tui/src/plugin/builtins.ts:12-13
- **what:** @opencode/plugin-browser is a separately published package whose default export is a plugin (`opencode.browser`). It is imported as a value into the internal `pre` array, so it goes through the exact same load/activate/transform path as a user plugin. TUI does the same with @opencode/latex/plugin and @opencode/merman/plugin.
- **how:** import BrowserPlugin from '@opencode/plugin-browser'  ->  BrowserPlugin,  in the `pre` array
- **solves:** Proves the plugin boundary is real rather than aspirational: the maintainers ship first-party functionality through it, so the seam is exercised in CI.
- **port effort:** Low. The discipline is the point. | **idea only:** True

## opencode.78 One npm package, two isomorphic API flavours over the same 25 domains

- **where:** packages/plugin/src/promise/plugin.ts vs packages/plugin/src/effect/plugin.ts, packages/plugin/src/promise/adapter.ts (622 lines), packages/plugin/AGENTS.md
- **what:** @opencode/plugin exports both a Promise API (the default) and an Effect API (./effect) with structurally identical Context shapes. Promise plugins are lifted by an adapter (PluginPromise.fromPromise) into the Effect runtime, which is what actually runs. AGENTS.md states the rule: every domain must extend the corresponding client API interface and only add plugin-specific functions.
- **how:** packages/core/src/plugin/internal.ts:280-284 wraps each internal plugin's effect with Effect.provide(context); module.ts:116 picks `"effect" in value ? value : PluginPromise.fromPromise(value)`.
- **solves:** Third parties write ordinary async TypeScript; the runtime stays Effect-only internally. Disposal, event streams, and AbortSignal all bridge correctly (verified by promise-tool.test.ts, which asserts a Promise tool executor's AbortSignal aborts on Fiber.interrupt).
- **port effort:** High. The dual-flavour surface is a maintenance tax; the rule that domains extend the HTTP client interface (so plugin methods and client methods cannot drift) is the cheap, high-value part. | **idea only:** True

## opencode.79 Plugin inventory as a first-class observable with failed slots retained

- **where:** packages/schema/src/plugin.ts, packages/core/src/plugin.ts:118-127 and :281-292, packages/core/src/plugin/host.ts:419-421
- **what:** ctx.plugin.list() returns Plugin.Info[] covering built-in, package, local, and sdk sources, each with {id, source{target,version,outdated,updating}, features{server,tui,rpc}, state{active|failed{error,ref}}}. Failed setups are kept as entries, not dropped. The registry short-circuits when the recomputed inventory JSON is byte-identical, so a no-op re-activation publishes no event.
- **how:** if (JSON.stringify(inventory) === JSON.stringify(nextInventory)) return  // then bus.publish(Plugin.Event.Updated, {})
- **solves:** Users can see which plugins are active, which are outdated, and which failed and why, without a debug flag. The JSON short-circuit avoids a UI re-render storm.
- **port effort:** Low. The inventory-as-public-API decision is worth copying even without the Effect substrate. | **idea only:** False

## opencode.80 Plugin management CLI treats Server and TUI as separate runtimes

- **where:** packages/cli/src/commands/handlers/plugin/{add,remove,list,check,update,inventory}.ts, inventory.ts:10-27
- **what:** opencode plugin add|list|check|update|remove. `check` and `update` iterate items tagged runtime:'Server' | 'TUI', matching a package's resolved entrypoints to decide which runtime(s) it serves. Local plugins and exact package revisions are skipped by update.
- **how:** const entrypoints = Host.resolve(installed); const target = configurationTarget(entrypoints.server, entrypoints.tui)
- **solves:** Because there are two plugin systems, a user must be able to see which one a given package actually installed into.
- **port effort:** Low. Directly useful if omp ever has a TUI and a headless mode with separate extension channels. | **idea only:** True

## opencode.81 MCP client (stdio + streamable HTTP + OAuth)

- **where:** packages/core/src/mcp/{index.ts 830, client.ts 338, stdio.ts 177, instructions.ts 111} = 1962 LOC
- **what:** Location-scoped MCP client over @modelcontextprotocol/client v2. Supports 2 transports (local stdio via command array, remote via url+headers) and 3 protocol-negotiation modes (legacy <=2025-11-25, auto-probe 2026-07-28, forced 2026-07-28). 3-phase timeouts: startup 30s, catalog 30s, execution 12h. 5 statuses. Full resource model (Resource/ResourceTemplate/ResourceCatalog).
- **how:** One `Mcp.Service` per Location; a `State.Transformable<Editor>` registry (list/get/set/update/remove) of ServerConfig; one stable tool transform that reads latest discovered tools, refreshed by a 100ms-debounced `McpEvent.ToolsChanged` subscription calling `tools.reload()` rather than re-registering (preserves later plugin override precedence). Shared remote endpoints gated by a `KeyedMutex` so concurrent startup bursts don't stampede.
- **solves:** Scales to many MCP servers without re-registering the tool registry on every tools/list change, and without one startup burst per duplicate remote URL.
- **port effort:** medium — the layering is Effect-heavy (Latch, KeyedMutex, Semaphore, PubSub.sliding + debounce); omp uses plain TS. The 3-phase timeout split and the debounced-reload-instead-of-re-register trick are the portable parts. | **idea only:** True

## opencode.82 MCP OAuth with credential-backed token store

- **where:** packages/core/src/mcp/oauth.ts (506 LOC) + packages/core/src/credential.ts + credential/sql.ts
- **what:** Full OAuth client-provider implementing discovery, authorization-code flow with a configurable callback port, and token persistence that round-trips through the global credential store rather than a process-local cache.
- **how:** `provider(options): OAuthClientProvider` with `Store` (client-info + tokens + code-verifier) and `clientFromCredential` / `toCredential` / `toTokens`; remote servers registered as OAuth integrations get an `integrationID` on the Server entry so clients match by identity rather than by colliding name.
- **solves:** MCP remote auth survives restarts and name collisions; `needs_auth` is a first-class status, not an error string.
- **port effort:** medium — omp has its own credential plumbing; the identity-not-name matching rule is the idea worth taking. | **idea only:** True

## opencode.83 MCP tools as namespaced registry entries

- **where:** packages/core/src/tool/mcp.ts:17-19 (namespace/name fns), :50 (codemode: tool.codemode !== false)
- **what:** Each discovered MCP tool becomes a registry entry named `<server>_<tool>` with the non-alphanumeric chars of the server name replaced by `_`. Defaults into CodeMode unless the server sets `codemode: false`.
- **how:** Single `tools.transform` adding every discovered tool, each with a `permission.assert` before `mcp.callTool`; NotFoundError/ToolCallError mapped to `ToolFailure`; binary content parts become `data:` file parts; when the server declares no outputSchema, text starting with `{`/`[` is JSON.parse'd.
- **solves:** N namespaced tools from N servers without name collisions and without a per-server dispatch branch.
- **port effort:** low — the namespacing + refresh strategy is directly portable; the Effect plumbing is not. | **idea only:** True

## opencode.84 MCP resource read/list as first-class tools

- **where:** packages/core/src/tool/plugin/mcp-resource.ts (101 LOC), plugin id `opencode.tools.mcp-resources`
- **what:** Two tools — `list_mcp_resources` (optional per-server filter; omitting it checks every server so per-server permission rules still apply) and `read_mcp_resource` (server+uri, promotes image/* and application/pdf blobs to model-visible file parts).
- **how:** Permission asserts use `resources:[servers]` for list and `[server:uri]` for read; over-sized output is truncated with the full content written to a file the model can then read.
- **solves:** Lets the model reach MCP resources (docs, records, custom-scheme URIs) without a separate tool per resource kind, and keeps permission granularity per-URI.
- **port effort:** low | **idea only:** True

## opencode.85 MCP server instructions injected as delimited system content

- **where:** packages/core/src/mcp/instructions.ts (111 LOC)
- **what:** Per-server `instructions` are wrapped in `<mcp_instructions><server name="...">...</server></mcp_instructions>` and injected into the session context; CodeMode servers additionally get the line telling the model to reach them via `execute` -> `tools[namespace]`.
- **how:** `Instructions.diffByKey` renders additions/removals as small deltas and only restates the full list when something changed.
- **solves:** Keeps prompt tokens stable across reconnects; a flaky MCP server that reconnects repeatedly does not rewrite the whole instruction block each time.
- **port effort:** low | **idea only:** True

## opencode.86 CodeMode — collapse N tools into one `execute` tool running a sandboxed JS interpreter

- **where:** packages/codemode/ (10,764 LOC) + packages/core/src/codemode/{tool.ts, catalog.ts, instructions.ts, web.ts}
- **what:** A 10.8k-LOC JS interpreter (interpreter 4729 + stdlib 3565 + openapi 1294) with 20 test262 conformance suites. Every `codemode: true` tool is invoked as `tools.<namespace>.<tool>(input)` from model-written JS, and the whole set collapses to ONE native tool named `execute` returning `{output, toolCalls, error?, files}`.
- **how:** `CodeModeTool` builds a nested Tool/Namespace tree, emits TypeScript-style signatures into the prompt, and `codemode/catalog.ts` summarizes the inventory under a 2000-char inline budget, keeping every namespace visible and spending the rest on one full listing per namespace per round (shortest first).
- **solves:** A 60-tool agent does not need 60 native tool schemas in every request.
- **port effort:** very high — 10.8k LOC plus a JS interpreter is a multi-month build, not a port. Only the budgeted-catalog idea is cheap. | **idea only:** True

## opencode.87 models.dev as the model catalog, committed as a snapshot

- **where:** packages/core/src/models-dev.ts (453 LOC) + models-dev/snapshot.txt (4.9 MB)
- **what:** 223 providers / 8179 models in a 4.9 MB committed `snapshot.txt`, with live refresh, Schedule, Semaphore and content hashing. Per-model facts include family, release date, attachment/reasoning flags, reasoning-options shape (effort ladder / toggle / budget_tokens), temperature support, tool_call, interleaved-thinking, 4-way modality input/output, cost (incl. cache read/write, tiered >200k context, context_over_200k) and limits.
- **how:** `import snapshotText from "./models-dev/snapshot.txt" with { type: "text" }` so the catalog ships in the binary; live fetch is hashed and reconciled against the snapshot.
- **solves:** Model metadata works offline and in compiled binaries without a network round-trip.
- **port effort:** medium — the snapshot-as-asset idea is directly portable; the schema is much richer than omp's models.json. | **idea only:** True

## opencode.88 Provider split: wire adapters vs. wiring plugins

- **where:** packages/ai/src/providers/ (43 modules) + packages/core/src/plugin/provider/ (34 plugins)
- **what:** Two independent registries. 43 wire-protocol adapters in packages/ai/src/providers/ (auth + request shape + response parse), and 34 wiring plugins in packages/core/src/plugin/provider/ (OAuth flow, dynamic model lists, endpoint discovery). 63 protocol files totalling 13,228 LOC.
- **how:** Adapters compose: e.g. zai, zai-coding-plan, moonshot, minimax, meta, alibaba, openai each ship a chat/messages/responses triple over a shared base. Local/self-hosted runtimes (ollama, lmstudio, vllm, digitalocean, modal, nvidia) are plugins, not adapters.
- **solves:** Adding a provider with an unusual request shape does not touch the auth/discovery layer and vice versa.
- **port effort:** high — this is a large surface, but the two-registry split is a clean idea omp could adopt. | **idea only:** True

## opencode.89 Runtime npm provider loading

- **where:** packages/core/src/plugin/provider/sdk-factory.ts + dynamic.ts, backed by packages/util/src/npm.ts (20 KB)
- **what:** A configured provider whose `package` is set and whose SDK is not bundled is installed from the npm registry at runtime, then its first `create*` export is used as the SDK factory.
- **how:** `loadSDKFactory` -> `npm.add(packageName)` (with `file://` passthrough, registry/slug parsing, cache keys) -> `resolveModule` -> `importModule` -> first export matching `/^create/`.
- **solves:** New providers ship without a core rebuild or binary re-release.
- **port effort:** medium — the idea is portable but the runtime-install-and-execute posture is a supply-chain decision, not just an engineering one. | **idea only:** True

## opencode.90 Transport abstraction over HTTP and WebSocket for LLM calls

- **where:** packages/ai/src/route/ (3015 LOC: client 699, websocket 526, media 416, executor 274, auth 169, framing 114)
- **what:** A `Transport<Body, Prepared, Frame>` interface with `HttpTransport` and `WebSocketTransport` implementations, plus channel/checkpoint/continuation types (open-responses-channel, responses-checkpoint, responses-continuation).
- **how:** `prepare` then `execute(prepared, request, runtime, options)` returning a `Stream<Frame, AIError>`; `complete?` is the optional successful-consumption ack that HTTP leaves absent.
- **solves:** Providers that keep a socket open (channel-style APIs) reuse the same protocol code as plain HTTP streaming.
- **port effort:** high | **idea only:** True

## opencode.91 SQLite via drizzle with 3 runtime shims + 48 migrations

- **where:** packages/core/src/database/ — schema.gen.ts (raw SQL), migration/ (48 files), sqlite.{bun,node,workerd}.ts
- **what:** 19 tables / 16 indexes. Session state is event-sourced: `session_inbox`, `session_pending`, `event_sequence`, `event`, with delivery/admission/compaction sequence indexes. Credentials live in the `credential` table.
- **how:** Package.json `imports` map resolves `#sqlite` (and `#pty`, `#fff`, `#photon-wasm`, `#shell-parser-wasm`, `#process-lock-ffi`, `#v1-migration`, `#persistent-pty-binary`) per runtime condition (workerd/bun/node). drizzle is wrapped in an Effect layer (`sqlite-core/effect/{select,insert,update,delete,query,raw,count,session}`).
- **solves:** One binary serves CLI, Bun server and Cloudflare Workers; the inbox/pending split gives durable, resumable tool-result delivery.
- **port effort:** medium — omp is Bun-only so the shim layer is unnecessary; the inbox/pending event-sourcing is the interesting part. | **idea only:** True

## opencode.92 Git checkpoint model via tree objects, not stash or commits

- **where:** packages/core/src/git.ts (758 LOC, `Git.Service`); worktree at worktree/git.ts (39 LOC)
- **what:** `tree.capture` writes a Git tree object returning a branded `TreeID`; `tree.diff(from,to)` diffs two TreeIDs; `tree.restore(files)` restores by TreeID. Alongside: repo discover/clone, remote get, history (head/branch/defaultRemoteBranch/rootCommits), sync (fetchRemotes/fetchBranch/checkoutRemoteBranch/resetHard), worktree create/remove/list, and a scoped `index.refresh`.
- **how:** Writes go to the index and a tree object, never to a commit on the user's branch — so agent edits are reversible without polluting history.
- **solves:** Agent-driven edits need undo that does not create commits or stashes in the user's repository.
- **port effort:** medium — the idea is excellent and portable; omp would need a different implementation since `@oh-my-pi/pi-natives/vcs` is the sanctioned wrapper. | **idea only:** True

## opencode.93 Pluggable VCS adapter with a second implementation (Mercurial)

- **where:** packages/core/src/vcs.ts (the service) + plugin/vcs/{git.ts 604, hg.ts 221} + vcs/patch.ts (106)
- **what:** A `Vcs.Adapter` interface (`info`, optional `base`, `branches`, `status`, `diff`) with a registry keyed by provider id, a selectable default, and TWO shipped adapters: git (604 LOC) and hg (221 LOC). Branch refresh is driven by filesystem-watching the store's HEAD/branch file.
- **how:** Each provider shells only read-only commands (git: status, diff, show, config, remote, for-each-ref, merge-base, rev-parse). `diff` output is byte-capped by `MAX_TOTAL_PATCH_BYTES` with per-file `emptyPatch()` substitution past the cap. Provider failures degrade to `[]`/warn-log for info/branches/status but surface as a typed `DiffError` for base/diff.
- **solves:** Diffs/undo work in any VCS the user actually uses, and a broken provider degrades the UI instead of crashing the session.
- **port effort:** medium-high — a genuinely good idea; hg support is a real differentiator. | **idea only:** True

## opencode.94 File-backed shell output with cursor reads and bounded in-memory tail

- **where:** packages/core/src/shell.ts (455) + shell/{scan.ts 1500, parse.ts 373, select.ts 227, result.ts 81} = 2659 LOC
- **what:** Every `create` spawns one command, writes combined stdout/stderr to `sh_<12 hex>*.out`, and returns an id. Clients poll `get`, read `output` by cursor, and `wait` resolves once at a terminal state. 7-day retention, hourly cleanup sweep, 25 exited processes kept in memory.
- **how:** Combined output goes to a file; the tool returns a bounded tail plus the full-output path. Shell parsing is tree-sitter WASM (bash + powershell) with bun/node/workerd shims.
- **solves:** Long builds and dev servers do not blow up the model's context, and the model can still recover the full output.
- **port effort:** low-medium — omp has AGENTS.md-sanctioned output caps already; the cursor-read + file handoff shape is the transferable part. | **idea only:** True

## opencode.95 Desktop-attached browser with a raw TCP tunnel

- **where:** packages/plugin-browser/ (1491 LOC: rpc.ts 560, proxy.ts 327, connection.ts 222, tools.ts 133, tunnel.ts 127, files.ts 109)
- **what:** 39 operations (tabs, preview/navigate/reload/frames/snapshot/find/evaluate/click/fill/fill_form/select/check/press/scroll/wait/screenshot/dialog, files, console, network, trace, cpu, heap, lighthouse) dispatched over RPC to an attached desktop app, plus a 64-connection raw `node:net` tunnel for port-forwarding into the browser's network.
- **how:** Per-`Session.ID` `Attachment{connectionID, state, closed, pending, tunnels}`. Proxy generates 16-byte user + 32-byte password per instance and checks with `timingSafeEqual`. Namespace description tells the model page content/logs/headers are untrusted data, never instructions.
- **solves:** Browser automation without shipping a browser, and without the agent holding CDP credentials.
- **port effort:** high — the desktop-attachment topology is a product decision, not a module. omp has a `browser-use` skill instead. | **idea only:** True

## opencode.96 Effect-based HTTP client binding with runtime-safe deep imports

- **where:** packages/util/src/effect/app-node-platform.ts
- **what:** One `FetchHttpClient.layer` bound to `HttpClient.HttpClient` as a global node, with deep imports instead of the platform barrel because the barrel eagerly pulls undici/ioredis/node:sqlite that workerd cannot load.
- **how:** `makeGlobalNode({service: HttpClient.HttpClient, layer: FetchHttpClient.layer, deps: []})`; same file also binds FileSystem and Path.
- **solves:** One HTTP client for CLI, server and Workers without a per-runtime fork.
- **port effort:** n/a for omp (Bun-only, no Effect) | **idea only:** False

## opencode.97 Typed REST contract with 138 endpoints, dual Promise/Effect clients

- **where:** packages/protocol/src/groups/ (30 groups) + packages/client/src/{promise,effect}/generated + packages/sdk/
- **what:** 30 groups totalling 138 endpoints (65 GET, 48 POST, 15 DELETE, 5 PUT, 5 PATCH), annotated with OpenApi identifiers/summaries, plus a dual-flavor generated client (promise/ and effect/) and an Effect-native `rpc.ts` group.
- **how:** `HttpApiGroup.make(...).add(HttpApiEndpoint.get(...).annotateMerge(OpenApi.annotations({...})))`; codegen limitation documented in-code: "the client codegen flattens payload fields and cannot represent a top-level union payload" — worked around by wrapping in a Struct.
- **solves:** The REST surface and the generated clients cannot drift.
- **port effort:** medium — omp has no Effect HttpApi; the group-per-domain layout is the transferable part. | **idea only:** True

## opencode.98 Integration registry with 4 credential kinds

- **where:** packages/core/src/integration.ts (33 KB) + packages/schema/src/integration.ts + server/src/handlers/integration.ts (11 endpoints)
- **what:** Integrations are typed as `oauth` | `command` | `key` | `env`, each with an attempt lifecycle (pending/complete/failed/expired) recorded with timestamps. Remote MCP servers register here rather than keeping ad-hoc credentials.
- **how:** Credential rows carry `integration_id`, `connector_id`, `method_id`, `active`.
- **solves:** One place to enumerate "what is connected", regardless of whether the secret arrived via OAuth, a CLI command, an API key or an env var.
- **port effort:** medium | **idea only:** True

## opencode.99 5 websearch backends behind one tool

- **where:** packages/core/src/plugin/websearch/ (519 LOC) + core/src/websearch.ts (9.1 KB)
- **what:** exa, firecrawl, tavily, tinyfish and a generic MCP backend behind a single `websearch` tool, with a `parallel` coordinator.
- **how:** Per-provider plugin modules resolved through the same `...WebSearchPlugins` spread in the internal registry.
- **solves:** Swapping search vendors without touching the agent loop.
- **port effort:** low | **idea only:** True

## opencode.100 Effect-service permission ruleset engine

- **where:** packages/core/src/permission.ts (343 lines), schema in packages/schema/src/permission.ts
- **what:** Last-match-wins evaluation over a flat merged ruleset (`findLast` on wildcard action+resource), with an explicit deny pre-pass, a separate always-allow tier, and an in-memory pending-request registry backed by Deferred.
- **how:** `configured()` merges agent rules then session rules (session wins); `denied()` short-circuits on any deny match before allow/ask are considered; `all = [...rules, ...savedRules()]` puts persisted grants last so they win; `create()` publishes `permission.asked` and parks a Deferred the tool call awaits.
- **solves:** Gives one authoritative gate every tool must pass, with a rule format simple enough to put in JSONC and a decision model that is auditable from a single file.
- **port effort:** Medium-high — the shape ports, but Effect's service/layer/Deferred idiom is load-bearing; omp would need a re-implementation in its own runtime. | **idea only:** True

## opencode.101 Reject-cascade and always-cascade

- **where:** packages/core/src/permission.ts:276-292 and :304-318
- **what:** Rejecting one pending request fails every other pending request in the same session; answering "always" re-evaluates all pendings and auto-succeeds those the new grant now covers.
- **how:** The reject branch iterates `pending` and fails every item whose `sessionID` matches; the always branch calls `evaluateInput` per pending and succeeds those returning `allow`.
- **solves:** Parallel tool calls produce concurrent prompts. Without a cascade, rejecting one leaves sibling calls hanging forever with a prompt nobody will ever see.
- **port effort:** Low — ~30 lines of logic, directly portable. | **idea only:** True

## opencode.102 Decline-as-defect tunnel

- **where:** packages/core/src/permission.ts:253, with the rationale written out in the comment at :248-252 and the counterpart documented at packages/core/src/session/model-request.ts:358
- **what:** A user decline is converted into an Effect *defect* (`Effect.die`) rather than a typed failure, so a model's blanket error handler cannot swallow it and turn "I declined" into ordinary tool output.
- **how:** `Effect.catchTag("Permission.DeclinedError", (e) => Effect.die(e))`. A decline WITH feedback stays a typed `CorrectedError` so the leaf can render `ToolFailure` and the model continues.
- **solves:** Distinguishes "the tool failed" from "the human said no" — without it an agent retries a rejected action forever because the refusal reads as a normal error.
- **port effort:** Low as a concept (needs a way to express an uncatchable rejection in omp's runtime). | **idea only:** True

## opencode.103 Two-tier external-directory boundary

- **where:** packages/core/src/file-access.ts:99-148
- **what:** Crossing the project root is its own permission action (`external_directory`) with its own prompt, checked *before* the per-action check, and it inherits no implicit trust.
- **how:** Internal paths get a location-relative resource string and no directory gate; external paths get an absolute `<dir>/*` resource plus a `save` value scoped to the enclosing git project root. `authorizeExternal` batches and dedupes all touched dirs into one prompt.
- **solves:** Makes "read a file outside the workspace" a distinct, single, batchable decision instead of an emergent property of path arithmetic in every tool.
- **port effort:** Medium — the design ports cleanly; note the lexical-vs-physical gap in findings. | **idea only:** True

## opencode.104 Deny-by-default allowlist agents

- **where:** packages/core/src/plugin/agent.ts:106-128
- **what:** The `explore` subagent starts from `{action:"*",resource:"*",effect:"deny"}` and then allowlists exactly what it needs (grep, glob, webfetch, websearch, read, plus subagent deny).
- **how:** Permission.merge of a deny-all rule followed by explicit allows; because evaluation is last-match-wins the allowlist reliably overrides the catch-all.
- **solves:** A read-only subagent stays read-only as tools are ADDED later — new tools inherit the deny, not the allow.
- **port effort:** Low. | **idea only:** True

## opencode.105 Persist-on-always with project scoping and a uniqueness index

- **where:** packages/core/src/permission/saved.ts:63-78, permission/sql.ts:19
- **what:** "Always allow" writes a rule to SQLite keyed by (project, action, resource) with `onConflictDoNothing`, so grants survive restarts and cannot duplicate.
- **how:** The tool supplies a `save: string[]` of patterns; the permission service writes them verbatim as allow rules.
- **solves:** A user does not re-click the same prompt every session. The persistence semantics are the problem — see findings 2 and 3.
- **port effort:** Low as a mechanism; the *granularity* of `save` must be fixed before porting. | **idea only:** True

## opencode.106 HMAC session tokens derived from the server password

- **where:** packages/server/src/auth.ts:39-66
- **what:** Browser sessions are stateless bearer tokens signed with a key derived from the server password, so rotating the password revokes every outstanding session at once.
- **how:** Double HMAC-SHA256 (`password` -> key -> payload), base64url, `expires.signature`; `timingSafeEqual` guarded by an explicit length check; constant-time compare.
- **solves:** Avoids a server-side session store while keeping revocation a one-attribute change.
- **port effort:** Low. | **idea only:** True

## opencode.107 Same-origin guard on cookie auth

- **where:** packages/server/src/middleware/authorization.ts, function `authorizedSessionCookie`
- **what:** Because cookies are scoped by host and not port, a session cookie IS sent to other localhost ports. The middleware explicitly refuses to honor it when the Origin host differs from the Host header.
- **how:** `if (origin !== undefined && URL.parse(origin)?.host !== request.headers.host) return false`, with the cross-port hazard written into a comment.
- **solves:** Closes cookie replay from any other local dev server, which is the single most realistic CSRF vector for a localhost-bound agent server.
- **port effort:** Low. | **idea only:** True

## opencode.108 Single-use scoped tickets for un-headerable transports

- **where:** packages/core/src/pty/ticket.ts, packages/server/src/pairing.ts
- **what:** WebSocket/PTY upgrades cannot carry an Authorization header, so they get short-lived single-use tickets scoped to (ptyID, directory, workspaceID), and pairing links get 5-minute single-use codes.
- **how:** `Cache.invalidateWhen(cache, ticket, stored => matches(stored, input))` gives atomic single-use consumption AND scope checking in one step. Both services pass a `lookup` that calls `Effect.die`, so any misuse of `Cache.get` fails loudly instead of silently returning a miss.
- **solves:** Authenticates a browser-initiated connection that cannot set headers, without a long-lived token and without a ticket usable against a different resource.
- **port effort:** Low — the `invalidateWhen` predicate trick is the reusable part. | **idea only:** True

## opencode.109 Lease credential scrubbed from the tool environment

- **where:** packages/cli/src/server-process.ts:70-86
- **what:** The background service generates a random 32-byte password when none is configured, and explicitly deletes it from the environment in stdio mode so spawned tools cannot read the server's own credential out of `process.env`.
- **how:** `delete process.env.OPENCODE_PASSWORD` before spawning, with the reason in a comment.
- **solves:** An agent that runs `env` must not be able to capture the credential that gates the agent's own API — which would make the permission system a speed bump against a full-API bypass.
- **port effort:** Low. | **idea only:** True

## opencode.110 Append-only shared log with in-place compaction

- **where:** packages/util/src/observability/logging.ts:6-13, 79-157
- **what:** Every opencode process on the machine appends to one file; instead of rotating (which would rename over the file and strand other processes on an unlinked inode) it compacts in place past 50MB down to 25MB, hourly.
- **how:** Cross-process exclusion via atomic `mkdir` (the one primitive that is atomic on every platform), `acquireRelease` so the mkdir is uninterruptible and a closing scope cannot leak a lock, a 5-minute stale-lock breaker, and a forward copy whose write cursor always trails its read cursor so concurrent appends survive.
- **solves:** Multi-process log capture with a hard size bound, without losing another process's output to a rename.
- **port effort:** Medium — the reasoning is the value; the mkdir-as-lock and the documented loss window are both worth copying verbatim. | **idea only:** True

## opencode.111 Debounced, semaphore-serialized, deep-equality-short-circuited config reload

- **where:** packages/core/src/config.ts:265-289
- **what:** Config reloads on filesystem change with a 100ms debounce, a 1-permit semaphore so reloads never interleave, and an `isDeepStrictEqual` check that skips the update event entirely when nothing changed.
- **how:** `reloadLock.withPermit`, `PubSub.sliding(1)` + `Stream.debounce("100 millis")`, and a compatibility-array comparison that forces a rebuild even when the parsed configs match.
- **solves:** Hot config editing during a session stays responsive and does not thrash every downstream consumer with no-op updates.
- **port effort:** Low. | **idea only:** True

## opencode.112 Symlink-resolved config discovery with global-root exclusion

- **where:** packages/core/src/config/discovery.ts:22-56
- **what:** The upward walk resolves every candidate through realpath and filters out anything under the global config roots, so the global directory cannot be loaded twice — once as global, once as a "project" ancestor.
- **how:** Resolves the parent too, with the comment 'missing children must honor symlinked global roots', then compares resolved paths against `globalRoots`/`globalFiles`.
- **solves:** A user whose project lives under their home directory does not get their global config applied twice with doubled precedence.
- **port effort:** Low. | **idea only:** True

## opencode.113 Enterprise policy layer that sits above plugin hooks

- **where:** packages/core/src/config/plugin/policy.ts
- **what:** `experimental.policies` in config, plus organization statements from a connected Console. User-global outranks repository policy; org statements come last and win; the permission hook this installs only ever sets `deny`.
- **how:** Authored documents are reversed so precedence inverts, org statements appended, then a `findLast` over wildcard-matched `${action}:${resource}` keys. The same policy removes denied providers from the provider registry.
- **solves:** Allows a deny policy that plugins cannot talk their way around — which matters precisely because plugin hooks are otherwise bidirectional (finding 17).
- **port effort:** Medium — needs an org control plane omp does not have. The "policy hook only ever denies" discipline is the reusable part. | **idea only:** True

## opencode.114 Shell command decomposition into per-command permission resources

- **where:** packages/core/src/shell/parse.ts (ARITY table :22-160, scanLegacy :173-205, scanPortable :207-265)
- **what:** A tree-sitter parse turns a command line into individual `command` nodes, each becoming its own permission resource; "always" saves an arity-aware prefix so approving `git status --porcelain` grants `git status *`, not all of git.
- **how:** `descendantsOfType("command")` walks nested substitutions; `prefix()` walks back through the ARITY table to find the deepest known prefix, defaulting to the command name. A second hand-written scanner exists behind `experimental.portable_shell_scanner`.
- **solves:** Turns "run this shell string" into N reviewable decisions, so the approval granularity matches what the human is actually authorizing.
- **port effort:** High — the ARITY table and grammar work are the bulk. omp should copy the *idea* (decompose, then grant by arity-aware prefix) and re-derive the table. | **idea only:** True

## opencode.115 Dual-scanner parity test suite

- **where:** packages/core/test/permission.test.ts:380-580, packages/core/test/tool-shell.test.ts:293+, packages/core/test/shell-parse-parity.test.ts
- **what:** ~15 bash fixtures asserted against BOTH the tree-sitter and the hand-written scanner for identical resources, save prefixes, and allow/ask/deny outcomes, plus a dedicated `tool-shell.test.ts` block that captures real `permission.assert` calls end-to-end.
- **how:** Fixtures carry `[legacy, native]` outcome pairs; the test asserts `parsed.commands.length > 0` before trusting the parse, then asserts resources, save values, effect, pending count, and post-`always` persistence.
- **solves:** A permission scanner is only as good as its adversarial fixtures; this is the test shape omp should copy for any shell-permission work.
- **port effort:** Medium. | **idea only:** True

## opencode.116 Strictly opt-in telemetry, verified

- **where:** packages/util/src/observability/otlp.ts:64,75; packages/desktop/src/renderer/startup/sentry.ts:6
- **what:** OTLP returns an empty logger set / empty layer when no endpoint is configured; Sentry returns immediately when no build-time DSN is present. No PostHog/Amplitude/Segment anywhere.
- **how:** `if (!options?.endpoint) return []` / `return Layer.empty`; `if (!import.meta.env.VITE_SENTRY_DSN) return`.
- **solves:** There is no hidden default-on egress path for a locally-run coding agent.
- **port effort:** Trivial. | **idea only:** False

## opencode.117 Server process fails closed without a credential

- **where:** packages/server/src/process.ts:52-54
- **what:** `start()` returns a failed Effect if no password is present, and defaults the bind address to 127.0.0.1.
- **how:** `if (!password) return yield* Effect.fail(new Error("Missing server password"))`.
- **solves:** The always-on HTTP surface cannot come up unauthenticated by accident.
- **port effort:** Trivial. | **idea only:** False

## opencode.118 Bounded, stack-free, cycle-safe error summarization

- **where:** packages/core/src/util/error-summary.ts
- **what:** A single helper flattens an error cause chain to at most 8 entries with no stacks, guarded against cycles, for storage and log surfaces.
- **how:** Walks `error.cause`, decodes only five known fields, stops at 8 entries or on a repeat.
- **solves:** Persisted errors stay useful for debugging without bloating the DB or leaking stack paths.
- **port effort:** Low. | **idea only:** True

