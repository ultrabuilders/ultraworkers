/**
 * Settings declared by this domain (see `config/registry.ts`). Declaration order is the
 * settings-panel order; `config/all-settings.ts` registers every domain.
 */
import { register } from "../config/registry";

/**
 * The three legal values.
 *
 * DECLARED HERE RATHER THAN IMPORTED, and that duplication is deliberate.
 * `@ultraworkers/peer` already depends on `@oh-my-pi/pi-coding-agent`
 * (`packages/peer/package.json`), so importing the fence's `INBOUND_POLICIES`
 * from this package would close a cycle — the very thing the peer package's
 * type-only `ExtensionAPI` import is careful to avoid.
 *
 * The two lists must agree, and {@link CFG_PEER_CROSS_SESSION_INBOUND_VALUES} is
 * the single place a host reads them; `packages/peer/test/fence-policy.test.ts`
 * asserts the agreement from the peer's side, so a drift here fails a test
 * rather than producing a settings panel whose values the fence rejects.
 */
const INBOUND_POLICY_VALUES = ["accept", "hold", "refuse"] as const;

/**
 * What to do with a message arriving from another agent.
 *
 * A peer message is INPUT, never AUTHORITY — it cannot approve a permission
 * prompt, cannot change configuration, and `/compact` inside a body is prose.
 * These three values are the user's decision about whether such a message is
 * acted on at all, and they are a SETTING rather than a tool precisely because
 * the decision belongs to the person and not to whichever agent is asking.
 *
 * Copied from Claude Code 2.1.288's own value set (`Wwt=["accept","hold",
 * "refuse"]`, read from the shipped binary at
 * `~/.local/share/claude/versions/2.1.288`) rather than invented.
 *
 * ## WHY UNSET IS A FOURTH STATE AND NOT A DEFAULT
 *
 * There is deliberately no `default:` here — an absent key resolves to
 * `undefined`, and `undefined` is NOT `accept`. `fenceInbound` treats unset as
 * "fall back to comparing the two sessions' permission classes", which holds
 * into a session that bypasses prompts and accepts into one that does not.
 * Declaring `"accept"` as the default would admit every peer message on a fresh
 * install by accident, and the difference is invisible until a message from
 * another machine lands in a session the user believed was guarded.
 *
 * `hold` refuses to act but keeps the message visible for review, and is the
 * value to reach for when the right answer depends on who is sending.
 */
export const CFG_PEER_CROSS_SESSION_INBOUND_VALUES = INBOUND_POLICY_VALUES;

export const cfgPeerCrossSessionInbound = register({
	id: "crossSessionInbound",
	type: "enum",
	values: INBOUND_POLICY_VALUES,
	default: undefined,
	ui: {
		tab: "interaction",
		group: "Peers",
		label: "Inbound Peer Messages",
		description:
			"What to do with a message arriving from another agent. A peer message is input, never authority: it cannot approve a permission prompt or change configuration. Unset compares the two sessions' permission classes instead of choosing for you",
		options: [
			{
				value: "accept",
				label: "Accept",
				description: "Act on inbound peer messages as agent-attributed input",
			},
			{
				value: "hold",
				label: "Hold",
				description: "Keep inbound peer messages for review without acting on them",
			},
			{
				value: "refuse",
				label: "Refuse",
				description: "Refuse inbound peer messages entirely; the sender is not asked to reconsider",
			},
		],
	},
});
