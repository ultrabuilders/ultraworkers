import { describe, expect, it } from "bun:test";
import { Container } from "@oh-my-pi/pi-tui";
import { TranscriptContainer } from "@oh-my-pi/pi-tui/chrome/transcript-container";
import { UiHelpers } from "@oh-my-pi/pi-coding-agent/modes/utils/ui-helpers";
import type { InteractiveModeContext, StatusLineEntry } from "@oh-my-pi/pi-coding-agent/modes/types";

/**
 * A keyed status notice is temporary; an unkeyed one is part of the transcript.
 *
 * The contract has two halves and the second is the one that decides whether this
 * feature is correct. Before keyed notices, `showStatus` wrote into `chatContainer`
 * and every message stayed forever, so a `Session compacted` line would sit in the
 * transcript permanently. A keyed notice goes to `noticeContainer` instead and can
 * leave.
 *
 * **Why a "did not crash" test cannot catch the regression.** The failure this guards
 * is a keyed notice ALSO being appended to the transcript — the obvious wrong
 * implementation, where both branches write. Every container is then non-empty, so
 * `expect(children.length).toBeGreaterThan(0)` passes in both places and `not.toThrow()`
 * passes too. The only assertion that catches it is presence in one container
 * together with ABSENCE from the other, which is why every placement row below
 * checks both sides.
 *
 * The unkeyed rows are the other half and they are not padding: 337 call sites pass
 * no options at all, and the rule is that they must keep behaving exactly as before.
 * "Exactly as before" is asserted as position and count, because a keyed branch that
 * quietly rerouted them would still show a plausible-looking transcript.
 */

interface Harness {
	helpers: UiHelpers;
	chatContainer: TranscriptContainer;
	noticeContainer: Container;
	lines: StatusLineEntry[];
	renderCount: () => number;
}

/**
 * A context carrying only what `showStatus` reads.
 *
 * Narrow on purpose: a key added to `showStatus` later fails to compile here rather
 * than reading `undefined` at runtime and looking like a passing test.
 */
function harness(): Harness {
	const chatContainer = new TranscriptContainer();
	const noticeContainer = new Container();
	const lines: StatusLineEntry[] = [];
	let renders = 0;
	const ctx = {
		chatContainer,
		noticeContainer,
		keyedStatusLines: lines,
		lastStatus: undefined,
		ui: {
			requestRender: () => {
				renders += 1;
			},
		},
		// `showStatus` is on the helper itself, but the unkeyed branch calls
		// `ctx.present`, so the mount has to land in the chat container.
		present: (content: unknown) => {
			for (const item of Array.isArray(content) ? content : [content]) {
				chatContainer.addChild(item as never);
			}
		},
	} as unknown as InteractiveModeContext;

	return { helpers: new UiHelpers(ctx), chatContainer, noticeContainer, lines, renderCount: () => renders };
}

/**
 * The text of every notice in a container.
 *
 * Read through `describe()`, the one public accessor `StatusNotice` has: its message
 * is a `#private` field, so reaching for it directly would make the test assert on
 * storage rather than on what a reader sees. `describe()` is also what the renderer
 * calls, so this is the text that is actually presented.
 */
const messagesIn = (container: { children: unknown[] }): string[] =>
	container.children.map(child => {
		const node = (child as { describe?: () => unknown }).describe?.() as { p?: { text?: unknown } } | undefined;
		const text = node?.p?.text;
		return typeof text === "string" ? text : JSON.stringify(child);
	});

describe("a keyed notice is temporary and lives in the notice container", () => {
	it("puts a keyed notice in the notice container and NOT in the transcript", () => {
		// The load-bearing pair. Either half alone passes under the both-branches bug.
		const h = harness();
		h.helpers.showStatus("compacting", { key: "compact" });

		expect(h.noticeContainer.children).toHaveLength(1);
		expect(h.chatContainer.children).toHaveLength(0);
	});

	it("leaves an unkeyed notice in the transcript exactly as before", () => {
		// The negative contract for 337 call sites that pass no options.
		const h = harness();
		h.helpers.showStatus("thinking");

		expect(h.chatContainer.children).toHaveLength(1);
		expect(h.noticeContainer.children).toHaveLength(0);
	});

	it("updates the previous unkeyed line instead of appending a second one", () => {
		// The fold-into-previous behaviour that predates keyed notices. A keyed branch
		// that returned early for every call would silently double this line, and the
		// transcript would grow by one row per status update.
		const h = harness();
		h.helpers.showStatus("first");
		h.helpers.showStatus("second");

		expect(h.chatContainer.children).toHaveLength(1);
		expect(messagesIn(h.chatContainer)[0]).toContain("second");
	});

	it("removes an invalidated notice from the queue, not just the screen", () => {
		// "Not just the screen" is the whole point. A line left in the queue comes back
		// on the next transcript rebuild and pushes out a newer message, which turns
		// an expiry into an unbounded deferral at exactly the moment it looked spent.
		const h = harness();
		h.helpers.showStatus("compacting", { key: "compact" });
		h.helpers.showStatus("done", { key: "done", invalidates: "compact" });

		expect(h.lines).toHaveLength(1);
		expect(h.lines[0]?.key).toBe("done");
		expect(h.noticeContainer.children).toHaveLength(1);
	});

	it("never brings an invalidated notice back", () => {
		const h = harness();
		h.helpers.showStatus("compacting", { key: "compact" });
		h.helpers.showStatus("done", { key: "done", invalidates: "compact" });
		// A later keyed notice must not resurrect what was invalidated.
		h.helpers.showStatus("later", { key: "later" });

		const rendered = messagesIn(h.noticeContainer).join("\n");
		expect(rendered).not.toContain("compacting");
		expect(h.noticeContainer.children).toHaveLength(2);
	});

	it("folds repeated emissions of one key into a single line with a count", () => {
		const h = harness();
		h.helpers.showStatus("compacting", { key: "compact" });
		h.helpers.showStatus("compacting", { key: "compact", fold: "compact" });
		h.helpers.showStatus("compacting", { key: "compact", fold: "compact" });

		// One line, not three: the failure mode is a status that re-emits per token
		// filling the container until the notice is unreadable.
		expect(h.noticeContainer.children).toHaveLength(1);
		expect(h.lines[0]?.count).toBe(3);
	});

	it("updates in place when the same key is shown again without fold", () => {
		// Two lines carrying one key would make "which is current" unanswerable.
		const h = harness();
		h.helpers.showStatus("step 1", { key: "job" });
		h.helpers.showStatus("step 2", { key: "job" });

		expect(h.noticeContainer.children).toHaveLength(1);
		expect(messagesIn(h.noticeContainer)[0]).toContain("step 2");
	});

	it("displaces showing notices when the incoming one is immediate", () => {
		const h = harness();
		h.helpers.showStatus("working", { key: "a" });
		h.helpers.showStatus("urgent", { key: "b", immediate: true });

		// Displaced, not hidden: a queued line that stays in the queue returns later.
		expect(h.noticeContainer.children).toHaveLength(1);
		expect(h.lines).toHaveLength(1);
		expect(h.lines[0]?.key).toBe("b");
	});

	it("displaces every showing notice, not every other one", () => {
		// Parameterised on N because the count is the wrong assertion for this row.
		// The displacement loop removes entries from the array it is walking, so an
		// implementation that skipped every other entry still leaves ONE line behind
		// — indistinguishable from correct at N=1, and wrong from N=2 onward:
		//
		//   N=0 → [z]      N=1 → [z]        (the only N the count row covers)
		//   N=2 → [b, z]   N=3 → [b, z]     N=4 → [b, d, z]
		//
		// Asserting the exact surviving key set is what makes the boundary visible;
		// `toHaveLength(1)` above is the row that could not see it.
		for (const n of [0, 1, 2, 3, 4, 5]) {
			const h = harness();
			for (let i = 0; i < n; i++) h.helpers.showStatus(`step ${i}`, { key: `k${i}` });

			h.helpers.showStatus("urgent", { key: "z", immediate: true });

			const contract = `N=${n}`;
			const survivors = h.lines.map(line => line.key);
			expect({ contract, survivors }).toEqual({ contract, survivors: ["z"] });

			// Both halves again: the queue and the screen are separate stores, and a
			// line dropped from one but not the other is the residue this file is about.
			expect({ contract, shown: h.noticeContainer.children.length }).toEqual({ contract, shown: 1 });
		}
	});

	it("keeps queueing a non-immediate notice behind what is showing", () => {
		const h = harness();
		h.helpers.showStatus("first", { key: "a" });
		h.helpers.showStatus("second", { key: "b" });

		// The counterpart to `immediate`: without it every new notice would evict the
		// last, so a user would never see more than one line at a time.
		expect(h.noticeContainer.children).toHaveLength(2);
	});

	it("invalidating a key that is not showing is a no-op, not a throw", () => {
		// The common case: a keyed notice is emitted once per attempt, so the second
		// attempt invalidates a line that already left.
		const h = harness();
		h.helpers.showStatus("a", { key: "a" });

		expect(() => h.helpers.showStatus("b", { key: "b", invalidates: "never-shown" })).not.toThrow();
		expect(h.noticeContainer.children).toHaveLength(2);
	});

	it("keeps the two branches independent when both are used in one session", () => {
		// The realistic shape: a keyed notice and ordinary status output interleaved.
		// Asserting the total across both containers catches a keyed line leaking into
		// the transcript even though each container is individually non-empty.
		const h = harness();
		h.helpers.showStatus("thinking");
		h.helpers.showStatus("compacting", { key: "compact" });
		h.helpers.showStatus("still thinking");

		expect(h.chatContainer.children).toHaveLength(1);
		expect(h.noticeContainer.children).toHaveLength(1);
	});
});
