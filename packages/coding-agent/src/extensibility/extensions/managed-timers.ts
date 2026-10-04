/**
 * Managed timers for extensions.
 *
 * Extensions scheduling their own background work through raw `setInterval` /
 * `setTimeout` used to be able to take down the whole session: a throw inside
 * the callback runs on a fresh stack outside the handler-dispatch try/catch,
 * surfaces as a process-level `uncaughtException`, and the global postmortem
 * handler treats that as fatal (issue #5664).
 *
 * {@link ManagedTimers} backs the sanctioned `ctx.setInterval` /
 * `ctx.setTimeout` helpers. Each callback runs inside the same isolation the
 * runner already applies to handler dispatch — a synchronous throw or a
 * rejected promise is reported through `onError` and swallowed — and every
 * outstanding handle is `unref`'d (never keeps the process alive) and cleared
 * on session teardown via {@link clearAll}.
 */
import { logger } from "@oh-my-pi/pi-utils";
// Type-only, so it is erased at compile time and cannot form a runtime cycle:
// `types.ts` never imports this module.
import type { Extension } from "./types";

/**
 * Owner for a timer scheduled before an owning context existed.
 *
 * The trampoline contexts are not extension-scoped — they back `createContext`
 * before `#ownTimers` shadows them per extension — so they have no extension to
 * attribute a timer to. Rather than throw (which would break every such caller and
 * the four unit tests that build a context directly), they get a sentinel that
 * `clearFor` can never match, so those timers are cleared by `clearAll` at
 * teardown exactly as before and survive every per-extension operation.
 *
 * A real object, not `undefined`: ownership is matched on `path`, so the sentinel
 * needs a path — and one no extension can have, since paths are absolute file
 * paths and this cannot be. That makes "clearable by whichever extension unloads
 * first" impossible rather than merely unlikely.
 */
export const UNOWNED_TIMERS = { path: "\0unowned" } as unknown as Extension;

/** Callback invoked when a managed timer's callback throws or rejects. */
export type ManagedTimerErrorHandler = (event: string, error: string, stack?: string) => void;

export class ManagedTimers {
	/**
	 * Each handle remembers the extension that scheduled it.
	 *
	 * A `Set<Timer>` could answer "is this handle still managed" but not "whose is
	 * it", and without that, suspending or unloading one extension cannot touch its
	 * timers without touching every neighbour's too.
	 */
	readonly #timers = new Map<Timer, Extension>();

	constructor(private readonly onError: ManagedTimerErrorHandler) {}

	/** Schedule a repeating callback whose throws are contained. */
	setInterval(owner: Extension, callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer {
		const timer = setInterval(() => this.#run("interval", callback, args), ms, ...args);
		timer.unref?.();
		this.#timers.set(timer, owner);
		return timer;
	}

	/** Schedule a one-shot callback whose throws are contained. Deregisters after it fires. */
	setTimeout(owner: Extension, callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer {
		const timer = setTimeout(
			() => {
				this.#timers.delete(timer);
				this.#run("timeout", callback, args);
			},
			ms,
			...args,
		);
		timer.unref?.();
		this.#timers.set(timer, owner);
		return timer;
	}

	/** Clear one managed timer. Accepts an interval or timeout handle. */
	clear(timer: Timer): void {
		if (!this.#timers.delete(timer)) return;
		clearInterval(timer);
		clearTimeout(timer);
	}

	/**
	 * Clear every timer scheduled by ONE extension, leaving its neighbours running.
	 *
	 * The point of tracking ownership: a suspended or unloaded extension must not
	 * take down work that a different extension is still doing.
	 *
	 * Matched on `path` because a PATH is an extension's identity and object
	 * identity is only one LOAD of it. Every load builds a fresh `Extension`
	 * (`createExtension`), so identity would answer "which load?" when the question
	 * is "which extension?" — and unload must clear every leftover load of that
	 * extension, not just the live one. Getting it backwards fails as a silent
	 * leak: a reload leaves the old instance's timers keyed to an object nothing
	 * holds any more, and the clear reports success having cleared nothing.
	 *
	 * Relies on "a path names one extension", which was NOT true when this was
	 * written: `bindPreparedExtensions` pushed without a dedupe, and
	 * `isExtensionActive` only answers with a path lookup rather than preventing
	 * one. With a duplicate, `clearFor` would clear both and could not tell the
	 * two apart. `3f3e42c126` refuses the second load, so the invariant holds
	 * rather than being a caveat; if that dedupe is ever relaxed, this comment is
	 * the thing to re-check first.
	 */
	/**
	 * Release every timer held by one extension path.
	 *
	 * Takes the path rather than the owner so a caller that has only a path — an
	 * unload, where the extension object is spliced out of the active list before
	 * the release runs — cannot pass `undefined` into an API that dereferences it.
	 */
	clearForPath(path: string): number {
		let cleared = 0;
		// Deleting from a Map while iterating it is specified, not accidental: entries
		// removed before the cursor is reached are simply not visited.
		for (const [timer, holder] of this.#timers) {
			if (holder?.path !== path) continue;
			this.#timers.delete(timer);
			clearInterval(timer);
			clearTimeout(timer);
			cleared += 1;
		}
		return cleared;
	}

	/** Clear every outstanding managed timer. Called on session teardown. */
	clearAll(): void {
		for (const timer of this.#timers.keys()) {
			clearInterval(timer);
			clearTimeout(timer);
		}
		this.#timers.clear();
	}

	#run(kind: "interval" | "timeout", callback: (...args: unknown[]) => void, args: unknown[]): void {
		try {
			const result = callback(...args) as unknown;
			if (result instanceof Promise) {
				result.catch((err: unknown) => this.#report(kind, err));
			}
		} catch (err) {
			this.#report(kind, err);
		}
	}

	#report(kind: "interval" | "timeout", err: unknown): void {
		const message = err instanceof Error ? err.message : String(err);
		const stack = err instanceof Error ? err.stack : undefined;
		logger.warn("Extension timer callback threw", { event: `${kind}_callback`, error: message });
		this.onError(`${kind}_callback`, message, stack);
	}
}
