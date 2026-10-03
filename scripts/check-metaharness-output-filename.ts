#!/usr/bin/env bun
/**
 * The agent-side transcript filename is a producer/consumer pair that crosses a
 * language boundary, and nothing in the type system or the test suite spans it.
 *
 * WHY A GATE AND NOT A TEST
 * -------------------------
 * `agent/omp_local.py` and `agent/pi_upstream.py` each write a log
 * (`_OUTPUT_FILENAME`); `src/runner.ts` and `src/benchmarks.ts` probe it. Each side has
 * tests, but every one of them
 * writes its own copy of the file — `test/manager.test.ts` and `test/runner.test.ts`
 * both `writeFileSync` an `omp.txt` fixture and neither invokes the producer. So each
 * side is proven correct against a stand-in for itself, and no test asserts that the
 * two names are the same name. Renaming one side alone keeps the whole suite green.
 *
 * WHY THE DRIFT IS SILENT RATHER THAN LOUD
 * ----------------------------------------
 * `probeTrialCost` wraps its `statSync` in a try/catch and returns `null` when the
 * file is absent, and both call sites fold that into `?? 0`. A half-rename therefore
 * does not throw and does not log: realtime cost and token counts simply report zero
 * for every live trial, and the person who renamed the file reads a green CI as
 * confirmation. The failure is invisible precisely where it is most expensive.
 *
 * A BLIND GATE IS WORSE THAN NO GATE
 * ----------------------------------
 * Both sides below are matched by pattern, and a pattern that stops matching returns
 * nothing. A gate that treated "found nothing" as "nothing wrong" would go green the
 * moment either file is restructured — reporting safety it never established. So a
 * missing producer literal, a missing consumer site, or an empty consumer list are
 * all *failures* here, each naming what it could not find.
 */

/**
 * The Python producers, one per `--agent` value, each binding the name its agent writes.
 *
 * There are TWO. The first version of this gate read only `omp_local.py` and compared it
 * to a single hardcoded name in the consumer, so it agreed with that name by
 * construction and could not see the second producer at all. `pi_upstream.py` had already
 * been writing `pi.txt`, so `--agent pi` trials read a file nobody writes: cost and token
 * counts folded to zero for every live trial, with no error. The pair this gate exists to
 * protect was broken while the gate was green.
 */
export const PRODUCER_PATHS: Record<string, string> = {
	omp: "packages/metaharness/agent/omp_local.py",
	pi: "packages/metaharness/agent/pi_upstream.py",
};

/** The TypeScript consumers: probe the transcript for realtime cost and token counts. */
export const CONSUMER_PATHS = ["packages/metaharness/src/runner.ts", "packages/metaharness/src/benchmarks.ts"] as const;

/**
 * The filename bound to `_OUTPUT_FILENAME` in the producer, or `null` when the
 * assignment is absent or its shape changed.
 *
 * The pattern is deliberately narrow — a named binding to a double-quoted literal.
 * A looser one (`[\w.-]+` between the quotes) would match any string on any line and
 * make the comparison below agree with itself forever.
 */
export function producedFilename(producerSource: string): string | null {
	return producerSource.match(/_OUTPUT_FILENAME\s*=\s*"([^"]+)"/)?.[1] ?? null;
}

/**
 * Every filename the consumer probes under `dir/agent`, in source order.
 *
 * Anchored on the full `path.join(dir, "agent", …)` call so that an unrelated string
 * in a comment or a different join cannot be counted as a consumer site and paper
 * over a real one.
 */
export function consumedFilenames(consumerSource: string): string[] {
	return [...consumerSource.matchAll(/path\.join\(dir,\s*"agent",\s*"([^"]+)"\)/g)].map(m => m[1]!);
}

/**
 * The `--agent` keys the consumer hardcodes into its own filename table.
 *
 * A consumer that reads a literal cannot stay correct when a producer uses a different
 * one, so the table is what has to agree with every producer. `null` means the table is
 * gone or unreadable, which is a failure rather than an empty set: an absent table is
 * indistinguishable from "nothing to check" unless it is reported.
 */
export function mappedAgents(consumerSource: string): Map<string, string> | null {
	const match = consumerSource.match(/AGENT_TRANSCRIPT_FILENAME[^=]*=\s*\{([^}]*)\}/);
	if (!match) return null;
	const map = new Map<string, string>();
	for (const entry of (match[1] ?? "").matchAll(/(\w+)\s*:\s*"([^"]+)"/g)) {
		map.set(entry[1]!, entry[2]!);
	}
	return map;
}

/** Why the producers/consumers cannot be trusted, or `null` when they are consistent. */
export interface PairProblem {
	kind: "producer-not-found" | "consumer-not-found" | "mismatch" | "unmapped-agent";
	produced: string | null;
	consumed: string[];
	/** Which `--agent` failed, when the problem is attributable to one. */
	agent?: string;
}

/**
 * Compare every producer against the consumer's agent table.
 *
 * Two conditions, both learned from the gate being green over a broken pair:
 *
 * 1. Every producer's literal name must be the one the consumer's table maps its agent
 *    to. Before this, the consumer held one literal and only `omp_local.py` was read, so
 *    the comparison was `x == x` and could not fail for the `pi` producer at all.
 * 2. Every agent the table knows must have a producer. A table entry pointing at a
 *    deleted script is a read that returns null forever, which is the same silent zero
 *    this gate exists to prevent.
 *
 * Consumer sites (a literal `path.join(dir, "agent", …)`) are compared as a set: they
 * must agree with each other, but their count is not a contract.
 */
export function findPairProblem(producers: Record<string, string>, consumers: readonly string[]): PairProblem | null {
	const merged = consumers.join("\n");
	const table = mappedAgents(merged);
	if (table === null) {
		return { kind: "consumer-not-found", produced: null, consumed: [] };
	}

	// Each producer is compared to the entry for ITS OWN agent. Comparing one flat set of
	// literals against every producer — the shape this gate started with — can only ever
	// match one agent, so a second producer was invisible to it by construction.
	for (const [agent, source] of Object.entries(producers)) {
		const produced = producedFilename(source);
		if (produced === null) {
			return { kind: "producer-not-found", produced: null, consumed: [], agent };
		}
		const mapped = table.get(agent);
		if (mapped === undefined) {
			return { kind: "unmapped-agent", produced, consumed: [], agent };
		}
		if (mapped !== produced) {
			return { kind: "mismatch", produced, consumed: [mapped], agent };
		}
	}

	// The other direction: a mapped agent with no producer reads a file nobody writes,
	// which is the same silent zero reached by a different route.
	for (const agent of table.keys()) {
		if (!(agent in producers)) {
			return { kind: "unmapped-agent", produced: null, consumed: [table.get(agent)!], agent };
		}
	}

	// A literal `path.join(dir, "agent", …)` bypasses the table and is the shape this gate
	// originally watched, so it is still checked — against the set of real filenames.
	// Map.values() is an iterator, not an array: Object.values() on it yields [], which
	// would make this set empty and flag EVERY literal below as drift.
	const filenames = new Set([...table.values()]);
	for (const literal of consumedFilenames(merged)) {
		if (!filenames.has(literal)) {
			return { kind: "mismatch", produced: literal, consumed: [literal] };
		}
	}

	return null;
}

function describe(problem: PairProblem): string {
	const where = problem.agent ? ` (agent "${problem.agent}")` : "";
	switch (problem.kind) {
		case "producer-not-found":
			return [
				`${PRODUCER_PATHS[problem.agent ?? "omp"]} no longer binds _OUTPUT_FILENAME to a double-quoted string${where}.`,
				`  This gate can no longer see the producer, so it cannot claim the pair holds.`,
				`  Reporting this as clean would be the failure this gate exists to prevent.`,
			].join("\n");
		case "consumer-not-found":
			return [
				`${CONSUMER_PATHS.join(", ")} no longer declares AGENT_TRANSCRIPT_FILENAME.`,
				`  This gate can no longer see the consumer, so it cannot claim the pair holds.`,
				`  An absent table is indistinguishable from "nothing to check" unless it is reported.`,
			].join("\n");
		case "unmapped-agent":
			return [
				`agent "${problem.agent}"${problem.agent in PRODUCER_PATHS ? " is mapped by the consumer but has no producer script" : " has a producer script but the consumer does not map it"}.`,
				`  producer wrote ${JSON.stringify(problem.produced)}, consumer maps ${JSON.stringify(problem.consumed)}`,
				`  A trial run with --agent=${problem.agent} would read a transcript nobody writes:`,
				`  probeTrialCost returns null and every call site folds that into ?? 0, so cost`,
				`  and token counts report zero with no error and no log.`,
			].join("\n");
		case "mismatch":
			return [
				`agent transcript filename drifted${where} between producer and consumer.`,
				`  producer writes ${JSON.stringify(problem.produced)}`,
				`  consumer probes ${JSON.stringify(problem.consumed)}`,
				`  The producer and the consumer entry for the same agent must be renamed in one change.`,
				`  Renaming one side alone does not throw: probeTrialCost returns null on a`,
				`  missing file and every call site folds that into ?? 0, so realtime cost and`,
				`  token counts report zero for every live trial with no error and no log.`,
			].join("\n");
	}
}

if (import.meta.main) {
	const producers: Record<string, string> = {};
	for (const [agent, file] of Object.entries(PRODUCER_PATHS)) {
		producers[agent] = await Bun.file(file).text();
	}
	const consumers: string[] = [];
	for (const file of CONSUMER_PATHS) consumers.push(await Bun.file(file).text());

	const problem = findPairProblem(producers, consumers);
	if (problem) {
		console.error(`check-metaharness-output-filename: ${describe(problem)}`);
		process.exit(1);
	}
	const merged = consumers.join("\n");
	const summary = Object.entries(PRODUCER_PATHS)
		.map(([agent, file]) => `${agent}: ${file} writes ${JSON.stringify(producedFilename(producers[agent]!))}`)
		.join("; ");
	const mapped = [...(mappedAgents(merged)?.entries() ?? [])]
		.map(([agent, filename]) => `${agent}: ${JSON.stringify(filename)}`)
		.join(", ");
	console.log(
		`check-metaharness-output-filename: ${summary}; consumer maps {${mapped}} ` +
			`over ${CONSUMER_PATHS.length} file(s).`,
	);
}
