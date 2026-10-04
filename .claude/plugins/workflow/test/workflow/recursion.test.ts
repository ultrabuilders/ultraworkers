/**
 * Recursion is denied by tool NAME, and that makes the constant a security-shaped decision
 * rather than a preference: a workflow subagent that can see `workflow` spawns workflows, each
 * of which spawns more, with nothing in the graph to stop it.
 *
 * The rows below are about the name set, because the name set is what the guard is. A test that
 * asserted only "the defaults are non-empty" would pass if the two entries were renamed to
 * anything else — which is exactly the edit someone makes when the tool is renamed, and the
 * edit that silently re-opens unbounded fan-out.
 */
import { describe, expect, test } from "bun:test";
import { DEFAULT_EXCLUDED_SUBAGENT_TOOLS, subagentExcludedTools } from "../../src/agent-bridge";

describe("subagent recursion guard", () => {
	test("denies the workflow tool and its control surface by default", () => {
		// Both names, because a subagent denied `workflow` but granted `workflow_control` can
		// still reach a running workflow and drive it. Dropping either re-opens the loop.
		expect(DEFAULT_EXCLUDED_SUBAGENT_TOOLS).toContain("workflow");
		expect(DEFAULT_EXCLUDED_SUBAGENT_TOOLS).toContain("workflow_control");
	});

	test("the default list holds exactly those two", () => {
		expect(DEFAULT_EXCLUDED_SUBAGENT_TOOLS).toEqual(["workflow", "workflow_control"]);
	});

	test("a subagent is denied the defaults plus the session's own exclusions", () => {
		expect(subagentExcludedTools(undefined, ["bash"])).toEqual(["workflow", "workflow_control", "bash"]);
	});

	test("a call site can widen the denial without narrowing it", () => {
		// `extra` comes last, so it appends. If it ever prepended, a call site could not add a
		// name — but there is no ordering in which a caller can REMOVE a default, because the
		// two are concatenated into a fresh array rather than filtered.
		expect(subagentExcludedTools(["grep"])).toEqual(["workflow", "workflow_control", "grep"]);
	});

	test("caller exclusions cannot drop an always-on default", () => {
		// The negative contract. A caller that names `workflow` as excluded is not asking for it
		// back; and there is no argument through which `workflow` can be re-granted. A filter-
		// based implementation would let `sessionExclude: []` mean something different from
		// "no opinion", and this row is what would catch that.
		expect(subagentExcludedTools(["bash"], ["edit"])).toContain("workflow");
		expect(subagentExcludedTools(["workflow"], [])).toContain("workflow");
	});

	test("absent arguments behave as empty, not as an error", () => {
		expect(subagentExcludedTools()).toEqual(["workflow", "workflow_control"]);
	});

	test("the caller gets its own array and cannot mutate the defaults", () => {
		// Without the spread, a caller could `pop()` the shared module-level constant and every
		// later subagent would spawn with the recursion guard already removed. Nothing about the
		// call site would look wrong.
		const first = subagentExcludedTools(["bash"]);
		first.push("mystery");
		expect(subagentExcludedTools()).toEqual(["workflow", "workflow_control"]);
		expect(DEFAULT_EXCLUDED_SUBAGENT_TOOLS).toEqual(["workflow", "workflow_control"]);
	});
});
