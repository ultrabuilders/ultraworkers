/**
 * IrcBus - Process-global mailbox bus for agent-to-agent messaging.
 *
 * Replaces the old auto-reply model: a `send` never blocks on the recipient
 * generating anything. Delivery resolves the recipient via the global
 * AgentRegistry — parked agents are revived through the
 * AgentLifecycleManager, idle agents are woken with a real turn, and busy
 * agents receive the message as a non-interrupting aside at the next step
 * boundary (see AgentSession.deliverIrcMessage).
 */

import { type IrcDeliveryReceipt, type IrcMessage } from "@oh-my-pi/pi-tui/tools/irc";
import { logger, Snowflake } from "@oh-my-pi/pi-utils";
import { AgentLifecycleManager } from "../registry/agent-lifecycle";
import { AgentRegistry, MAIN_AGENT_ID } from "../registry/agent-registry";
import type { CustomMessage } from "../session/messages";

interface IrcWaiter {
	from?: string;
	resolve: (msg: IrcMessage) => void;
	cancel: () => void;
}

/** Mailbox cap per agent; oldest messages are dropped beyond it. */
const MAILBOX_CAP = 100;

/**
 * The three legal inbound policies.
 *
 * DECLARED HERE RATHER THAN IMPORTED from `@ultraworkers/peer`, and the
 * duplication is deliberate for the reason `peer/settings.ts:9-19` gives: the
 * peer package already depends on this one, so importing the fence across that
 * edge closes a cycle. The fence itself is injected as a FUNCTION below for the
 * same reason — this package never names the peer's types.
 *
 * `packages/peer/test/fence-policy.test.ts` asserts the two lists agree from the
 * peer's side, so a drift here fails a test rather than producing a settings
 * panel whose values the fence rejects.
 */
export const IRC_INBOUND_POLICIES = ["accept", "hold", "refuse"] as const;

export type IrcInboundPolicy = (typeof IRC_INBOUND_POLICIES)[number];

/**
 * What a wired fence decided about one inbound message.
 *
 * Structurally compatible with the peer's `InboundDecision`, declared separately
 * for the same anti-cycle reason. `hold` and `refuse` both carry a `reason`
 * because a refusal nobody can explain is one nobody can act on — and the two must
 * be distinguishable, since one buffers for review and the other does not.
 */
export type IrcFenceDecision =
	| { readonly action: "accept" }
	| { readonly action: "hold"; readonly reason: string }
	| { readonly action: "refuse"; readonly reason: string };

/** The message, as the fence sees it. */
export interface IrcFenceMessage {
	readonly from: string;
	readonly chain?: readonly string[];
	readonly fromMode?: string;
	readonly selfSent?: boolean;
}

/** The receiving side, as the fence sees it. */
export interface IrcFenceReceiver {
	readonly policy?: IrcInboundPolicy;
	readonly policySource?: "user" | "managed" | "repo" | "flag";
	readonly mode: string;
	readonly killSwitch?: boolean;
	readonly isBypassPermissionsModeAvailable?: boolean;
	readonly ownTokens?: ReadonlySet<string>;
}

/**
 * The fence itself, injected.
 *
 * `fenceInbound` from `@ultraworkers/peer` satisfies this signature. Taking it
 * as a parameter rather than importing it is what keeps the dependency edge
 * pointing one way — the peer package depends on THIS package, so an import here
 * would be a cycle — and it makes the wiring a decision a host makes visibly
 * rather than one this file makes invisibly.
 */
export type IrcFence = (message: IrcFenceMessage, receiver: IrcFenceReceiver) => IrcFenceDecision;

/**
 * Everything the trust fence needs, resolved per send.
 *
 * INJECTED, never read from global config inside the bus — the same reasoning as
 * the lifecycle accessor below. A bus that reached for settings itself would make
 * the fence untestable without a config fixture, and would make a second bus in
 * the same process unable to differ from the first.
 *
 * Omitting `fence` entirely means "this bus has no fence": messages are
 * delivered. That is a real, tested state rather than an accident — it is the
 * state this bus was in for its whole life, where `crossSessionInbound` was
 * declared with a full settings UI and read by nobody. A host that wants the
 * fence passes one; a host that does not is making a decision, and it should be
 * visible at the construction site.
 */
export interface IrcFenceContext {
	/**
	 * The fence to consult. Omit to deliver unfenced.
	 *
	 * MUTABLE, unlike every other field here, and that asymmetry is deliberate: a
	 * host holds one context object for the life of the process and rewrites this
	 * field when the user changes the setting. `readonly` would force a rebuild of
	 * the bus to change a policy, which is the bug the per-send accessor exists to
	 * prevent — the object is captured once and re-read on every delivery.
	 */
	fence?: IrcFence;
	/** What the receiving USER chose. `undefined` is NOT `accept`. */
	readonly policy?: IrcInboundPolicy;
	/** Which settings layer decided `policy`, so a held message can name it. */
	readonly policySource?: IrcFenceReceiver["policySource"];
	/** The receiver's own permission mode, for the class comparison. */
	readonly mode?: string;
	/** Emergency stop, consulted ahead of the user's own setting. */
	readonly killSwitch?: boolean;
	/** Whether this build even offers `bypassPermissions`. */
	readonly isBypassPermissionsModeAvailable?: boolean;
	/** The receiver's own tokens, for the hop-loop check. */
	readonly ownTokens?: ReadonlySet<string>;
	/** Overrides for the sender side of the message, when the transport carries them. */
	readonly sender?: {
		readonly fromMode?: string;
		readonly chain?: readonly string[];
		readonly selfSent?: boolean;
	};
}

export class IrcBus {
	static #global: IrcBus | undefined;

	static global(): IrcBus {
		if (!IrcBus.#global) {
			IrcBus.#global = new IrcBus();
		}
		return IrcBus.#global;
	}

	/** Reset the global bus. Test-only. */
	static resetGlobalForTests(): void {
		IrcBus.#global = undefined;
	}

	readonly #registry: AgentRegistry;
	readonly #lifecycle: () => AgentLifecycleManager;
	readonly #fence: () => IrcFenceContext | undefined;
	readonly #mailboxes = new Map<string, IrcMessage[]>();
	readonly #waiters = new Map<string, IrcWaiter[]>();
	/** Timestamp of the latest successful send per `from` → `to`; see {@link sentSince}. */
	readonly #lastSent = new Map<string, Map<string, number>>();

	constructor(
		registry: AgentRegistry = AgentRegistry.global(),
		lifecycle?: AgentLifecycleManager,
		fence?: () => IrcFenceContext | undefined,
	) {
		this.#registry = registry;
		// Lazy: the lifecycle global self-constructs against the global registry,
		// so only touch it when a parked recipient actually needs reviving.
		this.#lifecycle = () => lifecycle ?? AgentLifecycleManager.global();
		// Resolved per send, never captured: a settings change must take effect on
		// the next message, and a bus built at startup outlives every settings edit
		// a user makes in a session.
		this.#fence = fence ?? (() => undefined);
	}

	/**
	 * Fire-and-forget delivery. Never blocks on the recipient generating
	 * anything: the receipt reports how the message reached the recipient
	 * (waiter/aside = "injected", idle wake = "woken", park revival =
	 * "revived"), not what they did with it.
	 *
	 * Mailbox semantics: a successfully delivered message never lingers in
	 * the recipient's mailbox — injection/wake puts the full body into their
	 * context, so buffering it too would double-deliver via a later
	 * `wait`/`inbox` and inflate unread counts. Only a failed live hand-off
	 * is buffered for the recipient to drain later.
	 *
	 * `opts.suppressRelay` skips the display-only main-UI relay for this leg.
	 * Set by broadcast fan-out when the same broadcast also targets the main
	 * agent directly: the main agent then already sees the body as its own
	 * incoming card, so relaying the sibling legs would duplicate it.
	 */
	async send(msg: Omit<IrcMessage, "id" | "ts">, opts?: { suppressRelay?: boolean }): Promise<IrcDeliveryReceipt> {
		const message: IrcMessage = { ...msg, id: Snowflake.next(), ts: Date.now() };
		const receipt = await this.#deliver(message, opts);
		if (receipt.outcome !== "failed") {
			let sent = this.#lastSent.get(message.from);
			if (!sent) {
				sent = new Map();
				this.#lastSent.set(message.from, sent);
			}
			sent.set(message.to, message.ts);
		}
		return receipt;
	}

	/**
	 * Whether `from` successfully sent `to` anything at or after `sinceTs`.
	 * The wake-turn relay uses it to skip agents that already answered their
	 * waker themselves.
	 */
	sentSince(from: string, to: string, sinceTs: number): boolean {
		const ts = this.#lastSent.get(from)?.get(to);
		return ts !== undefined && ts >= sinceTs;
	}

	async #deliver(message: IrcMessage, opts?: { suppressRelay?: boolean }): Promise<IrcDeliveryReceipt> {
		// THE FENCE, consulted before any recipient work.
		//
		// Placement is the whole design: ahead of the registry lookup, the abort
		// check, and the lifecycle gate, because all three of those are EFFECTS. A
		// `refuse` that first revived a parked peer would wake a machine to deliver
		// a message the user decided not to receive, and the wake is the expensive
		// irreversible part — the refusal is cheap to undo precisely because nothing
		// has happened yet.
		//
		// Absent a wired context there is no fence and the message is delivered,
		// which is the honest behaviour for a host that has not opted in — and NOT
		// the same as a wired `accept`. See {@link IrcFenceContext}.
		const context = this.#fence();
		if (context?.fence !== undefined) {
			const decision = context.fence(
				{
					from: message.from,
					// NOT passed, and deliberately: `IrcMessage` carries no attribution
					// field, so a sender has nothing to claim here. The fence still has
					// the parameter because the WIRE may grow one, and its rule — record
					// it, never honour it — is asserted directly in `fence.test.ts`.
					//
					// Inventing a value here would be worse than omitting it: a
					// synthesised claim would be indistinguishable from one a peer
					// actually sent, which is exactly the confusion the field exists to
					// prevent.
					chain: context.sender?.chain,
					fromMode: context.sender?.fromMode,
					selfSent: context.sender?.selfSent,
				},
				{
					killSwitch: context.killSwitch,
					policy: context.policy,
					policySource: context.policySource,
					// `default` rather than a required field: an omitted mode must not
					// become a reason to skip the fence, and `default` is the
					// fence's own fail-closed prompting class.
					mode: context.mode ?? "default",
					isBypassPermissionsModeAvailable: context.isBypassPermissionsModeAvailable,
					ownTokens: context.ownTokens,
				},
			);

			if (decision.action === "refuse") {
				// `failed`, and NOT buffered: a refusal is the receiver declining, so
				// enqueueing it would put the message in the very mailbox the user
				// closed, and a later `wait` would drain it as if it had been
				// accepted. The sender is told why rather than asked to reconsider —
				// that would turn the user's decision into a negotiation.
				return { to: message.to, outcome: "failed", error: decision.reason };
			}
			if (decision.action === "hold") {
				// Held is a refusal to ACT, not to receive. Buffering is the whole
				// point of `hold` — the message stays visible for review — so this
				// enqueues and reports `failed`, matching how a buffered hand-off
				// already reports at the catch below. The reason is what distinguishes
				// a hold from a plain failure to a reader.
				this.#enqueue(message);
				return { to: message.to, outcome: "failed", error: decision.reason };
			}
		}

		const ref = this.#registry.get(message.to);
		if (!ref) {
			return {
				to: message.to,
				outcome: "failed",
				error: `Unknown agent "${message.to}" — check the subagent roster or read history:// for known peers.`,
			};
		}
		if (ref.status === "aborted") {
			return {
				to: message.to,
				outcome: "failed",
				error: `Agent "${message.to}" was hard-aborted and cannot be messaged or revived. Its transcript remains readable at history://${message.to}.`,
			};
		}
		// Advisor refs are observability-only transcripts, never messageable peers.
		if (ref.kind === "advisor") {
			return {
				to: message.to,
				outcome: "failed",
				error: `Agent "${message.to}" is a read-only advisor transcript and cannot be messaged.`,
			};
		}

		// A `parked` recipient always needs the lifecycle to revive it — this is
		// read from *this* bus's registry, so it holds for any registry. The
		// mid-park / adopted checks below query the lifecycle's own state, which
		// only describes the registry it manages: consult them only when the
		// lifecycle owns this bus's registry, otherwise a custom-registry bus
		// (fallen back to the global manager) would gate a live recipient on
		// unrelated global park state. Main/non-adopted live peers skip the gate,
		// and pending waiters still win without a session.
		const lifecycle = this.#lifecycle();
		const lifecycleOwnsRegistry = lifecycle.manages(this.#registry);
		const needsLifecycleGate =
			ref.status === "parked" ||
			(lifecycleOwnsRegistry && (lifecycle.isParking(message.to) || lifecycle.has(message.to)));

		const priorSession = ref.session;
		let revived = false;
		if (needsLifecycleGate) {
			try {
				const liveSession = await lifecycle.ensureLive(message.to);
				// Revival = we did not keep the same live instance (parked start, or
				// park completed and a fresh session was rebuilt).
				revived = !priorSession || liveSession !== priorSession;
			} catch (error) {
				// Not revivable / released / revive failed. Do not buffer: a permanent
				// failure must not inflate unread counts or pretend delivery is pending.
				return {
					to: message.to,
					outcome: "failed",
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}

		// A pending `wait` from the recipient consumes the message directly —
		// it is returned from their irc tool call and never hits the inbox or
		// the session injection path.
		const waiter = this.#takeMatchingWaiter(message.to, message.from);
		if (waiter) {
			waiter.resolve(message);
			if (!opts?.suppressRelay) this.#relayToMainUi(message);
			return { to: message.to, outcome: revived ? "revived" : "injected" };
		}

		const session = this.#registry.get(message.to)?.session;
		if (!session) {
			return { to: message.to, outcome: "failed", error: `Agent "${message.to}" has no live session.` };
		}

		try {
			const delivery = await session.deliverIrcMessage(message);
			if (!opts?.suppressRelay) this.#relayToMainUi(message);
			return { to: message.to, outcome: revived ? "revived" : delivery };
		} catch (error) {
			// Live hand-off failed (e.g. recipient disposed mid-shutdown): buffer
			// the message so a later `wait`/`inbox` from the recipient can still
			// pick it up. The receipt stays "failed" — the recipient has not
			// seen it.
			this.#enqueue(message);
			return {
				to: message.to,
				outcome: "failed",
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Block until a message for `agentId` (optionally from `filter.from`)
	 * arrives; consume + return it. Null on timeout (`timeoutMs <= 0` waits
	 * forever). Rejects when `signal` aborts. By default, already-buffered
	 * mail satisfies the wait before parking a future waiter; callers that
	 * need a strictly future reply can disable that drain.
	 */
	async wait(
		agentId: string,
		filter: { from?: string },
		timeoutMs: number,
		signal?: AbortSignal,
		options?: {
			drainPending?: boolean;
			liveness?: { registry: AgentRegistry; senderId: string };
		},
	): Promise<IrcMessage | null> {
		if (signal?.aborted) {
			throw signal.reason instanceof Error ? signal.reason : new Error("IRC wait aborted");
		}

		if (options?.drainPending !== false) {
			// Already-pending mail satisfies the wait without parking a waiter.
			const pending = this.#takeFromMailbox(agentId, filter.from);
			if (pending) return pending;
		}

		const { promise, resolve, reject } = Promise.withResolvers<IrcMessage | null>();
		let timer: NodeJS.Timeout | undefined;
		let onAbort: (() => void) | undefined;
		let unsubscribeLiveness: (() => void) | undefined;

		const liveness = options?.liveness;
		const livenessReason = filter.from
			? `IRC wait aborted: agent "${filter.from}" is not running`
			: "IRC wait aborted: no running peers remain";

		const settle = (
			outcome: { kind: "message"; msg: IrcMessage } | { kind: "timeout" } | { kind: "abort"; error: Error },
		): void => {
			cleanup();
			if (outcome.kind === "message") {
				resolve(outcome.msg);
			} else if (outcome.kind === "timeout") {
				resolve(null);
			} else {
				reject(outcome.error);
			}
		};

		const cleanup = (): void => {
			this.#removeWaiter(agentId, waiter);
			clearTimeout(timer);
			if (signal && onAbort) signal.removeEventListener("abort", onAbort);
			unsubscribeLiveness?.();
		};

		const waiter: IrcWaiter = {
			from: filter.from,
			resolve: msg => settle({ kind: "message", msg }),
			cancel: () => cleanup(),
		};

		if (signal) {
			onAbort = () =>
				settle({
					kind: "abort",
					error: signal.reason instanceof Error ? signal.reason : new Error("IRC wait aborted"),
				});
			signal.addEventListener("abort", onAbort, { once: true });
		}
		if (timeoutMs > 0) {
			timer = setTimeout(() => settle({ kind: "timeout" }), timeoutMs);
			timer.unref?.();
		}

		let waiters = this.#waiters.get(agentId);
		if (!waiters) {
			waiters = [];
			this.#waiters.set(agentId, waiters);
		}
		waiters.push(waiter);

		if (liveness) {
			const { registry, senderId } = liveness;
			const hasRunningSender = (from?: string): boolean =>
				registry.listVisibleTo(senderId).some(ref => registry.isRunning(ref) && (!from || ref.id === from));
			const check = filter.from ? () => hasRunningSender(filter.from) : () => hasRunningSender();
			unsubscribeLiveness = registry.onChange(() => {
				if (!check()) {
					settle({ kind: "abort", error: new Error(livenessReason) });
				}
			});
			if (!check()) {
				settle({ kind: "abort", error: new Error(livenessReason) });
			}
		}

		return promise;
	}

	/**
	 * Consume the OLDEST pending message for `agentId` (optionally restricted
	 * to `from`), leaving the rest of the mailbox intact. This is the exact
	 * atomic step `wait` performs on entry, exposed for callers that must not
	 * block without draining the entire backlog.
	 */
	take(agentId: string, from?: string): IrcMessage | undefined {
		return this.#takeFromMailbox(agentId, from);
	}

	/** Unread count for the local Agent Hub overlay. */
	unreadCount(agentId: string): number {
		return this.#mailboxes.get(agentId)?.length ?? 0;
	}

	#enqueue(message: IrcMessage): void {
		let mailbox = this.#mailboxes.get(message.to);
		if (!mailbox) {
			mailbox = [];
			this.#mailboxes.set(message.to, mailbox);
		}
		mailbox.push(message);
		if (mailbox.length > MAILBOX_CAP) {
			const dropped = mailbox.shift();
			logger.debug("IrcBus: mailbox full, dropped oldest message", {
				agentId: message.to,
				droppedId: dropped?.id,
				droppedFrom: dropped?.from,
			});
		}
	}

	/** Resolve the OLDEST waiter for `agentId` whose from-filter accepts `from`. */
	#takeMatchingWaiter(agentId: string, from: string): IrcWaiter | undefined {
		const waiters = this.#waiters.get(agentId);
		if (!waiters) return undefined;
		const index = waiters.findIndex(waiter => !waiter.from || waiter.from === from);
		if (index === -1) return undefined;
		const [waiter] = waiters.splice(index, 1);
		if (waiters.length === 0) this.#waiters.delete(agentId);
		return waiter;
	}

	#removeWaiter(agentId: string, waiter: IrcWaiter): void {
		const waiters = this.#waiters.get(agentId);
		if (!waiters) return;
		const index = waiters.indexOf(waiter);
		if (index !== -1) waiters.splice(index, 1);
		if (waiters.length === 0) this.#waiters.delete(agentId);
	}

	#takeFromMailbox(agentId: string, from?: string): IrcMessage | undefined {
		const mailbox = this.#mailboxes.get(agentId);
		if (!mailbox) return undefined;
		const index = from ? mailbox.findIndex(msg => msg.from === from) : 0;
		if (index === -1 || mailbox.length === 0) return undefined;
		const [message] = mailbox.splice(index, 1);
		if (mailbox.length === 0) this.#mailboxes.delete(agentId);
		return message;
	}

	/**
	 * Surface agent↔agent traffic as a display-only card on the main session
	 * UI. Skipped when the main agent is either endpoint: as recipient its
	 * own `deliverIrcMessage` (or `wait` tool result) already shows the
	 * message, and as sender the irc send tool call already rendered the
	 * outbound body — relaying it again would duplicate it in the transcript.
	 */
	#relayToMainUi(message: IrcMessage): void {
		if (message.to === MAIN_AGENT_ID || message.from === MAIN_AGENT_ID) return;
		const mainSession = this.#registry.get(MAIN_AGENT_ID)?.session;
		if (!mainSession) return;
		const record: CustomMessage = {
			role: "custom",
			customType: "irc:relay",
			content: `[IRC \`${message.from}\` → \`${message.to}\`]\n\n${message.body}`,
			display: true,
			details: { from: message.from, to: message.to, body: message.body },
			attribution: "agent",
			timestamp: message.ts,
		};
		try {
			mainSession.emitIrcRelayObservation(record);
		} catch (error) {
			// Display-only forwarding must never affect delivery semantics.
			logger.debug("IrcBus: main UI relay failed", { to: message.to, error: String(error) });
		}
	}
}
