# Năng lực đo được — `pi` — 110 mục

earendil-works/pi — omp MUST CONTAIN this (MIT). 12 npm workspaces.

Nguồn: 6 lens (structure, agent-core, plugin, surface, integration, ops); mọi con số đo bằng lệnh thật.
`idea only=true` = KHÔNG được chép code, chỉ mang ý tưởng.
`port effort` là ước lượng của người kiểm kê, KHÔNG phải số đo.

## pi.1 Entry-point graph cost budget

- **where:** scripts/check-entry-graphs.mjs (5.3KB, 130 lines) — BUDGETS table at lines ~30-43; wired into root package.json `check` script as `npm run check:entry-graphs`
- **what:** A CI gate that walks the value-import graph reachable from every budgeted `exports` entry and fails the build if it exceeds a declared maxFiles or reaches a `forbid`den path pattern. Only value imports count — `import type` is excluded because it is erased before Node sees it.
- **how:** SPEC regex at line 44 matches import/export-from specifiers while excluding `type`; `walk()` BFS from an entry source file, following relative and cross-workspace specifiers via the WORKSPACE resolver map; `sourceFor()` maps an exports-map `./dist/x.js` back to `src/x.ts`; `expand()` handles `*` wildcard exports by enumerating the directory. Hard-fails if a BUDGETS entry has no matching declared export.
- **solves:** Makes a package's public entry surface an enforced cost contract instead of an accident. The header states the motivating failure: one stray `export *` in a barrel made a 1-file pure-function import evaluate a ~37 MB module graph, and nothing failed until someone measured a process. Turns a performance regression into a commit-time failure.
- **port effort:** SMALL — self-contained single file, no deps beyond node:fs/path/url, and it reads the existing package.json exports maps rather than requiring new config. Directly liftable to omp. | **idea only:** False

## pi.2 Six custom dependency- and packaging-invariant gates

- **where:** scripts/check-pinned-deps.mjs, check-runtime-deps.mjs, check-ts-relative-imports.mjs, check-entry-graphs.mjs, generate-coding-agent-shrinkwrap.mjs --check, generate-coding-agent-install-lock.mjs --check; invoked from root package.json `check`
- **what:** Beyond typecheck and lint, the repo enforces six bespoke structural invariants in `npm run check`: pinned deps, runtime-dep hygiene, TS relative-import form, entry-graph budgets, shrinkwrap freshness, and install-lock freshness.
- **how:** Each is a standalone node: script run with --check semantics (regenerate-and-diff) or as a lint over the tree; check-runtime-deps and coding-agent-consumer have their own .test.mjs siblings.
- **solves:** Keeps a 13-package publishable monorepo internally consistent — catches an unpinned transitive dep, a runtime dep declared in the wrong place, a shrinkwrap that has drifted from the manifest, or an import that would drag a heavy graph — none of which tsc or biome catches.
- **port effort:** MEDIUM — the two shrinkwrap/install-lock generators encode pi's exact packaging layout and would not transfer; the pinned-deps, runtime-deps and ts-imports checks are portable with moderate rewrite. | **idea only:** True

## pi.3 Strict layered workspace DAG with leaves that have zero internal dependencies

- **where:** root package.json workspaces globs; measured import edges: ai→telemetry; protocol→chord; durable→chord,ai; agent→chord,ai,telemetry; client→chord,protocol; server→chord,agent,protocol; session-backends/sqlite-node→agent,ai; coding-agent→chord,agent,ai,client,protocol,server,tui
- **what:** 13 workspaces arranged in a clean DAG where chord, tui and telemetry are true leaves, letting the build and the port both proceed bottom-up with no back-edges.
- **how:** npm workspaces (`packages/*`, `packages/session-backends/*`); every cross-package reference uses the @earendil-works/* specifier resolved through tsconfig `paths` to source during dev and to dist at publish.
- **solves:** Makes package extraction and independent versioning possible, and gives a port an unambiguous order. Because three packages have no internal edges, they can be lifted in isolation before anything that depends on them.
- **port effort:** STRUCTURAL — the DAG is the port plan. Leaf-first order: chord (8,611L) → tui (18,769L) → telemetry (935L) → ai (25,407L) → durable (9,024L) → agent (33,517L) → protocol → client → server → session-backends → coding-agent (75,284L). | **idea only:** False

## pi.4 Lazy-loaded provider transports

- **where:** packages/ai/src/api/lazy.ts (3.1KB) + 13 sibling .lazy.ts shims (anthropic-messages, azure-openai-responses, bedrock-converse-stream, google-generative-ai, google-vertex, mistral-conversations, openai-codex-responses, openai-completions, openai-responses, openrouter-images, pi-messages, typesafe-system-one, cloudflare-workers-ai-system-one)
- **what:** Every heavyweight LLM provider adapter ships as a pair: the full implementation plus a tiny `.lazy.ts` shim loaded through a shared dynamic loader, so a process only pays for the provider it actually calls.
- **how:** Each shim is 185-1100 bytes and defers to lazy.ts; the ai package also declares `./api/*` as a wildcard export so entries stay individually importable.
- **solves:** Keeps CLI cold-start and bundle size proportional to the provider in use rather than to the number of providers supported. The largest adapter (openai-completions.ts, 62KB) costs nothing unless called.
- **port effort:** MEDIUM — the mechanism is small and self-contained, but it interacts with the entry-graph budget (each lazy boundary is a measurable graph cut), so the two must be ported together. | **idea only:** True

## pi.5 Multi-protocol provider transport matrix including first-class Codex support

- **where:** packages/ai/src/api/ (37 files / 12,183L) + packages/ai/src/providers/ (92 descriptor files / 2,842L) + packages/ai/src/auth/ (17 files / 3,786L)
- **what:** Sixteen distinct provider wire protocols, not one OpenAI-compatible shim — including a dedicated 54KB Codex Responses transport, Bedrock Converse streaming, Mistral Conversations, Google Vertex and Generative AI, Azure OpenAI Responses, Cloudflare Workers AI, and an images-specific path.
- **how:** One module per protocol; shared helpers factored into google-shared.ts (18KB), openai-responses-shared.ts (30KB), system-one-shared.ts, transform-messages.ts. Coverage is backed by a dedicated 2,696-line openai-codex-stream.test.ts.
- **solves:** Protocol fidelity where a generic OpenAI-compat layer would silently misbehave — thinking/reasoning blocks, service-tier pricing, prompt caching, and streaming event shapes all differ per provider.
- **port effort:** LARGE — 12,183L of protocol code, each carrying subtle wire quirks. Port per protocol, prioritizing by omp's actual provider mix; the Codex transport alone is a multi-week item with its own 2,696L test suite to port alongside. | **idea only:** False

## pi.6 Session harness with a reducer/checkpoint/recovery runtime

- **where:** packages/agent/src/harness/runtime/ (21 files / 7,473L) — largest file in the whole agent package
- **what:** A durable agent-session runtime: an explicit lane abstraction (2,012L), a pure reducer, a drive/ phase split (structural, tools, response, generation, tool-placement, deferred, boundary, checkpoint, reconcile, recovery, terminal, retry), and restore/transcript handling.
- **how:** drive.ts is a 106-line orchestrator delegating to eleven focused sub-modules; the reducer keeps state transitions pure and separate from I/O so checkpoints and restore are replayable.
- **solves:** Makes an agent session resumable, checkpointable and recoverable — the substrate for anything that must survive a crash, a compaction, or a handoff between processes.
- **port effort:** LARGE — 7,473L of subtle state-machine code, and the single largest file in the repo's second-largest package. This is the core of the "harness" the brief calls out; expect it to dominate the port budget. | **idea only:** False

## pi.7 Pico3 session engine with scheduler, membranes and bounded context

- **where:** packages/agent/src/harness/pico3/ (25 files / 8,074L): session.ts 1498, types.ts 1038, harness.ts 812, scheduler.ts 486, view.ts 470, jsonl.ts 339, memory.ts 278, membrane.ts 123, bounded.ts 100
- **what:** A second, newer session engine layered on typed session records, a scheduler, a scheduler-driven view, memory, a JSONL codec, an explicit membrane (boundary) type, and a `bounded.ts` context-budget primitive — with plugin/task-api/collapse/frames kind modules.
- **how:** Exported publicly as `@earendil-works/pi-agent-core/experimental/pico3`; JSONL is the durable encoding (kinds/frames.ts, jsonl.ts), and a test/harness/jsonl-v3-migration.test.ts (2,013L) covers format migration.
- **solves:** Gives the agent a durable, typed, inspectable session format with an explicit scheduling model and an enforced context bound — the machinery behind compaction, handoff, and multi-lane orchestration.
- **port effort:** LARGE — 8,074L. Note the repo carries THREE generations of this design (pico docs, pico2, pico3, and durable/docs/pico-v5), so a port must pick a generation deliberately rather than porting all of it. | **idea only:** False

## pi.8 Architecture documentation shipped as the design contract

- **where:** packages/agent/docs/harness.md (1,468L / 211KB), docs/pico/pico-handoff-v2.md (2,937L / 231KB), pico-simple-handoff.md 2,654L, pico-v3.md 2,577L, docs/pico2.md 2,491L, packages/durable/docs/pico-v5.md 2,437L, docs/plugins.md 1,166L, docs/values.md 735L
- **what:** ~20,000 lines of prose that specifies the harness, the pico lineage, plugins, and typed values — enough to implement from without reading code, and carrying an explicit version lineage.
- **how:** Markdown living beside the code it describes, under three docs/ roots (agent, coding-agent, durable).
- **solves:** Turns the port from archaeology into specification — the docs encode intent, invariants and migration paths that the code alone does not state.
- **port effort:** ZERO COST TO READ, high value — but see the finding: the docs describe several competing pico generations, so read them to pick a target rather than to lift a spec verbatim. | **idea only:** True

## pi.9 Example extensions as an executable capability catalog

- **where:** packages/coding-agent/examples/extensions/; notably subagent/ (agents.ts + 4 role .md agents: planner, reviewer, scout, worker + 3 prompt .md) and plan-mode/ (index.ts, utils.ts, README.md)
- **what:** 73 runnable extension examples plus 9 example subprojects (85 files / 14,461L) covering subagents, plan mode, sandboxing, custom providers, permissions, git workflows, and UI widgets — each a self-contained recipe.
- **how:** Each example is a .ts entry that a jiti-loaded extension system picks up; five of them (with-deps, custom-provider-anthropic, custom-provider-gitlab-duo, sandbox, gondolin) are declared as npm workspaces so their external deps actually install and typecheck.
- **solves:** Documents the extension surface by demonstration rather than by prose, and — because five examples are real workspaces — keeps the documented patterns compiling under CI, so they cannot silently rot.
- **port effort:** SMALL per example (most are 1-6KB) — this is the cheapest high-value port target, especially subagent/ which maps directly onto omp's existing subagent feature. | **idea only:** False

## pi.10 Pluggable session storage behind a sub-monorepo seam

- **where:** packages/session-backends/sqlite-node/ — 21 files / 4,126L (src/sqlite/session/{values,usage-ledger}.ts, test/, benchmark/{session-repo.bench.ts,storage.bench.ts,*-targets.ts}, scripts/copy-migrations.mjs)
- **what:** Session persistence is factored into its own npm-workspaces sub-monorepo with a backend-neutral interface, a conformance test suite, and a benchmark harness, so alternative storage engines plug in without touching the agent.
- **how:** src/index.ts (3.6KB) is the backend contract; the peer package pi-durable provides a storage-conformance.ts (1,520L) shared test suite so any backend must prove the same behaviour.
- **solves:** Decouples the session format from the storage engine and makes a new backend a bounded, testable unit rather than a fork of the agent.
- **port effort:** MEDIUM — 4,126L, self-contained, and the conformance suite is the valuable part to lift first since it defines the contract. | **idea only:** False

## pi.11 `.pi/` agent-self-configuration directory

- **where:** .pi/extensions/ (import-repro.ts, prompt-url-widget.ts, redraws.ts, tps.ts), .pi/prompts/ (cl, deslop, is, pr, sa, wr .md), .pi/skills/ (add-llm-provider.md, interactive-testing.md, release.md), .pi/git/.gitignore, .pi/npm/.gitignore
- **what:** The repo dogfoods its own agent format: a committed `.pi/` tree holding working extensions, slash-command prompts and skills, plus gitignore'd scratch dirs.
- **how:** Plain directory convention at repo root, read by the agent at startup; scratch subdirs are gitignored so local state is possible without polluting the tree.
- **solves:** Proves the extension/prompt/skill format works in the project's own repo, and gives contributors working agents-in-the-repo with no setup.
- **port effort:** SMALL — 16 files; the format and the gitignore-scoped scratch-dir convention are the transferable part. | **idea only:** True

## pi.12 Theme as validated data, not code

- **where:** packages/coding-agent/src/modes/interactive/theme/{theme-schema.json, light.json, dark.json}
- **what:** Terminal theming is a JSON schema plus two concrete theme documents rather than hardcoded style tables, so themes are authorable and validatable.
- **how:** A JSON Schema file alongside the two theme instances; contrast/theme-color choices live in data.
- **solves:** Lets users author and validate themes without touching TypeScript, and makes an invalid theme a schema failure instead of a rendering bug.
- **port effort:** SMALL — three small files; directly applicable to omp's TUI theming. | **idea only:** True

## pi.13 Self-contained HTML export with vendored highlighters

- **where:** packages/coding-agent/src/core/export-html/{template.html, template.css, template.js, vendor/marked.min.js, vendor/highlight.min.js}
- **what:** Session export renders to a single portable HTML file using inlined marked/highlight.js vendored into the source tree, so an exported transcript is viewable with no network and no build step.
- **how:** Vendored minified bundles are committed alongside the templates and referenced relatively, so the export is fully offline.
- **solves:** Session transcripts remain readable and shareable indefinitely without depending on a CDN or on the tool still existing.
- **port effort:** SMALL — ~746L plus two vendored bundles; the offline-vendoring decision is the reusable idea (note omp already depends on marked and highlight.js). | **idea only:** True

## pi.14 Client / protocol / server split for out-of-process driving

- **where:** packages/protocol/ (12 files / 1,447L, 8 declared exports), packages/client/ (13 files / 1,951L, 8 src files), packages/server/ (23 files / 3,051L, includes transports/unix/); consumer side packages/coding-agent/src/modes/rpc/ (4 files / 1,797L); documented in packages/coding-agent/docs/rpc-commands.md (860L)
- **what:** A wire-protocol package, a client and a server, letting the agent be driven from another process (RPC mode) rather than only from a terminal.
- **how:** protocol uses typebox for schemas; server exposes a Unix-socket transport (`@earendil-works/pi-server/unix`); coding-agent's rpc mode is the in-repo client example (also examples/rpc-client.ts, rpc-extension-ui.ts).
- **solves:** Decouples the agent process from its UI so it can be embedded, scripted, or driven by another tool over a typed wire protocol.
- **port effort:** MEDIUM — ~6,400L across three small packages, but they form a self-contained cluster that can be lifted as a unit. | **idea only:** False

## pi.15 Test and benchmark surface sized to the source

- **where:** Per package test:line ratio measured — agent 29,289 test / 33,517 src (87%); ai 39,670 / 25,407 (156%); chord 9,040 / 8,611 (105%); tui 19,468 / 18,769 (104%); coding-agent 62,961 / 75,284 (84%); durable 7,549 / 9,024 (84%); telemetry 243 / 935; server 1,057 / 1,966; protocol 567 / 869; client 799 / 1,135
- **what:** 625 vitest files carrying 6,113 test()/it() call sites, plus 26 benchmark files — test volume exceeds src volume in four packages (ai, chord, tui, agent), i.e. the risky surfaces are the best covered.
- **how:** vitest with per-package vitest.config.ts / vitest.test.json; benchmarks under agent/benchmark/ and session-backends/sqlite-node/benchmark/ with separate *-targets.ts harness files.
- **solves:** Provides the acceptance suite a port needs — a ported feature can be validated against ported tests rather than judged by inspection.
- **port effort:** LARGE in aggregate (~171,000 test lines) but MECHANICALLY cheap: tests are the port's safety net and should move with the source, not after it. | **idea only:** False

## pi.16 Extension lifecycle (tier 1) — factory, invalidate, no deactivate

- **where:** packages/coding-agent/src/core/extensions/loader.ts:153-230 (createExtensionRuntime), :479-586 (loadExtension/initializeExtension); runner.ts:684-698 (invalidate)
- **what:** Extension is `(pi: ExtensionAPI) => void | Promise<void>`. Loader calls the factory; the record it fills is a bag of Maps. There is NO deactivate/activate pair. Unload == `runtime.invalidate(msg)`, which sets `staleMessage` so every captured `pi`/ctx throws, and unsubscribes event-bus subs registered via `trackEventBusSubscription`. Actual resource release is the author's job in an idempotent `session_shutdown` handler.
- **how:** Doc mandates: 'Do not start processes, sockets, watchers, or timers in the factory' (some invocations load extensions without a session); start from `session_start`, close from `session_shutdown`.
- **solves:** Extensions must survive modes that never start a session (--print, --json, rpc) and must be reloadable without leaking timers/sockets.
- **port effort:** medium — the model is small; the hard part is that 'no deactivate' forces every author to hand-roll idempotent teardown. | **idea only:** False

## pi.17 Stale-context invalidation

- **where:** types.ts:1843-1868 (ExtensionRuntimeState), :406-421 (ReplacedSessionContext); runner.ts:684-698
- **what:** A captured `pi` or command ctx becomes a landmine after `ctx.newSession()/fork()/switchSession()/reload()`. Pi solves it with a runtime-level `staleMessage`: every action method and `assertActive()` throws the same long instructional message. `ReplacedSessionContext` (passed to `withSession()`) is the sanctioned escape hatch.
- **how:** Message text is authored, not thrown generically: 'Do not use a captured pi or command ctx after ctx.newSession()...'.
- **solves:** Session replacement invalidates every ctx the extension is holding; silent use-after-free here corrupts the session.
- **port effort:** low — small, self-contained, high value. Directly adoptable. | **idea only:** False

## pi.18 Pre-bind action stubs (two-phase init)

- **where:** loader.ts:153-230; types.ts:1843-1856; runner.ts:399-420 (bindCore)
- **what:** `createExtensionRuntime()` is created by the loader with every action method set to `notInitialized` — a thrower with the message 'Extension runtime not initialized. Action methods cannot be called during extension loading.' `registerProvider` queues into `pendingProviderRegistrations`; `runner.bindCore()` later replaces all stubs with real implementations. `registerTool()` is explicitly allowed pre-bind.
- **how:** Comment at loader.ts:206: 'Pre-bind: queue registrations so bindCore() can flush them once the model registry is available.'
- **solves:** Factories run before the session/model registry exists, but they legitimately need to register providers and tools during load.
- **port effort:** medium | **idea only:** True

## pi.19 40-event hook table with typed per-event results

- **where:** types.ts:1365-1440 (on overloads), :1185-1220 (ExtensionEvent union), :1222-1310 (per-event result types)
- **what:** 40 `on()` overloads, each with its own declared result type. Events are NOT uniform: some notify (`provider_stream_event` is explicitly 'notification-only and is not persisted'), some transform (`context`, `message_end`, `tool_result` — handlers compose, each sees prior changes), some can block (`tool_call` returns `{block, reason}`; a handler *failure* blocks the tool as a fail-safe), some are actionable boundaries (`turn_end`, `agent_before_settle` can return `continue: true` for exactly one more model request).
- **how:** Discriminated unions: `ToolCallEvent` = 9 per-tool variants, `ToolResultEvent` = 9, each with an `isXToolResult()` type guard and a generic `isToolCallEventType(toolName, event)` overload.
- **solves:** Extensions need to intercept, transform, and veto without the host having to hand-roll per-integration plumbing.
- **port effort:** high to copy the table; the *typing discipline* (one result type per event, never 'any event may return anything') is the reusable idea. | **idea only:** True

## pi.20 Command-only context tiering (deadlock avoidance by construction)

- **where:** types.ts:319-405 (ExtensionContext / ExtensionCommandContext), :1910-1934 (ExtensionCommandContextActions)
- **what:** `ExtensionContext` has ~15 members safe in any handler. `ExtensionCommandContext` adds 6: waitForIdle, newSession, fork, navigateTree, switchSession, reload. These are command-only 'because calling them from lifecycle handlers can deadlock the runtime' (docs/extensions.md:160).
- **how:** Context object is literally `Object.defineProperties(...)` over resolved-at-call-time getters (runner.ts:893) so bindCore/bindUI changes are reflected.
- **solves:** Session-tree operations wait on the agent being idle; doing that mid-stream deadlocks.
- **port effort:** low-medium | **idea only:** True

## pi.21 jiti loader with no build step + virtual module map

- **where:** loader.ts:45-121 (getVirtualModules/getAliases), virtual-modules.ts (whole file), jiti-loader.ts vs jiti-static-loader.ts
- **what:** Extensions are loaded straight from TypeScript via jiti — no compile step. `VIRTUAL_MODULES` supplies 17 specifiers in-process so extensions can `import typebox`, `pi-tui`, `pi-agent-core`, `pi-ai/compat`, and even the host package itself without installing anything (matters in compiled binaries). Legacy `@mariozechner/*` aliases kept alongside `@earendil-works/*`.
- **how:** Two jiti entrypoints: `jiti` (lazy Babel transform) for normal Node, `jiti/static` for Bun/SEA binaries so the transform gets embedded. Chosen by isBunBinary || isNodeSeaBinary || isBundledNode (loader.ts:35-41).
- **solves:** Third-party extension authors shouldn't have to build, and the same extension must work in `bun run` and in a compiled binary.
- **port effort:** medium — the static/lazy jiti split is the non-obvious part. | **idea only:** False

## pi.22 Two-source discovery with 1-level depth and manifest override

- **where:** loader.ts:659-799
- **what:** `discoverAndLoadExtensions` walks exactly two dirs (cwd/.pi/extensions, agentDir/extensions) plus explicit configured paths, dedup via a `seen` Set. Per dir: `*.ts`/`*.js` files, or a subdir with index.ts/index.js, or a subdir with package.json declaring `pi.extensions`. Comment is explicit: 'No recursion beyond one level. Complex packages must use package.json manifest.'
- **how:** readPiManifest returns null on ANY throw (bad JSON, no `pi` key) rather than failing the load.
- **solves:** Fast, predictable, non-recursive discovery; deep packages opt into an explicit manifest instead.
- **port effort:** low | **idea only:** False

## pi.23 Unified resource manifest (extensions/skills/prompts/themes)

- **where:** pi-manifest.ts (whole file); package-manager.ts:194-210
- **what:** One `package.json` `pi` key declares all four resource types. `RESOURCE_TYPES = ['extensions','skills','prompts','themes']` with a parallel `FILE_PATTERNS` map (.ts|.js, .md, .md, .json). The same package installs and versions all of them as a unit.
- **how:** SourceInfo { scope: 'user'|'project'|'temporary', origin: 'package'|'top-level' } tags every loaded resource.
- **solves:** A customization is usually tools + prompts + a skill together; making them one unit is what makes them shareable.
- **port effort:** low | **idea only:** False

## pi.24 Project-trust two-pass load

- **where:** resource-loader.ts:435-440 and :445-465; runner.ts:291-318 (emitProjectTrustEvent)
- **what:** `loadProjectTrustExtensions()` forces `setProjectTrusted(false)`, loads, then the caller decides via `resolveProjectTrust`, then `reload()` re-resolves for real. Doc: 'Only personal and explicit command-line extensions can participate in the project_trust event that runs before project extensions load.' The trust event is dispatched by the runner with a ProjectTrustHandler returning 'yes'|'no'|'undecided'.
- **how:** Same gate guards project SYSTEM.md/APPEND_SYSTEM.md/skills (resource-loader.ts:1112, :1126).
- **solves:** Opening a hostile repo must not execute its extensions before the user consents.
- **port effort:** medium-high — the ordering is subtle but it is the security property; worth porting exactly. | **idea only:** True

## pi.25 Package distribution (npm/git/URL/local)

- **where:** core/package-manager.ts (2,730 LOC); docs/packages.md
- **what:** `pi install npm:@scope/pi-tools@1.0.0` / `git:github.com/x/y@v1` / `https://...` / `./local`. npm specs and git refs are pinned; `pi update --extensions` reconciles without moving a configured ref. Identity: npm by name, git by repo URL *without the ref*, local by resolved absolute path — 'This prevents the same package from loading twice through equivalent declarations.'
- **how:** `resourcePrecedenceRank` (package-manager.ts:189): origin==='package' -> 4 (always wins); else scope (project 0 / user 2) + (source==='local' ? 0 : 1).
- **solves:** Extensions execute arbitrary code, so provenance and single-identity matter more than convenience.
- **port effort:** high — the installer is the biggest single file in the system. | **idea only:** True

## pi.26 Deterministic extension precedence

- **where:** resource-loader.ts:676-682; runner.ts:588-621
- **what:** Extensions are NOT loaded in completion order. `orderedExtensions = extensionPaths.map(resolve).filter(defined)`, then `inlineExtensions.push(...)` last. Handler iteration order ('Handlers run in extension load and registration order') and first-wins tool/flag lookup both fall out of this.
- **how:** Inline extensions carry a synthetic path `<inline:name>` (types.ts:1764-1771) and are appended last.
- **solves:** Async loading would otherwise make override behavior nondeterministic between runs.
- **port effort:** low | **idea only:** False

## pi.27 Shared inter-extension event bus

- **where:** core/event-bus.ts (whole file); loader.ts:195-205 (trackEventBusSubscription)
- **what:** `pi.events` is a thin `EventEmitter` (33 lines total). `pi.events.on()` auto-wraps the handler in try/catch so one extension's throw cannot break another's, and the returned unsubscribe is tracked by the runtime so it dies on invalidate.
- **how:** Errors go to console.error, not the extension error channel.
- **solves:** Composability — e.g. the plan-mode example drives other extensions without importing them.
- **port effort:** low | **idea only:** True

## pi.28 State-storage decision table (branch-correct state)

- **where:** docs/extensions.md:169-188; types.ts:806 (SessionBoundaryDraft), :1778 (RegisteredTool)
- **what:** docs/extensions.md:169-188 gives a 4-row table: branch-following tool state -> tool-result `details`; durable non-context data -> `appendEntry()`; content sent to the model -> `sendMessage()`; outside-session -> external storage. And the load-bearing rule: 'Reconstruct branch-sensitive state from ctx.sessionManager.getBranch() during session_start. Do not rebuild it from every file entry because abandoned branches represent alternative histories.'
- **how:** Custom entries can have renderers (registerEntryRenderer) without participating in LLM context — display-only, branch-invisible.
- **solves:** Sessions are a TREE, not a log. Naive state reconstruction silently resurrects abandoned-branch state.
- **port effort:** low as a rule; high if the host session model isn't already a tree. | **idea only:** True

## pi.29 Tool contract with per-tool execution mode

- **where:** types.ts:461-529; README 'Key Patterns' for the StringEnum/Google constraint
- **what:** ToolDefinition carries name/label/description/promptSnippet/promptGuidelines/TypeBox params/constrainedSampling/renderShell/executionMode/execute/renderCall/renderResult. `executionMode: 'sequential'` exists specifically for tools sharing mutable state (tic-tac-toe example); default is parallel. Nested model calls must report `usage` in the result or session totals drift.
- **how:** `defineTool()` exists purely to preserve param inference when a definition is assigned to a variable.
- **solves:** Parallel tool execution is the default for throughput, which breaks stateful tools — the opt-in escape must be part of the contract, not a convention.
- **port effort:** medium | **idea only:** False

## pi.30 Capability-lifecycle-enforced facet kernel (tier 2)

- **where:** packages/chord/src/types.ts:263-289; facets/host.ts:47-140
- **what:** FacetEnvironment = use (hard dep), observe (keyed dep), provide, provideMany, replicatedState, own(disposal), onActivate, onDeactivate. State machine `setting_up | prepared | active | disposing | dead` with `assertSettingUp/assertRunning/assertActive/assertServiceAccess` — misusing the API is a thrown Error naming the facet and the state, not a silent bug. Disposal runs effects in reverse, aggregating errors.
- **how:** onDeactivate is implemented as `lifecycle.own(callback)` (host.ts:592), so teardown shares the reverse-order effects list.
- **solves:** Tier 1 has no deactivation at all; here lifecycle misuse is structurally impossible and teardown is guaranteed and ordered.
- **port effort:** high — a different programming model, not a copy. The lifecycle-assertion idea is the takeaway. | **idea only:** True

## pi.31 Facet DAG validation + topological activation

- **where:** facets/host.ts:808-906
- **what:** validateFacets rejects duplicate service provision across facets, checks every `use`/`observe` requirement has a provider (with a precise error: 'requires local/<id>/<mode>, but no facet provides it'), and activation runs in topological order with teardown in reverse. Reload is transactional: staged candidates, dispose staged on failure, `sameReferences()` to skip no-op swaps.
- **how:** GenerationPhase: setup | assembling | connecting | activating | active | reloading | disposing | dead.
- **solves:** Hot-swapping a plugin set without leaving a half-wired graph.
- **port effort:** high | **idea only:** True

## pi.32 Session/worker vs TUI/presentation facet split

- **where:** examples/plugins/pi-example-plugin/src/session.ts vs src/tui.ts; experimental/plugins/package.ts:13
- **what:** One plugin package ships two facets. `src/session.ts` runs inside a session worker and provides services + owns replicated state; `src/tui.ts` runs in the client presentation and only *consumes* services. DEFAULT_PLUGIN_FACETS = { session: 'src/session.ts', tui: 'src/tui.ts' }. The TUI facet cannot touch the session directly — it goes through `defineService` RPC.
- **how:** Services carry a `Context` argument that serves as the activation context (e.g. BACKGROUND_CONTEXT) for state changes.
- **solves:** Same author, two processes, one contract — without the presentation side gaining ambient authority over the session.
- **port effort:** high; the *capability separation* is the idea worth stealing. | **idea only:** True

## pi.33 Server-owned, serialized plugin builds

- **where:** experimental/plugins/package.ts:69-104, :104-140
- **what:** `createServerPluginPackage` gives each server generation a serialized build queue (`buildTail`) so concurrent builds can't interleave; output is hashed by package path; presentation artifacts are built server-side and shipped as data, so the client only instantiates what the server selected. Per-session plugin selection is persisted (sha256 of sessionPath, mode 0o600) with strict schema validation that rejects unknown keys.
- **how:** `createPresentationFacetData` / `createPresentationFacetLoaders` split the same bundle into a wire format and a loader.
- **solves:** Client must not decide what code runs; the server owns the build and the selection.
- **port effort:** high | **idea only:** True

## pi.34 Tier-1 ↔ tier-2 capability bridge

- **where:** experimental/plugins/bundled.ts:51-55; experimental/plugin.ts
- **what:** The facet world reaches tier 1 through one resolution: `resolvePluginExternal` maps the single specifier `@earendil-works/pi-coding-agent/experimental/plugin` to a URL, picking `.ts` vs `.js` by whether the host is running from source. That module exports only AgentController, PresentationUI, SlashCommands.
- **how:** Everything else a facet wants from the host must be a chord Service, defined via defineService.
- **solves:** Keeps a hard boundary: plugins get a narrow, enumerated host API rather than the 64-point ExtensionAPI.
- **port effort:** low as a rule | **idea only:** True

## pi.35 Project trust — directory-scoped resource gate

- **where:** packages/coding-agent/src/core/trust-manager.ts (246L), src/core/project-trust.ts (97L)
- **what:** A single tri-state decision (`true`/`false`/`null`) per canonicalized directory, stored in `~/.pi/agent/trust.json`, resolved by walking up to the nearest ancestor with a recorded decision. Gating list is a frozen const, not a heuristic.
- **how:** `hasTrustRequiringProjectResources(cwd)` (trust-manager.ts:185) checks a frozen `TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES` list (settings.json, extensions, skills, prompts, themes, SYSTEM.md, APPEND_SYSTEM.md) plus ancestor `.agents/skills`, explicitly excluding `~/.agents/skills` even when cwd==$HOME (line 197). `resolveProjectTrusted()` (project-trust.ts:46) applies precedence: `--approve`/`--no-approve` → extension `project_trust` event → saved nearest-ancestor decision → `defaultProjectTrust` → UI prompt. `if (!hasUI) return false` (line 86-88) is fail-closed for print/json/rpc.
- **solves:** Stops an untrusted repo from silently loading executable extensions, system-prompt files, or project settings at startup — the one boundary that is actually enforced in this codebase.
- **port effort:** Low — ~340 lines, zero deps beyond `proper-lockfile`, self-contained, and the enforcement side already exists in settings-manager/package-manager. | **idea only:** False

## pi.36 Trust enforcement at the consumer (defence in depth)

- **where:** packages/coding-agent/src/core/settings-manager.ts:523-526, src/core/package-manager.ts:1747
- **what:** Declining trust does not merely skip a load — it actively wipes the already-parsed project settings object and re-merges, and independently refuses project package storage.
- **how:** `setProjectTrusted(false)` sets `this.projectSettings = {}` and recomputes `deepMergeSettings(global, project)`. `package-manager.ts:1747` throws `"Project is not trusted; refusing to access project package storage"`. Both are fail-closed throws, not warnings.
- **solves:** A gate that only controls one code path is not a boundary. pi re-checks at every consumer, so a second path into project settings cannot bypass the decision.
- **port effort:** Low — the pattern (re-check the decision at the consumer, throw on deny) is the reusable part; the specific call sites are pi-shaped. | **idea only:** True

## pi.37 tool_call interception hook (the permission extension point)

- **where:** packages/coding-agent/src/core/extensions/runner.ts:1134-1152
- **what:** An extension event that runs before every tool call and can block it, short-circuiting the handler chain. This is the seam a real permission layer plugs into.
- **how:** `emitToolCall()` iterates `snapshotEventHandlers(this.extensions, "tool_call")`; the first handler returning a result with `block: true` returns immediately. Demonstrated end-to-end by `examples/extensions/permission-gate.ts` (regex on `rm -rf|sudo|chmod 777`, `ctx.ui.select` confirm, and `if (!ctx.hasUI) return {block:true}` — i.e. non-interactive defaults to deny).
- **solves:** Gives third parties a supported, non-forked way to add per-call approval without patching the tool layer.
- **port effort:** Medium — the hook is the reusable idea; omp would need to define the event contract, the ctx shape (hasUI/ui.select), and the block result type. | **idea only:** True

## pi.38 Config value resolution: !command / $ENV / literal

- **where:** packages/coding-agent/src/core/resolve-config-value.ts (288L)
- **what:** Settings can hold a literal, an env-var reference, a template, or a shell command whose stdout becomes the value — keeping API keys out of settings files entirely.
- **how:** `parseConfigValueReference()` splits on leading `!` (command) vs template; `parseConfigValueTemplate()` handles `$VAR`, `${VAR}`, `$$` and `$!` escapes with a strict `ENV_VAR_NAME_RE`. `executeWithDefaultShell` uses `execSync` with `timeout: 10000` and `stdio:["ignore","pipe","ignore"]` (stderr swallowed). Results memoized in a process-lifetime `Map`.
- **solves:** Secrets never have to be written to disk in the settings file; supports 1password/`op read`/keychain shims.
- **port effort:** Low — self-contained, but see the finding on swallowed stderr and uncached-vs-cached divergence. | **idea only:** False

## pi.39 Credential redaction for diagnostics

- **where:** packages/coding-agent/src/core/bug-report.ts:20-59, 66-91
- **what:** A reusable redaction layer: key-name-based secret stripping, URL credential/query-param scrubbing, and env-name-only collection.
- **how:** `SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key|secret|token|password|passwd|credential|authorization|cookie)(?:$|[-_])/i` with camelCase→snake normalisation before the test (line 23). `redactUrl()` strips userinfo and redacts sensitive query params, handling nested schemes via a recursive regex (line 28). `redactJsonValue()` applies both as a `JSON.stringify` replacer. `collectEnvironment()` emits only `Object.keys(process.env).filter(n => n.startsWith("PI_"))` — names never values (line 87-90).
- **solves:** Making a support bundle safe to upload without hand-auditing every field.
- **port effort:** Low — ~40 lines, pure functions, directly liftable. Caveat: key-name-only matching misses secrets embedded in free-text values (see finding). | **idea only:** False

## pi.40 At-rest credential hardening + cross-process locking

- **where:** packages/coding-agent/src/core/auth-storage.ts:25, 59, 65, 106, 187
- **what:** The one place pi gets file modes right, plus a lock discipline for multi-process access to a single state file.
- **how:** `AUTH_FILE_WRITE_OPTIONS = { encoding:"utf-8", mode:0o600 }` with an explicit comment that the mode applies only on creation so admin ACLs survive. Dir created `mode:0o700`. `proper-lockfile.lockSync` with `maxAttempts:10`, `delayMs:20`, retrying only on `ELOCKED` and rethrowing anything else. Trust store uses the same pattern (`trust-manager.ts:137-167`) locking the directory with an explicit `lockfilePath`.
- **solves:** Prevents world-readable API keys and prevents concurrent pi processes from corrupting the credential file.
- **port effort:** Low — pattern is small; the only real gap is that no other writer inherits the discipline (see finding). | **idea only:** False

## pi.41 TOCTOU-safe unix socket publisher

- **where:** packages/server/src/transports/unix/listener.ts:47-86, 299-310, 147-158
- **what:** A local IPC daemon listener that resists a same-user attacker pre-planting a file at the socket path.
- **how:** `start()` binds a unique `ownedBindPath`, then `lstat` + `isSocket()` assertion (line 75), records `{dev, ino}` (line 76), and publishes with `link()` (line 77) — atomic and fails if the destination exists, so an attacker who recreates the path in the window causes a fail-closed throw. `chmod` to mode (default 0o600, line 11) happens after publish. Cleanup re-`lstat`s and compares dev/ino before unlinking (line 158), so it never removes a socket that was swapped out. `removeStaleSocket` refuses non-socket paths, probes liveness via a connect attempt, and renames the stale file to `stale-<uuid6>` rather than deleting it.
- **solves:** A naive `server.listen(path)` + `unlink(path)` daemon is hijackable and can unlink an attacker's replacement.
- **port effort:** Medium — ~200 lines of careful fs/net sequencing, but self-contained and directly liftable. | **idea only:** False

## pi.42 Bounded retry with quota fail-fast

- **where:** packages/ai/src/utils/retry.ts (243L), packages/ai/src/utils/provider-retry.ts (125L)
- **what:** Two-layer retry: an inner provider-SDK layer and an outer assistant-turn layer, with an explicit do-not-retry classification.
- **how:** `retryAssistantCall()` loops to `maxRetries`, delay = `baseDelayMs * 2^(attempt-1)` capped at 60s, `sleep()` is abort-aware and normalizes mid-backoff aborts into a `stopReason:"aborted"` message. `NON_RETRYABLE_PROVIDER_LIMIT_ERROR_PATTERN` (retry.ts:7-24) lists `insufficient_quota`, `billing`, `Monthly usage limit reached`, `GoUsageLimitError` so billing exhaustion fails fast instead of burning the budget. Inner layer honours `retry-after-ms`/`retry-after` and `x-should-retry`, and throws if a server-requested delay exceeds the cap (provider-retry.ts:36-48). `RetryCallbacks` (`onRetryScheduled`/`onRetryAttemptStart`/`onRetryFinished`) give structured observability.
- **solves:** Distinguishing transient throttling from deterministic failures, so a dead API key fails in one call and a 429 backs off properly.
- **port effort:** Low for the policy shape; the string-classification regexes are pi/provider-specific and would need rework. | **idea only:** True

## pi.43 Crash ring buffer with one-shot notification

- **where:** packages/coding-agent/src/core/crash-log.ts (full)
- **what:** Bounded, self-expiring crash persistence that never grows and never nags.
- **how:** `MAX_CRASH_RECORDS = 5`, `MAX_AGE = 7 * 24 * 60 * 60 * 1000`; `recordCrash` appends and `.slice(-MAX_CRASH_RECORDS)`; `takeUnnotifiedCrash` returns the newest un-notified record within the age window and marks `notified: true` on the way out (so a crash is reported once, not every launch). `readCrashLog` is fully try/catch-guarded because it runs while crashing. Also `findExtensionStackMatches()` attributes a crash to a loaded extension by path-matching stack frames.
- **solves:** Post-mortem data without log bloat or notification spam, safe to call from a crashing process.
- **port effort:** Low — small, self-contained, and a good template for omp's crash path. | **idea only:** False

## pi.44 Durable transaction layer with read-before-write enforcement

- **where:** packages/durable/src/errors.ts, src/session/transaction.ts (32KB), src/storage/sqlite/node.ts, src/storage/jsonl/storage.ts
- **what:** A real transactional state model over pluggable storage (jsonl + sqlite), with a compile/runtime invariant that catches a whole class of subtle bug.
- **how:** `class ReadAfterWrite extends Error` — `"Tx.${method}() cannot read tables after the first table write"` — thrown at runtime, making an ordering bug loud instead of silently returning stale data. sqlite adapter uses `BEGIN IMMEDIATE`, `PRAGMA journal_mode = WAL`, configurable `wal_autocheckpoint`, and `PRAGMA wal_checkpoint(TRUNCATE)` on close. `StorageRejected` distinguishes "rejected before any durable effect; the owning Session may continue safely". Typed `Id`/`Seq` brands with `idFromNumber`/`seqFromNumber` applied only at trusted boundaries.
- **solves:** Makes state mutation transactional and turns read-after-write into an explicit, testable error rather than a correctness landmine.
- **port effort:** High — 16.6K lines, but the ReadAfterWrite invariant and the rejected-vs-corrupt error split are cheap ideas worth stealing independently. | **idea only:** True

## pi.45 Append-only JSONL session persistence with exclusive create

- **where:** packages/coding-agent/src/core/session-manager.ts:1129, 1180, 1187, 1851
- **what:** Crash-resilient, fork-friendly session storage without a database.
- **how:** Entries are `appendFileSync`'d one JSON line at a time (line 1187); new session files are created with `{ flag: "wx" }` (line 1851) so creation fails rather than clobbering an existing file. Branch model uses a `parentId` chain, enabling fork/branch without rewriting history.
- **solves:** A crash mid-write loses at most the last line, not the whole transcript; `wx` removes a whole class of create races.
- **port effort:** Low for the technique; the 62KB SessionManager around it is not worth porting wholesale. | **idea only:** True

## pi.46 Sandbox env restoration for compiled Bun binaries

- **where:** packages/coding-agent/src/bun/restore-sandbox-env.ts (36L), src/bun/sandbox-env-setup.ts (4L)
- **what:** Recovers `process.env` when a compiled Bun binary runs under a sandbox that empties it.
- **how:** On Bun only, if `Object.keys(process.env).length === 0`, reads `/proc/self/environ`, splits on NUL, and repopulates `process.env`. Invoked via `sandbox-env-setup.ts` at module-eval time, before anything reads env. Comment explicitly flags it as a duplicate of `getBunSandboxEnvValue()` in `packages/ai/src/utils/provider-env.ts` and says to keep them in sync.
- **solves:** Under nono/seatbelt sandboxes on Linux, compiled binaries otherwise see an empty environment and cannot find credentials or PATH.
- **port effort:** Low — 36 lines, but Linux-only (`/proc`), and omp runs on Bun too so it is directly relevant. | **idea only:** False

## pi.47 LLM-generated bug summary from the transcript

- **where:** packages/coding-agent/src/core/bug-report.ts:330-375
- **what:** Lets a user file a useful report without hand-writing one, by re-prompting the session model over the transcript.
- **how:** `selectMessages()` walks backwards under a `contextWindow * 0.6` token budget and notes when truncation occurred. Uses a dedicated `BUG_SUMMARY_SYSTEM_PROMPT` ("Do NOT continue the conversation"). Guards: throws on `stopReason === "aborted"`, throws if `response.content` contains any `toolCall` block (prevents the summarizer from acting), throws on empty output.
- **solves:** Report quality without a human writing prose — but it is also a transcript-egress path to the model provider (see finding).
- **port effort:** Low technically; the no-tool-call assertion and the token-budget trim are the good parts. | **idea only:** True

## pi.48 Non-UI modes and CLI trust override

- **where:** packages/coding-agent/src/cli/args.ts:229-232, 326-327; src/core/project-trust.ts:47-49, 86-88
- **what:** Explicit, scriptable control over the trust decision for automation.
- **how:** `--approve`/`-a` and `--no-approve`/`-na` set `projectTrustOverride`, checked first in `resolveProjectTrusted`. When there is no UI and no override/saved decision, the function returns `false` rather than defaulting to trust.
- **solves:** Non-interactive runs neither hang on a prompt nor silently inherit trust.
- **port effort:** Low — the precedence order and the fail-closed no-UI default are the reusable parts. | **idea only:** True

## pi.49 Plugin distribution from npm / git / local

- **where:** packages/coding-agent/src/core/package-manager.ts (2730 lines, class DefaultPackageManager at :807, interface at :113)
- **what:** A PackageManager resolves four resource kinds (extensions .ts/.js, skills .md, prompts .md, themes .json) out of three source types (npm spec, git URL, local path), installs them, updates them, and persists them into settings.
- **how:** ParsedSource = NpmSource | GitSource | LocalSource. installGit does `git clone` then `git checkout <ref>`; updateGit does fetch + `git rev-parse HEAD` vs the pinned ref + `git reset --hard`. Resource collisions resolve by `resourcePrecedenceRank` (0..4) so "first wins" is deterministic. Settings field `packages?: PackageSource[]` accepts a bare string or an object with autoload/extensions/skills/prompts/themes filters.
- **solves:** Distributing agent capability without forking the agent, and making two installs of the same resource name resolve deterministically instead of by filesystem accident.
- **port effort:** Large but self-contained — it is one file with one interface and no deep coupling to the agent loop. The git half could be replaced by omp's existing @oh-my-pi/pi-natives/vcs helper. | **idea only:** False

## pi.50 Runtime provider registration from an extension (incl. custom OAuth)

- **where:** packages/coding-agent/src/core/extensions/types.ts:1560-1640 (registerProvider/unregisterProvider on ExtensionAPI), types ProviderConfig:1648; impl in core/extensions/runner.ts (46 KB)
- **what:** An extension can register a whole model provider at runtime — models, base URL, headers, and a full OAuth login/refreshToken/getApiKey triple — and can later unregister it, restoring the overridden built-in models.
- **how:** Two overloads: registerProvider(provider: Provider) for a native provider, or registerProvider(name, ProviderConfig) for the legacy config form. The ProviderConfig oauth field takes {name, login(callbacks), refreshToken(credentials), getApiKey(credentials)}. Calls made during initial load are queued and flushed once the runner binds its context; later calls take effect immediately (no /reload needed). Docs: packages/coding-agent/docs/custom-provider.md.
- **solves:** Lets a plugin teach the agent a new vendor (a corporate gateway, a self-hosted router) with its own auth, without touching core or rebuilding the binary.
- **port effort:** Medium. The interface is small and the deferral semantics are the tricky part — omp's catalog is KDL-driven, so the equivalent hook is a KDL extension point rather than a TS provider object. | **idea only:** True

## pi.51 Typed tool-registration contract with provider-side constrained sampling

- **where:** packages/coding-agent/src/core/extensions/types.ts:461-511 (ToolDefinition), plus defineTool<TParams,TDetails,TState>() at :511
- **what:** A single ToolDefinition interface that third parties implement to add an LLM-callable tool, including a request to the provider to grammar-constrain the model's JSON output for that tool.
- **how:** TypeBox `parameters` for the schema; `constrainedSampling?: false | ConstrainedSamplingConfig` forwarded to providers that support it (see packages/ai/src/api/constrained-sampling.ts — makeStrictJsonSchema, resolveGrammarConstrainedSampling, appendGrammarToolInputJsonDelta for streaming grammars). `prepareArguments` is a compat shim for models that emit malformed args. `executionMode: "sequential"|"parallel"` lets a tool opt out of concurrent execution.
- **solves:** Makes tool output machine-reliable at the provider level instead of relying on prompt instructions, and gives tools an explicit concurrency contract.
- **port effort:** Medium. The interface ports almost verbatim; the constrained-sampling half needs per-provider support in omp's catalog rule tree. | **idea only:** True

## pi.52 Pluggable Operations backends behind identical tool definitions

- **where:** packages/coding-agent/src/core/tools/{read,write,edit,grep,find,ls,bash}.ts — ReadOperations at read.ts:35, and 6 siblings; consumers at examples/extensions/ssh.ts and examples/extensions/gondolin/index.ts
- **what:** Every built-in tool is defined once and bound to an Operations interface, so the same read/write/edit/bash/grep/find/ls tools can be retargeted at a remote host, a sandbox, or a micro-VM without redefining the tool.
- **how:** ReadOperations = {readFile(abs)->Promise<Buffer>, access(abs)->Promise<void>, detectImageMimeType?(abs)->Promise<string|null|undefined>}. createReadTool(cwd, {operations}) binds an alternative. ssh.ts supplies ssh-backed operations for read/write/edit/bash; gondolin routes tools into a Linux micro-VM while keeping pi and provider auth on the host.
- **solves:** Makes "run the same agent somewhere else" a data-plumbing change rather than a tool rewrite, and is the seam that makes remote/sandboxed execution possible at all.
- **port effort:** Medium — mechanical, but it requires every tool to already take an operations-injection parameter, which is an invasive change to tool code. | **idea only:** True

## pi.53 Lazy per-provider API module loading

- **where:** packages/ai/src/api/lazy.ts (lazyApi/lazyStream, LazyApiCapabilities) + 12 *.lazy.ts thunks beside each real api/*.ts
- **what:** Each of the 10 wire protocols is loaded on demand, so a session that talks to one vendor never pays the parse cost of the other vendors' SDKs.
- **how:** Each protocol exports e.g. `export const anthropicMessagesApi = (): ProviderStreams => lazyApi(() => import("./anthropic-messages.ts"))`. The heaviest modules are openai-completions.ts (62 KB), openai-codex-responses.ts (54 KB), anthropic-messages.ts (50 KB), bedrock-converse-stream.ts (48 KB).
- **solves:** Startup latency and memory when the bundled provider count is large.
- **port effort:** Small and mechanical. | **idea only:** True

## pi.54 Serialized credential mutation to stop OAuth double-refresh

- **where:** packages/ai/src/auth/types.ts (CredentialStore contract, the `modify` doc comment), packages/ai/src/auth/credential-store.ts (InMemoryCredentialStore), packages/coding-agent/src/core/auth-storage.ts:25 (auth.json, mode 0o600)
- **what:** A credential store whose only write path is a serialized read-modify-write, so two concurrent requests cannot both rotate the same OAuth token and invalidate each other.
- **how:** `Models.getAuth()` runs OAuth refresh INSIDE `modify`, so the rotate-and-persist is atomic with respect to other callers. read() resolves undefined for missing entries; methods reject only on storage failure. The on-disk impl writes auth.json with `{encoding:"utf-8", mode:0o600}`.
- **solves:** A real, hard-to-debug production failure: concurrent tool turns each refreshing a rotated refresh_token, one of which then stores a token the server has already invalidated.
- **port effort:** Small — a store interface plus one file-per-process mutex. | **idea only:** True

## pi.55 Child-process exit that survives detached descendants

- **where:** packages/coding-agent/src/utils/child-process.ts:45-137, with the earendil-works/pi#5303 rationale in the doc comment at :34-43
- **what:** waitForChildProcess does not resolve on a fixed deadline after exit; it waits for stdout/stderr to go idle, re-arming a 100ms grace timer on every chunk.
- **how:** Tracks stdoutEnded/stderrEnded/exited separately; on 'exit' it arms the idle timer, and every 'data' chunk re-arms it. An actively-writing descendant keeps the reader alive; a quiet inherited handle (Windows daemonized descendant that never fires 'close') still releases after the grace elapses.
- **solves:** Truncated bash-tool output: a short-lived command that spawns a detached background child would otherwise have its tail silently cut off.
- **port effort:** Small — drop-in replacement for a naive exit-then-destroy. | **idea only:** False

## pi.56 Patched global fetch with proxy + timeout policy

- **where:** packages/coding-agent/src/core/http-dispatcher.ts (113 lines)
- **what:** One module configures HTTP for the whole process: proxy env, idle timeout, connection-family race tolerance, and a crash guard on undici's internal Client error.
- **how:** Installs a globalThis.fetch backed by `undici.EnvHttpProxyAgent({allowH2:false, proxyTunnel:true})`. Raises autoSelectFamilyAttemptTimeout to 2000ms because Node's 250ms default kills valid high-latency attempts. withUndiciErrorListener attaches a no-op 'error' handler because undici emits an internal Client error when tearing down a mid-stream body — the body still rejects through reader.read(), but the unhandled 'error' would otherwise crash the process.
- **solves:** Two production crash classes: proxy/HTTP/2 incompatibilities, and the EventEmitter unhandled-error crash on stream teardown.
- **port effort:** Small. | **idea only:** False

## pi.57 Unix-socket RPC with versioned, schema-validated envelopes

- **where:** packages/protocol/src/{protocol,framing,codec,cbor/*}.ts; packages/server/src/; packages/client/src/; packages/coding-agent/src/modes/rpc/{rpc-mode,rpc-client,rpc-types}.ts
- **what:** A client/server pair that lets multiple clients drive one agent process over a local socket, using CBOR payloads in length-prefixed frames, with every envelope validated by TypeBox and every call fenced to a server+session+attachment.
- **how:** PROTOCOL_VERSION = 8 with a ClientHello handshake carrying the version. Envelopes are Type.Object({...}, {additionalProperties:false}). Framing is a 4-byte big-endian length prefix with DEFAULT_MAX_FRAME_LENGTH 16 MiB and a FrameError on violation. Targets are ServerTarget{serverId} or SessionTarget{serverId,sessionId,attachmentId}; serverId must match a canonical lowercase UUIDv4 or getUnixSocketPath throws.
- **solves:** Driving one agent from an editor/CLI/UI without a TCP port and without JSON parse cost on large transcripts.
- **port effort:** Large — three packages and a version-negotiation protocol. omp would more likely reuse its existing RPC mode. | **idea only:** True

## pi.58 Dependency-free SQLite session store

- **where:** packages/session-backends/sqlite-node/src/sqlite/ (repo.ts, session.ts, migrations.ts, migrations/001_initial.sql, usage-ledger.ts, branch-entries.ts)
- **what:** A full session/branch/usage store on Node's built-in node:sqlite, with no native module, no build step, and no npm dependency.
- **how:** `import { DatabaseSync } from "node:sqlite"`, wrapped behind a SqliteDatabase interface (wrapNodeSqliteDatabase) so the driver is swappable. Schema: sessions, entries, scalar_values, list_values, usage_ledger, branch_entries, branch_meta + indexes on (session_id,parent_id), (session_id,seq,type), (session_id,seq), (session_id,branch_id,entry_seq,...).
- **solves:** Durable, queryable, branch-aware session storage with zero native-build friction in a CLI that ships as a single artifact.
- **port effort:** Medium — but omp already has bun:sqlite, so the port value is the SCHEMA and the branch model, not the driver. | **idea only:** True

## pi.59 Storage backends split node / browser / memory

- **where:** packages/durable/src/storage/{jsonl/,sqlite/,memory.ts}; enforced by scripts/check-browser-smoke.mjs
- **what:** The durable session runtime picks among JSONL, SQLite, and in-memory storage, with node and browser variants of each kept behind one interface.
- **how:** jsonl/{index,node,storage}.ts and sqlite/{database,index,node,storage,migrations}.ts. The check script esbuild-bundles the durable entry with platform:"browser" and asserts the resolved input graph still contains storage/jsonl/storage.ts, proving the browser build never reaches for a Node-only module.
- **solves:** Keeping the agent runtime embeddable in a browser without a human auditing imports; the smoke check makes the guarantee mechanical instead of aspirational.
- **port effort:** Small for the check script; the storage split is a bigger refactor. | **idea only:** True

## pi.60 Documented trust model for plugins and project resources

- **where:** packages/coding-agent/docs/security.md, docs/containerization.md, packages/coding-agent/src/core/settings-manager.ts (defaultProjectTrust: "ask"|"always"|"never")
- **what:** A written, honest security posture: pi does not sandbox tool calls, and the docs say so plainly while enumerating what project trust does and does not cover.
- **how:** security.md states pi "does not ask for approval before every tool call" and that project trust is not a startup boundary — it names the specific leak (Pi reads the project sessionDir setting before resolving trust, so declining cannot undo that lookup). It lists exactly which project resources require a trust decision (.pi/settings.json, .pi/extensions, .pi/skills, .pi/prompts, .pi/themes) and ranks three isolation strategies.
- **solves:** Users who assume an agent that loads third-party extensions is sandboxed.
- **port effort:** Documentation only. | **idea only:** True

## pi.61 Loopback-only OAuth callback servers

- **where:** packages/ai/src/auth/oauth/{anthropic,openai-codex,openrouter,radius}.ts
- **what:** Every browser-OAuth flow binds a callback HTTP server to 127.0.0.1, and the host is overridable by env var rather than hardcoded to a wildcard.
- **how:** anthropic.ts:32, openai-codex.ts:45 and openrouter.ts:26 read getProviderEnvValue("PI_OAUTH_CALLBACK_HOST") || "127.0.0.1"; radius.ts:26 hardcodes 127.0.0.1. Providers that need it also support pasting the final redirect URL back into the CLI on headless machines (documented in docs/providers.md).
- **solves:** Accidentally exposing a credential-bearing callback endpoint on all interfaces during login.
- **port effort:** Small. | **idea only:** True

## pi.62 Two-level agent loop with pluggable turn-lifecycle hooks

- **where:** packages/agent/src/agent-loop.ts:162-320 (runLoop); hook contracts in packages/agent/src/types.ts:142-270
- **what:** `runLoop` runs an outer loop (drains follow-up messages after the agent would naturally stop) around an inner loop (executes tool batches and drains steering messages). Six extension points on `AgentLoopConfig`: `prepareNextTurn`, `prepareRequest`, `finishTurn`, `getSteeringMessages`, `getFollowUpMessages`, plus `transformContext`. `finishTurn` returns `{action:"end"|"continue"}`; `prepareNextTurn`/`prepareRequest` return replacement `{context, model, thinkingLevel, messages}` so compaction or a model switch can happen between turns without the loop knowing.
- **how:** Config object of optional async callbacks; each returns a partial state replacement merged with `??` fallbacks. `explicitContinuation` flag (line 178) makes a `finishTurn:"continue"` that nothing else satisfies still buy exactly one context-only turn.
- **solves:** Decouples the agent turn state machine from compaction, model switching, and user-interrupt policy without the loop importing any of them. This is the seam that makes the rest of the system composable.
- **port effort:** MEDIUM — 898 LOC total; the loop body itself is ~160 lines and is a near-direct port. | **idea only:** False

## pi.63 Steering vs follow-up message queues with explicit drain modes

- **where:** packages/agent/src/agent-loop.ts:180, 296-310; `QueueMode` at packages/agent/src/types.ts:47; queue impl `MessageQueue` at packages/agent/src/agent.ts:147-171
- **what:** Two independent queues. `steer(msg)` injects mid-run without skipping the current tool batch; `followUp(msg)` waits until the agent would otherwise stop and restarts it. Each has a `QueueMode` of "all" (drain everything at the drain point) or "one-at-a-time" (drain only the oldest, leave the rest for later drain points).
- **how:** Loop polls `getSteeringMessages()` after each turn and `getFollowUpMessages()` only when the inner loop drains. The "one-at-a-time" mode exists because two messages delivered in one turn would let the agent answer a question the user already superseded.
- **solves:** The hard part of interactive agents: letting a user interject mid-run without losing the in-flight tool work, and without the agent answering a message that was superseded while it was still thinking.
- **port effort:** LOW — ~60 lines of queue plus the polling points in the loop. | **idea only:** False

## pi.64 Per-tool parallel/sequential execution mode with mandatory sequential preflight

- **where:** packages/agent/src/agent-loop.ts:505-522 (executeToolCalls dispatch), 527-581 (sequential), 583-660 (parallel); `executionMode` at packages/agent/src/types.ts:452
- **what:** A tool declares `executionMode?: "sequential" | "parallel"`. If ANY tool in a batch is sequential, or the global `toolExecution` is "sequential", the whole batch runs sequentially. In parallel mode, `beforeToolCall` (validation + permission) still runs sequentially over all calls, and only then do executions fan out.
- **how:** Parallel mode pushes either a finished outcome or a zero-arg thunk into an array, then `Promise.all` (line 649). Thunks short-circuit to an "Operation aborted" error result if the signal is already aborted. `tool_execution_end` fires in completion order; tool-result message artifacts are emitted later in assistant source order.
- **solves:** Permission prompts and file-mutation tools must not race, but read-only tools should. Whole-batch downgrade keeps the transcript ordering contract intact without a dependency graph.
- **port effort:** MEDIUM — ~150 lines; the "prepare sequentially, execute concurrently" split is the part worth copying verbatim. | **idea only:** False

## pi.65 Truncated-response tool-call rejection

- **where:** packages/agent/src/agent-loop.ts:475-500 (`failToolCallsFromTruncatedMessage`), invoked at line 253
- **what:** When an assistant message stops with `stopReason === "length"`, every tool call in that message is failed with a specific error result rather than executed, because the JSON arguments may be cut mid-token.
- **how:** Emits a normal `tool_execution_start`/`tool_execution_end` pair and a toolResult message whose text tells the model to re-issue the call with complete arguments. Returns `terminate: false` so the loop continues.
- **solves:** Executing a half-parsed tool call (e.g. a truncated `path` or a missing required field) can corrupt files or run the wrong command. This is a silent, high-severity failure mode.
- **port effort:** LOW — 25 lines, directly portable. | **idea only:** False

## pi.66 Tool loadout deltas declared to the model via system messages

- **where:** packages/agent/src/agent-loop.ts:332-378 (`declareToolChanges`, `withToolChanges`); delta computation in packages/ai/src/utils/transcript.ts:150 (`getToolStateChanges`), 197 (`hasNonAdditiveToolChanges`)
- **what:** `context.tools` is what the runtime can execute; the transcript's system messages are what the model is told it may call. Before every request the difference is computed and announced as `toolsAdded`/`toolsRemoved` on a system message, so the transcript always replays to exactly the executable set.
- **how:** Walks pending messages backward for an existing system message; if found, its tool fields are treated as intent and replaced with the computed delta; otherwise a new system message is inserted before the first non-system pending message.
- **solves:** Dynamic tool sets (extensions, skills, MCP servers connecting mid-session) stay in sync between what the model may call and what the runtime will run, without rewriting history.
- **port effort:** MEDIUM — ~45 lines here plus `getToolStateChanges` in pi-ai; both are small and self-contained. | **idea only:** False

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

