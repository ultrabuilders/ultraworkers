/**
 * A tool_call hook that BREAKS must not be rendered as a tool_call hook that DENIED.
 *
 * Two hook systems declare the same `tool_call` event and handle failure three
 * different ways. `extensions/runner.ts` turns a throw into `{ block: true }`;
 * `hooks/runner.ts` lets it propagate; and both wrappers re-throw it as a plain
 * tool error. The result a reader sees is identical in all three cases: a tool
 * error that looks exactly like somebody said no. But nobody did — an extension
 * crashed. "The system looks like it decided, and nothing decided" is the failure
 * M4 exists to name.
 *
 * `ToolCallEventResult.kind` is the classification that survives to the reader:
 * `denied` = a handler returned block:true; `hook-failed` = a handler threw or
 * timed out. The BLOCK DECISION IS UNCHANGED — fail-closed is deliberate and
 * these tests exist to keep it that way. Only the label changes, and the labels
 * must not collapse into one another.
 *
 * The negative row is the one that carries the item. Without it, an
 * implementation that stamps `hook-failed` on every `block: true` passes the
 * first test perfectly and destroys the only information the user needed: who
 * blocked me.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as path from "node:path";
import type { ToolCallEventResult } from "@oh-my-pi/pi-coding-agent/extensibility/shared-events";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { ExtensionRuntime } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import type { Extension } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { HookRunner, type LoadedHook } from "@oh-my-pi/pi-coding-agent/extensibility/hooks";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { TempDir } from "@oh-my-pi/pi-utils";

// One literal serves both runners: they declare structurally identical but nominally
// separate `ToolCallEvent` types. `as const` on `type` is what lets one object satisfy
// both without a cast at every call site.
const CALL_EVENT = { type: "tool_call" as const, toolName: "bash", toolCallId: "call-1", input: { command: "ls" } };

describe("a tool_call hook that breaks vs one that denies", () => {
	let tempDir: TempDir;
	let modelRegistry: ModelRegistry;
	let authStorage: AuthStorage;

	beforeAll(async () => {
		tempDir = TempDir.createSync("@pi-block-kind-");
		authStorage = await AuthStorage.create(path.join(tempDir.path(), "testauth.db"));
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterAll(() => {
		authStorage.close();
		tempDir.removeSync();
	});

	function extensionRunner(handler: () => Promise<unknown>): ExtensionRunner {
		const handlers = new Map<string, ((event: unknown, ctx: unknown) => Promise<unknown>)[]>();
		handlers.set("tool_call", [async () => await handler()]);
		const ext = {
			path: "third-party.ts",
			resolvedPath: "/ext/third-party.ts",
			handlers,
			commands: new Map(),
			messageRenderers: new Map(),
			doubleEscapeActions: [],
		} as unknown as Extension;
		return new ExtensionRunner(
			[ext],
			new ExtensionRuntime(),
			tempDir.path(),
			SessionManager.inMemory(),
			modelRegistry,
		);
	}

	function hookRunner(handler: () => Promise<unknown>): HookRunner {
		const handlers = new Map<string, ((event: unknown, ctx: unknown) => Promise<unknown>)[]>();
		handlers.set("tool_call", [async () => await handler()]);
		const hook = {
			path: "third-party.ts",
			resolvedPath: "/hooks/third-party.ts",
			handlers,
			messageRenderers: new Map(),
			commands: new Map(),
			setSendMessageHandler: () => {},
			setAppendEntryHandler: () => {},
		} as unknown as LoadedHook;
		return new HookRunner([hook], tempDir.path(), SessionManager.inMemory(), modelRegistry);
	}

	describe("the extensions path", () => {
		it("labels a throwing handler hook-failed, and still fails closed", async () => {
			const result = (await extensionRunner(async () => {
				throw new Error("extension exploded");
			}).emitToolCall(CALL_EVENT)) as ToolCallEventResult;

			// Preservation first. `block` staying true is the fail-closed contract: a
			// crashed pre-execution gate must never read as consent to run the tool.
			// If this goes false the implementation changed the DECISION, not the label,
			// which is the one thing this item must not do.
			expect(result.block).toBe(true);

			// And the label says what actually happened.
			expect(result.kind).toBe("hook-failed");
		});

		it("keeps a real handler denial labelled denied", async () => {
			// The negative row that makes the first one meaningful. An implementation
			// that stamps `hook-failed` on every block passes the test above and fails
			// this one — which is the point: the user must still be able to tell
			// "somebody denied this" from "the hook broke".
			const result = (await extensionRunner(async () => ({
				block: true,
				reason: "not allowed in this repo",
				kind: "denied",
			})).emitToolCall(CALL_EVENT)) as ToolCallEventResult;

			expect(result.block).toBe(true);
			expect(result.kind).toBe("denied");
		});

		it("does not stamp a kind onto a handler that merely enriched the call", async () => {
			// `kind` describes a BLOCK. A passing handler that added context has no
			// business carrying one, and a caller branching on `kind` must be able to
			// treat its absence as "no decision was taken here" rather than
			// "something denied it".
			const result = (await extensionRunner(async () => ({
				additionalContext: ["repo uses tabs"],
			})).emitToolCall(CALL_EVENT)) as ToolCallEventResult | undefined;

			expect(result?.kind).toBeUndefined();
		});
	});

	describe("the hooks.json path", () => {
		it("still throws on a broken handler, and reports the failure instead of swallowing it", async () => {
			const runner = hookRunner(async () => {
				throw new Error("hook exploded");
			});

			// The error used to vanish into a `reason` string with nowhere to look.
			// A reader debugging a third-party hook had no surface to grep.
			const reported: { hookPath: string; event: string; error: string }[] = [];
			runner.onError(error => reported.push(error));

			// Fail-closed is unchanged: the throw still propagates, so the caller blocks.
			let thrown: Error | undefined;
			try {
				await runner.emitToolCall(CALL_EVENT);
			} catch (err) {
				thrown = err as Error;
			}
			expect(thrown).toBeDefined();

			// And it is now visible as well as blocking — the two are not exclusive.
			expect(reported).toHaveLength(1);
			expect(reported[0].hookPath).toBe("third-party.ts");
			expect(reported[0].event).toBe("tool_call");
			expect(reported[0].error).toContain("hook exploded");
		});

		it("keeps a real handler denial labelled denied", async () => {
			const result = (await hookRunner(async () => ({
				block: true,
				reason: "denied by policy",
				kind: "denied",
			})).emitToolCall(CALL_EVENT)) as ToolCallEventResult;

			expect(result.kind).toBe("denied");
		});
	});
});
