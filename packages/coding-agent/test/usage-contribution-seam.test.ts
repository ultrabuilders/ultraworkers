/**
 * Contract: an extension-registered tool's nested model spend reaches the session
 * ledger, and a provider that never reported reasoning never gets a reasoning
 * count.
 *
 * Two failures met here. The task executor seeded `reasoningTokens: 0` into every
 * sub-task usage record, which is the exact shape leak `Usage.reasoningTokens`
 * documents against — "`undefined` means unknown, NOT zero". And the fold that
 * reads a tool result's spend tested `message.toolName === "task"`, so a tool
 * from an outside extension spent tokens that `/usage`, the status line, the ACP
 * usage update and `packages/stats` never saw.
 *
 * Everything here runs against the real loader, the real registry and a real
 * `SessionManager`, so a seam that accepted a registration and never consulted it
 * fails rather than passing for having been called.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { addUsageInto, emptyUsage, mergeUsage } from "@oh-my-pi/pi-catalog/usage-merge";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import type { Extension, ExtensionAPI } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import {
	addUsageReporter,
	clearUsageReporters,
	hasUsageReporter,
	reportedToolUsage,
	isUsage,
} from "@oh-my-pi/pi-coding-agent/tools/usage-reporter";
import type { Usage } from "@oh-my-pi/pi-catalog/usage-merge";

afterEach(() => {
	clearUsageReporters();
});

/** A record with every bucket, and none of the optional fields. */
function plainUsage(overrides: Partial<Usage> = {}): Usage {
	return { ...emptyUsage(), ...overrides };
}

/**
 * Load a real extension through the real factory, then install its reporters the
 * way `ExtensionRunner.initialize` does. The install loop is one call per
 * reporter; everything else is the production path.
 */
async function loadExtensionWithReporters(register: (api: ExtensionAPI) => void, name: string): Promise<Extension> {
	const ext = (await loadExtensionFromFactory(
		register as never,
		"/cwd",
		new EventBus(),
		new ExtensionRuntime(),
		name,
	)) as Extension;
	for (const { toolName, reporter } of ext.usageReporters) {
		addUsageReporter(ext.path, toolName, reporter);
	}
	return ext;
}

describe("usage accumulation across the four folds", () => {
	it("leaves reasoningTokens absent when no side ever reported one", () => {
		// The observable regression: `/usage` and every persisted sub-task record
		// used to carry `reasoningTokens: 0`, which reads as "the model thought for
		// zero tokens" when the truth is that the provider never said.
		const total = plainUsage({ input: 10, output: 20, totalTokens: 30 });
		addUsageInto(total, plainUsage({ input: 5, output: 7, totalTokens: 12 }));

		expect("reasoningTokens" in total).toBe(false);
		expect(total.input).toBe(15);
		expect(total.output).toBe(27);
	});

	it("sums reasoningTokens across the turns that reported it", () => {
		// The other direction: a provider that DOES report reasoning must have every
		// reported turn counted, and an omitting turn in between must neither reset
		// the running total nor be counted as zero. Two reporting sides are what
		// makes this distinguish a sum from a last-write-wins overwrite.
		const total = plainUsage();
		addUsageInto(total, plainUsage({ reasoningTokens: 40 }));
		addUsageInto(total, plainUsage());
		addUsageInto(total, plainUsage({ reasoningTokens: 2 }));

		expect(total.reasoningTokens).toBe(42);
	});

	it("keeps an optional group absent until a side populates it", () => {
		const total = plainUsage();
		addUsageInto(total, plainUsage({ cttl: { ephemeral5m: 100 } }));
		expect(total.cttl).toEqual({ ephemeral5m: 100 });

		addUsageInto(total, plainUsage({ cttl: { ephemeral1h: 40 } }));
		// Leaf-by-leaf: the 1h component appears without erasing the 5m one, which
		// is what a whole-group replacement would do.
		expect(total.cttl).toEqual({ ephemeral5m: 100, ephemeral1h: 40 });
	});

	it("treats contextTokens as a gauge rather than a flow", () => {
		// Occupancy, not billing: adding 1000-token turns would report a total no
		// turn ever billed, so the most recent authoritative reading is the total.
		const total = plainUsage({ contextTokens: 8000 });
		addUsageInto(total, plainUsage({ contextTokens: 9500 }));
		expect(total.contextTokens).toBe(9500);
	});

	it("derives a missing totalTokens from the buckets instead of counting zero", () => {
		// A provider that omits the field must not silently drop out of the token
		// totals the way `+= undefined` would.
		const total = plainUsage();
		addUsageInto(total, { input: 10, output: 20, cacheRead: 5, cacheWrite: 1 });
		expect(total.totalTokens).toBe(36);
	});

	// The row above passes `cacheWrite: 1` but only ever asserts the derived total,
	// so dropping `cacheWrite` from the accumulation left this file green — the
	// field is fed in and never checked. Every bucket and every cost bucket earns
	// its own assertion here, because a merge that silently drops one produces a
	// total that still looks plausible and a bill that is quietly short.
	it("accumulates every token bucket, not only the ones a total is derived from", () => {
		const total = plainUsage();
		addUsageInto(total, { input: 10, output: 20, cacheRead: 5, cacheWrite: 7 });

		expect(total.input).toBe(10);
		expect(total.output).toBe(20);
		expect(total.cacheRead).toBe(5);
		expect(total.cacheWrite).toBe(7);
	});

	it("accumulates every cost bucket", () => {
		const total = plainUsage();
		addUsageInto(total, {
			input: 1,
			cost: { input: 0.1, output: 0.2, cacheRead: 0.3, cacheWrite: 0.4, total: 1 },
		});

		expect(total.cost.input).toBeCloseTo(0.1);
		expect(total.cost.output).toBeCloseTo(0.2);
		expect(total.cost.cacheRead).toBeCloseTo(0.3);
		expect(total.cost.cacheWrite).toBeCloseTo(0.4);
		expect(total.cost.total).toBeCloseTo(1);
	});

	// `mergeUsage` is exported through the catalog barrel, so both operands are
	// public surface — but nothing outside this module imported it, and a mutant
	// that added `right` twice survived: a caller merging two halves would get
	// one half counted twice and the other not at all, and the result still looks
	// like a plausible Usage object.
	it("mergeUsage combines both operands rather than favouring one", () => {
		const left = plainUsage();
		addUsageInto(left, { input: 10, output: 20, cacheRead: 1, cacheWrite: 2 });
		const right = plainUsage();
		addUsageInto(right, { input: 100, output: 200, cacheRead: 3, cacheWrite: 4 });

		const merged = mergeUsage(left, right);

		expect(merged.input).toBe(110);
		expect(merged.output).toBe(220);
		expect(merged.cacheRead).toBe(4);
		expect(merged.cacheWrite).toBe(6);
	});

	it("mergeUsage leaves both operands untouched", () => {
		const left = plainUsage();
		addUsageInto(left, { input: 10 });
		const right = plainUsage();
		addUsageInto(right, { input: 100 });

		mergeUsage(left, right);

		expect(left.input).toBe(10);
		expect(right.input).toBe(100);
	});
});

describe("isUsage domain, not just shape", () => {
	// `typeof x === "number"` is a shape check, and it admits every figure that
	// cannot be taken back once it is in the accumulator.
	const wellFormed = {
		input: 10,
		output: 20,
		cacheRead: 5,
		cacheWrite: 1,
		totalTokens: 36,
		cost: { input: 0.1, output: 0.2, cacheRead: 0.05, cacheWrite: 0.01, total: 0.36 },
	};

	it("accepts a well-formed figure", () => {
		expect(isUsage(wellFormed)).toBe(true);
	});

	it("refuses NaN, which is the one that spreads silently", () => {
		// The accumulator is `left + right`, so one NaN makes every total after it
		// NaN for the rest of the session. Nothing reports it: a NaN renders as an
		// ordinary number in most views and simply reads as "no usage".
		for (const field of ["input", "output", "cacheRead", "cacheWrite", "totalTokens"] as const) {
			expect(isUsage({ ...wellFormed, [field]: Number.NaN })).toBe(false);
		}
		expect(isUsage({ ...wellFormed, cost: { ...wellFormed.cost, total: Number.NaN } })).toBe(false);
	});

	it("refuses infinities", () => {
		expect(isUsage({ ...wellFormed, input: Number.POSITIVE_INFINITY })).toBe(false);
		expect(isUsage({ ...wellFormed, cost: { ...wellFormed.cost, total: Number.POSITIVE_INFINITY } })).toBe(false);
		expect(isUsage({ ...wellFormed, cacheRead: Number.NEGATIVE_INFINITY })).toBe(false);
	});

	it("refuses negatives, so no reporter can subtract another's usage", () => {
		// A refund is a real thing to want, but it is not a negative token count:
		// admitting one here would make the total stop being the sum of anything.
		for (const field of ["input", "output", "cacheRead", "cacheWrite", "totalTokens"] as const) {
			expect(isUsage({ ...wellFormed, [field]: -1 })).toBe(false);
		}
		expect(isUsage({ ...wellFormed, cost: { ...wellFormed.cost, total: -0.01 } })).toBe(false);
	});

	it("refuses a negative buried in one cost bucket, not only the total", () => {
		// Checking only `cost.total` is the obvious half-fix: a negative input cost
		// with a plausible total passes, and the two disagree in the report.
		expect(isUsage({ ...wellFormed, cost: { ...wellFormed.cost, input: -5 } })).toBe(false);
		expect(isUsage({ ...wellFormed, cost: { ...wellFormed.cost, cacheWrite: -1 } })).toBe(false);
	});
});

describe("registerUsageReporter", () => {
	it("folds an extension tool's spend into the session ledger", async () => {
		await loadExtensionWithReporters(api => {
			api.registerUsageReporter("summarize", details => {
				const usage = (details as { usage?: Usage }).usage;
				return usage;
			});
		}, "/ext/summarize");

		const session = SessionManager.inMemory();
		session.appendMessage({ role: "user", content: "go", timestamp: 1 });
		session.appendMessage({
			role: "toolResult",
			toolCallId: "call_1",
			toolName: "summarize",
			content: [{ type: "text", text: "summary" }],
			details: { usage: plainUsage({ input: 900, output: 300, totalTokens: 1200 }) },
			isError: false,
			timestamp: 2,
		});

		// The user sees this number in `/usage`, the status line, and the ACP
		// usage update. Before the seam it was 0 for every tool but `task`.
		expect(session.getUsageStatistics()).toMatchObject({ input: 900, output: 300, totalTokens: 1200 });
	});

	it("attributes nothing for a tool with no reporter", async () => {
		// The negative half of the red gate: with the extension unregistered the
		// ledger must read exactly as it did before the seam existed.
		await loadExtensionWithReporters(api => {
			api.registerUsageReporter("summarize", details => (details as { usage?: Usage }).usage);
		}, "/ext/summarize");

		const session = SessionManager.inMemory();
		session.appendMessage({
			role: "toolResult",
			toolCallId: "call_1",
			toolName: "some_other_tool",
			content: [{ type: "text", text: "x" }],
			details: { usage: plainUsage({ input: 900, output: 300, totalTokens: 1200 }) },
			isError: false,
			timestamp: 1,
		});

		expect(session.getUsageStatistics()).toMatchObject({ input: 0, output: 0, totalTokens: 0 });
	});

	it("stops attributing once the reporter is disposed", async () => {
		const dispose = addUsageReporter("/ext/temp", "summarize", details => (details as { usage?: Usage }).usage);
		expect(reportedToolUsage("summarize", { usage: plainUsage({ input: 5 }) })).toMatchObject({ input: 5 });

		dispose();
		// Unloading an extension has to stop it contributing, or a dead extension's
		// tokens keep landing in a live ledger forever.
		expect(reportedToolUsage("summarize", { usage: plainUsage({ input: 5 }) })).toBeUndefined();
		expect(hasUsageReporter()).toBe(false);
	});

	it("still attributes the built-in task tool with no extension loaded", async () => {
		// The pre-seam behaviour, which must survive: the sub-agent ledger is core's
		// and does not depend on any extension being present.
		expect(reportedToolUsage("task", { usage: plainUsage({ input: 42, output: 8, totalTokens: 50 }) })).toMatchObject(
			{
				input: 42,
				output: 8,
			},
		);
		expect(reportedToolUsage("task", { notUsage: plainUsage() })).toBeUndefined();
	});

	it("refuses a second reporter for one tool, naming why", async () => {
		// The negative criterion. Silently letting the later registration win makes
		// the ledger's inflation depend on load order, and both reporters folding one
		// tool double-counts every token it spent.
		addUsageReporter("/ext/first", "summarize", () => undefined);
		expect(() => addUsageReporter("/ext/second", "summarize", () => undefined)).toThrow(
			/count the same tokens twice/,
		);
	});

	it("refuses a reporter that would double-count the built-in task tool", async () => {
		// Same double-count, reached through core's own reporter instead of an
		// extension's — the case a per-extension guard alone would miss.
		expect(() => addUsageReporter("/ext/greedy", "task", () => undefined)).toThrow(/core usage reporter/);
	});

	it("refuses a reporter that returns a malformed record instead of folding it", async () => {
		// A reporter is untrusted input. Absorbing a broken number silently would be
		// worse than a visibly short ledger, so the fold contributes nothing.
		addUsageReporter("/ext/broken", "summarize", () => ({ input: 10 }) as Usage);
		expect(reportedToolUsage("summarize", {})).toBeUndefined();
	});

	it("refuses a reporter that throws instead of failing the whole fold", async () => {
		addUsageReporter("/ext/throws", "summarize", () => {
			throw new Error("boom");
		});
		expect(reportedToolUsage("summarize", {})).toBeUndefined();
	});
});
