/**
 * `/rename` — the one operation that can set a name to anything.
 *
 * Allocation draws from the closed space of §3.1 and is role-free. Rename
 * deliberately throws that away: it accepts any string, because matching Claude
 * Code is worth more than the property it costs. What survives is the set of
 * checks that close a specific hole rather than restate a virtue.
 *
 * Uniqueness is checked **case-insensitively** because `BlueLake` and
 * `bluelake` are one owner on NTFS, and because `send` refuses an ambiguous
 * name rather than guessing: a rename that created a duplicate would not
 * disambiguate a session, it would break delivery for two of them.
 */

import { RESERVED_NAMES, nameKey } from "./allocate";
import { sanitiseName } from "./sanitise";

/** Why a rename was refused. Each value is a distinct hole, not a mood. */
export type RenameRefusal = "empty" | "reserved" | "taken";

/** Outcome of a rename attempt. */
export type RenameOutcome =
	| { readonly kind: "renamed"; readonly from: string; readonly to: string }
	| { readonly kind: "refused"; readonly reason: RenameRefusal; readonly requested?: string };

/**
 * Extra names this session may not take — the agent's own role words.
 *
 * Kept out of the module-level {@link RESERVED_NAMES} because those two are
 * global policy while these belong to whoever is registering.
 */
export type ExtraReserved = ReadonlySet<string>;

/**
 * Decide whether `raw` may replace `current`.
 *
 * `isTaken` answers "does some *other* session already hold this key" — the
 * caller's own key must not read as taken, or a session could never re-assert
 * its existing name. Callers run this inside the same critical section as
 * allocation; the two are one lock because both write the same namespace.
 */
export function renameName(
	current: string,
	raw: string,
	isTaken: (key: string) => boolean,
	extraReserved: ExtraReserved = new Set<string>(),
): RenameOutcome {
	// An empty result after sanitisation is a refusal, never a fallback to a
	// generated name: substituting would hand back a name nobody asked for and
	// then publish it to every peer.
	const sanitised = sanitiseName(raw);
	if (sanitised === null) return { kind: "refused", reason: "empty", requested: raw };
	const key = nameKey(sanitised);
	if (RESERVED_NAMES.has(key) || extraReserved.has(key)) {
		return { kind: "refused", reason: "reserved", requested: sanitised };
	}
	if (key !== nameKey(current) && isTaken(key)) {
		return { kind: "refused", reason: "taken", requested: sanitised };
	}
	return { kind: "renamed", from: current, to: sanitised };
}
