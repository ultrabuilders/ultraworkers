/**
 * End-to-end proof of the `registerDoubleEscapeAction` seam.
 *
 * `double-escape-action.test.ts` measures the runner accessor in isolation. What it
 * cannot show is the claim that matters: an extension module written OUTSIDE this
 * repo can reach the gesture through the REAL loader and have its action land where
 * the input controller will consult it — without a core edit.
 *
 * The extension here is a real `.ts` file at a temp path, reached only through
 * `loadExtensions`, the same entry an out-of-repo author's module takes. It imports
 * nothing but the published `ExtensionAPI` type and calls one method on it.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";

const tempDirs: string[] = [];

function writeExtensionModule(source: string[], name = "double-escape-extension.ts"): { dir: string; file: string } {
	const dir = path.join(os.tmpdir(), `pi-double-escape-e2e-${Snowflake.next()}`);
	fs.mkdirSync(dir, { recursive: true });
	tempDirs.push(dir);
	const file = path.join(dir, name);
	fs.writeFileSync(
		file,
		[
			'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
			"export default function register(pi: ExtensionAPI): void {",
			...source,
			"}",
			"",
		].join("\n"),
	);
	return { dir, file };
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) removeSyncWithRetries(dir);
});

describe("registerDoubleEscapeAction reached from an on-disk extension module", () => {
	it("the real loader runs an out-of-repo module's call and holds its action", async () => {
		const { dir, file } = writeExtensionModule([
			"\tpi.registerDoubleEscapeAction({",
			'\t\tid: "bookmarks",',
			'\t\tdescription: "Jump to a bookmarked message",',
			'\t\thandler: ctx => { void ctx.ui.notify("bookmarks"); },',
			"\t});",
		]);

		const loaded = await loadExtensions([file], dir);
		// The module loaded with no error, which is the whole claim: an author
		// outside this repo calls a published method and the loader accepts it.
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(1);

		const extension = loaded.extensions[0];
		expect(extension).toBeDefined();
		// Its action sits in the extension's own bucket, unread by anything else —
		// the seam is populated per-extension, so unloading it needs no unwiring.
		const actions = extension?.doubleEscapeActions;
		expect(actions).toHaveLength(1);
		expect(actions?.[0]?.id).toBe("bookmarks");
		expect(actions?.[0]?.description).toBe("Jump to a bookmarked message");
		expect(actions?.[0]?.handler).toBeInstanceOf(Function);
		// The loader stamps the owning path onto the action, because that is what a
		// thrown handler gets reported against.
		expect(actions?.[0]?.extensionPath).toBe(extension?.path);
	});

	it("refuses a duplicate id from the same extension, naming the module", async () => {
		const { dir, file } = writeExtensionModule([
			'\tpi.registerDoubleEscapeAction({ id: "bookmarks", handler: () => {} });',
			'\tpi.registerDoubleEscapeAction({ id: "bookmarks", handler: () => {} });',
		]);

		const loaded = await loadExtensions([file], dir);
		// Loading reports the refusal rather than dropping it: an action that was
		// silently ignored is indistinguishable from one that was never registered,
		// and the user just sees double-Escape stop working.
		expect(loaded.errors.length).toBeGreaterThan(0);
		const message = loaded.errors.map(e => e.error).join("\n");
		expect(message).toContain("bookmarks");
		expect(message).toMatch(/already registered/);
		// The whole extension is refused, not just the second action: a throw during
		// registration aborts the bind, so a module that got one call wrong does not
		// come back half-loaded. That is deliberately louder than loading the rest —
		// a partially-loaded extension is harder to diagnose than one that refuses to
		// start — and the error above names the file to fix.
		expect(loaded.extensions).toHaveLength(0);
	});

	it("refuses an action with no handler, naming the module", async () => {
		const { dir, file } = writeExtensionModule(['\tpi.registerDoubleEscapeAction({ id: "bookmarks" } as never);']);

		const loaded = await loadExtensions([file], dir);
		// Without this the loader would accept an action that throws "handler is not
		// a function" on the keystroke instead, which reads as a core bug.
		expect(loaded.errors.length).toBeGreaterThan(0);
		expect(loaded.errors.map(e => e.error).join("\n")).toMatch(/handler must be a function/);
		expect(loaded.extensions).toHaveLength(0);
	});

	it("keeps ids unique per extension, so two extensions may reuse one id", async () => {
		const dir = path.join(os.tmpdir(), `pi-double-escape-e2e-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		const fileA = path.join(dir, "a.ts");
		const fileB = path.join(dir, "b.ts");
		const body = [
			'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
			"export default function register(pi: ExtensionAPI): void {",
			'\tpi.registerDoubleEscapeAction({ id: "shared", handler: () => {} });',
			"}",
			"",
		].join("\n");
		fs.writeFileSync(fileA, body);
		fs.writeFileSync(fileB, body);

		const loaded = await loadExtensions([fileA, fileB], dir);
		// Uniqueness is per extension, not global: the attribute that matters is
		// which extension threw, and two unrelated authors picking the obvious id
		// must not be able to block each other from loading.
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(2);
		for (const extension of loaded.extensions) {
			expect(extension.doubleEscapeActions).toHaveLength(1);
			expect(extension.doubleEscapeActions[0]?.extensionPath).toBe(extension.path);
		}
	});
});
