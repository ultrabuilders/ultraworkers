import type { SessionMetadata } from "../../session-metadata";
import { Server } from "../../server";
import type { ServerHost } from "../../types";
import { createUnixListener } from "./listener";
import type { UnixServerOptions } from "./types";

/** Compose Server with one Unix-domain socket listener. */
export function createUnixServer<TMetadata extends SessionMetadata>(
	host: ServerHost<TMetadata>,
	options: UnixServerOptions,
): Server<TMetadata> {
	const listener = createUnixListener({
		path: options.path,
		mode: options.mode,
		maxFrameLength: options.maxFrameLength,
		maxPendingBytes: options.maxPendingBytes,
		gracefulCloseTimeoutMs: options.gracefulCloseTimeoutMs,
		onError: options.onError,
	});
	return new Server(host, {
		listeners: [listener],
		maxFrameLength: options.maxFrameLength,
		handshakeTimeoutMs: options.handshakeTimeoutMs,
		onConnectionCountChanged: options.onConnectionCountChanged,
		serverId: options.serverId,
		onError: options.onError,
	});
}
