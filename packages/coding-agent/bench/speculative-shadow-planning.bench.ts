/**
 * Restricted shadow-plan projection cost for a complete literal tool-call prefix.
 *
 * This isolates the work performed while an eval candidate is streamed: parsing the
 * current complete prefix and extracting only static literal tool calls. It does not
 * start tools or a JavaScript worker.
 *
 * Run: bun run packages/coding-agent/bench/speculative-shadow-planning.bench.ts
 */
import { projectJavaScriptShadowPlan } from "../src/eval/js/speculation";

const WARMUP_ITERATIONS = 5_000;
const MEASURE_ITERATIONS = 20_000;
const PROGRAM = [
	'tool.read({ path: "src/a.ts" });',
	'tool.read({ path: "src/b.ts" });',
	'tool.read({ path: "src/c.ts" });',
	'tool.read({ path: "src/d.ts" });',
	'tool.read({ path: "src/e.ts" });',
	'tool.read({ path: "src/f.ts" });',
].join("\n");

// `projectJavaScriptShadowPlan` is async, so the await is load-bearing rather than
// stylistic: without it `plan` is the Promise, `plan.barrier` is `undefined` (which
// made the guard below silently dead), and `plan.operations.length` threw
// `TypeError` — this bench published no METRIC line at all.
async function project(): Promise<number> {
	const plan = await projectJavaScriptShadowPlan(PROGRAM);
	if (plan.barrier) throw new Error(`Expected a projectable program, got ${plan.barrier.reason}`);
	return plan.operations.length;
}

for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration++) await project();

const startedAt = performance.now();
let operations = 0;
for (let iteration = 0; iteration < MEASURE_ITERATIONS; iteration++) operations += await project();
const elapsedMs = performance.now() - startedAt;
const msPerProjection = elapsedMs / MEASURE_ITERATIONS;

console.log(`METRIC shadow_plan_ms_per_projection=${msPerProjection.toFixed(6)}`);
console.log(`METRIC shadow_plan_projections_per_second=${(1_000 / msPerProjection).toFixed(1)}`);
console.log(
	`ASI operations_per_projection=${operations / MEASURE_ITERATIONS} iterations=${MEASURE_ITERATIONS} warmup=${WARMUP_ITERATIONS}`,
);
