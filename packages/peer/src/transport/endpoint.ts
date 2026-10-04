import * as net from "node:net";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * NOTICE — the reclaim logic below is carried from an MIT-licensed reference
 * with an added OpenAI/Anthropic rider. Owner decision 2026-10-04: this
 * repository is neither Anthropic's nor OpenAI's, so the content is used with
 * attribution.
 *
 *   source:   armory-mesh (local reference clone)
 *   file:     src/transport.ts
 *   symbols:  probeStale (line 123), the listen path (line 152)
 *
 * Copied rather than rewritten, per the owner instruction to prefer copying a
 * working implementation over re-deriving it. The logic is small but every
 * branch in it was arrived at the hard way — see the notes on each.
 */

/**
 * Resolve the Unix socket path or Windows named pipe for one project scope.
 *
 * HASHING THE PROJECT PATH IS THE WHOLE POINT, and it is why no sanitising pass
 * exists below. A Unix socket path is bounded by `MAX_PATH` and Windows named
 * pipes reject a list of characters outright, so a project directory with a
 * space, a colon, a backslash or an emoji in its name is a filename that cannot
 * be expressed. Hashing removes the constructor from the problem: the result is
 * sixteen hex characters that no input can push out of bounds.
 *
 * The alternative — sanitising the path — is the failure mode this replaces.
 * A sanitiser has to pick a substitution, two directories can collide on the
 * substituted form, and the collision is silent. A hash cannot collide here in
 * any way that matters, because its input is a resolved absolute path.
 *
 * This is the shape `lspMuxEndpoint` uses
 * (`packages/coding-agent/src/lsp/mux/protocol.ts:67`), with a different prefix.
 *
 * THE TWO PLATFORMS SCOPE DIFFERENTLY, and that is not an inconsistency. On
 * Windows the pipe name is global to the machine, so the project path has to be
 * hashed INTO the name. On Unix the path is a filesystem path and `runtimeDir`
 * is already per-project, so the same name under different runtime directories is
 * already different addresses; hashing the project path as well would add a
 * second scoping mechanism that nothing verifies. The consequence for callers:
 * passing one shared `runtimeDir` puts every project on one endpoint, and no
 * amount of hashing on the Unix branch would change that.
 */
export function peerEndpoint(projectDir: string, runtimeDir: string): string {
	if (process.platform === "win32") {
		const key = Bun.hash.wyhash(path.resolve(projectDir)).toString(16).padStart(16, "0");
		return `\\\\.\\pipe\\omp-peer-${key}`;
	}
	return path.join(runtimeDir, "peer.sock");
}

/** How long a probe waits before calling an endpoint stale. */
const PROBE_TIMEOUT_MS = 250;

/**
 * Is this endpoint held by a live listener, or left over from a dead one?
 *
 * A crashed process leaves its socket file behind, and `listen` on an existing
 * path fails with `EADDRINUSE` — so a peer that died holding an endpoint makes
 * every later peer in that project unstartable until someone removes it. The
 * probe connects: if something accepts, the endpoint is live and must not be
 * touched; if the connect fails or times out, nobody is serving and the file is
 * garbage to be removed.
 *
 * It is a CONNECT, not an `O_EXCL` bind. `O_EXCL` would refuse to start when
 * anyone holds the path, which is the correct behaviour for a lock and the wrong
 * behaviour here: the common case is a crash, and a crash is exactly the case
 * that must not require a human to clean up by hand.
 *
 * On Windows a named pipe leaves no file behind — the kernel owns the name and
 * drops it when the last handle closes — so there is nothing to reclaim, and the
 * answer is always "in use". Assuming stale there would unlink nothing and
 * rebind onto a name another peer is serving.
 */
export function probeStale(endpoint: string): Promise<"in_use" | "stale"> {
	return new Promise(resolve => {
		if (process.platform === "win32") {
			resolve("in_use");
			return;
		}
		const sock = net.createConnection({ path: endpoint });
		let settled = false;
		const finish = (v: "in_use" | "stale") => {
			if (settled) return;
			settled = true;
			sock.destroy();
			resolve(v);
		};
		const timer = setTimeout(() => finish("stale"), PROBE_TIMEOUT_MS);
		sock.once("connect", () => {
			clearTimeout(timer);
			finish("in_use");
		});
		sock.once("error", () => {
			clearTimeout(timer);
			finish("stale");
		});
	});
}

/**
 * Bind a listener, reclaiming an endpoint left behind by a dead peer.
 *
 * Refuses when the endpoint is genuinely in use — that is another peer serving
 * this project right now, and stealing it would hand two sessions the same
 * address.
 */
export async function listenOnEndpoint(endpoint: string, handler: (socket: net.Socket) => void): Promise<net.Server> {
	if ((await probeStale(endpoint)) === "in_use") {
		throw new Error(`peer endpoint in use (${endpoint})`);
	}
	// Best-effort: the file may be absent already, which is the happy path on a
	// first bind. A failure here that matters surfaces as EADDRINUSE below.
	if (process.platform !== "win32") {
		try {
			fs.unlinkSync(endpoint);
		} catch {
			/* nothing to reclaim */
		}
	}
	return new Promise((resolve, reject) => {
		const server = net.createServer(handler);
		server.once("error", reject);
		server.listen(endpoint, () => {
			server.removeListener("error", reject);
			resolve(server);
		});
	});
}
