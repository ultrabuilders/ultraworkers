/**
 * The render-callback token header is a two-sided contract, and nothing guards it.
 *
 * `server.ts` attaches `RENDER_CALLBACK_TOKEN_HEADER` to the loopback fetch it makes back
 * into the daemon; `service.ts` compares the header it receives against the token it
 * minted for that daemon. Both sides import the same constant, so a one-sided rename does
 * not fail to compile — it fails at runtime, on a loopback socket, as a bare `403` with no
 * log line anywhere. The producer reads that as "no bytes", and the rendered blob silently
 * never arrives.
 *
 * That is why this drives the *real* producer handler, the *real* daemon, and a *real*
 * loopback consumer, and why it reads the bytes back over HTTP rather than inspecting the
 * publication. Two earlier drafts of this file asserted the minted URL, or transcribed the
 * comparison into a local helper; ablating the header left both green, because a
 * publication is minted whether or not the callback ever succeeds, and a transcription
 * moves with the import it copies. A test that cannot go red when the contract drifts is
 * not a test.
 */
import { describe, expect, it } from "bun:test";
import { LocalBlobBackend } from "../src/blob-broker/broker";
import { RENDER_CALLBACK_PATH, RENDER_CALLBACK_TOKEN_HEADER } from "../src/blob-broker/protocol";
import { createControlHandler } from "../src/blob-broker/server";

const RENDERED = new Uint8Array(Buffer.from("blob-broker-callback-token-bytes"));
const RENDERED_B64 = Buffer.from(RENDERED).toString("base64");

/**
 * The consumer half of `service.ts#ensureCallbackServer`, as a real listening server.
 *
 * This is the shape the daemon runs: a loopback `Bun.serve` whose fetch rejects anything
 * whose token header does not match, before it looks at the path. Driving a genuine socket
 * matters because the failure under test — a header the producer sends that the consumer
 * does not read — is invisible until bytes cross a boundary.
 */
function startCallbackServer(token: string, render: () => Uint8Array | null) {
	const server = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async request => {
			if (request.headers.get(RENDER_CALLBACK_TOKEN_HEADER) !== token) {
				return new Response(null, { status: 403 });
			}
			const pathname = new URL(request.url).pathname;
			if (!pathname.startsWith(RENDER_CALLBACK_PATH)) return new Response(null, { status: 404 });
			const bytes = render();
			if (!bytes) return new Response(null, { status: 404 });
			return new Response(bytes, { status: 200 });
		},
	});
	// `Bun.serve` types `port` as `number | undefined`; with `port: 0` the OS assigns
	// a real one, so assert it rather than casting — a missing port here would send
	// every request to `undefined` and the test would fail for the wrong reason.
	if (server.port === undefined) throw new Error("callback server did not bind a port");
	return { port: server.port, stop: () => server.stop(true) };
}

/**
 * The producer half: `POST /lazy` on the real control handler. `callbackToken` is the value
 * the handler attaches to its loopback fetch, so this is exactly what the consumer must
 * agree with.
 */
async function requestLazyRender(
	backend: LocalBlobBackend,
	callbackPort: number,
	callbackToken: string,
	key = "lazy-key-1",
): Promise<{ publication: { url: string } }> {
	const handler = createControlHandler(
		backend,
		{ kind: "direct", options: {}, credentials: {}, bindHost: "127.0.0.1" },
		"http://127.0.0.1:0",
	);
	const response = await handler(
		new Request("http://127.0.0.1/lazy", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ key, mimeType: "image/png", callbackPort, callbackToken }),
		}),
	);
	expect(response.status).toBe(200);
	return (await response.json()) as { publication: { url: string } };
}

function newBackend(): LocalBlobBackend {
	return new LocalBlobBackend({ kind: "direct", options: {}, credentials: {}, bindHost: "127.0.0.1" });
}

describe("blob-broker render-callback token header", () => {
	it("serves the rendered bytes when producer and consumer agree on the token", async () => {
		const backend = newBackend();
		const { port, stop } = startCallbackServer("shared-token", () => RENDERED);
		try {
			const { publication } = await requestLazyRender(backend, port, "shared-token");

			// `POST /lazy` only *registers* the fetcher — `ensureLazy` hands it to the
			// store without calling it. The producer's header is therefore only
			// observable once a read drains the entry, which is what fetching the
			// publication URL does. Asserting the minted URL alone would prove nothing:
			// it exists whether or not the callback ever succeeds.
			const served = await fetch(publication.url);
			expect(served.status).toBe(200);
			expect(Buffer.from(await served.arrayBuffer()).toString("base64")).toBe(RENDERED_B64);
		} finally {
			stop();
			backend.stop();
		}
	});

	it("serves nothing when the producer's token does not match the consumer's", async () => {
		const backend = newBackend();
		// The consumer mints "consumer-token"; the producer is handed another. The
		// publication still gets a stable URL and nothing throws — the callback is
		// refused and the blob never arrives. Measured: the daemon reports the drained
		// entry as gone (410), so that status is the observable difference between a
		// delivered and an undelivered lazy blob.
		const { port, stop } = startCallbackServer("consumer-token", () => RENDERED);
		try {
			const { publication } = await requestLazyRender(backend, port, "mismatched-token");
			expect(publication.url).toBeDefined();

			const served = await fetch(publication.url);
			expect(served.status).toBe(410);
		} finally {
			stop();
			backend.stop();
		}
	});

	it("gates on the token before the path, so a bad token is not a bad path", async () => {
		const { port, stop } = startCallbackServer("shared-token", () => RENDERED);
		try {
			const withToken = await fetch(`http://127.0.0.1:${port}${RENDER_CALLBACK_PATH}key-1`, {
				headers: { [RENDER_CALLBACK_TOKEN_HEADER]: "shared-token" },
			});
			expect(withToken.status).toBe(200);

			// Right token, wrong path: 404, not 403.
			const wrongPath = await fetch(`http://127.0.0.1:${port}/not-the-callback-path`, {
				headers: { [RENDER_CALLBACK_TOKEN_HEADER]: "shared-token" },
			});
			expect(wrongPath.status).toBe(404);

			// Missing header entirely: rejected before the path is considered.
			const noHeader = await fetch(`http://127.0.0.1:${port}${RENDER_CALLBACK_PATH}key-1`);
			expect(noHeader.status).toBe(403);
		} finally {
			stop();
		}
	});
});
