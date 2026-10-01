/**
 * Extension-contributed host render strategy.
 *
 * A resize has to pick between two genuinely different repairs: repaint the
 * visible window in place, or borrow the alternate screen and replay the whole
 * transcript. That choice is made by a private gate in `TUI` that reads
 * `Bun.env.PI_TUI_RESIZE_IN_PLACE`, then a closed multiplexer classifier, then
 * `TERM_PROGRAM`. All three are closed: there is no way in for an extension
 * that knows a host the classifier has never heard of, and
 * `ExtensionTUISurface` deliberately does not expose `TUI` itself, so an
 * extension cannot reach `setResizeScrollback` either.
 *
 * The two existing overrides are `Bun.env` reads, which belong to the *user*
 * running the process. This seam is for a *vendor* who knows their terminal.
 *
 * ## Precedence, and the one rule a strategy cannot break
 *
 * 1. **`PI_TUI_RESIZE_IN_PLACE`** — the user's explicit override, ahead of
 *    everything, including extensions. An extension must not be able to overrule
 *    someone who set the variable precisely because the automatic answer was
 *    wrong for their terminal.
 * 2. **Core's safety veto** — inside a multiplexer the mux owns the grid and
 *    consumes the alt-buffer toggles itself; on a ConPTY host conhost re-emits
 *    the whole viewport and re-homes the cursor, so there is no anchor to
 *    recover. Both go to the borrow path, and **no strategy may override them**.
 *    This is the asymmetry that keeps the seam from being a foot-gun: a strategy
 *    can claim a host core has never seen, or force the conservative borrow
 *    path, but it cannot talk core out of a host that is measurably broken
 *    without one.
 * 3. **The first registered strategy that has an opinion** — `defer` means "no
 *    opinion", the same contract `SupersedeKeyFn` uses for a tool a strategy does
 *    not own. First wins, so load order is the tiebreak and the behaviour is
 *    reproducible.
 * 4. **Core's default** — Warp re-reports its size on alt-buffer toggles, so
 *    borrowing there self-sustains into a flicker loop.
 *
 * The resolver is PURE: it takes the environment, the grid ownership flag and the
 * platform as arguments rather than reading globals, so every host combination is
 * testable without mutating `process.env` for the rest of the suite.
 */
import { isInsideTerminalMultiplexer } from "./terminal-multiplexer";

/** What a strategy says about how a resize should repaint. */
export type HostRenderDecision = "in-place" | "alt-borrow" | "defer";

/** Everything a strategy is allowed to reason about. */
export interface HostRenderContext {
	/** The environment markers omp itself classifies hosts by. */
	readonly env: NodeJS.ProcessEnv;
	/** True when the host owns the grid and re-emits it on resize (ConPTY). */
	readonly hostOwnsGridOnResize: boolean;
	readonly platform: NodeJS.Platform;
}

/** One vendor's rule for choosing a resize repair. */
export interface HostRenderStrategy {
	/** Unique per process. Identifies the strategy in diagnostics and rejections. */
	id: string;
	/** Human-readable, shown in `/extensions` and in rejection messages. */
	label: string;
	/**
	 * Decide for one resize. Return `"defer"` to abstain and let the next
	 * strategy — or core — decide; a strategy is asked once per resize, and must
	 * not mutate global state to do it.
	 */
	decide(context: HostRenderContext): HostRenderDecision;
}

const strategies: HostRenderStrategy[] = [];

/**
 * Install one strategy. Returns a disposer that removes it again; callers that
 * do not dispose leak the strategy for the life of the process.
 *
 * @throws when `id` is not a non-empty trimmed string, when `label` is blank,
 * when `decide` is not callable, or when that id is already registered — each
 * naming the offender, because a registration that is merely ignored is
 * indistinguishable from one that never happened, and two strategies sharing an
 * id make every log line ambiguous.
 */
export function registerHostRenderStrategy(strategy: HostRenderStrategy): () => void {
	const id = typeof strategy.id === "string" ? strategy.id.trim() : "";
	if (id.length === 0) {
		throw new TypeError("Host render strategy id must be a non-empty trimmed string");
	}
	if (typeof strategy.label !== "string" || strategy.label.trim().length === 0) {
		throw new TypeError(`Host render strategy "${id}" must have a label`);
	}
	if (typeof strategy.decide !== "function") {
		throw new TypeError(`Host render strategy "${id}" must provide decide(), got ${typeof strategy.decide}`);
	}
	if (strategies.some(existing => existing.id === id)) {
		throw new Error(
			`A host render strategy named "${id}" is already registered. Ids identify a strategy in diagnostics, so two of them make every log line ambiguous.`,
		);
	}

	strategies.push(strategy);
	return () => {
		const index = strategies.indexOf(strategy);
		if (index >= 0) strategies.splice(index, 1);
	};
}

/**
 * A snapshot rather than the live array: the gate consults this while a
 * concurrent reload may splice the registry, and iterating the array directly
 * would skip whichever strategy shifted into the hole.
 */
export function hostRenderStrategies(): readonly HostRenderStrategy[] {
	return [...strategies];
}

/** Drop every strategy. Test-only; the runner disposes individually. */
export function clearHostRenderStrategies(): void {
	strategies.length = 0;
}

/**
 * The user's own override, or `null` when unset.
 *
 * `PI_TUI_RESIZE_IN_PLACE=1|true` forces in-place resize (no alt-buffer
 * borrow); `0|false` forces the alt-buffer path even on Warp. Unset defers to
 * detection.
 *
 * Exported because the ConPTY anchor probe asks the narrower question "is the
 * in-place repaint being forced", not the whole gate answer — a caller that
 * re-derived the variable's spelling here would be the second copy this module
 * exists to prevent.
 */
export function resizeInPlaceEnvOverride(env: NodeJS.ProcessEnv): boolean | null {
	const override = env.PI_TUI_RESIZE_IN_PLACE;
	if (override === "1" || override === "true") return true;
	if (override === "0" || override === "false") return false;
	return null;
}

/** Inputs to the resize gate, injected so this stays a pure function. */
export interface InPlaceResizeInputs {
	readonly env: NodeJS.ProcessEnv;
	readonly hostOwnsGridOnResize: boolean;
	readonly platform: NodeJS.Platform;
}

/**
 * Whether a resize should repaint the visible window in place — no
 * alternate-screen borrow. See the module header for the precedence.
 *
 * `strategies` is a parameter so the precedence can be driven directly in a
 * test; production callers pass nothing and get the process registry.
 */
export function resolveInPlaceResize(
	inputs: InPlaceResizeInputs,
	strategies: readonly HostRenderStrategy[] = hostRenderStrategies(),
): boolean {
	const override = resizeInPlaceEnvOverride(inputs.env);
	if (override !== null) return override;

	// Core's safety veto, which a strategy cannot talk core out of.
	if (isInsideTerminalMultiplexer(inputs.env) || inputs.hostOwnsGridOnResize) return false;

	for (const strategy of strategies) {
		const decision = strategy.decide({
			env: inputs.env,
			hostOwnsGridOnResize: inputs.hostOwnsGridOnResize,
			platform: inputs.platform,
		});
		if (decision !== "defer") return decision === "in-place";
	}

	return inputs.env.TERM_PROGRAM?.toLowerCase() === "warpterminal";
}
