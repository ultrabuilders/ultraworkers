import { afterEach, describe, expect, it } from "bun:test";

/**
 * The dashboard renamed its theme storage key from `omp-stats-theme` to
 * `ultraworkers-stats-theme`.
 *
 * `localStorage` belongs to the user, not to the repo, and nothing in the tree records that a
 * value exists under the old name. So a bare key rename is invisible in review and fatal in
 * practice: every saved preference silently reverts to "follow the OS", and the only symptom
 * is a dashboard that has forgotten someone chose dark. `readStoredPreference` copies the old
 * key across on first load; the cases below pin that a returning user keeps what they chose.
 *
 * The module reads storage once, at import. Each case therefore imports it under a distinct
 * specifier — a cached module answers from the previous case's state, so a migration that does
 * nothing would still pass.
 */

const NEW_KEY = "ultraworkers-stats-theme";
const LEGACY_KEY = "omp-stats-theme";

/** The minimal `Storage` surface the module uses, plus what it lets a test assert on. */
interface SeededStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
	snapshot(): Record<string, string>;
}

let loadSequence = 0;

/** Install a browser-shaped global: storage seeded from `seed`, and a light OS theme. */
function installBrowser(seed: Record<string, string>): SeededStorage {
	const entries = new Map(Object.entries(seed));
	const storage: SeededStorage = {
		getItem: key => entries.get(key) ?? null,
		setItem: (key, value) => void entries.set(key, value),
		removeItem: key => void entries.delete(key),
		snapshot: () => Object.fromEntries(entries),
	};
	globalThis.localStorage = storage as unknown as Storage;
	globalThis.document = {
		documentElement: { dataset: {}, style: {} },
	} as unknown as Document;
	globalThis.window = {
		matchMedia: () => ({ matches: false, addEventListener: () => {} }),
	} as unknown as Window & typeof globalThis;
	return storage;
}

/** Import the theme module fresh, so its load-time storage read runs against the stub above. */
async function loadThemeModule(): Promise<void> {
	loadSequence += 1;
	await import(`../src/client/useSystemTheme.ts?case=${loadSequence}`);
}

function appliedTheme(): string | undefined {
	return (globalThis.document.documentElement.dataset as Record<string, string>).theme;
}

afterEach(() => {
	delete (globalThis as Partial<typeof globalThis>).localStorage;
	delete (globalThis as Partial<typeof globalThis>).document;
	delete (globalThis as Partial<typeof globalThis>).window;
});

describe("theme preference storage migration", () => {
	it("keeps the theme a returning user chose, when only the pre-rebrand key is stored", async () => {
		const storage = installBrowser({ [LEGACY_KEY]: "dark" });

		await loadThemeModule();

		// The user sees their saved theme, not the OS default, on the first painted frame.
		expect(appliedTheme()).toBe("dark");
		// The preference now lives under the current key, and the retired one is not left to
		// be re-read on every later load.
		expect(storage.snapshot()).toEqual({ [NEW_KEY]: "dark" });
	});

	it("prefers the current key and leaves the pre-rebrand one untouched when both are stored", async () => {
		const storage = installBrowser({ [NEW_KEY]: "light", [LEGACY_KEY]: "dark" });

		await loadThemeModule();

		// The user's later choice wins; the stale key must not overwrite it.
		expect(appliedTheme()).toBe("light");
		// Nothing is removed: deleting here would discard a value the user may still rely on
		// if they downgrade.
		expect(storage.snapshot()).toEqual({ [NEW_KEY]: "light", [LEGACY_KEY]: "dark" });
	});

	it("writes no legacy entry for someone arriving with no stored preference", async () => {
		const storage = installBrowser({});

		await loadThemeModule();

		expect(appliedTheme()).toBe("light"); // the stubbed OS theme
		expect(storage.snapshot()).toEqual({});
	});
});
