/**
 * Workflow script parsing: the one shape that runs, and the literal-only meta header.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/workflow.ts:2011-2133` — `parseWorkflowScript`, `evaluateLiteral`,
 * `propertyKey`, `validateMeta` — and `src/workflow.ts:514` for the blocklist.
 *
 * ONE REQUIRED DEVIATION: the reference parses with `acorn`. We do not have acorn and
 * are not adding it; we use `@babel/parser`, already catalogued at `package.json:17`.
 * The eight-step logic and its ORDER are unchanged. Only the AST layer differs, and the
 * differences were measured against babel 7 rather than assumed:
 *
 * | acorn                        | @babel/parser                                  |
 * |------------------------------|------------------------------------------------|
 * | `Literal`                    | `StringLiteral`/`NumericLiteral`/`BooleanLiteral`/`NullLiteral` |
 * | `Property`                   | `ObjectProperty` (`ObjectMethod` for get/set)  |
 * | `prop.kind` is always `"init"` | `prop.kind` is `undefined` unless get/set     |
 *
 * The third row is the one that would have broken silently-but-completely: acorn always
 * sets `prop.kind`, so the reference's `prop.kind !== "init"` guard reads as a no-op
 * there. Babel omits it for a plain property, so that same guard rejects EVERY meta
 * object. Accessors arrive as `ObjectMethod`, a different node type, so the type check
 * already covers them and `kind` is only consulted as a second line of defence.
 */
import { parse } from "@babel/parser";
import { WorkflowError, WorkflowErrorCode, type WorkflowMeta, type WorkflowMetaPhase } from "../errors";

/**
 * A structurally-typed AST node. The parser's own node types differ per plugin, and
 * this file walks the tree by `type` string exactly as the reference does, so the node
 * is described by shape rather than imported one type at a time.
 */
interface AstNode {
	readonly type: string;
	readonly [key: string]: unknown;
}

function isAstNode(value: unknown): value is AstNode {
	return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

function asNodes(value: unknown): AstNode[] {
	return Array.isArray(value) ? value.filter(isAstNode) : [];
}

function field(node: AstNode, key: string): unknown {
	return node[key];
}

/**
 * Babel's literal node types, and the value each carries. `NullLiteral` has no `value`
 * field at all, so it is answered from the node type rather than read.
 */
function readLiteral(node: AstNode): { ok: true; value: unknown } | { ok: false } {
	switch (node.type) {
		case "StringLiteral":
		case "NumericLiteral":
		case "BooleanLiteral":
			return { ok: true, value: field(node, "value") };
		case "NullLiteral":
			return { ok: true, value: null };
		default:
			return { ok: false };
	}
}

// Parse-time author hint (fast feedback). The real enforcement is DETERMINISM_PRELUDE.
const DETERMINISM_BLOCKLIST = /\bDate\s*\.\s*now\b|\bMath\s*\.\s*random\b|\bnew\s+Date\s*\(\s*\)/;

function scriptError(message: string): WorkflowError {
	return new WorkflowError(message, WorkflowErrorCode.SCRIPT_VALIDATION_ERROR, { recoverable: false });
}

export function parseWorkflowScript(script: string): { meta: WorkflowMeta; body: string } {
	if (DETERMINISM_BLOCKLIST.test(script)) {
		throw scriptError("Workflow scripts must be deterministic: Date.now()/Math.random()/new Date() are unavailable");
	}

	// `allowReturnOutsideFunction` is load-bearing and easy to miss: the reference passed
	// the same option to acorn because a workflow body IS a top-level `return`. Babel
	// mirrors acorn's option surface here, so it is a top-level option and NOT a
	// plugin — `plugins: ["returnOutsideFunction"]` is accepted silently and does
	// nothing. Without it, every valid workflow — `export const meta = {...}; return
	// collect()` — fails with "'return' outside of function".
	const file = parse(script, {
		sourceType: "module",
		plugins: ["topLevelAwait"],
		allowReturnOutsideFunction: true,
	});
	const program = file.program as unknown as AstNode;
	const first = asNodes(field(program, "body"))[0];
	if (first?.type !== "ExportNamedDeclaration") {
		throw scriptError(
			"`export const meta = { name, description, phases }` must be the first statement in the script",
		);
	}

	const declaration = field(first, "declaration");
	if (!isAstNode(declaration) || declaration.type !== "VariableDeclaration" || declaration.kind !== "const") {
		throw scriptError("meta export must be `export const meta = ...`");
	}
	const declarators = asNodes(field(declaration, "declarations"));
	if (declarators.length !== 1) {
		throw scriptError("meta export must declare only `meta`");
	}

	const declarator = declarators[0];
	const id = field(declarator, "id");
	if (!isAstNode(id) || id.type !== "Identifier" || id.name !== "meta") {
		throw scriptError("meta export must declare `meta`");
	}
	const init = field(declarator, "init");
	if (!isAstNode(init)) throw scriptError("meta must have a literal value");

	const meta = evaluateLiteral(init, "meta");
	validateMeta(meta);

	const start = typeof field(first, "start") === "number" ? (field(first, "start") as number) : 0;
	const end = typeof field(first, "end") === "number" ? (field(first, "end") as number) : 0;
	return {
		meta,
		body: script.slice(0, start) + script.slice(end),
	};
}

function evaluateLiteral(node: AstNode, path: string): unknown {
	switch (node.type) {
		case "ObjectExpression": {
			const out: Record<string, unknown> = {};
			for (const prop of asNodes(field(node, "properties"))) {
				if (prop.type === "SpreadElement") throw new Error(`spread not allowed in ${path}`);
				// acorn's node type here is `Property`; babel names it `ObjectProperty`
				// and gives accessors a different type entirely (`ObjectMethod`).
				if (prop.type !== "ObjectProperty") throw new Error(`only plain properties allowed in ${path}`);
				if (prop.computed === true) throw new Error(`computed keys not allowed in ${path}`);
				if (prop.kind !== undefined || prop.method === true)
					throw new Error(`methods/accessors not allowed in ${path}`);
				const key = propertyKey(field(prop, "key"), path);
				if (key === "__proto__" || key === "constructor" || key === "prototype") {
					throw new Error(`reserved key name not allowed in ${path}: ${key}`);
				}
				const value = field(prop, "value");
				out[key] = evaluateLiteral(isAstNode(value) ? value : node, `${path}.${key}`);
			}
			return out;
		}
		case "ArrayExpression": {
			const elements = field(node, "elements");
			if (!Array.isArray(elements)) throw new Error(`non-literal node type in ${path}: ${node.type}`);
			return elements.map((element, index) => {
				if (!isAstNode(element)) throw new Error(`sparse arrays not allowed in ${path}`);
				if (element.type === "SpreadElement") throw new Error(`spread not allowed in ${path}`);
				return evaluateLiteral(element, `${path}[${index}]`);
			});
		}
		case "TemplateLiteral": {
			if (asNodes(field(node, "expressions")).length > 0)
				throw new Error(`template interpolation not allowed in ${path}`);
			return asNodes(field(node, "quasis"))
				.map(quasi => {
					const value = field(quasi, "value");
					if (!isAstNode(value)) return "";
					const cooked = field(value, "cooked");
					return typeof cooked === "string" ? cooked : String(field(value, "raw") ?? "");
				})
				.join("");
		}
		case "UnaryExpression": {
			const argument = field(node, "argument");
			if (node.operator === "-" && isAstNode(argument)) {
				const literal = readLiteral(argument);
				if (literal.ok && typeof literal.value === "number") return -literal.value;
			}
			throw new Error(`only negative-number unary allowed in ${path}`);
		}
		default: {
			const literal = readLiteral(node);
			if (literal.ok) return literal.value;
			throw new Error(`non-literal node type in ${path}: ${node.type}`);
		}
	}
}

function propertyKey(node: unknown, path: string): string {
	if (!isAstNode(node)) throw new Error(`unsupported key type in ${path}: ${typeof node}`);
	if (node.type === "Identifier" && typeof node.name === "string") return node.name;
	const literal = readLiteral(node);
	if (literal.ok && (typeof literal.value === "string" || typeof literal.value === "number")) {
		return String(literal.value);
	}
	throw new Error(`unsupported key type in ${path}: ${node.type}`);
}

function validateMeta(meta: unknown): asserts meta is WorkflowMeta {
	if (!meta || typeof meta !== "object") throw new Error("meta must be an object");
	const value = meta as WorkflowMeta;
	if (typeof value.name !== "string" || !value.name.trim()) throw new Error("meta.name must be a non-empty string");
	if (typeof value.description !== "string" || !value.description.trim())
		throw new Error("meta.description must be a non-empty string");
	if (value.model !== undefined && typeof value.model !== "string") throw new Error("meta.model must be a string");
	if (value.phases !== undefined) {
		if (!Array.isArray(value.phases)) throw new Error("meta.phases must be an array");
		for (const phase of value.phases) {
			if (!phase || typeof phase !== "object" || typeof (phase as WorkflowMetaPhase).title !== "string") {
				throw new Error("each meta phase must have a title string");
			}
		}
	}
}
