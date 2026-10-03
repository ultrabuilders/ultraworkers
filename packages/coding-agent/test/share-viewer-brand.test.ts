import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { WIRE_NAME } from "@oh-my-pi/pi-utils";

/**
 * The share-viewer page is built by a script that runs at release time, so a
 * brand literal in it does not fail any later test — it just ships. This runs
 * the generator and reads what it produced.
 *
 * Two independent places carry the name: the page <title>, and the title the
 * inlined browser loader assigns once the session resolves. Both are asserted
 * against WIRE_NAME rather than against a spelling, so the next rebrand cannot
 * put the old name back without this going red.
 */
describe("generate-share-viewer: the brand name is injected, not typed", () => {
	test("page title and inlined loader both carry WIRE_NAME, with no stale literal", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "share-viewer-brand-"));
		const out = path.join(dir, "viewer.html");
		try {
			const proc = Bun.spawnSync({
				cmd: ["bun", new URL("../scripts/generate-share-viewer.ts", import.meta.url).pathname, out],
				cwd: new URL("..", import.meta.url).pathname,
				stdout: "pipe",
				stderr: "pipe",
			});
			expect(proc.exitCode).toBe(0);
			const html = await Bun.file(out).text();

			expect(html).toContain(`<title>${WIRE_NAME} session</title>`);
			// The loader is inlined verbatim except for the substituted brand, so the
			// assignment it makes in the browser must carry the same name. Matched
			// without pinning the quote style: the loader is a browser file that gets
			// reformatted, and an assertion on one quote style would report the
			// formatter as a brand regression — or hide a real miss behind it.
			expect(html).toMatch(new RegExp(`(["']) — ${WIRE_NAME} session\\1`));

			// A rename that half-applied would leave one of the two behind; assert the
			// absence rather than only the presence so that is caught here too.
			expect(html).not.toContain("<title>omp session</title>");
			expect(html).not.toMatch(/(["']) — omp session\1/);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
});
