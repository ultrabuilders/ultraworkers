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

/** For a mode that has no frame at all — headless, print, subagent, ACP. */
export function unavailableFrameMessage(surface: "setHeader" | "setFooter", mode: string): string {
	return (
		`${surface} is not available in ${mode}: there is no interactive frame to mount the component into. ` +
		`Guard the call with pi.ui.hasUI, or use pi.ui.setStatus for text that does not need a component.`
	);
}

/** For a mode that has a frame but routes this specific surface elsewhere. */
export function unsupportedSurfaceMessage(surface: "setHeader" | "setFooter", mode: string): string {
	return (
		`${surface} is not supported in ${mode}. ` +
		`Use pi.ui.setWidget for a component-free overlay, or setStatus for status text.`
	);
}
