import { describe, expect, it } from "bun:test";
import { compactAgentHistory } from "../../src/agent-history";
import { agentUsageEquals, createAgentCallUsageTracker, createEmptyAgentUsage, sumAgentUsage } from "../../src/agent-usage";
import { MAX_CONCURRENCY, WORKFLOW_HOME_RELATIVE_DIR, normalizeKeywordTriggerWord } from "../../src/config";

/**
 * Bead .13's support layer — the three modules copied this pass.
 *
 * The rule for which rows are here: each one defends a branch or a state transition that is
 * silent when it breaks. A constant that holds the right value proves nothing about the code
 * that reads it, so none of these rows assert a number for its own sake.
 */
describe("keyword trigger normalization", () => {
	it("refuses each shape that would arm on something other than a word", () => {
		// Four rejections, four different holes, and they are NOT interchangeable: an
		// agent that only rejected the empty string would still arm on "/", which is a
		// command prefix, never a trigger word.
		expect(normalizeKeywordTriggerWord(undefined)).toBeUndefined();
		expect(normalizeKeywordTriggerWord(42)).toBeUndefined();
		expect(normalizeKeywordTriggerWord("   ")).toBeUndefined();
		expect(normalizeKeywordTriggerWord("/workflow")).toBeUndefined();
		expect(normalizeKeywordTriggerWord("two words")).toBeUndefined();
		// And the accept path, so the rows above cannot pass by refusing everything.
		expect(normalizeKeywordTriggerWord("  workflow  ")).toBe("workflow");
	});

	it("keeps the home directory the one the paths helper reads", () => {
		// The fold that moved this constant out of `engine/paths` created two ways to
		// spell it. If these ever diverge, a migration reads from one tree and the new
		// code writes to another, and nothing errors — the files just are not there.
		expect(WORKFLOW_HOME_RELATIVE_DIR).toBe(".ultraworkers/workflows");
		expect(MAX_CONCURRENCY).toBeGreaterThan(0);
	});
});

describe("agent usage accounting", () => {
	it("folds an estimate into the sum as a fact about the sum, not about one record", () => {
		// `estimated` is OR-ed, deliberately: one estimated agent must mark the WHOLE
		// total estimated. Summing it, or letting the last record win, would let a single
		// exact agent hide an estimate behind it — and the UI's "~" prefix is the only
		// signal a reader gets that the number was not metered.
		const exact = { ...createEmptyAgentUsage(), total: 100 };
		const guessed = { ...createEmptyAgentUsage(), total: 50, estimated: true };
		expect(sumAgentUsage(exact, guessed).estimated).toBe(true);
		expect(sumAgentUsage(guessed, exact).estimated).toBe(true);
		// Order-independent in both directions, so the row cannot pass on one ordering.
		expect(sumAgentUsage(exact, exact).estimated).toBeUndefined();
	});

	it("treats clearing an estimate as a change, even when the numbers are identical", () => {
		// The failure this defends: an attempt first reports an estimate, then the real
		// figures arrive with the SAME numbers. If `estimated` were not part of the
		// value's identity, no update is emitted and the stale "~" never clears — the run
		// reports itself as an estimate forever after it stopped being one.
		const guessed = { ...createEmptyAgentUsage(), total: 100, estimated: true };
		const exact = { ...createEmptyAgentUsage(), total: 100 };
		expect(agentUsageEquals(guessed, exact)).toBe(false);
		expect(agentUsageEquals(exact, exact)).toBe(true);
	});

	it("ignores a late callback from an attempt that a newer one already replaced", () => {
		// The failure this defends: a retry starts, and the FIRST attempt's streaming
		// callback lands afterwards. Without the attempt id check it commits into the
		// total a second time, and the run reports more tokens than it ever spent.
		const updates: Array<{ tokenUsage: ReturnType<typeof createEmptyAgentUsage> }> = [];
		const tracker = createAgentCallUsageTracker(update => updates.push(update));

		const first = tracker.startAttempt();
		first.reportTerminal({ ...createEmptyAgentUsage(), total: 30 });

		// A retry begins — this is what makes the first attempt stale.
		const second = tracker.startAttempt();
		second.reportTerminal({ ...createEmptyAgentUsage(), total: 10 });
		second.commitTerminalUsage();

		// The first attempt's late commit must contribute nothing.
		first.commitTerminalUsage();

		const committed = updates.at(-1)?.tokenUsage.total;
		expect(committed).toBe(10);
	});

	it("does not commit the same attempt twice", () => {
		// The other half of the guard, and the half a stale-callback row cannot reach.
		//
		// Measured: removing `!closed` from `isOpen` while every other row still passed —
		// the late-callback row survives that mutation, because a REPLACED attempt is caught
		// by the attempt id. What only `!closed` prevents is committing ONE attempt twice,
		// which double-counts it into the run total.
		const updates: Array<{ tokenUsage: ReturnType<typeof createEmptyAgentUsage> }> = [];
		const tracker = createAgentCallUsageTracker(update => updates.push(update));
		const attempt = tracker.startAttempt();
		attempt.reportTerminal({ ...createEmptyAgentUsage(), total: 30 });

		expect(attempt.commitTerminalUsage().tokens).toBe(30);
		// A second commit of the same attempt must add nothing and must not re-report.
		expect(attempt.commitTerminalUsage().tokens).toBe(0);
		expect(updates.at(-1)?.tokenUsage.total).toBe(30);
	});

	it("does not mutate the records it sums", () => {
		// `sumAgentUsage` takes a caller-owned accumulator in every other implementation
		// of this shape. Folding into the first argument would corrupt a persisted
		// record that is still referenced elsewhere.
		const first = { ...createEmptyAgentUsage(), total: 5 };
		const second = { ...createEmptyAgentUsage(), total: 7 };
		sumAgentUsage(first, second);
		expect(first.total).toBe(5);
		expect(second.total).toBe(7);
	});
});

describe("agent history compaction", () => {
	it("charges an edit diff against the same total budget as its text", () => {
		// The failure this defends: a large changed file rides in `details.diff`, which is
		// not the entry's `text`. If only `text` were counted, an edit of a 500 KB file
		// would pass compaction untouched and defeat the entire bound — the entry that
		// grows the history most is the one exempt from the limit.
		const huge = "d".repeat(5000);
		const messages = [
			{ role: "assistant", content: [{ type: "text", text: "editing" }] },
			{ role: "toolResult", toolName: "edit", content: [{ type: "text", text: "done" }], details: { diff: huge } },
		];
		const entries = compactAgentHistory(messages, { maxTotalChars: 500 });
		const totalChars = entries.reduce((sum, entry) => sum + entry.text.length + (entry.diff?.length ?? 0), 0);
		expect(totalChars).toBeLessThanOrEqual(500);
	});

	it("keeps a write's source instead of its JSON envelope", () => {
		// The failure this defends: a write's arguments are `{"path":…,"content":"…"}`, and
		// compaction can cut that envelope mid-string into invalid JSON. The reference keeps
		// the raw source so the pager can render it; a rewrite that "tidied" this into
		 // JSON.stringify would produce unreadable fragments instead.
		const source = 'line one\nline "two"\nline three';
		const entries = compactAgentHistory([
			{
				role: "assistant",
				content: [
					{
						type: "toolCall",
						name: "write",
						arguments: { path: "/tmp/a.ts", content: source },
					},
				],
			},
		]);
		expect(entries[0]?.text).toBe(source);
		expect(entries[0]?.path).toBe("/tmp/a.ts");
	});

	it("drops the oldest entries first when the count bound bites", () => {
		// Direction matters: keeping the newest is the point of compaction, so a row that
		 // only counted entries would pass an implementation that kept the OLDEST ones.
		const messages = Array.from({ length: 10 }, (_, i) => ({
			role: "user",
			content: [{ type: "text", text: `message-${i}` }],
		}));
		const entries = compactAgentHistory(messages, { maxEntries: 3 });
		expect(entries).toHaveLength(3);
		expect(entries[0]?.text).toBe("message-7");
		expect(entries[2]?.text).toBe("message-9");
	});
});