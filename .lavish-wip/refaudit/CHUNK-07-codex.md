# codex — chunk 1/7 (22 năng lực)

## codex.1 Shared base-crate discipline (`codex-protocol` as the one true vocabulary)

- **where:** codex-rs/protocol/src/ (74 files / 32,189 lines); dependents measured by parsing every Cargo.toml — `protocol` has 78 dependents, the highest in the repo
- **what:** Every domain type (`Op`, `EventMsg`, `ThreadId`, `SessionId`, `ResponseItemId`, `ToolName`, `SandboxPolicy`, permissions, models, items) lives in one leaf crate that 78 other crates depend on.
- **how:** Types are `#[non_exhaustive]` so new variants never break downstream; both `Op` (UI→core) and `EventMsg` (core→UI) live here rather than in core, so the TUI, the app-server, and both SDKs all compile against the same definitions.
- **solves:** Without one shared base crate, every pair of subsystems ends up with its own private copy of ThreadId/Event types, and a rename becomes a 40-file change. The `non_exhaustive` marker is what makes the crate safe to extend indefinitely.
- **port effort:** low (adopt the pattern: one base types crate, `non_exhaustive` everywhere) | **idea only:** True
## codex.2 Capability-based extension API (contributors + capabilities, not a god-object)

- **where:** codex-rs/ext/extension-api/src/ — 10 contributor traits (approval_review, context, mcp, prompt, skill_invocation, thread_lifecycle, tool_lifecycle, turn_input, turn_lifecycle, world_state) + 4 capability traits (conversation_history, events, metrics, response_items); the design matrix is written out in ext/extension-api/notes.md
- **what:** A plug-in contract where a feature declares which seams it touches instead of which files it owns: Context, Tool, Output, Request, Runtime, Turn.
- **how:** A feature implements one or more `Contributor` traits and is registered in `registry.rs`; `state.rs` + `session_isolation.rs` + `turn_admission.rs` govern per-session visibility and per-turn admission. 15 real feature crates live under `ext/` and all register through this API.
- **solves:** It is the mechanism that makes the 'resist adding to codex-core' rule enforceable rather than aspirational: a new feature has an obvious home that is not core, and the seam it occupies is named up front.
- **port effort:** medium | **idea only:** True
## codex.3 Split execution plane (`exec-server` as a separate process)

- **where:** codex-rs/exec-server/ (168 files / 62,141 lines) + codex-rs/exec-server-protocol/; `[[bin]]` targets `exec-server`; `core/Cargo.toml` and `tui/Cargo.toml` both depend on it
- **what:** Command execution is factored out of the agent core into its own 62,141-line crate that runs as a separate process and talks over a protocol crate.
- **how:** The core and the TUI depend on `codex-exec-server` as a client; `core/README.md` documents a Wine-based integration target (`bazel test //codex-rs/core:core-all-wine-exec-test`) that runs the same core test suite against a *Windows* exec server.
- **solves:** Lets the agent core be OS-agnostic and testable, and lets execution run somewhere else (another OS, another machine, another privilege domain) without forking the core.
- **port effort:** high | **idea only:** True
## codex.4 One agent, many frontends via a JSON-RPC app-server + multi-transport

- **where:** codex-rs/app-server/ (330 files / 185,929 lines), app-server-protocol/ (66 / 35,543), app-server-transport/ (33 / 17,844), app-server-daemon/, app-server-client/, app-server-test-client/; transports in app-server-transport/src/transport/{stdio,unix_socket,websocket}.rs + a 20-file remote_control/
- **what:** A single long-lived agent core is exposed to arbitrary clients (TUI, IDE, SDK, daemon) over one versioned JSON-RPC protocol, carried on stdio, Unix socket, WebSocket, or a paired remote-control channel.
- **how:** `app-server/src/lib.rs` (64K) + `request_processors/` + `message_processor.rs` (78K) + `bespoke_event_handling.rs` (151K). The protocol crate ships generated TypeScript and JSON schema files; `app-server-test-client` and `app-server/tests/common` exist so the wire surface has its own test harness separate from the TUI.
- **solves:** Decouples 'the agent' from 'the UI'. The TUI is just one client; the SDKs and any IDE are others, and none of them can destabilize each other because none of them link the UI.
- **port effort:** medium-high | **idea only:** True
## codex.5 Bindings generated from the Rust schema, in two languages

- **where:** codex-rs/app-server-protocol/schema/{typescript,98 files; json,41; precomputed,4} → consumed by sdk/typescript/ and sdk/python. `sdk/python/pyproject.toml` declares `[tool.codex.codegen] schema-dir = "../../codex-rs/app-server-protocol/schema/json"`
- **what:** TypeScript and Python SDKs whose types are machine-generated from the Rust protocol crate's schema directory, so the three languages cannot drift.
- **how:** The Rust protocol crate is the single source of truth; a generator emits `.ts` stubs and JSON schema; each SDK has a thin hand-written layer (TypeScript: 24 files / 3,356 lines; Python: 16 numbered example pairs).
- **solves:** Hand-maintained bindings for a `non_exhaustive` enum protocol rot within weeks. Generating from the definition means a new `EventMsg` variant is a compile error in the SDK, not a runtime surprise.
- **port effort:** medium | **idea only:** True
## codex.6 Versioned SQLite state split across four databases

- **where:** codex-rs/state/ (49 .rs + 73 .sql); `state/migrations/` runs 0001_threads.sql → 0058_threads_archive_sort_indexes.sql, plus separate `goals_migrations/` (2), `logs_migrations/` (2), `memory_migrations/` (2); `model/` (11 row types) and `runtime/` (23 query modules)
- **what:** Session/thread/log/memory/goal state lives in real relational storage with numbered forward-only migrations, not in JSON blobs.
- **how:** Separate migration directories per database let logs be pruned/partitioned on their own schedule without touching thread rows — visible in `0011_logs_partition_prune_indexes.sql` and `0012_logs_estimated_bytes.sql`. `runtime/recovery.rs` and `runtime/rollout_migration.rs` handle crash recovery and JSONL→SQL backfill.
- **solves:** Resume, search, and list operations over sessions need indexes; a single append-only file cannot answer 'all threads with this text, most recent first' without scanning everything.
- **port effort:** medium | **idea only:** True
## codex.7 Append-only JSONL rollout with a reverse scanner and writer lock

- **where:** codex-rs/rollout/src/ (34 files / 16,606 lines): `recorder.rs`, `reverse_jsonl_scanner.rs`, `seekable_reader.rs`, `compression.rs` (+ `error_metrics.rs`, `read_metrics.rs`), `writer_lock.rs`, `session_index.rs`, `rollout_reference_index.rs`, `state_db.rs`
- **what:** Conversation history is an append-only JSONL log that is also seekable from the end, compressible, and safe against concurrent writers.
- **how:** The recorder appends and never rewrites; `reverse_jsonl_scanner.rs` reads backwards for the common 'show me the tail' case; `writer_lock.rs` arbitrates multiple processes (TUI + exec + daemon) touching one thread's file.
- **solves:** Crash-safety and cheap resume. An append-only log survives a hard kill with a truncated final line, and reverse reading makes 'load the last N turns' O(N) instead of O(file).
- **port effort:** medium | **idea only:** True
## codex.8 Snapshot testing as the terminal-UI regression contract

- **where:** 1,429 `.snap` files across 45 `snapshots/` directories; heaviest in `codex-rs/tui/src/snapshots/`; `codex-rs/docs/` and AGENTS.md define the accept/review workflow via `cargo insta pending-snapshots` / `accept`
- **what:** Rendered TUI frames are asserted against committed golden files, so visual changes must be reviewed as diffs.
- **how:** `insta` snapshot tests named after module paths (e.g. `codex_tui__diff_render__tests__apply_add_block.snap`); AGENTS.md makes snapshot coverage mandatory for any user-visible UI change.
- **solves:** A terminal UI has no DOM and no visual regression tooling by default, so styling/layout regressions are invisible in code review. Snapshots turn a rendering change into a reviewable text diff.
- **port effort:** low | **idea only:** True
## codex.9 First-class skill retrieval (8-strategy selector)

- **where:** codex-rs/ext/skills/ (87 files / 22,712 lines) → `src/dynamic_skill_selector/` with `fielded_bm25.rs`, `character_ngram.rs`, `character_routing_card.rs`, `lru.rs`, `lru_plus_character_routing.rs`, `lru_plus_lexical.rs`, `multi_query_lexical.rs`, `routing_card_lexical.rs`, `rrf_lexical_char.rs`, `weighted_lexical.rs` — each with a sibling `_tests.rs`
- **what:** Skills are not a static list injected into context; they are selected per-request by a retrieval layer with multiple ranking strategies behind one interface.
- **how:** Multiple independent rankers (BM25, character n-gram, LRU recency, reciprocal-rank fusion) are implemented side by side and compared; `catalog.rs` + `loader/discovery.rs` + `host_roots.rs` handle multi-root discovery, `cloud_skill.rs` handles remote skills, `invocation.rs` handles the actual skill run.
- **solves:** With dozens of skills, dumping all of them into the prompt is both expensive and noisy. Retrieval makes the catalog scale past what fits in context.
- **port effort:** medium | **idea only:** True
## codex.10 Plugin/marketplace distribution pipeline

- **where:** codex-rs/core-plugins/ (90 files / 47,665 lines): `manifest.rs`, `discoverable.rs`, `catalog.rs`, `loader.rs`, `manager.rs`, `marketplace_add/{install,metadata,source}.rs`, `marketplace_policy/{curated,curated_loading,curated_skill}.rs`, `executor_hooks.rs`, `executor_provider.rs`, `git_policy.rs`, `http_client_selector.rs`
- **what:** A complete third-party extension lifecycle: manifest, discovery, catalog, marketplace add/remove, install policy, and per-plugin executor selection.
- **how:** A plugin declares a manifest; `discoverable.rs` finds it; `marketplace_policy` decides whether it may load (curated allow-listing is a separate, stricter path from raw loading); `executor_provider.rs` decides which executor runs it; `command_migration/` translates legacy commands.
- **solves:** Extensibility without an arbitrary-code-execution hole: the question is never 'can we run third-party code' but 'which executor, under which policy, with which MCP overlay and HTTP client'.
- **port effort:** high | **idea only:** True
## codex.11 Three-platform OS-level sandboxing with split filesystem policies

- **where:** codex-rs/linux-sandbox/ (31 files / 12,747), windows-sandbox-rs/ (114 / 28,762), windows-sandbox-service/, mxc-sandbox/, bwrap/, sandboxing/ (24 / 10,469), shell-escalation/; documented per-platform in codex-rs/core/README.md
- **what:** Isolation is enforced by the OS (Seatbelt / bubblewrap / Windows restricted-token), and the policy is expressed as per-path grants/denies rather than a single mode enum.
- **how:** `SandboxPolicy` (legacy 2-mode) coexists with a newer split filesystem policy; core/README.md documents the round-trip rule — a split policy is only downgraded to the legacy Landlock path when it round-trips without changing semantics, otherwise it routes through bubblewrap, and Windows 'fails closed' rather than enforcing a weaker policy.
- **solves:** Sandbox modes like `read-only` / `workspace-write` cannot express '/repo is writable but /repo/secrets is not'. The split policy can, and the round-trip rule keeps a weaker legacy engine from silently enforcing a stricter intent.
- **port effort:** high | **idea only:** True
## codex.12 argv0 multiplexing so one binary serves many roles

- **where:** codex-rs/arg0/ (1 file) — documented in codex-rs/core/README.md; referenced from core/Cargo.toml (`codex-linux-sandbox`) and execpolicy
- **what:** A single `codex` executable impersonates several other programs by inspecting argv[0]/argv[1], so the sandbox helper and the patch applier need no separate installs.
- **how:** When argv[0] is `codex-linux-sandbox`, the binary runs the sandbox helper; when argv[1] is `--codex-run-as-apply-patch`, it runs the patch applier. `just tui-with-exec-server` and `scripts/start-codex-exec.sh` rely on the same dispatch.
- **solves:** The sandbox needs to re-exec itself in a restricted environment and the patch tool needs to exist inside the sandbox. Shipping them as separate binaries would mean the sandbox has to find and trust a second file — or trust the PATH.
- **port effort:** low | **idea only:** True
## codex.13 Workspace-wide clippy deny-list as a cross-crate quality floor

- **where:** codex-rs/Cargo.toml:551+ — `[workspace.lints.clippy]` incl. `await_holding_lock = "deny"`, `expect_used = "deny"`, `redundant_clone = "deny"`, `needless_collect = "deny"`, `trivially_copy_pass_by_ref = "deny"`; each crate opts in with `[lints] workspace = true`
- **what:** ~35 clippy lints are denied for all 153 crates at once, so a new crate cannot be born with `.unwrap()`, a lock held across await, or a needless collect.
- **how:** One shared lint table inherited by every manifest; `just fix -p <project>` runs `cargo clippy --fix --tests`.
- **solves:** At 153 crates, per-crate lint config drifts immediately and review attention is spent on style. Centralising the floor means review can spend attention on logic.
- **port effort:** low | **idea only:** True
## codex.14 npm distribution of a native binary with correct signal/exit-code forwarding

- **where:** codex-cli/package.json (`files: ["bin/codex.js"]`) + codex-cli/bin/codex.js; platform packages `@openai/codex-{linux,darwin,win32}-{x64,arm64}`
- **what:** `npm i -g @openai/codex` installs a 6-platform optional-dependency set of native binaries, launched by a Node shim that preserves Ctrl-C semantics and exit codes.
- **how:** Asynchronous `spawn` (not spawnSync) so Node can still service signals; SIGINT/SIGTERM/SIGHUP forwarded to the child; a terminating signal is re-raised on the parent so `128+n` reaches the shell; the installer is detected heuristically and exported as `CODEX_MANAGED_BY_*`; a missing binary produces a package-manager-specific reinstall message.
- **solves:** The two classic Node-shim bugs are exit-code loss and Ctrl-C killing only the wrapper. Both are explicitly handled and commented in the source.
- **port effort:** low | **idea only:** True
## codex.15 Context-fragment contract (bounded, append-only, cache-stable)

- **where:** codex-rs/core/src/context/; the rule itself is stated in AGENTS.md under 'Model visible context' (no history rewrite, no unbounded items, nothing over 10K tokens, anything crossing 1k tokens is P0 review)
- **what:** A written rule that every fragment injected into model context is a struct implementing a named trait, is hard-capped in size, and is never rewritten in place.
- **how:** `ContextualUserFragment` trait; `context_manager/` and `context-fragments/` crates; `core/src/turn_metadata.rs` (20K) and `stream_events_utils.rs` (21K) carry the accounting.
- **solves:** Prompt-cache invalidation and context blowup are the two failure modes that silently degrade an agent. Making the bound a type-level obligation rather than a review convention means a contributor cannot add an unbounded fragment without noticing.
- **port effort:** medium | **idea only:** True
## codex.16 Dual build system (Cargo + Bazel) with lockfile drift enforcement

- **where:** 187 `BUILD.bazel` / `.bzl` files; `MODULE.bazel` (30K) + `MODULE.bazel.lock` (1.6 MB) + `defs.bzl` (31K) + `.bazelrc` (13K); `scripts/check-module-bazel-lock.sh`; AGENTS.md rule: 'If you change Rust dependencies … run `just bazel-lock-update` … CI verifies lockfile drift'
- **what:** Two complete build graphs are maintained side by side, and CI fails if the Bazel lockfile drifts from the Cargo manifests.
- **how:** Each crate carries a `BUILD.bazel`; Bazel needs `compile_data`/`build_script_data` explicitly declared for any `include_str!`/`include_bytes!`/`sqlx::migrate!` (an AGENTS.md rule, because Bazel does not make source-tree files visible to compile-time reads by default).
- **solves:** Hermetic, sandboxed, cacheable builds — Bazel gives remote caching and test sandboxing that Cargo alone does not. The cost is a second dependency graph that must be kept in lockstep, which is why the drift check is enforced rather than documented.
- **port effort:** high | **idea only:** True
## codex.17 Declarative plugin manifest with a 5-field capability set

- **where:** codex-rs/plugin/src/manifest.rs (194 lines); raw serde mirror at codex-rs/core-plugins/src/manifest.rs:50-140
- **what:** `PluginManifest<Resource>` declares name, version, description, keywords, plus a `paths` struct with exactly skills / onboarding_skill / mcp_servers / apps / hooks. No entrypoint, no exports, no activate/dispose.
- **how:** JSON, camelCase, every field `#[serde(default)]`. Resource type is a type parameter so the same struct serves host loading (AbsolutePathBuf) and resolved packages (PathUri / PluginResourceLocator).
- **solves:** A plugin cannot run code in the Codex process. Every capability is a data artifact the host already knows how to execute: a skills dir, an MCP server descriptor, a connectors file, a hooks file, display metadata.
- **port effort:** Small. ~200 lines of TS types + a Zod/ArkType schema. The type-parameterization trick (Resource) is worth copying — it lets the parser be environment-agnostic. | **idea only:** True
## codex.18 Dual manifest format: private legacy + public Agent Plugins v1

- **where:** codex-rs/core-plugins/src/manifest.rs:37-40, :175-215; codex-rs/core-plugins/src/agent_plugin_manifest.rs (235 lines)
- **what:** `PluginManifestFormat::{Legacy, AgentPlugin}`. Legacy lives at `.codex-plugin/plugin.json`. AgentPlugin lives at root `plugin.json` and must declare `$schema: https://agentplugins.org/schemas/1.0.0/plugin.schema.json`.
- **how:** `find_plugin_manifest_path` tries root `plugin.json` FIRST, but only accepts it if `agent_plugin_schema_status(contents) != Unrelated` (i.e. `$schema` present and agent-plugins-shaped); otherwise falls through to `DISCOVERABLE_PLUGIN_MANIFEST_PATHS`. An unrelated root `plugin.json` (e.g. an npm package's) is explicitly ignored — there is a test named `ignores_unrelated_root_plugin_manifest_before_legacy_fallback`.
- **solves:** Lets a plugin be portable across Codex, Claude Code, and Cursor. The format also changes runtime semantics, not just parsing: AgentPlugin implies `SkillDiscoveryMode::DirectChildren` (vs Recursive), a different MCP data root (sha256-derived, not `<name>-<marketplace>`), no `apps`, and NO hooks at all.
- **port effort:** Medium. The `Unrelated`/`Supported`/`Unsupported` three-state schema probe is the load-bearing idea; the format-driven behavior divergence is the subtle part. | **idea only:** True
## codex.19 Cross-tool manifest path compatibility

- **where:** codex-rs/exec-server-protocol/src/protocol.rs:49-53; codex-rs/core-plugins/src/marketplace.rs:18-23
- **what:** Plugin manifests are discovered at `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json` in that fixed precedence. Marketplace manifests likewise at `.agents/plugins/marketplace.json`, `.agents/plugins/api_marketplace.json`, `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`.
- **how:** A single ordered const list, tried in order. `find_plugin_manifest_path` also rejects a candidate whose PARENT is a symlink or non-directory, and rejects the manifest itself if it is a symlink or non-regular file — at every precedence level, and it does not fall through on rejection (it returns None).
- **solves:** A marketplace author writes one plugin tree; Codex reads it, as do Claude Code and Cursor. Also handles the hostile-layout case without silently loading a symlinked manifest.
- **port effort:** Very small. A const array + a resolver. The symlink-rejection-at-every-level detail is worth copying verbatim. | **idea only:** True
## codex.20 Hook system: 12 events, 4 handler kinds, matcher groups

- **where:** codex-rs/hooks/src/lib.rs (HOOK_EVENT_NAMES: [&str;12]), codex-rs/config/src/hook_config.rs:36-205, codex-rs/hooks/src/registry.rs
- **what:** Lifecycle hooks. Events: PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SessionStart, SessionEnd, UserPromptSubmit, SubagentStart, SubagentStop, Stop, Interrupt. Handlers: `command` (shell, with commandWindows/timeout/async/statusMessage), `mcp_tool` (server+tool+input), `prompt`, `agent`.
- **how:** JSON file (`hooks.json`) shaped as `{PreToolUse: [{matcher, hooks: [...]}, ...], ...}`. Matcher is only meaningful for 9 of 12 events (`HOOK_EVENT_NAMES_WITH_MATCHERS`); the other 3 ignore it. `Hook::execute(payload) -> HookResult` is a trait; `Hooks::dispatch` iterates in order and BREAKS on `should_abort_operation()`. There is also a `preview_<event>()` for every run method that returns the matched handler list without executing.
- **solves:** Lets an external author intercept, gate, and augment a running agent without recompiling it — and lets the UI show what WOULD run before it runs.
- **port effort:** Medium-large. This is the deepest genuine third-party API in the repo. | **idea only:** False
## codex.21 Hook trust by content hash with a 4-state machine

- **where:** codex-rs/hooks/src/engine/discovery.rs:664-720 and :794-810; codex-rs/protocol/src/protocol.rs:1634-1641; codex-rs/config/src/hook_config.rs:30-36; codex-rs/hooks/src/declarations.rs (plugin hooks key as `<plugin_id>:<source_relative_path>`)
- **what:** Every discovered handler gets a stable key `"<key_source>:<event_label>:<group_idx>:<handler_idx>"`, a `current_hash` (sha256 of event+matcher+group+config), and a `trust_status` ∈ {Managed, Trusted, Modified, Untrusted} resolved by comparing current_hash to a user-pinned `trusted_hash` in config state.
- **how:** `HookStateToml{ enabled: Option<bool>, trusted_hash: Option<String> }` per handler key. builtin -> Trusted unconditionally; managed -> Managed; hash matches pin -> Trusted; pin exists but differs -> **Modified**; no pin -> Untrusted. `Hooks::matches_plugin_hooks()` compares full source+warning vectors to decide whether a reconfigure is needed.
- **solves:** A hook file edited after the user approved it goes `Trusted -> Modified` and the UI surfaces it. A per-handler-key enable flag means one hook can be killed without touching the file.
- **port effort:** Small and high-value. The `Modified` state (as distinct from Untrusted) is the idea worth stealing: it distinguishes "never approved" from "approved then changed". | **idea only:** True
## codex.22 Managed-hooks-only mode

- **where:** codex-rs/hooks/src/engine/discovery.rs:80-90, 121-135 (HookDiscoveryPolicy::allows); documented at docs/config.md
- **what:** An admin can lock the host to managed hooks, ignoring user, project, and session hook config entirely.
- **how:** `config_layer_stack.requirements().allow_managed_hooks_only`. Doc explicitly warns it is honored ONLY in `requirements.toml`, not `config.toml`.
- **solves:** Enterprise deployment can strip all user-authored hooks without removing the hook machinery.
- **port effort:** Small. | **idea only:** True
