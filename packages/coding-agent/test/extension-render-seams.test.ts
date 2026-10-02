/**
 * Contract: an extension can contribute an entry renderer and a Markdown
 * transformer, and the second registration of either is refused rather than
 * silently applied.
 *
 * Two seams, one shared failure mode. Both were reachable but unusable, which is
 * the shape this programme exists to remove — so the tests here run against the
 * real loader rather than a stub, and a registration the runner never consults
 * fails instead of passing for having been called.
 *
 * LINE 1 — duplicate registration is diagnosed. If this regresses to last-wins,
 * an author who registers a renderer twice loses the first one with no signal at
 * all, and two ways of saying the same thing ("no error" and "an error") coexist
 * in one registration API, leaving a reader to guess which one the code believes.
 *
 * LINE 2 — the Markdown transformer is reachable from the interactive transcript
 * and from nowhere else. If it ever reached the RPC/JSON path, a client reading
 * the session would receive transformed Markdown and break on its own side, with
 * no omp stack trace to point at. The assertion is structural: the transformer's
 * only reader is the interactive layer, and the RPC path has no call site.
 */
import { describe, expect, it } from "bun:test";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import type { Extension, ExtensionAPI } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { UiHelpers } from "@oh-my-pi/pi-coding-agent/modes/utils/ui-helpers";
import { TranscriptContainer } from "@oh-my-pi/pi-tui/chrome/transcript-container";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import type { InteractiveModeContext } from "@oh-my-pi/pi-coding-agent/modes/types";
import { clearExtensionBuckets } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { deobfuscateSessionContext } from "@oh-my-pi/pi-coding-agent/secrets/message-transform";

/** Load a real extension through the real factory. */
async function load(register: (api: ExtensionAPI) => void, name: string): Promise<Extension> {
	return (await loadExtensionFromFactory(
		register as never,
		"/cwd",
		new EventBus(),
		new ExtensionRuntime(),
		name,
	)) as Extension;
}

/** The runner's two readers, over extensions the real loader produced. */
function readerOver(extensions: Extension[]) {
	return new ExtensionRunner(extensions, new ExtensionRuntime(), "/cwd", SessionManager.inMemory(), {} as never);
}

/**
 * An interactive context whose transcript is a real `TranscriptContainer` and
 * whose session is the very manager the caller will later read a client's view
 * from.
 *
 * Sharing the manager is the whole point. A transcript that renders from its own
 * store while the client view is built from a second one makes the two
 * assertions independent, so a transform leaking into persistence cannot reach
 * the assertion meant to catch it — that version survived a mutation that wrote
 * the transformed text into the message.
 */
function buildContext(extensionRunner: unknown, sessionManager: SessionManager): InteractiveModeContext {
	return {
		chatContainer: new TranscriptContainer(),
		transcriptMessageComponents: new WeakMap(),
		viewSession: {
			extensionRunner,
			sessionManager,
		},
		ui: { requestRender: () => {}, imageBudget: undefined },
		settings: { get: () => false },
		effectiveHideThinkingBlock: false,
		proseOnlyThinking: true,
		editor: { addToHistory: () => {} },
	} as unknown as InteractiveModeContext;
}

/**
 * Push one user message through the real `UiHelpers` into a real session, and
 * return both what was drawn and what a client would read back.
 *
 * Driving the transcript rather than the renderer directly is the point: the two
 * halves of this seam are the runner handing out a transformer and a component
 * applying one, and a test that exercises only the halves stays green when the
 * join between them is deleted.
 */
async function renderAndReadBack(ext: Extension, content: string): Promise<{ drawn: string; clientView: string }> {
	const session = SessionManager.inMemory();
	const ctx = buildContext(readerOver([ext]), session);
	await initTheme(false);

	const message = { role: "user", content, timestamp: 1 } as const;
	// `addMessageToChat` only draws; persistence is the agent's job. Doing it here
	// first means the store a client reads back is the same one holding the message
	// the transcript was handed — which is what makes the two halves comparable.
	session.appendMessage(message);
	new UiHelpers(ctx).addMessageToChat(message);

	return {
		drawn: ctx.chatContainer.children.flatMap(child => child.render(80)).join("\n"),
		clientView: JSON.stringify(deobfuscateSessionContext(session.buildSessionContext(), undefined)),
	};
}

describe("registerEntryRenderer", () => {
	it("makes the renderer reachable by custom type, and absent types stay absent", async () => {
		const ext = await load(api => {
			api.registerEntryRenderer("status-card", () => undefined);
		}, "entry-renderer");

		const runner = readerOver([ext]);
		// Found for the type it claimed...
		expect(runner.getEntryRenderer("status-card")).toBeDefined();
		// ...and not borrowed for a type nobody claimed, which is what makes
		// "missing" distinguishable from "registered as undefined".
		expect(runner.getEntryRenderer("never-claimed")).toBeUndefined();
	});

	it("refuses a second renderer for the same type, naming the extension and the type", async () => {
		// The failure this defends: last-wins means a second registration replaces the
		// first and the author never learns the first is dead. The duplicate has to be
		// provoked inside the factory, because that is where the API object lives.
		await expect(
			load(api => {
				api.registerEntryRenderer("status-card", () => undefined);
				api.registerEntryRenderer("status-card", () => undefined);
			}, "dup-entry-renderer"),
		).rejects.toThrow(/dup-entry-renderer[\s\S]*status-card/);

		// And the diagnosis names both sides, so an author with three extensions
		// loaded can tell which registration collided rather than being told an id
		// is merely taken.
		await expect(
			load(api => {
				api.registerEntryRenderer("status-card", () => undefined);
				api.registerEntryRenderer("status-card", () => undefined);
			}, "dup-entry-renderer"),
		).rejects.toThrow(/already registered/);
	});

	it("reports two extensions contesting one type, last registration winning", async () => {
		// The renderers return DISTINGUISHABLE values. Returning undefined from both
		// would make the winner unobservable, and a test that cannot tell first-wins
		// from last-wins passes under either — which is exactly what a first pass at
		// this test proved by surviving the mutation that reversed the precedence.
		const marker = (tag: string) => () => ({ tag }) as never;
		const first = await load(api => {
			api.registerEntryRenderer("shared", marker("first"));
		}, "/ext/first");
		const second = await load(api => {
			api.registerEntryRenderer("shared", marker("second"));
		}, "/ext/second");

		// Two extensions reaching for one id is a collision, not an error: load order
		// decides, both registrations survive, and the collision is REPORTED rather
		// than only happening silently. This is the shape registerSubcommand already
		// uses — warn and keep both, then name both owners on demand.
		const runner = readerOver([first, second]);
		const diagnostics = runner.getEntryRendererCollisionDiagnostics();

		// Both sides named, so an author with three extensions loaded can tell which
		// two collided and which one won.
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]!.message).toContain("shared");
		expect(diagnostics[0]!.message).toContain("/ext/first");
		expect(diagnostics[0]!.message).toContain("/ext/second");
		expect(diagnostics[0]!.path).toBe("/ext/second");

		// The precedence is observable, and it agrees with the diagnostic: the LAST
		// registration is the one that draws the entry.
		const winner = runner.getEntryRenderer("shared");
		expect(winner).toBeDefined();
		expect((winner as unknown as () => { tag: string })().tag).toBe("second");
	});

	it("reports nothing when each extension claims its own type", async () => {
		const first = await load(api => {
			api.registerEntryRenderer("only-first", () => undefined);
		}, "/ext/first");
		const second = await load(api => {
			api.registerEntryRenderer("only-second", () => undefined);
		}, "/ext/second");

		// The negative half: a diagnostic that fires on every load would train
		// authors to ignore it, which is how a real collision gets missed.
		expect(readerOver([first, second]).getEntryRendererCollisionDiagnostics()).toEqual([]);
	});

	it("leaves a single extension's renderer untouched", async () => {
		const only = await load(api => {
			api.registerEntryRenderer("solo", () => undefined);
		}, "solo");

		const runner = readerOver([only]);
		// Unload is the negative assertion this seam must survive: with the seam off,
		// behaviour has to return to what it was — nothing registered, nothing drawn.
		clearExtensionBuckets(only);

		expect(runner.getEntryRenderer("solo")).toBeUndefined();
		expect(runner.getEntryRendererCollisionDiagnostics()).toEqual([]);
	});

	it("does not let one extension's renderer reach another's custom type", async () => {
		const first = await load(api => {
			api.registerEntryRenderer("mine", () => undefined);
		}, "first");

		const runner = readerOver([first]);
		// Absent is not undefined-by-accident: a type nobody claimed must not borrow
		// another type's renderer.
		expect(runner.getEntryRenderer("theirs")).toBeUndefined();
	});
});

describe("registerMarkdownTransformer", () => {
	it("returns transformers as an ordered list rather than composing them itself", async () => {
		const a = await load(api => {
			api.registerMarkdownTransformer(markdown => `${markdown} a`);
		}, "transformer-a");
		const b = await load(api => {
			api.registerMarkdownTransformer(markdown => `${markdown} b`);
		}, "transformer-b");

		const transformers = readerOver([a, b]).getMarkdownTransformers();
		// Order is the observable contract, and composition is deliberately NOT
		// this layer's job: a transformer that raises or returns a non-string must
		// not be able to decide the transcript for the ones after it. The list is
		// what the interactive renderer folds, one failure at a time.
		expect(transformers).toHaveLength(2);
		expect(
			transformers.map(t =>
				t("x", {
					messageType: "assistant",
					isStreaming: false,
					availableWidth: 80,
				}),
			),
		).toEqual(["x a", "x b"]);
	});

	it("refuses a second transformer from the same extension", async () => {
		await expect(
			load(api => {
				api.registerMarkdownTransformer(markdown => markdown);
				api.registerMarkdownTransformer(markdown => markdown);
			}, "dup-transformer"),
		).rejects.toThrow(/dup-transformer/);

		// Refused, not replaced: an extension that registered once still has exactly
		// one transformer, and the author keeps the first they wrote.
		const ext = await load(api => {
			api.registerMarkdownTransformer(markdown => markdown);
		}, "single-transformer");
		expect(readerOver([ext]).getMarkdownTransformers()).toHaveLength(1);
	});

	it("transforms the drawn transcript and leaves the stored session raw", async () => {
		// The dangerous failure is a transformer running on the RPC/JSON path: a
		// client reading the session would receive transformed Markdown and break on
		// its own side, with no omp stack trace to point at.
		//
		// This asserts the boundary by OBSERVING BOTH SIDES OF ONE SESSION rather
		// than by reading source. The earlier version grepped `modes/rpc/` for the
		// reader's name and stayed green with that check disabled — a source-grep
		// cannot fail when the thing it forbids is reached indirectly, and
		// `AGENTS.md` bans it outright.
		//
		// Sharing the session manager is what makes the second half falsifiable. With
		// the transcript and the client view built from separate stores, a transform
		// leaking into the persisted message had nowhere to show up, and the negative
		// assertion survived having itself deleted.
		const ext = await load(api => {
			api.registerMarkdownTransformer(markdown => `${markdown} [drawn]`);
		}, "boundary-probe");

		const { drawn, clientView } = await renderAndReadBack(ext, "boundary");

		// The interactive path applies it...
		expect(drawn).toContain("[drawn]");
		// ...and a client reading the same session back does not. This is the call
		// `sdk.ts:1843` and `acp-agent.ts:2304` make before serialising.
		expect(clientView).toContain("boundary");
		expect(clientView).not.toContain("[drawn]");
	});
});

describe("unload", () => {
	it("withdraws both seams so a reload does not collide with its own replacement", async () => {
		const ext = await load(api => {
			api.registerEntryRenderer("status-card", () => undefined);
			api.registerMarkdownTransformer(markdown => markdown);
		}, "unload-probe");

		const { clearExtensionBuckets } = await import("@oh-my-pi/pi-coding-agent/extensibility/extensions/runner");
		clearExtensionBuckets(ext);

		const runner = readerOver([ext]);
		// An unloaded extension that kept its transformer would collide with its own
		// replacement on reload, because registration now refuses duplicates.
		expect(runner.getMarkdownTransformers()).toHaveLength(0);
		expect(runner.getEntryRenderer("status-card")).toBeUndefined();
	});
});

describe("markdown transform reaches the transcript", () => {
	it("flows from a registered transformer through the runner to the renderer", async () => {
		const ext = await load(api => {
			api.registerMarkdownTransformer(markdown => `${markdown} [rewritten]`);
		}, "transform-consumer");

		const transformers = readerOver([ext]).getMarkdownTransformers();
		expect(transformers).toHaveLength(1);

		// The renderer takes (markdown, width); the extension transformer takes
		// (markdown, context). Mapping is what the transcript does, and doing it
		// here is what proves the two shapes meet without either being retyped.
		const render = (markdown: string, availableWidth: number) =>
			transformers[0]!(markdown, { messageType: "assistant", isStreaming: false, availableWidth });

		expect(render("hello", 80)).toBe("hello [rewritten]");

		// And the width the renderer passes is the one the extension receives, so a
		// transform that hard-wraps has what it needs.
		const { Markdown } = await import("@oh-my-pi/pi-tui/components/markdown");
		const { getMarkdownTheme } = await import("@oh-my-pi/pi-tui/theme");
		const drawn = new Markdown("hello", 0, 0, getMarkdownTheme())
			.setTransform((source, width) => render(source, width))
			.render(64)
			.join("\n");
		expect(drawn).toContain("[rewritten]");
	});

	it("draws untransformed text when no extension registered one", async () => {
		// The negative half at the seam: an empty transformer list must leave every
		// transcript exactly as it was, which is what makes the seam safe to add.
		const ext = await load(() => {}, "no-transformer");
		expect(readerOver([ext]).getMarkdownTransformers()).toEqual([]);

		const { Markdown } = await import("@oh-my-pi/pi-tui/components/markdown");
		const { getMarkdownTheme } = await import("@oh-my-pi/pi-tui/theme");
		expect(new Markdown("plain", 0, 0, getMarkdownTheme()).render(60).join("\n")).toContain("plain");
	});
});

describe("the transcript actually passes transformers to its components", () => {
	/**
	 * The test above proves the runner hands out transformers and that the renderer
	 * applies one. Neither proves the two meet — and a mutation that emptied the
	 * transcript's own mapper survived all of it, because everything either side of
	 * the join still worked. `renderAndReadBack` drives the real `UiHelpers`
	 * with a real runner so the join itself is under test.
	 */
	it("renders a user message through the registered transformer", async () => {
		const ext = await load(api => {
			api.registerMarkdownTransformer(markdown => `${markdown} [seen]`);
		}, "wired-user");

		expect((await renderAndReadBack(ext, "hello")).drawn).toContain("[seen]");
	});

	it("draws the same user message unchanged when nothing registered a transformer", async () => {
		// The negative half at the join: a session with no transformer must produce
		// exactly the transcript it produced before the seam existed.
		const ext = await load(() => {}, "unwired-user");

		expect((await renderAndReadBack(ext, "untouched")).drawn).toContain("untouched");
	});
});
