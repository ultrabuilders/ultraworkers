# opencode — chunk 4/6 (22 năng lực)

## opencode.67 Per-plugin namespaced durable storage with hex-encoded keyspace

- **where:** packages/core/src/plugin/host.ts:584-611, contract at packages/plugin/src/storage.ts
- **what:** ctx.storage.get/set/remove/scan({prefix, after, limit}). Keys are namespaced by encoding every char of the plugin id to 4-hex-digit codepoints, so no plugin id (including ones with ':' or '/') can collide with or escape another plugin's keyspace. scan() transparently strips the namespace from keys and cursors.
- **how:** const namespace = 'plugin:' + pluginID.split('').map(v => v.charCodeAt(0).toString(16).padStart(4,'0')).join('') + ':'
- **solves:** Plugin isolation of persisted state without a real security boundary and without a reserved-character problem.
- **port effort:** Low. ~25 lines. The hex encoding is a neat trick; the cursor-transparent prefix stripping is the practical part. | **idea only:** False
## opencode.68 Transform digest-fingerprinted hot reload of a plugin's transitive import graph

- **where:** packages/plugin/src/source.bun.ts, packages/plugin/src/source.ts, packages/plugin/src/source.node.ts, packages/plugin/src/source.package.ts; wired in packages/core/src/plugin/module.ts:22-38
- **what:** For local plugins, the loader walks the entrypoint's ENTIRE transitive local import graph using Bun.Transpiler().scan(), sha256-digests every file (directories: sorted readdir), and re-imports only when a digest actually changed. Failed modules are cached BEFORE evaluation so import-time side effects do not repeat on every filesystem event. Missing local deps are watched as directories so creating them triggers recovery; missing package deps resolve to a tracked target.
- **how:** createPluginSources(watch) -> read(entrypoint): if every tracked digest is unchanged, return the cached module. Otherwise visit(root) recursively, delete require.cache[file] (and file+search), and track() each. watchTarget() recurses to the nearest existing ancestor when a path is missing.
- **solves:** Editing a helper file inside a plugin actually reloads the plugin, and a burst of fs events for unchanged content costs nothing.
- **port effort:** High (Bun.Transpiler is Bun-only), Medium for the digest-cache part on Node. The idea that the reload unit is the import GRAPH, not the entry file, is the takeaway. | **idea only:** True
## opencode.69 Revision derived from content mtime, not a counter

- **where:** packages/core/src/config/plugin/source.ts:173-186, packages/core/src/plugin/module.ts:123
- **what:** For a local plugin the operation carries mtime = max(mtime of all resolved entrypoints + the plugin's package.json). The generation's revision is JSON.stringify([operation, loaded.version]), so touching any file in the graph changes the revision, which is exactly what makes the prefix-preserving diff reload it.
- **how:** const times = await Effect.forEach([...Object.values(entrypoints)..., path.join(dir,'package.json')], entry => fs.stat(entry).map(info => Option.getOrElse(info.mtime, () => new Date(0)).getTime()).orElseSucceed(() => 0)); return [{...operation, mtime: Math.max(...times)}]
- **solves:** Ties the generic (id, revision) reload contract to real content change without a per-plugin version declaration.
- **port effort:** Low. Small, and it is what makes capability #2 work for local plugins. | **idea only:** True
## opencode.70 Plugin package layout resolved into three independent entrypoints

- **where:** packages/plugin/src/host.ts:17-44, packages/core/src/plugin/module.ts:94-100, packages/core/src/config/plugin/source.ts:164-172
- **what:** A plugin directory resolves to up to three entrypoints: server, tui, rpc. Subpath order is server->index, then tui, then rpc; resolution failures are tolerated only for a fixed set of module-not-found error codes, so a genuine error inside a plugin still throws. A local plugin's resolved entrypoint must pass a containment check (FSUtil.contains(root, server)) or it is dropped.
- **how:** return { server: entry(['server','']), tui: entry(['tui']), rpc: entry(['rpc']) } inside a try/catch that swallows only ENOENT|ENOTDIR|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_UNSUPPORTED_DIR_IMPORT.
- **solves:** One package can supply a server plugin, TUI extensions, and a shared contract independently; the client decides which it needs. The path-containment check stops a configured plugin directory from pointing its entrypoint outside itself.
- **port effort:** Low for the multi-entrypoint idea; the error-code allowlist and the containment check are both small and worth copying. | **idea only:** True
## opencode.71 Trust boundary implemented as a swappable layer node

- **where:** packages/server/src/workerd.ts:79-90, ConfigPluginSource.empty at packages/core/src/config/plugin/source.ts:101-110
- **what:** The workerd (Cloudflare Durable Object) profile replaces ConfigPluginSource.node with ConfigPluginSource.empty, so ONLY internal and SDK plugins load — no plugin-directory scan, no npm install, no import of plugin code from disk. The same file replaces Database, Snapshot, Vcs, FileSystem, Pty, and the process spawner.
- **how:** ConfigPluginSource.node.replace(ConfigPluginSource.empty) inside a LayerNode.Replacements array. `empty` is a second exported node whose operations() returns [] and changes() returns Stream.never.
- **solves:** 'Do not load untrusted plugins' is one line in a dependency-injection graph instead of a security check threaded through the loader.
- **port effort:** Medium. Requires the DI-graph discipline; the payoff is that sandboxing is a config decision, not a code path. | **idea only:** True
## opencode.72 Debounced, coalesced, serialized plugin re-activation

- **where:** packages/core/src/plugin/supervisor.ts:196-237
- **what:** Six trigger streams (config source changes, module-graph changes, a 24h tick, bus plugin.updated + sdk.plugin.updated, update-service changes) feed a sliding Queue of size 1. The initial activation runs immediately; later triggers are debounced 100ms. A single consumer serializes them. A generation counter discards stale async update-check results, and a hold/release brackets each activation.
- **how:** Stream.concat(Stream.succeed(0), Stream.fromQueue(triggers).pipe(Stream.debounce('100 millis'))).pipe(Stream.runForEach(target => { yield* activate(); if (observed !== target) return; const settled = release; release = undefined; if (settled) yield* settled }))
- **solves:** Saving a config file that touches 40 plugins triggers one re-activation, not 40; and a slow periodic update check cannot land on top of an in-flight reload.
- **port effort:** Low. Standard debounce+coalesce, but the 'run initial activation immediately, debounce only later' split and the observed-counter guard are the details that matter. | **idea only:** True
## opencode.73 Two-phase activation: load what is local, then install what is missing

- **where:** packages/core/src/plugin/supervisor.ts:154-174, :58-88
- **what:** resolve() is called twice: first with install:false so everything already available activates immediately; only if any operation came back `pending` (a package not yet installed) is it called again with install:true. A failed reload keeps the previously running generation in place rather than dropping the plugin.
- **how:** const immediate = yield* resolve(modules, pre, post, operations, false, running); yield* apply(immediate); const resolved = immediate.pending.length ? yield* resolve(modules, pre, post, operations, true, running) : immediate; if (resolved !== immediate) yield* apply(resolved); running = resolved.packages;
- **solves:** Startup does not block on npm install for plugins you already have; a broken new revision does not evict a working one.
- **port effort:** Medium. The 'activate local first, install in background' split is a startup-latency decision worth copying. | **idea only:** True
## opencode.74 Tool snapshot immutability under concurrent transforms

- **where:** packages/tui/../packages/core/src/tool.ts (snapshot()), tool namespace in packages/plugin/src/promise/tool.ts:26-36, host.ts:453-458; documented at services/www/src/docs/content/build/plugins/index.mdx:971-977
- **what:** Each model request captures a stable, executable tool snapshot (Tool.Service.snapshot()). Later transforms, reloads, and disposals affect only future snapshots, never the executors already captured. Namespaces prefix tool names (acme_greeting); dots and unsupported characters in namespaces become underscore.
- **how:** Because State.get() returns a NEW value per rebuild and never mutates earlier ones, a snapshot is just a retained reference. This falls out of the replay design rather than needing separate copy logic.
- **solves:** A plugin editing the tool registry mid-turn cannot change the tool set of a request already in flight.
- **port effort:** Low given the replay substrate; High if built on a mutating registry. The dependency on capability #1 should be explicit. | **idea only:** True
## opencode.75 TUI slot tree with five placements and deterministic degradation

- **where:** packages/plugin/src/tui/context.ts:180-243 (SlotMap, SlotClaim), packages/tui/src/plugin/structure.ts:60-147 (resolveSlots), packages/tui/src/plugin/api.tsx:270-284
- **what:** A SEPARATE plugin system for the terminal UI. ui.slot(claim) with exactly one of prepend/append/before/after/replace against one of 9 published paths. resolution: last-enabled wins per replace target; an ancestor replacement beats a descendant regardless of enable order ('hierarchy beats timeline'); claims inside a replaced boundary are SUPPRESSED AND RECORDED (never silently dropped); a claim aimed at a vanished path DEGRADES to append on the nearest surviving ancestor, except replacements which are suppressed outright.
- **how:** resolveSlots({paths, claims}) is a pure function — no solid, no I/O — explicitly written so every policy rule is testable as a data transform. Exactly-one-placement is enforced both by a discriminated union (?: never) and at runtime for untyped plugins.
- **solves:** Third-party UI extensions cannot corrupt the host layout, and cannot silently vanish: suppressed and degraded claims are both returned as diagnostics.
- **port effort:** High. Entirely Solid/JSX-specific to opencode's TUI. The pure-resolver-with-diagnostics shape and the degradation rule are the transferable ideas. | **idea only:** True
## opencode.76 TUI plugin context with per-activation disposal ownership

- **where:** packages/tui/src/plugin/api.tsx:81-288; public contract at packages/plugin/src/tui/plugin.ts and packages/plugin/src/tui/context.ts (532 lines)
- **what:** createPluginContext builds the whole TUI API from host services, pushing every registration's unregister onto an `owned: Dispose[]` array that is drained when the activation is disposed. Surfaces: client, data, attention, theme, keymap (layer/dispatch/shortcuts/commands/pending/active/mode), storage (namespaced plugin.<id>.<key>), markdown.registerCodeBlockRenderer, ui.dialog (alert/confirm/prompt/select), ui.toast, ui.router.register, ui.panel.open, ui.tabs, ui.model, ui.slot.
- **how:** const registration = (kind, name) => { let registered = true; const unregister = () => { if (!registered) return; registered = false; if (!input.registry.active()) return; input.registry.remove(kind, name) }; input.owned.push(async () => unregister()); return unregister }
- **solves:** A TUI plugin that throws during setup still unregisters everything it managed to register, and unregistering after deactivation is an explicit no-op rather than a race.
- **port effort:** Medium for the ownership-array pattern (portable to any UI plugin API); the specific surfaces are opencode-specific. | **idea only:** True
## opencode.77 A shipped npm package that is itself a built-in plugin

- **where:** packages/plugin-browser/src/index.ts:4-12, imported at packages/core/src/plugin/internal.ts:89 and listed at :217; packages/tui/src/plugin/builtins.ts:12-13
- **what:** @opencode/plugin-browser is a separately published package whose default export is a plugin (`opencode.browser`). It is imported as a value into the internal `pre` array, so it goes through the exact same load/activate/transform path as a user plugin. TUI does the same with @opencode/latex/plugin and @opencode/merman/plugin.
- **how:** import BrowserPlugin from '@opencode/plugin-browser'  ->  BrowserPlugin,  in the `pre` array
- **solves:** Proves the plugin boundary is real rather than aspirational: the maintainers ship first-party functionality through it, so the seam is exercised in CI.
- **port effort:** Low. The discipline is the point. | **idea only:** True
## opencode.78 One npm package, two isomorphic API flavours over the same 25 domains

- **where:** packages/plugin/src/promise/plugin.ts vs packages/plugin/src/effect/plugin.ts, packages/plugin/src/promise/adapter.ts (622 lines), packages/plugin/AGENTS.md
- **what:** @opencode/plugin exports both a Promise API (the default) and an Effect API (./effect) with structurally identical Context shapes. Promise plugins are lifted by an adapter (PluginPromise.fromPromise) into the Effect runtime, which is what actually runs. AGENTS.md states the rule: every domain must extend the corresponding client API interface and only add plugin-specific functions.
- **how:** packages/core/src/plugin/internal.ts:280-284 wraps each internal plugin's effect with Effect.provide(context); module.ts:116 picks `"effect" in value ? value : PluginPromise.fromPromise(value)`.
- **solves:** Third parties write ordinary async TypeScript; the runtime stays Effect-only internally. Disposal, event streams, and AbortSignal all bridge correctly (verified by promise-tool.test.ts, which asserts a Promise tool executor's AbortSignal aborts on Fiber.interrupt).
- **port effort:** High. The dual-flavour surface is a maintenance tax; the rule that domains extend the HTTP client interface (so plugin methods and client methods cannot drift) is the cheap, high-value part. | **idea only:** True
## opencode.79 Plugin inventory as a first-class observable with failed slots retained

- **where:** packages/schema/src/plugin.ts, packages/core/src/plugin.ts:118-127 and :281-292, packages/core/src/plugin/host.ts:419-421
- **what:** ctx.plugin.list() returns Plugin.Info[] covering built-in, package, local, and sdk sources, each with {id, source{target,version,outdated,updating}, features{server,tui,rpc}, state{active|failed{error,ref}}}. Failed setups are kept as entries, not dropped. The registry short-circuits when the recomputed inventory JSON is byte-identical, so a no-op re-activation publishes no event.
- **how:** if (JSON.stringify(inventory) === JSON.stringify(nextInventory)) return  // then bus.publish(Plugin.Event.Updated, {})
- **solves:** Users can see which plugins are active, which are outdated, and which failed and why, without a debug flag. The JSON short-circuit avoids a UI re-render storm.
- **port effort:** Low. The inventory-as-public-API decision is worth copying even without the Effect substrate. | **idea only:** False
## opencode.80 Plugin management CLI treats Server and TUI as separate runtimes

- **where:** packages/cli/src/commands/handlers/plugin/{add,remove,list,check,update,inventory}.ts, inventory.ts:10-27
- **what:** opencode plugin add|list|check|update|remove. `check` and `update` iterate items tagged runtime:'Server' | 'TUI', matching a package's resolved entrypoints to decide which runtime(s) it serves. Local plugins and exact package revisions are skipped by update.
- **how:** const entrypoints = Host.resolve(installed); const target = configurationTarget(entrypoints.server, entrypoints.tui)
- **solves:** Because there are two plugin systems, a user must be able to see which one a given package actually installed into.
- **port effort:** Low. Directly useful if omp ever has a TUI and a headless mode with separate extension channels. | **idea only:** True
## opencode.81 MCP client (stdio + streamable HTTP + OAuth)

- **where:** packages/core/src/mcp/{index.ts 830, client.ts 338, stdio.ts 177, instructions.ts 111} = 1962 LOC
- **what:** Location-scoped MCP client over @modelcontextprotocol/client v2. Supports 2 transports (local stdio via command array, remote via url+headers) and 3 protocol-negotiation modes (legacy <=2025-11-25, auto-probe 2026-07-28, forced 2026-07-28). 3-phase timeouts: startup 30s, catalog 30s, execution 12h. 5 statuses. Full resource model (Resource/ResourceTemplate/ResourceCatalog).
- **how:** One `Mcp.Service` per Location; a `State.Transformable<Editor>` registry (list/get/set/update/remove) of ServerConfig; one stable tool transform that reads latest discovered tools, refreshed by a 100ms-debounced `McpEvent.ToolsChanged` subscription calling `tools.reload()` rather than re-registering (preserves later plugin override precedence). Shared remote endpoints gated by a `KeyedMutex` so concurrent startup bursts don't stampede.
- **solves:** Scales to many MCP servers without re-registering the tool registry on every tools/list change, and without one startup burst per duplicate remote URL.
- **port effort:** medium — the layering is Effect-heavy (Latch, KeyedMutex, Semaphore, PubSub.sliding + debounce); omp uses plain TS. The 3-phase timeout split and the debounced-reload-instead-of-re-register trick are the portable parts. | **idea only:** True
## opencode.82 MCP OAuth with credential-backed token store

- **where:** packages/core/src/mcp/oauth.ts (506 LOC) + packages/core/src/credential.ts + credential/sql.ts
- **what:** Full OAuth client-provider implementing discovery, authorization-code flow with a configurable callback port, and token persistence that round-trips through the global credential store rather than a process-local cache.
- **how:** `provider(options): OAuthClientProvider` with `Store` (client-info + tokens + code-verifier) and `clientFromCredential` / `toCredential` / `toTokens`; remote servers registered as OAuth integrations get an `integrationID` on the Server entry so clients match by identity rather than by colliding name.
- **solves:** MCP remote auth survives restarts and name collisions; `needs_auth` is a first-class status, not an error string.
- **port effort:** medium — omp has its own credential plumbing; the identity-not-name matching rule is the idea worth taking. | **idea only:** True
## opencode.83 MCP tools as namespaced registry entries

- **where:** packages/core/src/tool/mcp.ts:17-19 (namespace/name fns), :50 (codemode: tool.codemode !== false)
- **what:** Each discovered MCP tool becomes a registry entry named `<server>_<tool>` with the non-alphanumeric chars of the server name replaced by `_`. Defaults into CodeMode unless the server sets `codemode: false`.
- **how:** Single `tools.transform` adding every discovered tool, each with a `permission.assert` before `mcp.callTool`; NotFoundError/ToolCallError mapped to `ToolFailure`; binary content parts become `data:` file parts; when the server declares no outputSchema, text starting with `{`/`[` is JSON.parse'd.
- **solves:** N namespaced tools from N servers without name collisions and without a per-server dispatch branch.
- **port effort:** low — the namespacing + refresh strategy is directly portable; the Effect plumbing is not. | **idea only:** True
## opencode.84 MCP resource read/list as first-class tools

- **where:** packages/core/src/tool/plugin/mcp-resource.ts (101 LOC), plugin id `opencode.tools.mcp-resources`
- **what:** Two tools — `list_mcp_resources` (optional per-server filter; omitting it checks every server so per-server permission rules still apply) and `read_mcp_resource` (server+uri, promotes image/* and application/pdf blobs to model-visible file parts).
- **how:** Permission asserts use `resources:[servers]` for list and `[server:uri]` for read; over-sized output is truncated with the full content written to a file the model can then read.
- **solves:** Lets the model reach MCP resources (docs, records, custom-scheme URIs) without a separate tool per resource kind, and keeps permission granularity per-URI.
- **port effort:** low | **idea only:** True
## opencode.85 MCP server instructions injected as delimited system content

- **where:** packages/core/src/mcp/instructions.ts (111 LOC)
- **what:** Per-server `instructions` are wrapped in `<mcp_instructions><server name="...">...</server></mcp_instructions>` and injected into the session context; CodeMode servers additionally get the line telling the model to reach them via `execute` -> `tools[namespace]`.
- **how:** `Instructions.diffByKey` renders additions/removals as small deltas and only restates the full list when something changed.
- **solves:** Keeps prompt tokens stable across reconnects; a flaky MCP server that reconnects repeatedly does not rewrite the whole instruction block each time.
- **port effort:** low | **idea only:** True
## opencode.86 CodeMode — collapse N tools into one `execute` tool running a sandboxed JS interpreter

- **where:** packages/codemode/ (10,764 LOC) + packages/core/src/codemode/{tool.ts, catalog.ts, instructions.ts, web.ts}
- **what:** A 10.8k-LOC JS interpreter (interpreter 4729 + stdlib 3565 + openapi 1294) with 20 test262 conformance suites. Every `codemode: true` tool is invoked as `tools.<namespace>.<tool>(input)` from model-written JS, and the whole set collapses to ONE native tool named `execute` returning `{output, toolCalls, error?, files}`.
- **how:** `CodeModeTool` builds a nested Tool/Namespace tree, emits TypeScript-style signatures into the prompt, and `codemode/catalog.ts` summarizes the inventory under a 2000-char inline budget, keeping every namespace visible and spending the rest on one full listing per namespace per round (shortest first).
- **solves:** A 60-tool agent does not need 60 native tool schemas in every request.
- **port effort:** very high — 10.8k LOC plus a JS interpreter is a multi-month build, not a port. Only the budgeted-catalog idea is cheap. | **idea only:** True
## opencode.87 models.dev as the model catalog, committed as a snapshot

- **where:** packages/core/src/models-dev.ts (453 LOC) + models-dev/snapshot.txt (4.9 MB)
- **what:** 223 providers / 8179 models in a 4.9 MB committed `snapshot.txt`, with live refresh, Schedule, Semaphore and content hashing. Per-model facts include family, release date, attachment/reasoning flags, reasoning-options shape (effort ladder / toggle / budget_tokens), temperature support, tool_call, interleaved-thinking, 4-way modality input/output, cost (incl. cache read/write, tiered >200k context, context_over_200k) and limits.
- **how:** `import snapshotText from "./models-dev/snapshot.txt" with { type: "text" }` so the catalog ships in the binary; live fetch is hashed and reconciled against the snapshot.
- **solves:** Model metadata works offline and in compiled binaries without a network round-trip.
- **port effort:** medium — the snapshot-as-asset idea is directly portable; the schema is much richer than omp's models.json. | **idea only:** True
## opencode.88 Provider split: wire adapters vs. wiring plugins

- **where:** packages/ai/src/providers/ (43 modules) + packages/core/src/plugin/provider/ (34 plugins)
- **what:** Two independent registries. 43 wire-protocol adapters in packages/ai/src/providers/ (auth + request shape + response parse), and 34 wiring plugins in packages/core/src/plugin/provider/ (OAuth flow, dynamic model lists, endpoint discovery). 63 protocol files totalling 13,228 LOC.
- **how:** Adapters compose: e.g. zai, zai-coding-plan, moonshot, minimax, meta, alibaba, openai each ship a chat/messages/responses triple over a shared base. Local/self-hosted runtimes (ollama, lmstudio, vllm, digitalocean, modal, nvidia) are plugins, not adapters.
- **solves:** Adding a provider with an unusual request shape does not touch the auth/discovery layer and vice versa.
- **port effort:** high — this is a large surface, but the two-registry split is a clean idea omp could adopt. | **idea only:** True
