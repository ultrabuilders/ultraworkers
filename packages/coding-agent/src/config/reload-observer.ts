/**
 * Observe and veto a config reload, from outside `Settings`.
 *
 * The watch path is real and predates this file: `startWatching()`
 * (`config/settings.ts:1075`) watches the directories holding `config.yml`, the
 * project settings files and `--config` overlays, debounces at
 * `CONFIG_WATCH_DEBOUNCE_MS` (200 ms, `:1163`), and applies with keep-last-good
 * semantics (`:1174`). What it could not do is tell anyone else it was about to.
 * A long-lived host applies a user's on-disk edit inside `Settings`, with no
 * event before it and no way to hold it, so anything that has to stay consistent
 * across the edit — an open dialog, a running tool, a plugin's cached state —
 * learned about it afterwards at best.
 *
 * The registry lives in its own module rather than on `Settings` for the same
 * reason the extension runner does: `Settings` is a config layer, and importing
 * the extension surface from it would invert the dependency. The host wires the
 * two together at startup (`main.ts`, next to `startWatching()`).
 *
 * **A veto defers, it does not discard.** Returning a reason leaves the previous
 * values in force and the watcher armed, so the next qualifying edit retries.
 * Dropping the edit would silently discard something the user typed.
 *
 * **Two moments, because "hold it" and "it landed" are different questions.**
 * {@link onBeforeConfigReload} runs before the apply and can defer it;
 * {@link onAfterConfigReload} runs once it has actually been applied. Only the
 * first existed, which left a host with exactly one way to react to a config
 * change — refuse it — and no way to act on one that went through.
 */

import { logger } from "@oh-my-pi/pi-utils";

/**
 * What a handler is told about the reload it may hold.
 *
 * A debounced pass merges everything that changed within `CONFIG_WATCH_DEBOUNCE_MS`
 * into a single apply, so this is a *list*. An editor that writes two files, or a
 * tool that touches the global config and a project settings file at once,
 * produces one pass with two sources.
 *
 * There is deliberately no `count` field. It would be `sources.length`, and a
 * field that is a function of another field is a field that can disagree with it
 * — which is worse than no field, because a handler trusting it acts on a number
 * the type system still promises is right.
 */
export interface ConfigReloadInfo {
	/** Every distinct watched path that tripped this pass, in first-seen order. */
	readonly sources: readonly string[];
}

/**
 * What one pass did, as reported back to the caller that owns the apply.
 */
export interface ConfigReloadPassResult {
	/** Whether the pass ran to completion. False only when a handler held it. */
	readonly applied: boolean;
	/** The files the pass covered, whether it was held or applied. */
	readonly sources: readonly string[];
	/** Which handlers held it; empty when the pass went through. */
	readonly deferrals: readonly string[];
}

/**
 * Consulted before a watched change is applied. Return a reason to defer it, or
 * nothing to let it through. Deferred reloads stay pending rather than being
 * dropped, so the user's edit is not silently discarded.
 */
export type ConfigReloadHandler = (info: ConfigReloadInfo) => string | undefined | Promise<string | undefined>;

const handlers = new Set<ConfigReloadHandler>();

/**
 * Register a handler. Returns the function that unregisters it.
 *
 * Refuses a non-function rather than storing it: a handler that throws when the
 * reload fires would turn "tell me first" into "break the config watcher", which
 * is the opposite of what registering asked for.
 */
export function onBeforeConfigReload(handler: ConfigReloadHandler): () => void {
	if (typeof handler !== "function") {
		throw new Error(
			`Config reload handler must be a function, received ${handler === null ? "null" : typeof handler}`,
		);
	}
	if (handlers.has(handler)) {
		throw new Error("This config reload handler is already registered; unregister it before registering again");
	}
	handlers.add(handler);
	return () => {
		handlers.delete(handler);
	};
}

/** Whether anything is listening. The seam's absence has to be observable. */
export function hasConfigReloadHandlers(): boolean {
	return handlers.size > 0;
}

/**
 * Called after a watched change has actually been applied.
 *
 * This is the other half of {@link onBeforeConfigReload}: that one can hold a
 * reload, this one learns that one landed. Without it the only reaction to a
 * config change is the one `Settings` performs itself, so a long-lived host that
 * has to re-derive something from the new values — an extension re-contributing
 * its resources, a cache keyed on a setting — had no seam at all and was reachable
 * only by restarting.
 *
 * Return value is ignored: "I applied it" has already happened by the time this
 * runs, so there is nothing for a handler to veto.
 *
 * **The watched path only.** `Settings.reloadFromDisk()` applies too, and does not
 * notify: its one caller is the structured-subagent preflight, which re-resolves
 * the policy it needs from the new values itself, and a direct reload names no
 * source to report. Extending the notification there is a separate decision with
 * its own caller, not a consequence of adding this.
 */
export type ConfigReloadAppliedHandler = (info: ConfigReloadInfo) => void | Promise<void>;

const appliedHandlers = new Set<ConfigReloadAppliedHandler>();

/**
 * Register an after-apply handler. Returns the function that unregisters it.
 *
 * Refuses a non-function and a duplicate registration for the same reasons
 * {@link onBeforeConfigReload} does: a handler that throws when the reload fires
 * would turn "tell me it landed" into "break the config watcher".
 */
export function onAfterConfigReload(handler: ConfigReloadAppliedHandler): () => void {
	if (typeof handler !== "function") {
		throw new Error(
			`Config reload handler must be a function, received ${handler === null ? "null" : typeof handler}`,
		);
	}
	if (appliedHandlers.has(handler)) {
		throw new Error("This config reload handler is already registered; unregister it before registering again");
	}
	appliedHandlers.add(handler);
	return () => {
		appliedHandlers.delete(handler);
	};
}

/** Whether anything is listening after an apply. Absence must be observable. */
export function hasAfterConfigReloadHandlers(): boolean {
	return appliedHandlers.size > 0;
}

/**
 * Tell every after-apply handler that the reload landed.
 *
 * **One handler throwing does not stop the others, and does not propagate.** The
 * apply has already happened, so a throw here cannot un-apply it — it would only
 * skip the handlers after it, which are the ones that have to release a lock or
 * drop a cache. The failure is logged rather than swallowed: a handler that
 * throws every reload is a real defect, and silently continuing would hide it
 * until something downstream is mysteriously stale.
 */
export async function notifyConfigReloadApplied(info: ConfigReloadInfo): Promise<void> {
	for (const handler of appliedHandlers) {
		try {
			await handler(info);
		} catch (error) {
			logger.error("Config reload after-apply handler failed", { error: String(error) });
		}
	}
}

/**
 * Run every handler in registration order and collect the deferral reasons.
 *
 * Every handler runs even once one has deferred: a later handler that needs to
 * release a lock, or record that it deferred, must not be skipped because an
 * earlier one said no. The reasons are returned together so the caller can log
 * each one against the source that asked for it.
 */
export async function collectConfigReloadDeferrals(info: ConfigReloadInfo): Promise<string[]> {
	const reasons: string[] = [];
	for (const handler of handlers) {
		const reason = await handler(info);
		if (typeof reason === "string" && reason.trim().length > 0) reasons.push(reason.trim());
	}
	return reasons;
}

/**
 * Run one watched pass end to end: ask the before-handlers, apply only if nobody
 * held it, then tell the after-handlers it landed.
 *
 * **The pairing lives here, not in the two registries.** `collectConfigReloadDeferrals`
 * and `notifyConfigReloadApplied` do not call each other, so nothing in either one
 * encodes "a veto means no notification" — that is a statement about the order of
 * three steps, and the order had exactly one home, inside `Settings`, which is only
 * reachable through the process-global watcher. A caller that consulted the two
 * registries directly would be free to notify after a reload nobody applied.
 *
 * {@link apply} is called only when no handler deferred. **A throw from `apply`
 * propagates**, and no after-handler runs — this function will not report a pass it
 * did not complete. Keeping the failure with the caller is deliberate: the caller
 * owns the apply, so it owns what a failed apply means (keep-last-good leaves the
 * previous values in force, which is not the same event as "the reload you were
 * waiting for has landed"). The caller that wants both properties — a recorded
 * failure *and* a closed pass — handles them where it already does, by handling the
 * throw itself. `Settings` does exactly that.
 */
export async function runConfigReloadPass(
	info: ConfigReloadInfo,
	apply: () => Promise<void>,
): Promise<ConfigReloadPassResult> {
	const deferrals = await collectConfigReloadDeferrals(info);
	if (deferrals.length > 0) return { applied: false, sources: info.sources, deferrals };
	await apply();
	await notifyConfigReloadApplied(info);
	return { applied: true, sources: info.sources, deferrals: [] };
}

/**
 * Collects the watched paths that changed since the last completed pass.
 *
 * This lives beside {@link ConfigReloadInfo} rather than inside `Settings` so the
 * part that decides *what a pass contains* is reachable without standing up a
 * process-global watcher, which is the one thing the wiring in `Settings` cannot
 * be tested around.
 *
 * **Why a set, and why not a single field.** `fs.watch` emits an event per write,
 * and several files routinely change inside one debounce window. Holding only the
 * most recent path — the one-field version, which this replaced — reports every
 * pass as a single change and names whichever file tripped *last*, so the others
 * are invisible to every observer: a handler told "settings.json changed" when a
 * `config.yml` edit was co-applied has no way to know it. A set deduplicates the
 * repeats and preserves first-seen order, so `sources.length` means "distinct files
 * that changed", not "events observed".
 */
export class WatchSourceAccumulator {
	readonly #sources = new Set<string>();

	/** Record a path that changed. A direct reload names no file, so empty is ignored. */
	add(source: string): void {
		if (source.length > 0) this.#sources.add(source);
	}

	/** The paths changed so far. Does not consume them. */
	snapshot(): readonly string[] {
		return [...this.#sources];
	}

	/**
	 * Forget everything, once the pass has been consulted and applied.
	 *
	 * Deliberately not consumed by {@link snapshot}: a deferred pass never happens,
	 * so its sources are still pending and the retry has to name them again.
	 * Clearing on a deferral would make the edit an observer just held the one edit
	 * it never hears about again — the holder would be told to let go, wait for the
	 * next change, and never learn that the change it was protecting had landed
	 * while it wasn't looking.
	 */
	clear(): void {
		this.#sources.clear();
	}
}
