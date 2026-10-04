/**
 * On-demand provider stream transports.
 *
 * `stream.ts` dispatches to a handful of provider-specific transports that
 * nothing else in the `ai` package needs. Importing them by value pulled each
 * transport's whole static module graph into every consumer of `stream.ts`,
 * including entry points that only ever talk to one provider.
 *
 * Each entry here loads its provider with a dynamic `import()`, so a provider's
 * graph is fetched when — and only when — that provider is dispatched to. The
 * registry is read *after* the provider has resolved, never before.
 *
 * The dispatchers in `stream.ts` are **synchronous**: they return an
 * {@link AssistantMessageEventStream} rather than a promise of one. Each entry
 * here therefore returns a finished stream, bridging the asynchronous import
 * with the same outer-stream pattern `streamSimpleRequest` already uses for
 * async key resolution. Returning the transport function instead would force
 * `async` into every call site and change those signatures.
 *
 * Adapted from `pi`'s `packages/ai/src/providers/images/register-builtins.ts`,
 * which solves the same problem for image providers. Its negative contract is
 * the part worth keeping: a failed lazy import must name the provider, because
 * an optimisation that turns "this provider failed" into an untraceable
 * `Cannot find module` is a regression, not a speedup.
 */

import type {
	Api,
	AssistantMessage,
	AssistantMessageEvent,
	AssistantMessageEventStream,
	Context,
	Model,
} from "../types";
import { AssistantMessageEventStream as EventStream } from "../utils/event-stream";

/**
 * Options accepted by the lazily-loaded transports.
 *
 * Deliberately `unknown`: each transport declares its own options type, and an
 * index-signature type here would reject every one of them (an interface has no
 * index signature). The concrete type is re-applied at the call to the loaded
 * transport, which is the only place it is actually known.
 */
type TransportOptions = unknown;

interface TransportTarget {
	readonly model: Model<Api>;
	readonly context: Context;
	readonly options: TransportOptions;
}

/**
 * A provider's streaming entry point, as loaded from its module.
 *
 * Declared structurally so this module keeps its provider imports **type-only**
 * (erased at compile time) while the values arrive lazily at runtime.
 */
type StreamGitLabDuoModule = typeof import("../providers/gitlab-duo");
type StreamGitLabDuoWorkflowModule = typeof import("../providers/gitlab-duo-workflow");
type StreamKimiModule = typeof import("../providers/kimi");
type StreamPiNativeModule = typeof import("../providers/pi-native-client");
type StreamSyntheticModule = typeof import("../providers/synthetic");
type GoogleAuthModule = typeof import("../providers/google-auth");

/** Identity of the model a transport was being loaded for. Used only on failure. */
export interface TransportLoadError {
	readonly provider: string;
	readonly api: string;
	readonly model: string;
	readonly cause: unknown;
}

export class ProviderTransportLoadError extends Error {
	readonly transport: TransportLoadError;

	constructor(transport: TransportLoadError) {
		super(
			`Failed to load the transport for provider "${transport.provider}" (api "${transport.api}", model "${transport.model}"): ` +
				`${transport.cause instanceof Error ? transport.cause.message : String(transport.cause)}`,
			{ cause: transport.cause },
		);
		this.name = "ProviderTransportLoadError";
		this.transport = transport;
	}
}

/**
 * A memoised dynamic import.
 *
 * The promise is cached so a provider dispatched repeatedly (a retry, a second
 * turn) does not re-import. A *rejected* cache entry is dropped rather than
 * kept: a lazy chunk can fail transiently (a cold cache, a momentarily
 * unreadable file), and freezing that failure for the life of the process would
 * turn a recoverable error into a permanent one. The error still names the
 * provider on every attempt, so retrying never degrades the message.
 */
export function memoize<T>(load: () => Promise<T>): () => Promise<T> {
	let pending: Promise<T> | undefined;
	return () => {
		pending ||= load().catch((error: unknown) => {
			pending = undefined;
			throw error;
		});
		return pending;
	};
}

const loadGitLabDuo = memoize(async () => (await import("../providers/gitlab-duo")) as StreamGitLabDuoModule);
const loadGitLabDuoWorkflow = memoize(
	async () => (await import("../providers/gitlab-duo-workflow")) as StreamGitLabDuoWorkflowModule,
);
const loadKimi = memoize(async () => (await import("../providers/kimi")) as StreamKimiModule);
const loadPiNative = memoize(async () => (await import("../providers/pi-native-client")) as StreamPiNativeModule);
const loadSynthetic = memoize(async () => (await import("../providers/synthetic")) as StreamSyntheticModule);
const loadGoogleAuth = memoize(async () => (await import("../providers/google-auth")) as GoogleAuthModule);

/**
 * Vertex AI's access token, loaded on demand.
 *
 * Unlike the five stream transports this returns the value directly rather than
 * a bridged stream: its single call site is already an `await`, so there is no
 * synchronous signature to preserve. A load failure still names the provider.
 */
export async function getVertexAccessTokenLazily(
	target: TransportTarget,
	options?: { signal?: AbortSignal; fetch?: unknown },
): Promise<string> {
	try {
		return await (await loadGoogleAuth()).getVertexAccessToken(options as never);
	} catch (cause) {
		throw new ProviderTransportLoadError({
			provider: target.model.provider,
			api: target.model.api,
			model: target.model.id,
			cause,
		});
	}
}

/**
 * A zero-usage record for a turn that produced no tokens because its transport
 * never loaded. Local to this module: the one in `images/shared.ts` belongs to
 * the image pipeline, and the stream path had none.
 */
function emptyUsage(): AssistantMessage["usage"] {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

/**
 * Bridges a lazily-loaded transport into the synchronous stream the dispatchers
 * return: awaits the import, runs the real transport, forwards every event, and
 * ends the outer stream.
 *
 * A load failure is surfaced as a terminal `error` event whose message **names
 * the provider**, rather than propagating a raw `Cannot find module` from the
 * bundler — that distinction is what separates this optimisation from a bug.
 */
export function bridge(
	target: TransportTarget,
	load: () => Promise<(model: never, context: Context, options: never) => AssistantMessageEventStream>,
): AssistantMessageEventStream {
	const outer = new EventStream();
	void (async () => {
		let inner: AssistantMessageEventStream;
		try {
			const transport = await load();
			inner = transport(target.model as never, target.context, target.options as never);
		} catch (cause) {
			const failure = new ProviderTransportLoadError({
				provider: target.model.provider,
				api: target.model.api,
				model: target.model.id,
				cause,
			});
			const message: AssistantMessage = {
				role: "assistant",
				content: [],
				api: target.model.api,
				provider: target.model.provider,
				model: target.model.id,
				usage: emptyUsage(),
				stopReason: "error",
				errorMessage: failure.message,
				timestamp: Date.now(),
			};
			const event = { type: "error", reason: "error", error: message } as AssistantMessageEvent;
			outer.push(event);
			outer.end();
			return;
		}
		// `outer` forwards `inner`'s events, so an idle watchdog on `outer` must
		// see the inner stream's local work (a provider tracking its own tool
		// run) or it reads the event silence during that run as a provider
		// stall. Same protection `cursor.ts` applies to its retry stream.
		outer.forwardLocalWorkFrom(inner);
		try {
			for await (const event of inner) {
				outer.push(event);
			}
			outer.end();
		} catch (cause) {
			// The transport itself failed (an auth gateway rejection, a provider
			// HTTP error). `EventStream`'s iterator throws on a failed stream
			// rather than yielding an error event, so without this the throw
			// would escape an unhandled async IIFE and `outer` would never end —
			// turning a provider error into a permanent hang instead of the
			// rejection every caller already handles. `fail` keeps the rejection
			// shape: `.result()` rejects, and iteration throws, both as before.
			outer.fail(cause);
		} finally {
			outer.forwardLocalWorkFrom(undefined);
		}
	})();
	return outer;
}

/**
 * Every lazily-loaded stream transport, keyed by the condition that selects it.
 * Read after provider resolution in `stream.ts`.
 */
export const PROVIDER_TRANSPORTS = {
	gitlabDuo(target: TransportTarget): AssistantMessageEventStream {
		return bridge(target, async () => (await loadGitLabDuo()).streamGitLabDuo as never);
	},
	gitlabDuoWorkflow(target: TransportTarget): AssistantMessageEventStream {
		return bridge(target, async () => (await loadGitLabDuoWorkflow()).streamGitLabDuoWorkflow as never);
	},
	kimi(target: TransportTarget): AssistantMessageEventStream {
		return bridge(target, async () => (await loadKimi()).streamKimi as never);
	},
	piNative(target: TransportTarget): AssistantMessageEventStream {
		return bridge(target, async () => (await loadPiNative()).streamPiNative as never);
	},
	synthetic(target: TransportTarget): AssistantMessageEventStream {
		return bridge(target, async () => (await loadSynthetic()).streamSynthetic as never);
	},
} as const;

/** The transports this module owns, for callers that enumerate them. */
export const LAZY_TRANSPORT_KEYS = Object.keys(PROVIDER_TRANSPORTS) as Array<keyof typeof PROVIDER_TRANSPORTS>;
