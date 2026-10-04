/**
 * Local declaration for the one dependency `src/report.ts` defers.
 *
 * `@vitest-evals/core` is an npm-only package that this repository does not install and
 * that is absent from pi-ref's own node_modules, so `tsgo` cannot resolve the specifier.
 * Only `persistSession`'s report readers use it, and the comparison contract never
 * reaches that function — which is exactly why the import is deferred rather than
 * replaced.
 *
 * This file exists so the seam is type-checked instead of suppressed. Declaring the
 * module ambiently gives the deferred `await import()` a shape to check against; if the
 * eval runner is ever ported, this declaration is deleted along with the deferral.
 *
 * Signatures match the access sites in `report.ts`, not the upstream package's own
 * declarations, which cannot be read here.
 */
declare module "@vitest-evals/core/node" {
	/** Reads the eval workspace for a report path. */
	export function readReportWorkspace(reportPaths: string[]): Promise<unknown>;
	/** Reads a vitest JSON report for a report path. */
	export function readVitestJsonReportFile(reportPath: string): Promise<unknown>;
}
