import { afterEach, describe, expect, it } from "bun:test";
import {
	collectConfigReloadDeferrals,
	hasAfterConfigReloadHandlers,
	hasConfigReloadHandlers,
	notifyConfigReloadApplied,
	onAfterConfigReload,
	onBeforeConfigReload,
	runConfigReloadPass,
	WatchSourceAccumulator,
	type ConfigReloadHandler,
} from "@oh-my-pi/pi-coding-agent/config/reload-observer";

/**
 * The watch path is real and predates this seam: `startWatching()` watches the
 * directories holding `config.yml`, the project settings files and `--config`
 * overlays, debounces at 200 ms, and applies with keep-last-good semantics. What
 * it could not do was tell anyone it was about to — the apply happened inside
 * `Settings`, with no event before it and no way to hold it.
 *
 * These cases drive the registry directly rather than standing up real fs
 * watchers: the contract under test is "a handler can hold a reload, and
 * unregistering gives the original answer back", and a watcher test would prove
 * the same thing through a 200 ms sleep that fails for timing reasons instead of
 * contract reasons.
 *
 * The call into this registry from `Settings.#reloadFromWatch` is covered
 * elsewhere — `config-reload-watch-path.test.ts` — because the registry rows
 * here cannot witness it. Measured: removing that call entirely (running
 * `#reloadPersistedLayers` directly) leaves every row below green. Keeping the
 * two levels apart is what makes that measurable: a single mixed file could not
 * say which level caught it.
 */

const disposers: Array<() => void> = [];
const appliedDisposers: Array<() => void> = [];

function register(handler: ConfigReloadHandler): () => void {
	const dispose = onBeforeConfigReload(handler);
	disposers.push(dispose);
	return dispose;
}

/** Register on the after-apply side, tracked separately so the two never cross-talk. */
function registerApplied(handler: Parameters<typeof onAfterConfigReload>[0]): () => void {
	const dispose = onAfterConfigReload(handler);
	appliedDisposers.push(dispose);
	return dispose;
}

afterEach(() => {
	while (disposers.length > 0) disposers.pop()?.();
	while (appliedDisposers.length > 0) appliedDisposers.pop()?.();
});

const INFO = { sources: ["/tmp/omp/config.yml"] };

describe("a registered handler sees a reload before it is applied", () => {
	it("is told which files triggered it", async () => {
		// The user is editing specific files and needs to know which. A handler
		// told only "something changed" cannot tell a config.yml edit from a
		// project settings edit, and those have different owners.
		let seen: readonly string[] | undefined;
		register(info => {
			seen = info.sources;
			return undefined;
		});

		await collectConfigReloadDeferrals(INFO);

		expect(seen).toEqual(["/tmp/omp/config.yml"]);
	});

	it("lets the reload through when no handler objects", async () => {
		// The direction that must not regress: registering an observer cannot
		// accidentally start blocking config changes.
		register(() => undefined);

		expect(await collectConfigReloadDeferrals(INFO)).toEqual([]);
	});
});

describe("a handler can hold the reload", () => {
	it("defers when it returns a reason", async () => {
		// The whole point. Without this a long-running tool or an open dialog has
		// no way to say "not right now" — it learns the edit landed after the fact.
		register(() => "a tool call is in flight");

		expect(await collectConfigReloadDeferrals(INFO)).toEqual(["a tool call is in flight"]);
	});

	it("collects every reason, and still consults every handler", async () => {
		// One handler deferring must not skip the ones after it: a later handler may
		// hold a lock it needs to release, or want to record that it was consulted.
		// Stopping at the first "no" would strand both.
		const consulted: string[] = [];
		register(() => "first holds it");
		register(() => {
			consulted.push("second");
			return "second also holds it";
		});

		const reasons = await collectConfigReloadDeferrals(INFO);

		expect(consulted).toEqual(["second"]);
		expect(reasons).toEqual(["first holds it", "second also holds it"]);
	});

	it("awaits an async handler before deciding", async () => {
		// An async handler is the normal case — deciding usually means asking a
		// runtime. Treating its promise as a non-reason would let the reload through
		// before the answer arrived, which is the opposite of a veto.
		register(async () => {
			await Bun.sleep(1);
			return "checked asynchronously";
		});

		expect(await collectConfigReloadDeferrals(INFO)).toEqual(["checked asynchronously"]);
	});

	it("treats an empty or blank reason as no objection", async () => {
		// `return ""` is the natural way to say "fine" in a handler that computes a
		// reason. Counting it as a deferral would silently freeze config updates.
		register(() => "");
		register(() => "   ");

		expect(await collectConfigReloadDeferrals(INFO)).toEqual([]);
	});

	it("restores the pass-through answer exactly once unregistered", async () => {
		// The red gate. A seam that cannot be removed is indistinguishable from a
		// hardcoded block, and the user's config would stay frozen with the
		// extension long gone.
		const before = await collectConfigReloadDeferrals(INFO);
		const dispose = register(() => "holding");
		expect(await collectConfigReloadDeferrals(INFO)).toEqual(["holding"]);

		dispose();

		expect(await collectConfigReloadDeferrals(INFO)).toEqual(before);
	});
});

describe("a bad registration is refused with a reason", () => {
	// Silently accepting one would leave a caller believing it can hold reloads
	// while the registry never calls it.

	it("refuses a non-function", () => {
		expect(() => onBeforeConfigReload(null as unknown as ConfigReloadHandler)).toThrow(/must be a function/);
		expect(() => onBeforeConfigReload("nope" as unknown as ConfigReloadHandler)).toThrow(/must be a function/);
		expect(hasConfigReloadHandlers()).toBe(false);
	});

	it("refuses the same handler twice", () => {
		// Registering twice would call it twice per reload, so one deferral would
		// look like two and the log would name a reason that fired once.
		const handler: ConfigReloadHandler = () => undefined;
		disposers.push(onBeforeConfigReload(handler));

		expect(() => onBeforeConfigReload(handler)).toThrow(/already registered/);
	});

	it("reports when nothing is registered", () => {
		// The seam's absence has to be observable, not merely quiet.
		expect(hasConfigReloadHandlers()).toBe(false);
		register(() => undefined);
		expect(hasConfigReloadHandlers()).toBe(true);
	});
});

describe("a debounced pass reports every file it merged, not just the last", () => {
	// The debounce collapses everything that changed inside a 200 ms window into
	// one apply. These cases defend what a pass is *told* to contain, which is the
	// half of the seam that is reachable without a process-global watcher.

	it("reports both files when two changed inside one pass", async () => {
		// The regression this shape was introduced to fix. `fs.watch` fires once per
		// write and the debounce restarts on each, so an editor that writes
		// `config.yml` and a project settings file at once produced a single apply.
		// Holding only the last path named just one of them, and the handler had no
		// way to know the other edit was being applied in the same pass — so it held
		// the reload for one file while the other silently landed.
		const accumulator = new WatchSourceAccumulator();
		accumulator.add("/tmp/omp/config.yml");
		accumulator.add("/tmp/omp/project/settings.json");

		let seen: readonly string[] = [];
		register(info => {
			seen = info.sources;
			return undefined;
		});

		await collectConfigReloadDeferrals({ sources: accumulator.snapshot() });

		expect(seen).toEqual(["/tmp/omp/config.yml", "/tmp/omp/project/settings.json"]);
	});

	it("counts a file once however many events it emitted", () => {
		// A single save can produce more than one `fs.watch` event (write, rename,
		// chmod). Reported twice, a handler comparing counts sees two changed files
		// when one changed, and a "was anything else touched?" check misfires.
		const accumulator = new WatchSourceAccumulator();
		accumulator.add("/tmp/omp/config.yml");
		accumulator.add("/tmp/omp/config.yml");

		expect(accumulator.snapshot()).toEqual(["/tmp/omp/config.yml"]);
	});

	it("still names the held edit on the retry that follows a deferral", async () => {
		// The failure mode a consume-on-read accumulator would create: the handler
		// holds the reload, the pass returns early, and the sources are gone. The
		// next change arrives, the handler is asked again, sees a different file,
		// and releases a lock protecting an edit that landed while it wasn't
		// looking. Snapshot must not consume.
		const accumulator = new WatchSourceAccumulator();
		accumulator.add("/tmp/omp/config.yml");
		const asked: (readonly string[])[] = [];
		register(info => {
			asked.push(info.sources);
			return "busy";
		});

		await collectConfigReloadDeferrals({ sources: accumulator.snapshot() });
		await collectConfigReloadDeferrals({ sources: accumulator.snapshot() });

		expect(asked).toEqual([["/tmp/omp/config.yml"], ["/tmp/omp/config.yml"]]);

		// ...and once the pass really does complete, they are history from here on.
		accumulator.clear();
		accumulator.add("/tmp/omp/project/settings.json");
		await collectConfigReloadDeferrals({ sources: accumulator.snapshot() });

		expect(asked[2]).toEqual(["/tmp/omp/project/settings.json"]);
	});
});

describe("a host learns that a reload actually landed", () => {
	// Before this existed the only reaction to a config change was the one
	// `Settings` performs itself. Anything that had to re-derive from the new
	// values — an extension re-contributing its resources, a cache keyed on a
	// setting — could only refuse the reload, never act on one that went through.

	it("is told which files the applied pass covered", async () => {
		// A host deciding whether to reload has to know what moved. Told only
		// "something changed", the safe response is to do nothing.
		let seen: readonly string[] | undefined;
		registerApplied(info => {
			seen = info.sources;
		});

		await notifyConfigReloadApplied(INFO);

		expect(seen).toEqual(["/tmp/omp/config.yml"]);
	});

	it("awaits an async handler before the notification resolves", async () => {
		// Firing and forgetting would let the apply finish while the work it
		// announced is still running, so the next config write races it.
		let finished = false;
		registerApplied(async () => {
			await Bun.sleep(1);
			finished = true;
		});

		await notifyConfigReloadApplied(INFO);

		expect(finished).toBe(true);
	});

	it("consults every handler even when one throws", async () => {
		// The safety property. The apply already happened, so a throw cannot undo
		// it — it can only skip the handlers after it, and those are the ones that
		// have to drop a cache or release a lock.
		const consulted: string[] = [];
		registerApplied(() => {
			throw new Error("this handler is broken");
		});
		registerApplied(() => {
			consulted.push("second");
		});

		await notifyConfigReloadApplied(INFO);

		expect(consulted).toEqual(["second"]);
	});

	it("does not let a throwing handler break the config watcher", async () => {
		// The observer is called from inside the watch path. Letting its exception
		// escape would turn "tell me it landed" into "the watcher stops applying
		// config", which is strictly worse than the bug this seam was added for.
		registerApplied(() => {
			throw new Error("boom");
		});

		await expect(notifyConfigReloadApplied(INFO)).resolves.toBeUndefined();
	});

	it("restores the pass-through answer exactly once unregistered", async () => {
		// The red gate, same shape as the before-handler's: a seam that cannot be
		// removed is indistinguishable from a hardwired call.
		const calls: string[] = [];
		const dispose = registerApplied(() => {
			calls.push("host");
		});
		await notifyConfigReloadApplied(INFO);

		dispose();
		await notifyConfigReloadApplied(INFO);

		expect(calls).toEqual(["host"]);
	});

	it("keeps the two registries apart", async () => {
		// A before-handler that also answered the after notification would run twice
		// per pass — and its whole job is deciding whether the pass happens.
		let before = 0;
		let after = 0;
		register(() => {
			before++;
			return undefined;
		});
		registerApplied(() => {
			after++;
		});

		await notifyConfigReloadApplied(INFO);

		expect(before).toBe(0);
		expect(after).toBe(1);
	});

	it("reports when nothing is listening", () => {
		expect(hasAfterConfigReloadHandlers()).toBe(false);
		registerApplied(() => undefined);
		expect(hasAfterConfigReloadHandlers()).toBe(true);
	});

	it("refuses a bad registration rather than storing it", () => {
		expect(() => onAfterConfigReload(null as unknown as () => void)).toThrow(/must be a function/);
		expect(hasAfterConfigReloadHandlers()).toBe(false);

		const handler = () => undefined;
		appliedDisposers.push(onAfterConfigReload(handler));
		expect(() => onAfterConfigReload(handler)).toThrow(/already registered/);
	});
});

describe("a held reload is never announced as applied", () => {
	// The pairing that makes the two seams one thing rather than two. The registries
	// do not call each other, so this lives in `runConfigReloadPass` — the only place
	// the order of "ask, apply, tell" exists — and these rows drive that.

	it("tells nobody when a handler holds the pass", async () => {
		// The failure a4's mutation targets: a handler says "not now", the edit is
		// never applied, and a host that re-derives state on the notification rebuilds
		// from values that were rolled back. No notification is the only correct answer.
		let notified = 0;
		registerApplied(() => {
			notified++;
		});
		register(() => "a tool call is in flight");
		let applied = false;

		const result = await runConfigReloadPass(INFO, async () => {
			applied = true;
		});

		expect(applied).toBe(false);
		expect(notified).toBe(0);
		expect(result.applied).toBe(false);
	});

	it("tells everybody once the pass goes through", async () => {
		// The other direction, and the one that must not be lost when the first is
		// implemented: an unheld pass is applied *and* announced. A guard that
		// swallowed the notification whenever any handler was registered would pass
		// the row above and silently break every real host.
		const announced: string[] = [];
		register(() => undefined);
		registerApplied(info => {
			announced.push(...info.sources);
		});
		let applied = false;

		const result = await runConfigReloadPass(INFO, async () => {
			applied = true;
		});

		expect(applied).toBe(true);
		expect(announced).toEqual(["/tmp/omp/config.yml"]);
		expect(result.deferrals).toEqual([]);
	});

	it("holds the notification while an async handler is still deciding", async () => {
		// A veto that arrives late is still a veto. If the apply were awaited without
		// first awaiting the handlers, this pass would land the change and then tell a
		// host it landed — after the handler that objected had said not to.
		register(async () => {
			await Bun.sleep(1);
			return "decided asynchronously";
		});
		let notified = 0;
		registerApplied(() => {
			notified++;
		});
		let applied = false;

		await runConfigReloadPass(INFO, async () => {
			applied = true;
		});

		expect(applied).toBe(false);
		expect(notified).toBe(0);
	});

	it("refuses to announce a pass whose apply failed", async () => {
		// The no-lie contract. If this caught the failure and notified anyway, a host
		// would rebuild its state from values that were never applied — under
		// keep-last-good the old ones are still in force, so the host would be
		// confidently wrong. The caller owns a failed apply, because only the caller
		// knows whether the pass is retryable; `Settings` records the failure and lets
		// the sources stand for the next pass.
		let notified = 0;
		registerApplied(() => {
			notified++;
		});

		const outcome = await runConfigReloadPass(INFO, async () => {
			throw new Error("the on-disk config is invalid");
		}).then(
			() => "resolved",
			() => "rejected",
		);

		expect(outcome).toBe("rejected");
		expect(notified).toBe(0);
	});

	it("reports the held edit's files back to the caller that owns the retry", async () => {
		// The caller clears its accumulator only on an applied pass, so a held one has
		// to hand back the sources it did not consume — otherwise the retry arrives
		// naming a different edit and a handler releases a lock over the wrong one.
		const sources = ["/tmp/omp/config.yml", "/tmp/omp/project/settings.json"] as const;
		register(() => "busy");

		const result = await runConfigReloadPass({ sources }, async () => {});

		expect(result.sources).toEqual(["/tmp/omp/config.yml", "/tmp/omp/project/settings.json"]);
		expect(result.deferrals).toEqual(["busy"]);
	});
});

describe("the seam is reachable the way an extension reaches it", () => {
	it("resolves through the published config subpath", async () => {
		// `./config/*` is already in the package export map, so no new API surface
		// was added for this seam. This asserts the published path actually
		// resolves, because an extension that cannot import it cannot use it no
		// matter what the registry does.
		const viaPackage = await import("@oh-my-pi/pi-coding-agent/config/reload-observer");

		expect(typeof viaPackage.onBeforeConfigReload).toBe("function");
		expect(typeof viaPackage.collectConfigReloadDeferrals).toBe("function");
		expect(typeof viaPackage.onAfterConfigReload).toBe("function");
		expect(typeof viaPackage.notifyConfigReloadApplied).toBe("function");
		expect(typeof viaPackage.runConfigReloadPass).toBe("function");
	});
});
