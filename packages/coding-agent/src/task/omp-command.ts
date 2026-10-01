import process from "node:process";

import { $env, WIRE_NAME } from "@oh-my-pi/pi-utils";

interface OmpCommand {
	cmd: string;
	args: string[];
	shell: boolean;
}

// The command this agent re-invokes must be the one an installer puts on PATH, not
// the brand. Deriving it from WIRE_NAME is what makes a rename correct in one
// place; a literal here stays right until the binary is renamed, then silently
// spawns a command that does not exist. `W9.spec.json` recommended APP_NAME --
// that is the wrong constant: it is display identity.
export const DEFAULT_CMD = `${WIRE_NAME}${process.platform === "win32" ? ".cmd" : ""}`;
const DEFAULT_SHELL = process.platform === "win32";

export function resolveOmpCommand(): OmpCommand {
	const envCmd = $env.PI_SUBPROCESS_CMD;
	if (envCmd?.trim()) {
		return { cmd: envCmd, args: [], shell: DEFAULT_SHELL };
	}

	const entry = process.argv[1];
	if (entry && (entry.endsWith(".ts") || entry.endsWith(".js"))) {
		return { cmd: process.execPath, args: [entry], shell: false };
	}

	return { cmd: DEFAULT_CMD, args: [], shell: DEFAULT_SHELL };
}
