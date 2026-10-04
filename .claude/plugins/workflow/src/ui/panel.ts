/**
 * The progress panel: a widget that renders a run's agents, and the surface that must decide
 * correctly whether a widget is worth registering at all.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/display.ts:332-424`
 * (`renderWorkflowLines`, `renderWorkflowText`, `statusLine`), `:426-444` (`statusIcon`,
 * `shorten`, `preview`), and `:240-317` (`createWidgetWorkflowDisplay`).
 *
 * ## THE GUARD — and why it is per-surface rather than one boolean
 *
 * The reference guards the widget on `ctx.hasUI`. That is CORRECT here and would be WRONG two
 * lines away, which is the whole subtlety:
 *
 * - `canMount(surface)` exists because `hasUI` reports whether DIALOGS round-trip, and that
 *   answer is `true` in RPC and in ACP-with-`elicitation.form` — where `custom()`, `setHeader`
 *   and `setFooter` nonetheless THROW on every call (`types.ts:328-345`). So a `custom()`
 *   component (the navigator) must ask `canMount("custom")`, never `hasUI`.
 * - `setWidget` is deliberately EXCLUDED from `canMount`, because its answer depends on the
 *   content: RPC renders a string array and silently ignores a component factory. It does not
 *   throw, so the question is "is this worth calling", not "will this mount".
 * - `setStatus` is excluded too, because it never throws anywhere — there is no boolean answer
 *   to "will this be seen".
 *
 * So the rule is not "prefer canMount". It is: `canMount` for the three surfaces that need a
 * frame, `hasUI` for the two that merely would not be seen. {@link canRegisterWidget} is the one
 * place that decides, so the navigator and the panel cannot disagree about it.
 */
import type { WorkflowAgentSnapshot, WorkflowAgentStatus, WorkflowSnapshot } from "../types";
import { agentTokenCell, fmtCost, fmtFull, fmtTokenSegment } from "./format";
import { tokenFigures } from "../usage";

/** Minimal theme surface, so rendering works without a real Theme (tool output, tests). */
export interface ThemeLike {
	fg(color: string, text: string): string;
	bold(text: string): string;
}

/** Identity passthrough for contexts where no theme is available (tool text output). */
export const NO_THEME: ThemeLike = { fg: (_color, text) => text, bold: text => text };

/** Copied from `src/display.ts:426-444`. */
export function statusIcon(status: WorkflowAgentStatus): string {
	switch (status) {
		case "queued":
			return "○";
		case "running":
			return "●";
		case "done":
			return "✓";
		case "error":
			return "✗";
		case "skipped":
			return "-";
	}
}

/**
 * Copied from `src/display.ts:448-451`.
 *
 * `replace(/\s+/g, " ")` is also the TUI SANITIZATION, not just tidiness: a label containing a
 * tab punches a visual hole in the panel, and a label with a newline would forge extra rows.
 * Collapsing every whitespace run to one space makes both impossible.
 */
export function shorten(value: string, max: number): string {
	const text = value.replace(/\s+/g, " ").trim();
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Copied from `src/display.ts:453-457`. */
export function preview(value: unknown, max = 80): string {
	const text = typeof value === "string" ? value : JSON.stringify(value);
	if (!text) return "";
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}

export interface WorkflowDisplayOptions {
	/** Cap on agents listed per phase. Non-positive falls back to 8. */
	maxAgents?: number;
	showResultPreviews?: boolean;
}

/**
 * Copied from `src/display.ts:332-424`.
 *
 * The `maxAgents` guard is subtle and its comment names two bugs: `slice(-0)` is `slice(0)`,
 * which renders ALL agents, and a fractional cap like 0.5 passes a `> 0` check while
 * `slice(-0.5)` still renders all of them. So the value is floored AND clamped to at least 1.
 */
export function renderWorkflowLines(
	snapshot: WorkflowSnapshot,
	options: WorkflowDisplayOptions = {},
	theme: ThemeLike = NO_THEME,
): string[] {
	const maxAgents =
		options.maxAgents !== undefined && options.maxAgents > 0 ? Math.max(1, Math.floor(options.maxAgents)) : 8;
	const showResultPreviews = options.showResultPreviews ?? false;
	const state =
		(snapshot.errorCount ?? 0) > 0
			? `, ${snapshot.errorCount} errors`
			: (snapshot.runningCount ?? 0) > 0
				? `, ${snapshot.runningCount} running`
				: "";
	const usage = snapshot.tokenUsage;
	const costInfo = usage?.cost ? ` · ${fmtCost(usage.cost)}` : "";
	const segment = fmtTokenSegment(tokenFigures(usage), fmtFull);
	const tokenInfo = `${segment ? ` · ${segment}` : ""}${costInfo}`;
	const lines = [
		`${theme.bold(`◆ Workflow: ${snapshot.name}`)} (${snapshot.doneCount ?? 0}/${snapshot.agentCount ?? 0} done${state}${tokenInfo})`,
	];

	// Falls back to the phases agents actually report, so a run whose meta declared no phases
	// still groups rather than dumping every agent under "Unphased".
	const phaseNames = snapshot.phases?.length
		? snapshot.phases
		: unique(snapshot.agents.map(agent => agent.phase).filter((phase): phase is string => !!phase));
	const rendered = new Set<WorkflowAgentSnapshot>();

	// Single-pass bucketing: per-phase filter() loops made every render O(phases x agents).
	const agentsByPhase = new Map<string, WorkflowAgentSnapshot[]>();
	for (const agent of snapshot.agents) {
		if (!agent.phase) continue;
		const bucket = agentsByPhase.get(agent.phase);
		if (bucket) bucket.push(agent);
		else agentsByPhase.set(agent.phase, [agent]);
	}

	for (const phase of phaseNames) {
		const agents = agentsByPhase.get(phase) ?? [];
		for (const agent of agents) rendered.add(agent);
		const done = agents.filter(agent => agent.status === "done").length;
		const running = agents.filter(agent => agent.status === "running").length;
		const errors = agents.filter(agent => agent.status === "error").length;
		const skipped = agents.filter(agent => agent.status === "skipped").length;
		const complete = agents.length > 0 && done + errors + skipped === agents.length;
		const marker = running > 0 || (!complete && snapshot.currentPhase === phase) ? "▶" : complete ? "✓" : " ";
		lines.push(
			theme.fg("accent", `  ${marker} ${phase}`) +
				theme.fg(
					"dim",
					` ${done}/${agents.length}${running ? ` · ${running} running` : ""}${errors ? ` · ${errors} errors` : ""}${skipped ? ` · ${skipped} skipped` : ""}`,
				),
		);

		const visibleAgents = agents.slice(-maxAgents);
		for (const agent of visibleAgents) lines.push(agentLine(agent, showResultPreviews, theme));
		if (agents.length > visibleAgents.length) {
			lines.push(theme.fg("dim", `    … ${agents.length - visibleAgents.length} earlier agents`));
		}
	}

	const unphased = snapshot.agents.filter(agent => !rendered.has(agent));
	if (unphased.length) {
		lines.push(theme.fg("accent", "  Unphased"));
		for (const agent of unphased.slice(-maxAgents)) lines.push(agentLine(agent, showResultPreviews, theme));
	}

	return lines;
}

function agentLine(agent: WorkflowAgentSnapshot, showResultPreviews: boolean, theme: ThemeLike): string {
	const result = showResultPreviews && agent.resultPreview ? ` — ${agent.resultPreview}` : "";
	// The token cell is DIMMED, copied from the reference's private `agentTokenCell`
	// (`display.ts:326-329`). Metadata is secondary to the agent's identity and status, and an
	// undimmed number competes with the label for the eye in a dense fleet.
	const segment = agentTokenCell(agent);
	const tokens = segment ? theme.fg("dim", ` [${segment}]`) : "";
	return `    [${agent.id}] ${statusIcon(agent.status)} ${shorten(agent.label, 48)}${tokens}${result}`;
}

/** Copied from `src/display.ts:426-431`. */
export function renderWorkflowText(snapshot: WorkflowSnapshot, completedOrStatus: boolean | string = false): string {
	const header =
		typeof completedOrStatus === "string"
			? `Workflow ${completedOrStatus}`
			: completedOrStatus
				? "Workflow completed"
				: "Workflow running";
	return [header, ...renderWorkflowLines(snapshot)].join("\n");
}

function statusLine(snapshot: WorkflowSnapshot, completed: boolean): string {
	if (completed) return `workflow ✓ ${snapshot.name}: ${snapshot.doneCount ?? 0}/${snapshot.agentCount ?? 0}`;
	if ((snapshot.runningCount ?? 0) > 0) {
		return `workflow ${snapshot.name}: ${snapshot.runningCount} running, ${snapshot.doneCount ?? 0}/${snapshot.agentCount ?? 0} done`;
	}
	return `workflow ${snapshot.name}: ${snapshot.doneCount ?? 0}/${snapshot.agentCount ?? 0} done`;
}

/**
 * The UI surface the panel and navigator are handed.
 *
 * Declared structurally rather than imported from `@oh-my-pi/pi-coding-agent`, for the same
 * reason `WorkflowManagerLike` is: this module is testable without a host, and importing a core
 * type here would make an out-of-core extension depend on core for four method signatures. The
 * shapes match `ExtensionUIContext`; bead `.12` assigns the host's own context to it.
 */
export interface PanelUiContext {
	readonly hasUI: boolean;
	/** The three surfaces that need a frame and throw without one. */
	canMount(surface: "header" | "footer" | "custom"): boolean;
	setWidget(
		key: string,
		factory: ((tui: unknown, theme: ThemeLike) => PanelComponent) | undefined,
		options?: { placement?: string },
	): void;
	setStatus?(key: string, value: string | undefined): void;
}

export interface PanelComponent {
	render(): string[];
	invalidate(): void;
}

/**
 * Whether registering the widget is worth doing at all.
 *
 * The ONE place the guard is decided. `hasUI` is the right question here — and explicitly the
 * wrong one for `custom()`; see the header. Keeping both decisions in one function is what stops
 * the navigator from copying the panel's guard onto a surface that throws.
 */
export function canRegisterWidget(ctx: Pick<PanelUiContext, "hasUI">): boolean {
	return ctx.hasUI;
}

/** Whether a full-screen `custom()` component can mount. NEVER answer this with `hasUI`. */
export function canMountCustom(ctx: Pick<PanelUiContext, "canMount">): boolean {
	return ctx.canMount("custom");
}

export interface WorkflowDisplay {
	update(snapshot: WorkflowSnapshot): void;
	complete(snapshot: WorkflowSnapshot): void;
	clear(): void;
}

/**
 * Copied from `src/display.ts:240-282` (`createWidgetWorkflowDisplay`).
 *
 * The widget FACTORY is stored rather than the component, so every update re-registers it and the
 * TUI re-renders: the factory closes over `snapshot`, and a component captured once would keep
 * rendering the first snapshot forever.
 */
export function createWidgetWorkflowDisplay(
	ctx: PanelUiContext,
	options: WorkflowDisplayOptions & { key?: string; placement?: string; showStatus?: boolean } = {},
): WorkflowDisplay {
	const key = options.key ?? "workflow";
	const placement = options.placement ?? "belowEditor";
	const showStatus = options.showStatus ?? false;
	const mountable = canRegisterWidget(ctx);

	// Mutable state captured by the factory closure, so a re-render always reads the latest
	// snapshot even though the factory itself ran once.
	let snapshot: WorkflowSnapshot | undefined;
	let completed = false;

	const widgetFactory = (_tui: unknown, theme: ThemeLike): PanelComponent => ({
		render: () => (snapshot ? renderWorkflowLines(snapshot, options, theme) : []),
		invalidate: () => {},
	});

	if (mountable) ctx.setWidget(key, widgetFactory, { placement });

	return {
		update(next) {
			snapshot = next;
			if (!mountable) return;
			if (showStatus) ctx.setStatus?.(key, statusLine(next, completed));
			ctx.setWidget(key, widgetFactory, { placement });
		},
		complete(next) {
			snapshot = next;
			completed = true;
			if (!mountable) return;
			if (showStatus) ctx.setStatus?.(key, statusLine(next, true));
			ctx.setWidget(key, widgetFactory, { placement });
		},
		clear() {
			if (!mountable) return;
			if (showStatus) ctx.setStatus?.(key, undefined);
			ctx.setWidget(key, undefined);
		},
	};
}
