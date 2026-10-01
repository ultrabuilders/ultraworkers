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
 */

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
