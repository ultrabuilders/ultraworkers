/**
 * Provenance survives a restart — `epic-jwsy.10`.
 *
 * WHY THIS FILE IS ABOUT THE DRAIN AND NOT THE WRITE. Marking a peer message at
 * delivery is easy and is not the risk. The risk is the round trip:
 * `drainInboxMessages` **rebuilds a fresh `IrcMessage` out of `record.details`**,
 * and a rebuilt message that loses its origin does not merely lose a field — it
 * reads back as a user instruction, because absence is the user case
 * (`isUserInstruction` returns true when `origin` is missing).
 *
 * That makes the failure a privilege escalation on the READ path, and it is the
 * kind that passes the obvious test: every message still arrives, the count is
 * right, and the drain "works". So the row here is not "the drain preserves
 * origin". It is **"a peer message drained after a restart is still not a user
 * instruction"** — which fails loudly, on an assertion, if the field is dropped.
 *
 * The records fed to `restorePending` are rebuilt into the shape
 * `appendCustomMessageEntry` actually persists (`customType`, `content`,
 * `display`, `details`, `attribution`, `timestamp`) rather than being handed
 * over whole. Handing them over whole would keep the top-level `origin` that
 * disk never had, and the test would pass against a bridge that loses it in
 * production.
 */

import { describe, expect, it } from "bun:test";
import type { Agent, AgentMessage } from "@oh-my-pi/pi-agent-core";
import { IrcBridge, type IrcBridgeHost } from "@oh-my-pi/pi-coding-agent/session/irc-bridge";
import type { CustomMessage } from "@oh-my-pi/pi-coding-agent/session/messages";
import type { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";

const RECIPIENT = "BlueLake";

/** The persisted-entry fields `appendCustomMessageEntry` writes. */
interface PersistedEntry {
	readonly customType: string;
	readonly content: string;
	readonly display: boolean;
	readonly details: Record<string, unknown>;
	readonly attribution: CustomMessage["attribution"];
	readonly timestamp: string;
}

/**
 * A host that records what reaches disk.
 *
 * `streaming` picks the branch that queues for drain — an in-flight turn pushes
 * the record onto the interrupt queue instead of opening a turn, which is the
 * path a message takes when the recipient is busy and then restarts.
 */
function harness(): {
	bridge: IrcBridge;
	persisted: PersistedEntry[];
} {
	const persisted: PersistedEntry[] = [];
	const agent = {
		steer: () => {},
		appendMessage: (_message: AgentMessage) => {},
	} as unknown as Agent;
	const host: IrcBridgeHost = {
		agent,
		sessionManager: {
			appendCustomMessageEntry: (
				customType: string,
				content: string,
				display: boolean,
				details: Record<string, unknown>,
				attribution: CustomMessage["attribution"],
				timestamp: string,
			) => {
				persisted.push({ customType, content, display, details, attribution, timestamp });
				return "entry-id";
			},
		} as unknown as SessionManager,
		isDisposed: () => false,
		isStreaming: () => true,
		planModeEnabled: () => false,
		emitSessionEvent: async () => {},
		wakeForIrc: () => {},
	};
	return { bridge: new IrcBridge(host), persisted };
}

/** Rebuild a queued record into the shape a session actually reads back. */
function asPersistedRecord(entry: PersistedEntry): CustomMessage {
	return {
		role: "custom",
		customType: entry.customType,
		content: entry.content,
		display: entry.display,
		details: entry.details,
		attribution: entry.attribution,
		timestamp: 0,
	};
}

/**
 * The reader's actual question, spelled out rather than imported.
 *
 * `@ultraworkers/peer` owns `isUserInstruction`, and importing it here would
 * close the package cycle its own `settings.ts` documents. So the rule is
 * restated: a record is a peer message only when it says so.
 */
function readsAsUserInstruction(record: object): boolean {
	const origin = (record as { origin?: { kind?: unknown } }).origin;
	return origin?.kind !== "peer";
}

/** Deliver one peer message, then restart the session from what reached disk. */
async function deliverThenRestart(message: string): Promise<{ drained: ReturnType<IrcBridge["drainInboxMessages"]> }> {
	const { bridge } = harness();
	await bridge.deliver({ id: "m1", from: "RedStone", to: RECIPIENT, body: message, ts: 1 });

	// Restart: clear the live queues and restore from the persisted shape.
	const snapshot = bridge.clearPending();
	const { bridge: restarted } = harness();
	restarted.restorePending({
		interrupts: snapshot.interrupts.map(record => {
			const details = (record as CustomMessage).details;
			const entry: PersistedEntry = {
				customType: (record as CustomMessage).customType,
				content: String((record as CustomMessage).content),
				display: (record as CustomMessage).display,
				details: (details ?? {}) as Record<string, unknown>,
				attribution: (record as CustomMessage).attribution,
				timestamp: new Date((record as CustomMessage).timestamp).toISOString(),
			};
			return asPersistedRecord(entry) as AgentMessage;
		}),
		asides: snapshot.asides,
		deferredWakes: snapshot.deferredWakes,
	});

	return { drained: restarted.drainInboxMessages(RECIPIENT) };
}

describe("provenance survives a restart", () => {
	it("marks a delivered peer message as a peer message", async () => {
		// The failure this defends: a delivered record with no origin reads as a user
		// instruction to anything downstream that asks, and nothing at the delivery
		// site would have complained.
		const { bridge } = harness();
		await bridge.deliver({ id: "m1", from: "RedStone", to: RECIPIENT, body: "hi", ts: 1 });

		const [record] = bridge.clearPending().interrupts as CustomMessage[];
		expect(record.origin?.kind).toBe("peer");
		expect(record.origin?.from).toBe("RedStone");
		expect(readsAsUserInstruction(record)).toBe(false);
	});

	it("a peer message drained after a restart is still not a user instruction", async () => {
		// THE row. Without this the rebuild in `drainInboxMessages` can drop `origin`
		// and everything still works — the message arrives, the count is right, the
		// drain reports success — while a peer message has quietly become something
		// the session is entitled to treat as the user speaking.
		const { drained } = await deliverThenRestart("are you still there?");

		expect(drained).toHaveLength(1);
		expect(drained[0].body).toBe("are you still there?");
		expect(drained[0].origin?.kind).toBe("peer");
		expect(readsAsUserInstruction(drained[0])).toBe(false);
	});

	it("still reads an unmarked record as the user, because absence is the user case", async () => {
		// The other direction, and the one that must not be "fixed". If absence threw
		// or defaulted to `peer`, every record written before this field existed would
		// either stop being authoritative or start masquerading as a peer — and the
		// second is the failure this whole change exists to prevent.
		const { bridge } = harness();
		bridge.restorePending({
			interrupts: [
				{
					role: "custom",
					customType: "irc:incoming",
					content: "an old message",
					display: true,
					details: { id: "old", from: "RedStone", message: "an old message" },
					timestamp: 0,
				} as unknown as AgentMessage,
			],
			asides: [],
			deferredWakes: [],
		});

		const [drained] = bridge.drainInboxMessages(RECIPIENT);
		expect(drained.body).toBe("an old message");
		expect(drained.origin).toBeUndefined();
		expect(readsAsUserInstruction(drained)).toBe(true);
	});

	it("keeps a valid kind and drops a corrupt metadata field, rather than discarding both", async () => {
		// The failure this defends is the tempting one: rejecting the whole origin
		// because `from` came back as a number. That looks like strictness and is
		// actually an escalation — a peer message whose origin is discarded reads
		// back as a user instruction, which is the one outcome this provenance
		// exists to prevent. `kind` is the field the decision turns on, so it is the
		// only field whose absence is fatal; metadata is dropped and the rest stands.
		const { bridge } = harness();
		bridge.restorePending({
			interrupts: [
				{
					role: "custom",
					customType: "irc:incoming",
					content: "corrupt",
					display: true,
					details: {
						id: "c1",
						from: "RedStone",
						message: "corrupt",
						origin: { kind: "peer", from: 42 },
					},
					timestamp: 0,
				} as unknown as AgentMessage,
			],
			asides: [],
			deferredWakes: [],
		});

		const [drained] = bridge.drainInboxMessages(RECIPIENT);
		expect(drained.body).toBe("corrupt");
		expect(drained.origin).toEqual({ kind: "peer" });
		expect(readsAsUserInstruction(drained)).toBe(false);
	});

	it("treats an unrecognised kind as unknown provenance, not as a peer message", async () => {
		// The other half of the asymmetry: when the field the decision turns on is
		// not one this build recognises, the answer is `undefined` and the record
		// falls back to the user case. Guessing `peer` for an unreadable value would
		// manufacture provenance nobody wrote.
		const { bridge } = harness();
		bridge.restorePending({
			interrupts: [
				{
					role: "custom",
					customType: "irc:incoming",
					content: "from a newer build",
					display: true,
					details: {
						id: "c2",
						from: "RedStone",
						message: "from a newer build",
						origin: { kind: "supervisor" },
					},
					timestamp: 0,
				} as unknown as AgentMessage,
			],
			asides: [],
			deferredWakes: [],
		});

		const [drained] = bridge.drainInboxMessages(RECIPIENT);
		expect(drained.origin).toBeUndefined();
	});
});
