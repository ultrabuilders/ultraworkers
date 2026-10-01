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
 * The **contents only**, and that is load-bearing. An earlier version hashed
 * `path + contents`, which made the tripwire fire on the one thing it must not:
 * moving the file. A hook keeps its `type:tool:name` when its directory changes
 * — relocating the agent directory, or running a session whose `--extension`
 * root is relative so it resolves somewhere new — and with the path in the hash
 * every hook went `modified` at once and silently stopped running. A gate that
 * disables a whole hook directory because the user reorganised their disk is
 * worse than the edit it was built to catch, and it is invisible: one
 * `logger.warn` line, no UI, no error.
 *
 * Hashing contents alone still catches the case that matters — somebody edits
 * the script, the bytes differ, the hash differs, it does not run. It no longer
 * catches a *rename* or a *move*, and that is deliberate: those change `name` or
 * produce a different hook, and a hook with no record is first sight, which is
 * trusted and recorded. This is a tripwire against "approved once, edited
 * afterwards", not an integrity mechanism; see the closing paragraph.
 *
 * Not the matcher: omp has no matcher group concept, so there is nothing else to
 * hash; a copied four-field key from a design that does have groups would carry
 * two indices that mean nothing here.
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
 * uses. Reusing it verbatim is what keeps a record from outliving the hook it
 * names: a key built independently here could drift, and a drifted record
 * tracks nothing.
 *
 * It is also unique by the time it reaches this module. Every extension root is
 * scanned into one hook list, so two roots may each hold `pre/guard.ts`, but
 * the capability registry dedups on exactly this key before handing the list
 * over (`src/capability/index.ts`), so only one survives. Appending the
 * directory, to separate roots, was tried and is wrong: it puts an absolute
 * path in a persisted key that changes whenever the user moves their agent
 * directory, which is the churn this hash is supposed to avoid.
 */
export function hookTrustKey(hook: Hook): string {
	return `${hook.type}:${hook.tool}:${hook.name}`;
}

/**
 * Hash of the hook's current contents, or `undefined` if it cannot be read.
 *
 * `undefined` rather than a hash of empty text on purpose. An unreadable hook
 * is one the loader is about to fail on anyway, and a read failure here must
 * not take down discovery for every other hook — but recording a stand-in hash
 * for it locks the user out: the first sight of a momentarily unreadable hook
 * would record `""`, and the first load that *could* read it would see a
 * different hash, call it `modified`, and refuse to run it until the user
 * cleared the record by hand. A gate that locks the user out because the disk
 * was briefly unavailable is the failure mode this module may not have.
 *
 * Skipping the comparison for an unreadable hook cannot smuggle anything past
 * it: the hook does not load either, because the import fails.
 */
export async function hookContentHash(hook: Hook): Promise<string | undefined> {
	const source = await Bun.file(hook.path)
		.text()
		.catch(() => undefined);
	if (source === undefined) return undefined;
	return Bun.hash.wyhash(source).toString(16);
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
