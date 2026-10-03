import { describe, expect, it } from "bun:test";
import type { DaemonBrokerClient } from "../src/launch/client";
import type { DaemonOperation, DaemonRpcResult } from "../src/launch/protocol";
import { describeRegisteredMux } from "../src/lsp/mux/daemon";
import { LSP_MUX_DAEMON_NAME, LSP_MUX_DAEMON_NAME_LEGACY } from "../src/lsp/mux/protocol";
import type { DaemonSnapshot, DaemonSpec } from "@oh-my-pi/pi-tui/tools/daemon";

/**
 * A broker holding exactly the daemons in `registered`, and nothing else.
 *
 * Mirrors the real broker's two behaviours the lookup depends on: `describe`
 * on an unknown name throws (so `describeQuietly` sees `undefined` rather than
 * an absent result), and it records every name asked about, so a test can tell
 * "looked and found nothing" from "never looked".
 */
function brokerWith(registered: DaemonSnapshot[]): DaemonBrokerClient & { asked: string[] } {
	const known = new Map(registered.map(d => [d.name, d]));
	const asked: string[] = [];
	return {
		projectDir: "/fake/project",
		asked,
		onCompletion: () => () => {},
		close() {},
		async request(operation: DaemonOperation): Promise<DaemonRpcResult> {
			if (operation.op !== "describe") throw new Error(`unexpected broker op: ${operation.op}`);
			asked.push(operation.name);
			const daemon = known.get(operation.name);
			// The broker's own wording for a name it has no record for.
			if (!daemon) throw new Error(`Unknown daemon ${operation.name}`);
			const spec: DaemonSpec = {
				name: daemon.name,
				application: "/bin/true",
				args: [],
				env: {},
				cwd: "/fake/project",
				pty: false,
				restart: "no",
				persist: false,
				detached: false,
			};
			return { op: "describe", daemon, spec };
		},
	};
}

/** A live, ready daemon record under `name` — the shape the wedged recovery acts on. */
function daemonUnder(name: string): DaemonSnapshot {
	return {
		name,
		id: `id-${name}`,
		state: "ready",
		pid: 4242,
		createdAt: 1,
		startedAt: 2,
		readyAt: 3,
		restartCount: 0,
		outputBytes: 0,
		persist: false,
		detached: false,
	};
}

describe("LSP mux daemon lookup across the rename", () => {
	it("retires a pre-rename daemon by the name it is actually registered under", async () => {
		// The broker persists daemon names as directories under the project scope,
		// so a mux started before the rename is still registered under the old
		// spelling after an upgrade. `ensureLspMuxDaemon` stops whatever name this
		// returns; naming the current one instead would stop nothing and leave the
		// wedged record — and its port lease — alive forever.
		expect(LSP_MUX_DAEMON_NAME_LEGACY).toBe("omp.lsp.mux");

		const client = brokerWith([daemonUnder(LSP_MUX_DAEMON_NAME_LEGACY)]);
		const found = await describeRegisteredMux(client, undefined);

		expect(found.name).toBe(LSP_MUX_DAEMON_NAME_LEGACY);
		expect(found.record?.pid).toBe(4242);
	});

	it("stops consulting the legacy name once the current one is registered", async () => {
		// Control for the row above: with the current name present the lookup must
		// be a single describe, or every healthy session pays a broker round trip
		// for a name it will never act on.
		const client = brokerWith([daemonUnder(LSP_MUX_DAEMON_NAME)]);
		const found = await describeRegisteredMux(client, undefined);

		expect(found.name).toBe(LSP_MUX_DAEMON_NAME);
		expect(client.asked).toEqual([LSP_MUX_DAEMON_NAME]);
	});

	it("prefers the current record when an upgrade left both registered", async () => {
		// Both can be live: the current one was spawned by this version while a
		// stale legacy record still holds its directory. Recovery must act on the
		// daemon actually serving the endpoint, not the leftover.
		const client = brokerWith([daemonUnder(LSP_MUX_DAEMON_NAME), daemonUnder(LSP_MUX_DAEMON_NAME_LEGACY)]);
		const found = await describeRegisteredMux(client, undefined);

		expect(found.name).toBe(LSP_MUX_DAEMON_NAME);
		expect(client.asked).toEqual([LSP_MUX_DAEMON_NAME]);
	});

	it("reports no record when the project has never run a mux under either name", async () => {
		// The empty scope must stay distinguishable from the legacy-only scope: the
		// first is a fresh spawn, the second is a wedged daemon to retire.
		const client = brokerWith([]);
		const found = await describeRegisteredMux(client, undefined);

		expect(found.record).toBeUndefined();
		expect(found.name).toBe(LSP_MUX_DAEMON_NAME);
		expect(client.asked).toEqual([LSP_MUX_DAEMON_NAME, LSP_MUX_DAEMON_NAME_LEGACY]);
	});
});
