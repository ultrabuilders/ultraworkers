import { describe, expect, it } from "bun:test";
import { ptree, TempDir } from "@oh-my-pi/pi-utils";

// `pi` ships `chord` as its own package, `@earendil-works/chord`, with the
// `./delta` subpath declared in its exports map. omp publishes the port as
// `@oh-my-pi/chord` — but the legacy specifier filter only knew the six `pi-*`
// package names, so `@earendil-works/chord` and `@earendil-works/chord/delta`
// matched nothing and a `pi` extension died at import with "Cannot find
// module". omp having published the package is what makes this a publish-level
// bug rather than a cosmetic gap: the package ships, and nothing routes to it.
//
// The contract is module *identity*, not resolution. An extension that imports
// through the legacy scope must end up holding the same live module object the
// host holds, or a value crossing the boundary would silently fork.
describe("legacy shim chord resolution", () => {
	it("resolves @earendil-works/chord and its subpath to the canonical module", async () => {
		using dir = TempDir.createSync("uw-legacy-pi-chord-");
		const entry = dir.join("extension.ts");
		await Bun.write(
			entry,
			[
				'import * as chord from "@earendil-works/chord";',
				'import * as delta from "@earendil-works/chord/delta";',
				"export { chord, delta };",
			].join("\n"),
		);
		const compatPath = import.meta.resolve("../../src/extensibility/plugins/legacy-pi-compat.ts");
		const result = await ptree.exec(
			[
				process.execPath,
				"-e",
				`
import { installLegacyPiSpecifierShim, loadLegacyPiModule } from ${JSON.stringify(compatPath)};
installLegacyPiSpecifierShim();
const extension = await loadLegacyPiModule(${JSON.stringify(entry)});
const hostChord = await import("@oh-my-pi/chord");
const hostDelta = await import("@oh-my-pi/chord/delta");
console.log(JSON.stringify({
  chordSameModule: extension.chord.defineService === hostChord.defineService,
  deltaSameModule: extension.delta.isReplace === hostDelta.isReplace,
  reservedSegments: extension.delta.RESERVED_SEGMENTS.has("__proto__"),
  rejectsPrototype: (() => { try { extension.delta.assertSafePath(["__proto__"]); return false; } catch { return true; } })(),
}));
`,
			],
			{
				env: { ...Bun.env, PI_TEST_RUNTIME: "1", PI_CODING_AGENT_DIR: dir.join("agent") },
				timeout: 15_000,
				allowNonZero: true,
			},
		);

		expect(result.exitCode, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({
			// Same function object, not merely a working one: a second copy of
			// the module would fork every value that crosses the boundary.
			chordSameModule: true,
			deltaSameModule: true,
			reservedSegments: true,
			// The subpath must be the real module, so its guards must still fire.
			rejectsPrototype: true,
		});
	});
});
