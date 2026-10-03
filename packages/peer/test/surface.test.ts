import { describe, expect, it } from "bun:test";
import type { Database } from "bun:sqlite";
import { type } from "@oh-my-pi/omptype";
import type { InboxStore } from "../src/inbox/store";
import { registerPeerCommands } from "../src/tools/commands";
import { registerPeerTools } from "../src/tools/register";

/**
 * What an extension host actually ends up holding after registration.
 *
 * The verbs themselves are tested in `tools-verbs.test.ts`, where they are plain
 * functions over data. What that file cannot see is the shape of the SURFACE —
 * how many tools got registered, and whether the operator commands leaked into
 * it. Those are claims about what a host receives, so they are asserted by
 * driving the real registration with a recording `ExtensionAPI`.
 *
 * A count is the only assertion that survives someone adding a verb: each verb's
 * own tests would keep passing, and a docblock would keep saying "four".
 */

interface Recorded {
	readonly tools: string[];
	readonly commands: string[];
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
	const api = {
		arktype: type,
		registerTool: (def: { name: string }) => void tools.push(def.name),
		registerCommand: (name: string) => void commands.push(name),
	};

	registerPeerTools(api as never, {
		selfId: "self",
		leaseDb: (() => undefined) as unknown as () => Database,
		inbox: (() => undefined) as unknown as () => InboxStore,
		roster: async () => [],
		deliver: async () => ({ delivered: 0, receipts: [] }),
	});

	registerPeerCommands(api as never, {
		currentName: () => "BlueLake",
		applyName: () => {},
		isNameTaken: () => false,
		roster: async () => [],
		notify: () => {},
	});

	return { tools, commands };
}

describe("the peer tool surface", () => {
	it("registers exactly four verbs", () => {
		// Mutation-checked both ways: adding a fifth fails this, and so does
		// removing one — which is what makes it a statement about the whole surface
		// rather than about any single name.
		const { tools } = recordSurface();
		expect(tools.slice().sort()).toEqual(["peer.list", "peer.lock", "peer.release", "peer.send"]);
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
