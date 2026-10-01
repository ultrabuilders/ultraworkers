/**
 * What a tool touches, declared by the tool rather than inferred from its arguments.
 *
 * Approval tiers answer "how strong a grant does this call need". They do not
 * answer "what does it reach", and the gap is not theoretical — `docs/approval-mode.md`
 * records it: the `eval` tool declares the `exec` tier and can still spawn a shell,
 * so a `bash.patterns` deny does not apply to the same command run through `eval`.
 * A user who wants the shell gated must write a second policy by hand, per tool,
 * because nothing in the system knows both tools reach the same resource.
 *
 * An effect closes that: a tool says once that it reads the filesystem, and a user
 * writes one policy for the effect rather than one per tool that happens to reach it.
 *
 * Deliberately separate from `ToolTier`. Reusing tiers here would reproduce the
 * confusion the tier was never meant to carry — the tier is declared per call from
 * the arguments, while an effect is a property of the tool.
 *
 * **This is not a sandbox.** An effect is a declaration the user may narrow, not
 * containment: a tool that declares nothing is not constrained, and a tool that
 * declares an effect and then ignores it is not stopped. The same limitation
 * `docs/approval-mode.md` states for bash pattern policy — "it is not process or
 * filesystem containment" — applies here unchanged.
 */

/** A resource a tool reaches. Named for the resource, not for the tool. */
export type ToolEffect = "fs-read" | "fs-write" | "network" | "subprocess";

export const TOOL_EFFECTS: ReadonlySet<ToolEffect> = new Set<ToolEffect>([
	"fs-read",
	"fs-write",
	"network",
	"subprocess",
]);

/**
 * Effects each built-in tool declares.
 *
 * One table, and the only one. A second table saying the same thing would let the
 * two drift, and the drift is invisible: the narrowing rule consults whichever it
 * likes, so a tool can appear effect-free to the gate and effect-laden to a reader.
 *
 * Extensions declare their own through {@link declareToolEffects}; they do not edit
 * this table, which is what keeps "an extension outside this repo" working.
 */
const BUILTIN_TOOL_EFFECTS: Readonly<Record<string, readonly ToolEffect[]>> = {
	bash: ["subprocess"],
	eval: ["subprocess"],
	read: ["fs-read"],
	write: ["fs-write"],
	edit: ["fs-read", "fs-write"],
	ast_edit: ["fs-read", "fs-write"],
	glob: ["fs-read"],
	grep: ["fs-read"],
	ls: ["fs-read"],
	web_search: ["network"],
	fetch: ["network"],
};

const declared = new Map<string, ReadonlySet<ToolEffect>>(
	Object.entries(BUILTIN_TOOL_EFFECTS).map(([name, effects]) => [name, new Set(effects)]),
);

/**
 * Declare the effects of a tool, from outside this file.
 *
 * This is the seam: an extension registering a tool calls this once, and the
 * narrowing rule below applies to it with no change here. Merge rather than
 * replace, because two extensions contributing to one tool name is legitimate and
 * silently dropping the first declaration would be the failure mode.
 */
export function declareToolEffects(toolName: string, effects: Iterable<ToolEffect>): void {
	const existing = declared.get(toolName);
	const merged = new Set<ToolEffect>(existing ?? []);
	for (const effect of effects) {
		if (!TOOL_EFFECTS.has(effect)) {
			throw new Error(
				`Unknown tool effect "${effect}" for tool "${toolName}". Known effects: ${[...TOOL_EFFECTS].join(", ")}.`,
			);
		}
		merged.add(effect);
	}
	declared.set(toolName, merged);
}

/** The effects declared for a tool; empty when it declares none. */
export function declaredEffects(toolName: string): ReadonlySet<ToolEffect> {
	return declared.get(toolName) ?? new Set<ToolEffect>();
}

/**
 * Fold the user's per-effect policies into the floor a tool cannot go below.
 *
 * The combination rule is bash's own, quoted rather than reinvented: "any matching
 * `deny` wins, otherwise any matching `prompt` wins". The ordering is the safety
 * property — an effect can only ever raise the floor, so a wrong or missing
 * declaration cannot unlock something another layer had locked.
 */
export function resolveEffectFloor(
	effects: ReadonlySet<ToolEffect>,
	effectPolicies: Record<string, unknown>,
): { policy: "deny" | "prompt"; effect: ToolEffect } | undefined {
	let floor: { policy: "deny" | "prompt"; effect: ToolEffect } | undefined;
	for (const effect of effects) {
		const raw = Object.hasOwn(effectPolicies, effect) ? effectPolicies[effect] : undefined;
		if (typeof raw !== "string") continue;
		const policy = raw.trim().toLowerCase();
		// `deny` returns immediately so it wins over any `prompt`, including a `prompt`
		// that would otherwise have been chosen first by iteration order.
		if (policy === "deny") return { policy: "deny", effect };
		if (policy === "prompt" && floor === undefined) floor = { policy: "prompt", effect };
	}
	return floor;
}

/** The `userConfig` slice per-effect policies live under. */
export function effectPoliciesFrom(userConfig: Record<string, unknown>): Record<string, unknown> {
	const nested = userConfig.effects;
	return nested !== null && typeof nested === "object" && !Array.isArray(nested)
		? (nested as Record<string, unknown>)
		: {};
}
