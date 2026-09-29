# senpi — chunk 1/5 (22 năng lực)

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
