# Năng lực đo được — `codex` — 141 mục

codex — Apache-2.0. Mechanisms to REIMPLEMENT, not paste.

Nguồn: 6 lens (structure, agent-core, plugin, surface, integration, ops); mọi con số đo bằng lệnh thật.
`idea only=true` = KHÔNG được chép code, chỉ mang ý tưởng.
`port effort` là ước lượng của người kiểm kê, KHÔNG phải số đo.

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

## codex.67 MITM-intercepting network proxy with credential broker

- **where:** codex-rs/network-proxy/src/ (44 files); codex-rs/http-client/src/outbound_proxy.rs (31KB), route_aware_client_pool.rs (20KB), route_aware_redirect.rs, custom_ca.rs (35KB), tls_backend_fallback.rs, network_policy.rs
- **what:** A complete intercepting proxy: CA generation and pinning (certs.rs 46KB), MITM hook installation (mitm_hook.rs 35KB), a 65KB credential broker injecting per-origin credentials into intercepted traffic, SOCKS5 (44KB), a 70KB HTTP proxy, an 81KB runtime, Windows proxy ingress and TCP attribution.
- **how:** HttpClientFactory to RouteAwareClientPool to ReqwestTransport; macOS system proxy read via the system-configuration crate; OutboundProxyPolicy/OutboundProxyRoute/RouteFailureClass drive failover; NetworkPolicyController issues revocable NetworkPermits so a policy reload cancels in-flight requests.
- **solves:** Enterprise egress control and credential injection for a fleet of agents that must not leak API keys into arbitrary destinations.
- **port effort:** very high | **idea only:** True

## codex.68 Six independent SQLite databases with per-DB migrations

- **where:** codex-rs/state/src/sqlite.rs:28-35 (filenames); codex-rs/state/migrations/0001..0058; goals_migrations/, logs_migrations/, memory_migrations/, queue_migrations/, thread_history_migrations/; sqlx-sqlite pinned =0.9.0 with offline feature (codex-rs/Cargo.toml:492)
- **what:** Not one database but six files, each with its own migration chain: state_5, logs_2, goals_1, memories_1, queue_1, thread_history_1. 73 SQL migrations total (58 state, 2 each goals/logs/memories/queue, 7 thread_history), contiguous with no gaps.
- **how:** A RuntimeDbSpec table (label, filename, DbKind, open_phase, migrate_phase) drives uniform open-then-migrate per DB; SqliteConnectOptions sets journal mode, synchronous, auto-vacuum centrally. libsqlite3-sys 0.37 default-features=false carries the comment about the SQLite WAL reset bug. 16 crates depend on codex-state.
- **solves:** Log volume destroys session-DB performance; splitting by access pattern (hot thread rows vs append-only logs) keeps both fast.
- **port effort:** medium | **idea only:** True

## codex.69 Git via hybrid gix plus hardened subprocess

- **where:** codex-rs/git-utils/ (17 files); baseline.rs 26KB, info.rs 41KB, apply.rs 30KB, trust.rs 8.9KB, fsmonitor.rs, worktree.rs, git_process.rs 2.7KB
- **what:** Both in-process gitoxide and subprocess git, deliberately: 26 public exports covering apply/stage/diff/baseline/worktree/trust/fsmonitor. Baseline handling (ensure_git_baseline_repository, diff_since_latest_init, reset_git_repository) supports rollback when the workspace is not a clean repo.
- **how:** spawn_git_command scrubs env via scrub_non_inheritable_env_vars, sets process_group(0), kill_on_drop(true), stdin null, pipes stdout/stderr, wraps in JobObject on Windows. SAFE_BARE_REPOSITORY_CONFIG = safe.bareRepository=explicit rejects implicitly-discovered bare repos while preserving ones selected via GIT_DIR/--git-dir.
- **solves:** Refusing to let a git invocation in an untrusted repo resolve to a bare repo (a known repo-confusion vector), plus not leaking the host env into git.
- **port effort:** medium | **idea only:** True

## codex.70 Persistent shell session (exec_command + write_stdin) rather than one-shot exec

- **where:** codex-rs/core/src/tools/handlers/unified_exec.rs plus unified_exec/exec_command.rs and write_stdin.rs; runtime at codex-rs/core/src/tools/runtimes/unified_exec.rs (39KB) with a zsh_fork/ subdir; command safety at codex-rs/shell-command/src/parse_command.rs (91KB) and command_safety/; policy at codex-rs/execpolicy/src/
- **what:** Not a single bash -c tool. exec_command returns a session id that write_stdin polls and feeds. A 39KB unified_exec runtime manages persistent PTY sessions; a separate 91KB parse_command.rs classifies commands for the approval layer.
- **how:** ExecCommandArgs carries tty, yield_time_ms, timeout_ms, max_output_tokens, sandbox_permissions, additional_permissions, justification, prefix_rule. shell_snapshot_capture.rs (16KB), shell_snapshot_credentials.rs (15KB) and shell_snapshot_literals.rs (29KB) capture and scrub shell state, including a dedicated credential scanner.
- **solves:** cd/pwd/env do not persist across one-shot exec calls, so the model burns turns re-establishing state, and shell snapshots can leak secrets into context.
- **port effort:** medium-high | **idea only:** True

## codex.71 Layered sandbox backends behind one policy transform

- **where:** codex-rs/sandboxing/src/ (seatbelt.rs, seatbelt_base_policy.sbpl, seatbelt_network_policy.sbpl, seatbelt_preferences_policy.sbpl, seatbelt_read_only_platform_defaults.sbpl, landlock.rs, bwrap.rs, policy_transforms.rs, manager.rs 32KB, denial.rs); sibling crates linux-sandbox/, mxc-sandbox/, windows-sandbox-rs/, windows-sandbox-service/
- **what:** Four backends, macOS Seatbelt (41KB plus 4 .sbpl policy files), Linux Landlock, bubblewrap, and a native Windows sandbox service, all driven by one 24KB policy_transforms.rs translating a single declarative policy into each backend's form.
- **how:** manager.rs selects a backend; policy_transforms.rs is the single translation point. seatbelt.rs supports an out-of-process seatbelt_daemon.rs (socket plus fcntl) so seatbelt can be applied to already-running processes, not just spawns.
- **solves:** One sandbox policy expressed once but enforced natively on four OSes, including retroactive application to running processes.
- **port effort:** very high | **idea only:** True

## codex.72 App-server JSON-RPC surface (263 methods) as the embedding contract

- **where:** codex-rs/app-server-protocol/src/protocol/common.rs client_request_definitions! (170), server_request_definitions! (9), server_notification_definitions! (84); types under protocol/v2/; transports codex-rs/app-server-transport/src/transport/{stdio.rs,unix_socket.rs,websocket.rs,mod.rs:81}
- **what:** The real integration contract for embedders is a JSON-RPC app-server, not the CLI: 170 client-to-server methods, 9 server-to-client requests including approval prompts, 84 server-to-client notifications. Method strings live in one macro-generated table.
- **how:** #[serde(tag = "method", rename_all = "camelCase")] over a macro-generated enum; TS types generated to app-server-protocol/schema/json/. Family prefixes: thread/, turn/, item/, mcpServer/, app/, plugin/, project/, fs/, account/, review/, realtime/, remoteControl/.
- **solves:** IDE/app embedding needs a stable bidirectional protocol with server-initiated approvals; a plain stdio stream cannot express the server asking the client for permission.
- **port effort:** high | **idea only:** True

## codex.73 Extension contributor system as the plugin SDK

- **where:** codex-rs/ext/extension-api/src/lib.rs (contributor traits, about 110 re-exports, registry.rs 12KB); default install set at codex-rs/app-server/src/extensions.rs:72-113; MCP contributor in contributors.rs (17KB)
- **what:** An in-process extension registry with roughly 15 contributor traits, installed at thread start. Anything a first-party feature needs, a tool, an MCP server, context fragments, a model-request interceptor, instructions, is expressible as a contributor rather than a core edit.
- **how:** ExtensionRegistryBuilder::<Config>::with_event_sink(...) then ext::install(&mut builder, ...) per extension, ending in builder.build(). Contributors include ToolContributor, McpServerContributor, ContextContributor, ModelResponseInterceptor, TurnStartAdmission, ResponseItemInjector, UserInstructionsProvider.
- **solves:** Core-code accretion: every new capability becomes a contributor, so the core stays a runtime rather than a feature list.
- **port effort:** high | **idea only:** True

## codex.74 Code Mode: tools callable from inside a V8 sandbox over gRPC

- **where:** codex-rs/code-mode/ (remote_session.rs 19KB, grpc_session/), code-mode-host/ (lib.rs 25KB, peer.rs 18KB, main.rs, grpc/), code-mode-runtime/ (v8_init.rs, service.rs, cell_actor/, session_runtime/), code-mode-protocol/src/lib.rs (PUBLIC_TOOL_NAME=exec, WAIT_TOOL_NAME=wait), codex-rs/tools/src/code_mode.rs, core/src/tools/code_mode/
- **what:** For models whose catalog declares tool_mode code_mode_only, the model gets just two tools, exec and wait, and writes JavaScript that calls the others. The V8 runtime is a separate gRPC service, not in-process.
- **how:** Tool JSON schemas are rendered to TypeScript types via render_json_schema_to_typescript and injected into the sandbox; ToolExposureSurface::CodeMode controls scope; exec returns a pending handle that wait polls (ExecuteToPendingOutcome, WaitOutcome, DEFAULT_EXEC_YIELD_TIME_MS).
- **solves:** Tool-schema token cost scales linearly with catalog size; collapsing to exec+wait makes it O(1) at the cost of requiring a code-capable model.
- **port effort:** very high | **idea only:** True

## codex.75 Unified SDK layer over SSE, Responses WebSocket, and Realtime WebSocket

- **where:** codex-rs/codex-api/src/endpoint/{responses.rs, responses_websocket.rs, realtime_websocket/*, search.rs, images.rs, memories.rs, models.rs, realtime_call.rs}; sse/{responses.rs, responses_error.rs}; codex-rs/websocket-client/src/dialer.rs
- **what:** Three live transports behind one client surface: HTTP+SSE streaming, a Responses-over-WebSocket client with probe/close handshake, and a Realtime WebSocket carrying voice with three coexisting protocol generations (v1, v2, frameless-bidi) plus transcript reassembly.
- **how:** ResponsesClient::stream_request and stream with ResponsesOptions; RealtimeWebsocketClient, RealtimeEventParser, RealtimeTranscriptState; safety buffering plus a dedicated responses_error.rs SSE error parser. Per-model prefer_websockets in models.json selects the transport.
- **solves:** Latency and reliability: SSE is fine but WebSocket avoids per-turn reconnect, and Realtime needs bidirectional audio that HTTP cannot express.
- **port effort:** high | **idea only:** True

## codex.76 JSONL rollouts with reverse scanning and compression

- **where:** codex-rs/rollout/src/ (24 files): recorder.rs 74KB, list.rs 56KB, compression.rs 51KB, reverse_jsonl_scanner.rs, seekable_reader.rs, session_index.rs, rollout_reference_index.rs, state_db/
- **what:** Sessions persist as append-only JSONL files with a separate SQLite index, plus a 51KB compression module, a reverse JSONL scanner to read a session from the end, a seekable reader, and a reference index for cross-session linking.
- **how:** rollout_file_name.rs derives filenames; ordinal.rs plus thread_history_migrations/0004_thread_items_updated_at_ordinal.sql provide stable ordering; compression/ backs the rollout/compress app-server method.
- **solves:** Resume-from-disk without loading the whole transcript, and cheap listing and search across many sessions.
- **port effort:** medium | **idea only:** True

## codex.77 execve interception + out-of-sandbox escalation voi real FD handoff

- **where:** codex-rs/shell-escalation/src/unix/{escalate_server.rs, escalate_client.rs, socket.rs, escalate_protocol.rs}; patch tai shell-escalation/patches/zsh-exec-wrapper.patch; core wiring tai core/src/tools/runtimes/zsh_fork/unix_escalation.rs
- **what:** Patch zsh de booc moi execve(2) vao codex-execve-wrapper; wrapper gui (file, argv, workdir, env) qua Unix socket, server tra Run/Escalate/Deny. Khi Escalate, wrapper dup2 stdin/stdout/stderr vao tien trinh server chay lenh NGOAI sandbox va nhan exit code nguoc lai.
- **how:** Zsh fork -> exec_wrapper(lenh goc) -> datagram handshake (SCM_RIGHTS trao 1 stream socket) -> stream protocol length-prefix u32 + JSON -> server goi EscalationPolicy -> neu Escalate: nhan SuperExecMessage{fds}, pre_exec dup2, spawn command da prepare, cho wait, tra SuperExecResult{exit_code}.
- **solves:** Sandbox mac dinh khong cho phep lenh can TTY/tra loi tuong tac (vim, git push credentials, sudo). Thay vi bo sandbox hoan toan, mechanism nay giu sandbox mac dinh va chi mo rong cho DUNG lenh da duoc approve, giu nguyen cam bien stdin/stdout/stderr.
- **port effort:** Cao. Can fork + patch shell, va viet lai toan bo layer socket/FD-passing (~2200 dong Rust). | **idea only:** True

## codex.78 Execpolicy DSL: policy-as-code cho quyet dinh exec

- **where:** codex-rs/execpolicy/src/{parser.rs, policy.rs, rule.rs}; core/src/exec_policy.rs
- **what:** Starlark-subset DSL khai bao prefix_rule / host_executable / network_rule. Effective decision = strictest trong tat ca rule match (forbidden > prompt > allow).
- **how:** Parser doc rule, validate `match`/`not_match` tai load time (rule tu la unit test). Matching: exact first-token truoc, chi fallback sang basename khi resolve_host_executables bat va basename co trong host_executable paths.
- **solves:** Approval decision la string regex/if-chain rat de lan, khong test duoc, khong audit duoc. DSL nay ra decision co provenance (matchedRules + justification) va co self-test.
- **port effort:** Trung binh (~1700 dong + CLI + syntax highlighting). | **idea only:** True

## codex.79 Persistent "always allow" voi advisory file lock + idempotent append

- **where:** codex-rs/execpolicy/src/amend.rs; goi tu core/src/exec_policy.rs:478-490 (append_amendment_and_update)
- **what:** User bam "always allow" -> append 1 dong prefix_rule(pattern=[...], decision="allow") vao ~/.codex/rules/default.rules.
- **how:** OpenOptions append + file.lock() (fs2) -> doc toan bo file -> neu dong identical da ton tai return -> append. Blocking I/O -> phai spawn_blocking.
- **solves:** Session-scoped approval cache mat khi restart. Day la durable, dedupe, va an toan khi nhieu process ghi dong thoi.
- **port effort:** Thap (~80 dong logic). | **idea only:** True

## codex.80 Chan "always allow" tren shell interpreter

- **where:** core/src/exec_policy.rs:57 (BANNED_PREFIX_SUGGESTIONS), check tai dong 970 trong try_derive_execpolicy_amendment_*
- **what:** ~80 banned prefix: /bin/bash, sh -lc, bun -e, python -c, zsh -c, cmd /c, git, Rscript...
- **how:** Prefix rule duoc goi y chi khi khop dung danh sach nay.
- **solves:** Neu user approve `bash -c "..."`, tuong lai prefix rule approve MOI lenh shell. Approval tool lai thu la de bo qua, nhung prefix rule la persistent — tro nguy hiem hon nhieu.
- **port effort:** Rat thap (1 const + 1 filter). | **idea only:** True

## codex.81 Managed network proxy: MITM + CA + SOCKS5 + SSRF guard + credential broker

- **where:** codex-rs/network-proxy/src/ (62 file, 29919 dong)
- **what:** Tac process vao moi request outbound: chan host/IP private, phan loai va ghi audit, MITM TLS bang CA sinh tay, va BROKER credential.
- **how:** TargetCheckedStreamConnector chan connect toi non-public IP truoc khi TCP connect. Credential broker: env con chi nhan dummy_value, proxy khi len upstream moi thay bang real_value tu keyring — secret that khong bao gio vao process con.
- **solves:** Sandbox filesystem khong chan network exfiltration. Va thuong de credential la bi lo trong env con khi chi mot lenh doc duoc approve.
- **port effort:** Rat cao (22.8k dong, dua tren `rama`). | **idea only:** True

## codex.82 Post-quantum Noise channel cho remote exec relay

- **where:** codex-rs/exec-server/src/noise_channel.rs + noise_relay/ (dung crate `clatter`)
- **what:** Noise hybrid-IK: X25519 + ML-KEM-768 key agreement, AES-GCM transport, SHA-256 hash. Registry tra ve exec-server static key, server hoi registry xac nhan client key truoc khi hoan tat handshake.
- **how:** 2-message handshake, phia harness pin exec-server static key tu registry; message 1 de exec-server xac thuc harness key, sau do hoi registry co duoc phep khong.
- **solves:** Relay chay lenh tren may o xa qua mang cong cong. Kiem chuc trong luong nao la "co phep chay lenh nay o day khong" + ban co phai dung may nay khong.
- **port effort:** Trung binh cho protocol, cao cho registry. | **idea only:** True

## codex.83 Secret store: age-encrypted file + passphrase trong OS keyring

- **where:** codex-rs/secrets/src/{lib.rs, local.rs}; codex-rs/keyring-store/
- **what:** 4 namespace tach file, phat sinh passphrase 32 byte OsRng, giu trong keyring, ma hoa file bang age scrypt. Atomic write + wipe key memory.
- **how:** Keyring account = sha256(canonical codex_home)[:16], gateway dung key rieng de tranh race khi ghi lan nhau. Atomic: tmp + sync_all + rename. Wipe bang write_volatile + compiler_fence.
- **solves:** Secret trong config.toml plaintext. Keyring la OS-protected, file la ciphertext, ca hai deu offline.
- **port effort:** Thap (~700 dong + crate keyring). | **idea only:** True

## codex.84 9 lop config voi precedence so, va requirements.toml khong user override duoc

- **where:** codex-rs/config/src/config_layer_source.rs, config/src/loader/, config/src/requirements_layers/stack.rs
- **what:** Moi layer mot precedence(): i16; config lay theo tang, project config chi dung khi project trusted. requirements.toml la policy cap cua admin, doc lap voi user/project config, merge len tren cung.
- **how:** ConfigLayerStack luu lowest-precedence first, fold lai. `origins()` tra layer nao "win" cho tung key. `disabled_reason` cho phep hien layer da bi khoa nhung khong tinh vao effective config.
- **solves:** Enterprise can ep sandbox mode + approval policy ma user khong override duoc, trong khi van cho phep user override project-level settings.
- **port effort:** Cao (config crate 21k dong) nhung y tuong precedence + origin la don gian. | **idea only:** True

## codex.85 Per-key config origin + disabled-layer diagnostics

- **where:** codex-rs/config/src/fingerprint.rs, config/src/state.rs, config/src/diagnostics.rs
- **what:** Tra origins: HashMap<config_key, ConfigLayerMetadata> va hien layer co disabled_reason.
- **how:** Traverse tung key cua effective TOMH, ghi nguon.
- **solves:** Sai khong biet do dau — nhanh biet setting do user hay admin dat.
- **port effort:** Thap. | **idea only:** True

## codex.86 Pre-main process hardening

- **where:** codex-rs/process-hardening/src/lib.rs
- **what:** Linux: PR_SET_DUMPABLE=0 + RLIMIT_CORE=0 + xoa LD_*. macOS: PT_DENY_ATTACH + RLIMIT_CORE=0 + xoa DYLD_*.
- **how:** Goi qua #[ctor::ctor], truoc main. Fail -> std::process::exit(5/6/7).
- **solves:** Chong process cung user attach ptrace de doc credential trong memory cua chinh codex.
- **port effort:** Rat thap (~180 dong). | **idea only:** True

## codex.87 Protected workspace metadata

- **where:** codex-rs/protocol/src/permissions.rs:46 + permissions/target.rs
- **what:** .git, .agents, .codex, .aws luon bi bao ve duoi writable root. Chan ca o hai tang: forbidden_agent_metadata_write (truoc khi chay) va policy cua sandbox.
- **how:** Ten basename duoc so sanh o moi writable root; khi policy la Restricted va path khong writable thi chan.
- **solves:** Agent viet .git/hooks/pre-commit hoac .codex/config.toml trong workspace = persistence + config injection ma user khong bao gio thay.
- **port effort:** Thap. | **idea only:** True

## codex.88 Sandbox violation classification + audit

- **where:** codex-rs/sandboxing/src/violation.rs
- **what:** Tu stderr/stdout/exit code phan loai thanh FileSystemSandboxViolation / NetworkSandboxViolation, gan reason chuan hoa, trich path bi tu choi, emit structured warn.
- **how:** 7 keyword + quick-reject exit code [2,126,127] + Linux 128+SIGSYS. Snippet cat 512 ky tu.
- **solves:** UI/model can biet "sandbox chan hay lenh that bai" de quyet dinh co nen hoi user chay ngoai sandbox khong.
- **port effort:** Thap (~300 dong). | **idea only:** True

## codex.89 Guardian: LLM reviewer + host constraint enforcement

- **where:** codex-rs/core/src/guardian/ (mod.rs, decision.rs, review_session.rs) + ext/guardian-reviewer/
- **what:** Approval duoc gui den mot reviewer rieng de auto-approve/auto-deny, NHUNG core van enforce constraint va mandatory-review.
- **how:** decide_approval() -> Option<ReviewDecision>; None = "khong co contributor, dung user flow binh thuong" (comment: "No contributor is never an implicit allow"). Reviewer chi duoc override khi auto_review_required_for_model hoac reviewer config cho phep.
- **solves:** Giam prompt fatigue, nhung khong bao gio de LLM tu quyet dinh khi khong co policy dui sau.
- **port effort:** Trung binh. | **idea only:** True

## codex.90 Granular approval policy

- **where:** codex-rs/protocol/src/protocol.rs:1011
- **what:** 5 co flags bo doc lap: sandbox_approval, rules, skill_approval, request_permissions, mcp_elicitations.
- **how:** false = auto-REJECT (khong phai "im lang cho qua"). Comment tai protocol.rs:1000.
- **solves:** Admin muon cho phep phep shell approval nhung tu choi chay skill script — phai phan biet, khong phai toggle chung.
- **port effort:** Rat thap. | **idea only:** True

## codex.91 SQLite state: 6 DB tach, WAL, migration checksum + cross-version tolerate

- **where:** codex-rs/state/src/{sqlite.rs, migrations.rs}
- **what:** Moi mi domain mot file DB. runtime_migrator set ignore_missing: true de binary cu van mo duoc DB da bi binary moi migrate.
- **how:** sqlx migrate macro; ignore_missing CHI bo qua version moi hon, version da biet van check checksum.
- **solves:** Rollback version + DB da migrate = binary khong mo duoc het, mat het session.
- **port effort:** Trung binh. | **idea only:** True

## codex.92 Durable user-input queue theo thread

- **where:** codex-rs/state/src/runtime/queued_items.rs
- **what:** Message nguoi dung nhap khi agent dang chay duoc queue trong SQLite, doc lai theo revision.
- **how:** PRAGMA data_version tren mot connection detached de theo doi thay doi; changes_since(revision) loc theo thread.
- **solves:** Steer/queue input khi process bi crash hoac restart.
- **port effort:** Thap. | **idea only:** True

## codex.93 Hook lifecycle 12 diem + managed-hooks-only

- **where:** codex-rs/hooks/src/lib.rs; config/src/requirements_layers/stack.rs:233,286
- **what:** 12 hook event; admin dat allow_managed_hooks_only = true trong requirements.toml de ignore user/project/session hooks.
- **how:** Hook chay theo matcher; co output_spill.rs de giu output lon. Setting chi doc trong requirements.toml, dat trong config.toml khong co tac dung.
- **solves:** Enterprise can khoa policy hooks lai ma project config khong chong override.
- **port effort:** Trung binh. | **idea only:** True

## codex.94 Feature flag co stage vang lai

- **where:** codex-rs/features/src/lib.rs
- **what:** Stage: UnderDevelopment | Experimental | Stable | Deprecated | Removed.
- **how:** Registry + resolve effective set; ban Deprecated/Removed van parse de khong break config cu.
- **solves:** Feature flag de lau khong bi xoa, config cu khong parse.
- **port effort:** Thap. | **idea only:** True

## codex.95 Session approval cache nhieu key

- **where:** codex-rs/core/src/tools/sandboxing.rs:44-113
- **what:** ApprovalStore key = serialized approval key; mot lenh apply_patch nhieu file van chi mot prompt nhung tung key duoc cache rieng.
- **how:** with_cached_approval(keys, fetch): neu moi key da ApprovedForSession thi skip; neu approve session, ghi tung key de request sau cham mot subset van khop.
- **solves:** apply_patch modify nhieu file — neu chi cache tong command thi approve cho 1 file se approve het patch.
- **port effort:** Thap. | **idea only:** True

## codex.96 Slash command registry với ưu tiên trình bày do thứ tự enum

- **where:** codex-rs/tui/src/slash_command.rs (366 dòng) — toàn bộ registry nằm trong 1 file; popup dùng lại qua bottom_pane/slash_commands.rs
- **what:** 62 biến thể `SlashCommand` (69 chuỗi kích hoạt), mỗi lệnh mang 3 predicate: `supports_inline_args` (20 lệnh), `available_during_task` (37/62), `available_in_side_conversation` (12), cộng `is_visible()` theo OS và `cfg!(debug_assertions)`.
- **how:** Enum + strum (`serialize_all = "kebab-case"`), `#[strum(to_string=…, serialize=…)]` cho alias. Feature gating dồn vào `builtins_for_input(BuiltinCommandFlags)` — 8 cờ tập trung một chỗ.
- **solves:** Trả lời "lệnh nào tồn tại / lệnh nào chạy được lúc này" mà không phải rà tay mọi call site. Cũng giải quyết việc 2 nơi (composer + popup) phải hiện cùng một danh sách.
- **port effort:** Thấp. Chỉ là 1 enum + 1 file filter. Ý tưởng đáng mang: thứ tự khai báo enum = thứ tự hiển thị trong menu, kèm comment cấm alpha-sort. | **idea only:** True

## codex.97 Keymap context-scoped với validator xung đột chéo context

- **where:** codex-rs/tui/src/keymap.rs (4.083 dòng) + keymap/bindings.rs (bảng khai báo 1 macro) + keymap/chords.rs (738 dòng)
- **what:** 152 action trên 13 `KeymapContext`; `KeymapContext::overlaps()` định nghĩa cặp context nào được trùng key; `KeymapActionId::config_path()` sinh đường dẫn lỗi kiểu `tui.keymap.composer.submit`. `validate_conflicts()` chạy nhiều pass vì thứ tự ưu tiên thực thi lồng nhau.
- **how:** Một macro `define_runtime_action_bindings!` sinh ra 6 hàm cùng lúc: `keymap_action_id`, `configured_binding_for_action`, `keymap_action_ids`, `bindings_for_action`, `push_binding_for_action`, `runtime_action_bindings`. File doc mở đầu nêu 4 trách nhiệm và 3 phần KHÔNG phải.
- **solves:** Ngăn một phím kích hoạt 2 hành động trên cùng đường đi nhập, trả lỗi kèm đường dẫn config thay vì im lặng ưu tiên. Giải quyết bài toán app-level handler chạy trước composer nên key composer trùng sẽ bị app ăn mất.
- **port effort:** Trung bình-Cao. Bảng khai báo gọn, nhưng `overlaps()` + validate nhiều pass + cơ chế chord là phần khó. | **idea only:** True

## codex.98 Ưu tiên key mặc định nhường bước cho binding tuỳ biến sẵn có

- **where:** codex-rs/tui/src/keymap.rs — `fn from_config` (dòng ~637-700), các biến `*_default_is_shadowed`
- **what:** Khi thêm binding mặc định mới, resolver kiểm tra key/alias/chord-prefix đó đã bị user chiếm chưa; nếu rồi thì bỏ binding mặc định thay vì ghi đè hoặc báo lỗi. Có 5 cơ chế thu hẹp: side-conversation toggle, voice toggle (F8), voice mute (ctrl-x), focus_activity, open_warnings.
- **how:** Side-conversation: kiểm tra `["ctrl-/", "ctrl-7"]` đã dùng ở main surface/list/approval chưa; nếu có thì `Vec::new()`. Voice: so prefix chord `KeyCode::Char('x')` với `normalized_parts()`.
- **solves:** Cho phép thêm feature mới mà không phá khoá gõ của người dùng đã tuỳ biến.
- **port effort:** Trung bình. Khái niệm nhỏ nhưng phải áp dụng ở mọi action mới. | **idea only:** True

## codex.99 Bộ dựng khung Flex tự viết có cache chiều cao

- **where:** codex-rs/tui/src/render/renderable.rs dòng 272-360
- **what:** Layout cột dọc với hệ số flex; con không có flex lấy đúng `desired_height`, phần dư chia theo tỷ lệ, con cuối hấp thụ phần làm tròn. Có vòng lặp "thỏa mãn con flex nhỏ hơn cả phần của nó rồi chia lại" để không để lại hàng trống.
- **how:** Cache hit khi `width` khớp lần trước (`cached_height: Cell<Option<(u16,u16)>>`); `render_scrolled` cho phép vẽ thẳng từ `scroll_offset`.
- **solves:** Giải quyết layout bottom-anchored (composer dính đáy) mà transcript vẫn cuộn được — thứ ratatui `Layout` không làm trực tiếp.
- **port effort:** Trung bình (~90 dòng). Có thể port gần như nguyên văn về TS. | **idea only:** False

## codex.100 Trait Renderable với cursor + scroll offset + style

- **where:** codex-rs/tui/src/render/renderable.rs dòng 15-29; `RenderableItem::{Owned,Borrowed}` dòng 32-78; `Insets`/`RectExt::inset` trong render/mod.rs
- **what:** Một trait duy nhất thay cho widget tree: `render`, `desired_height(width)`, `render_scrolled(…, offset) -> bool` (false = caller dùng fallback vẽ toàn bộ), `cursor_pos(area)`, `cursor_style(area)`. Có impl cho `()`, `&str`, `String`, `Paragraph`, `Line`.
- **how:** Khung chat: `flex.push(1, active_cell)` rồi `flex.push(0, bottom_pane.inset(Insets::tlbr(1,0,0,0)))`; `RectExt::inset` dùng phép trừ saturating an toàn mép màn hình.
- **solves:** Cây widget hẹp (1 trait, 1 hàm) thay vì định nghĩa widget mới cho mỗi loại nội dung; `cursor_pos` trả vị trí con trỏ từ bất kỳ tầng nào.
- **port effort:** Thấp-Trung bình. Cặp `render`/`desired_height` là mẫu rất dễ mang. | **idea only:** True

## codex.101 Kiểm thử bằng golden file Buffer kèm style từng ô

- **where:** chatwidget/tests/snapshots/…__exec_approval_modal_exec.snap (80×16 Buffer + style), bottom_pane/snapshots/…__command_popup_default_items.snap (49 dòng text), tui/snapshots/…__standard_viewport_growth_1.snap
- **what:** 1329 file `.snap`, 23.873 dòng. Format phổ biến nhất là `format!("{buf:?}")` — dump Buffer ratatui kèm mảng style từng ô, nên bắt được cả thay đổi màu/sáng/đậm chứ không chỉ text.
- **how:** `insta::assert_snapshot!`. Header `.snap` ghi `source:` và `expression:` nên khi test đổi chỗ gọi, `cargo insta` chỉ ra ngay.
- **solves:** Chứng minh bề mặt hiển thị bằng bytes thật — thứ mà assert chuỗi không bắt được (mất style, lệch cột, sai canh).
- **port effort:** Thấp nếu đã có hạ tầng snapshot. Ở omp cần một backend test in frame ra text + style. | **idea only:** True

## codex.102 Backtrack bằng cặp Esc kép (chỉnh prompt cũ)

- **where:** codex-rs/tui/src/app_backtrack.rs (42 KB; module con: browsing, legacy_input, prompt_navigation)
- **what:** Máy trạng thái nhỏ: Esc lần 1 "prime" và ghi thread id gốc; Esc lần 2 mở transcript rút gọn, highlight prompt user mới nhất; ←/→ chọn prompt; Ctrl+T bật/tắt chi tiết; Esc quay lại gốc; Enter yêu cầu revert trước prompt đã chọn và mở lại trong composer để sửa.
- **how:** Comment đầu file mô tả đủ 5 bước và giải thích vì sao owned-session dùng chung viewport transcript còn inline-session vẫn dùng overlay.
- **solves:** Sửa lại prompt đã gửi mà không mất ngữ cảnh — thao tác người dùng cần thật sự hay làm, hiếm CLI nào có.
- **port effort:** Trung bình. Cơ chế "revert trước turn N" đáng lấy; phần đồng bộ live tail giữa overlay và widget thì phức tạp. | **idea only:** True

## codex.103 Trình remap phím tắt ngay trong TUI

- **where:** codex-rs/tui/src/keymap_setup.rs (70 KB) + keymap_setup/{capture,debug}.rs + chatwidget/keymap_picker.rs
- **what:** `/keymap` mở giao diện remap cho 152 action theo context, có chế độ bấm-phím-vào (`KeymapCaptureView`) và chế độ xem/gỡ (`KeymapDebugView`).
- **how:** Hai view đều là `BottomPaneView`; danh sách action lấy từ chính `keymap_action_ids()` mà validator dùng, nên không thể lệch.
- **solves:** Người dùng đổi được phím mà không cần biết đọc file config, và danh sách hiện ra luôn khớp danh sách được kiểm tra.
- **port effort:** Trung bình. Cần cơ chế capture phím (chặn input trước khi gửi đi) + ghi config. | **idea only:** True

## codex.104 Statusline và terminal title cấu hình được theo danh sách mục

- **where:** codex-rs/tui/src/bottom_pane/status_line_setup.rs (enum dòng 56) + title_setup.rs (enum dòng 39) + status_surface_preview.rs
- **what:** `/statusline` và `/title` mở picker để tick mục hiển thị. 30 `StatusLineItem` (model, context-used/remaining, 5h limit, weekly limit, git branch, PR number, branch changes, thread credits, estimated cost, task progress, raw-output, fast-mode…) và 24 `TerminalTitleItem`. Nhiều mục có alias và giá trị legacy.
- **how:** `/statusline use_colors` bật tô màu theo theme; item tự ẩn khi dữ liệu không có ("omitted when unavailable") thay vì để trống.
- **solves:** Tuỳ biến hàng trạng thái mà không phải sửa template string.
- **port effort:** Thấp-Trung bình. Mô hình "tick mục + preview + ẩn khi thiếu dữ liệu" rất dễ mang. | **idea only:** True

## codex.105 Theme `.tmTheme` bundle tìm thêm từ $CODEX_HOME/themes

- **where:** codex-rs/tui/assets/themes/*.tmTheme (6 file) + src/theme_picker.rs (21 KB) + src/style.rs + src/render/highlight.rs (61 KB) + src/terminal_probe.rs (34 KB)
- **what:** 6 theme bundle (ada, babbage, curie, cushman, dali, davinci) đóng sẵn; người dùng thêm `.tmTheme` của riêng mình vào thư mục themes, picker tự liệt kê kèm và có live preview (2 bản render: wide/narrow tuỳ bề rộng).
- **how:** `config.theme` nhận tên kebab-case; để `None` thì tự dò light/dark. Palette được đọc thật qua terminal probe chứ không đoán.
- **solves:** Tái dùng theme VS Code đã có, giữ syntax highlighting khớp nền terminal thật.
- **port effort:** Trung bình. Cơ chế "đọc theme ngoài + probe màu nền terminal" là phần đáng lấy. | **idea only:** True

## codex.106 Agent command center — bảng điều khiển nhiều task

- **where:** codex-rs/tui/src/app/agents_overview*.rs (14 file ~200 KB; agents_overview_tests.rs 101 KB) + app/agent_center/{hints,input,mod,navigation,render,rows}.rs + AgentsOverviewView trong app/agents_overview_view.rs
- **what:** `/agents` (hoặc `codex agents`) mở bảng task nhóm theo trạng thái Needs input / Working / Ready / Inactive, nhóm theo project, có bộ lọc tab, tìm kiếm, gom nhóm, và hàng phím tắt dạng cột.
- **how:** Snapshot thật: tiêu đề + hàng đếm theo trạng thái + đường kẻ + bảng phím tắt 3 cột, chân "esc back". Phân loại: `AgentsOverviewGroup::for_status` map `ThreadStatus::{Active(waiting_on_approval|waiting_on_user_input)→NeedsYou, Active→Working, Idle→Ready, SystemError→NeedsYou, NotLoaded→Finished}`.
- **solves:** Quản lý nhiều agent/task song song mà không phải chuyển cửa sổ.
- **port effort:** Cao. Bảng + nhóm + bộ lọc thì dễ; trạng thái vòng đời task, resume/archive/delete từ xa, thanh tiến trình nền thì không. | **idea only:** True

## codex.107 Phân lớp overlay: BottomPaneView stack + pager overlay

- **where:** codex-rs/tui/src/bottom_pane/bottom_pane_view.rs (trait) + bottom_pane/mod.rs (`push_view` dòng 705, `show_selection_view` dòng 1423) + src/pager_overlay.rs
- **what:** Tầng dưới: `BottomPane` giữ `Vec<Box<dyn BottomPaneView>>` — 19 view production, mỗi view tự khai báo `keymap_contexts()`, `view_id()`, `selected_index()`, `apply_text_suggestion()`, `pre_draw_tick()`. Tầng trên: `enum Overlay { Transcript, Static, Analytics }`. Có `completion() -> ViewCompletion::{Accepted, Cancelled}`.
- **how:** Trait mặc định mọi hàm là no-op nên view chỉ override cái cần. `view_id` + `selected_index` cho phép refresh nền mà giữ đúng dòng đang chọn.
- **solves:** Thêm modal mới không phải sửa switch ở nhiều nơi; tách rõ input thuộc tầng nào (bottom pane cho view cơ hội nuốt Ctrl+C trước, ChatWidget mới quyết interrupt/quit).
- **port effort:** Trung bình. Giá trị nằm ở các hook (`view_id`, `selected_index`, `apply_text_suggestion`) giải quyết refresh nền. | **idea only:** True

## codex.108 Một picker chung phục vụ 87 call site

- **where:** codex-rs/tui/src/bottom_pane/list_selection_view.rs (113 KB) + selection_popup_common.rs (39 KB) + picker_presets.rs + selection_row_layout.rs + selection_tabs.rs
- **what:** `ListSelectionView` + `SelectionViewParams` làm hàng chục menu: chọn model, theme, pet, quản lý plugin, worktree, app, lọc usage, preset review, nhánh base, commit… 51 tiêu đề phân biệt được. Có preset `SelectionViewParams::picker()` đặt `ColumnWidthMode::AutoAllRows` + ẩn mô tả khi hẹp dưới 24 cột.
- **how:** Mỗi item là `SelectionItem { name, description, is_current, is_disabled, actions: Vec<Box<dyn Fn(Tx)>>, dismiss_on_select, require_explicit_confirmation }` — hành động là closure, không phải enum variant.
- **solves:** 87 menu khác nhau mà chỉ một chỗ lo phần trình bày, cuộn, cắt chữ, tính chiều cao, wrap mô tả.
- **port effort:** Thấp-Trung bình. Rất dễ mang; đáng chú ý là dùng `Vec<closure>` cho hành động thay vì enum → menu mới không cần sửa enum trung tâm. | **idea only:** True

## codex.109 Bảng hướng dẫn phím tắt tự co cột (3→2→1)

- **where:** codex-rs/tui/src/bottom_pane/shortcut_overlay.rs (5.9 KB) + shortcut_help.rs (3.2 KB)
- **what:** Bấm `?` mở bảng phím tắt trong composer; các nhóm tự chảy từ 3 cột xuống 2 rồi 1 cột tuỳ bề rộng mà không đổi cách bắt phím. Bị cắt vẫn giữ phần tuỳ chỉnh nhìn thấy được.
- **how:** Comment đầu file: "Groups flow into three, two, or one column without changing key routing. Runtime hints remain authoritative for remapped, chorded, and disabled bindings."
- **solves:** 152 action không thể nhồi một màn hình; phải hiện phụ thuộc độ rộng mà vẫn ưu tiên đúng binding đang hoạt động.
- **port effort:** Thấp-Trung bình. Ý tưởng "hint động lấy từ keymap đã resolve, không hard-code" là phần đáng lấy. | **idea only:** True

## codex.110 Chống giật khi gõ nhanh (paste-burst) và bracketed paste

- **where:** codex-rs/tui/src/bottom_pane/paste_burst.rs (25 KB) + chat_composer/paste_input.rs + chat_composer/slash_input.rs dòng 195-206 + bottom_pane/AGENTS.md
- **what:** Tam giác "burst detect" cho phép gõ nhanh không dính placeholder; bracketed paste chuẩn hoá về 1 sự kiện; cờ `disable_paste_burst` tắt hẳn. Có biến thể `QueuedInputAction::Literal` để dán nội dung bắt đầu bằng `!` không bị hiểu thành lệnh shell.
- **how:** Trait `BottomPaneView` có `flush_paste_burst_if_due()` và `is_in_paste_burst()` để modal tái dùng ChatComposer cũng hưởng cùng cơ chế.
- **solves:** Chữ bị nuốt khi gõ tay nhanh, hoặc dán 1 dòng bị tách nhầm thành nhiều lần gửi.
- **port effort:** Thấp-Trung bình. Biến thể `Literal` chống hiểu nhầm là chi tiết đáng chú ý. | **idea only:** True

## codex.111 Giới hạn 120 FPS ở tầng driver thay vì ràng buộc mọi widget

- **where:** codex-rs/tui/src/tui/frame_rate_limiter.rs (2.1 KB) + tui/frame_requester.rs (15 KB)
- **what:** Widget gọi `schedule_frame()` bao nhiêu cũng được; một limiter duy nhất ở tầng async scheduler kẹp deadline ≥ 8.33 ms.
- **how:** `clamp_deadline(requested)` = `requested.max(last_emitted + MIN_FRAME_INTERVAL)`; tách riêng một helper thuần tuý để unit-test được.
- **solves:** Animation liên tục (shimmer, spinner, pet) không khiến CPU cháy khi người dùng nhìn không kịp.
- **port effort:** Rất thấp. ~40 dòng, có thể chép nguyên văn. | **idea only:** False

## codex.112 Bật/tắt animation 6 effect, tự dò screen reader 1 lần

- **where:** codex-rs/tui/src/screen_reader.rs (6.7 KB) + screen_reader_windows.rs + config/src/tui_effects.rs
- **what:** `[tui.effects]` có 6 công tắc (starfield, shimmer, welcome, effort, progress, title), tất cả phụ thuộc khoá tổng `[tui] animations`. Động vui tự tắt nếu phát hiện screen reader, thời gian chờ probe 450 ms, kết quả ghi nhớ để không dò lại.
- **how:** `OnceLock<MotionMode>` cho probe 1 lần; nhận `&ConfigLayerStack` để lưu xuống config mà vẫn tôn trọng lựa chọn tường minh của người dùng.
- **solves:** Tôn trọng người dùng hỗ trợ trợ năng mà không bắt họ phải tự tìm khoá cấu hình.
- **port effort:** Thấp. Cơ chân "probe 1 lần + ghi nhớ + tôn trọng override tường minh" rất dễ port. | **idea only:** True

## codex.113 Trình cải hoa/blossom chạy ngay trong terminal

- **where:** codex-rs/tui/src/empty_state_animation.rs (6.4 KB) + 6 module con {geometry,lighting,paths,policy,renderer,sequence}
- **what:** Một animation pixel ở trạng thái rảnh, vẽ trực tiếp vào `Buffer` ở 20 fps, có bóng đổ mô phỏng, tôn trọng `ComposerState::{Empty,Draft}`, và dừng bộ đếm thời gian khi bị ẩn.
- **how:** Comment đầu file: "Visible time pauses while hidden; conversation lifecycle tracking is retained for the header."
- **solves:** Trạng thái rảnh vốn chết; biến nó thành chỗ báo "tôi đang ở đây".
- **port effort:** Cao. Chủ yếu là thẩm mỹ; giá trị chuyển giao nằm ở nguyên tắc "đồng hồ dừng khi ẩn". | **idea only:** True

## codex.114 Terminal pet (8 sprite) phản hồi trạng thái task

- **where:** codex-rs/tui/src/pets/ (10 file ~130 KB): catalog, model, ambient, image_protocol, sixel, frames, preview, picker, asset_pack
- **what:** `/pets` bật pet cạnh composer, đổi khung ảnh theo trạng thái: Running 3 phút, Failed 1 giờ, Waiting 24 giờ, Review 7 ngày. Hỗ trợ 3 giao thức ảnh terminal.
- **how:** 8 pet tích hẹp. Asset tải về `$CODEX_HOME/cache/tui-pets` (pack v1, CDN oaistatic, tối đa 4 MB, timeout 60 s). Ca ghép hình 192×208, lưới 8×9.
- **solves:** Trạng thái task nhìn thấy được từ rất xa — bạn rời ghế cũng biết nó còn chạy, đang chờ, hay đã chết.
- **port effort:** Trung bình. Bản rút gọn (1 sprite, 2-3 trạng thái) rất dễ; bản đầy đủ có CDN + 3 protocol ảnh thì nặng. | **idea only:** True

## codex.115 Bốn renderer giàu nội dung bật/tắt độc lập

- **where:** codex-rs/tui/src/markdown_render.rs (112 KB) + markdown_render/math/ + codex-rs/mermaid/ + src/table_detect.rs + assets/inline_visualization/
- **what:** `[tui.rendering]` bật/tắt: mermaid, math (Unicode), tables (pipe table kể cả trong fence), lists (bullet/task-list thành ký hiệu Unicode). Tắt thì giữ nguyên nguồn.
- **how:** Cố ý tách khỏi `animations` — "Rich content rendering. Independent of animations and visual effects."
- **solves:** Markdown thô trong terminal rất khó đọc; đồng thời phải chừa đường lùi cho ai không muốn.
- **port effort:** Trung bình-Cao cho mermaid+math; tables/lists thì thấp. | **idea only:** True

## codex.116 Dashboard phân tích tài khoản ngay trong TUI

- **where:** codex-rs/tui/src/analytics/ (~40 file) + analytics/activity_chart + analytics/plot
- **what:** Một overlay toàn màn hình với tab báo cáo, biểu đồ, bảng chọn và chi tiết nội tuyến.
- **how:** `Overlay::Analytics(Box<AnalyticsView>)` là biến thể thứ 3 của pager overlay. Comment: "Authenticated account analytics dashboard. Stable report tabs share bounded account loads, selection, and inline details."
- **solves:** Xem tiêu tốn token/chi phí mà không rời luồng làm việc.
- **port effort:** Cao. Phụ thuộc backend tài khoản; chỉ phần vẽ biểu đồ trong terminal mới đáng lấy. | **idea only:** True

## codex.117 Thông báo desktop qua OSC 9 / BEL với điều kiện focus

- **where:** codex-rs/tui/src/notifications/{mod,osc9,bel}.rs + config `notification_condition`
- **what:** Backend OSC 9 cho terminal hỗ trợ, rơi về BEL. Điều kiện mặc định chỉ báo khi terminal mất focus.
- **how:** `supports_osc9()` whitelist đúng 5 terminal (Ghostty, iTerm2, Kitty, Warp, WezTerm); có test khẳng định 10 terminal còn lại phải rơi về BEL.
- **solves:** Hay báo "xong rồi" khi người dùng đang ở cửa sổ khác.
- **port effort:** Rất thấp. ~100 dòng. | **idea only:** False

## codex.118 Chế độ inline (giữ scrollback) chọn được qua `/tui` cho lần chạy sau

- **where:** codex-rs/tui/src/chatwidget/tui_mode_picker.rs + cờ `--no-alt-screen` ở tui/src/cli.rs và cli/src/main.rs
- **what:** Chọn giữa Scrollback (dùng scrollback terminal) và Fullscreen (cuộn trong chính Codex). Chân popup ghi rõ "Restart to apply. Launch overrides still apply."
- **how:** `require_explicit_confirmation: true` trên item; giá trị lưu vào local settings cho lần khởi động sau.
- **solves:** Người dùng thích copy scrollback của terminal thì không bị mất khi dùng Codex.
- **port effort:** Thấp. Cơ chân "cài xong hẹn giờ cho lần sau" là mẫu hay. | **idea only:** True

## codex.119 Lịch sử composer có chế độ tìm ngược

- **where:** codex-rs/tui/src/bottom_pane/chat_composer/history_search.rs (50 KB) + vim_history.rs (28 KB) + chat_composer_history.rs (58 KB) + footer.rs:179
- **what:** Ctrl+R mở tìm ngược (có cả biến thể Vim), Ctrl+S sang kết quả kế, Esc quay về giữ nguyên draft.
- **how:** `FooterMode` chuyển sang `HistorySearch`; draft được nhớ riêng để thoát tìm không mất.
- **solves:** Gọi lại prompt cũ rồi sửa, thay vì gõ lại từ đầu.
- **port effort:** Thấp-Trung bình. | **idea only:** True

## codex.120 Chế độ Vim đầy đủ: 4 context, 69 action

- **where:** codex-rs/tui/src/bottom_pane/textarea/vim_commands.rs + keymap.rs (4 bảng action) + keymap/vim_search.rs
- **what:** Không phải "chế độ vim giả": normal / operator / search / text-object thật — 36 + 20 + 4 + 9 action, gồm cả `d i w`, `y a (`, `c a {`.
- **how:** 4 `KeymapContext` riêng với `allows_plain_chord_prefix()` trả true — cho phép prefix 1 ký tự vì phải tránh xung đột với global.
- **solves:** Người dùng vẫn giữ được văn phong edit sau khi bật.
- **port effort:** Cao cho bản đầy đủ; normal+operator cơ bản thì trung bình. | **idea only:** True

## codex.121 Tương tác chuột chọn theo overlay

- **where:** codex-rs/tui/src/tui.rs (`enum OverlayInput`, `captures_mouse`) + tui/alternate_screen.rs + config `right_click_paste`
- **what:** `OverlayInput` quyết định overlay nào bắt chuột: transcript và usage bắt, static pager thì không (vẫn cuộn bằng alternate-scroll), mặc định theo `owned_screen`. Chuột phải bật bằng tay.
- **how:** Đăng ký chuột chỉ khi overlay cần — tránh tranh chấp với scroll của terminal.
- **solves:** Giữ được cuộn bằng scrollback terminal ở nơi còn cần, bật chuột ở nơi cần.
- **port effort:** Thấp-Trung bình. | **idea only:** True

## codex.122 Hook vòng đời hiển thị ngay trên UI

- **where:** codex-rs/tui/src/bottom_pane/hooks_browser_view.rs (57 KB) + hook_status.rs + history_cell/hook_cell.rs (27 KB) + codex-rs/hooks/
- **what:** `/hooks` mở trình duyệt hook với chi tiết lệnh; khi hook chạy, dòng trạng thái hook thay status widget trong composer; hook lỗi sinh `HookCell` trong transcript.
- **how:** Điều kiện hiển thị: `if self.status.is_none() && let Some(message) = &self.hook_status_message` — hook chỉ chiếm chỗ status khi không có việc khác.
- **solves:** Hook vốn là thứ vô hình, giờ thấy được và can thiệp được.
- **port effort:** Trung bình. | **idea only:** True

## codex.123 Chống trùng phiên: thẻ "đang mở ở app khác"

- **where:** codex-rs/tui/src/chatwidget/rendering.rs dòng 23-125 (`struct ExternalWriterNotice` + `impl Renderable`)
- **what:** Khi cùng một hội thoại được mở ở nơi khác, TUI hiện thẻ "🔒 This conversation is open in another app" kèm hàng phím `r` retry / `f` fork / `Esc` command center / `Ctrl+C` `q` exit.
- **how:** Dựng thẻ bằng `Block` + `Insets::tlbr(1,2,1,2)`, tự co dòng theo bề rộng, chân giữ riêng một hàng nếu còn chỗ.
- **solves:** Hai tiến trình cùng ghi một phiên sẽ hỏng dữ liệu; chặn ngay từ UI thay vì để người dùng phát hiện.
- **port effort:** Thấp-Trung bình. Mẫu thẻ cảnh báo + hàng hành động là phần đáng lấy. | **idea only:** True

## codex.124 Bảng quyền tác động tới việc gõ tiếp theo

- **where:** codex-rs/tui/src/bottom_pane/approval_overlay.rs (92 KB) + permissions_menu.rs + permission_popups.rs + config/src/permissions_toml.rs
- **what:** `/permissions` và `request_user_input` hiển thị quyền sắp bị xin (kể cả rule dạng prefix), cho duyệt theo phiên hoặc theo prefix, phím tắt riêng (y / a / p / d).
- **how:** `ApprovalKeymap` 8 action riêng; `open_fullscreen` mặc định `Ctrl+A` và `Ctrl+Shift+A`. Bố cục thật từ snapshot: "Would you like to run the following command?" → Environment → Reason → `$ lệnh` → "› 1. Yes, proceed (y)" → "2. No … (esc)".
- **solves:** Người dùng hiểu ngay lệnh sắp chạy, chạy ở đâu, và vì sao — rồi quyết định có nhớ hay không.
- **port effort:** Trung bình. Phần "duyệt theo prefix" (nhớ cho `git status` nhưng không nhớ cho `rm`) là ý hay nhất. | **idea only:** True

## codex.125 Sandbox / approval chọn ngay từ dòng lệnh

- **where:** codex-rs/tui/src/cli.rs (`mark_tui_args`) + codex-rs/utils/cli/src/{approval_mode_cli_arg,sandbox_mode_cli_arg}.rs + codex-rs/sandboxing/
- **what:** `--ask-for-approval`, `--sandbox`, cùng cờ nguy hiểm `--dangerously-bypass-approvals-and-sandbox`. Ở TUI, cờ bypass và `--auto-review` khai báo `conflicts_with("approval_policy")` — không cho dùng cả hai.
- **how:** Ràng buộc xung đột đặt ở tầng clap chứ không phải kiểm tra thủ công trong code chạy.
- **solves:** Không cho vô tình kết hợp hai chế độ loại trừ đối lập rồi tưởng đang ở chế độ an toàn.
- **port effort:** Thấp. Mẫu "khai báo xung đột ở tầng parser" rất đáng học. | **idea only:** True

## codex.126 Bề mặt CLI tách bạch: 30 lệnh, chỉ TUI mới là tương tác

- **where:** codex-rs/cli/src/main.rs (173 KB, enum Subcommand dòng 143) + codex-rs/exec/src/cli.rs (24 cờ `#[arg]`, enum Command có resume/fork/review)
- **what:** Mỗi lệnh nghiệp vụ có cả hai mặt: interactive (TUI, mở picker) và non-interactive (`codex exec <lệnh>`, in ra stdout). `codex exec` có `--json` (JSONL), `--output-last-message`, `--output-schema`, `--ephemeral`, `--ignore-user-config`.
- **how:** 4 lệnh (`TcpTunnel`, `ResponsesApiProxy`, `StdioToUds`, `Execpolicy`) đánh dấu `hide = true` — tồn tại nhưng không phải bề mặt người dùng.
- **solves:** Script được một CLI nghiêm ngặt, không phải một TUI bị lột vỏ.
- **port effort:** Thấp-Trung bình. Phân tách "interactive vs exec" là quyết định kiến trúc, không phải chi tiết UI. | **idea only:** True

## codex.127 Trình chẩn đoán `codex doctor` 150 KB

- **where:** codex-rs/cli/src/doctor.rs (150 KB) + cli/src/doctor/
- **what:** Lệnh tự kiểm tra cài đặt, config, auth, runtime, in ra kết quả có cấu trúc.
- **how:** Tách riêng thư mục con cho từng nhóm kiểm tra.
- **solves:** Người dùng tự chẩn đoán được thay vì gửi log.
- **port effort:** Thấp-Trung bình. Tên "doctor" là mẫu hay; nội dung kiểm tra thì tuỳ sản phẩm. | **idea only:** True

## codex.128 Nối thẳng từ "agent xong" tới "code chạy được"

- **where:** codex-rs/cli/src/main.rs (biến thể `Apply`, dòng ~198)
- **what:** `codex apply` (alias `a`) lấy diff cuối cùng agent tạo rồi áp vào cây làm việc bằng `git apply`.
- **how:** Không phải lệnh chung chung "apply patch" mà gắn với đúng diff cuối của phiên.
- **solves:** Rút ngắn đường từ "agent xong" tới "code chạy được".
- **port effort:** Thấp. Có thể thêm vào omp. | **idea only:** True

## codex.129 Quản lý session từ CLI không cần vào TUI

- **where:** codex-rs/cli/src/main.rs + tui/src/session_archive_commands.rs + session_queue_commands.rs
- **what:** `archive`, `unarchive`, `delete`, `fork`, `queue`, `resume` đều nhận cả UUID lẫn tên thread, có `--last` và `--all`.
- **how:** UUID được ưu tiên nếu parse được, với comment ghi rõ thứ tự ưu tiên.
- **solves:** Vòng đời phiên quản lý được bằng script.
- **port effort:** Thấp. | **idea only:** True

## codex.130 Sinh TypeScript bindings và JSON Schema từ app-server protocol

- **where:** codex-rs/cli/src/main.rs (`AppServerSubcommand` 5 biến thể) + codex-rs/app-server-protocol/
- **what:** `codex app-server generate-ts` và `generate-json-schema` sinh hợp đồng cho client ngoài, kèm bản internal ẩn.
- **how:** Protocol là crate riêng nên sinh code không cần chạy TUI.
- **solves:** Cho phép có client ngoài mà không phải scrape hoặc đoán.
- **port effort:** Trung bình. Cần một lớp protocol riêng — khó hơn nhiều so với làm UI. | **idea only:** True

## codex.131 Slash popup lọc bằng fuzzy match

- **where:** codex-rs/tui/src/bottom_pane/slash_commands.rs (dùng `codex_utils_fuzzy_match::fuzzy_match`) + command_popup.rs (`on_composer_text_change`)
- **what:** Gõ `/mo` thu hẹp danh sách. Có test riêng khẳng định tìm tiền tố `/ac` loại `/compact` dù `/compact` là duy nhất khớp "compact".
- **how:** Chỉ lấy token đầu sau `/` làm bộ lọc; đổi bộ lọc thì reset scroll. Bảng 49 mục hiện trong cửa sổ cao 2 dòng khi lọc.
- **solves:** Tìm lệnh mà không nhớ tên.
- **port effort:** Thấp. Cần thư viện fuzzy match dùng chung. | **idea only:** True

## codex.132 Cú phích biệt danh `/gooooal` chạy `/goal`

- **where:** codex-rs/tui/src/bottom_pane/slash_commands.rs, cuối `find_builtin_command`
- **what:** Trong `find_builtin_command`, nếu không khớp tên nào, nó thử `strip_prefix('g')` + `strip_suffix("al")` và chỉ nhận khi phần giữa toàn ký tự `o`.
- **how:** Điều kiện kép: `!repeated_os.is_empty() && repeated_os.bytes().all(|b| b == b'o')` → `.then_some(SlashCommand::Goal)`.
- **solves:** Chi tiết vui, không phải vấn đề. Ghi lại vì nó là bằng chứng registry chấp nhận cả matching ngoài enum.
- **port effort:** Không áp dụng. | **idea only:** True

## codex.133 Sao chép có cấu trúc: cell, dòng, cây, cả cây

- **where:** codex-rs/tui/src/clipboard_copy.rs (29 KB) + chatwidget/copy_picker.rs + markdown_copy.rs + transcript_export.rs
- **what:** `/copy` mở chọn phần nào cần chép; `/export` xuất cả hội thoại ra markdown; clipboard dạng HTML qua clipboard_html.rs.
- **how:** Clipboard chạy qua worker riêng (`ClipboardWorker` trong `tui.rs`) để không chặn vòng vẽ.
- **solves:** Chép đúng phần mình cần mà không lẫn terminal escape.
- **port effort:** Thấp-Trung bình. Copy-theo-cấu-trúc thay vì copy-theo-màu rất đáng lấy. | **idea only:** True

## codex.134 Chế độ raw scrollback để copy thuận tiện

- **where:** codex-rs/tui/src/slash_command.rs (`Raw`), keymap `toggle_raw_output` (keymap.rs:1656), cờ `raw_output_mode`
- **what:** `/raw` (mặc định `Alt+R`) tắt khung cảnh hoá tạm thời để terminal selection hoạt động như thường.
- **how:** Lệnh nằm trong cả nhóm `available_during_task` lẫn `available_in_side_conversation` — cố ý cho phép bật giữa lúc chạy.
- **solves:** Giải quyết xung đột nền tảng giữa "TUI đẹp" và "copy được".
- **port effort:** Thấp. | **idea only:** True

## codex.135 Trợ giá kiểm tra cấu hình từ trong TUI

- **where:** codex-rs/tui/src/debug_config.rs (52 KB) + chatwidget/status_surfaces.rs (51 KB) + warnings_view.rs
- **what:** `/debug-config` in ra tầng cấu hình và nguồn của từng yêu cầu; `/status` in cấu hình phiên + mức dùng token; `/warnings` giữ lại cảnh báo để xem sau.
- **how:** `DebugConfig` bị ẩn khỏi popup qua bộ lọc `starts_with("debug")` nhưng vẫn gõ tay chạy được.
- **solves:** Nguyên nhân hàng đầu của "tính năng của tôi không hoạt động" — trả lời được ngay trong app.
- **port effort:** Trung bình. File 52 KB cho thấy đây là công sức lớn; giá trị của việc trả lời câu hỏi đó thì rất cao. | **idea only:** True

## codex.136 Kiểm tra chéo cấu hình bằng chính bộ chẩn đoán

- **where:** codex-rs/config/src/{types.rs, tui_effects.rs, tui_rendering.rs, strict_config.rs} + config-schema/
- **what:** Mọi struct cấu hình dùng `#[schemars(deny_unknown_fields)]`, và `strict_config` làm lỗi khi gặp khoá không nhận ra thay vì âm thầm bỏ qua.
- **how:** AGENTS.md yêu cầu chạy `just write-config-schema` khi đổi `ConfigToml`, sinh schema đã commit.
- **solves:** Ngăn việc config sai âm thầm.
- **port effort:** Thấp-Trung bình. Rẻ hơn nhiều so với tự viết validator. | **idea only:** True

## codex.137 Chính sách không viết prompt trong mã

- **where:** codex-rs/tui/assets/prompt_for_init_command.md + codex-rs/prompts/
- **what:** Prompt nằm ở file `.md` riêng, import bằng `with { type: "text" }`, tránh tạo prompt từ string concatenation.
- **how:** Tách prompt ra file cho phép sửa/review không cần đụng code.
- **solves:** Prompt trở thành artefact review được thay vì biến số ẩn trong logic.
- **port effort:** Thấp. Đây là quy tắc AGENTS.md của chính ultraworkers — Codex chỉ thực hành, không phát minh. | **idea only:** True

## codex.138 Thư mục tự hướng dẫn trong chính mã nguồn

- **where:** codex-rs/tui/src/bottom_pane/mod.rs (20 dòng doc đầu) + codex-rs/tui/src/bottom_pane/AGENTS.md + codex-rs/AGENTS.md (22 KB)
- **what:** Module doc của `bottom_pane/mod.rs` mô tả đúng thứ tự ưu tiên Ctrl+C/Ctrl+D và ai quyết interrupt so với quit; `src/bottom_pane/AGENTS.md` yêu cầu giữ doc đồng bộ với state machine.
- **how:** Doc viết ở dạng top-down giải thích luồng.
- **solves:** Trong TUI 425k dòng, phần lớn sự phức tạp là ở thứ tự quyết định, không phải ở thuật toán — doc ở đúng chỗ là thứ giữ được.
- **port effort:** Thấp. Đáng đánh giá cao. | **idea only:** True

## codex.139 Chính sách "cho phép trong lúc task chạy"

- **where:** codex-rs/tui/src/slash_command.rs (`available_during_task`, dòng ~238-300)
- **what:** 37/62 lệnh chạy được khi task đang chạy, kể cả lệnh thuần trình bày như `/statusline`, `/title`, `/model`, `/permissions`, `/skills`.
- **how:** Predicate khai trên enum, popup lọc theo; lệnh bị chặn hiện thông báo cụ thể thay vì im lặng biến mất.
- **solves:** Người dùng không bị khoá khỏi cài đặt chỉ vì agent đang bận.
- **port effort:** Thấp. Nhưng chính sách này hiện KHÔNG nhất quán — xem finding #2. | **idea only:** True

## codex.140 Sidebar "hội thoại phụ" (`/side`, `/btw`)

- **where:** codex-rs/tui/src/slash_command.rs (`available_in_side_conversation`), chatwidget/side.rs, src/multi_agents.rs (34 KB)
- **what:** Mở nhánh hội thoại tạm trong một fork thoảng, không phá hội thoại chính; 12 lệnh vẫn dùng được bên trong.
- **how:** Popup tự ẩn phần lệnh không dùng được khi đang ở side conversation.
- **solves:** Hỏi một câu phụ mà không làm nhiễu luồng chính.
- **port effort:** Trung bình. | **idea only:** True

## codex.141 Bảng thống kê chi phí theo luồng (50 credits · ~$1.82)

- **where:** codex-rs/tui/src/status/{card.rs (35 KB), thread_usage.rs, rate_limits.rs, account.rs} + chatwidget/thread_usage.rs
- **what:** `/status` hiển thị cards: Thread usage (credits + USD), phân bổ model, phân bổ reasoning, tốc độ, token đã bill (kể cả cached), cửa sổ ngữ cảnh.
- **how:** Snapshot thật: `│  Thread usage:  50 credits · ~$1.82  │` / `│  Models: GPT-5.4 80%, GPT-5 Mini 20%  │` / `│  Billed tokens: 120 input (25 cached) + 50 output │` trong khung bo góc.
- **solves:** Thấy tiền trước khi thấy hóa đơn.
- **port effort:** Thấp-Trung bình cho phần hiển thị; phần tính tiền phụ thuộc backend. | **idea only:** True

