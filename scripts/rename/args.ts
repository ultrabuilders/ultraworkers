/**
 * One argv contract for every gate under `scripts/rename`.
 *
 * The defect this exists to close: a gate that reads only the arguments it knows
 * about cannot tell "you asked me nothing" from "you asked me something I did not
 * understand". `--gate0`, documented in `MILESTONE_5_EXECUTION_PLAN.md` as W8b's
 * Gate 0, was never an argument `check-disposition.ts` read, so it fell through to
 * the `pre` default and the gate answered a different question while returning a
 * plausible exit code. A reader who ran `--gate0` believed they had asked whether
 * the table exists; they were handed the whole pre-sweep instead.
 *
 * `--stage=sideways` was already rejected, which is why this bug is easy to miss:
 * the wrong *value* has a place to go red, but the wrong *name* did not. Rejecting
 * every unrecognised argument makes the two the same case, so a typo cannot be
 * mistaken for an omission.
 *
 * Every gate routes its result through this, so a new gate is protected by
 * importing it rather than by remembering to.
 */

/** What a gate accepts on its command line. */
export interface ArgSpec {
	/**
	 * Accepted flag prefixes. A `--`-prefixed argument is legal only if it starts
	 * with one of these; the value after the prefix is the gate's own business.
	 */
	readonly flags?: readonly string[];
	/** How many bare (non-`--`) arguments the gate accepts. Defaults to 0. */
	readonly positionals?: number;
}

/** Either the accepted arguments, or the reason to refuse the command line. */
export type ArgRead =
	| { readonly ok: true; readonly positionals: readonly string[] }
	| { readonly ok: false; readonly message: string };

/**
 * Classify `argv` (already stripped of the interpreter and script path) against `spec`.
 *
 * Rejects rather than defaults on anything unrecognised. The message names what was
 * accepted so the caller does not have to go looking for it.
 */
export function readGateArgs(argv: readonly string[], spec: ArgSpec = {}): ArgRead {
	const flags = spec.flags ?? [];
	const maxPositionals = spec.positionals ?? 0;
	const positionals: string[] = [];

	for (const arg of argv) {
		if (arg.startsWith("-")) {
			if (!flags.some(flag => arg.startsWith(flag))) {
				const parts: string[] = [];
				if (flags.length > 0) parts.push(flags.map(flag => JSON.stringify(`${flag}<value>`)).join(" or "));
				// A gate that takes a path still takes one after this refusal, so the
				// message has to say so — otherwise the reader assumes there is no way
				// to point it at a tree, which is not true.
				if (maxPositionals > 0) parts.push(`a path argument (${maxPositionals} max)`);
				return {
					ok: false,
					message: `unknown flag ${JSON.stringify(arg)}; accepted: ${parts.length > 0 ? parts.join(" or ") : "no arguments"}`,
				};
			}
			continue;
		}
		if (positionals.length >= maxPositionals) {
			const accepted = maxPositionals > 0 ? `a path argument (${maxPositionals} max)` : "no arguments";
			return {
				ok: false,
				message: `unexpected argument ${JSON.stringify(arg)}; accepted: ${accepted}`,
			};
		}
		positionals.push(arg);
	}

	return { ok: true, positionals };
}

/** Narrowing helper so callers do not each re-implement the exit-code convention. */
export function readGateArgsOrExit(argv: readonly string[], spec: ArgSpec = {}): string[] {
	const read = readGateArgs(argv, spec);
	if (!read.ok) {
		console.error(read.message);
		process.exit(2);
	}
	return [...read.positionals];
}
