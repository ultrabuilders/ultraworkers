/**
 * `ctx.isProjectTrusted()` exists and answers, in both contexts.
 *
 * ## What this file has always been about
 *
 * Issue #7955: a legacy Pi extension's `session_start` handler crashed with
 * `ctx.isProjectTrusted is not a function`. The contract is **presence and
 * answerability** — the method must be on the context and must return a boolean
 * rather than throwing. Neither half depends on what the answer is, so the
 * assertions below are deliberately about shape, not value.
 *
 * ## What changed under WI-20, and why the value assertions went away
 *
 * This file used to assert `expect(ctx.isProjectTrusted()).toBe(true)` in both
 * cases. That was true because both call sites were the literal `() => true`.
 * WI-20 replaced the literal with the project's recorded decision, so those
 * assertions went red — and the bead required that to be *observed*, not
 * silently rewritten to whatever the new code returned.
 *
 * Asserting a specific value here would re-impose the mistake: it would pin this
 * file to one decision state and stop it guarding the #7955 regression at all.
 * The value contract now lives in `extension-context-project-trust.test.ts`,
 * which drives a real `Settings` through all three states. This file keeps the
 * orthogonal guarantee: the method is there, on both contexts, and answers.
 *
 * The runners here are built without a `Settings`, so the decision is
 * `undecided` and the answer is `false`. That is the honest reading of a context
 * with no settings layer, and it is why the cases below assert on the type of the
 * answer rather than the answer.
 */
import { describe, expect, it } from "bun:test";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type { ExtensionRuntime } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

function createRunner(): ExtensionRunner {
	const runtime = {
		pendingProviderRegistrations: [],
	} as unknown as ExtensionRuntime;
	return new ExtensionRunner([], runtime, "/tmp", { getCwd: () => "/tmp" } as never, {} as never);
}

describe("ExtensionRunner project-trust context (issue #7955)", () => {
	it("exposes isProjectTrusted() so Pi-authored extensions can seed SettingsManager", () => {
		const ctx = createRunner().createContext();
		// Regression: this method was missing, so pi-cliproxyapi-provider's
		// session_start handler crashed with "ctx.isProjectTrusted is not a function".
		expect(typeof ctx.isProjectTrusted).toBe("function");
		// Answerable rather than throwing. This is the second half of #7955: a
		// method that exists but raises when called fails the extension just as
		// hard as one that is missing, and reading a decision must not require a
		// settings layer to be present.
		expect(typeof ctx.isProjectTrusted()).toBe("boolean");
	});

	it("command context inherits isProjectTrusted()", () => {
		const ctx = createRunner().createCommandContext();
		expect(typeof ctx.isProjectTrusted).toBe("function");
		expect(typeof ctx.isProjectTrusted()).toBe("boolean");
	});

	it("answers identically on both contexts", () => {
		// The two call sites are separate code paths. If one consulted the trust
		// decision and the other did not, both would still be functions returning
		// booleans here — and that split is exactly the silent half-implementation
		// the bead's criterion (1) forbids.
		const runner = createRunner();
		expect(runner.createContext().isProjectTrusted()).toBe(runner.createCommandContext().isProjectTrusted());
	});
});
