/**
 * Folds an extension's Markdown transformers into one function the transcript
 * components can hand to the renderer.
 *
 * Ported from `pi` (`packages/coding-agent/src/modes/interactive/components/
 * markdown-transform.ts`).
 *
 * Composition is here rather than in `ExtensionRunner` on purpose: a transformer
 * is third-party code, so one that throws — or one that returns something that
 * is not a string — must not decide the transcript for the ones registered after
 * it, and must not take the render loop down. Each is applied in isolation and
 * the running text is what the next one receives.
 */
import type { MarkdownTransformContext, MarkdownTransformer } from "../../extensibility/extensions/types";

export function createMarkdownTransform(
	messageType: MarkdownTransformContext["messageType"],
	isStreaming: boolean,
	transformers: readonly MarkdownTransformer[],
): (markdown: string, availableWidth: number) => string {
	return (markdown, availableWidth) =>
		applyMarkdownTransformers(markdown, { messageType, isStreaming, availableWidth }, transformers);
}

function applyMarkdownTransformers(
	markdown: string,
	context: MarkdownTransformContext,
	transformers: readonly MarkdownTransformer[],
): string {
	let transformedMarkdown = markdown;
	for (const transformer of transformers) {
		try {
			const transformed = transformer(transformedMarkdown, context);
			// A transformer that returns a non-string is ignored rather than
			// propagated: the next one and the renderer both expect text, and
			// handing them undefined would turn a bad extension into a blank
			// transcript with no indication of why.
			if (typeof transformed === "string") {
				transformedMarkdown = transformed;
			}
		} catch {
			// Keep the current Markdown and continue with the next transformer.
		}
	}
	return transformedMarkdown;
}