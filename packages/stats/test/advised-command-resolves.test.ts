import { describe, expect, it } from "bun:test";
import { commands } from "@oh-my-pi/pi-coding-agent/cli-commands";
import { APP_NAME } from "@oh-my-pi/pi-utils/brand";
import { startFrustrationRun } from "../src/frustration";

/**
 * Every command this package tells a user to run must resolve in the CLI that
 * ships them.
 *
 * ## Why this is a behaviour contract and not a constant comparison
 *
 * The obvious test here is `expect(Object.keys(pkg.bin)).toEqual([...])`. That was
 * proposed, and it is empty: a constant derived from `bin` only re-asserts `bin`.
 * It stays green if `omp-stats` is renamed to anything, which is the one thing
 * worth catching. This test instead reads the real command table
 * (`commands` in `cli-commands.ts`) and asserts the subcommand advice names is
 * actually dispatched — so renaming or deleting the subcommand reds it, and so
 * does advice for a subcommand that never existed.
 *
 * ## The defect this defends
 *
 * `@oh-my-pi/omp-stats` is published as its own npm package and declares
 * `bin: { "omp-stats": … }`. Its dependency list contains no `@oh-my-pi/pi-coding-agent`,
 * which is the package that provides the `ultraworkers` bin. So
 * `npm i -g @oh-my-pi/omp-stats` yields a user who HAS this dashboard and does NOT
 * have `ultraworkers` on PATH — and this package's advice tells exactly that user
 * to run `ultraworkers stats` (frustration.ts) and `ultraworkers usage`
 * (ProvidersRoute.tsx).
 *
 * This is the second half of epic-grse. The first half — dashboard strings that
 * hardcoded the literal `omp`, a name no install path creates — was fixed by
 * deriving `${APP_NAME}`. That fix is correct for an install that has both
 * packages, and silent for one that has only this.
 */
describe("commands this package advises the user to run", () => {
	/**
	 * Names dispatched by `commands`. Read from the table rather than restated,
	 * so a subcommand that is renamed or dropped cannot be papered over by a
	 * literal that happens to agree with it today.
	 */
	const dispatched = new Set(commands.map(command => command.name));

	// Every site in this package whose text instructs the user to run something.
	// `port-conflict.ts` and the three `.tsx` routes were measured; the ones that
	// only name the product in prose ("… did across every ${APP_NAME} session")
	// are excluded because they instruct no command.
	const advised: { sub: string; where: string }[] = [
		{ sub: "stats", where: "src/frustration.ts:103 (NO_PROVIDER_REASON)" },
		{ sub: "stats", where: "src/client/routes/FrustrationRoute.tsx:197 (UNAVAILABLE_HINT)" },
		{ sub: "usage", where: "src/client/routes/ProvidersRoute.tsx:92 (SNAPSHOT_HINT)" },
	];

	it("all resolve in the shipped command table", () => {
		// Every advised subcommand is dispatched. A rename of any of them makes
		// this red, because `dispatched` comes from the table and not a literal.
		const unknown = advised.filter(({ sub }) => !dispatched.has(sub)).map(({ sub, where }) => `${sub} (${where})`);
		expect({ unknown, advised: advised.length }).toEqual({ unknown: [], advised: advised.length });
	});

	it("the classify instruction actually shown to a judge-less user names a real subcommand", async () => {
		// Reads the string through the public surface rather than importing the
		// module-private constant, so this asserts on what a user receives instead
		// of widening the module's exports to make the test convenient. With no
		// judge provider registered — the state this string exists for — the call
		// returns that exact text as its error. If it stops advising `stats`, this
		// goes red rather than passing on a lookup that describes nothing.
		const result = await startFrustrationRun();
		expect(result.started).toBe(false);
		// Matches the INTERPOLATED text the user actually reads. Matching the
		// template `${APP_NAME}` instead would pass on a string that still had to
		// be substituted, and would never match at all, since the constant is
		// resolved before this string is built.
		const advisedSub = new RegExp(`\`${APP_NAME} ([a-z][a-z-]*)`).exec(result.started ? "" : result.error)?.[1];
		expect(advisedSub).toBe("stats");
		expect(dispatched.has(advisedSub as string)).toBe(true);
	});
});
