import * as path from "node:path";
import { postmortem, logger } from "@oh-my-pi/pi-utils";
import { theme } from "@oh-my-pi/pi-tui/theme";
import { extractUriScheme } from "../internal-urls/parse";
import { InternalUrlRouter } from "../internal-urls/router";
import { expandPath } from "../tools/path-utils";
import { unavailableFrameMessage, type FramelessGuard } from "./extensions/unavailable-ui";
import type { HookUIContext } from "./hooks/types";

/**
 * Resolve a file path:
 * - Absolute paths used as-is
 * - Paths starting with ~ expanded to home directory
 * - Relative paths resolved from cwd
 */
export function resolvePath(filePath: string, cwd: string): string {
	const expanded = expandPath(filePath);
	if (InternalUrlRouter.instance().canHandle(expanded)) {
		throw new Error(
			`Path "${filePath}" uses internal scheme "${extractUriScheme(expanded)}://" and must be resolved through the proper protocol handler, not as a filesystem path.`,
		);
	}
	if (path.isAbsolute(expanded)) {
		return expanded;
	}
	return path.resolve(cwd, expanded);
}

/**
 * Create a no-op UI context for headless modes.
 */
/**
 * A custom tool runs before `setUIContext` swaps in the real context, so it sees this
 * `HookUIContext` — which has no `hasUI` member at all. `pi.ui.hasUI` is therefore
 * `undefined`: falsy, so `if (pi.ui.hasUI)` skips the call that would otherwise throw.
 * Absent is not the same as declared `false`, but the advice behaves identically, so
 * the message may name the guard here.
 */
const FRAMELESS_GUARD = "hasUI-blocks-the-call" satisfies FramelessGuard;

export function createNoOpUIContext(): HookUIContext {
	return {
		select: async () => undefined,
		confirm: async () => false,
		input: async () => undefined,
		// Same decision as `noOpUIContext.notify`: logged, not swallowed and not thrown.
		// See the comment there for why those three are not the same choice. The prefix
		// names this context so the two are distinguishable in the log — they are the
		// only two places a `notify` can vanish, and "which seam swallowed it" is the
		// first question when reading one of these back.
		notify: (message, type) => {
			logger.debug("Extension notification dropped (custom tool context)", { message, type });
		},
		setStatus: () => {},
		custom: () => {
			// The same lie as `noOpUIContext.custom` and the ACP/RPC contexts, fixed for
			// the same reason: `undefined as never` satisfies `Promise<T>` while handing
			// back a value the author's factory never produced. A custom tool's module
			// body runs during `load()`, so this context is live before `setUIContext`
			// swaps it — a top-level `await pi.ui.custom(...)` would get `undefined` and
			// no error, with nothing having run to produce it.
			throw new Error(unavailableFrameMessage("custom", "a headless mode", FRAMELESS_GUARD));
		},
		setEditorText: () => {},
		getEditorText: () => "",
		editor: async () => undefined,
		get theme() {
			return theme;
		},
	};
}

/**
 * A registered handler. Structurally identical to the `HandlerFn` each loader
 * declares locally, so their values pass straight in without the loaders having
 * to import from here.
 */
type HandlerFn = (...args: unknown[]) => Promise<unknown>;

/**
 * Build an identity-safe disposer for one registered handler.
 *
 * Scope note: this withdraws a single handler registration. It is NOT an unload —
 * extension modules are never unloaded, and the `Bun.plugin()` hooks in
 * `extensibility/plugins/legacy-pi-compat.ts` are process-global and permanent by
 * construction. What it buys is that a caller who registered a handler under a
 * condition can take it back out when the condition ends, instead of the handler
 * outliving whatever justified it.
 *
 * Removal is by identity, never by index: between `on()` and the disposer call the
 * list may have shifted, and a second call must be a no-op rather than evicting
 * whichever neighbour moved into the old slot. When the list empties, the Map key
 * is deleted so the key set does not grow across extension reloads.
 *
 * Identity is the only thing that can distinguish two registrations, so registering
 * the SAME function reference twice and then disposing both removes it after the
 * first. That is the correct reading of "each `on()` is one registration", not a
 * bug — but it reads like one, hence this note.
 */
export function createHandlerDisposer(
	handlers: Map<string, HandlerFn[]>,
	event: string,
	handler: HandlerFn,
): () => void {
	return () => {
		const list = handlers.get(event);
		if (!list) return;
		const index = list.indexOf(handler);
		if (index === -1) return;
		list.splice(index, 1);
		if (list.length === 0) handlers.delete(event);
	};
}

/**
 * Raised by {@link withHostGuard} when a guarded callback synchronously
 * attempts to terminate the host process. Callers catch this like any other
 * load-time failure so the extension/hook is skipped with a logged error
 * instead of taking the CLI down with it.
 */
export class ExtensionExitError extends Error {
	readonly code: number | string | undefined;
	constructor(
		code: number | string | undefined,
		readonly alias = "process.exit",
	) {
		super(
			`Module called ${alias}(${code === undefined ? "" : String(code)}) during guarded extension/hook loading; ` +
				`OMP extension/hook modules must not terminate the host process.`,
		);
		this.name = "ExtensionExitError";
		this.code = code;
	}
}

type ExitAliasName = "process.exit" | "process.reallyExit";

/**
 * stdin events a loaded module must not be allowed to leave hijacked. A
 * top-level `new StdioServerTransport()` (or a bare `process.stdin.resume()`)
 * inside a `~/.claude/tools` MCP server attaches a `data` consumer and puts the
 * shared stdin into flowing mode; Bun delivers one `data` event to that
 * consumer and the TUI's own listener (attached later in `terminal.start()`)
 * then never re-arms — every keypress after the first is swallowed (#5618).
 */
const HOST_GUARD_STDIN_EVENTS = ["data", "readable", "end", "close", "error"] as const;
type StdinGuardEvent = (typeof HOST_GUARD_STDIN_EVENTS)[number];
type StdinGuardListener = (...args: unknown[]) => void;

let hostGuardDepth = 0;
let hostGuardOriginalProcessExit: typeof process.exit | null = null;
let hostGuardOriginalReallyExit: typeof process.reallyExit | null = null;
let hostGuardStdinListeners: Record<StdinGuardEvent, StdinGuardListener[]> | null = null;
let hostGuardStdinWasPaused = false;
let hostGuardStdinWasRaw = false;

/**
 * Build the throwing replacement that stands in for `process.exit` or
 * `process.reallyExit` while a guard window is open.
 *
 * A synchronous exit cannot be intercepted by `try/catch`, so the only way to stop a
 * stranger's module from killing OMP during startup is to remove the primitive and put
 * something throwable in its place. Each stub is stamped by its caller with the native
 * exit it shadows, so host-owned shutdown can still reach the real thing (#6488).
 *
 * Which windows exist, how they nest, and what a window that never closes costs belong to
 * {@link withHostGuard}, whose it is; this factory only makes one stub.
 */
function guardedExit(alias: ExitAliasName): (code?: number | string) => never {
	return (code?: number | string): never => {
		throw new ExtensionExitError(code, alias);
	};
}

/** What the host guard is currently doing to this process. */
export interface HostGuardState {
	/** Guard windows opened but not yet closed. Stays above zero after an abandoned window. */
	readonly depth: number;
	/** Whether `process.exit` is currently replaced by a throwing stub. */
	readonly exitGuarded: boolean;
	/** Whether `process.reallyExit` is currently replaced by a throwing stub. */
	readonly reallyExitGuarded: boolean;
}

/**
 * Report what `withHostGuard` is currently doing to this process.
 *
 * The guard fences host-owned state while third-party module code runs and restores it in
 * a `finally`. A window that is opened and never closed leaves that state fenced for the
 * rest of the process: `process.exit` stays replaced by a stub that throws, and no later
 * `withHostGuard` re-arms or restores, because it sees a window already open. A leaked
 * window is something only an abandoned continuation can produce — a test harness that
 * starts a guard and never lets it settle — and until now nothing reported it. The guard
 * then keeps failing for reasons that have nothing to do with whatever the process is
 * actually doing.
 *
 * This reads the guard's own bookkeeping and changes nothing. It exists because "fenced
 * right now, as intended" and "still fenced long after the window that fenced it is gone"
 * are indistinguishable from the outside, and only the second is a defect.
 */
export function hostGuardState(): HostGuardState {
	return {
		depth: hostGuardDepth,
		exitGuarded: hostGuardOriginalProcessExit !== null,
		reallyExitGuarded: hostGuardOriginalReallyExit !== null,
	};
}

/**
 * Run `fn` with host-owned process state fenced off from third-party module
 * evaluation, restored in `finally`. Guards the dynamic-import and
 * factory-invocation sites that load extension / hook / tool / plugin modules
 * from user directories (including Claude Code's `~/.claude/tools`, which OMP
 * slurps wholesale). Two hazards are neutralized:
 *
 * - **Hard exit.** `process.exit(0)` / `process.reallyExit(0)` in a stranger's
 *   script (e.g. a CLI-shaped module with `main()` at the bottom) would kill
 *   OMP during startup with no error surface, since `try/catch` cannot
 *   intercept a synchronous exit. Both are patched to throw
 *   {@link ExtensionExitError} instead.
 * - **stdin hijack.** A module that attaches a stdin consumer at evaluation
 *   time (an MCP `StdioServerTransport`, or a bare `resume()`) steals Bun's
 *   single stdin reader, so the TUI goes permanently deaf after one keypress
 *   (#5618). Any `data`/`readable`/`end`/`close`/`error` listener the module
 *   adds is removed, and the stream's paused and raw-mode state is restored to
 *   the pre-load snapshot.
 *
 * Nested guard windows are safe: only the outermost guard snapshots and
 * restores host state.
 *
 * OVERLAPPING windows are a weaker claim than that. Because the counter is a
 * plain depth, two windows that interleave rather than nest (A enters, B enters,
 * A exits, B exits) snapshot only once and restore only once — on B's exit, using
 * A's snapshot. Between A's exit and B's exit stdin is unguarded, which is real
 * but bounded: it lasts exactly as long as the inner window has left to run.
 * "Safe" above means no state is lost or corrupted, not that no window exists.
 *
 * A depth left above zero by an abandoned window (its `finally` never runs) is a
 * different failure: every later `withHostGuard` in that process becomes a no-op,
 * since neither the snapshot nor the restore branch is reached. A test harness that
 * times out inside a window strands it without anyone writing an abandoned promise —
 * measured, not assumed — and neither kind of strand unwinds on its own, however long
 * the process is given. See {@link hostGuardState} for what can be observed about it.
 *
 * DO NOT ADD A RECOVERY PATH HERE. When `finally` does not run there is no correct
 * state to recover to: the snapshot was never taken, so any restore has to guess who
 * paused stdin and what they meant, and a wrong guess overwrites a pause belonging to
 * something else — a guard that "heals" a stranded depth fails OPEN and silently, which
 * is strictly worse than the strand it papers over. There is nothing here to recover
 * because the continuation holding the state is gone, not merely misplaced. The fix for
 * a stranded window belongs to whatever abandoned it.
 */
export async function withHostGuard<T>(fn: () => Promise<T>): Promise<T> {
	if (hostGuardDepth === 0) {
		// Stamp each throwing replacement with the native primitive it shadows so
		// host-owned shutdown (postmortem's signal/fatal handlers) can still exit
		// through the real exit even while this guard window is open (#6488).
		hostGuardOriginalProcessExit = process.exit;
		const processExitGuard = guardedExit("process.exit") as typeof process.exit;
		Reflect.set(processExitGuard, postmortem.NATIVE_PROCESS_EXIT, hostGuardOriginalProcessExit);
		process.exit = processExitGuard;

		if (typeof process.reallyExit === "function") {
			hostGuardOriginalReallyExit = process.reallyExit;
			const reallyExitGuard = guardedExit("process.reallyExit") as typeof process.reallyExit;
			Reflect.set(reallyExitGuard, postmortem.NATIVE_PROCESS_EXIT, hostGuardOriginalReallyExit);
			process.reallyExit = reallyExitGuard;
		}

		const stdin = process.stdin;
		hostGuardStdinWasPaused = stdin.isPaused();
		hostGuardStdinWasRaw = stdin.isRaw ?? false;
		const snapshot = {} as Record<StdinGuardEvent, StdinGuardListener[]>;
		for (const event of HOST_GUARD_STDIN_EVENTS) {
			snapshot[event] = stdin.rawListeners(event) as StdinGuardListener[];
		}
		hostGuardStdinListeners = snapshot;
	}
	hostGuardDepth++;
	try {
		return await fn();
	} finally {
		hostGuardDepth--;
		if (hostGuardDepth === 0) {
			if (hostGuardOriginalProcessExit) {
				process.exit = hostGuardOriginalProcessExit;
				hostGuardOriginalProcessExit = null;
			}
			if (hostGuardOriginalReallyExit) {
				process.reallyExit = hostGuardOriginalReallyExit;
				hostGuardOriginalReallyExit = null;
			}
			if (hostGuardStdinListeners) {
				const stdin = process.stdin;
				for (const event of HOST_GUARD_STDIN_EVENTS) {
					const before = hostGuardStdinListeners[event];
					// Reconcile the stream back to the pre-load snapshot: drop any
					// listener the module added, and reinstate any snapshot listener
					// it removed (e.g. a factory calling `removeAllListeners("data")`
					// would otherwise permanently strip ProcessTerminal's input
					// handler, leaving the parent TUI deaf). removeAllListeners then
					// re-adding in snapshot order restores both membership and order.
					const current = stdin.rawListeners(event) as StdinGuardListener[];
					const differs =
						current.length !== before.length || current.some((listener, index) => listener !== before[index]);
					if (!differs) continue;
					stdin.removeAllListeners(event);
					for (const listener of before) {
						stdin.on(event, listener);
					}
				}
				if (
					stdin.isTTY &&
					typeof stdin.setRawMode === "function" &&
					(stdin.isRaw ?? false) !== hostGuardStdinWasRaw
				) {
					stdin.setRawMode(hostGuardStdinWasRaw);
				}
				if (hostGuardStdinWasPaused && !stdin.isPaused()) {
					stdin.pause();
				} else if (!hostGuardStdinWasPaused && stdin.isPaused()) {
					stdin.resume();
				}
				hostGuardStdinListeners = null;
			}
		}
	}
}
