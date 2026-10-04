/**
 * `usage` is in exactly one preset, and in the FIRST right slot of it.
 *
 * ## Why placement is the contract, not membership
 *
 * `usage` reports quota windows (5h / 1d / 7d / monthly). A quota readout a user
 * cannot see is worth nothing, so "does the preset list it" is the wrong question:
 * any position renders identically on a wide terminal and disappears on a narrow
 * one. The overflow loop sheds right segments from the END (`right.pop()` in
 * `status-line/component.ts`), so position is the only thing that decides survival.
 *
 * The load-bearing row drives the real component through the real async usage path
 * and asserts what survives, with the order mutated at runtime. Asserting the array
 * literal alone would pass unchanged by a preset that lists `usage` last and
 * therefore never shows it — the failure this placement exists to prevent.
 *
 * ## Why `nerd` and not another preset
 *
 * `nerd` is the widest preset (path `maxLength: 60` vs `full`'s 50) and is chosen
 * precisely by people whose terminal has room. `default` is what every existing
 * user sees on day one, and `usage` is the widest segment in the catalog, so adding
 * it there would change the common case. `full` carries ten right segments
 * including four token/cache counters and is already full at 80 columns.
 *
 * This lives in `coding-agent` because `StatusLineComponent` needs the real
 * `statusLineHost` and quota arrives via `fetchUsageReports`; a 15-method host stub
 * would be a fixture that cannot fail.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import { resetSettingsForTest, Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { StatusLineComponent } from "@oh-my-pi/pi-tui/status-line";
import { STATUS_LINE_PRESETS } from "@oh-my-pi/pi-tui/status-line/presets";
import { statusLineHost } from "@oh-my-pi/pi-coding-agent/modes/status-line-host";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import { StatusLineTestComponents } from "./helpers/status-line";

const statusLines = new StatusLineTestComponents();

/**
 * The quota this fixture fetches. A report is `{ provider, limits: [{ scope, amount }] }`
 * and `amount.usedFraction` is a FRACTION, so the rendered marker is `fraction * 100`.
 */
const QUOTA_FRACTION = 0.8;

/** Let the background usage fetch land. */
async function flushUsageRefresh(): Promise<void> {
	const timer = Promise.withResolvers<void>();
	setTimeout(timer.resolve, 0);
	await timer.promise;
	await Promise.resolve();
	await Promise.resolve();
}

/** Render `rightSegments` at `width`, after quota has actually arrived. */
async function renderRight(rightSegments: string[], width: number): Promise<string> {
	const component = statusLines.track(
		new StatusLineComponent(
			{
				state: { messages: [], model: { id: "m", contextWindow: 1000, provider: "anthropic" } },
				model: { id: "m", contextWindow: 1000, provider: "anthropic" },
				sessionManager: {
					getUsageStatistics: () => ({
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 0,
						orchestrationInput: 0,
						orchestrationOutput: 0,
						orchestrationCacheRead: 0,
						premiumRequests: 0,
						cost: 0,
					}),
				},
				fetchUsageReports: async () => [
					{
						provider: "anthropic",
						limits: [{ scope: { windowId: "5h" }, amount: { usedFraction: QUOTA_FRACTION } }],
					},
				],
				modelRegistry: {
					// `cost` reads `isUsingOAuth` to decide subscription pricing, so the
					// registry needs both halves: the oauth identity the usage fetch asks,
					// and the subscription predicate the cost segment asks.
					isUsingOAuth: () => false,
					authStorage: { oauth: { identity: () => undefined } },
				},
				getAsyncJobSnapshot: () => ({ running: [] }),
				getContextUsage: () => undefined,
			} as unknown as ConstructorParameters<typeof StatusLineComponent>[0],
			statusLineHost,
		),
	);
	component.updateSettings({
		preset: "custom",
		// A non-empty LEFT side is load-bearing: `#buildStatusLine` returns early —
		// before the overflow loop — when either side is empty, so an all-right bar
		// would render every segment at every width and this test could not fail.
		leftSegments: ["session"],
		rightSegments: rightSegments as never,
		separator: "none",
		sessionAccent: false,
		transparent: true,
		segmentOptions: {},
	});
	component.refreshUsageInBackground();
	await flushUsageRefresh();
	return stripVTControlCharacters(component.getTopBorder(width).content);
}

beforeAll(async () => {
	resetSettingsForTest();
	await Settings.init({ inMemory: true });
	await initTheme();
});

afterAll(() => {
	statusLines.dispose();
	resetSettingsForTest();
});

describe("usage placement in presets", () => {
	it("is listed in nerd, and in exactly one preset", () => {
		const carriers = Object.entries(STATUS_LINE_PRESETS)
			.filter(([, def]) => [...def.leftSegments, ...def.rightSegments].some(s => s === "usage"))
			.map(([name]) => name);
		expect(carriers).toEqual(["nerd"]);
	});

	it("leads the right side of nerd, so overflow sheds it last", () => {
		// The other half of the same contract. A `usage` that survived because it
		// happens to fit is not the property; the slot is.
		expect(STATUS_LINE_PRESETS.nerd.rightSegments[0]).toBe("usage");
	});

	it("survives a width that drops the same segment placed after the others", async () => {
		// The falsifiable half. Same segment set, two orders, at a width where the
		// tail overflows. If position did not decide survival the two renders would be
		// identical and this row would prove nothing.
		const right = ["usage", "time", "cost", "context_total"];
		const marker = "80%";
		// Measured, not guessed: at 30 columns the four right segments total 81, so
		// the tail overflows and the loop sheds from the end. Above ~36 the bar fits
		// and BOTH orders render — a width chosen in that range would make this row
		// pass for the wrong reason.
		const width = 30;

		expect(await renderRight(right, width)).toContain(marker);
		// The control: the same segment at the tail of the same list, same width, does
		// NOT render. Without it the row above could pass against a component that
		// paints every segment regardless of width.
		expect(await renderRight([...right].reverse(), width)).not.toContain(marker);
	});
});
