import { afterEach, describe, expect, it } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent";
import { allBuiltinToolFactories, getRegisteredBuiltinTools, type ToolSession } from "@oh-my-pi/pi-coding-agent/tools";
import { BUILTIN_TOOL_NAMES, normalizeToolName } from "../src/tools/builtin-names";
import {
	type PeerLockBackend,
	type PeerTransport,
	registerPeerLockBackend,
	registerPeerTransport,
	resetPeerBackends,
} from "@oh-my-pi/pi-coding-agent/tools/peer/backend";
import {
	PeerListTool,
	PeerLockTool,
	PeerReleaseTool,
	PeerSendTool,
	registerPeerTools,
} from "@oh-my-pi/pi-coding-agent/tools/peer";

/**
 * The contracts `epic-jwsy.13` names.
 *
 * Two of them are about ABSENCE — that a dangerous verb is unreachable and that
 * the slash-only commands are not tools. Both are asserted by enumerating the
 * registry rather than by reading the source, because "I did not write it" is a
 * claim about me and "it is not in the registry" is a claim about the product.
 */

function makeSession(overrides: Record<string, unknown> = {}): ToolSession {
	return {
		cwd: "/tmp",
		hasUI: false,
		settings: Settings.isolated({}),
		getSessionFile: () => null,
		getSessionId: () => "test-session",
		getAgentId: () => "BlueLake",
		...overrides,
	} as unknown as ToolSession;
}

afterEach(() => {
	resetPeerBackends();
});

/** A backend that records what it was asked, so "a probe created no row" is observable. */
function fakeLockBackend() {
	const calls: { kind: string; owner: string; pathPattern: string }[] = [];
	const impl: PeerLockBackend = {
		lock(options) {
			calls.push({ kind: "lock", owner: options.owner, pathPattern: options.pathPattern });
			return {
				ok: true,
				lease: { pathPattern: options.pathPattern, fenceToken: 7, expiresTs: 1_000_000 },
			};
		},
		release() {
			calls.push({ kind: "release", owner: "", pathPattern: "" });
			return true;
		},
	};
	return { impl, calls };
}

function text(result: { content: { type: string; text?: string }[] }): string {
	return result.content.map(c => c.text ?? "").join("\n");
}

/**
 * `AgentToolResult.details` is optional on the shared type, but every tool here
 * sets it — it is where the fence token, the gap report and the holder live, so a
 * result without it would be useless to the caller. Asserting rather than
 * non-null-asserting keeps a missing-details regression an error at the call.
 */
function detailsOf<T>(result: { details?: T }): T {
	if (!result.details) throw new Error("expected the tool to return details");
	return result.details;
}

describe("peer tool names", () => {
	it("passes every name through normalisation unchanged", () => {
		// The prefix only works if normalisation leaves it alone. `normalizeToolName`
		// rewrites only names it already knows, so a dotted name must come back
		// byte-identical — otherwise the tool the model calls is not the tool the
		// registry holds.
		for (const name of ["peer.list", "peer.send", "peer.lock", "peer.release"]) {
			expect(normalizeToolName(name)).toBe(name);
		}
	});

	it("does not put peer.* into BUILTIN_TOOL_NAMES", () => {
		// The bead's constraint, asserted where it can actually be violated.
		for (const name of BUILTIN_TOOL_NAMES) {
			expect(name.startsWith("peer.")).toBe(false);
		}
	});
});

describe("peer.lock", () => {
	it("returns the current holder on a held path instead of failing", async () => {
		// The read path. Failing here would make an agent retry a claim it can never
		// win, when what it actually wants to know is who to ask.
		const backend: PeerLockBackend = {
			lock: () => ({
				ok: false,
				conflicts: [{ pathPattern: "src/x.ts", owner: "RedStone", expiresTs: 1_700_000_000_000 }],
			}),
			release: () => true,
		};
		registerPeerLockBackend(backend);

		const tool = new PeerLockTool(makeSession());
		const result = await tool.execute("call-1", { path: "src/x.ts" });

		expect(text(result)).toContain("RedStone");
		expect(detailsOf(result).ok).toBe(false);
		// Returning the holder is the contract; an error flag would make the caller
		// treat a readable answer as a failure.
		expect(result.isError).toBeFalsy();
	});

	it("creates no row when probing", async () => {
		// A probe that claimed would be indistinguishable from a claim, which is the
		// whole difference between checking a path and taking it.
		const { impl, calls } = fakeLockBackend();
		registerPeerLockBackend(impl);

		const tool = new PeerLockTool(makeSession());
		const result = await tool.execute("call-1", { path: "src/x.ts", probe: true });

		expect(detailsOf(result).probed).toBe(true);
		// The backend was asked to answer the question, but the tool must not treat
		// that answer as a claim — so the token is never handed back.
		expect(detailsOf(result).fenceToken).toBeUndefined();
		expect(calls.length).toBe(1);
	});

	it("reports a free path on probe without claiming it", async () => {
		const { impl } = fakeLockBackend();
		registerPeerLockBackend(impl);
		const tool = new PeerLockTool(makeSession());
		const result = await tool.execute("call-1", { path: "src/x.ts", probe: true });
		expect(text(result)).toContain("free");
		expect(detailsOf(result).fenceToken).toBeUndefined();
	});

	it("refuses rather than reporting success when no backend is registered", async () => {
		// No backend is a real state, not a reason to claim something is free.
		const tool = new PeerLockTool(makeSession());
		const result = await tool.execute("call-1", { path: "src/x.ts" });
		expect(result.isError).toBe(true);
		expect(detailsOf(result).ok).toBe(false);
	});
});

describe("peer.release", () => {
	it("reports a stale token as not released, rather than forcing it", async () => {
		const backend: PeerLockBackend = {
			lock: () => ({ ok: true, lease: { pathPattern: "p", fenceToken: 1, expiresTs: 0 } }),
			release: () => false,
		};
		registerPeerLockBackend(backend);

		const tool = new PeerReleaseTool(makeSession());
		const result = await tool.execute("call-1", { fence_token: 7 });

		// The claim already expired and someone else may hold the path now, so
		// "released" would be a lie the next agent acts on.
		expect(detailsOf(result).released).toBe(false);
		expect(detailsOf(result).reason).toBe("stale token");
	});
});

describe("peer.list", () => {
	it("omits bodies and returns previews only", async () => {
		// A peer list is navigation, not a reader. Bodies belong to a message fetch,
		// and putting every peer's text in one tool result is how an agent's context
		// fills with mail it did not ask for.
		const transport: PeerTransport = {
			list: () => ({
				highSeq: 2,
				messages: [
					{ seq: 1, from: "RedStone", subject: "hello", createdTs: "t", read: false },
					{ seq: 2, from: "BlueElk", subject: "re: hello", createdTs: "t", read: true },
				],
				gaps: [],
				truncated: false,
			}),
		};
		registerPeerTransport(transport);

		const tool = new PeerListTool(makeSession());
		const result = await tool.execute("call-1", {});

		const rendered = text(result);
		expect(rendered).toContain("hello");
		expect(rendered).toContain("RedStone");
		// The one unread message is marked, which is what the list is FOR.
		expect(rendered).toContain("* 1");
		expect(detailsOf(result).count).toBe(2);
	});

	it("surfaces a gap instead of returning a contiguous-looking run", async () => {
		const transport: PeerTransport = {
			list: () => ({
				highSeq: 5,
				messages: [{ seq: 5, from: "RedStone", subject: "s", createdTs: "t", read: false }],
				gaps: [{ fromSeq: 3, toSeq: 4 }],
				truncated: false,
			}),
		};
		registerPeerTransport(transport);

		const tool = new PeerListTool(makeSession());
		const result = await tool.execute("call-1", {});
		expect(text(result)).toContain("missing 3–4");
		expect(detailsOf(result).gaps).toHaveLength(1);
	});

	it("says so when the inbox starts past the cursor", async () => {
		const transport: PeerTransport = {
			list: () => ({
				highSeq: 40,
				messages: [{ seq: 40, from: "RedStone", subject: "s", createdTs: "t", read: true }],
				gaps: [],
				truncated: true,
			}),
		};
		registerPeerTransport(transport);
		const tool = new PeerListTool(makeSession());
		expect(text(await tool.execute("call-1", {}))).toContain("only part of it");
	});
});

describe("peer.send", () => {
	it("refuses to send from a session with no identity", async () => {
		// Routing a message under a guessed identity would attribute it to an agent
		// that does not exist.
		const tool = new PeerSendTool(makeSession({ getAgentId: () => null }));
		const result = await tool.execute("call-1", { to: "RedStone", message: "hi" });
		expect(result.isError).toBe(true);
		expect(text(result)).toContain("no agent identity");
	});
});

describe("what the agent surface deliberately omits", () => {
	it("exposes exactly four verbs, none of which can force-release a path", () => {
		// Enumerated, not asserted from a docblock. `force_release` is the operation
		// that can destroy work another agent is doing right now; it is kept off this
		// surface, and this row is what makes that checkable later.
		registerPeerTools();

		const names = Object.keys(allBuiltinToolFactories()).filter(n => n.startsWith("peer."));
		expect(names.sort()).toEqual(["peer.list", "peer.lock", "peer.release", "peer.send"]);

		for (const name of names) {
			expect(name).not.toContain("force");
		}
		// Nothing anywhere in the registered surface can force a release.
		expect(Object.keys(allBuiltinToolFactories())).not.toContain("peer.force_release");
	});

	it("keeps the slash commands out of the tool registry", () => {
		// `/list-agents` and `/rename` are operator commands, not agent verbs. That
		// they are absent here is the reason the agent surface stays at four.
		const registered = [...getRegisteredBuiltinTools().keys()];
		expect(registered).not.toContain("list-agents");
		expect(registered).not.toContain("rename");
	});
});
