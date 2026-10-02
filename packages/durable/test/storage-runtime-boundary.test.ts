import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));

/**
 * Resolve a relative specifier to a file on disk.
 *
 * `pi` writes its imports with explicit `.ts` extensions; this repo does not, and a
 * bare `.ts` specifier is a typecheck error here. So a specifier has three real
 * shapes — `./x.ts`, `./x`, and `./x/index` — and reading the specifier as a literal
 * path finds none of them unless each is tried in turn.
 */
async function resolveSpecifier(from: string, specifier: string): Promise<string> {
	const base = resolve(dirname(from), specifier);
	for (const candidate of [base, `${base}.ts`, resolve(base, "index.ts")]) {
		try {
			await readFile(candidate, "utf8");
			return candidate;
		} catch {
			continue;
		}
	}
	throw new Error(`cannot resolve ${specifier} from ${from}`);
}

async function sourceGraph(entry: string): Promise<Set<string>> {
	const visited = new Set<string>();
	const pending = [resolve(sourceRoot, entry)];
	while (pending.length > 0) {
		const path = pending.pop()!;
		if (visited.has(path)) continue;
		visited.add(path);
		const source = await readFile(path, "utf8");
		expect(source, `${path} imports a Node built-in`).not.toMatch(/(?:from\s+|import\s*)["']node:/);
		for (const match of source.matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)) {
			pending.push(await resolveSpecifier(path, match[1]));
		}
	}
	return visited;
}

describe("durable storage runtime boundaries", () => {
	it("keeps the package root limited to portable core storage", async () => {
		const graph = await sourceGraph("index.ts");
		expect([...graph].some(path => path.includes("/env/"))).toBe(false);
		expect([...graph].some(path => path.includes("/storage/jsonl/"))).toBe(false);
		expect([...graph].some(path => path.includes("/storage/sqlite/"))).toBe(false);
	});

	it("keeps the portable SQLite subpath free of Node imports", async () => {
		const graph = await sourceGraph("storage/sqlite/index.ts");
		expect([...graph].some(path => path.endsWith("/storage/sqlite/node.ts"))).toBe(false);
	});

	it("keeps the portable environment subpath free of Node imports", async () => {
		const graph = await sourceGraph("env/index.ts");
		expect([...graph].some(path => path.endsWith("/env/node.ts"))).toBe(false);
	});

	it("keeps the portable JSONL subpath free of Node imports", async () => {
		const graph = await sourceGraph("storage/jsonl/index.ts");
		expect([...graph].some(path => path.endsWith("/storage/jsonl/node.ts"))).toBe(false);
		expect([...graph].some(path => path.endsWith("/env/node.ts"))).toBe(false);
	});
});
