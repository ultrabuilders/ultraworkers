/**
 * `/export` argument parsing, split from `./index.ts` so slash-command
 * registries can parse arguments without eagerly loading the export module's
 * embedded template/tool-view text.
 */

/** Dark and light TUI theme names bundled into a dual-theme export. */
export interface ExportThemeNames {
	dark: string;
	light: string;
}

/** Parsed `/export` arguments: where to write, and which format to render. */
export interface ExportArgs {
	outputPath?: string;
	useUserThemes: boolean;
	/** Id of an extension-registered output format; built-in HTML when absent. */
	formatId?: string;
}

/**
 * Parse `/export [--themes] [--format <id>] [path]`; paths containing spaces were
 * never supported.
 *
 * `--format` names an id an extension registered with `registerOutputFormat`. An
 * id nobody registered is not an error here: the export layer already treats an
 * unknown `formatId` as "write the built-in HTML", and this parser does not know
 * which extensions are loaded, so rejecting it would make the same command fail
 * or succeed depending on what happened to be installed.
 */
export function parseExportArgs(args: string): ExportArgs {
	const parts = args.trim().split(/\s+/).filter(Boolean);
	const useUserThemes = parts.includes("--themes");

	const formatIndex = parts.indexOf("--format");
	let formatId: string | undefined;
	if (formatIndex !== -1) {
		formatId = parts[formatIndex + 1];
		if (formatId === undefined || formatId.startsWith("--")) {
			throw new Error("Usage: /export [--themes] [--format <id>] [path]");
		}
	}

	const paths = parts.filter(
		(part, index) =>
			part !== "--themes" && (formatIndex === -1 || (index !== formatIndex && index !== formatIndex + 1)),
	);
	if (paths.length > 1) throw new Error("Usage: /export [--themes] [--format <id>] [path]");
	return { outputPath: paths[0], useUserThemes, formatId };
}
