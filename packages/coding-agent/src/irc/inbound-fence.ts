/**
 * Where the trust fence comes from — and why the fence itself is NOT here.
 *
 * ## The measurement that produced this file
 *
 * `fenceInbound` lives in `@ultraworkers/peer` and is finished: 455 lines, eleven
 * tests, hop bounds read out of the Claude Code binary rather than assumed. The bus
 * side is finished too — `#deliver` (`irc/bus.ts:211-268`) consults a fence ahead of
 * the registry lookup, the abort check and the lifecycle revive, and handles all
 * three outcomes (`refuse` does not buffer, `hold` enqueues for review and reports
 * `failed`, `accept` falls through).
 *
 * Between those two finished halves there was nothing:
 *
 *     new IrcBus(              → irc/bus.ts:137 only, and it passes no fence
 *     IrcBus.global() callers → messaging.ts:66, wait.ts:52,226, executor.ts:2832,
 *                               cleanse/agent.ts:204, agent-hub-runtime.ts:39
 *
 * `IrcBus.global()` therefore had `#fence = () => undefined` and every production
 * send skipped the fence block outright. `crossSessionInbound` was a full settings
 * enum — three options, descriptions, a tab and a group — with zero readers.
 *
 * That is the failure this file exists to close: a subsystem that is correct, tested,
 * and never reached. A green `fence.test.ts` proved the fence works; it could not
 * prove anything about the product, because no product code called it.
 *
 * ## Why the fence stays a peer-side type
 *
 * `@ultraworkers/peer` already depends on `@oh-my-pi/pi-coding-agent`
 * (`packages/peer/package.json`), so importing `fenceInbound` here would close a
 * cycle. This file therefore declares the shape structurally and never names the
 * peer's types — the same decision `irc/bus.ts:26-56` already makes for the policy
 * enum and the decision union, with `packages/peer/test/fence-policy.test.ts`
 * asserting the vocabularies agree from the peer's side so a drift fails a test
 * instead of producing a settings panel whose values the fence rejects.
 *
 * ## Why the peer registers it rather than the host finding it
 *
 * The dependency edge points peer → coding-agent, so the only side that CAN hand
 * the fence over is the peer. Copying the shape of `irc/peer-transport.ts` (its
 * module-level registry, `add*` / `remove*` / `resolve*`, and the
 * `registerPeerTransport` surface on `ExtensionAPI`) means the peer installs its own
 * fence at extension-load time and the host never imports it.
 */

import { logger } from "@oh-my-pi/pi-utils";
import type { IrcFence, IrcFenceContext } from "./bus";

/**
 * The fence plus the receiver's own state, as one registration.
 *
 * The fence and the context travel together because a fence with no policy behind it
 * is the unfenced state wearing a fence's name: `fenceInbound` decides from the
 * receiver's policy, mode and token set, so a host that could register one without
 * the other would be able to build the mistake this file exists to prevent.
 */
export interface InboundFenceRegistration {
	readonly fence: IrcFence;
	/** Omit to deliver unfenced — a real state, not an accident. See {@link resolveInboundFenceContext}. */
	readonly context?: IrcFenceContext;
}

// Process-wide, matching `peer-transport.ts`: a fence serves every session in the
// process, not only the one that installed it. Module scope, not `#private` — that is
// class-member syntax and does not parse at module level.
let registered: InboundFenceRegistration | undefined;

/**
 * Install the fence. Called by the peer extension at load time.
 *
 * Returns the uninstall function, mirroring `addPeerTransport` /
 * `addFileWriteFallback`: last registration wins, and removing it restores the
 * unfenced state rather than leaving a stale closure behind a live bus.
 */
export function addInboundFence(registration: InboundFenceRegistration): () => void {
	registered = registration;
	return () => {
		if (registered === registration) registered = undefined;
	};
}

/**
 * The context in force, WITH the fence spliced in.
 *
 * The splice is load-bearing and easy to get wrong: `#deliver` reads
 * `context.fence` (`irc/bus.ts:230`), so handing it `registration.context` alone
 * would build a context with no fence in it — present, non-undefined, and therefore
 * passed the `context?.fence !== undefined` guard while never being consulted. A
 * fence that is installed and never called is precisely the bug this file was written
 * to close, reintroduced one layer down.
 *
 * The returned object is a fresh spread per send rather than the registered one, so a
 * caller mutating what it got back cannot rewrite the installation. Mutating the
 * INSTALLED context in place (what a settings edit does) still works, because the
 * spread reads it on every call.
 */
export function resolveInboundFenceContext(): IrcFenceContext | undefined {
	if (registered === undefined) return undefined;
	return { ...registered.context, fence: registered.fence };
}

/** Whether a fence is installed. Diagnostics only — the bus reads the context. */
export function hasInboundFence(): boolean {
	return registered !== undefined;
}

/**
 * Build the receiver context from the host's own settings.
 *
 * Split out from the fence because it is the half the HOST owns: the fence decides,
 * but the policy, the permission class and the token set are facts about the running
 * session, and none of them can arrive from a peer. A `crossSessionInbound` the user
 * never chose has to stay distinguishable from one they chose, so this reads the
 * setting rather than defaulting it — `undefined` is a fourth state here, not `accept`
 * (`peer/settings.ts` registers the enum with no `default:` for exactly this reason).
 *
 * `invalid` is surfaced rather than swallowed. A settings file carrying a value this
 * build cannot parse must HOLD inbound messages and say so, which is `policy.ts`'s
 * rule; reporting it lets the caller warn with the offending value instead of
 * silently delivering on the grounds that the typo lost a race.
 */
export function buildInboundFenceContext(sources: {
	/** The resolved `crossSessionInbound`, or `undefined` when unset. */
	readonly policy?: string;
	/** Which settings layer supplied `policy`, when one did. */
	readonly policySource?: IrcFenceContext["policySource"];
	/** This session's approval mode, mapped to the fence's vocabulary by the caller. */
	readonly mode: NonNullable<IrcFenceContext["mode"]>;
	/** The value this build could not parse, when a settings layer carried one. */
	readonly invalid?: { readonly source: string; readonly value: unknown };
}): IrcFenceContext {
	const context: IrcFenceContext = {
		policy: sources.policy as IrcFenceContext["policy"],
		policySource: sources.policySource,
		mode: sources.mode,
	};
	if (sources.invalid !== undefined) {
		// Fail CLOSED, and say why. An unparseable value must not fall through to the
		// permission-class comparison and land on `accept` by accident — that is the
		// same accident a repo setting loosening the policy would produce, reached by a
		// different route.
		logger.warn(
			`crossSessionInbound has an unrecognized value from ${sources.invalid.source}; holding inbound peer messages`,
			{
				value: sources.invalid.value,
			},
		);
		return { ...context, policy: "hold" };
	}
	return context;
}
