# codex — chunk 3/7 (22 năng lực)

## codex.45 Token usage that includes un-answered history items

- **where:** core/src/context_manager/history.rs:850-867; server-reasoning toggle at state/session.rs:365
- **what:** `get_total_token_usage` = last response's `total_tokens` + estimated tokens of every item appended AFTER the last model-generated item + (optionally) non-last reasoning items. So a tool call whose output has not yet been sampled still counts against the window.
- **how:** `items_after_last_model_generated_item().map(estimate_item_token_count).fold(0, i64::saturating_add)`. The `server_reasoning_included` flag exists because some providers already count reasoning in `total_tokens` and adding it again double-counts.
- **solves:** Under-counting. A naive "last response total_tokens" reading misses the entire tool-output tail, so an agent happily streams a 300k-token tool result into a 200k window and only discovers the problem when the API rejects the request.
- **port effort:** small — ~20 LOC, but you need the notion of "last model-generated item" in your history model first. | **idea only:** True
## codex.46 Cross-agent-tree weighted token budget (RolloutBudget)

- **where:** core/src/rollout_budget.rs; wired at core/src/agent/control/runtime.rs:58-60 and core/src/agent/control/budget.rs; reminder delivery at session/rollout_budget.rs and session/turn.rs:451
- **what:** One `RolloutBudget` is shared by the whole session tree, not per-agent. Usage accrues as `output_tokens * sampling_token_weight + non_cached_input * prefill_token_weight`, OR the backend-reported `usage.codex_rollout_budget_units` when present. Crossing `reminder_at_remaining_tokens` thresholds injects a reminder into history; exhausting `limit_tokens` returns `CodexErr::SessionBudgetExceeded`.
- **how:** `deliveries: HashMap<ThreadId, ThreadBudgetDelivery>` keyed by (window_id, reminder_index) so EVERY thread in the tree observes each crossed threshold exactly once, not just the first one. `mark_reminder_delivered` is only called AFTER the reminder is actually inserted into history — the comment states "cancellation before then should retry it". `record_usage` rejects non-finite/negative backend units with `CodexErr::Fatal` rather than silently coercing.
- **solves:** N subagents each with their own context window multiply the real spend. Per-thread limits do not bound the session. A weighted shared ledger does, and the weight vector reflects that output and non-cached prefill cost different multiples.
- **port effort:** medium — ~200 LOC. The per-thread delivery dedup and the acknowledge-after-insert ordering are the subtle parts. | **idea only:** True
## codex.47 Subagents as full sessions with a spawn registry and hard caps

- **where:** core/src/agent/registry.rs:26 (AgentRegistry), :84 (`exceeds_thread_spawn_depth_limit`), :89 (`reserve_spawn_slot` — reservation is taken BEFORE the spawn and released on failure); core/src/agent/control/spawn.rs:1433 LOC; handlers at core/src/tools/handlers/multi_agents/{spawn,wait,send_input,close_agent,resume_agent}.rs and multi_agents_v2/{spawn,send_message,followup_task,interrupt_agent,list_agents,wait}.rs; depth/session_source at agent/registry.rs:71-86; limit at core/src/config/mod.rs:253
- **what:** A spawned agent is not a lightweight coroutine — it is a complete `Session` on a new `ThreadId` created via `ThreadManager::spawn_new_thread_with_source`, with its own history, context window, compaction, and tool set. `AgentRegistry` (shared by all agents in the session) enforces a per-session thread cap and a spawn-depth cap, returning `CodexErrorDetails::AgentLimitReached { max_threads }`. Two wire versions coexist: v1 namespaced (`agents.spawn_agent`, `agents.wait_agent`, `agents.send_input`, `agents.close_agent`, `agents.resume_agent`) and v2 plain (`spawn_agent` + `send_message`, `followup_task`, `interrupt_agent`, `list_agents`).
- **how:** `reserve_spawn_slot` returns a `SpawnReservation` that must be `commit(metadata)`ed (agent/registry.rs:349-378) — a two-phase reservation so a failed spawn cannot leak a slot. Nicknames are uniquified with an ordinal suffix ("fox the 2nd"). `AgentRegistry` also holds `evicted_environments: Option<Vec<TurnEnvironmentSelection>>` so a resumed child can re-establish its environment selection.
- **solves:** Recursive fan-out is the failure mode of any spawn tool: without a depth cap and a session-wide thread cap, one model turn can fork a tree that exhausts memory and spend. Two-phase reservation closes the leak where a rejected spawn still consumes budget.
- **port effort:** medium for the registry + caps; large for the full v1/v2 tool surface. The reservation-commit pattern is the key idea. | **idea only:** True
## codex.48 Tool registry / router split with deferred disclosure (BM25 tool_search)

- **where:** core/src/tools/registry.rs:56 (`CoreToolRuntime` trait), :294 (`ToolRegistry`), :288 (`RegisteredTool`); core/src/tools/router.rs:75 (`ToolRouter`), :237 (`tool_supports_parallel`), :327 (`dispatch_tool_call_with_state`); core/src/tools/handlers/tool_search.rs:28-80
- **what:** `ToolRegistry` holds `Arc<dyn CoreToolRuntime>` entries with a `ToolExposure` flag. `ToolRouter` pairs the model-visible `ToolSpec[]` with the executable runtimes. Tools marked `is_deferred()` are NOT advertised; a `tool_search` tool backed by a BM25 `SearchEngine` over `ToolSearchInfo` loads them on demand. Cached in a `Weak<dyn CoreToolRuntime>`-aware `ToolSearchHandlerCache` so regeneration is skipped when nothing changed.
- **how:** `registry.entries().filter(|tool| tool.exposure.is_deferred())` is the search corpus. `CoreToolRuntime::immutable_spec() -> Option<&Arc<ToolSpec>>` lets a runtime advertise a shared, non-rebuilt spec; `cached_code_mode_definitions` does the same for the V8 bridge. `wait_until_ready()` returns an optional BoxFuture awaited BEFORE the parallel gate, so an MCP server that is still booting holds the tool without blocking the gate.
- **solves:** Tool-schema token cost scales linearly with the number of tools. With 100+ MCP tools the schemas alone can exceed the useful context. Progressive disclosure keeps the resident set small and lets the model pull what it needs, which is a much better fit than shipping everything or hard-coding a small set.
- **port effort:** medium — the registry/router split is small; the deferred-exposure plumbing through the step-context capture is the work. | **idea only:** True
## codex.49 Approval cache keyed by canonicalized action, enabling escalation-without-re-prompt

- **where:** core/src/tools/sandboxing.rs:71-115 (`with_cached_approval`); key generation at core/src/tools/approvals.rs:239 (`cache_keys`), call sites :707-712 and :816-819; command canonicalization at core/src/command_canonicalization.rs
- **what:** `with_cached_approval` takes a list of serializable keys derived from the action (canonicalized command string, patch content keys like `ApplyPatchApprovalKey`/`UnifiedExecApprovalKey`). A prior `ApprovedForSession` for ALL keys short-circuits the prompt. This is what lets the sandbox orchestrator retry an escalated attempt without asking the user twice.
- **how:** Empty keys bypass the cache entirely (defensive: `if keys.is_empty() { return fetch().await; }`). The decision is only cached for `ApprovedForSession` — a one-shot approve does not poison later calls. `canonicalize_command_for_approval` normalizes the command before keying so cosmetic differences do not miss the cache.
- **solves:** The sandbox flow is approval → attempt → on denial escalate → attempt. Without a cache the user is asked twice for one logical action, which trains them to click "yes" reflexively and destroys the value of the prompt.
- **port effort:** small-medium — the cache is ~45 LOC; deriving stable keys is the real work and is tool-specific. | **idea only:** True
## codex.50 Stop hooks that can re-enter the model loop

- **where:** core/src/session/turn.rs:640-690 (the `!needs_follow_up` branch); hook plumbing in core/src/hook_runtime.rs (1353 LOC)
- **what:** `run_turn_stop_hooks` can return `should_block` with continuation fragments; the loop then records the fragments as a prompt message, flips `stop_hook_active = true`, and `continue`s — i.e. a host hook can make the model keep working after it thought it was done. `should_stop` breaks the loop. For unattended internal sessions (memory consolidation) a blocking stop hook is converted to a hard error instead.
- **how:** The continuation message goes through the normal `record_response_item_and_emit_turn_item` path and `accept_mailbox_delivery_for_current_turn` is called so pending child mail joins that follow-up request. `stop_hook_active` prevents an infinite block loop by tracking that a block already happened.
- **solves:** Turn-level quality gates that the MODEL cannot satisfy by trying harder (e.g. "tests must pass", "a file must be written"). This is the extension point for making an agent loop until an external predicate holds, without baking that predicate into the runtime.
- **port effort:** medium — the loop re-entry is ~20 LOC; the safety rails (stop_hook_active, internal-session refusal) are what make it safe. | **idea only:** True
## codex.51 Guardian: an isolated synchronous reviewer sub-session for approvals

- **where:** core/src/guardian/ (8192 LOC); review_session.rs is 36 KB; mod.rs:1-6 states the contract: "Hosts approval decisions and the isolated synchronous reviewer. The extension chooses policy and evidence; core enforces permissions and mandatory review requirements."
- **what:** A separate, narrowly-scoped model session reviews approval requests and returns a decision. It is budget-bounded (request_budget.rs, input_budget.rs), runs on a possibly different model (`resolve_review_model`), and has its own retained-context checkpoints so the reviewer's transcript does not pollute the main window. `ExhaustedReviewBudget` is tracked as thread extension data and forces retirement of the reviewer rather than an unbounded retry.
- **how:** Pending review context is checked at turn start (`check_pending_guardian_input`) and finalized after the step (`finalize_guardian_input`), with a documented `HistoryTruncation::{Preserve, Allow}` distinction. In run_turn (turn.rs:308-345) a `ContextWindowExceeded` during guardian finalization triggers compaction with `ExhaustedReviewBudget::Compacting` inserted, then re-runs finalization with `Allow`.
- **solves:** Auto-approving risky actions is unacceptable; prompting the user for every bash call is unusable. A model-based reviewer with a hard budget, a separate transcript, and fail-closed exhaustion gives a middle path that is auditable.
- **port effort:** large — 8k LOC. The budget-bound + retire-on-exhaust + separate-transcript combination is the reusable shape. | **idea only:** True
## codex.52 Code Mode: a V8 sandbox where the model composes tool calls in JS

- **where:** core/src/tools/code_mode/ (mod.rs 572, delegate.rs 497, execute_handler.rs 259, wait_handler.rs 233); crates codex-rs/code-mode, code-mode-host, code-mode-protocol, code-mode-runtime, v8-poc
- **what:** Instead of the model emitting N tool calls (N model round-trips of schema overhead), it emits one call to a JS runtime that orchestrates the others. `CodeModeDispatchBroker` / `CodeModeDispatchWorker` / `CodeModeCellDelegate` handle nested calls; `execute_handler.rs` and `wait_handler.rs` are the two public entry points.
- **how:** `sess.services.code_mode_service.start_turn_worker(...)` is started once per sampling request (turn.rs:1616). Tool results that originate from code-mode get a distinct `ToolCallSource::CodeMode` so telemetry can separate "dispatch waiting" from execution, and the timing guard `tool_call_timing_guard_ignores_code_mode_source` handles the nested case.
- **solves:** Loop overhead and prompt tokens when a task needs many similar tool calls (read 5 files, grep 3 times). Composing in a sandbox collapses them to one model decision. The risk — a model-controlled interpreter with tool access — is why it lives behind a separate crate with its own host.
- **port effort:** large — a V8 host plus a nested-dispatch broker. The idea (let the model write glue code instead of emitting a call sequence) transfers; the sandbox does not. | **idea only:** True
## codex.53 Append-only JSONL rollout with compression, reverse scan, and SQLite side-index

- **where:** codex-rs/rollout/: recorder.rs (2249), list.rs (1715), compression.rs (1414), state_db.rs (744), search.rs (370), session_index.rs (300), writer_lock.rs (200); resume path at core/src/session/rollout_reconstruction.rs (564) and core/src/session/mod.rs:1696 `apply_rollout_reconstruction`
- **what:** Every event is appended to a JSONL rollout file. Reading is optimized for the common case (resume = tail) via `reverse_jsonl_scanner.rs`; `compression.rs` (1414 LOC) handles archive/compaction of old rollouts; `state_db.rs` (744 LOC) is a SQLite index for search and metrics. `writer_lock.rs` serializes writers.
- **how:** `Session::last_token_info_from_rollout` / `last_token_usage_record_from_rollout` (mod.rs:1811-1831) rebuild token state from disk on resume, so a restarted process does not lose its budget accounting. `session/thread_rollout_truncation.rs` (305 LOC) truncates to the last N fork turns when forking.
- **solves:** Session durability for a long-running agent. JSONL is append-only and crash-safe by construction; the reverse scanner and SQLite index are what keep "resume" and "search" from becoming O(file) operations.
- **port effort:** medium-large. The reverse-scan-for-tail idea is cheap and worth stealing; compression + SQLite indexing is more product-specific. | **idea only:** False
## codex.54 Hook runtime woven through every lifecycle boundary

- **where:** core/src/hook_runtime.rs (1353); PreCompactHookOutcome/PostCompactHookOutcome used at compact.rs and compact_token_budget.rs:60-80; `drain_async_hook_results(..., before_user_prompt)` at turn.rs:175, :549
- **what:** Hooks fire at: pre/post tool use (with the ability to rewrite hook input via `with_updated_hook_input` and to contribute additional context), pre/post compact, session start (with `SessionStartSource`), stop, and permission request. Async hook results are drained at two specific points — before the turn's user prompt, and after sampling + its tools finish — never mid-stream.
- **how:** `run_pre_compact_hooks` returns `PreCompactHookOutcome::{Continue, Stopped}`; `Stopped` becomes `CodexErr::TurnAborted`. Pre-tool-use can return a `PreToolUsePayload` that replaces the invocation, which is how a hook can rewrite or block a tool call before it runs.
- **solves:** Host policy (lint before edit, audit after tool, block on secret access) without the runtime knowing about any of it. Draining async results only at two defined points keeps hook latency off the streaming path.
- **port effort:** medium. The two-drain-point discipline (never mid-stream) is the part worth copying. | **idea only:** True
## codex.55 Streaming protocol contract: started/completed item pairs with server-assigned or client-assigned IDs

- **where:** core/src/session/turn.rs:2567-2572 (state), :2632 (`OutputItemDone` arm), :2772 (`OutputItemAdded` arm), :2476 (`assign_missing_streamed_response_item_id`), :2231-2295 (text segment flush helpers)
- **what:** The stream handler maintains `active_item: Option<TurnItem>` and `active_item_is_streaming_to_client`. `OutputItemAdded` starts an item; `OutputItemDone` completes it. `assign_missing_streamed_response_item_id` reconciles a server that omits `id` by falling back to the active item's id, then to a generated one. Assistant text is buffered through `AssistantMessageStreamParsers` and flushed per-item/all at stream end.
- **how:** `sess.reserve_assistant_message_order(&turn_context, &item)` reserves display ordering at Added time so items render in the order the model produced them even if Done arrives out of order. Analytics caps at `MAX_ANALYTICS_TOOL_CALL_IDS_PER_RESPONSE = 256` ids per response. `should_emit_token_count` is deferred until after `drain_in_flight` specifically so a turn paused on `request_user_input` does not show progress events.
- **solves:** Client-side rendering correctness under an out-of-order, partially-annotated stream. Most agent loops either assume ordered items or leak "still working" UI while blocked on a human.
- **port effort:** medium — the event-state machine is the work. Deferred token-count emission during a human pause is a subtle, directly reusable UX rule. | **idea only:** True
## codex.56 Sandbox-denial escalation without re-approval

- **where:** core/src/tools/orchestrator.rs:122 (`run`), :52 (`run_attempt`), :298-317 (initial attempt), :340+ (denial branch); network approval in core/src/tools/network_approval.rs (1254 LOC)
- **what:** `ToolOrchestrator::run` is a fixed sequence: approval → select initial sandbox → attempt → on `SandboxErr::Denied`, if `escalate_on_failure()` and policy allows, retry with an escalated strategy. Because the approval cache is keyed on the action (not the sandbox), the second attempt does not re-prompt. Network denials route through a separate `NetworkApprovalSpec` and can be deferred (`DeferredNetworkApproval`) rather than failing the tool.
- **how:** Each attempt builds a full `SandboxAttempt` struct (sandbox type, permissions, network policy, sandbox_cwd, workspace_roots, sandbox_exe, windows_sandbox_type/level, legacy landlock flag). OTEL records `sandbox_outcome` with separate `initial_duration` and `escalated_duration` so the cost of escalation is measurable.
- **solves:** Sandboxes fail closed on legitimate work constantly. Without escalation the user must pre-widen every path; without the approval cache escalation doubles the prompts. The two features only work together.
- **port effort:** large — this is deeply tied to codex's specific sandbox backends (seatbelt, landlock, bubblewrap, Windows restricted-token). The control FLOW is portable; the implementation is not. | **idea only:** True
## codex.57 Library-level ban on stdout/stderr

- **where:** codex-rs/core/src/lib.rs:3-4
- **what:** `#![deny(clippy::print_stdout, clippy::print_stdout)]` at the crate root.
- **how:** Crate-level lint attribute with the comment "Prevent accidental direct writes to stdout/stderr in library code. All user-visible output must go through the appropriate abstraction (e.g., the TUI or the tracing stack)."
- **solves:** A `console.log` in the middle of the agent loop corrupts TUI rendering and breaks JSON-RPC framing for every consumer at once. A lint makes it a build failure instead of a runtime mystery.
- **port effort:** one line. Directly portable. | **idea only:** True
## codex.58 MCP client over stdio + streamable HTTP with dual protocol generations

- **where:** codex-rs/rmcp-client/src/protocol_mode.rs; codex-rs/config/src/mcp_types.rs:624 (McpServerTransportConfig); rmcp pinned to =3.2.0 at codex-rs/Cargo.toml:444
- **what:** Connects to external MCP servers. Two transports only (no SSE). Two selectable protocol modes gated by env: Legacy pins MCP 2025-06-18 with ClientLifecycleMode::Initialize; V20260728 opts into 2026-07-28 with ClientLifecycleMode::Auto{preferred_versions:[V_2026_07_28], legacy_version:Some(V_2025_06_18)}.
- **how:** McpProtocolMode::{preferred_protocol_version(), client_lifecycle(), stdio_mode(requested_version: Option<&OsStr>)}. stdio_mode returns Err(InvalidInput) on an unknown version string rather than silently downgrading.
- **solves:** Client-side MCP version negotiation that degrades safely. A harness speaking only the latest spec breaks stdio servers written against 2025-06-18; this splits the decision per-transport.
- **port effort:** medium | **idea only:** False
## codex.59 Full MCP OAuth stack (RFC 9728 + 7591) plus Enterprise Managed Auth

- **where:** codex-rs/rmcp-client/src/oauth.rs (64KB), perform_oauth_login.rs (54KB), auth_status.rs (32KB), www_authenticate.rs, oauth_client_registration.rs; CLI at codex-rs/cli/src/mcp_login.rs
- **what:** 64KB oauth.rs is the largest rmcp-client file. Implements protected-resource-metadata discovery, dynamic client registration, WWW-Authenticate challenge parsing, scope discovery, token refresh, plus a separate EMA path (ema_claims.rs, ema_exchange.rs, ema_identity.rs, ema_auth_policy.rs).
- **how:** CLI `codex mcp login` has two interactive modes, Browser and PasteCallback, and retries without scopes when the server rejects the requested set (should_retry_without_scopes, discover_supported_scopes). Credentials persist via an OAuth credential store.
- **solves:** Remote MCP servers requiring OAuth are the common enterprise case; naive clients break on the scope-negotiation loop.
- **port effort:** high | **idea only:** True
## codex.60 Three-tier tool exposure model (Direct / Deferred / CodeMode)

- **where:** codex-rs/protocol/src/config_types.rs:400 (ToolExposureSurface); codex-rs/core/src/tools/registry.rs (ToolExposure + add_with_exposure); codex-rs/codex-mcp/src/tools.rs:44 (ToolFilter)
- **what:** Every tool carries an exposure classification deciding which of three surfaces it appears on: the initial tool list (Direct), a BM25-searchable deferred catalog (Deferred), or the V8 Code Mode sandbox callable set (CodeMode). A server can strip itself from any surface per-config via omit_tools_from.
- **how:** registry.add_with_exposure(Handler, ToolExposure::DirectModelOnly) vs plain registry.add(). MCP tools flow through mcp_handler_cache.append_mcp_tools then apply_mcp_tool_exposure_policy. Schemas over 5,000 UTF-8 bytes get compacted (tool_input_schema_max_bytes).
- **solves:** Connecting 30 MCP servers blows the context window. Most harnesses dump every tool schema into every request; this one ships a few and searches the rest.
- **port effort:** medium | **idea only:** True
## codex.61 BM25 deferred tool discovery (tool_search)

- **where:** codex-rs/core/src/tools/handlers/tool_search.rs (bm25 crate); spec tool_search_spec.rs:94; name const codex-rs/tools/src/tool_discovery.rs:6; parallel fielded impl at codex-rs/ext/skills/src/dynamic_skill_selector/fielded_bm25.rs
- **what:** When tools are deferred the model gets one tool_search tool instead of the full catalog. A SearchEngine built from bm25::SearchEngineBuilder indexes tool name+description; a hit exposes matching tools for the next model call only. The prompt tells the model to use tool_search rather than list_mcp_resources.
- **how:** ToolSearchHandler holds search_infos: Vec<ToolSearchInfo> + search_engine: SearchEngine<usize>; ToolSearchHandlerCache memoizes with Weak<dyn CoreToolRuntime> sources so dead runtimes drop out of the index.
- **solves:** Context bloat from N MCP servers without hiding capability: the model still has a deterministic way to find any tool.
- **port effort:** low | **idea only:** True
## codex.62 MCP server registry with source attribution and credential isolation

- **where:** codex-rs/codex-mcp/src/catalog.rs (703 lines); codex-rs/codex-mcp/src/server.rs:29 (McpCredentialPolicy); connection_manager.rs (1079 lines) with submodules required.rs, startup.rs, tool_catalog_cache.rs, status.rs, resources.rs
- **what:** A catalog builder merging MCP servers from 5 sources (Plugin, SelectedPlugin, Config, Compatibility, Extension) with explicit RegistrationPrecedence and McpServerConflictAction. Each server carries McpCredentialPolicy of HostFallbackAllowed or ExecutorOnly, the latter preventing executor-discovered names from resolving against the host environment so a reconnect cannot promote guest config to host credentials.
- **how:** McpServerRegistration::from_config(name, config) sets source=Config; plugins set McpPluginAttribution::agent_plugin(...). The doc comment on McpCredentialPolicy states the invariant directly.
- **solves:** Multi-tenancy credential bleed: most MCP clients resolve every server name against the same env, so a plugin can register a name that inherits a host secret.
- **port effort:** medium | **idea only:** True
## codex.63 Tool name sanitization: raw identity preserved, model-visible name hashed

- **where:** codex-rs/codex-mcp/src/tools.rs (316 lines) normalize_tools_for_model_with_prefix, sanitize_responses_api_tool_name; ToolInfo at tools.rs:22; re-exported from codex-rs/tools/src/mcp_tool.rs
- **what:** Every MCP tool keeps its raw server_name + tool.name for protocol calls, while callable_name/callable_namespace are sanitized, SHA1-deduped, and clamped to 128 bytes for the Responses API. Legacy mcp__ prefix applied except for servers in non_prefixed_mcp_tool_servers.
- **how:** Sanitize, dedupe by hash, truncate to byte budget. ToolInfo::canonical_tool_name() returns ToolName::namespaced(namespace, name). Filtering is allowlist (enabled_tools) then denylist (disabled_tools) via ToolFilter::allows.
- **solves:** MCP servers emit names violating the OpenAI tool-name charset or colliding after sanitization; a naive client sends an invalid request or silently drops tools.
- **port effort:** low | **idea only:** False
## codex.64 Hardened stdio launcher with process-group containment

- **where:** codex-rs/rmcp-client/src/stdio_server_launcher.rs (28KB), bounded_stdio_transport.rs, local_stdio_transport.rs, executor_process_transport.rs, http_headers.rs (20KB); same idiom in codex-rs/git-utils/src/git_process.rs
- **what:** stdio MCP servers spawn inside a dedicated process group (unix process_group(0)) or Windows Job Object, with kill-on-drop and a process-tree killer; env is scrubbed of non-inheritable vars before spawn. Dedicated test files assert the boundaries.
- **how:** sets process_group(0) + kill_on_drop(true), stdin null, piped stdout/stderr, wrapped in JobObject on Windows. Drop impl calls kill_process_group (unix) or JobObject::create/spawn_contained (windows), with a fallback that clears CREATE_SUSPENDED before an uncontained spawn.
- **solves:** MCP stdio servers that fork daemons leak processes past session end, and inherited env leaks host secrets into a third-party server.
- **port effort:** medium | **idea only:** True
## codex.65 Provider policy reduced to one wire format

- **where:** codex-rs/model-provider-info/src/lib.rs:103 (WireApi), :650 (built_in_model_providers), :76-81,646-647 (provider IDs), DEFAULT_OLLAMA_PORT=11434 and DEFAULT_LMSTUDIO_PORT=1234 at :643-644
- **what:** 5 built-in providers, one wire protocol. WireApi has a single variant Responses. Deserializing "chat" produces CHAT_WIRE_API_REMOVED_ERROR rather than falling back: a hard removal with an explicit error, not a deprecation path.
- **how:** built_in_model_providers(openai_base_url) returns the 5-entry map; merge_configured_model_providers allows Bedrock overrides (endpoint/auth/headers/aws, validated by validate_bedrock_override) but inserts other user providers alongside built-ins via entry().or_insert(). OSS providers read CODEX_OSS_PORT / CODEX_OSS_BASE_URL.
- **solves:** Multi-wire-API branching is the main source of provider-specific bugs; collapsing to one shape means one request builder, one SSE parser, one retry path.
- **port effort:** medium | **idea only:** True
## codex.66 Model catalog as data, not code

- **where:** codex-rs/models-manager/models.json; codex-rs/models-manager/src/manager.rs (28KB), cache.rs, model_info.rs, model_presets.rs, collaboration_mode_presets.rs; codex-rs/model-provider/src/models_endpoint.rs (36KB)
- **what:** 10 bundled models in a 405KB JSON file, merged with a remote catalog at runtime (RefreshStrategy::OnlineIfUncached). Fields cover far more than name+context: prefer_websockets, tool_mode (code_mode_only), multi_agent_version, use_responses_lite, node_repl_auto_review_required, comp_hash, truncation_policy.
- **how:** models_manager.raw_model_catalog(RefreshStrategy::OnlineIfUncached, http_client_factory); `codex debug models --bundled` prints the local file without network; models_identity.rs handles identity resolution.
- **solves:** Per-model capability branching in code is unmaintainable; a JSON catalog with typed overrides keeps the branch count near zero.
- **port effort:** low-medium | **idea only:** True
