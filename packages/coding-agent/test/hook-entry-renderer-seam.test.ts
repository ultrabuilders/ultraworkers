/**
 * A hook can append an entry AND say what that entry looks like.
 *
 * The contract this defends is the seam, not the drawing. `HookAPI.appendEntry`
 * put an entry on screen since the hook API existed, but there was no way to
 * register a renderer for it — so a hook could produce a custom entry and got
 * the default rendering for it, while the extension branch had
 * `registerEntryRenderer` the whole time. An extension author and a hook author
 * writing the same widget would get two different results from the same API
 * shape, and the hook one had no way to say so.
 *
 * The assertions run against a hook module loaded through the real `loadHooks`,
 * not a hand-built object: a seam that exists on the type but is not handed to
 * the factory is the exact shape of this defect, and only the load path proves
 * which one shipped.
 *
 * The duplicate-registration row is the negative half. `registerMessageRenderer`
 * on this same object overwrites silently, and an entry renderer that overwrote
 * too would leave the first author with a registration that never runs and no
 * way to learn it. So the second claim on one custom type is refused by name.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadHooks } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/loader";
import { TempDir } from "@oh-my-pi/pi-utils";

describe("a hook registers a renderer for the entries it appends", () => {
	let projectDir: TempDir | undefined;

	beforeEach(() => {
		projectDir = TempDir.createSync("@hook-entry-renderer-");
	});

	afterEach(() => {
		projectDir?.removeSync();
		projectDir = undefined;
	});

	function writeHook(source: string): string {
		expect(projectDir).toBeDefined();
		const modulePath = path.join(projectDir!.path(), "hook.ts");
		fs.writeFileSync(modulePath, source);
		return modulePath;
	}

	/** A renderer that is recognisably ours, so "did this one run" is answerable. */
	const MARKER = "hook-entry-renderer-was-here";

	it("hands the registered renderer to the reader that draws it", async () => {
		const hookPath = writeHook(`
			export default function(api) {
				api.registerEntryRenderer("status", () => ({ marker: "${MARKER}" }));
			}
		`);

		const result = await loadHooks([hookPath], projectDir!.path());

		expect(result.errors).toEqual([]);
		expect(result.hooks).toHaveLength(1);

		// Through the runner's reader, not the raw map: the map proves the write
		// landed, the reader proves something can get it back out the way the draw
		// path will.
		const renderer = result.hooks[0].entryRenderers.get("status");
		expect(renderer).toBeDefined();
		expect(
			renderer?.(
				// `SessionEntryBase.timestamp` is an ISO string written by `nowIso()`, so
				// `0` here was never a value the production path could produce.
				{
					type: "custom",
					customType: "status",
					data: {},
					id: "e1",
					parentId: null,
					timestamp: "2026-01-01T00:00:00.000Z",
				},
				{
					expanded: false,
				},
				null as never,
			),
			// `EntryRenderer` returns `Component | undefined`, and the hook under test
			// returns a bare marker object rather than a real component — that is what
			// makes "did this renderer run" observable at all. Same `as never` the
			// theme argument above uses for the same reason: the seam is what is under
			// test, not the component's shape.
		).toEqual({ marker: MARKER } as never);
	});

	it("reports no renderer for a custom type no hook claimed", async () => {
		const hookPath = writeHook(`
			export default function(api) {
				api.registerEntryRenderer("status", () => undefined);
			}
		`);

		const result = await loadHooks([hookPath], projectDir!.path());

		// The negative half. Without it, a reader that returned the last renderer
		// regardless of the type it was asked for would satisfy the row above.
		expect(result.hooks[0].entryRenderers.get("never-claimed")).toBeUndefined();
	});

	it("refuses a second renderer for one custom type instead of overwriting", async () => {
		const hookPath = writeHook(`
			export default function(api) {
				api.registerEntryRenderer("status", () => ({ first: true }));
				api.registerEntryRenderer("status", () => ({ second: true }));
			}
		`);

		const result = await loadHooks([hookPath], projectDir!.path());

		// The load reports the failure instead of throwing out of the factory, so
		// the message has to be in `errors` and the hook must not half-load.
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors.map(error => error.error).join("\n")).toContain("status");
		expect(result.hooks).toHaveLength(0);
	});
});
