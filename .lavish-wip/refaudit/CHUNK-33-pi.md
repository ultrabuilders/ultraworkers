# pi — chunk 3/5 (22 năng lực)

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
