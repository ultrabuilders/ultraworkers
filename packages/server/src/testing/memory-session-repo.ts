import type { Context } from "@oh-my-pi/chord";
import type { SessionMetadata } from "../types";

/** Options for {@link MemorySessionRepo.create}. */
export interface MemorySessionCreateOptions {
	/** Explicit id. When omitted, one is generated. */
	id?: string;
	parentSessionId?: string;
}

/** Options accepted by {@link MemorySessionRepo}. */
/** Storage version the in-memory repository stamps onto what it creates. */
const MEMORY_STORAGE_VERSION = 1;

export interface MemorySessionRepoOptions {
	/** Clock seam for tests; defaults to `Date.now`. */
	now?: () => number;
}

/**
 * The session handle the routing layer holds open.
 *
 * Upstream this is `Session` from `pi-agent-core`, a full session engine over
 * a storage backend. The server's routing layer only closes a session and reads
 * its metadata, so this port declares the two members it consumes rather than
 * reproducing that engine.
 */
export interface Session {
	readonly metadata: SessionMetadata;
	close(context: Context): Promise<void>;
}

/**
 * In-memory session repository backing {@link TestingHost}.
 *
 * Mirrors the semantics `server`'s routing layer depends on — ids are reserved
 * before a record exists so a failed create cannot leave the id claimable,
 * `open` refuses an already-open session, and `list` returns live metadata —
 * without the storage-backed session engine upstream layers underneath.
 */
interface MemorySessionRecord {
	readonly metadata: SessionMetadata;
	session: Session | null;
	open: boolean;
}

export class MemorySessionRepo {
	readonly #now: () => number;
	readonly #records = new Map<string, MemorySessionRecord>();
	readonly #pendingIds = new Set<string>();
	#sequence = 0;
	#closed = false;

	constructor(options: MemorySessionRepoOptions = {}) {
		this.#now = options.now ?? Date.now;
	}

	async create(options: MemorySessionCreateOptions, _context: Context): Promise<Session> {
		this.#assertOpen();
		const createdAt = this.#now();
		const id = options.id ?? this.#generateId(createdAt);
		this.#reserveId(id);
		try {
			const metadata: SessionMetadata = { id, createdAt, storageVersion: MEMORY_STORAGE_VERSION };
			if (options.parentSessionId !== undefined) metadata.parentSessionId = options.parentSessionId;
			const record: MemorySessionRecord = { metadata, session: null, open: true };
			const session: Session = {
				metadata,
				close: () => {
					record.open = false;
					return Promise.resolve();
				},
			};
			record.session = session;
			this.#records.set(id, record);
			return session;
		} finally {
			this.#pendingIds.delete(id);
		}
	}

	open(metadata: SessionMetadata, _context: Context): Promise<Session> {
		this.#assertOpen();
		const record = this.#records.get(metadata.id);
		if (record === undefined) return Promise.reject(new Error(`Unknown session: ${metadata.id}`));
		// seed() creates a session and closes it again, so the harness opens a
		// session this repository has already handed out. Upstream rejects that
		// as already-open; without the check the caller gets a session whose
		// lifecycle state no longer matches what the repository believes.
		if (record.open) return Promise.reject(new Error(`Session is already open: ${metadata.id}`));
		record.open = true;
		return Promise.resolve(record.session as Session);
	}

	list(_options: undefined, _context: Context): Promise<SessionMetadata[]> {
		this.#assertOpen();
		return Promise.resolve([...this.#records.values()].map(({ metadata }) => metadata));
	}

	close(): void {
		this.#closed = true;
	}

	#assertOpen(): void {
		if (this.#closed) throw new Error("Session repository is closed");
	}

	/** Reject an id that is already taken, or already reserved by a create in flight. */
	#reserveId(id: string): void {
		if (this.#records.has(id)) throw new Error(`Session already exists: ${id}`);
		if (this.#pendingIds.has(id)) throw new Error(`Session id is being created: ${id}`);
		this.#pendingIds.add(id);
	}

	/**
	 * A monotonic, lexicographically sortable id in the shape upstream's uuidv7
	 * produces: 48 bits of millisecond timestamp, a version nibble, 62 bits of
	 * monotonic counter, and the variant nibble.
	 *
	 * The counter occupies the whole remaining space rather than uuidv7's 12-bit
	 * rand_a, because this generator must stay unique across every session a
	 * single repository creates within one millisecond — a 12-bit counter
	 * collides on the 4097th. Ids created at the same millisecond therefore sort
	 * in creation order, as uuidv7's do.
	 */
	#generateId(createdAt: number): string {
		const encodedTime = createdAt.toString(16).padStart(12, "0").slice(-12);
		// 32 hex digits total: 12 for the timestamp, 1 version nibble, 1 variant
		// nibble, leaving 18 for the counter.
		const encodedCounter = (this.#sequence++).toString(16).padStart(18, "0").slice(-18);
		return [
			encodedTime.slice(0, 8),
			encodedTime.slice(8, 12),
			`4${encodedCounter.slice(0, 3)}`,
			`8${encodedCounter.slice(3, 6)}`,
			encodedCounter.slice(6).padEnd(12, "0"),
		].join("-");
	}
}
