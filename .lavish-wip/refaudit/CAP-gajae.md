# Năng lực đo được — `gajae` — 111 mục

gajae — NOTICE declares MuPDF.js AGPL-3.0-or-later.

Nguồn: 6 lens (structure, agent-core, plugin, surface, integration, ops); mọi con số đo bằng lệnh thật.
`idea only=true` = KHÔNG được chép code, chỉ mang ý tưởng.
`port effort` là ước lượng của người kiểm kê, KHÔNG phải số đo.

## gajae.1 Auth broker + provider-scoped auth gateway

- **where:** packages/ai/src/auth-broker/ (8 files, 3400 lines), packages/ai/src/auth-gateway/ (4 files, 1773 lines), packages/coding-agent/src/cli/auth-broker-cli.ts, auth-gateway-cli.ts, src/session/startup-auth-config.ts. Design doc: docs/auth-broker-gateway.md (205 lines).
- **what:** Two cooperating HTTP services that move OAuth refresh tokens off developer machines. `gjc auth-broker serve` owns a canonical SQLite credential vault, runs a background refresher, and exposes a small REST surface (/v1/snapshot, /v1/credential/:id/refresh, /v1/credential/:id/disable, /v1/usage, /v1/usage/scoped, /v1/healthz). `gjc auth-gateway serve --provider=<p>` is a provider-scoped forward proxy that accepts OpenAI Chat Completions / Anthropic Messages / OpenAI Responses, injects the broker-resolved access token, and dispatches only through that provider's catalog. Clients (containers, widgets, IDE plugins) never see a token. Includes redact.ts for log hygiene and remote-store.ts (RemoteAuthCredentialStore) that pulls /v1/snapshot at boot and re-refreshes by id on expiry.
- **how:** Broker holds refresh tokens and does the OAuth dance; gateway is a dumb injecting proxy scoped to one provider. Transport security is delegated to the operator (Tailscale/Wireguard/TLS). Every endpoint except /healthz requires a bearer token when bearer auth is configured; --no-auth is accepted only on a loopback bind and an unauthenticated non-loopback bind is rejected at startup.
- **solves:** Teams/CI/containers that need LLM access without ever holding a provider access token, and without every client reimplementing OAuth refresh. Cuts credential blast radius to a single host.
- **port effort:** Medium — ~5.2K lines, self-contained, no TUI/native coupling. The broker is a SQLite-backed service and the gateway is a thin provider proxy; both sit below the agent loop and can be lifted nearly as-is. | **idea only:** False

## gajae.2 Managed task DAG with deterministic dependency-based readiness

- **where:** docs/managed-task-dag.md (160 lines, explicit 'domain and verification contract'); implementation spread across packages/coding-agent/src/harness-control-plane/ (19 files, 5278 lines) and src/gjc-runtime/ (62 files, 49577 lines) incl. managed-owner-admission.ts, managed-owner-supervisor.ts, workflow-manifest.ts, ralplan-runtime.ts, ultragoal-runtime.ts.
- **what:** A private durable domain for multi-node task graphs with resource reservations. Readiness is purely a function of an accepted current predecessor *verification vector* — explicitly never from `terminal_ok`, an accepted seed, valid JSON, or a closed worker. M1 stores reservations with `accepted: null` so successors stay unready until later trusted verification. Resource overlap is domain-wide across graph runs. Duplicate ids, missing predecessors, cycles, extra keys, empty validation lists, and unauthorized bindings are rejected before mutation.
- **how:** One v1 snapshot per enrolled control root at <canonicalControlRoot>/.gjc/managed-task-domain/state.json — no filesystem hunting, no per-run copies, commonDir is not root authority. Enrollment records canonical real paths plus directory device/inode identity; changed or escaped bindings refuse later admission. Fails closed on missing/corrupt/non-object/extra-key/binding-mismatched state. Post-rename sync or audit failure is treated as *potentially committed*: reload authoritative state, never retry with a new key.
- **solves:** Subagent/task orchestration that reports DONE based on observable facts rather than a worker self-asserting success. Directly attacks the 'subagent said it finished but didn't' failure class, and adds cross-run resource mutual exclusion.
- **port effort:** High effort, high payoff. The *invariants* (readiness-from-verification-vector, fail-closed state, never-retry-after-possible-commit) are cheap to adopt as a discipline. The full implementation is a durable-state machine with locks, sidecars, and supervisors — months of work to replicate faithfully. | **idea only:** True

## gajae.3 Capability-scoped opaque session attachments (SessionRouter)

- **where:** packages/coding-agent/src/sdk/router/ (3 files, 2585 lines), src/sdk/broker/ (30 files, 24950 lines), src/sdk/host/ (23 files, 20957 lines). Docs: docs/sdk.md (989 lines), docs/external-control-readiness.md (144 lines), docs/sdk-session-cli.md, docs/adr-abort-sdk-terminal-turn-owned.md, docs/sdk-owned-session-lifecycle-handoff.md.
- **what:** A single attachment authority that hands external integrations opaque `SessionAttachment` capabilities instead of endpoints or credentials. SDK core owns *all* managed attachment discovery and every credential-bearing client; Telegram, Discord, Slack, ACP, MCP, and CLI adapters receive only capability-scoped operations. Lifecycle mutations must go through `SessionLifecycleService` + the Broker ledger; read-only uncertain-create reconciliation uses a public `session.lookup` with the original request key.
- **how:** Hard prohibitions stated as contract: endpoint URL/token discovery, raw WebSocket relays, and `gjc sdk serve` are NOT public attachment mechanisms; lifecycle-equivalent per-session controls are prohibited on every adapter. Retired surfaces (`--mode rpc`, `--mode rpc-ui`, `--mode bridge`) are removed outright rather than left as compat shims. `gjc sdk session list|inspect|send|status|tail|close|retire` emits credential-free JSON (text on stderr for ordinary failures, JSON only with explicit --json).
- **solves:** Chat-bot control of coding agents tends to leak credentials and grows a parallel session-management API per surface. This collapses it to one authority with capability handles and a written list of forbidden mechanisms.
- **port effort:** Medium. The rule set (what is public, what is forbidden, what each adapter may not do) is pure design and worth adopting verbatim. The Broker/Host/Router machinery is ~53K lines — too large to lift wholesale. | **idea only:** True

## gajae.4 Turn-scoped vs owned-scoped abort with bounded idempotency keys

- **where:** docs/external-control-readiness.md ('Turn-end termination of owned work'); packages/coding-agent/src/sdk/acp/ (4 files, 1143 lines); test coverage in packages/coding-agent/test/coordinator-mcp-server.test.ts (12238 lines) and sdk-broker-lifecycle-e2e.test.ts (7084 lines).
- **what:** A cancel model with two explicit scopes. `scope:"turn"` (the ACP session/cancel default) stops only the active turn while leaving owned background work — spawned Bash/task jobs, detached subagents — running, and lets that work's completion resume the root worker as a fresh turn. `scope:"owned"` additionally stops exact owned work, so an external controller that ends a run terminates everything it started.
- **how:** A fresh bounded idempotency key is minted per cancel so retries replay deterministically. A cancel with no active turn is a deterministic no-op, not an error. This is recorded as ADR adr-abort-sdk-terminal-turn-owned.md.
- **solves:** Two opposing bugs: (a) cancelling a turn leaves orphaned background subagents burning tokens forever; (b) cancelling everything the agent spawned is surprising when a client only meant 'stop this turn'. Also makes cancel safe to retry across a flaky transport.
- **port effort:** Low. Small, well-specified, and a strict improvement over an undifferentiated 'stop'. | **idea only:** True

## gajae.5 Two-tier blob vs artifact storage with internal URL schemes

- **where:** docs/blob-artifact-architecture.md (249 lines); SessionManager constructs BlobStore(getBlobsDir()); ArtifactManager derives its dir from the session path. Related: src/internal-urls/ (17 files, 3016 lines) with a generated docs-index.
- **what:** Two deliberately separate persistence systems with different jobs. Content-addressed blobs (`blob:sha256:<hash>`, global dir, no extension) deduplicate and give stable references for large image base64 and provider data URLs. Session-scoped artifacts (files under `<sessionFile-without-.jsonl>/`) hold full truncated tool output (`<numericId>.<toolType>.log`) and subagent output (`<outputId>.md`) for append-only tooling and human/tool retrieval. Internal URL schemes `artifact://` and `agent://` resolve back to stored data.
- **how:** Same binary content across sessions resolves to the same hash/path, so writes are idempotent at the content level and blobs outlive any individual session file. The two systems are not merged: dedup-stable-reference vs local-id-append-only.
- **solves:** Session JSONL blows up when images and long tool outputs go inline. Splitting by access-pattern (dedup-stable vs local-append) avoids the usual wrong answer of one store trying to do both.
- **port effort:** Low-medium. Well-specified, self-contained, and directly applicable to any session-log design. | **idea only:** True

## gajae.6 Profiling corpus with evidence-class gating (replaces static hotspot maps)

- **where:** docs/hotspot-map-successor.md (12 lines, the successor pointer), docs/perf-profiling-corpus.md, docs/native-ffi-optimization-policy.md, docs/cpu-hotspot-map.json + .review.json + .verify.txt, packages/coding-agent/bench/ (24 files, 10071 lines) incl. perf-corpus-rlm-analysis.py, packages/natives/bench/.
- **what:** A retired 11-CPU/5-memory static hotspot map explicitly demoted in favor of a measured profiling corpus. Evidence classes: wallClockPhase, processCpuUsage, profilerSelfTime, rssMemory, byteParity. The rule: a hotspot may be labeled 'CPU-self-time confirmed' ONLY when a profilerSelfTime artifact exists; otherwise it must be classified covered-current, not-visible, needs-trace-coverage, or fallback-toggle-confirmed. Native algorithmic ports are gated behind a separate FFI policy doc.
- **how:** The old map's own `method` field admitted real CPU self-time was 'to be measured by the agreed profiling corpus' — so the map shipped as a guess. The successor makes measurement a precondition for the claim and enumerates the honest fallback labels.
- **solves:** Perf work justified by an aesthetic ranking table (algorithmic complexity x guess at trigger frequency) rather than measurement — a common way to spend a quarter optimizing something that was never hot.
- **port effort:** Low for the *policy* (the evidence classes and the honest-label vocabulary). Medium for standing up an actual corpus with recorded artifacts. | **idea only:** True

## gajae.7 Compile entrypoint discipline with inline release-regression notes

- **where:** packages/coding-agent/scripts/compile-args.ts (buildCompileArgs/buildReleaseCompileArgs/buildDevCompileArgs, releaseEntrypoints, devEntrypoints, compileAutoloadDisableFlags, compiledDefineFlags); consumed by scripts/ci-release-build-binaries.ts:125.
- **what:** Explicit release vs dev entrypoint lists for `bun build --compile` (9 release entrypoints: cli.ts, stats/sync-worker, browser/tab-worker-entry, eval/js/worker-entry, atomic-yaml-patch-worker, coordinator-sidecar-bootstrap-worker, natives/native/index.js, telegram-daemon-cli, chat-daemon-cli), with the reasoning for each omission recorded as an inline NOTE.
- **how:** The NOTEs are the real value and are placed exactly where a future editor would 'clean them up': `models.json must NOT be listed here — bun build --compile does not emit .json extra entrypoints into the bunfs` (embedded via `with { type: "file" }` instead); and `handlebars must NOT be listed here either — the extra entrypoint silently vanished from minified bundles and crashed v0.9.3–v0.9.6 releases at startup (#1939)`.
- **solves:** Compiled-binary entrypoint bugs that only appear in minified release builds. omp already solved the adjacent worker-host problem; this is the same class of knowledge, recorded next to the code.
- **port effort:** Very low — the pattern and the habit of writing the why inline. | **idea only:** True

## gajae.8 50-file multi-provider layer including a reverse-engineered Cursor protobuf provider

- **where:** packages/ai/src/providers/ (50 flat files + cursor/ and openai-codex/ subdirs, 59 files, 59536 lines); packages/ai/src/providers/cursor/gen/agent_pb.ts is 19780 generated lines, produced by packages/ai/scripts/proto-extractor.py.
- **what:** 50 provider files covering far more than the usual OpenAI/Anthropic split: amazon-bedrock (with hand-rolled aws-sigv4.ts, aws-eventstream.ts, aws-credential-config.ts), anthropic, anthropic-messages-server, azure-openai-responses, cursor, devin-acp, gitlab-duo, google (gemini, vertex, gemini-cli), kimi, kiro-codewhisperer + kiro-api-key, ollama, openai-responses / chat / completions / openai-codex-responses / openai-opencodex-responses, opencode-go-session, pi-native-client/server, synthetic, mock, plus cross-cutting vision-guard, grammar, composer-discipline, transform-messages, vision and error-message helpers. The Cursor provider ships generated protobuf (gen/agent_pb.ts).
- **how:** Distinct wire dialects get their own file rather than branching inside one adapter (e.g. openai-codex-responses vs openai-opencodex-responses vs openai-responses are three files). aws-sigv4 and aws-eventstream are hand-rolled rather than pulled from the SDK, presumably to avoid the AWS SDK's weight.
- **solves:** Provider access to subscription/enterprise endpoints that have no public API — Cursor, Copilot-style CodeWhisperer, Kiro, Devin, GitLab Duo, OpenCode Go. This is where a harness gains reach its users actually have.
- **port effort:** High per provider, low per pattern. Each adapter is small and independent; the file-per-dialect discipline and the hand-rolled signing are the transferable parts. NOTE: several of these route through endpoints whose terms may not permit third-party clients — vet before porting any specific one. | **idea only:** True

## gajae.9 Stream Deck hardware control surface for tmux/cmux sessions

- **where:** integrations/streamdeck-cmux/ (91 files, 10285 lines); docs/streamdeck-integration-guide-with-cmux.md; docs/terminal-app-integrations.md.
- **what:** A 91-file physical control surface driving tmux/cmux panes and tabs from a Stream Deck: focus-state.js with tests, per-answer buttons with distinct recommended/selected/control-disabled visual states (answer-0 through answer-4), cmux nextPane/prevPane/nextTab/prevTab/statusWindow, control-clear/control-btw, worktree-session bin scripts, and install.sh.
- **how:** Plugin-style layout (bin/plugin, bin/worktree-session, focus-state.js + focus-state.test.js, images/) that drives an external multiplexer; focus state is modelled as a testable JS module rather than UI glue.
- **solves:** Makes agent session control usable without returning to the keyboard — answering a prompt, switching worktree panes, aborting a run from a desk device.
- **port effort:** Medium. The concept is portable but it presumes a Stream Deck SDK and a tmux/cmux-shaped session layout. | **idea only:** True

## gajae.10 Generated, diff-checked SDK skills and dual-target plugin packaging

- **where:** sdk-skills/ (6 files, 570 lines), plugins/ (12 files, 305 lines); generators scripts/generate-gjc-sdk-skills.ts, scripts/generate-gjc-plugins.ts; wired into root check:ts via check:sdk-closure.
- **what:** The agent is taught to author against its own SDK. `sdk-skills/` ships gjc-sdk-author (SKILL.md + direct-sdk.ts + direct-sdk.py templates), gjc-sdk-discover, and gjc-sdk-operate, plus a manifest.json. The skills are GENERATED and gated in CI: `generate-sdk-skills` then `check:sdk-skills` = `generate-gjc-sdk-skills.ts --check && verify-gjc-sdk-skills.ts`, and a matching `check:plugins` / `check:sdk-closure` chain. The same plugin is published to two ecosystems from one source: plugins/.claude-plugin/marketplace.json and plugins/.agents/plugins/marketplace.json, plugins/gajae-code/.claude-plugin/plugin.json AND .codex-plugin/plugin.json, with .mcp.json and .codex.mcp.json.
- **how:** Generate -> `--check` in CI -> separate verify script. Because the skills describe the SDK surface, drift is caught mechanically rather than by review.
- **solves:** Hand-written agent-facing documentation of an API rots silently. Making it generated + diff-checked means the instructions cannot disagree with the code.
- **port effort:** Medium. The generate/check/verify triple is easy; authoring a good SDK-authoring skill is the real work. | **idea only:** True

## gajae.11 Coordinator MCP server as the multi-session control surface

- **where:** packages/coding-agent/src/coordinator-mcp/ (12 files, 17842 lines); server.ts alone is 11748 lines. Tests: test/coordinator-mcp-server.test.ts (12238 lines), test/sdk-host-wiring.test.ts (9570 lines). Docs: docs/external-control-readiness.md (supported-surfaces table).
- **what:** A 12-file MCP server, 17,842 lines, that is the sanctioned way for a controller to orchestrate many sessions: multi-session orchestration, durable reports, worktree-scoped lifecycle ops. Includes codex-handoff.ts and codex-wake-publisher.ts, durability.ts, event-webhook.ts, model-preset.ts, policy.ts, safety.ts, question-gate-codec.ts + question-state.ts, projection-scan.ts, session-reaper.ts. Served via `gjc mcp-serve coordinator`.
- **how:** Question gating is modelled as a codec + explicit state machine, so a controller can block a session on a decision and later observe the answer. A session reaper handles abandoned sessions.
- **solves:** Driving many agent sessions from outside the TUI without granting the outside world a WebSocket or a token. Also gives remote control a first-class, auditable surface.
- **port effort:** High. server.ts at 11,748 lines is itself a maintainability problem (see findings); the surface split and the question-gate concept are the portable parts. | **idea only:** True

## gajae.12 Agent tool surface breadth (92 tool files)

- **where:** packages/coding-agent/src/tools/ (140 files, 59085 lines) with subdirs browser/, computer/, puppeteer/, recipe/; rendered through renderers.ts, render-utils.ts, grouped-file-output.ts, subagent-render.ts.
- **what:** Beyond the standard edit/read/bash/write/find/grep: subagent, job, cron, monitor, review, eval, checkpoint, bisect, conflict-detect, ask (with a contract + registry), todo-write (with contract), skill + skill-discovery, computer (with enforcement and red-team tests), browser (puppeteer-backed, with tab workers), python, sqlite-reader, ast-grep, ast-edit, render-mermaid, image-gen, archive-reader, irc, telegram-send, resolve, json-tree, calculator, vim, ssh, yield, file-recorder, resource-gc, steer-fold, hindsight-{recall,reflect,retain}, move-session.
- **how:** Contract files (ask-contract.ts, todo-contract.ts, descriptor-validation.ts) pair with each non-trivial tool, and the red-team/enforcement tests sit next to the tool rather than in a separate suite. Several tools are policy-guarded at the tool level (composer-bash-policy.ts, plan-mode-guard.ts, ultragoal-ask-guard.ts, tmux-self-injection-guard.ts, computer-policy.ts, restricted-role-agent-bash.ts).
- **solves:** Coverage of workflows omp's default toolset misses, plus the observation that policy belongs at the tool boundary (where the argument is visible) rather than only in the prompt.
- **port effort:** Varies hugely per tool. The *pattern* of a contract file + policy guard + red-team test next to each privileged tool is the reusable idea. | **idea only:** True

## gajae.13 Vendored shell engine and Rust core with pinned, patched crates

- **where:** crates/brush-core-vendored (107 files, 28201 lines), crates/brush-builtins-vendored (59 files, 11486 lines), crates/pi-shell (104 files, 19649 lines), crates/pi-natives (47 files, 44066 lines), crates/pi-iso, crates/pi-ast, crates/gjc-sdk. Root Cargo.toml [patch.crates-io] + [workspace] exclude list.
- **what:** brush-core 0.5.0 and brush-builtins 0.2.0 are vendored into-tree and wired via [patch.crates-io] rather than pulled from the registry, alongside first-party pi-natives, pi-shell, pi-iso, pi-ast, and gjc-sdk.
- **how:** Vendoring plus a workspace `exclude` (so the vendored trees are not members) plus `[patch.crates-io]` path overrides — the standard way to carry a patched dependency without it being linted as your own code.
- **solves:** Needing real shell builtins/completion behavior in-process without paying the registry version, and needing the patch to survive.
- **port effort:** Low to adopt the *mechanism*; the vendored payload itself is 40K lines of someone else's MIT code (reuben olinsky) that omp may already have. | **idea only:** True

## gajae.14 Cargo panic-strategy profiles driven by a real constraint

- **where:** Root Cargo.toml [profile.release] (panic=abort), [profile.dist], [profile.ci], [profile.local], [profile.dev]; the guard itself is crates/pi-natives/src/task.rs.
- **what:** Five build profiles (release, dist, ci, local, dev) where the non-obvious choice is `panic = "unwind"` on ci/local/dist even though release uses `panic = "abort"`, with the reason recorded inline.
- **how:** Inline comment at [profile.ci]: 'Override release's panic = "abort": the pi-natives blocking-task catch_unwind guard (crates/pi-natives/src/task.rs) only converts panics to napi::Error when the shipped profile unwinds. `panic` is a profile-root-only setting and cannot be scoped per-package, so it is set on every profile build-native.ts ships.' dev also sets split-debuginfo="unpacked" and a [profile.dev.package."*"] opt-level bump for deps.
- **solves:** A native-crate panic silently becoming an uncatchable process abort in shipped builds — a class of bug that only appears in the compiled binary.
- **port effort:** Very low. Directly applicable to any napi/native crate with a catch_unwind guard. | **idea only:** True

## gajae.15 External-attachment policy expressed as a written surface table

- **where:** docs/external-control-readiness.md (144 lines); reinforced by scripts/verify-gjc-sdk-canonicalization.ts (2100+ lines) which fails if a removed surface is re-exported from the package manifest, and by docs/adr-abort-sdk-terminal-turn-owned.md.
- **what:** A short table naming each supported external control surface, its entrypoint, and *when to use it* — SDK session CLI, Coordinator MCP, managed adapter (Telegram/Discord/Slack), ACP — plus an explicit list of what was removed and must not return (`--mode rpc`, `--mode rpc-ui`, `--mode bridge`, `gjc sdk serve`) with the note that they 'are not compatibility interfaces'.
- **how:** The canonicalization verifier greps the built package manifest for retired export subpaths and fails the build if any reappears — policy enforced mechanically, not by review.
- **solves:** Surface sprawl: every new integration adds a new way to control sessions until nobody can say which is supported. A table plus a mechanical drift check keeps the list honest.
- **port effort:** Low. The table is free; the verifier is a few hundred lines. | **idea only:** True

## gajae.16 Per-version CI task matrix with affected-task sharding

- **where:** .github/workflows/ci.yml (5 workflows total), scripts/ci-dev-affected.ts (2269 lines) + .test.ts (2178), scripts/run-bun-test-files.test.ts, scripts/ci-risk-canary-manifest.test.ts, scripts/ci-main-native-recovery.test.ts, scripts/check-workflow-permissions.test.ts.
- **what:** CI computes a task matrix from the diff and runs shards, with a 'Fail closed unless every shard succeeded' gate and a 'Require the complete main verification graph' check — so a shard that silently no-ops fails the build. Includes native-addon variant verification and ACP conformance as first-class jobs.
- **how:** Sharding by affected area is only safe if the 'every shard ran' property is asserted; that assertion is a separate named CI step rather than an implicit side effect.
- **solves:** Diff-based test selection that passes green because the selector matched nothing — the standard failure mode of affected-based CI.
- **port effort:** Medium. The pattern (assert completeness separately) is the idea; the 2269-line selector is the implementation. | **idea only:** True

## gajae.17 Capability registry with priority-ordered providers (control inversion)

- **where:** packages/coding-agent/src/capability/ (16 files, 2,267 LOC); types in capability/types.ts; registry in capability/index.ts (740 LOC); provider self-registration in capability/index.ts:228 registerProvider()
- **what:** 14 capability kinds (mcps, skills, hooks, tools, prompts, rules, instructions, settings, context-files, slash-commands, system-prompt, ssh, extensions, extension-modules) each satisfied by registered Providers carrying id/displayName/description/priority. Each Capability defines `key(item)` for dedup, optional `validate`, optional `toExtensionId`. `loadCapability()` merges across providers, highest priority wins, and returns both `items` and `all` (shadowed duplicates kept for diagnostics).
- **how:** defineCapability() then registerProvider('<capability-id>', { id, displayName, priority, load(ctx) }). discovery/index.ts imports every provider module for side-effect registration.
- **solves:** Callers stop hardcoding provider-specific paths (`.gjc`, `.gemini`, `.vscode`, `.claude`). The header comment states it outright: 'instead of callers knowing provider-specific paths ... they simply ask for load("mcps") and get back a unified array'. Adding an 11th competitor tool is one new provider file, zero changes to any consumer.
- **port effort:** High — 2,267 LOC, but the concept ports as ~300 LOC of registry + one provider per source. The priority/dedup/shadow-record model is the transferable part. | **idea only:** True

## gajae.18 Multi-host config ingestion (11 competitor tools as providers)

- **where:** packages/coding-agent/src/discovery/ (19 modules); per-provider root table at capability/index.ts EXPLICIT_HOME_PROVIDER_ROOTS
- **what:** 45 provider registrations across 14 discovery modules read config from Claude Code, Codex, Gemini, OpenCode, Cursor, Windsurf, Cline, GitHub Copilot, agents.md, mcp.json and ssh.json into the same 14 capabilities.
- **how:** Each provider module calls registerProvider on import. The explicit-home isolation test uses fs.realpath on the deepest existing ancestor and re-appends the not-yet-created suffix.
- **solves:** Zero-friction adoption — a user's existing .claude/settings.json and .mcp.json keep working. capability/index.ts hardcodes EXPLICIT_HOME_PROVIDER_ROOTS per provider so a caller-supplied home boundary is respected, with canonicalizeThroughExistingAncestor() to defeat symlinked-ancestor escapes out of the home.
- **port effort:** Medium — 16 of the 45 registrations are the `builtin` provider alone. Porting the *pattern* (priority bands: 100+ primary, 50-99 tool-specific, 1-49 shared standards) is cheap. | **idea only:** True

## gajae.19 Extension API — 43 typed events plus tool/command/shortcut/flag/provider registration

- **where:** packages/coding-agent/src/extensibility/extensions/types.ts (1,823 LOC); ExtensionAPI at line 1174, Extension at line 1778
- **what:** TypeScript modules exporting `default (pi: ExtensionAPI) => void`. `pi.on()` has 43 typed overloads spanning session (start/switch/branch/compact/tree/shutdown), context, provider request/response, agent (start/failed/end), turn, message, reasoning, tool execution, compaction/retry, input, tool_call/tool_result, user_bash/user_python. Plus registerTool, registerCommand, registerShortcut, registerFlag, registerMessageRenderer, registerProvider, setActiveTools, sendMessage/sendUserMessage, exec, UI primitives.
- **how:** Factory receives the API object; loader collects into Extension { handlers, tools, messageRenderers, commands, flags, shortcuts } maps. Examples: hello.ts (registerTool + injected zod), pirate.ts (registerCommand + before_agent_start rewriting the system prompt).
- **solves:** The actual extension-authoring contract. Publicly exported and exercised by 6 shipped examples.
- **port effort:** High — this is 6,325 LOC and the heart of the system. Event taxonomy is reusable; the exact payloads are not. | **idea only:** False

## gajae.20 Capability-scoped function hooks with a host-owned ceiling

- **where:** packages/coding-agent/src/extensibility/extensions/function-hooks.ts (959 LOC)
- **what:** 19-capability vocabulary in 6 parent families: tool(inspect/transform/deny), ui(status/widget/notify/transform), session(read/message/deny), audit(append), network(fetch), filesystem(read). Parents expand only to children via CAPABILITY_OPERATIONS. Grants carry capabilities + networkDestinations + filesystemRoots.
- **how:** registerFunctionHook() computes intersectFunctionHookGrants(normalize(options), DEFAULT_EXTENSION_FUNCTION_HOOK_GRANT) at loader.ts:298 and stores the *attenuated* grant on the registration. Attenuation can only remove (attenuateFunctionHookGrant filters expanded operations).
- **solves:** Kills the 'extension does whatever it wants' problem structurally. The extension declares what it wants; the host computes the ceiling; the runtime gets the intersection. Documentation comment: 'The host supplies grants; an extension cannot self-grant capabilities.'
- **port effort:** Medium — the vocabulary + intersection + attenuation + redaction is ~400 lines of pure logic and ports nearly verbatim. This is the single most copyable piece. | **idea only:** True

## gajae.21 Bounded redacting payload serializer for audit/observability

- **where:** packages/coding-agent/src/extensibility/extensions/function-hooks.ts:349
- **what:** redactFunctionHookValue() walks arbitrary values with: control-char strip, 512-char string cap, sensitive-key regex (token|secret|password|credential|authorization|cookie|private|api-key|bearer) -> '<redacted>', depth limit 5 -> '<depth-limit>', WeakSet cycle detection, arrays capped at 32, keys sorted and capped at 32. Critically it uses getOwnPropertyDescriptor and emits '<accessor>' for getters — accessors are never invoked.
- **how:** Also produces functionHookPayloadHash (sha256 over the redacted form) used as an audit fingerprint.
- **solves:** Any plugin-controlled object that reaches a log or audit sink is bounded and cannot execute attacker code or leak secrets via a getter.
- **port effort:** Low — ~40 lines, self-contained, no dependencies beyond redactCrashSecrets. | **idea only:** True

## gajae.22 GJC plugin bundles — extend-only manifest with forbidden surfaces

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/schema.ts:29 FORBIDDEN_MANIFEST_KEYS + :36 FORBIDDEN_SURFACE_DIAGNOSTICS; documented in docs/gjc-plugins.md
- **what:** `gajae-plugin.json` (kind: 'gajae-code-plugin') with 6 surfaces: subskills, tools, hooks, mcps, system_appendix, agent_appendix. FORBIDDEN_MANIFEST_KEYS = ['skills','slash-commands','commands','agents'] each rejected with a targeted migration diagnostic naming the safe alternative. A bundle can only bind sub-skills to the 4 protected workflow skills or the 4 role agents.
- **how:** parseManifest() rejects forbidden keys with a per-key diagnostic. Alias normalization: 'mcpServers' accepted and compiled byte-equivalent to canonical 'mcps'; ambiguous 'mcp' rejected as unsupported_surface.
- **solves:** Stops plugins from forking the agent's core surface. Every refusal is actionable ('use .gjc/commands/<name> instead') rather than a generic unknown-key error.
- **port effort:** Low as policy (~40 lines of key list), high as implementation (686-line schema). The forbid-list-with-diagnostics pattern is the idea worth taking. | **idea only:** True

## gajae.23 Two-tier hook trust — constrained API for third-party bundles

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/constrained-hooks.ts (532 LOC), header at line 21
- **what:** Bundle hooks do NOT get the broad first-party API. DENIED_API_METHODS = ['sendMessage','appendEntry','registerMessageRenderer','registerCommand','exec'] all throw security_policy. After the factory runs, the loader verifies it registered exactly the declared event and nothing more, else the surface is quarantined with runtime_mismatch.
- **how:** ConstrainedPluginHook interface; resolveConstrainedHookFile does lexical resolveWithinRoot + fs.realpath on both root and file to defeat symlink swap.
- **solves:** Third-party code can observe and transform one declared event but cannot mutate session state, register UI, or spawn shells.
- **port effort:** Medium — the deny-list + post-hoc registration audit is a genuinely novel, compact pattern (~100 lines core). | **idea only:** True

## gajae.24 Deny-first MCP network policy with rebinding defence

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/mcp-policy.ts (268 LOC); isDeniedIpv4 at line 28, expandIpv6 follows
- **what:** Applied at BOTH install validation and runtime connect. HTTPS only. Denies loopback/private/link-local/multicast/unspecified IPv4 plus the 169.254.169.254 metadata endpoint, across IPv4, IPv6, IPv4-mapped and IPv4-compatible forms, zone-id (%eth0) and trailing-dot variants. URL credentials and CRLF headers rejected. stdio confined to bare node/bun with the bundled entrypoint first.
- **how:** DNS is re-resolved immediately before connect. Runtime execution currently admits Node .mjs on Linux only — Bun, macOS and Windows stdio launches FAIL CLOSED until equivalent loader and owner/process-tree authority exists.
- **solves:** A plugin-declared MCP server cannot silently reach cloud metadata or an internal network, and cannot be DNS-rebound into one between validation and connect.
- **port effort:** Medium — the IP-range denial table ports directly; the launch-capsule machinery (authenticated snapshot outside workspace roots, canonical Node bytes from the OS PATH, 8192-file/128 MiB snapshot bound, 512 MiB interpreter bound) is deep and Linux-specific. | **idea only:** True

## gajae.25 Compile-validate-then-copy install with hash-drift quarantine

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/installer.ts, compiler.ts (569 LOC), session-validation.ts, lifecycle.ts (1,089 LOC — the ONLY policy and persistence writer)
- **what:** Install reads manifest, frontmatter and declared files as BYTES ONLY — plugin code is never imported during validation. Then collision + MCP policy enforcement, copy of validated hashed files into a temp sibling, atomic rename, registry written last under a per-scope lock. On failure nothing is mutated. Re-installing identical content is a no-op; different content needs --force. At session start installed files are re-hashed against the registry; any drift quarantines the plugin.
- **how:** compiler.ts opens files with O_RDONLY | O_NOFOLLOW (non-Windows) and treats ELOOP as security_policy. 16 MiB per-file cap. Stable per-surface extension IDs: tool:<name>, hook:<event>:<phase>:<target>:<name>, mcp:<name>, subskill:<parent>:<phase>:<arg>.
- **solves:** Install is transactional and idempotent, and a plugin edited on disk after install is caught rather than silently executed.
- **port effort:** Medium-high. The O_NOFOLLOW + byte-only validation + hash-drift quarantine is reusable; the registry/reconciliation layer is bespoke. | **idea only:** True

## gajae.26 Two-tier sub-skill advertisement (metadata vs full body)

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/activation.ts, subskill-authority.ts, state.ts; documented in docs/gjc-plugins.md 'Sub-skills: Tier-1 vs Tier-2'
- **what:** Tier-1 advertises installed sub-skills bound to a parent as a bounded list (plugin/name/description/activation_arg/phase; max 12 items, 200-char descriptions, 4 KiB block, with an overflow note) in the target parent's prompt only — never the global surface, never body content. Tier-2 injects the full body as a <gjc-subskill> block on explicit activation (e.g. `deep-interview --autoresearch`) or an agent's contextual choice.
- **how:** resolveSubskillActivationForSkillInvocation() scans the registry, matches parent == invoked skill name, parses the --arg token out of the argument string, and returns cleanedArgs plus the activation.
- **solves:** A marketplace of 50 plugins does not blow the context window of every turn, while still making every plugin discoverable at the moment it is relevant.
- **port effort:** Low — the advertise-on-demand / activate-for-body split is ~150 lines and is the cleanest idea in the repo for a plugin marketplace that must not pollute context. | **idea only:** True

## gajae.27 Append-only prompt appendices as lower-authority injection

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/prompt-appendix.ts (161 LOC)
- **what:** system_appendix and agent_appendix inject text as delimited <gjc-plugin-system-appendix> / <gjc-plugin-agent-appendix> blocks appended AFTER the base/project prompt, size-capped 8 KiB per appendix and 32 KiB total, fail-closed, content escaped and control-char sanitized.
- **how:** Rendered after the base prompt; the doc states plainly 'They can never override base/developer instructions.'
- **solves:** A plugin can add policy text but structurally cannot override base or developer instructions — the ordering and the delimiter make the authority boundary visible in the transcript.
- **port effort:** Low — ~150 lines, directly portable. | **idea only:** True

## gajae.28 npm-distributed plugins with feature flags and a settings schema

- **where:** packages/coding-agent/src/extensibility/plugins/ (types.ts, loader.ts, manager.ts 920 LOC, installer.ts); CLI at cli/plugin-cli.ts (PluginFeature, config list/get/set/delete/validate)
- **what:** A third plugin format: package.json with a `gjc` or `pi` field declaring tools/hooks/extensions/commands entry points, plus `features` (each with default-on and additional extensions/tools/hooks/commands entry points) for selective install, plus a `settings` JSON-schema block validated by validateSetting/parseSettingValue. Installed to <config>/plugins/node_modules with gjc-plugins.lock.json.
- **how:** getEnabledPlugins() reads package.json deps, intersects with the lockfile and project overrides (plugin-overrides.json under BOTH .gjc and .pi), and resolves manifest entry points.
- **solves:** Selective installation of a large plugin's parts, plus a typed settings contract validated at write time rather than discovered at runtime.
- **port effort:** Medium. The features+settings-schema idea ports; the manager does not. | **idea only:** True

## gajae.29 Marketplace distribution via git clone with provenance re-verification

- **where:** packages/coding-agent/src/extensibility/plugins/marketplace/ (source-resolver.ts 253, fetcher.ts 501, manager.ts 1,981, cache.ts, registry.ts)
- **what:** Marketplace catalogs are git-cloned (github / url / git-subdir / relative / local sources), cached, and plugin sources resolved to absolute local dirs. sourcePin() classifies a source immutable only when it carries a 40-hex-char SHA; assertPinnedSource() refuses marketplace restore without one. verifyResolvedProvenance() re-derives HEAD from the checkout with a fresh rev-parse rather than trusting the resolver.
- **how:** cloneAndReadCatalog() clones into a `.tmp-clone-<ts>` sibling then promotes to final cache location only after a successful read.
- **solves:** A resolver bug or a swapped working tree cannot make the restored bytes differ from the SHA the plan claims to restore.
- **port effort:** Medium — provenance re-derivation is the idea; the 1,981-line manager is not portable. | **idea only:** True

## gajae.30 Single-writer discipline enforced at the barrel

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/index.ts (header comment); lifecycle.ts header at line 49
- **what:** The gjc-plugins barrel deliberately does NOT re-export the mutation primitives. The header states: 'Mutation primitives are deliberately NOT re-exported here: lifecycle.ts is the sole policy and persistence writer, so the installer transaction and the registry writers stay reachable only through their own modules. Re-exporting them would let a caller commit a replacement and bypass the create-only rule.'
- **how:** index.ts exports only specific read-only names from registry (readRegistry, sortRegistryEntries, loadEffectiveGjcPluginRegistry, ...) and omits writeRegistryUnlocked / withRegistryLock.
- **solves:** Prevents the classic 'three code paths write the registry' bug structurally, by controlling what the barrel exports.
- **port effort:** Low — a barrel-hygiene convention, not code. | **idea only:** True

## gajae.31 Runtime finding accumulator — single publisher, generation-fenced consumers

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/runtime-quarantine.ts (139 LOC)
- **what:** Producers (loaders, adapters, validators) hand findings to a caller-owned GjcRuntimeFindingAccumulator; they never publish. Exactly one coordinator publishes a complete generation snapshot, and consumers merge it only when identity AND generation match. Messages are secret-redacted and control-char sanitized, capped at 2048 chars.
- **how:** gjcActivationGenerationFor() derives a deterministic safe-integer generation from the activation fingerprint's leading 13 hex digits, so equal inputs yield equal generations.
- **solves:** Stops partial-state races where a UI renders findings from a half-updated load, and makes stale-snapshot merges detectable rather than silent.
- **port effort:** Low — ~140 lines, directly portable, and a pattern worth copying for any plugin/extension runtime. | **idea only:** True

## gajae.32 In-TUI extension management surface

- **where:** packages/coding-agent/src/modes/components/extensions/ (6 files)
- **what:** A first-class dashboard: extension-dashboard.ts, extension-list.ts, inspector-panel.ts, state-manager.ts (17 KB) under modes/components/extensions/.
- **how:** Driven by the same capability/discovery layer, so the dashboard shows unified results rather than per-source lists.
- **solves:** Users can see and manage extensions without leaving the TUI — a plugin system that is only CLI-manageable is a plugin system most users never adopt.
- **port effort:** High — TUI-coupled. Verified as present; did not read the implementation. | **idea only:** False

## gajae.33 Extensibility-surface doctor

- **where:** packages/coding-agent/src/cli/customize-doctor.ts (66 KB); SURFACE_ORDER at line 234
- **what:** A 66 KB diagnostics module that classifies every customization surface (mcp, skill, hook, tool, extension, command, plugin-bundle) by source class (canonical / convention / import-candidate / imported / plugin) and reports remediation, including quarantined bundle surfaces.
- **how:** Line 958-959 explicitly tells the user that discovered custom tool modules are shown in the dashboard but standalone sessions do not execute them, pointing at `gjc plugin list` for runtime tools.
- **solves:** With 14 capabilities fed by 11 competitor tools, 'why isn't my hook running' is otherwise unanswerable. The module even states which surfaces are discovered-but-not-executed and why.
- **port effort:** High — 66 KB and highly specific. The surface-class taxonomy is the reusable part. | **idea only:** True

## gajae.34 Deliberate refusal to inherit MCP from other hosts

- **where:** packages/coding-agent/src/discovery/index.ts (comment block before the ./windsurf import)
- **what:** discovery/index.ts carries an explicit note: 'There is deliberately no VS Code provider and no MCP registration in the cursor/gemini/opencode/windsurf providers: GJC does not inherit MCP servers live from other hosts. MCP comes from GJC's own config (builtin, mcp-json), validated plugin bundles, or an explicit `gjc mcp import <host>`.'
- **how:** Import is a transaction (preview normalized result, then write into the chosen canonical .gjc scope), not a runtime precedence rule — tracked as issue #4291.
- **solves:** Picks the safe side of an obvious convenience feature. Inheriting another host's MCP servers would mean executing binaries the user configured somewhere else, under this host's trust.
- **port effort:** Low — it is a decision, not code. | **idea only:** True

## gajae.35 Legacy pi specifier shim

- **where:** packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts (336 LOC); invoked at plugins/loader.ts:16 and extensions/loader.ts:51
- **what:** installLegacyPiSpecifierShim() is called at the top of both the npm plugin loader and the extension loader, letting existing extensions written against the old `pi` package name keep resolving.
- **how:** Module-specifier rewrite at load time.
- **solves:** Backward compatibility across a package rename without breaking third-party extensions mid-flight.
- **port effort:** Low, but only relevant if renaming a published package. | **idea only:** True

## gajae.36 Two-tier remappable keybinding registry with platform-glyph rendering

- **where:** packages/tui/src/keybindings.ts (326 L), packages/coding-agent/src/config/keybindings.ts (724 L), packages/coding-agent/src/modes/action-registry.ts (173 L), docs/keybindings.md (209 L)
- **what:** Two registries: `TUI_KEYBINDINGS` (33 `tui.editor.*` / `tui.input.*` / `tui.select.*` / `tui.global.*` actions) in the tui package, and `KEYBINDINGS` (47 `app.*` actions) in coding-agent. Every action has `defaultKeys: KeyId | KeyId[]` plus a description. User remaps live in `~/.gjc/agent/keybindings.json` (NOT config.yml, and there is deliberately no nested `keybindings` object). Config uses portable canonical IDs (`ctrl+p`, `alt+enter`); the UI renders MacBook glyphs (⌃⌥⇧⌘ ↩⎋⇥⌫⌦) only at display time, so a glyph is never valid config syntax. Setting an action to `[]` disables it. Legacy unqualified names are migrated on load. `docs/keybindings.md` carries a generated per-action audit table, and `test/keybindings-audit.test.ts` fails if a registry action is missing from that table.
- **how:** `Tui.addEventListener`-style dispatch resolves the focused component's `FocusDomain` (composer|selector|overlay|global) via `APP_ACTION_METADATA[].domains`, then matches the chord through `matchesKey(parseKey(raw))` against the effective set from `KeybindingsManager`. `detectDefaultKeyCollisions(definitions)` returns one entry per key claimed by >1 action so intentional cross-context reuse (`Enter` = submit *and* confirm; `Ctrl+C` = copy *and* cancel) is auditable rather than accidental.
- **solves:** Hard-coding chords in a large TUI produces invisible shadowing — `Enter` and `Ctrl+C` mean different things per focused component, and users on terminals that eat `Alt` or `Cmd` have no escape hatch. Splitting action-identity from chord, and separating canonical config from display glyph, makes the whole surface remappable and portable across Apple Terminal / Ghostty / WezTerm / tmux.
- **port effort:** Medium. The split-registry + focus-domain idea is portable as-is; the 80 concrete action IDs and their default chords are surface-specific. The valuable parts to copy are: canonical-textual-ID config, glyph-render-at-display-time, `[]`-to-disable, legacy-name migration, and the drift test that pins the doc table to the registry. | **idea only:** True

## gajae.37 Single declarative slash-command spec consumed by both TUI and ACP dispatchers

- **where:** packages/coding-agent/src/slash-commands/builtin-registry.ts (2,561 L), acp-builtins.ts (63 L), types.ts
- **what:** One `SlashCommandSpec[]` registry (54 entries) drives three surfaces at once: the TUI dispatcher, the ACP `available_commands_update` advertisement, and autocomplete/help metadata. Each spec carries `name`, `description`, `acpDescription`, `inlineHint`/`subcommands`, `priority`, `aliases`, plus two mutually-exclusive handlers — `handle(command, SlashCommandRuntime)` for text/ACP and `handleTui(command, TuiSlashCommandRuntime)` for selectors/wizards/dashboards. `TuiSlashCommandRuntime` is deliberately narrower than `SlashCommandRuntime` so headless code cannot reach TUI state. Commands without a text `handle` are filtered out of the ACP advertisement so clients are never offered a command they cannot drive.
- **how:** `BUILTIN_SLASH_COMMAND_REGISTRY.filter(…)` produces `ACTIVE_BUILTIN_SLASH_COMMAND_REGISTRY`, which is then consumed three ways: `.map()` into `BUILTIN_SLASH_COMMAND_DEFS` (autocomplete), a `Map` built by inserting `name` + every `alias` into `BUILTIN_SLASH_COMMAND_LOOKUP`, and direct export as `BUILTIN_SLASH_COMMANDS_INTERNAL` for the ACP payload. `executeAcpBuiltinSlashCommand` parses, looks up, checks `command.acp === false` (refuse with a message rather than forward to the model), and requires `handle`.
- **solves:** Two dispatchers over one command set is where slash-command surfaces rot: the TUI knows about a command the ACP client never sees, or the client is offered a wizard it cannot drive. A single spec with per-surface description overrides and a `handle`/`handleTui` split makes that drift structurally impossible.
- **port effort:** Medium. The type-level contract (`acpDescription`, `acpInputHint`, `acp: false`, `localHeadless`, `handle` vs `handleTui`) is directly reusable; the 54 command bodies are not. | **idea only:** True

## gajae.38 Host-capability-gated render strategy (viewport-repaint vs full-replay)

- **where:** packages/tui/src/tui.ts lines 470-556 (`shouldProbeSixelCapability`, `shouldUseViewportRepaintForHost`, `shouldUseViewportRepaintForTerminal`), gated by `isMultiplexerSession` / `isWindowsTerminalSession`
- **what:** The TUI does not pick one rendering strategy. Three exported pure predicates decide per-host whether to repaint only the live viewport (cheap, loses durable scrollback) or clear-and-replay the full transcript (expensive, preserves it). The gate reads tmux/screen env (`isMultiplexerSession`), `WT_SESSION`/`TERM_PROGRAM`, and a terminal-reported `isProcessTerminal` capability. It documents a subtle precedence rule in code: a terminal that *answered* `isProcessTerminal === false` must NOT be treated as a native Windows console, because doing so would give every pipe/embedder on Windows viewport-repaint semantics and duplicate contracted rows. There is a `PI_TUI_LEGACY_MULTIPLEXER_FULL_RENDER` escape hatch.
- **how:** The predicates take `(env, platform, options)` and are exported pure so tests can drive every host combination without mutating `process.env`. The capability-report path (`isProcessTerminal !== false` as a Windows fallback, `=== true` as a process-terminal boost) is layered *after* the multiplexer check so a tmux-over-Windows-Terminal session keeps multiplexer precedence.
- **solves:** Clearing and replaying a full transcript inside tmux or a Windows console is visibly hostile (flicker, lost scrollback, doubled rows). But so is viewport-repaint-only when the host has no observable scrollback. There is no single correct answer, so the choice is made per-host and the precedence rules are written down.
- **port effort:** Low. The predicates, the layered precedence, the escape hatch, and the "reported capability outranks platform identity" rule are portable nearly verbatim. | **idea only:** True

## gajae.39 Anchor-based overlay system with percentage sizing and 9 positions

- **where:** packages/tui/src/tui.ts lines 414-605 (`OverlayAnchor`, `OverlayMargin`, `SizeValue`, `OverlayOptions`, `OverlayHandle`)
- **what:** `showOverlay(component, OverlayOptions)` returns a handle with `hide()` / `setHidden()` / `isHidden()`. Positioning supports 9 anchors (center, 4 corners, top/bottom/left/right-center), absolute or percentage `SizeValue`, x/y offsets, per-side margins, and a `visible(termWidth, termHeight)` predicate evaluated each render cycle so an overlay can be responsive rather than re-created.
- **how:** `parseSizeValue` resolves `"50%"` against a reference dimension with `Math.floor`; `finiteNumber`/`finiteNonNegative` sanitize NaN/Infinity from caller input. Used in practice by the command palette fallback (`anchor: "bottom-center", width: "100%", maxHeight: "100%", margin: 0`).
- **solves:** Palette/overlay UIs need to be responsive across an 80×24 terminal and a 160×48 one without re-instantiating the component. A `visible()` predicate plus percentage sizing lets one overlay instance serve every viewport.
- **port effort:** Low. Directly portable; ~150 lines. | **idea only:** False

## gajae.40 Configurable status line built from 22 selectable segment IDs

- **where:** packages/coding-agent/src/config/settings-schema.ts:91 (union), :1204-1206 (left/rightSegments), status line implementation in packages/coding-agent/src/modes/components/status-line/ (13 files, 1,573 L total: segments.ts 658, command.ts 190, presets.ts 116, priority-row.ts 107, token-rate.ts 66, context-thresholds.ts 68, gh.ts 81, model-name.ts 53, separators.ts 55)
- **what:** The status line is not hard-coded. `StatusLineSegmentId` is a 22-member union (`gajae`, `model`, `mode`, `path`, `git`, `pr`, `subagents`, `jobs`, `token_in`, `token_out`, `token_total`, `token_rate`, `cost`, `context_pct`, `context_total`, `time_spent`, `time`, `session`, `hostname`, `cache_read`, `cache_write`, `session_name`, `usage`, `command`). Users compose `statusLine.leftSegments` and `statusLine.rightSegments` arrays. Presets exist. Segments carry a `visible` flag so e.g. git hides itself outside a repo. The model segment suppresses its inline context percentage when a standalone `context_pct` segment is also in the layout, to avoid printing the same number twice.
- **how:** `SegmentContext` batches everything a segment may need (session, cached usage stats computed once per render, contextPercent, contextWindow, subagentCount, jobs snapshot, git branch/status/PR, quota windows with reset times, pending/failed command output) so a 22-segment line does not re-query per segment. `context-thresholds.ts` and `priority-row.ts` handle threshold coloring and multi-line truncation when a segment cannot fit.
- **solves:** A hard-coded status line cannot serve both a 2-segment minimal user and a 20-segment power user on the same terminal width. Making the line a user-ordered list of typed segments, with a "suppress duplicate value" contract between segments, is what makes that work.
- **port effort:** High for the 22 segments; low for the architecture. The per-render cached `SegmentContext` batch and the inter-segment duplicate-suppression contract are the reusable parts. | **idea only:** True

## gajae.41 Settings UI generated from inline schema `ui:` blocks

- **where:** packages/coding-agent/src/config/settings-schema.ts (4,775 L), packages/coding-agent/src/modes/components/settings-defs.ts (195 L, a pure adapter), settings-selector.ts, packages/coding-agent/src/modes/DESIGN.md
- **what:** 362 setting keys live in one 4,775-line schema; 249 of them carry an inline `ui: { tab, label, description, options? }` block and are therefore rendered in the Settings selector. Adding a setting to the UI means adding a `ui` block — there is no parallel UI list to keep in sync. 10 tabs (appearance, model, interaction, context, memory, editing, tools, tasks, providers, notifications). Widget variants: boolean, enum, submenu, and text. Submenus support `onPreview` (live preview while editing) and `onPreviewCancel` (restore prior value). Per-setting `condition()` predicates hide a setting by context.
- **how:** `settings-defs.ts` is a pure read-only adapter: it imports `getUi`, `getType`, `getDefault`, `getEnumValues`, `getPathsForTab`, `SETTING_TABS` from the schema and returns typed `BooleanSettingDef` / `EnumSettingDef` / `SubmenuSettingDef` / text defs. `options: "runtime"` marks a submenu whose choices are injected at runtime (e.g. the theme list) rather than declared statically.
- **solves:** The classic failure is a settings UI that drifts from the settings schema — a new key with no UI, or a UI toggle wired to a renamed key. Making the schema the single declaration point with an optional UI projection removes the second list entirely.
- **port effort:** Medium. The adapter-indirection and the `options: "runtime"` escape hatch are the load-bearing ideas; the 249 individual settings are not portable. | **idea only:** True

## gajae.42 Documented TUI design system with an explicit responsive contract

- **where:** packages/coding-agent/src/modes/DESIGN.md (471 L), docs/ui-design-visual-qa.md, docs/adr-overlay-component-seam.md
- **what:** 471 lines specifying the visual grammar as first-party rules: exact frame anatomy (DynamicBorder rule → TabBar with `(tab to cycle)` hint → `Spacer(1)` → content → closing border), the 2-column SettingsList row (label column capped at 30 visible cells, 2-space gutter, truncated value, centered selected item in `maxVisible`, `(current/total)` scroll position, blank row before the description), focus/cursor/input rules (Up/Down wrap; Escape clears filter before cancel; Tab routes to the tab bar except while a text input owns it), and hard prohibitions (no rounded cards, no shadow, no spinner-as-only-progress-signal, no color-only selection, no JavaScript `string.length` for CJK layout). The responsive contract names three viewports: 80×24, 120×36, 160×48, with a specific budget at 80×24 (the Settings tab bar including Notifications must fit in ≤4 lines, leaving ≥14 content rows).
- **how:** Extracted from the current settings selector and shared TUI components (the doc names its own source files), and states up front that it is implementation guidance rather than a third-party reference or a screenshot substitute. Focus domains come from the action registry, so the doc's "parent routes Tab except while a text input is active" is the same rule the dispatcher implements.
- **solves:** Without a written contract, TUI features accumulate inconsistent padding, inconsistent cursors, and unreadable CJK wrapping, and "make it look nicer" becomes unreviewable. Naming viewports and a row budget turns layout into something you can assert on.
- **port effort:** Low for the contract structure; the specific numbers (30-cell label cap, 4-line budget) are tuned to this surface. | **idea only:** True

## gajae.43 Explicit chrome factory so every compact selector shares one frame

- **where:** packages/coding-agent/src/modes/components/chrome.ts (41 L), consumed by model/provider/theme/pet/plugin/session selectors
- **what:** A 41-line factory builds the border/title/list/border frame used by every compact mode selector, so a new selector cannot invent its own chrome. It also handles `selectedValue` → index mapping and returns both the container and the list so callers can reach the list without a tree search.
- **how:** `FramedSelect(title, items, {maxVisible, selectedValue, onSelect, onCancel, onSelectionChange})` → `Container[DynamicBorder, bold accent title, SelectList, DynamicBorder]`, using `getSelectListTheme()` so the list themes itself from the active theme.
- **solves:** Selector chrome drift — 14 selector components each with slightly different borders, title weights, and cursor glyphs. A factory plus a `get*Theme()` adapter per widget means the theme file is the only place colors are decided.
- **port effort:** Very low. ~40 lines, directly portable. | **idea only:** False

## gajae.44 Command palette with availability gating and a two-path fallback

- **where:** packages/coding-agent/src/modes/components/command-palette.ts (168 L), packages/coding-agent/src/modes/controllers/input-controller.ts:2280-2360, packages/coding-agent/src/modes/components/action-registry consumers
- **what:** Ctrl+P opens a fuzzy-filtered palette over both the 47 app actions and the active slash commands. Entries carry `id`, `label`, `description`, `category`, `keybinding`, `disabled`. Availability-gated actions re-dispatch through `actionRegistry.executeFresh(id)` at press time rather than trusting a stale `disabled` flag. A palette command already in flight blocks re-entry with a status message. If the host provides no `showCommandPalette`, the palette self-hosts as a bottom-center 100%-width overlay so the feature degrades instead of disappearing.
- **how:** `fuzzyFilter(entries, query, e => [e.label, e.description, e.keybinding, e.searchText].join(" "))`; fixed `maxVisible = 8` with the selected row centered. All label/description/keybinding strings pass through `sanitizePaletteText` → `sanitizeStatusText(text.toWellFormed())`, and entry ids are rejected if they contain whitespace or C0/C1 control characters.
- **solves:** A palette over keybindings alone is useless for commands with no binding, and a palette that lists a disabled command is worse than no palette. Folding actions and slash commands into one ranked list, with availability re-checked at press, fixes both.
- **port effort:** Low. The self-hosting fallback and the press-time re-dispatch are the two ideas worth taking. | **idea only:** True

## gajae.45 Typed public command registry with flag validation, conflicts, and sectioned help

- **where:** packages/coding-agent/src/cli/public-command-registry.ts (541 L), packages/coding-agent/src/cli/public-command-entry.ts, public-command-help.ts, public-command-evidence.ts, public-command-errors.ts
- **what:** The `sdk` and `daemon` families are described as data, not code: each node declares `command[]`, `canonicalCommand`, `parent`, `description`, `flags` (each with `kind`, `description`, `char`, `options`, `default`, `conflicts`, `requires`, `risk`, `validation`), `args` (insertion order IS positional order), `children`, `usage`, `examples`, `recovery`, and `constraints`. Validation kinds are enumerated: `positive-safe-integer`, `sha256`, `error-id`, `search-limit`, `pending-ceiling`. Recovery entries are typed by `disruption: "none" | "interrupts-work" | "force-kill"` plus `requiresConfirmation`. Help is paged by section (`overview|usage|children|arguments|options|examples|recovery`) and pinnable to a descriptor SHA256 revision. 22 nodes defined this way.
- **how:** `node(path, input)` builds a descriptor from a space-separated path, deriving `canonicalCommand` and `parent` from the split and auto-merging `PUBLIC_BOUNDARY_FLAGS` (help/json/help-section/help-page/help-revision) into every node plus `PUBLIC_RETRIEVAL_FLAGS` at the root only. `PUBLIC_BOUNDARY_FLAGS` are stripped before operation parsing, so `--help` is inert and never executes an operation.
- **solves:** Hand-written help drifts from the parser. Making the flag table the single data structure — with declared conflicts, requirements, validation, and disruption class — means help, completion, and dispatch all read the same source, and a destructive operation cannot be documented without declaring what it disrupts.
- **port effort:** Medium. The descriptor shape is portable; note this pattern is applied to only 2 of 36 top-level commands, so the repo itself has not proven it at full surface scale. | **idea only:** True

## gajae.46 Terminal graphics capability probing with multiplexer distrust

- **where:** packages/tui/src/tui.ts:492-522 (`shouldProbeSixelCapability`), packages/coding-agent/src/modes/components/pet-capability.ts:15-25, 58-62 (`getPetPixelProtocol`, `isPetAvailable`)
- **what:** Sixel is probed only on Windows Terminal, never when `PI_FORCE_IMAGE_PROTOCOL` is set, and never inside a multiplexer. The stated reason: tmux advertises DA1 `";4"` whenever compiled with sixel support regardless of whether the attached client can render it, so a positive reply is not end-to-end evidence. The pet widget goes further and refuses graphics under tmux/screen/zellij outright unless `PI_FORCE_IMAGE_PROTOCOL=sixel`, with a user-facing warning naming Kitty/Ghostty/WezTerm as working hosts.
- **how:** `getPetPixelProtocol()` returns `"kitty"` only when `TERMINAL.imageProtocol === ImageProtocol.Kitty && !isUnderTerminalMultiplexer()`, `"sixel"` for Sixel, `"iterm"` only after a *verified* availability probe (a separate `setVerifiedItermPetAvailability` gate distinct from the merely-latest value), else `null`. Listeners are notified on change.
- **solves:** Graphics auto-detection produces the worst outcome on the hosts where it matters most — a terminal that advertises a protocol it cannot deliver end to end through a multiplexer. Treating "advertised" and "verified" as distinct states, and refusing under multiplexers by default, avoids a class of garbled-output bugs.
- **port effort:** Very low. The verified-vs-advertised split is the idea; the protocol specifics are not. | **idea only:** True

## gajae.47 Multi-protocol sprite pet with a capability-gated selector

- **where:** packages/tui/src/components/gajae-pet.ts (1,074 L), ouroboros-pet.ts + ouroboros-pet-frames.json, packages/coding-agent/src/modes/components/{iterm-pet-transport.ts 593 L, pet-capability.ts, pet-selector.ts 47 L, gajae-pet-widget.ts}
- **what:** A persistent optional pixel-art widget ("Gajae Pet", plus an Ouroboros variant with a 11 KB frame JSON) that renders over sixel, kitty, or iTerm's inline-image protocol, driven through a dedicated transport module, and surfaced in a selector that shows a "Saved, unavailable — requires compatible Kitty or Sixel overlay rendering" state rather than silently dropping the user's choice when their terminal changes.
- **how:** `getPetPixelProtocol()` selects the transport; `subscribeVerifiedItermPetAvailability()` / `setVerifiedItermPetAvailability()` let the host push probe results back to the widget reactively. The widget occupies its own bottom container (`petFloorContainer`) in the render tree and degrades to nothing when no protocol is available.
- **solves:** A user who configures a graphics-dependent feature and later opens a different terminal should be told why it vanished, not left wondering. Persisting the choice and showing an explicit "saved but unavailable" state — with a per-host reason string — is a better contract than a silent fallback.
- **port effort:** High. The capability-state contract and the reason strings are portable; the sprite renderer is a large asset-heavy component specific to this product. | **idea only:** True

## gajae.48 Message queue pane with per-group reordering

- **where:** packages/coding-agent/src/modes/components/queue-pane.ts, queued-message-selector.ts, packages/coding-agent/src/modes/actions `app.message.queue` / `app.message.dequeue` / `app.queue.togglePane` / `app.message.sendNow`, docs/keybindings.md
- **what:** Messages typed while a turn is running are queued rather than sent. The queue is a real pane (own container in the render tree, own keybinding `app.queue.togglePane`), opened via `app.message.dequeue` (Alt+Up/Alt+Down). Inside: Return edits the selected message, Forward Delete removes it, Ctrl+Up/Down reorders within its delivery group, Escape closes. The doc states explicitly that reordering does NOT convert compaction, steer, and follow-up messages into one another.
- **how:** Queued messages carry a kind that determines their delivery group; the selector's reorder operation is scoped to the current group rather than the whole list, and the invariant is asserted in the docs and enforced in the reorder handler.
- **solves:** Steer vs follow-up vs compaction are semantically different — letting a user drag a compaction message into the follow-up slot would silently change what the next turn means. Scoping reorder to the delivery group, and refusing cross-kind conversion, is the right constraint.
- **port effort:** Medium. The delivery-group invariant is the idea worth taking. | **idea only:** True

## gajae.49 Unicode-hardening applied to untrusted display text

- **where:** packages/coding-agent/src/modes/utils/irc-message.ts:30-55, packages/coding-agent/src/modes/components/command-palette.ts:31-36, packages/coding-agent/src/modes/shared.ts
- **what:** Text arriving from outside the process is bounded and scrubbed before rendering. `normalizeIrcIdentity` projects the source to a 4 KiB UTF-8 budget, strips CR/LF/TAB and Unicode line/paragraph separators, removes bidi and zero-width controls (U+061C, U+200E–U+200F, U+202A–U+202E, U+2066–U+2069), then re-projects to 256 bytes for display and appends `…` if either projection truncated — all without splitting a visible grapheme. Palette text goes through `sanitizeStatusText(text.toWellFormed())` so lone surrogates are repaired first.
- **how:** Byte-budget projection via `Bun.stringWidth`-adjacent grapheme segmentation (`getSegmenter()` from tui) walking `graphemeSegmenter.segment(text)` and accumulating `Buffer.byteLength(part.segment, "utf-8")` until the budget is exceeded.
- **solves:** A terminal is a display surface with no bidi isolation, and an agent session displays text from other agents. Bidi overrides can reorder an entire line visually, zero-width controls can hide content, and byte-truncation can split a grapheme into a broken glyph. Handling all three at one projection helper is the right shape.
- **port effort:** Low. The helper is small and the control-character set is standard. | **idea only:** False

## gajae.50 Separate web dashboard (React) alongside the TUI

- **where:** packages/stats/src/client/*.tsx (14 files), server.ts, db.ts, sync-worker.ts, compiled-client-assets.ts; packages/coding-agent/src/commands/stats.ts + cli/stats-cli.ts
- **what:** A second, browser-rendered surface: React 19 + Chart.js + Vite, with `CostChart`, `BehaviorChart`, `ModelsTable`, `RequestList`, `RequestDetail`, `StatsGrid`, and a `useSystemTheme` hook. Served by a local Bun server, backed by SQLite, fed by a dedicated sync worker. It is bundled as a tar.gz and embedded in the compiled binary.
- **how:** `generate-client-bundle.ts` produces the client assets; `build-binary.ts` calls it before compile and resets in `finally`, mirroring the MuPDF asset dance. `stats-cli.ts` has a hand-written fast path so `gjc stats --help` never loads the heavy module graph (cli-main.ts:130-143).
- **solves:** Usage analytics do not belong in a terminal. Keeping them in a separate package with its own build, embedded as an opaque asset, means the TUI binary gains a dashboard without the TUI gaining a charting dependency.
- **port effort:** High. The package split and the embed/reset build pattern are portable; the React dashboard is a separate product decision. | **idea only:** True

## gajae.51 Provisional provider-attempt transaction (discardable turn)

- **where:** packages/agent/src/agent-loop.ts:2666 (`class ManagedAttemptTransaction`), constructed at :3754; discard paths at :3929, :3937, :4132, :4166. Tests: packages/agent/test/managed-attempt-transaction.test.ts (149 KB).
- **what:** A whole assistant turn — streamed deltas, tool-call updates, and the committed assistant message — is buffered inside a `ManagedAttemptTransaction` and only released on commit. `discard()` empties the batch so the turn never reaches durable history, and the loop then splices the context back to the pre-attempt watermark (`currentContext.messages.splice(contextMessageCount)`). Caps: 10,000 staged events / 16 MiB staged bytes by default, raisable by env to a 2,000,000-event ceiling against a 4 GiB peak-RSS budget.
- **how:** `push()` stages instead of emitting while uncommitted; `flush()`/`flushNonTerminal()` release; `acceptedAssistantSnapshot()` swaps in the sanitized message; `discard()` keeps only a shape-only `{stagedEventCount, stagedBytes, contentBlockCount}` for diagnostics. The escaped-argument path uses a second transaction in `"lossless"` snapshot mode so a defective turn can vanish atomically while normal turns still stream.
- **solves:** A provider turn that turns out to be defective (escaped arguments, Harmony leakage, context overflow, retryable transport failure) must be UNDONE without corrupting history — and without the user having already seen the turn on screen. This is the mechanism that makes every other recovery in the list safe.
- **port effort:** High — the loop architecture differs (omp's runLoop is a different 3,844-line shape with no transaction concept). Port the CONCEPT as a staged-emission wrapper plus a context watermark; do not port the file. | **idea only:** True

## gajae.52 Six non-disableable emergency compaction floors

- **where:** packages/agent/src/compaction/compaction.ts:346 (`resolveEmergencyCompactionLimits`), :376 (`emergencyCompactionReason`), :289 (`CompactionTriggerReason` union of 7 members incl. "token"). Test: packages/agent/test/emergency-compaction.test.ts.
- **what:** Token-threshold compaction is user-tunable and can be set too high or turned off. Independently, a resource sampler trips compaction on the FIRST of: resident heap > min(1.5 GiB, 50% of total RAM); retained non-provider memory (materialized + TUI render caches) ≥ 128 MiB; on-disk JSONL transcript > 48 MiB; serialized provider context > 24 MiB; inline image bytes > 64 MiB; provider-visible message count > 4000. Comment states these are explicitly "NOT user-tunable down to zero".
- **how:** `EmergencyCompactionSample` is a plain struct filled by an injectable sampler (tests never read real RSS). `emergencyCompactionReason()` returns the first exceeded in a fixed priority order, and the result is routed through the normal pair-safe `compact()` cut so a tool_use/tool_result pair is never split. Separate 64 MiB / 700-child "diagnostic" tiers exist one step below each floor and log once.
- **solves:** OOM on a long session or weak machine, before the user notices, even when token-based compaction is disabled. Measuring the ON-DISK TRANSCRIPT as a trigger is the non-obvious one — session files grow without bound independently of the live context.
- **port effort:** Medium — the concept ports cleanly; the specific byte constants need re-tuning against omp's real tokenizer/native memory profile. | **idea only:** True

## gajae.53 Digest-verified two-phase tool-output pruning

- **where:** packages/agent/src/compaction/pruning.ts:953 (plan), :989 (commit), :871 (`estimateToolOutputPruneSavings`), :892 (`shouldRunMaintenancePrune`).
- **what:** Pruning stale tool output runs strictly in two phases. `planToolOutputPrune` is PURE — it returns frozen digests (entryId + byteLength + sha256), replacement notices, and savings, and deliberately keeps no reference to source entries or original text. `commitToolOutputPrune` then re-reads each live entry, recomputes byte length and sha256, and refuses to mutate on any mismatch, returning `committed | mismatch | unavailable` per entry. Error digests are field-ordered error-first so truncation drops tail/counts before the error signal; total digest budget is 256 chars (~64 tokens). Config: protect 40k recent tokens, require ≥20k savings, never prune `skill`/`read`, protect the newest 2 user turns.
- **how:** Plan produces `ToolOutputPrunePlan`; commit takes an optional `replacements` override map so a caller can swap the notice for an artifact reference (`ToolOutputPruneEvictionHandle`: uri + sha256 + bytes) to move the payload out of RAM. The stale-superession rule waives protection for `staleOverridableTools` (`read`) once a later result covers the same target or a later successful edit/write lands — but the most recent result per target is never considered superseded.
- **solves:** Pruning is destructive and racy: an async tool can still be writing its result when the plan is computed, so a naive mutate-in-place corrupts a live entry. The digest round-trip makes corruption structurally impossible, and the estimation function lets callers price the prune before paying for it.
- **port effort:** Medium — the pattern is portable; omp already has `compaction/pruning.ts` (440 lines vs gajae's 1,026), so this is an upgrade to an existing module rather than a new one. | **idea only:** True

## gajae.54 Cache-economics gate on below-threshold pruning

- **where:** packages/agent/src/compaction/pruning.ts:892-903. Companion: packages/coding-agent/src/session/cache-economics.ts (miss-cost modelling, `missPremiumUsd`, `cacheHitRate`).
- **what:** Pruning invalidates the provider prompt cache, so it is not free. `shouldRunMaintenancePrune` requires three conditions: the feature is explicitly enabled, estimated savings clear a minimum, AND savings strictly exceed a `cacheEpochResetCost`. The code comment states it ships default-off and "blocked until live evidence justifies enabling".
- **how:** A pure predicate over four scalars, called by the maintenance path with savings computed from `estimateToolOutputPruneSavings`.
- **solves:** Naive periodic pruning trades a 20k-token saving for a full cache-epoch reset, which on a long-context model costs more than it saves. This makes the trade explicit and refuses to run by default.
- **port effort:** Low — a ~20-line pure predicate. The `cacheEpochResetCost` figure must be measured for omp's providers. | **idea only:** False

## gajae.55 Bounded circuit breakers for deterministic faults

- **where:** packages/agent/src/agent-loop.ts:393 (`MAX_CONSECUTIVE_MALFORMED_TURNS = 5`), :405 (`MAX_ESCAPED_NONASCII_RESAMPLES = 2`), breakers at :4300-4360 and :4431-4440; repair functions `repairInvalidPromptHistory` :914, `repairReasoningContentReplayHistory` :949.
- **what:** Four separate breakers, each with a hard budget, each scoped to its own defect class: (a) 5 CONSECUTIVE turns in which every tool call failed argument validation → terminal error; (b) 2 resamples for tool arguments arriving `\uXXXX`-escaped instead of literal UTF-8; (c) ONE repaired resend for `invalid_prompt` (poisoned history → neutralize leaked control tokens IN PLACE, never drop items); (d) ONE repaired resend for DeepSeek/OpenAI-compatible `reasoning_content ... must be passed back` rejections → strip unusable `reasoning` items, never text/tool-call/tool-output items. Plus a 2-attempt abort-retry and 2-attempt truncate-and-resume budget for Harmony leakage.
- **how:** Each breaker is (count, action) with the count checked before the action. The malformed breaker counts CONSECUTIVE turns regardless of signature — the comment explains why: "a model that rotates invalid argument shapes never trips it", so signature-based 'repeated' detection alone is not a bound. Resample repairs splice the rejected assistant message OUT of context and `continue`, so the retry is a clean resend rather than a poisoned replay.
- **solves:** These are deterministic faults: resending identical history re-triggers the identical 400 and burns the provider budget. Naive auto-retry loops forever. Bounded + repair-in-place turns a hang into one resend.
- **port effort:** High — 32 `escapedNonAscii` references are wired through the transaction/staging design; the breaker SHAPE is portable, the wiring is a rewrite. | **idea only:** True

## gajae.56 Deferred-escape transient steering instead of a tool error

- **where:** packages/agent/src/agent-loop.ts:4040-4190 (resample block), :457 `hasEscapedNonAsciiToolCall`, :691 `allEscapedToolCallsDisplaySafe`, :545 `isDisplaySafeEscapedTool`. Test: agent-loop-escaped-nonascii-toolcall.test.ts (80 KB).
- **what:** When a model emits `\uXXXX`-escaped non-ASCII in tool arguments, gajae does NOT return a tool error. It discards the turn and re-requests with a transient synthetic steering message naming the defect — neither the escape syntax nor the instruction is ever committed to durable history. A single bounded exception exists: if every escaped call corroborates its escaped scalars against decoded non-ASCII in the tool's DECLARED DISPLAY-ONLY fields, the decoded call is executed as-is and a shape-only warning is logged once, so a mistyped nibble can only change what the user reads.
- **how:** `SyntheticRecoveryKind` = `"malformed-tool-call" | "composer-bash-policy" | "provider" | "escaped-nonascii"`; `pendingRecovery` carries a `syntheticMessage` that is built at send time and dropped if never sent. The rationale is stated in-code: reporting it as a tool error "writes the literal escape syntax back into the context the model samples from next", and a deterministic escaper reproduces the identical defect on a blind resample, so the retry must name the defect.
- **solves:** A mistyped escape nibble decodes to a different but equally valid character and is unverifiable after the fact, so it can never be repaired — only prevented. And the display-only carve-out keeps the observable failure surface honest: the model asked for one label, the user reads another.
- **port effort:** High — depends entirely on the transaction/staging substrate. | **idea only:** True

## gajae.57 GPT-5 Harmony protocol-leak detector with signal fusion

- **where:** packages/agent/src/harmony-leak.ts (457 lines; `detectHarmonyLeak`, `recoverHarmonyToolCall`, `shouldMitigateHarmonyLeak`, `createHarmonyAuditEvent`); loop integration agent-loop.ts:3911-3990; rationale in docs/ERRATA-GPT5-HARMONY.md. Tests: harmony-leak.test.ts (14 KB) + agent-loop-harmony-leak.test.ts.
- **what:** Detects tool-call intent collapsing into the visible content channel by fusing independent signals rather than one regex: marker (`to=functions.`), Harmony channel tags, a structurally-committed invoke envelope (opening tag AND a body/closing tag within a short window, so prose mentioning the tag does not trip), channel-word adjacency, glitch-token adjacency, a body-channel cascade, and fake-result framing (`code_output` + `Cell N:`). Code fences suppress it. Recovery is surface-specific: truncate-and-resume for the `edit` tool in hashline DSL, abort-and-retry for everything else.
- **how:** Each signal is a named regex constant; the module escapes its own literals (`\x4aapgolly`) so scanning the file with the same detector cannot self-trip. The loop throws a `HarmonyLeakInterruption` carrying `{detection, removed, recovered}` and branches: recovered → truncate-and-resume (max 2), unrecovered → drop the contaminated assistant message from history and re-request (max 2), exhausted → escalate with the signal list.
- **solves:** Model/tool-protocol dialects where the wire format and the model disagree produce output that is syntactically valid text but semantically a lost tool call. A single regex produces false positives; signal fusion with per-signal precision rules does not.
- **port effort:** Medium — the module is self-contained and dependency-free; the regexes and signal-precision reasoning transfer verbatim, the loop wiring needs the transaction substrate. | **idea only:** True

## gajae.58 Tool concurrency classes with barrier scheduling

- **where:** packages/agent/src/types.ts:750 (`concurrency?: "shared" | "exclusive"`); scheduler packages/agent/src/agent-loop.ts:5570-5610.
- **what:** Every tool declares `concurrency: "shared" | "exclusive"`. Shared tools run concurrently; an exclusive tool starts only after `Promise.all([lastExclusive, ...sharedTasks])` — i.e. after every preceding exclusive AND every currently-shared tool. Across the whole repo exactly one tool opts in: `python.ts` (exclusive). Scheduling is a `Promise.allSettled` raced against an abort signal.
- **how:** Each record also takes a `resourceLedger.reserveProducer` reservation before dispatch; a refused reservation marks the record skipped and emits a paired skipped result without ever entering `execute()`. `nonAbortable: true` tools are dispatched with `executionSignal = undefined` so they run to completion.
- **solves:** Some tools (a REPL, a terminal session) cannot tolerate a concurrent sibling mutating the same resource. The barrier gives per-tool mutual exclusion inside one assistant turn without a global lock, and the default keeps parallelism.
- **port effort:** Low for the class + barrier itself; Medium if omp also wants the resource-ledger reservation layer. | **idea only:** False

## gajae.59 Strict tool_execution_start/end event pairing for non-dispatched calls

- **where:** packages/agent/src/agent-loop.ts:5182-5240 (`emitToolResult`), `markNonDispatchedToolEvent`; `bindDispatchedToolIdentity` / `tool-dispatch-identity.ts` (a non-serializable WeakMap side channel keyed by event object).
- **what:** A tool call that was skipped, blocked by a policy hook, or aborted BEFORE `execute()` is entered still emits a full `tool_execution_start` + `tool_execution_end` pair, marked via `markNonDispatchedToolEvent` as pairing-only. The comment states why: "every consumer downstream is built around results arriving in pairs". Crucially, the built-in tool label is NOT bound for a non-dispatched call — binding it would let a consumer resolve a canonical name for a tool whose `execute` was never entered. The same mirrored counter is written straight to the run-collector (`recordSkippedTool`) so the run summary reflects what the user actually saw on the wire.
- **how:** `prepareToolDispatch` builds every value the start/end/result pair must share and stores them on the record; `publishToolDispatch` sets `started = true` only after the start event is successfully published, so the path from "claimed started" to invocation contains only trusted local bindings. Invocation itself goes through a captured `intrinsicReflectApply(execute, tool, args)` so a hostile getter on the tool cannot run between the claim and the call.
- **solves:** Event-pair-consumption is a real interop constraint — a relay, a transcript, or a spinner built on pairs will hang or double-count if a skipped call emits only half. And the dispatch/identity split closes a small but real spoofing surface.
- **port effort:** Low-Medium — self-contained, no dependency on the transaction design. | **idea only:** True

## gajae.60 Steering that interrupts in-flight tool execution

- **where:** packages/agent/src/agent-loop.ts:5155-5180 (`checkSteering` + `steeringAbortController`); agent.ts:1284 (`steer()` → `{admitted:false, reason:"idle"|"aborting"}`), :1302 (`waitForSteeringArrival`), :1412 (`#dequeueSteeringMessages` with "all"/"one-at-a-time" modes and per-message force-one-at-a-time).
- **what:** A user message arriving mid-run is not queued for the next turn — it aborts the currently-executing tools and is delivered at the next tool boundary. Policy is configurable via `toolInterruptPolicy: "abort_tools" | "finish_tools"`. `checkSteering()` polls the queue from inside the tool loop; on a hit it records the messages and aborts a dedicated `steeringAbortController`, which is `AbortSignal.any`-combined with the run signal and the resource-cancellation domain. Three separate guards prevent a steer from being consumed by a dead run: the loop refuses to open a turn on an aborted signal, hands steering back via `requeueSteeringMessages`, and disowns it terminally.
- **how:** `waitForSteeringArrival(signal)` resolves only when a message is admitted AFTER the wait started (a pre-queued message does not resolve it) — documented use is for long observation tools to end their wait early instead of blocking a busy user. `steer()` returns a typed `SteerAdmission` rather than throwing, so an idle/steering race is a value, not a crash.
- **solves:** Without this, a user who types during a 3-minute bash call waits for the whole call. The non-obvious part is the orphan-prevention: a tool task unwinding after the abort can dequeue steering that the drain just requeued, so the polling is gated on `!signal?.aborted`.
- **port effort:** Medium-High — the abort/requeue/disown triple is the hard part and is genuinely subtle; omp has `live-steering.ts` (89 lines) so there is a base to extend. | **idea only:** True

## gajae.61 Attempt-scope lineage currentness authority

- **where:** packages/agent/src/attempt-scope.ts (195 lines: `createLineageCurrentness`, `AttemptScopeAuthority`, `attemptScopesEqual`); consumers include packages/coding-agent/src/session/attempt-record-store.ts.
- **what:** Every provider attempt carries a frozen `{attemptId, generation, lineage}` where lineage is `"main"` or `side:<name>`. The authority owns the main lineage and tracks side lineages separately, so a background/ephemeral side attempt NEVER invalidates the main attempt's scope, and `forceAbort` advances only main. `mintSide()` atomically registers a fresh side lineage and mints its scope before returning, so `isCurrent(scope)` succeeds immediately with no window where the scope is unknown.
- **how:** The interface is documented as "the SINGLE source of currentness truth injected into AttemptRecordStore ... Every store operation calls `authority.isCurrent(scope)` and fails closed when the authority is missing or the scope is superseded." Structurally assignable to `AttemptScopeRef` in packages/ai so it crosses provider boundaries without a reverse dependency.
- **solves:** Late events from a superseded attempt are indistinguishable from live ones unless every consumer re-derives liveness. Centralising the authority means consumers fail closed by default instead of each inventing a staleness heuristic.
- **port effort:** Medium — the type is self-contained; the value is in centralising the authority rather than in any individual call site. | **idea only:** True

## gajae.62 Run resource ledger with settlement proofs and cancellation domains

- **where:** packages/agent/src/run-resource-ledger.ts (345 lines); ownership enforcement agent-loop.ts:1170-1245 (`prepareResourceOwnership`) and :1250 (`sealStandaloneOnError`).
- **what:** A per-run ledger tracking every resource (tools, producers) with an explicit lifecycle `open | sealed | quarantined`. A run carries a `RunCancellationDomain` (one AbortSignal) that all tool executions join. `seal()` yields a `RunSettlementProof` to registered waiters; `quarantine()` is the failure path. The loop's `prepareResourceOwnership` enforces single-ownership: a second `agentLoopContinue` on an already-owned run quarantines the run and throws rather than double-owning it, and continuation is a one-shot claim via `claimContinuation()`.
- **how:** Ownership state lives in a `WeakMap<StandaloneRunOwnership, StandaloneRunState>` so it cannot leak. `publishAgentEnd` only reopens continuation when `stopReason === "maintenance"` AND the outcome is a continuing one — every other terminal path sets `terminal = true` and seals.
- **solves:** Cancellation must reach every concurrent tool, and a retry/continuation must not double-own the same run's resources. The quarantine path makes the unsafe case a loud failure instead of a silent double-free.
- **port effort:** Medium — self-contained module, but the ownership handshake is subtle and must be reproduced exactly. | **idea only:** True

## gajae.63 Fallback chain with explicit attempt accounting

- **where:** packages/coding-agent/src/session/fallback-chain-controller.ts (310 lines); `restoreRuntimeState`/`snapshotRuntimeState` at :60-90.
- **what:** A configured chain (role, ordered selectors, origin) is separated from transient runtime state, which is explicitly non-serializable: "configured chain intent is durable, current position is not." `onAttemptFailure()` returns a three-way verdict `retry | advance | exhausted`; the total budget is `maxAttempts × entries.length + restoredEntryIndices.size`. Crucially `onAttemptStarted()` charges the attempt at the concrete TRANSPORT boundary (so a request that never reached the wire is never charged), and `discardStartedAttempt()` un-charges a provisional charge without erasing prior failures.
- **how:** `seedResolution(activeIndex, skips)` positions the chain from auth-aware resolution WITHOUT charging requests — needed when credentials, not failures, decided the position. `resetAttemptBudget()` gives a logically new request a fresh budget. Wire defects (escaped arguments) are recorded through a dedicated bounded-exhaustion path so they never advance the chain — the comment: "the wire defect is not provider evidence, so the outcome deliberately carries no transport facts and the fallback chain never advances on it."
- **solves:** Retry budgets are usually charged by policy layer, which counts requests that never hit the network. Charging at the transport boundary makes the budget mean "provider round-trips actually spent", and it keeps non-provider faults off the model-advance path.
- **port effort:** Medium — self-contained, no loop dependency. | **idea only:** True

## gajae.64 Retry/compaction scope boundary with local-fault carve-out

- **where:** docs/non-compaction-retry-policy.md (268 lines); implementation packages/coding-agent/src/session/agent-session.ts.
- **what:** Both are checked from the same `agent_end`, but are deliberately mutually exclusive per turn: `#isRetryableError` runs first, and context overflow is hard-excluded via `isContextOverflow` so it falls through to `#checkCompaction` instead. Two LOCAL fault classes (`local_snapshot_failure`, `local_buffer_overflow`) are classified as retryable only so they can be routed to an immediate-surface policy — they are never re-issued, never charge the fallback controller, never advance models, never emit `model_fallback_switched`, and never rotate credentials. Default-config sessions admit only content-free failures: canonical watchdog sentinels, the Codex `server_is_overloaded` event, and typed provider overload envelopes — and every admission additionally requires the attempt carry no assistant text, thinking, or tool call.
- **how:** Structured transport facts and typed provider codes are authoritative; regex classification is retained only as a legacy fallback, and "error prose cannot promote it to quota or transient". The local-fault rationale is stated: the producer shape is deterministic, so re-streaming "only reproduces the same local defect".
- **solves:** Retry storms that burn budget re-sending a deterministically-fatal request, and regex-over-error-prose that lets an LLM-authored error string authorize a replay. The "no assistant text, thinking, or tool call" precondition is what makes the bare-default admissions safe.
- **port effort:** Medium — the POLICY is the portable artifact and it is documented well enough to reimplement from scratch; the classifier code is entangled with agent-session. | **idea only:** True

## gajae.65 Compaction as a run-terminating event with an external owner

- **where:** packages/agent/src/agent-loop.ts:3790-3860 (the maintenance block) and :1259 (`publishAgentEnd`); resumed at packages/coding-agent/src/session/agent-session.ts:5578 (`setMaintainContext`) and the agent_end handlers at :6860, :7179, :7370, :8004, :8093. Test: agent-loop-maintain-context-lifecycle.test.ts (17 KB).
- **what:** The agent loop never rewrites its own context for compaction. It exposes a `maintainContext(context, lifecycle)` hook, invoked at the ONE boundary where the full unsent context is durable (after pending tool/steering messages materialise, before `syncContextBeforeModelCall`). A non-"not-needed" outcome ends the run with `agent_end { stopReason: "maintenance" }` and skips the lossy finalization entirely; `AgentSession` then resumes the run on the rewritten context. A `"failed"` outcome still commits a visible failure message to history so the user sees why nothing was submitted. The hook also receives `awaitEventDrain` so it can wait for consumers before rewriting underneath them.
- **how:** Comment on the abort race: "A callback can settle after its loop has been cancelled. Never let a stale 'not-needed' fall through to streamAssistantResponse, which invokes the provider before it observes the aborted signal" — the outcome is overridden to `"aborted"` when the signal fired. `modelHasResponded` gates the mid-run check so the first iteration is skipped, deferring to the pre-prompt check instead of racing it.
- **solves:** Keeps the loop free of context-rewriting policy, and makes the compaction→resume handoff an explicit, testable protocol instead of an in-loop mutation that a failed summary can leave half-applied.
- **port effort:** High — this is a loop-architecture change, not a feature. omp's loop has no `maintainContext` (0 occurrences). | **idea only:** True

## gajae.66 Pair-safe cut point with split-turn prefix summarization

- **where:** packages/agent/src/compaction/compaction.ts:776 (`findCutPoint`), :734 (`findTurnStartIndex`), :751 (`CutPointResult`), :1221 (`prepareCompaction`).
- **what:** `findCutPoint` walks backwards accumulating estimated tokens, snaps to the first valid cut point, then does a second backwards scan absorbing non-message entries (bash, settings) while stopping at `compaction` and `message` boundaries. Valid cut points explicitly EXCLUDE `toolResult`, so a tool_use/tool_result pair is never split. The result reports `isSplitTurn` and the `turnStartIndex` of the turn being split, letting the summarizer keep a turn prefix so a mid-turn cut does not silently drop the user's original request.
- **how:** `prepareCompaction` returns a full `CompactionPreparation` (messagesToSummarize, turnPrefixMessages, recentMessages, previousSummary, previousPreserveData, fileOps, settings, tokenCorrection). It also returns `undefined` when the last entry is already a compaction, so double-compaction is structurally impossible. `BashExecutionMessage` is treated as a turn-start-equivalent.
- **solves:** The two classic compaction bugs: splitting a tool pair (provider 400) and cutting mid-turn so the model loses the original ask. Both are handled as first-class outputs rather than left to the caller.
- **port effort:** Medium — omp has its own compaction (2,110 lines, plus v2-streaming/shake), so this is a comparison exercise against a divergent implementation, not a clean port. | **idea only:** True

## gajae.67 Token-correction ratio for the keep window

- **where:** packages/agent/src/compaction/compaction.ts:1202-1203 (`TOKEN_CORRECTION_MIN_RATIO`/`MAX_RATIO`), :1205 (`PrepareCompactionOptions`), :1194 (`tokenCorrection` on the result). Tests: compaction-keep-recent-correction.test.ts, compaction-estimate-cache.test.ts.
- **what:** Compaction's keep-window budget is corrected by an OBSERVED heuristic→actual ratio supplied by the caller from per-turn Usage deltas or a stable-prefix-subtracted comparison, clamped bidirectionally to [0.5, 2.0] and applied by passing a corrected budget INTO `findCutPoint`. When the ratio is omitted, NO correction is applied — explicitly, "the confounded raw promptTokens/estimatedTokens quotient is never used." Larger windows (≥66k) scale the keep window to 30% instead of the legacy fixed `keepRecentTokens`.
- **how:** The ratio is a caller-supplied measurement, and the clamp is what makes a bad estimate safe. Comment: "never trust a ratio beyond 2x in either direction so a bad estimate cannot balloon or collapse the kept window."
- **solves:** A chars/4 heuristic systematically mis-estimates CJK/code-dense content; without correction the keep window is either too small (the summary is immediately out of date) or too large (compaction does not free enough). The clamp bounds the damage of a bad measurement instead of trusting it.
- **port effort:** Low-Medium — the mechanism is small and self-contained. | **idea only:** True

## gajae.68 Script-aware (CJK) token estimation with published measurements

- **where:** packages/agent/src/compaction/compaction.ts:475 (`IMAGE_TOKEN_ESTIMATE = 1200`), :556 (`estimateMessageTokensHeuristic`), :565 (`estimateTextTokensHeuristic`); rationale + numbers in packages/agent/test/compaction-cjk-estimate.test.ts:1-13.
- **what:** The chars/4 heuristic undercounts CJK by 2-4x. gajae measured o200k rates directly: Hangul prose 0.604, spaceless Hangul 0.964, Han 0.793, Kana 0.740 tokens/char — against the 0.25 the heuristic assumed. Common-BMP CJK blocks are now charged 1 token each (a safe upper bound; the only failure mode is compacting slightly early).
- **how:** Block-range classification over Hangul/unified+compat Han/Kana/CJK punctuation/full-width forms, then per-character charging instead of per-4-bytes.
- **solves:** Documented failure: "a 2–4x undercount that let CJK-heavy unsent deltas sail past the compaction threshold into provider `context_length_exceeded` rejections" — i.e. the heuristic was not merely inaccurate, it caused real provider 400s for CJK users.
- **port effort:** n/a for omp's main path — omp uses a real native BPE tokenizer (`tokenizer.ts`, per-model encodings for claude-v3/v47/v5, qwen3, deepseek-v3, kimi-k2, glm5) and has no `estimateTextTokensHeuristic` at all. Only the measured o200k rates are worth taking, for any heuristic path omp adds. | **idea only:** True

## gajae.69 Subagent spawn gate (justification receipt above a hard threshold)

- **where:** packages/coding-agent/src/task/spawn-gate.ts (95 lines, zero dependencies): `findMissingPlanFields`, `decide`, `evaluateSpawnGate`.
- **what:** Fan-out is gated. Batches of 4 or fewer pass freely; above `DEFAULT_SPAWN_THRESHOLD = 4` the batch is REJECTED unless it supplies a spawn-plan receipt with five non-empty fields: `whyParallel`, `whyNotLocal`, `independence`, `expectedReceiptShape`, and a positive finite `maxInlineTokens`. The decision object reports `planRequired`, `missingFields`, and a human-readable `reason` suitable for a blocked-result message back to the model.
- **how:** `decide()` validates its own inputs and throws `RangeError` on a negative child count or non-positive threshold. The `expectedReceiptShape` field forces the parent to state what each child will return, which is also the input to the ROI reconciliation layer.
- **solves:** Subagent fan-out is the most expensive and least-bounded thing a chat agent can do. A hard threshold plus a required justification converts it from an unconstrained capability into a budgeted one — and `whyNotLocal` specifically pushes back on spawning when the parent could just do it inline.
- **port effort:** Low — 95 lines, no imports, pure function. Directly portable. | **idea only:** False

## gajae.70 Fork-context budget ladder, re-clamped per child model

- **where:** packages/coding-agent/src/task/fork-context-budget.ts (9 lines, the whole ladder); packages/coding-agent/src/task/executor.ts:180 (`trimForkContextSeedForModel`); ForkContextMode at task/types.ts:17; advisory-only recommendation at task/fork-context-advisory.ts.
- **what:** Subagents inherit parent context on a five-rung ladder with explicit token budgets: `none: 0`, `receipt: 2,000`, `last-turn: 4,000`, `bounded: 8,000`, `full: 15,000`. The seed is then RE-CLAIMED against the CHILD's actual window: `contextWindow − max(minimumReserved, childModel.maxTokens) − fixedPromptAndToolOverhead`, walking oldest-first and tallying `skippedReasons["child-context-ceiling"]` so the parent can report exactly what was dropped.
- **how:** The ceiling subtracts the child's reserved completion budget, so a large-output child model gets a smaller inherited context. `ForkContextAdvisory` is explicitly "logged only; never changes the actual mode selection".
- **solves:** Copying the full parent context into every child is the default in most harnesses and silently multiplies cost by fan-out width. The ladder makes inheritance an explicit, priced, per-child decision, and the reason tally makes the drop auditable instead of invisible.
- **port effort:** Low for the budget table and clamp; Low-Medium for the advisory layer. | **idea only:** False

## gajae.71 Structured-output validation gate on subagent returns

- **where:** packages/coding-agent/src/task/executor.ts:478 (`buildOutputValidator`), :490 (`extractRequiredFields`), :500 (`computeMissingRequired`).
- **what:** A subagent declaring an `output` schema gets it converted JTD→JSON Schema and compiled into a validator that checks required fields and reports `missingRequired` by name plus the first formatted validation issue. A failed validation produces a specific actionable message rather than a bare "schema validation failed".
- **how:** Schema is normalized first; a normalization error is returned separately from "no schema" (which is a legitimate pass-through) so the three outcomes stay distinguishable. Stringified JSON in the tool result is re-parsed before validation (`parseStringifiedJson`).
- **solves:** Subagent structured output is usually validated post-hoc or not at all, so a malformed child result surfaces as a confusing downstream parse error instead of a named missing field.
- **port effort:** Low-Medium — depends on the local jtd-to-json-schema helpers, which omp would need to check for. | **idea only:** True

## gajae.72 Append-only stable prefix for provider cache hits

- **where:** packages/agent/src/append-only-context.ts (497 lines: `StablePrefix`, `StablePrefixSnapshot`, `AppendOnlyLog`); normalized-prefix cache in agent-loop.ts:3395-3480. Test: append-only-context.test.ts (38 KB).
- **what:** System prompt + tool specs are snapshotted once and FROZEN, so the byte prefix sent to the provider is byte-identical across turns; only the new user delta is a cache miss. Invalidation is explicit (`invalidate()`, e.g. after MCP reconnect) or fingerprint-driven. The `importSnapshot` path documents a real non-idempotence trap: re-running `normalizeTools` on a JSON-cloned snapshot re-resolves a dropped `intent` FUNCTION from "omit" to "optional", injecting `_i` and changing `parameters` so the recomputed fingerprint no longer matches the stored one — hence the fingerprint is verified against the stored tools as-is.
- **how:** `build()` returns `true` when the prefix actually changed (a cache miss is imminent) and short-circuits on reference identity before recomputing the fingerprint. The seed rebuilds are separately tested (append-only-seeded-rebase.test.ts).
- **solves:** Provider prefix caches (DeepSeek, Anthropic) only pay off if the prefix bytes are stable. A schema that is re-serialized every turn silently destroys the cache; the fingerprint is the mechanism that notices.
- **port effort:** omp ALREADY HAS this (append-only-context.ts, 495 vs 497 lines — near-identical). Do not port; the non-idempotence comment is the only thing worth checking against omp's copy. | **idea only:** False

## gajae.73 Cache-miss cost attribution with honesty levels

- **where:** packages/coding-agent/src/session/cache-economics.ts:40-60 (attribution comment), `CacheMissCostSummary`, `CacheEconomicsBasis` distinguishing `persisted-aggregate` from `current-model-estimate`.
- **what:** Cache misses are attributed to one of three levels: `actionable` (usage evidence points to a user-controllable cause with a concrete remediation), `diagnostic-only` (pattern observed, cause not determinable from usage alone — "describe what is unknown, assert no cause"), and `provider-suspected` (provider returned no cache activity at all, so the miss cannot be attributed to the user's prompt). Models the miss premium in USD (`missPremiumUsd`, `cacheHitRate`) using per-model input/cacheRead/cacheWrite pricing.
- **how:** Cost basis is tagged by provenance so a persisted historical aggregate is never silently recomputed with today's prices as if it were current. Transcript warnings are capped at 3.
- **solves:** Cache-miss reporting usually blames the user for misses the provider caused. The third category exists precisely so the product does not assert a cause it cannot evidence.
- **port effort:** Low-Medium — self-contained; the three-level honesty taxonomy is the durable idea. | **idea only:** True

## gajae.74 Run-level telemetry with sanitized failure payloads

- **where:** packages/agent/src/telemetry.ts (2,162 lines: `startChatSpan`, `finishChatSpan`, `failChatSpan`, `detectGatewayFromHeaders`, `recordManualChatTelemetry`); docs README.md lines ~60-80 document the event contract.
- **what:** `agent_failed` is emitted BEFORE the terminal `agent_end` and is explicitly diagnostic, not terminal — consumers "must not treat it as the terminal boundary or stop waiting for `agent_end`". Its `error` is ALWAYS a sanitized `{code, message}` pair from a failure sanitizer, never the raw provider error; the code is a stable classifier and the message a fixed human-readable description. Consumers are told not to depend on provider-specific detail or request bodies.
- **how:** Staged-buffer overflow carries a `ManagedBufferOverflowDiagnostic` with closed-vocabulary fields ONLY (stage, counts, bytes) precisely because the free-form `errorMessage` "a foreign, self-labeled error can still fill with arbitrary text" — the comment explains the shape-only design exists so a parent surface can render a trustworthy summary without trusting the string.
- **solves:** Raw provider errors leak request bodies, credentials, and user content into logs and RPC surfaces, and a self-labeled error object can put arbitrary text into a field a UI renders.
- **port effort:** Medium — omp has a comparable telemetry.ts (2,237 lines) so this is a diff, not a port. | **idea only:** True

## gajae.75 Per-subagent token and cost log

- **where:** packages/coding-agent/src/task/token-log.ts:28 (`taskTokenLogFromChat`), :46 (`taskTokenLogFromUsage` with the comment); test packages/coding-agent/src/task/token-log.test.ts.
- **what:** Every subagent turn appends a `TaskTokenLog` record (subagentId, agent, turn, model, input, output, cacheRead, cacheWrite, totalTokens, cost) to a per-session `token-log.jsonl`. A non-obvious correctness detail: `ChatUsageSnapshot.inputTokens` is the AGGREGATE input bucket (raw + cacheRead + cacheWrite), but `TaskTokenLog.input` must be the COST-BEARING bucket that EXCLUDES cache, so the cache buckets are subtracted back out, clamped at 0.
- **how:** Two constructors keep the wire-shaped and usage-shaped sources consistent; the clamping avoids a negative bucket when a provider reports cacheRead without a matching raw input.
- **solves:** Subagent cost is the line item operators most need and most tools omit. The aggregate-vs-exclusive distinction is an easy silent 2-4x overcount.
- **port effort:** Low — small, self-contained, and the bucket distinction is worth copying verbatim. | **idea only:** False

## gajae.76 Non-message token accounting split for cacheable recomputation

- **where:** packages/coding-agent/src/session/context-estimation.ts (96 lines: `computeNonMessageBreakdown`, `computeNonMessageTokens`, `estimateToolSchemaTokens`, `estimateSkillsTokens`); skills subtract from systemPromptTokens so the five totals do not overlap.
- **what:** Non-message tokens (system prompt, system context, rules, tool schemas, skills) are computed SEPARATELY from message tokens, because they change rarely while the message list grows every streaming turn. The split lets a status line refresh each on its own cadence: non-message recomputed only when its inputs' identity changes, messages walked incrementally. Tool-schema estimation prefers the WIRE schema (`toolWireSchema`) and falls back to the raw parameters. Rules are extracted by scanning `<rules>…</rules>` spans out of the system prompt so they are not double-counted against the skills section.
- **how:** One shared `computeNonMessageBreakdown` is the single source of truth for BOTH the session estimates and the status-line incremental cache, with a comment that they "MUST report the same numbers" — the split exists to avoid drift between the /context panel and the status line.
- **solves:** Context-usage displays that recompute the whole prompt every streaming frame, or that drift between the status line and the /context panel. Both are correctness bugs disguised as cosmetics.
- **port effort:** Low — 96 lines, and omp has an equivalent path to compare against. | **idea only:** True

## gajae.77 Adaptive compaction threshold driven by fill × call rate

- **where:** packages/agent/src/compaction/compaction.ts:172 (`computeAdaptiveThresholdPercent`); `AdaptiveCompactionOptions`/`AdaptiveCompactionDecisionState` in compaction/adaptive.ts (92 lines, ABSENT in omp); user docs docs/concepts/context-compaction.md; test adaptive-compaction-state.test.ts.
- **what:** The compaction threshold is lowered adaptively when context is already large AND calls are dense, targeting long sessions where a 150K-230K context would otherwise be resent many times before hitting a static threshold. Gated on: fill ratio ≥ 70% of the base ratio, `turnsSinceCompact > 3`, and `intensity = callsInWindow / (turnWindow × 4)` interpolating base→`minThresholdPercent` by `aggression × intensity`. Immediately after a compaction the threshold returns to base for three turns to avoid re-compaction loops. Applied at post-turn, pre-prompt, AND cooperative mid-run boundaries.
- **how:** Base percent is clamped to [1, 99]; `minThresholdPercent` is itself clamped to at most the base, so misconfiguration cannot INCREASE the threshold. A bounded tumbling call window is reset by any successful automatic or manual compaction.
- **solves:** A single static threshold is wrong at both ends: too high for a fast-turning long session, too low (and wasteful) for a slow one. Shipping default-OFF for backward compatibility, with the tuning recipe documented (base 75 / aggression 0.2 / turnWindow 15 / min 50), is the responsible rollout.
- **port effort:** Medium — self-contained module plus three call-site hooks in the maintenance paths. | **idea only:** True

## gajae.78 Dual-era MCP client (2026-07-28 "modern" + 2025-03-26 "legacy")

- **where:** packages/coding-agent/src/runtime-mcp/protocol.ts (624 lines); constants at lines 27-47, buildModernClientContext at client.ts:252
- **what:** A protocol-preference system that negotiates between two spec eras and rewires the whole connection around which era won: modern uses `server/discover` for capabilities and MRTR `input_required` results; legacy uses classic `initialize` + standalone SSE GET stream. Includes a feature-lifecycle table (active/deprecated/removed) and a downgrade-reason enum, plus `MCP_ERROR_HEADER_MISMATCH/-32020`, `MCP_ERROR_MISSING_REQUIRED_CLIENT_CAPABILITY/-32021`, `MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION/-32022`.
- **how:** config field `protocol: "auto" | "2026-07-28" | "legacy"`; `resolveMCPProtocolPreference` normalizes; observation objects (`MCPProtocolObservation`, `createMCPProtocolObservation`, `modernEraObservation`, `legacyEraObservation`) record the negotiated era and per-feature state
- **solves:** Servers and clients drift across MCP spec revisions. Rather than hard-coding one shape, the client detects the era and adapts transport, capability advertisement, and cache semantics per era, and can explain (via downgrade reasons) why a feature vanished.
- **port effort:** High. The era abstraction is self-contained (one 624-line file plus a ~40-line client hook) and is the single most transferable idea here. But the 2026-07-28 spec is NOT something I could read — the whole thing is unverifiable without it, so porting blind risks encoding a private protocol as if it were public. Verify the spec exists and what MRTR actually says first. | **idea only:** True

## gajae.79 MRTR `input_required` mid-tool elicitation with single verbatim retry

- **where:** protocol.ts:573-624 (`MCP_RESULT_TYPE_INPUT_REQUIRED`, `MCP_INPUT_REQUEST_METHODS`, `extractMcpInputRequired`); manager.ts:1151-1158 `setInputRequestHandler`; client.ts:488-512 resolver loop; tested in test/runtime-mcp/client-modern.test.ts:369-386
- **what:** A `tools/call` may return `resultType: "input_required"` carrying an opaque `requestState` plus a map of `inputRequests` (method `elicitation/create` / `sampling/createMessage` / `roots/list`). The client gathers the answers and retries the tool call exactly once under a fresh request id, passing `requestState` back verbatim.
- **how:** tool-bridge passes a lazy `inputHandler: () => MCPInputRequestHandler | undefined` so late registration still applies; `roots/list` is answered from local state without user interaction; if no handler is registered the call fails explicitly with an `MCPExpectedFailure` instead of hanging
- **solves:** An MCP server that needs user input mid-tool cannot block or spawn a prompt. This makes the server→user→server round trip a normal, bounded, retryable part of one logical tool call, with an explicit no-handler failure mode instead of a deadlock.
- **port effort:** Medium. The state machine is small; the hard part is agreeing on the wire shape, which again rides on the unreadable 2026-07-28 spec. | **idea only:** True

## gajae.80 Outward Coordinator MCP bridge (23 tools) over SDK sessions

- **where:** packages/coding-agent/src/coordinator-mcp/server.ts (11,748 lines, single file) + 11 sibling modules (17,842 total); contract in src/coordinator/contract.ts; adapter in src/commands/mcp-serve.ts; doc in docs/hermes-mcp-bridge.md
- **what:** `gjc mcp-serve coordinator` (alias `hermes`) exposes an MCP server that lets an EXTERNAL coordinator discover and drive SDK-backed GJC sessions: register/start/activate/stop/retire sessions, send prompts, queue bounded follow-ups, read tail/turn/coordination status, list and read artifacts, list and answer structured questions, watch events, read/ack codex handoffs, and delegate plan/execute. A parallel read-only CLI adapter (`gjc coordinator`) and a setup adapter (`gjc setup hermes`) drive the same contract.
- **how:** COORDINATOR_MCP_TOOL_NAMES is one transport-neutral `as const` tuple in coordinator/contract.ts; the MCP adapter, the CLI adapter, and the setup adapter all read from it, so a tool added in one place appears in all three. Auth is Ed25519 signed (`generateKeyPairSync`/`sign`/`verify`), state is file-locked via `withSessionStateFileLock`, and there is a question-gate codec (question-gate-codec.ts, 377 lines) plus a durability layer (durability.ts, atomic writes)
- **solves:** Without it an orchestrator must scrape terminal scrollback to drive or observe an agent. This makes sessions a first-class, typed, addressable remote object.
- **port effort:** High, and 11,748 lines in one file is the wrong shape to copy. The contract-as-single-tuple idea plus the three-adapter-one-contract structure is worth stealing; the implementation should be split by tool family. Depends entirely on omp having an equivalent session/broker substrate. | **idea only:** True

## gajae.81 Deny-first plugin-bundle MCP security policy, enforced twice

- **where:** packages/coding-agent/src/extensibility/gjc-plugins/mcp-policy.ts (101 lines) + runtime-mcp/plugin-network-boundary.ts (101 lines); plugin surfaces at gjc-plugins/types.ts:87-89 (`tools`, `mcps`), error codes `invalid_mcp`/`duplicate_mcp` at :175-181
- **what:** Third-party plugin MCP servers are checked by ONE policy function at both install-validation time and runtime-connect time. HTTPS only; denies loopback/private/link-local/multicast/unspecified IPv4 and IPv6 including the 169.254.169.254 metadata address (with correct zone-id and embedded-IPv4 IPv6 literal expansion); stdio launchers limited to `node` and `bun`; stdio cwd confined to the plugin root.
- **how:** rejects via `fail()` → `GjcPluginLoadError("security_policy", message)`; applied at both the install transaction and the connect path so a policy change cannot be bypassed by a config-only edit
- **solves:** A plugin that ships an MCP server is remote code + a network egress path. Validating only at install means the runtime path can drift; validating only at connect means the user gets no install-time signal. Doing both, from one function, closes both.
- **port effort:** Low-medium. ~200 lines, self-contained, and the DNS-resolution check (the file imports `node:dns/promises` `lookup`, so it resolves hostnames before the IP check — defeating DNS-rebinding-by-literal) is the part worth copying verbatim. | **idea only:** False

## gajae.82 Codex handoff file protocol (cross-agent-session work transfer)

- **where:** coordinator-mcp/codex-handoff.ts (552 lines) + coordinator-mcp/codex-wake-publisher.ts (429 lines), types CodexHandoffRegistrationV1 / CodexWakeEventV1
- **what:** A durable, on-disk registration + wake + ack handshake for handing work to an external Codex agent and reading back what it did — separate from both the MCP transport and the session broker.
- **how:** registerCodexHandoff / listCodexHandoffs / readCodexHandoff / updateCodexHandoff + recordCodexWakeEvent / listPendingCodexWakeEvents / ackCodexWakeEvent / codexWakeLifecycle; the wake publisher has a pluggable `CodexTransportFactory` with `createDefaultCodexTransportFactory`
- **solves:** Two agent CLIs that do not share a transport can still coordinate, because the contract is a file + an event, not a socket. The ack/pending lifecycle makes at-least-once delivery safe.
- **port effort:** Medium. Conceptually small and transport-neutral; the value is the versioned registration + wake lifecycle, not the code. | **idea only:** True

## gajae.83 Canonical MCP connection-pool identity with generation-fenced leases

- **where:** runtime-mcp/pool.ts (1,460 lines), pool-key.ts (296), client.ts:315 `MCPConnectionCleanupFailure`
- **what:** Physical connections are pooled and shared across sessions; consumers hold leases. The pool key is a canonical identity (not a config hash) that folds realpath, transport, sharing mode, protocol preference, plugin network policy id, capability profile (`tools-only` vs `roots`), and an auth binding — with credentials stripped before hashing. Stale leases fail loudly via `MCPPoolLeaseObsoleteError` (generation) and `MCPPoolLeaseReleaseError` rather than silently reusing a dead socket.
- **how:** `buildMCPPoolKeyIdentity` / `computeMCPPoolKey`; `MCPPoolConfigError` codes MCP_USERINFO_NOT_ALLOWED, MCP_INVALID_ENDPOINT, MCP_SESSION_ID_REQUIRED, MCP_DUPLICATE_HEADER, MCP_AUTH_BINDING_REQUIRED; query text is percent-hex-normalized then SHA-256'd so an API key in the query never lands in a log or key
- **solves:** Multiple sessions hitting the same MCP server each spawning their own stdio process is expensive and breaks servers that hold per-process state; but sharing across sessions needs an identity that cannot be forged by a credential difference and cannot leak the credential.
- **port effort:** Medium-high. The key-canonicalization rules are directly reusable; the lease/generation machinery is a lot of code for a payoff that only exists if omp shares MCP connections across sessions. | **idea only:** True

## gajae.84 Smithery as a built-in remote MCP registry

- **where:** runtime-mcp/smithery-registry.ts (477), smithery-connect.ts (155), smithery-auth.ts (119)
- **what:** Search registry.smithery.ai for MCP servers, read deployment/config schema, and one-click connect a remote (http) or stdio server into the native config. Reachable from the slash-command surface and gated on real credentials.
- **how:** search over qualifiedName/displayName/description/verified/useCount; `SmitheryConnection` carries `type: http|stdio`, `deploymentUrl`, and a `configSchema` the add-wizard (modes/components/runtime-mcp-add-wizard.ts) renders into a form
- **solves:** MCP adoption is bottlenecked on discovery and on the config-scheme-to-`mcp.json` translation, which is exactly what a marketplace solves.
- **port effort:** Medium. Depends on Smithery staying viable; the reusable piece is treating a remote registry's JSON-Schema as the input to the same add-wizard that `gjc mcp add --command` drives. | **idea only:** True

## gajae.85 Bounded, explicit cross-host MCP import (never a live authority)

- **where:** discovery/mcp-compat.ts (9.3 KB, docstring lines 1-10), PROVIDER_IDS = {claude, codex}; consumed by the /extensions import transaction
- **what:** Claude Code `.mcp.json` and Codex `config.toml [mcp_servers.*]` are parsed and normalized into the internal `MCPServer` contract, but ONLY on explicit user action. Foreign user-home configs (`~/.claude`, `~/.codex`) are never scanned. discovery/index.ts carries a comment stating this is deliberate.
- **how:** `normalizeClaudeMcpJson(content, sourcePath, level)` takes content as an argument (never touches the filesystem itself); prototype-pollution guard runs on the RAW record before `expandEnvVarsDeep`, because env expansion rebuilds the object by plain assignment and would silently drop a `__proto__` own-property into the result's prototype
- **solves:** The obvious 'just read .mcp.json like Claude Code does' approach makes a foreign tool's file a silent competing runtime authority, and a repo-committed file becomes remote config injection.
- **port effort:** Low. The security argument for checking prototype-sensitive names BEFORE env expansion is subtle and worth copying regardless. | **idea only:** False

## gajae.86 Capability-registry discovery across 14 competitor config formats

- **where:** packages/coding-agent/src/discovery/ (24 files) + src/capability/ (17 files, index.ts 26 KB)
- **what:** A single capability/registry layer with 15 providers reading 14 different hosts' on-disk formats: native, mcp-json, claude, claude-plugins, codex, cursor, gemini, opencode, cline, windsurf, agents, agents-md, github, ssh-json. 15 capabilities: context-file, extension, extension-module, hook, instruction, mcp, prompt, rule, settings, skill, slash-command, ssh, system-prompt, tool.
- **how:** each provider self-registers on import via `registerProvider(capability.id, {...})`; discovery/index.ts imports capabilities first, then providers, and re-exports enable/disable/list/load with per-provider gating and a cache
- **solves:** Users already have prompts, skills, rules, hooks, and MCP servers configured in other tools. A provider-per-format registry imports all of it without any of it becoming authoritative.
- **port effort:** Medium-high (helpers.ts alone is 59 KB). omp already has discovery/catalog machinery, so the marginal value is mostly the provider list, not the framework. | **idea only:** True

## gajae.87 57-provider / 4,670-model catalog with 13 wire protocols and 57 OAuth flows

- **where:** packages/ai/src/models.json, src/models.ts, src/api-registry.ts, src/providers/*, src/utils/oauth/*, src/stream.ts, scripts/generate-models.ts
- **what:** 57 providers in a 2.1 MB generated models.json; 13 `KnownApi` wire protocols; 54 lazily-loaded provider modules (54,980 LOC); 57 registered OAuth flows; custom-API registration with per-sourceId teardown.
- **how:** providers load lazily so heavy SDKs stay out of the startup parse graph (register-builtins.ts header); `registerCustomApi(api, streamSimple, sourceId, stream)` reserves built-in names; `unregisterCustomApis(sourceId)` removes only that extension's entries; generator merges models.dev API + per-provider endpoint discovery + hand-written patches
- **solves:** Provider breadth plus extension extensibility without paying every SDK's import cost at boot, while letting an extension add a whole new wire protocol.
- **port effort:** Already have it. omp's KDL rule tree is strictly better than a 2.1 MB generated JSON plus 31 KB of imperative generator patches — this is the ONE area where gajae is behind the repo being surveyed, not ahead. | **idea only:** False

## gajae.88 git: 1,663-line centralized porcelain wrapper with repo locking

- **where:** packages/coding-agent/src/utils/git.ts (1,663 lines)
- **what:** One module wrapping the full git surface — diff, status, stage, commit, push, checkout, fetch, readTree, writeTree, commitTree, show, log, branch, remote, ref, config, worktree, patch, cherryPick, stash, clone — with `withRepoLock(cwd, fn, signal)` serializing mutations per repo and a typed `GitCommandError`.
- **how:** namespaces assembled with Object.assign; lock acquired around mutating operations; `GitHeadState` is a discriminated union (GitRefHead | GitDetachedHead)
- **solves:** Spawning `git` ad hoc from a dozen tools loses timeouts, output caps, and repo-level serialization, and lets two concurrent features race an index.lock.
- **port effort:** Already have it, and omp's version is stronger (a native `/vcs` subpath instead of a TS module). Note gajae still spawns raw `git` in 15+ other files, so even here the centralization is incomplete. | **idea only:** False

## gajae.89 Shell: vendored brush engine + a 20-filter output minimizer

- **where:** crates/pi-shell/ (34 files: shell.rs 3,568, process.rs 2,816, minimizer/ 16 files incl. filters/git.rs 511, cargo.rs 371, go.rs 433, js_tools.rs 532); exports `Shell`, `execute_shell`, `apply_bash_fixups`, `MinimizerOptions`
- **what:** A Rust shell that reuses the vendored `brush` crates rather than wrapping `/bin/sh`, plus a `minimizer/` subsystem with 20 language/tool filters (git, cargo, go, python, ruby, docker, bun, gh, js_tools, lint, pkg, cloud, dotnet, system, …) that reduces noisy command output before it reaches the model.
- **how:** `execute_shell` is exposed as a napi binding consumed by packages/coding-agent/src/exec/bash-executor.ts; `applyBashFixups` normalizes user-authored bash before execution
- **solves:** Two problems at once: predictable shell semantics without depending on the host shell, and not burning context on 4,000-line `npm install` logs.
- **port effort:** High, and mostly not novel — omp already has the shell via pi-natives. The genuinely distinct piece is the filter-per-toolchain minimizer, which is a decent idea but 5,000+ lines of Rust to re-create. | **idea only:** True

## gajae.90 Browser: 20-module CDP stack with 12 structured verbs and real Chrome profiles

- **where:** packages/coding-agent/src/tools/browser/ (20 modules, 5,652 LOC) + tools/browser.ts (22 KB); deps puppeteer-core 24.42.0, @puppeteer/browsers 2.13.0
- **what:** A browser tool whose model-facing surface is 12 structured verbs (navigate, click, type, fill, select, press, scroll, back, wait, observe, extract, screenshot) compiled onto in-tab helpers, running in a worker, with a raw-JS escape hatch; plus real Chrome profile mode (user_data_dir, profile_directory, background, no_focus, cdp_port) that drives an already-logged-in browser via CDP.
- **how:** elements are addressed by numeric `id` from a prior `observe` (selector fallback); actions are compiled by browser/actions.ts `compileActionSteps` onto the unchanged worker protocol; separate tab supervisor with dead-tab recovery, profile reuse and warmup, readability extraction, and render-mermaid/render paths
- **solves:** Asking a model to author raw page JavaScript for every interaction is slow and error-prone, and a fresh headless Chrome is useless against anything behind a login.
- **port effort:** Medium-high. omp already drives a browser. The distinctive part is the `observe`→id→verb loop plus real-profile CDP, not the puppeteer plumbing. | **idea only:** True

## gajae.91 Computer-use: gated macOS desktop control via a Rust supervisor

- **where:** tools/computer.ts (44 KB) + crates/pi-natives/src/computer/ (8 files: executor.rs 1,393, input.rs 1,057, controller.rs 802, capture.rs 382, supervisor.rs 204, permissions.rs 220); napi bindings computerScreenshot
- **what:** Screenshot/click/double_click/move/drag/scroll/type/keypress/wait plus a `batch` wrapper, executed through a native supervisor with permission checks, coordinate transforms, hotkey parsing and a bypass guard. Explicitly Apple-Silicon-macOS-only (excluded on linux, win32, darwin/x64).
- **how:** native supervisor process holds the Accessibility/ScreenRecording grant; `bypass_guard.rs` blocks escape hatches; per-test isolation is enforced by a computer-policy.ts gate plus computer.redteam.test.ts (32 KB) and computer.enforcement.test.ts (12 KB)
- **solves:** Desktop apps that have no web surface at all, without giving an agent unbounded OS control.
- **port effort:** Very high and platform-locked. The transferable idea is the permission + bypass-guard + redteam-test triad around a dangerous tool; the Rust supervisor is not worth porting to Linux-first omp. | **idea only:** True

## gajae.92 SDK broker over authenticated WebSocket with 19 typed operations

- **where:** packages/coding-agent/src/sdk/broker/ (27 files: lifecycle.ts 7,664, broker.ts 5,118, session-index.ts 2,515, managed-task-dag.ts 1,927, spawn-authority.ts 1,192, lifecycle-ledger.ts 1,035)
- **what:** A daemon that owns session lifecycle for out-of-process SDK clients: session list/create/fork/resume/close/delete/lookup/reconcile_uncertain, session control, model resolve, session spawn, task DAG, broker shutdown/status/restart. Protocol version 3, 4 MiB frame cap, HMAC + timing-safe-compare authentication, idempotency keys, an operation receipt ledger, a lifecycle ledger, and endpoint-incarnation authority.
- **how:** 19 operations in a `BROKER_OPERATIONS` Set on `broker/transport.ts`; discovery via a discovery file; `reconcile_uncertain` exists precisely because a client can die mid-operation — the ledger makes that recoverable instead of leaking a session
- **solves:** Multiple clients driving sessions need one authority, and network death between 'sent' and 'acked' must not leave orphan sessions.
- **port effort:** Very high (20k+ LOC). `reconcile_uncertain` plus the idempotency-key + receipt-ledger trio is the idea worth stealing; the rest is earned complexity. | **idea only:** True

## gajae.93 Web fetch with 74 site-specific extractors and 18 search providers

- **where:** packages/coding-agent/src/web/ — scrapers/ (79 files, index.ts re-exports 74 handlers), search/ (provider.ts registry, 21 provider modules), search/providers/insane.ts (21 KB, the vendored insane-search lineage)
- **what:** Fetch normalizes arbitrary pages to markdown via linkedom/turndown/readability, with 74 hand-written per-site handlers (npm, PyPI, crates.io, NuGet, Maven, GitHub, GitLab, HuggingFace, Discourse, Mastodon, Reddit, arXiv, Crossref, OSV, NVD, …) and 18 registered search providers behind a 17-entry default order.
- **how:** each handler claims a host and returns a typed RenderResult; search providers are lazily `import()`ed behind `{ id, label, load }` descriptors so a provider costs nothing until selected
- **solves:** Generic extraction returns navigation chrome and marketing copy; per-site handlers return the actual artifact. 18 interchangeable search backends means a dead provider is a config change.
- **port effort:** Medium for the lazy-provider descriptor pattern; very high for the 74 handlers, which is grinding work with no design content. omp should take the pattern and a handful of handlers, not the corpus. | **idea only:** True

## gajae.94 11 separate bun:sqlite databases with named path helpers

- **where:** packages/ai/src/{auth-storage,model-cache}.ts, src/session/{agent-storage,history-storage}.ts, src/memories/storage.ts, src/tools/{github-cache,read,write}.ts, src/gjc-runtime/{memory-guard-owner-claims,tmux-owner-isolation}.ts, src/ai/utils/tool-choice-capability.ts, packages/stats/src/db.ts; path helpers getAgentDbPath/getStatsDbPath/getModelDbPath in packages/utils/src/dirs.ts:894-913
- **what:** SQLite used for auth credentials, model cache (with schema version + static/dynamic fingerprint provenance), tool-choice capability cache, agent settings, session history, memories, GitHub cache, memory-guard owner claims, tmux owner isolation, and the stats dashboard. Read/write tools open a user-named `.sqlite` file read-only or create:false.
- **how:** all via `bun:sqlite` `new Database(path, {create, strict, readonly})`; three central path helpers so an agentDir profile moves every database together
- **solves:** Cross-process atomicity for state several daemons touch, without a server. `strict: true` turns silent type coercion into errors.
- **port effort:** Already have the primitive. The transferable detail is the model-cache provenance design — it stores `static_fingerprint` and `dynamic_model_provenance` alongside a schema version so a stale cache can be explained rather than silently trusted. | **idea only:** False

## gajae.95 ACP (Agent Client Protocol) adapter with MCP startup budgeting

- **where:** packages/coding-agent/src/sdk/acp/adapter.ts (1,058 lines), final-text.ts, mcp.ts; napi binding crates/gjc-sdk + crates/pi-natives/src/sdk.rs (1,333 lines) and python/gjc-sdk
- **what:** Speaks the Agent Client Protocol (@agentclientprotocol/sdk 1.3.0) as a front end, with an explicit readiness budget: `ACP_MCP_STARTUP_HEADROOM_MS = 250` is subtracted from the semantic-ready deadline so a slow MCP handshake cannot consume the whole startup window, and `ACP_MCP_REQUEST_TIMEOUT_MS = 30_000`.
- **how:** readiness deadline minus headroom gives the MCP startup ceiling; SessionLifecycleMcpServer is a discriminated union of stdio | http | sse with env/headers
- **solves:** Third-party clients (Zed, etc.) need one protocol, not per-client adapters; and a slow MCP server must not make the whole client look hung.
- **port effort:** Medium if omp wants editor-embeddable operation. The readiness-budget arithmetic is a small, high-value idea. | **idea only:** True

## gajae.96 Function-hook capability system với attenuation + grant hash + audit chain

- **where:** packages/coding-agent/src/extensibility/extensions/function-hooks.ts (959 dòng) + runner.ts (72KB) + wrapper.ts
- **what:** Hook được cấp grant theo cây capability (tool.inspect/transform/deny, ui.*, session.*, audit.append, network.fetch, filesystem.read) kèm networkDestinations và filesystemRoots. Có `attenuateDownstream` (chỉ thu hẹp, không mở rộng), `intersectFunctionHookGrants` (giao), `functionHookGrantHash` (SHA-256 canonical), audit record ghi `payloadHash`/`capabilityHash`/`effectiveCapabilities`/`requestedCapabilities`.
- **how:** `normalizeFunctionHookGrant` validate + Object.freeze; `createFunctionHookCapabilities` dựng object API chỉ gắn method cho operation được cấp; mỗi call lại `assertActive()` + check operation; `network.fetch` ép `redirect:"error"` và chỉ cho origin trong grant; `filesystem.read` nhận `grant.filesystemRoots` làm tham số bắt buộc.
- **solves:** Chặn plugin/extension chiếm quyền: một hook khai báo `tool.inspect` không thể lấy `network.fetch`; grant của caller bị giao với host ceiling, không bao giờ nới lỏng. Đây là mô hình capability thật, không phải kiểm tra allowlist rời rạc.
- **port effort:** cao — cần port cả function-hooks.ts, runner.ts phần hook chain, và bảng contract. Ý tưởng đáng lấy nguyên: capability + attenuation + grant hash + audit record. | **idea only:** False

## gajae.97 Hook convention-normalization với typed diagnostics thay vì reject im lặng

- **where:** packages/coding-agent/src/hooks/events.ts + normalize.ts
- **what:** Một bảng `CONVENTION_EVENT_CONTRACTS` khai báo 6 convention (native-gjc, claude-code, codex, codex-managed-json, gjc-plugin, in-process) × 6 canonical event, mỗi ô mang authority / awaitBehavior / errorBehavior / timeoutMs / processAuthority / trustRequirement / redaction. `normalize.ts` biến bảng đó thành 9 mã chẩn đoán có cấu trúc thay vì throw.
- **how:** `normalizeDirectoryHook` / `normalizeManagedJsonHook` / `normalizePluginHook` / `normalizeInProcessHook` trả `NormalizeHookResult {hook|null, diagnostics[]}`; `normalizeHookBatch` dedupe first-wins và giữ cả entry trùng trong diagnostics.
- **solves:** Ba hệ sinh thái hook (Claude Code, Codex, GJC native) có tên event và ngữ nghĩa khác nhau. Bảng + alias + diagnostics làm việc hợp nhất trở thành dữ liệu có kiểm chứng thay vì đối chiếu tay.
- **port effort:** trung bình — bảng contract + normalizer gần như có thể chuyển nguyên văn, chỉ đổi tên event. | **idea only:** True

## gajae.98 Secret obfuscation bằng keyed PRF, không phải mask tĩnh

- **where:** packages/coding-agent/src/secrets/obfuscator.ts (437 dòng) + secrets/index.ts
- **what:** Thay vì `sk-***abcd`, secret được thay bằng chuỗi cùng độ dài sinh từ HMAC-SHA256 với key 32 byte random **per process** và domain separator riêng cho placeholder vs replacement. Rejection-sampling lấy byte < 248 để phân phối ký tự đều tuyệt đối trên 62 ký tự.
- **how:** `createSecretObfuscator` sinh key random mỗi process; replacement giữ nguyên `String.length`; project `secrets.yml` chỉ được khai báo `plain`, `regex` bị skip (global-only) vì regex là denial-of-service vector.
- **solves:** Một observer thấy transcript (context model, log provider, transcript chia sẻ) không thể offline-confirm candidate secret và không thể precompute replacement, vì không có key.
- **port effort:** thấp-trung bình — file tự chứa, phụ thuộc `redactCrashSecrets` từ utils. Cần port cả utils/crash-redaction.ts. | **idea only:** False

## gajae.99 Credential environment tách khỏi project `.env`

- **where:** packages/utils/src/env.ts:227 + session/startup-auth-config.ts:113 + utils/npm-registry.ts:22
- **what:** `$credentialEnv(name)` đọc theo thứ tự: inherited shell env → live Bun.env → agent `.env` → pi `.env` → home `.env` → home shell env. KHÔNG BAO GIỜ đọc `<cwd>/.env` — layer mà Bun tự merge vào `Bun.env` khi launch trong repo.
- **how:** `$inheritedEnv` chụp snapshot lúc import để pin provenance (không phải cache vĩnh viễn — xóa env là có hiệu lực); `$rotatingCredentialEnv` cho phép token rotate trong file agent khi process còn sống.
- **solves:** Repo người dùng vừa clone không thể tự chỉ định credential hoặc redirect nơi credential được gửi đi. `npm-registry.ts` còn bỏ luôn project `.npmrc` vì lý do tương tự.
- **port effort:** trung bình — cần chỉnh lại toàn bộ call site đọc env cho credential. Ý tưởng (`$credentialEnv` vs `$inheritedEnv`) rất đáng port. | **idea only:** True

## gajae.100 Telemetry allowlist + forbidden-key fail-closed + kill switch

- **where:** packages/coding-agent/src/telemetry/{events,transport,control}.ts + settings-schema.ts:1834
- **what:** Chỉ 5 event name (update_check/install), chỉ 5 field, mọi key khớp `FORBIDDEN_KEY` làm serialize throw. `serializeTelemetryEvent(input: unknown)` nhận `unknown` và tự dựng output từ allowlist.
- **how:** Default `telemetry.enabled: false`; `GJC_DISABLE_TELEMETRY` là kill switch process-wide không override được bởi project dotenv; `hasForbiddenKey` quét đệ quy toàn cây; transport `redirect:"error"`, max 2 in-flight, timeout 1.5s, nuốt mọi lỗi.
- **solves:** Telemetry không bao giờ trở thành đường rò rỉ ngoài ý muốn: thêm field mới vào event là việc phải sửa allowlist, và bất kỳ key nhạy cảm nào lọt vào là fail-closed chứ không phải bị bỏ qua.
- **port effort:** thấp — 3 file, không phụ thuộc gì. Port gần như nguyên văn. | **idea only:** False

## gajae.101 Crash relay: hai tầng consent tách biệt, không có DSN literal trong binary

- **where:** packages/coding-agent/src/crash/upstream/{relay,dsn,envelope}.ts + utils/crash-redaction.ts (90 dòng, 12+ shape token)
- **what:** `gjc crash report` (issue flow) giữ consent theo từng lần gọi có digest-confirm. Relay Sentry là kênh egress thứ hai, gated bằng config, hẹp hơn nhiều: default off (off ⇒ **không đọc state, không IO**), phải có DSN do operator cung cấp, mọi byte phải qua `sanitizeExternalCrashV1` và refuse = drop không có fallback.
- **how:** Relay chạy ở startup kế tiếp sau compaction, không chạy trên fatal path (process chết vẫn chỉ làm đúng một write `O_APPEND`); cap 8 signature/run; `redactDsn` bỏ public key khi log.
- **solves:** Không build nào có sẵn destination để gửi crash đi nếu operator không cấu hình. Đồng thời tách bạch "cho phép gửi report" và "cho phép auto-relay".
- **port effort:** trung bình — logic dễ port nhưng phụ thuộc `crash-journal` + `index-store` + `postmortem.ts` (30KB). | **idea only:** True

## gajae.102 Lock file với host identity + stale verdict + manual cleanup command

- **where:** packages/coding-agent/src/config/file-lock.ts (94KB) + gjc-runtime/session-state-lock.ts
- **what:** `acquireFileLock` / `withFileLock` / GC / staging reap. Owner token gồm host id + pid + process start time; có `previousOwnerHostIds` để reclaim an toàn trên shared volume. Stale removal trả verdict có type, và khi cùng một owner chết lặp lại thì sinh `manualCleanupCommand` cho người vận hành.
- **how:** session-state-lock chịu cả 2 on-disk shape (regular-file `.lock` JSON của Coordinator cũ vs directory-style lock của runtime base) bằng `lstat`, và fail-closed khi gặp symlink/FIFO/socket/device.
- **solves:** Crash-loop state file không kẹt vĩnh viễn; đồng thời không bao giờ đi theo symlink do kẻ tấn công chọn.
- **port effort:** cao — 94KB phụ thuộc native bindings (`@gajae-code/natives`: snapshotDirectoryTree, renameNoReplacePathAsync…). Ý tưởng stale-verdict + manual-cleanup-command rất đáng lấy. | **idea only:** True

## gajae.103 Guard chain phân tầng quanh mọi tool, có provenance của "built-in đã chứng minh"

- **where:** packages/coding-agent/src/session/agent-session.ts:11661-11705
- **what:** Mọi tool đi qua 5 lớp: `guardToolForUltragoalAsk` → acp-permission → workflow-mutation-guard → cwd-transition-fence → ExtensionToolWrapper. Có bộ nhớ cache wrapper theo cache key để không rebuild mỗi lần.
- **how:** Comment tại dòng 11696-11698 nói rõ: wrapper dựng từ built-in đã chứng minh thì kế thừa proof; wrapper dựng từ custom/MCP/extension tool thì kế thừa **không**.
- **solves:** Phân biệt được "tool này được host bảo đảm" với "tool này do bên thứ ba mang vào" — nền tảng cho policy khác nhau theo nguồn.
- **port effort:** trung bình — pattern Proxy-chain rất dễ tái dựng, cần giữ nguyên nguyên tắc provenance. | **idea only:** True

## gajae.104 Điều kiện trả về của hook được schema-check trước khi vào host control flow

- **where:** packages/coding-agent/src/extensibility/extensions/function-hooks.ts:900-959
- **what:** `isValidFunctionHookReturnValue` kiểm tra từng event type với `hasOnlyKeys` — hook trả về key lạ (vd `tool_call` trả kèm `content`) bị từ chối thay vì được spread vào state.
- **how:** `isPlainFunctionHookData` + `isSafeFunctionHookValue` chặn prototype lạ, getter, cycle, non-finite number; `cloneFunctionHookDataStrict` dùng `structuredClone` rồi verify lại là plain data.
- **solves:** Chặn prototype-pollution và việc hook âm thầm chèn field vào event để đi vòng kiểm tra của host.
- **port effort:** thấp — logic thuần, không phụ thuộc runtime. | **idea only:** False

## gajae.105 Redaction có budget thay vì redact vô hạn

- **where:** packages/coding-agent/src/extensibility/extensions/function-hooks.ts:334-372
- **what:** `redactFunctionHookValue` giới hạn depth 5, 32 key mỗi object, 32 phần tử mỗi array, chuỗi 512 char, key 80 char; accessor thành `<accessor>` mà KHÔNG gọi.
- **how:** Dùng `Object.getOwnPropertyDescriptor` + kiểm `"value" in descriptor`; WeakSet chống cycle; `payloadHash` băm **sau** khi redact.
- **solves:** Một hook trả về object khổng lồ hoặc có getter độc hại không làm nghẽn hay side-effect lúc audit.
- **port effort:** thấp — hàm thuần, copy gần như nguyên văn. | **idea only:** False

## gajae.106 `gjc doctor` với repair có journal, dry-run và precondition

- **where:** packages/coding-agent/src/cli/doctor/
- **what:** 25 file / 14.140 dòng, 13 check id (runtime, config, permissions, installation, link, credentials, mcp, native, projection, service, plugin…). Repair khai báo `riskClasses`, `authorization`, `preconditions`, `sideEffectStarted`, `nonrollbackableEffects`, và ghi `DoctorJournal`.
- **how:** Permission repair yêu cầu `native exact identity` (so với dev/ino đã ghi) + `owner-preserving mode reduction` + `ACL absence`, hỗ trợ `--dry-run`; có `plugin-quarantine.ts` / `plugin-restore.ts` để cô lập plugin lỗi.
- **solves:** Sửa chữa cấu hình/quyền mà không phá hỏng thêm, và mọi thay đổi đều truy vết được.
- **port effort:** cao — 14k dòng. Ý tưởng "repair có precondition + journal + authorization list" rất đáng lấy. | **idea only:** True

## gajae.107 Daemon operator contract: exit code tách lỗi, và thừa nhận "unknown ≠ applied"

- **where:** packages/coding-agent/src/daemon/operator-contract.ts
- **what:** `DAEMON_EXIT = {ok:0, failure:1, usage:2}`; ownership-mismatch guard từ chối start khi đã có daemon sống với bot token/chat khác; `daemonOperationOutcome` trả `"unknown"` khi `!result.ok`.
- **how:** Comment: "A refused result may follow a successful stop or spawn; snapshots and prose do not prove that no effect occurred. Only completed results prove applied."
- **solves:** Script automation không diễn giải "từ chối" thành "không có gì xảy ra" — một quan niệm sai thường gây mất dữ liệu khi ghép nối cạnh bị giữa chừng.
- **port effort:** thấp-trung bình — chỉ là type + formatter, dễ port. | **idea only:** True

## gajae.108 Bash allowlist với shell parser tự viết thay vì regex

- **where:** packages/coding-agent/src/tools/bash-allowed-prefixes.ts (12KB) + tools/bash.ts:1320-1400
- **what:** Không so khớp regex trên chuỗi lệnh. Một tokenizer theo ký tự với state machine tilde-expansion, phân biệt quote/assignment word/expansion, chặn `;|&<>()`, chặn `$ * ? [ ] { }` chưa quote, chặn command substitution và backslash escape. Profile `read-only` ép `normalizeReadOnlyBashCommand`.
- **how:** Đồng thời kiểm cả `rawCommand` lẫn `command` đã bóc `cd ... &&` để không né bằng prefix navigation.
- **solves:** Đóng các lỗ hổng kinh điển của allowlist shell bằng regex (quote smuggling, tilde expansion sai vị trí, `&&` prefix).
- **port effort:** trung bình — parser độc lập, port được; cần map lại policy. | **idea only:** True

## gajae.109 Spawn gate: bắt buộc justification có cấu trúc khi fan-out lớn

- **where:** packages/coding-agent/src/task/spawn-gate.ts
- **what:** Trên `DEFAULT_SPAWN_THRESHOLD = 4` child, mọi lần spawn phải kèm `SpawnPlanReceipt` đủ 5 field (`whyParallel`, `whyNotLocal`, `independence`, `expectedReceiptShape`, `maxInlineTokens`), thiếu bất kỳ field nào thì `outcome:"rejected"` kèm danh sách `missingFields`.
- **how:** `decide()` là hàm thuần, `evaluateSpawnGate` là entry point; `findMissingPlanFields` trả về danh sách cụ thể để agent sửa được ngay.
- **solves:** Chặn subagent fan-out không kiểm soát bằng cách buộc agent cam kết bằng văn bản trước khi nhân bản bản thân.
- **port effort:** thấp — 90 dòng thuần logic. | **idea only:** False

## gajae.110 Background job có ownership lease + dead-letter + resume descriptor

- **where:** packages/coding-agent/src/async/job-manager.ts (127KB)
- **what:** Job model có `AsyncJobDelivery` state machine (`pending|delivered|failed-visible`), `AsyncJobReceiptClaim`, `DeadLetteredDelivery`, `OwnerSubagentShutdownError` với Target/Lease/Proof, `ResumeDescriptor`/`ResumeQueueEntry`, `AsyncJobWaitOutcome = completed|timed_out_wait|interrupted`.
- **how:** Ownership gắn theo tool-call id + lineage hash + endpoint id; resume cấp lại lineage/epoch MỚI tại thời điểm dequeue thật, không phải lúc enqueue.
- **solves:** Phân biệt "job con thuộc sở hữu của tôi" với "job của session khác còn sót", và không để job chết im lặng.
- **port effort:** cao — 127KB. Cấu trúc `OwnerSubagentShutdownProof` và `JobDeliveryState` thì đáng lấy nguyên. | **idea only:** True

## gajae.111 Config resolution có `!` = shell command, cache + dedupe + timeout

- **where:** packages/coding-agent/src/config/resolve-config-value.ts
- **what:** Bất kỳ giá trị config nào bắt đầu bằng `!` sẽ được chạy qua native `executeShell` với `timeoutMs = 10_000`, cache suốt đời process, dedupe bằng `commandInFlight` map, `cacheScope` để tách cache khi caller rotate config. Nhánh không phải `!`: env var trước, rồi literal.
- **how:** Consumer: MCP server `env`/`headers` (runtime-mcp/manager.ts:3245) và SDK `configValueResolver`.
- **solves:** Cho phép lấy secret không nằm sẵn trong config (1Password, keychain, `op read`).
- **port effort:** thấp về code, CAO về rủi ro — xem finding #3. Nếu port thì phải kèm trust gate. | **idea only:** True

