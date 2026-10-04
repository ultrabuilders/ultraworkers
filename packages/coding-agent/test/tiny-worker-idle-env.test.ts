import { describe, expect, test } from "bun:test";
import {
	readTinyWorkerIdleMsEnv,
	TINY_WORKER_IDLE_MS_ENV,
	TINY_WORKER_IDLE_MS_ENV_LEGACY,
	TINY_WORKER_MODEL_ENV,
	TINY_WORKER_SOCKET_ENV,
	TINY_WORKER_TAG_ENV,
} from "../src/tiny/title-protocol";

describe("tiny worker idle-window environment", () => {
	test("the canonical variable is read when set", () => {
		expect(readTinyWorkerIdleMsEnv({ [TINY_WORKER_IDLE_MS_ENV]: "1000" })).toBe("1000");
	});

	test("the pre-rebrand variable is still read when the canonical one is unset", () => {
		expect(readTinyWorkerIdleMsEnv({ [TINY_WORKER_IDLE_MS_ENV_LEGACY]: "2000" })).toBe("2000");
	});

	test("the canonical variable wins when both are set", () => {
		expect(
			readTinyWorkerIdleMsEnv({
				[TINY_WORKER_IDLE_MS_ENV]: "1000",
				[TINY_WORKER_IDLE_MS_ENV_LEGACY]: "2000",
			}),
		).toBe("1000");
	});

	test("an empty canonical variable does not fall through to the legacy one", () => {
		// The worker does `Number(raw) || TINY_WORKER_IDLE_MS`, so an empty string
		// already means "use the default". Letting it fall through would let a
		// stale legacy export silently override a variable the user just cleared.
		expect(readTinyWorkerIdleMsEnv({ [TINY_WORKER_IDLE_MS_ENV]: "", [TINY_WORKER_IDLE_MS_ENV_LEGACY]: "2000" })).toBe(
			"",
		);
	});

	test("neither variable set yields undefined so the caller keeps its default", () => {
		expect(readTinyWorkerIdleMsEnv({})).toBeUndefined();
	});
});

describe("parent-to-child worker variables", () => {
	// These three have no legacy twin on purpose: the parent writes them and the
	// child reads them back through the same constants in one binary, so the
	// write key and the read key cannot drift apart.
	test.each([
		["socket", TINY_WORKER_SOCKET_ENV],
		["model", TINY_WORKER_MODEL_ENV],
		["tag", TINY_WORKER_TAG_ENV],
	])("the %s variable uses the canonical prefix", (_name, value) => {
		expect(value.startsWith("ULTRAWORKERS_")).toBe(true);
	});
});
