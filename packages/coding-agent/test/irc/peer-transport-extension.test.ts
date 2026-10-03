/**
 * The programme's own test, for these two seams.
 *
 * An extension is written to a temp directory **outside this repo**, imports
 * nothing from it — every value arrives on the injected `pi` — and registers
 * both seams. Core is not edited, stubbed, or monkey-patched to make it work.
 *
 * If this file ever needs an import from `src/`, the seam has stopped being a
 * seam. That is the whole assertion, and it is why the fixture writes real code
 * to disk instead of calling the loader with an in-memory module.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import {
	PEER_TRANSPORT_PROTOCOL_VERSION,
	removePeerTransport,
	resolvePeerTransport,
	shouldAdmitPeerLock,
} from "@oh-my-pi/pi-coding-agent/irc/peer-transport";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { getProjectAgentDir, TempDir } from "@oh-my-pi/pi-utils";

describe("an out-of-repo extension registers both peer seams", () => {
	let tempDir: TempDir;
	let extensionsDir: string;
	let sessionManager: SessionManager;
	let sharedTempDir: TempDir;
	let modelRegistry: ModelRegistry;
	let authStorage: AuthStorage;

	beforeAll(async () => {
		sharedTempDir = TempDir.createSync("@ultraworkers-peer-seam-shared-");
		authStorage = await AuthStorage.create(path.join(sharedTempDir.path(), "auth.db"));
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterAll(() => {
		authStorage.close();
		sharedTempDir.removeSync();
	});

	beforeEach(() => {
		tempDir = TempDir.createSync("@ultraworkers-peer-seam-");
		// os.tmpdir(), not the repo: the point is that this extension is written
		// outside the tree whose core it registers against.
		extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		sessionManager = SessionManager.inMemory();
		removePeerTransport("out-of-repo");
	});

	afterEach(() => {
		removePeerTransport("out-of-repo");
		tempDir.removeSync();
	});

	/** Write the extension to disk and run it through the real loader. */
	async function load(code: string): Promise<ExtensionRunner> {
		fs.writeFileSync(path.join(extensionsDir, "peer-seams.ts"), code);
		const discovered = fs
			.readdirSync(extensionsDir, { withFileTypes: true })
			.filter(e => e.isFile() && (e.name.endsWith(".ts") || e.name.endsWith(".js")))
			.map(e => path.join(extensionsDir, e.name))
			.sort();
		const result = await loadExtensions(discovered, tempDir.path());
		const runner = new ExtensionRunner(
			result.extensions,
			result.runtime,
			tempDir.path(),
			sessionManager,
			modelRegistry,
		);
		runner.initialize(
			{
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
			},
			{
				getModel: () => undefined,
				isIdle: () => true,
				abort: () => {},
				hasPendingMessages: () => false,
				shutdown: () => {},
				getContextUsage: () => undefined,
				compact: async () => {},
				getSystemPrompt: () => [],
			},
		);
		return runner;
	}

	test("registers both seams with no core edit", async () => {
		// The failure this defends: a seam that exists in the type but not in the
		// loader, so an extension written against it type-checks and then does
		// nothing — the exact "designed, zero shipped" state core-seams.md records.
		await load(`
			export default function (pi) {
				pi.registerPeerTransport({
					id: "out-of-repo",
					protocolVersion: ${PEER_TRANSPORT_PROTOCOL_VERSION},
					capabilities: { crossProcess: true, durable: true, injects: true },
					deliver: async () => ({ outcome: "persisted" }),
				});
				pi.registerPeerLockBackend({ id: "out-of-repo", shouldAdmit: () => true });
			}
		`);

		expect(resolvePeerTransport()?.id).toBe("out-of-repo");
		expect(shouldAdmitPeerLock("src/**")).toBe(true);
	});

	test("a protocol mismatch fails the extension, not just the send", async () => {
		// The failure this defends: skew discovered at delivery time, as an
		// unknown message type and a dead socket, long after the cause.
		await load(`
			export default function (pi) {
				pi.registerPeerTransport({
					id: "out-of-repo",
					protocolVersion: ${PEER_TRANSPORT_PROTOCOL_VERSION + 41},
					capabilities: { crossProcess: true, durable: true, injects: true },
					deliver: async () => ({ outcome: "persisted" }),
				});
			}
		`);

		expect(resolvePeerTransport()).toBeUndefined();
	});
});
