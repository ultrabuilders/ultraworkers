/**
 * An MCP OAuth credential must not be put on a non-HTTPS endpoint.
 *
 * Two sends carry a secret: the token exchange (client secret, plus the PKCE
 * verifier) and the refresh (refresh token). Both post to a URL that can arrive
 * from `.mcp.json` without passing through discovery, so validating the
 * discovery path proves nothing about the send itself.
 *
 * The contract is not "an error is raised" — a thrown error after the request
 * went out would satisfy that. It is that **no request is issued at all**, which
 * is why the fetch spy is asserted at zero calls rather than on its arguments.
 */
import { afterEach, describe, expect, spyOn, test, vi } from "bun:test";
import { MCPOAuthFlow, refreshMCPOAuthToken } from "@oh-my-pi/pi-coding-agent/mcp/oauth-flow";
import { logger } from "@oh-my-pi/pi-utils";

const REFRESH_TOKEN = "rt-secret-value";
const CLIENT_SECRET = "cs-secret-value";

const originalOptOut = Bun.env.OMP_ALLOW_INSECURE_MCP_OAUTH;

afterEach(() => {
	vi.restoreAllMocks();
	if (originalOptOut === undefined) delete Bun.env.OMP_ALLOW_INSECURE_MCP_OAUTH;
	else Bun.env.OMP_ALLOW_INSECURE_MCP_OAUTH = originalOptOut;
});

/** A fetch that records whether it was called at all. */
function watchedFetch(): { calls: number; impl: typeof fetch } {
	const state = { calls: 0, impl: null as unknown as typeof fetch };
	state.impl = (async () => {
		state.calls++;
		return new Response(JSON.stringify({ access_token: "t", token_type: "Bearer" }), { status: 200 });
	}) as unknown as typeof fetch;
	return state;
}

/** Drive the refresh grant at `tokenUrl`, carrying a real secret on the wire. */
function refresh(tokenUrl: string, fetchImpl: typeof fetch) {
	return refreshMCPOAuthToken(tokenUrl, REFRESH_TOKEN, "client-id", undefined, { fetch: fetchImpl });
}

/** Drive the authorization-code exchange at `tokenUrl`, carrying a client secret. */
function exchange(tokenUrl: string, fetchImpl: typeof fetch, extra: { clientSecret?: string } = {}): Promise<unknown> {
	const flow = new MCPOAuthFlow(
		{
			authorizationUrl: "https://auth.example.com/authorize",
			tokenUrl,
			clientId: "client-id",
			// No redirect URI validation happens on this path, so a loopback value
			// keeps the helper honest about what the guard is actually deciding.
			...extra,
			fetch: fetchImpl,
		},
		{},
	);
	return flow.exchangeToken("auth-code", "state-x", "http://127.0.0.1:53172/callback");
}

describe("the refresh grant refuses a plaintext endpoint", () => {
	test("does not send the refresh token to a non-HTTPS, non-loopback endpoint", async () => {
		// A host on a LAN: not this machine, and not TLS, so a request here hands
		// the token to whoever is on that network.
		const watched = watchedFetch();
		await expect(refresh("http://192.168.1.50:8080/token", watched.impl)).rejects.toThrow(
			/Refusing to send an MCP OAuth/i,
		);
		// The point of the guard: nothing left the process.
		expect(watched.calls).toBe(0);
	});

	test("does not put the token in the error it surfaces", async () => {
		// A refusal that echoes the request would leak the secret into logs.
		const watched = watchedFetch();
		const error = await refresh("http://192.168.1.50:8080/token", watched.impl).catch((err: unknown) => err as Error);
		expect(String(error)).not.toContain(REFRESH_TOKEN);
	});

	test("allows a loopback endpoint over plain HTTP", async () => {
		// The exemption is load-bearing: without it every local MCP server on
		// http://127.0.0.1 would break, and the fix would get reverted.
		const watched = watchedFetch();
		await refresh("http://127.0.0.1:9000/token", watched.impl);
		expect(watched.calls).toBe(1);
	});

	test("allows an IPv6 loopback endpoint over plain HTTP", async () => {
		// Same "never leaves this machine" property as 127.0.0.1. If the loopback
		// test only covered IPv4, a server bound to ::1 would be refused, and the
		// exemption would look arbitrary rather than principled.
		const watched = watchedFetch();
		await refresh("http://[::1]:9000/token", watched.impl);
		expect(watched.calls).toBe(1);
	});

	test("allows an HTTPS endpoint", async () => {
		const watched = watchedFetch();
		await refresh("https://auth.example.com/token", watched.impl);
		expect(watched.calls).toBe(1);
	});

	test("the opt-out sends the credential and says so", async () => {
		// An operator running an MCP server on a LAN address needs a way through.
		// What must not happen is a silent one: the opt-out is a decision to send a
		// secret in plaintext, so the path has to be deliberate AND visible.
		Bun.env.OMP_ALLOW_INSECURE_MCP_OAUTH = "1";
		const warn = spyOn(logger, "warn").mockImplementation(() => {});
		const watched = watchedFetch();
		await refresh("http://192.168.1.50:8080/token", watched.impl);
		expect(watched.calls).toBe(1);
		expect(warn).toHaveBeenCalled();
		// The warning has to name the endpoint it is about, or an operator reading
		// a log cannot tell which of several MCP servers just leaked.
		expect(JSON.stringify(warn.mock.calls)).toContain("192.168.1.50");
	});
});

/**
 * The token exchange is a *second* call site of the same guard, reached by a
 * different route, and it is the only one that can put a `client_secret` and a
 * PKCE `code_verifier` on the wire. The refresh describe above proves the guard
 * works; these prove this call site still invokes it — deleting the
 * `assertSecureCredentialEndpoint` in `exchangeToken` leaves every test in that
 * block green.
 *
 * The loopback and opt-out branches are deliberately not repeated: both are
 * properties of the shared helper, already covered above. Repeating them here
 * would add rows without adding a distinct contract.
 */
describe("the token exchange refuses a plaintext endpoint", () => {
	test("does not send the client secret to a non-HTTPS, non-loopback endpoint", async () => {
		const watched = watchedFetch();
		await expect(exchange("http://192.168.1.50:8080/token", watched.impl)).rejects.toThrow(
			/Refusing to send an MCP OAuth/i,
		);
		// The point of the guard: nothing left the process.
		expect(watched.calls).toBe(0);
	});

	test("does not put the client secret in the error it surfaces", async () => {
		// The exchange is the path that carries a `client_secret`, so a refusal
		// that echoed the request body would leak the one secret the refresh
		// grant never holds.
		//
		// The rejection is asserted, not just the absence of the secret: without
		// it this test passes vacuously whenever the exchange *succeeds*, because
		// a credentials object trivially does not contain the secret. Asserting
		// only the absence would make it a tautology that no mutation can kill.
		const watched = watchedFetch();
		const settled = await exchange("http://192.168.1.50:8080/token", watched.impl, {
			clientSecret: CLIENT_SECRET,
		}).then(
			() => undefined,
			(err: unknown) => err as Error,
		);
		expect(settled).toBeInstanceOf(Error);
		expect(String(settled)).not.toContain(CLIENT_SECRET);
	});
});
