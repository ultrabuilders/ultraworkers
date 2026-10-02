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
import { Text } from "@oh-my-pi/pi-tui";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import type { InteractiveModeContext } from "@oh-my-pi/pi-coding-agent/modes/types";
import { clearExtensionBuckets } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { deobfuscateSessionContext } from "@oh-my-pi/pi-coding-agent/secrets/message-transform";
import { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import { Agent } from "@oh-my-pi/pi-agent-core";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { createInMemoryAuthStorage } from "./helpers/agent-session-setup";
import type { CustomEntry } from "@oh-my-pi/pi-coding-agent/session/session-entries";

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

describe("a custom entry reaches the transcript", () => {
	/**
	 * The other half of this bead. `appendEntry()` persisted a `CustomEntry` and
	 * nothing ever drew it: `buildSessionContext` — which the transcript rebuild
	 * goes through — has no `case "custom"`, so a registered `EntryRenderer` had
	 * nowhere to land.
	 *
	 * `pi` closes that with an `entry_appended` event (`core/agent-session.ts:204`,
	 * six emit sites). This drives the same chain end to end: a real session
	 * manager, a real `AgentSession` subscribing to it, and a real event listener —
	 * because a test that only calls the render method proves the renderer works,
	 * not that anything ever calls it.
	 */
	async function sessionOver(ext: Extension) {
		const sessionManager = SessionManager.inMemory();
		const seen: CustomEntry[] = [];
		const session = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: { model: undefined, systemPrompt: [], tools: [] },
				streamFn: async () => ({}) as never,
			}),
			sessionManager,
			settings: Settings.isolated(),
			modelRegistry: new ModelRegistry(createInMemoryAuthStorage(), "/nonexistent/models.yml"),
			extensionRunner: readerOver([ext]),
		});
		session.subscribe(event => {
			// Narrowed here rather than at each assertion: the event carries the whole
			// `SessionEntry` union, and a `customType` only exists on one member.
			if (event.type === "entry_appended" && event.entry.type === "custom") seen.push(event.entry);
		});
		return { sessionManager, seen, session };
	}

	it("delivers an appended custom entry to a subscriber", async () => {
		const ext = await load(api => {
			api.registerEntryRenderer("status-card", () => undefined);
		}, "entry-producer");

		const { sessionManager, seen } = await sessionOver(ext);
		sessionManager.appendCustomEntry("status-card", { level: "warn" });

		// The observable event: a subscriber learns the entry exists, with its type
		// and payload intact. Before the seam there was no event at all, so a
		// listener would simply never fire.
		expect(seen).toHaveLength(1);
		expect(seen[0]!.type).toBe("custom");
		expect(seen[0]!.customType).toBe("status-card");
	});

	it("says nothing for a custom entry nobody registered a renderer for", async () => {
		// The negative half. Most custom entries are bookkeeping — `tool_execution_start`,
		// `session_exit` — and a renderer lookup that ignored the customType would draw
		// an unrelated extension's panel for them.
		const ext = await load(api => {
			api.registerEntryRenderer("status-card", () => undefined);
		}, "entry-negative");

		const { sessionManager, seen } = await sessionOver(ext);
		sessionManager.appendCustomEntry("someone-elses-type", {});

		expect(seen).toHaveLength(1);
		expect(seen[0]!.customType).toBe("someone-elses-type");
	});

	it("stops delivering once the session is disposed", async () => {
		// A disposed session that kept its tap would emit into a cleared listener set
		// on a manager that outlives it — so the unsubscribe is part of the contract,
		// not tidiness.
		//
		// The observable is DELIVERY, not persistence. An earlier version counted
		// entries on disk and passed with the unsubscribe deleted: the manager
		// outlives the session, so both entries land either way and the count cannot
		// tell a released tap from a held one.
		const ext = await load(api => {
			api.registerEntryRenderer("status-card", () => undefined);
		}, "entry-dispose");

		const { sessionManager, seen, session } = await sessionOver(ext);
		sessionManager.appendCustomEntry("status-card", {});
		expect(seen).toHaveLength(1);

		await session.dispose();
		sessionManager.appendCustomEntry("status-card", {});

		// `dispose()` releases the manager, which clears its entries and drops later
		// appends — so the second `appendCustomEntry` is not persisted either, and
		// counting entries proves nothing about delivery. The observable is the
		// announcement the session made while it was alive: exactly one, ever.
		expect(seen).toHaveLength(1);
		expect(seen[0]!.customType).toBe("status-card");
	});
});

describe("a custom entry is drawn with its registered renderer", () => {
	/**
	 * The last link in the chain. The tests above prove the entry is *announced*;
	 * this proves something *draws* it — because a delivery path with no consumer
	 * is the same defect one layer down, and a mutation that empties the TUI
	 * handler survived every assertion above.
	 *
	 * Driven through the real `EventController.handleEvent`, the same entry point
	 * the interactive session uses, with the real transcript container.
	 */
	it("mounts a component for an entry whose type an extension registered", async () => {
		const { EventController } = await import("@oh-my-pi/pi-coding-agent/modes/controllers/event-controller");
		const { createInteractiveModeContext } = await import("./helpers/interactive-mode-context");

		// A renderer that returns a distinguishable component: `() => undefined`
		// would leave the container empty whether the handler ran or not, which is
		// exactly what made an earlier version of this unobservable.
		const ctx = createInteractiveModeContext({
			viewSession: {
				extensionRunner: readerOver([
					await load(api => {
						api.registerEntryRenderer("status-card", () => new Text("CARD DRAWN", 0, 0));
					}, "entry-draw"),
				]),
			},
		});

		const controller = new EventController(ctx as never);
		try {
			await controller.handleEvent({
				type: "entry_appended",
				entry: { type: "custom", customType: "status-card", data: {}, id: "e1", parentId: null, timestamp: 1 },
			} as never);

			const drawn = ctx.chatContainer.children.flatMap(child => child.render(80)).join("\n");
			expect(drawn).toContain("CARD DRAWN");

			// Reading the component tree proves the entry was mounted, not that it
			// reaches the terminal. `pi` omits `requestRender()` in both branches and
			// is safe because its two callers sit inside a dispatch/replay that
			// renders anyway; `handleEvent` here has no such single owner (8+ call
			// sites), so this handler asks for the render itself. Without this row,
			// deleting both calls would leave every assertion here green.
			expect(ctx.ui.requestRender).toHaveBeenCalled();
		} finally {
			controller.dispose();
		}
	});

	it("draws nothing for a custom type no extension claimed", async () => {
		// Most custom entries are bookkeeping — `tool_execution_start`, `session_exit`
		// — so a lookup that ignored the customType would mount an unrelated panel
		// for them on every turn.
		const { EventController } = await import("@oh-my-pi/pi-coding-agent/modes/controllers/event-controller");
		const { createInteractiveModeContext } = await import("./helpers/interactive-mode-context");

		const ctx = createInteractiveModeContext({
			viewSession: {
				extensionRunner: readerOver([
					await load(api => {
						api.registerEntryRenderer("status-card", () => new Text("CARD DRAWN", 0, 0));
					}, "entry-draw-negative"),
				]),
			},
		});

		const controller = new EventController(ctx as never);
		const before = ctx.chatContainer.children.length;
		try {
			await controller.handleEvent({
				type: "entry_appended",
				entry: { type: "custom", customType: "unclaimed", data: {}, id: "e1", parentId: null, timestamp: 1 },
			} as never);

			expect(ctx.chatContainer.children).toHaveLength(before);
			// The control for the render assertion in the row above. This file has 35
			// `requestRender()` calls, so "was one called?" proves nothing on its own —
			// it only means something when the same measurement is *not* called when the
			// handler bails before mounting. Together the two rows pin the call to the
			// mount path rather than to `handleEvent` in general.
			expect(ctx.ui.requestRender).not.toHaveBeenCalled();
		} finally {
			controller.dispose();
		}
	});
});

describe("a custom entry keeps its place when the transcript is rebuilt", () => {
	/**
	 * The half of `pi`'s draw path that `dc5f55a2e2` left out. A custom entry draws
	 * when appended, but the rebuild reads `context.messages` — and a custom entry
	 * must never be in there, or it would reach the provider. So the rebuild needs
	 * its own ordered list that carries entries and messages together.
	 *
	 * Position is the whole contract: appending all custom entries at the end would
	 * satisfy "the entry is drawn" while producing a transcript that disagrees with
	 * `pi` about where things happened.
	 */
	it("interleaves the entry between the messages around it", () => {
		const session = SessionManager.inMemory();
		session.appendMessage({ role: "user", content: "before", timestamp: 1 } as never);
		session.appendCustomEntry("status-card", { note: "middle" });
		session.appendMessage({ role: "user", content: "after", timestamp: 3 } as never);

		const { displayItems } = session.buildSessionContext({ transcript: true });
		const kinds = (displayItems ?? []).map(item => ("customType" in item ? item.customType : item.role));

		expect(kinds).toEqual(["user", "status-card", "user"]);
	});

	it("omits the list entirely when the context is not a transcript", () => {
		// The provider path. A custom entry leaking into `messages` here would put
		// extension data in the prompt, which is the one thing the entry type forbids.
		const session = SessionManager.inMemory();
		session.appendCustomEntry("status-card", {});

		const context = session.buildSessionContext();

		expect(context.displayItems).toBeUndefined();
		expect(JSON.stringify(context.messages)).not.toContain("status-card");
	});
});

describe("a rebuilt transcript draws the entry where it was appended", () => {
	/**
	 * End-to-end over the real replay loop: `renderSessionContext` walks
	 * `messages` and consults `displayItems` for entries, so this proves the two
	 * are actually joined. Testing `displayItems` alone would pass even if the
	 * replay never looked at it — which is the "registered but never read" defect
	 * this whole seam exists to avoid.
	 */
	it("places the drawn entry between the messages around it", async () => {
		const { UiHelpers } = await import("@oh-my-pi/pi-coding-agent/modes/utils/ui-helpers");
		const { mountCustomEntry } = await import("@oh-my-pi/pi-coding-agent/modes/utils/mount-custom-entry");

		const session = SessionManager.inMemory();
		session.appendMessage({ role: "user", content: "before", timestamp: 1 } as never);
		session.appendCustomEntry("status-card", { note: "middle" });
		session.appendMessage({ role: "user", content: "after", timestamp: 3 } as never);

		const context = session.buildSessionContext({ transcript: true });
		// The full harness, not a local stub: the replay body reaches for
		// `pendingTools`, `servedModelTracker` and more, and a thin stub fails on
		// the first field it happens to lack rather than on the behaviour under test.
		const { createInteractiveModeContext } = await import("./helpers/interactive-mode-context");
		await initTheme(false);
		const ctx = createInteractiveModeContext({
			sessionManager: session,
			viewSession: {
				sessionManager: session,
				extensionRunner: readerOver([
					await load(api => {
						api.registerEntryRenderer("status-card", () => new Text("CARD DRAWN", 0, 0));
					}, "entry-replay"),
				]),
			},
		});

		// The harness stubs `addMessageToChat` as a no-op, so messages would render
		// as nothing and "drew in position" would be indistinguishable from "drew at
		// the end". Swap in the real renderer.
		ctx.addMessageToChat = ((message: never, options: never) =>
			new UiHelpers(ctx).addMessageToChat(message, options)) as never;

		new UiHelpers(ctx).renderSessionContext(context);

		// Positional, not textual. The user-message components render empty under
		// this harness, so comparing rendered strings would measure the harness and
		// not the contract. Which *slot* the entry lands in is the contract.
		const children = ctx.chatContainer.children;
		const cardSlot = children.findIndex(child => child.render(80).join("\n").includes("CARD DRAWN"));

		expect(children).toHaveLength(3);
		expect(cardSlot).toBe(1);
		// Named so the import above is load-bearing: an unused mount helper would
		// mean the replay grew a second, private draw path.
		expect(typeof mountCustomEntry).toBe("function");
	});
});
