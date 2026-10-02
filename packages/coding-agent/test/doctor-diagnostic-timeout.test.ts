/**
 * A diagnostic that never settles must not hold `ultraworkers plugin doctor` open.
 *
 * `PluginManager.doctor()` runs each extension-contributed check under a timeout,
 * because a diagnostic is third-party code on a path that still has to print the
 * built-in findings. Two things have to be true of that timeout, and they are
 * independent failures:
 *
 * 1. The expiry has to REACH the user. The `catch` arm turns it into an error check
 *    naming the reason, which is the difference between "this extension is broken"
 *    and a check that silently never appears.
 * 2. The expiry has to be CANCELLED once decided. `Promise.race` settles the moment
 *    `run()` does, but an uncleared timer still holds the event loop for the rest
 *    of its window — so doctor prints a complete, correct report and then stands
 *    there for five seconds before the process can exit.
 *
 * These live in one file because they are one behaviour, and they were both absent:
 * the neighbouring suite ran its twelve rows in ~1.1s, which is only possible if no
 * row ever let a check hang. The timeout arm had therefore never executed.
 */
import { afterEach, describe, expect, spyOn, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { clearDiagnostics } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/diagnostics";
import type { Extension, ExtensionAPI } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { PluginManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/manager";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "omp-doctor-timeout-"));

afterEach(async () => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	clearDiagnostics();
	await fs.rm(scratch, { recursive: true, force: true });
});

/** Load a real extension through the real loader, as the other doctor rows do. */
async function loadWith(name: string, body: (api: ExtensionAPI, extension: Extension) => void): Promise<void> {
	const extensionPath = path.join(scratch, name);
	await fs.mkdir(extensionPath, { recursive: true });
	const factory = (api: ExtensionAPI): Promise<void> => {
		body(api, api as unknown as Extension);
		return Promise.resolve();
	};
	await loadExtensionFromFactory(factory as never, extensionPath, new EventBus(), new ExtensionRuntime(), name);
}

interface DoctorCheck {
	name: string;
	status: string;
	message: string;
}

async function runDoctor(): Promise<DoctorCheck[]> {
	return new PluginManager().doctor();
}

describe("a doctor check that never settles", () => {
	test("is reported as an error naming the timeout, not left out of the report", async () => {
		// A check that vanishes teaches the user to read absence as health. It has
		// to arrive, carrying the reason it could not be answered.
		await loadWith("hangs", api => {
			api.registerDiagnostic({
				id: "hangs",
				label: "hangs",
				run: () => new Promise<never>(() => {}),
			});
		});

		// This row waits out the real five seconds, and that is deliberate.
		//
		// A fake clock looks like the obvious economy here and is a trap: freezing
		// the timers also freezes whatever `doctor()` awaits on its way to the
		// diagnostic loop, so the call never reaches the `race` at all and the test
		// deadlocks rather than failing. Measured, not assumed.
		//
		// Wall-clock cannot substitute here either, and it fails in OPPOSITE
		// directions depending on the row, which is why the two need different
		// instruments. This row: `doctor()` returns at ~5s whether or not the timer
		// is cleared, because the timer has to fire to reject the race — so an
		// `expect(elapsed).toBeLessThan(1000)` would be RED against correct code.
		// The leak row, whose check settles at once, is the mirror image: it returns
		// in milliseconds either way, so the same assertion would be GREEN against
		// broken code. A single timing rule cannot cover both; see the second row.
		const checks = await runDoctor();

		const check = checks.find(entry => entry.name === "extension:hangs");
		expect(check?.status).toBe("error");
		expect(check?.message).toContain("timed out");
		// The budget has to clear `DIAGNOSTIC_TIMEOUT_MS`, which is 5s — exactly the
		// harness default. Without an explicit one this row times out at the same
		// instant the check under test does, so it can only ever fail.
	}, 15_000);

	test("leaves no timer behind, so the command can exit as soon as it has printed", async () => {
		// The leak is invisible in the returned value: the report is byte-identical
		// whether the timer is cleared or not. What differs is whether the process
		// can exit. So this observes the timer itself — the one thing a consumer
		// (the event loop) actually depends on.
		//
		// Scoped to the timers this call arms, via handle identity rather than a
		// delay constant, so a future refactor that renames or retunes the window
		// does not quietly turn this into a test that checks nothing.
		await loadWith("settles", api => {
			api.registerDiagnostic({
				id: "settles",
				label: "settles",
				run: () => Promise.resolve({ status: "ok", message: "fine" }),
			});
		});

		const armed: unknown[] = [];
		const cleared = new Set<unknown>();
		const originalSetTimeout = globalThis.setTimeout;
		const originalClearTimeout = globalThis.clearTimeout;
		const record = spyOn(globalThis, "setTimeout");
		record.mockImplementation(((...args: Parameters<typeof setTimeout>) => {
			const handle = Reflect.apply(originalSetTimeout, globalThis, args);
			armed.push(handle);
			return handle;
		}) as never);
		const release = spyOn(globalThis, "clearTimeout");
		release.mockImplementation(((handle?: Parameters<typeof clearTimeout>[0]) => {
			cleared.add(handle);
			Reflect.apply(originalClearTimeout, globalThis, [handle] as never);
		}) as never);

		try {
			const checks = await runDoctor();
			expect(checks.some(entry => entry.name === "extension:settles")).toBe(true);
		} finally {
			record.mockRestore();
			release.mockRestore();
		}

		// Every timer this call armed has been handed back. An uncleared one is a
		// live handle pinning the loop, which is the five-second stall.
		expect(armed.filter(handle => !cleared.has(handle))).toEqual([]);
	});
});
