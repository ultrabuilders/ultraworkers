# M3 Wave 0 — Stack: what "port 100% of Claude Code's UI as an omp plugin" actually costs

**Date:** 2026-09-28
**Question owner (verbatim):** *"chắc chắn port 100% UI Claude Code như là 1 plugin vào omp"* — "make sure to port 100% of Claude Code's UI as a plugin into omp."
**Sources measured:** CCB = `/Users/tranquangdang21/Projects/claude-code-ref`; omp = `/Users/tranquangdang21/Projects/ultraworkers`.

**Legal boundary observed throughout.** CCB carries no root LICENSE and no root `license` field; the "educational and research purposes only / All rights to Claude Code belong to Anthropic" line is `README_EN.md:211`. Everything below is derived measurement — file counts, LOC, import graphs, API surfaces, counts of identifier occurrences. No CCB source line is quoted or reproduced. The clean-room boundary is not reopened here.

---

## 0. Verdict up front

| Approach | Feasible at project scale? | One-line reason |
|---|---|---|
| **(a) Run CCB's Ink app as a subprocess** | **No** | It is a *second agent*, not a plugin — 558,328 LOC of its own `src/`, zero shared code with omp. |
| **(b) Run Ink inside omp** | **No** | omp's TUI is imperative (`render(width): readonly string[]`, no VDOM) and already owns the tty with 5 `process.stdin.on` sites. A second renderer on the same terminal corrupts output by construction. |
| **(c) Rewrite CCB's components on omp's TUI** | **Yes — and it is the only one** | 174 files / 12,519 LOC is the genuinely-presentational surface. The expensive part is layout, not widgets: 229/418 files depend on yoga flexbox that omp's `Box` does not have. |

**"100% of the UI" is not a port target.** 152 of 418 component files (36% of files, **65% of LOC**) are dialog/business-logic that import CCB's own `services`/`hooks`/`state` — they were never UI and cannot be "ported" without also porting CCB's agent. The honest target is **the 174-file presentational core, of which 108 (62%) need no layout engine at all.**

---

## 1. Corrected baseline (verify, don't trust)

Every pre-measured number was re-run with `git ls-files`. Three were wrong.

| Claim | Measured | Verdict |
|---|---|---|
| CCB = 2,551 `.ts` + 701 `.tsx` | `2551` / `701` | ✅ exact |
| CCB = 137 MB | `137M` | ✅ exact |
| UI is Ink (React) | `@anthropic/ink` = `workspace:*`, pkg `@anthropic/ink@1.0.0` at `packages/@ant/ink/` | ✅ confirmed |
| `react@19.2.5` | `^19.2.5` | ✅ |
| `react-reconciler@0.33.0` | `^0.33.0` | ✅ |
| `react-compiler-runtime` | `^1.0.0` | ✅ |
| `strip-ansi` / `wrap-ansi` / `@alcalzone/ansi-tokenize` | all present in devDeps | ✅ |
| `grep -iE "cellbuffer\|cell-buffer\|CellBuffer"` over whole CCB tree | **0 files** | ✅ confirmed — CCB has no cell-buffer abstraction |
| `src/components` = 418 files | `418` (358 `.tsx` + 60 `.ts`) | ✅ exact |
| `src/utils` = 773 | **781** | ❌ **off by +8** |
| `src/commands` = 392 | **400** | ❌ **off by +8** |
| `packages/builtin-tools` = 370 | **374** | ❌ **off by +4** |
| omp has no `registerStatusLineSegment` | **0 hits** in `packages/**` | ✅ confirmed |
| omp = "17 package" | **16** package dirs | ❌ **off by −1** |

**Legal claim, refined (more precise than the brief, and it does not change the constraint):**

- No root `LICENSE` file — confirmed (`ls LICENSE*` → no match). The only LICENSE in the tree is `packages/workflow-engine/LICENSE` (MIT).
- Root `package.json` has no `license` field — confirmed (`grep '"license"'` exit 1).
- **But two sub-packages *do* declare `"license": "MIT"`**: `packages/acp-link/package.json` and `packages/workflow-engine/package.json`.
- The UI-bearing packages — `packages/@ant/ink/package.json`, `packages/builtin-tools/package.json` — declare **no** license. The MIT declarations are on infrastructure packages (ACP link, workflow engine), not on the Ink fork or the UI.

So the accurate statement is: *the root repo and its UI/runtime packages are unlicensed; two unrelated infrastructure sub-packages are MIT.* The read-don't-copy boundary still holds and is unaffected.

---

## 2. Approach (a) — run CCB's Ink app as a subprocess

### What it would cost

CCB is not a UI library with a session-state adapter. It is a complete second agent:

| Area | LOC (`cat $(git ls-files ...) \| wc -l`) |
|---|---|
| `src/utils/` | 225,466 |
| `src/services/` | 87,974 |
| `src/components/` | 70,645 |
| `src/commands/` | 55,338 |
| `src/hooks/` | 22,025 |
| `src/bridge/` | 13,470 |
| `src/state/` | 1,286 |
| **`src/` total** | **558,328** |
| Ink runtime itself (`packages/@ant/ink/src/`) | 27,815 |
| Ink docs | 3,490 |

Its app root, `src/screens/REPL.tsx`, is **6,684 lines** and is wired to CCB's own state machine, not to anything omp can supply:

```
src/screens/REPL.tsx Props = { commands, initialTools, mcpClients, dynamicMcpConfig,
  systemPrompt, onBeforeQuery, onTurnComplete, initialMessages, initialFileHistorySnapshots, … }
```

Session identity is CCB-internal — `REPL.tsx` calls `setConversationId(sessionId)`, `getStoredSessionCosts(sessionId)`, `switchSession(...)` against its own store (`src/state/`, 986 LOC). There is no port through which omp's session could enter.

Root `package.json` declares only **4 runtime dependencies** (`@agentclientprotocol/sdk`, `@claude-code-best/mcp-chrome-bridge`, `highlight.js`, `ws`) and **135 devDependencies** — because CCB is a Bun-bundled app, not a library. It also ships no `dist/` in-tree.

### What it would get

A working second CLI. Nothing else. The subprocess owns its own terminal: ink sets raw mode itself (`packages/@ant/ink/src/components/App.tsx:317 stdin.setRawMode(true)`, cleared at `:375`) and drives the alternate screen (`packages/@ant/ink/src/components/AlternateScreen.tsx`, `core/ink.tsx`, `core/termio/dec.ts`). CCB's own `src/` additionally writes `process.stdout` in **52 files** and reads `process.stdin` in **20 files**, touching the alternate screen in **11**.

### Verdict

**Not a plugin.** A plugin is a thing omp loads that runs *inside* omp's session, event bus, and terminal. A subprocess is a second agent with a second session, a second model connection, and a second raw-mode claim on the tty. It satisfies none of the "as a plugin" clause, and it delivers 0% of the requested capability while adding a 558k-LOC binary.

---

## 3. Approach (b) — run Ink inside omp

### What is already measured against it

**omp has no React and no yoga in its TUI.**

- `grep -rnE "from ['\"]react['\"]" packages/tui/src` → **0 hits**.
- `grep -rni "yoga" packages` → **0 files**.
- `packages/tui/package.json` dependencies are entirely `@oh-my-pi/*` workspace packages — no react, no react-reconciler, no yoga.
- The only React in the omp monorepo is in `packages/metaharness/src/web/`, `packages/stats/src/client/`, and one test — none of it terminal.
- `node_modules/react` exists (pulled by solid/stats), but `node_modules/react-reconciler` and `node_modules/yoga-layout` are **absent**.

**omp's TUI is imperative, not declarative.** `packages/tui/src/tui.ts:224`:

```ts
export interface Component {
	render(width: number): readonly string[];
	handleInput?(data: string): void;
	invalidate?(): void;
	dispose?(): void;
	…
}
```

No VDOM, no reconciler, no retained tree. The header comment describes the model exactly: a `TerminalFrameProvider` returning a `HistoryBatch` plus "the complete mutable viewport," where "the writer anchors the viewport directly below whatever history remains visible, **diffs viewport-only frames**, and never infers finality from a row's position."

**Ink is the opposite.** It runs yoga (flexbox) over a `react-reconciler` host, and its `Box` defaults are literally flexbox: `flexWrap = 'nowrap'`, `flexDirection = 'row'`, `flexGrow = 0`, `flexShrink = 1`, with `marginX/Y`, `paddingX/Y`, `gap`, `columnGap`, `rowGap`, `borderStyle`, `minWidth`/`maxWidth` all warned-if-not-integer. Its core render path is `log-update` relative-move diffing (`core/ink.tsx`, `core/log-update.js`).

### The raw-mode conflict is not hypothetical

`packages/tui/src/terminal.ts` calls `process.stdin.setRawMode(true)` at line 990 and registers handlers at 999, 1000, 1001, 1714, 1879 — **5 distinct `process.stdin.on` sites**, plus `setEncoding("utf8")` and `.resume()`. Ink's `App.tsx` independently calls `stdin.setRawMode(true)` on mount and `setRawMode(false)` on unmount, and manages the alternate screen.

Two renderers each believing they own the cursor, the scroll region, raw mode, the alternate screen, and synchronized-output brackets on one tty do not interleave — they produce corrupted frames. omp's differential writer is built on the invariant that it alone writes; ink's is built on the invariant that it alone writes. There is no composition seam between them, and building one would be a third terminal stack.

### Bundle cost

Even ignoring correctness, embedding Ink means: React 19 runtime + `react-reconciler` + **yoga** + 27,815 LOC of a *fork* (`@anthropic/ink@1.0.0`) into a codebase that currently has zero of them, alongside its own 479-file / differential-rendering TUI. Two UI stacks, one binary, permanent double maintenance.

### Verdict

**Not viable.** The blocker is not bundle size — it is that omp's render contract is a function returning string rows, and ink's is a retained React tree. They are not the same kind of thing, and both claim the terminal exclusively.

---

## 4. Approach (c) — rewrite CCB's components on omp's TUI

### 4.1 How much of `src/components` is actually UI?

Every one of the 418 files was classified programmatically: a file is **logic** if it imports CCB's own `services`/`hooks`/`state`/`store`/`api`; **stateful** if it uses a React hook but no such import; **presentational** otherwise.

| Bucket | Files | % of files | LOC | % of LOC |
|---|---:|---:|---:|---:|
| **presentational** (pure render) | **174** | 41.6% | **12,519** | **17.7%** |
| stateful (hooks, no service import) | 92 | 22.0% | 12,190 | 17.2% |
| logic (dialog/business/wiring) | 152 | 36.4% | 45,936 | 65.0% |
| **total** | **418** | 100% | **70,645** | 100% |

**The 152 logic files are not a porting problem — they are CCB's dialogs bound to CCB's agent, MCP client, and settings.** They are correctly out of scope for "port the UI."

By category (LOC, presentational share in parentheses):

| Category | Files | LOC | Presentational |
|---|---:|---:|---|
| `<root>` | 117 | 22,439 | 38 (2,712) |
| `permissions/` | 53 | 9,746 | 15 (1,229) |
| `PromptInput/` | 21 | 5,429 | 7 (356) |
| `messages/` | 45 | 4,464 | 32 (1,923) |
| `mcp/` | 14 | 3,674 | 2 (44) |
| `agents/` | 29 | 3,508 | 16 (1,317) |
| `CustomSelect/` | 10 | 2,994 | 4 (301) |
| `tasks/` | 14 | 2,944 | 4 (308) |
| `LogoV2/` | 18 | 1,747 | 7 (507) |
| `EffortPanel/` | 7 | 1,615 | 5 (1,180) |
| `Spinner/` | 13 | 1,203 | 7 (243) |

Two observations worth carrying into M3 planning:

- **`messages/` is 71% presentational** (32/45 files) — this is the transcript, and it is the single most portable category in the tree.
- **`mcp/` is 7% presentational** (2/14) and **`permissions/` is 28%** (15/53) — these are dialogs, not UI. Confirms they are out of scope.

### 4.2 The real cost: layout, not widgets

Cross-tabulating presentation against layout dependency:

| | uses yoga flex props | no flex props | total |
|---|---:|---:|---:|
| **presentational** | 66 files / 7,709 LOC | **108 files / ~4,600 LOC** | 174 |
| stateful | 54 | 38 | 92 |
| logic | 112 | 40 | 152 |
| **total** | **229 files / 52,770 LOC** | 189 | 418 |

Identifier occurrence counts in `src/components/`: `flexDirection` **774**, `gap` **226**, `flexShrink` **52**, `minWidth` **41**, `paddingX` **82**, `borderStyle` **40**, `paddingY` **36**, `justifyContent` **34**, `flexGrow` **25**, `marginY` **22**, `flexWrap` **13**, `alignItems` **15**. **266 files render a `<Box>` at all.**

omp's counterpart, `packages/tui/src/components/box.ts` (7.1 KB), has **no** `flexDirection`, `flexGrow`, `flexShrink`, `flexWrap`, `justifyContent`, `alignItems`, `alignSelf`, `gap`, or any sizing prop. Its constructor is `constructor(paddingX = 1, paddingY = 1, bgFn?, border?)` — padding, background, border, and nothing else. Its width handling is a single `render(width)` that subtracts `border*2 + paddingX*2`.

**This is the load-bearing finding of the wave.** CCB's Ink components are declarative trees that a flexbox engine resolves; omp's are imperative functions returning pre-composed string rows. There is no mechanical translation. Every one of the 229 flex-dependent files must be re-expressed as string-row composition against a fixed width — which means **the 774 `flexDirection` sites are the true porting cost**, not the 174 component count.

Cheap tier: **108 presentational files with no flex** (~4,600 LOC) map onto existing omp primitives with no new layout machinery.
Expensive tier: **66 presentational files that do use flex** (7,709 LOC).

### 4.3 Does omp's TUI have the primitives?

`packages/tui/index.ts` exports 31 component modules. Presentational equivalents already exist:

| Need | omp TUI primitive |
|---|---|
| bordered container | `components/box` (padding + `BoxBorder`) |
| text | `components/text`, `components/truncated-text` |
| list / select | `components/select-list` (24 KB), `menu-selection` |
| settings list | `components/settings-list` (32 KB) |
| tree | `components/tree-view` |
| table | `components/table` |
| tabs | `components/tab-bar` |
| form / wizard | `components/form` (16 KB), `wizard-step` |
| input / editor | `components/input`, `components/editor` (165 KB) |
| scroll | `components/scroll-view`, `scroll-viewport` |
| markdown / diff | `components/markdown` (150 KB), `render/code-cell`, `tool-card` |
| spinner / loader / progress | `loader`, `cancellable-loader`, `progress-bar` |
| image | `components/image` (35 KB) + `kitty-graphics` |
| text wrapping | `Bun.wrapAnsi` via `render-utils.ts` (44 KB) |

**Verdict: the widget layer is covered. The layout layer is the gap — and the layout layer is exactly what 55% of CCB's files depend on.**

---

## 5. Recommendation

1. **Close (a) and (b).** (a) is a second agent, not a plugin — 558,328 LOC, zero shared code, its own session store and raw-mode claim. (b) collides with omp's imperative `render(width): readonly string[]` contract and its 5-site exclusive stdin ownership; ink is a retained React tree over yoga. Neither survives contact with omp's terminal.

2. **Reframe the target.** "100% of the UI" → **the 174-file / 12,519-LOC presentational core**, of which **108 files / ~4,600 LOC are the first tier** (no layout dependency). State the reframe explicitly in the M3 charter so the goal is measurable.

3. **Sequence by presentation ratio, not by LOC.** `messages/` (32/45 presentational) → `agents/` (16/29) → `EffortPanel/`, `sandbox/`, `design-system/`, `Spinner/` → `LogoV2/`. Defer `mcp/` (2/14) and `permissions/` (15/53) — they are dialogs over CCB's agent and belong to a different milestone, if any.

4. **Decide the layout question before writing any component.** Either (i) build a flexbox-equivalent layout primitive in `packages/tui` so 229 files have a translation target, or (ii) accept hand-composed string rows per component. Option (i) amortizes across the whole 229-file set; option (ii) repeats. This is the single highest-leverage decision in M3 and nothing else should be specified until it is made.

5. **Do not import anything from CCB.** Read to learn the interaction model; re-express in omp's vocabulary against the primitives in §4.3. The 65%-of-LOC logic bucket stays untouched — it is not UI.

---

## 6. Unmeasured / open

- **Effort estimates.** Every number here is structural (files, LOC, import graphs, API surface). No calendar or person-day figure is claimed; deriving one needs the §5.4 layout decision first.
- **Does omp have a plugin API that can host a TUI component tree?** `packages/coding-agent/src/extensibility/` exists (71 files, with `plugins/`, `extensions/`, `custom-commands/`, `custom-tools/`, `hooks/`), but no measurement was made of whether it can contribute a `Component` to the live render tree. If it can, the 108-file no-flex tier becomes genuinely pluggable; if not, these land as first-party `packages/tui` components. **This is the next thing to measure.**
- **Content overlap between CCB's 174 presentational components and omp's 31 exported primitives.** §4.3 lists plausible mappings but did not diff them component-by-component; the true "already have it" count is unknown.
- **`src/utils` (225,466 LOC) contains formatting/theme helpers that CCB components depend on.** Not classified in this wave. Some fraction of the presentational 12,519 LOC is not self-contained.
- **M2 status-line seam.** The brief asserts `registerStatusLineSegment` is absent from omp; confirmed. `packages/tui/src/status-line/` exists and is substantial (`component.ts` 120 KB, `segments.ts` 35 KB), so the seam is real but the registration API is not yet public. Wave 5 (M3-C2 + M3-D2) depends on that API existing.
