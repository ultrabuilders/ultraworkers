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

/** What a handler is told about the reload it may hold. */
export interface ConfigReloadInfo {
	/** Which on-disk source triggered it: a watched config file's path. */
	readonly source: string;
	/** How many distinct sources changed in this debounced pass. */
	readonly changedCount: number;
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
