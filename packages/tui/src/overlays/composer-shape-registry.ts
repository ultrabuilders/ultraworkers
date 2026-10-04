import { type ComposerStyle, registerComposerStyle } from "../index";
import { logger } from "@oh-my-pi/pi-utils";
import type { SubmenuOption } from "./settings-defs";

/** Composer shape id; extensions may register additional values at runtime. */
export type ComposerShape = string;

/** Built-in composer choices and their shared settings/setup copy. */
export const BUILTIN_COMPOSER_SHAPES = [
	{
		value: "band",
		label: "Status Band (Default)",
		description: "Flush soft-capped status band above a curved prompt, no frame",
	},
	{
		value: "box",
		label: "Rounded Box",
		description: "Status line embedded in top border, compact 2-line prompt",
	},
	{
		value: "claude",
		label: "Claude Code",
		description: "Full-width horizontal rules above and below, status line at bottom",
	},
	{
		value: "pi",
		label: "Pi",
		description: "Framed horizontal rules with status line at bottom",
	},
	{
		value: "borderless",
		label: "Borderless",
		description: "Clean prompt glyph with status line at bottom, no box borders",
	},
	{
		value: "rule",
		label: "Top Rule Dock",
		description: "Single top rule with status docked onto it and below",
	},
	{
		value: "field",
		label: "Compact Field",
		description: "Filled one-row field with accent end caps",
	},
	{
		value: "rail",
		label: "Accent Rail",
		description: "Filled one-row field anchored by a single accent rail",
	},
] as const;

/** Built-in composer ids used by tests and non-runtime consumers. */
export const COMPOSER_SHAPE_VALUES = BUILTIN_COMPOSER_SHAPES.map(shape => shape.value);

/** Visual composer style and selector copy registered by an extension. */
export interface ComposerShapeDefinition {
	label: string;
	description?: string;
	style: ComposerStyle;
	/**
	 * Whether this shape can be used right now.
	 *
	 * A shape that needs something the host may not have — a glyph set, a colour
	 * depth, a feature flag — has no way to say so today, so it either renders
	 * wrong or forces the host to special-case it. This is that seam.
	 *
	 * OPTIONAL, and absent means available. gajae makes its `availability` a
	 * REQUIRED predicate (`../gajae-ref/packages/coding-agent/src/modes/action-registry.ts:80-84`);
	 * making it required here would break every extension published against the
	 * current signature, which AGENTS.md calls a breaking change for extension
	 * authors. The fail-closed half of gajae's rule is kept, because that is the
	 * part that is load-bearing — see {@link evaluateAvailability}.
	 */
	availability?: () => boolean;
	/**
	 * Why the shape is unavailable, shown in place of the description. Without a
	 * reason an unavailable row is just a row that cannot be clicked, which tells
	 * the user nothing about what to change.
	 */
	unavailableReason?: string;
}

const extensionComposerShapes = new Map<string, ComposerShapeDefinition>();

/**
 * Evaluate one definition's availability, FAILING CLOSED.
 *
 * Copied from gajae's `#evaluateAvailability`
 * (`../gajae-ref/packages/coding-agent/src/modes/action-registry.ts:118-140`): a predicate
 * that throws reports the shape unavailable rather than propagating. The reasoning is
 * theirs and it holds here — a selector that throws while building its rows renders
 * nothing at all, so one broken predicate would take out every other shape too. A shape
 * that fails closed still appears, with its reason, which is recoverable.
 *
 * gajae also caches availability for one microtask. This registry is read once per
 * rebuild of the selector, so there is no per-row fan-out to amortise and a cache
 * would only risk serving a stale answer.
 */
function evaluateAvailability(definition: ComposerShapeDefinition): SubmenuOption {
	const base: SubmenuOption = {
		value: definition.style.id,
		label: definition.label,
		description: definition.description,
	};
	if (!definition.availability) return base;
	try {
		return definition.availability() ? base : { ...base, unavailableReason: definition.unavailableReason };
	} catch (error) {
		logger.warn("composer shape availability predicate threw; treating as unavailable", {
			id: definition.style.id,
			error: String(error),
		});
		return { ...base, unavailableReason: definition.unavailableReason };
	}
}

/** Install one extension composer shape into rendering and selector registries. */
export function installExtensionComposerShape(definition: ComposerShapeDefinition): () => void {
	const unregisterStyle = registerComposerStyle(definition.style);
	const id = definition.style.id;
	extensionComposerShapes.set(id, definition);
	return () => {
		if (extensionComposerShapes.get(id) === definition) extensionComposerShapes.delete(id);
		unregisterStyle();
	};
}

/** Available built-in and extension composer choices in selector order. */
export function getComposerShapeOptions(): readonly SubmenuOption[] {
	return [...BUILTIN_COMPOSER_SHAPES, ...[...extensionComposerShapes.values()].map(evaluateAvailability)];
}
