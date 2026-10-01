/**
 * Extension-contributed usage attribution for tool results.
 *
 * A tool that makes a nested model call spends tokens the caller never sees on
 * the wire: the sub-run's assistant messages live in the child's own session, and
 * the parent transcript only carries the tool's result payload. Until this
 * module, the ONE place that read a sub-run's spend back out of a tool result
 * was `message.toolName === "task"` in `session/session-stats.ts` and
 * `entryUsage` in `session/session-manager.ts`. An extension tool doing the same
 * thing was silently invisible to `/usage`, the status line, the ACP usage
 * update, and every hook reading the cost ledger — no seam, no diagnostic, no
 * way to contribute without a core edit.
 *
 * ## Why a registry rather than a config field
 *
 * The fold that reads a tool result's usage runs deep inside the session index
 * and the stats tracker, both of which are constructed far from extension load
 * and neither of which holds an `ExtensionRunner` (`SessionStatsTrackerHost`
 * exposes no extension surface at all). Handlers are installed once when
 * `ExtensionRunner.initialize` runs and must be removable again: a suspended,
 * unloaded, or reloaded extension has to stop contributing, or a stale reporter
 * keeps adding a dead extension's tokens to the live ledger forever. That
 * lifecycle is the one `compaction-protection.ts` already models for the same
 * reason, so this mirrors it: add at initialize, return a disposer, let the
 * runner drop it.
 *
 * The registry is PROCESS-WIDE, like its sibling: what a tool spent is a property
 * of the tool, not of the session that happened to run it.
 *
 * ## Why the reporter reads `details` and not the live result
 *
 * `details` is the only part of a tool result that survives into the persisted
 * `toolResult` message, and the usage fold has to work on RESUMED sessions —
 * which have no live `AgentToolResult` left. A reporter that closed over the
 * in-memory result would attribute correctly for the current turn and then stop
 * the moment the session was reloaded, so `/usage` would disagree with the file
 * on disk. Reading `details` makes the fold a pure function of persisted state.
 *
 * ## What a registration may not do
 *
 * Two reporters resolving the same tool name would fold the same tokens into
 * the ledger twice, so `/usage`, the ACP usage update, and `packages/stats` all
 * read inflated. `addUsageReporter` refuses that collision rather than letting
 * load order decide which one wins.
 */
import type { Usage } from "@oh-my-pi/pi-catalog/usage-merge";
import { logger } from "@oh-my-pi/pi-utils";

/**
 * Extract the usage a tool result should contribute to session totals.
 *
 * Return `undefined` for a result that spent nothing — "no opinion" is the
 * normal answer, and it is what leaves the fold untouched rather than adding a
 * zero.
 */
export type UsageReporter = (details: unknown) => Usage | undefined;

interface Registration {
	extensionPath: string;
	toolName: string;
	report: UsageReporter;
}

const registrations = new Set<Registration>();

/**
 * Core's own reporter for the `task` tool, which is the pre-seam behaviour
 * written down rather than inlined: `session-stats` used to test
 * `message.toolName === "task"` and read `details.usage`. It lives here so the
 * sub-agent ledger has exactly one implementation and the tool name is data
 * beside the extension registrations instead of a branch buried in the fold.
 */
const CORE_REPORTERS: readonly { toolName: string; report: UsageReporter }[] = [
	{
		toolName: "task",
		report: details => {
			if (typeof details !== "object" || details === null) return undefined;
			const usage = (details as Record<string, unknown>).usage;
			return isUsage(usage) ? usage : undefined;
		},
	},
];

/**
 * Install one extension's usage reporter. Returns a disposer that removes it
 * again; callers that do not dispose leak the registration for the life of the
 * process.
 *
 * @throws when `toolName` is not a non-empty trimmed string, when `report` is
 * not callable, or when this tool name is already registered — each naming the
 * extension, because a bad registration that is merely ignored is
 * indistinguishable from one that never happened.
 */
export function addUsageReporter(extensionPath: string, toolName: string, report: UsageReporter): () => void {
	if (typeof toolName !== "string" || toolName.length === 0 || toolName !== toolName.trim()) {
		throw new TypeError(`Extension ${extensionPath}: usageReporter tool name must be a non-empty trimmed string`);
	}
	if (typeof report !== "function") {
		throw new TypeError(
			`Extension ${extensionPath}: usageReporter for '${toolName}' must be a function, got ${typeof report}`,
		);
	}
	const core = CORE_REPORTERS.find(r => r.toolName === toolName);
	if (core) {
		throw new Error(
			`Extension ${extensionPath}: tool '${toolName}' already has a core usage reporter — folding both would count the same tokens twice`,
		);
	}
	const existing = [...registrations].find(r => r.toolName === toolName);
	if (existing) {
		throw new Error(
			`Extension ${extensionPath}: tool '${toolName}' already has a usage reporter (registered by ${existing.extensionPath}) — folding both would count the same tokens twice`,
		);
	}

	const registration: Registration = { extensionPath, toolName, report };
	registrations.add(registration);
	return () => {
		registrations.delete(registration);
	};
}

/** False when no extension contributes a reporter — the seam's empty-state invariant. */
export function hasUsageReporter(): boolean {
	return registrations.size > 0;
}

/**
 * Total usage a tool result contributes, or `undefined` when nothing claimed it.
 *
 * A reporter that throws or hands back a malformed record is refused with the
 * reason logged and the result contributing nothing — a ledger that silently
 * absorbed a broken number is worse than one that is visibly short.
 */
export function reportedToolUsage(toolName: string, details: unknown): Usage | undefined {
	for (const core of CORE_REPORTERS) {
		if (core.toolName !== toolName) continue;
		const usage = core.report(details);
		if (usage !== undefined) return usage;
	}
	for (const registration of registrations) {
		if (registration.toolName !== toolName) continue;
		let usage: Usage | undefined;
		try {
			usage = registration.report(details);
		} catch (error) {
			logger.warn("Tool usage reporter threw; contributing no usage", {
				toolName,
				extensionPath: registration.extensionPath,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
		if (usage === undefined) return undefined;
		if (!isUsage(usage)) {
			logger.warn("Tool usage reporter returned a malformed usage record; contributing none", {
				toolName,
				extensionPath: registration.extensionPath,
			});
			return undefined;
		}
		return usage;
	}
	return undefined;
}

/**
 * Whether `value` is a usable {@link Usage} record: the four buckets, the
 * provider total, and a complete cost breakdown.
 *
 * Exported because a reporter is untrusted input — it is a function an extension
 * supplied, and the fold needs the same shape test the pre-seam `task` extractor
 * applied to `details.usage`.
 */
/**
 * One token count or one cost figure.
 *
 * Shape is not enough. `typeof x === "number"` admits `NaN`, `Infinity`, and
 * negatives, and this is the gate every reported figure passes — including the
 * core reporter's, so a tightening here applies to both sides at once.
 *
 * The domain check is not defensive decoration:
 *
 * - `NaN` is the one that does not announce itself. It is silent in a report and
 *   then spreads: the accumulator is `left + right`, so a single `NaN` makes
 *   every total after it `NaN` for the rest of the session, and nothing recovers
 *   it but editing the record by hand.
 * - A negative lets one reporter subtract usage another reported, so the total
 *   stops being anyone's total.
 * - `Infinity` makes the cost dashboard render nonsense rather than a wrong digit.
 *
 * Dropping an out-of-domain figure is always the safe direction: the alternative
 * is admitting a number that cannot be taken back.
 */
function isMeasure(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isUsage(value: unknown): value is Usage {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<Usage>;
	if (!isMeasure(candidate.input) || !isMeasure(candidate.output)) return false;
	if (!isMeasure(candidate.cacheRead) || !isMeasure(candidate.cacheWrite)) return false;
	if (!isMeasure(candidate.totalTokens)) return false;
	const cost = candidate.cost;
	return (
		typeof cost === "object" &&
		cost !== null &&
		isMeasure(cost.input) &&
		isMeasure(cost.output) &&
		isMeasure(cost.cacheRead) &&
		isMeasure(cost.cacheWrite) &&
		isMeasure(cost.total)
	);
}

/** Drop every registration. Test-only; the runner disposes individually. */
export function clearUsageReporters(): void {
	registrations.clear();
}
