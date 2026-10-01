import type { Context, JsonValue, ServiceCall, ServiceProviderUpdate } from "@oh-my-pi/chord";
import type { MaybePromise } from "@oh-my-pi/pi-utils/acp/protocol";
import type { ServerListener } from "./listener";

export type { MaybePromise };

export interface ServerOptions {
	listeners: readonly ServerListener[];
	/** Stable logical server identity supplied by the installation or profile. */
	serverId: string;
	maxFrameLength?: number;
	handshakeTimeoutMs?: number;
	onConnectionCountChanged?: (count: number) => void;
	onError?: (error: Error) => void;
}

/**
 * The Session identity a `ServerHost` resolves and opens.
 *
 * Upstream this interface lives in `pi-agent-core`
 * (`packages/agent/src/harness/session/types.ts`) and is imported from there;
 * this repository has no `pi-agent-core`, so it is declared here and the
 * package's own consumers extend it rather than fork it. All six upstream
 * fields are carried verbatim, including `legacyParentSessionPath`, which this
 * package never reads: narrowing the shape would make a caller's wider
 * `SessionMetadata` structurally incompatible with the one a `ServerHost`
 * resolves, which is the opposite of what the port needs.
 */
export interface SessionMetadata {
	id: string;
	createdAt: number;
	storageVersion: number;
	cwd?: string;
	parentSessionId?: string;
	legacyParentSessionPath?: string;
}

/** One presentation connection's live capability for a hosted Session. */
export interface RoutedSessionAttachment {
	/** Route one contract-agnostic service operation to the attached Session endpoint. */
	invokeService(
		call: ServiceCall,
		publish: (subscriptionId: string, update: ServiceProviderUpdate, context: Context) => MaybePromise<void>,
		context: Context,
	): Promise<JsonValue | undefined>;
	release(context: Context): MaybePromise<void>;
}

/** Presentation-scoped routing capabilities available to server service implementations. */
export interface RoutedServerPresentation {
	attachSession(sessionId: string, context: Context): Promise<void>;
	detachSession(context: Context): Promise<void>;
	/** Release routed attachments and handles before the application deletes durable metadata. */
	prepareSessionRemoval(sessionId: string, context: Context): Promise<void>;
}

/** One connection's server-scoped service endpoint. */
export interface RoutedServerServiceAttachment {
	invokeService(
		call: ServiceCall,
		publish: (subscriptionId: string, update: ServiceProviderUpdate, context: Context) => MaybePromise<void>,
		context: Context,
	): Promise<JsonValue | undefined>;
	release(context: Context): MaybePromise<void>;
}

export interface RoutedServerServiceHost {
	attachClient(presentation: RoutedServerPresentation, context: Context): MaybePromise<RoutedServerServiceAttachment>;
}

/** A process-safe handle that acquires presentation-scoped Session capabilities. */
export interface RoutedSessionHandle {
	attachClient(context: Context): MaybePromise<RoutedSessionAttachment>;
	/** Resolves with an error for unexpected termination, or undefined after an expected close. */
	readonly terminated?: Promise<Error | undefined>;
	close(context: Context): Promise<void>;
}

/** Application capabilities used by server-wide management and Session routing. */
export interface ServerHost<TMetadata extends SessionMetadata = SessionMetadata> {
	readonly serverServices: RoutedServerServiceHost;
	/** Resolve one durable Session ID or throw a bounded routing error. */
	resolveSession(sessionId: string, context: Context): Promise<TMetadata>;
	openSession(metadata: TMetadata, context: Context): Promise<RoutedSessionHandle>;
}
