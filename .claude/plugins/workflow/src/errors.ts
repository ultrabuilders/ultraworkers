/**
 * Workflow-specific error types.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/errors.ts`.
 * Phase 1 needs the code enum and the error class; the diagnostic payload interfaces
 * that the same file carries belong to later phases and are not duplicated ahead of
 * the phase that consumes them.
 */

/** Stable runtime and persistence failure codes exposed to callers and UI surfaces. */
export enum WorkflowErrorCode {
	/** Agent exceeded timeout. */
	AGENT_TIMEOUT = "AGENT_TIMEOUT",
	/** Workflow was aborted by user. */
	WORKFLOW_ABORTED = "WORKFLOW_ABORTED",
	/** Agent limit exceeded. */
	AGENT_LIMIT_EXCEEDED = "AGENT_LIMIT_EXCEEDED",
	/** Token budget exhausted. */
	TOKEN_BUDGET_EXHAUSTED = "TOKEN_BUDGET_EXHAUSTED",
	/**
	 * The provider's subscription/usage/quota/rate limit was hit. Distinct from the
	 * user's self-imposed TOKEN_BUDGET_EXHAUSTED: a provider limit refills on its own,
	 * so the run is checkpointed (paused) and replayed by resume() rather than failed.
	 */
	PROVIDER_USAGE_LIMIT = "PROVIDER_USAGE_LIMIT",
	/** Script validation failed. */
	SCRIPT_VALIDATION_ERROR = "SCRIPT_VALIDATION_ERROR",
	/** A schema agent never produced valid structured_output (after repair + extraction). */
	SCHEMA_NONCOMPLIANCE = "SCHEMA_NONCOMPLIANCE",
	/** A non-schema agent completed without any assistant text output. */
	AGENT_EMPTY_OUTPUT = "AGENT_EMPTY_OUTPUT",
	/**
	 * An agent()'s `model`/`tier` spec did not resolve to any known model. Never
	 * silently substituted for the session default — resolution is deterministic,
	 * so retrying the same spec would fail identically every time.
	 */
	MODEL_NOT_FOUND = "MODEL_NOT_FOUND",
	/**
	 * A host preSpawnModel policy rejected this agent before createAgentSession.
	 * Distinct from MODEL_NOT_FOUND: the model may be available; the policy refused spawn.
	 */
	MODEL_SPAWN_REJECTED = "MODEL_SPAWN_REJECTED",
	/** Agent execution failed. */
	AGENT_EXECUTION_ERROR = "AGENT_EXECUTION_ERROR",
	/** Run state persistence failed. */
	PERSISTENCE_ERROR = "PERSISTENCE_ERROR",
	/** Unknown error. */
	UNKNOWN = "UNKNOWN",
}

/** Classified workflow failure with recoverability and optional agent/provider context. */
export class WorkflowError extends Error {
	readonly code: WorkflowErrorCode;
	readonly recoverable: boolean;
	readonly agentLabel?: string;
	readonly details?: unknown;
	/** For PROVIDER_USAGE_LIMIT: the provider's human reset hint, e.g. "Resets in ~3h" (verbatim). */
	readonly resetHint?: string;

	constructor(
		message: string,
		code: WorkflowErrorCode,
		options: { recoverable?: boolean; agentLabel?: string; details?: unknown; resetHint?: string } = {},
	) {
		super(message);
		this.name = "WorkflowError";
		this.code = code;
		this.recoverable = options.recoverable ?? false;
		this.agentLabel = options.agentLabel;
		this.details = options.details;
		this.resetHint = options.resetHint;
	}
}

/**
 * Dependency-neutral diagnostic payload retained by capability contract failures.
 *
 * Copied from `pi-dynamic-workflows` `src/errors.ts:6-11`. The dependency-neutrality is the
 * point: this shape is duplicated structurally rather than imported from the contract so
 * the error module stays a leaf. The contract's own `CapabilityDiagnostic` is the narrower
 * type with a closed code union; this one only has to carry the payload out of a throw.
 */
export interface CapabilityErrorDiagnostic {
	code: string;
	severity: "error" | "warning" | "information";
	subject: string;
	message: string;
}

/**
 * Contract failure that retains every assembly diagnostic.
 *
 * Copied from `pi-dynamic-workflows` `src/errors.ts:107-115`.
 */
export class WorkflowCapabilityContractError extends Error {
	readonly diagnostics: readonly CapabilityErrorDiagnostic[];

	constructor(message: string, diagnostics: readonly CapabilityErrorDiagnostic[]) {
		super(message);
		this.name = "WorkflowCapabilityContractError";
		this.diagnostics = diagnostics;
	}
}

/** One named step a workflow reports progress against. */
export interface WorkflowMetaPhase {
	title: string;
	detail?: string;
	model?: string;
}

/** The literal header every workflow script must export as its first statement. */
export interface WorkflowMeta {
	name: string;
	description: string;
	phases?: WorkflowMetaPhase[];
	/** Default model for agents whose phase has no route and that set no model/tier. */
	model?: string;
}
