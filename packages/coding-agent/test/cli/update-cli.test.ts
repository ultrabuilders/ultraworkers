import { afterEach, describe, expect, it, vi } from "bun:test";
import * as path from "node:path";
import { WIRE_NAME } from "@oh-my-pi/pi-utils";
import { fixedNpmRegistry } from "../../src/cli/npm-registry";
import { getLatestRelease, LEGACY_WIRE_NAME, parseReportedVersion, runUpdateCommand } from "../../src/cli/update-cli";

const npmjs = fixedNpmRegistry();

type FetchInput = string | URL | Request;
type FetchInit = RequestInit | BunFetchRequestInit;

describe("runUpdateCommand fetch cancellation", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("checks release metadata with a timeout signal", async () => {
		let requestSignal: AbortSignal | undefined;
		vi.spyOn(console, "log").mockImplementation(() => {});
		const fetchStub = Object.assign(
			async (_input: FetchInput, init?: FetchInit) => {
				requestSignal = init?.signal ?? undefined;
				return Response.json({ version: "999.0.0" });
			},
			{ preconnect: globalThis.fetch.preconnect },
		);
		vi.spyOn(globalThis, "fetch").mockImplementation(fetchStub);

		await runUpdateCommand({ force: false, check: true });

		expect(requestSignal).toBeInstanceOf(AbortSignal);
	});
});

describe("getLatestRelease rename pointers", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function stubRegistry(manifests: Record<string, unknown>): string[] {
		const urls: string[] = [];
		const fetchStub = Object.assign(
			async (input: FetchInput) => {
				const url = String(input);
				urls.push(url);
				const decoded = decodeURIComponent(url);
				let manifest: unknown;
				for (const pkg in manifests) {
					if (decoded.includes(pkg)) {
						manifest = manifests[pkg];
						break;
					}
				}
				if (!manifest) return new Response(null, { status: 404, statusText: "Not Found" });
				return Response.json(manifest);
			},
			{ preconnect: globalThis.fetch.preconnect },
		);
		vi.spyOn(globalThis, "fetch").mockImplementation(fetchStub);
		return urls;
	}

	it("follows omp.rename to the new package and resolves version, dist, and names from its manifest", async () => {
		const urls = stubRegistry({
			"@new/omp": { version: "999.1.0", omp: { dist: "npm" } },
			"@oh-my-pi/pi-coding-agent": {
				version: "999.0.0",
				omp: { dist: "binary", rename: { package: "@new/omp", natives: "@new/natives" } },
			},
		});

		const release = await getLatestRelease({ registries: npmjs });

		expect(release.version).toBe("999.1.0");
		expect(release.dist).toBe("npm");
		expect(release.packages).toEqual({ pkg: "@new/omp", natives: "@new/natives" });
		expect(urls).toEqual([
			"https://registry.npmjs.org/@oh-my-pi%2fpi-coding-agent/latest",
			"https://registry.npmjs.org/@new%2fomp/latest",
		]);
	});
	it("fetches the canary dist-tag when checking the canary channel", async () => {
		const urls = stubRegistry({
			"@oh-my-pi/pi-coding-agent": { version: "999.0.0-canary.1" },
		});

		await getLatestRelease({ channel: "canary", registries: npmjs });

		expect(urls).toEqual(["https://registry.npmjs.org/@oh-my-pi%2fpi-coding-agent/canary"]);
	});

	it("ignores a rename pointer that cycles back to an already-visited package", async () => {
		const urls = stubRegistry({
			"@oh-my-pi/pi-coding-agent": {
				version: "999.0.0",
				omp: { rename: { package: "@oh-my-pi/pi-coding-agent" } },
			},
		});

		const release = await getLatestRelease({ registries: npmjs });

		expect(urls).toHaveLength(1);
		expect(release.version).toBe("999.0.0");
		expect(release.packages).toEqual({ pkg: "@oh-my-pi/pi-coding-agent", natives: "@oh-my-pi/pi-natives" });
	});
});

describe("getLatestRelease configured registry", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const feed = () => ({
		url: "https://npm.corp.example/api/npm/feed/",
		source: "/home/u/.npmrc",
		authorization: "Bearer s3cret",
	});

	it("queries the configured feed with its credentials and reports it for the install pin", async () => {
		const requests: { url: string; authorization: string | null }[] = [];
		vi.spyOn(globalThis, "fetch").mockImplementation(
			Object.assign(
				async (input: FetchInput, init?: FetchInit) => {
					requests.push({ url: String(input), authorization: new Headers(init?.headers).get("authorization") });
					return Response.json({ version: "999.0.0" });
				},
				{ preconnect: globalThis.fetch.preconnect },
			),
		);

		const release = await getLatestRelease({ registries: feed });

		expect(requests).toEqual([
			{
				url: "https://npm.corp.example/api/npm/feed/@oh-my-pi%2fpi-coding-agent/latest",
				authorization: "Bearer s3cret",
			},
		]);
		expect(release.registry).toBe("https://npm.corp.example/api/npm/feed/");
	});

	it("falls back to the full packument when the feed does not serve the dist-tag shortcut", async () => {
		const urls: string[] = [];
		vi.spyOn(globalThis, "fetch").mockImplementation(
			Object.assign(
				async (input: FetchInput) => {
					const url = String(input);
					urls.push(url);
					if (url.endsWith("/latest")) return new Response(null, { status: 404, statusText: "Not Found" });
					return Response.json({
						"dist-tags": { latest: "999.2.0" },
						versions: { "999.2.0": { version: "999.2.0", omp: { dist: "binary" } } },
					});
				},
				{ preconnect: globalThis.fetch.preconnect },
			),
		);

		const release = await getLatestRelease({ registries: feed });

		expect(urls).toEqual([
			"https://npm.corp.example/api/npm/feed/@oh-my-pi%2fpi-coding-agent/latest",
			"https://npm.corp.example/api/npm/feed/@oh-my-pi%2fpi-coding-agent",
		]);
		expect(release.version).toBe("999.2.0");
		expect(release.dist).toBe("binary");
	});

	it("reports a missing canary dist-tag on the feed as no canary release", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(
			Object.assign(
				async (input: FetchInput) =>
					String(input).endsWith("/canary")
						? new Response(null, { status: 404, statusText: "Not Found" })
						: Response.json({ "dist-tags": { latest: "1.0.0" }, versions: { "1.0.0": { version: "1.0.0" } } }),
				{ preconnect: globalThis.fetch.preconnect },
			),
		);

		await expect(getLatestRelease({ channel: "canary", registries: feed })).rejects.toThrow(
			"No canary release has been published",
		);
		// The remedy in that message is a command the reader is expected to paste.
		// `bin` in the package is `omp`, so a hint printed with the display name
		// is a suggestion that fails with "command not found". Derived from
		// WIRE_NAME rather than a literal, because here the constant is the
		// established wire contract (`wire-name.test.ts` pins it) and not the
		// thing under test — unlike the version banner, where it was the suspect.
		await expect(getLatestRelease({ channel: "canary", registries: feed })).rejects.toThrow(
			`Try \`${WIRE_NAME} update --stable\``,
		);
		// The row above is necessary but not sufficient, and the gap is the interesting
		// part. It interpolates the same constant the code does, so it stays green if
		// that constant drifts away from the command an installer actually ships:
		// rename `package.json#bin` to `ultraworkers` and this row still passes while
		// the remedy tells the reader to type a command they do not have.
		//
		// So the remedy is also checked against the manifest, which is the ground
		// truth for "a command you can paste". Renaming the bin key turns THIS row
		// red and leaves the one above green — the pair is what closes the copy.
		const manifest = (await Bun.file(path.resolve(import.meta.dir, "../../package.json")).json()) as {
			bin: Record<string, string>;
		};
		const invocable = Object.keys(manifest.bin)[0];
		expect(invocable).toBeTruthy();
		await expect(getLatestRelease({ channel: "canary", registries: feed })).rejects.toThrow(
			`Try \`${invocable} update --stable\``,
		);
	});
});

describe("getLatestRelease proxy errors", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("translates Bun's UnsupportedProxyProtocol fetch failure into an actionable CLI message", async () => {
		const fetchStub = Object.assign(
			async () => {
				throw new Error(
					'UnsupportedProxyProtocol fetching "https://registry.npmjs.org/@oh-my-pi/pi-coding-agent/latest". ' +
						"For more information, pass `verbose: true` in the second argument to fetch()",
				);
			},
			{ preconnect: globalThis.fetch.preconnect },
		);
		vi.spyOn(globalThis, "fetch").mockImplementation(fetchStub);

		const err = await getLatestRelease({ timeoutMs: 5000, registries: npmjs }).then(
			() => null,
			(e: unknown) => e as Error,
		);

		expect(err).toBeInstanceOf(Error);
		// The raw fetch() instruction the CLI user cannot act on must not leak through.
		expect(err?.message).not.toContain("verbose: true");
		expect(err?.message).not.toContain("fetch()");
		// Instead the user gets actionable guidance about supported proxy schemes.
		expect(err?.message).toMatch(/SOCKS/i);
		expect(err?.message).toMatch(/https?:\/\//i);
	});
});

/**
 * Which identity a `--version` banner is read under.
 *
 * The updater has to recognise every binary a user might have installed, and
 * `validateExistingUpdateTarget` reads "unrecognised" as "this is not an OMP
 * binary" and refuses to replace it. A banner this fails to parse is therefore
 * not a cosmetic miss — it locks that user out of self-update entirely.
 *
 * `WIRE_NAME` and `APP_NAME` are the *same* string today, and that is intended
 * rather than a leftover: the rebrand made them equal, the alternation collapsed
 * to one entry, and every pre-rebrand binary went unrecognised. The repair was
 * `LEGACY_WIRE_NAME` — a literal, precisely because the identity it names can no
 * longer be derived from any constant. So the contract is not "these strings
 * differ"; it is that each banner is read under the identity it was printed
 * with, which holds whether or not the constants happen to be equal.
 */
describe("parseReportedVersion identity matching", () => {
	it("reads each identity's own version, so a rebrand cannot hide a pre-rebrand binary", () => {
		// The version differs per row on purpose. A single expected value would
		// pass even if the matcher attributed a banner to the wrong identity,
		// because the digits would still be right; pairing each identity with its
		// own version is what makes the attribution observable.
		//
		// `APP_NAME` is deliberately not a row of its own: it is the same string as
		// `WIRE_NAME` today, so a row for each would assert the identical call twice
		// and could never fail independently of the other. If a future identity
		// change splits them, that is the moment to give `APP_NAME` its own version.
		for (const [identity, version] of [
			[WIRE_NAME, "18.4.3"],
			[LEGACY_WIRE_NAME, "18.2.4"],
		] as const) {
			expect(parseReportedVersion(`${identity}/${version}`)).toBe(version);
		}
	});

	// The historical defect, kept as its own contract because the row above can
	// still pass while the alternation holds only one entry: with `WIRE_NAME` and
	// `APP_NAME` equal, the array reads as three names and matches two. Asserting
	// the constants are unequal would demand a rename nobody asked for, and would
	// be a statement about today's strings rather than about the matching.
	it("still recognises the pre-rebrand banner, which no constant can produce", () => {
		expect(LEGACY_WIRE_NAME).not.toBe(WIRE_NAME);
		expect(parseReportedVersion(`${LEGACY_WIRE_NAME}/18.2.4`)).toBe("18.2.4");
	});

	// Two banners that must NOT parse: a different program that happens to print
	// a version, and a banner whose version is not semver. A matcher that grew
	// laxer to cover a new identity would let both through, and the updater would
	// then offer to replace something it does not own.
	it("rejects a banner from another program and a non-semver version", () => {
		expect(parseReportedVersion("totally-not-omp/1.0.0")).toBeUndefined();
		expect(parseReportedVersion(`${WIRE_NAME}/not-a-version`)).toBeUndefined();
	});
});
