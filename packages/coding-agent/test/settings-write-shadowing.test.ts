import { describe, expect, it } from "bun:test";
import { globalLayerValue, writeGlobalSetting } from "@oh-my-pi/pi-coding-agent/config/shadowing";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { cfgMemoryBackend } from "@oh-my-pi/pi-coding-agent/memory-backend/settings";
import { cfgProvidersMaxInFlightRequests } from "@oh-my-pi/pi-coding-agent/session/settings";

/**
 * What a write to the global config layer actually did.
 *
 * A layer above global — an environment variable, a `--config` overlay, a project
 * settings file, a runtime override — supplies the effective value, so a value
 * saved to `config.yml` can be written, reported as saved, and never take effect.
 * The user sees their edit in the file and not in the behaviour, which is the
 * failure this seam exists to make either visible or impossible.
 *
 * The latch is "post-write" on purpose: asking who wins *before* the write misses
 * a normalization pass that changes the value on the way in, so the answer is read
 * back after. The write is remembered first so it can be put back.
 *
 * The rollback half was already in the settings panel, and **nothing tested it**:
 * deleting the undo outright left every suite green and unchanged. It is a
 * contract that was met and undefended, which is the state that regresses
 * silently at the next refactor. The rows below are that defence.
 *
 * Both surfaces go through this one function, and they **disagree on purpose**:
 * the panel reverts (someone editing live means the edit they are making now)
 * while `omp config set` keeps (someone writing `config.yml` from a shell may be
 * configuring a checkout where the shadowing layer does not exist). The rows pin
 * both answers *and* the fact that the disagreement is only about the fate of the
 * write — the detection and the wording are shared, so the two cannot describe
 * different reasons for a value not being in force.
 */

const KEY = "memory.backend";
const LIMITS_KEY = "providers.maxInFlightRequests";

/** A scope where the named value is pinned by a layer above global. */
function shadowedBy(winner: string): Settings {
	return Settings.isolated({ [KEY]: winner });
}

describe("a write the user cannot see take effect", () => {
	it("is put back, so config.yml does not keep a value that does nothing", () => {
		// The contract that had no defence. `revert` is the panel's policy, and its
		// whole point is that the file on disk and the behaviour agree: a saved
		// value that is not the effective one is the state a user cannot diagnose,
		// because nothing errors and nothing warns — the edit is simply inert.
		const scope = shadowedBy("hindsight");

		const outcome = writeGlobalSetting(cfgMemoryBackend, scope, "local", "revert");

		expect(outcome.status).toBe("shadowed");
		expect(globalLayerValue(cfgMemoryBackend, scope)).toBeUndefined();
	});

	it("names the layer that won, and says what it takes to make the value apply", () => {
		// "It did not work" is not actionable. The user has to be told which layer
		// is supplying the value, because editing `config.yml` again will not help
		// and they need to know where to go instead.
		const scope = shadowedBy("mnemopi");

		const outcome = writeGlobalSetting(cfgMemoryBackend, scope, "local", "revert");

		expect(outcome.status).toBe("shadowed");
		if (outcome.status !== "shadowed") throw new Error("expected a shadowed write");
		expect(outcome.source).toBe("runtime");
		expect(outcome.message).toBe("A runtime override supplies the effective value for this process.");
	});

	it("restores the value that was there, rather than clearing the key", () => {
		// The restore is `set(previous)`, not `unset`. A user who had `local` set and
		// then tried `hindsight` while an override was pinning the field must find
		// `local` still there afterwards — unsetting it would silently promote the
		// default and turn a failed edit into a different successful one.
		const scope = shadowedBy("sharpshooter");
		cfgMemoryBackend.set(scope, "local");

		const outcome = writeGlobalSetting(cfgMemoryBackend, scope, "mnemopi", "revert");

		expect(outcome.status).toBe("shadowed");
		expect(globalLayerValue(cfgMemoryBackend, scope)).toBe("local");
	});

	it("reports what it did to the write, not just that something shadowed it", () => {
		// `status` says a higher layer won; `written` says whether the saved value
		// survived. Collapsing them into one field is what would let a surface
		// announce a rollback that never happened — the failure mode this refactor
		// exists to prevent now that two surfaces with different policies share it.
		const scope = shadowedBy("hindsight");

		const reverted = writeGlobalSetting(cfgMemoryBackend, scope, "local", "revert");
		const kept = writeGlobalSetting(cfgMemoryBackend, shadowedBy("hindsight"), "local", "keep");

		expect(reverted.status === "shadowed" && reverted.written).toBe("reverted");
		expect(kept.status === "shadowed" && kept.written).toBe("kept");
	});

	it("keeps the value on disk under the policy that keeps it", () => {
		// `omp config set`'s half. The write stands and the shadowing is reported,
		// because the person at the shell may be configuring a different checkout
		// where the overriding layer does not exist — discarding their edit would
		// destroy something they meant to keep. This is the row that would go red if
		// someone "fixed" the CLI to revert as well.
		const scope = shadowedBy("hindsight");

		const outcome = writeGlobalSetting(cfgMemoryBackend, scope, "local", "keep");

		expect(outcome.status).toBe("shadowed");
		expect(globalLayerValue(cfgMemoryBackend, scope)).toBe("local");
	});

	it("carries the same machine-readable reason on both policies", () => {
		// `--json` is a wire contract, and its shape must not depend on which
		// surface produced it: a consumer reading `overriddenBy` would silently see
		// `{}` from one caller and the real layer from the other. The two policies
		// differ in the fate of the write and in nothing else.
		const reverted = writeGlobalSetting(cfgMemoryBackend, shadowedBy("hindsight"), "local", "revert");
		const kept = writeGlobalSetting(cfgMemoryBackend, shadowedBy("hindsight"), "local", "keep");

		expect(reverted.status === "shadowed" && reverted.json).toEqual({ overriddenBy: "runtime" });
		expect(kept.status === "shadowed" && kept.json).toEqual({ overriddenBy: "runtime" });
	});
});

describe("a write that does take effect", () => {
	it("is left alone — no rollback runs and no shadow is reported", () => {
		// The direction that must not regress. If `revert` ever ran unconditionally,
		// every ordinary settings edit in the panel would undo itself, and the
		// failure would look like "the panel does not save".
		const scope = Settings.isolated();

		const outcome = writeGlobalSetting(cfgMemoryBackend, scope, "mnemopi", "revert");

		expect(outcome.status).toBe("applied");
		expect(globalLayerValue(cfgMemoryBackend, scope)).toBe("mnemopi");
		expect(cfgMemoryBackend.get(scope)).toBe("mnemopi");
	});

	it("is not treated as shadowed when the overriding layer holds the same value", () => {
		// Writing the value that is already in force is not a shadowed write, even
		// though a higher layer is configured — the outcome is identical either way.
		// Reverting here would delete a saved value the user deliberately set, on the
		// grounds that some other layer happens to agree with it.
		const scope = shadowedBy("local");

		const outcome = writeGlobalSetting(cfgMemoryBackend, scope, "local", "revert");

		expect(outcome.status).toBe("applied");
		expect(globalLayerValue(cfgMemoryBackend, scope)).toBe("local");
	});

	it("stays put when the overriding layer is consulted and agrees", () => {
		// The same agreement seen from the other side: the value is in force, so
		// whatever supplies it is not holding anything back, and the saved copy is
		// a faithful record of the configuration rather than a dead entry.
		const scope = shadowedBy("mnemopi");

		writeGlobalSetting(cfgMemoryBackend, scope, "mnemopi", "revert");
		const again = writeGlobalSetting(cfgMemoryBackend, scope, "off", "keep");

		expect(again.status).toBe("shadowed");
		expect(cfgMemoryBackend.get(scope)).toBe("mnemopi");
	});

	it("is not treated as shadowed when the value only normalizes to what the override holds", () => {
		// **Why the latch is post-write.** A definition may normalize on the way in
		// — this one floors per-provider limits to whole numbers, so `4.7` lands as
		// `4`. Asking who won *before* normalizing compares `4.7` against an override
		// holding `4`, calls it shadowed, and reverts an edit that in fact took
		// effect: the user's `4.7` disappears and nothing says why. Reading the
		// value back after normalization is the whole reason the check happens here
		// rather than one line earlier.
		const scope = Settings.isolated({ [LIMITS_KEY]: { anthropic: 4 } });

		const outcome = writeGlobalSetting(cfgProvidersMaxInFlightRequests, scope, { anthropic: 4.7 }, "revert");

		expect(outcome.status).toBe("applied");
		expect(globalLayerValue(cfgProvidersMaxInFlightRequests, scope)).toEqual({ anthropic: 4 });
	});
});
