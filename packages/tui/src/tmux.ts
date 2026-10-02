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
 * Ask tmux for the attached client's terminal type.
 *
 * Returns `undefined` — not `null` — when the answer is UNKNOWN rather than "there is
 * none". A query killed by the 500ms budget reports `exitCode === null` with
 * `signalCode === "SIGKILL"`, which is a statement about this machine being busy, not about
 * the client's terminal. Returning `null` there made a busy moment permanent: the caller
 * caches, so one slow spawn cost the process its terminal type for the rest of its life,
 * and in a long-running TUI the name simply never recovered.
 *
 * `null` stays reserved for answers that will not change on a retry — tmux absent, or tmux
 * reporting no client type.
 */
function queryTmuxClientTerminalName(env: NodeJS.ProcessEnv): string | null | undefined {
	const tmux = $which("tmux", { PATH: env.PATH });
	if (!tmux) return null;
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
		if (result.exitCode === null) return undefined;
		if (result.exitCode !== 0) return null;
		return CLIENT_TERMTYPE_NAME.exec(result.stdout.toString().trim())?.[1] ?? null;
	} catch {
		// tmux vanished between the lookup and the spawn (ENOENT). Like a timeout that is
		// unknown rather than absent, and a later call can still succeed.
		return undefined;
	}
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
	if (!isInsideTmux(env) || isBunTestRuntime()) return null;
	const cached = cachedClientTerminalName;
	if (cached !== undefined) return cached;
	const resolved = queryTmuxClientTerminalName(env);
	// `undefined` means the query ran out of its budget or tmux vanished mid-spawn. Neither
	// is an answer, so nothing is cached and the next call asks again.
	if (resolved === undefined) return null;
	cachedClientTerminalName = resolved;
	return resolved;
}
