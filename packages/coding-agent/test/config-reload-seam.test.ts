import { afterEach, describe, expect, it } from "bun:test";
import {
	collectConfigReloadDeferrals,
	hasConfigReloadHandlers,
	onBeforeConfigReload,
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
 * NOT covered here, and stated rather than papered over: the call into this
 * registry from `Settings.#reloadFromWatch`. `startWatching()` is a no-op unless
 * it is the persisting process-global instance, so driving it needs a spawned
 * host and a real fs event. There is no row below that pretends otherwise.
 */

const disposers: Array<() => void> = [];

function register(handler: ConfigReloadHandler): () => void {
	const dispose = onBeforeConfigReload(handler);
	disposers.push(dispose);
	return dispose;
}

afterEach(() => {
	while (disposers.length > 0) disposers.pop()?.();
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

describe("the seam is reachable the way an extension reaches it", () => {
	it("resolves through the published config subpath", async () => {
		// `./config/*` is already in the package export map, so no new API surface
		// was added for this seam. This asserts the published path actually
		// resolves, because an extension that cannot import it cannot use it no
		// matter what the registry does.
		const viaPackage = await import("@oh-my-pi/pi-coding-agent/config/reload-observer");

		expect(typeof viaPackage.onBeforeConfigReload).toBe("function");
		expect(typeof viaPackage.collectConfigReloadDeferrals).toBe("function");
	});
});
