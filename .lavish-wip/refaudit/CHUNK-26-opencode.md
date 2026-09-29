# opencode — chunk 2/6 (22 năng lực)

## opencode.23 Structured summary with user-boundary tail retention

- **where:** packages/core/src/session/compaction.ts:46-77 (SUMMARY_TEMPLATE), :79-85 (SUMMARY_RULES), :322-362 (splitHistory/findTailStart), :638-707 (the two-request loop), :710-724 (validation failure)
- **what:** Compaction splits history at a USER message boundary (never mid tool-call/result exchange), keeps the tail verbatim, and asks the model for a fixed 7-section template (Objective/Requirements/Decisions/Work State/Next Move/Relevant Files/Important Context). The summary is validated: if no `##` heading from the template is present, ONE reminder request is issued; still failing means the compaction FAILS rather than installing a bad checkpoint.
- **how:** findTailStart walks newest→oldest on Token.estimate, always keeps at least the newest entry, then `while (start > 0 && conversation[start].message.type !== "user") start--`. If no user boundary exists it degrades to 'summarize everything, retain nothing' (:360-361). Both requests share one retry allowance; rejected output never enters the reminder request (:632).
- **solves:** Splitting at a user boundary is what keeps tool-call/result pairs intact — the classic compaction bug. Output validation means a malformed summary is a loud failure, not silent context loss.
- **port effort:** low — the template and the boundary rule are copyable as-is | **idea only:** True
## opencode.24 Native provider-checkpoint compaction with a provenance guard

- **where:** packages/core/src/session/compaction.ts:96-115 (NativeInput/NativeStrategy/Editor), :501-594 (executeProvider), :520-528 and :738-741 (dispatch); packages/core/src/session/model-request.ts:279-293 (the provenance defect)
- **what:** Some providers (Anthropic context-management, OpenAI Responses) do compaction server-side. opencode supports it via a plugin-registered NativeStrategy, but guards it hard: the route must come from catalog config, not a model.request hook rewrite, because history is selected BEFORE hooks run. If a routing hook would send an existing opaque window to a different deployment, the request DIES rather than silently corrupting the checkpoint.
- **how:** `SessionProviderContext.provenance(model)` + `.compatible(a,b)` gate every window. `original(sessionID)` re-expands the full local transcript for checkpoint-only strategies that need real user messages. Auto-overflow falls back to `recoverLocally` and marks `recoveredOverflow`.
- **solves:** Opaque provider windows are unreplayable if they leak to another deployment. The guard converts a silent-corruption class of bug into a loud defect.
- **port effort:** high — the provenance model only matters if omp also supports native checkpoints; the guard idea is portable alone | **idea only:** True
## opencode.25 Two-mode input admission: steer (mid-turn) vs queue (next turn)

- **where:** packages/core/src/session/inbox.ts:43-48 (Promotable doc), :488-528 (promote), :530-550 (pendingSteers with control hoisting); packages/core/src/session/runner/llm.ts:60-65, :79-110, :160-181; packages/core/src/session/session.ts:135-144 (steer/queue mutators)
- **what:** Pending input lives in a durable inbox table with a `delivery` column. `steer` = inject at the next step boundary mid-work; `queue` = next turn only. Control items (compaction, move) are NOT ordinary input — they are consumed by the runner at the boundary before any prompt is promoted. `promote()` returns `undefined` to mean "handle a control first".
- **how:** All inbox mutation runs under a per-session KeyedMutex (`serialized`, inbox.ts:59-63). `pendingSteers` hoists a compaction row ahead of earlier steers so their text stays verbatim after the checkpoint instead of being swallowed into the summary — but never across a `move`, which changes the Location.
- **solves:** Mid-turn steering without corrupting the step in flight, and without a control item (a manual compact, a directory move) being starved behind a queued prompt.
- **port effort:** medium — needs a durable queue; the steer/queue split and the control-priority rule are the ideas | **idea only:** True
## opencode.26 Run coordinator with a doorbell (one fiber per busy period)

- **where:** packages/core/src/session/run-coordinator.ts:32-59 (design + ASCII diagram), :74-85 (loop), :116-120 (settle), :136-145 (wake), :147-167 (interrupt), :171-176 (awaitIdle)
- **what:** One execution = one fiber per session key, from the first wake until the key would stay idle. `pendingWake` is a doorbell: work recorded DURING a drain rings it, and the loop drains again instead of ending. The doorbell explicitly closes the gap between a drain's last eligibility check and the idle transition, which cannot be one atomic step.
- **how:** Coalesced wakes keep the widest scope ('input' subsumes 'steer', line 141). The loop uses a trampoline (`Effect.yieldNow` before recursing) so synchronous drains can't grow the stack. Interrupt claims wakes recorded so far but lets wakes arriving during cleanup start a successor at settle.
- **solves:** The classic lost-wakeup race between 'no work' and 'going idle'. The diagram and the 4 comment blocks explain it better than most designs I've read.
- **port effort:** medium — a ~180-line file; conceptually a keyed mutex plus a boolean doorbell | **idea only:** True
## opencode.27 Classification-driven retry on an exhaustive error-tag switch

- **where:** packages/core/src/session/runner/retry.ts:30-65 (isRetryable), :67-92 (schedule + RETRY_AFTER_MAX), :94-120 (policy), :126-138 (transient)
- **what:** `isRetryable` is an exhaustive `switch` over `AIError.reason._tag` with a `never` check — not status codes. The comment states the policy for the default branch explicitly: unrecognized failures retry, because classification records affirmative deterministic evidence and transient failures arrive in shapes no classifier anticipates.
- **how:** Schedule = min(exponential(2s), spaced(10s)) capped by recurs(10), jittered; documented as 2,4,8,10x7 ≈ 84 s total. `x-should-retry` response header overrides both ways (:31-33). Provider `retryAfterMs` is honored but clamped to 15 minutes against a hostile/buggy header. A plugin hook can rewrite BOTH retry and delay (:106-118).
- **solves:** The retry decision is auditable by reading one switch, and adding a new error class forces the compiler to make you classify it.
- **port effort:** low — the switch shape and the bound-on-retry-after rule are directly portable | **idea only:** True
## opencode.28 Retry is split by whether output was already produced

- **where:** packages/core/src/session/runner/step.ts:167-189 (Retry vs Continue), :185-189 (startAssistant on retry), :246-254 (Continue return); packages/core/src/session/runner/llm.ts:34-35 (CONTINUE_AFTER_INCOMPLETE_STREAM), :275-297 (outcome match)
- **what:** Same failure, two different repairs. If NOTHING was output, retry transparently (state projects onto the existing assistant, which is created just for the retry). If output WAS produced, do NOT retry the request — instead publish a synthetic 'Continue from where you left off' message and start a NEW assistant message.
- **how:** `isInterruptedStream` (step.ts:274-278) admits two shapes: InvalidProviderOutput with classification 'incomplete-stream', or Transport with operation 'read'. RecoverFull (step.ts:167-173) handles 'retry-full' transport recovery by rebuilding the whole request, once per step.
- **solves:** Re-sending a request that already streamed visible text would duplicate it in the UI and double-charge. Recovery has to branch on durable fact, not on the error alone.
- **port effort:** medium — the outputStarted gate is the idea; needs the same durable output tracking | **idea only:** True
## opencode.29 Max-steps as a forced text-only final step that preserves the cache prefix

- **where:** packages/core/src/session/runner/llm.ts:227 (stepLimitReached), :235-247 (the request, with the cache comment at :244), :264-266 (needsContinuation); packages/core/src/session/runner/max-steps.ts:1-16; packages/core/src/session/runner/step.ts:88-90 (the guard)
- **what:** At the step limit, the runner appends a MAX_STEPS_PROMPT assistant message and sets toolChoice:'none' — but deliberately KEEPS the tool definitions on the request. If a tool call still arrives, it is rejected with 'Tools are disabled after the maximum agent steps'.
- **how:** Comment at llm.ts:244: 'Keep tool definitions on the final Step to preserve the provider's cached prefix.' step.ts:265 also gates `needsContinuation` on toolChoice !== 'none'.
- **solves:** Forces a real summary turn instead of a truncated trace, without invalidating the provider's prompt cache — which would cost a full re-read of the entire conversation on the most expensive request of the turn.
- **port effort:** low — the prompt is copyable; the cache-prefix reasoning is the reusable insight | **idea only:** True
## opencode.30 Subagent = an ordinary child session run by the same loop

- **where:** packages/core/src/tool/plugin/subagent.ts:29-62 (schema+description), :100-266 (execute), :118-133 (depth limit), :282-309 (dynamic tool description); packages/core/src/session/subagent-job.ts:16-59; packages/core/src/session/subagent-completion.ts:20-45
- **what:** No second agent runtime. A subagent is a child session (`parentID`) that the normal drain loop executes. Foreground blocks on `jobs.block`; background returns a sessionID immediately and the parent is woken by a durable notification when the child finishes. The tool input even supports passing an existing sessionID back to CONTINUE the same child conversation.
- **how:** Depth limit defaults to 1 (`experimental.subagent_depth ?? 1`, subagent.ts:129) — nesting is opt-in. Model precedence: explicit override > agent's model > parent's (:184). `subagent-job.ts:23-25` dedups notifications by `${childSessionID}:${startedAt}` so a continuation generation doesn't double-notify. A session hook rewrites the tool description to list available subagents on every context/compaction/generate request (:282-309).
- **solves:** Subagent recovery, compaction, retry, permissions, and crash resume all work for children because children are just sessions. Background mode returns a sessionID so the model can continue the child later without re-reading its transcript.
- **port effort:** medium — the shape ports; the Job service and notification dedup are opencode-specific | **idea only:** True
## opencode.31 Per-request tool snapshot with permission filtering at capture time

- **where:** packages/core/src/tool.ts:51-63 (Snapshot), :225-287 (snapshot), :263-284 (execute), :292-295 (whollyDisabled); packages/core/src/tool/AGENTS.md:50-54 (the explicit 'filtering is not authorization' rule); packages/core/src/session/context.ts:131-143 (merge + snapshot)
- **what:** Each model request captures the effective definitions AND executors it advertised. Later reloads/disposal affect only later snapshots. Permission filtering happens at snapshot time (catalog visibility), but the registry performs NO authorization — the leaf still runs its own policy.
- **how:** `definitions?: ReadonlyMap<string, ToolDefinition>` is threaded into execute; a call for a definition the request did not advertise returns 'Tool is not available for this request' (tool.ts:274-275) rather than executing. Hooks may RENAME a tool; the model-request layer tracks definitions by object identity so renames map back (model-request.ts:216-233). Foreign plugin errors are coerced to Tool.Error at the untrusted boundary so a call can never be left permanently unsettled (runtime.ts:31-44).
- **solves:** A session context hook that REMOVES a tool actually removes it for that request. A rename is preserved. A buggy third-party plugin cannot wedge a tool call forever.
- **port effort:** medium — the identity-through-hooks trick is the non-obvious part | **idea only:** True
## opencode.32 Token accounting anchored on the last real provider usage

- **where:** packages/core/src/session/compaction.ts:168-172 (hasInputUsage), :174-208 (estimateTokens), :210-230 (estimatePart); packages/core/src/util/token.ts:5
- **what:** Rather than estimating the whole conversation, `estimateTokens` finds the last assistant message with real input usage, adds its full usage, and estimates ONLY the local delta since then (which the provider never billed). Media uses flat estimates: image 1500, PDF 2000 tokens. Base estimator is 4 chars/token.
- **how:** cost is computed separately with TIERED pricing — it filters the cost table for the highest context tier the usage exceeds (usage.ts:22-36), not a flat rate. Compaction usage is recorded under a distinct `source: "compaction"` so it does not pollute the conversation anchor.
- **solves:** Anchor + delta is far more accurate than whole-conversation estimation, and cheap. The tiered cost table handles long-context price breaks most clients get wrong.
- **port effort:** low — the anchor+delta structure is the idea; the numbers are tuning | **idea only:** True
## opencode.33 Stale-state settlement on drain entry

- **where:** packages/core/src/session/runner/llm.ts:67-68 (call sites), :302-330 (settleStaleCompactions, newest-first), :332-355 (settleStaleToolCalls)
- **what:** Because the loop reconstructs from history, a process death leaves tool calls stuck in 'streaming'/'running' and compactions stuck in 'running'. Both are repaired at the top of every drain, before any new work.
- **how:** Compaction orphans are queried by `json_extract(data,'$.status') = 'running'` ordered by seq DESC to match event projection order. Tool orphans are walked from store.context and published as Tool.Failed with an 'interrupted' error; subagent tool metadata carrying a child sessionID is echoed back so the model can find the child.
- **solves:** Without this, a crash permanently wedges a tool call — the provider's next request would be missing a required tool_result.
- **port effort:** low — but see finding #3: the tool half is O(history) on every drain, not just after a crash | **idea only:** True
## opencode.34 Sticky WebSocket session transport with affinity key and HTTP fallback

- **where:** packages/core/src/session/model-transport.ts:25-31 (constants), :57-59 (affinity), :40-58 (State/Channel); packages/core/src/session/model-request.ts:326-350 (wiring)
- **what:** Sessions on a websocket-capable model hold one socket. The affinity key is sha256 of the URL plus the sorted headers — so changing headers transparently reopens the socket. After 5 consecutive exchanges lost to the socket, the session falls back to HTTP permanently.
- **how:** ROTATE_AFTER_MS = 55 min, CONNECT_TIMEOUT = 15 s, IDLE_TIMEOUT = 30 min (comment: 'Reasoning models can stream nothing for several minutes while still working'), MAX_STREAM_FAILURES = 5. Only the durable runner may request the websocket (`webSocket?: "session"`). Effect `Metric.counter` for lifecycle events.
- **solves:** Removes per-request TCP/TLS setup and header-roundtrip latency for long agent turns, with a bounded failure path back to plain HTTP.
- **port effort:** high — full transport lifecycle; the affinity-key and fallback-after-N ideas are cheap | **idea only:** True
## opencode.35 CodeMode — tools exposed as a JavaScript API instead of a schema list

- **where:** packages/core/src/codemode/ (catalog.ts, tool.ts), packages/codemode/src/interpreter/interpreter.ts (2334 lines), packages/codemode/src/tool-runtime.ts (459); packages/core/src/tool.ts:234-262 (split into direct vs codemode tools)
- **what:** Instead of advertising every tool as a JSON schema, tools are rendered into a typed catalog the model calls from generated code. Tools opt out with `codemode: false` (the subagent tool does, subagent.ts:104). The model gets ONE 'execute' tool.
- **how:** Catalog rendering is CACHED across steps and invalidated by (registry revision + visible tool name set) — tool.ts:246-254. The interpreter is a hand-written JS engine with generators, promises, and a scope tracker (packages/codemode/src/interpreter/*, 5905 lines total).
- **solves:** Large tool catalogs blow the context window and degrade tool selection. Collapsing them into code-shaped calls reduces both.
- **port effort:** very high — 10.7k lines including a bespoke interpreter. Distinctive but a research project, not a port. | **idea only:** True
## opencode.36 Effect-TS as the runtime substrate for the whole core

- **where:** packages/core/src/session/runner/llm.ts:361-378 (node graph), packages/core/src/session/context.ts:185-205, packages/core/src/tool.ts:328-332, packages/core/src/session/execution.ts:181-185 (makeGlobalNode)
- **what:** Not a library choice in one file — the substrate. Services via Context.Service, errors via Schema.TaggedError, cancellation/interruption as a first-class channel distinct from failure, DI via a `makeLocationNode` graph. Location-scoped vs global-scoped services are an explicit split.
- **how:** The distinction between `Effect.interrupt` (user cancel) and typed failure is load-bearing throughout: user declines tunnel through as DEFECTS so tool code cannot catch them and turn a 'no' into model-visible output (tool/AGENTS.md:29), then resurface as typed failures at model-request.ts:358-374.
- **solves:** Interrupt-vs-fail separation is the single hardest thing to get right in an agent loop, and here it is a type-level guarantee rather than a convention.
- **port effort:** very high — this is a rewrite decision, not a port. Flagging because the whole layout depends on it. | **idea only:** False
## opencode.37 Unified command model — one declaration is simultaneously a keybind, a palette entry, and a slash command

- **where:** Declaration mechanism: `packages/tui/src/context/keymap.tsx` (469 lines, `createLayer` reducer splits commands into `named` vs `inline`; module augmentation adds `opencode`, `slash` to the OpenTui `Command` interface). Palette consumer: `packages/tui/src/component/command-palette.tsx` (66 lines). Example declarations: `packages/tui/src/app.tsx:711-1103` (19 slash commands), `packages/tui/src/routes/session/index.tsx:901-1219` (10).
- **what:** Every user action is a single `KeymapCommand` object carrying `id`, `title`, `description`, `group`, `bind`, `palette: true`, `slash: {name, aliases?, arguments?}`, and `run(input)`. One declaration produces: a keybinding (looked up by `id` in the keybind table), a command-palette row (if `palette: true`), and a `/slash` completion (if `slash` is set). The palette deliberately lists the same object with its live-resolved shortcut in the footer via `shortcuts.all(command.id)`.
- **how:** `Keymap.createLayer(() => ({ mode, commands, bindings }))` registers a layer. A command with an `id` is dispatched by name through `keymap.dispatchCommand(id)`; a command without an `id` must carry a literal `bind` string and is inlined as a raw binding. `slash: {name, aliases, arguments}` is optional metadata, and the same `run(input)` receives the argument text.
- **solves:** Eliminates the classic drift where a slash command, a palette entry, and a keyboard shortcut are maintained in three parallel tables and silently disagree. Also makes the palette a complete, auto-current index of every action — the help system becomes free.
- **port effort:** Medium. The idea ports cleanly. omp already has a keymap/command layer, so this is a refactor of the registration API (add `slash`/`palette` metadata to the existing command type and make the palette read from the same registry), not a rewrite. | **idea only:** True
## opencode.38 Keymap layering with explicit input modes (base / global / modal)

- **where:** `packages/tui/src/context/keymap.tsx` — `createMode` (mode stack), `createLayer` (mode assignment), `resolveInteractivity` (global non-interactive gate), plus `packages/tui/src/context/interactivity.tsx`.
- **what:** A layered keymap where each layer declares a `mode` ("base", "global", "modal") and an `enabled` predicate. `createMode` keeps a stack of `{id, mode, enabled}` and resolves the active mode via `stack().findLast(item => item.enabled())?.mode ?? "base"` — inactive scopes retain their stack position beneath newer modes. Server events dispatch commands scoped by directory (`event.on("tui.command.execute", ...)` guards on matching directory).
- **how:** A `MODE` key (`"opencode.mode"`) is published into the keymap via `keymap.setData`, and each layer registers `context.require(MODE.key, value)`. App-level layers declare `mode: "global"` for always-on bindings (app.tsx:1225-1251, six layers incl. one gated on `enabled: () => !sessionTabs.enabled()` and one gated on the prompt being empty).
- **solves:** Modal dialogs and full-screen overlays (diff viewer, session list, model picker) need to capture keys without the rest of the app reacting, and a timed leader sequence must not fire its suffix while a modal owns the keyboard. A declarative mode stack avoids ad-hoc enable/disable bookkeeping.
- **port effort:** Medium-high. Depends on the keymap library's layer/mode primitives. If omp's keymap is a flat dispatch table, this needs real work. | **idea only:** True
## opencode.39 Timed leader key as the primary chord namespace

- **where:** `packages/tui/src/config/keybind.ts:39` (`export const LeaderDefault = "ctrl+x"`), registration in `packages/tui/src/context/keymap.tsx` via `registerTimedLeader(keymap, {trigger, name: "leader", timeoutMs: config.leader?.timeout ?? 2000})`, and display formatting in `formatOptions()` which maps the leader token to its actual key.
- **what:** A single leader key (`ctrl+x` by default, `LeaderDefault`) starts a timed sequence; every chord binding is written `<leader>e`, `<leader>b`, `<leader>s` and rendered to the user as the resolved sequence. The timeout is user-configurable.
- **how:** `registerTimedLeader` from `@opentui/keymap/addons/opentui`; the leader binding is read from the keybind table (`config.keybinds.get("leader")?.[0]?.key`) so it is itself rebindable. 25+ chords are defined as `<leader>x` in the Definitions table.
- **solves:** Gives a large action surface without monopolizing unmodified single keys, and the leader is rebindable for users whose terminal intercepts `ctrl+x`.
- **port effort:** Low-medium if omp already has a chord/prefix system; the specific value is the *timeout + rebindable trigger + display rewriting* combination. | **idea only:** True
## opencode.40 Palette-as-discovery + deliberately minimal help dialog

- **where:** `packages/tui/src/ui/dialog-help.tsx` (whole file, 38 lines). Palette: `packages/tui/src/component/command-palette.tsx`. Reachability filter: `packages/tui/src/context/keymap.tsx` `useCommands()` -> `keymap.getCommandEntries({visibility: "reachable"})`.
- **what:** The help dialog is a 6-line stub that says only "Press {shortcut for command.palette.show} to see all available actions and commands in any context." There is no static keybinding reference screen. All discovery is delegated to the palette, which is context-aware: it queries the keymap for `visibility: "reachable"` commands, so only currently-available actions appear.
- **how:** `DialogSelect` receives options built from `commands().flatMap(...)`, skipping entries with no `id`, no `palette`, or `id === COMMAND_PALETTE_COMMAND` itself. When a filter is active (`ref?.filter`) the list is commands+settings only; when idle, entries flagged `suggested` (boolean or predicate) are hoisted into a "Suggested" category and the full list is appended below. Settings rows are merged into the same list via a `setting:<id>` value prefix. `searchText` = `id + description`; `searchFooter` = `group · shortcuts`.
- **solves:** A static help screen goes stale the moment a modal opens. A reachable-commands palette is always accurate, and the "Suggested" hoist gives new users a curated entry point without hiding the full surface.
- **port effort:** Low. This is a scoping decision more than code — the risk is that omp's palette is not yet wired to the live keymap. | **idea only:** True
## opencode.41 Settings UI as a pure projection of the typed config schema

- **where:** `packages/tui/src/component/dialog-config.tsx` (410 lines, `export const settings: Setting[]`); merged into the palette in `packages/tui/src/component/command-palette.tsx` (`settingOptions`, `settingID(setting)`, `dialog.replace(() => <DialogConfig current={...} />)`).
- **what:** 34 setting entries in 8 categories, each declared once as `{title, category, path[], default, values?, labels?, step?, min?, max?, format?, keywords?}`. The dialog is generic: it reads/writes `path` into the config object, offers `values` as a select, and uses `keywords` to make the row findable by search synonyms. The same rows are injected into the command palette with a `setting:` prefix so settings are searchable from one place.
- **how:** `values: [false, true]` + `labels: ["off", "on"]` gives booleans readable labels. `keywords` are extra search terms per row (e.g. the Sidebar row carries `["side panel"]`). The palette row's `onSelect` replaces the current dialog with DialogConfig scrolled to that setting, so the palette is a settings search box.
- **solves:** Adding a setting means one declaration, not a schema edit plus bespoke UI plus palette entry plus search synonyms. Also makes the settings surface greppable and countable.
- **port effort:** Low-medium. Very portable pattern; the main work is enumerating omp's existing config keys into this shape. | **idea only:** True
## opencode.42 Theme v2: semantic roles over hue ramps, with light/dark as an overlay

- **where:** Schema + resolver: `packages/theme/src/tui/` (schema.ts 302, resolve.ts 291, expand.ts 104, v1-migrate.ts 502, v1.ts, types.ts, color.ts, select.ts — 1592 LOC total). Reference v2 theme: `packages/tui/src/theme/assets/v2/opencode.json`. The 33 shipped v1 themes remain at `packages/tui/src/theme/assets/*.json`. Rule is written down in root `AGENTS.md` section "TUI Theme Tokens".
- **what:** The shipped themes moved from 51 flat named colors (each a `{dark, light}` pair) to a semantic-role system: 60 base leaves grouped as text / background / border / scrollbar / diff / syntax / markdown / categorical, where every value is a *reference* into a 9-step hue ramp (`$hue.neutral.200`, `$hue.accent.200`) rather than a literal. Light mode is expressed as an 86-leaf override document on top of the same base, so a theme author writes dark once and patches only what differs in light. Roles are state-qualified: `text.action.{primary,secondary,destructive}`, `text.formfield.*`, `text.feedback.{error,warning,success,info}` and the mirrored `background.*` set.
- **how:** `resolveThemeDocument(document, mode)` -> `selectThemeMode` picks the base+overlay for the mode, `expandTheme(selected.theme)` flattens `$hue.x.NNN` references and aliases (accent->orange, interactive->blue, neutral->gray), then resolves to `ResolvedThemeTokens`. `packages/theme/src/tui/v1-migrate.ts` (502 lines) converts the 51-role v1 shape forward, so all 33 existing themes keep working.
- **solves:** A flat palette forces components to pick colors by hue, so a theme author cannot restyle "destructive action" without touching every component. Semantic roles make themes composable, and the ramp reference system means a theme is ~60 references instead of ~102 literals. The light overlay removes the 2x authoring burden.
- **port effort:** Medium-high for the ramp/overlay engine; low for the semantic-role discipline. The discipline (and the written rule that components must not repurpose a nearby token) is the part worth stealing immediately; the resolver is a few hundred LOC. | **idea only:** True
## opencode.43 Named attention events driving both OS notifications and sound

- **where:** `packages/tui/src/attention.ts` (189 lines, `createTuiAttention`, `BUILTIN_SOUNDS` at line 38, `focusSkip`, `soundVolume`, `normalizeText` with 80/240-char title/message limits); event wiring in `packages/tui/src/feature-plugins/system/notifications.ts` (77 lines); event type in `packages/plugin/src/tui/context.ts:285`; config in `packages/tui/src/config/index.tsx` `attention` block.
- **what:** 6 semantic events — `default`, `question`, `permission`, `error`, `done`, `subagent_done` — each mapped to a sound file and gated by a `when` policy (always / focused / blurred) with per-call overrides. Notifications and sounds are decided independently (`sound: false` suppresses only the sound; `notification: {when:"blurred"}` suppresses only the desktop notification).
- **how:** `createTuiAttention({renderer, config, audio})` subscribes to renderer focus/blur to track `FocusState`, then `soundCandidates(name)` returns `[config.attention.sounds[name], BUILTIN_SOUNDS[name]]` so a user file override wins but the builtin is the fallback. The notifications plugin dedupes per-session with `Set`s (`errored`, `terminal`, `forms`, `permissions`) so a session that fails then ends notifies once with `error` + a toast, not twice. Subagent sessions get `notification: false` (sound only) so background agents do not spam desktop notifications.
- **solves:** "Notify me when the agent needs me" is the actual requirement; a binary on/off toggle cannot express "sound always, desktop popup only when I'm looking elsewhere, and never for subagents."
- **port effort:** Low. The event taxonomy plus the independent notification/sound gating is the reusable part; the audio playback backend is platform-specific. | **idea only:** True
## opencode.44 Plugin UI slots — a fixed set of named insertion points instead of a fork

- **where:** 11 `ui.slot()` call sites; 6 unique slot names. The 23 built-in feature plugins in `packages/tui/src/feature-plugins/` are themselves written as plugins (`Plugin.define({id, setup})`) — e.g. `feature-plugins/prompt/btw.tsx` renders a `/btw` spinner into `prompt.footer.status` and registers a global keymap layer for the `session.aside` command. Plugin API: `packages/tui/src/plugin/{api.tsx,context.tsx,builtins.ts,discovery.ts,render.tsx,structure.ts,watch.ts}`.
- **what:** TUI plugins extend the layout by appending renderables into 6 declared slots: `app`, `home.footer`, `prompt.footer`, `prompt.footer.status`, `sidebar.content`, `sidebar.footer`. Plugins can also add keymap layers, dialogs, and router targets.
- **how:** `context.ui.slot({append: "prompt.footer.status", render: () => <Show when={pending() > 0}>...</Show>})`. `<Slot path="app" />` sits inside the app root box (app.tsx:1386) so slot content renders inside the theme background.
- **solves:** Lets a feature ship as an add-on without forking the shell, and makes the extension surface small enough to document (6 names) and test.
- **port effort:** Medium. The slot-name discipline is the idea; the SolidJS plugin host is not portable, but a 6-slot registry is easy to add to any TUI. | **idea only:** True
