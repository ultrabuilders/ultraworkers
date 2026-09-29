# opencode — chunk 1/6 (22 năng lực)

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
