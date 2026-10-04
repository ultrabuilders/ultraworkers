import { isRecord, stringProperty } from "@oh-my-pi/pi-utils";
import { resolveToCwd } from "../tools/path-utils";
import type { ClientBridgePermissionOption } from "./client-bridge";
import { canonicalizeApprovalKey, getEditDestructiveIntent } from "../tools/approval";
// Re-exported, not merely imported: this is where the ACP gate, its tests, and
// anything reading the gate's public surface have always found it, and moving the
// implementation down a layer is not a reason to move its address too. `wrapper.ts`
// imports it from `tools/approval` directly, which is what keeps `extensibility`
// from depending on `session`.
export { canonicalizeApprovalKey };

/** Tools that require user permission before execution when an ACP client is connected. */
export const PERMISSION_REQUIRED_TOOLS: Record<string, true> = {
	bash: true,
	edit: true,
	delete: true,
	move: true,
};

/** Permission options presented to the client on each gated tool call. */
export const PERMISSION_OPTIONS: ClientBridgePermissionOption[] = [
	{ optionId: "allow_once", name: "Allow once", kind: "allow_once" },
	{ optionId: "allow_always", name: "Always allow", kind: "allow_always" },
	{ optionId: "reject_once", name: "Reject", kind: "reject_once" },
	{ optionId: "reject_always", name: "Always reject", kind: "reject_always" },
];

/** Permission options indexed by their wire identifiers; unknown IDs miss and fail closed. */
export const PERMISSION_OPTIONS_BY_ID = new Map(PERMISSION_OPTIONS.map(option => [option.optionId, option]));

/**
 * The scope, in the words the user reads before choosing "always".
 *
 * A narrower key is worthless while the button still reads "Always allow": the
 * grant gets smaller and the user is none the wiser. So this string goes into the
 * option label, and it names the same thing the key does.
 *
 * ## The fallback branch
 *
 * `canonicalizeApprovalKey` keys an unrecognised tool on its whole argument
 * payload, so two calls differing in any argument are two different grants.
 * Saying `every <tool> call` about that is not rounding: it describes a grant an
 * order of magnitude wider than the one the user is about to get, and it breaks
 * the contract this function states for itself.
 *
 * So the fallback names the payload. It keeps `every <tool> call` for the one
 * case where that is true — a call with nothing to tell apart, where every call
 * really does share one key.
 *
 * When the readable part is cut, a short digest goes with it. Truncation is the
 * one way two genuinely different payloads can read alike, and a label that
 * cannot tell two scopes apart is the defect this branch exists to remove,
 * reintroduced one character earlier.
 */
export function describeApprovalScope(toolName: string, args: unknown): string {
	const input = isRecord(args) ? args : {};
	if (toolName === "bash") {
		const command = stringProperty(input, "command");
		const squeezed = command?.replace(/\s+/g, " ").trim();
		return squeezed ? squeezed.slice(0, 60) : toolName;
	}
	if (toolName === "delete") {
		const filePath = stringProperty(input, "path");
		return filePath ? `delete ${filePath}` : toolName;
	}
	if (toolName === "move") {
		const from = stringProperty(input, "oldPath") ?? stringProperty(input, "path") ?? stringProperty(input, "from");
		const to =
			stringProperty(input, "newPath") ?? stringProperty(input, "to") ?? stringProperty(input, "destination");
		if (from && to) return `move ${from} to ${to}`;
		return from ? `move ${from}` : toolName;
	}
	if (toolName === "edit") {
		const intent = getEditDestructiveIntent(args);
		return intent ? `every ${intent.kind} in an edit` : toolName;
	}
	return describeUnrecognizedToolScope(toolName, args);
}
/** How much of an unrecognised tool's payload the label shows before it stops. */
const SCOPE_SUMMARY_LIMIT = 60;

/**
 * Name the scope of a tool with no branch above, from the payload its key hashes.
 *
 * Every call of such a tool that shares a payload shares a grant, and every call
 * with a different payload is a separate grant — so the label has to distinguish
 * exactly as the key does, and in the same direction: never wider.
 */
function describeUnrecognizedToolScope(toolName: string, args: unknown): string {
	if (!isRecord(args)) return `every ${toolName} call`;
	// Rendered in insertion order, which is the order `JSON.stringify` hands the
	// key's hash, so the summary reads the same way round as the key naming it.
	const pairs = Object.entries(args).filter(([, value]) => value !== undefined);
	if (pairs.length === 0) return `every ${toolName} call`;

	const squeeze = (text: string): string => text.replace(/\s+/g, " ").trim();
	const summary = pairs
		.map(([key, value]) => {
			const rendered = typeof value === "string" ? value : (JSON.stringify(value) ?? "");
			return `${key}=${squeeze(rendered)}`;
		})
		.join(" ");
	if (summary.length <= SCOPE_SUMMARY_LIMIT) return `${toolName} ${summary}`;

	const digest = Bun.hash
		.wyhash(JSON.stringify(args) ?? "")
		.toString(16)
		.slice(0, 8);
	return `${toolName} ${summary.slice(0, SCOPE_SUMMARY_LIMIT)}… (${digest})`;
}

/**
 * The options for one prompt, with the scope spelled out on the two that persist.
 *
 * Option ids and kinds are identical to {@link PERMISSION_OPTIONS}; only the
 * labels carry the scope, so {@link PERMISSION_OPTIONS_BY_ID} still resolves a
 * returned id to its kind unchanged.
 */
export function permissionOptions(scope: string): ClientBridgePermissionOption[] {
	return PERMISSION_OPTIONS.map(option =>
		option.kind === "allow_always" || option.kind === "reject_always"
			? { ...option, name: `${option.name} \`${scope}\` for the rest of this session` }
			: option,
	);
}

/** Describes the permission prompt required for a destructive tool call. */
export function getPermissionIntent(
	toolName: string,
	args: unknown,
): { toolName: string; title: string; paths?: string[]; cacheKey: string } | undefined {
	const input = isRecord(args) ? args : {};
	if (toolName === "bash") {
		const command = stringProperty(input, "command")?.slice(0, 80);
		return { toolName, title: command || toolName, cacheKey: canonicalizeApprovalKey(toolName, args) };
	}
	if (toolName === "delete") {
		const filePath = stringProperty(input, "path");
		return {
			toolName,
			title: filePath ? `Delete ${filePath}` : toolName,
			paths: filePath ? [filePath] : undefined,
			cacheKey: canonicalizeApprovalKey(toolName, args),
		};
	}
	if (toolName === "move") {
		const from = stringProperty(input, "oldPath") ?? stringProperty(input, "path") ?? stringProperty(input, "from");
		const to =
			stringProperty(input, "newPath") ?? stringProperty(input, "to") ?? stringProperty(input, "destination");
		if (from && to)
			return {
				toolName,
				title: `Move ${from} to ${to}`,
				paths: [from, to],
				cacheKey: canonicalizeApprovalKey(toolName, args),
			};
		return {
			toolName,
			title: from ? `Move ${from}` : toolName,
			paths: from ? [from] : undefined,
			cacheKey: canonicalizeApprovalKey(toolName, args),
		};
	}
	if (toolName === "edit") {
		const intent = getEditDestructiveIntent(args);
		if (!intent) return undefined;
		if (intent.kind === "delete") {
			return {
				toolName,
				title: `Delete ${intent.paths[0] ?? "edit target"}`,
				paths: intent.paths,
				cacheKey: canonicalizeApprovalKey(toolName, args),
			};
		}
		const from = intent.paths[0];
		const to = intent.paths[1];
		return {
			toolName,
			title: from && to ? `Move ${from} to ${to}` : `Move ${from ?? to ?? "edit target"}`,
			paths: intent.paths,
			cacheKey: canonicalizeApprovalKey(toolName, args),
		};
	}
	return undefined;
}

/** Converts tool path arguments into absolute ACP editor locations. */
export function extractPermissionLocations(
	args: unknown,
	cwd: string,
	explicitPaths?: string[],
): { path: string; line?: number }[] {
	if (!isRecord(args)) return [];
	const out: { path: string; line?: number }[] = [];
	const pushPath = (value: unknown) => {
		if (typeof value !== "string" || value.length === 0) return;
		// ACP locations carry file paths that the editor host will open or focus;
		// they must be absolute or the client cannot resolve them. Resolve raw
		// tool args (often cwd-relative) against the session cwd before sending.
		let resolved: string;
		try {
			resolved = resolveToCwd(value, cwd);
		} catch {
			return;
		}
		if (out.some(location => location.path === resolved)) return;
		out.push({ path: resolved });
	};
	if (explicitPaths) {
		for (const filePath of explicitPaths) pushPath(filePath);
		return out;
	}
	pushPath(args.path);
	pushPath(args.file);
	if (Array.isArray(args.paths)) {
		for (const filePath of args.paths) {
			if (typeof filePath === "string") pushPath(filePath);
		}
	}
	pushPath(args.oldPath);
	pushPath(args.newPath);
	pushPath(args.from);
	pushPath(args.to);
	pushPath(args.source);
	pushPath(args.destination);
	return out;
}
