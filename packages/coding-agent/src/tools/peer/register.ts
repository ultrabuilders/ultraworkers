import { registerBuiltinTool } from "..";
import { PeerListTool, PeerLockTool, PeerReleaseTool, PeerSendTool } from ".";

/**
 * Register the four `peer.*` tools.
 *
 * Through `registerBuiltinTool`, NOT by adding to `BUILTIN_TOOL_NAMES`. That
 * constant is the 31 names the product ships as literals, and it is load-bearing
 * in two places beyond its own file: `tool-admission.ts` types its rules as
 * `Record<BuiltinToolName | HiddenToolName, ToolAdmissionRule>`, so a new member
 * would demand an admission rule, and `cli/args.ts` uses it as the `--tools`
 * allowlist. A dotted name also passes `normalizeToolName` unchanged, because
 * that function only rewrites names it already knows.
 *
 * Returns the names that were refused, so a caller can tell "registered" from
 * "already taken" instead of assuming success.
 */
export function registerPeerTools(): readonly string[] {
	const refused: string[] = [];
	const entries: [string, Parameters<typeof registerBuiltinTool>[1]][] = [
		["peer.list", s => new PeerListTool(s)],
		["peer.send", s => new PeerSendTool(s)],
		["peer.lock", s => new PeerLockTool(s)],
		["peer.release", s => new PeerReleaseTool(s)],
	];
	for (const [name, factory] of entries) {
		if (!registerBuiltinTool(name, factory)) refused.push(name);
	}
	return refused;
}
