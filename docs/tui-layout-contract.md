# TUI layout contract — anatomy, the two-column rule, and what gets dropped first

Companion to [`tui.md`](./tui.md) (the `Component` contract and rendering
constraints) and [`tui-core-renderer.md`](./tui-core-renderer.md) (frame
ownership and viewport history).

`tui.md` tells you how to write one component. This tells you what to reach for
when you are **assembling** several, and — the part that is easy to get wrong —
what happens to your layout when the terminal is narrower than you planned for.

All line references were measured on the current tree. If one of them is wrong,
the file it names is the thing to fix; this document follows the code.

---

## 1. Framework anatomy

ultraworkers composes **string rows**. There is no flexbox, no retained scene graph, and
no widget tree you mutate — a component is a pure-ish function from a width to an
array of physical rows, and layout is arithmetic on those widths.

### The four layout primitives

All in `packages/tui/src/components/layout/`:

| Module          | What it gives you                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `geometry.ts`   | The shared vocabulary. `LayoutRect`, `LayoutInsets`, `LayoutAlignment`, and `layoutSize()` — the size normalizer every primitive funnels external numbers through. |
| `row.ts`        | `Row` — horizontal composition with per-child width rules. Implements `MouseRoutable`.                                                                             |
| `stack.ts`      | `Stack` — vertical composition. Implements `MouseRoutable`.                                                                                                        |
| `split-pane.ts` | `SplitPane` — the two-column primitive, and the only one that changes _shape_ when width runs out. See §2.                                                         |

`LayoutContent` is `Component | LayoutRenderer`, where a `LayoutRenderer` is
just `(width, height) => readonly string[]`. You can drop a bare function
anywhere a component is expected, which is usually cheaper than writing a class.

`layoutSize(value, fallback = 0)` is worth internalizing: it floors, rejects
non-finite input, and clamps negatives to `0`. Every `min`/`max`/`splitAt` on
every primitive goes through it, so **`undefined` becomes `0`, not a
"no constraint" sentinel.** Where a primitive needs to distinguish "unset" from
"zero", it uses `optionalLayoutSize()` instead, which preserves `undefined`. This
one distinction is the source of the trap in §2.2.

### Chrome and shared components

`packages/tui/src/chrome/` holds the frame decorations; `packages/tui/src/components/`
holds the reusable widgets. The ones an extension is most likely to want:

- **`DynamicBorder`** (`chrome/dynamic-border.ts`) — a border whose color is a
  function, `(str: string) => string`, defaulting to the theme's `border` role.
  Because it takes a styling _function_ rather than a color, you can vary the
  border by state without swapping components.
- **`TabBar`** (`components/tab-bar.ts`) — takes a `label`, a `Tab[]`, and a
  `TabBarTheme`. A `Tab` is `{ id, label, short?, muted? }`. Two of those fields
  earn their keep in narrow terminals: `short` is the compact label used when the
  bar must fit one line, and `muted` renders a tab in the muted style _and_ skips
  it during keyboard navigation — so muting is an accessibility affordance, not
  just a visual one. `TabBarTheme` styles `label`, `activeTab`, `inactiveTab`,
  and `hint`, with `mutedTab` and `hoverTab` optional and both falling back to
  `inactiveTab`.
- **`Spacer`** (`components/spacer.ts`) — vertical whitespace. Also exports
  `spaceForRows(rows)`, which maps a blank-row count to a terminal spacing step
  (`none` / `sm` / `md` / `lg`) so spacing stays consistent with the rest of the
  UI instead of being an ad-hoc newline count.
- **`format.ts`** (`chrome/format.ts`) — `formatProviderName`,
  `formatCoarseDuration`, `describeAsciiBar`, `renderAsciiBar`. Presentation
  helpers for the values extensions most often need to show. Reuse these rather
  than re-deriving a duration or percentage format.

### A width cap worth knowing about

`SettingsList` clamps its label column to **30 cells**:
`Math.min(30, …)` at `components/settings-list.ts:836` and `:955`. Long setting
labels are truncated to that budget so the value column stays aligned. If you
are building a settings-style list, matching that cap is what makes your rows
line up with the built-in ones.

---

## 2. The two-column rule

### 2.1 What collapses, and when

`SplitPane` is the only primitive that changes _shape_ rather than merely
re-flowing. It resolves to one of two modes (`SplitPaneGeometry.mode`):

- `"split"` — both panes, separated by a divider.
- `"narrow"` — exactly one pane, filling the available width.

The decision is a single predicate (`split-pane.ts:254-255`):

```ts
const canSplit =
	this.#narrowPane === undefined || (width >= this.#splitAt && splitAvailable >= leftMinimum + this.#rightMinWidth);
```

Read it as: **collapse is opt-in twice over.** If you never set `narrowPane`,
`SplitPane` always splits. If you do set it, you must _also_ set a threshold —
`splitAt` (an absolute width), `rightMinWidth` (the floor the right pane needs),
or `leftSize.min` — for the predicate to ever evaluate false.

`splitAvailable` is what remains after the frame chrome:
`width - prefixWidth - dividerWidth - suffixWidth`, floored at `0`. So a heavy
`prefix` or `suffix` decoration eats into the split budget before either pane
sees a cell. When `canSplit` is false, the surviving pane gets
`width - prefixWidth - suffixWidth` — note the divider is dropped too, so the
narrow pane is one cell wider than its fair share.

### 2.2 The trap: `narrowPane` on its own never collapses

`layoutSize(undefined)` returns `0` (§1). So with only `narrowPane` set and no
thresholds:

- `splitAt` → `0`, so `width >= 0` is true for any real terminal;
- `rightMinWidth` → `0` and `leftMinimum` → `0`, so `splitAvailable >= 0` is true.

`canSplit` is therefore **always true** and the pane never collapses. This looks
like a broken narrow mode; it is a missing threshold. If you want collapse, you
must supply `splitAt`, `rightMinWidth`, or `leftSize.min`.

### 2.3 The clamp table M6 borrowed

M6 row 1 settled on option **(iii)**: keep composing string rows, and borrow only
two cheap things from opencode — its six-constant clamp table and its
"shrink below the content threshold" rule. The table is the entirety of
opencode's `packages/tui/src/ui/layout.ts` (23 lines), reproduced here because
the _shape_ is the point — a clamp is `max(min, min(desired, max))`:

| Constant                          | Value | Role                               |
| --------------------------------- | ----- | ---------------------------------- |
| `SESSION_SIDEBAR_WIDTH`           | `42`  | Default sidebar width.             |
| `SESSION_TABS_COMPACT_WIDTH`      | `5`   | Floor for the compact tab strip.   |
| `SESSION_TABS_COMPACT_BREAKPOINT` | `12`  | Below this width, tabs go compact. |
| `SESSION_SIDEBAR_MAX_WIDTH`       | `72`  | Ceiling for the sidebar.           |
| `SESSION_CONTENT_MIN_WIDTH`       | `44`  | **The content floor.**             |
| `SESSION_CONTENT_PREFERRED_WIDTH` | `64`  | Width at which tabs stop fitting.  |

The rule those constants encode: the **content pane has a floor of 44 cells and
the chrome yields first**. Both clamps bottom out by subtracting
`SESSION_CONTENT_MIN_WIDTH` from the total, so as the terminal narrows the
sidebar and pane shrink toward their minimums and the content pane is the last
thing to lose width. `clampSessionTabsWidth` also has a hard floor of
`SESSION_TABS_COMPACT_WIDTH`, so the tab strip degrades to its compact form
rather than vanishing. `clampSessionPaneWidth` preserves the equal split when
there is not room for both pane minima, instead of letting one pane collapse to
nothing.

The portable idea, independent of those specific numbers: **declare a content
floor, and let every decoration yield to it.** ultraworkers expresses this as
`rightMinWidth` / `leftSize.min` on `SplitPane`; the numbers are per-surface.

---

## 3. What gets dropped first

> **Status: de facto, not approved.** The approved multi-viewport screenshot grid
> that this section is supposed to summarize is **not in this repository**. The
> M6 decision that commissioned this document approved the grid; the grid itself
> was never committed (the planned `.gjc/qa/` fixture directory does not exist),
> and the approval was explicitly conditional on generating at least a second
> fixture before treating it as policy — one fixture cannot distinguish a real
> policy from a single case that happened to be committed. So there is **no
> approved removal order to copy.** What follows is read off the implementation,
> and you should treat it as "this is what the code currently does", not "this is
> the policy you must follow".

The order the code implies, narrowest-last:

1. **Frame decoration first.** `prefix`, `divider`, and `suffix` are subtracted
   before either pane. They are the cheapest thing to lose because they carry no
   content.
2. **The divider, with them.** In narrow mode the divider is not rendered, and
   the surviving pane is one cell wider for it.
3. **The secondary pane, not the primary.** `narrowPane` names the side that
   _survives_; the other side is the one dropped. Choosing which is secondary is
   the extension author's call, and it is the decision that carries the most
   weight — pick the pane whose absence costs the user least.
4. **Label width, then content.** `SettingsList` truncates labels at 30 cells
   rather than dropping rows or wrapping.
5. **The content floor is last.** 44 cells for a session, or whatever
   `rightMinWidth` you declared. This is the line below which the layout is
   genuinely unusable, and it is the reason §2.3 exists.

If you need an approved order rather than this inferred one, the missing input is
the multi-viewport grid — widths 48×10 through 120×36, crossed with ascii/unicode
borders and colour on/off. That grid is what would confirm or correct steps 1-3,
which are the steps with any discretion in them.
