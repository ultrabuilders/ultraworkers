#!/usr/bin/env bun
/**
 * The agent-side transcript filename is a producer/consumer pair that crosses a
 * language boundary, and nothing in the type system or the test suite spans it.
 *
 * WHY A GATE AND NOT A TEST
 * -------------------------
 * `agent/omp_local.py` writes the log (`_OUTPUT_FILENAME`); `src/runner.ts` probes it
 * twice (`path.join(dir, "agent", …)`). Each side has tests, but every one of them
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

/** The Python producer: binds the name the agent writes its transcript to. */
export const PRODUCER_PATH = "packages/metaharness/agent/omp_local.py";

/** The TypeScript consumer: probes the transcript for realtime cost and token counts. */
export const CONSUMER_PATH = "packages/metaharness/src/runner.ts";

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

/** Why the pair cannot be trusted, or `null` when it is consistent. */
export interface PairProblem {
	kind: "producer-not-found" | "consumer-not-found" | "mismatch";
	produced: string | null;
	consumed: string[];
}

/**
 * Compare the two sides. Returns the first problem found, or `null` when the
 * producer's name is the one every consumer site probes.
 *
 * Consumer sites are compared as a set: the two `runner.ts` sites must agree with
 * each other, but their count is not itself a contract — adding a third probe of the
 * same file is not drift.
 */
export function findPairProblem(producerSource: string, consumerSource: string): PairProblem | null {
	const produced = producedFilename(producerSource);
	if (produced === null) return { kind: "producer-not-found", produced, consumed: [] };

	const consumed = consumedFilenames(consumerSource);
	if (consumed.length === 0) return { kind: "consumer-not-found", produced, consumed };

	const drifted = [...new Set(consumed)].filter(name => name !== produced);
	if (drifted.length > 0) return { kind: "mismatch", produced, consumed: drifted };

	return null;
}

function describe(problem: PairProblem): string {
	switch (problem.kind) {
		case "producer-not-found":
			return `${PRODUCER_PATH} no longer binds _OUTPUT_FILENAME to a double-quoted string; this gate can no longer see the producer, so it cannot claim the pair holds.`;
		case "consumer-not-found":
			return `${CONSUMER_PATH} has no path.join(dir, "agent", …) site left; this gate can no longer see the consumer, so it cannot claim the pair holds.`;
		case "mismatch":
			return [
				`agent transcript filename drifted between producer and consumer.`,
				`  ${PRODUCER_PATH} writes ${JSON.stringify(problem.produced)}`,
				`  ${CONSUMER_PATH} probes ${JSON.stringify(problem.consumed)}`,
				`  The producer and every consumer must be renamed in the same change.`,
				`  Renaming one side alone does not throw: probeTrialCost returns null on a`,
				`  missing file and both call sites fold that into ?? 0, so realtime cost and`,
				`  token counts report zero for every live trial with no error and no log.`,
			].join("\n");
	}
}

if (import.meta.main) {
	const [producer, consumer] = await Promise.all([Bun.file(PRODUCER_PATH).text(), Bun.file(CONSUMER_PATH).text()]);
	const problem = findPairProblem(producer, consumer);
	if (problem) {
		console.error(`check-metaharness-output-filename: ${describe(problem)}`);
		process.exit(1);
	}
	const produced = producedFilename(producer)!;
	console.log(
		`check-metaharness-output-filename: ${PRODUCER_PATH} writes ${JSON.stringify(produced)}, ` +
			`${CONSUMER_PATH} probes the same name (${consumedFilenames(consumer).length} site(s)).`,
	);
}
