/**
 * Registration for the four peer verbs.
 *
 * This is the only file here that knows about the host. It takes the injected
 * `ExtensionAPI` and four callbacks, and registers `peer.list`, `peer.send`,
 * `peer.lock` and `peer.release` — nothing else, deliberately.
 *
 * ## Why four
 *
 * Measured across fourteen references by each repo's own registration call, the
 * peer/file verbs range from 45 (`mcp_agent_mail_rust`) down to 3
 * (`pi-cross-session`). Four is small next to 45 — **not** small next to 3 — and
 * the honest reason for the reduction is that server administration is refused
 * as agent tools, not that messages are injected. A fifth verb would have to earn
 * its place against that standard.
 *
 * ## Why the `peer.` prefix
 *
 * Every builtin is unprefixed (`BUILTIN_TOOL_NAMES`, 31 snake_case names). This
 * package would be the first to break that, and the only one to introduce a bare
 * `lock` — a file lease and a mutex lock are different requests. Nothing
 * enforces the convention: there is no tool-name regex in the tree, and
 * `normalizeToolName` passes `peer.send` through verbatim. Renaming later is one
 * line per name.
 *
 * ## Imports
 *
 * `import type` only. The host injects every runtime value through `api`, so a
 * real import would resolve inside a core checkout and break against an
 * installed build.
 */

import type { Database } from "bun:sqlite";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { InboundFenceRegistration } from "@oh-my-pi/pi-coding-agent/irc/inbound-fence";
import type { InboxStore } from "../inbox/index";
import type { PeerRosterEntry } from "./verbs";
import { peerList, peerLock, peerRelease } from "./verbs";

/** What the host must supply for the four verbs to run. */
export interface PeerToolDeps {
	/** This session's own instance id — a lease owner, never a display name. */
	readonly selfId: string;
	/** Open lease database. Resolved per call, not captured: a reload swaps it. */
	readonly leaseDb: () => Database;
	/** Durable inbox for this session. */
	readonly inbox: () => InboxStore;
	/** Current roster across sessions. */
	readonly roster: () => Promise<readonly PeerRosterEntry[]>;
	/**
	 * Hand a message to the transport.
	 *
	 * A seam rather than a call into core. The host installs an implementation via
	 * `ExtensionAPI.registerPeerTransport` (`extensibility/extensions/types.ts`), which
	 * reaches `addPeerTransport` in the coding-agent's irc layer; until one is installed,
	 * this is whatever the host wires in.
	 */
	readonly deliver: (params: {
		to: string;
		message: string;
		notifyWhenIdle: boolean;
	}) => Promise<{
		readonly delivered: number;
		readonly receipts: readonly unknown[];
		/**
		 * Whether a requested `notifyWhenIdle` was actually arranged.
		 *
		 * OPTIONAL, and absent means "not requested" — a transport that never sees the
		 * request has nothing to report, and requiring it would break every implementation
		 * that does not care about idle notices.
		 *
		 * Present and `false` is the case that matters: the caller ASKED for a notice and
		 * the transport dropped it. Without a way to say that, `peer.send` could only answer
		 * `ok: true` to a promise nothing was going to keep — which is epic-m9wi.
		 */
		readonly notifyWhenIdleHonoured?: boolean;
	}>;
	/**
	 * The trust fence, handed to the host at load.
	 *
	 * OPTIONAL because a host that does not have one is a real state rather than a
	 * broken one: an installation without this extension has no inbound peer messages
	 * to fence, and forcing a fence there would mean manufacturing a policy the user
	 * never chose. What is NOT optional is that it arrives through this seam when it
	 * exists — `crossSessionInbound` was a full settings enum read by nobody until
	 * this was wired.
	 *
	 * Deliberately NOT derived from `crossSessionInbound` here. The setting is the
	 * USER's decision and belongs to the host that owns settings; this package supplies
	 * the fence that consults it, and translating between the two vocabularies here
	 * would put a config read in the extension where a second copy can drift from the
	 * first.
	 */
	readonly inboundFence?: InboundFenceRegistration;
}

function text(value: unknown): { content: [{ type: "text"; text: string }] } {
	return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

/** Register `peer.*`. Call once from an extension entry point. */
export function registerPeerTools(api: ExtensionAPI, deps: PeerToolDeps): void {
	// `api.arktype` IS omptype's `type` — the loader does `readonly arktype = type`.
	// It is not a namespace: destructuring `{ type }` yields undefined and every
	// registerTool below throws "type is not a function".
	const type = api.arktype;

	// THE FENCE, installed here because this is the only side of the dependency edge
	// that can. `@ultraworkers/peer` depends on `@oh-my-pi/pi-coding-agent`, so core
	// cannot import `fenceInbound` without closing a cycle — which is why `api` grows
	// a `registerPeerFence` surface rather than the bus reaching for the fence.
	//
	// Measured before this line existed: `IrcBus.global()` had `#fence = () =>
	// undefined`, so every production send skipped the fence block, and
	// `crossSessionInbound` was a settings enum with three options and zero readers.
	if (deps.inboundFence !== undefined) {
		api.registerPeerFence(deps.inboundFence);
	}

	// Schemas are hoisted to consts, not written inline in the object literal:
	// `registerTool<TParams extends TSchema>` cannot infer `TParams` from an
	// inline `type({...})` call, and `TSchema` is `Type | TJsonSchema` — a union
	// whose `Static` collapses to `unknown`. Naming the schema first lets each
	// `execute` read its own `.infer` (the same shape `ast-edit.ts:162` uses).
	const listSchema = type({ "unread?": "boolean" });
	const sendSchema = type({ to: type.string, message: type.string, "notify_when_idle?": "boolean" });
	const lockSchema = type({ path: type.string, "ttl_ms?": "number", "probe?": "boolean" });
	const releaseSchema = type({ fence_token: type.number });

	api.registerTool({
		name: "peer.list",
		label: "Peer roster",
		description:
			"List peer sessions. Pass unread=true for per-peer unread counts and subjects — never message bodies.",
		parameters: listSchema,
		approval: "read",
		async execute(_id, params: typeof listSchema.infer) {
			return text(await peerList(deps.inbox(), await deps.roster(), { unread: params.unread === true }));
		},
	});

	api.registerTool({
		name: "peer.send",
		label: "Send peer message",
		description:
			"Send a message to a peer session, or to 'all'. Delivery never waits for a reply. notify_when_idle asks for one notice when the recipient next goes idle — it is not a watch.",
		parameters: sendSchema,
		approval: "write",
		async execute(_id, params: typeof sendSchema.infer) {
			const to = params.to.trim();
			if (!to) return text({ ok: false, error: "A recipient is required." });
			if (to === deps.selfId) return text({ ok: false, error: "Cannot send a message to yourself." });
			if (!params.message.trim()) return text({ ok: false, error: "A non-empty message is required." });
			const requested = params.notify_when_idle === true;
			const result = await deps.deliver({
				to,
				message: params.message,
				notifyWhenIdle: requested,
			});
			// A dropped notice is a failed promise, and `ok: true` would be a lie the agent
			// cannot act on: it asked to be told when the recipient went idle, was told
			// "ok", and will never be told anything. The message still went out, so the
			// delivery fields are reported either way — what changes is the verdict on the
			// request, which is what the caller actually asked about.
			if (requested && result.notifyWhenIdleHonoured === false) {
				return text({
					ok: false,
					to,
					...result,
					error:
						"The message was not delivered to anyone yet, and no idle notice was arranged: no transport is registered. Nothing will notify you when the recipient goes idle.",
				});
			}
			return text({ ok: true, to, ...result });
		},
	});

	api.registerTool({
		name: "peer.lock",
		label: "Claim peer resource",
		description:
			"Claim a namespaced path, returning a fencing token that later proves ownership. A held path reports its holder instead of failing. Pass probe=true to ask whether a path is free without claiming it.",
		parameters: lockSchema,
		approval: "write",
		async execute(_id, params: typeof lockSchema.infer) {
			const outcome = peerLock(deps.leaseDb(), {
				owner: deps.selfId,
				pathPattern: params.path,
				ttlMs: params.ttl_ms,
				probe: params.probe === true,
			});
			if (outcome.kind === "acquired") {
				const { fenceToken, expiresTs, pathPattern } = outcome.lease;
				return text({ ok: true, path: pathPattern, fence_token: fenceToken, expires_ts: expiresTs });
			}
			if (outcome.kind === "probe") return text({ ok: true, probe: outcome.answer });
			return text({
				ok: false,
				held: outcome.conflicts.map(c => ({
					owner: c.owner,
					path: c.pathPattern,
					fence_token: c.fenceToken,
					expires_ts: c.expiresTs,
				})),
			});
		},
	});

	api.registerTool({
		name: "peer.release",
		label: "Release peer claim",
		description:
			"Give a claim back, proving ownership with its fencing token. There is no force-release: reclaiming a held path is a human decision.",
		parameters: releaseSchema,
		approval: "write",
		async execute(_id, params: typeof releaseSchema.infer) {
			return text(peerRelease(deps.leaseDb(), { owner: deps.selfId, fenceToken: params.fence_token }));
		},
	});
}
