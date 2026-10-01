import { describe, expect, test } from "bun:test";
import type { RawSettings } from "../../src/config/settings";
import { collectBugReportMetadata } from "../../src/diagnostics/collect";
import { REDACTED } from "../../src/diagnostics/redact";

function settings(raw: Record<string, unknown>) {
	// The collectors only ever call getGlobalSettings() on the scope.
	return { getGlobalSettings: () => raw as RawSettings } as never;
}

const BASE = {
	sessionId: "s1",
	// Mandatory by design: the collector has no default for a disclosure gate.
	includeSession: false,
	cwd: "/Users/someone/private/project",
	includeSummary: false,
	messageCount: 4,
	thinkingLevel: "medium" as never,
	extensions: [],
	extensionErrors: [],
	globalSettings: settings({}),
	projectSettings: settings({}),
};

describe("collectBugReportMetadata", () => {
	// Settings are redacted as a whole, so a setting added later is covered by
	// the redaction rather than by a field list that has to remember it.
	test("redacts credential-shaped settings at both scopes", () => {
		const meta = collectBugReportMetadata({
			...BASE,
			globalSettings: settings({ theme: "dark", myApiKey: "sk-live-XYZ" }),
			projectSettings: settings({ model: "opus", authToken: "t-123" }),
		});
		const global = meta.settings.global as Record<string, unknown>;
		const project = meta.settings.project as Record<string, unknown>;

		expect(global.myApiKey).toBe(REDACTED);
		expect(project.authToken).toBe(REDACTED);
		// The redaction must not empty the bundle — non-secret settings survive.
		expect(global.theme).toBe("dark");
		expect(project.model).toBe("opus");
	});

	// The cwd is a real disclosure of where the user works. It ships only with
	// the transcript, which is why `included` alone must never be the gate.
	test("omits cwd unless the transcript is going in", () => {
		const without = collectBugReportMetadata({ ...BASE, includeSession: false });
		expect(without.session.cwd).toBeUndefined();
		expect(without.session.included).toBe(false);

		const withTranscript = collectBugReportMetadata({ ...BASE, includeSession: true });
		expect(withTranscript.session.cwd).toBe("/Users/someone/private/project");
	});

	test("reports the environment without leaking env var values", () => {
		const meta = collectBugReportMetadata(BASE);
		const env = meta.environment as { userAgent: string; ompEnvironmentVariables: string[] };
		expect(env.userAgent).toStartWith("omp/");
		expect(Array.isArray(env.ompEnvironmentVariables)).toBe(true);
	});

	test("strips the identity fields settings carry", () => {
		const meta = collectBugReportMetadata({
			...BASE,
			globalSettings: settings({ trackingId: "abc", deviceId: "def", theme: "dark" }),
		});
		const global = meta.settings.global as Record<string, unknown>;
		expect(global.trackingId).toBeUndefined();
		expect(global.deviceId).toBeUndefined();
	});
});
