/**
 * Extension-contributed context reduction for the compaction prune pass.
 *
 * Core's prune pass in `@oh-my-pi/pi-agent-core/compaction/pruning` owns the
 * decision of what may leave the context, and it consults two extension points
 * that were, until `compaction-protection.ts` and this module, both core-only:
 * which results are protected, and which supersede which. What it has never
 * offered is the thing an extension actually wants — *a transform of its own*,
 * run before summarization, over the same `(entries, tokenizer) => PruneResult`
 * shape the two core transforms already use.
 *
 * The shape is not invented here. `pruneToolOutputs` and
 * `pruneSupersededToolResults` both take `(entries, tokenizer, config)` and
 * return `PruneResult`; a registered transform is the same contract with the
 * config omitted, because a transform that needed host config would be asking
 * the host a question it cannot answer without loading the extension.
 *
 * ## Why a registry rather than a config field
 *
 * The same reason as `compaction-protection.ts`, and the same lifecycle.
 * `PruneConfig` is built per session, per maintenance pass, far from extension
 * load. Handlers install once when `ExtensionRunner.initialize` runs and must be
 * removable again: an extension that is suspended, unloaded, or reloaded has to
 * stop reducing the context, or a dead extension keeps rewriting a live
 * transcript. Add at initialize, return a disposer, let the runner drop it.
 *
 * PROCESS-WIDE, like its siblings — what a transform does to a branch is a
 * property of the branch, not of the session that happened to produce it.
 */
import type { PruneResult } from "@oh-my-pi/pi-agent-core/compaction/pruning";
import type { Tokenizer } from "@oh-my-pi/pi-agent-core/tokenizer";
import type { SessionEntry } from "@oh-my-pi/pi-agent-core/compaction/entries";

/**
 * One reduction transform.
 *
 * Mutate `entries` in place, the way the core transforms do, and report what it
 * actually did. Returning a result that does not match the mutation is the one
 * failure this seam cannot detect for you, so {@link runContextTransforms}
 * re-checks the numbers before they reach the compaction decision.
 */
export type ContextTransformFn = (entries: SessionEntry[], tokenizer: Tokenizer) => PruneResult;

/** One extension's transform, named so logs and rejections can identify it. */
export interface ContextTransform {
	/** Identifies the transform in diagnostics. Unique per extension. */
	name: string;
	transform: ContextTransformFn;
}

interface Registration {
	extensionPath: string;
	name: string;
	transform: ContextTransformFn;
}

const registrations: Registration[] = [];

/**
 * Install one extension's transform. Returns a disposer that removes it again;
 * callers that do not dispose leak the registration for the life of the process.
 *
 * @throws when `name` is not a non-empty trimmed string, when `transform` is not
 * callable, or when this extension already registered that name — each naming
 * the extension, because a registration that is merely ignored is
 * indistinguishable from one that never happened, and two transforms sharing a
 * name make a log line ambiguous.
 */
export function addContextTransform(extensionPath: string, registration: ContextTransform): () => void {
	const name = typeof registration.name === "string" ? registration.name.trim() : "";
	if (name.length === 0) {
		throw new TypeError(`Extension ${extensionPath}: context transform name must be a non-empty string`);
	}
	if (typeof registration.transform !== "function") {
		throw new TypeError(
			`Extension ${extensionPath}: context transform "${name}" must be a function, got ${typeof registration.transform}`,
		);
	}
	if (registrations.some(entry => entry.extensionPath === extensionPath && entry.name === name)) {
		throw new Error(
			`Extension ${extensionPath}: a context transform named "${name}" is already registered. Names identify a transform in diagnostics, so two of them make every log line ambiguous.`,
		);
	}

	const entry: Registration = { extensionPath, name, transform: registration.transform };
	registrations.push(entry);

	return () => {
		const index = registrations.indexOf(entry);
		if (index >= 0) registrations.splice(index, 1);
	};
}

/** False when no extension contributes a transform — the seam's empty-state invariant. */
export function hasContextTransforms(): boolean {
	return registrations.length > 0;
}

/**
 * A snapshot rather than the live array: the prune pass runs this while a
 * concurrent reload may splice the registry, and iterating the array directly
 * would skip whichever transform shifted into the hole.
 */
export function contextTransforms(): readonly Registration[] {
	return [...registrations];
}

export interface ContextTransformOutcome extends PruneResult {
	extensionPath: string;
	name: string;
}

/**
 * Run every registered transform over `entries`, in registration order, and
 * total what they report.
 *
 * A transform that throws is reported and skipped: one extension's bad day must
 * not stop the prune pass, which is the whole reason the context was being
 * reduced. A transform that reports savings it cannot have had is reported and
 * its numbers are DROPPED rather than added, because those numbers are what the
 * caller uses to decide whether the branch is still worth keeping in context.
 */
export function runContextTransforms(
	entries: SessionEntry[],
	tokenizer: Tokenizer,
): {
	total: PruneResult;
	outcomes: ContextTransformOutcome[];
	errors: { extensionPath: string; name: string; error: string }[];
} {
	const outcomes: ContextTransformOutcome[] = [];
	const errors: { extensionPath: string; name: string; error: string }[] = [];
	let prunedCount = 0;
	let tokensSaved = 0;

	for (const { extensionPath, name, transform } of registrations) {
		let result: PruneResult;
		try {
			result = transform(entries, tokenizer);
		} catch (error) {
			errors.push({ extensionPath, name, error: error instanceof Error ? error.message : String(error) });
			continue;
		}
		if (
			!Number.isFinite(result?.tokensSaved) ||
			result.tokensSaved < 0 ||
			!Number.isFinite(result?.prunedCount) ||
			result.prunedCount < 0
		) {
			errors.push({
				extensionPath,
				name,
				error: `reported prunedCount=${String(result?.prunedCount)} tokensSaved=${String(
					result?.tokensSaved,
				)}; both must be non-negative finite numbers, because they are what the caller uses to decide whether the branch still fits`,
			});
			continue;
		}
		prunedCount += result.prunedCount;
		tokensSaved += result.tokensSaved;
		outcomes.push({ extensionPath, name, prunedCount: result.prunedCount, tokensSaved: result.tokensSaved });
	}

	return { total: { prunedCount, tokensSaved }, outcomes, errors };
}

/** Drop every registration. Test-only; the runner disposes individually. */
export function clearContextTransforms(): void {
	registrations.length = 0;
}
