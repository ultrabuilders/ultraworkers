# gajae — chunk 4/6 (22 năng lực)

## gajae.67 Token-correction ratio for the keep window

- **where:** packages/agent/src/compaction/compaction.ts:1202-1203 (`TOKEN_CORRECTION_MIN_RATIO`/`MAX_RATIO`), :1205 (`PrepareCompactionOptions`), :1194 (`tokenCorrection` on the result). Tests: compaction-keep-recent-correction.test.ts, compaction-estimate-cache.test.ts.
- **what:** Compaction's keep-window budget is corrected by an OBSERVED heuristic→actual ratio supplied by the caller from per-turn Usage deltas or a stable-prefix-subtracted comparison, clamped bidirectionally to [0.5, 2.0] and applied by passing a corrected budget INTO `findCutPoint`. When the ratio is omitted, NO correction is applied — explicitly, "the confounded raw promptTokens/estimatedTokens quotient is never used." Larger windows (≥66k) scale the keep window to 30% instead of the legacy fixed `keepRecentTokens`.
- **how:** The ratio is a caller-supplied measurement, and the clamp is what makes a bad estimate safe. Comment: "never trust a ratio beyond 2x in either direction so a bad estimate cannot balloon or collapse the kept window."
- **solves:** A chars/4 heuristic systematically mis-estimates CJK/code-dense content; without correction the keep window is either too small (the summary is immediately out of date) or too large (compaction does not free enough). The clamp bounds the damage of a bad measurement instead of trusting it.
- **port effort:** Low-Medium — the mechanism is small and self-contained. | **idea only:** True
## gajae.68 Script-aware (CJK) token estimation with published measurements

- **where:** packages/agent/src/compaction/compaction.ts:475 (`IMAGE_TOKEN_ESTIMATE = 1200`), :556 (`estimateMessageTokensHeuristic`), :565 (`estimateTextTokensHeuristic`); rationale + numbers in packages/agent/test/compaction-cjk-estimate.test.ts:1-13.
- **what:** The chars/4 heuristic undercounts CJK by 2-4x. gajae measured o200k rates directly: Hangul prose 0.604, spaceless Hangul 0.964, Han 0.793, Kana 0.740 tokens/char — against the 0.25 the heuristic assumed. Common-BMP CJK blocks are now charged 1 token each (a safe upper bound; the only failure mode is compacting slightly early).
- **how:** Block-range classification over Hangul/unified+compat Han/Kana/CJK punctuation/full-width forms, then per-character charging instead of per-4-bytes.
- **solves:** Documented failure: "a 2–4x undercount that let CJK-heavy unsent deltas sail past the compaction threshold into provider `context_length_exceeded` rejections" — i.e. the heuristic was not merely inaccurate, it caused real provider 400s for CJK users.
- **port effort:** n/a for omp's main path — omp uses a real native BPE tokenizer (`tokenizer.ts`, per-model encodings for claude-v3/v47/v5, qwen3, deepseek-v3, kimi-k2, glm5) and has no `estimateTextTokensHeuristic` at all. Only the measured o200k rates are worth taking, for any heuristic path omp adds. | **idea only:** True
## gajae.69 Subagent spawn gate (justification receipt above a hard threshold)

- **where:** packages/coding-agent/src/task/spawn-gate.ts (95 lines, zero dependencies): `findMissingPlanFields`, `decide`, `evaluateSpawnGate`.
- **what:** Fan-out is gated. Batches of 4 or fewer pass freely; above `DEFAULT_SPAWN_THRESHOLD = 4` the batch is REJECTED unless it supplies a spawn-plan receipt with five non-empty fields: `whyParallel`, `whyNotLocal`, `independence`, `expectedReceiptShape`, and a positive finite `maxInlineTokens`. The decision object reports `planRequired`, `missingFields`, and a human-readable `reason` suitable for a blocked-result message back to the model.
- **how:** `decide()` validates its own inputs and throws `RangeError` on a negative child count or non-positive threshold. The `expectedReceiptShape` field forces the parent to state what each child will return, which is also the input to the ROI reconciliation layer.
- **solves:** Subagent fan-out is the most expensive and least-bounded thing a chat agent can do. A hard threshold plus a required justification converts it from an unconstrained capability into a budgeted one — and `whyNotLocal` specifically pushes back on spawning when the parent could just do it inline.
- **port effort:** Low — 95 lines, no imports, pure function. Directly portable. | **idea only:** False
## gajae.70 Fork-context budget ladder, re-clamped per child model

- **where:** packages/coding-agent/src/task/fork-context-budget.ts (9 lines, the whole ladder); packages/coding-agent/src/task/executor.ts:180 (`trimForkContextSeedForModel`); ForkContextMode at task/types.ts:17; advisory-only recommendation at task/fork-context-advisory.ts.
- **what:** Subagents inherit parent context on a five-rung ladder with explicit token budgets: `none: 0`, `receipt: 2,000`, `last-turn: 4,000`, `bounded: 8,000`, `full: 15,000`. The seed is then RE-CLAIMED against the CHILD's actual window: `contextWindow − max(minimumReserved, childModel.maxTokens) − fixedPromptAndToolOverhead`, walking oldest-first and tallying `skippedReasons["child-context-ceiling"]` so the parent can report exactly what was dropped.
- **how:** The ceiling subtracts the child's reserved completion budget, so a large-output child model gets a smaller inherited context. `ForkContextAdvisory` is explicitly "logged only; never changes the actual mode selection".
- **solves:** Copying the full parent context into every child is the default in most harnesses and silently multiplies cost by fan-out width. The ladder makes inheritance an explicit, priced, per-child decision, and the reason tally makes the drop auditable instead of invisible.
- **port effort:** Low for the budget table and clamp; Low-Medium for the advisory layer. | **idea only:** False
## gajae.71 Structured-output validation gate on subagent returns

- **where:** packages/coding-agent/src/task/executor.ts:478 (`buildOutputValidator`), :490 (`extractRequiredFields`), :500 (`computeMissingRequired`).
- **what:** A subagent declaring an `output` schema gets it converted JTD→JSON Schema and compiled into a validator that checks required fields and reports `missingRequired` by name plus the first formatted validation issue. A failed validation produces a specific actionable message rather than a bare "schema validation failed".
- **how:** Schema is normalized first; a normalization error is returned separately from "no schema" (which is a legitimate pass-through) so the three outcomes stay distinguishable. Stringified JSON in the tool result is re-parsed before validation (`parseStringifiedJson`).
- **solves:** Subagent structured output is usually validated post-hoc or not at all, so a malformed child result surfaces as a confusing downstream parse error instead of a named missing field.
- **port effort:** Low-Medium — depends on the local jtd-to-json-schema helpers, which omp would need to check for. | **idea only:** True
## gajae.72 Append-only stable prefix for provider cache hits

- **where:** packages/agent/src/append-only-context.ts (497 lines: `StablePrefix`, `StablePrefixSnapshot`, `AppendOnlyLog`); normalized-prefix cache in agent-loop.ts:3395-3480. Test: append-only-context.test.ts (38 KB).
- **what:** System prompt + tool specs are snapshotted once and FROZEN, so the byte prefix sent to the provider is byte-identical across turns; only the new user delta is a cache miss. Invalidation is explicit (`invalidate()`, e.g. after MCP reconnect) or fingerprint-driven. The `importSnapshot` path documents a real non-idempotence trap: re-running `normalizeTools` on a JSON-cloned snapshot re-resolves a dropped `intent` FUNCTION from "omit" to "optional", injecting `_i` and changing `parameters` so the recomputed fingerprint no longer matches the stored one — hence the fingerprint is verified against the stored tools as-is.
- **how:** `build()` returns `true` when the prefix actually changed (a cache miss is imminent) and short-circuits on reference identity before recomputing the fingerprint. The seed rebuilds are separately tested (append-only-seeded-rebase.test.ts).
- **solves:** Provider prefix caches (DeepSeek, Anthropic) only pay off if the prefix bytes are stable. A schema that is re-serialized every turn silently destroys the cache; the fingerprint is the mechanism that notices.
- **port effort:** omp ALREADY HAS this (append-only-context.ts, 495 vs 497 lines — near-identical). Do not port; the non-idempotence comment is the only thing worth checking against omp's copy. | **idea only:** False
## gajae.73 Cache-miss cost attribution with honesty levels

- **where:** packages/coding-agent/src/session/cache-economics.ts:40-60 (attribution comment), `CacheMissCostSummary`, `CacheEconomicsBasis` distinguishing `persisted-aggregate` from `current-model-estimate`.
- **what:** Cache misses are attributed to one of three levels: `actionable` (usage evidence points to a user-controllable cause with a concrete remediation), `diagnostic-only` (pattern observed, cause not determinable from usage alone — "describe what is unknown, assert no cause"), and `provider-suspected` (provider returned no cache activity at all, so the miss cannot be attributed to the user's prompt). Models the miss premium in USD (`missPremiumUsd`, `cacheHitRate`) using per-model input/cacheRead/cacheWrite pricing.
- **how:** Cost basis is tagged by provenance so a persisted historical aggregate is never silently recomputed with today's prices as if it were current. Transcript warnings are capped at 3.
- **solves:** Cache-miss reporting usually blames the user for misses the provider caused. The third category exists precisely so the product does not assert a cause it cannot evidence.
- **port effort:** Low-Medium — self-contained; the three-level honesty taxonomy is the durable idea. | **idea only:** True
## gajae.74 Run-level telemetry with sanitized failure payloads

- **where:** packages/agent/src/telemetry.ts (2,162 lines: `startChatSpan`, `finishChatSpan`, `failChatSpan`, `detectGatewayFromHeaders`, `recordManualChatTelemetry`); docs README.md lines ~60-80 document the event contract.
- **what:** `agent_failed` is emitted BEFORE the terminal `agent_end` and is explicitly diagnostic, not terminal — consumers "must not treat it as the terminal boundary or stop waiting for `agent_end`". Its `error` is ALWAYS a sanitized `{code, message}` pair from a failure sanitizer, never the raw provider error; the code is a stable classifier and the message a fixed human-readable description. Consumers are told not to depend on provider-specific detail or request bodies.
- **how:** Staged-buffer overflow carries a `ManagedBufferOverflowDiagnostic` with closed-vocabulary fields ONLY (stage, counts, bytes) precisely because the free-form `errorMessage` "a foreign, self-labeled error can still fill with arbitrary text" — the comment explains the shape-only design exists so a parent surface can render a trustworthy summary without trusting the string.
- **solves:** Raw provider errors leak request bodies, credentials, and user content into logs and RPC surfaces, and a self-labeled error object can put arbitrary text into a field a UI renders.
- **port effort:** Medium — omp has a comparable telemetry.ts (2,237 lines) so this is a diff, not a port. | **idea only:** True
## gajae.75 Per-subagent token and cost log

- **where:** packages/coding-agent/src/task/token-log.ts:28 (`taskTokenLogFromChat`), :46 (`taskTokenLogFromUsage` with the comment); test packages/coding-agent/src/task/token-log.test.ts.
- **what:** Every subagent turn appends a `TaskTokenLog` record (subagentId, agent, turn, model, input, output, cacheRead, cacheWrite, totalTokens, cost) to a per-session `token-log.jsonl`. A non-obvious correctness detail: `ChatUsageSnapshot.inputTokens` is the AGGREGATE input bucket (raw + cacheRead + cacheWrite), but `TaskTokenLog.input` must be the COST-BEARING bucket that EXCLUDES cache, so the cache buckets are subtracted back out, clamped at 0.
- **how:** Two constructors keep the wire-shaped and usage-shaped sources consistent; the clamping avoids a negative bucket when a provider reports cacheRead without a matching raw input.
- **solves:** Subagent cost is the line item operators most need and most tools omit. The aggregate-vs-exclusive distinction is an easy silent 2-4x overcount.
- **port effort:** Low — small, self-contained, and the bucket distinction is worth copying verbatim. | **idea only:** False
## gajae.76 Non-message token accounting split for cacheable recomputation

- **where:** packages/coding-agent/src/session/context-estimation.ts (96 lines: `computeNonMessageBreakdown`, `computeNonMessageTokens`, `estimateToolSchemaTokens`, `estimateSkillsTokens`); skills subtract from systemPromptTokens so the five totals do not overlap.
- **what:** Non-message tokens (system prompt, system context, rules, tool schemas, skills) are computed SEPARATELY from message tokens, because they change rarely while the message list grows every streaming turn. The split lets a status line refresh each on its own cadence: non-message recomputed only when its inputs' identity changes, messages walked incrementally. Tool-schema estimation prefers the WIRE schema (`toolWireSchema`) and falls back to the raw parameters. Rules are extracted by scanning `<rules>…</rules>` spans out of the system prompt so they are not double-counted against the skills section.
- **how:** One shared `computeNonMessageBreakdown` is the single source of truth for BOTH the session estimates and the status-line incremental cache, with a comment that they "MUST report the same numbers" — the split exists to avoid drift between the /context panel and the status line.
- **solves:** Context-usage displays that recompute the whole prompt every streaming frame, or that drift between the status line and the /context panel. Both are correctness bugs disguised as cosmetics.
- **port effort:** Low — 96 lines, and omp has an equivalent path to compare against. | **idea only:** True
## gajae.77 Adaptive compaction threshold driven by fill × call rate

- **where:** packages/agent/src/compaction/compaction.ts:172 (`computeAdaptiveThresholdPercent`); `AdaptiveCompactionOptions`/`AdaptiveCompactionDecisionState` in compaction/adaptive.ts (92 lines, ABSENT in omp); user docs docs/concepts/context-compaction.md; test adaptive-compaction-state.test.ts.
- **what:** The compaction threshold is lowered adaptively when context is already large AND calls are dense, targeting long sessions where a 150K-230K context would otherwise be resent many times before hitting a static threshold. Gated on: fill ratio ≥ 70% of the base ratio, `turnsSinceCompact > 3`, and `intensity = callsInWindow / (turnWindow × 4)` interpolating base→`minThresholdPercent` by `aggression × intensity`. Immediately after a compaction the threshold returns to base for three turns to avoid re-compaction loops. Applied at post-turn, pre-prompt, AND cooperative mid-run boundaries.
- **how:** Base percent is clamped to [1, 99]; `minThresholdPercent` is itself clamped to at most the base, so misconfiguration cannot INCREASE the threshold. A bounded tumbling call window is reset by any successful automatic or manual compaction.
- **solves:** A single static threshold is wrong at both ends: too high for a fast-turning long session, too low (and wasteful) for a slow one. Shipping default-OFF for backward compatibility, with the tuning recipe documented (base 75 / aggression 0.2 / turnWindow 15 / min 50), is the responsible rollout.
- **port effort:** Medium — self-contained module plus three call-site hooks in the maintenance paths. | **idea only:** True
## gajae.78 Dual-era MCP client (2026-07-28 "modern" + 2025-03-26 "legacy")

- **where:** packages/coding-agent/src/runtime-mcp/protocol.ts (624 lines); constants at lines 27-47, buildModernClientContext at client.ts:252
- **what:** A protocol-preference system that negotiates between two spec eras and rewires the whole connection around which era won: modern uses `server/discover` for capabilities and MRTR `input_required` results; legacy uses classic `initialize` + standalone SSE GET stream. Includes a feature-lifecycle table (active/deprecated/removed) and a downgrade-reason enum, plus `MCP_ERROR_HEADER_MISMATCH/-32020`, `MCP_ERROR_MISSING_REQUIRED_CLIENT_CAPABILITY/-32021`, `MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION/-32022`.
- **how:** config field `protocol: "auto" | "2026-07-28" | "legacy"`; `resolveMCPProtocolPreference` normalizes; observation objects (`MCPProtocolObservation`, `createMCPProtocolObservation`, `modernEraObservation`, `legacyEraObservation`) record the negotiated era and per-feature state
- **solves:** Servers and clients drift across MCP spec revisions. Rather than hard-coding one shape, the client detects the era and adapts transport, capability advertisement, and cache semantics per era, and can explain (via downgrade reasons) why a feature vanished.
- **port effort:** High. The era abstraction is self-contained (one 624-line file plus a ~40-line client hook) and is the single most transferable idea here. But the 2026-07-28 spec is NOT something I could read — the whole thing is unverifiable without it, so porting blind risks encoding a private protocol as if it were public. Verify the spec exists and what MRTR actually says first. | **idea only:** True
## gajae.79 MRTR `input_required` mid-tool elicitation with single verbatim retry

- **where:** protocol.ts:573-624 (`MCP_RESULT_TYPE_INPUT_REQUIRED`, `MCP_INPUT_REQUEST_METHODS`, `extractMcpInputRequired`); manager.ts:1151-1158 `setInputRequestHandler`; client.ts:488-512 resolver loop; tested in test/runtime-mcp/client-modern.test.ts:369-386
- **what:** A `tools/call` may return `resultType: "input_required"` carrying an opaque `requestState` plus a map of `inputRequests` (method `elicitation/create` / `sampling/createMessage` / `roots/list`). The client gathers the answers and retries the tool call exactly once under a fresh request id, passing `requestState` back verbatim.
- **how:** tool-bridge passes a lazy `inputHandler: () => MCPInputRequestHandler | undefined` so late registration still applies; `roots/list` is answered from local state without user interaction; if no handler is registered the call fails explicitly with an `MCPExpectedFailure` instead of hanging
- **solves:** An MCP server that needs user input mid-tool cannot block or spawn a prompt. This makes the server→user→server round trip a normal, bounded, retryable part of one logical tool call, with an explicit no-handler failure mode instead of a deadlock.
- **port effort:** Medium. The state machine is small; the hard part is agreeing on the wire shape, which again rides on the unreadable 2026-07-28 spec. | **idea only:** True
## gajae.80 Outward Coordinator MCP bridge (23 tools) over SDK sessions

- **where:** packages/coding-agent/src/coordinator-mcp/server.ts (11,748 lines, single file) + 11 sibling modules (17,842 total); contract in src/coordinator/contract.ts; adapter in src/commands/mcp-serve.ts; doc in docs/hermes-mcp-bridge.md
- **what:** `gjc mcp-serve coordinator` (alias `hermes`) exposes an MCP server that lets an EXTERNAL coordinator discover and drive SDK-backed GJC sessions: register/start/activate/stop/retire sessions, send prompts, queue bounded follow-ups, read tail/turn/coordination status, list and read artifacts, list and answer structured questions, watch events, read/ack codex handoffs, and delegate plan/execute. A parallel read-only CLI adapter (`gjc coordinator`) and a setup adapter (`gjc setup hermes`) drive the same contract.
- **how:** COORDINATOR_MCP_TOOL_NAMES is one transport-neutral `as const` tuple in coordinator/contract.ts; the MCP adapter, the CLI adapter, and the setup adapter all read from it, so a tool added in one place appears in all three. Auth is Ed25519 signed (`generateKeyPairSync`/`sign`/`verify`), state is file-locked via `withSessionStateFileLock`, and there is a question-gate codec (question-gate-codec.ts, 377 lines) plus a durability layer (durability.ts, atomic writes)
- **solves:** Without it an orchestrator must scrape terminal scrollback to drive or observe an agent. This makes sessions a first-class, typed, addressable remote object.
- **port effort:** High, and 11,748 lines in one file is the wrong shape to copy. The contract-as-single-tuple idea plus the three-adapter-one-contract structure is worth stealing; the implementation should be split by tool family. Depends entirely on omp having an equivalent session/broker substrate. | **idea only:** True
## gajae.81 Deny-first plugin-bundle MCP security policy, enforced twice

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/mcp-policy.ts (101 lines) + runtime-mcp/plugin-network-boundary.ts (101 lines); plugin surfaces at gjc-plugins/types.ts:87-89 (`tools`, `mcps`), error codes `invalid_mcp`/`duplicate_mcp` at :175-181
- **what:** Third-party plugin MCP servers are checked by ONE policy function at both install-validation time and runtime-connect time. HTTPS only; denies loopback/private/link-local/multicast/unspecified IPv4 and IPv6 including the 169.254.169.254 metadata address (with correct zone-id and embedded-IPv4 IPv6 literal expansion); stdio launchers limited to `node` and `bun`; stdio cwd confined to the plugin root.
- **how:** rejects via `fail()` → `GjcPluginLoadError("security_policy", message)`; applied at both the install transaction and the connect path so a policy change cannot be bypassed by a config-only edit
- **solves:** A plugin that ships an MCP server is remote code + a network egress path. Validating only at install means the runtime path can drift; validating only at connect means the user gets no install-time signal. Doing both, from one function, closes both.
- **port effort:** Low-medium. ~200 lines, self-contained, and the DNS-resolution check (the file imports `node:dns/promises` `lookup`, so it resolves hostnames before the IP check — defeating DNS-rebinding-by-literal) is the part worth copying verbatim. | **idea only:** False
## gajae.82 Codex handoff file protocol (cross-agent-session work transfer)

- **where:** coordinator-mcp/codex-handoff.ts (552 lines) + coordinator-mcp/codex-wake-publisher.ts (429 lines), types CodexHandoffRegistrationV1 / CodexWakeEventV1
- **what:** A durable, on-disk registration + wake + ack handshake for handing work to an external Codex agent and reading back what it did — separate from both the MCP transport and the session broker.
- **how:** registerCodexHandoff / listCodexHandoffs / readCodexHandoff / updateCodexHandoff + recordCodexWakeEvent / listPendingCodexWakeEvents / ackCodexWakeEvent / codexWakeLifecycle; the wake publisher has a pluggable `CodexTransportFactory` with `createDefaultCodexTransportFactory`
- **solves:** Two agent CLIs that do not share a transport can still coordinate, because the contract is a file + an event, not a socket. The ack/pending lifecycle makes at-least-once delivery safe.
- **port effort:** Medium. Conceptually small and transport-neutral; the value is the versioned registration + wake lifecycle, not the code. | **idea only:** True
## gajae.83 Canonical MCP connection-pool identity with generation-fenced leases

- **where:** runtime-mcp/pool.ts (1,460 lines), pool-key.ts (296), client.ts:315 `MCPConnectionCleanupFailure`
- **what:** Physical connections are pooled and shared across sessions; consumers hold leases. The pool key is a canonical identity (not a config hash) that folds realpath, transport, sharing mode, protocol preference, plugin network policy id, capability profile (`tools-only` vs `roots`), and an auth binding — with credentials stripped before hashing. Stale leases fail loudly via `MCPPoolLeaseObsoleteError` (generation) and `MCPPoolLeaseReleaseError` rather than silently reusing a dead socket.
- **how:** `buildMCPPoolKeyIdentity` / `computeMCPPoolKey`; `MCPPoolConfigError` codes MCP_USERINFO_NOT_ALLOWED, MCP_INVALID_ENDPOINT, MCP_SESSION_ID_REQUIRED, MCP_DUPLICATE_HEADER, MCP_AUTH_BINDING_REQUIRED; query text is percent-hex-normalized then SHA-256'd so an API key in the query never lands in a log or key
- **solves:** Multiple sessions hitting the same MCP server each spawning their own stdio process is expensive and breaks servers that hold per-process state; but sharing across sessions needs an identity that cannot be forged by a credential difference and cannot leak the credential.
- **port effort:** Medium-high. The key-canonicalization rules are directly reusable; the lease/generation machinery is a lot of code for a payoff that only exists if omp shares MCP connections across sessions. | **idea only:** True
## gajae.84 Smithery as a built-in remote MCP registry

- **where:** runtime-mcp/smithery-registry.ts (477), smithery-connect.ts (155), smithery-auth.ts (119)
- **what:** Search registry.smithery.ai for MCP servers, read deployment/config schema, and one-click connect a remote (http) or stdio server into the native config. Reachable from the slash-command surface and gated on real credentials.
- **how:** search over qualifiedName/displayName/description/verified/useCount; `SmitheryConnection` carries `type: http|stdio`, `deploymentUrl`, and a `configSchema` the add-wizard (modes/components/runtime-mcp-add-wizard.ts) renders into a form
- **solves:** MCP adoption is bottlenecked on discovery and on the config-scheme-to-`mcp.json` translation, which is exactly what a marketplace solves.
- **port effort:** Medium. Depends on Smithery staying viable; the reusable piece is treating a remote registry's JSON-Schema as the input to the same add-wizard that `gjc mcp add --command` drives. | **idea only:** True
## gajae.85 Bounded, explicit cross-host MCP import (never a live authority)

- **where:** discovery/mcp-compat.ts (9.3 KB, docstring lines 1-10), PROVIDER_IDS = {claude, codex}; consumed by the /extensions import transaction
- **what:** Claude Code `.mcp.json` and Codex `config.toml [mcp_servers.*]` are parsed and normalized into the internal `MCPServer` contract, but ONLY on explicit user action. Foreign user-home configs (`~/.claude`, `~/.codex`) are never scanned. discovery/index.ts carries a comment stating this is deliberate.
- **how:** `normalizeClaudeMcpJson(content, sourcePath, level)` takes content as an argument (never touches the filesystem itself); prototype-pollution guard runs on the RAW record before `expandEnvVarsDeep`, because env expansion rebuilds the object by plain assignment and would silently drop a `__proto__` own-property into the result's prototype
- **solves:** The obvious 'just read .mcp.json like Claude Code does' approach makes a foreign tool's file a silent competing runtime authority, and a repo-committed file becomes remote config injection.
- **port effort:** Low. The security argument for checking prototype-sensitive names BEFORE env expansion is subtle and worth copying regardless. | **idea only:** False
## gajae.86 Capability-registry discovery across 14 competitor config formats

- **where:** packages/coding-agent/src/discovery/ (24 files) + src/capability/ (17 files, index.ts 26 KB)
- **what:** A single capability/registry layer with 15 providers reading 14 different hosts' on-disk formats: native, mcp-json, claude, claude-plugins, codex, cursor, gemini, opencode, cline, windsurf, agents, agents-md, github, ssh-json. 15 capabilities: context-file, extension, extension-module, hook, instruction, mcp, prompt, rule, settings, skill, slash-command, ssh, system-prompt, tool.
- **how:** each provider self-registers on import via `registerProvider(capability.id, {...})`; discovery/index.ts imports capabilities first, then providers, and re-exports enable/disable/list/load with per-provider gating and a cache
- **solves:** Users already have prompts, skills, rules, hooks, and MCP servers configured in other tools. A provider-per-format registry imports all of it without any of it becoming authoritative.
- **port effort:** Medium-high (helpers.ts alone is 59 KB). omp already has discovery/catalog machinery, so the marginal value is mostly the provider list, not the framework. | **idea only:** True
## gajae.87 57-provider / 4,670-model catalog with 13 wire protocols and 57 OAuth flows

- **where:** packages/ai/src/models.json, src/models.ts, src/api-registry.ts, src/providers/*, src/utils/oauth/*, src/stream.ts, scripts/generate-models.ts
- **what:** 57 providers in a 2.1 MB generated models.json; 13 `KnownApi` wire protocols; 54 lazily-loaded provider modules (54,980 LOC); 57 registered OAuth flows; custom-API registration with per-sourceId teardown.
- **how:** providers load lazily so heavy SDKs stay out of the startup parse graph (register-builtins.ts header); `registerCustomApi(api, streamSimple, sourceId, stream)` reserves built-in names; `unregisterCustomApis(sourceId)` removes only that extension's entries; generator merges models.dev API + per-provider endpoint discovery + hand-written patches
- **solves:** Provider breadth plus extension extensibility without paying every SDK's import cost at boot, while letting an extension add a whole new wire protocol.
- **port effort:** Already have it. omp's KDL rule tree is strictly better than a 2.1 MB generated JSON plus 31 KB of imperative generator patches — this is the ONE area where gajae is behind the repo being surveyed, not ahead. | **idea only:** False
## gajae.88 git: 1,663-line centralized porcelain wrapper with repo locking

- **where:** packages/coding-agent/src/utils/git.ts (1,663 lines)
- **what:** One module wrapping the full git surface — diff, status, stage, commit, push, checkout, fetch, readTree, writeTree, commitTree, show, log, branch, remote, ref, config, worktree, patch, cherryPick, stash, clone — with `withRepoLock(cwd, fn, signal)` serializing mutations per repo and a typed `GitCommandError`.
- **how:** namespaces assembled with Object.assign; lock acquired around mutating operations; `GitHeadState` is a discriminated union (GitRefHead | GitDetachedHead)
- **solves:** Spawning `git` ad hoc from a dozen tools loses timeouts, output caps, and repo-level serialization, and lets two concurrent features race an index.lock.
- **port effort:** Already have it, and omp's version is stronger (a native `/vcs` subpath instead of a TS module). Note gajae still spawns raw `git` in 15+ other files, so even here the centralization is incomplete. | **idea only:** False
