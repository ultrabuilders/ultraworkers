/**
 * An extension that lives outside the repo, registering every surface the
 * programme's test names: a tool, a slash command, a lifecycle hook, a TUI
 * panel, and a mode — with no core change and no hardcoded path.
 *
 * Typed, and that is the point rather than a nicety. This is the file an author
 * copies, so every parameter is annotated from the published `ExtensionAPI` —
 * the same import the shipped examples use. An untyped fixture loads fine and
 * teaches its reader nothing, while the mistakes an author actually hits are
 * exactly these: `execute` takes five arguments, and an unannotated `api` is an
 * implicit `any` under this repo's settings.
 */
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

export default function outsider(api: ExtensionAPI): void {
	api.registerTool({
		name: "outsider_echo",
		label: "Outsider Echo",
		description: "Echoes its input. Registered by an extension installed from outside the repo.",
		// `api.zod`, the builder the host injects — not `import { z } from
		// "@oh-my-pi/omptype/zod"`. The injected builder is how a real extension is
		// written: it needs no import, so it cannot break when the host's own
		// resolution of `@oh-my-pi/*` is not the one you want.
		//
		// An earlier version of this comment claimed a package import of any
		// `@oh-my-pi/*` module FAILS from an out-of-repo extension. That is measured
		// FALSE in all three install modes — see the full correction and the host-side
		// mechanism on `api.registerSetting` below, and `epic-ibg4` for the runs.
		// `api.zod` stays the right thing to write — just not for that reason.
		parameters: api.zod.object({
			text: api.zod.string().describe("What to echo back."),
		}),
		// Five parameters in this order: call id, parsed params, abort signal,
		// update callback, extension context. Passing only the params is the
		// mistake a reader makes first, so they are written out rather than
		// elided behind a rest signature.
		execute: async (_toolCallId, params: { text: string }) => ({
			content: [{ type: "text", text: `outsider heard: ${params.text}` }],
			details: {},
		}),
	});

	api.registerCommand("outsider-ping", {
		description: "Registered by an out-of-repo extension.",
		handler: async () => {},
	});

	api.registerSetting({
		// `api.pluginSettingId`, the builder the host injects — not an import of
		// `extensibility/settings`. It resolves to the same function either way; the
		// injected form is written here because it reads the same as `api.zod` and
		// needs no import at all.
		//
		// An earlier version of this comment said the import was IMPOSSIBLE from an
		// out-of-repo extension — "a config directory has no `node_modules` to walk up
		// to", so the subpath threw ERR_MODULE_NOT_FOUND. That is measured FALSE in all
		// three install modes (see `epic-ibg4`): the host resolves its own specifiers
		// via a `Bun.plugin` filter on `@oh-my-pi/pi-coding-agent/*` that answers from
		// the HOST's own directory, so the anchor travels with the install and not with
		// the extension.
		//
		// The `plugins.` prefix is not cosmetic. `config/registry.ts:899` refuses any id
		// outside `plugins.<id>.<key>`, and it throws during registration — so a flat id
		// does not merely lose this one key, it fails the whole load and takes the other
		// surfaces down with it. That much is what this line is really for.
		id: api.pluginSettingId("outsider", "greeting"),
		type: "string",
		default: "outsider default",
	});

	api.on("session_start", async () => {});

	// `ctx.ui.setWidget`, not a detached `pi.ui.setWidget`: the panel is reached
	// through the context the hook is handed, the only shape an author can rely
	// on. `setWidget` is documented to work without a frame.
	api.on("session_start", async (_event, ctx: ExtensionContext) => {
		// `ExtensionWidgetContent` is `string[] | factory | undefined` — lines of
		// text, not content blocks. Passing blocks type-errors, which is the second
		// thing a reader gets wrong here.
		ctx.ui.setWidget("outsider-widget", ["outsider panel"]);
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
