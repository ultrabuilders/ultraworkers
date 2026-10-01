/**
 * Hook trust: a hook you approved once, and then somebody edited.
 *
 * ## What this is for
 *
 * `pre`/`post` hooks are shell scripts that run around your tool calls. Approving
 * one and later editing its file used to be invisible: the edited script simply
 * ran, at the same privilege, with no signal anywhere. The user who approved it
 * approved *different code*. This module makes that transition observable and
 * stops it.
 *
 * ## Why there is no `untrusted` state
 *
 * The obvious design — a hook nobody has approved is untrusted and does not run
 * — is wrong for a tool that already ships to users with hooks installed. Every
 * existing hook on every existing install is unapproved, so that rule does not
 * add a review step; it silently switches off people's hooks on upgrade, with
 * no path to turn them back on (there is no hook-management surface to review
 * them in). Shipping a behaviour change onto state that already exists in a
 * user's install without an upgrade path is the thing this repo has already
 * been bitten by once, with the `CONFIG_DIR_NAME` rename.
 *
 * So the first time a hook is seen its hash is *recorded* and it is treated as
 * trusted. From then on the record is the contract: edit the file and the next
 * load is `modified`, which does not run. Approval is therefore implicit and
 * one-time, and the only state that can surprise anyone is the one that
 * actually changed.
 *
 * ## What this hashes
 *
 * The hook's path and its script contents — not its matcher. omp has no matcher
 * group concept, so there is nothing else to hash; a copied four-field key from
 * a design that does have groups would carry two indices that mean nothing here.
 * The key itself is the three-part one the hook capability already uses
 * (`type:tool:name`), so the record and the hook cannot drift apart.
 *
 * This detects *change*, not hostile edits. Anyone able to rewrite the hook can
 * rewrite the recorded hash beside it, and the hash is a fast content digest
 * rather than a signature. It is a tripwire for the ordinary case — a hook you
 * approved, then somebody edited — and it is not a security boundary.
 */
import type { Hook } from "../../capability/hook";

/**
 * Whether a hook may run.
 *
 * Two states, and both are reachable: `trusted` is a hook whose recorded hash
 * matches (or which has never been seen), `modified` is one whose file changed
 * after it was recorded. A third state named here that nothing can produce
 * would be a lie in the type.
 */
export type HookTrustStatus = "trusted" | "modified";

/** Persisted beside the config for one hook. */
export interface HookState {
	/** Hash of the script as it stood when this hook was first seen. */
	trustedHash?: string;
}

/**
 * The stable identity of a hook, matching the key the hook capability already
 * uses. Reusing it is what keeps a record from outliving the hook it names.
 */
export function hookTrustKey(hook: Hook): string {
	return `${hook.type}:${hook.tool}:${hook.name}`;
}

/**
 * Hash of the hook's path and current contents.
 *
 * A hook whose file cannot be read hashes as if it were empty rather than
 * throwing: an unreadable hook is one the loader is about to fail on anyway,
 * and a read failure here must not take down discovery for every other hook.
 */
export async function hookContentHash(hook: Hook): Promise<string> {
	const source = await Bun.file(hook.path)
		.text()
		.catch(() => "");
	return Bun.hash.wyhash(`${hook.path}\u0000${source}`).toString(16);
}

/**
 * Whether `hook` may run, given the hash recorded for it — if any.
 *
 * `undefined` means first sight, which is trusted and recorded by the caller.
 * See the module docblock for why that is not `untrusted`.
 */
export function hookTrustStatus(recordedHash: string | undefined, currentHash: string): HookTrustStatus {
	if (recordedHash === undefined) return "trusted";
	return recordedHash === currentHash ? "trusted" : "modified";
}

/** Message shown for a hook whose file changed after it was recorded. */
export function hookModifiedMessage(hook: Hook, recordedHash: string): string {
	return (
		`Hook "${hook.name}" (${hookTrustKey(hook)}) was recorded with content ${recordedHash} but ${hook.path} now ` +
		`hashes to something else, so it was not loaded. Restore the file, or clear its record under ` +
		"`hooks.state` in config.yml to run the current version."
	);
}
