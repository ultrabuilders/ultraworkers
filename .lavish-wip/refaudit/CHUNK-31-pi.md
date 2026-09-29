# pi — chunk 1/5 (22 năng lực)

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
