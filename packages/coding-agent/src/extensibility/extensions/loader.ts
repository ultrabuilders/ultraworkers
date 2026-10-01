/**
 * Extension loader - loads TypeScript extension modules using native Bun import.
 */
import type * as fs1 from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import * as zod from "@oh-my-pi/omptype/zod";
import type { ThinkingLevel } from "@oh-my-pi/pi-agent-core";
import type {
	ImageContent,
	Model,
	ServiceTier,
	ServiceTierByFamily,
	ServiceTierFamily,
	TextContent,
	TSchema,
} from "@oh-my-pi/pi-ai";
import { isBuiltinComposerStyle, type KeyId } from "@oh-my-pi/pi-tui";
import { hasFsCode, isEacces, isEnoent, logger } from "@oh-my-pi/pi-utils";
import {
	type CompactionTransactionObserver,
	registerCompactionTransactionObserver,
} from "../../session/compaction-transaction";
import { type ExtensionModule, extensionModuleCapability } from "../../capability/extension-module";
import { type Hook, hookCapability } from "../../capability/hook";
import { recordHookHash, recordedHookHash } from "../../config/hook-settings";
import { settings } from "../../config/settings";
import { hookContentHash, hookModifiedMessage, hookTrustKey, hookTrustStatus } from "../hooks/trust";
import { isServiceTierFamily, isServiceTierForFamily } from "../../config/service-tier";
import { loadCapability } from "../../discovery";
import { addDiagnostic, type ExtensionDiagnostic } from "./diagnostics";
import { ExtensionContextStaleError, STALE_CONTEXT_MESSAGE } from "./stale-context";
import { getExtensionNameFromPath } from "../../discovery/helpers";
import type { ExecOptions } from "../../exec/exec";
import { execCommand } from "../../exec/exec";
// Runtime self-reference: dereference this namespace only inside loader functions to keep the index.ts cycle safe.
import * as PiCodingAgent from "../../index";
import type { SendUserMessageOptions } from "../../session/agent-session";
import type { CustomMessagePayload } from "../../session/messages";
import type { FileDeleteFallbackHandler, FileWriteFallbackHandler } from "../../tools/file-write-fallback";
import type { CompactionProtection } from "../../tools/compaction-protection";
import type { HostRenderStrategy } from "@oh-my-pi/pi-tui/host-render-strategy";
import type { CopyTargetProvider } from "@oh-my-pi/pi-tui/overlays/copy-target-registry";
import type { ContextTransform } from "../../tools/compaction-transforms";
import type { DefinitionValue, Setting, SettingDefinition } from "../../config/registry";
import { lookup as lookupSetting, registerOwned } from "../../config/registry";
import { isFilesystemSourcePath } from "../../tools/path-utils";
import { EventBus } from "../../utils/event-bus";
import * as TypeBox from "../legacy-typebox";
import { resolveExtensionDirectory } from "./directory-resolution";
import { installLegacyPiSpecifierShim, loadLegacyPiModule } from "../plugins/legacy-pi-compat";
import { getAllPluginExtensionPaths } from "../plugins/loader";

import { createHandlerDisposer, resolvePath, withHostGuard } from "../utils";
import type { ComposerShapeDefinition } from "@oh-my-pi/pi-tui/overlays/composer-shape-registry";
import type {
	AssistantThinkingRenderer,
	Extension,
	ExtensionAPI,
	ExtensionContext,
	ExtensionFactory,
	ExtensionRuntime as IExtensionRuntime,
	LoadExtensionsResult,
	MessageRenderer,
	PreparedExtension,
	ProviderConfig,
	RegisteredCommand,
	SourceInfo,
	ToolDefinition,
	ToolInfo,
	OutputFormat,
	ToolNameResolver,
	UsageReporter,
	UsageReporterRegistration,
} from "./types";

installLegacyPiSpecifierShim();

type HandlerFn = (...args: unknown[]) => Promise<unknown>;
type LoadedExtensionModule = ExtensionFactory | { default?: ExtensionFactory };

function getExtensionFactory(module: LoadedExtensionModule): ExtensionFactory | null {
	const candidate = typeof module === "function" ? module : module.default;
	return typeof candidate === "function" ? candidate : null;
}

/**
 * Upstream-shaped provenance for an extension-registered tool. Consumers that
 * read `sourceInfo` off `getAllRegisteredTools()` (e.g. pi-fabric) receive an
 * absolute on-disk path: the tool's own `sourcePath` when it is filesystem-
 * absolute, otherwise the extension's resolved entry (`fallbackPath`). A tool
 * with no absolute origin at all falls back to the synthetic `<extension:name>`.
 */
export function extensionToolSourceInfo(
	definition: Pick<ToolDefinition, "name" | "sourcePath">,
	fallbackPath: string,
): SourceInfo {
	const sourcePath = definition.sourcePath;
	const path =
		sourcePath && isFilesystemSourcePath(sourcePath)
			? sourcePath
			: isFilesystemSourcePath(fallbackPath)
				? fallbackPath
				: `<extension:${definition.name}>`;
	return { path, source: "extension", scope: "temporary", origin: "top-level" };
}

export class ExtensionRuntimeNotInitializedError extends Error {
	constructor() {
		super("Extension runtime not initialized. Action methods cannot be called during extension loading.");
	}
}

/**
 * Extension runtime with throwing stubs for action methods.
 * These are replaced with real implementations during initialization.
 */
export class ExtensionRuntime implements IExtensionRuntime {
	pendingProviderRegistrations: Array<{ name: string; config: ProviderConfig; sourceId: string }> = [];

	/**
	 * First invalidation reason wins.
	 *
	 * Held on the runtime rather than on any context, because the contexts are
	 * what goes stale: they are minted per handler run and outlive neither a
	 * session replacement nor a reload, while the runtime is built once and lives
	 * across both.
	 */
	#staleMessage: string | undefined;

	assertActive(): void {
		if (this.#staleMessage !== undefined) {
			throw new ExtensionContextStaleError(this.#staleMessage);
		}
	}

	invalidate(message?: string): void {
		this.#staleMessage ??= message;
	}

	registerProvider(name: string, config: ProviderConfig, sourceId: string): void {
		this.pendingProviderRegistrations.push({ name, config, sourceId });
	}

	unregisterProvider(name: string): void {
		const remaining = this.pendingProviderRegistrations.filter(registration => registration.name !== name);
		this.pendingProviderRegistrations.splice(0, this.pendingProviderRegistrations.length, ...remaining);
	}

	sendMessage(): void {
		throw new ExtensionRuntimeNotInitializedError();
	}

	sendUserMessage(): void {
		throw new ExtensionRuntimeNotInitializedError();
	}

	appendEntry(): void {
		throw new ExtensionRuntimeNotInitializedError();
	}

	registerCompactionTransactionObserver(): () => void {
		throw new ExtensionRuntimeNotInitializedError();
	}

	setLabel(): void {
		throw new ExtensionRuntimeNotInitializedError();
	}

	getActiveTools(): string[] {
		throw new ExtensionRuntimeNotInitializedError();
	}

	getAllTools(): ToolInfo[] {
		throw new ExtensionRuntimeNotInitializedError();
	}

	setActiveTools(): Promise<void> {
		throw new ExtensionRuntimeNotInitializedError();
	}

	getCommands(): never {
		throw new ExtensionRuntimeNotInitializedError();
	}

	setModel(): Promise<boolean> {
		throw new ExtensionRuntimeNotInitializedError();
	}

	getThinkingLevel(): ThinkingLevel {
		throw new ExtensionRuntimeNotInitializedError();
	}

	setThinkingLevel(): void {
		throw new ExtensionRuntimeNotInitializedError();
	}

	getServiceTiers(): ServiceTierByFamily {
		throw new ExtensionRuntimeNotInitializedError();
	}

	setServiceTier(): void {
		throw new ExtensionRuntimeNotInitializedError();
	}

	getSessionName(): string | undefined {
		throw new ExtensionRuntimeNotInitializedError();
	}

	setSessionName(): Promise<void> {
		throw new ExtensionRuntimeNotInitializedError();
	}
}

/**
 * ExtensionAPI implementation for an extension.
 * Registration methods write to the extension object.
 * Action methods delegate to the shared runtime.
 */
/**
 * Stable owner key for an extension's settings.
 *
 * `resolvedPath` rather than `path`: `path` can be a specifier or a URL that
 * resolves to the same file, so reloading by a different-but-equivalent path
 * would register a second owner and orphan the first one's settings. The
 * resolved path is the same string for the same file, which is what "reload
 * cleanly" needs.
 */
export function extensionSettingOwner(extension: { resolvedPath: string }): string {
	return `extension:${extension.resolvedPath}`;
}

class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime {
	readonly logger = logger;
	readonly typebox = TypeBox;
	readonly arktype = type;
	readonly zod = zod;
	readonly pendingProviderRegistrations: Array<{
		name: string;
		config: ProviderConfig;
		sourceId: string;
	}> = [];

	constructor(
		public readonly pi: typeof PiCodingAgent,
		private readonly extension: Extension,
		private readonly runtime: IExtensionRuntime,
		private readonly cwd: string,
		public readonly events: EventBus,
	) {
		// Extensions destructure `pi.on` or forward API methods as callbacks, so every
		// prototype method must keep its receiver when detached. Walk the prototype
		// rather than listing methods: a new method is bound without touching this.
		const prototype = ConcreteExtensionAPI.prototype;
		for (const name of Object.getOwnPropertyNames(prototype)) {
			if (name === "constructor") continue;
			const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
			if (typeof descriptor?.value !== "function") continue;
			Object.defineProperty(this, name, { value: descriptor.value.bind(this), writable: true, configurable: true });
		}
	}

	on<F extends HandlerFn>(event: string, handler: F): () => void {
		const list = this.extension.handlers.get(event) ?? [];
		list.push(handler);
		this.extension.handlers.set(event, list);
		return createHandlerDisposer(this.extension.handlers, event, handler);
	}

	/**
	 * Delegate to the shared runtime rather than tracking staleness per
	 * extension: every extension loaded into this process shares one session
	 * lifetime, so a stale context is stale for all of them at once.
	 */
	assertActive(): void {
		this.runtime.assertActive();
	}

	invalidate(message?: string): void {
		this.runtime.invalidate(message);
	}

	registerTool<TParams extends TSchema = TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, TDetails>): void {
		const registered = {
			definition: tool,
			extensionPath: this.extension.path,
			sourceInfo: extensionToolSourceInfo(tool, this.extension.resolvedPath),
		};
		this.extension.tools.set(tool.name, registered);
		// No `?? []`: the bucket is required on `Extension`, and an empty-array
		// fallback here would turn a missing bucket into ZERO listener calls —
		// silently dropping a tool-registration callback rather than failing.
		for (const listener of this.extension.toolRegistrationListeners) listener(tool.name);
	}

	registerFileWriteFallback(handler: FileWriteFallbackHandler): void {
		this.extension.fileWriteFallbackHandlers.push(handler);
	}

	registerFileDeleteFallback(handler: FileDeleteFallbackHandler): void {
		this.extension.fileDeleteFallbackHandlers.push(handler);
	}

	registerCompactionProtection(protection: CompactionProtection): void {
		this.extension.compactionProtections.push(protection);
	}

	registerContextTransform(transform: ContextTransform): void {
		this.extension.contextTransforms.push(transform);
	}

	/**
	 * Claim the double-Escape gesture for an action.
	 *
	 * Validated at the door rather than at the keystroke: a malformed action that
	 * is silently ignored is indistinguishable from one that was never registered,
	 * and the user just sees double-Escape stop working.
	 *
	 * @throws when `id` is not a non-empty string, when the same extension
	 * registers that id twice, or when `handler` is not callable — each naming
	 * the extension, since "your gesture silently stopped working" is the worst
	 * possible failure report for this seam.
	 */
	registerDoubleEscapeAction(action: {
		id: string;
		description?: string;
		handler: (ctx: ExtensionContext) => Promise<void> | void;
	}): void {
		const extensionPath = this.extension.path;
		if (typeof action.id !== "string" || action.id.length === 0) {
			throw new TypeError(`Extension ${extensionPath}: doubleEscapeAction id must be a non-empty string`);
		}
		if (typeof action.handler !== "function") {
			throw new TypeError(`Extension ${extensionPath}: doubleEscapeAction ${action.id} handler must be a function`);
		}
		if (this.extension.doubleEscapeActions.some(registered => registered.id === action.id)) {
			throw new Error(
				`Extension ${extensionPath}: doubleEscapeAction id ${action.id} is already registered — ids must be unique within an extension so a thrown handler can be attributed`,
			);
		}
		this.extension.doubleEscapeActions.push({ ...action, extensionPath });
	}

	registerCommand(
		name: string,
		options: {
			description?: string;
			getArgumentCompletions?: RegisteredCommand["getArgumentCompletions"];
			handler: RegisteredCommand["handler"];
		},
	): void {
		this.extension.commands.set(name, { name, ...options });
	}

	setLabel(label: string): void {
		this.extension.label = label;
	}

	registerShortcut(
		shortcut: KeyId,
		options: {
			description?: string;
			handler: (ctx: ExtensionContext) => Promise<void> | void;
		},
	): void {
		this.extension.shortcuts.set(shortcut, { shortcut, extensionPath: this.extension.path, ...options });
	}

	registerSetting<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]> {
		const owner = extensionSettingOwner(this.extension);
		// Idempotent across a rebind: re-running the factory must not re-register.
		// Without this, a reload of an unchanged extension would collide with its
		// own settings and fail on an id the author cannot see the origin of.
		if (this.extension.settingIds.includes(definition.id)) {
			const existing = lookupSetting(definition.id);
			if (existing) return existing as Setting<DefinitionValue<D>, D["id"]>;
		}
		const handle = registerOwned(owner, definition);
		this.extension.settingIds.push(definition.id);
		return handle;
	}

	registerFlag(
		name: string,
		options: { description?: string; type: "boolean" | "string"; default?: boolean | string },
	): void {
		// The value is seeded onto the declaration, not into a shared map. Two
		// extensions may declare the same name; each keeps its own value, so loading
		// order stops deciding what the other one reads.
		//
		// No duplicate-name guard here. What a collision should MEAN — reject,
		// namespace, or warn — is a product decision that is still open, and adding a
		// wall now would silently pick one of them.
		this.extension.flags.set(name, {
			name,
			extensionPath: this.extension.path,
			...options,
			value: options.default,
		});
	}

	registerUsageReporter(toolName: string, reporter: UsageReporter): void {
		// Duplicates are refused rather than first-wins: two reporters folding one
		// tool would add the same tokens to /usage, the ACP usage update and
		// packages/stats twice, and which one "won" would then decide how badly the
		// ledger over-reports. Per-extension is the right scope for the guard —
		// addUsageReporter is what rejects the process-wide case.
		if (this.extension.usageReporters.some(r => r.toolName === toolName)) {
			throw new Error(
				`Extension ${this.extension.path}: a usage reporter for tool '${toolName}' is already registered — tool names must be unique within an extension so its usage lands once`,
			);
		}
		if (typeof toolName !== "string" || toolName.length === 0 || toolName !== toolName.trim()) {
			throw new TypeError(
				`Extension ${this.extension.path}: usageReporter tool name must be a non-empty trimmed string`,
			);
		}
		if (typeof reporter !== "function") {
			throw new TypeError(
				`Extension ${this.extension.path}: usageReporter for '${toolName}' must be a function, got ${typeof reporter}`,
			);
		}
		this.extension.usageReporters.push({ toolName, reporter });
	}

	registerToolNameResolver(resolver: ToolNameResolver): void {
		// Appended, not replaced: the host ships its own resolvers and an
		// extension's joins them. Order matters — the first hit wins — so
		// registration order is the only thing a caller can reason about.
		this.extension.toolNameResolvers.push(resolver);
	}

	registerDiagnostic(diagnostic: ExtensionDiagnostic): void {
		const id = typeof diagnostic?.id === "string" ? diagnostic.id.trim() : "";
		if (id.length === 0) {
			throw new TypeError(`Extension ${this.extension.path}: diagnostic id must be a non-empty trimmed string`);
		}
		if (typeof diagnostic.label !== "string" || diagnostic.label.trim().length === 0) {
			throw new TypeError(`Extension ${this.extension.path}: diagnostic "${id}" must have a label`);
		}
		if (typeof diagnostic.run !== "function") {
			throw new TypeError(
				`Extension ${this.extension.path}: diagnostic "${id}" must provide run(), got ${typeof diagnostic.run}`,
			);
		}
		// Refused rather than silently shadowed: two checks with one name make the
		// doctor report twice under a name the user cannot tell apart, and which of
		// them ran is then anyone's guess.
		if (this.extension.diagnostics.some(entry => entry.id === id)) {
			throw new TypeError(`Extension ${this.extension.path}: diagnostic "${id}" is already registered`);
		}
		const entry: ExtensionDiagnostic = { ...diagnostic, id };
		this.extension.diagnostics.push(entry);
		// Also into the process-wide registry the doctor reads, because the command
		// that runs it lives in another subsystem with no handle on this extension.
		// `releaseDiagnostics(path)` undoes exactly this extension's contributions on
		// unload, which the runner calls beside its other per-extension teardown.
		addDiagnostic(this.extension.path, entry);
	}

	registerHostRenderStrategy(strategy: HostRenderStrategy): void {
		const id = typeof strategy.id === "string" ? strategy.id.trim() : "";
		// Re-validated here, not only in `registerHostRenderStrategy`: the
		// registry is a module singleton, so a definition that skipped its own
		// check would otherwise be refused at install time with no extension named.
		if (id.length === 0) {
			throw new TypeError(
				`Extension ${this.extension.path}: host render strategy id must be a non-empty trimmed string`,
			);
		}
		if (typeof strategy.label !== "string" || strategy.label.trim().length === 0) {
			throw new TypeError(`Extension ${this.extension.path}: host render strategy "${id}" must have a label`);
		}
		if (typeof strategy.decide !== "function") {
			throw new TypeError(
				`Extension ${this.extension.path}: host render strategy "${id}" must provide decide(), got ${typeof strategy.decide}`,
			);
		}
		// Appended, not replaced: an extension's strategies join the host's own
		// gate rather than displacing it, and order is the tiebreak.
		this.extension.hostRenderStrategies.push({ ...strategy, id });
	}

	registerCopyTargetProvider(provider: CopyTargetProvider): void {
		const id = typeof provider.id === "string" ? provider.id.trim() : "";
		// Re-validated here, not only in `registerCopyTargetProvider`: the registry
		// is a module singleton, so a definition that skipped its own check would
		// otherwise be refused at install time with no extension named.
		if (id.length === 0) {
			throw new TypeError(
				`Extension ${this.extension.path}: copy target provider id must be a non-empty trimmed string`,
			);
		}
		if (typeof provider.label !== "string" || provider.label.trim().length === 0) {
			throw new TypeError(`Extension ${this.extension.path}: copy target provider "${id}" must have a label`);
		}
		if (typeof provider.collect !== "function") {
			throw new TypeError(
				`Extension ${this.extension.path}: copy target provider "${id}" must provide collect(), got ${typeof provider.collect}`,
			);
		}
		// Appended, not replaced: a provider's blocks join core's own extraction
		// rather than displacing it, and order is the tiebreak.
		this.extension.copyTargetProviders.push({ ...provider, id });
	}

	registerOutputFormat(format: OutputFormat): void {
		const id = format.id;
		// Charset, not just trimming: the id becomes part of the output filename
		// (`<session-stem>.<id>`), so an id containing a separator would let a
		// registration write outside the directory the caller resolved. Rejecting
		// the characters is cheaper than sanitising the name afterwards, and it
		// keeps the id usable verbatim as a CLI value.
		if (!OUTPUT_FORMAT_ID_PATTERN.test(id)) {
			throw new TypeError(`Output format id must match ${OUTPUT_FORMAT_ID_PATTERN} (got ${JSON.stringify(id)})`);
		}
		if (format.extension !== undefined && !OUTPUT_FORMAT_EXTENSION_PATTERN.test(format.extension)) {
			throw new TypeError(
				`Output format extension must match ${OUTPUT_FORMAT_EXTENSION_PATTERN} (got ${JSON.stringify(format.extension)})`,
			);
		}
		if (this.extension.outputFormats.has(id)) {
			// Two extensions claiming one id would make the exported bytes depend
			// on which one loaded last, so the second registration is refused
			// rather than silently winning.
			throw new TypeError(`Output format '${id}' is already registered`);
		}
		this.extension.outputFormats.set(id, format);
	}

	registerMessageRenderer<T>(customType: string, renderer: MessageRenderer<T>): void {
		this.extension.messageRenderers.set(customType, renderer as MessageRenderer);
	}

	registerAssistantThinkingRenderer(renderer: AssistantThinkingRenderer): void {
		this.extension.assistantThinkingRenderers.push(renderer);
	}

	registerComposerShape(definition: ComposerShapeDefinition): void {
		const id = definition.style.id;
		if (id.length === 0 || id !== id.trim()) {
			throw new TypeError("Composer shape id must be a non-empty trimmed string");
		}
		if (definition.label.trim().length === 0) {
			throw new TypeError(`Composer shape "${id}" must have a label`);
		}
		if (isBuiltinComposerStyle(id)) {
			throw new Error(`Cannot replace built-in composer shape "${id}"`);
		}
		this.extension.composerShapes.set(id, definition);
	}

	getFlag(name: string): boolean | string | undefined {
		// A name this extension never declared is `undefined` — not another
		// extension's value, and not a CLI value that arrived for someone else.
		return this.extension.flags.get(name)?.value;
	}

	sendMessage<T = unknown>(
		message: CustomMessagePayload<T>,
		options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" | "aside" },
	): void {
		this.runtime.sendMessage(message, options);
	}

	sendUserMessage(content: string | (TextContent | ImageContent)[], options?: SendUserMessageOptions): void {
		this.runtime.sendUserMessage(content, options);
	}

	appendEntry(customType: string, data?: unknown): void {
		this.runtime.appendEntry(customType, data);
	}

	registerCompactionTransactionObserver(observer: CompactionTransactionObserver): () => void {
		// Straight to the module registry rather than through the runtime: the
		// registry is process-global, so routing it through a per-host field would
		// add a wiring step that could only ever forward to the same set.
		return registerCompactionTransactionObserver(observer);
	}

	exec(command: string, args: string[], options?: ExecOptions) {
		return execCommand(command, args, options?.cwd ?? this.cwd, options);
	}

	getActiveTools(): string[] {
		return this.runtime.getActiveTools();
	}

	getAllTools(): ToolInfo[] {
		return this.runtime.getAllTools();
	}

	setActiveTools(toolNames: string[]): Promise<void> {
		return this.runtime.setActiveTools(toolNames);
	}

	getCommands() {
		return this.runtime.getCommands();
	}

	setModel(model: Model): Promise<boolean> {
		return this.runtime.setModel(model);
	}

	getThinkingLevel(): ThinkingLevel | undefined {
		return this.runtime.getThinkingLevel();
	}

	setThinkingLevel(level: ThinkingLevel, persist?: boolean): void {
		this.runtime.setThinkingLevel(level, persist);
	}

	getServiceTiers(): Readonly<ServiceTierByFamily> {
		return { ...this.runtime.getServiceTiers() };
	}

	setServiceTier(family: ServiceTierFamily, tier: ServiceTier | undefined): void {
		if (!isServiceTierFamily(family) || (tier !== undefined && !isServiceTierForFamily(family, tier))) {
			throw new TypeError(`Invalid service tier "${String(tier)}" for family "${String(family)}"`);
		}
		this.runtime.setServiceTier(family, tier);
	}

	getSessionName(): string | undefined {
		return this.runtime.getSessionName();
	}

	setSessionName(name: string): Promise<void> {
		return this.runtime.setSessionName(name);
	}

	registerProvider(name: string, config: ProviderConfig): void {
		this.runtime.registerProvider(name, config, this.extension.path);
	}

	unregisterProvider(name: string): void {
		this.runtime.unregisterProvider(name, this.extension.path);
	}
}

/**
 * Create an Extension object with empty collections.
 */
function createExtension(extensionPath: string, resolvedPath: string): Extension {
	return {
		path: extensionPath,
		resolvedPath,
		registeredProviders: [],
		handlers: new Map(),
		tools: new Map(),
		toolRegistrationListeners: new Set(),
		assistantThinkingRenderers: [],
		fileWriteFallbackHandlers: [],
		compactionProtections: [],
		contextTransforms: [],
		doubleEscapeActions: [],
		fileDeleteFallbackHandlers: [],
		messageRenderers: new Map(),
		outputFormats: new Map(),
		settingIds: [],
		toolNameResolvers: [] as ToolNameResolver[],
		usageReporters: [] as UsageReporterRegistration[],
		hostRenderStrategies: [] as HostRenderStrategy[],
		copyTargetProviders: [] as CopyTargetProvider[],
		diagnostics: [] as ExtensionDiagnostic[],
		composerShapes: new Map(),
		commands: new Map(),
		flags: new Map(),
		shortcuts: new Map(),
	};
}

/**
 * Runs an extension factory with provider registration rollback on failure.
 * Restores the complete registration queue when the factory throws because an
 * extension may unregister entries queued by an earlier extension.
 */
async function runExtensionFactory(
	factory: ExtensionFactory,
	api: ExtensionAPI,
	runtime: IExtensionRuntime,
): Promise<void> {
	const providerRegistrationCheckpoint = [...runtime.pendingProviderRegistrations];

	try {
		await factory(api);
	} catch (error) {
		runtime.pendingProviderRegistrations.splice(
			0,
			runtime.pendingProviderRegistrations.length,
			...providerRegistrationCheckpoint,
		);
		throw error;
	}
}

async function importExtensionModule(extensionPath: string, cwd: string): Promise<PreparedExtension> {
	const resolvedPath = resolvePath(extensionPath, cwd);
	try {
		const module = (await withHostGuard(() => loadLegacyPiModule(resolvedPath))) as LoadedExtensionModule;
		const factory = getExtensionFactory(module);

		if (typeof factory !== "function") {
			return {
				path: extensionPath,
				factory: null,
				resolvedPath,
				error: `Extension does not export a valid factory function: ${extensionPath}`,
			};
		}

		return { path: extensionPath, factory, resolvedPath, error: null };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { path: extensionPath, factory: null, resolvedPath, error: `Failed to load extension: ${message}` };
	}
}

async function bindExtension(
	extensionPath: string,
	imported: PreparedExtension,
	cwd: string,
	eventBus: EventBus,
	runtime: IExtensionRuntime,
): Promise<{ extension: Extension | null; error: string | null }> {
	const factory = imported.factory;
	if (imported.error !== null || factory === null) {
		return { extension: null, error: imported.error };
	}
	try {
		const extension = createExtension(extensionPath, imported.resolvedPath);
		const api = new ConcreteExtensionAPI(PiCodingAgent, extension, runtime, cwd, eventBus);
		await withHostGuard(() => runExtensionFactory(factory, api, runtime));

		return { extension, error: null };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { extension: null, error: `Failed to load extension: ${message}` };
	}
}

/**
 * Create an Extension from an inline factory function.
 */
/** Format ids become filenames, so no separators, dots or whitespace. */
const OUTPUT_FORMAT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const OUTPUT_FORMAT_EXTENSION_PATTERN = /^\.[A-Za-z0-9]+$/;

export async function loadExtensionFromFactory(
	factory: ExtensionFactory,
	cwd: string,
	eventBus: EventBus,
	runtime: IExtensionRuntime,
	name = "<inline>",
): Promise<Extension> {
	const extension = createExtension(name, name);
	const api = new ConcreteExtensionAPI(PiCodingAgent, extension, runtime, cwd, eventBus);
	await runExtensionFactory(factory, api, runtime);
	return extension;
}

/**
 * Load extensions from paths.
 *
 * Module import (the dominant cold-start cost — file I/O plus module
 * evaluation) runs concurrently across extensions; factory binding then runs
 * sequentially in the original path order, so registration semantics
 * (last-wins collisions, shared runtime flag defaults) stay deterministic.
 */
export async function loadExtensions(paths: string[], cwd: string, eventBus?: EventBus): Promise<LoadExtensionsResult> {
	const preparedExtensions = await Promise.all(paths.map(extPath => importExtensionModule(extPath, cwd)));
	return bindPreparedExtensions(preparedExtensions, cwd, eventBus);
}

/** Bind previously imported extension factories to a fresh session runtime. */
export async function bindPreparedExtensions(
	preparedExtensions: readonly PreparedExtension[],
	cwd: string,
	eventBus?: EventBus,
): Promise<LoadExtensionsResult> {
	const extensions: Extension[] = [];
	const errors: Array<{ path: string; error: string }> = [];
	const resolvedEventBus = eventBus ?? new EventBus();
	const runtime = new ExtensionRuntime();
	// Two extensions sharing a path would make every path-keyed lookup ambiguous —
	// and those lookups are what SUSPEND and UNLOAD use to decide what belongs to
	// an extension, so one extension's teardown would reach another's handlers,
	// timers and providers. Refuse the second rather than load an ambiguous pair.
	const seenPaths = new Set<string>();

	for (const prepared of preparedExtensions) {
		if (seenPaths.has(prepared.path)) {
			errors.push({ path: prepared.path, error: "Duplicate extension path: already loaded in this session" });
			continue;
		}
		const { extension, error } = await bindExtension(prepared.path, prepared, cwd, resolvedEventBus, runtime);

		if (error) {
			errors.push({ path: prepared.path, error });
			continue;
		}

		if (extension) {
			seenPaths.add(extension.path);
			extensions.push(extension);
		}
	}

	return {
		extensions,
		errors,
		runtime,
		preparedExtensions: [...preparedExtensions],
	};
}

function isExtensionFile(name: string): boolean {
	return name.endsWith(".ts") || name.endsWith(".js");
}

const CONFIGURED_EXTENSION_DIRECTORY_OPTIONS = {
	indexNames: ["index.ts", "index.js"],
	isScanFile: isExtensionFile,
	throwUnexpectedStatErrors: true,
	onReadError: (filePath: string, error: unknown) => {
		logger.warn("Failed to resolve extension directory", { path: filePath, error: String(error) });
	},
};

async function discoverHooksInPackageRoot(root: string): Promise<string[]> {
	const hooks: string[] = [];
	for (const hookType of ["pre", "post"]) {
		const hookDir = path.join(root, "hooks", hookType);
		let entries: fs1.Dirent[];
		try {
			entries = await fs.readdir(hookDir, { withFileTypes: true });
		} catch (err) {
			if (isEnoent(err) || isEacces(err) || hasFsCode(err, "ENOTDIR") || hasFsCode(err, "EPERM")) continue;
			throw err;
		}
		for (const entry of entries) {
			if ((entry.isFile() || entry.isSymbolicLink()) && isExtensionFile(entry.name)) {
				hooks.push(path.join(hookDir, entry.name));
			}
		}
	}
	return hooks;
}

/**
 * Discover absolute paths of extensions to load, without importing or
 * binding factories. Hot path on session startup — the scan walks native
 * `.omp`/`.pi` extension capabilities, JS/TS hook factories, the
 * installed-plugin tree, and any configured paths.
 *
 * The root session imports these paths once and forwards prepared factories to
 * subagents. Each child rebinds fresh Extension instances to its OWN
 * ExtensionAPI (cwd, eventBus, runtime) without re-evaluating the module graph.
 */
export interface DiscoverExtensionPathOptions {
	/** Include ambient native extensions, hooks, and installed plugins. */
	ambient?: boolean;
	/** Include ambient hook factories. Disable for read-only catalog commands. */
	includeAmbientHooks?: boolean;
}

export async function discoverExtensionPaths(
	configuredPaths: string[],
	cwd: string,
	disabledExtensionIds?: string[],
	options: DiscoverExtensionPathOptions = {},
): Promise<string[]> {
	const allPaths: string[] = [];
	const seen = new Set<string>();
	const disabled = new Set(disabledExtensionIds ?? []);
	const loadOptions = disabledExtensionIds ? { cwd, disabledExtensions: disabledExtensionIds } : { cwd };

	const isDisabledName = (name: string): boolean => disabled.has(`extension-module:${name}`);

	const addPath = (extPath: string): void => {
		const resolved = path.resolve(extPath);
		if (!seen.has(resolved)) {
			seen.add(resolved);
			allPaths.push(extPath);
		}
	};

	const addPaths = (paths: string[]) => {
		for (const extPath of paths) {
			if (isDisabledName(getExtensionNameFromPath(extPath))) continue;
			addPath(extPath);
		}
	};

	const ambient = options.ambient !== false;
	if (ambient) {
		// 1. Discover extension modules via capability API (native .omp/.pi only).
		// Scope the load to the native provider — the extension-module capability
		// also has claude/codex/gemini/opencode providers, and their items were
		// discarded here anyway (see #4198). The provider filter skips the walk
		// entirely instead of running four foreign directory scans and dropping
		// the results.
		const discovered = await loadCapability<ExtensionModule>(extensionModuleCapability.id, {
			...loadOptions,
			providers: ["native"],
		});
		for (const ext of discovered.items) {
			addPath(ext.path);
		}
	}

	// 2. Discover JS/TS hook factories and bind them through the extension
	// runner, which owns the current runtime event bus. Non-ambient discovery
	// scans only this invocation's configured package roots; it must not consult
	// settings, installed packages, or process-global CLI injection state.
	if (ambient) {
		if (options.includeAmbientHooks !== false) {
			const hooks = await loadCapability<Hook>(hookCapability.id, loadOptions);
			// Trust gate. A hook whose file changed after its content was recorded
			// does not load, and says so rather than vanishing — the alternative is
			// edited code running at the privilege the user approved for different
			// code. First sight records the hash instead of blocking, so hooks that
			// already exist keep working across an upgrade; see ../hooks/trust.
			let recordedAny = false;
			for (const hook of hooks.items) {
				if (!isExtensionFile(path.basename(hook.path))) continue;
				const key = hookTrustKey(hook);
				const hash = await hookContentHash(hook);
				const recorded = recordedHookHash(key);
				if (recorded !== undefined && hookTrustStatus(recorded, hash) === "modified") {
					logger.warn(hookModifiedMessage(hook, recorded));
					continue;
				}
				if (recordHookHash(key, hash)) recordedAny = true;
				addPath(hook.path);
			}
			// One flush for the whole scan, and only when something was newly
			// recorded — the steady state must not rewrite the user's config on every
			// load. The flush is not redundant even though `Settings.set` debounces
			// its own write: a process that exits before that timer fires would
			// leave the record unwritten, and the next run would be first sight
			// again. That window is closed here by argument; the test covers the
			// behaviour, not the window.
			if (recordedAny) await settings.flush();
		}
	} else {
		for (const configuredPath of configuredPaths) {
			addPaths(await discoverHooksInPackageRoot(resolvePath(configuredPath, cwd)));
		}
	}

	// 3. Discover extension entry points from installed plugins.
	if (ambient) {
		addPaths(await getAllPluginExtensionPaths(cwd));
	}

	// 4. Explicitly configured paths
	for (const configuredPath of configuredPaths) {
		const resolved = resolvePath(configuredPath, cwd);

		let stat: fs1.Stats | null = null;
		try {
			stat = await fs.stat(resolved);
		} catch (err) {
			if (!isEnoent(err)) throw err;
		}

		if (stat?.isDirectory()) {
			addPaths(resolveExtensionDirectory(resolved, CONFIGURED_EXTENSION_DIRECTORY_OPTIONS).files);
			continue;
		}

		addPath(resolved);
	}

	// Deterministic load order.
	//
	// `allPaths` accumulates in discovery order, which is raw-`readdir` order for
	// ambient/configured scans and I/O-completion order for the linked-module branch
	// -- both filesystem-dependent. Registration is last-extension-wins (see
	// ExtensionRunner#getRegisteredTool), so that order IS user-visible behavior:
	// without this, which extension wins a contested tool name changes from machine
	// to machine with no signal at all.
	//
	// Sorted once, here, after dedup and after all four discovery branches, so every
	// branch contributes to a single order. Code-unit order, deliberately not
	// localeCompare: the winner must not depend on the host's locale.
	allPaths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
	return allPaths;
}

/**
 * Discover and load extensions from standard locations. Composed of
 * {@link discoverExtensionPaths} (FS scan) + {@link loadExtensions}
 * (per-session binding).
 */
export async function discoverAndLoadExtensions(
	configuredPaths: string[],
	cwd: string,
	eventBus?: EventBus,
	disabledExtensionIds?: string[],
	options: DiscoverExtensionPathOptions = {},
): Promise<LoadExtensionsResult> {
	const paths = await discoverExtensionPaths(configuredPaths, cwd, disabledExtensionIds, options);
	return loadExtensions(paths, cwd, eventBus);
}
