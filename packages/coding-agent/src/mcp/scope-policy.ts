/**
 * Scope policy for MCP server configs (GAP-D9, `a4` 2026-10-03).
 *
 * `mcp.enableProjectConfig` is a permission to LOAD a repository's MCP servers.
 * It is not a permission to let that repository run commands on the user's
 * machine. Those were one switch: opting in loaded a project `.mcp.json`, and
 * its `env` / `headers` values then reached `resolveConfigValue`, which hands
 * anything starting with `!` to `/bin/sh -c`.
 *
 * The fix is one function applied wherever a config is read off disk AND the
 * scope of that read is already in hand — which is the only place scope can be
 * known honestly. Applying it downstream instead (looking the level up by server
 * name in the manager) does not work: two of the paths that connect a
 * project-scope server record no source at all, so the lookup yields nothing
 * there and the hole survives exactly where it is reachable.
 *
 * The four call sites are the four readers, not the four symptoms:
 *   mcp/config.ts                 `loadAllMCPConfigs` — the session-start path
 *   mcp-command-controller.ts     `#findConfiguredServer` — /mcp enable, /mcp test
 *   mcp-command-controller.ts     `#handleWizardComplete` — /mcp add
 *   slash-commands/helpers/mcp.ts `getMcpConfiguredServers` — /mcp resources|prompts|test
 *
 * Both carriers are closed together on purpose. `env` and `headers` are
 * resolved by two independent branches of the manager, so fixing one and
 * missing the other only moves the hole.
 */
import type { SourceMeta } from "../capability/types";
import type { MCPServerConfig } from "./types";

/** The scope level a config was read at. `undefined` means "not known". */
export type McpConfigScope = SourceMeta["level"];

/**
 * Force the literal policy on a config that came from a repository the user did
 * not author. Non-project scopes are returned untouched: user config is the
 * user's own machine, and `!command` is a legitimate carrier there.
 *
 * Returns the same object for non-project scopes so callers can apply it
 * unconditionally.
 */
export function applyScopePolicy(config: MCPServerConfig, scope: McpConfigScope | undefined): MCPServerConfig {
	if (scope !== "project") return config;
	// Mirrors the manager's own split exactly — same condition, same order — so
	// this cannot set a flag the resolve step will not read, or skip one it will.
	if (config.type !== "http" && config.type !== "sse") {
		return { ...config, envPolicy: "literal" as const };
	}
	return { ...config, headerPolicy: "origin-locked" as const };
}
