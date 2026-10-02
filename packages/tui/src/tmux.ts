import { $which } from "@oh-my-pi/pi-utils";
import { isBunTestRuntime } from "@oh-my-pi/pi-utils/env";

/** Whether the process is running inside a tmux session. */
export function isInsideTmux(env: NodeJS.ProcessEnv = Bun.env): boolean {
	return Boolean(env.TMUX);
}

/** Wrap a control sequence in tmux's DCS passthrough envelope. */
export function wrapTmuxPassthrough(payload: string): string {
	return `\x1bPtmux;${payload.replaceAll("\x1b", "\x1b\x1b")}\x1b\\`;
}

/** Pass a control sequence through tmux, leaving direct-terminal output unchanged. */
export function wrapTmuxPassthroughIfNeeded(payload: string, env: NodeJS.ProcessEnv = Bun.env): string {
	return isInsideTmux(env) ? wrapTmuxPassthrough(payload) : payload;
}

const CLIENT_TERMTYPE_NAME = /^([A-Za-z][A-Za-z0-9._+-]*)(?=\s|\(|$)/u;
const CLIENT_TERMTYPE_TIMEOUT_MS = 500;
let cachedClientTerminalName: string | null | undefined;

/**
 * Why a tmux client-terminal query ended the way it did.
 *
 * The name alone cannot carry this. A query killed by the time budget and a tmux that
 * simply has no client both surface as "no name", yet they are opposites — one is worth
 * retrying, the other is final — so a caller, or a test reading a failure report, cannot
 * tell a busy machine from an absent terminal without re-deriving it from timing.
 */
export type TmuxClientTerminalReason = "ok" | "timeout" | "not-found";

/** One query's answer, plus the branch that produced it. */
export interface TmuxClientTerminalQuery {
	/** Exactly what `resolveTmuxClientTerminalName` returns for the same call. */
	value: string | null;
	reason: TmuxClientTerminalReason;
}

/**
 * Ask tmux for the attached client's terminal type.
 *
 * A query that runs out of its budget reports `undefined` rather than `null`, because the
 * two mean opposite things: `null` is an answer that will not change on a retry (tmux
 * absent, or tmux reporting no client type), while a killed query says only that this
 * machine was busy. Returning `null` for a timeout made a busy moment permanent — the
 * caller caches, so one slow spawn cost the process its terminal type for the rest of its
 * life, and in a long-running TUI the name simply never recovered.
 *
 * `timeout` covers both ways a query can end without an answer: the budget firing, and
 * tmux vanishing between the lookup and the spawn (ENOENT). Those are different events
 * with the same consequence — neither is worth caching — so they share a reason code; the
 * difference between them is not observable from outside this function.
 */
function queryTmuxClientTerminalName(env: NodeJS.ProcessEnv): TmuxClientTerminalQuery {
	const tmux = $which("tmux", { PATH: env.PATH });
	if (!tmux) return { value: null, reason: "not-found" };
	try {
		const result = Bun.spawnSync([tmux, "display-message", "-p", "#{client_termtype}"], {
			env,
			stdout: "pipe",
			stderr: "ignore",
			timeout: CLIENT_TERMTYPE_TIMEOUT_MS,
			killSignal: "SIGKILL",
		});
		// The time budget fired — reported as a null exit code with a kill signal, which is
		// distinct from tmux exiting non-zero, which is an answer.
		if (result.exitCode === null) return { value: null, reason: "timeout" };
		if (result.exitCode !== 0) return { value: null, reason: "not-found" };
		const name = CLIENT_TERMTYPE_NAME.exec(result.stdout.toString().trim())?.[1];
		return name === undefined ? { value: null, reason: "not-found" } : { value: name, reason: "ok" };
	} catch {
		// tmux vanished between the lookup and the spawn (ENOENT). Like a timeout that is
		// unknown rather than absent, and a later call can still succeed.
		return { value: null, reason: "timeout" };
	}
}

/**
 * Resolve the terminal emulator name recorded for this tmux client, and say which branch
 * produced it.
 *
 * Returns exactly the name `resolveTmuxClientTerminalName` would, plus the reason. The
 * reason is observation, not behaviour: it lets a caller — or a failure report — name the
 * branch instead of inferring it from how long the call took, and elapsed time is exactly
 * the signal that cannot tell a killed query from an absent terminal.
 */
export function resolveTmuxClientTerminalNameWithReason(env: NodeJS.ProcessEnv = Bun.env): TmuxClientTerminalQuery {
	if (!isInsideTmux(env) || isBunTestRuntime()) return { value: null, reason: "not-found" };
	const cached = cachedClientTerminalName;
	if (cached !== undefined) return { value: cached, reason: cached === null ? "not-found" : "ok" };
	const outcome = queryTmuxClientTerminalName(env);
	// A timeout — budget fired, or tmux vanished mid-spawn — is not an answer, so nothing
	// is cached and the next call tries again.
	if (outcome.reason === "timeout") return outcome;
	cachedClientTerminalName = outcome.value;
	return outcome;
}

/**
 * Resolve the terminal emulator name recorded for this tmux client.
 *
 * tmux overwrites pane identity variables with its own values, but retains the
 * attached client's terminal-type reply in `#{client_termtype}`. The local IPC
 * query runs once per process and degrades to `null` when unavailable.
 *
 * Only a conclusive answer is cached. A query that ran out of its time budget returns
 * without touching the cache, so the next call tries again — the run-once behaviour the
 * docblock describes still holds for every outcome that is actually an answer.
 */
export function resolveTmuxClientTerminalName(env: NodeJS.ProcessEnv = Bun.env): string | null {
	return resolveTmuxClientTerminalNameWithReason(env).value;
}
