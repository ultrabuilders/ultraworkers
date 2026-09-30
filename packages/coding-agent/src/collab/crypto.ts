/**
 * AES-256-GCM sealing for collab frames.
 *
 * The room key lives only in the link fragment; the relay sees opaque bytes.
 * Sealed layout: `[12B IV][ciphertext+tag]`.
 */
import { ROOM_KEY_BYTES, WRITE_TOKEN_BYTES } from "@oh-my-pi/pi-wire";
import type { CollabFrame } from "./protocol";

const AES_ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export function generateRoomKey(): Uint8Array {
	const key = new Uint8Array(ROOM_KEY_BYTES);
	crypto.getRandomValues(key);
	return key;
}

export function generateWriteToken(): Uint8Array {
	const token = new Uint8Array(WRITE_TOKEN_BYTES);
	crypto.getRandomValues(token);
	return token;
}

export function importRoomKey(raw: Uint8Array): Promise<CryptoKey> {
	if (raw.byteLength !== ROOM_KEY_BYTES) {
		throw new Error(`Room key must be ${ROOM_KEY_BYTES} bytes, got ${raw.byteLength}`);
	}
	return crypto.subtle.importKey("raw", asStrict(raw), AES_ALGORITHM, false, ["encrypt", "decrypt"]);
}

export async function seal(key: CryptoKey, frame: CollabFrame): Promise<Uint8Array> {
	return sealSerialized(key, JSON.stringify(frame));
}

export async function sealSerialized(key: CryptoKey, frame: string): Promise<Uint8Array> {
	const iv = new Uint8Array(IV_LENGTH);
	crypto.getRandomValues(iv);
	const plaintext = TEXT_ENCODER.encode(frame);
	const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: AES_ALGORITHM, iv }, key, plaintext));
	const out = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
	out.set(iv, 0);
	out.set(ciphertext, IV_LENGTH);
	return out;
}

/**
 * Non-optional fields per {@link CollabFrame} variant, checked at the decode boundary.
 *
 * Required-field, NOT exact-shape: a peer that predates this build may add fields
 * we do not know yet, and a stricter check would reject it. The `Record<CollabFrame["t"], …>`
 * annotation is the exhaustiveness mechanism — adding a variant to `CollabFrame` without a
 * row here is a compile error, while an unknown tag at runtime still falls through.
 */
const FRAME_REQUIRED_FIELDS: Record<CollabFrame["t"], readonly string[]> = {
	hello: ["proto", "name"],
	prompt: ["text"],
	"ui-response": ["reqId"],
	abort: [],
	"agent-cmd": ["cmd", "agentId"],
	"fetch-transcript": ["reqId", "agentId", "fromByte"],
	welcome: ["proto", "header", "state", "agents", "entryCount"],
	"snapshot-chunk": ["entries", "final"],
	entry: ["entry"],
	event: ["event"],
	state: ["state"],
	bus: ["channel", "data"],
	agents: ["agents"],
	"ui-request": ["request"],
	"ui-request-end": ["reqId"],
	transcript: ["reqId", "text", "newSize"],
	bye: ["reason"],
	error: ["message"],
};

/** Widened view so an unrecognised tag can be looked up without a cast at the call site. */
const FRAME_REQUIRED_LOOKUP: Readonly<Record<string, readonly string[] | undefined>> = FRAME_REQUIRED_FIELDS;

function assertCollabFrame(value: unknown): CollabFrame {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("collab frame is not a JSON object");
	}
	const tag = (value as { t?: unknown }).t;
	if (typeof tag !== "string") {
		throw new Error(`collab frame has no string "t" discriminator (got ${typeof tag})`);
	}
	const required = FRAME_REQUIRED_LOOKUP[tag];
	// Tolerant default: a variant this build has never heard of passes through untouched,
	// matching the documented house style in packages/wire/src/index.ts:9-12.
	if (!required) return value as CollabFrame;
	for (const field of required) {
		if (!(field in value)) {
			throw new Error(`collab frame "${tag}" is missing required field "${field}"`);
		}
	}
	return value as CollabFrame;
}

/** Inverse of {@link seal}. Throws on auth failure or malformed input. */
export async function open(key: CryptoKey, data: Uint8Array): Promise<CollabFrame> {
	if (data.byteLength <= IV_LENGTH) {
		throw new Error("Sealed frame too short");
	}
	const iv = asStrict(data.subarray(0, IV_LENGTH));
	const ciphertext = asStrict(data.subarray(IV_LENGTH));
	const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: AES_ALGORITHM, iv }, key, ciphertext));
	return assertCollabFrame(JSON.parse(TEXT_DECODER.decode(plaintext)));
}

function asStrict(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	if (bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
		return bytes as Uint8Array<ArrayBuffer>;
	}
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy;
}
