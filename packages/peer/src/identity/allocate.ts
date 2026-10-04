import { ADJECTIVES, NAME_SPACE_SIZE, NOUNS } from "./names";

/**
 * Names that a peer may not take.
 *
 * `user` is the impersonation that actually misleads: a transcript that reads
 * as though the human said it. `system` implies infrastructure authority. Both
 * are refused regardless of how they were spelled, because the point is the
 * label a reader sees, not the bytes behind it.
 *
 * This is the one piece of the original role-free property that survives
 * `/rename` taking arbitrary strings.
 */
export const RESERVED_NAMES: ReadonlySet<string> = new Set(["user", "system"]);

/** Case-folded, because `BlueLake` and `bluelake` are one owner on NTFS. */
export function nameKey(name: string): string {
	return name.toLowerCase();
}

/**
 * A name drawn from the closed space, and the two values that identify it.
 *
 * `instanceId` is the identity a message is attributed to; the name is a label
 * and a routing address. Lease ownership stores `instanceId` and never the
 * name, precisely because `/rename` can change the name while a claim is live.
 */
export interface PeerName {
	readonly name: string;
	readonly instanceId: string;
}

/** Raised when the closed space is exhausted — a finite, measurable event. */
export class NameSpaceExhaustedError extends Error {
	constructor(readonly attempted: number) {
		super(`peer name space exhausted after ${attempted} allocations (${NAME_SPACE_SIZE} names)`);
		this.name = "NameSpaceExhaustedError";
	}
}

export type IsTaken = (candidate: string) => boolean;

/**
 * Draw names from the cross product, skipping any the caller already holds.
 *
 * `isTaken` is injected because uniqueness is the store's job, not this
 * function's: the same check has to run inside the allocation lock, and a
 * second implementation here would be free to drift from it.
 */
export function* allocateNames(isTaken: IsTaken): Generator<string> {
	for (const adjective of ADJECTIVES) {
		for (const noun of NOUNS) {
			const candidate = `${adjective}${capitalise(noun)}`;
			if (isTaken(candidate)) continue;
			yield candidate;
		}
	}
}

function capitalise(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Take the first free name, or fail loudly rather than reuse one. */
export function allocateName(instanceId: string, isTaken: IsTaken): PeerName {
	for (const name of allocateNames(isTaken)) {
		return { name, instanceId };
	}
	throw new NameSpaceExhaustedError(NAME_SPACE_SIZE);
}
