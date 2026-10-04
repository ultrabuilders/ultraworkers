/**
 * Tool approval resolution.
 *
 * Approval policy is declared by each tool. This module only knows how to:
 * - normalize user `tools.approval.<tool>: allow | deny | prompt` overrides,
 * - compare a tool capability tier against the active approval mode,
 * - format the generic approval prompt body.
 */
import { editInspect } from "@oh-my-pi/pi-natives";
import { isRecord, stringProperty } from "@oh-my-pi/pi-utils";
import type { AgentTool, ToolApprovalDecision, ToolTier } from "@oh-my-pi/pi-agent-core";
import { extractFlatShellCommandSegments } from "./shell-tokenize";
import type { Settings } from "../config/settings";

import { cfgToolsApproval, cfgToolsApprovalMode } from "./settings";

export type { ToolApproval, ToolApprovalDecision, ToolTier } from "@oh-my-pi/pi-agent-core";
import { declaredEffects, effectPoliciesFrom, resolveEffectFloor } from "./effects";

export type ApprovalPolicy = "allow" | "deny" | "prompt";
export type ApprovalMode = "always-ask" | "write" | "yolo";

/** The slice of `AgentToolContext` that approval resolution actually reads. */
export type ApprovalContextSource = {
	autoApprove?: boolean;
	settings?: Settings;
};

export interface ResolvedExecuteTimeApproval {
	approvalMode: ApprovalMode;
	userPolicies: Record<string, unknown>;
}

export type ApprovalSubject = Pick<AgentTool, "name" | "approval" | "formatApprovalDetails"> & {
	/**
	 * Previous public name of this tool, when a rename changed how it mints.
	 * MCP tools minted before digits were kept carry their digit-stripped name
	 * here so user `deny`/`prompt` policies written against it still apply
	 * (`allow` is deliberately not inherited — see resolveApproval).
	 */
	readonly legacyName?: string;
};

const APPROVAL_MODES: ReadonlySet<ApprovalMode> = new Set(["always-ask", "write", "yolo"]);

function isApprovalMode(value: unknown): value is ApprovalMode {
	return typeof value === "string" && APPROVAL_MODES.has(value as ApprovalMode);
}

function asPolicyMap(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

/**
 * Resolve approval mode and per-tool user policies from the execute-time
 * `AgentToolContext`.
 *
 * Missing context (or context with no settings and no `--auto-approve`) is
 * fail-closed: `always-ask` with an empty policy map — no user grant. When
 * settings are present, the configured `tools.approvalMode` is used (schema
 * default remains `yolo`). `--auto-approve` still forces `yolo`.
 *
 * Shared by `ExtensionToolWrapper.execute`, `refuseByWritePolicy`,
 * `mcpApprovalPreflight`, and eval prelude host calls so those sites cannot
 * drift. `ExtensionToolWrapper.execute` still inherits the runner's session
 * settings when the caller omits context, so a live session keeps its
 * configured (schema-default `yolo`) grant.
 */
export function resolveApprovalFromContext(context?: ApprovalContextSource | null): ResolvedExecuteTimeApproval {
	if (context?.autoApprove === true) {
		return {
			approvalMode: "yolo",
			userPolicies: context.settings ? asPolicyMap(cfgToolsApproval.get(context.settings)) : {},
		};
	}
	const settings = context?.settings;
	if (!settings) {
		return { approvalMode: "always-ask", userPolicies: {} };
	}
	const configured: unknown = cfgToolsApprovalMode.get(settings);
	return {
		approvalMode: isApprovalMode(configured) ? configured : "yolo",
		userPolicies: asPolicyMap(cfgToolsApproval.get(settings)),
	};
}

export interface ResolvedApproval {
	policy: ApprovalPolicy;
	tier: ToolTier;
	reason?: string;
	override: boolean;
	source?: "tool" | "user" | "mode";
	/** User-policy key that produced `source: "user"` (defaults to the tool name). */
	policyKey?: string;
}

const POLICY_VALUES: ReadonlySet<ApprovalPolicy> = new Set(["allow", "deny", "prompt"]);
const TIER_VALUES: ReadonlySet<ToolTier> = new Set(["read", "write", "exec"]);

/** Ordering of capability tiers, least to most privileged. */
export const TIER_RANK: Readonly<Record<ToolTier, number>> = {
	read: 0,
	write: 1,
	exec: 2,
};

/**
 * Fold the per-target decisions of a multi-target write tool (`edit`, `ast_edit`): the first
 * `policy: "deny"` decision wins with its reason (a read-only URL target); otherwise the highest
 * tier, starting from "read".
 */
export function strictestApproval(decisions: Iterable<ToolApprovalDecision>): ToolApprovalDecision {
	let tier: ToolTier = "read";
	for (const decision of decisions) {
		if (typeof decision !== "string" && decision.policy === "deny") return decision;
		const decisionTier = typeof decision === "string" ? decision : decision.tier;
		if (TIER_RANK[decisionTier] > TIER_RANK[tier]) tier = decisionTier;
	}
	return tier;
}

const APPROVAL_MODE_MAX_TIER: Record<ApprovalMode, ToolTier> = {
	"always-ask": "read",
	write: "write",
	yolo: "exec",
};

const DEFAULT_PROMPT_TRUNCATE_CHARS = 2000;

/** Best-effort conversion of an arbitrary user-supplied value to a policy. */
function normalizePolicy(value: unknown): ApprovalPolicy | undefined {
	if (typeof value !== "string") return undefined;
	const lowered = value.trim().toLowerCase();
	return POLICY_VALUES.has(lowered as ApprovalPolicy) ? (lowered as ApprovalPolicy) : undefined;
}

function isToolTier(value: unknown): value is ToolTier {
	return typeof value === "string" && TIER_VALUES.has(value as ToolTier);
}

function normalizeDecision(value: unknown): Omit<ResolvedApproval, "policy"> & { policy?: ApprovalPolicy } {
	if (isToolTier(value)) {
		return { tier: value, override: false };
	}

	if (value && typeof value === "object" && !Array.isArray(value)) {
		const record = value as Record<string, unknown>;
		const tier = isToolTier(record.tier) ? record.tier : "exec";
		const reason = typeof record.reason === "string" && record.reason.length > 0 ? record.reason : undefined;
		const policy = normalizePolicy(record.policy);
		const policyKey =
			typeof record.policyKey === "string" && record.policyKey.length > 0 ? record.policyKey : undefined;
		return {
			tier,
			override: record.override === true,
			...(policy ? { policy } : {}),
			...(reason ? { reason } : {}),
			...(policyKey ? { policyKey } : {}),
		};
	}

	return { tier: "exec", override: false };
}

function getToolDecision(
	tool: ApprovalSubject,
	args: unknown,
): Omit<ResolvedApproval, "policy"> & { policy?: ApprovalPolicy } {
	const approval = tool.approval;
	const decision: ToolApprovalDecision | undefined = typeof approval === "function" ? approval(args) : approval;
	return normalizeDecision(decision);
}

/**
 * Evaluate a tool's own approval declaration against `args` and return the
 * resulting capability tier, defaulting to `exec` when the tool omits an
 * approval. Unlike reading `tool.approval` directly, this runs function-valued
 * approvals — the write tool's `xd://` gate uses it to take a mounted device's
 * argument-dependent tier instead of falling back to `exec`.
 */
export function resolveToolTier(tool: ApprovalSubject, args: unknown): ToolTier {
	return getToolDecision(tool, args).tier;
}

function modeApprovesTier(mode: ApprovalMode, tier: ToolTier): boolean {
	return TIER_RANK[tier] <= TIER_RANK[APPROVAL_MODE_MAX_TIER[mode]];
}

/**
 * Resolve approval policy for a tool call.
 *
 * Resolution order:
 *  1. Tool `approval(args)` decision, defaulting to tier "exec" when omitted.
 *     A decision may carry a `policyKey` — `tools.approval.<policyKey>` is then
 *     the user override consulted instead of `tools.approval.<tool.name>`, with
 *     the invoking tool's own policy as the fallback when the user set none for
 *     the keyed sub-tool (e.g. an `xd://` device dispatch without a device
 *     policy still honors `tools.approval.write`).
 *  2. User per-tool override, if set and valid.
 *  3. Active mode tier comparison.
 *
 * In yolo mode, override-based tool prompts are ignored; user `tools.approval`
 * settings remain authoritative.
 */
export function resolveApproval(
	tool: ApprovalSubject,
	args: unknown,
	mode: ApprovalMode,
	userConfig: Record<string, unknown> = {},
): ResolvedApproval {
	const decision = getToolDecision(tool, args);
	// Three rungs, most specific first: a key the tool declares itself, then the
	// canonicalized *action* (`bash:git status`), then the bare tool name. The middle
	// rung is the one this fix adds.
	//
	// It exists because the writer and the reader disagreed about what a decision is
	// keyed on. `wrapper.ts` persists "Approve always" under
	// `canonicalizeApprovalKey(name, args)`, so a grant for one command landed at
	// `bash:git status` while this function looked only at `bash` and never found it —
	// the user answered "always" and was asked again on the next identical command.
	// Keying on the action narrows rather than widens, which is the safe direction: a
	// grant is for one specific action, and a tool-name policy still applies to every
	// other action through the fallback below.
	const policyKey = decision.policyKey ?? canonicalizeApprovalKey(tool.name, args);
	const userPolicy = Object.hasOwn(userConfig, policyKey) ? normalizePolicy(userConfig[policyKey]) : undefined;
	const fallbackPolicy =
		policyKey !== tool.name && userPolicy === undefined && Object.hasOwn(userConfig, tool.name)
			? normalizePolicy(userConfig[tool.name])
			: undefined;
	const effectiveUserPolicy = userPolicy ?? fallbackPolicy;
	const userPolicyKey = userPolicy !== undefined ? policyKey : tool.name;

	// Legacy-name fallback for renamed tools (e.g. MCP mints that gained digits).
	// Fail-closed: only `deny`/`prompt` carry over from the old key, so a
	// forgotten restrictive policy keeps protecting the renamed tool, while a
	// stale `allow` cannot mask a `deny` another user sets under the new name.
	const legacyPolicy =
		effectiveUserPolicy === undefined &&
		typeof tool.legacyName === "string" &&
		tool.legacyName !== tool.name &&
		Object.hasOwn(userConfig, tool.legacyName)
			? normalizePolicy(userConfig[tool.legacyName])
			: undefined;
	const inheritedPolicy = legacyPolicy === "deny" || legacyPolicy === "prompt" ? legacyPolicy : undefined;
	const inheritedPolicyKey = inheritedPolicy !== undefined ? tool.legacyName : undefined;
	const combinedUserPolicy = effectiveUserPolicy ?? inheritedPolicy;
	const combinedUserPolicyKey = effectiveUserPolicy !== undefined ? userPolicyKey : inheritedPolicyKey;

	if (decision.policy === "deny") {
		return {
			policy: "deny",
			tier: decision.tier,
			override: decision.override,
			source: "tool",
			...(decision.policyKey ? { policyKey: decision.policyKey } : {}),
			...(decision.reason ? { reason: decision.reason } : {}),
		};
	}
	if (combinedUserPolicy === "deny") {
		return {
			policy: "deny",
			tier: decision.tier,
			override: decision.override,
			source: "user",
			...(combinedUserPolicyKey ? { policyKey: combinedUserPolicyKey } : {}),
		};
	}

	// The declared-effect floor, applied ahead of the mode branch on purpose. Under
	// `yolo` everything is allowed, so a floor evaluated after this point would
	// never once apply — the one mode where a user still expects their policy to
	// hold. Effects may only narrow, so this can turn an `allow` into a `prompt` or
	// a `deny`, never the reverse.
	const effects = declaredEffects(tool.name);
	const effectFloor = resolveEffectFloor(effects, effectPoliciesFrom(userConfig));
	if (effectFloor?.policy === "deny") {
		return {
			policy: "deny",
			tier: decision.tier,
			override: false,
			source: "user",
			policyKey: `effects.${effectFloor.effect}`,
			reason: `declared effect "${effectFloor.effect}" is denied by user policy`,
		};
	}

	if (mode === "yolo") {
		// A declared effect the user asked to be prompted for survives `yolo`: the
		// whole point of declaring one is that the user gets asked anyway.
		if (effectFloor?.policy === "prompt" && !decision.policy) {
			return {
				policy: "prompt",
				tier: decision.tier,
				override: false,
				source: "user",
				policyKey: `effects.${effectFloor.effect}`,
				reason: `declared effect "${effectFloor.effect}" requires approval`,
			};
		}
		if (decision.policy) {
			return {
				policy: decision.policy,
				tier: decision.tier,
				override: false,
				source: "tool",
				...(decision.policyKey ? { policyKey: decision.policyKey } : {}),
				...(decision.reason ? { reason: decision.reason } : {}),
			};
		}
		return {
			policy: combinedUserPolicy ?? "allow",
			tier: decision.tier,
			override: false,
			source: combinedUserPolicy ? "user" : "mode",
			...(combinedUserPolicyKey ? { policyKey: combinedUserPolicyKey } : {}),
		};
	}

	if (decision.override) {
		return {
			policy: decision.policy === "allow" ? "allow" : "prompt",
			tier: decision.tier,
			override: true,
			source: "tool",
			...(decision.policyKey ? { policyKey: decision.policyKey } : {}),
			...(decision.reason ? { reason: decision.reason } : {}),
		};
	}

	if (decision.policy === "allow" || decision.policy === "prompt") {
		return {
			policy: decision.policy,
			tier: decision.tier,
			override: false,
			source: "tool",
			...(decision.policyKey ? { policyKey: decision.policyKey } : {}),
			...(decision.reason ? { reason: decision.reason } : {}),
		};
	}

	if (combinedUserPolicy) {
		return {
			policy: combinedUserPolicy,
			tier: decision.tier,
			override: false,
			source: "user",
			...(combinedUserPolicyKey ? { policyKey: combinedUserPolicyKey } : {}),
		};
	}

	if (modeApprovesTier(mode, decision.tier)) {
		return { policy: "allow", tier: decision.tier, override: false, source: "mode" };
	}

	return {
		policy: "prompt",
		tier: decision.tier,
		override: false,
		source: "mode",
		...(decision.reason ? { reason: decision.reason } : {}),
	};
}

/**
 * Error for a resolved deny. Distinguishes tool-owned policy from user config.
 */
export function denyError(resolved: ResolvedApproval, toolName: string): Error {
	const { source, reason, policyKey } = resolved;
	if (source === "tool") {
		return new Error(`Tool "${toolName}" is blocked by tool policy.${reason ? `\nReason: ${reason}` : ""}`);
	}
	return new Error(
		`Tool "${policyKey ?? toolName}" is blocked by user policy.\n` +
			`To allow: remove "tools.approval.${policyKey ?? toolName}: deny" from config.`,
	);
}

/**
 * Check if a tool call requires user approval.
 *
 * @throws Error if policy is 'deny'
 * @returns Object with required flag and optional reason for the prompt
 */
export function requiresApproval(
	tool: ApprovalSubject,
	args: unknown,
	mode: ApprovalMode,
	userConfig: Record<string, unknown> = {},
): { required: boolean; reason?: string } {
	const resolved = resolveApproval(tool, args, mode, userConfig);
	const { policy, reason } = resolved;

	if (policy === "deny") {
		throw denyError(resolved, tool.name);
	}

	if (policy === "prompt") return { required: true, reason };
	return { required: false };
}

export function truncateForPrompt(value: string, maxChars = DEFAULT_PROMPT_TRUNCATE_CHARS): string {
	if (value.length <= maxChars) return value;
	const omitted = value.length - maxChars;
	return `${value.slice(0, maxChars)}[…${omitted}ch elided…]`;
}

/**
 * Format the approval prompt body shown to the user.
 */
export function formatApprovalPrompt(tool: ApprovalSubject, args: unknown, reason?: string): string {
	const lines = [`Allow tool: ${tool.name}`];

	if (tool.name.startsWith("mcp__") && tool.approval === undefined) {
		lines.push("Origin: MCP server tool");
	}

	if (reason) {
		lines.push(`Reason: ${reason}`);
	}

	const details = tool.formatApprovalDetails?.(args);
	if (typeof details === "string") {
		if (details.length > 0) lines.push(details);
	} else if (Array.isArray(details)) {
		for (const detail of details) {
			if (detail.length > 0) lines.push(detail);
		}
	}

	return lines.join("\n");
}

/**
 * What an "always" decision is remembered against.
 *
 * ## Why this exists
 *
 * The key used to be the tool's name. So "Always allow" on one `bash` call granted
 * every later `bash` call for the rest of the session — a user who approved
 * `git status` had also approved `rm -rf ./build`, and nothing on screen said so.
 * The decision set is unchanged; only what it is remembered against changed.
 *
 * ## What it keys on
 *
 * The canonicalized *action*, per tool:
 *
 * - `bash` — the parsed command segments, rejoined. Splitting with the shell
 *   tokenizer that `bash-interceptor` already uses means quoting and operators are
 *   read the way the shell reads them, rather than by a second regex that would
 *   disagree with the first one on exactly the inputs that matter.
 * - `delete` / `move` — the path, lexically normalized.
 * - `edit` — which destructive operation was detected, since one edit payload can
 *   carry both.
 *
 * Paths are normalized lexically, not through `realpath`, because this runs on the
 * synchronous path that builds the permission prompt and has no session cwd to
 * resolve against. The consequence is honest and small: two spellings of one file
 * that differ by a symlink ask twice. Asking twice is the safe direction; the
 * alternative is a key that resolves against a cwd this function does not have.
 *
 * `allow_always` and `reject_always` deliberately share this key. Splitting them
 * would make a permanently rejected action prompt again, which is the opposite of
 * what the user chose.
 */
export function canonicalizeApprovalKey(toolName: string, args: unknown): string {
	const input = isRecord(args) ? args : {};
	// Whitespace runs are collapsed so a re-indented command is recognised as the
	// same action, while every character that can change what the shell does is
	// kept verbatim.
	const squeeze = (text: string): string => text.replace(/\s+/g, " ").trim();

	if (toolName === "bash") {
		const command = stringProperty(input, "command");
		// No command means there is nothing to canonicalize from, so it deliberately
		// falls through to the digest below rather than sharing the bare tool name.
		if (command) {
			const segments = extractFlatShellCommandSegments(command).map(segment => squeeze(segment.text));
			return segments.length > 0 ? `bash:${segments.join(" ; ")}` : `bash:${squeeze(command)}`;
		}
	}
	if (toolName === "delete") {
		const filePath = stringProperty(input, "path");
		return filePath ? `delete:${squeeze(filePath)}` : toolName;
	}
	if (toolName === "move") {
		const from = stringProperty(input, "oldPath") ?? stringProperty(input, "path") ?? stringProperty(input, "from");
		const to =
			stringProperty(input, "newPath") ?? stringProperty(input, "to") ?? stringProperty(input, "destination");
		if (from && to) return `move:${squeeze(from)}->${squeeze(to)}`;
		return from ? `move:${squeeze(from)}` : toolName;
	}
	if (toolName === "edit") {
		const intent = getEditDestructiveIntent(args);
		return intent ? `edit:${intent.kind}` : toolName;
	}
	// A tool this function does not know how to canonicalize. Falling back to the
	// tool name here would quietly restore exactly the bug this function exists to
	// remove, and it would restore silently: the day a fifth gated tool is added to
	// `getPermissionIntent` and its author forgets a branch here, every one of its
	// calls shares one grant again, and no test goes red.
	//
	// So an unrecognised tool keys on its whole argument payload. It cannot know
	// which parts of that payload constitute the action, so it uses all of them —
	// which can only ever narrow, never widen. Narrowing costs the user a repeat
	// question; widening costs them a grant they never gave.
	return `${toolName}:${Bun.hash.wyhash(JSON.stringify(args) ?? "").toString(16)}`;
}

/**
 * Which destructive operation an `edit` payload carries, if any.
 *
 * Lives in `tools/approval.ts` because `canonicalizeApprovalKey` keys an `edit` call on
 * its answer, and the extension tool wrapper keys on that too — so both callers
 * belong below the session layer that this used to sit in.
 */
export function getEditDestructiveIntent(args: unknown): { kind: "delete" | "move"; paths: string[] } | undefined {
	if (!isRecord(args)) return undefined;

	const argsJson = JSON.stringify(args);
	const modes = Array.isArray(args.edits) ? ["patch"] : ["hashline", "apply_patch"];
	for (const mode of modes) {
		try {
			const fileOps = editInspect(mode, argsJson).fileOps;
			const op =
				fileOps.find(candidate => candidate.kind === "delete") ??
				fileOps.find(candidate => candidate.kind === "move");
			if (!op || (op.kind !== "delete" && op.kind !== "move")) continue;
			const paths = op.kind === "move" && op.to ? [op.path, op.to] : [op.path];
			return { kind: op.kind, paths };
		} catch {
			// The payload does not use this edit mode's syntax.
		}
	}

	return undefined;
}
