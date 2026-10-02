import { describe, expect, it } from "bun:test";
import { OAuthCallbackFlow } from "@oh-my-pi/pi-ai/registry/oauth/callback-server";
import type { OAuthAuthInfo, OAuthCredentials } from "@oh-my-pi/pi-ai/registry/oauth/types";
import { APP_NAME } from "@oh-my-pi/pi-utils";
import { parseHTML } from "@oh-my-pi/pi-utils/dom";

/**
 * The OAuth result page is a static text import, so before this was templated it
 * carried its own hand-typed copy of the product name. Nothing watched it: no
 * rename gate globs `.html`. The failure this defends against is not cosmetic —
 * the installed binary is `ultraworkers`, so a page still reading the old name
 * tells a user, at the one moment they are typing a password into our tab, that
 * they are logging into a product that no longer exists.
 *
 * The assertion is scoped to what a reader actually SEES — the tab title and the
 * wordmark. The page also contains `omp-mark`, a CSS class, and `omp-mark-grad`,
 * an SVG gradient id; those are internal handles, never rendered as text, and this
 * test deliberately does not claim otherwise.
 */
class BrandProbeFlow extends OAuthCallbackFlow {
	async generateAuthUrl(state: string, redirectUri: string): Promise<{ url: string }> {
		const url =
			"https://mcp.example.com/authorize?" +
			new URLSearchParams({
				response_type: "code",
				client_id: "test-client",
				redirect_uri: redirectUri,
				state,
				scope: "openid",
				code_challenge: "test-challenge",
				code_challenge_method: "S256",
			}).toString();
		return { url };
	}

	async exchangeToken(): Promise<OAuthCredentials> {
		return { access: "unused", refresh: "unused", expires: Date.now() + 60_000 };
	}
}

/** Drive a flow to the point the provider would redirect, then fetch the served page. */
async function serveCallbackPage(): Promise<string> {
	const abort = new AbortController();
	const authFired = Promise.withResolvers<OAuthAuthInfo>();
	const flow = new BrandProbeFlow(
		{
			onAuth: info => {
				authFired.resolve(info);
			},
			signal: abort.signal,
		},
		{ preferredPort: 0, allowPortFallback: true },
	);
	const login = flow.login().catch(() => undefined) as Promise<void>;
	const info = await authFired.promise;

	const redirectUri = new URL(info.url).searchParams.get("redirect_uri") ?? "";
	const state = new URL(info.url).searchParams.get("state") ?? "";
	const response = await fetch(`${redirectUri}?code=test-code&state=${encodeURIComponent(state)}`);

	abort.abort("test done");
	await login;
	return response.text();
}

describe("OAuth result page brand", () => {
	it("names the product the binary actually installs, in the tab title and the wordmark", async () => {
		const html = await serveCallbackPage();
		const { document } = parseHTML(html);

		// What the reader sees in the tab strip, and beside the logo on the page.
		expect(document.title).toBe(`${APP_NAME} · authentication`);
		expect(document.querySelector(".wordmark")?.textContent).toBe(APP_NAME);

		// The placeholder must not survive into the response: an unsubstituted
		// `__APP_NAME__` reads as a broken build, and it is the exact symptom of
		// the template and the substitution drifting apart.
		expect(html).not.toContain("__APP_NAME__");
	});
});
