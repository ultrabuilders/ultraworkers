# senpi — chunk 4/5 (22 năng lực)

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
