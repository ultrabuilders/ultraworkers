/**
 * Collectors: turn a live session into the metadata and diagnostics halves of a
 * bug-report bundle.
 *
 * Every value that could carry a credential goes through `redact*` on the way
 * out. Settings are redacted as a whole rather than field by field, so a setting
 * added later is covered by the redaction rather than by a list that has to
 * remember it.
 */

import * as os from "node:os";
import type { Api, Effort, Model } from "@oh-my-pi/pi-ai";
import { USER_AGENT, VERSION } from "@oh-my-pi/pi-utils";
import type { RawSettings, Settings } from "../config/settings";
import type { CrashRecord } from "./crash-log";
import {
	BUG_REPORT_SCHEMA_VERSION,
	type BugReportAssistantEntry,
	type BugReportDiagnostics,
	type BugReportMetadata,
} from "./bug-report";
import { redactJsonValue, redactUrl } from "./redact";

/** Strip identity fields, then redact every remaining key that looks like a credential. */
function redactSettings(settings: RawSettings): unknown {
	const { trackingId: _trackingId, deviceId: _deviceId, ...rest } = settings;
	return redactJsonValue(rest);
}

function collectEnvironment(): Record<string, unknown> {
	const env = (name: string): string | null => process.env[name] || null;
	return {
		version: VERSION,
		userAgent: USER_AGENT,
		runtime: process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`,
		platform: process.platform,
		arch: process.arch,
		osRelease: os.release(),
		osVersion: os.version(),
		shell: process.env.SHELL?.split(/[\\/]/).pop() || null,
		terminal: {
			term: env("TERM"),
			program: env("TERM_PROGRAM"),
			programVersion: env("TERM_PROGRAM_VERSION"),
			colorterm: env("COLORTERM"),
			tmux: Boolean(process.env.TMUX),
			ssh: Boolean(process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY),
			ci: Boolean(process.env.CI),
		},
		// Names help diagnose configuration; values never leave the machine.
		ompEnvironmentVariables: Object.keys(process.env)
			.filter(name => name.startsWith("OMP_"))
			.sort(),
	};
}

function describeModel(model: Model<Api>): Record<string, unknown> {
	return {
		provider: model.provider,
		id: model.id,
		name: model.name,
		api: model.api,
		baseUrl: model.baseUrl ? redactUrl(model.baseUrl) : null,
		reasoning: model.reasoning,
		input: model.input,
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
		headerNames: Object.keys(model.headers ?? {}).sort(),
	};
}

/** Auth *shape* only: which kinds are configured and which headers are sent, never a value. */
function describeProvider(provider: {
	id: string;
	name: string;
	baseUrl?: string;
	headers?: Record<string, string>;
	auth?: { apiKey?: string; oauth?: unknown };
}): Record<string, unknown> {
	const authTypes: Array<"api_key" | "oauth"> = [];
	if (provider.auth?.apiKey) authTypes.push("api_key");
	if (provider.auth?.oauth) authTypes.push("oauth");
	return {
		id: provider.id,
		name: provider.name,
		baseUrl: provider.baseUrl ? redactUrl(provider.baseUrl) : null,
		headerNames: Object.keys(provider.headers ?? {}).sort(),
		authTypes,
	};
}

export interface CollectBugReportMetadataOptions {
	id?: string;
	hint?: string;
	sessionId: string;
	cwd: string;
	/** Mandatory, and the gate for cwd — not an advisory flag. */
	includeSession: boolean;
	includeSummary: boolean;
	messageCount: number;
	model?: Model<Api>;
	provider?: Parameters<typeof describeProvider>[0];
	/** Whether the resolved provider credential is an OAuth one. */
	usingOAuth?: boolean;
	thinkingLevel: Effort;
	extensions: ReadonlyArray<{ path: string; source?: string; scope?: string; origin?: string; hidden?: boolean }>;
	extensionErrors: ReadonlyArray<{ path: string; error: string }>;
	globalSettings: Settings;
	projectSettings: Settings;
}

export function collectBugReportMetadata(options: CollectBugReportMetadataOptions): BugReportMetadata {
	const hint = options.hint?.trim() || null;
	return {
		schemaVersion: BUG_REPORT_SCHEMA_VERSION,
		id: options.id ?? Bun.randomUUIDv7(),
		createdAt: new Date().toISOString(),
		hint,
		environment: collectEnvironment(),
		session: {
			id: options.sessionId,
			included: options.includeSession,
			summaryIncluded: options.includeSummary,
			messageCount: options.messageCount,
			// The working directory is a real disclosure, so it ships only when the
			// transcript does — not because a flag asked nicely.
			...(options.includeSession ? { cwd: options.cwd } : {}),
		},
		model: options.model ? describeModel(options.model) : null,
		provider: options.provider
			? { ...describeProvider(options.provider), usingOAuth: options.usingOAuth === true }
			: null,
		thinkingLevel: options.thinkingLevel,
		extensions: options.extensions.map(ext => ({
			path: ext.path,
			source: ext.source ? redactUrl(ext.source) : null,
			scope: ext.scope ?? null,
			origin: ext.origin ?? null,
			hidden: ext.hidden === true,
		})),
		extensionErrors: options.extensionErrors.map(({ path, error }) => ({ path, error })),
		settings: {
			global: redactSettings(options.globalSettings.getGlobalSettings()),
			project: redactSettings(options.projectSettings.getGlobalSettings()),
		},
	};
}

/** The minimal session surface this needs — a narrower contract than the whole manager. */
export interface BugReportSessionReader {
	getEntries(): ReadonlyArray<{ id: string; type: string; timestamp: number; message?: Record<string, unknown> }>;
	getSessionId(): string | undefined;
}

/**
 * Collect failed assistant turns WITHOUT collecting conversation content. A
 * diagnostic bundle that quoted the transcript would need the same opt-in a
 * transcript does; this deliberately carries only the failure facts.
 */
export function collectBugReportDiagnostics(
	sessionManager: BugReportSessionReader,
	crashes: readonly CrashRecord[] = [],
): BugReportDiagnostics {
	const entries = sessionManager.getEntries();
	const assistant: BugReportAssistantEntry[] = [];
	let assistantMessageCount = 0;
	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const message = entry.message;
		if (!message || message.role !== "assistant") continue;
		assistantMessageCount++;
		const diagnostics = (message.diagnostics ?? []) as unknown[];
		if (
			diagnostics.length === 0 &&
			message.stopReason !== "error" &&
			message.stopReason !== "aborted" &&
			!message.errorMessage
		) {
			continue;
		}
		assistant.push({
			entryId: entry.id,
			timestamp: entry.timestamp,
			provider: message.provider as string | undefined,
			model: message.model as string | undefined,
			api: message.api as string | undefined,
			stopReason: message.stopReason as string | undefined,
			...(message.rawStopReason === undefined ? {} : { rawStopReason: message.rawStopReason as string }),
			...(message.errorMessage === undefined ? {} : { errorMessage: message.errorMessage as string }),
			diagnostics,
		});
	}
	return {
		schemaVersion: BUG_REPORT_SCHEMA_VERSION,
		sessionId: sessionManager.getSessionId() ?? "",
		entryCount: entries.length,
		assistantMessageCount,
		assistant,
		// `notified` is our bookkeeping, not the user's crash — it stays out.
		crashes: crashes.map(({ notified: _notified, ...record }) => record),
	};
}
