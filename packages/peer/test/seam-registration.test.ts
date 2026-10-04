/**
 * `epic-jwsy.12` — the two extension seams, and the test the programme exists for.
 *
 * ## Why this file builds packages on disk
 *
 * §16.4's test is *"write an extension outside this repo … then confirm `git diff`
 * against core is empty"*. A test that imports the seam modules by relative path
 * cannot fail when core hard-codes the thing the seam exists to remove: it is
 * inside the package, so it moves with it. The fixtures below are therefore real
 * directories with their own `package.json` and their own `node_modules`, reached
 * only through the `@ultraworkers/peer` specifier — so a seam that exists but is
 * not reachable from outside is red here, which is the entire claim.
 *
 * Resolution is a symlink to the repo, following
 * `test/plugin-doctor-version-drift.test.ts:164` (`fs.symlink` into an
 * `installedDir`). The alternative — copying `src/` into the fixture — would test
 * a snapshot, and a snapshot passes when the real package has drifted.
 *
 * ## The registry is process-global, so every row resets it
 *
 * `overrides` and `builtin` are module-level, and a leaked registration from one
 * row would silently decide another row's answer. `afterEach` returns both to a
 * known state rather than trusting each row to tidy up after itself.
 */

import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	activePeerTransport,
	hasPeerLockBackend,
	hasPeerTransportOverride,
	PEER_TRANSPORT_PROTOCOL_VERSION,
	registerPeerLockBackend,
	registerPeerTransport,
	resolveLockDecision,
	setBuiltinPeerTransport,
	toDeliveryOutcome,
	unreadAvailability,
	unregisterPeerTransport,
	type LockBackendOpinion,
	type PeerLockBackend,
	type PeerTransport,
	type TransportOutcome,
} from "../src/seam/index";
import type { AcquireResult, Lease } from "../src/lease/index";

const REPO_PACKAGE = path.join(import.meta.dir, "..");
const roots: string[] = [];

/**
 * Disposers owed by rows that have not released yet.
 *
 * Collected rather than left to each row's own `release()` call, because a row
 * that fails BEFORE its release leaves a live registration behind — and a
 * process-global registry then decides the NEXT row's answer. That is how one
 * broken row becomes six unrelated red ones, and it happened on this file's first
 * run. Every owed disposer is called here, so the reset does not depend on the
 * row reaching its own cleanup.
 */
const owedReleases: (() => void)[] = [];

/** Register a backend and remember its disposer, so a mid-row failure cannot leak it. */
function trackedBackend(backend: PeerLockBackend): void {
	owedReleases.push(registerPeerLockBackend(backend));
}

afterEach(async () => {
	for (const release of owedReleases.splice(0)) release();
	setBuiltinPeerTransport(undefined);
	// Every id these rows register, in case a row asserted before registering.
	for (const id of ["fixture-transport", "fixture-transport-2", "stale-version", "t-A", "t-B"]) {
		unregisterPeerTransport(id);
	}
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

/** A transport with the given identity, overridable per-capability. */
function transportFixture(
	id: string,
	overrides: Partial<PeerTransport["capabilities"]> = {},
	outcome: TransportOutcome = { kind: "delivered", outcome: "injected" },
): PeerTransport {
	return {
		id,
		protocolVersion: PEER_TRANSPORT_PROTOCOL_VERSION,
		capabilities: { crossProcess: true, durable: true, injects: true, ...overrides },
		deliver: async () => outcome,
	};
}

/**
 * A real package outside this repo, with `@ultraworkers/peer` resolvable in it.
 *
 * Writes the manifest and the symlink the way an installed plugin would have
 * them, then returns the fixture's entry path for `import()`. The symlink points
 * at the repo package rather than a copy, so the fixture exercises the code that
 * ships.
 */
async function outOfRepoPackage(name: string, entrySource: string): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), `peer-ext-${name}-`));
	roots.push(root);
	const pkgDir = path.join(root, "node_modules", "@ultraworkers", "peer");
	await fs.mkdir(path.dirname(pkgDir), { recursive: true });
	await fs.symlink(REPO_PACKAGE, pkgDir, "dir");
	await Bun.write(path.join(root, "package.json"), JSON.stringify({ name: `fixture-${name}`, type: "module" }));
	const entry = path.join(root, "index.ts");
	await Bun.write(entry, entrySource);
	return entry;
}

/** Import a fixture as a module, from outside the repo. */
async function importFixture(entry: string): Promise<Record<string, unknown>> {
	return (await import(entry)) as Record<string, unknown>;
}

describe("an extension written outside this repo registers both seams", () => {
	it("reaches the transport seam and the lock seam through the package specifier alone", async () => {
		// The programme's own test. If either seam is core-owned with no reachable
		// registration, this throws on the import and the row fails — which is the
		// failure §16.4 was written to catch.
		const entry = await outOfRepoPackage(
			"both",
			`import { registerPeerTransport, registerPeerLockBackend, unregisterPeerTransport, PEER_TRANSPORT_PROTOCOL_VERSION }
				from "@ultraworkers/peer";
			 export function activate() {
				registerPeerTransport({
					id: "fixture-transport",
					protocolVersion: PEER_TRANSPORT_PROTOCOL_VERSION,
					capabilities: { crossProcess: true, durable: true, injects: true },
					deliver: async () => ({ kind: "delivered", outcome: "injected" }),
				});
				return registerPeerLockBackend({
					id: "fixture-backend",
					explain: () => undefined,
				});
			 }
			 export function deactivate(release) {
				unregisterPeerTransport("fixture-transport");
				release();
			 }
			`,
		);
		const fixture = await importFixture(entry);

		expect(typeof fixture.activate).toBe("function");
		// Tracked like any other registration: the fixture shares this process's
		// module instance (the symlink resolves to the repo), so a registration it
		// leaves behind is a live registration that decides the NEXT row's answer.
		// That is not hypothetical — it is how the two rows below this one first
		// went red.
		const release = (fixture.activate as () => () => void)();
		owedReleases.push(release);

		// Asserted through the PACKAGE's own view, not the seam module's: the point
		// is that an outside caller can observe the effect, not that the internals
		// changed.
		const viaPackage = await importFixture(await outOfRepoPackage("probe", `export * from "@ultraworkers/peer";`));
		expect((viaPackage.activePeerTransport as () => { id: string } | undefined)()?.id).toBe("fixture-transport");
		expect((viaPackage.hasPeerLockBackend as () => boolean)()).toBe(true);
	});

	it("resolves @ultraworkers/peer from the fixture, not from a relative path", async () => {
		// The control for the row above. Without this, a fixture that resolved the
		// seam by some other route would satisfy it for the wrong reason — and
		// §16.4's whole claim is about the ROUTE, not the destination.
		const entry = await outOfRepoPackage(
			"specifier",
			`import * as peer from "@ultraworkers/peer";
			 export const names = Object.keys(peer).filter(n => n.includes("Peer") || n.startsWith("registerPeer"));
			`,
		);
		const fixture = await importFixture(entry);
		expect(fixture.names).toEqual(
			expect.arrayContaining(["registerPeerTransport", "registerPeerLockBackend", "registerPeerTools"]),
		);
	});
});

describe("re-registering an id makes the newest transport the active one", () => {
	it("does not let the first registration keep serving under a reused id", () => {
		// The consumer this defends: `activePeerTransport` is documented as "the
		// last registration wins", and an extension reload re-registers under the
		// same id. If re-registration did not take effect, the session would keep
		// talking to the transport object the previous load installed — with no
		// error, no warning, and a fresh object in the registry that is never read.
		// `Map.set` on an existing key replaces the value but KEEPS the original
		// insertion order, so "last" is decided by first-registration time.
		setBuiltinPeerTransport(transportFixture("builtin-uds"));

		// Control: distinct ids, last registered is last. Without this the row below
		// could be satisfied by a registry that simply always returns the only entry.
		registerPeerTransport(transportFixture("t-A"));
		registerPeerTransport(transportFixture("t-B"));
		expect(activePeerTransport()?.id).toBe("t-B");

		// The defect: t-A is registered LAST in time, but was inserted first.
		const reloaded = transportFixture("t-A");
		registerPeerTransport(reloaded);

		// Identity, not id: a registry that kept the old VALUE under a matching id
		// would pass an id comparison while still serving the stale transport.
		expect(activePeerTransport()).toBe(reloaded);
	});
});

describe("unregistering restores the built-in", () => {
	it("returns the built-in transport, because 'full custom' needs a defined exit", async () => {
		// §16.1's table: override then unregister ⇒ built-in restored. Without this
		// row, `unregisterPeerTransport` could delete the only transport in the
		// process and nothing would notice — the user would have overridden their
		// transport and then had no way back.
		const builtin = transportFixture("builtin-uds");
		setBuiltinPeerTransport(builtin);

		const override = transportFixture("fixture-transport");
		registerPeerTransport(override);
		expect(activePeerTransport()).toBe(override);

		expect(unregisterPeerTransport("fixture-transport")).toBe(true);
		// Identity, not just equality of shape: "the built-in came back" is a
		// stronger claim than "some transport with these capabilities is active".
		expect(activePeerTransport()).toBe(builtin);
	});

	it("reports a stale id instead of throwing, so teardown order cannot matter", async () => {
		// `unregisterProvider` is idempotent by construction and the loader clears
		// pending registrations on a path that can run twice. A throw here would
		// make an extension's teardown order significant.
		setBuiltinPeerTransport(transportFixture("builtin-uds"));
		expect(unregisterPeerTransport("never-registered")).toBe(false);
		expect(activePeerTransport()?.id).toBe("builtin-uds");
	});

	it("clears the built-in without disturbing registrations above it", async () => {
		// The host owns the base layer; an extension's registration is a separate
		// thing and must survive the host releasing its own. If these were one
		// registry, tearing down the host's transport would silently disarm every
		// extension override too.
		setBuiltinPeerTransport(transportFixture("builtin-uds"));
		const override = transportFixture("fixture-transport");
		registerPeerTransport(override);

		setBuiltinPeerTransport(undefined);

		expect(hasPeerTransportOverride()).toBe(true);
		expect(activePeerTransport()).toBe(override);
	});
});

describe("a non-injecting transport refuses to report a delivery", () => {
	it("returns failed and names the missing capability", async () => {
		// #87501's shape: `success: true` for a message that was never ingested.
		// The transport here reports the most optimistic outcome available and
		// still must not be believed, because `injects: false` says the transcript
		// cannot have received it.
		const mailbox = transportFixture(
			"fixture-transport",
			{ injects: false },
			{ kind: "delivered", outcome: "injected" },
		);
		const receipt = toDeliveryOutcome(mailbox, "peer-b", { kind: "delivered", outcome: "injected" });

		expect(receipt.outcome).toBe("failed");
		// The reason is part of the contract: a bare `failed` teaches the sender
		// nothing, and this is a configuration mistake, not a transient fault.
		expect(receipt.error).toContain("injects: false");
	});

	it("does not count persistence as delivery either", async () => {
		// The subtler half. A durable, injecting transport that persists instead of
		// injecting has still not delivered — IrcBus reports `failed` for its own
		// buffered hand-off (bus.ts:175-182), and this seam must agree with the
		// precedent it cites.
		const durable = transportFixture("fixture-transport", {}, { kind: "persisted" });
		const receipt = toDeliveryOutcome(durable, "peer-b", { kind: "persisted" });

		expect(receipt.outcome).toBe("failed");
		expect(receipt.error).toContain("not reported as a delivery");
	});

	it("passes a genuine in-process delivery through untouched", async () => {
		// The control for both rows above. A seam that refused everything would
		// satisfy the #87501 defence while making the seam useless — so the
		// positive path has to be asserted, not assumed.
		const live = transportFixture("fixture-transport");
		expect(toDeliveryOutcome(live, "peer-b", { kind: "delivered", outcome: "woken" }).outcome).toBe("woken");
		expect(toDeliveryOutcome(live, "peer-b", { kind: "delivered", outcome: "revived" }).outcome).toBe("revived");
	});

	it("surfaces a refusal's cause rather than flattening it to failed", async () => {
		// A refusal nobody can explain is one nobody retries. The outcome is the
		// same `failed` a transport denial produces, so the cause has to survive
		// separately or the two become indistinguishable to a caller.
		const live = transportFixture("fixture-transport");
		const receipt = toDeliveryOutcome(live, "peer-b", { kind: "refused", cause: "peer-b has no live session" });

		expect(receipt.outcome).toBe("failed");
		expect(receipt.error).toBe("peer-b has no live session");
	});
});

describe("a non-durable transport explains why there is nothing to read", () => {
	it("says the messages did not survive, rather than reporting an empty inbox", async () => {
		// §16.2's second case. An empty unread list after a restart is
		// indistinguishable from nobody writing to you, and that silence is how
		// "my messages disappeared" becomes undebuggable.
		const ephemeral = transportFixture("fixture-transport", { durable: false });
		const availability = unreadAvailability(ephemeral);

		expect(availability.readable).toBe(false);
		if (!availability.readable) {
			expect(availability.reason).toContain("not durable");
			// The distinction the whole row exists for: nothing-survived is not
			// nothing-arrived.
			expect(availability.reason).toContain("nothing survived");
		}
	});

	it("reports an absent transport instead of pretending there is an inbox", async () => {
		// Same silence, reached the other way: no transport at all. Returning
		// `readable: true` here would produce an empty list that reads as "caught
		// up" on a host that never wired delivery.
		const availability = unreadAvailability(undefined);

		expect(availability.readable).toBe(false);
		if (!availability.readable) expect(availability.reason).toContain("No peer transport");
	});

	it("allows reading when the transport is durable", async () => {
		// The control: a capability gate that refused everything would pass both
		// rows above.
		expect(unreadAvailability(transportFixture("fixture-transport")).readable).toBe(true);
	});
});

describe("a protocol-version mismatch is refused at registration", () => {
	it("throws at register, not at send", async () => {
		// §16.2's third case. `pi-peer-messaging` has no handshake, so a skew
		// discovered at send time surfaces as `Unknown client message type:
		// presence` and a dead socket — which points at the network rather than at
		// the version. The throw has to happen while the author is watching.
		expect(() =>
			registerPeerTransport({
				id: "stale-version",
				protocolVersion: PEER_TRANSPORT_PROTOCOL_VERSION + 1,
				capabilities: { crossProcess: true, durable: true, injects: true },
				deliver: async () => ({ kind: "delivered", outcome: "injected" }),
			}),
		).toThrow(/protocol version/);
	});

	it("leaves the registration unmade, so the built-in is still in force", async () => {
		// A throw that still recorded the transport would leave a broken override
		// shadowing a working built-in — the extension's load fails, and the user's
		// transport is gone anyway.
		const builtin = transportFixture("builtin-uds");
		setBuiltinPeerTransport(builtin);

		expect(() =>
			registerPeerTransport(
				transportFixture("stale-version", {}) && {
					...transportFixture("stale-version"),
					protocolVersion: PEER_TRANSPORT_PROTOCOL_VERSION + 99,
				},
			),
		).toThrow();

		expect(hasPeerTransportOverride()).toBe(false);
		expect(activePeerTransport()).toBe(builtin);
	});

	it("applies the same check to the built-in, so the two layers cannot disagree", async () => {
		// The host installing a mismatched transport has made the same mistake one
		// layer down. If only extensions were checked, `activePeerTransport()` could
		// return something `registerPeerTransport` would have refused.
		expect(() =>
			setBuiltinPeerTransport(
				transportFixture("stale-version") && {
					...transportFixture("builtin-uds"),
					protocolVersion: PEER_TRANSPORT_PROTOCOL_VERSION + 99,
				},
			),
		).toThrow(/protocol version/);
	});
});

describe("the lock backend explains a denial and cannot grant one", () => {
	/**
	 * Annotated `AcquireResult` rather than written as a bare literal.
	 *
	 * A hand-written lease literal drifted once already: it predated `acquiredTs`,
	 * every row still passed at runtime, and `check:types` was the only thing that
	 * noticed — so "164 pass" was briefly a count over a file that did not compile.
	 * The annotation makes the next added field a compile error here too.
	 */
	const heldLease: Lease = {
		id: 1,
		owner: "peer-a",
		idempotency: null,
		pathPattern: "src/a.ts",
		exclusive: true,
		fenceToken: 7,
		expiresTs: 9_999,
		releasedTs: null,
		acquiredTs: 1_000,
	};
	const denial: AcquireResult = { ok: false, conflicts: [heldLease] };
	const request = { owner: "peer-b", pathPattern: "src/a.ts" };

	it("replaces the message a holder reads, without touching the verdict", async () => {
		// The fallback shape: core keeps ownership, the handler is asked only what a
		// refusal means. Asserted as identity so "the verdict came back untouched"
		// is the claim being tested, not merely that `ok` is still false.
		trackedBackend({
			id: "fixture-backend",
			explain: () => ({ grant: false, reason: "peer-a is editing this file; retry after it commits" }),
		});

		const decision = resolveLockDecision(denial, request);

		expect(decision.result).toBe(denial);
		expect(decision.explanation?.reason).toContain("retry after it commits");
	});

	it("cannot turn a refusal into a grant", () => {
		// `LockBackendOpinion.grant` is the type-level guarantee: a backend has no
		// way to express an allow, so "an extension unlocked a path core was
		// holding" is unreachable without a signature change.
		trackedBackend({ id: "fixture-backend", explain: () => ({ grant: false, reason: "still denied" }) });

		const decision = resolveLockDecision(denial, request);

		expect(decision.result.ok).toBe(false);
	});

	it("ignores a backend that forges a grant at runtime", () => {
		// The row the first version of this file was MISSING, found by mutation:
		// adding a `reason === "GRANT"` escape hatch to `resolveLockDecision` left
		// every other row green, because the only "cannot grant" row used a
		// well-behaved backend. A type says nothing to a JavaScript caller, and an
		// extension author with a cast — or no typecheck at all — is exactly the
		// person this seam exists to constrain.
		//
		// The defence is structural: `consultLockBackends` rebuilds a
		// `LockExplanation` from `id`/`reason`/`blames` and carries nothing else
		// across, so a forged field is dropped rather than honoured. Asserting the
		// verdict is core's own object is what makes that visible.
		trackedBackend({
			id: "fixture-backend",
			// The cast is the point: `grant: true` does not typecheck, which is why
			// the runtime shape has to be tested separately from the compile error.
			explain: () => ({ grant: true, reason: "granted" }) as unknown as LockBackendOpinion,
		});

		const decision = resolveLockDecision(denial, request);

		expect(decision.result).toBe(denial);
		expect(decision.result.ok).toBe(false);
		// The mechanism rather than the outcome: the forged field did not survive
		// the crossing. Keyed on `grant` specifically rather than on the whole key
		// set, because `blames` is always an own key (`blames: undefined`) and a
		// full-set assertion would be asserting an unrelated detail.
		expect(Object.keys(decision.explanation ?? {})).not.toContain("grant");
	});

	it("leaves the denial alone when the backend has no opinion", async () => {
		// `undefined` and "uphold" are different answers: a backend that has not
		// looked must not overwrite the reason with a shrug.
		trackedBackend({ id: "fixture-backend", explain: () => undefined });

		const decision = resolveLockDecision(denial, request);

		expect(decision.result).toBe(denial);
		expect(decision.explanation).toBeUndefined();
	});

	it("is never consulted about a claim that succeeded", () => {
		// A backend exists to explain a denial. Being asked to bless a success would
		// give it a veto over claims it has no stake in.
		let consulted = false;
		trackedBackend({
			id: "fixture-backend",
			explain: () => {
				consulted = true;
				return { grant: false, reason: "unwanted" };
			},
		});

		const granted: AcquireResult = { ok: true, lease: heldLease };
		const decision = resolveLockDecision(granted, request);

		expect(decision.result).toBe(granted);
		expect(decision.explanation).toBeUndefined();
		expect(consulted).toBe(false);
	});

	it("stops consulting once its disposer runs", () => {
		// The runner calls the disposer on session shutdown so no handler outlives
		// its session. A registry that ignored it would keep a dead extension's
		// explanation live for the rest of the process.
		let consulted = false;
		const backend: PeerLockBackend = {
			id: "fixture-backend",
			explain: () => {
				consulted = true;
				return { grant: false, reason: "x" };
			},
		};
		const release = registerPeerLockBackend(backend);
		expect(hasPeerLockBackend()).toBe(true);

		release();

		expect(hasPeerLockBackend()).toBe(false);
		resolveLockDecision(denial, request);
		expect(consulted).toBe(false);
	});

	it("reports no consultation at all when nothing is registered", () => {
		// Zero backends is the common case, and it must not read as "a backend
		// declined to comment" — that is a different statement about a different
		// situation.
		expect(hasPeerLockBackend()).toBe(false);
		const decision = resolveLockDecision(denial, request);

		expect(decision.result).toBe(denial);
		expect(decision.explanation).toBeUndefined();
	});
});
