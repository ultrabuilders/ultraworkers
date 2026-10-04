/**
 * The capability contract: the API-export layer that lets an owner swap every workflow
 * capability without the engine changing.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/workflow-capability-contract.ts`:
 *   - `:113-132` `WorkflowRuntimeImplementations`   — the 18 runtime globals, typed `unknown`
 *   - `:107-110` `RuntimeBindingAssembly`            — globals + non-fatal diagnostics
 *   - `:146-149` `AlignmentEvidence`                 — what drift is diagnosed against
 *   - `:92-101` `CapabilityDiagnostic`               — the four drift codes
 *   - `:698-742` `diagnoseAlignment`                 — verbatim
 *   - `:743-760` `assembleRuntimeBindings`           — verbatim
 *   - `:839-845` `deepFreeze`                        — verbatim
 *   - `src/enums.ts:34-38` `DiagnosticSeverity`
 *   - `:317-490` the 18 `runtimeGlobal(...)` bindings — reduced to their binding triples
 *
 * ## What was cut, and why it is safe to cut
 *
 * The reference builds each runtime global from a `CapabilityDescriptor` carrying
 * classification, support level, discovery placement, signature, option shape, constraints,
 * behaviour evidence, and static/dynamic reference anchors. Measured at `:284-288`, every one
 * of them resolves to the same identity pair:
 *
 *     runtimeBinding: { global: name, implementation: name, ...(allowsUndefined && {allowsUndefined}) }
 *
 * so `global === implementation` for all 18, and the ~330 LOC of descriptor metadata feeds only
 * two consumers: `projectStaticReferenceFacts()` (which renders markdown for a skill system we
 * do not use) and `validateDefinition()` (which checks the metadata for internal consistency —
 * duplicate ids, dangling option-shape references — none of which exists once the metadata is
 * gone). The plan's keep/cut ledger cuts both. What survives is the binding table the runtime
 * actually reads, which is why this file is ~180 lines rather than ~848.
 *
 * The consequence worth stating plainly: `INVALID_CAPABILITY_DEFINITION` is **absent** from the
 * `CapabilityDiagnostic` code union, because with no descriptors there is no definition to be
 * invalid. Re-adding the descriptor layer means re-adding that code with it.
 */
import { WorkflowCapabilityContractError } from "../errors";

/** How serious a disagreement between the contract and an observed surface is. */
export enum DiagnosticSeverity {
	ERROR = "error",
	WARNING = "warning",
	INFORMATION = "information",
}

/**
 * Machine-readable disagreement between the contract and an observed surface.
 *
 * `INVALID_CAPABILITY_DEFINITION` is not among these codes — see the file docblock. The
 * remaining four are the ones a caller can actually hit: two about implementations that were
 * supplied against the declared table, two about globals observed in an assembled context.
 */
export interface CapabilityDiagnostic {
	code:
		| "MISSING_RUNTIME_IMPLEMENTATION"
		| "UNDECLARED_RUNTIME_IMPLEMENTATION"
		| "DECLARED_GLOBAL_UNOBSERVED"
		| "OBSERVED_GLOBAL_UNDECLARED";
	severity: DiagnosticSeverity;
	subject: string;
	message: string;
}

/** Runtime globals assembled from declared implementations plus non-fatal diagnostics. */
export interface RuntimeBindingAssembly {
	globals: Readonly<Record<string, unknown>>;
	diagnostics: readonly CapabilityDiagnostic[];
}

/**
 * Project-owned implementations required to assemble the workflow VM context.
 *
 * `unknown`, not concrete types, and that is the crux of the whole design rather than a
 * shortcut. The contract does not constrain the implementation: an owner may pass `agent` as
 * their own function, as a wrapper around a subagent runner, or as a queue, and the engine
 * does not change by a single line. Typing these concretely would turn an API-export layer
 * back into a fixed engine.
 *
 * ## The index signature is a copy deviation
 *
 * The reference has no index signature here, and does not need one: it only ever uses this
 * type through `satisfies` on a bare literal (`:1798`), so nothing is ever annotated as the
 * interface and nothing tries to pass it to `assembleRuntimeBindings`. We DO annotate — the
 * `runWorkflowScript` parameter is the public seam an owner's implementation arrives at.
 *
 * Measured against tsgo, an interface with no index signature is not assignable to
 * `Readonly<Record<string, unknown>>` ("Index signature for type 'string' is missing"), while
 * the same interface WITH one is. So the deviation is required by the annotation, not chosen.
 * It is also the more honest type: `assembleRuntimeBindings` deliberately accepts extra keys and
 * reports them as `UNDECLARED_RUNTIME_IMPLEMENTATION`, and without the index signature a caller
 * could not hand it one to be diagnosed. The 18 named fields stay required — the signature
 * widens what may be supplied, it does not make any field optional.
 */
export interface WorkflowRuntimeImplementations {
	[key: string]: unknown;
	agent: unknown;
	parallel: unknown;
	pipeline: unknown;
	workflow: unknown;
	verify: unknown;
	judgePanel: unknown;
	loopUntilDry: unknown;
	completenessCheck: unknown;
	retry: unknown;
	gate: unknown;
	checkpoint: unknown;
	log: unknown;
	phase: unknown;
	args: unknown;
	cwd: unknown;
	process: unknown;
	budget: unknown;
	console: unknown;
}

/** Runtime implementations or observed globals used for drift diagnostics. */
export interface AlignmentEvidence {
	suppliedImplementations?: Readonly<Record<string, unknown>>;
	observedProjectGlobals?: readonly string[];
}

/** One declared global and the implementation key it is assembled from. */
export interface WorkflowRuntimeBinding {
	global: string;
	implementation: string;
	/** `args` is the sole global that may be absent from a supplied set. */
	allowsUndefined?: true;
}

/**
 * The 18 declared runtime globals, in the reference's declaration order.
 *
 * Counted, not eyeballed: the reference's `WorkflowRuntimeImplementations` has 18 fields and
 * the file declares exactly 18 `runtimeGlobal(...)` calls naming the same 18 globals in the
 * same order. (The plan's prose says "19 globals" in two places; both independent counts say
 * 18, and 18 is what ships.)
 *
 * `args` is the only binding carrying `allowsUndefined`, so it is the only global an owner may
 * omit — everything else must be supplied or assembly throws.
 */
export const RUNTIME_BINDINGS: readonly WorkflowRuntimeBinding[] = [
	{ global: "agent", implementation: "agent" },
	{ global: "parallel", implementation: "parallel" },
	{ global: "pipeline", implementation: "pipeline" },
	{ global: "workflow", implementation: "workflow" },
	{ global: "verify", implementation: "verify" },
	{ global: "judgePanel", implementation: "judgePanel" },
	{ global: "loopUntilDry", implementation: "loopUntilDry" },
	{ global: "completenessCheck", implementation: "completenessCheck" },
	{ global: "retry", implementation: "retry" },
	{ global: "gate", implementation: "gate" },
	{ global: "checkpoint", implementation: "checkpoint" },
	{ global: "log", implementation: "log" },
	{ global: "phase", implementation: "phase" },
	{ global: "args", implementation: "args", allowsUndefined: true },
	{ global: "cwd", implementation: "cwd" },
	{ global: "process", implementation: "process" },
	{ global: "budget", implementation: "budget" },
	{ global: "console", implementation: "console" },
] as const;

/** Every declared global name, for callers that need the count or the list. */
export const DECLARED_GLOBALS: readonly string[] = RUNTIME_BINDINGS.map(binding => binding.global);

/**
 * Freeze an installed table so a caller cannot mutate the contract out from under the engine
 * after the fact. Copied verbatim from the reference's `deepFreeze` (`:839-845`).
 */
function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
		for (const nested of Object.values(value)) deepFreeze(nested);
		Object.freeze(value);
	}
	return value;
}

/** An installed capability contract over one declared binding table. */
export interface WorkflowCapabilityContract {
	readonly bindings: readonly WorkflowRuntimeBinding[];
	assembleRuntimeBindings(implementations: Readonly<Record<string, unknown>>): RuntimeBindingAssembly;
	diagnoseAlignment(evidence: AlignmentEvidence): readonly CapabilityDiagnostic[];
}

/**
 * Build a contract over `bindings`.
 *
 * The reference validates the descriptor metadata before installing (`:683-687`); with the
 * metadata cut there is nothing left to validate, so this starts from the frozen table. The
 * `diagnoseAlignment` and `assembleRuntimeBindings` bodies below are the reference's, unchanged.
 */
export function defineWorkflowCapabilityContract(
	bindings: readonly WorkflowRuntimeBinding[],
): WorkflowCapabilityContract {
	deepFreeze(bindings);
	const implementations = new Set(bindings.map(binding => binding.implementation));
	const globals = new Set(bindings.map(binding => binding.global));

	const diagnoseAlignment = (evidence: AlignmentEvidence): readonly CapabilityDiagnostic[] => {
		const diagnostics: CapabilityDiagnostic[] = [];
		if (evidence.suppliedImplementations) {
			for (const binding of bindings) {
				if (
					!Object.hasOwn(evidence.suppliedImplementations, binding.implementation) ||
					(evidence.suppliedImplementations[binding.implementation] === undefined && !binding.allowsUndefined)
				) {
					diagnostics.push({
						code: "MISSING_RUNTIME_IMPLEMENTATION",
						severity: DiagnosticSeverity.ERROR,
						subject: binding.implementation,
						message: `Declared workflow global "${binding.global}" has no supplied implementation "${binding.implementation}".`,
					});
				}
			}
			for (const name of Object.keys(evidence.suppliedImplementations)) {
				if (!implementations.has(name)) {
					diagnostics.push({
						code: "UNDECLARED_RUNTIME_IMPLEMENTATION",
						severity: DiagnosticSeverity.WARNING,
						subject: name,
						message: `Supplied runtime implementation "${name}" is undeclared and was ignored.`,
					});
				}
			}
		}
		if (evidence.observedProjectGlobals) {
			const observed = new Set(evidence.observedProjectGlobals);
			for (const name of globals) {
				if (!observed.has(name)) {
					diagnostics.push({
						code: "DECLARED_GLOBAL_UNOBSERVED",
						severity: DiagnosticSeverity.ERROR,
						subject: name,
						message: `Declared workflow global "${name}" was not observed in the assembled context.`,
					});
				}
			}
			for (const name of observed) {
				if (!globals.has(name)) {
					diagnostics.push({
						code: "OBSERVED_GLOBAL_UNDECLARED",
						severity: DiagnosticSeverity.ERROR,
						subject: name,
						message: `Observed project-owned workflow global "${name}" is undeclared.`,
					});
				}
			}
		}
		return diagnostics;
	};

	return {
		bindings,
		assembleRuntimeBindings(supplied) {
			const diagnostics = diagnoseAlignment({ suppliedImplementations: supplied });
			const missing = diagnostics.filter(diagnostic => diagnostic.code === "MISSING_RUNTIME_IMPLEMENTATION");
			if (missing.length > 0) {
				throw new WorkflowCapabilityContractError(
					`missing declared runtime implementation: ${missing.map(diagnostic => diagnostic.subject).join(", ")}`,
					diagnostics,
				);
			}
			const assembled: Record<string, unknown> = {};
			for (const binding of bindings) assembled[binding.global] = supplied[binding.implementation];
			return { globals: assembled, diagnostics };
		},
		diagnoseAlignment,
	};
}

/** Installed validated workflow capability contract. */
export const WORKFLOW_CAPABILITY_CONTRACT = defineWorkflowCapabilityContract(RUNTIME_BINDINGS);
