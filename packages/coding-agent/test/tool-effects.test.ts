import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveApproval, type ApprovalSubject } from "@oh-my-pi/pi-coding-agent/tools/approval";
import {
	declaredEffects,
	declareToolEffects,
	resolveEffectFloor,
	type ToolEffect,
} from "@oh-my-pi/pi-coding-agent/tools/effects";

/**
 * A declared effect is a floor the user may raise, and nothing else.
 *
 * The failure this prevents is specific and already documented in
 * `docs/approval-mode.md`: `eval` declares the `exec` tier and can still spawn a
 * shell, so a `bash.patterns` deny does not reach the same command run through
 * `eval`. A user who wants that shell gated has to discover the gap and write a
 * second hand-written policy. With effects, the tool declares what it reaches once
 * and the user writes one policy for the resource.
 *
 * Every case below is stated as the combination rule rather than as a lookup:
 * "any matching `deny` wins, otherwise any matching `prompt` wins", borrowed from
 * the bash resolver so there is one rule and not two. The ordering is the safety
 * property — an effect can only ever *narrow*.
 */

const subject = (name: string, extra: Partial<ApprovalSubject> = {}): ApprovalSubject =>
	({
		name,
		approval: () => "exec",
		formatApprovalDetails: () => name,
		...extra,
	}) as ApprovalSubject;

describe("declared effects", () => {
	// The declaration table is process-wide with no removal API, so these cases use
	// names no other test or extension uses. A shared name would leak across files.

	it("carries no effects for a tool that declares none", () => {
		// The negative case that keeps the feature honest: a tool that says nothing is
		// unconstrained. If this ever returned something, every tool would inherit a
		// floor nobody asked for.
		expect(declaredEffects("a-tool-that-does-not-exist").size).toBe(0);
	});

	it("merges a later declaration instead of replacing the first", () => {
		// Two extensions contributing to one tool name is legitimate. A replace would
		// silently drop the earlier declaration, and the dropped effect is exactly the
		// one nobody re-tests because its author believed it was registered.
		declareToolEffects("ext-tool-a", ["network"]);
		declareToolEffects("ext-tool-a", ["fs-write"]);

		expect([...declaredEffects("ext-tool-a")].sort()).toEqual(["fs-write", "network"]);
	});

	it("refuses an unknown effect rather than storing a string nothing will match", () => {
		// A typo that stored successfully would produce a tool that looks protected and
		// is not — the dangerous direction, because the declaration is the evidence.
		expect(() => declareToolEffects("ext-tool-b", ["filesystem" as ToolEffect])).toThrow(/Unknown tool effect/);
	});
});

describe("the effect floor only ever narrows", () => {
	it("a deny wins over a prompt on another effect, whatever the order", () => {
		// Iteration order over a Set is insertion order, so a table that took the first
		// match would answer `prompt` here whenever the prompt was declared first.
		const effects = new Set<ToolEffect>(["network", "subprocess"]);
		expect(resolveEffectFloor(effects, { network: "prompt", subprocess: "deny" })).toEqual({
			policy: "deny",
			effect: "subprocess",
		});
		expect(
			resolveEffectFloor(new Set<ToolEffect>(["subprocess", "network"]), {
				network: "prompt",
				subprocess: "deny",
			}),
		).toEqual({ policy: "deny", effect: "subprocess" });
	});

	it("an `allow` on an effect unlocks nothing", () => {
		// The narrowing property stated directly. A per-tool `tools.approval.bash:
		// allow` is a real grant, so `effects: { subprocess: allow }` reads like one
		// too; if it were honoured it would become a way to switch off the very gate
		// the effect exists to provide. Ignored is the only safe reading — the floor
		// is raised by `deny`/`prompt` and nothing lowers it.
		expect(resolveEffectFloor(new Set<ToolEffect>(["subprocess"]), { subprocess: "allow" })).toBeUndefined();
		expect(resolveApproval(subject("bash"), {}, "write", { effects: { subprocess: "allow" } }).policy).not.toBe(
			"deny",
		);
	});

	it("ignores an effect the tool does not declare", () => {
		// A user policy for `network` must not constrain a tool that never declared it,
		// or adding a policy would break unrelated tools.
		expect(resolveEffectFloor(new Set<ToolEffect>(["fs-read"]), { network: "deny" })).toBeUndefined();
	});
});

describe("resolveApproval honours the declared floor", () => {
	it("denies a declared effect even under yolo", () => {
		// The load-bearing case. Evaluated after the mode branch it would never once
		// apply, because `yolo` allows everything — and `yolo` is exactly the mode
		// where a user still expects the policy they wrote to hold.
		const resolved = resolveApproval(subject("bash"), {}, "yolo", { effects: { subprocess: "deny" } });

		expect(resolved.policy).toBe("deny");
		expect(resolved.policyKey).toBe("effects.subprocess");
	});

	it("prompts for a declared effect under yolo when the tool states no policy", () => {
		const resolved = resolveApproval(subject("read"), {}, "yolo", { effects: { "fs-read": "prompt" } });

		expect(resolved.policy).toBe("prompt");
	});

	it("leaves a tool that declares no matching effect on its existing path", () => {
		// Without this the feature could pass by denying everything: the negative
		// direction that matters is that an unrelated policy changes nothing.
		const resolved = resolveApproval(subject("read"), {}, "yolo", { effects: { subprocess: "deny" } });

		expect(resolved.policy).toBe("allow");
	});

	it("does not override a tool's own allow", () => {
		// The tool knows more about the call than the resource does. Narrowing means
		// the user's policy still applies; it does not mean the declaration outranks
		// the tool's own decision about its own arguments.
		const resolved = resolveApproval(
			subject("bash", { approval: () => ({ tier: "exec", policy: "allow" }) }),
			{},
			"yolo",
			{
				effects: { subprocess: "prompt" },
			},
		);

		expect(resolved.policy).toBe("allow");
	});
});

describe("the limitation is documented, because a lost caveat is a false promise", () => {
	const docPath = path.resolve(import.meta.dir, "../../../docs/approval-mode.md");

	it("says an effect is a declaration and not containment", () => {
		// Read as text rather than grepped out of the source: this asserts a published
		// document says the thing, which is the contract a reader depends on. If the
		// caveat is dropped, a user reads "declared effects are enforced" as sandboxing
		// and extends an approval policy further than it reaches.
		const doc = fs.readFileSync(docPath, "utf8");

		expect(doc).toMatch(/effect/i);
		expect(doc).toMatch(/not (process or )?filesystem containment/i);
	});
});
