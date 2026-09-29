# senpi — chunk 2/5 (22 năng lực)

## senpi.23 Side query (/btw) with tool-free context isolation

- **where:** packages/coding-agent/src/core/extensions/builtin/btw/side-query.ts (SIDE_QUERY_INSTRUCTION:22, boundSideQueryMessages:37, buildSideQueryContext:65, runSideQuery:110)
- **what:** A side question answered from the current conversation WITHOUT touching the main task: builds a context from the session history, appends a fixed non-continuation instruction, and issues a raw `streamSimple` with `tools: []`. The context is bounded to the model's real prompt window by reducing, repairing orphan tool pairs, and pruning to budget, then throwing a typed error if it still does not fit.
- **how:** `boundSideQueryMessages` computes the message budget, and if over, runs reduceContextMessages → repairOrphanedToolResults → pruneOldMessagesToBudget → repairOrphanedToolResults, re-checking after each. `DEFAULT_ESTABLISHMENT_TIMEOUT_MS = 30_000`.
- **solves:** "What was that env var again?" should not consume a turn, mutate state, or extend the main conversation. `tools: []` makes the non-mutation structural rather than prompt-level.
- **port effort:** low | **idea only:** True
## senpi.24 Host-authorized session-worker credit (SharedArrayBuffer blocking)

- **where:** packages/coding-agent/src/modes/rpc/session-worker-credit.ts:24-50; protocol constants in modes/rpc/session-worker-protocol.ts (69 LOC); worker lifecycle in experimental/session-worker-manager.ts (885 LOC)
- **what:** Spawned session workers must obtain host permission before touching a writer, publishing output, or resizing a display. The worker blocks its own thread with `Atomics.wait` on a 4-byte SharedArrayBuffer until the host answers `granted | conflict | limit`.
- **how:** `installWriteReservation` maps conflict→`throw new Error("session_path_in_use")` and limit→`throw new Error("session_reservation_limit")` — both recoverable domain errors — while a missing answer is worker-fatal (`session_worker_credit_timeout`).
- **solves:** Multi-process sessions on shared files need a mutex the worker cannot bypass, and it must be synchronous because a worker thread cannot await a host round-trip inside a synchronous tool API.
- **port effort:** medium | **idea only:** True
## senpi.25 Autonomous loop scheduler (wakeup over an agent session)

- **where:** packages/coding-agent/src/core/extensions/builtin/loop/index.ts:1-20 (the rules as comments), types.ts (LOOP_PHASES, LoopPayload, LoopSentinel), scheduler.ts (33 KB), store.ts (18 KB), tick-prompt.ts, cron-planner.ts
- **what:** A `/loop` feature that re-prompts a session on a fixed or model-scheduled cadence. Six phases (starting, waiting, queued, running, suspended, ended) with exhaustive terminal reasons. The load-bearing rules are stated in the file header: a tick NEVER steers (idle goes through `sendUserMessage` with `expandPromptTemplates: true` so a slash payload reaches the real command path; a busy session receives it as a follow-up); shutdown SUSPENDS rather than ends (every shutdown reason is resumable); keepalive applies only to an attributed dynamic iteration, never after an ordinary turn and never after a user abort; and a store failure ends the affected loops with `error` rather than being swallowed, because a schedule that cannot be persisted must not keep running.
- **how:** Pure decision modules (scheduler, tick-prompt, cron-planner, loopfile, status) with all impure wiring isolated in index.ts. Sentinels `<<autonomous-loop>>` / `<<autonomous-loop-dynamic>>` / `<<loop.md>>` anchor the state file.
- **solves:** Long-running autonomous work that survives a restart without either losing the schedule or running away from a schedule that can no longer be persisted.
- **port effort:** high — but the four rules in the header are worth copying verbatim into OMP's own scheduler | **idea only:** True
## senpi.26 Per-directory changes.md tracker with upstream-pin coverage gate

- **where:** `packages/coding-agent/src/core/changes.md` (480 KB) and 60 sibling trackers; policy in root `AGENTS.md` under "CHANGES.MD TRACKER POLICY"; enforced by `scripts/check-pr-changelog.mjs` (per-PR, wired to `.github/workflows/changelog-gate.yml`) and `scripts/audit-changes-md.mjs` (whole-tree, `--format json|markdown`).
- **what:** Every directory that diverges from upstream carries a `changes.md` with four mandatory headings per entry: `What changed`, `Why`, `Why an extension could not handle it`, `Expected merge conflict zones`. Coverage is computed against the pinned upstream tree in `.github/upstream.json` (tag+sha), so a path is upstream-owned iff it exists in that tree.
- **how:** `scripts/changes-md-policy.mjs` computes production scope (excludes trackers, lockfiles, tests, docs, `*.generated.*`), walks each changed path to its EXACT nearest ancestor tracker, and fails if no entry names that exact repo-relative path. Pin-sync PRs get a narrow exemption for paths that exactly match the new pin.
- **solves:** Making a long-lived fork of a fast-moving upstream reviewable: every divergence is self-documenting at the point of code, and a mechanical gate stops the fork from silently accumulating un-recorded deltas that turn the next upstream merge into an archaeology exercise.
- **port effort:** Medium. The idea is a few hundred lines plus a documented policy; the expensive part is the taxonomy of what counts as "production" vs exempt, which you must tune to your own repo. Directly portable. | **idea only:** True
## senpi.27 Distributed AGENTS.md tree (73 files) as a hierarchical map

- **where:** Root `AGENTS.md`; nested at `packages/ai/src/tool-call-middleware/AGENTS.md`, `packages/coding-agent/src/core/extensions/builtin/mcp/AGENTS.md`, `crates/senpi-grep/AGENTS.md`, `scripts/AGENTS.md`, etc.
- **what:** Root AGENTS.md is a ~19 KB router: a STRUCTURE table, a WHERE-TO-LOOK table, a CODE MAP of the 5 highest-risk files, COMMANDS, CONVENTIONS, QUALITY GATES, DEPENDENCIES, GIT AND DELIVERY. It deliberately holds NO file-level detail and defers to the ~72 nested AGENTS.md, one per meaningful directory down to `test/suite/regressions/`.
- **how:** Single filename across all vendors — no CLAUDE.md/GEMINI.md variants exist (verified: `git ls-files | grep -iE '(claude|gemini|codex|qwen)...\.md$'` is empty). Rule in the root file: "read the nearest one before editing".
- **solves:** Keeping per-directory agent context fresh without one unmaintainable mega-file. Each subdirectory owns its own map, so a change to `builtin/mcp/` updates `builtin/mcp/AGENTS.md` and nothing else.
- **port effort:** Low mechanically, high in discipline. The value is the rule that detail lives at the leaf and the root only routes. Note the file is machine-generated (header: `Generated: <date> / Commit: <sha>`) and this copy is 4,270 commits stale — the generation is the load-bearing part. | **idea only:** True
## senpi.28 Vendored Codex app-server protocol with a handwritten facade over untouched generated bytes

- **where:** `packages/coding-agent/src/modes/app-server/protocol/generated/` (620 files, 6,621 lines) and its 20-file facade beside it. Regenerated by `packages/coding-agent/scripts/generate-app-server-protocol.sh`.
- **what:** 620 tracked files of Codex's `app-server` TypeScript protocol schema are copied in verbatim from a pinned Codex commit, plus `PROTOCOL_VERSION.txt` recording `codex-git <sha> (<author date>)`. A separate handwritten facade layer sits on top and is the only thing app code may import.
- **how:** Three-part trick, all documented in that dir's README: (1) the script copies the Codex checkout's `codex-rs/app-server-protocol/schema/typescript` recursively and DELETES files no longer upstream, preserving only a local `generated/package.json`; (2) that one shim file marks the subtree CommonJS so ts-rs's extensionless sibling imports still typecheck under Node16/NodeNext ESM WITHOUT altering a single generated byte; (3) the package build excludes `generated/**/*.ts` so the raw tree is type evidence, not build input.
- **solves:** Getting exact wire compatibility with another agent's protocol (Codex) without forking their repo and without letting their generated code leak into your dependency graph or break your compiler settings.
- **port effort:** Medium-high. The CommonJS-shim idea is the genuinely novel bit and is portable as-is; the facade discipline ("runtime must import the facade, never `generated/**`") is the rule that keeps it from rotting. | **idea only:** True
## senpi.29 Extension-first architecture with one authoritative ordering array

- **where:** `packages/coding-agent/src/core/extensions/builtin/` (57 entries); authority is `builtin/index.ts` lines 65-122.
- **what:** 44 builtin extensions, each in its own directory with its own `index.ts`, `AGENTS.md`, `changes.md` and tests, registered through a single exported array. Comments in that array state WHY each entry sits where it does.
- **how:** `export const builtinExtensions: BuiltinExtensionFactory[] = [...]` with inline rationale per entry, e.g. "Keep MCP last so its eventual provider-payload tap observes all co-resident builtin mutations" and "Loop guard owns the first veto opportunity so repeated calls never re-run hooks or permission prompts." Root AGENTS.md: "the only authority on numbering... never quote a registration number from prose."
- **solves:** Order-dependent behavior in a plugin-style system is invisible by default. Encoding the order plus its load-bearing reasons in one file makes the ordering a reviewable artifact instead of an emergent accident.
- **port effort:** Low. Cheap to adopt, high payoff. The "one authority, never quote it in prose" clause is the part worth copying verbatim. | **idea only:** True
## senpi.30 Fork-publish name rewriting (upstream names never reach npm)

- **where:** `scripts/publish.mjs` + `scripts/registry-packages.mjs` + `scripts/prepare-senpi-publish-manifest.mjs`; documented in root AGENTS.md "RELEASE NOTES".
- **what:** All workspace manifests stay `private: true` under upstream's `@earendil-works/pi-*` names, so the in-repo dependency graph keeps reading like upstream. Only at publish time are manifests rewritten to `@code-yeongyu/senpi-*`.
- **how:** `registry-packages.mjs` maps directory -> `registryName`; `getPublicWorkspacePackages()` in `scripts/release-packages.mjs` consumes that map. Because published names differ from manifest names, the runtime-dep contract has to be re-derived — release-packages.mjs carries an explicit comment about this ("The fork's published sources are private: true under their upstream names... so the fork's runtime-dependency contract is the union").
- **solves:** Letting a fork keep upstream's file layout and internal import graph (so upstream merges apply cleanly) while still owning its published artifact identity.
- **port effort:** High. This is release-engineering heavy and assumes a similar fork shape. The idea is reusable; the implementation is not copy-pasteable. | **idea only:** True
## senpi.31 Three package managers supported in parallel, with a self-test for the manifest rules

- **where:** Root `package.json` (60+ scripts), `pnpm-workspace.yaml`, `scripts/verify-package-managers.mjs`, `scripts/run-workspaces.mjs`, `scripts/root-workspace-scripts.test.mjs`.
- **what:** npm, pnpm and bun are all first-class: `bun.lock`, `package-lock.json` and `pnpm-workspace.yaml` are all committed, and `scripts/verify-package-managers.mjs` snapshots the worktree to a temp dir per PM, deletes foreign lockfiles, and runs install+build for each.
- **how:** Root scripts reach workspaces ONLY via `node scripts/run-workspaces.mjs`. Root AGENTS.md documents why, with a scar: "`npm run --workspaces`... hardcode npm, and under bun the flag-after-name form re-entered the root script forever." `scripts/root-workspace-scripts.test.mjs` fails the manifest if any of those shapes reappear.
- **solves:** Preventing the silent PM-specific footguns that break a multi-PM repo, and turning each lesson into a manifest-level assertion rather than tribal knowledge.
- **port effort:** Medium. `run-workspaces.mjs` plus a manifest test is portable; the ban-list should be rewritten for whatever PMs you actually support. | **idea only:** True
## senpi.32 Test suite that outgrows the source it tests

- **where:** `packages/coding-agent/test/` (1,985 files); `test/suite/regressions/AGENTS.md`.
- **what:** 1,650 `*.test.ts` files; 349,513 test lines against 237,382 src lines. A named `test/suite/regressions/` subtree (312 files) with its own AGENTS.md holds one test per fixed real-world issue, plus golden/`.jsonl` fixture dirs and snapshot tests.
- **how:** Root AGENTS.md: "New coding-agent lifecycle tests go in `test/suite/`; when a regression test fixes a GitHub issue, add a comment with the issue number next to the test; the flat `test/*.test.ts` root cluster is legacy placement and must not grow." Live/credentialed surfaces are opt-in via env (`PI_RUN_INTEGRATION=1`, `PI_ENABLE_*`), and `test/setup.ts` force-overrides the state dir into a temp dir.
- **solves:** Making a hostile-input surface (a coding agent with shell access) testable at all, and keeping every regression permanently pinned to a named issue.
- **port effort:** Low to adopt the conventions; the ratio itself is a maturity marker, not a target. The "flat root cluster must not grow" rule is the portable part. | **idea only:** True
## senpi.33 Build and release scripts tested as first-class code

- **where:** `scripts/`, run by `npm run test:scripts` = `node --test scripts/*.test.mjs`.
- **what:** ~50 of the 199 files in `scripts/` are `*.test.mjs` siblings of release/publish/build tooling: `build-binaries-workflow.test.mjs`, `publish-workflow.test.mjs`, `check-lockfile-commit.test.mjs`, `install-lock-validation.test.mjs`, `changelog-checkout.test.mjs`, and so on.
- **how:** Examples of what gets asserted: `build-all.test.mjs` pins the topologically-ordered build phases and asserts `packages/chord` builds before every dependent; another test asserts exact `BUILD_PHASES[0] === ["packages/chord"]`.
- **solves:** Release pipelines fail at the worst possible time and are usually untested. Here the publish graph, lockfile policy and workflow YAML are all covered by ordinary unit tests in the normal `bun run test` path.
- **port effort:** Medium. Adopting the discipline of putting a `.test.mjs` next to every pipeline script is the whole idea. | **idea only:** True
## senpi.34 Executable evidence gate: no QA receipt, no commit

- **where:** `.agents/skills/senpi-qa/` (146 files, its own package.json + lockfile, described as a "private dependency island outside the workspace"); `scripts/tracked-harness-artifacts-audit.test.mjs` fails the build if anything under `.omo/`, `local-ignore/`, `.qa-evidence/`, `qa-evidence/` is tracked.
- **what:** Changes under the release-managed packages require real-CLI QA receipts saved under `local-ignore/qa-evidence/<YYYYMMDD>-<slug>/`, summarized in the PR body with a `sha256sum` line per file, and never committed.
- **how:** Evidence stays local by construction; only a decisive excerpt plus checksums cross into the PR. Root AGENTS.md adds: "Evidence, logs, comments, and PR bodies must never contain tokens, credentials, auth headers, cookies, or raw environment dumps."
- **solves:** An agent-driven workflow otherwise accumulates local working state (plans, transcripts, scratch) that quietly becomes permanent repo content and eventually leaks.
- **port effort:** Low. The audit test is ~50 lines and the concept is fully portable. | **idea only:** True
## senpi.35 Merge-gating PR claim labels

- **where:** Root `AGENTS.md` section "Review claim labels (merge-gating)"; automation in `.github/workflows/review-claims.yml` (267 lines).
- **what:** Three labels drive review workflow: `will-review` (claimed, not started), `in-review` (active), `stale-review` (a claim aged 3+ days; the sweep removes the claim labels and applies this). Applying either claim label auto-requests a labeler and BLOCKS merge via a required `Review claim gate` check.
- **how:** Claim labels are removed automatically ONLY when the claimer themself submits an approve/request-changes review; the rules explicitly forbid hand-removing someone else's claim.
- **solves:** Multi-agent / high-throughput branches where a reviewer announces intent but the PR can still merge underneath them.
- **port effort:** Medium. Portable if you use GitHub required checks; needs adapting if your review flow differs. | **idea only:** True
## senpi.36 CalVer lockstep versioning with documented, code-enforced exceptions

- **where:** `scripts/release-packages.mjs` (`WORKSPACE_PACKAGES`, `BUNDLED_INTERNAL_WORKSPACES`), `scripts/sync-versions.js` (`INDEPENDENT_VERSION_PACKAGE_NAMES`), `scripts/calver.mjs`.
- **what:** 11 packages share `2026.9.28-3`. Three packages deliberately do not, and each exception is enforced in code with a comment citing the reason and the issue number.
- **how:** chord keeps upstream `0.85.1` because it is byte-for-byte upstream (issue #1632) and must resolve its own declared edges to upstream's published version; sqlite-node keeps `0.83.0` because it is not reachable from the shipped runtime. Internal deps still get re-synced to workspace versions; `file:`/`link:`/`workspace:`/`npm:` specifiers are explicitly skipped so local installs don't break.
- **solves:** A monorepo that vendors a subset of upstream cannot run naive lockstep versioning without either lying about the vendored package's identity or breaking its dependency resolution.
- **port effort:** Medium. The pattern — declare the exception list in one place with a reason and an issue link — is the reusable part. | **idea only:** True
## senpi.37 Extension-authoring curriculum as executable examples

- **where:** `packages/coding-agent/examples/extensions/` (115 tracked files) with its own `README.md` and `AGENTS.md`.
- **what:** ~60 standalone extension examples under `packages/coding-agent/examples/extensions/`, ranging from 355-byte `widget-placement.ts` and 628-byte `hello.ts` to `ssh.ts`, `interactive-shell.ts`, `subagent/`, `plan-mode/`, `sandbox/`, `gondolin/`, `space-inviders.ts` and a vendored `doom-overlay/` (with its own doom.wasm).
- **how:** Each is a real loadable extension (`package.json` `"pi": {"extensions": ["./index.ts"]}`). Five of them are also declared as npm/pnpm workspaces so they resolve against the monorepo rather than the registry.
- **solves:** Making the extension API learnable by reading rather than by reading the core.
- **port effort:** Low. Cheap and high-value if you have a plugin surface worth teaching. | **idea only:** True
## senpi.38 Model/provider layer split by axis (metadata vs wire), with a faux provider for tests

- **where:** `packages/ai/src/providers/`, `packages/ai/src/api/`, `packages/ai/src/tool-call-middleware/` (57 files, incl. a `recovery-*` stream-failure family).
- **what:** 112 provider entries as `<vendor>.ts` + `<vendor>.models.ts` pairs (metadata/identity), and 59 wire implementations in `src/api/` (streaming/protocol). Every wire impl has a `.lazy.ts` sibling for browser-safe lazy loading. `src/providers/faux.ts` (24 KB) is a test provider.
- **how:** The `.lazy.ts` convention is the documented exception to the repo-wide "no inline/dynamic imports" rule, so browser-safety is visible in the filename rather than in a comment.
- **solves:** Keeping "what model is this" separable from "how do I talk to it", so adding a vendor is usually one metadata file plus one wire file.
- **port effort:** Medium. The naming convention and the lazy-sibling rule are cheap; the 45 committed data JSONs are a per-project cost. | **idea only:** True
## senpi.39 Extension system as the primary feature-delivery mechanism

- **where:** packages/coding-agent/src/core/extensions/ (types.ts 102 KB, runner.ts 67 KB, builtin/index.ts, loader.ts 34 KB)
- **what:** 44 in-tree builtin extensions + 4 global defaults register tools, slash commands, renderers, widgets, and hooks through a single public `pi` API instead of touching core.
- **how:** Each is a pure `default function(pi: ExtensionAPI)` factory registered by id in `builtinExtensions[]`; the runner dispatches 30+ events and wires `ctx` (cwd, model, session manager) per-handler rather than via globals.
- **solves:** Feature growth without core churn: the docs state every fork feature that *can* be an extension *is* one, keeping `interactive-mode.ts` from becoming the place where features land.
- **port effort:** medium-high — the API shape ports, but the registration-order coupling comments show how much ordering is load-bearing and must be re-derived per host | **idea only:** False
## senpi.40 Fully rebindable keybinding layer with live help re-render

- **where:** packages/tui/src/keybindings.ts (47 tui.*), packages/coding-agent/src/core/keybindings.ts (49 app.*), packages/coding-agent/src/modes/interactive/help-content.ts
- **what:** 96 keybindings in 5 namespaces (tui.editor.*, tui.input.*, tui.select.*, tui.altScreen.*, app.*), centrally defined, user-overridable from a config file, and rendered live into /help tables.
- **how:** `buildKeybindingTables()` iterates the live KEYBINDINGS map and calls `keyDisplayText(id)` at render time, so a remap changes the help output, the footer hints, and the shortcut overlay in one pass.
- **solves:** Keybinding hints drift from reality in every TUI that hardcodes strings; this makes drift structurally impossible and gives users a supported customization path.
- **port effort:** low — the pattern is small and self-contained; the value is the discipline (no inline key literals anywhere in components) | **idea only:** True
## senpi.41 Extension-replaceable chrome: footer, header, widgets, editor, working indicator

- **where:** packages/coding-agent/src/core/extensions/types.ts (~180-330), implemented in packages/coding-agent/src/modes/interactive/interactive-mode.ts showExtensionCustom / setFooter / setEditorComponent
- **what:** ctx.ui can replace the footer, the header, arbitrary editor widgets, the whole input editor, the working spinner frames, and the hidden-thinking label.
- **how:** `custom<T>(factory, {overlay, overlayOptions, onHandle})` swaps the editor container in place and restores the saved editor text on close; `setFooter` receives a `ReadonlyFooterDataProvider` so extensions get git branch / context usage / token stats without reaching into core.
- **solves:** A host product (or a user) can restyle the entire chrome without a fork, and the data provider pattern means they don't need privileged access.
- **port effort:** low-medium — idea only; the ReadonlyFooterDataProvider indirection is the reusable part | **idea only:** True
## senpi.42 Overlay stack with a 9-point anchor grid and percentage sizing

- **where:** packages/tui/src/tui.ts:421-568 (OverlayAnchor, OverlayOptions, OverlayHandle, OverlayStackEntry)
- **what:** Overlays are positioned by anchor + offset, sized by number or percentage, can self-hide below a terminal size via a `visible(termW, termH)` predicate, and return a handle for focus/blur control.
- **how:** `showOverlay` pushes an entry; `compositeOverlays` splices rendered lines into the frame *before* the differential compare, so overlays are diffed like everything else; `nonCapturing` overlays render without stealing keyboard focus.
- **solves:** Modal surfaces in a differential renderer usually mean either a full repaint or a second rendering path. Compositing pre-diff keeps one path.
- **port effort:** medium — the pre-diff composite point is the load-bearing idea; the anchor algebra is easy to re-derive | **idea only:** True
## senpi.43 Three-tier render scheduler (forced / input-expedited / fps-throttled)

- **where:** packages/tui/src/tui.ts:1490-1580 (requestRender, setMaxRenderFps, commitExpeditedRender, scheduleRender)
- **what:** requestRender has three distinct paths: force=true repaints from a clean slate, source="input" bypasses the fps cap entirely for keystroke latency, and everything else is throttled by a configurable 30-120fps cap.
- **how:** Non-input renders coalesce via `renderRequested` + setTimeout; input renders go through `process.nextTick(commitExpeditedRender)` which clears any pending timer so a keystroke never waits behind a queued frame.
- **solves:** The classic TUI tradeoff: a global fps cap makes typing feel laggy, no cap makes streaming burn CPU. Splitting the input path out of the cap solves both.
- **port effort:** low — small, self-contained, high value for any streaming TUI | **idea only:** True
## senpi.44 Session tree with folding, filtering, label editing, and branch navigation

- **where:** packages/coding-agent/src/modes/interactive/components/tree-selector.ts, keybindings app.tree.* (11 bindings incl. app.tree.filter.cycleForward/Backward)
- **what:** A 1,458-LOC tree selector: flatten, gutters, active-path highlight, folding, 6 filter modes, horizontal viewport, copy/text extraction, and inline label editing.
- **how:** TreeList + TreeSelectorComponent; the /tree command opens it, and `treeFilterMode` is a persisted setting that picks the default filter.
- **solves:** Forking/rewinding a long agent conversation without losing the branch structure — the session history is a tree, not a list.
- **port effort:** medium — idea only; the fold/filter keybinding taxonomy (app.tree.filter.default/noTools/userOnly/labeledOnly/all) is the reusable idea | **idea only:** True
