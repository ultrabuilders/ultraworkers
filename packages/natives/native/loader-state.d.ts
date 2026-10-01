export interface EmbeddedAddonFile {
	variant: "modern" | "baseline" | "default";
	filename: string;
	size?: number;
	filePath?: string;
}

export interface EmbeddedAddonArchive {
	format: "tar.gz";
	filename: string;
	filePath: string;
}

export interface EmbeddedAddon {
	platformTag: string;
	version: string;
	files: EmbeddedAddonFile[];
	archive?: EmbeddedAddonArchive;
}

export interface DetectCompiledBinaryInput {
	embeddedAddon: EmbeddedAddon | null | undefined;
	env: Record<string, string | undefined>;
	importMetaUrl: string | null | undefined;
}

export function detectCompiledBinary(input: DetectCompiledBinaryInput): boolean;


export interface GetAddonFilenamesInput {
	tag: string;
	arch: string;
	variant: "modern" | "baseline" | null | undefined;
}

export function getAddonFilenames(input: GetAddonFilenamesInput): string[];

export interface ShouldStageNodeModulesAddonInput {
	platform: NodeJS.Platform | string;
	isCompiledBinary: boolean;
	nativeDir: string;
}

export function shouldStageNodeModulesAddon(input: ShouldStageNodeModulesAddonInput): boolean;

export interface ResolveLoaderCandidatesInput {
	addonFilenames: string[];
	isCompiledBinary: boolean;
	stageFromNodeModules?: boolean;
	nativeDir: string;
	leafPackageDir?: string | null;
	execDir: string;
	versionedDir: string;
	userDataDir: string;
}

export function resolveLoaderCandidates(input: ResolveLoaderCandidatesInput): string[];

export interface InitLoaderContextOverrides {
	nativeDir?: string;
	platform?: NodeJS.Platform | string;
	isCompiledBinary?: boolean;
	leafPackageDir?: string | null;
}

export interface NativeLoaderContext {
	platformTag: string;
	packageVersion: string;
	nativeDir: string;
	leafPackageDir: string | null;
	versionedDir: string;
	isCompiledBinary: boolean;
	stageFromNodeModules: boolean;
	selectedVariant: "modern" | "baseline" | null;
	addonFilenames: string[];
	addonLabel: string;
	candidates: string[];
	isWorkspaceLoad: boolean;
	nativesDir: string;
}

export function initLoaderContext(overrides?: InitLoaderContextOverrides): NativeLoaderContext;

export interface CleanupStaleNativeVersionsInput {
	nativesDir: string;
	currentVersion: string;
}

export function cleanupStaleNativeVersions(input: CleanupStaleNativeVersionsInput): string[];

export function prepareNativeVersionDir(versionedDir: string): void;

export interface ExtractEmbeddedAddonArchiveInput {
	archivePath: string;
	files: EmbeddedAddonFile[];
	targetDir: string;
}

export function extractEmbeddedAddonArchive(input: ExtractEmbeddedAddonArchiveInput): string[];

export interface SelectCpuVariantInput {
	arch: string;
	override: "modern" | "baseline" | null | undefined;
	env: Record<string, string | undefined>;
	detectAvx2: () => boolean;
}

export interface SelectCpuVariantResult {
	variant: "modern" | "baseline" | null;
	source: "non-x64" | "override" | "cache" | "detect";
	cacheEnvKey?: string;
	cacheEnvValue?: string;
}

export function selectCpuVariant(input: SelectCpuVariantInput): SelectCpuVariantResult;

export interface ValidateLoadedBindingsContext {
	isWorkspaceLoad: boolean;
	packageVersion: string;
}

export function validateLoadedBindings(
	ctx: ValidateLoadedBindingsContext,
	bindings: Record<string, unknown>,
	candidate: string,
): void;

/** Identity of the addon `loadNative()` returned, for missing-export diagnostics. */
/**
 * Three states, three values — the third is the point.
 *
 * `current` and `stale` are separate members rather than one object with a
 * boolean, so a caller that forgets to check cannot read "the addon is a
 * different release" as anything like a pass. `unavailable` carries no version
 * claim at all: it is the honest answer when nothing loaded, and it has no
 * fields that could be mistaken for a measurement.
 */
export type NativeAddonStatus =
	| {
			state: "current";
			/** Absolute path of the loaded `.node`. */
			path: string;
			/** Release the loaded addon reports (post-link stamp or legacy sentinel), or `null` when unidentified. */
			version: string | null;
			/** `package.json#version` of the loader that loaded it. */
			packageVersion: string;
	  }
	| {
			state: "stale";
			/** Absolute path of the loaded `.node`. */
			path: string;
			/** Release the loaded addon reports (post-link stamp or legacy sentinel), or `null` when unidentified. */
			version: string | null;
			/** `package.json#version` of the loader that loaded it. */
			packageVersion: string;
	  }
	| {
			/** Nothing loaded, so nothing was measured. */
			state: "unavailable";
	  };

/** The addon behind this process's exports — one of three states, never `null`. */
export function nativeAddonStatus(): NativeAddonStatus;

/**
 * What a gate may conclude from the addon it runs against.
 *
 * Deliberately has no `deny` member: this measures, it does not adjudicate.
 * A `deny` here would be a second, silently-equal spelling of "not current",
 * and it would read as a measured refusal when nothing was determined.
 */
export type NativeAddonGateVerdict = "allow" | "unknown";

/**
 * The verdict a gate may draw. Only a *current* addon yields `allow`; a stale
 * one and an unloaded one both yield `unknown`, because a release this tree did
 * not expect supports no verdict at all.
 */
export function nativeAddonGateVerdict(addon?: NativeAddonStatus): NativeAddonGateVerdict;

/**
 * Stub for an export the addon does not provide: `undefined` on a current
 * addon, a throwing function on a stale one.
 */
export function missingNativeExport(
	symbolName: string,
	addon?: NativeAddonStatus,
): (() => never) | undefined;

/** Actionable text for {@link missingNativeExport}. */
export function missingNativeExportMessage(symbolName: string, addon?: NativeAddonStatus): string;

export function loadNative(): Record<string, unknown>;
