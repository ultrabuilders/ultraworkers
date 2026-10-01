/**
 * Harness logic ported from `pi` (`earendil-works/pi`, MIT — see ../NOTICE).
 *
 * ## What is here, and what is not
 *
 * Copied verbatim from `pi/packages/evals/src/harness.ts`: `resolveModelSelection`,
 * `applyIsolatedEnvironment`, `verifySystemPrompt`, `resolveDocumentationVariant`,
 * `excludePiDocumentation`, and `DOCUMENTATION_EVAL_TOOLS`. The bodies are
 * unchanged — same branches, same messages, same order.
 *
 * **Not ported:** the harness runners themselves (`createPiCodingAgentHarness`,
 * `createPiDocumentationEvalHarness`, `runPiCodingAgent`). They import
 * `vitest-evals/harness` — a third-party eval framework this repository does not
 * use, running `bun:test` instead. Porting them means either vendoring that
 * framework or rewriting the runners, and rewriting is the one option the
 * programme rules out. So this file is deliberately partial, and the gap is
 * recorded here rather than left for someone to infer from a missing export.
 *
 * Two consequences worth knowing before reading the test:
 *
 * - The env var names are pi's, and that is correct here, not an oversight. `pi`
 *   reads `PI_PROVIDER` / `PI_MODEL` / `PI_EVAL_*`; omp still ships
 *   `PI_CODING_AGENT_DIR` as a live variable (`packages/utils/src/dirs.ts`), so
 *   these are omp variables too. Renaming them is a separate decision, in the same
 *   family as the scope rename — not something to settle inside a file copy.
 * - `verifySystemPrompt` takes the two fields it actually reads instead of
 *   `Pick<PiCodingAgentHarnessOptions, …>`, because that options type belongs to
 *   the unported runner. Same two fields, same order of checks.
 */
import type { DocumentationVariant } from "./plan";

export type PiCodingAgentModelSelection = {
	provider: string;
	id: string;
};

/**
 * The environment `resolveModelSelection` reads its defaults from.
 *
 * Intersected with an index signature, which is the one deviation from the copied
 * source and is forced by the type system rather than chosen: `{ PI_PROVIDER?:
 * string; PI_MODEL?: string }` on its own is a *weak* type, and TypeScript refuses
 * `process.env` as its default because a weak type must share a property with its
 * argument. Naming the two variables still documents intent; the index signature
 * is what lets the default stand.
 */
export type HarnessModelEnvironment = {
	PI_PROVIDER?: string;
	PI_MODEL?: string;
} & Record<string, string | undefined>;

/** The fields `verifySystemPrompt` reads; the rest of the options type is unported. */
export type SystemPromptExpectation = {
	name: string;
	expectedPiDocumentation?: boolean;
};

export function resolveModelSelection(
	explicitModel: PiCodingAgentModelSelection | undefined,
	environment: HarnessModelEnvironment = process.env,
): PiCodingAgentModelSelection {
	const provider = (explicitModel?.provider ?? environment.PI_PROVIDER)?.trim();
	const id = (explicitModel?.id ?? environment.PI_MODEL)?.trim();
	if (!provider || !id) {
		throw new Error("Select a harness model explicitly or set both PI_PROVIDER and PI_MODEL as defaults.");
	}
	return { provider, id };
}

export function applyIsolatedEnvironment(home: string, agentDir: string): () => void {
	const overrides = { HOME: home, USERPROFILE: home, PI_CODING_AGENT_DIR: agentDir };
	const previous = new Map<string, string | undefined>();
	for (const name of Object.keys(process.env)) {
		if (!name.startsWith("PI_EVAL_")) continue;
		previous.set(name, process.env[name]);
		delete process.env[name];
	}
	for (const [name, value] of Object.entries(overrides)) {
		if (!previous.has(name)) previous.set(name, process.env[name]);
		process.env[name] = value;
	}
	return () => {
		for (const [name, value] of previous) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	};
}

export const DOCUMENTATION_EVAL_TOOLS = ["read", "write", "edit", "grep", "find", "ls"] as const;

export function resolveDocumentationVariant(
	value: string | undefined = process.env.PI_EVAL_VARIANT,
): DocumentationVariant {
	if (value === "without_docs" || value === "with_docs") return value;
	throw new TypeError('PI_EVAL_VARIANT must be "without_docs" or "with_docs".');
}

export function excludePiDocumentation(defaultPrompt: string): string {
	const documentationStartMarker = "\n<docs>\n";
	const documentationEndMarker = "\n</docs>";
	const documentationStart = defaultPrompt.indexOf(documentationStartMarker);
	if (documentationStart === -1) throw new Error("Default Pi system prompt has no Pi documentation section.");
	const documentationEnd = defaultPrompt.indexOf(documentationEndMarker, documentationStart);
	if (documentationEnd === -1) throw new Error("Default Pi system prompt has no complete Pi documentation section.");
	const cwdStart = defaultPrompt.lastIndexOf("\n<cwd>\n");
	if (cwdStart < documentationEnd) throw new Error("Default Pi system prompt has no working-directory section.");
	return (
		defaultPrompt.slice(0, documentationStart) + defaultPrompt.slice(documentationEnd + documentationEndMarker.length)
	);
}

export function verifySystemPrompt(systemPrompt: string, options: SystemPromptExpectation): string {
	if (options.expectedPiDocumentation === undefined) return systemPrompt;
	if (!systemPrompt.includes("\n<rules>\n")) {
		throw new Error(`Pi system prompt lost its rules in the ${options.name} eval variant.`);
	}
	const hasDocumentation = systemPrompt.includes("\n<docs>\nPi documentation (read only");
	if (hasDocumentation !== options.expectedPiDocumentation) {
		throw new Error(`Pi system prompt does not match the ${options.name} eval variant.`);
	}
	return systemPrompt;
}
