/**
 * Coverage for the harness logic ported from `pi`.
 *
 * `pi` ships `packages/evals/test/harness.test.ts`. It is NOT skipped — an earlier
 * bead note said it was, which is wrong — but it cannot be copied whole: it
 * imports `vitest-evals` for the runner cases and builds a real pi system prompt
 * through `buildSystemPrompt` / `getReadmePath` / `getDocsPath` / `getExamplesPath`,
 * none of which exist under those names here.
 *
 * So this ports the cases that stand on their own and records what was left
 * behind. What is deliberately NOT reproduced:
 *
 * - `createPiDocumentationEvalHarness()` must refuse outside a container sandbox.
 *   That guard lives in the unported runner; asserting it here would assert
 *   nothing, so it waits with the code it protects.
 * - the row that strips docs from a real pi prompt. This file builds an
 *   equivalent prompt from its markers instead, which exercises the same
 *   contract — only the documentation section goes, rules and cwd survive — and
 *   does not pretend to be the integration check it replaces.
 */
import { describe, expect, it } from "bun:test";
import {
	applyIsolatedEnvironment,
	excludePiDocumentation,
	resolveDocumentationVariant,
	resolveModelSelection,
	verifySystemPrompt,
} from "../src/harness";

/** A prompt carrying the three sections `excludePiDocumentation` keys on. */
const PROMPT_WITH_DOCS = [
	"Base instructions.",
	"<rules>",
	"rule one",
	"</rules>",
	"<docs>",
	"Pi documentation (read only)",
	"docs/models.md",
	"</docs>",
	"<cwd>",
	"/workspace",
	"</cwd>",
].join("\n");

describe("resolveModelSelection", () => {
	it("prefers an explicit harness model", () => {
		expect(
			resolveModelSelection(
				{ provider: "anthropic", id: "claude-opus-4-6" },
				{ PI_PROVIDER: "openai-codex", PI_MODEL: "gpt-5.6-sol" },
			),
		).toEqual({ provider: "anthropic", id: "claude-opus-4-6" });
	});

	it("uses trimmed environment defaults", () => {
		expect(resolveModelSelection(undefined, { PI_PROVIDER: " openai-codex ", PI_MODEL: " gpt-5.6-sol " })).toEqual({
			provider: "openai-codex",
			id: "gpt-5.6-sol",
		});
	});

	// One row per shape, because they fail for different reasons: no provider at
	// all, a provider with no model, and a model with no provider. A single
	// "rejects incomplete" row would pass whichever branch happened to run.
	it("rejects a selection with neither provider nor model", () => {
		expect(() => resolveModelSelection(undefined, {})).toThrow("Select a harness model explicitly");
	});

	it("rejects a provider with no model", () => {
		expect(() => resolveModelSelection(undefined, { PI_PROVIDER: "openai-codex" })).toThrow(
			"Select a harness model explicitly",
		);
	});

	it("rejects a model with no provider", () => {
		expect(() => resolveModelSelection(undefined, { PI_MODEL: "gpt-5.6-sol" })).toThrow(
			"Select a harness model explicitly",
		);
	});
});

describe("applyIsolatedEnvironment", () => {
	it("removes runner metadata and restores the process environment", () => {
		// The restore closure is the contract: an eval that leaks HOME or a stale
		// PI_EVAL_* into the rest of the suite is worse than one that never ran.
		process.env.PI_EVAL_VARIANT = "with_docs";
		process.env.PI_EVAL_ARTIFACT_DIR = "/tmp/artifacts";
		// An unrelated variable, to pin the other half of the contract. Without it
		// the row is one-sided: a version that deleted the ENTIRE environment would
		// still satisfy "PI_EVAL_* are gone". Isolation replaces three variables; it
		// does not wipe the process.
		process.env.PI_EVALS_UNRELATED_PROBE = "keep-me";
		const oldHome = process.env.HOME;
		try {
			const restore = applyIsolatedEnvironment("/tmp/eval-home", "/tmp/eval-agent");
			try {
				expect(process.env.HOME).toBe("/tmp/eval-home");
				expect(process.env.PI_CODING_AGENT_DIR).toBe("/tmp/eval-agent");
				expect(process.env.PI_EVAL_VARIANT).toBeUndefined();
				expect(process.env.PI_EVAL_ARTIFACT_DIR).toBeUndefined();
				expect(process.env.PI_EVALS_UNRELATED_PROBE).toBe("keep-me");
			} finally {
				restore();
			}
			expect(process.env.HOME).toBe(oldHome);
			expect(process.env.PI_EVAL_VARIANT).toBe("with_docs");
			expect(process.env.PI_EVAL_ARTIFACT_DIR).toBe("/tmp/artifacts");
			expect(process.env.PI_EVALS_UNRELATED_PROBE).toBe("keep-me");
		} finally {
			delete process.env.PI_EVAL_VARIANT;
			delete process.env.PI_EVAL_ARTIFACT_DIR;
			delete process.env.PI_EVALS_UNRELATED_PROBE;
			delete process.env.PI_CODING_AGENT_DIR;
		}
	});
});

describe("resolveDocumentationVariant", () => {
	it("accepts without_docs", () => {
		expect(resolveDocumentationVariant("without_docs")).toBe("without_docs");
	});

	it("accepts with_docs", () => {
		expect(resolveDocumentationVariant("with_docs")).toBe("with_docs");
	});

	it("rejects an unset variant", () => {
		expect(() => resolveDocumentationVariant(undefined)).toThrow("PI_EVAL_VARIANT");
	});

	it("rejects an empty variant", () => {
		expect(() => resolveDocumentationVariant("")).toThrow("PI_EVAL_VARIANT");
	});

	it("rejects an unknown variant", () => {
		expect(() => resolveDocumentationVariant("other")).toThrow("PI_EVAL_VARIANT");
	});
});

describe("excludePiDocumentation", () => {
	it("removes only the documentation section", () => {
		const stripped = excludePiDocumentation(PROMPT_WITH_DOCS);

		expect(stripped).not.toContain("<docs>");
		expect(stripped).not.toContain("Pi documentation");
		expect(stripped).not.toContain("docs/models.md");
		// Everything outside the markers has to survive, or the strip is a deletion.
		expect(stripped).toContain("Base instructions.");
		expect(stripped).toContain("<rules>");
		expect(stripped).toContain("rule one");
		expect(stripped).toContain("<cwd>");
		expect(stripped).toContain("/workspace");
	});

	it("fails closed when the prompt has no documentation section", () => {
		// Silence here would ship an eval that quietly measures an unmodified prompt.
		expect(() => excludePiDocumentation("Instructions")).toThrow("no Pi documentation section");
	});

	it("fails closed when the documentation section is not closed", () => {
		expect(() => excludePiDocumentation("\n<docs>\nPi documentation\n")).toThrow(
			"no complete Pi documentation section",
		);
	});

	it("fails closed when there is no working-directory section to anchor the strip", () => {
		expect(() => excludePiDocumentation("\n<docs>\nPi documentation\n</docs>")).toThrow(
			"no working-directory section",
		);
	});
});

describe("verifySystemPrompt", () => {
	it("accepts a prompt that matches the variant", () => {
		const stripped = excludePiDocumentation(PROMPT_WITH_DOCS);

		expect(verifySystemPrompt(stripped, { name: "without_docs", expectedPiDocumentation: false })).toBe(stripped);
	});

	it("accepts a prompt that still carries its documentation", () => {
		expect(verifySystemPrompt(PROMPT_WITH_DOCS, { name: "with_docs", expectedPiDocumentation: true })).toBe(
			PROMPT_WITH_DOCS,
		);
	});

	it("rejects a prompt whose documentation does not match the variant", () => {
		expect(() =>
			verifySystemPrompt(PROMPT_WITH_DOCS, { name: "without_docs", expectedPiDocumentation: false }),
		).toThrow("does not match");
	});

	it("rejects a prompt that lost its rules", () => {
		expect(() =>
			verifySystemPrompt("no markers at all", { name: "with_docs", expectedPiDocumentation: true }),
		).toThrow("lost its rules");
	});

	it("checks nothing when no expectation was declared", () => {
		// Distinct branch: with the expectation undefined the function returns before
		// any inspection, so a prompt stripped of everything still passes.
		expect(verifySystemPrompt("bare", { name: "any" })).toBe("bare");
	});
});
