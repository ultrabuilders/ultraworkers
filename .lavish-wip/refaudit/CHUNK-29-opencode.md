# opencode — chunk 5/6 (22 năng lực)

## opencode.89 Runtime npm provider loading

- **where:** packages/core/src/plugin/provider/sdk-factory.ts + dynamic.ts, backed by packages/util/src/npm.ts (20 KB)
- **what:** A configured provider whose `package` is set and whose SDK is not bundled is installed from the npm registry at runtime, then its first `create*` export is used as the SDK factory.
- **how:** `loadSDKFactory` -> `npm.add(packageName)` (with `file://` passthrough, registry/slug parsing, cache keys) -> `resolveModule` -> `importModule` -> first export matching `/^create/`.
- **solves:** New providers ship without a core rebuild or binary re-release.
- **port effort:** medium — the idea is portable but the runtime-install-and-execute posture is a supply-chain decision, not just an engineering one. | **idea only:** True
## opencode.90 Transport abstraction over HTTP and WebSocket for LLM calls

- **where:** packages/ai/src/route/ (3015 LOC: client 699, websocket 526, media 416, executor 274, auth 169, framing 114)
- **what:** A `Transport<Body, Prepared, Frame>` interface with `HttpTransport` and `WebSocketTransport` implementations, plus channel/checkpoint/continuation types (open-responses-channel, responses-checkpoint, responses-continuation).
- **how:** `prepare` then `execute(prepared, request, runtime, options)` returning a `Stream<Frame, AIError>`; `complete?` is the optional successful-consumption ack that HTTP leaves absent.
- **solves:** Providers that keep a socket open (channel-style APIs) reuse the same protocol code as plain HTTP streaming.
- **port effort:** high | **idea only:** True
## opencode.91 SQLite via drizzle with 3 runtime shims + 48 migrations

- **where:** packages/core/src/database/ — schema.gen.ts (raw SQL), migration/ (48 files), sqlite.{bun,node,workerd}.ts
- **what:** 19 tables / 16 indexes. Session state is event-sourced: `session_inbox`, `session_pending`, `event_sequence`, `event`, with delivery/admission/compaction sequence indexes. Credentials live in the `credential` table.
- **how:** Package.json `imports` map resolves `#sqlite` (and `#pty`, `#fff`, `#photon-wasm`, `#shell-parser-wasm`, `#process-lock-ffi`, `#v1-migration`, `#persistent-pty-binary`) per runtime condition (workerd/bun/node). drizzle is wrapped in an Effect layer (`sqlite-core/effect/{select,insert,update,delete,query,raw,count,session}`).
- **solves:** One binary serves CLI, Bun server and Cloudflare Workers; the inbox/pending split gives durable, resumable tool-result delivery.
- **port effort:** medium — omp is Bun-only so the shim layer is unnecessary; the inbox/pending event-sourcing is the interesting part. | **idea only:** True
## opencode.92 Git checkpoint model via tree objects, not stash or commits

- **where:** packages/core/src/git.ts (758 LOC, `Git.Service`); worktree at worktree/git.ts (39 LOC)
- **what:** `tree.capture` writes a Git tree object returning a branded `TreeID`; `tree.diff(from,to)` diffs two TreeIDs; `tree.restore(files)` restores by TreeID. Alongside: repo discover/clone, remote get, history (head/branch/defaultRemoteBranch/rootCommits), sync (fetchRemotes/fetchBranch/checkoutRemoteBranch/resetHard), worktree create/remove/list, and a scoped `index.refresh`.
- **how:** Writes go to the index and a tree object, never to a commit on the user's branch — so agent edits are reversible without polluting history.
- **solves:** Agent-driven edits need undo that does not create commits or stashes in the user's repository.
- **port effort:** medium — the idea is excellent and portable; omp would need a different implementation since `@oh-my-pi/pi-natives/vcs` is the sanctioned wrapper. | **idea only:** True
## opencode.93 Pluggable VCS adapter with a second implementation (Mercurial)

- **where:** packages/core/src/vcs.ts (the service) + plugin/vcs/{git.ts 604, hg.ts 221} + vcs/patch.ts (106)
- **what:** A `Vcs.Adapter` interface (`info`, optional `base`, `branches`, `status`, `diff`) with a registry keyed by provider id, a selectable default, and TWO shipped adapters: git (604 LOC) and hg (221 LOC). Branch refresh is driven by filesystem-watching the store's HEAD/branch file.
- **how:** Each provider shells only read-only commands (git: status, diff, show, config, remote, for-each-ref, merge-base, rev-parse). `diff` output is byte-capped by `MAX_TOTAL_PATCH_BYTES` with per-file `emptyPatch()` substitution past the cap. Provider failures degrade to `[]`/warn-log for info/branches/status but surface as a typed `DiffError` for base/diff.
- **solves:** Diffs/undo work in any VCS the user actually uses, and a broken provider degrades the UI instead of crashing the session.
- **port effort:** medium-high — a genuinely good idea; hg support is a real differentiator. | **idea only:** True
## opencode.94 File-backed shell output with cursor reads and bounded in-memory tail

- **where:** packages/core/src/shell.ts (455) + shell/{scan.ts 1500, parse.ts 373, select.ts 227, result.ts 81} = 2659 LOC
- **what:** Every `create` spawns one command, writes combined stdout/stderr to `sh_<12 hex>*.out`, and returns an id. Clients poll `get`, read `output` by cursor, and `wait` resolves once at a terminal state. 7-day retention, hourly cleanup sweep, 25 exited processes kept in memory.
- **how:** Combined output goes to a file; the tool returns a bounded tail plus the full-output path. Shell parsing is tree-sitter WASM (bash + powershell) with bun/node/workerd shims.
- **solves:** Long builds and dev servers do not blow up the model's context, and the model can still recover the full output.
- **port effort:** low-medium — omp has AGENTS.md-sanctioned output caps already; the cursor-read + file handoff shape is the transferable part. | **idea only:** True
## opencode.95 Desktop-attached browser with a raw TCP tunnel

- **where:** packages/plugin-browser/ (1491 LOC: rpc.ts 560, proxy.ts 327, connection.ts 222, tools.ts 133, tunnel.ts 127, files.ts 109)
- **what:** 39 operations (tabs, preview/navigate/reload/frames/snapshot/find/evaluate/click/fill/fill_form/select/check/press/scroll/wait/screenshot/dialog, files, console, network, trace, cpu, heap, lighthouse) dispatched over RPC to an attached desktop app, plus a 64-connection raw `node:net` tunnel for port-forwarding into the browser's network.
- **how:** Per-`Session.ID` `Attachment{connectionID, state, closed, pending, tunnels}`. Proxy generates 16-byte user + 32-byte password per instance and checks with `timingSafeEqual`. Namespace description tells the model page content/logs/headers are untrusted data, never instructions.
- **solves:** Browser automation without shipping a browser, and without the agent holding CDP credentials.
- **port effort:** high — the desktop-attachment topology is a product decision, not a module. omp has a `browser-use` skill instead. | **idea only:** True
## opencode.96 Effect-based HTTP client binding with runtime-safe deep imports

- **where:** packages/util/src/effect/app-node-platform.ts
- **what:** One `FetchHttpClient.layer` bound to `HttpClient.HttpClient` as a global node, with deep imports instead of the platform barrel because the barrel eagerly pulls undici/ioredis/node:sqlite that workerd cannot load.
- **how:** `makeGlobalNode({service: HttpClient.HttpClient, layer: FetchHttpClient.layer, deps: []})`; same file also binds FileSystem and Path.
- **solves:** One HTTP client for CLI, server and Workers without a per-runtime fork.
- **port effort:** n/a for omp (Bun-only, no Effect) | **idea only:** False
## opencode.97 Typed REST contract with 138 endpoints, dual Promise/Effect clients

- **where:** packages/protocol/src/groups/ (30 groups) + packages/client/src/{promise,effect}/generated + packages/sdk/
- **what:** 30 groups totalling 138 endpoints (65 GET, 48 POST, 15 DELETE, 5 PUT, 5 PATCH), annotated with OpenApi identifiers/summaries, plus a dual-flavor generated client (promise/ and effect/) and an Effect-native `rpc.ts` group.
- **how:** `HttpApiGroup.make(...).add(HttpApiEndpoint.get(...).annotateMerge(OpenApi.annotations({...})))`; codegen limitation documented in-code: "the client codegen flattens payload fields and cannot represent a top-level union payload" — worked around by wrapping in a Struct.
- **solves:** The REST surface and the generated clients cannot drift.
- **port effort:** medium — omp has no Effect HttpApi; the group-per-domain layout is the transferable part. | **idea only:** True
## opencode.98 Integration registry with 4 credential kinds

- **where:** packages/core/src/integration.ts (33 KB) + packages/schema/src/integration.ts + server/src/handlers/integration.ts (11 endpoints)
- **what:** Integrations are typed as `oauth` | `command` | `key` | `env`, each with an attempt lifecycle (pending/complete/failed/expired) recorded with timestamps. Remote MCP servers register here rather than keeping ad-hoc credentials.
- **how:** Credential rows carry `integration_id`, `connector_id`, `method_id`, `active`.
- **solves:** One place to enumerate "what is connected", regardless of whether the secret arrived via OAuth, a CLI command, an API key or an env var.
- **port effort:** medium | **idea only:** True
## opencode.99 5 websearch backends behind one tool

- **where:** packages/core/src/plugin/websearch/ (519 LOC) + core/src/websearch.ts (9.1 KB)
- **what:** exa, firecrawl, tavily, tinyfish and a generic MCP backend behind a single `websearch` tool, with a `parallel` coordinator.
- **how:** Per-provider plugin modules resolved through the same `...WebSearchPlugins` spread in the internal registry.
- **solves:** Swapping search vendors without touching the agent loop.
- **port effort:** low | **idea only:** True
## opencode.100 Effect-service permission ruleset engine

- **where:** packages/core/src/permission.ts (343 lines), schema in packages/schema/src/permission.ts
- **what:** Last-match-wins evaluation over a flat merged ruleset (`findLast` on wildcard action+resource), with an explicit deny pre-pass, a separate always-allow tier, and an in-memory pending-request registry backed by Deferred.
- **how:** `configured()` merges agent rules then session rules (session wins); `denied()` short-circuits on any deny match before allow/ask are considered; `all = [...rules, ...savedRules()]` puts persisted grants last so they win; `create()` publishes `permission.asked` and parks a Deferred the tool call awaits.
- **solves:** Gives one authoritative gate every tool must pass, with a rule format simple enough to put in JSONC and a decision model that is auditable from a single file.
- **port effort:** Medium-high — the shape ports, but Effect's service/layer/Deferred idiom is load-bearing; omp would need a re-implementation in its own runtime. | **idea only:** True
## opencode.101 Reject-cascade and always-cascade

- **where:** packages/core/src/permission.ts:276-292 and :304-318
- **what:** Rejecting one pending request fails every other pending request in the same session; answering "always" re-evaluates all pendings and auto-succeeds those the new grant now covers.
- **how:** The reject branch iterates `pending` and fails every item whose `sessionID` matches; the always branch calls `evaluateInput` per pending and succeeds those returning `allow`.
- **solves:** Parallel tool calls produce concurrent prompts. Without a cascade, rejecting one leaves sibling calls hanging forever with a prompt nobody will ever see.
- **port effort:** Low — ~30 lines of logic, directly portable. | **idea only:** True
## opencode.102 Decline-as-defect tunnel

- **where:** packages/core/src/permission.ts:253, with the rationale written out in the comment at :248-252 and the counterpart documented at packages/core/src/session/model-request.ts:358
- **what:** A user decline is converted into an Effect *defect* (`Effect.die`) rather than a typed failure, so a model's blanket error handler cannot swallow it and turn "I declined" into ordinary tool output.
- **how:** `Effect.catchTag("Permission.DeclinedError", (e) => Effect.die(e))`. A decline WITH feedback stays a typed `CorrectedError` so the leaf can render `ToolFailure` and the model continues.
- **solves:** Distinguishes "the tool failed" from "the human said no" — without it an agent retries a rejected action forever because the refusal reads as a normal error.
- **port effort:** Low as a concept (needs a way to express an uncatchable rejection in omp's runtime). | **idea only:** True
## opencode.103 Two-tier external-directory boundary

- **where:** packages/core/src/file-access.ts:99-148
- **what:** Crossing the project root is its own permission action (`external_directory`) with its own prompt, checked *before* the per-action check, and it inherits no implicit trust.
- **how:** Internal paths get a location-relative resource string and no directory gate; external paths get an absolute `<dir>/*` resource plus a `save` value scoped to the enclosing git project root. `authorizeExternal` batches and dedupes all touched dirs into one prompt.
- **solves:** Makes "read a file outside the workspace" a distinct, single, batchable decision instead of an emergent property of path arithmetic in every tool.
- **port effort:** Medium — the design ports cleanly; note the lexical-vs-physical gap in findings. | **idea only:** True
## opencode.104 Deny-by-default allowlist agents

- **where:** packages/core/src/plugin/agent.ts:106-128
- **what:** The `explore` subagent starts from `{action:"*",resource:"*",effect:"deny"}` and then allowlists exactly what it needs (grep, glob, webfetch, websearch, read, plus subagent deny).
- **how:** Permission.merge of a deny-all rule followed by explicit allows; because evaluation is last-match-wins the allowlist reliably overrides the catch-all.
- **solves:** A read-only subagent stays read-only as tools are ADDED later — new tools inherit the deny, not the allow.
- **port effort:** Low. | **idea only:** True
## opencode.105 Persist-on-always with project scoping and a uniqueness index

- **where:** packages/core/src/permission/saved.ts:63-78, permission/sql.ts:19
- **what:** "Always allow" writes a rule to SQLite keyed by (project, action, resource) with `onConflictDoNothing`, so grants survive restarts and cannot duplicate.
- **how:** The tool supplies a `save: string[]` of patterns; the permission service writes them verbatim as allow rules.
- **solves:** A user does not re-click the same prompt every session. The persistence semantics are the problem — see findings 2 and 3.
- **port effort:** Low as a mechanism; the *granularity* of `save` must be fixed before porting. | **idea only:** True
## opencode.106 HMAC session tokens derived from the server password

- **where:** packages/server/src/auth.ts:39-66
- **what:** Browser sessions are stateless bearer tokens signed with a key derived from the server password, so rotating the password revokes every outstanding session at once.
- **how:** Double HMAC-SHA256 (`password` -> key -> payload), base64url, `expires.signature`; `timingSafeEqual` guarded by an explicit length check; constant-time compare.
- **solves:** Avoids a server-side session store while keeping revocation a one-attribute change.
- **port effort:** Low. | **idea only:** True
## opencode.107 Same-origin guard on cookie auth

- **where:** packages/server/src/middleware/authorization.ts, function `authorizedSessionCookie`
- **what:** Because cookies are scoped by host and not port, a session cookie IS sent to other localhost ports. The middleware explicitly refuses to honor it when the Origin host differs from the Host header.
- **how:** `if (origin !== undefined && URL.parse(origin)?.host !== request.headers.host) return false`, with the cross-port hazard written into a comment.
- **solves:** Closes cookie replay from any other local dev server, which is the single most realistic CSRF vector for a localhost-bound agent server.
- **port effort:** Low. | **idea only:** True
## opencode.108 Single-use scoped tickets for un-headerable transports

- **where:** packages/core/src/pty/ticket.ts, packages/server/src/pairing.ts
- **what:** WebSocket/PTY upgrades cannot carry an Authorization header, so they get short-lived single-use tickets scoped to (ptyID, directory, workspaceID), and pairing links get 5-minute single-use codes.
- **how:** `Cache.invalidateWhen(cache, ticket, stored => matches(stored, input))` gives atomic single-use consumption AND scope checking in one step. Both services pass a `lookup` that calls `Effect.die`, so any misuse of `Cache.get` fails loudly instead of silently returning a miss.
- **solves:** Authenticates a browser-initiated connection that cannot set headers, without a long-lived token and without a ticket usable against a different resource.
- **port effort:** Low — the `invalidateWhen` predicate trick is the reusable part. | **idea only:** True
## opencode.109 Lease credential scrubbed from the tool environment

- **where:** packages/cli/src/server-process.ts:70-86
- **what:** The background service generates a random 32-byte password when none is configured, and explicitly deletes it from the environment in stdio mode so spawned tools cannot read the server's own credential out of `process.env`.
- **how:** `delete process.env.OPENCODE_PASSWORD` before spawning, with the reason in a comment.
- **solves:** An agent that runs `env` must not be able to capture the credential that gates the agent's own API — which would make the permission system a speed bump against a full-API bypass.
- **port effort:** Low. | **idea only:** True
## opencode.110 Append-only shared log with in-place compaction

- **where:** packages/util/src/observability/logging.ts:6-13, 79-157
- **what:** Every opencode process on the machine appends to one file; instead of rotating (which would rename over the file and strand other processes on an unlinked inode) it compacts in place past 50MB down to 25MB, hourly.
- **how:** Cross-process exclusion via atomic `mkdir` (the one primitive that is atomic on every platform), `acquireRelease` so the mkdir is uninterruptible and a closing scope cannot leak a lock, a 5-minute stale-lock breaker, and a forward copy whose write cursor always trails its read cursor so concurrent appends survive.
- **solves:** Multi-process log capture with a hard size bound, without losing another process's output to a rename.
- **port effort:** Medium — the reasoning is the value; the mkdir-as-lock and the documented loss window are both worth copying verbatim. | **idea only:** True
