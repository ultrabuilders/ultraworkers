import { $which } from "@oh-my-pi/pi-utils";
import { theme } from "@oh-my-pi/pi-tui/theme";
import type { DoctorCheck } from "./types";
import { allBuiltinToolFactories, BUILTIN_TOOLS, HIDDEN_TOOLS } from "../../tools";

// The theme registry lives in pi-tui and its accessor was removed when the two
// listing functions stopped going through it. Read the observable path instead:
// a name is registered when the loader would find it for the theme picker.
async function getRegisteredThemesForDoctor(): Promise<string[]> {
	const { getAvailableThemes, getBuiltinThemes } = await import("@oh-my-pi/pi-tui/theme");
	const builtin = new Set(Object.keys(getBuiltinThemes()));
	return (await getAvailableThemes()).filter(name => !builtin.has(name));
}

async function resolveThemeJsonForDoctor(name: string): Promise<unknown> {
	const { resolveThemeJson } = await import("@oh-my-pi/pi-tui/theme");
	return resolveThemeJson(name);
}

function registeredBuiltinToolNames(): string[] {
	// Anything the combined map holds that neither literal does was registered at
	// runtime. Comparing against the literals is what makes this a report of
	// runtime registrations rather than a listing of every built-in.
	const literals = new Set([...Object.keys(BUILTIN_TOOLS), ...Object.keys(HIDDEN_TOOLS)]);
	return Object.keys(allBuiltinToolFactories()).filter(name => !literals.has(name));
}

export async function runDoctorChecks(): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	// Check external tools
	const tools = [
		{ name: "sd", description: "Find-replace" },
		{ name: "sg", description: "AST-grep" },
		{ name: "git", description: "Version control" },
	];

	for (const tool of tools) {
		const path = $which(tool.name);
		checks.push({
			name: tool.name,
			status: path ? "ok" : "warning",
			message: path ? `Found at ${path}` : `${tool.description} not found - some features may be limited`,
		});
	}

	// Check API keys
	const apiKeys = [
		{ name: "ANTHROPIC_API_KEY", description: "Anthropic API" },
		{ name: "OPENAI_API_KEY", description: "OpenAI API" },
		{ name: "EXA_API_KEY", description: "Exa search" },
	];

	for (const key of apiKeys) {
		const hasKey = !!Bun.env[key.name];
		checks.push({
			name: key.name,
			status: hasKey ? "ok" : "warning",
			message: hasKey ? "Configured" : `Not set - ${key.description} unavailable`,
		});
	}

	checks.push(...(await checkExtensionSeams()));

	return checks;
}

/**
 * Report what the extension seams currently hold.
 *
 * A registry that accepted a registration and is never consulted is a dead seam
 * wearing a live one: nothing throws, and the only symptom is a tool or theme
 * that silently never appears. Every check here answers a question a user could
 * otherwise only answer by noticing something missing.
 */
async function checkExtensionSeams(): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	const themes = await getRegisteredThemesForDoctor();
	checks.push({
		name: "seam:themes",
		status: "ok",
		message:
			themes.length === 0
				? "No themes registered by extensions"
				: `${themes.length} theme(s) registered: ${themes.join(", ")}`,
	});

	const tools = registeredBuiltinToolNames();
	checks.push({
		name: "seam:tools",
		status: "ok",
		message:
			tools.length === 0
				? "No first-party tools registered at runtime"
				: `${tools.length} first-party tool(s) registered: ${tools.join(", ")}`,
	});

	// The one check that can fail. A registered theme that no longer resolves is
	// a registration that will never apply, and nothing else in the system would
	// say so.
	const resolvable: string[] = [];
	for (const name of themes) {
		if ((await resolveThemeJsonForDoctor(name)) !== undefined) resolvable.push(name);
	}
	if (resolvable.length !== themes.length) {
		const broken = themes.filter(name => !resolvable.includes(name));
		checks.push({
			name: "seam:themes-resolve",
			status: "error",
			message: `Registered but not resolvable: ${broken.join(", ")} — these themes will never load`,
		});
	}

	return checks;
}

export function formatDoctorResults(checks: DoctorCheck[]): string {
	// Note: This function returns plain text without theming as it may be called outside TUI context.
	// For TUI usage, the plugin CLI handler applies theme colors.
	const lines: string[] = ["System Health Check", "=".repeat(40), ""];

	for (const check of checks) {
		const icon =
			check.status === "ok"
				? theme.status.enabled
				: check.status === "warning"
					? theme.status.warning
					: theme.status.error;
		lines.push(`${icon} ${check.name}: ${check.message}`);
	}

	const errors = checks.filter(c => c.status === "error").length;
	const warnings = checks.filter(c => c.status === "warning").length;

	lines.push("");
	lines.push(`Summary: ${checks.length - errors - warnings} ok, ${warnings} warnings, ${errors} errors`);

	return lines.join("\n");
}
