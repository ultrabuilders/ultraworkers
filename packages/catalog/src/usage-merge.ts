/**
 * Canonical field-by-field accumulation for {@link Usage}.
 *
 * Ported from upstream pi's usage totals merge (earendil-works/pi,
 * `packages/coding-agent/src/core/usage-totals.ts`, `combineUsage` /
 * `addUsage`; and `packages/agent/src/harness/utils/usage.ts`) — MIT License,
 * Copyright (c) 2025 Mario Zechner. Upstream defined the conditional-spread
 * rule for its two optional token splits (`reasoning`, `cacheWrite1h`); this
 * file keeps that rule verbatim and extends it to every optional field ultraworkers'
 * `Usage` carries.
 *
 * Upstream had one helper and every call site used it. This tree had four
 * hand-rolled accumulators, each with a different field set, so the same
 * measurement read `0` on one path and absent on the other. The conditional
 * rule below is the whole point: an optional field stays ABSENT when no side
 * reports it. `Usage.reasoningTokens` documents `undefined` as "unknown, NOT
 * zero", and materialising it as `0` is the shape leak the field exists to
 * prevent.
 */

import type { Usage } from "./types";

// Re-exported so a caller that merges or folds usage needs this one module: the
// `Usage` shape and the only sanctioned way to combine two of them travel together.
export type { Usage };

/** The counter groups on {@link Usage} whose leaves are optional numbers. */
type CounterGroup = { readonly [key: string]: number | undefined };

/** A zeroed usage record carrying no optional field. */
export function emptyUsage(): Usage {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

/**
 * Add two optional counters, keeping the field absent when neither side reports
 * it. A reported `0` is a real measurement and stays visible; an unreported
 * field never becomes one.
 */
function addOptionalCount(left: number | undefined, right: number | undefined): number | undefined {
	if (left === undefined && right === undefined) return undefined;
	return (left ?? 0) + (right ?? 0);
}

/**
 * Merge an optional counter GROUP leaf by leaf, so a component only one side
 * reports still lands and a component neither side reports is not emitted.
 *
 * `Object.keys` alone would not do this: a producer that writes an explicit
 * `{ ephemeral1h: undefined }` has the key but no value, and emitting it as `0`
 * would be the same guess the conditional rule exists to avoid.
 */
function addCounterGroup<T extends CounterGroup>(left: T | undefined, right: T | undefined): T | undefined {
	if (left === undefined && right === undefined) return undefined;
	const merged: Record<string, number> = {};
	for (const key of Object.keys(left ?? {})) {
		const value = left?.[key];
		if (value === undefined && right?.[key] === undefined) continue;
		merged[key] = (value ?? 0) + (right?.[key] ?? 0);
	}
	for (const key of Object.keys(right ?? {})) {
		if (key in merged) continue;
		const value = right?.[key];
		if (value === undefined && left?.[key] === undefined) continue;
		merged[key] = (left?.[key] ?? 0) + (value ?? 0);
	}
	return merged as T;
}

/**
 * `Usage.totalTokens` per its own doc: the four conversation buckets plus
 * provider-side orchestration when reported. Providers that omit the field
 * leave it to be derived rather than counted as zero, matching
 * `resolveUsageTotal` in `packages/stats`.
 */
function deriveTotalTokens(usage: Partial<Usage>): number {
	return (
		(usage.input ?? 0) +
		(usage.output ?? 0) +
		(usage.cacheRead ?? 0) +
		(usage.cacheWrite ?? 0) +
		(usage.orchestration?.input ?? 0) +
		(usage.orchestration?.cacheRead ?? 0) +
		(usage.orchestration?.output ?? 0)
	);
}

/**
 * Fold `usage` into `target` in place, field by field, and return `target`.
 *
 * Sums every counter; keeps `contextTokens` as a gauge (last reported value
 * wins) because it is context OCCUPANCY, not a flow — summing it across turns
 * would report a number no turn ever billed. Optional scalars and groups are
 * included exactly when at least one side carries them.
 *
 * Accepts a `Partial` because a sub-task result and an in-flight message event
 * do not both guarantee every required bucket.
 */
export function addUsageInto<T extends Usage>(target: T, usage: Partial<Usage>): T {
	target.input += usage.input ?? 0;
	target.output += usage.output ?? 0;
	target.cacheRead += usage.cacheRead ?? 0;
	target.cacheWrite += usage.cacheWrite ?? 0;
	target.totalTokens += usage.totalTokens ?? deriveTotalTokens(usage);

	const cost = usage.cost;
	target.cost.input += cost?.input ?? 0;
	target.cost.output += cost?.output ?? 0;
	target.cost.cacheRead += cost?.cacheRead ?? 0;
	target.cost.cacheWrite += cost?.cacheWrite ?? 0;
	target.cost.total += cost?.total ?? 0;

	// Assigned only when the merge produced a value: writing `undefined` would
	// add an own property that `"reasoningTokens" in usage` reports as present.
	const reasoningTokens = addOptionalCount(target.reasoningTokens, usage.reasoningTokens);
	if (reasoningTokens !== undefined) target.reasoningTokens = reasoningTokens;
	const premiumRequests = addOptionalCount(target.premiumRequests, usage.premiumRequests);
	if (premiumRequests !== undefined) target.premiumRequests = premiumRequests;

	const orchestration = addCounterGroup(target.orchestration, usage.orchestration);
	if (orchestration !== undefined) target.orchestration = orchestration;

	const cttl = addCounterGroup(target.cttl, usage.cttl);
	if (cttl !== undefined) target.cttl = cttl;

	const server = addCounterGroup(target.server, usage.server);
	if (server !== undefined) target.server = server;

	const credits = addCounterGroup(target.credits, usage.credits);
	if (credits !== undefined) target.credits = credits;

	if (usage.contextTokens !== undefined) target.contextTokens = usage.contextTokens;

	return target;
}

/**
 * Pure {@link addUsageInto} over a fresh accumulator. Neither input is mutated:
 * `addCounterGroup` always allocates, and `cost` is seeded fresh by
 * {@link emptyUsage}.
 */
export function mergeUsage(left: Usage, right: Usage): Usage {
	return addUsageInto(addUsageInto(emptyUsage(), left), right);
}
