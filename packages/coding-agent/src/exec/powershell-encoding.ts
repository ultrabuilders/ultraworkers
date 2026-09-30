import { isPowerShell } from "@oh-my-pi/pi-utils/procmgr";

/**
 * Force PowerShell's output encoding to UTF-8 for one command.
 *
 * Windows PowerShell defaults its console output to a legacy code page, so any
 * non-ASCII byte a command emits is transcoded on the way out and arrives at the
 * TUI as mojibake. The assignment is wrapped in `try/catch` because a host that
 * has no console at all (a redirected handle) rejects it, and a command that
 * only wants to read a file should not fail over it.
 *
 * ASSUMPTION, NOT A MEASUREMENT — but a cheap one to retire. This has never been
 * run against a real PowerShell; it was written on macOS, where `pwsh` is not
 * installed. The repo already has somewhere to settle it: the
 * `release_smoke_win32_arm64` job (`.github/workflows/ci.yml`) runs on real
 * Windows ARM hardware with `shell: pwsh`. Adding
 * `pwsh -c "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; 'héllo'"`
 * there and asserting the emitted bytes are UTF-8 would end this paragraph.
 *
 * What the reasoning rests on meanwhile: `[Console]::OutputEncoding` sets the BCL
 * encoding layer, which governs output when the handle is a pipe — the case for
 * every spawn site here. Windows also has a second layer, the console code page
 * (`chcp 65001`), which can govern output even through a pipe. It is deliberately
 * NOT set: nobody has observed it failing, and adding a second mechanism on a
 * guess is its own kind of bug. If the CI check above shows otherwise, this
 * paragraph is the place to correct.
 *
 * Not covered: the interactive PTY path. `wrapShellLineForClientTerminal` is
 * called only for the client-terminal bridge command (`tools/bash.ts`); the PTY
 * branch spawns a real shell without it. So a Windows PTY session still
 * transcodes. If mojibake is ever reported on Windows, this is the first place
 * to look.
 */
export const POWERSHELL_UTF8_PREFIX = "try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}\n";

/**
 * Prefix `command` with the UTF-8 guard when it is going to a PowerShell shell.
 *
 * Returns `command` byte-for-byte for every other shell. That is the contract
 * that matters most: this runs on the path of every single bash invocation, so a
 * shell it misidentifies would get a PowerShell statement injected in front of
 * its command. Detection is delegated to the shared `isPowerShell` rather than
 * re-derived here, so a shell this misses is one the spawn paths also miss.
 */
export function withPowerShellUtf8Output(command: string, shell: string): string {
	return isPowerShell(shell) ? `${POWERSHELL_UTF8_PREFIX}${command}` : command;
}
