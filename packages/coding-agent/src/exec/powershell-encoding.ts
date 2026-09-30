import { isPowerShell } from "@oh-my-pi/pi-utils/procmgr";

/**
 * Force PowerShell's output encoding to UTF-8 for one command.
 *
 * Windows PowerShell defaults its console output to a legacy code page, so any
 * non-ASCII byte a command emits is transcoded on the way out and arrives at the
 * TUI as mojibake. The assignment is wrapped in `try/catch` because a host that
 * has no console at all (a redirected handle) rejects it, and a command that
 * only wants to read a file should not fail over it.
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
