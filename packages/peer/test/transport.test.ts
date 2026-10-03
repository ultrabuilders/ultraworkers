import { afterEach, describe, expect, it } from "bun:test";
import * as net from "node:net";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	decodeFrames,
	encodeFrame,
	isFrameOfKind,
	listenOnEndpoint,
	MAX_FRAME_BYTES,
	PREFIX_BYTES,
	peerEndpoint,
	probeStale,
} from "../src/transport/index";

/**
 * `epic-jwsy.9` — the endpoint address and the wire framing.
 *
 * The framing tests are written around one requirement: a corrupt frame must
 * not swallow the good frame behind it. Everything else here follows from it.
 */

const dirs: string[] = [];
const servers: net.Server[] = [];

async function runtimeDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-transport-"));
	dirs.push(dir);
	return dir;
}

afterEach(async () => {
	for (const server of servers.splice(0)) await new Promise<void>(resolve => server.close(() => resolve()));
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("peerEndpoint", () => {
	it("puts the socket under the runtime dir on this platform", () => {
		const endpoint = peerEndpoint("/some/project", "/run/user/omp");
		if (process.platform === "win32") {
			expect(endpoint.startsWith("\\\\.\\pipe\\omp-peer-")).toBe(true);
		} else {
			expect(endpoint).toBe(path.join("/run/user/omp", "peer.sock"));
		}
	});

	it("keys the Windows name on a hash of the RESOLVED project path", () => {
		// The point of hashing rather than sanitising: this directory name cannot
		// be a pipe name at all. A space breaks MAX_PATH, and a colon is rejected
		// outright. Hashing removes the constructor from the problem instead of
		// filtering inputs.
		if (process.platform === "win32") {
			const ugly = peerEndpoint("/tmp/my project:with\\colon/\u{1f600}", "ignored");
			expect(ugly).toMatch(/^\\\\\.\\pipe\\omp-peer-[0-9a-f]{16}$/);
			expect(ugly).not.toBe(peerEndpoint("/tmp/my-project", "ignored"));
			return;
		}
		// On Unix the hash is NOT used, and that is deliberate rather than an
		// oversight: the socket path is already per-project, because `runtimeDir`
		// is the project's own runtime directory. Hashing the path here as well
		// would add a second scoping mechanism that nothing checks — and a test
		// asserting "different projects, different endpoint" would pass on the
		// hash while the caller kept passing one shared runtimeDir.
		expect(peerEndpoint("/a/b", "/run/project-a")).toBe(path.join("/run/project-a", "peer.sock"));
		expect(peerEndpoint("/a/c", "/run/project-c")).toBe(path.join("/run/project-c", "peer.sock"));
	});

	it("is stable for the same inputs", () => {
		expect(peerEndpoint("/a/b", "/run")).toBe(peerEndpoint("/a/b", "/run"));
	});
});

describe("probeStale", () => {
	it("calls an endpoint nobody is serving stale, and one with a live listener in use", async () => {
		const dir = await runtimeDir();
		const endpoint = peerEndpoint("/some/project", dir);

		// Nothing bound yet: the file is not there, which is the same answer.
		expect(await probeStale(endpoint)).toBe("stale");

		const server = await listenOnEndpoint(endpoint, () => {});
		servers.push(server);
		expect(await probeStale(endpoint)).toBe("in_use");
	});

	it("refuses to bind over a live listener rather than stealing its address", async () => {
		const dir = await runtimeDir();
		const endpoint = peerEndpoint("/some/project", dir);
		const first = await listenOnEndpoint(endpoint, () => {});
		servers.push(first);

		await expect(listenOnEndpoint(endpoint, () => {})).rejects.toThrow(/in use/);
	});

	it("reclaims an endpoint left behind by a process that is gone", async () => {
		// The crash case, and the reason reclaim exists: a dead peer leaves the
		// socket file behind, and binding without a probe fails with EADDRINUSE
		// until a human deletes it.
		const dir = await runtimeDir();
		const endpoint = peerEndpoint("/some/project", dir);
		await fs.writeFile(endpoint, ""); // what a crashed listener leaves behind

		const server = await listenOnEndpoint(endpoint, () => {});
		servers.push(server);
		expect(await probeStale(endpoint)).toBe("in_use");
	});
});

describe("framing", () => {
	it("round-trips a value", () => {
		const { frames } = decodeFrames(encodeFrame({ kind: "hello", from: "a" }));
		expect(frames).toHaveLength(1);
		expect(frames[0].ok && frames[0].value).toEqual({ kind: "hello", from: "a" });
	});

	it("reads several frames out of one chunk", () => {
		const buffer = Buffer.concat([encodeFrame({ n: 1 }), encodeFrame({ n: 2 }), encodeFrame({ n: 3 })]);
		const { frames, rest } = decodeFrames(buffer);
		expect(frames.map(f => (f.ok ? (f.value as { n: number }).n : null))).toEqual([1, 2, 3]);
		expect(rest.length).toBe(0);
	});

	it("waits for a partial frame instead of failing it", () => {
		const whole = encodeFrame({ n: 9 });
		const partial = Buffer.from(whole.subarray(0, whole.length - 2));
		const first = decodeFrames(partial);
		expect(first.frames).toEqual([]);
		expect(first.rest.length).toBe(whole.length - 2);

		// The rest arrives.
		const { frames } = decodeFrames(Buffer.concat([first.rest, whole.subarray(whole.length - 2)]));
		expect(frames).toHaveLength(1);
		expect(frames[0].ok && frames[0].value).toEqual({ n: 9 });
	});

	it("SKIPS a corrupt frame and still delivers the good one behind it", () => {
		// The requirement this whole module exists for. A reader that gave up here
		// would silently lose every message after the first bad byte, and the
		// symptom would show up at the sender, in the wrong file, much later.
		const corrupt = Buffer.concat([Buffer.from([0, 0, 0, 5]), Buffer.from("{oh n", "utf8")]);
		const stream = Buffer.concat([corrupt, encodeFrame({ kind: "message", body: "still here" })]);

		const { frames, rest } = decodeFrames(stream);
		expect(frames).toHaveLength(2);
		expect(frames[0].ok).toBe(false);
		expect(frames[0].ok === false && frames[0].skipped).toBe(PREFIX_BYTES + 5);
		// The frame behind the bad one arrives intact — that is the whole point.
		expect(frames[1].ok && frames[1].value).toEqual({ kind: "message", body: "still here" });
		expect(rest.length).toBe(0);
	});

	it("survives several corrupt frames in a row", () => {
		const corrupt = () => Buffer.concat([Buffer.from([0, 0, 0, 3]), Buffer.from("{{{", "utf8")]);
		const stream = Buffer.concat([corrupt(), corrupt(), corrupt(), encodeFrame({ n: "last" })]);
		const { frames } = decodeFrames(stream);
		expect(frames.filter(f => f.ok)).toHaveLength(1);
		// Bound once: narrowing does not reach through two separate `.at(-1)` calls,
		// so reading `.value` off a second lookup is a type error even when the first
		// proved `ok`.
		const last = frames.at(-1);
		expect(last?.ok && last.value).toEqual({ n: "last" });
	});

	it("refuses an absurd length instead of allocating it", () => {
		// The prefix is reachable from the socket, so its length is untrusted. Four
		// bytes on the wire must not become a 4 GiB allocation.
		const hostile = Buffer.alloc(PREFIX_BYTES);
		hostile.writeUInt32BE(0xffff_ffff, 0);
		const { frames } = decodeFrames(hostile);
		expect(frames).toHaveLength(1);
		expect(frames[0].ok).toBe(false);
		expect(frames[0].ok === false && frames[0].error.message).toMatch(/exceeds/);
	});

	it("will not encode an oversized frame", () => {
		expect(() => encodeFrame({ blob: "x".repeat(MAX_FRAME_BYTES) })).toThrow(RangeError);
	});

	it("narrows a frame by kind without a cast at the callsite", () => {
		expect(isFrameOfKind({ kind: "ack", upto: 3 }, "ack")).toBe(true);
		expect(isFrameOfKind({ kind: "ack" }, "message")).toBe(false);
		expect(isFrameOfKind(null, "ack")).toBe(false);
	});
});

describe("over a real socket", () => {
	it("delivers frames written one byte at a time", async () => {
		// Chunk boundaries are where framing bugs live: a reader that assumes a
		// chunk contains a whole frame breaks on a peer that writes byte by byte.
		const dir = await runtimeDir();
		const endpoint = peerEndpoint("/some/project", dir);
		const received: unknown[] = [];

		const server = await listenOnEndpoint(endpoint, socket => {
			// Annotated `Buffer` rather than left to inference: `Buffer.alloc(0)`
			// narrows to `Buffer<ArrayBuffer>`, and the tail `decodeFrames` returns is
			// a `subarray` of a possibly-shared buffer, which is not assignable back
			// into that narrower type. The annotation is the honest width — a socket
			// hands out `Buffer`s of any backing store.
			let buffer: Buffer = Buffer.alloc(0);
			socket.on("data", (chunk: Buffer) => {
				const { frames, rest } = decodeFrames(Buffer.concat([buffer, chunk]));
				buffer = rest;
				for (const frame of frames) if (frame.ok) received.push(frame.value);
			});
		});
		servers.push(server);

		const client = net.createConnection({ path: endpoint });
		await new Promise<void>(resolve => client.once("connect", () => resolve()));
		const payload = encodeFrame({ kind: "message", from: "a", body: { text: "héllo" } });
		for (const byte of payload)
			await new Promise<void>(resolve => client.write(Buffer.from([byte]), () => resolve()));

		await Bun.sleep(120);
		client.destroy();
		expect(received).toEqual([{ kind: "message", from: "a", body: { text: "héllo" } }]);
	});
});
