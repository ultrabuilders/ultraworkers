import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type { ExtensionError } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { getProjectAgentDir, TempDir } from "@oh-my-pi/pi-utils";
import { createInMemoryAuthStorage } from "../helpers/agent-session-setup";
import { HOOK_RESULT_CODES, validateHookResult } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/result-validation";

/**
 * A hook return value crosses straight into host control flow: `session_stop`
 * decides whether the session continues, `session_before_*` cancels a switch.
 * These tests hold two lines at once.
 *
 * The permissive half is the load-bearing one. Tightening this validator is a
 * breaking change against every extension already published, so a value that is
 * legal today must keep passing — and a test that only checked rejection would
 * happily accept a validator that broke the installed base.
 */
describe("validateHookResult — values that are legal today", () => {
	const legal: readonly [string, unknown][] = [
		// A handler that returns nothing declines to act. This is the most common
		// return value in existence and must never become a diagnostic.
		["session_stop", undefined],
		["session.compacting", undefined],
		["session_before_switch", undefined],
		["session_stop", {}],
		["session_stop", { continue: true }],
		["session_stop", { continue: true, additionalContext: "keep going", reason: "user asked" }],
		["session_stop", { decision: "block", reason: "tool still running" }],
		["session.compacting", { context: ["a", "b"], prompt: "summarise" }],
		["session.compacting", { preserveData: { any: "shape" } }],
		["session_before_switch", { cancel: true }],
		["session_before_switch", { cancel: false }],
		["session_before_compact", { cancel: true, summary: { text: "s" } }],
	];

	for (const [event, value] of legal) {
		it(`accepts ${JSON.stringify(value)} for ${event}`, () => {
			expect(validateHookResult(event, value)).toEqual({ ok: true });
		});
	}

	it("accepts unknown fields, because extensions may attach their own bookkeeping", () => {
		// Rejecting unrecognised keys would break every published extension that
		// returns something richer than the documented shape. Only KNOWN fields
		// with the wrong type are a diagnostic.
		const decorated = { cancel: true, myOwnBookkeeping: { attempts: 3 }, experimentalFlag: "yes" };

		expect(validateHookResult("session_before_switch", decorated)).toEqual({ ok: true });
	});

	it("passes an event type it does not know rather than guessing", () => {
		// Judging a shape this version cannot see would mean inventing rules for
		// every future event. Unknown events pass; the known ones are guarded.
		expect(validateHookResult("some.future_event", { anything: 1 })).toEqual({ ok: true });
	});
});

describe("validateHookResult — values the host cannot act on", () => {
	it("rejects a non-object with a stable code", () => {
		const verdict = validateHookResult("session_stop", "block");

		expect(verdict.ok).toBe(false);
		if (verdict.ok) return;
		expect(verdict.code).toBe("hook-result-not-an-object");
		expect(verdict.detail).toContain("string");
	});

	it("rejects an array, which would silently drop every field", () => {
		const verdict = validateHookResult("session_stop", [{ continue: true }]);

		expect(verdict.ok).toBe(false);
		if (verdict.ok) return;
		expect(verdict.code).toBe("hook-result-not-an-object");
	});

	it("rejects a mistyped cancel rather than coercing it", () => {
		// `"false"` is truthy, so reading it as a boolean cancels a session the
		// extension meant to allow.
		const verdict = validateHookResult("session_before_switch", { cancel: "false" });

		expect(verdict.ok).toBe(false);
		if (verdict.ok) return;
		expect(verdict.code).toBe("hook-result-invalid-field");
		expect(verdict.detail).toContain("cancel");
		expect(verdict.detail).toContain("boolean");
	});

	it("rejects a session_stop decision the host has no branch for", () => {
		// The type is the literal "block". Anything else — including "allow",
		// which reads as permission — would be taken as "let it stop".
		const verdict = validateHookResult("session_stop", { decision: "allow" });

		expect(verdict.ok).toBe(false);
		if (verdict.ok) return;
		expect(verdict.code).toBe("hook-result-invalid-field");
		expect(verdict.detail).toContain("decision");
	});

	it("rejects a compacting context that is not an array of strings", () => {
		for (const bad of [{ context: "one line" }, { context: [1, 2] }, { context: ["ok", null] }]) {
			const verdict = validateHookResult("session.compacting", bad);
			expect(verdict.ok).toBe(false);
			if (!verdict.ok) expect(verdict.code).toBe("hook-result-invalid-field");
		}
	});

	it("rejects a mistyped prompt and additionalContext", () => {
		expect(validateHookResult("session.compacting", { prompt: 7 }).ok).toBe(false);
		expect(validateHookResult("session_stop", { additionalContext: {} }).ok).toBe(false);
		expect(validateHookResult("session_stop", { continue: 1 }).ok).toBe(false);
	});

	it("only judges the fields the named event actually reads", () => {
		// `context` belongs to session.compacting. Reading it on session_stop
		// would fail a value the host never looks at.
		expect(validateHookResult("session_stop", { context: ["not a string here"] })).toEqual({ ok: true });
	});
});

describe("code stability", () => {
	it("emits only codes drawn from the published set", () => {
		// Host control flow and other tests branch on these. A typo'd code would
		// leave a caller unable to match, and the failure would be silent.
		const samples: readonly [string, unknown][] = [
			["session_stop", "nope"],
			["session_stop", []],
			["session_before_switch", { cancel: 0 }],
			["session_stop", { decision: "allow" }],
			["session.compacting", { context: 1 }],
		];
		for (const [event, value] of samples) {
			const verdict = validateHookResult(event, value);
			expect(verdict.ok).toBe(false);
			if (verdict.ok) continue;
			expect(HOOK_RESULT_CODES).toContain(verdict.code);
		}
	});
});

/**
 * The unit half above proves the validator's verdicts. This half proves the host
 * acts on them: a value it refuses must not reach control flow, and the listener
 * must receive a code rather than a sentence it has to parse.
 *
 * The case is chosen for what it would do if the guard were absent. `"false"` is
 * a truthy string, so an unvalidated `cancel` cancels the very switch the
 * extension wrote it to allow — a failure with no error message anywhere, only a
 * session that mysteriously refuses to change.
 */
describe("the runner refuses a hook result it cannot act on", () => {
	let tempDir: TempDir;
	let extensionsDir: string;
	let sessionManager: SessionManager;

	const authStorage = createInMemoryAuthStorage();
	const modelRegistry = new ModelRegistry(authStorage);

	beforeEach(() => {
		tempDir = TempDir.createSync("@pi-hook-result-");
		extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		sessionManager = SessionManager.inMemory();
	});

	afterEach(() => {
		tempDir.removeSync();
	});

	afterAll(() => {
		authStorage.close();
	});

	/** Install an extension whose only handler returns `body` verbatim. */
	async function runnerReturning(body: string): Promise<{ runner: ExtensionRunner; errors: ExtensionError[] }> {
		fs.writeFileSync(
			path.join(extensionsDir, "bad-result.ts"),
			`export default function(pi) {
				pi.on("session_before_switch", () => (${body}));
			}`,
		);
		const result = await loadExtensions([path.join(extensionsDir, "bad-result.ts")], tempDir.path());
		const runner = new ExtensionRunner(
			result.extensions,
			result.runtime,
			tempDir.path(),
			sessionManager,
			modelRegistry,
			undefined,
			Settings.isolated({}),
		);
		const errors: ExtensionError[] = [];
		runner.onError(error => errors.push(error));
		return { runner, errors };
	}

	const switchEvent = { type: "session_before_switch", reason: "new" } as const;

	it("hands the listener a stable code instead of a prose failure", async () => {
		const { runner, errors } = await runnerReturning(`{ cancel: "false" }`);

		await runner.emit(switchEvent);

		expect(errors).toHaveLength(1);
		expect(errors[0]?.code).toBe("hook-result-invalid-field");
		expect(errors[0]?.detail).toContain("cancel");
		// The log line a user actually sees still carries the code, because a
		// consumer reading `error` must not have to know the other two fields exist.
		expect(errors[0]?.error).toContain("hook-result-invalid-field");
		expect(errors[0]?.event).toBe("session_before_switch");
	});

	it("keeps the refused value out of control flow rather than coercing it", async () => {
		// Without the guard, `"false"` is truthy and the switch is cancelled. The
		// switch proceeding is the observable proof the value never got read as a
		// boolean — a test asserting only on `errors` would still pass if the host
		// reported the problem and then acted on it anyway.
		const { runner, errors } = await runnerReturning(`{ cancel: "false" }`);

		const result = await runner.emit(switchEvent);

		expect(result).toBeUndefined();
		expect(errors).toHaveLength(1);
	});

	it("leaves a legal result alone, so the guard costs nothing when it holds", async () => {
		const { runner, errors } = await runnerReturning(`{ cancel: true }`);

		const result = await runner.emit(switchEvent);

		expect(result).toEqual({ cancel: true });
		expect(errors).toHaveLength(0);
	});
});
