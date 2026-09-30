import { $which } from "@oh-my-pi/pi-utils";
import { theme } from "@oh-my-pi/pi-tui/theme";
import type { DoctorCheck } from "./types";
import { allBuiltinToolFactories, BUILTIN_TOOLS, HIDDEN_TOOLS } from "../../tools";

/**
 * What the seam checks read. Defaults to the live registries; a caller may pass a
 * snapshot so a test can present a broken state without editing this module.
 *
 * That the doctor needed this is the finding rather than an inconvenience: a
 * tool whose job is catching a broken registry cannot itself be checked for a
 * broken registry, because it read everything live and offered no seam to
 * present a failure through. Proving the failure branch therefore meant editing
 * the source — which is how a background run once left the tree broken.
 */
export interface DoctorSnapshot {
	/** Theme names the loader would list, excluding the shipped built-ins. */
	readonly themes: readonly string[];
	/** Resolve a theme by name; undefined when it will not load. */
	resolveTheme(name: string): unknown;
	/** First-party tool factories registered at runtime, excluding the literals. */
	readonly builtinTools: readonly string[];
}

async function liveSnapshot(): Promise<DoctorSnapshot> {
	const { getAvailableThemes, getBuiltinThemes, resolveThemeJson } = await import("@oh-my-pi/pi-tui/theme");
	// "Shipped with the product" and "active as a builtin" are different
	// questions, and the second is not the same set. The session's
	// `LiveToolRecord.source === "builtin"` means ACTIVE: `#builtInToolNames` is
	// fed by runtime registration (`activateVibeTools`, the reconcile paths), so
	// it includes tools that were never in the literals. Comparing against
	// BUILTIN_TOOLS is what makes this a report of registrations rather than a
	// reprint of the table — but if this ever reuses `source`, it will be wrong.
	const builtinThemes = new Set(Object.keys(getBuiltinThemes()));
	const builtinTools = new Set([...Object.keys(BUILTIN_TOOLS), ...Object.keys(HIDDEN_TOOLS)]);
	return {
		themes: (await getAvailableThemes()).filter(name => !builtinThemes.has(name)),
		resolveTheme: name => resolveThemeJson(name),
		builtinTools: Object.keys(allBuiltinToolFactories()).filter(name => !builtinTools.has(name)),
	};
}

export async function runDoctorChecks(snapshot?: DoctorSnapshot): Promise<DoctorCheck[]> {
	const snap = snapshot ?? (await liveSnapshot());
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

	checks.push(...checkExtensionSeams(snap));

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
function checkExtensionSeams(snap: DoctorSnapshot): DoctorCheck[] {
	const checks: DoctorCheck[] = [];

	const themes = [...snap.themes];
	checks.push({
		name: "seam:themes",
		status: "ok",
		message:
			themes.length === 0
				? "No themes registered by extensions"
				: `${themes.length} theme(s) registered: ${themes.join(", ")}`,
	});

	const tools = [...snap.builtinTools];
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
	const resolvable = themes.filter(name => snap.resolveTheme(name) !== undefined);
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
