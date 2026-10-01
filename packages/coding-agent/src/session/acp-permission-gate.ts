import { editInspect } from "@oh-my-pi/pi-natives";
import { isRecord, stringProperty } from "@oh-my-pi/pi-utils";
import { resolveToCwd } from "../tools/path-utils";
import { extractFlatShellCommandSegments } from "../tools/shell-tokenize";
import type { ClientBridgePermissionOption } from "./client-bridge";

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
		if (!command) return toolName;
		const segments = extractFlatShellCommandSegments(command).map(segment => squeeze(segment.text));
		return segments.length > 0 ? `bash:${segments.join(" ; ")}` : `bash:${squeeze(command)}`;
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
	return toolName;
}

/**
 * The scope, in the words the user reads before choosing "always".
 *
 * A narrower key is worthless while the button still reads "Always allow": the
 * grant gets smaller and the user is none the wiser. So this string goes into the
 * option label, and it names the same thing the key does.
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
	return `every ${toolName} call`;
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

function getEditDestructiveIntent(args: unknown): { kind: "delete" | "move"; paths: string[] } | undefined {
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
