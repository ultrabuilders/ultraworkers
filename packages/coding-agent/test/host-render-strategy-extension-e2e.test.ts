/**
 * End-to-end proof that the host render strategy seam is reachable from an
 * extension written OUTSIDE this repo.
 *
 * `packages/tui/test/host-render-strategy.test.ts` drives the registry and the
 * precedence directly. What it cannot show is the programme's actual claim: a
 * module authored elsewhere, importing only published specifiers, can register a
 * rule for how a terminal resize repaints — and the real loader, runner and
 * resize gate all honour it — with no core edit.
 *
 * The extension below is a real `.ts` file at a temp path, reached only through
 * `loadExtensions`, the same entry an out-of-repo author's module takes.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import {
	clearHostRenderStrategies,
	registerHostRenderStrategy,
	resolveInPlaceResize,
} from "@oh-my-pi/pi-tui/host-render-strategy";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";

const tempDirs: string[] = [];

/** A host core's closed classifier has never heard of, and that repaints in place. */
const MY_TERM_ENV = { TERM_PROGRAM: "MyTerm" } as NodeJS.ProcessEnv;

const gateHere = (): boolean =>
	resolveInPlaceResize({ env: MY_TERM_ENV, hostOwnsGridOnResize: false, platform: "darwin" });

function writeExtensionModule(): { dir: string; file: string } {
	const dir = path.join(os.tmpdir(), `pi-host-render-e2e-${Snowflake.next()}`);
	fs.mkdirSync(dir, { recursive: true });
	tempDirs.push(dir);
	const file = path.join(dir, "host-render-extension.ts");
	fs.writeFileSync(
		file,
		[
			'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
			"export default function register(pi: ExtensionAPI): void {",
			"\tpi.registerHostRenderStrategy({",
			'\t\tid: "myterm",',
			'\t\tlabel: "MyTerminal repaints its viewport in place",',
			'\t\tdecide: ({ env }) => (env.TERM_PROGRAM === "MyTerm" ? "in-place" : "defer"),',
			"\t});",
			"}",
			"",
		].join("\n"),
	);
	return { dir, file };
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) removeSyncWithRetries(dir);
	clearHostRenderStrategies();
});

describe("registerHostRenderStrategy reached from an on-disk extension module", () => {
	it("changes what the resize gate decides, and disposal restores it exactly", async () => {
		const { dir, file } = writeExtensionModule();
		const loaded = await loadExtensions([file], dir);

		// The module loaded with no error, which is the claim: an author outside
		// this repo calls a published method and the real loader accepts it.
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(1);

		const extension = loaded.extensions[0];
		expect(extension?.hostRenderStrategies).toHaveLength(1);
		const strategy = extension?.hostRenderStrategies[0];
		expect(strategy?.id).toBe("myterm");

		// Before the runner installs it the process registry is untouched: loading
		// is not installing, or merely importing something would steer every resize.
		expect(gateHere()).toBe(false);

		// Installing is what the runner does at initialize; driven here directly so
		// the assertion is about the contribution's effect, not the wiring.
		const dispose = registerHostRenderStrategy(strategy!);

		// Observable difference: the host core would have borrowed the alternate
		// screen; the vendor knows its terminal repaints in place, so it does not.
		expect(gateHere()).toBe(true);
		// …and only for the host the author named, not for every terminal.
		expect(
			resolveInPlaceResize({ env: { TERM_PROGRAM: "iTerm.app" }, hostOwnsGridOnResize: false, platform: "darwin" }),
		).toBe(false);

		// Releasing it returns the process to exactly the pre-seam decision — the
		// negative half, without which an unloaded vendor would keep steering the
		// resize path of a live session.
		dispose();
		expect(gateHere()).toBe(false);
	});

	it("refuses an out-of-repo strategy that could not be honoured, naming the module", async () => {
		const dir = path.join(os.tmpdir(), `pi-host-render-bad-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		const file = path.join(dir, "nameless-extension.ts");
		fs.writeFileSync(
			file,
			[
				'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
				"export default function register(pi: ExtensionAPI): void {",
				// Deliberately malformed, as an out-of-repo author might write it.
				//
				// No `@ts-expect-error` here, and its absence is the point: this text is
				// written to a temp directory and loaded, so nothing in this repository ever
				// typechecks it — the directive was inert and `check:types` correctly
				// reported it as unused. There is also no type error to suppress, because
				// `id` is a plain `string`; the seam rejects a blank one at LOAD time, which
				// is exactly what the assertion below checks.
				'\tpi.registerHostRenderStrategy({ id: "  ", label: "nameless", decide: () => "in-place" });',
				"}",
				"",
			].join("\n"),
		);

		const loaded = await loadExtensions([file], dir);
		// The rejection is the seam's, and it fires at LOAD time — before the
		// strategy could ever reach the gate — so a malformed contribution is
		// reported against the file to fix rather than quietly ignored.
		expect(loaded.errors).toHaveLength(1);
		expect(loaded.errors[0]?.error).toContain("host render strategy id must be a non-empty trimmed string");
		// The rejection names the offending module, so an author knows which file
		// to fix rather than only that something failed.
		expect(loaded.errors[0]?.path).toBe(file);
		expect(loaded.extensions[0]?.hostRenderStrategies ?? []).toEqual([]);
		expect(gateHere()).toBe(false);
	});
});
