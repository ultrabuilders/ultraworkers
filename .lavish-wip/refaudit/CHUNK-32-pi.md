# pi — chunk 2/5 (22 năng lực)

## pi.23 Unified resource manifest (extensions/skills/prompts/themes)

- **where:** pi-manifest.ts (whole file); package-manager.ts:194-210
- **what:** One `package.json` `pi` key declares all four resource types. `RESOURCE_TYPES = ['extensions','skills','prompts','themes']` with a parallel `FILE_PATTERNS` map (.ts|.js, .md, .md, .json). The same package installs and versions all of them as a unit.
- **how:** SourceInfo { scope: 'user'|'project'|'temporary', origin: 'package'|'top-level' } tags every loaded resource.
- **solves:** A customization is usually tools + prompts + a skill together; making them one unit is what makes them shareable.
- **port effort:** low | **idea only:** False
## pi.24 Project-trust two-pass load

- **where:** resource-loader.ts:435-440 and :445-465; runner.ts:291-318 (emitProjectTrustEvent)
- **what:** `loadProjectTrustExtensions()` forces `setProjectTrusted(false)`, loads, then the caller decides via `resolveProjectTrust`, then `reload()` re-resolves for real. Doc: 'Only personal and explicit command-line extensions can participate in the project_trust event that runs before project extensions load.' The trust event is dispatched by the runner with a ProjectTrustHandler returning 'yes'|'no'|'undecided'.
- **how:** Same gate guards project SYSTEM.md/APPEND_SYSTEM.md/skills (resource-loader.ts:1112, :1126).
- **solves:** Opening a hostile repo must not execute its extensions before the user consents.
- **port effort:** medium-high — the ordering is subtle but it is the security property; worth porting exactly. | **idea only:** True
## pi.25 Package distribution (npm/git/URL/local)

- **where:** core/package-manager.ts (2,730 LOC); docs/packages.md
- **what:** `pi install npm:@scope/pi-tools@1.0.0` / `git:github.com/x/y@v1` / `https://...` / `./local`. npm specs and git refs are pinned; `pi update --extensions` reconciles without moving a configured ref. Identity: npm by name, git by repo URL *without the ref*, local by resolved absolute path — 'This prevents the same package from loading twice through equivalent declarations.'
- **how:** `resourcePrecedenceRank` (package-manager.ts:189): origin==='package' -> 4 (always wins); else scope (project 0 / user 2) + (source==='local' ? 0 : 1).
- **solves:** Extensions execute arbitrary code, so provenance and single-identity matter more than convenience.
- **port effort:** high — the installer is the biggest single file in the system. | **idea only:** True
## pi.26 Deterministic extension precedence

- **where:** resource-loader.ts:676-682; runner.ts:588-621
- **what:** Extensions are NOT loaded in completion order. `orderedExtensions = extensionPaths.map(resolve).filter(defined)`, then `inlineExtensions.push(...)` last. Handler iteration order ('Handlers run in extension load and registration order') and first-wins tool/flag lookup both fall out of this.
- **how:** Inline extensions carry a synthetic path `<inline:name>` (types.ts:1764-1771) and are appended last.
- **solves:** Async loading would otherwise make override behavior nondeterministic between runs.
- **port effort:** low | **idea only:** False
## pi.27 Shared inter-extension event bus

- **where:** core/event-bus.ts (whole file); loader.ts:195-205 (trackEventBusSubscription)
- **what:** `pi.events` is a thin `EventEmitter` (33 lines total). `pi.events.on()` auto-wraps the handler in try/catch so one extension's throw cannot break another's, and the returned unsubscribe is tracked by the runtime so it dies on invalidate.
- **how:** Errors go to console.error, not the extension error channel.
- **solves:** Composability — e.g. the plan-mode example drives other extensions without importing them.
- **port effort:** low | **idea only:** True
## pi.28 State-storage decision table (branch-correct state)

- **where:** docs/extensions.md:169-188; types.ts:806 (SessionBoundaryDraft), :1778 (RegisteredTool)
- **what:** docs/extensions.md:169-188 gives a 4-row table: branch-following tool state -> tool-result `details`; durable non-context data -> `appendEntry()`; content sent to the model -> `sendMessage()`; outside-session -> external storage. And the load-bearing rule: 'Reconstruct branch-sensitive state from ctx.sessionManager.getBranch() during session_start. Do not rebuild it from every file entry because abandoned branches represent alternative histories.'
- **how:** Custom entries can have renderers (registerEntryRenderer) without participating in LLM context — display-only, branch-invisible.
- **solves:** Sessions are a TREE, not a log. Naive state reconstruction silently resurrects abandoned-branch state.
- **port effort:** low as a rule; high if the host session model isn't already a tree. | **idea only:** True
## pi.29 Tool contract with per-tool execution mode

- **where:** types.ts:461-529; README 'Key Patterns' for the StringEnum/Google constraint
- **what:** ToolDefinition carries name/label/description/promptSnippet/promptGuidelines/TypeBox params/constrainedSampling/renderShell/executionMode/execute/renderCall/renderResult. `executionMode: 'sequential'` exists specifically for tools sharing mutable state (tic-tac-toe example); default is parallel. Nested model calls must report `usage` in the result or session totals drift.
- **how:** `defineTool()` exists purely to preserve param inference when a definition is assigned to a variable.
- **solves:** Parallel tool execution is the default for throughput, which breaks stateful tools — the opt-in escape must be part of the contract, not a convention.
- **port effort:** medium | **idea only:** False
## pi.30 Capability-lifecycle-enforced facet kernel (tier 2)

- **where:** packages/chord/src/types.ts:263-289; facets/host.ts:47-140
- **what:** FacetEnvironment = use (hard dep), observe (keyed dep), provide, provideMany, replicatedState, own(disposal), onActivate, onDeactivate. State machine `setting_up | prepared | active | disposing | dead` with `assertSettingUp/assertRunning/assertActive/assertServiceAccess` — misusing the API is a thrown Error naming the facet and the state, not a silent bug. Disposal runs effects in reverse, aggregating errors.
- **how:** onDeactivate is implemented as `lifecycle.own(callback)` (host.ts:592), so teardown shares the reverse-order effects list.
- **solves:** Tier 1 has no deactivation at all; here lifecycle misuse is structurally impossible and teardown is guaranteed and ordered.
- **port effort:** high — a different programming model, not a copy. The lifecycle-assertion idea is the takeaway. | **idea only:** True
## pi.31 Facet DAG validation + topological activation

- **where:** facets/host.ts:808-906
- **what:** validateFacets rejects duplicate service provision across facets, checks every `use`/`observe` requirement has a provider (with a precise error: 'requires local/<id>/<mode>, but no facet provides it'), and activation runs in topological order with teardown in reverse. Reload is transactional: staged candidates, dispose staged on failure, `sameReferences()` to skip no-op swaps.
- **how:** GenerationPhase: setup | assembling | connecting | activating | active | reloading | disposing | dead.
- **solves:** Hot-swapping a plugin set without leaving a half-wired graph.
- **port effort:** high | **idea only:** True
## pi.32 Session/worker vs TUI/presentation facet split

- **where:** examples/plugins/pi-example-plugin/src/session.ts vs src/tui.ts; experimental/plugins/package.ts:13
- **what:** One plugin package ships two facets. `src/session.ts` runs inside a session worker and provides services + owns replicated state; `src/tui.ts` runs in the client presentation and only *consumes* services. DEFAULT_PLUGIN_FACETS = { session: 'src/session.ts', tui: 'src/tui.ts' }. The TUI facet cannot touch the session directly — it goes through `defineService` RPC.
- **how:** Services carry a `Context` argument that serves as the activation context (e.g. BACKGROUND_CONTEXT) for state changes.
- **solves:** Same author, two processes, one contract — without the presentation side gaining ambient authority over the session.
- **port effort:** high; the *capability separation* is the idea worth stealing. | **idea only:** True
## pi.33 Server-owned, serialized plugin builds

- **where:** experimental/plugins/package.ts:69-104, :104-140
- **what:** `createServerPluginPackage` gives each server generation a serialized build queue (`buildTail`) so concurrent builds can't interleave; output is hashed by package path; presentation artifacts are built server-side and shipped as data, so the client only instantiates what the server selected. Per-session plugin selection is persisted (sha256 of sessionPath, mode 0o600) with strict schema validation that rejects unknown keys.
- **how:** `createPresentationFacetData` / `createPresentationFacetLoaders` split the same bundle into a wire format and a loader.
- **solves:** Client must not decide what code runs; the server owns the build and the selection.
- **port effort:** high | **idea only:** True
## pi.34 Tier-1 ↔ tier-2 capability bridge

- **where:** experimental/plugins/bundled.ts:51-55; experimental/plugin.ts
- **what:** The facet world reaches tier 1 through one resolution: `resolvePluginExternal` maps the single specifier `@earendil-works/pi-coding-agent/experimental/plugin` to a URL, picking `.ts` vs `.js` by whether the host is running from source. That module exports only AgentController, PresentationUI, SlashCommands.
- **how:** Everything else a facet wants from the host must be a chord Service, defined via defineService.
- **solves:** Keeps a hard boundary: plugins get a narrow, enumerated host API rather than the 64-point ExtensionAPI.
- **port effort:** low as a rule | **idea only:** True
## pi.35 Project trust — directory-scoped resource gate

- **where:** packages/coding-agent/src/core/trust-manager.ts (246L), src/core/project-trust.ts (97L)
- **what:** A single tri-state decision (`true`/`false`/`null`) per canonicalized directory, stored in `~/.pi/agent/trust.json`, resolved by walking up to the nearest ancestor with a recorded decision. Gating list is a frozen const, not a heuristic.
- **how:** `hasTrustRequiringProjectResources(cwd)` (trust-manager.ts:185) checks a frozen `TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES` list (settings.json, extensions, skills, prompts, themes, SYSTEM.md, APPEND_SYSTEM.md) plus ancestor `.agents/skills`, explicitly excluding `~/.agents/skills` even when cwd==$HOME (line 197). `resolveProjectTrusted()` (project-trust.ts:46) applies precedence: `--approve`/`--no-approve` → extension `project_trust` event → saved nearest-ancestor decision → `defaultProjectTrust` → UI prompt. `if (!hasUI) return false` (line 86-88) is fail-closed for print/json/rpc.
- **solves:** Stops an untrusted repo from silently loading executable extensions, system-prompt files, or project settings at startup — the one boundary that is actually enforced in this codebase.
- **port effort:** Low — ~340 lines, zero deps beyond `proper-lockfile`, self-contained, and the enforcement side already exists in settings-manager/package-manager. | **idea only:** False
## pi.36 Trust enforcement at the consumer (defence in depth)

- **where:** packages/coding-agent/src/core/settings-manager.ts:523-526, src/core/package-manager.ts:1747
- **what:** Declining trust does not merely skip a load — it actively wipes the already-parsed project settings object and re-merges, and independently refuses project package storage.
- **how:** `setProjectTrusted(false)` sets `this.projectSettings = {}` and recomputes `deepMergeSettings(global, project)`. `package-manager.ts:1747` throws `"Project is not trusted; refusing to access project package storage"`. Both are fail-closed throws, not warnings.
- **solves:** A gate that only controls one code path is not a boundary. pi re-checks at every consumer, so a second path into project settings cannot bypass the decision.
- **port effort:** Low — the pattern (re-check the decision at the consumer, throw on deny) is the reusable part; the specific call sites are pi-shaped. | **idea only:** True
## pi.37 tool_call interception hook (the permission extension point)

- **where:** packages/coding-agent/src/core/extensions/runner.ts:1134-1152
- **what:** An extension event that runs before every tool call and can block it, short-circuiting the handler chain. This is the seam a real permission layer plugs into.
- **how:** `emitToolCall()` iterates `snapshotEventHandlers(this.extensions, "tool_call")`; the first handler returning a result with `block: true` returns immediately. Demonstrated end-to-end by `examples/extensions/permission-gate.ts` (regex on `rm -rf|sudo|chmod 777`, `ctx.ui.select` confirm, and `if (!ctx.hasUI) return {block:true}` — i.e. non-interactive defaults to deny).
- **solves:** Gives third parties a supported, non-forked way to add per-call approval without patching the tool layer.
- **port effort:** Medium — the hook is the reusable idea; omp would need to define the event contract, the ctx shape (hasUI/ui.select), and the block result type. | **idea only:** True
## pi.38 Config value resolution: !command / $ENV / literal

- **where:** packages/coding-agent/src/core/resolve-config-value.ts (288L)
- **what:** Settings can hold a literal, an env-var reference, a template, or a shell command whose stdout becomes the value — keeping API keys out of settings files entirely.
- **how:** `parseConfigValueReference()` splits on leading `!` (command) vs template; `parseConfigValueTemplate()` handles `$VAR`, `${VAR}`, `$$` and `$!` escapes with a strict `ENV_VAR_NAME_RE`. `executeWithDefaultShell` uses `execSync` with `timeout: 10000` and `stdio:["ignore","pipe","ignore"]` (stderr swallowed). Results memoized in a process-lifetime `Map`.
- **solves:** Secrets never have to be written to disk in the settings file; supports 1password/`op read`/keychain shims.
- **port effort:** Low — self-contained, but see the finding on swallowed stderr and uncached-vs-cached divergence. | **idea only:** False
## pi.39 Credential redaction for diagnostics

- **where:** packages/coding-agent/src/core/bug-report.ts:20-59, 66-91
- **what:** A reusable redaction layer: key-name-based secret stripping, URL credential/query-param scrubbing, and env-name-only collection.
- **how:** `SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key|secret|token|password|passwd|credential|authorization|cookie)(?:$|[-_])/i` with camelCase→snake normalisation before the test (line 23). `redactUrl()` strips userinfo and redacts sensitive query params, handling nested schemes via a recursive regex (line 28). `redactJsonValue()` applies both as a `JSON.stringify` replacer. `collectEnvironment()` emits only `Object.keys(process.env).filter(n => n.startsWith("PI_"))` — names never values (line 87-90).
- **solves:** Making a support bundle safe to upload without hand-auditing every field.
- **port effort:** Low — ~40 lines, pure functions, directly liftable. Caveat: key-name-only matching misses secrets embedded in free-text values (see finding). | **idea only:** False
## pi.40 At-rest credential hardening + cross-process locking

- **where:** packages/coding-agent/src/core/auth-storage.ts:25, 59, 65, 106, 187
- **what:** The one place pi gets file modes right, plus a lock discipline for multi-process access to a single state file.
- **how:** `AUTH_FILE_WRITE_OPTIONS = { encoding:"utf-8", mode:0o600 }` with an explicit comment that the mode applies only on creation so admin ACLs survive. Dir created `mode:0o700`. `proper-lockfile.lockSync` with `maxAttempts:10`, `delayMs:20`, retrying only on `ELOCKED` and rethrowing anything else. Trust store uses the same pattern (`trust-manager.ts:137-167`) locking the directory with an explicit `lockfilePath`.
- **solves:** Prevents world-readable API keys and prevents concurrent pi processes from corrupting the credential file.
- **port effort:** Low — pattern is small; the only real gap is that no other writer inherits the discipline (see finding). | **idea only:** False
## pi.41 TOCTOU-safe unix socket publisher

- **where:** packages/server/src/transports/unix/listener.ts:47-86, 299-310, 147-158
- **what:** A local IPC daemon listener that resists a same-user attacker pre-planting a file at the socket path.
- **how:** `start()` binds a unique `ownedBindPath`, then `lstat` + `isSocket()` assertion (line 75), records `{dev, ino}` (line 76), and publishes with `link()` (line 77) — atomic and fails if the destination exists, so an attacker who recreates the path in the window causes a fail-closed throw. `chmod` to mode (default 0o600, line 11) happens after publish. Cleanup re-`lstat`s and compares dev/ino before unlinking (line 158), so it never removes a socket that was swapped out. `removeStaleSocket` refuses non-socket paths, probes liveness via a connect attempt, and renames the stale file to `stale-<uuid6>` rather than deleting it.
- **solves:** A naive `server.listen(path)` + `unlink(path)` daemon is hijackable and can unlink an attacker's replacement.
- **port effort:** Medium — ~200 lines of careful fs/net sequencing, but self-contained and directly liftable. | **idea only:** False
## pi.42 Bounded retry with quota fail-fast

- **where:** packages/ai/src/utils/retry.ts (243L), packages/ai/src/utils/provider-retry.ts (125L)
- **what:** Two-layer retry: an inner provider-SDK layer and an outer assistant-turn layer, with an explicit do-not-retry classification.
- **how:** `retryAssistantCall()` loops to `maxRetries`, delay = `baseDelayMs * 2^(attempt-1)` capped at 60s, `sleep()` is abort-aware and normalizes mid-backoff aborts into a `stopReason:"aborted"` message. `NON_RETRYABLE_PROVIDER_LIMIT_ERROR_PATTERN` (retry.ts:7-24) lists `insufficient_quota`, `billing`, `Monthly usage limit reached`, `GoUsageLimitError` so billing exhaustion fails fast instead of burning the budget. Inner layer honours `retry-after-ms`/`retry-after` and `x-should-retry`, and throws if a server-requested delay exceeds the cap (provider-retry.ts:36-48). `RetryCallbacks` (`onRetryScheduled`/`onRetryAttemptStart`/`onRetryFinished`) give structured observability.
- **solves:** Distinguishing transient throttling from deterministic failures, so a dead API key fails in one call and a 429 backs off properly.
- **port effort:** Low for the policy shape; the string-classification regexes are pi/provider-specific and would need rework. | **idea only:** True
## pi.43 Crash ring buffer with one-shot notification

- **where:** packages/coding-agent/src/core/crash-log.ts (full)
- **what:** Bounded, self-expiring crash persistence that never grows and never nags.
- **how:** `MAX_CRASH_RECORDS = 5`, `MAX_AGE = 7 * 24 * 60 * 60 * 1000`; `recordCrash` appends and `.slice(-MAX_CRASH_RECORDS)`; `takeUnnotifiedCrash` returns the newest un-notified record within the age window and marks `notified: true` on the way out (so a crash is reported once, not every launch). `readCrashLog` is fully try/catch-guarded because it runs while crashing. Also `findExtensionStackMatches()` attributes a crash to a loaded extension by path-matching stack frames.
- **solves:** Post-mortem data without log bloat or notification spam, safe to call from a crashing process.
- **port effort:** Low — small, self-contained, and a good template for omp's crash path. | **idea only:** False
## pi.44 Durable transaction layer with read-before-write enforcement

- **where:** packages/durable/src/errors.ts, src/session/transaction.ts (32KB), src/storage/sqlite/node.ts, src/storage/jsonl/storage.ts
- **what:** A real transactional state model over pluggable storage (jsonl + sqlite), with a compile/runtime invariant that catches a whole class of subtle bug.
- **how:** `class ReadAfterWrite extends Error` — `"Tx.${method}() cannot read tables after the first table write"` — thrown at runtime, making an ordering bug loud instead of silently returning stale data. sqlite adapter uses `BEGIN IMMEDIATE`, `PRAGMA journal_mode = WAL`, configurable `wal_autocheckpoint`, and `PRAGMA wal_checkpoint(TRUNCATE)` on close. `StorageRejected` distinguishes "rejected before any durable effect; the owning Session may continue safely". Typed `Id`/`Seq` brands with `idFromNumber`/`seqFromNumber` applied only at trusted boundaries.
- **solves:** Makes state mutation transactional and turns read-after-write into an explicit, testable error rather than a correctness landmine.
- **port effort:** High — 16.6K lines, but the ReadAfterWrite invariant and the rejected-vs-corrupt error split are cheap ideas worth stealing independently. | **idea only:** True
