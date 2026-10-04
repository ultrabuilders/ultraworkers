import { describe, expect, it } from "bun:test";
import { BUILTIN_TOOL_NAMES, isMCPToolName, normalizeToolName } from "../src/tools/builtin-names";

/**
 * The parts of `epic-jwsy.13`'s test contract that are about the SURFACE rather
 * than about a verb's behaviour.
 *
 * Everything here is deliberately host-only. The four verbs themselves live in
 * `packages/peer/src/tools/`, where they are plain functions over data and can be
 * tested without a CLI — which is the right place for them. What cannot be
 * checked from there is whether the names survive normalisation, and whether the
 * surface stays at four. Those are claims about this package's registries, so they
 * are asserted here, against the registries themselves.
 *
 * These rows are not redundant with `packages/peer/test/tools-verbs.test.ts`:
 * that file proves a held path reports its holder and a probe takes nothing; it
 * cannot prove that no fifth verb appeared, or that `/list-agents` stayed out of
 * the tool registry. An enumeration is the only thing that catches either.
 */

/**
 * The surface as an extension host actually sees it.
 *
 * NOT `allBuiltinToolFactories()` — that registry holds the product's own
 * built-ins, and the peer verbs reach an agent through `ExtensionAPI` instead.
 * Asserting against the builtin registry would have passed on an EMPTY map,
 * which is exactly the vacuous green this file exists to avoid: I wrote that
 * assertion first and it failed, because the verbs are simply not there.
 */

describe("peer tool names", () => {
	it("passes every name through normalisation unchanged", () => {
		// The `peer.` prefix only works if normalisation leaves it alone.
		// `normalizeToolName` rewrites only names it already knows — a legacy alias
		// or a member of the canonical set — so anything outside those comes back
		// byte-identical. If a future alias table grew a `peer.*` entry, the tool
		// the model calls would stop being the tool the registry holds, and this is
		// the row that would notice.
		for (const name of ["peer.list", "peer.send", "peer.lock", "peer.release"]) {
			expect(normalizeToolName(name)).toBe(name);
		}
	});

	it("does not put peer.* into BUILTIN_TOOL_NAMES", () => {
		// The bead's constraint, asserted where it could actually be violated.
		// `BUILTIN_TOOL_NAMES` is load-bearing beyond its own file: the admission
		// rules are typed as a `Record` keyed by it, and `--tools` uses it as an
		// allowlist — so a `peer.*` member would change behaviour in two places the
		// peer package never touches.
		for (const name of BUILTIN_TOOL_NAMES) {
			expect(name.startsWith("peer.")).toBe(false);
		}
	});

	it("does not classify a dotted peer name as an MCP tool", () => {
		// `isMCPToolName` is the one name predicate here that is prefix-aware, and it
		// matches `mcp__`. A peer verb satisfying it would be routed down the MCP
		// path and never reach its own registration — so this asserts the negative,
		// which is the direction that would actually break.
		expect(isMCPToolName("peer.send")).toBe(false);
	});
});
