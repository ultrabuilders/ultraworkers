# pi — chunk 5/5 (22 năng lực)

## pi.89 Typed overlay system with focus restore and anchor-based positioning

- **where:** packages/tui/src/tui.ts:175-320 (OverlayAnchor/OverlayOptions/OverlayHandle) and 490-700 (TuiBase overlay stack), docs/tui.md, examples/extensions/overlay-qa-tests.ts
- **what:** `showOverlay()` supports anchors (9 positions), offsets, margins, responsive visibility, a returned handle for `setHidden()`/focus control, and a deferred focus-restore protocol so a focused overlay keeps input ownership across ordinary renders and yields it explicitly when something else needs it.
- **how:** `overlayStack: OverlayStackEntry[]` with `preFocus`, `hidden`, and a monotonic `focusOrder`. `setFocusInternal()` implements a three-state machine (`inactive` / `eligible` / `blocked`) tracking which overlay owned focus and what should happen if a non-overlay component steals it. `isOverlayFocusAncestor()` walks the preFocus chain to decide if focus moved within an overlay's own subtree.
- **solves:** Modal stacking is where TUI apps usually become unmaintainable. The focus-restore state machine is the part worth stealing verbatim — it is what makes nesting and "interrupt an open dialog" behave.
- **port effort:** Medium. The state machine is portable; the layout math is entangled with this repo's `LayoutFrame`. | **idea only:** True
## pi.90 Rich terminal graphics: Kitty/iTerm2 inline images, LaTeX, Mermaid, syntax highlighting, OSC 8 hyperlinks, OSC 9;4 progress

- **where:** packages/tui/src/{terminal-image.ts(731),latex.ts(1506),components/markdown.ts(1015),terminal.ts(547),colors.ts(384)}, coding-agent components/mermaid.ts, settings `images`/`hyperlinks`/`showTerminalProgress`
- **what:** Inline images rendered in-band with multi-row span reservation and correct deletion on redraw; Markdown with LaTeX math and Mermaid-to-Unicode diagram rendering (`off`/`final`/`streaming`); syntax highlighting via highlight.js; terminal progress bars; hardware-cursor opt-in.
- **how:** Image lines are marked and `getKittyImageReservedRows()` walks forward to reserve the rows a multi-row image occupies; `expandChangedRangeForKittyImages()` forces those rows into the diff so images are never half-redrawn. Capability detection (`getCapabilities().images`, `trueColor`, `images: "kitty"|"iterm2"|"auto"|false`) is overridable from settings for terminals that misreport.
- **solves:** Makes a terminal app feel like a real app, and — the subtle part — the row-reservation logic is what makes in-band images survive differential rendering.
- **port effort:** High per feature, but each is independently extractable. The image row-reservation algorithm is the single most reusable piece; LaTeX (1,506 L) is the most skippable. | **idea only:** False
## pi.91 Alt-screen search with match navigation and jump-to-latest

- **where:** packages/tui/src/alt-screen-search.ts(327), wired in tui-renderer.ts:24-33
- **what:** Incremental search over rendered transcript lines with highlighted current/other matches, next/previous navigation, and a persistent "↓ Jump to latest message" indicator showing the bound key.
- **how:** `AltScreenSearchIndex` + `findAltScreenSearchMatches(lines, query)`; styles injected by the host (`searchMatchStyle`, `searchCurrentMatchStyle`, `searchNavigationButtonStyle`) so search chrome themes with the rest of the app. `scrollToEndIndicator()` is a callback so the label can include the user's rebound key.
- **solves:** Long transcripts become navigable, and the highlight/jump affordance is discoverable without documentation.
- **port effort:** Medium. Self-contained (327 L), depends only on the renderer's line array. | **idea only:** True
## pi.92 Session tree navigator with fold/unfold, labels, and a horizontally-panning viewport

- **where:** packages/coding-agent/src/modes/interactive/components/tree-selector.ts(1435), keys `app.tree.*` (fold, unfold, editLabel, toggleLabelTimestamp, 5 filter keys)
- **what:** A 1,435-line tree panel over the session's branch DAG: connectors with ancestor gutters, per-node labels with optional timestamps, five filter modes, and a gutter-pinned horizontal viewport that pans only when the selected row's content would otherwise be unreadable.
- **how:** Tree flattened to `FlatNode[]` with precomputed indent/connector/gutter info, then `renderHorizontalViewport()` computes `horizontalScroll` from the selected row's anchor column and MIN/MAX_VISIBLE_ANCHOR_CONTENT_WIDTH. Filters: default / no-tools / user-only / labeled-only / all, plus cycle forward/backward.
- **solves:** Session branching is a first-class concept here (fork, clone, tree, navigate), and the tree is the only sane way to expose it. The "keep the gutter, pan only when needed" heuristic is a genuinely good narrow-terminal solution.
- **port effort:** Medium. The horizontal-viewport heuristic is reusable on its own; the tree depends on this repo's `SessionTreeNode` session model. | **idea only:** True
## pi.93 Session selector with path/sort toggles, inline rename, and two-stage delete

- **where:** packages/coding-agent/src/modes/interactive/components/{session-selector.ts(1045),session-selector-search.ts(194)}, keys `app.session.{togglePath,toggleSort,rename,delete,deleteNoninvasive,toggleNamedFilter}`
- **what:** A searchable session list with a named-filter toggle, path-display toggle, sort-mode toggle, inline rename, and a delete that is `ctrl+d` normally but `ctrl+backspace` when the query is non-empty — so typing a filter never destroys a session.
- **how:** Two separate keybindings for delete, disambiguated by whether the search query is empty (`app.session.deleteNoninvasive`). Inline hints come from `keyHint(...)` so they follow user config.
- **solves:** The "destructive action needs a different key when you're filtering" problem is solved by keybinding disambiguation rather than a modal confirm — cheaper for the user, and the pattern generalizes.
- **port effort:** Medium. The `deleteNoninvasive` pattern is a small, high-value idea; the panel itself is table stakes. | **idea only:** True
## pi.94 31-item in-TUI settings panel with live theme preview and stepped submenus

- **where:** packages/coding-agent/src/modes/interactive/components/settings-selector.ts(960) — SettingsSelectorComponent(447), ThemeSubmenu(236), WarningSettingsSubmenu(136)
- **what:** `/settings` opens a searchable list of 31 settings (auto-compact, steering mode, follow-up mode, transport, HTTP idle timeout, cache warming, hide thinking, Mermaid, cache-miss notices, collapse changelog, quiet startup, install telemetry, project trust, double-escape action, tree filter mode, per-model thinking levels, TUI mode, fullscreen exit/scrollbar/copy-on-select, theme, images, image width, auto-resize, block images, skill commands, hardware cursor, editor/output padding, autocomplete max, clear-on-shrink, terminal progress), plus a Warnings submenu and a 3-step per-model thinking wizard.
- **how:** `SettingsList` + `SelectSubmenu`; each item is `{id, label, description, currentValue, values[]}` or `{submenu}`. Callbacks are a typed 30-method `SettingsCallbacks` interface, each delegating to a `SettingsManager` setter that persists. `onThemePreview` fires on selection *change* so the theme updates live before commit; `onThemeChange` on confirm.
- **solves:** Makes a large JSON config discoverable and editable without leaving the session, showing every setting's current value and its effect in one line.
- **port effort:** Medium. The `SettingItem` shape and the live-preview split are the reusable parts; the 31 items are omp-specific policy. | **idea only:** True
## pi.95 Context-usage footer with cache-hit telemetry and threshold coloring

- **where:** packages/coding-agent/src/modes/interactive/components/footer.ts(247), data from core/footer-data-provider.ts(11 KB) + core/usage-totals.ts
- **what:** A 2–3 line status bar: `pwd (branch) • session-name`, then cumulative `↑in ↓out RcacheRead WcacheWrite CH<hit>% $cost` plus `pct%/window (auto)`, right-aligned model + thinking level, colored red above 90% context and yellow above 70%, with a third line for extension statuses.
- **how:** Walks *all* session entries (not just post-compaction) for cumulative totals; falls back to `?` for context percent right after compaction, before the next LLM response reports usage. Right-aligns when it fits, else truncates the right side, else drops it. The `(sub)` suffix marks subscription-backed providers so users aren't shown a misleading dollar figure.
- **solves:** Cache economics and context pressure are invisible in most agent TUIs; this makes both legible at a glance and colors them before they become a problem.
- **port effort:** Low. ~250 lines, self-contained, and the "compute totals across all entries, not just the current window" detail is the part to copy. | **idea only:** True
## pi.96 Status indicator family with countdown retry and cancel hints

- **where:** packages/coding-agent/src/modes/interactive/components/{status-indicator.ts(123),countdown-timer.ts(39)}
- **what:** Four indicator kinds — working, retry, compaction, branch-summary — each an animated spinner with a themed message, plus a shared `CountdownTimer` that ticks once per second and drives a live "Retrying (2/5) in 4s… (Esc to cancel)". `IdleStatus` returns exactly 2 blank rows so the input dock never jumps in height.
- **how:** `StatusIndicator extends Loader`; `RetryStatusIndicator` composes a `CountdownTimer` that calls `ui.requestRender()` each tick. Compaction messages differ by reason (`manual` / threshold / `overflow` → "Context overflow detected"). The cancel hint is built from `keyText("app.interrupt")` so it reflects the user's rebind.
- **solves:** Retry and compaction are the two moments users most need feedback and a way out; the fixed-height idle row is the detail that stops the UI from flickering.
- **port effort:** Low. Small, self-contained, and the fixed-height-idle trick should be copied regardless. | **idea only:** True
## pi.97 Private bug-report and session-share flows with explicit consent and offline fallback

- **where:** packages/coding-agent/src/modes/interactive/bug-report.ts(298), session-share.ts(217), core/bug-report.ts(13 KB), core/bug-report-upload.ts, core/crash-log.ts
- **what:** `/bug` runs consent → optional summary → upload-or-zip, with a written disclaimer enumerating exactly what is included; `/share` uploads via a Radius relay and falls back to a private GitHub gist, appending a `pi.share` entry carrying the system prompt and tool schemas.
- **how:** `BugReportOptions {includeSession, includeSummary, delivery: "upload"|"zip"}`; the archive bundles version, OS, provider config *without* API keys, loaded extensions, settings, provider error diagnostics, plus the crash log. `createShareTrailingEntries()` attaches prompt+tools so the viewer can explain what the agent was doing.
- **solves:** Bug reports that strip secrets and state their contents, with a no-network path when the user is offline or unwilling.
- **port effort:** Low. Pure orchestration, no TUI dependency beyond the standard selector/editor. The consent-disclaimer pattern is the reusable idea. | **idea only:** True
## pi.98 Autocomplete: `@`-file fuzzy completion, command palette, argument completion, extension stacking

- **where:** packages/tui/src/autocomplete.ts(860) CombinedAutocompleteProvider, packages/tui/src/fuzzy.ts(138), interactive-mode.ts:679-800
- **what:** Typing `@` fuzzy-completes file paths (shell-quoting aware) via an external `fd`; typing `/` fuzzy-completes commands with a two-pass ranking (bare-name matches first, `skill:`-prefixed names demoted); `/model`, `/thinking`, and `/login` complete arguments; extensions can wrap the provider to add their own triggers.
- **how:** `extractAtPrefix()` + `parsePathPrefix()` detect and unquote the `@` prefix, then `getFuzzyFileSuggestions()` shells out to `fd`. `addAutocompleteProvider(factory)` composes providers and unions their `triggerCharacters`; `setAutocompleteMaxVisible` is user-configurable (3–20).
- **solves:** File attachment and command discovery are the two highest-frequency input actions in a coding agent; making both one-keystroke is the difference between usable and not.
- **port effort:** Low. Self-contained and dependency-light. The two-pass fuzzy ranking (bare name before prefixed name) is a small detail that visibly improves the palette. | **idea only:** True
## pi.99 Extension command/shortcut/tool/flag/renderer registration with conflict diagnostics

- **where:** packages/coding-agent/src/core/extensions/types.ts:1443-1520, interactive-mode.ts:664-677 (diagnostics), core/extensions/{runner.ts(46 KB),loader.ts(24 KB)}
- **what:** Plugins can add slash commands, global shortcuts, LLM tools, CLI flags (which then appear in `pi --help`), and custom renderers for messages and session entries. Collisions with built-ins are reported as warnings, not silently dropped.
- **how:** `registerCommand`/`registerShortcut`/`registerTool`/`registerFlag`/`registerMessageRenderer`/`registerEntryRenderer`/`registerMarkdownTransformer`. `getBuiltInCommandConflictDiagnostics()` compares against `BUILTIN_SLASH_COMMANDS` and reports either "Skipping in autocomplete" or "Available as '/<invocationName>'". Extension CLI flags print in `pi --help` under "Extension CLI Flags".
- **solves:** Plugin ecosystems need a stable extension point and need to fail loudly rather than shadow built-ins.
- **port effort:** Medium. The registration API is easy; the conflict-diagnostics behavior is the part worth copying. | **idea only:** True
## pi.100 Self-installing package manager for extensions/skills/prompts/themes

- **where:** packages/coding-agent/src/package-manager-cli.ts(1102), package-manager.ts(84 KB), core/pi-manifest.ts
- **what:** `pi install <source>` / `remove` / `update` / `list` with `-l` for project-local scope, sources as `npm:@scope/pkg`, `git:github.com/user/repo`, or `git:ssh` URLs; `update` also handles `self`, model catalogs, and a specific `--extension`.
- **how:** Package sources live in `settings.json` as `{source, autoload?, extensions?, skills?, prompts?, themes?}`; resolution respects the project's trust decision and `--approve`. Release-lock files prevent concurrent self-update corruption.
- **solves:** Makes the extension ecosystem installable by users who are not git users, with per-source resource filtering.
- **port effort:** High. 84 KB + 1,102 L. The idea (one manifest key declaring packages, each contributing extensions/skills/prompts/themes) is cheap; the installer is not. | **idea only:** True
## pi.101 Two machine-facing modes: `--print` and `--mode rpc`

- **where:** packages/coding-agent/src/modes/{print-mode.ts(169),json-event.ts(61),rpc/{rpc-mode.ts(819),rpc-client.ts(617),rpc-types.ts(303),jsonl.ts}}, docs/rpc.md, docs/rpc-commands.md, docs/rpc-extension-ui.md
- **what:** `-p/--print` processes a prompt and exits; `--mode json` emits newline-delimited events; `--mode rpc` exposes ~45 JSONL commands (`prompt`, `steer`, `follow_up`, `abort`, `get_state`, `get_tree`, `get_commands`, `set_model`, `export_html`, `extension_ui_request/response`, …) over stdin/stdout for editor and IDE integration.
- **how:** `RpcClient` is a first-class typed client, not just a server — `prompt()` even accepts `streamingBehavior`. `extension_ui_request`/`extension_ui_response` let a headless host drive interactive extension dialogs, which is what makes RPC mode a real embedding surface.
- **solves:** The same agent binary must be embeddable in editors and CI without a TTY.
- **port effort:** Medium. ~1,800 L, but the protocol is the deliverable and it is well documented. | **idea only:** True
## pi.102 Offline HTML/JSONL session export with an interactive viewer

- **where:** packages/coding-agent/src/core/export-html/{index.ts,ansi-to-html.ts,tool-renderer.ts,template.html,template.css,template.js,vendor/}; /share uses the same pipeline
- **what:** `/export` writes a self-contained HTML file (inlined `marked` + `highlight.js`, ANSI→HTML conversion, sidebar navigation, `H` to show/hide messages marked `display:false`) or a JSONL; `--export <file>` does it from the CLI.
- **how:** Vendored JS means the artifact works with no network. `tool-renderer.ts` maps tool calls/results to the same visual treatment as the TUI. `getShareViewerUrl()` (default `https://pi.dev/session/`, overridable via `PI_SHARE_VIEWER_URL`) is where `/share` posts.
- **solves:** Lets a user hand someone a transcript with no server, no account, and no dependency install.
- **port effort:** Medium. Fully self-contained and independently extractable. | **idea only:** True
## pi.103 Project trust model gating project-local config, extensions, and skills

- **where:** packages/coding-agent/src/core/{project-trust.ts,trust-manager.ts}, cli/project-trust.ts, settings `defaultProjectTrust`, --approve/--no-approve
- **what:** A tri-state decision (ask / trust / ignore) persisted per project, gating project-local `settings.json`, `.pi/extensions`, and AGENTS.md/CLAUDE.md discovery. `--approve` / `--no-approve` override per run; CLI subcommands refuse to write project config for untrusted projects.
- **how:** `resolveProjectTrusted()` consults extension decisions, then the saved decision, then the `defaultProjectTrust` fallback. `SettingsManager.assertProjectTrustedForWrite()` gates `saveProjectSettings()`. Untrusted startup shows a warning naming the `--approve` remedy.
- **solves:** Running an agent inside an untrusted repo executes its instructions; this makes that an explicit, persisted, overridable decision rather than a silent one.
- **port effort:** Low. ~200 lines total and the policy is portable even if the file layout differs. | **idea only:** True
## pi.104 User-rebindable key hints rendered from the live keybinding config

- **where:** packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts(48), used by status-indicator.ts, tree-selector.ts, session-selector.ts, interactive-mode.ts, tui-renderer.ts
- **what:** Every hint in the UI — "Esc to cancel", "↓ Jump to latest message", "ctrl+p to cycle", the double-escape hint, the settings descriptions — is generated from the keybinding manager at render time, not hardcoded.
- **how:** `keyText(binding)`, `keyDisplayText(binding)` (capitalized), `keyHint(binding, description)` (dim key + muted description), `rawKeyHint(key, description)`. `formatKeyPart` maps `alt`→`option` on darwin. Settings descriptions interpolate live hints too, e.g. Follow-up mode reads "`<live key>` queues follow-up messages…".
- **solves:** Hardcoded hints rot the moment a user rebinds a key and the UI starts lying to them.
- **port effort:** Very low. 48 lines. Copy unconditionally. | **idea only:** True
## pi.105 `/hotkeys` and `/changelog` as in-transcript overlays, extension-aware

- **where:** interactive-mode.ts:6541-6651 (hotkeys) and 6506-6525 (changelog), utils/changelog.ts
- **what:** `/hotkeys` renders a live Markdown table grouped Navigation / Editing / Other, with a fourth "Extensions" section built from `extensionRunner.getShortcuts()`; `/changelog` renders the shipped `CHANGELOG.md` parsed into entries, condensed after updates.
- **how:** Both append `Spacer(1) + DynamicBorder + bold accent title + Markdown + DynamicBorder` to `chatContainer` — inserted into the transcript, not modal. `/hotkeys` calls `getAppKeyDisplay()`/`getEditorKeyDisplay()` per binding so the table reflects the user's overrides.
- **solves:** Self-documenting keybindings without a separate help screen to keep in sync, and changelog visibility without leaving the session.
- **port effort:** Low. The transcript-insertion pattern is a deliberate choice (output stays copyable and scrollable) and is easy to adopt. | **idea only:** True
## pi.106 Bash mode with in/out distinction and non-TTY-safe output guarding

- **where:** interactive-mode.ts:3226-3250 (dispatch), core/bash-executor.ts, components/bash-execution.ts(220), core/output-guard.ts
- **what:** `!cmd` runs a shell command and includes it in context; `!!cmd` runs it excluded from context. The editor border color changes when the line enters bash mode. A second concurrent bash is refused with an Esc hint.
- **how:** `isBashMode` is derived from `text.trimStart().startsWith("!")` in the editor's `onChange`, which then calls `updateEditorBorderColor()`. `takeOverStdout()`/`restoreStdout()` in `output-guard.ts` prevent subprocess writes from corrupting the TUI.
- **solves:** The `!`/`!!` split is a small but high-leverage idea: it lets users run exploratory commands without polluting the model's context. The border-color affordance makes the mode visible before you hit Enter.
- **port effort:** Very low for the concept; the output-guard plumbing is the part that must be right. | **idea only:** True
## pi.107 Reloadable resource layer: extensions, skills, prompt templates, themes, keybindings, context files

- **where:** packages/coding-agent/src/core/resource-loader.ts(42 KB), skills.ts(14 KB), prompt-templates.ts, core/keybindings.ts `reload()`, modes/interactive/components/config-selector.ts(942)
- **what:** `/reload` re-reads all six resource classes without restarting the session. Skills optionally register as `/skill:<name>` commands. `pi config` opens a TUI for enabling/disabling each resource with Tab to switch global/project scope.
- **how:** Resource resolution runs through the package manager, so package-contributed and user-local resources are enumerated uniformly. Each resolved resource carries `enabled` + `sourceInfo` (path/origin/scope), which feeds both the config TUI's grouping and the `[source]` tag in autocomplete descriptions.
- **solves:** Users edit prompts and add extensions constantly; a restart-per-change loop is the standard TUI papercut.
- **port effort:** Medium. The uniform `ResolvedResource` shape with `sourceInfo` is the key idea; the 42 KB loader is the cost. | **idea only:** True
## pi.108 Executable documentation: 130 example extensions + 42 doc pages + skills

- **where:** packages/coding-agent/examples/extensions/** (130 files), packages/coding-agent/docs/** (42 files incl. docs.json), .pi/{extensions,prompts,skills} in-repo
- **what:** Every extension capability has a runnable example. Highlights: `doom-overlay/` compiles DOOM to WASM and renders it inside the TUI; `overlay-qa-tests.ts` demonstrates positioning, stacking, focus, responsive visibility, and animation; `subagent/` ships three real prompt templates.
- **how:** Examples are referenced directly from the docs (e.g. docs/tui.md points at `../examples/extensions/overlay-qa-tests.ts`), so they cannot rot silently the way prose does.
- **solves:** An extension API is only as good as its smallest example. The `doom-overlay` in particular proves the TUI can host a real-time game loop, the strongest possible demonstration that the rendering model is sound.
- **port effort:** Low to port the pattern; the files themselves are the deliverable and MIT permits copying them verbatim. | **idea only:** True
## pi.109 Non-blocking steering and follow-up message queuing with selectable delivery policy

- **where:** settings `steeringMode`/`followUpMode`, interactive-mode.ts, components/status-indicator.ts, RPC `steer`/`follow_up`/`clear_queue`, docs/session-format.md
- **what:** While the agent streams, the user can queue messages and choose when they land: `steeringMode` (interrupt the current turn) vs `followUpMode` (wait), each with `one-at-a-time` (deliver one, wait for a response) or `all` (deliver at once). Queued messages are visible above the editor and restorable with `app.message.dequeue`.
- **how:** Separate keybindings for follow-up (`alt+enter`) and dequeue/restore (`alt+up`). RPC responses carry a per-input `disposition: QueuedInputDisposition` so a headless client learns what happened to each message. `pendingMessages` is its own component in the dock layout, above the status row.
- **solves:** Steering a running agent is the hardest interaction in a coding TUI; making the delivery policy an explicit, named, user-visible setting rather than a hidden heuristic is the right call.
- **port effort:** Medium. The policy enum is trivially portable; the queueing machinery is session-model-dependent. | **idea only:** True
## pi.110 Self-update with install-method detection and a changelog-gated experience

- **where:** packages/coding-agent/src/config.ts (detectInstallMethod, makeSelfUpdateCommand), package-manager-cli.ts, interactive-mode.ts:807-824, /changelog
- **what:** Detects how it was installed (bun-binary / npm / pnpm / yarn / bun / unknown) and builds the matching upgrade command; `update self` and `update models` are first-class targets. After an update, a condensed changelog is shown inline (expandable to full via `/changelog`).
- **how:** `config.ts` branches on `isBunBinary` / `isBunRuntime` / `isBundledNode` to locate package assets, themes, HTML templates, and the WASM image library across source-checkout, npm, and compiled-binary layouts. `getChangelogPath()` reads the shipped `CHANGELOG.md` and parses entries.
- **solves:** Users install agents five different ways; an update command that assumes one produces broken upgrades.
- **port effort:** Medium. The install-method detection table is a directly reusable checklist of every layout you might be installed from. | **idea only:** True

