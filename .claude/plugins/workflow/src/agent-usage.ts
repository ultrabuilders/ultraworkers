/**
 * Token and cost accounting for one subagent attempt or logical agent call.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/agent-usage.ts`, all 139
 * lines, with no logic changed. One relationship is worth recording, because the names sit close
 * together and are NOT the same thing.
 *
 * ## `AgentUsage` here vs `Usage` in ./usage
 *
 * `./usage` declares a deliberately PARTIAL record — every field optional — because the three
 * sources feeding the display disagree about what they report. This file's `AgentUsage` has every
 * counter REQUIRED, plus `cost`, because it is an accumulator: it adds up what an attempt actually
 * reported, and a missing counter has to be zero rather than absent or the running total would
 * carry `undefined` into a printed number.
 *
 * So the display side accepts a partial and this side never produces one. They are not two
 * implementations of the same type, and neither should be deleted in favour of the other.
 */

/** Token and cost usage for one subagent attempt or logical agent call. */
export interface AgentUsage {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	total: number;
	cost: number;
	/**
	 * True when these figures come from a character-count heuristic because the
	 * provider reported no usage — NOT a measurement. Propagates through
	 * sumAgentUsage into run totals so persistence and display never present an
	 * estimate as metered fact (#209). Rendering uses a "~" prefix.
	 */
	estimated?: boolean;
}

/** Create an independent zero-valued agent usage record. */
export function createEmptyAgentUsage(): AgentUsage {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, cost: 0 };
}

/** Add agent usage records without mutating either input. */
export function sumAgentUsage(...records: AgentUsage[]): AgentUsage {
	const total = createEmptyAgentUsage();
	for (const usage of records) {
		total.input += usage.input;
		total.output += usage.output;
		total.cacheRead += usage.cacheRead;
		total.cacheWrite += usage.cacheWrite;
		total.total += usage.total;
		total.cost += usage.cost;
		if (usage.estimated) total.estimated = true;
	}
	return total;
}

/** Cumulative display usage plus the exact attempt delta when usage becomes committed. */
interface AgentCallUsageUpdate {
	tokenUsage: AgentUsage;
	committedUsage?: AgentUsage;
}

/** Settled cumulative usage for one logical agent call, including retries. */
interface AgentUsageCommit {
	tokens: number;
	tokenUsage?: AgentUsage;
}

/**
 * Track provisional and committed usage for one logical agent call across retries.
 * Starting a new attempt closes older attempts so their late callbacks are ignored.
 */
export function createAgentCallUsageTracker(onUpdate: (update: AgentCallUsageUpdate) => void) {
	let committedCallUsage = createEmptyAgentUsage();
	let activeAttempt = 0;

	return {
		startAttempt() {
			const attemptId = ++activeAttempt;
			let attemptUsage = createEmptyAgentUsage();
			let terminalUsage: AgentUsage | undefined;
			let closed = false;
			const isOpen = () => !closed && attemptId === activeAttempt;
			const emitProgress = () => {
				onUpdate({ tokenUsage: sumAgentUsage(committedCallUsage, attemptUsage) });
			};
			const commitUsage = (usage: AgentUsage): AgentUsageCommit => {
				if (!isOpen()) {
					return { tokens: 0 };
				}
				closed = true;
				committedCallUsage = sumAgentUsage(committedCallUsage, usage);
				onUpdate({ tokenUsage: committedCallUsage, committedUsage: usage });
				return { tokens: committedCallUsage.total, tokenUsage: committedCallUsage };
			};

			return {
				reportProgress(usage: AgentUsage) {
					if (!isOpen() || agentUsageEquals(attemptUsage, usage)) {
						return;
					}
					attemptUsage = usage;
					emitProgress();
				},
				reportTerminal(usage: AgentUsage) {
					if (!isOpen()) {
						return;
					}
					terminalUsage = usage;
					if (!agentUsageEquals(attemptUsage, usage)) {
						attemptUsage = usage;
						emitProgress();
					}
				},
				commitWithFallback(fallbackTotal: () => number) {
					if (!isOpen()) return { tokens: 0 };
					if (terminalUsage && (terminalUsage.total > 0 || terminalUsage.cost > 0)) {
						return commitUsage(terminalUsage);
					}
					// Lazy: the fallback estimate JSON.stringifies the full result+prompt
					// — only pay that when no nonzero terminal tokens/cost were reported.
					// A missing provider usage report can surface as all-zero SDK stats.
					// Keep the heuristic explicitly tagged throughout persistence/display.
					return commitUsage({ ...createEmptyAgentUsage(), total: Math.max(0, fallbackTotal()), estimated: true });
				},
				commitTerminalUsage() {
					if (!terminalUsage) {
						if (!isOpen()) {
							return { tokens: 0 };
						}
						closed = true;
						const displayedUsage = sumAgentUsage(committedCallUsage, attemptUsage);
						if (!agentUsageEquals(displayedUsage, committedCallUsage)) {
							onUpdate({ tokenUsage: committedCallUsage });
						}
						return { tokens: 0 };
					}
					return commitUsage(terminalUsage);
				},
			};
		},
	};
}

/** Return whether two complete agent usage records contain the same values. */
export function agentUsageEquals(left: AgentUsage, right: AgentUsage): boolean {
	return (
		left.input === right.input &&
		left.output === right.output &&
		left.cacheRead === right.cacheRead &&
		left.cacheWrite === right.cacheWrite &&
		left.total === right.total &&
		left.cost === right.cost &&
		// The flag is part of the value: replacing an estimate with exact figures
		// (same numbers) must still emit an update so the stale flag clears.
		!left.estimated === !right.estimated
	);
}