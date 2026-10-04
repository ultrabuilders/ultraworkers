/**
 * Extension-contributed protection for the context prune pass.
 *
 * The prune pass in `@oh-my-pi/pi-agent-core/compaction/pruning` is core-owned
 * policy: it decides which tool results may be dropped from the context, and it
 * consults two extension points that were, until this module, both
 * core-only — `PruneConfig.protectedTools`, whose sole producer was
 * `#withPlanProtection` in `session/session-maintenance.ts`, and
 * `PruneConfig.supersedeKey`, whose sole implementation was `readToolSupersedeKey`
 * hardcoded to the `read` tool.
 *
 * An extension that ships its own stateful tool has the same need core does: its
 * results should not be pruned out from under it, and a re-read of the same
 * logical resource should supersede the previous one. Without this module the
 * only way to get either is a core edit.
 *
 * ## Why a registry rather than a config field
 *
 * `PruneConfig` is built per session, per maintenance pass, far from extension
 * load. Handlers are installed once when `ExtensionRunner.initialize` runs and
 * must be removable again — an extension that is suspended, unloaded, or
 * reloaded has to stop protecting anything, or a stale matcher keeps pinning
 * context forever. That lifecycle is exactly the one the file-write/delete
 * fallback registries already model, so this mirrors them: add at initialize,
 * return a disposer, and let the runner drop it.
 *
 * The registry is PROCESS-WIDE, like its siblings: a protected result is a
 * property of the tool, not of the session that happened to produce it.
 *
 * ## What a registration may not do
 *
 * A matcher that always returns `true` would pin the entire context and defeat
 * compaction entirely — the pass could never free anything, and the session
 * would grow without bound. `addCompactionProtection` therefore refuses an
 * unconditional matcher, naming the extension, rather than accepting one that
 * silently disables the feature it is extending. See {@link addCompactionProtection}.
 */
import type { ProtectedToolContext, ProtectedToolMatcher } from "@oh-my-pi/pi-agent-core/compaction/tool-protection";
import type { SupersedeKeyFn } from "@oh-my-pi/pi-agent-core/compaction/pruning";
import type { AgentToolCall } from "@oh-my-pi/pi-agent-core";

/** One extension's contribution to the prune pass. */
export interface CompactionProtection {
	/**
	 * Tool results to keep out of the prune pass. A string protects every result
	 * from that tool; a predicate is consulted per candidate result with the same
	 * {@link ProtectedToolContext} core matchers receive.
	 */
	protectedTools?: ProtectedToolMatcher[];
	/**
	 * Extra supersede keys, combined with core's own. Results sharing a key cause
	 * older ones to be pruned first — even inside the protect window.
	 *
	 * Returning `undefined` means "no opinion", which is what a key function must
	 * return for every tool it does not own; a non-undefined value claims a tool
	 * the extension may not know about, so the keys are namespaced per extension.
	 */
	supersedeKey?: SupersedeKeyFn;
}

interface Registration {
	extensionPath: string;
	protectedTools: ProtectedToolMatcher[];
	supersedeKey?: SupersedeKeyFn;
}

const registrations = new Set<Registration>();

/**
 * Probe contexts spanning the axes a real matcher discriminates on: an unknown
 * tool, a different tool, a failed result, and a call carrying no arguments.
 * Deliberately minimal — the point is variety, not realism.
 */
function probeContexts(): ProtectedToolContext[] {
	const base = {
		role: "toolResult" as const,
		toolCallId: "probe",
		toolName: "probe",
		content: [],
		isError: false,
		timestamp: 0,
	};
	const call = (toolName: string): AgentToolCall =>
		({ type: "toolCall", id: "probe", name: toolName, arguments: {} }) as unknown as AgentToolCall;
	return [
		{ toolResult: base, toolCall: call("zzz-unknown-tool") },
		{ toolResult: base, toolCall: call("read") },
		{ toolResult: { ...base, isError: true }, toolCall: call("read") },
		{ toolResult: base, toolCall: undefined },
	];
}

/**
 * A matcher that protects everything would make the prune pass a no-op for the
 * whole context, so it is refused at the door.
 *
 * Unconditionality cannot be read off the source — `() => true`,
 * `() => (1 + 1) === 2` and `c => !!c.toolResult` are the same behaviour with
 * different text — so it is decided BEHAVIOURALLY: a predicate run against
 * contexts that differ on every axis a real matcher discriminates on, and which
 * accepts all of them, has nothing it is willing to prune.
 *
 * Four probes rather than two because a legitimate matcher may decline on exactly
 * one axis (some tools protect their failures and prune their successes), and two
 * probes would misjudge that as unconditional.
 */
function isUnconditionalMatcher(matcher: ProtectedToolMatcher): boolean {
	if (typeof matcher === "string") return matcher.length === 0;
	try {
		return probeContexts().every(context => matcher(context) === true);
	} catch {
		// A matcher that throws on a context it does not understand has declined it,
		// which is the opposite of pinning everything.
		return false;
	}
}

/**
 * Install one extension's protection. Returns a disposer that removes it again;
 * callers that do not dispose leak the registration for the life of the process.
 *
 * @throws when a matcher is not a non-empty string or a function, when a matcher
 * is unconditional, or when `supersedeKey` is not callable — each naming the
 * extension, because a bad registration that is merely ignored is
 * indistinguishable from one that never happened.
 */
export function addCompactionProtection(extensionPath: string, protection: CompactionProtection): () => void {
	const protectedTools = protection.protectedTools ?? [];
	if (!Array.isArray(protectedTools)) {
		throw new TypeError(`Extension ${extensionPath}: protectedTools must be an array of tool matchers`);
	}
	for (const matcher of protectedTools) {
		if (typeof matcher !== "string" && typeof matcher !== "function") {
			throw new TypeError(
				`Extension ${extensionPath}: each protectedTools entry must be a tool name or a predicate, got ${typeof matcher}`,
			);
		}
		if (isUnconditionalMatcher(matcher)) {
			throw new Error(
				`Extension ${extensionPath}: refused a matcher that protects every result — it would pin the whole context and defeat compaction. Return false for results you do not own.`,
			);
		}
	}
	if (protection.supersedeKey !== undefined && typeof protection.supersedeKey !== "function") {
		throw new TypeError(
			`Extension ${extensionPath}: supersedeKey must be a function, got ${typeof protection.supersedeKey}`,
		);
	}

	const registration: Registration = { extensionPath, protectedTools };
	if (protection.supersedeKey) registration.supersedeKey = protection.supersedeKey;
	registrations.add(registration);

	return () => {
		registrations.delete(registration);
	};
}

/** False when no extension contributes protection — the seam's empty-state invariant. */
export function hasCompactionProtection(): boolean {
	return registrations.size > 0;
}

/**
 * Every registered matcher, flattened. A snapshot rather than the live set: the
 * prune pass iterates this while a concurrent reload may splice the registry, and
 * iterating the set directly would skip whichever matcher shifted into the hole.
 */
export function compactionProtectedTools(): ProtectedToolMatcher[] {
	const out: ProtectedToolMatcher[] = [];
	for (const registration of registrations) out.push(...registration.protectedTools);
	return out;
}

/**
 * Core's `read` key first, then each extension's, chained so the first non-
 * `undefined` answer wins. Returns `undefined` when nothing is registered, which
 * is what leaves `PruneConfig.supersedeKey` unset — identical to a host with no
 * extension at all.
 */
export function compactionSupersedeKey(coreKey: SupersedeKeyFn | undefined): SupersedeKeyFn | undefined {
	const keys: SupersedeKeyFn[] = [];
	if (coreKey) keys.push(coreKey);
	for (const registration of registrations) {
		if (registration.supersedeKey) keys.push(registration.supersedeKey);
	}
	if (keys.length === 0) return undefined;
	if (keys.length === 1) return keys[0];
	return (toolName, args) => {
		for (const key of keys) {
			const value = key(toolName, args);
			if (value !== undefined) return value;
		}
		return undefined;
	};
}

/** Drop every registration. Test-only; the runner disposes individually. */
export function clearCompactionProtection(): void {
	registrations.clear();
}

export type { ProtectedToolContext };
