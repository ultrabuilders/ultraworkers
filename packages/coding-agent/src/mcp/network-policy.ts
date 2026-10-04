/**
 * Network policy for MCP endpoints, ported from gajae's third-party bundle
 * policy (`extensibility/gjc-plugins/mcp-policy.ts`, MIT).
 *
 * Gajae applies one deny-first table to plugin-bundle MCP servers only. This
 * module keeps gajae's *classification* verbatim — the octet parsing, the IPv6
 * expansion, the mapped/compatible-IPv4 handling, the zone-id strip and the
 * trailing-dot strip — and splits the *policy* into two levels, because GAP-D1
 * was decided as (d): a URL the user typed themselves and a URL a plugin bundle
 * points at are not the same statement of intent.
 *
 * - `configured` — the user's own `mcp.json` / Claude config / native config.
 *   Loopback and private ranges are ALLOWED, because someone typing
 *   `http://127.0.0.1:3000` is declaring what they mean; local MCP servers are
 *   a normal setup and blocking them would break the thing the user asked for.
 *   Link-local, multicast and unspecified stay denied on every path: those reach
 *   cloud metadata endpoints (`169.254.169.254`) and nothing legitimate.
 * - `plugin` — a third-party bundle's declared servers. Deny-first, like gajae:
 *   HTTPS only, no embedded credentials, and no address that is not public.
 *
 * A loopback `configured` URL is returned with a warning rather than silently
 * allowed, so the user can see the reach when it happens.
 */

/** Which policy applies. See the module doc for what each one permits. */
export type McpNetworkPolicyLevel = "plugin" | "configured";

/**
 * How a host literal is classified. Splitting classification from policy is
 * what lets one ported table serve two levels: gajae bakes the verdict into
 * `isDeniedIpv4`, which cannot express "allow loopback, deny link-local".
 */
export type McpHostClass = "public" | "loopback" | "private" | "link-local" | "multicast" | "unspecified";

/** Host classes each level refuses outright. */
const DENIED_BY_LEVEL: Readonly<Record<McpNetworkPolicyLevel, ReadonlySet<McpHostClass>>> = {
	// Deny-first, matching gajae. Only a public address is reachable from a bundle.
	plugin: new Set<McpHostClass>(["loopback", "private", "link-local", "multicast", "unspecified"]),
	// The SSRF/metadata vector, without breaking local MCP. Private ranges stay
	// reachable here on purpose: a LAN MCP server is a normal setup, and this
	// level exists precisely so ordinary users are not broken.
	configured: new Set<McpHostClass>(["link-local", "multicast", "unspecified"]),
};

/** Ported from gajae `mcp-policy.ts:20-26`. */
function ipv4ToOctets(host: string): number[] | null {
	const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (!m) return null;
	const octets = m.slice(1, 5).map(Number);
	if (octets.some(o => o < 0 || o > 255)) return null;
	return octets;
}

/** Ported from gajae `mcp-policy.ts:28-40`, returning a class rather than a verdict. */
export function classifyIpv4(host: string): McpHostClass {
	const o = ipv4ToOctets(host);
	if (!o) return "public";
	const [a, b] = o;
	if (a === 127) return "loopback"; // loopback 127.0.0.0/8
	if (a === 10) return "private"; // private 10.0.0.0/8
	if (a === 172 && b >= 16 && b <= 31) return "private"; // private 172.16.0.0/12
	if (a === 192 && b === 168) return "private"; // private 192.168.0.0/16
	if (a === 169 && b === 254) return "link-local"; // link-local 169.254.0.0/16 (incl 169.254.169.254 metadata)
	if (a === 0) return "unspecified"; // 0.0.0.0/8 unspecified/this-network
	if (a >= 224) return "multicast"; // multicast/reserved 224.0.0.0/4 and 240.0.0.0/4
	return "public";
}

/**
 * Expand an IPv6 literal (with optional zone id) to 8 hextets, or null.
 * Ported from gajae `mcp-policy.ts:43-76`.
 */
function expandIpv6(host: string): number[] | null {
	let h = host.toLowerCase().replace(/^\[|\]$/g, "");
	const zone = h.indexOf("%");
	if (zone >= 0) h = h.slice(0, zone); // strip zone id (e.g. %eth0 / %25eth0)
	if (!h.includes(":")) return null;
	// Handle embedded dotted IPv4 tail by converting it to two hextets.
	const dotted = h.match(/(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
	if (dotted) {
		const octs = ipv4ToOctets(dotted[2] ?? "");
		if (!octs) return null;
		const hi = ((octs[0] << 8) | octs[1]).toString(16);
		const lo = ((octs[2] << 8) | octs[3]).toString(16);
		h = `${dotted[1]}${hi}:${lo}`;
	}
	const parts = h.split("::");
	if (parts.length > 2) return null;
	const head = parts[0] ? parts[0].split(":") : [];
	const tail = parts.length === 2 ? (parts[1] ? parts[1].split(":") : []) : null;
	let groups: string[];
	if (tail === null) {
		groups = head;
	} else {
		const fill = 8 - head.length - tail.length;
		if (fill < 0) return null;
		groups = [...head, ...Array(fill).fill("0"), ...tail];
	}
	if (groups.length !== 8) return null;
	const out: number[] = [];
	for (const g of groups) {
		if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
		out.push(Number.parseInt(g, 16));
	}
	return out;
}

/**
 * Ported from gajae `mcp-policy.ts:78-95`, returning a class rather than a verdict.
 *
 * The mapped/compatible-IPv4 tail is the evasion the plain IPv4 path cannot see:
 * `::ffff:127.0.0.1` is six zero hextets, `0xffff`, then `7f00:0001`, and a table
 * that stops at "is this `::1`?" lets it through.
 */
export function classifyIpv6(host: string): McpHostClass {
	const g = expandIpv6(host);
	if (!g) return "public";
	const isZero = (n: number, count: number): boolean => g.slice(0, count).every(x => x === n);
	if (g.every(x => x === 0)) return "unspecified"; // :: unspecified
	if (isZero(0, 7) && g[7] === 1) return "loopback"; // ::1 loopback
	if ((g[0] & 0xffc0) === 0xfe80) return "link-local"; // fe80::/10 link-local
	if ((g[0] & 0xfe00) === 0xfc00) return "private"; // fc00::/7 unique-local
	if ((g[0] & 0xff00) === 0xff00) return "multicast"; // ff00::/8 multicast
	// IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d -> check embedded v4.
	const mappedFfff = isZero(0, 5) && g[5] === 0xffff;
	const compat = isZero(0, 6) && !(g[6] === 0 && g[7] === 0);
	if (mappedFfff || compat) {
		const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
		return classifyIpv4(v4);
	}
	return "public";
}

/**
 * Classify a host literal. Ported from gajae `isDeniedHostLiteral`
 * (`mcp-policy.ts:97-102`), including the two name-based forms a range table
 * cannot express: `localhost` and `*.localhost`.
 */
export function classifyHost(host: string): McpHostClass {
	// Strip trailing dots (FQDN root) so localhost. / foo.localhost. are caught.
	const lowered = host.toLowerCase().replace(/\.+$/, "");
	if (lowered === "localhost" || lowered.endsWith(".localhost")) return "loopback";
	const v4 = classifyIpv4(lowered);
	if (v4 !== "public") return v4;
	return classifyIpv6(host);
}

/** Whether this level refuses a host of the given class. */
export function isHostDenied(hostClass: McpHostClass, level: McpNetworkPolicyLevel): boolean {
	return DENIED_BY_LEVEL[level].has(hostClass);
}

export interface AllowedUrl {
	url: URL;
	/**
	 * Set when the URL is allowed but reaches something the user should know
	 * about — currently a loopback host on the `configured` path. Never set on
	 * the `plugin` path, which refuses loopback outright.
	 */
	warning?: string;
}

function refuse(label: string, message: string): never {
	throw new Error(`MCP network policy (${label}): ${message}`);
}

/**
 * Check a URL against a policy level and return the parsed URL.
 *
 * Throws on a denied scheme, embedded credentials, or a denied host class.
 * Returns the URL (plus a warning when applicable) otherwise, so a caller can
 * report the warning without re-parsing.
 */
export function assertUrlAllowed(rawUrl: string, level: McpNetworkPolicyLevel, label = "url"): AllowedUrl {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return refuse(label, `not a valid URL: ${rawUrl}`);
	}
	// A plain http:// endpoint is normal for a local MCP server and impossible for
	// a third-party bundle, which is why the scheme rule differs by level.
	const allowedSchemes = level === "plugin" ? ["https:"] : ["http:", "https:"];
	if (!allowedSchemes.includes(url.protocol)) {
		return refuse(
			label,
			`scheme not allowed (${
				level === "plugin" ? "https only for plugin bundles" : "http or https"
			}): ${url.protocol}`,
		);
	}
	// Credentials are the user's own when they configured the server, and a
	// phishing surface when a bundle supplies them.
	if (level === "plugin" && (url.username || url.password)) {
		return refuse(label, "must not embed credentials");
	}
	if (!url.hostname) {
		return refuse(label, "has no host");
	}
	const hostClass = classifyHost(url.hostname);
	if (isHostDenied(hostClass, level)) {
		return refuse(label, `host is ${hostClass} and this path denies ${hostClass}: ${url.hostname}`);
	}
	const warning =
		hostClass === "loopback"
			? `${label} reaches a loopback address (${url.hostname}). That is allowed because you configured it, but it means this MCP server can reach services on this machine.`
			: undefined;
	return { url, ...(warning ? { warning } : {}) };
}

/**
 * Reject headers carrying control characters / CRLF injection.
 * Ported from gajae `mcp-policy.ts:131-138`.
 */
export function assertHeadersAllowed(headers: Record<string, string> | undefined, label = "header"): void {
	if (!headers) return;
	for (const [key, value] of Object.entries(headers)) {
		if (/[\r\n\0]/.test(key) || /[\r\n\0]/.test(value)) {
			refuse(label, `header contains control characters: ${key}`);
		}
	}
}
