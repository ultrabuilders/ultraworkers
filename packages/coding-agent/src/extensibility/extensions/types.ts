import type { CompactionTransactionObserver } from "../../session/compaction-transaction";
export type { CompactionTransactionObserver };
import type { DefinitionValue, Setting, SettingDefinition } from "../../config/registry";
import type { ExtensionDiagnostic } from "./diagnostics";
/**
 * Extension system types.
 *
 * Extensions are TypeScript modules that can:
 * - Subscribe to agent lifecycle events
 * - Register LLM-callable tools
 * - Register commands, keyboard shortcuts, and CLI flags
 * - Interact with the user via UI primitives
 */

import {
	type ExtensionUiComponent,
	type ExtensionUiComponentFactory,
	type ExtensionWidgetContent,
	type MessageRenderer,
	type AssistantThinkingRenderer,
} from "@oh-my-pi/pi-tui/chat/extension-types";
export {
	type ExtensionUiComponent,
	type ExtensionUiComponentFactory,
	type ExtensionWidgetContent,
	type MessageRenderOptions,
	type MessageRenderer,
	type AssistantThinkingRenderContext,
	type AssistantThinkingRenderer,
} from "@oh-my-pi/pi-tui/chat/extension-types";
import type { type as ArkType } from "@oh-my-pi/omptype";
import type * as TypeBox from "@oh-my-pi/omptype/typebox";
import type * as zod from "@oh-my-pi/omptype/zod";
import type {
	AgentMessage,
	AgentToolResult,
	AgentToolUpdateCallback,
	ThinkingLevel,
	ToolApproval,
	ToolLoadMode,
} from "@oh-my-pi/pi-agent-core";
import type { CompactionResult } from "@oh-my-pi/pi-agent-core/compaction";
import type { ContextUsage } from "@oh-my-pi/pi-tui/status-line/types";
import type {
	Api,
	AssistantMessage,
	AssistantMessageEvent,
	AssistantMessageEventStream,
	Context,
	ImageContent,
	Model,
	ModelSpec,
	ProviderResponseMetadata,
	ServiceTier,
	ServiceTierByFamily,
	ServiceTierFamily,
	SimpleStreamOptions,
	Static,
	TextContent,
	TSchema,
	UsageProvider,
} from "@oh-my-pi/pi-ai";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@oh-my-pi/pi-ai/oauth/types";
import type {
	AutocompleteItem,
	AutocompleteProvider,
	Component,
	EditorTheme,
	KeyId,
	ExtensionTUISurface,
	OverlayHandle,
	OverlayOptions,
} from "@oh-my-pi/pi-tui";
import type { Usage } from "@oh-my-pi/pi-catalog/usage-merge";
import type { RawToolArgs } from "@oh-my-pi/pi-tui/tools/renderer";
import type { logger as PiLogger } from "@oh-my-pi/pi-utils";
import type { KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
import type { ComposerShapeDefinition } from "@oh-my-pi/pi-tui/overlays/composer-shape-registry";
import type { ThemeJson } from "@oh-my-pi/pi-tui/theme/schema";
import type { HostRenderStrategy } from "@oh-my-pi/pi-tui/host-render-strategy";
import type { CopyTargetProvider } from "@oh-my-pi/pi-tui/overlays/copy-target-registry";
export type { HostRenderStrategy, HostRenderDecision, HostRenderContext } from "@oh-my-pi/pi-tui/host-render-strategy";
export type {
	CopyTargetProvider,
	CopyTargetBlock,
	CopyTargetContext,
} from "@oh-my-pi/pi-tui/overlays/copy-target-registry";
export type { ComposerShapeDefinition } from "@oh-my-pi/pi-tui/overlays/composer-shape-registry";
import type { ModelRegistry } from "../../config/model-registry";
import type { EditToolDetails } from "@oh-my-pi/pi-tui/tools/edit";
import type { PythonResult } from "../../eval/py/executor";
import type { BashResult } from "../../exec/bash-executor";
import type { ExecOptions, ExecResult } from "../../exec/exec";
import type * as PiCodingAgent from "../../index";
import type { LocalProtocolOptions } from "../../internal-urls/local-protocol";
import type { MemoryRuntimeContext } from "../../memory-backend";
import type { CustomEditor } from "@oh-my-pi/pi-tui/prompt/custom-editor";
import type { Theme } from "@oh-my-pi/pi-tui/theme";
import type { NativeToolView } from "@oh-my-pi/pi-tui/tools/renderer";
import type { AsyncJobSnapshot, SendUserMessageOptions } from "../../session/agent-session";
import type { EphemeralTurnOptions, EphemeralTurnResult } from "../../session/agent-session-types";
import type { CompactMode } from "../../session/compact-modes";
import type { CustomMessagePayload } from "../../session/messages";
import type { ReadonlySessionManager, SessionManager } from "../../session/session-manager";
import type { CustomEntry, SessionEntry } from "../../session/session-entries";
import type { BashToolInput, GlobToolInput, GrepToolInput, ReadToolInput, WriteToolInput } from "../../tools";
import type { GlobToolDetails } from "@oh-my-pi/pi-tui/tools/glob";
import type { GrepToolDetails } from "@oh-my-pi/pi-tui/tools/grep";
import type { ReadToolDetails } from "@oh-my-pi/pi-tui/tools/read";
import type { ApprovalMode } from "../../tools/approval";
import type { ToolEffect } from "../../tools/effects";
import type { BashToolDetails } from "@oh-my-pi/pi-tui/tools/bash";
import type { FileDeleteFallbackHandler, FileWriteFallbackHandler } from "../../tools/file-write-fallback";
import type { CompactionProtection } from "../../tools/compaction-protection";
import type { ContextTransform } from "../../tools/compaction-transforms";
import type { EventBus } from "../../utils/event-bus";
import type { ModeDefinition } from "../../modes/mode-registry";
import type {
	AgentEndEvent,
	AgentStartEvent,
	AutoCompactionEndEvent,
	AutoCompactionStartEvent,
	AutoRetryEndEvent,
	AutoRetryStartEvent,
	CacheWarmingDecisionEvent,
	CacheWarmingDecisionEventResult,
	ContextEvent,
	GoalUpdatedEvent,
	RetryFallbackAppliedEvent,
	RetryFallbackSucceededEvent,
	SessionBeforeBranchEvent,
	SessionBeforeBranchResult,
	SessionBeforeCompactEvent,
	SessionBeforeCompactResult,
	SessionBeforeSwitchEvent,
	SessionBeforeSwitchResult,
	SessionBeforeTreeEvent,
	SessionBeforeTreeResult,
	SessionBranchEvent,
	SessionCompactEvent,
	SessionCompactingEvent,
	SessionCompactingResult,
	SessionEvent,
	SessionShutdownEvent,
	SessionStartEvent,
	SessionStopEvent,
	SessionStopEventResult,
	SessionSwitchEvent,
	SessionTreeEvent,
	TodoReminderEvent,
	ToolCallEventResult,
	ToolResultEventResult,
	TtsrTriggeredEvent,
	TurnEndEvent,
	TurnStartEvent,
} from "../shared-events";
import type { SlashCommandInfo } from "../slash-commands";

export type { OverlayHandle, OverlayOptions } from "@oh-my-pi/pi-tui";
export type { AppKeybinding, KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
export type { ExecOptions, ExecResult } from "../../exec/exec";
export type { AgentToolResult, AgentToolUpdateCallback };

// ============================================================================
// UI Context
// ============================================================================

export interface ExtensionUISelectOption {
	label: string;
	description?: string;
}

export type ExtensionUISelectItem = string | ExtensionUISelectOption;

import type { ExtensionAskDialogQuestion, ExtensionAskDialogResult } from "@oh-my-pi/pi-tui/overlays/ask-dialog";
export type {
	ExtensionAskDialogOption,
	ExtensionAskDialogQuestion,
	ExtensionAskDialogResultItem,
	ExtensionAskDialogSubmitResult,
	ExtensionAskDialogChatResult,
	ExtensionAskDialogResult,
} from "@oh-my-pi/pi-tui/overlays/ask-dialog";

export function getExtensionUISelectOptionLabel(option: ExtensionUISelectItem): string {
	return typeof option === "string" ? option : option.label;
}

/**
 * UI dialog options for extensions.
 */
export interface ExtensionUIDialogOptions {
	signal?: AbortSignal;
	timeout?: number;
	/** Invoked when the UI times out while waiting for a selection/input */
	onTimeout?: () => void;
	/** Invoked when the UI-managed timeout countdown starts */
	onTimeoutStart?: () => void;
	/** Invoked when user input resets a UI-managed timeout countdown */
	onTimeoutReset?: () => void;
	/** Initial cursor position for select dialogs (0-indexed) */
	initialIndex?: number;
	/** Render an outlined list for select dialogs */
	outline?: boolean;
	/** Invoked when user presses left arrow in select dialogs */
	onLeft?: () => void;
	/** Invoked when user presses right arrow in select dialogs */
	onRight?: () => void;
	/** Invoked when user presses the external editor shortcut in select dialogs */
	onExternalEditor?: () => void;
	/** Optional footer hint text rendered by interactive selector */
	helpText?: string;
	/** Render a leading radio/checkbox marker before each markable option in
	 *  select dialogs (matches the ask transcript). "radio" fills the cursor row
	 *  for single-choice; "checkbox" reflects `checkedIndices` per row for
	 *  multi-select. Options beyond `markableCount` keep the plain cursor. */
	selectionMarker?: "radio" | "checkbox";
	/** For `selectionMarker: "checkbox"`: option indices currently checked. */
	checkedIndices?: readonly number[];
	/** Number of leading options that receive a selection marker; the remaining
	 *  trailing options (e.g. "Other"/"Done" actions) keep the plain cursor.
	 *  Defaults to all options when `selectionMarker` is set. */
	markableCount?: number;
	/** Allow image pastes in rich ask-dialog custom-answer and note prompts. */
	acceptImages?: boolean;
}

/** Raw terminal input listener for extensions. */
export type TerminalInputHandler = (data: string) => { consume?: boolean; data?: string } | undefined;

export type WidgetPlacement = "aboveEditor" | "belowEditor";

export interface ExtensionWidgetOptions {
	placement?: WidgetPlacement;
	/**
	 * Which extension placed this widget.
	 *
	 * Set by the runner when it hands an extension its `ui`, never by the
	 * extension itself: an owner an extension can name for itself is an owner
	 * that proves nothing, and this is what decides whose widget survives a
	 * session switch and whose is disposed with its author.
	 */
	owner?: string;
}

/** Options for `setHeader` / `setFooter`. */
export interface ExtensionSurfaceOptions {
	/**
	 * The name this surface is registered under. Defaults to the calling
	 * extension's path.
	 *
	 * This is a label, not a claim on a single slot. Two extensions that pass
	 * the same key both keep their surface: the later one is registered under
	 * `key~2` and a warning names both, which is the collision policy skills
	 * already use (`extensibility/skills.ts`). Silently letting the second
	 * `Map.set` evict the first would take away a surface its author can still
	 * see and never asked to give up.
	 */
	key?: string;
	/**
	 * Which extension placed this surface.
	 *
	 * Stamped by the runner, never by the extension itself, for the same reason
	 * as {@link ExtensionWidgetOptions.owner}.
	 */
	owner?: string;
}

/** Options for `ExtensionUIContext.custom()` (overlay rendering of a custom component). */
export interface ExtensionCustomOptions {
	/** Render the component as an overlay over the transcript instead of replacing the editor area. */
	overlay?: boolean;
	/** Static or lazily resolved overlay positioning/sizing options forwarded to `showOverlay`. */
	overlayOptions?: OverlayOptions | (() => OverlayOptions);
	/** Invoked with the overlay handle once the overlay is created (overlay mode only). */
	onHandle?: (handle: OverlayHandle) => void;
	/** Abort the custom UI and reject its promise. */
	signal?: AbortSignal;
}

/** Wrap the current autocomplete provider with additional behavior (pi-compatible). */
export type AutocompleteProviderFactory = (current: AutocompleteProvider) => AutocompleteProvider;

/**
 * UI context for extensions to request interactive UI.
 * Each mode (interactive, RPC, print) provides its own implementation.
 */
// fallow-ignore-next-line code-duplication
// Parallel to HookUIContext: extensions expose a strictly larger UI surface
// (custom editor component, header/footer, widgets, theming, terminal input)
// and may be invoked from event handlers that have already taken the agent
// loop's lock — hooks intentionally cannot.
export interface ExtensionUIContext {
	/**
	 * Whether a real UI is attached. Carried on the context rather than inferred
	 * by the caller: inference meant comparing against a module-private sentinel,
	 * which silently reports the wrong answer as soon as a second sentinel
	 * exists — and one did. A handler now reads the same object it was handed.
	 */
	readonly hasUI: boolean;
	/** True when selector timeouts start only after the dialog is presented. */
	timeoutStartsOnPresentation?: boolean;
	/** Show a selector and return the selected label, even when an option also includes a description. */
	select(
		title: string,
		options: ExtensionUISelectItem[],
		dialogOptions?: ExtensionUIDialogOptions,
	): Promise<string | undefined>;

	/** Show a confirmation dialog. */
	confirm(title: string, message: string, dialogOptions?: ExtensionUIDialogOptions): Promise<boolean>;

	/** Show a text input dialog. */
	input(title: string, placeholder?: string, dialogOptions?: ExtensionUIDialogOptions): Promise<string | undefined>;

	/** Show the rich ask dialog when the interactive TUI surface is available. */
	askDialog?(
		questions: ExtensionAskDialogQuestion[],
		dialogOptions?: ExtensionUIDialogOptions,
	): Promise<ExtensionAskDialogResult | undefined>;

	/** Show a notification to the user. */
	notify(message: string, type?: "info" | "warning" | "error"): void;

	/** Listen to raw terminal input (interactive mode only). Returns an unsubscribe function. */
	onTerminalInput(handler: TerminalInputHandler): () => void;

	/** Set status text in the footer/status bar. Pass undefined to clear. */
	setStatus(key: string, text: string | undefined): void;

	/** Set the working/loading message shown during streaming. Call with no argument to restore default. */
	setWorkingMessage(message?: string): void;

	/**
	 * Replace the working indicator's spinner frames and cadence. Pass `undefined`
	 * to restore the product's own.
	 *
	 * `setWorkingMessage` made the text configurable and stopped there, so the
	 * frames — the part a user actually sees moving — were the one thing an
	 * extension could not reach without rebuilding the animation.
	 */
	setWorkingIndicator(indicator?: { frames?: string[]; intervalMs?: number }): void;

	/** Set a widget to display above or below the editor. Accepts string array or component factory. */
	setWidget(key: string, content: ExtensionWidgetContent, options?: ExtensionWidgetOptions): void;

	/**
	 * Mount a component in the band below the prompt surface, or pass
	 * `undefined` to withdraw this extension's footer.
	 *
	 * Throws in any context that cannot mount a component — headless, print,
	 * subagent, ACP and RPC. Check `ui.hasUI` first, or use `setWidget` /
	 * `setStatus`, which work without a frame.
	 */
	setFooter(factory: ExtensionUiComponentFactory | undefined, options?: ExtensionSurfaceOptions): void;

	/**
	 * Mount a component in the band above the prompt surface, or pass
	 * `undefined` to withdraw this extension's header.
	 *
	 * Throws wherever `setFooter` does, for the same reason.
	 */
	setHeader(factory: ExtensionUiComponentFactory | undefined, options?: ExtensionSurfaceOptions): void;

	/** Set the terminal window/tab title. */
	setTitle(title: string): void;

	/** Show a custom component with keyboard focus. */
	custom<T>(
		factory: (
			tui: ExtensionTUISurface,
			theme: Theme,
			keybindings: KeybindingsManager,
			done: (result: T) => void,
		) => ExtensionUiComponent | Promise<ExtensionUiComponent>,
		options?: ExtensionCustomOptions,
	): Promise<T>;

	/** Set the text in the core input editor. */
	setEditorText(text: string): void;

	/**
	 * Paste text into the core input editor.
	 *
	 * Interactive mode should route through the editor's paste handling (e.g. large paste markers).
	 * Non-interactive modes may fall back to replacing the editor text.
	 */
	pasteToEditor(text: string): void;

	/** Get the current text from the core input editor. */
	getEditorText(): string;

	/** Show a multi-line editor for text editing. */
	editor(
		title: string,
		prefill?: string,
		dialogOptions?: ExtensionUIDialogOptions,
		editorOptions?: { promptStyle?: boolean },
	): Promise<string | undefined>;

	/**
	 * Stack additional autocomplete behavior on top of the built-in provider
	 * (pi-compatible). Interactive mode rebuilds the editor's provider through
	 * every registered factory, in registration order; headless modes (print,
	 * RPC, ACP, subagents) accept and ignore the factory.
	 */
	addAutocompleteProvider(factory: AutocompleteProviderFactory): void;

	/**
	 * Set a custom editor component via factory function, or `undefined` to restore the default editor.
	 *
	 * The factory must return a {@link CustomEditor} subclass. Plain `EditorComponent`/`Editor`
	 * instances do not implement the action-keys, escape callbacks, and custom-key-handler surface
	 * required by interactive mode.
	 */
	setEditorComponent(
		factory:
			| ((tui: ExtensionTUISurface, theme: EditorTheme, keybindings: KeybindingsManager) => CustomEditor)
			| undefined,
	): void;

	/** Get the current theme for styling. */
	readonly theme: Theme;

	/** Get all available themes with names and paths. */
	getAllThemes(): Promise<{ name: string; path: string | undefined }[]>;

	/** Load a theme by name without switching to it. */
	getTheme(name: string): Promise<Theme | undefined>;

	/** Set the current theme by name or Theme object. */
	setTheme(theme: string | Theme): Promise<{ success: boolean; error?: string }>;

	/** Get current tool output expansion state. */
	getToolsExpanded(): boolean;

	/** Set tool output expansion state. */
	setToolsExpanded(expanded: boolean): void;
}

// ============================================================================
// Extension Context
// ============================================================================

export type { ContextUsage };

export interface CompactOptions {
	onComplete?: (result: CompactionResult) => void;
	onError?: (error: Error) => void;
	/**
	 * Force a one-off compaction mode for this invocation, replacing the
	 * configured `compaction.methodOrder` (`/compact soft`, `remote`, or
	 * `snapcompact`). Omitted = configured preference order.
	 */
	mode?: CompactMode;
	/**
	 * Internal summarizer guidance — piped only to native summarization, never
	 * exposed as `customInstructions` on the `session_before_compact` extension
	 * hook. Used by plan-mode "Approve and compact context" so extensions that
	 * treat `customInstructions` as user focus don't mistake plan-mode
	 * boilerplate for the operator's intent (issue #4359).
	 *
	 * When both `customInstructions` and `internalGuidance` are set, the
	 * summarizer uses `internalGuidance`; the hook still sees only the public
	 * `customInstructions`.
	 */
	internalGuidance?: string;
	/**
	 * A manual compaction aborts any turn in flight and, once the summary is
	 * committed (or at once when there was nothing to compact), resumes it with
	 * the auto-continue nudge. Set this when the caller dispatches its own
	 * follow-up turn after compaction — plan-mode "Approve and compact context" —
	 * so the two don't double-prompt. Compactions that interrupt nothing never
	 * continue. Steer/follow-up messages queued during the compaction are
	 * unaffected: they always drain once compaction ends (issue #5800), before
	 * and independent of this option.
	 */
	suppressContinuation?: boolean;
}

/**
 * Context passed to extension event handlers.
 */
// fallow-ignore-next-line code-duplication
// Parallel to HookContext: extensions expose a strictly larger runtime
// surface (model registry, system prompt, shutdown, full session manager
// access). Field overlap is incidental; merging into a base would require
// hooks to widen their public contract.
/**
 * Read-only model query facade exposed at `ctx.models`. Lets an extension select a
 * model the same way core does — list authenticated models, read the session model,
 * resolve a model string or role alias, and compare model families — without reaching
 * into the mutable registry or re-implementing matching/family heuristics.
 */
export interface ExtensionModelQuery {
	/** Authenticated models available this session (the same set `--model` selection sees). */
	list(): Model[];
	/** The current session model, if one is set. */
	current(): Model | undefined;
	/**
	 * Resolve a model string (`provider/id`, bare id) or role alias (`@slow`, a
	 * configured role) to a Model, using the same settings-backed aliases and match
	 * preferences as core selection. Thinking/routing suffixes are accepted and resolved
	 * to the base model (pass effort separately). Returns undefined when nothing matches.
	 */
	resolve(spec: string): Model | undefined;
	/**
	 * Opaque lineage token for "are these the same family?" comparisons — every Claude
	 * point release shares a token, Claude and GPT differ. Backed by catalog canonical
	 * identity. Compare it; do not persist it (the vocabulary tracks new releases).
	 */
	family(model: Model): string;
}

/** Runtime host mode exposed to Pi-compatible extensions. */
export type ExtensionMode = "tui" | "rpc" | "json" | "print";

/**
 * The agent a session runs. Extension factories are rebound to every subagent session
 * (task tool, eval `agent()`, `/tan` clones), so this tells a handler which agent it is serving.
 */
export interface ExtensionAgentIdentity {
	/**
	 * `"main"` for a top-level session, `"sub"` for any spawned session. Check this, not `depth`,
	 * to tell subagents apart: `/tan` clones are subagents at depth 0.
	 */
	kind: "main" | "sub";
	/** Agent registry id, e.g. `"Main"` or `"0-Explore"`. */
	id: string;
	/**
	 * Lowercased agent definition name, e.g. `"main"`, `"task"`, `"explore"`. Subagents spawned
	 * without a definition (such as `/tan` clones) report `"sub"`.
	 */
	name: string;
	/** Task-tool nesting depth: 0 for a top-level session and for subagents not spawned by `task`. */
	depth: number;
	/** Registry id of the spawning agent; absent for a top-level session. */
	parentId?: string;
}

export interface ExtensionContext {
	/** UI methods for user interaction */
	ui: ExtensionUIContext;
	/** Current run mode. Use `"tui"` to guard terminal-only UI such as custom components. */
	mode: ExtensionMode;
	/** Get current context usage for the active model. */
	getContextUsage(): ContextUsage | undefined;
	/** Get a read-only snapshot of async jobs owned by this session. */
	getAsyncJobSnapshot(): AsyncJobSnapshot | null;
	/** Compact the session context (interactive mode shows UI). */
	compact(instructionsOrOptions?: string | CompactOptions): Promise<void>;
	/** Whether UI is available (false in print/RPC mode) */
	hasUI: boolean;
	/** Current working directory */
	cwd: string;
	/** Session manager (read-only) */
	sessionManager: ReadonlySessionManager;
	/** Model registry for API key resolution */
	modelRegistry: ModelRegistry;
	/** Calling session's `local://` root mapping for external tool bridges. */
	localProtocolOptions?: LocalProtocolOptions;
	/** Current model (may be undefined) */
	model: Model | undefined;
	/** Read-only model query facade: list / current / resolve / family. */
	models: ExtensionModelQuery;
	/** Whether the agent is idle (not streaming) */
	isIdle(): boolean;
	/** Abort the current agent operation */
	abort(): void;
	/** Whether there are queued messages waiting */
	hasPendingMessages(): boolean;
	/** Gracefully shutdown and exit. */
	shutdown(): void;
	/** Identity of the agent this session runs: the top-level session or a subagent. */
	agent: ExtensionAgentIdentity;
	/**
	 * Whether the current project/workspace is trusted, as recorded by the user.
	 *
	 * Reads the project's `projectTrust` setting — `yes`, `no`, or `undecided`
	 * (`config/project-trust.ts`), defaulting to `undecided` — so this answers
	 * `false` until somebody decides. It was the literal `() => true` before
	 * `m2-wi-20-049`, so an extension branching on it used to take a branch that
	 * could not be false; it is now falsifiable.
	 *
	 * Branching on it does **not** gate anything. Project-local extensions and
	 * settings still load unconditionally, and `ctx.exec` is outside the
	 * decision by choice: no load path consults it yet. Read this as "has this
	 * project been decided", not "will my extension run". The decision and its
	 * open questions are in `docs/extension-trust-model.md`.
	 *
	 * Still exposed for compatibility with extensions authored against upstream
	 * Pi, whose `SettingsManager` accepts a `projectTrusted` flag.
	 */
	isProjectTrusted(): boolean;
	/** Get the current effective system prompt. */
	getSystemPrompt(): string[];

	/** Run a /btw-style side turn without appending to history or executing tool calls.
	 * Pass tools: false to omit tool definitions; existing context/provider hooks still run.
	 * Inherits event-handler and registered-tool cancellation, combined with options.signal.
	 * Hooks reached within a running side turn cannot start another one (bounded recursion).
	 * Optional for compatibility with hosts that do not provide side turns.
	 */
	runEphemeralTurn?(options: EphemeralTurnOptions): Promise<EphemeralTurnResult>;
	/** Structured memory runtime for status/search/save across the configured backend. */
	memory?: MemoryRuntimeContext;
	/**
	 * Schedule a repeating callback whose throws are contained. Unlike raw
	 * `setInterval`, a synchronous throw or rejected promise from `callback` is
	 * logged and surfaced through the extension error channel instead of
	 * escaping as a process-fatal `uncaughtException` — one misbehaving timer
	 * can no longer take down the whole session. The handle is `unref`'d and
	 * cleared automatically on `session_shutdown`. Prefer this over raw
	 * `setInterval` for any extension background work.
	 */
	setInterval(callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer;
	/**
	 * Schedule a one-shot callback whose throws are contained, mirroring
	 * {@link setInterval}. Cleared automatically on `session_shutdown` if it has
	 * not yet fired.
	 */
	setTimeout(callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer;
	/** Clear a timer scheduled via {@link setInterval} or {@link setTimeout}. */
	clearTimer(timer: Timer): void;
	/**
	 * Attach trusted, extension-authored instructions to the next provider
	 * request with developer/system priority where supported. Present only while
	 * a registered tool is executing. Raw tool output and other untrusted data
	 * must stay in the ordinary tool result.
	 */
	addAdditionalContext?(context: string): void;
	/**
	 * Run the NATIVE built-in implementation of the tool this handler re-registered, with `params`,
	 * and return its result. Lets a tool that re-registers a built-in (e.g. wrapping `write` to add
	 * logging or a policy check) delegate to the original instead of reimplementing it — the native
	 * tool performs its own side effects and internal bookkeeping.
	 *
	 * Delegation is same-tool only: it invokes the built-in of the SAME name as the registering tool,
	 * never an arbitrary target, so it cannot escalate past the approval already granted for this
	 * call. Present only when a native built-in of that name exists (undefined otherwise, e.g. for a
	 * net-new tool that shadows no built-in). Recursion is depth-guarded per call chain.
	 */
	invokeTool?<TDetails = unknown>(
		params: Record<string, unknown>,
		options?: { signal?: AbortSignal; onUpdate?: AgentToolUpdateCallback<TDetails> },
	): Promise<AgentToolResult<TDetails>>;

	/**
	 * Whether project-local inputs for the current working directory (extensions, settings,
	 * skills, resources) are trusted. Upstream `@earendil-works/pi-coding-agent` (>=0.79) asks the
	 * user once per directory before loading project-local inputs and exposes the saved decision
	 * here; extensions written against that API (e.g. Plannotator) feature-detect this method to
	 * decide whether project-local config is safe to load, and warn when it is absent.
	 *
	 * OMP keeps that surface and now answers it honestly: the value is the project's recorded
	 * `projectTrust` setting, and `undecided` answers `false`. What OMP does **not** yet have is
	 * the upstream per-directory *gate* — `.omp/extensions`, `.omp/config.yml`, and other
	 * project-local inputs are still discovered and loaded unconditionally, so this reports a
	 * decision without enforcing it. Do not read a `false` here as "this project is blocked".
	 *
	 * See `docs/extension-trust-model.md` for the decision, what it does not assert, and the
	 * execution item that closes the gap; `docs/extension-loading.md` for the path resolution
	 * rules this decision is expressed over.
	 */
	isProjectTrusted(): boolean;
}

/**
 * Extended context for command handlers.
 * Includes session control methods only safe in user-initiated commands.
 */
// fallow-ignore-next-line code-duplication
// Parallel to HookCommandContext: same method names, different invariants —
// extension commands additionally permit `switchSession` and `reload`,
// which hooks must not call to avoid deadlocking the agent loop.
export interface ExtensionCommandContext extends ExtensionContext {
	/** Get current context usage for the active model. */
	getContextUsage(): ContextUsage | undefined;

	/** Wait for the agent to finish streaming */
	waitForIdle(): Promise<void>;

	/** Start a new session, optionally with initialization. */
	newSession(options?: {
		parentSession?: string;
		setup?: (sessionManager: SessionManager) => Promise<void>;
		withSession?: (ctx: ReplacedSessionContext) => Promise<void>;
	}): Promise<{ cancelled: boolean }>;

	/** Branch from a specific entry, creating a new session file. */
	branch(
		entryId: string,
		options?: { withSession?: (ctx: ReplacedSessionContext) => Promise<void> },
	): Promise<{
		cancelled: boolean;
	}>;

	/** Navigate to a different point in the session tree. */
	navigateTree(targetId: string, options?: { summarize?: boolean }): Promise<{ cancelled: boolean }>;

	/** Switch to a different session file. */
	switchSession(
		sessionPath: string,
		options?: { withSession?: (ctx: ReplacedSessionContext) => Promise<void> },
	): Promise<{
		cancelled: boolean;
	}>;

	/** Reload the current session/runtime state. */
	reload(): Promise<void>;

	/** Compact the session context (interactive mode shows UI). */
	compact(instructionsOrOptions?: string | CompactOptions): Promise<void>;
}

/**
 * Command-capable context minted after a session was replaced.
 *
 * Passed to the `withSession` callback of `newSession`, `branch`, and
 * `switchSession`. It is the sanctioned way to do work that belongs to the NEW
 * session: the context a command captured before the replacement still refers to
 * the session that was torn down, and it carries `sendMessage` /
 * `sendUserMessage` so post-replacement work does not have to reach for a
 * different object to speak to the session it is now driving.
 */
export interface ReplacedSessionContext extends ExtensionCommandContext {
	/** Declared as the handler types rather than restated, so this cannot drift from what the runtime actually accepts. */
	sendMessage: SendMessageHandler;
	sendUserMessage: SendUserMessageHandler;
}

// ============================================================================
// Tool Types
// ============================================================================

/** Rendering options for tool results */
export interface ToolRenderResultOptions {
	/** Whether the result view is expanded */
	expanded: boolean;
	/** Whether this is a partial/streaming result */
	isPartial: boolean;
	/** Current spinner frame index for animated elements (optional) */
	spinnerFrame?: number;
	/**
	 * True once the arguments are final (`message_end`). An exclusive tool can
	 * sit here while an earlier call is still running.
	 */
	argsComplete?: boolean;
	/** True once this specific call has begun executing. */
	executionStarted?: boolean;
	/**
	 * The unparsed argument stream, when there is one. Declared here so an
	 * extension can read it without reaching into the decoded args for a magic
	 * `__partialJson` key — that spelling is a producer convention, not a
	 * contract, and a renderer that depends on it breaks when a producer
	 * changes.
	 */
	rawArgs?: RawToolArgs;
}

/**
 * Session event for a tool's `onSession` lifecycle.
 *
 * Only `"shutdown"` is delivered. It was declared as five reasons, but the other
 * four already have their own path: `on("session_start")`, `on("session_switch")`,
 * `on("session_branch")` and `on("session_tree")` fire 9, 7, 6 and 5 times
 * respectively. A tool that narrowed on the wider union would compile and then
 * never enter its own branch for four of the five cases, with nothing failing.
 *
 * A tool author wanting the other four uses `on()`, which is the event API and
 * already covers them. Narrowing what is *received* is close to free — a tool only
 * consumes the value.
 */
export interface ToolSessionEvent {
	/** Why the session is ending. */
	readonly reason: "shutdown";
	/**
	 * Previous session file path. Always undefined here: the field belongs to
	 * the switch event, which is delivered through `on("session_switch")`.
	 * Kept so a handler can read one shape across both channels.
	 */
	readonly previousSessionFile: undefined;
}

/** Shell invocation details supplied to a registered tool's environment hook. */
export interface ToolShellEnvironmentContext {
	command: string;
	cwd: string;
	env: Record<string, string | undefined>;
}

/** Supplies environment values for a user-initiated shell invocation. */
export type ToolShellEnvironmentHook = (context: ToolShellEnvironmentContext) => Record<string, string> | undefined;

/**
 * Tool definition for registerTool().
 */
export interface ToolDefinition<TParams extends TSchema = TSchema, TDetails = unknown> {
	/** Tool name (used in LLM tool calls) */
	name: string;
	/** Human-readable label for UI */
	label: string;
	/** Description for LLM */
	description: string;
	/** Parameter schema (Zod, or TypeBox for legacy/extension compat). */
	parameters: TParams;
	/** If true, tool is excluded unless explicitly listed in --tools or agent's tools field */
	hidden?: boolean;
	/** If true, tool is registered but not auto-included in the initial active set.
	 *  The registering extension is responsible for activating/deactivating it via setActiveTools(). */
	defaultInactive?: boolean;
	/** How this tool is presented when enabled. See {@link ToolLoadMode}. Extension tools default to `"discoverable"`; set `"essential"` to stay top-level. */
	loadMode?: ToolLoadMode;
	/** If true, tool may stage deferred changes that require explicit resolve/discard. */
	deferrable?: boolean;
	/** Whether this tool can read `skill://` instruction content. */
	readsSkillUris?: boolean;
	/** Tool approval tier. Defaults to `"exec"` when omitted.
	 *  `"read"`: read-only operations. `"write"`: mutations. `"exec"`: code execution. */
	approval?: ToolApproval;
	/**
	 * What this tool reaches, so a user's per-effect policy can apply to it without
	 * anyone writing a command pattern for it.
	 *
	 * A declaration, never containment: it can only raise the approval floor, and
	 * the resource it names is not the resource it is confined to. Omit it and the
	 * tool is gated only by its `approval` tier.
	 */
	effects?: ToolEffect[];
	/** Structured-output strict grammar opt-in/out. `false` is meaningful: OpenAI-family
	 *  serializers preserve an explicit `strict: false` on the wire (#4336/#4340). */
	strict?: boolean;
	/** MCP server name for discovery/search metadata when this tool fronts an MCP server. */
	mcpServerName?: string;
	/** Original MCP tool name for discovery/search metadata. */
	mcpToolName?: string;
	/** Previous public name when a rename changed minting. Forwarded through
	 *  RegisteredToolAdapter so approval falls back to legacy `deny`/`prompt`. */
	legacyName?: string;
	/** Optional environment hook applied when the interactive user shell invokes this tool's shell surface. */
	shellEnv?: ToolShellEnvironmentHook;
	/** Authoritative originating file for a discovered custom-tool module. */
	sourcePath?: string;
	/** Execute the tool. */
	execute(
		toolCallId: string,
		params: Static<TParams>,
		signal: AbortSignal | undefined,
		onUpdate: AgentToolUpdateCallback<TDetails> | undefined,
		ctx: ExtensionContext,
	): Promise<AgentToolResult<TDetails>>;

	/** Called on session lifecycle events - use to reconstruct state or cleanup resources */
	onSession?: (event: ToolSessionEvent, ctx: ExtensionContext) => void | Promise<void>;

	/**
	 * Custom rendering for tool call display.
	 *
	 * At runtime `options` also answers the {@link Theme} API, so renderers
	 * ported from upstream pi — declared `renderCall(args, theme, context)` —
	 * keep styling correctly.
	 */
	renderCall?: (args: Static<TParams>, options: ToolRenderResultOptions, theme: Theme) => Component;

	/** Custom rendering for tool result display */
	renderResult?: (
		result: AgentToolResult<TDetails>,
		options: ToolRenderResultOptions,
		theme: Theme,
		args?: Static<TParams>,
	) => Component;

	/** Semantic call view for TSP terminals (the native counterpart of {@link renderCall}). */
	describeCall?: (args: Static<TParams>, options: ToolRenderResultOptions) => NativeToolView | undefined;

	/** Semantic result view for TSP terminals (the native counterpart of {@link renderResult}). */
	describeResult?: (
		result: AgentToolResult<TDetails>,
		options: ToolRenderResultOptions,
		args?: Static<TParams>,
	) => NativeToolView | undefined;
}

/** Whether a tool's source is scoped to the user, the project, or a transient runtime session. */
export type SourceScope = "user" | "project" | "temporary";

/** Whether a tool's source came from an installed package or a top-level (loose) file. */
export type SourceOrigin = "package" | "top-level";

/**
 * Provenance metadata describing where a registered tool came from. Mirrors the
 * `@earendil-works/pi-coding-agent` `SourceInfo` contract so extensions authored
 * against upstream pi (e.g. gentle-pi) can read `sourceInfo.source` unchanged.
 */
export interface SourceInfo {
	/** Synthetic or on-disk identifier for the tool's origin (e.g. `<builtin:read>`). */
	path: string;
	/** Origin class: `"builtin"`, `"sdk"`, `"mcp"`, or `"extension"`. */
	source: string;
	scope: SourceScope;
	origin: SourceOrigin;
	baseDir?: string;
}

/** Tool metadata returned by {@link ExtensionAPI.getAllTools}: identity, schema, and source provenance. */
export interface ToolInfo {
	name: string;
	description: string;
	parameters: TSchema;
	promptGuidelines?: string[];
	sourceInfo: SourceInfo;
}

// ============================================================================
// Resource Events
// ============================================================================

/** Fired after session_start to allow extensions to provide additional resource paths. */
export interface ResourcesDiscoverEvent {
	type: "resources_discover";
	cwd: string;
	reason: "startup" | "reload";
}

/** Result from resources_discover event handler */
export interface ResourcesDiscoverResult {
	skillPaths?: string[];
	promptPaths?: string[];
	themePaths?: string[];
}

// ============================================================================
// Session Events (shared with hooks subsystem)
// ============================================================================

export type {
	SessionBeforeBranchEvent,
	SessionBeforeCompactEvent,
	SessionBeforeSwitchEvent,
	SessionBeforeTreeEvent,
	SessionBranchEvent,
	SessionCompactEvent,
	SessionCompactingEvent,
	SessionEvent,
	SessionShutdownEvent,
	SessionStartEvent,
	SessionSwitchEvent,
	SessionTreeEvent,
	TreePreparation,
} from "../shared-events";

// ============================================================================
// Agent Events
// ============================================================================

export type { ContextEvent } from "../shared-events";

// ============================================================================
// Cache Warming Events
// ============================================================================

export type { CacheWarmingDecisionEvent, CacheWarmingDecisionEventResult } from "../shared-events";
export type {
	CacheWarmingAction,
	CacheWarmingDecision,
	CacheWarmingMode,
	CacheWarmingStatus,
} from "../../session/cache-warmer";

/** Fired before a provider request is sent. Can replace the payload. */
export interface BeforeProviderRequestEvent {
	type: "before_provider_request";
	payload: unknown;
}

/** Fired after a provider response is received, before its stream body is consumed. */
export interface AfterProviderResponseEvent extends ProviderResponseMetadata {
	type: "after_provider_response";
}

/** Fired before an ordinary prompt or an actually dequeued user-containing batch reaches the provider. */
export interface BeforeAgentStartEvent {
	type: "before_agent_start";
	/** Already-transformed text; queued batches join user messages with two newlines, excluding agent companions. */
	prompt: string;
	/** Already-normalized user images in delivery order. */
	images?: ImageContent[];
	systemPrompt: string[];
}

/** Fired in the parent session before a subagent (task tool or eval `agent()`) resolves its model. */
export interface BeforeSubagentSpawnEvent {
	type: "before_subagent_spawn";
	/** Agent definition name being spawned. */
	agent: string;
	invocationKind: "task" | "eval";
	/** Pre-expansion role alias the patterns came from (`@task` -> "task"); undefined for explicit selectors. */
	modelRole?: string;
	/** Expanded model patterns core would spawn with, in attempt order. */
	patterns: string[];
	/** Stable per-spawn key for deterministic selection, when the caller supplies one. */
	spawnKey?: string;
}

export type {
	AgentEndEvent,
	AgentStartEvent,
	SessionStopEvent,
	SessionStopEventResult,
	TurnEndEvent,
	TurnStartEvent,
} from "../shared-events";

/** Fired when a message starts (user, assistant, or toolResult) */
export interface MessageStartEvent {
	type: "message_start";
	message: AgentMessage;
}

/** Fired during assistant message streaming with token-by-token updates */
export interface MessageUpdateEvent {
	type: "message_update";
	message: AgentMessage;
	assistantMessageEvent: AssistantMessageEvent;
}

/**
 * Fired when a message ends. Notification-only: the message is a detached
 * snapshot, so in-place changes do not rewrite agent or provider context.
 * Persistence and subscriber delivery do not wait for this handler to finish.
 * Use `assistant_message` to rewrite a finalized assistant message.
 */
export interface MessageEndEvent {
	type: "message_end";
	message: AgentMessage;
}

/**
 * Fired once per finalized assistant message, after the provider stream settles
 * and before the message reaches agent context, `message_end` listeners (TUI,
 * RPC, exporters), session persistence, or tool dispatch. Return
 * {@link AssistantMessageRewriteResult} to replace its content; the replacement
 * is the single source of truth for history, persistence, `message_end`
 * consumers, and the next provider request. Text already streamed through
 * `message_update` is not retracted, so stream-rendering clients may keep
 * showing the original. Handlers chain: each sees the previous handler's
 * replacement.
 *
 * `message` is a detached copy — in-place mutation has no effect; return
 * `content` instead. If cancellation arrives while handlers are pending,
 * rewrites accepted so far are returned and remaining handlers are skipped.
 * This event is not fired if the provider stream is cut off before finalizing.
 */
export interface AssistantMessageRewriteEvent {
	type: "assistant_message";
	message: AssistantMessage;
}

/** Fired when a tool starts executing */
export interface ToolExecutionStartEvent {
	type: "tool_execution_start";
	toolCallId: string;
	toolName: string;
	args: unknown;
	intent?: string;
}

/** Fired during tool execution with partial/streaming output */
export interface ToolExecutionUpdateEvent {
	type: "tool_execution_update";
	toolCallId: string;
	toolName: string;
	args: unknown;
	partialResult: unknown;
}

/** Fired when a tool finishes executing */
export interface ToolExecutionEndEvent {
	type: "tool_execution_end";
	toolCallId: string;
	toolName: string;
	result: unknown;
	isError: boolean;
}

export type {
	AutoCompactionEndEvent,
	AutoCompactionStartEvent,
	AutoRetryEndEvent,
	AutoRetryStartEvent,
	RetryFallbackAppliedEvent,
	RetryFallbackSucceededEvent,
	TodoReminderEvent,
	TtsrTriggeredEvent,
} from "../shared-events";

/** Fired when AuthStorage automatically soft-disables a credential (e.g. OAuth `invalid_grant`). Not fired for user-initiated `remove()` or duplicate-credential dedup. */
export interface CredentialDisabledEvent {
	type: "credential_disabled";
	/** Provider id whose credential was disabled (e.g. "anthropic"). */
	provider: string;
	/** Verbatim error captured for forensics (truncated upstream). */
	disabledCause: string;
	/** Database row id of the disabled credential. */
	credentialId?: number;
	/** Account identity recorded on the disabled OAuth credential, when the provider supplied one. */
	email?: string;
	accountId?: string;
	/** Organization/workspace the credential was scoped to. */
	orgId?: string;
	orgName?: string;
}

// ============================================================================
// MCP Events
// ============================================================================

/**
 * Fired for every JSON-RPC notification received from a connected MCP server,
 * AFTER the runtime's own handling of known list/update methods. Unknown or
 * server-custom methods are delivered too — extensions can bridge them into
 * session behavior by inspecting `method`/`params` and injecting a follow-up
 * via `pi.sendMessage(..., { deliverAs })` or `pi.sendUserMessage(...)`.
 */
export interface McpNotificationEvent {
	type: "mcp_notification";
	/**
	 * Server name as declared in the MCP config (raw, unsanitized). Note this
	 * differs from the sanitized prefix used in `mcp__<sanitized_server>_<tool>`
	 * tool names — filter by this raw name, not by tool-name prefix matching.
	 */
	server: string;
	/** JSON-RPC method (e.g. `notifications/tools/list_changed`, or server-custom). */
	method: string;
	/** JSON-RPC params, opaque to the runtime. */
	params: unknown;
}

// ============================================================================
// User Bash Events
// ============================================================================

/** Fired when user executes a bash command via ! or !! prefix */
export interface UserBashEvent {
	type: "user_bash";
	/** The command to execute */
	command: string;
	/** True if !! prefix was used (excluded from LLM context) */
	excludeFromContext: boolean;
	/** Current working directory */
	cwd: string;
}

// ============================================================================
// User Python Events
// ============================================================================

/** Fired when user executes Python code via $ or $$ prefix */
export interface UserPythonEvent {
	type: "user_python";
	/** The Python code to execute */
	code: string;
	/** True if $$ prefix was used (excluded from LLM context) */
	excludeFromContext: boolean;
	/** Current working directory */
	cwd: string;
}

// ============================================================================
// Input Events
// ============================================================================

/** Fired when the user submits input (interactive mode only). */
export interface InputEvent {
	type: "input";
	text: string;
	images?: ImageContent[];
	source: "interactive" | "rpc" | "extension";
}

// ============================================================================
// Tool Events
// ============================================================================

export interface ToolApprovalRequestedEvent {
	type: "tool_approval_requested";
	sessionId: string;
	toolCallId: string;
	toolName: string;
	reason?: string;
	approvalMode: ApprovalMode;
}

export interface ToolApprovalResolvedEvent {
	type: "tool_approval_resolved";
	sessionId: string;
	toolCallId: string;
	toolName: string;
	approved: boolean;
	reason?: string;
}

interface ToolCallEventBase {
	type: "tool_call";
	toolCallId: string;
}

export interface BashToolCallEvent extends ToolCallEventBase {
	toolName: "bash";
	input: BashToolInput;
}

export interface ReadToolCallEvent extends ToolCallEventBase {
	toolName: "read";
	input: ReadToolInput;
}

export interface EditToolCallEvent extends ToolCallEventBase {
	toolName: "edit";
	input: Record<string, unknown>;
}

export interface WriteToolCallEvent extends ToolCallEventBase {
	toolName: "write";
	input: WriteToolInput;
}

export interface GrepToolCallEvent extends ToolCallEventBase {
	toolName: "grep";
	input: GrepToolInput;
}

export interface GlobToolCallEvent extends ToolCallEventBase {
	toolName: "glob";
	input: GlobToolInput;
}

export interface CustomToolCallEvent extends ToolCallEventBase {
	toolName: string;
	input: Record<string, unknown>;
}

/** Fired before a tool executes. Can block. */
export type ToolCallEvent =
	| BashToolCallEvent
	| ReadToolCallEvent
	| EditToolCallEvent
	| WriteToolCallEvent
	| GrepToolCallEvent
	| GlobToolCallEvent
	| CustomToolCallEvent;

interface ToolResultEventBase {
	type: "tool_result";
	toolCallId: string;
	input: Record<string, unknown>;
	content: (TextContent | ImageContent)[];
	isError: boolean;
}

export interface BashToolResultEvent extends ToolResultEventBase {
	toolName: "bash";
	details: BashToolDetails | undefined;
}

export interface ReadToolResultEvent extends ToolResultEventBase {
	toolName: "read";
	details: ReadToolDetails | undefined;
}

export interface EditToolResultEvent extends ToolResultEventBase {
	toolName: "edit";
	details: EditToolDetails | undefined;
}

export interface WriteToolResultEvent extends ToolResultEventBase {
	toolName: "write";
	details: undefined;
}

export interface GrepToolResultEvent extends ToolResultEventBase {
	toolName: "grep";
	details: GrepToolDetails | undefined;
}

export interface GlobToolResultEvent extends ToolResultEventBase {
	toolName: "glob";
	details: GlobToolDetails | undefined;
}

export interface CustomToolResultEvent extends ToolResultEventBase {
	toolName: string;
	details: unknown;
}

/** Fired after a tool executes. Can modify result. */
export type ToolResultEvent =
	| BashToolResultEvent
	| ReadToolResultEvent
	| EditToolResultEvent
	| WriteToolResultEvent
	| GrepToolResultEvent
	| GlobToolResultEvent
	| CustomToolResultEvent;

/**
 * Type guard for narrowing ToolCallEvent by tool name.
 *
 * Built-in tools narrow automatically (no type params needed):
 * ```ts
 * if (isToolCallEventType("bash", event)) {
 *   event.input.command;  // string
 * }
 * ```
 *
 * Custom tools require explicit type parameters:
 * ```ts
 * if (isToolCallEventType<"my_tool", MyToolInput>("my_tool", event)) {
 *   event.input.action;  // typed
 * }
 * ```
 *
 * Note: Direct narrowing via `event.toolName === "bash"` doesn't work because
 * CustomToolCallEvent.toolName is `string` which overlaps with all literals.
 */
export function isToolCallEventType(toolName: "bash", event: ToolCallEvent): event is BashToolCallEvent;
export function isToolCallEventType(toolName: "read", event: ToolCallEvent): event is ReadToolCallEvent;
export function isToolCallEventType(toolName: "edit", event: ToolCallEvent): event is EditToolCallEvent;
export function isToolCallEventType(toolName: "write", event: ToolCallEvent): event is WriteToolCallEvent;
export function isToolCallEventType(toolName: "grep", event: ToolCallEvent): event is GrepToolCallEvent;
export function isToolCallEventType(toolName: "glob", event: ToolCallEvent): event is GlobToolCallEvent;
export function isToolCallEventType<TName extends string, TInput extends Record<string, unknown>>(
	toolName: TName,
	event: ToolCallEvent,
): event is ToolCallEvent & { toolName: TName; input: TInput };
export function isToolCallEventType(toolName: string, event: ToolCallEvent): boolean {
	return event.toolName === toolName;
}

/** Union of all event types */
export type ExtensionEvent =
	| ResourcesDiscoverEvent
	| SessionEvent
	| ContextEvent
	| CacheWarmingDecisionEvent
	| BeforeProviderRequestEvent
	| AfterProviderResponseEvent
	| BeforeAgentStartEvent
	| BeforeSubagentSpawnEvent
	| AgentStartEvent
	| AgentEndEvent
	| SessionStopEvent
	| TurnStartEvent
	| TurnEndEvent
	| MessageStartEvent
	| MessageUpdateEvent
	| MessageEndEvent
	| AssistantMessageRewriteEvent
	| ToolExecutionStartEvent
	| ToolExecutionUpdateEvent
	| ToolExecutionEndEvent
	| AutoCompactionStartEvent
	| AutoCompactionEndEvent
	| AutoRetryStartEvent
	| AutoRetryEndEvent
	| RetryFallbackAppliedEvent
	| RetryFallbackSucceededEvent
	| TtsrTriggeredEvent
	| TodoReminderEvent
	| GoalUpdatedEvent
	| CredentialDisabledEvent
	| McpNotificationEvent
	| UserBashEvent
	| UserPythonEvent
	| InputEvent
	| ToolCallEvent
	| ToolResultEvent
	| ToolApprovalRequestedEvent
	| ToolApprovalResolvedEvent;

// ============================================================================
// Event Results
// ============================================================================

export interface ContextEventResult {
	messages?: AgentMessage[];
}

/**
 * Result from an `assistant_message` handler. Return `undefined` to leave the
 * message unchanged.
 *
 * Text blocks must remain in their original positions: only their `text` may
 * change. Non-text blocks and all other block metadata must remain unchanged.
 * A text block with unchanged text keeps its original `textSignature` even if
 * a handler replaces it; editing text removes its signature because that
 * provider replay state cannot be reused for different text. Invalid
 * replacements are reported as extension errors and skipped.
 */
export interface AssistantMessageRewriteResult {
	content?: AssistantMessage["content"];
}

export type BeforeProviderRequestEventResult = unknown;

export type { ToolCallEventResult } from "../shared-events";

/** Result from input event handler */
export interface InputEventResult {
	/** If true, the input was handled and should not continue through normal flow */
	handled?: boolean;
	/** Replace the input text */
	text?: string;
	/** Replace any pending images */
	images?: ImageContent[];
}

/** Result from user_bash event handler */
export interface UserBashEventResult {
	/** Full replacement: extension handled execution, use this result */
	result?: BashResult;
}

/** Result from user_python event handler */
export interface UserPythonEventResult {
	/** Full replacement: extension handled execution, use this result */
	result?: PythonResult;
}

export type { ToolResultEventResult } from "../shared-events";

export interface BeforeAgentStartEventResult {
	message?: CustomMessagePayload;
	/** Replace policy for the next request and its continuations, until the next preparation. Extensions chain in order. */
	systemPrompt?: string[];
}

export interface BeforeSubagentSpawnEventResult {
	/** Replacement model patterns in attempt order (selectors or role aliases). Role identity is preserved. */
	model?: string | string[];
	/** Refuse the spawn. */
	block?: boolean;
	/** Refusal reason surfaced to the caller. */
	reason?: string;
	/** Human-readable routing explanation surfaced with the resolved model. */
	note?: string;
}

export type {
	SessionBeforeBranchResult,
	SessionBeforeCompactResult,
	SessionBeforeSwitchResult,
	SessionBeforeTreeResult,
	SessionCompactingResult,
} from "../shared-events";

// ============================================================================
// Message Rendering
// ============================================================================

// ============================================================================
// Command Registration
// ============================================================================

// fallow-ignore-next-line code-duplication
// Parallel to HookAPI's RegisteredCommand: extensions add
// `getArgumentCompletions` and bind handlers to ExtensionCommandContext.
export interface RegisteredCommand {
	name: string;
	description?: string;
	getArgumentCompletions?: (argumentPrefix: string) => AutocompleteItem[] | null;
	handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
}

// ============================================================================
// Extension API
// ============================================================================

/** Handler function type for events */
export type ExtensionHandler<E, R = undefined> = (event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;

/** Service tiers accepted by each provider family. */
export type ExtensionServiceTier<Family extends ServiceTierFamily> = Family extends "anthropic"
	? "priority"
	: Family extends "google"
		? "flex" | "priority"
		: ServiceTier;

/**
 * ExtensionAPI passed to extension factory functions.
 *
 * Methods retain their extension binding when destructured or passed as callbacks.
 */
export interface ExtensionAPI {
	// =========================================================================
	// Module Access
	// =========================================================================

	/** File logger for error/warning/debug messages */
	logger: typeof PiLogger;

	/** Injected TypeBox shim for legacy `Type.Object(...)` parameter authoring. */
	typebox: typeof TypeBox;

	/** Injected omptype schema builder for extension tools. */
	arktype: typeof ArkType;

	/** Injected Zod-compatible omptype builder for extension tools. */
	zod: typeof zod;

	/** Injected pi-coding-agent exports for accessing SDK utilities */
	pi: typeof PiCodingAgent;

	// =========================================================================
	// Event Subscription
	// =========================================================================

	on(
		event: "resources_discover",
		handler: ExtensionHandler<ResourcesDiscoverEvent, ResourcesDiscoverResult>,
	): () => void;
	on(event: "session_start", handler: ExtensionHandler<SessionStartEvent>): () => void;
	on(
		event: "session_before_switch",
		handler: ExtensionHandler<SessionBeforeSwitchEvent, SessionBeforeSwitchResult>,
	): () => void;
	on(event: "session_switch", handler: ExtensionHandler<SessionSwitchEvent>): () => void;
	on(
		event: "session_before_branch",
		handler: ExtensionHandler<SessionBeforeBranchEvent, SessionBeforeBranchResult>,
	): () => void;
	on(event: "session_branch", handler: ExtensionHandler<SessionBranchEvent>): () => void;
	on(
		event: "session_before_compact",
		handler: ExtensionHandler<SessionBeforeCompactEvent, SessionBeforeCompactResult>,
	): () => void;
	on(
		event: "session.compacting",
		handler: ExtensionHandler<SessionCompactingEvent, SessionCompactingResult>,
	): () => void;
	on(
		event: "cache_warming_decision",
		handler: ExtensionHandler<CacheWarmingDecisionEvent, CacheWarmingDecisionEventResult>,
	): () => void;
	on(event: "session_compact", handler: ExtensionHandler<SessionCompactEvent>): () => void;
	on(event: "session_shutdown", handler: ExtensionHandler<SessionShutdownEvent>): () => void;
	on(
		event: "session_before_tree",
		handler: ExtensionHandler<SessionBeforeTreeEvent, SessionBeforeTreeResult>,
	): () => void;
	on(event: "session_tree", handler: ExtensionHandler<SessionTreeEvent>): () => void;
	on(event: "context", handler: ExtensionHandler<ContextEvent, ContextEventResult>): () => void;
	on(
		event: "before_provider_request",
		handler: ExtensionHandler<BeforeProviderRequestEvent, BeforeProviderRequestEventResult>,
	): () => void;
	on(event: "after_provider_response", handler: ExtensionHandler<AfterProviderResponseEvent>): () => void;
	on(
		event: "before_agent_start",
		handler: ExtensionHandler<BeforeAgentStartEvent, BeforeAgentStartEventResult>,
	): () => void;
	on(
		event: "before_subagent_spawn",
		handler: ExtensionHandler<BeforeSubagentSpawnEvent, BeforeSubagentSpawnEventResult>,
	): () => void;
	on(event: "agent_start", handler: ExtensionHandler<AgentStartEvent>): () => void;
	on(event: "agent_end", handler: ExtensionHandler<AgentEndEvent>): () => void;
	on(event: "session_stop", handler: ExtensionHandler<SessionStopEvent, SessionStopEventResult>): () => void;
	on(event: "turn_start", handler: ExtensionHandler<TurnStartEvent>): () => void;
	on(event: "turn_end", handler: ExtensionHandler<TurnEndEvent>): () => void;
	on(event: "message_start", handler: ExtensionHandler<MessageStartEvent>): () => void;
	on(event: "message_update", handler: ExtensionHandler<MessageUpdateEvent>): () => void;
	on(event: "message_end", handler: ExtensionHandler<MessageEndEvent>): () => void;
	on(
		event: "assistant_message",
		handler: ExtensionHandler<AssistantMessageRewriteEvent, AssistantMessageRewriteResult>,
	): () => void;
	on(event: "tool_execution_start", handler: ExtensionHandler<ToolExecutionStartEvent>): () => void;
	on(event: "tool_execution_update", handler: ExtensionHandler<ToolExecutionUpdateEvent>): () => void;
	on(event: "tool_execution_end", handler: ExtensionHandler<ToolExecutionEndEvent>): () => void;
	on(event: "auto_compaction_start", handler: ExtensionHandler<AutoCompactionStartEvent>): () => void;
	on(event: "auto_compaction_end", handler: ExtensionHandler<AutoCompactionEndEvent>): () => void;
	on(event: "auto_retry_start", handler: ExtensionHandler<AutoRetryStartEvent>): () => void;
	on(event: "auto_retry_end", handler: ExtensionHandler<AutoRetryEndEvent>): () => void;
	on(event: "retry_fallback_applied", handler: ExtensionHandler<RetryFallbackAppliedEvent>): () => void;
	on(event: "retry_fallback_succeeded", handler: ExtensionHandler<RetryFallbackSucceededEvent>): () => void;
	on(event: "ttsr_triggered", handler: ExtensionHandler<TtsrTriggeredEvent>): () => void;
	on(event: "todo_reminder", handler: ExtensionHandler<TodoReminderEvent>): () => void;
	on(event: "goal_updated", handler: ExtensionHandler<GoalUpdatedEvent>): () => void;
	on(event: "credential_disabled", handler: ExtensionHandler<CredentialDisabledEvent>): () => void;
	on(event: "input", handler: ExtensionHandler<InputEvent, InputEventResult>): () => void;
	on(event: "tool_approval_requested", handler: ExtensionHandler<ToolApprovalRequestedEvent>): () => void;
	on(event: "tool_approval_resolved", handler: ExtensionHandler<ToolApprovalResolvedEvent>): () => void;
	on(event: "tool_call", handler: ExtensionHandler<ToolCallEvent, ToolCallEventResult>): () => void;
	on(event: "tool_result", handler: ExtensionHandler<ToolResultEvent, ToolResultEventResult>): () => void;
	on(event: "user_bash", handler: ExtensionHandler<UserBashEvent, UserBashEventResult>): () => void;
	on(event: "user_python", handler: ExtensionHandler<UserPythonEvent, UserPythonEventResult>): () => void;
	on(event: "mcp_notification", handler: ExtensionHandler<McpNotificationEvent>): () => void;

	// =========================================================================
	// Tool Registration
	// =========================================================================

	/** Register a tool that the LLM can call. */
	registerTool<TParams extends TSchema = TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, TDetails>): void;

	/**
	 * Register a fallback writer consulted when a native `write`/`edit` byte-write is
	 * denied with a permission error (`EPERM`/`EACCES`/`EROFS`). Every other write
	 * error is unaffected. Handlers run in registration order; the first one to
	 * resolve `true` counts as the bytes being durably on disk, and the native tool
	 * continues as if its own write had succeeded — including recording its file
	 * snapshot under the real destination path, so a later hashline `edit` on that
	 * path keeps working. Intended for a host embedding the agent inside a sandbox
	 * that denies direct filesystem writes but exposes a privileged write channel.
	 *
	 * A denial that `Bun.write` masks as `ENOENT` — a write into a directory the host
	 * may not create — also diverts here, with `req.dst`'s parent absent and the
	 * handler responsible for creating it.
	 *
	 * `req.dst` is symlink-RESOLVED: the path the failed write itself acted on, not
	 * the one the tool was given. A link anywhere in a lexical path redirects the
	 * bytes while still passing a prefix allowlist, so treat `req.dst` as
	 * authoritative. A destination that cannot be resolved is never brokered.
	 *
	 * Call this during extension load, like the other `register*` methods: handlers
	 * are installed when the runner initializes, so an extension that has registered
	 * none by then is skipped and a first registration made later never takes effect.
	 *
	 * The underlying registry is process-wide, so a handler may be consulted for a
	 * denied write from any session in the process, not only its own.
	 * `req.sessionId` names the session that issued the write and
	 * `ctx.sessionManager.getSessionId()` names the handler's own; compare them
	 * before prompting, because `ctx.ui` belongs to the latter. See
	 * `docs/extensions.md`.
	 */
	registerFileWriteFallback(handler: FileWriteFallbackHandler): void;

	/**
	 * Contribute protection to the context prune pass, so results an extension owns
	 * are not dropped out from under it as the context fills.
	 *
	 * Until this seam existed both prune extension points were core-only:
	 * `PruneConfig.protectedTools` had exactly one producer (`#withPlanProtection`,
	 * the plan-file read matcher) and `PruneConfig.supersedeKey` had exactly one
	 * implementation (`readToolSupersedeKey`, hardcoded to `read`). An extension with
	 * its own stateful tool could not keep that tool's results alive, nor declare
	 * that a second call supersedes a first, without a core edit.
	 *
	 * ```ts
	 * pi.registerCompactionProtection({
	 *   protectedTools: [ctx => ctx.toolCall?.name === "mytool" && ctx.toolResult?.isError !== true],
	 *   supersedeKey: (name, args) => (name === "mytool" ? String(args?.id) : undefined),
	 * });
	 * ```
	 *
	 * The registry is PROCESS-WIDE, so protection applies to every session in the
	 * process, not only this extension's own — a protected result is a property of
	 * the tool rather than of the session that happened to produce it.
	 *
	 * Call this during extension load, like the other `register*` methods: the
	 * contribution is installed when the runner initializes, and removing it again
	 * (suspend, unload, reload) restores the pre-seam behaviour exactly.
	 *
	 * @throws when the contribution cannot be honoured — a matcher that is neither
	 * a tool name nor a predicate, a matcher that protects EVERY result (which
	 * would pin the whole context and defeat compaction), or a non-callable
	 * `supersedeKey`. The error names this extension. A rejected registration is
	 * reported rather than dropped in silence, because an ignored one is
	 * indistinguishable from one that was never made.
	 */
	registerCompactionProtection(protection: CompactionProtection): void;

	/**
	 * Register a context-reduction transform that runs in the compaction prune
	 * pass, before summarization.
	 *
	 * Core's prune pass decides what may leave the context, and until this seam
	 * it offered extensions exactly two extension points — which results are
	 * protected, and which supersede which — both of which say what to KEEP.
	 * Neither lets an extension reduce the context in its own way, so the two
	 * transforms an extension is most likely to want had no home: collapsing runs
	 * of same-kind results into a one-line label, and truncating long assistant
	 * text. Both were reachable only by editing core.
	 *
	 * The transform gets the same contract the two core transforms use —
	 * `(entries, tokenizer) => PruneResult` — so it composes with them rather
	 * than replacing them. Mutate `entries` in place and report what you did.
	 *
	 * ```ts
	 * pi.registerContextTransform({
	 *   name: "collapse-mytool-runs",
	 *   transform: (entries, tokenizer) => { /* … *\/ },
	 * });
	 * ```
	 *
	 * The registry is PROCESS-WIDE, so the transform runs for every session in the
	 * process. It is installed when the runner initializes and removed again on
	 * unload, restoring the pre-seam behaviour exactly.
	 *
	 * @throws when `name` is not a non-empty string, when `transform` is not
	 * callable, or when this extension already registered that name. The error
	 * names this extension.
	 */
	registerContextTransform(transform: ContextTransform): void;

	/**
	 * Claim the double-Escape gesture for an action of your own.
	 *
	 * Double-Escape — two Escapes inside 500 ms with an empty editor — used to be
	 * a closed enum (`rewind` | `tree` | `none`) dispatched by a hardcoded branch,
	 * so an extension could neither add a third action nor answer the gesture in
	 * the place core answers it. `registerShortcut` was the only alternative, and
	 * it binds a different key rather than this one.
	 *
	 * ```ts
	 * pi.registerDoubleEscapeAction({
	 *   id: "bookmarks",
	 *   description: "Jump to a bookmarked message",
	 *   handler: async ctx => {
	 *     const pick = await ctx.ui.select("Bookmarks", items);
	 *     if (pick) void ctx.sessionManager.jumpTo(pick);
	 *   },
	 * });
	 * ```
	 *
	 * Registered actions are consulted BEFORE core's own branch, so yours runs
	 * *instead of* `rewind`/`tree` rather than after it. When more than one
	 * extension registers one, the first in load order wins — the gesture names a
	 * single action, so running them all would stack overlays.
	 *
	 * Three things stay core-owned and are deliberately not negotiable here: the
	 * 500 ms gesture recogniser, the rewind *target set* (which transcript entries
	 * are rewindable), and the `"none"` setting — an explicit user opt-out that
	 * suppresses extension actions too, because a user who turned double-Escape
	 * off does not expect a third party to answer it anyway.
	 *
	 * The contribution lives on the extension, so suspending or unloading the
	 * extension restores core's behaviour exactly, with no unwiring.
	 *
	 * @throws when `id` is not a non-empty string, when `handler` is not
	 * callable, or when the same extension registers that `id` twice — each
	 * naming this extension, because a gesture that silently stopped responding
	 * is the worst failure report this seam could give.
	 */
	registerDoubleEscapeAction(action: {
		id: string;
		description?: string;
		handler: (ctx: ExtensionContext) => Promise<void> | void;
	}): void;

	/**
	 * Register a fallback deleter consulted when a native `edit`/`apply_patch` unlink is
	 * denied with a permission error (`EPERM`/`EACCES`/`EROFS`). Covers `edit`'s `REM`,
	 * the source side of a hashline `MV`, and `apply_patch`'s delete op. Return `true`
	 * once `dst` is gone from disk.
	 *
	 * A handler MUST remove `dst` with a plain unlink and MUST NOT fall back to a
	 * recursive removal. `unlink` on a directory reports `EPERM` on Darwin, so the seam
	 * checks the target before diverting — but when the target's own metadata is behind
	 * the same boundary that denied the unlink, which is the common sandbox case, that
	 * check cannot be resolved and `dst` may be a directory. `req.confirmedFile` says
	 * which situation the handler is in.
	 *
	 * `req.dst` resolves every component ABOVE the last, for the same reason the
	 * write seam resolves all of them; the last is left alone because `unlink`
	 * removes a link rather than its target, so `req.dst` may name a link.
	 *
	 * Separate from {@link registerFileWriteFallback} on purpose. A write handler
	 * brokers `req.content` to `req.dst`, so a delete request reaching it with no
	 * content invites brokering an empty write and truncating the file instead of
	 * removing it. Registering for deletes is therefore an explicit opt-in, and the
	 * same load-time and process-wide notes above apply.
	 */
	registerFileDeleteFallback(handler: FileDeleteFallbackHandler): void;

	// =========================================================================
	// Command, Shortcut, Flag Registration
	// =========================================================================

	/** Register a custom command. */
	registerCommand(
		name: string,
		options: {
			description?: string;
			getArgumentCompletions?: RegisteredCommand["getArgumentCompletions"];
			handler: RegisteredCommand["handler"];
		},
	): void;

	/**
	 * Declare an interactive mode: a tool set, an optional `enter`/`exit`, a write
	 * policy, and a chip on the status line.
	 *
	 * This is the seam the mode registry was built for — a mode arrives as one
	 * record rather than as a boolean per built-in, so an out-of-repo extension can
	 * add one without touching core.
	 *
	 * The registry is single-active deliberately: it describes a *mutually
	 * exclusive* interaction mode, which is what an extension registers. It is not
	 * a home for orthogonal drivers like `/loop`, which changes no tool set and
	 * consults no other mode.
	 *
	 * Ids are unique across the whole program, not per extension. Registering the
	 * same id twice throws, so a conflict surfaces at load instead of silently
	 * displacing whichever mode was there first.
	 *
	 * Known limit: a registered mode is not removed when its extension unloads,
	 * because the registry has no removal operation yet. That is a gap in the
	 * registry, not a licence to leak — noted here so nobody reads reload as safe.
	 */
	registerMode(definition: ModeDefinition): void;

	/**
	 * Register a top-level `omp <verb>` command, so `omp <verb> …` routes to this
	 * extension instead of being forwarded to the model as a prompt.
	 *
	 * Distinct from {@link registerCommand}, which registers a *slash* command
	 * inside a session. Naming a slash command here does not create a top-level
	 * verb, and registering a verb here does not add a slash command — the two
	 * registries stay separate on purpose.
	 *
	 * Routing is decided in `cli-commands.ts` before extensions load, so the CLI
	 * primes this registry before routing whenever the first argv token could be
	 * a verb, and re-reads it per call rather than from a snapshot. A verb
	 * colliding with one already claimed — or with a built-in command name — is
	 * reported through `subcommandCollisionDiagnostics()` with both owners named,
	 * and the first registration keeps routing.
	 *
	 * `handler` receives the argv that follows the verb, so `omp deploy staging`
	 * arrives as `["staging"]`. It runs in the CLI process before any session
	 * exists: close over what you captured here, and use it for work that is
	 * genuinely top-level. Anything needing a session belongs in
	 * {@link registerCommand}.
	 */
	registerSubcommand(name: string, handler: (argv: string[]) => Promise<void>): void;

	/**
	 * Contribute a named theme, returning whether it was accepted.
	 *
	 * The registry already existed in `@oh-my-pi/pi-tui` with the whole policy — a
	 * registered theme wins over nothing, a built-in wins over a registration, and
	 * every rejection is logged rather than swallowed. What it did not have was a
	 * way in: `registerTheme` had no caller outside its own module and its own
	 * test, so an extension could not reach it and the registry was an empty seam —
	 * the exact shape WI-B was raised to eliminate. This is that way in; the policy
	 * is not re-implemented here.
	 *
	 * Selection reads the registry: `resolveThemeJson` and the `loadTheme*` family
	 * consult a registered theme before falling back to the built-ins, so a theme
	 * accepted here is selectable by name with nothing else to wire.
	 *
	 * `false` means the name was taken — by a built-in, or by an earlier
	 * registration, in which case the first one is kept. It never means "rejected
	 * for quality". The built-in winning is deliberate: renaming a user's
	 * `dark` would silently change what every other tool on the machine expects,
	 * whereas a colliding extension theme is one this extension can rename. Both
	 * are logged, because a theme that never appears is otherwise
	 * indistinguishable from one the author mistyped.
	 */
	registerTheme(name: string, theme: ThemeJson): boolean;

	/**
	 * The keys core currently owns — built-in defaults and the user's remaps
	 * together.
	 *
	 * `registerShortcut` cannot take a key in this set: core wins, the
	 * registration is dropped, and the only trace is a line in the log. That is
	 * invisible to the person writing the extension and unrecoverable from the
	 * message their key did nothing, so this is the way to find out first.
	 *
	 * Live, not the default table: a key core holds only until the user remaps it
	 * is one an extension may then take, and a table frozen at startup would
	 * report the opposite of what the dispatcher does. Returns an empty set
	 * before keybindings are resolved, which reads as "nothing is claimed" rather
	 * than failing.
	 */
	getClaimedKeyIds(): ReadonlySet<KeyId>;

	/** Register a keyboard shortcut. */
	registerShortcut(
		shortcut: KeyId,
		options: {
			description?: string;
			handler: (ctx: ExtensionContext) => Promise<void> | void;
		},
	): void;

	/**
	 * Declare a typed setting owned by this extension, returning its handle.
	 *
	 * The setting is registered in the same table as core's, so it reads back
	 * through the settings API and appears in the settings panel alongside
	 * everything else — the point being that an extension does not need a core
	 * edit to own a configuration key.
	 *
	 * Unloading the extension removes its settings, so a reload starts clean
	 * rather than colliding with its own previous registration.
	 */
	registerSetting<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]>;

	/** Register a CLI flag. */
	registerFlag(
		name: string,
		options: {
			description?: string;
			type: "boolean" | "string";
			default?: boolean | string;
		},
	): void;

	/**
	 * Contribute a transcript format for the surfaces that render a whole
	 * session: `/export`, the view-session command, the RPC `export` verb and
	 * the collaboration share command. All four took HTML only.
	 *
	 * Throws when `format.id` is empty or untrimmed, and when a format with that
	 * id is already registered — silently letting the later one win would make
	 * the exported bytes depend on load order.
	 */
	registerOutputFormat(format: OutputFormat): void;

	/**
	 * Register a resolver that maps a mistyped or aliased tool name onto a real
	 * one, consulted when an exact dispatch misses.
	 *
	 * The host already has one of these — an MCP name canonicaliser, and a device
	 * bridge resolver — but both are module-level functions with no way in, so an
	 * extension that names its tools differently had to be discovered by
	 * mis-transcription at runtime.
	 *
	 * A resolver must be **conservative**: return a tool only on a unique match.
	 * Guessing between two plausible targets dispatches a tool the model never
	 * asked for, which is worse than the error it was meant to remove. The host
	 * holds this rule for the resolvers it ships and does not relax it for yours.
	 */
	registerToolNameResolver(resolver: ToolNameResolver): void;

	/**
	 * Register a copy-target provider for the `/copy` picker.
	 *
	 * The picker's target set was core-owned: a tool this extension registers
	 * produced only the generic `<toolName> result` block, and there was no way to
	 * add a copy kind, a label, or a preview language. A provider is asked per
	 * transcript entry and returns blocks for the ones it owns.
	 *
	 * Core's own extraction runs first and is never displaced — a provider appends.
	 * A block that cannot be a copy target (empty content, blank label, a
	 * non-string `href`) is dropped rather than shown broken, and a provider that
	 * throws is skipped without taking the picker's built-in targets with it.
	 */
	registerCopyTargetProvider(provider: CopyTargetProvider): void;

	/**
	 * Register a usage reporter for one of this extension's tools.
	 *
	 * A tool that makes a nested model call spends tokens the parent transcript
	 * never shows: the sub-run's assistant messages live in the child's own
	 * session, so without a reporter that spend is invisible to `/usage`, the
	 * status line, the ACP usage update, and `packages/stats`.
	 *
	 * The reporter is called with the tool result's `details` payload — the part
	 * that survives into the persisted `toolResult` message — so a resumed session
	 * attributes exactly what the live one did.
	 *
	 * **Throws** when the tool name is not a non-empty trimmed string, when
	 * `reporter` is not callable, or when that tool name already has a reporter.
	 * Two reporters folding one tool would count the same tokens twice, and a
	 * registration that is merely ignored is indistinguishable from one that never
	 * happened.
	 *
	 * @example
	 * ```typescript
	 * pi.registerUsageReporter("summarize", details => details?.usage);
	 * ```
	 */
	registerUsageReporter(toolName: string, reporter: UsageReporter): void;

	/**
	 * Contribute a check to `omp plugin doctor`.
	 *
	 * The surface for reporting on an extension's own state — a half-loaded
	 * resource, a dependency that resolved but is unusable, a repair the user can
	 * make. The check joins the ones the plugin manager builds for itself; it
	 * cannot displace them, because a doctor whose own findings an extension can
	 * suppress is not a doctor.
	 *
	 * `run` is called when the doctor runs rather than now, so a check describes
	 * current state instead of the state at load time.
	 *
	 * @throws when `id` is empty or untrimmed, when `label` is blank, when `run`
	 * is not callable, or when that id is already registered in this extension —
	 * a rejected registration is reported rather than dropped in silence, because
	 * an ignored one is indistinguishable from one that never happened.
	 *
	 * @example
	 * ```typescript
	 * pi.registerDiagnostic({
	 *   id: "model-cache",
	 *   label: "model cache is writable",
	 *   run: async () =>
	 *     (await writable(CACHE_DIR))
	 *       ? { status: "ok", message: "writable" }
	 *       : { status: "error", message: "run: rm the cache and retry" },
	 * });
	 * ```
	 */
	registerDiagnostic(diagnostic: ExtensionDiagnostic): void;

	/** Set the display label for this extension, or set a label on a specific entry. */
	setLabel(entryIdOrLabel: string, label?: string | undefined): void;

	/** Get the value of a registered CLI flag. */
	getFlag(name: string): boolean | string | undefined;

	// =========================================================================
	// Message Rendering
	// =========================================================================

	/** Register a custom renderer for CustomMessageEntry. */
	registerMessageRenderer<T = unknown>(customType: string, renderer: MessageRenderer<T>): void;

	/**
	 * Register a transformer for user and assistant Markdown before it is drawn in
	 * the interactive transcript.
	 *
	 * TUI-only by construction, and that boundary is load-bearing rather than
	 * documented: a transformer is reachable from the interactive message
	 * components and from nothing else, so the RPC/JSON transcript a client reads
	 * stays raw data. A Markdown transform that ran on the RPC path would break
	 * transcript-reading clients silently, on their side, with no omp stack trace
	 * to point at.
	 */
	registerMarkdownTransformer(transformer: MarkdownTransformer): void;

	/**
	 * Register a renderer for `custom` session entries. Custom entries do not
	 * participate in LLM context — this draws them in the transcript only.
	 */
	registerEntryRenderer<T = unknown>(customType: string, renderer: EntryRenderer<T>): void;

	/** Register a renderer for assistant thinking blocks. Rendered after the original thinking text. */
	registerAssistantThinkingRenderer(renderer: AssistantThinkingRenderer): void;

	/**
	 * Register a composer shape for the interactive editor.
	 *
	 * Registration happens during extension load. Built-in ids cannot be
	 * replaced; when extensions reuse an id, the later extension wins.
	 */
	registerComposerShape(definition: ComposerShapeDefinition): void;

	/**
	 * Contribute a rule for how a terminal resize should repaint: in place, or by
	 * borrowing the alternate screen and replaying the transcript.
	 *
	 * Core already has an opinion, and it is a closed one — a private gate that
	 * reads `Bun.env`, a hardcoded multiplexer classifier, and `TERM_PROGRAM`. An
	 * extension whose terminal none of those recognise had no way in, and
	 * `ExtensionTUISurface` does not expose the TUI itself, so it could not reach
	 * `setResizeScrollback` either.
	 *
	 * ```ts
	 * pi.registerHostRenderStrategy({
	 *   id: "myterm",
	 *   label: "MyTerminal repaints in place",
	 *   decide: ({ env }) => (env.TERM_PROGRAM === "MyTerm" ? "in-place" : "defer"),
	 * });
	 * ```
	 *
	 * Precedence, in order: the user's `PI_TUI_RESIZE_IN_PLACE`, then core's
	 * multiplexer/ConPTY safety veto, then the first strategy that does not
	 * `defer`, then core's Warp default. A strategy may claim a host core has
	 * never seen and may force the conservative borrow path, but it **cannot**
	 * override the safety veto — those hosts are measurably broken for in-place
	 * repaint, and a vendor's opinion does not change that.
	 *
	 * Call this during extension load, like the other `register*` methods: the
	 * contribution is installed when the runner initializes, and removing it
	 * again restores the pre-seam behaviour exactly.
	 *
	 * @throws when `id` is empty or untrimmed, when `label` is blank, when
	 * `decide` is not callable, or when that id is already registered — a rejected
	 * registration is reported rather than dropped in silence, because an ignored
	 * one is indistinguishable from one that was never made.
	 */
	registerHostRenderStrategy(strategy: HostRenderStrategy): void;

	// =========================================================================
	// Actions
	// =========================================================================

	/**
	 * Send a custom message to the session.
	 *
	 * With the default delivery (no `deliverAs`), an idle `display: true` message renders in the
	 * transcript immediately, even with `triggerTurn: false`, without starting a turn. This does
	 * not apply to `deliverAs: "nextTurn"` or `deliverAs: "aside"`, which keep the semantics
	 * described below (`nextTurn` stays hidden until consumed; `aside` starts a turn when idle).
	 *
	 * `deliverAs: "nextTurn"` keeps the message hidden from the editable pending-message UI.
	 * If `triggerTurn` is also true while the current turn is still unwinding, the session schedules
	 * an internal continuation that consumes the message on the next turn.
	 *
	 * `deliverAs: "aside"` injects the message at the next agent step boundary without interrupting
	 * the in-flight tool batch; when the session is idle it starts a turn regardless of `triggerTurn`
	 * (plan mode folds it into context instead).
	 */
	sendMessage<T = unknown>(
		message: CustomMessagePayload<T>,
		options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" | "aside" },
	): void;

	/** Send a user prompt: idle starts a turn; streaming queues as steer unless deliverAs is set.
	 *  `deliverAs: "aside"` injects at the next step boundary without interrupting the in-flight tool
	 *  batch while streaming; idle still starts a turn. */
	sendUserMessage(content: string | (TextContent | ImageContent)[], options?: SendUserMessageOptions): void;

	/** Append a custom entry to the session for state persistence (not sent to LLM). */
	appendEntry<T = unknown>(customType: string, data?: T): void;

	/**
	 * Observe compaction as a log-bracketed transaction.
	 *
	 * `opened` fires synchronously before the durable rewrite and `closed` once
	 * after it settles, carrying the same transaction id — write those two moments
	 * as custom entries and an interrupted compaction stays visible in the log on
	 * the next replay, instead of vanishing with no record that it ever started.
	 * `findUnclosedCompactionTransaction` reads them back.
	 *
	 * Returns the unregister function. With nothing registered, no transaction is
	 * announced and no entry is written: the session log is unchanged.
	 */
	registerCompactionTransactionObserver(observer: CompactionTransactionObserver): () => void;

	/** Execute a shell command. */
	exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>;

	/** Get the list of currently active tool names. */
	getActiveTools(): string[];

	/** Get all configured tools (built-in + extension tools) with schema and source metadata. */
	getAllTools(): ToolInfo[];

	/** Set the active tools by name. */
	setActiveTools(toolNames: string[]): Promise<void>;

	/** Get available slash commands in the current session. */
	getCommands(): SlashCommandInfo[];

	/** Set the current model. Returns false if no API key available. */
	setModel(model: Model): Promise<boolean>;

	/** Get current thinking level. */
	getThinkingLevel(): ThinkingLevel | undefined;

	/** Set thinking level for the current session. */
	setThinkingLevel(level: ThinkingLevel): void;

	/** Get a snapshot of the current session's per-family service tiers. */
	getServiceTiers(): Readonly<ServiceTierByFamily>;

	/**
	 * Set one provider family's service tier for subsequent requests, or clear
	 * its session override with `undefined`.
	 */
	setServiceTier<Family extends ServiceTierFamily>(
		family: Family,
		tier: ExtensionServiceTier<Family> | undefined,
	): void;

	/** Get the current session name. */
	getSessionName(): string | undefined;

	/** Set the session name. Persists to the session file. */
	setSessionName(name: string): Promise<void>;

	// =========================================================================
	// Provider Registration
	// =========================================================================

	/**
	 * Register or override a model provider.
	 *
	 * If `models` is provided: replaces all existing models for this provider.
	 * If only `baseUrl` is provided: overrides the URL for existing models.
	 * If `streamSimple` is provided: registers a custom API stream handler.
	 *
	 * @example
	 * // Register a new provider with custom models and streaming
	 * pi.registerProvider("google-vertex-claude", {
	 *   baseUrl: "https://us-east5-aiplatform.googleapis.com",
	 *   apiKey: "GOOGLE_CLOUD_PROJECT",
	 *   api: "vertex-claude-api",
	 *   streamSimple: myStreamFunction,
	 *   models: [
	 *     {
	 *       id: "claude-sonnet-4@20250514",
	 *       name: "Claude Sonnet 4 (Vertex)",
	 *       reasoning: true,
	 *       thinking: { mode: "anthropic-adaptive", efforts: ["minimal", "low", "medium", "high"] },
	 *       input: ["text", "image"],
	 *       cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
	 *       contextWindow: 200000,
	 *       maxTokens: 64000,
	 *   ]
	 * });
	 *
	 * @example
	 * // Override baseUrl for an existing provider
	 * pi.registerProvider("anthropic", {
	 *   baseUrl: "https://proxy.example.com"
	 * });
	 */
	registerProvider(name: string, config: ProviderConfig): void;

	/**
	 * Unregister a provider previously registered by an extension.
	 *
	 * Removes extension-provided models and restores overridden built-in models.
	 * Has no effect when the provider is not registered.
	 */
	unregisterProvider(name: string): void;

	/** Shared event bus for extension communication. */
	events: EventBus;
}

// ============================================================================
// Provider Registration Types
// ============================================================================

/** Configuration for registering a provider via pi.registerProvider(). */
export interface ProviderConfig {
	/** Base URL for the API endpoint. Required when defining models. */
	baseUrl?: string;
	/** API key or environment variable name. Required when defining models unless oauth is provided. */
	apiKey?: string;
	/** API type identifier. Required when registering streamSimple or when models don't specify one. */
	api?: Api;
	/** Custom streaming function for non-built-in APIs. */
	streamSimple?: (model: Model<Api>, context: Context, options?: SimpleStreamOptions) => AssistantMessageEventStream;
	/** Custom headers to include in requests. */
	headers?: Record<string, string>;
	/** If true, adds Authorization: Bearer header with the resolved API key. */
	authHeader?: boolean;
	/** Models to register. If provided, replaces all existing models for this provider. */
	models?: ProviderModelConfig[];
	/** Optional normalized usage fetcher used by AuthStorage for this provider. */
	usage?: UsageProvider;
	/** OAuth provider for /login support. */
	oauth?: {
		/** Display name in login UI. */
		name: string;
		/** Run the provider login flow and return credentials (or a plain API key) to persist. */
		login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials | string>;
		/** Refresh expired credentials. */
		refreshToken?(credentials: OAuthCredentials): Promise<OAuthCredentials>;
		/** Convert credentials to an API key string for requests. */
		getApiKey?(credentials: OAuthCredentials): string;
		/** Optional model rewrite hook for credential-aware routing (e.g., enterprise URLs). */
		modifyModels?(models: Model<Api>[], credentials: OAuthCredentials): Model<Api>[];
	};
	/**
	 * Async factory that fetches the live model list from the provider endpoint.
	 * Runs through the same SQLite model-cache as built-in providers (keyed by
	 * provider name, default 24 h TTL). Receives the resolved API key (undefined
	 * when unauthenticated). When combined with `models`, the static models remain as fallbacks
	 * alongside the live catalog.
	 */
	fetchDynamicModels?: (apiKey: string | undefined) => Promise<readonly ProviderModelConfig[]>;
}

/** Configuration for a model within a provider. */
export interface ProviderModelConfig {
	/** Model ID (e.g., "claude-sonnet-4@20250514"). */
	id: string;
	/** Display name (e.g., "Claude Sonnet 4 (Vertex)"). */
	name: string;
	/** API type override for this model. */
	api?: Api;
	/** Whether the model supports extended thinking at all. */
	reasoning: boolean;
	/** Optional canonical thinking capability metadata for per-model effort support. */
	thinking?: Model["thinking"];
	/** Supported input types. */
	input: ("text" | "image")[];
	/** Cost per million tokens. */
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	/** Premium Copilot requests charged per user-initiated request. */
	premiumMultiplier?: number;
	/** Maximum context window size in tokens. */
	contextWindow: number;
	/** Maximum output tokens. */
	maxTokens: number;
	/** Whether Codex requests should prefer WebSocket transport. */
	preferWebsockets?: boolean;
	/** Custom headers for this model. */
	headers?: Record<string, string>;
	/** OpenAI compatibility settings. */
	compat?: ModelSpec<Api>["compat"];
}

/** Extension factory function type. Supports both sync and async initialization. */
/**
 * An extension module's default export.
 *
 * Returning the disposer is allowed because `on()` now hands one back, and
 * `api => api.on(...)` is the natural one-line factory: without this the return
 * type widened to `() => void` and every such extension stopped type-checking.
 * TypeScript's "a function returning anything is assignable where `void` is
 * expected" rule does not survive the union, so the disposer has to be named.
 *
 * Note for anyone reusing this alias for a factory whose RETURN VALUE is consumed:
 * `custom-commands/loader.ts` and `custom-tools/loader.ts` both read a factory's
 * result through `Array.isArray(...)`. They are safe because they use their own
 * `CustomCommandFactory` / `CustomToolFactory` types, not this one — but a
 * disposer arriving here would land in that array.
 */
export type ExtensionFactory = (pi: ExtensionAPI) => void | (() => void) | Promise<void | (() => void)>;

// ============================================================================
// Loaded Extension Types
// ============================================================================

export interface RegisteredTool<TParams extends TSchema = TSchema, TDetails = unknown> {
	definition: ToolDefinition<TParams, TDetails>;
	extensionPath: string;
	/**
	 * Upstream-shaped provenance mirroring {@link SourceInfo}. Extensions authored
	 * against `@earendil-works/pi-coding-agent` — whose registered tools expose
	 * `sourceInfo` — read `sourceInfo.path` off `getAllRegisteredTools()` entries,
	 * so it carries the same value `SessionTools.getAllToolInfos()` synthesizes.
	 */
	sourceInfo: SourceInfo;
}

/** A registration conflict surfaced by the extension runner. */
export interface ExtensionRegistrationDiagnostic {
	/** `"warning"` for both current producers; lets a future one be filtered. */
	type: string;
	/**
	 * Human-readable text naming EVERY conflicting side, so a consumer that only
	 * reads `message` -- a log line, a crash dump -- still sees the full picture
	 * without having to learn the record shape.
	 */
	message: string;
	/** The winning side under last-extension-wins, or the single side when unconflicted. */
	path: string;
	/** Every conflicting side in load order; the last element is the winner. */
	paths: string[];
}

/** Internal observer invoked when an already-loaded extension registers or replaces a tool. */
export type ToolRegistrationListener = (toolName: string) => void;

export interface ExtensionFlag {
	name: string;
	description?: string;
	type: "boolean" | "string";
	default?: boolean | string;
	extensionPath: string;
	/**
	 * The value `getFlag` returns: `default` until a CLI flag overrides it.
	 *
	 * Carried HERE rather than in a map shared by every extension. The declaration
	 * was always per-extension — it carries `extensionPath` — so a shared value map
	 * let the last extension to register a name decide what all the others read.
	 * Two extensions declaring `--verbose` with different defaults meant one of them
	 * silently got the other's answer, with no error to notice it by.
	 */
	value: boolean | string | undefined;
}

/**
 * A transcript format an extension contributes, for the surfaces that render a
 * whole session: `/export`, the view-session command, the RPC `export` verb and
 * the collaboration share command.
 *
 * All four built those surfaces as literal HTML, so an extension had no way to
 * offer markdown, or a format for a consumer that already has a renderer. They
 * pass an `id` to the exporter instead.
 */
/**
 * Maps a name that did not dispatch onto a real tool.
 *
 * Return `undefined` unless the match is unique; the host calls every resolver in
 * registration order and stops at the first hit, so a resolver that fires on a
 * guess shadows every later one.
 */
/**
 * Extract the usage a tool result contributes to session totals.
 *
 * Return `undefined` for a result that spent nothing — "no opinion" is the normal
 * answer and leaves the fold untouched rather than adding a zero. See
 * `tools/usage-reporter.ts` for why this reads the PERSISTED `details` payload
 * rather than the live result object.
 */
export type UsageReporter = (details: unknown) => Usage | undefined;

/** One extension's usage reporter, as stored on {@link Extension}. */
export interface UsageReporterRegistration {
	toolName: string;
	reporter: UsageReporter;
}

export type ToolNameResolver = (
	name: string,
	advertised: readonly { readonly name: string }[],
) => { readonly name: string } | undefined;

export interface OutputFormat {
	/** Format id, e.g. `markdown`. Non-empty and trimmed. */
	readonly id: string;
	/** File extension including the dot, e.g. `.md`. Defaults to `.<id>`. */
	readonly extension?: string;
	/** MIME type for the produced bytes. */
	readonly mimeType: string;
	/**
	 * Render the session. `context` carries the messages and the theme names the
	 * built-in HTML format uses, so a format that wants the same palette can
	 * read it instead of loading the settings again.
	 *
	 * Returning the bytes is the whole contract: the caller writes them to the
	 * path it resolved from `extension` and reports that path back. A formatter
	 * must not write files itself — then a failure would leave the caller
	 * reporting a path that does not exist.
	 */
	format(context: OutputFormatContext): Promise<Uint8Array> | Uint8Array;
}

/** What a formatter is given: the transcript plus the resolved theme names. */
export interface OutputFormatContext {
	readonly entries: readonly SessionEntry[];
	readonly darkTheme?: string;
	readonly lightTheme?: string;
}

export interface ExtensionShortcut {
	shortcut: KeyId;
	description?: string;
	handler: (ctx: ExtensionContext) => Promise<void> | void;
	extensionPath: string;
}

/**
 * One action an extension claims for the double-Escape gesture.
 *
 * Registered through `registerDoubleEscapeAction` and consulted by the input
 * controller BEFORE core's own `rewind`/`tree` dispatch, so a registered action
 * runs instead of the hardcoded branch rather than after it.
 *
 * The gesture itself — two Escapes inside a 500 ms window on an empty editor —
 * is core-owned and is not re-implemented here. An extension that wants the same
 * effect on its own key can already use `registerShortcut`; what it could not do
 * is answer "the user pressed double-Escape" in the place core answers it.
 */
export interface DoubleEscapeAction {
	/** Stable id, unique within the extension. Named in diagnostics when the handler throws. */
	id: string;
	/** What this action does, shown wherever double-Escape actions are listed. */
	description?: string;
	handler: (ctx: ExtensionContext) => Promise<void> | void;
	extensionPath: string;
}

type HandlerFn = (...args: unknown[]) => Promise<unknown>;

export type SendMessageHandler = <T = unknown>(
	message: CustomMessagePayload<T>,
	/**
	 * `deliverAs: "nextTurn"` queues hidden custom context for the next turn.
	 * When paired with `triggerTurn: true` during prompt teardown, the session schedules
	 * an internal continuation without surfacing the message in the editable pending queue.
	 * `deliverAs: "aside"` injects at the next step boundary without interrupting the in-flight
	 * tool batch; idle starts a turn regardless of `triggerTurn` (plan mode folds into context).
	 */
	options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" | "aside" },
) => void;

/** `deliverAs: "aside"` injects at the next step boundary without interrupting the in-flight tool
 *  batch while streaming; idle still starts a turn. */
export type SendUserMessageHandler = (
	content: string | (TextContent | ImageContent)[],
	options?: SendUserMessageOptions,
) => void;

export type AppendEntryHandler = <T = unknown>(customType: string, data?: T) => void;

export type GetActiveToolsHandler = () => string[];

export type GetAllToolsHandler = () => ToolInfo[];

export type GetCommandsHandler = () => SlashCommandInfo[];

export type SetActiveToolsHandler = (toolNames: string[]) => Promise<void>;

export type SetModelHandler = (model: Model) => Promise<boolean>;

export type GetThinkingLevelHandler = () => ThinkingLevel | undefined;

export type SetThinkingLevelHandler = (level: ThinkingLevel, persist?: boolean) => void;

export type GetServiceTiersHandler = () => ServiceTierByFamily;

export type SetServiceTierHandler = (family: ServiceTierFamily, tier: ServiceTier | undefined) => void;

/** Shared state created by loader, used during registration and runtime. */
export interface ExtensionRuntimeState {
	/** Provider registrations queued during extension loading, processed during session initialization */
	pendingProviderRegistrations: Array<{ name: string; config: ProviderConfig; sourceId: string }>;
	/** Queue a provider registration until initialization, then apply it immediately. */
	registerProvider(name: string, config: ProviderConfig, sourceId: string): void;
	/** Remove a queued or initialized provider registration. */
	unregisterProvider(name: string, sourceId: string): void;
	/**
	 * Throw if this runtime has been invalidated, otherwise return.
	 *
	 * Additive by construction: nothing calls this on a path an extension can
	 * already reach, so an extension that keeps using a captured context across a
	 * session replacement behaves exactly as it did before this existed. That
	 * matters because the alternative — asserting on every action — is a breaking
	 * change for any extension already published against the old behaviour, which
	 * this repo's own programme forbids without the owner deciding it first.
	 */
	assertActive(): void;
	/**
	 * Mark every context minted from this runtime as stale, and record why.
	 *
	 * First message wins, so the original cause survives later, vaguer calls.
	 */
	invalidate(message?: string): void;
}

/** Action implementations for ExtensionAPI methods. */
export interface ExtensionActions {
	sendMessage: SendMessageHandler;
	sendUserMessage: SendUserMessageHandler;
	appendEntry: AppendEntryHandler;
	/** Optional: the runner falls back to the module's own process-global registry. */
	registerCompactionTransactionObserver?: (observer: CompactionTransactionObserver) => () => void;
	setLabel: (targetId: string, label: string | undefined) => void;
	getActiveTools: GetActiveToolsHandler;
	getAllTools: GetAllToolsHandler;
	setActiveTools: SetActiveToolsHandler;
	getCommands: GetCommandsHandler;
	setModel: SetModelHandler;
	getThinkingLevel: GetThinkingLevelHandler;
	setThinkingLevel: SetThinkingLevelHandler;
	getServiceTiers?: GetServiceTiersHandler;
	setServiceTier?: SetServiceTierHandler;
	getSessionName: () => string | undefined;
	setSessionName: (name: string) => Promise<void>;
}

/** Actions for ExtensionContext (ctx.* in event handlers). */
export interface ExtensionContextActions {
	getModel: () => Model | undefined;
	isIdle: () => boolean;
	abort: () => void;
	hasPendingMessages: () => boolean;
	shutdown: () => void;
	getContextUsage: () => ContextUsage | undefined;
	compact: (instructionsOrOptions?: string | CompactOptions) => Promise<void>;
	getSystemPrompt: () => string[];
	runEphemeralTurn?: (options: EphemeralTurnOptions) => Promise<EphemeralTurnResult>;
}

/** Actions for ExtensionCommandContext (ctx.* in command handlers). */
export interface ExtensionCommandContextActions {
	getContextUsage: () => ContextUsage | undefined;
	waitForIdle: () => Promise<void>;
	newSession: (options?: {
		parentSession?: string;
		setup?: (sessionManager: SessionManager) => Promise<void>;
		withSession?: (ctx: ReplacedSessionContext) => Promise<void>;
	}) => Promise<{ cancelled: boolean }>;
	branch: (
		entryId: string,
		options?: { withSession?: (ctx: ReplacedSessionContext) => Promise<void> },
	) => Promise<{
		cancelled: boolean;
	}>;
	navigateTree: (targetId: string, options?: { summarize?: boolean }) => Promise<{ cancelled: boolean }>;
	compact: (instructionsOrOptions?: string | CompactOptions) => Promise<void>;
	switchSession: (
		sessionPath: string,
		options?: { withSession?: (ctx: ReplacedSessionContext) => Promise<void> },
	) => Promise<{
		cancelled: boolean;
	}>;
	reload: () => Promise<void>;
}

/** Full runtime = state + actions, including host-compatible service-tier fallbacks. */
export interface ExtensionRuntime extends ExtensionRuntimeState, ExtensionActions {
	getServiceTiers: GetServiceTiersHandler;
	setServiceTier: SetServiceTierHandler;
}

export interface MarkdownTransformContext {
	messageType: "user" | "assistant" | "assistant-thinking";
	isStreaming: boolean;
	availableWidth: number;
}

export type MarkdownTransformer = (markdown: string, context: MarkdownTransformContext) => string;

export interface EntryRenderOptions {
	expanded: boolean;
}

export type EntryRenderer<T = unknown> = (
	entry: CustomEntry<T>,
	options: EntryRenderOptions,
	theme: Theme,
) => Component | undefined;

/** Loaded extension with all registered items. */
export interface Extension {
	path: string;
	resolvedPath: string;
	/**
	 * Model providers this extension registered, recorded at registration time.
	 *
	 * Recorded rather than re-derived: the config is what was passed to
	 * `registerProvider`, and rebuilding it at resume would let a provider come
	 * back subtly different from the one that was withdrawn. It is also the only
	 * way a resume can restore EXACTLY what a suspend removed.
	 */
	registeredProviders: Array<{ name: string; config: ProviderConfig }>;
	label?: string;
	handlers: Map<string, HandlerFn[]>;
	tools: Map<string, RegisteredTool<any, any>>;
	/**
	 * Optional-typed but always created: `createExtension` seeds every bucket, and a
	 * bucket that "might be missing" is a bucket callers must guard and unload
	 * silently cannot rely on. Made required so the compiler says so at the one
	 * place it would matter.
	 */
	toolRegistrationListeners: Set<ToolRegistrationListener>;
	assistantThinkingRenderers: AssistantThinkingRenderer[];
	fileWriteFallbackHandlers: FileWriteFallbackHandler[];
	fileDeleteFallbackHandlers: FileDeleteFallbackHandler[];
	compactionProtections: CompactionProtection[];
	contextTransforms: ContextTransform[];
	messageRenderers: Map<string, MessageRenderer>;
	/**
	 * Display-only Markdown rewrite, one per extension: a second registration is
	 * the author overwriting their own, which is refused rather than applied.
	 */
	markdownTransformer?: MarkdownTransformer;
	/** Per-extension renderer for `custom` entries, keyed by customType. */
	entryRenderers: Map<string, EntryRenderer>;
	composerShapes: Map<string, ComposerShapeDefinition>;
	commands: Map<string, RegisteredCommand>;
	flags: Map<string, ExtensionFlag>;
	shortcuts: Map<KeyId, ExtensionShortcut>;
	doubleEscapeActions: DoubleEscapeAction[];
	/**
	 * Modes this extension registered, kept only so unload can withdraw exactly
	 * those. The registry itself is process-global, so without this record an
	 * unloaded extension's mode would outlive it and collide with its own
	 * replacement on reload.
	 */
	modes: ModeDefinition[];
	outputFormats: Map<string, OutputFormat>;
	/**
	 * Setting ids this extension declared, so unloading can remove exactly those.
	 *
	 * Recorded rather than derived from the id string: the id prefix is a
	 * convention the author can get wrong, and a stale setting outliving its
	 * extension is worse than a name collision.
	 */
	settingIds: string[];
	/**
	 * Tool-name resolvers in registration order. The first to return a tool wins,
	 * so a resolver that guesses shadows every later one.
	 */
	toolNameResolvers: ToolNameResolver[];
	usageReporters: UsageReporterRegistration[];
	/** Host render strategies, in registration order. First opinion wins. */
	hostRenderStrategies: HostRenderStrategy[];
	copyTargetProviders: CopyTargetProvider[];
	/** Diagnostics contributed to `omp plugin doctor`, in registration order. */
	diagnostics: ExtensionDiagnostic[];
}

/**
 * Imported extension factory detached from any session runtime. The same
 * prepared module may be rebound to multiple session-scoped ExtensionAPI
 * instances without evaluating its module graph again.
 */
export interface PreparedExtension {
	path: string;
	resolvedPath: string;
	factory: ExtensionFactory | null;
	error: string | null;
}

/** Result of loading extensions. */
export interface LoadExtensionsResult {
	extensions: Extension[];
	errors: Array<{ path: string; error: string }>;
	runtime: ExtensionRuntime;
	/** Session-independent imported factories safe to rebind in child sessions. */
	preparedExtensions?: PreparedExtension[];
}

// ============================================================================
// Extension Error
// ============================================================================

export interface ExtensionError {
	extensionPath: string;
	event: string;
	error: string;
	stack?: string;
	/**
	 * Stable machine-readable classification, when the host recognised the failure
	 * rather than merely reporting it.
	 *
	 * Optional because most errors are a handler throwing, which the host can only
	 * describe, not classify. It is set when the host rejected a value or a state
	 * on purpose. Codes are stable: host control flow and tests branch on them, so
	 * add one rather than repurposing one.
	 */
	code?: string;
	/**
	 * The classified detail, kept out of `error` so a consumer can read it without
	 * parsing the human-readable sentence. `error` carries the same text prefixed
	 * with the code, because `error` is what a log line shows.
	 */
	detail?: string;
}
