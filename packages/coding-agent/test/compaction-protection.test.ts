/**
 * The `registerCompactionProtection` seam.
 *
 * Before it, both prune extension points were core-only: `protectedTools` had one
 * producer (the plan-file matcher) and `supersedeKey` one implementation
 * (`readToolSupersedeKey`, hardcoded to `read`). These assert the three contracts
 * that make the seam safe rather than merely present — that it changes pruning,
 * that removing it restores the exact prior behaviour, and that a contribution
 * which cannot be honoured is refused with a reason instead of vanishing.
 */
import { afterEach, describe, expect, it } from "bun:test";
import type { ProtectedToolContext } from "@oh-my-pi/pi-agent-core/compaction/tool-protection";
import {
	addCompactionProtection,
	clearCompactionProtection,
	compactionProtectedTools,
	compactionSupersedeKey,
	hasCompactionProtection,
} from "@oh-my-pi/pi-coding-agent/tools/compaction-protection";

afterEach(() => {
	clearCompactionProtection();
});

describe("compaction protection registry", () => {
	it("reports an empty seam when no extension contributes, so a host without one is indistinguishable from core alone", () => {
		expect(hasCompactionProtection()).toBe(false);
		expect(compactionProtectedTools()).toEqual([]);
		// The key chain must return the SAME undefined it did pre-seam, not a wrapper
		// that merely happens to answer undefined — a wrapper would be consulted on
		// every candidate and could start answering later.
		expect(compactionSupersedeKey(undefined)).toBeUndefined();
	});

	it("makes a registered matcher visible to the prune pass, and removes it again on dispose", () => {
		const protects = (context: ProtectedToolContext): boolean => context.toolCall?.name === "mine";
		const dispose = addCompactionProtection("/ext/a.ts", { protectedTools: [protects] });

		expect(hasCompactionProtection()).toBe(true);
		expect(compactionProtectedTools()).toEqual([protects]);

		dispose();
		// The red gate: once released, the pass sees exactly what it saw before the
		// extension ever loaded — no stale matcher pinning context after unload.
		expect(hasCompactionProtection()).toBe(false);
		expect(compactionProtectedTools()).toEqual([]);
	});

	it("returns the core key untouched when core has one and no extension does", () => {
		const coreKey = (toolName: string): string | undefined => (toolName === "read" ? "p" : undefined);
		// Identity, not merely equal behaviour: the prune pass keys off this function
		// directly, and an unnecessary wrapper is a per-candidate cost core never paid.
		expect(compactionSupersedeKey(coreKey)).toBe(coreKey);
	});

	it("chains an extension key after core's, so core answers for read and the extension answers for its own tool", () => {
		const coreKey = (toolName: string): string | undefined => (toolName === "read" ? "core-path" : undefined);
		const dispose = addCompactionProtection("/ext/a.ts", {
			supersedeKey: (toolName, args) => (toolName === "mine" ? `id:${String(args.id)}` : undefined),
		});

		const chained = compactionSupersedeKey(coreKey);
		expect(chained).toBeDefined();
		// Core still wins for `read` — an extension must not be able to redefine a
		// tool it does not own just by registering first.
		expect(chained?.("read", {})).toBe("core-path");
		// And it answers for its own, which core cannot.
		expect(chained?.("mine", { id: 7 })).toBe("id:7");
		// A tool neither knows about yields no opinion rather than a fabricated key.
		expect(chained?.("other", {})).toBeUndefined();

		dispose();
		expect(compactionSupersedeKey(coreKey)).toBe(coreKey);
	});

	it("keeps each extension's contribution separate, so releasing one leaves the other protecting", () => {
		const a = (context: ProtectedToolContext): boolean => context.toolCall?.name === "a";
		const b = (context: ProtectedToolContext): boolean => context.toolCall?.name === "b";
		const disposeA = addCompactionProtection("/ext/a.ts", { protectedTools: [a] });
		addCompactionProtection("/ext/b.ts", { protectedTools: [b] });

		disposeA();
		// Unloading one extension must not disarm another: the registry is keyed by
		// the extension that caused each contribution, not cleared wholesale.
		expect(compactionProtectedTools()).toEqual([b]);
	});

	describe("rejects a contribution it cannot honour, naming the extension", () => {
		it("refuses a matcher that would protect every result, because that defeats compaction entirely", () => {
			// A `() => true` matcher pins the whole context: the pass could never free
			// anything and the session would grow without bound. Accepting it silently
			// would be worse than refusing, so it is refused BY NAME.
			expect(() => addCompactionProtection("/ext/greedy.ts", { protectedTools: [() => true] })).toThrow(
				/\/ext\/greedy\.ts[\s\S]*every result/,
			);
			// And nothing was installed: a refused registration must leave no trace,
			// so a later correct contribution from the same extension still works.
			expect(hasCompactionProtection()).toBe(false);
		});

		it("refuses a matcher that is neither a tool name nor a predicate", () => {
			expect(() => addCompactionProtection("/ext/bad.ts", { protectedTools: [42 as unknown as string] })).toThrow(
				/\/ext\/bad\.ts[\s\S]*tool name or a predicate/,
			);
			expect(hasCompactionProtection()).toBe(false);
		});

		it("refuses a non-callable supersedeKey rather than skipping it at prune time", () => {
			expect(() =>
				addCompactionProtection("/ext/bad.ts", {
					supersedeKey: "nope" as unknown as (toolName: string) => string | undefined,
				}),
			).toThrow(/\/ext\/bad\.ts[\s\S]*supersedeKey must be a function/);
			expect(hasCompactionProtection()).toBe(false);
		});

		it("accepts a predicate that is not unconditionally true, since it can decline", () => {
			const dispose = addCompactionProtection("/ext/fine.ts", {
				protectedTools: [context => context.toolCall?.name === "mine"],
			});
			expect(hasCompactionProtection()).toBe(true);
			dispose();
		});
	});
});
