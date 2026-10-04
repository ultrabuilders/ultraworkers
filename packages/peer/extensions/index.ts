/**
 * The peer extension's entry point — the file that makes this package loadable.
 *
 * ## Why this file exists at all
 *
 * `packages/peer` had a complete, tested implementation and **no way to reach it**.
 * `package.json` declared eleven `exports` subpaths and no `omp.extensions`
 * manifest, so `registerPeerTools` — the only function that registers the four
 * verbs — had no caller anywhere, including tests. An out-of-repo extension could
 * `import { registerPeerTools } from "@ultraworkers/peer/tools"` and then have no
 * way to be *run*: the loader resolves an extension by reading `pkg.omp ??
 * pkg.pi` → `manifest.extensions`
 * (`coding-agent/src/extensibility/extensions/directory-resolution.ts:69`) and
 * then calls `typeof module === "function" ? module : module.default`
 * (`…/extensions/loader.ts:108`). A package with neither is a library that cannot
 * become a plugin, which is the one thing this package is for.
 *
 * This is the file that closes it, and it is deliberately **the whole fix**: one
 * default export, no behaviour invented here.
 *
 * ## COPIED, not derived
 *
 * The activation contract — a default-exported function taking `ExtensionAPI`,
 * named by an `extensions` array in the package manifest — is copied from
 * `pi-cross-session`, which is the shape the loader was built against:
 *
 *   source:  pi-cross-session (local reference clone)
 *   file:    extensions/cross-session.ts
 *   symbol:  `export default function (pi: ExtensionAPI)`
 *   licence: MIT, Copyright (c) 2026 gcoder1991
 *
 * Copied rather than rewritten, per the owner instruction to prefer a working
 * implementation over a re-derived one. What that reference does *inside* the
 * function — its own registration file format, its own heartbeat, its own
 * admission accounting — is deliberately **not** copied: this package already owns
 * those concerns (`presence/`, `inbox/`, `lease/`, `fence/`), and a second
 * implementation of each would be a second thing to keep correct. Only the
 * *shape* is taken, because the shape is what the loader speaks.
 *
 * ## `omp` rather than `pi`, and why that is the copy-with-a-delta
 *
 * The reference spells the manifest key `pi`; this repository spells it `omp`
 * everywhere it spells it at all — `test/fixtures/outsider-extension/package.json`
 * and `examples/extensions/with-deps/package.json`, both `"omp": { "extensions":
 * [...] }`. The loader accepts either (`pkg.omp ?? pkg.pi`), so both work; `omp` is
 * chosen because it is the spelling with precedent **in this repo**, and a
 * manifest is a contract other authors copy from.
 *
 * ## Why registration is deferred to the first context
 *
 * `activate` receives the API and no context, but five of the six things the verbs
 * need are per-session facts — the agent id, the lease database, the inbox, the
 * roster, the fence context. `api.on("session_start", …)` is the first hook that
 * hands over an `ExtensionContext`, and the four verbs are registered **there**,
 * once, guarded by a flag. Registering at activate-time would mean inventing
 * defaults for facts the host has not stated yet, and a `peer.lock` that guarded
 * the wrong lease database is worse than one that is not registered yet.
 */

import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { settings } from "@oh-my-pi/pi-coding-agent";
import { cfgPeerCrossSessionInbound } from "@oh-my-pi/pi-coding-agent/peer/settings";
import type { Database } from "bun:sqlite";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getAgentDir, logger } from "@oh-my-pi/pi-utils";

import { fenceInbound, checkHopChain, SENDER_MODES, type InboundPolicy, type SenderMode } from "../src/fence/index";
import { InboxStore } from "../src/inbox/store";
import { openLeaseStore } from "../src/lease/store";
import { allocateName, nameKey, openNameStore, claimName, resolveName } from "../src/identity/index";
import { registerPeerTools, type PeerToolDeps } from "../src/tools/register";
import { registerPeerCommands } from "../src/tools/commands";
import { peerEndpoint } from "../src/transport/endpoint";
import { PEER_TRANSPORT_PROTOCOL_VERSION } from "../src/seam/transport";

/**
 * Where this project's peer state lives.
 *
 * Under the agent dir rather than the working directory: two sessions of the same
 * project must agree on it, and `cwd` is per-session in a worktree. `getAgentDir()`
 * is profile-scoped, so two profiles do not collide either.
 */
function peerRoot(): string {
	return path.join(getAgentDir(), "peer");
}

/**
 * This session's instance id — the token the hop chain is built from.
 *
 * ## Why this is minted per session and not derived
 *
 * `checkHopChain` counts how many entries of an inbound chain are **our own**, and
 * the only way that count is ever non-zero is if the sender appends a token we can
 * recognise. So the token has to be (a) stable for the life of this session, and
 * (b) different from every other session's. Deriving it from the pid would satisfy
 * neither across a restart that reuses the pid, and deriving it from `cwd` would
 * give every session in a worktree the same token — which turns the loop check
 * into a depth check and loses exactly the case it exists for.
 *
 * A fresh UUID per process start is the honest reading of "a session that
 * restarted genuinely is not the session its peers were talking to", which is the
 * same rule `packages/peer/README.md` states for names.
 */
const INSTANCE_ID = crypto.randomUUID();

/** The display name paired with {@link INSTANCE_ID}. Replaced by `/rename`. */
let currentName = "peer";

export default function peerExtension(api: ExtensionAPI): void {
	let registered = false;

	api.on("session_start", async (_event, ctx: ExtensionContext) => {
		// Once per process, not once per session_start: a reconnect re-fires the hook,
		// and a second `peer.send` registration would be last-wins rather than an error,
		// so the duplicate would be invisible.
		if (registered) return;
		registered = true;

		const root = peerRoot();
		// `openLeaseStore` opens SQLite with `create: true`, which creates the FILE and
		// not the directory above it — a first run under a fresh agent dir dies with
		// `SQLITE_CANTOPEN` before a single verb is registered. Create the root here
		// rather than relying on a store to do it, because the three stores disagree:
		// `InboxStore` makes its own inbox directory, and `openLeaseStore`/`openNameStore`
		// make nothing at all.
		await fs.mkdir(root, { recursive: true });
		const leaseDb = openLeaseStore(path.join(root, "leases.db"));
		const nameDb = openNameStore(path.join(root, "names.db"));
		const inbox = new InboxStore(path.join(root, "inbox", INSTANCE_ID));

		// Allocate a name from the closed space, skipping any this store already holds.
		// `claimName` is what makes the allocation survive the process: a name handed
		// out here is recorded, so a second session cannot mint the same one while this
		// one is alive. `/rename` moves it afterwards.
		// `resolveName`, not a hand-written `SELECT`. The store's table is
		// `peer_names` with a `name` primary key — there is no `names` table and no
		// `name_key` column, so the previous inline query raised `no such table: names`
		// on a first run and the extension died before registering anything. It also
		// could not have been right even against the right table: it ignored the
		// live/held/expired split that is the reason this store exists, so it would
		// have reported an expired name as taken forever.
		const allocated = allocateName(INSTANCE_ID, name => isNameHeld(nameDb, name));
		// `claimName(db, options)` — an options object, and a `ClaimResult` back. The
		// previous call passed `(db, INSTANCE_ID, allocated.name)` positionally, so
		// `options.name` was the instance id's `.replace` on `undefined` and the
		// handler threw before registering anything.
		//
		// A refusal here means the store changed between `allocateName`'s scan and this
		// claim, which is rare but real, so it is logged rather than swallowed. The
		// fallback is the allocated name because it is the best name this session has:
		// `allocateName` already skipped every live and held one, and `selfId` — what
		// `peer.list` marks and what the hop chain counts — is `INSTANCE_ID`, not this
		// string.
		const claim = claimName(nameDb, { name: allocated.name, instanceId: INSTANCE_ID });
		if (claim.ok) {
			currentName = claim.name;
		} else {
			logger.warn("peer extension could not claim its allocated name", {
				instanceId: INSTANCE_ID,
				name: allocated.name,
				reason: claim.reason,
			});
			currentName = allocated.name;
		}

		/**
		 * The tokens a returning message is checked against.
		 *
		 * Only **our own**, which is what `checkHopChain` reads
		 * (`fence/index.ts:194`). A peer does not need to be in this set for its token
		 * to be recorded in the chain — it is appended by the *sender* — so a single
		 * entry is sufficient and a registry would be a category of state that can
		 * disagree with the chain it is meant to explain.
		 */
		const ownTokens: ReadonlySet<string> = new Set([INSTANCE_ID]);

		const deps: PeerToolDeps = {
			selfId: INSTANCE_ID,
			leaseDb: () => leaseDb,
			inbox: () => inbox,
			roster: async () => {
				// STUB, and honestly so: no presence registry is wired, so an empty
				// roster is the answer rather than a fabricated one. `peer.list` renders
				// "No peer sessions are registered." against it, which is correct — this
				// process genuinely cannot enumerate its peers.
				return [];
			},
			deliver: async ({ notifyWhenIdle }: { notifyWhenIdle: boolean }) => {
				// STUB, for the same reason and with the same honesty. No transport is
				// registered in production, so there is no route; reporting zero
				// delivered is the contract — a fabricated success here would be the one
				// lie a delivery path can tell.
				//
				// This comment used to name `epic-jwsy.10` as the bead that would replace
				// both stubs. That bead is CLOSED, and it did not: it delivered the SEAM
				// (`registerPeerTransport` is implemented at loader.ts:341, and
				// `createPeerSocketTransport` exists at peer/src/transport/send.ts:201)
				// but nothing in production CALLS either. Measured: zero production
				// callers of `registerPeerTransport(`, zero of `createPeerSocketTransport`;
				// both appear only in tests. So the seam is reachable from a test and
				// from nowhere else — the `epic-jwsy.11` shape, where a registered
				// capability reads as delivered because nothing was ever asked to deliver.
				//
				// `notifyWhenIdleHonoured: false` is the honest half. With no transport there
				// is nobody who could notice the recipient going idle, so the answer is
				// `false` — and reporting it lets `peer.send` refuse a request it cannot keep
				// rather than answer `ok: true` to a promise nothing was going to honour
				// (epic-m9wi). Reported only when asked for, so an ordinary send is unchanged.
				return {
					delivered: 0,
					receipts: [],
					...(notifyWhenIdle ? { notifyWhenIdleHonoured: false } : {}),
				};
			},
		};

		// Built once and HELD, because the host reads it per send via a spread
		// (`resolveInboundFenceContext()` is called from `#deliver`), so mutating this
		// object changes what the next message sees. Passing `fenceContext(ownTokens)`
		// inline would evaluate it once here and freeze the answer for the life of the
		// process, so a user changing `crossSessionInbound` mid-session would keep getting
		// the decision they gave before the change.
		const fenceCtx = fenceContext(ownTokens);

		// Keep the live policy live. Re-registering instead would push a second entry onto
		// `extension.peerFences` on every reload, which the runner installs in order
		// (`runner.ts:1336`) — the newest would win, but the array and its disposers would
		// grow without bound. Mutating in place is the seam the host documents for exactly
		// this: "Mutating the INSTALLED context in place still works, because the spread
		// reads it on every call."
		api.onAfterConfigReload(() => {
			const policy = cfgPeerCrossSessionInbound.get(settings);
			if (policy !== undefined) fenceCtx.policy = policy;
			// Absent stays absent: `'policy' in context` is asserted by this package's own
			// test, so an unset decision must delete the key rather than store undefined.
			else delete fenceCtx.policy;
		});

		registerPeerTools(api, {
			...deps,
			inboundFence: {
				// The decision function, structurally typed by the host rather than
				// imported as a peer type — `InboundFenceRegistration.fence` is the
				// host's `IrcFence`, and this is the peer's `fenceInbound` behind it.
				fence: (message, receiver) => {
					const decision = fenceInbound(
						{
							from: message.from,
							chain: message.chain,
							fromMode: toSenderMode(message.fromMode),
							selfSent: message.selfSent,
						},
						{
							...receiver,
							mode: toSenderMode(receiver.mode) ?? "default",
							ownTokens,
						},
					);
					if (decision.action === "accept") return { action: "accept" };
					return { action: decision.action, reason: decision.reason };
				},
				context: fenceCtx,
			},
		});

		registerPeerCommands(api, {
			currentName: () => currentName,
			applyName: next => {
				currentName = next;
			},
			isNameTaken: key => isNameHeld(nameDb, key),
			roster: deps.roster,
			notify: message => {
				logger.info(message);
			},
		});

		logger.info("peer extension loaded", { instanceId: INSTANCE_ID, endpoint: peerEndpoint(ctx.cwd, root) });
	});
}

/**
 * Whether a name is already spoken for, as the store sees it.
 *
 * `resolveName` answers with a three-way split — `live`, `expired`, `unknown` — and
 * only `unknown` means free. An `expired` hold is claimable again; that is the whole
 * reason the store keeps `held_until` rather than deleting the row, so a predicate
 * that cannot express "expired" strands every name a crashed session was holding.
 *
 * `nameKey` lowercases, which is the package's own normalisation and matches the
 * primary key the allocator writes.
 */
function isNameHeld(db: Database, name: string): boolean {
	return resolveName(db, nameKey(name)).kind !== "unknown";
}

/**
 * Narrow the host's `string`-typed mode to the fence's vocabulary.
 *
 * The host types both `IrcFenceMessage.fromMode` and `IrcFenceReceiver.mode` as
 * plain `string`, while `fenceInbound` takes the narrower `SenderMode`. `SENDER_MODES`
 * is the fence's own list of what it recognises, and `fenceInbound` already handles a
 * value outside it (`fence/index.ts:428`), so an unrecognised mode becomes `undefined`
 * and takes that branch rather than being asserted into the union. That is why this is
 * a lookup and not a cast: the cast would claim the host always sends a known mode,
 * which is exactly the claim this package cannot make.
 */
function toSenderMode(raw: string | undefined): SenderMode | undefined {
	return SENDER_MODES.find(mode => mode === raw);
}

/**
 * The receiver context this extension registers.
 *
 * ## What is absent from this file, and what is NOT
 *
 * There is no `policy` here, and nothing in THIS FILE supplies one.
 *
 * MEASURED, and the previous version of this comment got half of it wrong: it claimed an
 * extension had "no route" to the `crossSessionInbound` descriptor because `api.pi`
 * re-exports `settings` but not the descriptor. The route exists — the package's export
 * map carries a `./*` wildcard, so `@oh-my-pi/pi-coding-agent/peer/settings` resolves to
 * `./src/peer/settings.ts` and exports `cfgPeerCrossSessionInbound`, whose descriptor has
 * `.get(scope)`. Verified by importing the module, not by reading the export map:
 *
 * ```
 * $ bun -e 'const m = await import("@oh-my-pi/pi-coding-agent/peer/settings"); …'
 * RESOLVED. keys: CFG_PEER_CROSS_SESSION_INBOUND_VALUES, cfgPeerCrossSessionInbound
 * cfgPeerCrossSessionInbound id: crossSessionInbound
 * ```
 *
 * So `import { settings } from "@oh-my-pi/pi-coding-agent"` (exported at `index.ts:18`)
 * plus that descriptor would reach the user's choice WITHOUT a line of core changing —
 * which is the programme's own test, so closing this gap is an extension's job, not a core
 * change. What is true here is narrower: `ExtensionContext` exposes no `settings` field,
 * so reading it means importing the singleton rather than being handed one.
 *
 * Both halves are now written: the imports above, and `policy` is read from the user's
 * setting rather than left unset. The setting carries `default: undefined`, so a user who
 * never chose still gets `undefined` — their absence rather than consent — and `fenceInbound`
 * resolves unset by comparing the two sessions' permission classes
 * (`fence/index.ts:118`) instead of choosing for them.
 *
 * `policySource` is deliberately still absent. The handle can report provenance
 * (`Setting.provenance(scope)`), but that vocabulary is `SettingProvenance` —
 * `env | runtime | overlay | project | global | default` — a *settings layer*, whereas the
 * fence's `policySource` is `user | managed | repo | flag`, which is *who decided*. Only
 * `global` → `user` and `project` → `repo` pair obviously; mapping the rest would be a
 * guess about a decision this package does not own. The field is optional and nothing in
 * `fenceInbound` branches on it to reach a decision, so it stays absent rather than filled
 * with a plausible-looking wrong answer.
 *
 * The previous version of this file read `ctx.policy`, typed the context as
 * `ExtensionContext & { readonly policy?: string }`, and cast the read with
 * `as never`. An intersection with an *optional* field adds no runtime field, so the
 * read was `undefined` on every call — and the cast is what stopped the compiler from
 * saying so. It typechecked green while the setting it claimed to carry never arrived.
 *
 * A host change (a settings seam on `ExtensionContext`, or a `policy` passed to the fence at
 * call time) is one way to close that, and was the previous claim here. It is not the only way,
 * and it is not the cheapest: the two imports above reach the same value with no core edit at
 * all. Prefer the import; take the host seam only if it turns out something about the value
 * itself needs to change hands.
 *
 * ## PRECONDITION: the host must have run `Settings.init()`
 *
 * `settings` is a **Proxy** that throws `Settings not initialized` on any read before
 * `Settings.init()` (`config/settings.ts:3982`). This function reads it, so it inherits
 * that precondition. Worth stating because the failure is badly shaped: an uninitialised
 * host does not report a settings error, it reports **no extension at all** —
 * `discoverAndLoadExtensions` returns zero extensions with an **empty `errors` array**,
 * which is indistinguishable from never having been installed. Measured both orders:
 *
 * ```
 * init BEFORE discover -> extensions: []   errors: []     <- silently nothing
 * discover BEFORE init -> extensions: [ .../peer/extensions/index.ts ]
 * ```
 *
 * (`getAgentDir()` is unchanged by `init`, so this is not the agent dir moving.) If you
 * reorder initialisation and the extension vanishes with no error, this is why.
 */
function fenceContext(ownTokens: ReadonlySet<string>): {
	policy?: InboundPolicy;
	readonly mode: "default";
	readonly ownTokens: ReadonlySet<string>;
} {
	// `default`, not the session's `ctx.mode`: that is `ExtensionMode` (`"tui"` and
	// friends), a different vocabulary from the fence's `SenderMode`, and it describes
	// the host's rendering mode rather than this sender's permission class.
	//
	// `policy` is spread conditionally, so an unset choice leaves the key ABSENT rather
	// than present-and-`undefined`. The bus cannot tell those apart — it reads
	// `context.policy` either way — but `'policy' in context` can, and
	// `buildInboundFenceContext` already sets that precedent by spreading `sender` only
	// when there is one. An absent choice and an explicit `undefined` are the same
	// decision here, so the object should not claim to distinguish them.
	const policy = cfgPeerCrossSessionInbound.get(settings);
	return {
		...(policy !== undefined ? { policy } : {}),
		mode: "default",
		ownTokens,
	};
}

// Referenced so the transport constants this entry must honour stay imported at the
// point that installs a transport. `registerPeerTransport` is on the API and
// implemented (loader.ts:341) — what is missing is a caller: nothing in production
// registers a transport, so this entry cannot yet install one. The version constant is
// the value such a transport will have to declare, and importing it now means the entry
// cannot be written against a stale number later.
export const PEER_PROTOCOL_VERSION = PEER_TRANSPORT_PROTOCOL_VERSION;
export { checkHopChain };
