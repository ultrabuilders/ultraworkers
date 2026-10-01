/**
 * One prefix, one source of truth, for every hidden worker argv selector.
 *
 * A selector is a string the CLI matches against to decide which worker to run.
 * They are invisible on a command line and nothing surfaces them at runtime: if
 * a spawn site passes `__omp_worker_tab` while the dispatcher tests for
 * `__ultraworkers_worker_tab`, the Worker starts, the entry module matches
 * nothing, and the process exits silently. No error, no log line, no stack — the
 * feature is simply absent.
 *
 * That is why these are strings at all rather than a typed enum, and why the
 * failure mode is invisible. It is also why the contract below is a *relationship*
 * (every selector is `PREFIX + suffix`) and not a list of literal values: a list
 * is a hand-kept copy of the prefix, and a copy stays green through the rename
 * it exists to police.
 *
 * `isWorkerHostSelector` is the same gate the dispatcher uses, so a selector that
 * passes parity is one the host will actually recognise.
 */
import { describe, expect, it } from "bun:test";
import { isWorkerHostSelector, WORKER_HOST_SELECTOR_PREFIX } from "@oh-my-pi/pi-utils/worker-host";
import {
	BLOB_BROKER_WORKER_ARG,
	COMPUTER_WORKER_ARG,
	DAEMON_BROKER_WORKER_ARG,
	IDA_HOST_WORKER_ARG,
	LSP_MUX_WORKER_ARG,
	STATS_ACTIVITY_WORKER_ARG,
	TERMINAL_OUTPUT_WORKER_ARG,
	TEXT_PREDICT_WORKER_ARG,
} from "../src/cli/worker-selectors";
import { MNEMOPI_EMBED_WORKER_ARG } from "../src/mnemopi/embed-client";
import { STT_WORKER_ARG } from "../src/stt/asr-client";
import { TINY_WORKER_ARG } from "../src/tiny/title-protocol";
import { TTS_WORKER_ARG } from "../src/tts/tts-client";
import { JS_EVAL_PROCESS_ARG } from "../src/eval/js/context-manager";

/**
 * Every selector the CLI can dispatch. Kept as one list so a newly added worker
 * has to be added here too — that is the point: an unlisted worker is a worker
 * whose selector nothing checks.
 */
const SELECTORS: Record<string, string> = {
	BLOB_BROKER_WORKER_ARG,
	COMPUTER_WORKER_ARG,
	DAEMON_BROKER_WORKER_ARG,
	IDA_HOST_WORKER_ARG,
	LSP_MUX_WORKER_ARG,
	STATS_ACTIVITY_WORKER_ARG,
	TERMINAL_OUTPUT_WORKER_ARG,
	TEXT_PREDICT_WORKER_ARG,
	MNEMOPI_EMBED_WORKER_ARG,
	STT_WORKER_ARG,
	TINY_WORKER_ARG,
	TTS_WORKER_ARG,
	JS_EVAL_PROCESS_ARG,
};

describe("worker selector parity", () => {
	it("builds every selector from the single shared prefix", () => {
		// The rename boundary. Change WORKER_HOST_SELECTOR_PREFIX and every constant
		// that did not move with it stops matching this — which is the whole reason
		// the constants are derived rather than written out.
		const offenders = Object.entries(SELECTORS)
			.filter(([, value]) => !value.startsWith(WORKER_HOST_SELECTOR_PREFIX))
			.map(([name, value]) => `${name}="${value}"`);
		expect(offenders, "selectors that do not share the shared prefix").toEqual([]);
	});

	it("gives every selector a distinct suffix under that prefix", () => {
		// Two workers sharing a selector means one is dead on arrival, and the
		// dispatcher cannot tell you which: the first branch simply wins.
		const suffixes = Object.values(SELECTORS).map(value => value.slice(WORKER_HOST_SELECTOR_PREFIX.length));
		const duplicates = suffixes.filter((s, i) => suffixes.indexOf(s) !== i);
		expect(duplicates, "selectors that collide").toEqual([]);
		expect(new Set(suffixes).size).toBe(suffixes.length);
	});

	it("is recognised by the same gate the CLI dispatcher uses", () => {
		// Parity with the real predicate, not a re-implementation of it. If the host's
		// rule ever changes, this row follows it instead of asserting a stale copy.
		const rejected = Object.entries(SELECTORS)
			.filter(([, value]) => !isWorkerHostSelector(value))
			.map(([name]) => name);
		expect(rejected, "selectors the worker host would not dispatch").toEqual([]);
	});

	it("does not treat a near-miss as a worker", () => {
		// The negative half. `isWorkerHostSelector` gates argv dispatch, so a prefix
		// that matched too loosely would let an ordinary argument select a worker.
		expect(isWorkerHostSelector(undefined)).toBe(false);
		expect(isWorkerHostSelector("")).toBe(false);
		expect(isWorkerHostSelector("launch")).toBe(false);
		expect(isWorkerHostSelector(`${WORKER_HOST_SELECTOR_PREFIX}sentinel`)).toBe(true);
	});
});
