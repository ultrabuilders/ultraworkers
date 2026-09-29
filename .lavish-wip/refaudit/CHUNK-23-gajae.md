# gajae — chunk 5/6 (22 năng lực)

## gajae.89 Shell: vendored brush engine + a 20-filter output minimizer

- **where:** crates/pi-shell/ (34 files: shell.rs 3,568, process.rs 2,816, minimizer/ 16 files incl. filters/git.rs 511, cargo.rs 371, go.rs 433, js_tools.rs 532); exports `Shell`, `execute_shell`, `apply_bash_fixups`, `MinimizerOptions`
- **what:** A Rust shell that reuses the vendored `brush` crates rather than wrapping `/bin/sh`, plus a `minimizer/` subsystem with 20 language/tool filters (git, cargo, go, python, ruby, docker, bun, gh, js_tools, lint, pkg, cloud, dotnet, system, …) that reduces noisy command output before it reaches the model.
- **how:** `execute_shell` is exposed as a napi binding consumed by packages/coding-agent/src/exec/bash-executor.ts; `applyBashFixups` normalizes user-authored bash before execution
- **solves:** Two problems at once: predictable shell semantics without depending on the host shell, and not burning context on 4,000-line `npm install` logs.
- **port effort:** High, and mostly not novel — omp already has the shell via pi-natives. The genuinely distinct piece is the filter-per-toolchain minimizer, which is a decent idea but 5,000+ lines of Rust to re-create. | **idea only:** True
## gajae.90 Browser: 20-module CDP stack with 12 structured verbs and real Chrome profiles

- **where:** packages/coding-agent/src/tools/browser/ (20 modules, 5,652 LOC) + tools/browser.ts (22 KB); deps puppeteer-core 24.42.0, @puppeteer/browsers 2.13.0
- **what:** A browser tool whose model-facing surface is 12 structured verbs (navigate, click, type, fill, select, press, scroll, back, wait, observe, extract, screenshot) compiled onto in-tab helpers, running in a worker, with a raw-JS escape hatch; plus real Chrome profile mode (user_data_dir, profile_directory, background, no_focus, cdp_port) that drives an already-logged-in browser via CDP.
- **how:** elements are addressed by numeric `id` from a prior `observe` (selector fallback); actions are compiled by browser/actions.ts `compileActionSteps` onto the unchanged worker protocol; separate tab supervisor with dead-tab recovery, profile reuse and warmup, readability extraction, and render-mermaid/render paths
- **solves:** Asking a model to author raw page JavaScript for every interaction is slow and error-prone, and a fresh headless Chrome is useless against anything behind a login.
- **port effort:** Medium-high. omp already drives a browser. The distinctive part is the `observe`→id→verb loop plus real-profile CDP, not the puppeteer plumbing. | **idea only:** True
## gajae.91 Computer-use: gated macOS desktop control via a Rust supervisor

- **where:** tools/computer.ts (44 KB) + crates/pi-natives/src/computer/ (8 files: executor.rs 1,393, input.rs 1,057, controller.rs 802, capture.rs 382, supervisor.rs 204, permissions.rs 220); napi bindings computerScreenshot
- **what:** Screenshot/click/double_click/move/drag/scroll/type/keypress/wait plus a `batch` wrapper, executed through a native supervisor with permission checks, coordinate transforms, hotkey parsing and a bypass guard. Explicitly Apple-Silicon-macOS-only (excluded on linux, win32, darwin/x64).
- **how:** native supervisor process holds the Accessibility/ScreenRecording grant; `bypass_guard.rs` blocks escape hatches; per-test isolation is enforced by a computer-policy.ts gate plus computer.redteam.test.ts (32 KB) and computer.enforcement.test.ts (12 KB)
- **solves:** Desktop apps that have no web surface at all, without giving an agent unbounded OS control.
- **port effort:** Very high and platform-locked. The transferable idea is the permission + bypass-guard + redteam-test triad around a dangerous tool; the Rust supervisor is not worth porting to Linux-first omp. | **idea only:** True
## gajae.92 SDK broker over authenticated WebSocket with 19 typed operations

- **where:** packages/coding-agent/src/sdk/broker/ (27 files: lifecycle.ts 7,664, broker.ts 5,118, session-index.ts 2,515, managed-task-dag.ts 1,927, spawn-authority.ts 1,192, lifecycle-ledger.ts 1,035)
- **what:** A daemon that owns session lifecycle for out-of-process SDK clients: session list/create/fork/resume/close/delete/lookup/reconcile_uncertain, session control, model resolve, session spawn, task DAG, broker shutdown/status/restart. Protocol version 3, 4 MiB frame cap, HMAC + timing-safe-compare authentication, idempotency keys, an operation receipt ledger, a lifecycle ledger, and endpoint-incarnation authority.
- **how:** 19 operations in a `BROKER_OPERATIONS` Set on `broker/transport.ts`; discovery via a discovery file; `reconcile_uncertain` exists precisely because a client can die mid-operation — the ledger makes that recoverable instead of leaking a session
- **solves:** Multiple clients driving sessions need one authority, and network death between 'sent' and 'acked' must not leave orphan sessions.
- **port effort:** Very high (20k+ LOC). `reconcile_uncertain` plus the idempotency-key + receipt-ledger trio is the idea worth stealing; the rest is earned complexity. | **idea only:** True
## gajae.93 Web fetch with 74 site-specific extractors and 18 search providers

- **where:** packages/coding-agent/src/web/ — scrapers/ (79 files, index.ts re-exports 74 handlers), search/ (provider.ts registry, 21 provider modules), search/providers/insane.ts (21 KB, the vendored insane-search lineage)
- **what:** Fetch normalizes arbitrary pages to markdown via linkedom/turndown/readability, with 74 hand-written per-site handlers (npm, PyPI, crates.io, NuGet, Maven, GitHub, GitLab, HuggingFace, Discourse, Mastodon, Reddit, arXiv, Crossref, OSV, NVD, …) and 18 registered search providers behind a 17-entry default order.
- **how:** each handler claims a host and returns a typed RenderResult; search providers are lazily `import()`ed behind `{ id, label, load }` descriptors so a provider costs nothing until selected
- **solves:** Generic extraction returns navigation chrome and marketing copy; per-site handlers return the actual artifact. 18 interchangeable search backends means a dead provider is a config change.
- **port effort:** Medium for the lazy-provider descriptor pattern; very high for the 74 handlers, which is grinding work with no design content. omp should take the pattern and a handful of handlers, not the corpus. | **idea only:** True
## gajae.94 11 separate bun:sqlite databases with named path helpers

- **where:** packages/ai/src/{auth-storage,model-cache}.ts, src/session/{agent-storage,history-storage}.ts, src/memories/storage.ts, src/tools/{github-cache,read,write}.ts, src/gjc-runtime/{memory-guard-owner-claims,tmux-owner-isolation}.ts, src/ai/utils/tool-choice-capability.ts, packages/stats/src/db.ts; path helpers getAgentDbPath/getStatsDbPath/getModelDbPath in packages/utils/src/dirs.ts:894-913
- **what:** SQLite used for auth credentials, model cache (with schema version + static/dynamic fingerprint provenance), tool-choice capability cache, agent settings, session history, memories, GitHub cache, memory-guard owner claims, tmux owner isolation, and the stats dashboard. Read/write tools open a user-named `.sqlite` file read-only or create:false.
- **how:** all via `bun:sqlite` `new Database(path, {create, strict, readonly})`; three central path helpers so an agentDir profile moves every database together
- **solves:** Cross-process atomicity for state several daemons touch, without a server. `strict: true` turns silent type coercion into errors.
- **port effort:** Already have the primitive. The transferable detail is the model-cache provenance design — it stores `static_fingerprint` and `dynamic_model_provenance` alongside a schema version so a stale cache can be explained rather than silently trusted. | **idea only:** False
## gajae.95 ACP (Agent Client Protocol) adapter with MCP startup budgeting

- **where:** packages/coding-agent/src/sdk/acp/adapter.ts (1,058 lines), final-text.ts, mcp.ts; napi binding crates/gjc-sdk + crates/pi-natives/src/sdk.rs (1,333 lines) and python/gjc-sdk
- **what:** Speaks the Agent Client Protocol (@agentclientprotocol/sdk 1.3.0) as a front end, with an explicit readiness budget: `ACP_MCP_STARTUP_HEADROOM_MS = 250` is subtracted from the semantic-ready deadline so a slow MCP handshake cannot consume the whole startup window, and `ACP_MCP_REQUEST_TIMEOUT_MS = 30_000`.
- **how:** readiness deadline minus headroom gives the MCP startup ceiling; SessionLifecycleMcpServer is a discriminated union of stdio | http | sse with env/headers
- **solves:** Third-party clients (Zed, etc.) need one protocol, not per-client adapters; and a slow MCP server must not make the whole client look hung.
- **port effort:** Medium if omp wants editor-embeddable operation. The readiness-budget arithmetic is a small, high-value idea. | **idea only:** True
## gajae.96 Function-hook capability system với attenuation + grant hash + audit chain

- **where:** packages/coding-agent/src/extensibility/extensions/function-hooks.ts (959 dòng) + runner.ts (72KB) + wrapper.ts
- **what:** Hook được cấp grant theo cây capability (tool.inspect/transform/deny, ui.*, session.*, audit.append, network.fetch, filesystem.read) kèm networkDestinations và filesystemRoots. Có `attenuateDownstream` (chỉ thu hẹp, không mở rộng), `intersectFunctionHookGrants` (giao), `functionHookGrantHash` (SHA-256 canonical), audit record ghi `payloadHash`/`capabilityHash`/`effectiveCapabilities`/`requestedCapabilities`.
- **how:** `normalizeFunctionHookGrant` validate + Object.freeze; `createFunctionHookCapabilities` dựng object API chỉ gắn method cho operation được cấp; mỗi call lại `assertActive()` + check operation; `network.fetch` ép `redirect:"error"` và chỉ cho origin trong grant; `filesystem.read` nhận `grant.filesystemRoots` làm tham số bắt buộc.
- **solves:** Chặn plugin/extension chiếm quyền: một hook khai báo `tool.inspect` không thể lấy `network.fetch`; grant của caller bị giao với host ceiling, không bao giờ nới lỏng. Đây là mô hình capability thật, không phải kiểm tra allowlist rời rạc.
- **port effort:** cao — cần port cả function-hooks.ts, runner.ts phần hook chain, và bảng contract. Ý tưởng đáng lấy nguyên: capability + attenuation + grant hash + audit record. | **idea only:** False
## gajae.97 Hook convention-normalization với typed diagnostics thay vì reject im lặng

- **where:** packages/coding-agent/src/hooks/events.ts + normalize.ts
- **what:** Một bảng `CONVENTION_EVENT_CONTRACTS` khai báo 6 convention (native-gjc, claude-code, codex, codex-managed-json, gjc-plugin, in-process) × 6 canonical event, mỗi ô mang authority / awaitBehavior / errorBehavior / timeoutMs / processAuthority / trustRequirement / redaction. `normalize.ts` biến bảng đó thành 9 mã chẩn đoán có cấu trúc thay vì throw.
- **how:** `normalizeDirectoryHook` / `normalizeManagedJsonHook` / `normalizePluginHook` / `normalizeInProcessHook` trả `NormalizeHookResult {hook|null, diagnostics[]}`; `normalizeHookBatch` dedupe first-wins và giữ cả entry trùng trong diagnostics.
- **solves:** Ba hệ sinh thái hook (Claude Code, Codex, GJC native) có tên event và ngữ nghĩa khác nhau. Bảng + alias + diagnostics làm việc hợp nhất trở thành dữ liệu có kiểm chứng thay vì đối chiếu tay.
- **port effort:** trung bình — bảng contract + normalizer gần như có thể chuyển nguyên văn, chỉ đổi tên event. | **idea only:** True
## gajae.98 Secret obfuscation bằng keyed PRF, không phải mask tĩnh

- **where:** packages/coding-agent/src/secrets/obfuscator.ts (437 dòng) + secrets/index.ts
- **what:** Thay vì `sk-***abcd`, secret được thay bằng chuỗi cùng độ dài sinh từ HMAC-SHA256 với key 32 byte random **per process** và domain separator riêng cho placeholder vs replacement. Rejection-sampling lấy byte < 248 để phân phối ký tự đều tuyệt đối trên 62 ký tự.
- **how:** `createSecretObfuscator` sinh key random mỗi process; replacement giữ nguyên `String.length`; project `secrets.yml` chỉ được khai báo `plain`, `regex` bị skip (global-only) vì regex là denial-of-service vector.
- **solves:** Một observer thấy transcript (context model, log provider, transcript chia sẻ) không thể offline-confirm candidate secret và không thể precompute replacement, vì không có key.
- **port effort:** thấp-trung bình — file tự chứa, phụ thuộc `redactCrashSecrets` từ utils. Cần port cả utils/crash-redaction.ts. | **idea only:** False
## gajae.99 Credential environment tách khỏi project `.env`

- **where:** packages/utils/src/env.ts:227 + session/startup-auth-config.ts:113 + utils/npm-registry.ts:22
- **what:** `$credentialEnv(name)` đọc theo thứ tự: inherited shell env → live Bun.env → agent `.env` → pi `.env` → home `.env` → home shell env. KHÔNG BAO GIỜ đọc `<cwd>/.env` — layer mà Bun tự merge vào `Bun.env` khi launch trong repo.
- **how:** `$inheritedEnv` chụp snapshot lúc import để pin provenance (không phải cache vĩnh viễn — xóa env là có hiệu lực); `$rotatingCredentialEnv` cho phép token rotate trong file agent khi process còn sống.
- **solves:** Repo người dùng vừa clone không thể tự chỉ định credential hoặc redirect nơi credential được gửi đi. `npm-registry.ts` còn bỏ luôn project `.npmrc` vì lý do tương tự.
- **port effort:** trung bình — cần chỉnh lại toàn bộ call site đọc env cho credential. Ý tưởng (`$credentialEnv` vs `$inheritedEnv`) rất đáng port. | **idea only:** True
## gajae.100 Telemetry allowlist + forbidden-key fail-closed + kill switch

- **where:** packages/coding-agent/src/telemetry/{events,transport,control}.ts + settings-schema.ts:1834
- **what:** Chỉ 5 event name (update_check/install), chỉ 5 field, mọi key khớp `FORBIDDEN_KEY` làm serialize throw. `serializeTelemetryEvent(input: unknown)` nhận `unknown` và tự dựng output từ allowlist.
- **how:** Default `telemetry.enabled: false`; `GJC_DISABLE_TELEMETRY` là kill switch process-wide không override được bởi project dotenv; `hasForbiddenKey` quét đệ quy toàn cây; transport `redirect:"error"`, max 2 in-flight, timeout 1.5s, nuốt mọi lỗi.
- **solves:** Telemetry không bao giờ trở thành đường rò rỉ ngoài ý muốn: thêm field mới vào event là việc phải sửa allowlist, và bất kỳ key nhạy cảm nào lọt vào là fail-closed chứ không phải bị bỏ qua.
- **port effort:** thấp — 3 file, không phụ thuộc gì. Port gần như nguyên văn. | **idea only:** False
## gajae.101 Crash relay: hai tầng consent tách biệt, không có DSN literal trong binary

- **where:** packages/coding-agent/src/crash/upstream/{relay,dsn,envelope}.ts + utils/crash-redaction.ts (90 dòng, 12+ shape token)
- **what:** `gjc crash report` (issue flow) giữ consent theo từng lần gọi có digest-confirm. Relay Sentry là kênh egress thứ hai, gated bằng config, hẹp hơn nhiều: default off (off ⇒ **không đọc state, không IO**), phải có DSN do operator cung cấp, mọi byte phải qua `sanitizeExternalCrashV1` và refuse = drop không có fallback.
- **how:** Relay chạy ở startup kế tiếp sau compaction, không chạy trên fatal path (process chết vẫn chỉ làm đúng một write `O_APPEND`); cap 8 signature/run; `redactDsn` bỏ public key khi log.
- **solves:** Không build nào có sẵn destination để gửi crash đi nếu operator không cấu hình. Đồng thời tách bạch "cho phép gửi report" và "cho phép auto-relay".
- **port effort:** trung bình — logic dễ port nhưng phụ thuộc `crash-journal` + `index-store` + `postmortem.ts` (30KB). | **idea only:** True
## gajae.102 Lock file với host identity + stale verdict + manual cleanup command

- **where:** packages/coding-agent/src/config/file-lock.ts (94KB) + gjc-runtime/session-state-lock.ts
- **what:** `acquireFileLock` / `withFileLock` / GC / staging reap. Owner token gồm host id + pid + process start time; có `previousOwnerHostIds` để reclaim an toàn trên shared volume. Stale removal trả verdict có type, và khi cùng một owner chết lặp lại thì sinh `manualCleanupCommand` cho người vận hành.
- **how:** session-state-lock chịu cả 2 on-disk shape (regular-file `.lock` JSON của Coordinator cũ vs directory-style lock của runtime base) bằng `lstat`, và fail-closed khi gặp symlink/FIFO/socket/device.
- **solves:** Crash-loop state file không kẹt vĩnh viễn; đồng thời không bao giờ đi theo symlink do kẻ tấn công chọn.
- **port effort:** cao — 94KB phụ thuộc native bindings (`@gajae-code/natives`: snapshotDirectoryTree, renameNoReplacePathAsync…). Ý tưởng stale-verdict + manual-cleanup-command rất đáng lấy. | **idea only:** True
## gajae.103 Guard chain phân tầng quanh mọi tool, có provenance của "built-in đã chứng minh"

- **where:** packages/coding-agent/src/session/agent-session.ts:11661-11705
- **what:** Mọi tool đi qua 5 lớp: `guardToolForUltragoalAsk` → acp-permission → workflow-mutation-guard → cwd-transition-fence → ExtensionToolWrapper. Có bộ nhớ cache wrapper theo cache key để không rebuild mỗi lần.
- **how:** Comment tại dòng 11696-11698 nói rõ: wrapper dựng từ built-in đã chứng minh thì kế thừa proof; wrapper dựng từ custom/MCP/extension tool thì kế thừa **không**.
- **solves:** Phân biệt được "tool này được host bảo đảm" với "tool này do bên thứ ba mang vào" — nền tảng cho policy khác nhau theo nguồn.
- **port effort:** trung bình — pattern Proxy-chain rất dễ tái dựng, cần giữ nguyên nguyên tắc provenance. | **idea only:** True
## gajae.104 Điều kiện trả về của hook được schema-check trước khi vào host control flow

- **where:** packages/coding-agent/src/extensibility/extensions/function-hooks.ts:900-959
- **what:** `isValidFunctionHookReturnValue` kiểm tra từng event type với `hasOnlyKeys` — hook trả về key lạ (vd `tool_call` trả kèm `content`) bị từ chối thay vì được spread vào state.
- **how:** `isPlainFunctionHookData` + `isSafeFunctionHookValue` chặn prototype lạ, getter, cycle, non-finite number; `cloneFunctionHookDataStrict` dùng `structuredClone` rồi verify lại là plain data.
- **solves:** Chặn prototype-pollution và việc hook âm thầm chèn field vào event để đi vòng kiểm tra của host.
- **port effort:** thấp — logic thuần, không phụ thuộc runtime. | **idea only:** False
## gajae.105 Redaction có budget thay vì redact vô hạn

- **where:** packages/coding-agent/src/extensibility/extensions/function-hooks.ts:334-372
- **what:** `redactFunctionHookValue` giới hạn depth 5, 32 key mỗi object, 32 phần tử mỗi array, chuỗi 512 char, key 80 char; accessor thành `<accessor>` mà KHÔNG gọi.
- **how:** Dùng `Object.getOwnPropertyDescriptor` + kiểm `"value" in descriptor`; WeakSet chống cycle; `payloadHash` băm **sau** khi redact.
- **solves:** Một hook trả về object khổng lồ hoặc có getter độc hại không làm nghẽn hay side-effect lúc audit.
- **port effort:** thấp — hàm thuần, copy gần như nguyên văn. | **idea only:** False
## gajae.106 `gjc doctor` với repair có journal, dry-run và precondition

- **where:** packages/coding-agent/src/cli/doctor/
- **what:** 25 file / 14.140 dòng, 13 check id (runtime, config, permissions, installation, link, credentials, mcp, native, projection, service, plugin…). Repair khai báo `riskClasses`, `authorization`, `preconditions`, `sideEffectStarted`, `nonrollbackableEffects`, và ghi `DoctorJournal`.
- **how:** Permission repair yêu cầu `native exact identity` (so với dev/ino đã ghi) + `owner-preserving mode reduction` + `ACL absence`, hỗ trợ `--dry-run`; có `plugin-quarantine.ts` / `plugin-restore.ts` để cô lập plugin lỗi.
- **solves:** Sửa chữa cấu hình/quyền mà không phá hỏng thêm, và mọi thay đổi đều truy vết được.
- **port effort:** cao — 14k dòng. Ý tưởng "repair có precondition + journal + authorization list" rất đáng lấy. | **idea only:** True
## gajae.107 Daemon operator contract: exit code tách lỗi, và thừa nhận "unknown ≠ applied"

- **where:** packages/coding-agent/src/daemon/operator-contract.ts
- **what:** `DAEMON_EXIT = {ok:0, failure:1, usage:2}`; ownership-mismatch guard từ chối start khi đã có daemon sống với bot token/chat khác; `daemonOperationOutcome` trả `"unknown"` khi `!result.ok`.
- **how:** Comment: "A refused result may follow a successful stop or spawn; snapshots and prose do not prove that no effect occurred. Only completed results prove applied."
- **solves:** Script automation không diễn giải "từ chối" thành "không có gì xảy ra" — một quan niệm sai thường gây mất dữ liệu khi ghép nối cạnh bị giữa chừng.
- **port effort:** thấp-trung bình — chỉ là type + formatter, dễ port. | **idea only:** True
## gajae.108 Bash allowlist với shell parser tự viết thay vì regex

- **where:** packages/coding-agent/src/tools/bash-allowed-prefixes.ts (12KB) + tools/bash.ts:1320-1400
- **what:** Không so khớp regex trên chuỗi lệnh. Một tokenizer theo ký tự với state machine tilde-expansion, phân biệt quote/assignment word/expansion, chặn `;|&<>()`, chặn `$ * ? [ ] { }` chưa quote, chặn command substitution và backslash escape. Profile `read-only` ép `normalizeReadOnlyBashCommand`.
- **how:** Đồng thời kiểm cả `rawCommand` lẫn `command` đã bóc `cd ... &&` để không né bằng prefix navigation.
- **solves:** Đóng các lỗ hổng kinh điển của allowlist shell bằng regex (quote smuggling, tilde expansion sai vị trí, `&&` prefix).
- **port effort:** trung bình — parser độc lập, port được; cần map lại policy. | **idea only:** True
## gajae.109 Spawn gate: bắt buộc justification có cấu trúc khi fan-out lớn

- **where:** packages/coding-agent/src/task/spawn-gate.ts
- **what:** Trên `DEFAULT_SPAWN_THRESHOLD = 4` child, mọi lần spawn phải kèm `SpawnPlanReceipt` đủ 5 field (`whyParallel`, `whyNotLocal`, `independence`, `expectedReceiptShape`, `maxInlineTokens`), thiếu bất kỳ field nào thì `outcome:"rejected"` kèm danh sách `missingFields`.
- **how:** `decide()` là hàm thuần, `evaluateSpawnGate` là entry point; `findMissingPlanFields` trả về danh sách cụ thể để agent sửa được ngay.
- **solves:** Chặn subagent fan-out không kiểm soát bằng cách buộc agent cam kết bằng văn bản trước khi nhân bản bản thân.
- **port effort:** thấp — 90 dòng thuần logic. | **idea only:** False
## gajae.110 Background job có ownership lease + dead-letter + resume descriptor

- **where:** packages/coding-agent/src/async/job-manager.ts (127KB)
- **what:** Job model có `AsyncJobDelivery` state machine (`pending|delivered|failed-visible`), `AsyncJobReceiptClaim`, `DeadLetteredDelivery`, `OwnerSubagentShutdownError` với Target/Lease/Proof, `ResumeDescriptor`/`ResumeQueueEntry`, `AsyncJobWaitOutcome = completed|timed_out_wait|interrupted`.
- **how:** Ownership gắn theo tool-call id + lineage hash + endpoint id; resume cấp lại lineage/epoch MỚI tại thời điểm dequeue thật, không phải lúc enqueue.
- **solves:** Phân biệt "job con thuộc sở hữu của tôi" với "job của session khác còn sót", và không để job chết im lặng.
- **port effort:** cao — 127KB. Cấu trúc `OwnerSubagentShutdownProof` và `JobDeliveryState` thì đáng lấy nguyên. | **idea only:** True
