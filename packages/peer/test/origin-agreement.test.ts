/**
 * The four declarations of one three-field shape must agree.
 *
 * WHY FOUR COPIES EXIST AT ALL. `PeerOrigin` (here), `IrcOrigin`
 * (`@oh-my-pi/pi-tui/tools/irc`), and `CustomMessageOrigin` in both
 * `@oh-my-pi/pi-agent-core/compaction/messages` and
 * `@oh-my-pi/pi-tui/chat/messages` are structurally identical. They cannot be one
 * declaration: `pi-agent` depends on `pi-tui`, this package depends on
 * `pi-agent-core`, and every direction of reuse closes a package cycle. The same
 * reasoning is written out for `INBOUND_POLICIES` at
 * `packages/coding-agent/src/peer/settings.ts`, whose drift
 * `fence-policy.test.ts` already guards.
 *
 * So duplication is the deliberate trade — which means drift has to be caught by
 * something other than review. It is caught here, at compile time: the assertions
 * below fail `check:ts` the moment one copy gains a field the others lack. That is
 * the whole value of this file. Nothing about it needs to run.
 */

import { describe, expect, it } from "bun:test";
import type { CustomMessageOrigin as AgentOrigin } from "@oh-my-pi/pi-agent-core/compaction/messages";
import type { CustomMessageOrigin as TuiOrigin } from "@oh-my-pi/pi-tui/chat/messages";
import type { IrcOrigin } from "@oh-my-pi/pi-tui/tools/irc";
import type { PeerOrigin } from "../src/injection/index";

/**
 * The guard is a KEY-SET comparison whose failure value is `false`, and both
 * choices were found by mutation rather than by reasoning.
 *
 * **1. Mutual assignability does not work.** `{kind, from, session, trust?}` is
 * still assignable to `{kind, from, session?}`, so an *optional* extra field is
 * invisible to it. The first version of this file used assignability and adding
 * `trust?: number` to `IrcOrigin` left the typecheck green.
 *
 * **2. Returning `never` does not work either, and this is the dangerous one.**
 * The second version compared key sets and returned `never` on drift — but
 * `never extends true` is **satisfied**, so `Assert<never>` compiled silently.
 * A guard whose failure value is `never` cannot fail: it is the shape that looks
 * most like strictness and is completely inert. The failure has to be `false`,
 * which `extends true` actually rejects.
 *
 * Caught by adding a field to one copy and watching the gate stay green, twice,
 * for two different reasons. A drift test nobody has mutated is a comment.
 */
type SameKeys<A, B> = [Exclude<keyof A, keyof B>, Exclude<keyof B, keyof A>] extends [never, never] ? true : false;

/** Same keys, and every value type still lines up. */
type Agrees<A, B> = SameKeys<A, B> extends true ? ([A] extends [B] ? ([B] extends [A] ? true : false) : false) : false;
type Assert<T extends true> = T;

type PeerVsIrc = Assert<Agrees<PeerOrigin, IrcOrigin>>;
type PeerVsAgent = Assert<Agrees<PeerOrigin, AgentOrigin>>;
type PeerVsTui = Assert<Agrees<PeerOrigin, TuiOrigin>>;
type IrcVsTui = Assert<Agrees<IrcOrigin, TuiOrigin>>;
type AgentVsTui = Assert<Agrees<AgentOrigin, TuiOrigin>>;

/** Keeps the type aliases referenced so an unused-type lint cannot silence them. */
type _Checked = [PeerVsIrc, PeerVsAgent, PeerVsTui, IrcVsTui, AgentVsTui];

describe("provenance shapes agree", () => {
	it("accepts one another's values at runtime too", () => {
		// The compile-time assertions above are the real guard. This row exists
		// because a `bun test` run is the only thing most people execute, and a
		// file of type assertions alone would report nothing and look like it had
		// verified the claim. `kind` is the field the reader's decision turns on, so
		// it is the one worth pinning behaviourally: the two legal values, and
		// nothing else.
		const peer: PeerOrigin = { kind: "peer", from: "RedStone" };
		const irc: IrcOrigin = peer;
		const agent: AgentOrigin = irc;
		const tui: TuiOrigin = agent;

		expect(tui.kind).toBe("peer");
		expect(irc.kind).toBe("peer");
		// Absence is the user case, which is why `kind` is not required on the wire
		// types — a message written before provenance existed still reads correctly.
		const legacy = {} as IrcOrigin;
		expect(legacy.kind).toBeUndefined();
	});
});
