# senpi — chunk 5/5 (22 năng lực)

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

