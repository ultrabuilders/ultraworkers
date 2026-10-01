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

const builtinEffects = new Map<string, ReadonlySet<ToolEffect>>(
	Object.entries(BUILTIN_TOOL_EFFECTS).map(([name, effects]) => [name, new Set(effects)]),
);

/**
 * Extension contributions, as a reference count per (tool, effect).
 *
 * Kept separate from `BUILTIN_TOOL_EFFECTS` rather than merged into it, so the
 * built-in table stays the one place a built-in's effects are written and a
 * contribution can never overwrite one. Withdrawing decrements rather than
 * restores a snapshot: two extensions may declare the same effect for one tool
 * name, and the first one to withdraw must not take the other's with it.
 */
const contributions = new Map<string, Map<ToolEffect, number>>();

/**
 * Declare the effects of a tool, from outside this file. Returns the function
 * that withdraws the declaration.
 *
 * This is the seam: an extension registering a tool calls this once, and the
 * narrowing rule below applies to it with no change here. Merge rather than
 * replace, because two extensions contributing to one tool name is legitimate and
 * silently dropping the first declaration would be the failure mode.
 *
 * The returned disposer is what makes the gate independent of the owner's
 * lifecycle. An extension that unloads without withdrawing leaves its effects
 * behind, and the residue is not inert: the next tool registered under the same
 * name inherits a floor it never declared, and a tool that no longer exists keeps
 * narrowing one. Withdrawal is idempotent, so an unload path may call it twice.
 *
 * Nothing is recorded unless every effect validates, so a rejected declaration
 * leaves no partial state behind.
 */
export function declareToolEffects(toolName: string, effects: Iterable<ToolEffect>): () => void {
	const claimed: ToolEffect[] = [];
	for (const effect of effects) {
		if (!TOOL_EFFECTS.has(effect)) {
			throw new Error(
				`Unknown tool effect "${effect}" for tool "${toolName}". Known effects: ${[...TOOL_EFFECTS].join(", ")}.`,
			);
		}
		if (!claimed.includes(effect)) claimed.push(effect);
	}
	const counts = contributions.get(toolName) ?? new Map<ToolEffect, number>();
	for (const effect of claimed) counts.set(effect, (counts.get(effect) ?? 0) + 1);
	contributions.set(toolName, counts);

	let withdrawn = false;
	return () => {
		if (withdrawn) return;
		withdrawn = true;
		const live = contributions.get(toolName);
		if (!live) return;
		for (const effect of claimed) {
			const remaining = (live.get(effect) ?? 0) - 1;
			if (remaining > 0) live.set(effect, remaining);
			else live.delete(effect);
		}
		if (live.size === 0) contributions.delete(toolName);
	};
}

/**
 * The effects declared for a tool: its built-in entry, overlaid with whatever
 * extensions have declared and not withdrawn. Empty when it declares none.
 *
 * Derived on read rather than cached, so a withdrawal cannot be missed by a stale
 * snapshot and a built-in can never be shadowed by a contribution.
 */
export function declaredEffects(toolName: string): ReadonlySet<ToolEffect> {
	const out = new Set<ToolEffect>(builtinEffects.get(toolName) ?? []);
	for (const effect of contributions.get(toolName)?.keys() ?? []) out.add(effect);
	return out;
}

/**
 * Withdraw every effect an owner declared, across all of its tools.
 *
 * The disposer returned by {@link declareToolEffects} is per-call, which is the
 * right unit for a caller that keeps it. A loader does not: it registers tools
 * from a directory and tears the directory down as a unit, and a tool registered
 * during a load that later throws would never have its disposer stored at all.
 * Keyed by owner so unloading one extension cannot withdraw another's — the same
 * reason contributions are reference counted per (tool, effect) rather than
 * overwritten.
 */
const ownerWithdrawals = new Map<string, Array<() => void>>();

/** Record a declaration against an owner so {@link releaseToolEffects} can undo it. */
export function declareToolEffectsFor(toolName: string, effects: Iterable<ToolEffect>, owner: string): () => void {
	const withdraw = declareToolEffects(toolName, effects);
	const held = ownerWithdrawals.get(owner) ?? [];
	held.push(withdraw);
	ownerWithdrawals.set(owner, held);
	return () => {
		withdraw();
		const live = ownerWithdrawals.get(owner);
		if (!live) return;
		const at = live.indexOf(withdraw);
		// Idempotent: an unload path may call this after an explicit withdrawal, and
		// dropping a disposer twice would withdraw a co-tenant's declaration.
		if (at !== -1) live.splice(at, 1);
	};
}

/** Withdraw everything `owner` declared. Returns how many declarations were undone. */
export function releaseToolEffects(owner: string): number {
	const held = ownerWithdrawals.get(owner);
	if (!held) return 0;
	ownerWithdrawals.delete(owner);
	// Snapshot first: each disposer mutates the array it lives in.
	for (const withdraw of [...held]) withdraw();
	return held.length;
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
