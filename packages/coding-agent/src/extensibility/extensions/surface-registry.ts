/**
 * The extension surface registry: the composer bands an extension declared at
 * LOAD time.
 *
 * ## Why this exists
 *
 * `ctx.ui.setHeader` / `setFooter` already mount a component into the composer's
 * header or footer band, and what they mount **outlives the hook that registered
 * it** — `ExtensionUiController` keeps the component in `#extensionHeaders` /
 * `#extensionFooters`, so the context is the factory's argument rather than the
 * component's home. What they cannot do is exist *before* an event fires:
 * `ExtensionAPI` exposes no `ui`, and a context is built per hook invocation, so
 * a panel an extension wanted on screen from the first frame had no seam to
 * declare itself through.
 *
 * This is that seam, and it is deliberately the thinnest thing that closes the
 * gap. `registerSurface` records the factory here at load; the controller drains
 * the registry when it initialises and mounts through `setExtensionSurface`.
 * Collisions, owner-scoped withdrawal and disposal therefore keep the single
 * implementation they already have — this adds a place to *declare*, not a
 * second way to mount.
 *
 * ## Process-global, like the mode registry
 *
 * One instance is shared by every session in the process, so a declaration is
 * visible to all of them and only unload takes it back. That is the correct
 * scope for the same reason `modeRegistry` is: an extension is loaded once per
 * process from the config directory, so its bands are one declaration rather
 * than a per-session one. A session that mounts them is a *reader* of this
 * registry, never its owner.
 */

import type { RegisteredExtensionSurface } from "./types";

/** Re-exported so the controller can name a band without importing two modules. */
export type { ExtensionSurfaceBand } from "./types";

export class ExtensionSurfaceRegistry {
	/**
	 * Declarations grouped by owner, each in registration order.
	 *
	 * Owner-scoped rather than key-scoped on purpose. `options.key` is a label
	 * two extensions are *allowed* to share, and the policy that resolves that —
	 * the second becomes `key~2`, both stay mounted, a warning names both — already
	 * lives in `setExtensionSurface`. Keying here instead would refuse the second
	 * extension at load with no warning and no band at all, which is exactly the
	 * silent loss that policy exists to prevent.
	 */
	readonly #byOwner = new Map<string, RegisteredExtensionSurface[]>();

	/** Record one declaration for `owner` (the extension's path). */
	register(owner: string, surface: RegisteredExtensionSurface): void {
		const existing = this.#byOwner.get(owner);
		if (existing === undefined) {
			this.#byOwner.set(owner, [surface]);
			return;
		}
		existing.push(surface);
	}

	/**
	 * Every declaration, in registration order across owners.
	 *
	 * Flattened on read rather than cached: the set changes only at load and
	 * unload while this is read once per session, so a cache would be a second
	 * thing to keep correct for no measurable gain.
	 */
	list(): readonly RegisteredExtensionSurface[] {
		return [...this.#byOwner.values()].flat();
	}

	/**
	 * Withdraw every declaration belonging to `owner`.
	 *
	 * Returns what was withdrawn rather than only a count: a caller that mounted
	 * components from these factories needs to know *which* ones, and a number
	 * cannot tell it. Same reasoning as `releaseDiagnostics`.
	 */
	releaseOwnedBy(owner: string): RegisteredExtensionSurface[] {
		const owned = this.#byOwner.get(owner);
		if (owned === undefined) return [];
		this.#byOwner.delete(owner);
		return owned;
	}
}

/** The registry the built-in surfaces and extensions share. */
export const extensionSurfaceRegistry = new ExtensionSurfaceRegistry();
