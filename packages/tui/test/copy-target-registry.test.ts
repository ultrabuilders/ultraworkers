/**
 * The copy-target seam: what an extension may add to the `/copy` picker's
 * target set, and what it may not.
 *
 * Three contracts, each with its own observable failure mode:
 *
 * 1. **A registered provider's blocks appear** in the picked turn, and disposing
 *    it puts the picker back to exactly what it showed before. If this regresses,
 *    the seam is decorative — the registration lands and nothing changes.
 * 2. **Core's own extraction survives** a provider. A seam that could displace
 *    built-in targets would be a foot-gun: an extension's bug would take away the
 *    user's fenced code and command blocks.
 * 3. **A malformed registration is refused with a reason.** A registration that
 *    is silently ignored is indistinguishable from one that never happened, which
 *    is exactly what made this surface unusable.
 *
 * The registry is process-wide, so every test clears it in `afterEach` — a leaked
 * provider would show up in whichever later file opens the copy picker.
 */
import { afterEach, describe, expect, it } from "bun:test";
import type { AgentMessage } from "@oh-my-pi/pi-agent-core";
import type { TranscriptEntryLike } from "../src/chat/transcript-entry";
import {
	clearCopyTargetProviders,
	collectProviderBlocks,
	listCopyTargetProviders,
	registerCopyTargetProvider,
	type CopyTargetBlock,
	type CopyTargetProvider,
} from "@oh-my-pi/pi-tui/overlays/copy-target-registry";
import { collectBlocks } from "@oh-my-pi/pi-tui/overlays/copy-selector";

afterEach(() => {
	clearCopyTargetProviders();
});

/** An assistant turn with one fenced code block, as a transcript entry. */
function assistantEntry(markdown: string): TranscriptEntryLike {
	return {
		type: "message",
		id: "e1",
		parentId: null,
		timestamp: new Date("2026-10-01T00:00:00Z").toISOString(),
		message: { role: "assistant", content: [{ type: "text", text: markdown }] } as unknown as AgentMessage,
	};
}

/** A provider that answers with the same blocks for every entry. */
function saying(id: string, blocks: readonly CopyTargetBlock[]): CopyTargetProvider {
	return { id, label: `${id} label`, collect: () => blocks };
}

const CWD = "/repo";

describe("a registered provider reaches the picked turn", () => {
	it("appends the provider's block after core's own, and disposal restores the pre-seam set", () => {
		const entry = assistantEntry("before\n```ts\nconst x = 1;\n```\nafter");
		const coreOnly = collectBlocks([entry], [], { cwd: CWD });
		// Establish the baseline the seam must not disturb.
		expect(coreOnly.map(block => block.label)).toEqual(["ts code"]);

		const dispose = registerCopyTargetProvider(
			saying("deploy-plan", [{ label: "deploy plan", content: "kubectl apply -f prod.yaml", kind: "command" }]),
		);
		const withProvider = collectBlocks([entry], listCopyTargetProviders(), { cwd: CWD });

		// The user's own fenced block is still there, first, and the contributed
		// one follows it — a provider appends rather than replaces.
		expect(withProvider.map(block => block.label)).toEqual(["ts code", "deploy plan"]);
		expect(withProvider[1]!.content).toBe("kubectl apply -f prod.yaml");

		// The negative contract: disposal returns the picker to core's own set,
		// so the seam cannot quietly become permanent.
		dispose();
		expect(collectBlocks([entry], listCopyTargetProviders(), { cwd: CWD }).map(block => block.label)).toEqual([
			"ts code",
		]);
	});

	it("stamps the contributing entry so a block always names the turn it came from", () => {
		const entry = assistantEntry("hello");
		registerCopyTargetProvider(saying("tickets", [{ label: "ticket", content: "PROJ-42" }]));
		const [block] = collectBlocks([entry], listCopyTargetProviders(), { cwd: CWD });
		// A provider supplies only label/content; provenance is core's. Without this
		// a custom tool's output could claim to be a user's message.
		expect(block!.entry).toBe(entry);
	});

	it("hands the provider the session cwd and the turn's entries", () => {
		const entry = assistantEntry("hi");
		const seen: { cwd: string; count: number }[] = [];
		registerCopyTargetProvider({
			id: "context",
			label: "context",
			collect: (_entry, context) => {
				seen.push({ cwd: context.cwd, count: context.entries.length });
				return undefined;
			},
		});
		collectBlocks([entry], listCopyTargetProviders(), { cwd: CWD });
		expect(seen).toEqual([{ cwd: CWD, count: 1 }]);
	});
});

describe("a provider that misbehaves cannot take the picker's targets with it", () => {
	it("skips a throwing provider and keeps core's blocks", () => {
		const entry = assistantEntry("```py\nprint(1)\n```");
		registerCopyTargetProvider({
			id: "explodes",
			label: "explodes",
			collect: () => {
				throw new Error("extension bug");
			},
		});
		// Without the guard the throw would abort `collectBlocks` mid-turn and the
		// user's own code block would never reach the picker.
		expect(collectBlocks([entry], listCopyTargetProviders(), { cwd: CWD }).map(block => block.label)).toEqual([
			"py code",
		]);
	});

	it("drops an unusable block and names the reason instead of showing it broken", () => {
		const entry = assistantEntry("```py\nprint(1)\n```");
		const dispose = registerCopyTargetProvider(
			saying("partial", [
				{ label: "kept", content: "ok" },
				{ label: "blank content", content: "" },
				{ label: "   ", content: "whitespace label" },
			]),
		);
		const contributed = collectProviderBlocks(entry, { entries: [entry], cwd: CWD }, listCopyTargetProviders());
		expect(contributed.blocks.map(block => block.label)).toEqual(["kept"]);
		// Both drops are reported with the provider that caused them — a silent drop
		// is what an extension author cannot debug.
		expect(contributed.rejected.map(r => r.provider)).toEqual(["partial", "partial"]);
		expect(contributed.rejected[0]!.reason).toContain("content must be a non-empty string");
		expect(contributed.rejected[1]!.reason).toContain("label must be a non-empty trimmed string");
		dispose();
	});
});

describe("a malformed registration is refused with a reason", () => {
	it("names the offender for a blank id, a blank label, and a missing collect()", () => {
		expect(() => registerCopyTargetProvider({ id: "  ", label: "x", collect: () => undefined })).toThrow(
			/id must be a non-empty trimmed string/,
		);
		expect(() => registerCopyTargetProvider({ id: "ok", label: "  ", collect: () => undefined })).toThrow(
			/"ok" must have a label/,
		);
		// @ts-expect-error — the negative contract is the rejection itself.
		expect(() => registerCopyTargetProvider({ id: "ok", label: "ok", collect: "nope" })).toThrow(
			/must provide collect\(\), got string/,
		);
	});

	it("refuses a duplicate id rather than letting one provider shadow another", () => {
		const dispose = registerCopyTargetProvider(saying("tickets", [{ label: "a", content: "a" }]));
		// Two providers sharing an id make every block ambiguous about its origin,
		// so the second registration must name itself instead of winning silently.
		expect(() => registerCopyTargetProvider(saying("tickets", [{ label: "b", content: "b" }]))).toThrow(
			/"tickets" is already registered/,
		);
		expect(listCopyTargetProviders().map(provider => provider.id)).toEqual(["tickets"]);
		dispose();
	});

	it("rejects a non-array collect() result without losing the other providers'", () => {
		const entry = assistantEntry("hi");
		registerCopyTargetProvider({
			id: "wrong-shape",
			label: "wrong shape",
			// @ts-expect-error — the negative contract is the rejection itself.
			collect: () => ({ label: "not an array" }),
		});
		registerCopyTargetProvider(saying("good", [{ label: "good", content: "ok" }]));
		const contributed = collectProviderBlocks(entry, { entries: [entry], cwd: CWD }, listCopyTargetProviders());
		expect(contributed.blocks.map(block => block.label)).toEqual(["good"]);
		expect(contributed.rejected[0]!.provider).toBe("wrong-shape");
	});
});
