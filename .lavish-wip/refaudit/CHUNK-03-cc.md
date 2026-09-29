# cc — chunk 3/6 (22 năng lực)

## cc.45 Compaction-of-the-compactor: head-truncating PTL retry loop

- **where:** src/services/compact/compact.ts:231 (MAX_PTL_RETRIES=3), :247 (truncateHeadForPTLRetry), :479-513 (the retry loop)
- **what:** When the summarization request itself overflows the context window, the compactor drops its own oldest input groups and retries instead of giving up.
- **how:** `for(;;)` around `streamCompactSummary`. On a prompt-too-long summary, `truncateHeadForPTLRetry` parses the server-reported token gap (input/maxTokens/contextLimit regex) and drops exactly enough API-round groups to close it; with no gap it drops 20%. It first strips its own synthetic marker so retry 2+ makes progress instead of re-dropping the marker. If the slice would start with an assistant message it prepends a synthetic user marker. The truncated set is threaded through BOTH the `messages` param and `cacheSafeParams.forkContextMessages` because the forked-agent path reads the latter.
- **solves:** A compactor that cannot compact leaves the user permanently stuck with no recovery, since compaction is also the manual escape hatch. Also demonstrates the classic retry-progress bug (dropping your own marker each attempt) and the classic fork-path bug (threading state through the wrong parameter).
- **port effort:** Medium. Only relevant if you summarize over an API. The marker-strip and dual-thread details are the load-bearing parts. | **idea only:** True
## cc.46 Concurrency-partitioned tool dispatch with deferred context modifiers

- **where:** src/services/tools/toolOrchestration.ts:20 (runTools), :106 (partitionToolCalls)
- **what:** Tool calls are partitioned into batches; consecutive read-only tools run in parallel, anything else runs serially. Context mutations requested by a tool are queued and applied only after its batch finishes.
- **how:** `partitionToolCalls` reduces the tool_use blocks into `{isConcurrencySafe, blocks}` batches. Safety is `tool.isConcurrencySafe(safeParse(input).data)`, and if that function *throws* (e.g. shell-quote parse failure) the block is conservatively treated as NOT safe. In the parallel path, `contextModifier` callbacks are collected into `queuedContextModifiers[toolUseID]` and replayed only after the whole batch drains.
- **solves:** Naive parallel tool execution either serializes everything (slow) or races context mutations (a Bash tool that changes cwd corrupts a concurrent tool's relative path). Queueing mutations and replaying them at the batch boundary makes parallel read-only dispatch safe.
- **port effort:** Medium. The batch-partition + deferred-modifier pattern is the idea; the `isConcurrencySafe` predicate must be reimplemented per-tool. | **idea only:** True
## cc.47 Tools execute while the model is still streaming

- **where:** src/services/tools/StreamingToolExecutor.ts:42 (class), :73 (discard), :90 (addTool), :480 (getRemainingResults); dispatch at src/query.ts:1670-1671
- **what:** As soon as a `tool_use` block is complete in the stream, its tool starts running — the turn does not wait for the model to finish emitting all blocks.
- **how:** `addTool(block, assistantMessage)` pushes a `TrackedTool` and calls `void this.processQueue()`. `getRemainingResults()` is an async generator yielding completed results plus progress. The loop uses a mutually exclusive ternary: `streamingToolExecutor ? streamingToolExecutor.getRemainingResults() : runTools(...)`.
- **solves:** A 30-second Bash call started only after the model finishes streaming wastes the entire remaining generation time. Overlapping tool execution with generation is often the single biggest wall-clock win in an agent loop.
- **port effort:** Medium-high: needs an incremental tool_use block assembler that can detect a complete JSON input mid-stream. | **idea only:** True
## cc.48 Discardable executor with explicit GC release

- **where:** src/services/tools/StreamingToolExecutor.ts:73 (discard); called at src/query.ts:1172-1178
- **what:** The streaming executor can be thrown away mid-flight on retry, and does so without leaking.
- **how:** `discard()` sets `discarded`, aborts `siblingAbortController` (killing in-flight subprocesses), empties `this.tools`, and clears the progress resolver. The doc comment names the leak it fixes: repeated retries in NO_FLICKER mode accumulated leaked `TrackedTool` objects, each holding an assistantMessage, results, and pendingProgress.
- **solves:** Retry paths leak memory by default. Without this, every failed model attempt strands a full set of in-flight tool objects and subprocesses for the life of the process.
- **port effort:** Low. ~15 lines, high value on any retry path. | **idea only:** True
## cc.49 Two-tier max-output-token recovery

- **where:** src/utils/context.ts:30 (ESCALATED_MAX_TOKENS = 64_000); src/query.ts:194 (MAX_OUTPUT_TOKENS_RECOVERY_LIMIT = 3), :1510
- **what:** When the model hits its output cap, the loop first silently raises the cap, and only if that fails injects a resume nudge, with a bounded retry count.
- **how:** Transition `max_output_tokens_escalate` raises the limit once and retries silently with no meta message injected into history. Transition `max_output_tokens_recovery` injects "Output token limit hit. Resume directly..." up to 3 times, then releases the withheld error.
- **solves:** A truncated response is usually not a failure — the model just needs a bigger budget. Injecting a "please continue" message on the first truncation pollutes the history and often produces a worse continuation than simply retrying with headroom.
- **port effort:** Low. Both transitions are already modelled in the Continue union. | **idea only:** True
## cc.50 Model fallback with signature-bound thinking repair

- **where:** src/services/api/withRetry.ts:160 (FallbackTriggeredError); handled at src/query.ts:1152-1208
- **what:** On capacity errors the loop switches to a fallback model, but first repairs the history for cross-model replay.
- **how:** Catch of `FallbackTriggeredError`: clears `assistantMessages`, yields synthetic tool_results for the orphaned tool_use blocks, discards and recreates the StreamingToolExecutor (so old tool_use_ids cannot leak into the retry), updates `mainLoopModel`, and — critically — calls `stripSignatureBlocks(messagesForQuery)` because thinking signatures are model-bound and replaying a protected-thinking block to an unprotected model returns 400.
- **solves:** Switching models mid-conversation is not transparent: three separate pieces of state (assistant messages, in-flight tool results, signed thinking blocks) all have to be reconciled or the retry produces a 400 or an orphaned-tool_use error.
- **port effort:** Low-medium. The `stripSignatureBlocks` step is provider-specific; the orphan-reconciliation sequence is not. | **idea only:** True
## cc.51 Retry policy layered by error class

- **where:** src/services/api/withRetry.ts:52, :54, :55, :96-98, :530 (getRetryDelay), :607 (is529Error), :786 (getDefaultMaxRetries)
- **what:** Backoff, retry-after, an overload circuit cap, and a persistent-error ceiling — four distinct policies, not one.
- **how:** `getRetryDelay(attempt, retryAfterHeader, maxDelayMs=32000)`: a valid `retry-after` header wins outright; otherwise `min(500 * 2^(attempt-1), 32000)` plus up to 25% random jitter. `DEFAULT_MAX_RETRIES = 10`. Overload (529) is separately capped at `MAX_529_RETRIES = 3` because 529 is a "come back later" signal, not a transient blip. Persistent-retry mode caps backoff at 5 min and resets at 6 h with a 30 s keep-alive heartbeat.
- **solves:** Treating 429, 529, 5xx, and ECONNRESET as one retry class burns quota and quota-bans the client. A 529 retried 10 times with the same backoff as a 500 is wrong in both directions.
- **port effort:** Low. The layered classification is the idea. | **idea only:** True
## cc.52 Subagent with fork-context, prompt-cache-stable tool inheritance, and transcript routing

- **where:** packages/builtin-tools/src/tools/AgentTool/runAgent.ts:257 (runAgent); forkSubagent.ts; resumeAgent.ts; loadAgentsDir.ts (26K)
- **what:** A subagent spawn takes an explicit list of every inherited-context knob, and can replay the parent's conversation into the child.
- **how:** `runAgent` takes 28 named params, each with a doc comment explaining WHY. `forkContextMessages` is filtered through `filterIncompleteToolCalls` first so a partial parent turn cannot 400 the child. `useExactTools: true` bypasses `resolveAgentTools()` and inherits the parent's thinkingConfig and non-interactive flag, specifically to produce byte-identical API request prefixes for cache hits. `onCacheSafeParams` lets a background summarizer fork the agent's own conversation. Transcripts route to `subagents/<subdir>/` via `setAgentTranscriptSubdir`.
- **solves:** Forking context into a child is the cheapest way to get a capable subagent, but naive re-derivation busts the prompt cache: forkSubagent.ts:56-62 documents that re-calling `getSystemPrompt()` can diverge on a cold-vs-warm GrowthBook cache, so the already-rendered system prompt *bytes* are threaded through `toolUseContext.renderedSystemPrompt` instead.
- **port effort:** High (the parameter surface is large), but two specifics are cheap and high-value: thread rendered bytes to preserve cache identity, and strip CLAUDE.md/gitStatus for read-only agents. | **idea only:** True
## cc.53 Per-agent-type context slimming

- **where:** packages/builtin-tools/src/tools/AgentTool/runAgent.ts ~390-420
- **what:** Read-only subagents are stripped of context they will never use, with measured fleet-scale savings cited.
- **how:** `agentDefinition.omitClaudeMd` drops `claudeMd` from userContext (comment: 5-15 Gtok/week across 34M+ Explore spawns). For `agentType === 'Explore' || 'Plan'`, `gitStatus` is also dropped (comment: the parent-session-start gitStatus is up to 40KB, explicitly labeled stale; if they need git info they run `git status`). An explicit `override.userContext` from the caller is preserved untouched.
- **solves:** Subagents inherit the parent's full context by default, including large blocks that are dead weight for a read-only search agent. This is a per-token cost multiplier on an already-multiplied agent tree.
- **port effort:** Low. Two destructuring rest-spreads. | **idea only:** True
## cc.54 Token budget continuation with diminishing-returns detection

- **where:** src/query/tokenBudget.ts (whole file)
- **what:** A soft budget that keeps nudging the model to converge, and stops when further turns stop buying progress.
- **how:** `checkTokenBudget(tracker, agentId, budget, globalTurnTokens)` returns a discriminated union. Below 90% of budget (`COMPLETION_THRESHOLD`) it returns `action:'continue'` with a percentage+token nudge message. Diminishing returns is `continuationCount >= 3 && deltaSinceLastCheck < 500 && lastDeltaTokens < 500`, which returns `action:'stop'` with a `diminishingReturns: true` completion event. Subagents (`agentId` set) are exempt — a subagent cannot own the session budget.
- **solves:** Two opposing failure modes: a hard budget cuts off work that was nearly done, and no budget lets the agent loop indefinitely. The diminishing-returns check additionally prevents burning budget on continuations that produce almost no new tokens.
- **port effort:** Low. ~100 lines, self-contained, and the diminishing-returns heuristic transfers directly. | **idea only:** True
## cc.55 Prompt-cache break detection with per-tool schema hashing

- **where:** src/services/api/promptCacheBreakDetection.ts:227 (PromptStateSnapshot), :435 (checkResponseForCacheBreak), :672 (notifyCacheDeletion)
- **what:** Snapshots the request prefix across turns, diffs it, and attributes a cache miss to a specific tool.
- **how:** Hashes system blocks, tools, cache_control-bearing system blocks, per-tool schemas (`perToolHashes`), sorted beta headers, model, and cache strategy. On a break it writes a unified diff to a temp file. The `perToolHashes` map exists specifically because when the tool list is unchanged (added=removed=0) the name of the changed tool can still be derived — the comment cites that this covers 77% of tool breaks.
- **solves:** Prompt cache misses are silent and expensive (you pay cache-write rates on the whole prefix). Without attribution you cannot tell whether a regression came from the system prompt, a tool description, a beta header flip, or an MCP server appearing/disappearing.
- **port effort:** Medium. The idea is provider-agnostic and valuable for any cached-prefix agent; the specific fields are Anthropic-shaped. | **idea only:** True
## cc.56 Persist oversized tool results to disk instead of truncating

- **where:** src/utils/toolResultStorage.ts (getPersistenceThreshold); applied at src/query.ts:567
- **what:** Tool output above a per-tool threshold is written to a file and replaced with a tagged pointer, so nothing is lost and nothing bloats the context.
- **how:** `getPersistenceThreshold` honours `Number.isFinite(maxResultSizeChars) === false` as a hard opt-out (checked BEFORE the GrowthBook override so the flag cannot force it back on), then a `tengu_satin_quoll` per-tool override map, then `min(declared, DEFAULT_MAX_RESULT_SIZE_CHARS)`. Output is wrapped in `<\persisted-output>` tags under a `tool-results` subdir; the in-context replacement is `[Old tool result content cleared]`.
- **solves:** Truncation loses information the model may need later; keeping it inline blows the context window. Disk-backed results give the model a stable reference without the token cost.
- **port effort:** Medium. The three-tier threshold resolution with a hard opt-out checked FIRST is the subtle part worth keeping. | **idea only:** True
## cc.57 Memory-release discipline in the hot loop

- **where:** src/query.ts:520-545 (toolUseResult strip); src/query.ts:355-380 (finally block)
- **what:** Two deliberate, documented memory strategies: strip bulky per-turn payloads from the API-facing array, and break the observability closure chain on exit.
- **how:** (a) `messagesForQuery.map(msg => { const copy = {...msg}; delete copy.toolUseResult; return copy })` — deliberately a shallow COPY, not an in-place delete, because the same objects are shared with `mutableMessages` which React is rendering; the comment documents that a mutation race makes tool-result rows render blank. (b) The `finally` nulls `langfuseTrace`/`langfuseRootTrace`/`langfuseBatchSpan` to break the closure chain, and calls `globalThis.performance.clearMarks/clearMeasures/clearResourceTimings` because OTel's `otperformance` retains a C++ Vector that never shrinks.
- **solves:** Long agent sessions accumulate hundreds of MB of dead capacity: raw tool output (a single 400KB file read stays in the array forever if uncompacted) and trace span trees retained by closures. Both are invisible in a short test run and fatal in a long one.
- **port effort:** Low. Both are small and the reasoning transfers to any long-running agent. | **idea only:** True
## cc.58 Stateful session engine separate from the turn loop

- **where:** src/QueryEngine.ts:192 (class), :217 (submitMessage), :1256 (ask)
- **what:** A class that owns conversation lifetime; the turn loop is a generator it calls repeatedly.
- **how:** `QueryEngine` holds `mutableMessages`, `abortController`, `permissionDenials`, `totalUsage`, `readFileState`, plus two turn-scoped Sets (`discoveredSkillNames`, `loadedNestedMemoryPaths`) that persist across two internal context rebuilds within one turn but are cleared at the start of each `submitMessage` to bound growth in SDK mode. `snipReplay` is an injected callback so the feature-gated snip string stays out of this file.
- **solves:** Splits conversation state (must survive) from turn state (must not grow). The comment at QueryEngine.ts:160-170 explains the boundary: the SDK truncates history in-memory to bound memory in long headless sessions, while the REPL keeps full history for scrollback.
- **port effort:** Medium. The class/turn split is the idea; the exact fields are SDK-shaped. | **idea only:** True
## cc.59 Server-side context editing strategies

- **where:** src/services/compact/apiMicrocompact.ts (whole file)
- **what:** A request-level config that asks the API to clear old tool inputs/results and old thinking blocks itself, instead of the client doing it.
- **how:** Two strategy types: `clear_tool_uses_20250919` (with `trigger.input_tokens`, `keep.tool_uses`, `clear_tool_inputs`, `exclude_tools`, `clear_at_least.input_tokens`) and `clear_thinking_20251015` (with `keep.thinking_turns`). Defaults `DEFAULT_MAX_INPUT_TOKENS = 180_000`, `DEFAULT_TARGET_INPUT_TOKENS = 40_000`. Results feed back via `notifyCacheDeletion`, so the client can see what the server actually removed.
- **solves:** Client-side clearing costs a full round trip and the tokens still occupy the prompt you send. Asking the server to elide is strictly cheaper — and the `cache_deleted_input_tokens` feedback tells you the real saving rather than an estimate.
- **port effort:** Trivial to send, but only if your provider offers an equivalent. Anthropic-specific; treat as a design reference, not a port. | **idea only:** True
## cc.60 Per-category context attribution

- **where:** src/utils/analyzeContext.ts:940 (analyzeContextUsage), :75 (TOOL_TOKEN_COUNT_OVERHEAD)
- **what:** Breaks the context window into named, individually-counted categories so the user can see what is consuming it.
- **how:** Eight counts run in parallel: system prompt, CLAUDE.md/memory files, built-in tool definitions, MCP tool definitions, custom agent definitions, slash commands, messages, and skills (skills in an error-isolated wrapper so a broken skill cannot break `/context`). `TOOL_TOKEN_COUNT_OVERHEAD = 500` corrects for the API's per-call tool preamble being counted N times when each tool is counted with a separate API call. Reserved categories are named `'Autocompact buffer'` and `'Compact buffer'`.
- **solves:** "Context is full" is unactionable without attribution. Also demonstrates a real counting bias: the token-counting API includes a ~500-token tool preamble on every call, so naive per-tool counting reports N x 500 instead of 500.
- **port effort:** Medium. The 500-token preamble correction is the non-obvious part. | **idea only:** True
## cc.61 Narrow dependency injection for the loop

- **where:** src/query/deps.ts (whole file)
- **what:** The four I/O touchpoints of the loop are injectable, with `typeof fn` typing so signatures cannot drift.
- **how:** `QueryDeps` = `{ callModel, microcompact, autocompact, uuid }`. `productionDeps()` supplies the real implementations. The comment notes the scope is intentionally narrow (4 deps) to prove the pattern, and that callModel and autocompact are each currently `spyOn`-ed in 6-8 test files.
- **solves:** Module-level mocking to test a 2000-line loop is brittle. Injecting the I/O seam lets tests supply fakes directly, and `typeof fn` means a signature change in the real implementation is a compile error at the DI site rather than a runtime surprise.
- **port effort:** Low. The `typeof fn` trick is the detail worth copying. | **idea only:** True
## cc.62 Tool interface as a behavioural contract, not a schema

- **where:** packages/agent-tools/src/types.ts:111 (CoreTool)
- **what:** Every tool declares concurrency safety, destructiveness, world-openness, interrupt behaviour, and search/read classification alongside its input schema.
- **how:** `CoreTool` requires `isConcurrencySafe(input)`, `isReadOnly`, `isDestructive?`, `isOpenWorld?`, `interruptBehavior?(): 'cancel' | 'block'`, `requiresUserInteraction?`, `checkPermissions`, `validateInput?`, `inputsEquivalent?`, `toAutoClassifierInput`, `maxResultSizeChars`, and `isSearchOrReadCommand?` returning `{isSearch, isRead, isList?}`. The `isSearchOrReadCommand` split (search vs read, not just "read-only") is what lets read results be cleared by microcompaction on a different schedule from mutations.
- **solves:** Makes the loop's policy decisions data-driven instead of a hardcoded per-tool-name switch — exactly the thing your AGENTS.md KDL rule tree forbids in TS. Everything the loop branches on becomes a field the tool supplies.
- **port effort:** Medium-high (the interface is wide), but it is the right shape and it eliminates a whole class of per-tool string matching. | **idea only:** True
## cc.63 Multi-backend teammate runtime

- **where:** src/utils/swarm/inProcessRunner.ts (56K), src/utils/swarm/backends/{InProcessBackend, TmuxBackend, ITermBackend, PaneBackendExecutor, WindowsTerminalBackend, registry}.ts
- **what:** Subagents can be hosted in-process or in external terminals, behind one interface.
- **how:** `runInProcessTeammate` (inProcessRunner.ts:902) and `startInProcessTeammate` (:1642) share a 20-file permission-sync layer (`permissionSync.ts`, 26K) and a `leaderPermissionBridge.ts` so a background teammate's permission prompts route back to the leader's terminal. `registry.ts` (18K) selects the backend.
- **solves:** Lets a multi-agent system run a teammate as a real separate terminal session (so the human can attach and drive it) or as an in-process async task (so it is cheap), without the agent layer knowing which. The permission bridge is the part that matters: a background agent that cannot ask permission must be able to route the ask upward.
- **port effort:** High. Closer to orchestration infra than agent-core. Note the permission-bridge idea; skip the backend zoo. | **idea only:** True
## cc.64 Scoped post-compaction cache cleanup

- **where:** src/services/compact/postCompactCleanup.ts (runPostCompactCleanup)
- **what:** After a compaction, caches are cleared — but only the ones the compacting thread actually owns.
- **how:** `runPostCompactCleanup(querySource)` computes `isMainThreadCompact = querySource === undefined || querySource.startsWith('repl_main_thread') || ...` and only then resets module-level state (context-collapse store, getMemoryFiles one-shot flag, getUserContext cache). The doc comment states the hazard: subagents run in the same process and share module-level state, so resetting on a SUBAGENT compact would corrupt the MAIN thread. Skill content is deliberately NOT cleared, because `createSkillAttachmentIfNeeded` must re-inject the full text after the next compaction.
- **solves:** In-process subagents share module singletons with the parent. A cleanup routine that is correct for the main thread silently corrupts it when called from a child. The `querySource` parameter is the fix.
- **port effort:** Low, but only if you run subagents in-process. Easy to miss and expensive to debug. | **idea only:** True
## cc.65 Stop hooks that can re-inject work into the loop

- **where:** src/query/stopHooks.ts:60 (handleStopHooks); transitions `stop_hook_blocking` / `stop_hook_prevented`
- **what:** A stop hook can block termination and force another turn, with a transition reason recorded.
- **how:** `handleStopHooks` runs after the model emits no tool_use but before the loop returns `completed`. A hook returning `preventContinuation: true` with a blocking message appends that message to the conversation, sets `stopHookActive = true`, and continues with transition `stop_hook_blocking`. Returning without blocking yields terminal `stop_hook_prevented`.
- **solves:** Lets a project enforce "tests must pass before you stop" without the agent having to remember. The stop point is the only place where a checker can act without fighting the tool loop.
- **port effort:** Low. The loop-algebra integration is the idea. | **idea only:** True
## cc.66 MCP client: 8 transports across 7 config scopes

- **where:** src/services/mcp/client.ts (3453 lines) dispatch at :620 sse, :679 sse-ide, :709 ws-ide, :736 ws, :785 http, :867 sdk, :869 claudeai-proxy, :979 stdio. Schemas: src/services/mcp/types.ts (258 lines). Scope/transport enums at types.ts:9-20.
- **what:** Connects to external MCP servers over 8 dispatched transports: stdio, sse, sse-ide, ws-ide, ws, http (StreamableHTTP), sdk, claudeai-proxy. Config merges from 7 scopes: local, user, project, dynamic, enterprise, claudeai, managed.
- **how:** connectToServer() branches on config.type and constructs the matching @modelcontextprotocol/sdk transport class. Result is a discriminated union MCPServerConnection = {connected | failed | needs-auth | pending | disabled}. Config resolution via getAllMcpConfigs() supports enterprise (exclusive) or merged user+project+local+plugin+claude.ai.
- **solves:** One client abstraction spanning every MCP deployment topology, so the rest of the app never branches on transport. Enterprise managed-mcp.json can override user config entirely.
- **port effort:** High for full parity (needs the enterprise/claudeai-proxy backends, which are Anthropic-account-bound and not portable). The core 4 (stdio/sse/http/ws) is medium. omp already has an MCP client — the portable wins are the scope-merge precedence order and the connected|failed|needs-auth|pending|disabled state union. | **idea only:** True
