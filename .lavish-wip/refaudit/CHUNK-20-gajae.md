# gajae — chunk 2/6 (22 năng lực)

## gajae.23 Two-tier hook trust — constrained API for third-party bundles

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/constrained-hooks.ts (532 LOC), header at line 21
- **what:** Bundle hooks do NOT get the broad first-party API. DENIED_API_METHODS = ['sendMessage','appendEntry','registerMessageRenderer','registerCommand','exec'] all throw security_policy. After the factory runs, the loader verifies it registered exactly the declared event and nothing more, else the surface is quarantined with runtime_mismatch.
- **how:** ConstrainedPluginHook interface; resolveConstrainedHookFile does lexical resolveWithinRoot + fs.realpath on both root and file to defeat symlink swap.
- **solves:** Third-party code can observe and transform one declared event but cannot mutate session state, register UI, or spawn shells.
- **port effort:** Medium — the deny-list + post-hoc registration audit is a genuinely novel, compact pattern (~100 lines core). | **idea only:** True
## gajae.24 Deny-first MCP network policy with rebinding defence

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/mcp-policy.ts (268 LOC); isDeniedIpv4 at line 28, expandIpv6 follows
- **what:** Applied at BOTH install validation and runtime connect. HTTPS only. Denies loopback/private/link-local/multicast/unspecified IPv4 plus the 169.254.169.254 metadata endpoint, across IPv4, IPv6, IPv4-mapped and IPv4-compatible forms, zone-id (%eth0) and trailing-dot variants. URL credentials and CRLF headers rejected. stdio confined to bare node/bun with the bundled entrypoint first.
- **how:** DNS is re-resolved immediately before connect. Runtime execution currently admits Node .mjs on Linux only — Bun, macOS and Windows stdio launches FAIL CLOSED until equivalent loader and owner/process-tree authority exists.
- **solves:** A plugin-declared MCP server cannot silently reach cloud metadata or an internal network, and cannot be DNS-rebound into one between validation and connect.
- **port effort:** Medium — the IP-range denial table ports directly; the launch-capsule machinery (authenticated snapshot outside workspace roots, canonical Node bytes from the OS PATH, 8192-file/128 MiB snapshot bound, 512 MiB interpreter bound) is deep and Linux-specific. | **idea only:** True
## gajae.25 Compile-validate-then-copy install with hash-drift quarantine

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/installer.ts, compiler.ts (569 LOC), session-validation.ts, lifecycle.ts (1,089 LOC — the ONLY policy and persistence writer)
- **what:** Install reads manifest, frontmatter and declared files as BYTES ONLY — plugin code is never imported during validation. Then collision + MCP policy enforcement, copy of validated hashed files into a temp sibling, atomic rename, registry written last under a per-scope lock. On failure nothing is mutated. Re-installing identical content is a no-op; different content needs --force. At session start installed files are re-hashed against the registry; any drift quarantines the plugin.
- **how:** compiler.ts opens files with O_RDONLY | O_NOFOLLOW (non-Windows) and treats ELOOP as security_policy. 16 MiB per-file cap. Stable per-surface extension IDs: tool:<name>, hook:<event>:<phase>:<target>:<name>, mcp:<name>, subskill:<parent>:<phase>:<arg>.
- **solves:** Install is transactional and idempotent, and a plugin edited on disk after install is caught rather than silently executed.
- **port effort:** Medium-high. The O_NOFOLLOW + byte-only validation + hash-drift quarantine is reusable; the registry/reconciliation layer is bespoke. | **idea only:** True
## gajae.26 Two-tier sub-skill advertisement (metadata vs full body)

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/activation.ts, subskill-authority.ts, state.ts; documented in docs/gjc-plugins.md 'Sub-skills: Tier-1 vs Tier-2'
- **what:** Tier-1 advertises installed sub-skills bound to a parent as a bounded list (plugin/name/description/activation_arg/phase; max 12 items, 200-char descriptions, 4 KiB block, with an overflow note) in the target parent's prompt only — never the global surface, never body content. Tier-2 injects the full body as a <gjc-subskill> block on explicit activation (e.g. `deep-interview --autoresearch`) or an agent's contextual choice.
- **how:** resolveSubskillActivationForSkillInvocation() scans the registry, matches parent == invoked skill name, parses the --arg token out of the argument string, and returns cleanedArgs plus the activation.
- **solves:** A marketplace of 50 plugins does not blow the context window of every turn, while still making every plugin discoverable at the moment it is relevant.
- **port effort:** Low — the advertise-on-demand / activate-for-body split is ~150 lines and is the cleanest idea in the repo for a plugin marketplace that must not pollute context. | **idea only:** True
## gajae.27 Append-only prompt appendices as lower-authority injection

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/prompt-appendix.ts (161 LOC)
- **what:** system_appendix and agent_appendix inject text as delimited <gjc-plugin-system-appendix> / <gjc-plugin-agent-appendix> blocks appended AFTER the base/project prompt, size-capped 8 KiB per appendix and 32 KiB total, fail-closed, content escaped and control-char sanitized.
- **how:** Rendered after the base prompt; the doc states plainly 'They can never override base/developer instructions.'
- **solves:** A plugin can add policy text but structurally cannot override base or developer instructions — the ordering and the delimiter make the authority boundary visible in the transcript.
- **port effort:** Low — ~150 lines, directly portable. | **idea only:** True
## gajae.28 npm-distributed plugins with feature flags and a settings schema

- **where:** packages/coding-agent/src/extensibility/plugins/ (types.ts, loader.ts, manager.ts 920 LOC, installer.ts); CLI at cli/plugin-cli.ts (PluginFeature, config list/get/set/delete/validate)
- **what:** A third plugin format: package.json with a `gjc` or `pi` field declaring tools/hooks/extensions/commands entry points, plus `features` (each with default-on and additional extensions/tools/hooks/commands entry points) for selective install, plus a `settings` JSON-schema block validated by validateSetting/parseSettingValue. Installed to <config>/plugins/node_modules with gjc-plugins.lock.json.
- **how:** getEnabledPlugins() reads package.json deps, intersects with the lockfile and project overrides (plugin-overrides.json under BOTH .gjc and .pi), and resolves manifest entry points.
- **solves:** Selective installation of a large plugin's parts, plus a typed settings contract validated at write time rather than discovered at runtime.
- **port effort:** Medium. The features+settings-schema idea ports; the manager does not. | **idea only:** True
## gajae.29 Marketplace distribution via git clone with provenance re-verification

- **where:** packages/coding-agent/src/extensibility/plugins/marketplace/ (source-resolver.ts 253, fetcher.ts 501, manager.ts 1,981, cache.ts, registry.ts)
- **what:** Marketplace catalogs are git-cloned (github / url / git-subdir / relative / local sources), cached, and plugin sources resolved to absolute local dirs. sourcePin() classifies a source immutable only when it carries a 40-hex-char SHA; assertPinnedSource() refuses marketplace restore without one. verifyResolvedProvenance() re-derives HEAD from the checkout with a fresh rev-parse rather than trusting the resolver.
- **how:** cloneAndReadCatalog() clones into a `.tmp-clone-<ts>` sibling then promotes to final cache location only after a successful read.
- **solves:** A resolver bug or a swapped working tree cannot make the restored bytes differ from the SHA the plan claims to restore.
- **port effort:** Medium — provenance re-derivation is the idea; the 1,981-line manager is not portable. | **idea only:** True
## gajae.30 Single-writer discipline enforced at the barrel

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/index.ts (header comment); lifecycle.ts header at line 49
- **what:** The gjc-plugins barrel deliberately does NOT re-export the mutation primitives. The header states: 'Mutation primitives are deliberately NOT re-exported here: lifecycle.ts is the sole policy and persistence writer, so the installer transaction and the registry writers stay reachable only through their own modules. Re-exporting them would let a caller commit a replacement and bypass the create-only rule.'
- **how:** index.ts exports only specific read-only names from registry (readRegistry, sortRegistryEntries, loadEffectiveGjcPluginRegistry, ...) and omits writeRegistryUnlocked / withRegistryLock.
- **solves:** Prevents the classic 'three code paths write the registry' bug structurally, by controlling what the barrel exports.
- **port effort:** Low — a barrel-hygiene convention, not code. | **idea only:** True
## gajae.31 Runtime finding accumulator — single publisher, generation-fenced consumers

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/runtime-quarantine.ts (139 LOC)
- **what:** Producers (loaders, adapters, validators) hand findings to a caller-owned GjcRuntimeFindingAccumulator; they never publish. Exactly one coordinator publishes a complete generation snapshot, and consumers merge it only when identity AND generation match. Messages are secret-redacted and control-char sanitized, capped at 2048 chars.
- **how:** gjcActivationGenerationFor() derives a deterministic safe-integer generation from the activation fingerprint's leading 13 hex digits, so equal inputs yield equal generations.
- **solves:** Stops partial-state races where a UI renders findings from a half-updated load, and makes stale-snapshot merges detectable rather than silent.
- **port effort:** Low — ~140 lines, directly portable, and a pattern worth copying for any plugin/extension runtime. | **idea only:** True
## gajae.32 In-TUI extension management surface

- **where:** packages/coding-agent/src/modes/components/extensions/ (6 files)
- **what:** A first-class dashboard: extension-dashboard.ts, extension-list.ts, inspector-panel.ts, state-manager.ts (17 KB) under modes/components/extensions/.
- **how:** Driven by the same capability/discovery layer, so the dashboard shows unified results rather than per-source lists.
- **solves:** Users can see and manage extensions without leaving the TUI — a plugin system that is only CLI-manageable is a plugin system most users never adopt.
- **port effort:** High — TUI-coupled. Verified as present; did not read the implementation. | **idea only:** False
## gajae.33 Extensibility-surface doctor

- **where:** packages/coding-agent/src/cli/customize-doctor.ts (66 KB); SURFACE_ORDER at line 234
- **what:** A 66 KB diagnostics module that classifies every customization surface (mcp, skill, hook, tool, extension, command, plugin-bundle) by source class (canonical / convention / import-candidate / imported / plugin) and reports remediation, including quarantined bundle surfaces.
- **how:** Line 958-959 explicitly tells the user that discovered custom tool modules are shown in the dashboard but standalone sessions do not execute them, pointing at `gjc plugin list` for runtime tools.
- **solves:** With 14 capabilities fed by 11 competitor tools, 'why isn't my hook running' is otherwise unanswerable. The module even states which surfaces are discovered-but-not-executed and why.
- **port effort:** High — 66 KB and highly specific. The surface-class taxonomy is the reusable part. | **idea only:** True
## gajae.34 Deliberate refusal to inherit MCP from other hosts

- **where:** packages/coding-agent/src/discovery/index.ts (comment block before the ./windsurf import)
- **what:** discovery/index.ts carries an explicit note: 'There is deliberately no VS Code provider and no MCP registration in the cursor/gemini/opencode/windsurf providers: GJC does not inherit MCP servers live from other hosts. MCP comes from GJC's own config (builtin, mcp-json), validated plugin bundles, or an explicit `gjc mcp import <host>`.'
- **how:** Import is a transaction (preview normalized result, then write into the chosen canonical .gjc scope), not a runtime precedence rule — tracked as issue #4291.
- **solves:** Picks the safe side of an obvious convenience feature. Inheriting another host's MCP servers would mean executing binaries the user configured somewhere else, under this host's trust.
- **port effort:** Low — it is a decision, not code. | **idea only:** True
## gajae.35 Legacy pi specifier shim

- **where:** packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts (336 LOC); invoked at plugins/loader.ts:16 and extensions/loader.ts:51
- **what:** installLegacyPiSpecifierShim() is called at the top of both the npm plugin loader and the extension loader, letting existing extensions written against the old `pi` package name keep resolving.
- **how:** Module-specifier rewrite at load time.
- **solves:** Backward compatibility across a package rename without breaking third-party extensions mid-flight.
- **port effort:** Low, but only relevant if renaming a published package. | **idea only:** True
## gajae.36 Two-tier remappable keybinding registry with platform-glyph rendering

- **where:** packages/tui/src/keybindings.ts (326 L), packages/coding-agent/src/config/keybindings.ts (724 L), packages/coding-agent/src/modes/action-registry.ts (173 L), docs/keybindings.md (209 L)
- **what:** Two registries: `TUI_KEYBINDINGS` (33 `tui.editor.*` / `tui.input.*` / `tui.select.*` / `tui.global.*` actions) in the tui package, and `KEYBINDINGS` (47 `app.*` actions) in coding-agent. Every action has `defaultKeys: KeyId | KeyId[]` plus a description. User remaps live in `~/.gjc/agent/keybindings.json` (NOT config.yml, and there is deliberately no nested `keybindings` object). Config uses portable canonical IDs (`ctrl+p`, `alt+enter`); the UI renders MacBook glyphs (⌃⌥⇧⌘ ↩⎋⇥⌫⌦) only at display time, so a glyph is never valid config syntax. Setting an action to `[]` disables it. Legacy unqualified names are migrated on load. `docs/keybindings.md` carries a generated per-action audit table, and `test/keybindings-audit.test.ts` fails if a registry action is missing from that table.
- **how:** `Tui.addEventListener`-style dispatch resolves the focused component's `FocusDomain` (composer|selector|overlay|global) via `APP_ACTION_METADATA[].domains`, then matches the chord through `matchesKey(parseKey(raw))` against the effective set from `KeybindingsManager`. `detectDefaultKeyCollisions(definitions)` returns one entry per key claimed by >1 action so intentional cross-context reuse (`Enter` = submit *and* confirm; `Ctrl+C` = copy *and* cancel) is auditable rather than accidental.
- **solves:** Hard-coding chords in a large TUI produces invisible shadowing — `Enter` and `Ctrl+C` mean different things per focused component, and users on terminals that eat `Alt` or `Cmd` have no escape hatch. Splitting action-identity from chord, and separating canonical config from display glyph, makes the whole surface remappable and portable across Apple Terminal / Ghostty / WezTerm / tmux.
- **port effort:** Medium. The split-registry + focus-domain idea is portable as-is; the 80 concrete action IDs and their default chords are surface-specific. The valuable parts to copy are: canonical-textual-ID config, glyph-render-at-display-time, `[]`-to-disable, legacy-name migration, and the drift test that pins the doc table to the registry. | **idea only:** True
## gajae.37 Single declarative slash-command spec consumed by both TUI and ACP dispatchers

- **where:** packages/coding-agent/src/slash-commands/builtin-registry.ts (2,561 L), acp-builtins.ts (63 L), types.ts
- **what:** One `SlashCommandSpec[]` registry (54 entries) drives three surfaces at once: the TUI dispatcher, the ACP `available_commands_update` advertisement, and autocomplete/help metadata. Each spec carries `name`, `description`, `acpDescription`, `inlineHint`/`subcommands`, `priority`, `aliases`, plus two mutually-exclusive handlers — `handle(command, SlashCommandRuntime)` for text/ACP and `handleTui(command, TuiSlashCommandRuntime)` for selectors/wizards/dashboards. `TuiSlashCommandRuntime` is deliberately narrower than `SlashCommandRuntime` so headless code cannot reach TUI state. Commands without a text `handle` are filtered out of the ACP advertisement so clients are never offered a command they cannot drive.
- **how:** `BUILTIN_SLASH_COMMAND_REGISTRY.filter(…)` produces `ACTIVE_BUILTIN_SLASH_COMMAND_REGISTRY`, which is then consumed three ways: `.map()` into `BUILTIN_SLASH_COMMAND_DEFS` (autocomplete), a `Map` built by inserting `name` + every `alias` into `BUILTIN_SLASH_COMMAND_LOOKUP`, and direct export as `BUILTIN_SLASH_COMMANDS_INTERNAL` for the ACP payload. `executeAcpBuiltinSlashCommand` parses, looks up, checks `command.acp === false` (refuse with a message rather than forward to the model), and requires `handle`.
- **solves:** Two dispatchers over one command set is where slash-command surfaces rot: the TUI knows about a command the ACP client never sees, or the client is offered a wizard it cannot drive. A single spec with per-surface description overrides and a `handle`/`handleTui` split makes that drift structurally impossible.
- **port effort:** Medium. The type-level contract (`acpDescription`, `acpInputHint`, `acp: false`, `localHeadless`, `handle` vs `handleTui`) is directly reusable; the 54 command bodies are not. | **idea only:** True
## gajae.38 Host-capability-gated render strategy (viewport-repaint vs full-replay)

- **where:** packages/tui/src/tui.ts lines 470-556 (`shouldProbeSixelCapability`, `shouldUseViewportRepaintForHost`, `shouldUseViewportRepaintForTerminal`), gated by `isMultiplexerSession` / `isWindowsTerminalSession`
- **what:** The TUI does not pick one rendering strategy. Three exported pure predicates decide per-host whether to repaint only the live viewport (cheap, loses durable scrollback) or clear-and-replay the full transcript (expensive, preserves it). The gate reads tmux/screen env (`isMultiplexerSession`), `WT_SESSION`/`TERM_PROGRAM`, and a terminal-reported `isProcessTerminal` capability. It documents a subtle precedence rule in code: a terminal that *answered* `isProcessTerminal === false` must NOT be treated as a native Windows console, because doing so would give every pipe/embedder on Windows viewport-repaint semantics and duplicate contracted rows. There is a `PI_TUI_LEGACY_MULTIPLEXER_FULL_RENDER` escape hatch.
- **how:** The predicates take `(env, platform, options)` and are exported pure so tests can drive every host combination without mutating `process.env`. The capability-report path (`isProcessTerminal !== false` as a Windows fallback, `=== true` as a process-terminal boost) is layered *after* the multiplexer check so a tmux-over-Windows-Terminal session keeps multiplexer precedence.
- **solves:** Clearing and replaying a full transcript inside tmux or a Windows console is visibly hostile (flicker, lost scrollback, doubled rows). But so is viewport-repaint-only when the host has no observable scrollback. There is no single correct answer, so the choice is made per-host and the precedence rules are written down.
- **port effort:** Low. The predicates, the layered precedence, the escape hatch, and the "reported capability outranks platform identity" rule are portable nearly verbatim. | **idea only:** True
## gajae.39 Anchor-based overlay system with percentage sizing and 9 positions

- **where:** packages/tui/src/tui.ts lines 414-605 (`OverlayAnchor`, `OverlayMargin`, `SizeValue`, `OverlayOptions`, `OverlayHandle`)
- **what:** `showOverlay(component, OverlayOptions)` returns a handle with `hide()` / `setHidden()` / `isHidden()`. Positioning supports 9 anchors (center, 4 corners, top/bottom/left/right-center), absolute or percentage `SizeValue`, x/y offsets, per-side margins, and a `visible(termWidth, termHeight)` predicate evaluated each render cycle so an overlay can be responsive rather than re-created.
- **how:** `parseSizeValue` resolves `"50%"` against a reference dimension with `Math.floor`; `finiteNumber`/`finiteNonNegative` sanitize NaN/Infinity from caller input. Used in practice by the command palette fallback (`anchor: "bottom-center", width: "100%", maxHeight: "100%", margin: 0`).
- **solves:** Palette/overlay UIs need to be responsive across an 80×24 terminal and a 160×48 one without re-instantiating the component. A `visible()` predicate plus percentage sizing lets one overlay instance serve every viewport.
- **port effort:** Low. Directly portable; ~150 lines. | **idea only:** False
## gajae.40 Configurable status line built from 22 selectable segment IDs

- **where:** packages/coding-agent/src/config/settings-schema.ts:91 (union), :1204-1206 (left/rightSegments), status line implementation in packages/coding-agent/src/modes/components/status-line/ (13 files, 1,573 L total: segments.ts 658, command.ts 190, presets.ts 116, priority-row.ts 107, token-rate.ts 66, context-thresholds.ts 68, gh.ts 81, model-name.ts 53, separators.ts 55)
- **what:** The status line is not hard-coded. `StatusLineSegmentId` is a 22-member union (`gajae`, `model`, `mode`, `path`, `git`, `pr`, `subagents`, `jobs`, `token_in`, `token_out`, `token_total`, `token_rate`, `cost`, `context_pct`, `context_total`, `time_spent`, `time`, `session`, `hostname`, `cache_read`, `cache_write`, `session_name`, `usage`, `command`). Users compose `statusLine.leftSegments` and `statusLine.rightSegments` arrays. Presets exist. Segments carry a `visible` flag so e.g. git hides itself outside a repo. The model segment suppresses its inline context percentage when a standalone `context_pct` segment is also in the layout, to avoid printing the same number twice.
- **how:** `SegmentContext` batches everything a segment may need (session, cached usage stats computed once per render, contextPercent, contextWindow, subagentCount, jobs snapshot, git branch/status/PR, quota windows with reset times, pending/failed command output) so a 22-segment line does not re-query per segment. `context-thresholds.ts` and `priority-row.ts` handle threshold coloring and multi-line truncation when a segment cannot fit.
- **solves:** A hard-coded status line cannot serve both a 2-segment minimal user and a 20-segment power user on the same terminal width. Making the line a user-ordered list of typed segments, with a "suppress duplicate value" contract between segments, is what makes that work.
- **port effort:** High for the 22 segments; low for the architecture. The per-render cached `SegmentContext` batch and the inter-segment duplicate-suppression contract are the reusable parts. | **idea only:** True
## gajae.41 Settings UI generated from inline schema `ui:` blocks

- **where:** packages/coding-agent/src/config/settings-schema.ts (4,775 L), packages/coding-agent/src/modes/components/settings-defs.ts (195 L, a pure adapter), settings-selector.ts, packages/coding-agent/src/modes/DESIGN.md
- **what:** 362 setting keys live in one 4,775-line schema; 249 of them carry an inline `ui: { tab, label, description, options? }` block and are therefore rendered in the Settings selector. Adding a setting to the UI means adding a `ui` block — there is no parallel UI list to keep in sync. 10 tabs (appearance, model, interaction, context, memory, editing, tools, tasks, providers, notifications). Widget variants: boolean, enum, submenu, and text. Submenus support `onPreview` (live preview while editing) and `onPreviewCancel` (restore prior value). Per-setting `condition()` predicates hide a setting by context.
- **how:** `settings-defs.ts` is a pure read-only adapter: it imports `getUi`, `getType`, `getDefault`, `getEnumValues`, `getPathsForTab`, `SETTING_TABS` from the schema and returns typed `BooleanSettingDef` / `EnumSettingDef` / `SubmenuSettingDef` / text defs. `options: "runtime"` marks a submenu whose choices are injected at runtime (e.g. the theme list) rather than declared statically.
- **solves:** The classic failure is a settings UI that drifts from the settings schema — a new key with no UI, or a UI toggle wired to a renamed key. Making the schema the single declaration point with an optional UI projection removes the second list entirely.
- **port effort:** Medium. The adapter-indirection and the `options: "runtime"` escape hatch are the load-bearing ideas; the 249 individual settings are not portable. | **idea only:** True
## gajae.42 Documented TUI design system with an explicit responsive contract

- **where:** packages/coding-agent/src/modes/DESIGN.md (471 L), docs/ui-design-visual-qa.md, docs/adr-overlay-component-seam.md
- **what:** 471 lines specifying the visual grammar as first-party rules: exact frame anatomy (DynamicBorder rule → TabBar with `(tab to cycle)` hint → `Spacer(1)` → content → closing border), the 2-column SettingsList row (label column capped at 30 visible cells, 2-space gutter, truncated value, centered selected item in `maxVisible`, `(current/total)` scroll position, blank row before the description), focus/cursor/input rules (Up/Down wrap; Escape clears filter before cancel; Tab routes to the tab bar except while a text input owns it), and hard prohibitions (no rounded cards, no shadow, no spinner-as-only-progress-signal, no color-only selection, no JavaScript `string.length` for CJK layout). The responsive contract names three viewports: 80×24, 120×36, 160×48, with a specific budget at 80×24 (the Settings tab bar including Notifications must fit in ≤4 lines, leaving ≥14 content rows).
- **how:** Extracted from the current settings selector and shared TUI components (the doc names its own source files), and states up front that it is implementation guidance rather than a third-party reference or a screenshot substitute. Focus domains come from the action registry, so the doc's "parent routes Tab except while a text input is active" is the same rule the dispatcher implements.
- **solves:** Without a written contract, TUI features accumulate inconsistent padding, inconsistent cursors, and unreadable CJK wrapping, and "make it look nicer" becomes unreviewable. Naming viewports and a row budget turns layout into something you can assert on.
- **port effort:** Low for the contract structure; the specific numbers (30-cell label cap, 4-line budget) are tuned to this surface. | **idea only:** True
## gajae.43 Explicit chrome factory so every compact selector shares one frame

- **where:** packages/coding-agent/src/modes/components/chrome.ts (41 L), consumed by model/provider/theme/pet/plugin/session selectors
- **what:** A 41-line factory builds the border/title/list/border frame used by every compact mode selector, so a new selector cannot invent its own chrome. It also handles `selectedValue` → index mapping and returns both the container and the list so callers can reach the list without a tree search.
- **how:** `FramedSelect(title, items, {maxVisible, selectedValue, onSelect, onCancel, onSelectionChange})` → `Container[DynamicBorder, bold accent title, SelectList, DynamicBorder]`, using `getSelectListTheme()` so the list themes itself from the active theme.
- **solves:** Selector chrome drift — 14 selector components each with slightly different borders, title weights, and cursor glyphs. A factory plus a `get*Theme()` adapter per widget means the theme file is the only place colors are decided.
- **port effort:** Very low. ~40 lines, directly portable. | **idea only:** False
## gajae.44 Command palette with availability gating and a two-path fallback

- **where:** packages/coding-agent/src/modes/components/command-palette.ts (168 L), packages/coding-agent/src/modes/controllers/input-controller.ts:2280-2360, packages/coding-agent/src/modes/components/action-registry consumers
- **what:** Ctrl+P opens a fuzzy-filtered palette over both the 47 app actions and the active slash commands. Entries carry `id`, `label`, `description`, `category`, `keybinding`, `disabled`. Availability-gated actions re-dispatch through `actionRegistry.executeFresh(id)` at press time rather than trusting a stale `disabled` flag. A palette command already in flight blocks re-entry with a status message. If the host provides no `showCommandPalette`, the palette self-hosts as a bottom-center 100%-width overlay so the feature degrades instead of disappearing.
- **how:** `fuzzyFilter(entries, query, e => [e.label, e.description, e.keybinding, e.searchText].join(" "))`; fixed `maxVisible = 8` with the selected row centered. All label/description/keybinding strings pass through `sanitizePaletteText` → `sanitizeStatusText(text.toWellFormed())`, and entry ids are rejected if they contain whitespace or C0/C1 control characters.
- **solves:** A palette over keybindings alone is useless for commands with no binding, and a palette that lists a disabled command is worse than no palette. Folding actions and slash commands into one ranked list, with availability re-checked at press, fixes both.
- **port effort:** Low. The self-hosting fallback and the press-time re-dispatch are the two ideas worth taking. | **idea only:** True
