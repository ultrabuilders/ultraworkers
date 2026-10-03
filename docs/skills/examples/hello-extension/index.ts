// @ts-nocheck — example file; install @oh-my-pi/pi-coding-agent before running
import { z } from "@oh-my-pi/pi-coding-agent";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

export default function helloExtension(pi: ExtensionAPI) {
	// Show a greeting whenever a session starts.
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.notify("Hello from hello-extension!", "info");
	});

	// Register a tool the model can call. A tool is the one surface that shows up
	// on its own: a slash command needs the user to type it, and a hook needs an
	// event, so an extension that registers only those two looks broken when you
	// start a session and no tool of its own is listed.
	pi.registerTool({
		name: "hello_extension",
		label: "Hello",
		description: "Greet someone by name. Use when the user asks for a greeting.",
		parameters: z.object({
			name: z.string().describe("Who to greet"),
		}),
		execute: async (_toolCallId, params) => ({
			content: [{ type: "text", text: `Hello, ${params.name}!` }],
			details: {},
		}),
	});

	// Register a /hello slash command that sends a greeting into the conversation.
	pi.registerCommand("hello", {
		description: "Send a greeting into the conversation",
		handler: async (args, ctx) => {
			const name = args.trim() || "there";
			pi.sendMessage(
				{
					customType: "hello-extension",
					content: `Hello, ${name}!`,
					display: true,
					attribution: "user",
				},
				{ triggerTurn: false },
			);
			ctx.ui.notify("Message sent!", "info");
		},
	});
}
