import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { getBundledModel } from "@oh-my-pi/pi-catalog";
import { bridge, LAZY_TRANSPORT_KEYS, memoize, PROVIDER_TRANSPORTS } from "@oh-my-pi/pi-ai/registry/transports";
import type { Context, Model } from "@oh-my-pi/pi-ai/types";
import { AssistantMessageEventStream } from "@oh-my-pi/pi-ai/utils/event-stream";

/**
 * `stream.ts` loads five provider transports on demand instead of importing
 * them by value, so a consumer that only ever talks to one provider does not pay
 * for the other four module graphs.
 *
 * Two contracts, and the second is the one that separates an optimisation from a
 * bug:
 *
 * 1. **Positive — the registry is a working seam.** Every key resolves to a
 *    function and returns a real stream, not a promise of one, because the
 *    dispatchers in `stream.ts` are synchronous.
 * 2. **Negative — a provider must not disappear at runtime.** When a transport
 *    cannot load, the failure names the provider, the api, and the model. An
 *    optimisation that degraded a provider into `Cannot find module` would make
 *    a working provider vanish into an untraceable bundler message, which is
 *    strictly worse than the slow import it replaced.
 *
 * SCOPE — the five *stream* transports are out of the graph; `google-auth` is not.
 * Vertex's token helper is lazy at its call site, but `stream.ts` value-imports
 * `./providers/register-builtins`, which value-imports `google`, `google-vertex`
 * and `google-gemini-cli`, and `google-vertex` pulls in `google-auth`. Two hops,
 * still eager. So the graph assertion below covers the five transports and claims
 * nothing about google: measured with `scripts/check-entry-graphs.mjs`'s own
 * walker, `stream.ts` reaches 284 files, 50 of them provider modules, and
 * `google-auth.ts` is one of them.
 */

/**
 * The transitive closure of value imports reachable from an entry module.
 *
 * Value imports only: `import type` is erased before the runtime ever sees it, so
 * counting it would over-report the graph and make a healthy entry look heavier
 * than it is. That direction of error is the safe one — it raises false alarms
 * rather than missing a regression — but it is still the wrong number.
 *
 * Resolution is deliberately shallow-per-file but transitive across files: a specifier
 * is followed only when it names a file that exists, so an unresolvable or external
 * specifier ends that branch instead of throwing. Dynamic `import()` is not followed,
 * which is the property under test.
 */
async function valueImportClosure(entry: URL): Promise<string[]> {
	const seen = new Set<string>();
	const queue = [fileURLToPath(entry)];

	while (queue.length > 0) {
		const file = queue.pop()!;
		if (seen.has(file) || !existsSync(file)) continue;
		seen.add(file);

		// `import`/`export ... from "<spec>"`, excluding the `import type` form.
		const source = await Bun.file(file).text();
		const specifiers = [
			...source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\s)[^;]*?from\s*["']([^"']+)["']/g),
		];
		for (const [, specifier] of specifiers) {
			if (!specifier.startsWith(".")) continue;
			const base = resolve(dirname(file), specifier);
			for (const candidate of [`${base}.ts`, `${base}/index.ts`]) {
				if (existsSync(candidate)) {
					queue.push(candidate);
					break;
				}
			}
		}
	}

	return [...seen];
}

function model(provider: string, api: string): Model<"openai-completions"> {
	return {
		...getBundledModel("openai", "gpt-4o-mini")!,
		api: "openai-completions",
		provider,
		requestMetadata: { apiHint: api },
	} as unknown as Model<"openai-completions">;
}

const context: Context = { messages: [{ role: "user", content: "hi", timestamp: 0 }] };

describe("provider transport registry", () => {
	it("exposes exactly the five lazily-loaded transports", () => {
		// The set is the contract: adding a transport here without wiring a
		// dispatch site in stream.ts would be dead weight, and dropping one would
		// silently return that provider to a static import.
		expect([...LAZY_TRANSPORT_KEYS].sort()).toEqual([
			"gitlabDuo",
			"gitlabDuoWorkflow",
			"kimi",
			"piNative",
			"synthetic",
		]);
	});

	it("keeps the five stream transports out of stream.ts's transitive value-import graph", async () => {
		// The observation the shape assertions above cannot make. Every other test
		// in this file would stay green if someone reverted the registry to plain
		// static imports, because the keys and the error path would be unchanged.
		//
		// This walks the graph, it does not grep one file. That distinction is the
		// whole point: `stream.ts` imports `./providers/register-builtins` by value,
		// and that module pulls in thirteen providers including the three google
		// ones. A source grep of `stream.ts` alone therefore reports a transport as
		// "lazy" while the module is still loaded eagerly two hops downstream —
		// which is exactly how `google-auth` stayed in the graph while this test
		// passed. Only the transitive closure tells the truth about what a consumer
		// of `stream.ts` actually pays for.
		//
		// The graph is resolved at runtime, so a reverted registry (or a new value
		// import anywhere upstream of one) fails here rather than passing.
		const graph = await valueImportClosure(new URL("../src/stream.ts", import.meta.url));

		for (const transport of ["gitlab-duo", "gitlab-duo-workflow", "kimi", "pi-native-client", "synthetic"]) {
			expect(
				`${transport}: ${graph.some(file => file.endsWith(`/providers/${transport}.ts`)) ? "IN GRAPH" : "out"}`,
			).toBe(`${transport}: out`);
		}
	});

	it("returns a stream synchronously, not a promise of one", () => {
		// `streamDispatch` and `streamSimpleRequest` are declared as returning
		// `AssistantMessageEventStream`, not a promise. If a transport handed back
		// the raw `import()` promise, those signatures would have to become async
		// and every caller's error handling would shift. The observable proof is
		// that the value is directly async-iterable, with no `await` first.
		const returned = PROVIDER_TRANSPORTS.kimi({ model: model("kimi-code", "kimi"), context, options: {} });
		expect(typeof (returned as { then?: unknown }).then).toBe("undefined");
		expect(typeof returned[Symbol.asyncIterator]).toBe("function");
	});

	it("surfaces a transport load failure that names the provider, api, and model", async () => {
		// The negative contract, exercised through the real `bridge()` path rather
		// than by constructing the error directly: a caller must be able to
		// consume the returned stream and read the provider identity off the
		// result. Constructing `ProviderTransportLoadError` by hand would stay
		// green even if `bridge()` stopped wrapping failures at all.
		const target = { model: model("kimi-code", "kimi"), context, options: {} };
		const stream = bridge(target, async () => {
			throw new Error("Cannot find module './providers/kimi'");
		});

		const result = await stream.result();

		expect(result.stopReason).toBe("error");
		expect(result.provider).toBe("kimi-code");
		expect(result.model).toBe("gpt-4o-mini");
		// The bundler's own text is preserved inside the message rather than
		// replacing the provider identity, so both the user-facing and the
		// diagnostic reading of the failure survive.
		expect(result.errorMessage).toContain('provider "kimi-code"');
		expect(result.errorMessage).toContain("Cannot find module");
	});

	it("retries a failed lazy import instead of freezing the failure for the process", async () => {
		// A rejected cache entry must be dropped, not kept. A lazy chunk can fail
		// transiently (cold cache, momentarily unreadable file); freezing that
		// rejection would turn a recoverable error into a permanent one for every
		// later turn. The observable contract is the load count: a memoised
		// success loads once, a memoised *failure* must load again.
		let loadCalls = 0;
		const load = memoize(async () => {
			loadCalls++;
			throw new Error(`chunk load failed (attempt ${loadCalls})`);
		});

		await expect(load()).rejects.toThrow("chunk load failed (attempt 1)");
		await expect(load()).rejects.toThrow("chunk load failed (attempt 2)");
		await expect(load()).rejects.toThrow("chunk load failed (attempt 3)");

		expect(loadCalls).toBe(3);
	});

	it("still loads a successful import only once", async () => {
		// The other half of the same contract: dropping the cache on failure must
		// not also defeat caching on success, or every turn would re-import.
		let loadCalls = 0;
		const load = memoize(async () => {
			loadCalls++;
			return { ok: true };
		});

		expect(await load()).toEqual({ ok: true });
		expect(await load()).toEqual({ ok: true });
		expect(await load()).toEqual({ ok: true });

		expect(loadCalls).toBe(1);
	});

	it("propagates a transport's own failure as a rejection, never a hang", async () => {
		// `EventStream`'s iterator throws when the stream fails rather than
		// yielding an error event. The bridge runs that iteration inside an async
		// IIFE, so an uncaught throw would leave the outer stream open forever:
		// a provider that used to reject the turn would instead hang the caller.
		// Consumers rely on `.result()` rejecting, so that is the contract here.
		const target = { model: model("kimi-code", "kimi"), context, options: {} };
		const inner = new AssistantMessageEventStream();
		inner.fail(new Error("auth-gateway 418"));

		// `load` resolves the provider's streaming *function*, matching the real
		// call sites; the failure then happens on the stream that function returns.
		const stream = bridge(target, async () => () => inner);

		// Must settle rather than hang: a hang fails this by timeout, which is the
		// exact regression being defended.
		await expect(stream.result()).rejects.toThrow("auth-gateway 418");
	});

	it("names the provider on every failure, not only the first", async () => {
		// Retrying must not weaken the message: if the second attempt degraded to
		// a bare bundler error, a transient failure would look permanent to
		// whoever reads the log.
		const target = { model: model("kimi-code", "kimi"), context, options: {} };
		const failing = async () => {
			throw new Error("Cannot find module './providers/kimi'");
		};

		const first = await bridge(target, failing).result();
		const second = await bridge(target, failing).result();

		expect(first.errorMessage).toContain('provider "kimi-code"');
		expect(second.errorMessage).toContain('provider "kimi-code"');
	});
});
