# opencode — chunk 3/6 (22 năng lực)

## opencode.45 Two-tier TUI: full screen TUI and a scrollback-native "mini" interface

- **where:** `packages/tui/src/mini/` — `runtime.ts` (orchestrator with a documented boot sequence), `scrollback.surface.ts` / `scrollback.writer.tsx` (append-only entry writer), `splash.ts` (307 lines, entry/exit banners), `footer.prompt.tsx` (1555), `footer.view.tsx` (1041). CLI wiring: `packages/cli/src/commands/handlers/mini.ts`. Config: the `mini` block in `packages/tui/src/config/index.tsx` (thinking, tools, shell_output, turn_summary, footer, splash, work_spinner, mono, replay, replay_limit).
- **what:** `opencode` opens the full screen TUI; `opencode mini` opens a structurally different interface (42 files, 18,231 LOC) built on immutable terminal scrollback entries rather than a re-rendered screen. It has its own footer system (split view/permission/subagent/command/menu segments), its own splash banners, its own verbosity and mono modes, and its own 10-key keymap layers.
- **how:** `entryWriter`, `turnSummaryWriter`, `spacerWriter` from `scrollback.writer.tsx` append committed rows; retained surfaces (markdown/code) stay streaming-stable and wait for image loads before their snapshot enters scrollback. `mini` has its own config namespace so the two interfaces can diverge without one breaking the other.
- **solves:** Append-only scrollback is what makes a transcript survive resize and lets the user scroll back natively with the terminal's own scrollback. A re-rendered screen cannot do that. Shipping both lets power users pick, and the split isolates the two rendering strategies.
- **port effort:** High to port wholesale; the *idea* of a second scrollback-native mode is cheap to evaluate, the 18K LOC is not. The `mini` config block pattern (independent presentation toggles per interface) is the cheap, high-value part. | **idea only:** True
## opencode.46 Session tabs as a first-class, resizable, scope-aware surface

- **where:** `packages/tui/src/component/session-tabs.tsx` (1779 lines), `session-tabs-rail.tsx` (94), `session-tabs-rail` handle in `packages/tui/src/ui/pane-resize-handle.tsx` + `pane-resize.ts`, state in `packages/tui/src/context/session-tabs.tsx` / `session-tabs-model.ts` / `session-retention.ts`. Config block `tabs` in `packages/tui/src/config/index.tsx` (mode auto/on/off, enabled legacy, scope global/cwd, layout horizontal/vertical, indicators status/numbers). Keybinds: 10 select slots, next/previous, next/previous_unread, close, reopen (ctrl+shift+t), history back/forward.
- **what:** Session tabs work as a horizontal strip or a vertical sidebar, with a drag-to-resize handle, per-tab unread markers, tab history (back/forward), quick-switch slots 1-10, pin, and a scope that can be global or per-working-directory.
- **how:** App root renders `<SessionTabs orientation="vertical" width={tabsResize.size()} />` beside the main column when `verticalTabsVisible()`, and `<SessionTabs />` above it when `tabsVisible() && !tabsVertical()`; a separate layer (app.tsx:1245) is gated on `sessionTabs.enabled` so tab bindings and pinned-session bindings are mutually exclusive. `PaneResizeHandle` is positioned at `tabsResize.size() - 1` on mouse drag.
- **solves:** Multi-session work is the normal case for a coding agent; a single-session screen forces context switching via the session list. Scope-aware tabs (global vs per-cwd) resolve the "my terminal tabs should follow my directory" tension.
- **port effort:** Medium. The interaction model (unread, history, quick slots, scope) is portable; the 1779-line component is not worth copying. | **idea only:** True
## opencode.47 Full-screen diff viewer with file tree, hunk navigation, and review marking

- **where:** `packages/tui/src/feature-plugins/system/diff-viewer.tsx` (1225), `diff-viewer-file-tree.tsx` (271), `diff-viewer-file-menu.tsx`, `diff-viewer-image.tsx`, `diff-viewer-file-tree-utils.ts`; `packages/tui/src/component/patch-diff.tsx` (228). Keybinds `diff.*` in `packages/tui/src/config/keybind.ts:63-84`; config block `diffs` in `packages/tui/src/config/index.tsx` (source, wrap word/none, tree, single, view auto/split/unified).
- **what:** A dedicated diff surface: 21 keybinds covering navigation (line/page/half-page, first/last, gg/G), hunk jumping (`]`/`[`), file jumping (`n`/`p`), split-vs-unified toggle (`v`), single-patch mode (`s`), source switch (`d`), file tree toggle (`b`), and per-file "mark reviewed" (`m`). A file menu, file tree, and image viewer are separate components.
- **how:** `/diff` slash command (diff-viewer.tsx:1184) opens it; `view: "auto"` picks split or unified from available width. `mark_reviewed` per file is the notable bit: it turns the diff into a review checklist rather than a read-only artifact.
- **solves:** Reviewing an agent's 20-file change inside a chat transcript is unusable. Split/unified + hunk/file navigation + a review checkbox is the vim-diff muscle memory, brought into the agent loop.
- **port effort:** Medium-high. The keymap vocabulary (21 bindings) and the `mark_reviewed` concept are the portable ideas. | **idea only:** True
## opencode.48 `/btw` — a side question that does not enter the conversation

- **where:** `packages/tui/src/feature-plugins/prompt/btw.tsx` (172 lines). Command id `session.aside`, keybind `<leader>`-less `"none"`, slash `/btw` with `arguments: true`, palette group "Session".
- **what:** A one-shot question answered from the session's existing context, whose answer is never added to the transcript. The whole command is 172 lines.
- **how:** Calls `session.generate` with a fixed instruction prefix: "The user is asking a quick side question about the conversation so far. Answer directly and concisely in markdown from what you already know. Do not call any tools and do not take any actions." (comment explains why: `session.generate` exposes the tools but runs no tool loop, so a tool call would surface as an empty answer). A spinner renders into `prompt.footer.status` while pending; the answer shows in a dialog with copy. Refuses with a toast if no session is open.
- **solves:** "What file does X live in?" is a question about the conversation, not a task. Without this, asking pollutes the transcript, spends a turn, and can derail the agent's plan.
- **port effort:** Low. ~150 LOC and one server call. High value per line. | **idea only:** True
## opencode.49 Background service lifecycle as a first-class CLI surface

- **where:** `packages/cli/src/commands/commands.ts` (`Spec.make("service", ...)`); handlers in `packages/cli/src/commands/handlers/service/`; connection resolution in `packages/cli/src/services/server-connection` (imported by `handlers/default.ts` and `handlers/mini.ts` as `ServerConnection.resolve({server, standalone, mismatch: "replace", onStart})`).
- **what:** `opencode service` manages a background server with 7 subcommands (start/restart/status/stop/get/set/unset) where `get`/`set`/`unset` operate on both service settings AND environment variables (nested `env-value` argument). `--standalone` runs a private server instead; `--server URL` attaches to an existing one. Version mismatch triggers an automatic restart with a preflight updater.
- **how:** `ServerConnection.resolve` yields a queue of `{reason: "missing" | "version-mismatch", previousVersion?}`; on mismatch the preflight starts the updater, writes "Restarting background server (version mismatch)..." to stderr, and forks the new version. `onStart` is the single hook every entrypoint (default TUI, mini, run) shares.
- **solves:** A coding agent that takes 2s to boot is unusable in a terminal loop. A persistent server makes startup instant, but then version skew, orphan processes, and "which server am I talking to" become real problems that need their own commands.
- **port effort:** Medium. The command surface and the shared resolve-with-mismatch policy are portable; the daemon implementation is substantial. | **idea only:** True
## opencode.50 Self-describing config with per-field descriptions that feed `--help` and the schema

- **where:** `packages/tui/src/config/index.tsx:66-246` (the `Info` struct). CLI: `packages/cli/src/commands/commands.ts` (532 lines). Project config schema: `packages/core/src/config.ts`; protocol config groups in `packages/protocol/src/groups/config.ts`.
- **what:** The TUI config is a single typed schema (17 top-level keys, 65 nested optional leaves) where every field carries `.annotate({description: "..."})`. The CLI command tree is likewise built from a typed `Spec` DSL (`Spec.make(name, {description, aliases, params})` with `Flag.withDescription` / `Argument.withDescription` / `Flag.withAlias`).
- **how:** Schema description annotations are the single source of truth; `TuiKeybind.KeybindOverrides` is itself generated from the `Definitions` table (`Object.entries(Definitions).map(([name, item]) => [name, Schema.optional(BindingValueSchema).annotate({description: item.description})])`), so every keybind in the help text is automatically in the config schema with its own description. `parse()` throws `Unrecognized keybind(s): ...` on unknown keys.
- **solves:** Config help that is written by hand drifts from the schema within a release. Deriving the schema from the same table that drives the help text makes drift structurally impossible.
- **port effort:** Low. The keybind-table-to-schema derivation alone is a small, high-leverage change. | **idea only:** True
## opencode.51 Declined bindings kept as schema no-ops for config backward compatibility

- **where:** `packages/tui/src/config/keybind.ts:78-84` — `diff.toggle`, `diff.expand`, `diff.expand_all`, `diff.collapse`, `diff.switch_focus` (all `"none"`, "Deprecated: file tree is mouse-controlled" / "keyboard navigation always controls the diff").
- **what:** Six `diff.*` bindings that were removed from the UI are retained in the Definitions table bound to `"none"` with explicit "Deprecated:" descriptions, under the comment "Retain shipped configuration names without registering the removed tree navigation commands." Because they remain schema keys, a user's existing `tui.json` still validates.
- **how:** Keeping the key with a `none` default means `parse()` accepts it, the settings UI can still show it, and no runtime binding is registered. Removing the key instead would make every existing user config fail validation on upgrade.
- **solves:** Renaming or removing a keybind silently breaks user configs on upgrade — a common source of "the app won't start after updating" reports.
- **port effort:** Very low. A convention, not code. | **idea only:** True
## opencode.52 Fixture-driven TUI storybook with state-dimension keybindings

- **where:** `packages/tui/src/feature-plugins/system/storybook/` — index.tsx, footer.tsx, one-cell-spinner.tsx, session-tabs.tsx, merman-layouts.tsx, location-missing.tsx, plus `.fixtures.ts` for one-cell-spinner and subcell-spinner. Run via `OPENCODE_STORY=<story-id> bun run dev:live`. Documented in root `AGENTS.md` sections "Live V2 TUI Testing" and "V2 TUI Stories".
- **what:** A built-in storybook inside the TUI itself, reachable as a plugin route, for exploring real components in isolation. Stories render the actual production component, expose meaningful state dimensions through story keybindings, list them in a `StoryFooter`, and provide a reset command.
- **how:** Stories register as plugin routes (`route.data.type === "plugin"` branch in app.tsx:1374 with a `PluginRouteMissing` fallback). `dev:live` discovers the running server via `opencode service status`, injects its credential from `opencode service get password`, and uses the `dev` TUI storage channel so tab state matches the installed client.
- **solves:** TUI layout bugs (narrow terminals, long paths, CJK width) are otherwise only reproducible by driving a live agent. A storybook with explicit state dimensions turns "resize until it breaks" into a repeatable command.
- **port effort:** Medium. The concept plus the `OPENCODE_STORY=<id>` entry point is cheap; the story fixtures are the labor. | **idea only:** True
## opencode.53 Deferred-binding declaration — actions registered without a key

- **where:** `packages/tui/src/config/keybind.ts` — `BindingValueSchema = Schema.Union([Schema.Literal(false), Schema.Literal("none"), BindingItem, Schema.Array(BindingItem)])`; 57 entries use `keybind("none", ...)`. Measured breakdown: 232 total, 57 none, 175 with a real default.
- **what:** 57 of the 232 keybinds default to `"none"`. These are real, dispatched commands with full descriptions that simply have no keyboard binding by default; they surface in the command palette and can be bound by the user. Examples: `help.show`, `session.fork`, `session.copy`, `prompt.stash`, `mcp.list`, `which-key.toggle`, `session.message.next`.
- **how:** `keybind` accepts `false` or `"none"` as valid values, and `createLayer` skips emitting a binding when `command.bind === false` or the resolved config value is empty. The palette still lists the command; `shortcuts.all(id)` returns empty so no key is displayed.
- **solves:** Forces an explicit decision per action (bind it or leave it palette-only) instead of an arbitrary default, and gives a clean "unbound" state that the palette renders honestly rather than showing a wrong key.
- **port effort:** Very low. A convention plus a `none` sentinel in the binding union. | **idea only:** True
## opencode.54 Custom slash commands from markdown files in the project

- **where:** `packages/core/src/command.ts` (106 lines — `Definition`, `Editor`, `NotFoundError`, `ExecutionError`, `Service` with `get`/`list`/`execute`); directory + document loading in `packages/core/src/config/plugin/command.ts` (250 lines, `loadEntry` dispatching on `entry.type === "document" | "directory"`, `ConfigMarkdown`); the on-disk convention is visible in the repo's own `.opencode/command/` directory. Sibling directories in `.opencode/`: `agent/`, `command/`, `glossary/`, `plugins/`, `skills/`, `themes/`, `tool/`.
- **what:** Users add `.md` files under a `command/` directory in their project config; each becomes a slash command with a name, description, and an execution that can shell out or invoke an agent. The command surface is a hot-reloadable service with typed NotFound/ExecutionError variants.
- **how:** A config entry is either a single `document` (one command from the file's frontmatter) or a `directory` (scanned, each file one command). `load` iterates all config entries, `reload` calls `ctx.command.reload()`. The reload feed is a single serialized trigger with one shared debounce window, subscribed before the initial scan so edits racing the scan still trigger a rebuild.
- **solves:** Lets a team encode repo-specific workflows (`/deploy-staging`, `/triage`) as files in version control, discoverable in the same palette and slash system as built-ins.
- **port effort:** Medium. The file convention and the service shape are portable; the template/handlebars execution layer is more involved. | **idea only:** True
## opencode.55 Agent Client Protocol server for editor integration

- **where:** `packages/cli/src/acp/` — 2131 LOC across service.ts (594), tool.ts (212), agent.ts, config-option.ts, connection.ts, content.ts, error.ts, event.ts, permission.ts. Registered as `Spec.make("acp", {description: "Start an Agent Client Protocol server"})` and handled by `packages/cli/src/commands/handlers/acp.ts`.
- **what:** `opencode acp` starts a server speaking the Agent Client Protocol, so the agent can be driven from an editor with session, tool, permission, and content negotiation handled for you.
- **how:** Imports request/response types from `@agentclientprotocol/sdk` 1.2.1 and adapts opencode's client/session/permission model to them, with `withTimestampedFallback` for session titles.
- **solves:** Editor integration is a per-editor protocol implementation; implementing ACP once means every ACP-capable editor works without bespoke work.
- **port effort:** High. Worth adopting the protocol as a target but not worth porting the adapter. | **idea only:** True
## opencode.56 Server-agnostic shell syntax highlighting via tree-sitter

- **where:** `packages/cli/package.json` dependencies: `tree-sitter-bash` 0.25.0, `tree-sitter-powershell` 0.25.10, `web-tree-sitter` 0.25.10. Consumed at `packages/tui/src/mini/scrollback.surface.ts` via `getTreeSitterClient` from `@opentui/core`; grammar wiring in `packages/tui/src/mini/parsers-config.ts`.
- **what:** Bash and PowerShell prompts are highlighted in the TUI using web-tree-sitter with the `tree-sitter-bash` and `tree-sitter-powershell` grammars, loaded through OpenTUI's tree-sitter client.
- **how:** `getTreeSitterClient` returns a `TreeSitterClient`; `entrySyntax` / `entryLook` in `mini/scrollback.shared.ts` select the highlight style for a rendered code block.
- **solves:** Shell output is the highest-volume, lowest-information part of an agent transcript. Proper syntax highlighting makes it skimmable instead of a wall of monospace.
- **port effort:** Low-medium. The grammar choice is a detail; the point is highlighting shell output at all. | **idea only:** True
## opencode.57 Replay-based registry substrate (State.create)

- **where:** packages/core/src/state.ts:160-252 (create), :58-75 (group/disable), :87-111 (batch/shutdown), :129-132 (inherit)
- **what:** State.create(options) is a generic registry where reads REBUILD by replaying every registered transform onto a fresh value from initial(), instead of mutating a shared structure. Scoped registrations remove themselves via Scope.addFinalizer; a rebuild is version-guarded and restarts if a transform triggers a nested change mid-rebuild. group() detaches all of one plugin's registrations synchronously when any of them throws during a rebuild.
- **how:** State.create({name, initial, editor, notify}). Returns {get, invalidate, revision, transform, reload}. transform() is an Effect that yields Scope.Scope, adds a finalizer, and bumps a version counter. get() loops: snapshot version -> initial() -> editor -> replay all transforms -> if version moved mid-loop, retry.
- **solves:** Makes arbitrary third-party transforms composable and order-independent in effect: plugin A can read what plugin B registered (docs index.mdx:122-127 says reads reflect every registration so far, including during setup), and disposal of one plugin's registration cleanly reveals the definition it was overriding, with no rollback bookkeeping.
- **port effort:** High. Requires restructuring omp's registries from mutation to replay. The payoff is the composability + safe-dispose semantics, which omp currently lacks everywhere. | **idea only:** True
## opencode.58 Content-addressed plugin activation with prefix preservation and fallback

- **where:** packages/core/src/plugin.ts:105-175 (activate), :250-263 (Slot/Activation types)
- **what:** The plugin registry's activate() diffs the requested ordered list against the running one on (id, revision). The first index where either differs is the cut point: everything before it stays alive (only its definition is refreshed), everything from it on has its Scope closed in reverse order and is reloaded. A slot whose previous activation FAILED and whose revision is UNCHANGED is carried forward without retry. If a new revision fails to load, the previous working generation is reloaded and stays active while the new error is recorded.
- **how:** const changed = definitions.findIndex((d,i) => current[i]?.plugin.id !== d.id || current[i].plugin.revision !== d.revision); const prefix = changed === -1 ? definitions.length : changed; then State.batch(...) closes slices(prefix).toReversed() and loads slices(prefix) in order.
- **solves:** Hot-reload without tearing down the world. Editing one plugin does not disturb the other 87; a broken edit degrades one slot instead of failing the generation. Solves the classic 'my reload broke the whole agent' problem with an index comparison rather than a diff algorithm.
- **port effort:** Medium. Needs a per-plugin revision token and ordered activation. The (id, revision) identity contract and the never-retry-a-failed-revision rule are the two ideas worth taking. | **idea only:** True
## opencode.59 Readiness latch so consumers never observe a torn registry

- **where:** packages/core/src/plugin/service.ts:13-16, :34; packages/core/src/plugin.ts:23-30 (holdUnsafe), :79-95 (activate)
- **what:** Plugin.Service exposes awaitActivation (a Latch) and hold() -> release. Every activation runs inside acquireUseRelease(hold(), ...). Session entry points await awaitActivation before reading commands/skills/hooks/model catalog.
- **how:** pending = Set<token>; hold() adds a token and closes the latch; the returned release deletes it and reopens when the set empties. awaitActivation = ready.await. The supervisor also takes a hold around a whole debounced re-activation.
- **solves:** A cold Location activates plugins asynchronously; without the gate an early request sees an empty registry and admits work the plugins would have shaped. The docstring at service.ts:29-33 says exactly this.
- **port effort:** Low. ~20 lines. Directly portable; omp has the same race whenever config reload is async. | **idea only:** True
## opencode.60 Per-plugin failure isolation across the whole registry

- **where:** packages/core/src/plugin.ts:39-63 (State.group wiring), :170-207 (pendingFailures worker), :281-300 (slotInfo)
- **what:** Two distinct failure paths, both isolated. (1) setup() fails -> the slot records the error, the generation survives, and the previous working generation is restored. (2) a transform throws LATER during a replay rebuild -> State.group() detaches all of that plugin's registrations synchronously, the registry queues a PendingFailure, and a dedicated worker closes the plugin's Scope and marks it disabled with 'Plugin disabled after {state}.transform failed'.
- **how:** load() wraps plugin.effect(...) in State.group((failure, refresh) => Queue.offerUnsafe(pendingFailures, {plugin, scope, failure, refresh, ref, release: holdUnsafe()})). A separate Effect.forever worker drains the queue, logs, re-runs refresh inside State.batch, publishes, and closes the scope via Effect.ensuring.
- **solves:** A plugin whose data becomes invalid at runtime (not just at load) cannot permanently poison the tool/model/command registries, and the plugin is reported as failed rather than silently contributing nothing.
- **port effort:** Medium. The idea of grouping a plugin's registrations so one bad transform disables exactly that plugin is the transferable part. | **idea only:** True
## opencode.61 Duplicate plugin ID degrades instead of killing the generation

- **where:** packages/core/src/plugin/supervisor.ts:96-110; guarded set at internal.ts:271-273; test at packages/core/test/plugin/supervisor.test.ts:80
- **what:** Registry.activate() dies on a duplicate ID, which would drop the whole generation including all 88 built-ins. The supervisor therefore pre-deduplicates: it keeps the first occurrence in boot order and reports later ones as ordinary 'failed' plugin entries with error 'Duplicate plugin ID: X'.
- **how:** const duplicate = (plugin, index) => ordered.findIndex((other) => other.id === plugin.id) !== index; return { plugins: ordered.filter((p,i) => !duplicate(p,i)), failures: [...failures, ...ordered.filter(duplicate).map(...)] }
- **solves:** A user installing a plugin whose ID collides with a built-in cannot brick the agent.
- **port effort:** Low. Small, high-value hardening. | **idea only:** False
## opencode.62 Config-string opt-out grammar with two hard-guarded IDs

- **where:** packages/core/src/config/plugin/source.ts:113-120 (parse), packages/core/src/plugin/supervisor.ts:26-27,38-45 (matches + guarded), packages/core/src/plugin/internal.ts:271-273; docs services/www/src/docs/content/plugins.mdx:68-82
- **what:** `plugins` entries are processed in order; a `-` prefix removes, `*` removes all, `prefix.*` removes by prefix, and a later bare ID re-enables. Two built-ins ignore removal so a repo cannot switch off org policy: opencode.config.policy and opencode.provider.opencode (the Console connection that delivers policy statements).
- **how:** const matches = (selector, target) => selector === '*' || (selector.endsWith('.*') ? target.startsWith(selector.slice(0,-1)) : selector === target); filter(!PluginInternal.guarded.has(plugin.id))
- **solves:** Lets a project neutralize built-ins it does not want (30 providers) with one config line, while making managed policy non-optional.
- **port effort:** Low. ~15 lines plus a guard list. omp has no equivalent per-internal opt-out. | **idea only:** True
## opencode.63 Pre/post activation layering so user config always wins

- **where:** packages/core/src/plugin/internal.ts:214-269, packages/core/src/plugin/supervisor.ts:138-152
- **what:** Built-ins activate in `pre` (infrastructure + all tools + all providers); every config adapter activates in `post`, after all user plugins. SDK- and instance-contributed plugins append to `pre` with the comment that later activation can override earlier container writes, so an instance's explicit choices beat globals.
- **how:** const ordered = [...pre.filter(enabled), ...packages.values().filter(enabled), ...post.filter(enabled)]
- **solves:** A user's opencode.json always overrides built-in defaults without the built-ins needing to know users exist.
- **port effort:** Low. Ordering discipline, not code. | **idea only:** True
## opencode.64 11 runtime hooks with a typed failure channel

- **where:** packages/plugin/src/promise/session.ts:138-151, packages/plugin/src/promise/tool.ts:38-72, packages/plugin/src/promise/permission.ts:18-24; impl packages/core/src/plugin/hooks.ts
- **what:** session.hook(name, cb, {providerID?}) covers prompt, context, compaction, generate, title, model.request, http.request, http.response, retry, and 3 experimental WebSocket hooks. Events are owned mutable drafts: set event.result to skip the model call entirely (compaction/title), mutate event.tools to remove tools, mutate event.request/response for native HTTP, and event.frame for WebSocket. tool.hook covers execute.before/after; permission.hook('evaluate') can change effect to allow/ask/deny; shell.hook('create.before') edits command/cwd/timeout/env.
- **how:** ModelHooks<Spec> = (name, cb, options?: {providerID?}) => Promise<Registration>. Provider scoping is implemented by a runtime filter in trigger() (hooks.ts:90) that reads event.model.providerID.
- **solves:** Covers the whole request lifecycle (admission -> assembly -> dispatch -> wire -> response -> retry) with one uniform registration shape, and lets a plugin REPLACE work (set result) rather than only observe it.
- **port effort:** High. The WebSocket frame hooks and the http.request/response pair are the ambitious parts; the retry-override hook and the execute.before failure channel are cheap and high value. | **idea only:** True
## opencode.65 Only one hook may reject, and it is the pre-execution one

- **where:** packages/core/src/plugin/hooks.ts:21-30, :88-95
- **what:** hooks.ts declares a per-domain failure channel via a mapped type. All are NoFailures<...> (never) except tool execute.before, which may fail with Tool.Error to reject the call before it runs. trigger() awaits each callback sequentially in registration order.
- **how:** type NoFailures<Spec> = { readonly [Name in keyof Spec]: never }; interface Failures extends Record<keyof Domains, unknown> { readonly tool: ToolFailures; ... }
- **solves:** Typing the blast radius of every hook at compile time: you cannot accidentally give a telemetry hook the power to abort a model request.
- **port effort:** Low. The type trick alone is ~10 lines and immediately clarifies a hook API's contract. | **idea only:** True
## opencode.66 Typed RPC: plugins publish methods and events other plugins/clients call

- **where:** packages/plugin/src/promise/rpc.ts, packages/plugin/src/effect/rpc.ts, packages/plugin/src/rpc.ts, adapter at packages/plugin/src/promise/adapter.ts:77-120; docs services/www/src/docs/content/build/plugins/rpc.mdx
- **what:** ctx.rpc.register(definition, handlers) publishes a typed method set plus an event channel. Definitions validate with JSON Schema or any Standard Schema validator (Zod/Valibot/ArkType). The plugin's package can export a separate ./rpc subpath so consumers import the contract WITHOUT loading the implementation.
- **how:** Rpc.define({id, methods: {name: {input, output, errors}}, events: {name: {schema}}}). Handlers receive (input, {signal, error}). RpcRegistration has dispose() and events.emit(). A ./rpc export map entry is a separate entrypoint, resolved independently by Host.resolve.
- **solves:** Lets plugins interoperate without sharing a package, and lets a consumer depend on a plugin's contract without pulling in its dependencies or side effects.
- **port effort:** High. Full RPC layer. The contract-only ./rpc subpath idea is cheap and worth stealing on its own. | **idea only:** True
