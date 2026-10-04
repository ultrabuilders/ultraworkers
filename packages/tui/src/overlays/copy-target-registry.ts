/**
 * Extension-contributed copy targets.
 *
 * The copy selector's target set was a closed core function: `collectBlocks`
 * walked `TranscriptEntryLike` messages, switched on the message role, and emitted a
 * fixed set of blocks — markdown code/quotes, links, a bash/eval command, a
 * tool result. A tool an extension registered produced no block of its own beyond
 * the generic `<toolName> result` case, and an extension had no way to add a copy
 * kind, a label, or a preview language.
 *
 * `CopySelectorDeps` is a core interface whose object is constructed in exactly
 * one place (`selector-controller.ts`), so the target set had no contribution
 * point at all — the seam was missing, not the capability.
 *
 * ## What a provider may and may not do
 *
 * A provider is asked for blocks **per transcript entry**, not per picker, and it
 * returns nothing for entries it does not own. That is what makes this additive:
 * core's own extraction is unchanged and runs first, so an extension can add
 * targets without displacing the built-in ones, and a provider that throws or
 * returns junk cannot strip them.
 *
 * Two rules keep the seam from becoming a foot-gun:
 *
 * 1. **Order is load order, and duplicates are refused.** Two providers claiming
 *    the same id would make every block ambiguous about where it came from, so the
 *    second registration is an error naming the offender rather than a silent
 *    shadow.
 * 2. **A provider cannot fabricate provenance.** `CopyBlock.entry` is carried from
 *    the entry core handed it, so a block always names the turn it came from. A
 *    provider that tries to point at a different entry is refused — otherwise a
 *    custom tool's output could claim to be a user's message.
 */
import type { TranscriptEntryLike } from "../chat/transcript-entry";

/** One copyable block an extension contributes for a transcript entry. */
export interface CopyTargetBlock {
	/** Short kind label shown in the block caption ("deploy plan", "jira link", …). */
	label: string;
	/** Exact text placed on the clipboard. */
	content: string;
	/**
	 * Optional core styling hint. `href` turns the block into a link block whose
	 * `o` opens the URL; `language` picks the preview highlighter.
	 */
	kind?: "code" | "quote" | "command";
	language?: string;
	href?: string;
}

/** What a provider is shown about the entry it is asked about. */
export interface CopyTargetContext {
	/** The turn's entries, in document order — the same slice core extracted from. */
	readonly entries: readonly TranscriptEntryLike[];
	/** Working directory of the session that owns the transcript. */
	readonly cwd: string;
}

/** One extension's rule for contributing copy targets. */
export interface CopyTargetProvider {
	/** Unique per process. Identifies the provider in diagnostics and rejections. */
	id: string;
	/** Human-readable, shown in `/extensions` and in rejection messages. */
	label: string;
	/**
	 * Blocks for `entry`, or `undefined`/empty when the entry is not this
	 * provider's. Called once per entry per picker; must not mutate global state.
	 */
	collect(entry: TranscriptEntryLike, context: CopyTargetContext): readonly CopyTargetBlock[] | undefined;
}

const providers: CopyTargetProvider[] = [];

/**
 * Install one provider. Returns a disposer that removes it again; callers that
 * do not dispose leak the provider for the life of the process.
 *
 * @throws when `id` is not a non-empty trimmed string, when `label` is blank,
 * when `collect` is not callable, or when that id is already registered — each
 * naming the offender, because a registration that is merely ignored is
 * indistinguishable from one that never happened.
 */
export function registerCopyTargetProvider(provider: CopyTargetProvider): () => void {
	const id = typeof provider.id === "string" ? provider.id.trim() : "";
	if (id.length === 0) {
		throw new TypeError("Copy target provider id must be a non-empty trimmed string");
	}
	if (typeof provider.label !== "string" || provider.label.trim().length === 0) {
		throw new TypeError(`Copy target provider "${id}" must have a label`);
	}
	if (typeof provider.collect !== "function") {
		throw new TypeError(`Copy target provider "${id}" must provide collect(), got ${typeof provider.collect}`);
	}
	if (providers.some(existing => existing.id === id)) {
		throw new Error(`Copy target provider "${id}" is already registered — provider ids must be unique`);
	}
	const entry: CopyTargetProvider = { ...provider, id };
	providers.push(entry);
	return () => {
		const index = providers.indexOf(entry);
		if (index !== -1) providers.splice(index, 1);
	};
}

/**
 * A provider's blocks, validated and stamped with the entry they came from.
 *
 * Anything a provider returns that cannot be a copy target is dropped, and every
 * drop is logged with the provider id — a silently ignored registration is what
 * made this surface unusable in the first place. Returns `{ blocks, rejected }`
 * so a caller can surface a count without the registry having to log itself.
 */
export function collectProviderBlocks(
	entry: TranscriptEntryLike,
	context: CopyTargetContext,
	registered: readonly CopyTargetProvider[],
): { blocks: CopyTargetBlock[]; rejected: { provider: string; reason: string }[] } {
	const blocks: CopyTargetBlock[] = [];
	const rejected: { provider: string; reason: string }[] = [];
	for (const provider of registered) {
		let produced: readonly CopyTargetBlock[] | undefined;
		try {
			produced = provider.collect(entry, context);
		} catch (error) {
			rejected.push({
				provider: provider.id,
				reason: `collect() threw: ${error instanceof Error ? error.message : String(error)}`,
			});
			continue;
		}
		if (!produced) continue;
		if (!Array.isArray(produced)) {
			rejected.push({ provider: provider.id, reason: `collect() returned ${typeof produced}, expected an array` });
			continue;
		}
		for (const block of produced) {
			if (!block || typeof block !== "object") {
				rejected.push({ provider: provider.id, reason: `block is ${block === null ? "null" : typeof block}` });
				continue;
			}
			if (typeof block.content !== "string" || block.content.length === 0) {
				rejected.push({ provider: provider.id, reason: "block content must be a non-empty string" });
				continue;
			}
			if (typeof block.label !== "string" || block.label.trim().length === 0) {
				rejected.push({ provider: provider.id, reason: "block label must be a non-empty trimmed string" });
				continue;
			}
			if (block.href !== undefined && typeof block.href !== "string") {
				rejected.push({ provider: provider.id, reason: `block href must be a string, got ${typeof block.href}` });
				continue;
			}
			blocks.push({
				label: block.label.trim(),
				content: block.content,
				kind: block.kind,
				language: block.language,
				href: block.href,
			});
		}
	}
	return { blocks, rejected };
}

/** Every registered provider, in registration order. */
export function listCopyTargetProviders(): readonly CopyTargetProvider[] {
	return providers;
}

/**
 * Drop every registration. The registry is a process-wide singleton, so a test
 * that installs a provider without disposing it would otherwise leak that
 * provider into every later file that opens the copy picker.
 */
export function clearCopyTargetProviders(): void {
	providers.length = 0;
}
