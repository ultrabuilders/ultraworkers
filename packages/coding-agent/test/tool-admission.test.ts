import { beforeAll, describe, expect, it } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { cfgMemoryBackend } from "@oh-my-pi/pi-coding-agent/memory-backend/settings";
import type { MemoryBackendId } from "@oh-my-pi/pi-coding-agent/memory-backend/types";
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

beforeAll(() => {
	// `isolated()`, NOT `loadIsolated()`: the latter reads the real user config, so
	// every case below would answer "is this laptop configured for it" while its
	// comments claim to answer "does an unset session see it". A case whose stated
	// question and actual question differ is wrong regardless of the verdict — the
	// readWrite pairs all held here only because this machine happens to have
	// autolearn and a memory backend on.
	//
	// A `{}` stand-in is not an option either: every rule reads its gate through the
	// config registry, which throws before it can answer, and that reads as "the
	// table is broken" rather than "the harness is".
	settings = Settings.isolated();
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

/**
 * The matrix snapshot the differential pairs above cannot replace.
 *
 * The pairs cover seven names. The other twenty-six are decided by rules that read
 * a settings gate, and a gate can stop being read while every pair stays green —
 * which is the blind spot this closes. Generated over EVERY name and EVERY column,
 * so a name no pair covers still has a cell.
 *
 * The expectation is COMMITTED, not derived from the rule. Deriving it would restate
 * the table back at itself and stay green through any regression; writing it down
 * means a gate that quietly stops being consulted flips one cell here.
 *
 * Columns vary the two axes that actually gate: `taskDepth` (0 and 1) and the memory
 * backend (`hindsight` / `mnemopi` / `local`, plus defaults). Every name has a bit per
 * column, so a dropped context field moves exactly one cell instead of silently
 * removing a tool.
 *
 * Rows were checked against the rule text, not just recorded: `memory_edit` is
 * `00001100` because its rule is an equality against `mnemopi`, and `retain` is
 * `00111100` because its rule admits either backend carrying tools. `learn` and
 * `manage_skill` are all-zero because `cfgAutolearnEnabled` defaults OFF — which is
 * also why this file builds settings with `Settings.isolated()`. Reading the real
 * user config instead reported them admitted, because this machine has autolearn on:
 * a snapshot that only holds on the laptop that wrote it is not a snapshot.
 */
describe("tool admission matrix", () => {
	const NAMES = [...BUILTIN_TOOL_NAMES, ...HIDDEN_TOOL_NAMES];

	const EXPECTED: Record<string, string> = {
		read: "11111111111111111111",
		bash: "11111111111111111111",
		edit: "11111111111111111111",
		ast_grep: "00000000000000000000",
		ast_edit: "11111111111111111111",
		ask: "11111111111111111111",
		debug: "11111111111111111111",
		ida: "00000000000000000000",
		eval: "00000000001000000000",
		github: "00000000000000000000",
		glob: "11111111111111111111",
		grep: "11111111111111111111",
		find: "00000000000000000000",
		lsp: "11111111101111111111",
		checkpoint: "00000000000000000000",
		rewind: "00000000000000000000",
		context_notes: "00000000000000000000",
		new_context: "00000000000000000000",
		security_scan: "00000000000000000000",
		task: "11111111111111111111",
		wait: "11111111111111111111",
		todo: "11111111111111110111",
		web_search: "11111111111111111111",
		write: "11111111111111111111",
		memory_edit: "00001100000000000000",
		retain: "00111100000000000000",
		recall: "00111100000000000000",
		reflect: "00111100000000000000",
		learn: "00000000000000000000",
		manage_skill: "00000000000000000000",
		yield: "11111111111111111111",
		goal: "00000000000010000000",
		think: "00000000000000100000",
	};

	// Every axis that gates, each with a column that flips it.
	//
	// The backend/depth columns alone are not enough, and the gap is the bead's own
	// discriminating question: with the four context booleans pinned to one value,
	// `lsp`/`eval`/`goal`/`think`/`todo` vary in ZERO columns, so a rule that quietly
	// stopped reading `enableLsp` would leave the snapshot byte-identical and the test
	// green. Each boolean therefore gets an on and an off column.
	type Column = {
		label: string;
		backend: MemoryBackendId | undefined;
		depth: number;
		over: Partial<ToolAdmissionContext>;
	};

	const COLUMNS: Column[] = [
		{ label: "defaults/depth0", backend: undefined, depth: 0, over: {} },
		{ label: "defaults/depth1", backend: undefined, depth: 1, over: {} },
		{ label: "hindsight/depth0", backend: "hindsight", depth: 0, over: {} },
		{ label: "hindsight/depth1", backend: "hindsight", depth: 1, over: {} },
		{ label: "mnemopi/depth0", backend: "mnemopi", depth: 0, over: {} },
		{ label: "mnemopi/depth1", backend: "mnemopi", depth: 1, over: {} },
		{ label: "local/depth0", backend: "local", depth: 0, over: {} },
		{ label: "local/depth1", backend: "local", depth: 1, over: {} },
		// One flipped boolean per pair: the rule must read it, or the row stops varying.
		{ label: "lsp/on", backend: undefined, depth: 0, over: { enableLsp: true } },
		{ label: "lsp/off", backend: undefined, depth: 0, over: { enableLsp: false } },
		{ label: "eval/on", backend: undefined, depth: 0, over: { allowEval: true } },
		{ label: "eval/off", backend: undefined, depth: 0, over: { allowEval: false } },
		{ label: "goal/on", backend: undefined, depth: 0, over: { goalEnabled: true } },
		{ label: "goal/off", backend: undefined, depth: 0, over: { goalEnabled: false } },
		{ label: "think/on", backend: undefined, depth: 0, over: { externalThinkingActive: true } },
		{ label: "think/off", backend: undefined, depth: 0, over: { externalThinkingActive: false } },
		{ label: "yield/included", backend: undefined, depth: 0, over: { includeYield: true } },
		{ label: "yield/excluded", backend: undefined, depth: 0, over: { includeYield: false } },
		// `goal` refuses whenever the list is restricted, so the pair needs BOTH halves
		// of that contract or it would read as "goalEnabled alone decides".
		{ label: "restricted", backend: undefined, depth: 0, over: { goalEnabled: true, restrictToolNames: true } },
		// The depth-gated rules answer "requested", so a requested list must be a column.
		{ label: "requested", backend: undefined, depth: 1, over: { requestedTools: ["read"] } },
	] satisfies ReadonlyArray<Column>;

	it("has a committed expectation for every name, and one bit per column", () => {
		// Otherwise a new tool silently escapes the snapshot below — the failure this
		// file exists to make impossible.
		expect(Object.keys(EXPECTED).sort()).toEqual([...NAMES].sort());
		for (const name of NAMES) expect(EXPECTED[name]).toHaveLength(COLUMNS.length);
	});

	it("admits each name exactly as committed, in every column", async () => {
		const mismatches: Array<{ name: string; column: string; expected: boolean; actual: boolean }> = [];
		for (const [index, column] of COLUMNS.entries()) {
			// `isolated`, NOT `loadIsolated`: the latter reads the real user config, so
			// the "defaults" column would be whatever profile the machine running the
			// suite happens to have. A snapshot that only holds on this laptop is not a
			// snapshot. In-memory also means mutating one column cannot leak into the
			// next, which the gates' per-instance memoisation would otherwise allow.
			const columnSettings = Settings.isolated();
			if (column.backend) cfgMemoryBackend.set(columnSettings, column.backend);
			for (const name of NAMES) {
				const expected = EXPECTED[name]![index] === "1";
				const actual = isToolAdmitted(
					name,
					contextWith(column.over, { taskDepth: column.depth, settings: columnSettings }),
				);
				if (expected !== actual) mismatches.push({ name, column: column.label, expected, actual });
			}
		}
		// Print before asserting: the question is "which cell moved", and the answer is
		// a list of cells rather than a boolean.
		console.error("[admission] mismatched cells = %o", mismatches);
		expect(mismatches).toEqual([]);
	});
});
