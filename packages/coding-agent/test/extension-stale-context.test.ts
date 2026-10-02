import { afterAll, describe, expect, it } from "bun:test";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { ExtensionRuntime } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { TempDir } from "@oh-my-pi/pi-utils";
import type { ExtensionCommandContextActions, ReplacedSessionContext } from "../src/extensibility/extensions/types";
import { createInMemoryAuthStorage } from "./helpers/agent-session-setup";

/**
 * A command context captured before a session replacement used to keep working
 * against the session that was torn down — a silent use-after-free, because
 * nothing in the surface ever said the context had gone stale.
 *
 * `withSession` is the way out, and `assertActive` is the opt-in hard failure.
 * Both are additive on purpose: an extension already published against the old
 * behaviour must not start throwing, so a replacement only moves the ground under
 * contexts minted AFTER it. These tests pin that boundary — the cases here are
 * the ones where a "helpful" change would silently break a working extension,
 * which is the failure this seam is most able to cause.
 */

const authStorage = createInMemoryAuthStorage();
const modelRegistry = new ModelRegistry(authStorage);
const tempDir = TempDir.createSync("@ultraworkers-stale-ctx-");

afterAll(() => {
	tempDir.remove();
	authStorage.close();
});

interface Harness {
	runner: ExtensionRunner;
	runtime: ExtensionRuntime;
	calls: string[];
	/** Make the next replacement succeed or be refused by the host. */
	setReplacement: (cancelled: boolean) => void;
}

/**
 * A runner wired with only the command actions, since that is the surface under
 * test. The event and tool actions are never reached by these cases, so they are
 * left absent rather than simulated into a false impression of coverage.
 */
function harness(): Harness {
	const runtime = new ExtensionRuntime();
	const runner = new ExtensionRunner(
		[],
		runtime,
		tempDir.path(),
		SessionManager.inMemory(tempDir.path()),
		modelRegistry,
		undefined,
		Settings.isolated({}),
	);
	const calls: string[] = [];
	let cancelled = false;

	const commandActions = {
		getContextUsage: () => undefined,
		waitForIdle: async () => {},
		newSession: async () => {
			calls.push("newSession");
			return { cancelled };
		},
		branch: async () => ({ cancelled }),
		navigateTree: async () => ({ cancelled: true }),
		compact: async () => {},
		switchSession: async () => ({ cancelled }),
		reload: async () => {
			calls.push("reload");
		},
	} as unknown as ExtensionCommandContextActions;

	// `createCommandContext` spreads `createContext()`, and that spread reads the
	// `model` getter — so `getModel` has to be present even though no assertion
	// here touches the model. Supplying a bare object would fail at context
	// construction, which reads as a bug in the seam rather than in the fixture.
	const contextActions = {
		getModel: () => undefined,
		isIdle: () => true,
		abort: () => {},
		hasPendingMessages: () => false,
		shutdown: () => {},
		getContextUsage: () => undefined,
		compact: async () => {},
		getSystemPrompt: () => [],
	} as unknown as Parameters<ExtensionRunner["initialize"]>[1];

	runner.initialize({} as never, contextActions, commandActions, undefined, "print");

	return {
		runner,
		runtime,
		calls,
		setReplacement: (value: boolean) => {
			cancelled = value;
		},
	};
}

describe("stale-context invalidation seam", () => {
	it("hands a usable context to withSession after a successful replacement", async () => {
		// The contract an extension author actually depends on: the callback runs,
		// and the context it receives works. A context that is merely present but
		// dead would make `withSession` a trapdoor, and the seam worse than useless.
		const { runner, calls } = harness();
		const ctx = runner.createCommandContext();
		let replacement: ReplacedSessionContext | undefined;

		await ctx.newSession({
			withSession: async fresh => {
				replacement = fresh;
			},
		});
		expect(replacement).toBeDefined();
		expect(typeof replacement?.getContextUsage).toBe("function");
		expect(typeof replacement?.sendMessage).toBe("function");
		// Usable, not merely present: a host action runs through it.
		await replacement?.newSession();
		expect(calls).toEqual(["newSession", "newSession"]);
	});

	it("does not invalidate or fire withSession when the host refuses the replacement", async () => {
		// A cancelled newSession leaves the SAME session running. Invalidating here
		// would retire every live context on the strength of a switch that never
		// happened — the one case where this seam could break a working extension.
		const { runtime, runner, setReplacement } = harness();
		setReplacement(true);
		const ctx = runner.createCommandContext();
		let fired = false;

		await ctx.newSession({
			withSession: async () => {
				fired = true;
			},
		});

		expect(fired).toBe(false);
		expect(() => runtime.assertActive()).not.toThrow();
	});

	it("assertActive throws after a replacement, naming the calls and the way out", async () => {
		// The message is the product for an extension author: a generic "stale
		// object" reads as their own bug and gets debugged in the wrong place.
		const { runtime, runner } = harness();
		await runner.createCommandContext().newSession();

		let thrown: Error | undefined;
		try {
			runtime.assertActive();
		} catch (error) {
			thrown = error as Error;
		}
		expect(thrown?.name).toBe("ExtensionContextStaleError");
		expect(thrown?.message).toContain("ctx.newSession()");
		expect(thrown?.message).toContain("withSession");
	});

	it("assertActive does not throw before any replacement", () => {
		// Back-compat stated as a test so a refactor cannot lose it: a guard that is
		// red from the start is a guard nobody can satisfy.
		const { runtime } = harness();
		expect(() => runtime.assertActive()).not.toThrow();
	});

	it("leaves a pre-replacement context usable, which is what keeps this non-breaking", async () => {
		// The deliberate design choice, pinned so a future "just assert everywhere"
		// change breaks this test loudly instead of silently shipping a regression
		// for every extension already published.
		const { runner, calls } = harness();
		const captured = runner.createCommandContext();
		await runner.createCommandContext().newSession();

		await captured.reload();
		expect(calls).toEqual(["newSession", "reload"]);
	});

	it("invalidates the context withSession was handed when that one replaces again", async () => {
		// Chained replacement: the second switch must retire the context the first
		// one produced, or a ctx captured inside a withSession body outlives its own
		// session with nothing to say so.
		const { runtime, runner } = harness();
		let first: ReplacedSessionContext | undefined;

		await runner.createCommandContext().newSession({
			withSession: async fresh => {
				first = fresh;
			},
		});
		await first?.newSession();

		expect(() => runtime.assertActive()).toThrow(/stale/);
	});
});
