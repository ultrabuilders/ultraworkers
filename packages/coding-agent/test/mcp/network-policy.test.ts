/**
 * What a user observes when the MCP network policy is wrong.
 *
 * GAP-M6-12 was decided as (d): a URL the user typed is their declared intent, a
 * URL a plugin bundle points at is not. So this file is not "the deny table
 * works" — it is the argument that the two paths differ ONLY where they must,
 * and that each of the four evasion forms is caught. A table missing one form is
 * a table with no effect, and one merged case would hide exactly that, so each
 * form gets its own row.
 */
import { describe, expect, it } from "bun:test";
import {
	assertHeadersAllowed,
	assertUrlAllowed,
	classifyHost,
	isHostDenied,
	type McpHostClass,
} from "@oh-my-pi/pi-coding-agent/mcp/network-policy";

describe("classifyHost — each evasion form on its own", () => {
	it("sees IPv4-mapped loopback, which a plain ::1 check cannot", () => {
		// `::ffff:127.0.0.1` is five zero hextets, 0xffff, 7f00:0001. A table that
		// asks only "is this ::1 or fe80::?" classifies it public and lets an MCP
		// server reach the host's own loopback through the mapped form.
		expect(classifyHost("::ffff:127.0.0.1")).toBe("loopback");
	});

	it("sees a zone-id on link-local instead of parsing it as a host name", () => {
		// `fe80::1%eth0` is a valid scoped literal. Dropping the zone id is what
		// makes the fe80::/10 test fire; a parser that keeps `%eth0` as part of the
		// address does not match the range and lets link-local through.
		expect(classifyHost("fe80::1%eth0")).toBe("link-local");
	});

	it("sees loopback behind a trailing-dot FQDN root", () => {
		// `localhost.` and `127.0.0.1.` are the same hosts with a root label. An
		// exact-match table catches `localhost` and misses `localhost.`.
		expect(classifyHost("localhost.")).toBe("loopback");
	});

	it("sees the whole *.localhost name space, not just the apex", () => {
		// A name table that matches only `localhost` leaves `db.localhost`,
		// which every resolver sends to loopback.
		expect(classifyHost("db.localhost")).toBe("loopback");
	});
});

describe("classifyHost — the ranges the table has to name", () => {
	const rows: Array<[string, McpHostClass]> = [
		["127.0.0.1", "loopback"],
		// Loopback is the whole 127.0.0.0/8, not the single address 127.0.0.1.
		// A table matching the literal string lets 127.0.0.2 through, and it routes
		// to loopback exactly the same way — which is why matching the address
		// instead of the first octet is a hole and not a shortcut.
		["127.0.0.2", "loopback"],
		["127.255.255.254", "loopback"],
		["::1", "loopback"],
		["10.1.2.3", "private"],
		["172.16.0.1", "private"],
		["172.31.255.255", "private"],
		["192.168.1.1", "private"],
		["169.254.169.254", "link-local"],
		["0.0.0.0", "unspecified"],
		["::", "unspecified"],
		["224.0.0.1", "multicast"],
		["example.com", "public"],
		// 172.15/16 and 172.32/16 sit just outside 172.16.0.0/12. A `b >= 16 &&
		// b <= 31` test is correct; a `b >= 8` test would swallow the public space.
		["172.15.0.1", "public"],
		["172.32.0.1", "public"],
	];

	for (const [host, expected] of rows) {
		it(`classifies ${host} as ${expected}`, () => {
			expect(classifyHost(host)).toBe(expected);
		});
	}
});

describe("classifyHost — a first-octet match is not a range match", () => {
	it("sees loopback past the apex address", () => {
		expect(classifyHost("127.0.0.2")).toBe("loopback");
	});

	it("sees IPv6 loopback written out longhand", () => {
		// `0:0:0:0:0:0:0:1` is ::1. A table comparing the string to "::1" misses it,
		// and it is the same address.
		expect(classifyHost("0:0:0:0:0:0:0:1")).toBe("loopback");
	});

	it("sees the IPv4-compatible form, which carries a dotted tail", () => {
		// `::127.0.0.1` parses as six zero hextets plus 7f00:0001. It looks like
		// IPv6 and routes to loopback, so a v6-only range test never catches it.
		expect(classifyHost("::127.0.0.1")).toBe("loopback");
	});
});

describe("the configured path — the user's own URL, loopback is allowed but never silent", () => {
	it("accepts a loopback URL, and says so instead of allowing it quietly", () => {
		// The whole point of (d): local MCP is a normal setup and blocking it
		// breaks the thing the user asked for. But it also reaches services on
		// this machine, so the user is told. A regression that drops the warning
		// leaves the reach invisible.
		const result = assertUrlAllowed("http://127.0.0.1:3000/mcp", "configured");

		expect(result.url.hostname).toBe("127.0.0.1");
		expect(result.warning).toContain("loopback");
	});

	it("accepts plain http, because a local MCP server is not https", () => {
		// Requiring https here is how option (a) broke local MCP everywhere. The
		// scheme rule has to differ by level or the carve-out is meaningless.
		expect(() => assertUrlAllowed("http://localhost:3000", "configured")).not.toThrow();
	});

	it("allows a private LAN address, because a home MCP server is not an attack", () => {
		expect(() => assertUrlAllowed("http://192.168.1.10:8080/mcp", "configured")).not.toThrow();
	});

	it("allows embedded credentials the user configured themselves", () => {
		expect(() => assertUrlAllowed("https://user:pass@mcp.example.com/", "configured")).not.toThrow();
	});

	it("still refuses the cloud metadata endpoint", () => {
		// This is the SSRF vector the item exists for, and it is refused on BOTH
		// paths. A carve-out for loopback that also forgives link-local reopens
		// the exact hole (d) was meant to keep shut.
		expect(() => assertUrlAllowed("http://169.254.169.254/latest/meta-data/", "configured")).toThrow(/link-local/);
	});

	it("still refuses multicast and unspecified", () => {
		expect(() => assertUrlAllowed("http://224.0.0.1/", "configured")).toThrow(/multicast/);
		expect(() => assertUrlAllowed("http://0.0.0.0/", "configured")).toThrow(/unspecified/);
	});
});

describe("the plugin path — deny-first, like gajae's bundle policy", () => {
	it("refuses a loopback URL a bundle declared", () => {
		expect(() => assertUrlAllowed("https://127.0.0.1/mcp", "plugin")).toThrow(/loopback/);
	});

	it("refuses loopback behind the mapped-IPv6 form a bundle would use", () => {
		expect(() => assertUrlAllowed("https://[::ffff:127.0.0.1]/mcp", "plugin")).toThrow(/loopback/);
	});

	it("refuses a private LAN address, which the configured path allows", () => {
		// The two levels differing here is the whole decision. Same URL, opposite
		// outcomes, because the paths mean different things.
		expect(() => assertUrlAllowed("https://192.168.1.10/mcp", "plugin")).toThrow(/private/);
		expect(() => assertUrlAllowed("https://192.168.1.10/mcp", "configured")).not.toThrow();
	});

	it("refuses plain http", () => {
		expect(() => assertUrlAllowed("http://mcp.example.com/", "plugin")).toThrow(/scheme not allowed/);
	});

	it("refuses embedded credentials", () => {
		expect(() => assertUrlAllowed("https://user:pass@mcp.example.com/", "plugin")).toThrow(/credentials/);
	});

	it("returns no warning when it refuses, because it never lets the URL through", () => {
		// A refusal that also carries a warning reads as "allowed, with a note" to
		// any caller that checks `warning` before `throw`. The two must not blur.
		expect(() => assertUrlAllowed("https://127.0.0.1/mcp", "plugin")).toThrow();
	});
});

describe("preservation — a public server must keep working on both paths", () => {
	it("accepts an ordinary public https endpoint unchanged", () => {
		// The negative case that makes the whole item safe: tightening a policy
		// that rejects a legitimate URL is a breaking change against every user
		// already running this, and it would not turn any test red.
		for (const level of ["configured", "plugin"] as const) {
			const result = assertUrlAllowed("https://mcp.example.com/v1", level);
			expect(result.url.hostname).toBe("mcp.example.com");
			expect(result.warning).toBeUndefined();
		}
	});

	it("agrees with itself: isHostDenied is exactly what assertUrlAllowed enforces", () => {
		// The policy table and the classifier are two halves of one rule. If they
		// drift, a host can classify one way and be judged the other, and the
		// throw becomes unreachable for it.
		for (const hostClass of ["public", "loopback", "private", "link-local", "multicast", "unspecified"] as const) {
			for (const level of ["configured", "plugin"] as const) {
				const denied = isHostDenied(hostClass, level);
				if (level === "plugin") expect(denied).toBe(hostClass !== "public");
				if (level === "configured") {
					expect(denied).toBe(["link-local", "multicast", "unspecified"].includes(hostClass));
				}
			}
		}
	});
});

describe("assertHeadersAllowed — CRLF injection into a request header", () => {
	it("refuses a header value carrying CRLF", () => {
		// A plugin bundle supplying headers is the source; a CRLF in a value
		// splits the request the host sends.
		expect(() => assertHeadersAllowed({ Authorization: "x\r\nX-Injected: 1" })).toThrow(/control characters/);
	});

	it("refuses a header NAME carrying CRLF", () => {
		expect(() => assertHeadersAllowed({ "X-A\r\nX-B": "1" })).toThrow(/control characters/);
	});

	it("accepts an ordinary header, including one holding a colon and a space", () => {
		// The test must not be "it rejects anything unusual" — `Bearer abc.def`
		// has punctuation and is the single most common value here.
		expect(() => assertHeadersAllowed({ Authorization: "Bearer eyJhbGciOi.J9-sIg_x" })).not.toThrow();
		expect(() => assertHeadersAllowed(undefined)).not.toThrow();
	});
});
