# codex — chunk 4/7 (22 năng lực)

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
