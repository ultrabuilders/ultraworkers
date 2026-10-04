import { afterEach, describe, expect, it } from "bun:test";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { clearExtensionBuckets } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { resolveApproval, type ApprovalSubject } from "@oh-my-pi/pi-coding-agent/tools/approval";
import { declaredEffects, releaseToolEffects } from "@oh-my-pi/pi-coding-agent/tools/effects";
import type { ExtensionRuntime } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";

/**
 * An extension written OUTSIDE this repo must be able to say what its tool reaches.
 *
 * `declareToolEffects` already existed and was already gated, but nothing on the
 * extension path could reach it: `ToolDefinition` had no `effects` field, so the only
 * caller in the tree was a test. A seam that exists and is never called is
 * indistinguishable from no seam at all, which is exactly the failure this file
 * exists to make impossible to reintroduce.
 *
 * It drives `loadExtensionFromFactory` — the same entry point a real out-of-repo
 * extension is loaded through — rather than calling the registry directly, so what is
 * covered is the wiring rather than the function that already had a test.
 *
 * The contract a plugin author depends on, stated as a user-visible outcome: a
 * `tools.approval.effects` policy the user wrote for `network` is asked of an
 * extension tool that says it reaches the network, and is NOT asked of one that does
 * not — without the user writing a command pattern for a tool whose internals they
 * cannot see.
 *
 * The unload half is not bookkeeping. The registry is keyed by TOOL NAME, so a
 * declaration left behind does not merely linger: the next tool registered under that
 * name inherits a floor it never declared, and it keeps narrowing calls for a
 * directory no longer loaded. That residue produces no error and no diagnostic, which
 * is what makes it worth a test rather than a code-reading exercise.
 *
 * The registry is process-wide, so every case withdraws what it declared, and cases
 * that need two owners use two distinct names.
 */

const subject = (name: string): ApprovalSubject =>
	({
		name,
		approval: () => "exec",
		formatApprovalDetails: () => name,
	}) as ApprovalSubject;

// `resolveApproval` takes the user-policy object itself, and `effectPoliciesFrom`
// reads `.effects` off it directly — the real settings layer hands the sub-object
// over, so an extra `approval` wrapper here would test a shape nothing produces.
const effectsPolicy = (effects: Record<string, string>) => ({ effects });

/** The parts of the runtime an extension that only registers a tool never touches. */
// Only what `loadExtensionFromFactory` reads: it checkpoints pending provider
// registrations so a factory that throws restores them. Named rather than spread
// from a partial so a new member the factory starts reading fails here instead of
// silently reading `undefined`.
const inertRuntime = {
	pendingProviderRegistrations: [],
	activate() {},
	dispose() {},
} as unknown as ExtensionRuntime;

const loaded: string[] = [];
afterEach(() => {
	for (const owner of loaded.splice(0)) releaseToolEffects(owner);
});

/** Load a factory extension named `name` whose `activate` runs `body`. */
async function loadExtension(name: string, body: (api: { registerTool(tool: unknown): void }) => void) {
	const extension = await loadExtensionFromFactory(
		(api: { registerTool(tool: unknown): void }) => body(api),
		process.cwd(),
		new EventBus(),
		inertRuntime,
		name,
	);
	loaded.push(extension.path);
	return extension;
}

const tool = (name: string, effects?: string[]) => ({
	name,
	label: name,
	description: `tool ${name}`,
	parameters: { type: "object", properties: {} },
	...(effects ? { effects } : {}),
});

describe("an extension's declared effect reaches the approval gate", () => {
	it("asks for a declared effect even under yolo, where an undeclared tool is not asked", async () => {
		const declared = "ext-declared-network";
		await loadExtension("ext-owner-declares", api => api.registerTool(tool(declared, ["network"])));

		const decided = resolveApproval(subject(declared), {}, "yolo", effectsPolicy({ network: "prompt" }));

		// Without the declaration this resolves to `allow` under yolo; the whole point
		// of declaring is that the user still gets asked.
		expect(decided.policy).toBe("prompt");
	});

	it("leaves a tool that declares nothing on its existing path", async () => {
		const undeclared = "ext-no-effects";
		await loadExtension("ext-owner-silent", api => api.registerTool(tool(undeclared)));

		const decided = resolveApproval(subject(undeclared), {}, "yolo", effectsPolicy({ network: "prompt" }));

		expect(decided.policy).toBe("allow");
	});

	it("stops gating the tool once the extension that declared it is unloaded", async () => {
		const name = "ext-residue-tool";
		const extension = await loadExtension("ext-owner-residue", api => api.registerTool(tool(name, ["network"])));
		expect(declaredEffects(name).has("network")).toBe(true);

		clearExtensionBuckets(extension);

		// Both halves: the entry is gone, not merely shadowed by a built-in, and the
		// gate agrees. A name-keyed registry can get either wrong independently.
		expect(declaredEffects(name).has("network")).toBe(false);
		const decided = resolveApproval(subject(name), {}, "yolo", effectsPolicy({ network: "prompt" }));
		expect(decided.policy).toBe("allow");
	});

	it("withdraws only the unloading extension's declaration", async () => {
		// Two extensions declaring the same effect for one tool name is legitimate —
		// that is why contributions are reference counted. If unloading one took the
		// other's with it, a live tool would silently lose its floor.
		const shared = "ext-shared-name";
		const first = await loadExtension("ext-owner-first", api => api.registerTool(tool(shared, ["network"])));
		await loadExtension("ext-owner-second", api => api.registerTool(tool(shared, ["network"])));

		clearExtensionBuckets(first);

		expect(declaredEffects(shared).has("network")).toBe(true);
	});

	it("refuses an effect it does not know, and registers nothing at all", async () => {
		// Partial registration is the failure that matters: a tool that ends up with
		// `network` but not `fs-write` is gated for one resource and wide open for
		// another, and nothing reports the gap.
		const name = "ext-bad-effect";
		await expect(
			loadExtension("ext-owner-invalid", api => api.registerTool(tool(name, ["network", "filesystem" as string]))),
		).rejects.toThrow(/Unknown tool effect/);

		expect(declaredEffects(name).size).toBe(0);
	});
});
