/**
 * Why a UI call could not be honoured.
 *
 * `setHeader` and `setFooter` take a component factory, so honouring them means
 * mounting a real component into a real frame. A mode without that frame has no
 * honest way to succeed — but silently returning did exactly that: an extension
 * authored `setFooter(...)`, saw no error, and shipped a footer that was never
 * displayed. A silent no-op is worse than a failure here, because it converts a
 * bug the author can fix into one nobody can see.
 *
 * So every context that cannot mount frames throws with a message naming the
 * surface and what to do instead. The wording differs per context on purpose —
 * an author reading "no interactive TUI" and one reading "RPC mode" are in
 * different situations and need different advice.
 */

/**
 * Whether `pi.ui.hasUI` is a usable guard at the call site building the message.
 *
 * This message used to name `pi.ui.hasUI` as the guard for every caller, which is
 * true at `noOpUIContext` and false nearly everywhere else: ACP reports `true`
 * whenever the client supports `elicitation.form`, RPC hard-codes `true`, and the
 * custom-tool context is a `HookUIContext` with no `hasUI` member at all. On those
 * three the guard an author follows is one they pass, so the throw they were told to
 * expect is the first sign anything was wrong.
 *
 * Only the call site knows which case it is, so it has to say.
 */
export type FramelessGuard =
	/** `hasUI` is falsy here, so `if (pi.ui.hasUI)` skips the call that would throw. */
	| "hasUI-blocks-the-call"
	/**
	 * `hasUI` can be truthy here, so the same guard passes and the call still throws.
	 *
	 * Written for ACP, where `hasUI` answers "do dialogs round-trip?" and not "is
	 * there a frame?". A new call site must re-measure `hasUI` *and* the fallback it
	 * is about to name before reusing this branch — the `setStatus` claim below is a
	 * statement about the contexts that pass here, not about framelessness in general.
	 */
	| "hasUI-does-not-block-the-call";

/**
 * For a mode that has no frame at all — headless, print, subagent, ACP.
 *
 * `setEditorComponent` is deliberately NOT offered here, even though it is the one
 * surface that mounts a component on a framed context. On every frameless context this
 * message is used from it does nothing an author could act on — it throws on
 * `noOpUIContext` and is a bare `() => {}` on the ACP context — so naming it would
 * send them to a dead end either way.
 *
 * The one surface excluded for a different reason is `custom`, which returns the
 * caller's own value: `setStatus` cannot return that, so offering it would answer a
 * question the author did not ask.
 */
/**
 * The literal `canMount` accepts for each surface, absent where it accepts none.
 *
 * `canMount` is scoped to three literals — `canMount(surface: "header" | "footer" | "custom")` —
 * so the name a surface is *asked about* is not always the name that *throws*: `setHeader`
 * is queried as `"header"`. Interpolating the method name instead emits a call that does not
 * typecheck, and an instruction the author cannot compile is worse than none, because it
 * reads like a handoff to someone who has the answer.
 *
 * `setWidget` is the sharpest case, and the reason it is missing here is the one its own
 * docblock gives: `canMount` excludes it because the answer depends on the content — RPC
 * renders a string array but throws on a component factory. A surface whose availability
 * has no single boolean cannot be named in a call that takes one, so this message says the
 * check does not cover it rather than sending the author to write code that will not build.
 */
const CAN_MOUNT_ARGUMENT: Readonly<Record<string, "header" | "footer" | "custom">> = {
	setHeader: "header",
	setFooter: "footer",
	custom: "custom",
};

export function unavailableFrameMessage(
	surface: "setHeader" | "setFooter" | FramelessSurface,
	mode: string,
	guard: FramelessGuard,
): string {
	const query = CAN_MOUNT_ARGUMENT[surface];
	const base =
		`${surface} is not available in ${mode}: there is no interactive frame to mount the component into. ` +
		(guard === "hasUI-blocks-the-call"
			? "Guard the call with pi.ui.hasUI"
			: query === undefined
				? // Names the check that answers it rather than only denying the old one — and
					// when there is no such check, says so. True of ACP at both values of
					// `supportsForm`, so it describes what the flag means rather than what this
					// instance currently reads.
					"pi.ui.hasUI does not describe this surface — it reports whether dialogs round-trip, not whether a frame exists — and pi.ui.canMount does not take this one either"
				: `pi.ui.hasUI does not describe this surface — it reports whether dialogs round-trip, not whether a frame exists — so ask pi.ui.canMount("${query}"), which does`);
	// `custom` resolves with a value the caller supplies, so "show text instead" is not
	// a substitute — setStatus cannot return the author's result, and naming it there
	// would point at a surface that cannot answer the question being asked.
	if (surface === "custom") {
		return `${base}. There is no text-only substitute: the call yields your own value, and nothing ran to produce it.`;
	}
	if (guard === "hasUI-does-not-block-the-call") {
		// `setStatus` is `() => {}` on every context that reaches this branch, so
		// keeping it in the sentence would trade a thrown error for the silent absence
		// this file exists to end. The dialogs are the surfaces `hasUI` really does
		// describe, so they are the only thing here an author can actually reach.
		return (
			`${base}. There is no text substitute here either — pi.ui.setStatus is a no-op in ${mode}. ` +
			`Use pi.ui.select / confirm / input, which are the surfaces pi.ui.hasUI does describe.`
		);
	}
	return `${base}, or use pi.ui.setStatus for text that does not need a component.`;
}

/**
 * Surfaces that need a frame to do anything at all.
 *
 * Wider than `setHeader`/`setFooter` because the same reasoning covers every member
 * that draws: a widget the author never sees, a title that never changes, an editor
 * that never opens. All of them were silent no-ops in `noOpUIContext` until this
 * list was made to throw.
 */
export type FramelessSurface =
	| "setWidget"
	| "setEditorComponent"
	| "setEditorText"
	| "setTitle"
	| "setWorkingMessage"
	| "setWorkingIndicator"
	| "setToolsExpanded"
	| "custom";

/**
 * For a mode that has a frame but routes this specific surface elsewhere.
 *
 * This is the message where `setEditorComponent` belongs: the frame IS present, and it is
 * the only surface that mounts a component into it (`extension-ui-controller.ts:174` →
 * `interactive-mode.ts:6765`). The frameless message omits it precisely because it is not
 * wired there, so naming it only here is the difference between a real road and a dead end.
 */
export function unsupportedSurfaceMessage(surface: "setHeader" | "setFooter", mode: string): string {
	return (
		`${surface} is not supported in ${mode}: the frame has no header/footer slot. ` +
		`Use pi.ui.setEditorComponent(factory) to mount a component into the editor, ` +
		`or pi.ui.setWidget(key, content) for an overlay, or setStatus for status text.`
	);
}
