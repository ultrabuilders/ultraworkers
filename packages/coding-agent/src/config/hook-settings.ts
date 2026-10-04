/**
 * Where a hook's recorded content hash lives.
 *
 * It is an ordinary record setting rather than a side file, for two reasons: it
 * then inherits the layering, normalisation and `flush()` that every other
 * setting already has, and a user who wants to know why a hook stopped running
 * can find the answer in the same `config.yml` they already read, under
 * `hooks.state`, instead of in a marker file nobody documents.
 *
 * Keys are the three-part hook identity from `hookTrustKey`, quoted in YAML
 * because they contain `:` — so a record reads as
 * `hooks: { state: { "pre:bash:guard": { trustedHash: "…" } } }`.
 *
 * The type is `HookState` from the hooks layer rather than a local copy, and
 * there is no `enabled` field: nothing in ultraworkers can produce one (there is no
 * per-handler toggle to read it back from), and a persisted field with no
 * writer is a field that lies.
 */
import { register } from "./registry";
import { type HookState } from "../extensibility/hooks/trust";
import { type Settings, settings } from "./settings";

const NO_HOOK_STATES: Readonly<Record<string, HookState>> = Object.freeze({});

/** `hooks.state` — one {@link HookState} per hook identity. */
export const cfgHookStates = register({
	id: "hooks.state",
	type: "record",
	default: NO_HOOK_STATES,
});

function allStates(scope: Settings = settings): Readonly<Record<string, HookState>> {
	return cfgHookStates.get(scope) ?? NO_HOOK_STATES;
}

/** The hash recorded for `hookKey`, or `undefined` when the hook has never been seen. */
export function recordedHookHash(hookKey: string, scope: Settings = settings): string | undefined {
	return allStates(scope)[hookKey]?.trustedHash;
}

/**
 * Record `hash` for `hookKey`, leaving every other hook's record alone.
 *
 * Returns whether anything changed. Callers use that to flush once at the end
 * of a scan rather than per hook, and so that the ordinary case — a hook that has
 * not changed since it was first seen — neither rewrites the config file nor
 * dirties it on every load.
 *
 * On persistence: `Settings.set` schedules a debounced write, so a record does
 * reach disk on its own within the debounce window. Flushing is still worth it —
 * a short-lived process can exit before that timer fires, and a record that was
 * never written is a record that is absent next run, which would make every hook
 * first-sight again and leave `modified` unreachable for exactly the short-lived
 * invocations (`ultraworkers -p`, a catalog command) where it matters most. Measured: with
 * the flush removed the record still lands, because these scans take longer than
 * the debounce — so that window is closed by argument, not by a test.
 */
export function recordHookHash(hookKey: string, hash: string, scope: Settings = settings): boolean {
	if (recordedHookHash(hookKey, scope) === hash) return false;
	cfgHookStates.set(scope, { ...allStates(scope), [hookKey]: { trustedHash: hash } });
	return true;
}

/** Drop `hookKey`'s record, so the next load treats it as first sight again. */
export function forgetHookHash(hookKey: string, scope: Settings = settings): boolean {
	if (recordedHookHash(hookKey, scope) === undefined) return false;
	const next = { ...allStates(scope) };
	delete next[hookKey];
	cfgHookStates.set(scope, next);
	return true;
}
