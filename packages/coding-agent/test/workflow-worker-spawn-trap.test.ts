/**
 * TRAP 1 of `epic-dynamic-workflows-259n.11` — the `pi-subagents` worker-spawn
 * architecture that our rules forbid, recorded so a future agent reading only
 * that reference repo does not copy it back.
 *
 * The bead is a RECORDING, not a task: workflows run IN-PROCESS via
 * `runStructuredSubagent`, so the whole `pi-subagents` branch — generate source,
 * then spawn processes — is the defect the worker rule exists to prevent (issues
 * #1011, #1027, #1150). AGENTS.md's rule: workers re-enter the CLI entrypoint;
 * never spawn separate worker entry modules.
 *
 * The decision has one consequence a test can reach without reading a single
 * line of source: **a new worker needs a new selector, and every selector is an
 * export.** So these rows assert the whole inventory. A 17th selector is the
 * first half of the forbidden architecture, and it is visible here before
 * anyone writes the spawn.
 *
 * ## Why this is the full 16, not a subset
 *
 * An earlier reading of this bead treated `stats_sync`, `tab` and `js_eval` as
 * module-private locals in `cli.ts:217-219` and unreachable. **That is wrong**,
 * and the docblock in `worker-selector-parity.test.ts` repeats it. All three are
 * exported from the worker that owns them:
 *
 * | selector | module |
 * | --- | --- |
 * | `stats_sync` | `packages/stats/src/aggregator.ts:61` |
 * | `tab` | `packages/coding-agent/src/tools/browser/tab-supervisor.ts:48` |
 * | `js_eval` | `packages/coding-agent/src/eval/js/context-manager.ts` |
 *
 * `cli.ts` declares locals for all eight of its own, but those are lazy-graph
 * duplicates, not extra selectors — same reason `process-entry-import.test.ts`
 * exists. So nothing is module-private, all 16 are importable, and the gap this
 * file would otherwise have is not a gap. (Parity still checks 13: it simply
 * never imports `TAB_WORKER_ARG`, `STATS_SYNC_WORKER_ARG` or `JS_EVAL_WORKER_ARG`.)
 *
 * ## The one residual gap
 *
 * {@link WORKER_MODULES} names the eight modules that own a spawn site today. A
 * selector exported from a NINTH, newly created worker module would not be
 * collected — closing that would mean importing every file under `src/`, and
 * most carry native-addon side effects. Stated here so the 16 is not read as a
 * permanent claim about the codebase.
 *
 * ## Why not source-grep
 *
 * AGENTS.md bans asserting on a `.ts` file's text. Every value below comes from
 * IMPORTING a module and reading what it offers a caller — the same surface a
 * spawn site reaches for, and, unlike a comment, one that cannot lie.
 */
import { describe, expect, it } from "bun:test";
import { isWorkerHostSelector } from "@oh-my-pi/pi-utils/worker-host";
import * as statsAggregator from "@oh-my-pi/omp-stats/aggregator";
import * as blobShared from "../src/cli/worker-selectors";
import * as tabSupervisor from "../src/tools/browser/tab-supervisor";
import * as embedClient from "../src/mnemopi/embed-client";
import * as asrClient from "../src/stt/asr-client";
import * as titleProtocol from "../src/tiny/title-protocol";
import * as ttsClient from "../src/tts/tts-client";
import * as jsContextManager from "../src/eval/js/context-manager";

/** Every module that owns a worker and exports its selector. Keyed for failure messages. */
const WORKER_MODULES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
	"cli/worker-selectors": blobShared,
	"tools/browser/tab-supervisor": tabSupervisor,
	"stats/aggregator": statsAggregator,
	"mnemopi/embed-client": embedClient,
	"stt/asr-client": asrClient,
	"tiny/title-protocol": titleProtocol,
	"tts/tts-client": ttsClient,
	"eval/js/context-manager": jsContextManager,
};

/** The 16 dispatchable selectors, as measured on 2026-10-04. */
const EXPECTED_SELECTORS: readonly string[] = [
	"__ultraworkers_worker_blob_broker",
	"__ultraworkers_worker_computer",
	"__ultraworkers_worker_daemon_broker",
	"__ultraworkers_worker_ida_host",
	"__ultraworkers_worker_js_eval",
	"__ultraworkers_worker_js_eval_process",
	"__ultraworkers_worker_lsp_mux",
	"__ultraworkers_worker_mnemopi_embed",
	"__ultraworkers_worker_stats_activity",
	"__ultraworkers_worker_stats_sync",
	"__ultraworkers_worker_stt",
	"__ultraworkers_worker_tab",
	"__ultraworkers_worker_terminal_output",
	"__ultraworkers_worker_text_predict",
	"__ultraworkers_worker_tiny_inference",
	"__ultraworkers_worker_tts",
];

/** selector -> the module that exports it. A selector owned twice is reported by name. */
function selectorOwners(): Map<string, string[]> {
	const owners = new Map<string, string[]>();
	for (const [moduleName, module] of Object.entries(WORKER_MODULES)) {
		for (const value of Object.values(module)) {
			if (typeof value === "string" && isWorkerHostSelector(value)) {
				owners.set(value, [...(owners.get(value) ?? []), moduleName]);
			}
		}
	}
	return owners;
}

describe("worker-spawn trap — epic-dynamic-workflows-259n.11 TRAP 1", () => {
	it("offers no worker selector beyond the 16 this decision allows", () => {
		// The row the trap predicts. `pi-subagents` solves the problem by spawning;
		// a spawn needs a selector, and every selector is an export. Adding one is
		// the first half of the forbidden architecture and shows up here first.
		const found = [...selectorOwners().keys()];
		const added = found.filter(selector => !EXPECTED_SELECTORS.includes(selector));
		const removed = EXPECTED_SELECTORS.filter(selector => !found.includes(selector));

		// Both halves named, because a one-directional assertion passes just as
		// happily when a selector is DELETED — the same decision, made by accident,
		// in the other direction.
		expect({ added, removed }).toEqual({ added: [], removed: [] });
	});

	it("gives every selector exactly one owning module", () => {
		// Red for a DIFFERENT mutation than row 1: publishing an existing selector
		// from a second module leaves the inventory unchanged, so row 1 stays green
		// and only this one dies. It is the shape of "helpfully centralise cli.ts's
		// locals", which reads as tidying and drags a native addon into every launch.
		const shared = [...selectorOwners()]
			.filter(([, modules]) => modules.length > 1)
			.map(([selector, modules]) => `${selector} exported by ${modules.join(" and ")}`);
		expect(shared, "selectors with more than one owning module").toEqual([]);
	});
});