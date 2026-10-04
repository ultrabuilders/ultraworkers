import { describe, expect, it } from "bun:test";
import { APP_NAME, CONFIG_DIR_NAME } from "../src/dirs";

// The one place the brand's two names are pinned as literals. Everything else derives
// from these constants, which is the point: a test that reads `APP_NAME` and asserts
// `APP_NAME` proves nothing about the wire, and a rename that moved both the product
// and its tests together would leave the whole suite green against a name no user
// ever typed again.
//
// The pair guarded here is display name vs on-disk config directory. They are
// deliberately NOT equal — `APP_NAME` is what the product calls itself, and
// `CONFIG_DIR_NAME` is the directory an existing install already has data in. A
// rename that moved them together would strand every user's config, so this is the
// boundary most worth a literal. `CONFIG_DIR_NAME` is expected to stay `.omp`
// specifically because it is a compatibility promise, not a leftover.
describe("brand constants", () => {
	it("pins the display name and the on-disk config directory to distinct literals", () => {
		expect(APP_NAME).toBe("ultraworkers");
		expect(CONFIG_DIR_NAME).toBe(".omp");
		expect(APP_NAME).not.toBe(CONFIG_DIR_NAME);
	});
});
