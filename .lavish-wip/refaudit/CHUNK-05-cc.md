# cc — chunk 5/6 (22 năng lực)

## cc.89 Tips registry that interpolates live shortcut text instead of hardcoding it

- **where:** src/services/tips/tipRegistry.ts (686 lines, 47 `id:` entries); help surface at src/components/HelpV2/{HelpV2,Commands,General}.tsx (222 lines total) and src/components/PromptInput/PromptInputHelpMenu.tsx.
- **what:** 47 tips, each calling `getShortcutDisplay('chat:cycleMode', 'Chat', 'shift+tab')` so the tip text automatically reflects the user's rebinding. Registry is 686 lines and data-driven.
- **how:** Tips are data with a function-valued shortcut field resolved at render time.
- **solves:** Onboarding text that hardcodes 'shift+tab' goes stale the moment the keymap is configurable.
- **port effort:** Low. Very cheap idea, high leverage once rebinding exists. | **idea only:** True
## cc.90 Multi-step wizard framework with pluggable step components and its own navigation footer

- **where:** src/components/wizard/ (6 files); src/components/agents/new-agent-creation/ (14 files incl. wizard-steps/); src/components/onboarding/; src/commands/onboarding/.
- **what:** A generic wizard runtime (WizardProvider, useWizard, WizardDialogLayout, WizardNavigationFooter) reused by both onboarding and a 12-step agent-creation flow (Color → Description → Generate → Location → Memory → Method → Model → Prompt → Tools → Type → Confirm).
- **how:** Step components are uniform units; the provider owns index/back/next/submit and the footer renders nav affordances once.
- **solves:** Without a runtime, each multi-step flow reimplements back/next/validation/scroll and the navigation chrome drifts.
- **port effort:** Low. Small React runtime, fully portable in concept. | **idea only:** True
## cc.91 Multi-emulator desktop notifications as a first-class hook

- **where:** src/hooks/notifs/ (16 files); renderer src/components/PromptInput/Notifications.tsx.
- **what:** Beyond the OSC hook: dedicated notification hooks for conditions the user must not miss (rate limit approaching, plugin auto-update available, settings file invalid, deprecation, MCP disconnected, model migration). 16 hooks, each deciding when a notification is warranted.
- **how:** One hook per condition, each pushing into the shared prioritized queue.
- **solves:** 'The agent silently stopped because of a 429' is the worst failure mode of a long-running CLI.
- **port effort:** Low. | **idea only:** True
## cc.92 A second full web client mirroring the TUI

- **where:** packages/remote-control-server/ (web/ + src/), exposed via the `/remote-control` (alias `/rc`) and `/remote-control-server` (alias `/rcs`) slash commands, both gated on feature('BRIDGE_MODE').
- **what:** packages/remote-control-server/web/ is a complete React chat client: chat/ (view, input, command menu, message bubbles, permission panel, plan view, session sidebar, tool-call groups), ai-elements/ (code block, conversation, message, permission request, prompt input, reasoning, shimmer, tool), a shadcn-style ui/ kit, a model selector with a popover, an ACP bridge (ACPConnect/ACPMain), and thread history — served by packages/remote-control-server/src/{routes,services,transport,auth}.
- **how:** The same session renders in a browser; permission requests surface as PermissionPanel and tool calls as ToolCallGroup, mirroring the TUI's concepts.
- **solves:** Long agent runs outlive a terminal window; a web client lets you watch and approve from a phone.
- **port effort:** High (a whole second frontend). The concept — one session model, two renderers — is the idea; the code is not portable. | **idea only:** True
## cc.93 Fullscreen/alternate-screen as an opt-in marker file requiring a shell-profile restart

- **where:** src/commands/tui/index.ts (marker path + the restart caveat, lines 10-25), panel.tsx; src/utils/fullscreen.ts; packages/@ant/ink/src/components/AlternateScreen.tsx (71 lines).
- **what:** /tui on writes ~/.claude/.tui-mode; the user must export CLAUDE_CODE_NO_FLICKER=1 from their shell profile because the env var cannot retroactively enter the alternate screen buffer — the Ink render tree is already mounted. isFullscreenEnvEnabled() also probes tmux control mode.
- **how:** Marker file + documented shell-profile snippet; the comment explains precisely why runtime activation is impossible rather than pretending otherwise.
- **solves:** Scrolling back through a long agent session in inline mode is unusable; alternate screen gives a real scrollback. The honest 'this needs a restart' note is itself the useful part.
- **port effort:** Low. Good UX-with-honesty pattern. | **idea only:** True
## cc.94 Slash command as a uniform type with lazy loading, hidden flag, availability gate, and aliases

- **where:** src/types/command.ts; src/commands.ts (854 lines, COMMANDS memoized array + loadAllCommands); src/utils/processUserInput/processSlashCommand.tsx (1212 lines); src/utils/suggestions/commandSuggestions.ts.
- **what:** One `Command` type covers local commands, prompt commands (the command synthesizes a prompt and re-enters the model), and resume entrypoints. Per-command `load: () => import('./x.js')` keeps the registry cheap — `/insights` is a 3113-line/110KB module behind a lazy shim in commands.ts. Fields include description, aliases, isHidden, availability (claude-ai | console), source (builtin|plugin|skill|workflow), progressMessage.
- **how:** A memoized array of Command objects assembled from builtin + bundled skills + skill-dir commands + plugin commands + named workflows; `meetsAvailabilityRequirement()` is deliberately NOT memoized because auth can change mid-session after /login.
- **solves:** Registering 127 commands naively costs startup time and leaks internal-only commands to external builds. The un-memoized availability re-check is a specific, correct catch.
- **port effort:** Low-medium. The type + registry pattern is portable; the lazy-import trick is standard. | **idea only:** True
## cc.95 Customizable statusline driven by user-supplied commands

- **where:** src/components/StatusLine.tsx, BuiltinStatusLine.tsx; src/commands/statusline.tsx; src/types/statusLine.ts; src/cost-tracker.ts; src/utils/context.ts (calculateContextPercentages, getContextWindowForModel).
- **what:** A StatusLine.tsx (587 lines) that can be fully replaced by user-defined shell commands (StatusLineCommandInput), pulling live data (total cost, duration, token counts, lines added/removed, context-window percentage, model name, effort, vim mode, permission mode, cwd, session id, IDE status). Ships a BuiltinStatusLine.tsx (128 lines) default.
- **how:** Status-line segments are hook-composed; a user command form runs an external program whose stdout is parsed into segments.
- **solves:** Fixed statuslines can't show what a given user cares about. Making it scriptable turns it into a general telemetry surface.
- **port effort:** Medium. The scriptable-segment idea is portable and cheap. | **idea only:** True
## cc.96 Reserved-shortcut protection with explicit user-facing errors

- **where:** src/keybindings/reservedShortcuts.ts; src/keybindings/validate.ts (checkReservedShortcuts, checkDuplicateKeysInJson, formatWarning(s)); src/components/KeybindingWarnings.tsx.
- **what:** ctrl+c and ctrl+d are declared in DEFAULT_BINDINGS so the resolver can find them, but validation refuses to let users rebind them — surfaced as an error in a dedicated KeybindingWarnings.tsx component and a settings:retry action.
- **how:** Reserved set checked during validateBindings before merging.
- **solves:** Without this a user can bind something that makes the TUI unquittable.
- **port effort:** Low. Cheap safety net any rebindable-keymap harness needs. | **idea only:** True
## cc.97 Platform- and terminal-capability-aware default bindings

- **where:** src/keybindings/defaultBindings.ts lines 12-30; packages/@ant/ink/src/core/terminal.ts (supportsExtendedKeys).
- **what:** Defaults are computed, not hardcoded: IMAGE_PASTE_KEY = alt+v on Windows (ctrl+v is the system paste) vs ctrl+v elsewhere; MODE_CYCLE_KEY falls back from shift+tab to meta+m on Windows-without-VT-mode, gated on whether the running runtime (Bun ≥1.2.23 / Node ≥22.17) enables VT mode. Kitty-protocol-only cmd+ bindings ship a portable ctrl+shift fallback.
- **how:** Capability detection at module load selects the binding; two bindings can map to the same action (ctrl+_ and ctrl+shift+- both → chat:undo) to cover legacy vs Kitty terminals.
- **solves:** Modifier-only chords like shift+tab are unreliable on Windows Terminal without VT mode; hardcoded defaults produce dead keys for a real segment of users.
- **port effort:** Low. Small but genuinely thoughtful; the dual-binding trick is directly reusable. | **idea only:** True
## cc.98 Self-hosted remote control as a first-class feature

- **where:** packages/remote-control-server/ (src/{routes,services,transport,auth,types} + web/); src/commands/{remoteControlServer,bridge}/; src/cli/handlers/; CLI subcommand `ssh <host> [dir]` in main.tsx; docs/features/remote-control-*.md.
- **what:** `/remote-control` (alias /rc) and `/remote-control-server` (alias /rcs) launch a self-hostable server with its own auth layer, transports, and a React web client; a dedicated `claude ssh <host> [dir]` subcommand forwards the session to a remote CLI.
- **how:** Server exposes a transport + auth; the CLI connects as a client; the browser renders the session.
- **solves:** Agent sessions need to be observable and steerable from outside the terminal.
- **port effort:** High. Feature, not pattern — but the transport/auth split is a reasonable decomposition to copy. | **idea only:** True
## cc.99 Escaped-paren permission rule parser with legacy tool-name aliasing

- **where:** src/utils/permissions/permissionRuleParser.ts:1-198, src/types/permissions.ts:1-40
- **what:** Rule strings of the form `ToolName(content)` are parsed into {toolName, ruleContent} by scanning for the first UNESCAPED `(` and last UNESCAPED `)`, where "escaped" means preceded by an odd number of backslashes. Content is unescaped paren-first-then-backslash (reverse of escape order). A legacy alias table maps renamed tools (Task->Agent, KillShell->TaskStop, AgentOutputTool/BashOutputTool->TaskOutput) so old persisted rules and hook references resolve to canonical names.
- **how:** Two hand-rolled scanners findFirstUnescapedChar/findLastUnescapedChar that count preceding backslashes and test parity. Malformed input (no closing paren, content after closing paren, empty toolName, `Bash()`, `Bash(*)`) all degrade to a bare tool-name rule rather than throwing.
- **solves:** Persisted permission rules contain arbitrary user text (shell commands, python snippets) that legitimately contain parentheses. Naive `indexOf('(')` splitting corrupts them and makes rules un-matchable after a round-trip through settings.json. The alias table separately keeps a settings file written by an older build from silently becoming a no-op after a tool rename.
- **port effort:** low — ~200 LOC, no deps beyond zod, pure functions, directly portable. | **idea only:** True
## cc.100 Three-way shell rule matcher (exact / legacy prefix / wildcard) with escape-safe wildcard compilation

- **where:** src/utils/permissions/shellRuleMatching.ts:1-228
- **what:** A discriminated union `ShellPermissionRule = {type:'exact'|'prefix'|'wildcard'}`. `:*` is legacy prefix syntax; a `*` that is not part of a trailing `:*` and is not backslash-escaped (odd-backslash test) makes it a wildcard. Wildcards compile to a full-string anchored RegExp with `s` (dotAll) so they match newlines, and null-byte placeholders stand in for escaped `\*` and `\\` so the escaping pass cannot be confused by the placeholder text itself.
- **how:** Pattern is scanned char-by-char; `\*` and `\\` become module-level \x00 sentinels, remaining regex metacharacters are escaped, remaining unescaped `*` become `.*`, then sentinels are restored as regex literals. A special case makes a trailing `' *'` optional when it is the only unescaped star, so `git *` matches both `git add` and bare `git`, aligning wildcard semantics with legacy `git:*` prefix rules.
- **solves:** Users write Bash allow-rules as natural globs. Naive `*`->`.*` conversion turns `Bash(echo \\*)` into a rule that matches every echo, silently widening a narrow allow-rule into a blanket one. The dotAll flag is separately needed because a multi-line heredoc command is split before rule matching.
- **port effort:** low — ~230 LOC, pure, no I/O. | **idea only:** True
## cc.101 Bypass-immune safety checks layered above hook and bypass-mode decisions

- **where:** src/utils/permissions/permissions.ts:1092-1290 (checkRuleBasedPermissions, hasPermissionsToUseToolInner)
- **what:** A fixed evaluation ladder runs on every tool call: 1a tool-wide deny, 1b tool-wide ask, 1c `tool.checkPermissions`, 1d tool-implemented deny, 1e `requiresUserInteraction`, 1f content-specific ask, 1g safetyCheck, then 2a mode bypass. Deny rules and content-specific ask rules are honoured even in `bypassPermissions` mode, and step 1g (sensitive paths: .git/, .claude/, .vscode/, shell configs) is explicitly re-asserted AFTER the tool result so it cannot be overridden by a PreToolUse hook that returned allow.
- **how:** Each step narrows on `behavior` and then on the `decisionReason` discriminant (`type:'rule'` with `ruleBehavior:'ask'`, or `type:'safetyCheck'`). The decision reason union (src/types/permissions.ts) carries rule/mode/hook/sandboxOverride/classifier/safetyCheck variants so callers can tell WHY a prompt appeared.
- **solves:** Hooks and bypass mode are both "user said it's fine" signals, but a project-scoped `.claude/settings.json` can register a PreToolUse hook that returns allow — and project settings are committed to git and shared. Without a bypass-immune tier, a hostile repo can auto-approve writes to its own `.claude/` directory and persist itself.
- **port effort:** medium — the ladder itself is ~200 LOC but depends on the whole decision-reason type union and per-tool `checkPermissions` contract. | **idea only:** True
## cc.102 Shadowed-rule detection that reports unreachable allow rules with an actionable fix

- **where:** src/utils/permissions/shadowedRuleDetection.ts:1-234
- **what:** `detectUnreachableRules(context, {sandboxAutoAllowEnabled})` walks allow rules and flags any that can never fire: a specific allow rule (`Bash(ls:*)`) shadowed by a tool-wide deny (severity: fully blocked) or a tool-wide ask (severity: always prompts). Deny is checked first and short-circuits. Each finding carries the shadowing rule, its source, a human reason, and a generated fix string.
- **how:** `isSharedSettingSource()` partitions sources into shared (projectSettings, policySettings, command) vs personal (userSettings, localSettings, cliArg, session, flagSettings). The Bash sandbox exception is keyed on the ASK rule's source, not the allow rule's: a personal-settings ask rule is not reported as shadowing when sandbox auto-allow is on (the user's own sandbox will allow it), but a shared-settings ask rule always is, because teammates may not have the sandbox enabled.
- **solves:** Permission configs accumulate silently-dead rules as tools get renamed and modes get added. The user believes `Bash(ls:*)` is allowing `ls`; a tool-wide ask means they are actually prompted every time. The shared-vs-personal split is the non-obvious part: without it the checker produces false positives whenever sandboxing is on.
- **port effort:** low — ~230 LOC, pure over an existing context object. | **idea only:** True
## cc.103 SSRF guard implemented as a DNS lookup hook, not a pre-flight check

- **where:** src/utils/hooks/ssrfGuard.ts:1-294, wired at src/utils/hooks/execHttpHook.ts:10,217
- **what:** `ssrfGuardedLookup(hostname, options, callback)` is passed as axios's `lookup` option, so the IP that was validated is the IP the socket connects to. IP literals are validated without DNS. Hostnames resolve with `all:true` and are rejected if ANY returned address is in a blocked range. IPv4-mapped IPv6 is expanded to its embedded v4 and re-checked, so `::ffff:a9fe:a9fe` cannot be used to reach 169.254.169.254.
- **how:** Blocked: 0/8, 10/8, 100.64/10 (CGNAT, Alibaba 100.100.100.200), 169.254/16, 172.16/12, 192.168/16, ::, fc00::/7, fe80::/10, ::ffff:<blocked v4>. Loopback 127/8 and ::1 are deliberately ALLOWED because local dev policy servers are a primary use case. `expandIPv6Groups` normalises `::`, trailing dotted-decimal, and hex-group forms to 8 numeric groups. The caller pairs it with `maxRedirects: 0` and `validateStatus: () => true`, closing the redirect-hop bypass.
- **solves:** Project-configured HTTP hooks (a repo can ship `.claude/settings.json` with hooks) would otherwise let a cloned repository read the cloud instance metadata endpoint. A separate pre-flight DNS check would leave a TOCTOU rebinding window; doing it inside `lookup` closes it.
- **port effort:** low — ~290 LOC, pure, only needs an axios-compatible `lookup` signature. | **idea only:** True
## cc.104 Six-layer settings cascade with a four-tier first-source-wins enterprise policy branch

- **where:** src/utils/settings/constants.ts:1-202, src/utils/settings/settings.ts:645-760, src/bootstrap/state.ts:308-313
- **what:** Merged in order: plugin base (lowest) -> userSettings -> projectSettings -> localSettings -> flagSettings -> policySettings (highest), with policySettings and flagSettings always included regardless of the `--setting-sources` allowlist. The policySettings branch does NOT merge — it picks ONE winner by precedence: remote managed settings > MDM (HKLM / macOS plist) > managed-settings.json + managed-settings.d/ > HKCU. A file path seen from two sources is loaded once (seenFiles), and parse errors are deduplicated by `file:path:message` (seenErrors).
- **how:** `loadSettingsFromDisk` guards recursion with an `isLoadingSettings` flag, merges via lodash `mergeWith` + a `settingsMergeCustomizer`, and caches per-source and per-path. `--setting-sources user,project,local` narrows the file-based layers via `parseSettingSourcesFlag`, which rejects any other name.
- **solves:** Enterprise management needs MDM policy that a user cannot override, while plugins and flags need a defined position. Doing "first source wins" inside the policy branch (rather than deep-merging all four policy layers) prevents a user-writable HKCU entry from shadowing an admin plist.
- **port effort:** medium — the cascade shape is trivial, but the MDM tiering (HKLM/plist/HKCU, managed-settings.d) is platform-specific and carries most of the weight. | **idea only:** True
## cc.105 Single-invalidation settings cache (session + per-source + per-path)

- **where:** src/utils/settings/settingsCache.ts:1-80
- **what:** Three cache layers with one `resetSettingsCache()`: a merged sessionSettingsCache, a per-source Map, and a path-keyed parsed-file Map. The path-keyed layer exists because `getSettingsForSource` and `loadSettingsFromDisk` both call `parseSettingsFile` on the same paths during startup, so the disk read + zod parse is done once. `getCachedSettingsForSource` distinguishes cache MISS (undefined) from a cached "this source has no settings" (null).
- **how:** `resetSettingsCache()` clears all three and is called from the same triggers: settings write, --add-dir, plugin init, hooks refresh. A separate `pluginSettingsBase` holds the plugin layer for the cascade.
- **solves:** Settings are read on hot paths (permission checks, hook dispatch, every tool call). Re-parsing and re-validating five files per call is the obvious cost, and a partial invalidation scheme is where config bugs live. One clear-all function with a fixed call-site list is a deliberate simplicity-over-fine-grained-invalidation trade.
- **port effort:** low — ~80 LOC, no deps. | **idea only:** True
## cc.106 Daemon supervisor with crash-rate parking and permanent/transient exit-code contract

- **where:** src/daemon/main.ts:1-428, src/daemon/workerRegistry.ts:1-112, src/daemon/state.ts:1-157
- **what:** `runSupervisor` spawns worker child processes, restarts them with backoff, and parks a worker after 5 failures that each occurred within 10s of start (`MAX_RAPID_FAILURES`). Workers signal class via exit code: 78 (EX_CONFIG from sysexits.h) for permanent errors that must not be retried (trust not accepted, no git repo for worktree), 1 for transient. Workers receive all config through `DAEMON_WORKER_*` env vars and shut down on SIGTERM/SIGINT via an AbortController.
- **how:** `stopDaemonByPid` sends SIGTERM, polls liveness every 200ms up to a 10s deadline, then SIGKILLs and waits 500ms, cleaning the state file in every exit path. `queryDaemonStatus` reports running/stopped/stale and auto-removes stale files.
- **solves:** A long-running headless bridge that crashes on a missing trust prompt would otherwise spin in a tight restart loop forever. Splitting exit codes lets the supervisor distinguish "retry me" from "a human has to fix configuration", which is the difference between a bounded log and a fork bomb.
- **port effort:** medium — the exit-code contract and the backoff/parking loop port directly; the liveness and locking mechanisms do not (see findings). | **idea only:** True
## cc.107 File-descriptor secret ingress with a locked-down disk fallback

- **where:** src/utils/authFileDescriptor.ts:1-196
- **what:** Tokens arrive over an inherited file descriptor (`getApiKeyFromFd` / `getOauthTokenFromFd`) and are never written to disk by default. A separate, explicitly-gated fallback persists them for subprocesses under CCR only: the function returns immediately unless `CLAUDE_CODE_REMOTE` is truthy, then creates the directory with `mode: 0o700` and the file with `mode: 0o600`. Failures are non-fatal and logged at debug level.
- **how:** `readTokenFromWellKnownFile` treats file-not-found as 'no fallback available' rather than an error, because the path only exists inside the CCR container. The module documents why the fallback is needed at all: pipe file descriptors do not cross tmux/shell boundaries, so a subprocess cannot inherit the token.
- **solves:** Tokens normally end up in argv (visible via `ps`) or in a world-readable env dump. FD passing keeps them off both. The interesting part is the explicit env gate plus restrictive modes on the one path that must hit disk.
- **port effort:** low — the pattern is platform-agnostic; only the CCR paths are specific. | **idea only:** True
## cc.108 Per-sink analytics killswitch that fails open by design

- **where:** src/services/analytics/sinkKillswitch.ts:1-25
- **what:** `isSinkKilled(sink)` reads a GrowthBook JSON config (`tengu_frond_boric`, shape `{datadog?: boolean, firstParty?: boolean}`) and returns true only on an exact `=== true`. Default is `{}` — missing or malformed config leaves the sink ON. The comment explicitly forbids calling it from inside `is1PEventLoggingEnabled()` because growthbook.ts calls that, so a lookup would recurse.
- **how:** Consumed at per-event dispatch sites, not at init, which is what avoids the recursion. The `=== true` test plus a documented `getFeatureValue_CACHED_MAY_BE_STALE` quirk (it guards on `!== undefined`, so a cached JSON `null` leaks through instead of falling back to `{}`) is why the optional-chained `config?.[sink]` is load-bearing.
- **solves:** Telemetry needs an independent kill switch per destination so one bad sink can be disabled in an incident without an app release, and so a config fetch failure does not silently disable all telemetry (or, conversely, does not silently re-enable a killed sink).
- **port effort:** low — ~25 LOC, but needs a remote-config client underneath. | **idea only:** True
## cc.109 Error taxonomy with errno/axios classifiers and a short stack for model-facing errors

- **where:** src/utils/errors.ts:1-238
- **what:** `errors.ts` provides a small typed vocabulary: `ClaudeError` base, `AbortError`, `ConfigParseError`, `ShellError`, `TeleportOperationError`, and helpers `toError`/`errorMessage`/`getErrnoCode`/`isENOENT`/`getErrnoPath`/`hasExactErrorMessage`. `isFsInaccessible` treats ENOENT/EACCES/EPERM/ENOTDIR/ELOOP uniformly as 'expected nothing-there', which lets catch sites distinguish that from a real fault without a five-way switch. `classifyAxiosError` normalizes network failures. `shortErrorStack(e, maxFrames=5)` trims a stack to header plus 5 frames for delivery to the model, keeping the full stack in debug logs.
- **how:** The errno accessors replace the `(e as NodeJS.ErrnoException).code as string` cast pattern repo-wide, and `isAbortError` / rethrow-if-AbortError inside permission checks stops user cancellation from being logged as a failure.
- **solves:** Agent tool results flow into the model context, where a 2000-char stack of internal frames is pure token waste. Truncating at the tool-result boundary and keeping full detail in the debug log separates the two consumers. `TelemetrySafeError` is the opt-in mechanism for the same split on the telemetry path.
- **port effort:** low — ~240 LOC, no deps. | **idea only:** True
## cc.110 Sandbox config adapter that converts permission rules into OS-level restrictions

- **where:** src/utils/sandbox/sandbox-adapter.ts:99-680, src/utils/sandbox/sandbox-adapter.ts:881-985 (ISandboxManager)
- **what:** `convertToSandboxRuntimeConfig(settings)` translates the permission model into the external runtime's config: WebFetch `domain:` rules become network allow/deny lists; Edit/Read rules become filesystem allow/deny paths. It unconditionally adds every settings.json path and the managed drop-in directory to `denyWrite` (to prevent sandbox escape by rewriting one's own permissions), plus `.claude/skills` in both original and current cwd. Worktrees get their main repo path added to `allowWrite` so `index.lock` works.
- **how:** The bare-git-repo case is handled with a documented threat model: git's `is_git_directory()` treats a cwd holding HEAD + objects/ + refs/ as a bare repo, so an attacker planting those plus a `core.fsmonitor` config escapes the sandbox when unsandboxed git runs. Denying the path outright would make the runtime mount /dev/null at non-existent paths, leaving a 0-byte HEAD stub and breaking `git log HEAD`. So existing files get ro-bind denyWrite, and non-existent ones are collected into `bareGitRepoScrubPaths` for post-command scrubbing. `allowManagedSandboxDomainsOnly()` restricts network domains to policySettings only.
- **solves:** The general problem is that a sandbox is only as strong as the weakest path to write state that a later unsandboxed process reads. The `.claude/skills` and bare-git-repo cases both come from that shape — self-modifying config that survives the sandbox and gets honoured on the next call.
- **port effort:** high — the reasoning ports, the implementation depends entirely on the external runtime's config schema and its OS-specific backends. | **idea only:** True
