import { describe, expect, it } from "bun:test";
import { POWERSHELL_UTF8_PREFIX, withPowerShellUtf8Output } from "@oh-my-pi/pi-coding-agent/exec/powershell-encoding";
import { wrapShellLineForClientTerminal } from "@oh-my-pi/pi-coding-agent/tools/bash";

// Contract: a PowerShell command gets a UTF-8 output guard in front of it, and
// nothing else does.
//
// Windows PowerShell defaults its console to a legacy code page, so non-ASCII
// output is transcoded on the way out and reaches the TUI as mojibake. The guard
// is a one-line assignment that forces UTF-8 for that command.
//
// The half of this that matters most is the negative one. These helpers sit on
// the path of EVERY shell invocation, so a misidentified shell would get a
// PowerShell statement injected in front of a bash command. Byte-for-byte
// passthrough for non-PowerShell is the property worth pinning.

describe("withPowerShellUtf8Output", () => {
	it("leaves a non-PowerShell command byte-for-byte identical", () => {
		for (const shell of ["/bin/bash", "/bin/zsh", "cmd.exe", "fish", ""]) {
			expect(withPowerShellUtf8Output("echo hi", shell)).toBe("echo hi");
		}
		// Not merely equal — the same bytes. A guard that normalised whitespace or
		// trimmed would still pass toBe and still change what a shell receives.
		const command = "  printf 'a\\tb'  # trailing spaces   ";
		expect(withPowerShellUtf8Output(command, "/bin/bash")).toBe(command);
	});

	it("prefixes every PowerShell spelling, matching the spawn paths' own detection", () => {
		// Detection is delegated to the shared `isPowerShell` rather than
		// re-derived, so these are the same spellings the spawn path recognises. A
		// basename list written out again here would drift from it.
		for (const shell of [
			"pwsh",
			"pwsh.exe",
			"powershell",
			"powershell.exe",
			"/usr/bin/pwsh",
			"C:\\Program Files\\PowerShell\\7\\pwsh.exe",
		]) {
			expect(withPowerShellUtf8Output("Get-Date", shell)).toBe(`${POWERSHELL_UTF8_PREFIX}Get-Date`);
		}
	});

	it("keeps the user's command intact after the guard", () => {
		// The guard is prepended, never substituted: the user's text must still be
		// the last thing on the line, or a command ending in a comment or a
		// line-continuation would swallow it.
		const command = "Write-Host 'héllo — 世界'";
		const guarded = withPowerShellUtf8Output(command, "pwsh");
		expect(guarded.endsWith(command)).toBe(true);
		expect(guarded).toContain("[Console]::OutputEncoding=[System.Text.Encoding]::UTF8");
	});
});

describe("wrapShellLineForClientTerminal", () => {
	it("guards a PowerShell client terminal", () => {
		const { args } = wrapShellLineForClientTerminal("Get-Date", { shell: "pwsh", args: ["-NoLogo"] });
		expect(args.at(-1)).toBe(`${POWERSHELL_UTF8_PREFIX}Get-Date`);
	});

	it("leaves a POSIX client terminal untouched, and still applies its prefix", () => {
		// The prefix ordering is the thing worth pinning here: it must run BEFORE the
		// guard, or shell init would execute after the assignment and not be covered
		// by the encoding it is supposed to set up.
		const { command, args } = wrapShellLineForClientTerminal("ls -la", {
			shell: "/bin/bash",
			args: [],
			prefix: "source ~/.profile",
		});
		expect(command).toBe("/bin/bash");
		expect(args.at(-1)).toBe("source ~/.profile ls -la");
	});
});
