# pi — chunk 4/5 (22 năng lực)

## pi.67 Usage-anchored context-token estimation

- **where:** packages/agent/src/harness/compaction/compaction.ts:164-249 (`calculateContextTokens`, `getLastAssistantUsage`, `estimateContextTokens`); `estimateTokens` at line 270; `shouldCompact` at 246
- **what:** `estimateContextTokens` returns `{tokens, usageTokens, trailingTokens, lastUsageIndex}`. It anchors on the last assistant message that carries a real (non-zero, non-error, non-aborted) provider `usage` block and estimates ONLY the messages after it. Falls back to a pure char-based estimate over everything when no usage exists.
- **how:** Walks the message list backward to find the last valid usage, then sums `estimateTokens` over the tail. Aborted/errored/zero-usage assistant messages are skipped (line 167-181) so a provider hiccup never resets accounting. Images charged a flat `ESTIMATED_IMAGE_CHARS = 4800` (line 253).
- **solves:** Re-tokenizing the whole transcript on every turn is O(history) per turn and drifts. Anchoring on the provider's own count makes compaction decisions both cheap and exact for the part that matters.
- **port effort:** LOW — ~90 lines, no dependencies beyond the Usage type. Highly portable. | **idea only:** False
## pi.68 Turn-boundary-aware compaction cut point

- **where:** packages/agent/src/harness/compaction/compaction.ts:370-419; `findValidCutPoints` at 311, `findTurnStartIndex` at 343
- **what:** `findCutPoint(entries, startIndex, endIndex, keepRecentTokens)` walks backward accumulating estimated tokens until the `keepRecentTokens` budget is met, then snaps forward to the nearest valid cut point and reports whether that cut splits an in-progress turn.
- **how:** Returns `{firstKeptEntryIndex, turnStartIndex, isSplitTurn}`. Cutting at a user message means no split; cutting at an assistant/tool message triggers `findTurnStartIndex` to walk back to the turn's user message. A final loop (lines 393-402) never leaves a lone custom/branch entry stranded.
- **solves:** Naive token-threshold compaction cuts mid-turn and leaves the model with a tool result whose tool call was summarized away — a transcript the provider will reject.
- **port effort:** LOW — ~110 lines including the cut-point finder; the entry-kind walk is the reusable idea. | **idea only:** False
## pi.69 Provider context-overflow detection matrix

- **where:** packages/ai/src/utils/overflow.ts (whole file, 9.9 KB) — `isContextOverflow` at line 136, `isRecoverableLength` at 178
- **what:** `isContextOverflow` recognizes context-overflow from three independent signals: (1) 24 provider-attributed error-text regexes covering Anthropic, OpenAI, Google, xAI, Groq, OpenRouter, Together, llama.cpp, LM Studio, Copilot, MiniMax, Kimi, DS4, Cerebras, Mistral, z.ai, Ollama, DashScope; (2) SILENT overflow where the call succeeded but `usage.input + cacheRead > contextWindow`; (3) LENGTH-stop overflow where a provider truncates input to fit and returns `stopReason:"length"` with `output === 0` and input filling ≥99% of the window. A separate NON_OVERFLOW list excludes rate-limit/throttle texts that would otherwise false-positive on the generic `/too many tokens/i` pattern.
- **how:** Regex list + exclusion list + per-message conditional cases. `isRecoverableLength(message, desiredMaxOutput)` separately flags a length-stop that ended BELOW the intended output limit as recoverable-by-compaction.
- **solves:** Context overflow is the single most common hard failure of a long agent run, and it surfaces as a different string (or a silent success) per provider. Hard-coding a few patterns in the caller means overflow recovery silently never fires.
- **port effort:** LOW — one self-contained file, zero deps, with an explicit doc block listing which providers are reliable vs unreliable. Directly liftable. | **idea only:** False
## pi.70 Retry classifier: curated transient vs. deterministic error split

- **where:** packages/ai/src/utils/retry.ts — patterns at lines 6-84, `isRetryableAssistantError` at the end of the file, `retryAssistantCall` above it
- **what:** `isRetryableAssistantError` returns false for quota/billing/subscription exhaustion (a NON_RETRYABLE list: `insufficient_quota`, `out of budget`, `quota exceeded`, `billing`, OpenCode Go's `GoUsageLimitError`/`FreeUsageLimitError`, "available balance", "Monthly usage limit reached") and true for a RETRYABLE list of transient transport/server shapes (overloaded, 429/5xx family, network/ECONN/ENOTFOUND/socket-hang-up, premature-stream-end from Anthropic/Bedrock, WebSocket closes, gRPC ResourceExhausted, mid-stream "you can retry your request").
- **how:** Two compiled RegExp lists, non-retryable checked first. `retryAssistantCall` normalizes abort-during-backoff into a `stopReason:"aborted"` AssistantMessage so callers never need to distinguish where cancellation happened. Aborts are terminal and never retried.
- **solves:** Naive `if (error) retry()` either hammers a hard-quota wall forever or gives up on a genuine transient blip. The exclusion list is the non-obvious half: it stops `/too many tokens/i` (AWS Bedrock throttling) from being read as overflow.
- **port effort:** LOW for the classifier; MEDIUM for the loop (which needs the sleep/normalize-abort discipline). See the jitter finding before porting the delay. | **idea only:** False
## pi.71 Bounded compact-and-retry on overflow (exactly one attempt)

- **where:** packages/coding-agent/src/core/agent-session.ts:358 (flag), 2605-2700 (_checkCompaction), 2747+ (_runAutoCompaction)
- **what:** On a context-overflow or recoverable-length stop, the session compacts and retries — but only once. A private `_overflowRecoveryAttempted` flag gates it; the second failure emits a user-facing message telling them to reduce context or switch model. Several staleness guards prevent a pre-compaction message from re-triggering compaction right after one just ran (compare `assistantMessage.timestamp` against `compactionEntry.timestamp`, and check the message is still present in the current projection).
- **how:** Three cases: explicit overflow error, recoverable length-stop, and threshold. A completed (`stopReason:"stop"`) response compacts WITHOUT retry, because `agent.continue()` cannot continue from a completed assistant turn — an easy-to-miss constraint stated in the comment at line 2661.
- **solves:** Prevents both a compaction loop (compact, overflow, compact) and a stale-usage false-positive that fires compaction immediately after a successful compaction.
- **port effort:** MEDIUM — the guard logic is ~90 lines and is the highest-value part to copy; it is entangled with SessionManager projection APIs, so expect to re-plumb. | **idea only:** True
## pi.72 In-process owned subagent conversations (pico3)

- **where:** packages/agent/src/harness/pico3/types.ts:599-612 (ConversationSpec, OwnedConversationSpec, SendInput), 137 (background); task-api at packages/agent/src/harness/pico3/kinds/task-api.ts:18; behavior proven in packages/agent/test/harness/pico3/subagent.test.ts:41, :77, :113, :157, :197, :219
- **what:** A tool receives `api.conversation(spec, ctx)` and gets back a child conversation handle with its OWN rewindable model/thinking config and sticky state — fully isolated from the parent, with no subprocess. `OwnedConversationSpec` carries `inherit?: boolean` to fork the tool's own conversation at its tip. `TaskSpec.background?: true` marks a child that "does not hold the conversation busy; survives conversation abort".
- **how:** Children are created transactionally via `tx.createOwnedConversation(ownerTaskId, sourceConversationId, spec)`. Tests cover: isolated config + answers + parent continues; parent-conversation abort reaches an owned child mid-stream while background children survive; subtree hooks (registered `subtree:true`) fire for the child and are reconstructed from ancestry after reopen; a task-level abort (not conversation abort) keeps queued input for a later idle send.
- **solves:** Context isolation for delegated work, plus correct cancellation semantics — the three cases most hand-rolled subagent systems get wrong (does killing the parent kill the child? does it kill a background one?).
- **port effort:** LARGE as-is (requires adopting pico3's whole scheduler/transaction model). MEDIUM if only the design is taken: the spec shape, the `background` flag, and the subtree-hook ancestry rule are the reusable parts. NOTE: not on the production path — see findings. | **idea only:** True
## pi.73 Explicit busy-input policy for sends

- **where:** packages/agent/src/harness/pico3/types.ts:611
- **what:** `SendInput.whenBusy` is one of `"steer" | "followUp" | "reject"`, so the caller states its intent and the runtime decides, rather than the caller guessing.
- **how:** A discriminated field on the send input, resolved against the conversation's busy state.
- **solves:** Removes the guesswork from "what happens if the user types while the agent is mid-tool-batch" — a question every agent host re-solves differently.
- **port effort:** LOW as a concept; the runtime to enforce it is the expensive part. | **idea only:** True
## pi.74 Outcome-durability vs. source-order separation for parallel tools

- **where:** Design: packages/agent/docs/tool-durability.md (goals 1-2). Implementation: packages/agent/src/harness/runtime/drive/tool-placement.ts:53-70 (`PlacementItem` selects `status: "outcome_ready"` calls), plus `pendingEntry`/`branchTip` in packages/agent/src/harness/session/values.ts
- **what:** Parallel tool effects finish in completion order, but tool-result entries must enter the conversation in assistant source order. pi inserts a durable `outcome_ready` state: a finalized result is written immediately (under `pi.pending.entry`), and placement into the tree happens later, once every earlier source position is complete or ready.
- **how:** Tool calls carry a `sourceIndex` back into the assistant message content; placement reads the source to rebuild the result, and throws `SessionInvariantError` if a source index does not name a tool-call block.
- **solves:** Without the intermediate state, if B and C finish but A is still running and the process crashes, B and C exist only in memory — recovery treats them as unresolved and may REPLAY side effects that already happened.
- **port effort:** LARGE (it is a persistence state-machine change). The IDEA — separate completion order from materialization order — is the port-ready part and is genuinely non-obvious. | **idea only:** True
## pi.75 Projection-time per-entry context editing (cheaper than compaction)

- **where:** packages/coding-agent/src/core/session-manager.ts:175-180 (type), 1389 (write site), 542-568 (`buildSessionProjection` builds an `edits: Map<targetId, ContextEditEntry>` and applies it per entry)
- **what:** A `context_edit` entry targets one prior entry by id. `replacement: null` omits the target from model context; a value replaces only its content. Edits are applied when the model transcript is BUILT, not when written, so the stored session stays complete and the edit is itself an auditable entry.
- **how:** Projection walks the branch path, collects edits into a map, then maps each context entry through `projectContextEntry(sourceEntry, edits.get(sourceEntry.id))`. Because edits are entries, they survive reload and can be undone by re-projection.
- **solves:** Removes a handful of large tool outputs (a 50 KB grep hit, a 200 KB file read) that will never be needed again, without paying for a full summarization LLM call and without destroying the transcript.
- **port effort:** MEDIUM — the entry type is 6 lines; the projection plumbing is the work. Strong candidate for omp. | **idea only:** False
## pi.76 Session as a parent-linked entry DAG with typed entry kinds

- **where:** packages/agent/src/harness/session/types.ts:18-56 (EntryType + MessageEntry/CompactionEntry/BranchSummaryEntry/CustomEntry); coding-agent's extended union at packages/coding-agent/src/core/session-manager.ts:183-194
- **what:** Every session entry carries `id`, `parentId`, `seq`, `timestamp` and one of `message | compaction | branch_summary | custom` (coding-agent adds `context_edit`, model/thinking changes, usage, labels). Forking and navigation are graph operations on parent links, not array slicing.
- **how:** `buildSessionPath` + `buildContextEntries` reconstruct the active branch; compaction entries carry `retainedTail` so the post-compaction tail is a first-class part of the entry rather than a re-derivation.
- **solves:** Makes branch/fork/rewind/undo free instead of a special case, and makes compaction itself an undoable entry rather than a destructive rewrite.
- **port effort:** MEDIUM — the type layer is small and worth copying as-is; the storage/query layer is the bulk. | **idea only:** False
## pi.77 Storage-agnostic session interface with a shared conformance suite

- **where:** Interface: packages/agent/src/harness/session/types.ts:455-471 (Storage) and :592-602 (SessionRepo). JSONL impl: packages/agent/src/harness/session/jsonl/storage.ts:40 + repo.ts:46. SQLite impl: packages/session-backends/sqlite-node/src/. Conformance suites: packages/agent/src/harness/session/testing/conformance/{storage,session-repo}.ts (920 + 1185 lines) plus `memory-conformance.test.ts`, and mirrored `*-conformance.test.ts` under packages/session-backends/sqlite-node/test/.
- **what:** A 14-method `Storage` interface (commit/getEntries/getValue/scanValues/readList/scanBranch/scanBranchStructure/scanEntries/scanUsage/getStats/close) and a 5-method `SessionRepo` (create/open/list/delete/fork). JSONL and SQLite are both just implementations, and both run the SAME conformance tests.
- **how:** Every entry takes a `Context` as its last argument (a capability object carrying the AbortSignal and other ambient deps), so implementations never touch globals. The conformance suites are injectable-generic and run against each backend.
- **solves:** Swapping the session store (JSONL -> SQLite -> remote) without touching the agent. The conformance suite is the part worth stealing: it is what makes "storage-agnostic" true rather than aspirational.
- **port effort:** MEDIUM for the interfaces; HIGH for the conformance suite, which is ~2100 lines but is directly reusable as a test harness. | **idea only:** False
## pi.78 Crash-safe append-only JSONL with torn-write detection

- **where:** packages/agent/src/harness/session/jsonl/storage.ts:31-36 (splitCompleteLines), 42-48 (commitQueue, state machine), imports at :20-28; version at packages/agent/src/harness/session/jsonl/types.ts:5
- **what:** Reads tolerate a partially-written final line: `splitCompleteLines` returns `{lines, torn}` and a torn trailing line is discarded rather than parsed. Writes go through `serializeJsonlTransaction`/`publishJsonl`/`publishFileAtomically`, and a `commitQueue: Promise` serializes commits. Format is versioned (`JSONL_FORMAT_VERSION = 4`) with a `LegacyV3Source` reader.
- **how:** Header line carries `v`, `id`, `createdAt`, `cwd`, `parentSessionId`, and a `nextSeq` high-water mark written by snapshot rewrites.
- **solves:** A session file killed mid-write must still open. Without the torn check, a half-written line makes the whole session unreadable — the single most common way users lose agent history.
- **port effort:** MEDIUM — the torn-line check is 6 lines and the highest-value part; the atomic publish helpers are small too. | **idea only:** False
## pi.79 Stream-function injection instead of a baked-in provider

- **where:** packages/agent/src/stream-fn.ts (whole file, 20 lines); `StreamFn` contract at packages/agent/src/types.ts:29-34
- **what:** `pi-agent-core` holds no provider catalog. A host installs its stream function via `setDefaultStreamFn()` or passes `StreamFn` explicitly; `getDefaultStreamFn()` throws a directed error if neither happened.
- **how:** A module-level nullable holding the host's stream function. The `StreamFn` doc block states a hard contract: must not throw or reject; must return a stream; failures must be encoded as protocol events plus a final AssistantMessage with `stopReason: "error"|"aborted"`.
- **solves:** Lets the agent runtime ship without any model knowledge, and forces every transport failure through one observable channel instead of a mix of throws and rejected promises.
- **port effort:** LOW — 20 lines. One of the highest value-per-line items in the repo. | **idea only:** False
## pi.80 Per-tool replay policy for unknown-outcome effects

- **where:** packages/agent/src/types.ts (AgentTool.replay); consumed by the recovery layer at packages/agent/src/harness/runtime/drive/recovery.ts:86
- **what:** `AgentTool.replay?: "never" | "safe"` declares whether a tool may be re-invoked when its durable intent exists but its outcome is unknown (i.e. after a crash mid-effect).
- **how:** Read-only tools default to replayable; effectful tools must opt in explicitly. The recovery layer synthesizes settlement for cancelled/orphaned effects rather than re-running them.
- **solves:** Makes "may I retry this?" a per-tool declaration instead of a global guess, which is the difference between safe crash recovery and a duplicated side effect.
- **port effort:** LOW as a type-level contract; the enforcement (recovery.ts) is MEDIUM. | **idea only:** True
## pi.81 Effect gate: procedure-facing admission vs. owner-facing lifecycle

- **where:** packages/agent/src/harness/execution/effect-gate.ts (64 lines, whole file)
- **what:** `createGate()` returns a `Gate` (used by the executing procedure: `admit<T>(invoke: () => T): T` wraps every side effect, plus a signal) and a separate `GateControl` (used by the owner: `beginAbort`, `signalAbort`, `close`). A 3-state machine — open / aborting(cancellation promise) / closed(error).
- **how:** `admit` throws `AbortRequested` (carrying the cancellation promise) when aborting, or the stored error when closed. The split means the runtime can close the gate without giving the in-flight procedure a way to reopen it.
- **solves:** Race between "cancel was requested" and "the tool just started its side effect". Wrapping the effect in `admit()` makes admission a synchronous, uninterruptible checkpoint.
- **port effort:** LOW — 64 lines, self-contained, no deps. | **idea only:** False
## pi.82 Event stream with a separately-awaitable final result

- **where:** packages/ai/src/utils/event-stream.ts:26-95 (whole file)
- **what:** `EventStream<T,R>` exposes both `asyncIterator` and a `result(): Promise<R>` that resolves on a caller-supplied `isComplete(event)` predicate. `AssistantMessageEventStream` completes on `done` or `error` and extracts the final message.
- **how:** Dual FIFO queues; `push` after `done` silently drops. `end(result?)` forces completion and wakes all waiting iterators.
- **solves:** A consumer that only wants the final assistant message should not have to drain the whole token stream to get it.
- **port effort:** LOW — ~70 lines. | **idea only:** False
## pi.83 Field-by-field usage accumulation

- **where:** packages/agent/src/harness/utils/usage.ts (35 lines, whole file)
- **what:** `addUsage(left, right)` sums input/output/cacheRead/cacheWrite/totalTokens and all five cost fields, and conditionally includes `cacheWrite1h` and `reasoning` only when at least one side has them — so a Usage without the optional fields does not gain zero-valued ones.
- **how:** Spread-conditional: `...(left.cacheWrite1h === undefined && right.cacheWrite1h === undefined ? {} : {cacheWrite1h: ...})`.
- **solves:** Naive accumulation leaks `reasoning: 0` / `cacheWrite1h: 0` into every usage record, which then changes JSONL output shape and breaks any consumer doing `'reasoning' in usage`.
- **port effort:** LOW — 35 lines, copy as-is. | **idea only:** False
## pi.84 Fully-rebindable keybinding registry with legacy-name migration

- **where:** packages/coding-agent/src/core/keybindings.ts (401 L), packages/tui/src/keybindings.ts (320 L), docs/keybindings.md (90 rows, exact match)
- **what:** 90 named keybinding actions (47 `tui.*` + 43 `app.*`) each with a default, a human description, and platform-conditional defaults; user overrides in `~/.pi/agent/keybindings.json`; 60 legacy flat names auto-migrated with new-name-wins on collision.
- **how:** TypeScript declaration merging: `AppKeybindings` is merged into the TUI package's `Keybindings` interface via `declare module`. `KEYBINDINGS` is a plain `{name: {defaultKeys, description}}` record; `KeybindingsManager` extends the TUI manager and loads/merges user config. `useWindowsKeybindings(platform, env)` returns true for win32 and WSL so defaults differ per platform. `migrateKeybindingsConfig()` rewrites legacy keys and orders output canonically.
- **solves:** Users are hostile to hardcoded shortcuts. Naming every action — not just the key — lets `/hotkeys` render live hints (`keyHint("app.session.togglePath", ...)`) that follow the user's own config, and lets the docs table be verified against code.
- **port effort:** Medium. The idea ports cleanly; the 90-entry default table is data you re-derive from your own keymap. Adopt the naming + migration + description discipline, not the defaults. | **idea only:** True
## pi.85 Data-driven slash-command table decoupling palette from dispatch

- **where:** packages/coding-agent/src/core/slash-commands.ts (44 L), consumed at interactive-mode.ts:679-790
- **what:** A single `BUILTIN_SLASH_COMMANDS` array carries `{name, description, argumentHint?}` for every built-in; the autocomplete palette is built from it; extension commands, prompt templates and `skill:<name>` commands are merged in with a `[source]` tag on the description.
- **how:** `createBaseAutocompleteProvider()` maps the table into `SlashCommand[]`, then attaches `getArgumentCompletions` to `model`/`thinking`/`login` for fuzzy argument completion. Conflict diagnostics are surfaced as `ResourceDiagnostic` warnings when an extension registers a name that collides with a built-in (renamed to `invocationName`).
- **solves:** Adding a command requires editing one declarative array rather than hunting a dispatch chain; the palette, the docs, and the conflict checker all read the same source.
- **port effort:** Low. ~40 lines of table + ~110 lines of provider assembly. Note the known gap: dispatch is a separate if-chain (see finding 2). | **idea only:** True
## pi.86 Theme system with a 56-key JSON schema and terminal-appearance auto-detection

- **where:** packages/coding-agent/src/modes/interactive/theme/{theme.ts(1174),theme-controller.ts(213),theme-json.ts(148),theme-schema.json(361),dark.json,light.json}
- **what:** Themes are JSON documents validated by a shipped JSON Schema. Semantic color names (`accent`, `borderMuted`, `toolPendingBg`, `mdHeading`, `toolDiffAdded`, `syntaxKeyword`, `thinkingMax`, …) resolve through 16 indirection `vars`. Includes a 7-step thinking-level color ramp and a full syntax-highlight palette.
- **how:** Theme files are `vars` + `colors` + `export`; `colors` values are either hex literals or `var` names. `InteractiveThemeController` issues OSC 10/11 default-color queries (100 ms timeout) plus OSC color-scheme notifications to detect light/dark terminal background, then resolves an `auto` theme setting to `{lightTheme, darkTheme}`. Themes load from packages, user dirs, and `--theme`; the selector live-previews on selection change before commit.
- **solves:** Users theme their terminal once and expect the agent to follow. Rather than forcing a choice, pi queries the terminal and auto-syncs — including reacting to a live appearance change mid-session.
- **port effort:** Low for the color-token layer; medium for OSC auto-detection (terminal support is uneven and needs the timeout/fallback discipline, which the code already has). | **idea only:** True
## pi.87 Two-renderer TUI with hot-swap between scrollback and fixed-dock viewport

- **where:** packages/tui/src/{tui-main-screen.ts(655),tui-alt-screen.ts(1745),tui.ts(1473),layout.ts(449)}, packages/coding-agent/src/modes/interactive/chat-viewport.ts(46) + tui-renderer.ts(79)
- **what:** `regular` mode renders a flat component list into the terminal's main screen with differential line updates so output flows into native scrollback. `fullscreen` mode uses the alt screen with a layout root: a flexing transcript `ScrollView` above a fixed input dock. Users can switch live via the `TUI mode` setting.
- **how:** `createInteractiveTui()` overloads on `tuiMode` to return `TuiAltScreen` or `TuiMainScreen`. `createChatViewport()` returns `{transcript: ScrollView, root: VStack([transcript flex, dock auto])}` where dock = VStack(pendingMessages, status, widgetsAbove, editor `minSize:3`, widgetsBelow, footer). `mountInteractiveTui()` adds the same 7 containers either flat (regular) or via `setLayoutRoot` (fullscreen). `switchTuiMode()` migrates by capturing render state, focus, and terminal settings, then remounting. `createInteractiveTuiReference()` is a Proxy that survives the swap so components keep a stable reference.
- **solves:** Lets users choose between "scrollback my shell history" and "full-screen app with a pinned input box" without two codebases, and lets the app change its mind at runtime.
- **port effort:** High. This is the deepest structural idea in the repo and it is genuinely reusable, but it presupposes a differential TUI core. If omp already has one this is a config; if not, this is a rewrite. | **idea only:** False
## pi.88 Extension-controllable footer, header, widgets, working indicator, and window title

- **where:** packages/coding-agent/src/core/extensions/types.ts:140-240 (ExtensionUIContext), examples/extensions/{custom-footer,custom-header,widget-placement,titlebar-spinner,working-indicator}.ts
- **what:** Plugins can replace the footer and header wholesale, add widgets above/below the editor, replace the spinner frames, relabel hidden-thinking, and set the terminal window title. All reversible by passing `undefined`.
- **how:** `ctx.ui.setFooter(factory)` / `setHeader(factory)` receive `(tui, theme, footerData)` and return a `Component & {dispose?}`. `setWidget(key, content, {above|below})` accepts raw string lines or a component factory. `setWorkingIndicator({frames})` takes over the spinner; `frames: []` hides it. `setStatus(key, text)` appends a third footer line (sorted alphabetically, sanitized of control chars).
- **solves:** Small plugins need persistent chrome (a token meter, a PR link, a task counter) without forking the whole TUI, while the host keeps control of layout and key handling.
- **port effort:** Low. The extension-UI contract is thin and well documented; 130 example files in this repo show intended usage end to end. | **idea only:** True
