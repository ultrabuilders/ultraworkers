import { type } from "@oh-my-pi/omptype";
import type { AgentTool, AgentToolResult } from "@oh-my-pi/pi-agent-core";
import peerSendDescription from "../../prompts/tools/peer-send.md" with { type: "text" };
import peerListDescription from "../../prompts/tools/peer-list.md" with { type: "text" };
import peerLockDescription from "../../prompts/tools/peer-lock.md" with { type: "text" };
import peerReleaseDescription from "../../prompts/tools/peer-release.md" with { type: "text" };
import { executeSend } from "../../irc/messaging";
import type { CoordinationDetails } from "@oh-my-pi/pi-tui/tools/wait";
import type { ToolSession } from "..";
import { getPeerLockBackend, getPeerTransport } from "./backend";

export * from "./backend";
export * from "./register";

/**
 * The `peer.*` surface: four verbs, and a deliberate absence of a fifth.
 *
 * WHY FOUR AND NOT FORTY-FIVE. The reference agents expose 24–49 tools; this one
 * exposes four. The reduction is not "small because it is injected" — it is
 * because server administration is NOT exposed to an agent at all. Everything a
 * peer can do to another peer is here; nothing a peer can do to the server's
 * internals is.
 *
 * WHY `force_release` IS ABSENT. It is the one operation that can destroy work
 * another agent is doing right now. The reference that has it gates it behind
 * four staleness signals and it is still the most dangerous verb in that API.
 * Handing it to an agent gives the weakest link the sharpest tool. It is not
 * reachable from this surface, and `peer-tools.test.ts` asserts that by
 * enumerating the registry rather than trusting this docblock.
 *
 * WHY THE `peer.` PREFIX. Every built-in is unprefixed, and this is the first
 * thing here to break that. A bare `lock` would collide in meaning with the file
 * lock and the mutex lock, which are two different requests; the prefix says who
 * owns the verb.
 *
 * WHY THESE CALL THE EXISTING FUNCTIONS. `peer.send` invokes `executeSend` — the
 * same entry the `send` tool already uses — rather than reimplementing delivery,
 * broadcast and parked-recipient revival. A second implementation of send would
 * be free to drift from the one every other caller uses.
 */

// ---------------------------------------------------------------------------
// peer.send
// ---------------------------------------------------------------------------

const peerSendSchema = type({
	to: type("string").describe("recipient agent id, or 'all' for every visible agent"),
	message: type("string").describe("message body"),
	"+": "reject",
});

/**
 * The details are `CoordinationDetails` — the type `executeSend` already returns.
 * Declaring a `peer.send`-shaped parallel type here would misrepresent the reuse
 * this tool exists to guarantee, and would drift the first time that shape moved.
 */
export type PeerSendDetails = CoordinationDetails;

/**
 * Deliver a message through the existing send path.
 *
 * Refused outright when the session has no registry or no identity: a send with
 * no sender cannot be routed, and guessing one would put the message under an
 * identity the agent does not own.
 */
export class PeerSendTool implements AgentTool<typeof peerSendSchema, PeerSendDetails> {
	readonly name = "peer.send";
	readonly label = "Peer Send";
	readonly description = peerSendDescription;
	readonly parameters = peerSendSchema;
	readonly strict = true;
	readonly summary = "Send a message to another agent";

	constructor(private readonly session: ToolSession) {}

	async execute(_toolCallId: string, params: typeof peerSendSchema.infer): Promise<AgentToolResult<PeerSendDetails>> {
		const registry = this.session.agentRegistry;
		const senderId = this.session.getAgentId?.() ?? undefined;
		if (!registry || !senderId) {
			return {
				content: [{ type: "text", text: "Cannot send: this session has no agent identity to send from." }],
				isError: true,
			};
		}
		// `executeSend` already refuses a self-send with that reason, and refuses an
		// empty recipient or body. Reusing it is what makes those refusals the same
		// refusals everywhere else, rather than a second copy that can drift.
		return executeSend(
			{ registry, senderId, sessionFileHint: this.session.getSessionFile() },
			{ to: params.to, message: params.message },
		);
	}
}

// ---------------------------------------------------------------------------
// peer.list
// ---------------------------------------------------------------------------

const peerListSchema = type({
	"after_seq?": type("number").describe("only messages after this cursor; 0 starts from the beginning"),
	"limit?": type("number").describe("cap on how many to return, oldest first"),
	"+": "reject",
});

export interface PeerListDetails {
	readonly op: "peer.list";
	readonly highSeq: number;
	readonly count: number;
	readonly gaps: readonly { readonly fromSeq: number; readonly toSeq: number }[];
	readonly truncated: boolean;
}

/**
 * Show what is waiting, without the bodies.
 *
 * The gap report is the part that matters. An inbox read that skipped a hole
 * would let an agent conclude it had seen everything, and the one message it
 * missed is exactly the one it needed.
 */
export class PeerListTool implements AgentTool<typeof peerListSchema, PeerListDetails> {
	readonly name = "peer.list";
	readonly label = "Peer List";
	readonly description = peerListDescription;
	readonly parameters = peerListSchema;
	readonly strict = true;
	readonly summary = "List messages in your inbox";

	constructor(private readonly session: ToolSession) {}

	async execute(_toolCallId: string, params: typeof peerListSchema.infer): Promise<AgentToolResult<PeerListDetails>> {
		const transport = getPeerTransport();
		if (!transport) {
			return {
				content: [{ type: "text", text: "No peer transport is registered; peer.list cannot read an inbox." }],
				isError: true,
				details: { op: "peer.list", highSeq: 0, count: 0, gaps: [], truncated: false },
			};
		}
		const result = transport.list({ afterSeq: params.after_seq, limit: params.limit });
		const lines = result.messages.map(m => `${m.read ? " " : "*"} ${m.seq}  ${m.from}  ${m.subject}`);
		if (lines.length === 0) lines.push("(no messages)");
		// Report the holes rather than letting their absence read as "caught up".
		for (const gap of result.gaps) {
			lines.push(`!! missing ${gap.fromSeq}–${gap.toSeq}: never arrived or was pruned`);
		}
		if (result.truncated) {
			lines.push("!! this inbox starts after your cursor; you are seeing only part of it");
		}
		return {
			content: [{ type: "text", text: lines.join("\n") }],
			details: {
				op: "peer.list",
				highSeq: result.highSeq,
				count: result.messages.length,
				gaps: result.gaps,
				truncated: result.truncated,
			},
		};
	}
}

// ---------------------------------------------------------------------------
// peer.lock
// ---------------------------------------------------------------------------

const peerLockSchema = type({
	path: type("string").describe("path or glob to claim"),
	"probe?": type("boolean").describe("check who holds it without claiming it"),
	"+": "reject",
});

export interface PeerLockDetails {
	readonly op: "peer.lock";
	readonly ok: boolean;
	readonly pathPattern: string;
	readonly fenceToken?: number;
	readonly expiresTs?: number;
	readonly holders?: readonly { readonly owner: string; readonly expiresTs: number }[];
	readonly probed: boolean;
}

/**
 * Claim a path, or report the current holder.
 *
 * LOCK IS ALSO A READ. A claim on a held path returns the holder rather than
 * failing, because "who has this" is the question that prompted the claim far
 * more often than "give me this". Splitting the read into a separate tool would
 * add a tool whose only job is to read what `lock` already has to look up.
 *
 * A probe creates no row: it answers "is this free" without taking it, which is
 * the difference between a check and a claim.
 */
export class PeerLockTool implements AgentTool<typeof peerLockSchema, PeerLockDetails> {
	readonly name = "peer.lock";
	readonly label = "Peer Lock";
	readonly description = peerLockDescription;
	readonly parameters = peerLockSchema;
	readonly strict = true;
	readonly summary = "Claim a path exclusively, or see who holds it";

	constructor(private readonly session: ToolSession) {}

	async execute(_toolCallId: string, params: typeof peerLockSchema.infer): Promise<AgentToolResult<PeerLockDetails>> {
		const backend = getPeerLockBackend();
		const owner = this.session.getAgentId?.() ?? undefined;
		if (!backend || !owner) {
			return {
				content: [{ type: "text", text: "No peer lock backend is registered; cannot claim paths." }],
				isError: true,
				details: { op: "peer.lock", ok: false, pathPattern: params.path, probed: false },
			};
		}

		// A probe stops here, before the claim, so it leaves nothing behind.
		if (params.probe) {
			const result = backend.lock({ owner, pathPattern: params.path, exclusive: true });
			if (result.ok) {
				return {
					content: [{ type: "text", text: `${params.path} is free.` }],
					details: { op: "peer.lock", ok: true, pathPattern: params.path, probed: true },
				};
			}
			return {
				content: [{ type: "text", text: `${params.path} is held by ${describeHolders(result.conflicts)}.` }],
				details: {
					op: "peer.lock",
					ok: false,
					pathPattern: params.path,
					holders: result.conflicts,
					probed: true,
				},
			};
		}

		const result = backend.lock({ owner, pathPattern: params.path, exclusive: true });
		if (!result.ok) {
			return {
				content: [{ type: "text", text: `${params.path} is held by ${describeHolders(result.conflicts)}.` }],
				details: {
					op: "peer.lock",
					ok: false,
					pathPattern: params.path,
					holders: result.conflicts,
					probed: false,
				},
			};
		}
		return {
			content: [{ type: "text", text: `Locked ${params.path} (token ${result.lease.fenceToken}).` }],
			details: {
				op: "peer.lock",
				ok: true,
				pathPattern: result.lease.pathPattern,
				fenceToken: result.lease.fenceToken,
				expiresTs: result.lease.expiresTs,
				probed: false,
			},
		};
	}
}

function describeHolders(conflicts: readonly { owner: string; expiresTs: number }[]): string {
	if (conflicts.length === 0) return "another agent (details unavailable)";
	return conflicts.map(c => `${c.owner} until ${new Date(c.expiresTs).toISOString()}`).join(", ");
}

// ---------------------------------------------------------------------------
// peer.release
// ---------------------------------------------------------------------------

const peerReleaseSchema = type({
	fence_token: type("number").describe("the token peer.lock returned"),
	"+": "reject",
});

export interface PeerReleaseDetails {
	readonly op: "peer.release";
	readonly released: boolean;
	readonly reason?: string;
}

/**
 * Give a claim back.
 *
 * A stale token is reported, not forced: it means the claim already expired and
 * someone else may hold the path, so "released" would be a lie. Forcing it is the
 * one operation deliberately kept off this surface.
 */
export class PeerReleaseTool implements AgentTool<typeof peerReleaseSchema, PeerReleaseDetails> {
	readonly name = "peer.release";
	readonly label = "Peer Release";
	readonly description = peerReleaseDescription;
	readonly parameters = peerReleaseSchema;
	readonly strict = true;
	readonly summary = "Release a path you locked";

	constructor(private readonly session: ToolSession) {}

	async execute(
		_toolCallId: string,
		params: typeof peerReleaseSchema.infer,
	): Promise<AgentToolResult<PeerReleaseDetails>> {
		const backend = getPeerLockBackend();
		const owner = this.session.getAgentId?.() ?? undefined;
		if (!backend || !owner) {
			return {
				content: [{ type: "text", text: "No peer lock backend is registered; cannot release paths." }],
				isError: true,
				details: { op: "peer.release", released: false, reason: "no backend" },
			};
		}
		const released = backend.release({ owner, fenceToken: params.fence_token });
		return released
			? { content: [{ type: "text", text: "Released." }], details: { op: "peer.release", released: true } }
			: {
					content: [{ type: "text", text: "Not released: that token is stale, so the claim already expired." }],
					details: { op: "peer.release", released: false, reason: "stale token" },
				};
	}
}
