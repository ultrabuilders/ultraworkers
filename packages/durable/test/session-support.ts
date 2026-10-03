import type { Context } from "@oh-my-pi/chord";
import { BACKGROUND_CONTEXT } from "@oh-my-pi/chord/context";
import {
	type CommitPublication,
	type ConversationId,
	type DocumentAddress,
	type DocumentCommitChange,
	type DocumentId,
	type DocumentPoint,
	type DocumentRecord,
	type Id,
	type JsonObject,
	MemoryStorage,
	type Seq,
	type StorageWrite,
} from "@ultraworkers/pi-durable";
import { SessionImpl } from "../src/session/session";

export const context: Context = BACKGROUND_CONTEXT;

type Deferred = { readonly promise: Promise<void>; readonly resolve: () => void };

function deferred(): Deferred {
	let resolve!: () => void;
	const promise = new Promise<void>(done => {
		resolve = done;
	});
	return { promise, resolve };
}

/** A gate that holds calls until released and reports when the first held call arrives. */
export type Gate = {
	readonly entered: Promise<void>;
	release(): void;
};

/** Memory storage with observable commits, held calls, and injected commit failures. */
export class ControlledStorage extends MemoryStorage {
	/** Exact borrowed batches admitted by Session. */
	readonly admittedCommits: (readonly StorageWrite[])[] = [];
	/** Detached batches for value assertions. */
	readonly commits: (readonly StorageWrite[])[] = [];
	mintCount = 0;
	documentReadCount = 0;
	#commitGate: { gate: Deferred; entered: Deferred } | undefined;
	#findGate: { gate: Deferred; entered: Deferred } | undefined;
	#commitFailure: Error | undefined;

	holdCommits(): Gate {
		const held = { gate: deferred(), entered: deferred() };
		this.#commitGate = held;
		return { entered: held.entered.promise, release: () => this.#release("commit", held) };
	}

	holdFindDocument(): Gate {
		const held = { gate: deferred(), entered: deferred() };
		this.#findGate = held;
		return { entered: held.entered.promise, release: () => this.#release("find", held) };
	}

	/** Simulate a crash during the held commit: it never reaches storage, and later commits proceed. */
	crash(): void {
		this.#commitGate = undefined;
	}

	failNextCommit(error: Error): void {
		this.#commitFailure = error;
	}

	#release(kind: "commit" | "find", held: { gate: Deferred }): void {
		if (kind === "commit" && this.#commitGate === held) this.#commitGate = undefined;
		if (kind === "find" && this.#findGate === held) this.#findGate = undefined;
		held.gate.resolve();
	}

	override async commit(writes: readonly StorageWrite[], commitContext: Context): Promise<Seq> {
		this.admittedCommits.push(writes);
		this.commits.push(structuredClone(writes));
		const held = this.#commitGate;
		if (held !== undefined) {
			held.entered.resolve();
			await held.gate.promise;
		}
		const failure = this.#commitFailure;
		if (failure !== undefined) {
			this.#commitFailure = undefined;
			throw failure;
		}
		return super.commit(writes, commitContext);
	}

	override mintId<I extends Id<string>>(): Promise<I> {
		this.mintCount++;
		return super.mintId<I>();
	}

	override document(id: DocumentId, at: DocumentPoint, callContext: Context) {
		this.documentReadCount++;
		return super.document(id, at, callContext);
	}

	override async findDocument(
		address: DocumentAddress,
		at: DocumentPoint,
		callContext: Context,
	): Promise<DocumentRecord | undefined> {
		const held = this.#findGate;
		if (held !== undefined) {
			held.entered.resolve();
			await held.gate.promise;
		}
		return super.findDocument(address, at, callContext);
	}
}

/** Session kernel plus its controlled storage and every committed publication. */
export function openTestSession(): {
	readonly storage: ControlledStorage;
	readonly session: SessionImpl;
	readonly publications: CommitPublication[];
} {
	const storage = new ControlledStorage();
	const session = new SessionImpl(storage);
	const publications: CommitPublication[] = [];
	session.subscribeCommits(publication => {
		publications.push(publication);
	});
	return { storage, session, publications };
}

export function documentChanges(
	publication: CommitPublication,
): readonly Extract<DocumentCommitChange, { readonly type: "document" }>[] {
	return publication.changes.filter(
		(change): change is Extract<DocumentCommitChange, { readonly type: "document" }> => change.type === "document",
	);
}

export function documentCopyChanges(
	publication: CommitPublication,
): readonly Extract<DocumentCommitChange, { readonly type: "document.copy" }>[] {
	return publication.changes.filter(
		(change): change is Extract<DocumentCommitChange, { readonly type: "document.copy" }> =>
			change.type === "document.copy",
	);
}

/** Create one conversation and return its ID. */
export async function createConversation(session: SessionImpl): Promise<ConversationId> {
	return session.commit(async tx => (await tx.createConversation({ ownership: { kind: "ownerless" } })).id, context);
}

/** Resolve after pending microtasks and one macrotask turn. */
export function flush(): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Narrow a widened document value back to the shape its own token declares.
 *
 * `DocumentState<T>` and `DocumentWatch<T>` admit `JsonObject` because `observedOperations` hands an
 * observer of an older definition version a **root replacement** — the runtime genuinely delivers a
 * shape the observer's token does not name, which is what
 * `session-checkpoints-migrations.test.ts` asserts. A test built on a single-version doc can no
 * longer lean on the type for that, so this checks instead of casting: the declared key set comes
 * from the definition's own `initial`, so a value carrying a different version's keys throws here
 * rather than being silently asserted as the old shape.
 */
export function singleVersion<T extends JsonObject>(
	token: { readonly definition: { readonly kind: string; initial(): T } },
	value: Readonly<T> | JsonObject | null,
): Readonly<T> | null {
	if (value === null) return null;
	const declared = Object.keys(token.definition.initial()).sort();
	const delivered = Object.keys(value).sort();
	if (declared.join() !== delivered.join()) {
		throw new Error(
			`${token.definition.kind}: delivered keys [${delivered.join(", ")}] do not match the declared ` +
				`shape [${declared.join(", ")}]. A definition that gained a second version delivers its new ` +
				`shape to an observer of the old one — narrow deliberately rather than asserting.`,
		);
	}
	return value as Readonly<T>;
}
