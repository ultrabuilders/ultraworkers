import * as os from "node:os";

/**
 * Is a peer process still there? Four signals, and only one of them is death.
 *
 * The ordering below is the whole contract: a POSITIVE liveness signal vetoes
 * every other signal. A machine asleep since last night looks exactly like a
 * machine that died yesterday — same stale socket, same old mtime — and a reaper
 * that acts on either of those will reap a session that is merely asleep. So
 * `ESRCH` is consulted, and if it does not fire the peer is alive regardless of
 * how dead its socket or how old its file looks.
 *
 * WHY `EPERM` IS NOT DEATH. `kill(pid, 0)` returns `EPERM` for a process that
 * EXISTS and belongs to another user. Treating that as death kills a live
 * machine on the first probe. It is the single most dangerous misreading this
 * module can make, and it is measured to occur on this machine: `kill(1, 0)`
 * returns `EPERM` here because pid 1 belongs to root.
 *
 * TWO OBSERVATIONS ARE NECESSARY AND NEVER SUFFICIENT. The "observe twice"
 * rule exists so one stale reading cannot reap a peer. It does not make a
 * repeated stale reading reaping either: agreement is a NECESSARY condition,
 * and `ESRCH` is the sufficient one. A process that answers on the second probe
 * has not been reaped no matter how many times a socket or an mtime complained
 * in between — because that is a peer that is busy or asleep, and both look
 * identical to a dead one from outside.
 */

/** What a single probe of one process can tell us. */
export type Liveness = { readonly alive: true } | { readonly alive: false; readonly reason: "gone" | "no-permission" };

/**
 * Probe one pid with signal 0, which sends no signal.
 *
 * `EPERM` is returned as `no-permission` — alive, observed from outside our
 * user. `ESRCH` is the only value that means gone. Anything else is a machine we
 * cannot read, and is reported as alive for the same reason: we did not see it
 * die.
 */
export function probePid(pid: number): Liveness {
	try {
		process.kill(pid, 0);
		return { alive: true };
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ESRCH") return { alive: false, reason: "gone" };
		// EPERM and anything unrecognised both mean "we cannot confirm death".
		return { alive: false, reason: "no-permission" };
	}
}

/** The four signals a registration carries. */
export interface PresenceSignals {
	readonly pid: number;
	/**
	 * Last time the peer wrote anything, in epoch ms.
	 *
	 * A proxy for "is it thinking", never for "is it alive" — a long-running
	 * tool call produces no output for minutes at a time.
	 */
	readonly lastSeenMs: number;
	/** Path of the socket or named pipe, if the peer listens on one. */
	readonly endpoint?: string;
}

/** Why a registration was judged stale. Every reap must be able to say which. */
export type StaleReason = "process-gone" | "no-permission" | "endpoint-failed" | "idle-too-long";

export interface StaleVerdict {
	readonly stale: boolean;
	readonly reasons: readonly StaleReason[];
	readonly observation: { readonly atMs: number; readonly probe: Liveness };
}

/** A registration observed earlier, kept so one signal cannot decide on its own. */
export interface PriorObservation {
	readonly atMs: number;
	readonly reasons: readonly StaleReason[];
}

export interface JudgeOptions {
	/**
	 * True when something that should only ever happen once has now happened
	 * twice — the "5 minutes apart" rule. Two observations separated in time are
	 * what separate a slow machine from a stopped one; one observation of a stale
	 * mtime is not enough, because a machine that was asleep produces exactly the
	 * same reading twice.
	 */
	readonly repeated: boolean;
	/** Injectable so a test can exercise the idle branch without sleeping. */
	readonly nowMs: number;
	/** How long a peer may go without writing before it looks idle. */
	readonly idleMs?: number;
	/** Probe the endpoint. Injected: a real probe is a syscall and a test needs a seam. */
	readonly probeEndpoint?: (endpoint: string) => boolean;
	readonly prior?: PriorObservation;
}

export const DEFAULT_IDLE_MS = 5 * 60 * 1000;

/**
 * Judge one registration. Only `ESRCH` reaps.
 *
 * The endpoint and mtime signals are recorded as *reasons* even when they do not
 * decide anything, because a reaper that cannot say why it acted forces the
 * caller to go measure — and the whole reason the reaper exists is to stop
 * callers from doing that.
 */
export function judgePresence(signals: PresenceSignals, options: JudgeOptions): StaleVerdict {
	const nowMs = options.nowMs;
	const liveness = probePid(signals.pid);
	const reasons: StaleReason[] = [];

	if (!liveness.alive) {
		// A positive liveness reading VETOES everything else. Only a pid we
		// positively confirmed gone is allowed to reap, and EPERM is not that.
		if (liveness.reason === "gone") {
			reasons.push("process-gone");
			return { stale: true, reasons, observation: { atMs: nowMs, probe: liveness } };
		}
		reasons.push("no-permission");
		return { stale: false, reasons, observation: { atMs: nowMs, probe: liveness } };
	}

	// Alive. Record what else looks wrong, without letting it decide.
	if (signals.endpoint !== undefined) {
		const probe = options.probeEndpoint ?? (() => true);
		if (!probe(signals.endpoint)) reasons.push("endpoint-failed");
	}
	const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
	if (nowMs - signals.lastSeenMs >= idleMs) reasons.push("idle-too-long");

	// One observation of a stale signal is not enough. A sleeping machine looks
	// identical to a stopped one, twice in a row.
	if (reasons.length > 0 && !options.repeated) {
		return { stale: false, reasons, observation: { atMs: nowMs, probe: liveness } };
	}
	return { stale: false, reasons, observation: { atMs: nowMs, probe: liveness } };
}

/**
 * A second observation, `atMs` later, that must agree before anything is reaped.
 *
 * Returned as its own function so the "twice" rule has one home. A caller that
 * inlines `repeated: true` has silently become the thing that kills a sleeping
 * laptop, and nothing at the call site would say so.
 */
export function observeAgain(
	signals: PresenceSignals,
	prior: StaleVerdict,
	options: Omit<JudgeOptions, "prior" | "repeated"> & { readonly repeated?: boolean },
): StaleVerdict {
	const first = judgePresence(signals, {
		...options,
		repeated: options.repeated ?? true,
		prior: { atMs: prior.observation.atMs, reasons: prior.reasons },
	});
	// A positive liveness reading ends it. Two agreeing complaints about a socket
	// and an mtime are still two complaints about a process that ANSWERED — which
	// is precisely the sleeping laptop, observed twice. Agreement is not enough;
	// the veto has to be re-applied here, or this function reintroduces the exact
	// failure `judgePresence` exists to prevent.
	if (first.observation.probe.alive) return { ...first, stale: false };

	// The confirmation has to be the SAME complaint. A peer that went from
	// "endpoint failed" to "idle too long" has produced two unrelated readings,
	// which is noise rather than agreement.
	const agrees = first.reasons.length > 0 && first.reasons.some(reason => prior.reasons.includes(reason));
	return { ...first, stale: agrees };
}

/** A registration as the reaper stores it, with room to remember what it saw. */
export interface Registration {
	readonly instanceId: string;
	readonly signals: PresenceSignals;
	readonly prior?: StaleVerdict;
}

/** A reaped registration, with the reason attached. A refusal without a reason sends the caller measuring. */
export interface ReapedRegistration {
	readonly instanceId: string;
	readonly reasons: readonly StaleReason[];
	readonly atMs: number;
}

/**
 * Select the registrations a reaper should act on this tick.
 *
 * Pure: it decides and reports, and does not touch the store. Acting is the
 * caller's decision, because a reaper that reaps and reports afterwards cannot
 * be reasoned about when it is wrong.
 */
export function selectReapable(
	registrations: readonly Registration[],
	options: {
		readonly nowMs: number;
		readonly idleMs?: number;
		readonly probeEndpoint?: (endpoint: string) => boolean;
	},
): ReapedRegistration[] {
	const out: ReapedRegistration[] = [];
	for (const registration of registrations) {
		const verdict = registration.prior
			? observeAgain(registration.signals, registration.prior, { ...options, repeated: true })
			: judgePresence(registration.signals, { ...options, repeated: false });
		if (verdict.stale) {
			out.push({ instanceId: registration.instanceId, reasons: verdict.reasons, atMs: options.nowMs });
		}
	}
	return out;
}

/** Host identity, for the registration's own record. Not a liveness signal. */
export function currentHost(): { readonly hostname: string; readonly platform: string; readonly uid: number } {
	return { hostname: os.hostname(), platform: process.platform, uid: os.userInfo().uid };
}
