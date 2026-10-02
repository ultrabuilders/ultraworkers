/**
 * Plan Mode Extension
 *
 * Provides a Claude Code-style "plan mode" for safe code exploration.
 * When enabled, the agent can only use read-only tools and cannot modify files.
 *
 * Features:
 * - /plan command to toggle plan mode
 * - In plan mode: only read, bash (read-only), grep, find, ls are available
 * - Injects system context telling the agent about the restrictions
 * - After each agent response, prompts to execute the plan or continue planning
 * - Shows "plan" indicator in footer when active
 * - Extracts todo list from plan and tracks progress during execution
 * - Uses ID-based tracking: agent outputs [DONE:id] to mark steps complete
 *
 * Usage:
 * 1. Copy this file to ~/.omp/agent/extensions/ (legacy: ~/.pi/agent/extensions/) or your project's .omp/extensions/
 * 2. Use /plan to toggle plan mode on/off
 * 3. Or start in plan mode with --plan flag
 */
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { Key } from "@oh-my-pi/pi-tui";

// Read-only tools for plan mode
const PLAN_MODE_TOOLS = ["read", "bash", "search", "find"];

// Full set of tools for normal mode
const NORMAL_MODE_TOOLS = ["read", "bash", "edit", "write"];

// Patterns for destructive bash commands that should be blocked in plan mode
const DESTRUCTIVE_PATTERNS = [
	/\brm\b/i,
	/\brmdir\b/i,
	/\bmv\b/i,
	/\bcp\b/i,
	/\bmkdir\b/i,
	/\btouch\b/i,
	/\bchmod\b/i,
	/\bchown\b/i,
	/\bchgrp\b/i,
	/\bln\b/i,
	/\btee\b/i,
	/\btruncate\b/i,
	/\bdd\b/i,
	/\bshred\b/i,
	/[^<]>(?!>)/,
	/>>/,
	/\bnpm\s+(install|uninstall|update|ci|link|publish)/i,
	/\byarn\s+(add|remove|install|publish)/i,
	/\bpnpm\s+(add|remove|install|publish)/i,
	/\bpip\s+(install|uninstall)/i,
	/\bapt(-get)?\s+(install|remove|purge|update|upgrade)/i,
	/\bbrew\s+(install|uninstall|upgrade)/i,
	/\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout\s+-b|branch\s+-[dD]|stash|cherry-pick|revert|tag|init|clone)/i,
	/\bsudo\b/i,
	/\bsu\b/i,
	/\bkill\b/i,
	/\bpkill\b/i,
	/\bkillall\b/i,
	/\breboot\b/i,
	/\bshutdown\b/i,
	/\bsystemctl\s+(start|stop|restart|enable|disable)/i,
	/\bservice\s+\S+\s+(start|stop|restart)/i,
	/\b(vim?|nano|emacs|code|subl)\b/i,
];

// Read-only commands that are always safe
const SAFE_COMMANDS = [
	/^\s*cat\b/,
	/^\s*head\b/,
	/^\s*tail\b/,
	/^\s*less\b/,
	/^\s*more\b/,
	/^\s*grep\b/,
	/^\s*find\b/,
	/^\s*ls\b/,
	/^\s*pwd\b/,
	/^\s*echo\b/,
	/^\s*printf\b/,
	/^\s*wc\b/,
	/^\s*sort\b/,
	/^\s*uniq\b/,
	/^\s*diff\b/,
	/^\s*file\b/,
	/^\s*stat\b/,
	/^\s*du\b/,
	/^\s*df\b/,
	/^\s*tree\b/,
	/^\s*which\b/,
	/^\s*whereis\b/,
	/^\s*type\b/,
	/^\s*env\b/,
	/^\s*printenv\b/,
	/^\s*uname\b/,
	/^\s*whoami\b/,
	/^\s*id\b/,
	/^\s*date\b/,
	/^\s*cal\b/,
	/^\s*uptime\b/,
	/^\s*ps\b/,
	/^\s*top\b/,
	/^\s*htop\b/,
	/^\s*free\b/,
	/^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get)/i,
	/^\s*git\s+ls-/i,
	/^\s*npm\s+(list|ls|view|info|search|outdated|audit)/i,
	/^\s*yarn\s+(list|info|why|audit)/i,
	/^\s*node\s+--version/i,
	/^\s*python\s+--version/i,
	/^\s*curl\s/i,
	/^\s*wget\s+-O\s*-/i,
	/^\s*jq\b/,
	/^\s*sed\s+-n/i,
	/^\s*awk\b/,
	/^\s*rg\b/,
	/^\s*fd\b/,
	/^\s*bat\b/,
	/^\s*exa\b/,
];

function isSafeCommand(command: string): boolean {
	if (SAFE_COMMANDS.some(pattern => pattern.test(command))) {
		if (!DESTRUCTIVE_PATTERNS.some(pattern => pattern.test(command))) {
			return true;
		}
	}
	if (DESTRUCTIVE_PATTERNS.some(pattern => pattern.test(command))) {
		return false;
	}
	return true;
}

// Todo item with step number
interface TodoItem {
	step: number;
	text: string;
	completed: boolean;
}

/**
 * Clean up extracted step text for display.
 */
function cleanStepText(text: string): string {
	let cleaned = text
		// Remove markdown bold/italic
		.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
		// Remove markdown code
		.replace(/`([^`]+)`/g, "$1")
		// Remove leading action words that are redundant
		.replace(
			/^(Use|Run|Execute|Create|Write|Read|Check|Verify|Update|Modify|Add|Remove|Delete|Install)\s+(the\s+)?/i,
			"",
		)
		// Clean up extra whitespace
		.replace(/\s+/g, " ")
		.trim();

	// Capitalize first letter
	if (cleaned.length > 0) {
		cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
	}

	// Truncate if too long
	if (cleaned.length > 50) {
		cleaned = `${cleaned.slice(0, 49)}…`;
	}

	return cleaned;
}

/**
 * Extract todo items from assistant message.
 */
function extractTodoItems(message: string): TodoItem[] {
	const items: TodoItem[] = [];

	// Match numbered lists: "1. Task" or "1) Task" - also handle **bold** prefixes
	const numberedPattern = /^\s*(\d+)[.)]\s+\*{0,2}([^*\n]+)/gm;
	for (const match of message.matchAll(numberedPattern)) {
		let text = match[2].trim();
		text = text.replace(/\*{1,2}$/, "").trim();
		// Skip if too short or looks like code/command
		if (text.length > 5 && !text.startsWith("`") && !text.startsWith("/") && !text.startsWith("-")) {
			const cleaned = cleanStepText(text);
			if (cleaned.length > 3) {
				items.push({ step: items.length + 1, text: cleaned, completed: false });
			}
		}
	}

	// If no numbered items, try bullet points
	if (items.length === 0) {
		const stepPattern = /^\s*[-*]\s*(?:Step\s*\d+[:.])?\s*\*{0,2}([^*\n]+)/gim;
		for (const match of message.matchAll(stepPattern)) {
			let text = match[1].trim();
			text = text.replace(/\*{1,2}$/, "").trim();
			if (text.length > 10 && !text.startsWith("`")) {
				const cleaned = cleanStepText(text);
				if (cleaned.length > 3) {
					items.push({ step: items.length + 1, text: cleaned, completed: false });
				}
			}
		}
	}

	return items;
}

/**
 * The todo tracker that used to share `plan-mode.ts`.
 *
 * It is not part of the mode: it watches the agent's own messages for checkbox
 * lines, marks a step done when a tool succeeds, and draws the list. Mode
 * activation and step tracking are separate concerns that happened to share one
 * file, and the shared state between them (`planModeEnabled`, `executionMode`,
 * `todoItems`) is what made the original hard to follow — each had to be kept in
 * step with the others by hand.
 *
 * Kept, because deleting a working demonstration of `on("agent_end")`,
 * `on("tool_result")`, `ui.setStatus` and `ui.setWidget` to make a point about
 * file size would be a bad trade.
 */
export default function planTodoExtension(pi: ExtensionAPI) {
	let todoItems: TodoItem[] = [];
	let tracking = false;

	function updateStatus(ctx: ExtensionContext) {
		if (tracking && todoItems.length > 0) {
			const completed = todoItems.filter(t => t.completed).length;
			ctx.ui.setStatus("plan-todos", ctx.ui.theme.fg("accent", `📋 ${completed}/${todoItems.length}`));
		} else {
			ctx.ui.setStatus("plan-todos", undefined);
		}
		if (tracking && todoItems.length > 0) {
			const lines = todoItems.map(item =>
				item.completed
					? ctx.ui.theme.fg("success", "☑ ") + ctx.ui.theme.fg("dim", item.text)
					: ctx.ui.theme.fg("muted", "☐ ") + item.text,
			);
			ctx.ui.setWidget("plan-todos", lines);
		} else {
			ctx.ui.setWidget("plan-todos", undefined);
		}
	}

	// A plan arrives as a message; the checkboxes in it are the steps.
	pi.on("agent_end", async (event, ctx) => {
		const text = event.message ? cleanStepText(event.message) : "";
		const found = extractTodoItems(text);
		if (found.length > 0) {
			todoItems = found;
			tracking = true;
			updateStatus(ctx);
		}
	});

	// Any successful tool call marks the next step done.
	pi.on("tool_result", async (_event, ctx) => {
		if (!tracking || todoItems.length === 0) return;
		const next = todoItems.find(t => !t.completed);
		if (next) {
			next.completed = true;
			updateStatus(ctx);
		}
	});

	pi.registerCommand("todos", {
		description: "Show current plan todo list",
		handler: async (_args, ctx) => {
			if (todoItems.length === 0) {
				ctx.ui.notify("No todos tracked yet.", "info");
				return;
			}
			ctx.ui.notify(
				todoItems.map((item, i) => `${i + 1}. ${item.completed ? "✓" : "○"} ${item.text}`).join("\n"),
				"info",
			);
		},
	});

	pi.registerCommand("todos:off", {
		description: "Stop tracking the current plan",
		handler: async (_args, ctx) => {
			tracking = false;
			todoItems = [];
			updateStatus(ctx);
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		tracking = false;
		todoItems = [];
		updateStatus(ctx);
	});
}
