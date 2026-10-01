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
 * For a mode that has no frame at all — headless, print, subagent, ACP.
 *
 * `setEditorComponent` is deliberately NOT offered here, even though it is the one
 * surface that mounts a component on a framed context. On every frameless context this
 * message is used from it does nothing an author could act on — it throws on
 * `noOpUIContext` (`runner.ts:511`) and is a bare `() => {}` on the ACP context
 * (`acp-agent.ts:613`) — so naming it would send them to a dead end either way.
 *
 * `setStatus` and `hasUI` are named because they are the two that never throw: on
 * `noOpUIContext` and the ACP context `setStatus` is itself a silent no-op, so this is
 * advice for the guarded path, not a promise that text appears here. `hasUI` is the
 * check that reaches it. The one surface excluded for a different reason is `custom`,
 * which returns the caller's own value — `setStatus` cannot return that, so offering
 * it would answer a question the author did not ask.
 */
export function unavailableFrameMessage(surface: "setHeader" | "setFooter" | FramelessSurface, mode: string): string {
	const base =
		`${surface} is not available in ${mode}: there is no interactive frame to mount the component into. ` +
		`Guard the call with pi.ui.hasUI`;
	// `custom` resolves with a value the caller supplies, so "show text instead" is not
	// a substitute — setStatus cannot return the author's result, and naming it there
	// would point at a surface that cannot answer the question being asked.
	return surface === "custom"
		? `${base}. There is no text-only substitute: the call yields your own value, and nothing ran to produce it.`
		: `${base}, or use pi.ui.setStatus for text that does not need a component.`;
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
