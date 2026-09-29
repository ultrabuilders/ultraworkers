# cc — chunk 4/6 (22 năng lực)

## cc.67 CLI acts as its own MCP server

- **where:** src/entrypoints/mcp.ts (196 lines), invoked from src/cli/handlers/mcp.tsx:73-74
- **what:** `claude mcp serve` starts an MCP server (name 'claude/tengu') over stdio that re-exposes every currently-enabled builtin tool to an external agent client.
- **how:** Server{capabilities:{tools:{}}} + ListToolsRequestSchema/CallToolRequestSchema handlers over StdioServerTransport. ListTools calls getTools(permissionContext) and converts each zod inputSchema via zodToJsonSchema; outputSchema is only emitted when the converted root type is exactly 'object' (skips z.union roots — cites anthropics/claude-code#8014).
- **solves:** Lets Claude Code slot into any MCP-capable orchestrator (Zed, another agent) without a bespoke adapter.
- **port effort:** Low-medium. This is a genuinely portable idea and likely a real gap in omp: expose the omp tool registry as an MCP server so omp can be driven by Codex/OpenCode/senpi. The outputSchema root-type guard is a specific bug worth copying. | **idea only:** True
## cc.68 InProcessTransport: zero-spawn in-process MCP servers

- **where:** src/services/mcp/InProcessTransport.ts (63 lines) AND packages/mcp-client/src/transport/InProcessTransport.ts (63 lines, byte-identical duplicate)
- **what:** A linked pair of Transport objects that pass JSON-RPC messages directly between an MCP client and server in the same process via queueMicrotask, avoiding a subprocess.
- **how:** createLinkedTransportPair() returns [a, b] with mutual _setPeer. send() throws if closed, else delivers via queueMicrotask to peer.onmessage (async to avoid stack depth on synchronous request/response). close() cascades onclose to both sides.
- **solves:** Lets built-in servers (computer-use, claude-in-chrome) behave as ordinary MCP servers over the same client path, with no process spawn, no stdio framing, and no serialization cost.
- **port effort:** Very low. ~60 lines, zero dependencies beyond the MCP SDK Transport interface. Directly portable. | **idea only:** True
## cc.69 Three built-in MCP servers

- **where:** packages/@ant/computer-use-mcp/src/tools.ts (7884 LOC total in package, 27 tools), packages/@ant/claude-for-chrome-mcp/src/browserTools.ts (18 tools), src/services/acp/vscodeSdkMcp.ts
- **what:** computer-use (27 tools: screenshot, 5 click variants, type, key, scroll, drag, mouse_move, open_application, clipboard read/write, switch_display, nested window_management/click_element/open_terminal/bind_window/virtual_keyboard), claude-for-chrome (18 tools: javascript_tool, read_page, find, form_input, computer, navigate, resize_window, gif_creator, upload_image, get_page_text, tabs_*, read_console_messages, read_network_requests, shortcuts_*, switch_browser), and the VSCode SDK server.
- **how:** Registered at 'dynamic' scope at startup, connected through the InProcessTransport pair. computer-use gated on feature('CHICAGO_MCP') + macOS + interactive; claude-in-chrome on --chrome flag or claudeInChromeDefaultEnabled.
- **solves:** Delivers real browser/GUI control through the exact same MCP code path as third-party servers — one tool-dispatch, one permission, one render path.
- **port effort:** The architecture is portable (register your own capabilities as an in-process MCP server). The 45 tool implementations are not — they are Anthropic-authored Swift/extension bridge code. omp already has browser-use and computer-use skills, so copying the *registration pattern* is the only real win. | **idea only:** True
## cc.70 Channels: inbound MCP (server pushes into the conversation)

- **where:** src/services/mcp/channelNotification.ts (263 lines) + channelPermissions.ts (240) + channelAllowlist.ts (78)
- **what:** Inverts the MCP direction. An MCP server (Slack/Discord/Telegram/SMS/iMessage) can push a message into the live conversation via a notification, and can answer tool-permission prompts remotely.
- **how:** notifications/claude/channel carries {content, meta} -> wrapChannelMessage() emits <\channel source="..." meta-as-XML-attrs>. Outbound: CC sends notifications/claude/channel/permission_request {request_id, tool_name, description, input_preview (200-char truncated), channel_context{source_server,chat_id}} when a dialog opens. Inbound approval: notifications/claude/channel/permission {request_id, behavior:'allow'|'deny'}. Explicit opt-in via capabilities.experimental['claude/channel/permission'] so a text-relay channel never becomes a permission surface by accident. SAFE_META_KEY=/^[a-zA-Z_][a-zA-Z0-9_]*$/ filters meta keys before they become XML attribute NAMES, plus escapeXmlAttr on values.
- **solves:** Lets a human approve a destructive Bash command from their phone, and lets an external chat system inject work into a running agent — without any bespoke channel integration per platform.
- **port effort:** Medium. The protocol shape is portable and the security reasoning (explicit capability opt-in + attribute-injection filter + id-matched approvals rather than text regex) is excellent. The GrowthBook feature gates and claude.ai OAuth requirement are not portable. | **idea only:** True
## cc.71 Per-endpoint provider compat matrix

- **where:** src/services/providerRegistry/providerCompatMatrix.ts (COMPAT_PROFILES record, applyCompatRule(), getDeepSeekReasoningMode())
- **what:** A capability matrix that strips request fields an endpoint would reject, before sending. 5 rules: cerebras, groq, deepseek, strict-openai, permissive.
- **how:** CompatProfile = {supportsStreamUsageOption, supportsThinkingField, reasoningContentEcho: 'always-preserve'|'drop-on-non-thinking'|'strip', toolCallFormat}. applyCompatRule(body, rule) is a PURE immutable transform: drops stream_options.include_usage when unsupported (and deletes the whole stream_options if it becomes empty), drops per-message 'thinking' when unsupported, and applies the reasoning_content echo policy. DeepSeek mode detection: reasoning_content + tool_calls -> 'thinking+tools', reasoning_content only -> 'thinking-only', neither -> 'normal'.
- **solves:** Strict OpenAI-compatible endpoints (Cerebras, Qwen) 400 on unknown top-level keys and unknown message fields. Stripping per-endpoint beats a single permissive payload.
- **port effort:** Low as a concept, HIGH as a warning. The 3-state reasoning_content echo policy and the getDeepSeekReasoningMode() tri-state are directly relevant to omp's DeepSeek work. BUT this is exactly the pattern omp's AGENTS.md forbids — see finding #6. Do not port the shape; the capability-axis idea is already solved better in KDL. | **idea only:** True
## cc.72 Provider registry with Zod-validated user overrides

- **where:** src/services/providerRegistry/loader.ts (7.4 KB), types.ts, switcher.ts
- **what:** Built-in OpenAI-compat providers, overridable by a user JSON file, with graceful degradation on corruption.
- **how:** DEFAULT_PROVIDERS = 4 (cerebras, groq, qwen, deepseek). Reads ~/.claude/providers.json, validates against ProvidersFileSchema (array), merges user entries over defaults by id. NEVER throws: corrupt JSON, read failure, and schema failure each log a warning and fall back to defaults; loadProvidersWithDiagnostic() additionally returns the error string to the UI. Per-process memo with explicit _invalidateProviderCache() after save. saveProviders() writes only non-default entries, compares defaults key-order-independently, and does atomic tmp+randomBytes+rename.
- **solves:** Users can add an endpoint without forking, and a broken config file degrades to working defaults instead of a crash loop.
- **port effort:** Low and largely portable. omp's catalog already exceeds this (91 providers, KDL rules, discovery), so the portable delta is only the diagnostics-returning loader and the atomic-write discipline — omp's catalog manager may already do both. | **idea only:** True
## cc.73 Tool search: defer tool schemas out of the prompt

- **where:** src/utils/searchExtraTools.ts (720 lines), packages/builtin-tools/src/tools/{SearchExtraToolsTool,ExecuteTool}/, src/services/api/claude.ts:1195-1275
- **what:** Keeps the token cost of a large tool pool bounded by deferring non-core tool schemas and letting the model search for them, then invoke them by name.
- **how:** Auto-enables when MCP tool descriptions exceed DEFAULT_AUTO_SEARCH_EXTRA_TOOLS_PERCENTAGE = 10 of the context window, measured via countToolDefinitionTokens + TOOL_TOKEN_COUNT_OVERHEAD. Tunable via ENABLE_SEARCH_EXTRA_TOOLS=auto:N. SearchExtraToolsTool keyword-matches against each tool's searchHint (a 3-10 word capability phrase, e.g. 'jupyter' for NotebookEdit); ExecuteTool then runs the discovered tool. MCP servers can pin visibility with _meta['anthropic/alwaysLoad'] and supply _meta['anthropic/searchHint'].
- **solves:** Adding 30 MCP servers must not blow the context window. The threshold is a fraction of the model's actual window, not a fixed count.
- **port effort:** Medium. Highly relevant if omp accumulates many MCP servers. The portable ideas are the window-fraction auto-threshold, the per-tool searchHint convention, and the server-controlled alwaysLoad escape hatch. | **idea only:** True
## cc.74 Unicode sanitization of all MCP server data

- **where:** packages/mcp-client/src/sanitization.ts (36 lines), called at src/services/mcp/client.ts:1769 via recursivelySanitizeUnicode(result.tools)
- **what:** Recursively strips control characters and normalizes every string coming back from an MCP server before it reaches the model or the TUI.
- **how:** Recurses into strings, arrays, and object values. Strips C0 controls except \t\n\r via /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, removes U+FFFD, then .normalize('NFC').
- **solves:** A malicious or buggy MCP server cannot inject terminal control sequences or bidi/encoding confusion into the TUI or the model context.
- **port effort:** Very low. ~30 lines, no deps. Directly portable and a real gap-check for omp. | **idea only:** True
## cc.75 Git integration via memoized FS probing + exec

- **where:** src/utils/git.ts (926), src/utils/git/gitFilesystem.ts (699), gitDiff.ts (532), gitConfigParser.ts (277), gitignore.ts (99)
- **what:** 22 files / ~2500 LOC of git integration, but the design point is that repo metadata is read from the filesystem (not by shelling out for every query) and memoized.
- **how:** findGitRootImpl = memoizeWithLRU walks up looking for .git, handling both a directory (regular repo) and a file (worktree/submodule), returns a Symbol sentinel on miss. gitFilesystem.ts exports getCachedBranch/getCachedDefaultBranch/getCachedHead/getCachedRemoteUrl/getWorktreeCountFromFs/isShallowClone/resolveGitDir. gitDiff.ts notes a 64-bit O(1) length check to detect massive diffs.
- **solves:** Branch/HEAD/remote reads happen on nearly every keystroke in a TUI; forking `git` per read is too slow. Filesystem probing is a pure cache hit.
- **port effort:** Low. omp already has @oh-my-pi/pi-natives/vcs as its sanctioned git/jj wrapper, which is a stronger version of this. The one transferable idea is the .git-as-file handling and the O(1) diff-size guard before materializing a diff. | **idea only:** True
## cc.76 Fail-open MITM upstream proxy for containers

- **where:** src/upstreamproxy/upstreamproxy.ts (9.6 KB) + relay.ts (15 KB)
- **what:** In a container, installs a CONNECT-to-WebSocket TLS-intercepting proxy and rewrites the system CA bundle so every subprocess (curl, gh, python) inherits egress inspection.
- **how:** Reads /run/ccr/session_token; prctl(PR_SET_DUMPABLE, 0) to block same-UID ptrace of the heap; downloads the proxy CA and concatenates it with SYSTEM_CA_BUNDLE; starts the relay; unlinks the token file (token exists heap-only, and only after the relay is confirmed up so a supervisor restart can retry); exports HTTPS_PROXY / SSL_CERT_FILE. NO_PROXY_LIST exempts loopback, RFC1918, 169.254.0.0/16 (cloud IMDS), package registries, and GitHub. Every step catches and warns, disabling the proxy rather than failing the session.
- **solves:** Enterprise/sandboxed deployments need to observe egress from processes the agent spawns, which a Node-level HTTP hook cannot see.
- **port effort:** Low relevance to omp. Anthropic-container-specific (prctl, /run/ccr paths). The transferable idea is the unlink-after-relay-confirmed ordering for secret files, and the fail-open discipline. | **idea only:** True
## cc.77 Vendored Chinese reverse-engineering doc site

- **where:** docs/ (39 mdx + 132 md), docs/extensibility/mcp-protocol.mdx (18 KB), docs.json + mint.json
- **what:** A Mintlify site in Chinese that documents the codebase's own architecture from source, including a full MCP protocol chapter.
- **how:** Hand-written .mdx chapters with ASCII architecture diagrams. mcp-protocol.mdx traces config -> getAllMcpConfigs() -> useManageMCPConnections() -> connectToServer() [memoize] -> fetchToolsForClient() [LRU(20)] -> assembleToolPool() -> mcp__<server>__<tool>, and tabulates the 3 built-in servers with their feature flags.
- **solves:** Makes a 557K-LOC reverse-engineered codebase navigable.
- **port effort:** N/A to code. Useful as a READING MAP for anyone harvesting ideas from this repo — it is the fastest way to find which subsystem implements what. | **idea only:** True
## cc.78 Seven-stage TUI render pipeline with a hard split from the input pipeline

- **where:** packages/@ant/ink/src/core/{reconciler,render-node-to-output,output,screen,log-update,terminal}.ts; core/layout/{engine,geometry,node,yoga}.ts; core/termio/{tokenize,parser,sgr,osc,csi,dec,esc}.ts; core/parse-keypress.ts; core/events/{dispatcher,hit-test}.ts; core/keybindings/match.ts. Pipeline diagram documented in docs/ink-tui-deep-audit.md lines ~60-105.
- **what:** Output path: React tree → react-reconciler → render-node-to-output (yoga flexbox layout + text wrap + SGR/style injection) → output.ts (write/writeLine/blitRegion into a cell buffer) → screen.ts (cell grid, setCellAt/getCellAt) → log-update.ts (per-frame diff/patch) → terminal.ts (write to stdout). Input path is fully independent: stdin raw bytes → termio/tokenize.ts → termio/parser.ts + parse-keypress.ts → App.tsx EventEmitter → three parallel dispatch strategies (Dispatcher, manual hit-test bubbling, ChordInterceptor).
- **how:** Reconciler produces a host node tree; render-node-to-output resolves layout via the vendored yoga-layout (core/yoga-layout/) plus measure-text/wrap-text/wrapAnsi/widest-line, and emits styled output nodes; output.ts paints them into a cell-level screen buffer rather than emitting strings; log-update.ts diffs the current screen against the previous one and emits only changed rows to the terminal.
- **solves:** Naive TUI renderers re-print the whole frame on every tick, which flickers and is O(visible rows) per keystroke. A cell buffer + frame diff is what makes a 60fps spinner with no flicker affordable, and separating the two pipelines means a slow input parser can never corrupt the render state.
- **port effort:** High. This is a full terminal-renderer reimplementation (~28k LOC incl. yoga, ANSI tokenizer, SGR state machine, grapheme handling, selection). Port the *architecture* and the invariants, not the code. Realistic for an agent harness to adopt selectively: a cell buffer + row diff on top of an existing TUI library, plus keeping input and output on separate state machines. | **idea only:** True
## cc.79 Keybindings as a declarative data table with 22 contexts, not handler conditionals

- **where:** src/keybindings/defaultBindings.ts (368 lines), schema.ts (246), validate.ts (501), reservedShortcuts.ts, loadUserBindings.ts, useKeybinding.ts, useShortcutDisplay.ts; type source packages/@ant/ink/src/keybindings/types.ts.
- **what:** Default keymap is a `KeybindingBlock[]` — an array of `{context, bindings}` records where bindings map keystroke patterns to action ids like 'app:toggleTranscript', 'chat:cycleMode', 'scroll:pageUp'. Contexts are UI-focus-scoped (Chat, Autocomplete, Confirmation, Transcript, DiffDialog, ModelPicker, Footer, Scroll, MessageActions, …).
- **how:** A single DEFAULT_BINDINGS array is the source of truth; the resolver merges user keybindings.json over it; `getShortcutDisplay(action, context, fallback)` reads back from the same table so every surface that *shows* a shortcut shows the user's actual binding. Chords supported ('ctrl+x ctrl+k' = chat:killAgents, 'ctrl+x ctrl+e' = chat:externalEditor).
- **solves:** Handler-conditional keymaps (if (key==='ctrl+r') …) make the effective keymap un-introspectable, so the help screen, the tips, and the settings editor each drift from reality. One table feeds all four surfaces.
- **port effort:** Medium. The data model (context→keystroke→action), chord parsing, reserved-shortcut protection, and the display-lookup helper are all small and portable. The failure mode to avoid is exactly the one this repo hit — see findings. | **idea only:** True
## cc.80 Build-time feature-flag DCE that also gates command registration

- **where:** src/commands.ts lines 68-170 (feature-gated requires) and 320-450 (conditional spreads); scripts/vite-plugin-feature-flags.ts; scripts/defines.ts; src/keybindings/defaultBindings.ts lines 40-90.
- **what:** `feature('X') ? require('./commands/x/index.js').default : null` at module scope, then `...(x ? [x] : [])` in the COMMANDS array and `...(feature('Y') ? {'ctrl+shift+b': 'app:toggleBrief'} : {})` in the keymap. ~30 of the 127 slash commands and a large share of default keybindings exist only when a flag is on; `require()` lets the bundler drop the rest.
- **how:** Flags resolve at build time via a Vite plugin that rewrites `feature()` to a constant, so `require()` of a disabled command becomes dead code the bundler eliminates — not a runtime `if`.
- **solves:** Lets one codebase ship internal-only diagnostics, gated enterprise features, and experimental modes without bloating the default binary. Also keeps the external build free of Anthropic-internal admin endpoints.
- **port effort:** Low-to-medium. The pattern itself is portable; the trap is that it makes the command surface *build-dependent* — a harness that greps for slash commands will over-report. Worth adopting only with an explicit 'list all commands regardless of flags' path. | **idea only:** True
## cc.81 Notification queue with priority, invalidation, folding, and timeout

- **where:** src/context/notifications.tsx; src/components/PromptInput/Notifications.tsx (11 KB, the renderer); src/hooks/notifs/*.tsx (16 files).
- **what:** `useNotifications()` over a central store. Notification = {key, priority: low|medium|high|immediate, timeoutMs?, text|jsx, invalidates?: string[], fold?: (acc, incoming) => Notification}. Default timeout 8000ms; an `immediate` notification clears the current timeout. 16 dedicated hooks push into it (rate-limit warning, plugin autoupdate, deprecation, LSP init, MCP connectivity, model migration, settings errors, IDE status, install messages, teammate shutdown…).
- **how:** `invalidates` lets a newer notification evict a stale one; `fold` merges same-key notifications (e.g. '3 files updated' + '1 file updated' → '4 files updated') instead of stacking; priority ordering determines what shows when several are queued.
- **solves:** Ad-hoc toast calls produce an unreadable pile and no dedup. The invalidate/fold pair turns a firehose of events into one coherent line.
- **port effort:** Low. ~150 lines of state plus a render slot. Fully portable in concept. | **idea only:** True
## cc.82 Per-terminal desktop notification with OSC escape sequences and progress reporting

- **where:** packages/@ant/ink/src/hooks/useTerminalNotification.ts; core/termio/osc.ts (519 lines); core/termio/ansi.ts (BEL).
- **what:** `useTerminalNotification()` returns notifyITerm2, notifyKitty, notifyGhostty, notifyBell, and progress(state, percentage) — the latter emitting OSC 9;4 (ConEmu, Ghostty ≥1.2.0, iTerm2 ≥3.6.6+). All writes go through wrapForMultiplexer so notifications survive tmux.
- **how:** OSC sequences are constructed and gated per detected terminal, then written raw via a TerminalWriteContext that bypasses the render pipeline (the render path is a diff buffer; a raw OSC must not go through it).
- **solves:** A CLI agent that runs long needs to tell the user when it finished even when the terminal is backgrounded — and to show progress without flooding scrollback.
- **port effort:** Low. Small, self-contained, and directly liftable as a design (not code). | **idea only:** True
## cc.83 Theme as 69 semantic tokens including explicit agent-identity colors and diff-pair tokens

- **where:** src/utils/theme.ts (639 lines); src/commands/theme/theme.tsx; src/components/ThemePicker.tsx; src/utils/systemTheme.ts; packages/@ant/ink/src/theme/ (23-file component kit: Pane, Dialog, ListItem, Tabs, FuzzyPicker, SearchBox, Spinner, ProgressBar, StatusIcon, Byline, LoadingState, Ratchet, ConfigurableShortcutHint, ThemedBox, ThemedText, ThemeProvider).
- **what:** 6 themes (dark, light, light-daltonized, dark-daltonized, light-ansi, dark-ansi) plus an 'auto' setting that follows system appearance. The token set is semantic, not literal: permission/permissionShimmer, promptBorder/promptBorderShimmer, inactive/inactiveShimmer, diffAdded/diffRemoved plus Dimmed and *Word variants for word-level diff, and 7 agent colors each suffixed `_FOR_SUBAGENTS_ONLY` so a subagent's output can never be confused with the main thread's.
- **how:** Components never name a color; they reference a token. Two of six themes are ANSI-terminal-native (light-ansi/dark-ansi) and two are colorblind-safe (daltonized). The `_FOR_SUBAGENTS_ONLY` suffix is a naming convention that makes the constraint greppable.
- **solves:** Hard-coded colors scatter across components and break dark mode, accessibility, and agent-attribution at once. A token table with an enforced naming convention solves all three.
- **port effort:** Low. Pure data + convention. The daltonized and ansi variants are a nice touch most harnesses lack. | **idea only:** True
## cc.84 Modal-relative chrome: overlays paint over the transcript, not in a fixed layer above it

- **where:** src/components/FullscreenLayout.tsx (549 lines); src/context/modalContext.tsx; src/context/promptOverlayContext.tsx; packages/@ant/ink/src/components/ScrollBox.tsx; packages/@ant/ink/src/theme/modalContext.ts.
- **what:** FullscreenLayout takes named slots — scrollable, bottom, overlay, bottomFloat, modal, modalScrollRef, scrollRef, dividerYRef, hidePill, hideSticky. The `modal` slot renders in an absolutely-positioned bottom-anchored pane with a ▔ divider that paints over BOTH the scroll region and the bottom slot, while still exposing a ModalContext so nested Pane/Dialog components skip their own border/padding. MODAL_TRANSCRIPT_PEEK = 2 keeps 2 rows of transcript visible above the divider for context.
- **how:** Slot props + a React context that suppresses redundant chrome in nested modal content, rather than a z-index stack of absolute-positioned siblings.
- **solves:** Naive overlay stacks (command palette, permission dialog, help) fight the prompt input for space and clip. Anchoring the modal to the transcript's bottom edge with a peek preserves conversational continuity — you can still read what you were replying to.
- **port effort:** Medium. The slot API is portable; the hard part (ScrollBox with a ref handle) needs a real scroll implementation. | **idea only:** True
## cc.85 Virtualized transcript with a sticky prompt header and an unseen-messages pill

- **where:** src/components/VirtualMessageList.tsx (1029 lines); src/components/FullscreenLayout.tsx (useSyncExternalStore over scrollRef); src/components/Messages.tsx (1113 lines).
- **what:** A 1029-line VirtualMessageList that virtualizes the message stream, tracks scroll position, keeps a sticky prompt header, and shows a jump-to-bottom pill until the viewport reaches the unseen-divider. MODAL_TRANSCRIPT_PEEK, dividerYRef and ScrollChromeContext exist specifically so the pill and sticky header are driven by scroll state without re-rendering REPL.
- **how:** ScrollChromeContext exposes a stable setter; the divider Y is snapshotted into a RefObject (not state) precisely so the one-shot write does not re-render the tree.
- **solves:** A long agent session produces thousands of message rows; rendering them all makes scrolling O(n) and the TUI unusable. Also solves the 'did I miss output while scrolled up' problem.
- **port effort:** Medium-high. The ref-not-state trick for scroll snapshots is the specifically valuable idea and is cheap to copy conceptually. | **idea only:** True
## cc.86 Message taxonomy with a dedicated component per semantic message kind

- **where:** src/components/messages/ (40 entries); src/components/Messages.tsx (1113 lines, the dispatcher incl. tool-name grouping and collapse logic).
- **what:** 5 top-level types (attachment, user, assistant, system, grouped_tool_use) dispatching to ~40 named renderers, including boundary markers (CompactBoundaryMessage, SnipBoundaryMessage) so the user can see where context was compressed or trimmed, and explicit null-rendering attachments (nullRenderingAttachments.ts) for content that must not draw.
- **how:** Each message type gets its own component; Messages.tsx decides grouping/collapsing and delegates. Boundary messages are first-class so a compacted transcript is legible.
- **solves:** A generic 'render a message' function becomes unmaintainable as message kinds multiply. A named component per kind keeps each independently editable and makes the transcript diffable.
- **port effort:** Medium. The idea of explicit compact/snipe boundary markers is directly valuable for a harness that compacts context. | **idea only:** True
## cc.87 Fuzzy slash-command palette with a usage-rank signal

- **where:** src/utils/suggestions/commandSuggestions.ts (576 lines); skillUsageTracking.ts; directoryCompletion.ts; shellHistoryCompletion.ts; slackChannelSuggestions.ts; rendered by src/components/PromptInput/PromptInputFooterSuggestions.tsx.
- **what:** `/` opens a Fuse.js-backed palette. SEPARATORS = /[:_-]/g splits multi-word command names into partKey for prefix matching; descriptionKey is a tokenized description; aliasKey covers aliases. The Fuse index is cached on the commands-array identity so it is not rebuilt per keystroke, and isHidden commands are excluded. getSkillUsageScore() biases ranking toward commands/skills the user actually runs.
- **how:** Cache keyed on array identity (the array is memoized in REPL.tsx) + a separate usage-score ranking pass.
- **solves:** With 127 commands a linear list is unusable; and equally, a purely alphabetical list buries the 10 commands you actually use.
- **port effort:** Low. Fuse.js plus ~100 lines. The usage-ranking idea is the transferable part. | **idea only:** True
## cc.88 Two-axis mode system: 5 permission modes (shift+tab) plus 6 named personas

- **where:** src/utils/permissions/PermissionMode.ts + getNextPermissionMode.ts; src/modes/{defaults,store,types}.ts; src/modes/personas/claude.ts; src/commands/autonomy.ts, src/commands/autonomyPanel.tsx; bindings at defaultBindings.ts:69 and :144.
- **what:** Permission modes default/acceptEdits/plan/auto/bypassPermissions cycle with shift+tab, with a dedicated confirm:cycleMode binding so the same chord works inside permission dialogs. Separately, 6 persona modes (Default, Dr. Sharp, Gentle, Super AI, Token Saver, Workhorse) each carrying a full inlined system prompt, cycled via cycleMode() in src/modes/store.ts. PromptInputModeIndicator.tsx surfaces the active mode.
- **how:** One chord bound in two contexts; a store with a cycleMode() reducer; a mode indicator component.
- **solves:** Safety level and personality are conflated in most agents. Splitting them means 'be terse' never implies 'skip permissions'.
- **port effort:** Low. Cheap and directly portable. | **idea only:** True
