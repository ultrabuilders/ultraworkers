# Tool approval mode

Tool approval has three inputs:

1. **Tool declaration** — every tool may declare an `approval` tier:
   - `read`: reads data or updates UI-only session metadata.
   - `write`: mutates workspace/session state but does not execute arbitrary code.
   - `exec`: executes code, shells out, drives a browser, spawns agents, or performs similarly broad actions.
2. **Tool policy** — object-form declarations may set `policy: allow | deny | prompt`, optionally with `override` and a reason. This is used for argument-dependent safety/pattern rules.
3. **User policy** — `tools.approval.<toolName>: allow | deny | prompt` overrides the active mode, but cannot bypass a tool's own deny/prompt policy or a non-yolo safety override.

Tools without an `approval` declaration, and malformed approval decisions, are treated as `exec`. This is the safe default for unknown custom tools. MCP server tools declare `write`.

## Modes

Configure with `tools.approvalMode`:

| Mode             | Auto-approves           | Prompts for     |
| ---------------- | ----------------------- | --------------- |
| `always-ask`     | `read`                  | `write`, `exec` |
| `write`          | `read`, `write`         | `exec`          |
| `yolo` (default) | `read`, `write`, `exec` | none            |

`--auto-approve` and `--yolo` force `tools.approvalMode: yolo` for the session.

## User overrides

`tools.approval` is honored in every mode:

```yaml
tools:
   approvalMode: write
   approval:
      bash: prompt
      read: allow
      mcp__filesystem_delete: deny
```

For MCP tools, key the policy by the exact final registered name. The ordinary form is
`mcp__<sanitized_server>_<sanitized_tool>`. A redundant `<server>_` prefix is removed from the tool name,
so server `echo` tool `echo_it` is registered as `mcp__echo_it`. Names longer than 64 characters are
capped with a deterministic hash suffix; use the final capped name rather than the uncapped pattern. See
[MCP tool naming](./mcp-server-tool-authoring.md#naming-and-collision-domain).

Resolution per tool call:

1. Evaluate `tool.approval(args)`; omitted/malformed decisions default to tier `exec`.
2. A tool-declared `policy: deny` always denies. A user `deny` is checked next and also always denies.
3. In `yolo`, an explicit tool `allow`/`prompt` policy wins; otherwise the valid user policy wins, or the call is allowed. The `override` flag alone does not force a prompt in `yolo`.
4. In non-yolo modes, an `override: true` decision allows only an accompanying tool `policy: allow`; every other non-denied case prompts.
5. Without an override, an explicit tool `allow`/`prompt` policy wins, then a valid user policy wins.
6. With no explicit policy, the active mode auto-approves or prompts by tier.

Policy strings are trimmed and case-normalized. Invalid user values are ignored.

## Declared effects

A tier says how strong a grant a call needs. It does not say what the call reaches,
and the gap is visible above: `eval` declares `exec` and can still spawn a shell, so
a `bash.patterns` deny does not apply to the same command run through `eval`. Until
now the only remedy was a second hand-written policy per tool.

An **effect** is a tool declaring which resource it reaches. `bash` and `eval` both
declare `subprocess`; `read` declares `fs-read`; `edit` declares `fs-read` and
`fs-write`; `web_search` declares `network`. A user writes one policy per resource:

```yaml
tools:
   approval:
      effects:
         subprocess: deny
         network: prompt
```

Effects combine by the same rule bash already uses: **any matching `deny` wins,
otherwise any matching `prompt` wins**. A tool carrying several effects takes the
strictest policy among them. The floor is applied after a tool-declared `deny` and a
per-tool user `deny`, and before the approval mode — so an effect policy still holds
under `yolo`, which is the mode where a written policy is most likely to be assumed
lost. A tool's own explicit `allow` is not overridden; effects raise the floor a user
policy and the mode can lower, not a tool's statement about its own arguments.

An extension declares its tool's effects by calling `declareToolEffects(name, effects)`
at registration, so a tool published outside this repository is gated by the same rule
as a built-in one without anything here changing.

**This is not a sandbox, and the limitation is the same one that applies to bash
pattern policy: it is not process or filesystem containment.** An effect is a
declaration a user may narrow, not a boundary the runtime enforces. A tool that
declares no effects is unconstrained, and a tool that declares `fs-read` and then
writes a file is not stopped — the declaration is the tool telling the user what it
does, and it is the user's judgement that gives it weight. Enforcing the declaration
would require intercepting the resource, which is a different mechanism with
different costs.

## Safety overrides

A tool can force a prompt with object-form approval:

```ts
approval: { tier: "exec", override: true, reason: "Critical pattern detected" }
```

`bash` uses this for critical destructive patterns such as `rm -rf /`, fork bombs, remote-fetch-then-execute, writes to `/etc/passwd`, and host shutdown commands. It also supports configured `bash.patterns` rules: `deny` is absolute, `prompt` forces a prompt, and `allow` explicitly allows a matching simple command at the `write` tier. Reasons appear in the approval prompt. A critical pattern is denied outright: it is not a prompt you can skip, and `yolo` does not auto-approve it. An explicit tool/user `prompt` or `deny` policy is enforced as before.

`bash.allowCompoundCommands` is off by default. When enabled, it recognizes only flat chains joined by `&&` whose segments consist of literal arguments. Rules remain ordered within each segment: the first matching rule wins for that segment. Explicit restrictions are combined conservatively across the chain: any matching `deny` wins, otherwise any matching `prompt` wins. A restriction matching the complete chain but no individual segment remains a whole-chain veto.

All matching whole-chain restrictions are considered, so a later whole-chain deny overrides an earlier prompt. The opt-in requires a positively identified POSIX-quoting shell through the centralized shell classifier. Cmd, PowerShell, fish, and unknown shells retain legacy approval behavior.

These explicit chain and segment restrictions are resolved before the existing raw and canonical critical-command checks. After those checks, a chain whose segments all explicitly resolve to `allow` receives the `write`-tier allow; if any segment is unmatched, bash instead retains its standalone `exec` approval tier with no explicit policy. The generic resolver then applies `tools.approval.bash`, followed by the active approval mode, exactly as it would for a standalone command. An unmatched segment therefore prompts only when that existing tool-wide policy or mode requires it. Expansions, assignments, other control flow, redirections, globbing, newlines, malformed syntax, and shell-state-changing builtins do not qualify and retain legacy approval behavior.

This pattern policy controls approval for the `bash` tool; it is not process or filesystem containment. An approved command retains the shell's ambient filesystem, network, and subprocess access. The `eval` tool also declares the `exec` tier and can spawn a shell via subprocess, so a `bash.patterns` `deny` rule does not apply to the same command run through `eval` — under `yolo`, that `exec` call resolves to `allow`. To gate the shell `eval` can reach, add a `tools.approval.eval` policy (`prompt` or `deny`) alongside `bash.patterns`.

**The missing containment is a decision, not an unfinished feature.** On 2026-09-29
the owner settled to defer OS-tier containment — `FileSystemSandboxPolicy` and
`NetworkSandboxPolicy`, which need kernel, syscall, or OS-profile support. In the same
decision a proposal to move the default `tools.approvalMode` from `yolo` to `write` was
dropped, so the default stays `yolo`. The paragraph above is therefore correct as
written and nobody is waiting on a patch for it: under `yolo`, no rule in this file
stops a command run through `eval`. `tools.approval.eval` is a policy you write, not a
boundary the runtime enforces, and an unset approval mode fails closed only when no
settings exist at all — a settings file that omits the key gets `yolo`.

If you depend on that default, check it is still what this record claims:

```bash
grep -n 'isApprovalMode(configured) ? configured : "yolo"' packages/coding-agent/src/tools/approval.ts
```

No output means the default moved and this paragraph is stale.

### Path rules

`pathRules.deny` and `pathRules.allow` name the paths a project has declared
off-limits, as globs:

```yaml
pathRules:
   deny:
      - "**/.env"
      - "secrets/**"
```

**Deny wins, and an allow cannot rescue a path a deny also matches.** An allow
only decides paths that no deny rule matched. The expressive-looking
alternative — an explicit allow beating a broad deny — lets `allow: ["**"]`
silently re-open everything the deny list closed, which is the opposite of what
a user writing a deny rule is asking for.

**This is the policy layer, not containment**, and the same sentence that
applies to bash pattern policy applies here: a denied path is refused by the
tools that consult these rules, and a command that reaches the same file by
another route is not stopped by them. The rules default to empty, so nothing is
refused until you write one.

A double-star prefix matches zero or more leading segments, so `**` followed by
a slash and `.env` matches a `.env` at the project root as well as a nested one.
That is worth stating because the alternative reading compiles to a pattern that
requires a separator, and the rule then quietly fails to cover the root file —
no error, no warning, just a rule that does not do what it reads like it does.
Globs are matched against the path with forward slashes on every platform.

### Computer safety

The disabled-by-default Eval [`computer` API](./computer-use.md) chooses its tier per call:

- direct helpers (`computer.windows()`, `win.screenshot()`, `win.ax()`, `el.bounds()`, `computer.clipboard.read()`, …) use `read` when the invoked method is inspection-only and `exec` for input, focus, mutation, and `clipboard.write`; read calls also run under the worker's read-only guard;
- `computer.run(fnOrCode, options)` uses `read` only for `read_only: true` (JavaScript trailing option or Python keyword); `read_only: false`, a missing field, malformed arguments, or any other value uses `exec`.

The approval prompt shows `read-only` when applicable, followed by the resolved JavaScript (truncated to 2,000 characters by the standard formatter). For `computer.run`, `read_only` is a trust declaration enforced by the approval tier, not static analysis of the script.

Separately, provider-originated computer-use calls may carry `pendingSafetyChecks` metadata. Any pending check forces an interactive prompt regardless of yolo or per-tool `allow`. The prompt lists each safety-check code, message, and sanitized/truncated data. Without an interactive UI, the call fails closed with `pending provider safety checks but no interactive UI is available`.

Tool approval does not authorize the underlying real-world action. On-screen text is untrusted and cannot override direct user instructions. Consequential actions still require point-of-risk confirmation of the exact target, scope, and values unless the user's direct message already authorized them.

## Per-tool prompt details

Tools can add approval-prompt body lines with `formatApprovalDetails(args)`. The standard prompt includes:

- `Allow tool: <name>`
- `Origin: MCP server tool` for unannotated `mcp__...` tools
- `Reason: <reason>` when the tool decision supplies one
- tool-specific details such as command, path, code, browser action, or subagent assignment

## Defining approval on tools

Built-in and custom tools share the same shape:

```ts
export type ToolTier = "read" | "write" | "exec";
export type ToolApprovalDecision =
  | ToolTier
  | {
      tier: ToolTier;
      reason?: string;
      override?: boolean;
      policy?: "allow" | "deny" | "prompt";
    };
export type ToolApproval = ToolApprovalDecision | ((args: unknown) => ToolApprovalDecision);

approval?: ToolApproval;
formatApprovalDetails?: (args: unknown) => string | string[] | undefined;
```

Examples:

```ts
approval: "read";

approval: args => (LSP_READONLY_ACTIONS.has(args.action) ? "read" : "write");

approval: args =>
	isCritical(args.command) ? { tier: "exec", override: true, reason: "Critical pattern detected" } : "exec";

approval: args => (isForbidden(args) ? { tier: "exec", policy: "deny", reason: "Blocked by tool policy" } : "write");
```

## ACP sessions

ACP (`ultraworkers acp`) uses the same settings resolver as normal ultraworkers launches. Global `~/.omp/agent/config.yml` applies, project config for the ACP session `cwd` applies, and any `--config <file>` overlays passed to the ACP server process apply to sessions created by that process.

To auto-approve ACP tool calls, set the mode in global or project config:

```yaml
tools:
   approvalMode: yolo
```

Or launch the ACP server with a runtime override or a one-process config overlay:

```bash
ultraworkers acp --yolo
ultraworkers acp --auto-approve
ultraworkers acp --approval-mode yolo
ultraworkers acp --config ./acp-yolo.yml   # file contains tools.approvalMode: yolo
```

Precedence is the normal settings precedence: runtime flags (`--approval-mode`, `--auto-approve`, `--yolo`) override `--config` overlays, which override project config, which overrides global config. ACP does not currently define a `session/new`, `session/load`, or `session/resume` approval-policy field, so ACP clients that need per-session yolo should launch a separate `ultraworkers acp` process with one of the flags above or with a session-specific `--config` overlay.

`tools.approvalMode: yolo` fully applies to ACP when it is explicitly configured or supplied by a runtime flag. It skips ultraworkers' approval prompts and also skips the ACP client permission gate for `bash`, `edit`, `delete`, and `move` unless `tools.approval.<tool>` is `prompt` or `deny`. The schema default is `yolo`, but default-config ACP sessions still keep the client permission gate; set `tools.approvalMode: yolo` explicitly when the client wants unattended execution.

When ACP approval is required, ultraworkers routes it through the ACP client instead of the terminal TUI. Client-gated `bash`, `edit`, `delete`, and `move` calls use ACP `session/request_permission`; generic approval prompts use form elicitation when the client advertises `elicitation.form`. A rejected, cancelled, or unsupported prompt rejects/cancels the tool call; ultraworkers does not silently allow it.

## Subagents

Subagents run headless with `tools.approvalMode: yolo` so ordinary tier-based prompts do not stall them. The parent `task` approval is the authorization boundary. User `tools.approval.<tool>` settings remain authoritative: `deny` blocks the tool, `allow` permits it, and `prompt` cannot be satisfied in a headless subagent and rejects the call.
