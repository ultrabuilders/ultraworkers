# dsh — chunk 2/5 (22 năng lực)

## dsh.23 Compaction as a log-bracketed transaction

- **where:** packages/compaction/compaction-basic/src/region.ts:173 (compactSurfaceRegion), :117 (selectCompactableRange); documented in docs/subsystems/compaction.md
- **what:** Compaction acquires a durable lock (`compaction/start`), summarizes, commits a single surface replacement, and releases (`compaction/end`) — with the opening marker deliberately appended *last* in release order so a crash leaves a detectable orphan rather than a false success.
- **how:** Range selection (:117) retains a priced token tail, walks backward until `toolPairingBalancedBefore` holds so a tool-call/result pair is never split, and refuses to include surface node 0. Mid-flight the region is re-validated against the live surface (`assertSelectedSpanStable`, :447) because summarization yields. Exactly one `compaction/end` attempt is made on any failure, and a failed close deliberately leaves the unmatched start detectable.
- **solves:** The classic compaction bugs: splitting an assistant tool-call from its result (invalid on every provider), summarizing a range that shifted while the LLM was working, and reporting success for a transaction that never committed.
- **port effort:** Medium-high for the transaction, low for the range-selection rules. Both are worth taking. | **idea only:** True
## dsh.24 Context-overflow recovery loop with durable-progress proof

- **where:** packages/compaction/compaction-basic/src/index.ts:190-234, :155-178 (pressure-triggered pre-step compaction)
- **what:** When a request fails with CONTEXT_WINDOW_EXCEEDED, compaction runs and the step is retried — but only if the surface's `replaceGeneration` actually advanced. A failed compaction that nonetheless landed a model-free prune is accepted as sufficient proof.
- **how:** Retries are bounded per agent by `policy.maxOverflowRetries` and reset on `agent/status === 'idle'` or on any `assistant/message`. The failure path checks `signal.aborted` first (cancellation always wins), then compares `agent.session.surface.replaceGeneration > generation`.
- **solves:** Naive "compact and retry on overflow" loops forever when compaction cannot free enough, and retries pointlessly when it freed nothing. Tying the retry decision to an observable surface counter makes both cases decidable.
- **port effort:** Low-medium, and highly portable in spirit: retry only on *proven* progress. | **idea only:** True
## dsh.25 KV-cache-aligned summarization

- **where:** packages/compaction/compaction-basic/src/summarizer.ts:22-32 (COMPACTION_INSTRUCTION), :71-84 (SummarizationInput doc), :90+
- **what:** The compaction call replays the conversation's own system prompt, tools, and leading messages verbatim, and delivers the compaction directive as the *final user message* rather than as a separate summarizer system prompt — so the auxiliary call is a true prefix of the last real request.
- **how:** The directive explicitly acknowledges a prior `<compacted-summary>` block and instructs the model to merge rather than copy it forward, and forbids mentioning the compaction itself. A fixed 7-section Markdown schema with "write (none), never drop a section" makes checkpoints comparable across compaction events.
- **solves:** Most harnesses invalidate the KV cache on every compaction, making compaction the single most expensive operation in a long session. Also solves checkpoint-stacking: without the merge instruction, a second compaction copies the first checkpoint forward verbatim.
- **port effort:** Low. The prefix-alignment insight is portable in a day; the 7-section schema is a reasonable starting template. | **idea only:** True
## dsh.26 Provider-owned retry policy executed at a loop extension point

- **where:** packages/llm/llm/src/retry-policy.ts (policy shape + resolution), packages/llm/llm-retry/src/index.ts:195, :243
- **what:** Retry is not built into the loop. Adapters own a `retryPolicy` per route; the optional `llm-retry` plugin executes it on `agent/request-error`, and the loop's own behaviour is only "ask, and retry if someone says retry".
- **how:** Bounded exponential backoff with symmetric jitter, capped by `maxDelayMs` and by `MAX_TIMER_DELAY_MS`; the delay is cancellable via AbortSignal. Default retryable set is `EMPTY_RESPONSE, RATE_LIMIT, SERVER, TIMEOUT, TRANSPORT` — note `INVALID_CREDENTIAL` is explicitly excluded with the reasoning that a malformed credential fails identically on every attempt. Each scheduled retry is durable before its cancellable wait.
- **solves:** Retries are provider-specific and rarely uniform. Keeping the policy in the adapter config and the executor in a plugin means a deployment can drop retries entirely, or switch to `mode: 'always'`, without touching the loop.
- **port effort:** Low. The backoff math is trivial; the *placement* (extension point, not loop code) is the idea. | **idea only:** True
## dsh.27 Depth-budgeted continuable subagents

- **where:** packages/subagent/subagent/src/child-agent.ts:52 (resolveChildDepth), packages/subagent/subagent/src/continuation.ts:1-14 (contract), packages/subagent/subagent/src/continuation-activation.ts (35 KB)
- **what:** Delegation depth is derived from the parent's persisted header (a monotone floor), so a resumed parent cannot delegate as if it were top-level. A continuable child has one durable Session and at most one process-local Activation.
- **how:** `resolveChildDepth` throws `SubagentDepthError` past the cap and `RangeError` outside safe-integer range. The stated contract: "The Agent inbox is the only turn queue, so this manager owns durable orchestration while the Agent loop owns all turn ordering and execution. No continuable path creates a Task or an intermediate result-bearing wrapper." Backends: in-process spawn, in-process fork (history-seeded), ACP, real Codex app-server, real Claude Code Agent SDK, and Harness-over-SDK.
- **solves:** Subagent depth limits are usually advisory and bypassable on resume, because depth lives in process memory. Deriving it from the parent's persisted header makes it survive restart. The "inbox is the only turn queue" constraint avoids the double-queueing bug where a subagent has both an agent queue and a wrapper-level task queue.
- **port effort:** Medium. The depth-from-persisted-header rule is the portable part; the six backends are not. | **idea only:** True
## dsh.28 Scoped agent event dispatch where subject and scope cannot diverge

- **where:** packages/core/agent/src/dispatch.ts:20-30 (AgentSubjectEvent type derivation), :76+ (agentEvents)
- **what:** `agentEvents` fuses the event's `agent` subject with its scope carrier, so a listener can never observe one agent's payload in another agent's scope.
- **how:** The event set is derived by *type*, not a hand-maintained list: an event qualifies only if its first parameter carries `{ agent: Agent }` AND its `this` is `Scoped<Agent>`. The `this` check is what excludes zero-arg events and payload-happens-to-carry-an-Agent events. The carrier is stateless and built once per agent, keeping hot-path dispatch allocation-free.
- **solves:** Multi-agent routing bugs where a listener for agent A fires on agent B's event. Deriving the routable set from the type signature means a new agent-scoped event is automatically scoped — no registry to forget to update.
- **port effort:** Low. The type-level derivation is the whole trick. | **idea only:** True
## dsh.29 Model-free context reduction as a separate concern from summarization

- **where:** packages/compaction/compaction-tool-result-pruner/src/index.ts:40 (ToolResultPruner, requires tokenMeter), packages/spill/spill-policy/src/index.ts:22, packages/spill/spill/src/types.ts (SpillRef)
- **what:** Tool-result pruning (head/middle/tail character budgets) and output spilling (token-budgeted, with a recoverable locator) are separate plugins from summary compaction, so a deployment can run the cheap reduction without ever calling a summarizer.
- **how:** The pruner emits a `PRUNE_MARKER` in place of removed middle content and requires the token meter because each shadowed node is priced by its own logged shadow-price event. The spill policy keeps recoverable text behind an opaque `SpillLocator` that consumers render via `retrievalHint` and are forbidden to parse; missing recovery storage keeps the original content and logs the reason.
- **solves:** Most of a context window is usually old tool output, not conversation. Reducing it deterministically is cheaper, faster, and lossless-ish compared to summarizing, and keeping the artifact recoverable means the model can re-read it.
- **port effort:** Low-medium. Both plugins are small and self-contained. | **idea only:** True
## dsh.30 Session format as a versioned migration chain

- **where:** packages/core/session/src/types.ts:89, packages/session/session-format{,-v0-to-v1,-v1-to-v2,-v2-to-v3,-v3-to-v4}/, packages/session/session-format/src/chain.ts
- **what:** `SESSION_FORMAT_VERSION = 4` with four independent migration packages, each re-exporting its predecessor's released codec so a v0 log can be read without a fallback path.
- **how:** Each successor exports `releasedV<N-1>SessionFormatCodec` and its own `assertReleasedV<N>Header` validators. AGENTS.md states the rule: "may add a version-named successor but never move, overwrite, or delete committed generations; predecessors imply neither fallback nor downgrade support."
- **solves:** Session formats drift. Without a chain, upgrading the harness orphans every existing session. With one, old logs stay readable and each generation is independently testable.
- **port effort:** Low to establish the rule early, high to retrofit. This is a "decide now, pay later" item. | **idea only:** True
## dsh.31 MCP tool-name contract: server-qualified, pure, collision-proof public names

- **where:** packages/mcp/mcp-client/src/tools.ts:81-87 (`publicToolName`); contract pinned in .agents/notes/implemented/feature/2026-07-07-mcp-client-plugin.md
- **what:** Derives the model-facing tool name as a pure function of the pair (serverName, rawName) — `mcp__<serverName>__<rawName>` — normalized to a 64-char `[A-Za-z0-9_-]` contract. If normalization is lossy (any char replaced OR length > 64), a 12-hex-char SHA-256 of `serverName\0rawName` is appended to the 51-char stem, so distinct identities can never collapse. The raw name is the only thing ever sent on the wire; the public name is never parsed back.
- **how:** Deterministic pure function, unit-tested as a v1 contract. `scopeOf(ctx)` scopes the namespace so two agents can both mount a `github` server without colliding.
- **solves:** Session history, permission rules, and KV-cache prefixes survive server restarts, HMR hot-swaps, and unrelated servers' tool-list changes. Without the hash, a long or punctuated upstream name could silently map two different MCP tools onto one model-visible name.
- **port effort:** Small — the function is ~7 lines; the expensive part is the invariant that the name is a pure function of local config and never of the remote `serverInfo.name` (untrusted, not unique across deployments, changes on upgrade). | **idea only:** True
## dsh.32 Generation swap: full-set-or-nothing tool registry sync

- **where:** packages/mcp/mcp-client/src/tools.ts:113-162; serialization via `syncChain` in connection.ts:168-177
- **what:** `syncTools` runs in two phases. Phase 1 fetches and builds the ENTIRE next generation into a Map without touching the registry — any throw (network failure, duplicate raw name) leaves the previous generation registered and untouched. Phase 2 disposes the previous generation and registers the new one; if ANY registration conflicts, every disposer collected so far runs and the server is left with ZERO tools, never a partial set.
- **how:** A registration conflict on an `mcp__<server>__` name can only mean a foreign registration squats the namespace, so partial registration is never the right answer. Initial sync may use `registrationFailure: 'throw'` (when `failOnStartupError`) so activation rejects; re-syncs always 'contain'.
- **solves:** A model never sees half a server's tool set, and a transient discovery failure never silently drops working tools. A promise chain (`syncChain`) serializes initial, notification, and reconnect syncs so two swaps can never interleave and double-dispose one generation.
- **port effort:** Small — ~50 lines plus the serialization chain. Directly portable to any registry that swaps a set of registrations. | **idea only:** True
## dsh.33 Outage-budget reconnect supervisor that survives crash loops

- **where:** packages/mcp/mcp-client/src/connection.ts:211-245 (`scheduleReconnect`), :257-343 (`connectGeneration`)
- **what:** One shared budget per outage: `maxAttempts` consecutive failures, delays doubling `initialDelayMs`→`maxDelayMs`. The budget resets only when a connection stays up longer than `maxDelayMs` — so a server that connects briefly then crashes still exhausts the cap instead of restarting forever. Reconnect timers are `.unref()`'d so an armed retry never holds the process open.
- **how:** `connectedAt` is compared against `maxDelayMs` at the moment of loss (line 222) to decide whether the outage ended. Exhaustion unregisters tools and stops; disposal (HMR or restart) is the only way back.
- **solves:** Distinguishes 'server is flapping' from 'server is down' without a separate flapping detector, and prevents a reconnect loop from becoming a process-lifetime resource leak.
- **port effort:** Medium — the state machine (client, closeClient, disposers, reconnectTimer, failedAttempts, connectedAt, isCurrent guard) is ~120 lines. The isCurrent-guard-per-generation pattern is the reusable part. | **idea only:** True
## dsh.34 Egress-test discipline: one proxy-driven transport test per outbound call site

- **where:** packages/util/http-proxy/README.md ("Writing a new outbound call"); the 9 files found by `find . -name egress.spec.ts`
- **what:** Each package that makes an outbound HTTP call carries a `tests/egress.spec.ts` that drives its ACTUAL transport through a fake proxy and asserts the observed route. 9 such files exist. The README states the rule as mandatory: "Every new outbound call site must include that transport test."
- **how:** The proxy installer patches the global undici dispatcher. Because an SDK's routing lives inside the SDK, a lint rule cannot see it — so a real request through a fake proxy is the only assertion that catches a dependency silently switching transports.
- **solves:** Detects dependency upgrades that reroute traffic away from the proxy with no change at the call site — the exact failure a unit test with a mocked fetch would miss.
- **port effort:** Very low as a rule (one spec file per outbound package). The 681-line http-proxy implementation itself is the expensive part. | **idea only:** True
## dsh.35 Process-wide proxy as an installed global, not a plugin

- **where:** packages/util/http-proxy/src/{policy,install}.ts (681 lines); README rationale: "transport policy has one answer per process"
- **what:** `dsh-http-proxy` is a library, not a Cordis plugin: the launcher resolves the policy once per process and installs a global undici dispatcher, so plain `fetch()` and any SDK reaching `globalThis.fetch` (MCP HTTP transport, the pi-ai provider stack) are proxied with zero call-site change. Loopback always bypasses. Unsupported proxy schemes (SOCKS/PAC) are reported and skipped rather than failing startup.
- **how:** `proxyRouteFor(url)` returns the transport the answer assumed (its proxied arm carries the dispatcher), so a caller cannot read the policy then build a transport that bypasses it after an unmount. `verify-no-bare-dispatcher` rejects `new Agent(...)` outside this package; `web-fetch-http` has one legitimate exemption marked with a `proxy-exempt:` comment.
- **solves:** Proxies every future outbound call without touching it, and makes the one exemption explicit and greppable instead of an invisible divergence.
- **port effort:** High to port the implementation; low to adopt the 'library not plugin' shape and the `proxy-exempt:` comment convention. | **idea only:** True
## dsh.36 Compat 'drift gates' that fail compilation when upstream adds a member

- **where:** packages/llm/llm-pi-ai/src/catalog.ts:99-160 (THINKING_FORMAT_GATE, MAX_TOKENS_FIELD_GATE, THINKING_TOKEN_BUDGET_FIELD_GATE, CACHE_CONTROL_FORMAT_GATE, CHAT_TEMPLATE_VAR_GATE, protocol→gate map at :312-316)
- **what:** A `Record<UpstreamUnion, true>` typed as a const map forces every member of the upstream compat union to be named in one place. If pi-ai adds a new thinking format or token-budget spelling, the key type no longer matches and the build FAILS until a maintainer classifies it. Currently: 12 thinking formats, 2 maxTokensField spellings, 3 thinkingTokenBudgetField spellings, 1 cacheControlFormat, 3 chatTemplateVars, 5 protocol names.
- **how:** Also used for a second purpose: a switch settable on one protocol is inherited by the three Responses protocols because they share a compat type, so the gate is shared deliberately rather than duplicated.
- **solves:** The offer can never silently lag the upstream option set — there is no runtime 'unknown value' path, because a new value cannot compile until someone decides its disposition.
- **port effort:** Low. This is the closest thing in dsh to omp's `packages/catalog/src/compat/rules/` KDL discipline — same intent (no hard-coded model policy in TS, exhaustive classification), different mechanism (compile-time exhaustiveness vs. generated rule tree). | **idea only:** True
## dsh.37 Vendored framework with an exhaustive 22-entry local-patch ledger

- **where:** vendor/README.md (Manifest table, 9 rows; 'Local modifications', 22 numbered entries); vendor/AGENTS.md; docs/rescope.md; `pnpm run rescope-vendor --apply`
- **what:** All 9 Cordis foundation packages (cordis, cosmokit, schemastery, loader, include, group, timer, hmr, logger-console) are source-vendored, rescoped to `@deepseek-ai/*`, with upstream commit SHAs recorded per package and a numbered ledger of all 22 divergences — each with rationale and named covering tests. Includes real behavioral patches: `fiber.ts` reentrant-disposal hardening, a port of cordiverse/cordis#41 lazy config resolution, durable debounced config writes.
- **how:** Entry 11 is the discipline exemplar: `applyPatches` was extracted from a private method into an exported pure function SPECIFICALLY so `dsh --dump-config` would reuse it rather than reimplement and drift — and the extraction surfaced a real upstream bug (the id index was built before the patch loop, leaving inserted rows unpatchable).
- **solves:** Makes a 9-package framework fork auditable and re-syncable. The 'every divergence must be listed, with its covering test' rule is what keeps the fork from rotting.
- **port effort:** High to adopt wholesale. The reusable part is the LEDGER DISCIPLINE + the 'extract so config tooling cannot drift' rule, which applies to any vendored dependency. | **idea only:** True
## dsh.38 ACP server that lets a remote client attach MCP servers to a harness session

- **where:** packages/acp/acp/src/{index,content,codec,model-control,mcp,session,updates}.ts; run via `pnpm dsh --profile acp`; mirrored by packages/subagent/subagent-acp (the client side)
- **what:** `dsh-acp` is a full ACP v1 server over JSON-RPC stdio: `session/new`, `session/list`, `session/resume`, `session/close`, `session/set_config_option`, `session/prompt`, `session/cancel`, `session/update`, `session/request_permission`. A client can hand it stdio or Streamable-HTTP MCP server definitions, which dsh validates (absolute command+env, absolute HTTP(S) URL+headers) and mounts into that session's agent scope; any connection or discovery failure rolls back the unpublished agent.
- **how:** Deliberately automation-only: the wire carries committed messages/thoughts, generic tool lifecycle, config, and context usage — never raw provider deltas, retry attempts, or DSH presentation data. One in-flight prompt per session; a prompt snapshots its provider/model/effort and pins it across every model step in that turn, so a concurrent option change applies to the NEXT turn.
- **solves:** Gives an external controller (test runner, other harness) full agent lifecycle over a STANDARD protocol without exposing dsh's internal presentation, and without a client having to pre-mount MCP servers itself.
- **port effort:** High (7 source files + a matching client). `reusable_idea_only` because it is bound to Cordis scope disposal and the dsh session model. | **idea only:** True
## dsh.39 Scoped resource registry where the first provider mounts shared tools and the last unmounts them

- **where:** packages/mcp/mcp-resources/src/index.ts:80-119 (register + registerTools)
- **what:** `McpResourceRuntime` (ctx.mcpResources) holds per-scope `NamedEntries<McpResourceProvider>`. Registering the FIRST provider in a scope mounts the 3 shared resource tools; removing the LAST removes them — but the tools are registered on a `selfCtx` child scope, NOT on any individual server's context, so unloading one server can never remove tools another server still needs.
- **how:** `ScopedLayers` merges across agent scopes so a subagent sees only its own servers; `this.layers.merge(exec.agent, l => l.servers).get(server)` resolves the caller-visible provider before any network call, so an unknown server fails fast.
- **solves:** Makes N servers share one fixed tool surface (3 schemas instead of 3N), while keeping per-scope isolation and correct shared-tool lifetime.
- **port effort:** Medium (~130 lines) and it depends on dsh's ScopedLayers. The lifetime rule ('first mounts, last unmounts, owned by the service not the provider') is the portable idea. | **idea only:** True
## dsh.40 git integration through plumbing subcommands, never through a shell or a model-facing tool

- **where:** packages/deliverables/workspace-changes/src/git.ts (279 lines; package 1302 lines), plus packages/boot/plugin-manager/src/github-connection.ts for the GitHub install path
- **what:** `GitRunner` runs `git <args>` through the harness `SubprocessRuntime` seam (never a shell) with a 2s terminate grace, 16 KiB stderr tail, and a `TERM` scrub. It uses 8 plumbing subcommands — `rev-parse`, `ls-files`, `ls-tree`, `cat-file`, `diff-tree`, `check-ignore`, `write-tree`, `add` — to take working-tree snapshots and diffs for the deliverables/workspace-changes feature.
- **how:** A nonzero exit is a RESULT (`GitRunResult{exitCode, stdout, stderr, truncated}`), not an exception. Index+worktree snapshots are compared through object hashes rather than text diffs.
- **solves:** Produces reliable, cheap per-turn change sets without ever exposing arbitrary git to the model — and without the shell-injection surface a `git` tool would need.
- **port effort:** Medium (~280 lines) and dsh-specific in that it returns to a SubprocessRuntime seam. Note: omp's `@oh-my-pi/pi-natives/vcs` is the sanctioned equivalent and may already cover it. | **idea only:** True
## dsh.41 Credential-reference seam: config never holds a secret, resolution happens per request

- **where:** packages/credentials/{credentials,credentials-local,authorization}/; packages/llm/llm-pi-ai/src/auth.ts (credentialStoreFrom/authContextFrom) and src/login.ts; base profile rows `authorization` + `credentials-local`
- **what:** Settings carry REFERENCES, not values. An adapter resolves `apiKeyEnv` through `ctx.credentials` at request time, so rotating a key takes effect on the next request with no restart, and no secret is ever written into a profile file. Missing resolution fails the request with a stable code (`MISSING_CREDENTIAL`); an unusable credential fails with `INVALID_CREDENTIAL`. The managed store is `$DSH_HOME/.credentials.yaml` and is never materialized into the process environment.
- **how:** Provider logins (browser PKCE for DeepSeek accounts, OAuth/interactive-key for pi-ai routes) write records addressed as `llm-pi-ai/<provider id>`; refresh happens under the store's CROSS-PROCESS LOCK. A hand-declared route id outside the lowercase-hyphenated grammar is refused with `UNSTORABLE_PROVIDER_ID` rather than silently accepting an unaddressable record.
- **solves:** Keeps secrets out of config files and out of `process.env` dumps, while still allowing live rotation. The cross-process lock is what makes two concurrent dsh processes safe against the same store.
- **port effort:** Medium. The grammar rule (only addressable ids may be stored) and the 'resolve per request, never at load' rule are the portable parts. | **idea only:** True
## dsh.42 Multi-provider adapter dormant by default, activated purely by user settings

- **where:** packages/llm/llm-pi-ai/src/{index,adapter,config,catalog,stream}.ts; base profile row `llm-pi-ai` (packages/bundle/base/cordis.patch.yml:127) with an explanatory comment
- **what:** `dsh-llm-pi-ai` is mounted in the base profile with NO config and zero routes. It activates only when a `llm-pi-ai:` settings section supplies provider profiles, and drops back to zero routes when that section empties. Each operation captures an immutable snapshot (profiles + a `createModels()` collection) before its first await, so a request that started under one configuration never finishes under another.
- **how:** A route naming an installed pi-ai provider inherits its endpoint, protocol, and model catalog; a route pi-ai does not ship must declare `api` + `baseURL` + a non-empty `models` list. `models` REPLACES a route's catalog (each entry defaulting from the installed model of the same id); `modelOverrides` reshapes individual installed models and is REFUSED beside `models`, on hand-declared routes, or naming an unknown model — 'because a silently unchanged model would be a typo someone hunts for later'.
- **solves:** Which adapters exist is composition; which providers run is the user's settings document. And a half-applied config change can never be observed by an in-flight request.
- **port effort:** N/A for omp — this IS omp's `packages/ai`. For dsh the interesting part is the dormant-by-default mounting and the refuse-rather-than-silently-ignore rule for `modelOverrides`. | **idea only:** False
## dsh.43 PTC mode: model writes a program that calls tools, instead of one tool call per turn

- **where:** packages/core/tools/src/ptc.ts, ts-types.ts, py-types.ts, presentation.ts; packages/ptc-runtime/{ptc-runtime,ptc-runtime-node}; base profile rows `ptc-runtime` + `workflow-ptc`
- **what:** `dsh-tools` supports three presentation modes: native Function Calling, PTC (programmatic tool calling) where the model emits a `run_code` program against a generated SDK, or both. Sub-calls get ids `<parent>:ptc:<n>` that consumers treat as opaque and correlate by exact equality. Two runtimes are generated: TypeScript and Python (`ts-types.ts` 317 lines, `py-types.ts` 46KB, `ptc.ts` 38KB).
- **how:** Tool definitions are CODE-GENERATED into an SDK, so tool schemas leave the request prompt entirely; `dsh-ptc-runtime-node` is the sandboxed Node execution capability. The `tools:sdk` prompt section uses first-party order 5000 and DISABLES prompt-variable interpolation, preserving literal `{{…}}` text inside tool descriptions — a subtle correctness detail (otherwise a tool description containing braces would be interpolated).
- **solves:** Trades N tool schemas for one transport schema + generated SDK text. Also gives structured control flow (loops, conditionals over tool results) that per-call function calling cannot express.
- **port effort:** Very high (a code generator plus a sandboxed runtime plus Python and TS targets). The `interpolate: false` on the SDK prompt section is a cheap, independently valuable lesson. | **idea only:** True
## dsh.44 Single-slot capability registry for browser providers

- **where:** packages/browser-use/browser-use/src/index.ts (49 lines)
- **what:** `BrowserUseRegistry` permits exactly ONE browser provider at a time. `register(name)` throws `'browser use provider "X" is already registered'` on a second call — even a repeat of the same name. `providerName` remains readable while the provider's resources are closing, and the provider must stop admitting calls and await owned work BEFORE releasing the registration.
- **how:** `register` returns the effect disposer from `ctx.effect(...)`, so the slot frees automatically on unload. Providers call `ctx.browserUse.register(BrowserUseProviderName(name))` under `ctx.inject(['browserUse'])`.
- **solves:** Two browser backends fighting over one model-visible tool namespace is a silent correctness bug; failing at registration with a named message turns it into a load-time error.
- **port effort:** Very low — 49 lines. | **idea only:** True
