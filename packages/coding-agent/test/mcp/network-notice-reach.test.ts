/**
 * The loopback notice has to actually be REPORTED, not merely produced.
 *
 * `connectServers` returns `networkWarnings` and logs it. Both halves can rot
 * silently and neither shows up in the classification tests: the table can stay
 * perfect while nothing ever calls it, and the value can stay populated on the
 * result while every caller throws the result away. That second shape already
 * happened here — three of five `connectServers` call sites discarded the whole
 * result, including startup, so a user configuring `http://127.0.0.1:3000/mcp`
 * saw nothing at all and the gate was green.
 *
 * So this file asserts the SINK. What a user would have to see: a line naming
 * the server and saying it reaches loopback, for a server that reaches loopback,
 * and no such line for one that does not.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { TempDir, logger } from "@oh-my-pi/pi-utils";
import { MCPManager } from "@oh-my-pi/pi-coding-agent/mcp/manager";

describe("a user-configured MCP server that reaches loopback", () => {
	let tempDir: TempDir;
	let warnSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		tempDir = TempDir.createSync("@ultraworkers-loopback-notice-");
		warnSpy = spyOn(logger, "warn");
	});

	afterEach(() => {
		warnSpy.mockRestore();
		tempDir.removeSync();
	});

	/**
	 * Connect one server and return ONLY the lines that reached the log.
	 *
	 * Deliberately excludes `result.networkWarnings`. A returned array is not a
	 * sink — a caller can hold a value and never show it, which is precisely what
	 * happened here. Asserting on both made this test pass with the reporting
	 * loop deleted, i.e. it was green while checking nothing.
	 *
	 * The URL is pointed at a closed port on purpose: the notice is produced from
	 * the server's config, so it must not depend on the connection succeeding —
	 * which is also what keeps this fast and free of network flakiness.
	 */
	async function connect(url: string): Promise<{ logged: string[]; errors: Map<string, string> }> {
		const manager = new MCPManager(tempDir.path());
		const result = await manager.connectServers({ local: { type: "http", url } }, {});
		const logged = warnSpy.mock.calls.map((call: unknown[]) => String(call[0]));
		await manager.disconnectAll();
		return { logged, errors: result.errors };
	}

	async function noticesFor(url: string): Promise<string[]> {
		return (await connect(url)).logged;
	}

	test("reports that a loopback server reaches this machine", async () => {
		// Port 9 (discard) on loopback: nothing listens, so the connect fails
		// immediately, and the notice still has to appear. A notice tied to
		// connection success would vanish exactly when a user needs it most.
		const notices = await noticesFor("http://127.0.0.1:9/mcp");

		const notice = notices.find(n => n.includes("local") && n.includes("loopback"));
		expect(notice).toBeDefined();
	});

	test("says nothing for an ordinary public server", async () => {
		// The preservation row. A gate that nags about every remote server trains
		// the user to ignore it, and no classification test can catch that.
		const notices = await noticesFor("https://mcp.example.com/v1");

		expect(notices.find(n => n.includes("loopback"))).toBeUndefined();
	});

	test("refuses a link-local server outright instead of merely not warning about it", async () => {
		// The row that keeps SSRF shut, and the one most easily broken without
		// anyone noticing: asserting the ABSENCE of a loopback notice passes
		// whether or not the gate runs, because a link-local URL never produces
		// such a notice. So assert the BLOCK — the connection fails, and it fails
		// for the policy's reason.
		//
		// Measured: deleting `assertMcpUrlAllowed` from `mcpFetch` entirely left
		// all three rows of this file green before it was written this way.
		const { errors } = await connect("http://169.254.169.254/latest/meta-data/");

		expect(errors.get("local")).toContain("network policy");
		expect(errors.get("local")).toContain("link-local");
	});
});
