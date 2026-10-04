/**
 * The E2E auth-gateway tests skip unless a live gateway answers, so the token
 * lookup has no other guard: if it drifts from where production writes the
 * token, every one of those files reports `Ran 0 tests` — a false zero, not a
 * pass. This asserts the lookup follows the resolved config root.
 *
 * Production writes the token via `getConfigRootDir()`
 * (`auth-gateway-cli.ts` `getTokenFilePath()`); the failure this defends
 * against is a lookup that hardcodes a directory name and therefore looks
 * somewhere the gateway never writes.
 *
 * Deliberately exercises the path resolver directly rather than
 * `checkAuthGatewayE2EAvailable()`: that helper memoises its result at module
 * scope, so calling it here would hand this test's profile-derived answer to
 * every other file sharing the process — which is what a profile probe must
 * not do.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as path from "node:path";
import * as piUtils from "@oh-my-pi/pi-utils";
import { authGatewayTokenPath } from "./helpers";

const { setProfile } = piUtils;

const PROFILE = "token-path-probe";

describe("auth-gateway E2E token lookup", () => {
	afterEach(() => setProfile(undefined));

	it("resolves the token under the active config root, not a hardcoded directory name", () => {
		// A named profile relocates the config root to <root>/profiles/<name>.
		// A hardcoded directory name cannot follow it; the resolver must.
		setProfile(PROFILE);
		const probed = authGatewayTokenPath();

		expect(path.basename(probed)).toBe("auth-gateway.token");
		expect(probed).toContain(path.join("profiles", PROFILE));
	});
});
