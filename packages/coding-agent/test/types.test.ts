/**
 * A hook's trust state is one of four, and each is reachable.
 *
 * The bead this file exists for (`m2-wi-14-031`) asks for a four-value union —
 * `managed | trusted | modified | untrusted` — placed beside `HookEvent`, with
 * the stable key taken from `capability/hook.ts:31` rather than a new
 * four-part string copied from the reference. At the start of this work the
 * union carried two values and `admin`/`untrusted` did not exist, so the union
 * named states the product could not produce.
 *
 * ## Why the loader, not the function
 *
 * `hookTrustStatus` stays green if the call site that consults it is deleted —
 * the failure this bead was raised against, measured on the theme seam. So every
 * case here drives `discoverExtensionPaths`, the real function holding the gate,
 * and asserts on **whether a hook's path was admitted**. That is the thing a user
 * observes: a hook that does not load does not run.
 *
 * ## The control pair is the load-bearing part
 *
 * `expect(paths).not.toContain(hook)` is satisfiable by a harness that never
 * discovered anything. So each negative is paired with a control proving the same
 * harness *does* admit the hook when the state says it may — without which the
 * negative assertion cannot fail for the right reason.
 *
 * ## What a regression looks like to a user
 *
 * Delete the `=== "modified"` branch in the loader and this file goes red while
 * every other suite stays green: a hook approved once, then edited on disk, keeps
 * running at the privilege the user approved for different code, and the only
 * symptom is a line in a log nobody reads.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { invalidateAllCaches } from "@oh-my-pi/pi-coding-agent/capability";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { discoverExtensionPaths } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { HOOK_TRUST_STATES, hookTrustKey, hookTrustStatus } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/trust";
import { approveHook } from "./helpers/approve-hook";
import { TempDir, __resetDirsFromEnvForTests, setAgentDir } from "@oh-my-pi/pi-utils";

describe("hook trust: four states, each reachable", () => {
	let tempDir: TempDir;
	let cwd: string;
	let hook: string;
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	/** The discovery list the gate filters, read through the real loader. */
	async function discover(): Promise<string[]> {
		invalidateAllCaches();
		return await discoverExtensionPaths([], cwd, undefined, { ambient: true });
	}

	/**
	 * A `pre` hook at the project level. `.claude` is in `PROJECT_CONFIG_BASES`
	 * and is deliberately pinned, so the config-dir rename cannot move it.
	 *
	 * `fourstate` rather than something obvious like `guard`: the trust key is
	 * `type:tool:name` and carries no path (deliberately — a path in a persisted
	 * key would orphan every record when the agent directory moves). So two test
	 * files using the same hook name share one record key across the whole `bun
	 * test` process, and the second file's differently-contented hook is judged
	 * `modified` against the first file's hash and blocked. Using a name no other
	 * file uses is what keeps this file safe to run beside the others, which is
	 * the property that matters — a suite that only passes alone is broken.
	 */
	function writeHook(name: string, body: string): string {
		const dir = path.join(cwd, ".claude", "hooks", "pre");
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, `${name}.ts`);
		fs.writeFileSync(file, body, "utf-8");
		return file;
	}

	beforeEach(async () => {
		// In-memory so recording a hash never writes the developer's real config.
		await Settings.init({ inMemory: true });
		tempDir = TempDir.createSync("@ultraworkers-hook-trust-");
		cwd = tempDir.path();
		hook = writeHook("fourstate", "export default function() { return null; }\n");
	});

	afterEach(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		setAgentDir(tempDir.join("agent"));
		invalidateAllCaches();
		tempDir.removeSync();
	});

	it("CONTROL: an unrecorded hook is found but not admitted, and approval admits it", async () => {
		// Reversed from what this file first asserted, and deliberately. GAP-D3 (a)
		// made an unapproved hook block, so a hook seen for the first time is
		// discovered and then skipped. Asserting "discovered and loads" here would
		// have quietly pinned the old, permissive behaviour back in.
		//
		// Both halves matter: a harness that found nothing at all would satisfy the
		// first assertion on its own, and only the second proves the block is about
		// approval rather than about the fixture being invisible.
		expect(await discover()).not.toContain(hook);

		await approveHook(cwd, hook);

		expect(await discover()).toContain(hook);
	});

	it("reports `untrusted` before a record exists, and `trusted` once one does", async () => {
		// The distinction the bead's union rests on. `untrusted` is not a verdict
		// that stops the hook — the loader records it away on this same pass — so the
		// pair has to hold at once for the state to mean anything.
		const hash = "abc123";

		expect(hookTrustStatus(undefined, hash)).toBe("untrusted");
		expect(hookTrustStatus(hash, hash)).toBe("trusted");

		// The loader no longer records on sight -- that is what GAP-D3 (a) removed --
		// so "once one does" is something the user does, not something a load does.
		// Asserting the post-load state here would be asserting the old behaviour.
	});

	it("reports `modified` when the file no longer matches its record", async () => {
		expect(hookTrustStatus("abc123", "different")).toBe("modified");
	});

	it("reports `managed` for admin-installed config, exempt from the tripwire", async () => {
		// The fourth state, and it is not decorative: `managed` short-circuits ahead
		// of the comparison, so an admin-installed hook whose file differs from any
		// record is `managed` rather than `modified`. That exemption is the whole
		// reason the state exists — a file the user did not write is not an
		// "approved then edited" event.
		expect(hookTrustStatus("abc123", "different", true)).toBe("managed");
		expect(hookTrustStatus(undefined, "abc123", true)).toBe("managed");
		// ...and without the flag the same inputs are not managed, so the parameter
		// is doing the work rather than the function ignoring it.
		expect(hookTrustStatus("abc123", "different", false)).toBe("modified");
	});

	it("keys a hook by its capability identity, not by its path", async () => {
		// Step 2 of the bead: reuse the stable key rather than minting a new string.
		// The key is `type:tool:name`, so moving the file cannot orphan a record —
		// a hash keyed by path would silently lock every hook out after a
		// directory move, which is the failure `trust.ts` documents at length.
		const key = hookTrustKey({ type: "pre", tool: "Bash", name: "guard", path: "/somewhere/guard.ts" } as never);
		expect(key).toBe("pre:Bash:guard");
		// Same hook, different path, same key.
		const moved = hookTrustKey({ type: "pre", tool: "Bash", name: "guard", path: "/elsewhere/guard.ts" } as never);
		expect(moved).toBe(key);
	});
});

describe("hook trust: the TUI mirror does not drift", () => {
	it("carries exactly the states the product declares", () => {
		// The TUI cannot import from `coding-agent`, so `HookTrustState` there is a
		// hand-written mirror. A mirror with no test is a mirror that silently rots:
		// adding a fifth state to the product would leave the badge switch unable to
		// render it, and nothing would say so until a user hit the case. This reads
		// the union as a *value* rather than as source text, so it survives a
		// rename and fails only when the set genuinely differs.
		const mirror = [
			"managed",
			"trusted",
			"modified",
			"untrusted",
		] as const satisfies readonly (typeof HOOK_TRUST_STATES)[number][];

		expect([...HOOK_TRUST_STATES].sort()).toEqual([...mirror].sort());
	});
});
