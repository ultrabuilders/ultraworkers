# codex — chunk 2/7 (22 năng lực)

## codex.23 Extension API: 14 typed contributor slots (INTERNAL ONLY)

- **where:** codex-rs/ext/extension-api/src/registry.rs (ExtensionRegistryBuilder / ExtensionRegistry); wired ONLY in codex-rs/app-server/src/extensions.rs:57-124 (`thread_extensions`)
- **what:** thread_lifecycle, turn_lifecycle, config, token_usage, skill_invocation, approval_review, context (prompt), mcp_server, turn_input, tool, tool_lifecycle, model_request, turn_item — plus a host event sink and a turn-start admission gate. `PromptSlot ∈ {DeveloperPolicy, DeveloperCapabilities, ContextWindow}`.
- **how:** Static `Vec<Arc<dyn Trait>>` per slot, built by a builder, frozen by `build()`. EVERY registration is a hardcoded `codex_*_extension::install(&mut builder, ...)` call inside `thread_extensions()`. `rg` for `ExtensionRegistryBuilder` outside `ext/extension-api` returns only `app-server/src/extensions.rs` plus `*_tests.rs`.
- **solves:** Decomposes the agent runtime into composable, testable pieces (the design memo in ext/extension-api/notes.md maps 11 subsystems to slot combinations).
- **port effort:** N/A for OMP as a public API. As an INTERNAL refactor pattern it is high value: it is how Codex keeps the 12 subsystems out of the core loop. Do NOT mistake it for a plugin surface. | **idea only:** True
## codex.24 Plugin identity `<name>@<marketplace>` with asymmetric segment validation

- **where:** codex-rs/core-plugin-common/src/plugin_id.rs:47-79
- **what:** Plugin names allow dots (dotted namespaces, e.g. `com.foo.bar`); marketplace names do NOT. Both reject traversal.
- **how:** `PluginId::parse` = `rsplit_once('@')` + `validate_plugin_segment` per side. Plugin name: ASCII alnum + `-`, `_`, `.`; rejects `.`/`..`, leading/trailing dot, and `..` anywhere. Marketplace name: same minus `.`.
- **solves:** Because `<name>@<marketplace>` is the cache directory path, an unvalidated name would be a path-traversal vector into `~/.codex/plugins/cache/`.
- **port effort:** Very small, and the path-safety argument is the reason to do it. | **idea only:** True
## codex.25 Versioned content-addressed plugin cache with atomic activate + rollback

- **where:** codex-rs/core-plugins/src/store.rs:300-340 (validate+install), :612-690 (staging/activate/rollback); layout at :100-145
- **what:** Cache layout `plugins/cache/<marketplace>/<name>/<version>/`. Install stages into a temp dir, verifies the manifest BYTES are unchanged between staging and activation, then renames into place; on failure it restores from a `plugin-backup-` tempdir and, if the rollback itself fails, returns an error that names the surviving backup path. Old versions are removed after success.
- **how:** `active_plugin_version` reads the version subdirectories, prefers the literal `local` if present, else the highest semver. Install also enforces `plugin.json` name == marketplace entry name.
- **solves:** A half-written plugin directory can never become the active version; a crashed upgrade cannot leave the user with no plugin.
- **port effort:** Medium. The manifest-bytes-stability check across staging and the backup-then-rollback are the parts worth copying. | **idea only:** True
## codex.26 Plugin commands are MIGRATED TO SKILLS, not registered as commands

- **where:** codex-rs/core-plugins/src/command_migration.rs (438 lines) + command_migration/plugin.rs; triggered at codex-rs/core-plugins/src/store.rs:640; output dir at codex-rs/utils/plugins/src/lib.rs
- **what:** A plugin's `commands/` markdown files are converted at install time into skills named `source-command-<slug>` under `.codex-plugin/migrated-command-skills/`. Templates using `$ARGUMENTS`, `$1`-style placeholders, `{{...}}`, `` !` `` shell interpolation, or `@mentions` are silently DROPPED (not converted, not errored).
- **how:** Rendered skill frontmatter is `name` + `description` (max 3 prompts x 128 chars elsewhere in manifest). Slug collisions across source files drop the command entirely. `README.md` is skipped. Migration failure is a `tracing::warn!`, not an install failure.
- **solves:** Codex has no plugin-contributed slash-command API, so it degrades foreign command packs into skills. Users get the content but lose the slash syntax and all argument substitution.
- **port effort:** Small if you want the compat shim. But see the finding — OMP should consider adding a real command slot instead. | **idea only:** True
## codex.27 Backend share model: principals x roles x discoverability

- **where:** codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:440-530; RPCs `plugin/share/{save,list,checkout,delete,updateTargets}` at common.rs:930-955
- **what:** `PluginShareTarget{principal_type ∈ user|group|workspace, principal_id, role ∈ reader|editor}`; `PluginSharePrincipalRole{reader,editor,owner}`; `PluginShareDiscoverability ∈ LISTED|UNLISTED|PRIVATE`.
- **how:** `plugin/share/save` takes a local `plugin_path` and returns a `remote_plugin_id` + `share_url`; `plugin/share/checkout` materializes a shared plugin into a local marketplace. `PluginShareContext` rides along on every `PluginSummary`.
- **solves:** Team distribution of plugins with real ACLs, not just a git URL.
- **port effort:** High — it is coupled to the OpenAI plugin backend (`remote_plugin_id`, `share_url`, `creator_account_user_id`). Only the ROLE MATRIX and the discoverability ladder are portable. | **idea only:** True
## codex.28 Host-owned MCP policy overlay (plugin owns transport, host owns policy)

- **where:** codex-rs/config/src/types.rs:1007-1046; applied at codex-rs/core-plugins/src/loader.rs:962-985 (apply_plugin_mcp_server_policy)
- **what:** `PluginConfig{enabled, mcp_servers: HashMap<String, PluginMcpServerConfig>}` where the per-server overlay is enabled / ema_auth / default_tools_approval_mode / enabled_tools / disabled_tools / tools{approval_mode, output_token_limit}. The overlay deliberately carries NO transport fields.
- **how:** Doc comment states the contract exactly: "plugin manifests own how the MCP server is launched, while host config owns enablement, auth, and tool policy."
- **solves:** A plugin cannot ship a tool the user has not allow-listed or that bypasses the approval mode. The split is a security boundary, not a convenience.
- **port effort:** Small. The manifest-owns-transport / host-owns-policy split is the idea. | **idea only:** True
## codex.29 Three installable source kinds

- **where:** codex-rs/core-plugins/src/marketplace.rs:128-160, normalization at :651-940; materialization at codex-rs/core-plugins/src/loader.rs:665-700
- **what:** `MarketplacePluginSource = Local{path} | Git{url, path, ref_name, sha} | Npm{package, version, registry?}`. Git URL normalization handles GitHub shorthand (`owner/repo`), relative git URLs, and optional ref selectors; npm handles scoped packages and version selectors.
- **how:** A marketplace.json lists plugins with a `source` that is a string (local path or shorthand) or an object (explicit git/npm fields). Each resolves to a materialized directory, then goes through the same store.install path as a local plugin.
- **solves:** One install path for all three source types — the plugin package is always a directory on disk by the time anything reads it.
- **port effort:** Medium. | **idea only:** True
## codex.30 Mention-gated plugin prompt injection

- **where:** codex-rs/core/src/plugins/injection.rs, mentions.rs; sigil at codex-rs/utils/plugins/src/mention_syntax.rs
- **what:** Plugins are loaded eagerly but reach the model only when the user writes an explicit `plugin://` mention. `build_plugin_injections` returns an empty vec when nothing is mentioned; otherwise each mentioned plugin becomes a developer-policy fragment listing its visible MCP servers, enabled apps, and skill prefix.
- **how:** Collected by `collect_explicit_plugin_ids` (structured `UserInput::Mention` paths + plaintext `@`-sigil links, distinct from the `$` tool sigil), matched against `PluginCapabilitySummary.config_name` which stores the FULL `name@marketplace` id, not the display name.
- **solves:** Token discipline: a session with 30 installed plugins does not spend prompt budget on 30 plugins the user is not working with.
- **port effort:** Small. The `config_name`-vs-`display_name` distinction is a real footgun worth reading the code for. | **idea only:** True
## codex.31 Plugin capability summary — the actual model-facing surface

- **where:** codex-rs/plugin/src/load_outcome.rs:47-78
- **what:** `PluginCapabilitySummary{config_name, display_name, plugin_namespace, description, has_skills, mcp_server_names, app_connector_ids}`. Built only for ACTIVE plugins, and then only if the plugin has at least one of skills / MCP servers / apps — a plugin with only hooks produces NO summary.
- **how:** `prompt_safe_plugin_description` collapses whitespace and truncates to 1024 chars before it can reach a prompt.
- **solves:** Defines what a plugin actually IS at runtime — and excludes hooks from that definition entirely.
- **port effort:** Small. | **idea only:** True
## codex.32 Authority-bound resource locator (environment-owned filesystems)

- **where:** codex-rs/plugin/src/provider.rs; resolved by codex-rs/core-plugins/src/executor_provider.rs:145-240
- **what:** `PluginResourceLocator::Environment{environment_id, path}` and `ResolvedPluginLocation::Environment{environment_id, root}`. A plugin package can live on a filesystem the host does not own (a remote executor), so every resource carries the environment that owns it.
- **how:** `ResolvedPlugin::from_environment` re-checks `path.starts_with(root)` for every resource and returns `ResolvedPluginError::ResourceOutsideRoot` otherwise. `ExecutorPluginProvider::resolve_bound` walks the manifest candidate list through `ExecutorFileSystem::get_metadata` / `read_file_text` and keeps the filesystem handle alongside the descriptor.
- **solves:** A path is meaningless without knowing which machine it is on. The same `PluginManifest<Resource>` type parameter carries the authority.
- **port effort:** Medium. Only interesting if OMP has remote/SSH environments. | **idea only:** True
## codex.33 Config-driven enable toggles with last-write-wins merge

- **where:** codex-rs/core-plugins/src/toggles.rs (100 lines)
- **what:** `collect_plugin_enabled_candidates` reads dotted config edit paths in three shapes — `plugins.<id>.enabled`, `plugins.<id>` (reads `.enabled` off the object), and the whole `plugins` table — returning a BTreeMap where the last write for a given id wins.
- **how:** Segment-slice match on `key_path.split('.')`. A plugin value without a boolean `enabled` is skipped, not an error.
- **solves:** Lets a config editor or an RPC write either the leaf or the subtree and get the same result.
- **port effort:** Very small. | **idea only:** True
## codex.34 Per-plugin-MCP data roots, format-dependent

- **where:** codex-rs/core-plugins/src/store.rs:120-140
- **what:** Legacy plugins get `plugins/data/<name>-<marketplace>/`; Agent Plugins get `plugins/data/agent-plugins/<sha256(marketplace \0 name)[0:32] hex>/`.
- **how:** The sha256 of `marketplace_name` + NUL + `plugin_name` avoids collisions between the two formats' naming schemes without a version prefix.
- **solves:** Two formats with incompatible naming conventions can coexist in one data root.
- **port effort:** Small. | **idea only:** True
## codex.35 Curated marketplace namespacing with target-marketplace eligibility

- **where:** codex-rs/core-plugins/src/lib.rs:38-48; eligibility filter at codex-rs/core-plugins/src/loader.rs:288-311; selection at codex-rs/core-plugins/src/manager.rs:643-649
- **what:** Five reserved marketplace names: `openai-curated`, `openai-api-curated`, `openai-bundled`, `openai-bundled-alpha`, `openai-primary-runtime`. A `TargetCuratedMarketplace` enum filters which of them load under a given auth mode.
- **how:** `plugin_is_eligible_for_target_marketplace` parses each config key and drops plugins from the excluded marketplace. `target_curated_marketplace(Option<AuthMode>)` picks the target; `PluginAuthPolicy{ON_INSTALL, ON_USE}` controls when auth is demanded.
- **solves:** One binary serves API-key users and ChatGPT-subscription users without shipping the wrong curated set to either.
- **port effort:** Low, but it is auth-coupled and OpenAI-specific. | **idea only:** True
## codex.36 Two-queue actor core (Submission Queue / Event Queue)

- **where:** codex-rs/core/src/session/handlers.rs:418 (`submission_loop`); protocol.rs:593+ (`Op`), protocol.rs:1359+ (`EventMsg`); capacity const at core/src/session/mod.rs:503
- **what:** Every host→agent message is an `Op` enum variant; every agent→host message is an `EventMsg` enum variant. A single `async_channel::Receiver` with capacity 512 drains ops in `submission_loop`. The loop is a giant `match sub.op` that either handles the op inline or returns `should_exit` to break the loop.
- **how:** Read-only commands (`ThreadSettings`, `TurnSettings`, approvals) are handled synchronously in the loop; work-starting commands (`TurnInput`, `RecoverTurn`) hand off to `turn_input::handle` and reply over a `oneshot`. Every reply is sent BEFORE the corresponding event is emitted — the code comments this explicitly at handlers.rs:517 ("Reply first: the caller may hold a lock its event consumer needs").
- **solves:** Gives a chat agent a single narrow, non-reentrant control surface. Any UI, RPC server, SDK, or test can drive the whole agent without knowing anything about its internals; the loop cannot be re-entered because ops are serialized.
- **port effort:** small — a typed Op/EventMsg pair plus one drain loop. Reimplementable in a few hundred LOC in any language. | **idea only:** True
## codex.37 Three-level state split: Session / SessionState / StepContext

- **where:** core/src/session/session.rs:58 (Session), core/src/state/session.rs:70 (SessionState), core/src/session/step_context.rs
- **what:** `Session` (30 fields) holds only stable wiring — thread_id, tx_event, feature set, tool_policy, input_queue, services, and a `Mutex<SessionState>`. `SessionState` holds everything mutable: history, rate limits, latest token record, auto-compact window, reasoning-effort pin, previous-turn settings. `StepContext` is captured fresh per model request and is immutable for that request.
- **how:** `sess.capture_step_context_with_required_mcp_servers(...)` is awaited ONCE at the top of each loop iteration (turn.rs:453-460), and the comment at turn.rs:454 states the intent: "Capture once so context, advertised tools, and tool calls share one request view." Everything downstream — the prompt, the advertised tool specs, the tool router, the sandbox selection — reads from that one captured snapshot.
- **solves:** Classic torn-read bug in agents: the tool list, the prompt, and the environment can each change mid-request, so the model gets a tool spec that does not match the sandbox it will run in. Snapshotting once per request makes that class of bug structurally impossible.
- **port effort:** medium — the concept is cheap; the discipline (threading the snapshot everywhere instead of reading live state) is the actual work. | **idea only:** True
## codex.38 Concurrent tool dispatch gated by an RwLock (parallel vs serial)

- **where:** core/src/tools/parallel.rs:50 (field), :54-65 (construct), :203-205 (the read/write branch); declaration sites at tools/registry.rs:517, tools/handlers/mcp.rs:148, view_image.rs:81, multi_agent_tool.rs:103, and ~8 more
- **what:** Each tool declares `supports_parallel_tool_calls() -> bool`. Tool calls are pushed into a `FuturesOrdered<InFlightFuture>` as they stream in, and each spawned task acquires an `Arc<RwLock<()>>`: `read()` for parallel-safe tools, `write()` for everything else. All serial tools therefore mutually exclude, and all parallel tools run freely alongside them only when no serial tool holds the write lock.
- **how:** `let guard = if supports_parallel { Either::Left(lock.read().await) } else { Either::Right(lock.write().await) };` then `router.dispatch_tool_call_with_state(...)`, then `drop(guard)`. The admission point also marks `execution_started_at`, so telemetry separates "waiting for the gate" from "handler running".
- **solves:** Parallel tool execution without a hand-maintained concurrency list of conflicting tools. The per-tool boolean is the only declaration needed; a new tool defaults to serial (safe) and opts into parallelism. This is strictly better than a fixed worker pool for tools with unknown side effects.
- **port effort:** medium — ~150 LOC plus the per-tool flag. The idea is the value; any RWLock or keyed-mutex scheme works. | **idea only:** True
## codex.39 Preempt (soft) vs cancellation (hard) as two separate tokens

- **where:** core/src/session/turn.rs:2553 (or_cancel chain), :2560-2570 (preempt branch), :2611-2614 (hard-cancel branch); preempt originates in StepContext and is watched via `sess.input_queue.watch_user_input(...)` at turn.rs:1602-1608
- **what:** Every stream await is wrapped `.or_cancel(&preempt).or_cancel(&cancellation_token)`. Preempt firing = "the user steered, stop this response and yield"; hard cancel = "abort the turn". The two produce different outcomes: on preempt, `try_run_sampling_request` drops the stream, calls `client_session.drop_connection()`, and returns `needs_follow_up: true, last_agent_message: None` so the loop re-samples with the steered input. On hard cancel it returns `CodexErr::TurnAborted`.
- **how:** The StepContext carries an `Option<CancellationToken>` for preempt. Before the first sampling request the code arms a watch on the input queue so a steer that arrives mid-stream fires the token immediately rather than waiting for the stream to end.
- **solves:** Responsiveness. A hard-cancel-only design makes "user typed a follow-up while the model was streaming" wait for the whole response to finish — which on a long tool-heavy response can be minutes. Splitting the two tokens lets a steer cut the response short while a true abort still unwinds cleanly.
- **port effort:** small-medium — the token split is ~20 LOC; the discipline of checking which one fired at each exit is the work. | **idea only:** True
## codex.40 WorldState: per-section diff rendering to keep context stable

- **where:** core/src/context/world_state/ (12 sections: agents_md, apps_instructions, collaboration_mode, compact_permissions, context_window_guidance, environment, environments_instructions, managed_developer_instructions, model, multi_agent_mode, permissions, persistent_mode, plugins_instructions, realtime, tools); example at context/world_state/context_window_guidance.rs:47-60
- **what:** Rather than re-emitting a full environment/AGENTS.md/permissions/tools preamble each turn, each world-state section implements `render_diff(previous: PreviousSectionState) -> Option<Box<dyn ContextualUserFragment>>` and returns `None` when unchanged. A `REPLACEMENT_NOTICE` / `REMOVAL_NOTICE` string tells the model an earlier guidance block is superseded.
- **how:** `record_step_world_state_if_changed(&world_state, step_context)` is called every loop iteration (turn.rs:513-516); only a changed section's diff fragment enters history. `PreviousSectionState` is a three-state (`Known(v) | Unknown | Absent`) so an unparseable old transcript degrades to "re-emit" rather than "assume unchanged".
- **solves:** Context bloat + prompt cache invalidation. Re-sending a stable 3k-token preamble every turn both wastes the window and destroys provider-side prefix caching. Diff rendering means only genuinely new facts enter the transcript, and the cache prefix survives.
- **port effort:** medium — the trait is 4 methods; the value is applying it to ~15 context sources, which is the bulk of the work. | **idea only:** True
## codex.41 MailboxDeliveryPhase: hold subagent mail until the turn stops emitting visible text

- **where:** core/src/state/turn.rs:41-58 (the documented state machine); core/src/session/input_queue.rs:95 (`InputQueue`), :158 (`has_pending_trigger_turn_mailbox_items`), :250 (`defer_mailbox_delivery_to_next_turn`), :273 (`accept_mailbox_delivery_for_current_turn`); consumed at session/turn.rs:527, :764
- **what:** Child-agent messages queued mid-turn are folded into the current turn only while `mailbox_delivery_phase == CurrentTurn`. The moment the turn records user-visible terminal output it flips to `NextTurn`, so late child mail waits for the next turn instead of extending an already-shown answer. If the same task later gets explicit same-turn work (a steered prompt, or a tool call after an untagged preamble), it reopens to `CurrentTurn`.
- **how:** `sess.input_queue.accept_mailbox_delivery_for_current_turn(...)` is called right after a successful sample when `model_needs_follow_up` (turn.rs:527). A separate feature flag `DeferMailboxPreemption` decides whether a reasoning/commentary item may cut the response short to deliver mail (turn.rs:2723-2769).
- **solves:** The classic multi-agent UX bug: a background child finishes mid-answer and the parent restarts its reply, so the user watches an already-complete answer rewrite itself. Phasing delivery on "has the user seen final text yet" fixes that without losing the message.
- **port effort:** medium — a small state enum plus the delivery/drain plumbing. The state-machine reasoning is the transferable part. | **idea only:** True
## codex.42 Per-turn ModelClientSession with WebSocket + sticky-routing reuse across retries

- **where:** core/src/client.rs:265 (ModelClient), :290 (ModelClientSession), :320 (WebsocketSession), :1335 (Drop), :2141 (`is_websocket_prewarmed`); module doc client.rs:1-27 explains the retry/prewarm tradeoff
- **what:** `ModelClient` lives for the session (auth, provider, conversation id, transport fallback). `ModelClientSession` is created per turn and caches a lazily-opened Responses WebSocket plus the `x-codex-turn-state` token used for sticky routing. The same instance is threaded through every retry inside `run_sampling_request` (turn.rs:1621 comment). Prewarm is a v2-only `response.create` with `generate=false` that waits for completion so the next request reuses both the connection and `previous_response_id`.
- **how:** `run_sampling_request` creates one `client_session` (from `prewarmed_client_session` if the startup prewarm produced one, else `sess.services.model_client.new_session()`) and passes `&mut` into every `try_run_sampling_request` retry iteration. On a stream error the code calls `client_session.drop_connection()` before deciding whether to retry.
- **solves:** Retry cost. Without connection reuse, every retry pays TCP+TLS+WS-upgrade AND loses provider-side prefix cache affinity, so retries are both slow and much more expensive per token. Scoping the session to the turn (not the process) bounds the cached state.
- **port effort:** large — client.rs is 2945 LOC. The scoping rule (session vs turn) and the prewarm-as-first-attempt idea are the portable parts. | **idea only:** True
## codex.43 Three-way compaction strategy behind one dispatcher

- **where:** core/src/session/turn.rs:1451-1508 (`run_auto_compact`); core/src/compact.rs (local); core/src/compact_remote_v2.rs; core/src/compact_token_budget.rs:22-59
- **what:** `run_auto_compact` dispatches on `provider.capabilities().remote_compaction`: `V2` → server-side remote compaction (`compact_remote_v2.rs`, 1299 LOC); `Unsupported` → local summarization with `SUMMARIZATION_PROMPT`; and a `Feature::TokenBudget` branch that skips summarization entirely and just installs a fresh context window. All three emit the same `TurnItem::ContextCompaction` lifecycle so hooks and UIs see one shape.
- **how:** Compaction phase is an explicit parameter: `CompactionPhase::{PreTurn, MidTurn, PostTurn}` and `CompactionReason::ContextLimit`. The doc comment at compact.rs:57-64 explains why mid-turn uses `InitialContextInjection::BeforeLastUserMessage` (the model is trained to see the summary as the last item) while pre/post-turn use `DoNotInject` (the next regular turn reinjects initial context). `build_compacted_history_with_limit` (compact.rs:662) keeps the newest user messages up to `COMPACT_USER_MESSAGE_MAX_TOKENS = 20_000` and appends the summary as a `ContextCompactionSummary` fragment.
- **solves:** Not every provider can summarize server-side, and summarization is lossy and slow. Making "just reset the window and keep the recent user messages" a first-class third strategy — sharing the compaction lifecycle — means the reset path gets hooks, events, and analytics for free.
- **port effort:** medium for the dispatcher + phase/injection enums; large for any single backend. The phase-parameterized injection rule is the reusable idea. | **idea only:** True
## codex.44 Two-scope auto-compact accounting with a server-observed prefill baseline

- **where:** core/src/session/context_window.rs:25-121; core/src/state/auto_compact_window.rs (window identity + prefill baseline)
- **what:** `context_window_token_status` computes `active_context_tokens` (full), then picks a scope: `Total` (count everything) or `BodyAfterPrefix` (subtract the window's `prefill_input_tokens` baseline). The full model window is a separate hard cap: `context_window * effective_context_window_percent / 100`. Three independent booleans result: `token_limit_reached`, `full_context_window_limit_reached`, `turn_end_compaction_threshold_reached` (a configurable percent, so compaction can fire early at end of turn without firing mid-turn).
- **how:** `AutoCompactWindow` tracks `window_number`, Uuid v7 `window_id`/`previous_window_id`/`first_window_id`, and `prefill_input_tokens` which is `ServerObserved | Estimated` — `ensure_server_observed_prefill_from_usage` only overwrites an *estimated* value, never a server-observed one (auto_compact_window.rs:107-118, asserted by the test at the bottom of the file). `advance()` on a new window clears the prefill and resets the once-only `token_budget_reminder_delivered` / `auto_compact_fallback_delivered` flags.
- **solves:** A long-lived prefix (system prompt + AGENTS.md + tool schemas) can be 30k tokens. Compacting against the total makes the agent compact constantly for reasons that have nothing to do with the conversation. Scoping the budget to "tokens added since the window's baseline" is the fix, and preferring server-observed over estimated baselines keeps it honest.
- **port effort:** medium — ~250 LOC. The `ServerObserved` beats `Estimated` precedence rule is the most transferable detail. | **idea only:** True
