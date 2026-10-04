/**
 * Render the bug-summary prompt.
 *
 * The transcript and the user's hint are the only two things that vary, and both
 * arrive as already-serialized text — this module assembles a prompt, it does not
 * read files or build strings. The template itself is `prompts/diagnostics/
 * bug-summary.md`; AGENTS.md forbids building prompts in code.
 */

import { prompt } from "@oh-my-pi/pi-utils";
import bugSummaryTemplate from "../prompts/diagnostics/bug-summary.md" with { type: "text" };

// Compiled once: the template never changes at runtime and the wrapper is cheap.
const renderTemplate = prompt.compile(bugSummaryTemplate.trimEnd());

export interface BugSummaryContext {
	/** The conversation, already serialized for the model. */
	conversation: string;
	/** What the user said went wrong, if they said anything. */
	hint?: string;
	/** How many messages the conversation had, for the truncation notice. */
	totalMessages?: number;
	/** How many of them the context actually carries. */
	shownMessages?: number;
}

/**
 * Tell the model when it is seeing a tail rather than the whole conversation.
 * Only rendered when the numbers disagree, so an untruncated run is unchanged.
 */
function truncationNotice(context: BugSummaryContext): string | undefined {
	const { totalMessages, shownMessages } = context;
	if (totalMessages === undefined || shownMessages === undefined) return undefined;
	if (shownMessages >= totalMessages) return undefined;
	return `Note: only the last ${shownMessages} of ${totalMessages} messages are shown.`;
}

export function renderBugSummaryPrompt(context: BugSummaryContext): string {
	const notice = truncationNotice(context);
	return renderTemplate({
		conversation: context.conversation,
		hint: context.hint?.trim() || undefined,
		...(notice ? { truncatedNotice: notice } : {}),
	});
}
