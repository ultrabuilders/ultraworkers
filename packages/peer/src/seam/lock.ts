/**
 * `registerPeerLockBackend` — the fallback-shaped seam.
 *
 * ## Why this one is NOT provider-shaped
 *
 * The transport beside this file lets an extension replace core outright and
 * takes the built-in back on unregister. Locking cannot work that way, and the
 * reason is the shape of the decision rather than a preference:
 *
 * - **A transport is a total replacement.** If the extension's transport breaks,
 * * every* message is affected, so "full custom with a defined exit" is the
 *   right trade — the user asked for it and can undo it.
 * - **Locking is a refusal-shaped decision.** The common case is an extension
 *   saying *"on my machine that file is fine"* — not *"I will do all locking
 *   myself"*. A provider-shaped seam would hand over the lease store, the fence
 *   counter, and every guarantee §5.2a makes about them, in exchange for a
 *   capability most callers do not want.
 *
 * So the division of labour is the one `registerFileWriteFallback` already
 * documents (`packages/coding-agent/src/tools/file-write-fallback.ts:259`): core
 * keeps ownership, the handler *"brokers `req.content` to `req.dst`"* rather than
 * becoming the file system. Here core keeps the lease, and a registered backend
 * is asked only what a **denied** claim means.
 *
 * ## Order is the contract
 *
 * `acquireLease` runs first, always, and its answer is authoritative. A backend
 * is consulted for a claim core has already refused — it is a second opinion on a
 * denial, not a pre-emptive vote. A backend that could pre-empt the store would
 * be the provider shape wearing this file's name, and the difference is exactly
 * the safety property: {@link resolveLockDecision} can only ever return "denied,
 * and here is what the extension said about it" or "denied, and here is core's
 * reason". It cannot return an allow.
 */

import type { AcquireOptions, AcquireResult, Lease } from "../lease/index";

/** Why a claim was refused, handed to a backend for a second opinion. */
export interface LockDenial {
	/** The path pattern the caller tried to claim. */
	readonly pathPattern: string;
	/** Leases that blocked it. Never empty — core does not consult a backend for a claim that succeeded. */
	readonly conflicts: readonly Lease[];
	/** Options the caller passed, so a backend can reason about exclusivity and TTL. */
	readonly request: AcquireOptions;
}

/**
 * What a backend says about a denial.
 *
 * `honour` is the default-shaped answer and means "core's refusal stands". A
 * backend that has nothing to add returns `undefined` rather than a verdict, so
 * "no opinion" and "opinion: uphold" cannot be confused by a caller that forgets
 * to check.
 */
export interface LockBackendOpinion {
	/**
	 * False to uphold core's refusal, with a reason a holder can act on.
	 *
	 * There is deliberately NO `true`. An extension cannot grant a claim the lease
	 * store refused, because granting one is what makes two agents believe they
	 * own a path — the exact failure the fence token exists to make detectable, and
	 * the one §5.2a's guarantees are about. An extension may explain a denial
	 * better, or name a holder, or declare one stale; it may not hand out the
	 * path.
	 */
	readonly grant: false;
	/** Overrides the message the holder sees. Should name what to do next. */
	readonly reason: string;
	/** The lease the backend believes is the real blocker, when it can tell. */
	readonly blames?: Lease;
}

/** A replacement for how a refused claim is explained. */
export interface PeerLockBackend {
	readonly id: string;
	/**
	 * Called only for a claim core refused. Returning `undefined` means "no
	 * opinion" and leaves the denial untouched.
	 *
	 * Not async-forbidden and not async-required: it takes no I/O in the common
	 * case (the answer is in `denial.conflicts`), so a synchronous signature keeps
	 * a network call from being the obvious way to write it. A backend that does
	 * need to ask something must resolve it before returning.
	 */
	explain(denial: LockDenial): LockBackendOpinion | undefined;
}

/**
 * Registrations, consulted in order.
 *
 * A list rather than a single slot, copying `addFileWriteFallback`'s array: two
 * extensions may both have an opinion about a Windows permission boundary, and
 * first-match-wins gives a deterministic answer without either of them having to
 * know about the other.
 */
const backends: PeerLockBackend[] = [];

/**
 * Register a backend. Returns a disposer that removes this exact registration,
 * copied from `addFileWriteFallback` (`file-write-fallback.ts:241`).
 *
 * A disposer rather than an id for the reason the fallback uses: the runner calls
 * it on session shutdown so no handler outlives its session. An unregister-by-id
 * cannot be made safe against a re-registration of the same id, and this registry
 * has the same lifetime question.
 */
export function registerPeerLockBackend(backend: PeerLockBackend): () => void {
	backends.push(backend);
	return () => {
		const index = backends.indexOf(backend);
		if (index !== -1) backends.splice(index, 1);
	};
}

/** Whether any backend is registered. Lets a caller skip work only this seam needs. */
export function hasPeerLockBackend(): boolean {
	return backends.length > 0;
}

/** Which backend spoke, and what it said. */
export interface LockExplanation {
	readonly backendId: string;
	readonly reason: string;
	readonly blames?: Lease;
}

/**
 * Core's verdict, with any backend's second opinion beside it.
 *
 * `result` is core's value, passed through **by identity** — this function never
 * constructs one. That is what makes "a backend cannot grant a claim" a property
 * of the type rather than of a review: there is no branch anywhere below that
 * produces an `AcquireResult`, so unlocking a path core is holding is not a state
 * this function can reach. It would take a rewrite of the signature, which is the
 * level at which the argument should happen.
 *
 * Deliberately not a widened `AcquireResult`. That type is core's and is consumed
 * by `tools/register.ts`'s `peer.lock`, and adding an optional field to it would
 * make "is there an explanation?" a question every existing reader now has to
 * answer. Keeping the explanation beside the verdict means a caller that does not
 * know about extensions is unaffected by them.
 */
export interface LockDecision {
	readonly result: AcquireResult;
	readonly explanation?: LockExplanation;
}

/**
 * Ask the registered backends about a refusal, in registration order.
 *
 * First opinion wins. Not last, and not "all must agree": a second backend
 * overriding an explanation would make the message depend on load order, and the
 * first-registered extension is the one that was installed earliest — which is the
 * same ordering `file-write-fallback.ts` uses for the write path.
 */
export function consultLockBackends(denial: LockDenial): LockExplanation | undefined {
	for (const backend of backends) {
		const opinion = backend.explain(denial);
		if (opinion !== undefined) return { backendId: backend.id, reason: opinion.reason, blames: opinion.blames };
	}
	return undefined;
}

/**
 * Fold the backends' second opinion into a refusal, if there is one.
 *
 * A successful acquire is returned untouched and no backend is consulted: a
 * backend exists to explain a denial, and asking one to bless a success would
 * give it a veto over claims it has no stake in.
 */
export function resolveLockDecision(result: AcquireResult, request: AcquireOptions): LockDecision {
	if (result.ok || !hasPeerLockBackend()) return { result };

	const explanation = consultLockBackends({
		pathPattern: request.pathPattern,
		conflicts: result.conflicts,
		request,
	});
	return explanation === undefined ? { result } : { result, explanation };
}
