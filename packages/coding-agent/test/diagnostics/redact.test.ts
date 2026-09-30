import { describe, expect, test } from "bun:test";
import { isSensitiveKey, REDACTED, redactJsonValue, redactUrl } from "../../src/diagnostics/redact";

describe("isSensitiveKey", () => {
	// The load-bearing case, and it is NOT a bare `apiKey`. `SENSITIVE_KEY` is
	// case-insensitive, so `apiKey` matches with or without the normalisation —
	// a test on that spelling passes even against a port that dropped the
	// `.replace()` entirely. A *prefixed* camelCase key is what discriminates:
	// without normalisation nothing separates the prefix from `api`, so the
	// `(?:^|[-_])` boundary never opens.
	test("normalises camelCase before matching", () => {
		expect(isSensitiveKey("myApiKey")).toBe(true);
		expect(isSensitiveKey("authToken")).toBe(true);
	});

	test("redacts a bare camelCase secret key", () => {
		expect(isSensitiveKey("apiKey")).toBe(true);
	});

	test("matches snake_case and kebab-case spellings of the same key", () => {
		expect(isSensitiveKey("api_key")).toBe(true);
		expect(isSensitiveKey("API-KEY")).toBe(true);
	});

	test("leaves a non-sensitive key alone", () => {
		expect(isSensitiveKey("model")).toBe(false);
	});
});

describe("redactJsonValue", () => {
	test("replaces the value under a camelCase secret key", () => {
		const out = redactJsonValue({ apiKey: "sk-live-XYZ" }) as Record<string, unknown>;
		expect(out.apiKey).toBe(REDACTED);
	});

	test("redacts the same secret under snake_case and kebab-case keys", () => {
		const out = redactJsonValue({ api_key: "a", "API-KEY": "b" }) as Record<string, unknown>;
		expect(out.api_key).toBe(REDACTED);
		expect(out["API-KEY"]).toBe(REDACTED);
	});

	test("cleans a nested authorization field in a config-shaped object", () => {
		const out = redactJsonValue({
			provider: { name: "acme", authorization: "Bearer sk-live-XYZ" },
		}) as { provider: Record<string, unknown> };

		expect(out.provider.authorization).toBe(REDACTED);
		// The scan reached into the nested object rather than only the top level.
		expect(out.provider.name).toBe("acme");
	});

	test("returns undefined for undefined rather than throwing", () => {
		// JSON.parse(JSON.stringify(undefined)) throws; the guard is the contract.
		expect(redactJsonValue(undefined)).toBeUndefined();
	});
});

describe("redactUrl", () => {
	test("strips userinfo from a nested-scheme URL", () => {
		// Recursion: the nested regex needs `outer:inner://…`, so a single-scheme
		// URL like `scheme://user:pass@host` never reaches it and cannot prove
		// recursion. `view-source:` keeps the prefix while the inner URL is cleaned.
		expect(redactUrl("view-source:https://user:pass@host?token=secret")).toBe(
			`view-source:https://host/?token=${encodeURIComponent(REDACTED)}`,
		);
	});

	test("redacts a secret-looking query param and keeps a harmless one byte-identical", () => {
		// Both directions in one test on purpose: over-redaction and
		// under-redaction are opposite failures, and a one-way assertion only
		// catches one of them.
		const out = redactUrl("https://host/path?token=secret&page=2");

		expect(out).toContain(`token=${encodeURIComponent(REDACTED)}`);
		expect(out).toContain("page=2");
	});

	test("returns a non-URL string untouched", () => {
		expect(redactUrl("just some text")).toBe("just some text");
	});
});
