import { describe, expect, it } from "bun:test";
import type { Api, Model } from "@oh-my-pi/pi-ai";
import {
	AUDITOR_TOOL_NAMES,
	type AuditorSessionFactory,
	type AuditorSessionLike,
	type AuditorSessionSpec,
	buildAuditorIsolation,
	runGoalCompletionAuditor,
} from "@oh-my-pi/pi-coding-agent/goals/auditor/session";

/**
 * epic-fj9g (P2) — the isolated session and its two fences.
 *
 * The session factory is injected, so every row here runs without a model and without
 * network. What is under test is the *shape of the isolation the factory is handed* and
 * the verdict each failure path produces — not the auditor's judgement, which is a model's
 * job and is exactly what the marker contract cannot fake.
 */

function model(id: string, provider: string): Model<Api> {
	return { id, provider, name: id } as unknown as Model<Api>;
}

const auditorModel = model("reviewer-model", "reviewer-provider");

interface Behaviour {
	/** Text the fake auditor emits. Omit for "emits nothing". */
	text?: string;
	/**
	 * Fire the signal from inside prompt(), which then returns normally — the shape of
	 * a real mid-audit cancellation, where `abort()` does not throw.
	 */
	onPrompt?: () => void;
	throwOnPrompt?: Error;
}

/** A factory that records the spec it was asked to build, plus what the session did. */
function fakeFactory(behaviour: Behaviour = {}) {
	const seen: { spec?: AuditorSessionSpec; aborted: boolean; disposed: boolean } = {
		aborted: false,
		disposed: false,
	};
	let promptedWith = "";

	const factory: AuditorSessionFactory = async (spec) => {
		seen.spec = spec;
		let listeners: ((event: unknown) => void)[] = [];
		const session: AuditorSessionLike = {
			subscribe(listener) {
				listeners.push(listener);
				return () => {
					listeners = listeners.filter((entry) => entry !== listener);
				};
			},
			abort() {
				seen.aborted = true;
			},
			dispose() {
				seen.disposed = true;
			},
			async prompt(text) {
				promptedWith = text;
				if (behaviour.throwOnPrompt) throw behaviour.throwOnPrompt;
				if (behaviour.text !== undefined) {
					for (const listener of listeners) {
						listener({ type: "message_update", part: { type: "text", text: behaviour.text } });
					}
				}
				behaviour.onPrompt?.();
				return undefined;
			},
		};
		return session;
	};

	return { factory, seen, prompted: () => promptedWith };
}

function run(overrides: Partial<Parameters<typeof runGoalCompletionAuditor>[0]> = {}, behaviour: Behaviour = {}) {
	const { factory, seen, prompted } = fakeFactory(behaviour);
	return {
		seen,
		prompted,
		result: runGoalCompletionAuditor({
			createSession: factory,
			cwd: "/repo",
			model: auditorModel,
			objective: "ship the thing",
			...overrides,
		}),
	};
}

describe("buildAuditorIsolation", () => {
	it("cannot offer the goal tool, so the auditor cannot close its own goal", () => {
		// The self-review this whole feature exists to prevent: an auditor that can call
		// goal({op:"complete"}) needs no verdict at all.
		const { toolNames, restrictToolNames } = buildAuditorIsolation();
		expect(restrictToolNames).toBe(true);
		expect(toolNames).not.toContain("goal");
	});

	it("cannot offer the task tool, so the auditor cannot spawn anything — itself included", () => {
		// Stronger than the reference's blockedAgent, which only blocks re-entering the
		// same agent type. With no task tool there is no spawn path to block.
		expect(buildAuditorIsolation().toolNames).not.toContain("task");
	});

	it("can read files, because an audit that cannot look is not an audit", () => {
		expect(AUDITOR_TOOL_NAMES).toContain("read");
		expect(buildAuditorIsolation().toolNames).toContain("grep");
	});

	it("inherits none of the author's resources and reaches no ambient capability", () => {
		const isolation = buildAuditorIsolation();
		expect(isolation.skills).toEqual([]);
		expect(isolation.rules).toEqual([]);
		expect(isolation.contextFiles).toEqual([]);
		expect(isolation.promptTemplates).toEqual([]);
		expect(isolation.slashCommands).toEqual([]);
		expect(isolation.disableExtensionDiscovery).toBe(true);
		expect(isolation.enableMCP).toBe(false);
		expect(isolation.enableLsp).toBe(false);
		expect(isolation.enableIrc).toBe(false);
	});
});

describe("runGoalCompletionAuditor", () => {
	it("hands the session factory the fence, not just the tool list", () => {
		// The allowlist is only a fence if the session actually restricts to it.
		const { seen, result } = run({}, { text: "<approved/>" });
		return result.then(() => {
			expect(seen.spec?.restrictToolNames).toBe(true);
			expect(seen.spec?.toolNames).toEqual([...AUDITOR_TOOL_NAMES]);
			expect(seen.spec?.toolNames).not.toContain("goal");
			expect(seen.spec?.enableMCP).toBe(false);
			expect(seen.spec?.skills).toEqual([]);
		});
	});

	it("approves only on the exact final-line marker", () => {
		const { result } = run({}, { text: "Everything checks out.\n<approved/>" });
		return result.then((outcome) => {
			expect(outcome.verdict).toBe("approved");
			expect(outcome.error).toBeUndefined();
		});
	});

	it("refuses an unresolved model instead of running an audit", () => {
		const { seen, result } = run({ modelError: "Provider-only auditor configuration is refused" });
		return result.then((outcome) => {
			expect(outcome.verdict).toBe("error");
			expect(outcome.error).toContain("Provider-only");
			expect(seen.spec).toBeUndefined();
		});
	});

	it("refuses a signal already aborted before the prompt, without starting a session", () => {
		const controller = new AbortController();
		controller.abort();
		const { seen, result } = run({ signal: controller.signal });
		return result.then((outcome) => {
			expect(outcome.verdict).toBe("error");
			expect(outcome.error).toBe("Auditor aborted.");
			expect(seen.spec).toBeUndefined();
		});
	});

	it("treats an abort during the prompt as aborted, because abort() does not throw", () => {
		// The reference's subtlety, copied with its reason: the loop returns normally
		// with partial output, so a signal check only BEFORE prompt() misses it. The
		// signal fires from inside prompt() here, so this row cannot pass by an abort
		// that landed before the session was ever built.
		const controller = new AbortController();
		const { result } = run({ signal: controller.signal }, {
			text: "some partial findings\n<approved/>",
			onPrompt: () => controller.abort(),
		});
		return result.then((outcome) => {
			expect(outcome.verdict).toBe("error");
			expect(outcome.error).toBe("Auditor aborted.");
		});
	});

	it("surfaces a throwing session as an error, never an approval", () => {
		const { result } = run({}, { throwOnPrompt: new Error("session exploded") });
		return result.then((outcome) => {
			expect(outcome.verdict).toBe("error");
			expect(outcome.error).toBe("session exploded");
		});
	});

	it("disapproves when the auditor produced no text at all", () => {
		const { result } = run({}, {});
		return result.then((outcome) => {
			expect(outcome.verdict).toBe("disapproved");
			expect(outcome.error).toBeUndefined();
		});
	});

	it("disapproves prose that merely mentions the marker", () => {
		const { result } = run({}, { text: "I would only emit <approved/> if the gate were green." });
		return result.then((outcome) => {
			expect(outcome.verdict).toBe("disapproved");
		});
	});

	it("shows the objective to the auditor it just built a prompt for", () => {
		const { prompted, result } = run({ objective: "ship the flagged migration" }, { text: "<approved/>" });
		return result.then(() => {
			expect(prompted()).toContain("ship the flagged migration");
		});
	});
});