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
}

/**
 * Drive both registration entry points against a recording API.
 *
 * `api.arktype` is omptype's `type` under that name — the real loader exposes it
 * as a property, and destructuring it to `{ type }` yields undefined and throws
 * on the first `registerTool`. Supplying the real module is what makes this
 * exercise the same path a host does rather than a look-alike.
 */
function recordSurface(): Recorded {
	const tools: string[] = [];
	const commands: string[] = [];
	const defs = new Map<string, RecordedTool>();
	const delivered: Array<{ to: string }> = [];
	const api = {
		arktype: type,
		registerTool: (def: RecordedTool) => {
			tools.push(def.name);
			defs.set(def.name, def);
		},
		registerCommand: (name: string) => void commands.push(name),
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
	});

	registerPeerCommands(api as never, {
		currentName: () => "BlueLake",
		applyName: () => {},
		isNameTaken: () => false,
		roster: async () => [],
		notify: () => {},
	});

	return { tools, commands, defs, delivered };
}

describe("the peer tool surface", () => {
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
