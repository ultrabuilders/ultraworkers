/**
 * Extension-contributed diagnostics for `omp plugin doctor`.
 *
 * The surface existed and the contributor path did not: `DoctorCheck` is a
 * closed four-field struct assembled entirely inside `PluginManager.doctor()`,
 * so an extension shipping a half-loaded or broken surface could describe it
 * nowhere. The nearest-looking seam, `on("resources_discover")`, contributes
 * paths only — never a diagnostic or a remediation.
 *
 * A module-level registry rather than a parameter on `doctor()`, for the same
 * reason `usage-reporter.ts` keeps one: the command that runs the doctor and the
 * loader that ran the extensions are different subsystems with no shared object,
 * and threading the loaded set through both would change a command signature to
 * carry data that is already owned by the extension runtime. What that costs is
 * global state, so the lifecycle is explicit — {@link addDiagnostic} returns
 * a disposer, and the loader drops it when the extension unloads, which is what
 * makes "unregistering returns to exactly the pre-seam behaviour" true rather than
 * aspirational.
 */
import type { DoctorCheck } from "../plugins/types";

/**
 * One diagnostic an extension contributes.
 *
 * `run` is evaluated when the doctor runs, not when the extension loads: a
 * diagnostic describes current state, and a value computed at registration would
 * be reporting on the past by the time anyone reads it.
 */
export interface ExtensionDiagnostic {
	/** Stable identifier, unique within the extension. Names the check. */
	readonly id: string;
	/** Human-readable name, shown to the user. */
	readonly label: string;
	run(): Promise<Omit<DoctorCheck, "name">> | Omit<DoctorCheck, "name">;
}

export interface RegisteredDiagnostic {
	/** The extension path, so a failing check says which extension produced it. */
	readonly source: string;
	readonly diagnostic: ExtensionDiagnostic;
}

const registry = new Map<string, RegisteredDiagnostic[]>();

/**
 * Add a diagnostic. Returns a disposer that removes it again.
 *
 * Returns a disposer rather than relying on the caller to remember to clean up:
 * an extension that unloads without removing its registrations leaves a check
 * that keeps reporting on a directory that is no longer there, which reads as a
 * live fault rather than a leak.
 */
export function addDiagnostic(source: string, diagnostic: ExtensionDiagnostic): () => void {
	const existing = registry.get(source) ?? [];
	existing.push({ source, diagnostic });
	registry.set(source, existing);
	const dispose = () => {
		const current = registry.get(source);
		if (!current) return;
		const remaining = current.filter(entry => entry.diagnostic !== diagnostic);
		if (remaining.length === 0) registry.delete(source);
		else registry.set(source, remaining);
		const owned = disposers.get(source) ?? [];
		disposers.set(
			source,
			owned.filter(entry => entry !== dispose),
		);
		if (disposers.get(source)?.length === 0) disposers.delete(source);
	};
	disposers.set(source, [...(disposers.get(source) ?? []), dispose]);
	return dispose;
}

const disposers = new Map<string, (() => void)[]>();

/**
 * Drop every check one extension contributed, and return how many there were.
 *
 * Keyed by source rather than by registration so unload is a single call with
 * nothing to keep in sync: a caller holding a stale disposer list would release
 * checks that were never installed, or miss ones that were.
 */
export function releaseDiagnostics(source: string): number {
	const owned = disposers.get(source) ?? [];
	disposers.delete(source);
	for (const dispose of owned) dispose();
	return owned.length;
}

/** Everything currently registered, in registration order. */
export function collectDiagnostics(): readonly RegisteredDiagnostic[] {
	return [...registry.values()].flat();
}

/** Drop every registration. Test-only; the loader disposes individually. */
export function clearDiagnostics(): void {
	registry.clear();
	disposers.clear();
}
