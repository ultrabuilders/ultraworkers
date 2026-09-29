# cc — chunk 2/6 (22 năng lực)

## cc.23 apt-style dependency semantics (presence guarantee, not a module graph)

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/dependencyResolver.ts:1-11 (semantics comment), :64-90 (cross-marketplace policy)
- **what:** `dependencies: ["b", "c@other-mkt"]` means "b's namespaced components must be available when a runs." No require(), no exports, no import graph.
- **how:** Two entry points: `resolveDependencyClosure` (install-time DFS with cycle detection) and `verifyAndDemote` (load-time fixed-point check that demotes plugins with unsatisfied deps — session-local, never writes settings). Bare dep names inherit the declaring plugin's marketplace.
- **solves:** Matches how plugins actually compose (a formatter plugin needs a lint plugin present) without dragging in semver solving, hoisting, or a resolution algorithm. Demote-on-load means a broken dep degrades rather than crash-loops.
- **port effort:** Low effort. The `verifyAndDemote` idea — degrade rather than fail — is the best part. | **idea only:** True
## cc.24 Cross-marketplace dependency quarantine (no transitive trust)

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/schemas.ts:1327-1334 (allowCrossMarketplaceDependenciesOn); /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/dependencyResolver.ts:74-90
- **what:** Installing plugin A never auto-pulls from marketplace B. Only the ROOT marketplace's `allowCrossMarketplaceDependenciesOn` allowlist applies, and it does not cascade: if A allows B, B depending on C is still blocked unless A also lists C.
- **how:** Two documented escapes: install the cross-marketplace dep yourself first (already-enabled deps are skipped by the closure walk), or add it to the root marketplace's allowlist.
- **solves:** Prevents a plugin in a trusted marketplace from silently pulling in code from an untrusted one at install time. Explicitly framed in the source as "a security boundary".
- **port effort:** Low effort, high payoff. The no-transitive-trust refinement matters: an allowlist that cascades is not an allowlist. | **idea only:** True
## cc.25 Enterprise marketplace allowlist / blocklist enforced pre-download

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/settings/types.ts:612-634; error type `marketplace-blocked-by-policy` at /Users/tranquangdang21/Projects/claude-code-ref/src/types/plugin.ts:257-264
- **what:** `strictKnownMarketplaces` (only these sources may be added) and `blockedMarketplaces` (these are refused) live in managed settings. Both are checked BEFORE the download, so a blocked source never touches the filesystem.
- **how:** Entries are full `MarketplaceSourceSchema` values, plus two wildcard source kinds designed for policy: `hostPattern` (regex against the extracted host, e.g. `^github\.mycompany\.com$`) and `pathPattern` (regex against `.path` for file/directory sources).
- **solves:** Lets an org constrain where code may come from without enumerating every repo. hostPattern/pathPattern make an allowlist writable for a 500-engineer company.
- **port effort:** Medium. The two regex-based wildcard source kinds are the clever part — an exact-match allowlist is unusable at org scale. | **idea only:** True
## cc.26 Marketplace impersonation + homograph defense

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/schemas.ts:17-105
- **what:** 8 marketplace names are reserved for official use (`claude-code-marketplace`, `anthropic-plugins`, `agent-skills`, …). Any other name matching an impersonation regex, or containing ANY non-ASCII character, is rejected.
- **how:** BLOCKED_OFFICIAL_NAME_PATTERN catches official+anthropic/claude in either order or prefix position. NON_ASCII_PATTERN rejects everything outside U+0020–U+007E to kill Cyrillic-а homographs. Reserved names additionally require the source to be from OFFICIAL_GITHUB_ORG='anthropics'.
- **solves:** Prevents a third-party marketplace from presenting itself as the official one. The non-ASCII blanket reject is a blunt but effective homograph block.
- **port effort:** Low effort. Good, if imperfect, threat model. The reserved-name-plus-source-org check is the right two-part shape. | **idea only:** True
## cc.27 Per-plugin enterprise kill switch

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/pluginPolicy.ts (20 lines, entire file)
- **what:** `isPluginBlockedByPolicy(pluginId)` — a single `enabledPlugins[id] === false` in managed settings force-disables a plugin at every scope. Declared as "the single source of truth for policy blocking across the install chokepoint, enable op, and UI filters."
- **how:** Deliberately a leaf module importing only settings, with a comment explaining that is to avoid circular dependencies (marketplaceHelpers → marketplaceManager reaches most of the plugin subsystem).
- **solves:** One boolean in one file can revoke a plugin fleet-wide without touching the install path, the enable path, and the UI separately.
- **port effort:** Trivial. Copy the file structure (a 20-line leaf policy module) as much as the logic. | **idea only:** True
## cc.28 Delisting auto-uninstall

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/pluginBlocklist.ts:26-50 (detectDelistedPlugins), :52+
- **what:** Plugins installed from a marketplace that no longer lists them are detected, auto-uninstalled, and recorded in a flag list so the UI can explain the removal.
- **how:** Set difference between installed plugin ids (suffixed `@marketplace`) and marketplace entry names. Shared by interactive mode (useManagePlugins) and headless (main.tsx print path). The comment records that the `security.json` fetch was REMOVED in #25447 — "~29.5M/week GitHub hits for UI reason/text only."
- **solves:** A maintainer can yank a plugin from a marketplace and have it removed from every user who installed it, without shipping a new CLI.
- **port effort:** Medium. The removal-of-a-remote-security-check decision is also a lesson: the flag surface was reason+text, so the check bought nothing for 29.5M requests/week. | **idea only:** True
## cc.29 Marketplace abstraction: 8 source kinds, one interface

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/schemas.ts:908 (MarketplaceSourceSchema, 9 variants) and :1064 (PluginSourceSchema, 6 variants)
- **what:** `url`, `github`, `git`, `npm`, `file`, `directory`, `settings` (inline in settings.json), plus `hostPattern`/`pathPattern` for policy. Same for plugins: relative-path, `npm`, `pip`, `url`, `github`, `git-subdir`.
- **how:** `git` deliberately does NOT enforce `.endsWith('.git')` — comment explains Azure DevOps uses `…/_git/{repo}` with no suffix and appending .git makes ADO look for a repo literally named `{repo}.git` (TF401019); AWS CodeCommit also omits it. `git-subdir` uses partial clone (`--filter=tree:0`) so a monorepo plugin costs one directory. `sparsePaths` on marketplace sources does git sparse-checkout in cone mode.
- **solves:** Enterprise realities (Azure DevOps, self-hosted GitLab, private registries, monorepos) break naive git handling; each of these has a source comment naming the real-world failure it fixes.
- **port effort:** Medium. The git-URL and monorepo edge cases are the value; the source-kind list is theirs. | **idea only:** True
## cc.30 Container-friendly read-only seed layer

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/pluginDirectories.ts:66-90 (getPluginSeedDirs), pluginLoader.ts:196-250 (probeSeedCache / probeSeedCacheAnyVersion)
- **what:** `CLAUDE_CODE_PLUGIN_SEED_DIR` (path-delimiter separated, PATH-like precedence, first hit wins) lets an org pre-bake a populated plugins directory into a container image; the runtime uses it read-only and never re-clones.
- **how:** Seed structure mirrors the primary dir: `known_marketplaces.json`, `marketplaces/<name>/…`, `cache/<marketplace>/<plugin>/<version>/…`. `probeSeedCache` checks seeds in order for a populated dir at the requested version.
- **solves:** Air-gapped / no-egress CI images get a working plugin set with zero network at startup, and the version-scoped cache layout makes "is this seed at the right version?" a cheap path check.
- **port effort:** Low effort, high value for any deployment that can't reach the internet. | **idea only:** True
## cc.31 MCP Bundles (MCPB) as a second packaging format

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/mcpbHandler.ts (978 lines); dep `@anthropic-ai/mcpb: ^2.1.2` at /Users/tranquangdang21/Projects/claude-code-ref/package.json:87; reuses src/utils/dxt/{helpers,zip}.ts
- **what:** A zip-packaged manifest + bundled MCP server, installed alongside the directory-plugin model, with its own `user_config` schema type (string/number/boolean/file/directory + required/title/description/sensitive/multiple/min/max).
- **how:** Download → verify manifest → `McpbLoadResult | McpbNeedsConfigResult` (union: already configured vs needs a config prompt) → unzip → extract a `McpServerConfig`. Secure storage via getSecureStorage; failures classified via classifyFetchError.
- **solves:** A single-file distributable for an MCP server + its config form, for authors who do not want to lay out a plugin directory. The `{configured} | {needs-config}` result union is a clean shape.
- **port effort:** Medium. The zip-as-plugin packaging idea is worth taking; the specific format is theirs. | **idea only:** True
## cc.32 Settings allowlist of exactly one key

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/pluginLoader.ts:1777-1785 (PluginSettingsSchema), :1789-1806 (parsePluginSettings)
- **what:** A plugin may ship `settings.json`, but only the `agent` key survives: `SettingsSchema().pick({ agent: true }).strip()`.
- **how:** `safeParse` through the picked schema, then return undefined if the parse failed or the result is empty. A plugin's settings.json merges into the cascade, but only for keys the plugin schema itself defines.
- **solves:** A plugin cannot widen its own privilege by shipping a settings file. The blast radius of a plugin's configuration is bounded by a literal in the loader.
- **port effort:** Trivial, and the single most reusable line in the subsystem. Derive the plugin's settings schema FROM the host settings schema with `.pick()` — the allowlist then cannot drift from the host's real schema. | **idea only:** True
## cc.33 Lenient-at-the-edge, strict-in-the-middle validation

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/schemas.ts:869-885 (rationale comment), :1256 (marketplace entries, same rule with an explicit blast-radius argument)
- **what:** Unknown TOP-LEVEL manifest fields are silently stripped (zod default) so a plugin author adding a custom field does not break loading. Nested objects that look like author mistakes — `userConfig` options, `channels`, `lspServers` — stay `.strict()` and DO fail.
- **how:** Spread of 11 `.partial()` sub-schemas into one `z.object`. Comment: "keeps plugin loading resilient to custom/future top-level fields… Nested config objects remain strict — unknown keys inside those still fail, since a typo there is more likely to be an author mistake than a vendor extension." For marketplaces: "if one entry rejected unknown keys, the whole marketplace.json would fail to parse and ALL plugins from that marketplace would become unavailable."
- **solves:** The right validation posture for a marketplace: be liberal where a typo costs one plugin, strict where a typo is silent corruption, and never let one bad entry take out a whole registry.
- **port effort:** Low effort. The two-sentence rationale is worth copying into any extension-manifest validator. | **idea only:** True
## cc.34 Discriminated error union over string matching

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/types/plugin.ts:101-283, getPluginErrorMessage at :295-363
- **what:** 24-variant `PluginError` discriminated union (path-not-found, git-auth-failed, git-timeout, network-error, manifest-parse-error, manifest-validation-error, plugin-not-found, marketplace-not-found, marketplace-load-failed, mcp-config-invalid, mcp-server-suppressed-duplicate, hook-load-failed, component-load-failed, mcpb-download-failed, mcpb-extract-failed, mcpb-invalid-manifest, lsp-config-invalid, lsp-server-start-failed, lsp-server-crashed, lsp-request-timeout, lsp-request-failed, marketplace-blocked-by-policy, dependency-unsatisfied, plugin-cache-miss, generic-error).
- **how:** Each variant carries only the contextual data needed to render it. `getPluginErrorMessage` is an exhaustive switch. The source comment is candid: only 2 of 24 are used in production, the other 22 are a stated roadmap "as error creation sites are refactored."
- **solves:** UI can format by error kind without string-matching messages, which breaks the moment a message is reworded. Error identity survives copy changes.
- **port effort:** Medium. The pattern is right; the 22 unused variants are over-engineering to copy. Start with the 5-6 they actually use. | **idea only:** True
## cc.35 Non-inplace updates (disk-only, restart to apply)

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/pluginAutoupdate.ts:1-10; CLI description at /Users/tranquangdang21/Projects/claude-code-ref/src/main.tsx:5066 ("restart required to apply")
- **what:** Autoupdate refreshes marketplaces, then updates installed plugins. Explicitly non-inplace and disk-only: the change is staged on disk and a restart is required to take effect.
- **how:** `onPluginsAutoUpdated(cb)` with pending-notification buffering, because updates can complete before the REPL mounts. Scope filtering via `isInstallationRelevantToCurrentProject`.
- **solves:** No hot-swap of running plugin code, because there is no running plugin code. The race (update finishes before UI subscribes) is handled explicitly rather than by hoping ordering works out.
- **port effort:** Low effort. The pending-notification buffer for the mount race is a small, real detail. | **idea only:** True
## cc.36 Skill-directory-as-command-directory

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/loadPluginCommands.ts:171-200, :689-730 (`const skillName = ${pluginName}:${basename(skillsPath)}`), :806
- **what:** A plugin's `commands/` can contain a subdirectory that is a whole skill (a `SKILL.md` set), not just a single command file; the loader walks it and registers both the slash command and the skill.
- **how:** Directory-vs-file detection produces the same `${pluginName}:${namespace}:${name}` shape either way, so a nested skill is namespaced the same as a nested command.
- **solves:** One plugin layout carries both single-shot prompts and multi-step skills without a second declaration mechanism.
- **port effort:** Medium. Unified namespacing across the two is the transferable bit. | **idea only:** True
## cc.37 Marketplace trust surface is honest about its limits

- **where:** /Users/tranquangdang21/Projects/claude-code-ref/src/commands/plugin/PluginTrustWarning.tsx:5-18; customizable via getPluginTrustMessage() in /Users/tranquangdang21/Projects/claude-code-ref/src/utils/plugins/marketplaceHelpers.ts
- **what:** The install warning states plainly that "Anthropic does not control what MCP servers, files, or other software are included in plugins and cannot verify that they will work as intended or that they won't change."
- **how:** A passive dimmed banner rendered by the install/browse flows. `getPluginTrustMessage()` lets the fork append its own text.
- **solves:** Sets user expectations at the moment of install. Combined with the declarative model, the residual risk really is "this subprocess/URL runs whatever it wants" — and the warning says exactly that.
- **port effort:** Trivial. Copy the honesty, not the wording. | **idea only:** True
## cc.38 Agent loop as a typed Terminal/Continue algebra

- **where:** src/query.ts:261 (type State), :276 (query), :393 (queryLoop); src/query/transitions.ts (whole file, 22 lines)
- **what:** The loop does not return a boolean or throw. Every exit path returns a member of a closed 10-variant `Terminal` union, and every restart is a member of a closed 7-variant `Continue` union. The `State` object carries a `transition: Continue | undefined` field recording *why* the previous iteration continued, so recovery paths can be asserted in tests without inspecting message contents.
- **how:** `query()` is an `async function*` that delegates to `queryLoop()` and yields `StreamEvent | RequestStartEvent | Message | TombstoneMessage | ToolUseSummaryMessage` while returning a `Terminal`. `queryLoop` is `while (true)` with 7 `continue` sites (query.ts:1208, 1402, 1452, 1507, 1538, 1595, 1630) and 11 return sites. Continue sites write `state = { ...state, ... }` (immutable) rather than 9 separate field assignments.
- **solves:** Makes an unbounded agentic loop debuggable and testable. You can assert "the loop recovered from prompt-too-long via reactive compact" by checking `transition.reason === 'reactive_compact_retry'`, and assert a specific terminal reason without pattern-matching on message text. The `transition` field is also what lets the loop refuse to repeat a recovery path and spin.
- **port effort:** Low. ~150 lines to model + wire. Highest-leverage structural idea in the repo. | **idea only:** True
## cc.39 Per-iteration context-shrink pipeline with token-delta threading

- **where:** src/query.ts:567 (applyToolResultBudget) -> :591 (snip) -> :602 (microcompact) -> :639 (contextCollapse) -> autocompact
- **what:** Every loop iteration runs a fixed, ordered sequence of context-reduction passes over the message array before the API call, and threads the tokens-freed by each pass into the next pass's threshold math.
- **how:** Each pass returns a new messages array; the output of one is the input of the next. `snipCompactIfNeeded` returns `tokensFreed`, which is subtracted inside `shouldAutoCompact` because the surviving assistant's usage still reflects pre-snip context — a rough token count cannot see the savings. Comment at query.ts:513-517 states the ordering constraint explicitly.
- **solves:** Context decisions are re-evaluated every turn against the *current* array, not a turn-start snapshot. Without delta threading you double-count: a pass that already removed 40k tokens still leaves the stale usage number in the array, so the next threshold check over-triggers.
- **port effort:** Medium. The pipeline shape is easy; the delta threading and the explicit ordering comment are the parts worth copying. | **idea only:** True
## cc.40 Token accounting anchored on last API usage + rough estimate for the tail

- **where:** src/utils/tokens.ts:251 (tokenCountWithEstimation)
- **what:** Token count = exact usage from the most recent usage-bearing record, plus a character-based estimate for every message after it. Critically, it walks back *past* that record to the first sibling sharing the same `message.id`.
- **how:** Scans backwards for a record with usage. Then, because `normalizeMessages` splits one API response into one AssistantMessage per content block, it walks further back while `getAssistantMessageId(prior) === responseId` to reach the first split. Only messages after THAT are estimated. Comment: stopping at the last split would miss the earlier interleaved tool_results, which all ship in the next request.
- **solves:** Undercounting context. Any estimator that anchors on the last assistant record alone will miss the tool_results interleaved between the splits of that same API response, and will under-count exactly in the case (many parallel tool calls) where the context is growing fastest.
- **port effort:** Low. ~40 lines. Directly portable. | **idea only:** True
## cc.41 Non-cache token formula for budget accounting

- **where:** src/utils/tokens.ts:91 (finalContextTokensFromLastResponse)
- **what:** A second, separate token accessor that deliberately excludes cache tokens, for task-budget accounting across compaction boundaries.
- **how:** Prefers `usage.iterations[-1].input_tokens + output_tokens` (the final window when the server ran its own tool loop); falls back to top-level `input + output` when `iterations` is absent. Both branches exclude cache tokens. The file documents an explicit open question about whether the server's own countdown counts cache the same way, and picks internal consistency over guessing.
- **solves:** After a compaction the server only sees the summary, so it under-counts spend. `remaining` must decrement by the *pre-compact final window*, not by billing spend. Having a separate accessor prevents the two notions from being conflated in one helper.
- **port effort:** Low if you have server-side usage iterations. Skippable otherwise. | **idea only:** True
## cc.42 Compaction ladder with model-aware buffer and a failure circuit breaker

- **where:** src/services/compact/autoCompact.ts:33, :62-70, :77, :99, :101, :122, :189
- **what:** Autocompact threshold = effective context window minus a buffer that scales with the window size, with a hard cap on consecutive failures.
- **how:** `getEffectiveContextWindowSize` reserves `min(modelMaxOutput, 20_000)` for the summary output, citing p99.99 of compact summaries at 17,387 tokens. `getAutocompactBufferTokens` returns 50k / 30k / 13k for windows >=800k / >=400k / smaller, with the rationale that a bigger window means a proportionally bigger single turn. `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3` (comment: 1,279 sessions once had 50+ consecutive failures, up to 3,272 in one session, wasting ~250K API calls/day). `calculateTokenWarningState` returns 5 booleans for the UI.
- **solves:** Two real problems: a single fixed headroom wastes a 1M window and under-reserves a 200k one; and an irrecoverable context (prompt_too_long that compaction cannot fix) will otherwise retry forever and burn the API budget.
- **port effort:** Low. Note: the 800k/400k/13k ladder is a hardcoded magic-number table — do NOT port the numbers, port the shape (buffer scales with window) and keep the tiers in your policy/config layer, per your AGENTS.md rule against model-conditional policy in TS. | **idea only:** True
## cc.43 Tool-pair invariant repair at every history cut

- **where:** src/services/compact/sessionMemoryCompact.ts:234 (adjustIndexToPreserveAPIInvariants); packages/builtin-tools/src/tools/AgentTool/filterIncompleteToolCalls.ts; src/services/compact/grouping.ts
- **what:** Any time the history is truncated or sliced, a repair pass walks the cut backwards to re-admit the message blocks the API contract requires.
- **how:** Two steps. Step 1: collect every `tool_result` id in the kept range, subtract the `tool_use` ids already present there, then walk backwards from the cut admitting assistant messages carrying the missing `tool_use` blocks. Step 2: repeat for thinking blocks that share a `message.id` with a kept assistant message. Separately, `filterIncompleteToolCalls` does block-level (not message-level) filtering so completed parallel tool calls stay paired.
- **solves:** The API rejects any history where a `tool_result` has no `tool_use` or vice versa. Naive token-threshold slicing cuts wherever the byte count lands, which is almost never a valid boundary. This is the most common correctness bug in hand-rolled compaction.
- **port effort:** Medium. The two-step repair is fiddly but self-contained (~80 lines). Must-have if you implement any history truncation. | **idea only:** True
## cc.44 API-round grouping as a provably safe split point

- **where:** src/services/compact/grouping.ts (whole file)
- **what:** A message-grouper whose only boundary rule is "a new assistant message id", justified by the API contract rather than by heuristics.
- **how:** `groupMessagesByApiRound` starts a new group when `msg.type === 'assistant' && msg.message.id !== lastAssistantId`. The doc comment explicitly considers and rejects tracking unresolved tool_use ids as a second gate: doing so would pin the gate shut forever on malformed input and merge all subsequent rounds into one group. It relies instead on the summarizer fork's own `ensureToolResultPairing` at API time.
- **solves:** Grouping at human turns is too coarse for single-prompt agentic sessions (SDK / headless callers) where the whole workload is one user turn — reactive compaction could never fire. Grouping at assistant-id boundaries gives per-API-round granularity and is provably API-safe on well-formed input.
- **port effort:** Low. ~40 lines. The *reasoning* in the comment is worth more than the code. | **idea only:** True
