import { describe, expect, it } from "bun:test";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

// Contract: an extension can register a resolver that maps a name which failed
// to dispatch onto a real tool.
//
// The host already has two of these — an MCP name canonicaliser and a device
// bridge — but both are module-level functions with no way in, so an extension
// whose tools are named differently could only be recovered by mis-transcription
// at runtime, once per session, with an error in between.
//
// The uniqueness rule is the part that matters. A resolver that guesses between
// two plausible targets dispatches a tool the model never asked for, which is
// worse than the error it was meant to remove.

/** The loaded `Extension`, whose resolver list is what the host consults. */
async function loadWith(register: (api: ExtensionAPI) => void) {
	return loadExtensionFromFactory(register as never, "/ext", new EventBus(), new ExtensionRuntime(), "resolver-probe");
}

const advertised = [{ name: "search_docs" }, { name: "search_code" }];

describe("registerToolNameResolver", () => {
	it("keeps a resolver addressable after loading", async () => {
		// A registry that accepted a call and dropped the result would look
		// identical to one that was never consulted.
		const ext = await loadWith(api => {
			api.registerToolNameResolver(name => (name === "find" ? { name: "search_docs" } : undefined));
		});
		expect(ext.toolNameResolvers).toHaveLength(1);
		expect(ext.toolNameResolvers[0]?.("find", advertised)).toEqual({ name: "search_docs" });
	});

	it("leaves an unresolvable name alone", async () => {
		const ext = await loadWith(api => {
			api.registerToolNameResolver(name => (name === "find" ? { name: "search_docs" } : undefined));
		});
		// Returning undefined is the common case and must stay cheap: the host
		// calls every resolver on every miss.
		expect(ext.toolNameResolvers[0]?.("something_else", advertised)).toBeUndefined();
	});

	it("preserves registration order, which decides who wins", async () => {
		// The host stops at the first hit, so a resolver that fires on a guess
		// shadows every later one. Order is the only thing a caller can reason
		// about, which is why appending is deliberate and replacement is not.
		const ext = await loadWith(api => {
			api.registerToolNameResolver(() => ({ name: "search_code" }));
			api.registerToolNameResolver(() => ({ name: "search_docs" }));
		});
		// Both ran, and the first is the one the host would take.
		expect(ext.toolNameResolvers.map(r => r("x", advertised))).toEqual([
			{ name: "search_code" },
			{ name: "search_docs" },
		]);
	});

	it("survives being called with no advertised tools", async () => {
		const ext = await loadWith(api => {
			api.registerToolNameResolver(name => (name === "find" ? { name: "search_docs" } : undefined));
		});
		// A device mount can be reachable without appearing in the advertised set,
		// so a resolver must not assume its input is non-empty.
		expect(() => ext.toolNameResolvers[0]?.("find", [])).not.toThrow();
	});
});
