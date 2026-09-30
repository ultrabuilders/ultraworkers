import { beforeAll, describe, expect, it } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { BUILTIN_TOOL_NAMES, HIDDEN_TOOL_NAMES } from "@oh-my-pi/pi-coding-agent/tools/builtin-names";
import {
	isToolAdmitted,
	TOOL_ADMISSION,
	type ToolAdmissionContext,
	type ToolAdmissionSession,
} from "@oh-my-pi/pi-coding-agent/tools/tool-admission";

// Contract: whether a built-in tool reaches the model is a lookup in ONE table,
// keyed by tool name — so a tool's admission is a data item, not a branch in a
// chain someone has to find the right slot in.
//
// The two ways the 25-branch chain it replaced failed are both defended here. A
// tool belonging in no branch was admitted by the fallthrough, silently and
// looking deliberate; and a name arriving as an Object.prototype member was
// decided by an inherited function rather than by anybody's decision.
//
// Most cases are asserted DIFFERENTIALLY — a pair differing in exactly one
// field. A hardcoded expected value would pin today's default and would keep
// passing even if the gate stopped being consulted at all.

let settings: Settings;

beforeAll(async () => {
	// Real settings, not a stub: every rule reads its gate through the config
	// registry, which memoises against the instance's revision. A `{}` stand-in
	// makes every rule throw before it can answer — which reads as "the table is
	// broken" rather than "the harness is".
	settings = await Settings.loadIsolated();
});

const contextWith = (
	context: Partial<ToolAdmissionContext> = {},
	session: Partial<ToolAdmissionSession> = {},
): ToolAdmissionContext => ({
	session: { settings, ...session } as ToolAdmissionSession,
	restrictToolNames: false,
	requestedTools: undefined,
	includeYield: false,
	enableLsp: true,
	goalEnabled: false,
	externalThinkingActive: false,
	allowEval: false,
	...context,
});

describe("tool admission table", () => {
	it("decides an Object.prototype name without inheriting a function from Object", () => {
		// A plain object literal answers `rules["__proto__"]` with `Object.prototype` —
		// an object, not a function — so CALLING it throws. `Map.get` has no
		// prototype, so an unknown name falls through to the default instead. A tool
		// name only has to arrive here from a config typo, and a throw during tool
		// construction takes the whole session's tools with it.
		expect(isToolAdmitted("__proto__", contextWith())).toBe(true);
		expect(isToolAdmitted("toString", contextWith())).toBe(true);
		expect(isToolAdmitted("constructor", contextWith())).toBe(true);
	});

	it("covers every built-in and hidden tool name", () => {
		// The `satisfies` on the table already makes a new name a compile error.
		// This is the runtime half: it fails if the union is ever widened without the
		// type, which is how "covered by the type" quietly stops being true.
		const missing = [...BUILTIN_TOOL_NAMES, ...HIDDEN_TOOL_NAMES].filter(name => !TOOL_ADMISSION.has(name));
		expect(missing).toEqual([]);
	});

	it("admits a runtime-registered tool, because registration has no row to declare", () => {
		// `registerBuiltinTool` is a live seam. A tool added there has no row here by
		// construction, so refusing unknown names would make registration succeed and
		// then never construct the tool — a dead seam wearing a live one.
		expect(isToolAdmitted("some-extension-tool", contextWith())).toBe(true);
	});

	it("withholds the tools that are off by default, instead of admitting them by falling through", () => {
		// This is the case the old chain got wrong by omission: a name matching no
		// branch reached `return true` and looked like a decision. Each of these is
		// decided by a real rule, so an unset session must not see it.
		for (const name of ["github", "security_scan", "checkpoint", "rewind", "memory_edit", "retain", "ast_grep"]) {
			expect({ name, admitted: isToolAdmitted(name, contextWith()) }).toEqual({ name, admitted: false });
		}
		// ...and one that is on by default, so the list above is a decision rather
		// than a blanket "everything is denied".
		expect(isToolAdmitted("read", contextWith())).toBe(true);
	});

	it("follows the context flag each context-gated tool is named after", () => {
		// One flag, one tool, opposite answers — so each case fails if its flag stops
		// being read, whatever the surrounding settings happen to say.
		expect(isToolAdmitted("eval", contextWith({ allowEval: false }))).toBe(false);
		expect(isToolAdmitted("eval", contextWith({ allowEval: true }))).toBe(true);

		expect(isToolAdmitted("think", contextWith({ externalThinkingActive: false }))).toBe(false);
		expect(isToolAdmitted("think", contextWith({ externalThinkingActive: true }))).toBe(true);

		expect(isToolAdmitted("lsp", contextWith({ enableLsp: false }))).toBe(false);
		expect(isToolAdmitted("lsp", contextWith({ enableLsp: true }))).toBe(true);
	});

	it("refuses `goal` whenever goal mode is off or the session is restricted", () => {
		// `goal` is never in the default set. It is activatable only while
		// `goal.enabled` is on AND the session is not restricted, because a
		// restricted session is being handed an exact tool list.
		expect(isToolAdmitted("goal", contextWith({ goalEnabled: false }))).toBe(false);
		expect(isToolAdmitted("goal", contextWith({ goalEnabled: true, restrictToolNames: true }))).toBe(false);
	});

	it("withholds `todo` from a child that could yield, unless it is mid pre-walk", () => {
		// The pre-walk interview is what makes todo safe next to yield: a child
		// collecting requirements must not be offered a tool that would strand it.
		// All three cases differ only in the two fields the rule reads.
		const couldYield = contextWith({ includeYield: true }, { prewalkArmed: false });
		const prewalking = contextWith({ includeYield: true }, { prewalkArmed: true });
		const noYieldTool = contextWith({ includeYield: false }, { prewalkArmed: false });

		expect(isToolAdmitted("todo", couldYield)).toBe(false);
		expect(isToolAdmitted("todo", prewalking)).toBe(true);
		// With no yield tool there is nothing to strand, so the pre-walk must not
		// withhold todo either — same rule, the other branch.
		expect(isToolAdmitted("todo", noYieldTool)).toBe(true);
	});

	it("stops offering `task` once the recursion budget is spent", () => {
		// `canSpawnAtDepth` is the check, so the answer tracks the budget rather than
		// a number copied here. Top level may spawn; a nested child may not.
		expect(isToolAdmitted("task", contextWith({}, { taskDepth: 0 }))).toBe(true);
		expect(isToolAdmitted("task", contextWith({}, { taskDepth: 100 }))).toBe(false);
	});
});
