import { describe, expect, it } from "bun:test";
import type { Database } from "bun:sqlite";
import { normalizeToolName } from "@oh-my-pi/pi-coding-agent/tools/builtin-names";
import { type } from "@oh-my-pi/omptype";
import type { InboxStore } from "../src/inbox/store";
import { registerPeerCommands } from "../src/tools/commands";
import { registerPeerTools } from "../src/tools/register";

/**
 * What an extension host actually ends up holding after registration.
 *
 * The verbs themselves are tested in `tools-verbs.test.ts`, where they are plain
 * functions over data. What that file cannot see is the shape of the SURFACE —
 * how many tools got registered, whether the operator commands leaked into it,
 * and what the host does to the names. Those are claims about what a host
 * receives, so they are asserted by driving the real registration with a
 * recording `ExtensionAPI`.
 *
 * A count is the only assertion that survives someone adding a verb: each verb's
 * own tests would keep passing, and a docblock would keep saying "four".
 */

/** Enough of a tool definition to execute one the way a host would. */
interface RecordedTool {
	readonly name: string;
	execute(id: string, params: Record<string, unknown>): Promise<unknown>;
}

interface Recorded {
	readonly tools: string[];
	readonly commands: string[];
	readonly defs: Map<string, RecordedTool>;
	readonly delivered: Array<{ to: string }>;
	/** Fences handed to the host at registration, in order. */
	readonly fences: unknown[];
	/** Whether a fence was offered to the host at all. */
	readonly fenceOffered: () => boolean;
}

/**
 * Drive both registration entry points against a recording API.
 *
 * `api.arktype` is omptype's `type` under that name — the real loader exposes it
 * as a property, and destructuring it to `{ type }` yields undefined and throws
 * on the first `registerTool`. Supplying the real module is what makes this
 * exercise the same path a host does rather than a look-alike.
 */
function recordSurface(
	deliverOverride?: (params: { to: string; message: string; notifyWhenIdle: boolean }) => Promise<{
		delivered: number;
		receipts: readonly unknown[];
		notifyWhenIdleHonoured?: boolean;
	}>,
): Recorded {
	const tools: string[] = [];
	const commands: string[] = [];
	const defs = new Map<string, RecordedTool>();
	const delivered: Array<{ to: string }> = [];
	const fences: unknown[] = [];
	const api = {
		arktype: type,
		registerTool: (def: RecordedTool) => {
			tools.push(def.name);
			defs.set(def.name, def);
		},
		registerCommand: (name: string) => void commands.push(name),
		registerPeerFence: (registration: unknown) => {
			fences.push(registration);
		},
	};

	registerPeerTools(api as never, {
		selfId: "BlueLake",
		leaseDb: (() => undefined) as unknown as () => Database,
		inbox: (() => undefined) as unknown as () => InboxStore,
		roster: async () => [],
		deliver: async ({ to }: { to: string }) => {
			delivered.push({ to });
			return { delivered: 1, receipts: [] };
		},
		inboundFence: FENCE_OFFERED,
		...(deliverOverride ? { deliver: deliverOverride } : {}),
	});

	registerPeerCommands(api as never, {
		currentName: () => "BlueLake",
		applyName: () => {},
		isNameTaken: () => false,
		roster: async () => [],
		notify: () => {},
	});

	// Derived from `fences`, not from a flag. A `let fenceOffered = false` that
	// nothing ever assigned reported "no fence" from the one recorder that DID
	// receive one — a helper that answers the opposite of the truth about its
	// own input, which is worse than a missing helper.
	return { tools, commands, defs, delivered, fences, fenceOffered: () => fences.length > 0 };
}

/**
 * A fence registration offered through `deps.inboundFence`.
 *
 * A distinguishable object rather than a bare function, so the row below asserts on
 * IDENTITY: `registerPeerFence` handing over something else would pass a test that
 * only checked "a fence was passed".
 */
const FENCE_OFFERED = { fence: () => ({ action: "accept" }) as const, context: { mode: "default" } };

/** The same surface with no fence offered, for the "optional" row. */
function recordSurfaceWithoutFence(): Recorded {
	const tools: string[] = [];
	const commands: string[] = [];
	const defs = new Map<string, RecordedTool>();
	const delivered: Array<{ to: string }> = [];
	const fences: unknown[] = [];
	const api = {
		arktype: type,
		registerTool: (def: RecordedTool) => {
			tools.push(def.name);
			defs.set(def.name, def);
		},
		registerCommand: (name: string) => void commands.push(name),
		registerPeerFence: (registration: unknown) => {
			fences.push(registration);
		},
	};
	registerPeerTools(api as never, {
		selfId: "BlueLake",
		leaseDb: (() => undefined) as unknown as () => Database,
		inbox: (() => undefined) as unknown as () => InboxStore,
		roster: async () => [],
		deliver: async ({ to }: { to: string }) => {
			delivered.push({ to });
			return { delivered: 1, receipts: [] };
		},
		// `inboundFence` deliberately absent.
	});
	return { tools, commands, defs, delivered, fences, fenceOffered: () => fences.length > 0 };
}

describe("the peer tool surface", () => {
	it("hands the trust fence to the host at registration, by identity", () => {
		// The row that closes `epic-jwsy.11`'s gap. Measured before this existed:
		// `IrcBus.global()` had `#fence = () => undefined`, so every production send
		// skipped the fence block, and `crossSessionInbound` was a settings enum with
		// three options and **zero readers**. This package is the only side of the
		// dependency edge that can install it — peer depends on coding-agent, never the
		// reverse — so a registration here is the whole delivery mechanism.
		//
		// Identity, not just "something was passed": a host that substituted its own
		// object would pass a count-based assertion.
		const { fences } = recordSurface();
		expect(fences).toHaveLength(1);
		expect(fences[0]).toBe(FENCE_OFFERED);
	});

	it("registers no fence when none is offered, instead of inventing one", () => {
		// The negative half, kept separate so a regression in one does not hide a
		// regression in the other: a registration that fabricated a default fence would
		// pass the row above. An installation without this extension has no inbound peer
		// messages to fence, so a manufactured policy would be one the user never chose.
		const { fences } = recordSurfaceWithoutFence();
		expect(fences).toEqual([]);
	});

	it("registers exactly four verbs", () => {
		// Mutation-checked both ways: adding a fifth fails this, and so does
		// removing one — which is what makes it a statement about the whole surface
		// rather than about any single name.
		const { tools } = recordSurface();
		expect(tools.slice().sort()).toEqual(["peer.list", "peer.lock", "peer.release", "peer.send"]);
	});

	it("hands the host four names that normalisation leaves alone", () => {
		// The failure this defends: `normalizeToolName` lowercases any name it
		// recognises and rewrites legacy aliases, so a verb registered as
		// `peer.Send` would reach a model as `peer.send` — while the tool's own
		// `name` field still said otherwise, and any allowlist built from one of
		// them would miss. Asserted through the real normaliser rather than by
		// reading the names, because the point is what the host does to them.
		const { tools } = recordSurface();
		expect(tools.map(name => normalizeToolName(name))).toEqual(tools);
	});

	it("refuses a send to yourself with that reason, not 'unknown name'", async () => {
		// The failure this defends: self-send falls through to a name lookup and
		// comes back as an unknown recipient. The agent then reports a routing
		// failure and goes looking for a peer who does not exist, when the actual
		// problem is a loop it wrote itself.
		const { defs, delivered } = recordSurface();
		const result = await defs.get("peer.send")?.execute("id", { to: "BlueLake", message: "hi" });

		expect(JSON.stringify(result)).toContain("yourself");
		expect(JSON.stringify(result)).not.toContain("unknown");
		// And nothing was handed to the wire.
		expect(delivered).toEqual([]);
	});

	/**
	 * The parsed payload of a tool result.
	 *
	 * A tool result is an envelope whose `content[0].text` is pretty-printed JSON, so
	 * asserting on `JSON.stringify(result)` means asserting on that formatter's spacing.
	 * Parsing instead keeps these rows about the verdict, not about how it is rendered.
	 */
	async function resultOf(
		defs: Map<string, RecordedTool>,
		params: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const raw = await defs.get("peer.send")?.execute("id", params);
		const envelope = raw as { content: Array<{ text: string }> };
		return JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
	}

	it("refuses a send whose idle notice was dropped, instead of answering ok to a promise", async () => {
		// epic-m9wi. `notify_when_idle` is a PUBLIC parameter, and its own description
		// promises "one notice when the recipient next goes idle". Before this, a transport
		// that dropped the request had no way to say so, so the tool answered `ok: true` and
		// the agent waited forever for a notice nothing had arranged.
		//
		// Both directions, because either one alone is satisfiable by a tool that always
		// refuses: a row asserting only the refusal passes even if `ok: true` is gone
		// entirely, and one asserting only success passes even if the refusal is gone.
		const dropped = recordSurface(async () => ({
			delivered: 0,
			receipts: [],
			notifyWhenIdleHonoured: false,
		}));
		const refused = await resultOf(dropped.defs, { to: "StormyOx", message: "hi", notify_when_idle: true });
		expect(refused.ok).toBe(false);
		// The reason must name what did NOT happen, or the agent cannot tell a dropped
		// notice from a failed send and will retry the wrong thing.
		expect(String(refused.error)).toContain("idle");

		const kept = recordSurface(async () => ({
			delivered: 1,
			receipts: [],
			notifyWhenIdleHonoured: true,
		}));
		const honoured = await resultOf(kept.defs, { to: "StormyOx", message: "hi", notify_when_idle: true });
		expect(honoured.ok).toBe(true);
	});

	it("refuses a send the transport delivered to nobody, instead of answering ok", async () => {
		// The other half of epic-m9wi, and the one that was still open after
		// `8cb9de942f` fixed the idle-notice half. `peer.send` returned
		// `{ ok: true, delivered: 0 }` for a send that reached no one — the exact
		// `#87501` shape `irc/peer-transport.ts:24-27` is written to prevent, and the
		// only thing an agent reading just `ok` will act on.
		//
		// A PAIR, and the pair is the point. A row asserting only "refuses on zero"
		// passes for a tool that refuses EVERY send, which is the neighbouring defect;
		// the mirror row below asserts a real delivery still succeeds. Neither half
		// separates them.
		const nobody = recordSurface(async () => ({ delivered: 0, receipts: [] }));
		const refused = await resultOf(nobody.defs, { to: "StormyOx", message: "hi" });
		expect(refused.ok).toBe(false);
		expect(refused.delivered).toBe(0);
		// The reason has to name what did NOT happen and what the agent can do about
		// it, or it cannot tell a dead recipient from an unreachable transport.
		expect(String(refused.error)).toContain("0 recipients");

		// The mirror: a transport that reached somebody is still a success. Without
		// this the row above is satisfiable by a tool that refuses unconditionally.
		const somebody = recordSurface(async () => ({ delivered: 1, receipts: [{ name: "StormyOx" }] }));
		const delivered = await resultOf(somebody.defs, { to: "StormyOx", message: "hi" });
		expect(delivered.ok).toBe(true);
		expect(delivered.delivered).toBe(1);
	});

	it("keeps the dropped-notice diagnosis when a send both reached nobody and dropped the notice", async () => {
		// Ordering, stated as a contract. Both facts are true at once and the more
		// specific one is the idle notice, because it names the CAUSE; the zero-delivery
		// branch can only report the effect. A tool that checked `delivered` first would
		// return an error that never mentions the notice, and the existing dropped-notice
		// row asserts it does — this row makes that assertion reachable from a send that
		// trips both branches rather than only the idle one.
		const both = recordSurface(async () => ({
			delivered: 0,
			receipts: [],
			notifyWhenIdleHonoured: false,
		}));
		const refused = await resultOf(both.defs, { to: "StormyOx", message: "hi", notify_when_idle: true });
		expect(refused.ok).toBe(false);
		expect(String(refused.error)).toContain("idle");
	});

	it("leaves an ordinary send alone, since it asked for no notice", async () => {
		// The regression this defends: the refusal firing on every send. A transport that
		// reports nothing (the field absent) is saying "not requested", not "dropped" —
		// and a send with no `notify_when_idle` must stay `ok: true` either way.
		const { defs } = recordSurface();
		expect((await resultOf(defs, { to: "StormyOx", message: "hi" })).ok).toBe(true);

		// And a transport that drops notices still succeeds for a send that did not ask.
		const dropped = recordSurface(async () => ({
			delivered: 1,
			receipts: [],
			notifyWhenIdleHonoured: false,
		}));
		expect((await resultOf(dropped.defs, { to: "StormyOx", message: "hi" })).ok).toBe(true);
	});

	it("offers no way to force-release another agent's claim", () => {
		// `force_release` is the one operation that can destroy work another agent
		// is doing right now. The reference that has it gates it behind four
		// staleness signals and it is still the sharpest tool in that API; handing
		// it to an agent puts it in the weakest hands. Asserted as an ABSENCE over
		// the whole surface, so it holds under a rename.
		const { tools } = recordSurface();
		expect(tools.length).toBeGreaterThan(0);
		for (const name of tools) expect(name).not.toContain("force");
		expect(tools).not.toContain("peer.force_release");
	});

	it("registers the operator commands as commands, never as tools", () => {
		// `/list-agents` and `/rename` belong to the human. A `/rename` that renames
		// a SESSION TITLE already exists in the CLI; a second one meaning "rename
		// yourself as a peer" must not become callable by a model. Asserted
		// positively too, so renaming the command cannot retire the contract while
		// the negative half still passed.
		const { tools, commands } = recordSurface();
		expect(commands).toContain("list-agents");
		expect(commands).toContain("peers");
		expect(commands).toContain("rename");
		for (const name of ["list-agents", "peers", "rename"]) {
			expect(tools).not.toContain(name);
		}
	});
});
