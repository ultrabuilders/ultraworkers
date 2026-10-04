/**
 * The message a captured context gets once the session it belonged to is gone.
 *
 * Authored rather than generated, and deliberately specific: a generic "stale
 * object" reads as an extension bug and gets investigated in the wrong place,
 * while this names the calls that invalidate a context and the one sanctioned
 * way to get a usable one back. The extension author is the only person who can
 * act on it, so it has to tell them what to do.
 *
 * Lives in its own module because both the runtime (`loader.ts`) and the runner
 * (`runner.ts`) raise it, and the runner already imports the runtime — putting
 * this in either one would close an import cycle.
 */
export const STALE_CONTEXT_MESSAGE =
	"This extension context is stale: the session it was created for has been replaced or reloaded. " +
	"Do not use a captured pi or command ctx after ctx.newSession(), ctx.branch(), ctx.switchSession(), or ctx.reload(). " +
	"For newSession, branch, and switchSession, move work that belongs to the new session into the withSession " +
	"callback and use the ctx passed to it; for reload, mint a fresh context instead of holding the old one.";

/** Thrown when a captured context is used after the session behind it was replaced. */
export class ExtensionContextStaleError extends Error {
	constructor(message: string = STALE_CONTEXT_MESSAGE) {
		super(message);
		this.name = "ExtensionContextStaleError";
	}
}
