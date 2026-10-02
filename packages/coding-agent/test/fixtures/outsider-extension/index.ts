/**
 * An extension that lives outside the repo, registering every surface the
 * programme's test names: a tool, a slash command, a lifecycle hook, a TUI
 * panel, and a mode — with no core change and no hardcoded path.
 *
 * The signature is deliberately loose. This file is loaded by the real
 * discovery path, not imported by a test that could satisfy it with types the
 * extension author would never have; `api` is whatever `ExtensionAPI` is at
 * runtime, and every call below is one the published interface actually has.
 */
export default function outsider(api) {
	api.registerTool({
		name: "outsider_echo",
		label: "Outsider Echo",
		description: "Echoes its input. Registered by an extension installed from outside the repo.",
		parameters: {
			type: "object",
			properties: {
				text: { type: "string", description: "What to echo back." },
			},
			required: ["text"],
		},
		execute: async args => ({
			content: [{ type: "text", text: `outsider heard: ${args?.text ?? ""}` }],
			details: {},
		}),
	});

	api.registerCommand("outsider-ping", {
		description: "Registered by an out-of-repo extension.",
		handler: async () => {},
	});

	api.on("session_start", async () => {});

	// `ctx.ui.setWidget`, not a detached `pi.ui.setWidget`: the panel has to be
	// reachable from the context the hook is handed, which is the only shape an
	// extension author can rely on.
	api.on("session_start", async ctx => {
		ctx.ui.setWidget("outsider-widget", () => [{ type: "text", text: "outsider panel" }]);
	});

	api.registerMode({
		id: "outsider",
		name: "Outsider",
		description: "A mode declared by an extension installed from outside the repo.",
		statusLine: { label: "Outsider" },
		// A write policy, so the mode is not merely decorative: activating it has to
		// reach the same guard the built-in plan mode uses.
		writePolicy: { denyDelete: true },
	});
}
