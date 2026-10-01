import { describe, expect, test } from "bun:test";
import { renderBugSummaryPrompt } from "../../src/diagnostics/summary-prompt";

describe("renderBugSummaryPrompt", () => {
	// The template is the contract: pi's four sections and its closing constraint
	// are what make the output a report rather than a continuation.
	test("keeps the four report sections and the no-secrets constraint", () => {
		const out = renderBugSummaryPrompt({ conversation: "<conversation/>" });
		for (const heading of [
			"## What the user was doing",
			"## What went wrong",
			"## Steps to reproduce",
			"## Relevant details",
		]) {
			expect(out).toContain(heading);
		}
		expect(out).toContain("Do not include file contents, secrets, or credentials");
		expect(out).toContain("ONLY output the report");
	});

	test("carries the conversation through", () => {
		const out = renderBugSummaryPrompt({ conversation: "<conversation>the user said hello</conversation>" });
		expect(out).toContain("the user said hello");
	});

	// A blank hint must not leave an empty <user-report> block that reads as if
	// the user had said something.
	test("omits the user-report block when there is no hint", () => {
		expect(renderBugSummaryPrompt({ conversation: "<conversation/>" })).not.toContain("<user-report>");
		expect(renderBugSummaryPrompt({ conversation: "<conversation/>", hint: "   " })).not.toContain("<user-report>");
	});

	test("includes the hint when given", () => {
		expect(renderBugSummaryPrompt({ conversation: "<conversation/>", hint: "tests are flaky" })).toContain(
			"tests are flaky",
		);
	});

	// The notice is the only thing telling the model it is reading a tail. If it
	// were always rendered, an untruncated run would warn about nothing.
	test("renders the truncation notice only when messages were actually dropped", () => {
		const truncated = renderBugSummaryPrompt({
			conversation: "<conversation/>",
			totalMessages: 40,
			shownMessages: 10,
		});
		expect(truncated).toContain("only the last 10 of 40 messages are shown");

		const whole = renderBugSummaryPrompt({ conversation: "<conversation/>", totalMessages: 10, shownMessages: 10 });
		expect(whole).not.toContain("only the last");

		// Absent counts must not fabricate a notice either.
		const uncounted = renderBugSummaryPrompt({ conversation: "<conversation/>" });
		expect(uncounted).not.toContain("only the last");
	});
});