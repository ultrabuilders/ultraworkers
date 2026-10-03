/**
 * An extension's `ctx.ui` must expose every member of the host UI context —
 * including the ones a class keeps on its prototype.
 *
 * `ExtensionRunner` used to build the per-extension wrapper with `{ ...uiContext }`.
 * A spread copies own enumerable properties only, so it worked perfectly for the two
 * object literals in the tree (`noOpUIContext`, the ACP context) and silently dropped
 * every member of `RpcExtensionUIContext` — the one context implemented as a class,
 * with all 25 of its members on its prototype. In RPC mode an extension hook calling
 * `ctx.ui.notify(...)` got `TypeError: ctx.ui.notify is not a function`, while
 * `hasUI` — a field, hence an own property — survived and still advertised a live UI.
 *
 * Nothing caught it because every other test drives a literal, where the spread is
 * harmless. These rows drive the real class.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type {
	Extension,
	ExtensionUIContext,
	ExtensionWidgetContent,
	ExtensionSurfaceOptions,
	LoadExtensionsResult,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { type PendingExtensionRequest, RpcExtensionUIContext } from "@oh-my-pi/pi-coding-agent/modes/rpc/rpc-mode";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { getProjectAgentDir, TempDir } from "@oh-my-pi/pi-utils";

const actions = {
	sendMessage: () => {},
	sendUserMessage: () => {},
	appendEntry: () => {},
	setLabel: () => {},
	getActiveTools: () => [],
	getAllTools: () => [],
	setActiveTools: async () => {},
	getCommands: () => [],
	setModel: async () => false,
	getThinkingLevel: () => undefined,
	setThinkingLevel: () => {},
	getSessionName: () => undefined,
	setSessionName: async () => {},
};

const contextActions = {
	getModel: () => undefined,
	isIdle: () => true,
	abort: () => {},
	hasPendingMessages: () => false,
	shutdown: () => {},
	getContextUsage: () => undefined,
	compact: async () => {},
	getSystemPrompt: () => [],
};

describe("an extension's ctx.ui over a class-based host context", () => {
	let sharedTempDir: TempDir;
	let modelRegistry: ModelRegistry;
	let authStorage: AuthStorage;
	let tempDir: TempDir;
	let extension: Extension;
	let runtime: LoadExtensionsResult["runtime"];

	beforeAll(async () => {
		sharedTempDir = TempDir.createSync("@ultraworkers-ui-proto-shared-");
		authStorage = await AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"));
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterAll(() => {
		authStorage.close();
		sharedTempDir.removeSync();
	});

	beforeEach(async () => {
		tempDir = TempDir.createSync("@ultraworkers-ui-proto-");
		const extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		const file = path.join(extensionsDir, "probe.ts");
		fs.writeFileSync(file, "export default function probe(): void {}\n");

		const loaded = await loadExtensions([file], tempDir.path());
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(1);
		extension = loaded.extensions[0]!;
		runtime = loaded.runtime;
	});

	/** A runner in RPC mode whose UI context is the real class, not a literal. */
	const rpcRunner = (frames: object[]) => {
		const pendingRequests = new Map<string, PendingExtensionRequest>();
		const host = new RpcExtensionUIContext(pendingRequests, frame => frames.push(frame), false);
		const runner = new ExtensionRunner(
			[extension],
			runtime,
			tempDir.path(),
			SessionManager.inMemory(),
			modelRegistry,
		);
		runner.initialize(actions, contextActions, undefined, host, "rpc");
		return { runner, pendingRequests, host };
	};

	it("delivers notify to the client instead of dropping it", () => {
		const frames: object[] = [];
		const { runner } = rpcRunner(frames);
		const ui = runner.createContext(undefined, undefined, extension).ui;

		// The failure this pins: `ui.notify` was `undefined`, so the call below threw
		// `ctx.ui.notify is not a function` before reaching the client.
		ui.notify("hello", "info");

		expect(frames).toEqual([expect.objectContaining({ method: "notify", message: "hello", notifyType: "info" })]);
	});

	it("carries a blocking select through to its answer", async () => {
		const frames: Array<{ id?: string; method?: string; options?: string[] }> = [];
		const { runner, pendingRequests } = rpcRunner(frames);
		const ui = runner.createContext(undefined, undefined, extension).ui;

		const pending = ui.select("Pick one", ["alpha", "beta"]);

		// The request has to reach the client, or the extension waits on a dialog
		// that was never shown.
		const request = frames[0];
		expect(request?.method).toBe("select");
		expect(request?.options).toEqual(["alpha", "beta"]);

		// And it has to still be waiting — a select that resolved on its own would
		// hand the extension an answer no client ever chose.
		let settled = false;
		void pending.then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);

		// Answering the way the RPC host does resolves it through the wrapper.
		pendingRequests.get(request!.id!)!.resolve({ value: "beta" } as never);
		await expect(pending).resolves.toBe("beta");
	});

	it("still stamps owner on the three persistent surfaces", () => {
		// The wrapper exists to attribute a widget, header or footer to the extension
		// that placed it. Forwarding everything else must not cost that.
		const seen: Array<{ surface: string; owner?: string }> = [];
		const literal = {
			hasUI: true,
			canMount: () => true,
			setWidget: (_key: string, _content: ExtensionWidgetContent, options?: { owner?: string }) =>
				seen.push({ surface: "widget", owner: options?.owner }),
			setHeader: (_factory: unknown, options?: ExtensionSurfaceOptions) =>
				seen.push({ surface: "header", owner: options?.owner }),
			setFooter: (_factory: unknown, options?: ExtensionSurfaceOptions) =>
				seen.push({ surface: "footer", owner: options?.owner }),
			notify: () => {},
		} as unknown as ExtensionUIContext;

		const runner = new ExtensionRunner(
			[extension],
			runtime,
			tempDir.path(),
			SessionManager.inMemory(),
			modelRegistry,
		);
		runner.initialize(actions, contextActions, undefined, literal, "tui");
		const ui = runner.createContext(undefined, undefined, extension).ui;

		ui.setWidget("k", [], {});
		ui.setHeader(undefined, {});
		ui.setFooter(undefined, {});

		expect(seen).toEqual([
			{ surface: "widget", owner: extension.resolvedPath },
			{ surface: "header", owner: extension.resolvedPath },
			{ surface: "footer", owner: extension.resolvedPath },
		]);
	});

	it("gives two contexts for one extension the same wrapper", () => {
		// Identity is the wrapper's documented purpose: a fresh object per call would
		// make two contexts for the same extension compare unequal for no visible
		// reason, so the memoisation has to survive the rewrite.
		const { runner } = rpcRunner([]);
		const first = runner.createContext(undefined, undefined, extension).ui;
		const second = runner.createContext(undefined, undefined, extension).ui;
		expect(first).toBe(second);
	});
});
