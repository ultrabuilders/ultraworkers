/**
 * HTTP header precedence and redirect-origin policy for remote MCP transports.
 *
 * Two invariants, applied at every transport fetch:
 *
 * 1. Client-generated headers (protocol headers like `Content-Type`, `Accept`,
 *    `Mcp-Session-Id`, and authorization) take precedence over configured
 *    headers with the same case-insensitive name. Configured headers can never
 *    corrupt the MCP wire protocol via casing tricks.
 * 2. Origin-locked servers (Agent Plugins §7.2.1) never forward configured
 *    headers to a different origin: redirects are followed manually and
 *    configured headers are attached only when the hop targets the configured
 *    origin. Method-changing redirects of non-GET requests are refused.
 */

import { assertUrlAllowed } from "../network-policy";

/**
 * Apply the `configured` network-policy level to one URL.
 *
 * Loopback is allowed at this layer on purpose: the URL came from the user's own
 * config, and local MCP servers are a normal setup.
 *
 * Enforcement here is deliberately SILENT. This runs per request, so a loopback
 * server would emit one warning per MCP call — a log line nobody reads, repeated
 * as fast as the model can call tools, which is the worst of both halves of a
 * warning.
 *
 * There is currently NO user-visible channel for the loopback notice, so GAP-D1's
 * "loopback qua kèm cảnh báo" is enforced-then-silent today. The two obvious
 * homes do not work: `validateServerConfig` drops a server on any non-empty
 * result (`manager.ts:719`) and throws in `config-writer.ts:121`, so a warning
 * pushed there would refuse the very local server (d) exists to allow; and
 * `LoadMCPConfigsResult` has no warnings field. Tracked on m6-gap-m6-12-081.
 */
function assertMcpUrlAllowed(url: string): void {
	assertUrlAllowed(url, "configured", "MCP url");
}

/** Header buckets for one MCP HTTP request. */
interface MCPHeaderSources {
	/** Client-generated HTTP/MCP/authorization headers; win case-insensitively. */
	generated: Record<string, string>;
	/** Configured headers from the server entry (package or user config). */
	configured?: Record<string, string>;
}

/**
 * Merge configured headers under client-generated ones: a configured entry is
 * dropped when a generated header with the same case-insensitive name exists.
 */
export function mergeMCPHeaders({ generated, configured }: MCPHeaderSources): Record<string, string> {
	if (!configured) return { ...generated };
	const generatedNames = new Set<string>();
	for (const name in generated) generatedNames.add(name.toLowerCase());
	const merged: Record<string, string> = {};
	for (const name in configured) {
		if (!generatedNames.has(name.toLowerCase())) merged[name] = configured[name];
	}
	return { ...merged, ...generated };
}

/**
 * Set a client-generated header, removing any existing entry with the same
 * case-insensitive name so the generated value is the only one sent.
 */
export function setGeneratedHeader(headers: Record<string, string>, name: string, value: string): void {
	const lower = name.toLowerCase();
	for (const existing in headers) {
		if (existing.toLowerCase() === lower) delete headers[existing];
	}
	headers[name] = value;
}

/**
 * Return `headers` without any entry whose name case-insensitively matches
 * `name`. Used to keep transport-reserved protocol headers (e.g.
 * `MCP-Protocol-Version`) out of user-configured headers so config can never
 * inject them. Returns the original reference when there is nothing to strip,
 * so the common (no-match) path allocates nothing.
 */
export function withoutHeader(
	headers: Record<string, string> | undefined,
	name: string,
): Record<string, string> | undefined {
	if (!headers) return headers;
	const lower = name.toLowerCase();
	let hasMatch = false;
	for (const key in headers) {
		if (key.toLowerCase() === lower) {
			hasMatch = true;
			break;
		}
	}
	if (!hasMatch) return headers;
	const result: Record<string, string> = {};
	for (const key in headers) {
		if (key.toLowerCase() !== lower) result[key] = headers[key];
	}
	return result;
}

const REDIRECT_STATUSES: Record<number, true> = { 301: true, 302: true, 303: true, 307: true, 308: true };
const MAX_REDIRECT_HOPS = 5;

export interface MCPFetchInit {
	method: "GET" | "POST" | "DELETE";
	body?: string;
	signal?: AbortSignal;
}

/**
 * Fetch an MCP endpoint with header precedence and, for origin-locked servers,
 * manual redirect handling that strips configured headers on cross-origin hops.
 *
 * Non-locked servers keep the platform default redirect behavior. Locked
 * non-GET requests only follow 307/308 (method-preserving); a 301/302/303
 * redirect of a JSON-RPC POST is a connection error, never a silent GET.
 *
 * `timeout: false` keeps the runtime's socket idle timer out of the MCP timeout
 * surface. MCP calls are long-poll shaped — a server may stay silent for as
 * long as the work takes — and that timer would end such a wait even where the
 * operator disabled MCP deadlines outright (`timeout: 0`,
 * `OMP_MCP_TIMEOUT_MS=0`). Deadlines and cancellation stay with `init.signal`,
 * which each transport composes from the configured per-request deadline,
 * caller cancellation, and transport close.
 *
 * Every hop is checked against the `configured` level of the MCP network policy
 * (`../network-policy.ts`), including each redirect target. This is the layer
 * BELOW `origin-lock`, not a replacement for it: origin-lock decides whether
 * configured headers survive a cross-origin hop, and says nothing about where
 * the hop goes. A server that answers with `302 Location: http://169.254.169.254/`
 * passes origin-lock untouched — the origin changed and the headers were
 * stripped correctly — while the request now aims at a cloud metadata endpoint.
 * Loopback stays allowed here because the URL came from the user's own config;
 * a plugin bundle's servers are held to the stricter level when they are declared.
 */
export async function mcpFetch(
	url: string,
	init: MCPFetchInit,
	sources: MCPHeaderSources,
	originLocked: boolean,
): Promise<Response> {
	assertMcpUrlAllowed(url);
	if (!originLocked) {
		return fetch(url, { ...init, headers: mergeMCPHeaders(sources), timeout: false });
	}

	const configuredOrigin = new URL(url).origin;
	let currentUrl = url;
	for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
		const attachConfigured = new URL(currentUrl).origin === configuredOrigin;
		const headers = mergeMCPHeaders(attachConfigured ? sources : { generated: sources.generated });
		const response = await fetch(currentUrl, { ...init, headers, redirect: "manual", timeout: false });
		if (!REDIRECT_STATUSES[response.status]) return response;

		const location = response.headers.get("Location");
		if (!location) return response;
		await response.body?.cancel();
		if (init.method !== "GET" && response.status !== 307 && response.status !== 308) {
			throw new Error(`HTTP ${response.status}: server redirected a ${init.method} request; refusing to follow`);
		}
		currentUrl = new URL(location, currentUrl).href;
		// Checked after resolving against the previous URL, so a relative Location
		// is judged as the absolute address it actually becomes.
		assertMcpUrlAllowed(currentUrl);
	}
	throw new Error(`Too many redirects (> ${MAX_REDIRECT_HOPS}) fetching ${url}`);
}
