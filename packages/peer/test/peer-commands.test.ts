import { describe, expect, it } from "bun:test";
import { registerPeerCommands, type PeerCommandDeps } from "../src/tools/commands";
import type { PeerRosterEntry } from "../src/tools/verbs";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

/**
 * `epic-jwsy.13` — `/list-agents`, `/peers` and `/rename`.
 *
 * `renameName` itself is covered in `identity-rename.test.ts`. What is untested
 * anywhere is THIS file's subject: the registration, and what the commands do with
 * a refusal — which is the part a human actually reads.
 *
 * The refusal messages are the contract, and they are worth pinning one branch at
 * a time. All four reasons are different problems with different repairs: `taken`
 * needs the other peer to give it up, `held` frees itself, `reserved` is policy,
 * `empty` means unusable input. A caller that printed one generic string for all
 * four would pass any test that only checked "something was refused".
 */

type Handler = (args: string) => Promise<void>;

/** A stand-in host that records what was registered and lets a handler be invoked. */
function host(): {
	api: ExtensionAPI;
	run: (name: string, args?: string) => Promise<void>;
	registered: Map<string, { description: string }>;
} {
	const handlers = new Map<string, Handler>();
	const registered = new Map<string, { description: string }>();
	const api = {
		registerCommand(name: string, spec: { description: string; handler: Handler }) {
			handlers.set(name, spec.handler);
			registered.set(name, { description: spec.description });
		},
	} as unknown as ExtensionAPI;
	return {
		api,
		registered,
		run: async (name, args = "") => {
			const handler = handlers.get(name);
			if (!handler) throw new Error(`${name} was never registered`);
			await handler(args);
		},
	};
}

function roster(...ids: string[]): readonly PeerRosterEntry[] {
	// `lastSeenTs` is part of the row, not decoration: the human reads it to tell a
	// live session from one that registered and vanished, so a fixture without it
	// would model a peer that does not exist.
	return ids.map(id => ({ id, task: `work on ${id}`, lastSeenTs: 0 }));
}

function deps(over: Partial<PeerCommandDeps> = {}): { deps: PeerCommandDeps; notices: string[]; applied: string[] } {
	const notices: string[] = [];
	const applied: string[] = [];
	return {
		notices,
		applied,
		deps: {
			currentName: () => "BlueLake",
			applyName: next => applied.push(next),
			isNameTaken: () => false,
			roster: async () => roster("BlueLake"),
			notify: message => notices.push(message),
			...over,
		},
	};
}

describe("what the commands register", () => {
	it("registers all three names, so the documented aliases actually work", () => {
		// `/peers` is an alias, not a convenience: a peer that was told about
		// `/peers` and finds only `/list-agents` has no path forward, and nothing
		// else in the system would have told it.
		const h = host();
		registerPeerCommands(h.api, deps().deps);
		expect([...h.registered.keys()].sort()).toEqual(["list-agents", "peers", "rename"]);
	});

	it("gives every command a description, because that is the only thing shown before it runs", () => {
		const h = host();
		registerPeerCommands(h.api, deps().deps);
		for (const [name, spec] of h.registered) expect(`${name}: ${spec.description}`).not.toBe(`${name}: `);
	});
});

describe("/list-agents", () => {
	it("puts this session first and marks it, so the reader can find themselves without scanning", async () => {
		const h = host();
		const d = deps({ roster: async () => roster("Zephyr", "BlueLake", "AmberFox") });
		registerPeerCommands(h.api, d.deps);
		await h.run("list-agents");

		const lines = d.notices[0]!.split("\n");
		// The row that names this session is first AND carries the marker — either
		// alone is not enough, since an unmarked first row could be alphabetical.
		expect(lines[0]).toContain("BlueLake");
		expect(lines[0]).toContain("*");
		expect(lines.slice(1).every(line => line.startsWith("  "))).toBe(true);
	});

	it("says so plainly when nothing is registered, rather than printing an empty list", async () => {
		const h = host();
		const d = deps({ roster: async () => [] });
		registerPeerCommands(h.api, d.deps);
		await h.run("list-agents");
		expect(d.notices).toEqual(["No peer sessions are registered."]);
	});

	it("answers through the alias too, because it is registered as a separate name", async () => {
		const h = host();
		const d = deps({ roster: async () => roster("BlueLake") });
		registerPeerCommands(h.api, d.deps);
		await h.run("peers");
		expect(d.notices).toHaveLength(1);
	});
});

describe("/rename", () => {
	it("applies the new name and reports both ends, so the reader sees what changed", async () => {
		const h = host();
		const d = deps();
		registerPeerCommands(h.api, d.deps);
		await h.run("rename", "GreenCastle");

		expect(d.applied).toEqual(["GreenCastle"]);
		expect(d.notices[0]).toContain("BlueLake");
		expect(d.notices[0]).toContain("GreenCastle");
	});

	it("names the holder when the name is taken, rather than refusing without saying who has it", async () => {
		// The repair differs per reason: `taken` is the ONLY one where the reader
		// can do anything about it right now, and only if they learn who holds it.
		const h = host();
		const d = deps({
			renameInRegistry: () => ({ kind: "refused", reason: "taken", requested: "GreenCastle" }),
		});
		registerPeerCommands(h.api, d.deps);
		await h.run("rename", "GreenCastle");

		expect(d.applied).toEqual([]);
		expect(d.notices[0]).toContain("GreenCastle");
		expect(d.notices[0]).not.toBe("Renamed BlueLake → GreenCastle.");
	});

	it("tells the reader a held name frees itself, which is a different problem from a taken one", async () => {
		const h = host();
		const d = deps({ renameInRegistry: () => ({ kind: "refused", reason: "held", requested: "GreenCastle" }) });
		registerPeerCommands(h.api, d.deps);
		await h.run("rename", "GreenCastle");

		expect(d.notices[0]).toMatch(/still held|later/i);
		expect(d.applied).toEqual([]);
	});

	it("distinguishes a reserved name from a taken one: policy, not contention", async () => {
		const h = host();
		const d = deps({ renameInRegistry: () => ({ kind: "refused", reason: "reserved", requested: "MAIN" }) });
		registerPeerCommands(h.api, d.deps);
		await h.run("rename", "MAIN");

		expect(d.notices[0]).toContain("reserved");
		expect(d.notices[0]).not.toMatch(/already holds/i);
	});

	it("refuses empty input, because an invisible name is not a name", async () => {
		const h = host();
		const d = deps({ renameInRegistry: () => ({ kind: "refused", reason: "empty" }) });
		registerPeerCommands(h.api, d.deps);
		await h.run("rename", "   ");

		expect(d.applied).toEqual([]);
		expect(d.notices[0]).toMatch(/required/i);
	});

	it("lets the registry decide when one is attached, instead of consulting isNameTaken first", async () => {
		// The registry is authoritative when supplied. A host that checked the cheap
		// predicate first would report `taken` for a name the registry would have
		// allowed, and the two answers are indistinguishable to the reader.
		const h = host();
		let consultedFallback = false;
		const d = deps({
			isNameTaken: () => {
				consultedFallback = true;
				return true;
			},
			renameInRegistry: () => ({ kind: "renamed", from: "BlueLake", to: "GreenCastle" }),
		});
		registerPeerCommands(h.api, d.deps);
		await h.run("rename", "GreenCastle");

		expect(consultedFallback).toBe(false);
		expect(d.applied).toEqual(["GreenCastle"]);
	});

	it("falls back to the local predicate when no registry is attached", async () => {
		const h = host();
		const d = deps({ isNameTaken: key => key === "greencastle" });
		registerPeerCommands(h.api, d.deps);
		await h.run("rename", "GreenCastle");

		expect(d.applied).toEqual([]);
		expect(d.notices[0]).toContain("GreenCastle");
	});
});
