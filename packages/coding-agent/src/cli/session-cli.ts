/**
 * `ultraworkers session` — list, archive, and restore sessions from the shell.
 *
 * Every verb reads through the enumeration `ultraworkers gc` uses, and archive/restore use
 * gc's own file primitives. That is the whole reason this module holds no listing
 * logic of its own. A second reader of the sessions directory is a second source
 * of truth, and the two drift apart until gc sweeps a session `ultraworkers session list`
 * still shows as live — with nothing in the output to say so.
 *
 * The archive *format* is likewise a contract with gc rather than a presentation
 * choice: gc stops treating a session as live only once it is outside the sessions
 * directory, so a session filed anywhere else is deleted as garbage with no warning.
 */

import * as path from "node:path";
import { getAgentDir, getSessionsDir } from "@oh-my-pi/pi-utils";
import type { SessionInfo } from "../session/session-listing";
import {
	archiveDestination,
	collectArchivedStatsSessions,
	getArchivedSessionsDir,
	listActiveSessions,
	moveSessionWithArtifacts,
	restoreArchivedSession,
} from "./gc-cli";

export interface SessionListArgs {
	agentDir?: string;
	/** Print the most recently modified session's path and nothing else. */
	last?: boolean;
	/** Include archived sessions, which `list` otherwise hides. */
	all?: boolean;
	json?: boolean;
}

export interface SessionArchiveArgs {
	agentDir?: string;
	id: string;
}

export interface SessionUnarchiveArgs {
	agentDir?: string;
	id: string;
}

/** One listed session, live or archived. */
export interface SessionRow {
	id: string;
	path: string;
	title?: string;
	size?: number;
	modified?: string;
	archived: boolean;
}

function resolveAgentDir(agentDir: string | undefined): string {
	return path.resolve(agentDir ?? getAgentDir());
}

/**
 * A row per session, shaped for scanning down a column rather than parsing.
 *
 * The title comes from the fixed-width title slot at the head of the transcript
 * (`session-title-slot.ts`), not from the message body, so a session whose body is
 * truncated or corrupt still lists under its real title instead of degrading to a
 * timestamp.
 */
function formatRow(row: SessionRow): string {
	const modified = (row.modified ?? "").replace("T", " ").slice(0, 16);
	const size = row.size === undefined ? "" : String(row.size).padStart(9);
	const title = row.title?.trim() || row.id;
	return `${row.archived ? "archived " : "         "}${modified}  ${size}  ${row.id}  ${title}`;
}

function matchesId(row: SessionRow, id: string): boolean {
	return row.id === id || row.id.startsWith(id) || path.basename(row.path, ".jsonl") === id;
}

async function liveRows(sessionsRoot: string): Promise<SessionRow[]> {
	const sessions: SessionInfo[] = await listActiveSessions(sessionsRoot);
	return sessions.map(session => ({
		id: session.id,
		path: session.path,
		title: session.title?.trim() || session.firstMessage?.trim() || undefined,
		size: session.size,
		modified: session.modified.toISOString(),
		archived: false,
	}));
}

/**
 * Archived sessions, newest first.
 *
 * Archived transcripts are gzipped, so gc extracts only their session header
 * rather than materialising a full `SessionInfo`; the rows are correspondingly
 * thinner. That asymmetry is deliberate — it is the same thin view gc itself
 * reconciles against, and padding it out would mean reading archives the command
 * was only asked to list.
 */
async function archivedRows(agentDir: string, sessionsRoot: string): Promise<SessionRow[]> {
	const archiveRoot = getArchivedSessionsDir(agentDir);
	const rows: SessionRow[] = [];
	for (const session of await collectArchivedStatsSessions(archiveRoot, sessionsRoot, () => {})) {
		rows.push({ id: session.id, path: session.path, archived: true });
	}
	return rows;
}

export async function runSessionList(args: SessionListArgs): Promise<void> {
	const agentDir = resolveAgentDir(args.agentDir);
	const sessionsRoot = getSessionsDir(agentDir);
	const live = await liveRows(sessionsRoot);
	const rows = args.all ? [...live, ...(await archivedRows(agentDir, sessionsRoot))] : live;

	// `--last` prints a bare path because it exists to feed `--resume`; anything
	// else on that line breaks `ultraworkers session list --last` in a command substitution.
	if (args.last) {
		const newest = rows[0];
		if (!newest) {
			process.exitCode = 1;
			return;
		}
		process.stdout.write(`${newest.path}\n`);
		return;
	}

	if (args.json) {
		process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
		return;
	}

	for (const row of rows) process.stdout.write(`${formatRow(row)}\n`);
}

export async function runSessionArchive(args: SessionArchiveArgs): Promise<void> {
	const agentDir = resolveAgentDir(args.agentDir);
	const sessionsRoot = getSessionsDir(agentDir);
	const session = (await liveRows(sessionsRoot)).find(row => matchesId(row, args.id));
	if (!session) {
		process.stderr.write(`No live session matches "${args.id}".\n`);
		process.exitCode = 1;
		return;
	}
	const info = (await listActiveSessions(sessionsRoot)).find(row => row.id === session.id);
	if (!info) {
		process.stderr.write(`No live session matches "${args.id}".\n`);
		process.exitCode = 1;
		return;
	}
	const destination = archiveDestination(getArchivedSessionsDir(agentDir), sessionsRoot, info);
	if (!destination) {
		process.stderr.write(`Refusing to archive "${info.path}": it is not a session file under ${sessionsRoot}.\n`);
		process.exitCode = 1;
		return;
	}
	await moveSessionWithArtifacts({ ...destination, session: info });
	process.stdout.write(`${info.id} -> ${destination.destinationPath}\n`);
}

export async function runSessionUnarchive(args: SessionUnarchiveArgs): Promise<void> {
	const agentDir = resolveAgentDir(args.agentDir);
	const sessionsRoot = getSessionsDir(agentDir);
	const row = (await archivedRows(agentDir, sessionsRoot)).find(candidate => matchesId(candidate, args.id));
	if (!row) {
		process.stderr.write(`No archived session matches "${args.id}".\n`);
		process.exitCode = 1;
		return;
	}
	// gc reports an archived session by the path it would be restored TO, so the
	// archived file has to be re-derived from the archive root rather than by
	// appending `.gz` to that path — which would point back into the sessions
	// directory and be refused by `restoreArchivedSession`'s containment check.
	const relative = path.relative(sessionsRoot, row.path);
	const archivedPath = path.join(getArchivedSessionsDir(agentDir), `${relative}.gz`);
	const restored = await restoreArchivedSession(getArchivedSessionsDir(agentDir), sessionsRoot, archivedPath);
	process.stdout.write(`${row.id} -> ${restored}\n`);
}
