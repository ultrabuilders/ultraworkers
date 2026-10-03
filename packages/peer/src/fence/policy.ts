/**
 * `crossSessionInbound` resolution across settings sources.
 *
 * ## WHY THIS IS NOT A PLAUMIBLE DEFAULT
 *
 * The obvious implementation is "read the key, use it, else `accept`". Every
 * part of that is wrong, and each failure is observable by a user rather than by
 * a test:
 *
 * - **A repo setting that loosens must not take effect.** A repository you just
 *   cloned must not be able to set your peer messages to `accept` when you chose
 *   `refuse`. The binary's fix is a restrictiveness ladder (`f`) and a walk that
 *   only ever raises the value: `if (f[s] > f[e ?? "accept"]) e = s`. A repo can
 *   tighten; it cannot loosen.
 * - **An unrecognised value must hold, not fall back.** If a settings file says
 *   `crossSessionInbound: "ask-me-later"` and the reader falls back to its
 *   default, the message is delivered or refused by an accident of which
 *   default won. The binary holds, and says so: *"A settings file has an
 *   unrecognized "crossSessionInbound" value … so messages are held while it is
 *   present."*
 * - **Unset is not `accept`.** See {@link resolveInboundPolicy}.
 *
 * Copied from the binary's `I()` (the precedence walk) and `F()` (the
 * invalid-value probe), both read from
 * `~/.local/share/claude/versions/2.1.288`.
 */

import { INBOUND_POLICIES, INBOUND_RESTRICTIVENESS, type InboundPolicy } from "./index";

/** Settings layers, ordered most-authoritative first. */
export type PolicySource = "managed" | "flag" | "user" | "repo";

/**
 * One layer's contribution: the raw config value, plus whether this build could
 * parse it.
 *
 * `parsed: false` is what makes a typo safe. It is deliberately separate from
 * `value: undefined` — an absent key and an unparseable key look identical
 * downstream unless the caller is told which happened, and they must decide
 * differently.
 */
export interface PolicyLayer {
	readonly source: PolicySource;
	readonly value: unknown;
}

/**
 * Whether the value is one this build knows.
 *
 * Membership in {@link INBOUND_POLICIES} rather than `value in
 * INBOUND_RESTRICTIVENESS`, because `in` walks the prototype chain: it would
 * report `"constructor"`, `"toString"` and `"valueOf"` as valid policies. That
 * is a fail-OPEN in the one place that must fail closed — a typo resolving to a
 * real policy is the failure this module exists to prevent, and `in` would hand
 * one out.
 */
export function isInboundPolicy(value: unknown): value is InboundPolicy {
	return typeof value === "string" && (INBOUND_POLICIES as readonly string[]).includes(value);
}

export interface ResolvedPolicy {
	/** The value in force, or `undefined` when no layer set one. */
	readonly value?: InboundPolicy;
	/** Which layer decided. `undefined` when nothing did. */
	readonly source?: PolicySource;
	/** Set when some layer carried a value this build could not parse. */
	readonly invalid?: { readonly source: PolicySource; readonly value: unknown };
}

/**
 * Resolve the policy from the layers, honouring precedence and the tighten-only
 * rule for repo settings.
 *
 * ## THE PRECEDENCE, and why each step is there
 *
 * Copied from the binary's `I()` step for step:
 *
 * 1. **`managed` → `flag` → `user`, first one that SETS a value wins.** An org
 *    policy outranks a local choice; a command-line flag outranks the file the
 *    user edits but not the org's policy. Stopping at the first setter rather
 *    than taking the most restrictive of the three is what makes the walk
 *    predictable — and it is safe because step 2 handles the only layer that is
 *    allowed to disagree.
 * 2. **Repo settings may only TIGHTEN.** A repo layer raises the value when it
 *    is more restrictive than what is already in force, and is otherwise ignored
 *    — including when the repo says `accept` and the user said `refuse`. It also
 *    cannot override a `managed` value at equal restrictiveness, so an org
 *    policy stays attributable to the org.
 * 3. **An unparseable value anywhere holds.** Reported through
 *    {@link ResolvedPolicy.invalid} so a caller can warn with the offending
 *    value instead of silently delivering messages.
 *
 * ## WHY UNSET IS NOT `accept`
 *
 * With no layer setting the key, this returns `{ value: undefined }` — NOT
 * `{ value: "accept" }`. The distinction is the whole design: `accept` is a
 * decision the user made, and manufacturing one out of an absent key means a
 * fresh install admits peer messages by default. `fenceInbound` treats unset as
 * "consult the permission classes instead", which is the binary's own fallback
 * (`H()`), and holds when that comparison cannot be made.
 */
export function resolveInboundPolicy(layers: readonly PolicyLayer[]): ResolvedPolicy {
	// Collapse duplicates of one source by taking the MOST RESTRICTIVE, not the
	// first-seen. "First wins" is order-dependent: the same config handed in a
	// different order resolved to `accept` in one direction and `refuse` in the
	// other, which is a bug report nobody can reproduce. The ladder gives a
	// commutative rule, so arrival order stops being an input.
	const bySource = new Map<PolicySource, PolicyLayer>();
	for (const layer of layers) {
		if (layer.value === undefined) continue;
		const held = bySource.get(layer.source);
		if (held === undefined) {
			bySource.set(layer.source, layer);
			continue;
		}
		const rank = (candidate: PolicyLayer): number =>
			isInboundPolicy(candidate.value) ? INBOUND_RESTRICTIVENESS[candidate.value] : -1;
		if (rank(layer) > rank(held)) bySource.set(layer.source, layer);
	}

	let invalid: ResolvedPolicy["invalid"];
	for (const layer of bySource.values()) {
		if (!isInboundPolicy(layer.value)) {
			invalid ??= { source: layer.source, value: layer.value };
		}
	}

	let value: InboundPolicy | undefined;
	let source: PolicySource | undefined;
	for (const candidate of ["managed", "flag", "user"] as const) {
		const layer = bySource.get(candidate);
		if (layer === undefined || !isInboundPolicy(layer.value)) continue;
		value = layer.value;
		source = candidate;
		break;
	}

	// Repo settings, from either repo-scoped file. Only a TIGHTER value applies.
	for (const layer of bySource.values()) {
		if (layer.source !== "repo" || !isInboundPolicy(layer.value)) continue;
		const current = INBOUND_RESTRICTIVENESS[value ?? "accept"];
		if (INBOUND_RESTRICTIVENESS[layer.value] > current) {
			value = layer.value;
			source = "repo";
		} else if (
			// Equally restrictive, but the repo is not allowed to claim an org policy's
			// decision: the message the user reads has to name a layer they can change.
			layer.value !== "accept" &&
			INBOUND_RESTRICTIVENESS[layer.value] === current &&
			source !== undefined &&
			source !== "managed"
		) {
			source = "repo";
		}
	}

	return invalid !== undefined ? { value, source, invalid } : { value, source };
}
