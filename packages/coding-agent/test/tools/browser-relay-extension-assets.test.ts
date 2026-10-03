import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * The extension ships twice, and nothing checks that the two copies agree.
 *
 * `packages/browser-relay/scripts/build-extension.ts` compiles `extension/background.ts`
 * and copies the rest verbatim into `extension-assets/*.txt`, which
 * `cli/browser-relay-cli.ts` imports `with { type: "text" }` and writes to disk at
 * `browser-relay install`. That is how `ultraworkers browser-relay install` works from the
 * compiled binary.
 *
 * Regeneration is a documented manual step — the build script's own docblock says to re-run
 * it and commit the result. Manual is the problem: edit `extension/manifest.json`, forget the
 * re-run, and the commit is green because the asset still parses. The extension a user installs
 * then carries the old name while `browser-relay install` prints the new one, and the two are
 * only reconciled by whoever notices next.
 *
 * So this reproduces the build into a temporary directory and diffs the result against what is
 * committed. It builds nowhere near the real `dist/` or `extension-assets/`, so it cannot
 * clobber either — which matters, because the real build deletes `extension-assets/` wholesale
 * before rewriting it.
 *
 * What a consumer actually observes when this drifts: `browser-relay install` writes a
 * manifest whose `name` disagrees with the string the same command just printed, and the
 * extension shows up in the Chrome toolbar under the wrong name.
 */

/** Repo root: this file sits at `packages/coding-agent/test/tools/`. */
const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..", "..");
const RELAY_ROOT = path.join(REPO_ROOT, "packages", "browser-relay");
const ASSETS_DIR = path.join(
	REPO_ROOT,
	"packages",
	"coding-agent",
	"src",
	"tools",
	"browser",
	"relay",
	"extension-assets",
);

/**
 * Each committed asset, and the file the build derives it from.
 *
 * `copy` names a file the build copies byte-for-byte. `bundle` names the one it compiles, which
 * is why it needs the banner handling below.
 */
const ASSETS = [
	{ asset: "background.js.txt", kind: "bundle", base: RELAY_ROOT, source: "extension/background.ts" },
	{ asset: "manifest.json.txt", kind: "copy", base: RELAY_ROOT, source: "extension/manifest.json" },
	{ asset: "options.html.txt", kind: "copy", base: RELAY_ROOT, source: "extension/options.html" },
	{ asset: "options.js.txt", kind: "copy", base: RELAY_ROOT, source: "extension/options.js" },
	{ asset: "LICENSE.txt", kind: "copy", base: REPO_ROOT, source: "LICENSE" },
	{ asset: "THIRD-PARTY-NOTICES.txt", kind: "copy", base: REPO_ROOT, source: "THIRD-PARTY-NOTICES.txt" },
] as const;

/**
 * Drops the bundler's banner line so two builds of the same source can be compared.
 *
 * `Bun.build` prefixes its output with the entrypoint path it was given. `build-extension.ts`
 * passes an absolute path, while the committed asset was produced by an invocation using a
 * package-relative one, so the first line differs on every run for a reason that has nothing to
 * do with the extension. Comparing it would fail forever and teach everyone to ignore this test.
 * Only the leading line is touched, and only when it is a comment naming the entrypoint.
 */
function withoutBanner(text: string, source: string): string {
	const newline = text.indexOf("\n");
	if (newline === -1) return text;
	const first = text.slice(0, newline);
	if (first.startsWith("//") && first.includes("background.ts")) return text.slice(newline + 1);
	void source;
	return text;
}

let built: string;

beforeAll(async () => {
	built = await fs.mkdtemp(path.join(os.tmpdir(), "relay-ext-assets-"));
	const bundle = await Bun.build({
		entrypoints: [path.join(RELAY_ROOT, "extension", "background.ts")],
		outdir: built,
		target: "browser",
		sourcemap: "none",
	});
	if (!bundle.success) {
		for (const log of bundle.logs) console.error(log);
		throw new Error("could not bundle extension/background.ts");
	}
});

afterAll(async () => {
	if (built) await fs.rm(built, { recursive: true, force: true });
});

describe("browser relay extension assets", () => {
	for (const { asset, kind, base, source } of ASSETS) {
		it(`keeps ${asset} in step with ${source}`, async () => {
			const from = kind === "bundle" ? path.join(built, "background.js") : path.join(base, source);
			const expectedRaw = await Bun.file(from).text();
			const committedRaw = await Bun.file(path.join(ASSETS_DIR, asset)).text();
			const expected = kind === "bundle" ? withoutBanner(expectedRaw, source) : expectedRaw;
			const committed = kind === "bundle" ? withoutBanner(committedRaw, source) : committedRaw;

			if (expected !== committed) {
				// Name the first differing line so the failure points at the edit that was
				// never regenerated, rather than dumping two kilobytes of extension.
				const a = expected.split("\n");
				const b = committed.split("\n");
				const at = a.findIndex((line, i) => line !== b[i]);
				// `findIndex` returns -1 when the two agree on every line the shorter one has
				// and one simply runs longer — a trailing newline, an appended stanza. That is
				// the most common way a regenerated file drifts, so reporting it as a
				// difference at line 0 would send the reader hunting for a line that does
				// not exist.
				const where =
					at === -1
						? `committed has ${b.length} line(s) against the build's ${a.length} ` +
							`(${b.length > a.length ? "extra trailing content" : "missing trailing content"})`
						: `first difference at line ${at + 1}:\n` +
							`  build:     ${JSON.stringify(a[at])}\n` +
							`  committed: ${JSON.stringify(b[at])}`;
				throw new Error(
					`${asset} is stale against ${source} — ${where}.\n` +
						`Re-run: bun --cwd packages/browser-relay run build`,
				);
			}
		});
	}
});
