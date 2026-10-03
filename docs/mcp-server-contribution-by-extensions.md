# MCP server contribution by extensions — design decision

Status: **designed, not built.** Everything below was measured against `0e3b27416b`. The build
has no owner and no milestone; see [§6](#6-what-this-document-deliberately-does-not-decide).

## The premise, with its citations corrected first

An installed package can already contribute an MCP server **declaratively**. Three discovery
modules register an `MCPServer` provider:

| Module | Registers |
| --- | --- |
| `discovery/omp-plugins.ts` | `registerProvider<MCPServer>(mcpCapability.id, …)` |
| `discovery/agent-plugins.ts` | `registerProvider<MCPServer>(mcpCapability.id, …)` |
| `discovery/claude-plugins.ts` | `registerProvider<MCPServer>(mcpCapability.id, …)` |

The plan and the bead both cite `:423`, `:335` and `:737`. **All three are wrong**, and the third
one fails in a way worth stating because it is the kind of citation that survives a spot-check:
`:737` is a real `registerProvider` call, it has exactly the right shape, and it registers a
**different capability** — `registerProvider<SlashCommand>(slashCommandCapability.id, …)`. A
reviewer following that anchor sees "yes, providers are registered here" and believes it. The
other two merely point a few lines off and are caught immediately. Because one of the three
would mislead rather than misalign, all three are treated here as unverified until re-read.

The gap is the other direction. Nothing contributes an MCP server **imperatively at runtime**:
`grep -rn 'registerMcpServer|registerMCPServer|addMcpServer' packages/coding-agent/src` returns
nothing, and `ExtensionAPI` never names the capability registry. So the honest statement is
"declarative contribution ships, imperative contribution does not" — **not** "extensions cannot
contribute MCP servers at all."

**A name collision to know before reading further.** `registerProvider` means two unrelated
things. `ExtensionAPI.registerProvider(name, config)` — the two-argument form — registers an **LLM
provider**: `config: ProviderConfig`, i.e. `baseUrl` / `apiKey` / `api` / `streamSimple`. The
capability registry's `registerProvider<T>(capabilityId, provider, sourceId?)` is what the three
modules above call; the four-argument `registerProvider(name, config, sourceId)` in
`extensions/types.ts` is the same registry seen from its other side. Anyone who greps
`registerProvider`, sees it on the extension API, and concludes the seam already exists will be
wrong. This collision is already recorded in `docs/extension-writing-surfaces.md`; it is repeated
here because it is the single easiest way to misread this document.

*This document cites symbols rather than line numbers throughout, on purpose.* A line number is the
cheapest citation to write and the fastest to rot: three of the anchors this file replaced had
already drifted, and one of them pointed at a real `registerProvider` call for a **different
capability**, which survives a spot-check because it looks right.

The direction this design may take is settled and is not reopened below. `M2-OQ2 = YES`,
owner-ratified 2026-10-01, §8 of `docs/extension-trust-model.md`: the capability registry is **in
scope for decomposition**. That ruling settles ownership; it does not by itself create the seam.

## 1. The two architectures

**Option A — contribute into the capability registry.** `ExtensionAPI` gains a
`registerMcpServer(config)` that mints an `MCPServer` provider alongside the three discovery
modules, so an extension's server is discovered, listed, toggled and labelled by exactly the
machinery that already handles the declarative three. Provenance is the hard part, and it is
already solved: the registry's `registerProvider` takes a `sourceId`, and `connectServers`
already takes a `Record<string, SourceMeta>` per server.

**Option B — a separate extension MCP path.** The extension declares servers into an
extension-owned collection, and the host reconciles that collection into the manager alongside
the config-derived one. This keeps extension servers visibly separate from user-configured ones
and needs nothing from the capability registry — which is its appeal if `M2-OQ2` had gone the
other way.

The difference is not "which file holds the list". It is **whether an extension-contributed
server is the same kind of thing as a configured one**, because that decides whether the user's
existing `/mcp` verbs, connection status, and approval surface apply to it without being taught a
second set of rules.

## 2. Recommendation

**Option A**, because it is the one the programme's own test is written against. An
out-of-repo extension must register its server *without editing core*, and the seam that already
exists for three declarative providers is a seam, not a convention. Option B builds a parallel
stack to reach the same place, and the cost is not the code — it is that every user-facing MCP
verb would then have to learn which stack a server came from.

The recommendation rests on the capability registry being in scope, which is settled
(`M2-OQ2 = YES`). It does **not** rest on a trust posture; see §3.

## 3. Trust tier — an open question, deliberately not answered here

**No trust tier has been answered. Nobody has answered it.** This section is the gap, not a
decision, and it is written as numbered options precisely so nobody can mistake it for one.

The options, none chosen:

1. **Treat an extension-contributed MCP server as `write` by default**, matching a live
   `MCPTool` today. Simplest, and it inherits the existing tier rather than inventing one.
2. **Treat it as `exec` by default**, matching what an extension-registered *tool* already
   defaults to. The more conservative reading, but it contradicts option 1 by making the MCP
   path stricter than the tool path, which would make the MCP path the one nobody picks.
3. **Tie the tier to the trust posture** recorded by `m2-wi-0-030`. The most defensible, and
   the one that cannot be written down until that posture is stated in terms that apply to a
   *network-speaking server* rather than to a module that runs in-process.

Why it cannot be settled here: the credential question and the trust question are the same
question. An MCP server is an outbound network connection whose credential is the user's. Option
3 needs a stance on project-local inputs that that document states but
has never been applied to this surface.

## 4. Approval parity, written against the tiers that actually exist

The tiers are ranked `read` (0) < `write` (1) < `exec` (2) — the `TIER_RANK` record in
`tools/approval.ts`, folded by `strictestApproval`.

The MCP bridge hardcodes its tier as a class field, once per tool class:

| Class | Field | Tier | Rank |
| --- | --- | --- | --- |
| `MCPTool` (live) | `MCPTool.approval` | `write` | 1 |
| `WithdrawnMCPTool` | `WithdrawnMCPTool.approval` | `exec` | 2 |
| `DeferredMCPTool` | `DeferredMCPTool.approval` | `write` | 1 |

An extension-registered tool defaults to `exec` — `ToolDefinition.approval`, documented as
"Defaults to `"exec"` when omitted".

**This inverts the promise the plan is built on, and it inverts it silently.** The plan asks for
*approval parity* between extension-contributed MCP servers and extension-registered tools. The
tree does not have a gap there; it has the relationship **backwards**. A *live* MCP tool sits at
`write` (1). The same extension registering a tool directly sits at `exec` (2) — one rank
stricter. So the MCP path is the *weaker-gated* path, and choosing Option A for its tidier
discovery story means recommending, in effect, **the less safe of two options an author already
has**, on the strength of an argument about where the code lives.

Nothing in the plan draws this out, because the plan states the two tiers and stops. It is the
single fact a reviewer needs before accepting the recommendation in §2, and it is why §2 is not a
recommendation without this caveat attached.

For reference when auditing the plan: it names `MCPTool.approval`'s line correctly but attributes
the second `write` to the wrong class, and points the extension default at a `clearTimer` docblock
rather than `ToolDefinition.approval`. All three of those are the same defect this document is
written to avoid, which is why it cites no line numbers at all.

**Correction to the plan — position only.** The plan says the `'Origin: MCP server tool'` line is
unreachable by execution. That conclusion is **correct**; only its line reference is off. The
guard inside `formatApprovalPrompt` reads:

```ts
if (tool.name.startsWith("mcp__") && tool.approval === undefined) {
```

and every MCP tool class declares `approval` as a definite field — `MCPTool.approval` is `write`,
`WithdrawnMCPTool.approval` is `exec`, `DeferredMCPTool.approval` is `write`. So `tool.approval` is
never `undefined`, the guard never passes, and the line never runs.

That is worth stating precisely because it is a coupling, not an accident: the origin banner is
unreachable **because** the tier is hardcoded. Anyone who ever makes an MCP tool's tier
configurable must revisit this guard at the same time, or the banner silently starts rendering.

## 5. Lifecycle — most of it already exists

No new lifecycle is needed, and this is the strongest reason the design is cheap.

`MCPManager.connectServers(configs, sources, onStatus?, startupTimeoutMs?)`
`MCPManager.connectServers` already takes a per-server `SourceMeta` map. Provenance is already a
first-class parameter, not something a new path would have to bolt on.

Single-server connect, disconnect and status are already driven from an extensions-scoped module:
`modes/components/extensions/mcp-runtime.ts` defines an `MCPToggleManager` with
`connectServers` / `disconnectServer` / `getConnectionStatus`, and `applyMcpToggleRuntime` applies
one server's toggle. That module is the `/extensions` panel toggling servers that **already exist in config** —
it is not a contribution path, and it does not pre-build Option A. What it establishes is that
the manager seam is reusable one server at a time from outside the session, which is the part
Option A would have needed to invent.

**One lifecycle consequence worth naming, because it is a consequence and not a detail.** When a
server is refreshed and stops offering a tool it used to offer, the manager leaves a tombstone so
a call already in flight gets an answer instead of reading as a hallucinated tool name
(the block that maps each withdrawn tool to `new WithdrawnMCPTool(t, name)`). That tombstone is a `WithdrawnMCPTool`, and per §4 it sits at tier
`exec` — **rank 2, the strictest** — while the live `MCPTool` it replaced sat at `write`, rank 1.

So withdrawing a tool from an extension-contributed server would *raise* its approval tier rather
than lower it. The tombstone is deliberately carried across refreshes as itself
(the `isWithdrawnMCPTool` type guard in `mcp/tool-bridge.ts`) precisely so it does not churn, which means this is a steady
state and not a one-frame artifact. Any design that lets an extension contribute a server has to
say what happens to its tier when the server changes its tool list underneath a running session.
This was verified against live code: `manager.ts` calls `new WithdrawnMCPTool(t, name)` on that
path, so it is not dead.

## 6. What this document deliberately does not decide

- **The trust tier.** §3 is open. No option is recommended.
- **The credential story.** Who supplies the credential an extension's MCP server uses, and
  whether it may read the user's stored credentials, is unanswered and is not implied by §3.
- **The build.** This merges under M2 as a design. **The build has no owner and no milestone.**
  §8.2 of the plan places MCP contribution outside M2 with nobody owning it. An owner and a date
  must be assigned before M2 closes. Scheduling the build after `m2-wi-9-047` is the sensible
  order: tearing down an extension that owns a live connection is an inventory-management
  problem WI-9 has already solved, not a new one.
- **Phase numbering.** This plan has no phases and this document does not introduce any.
- **Whether the approval inversion in §4 is fixed here or later.** It is a real finding; whether
  it belongs to this build or to the MCP path's own work is not decided by this document.

## Provenance of this document

Written by `IcyMaple` (agent) from measured code, under assignment from `a4`.

Decisions in §2 rest on an owner ruling that exists in the repository
(`M2-OQ2 = YES`, §8 of `docs/extension-trust-model.md`, ratified 2026-10-01).

**There is no maintainer sign-off on §3.** The owner delegated the decision to `a4`, and `a4`
is not a human maintainer; the owner was not available to answer. So §3 is left open rather than
filled, and this document carries **no approval**. AC(d) of `m2-wi-12-047` asks for a named human
answer with a timestamp — **that criterion is not met, and this document does not claim it is.**
No signature here should be read as review.