import { describe, expect, it } from "bun:test";
import type { ExtensionUIContext } from "@oh-my-pi/pi-coding-agent/extensibility/extensions";
import { noOpUIContext } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { createNoOpUIContext } from "@oh-my-pi/pi-coding-agent/extensibility/utils";
import { createAcpExtensionUiContext } from "@oh-my-pi/pi-coding-agent/modes/acp/acp-agent";
import { unavailableFrameMessage } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/unavailable-ui";
import type { AgentSideConnection, ClientCapabilities } from "@oh-my-pi/pi-utils/acp";
import type { HookUIContext } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/types";

/**
 * A frameless error must not recommend a guard the caller would pass.
 *
 * `unavailableFrameMessage` used to end every message with "Guard the call with
 * pi.ui.hasUI", for every caller. That is a correct instruction at `noOpUIContext`,
 * whose `hasUI` is a constant `false`, and an actively harmful one at ACP, where
 * `hasUI` is `supportsForm` and is `true` for any client that supports
 * `elicitation.form`. There the author runs the guard, is let through, and meets the
 * throw it was supposed to prevent — which is the failure this file exists to detect.
 *
 * So the contract is checked against the real contexts rather than against the
 * builder's own arguments: a caller passes the branch it wants, and this test reads
 * `hasUI` off the resulting context and compares. Deriving the expectation from
 * runtime state is what makes it able to fail when a call site picks the wrong
 * branch — a test that asserted the builder's output matched the branch it was
 * handed would pass on every one of them.
 */
const FORM_CAPABILITIES: ClientCapabilities = { elicitation: { form: {} } };

/** `setHeader` throws before it touches the connection, so an empty cast cannot mask anything. */
const UNUSED_CONNECTION = {} as AgentSideConnection;

function acpContext(capabilities: ClientCapabilities | undefined): ExtensionUIContext {
	return createAcpExtensionUiContext(UNUSED_CONNECTION, () => "session", capabilities);
}

/** Runs the real call and returns the message an extension author would actually read. */
function setHeaderMessage(context: ExtensionUIContext): string {
	try {
		context.setHeader(undefined, { key: "banner" });
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("setHeader was expected to throw on a frameless context");
}

/**
 * The custom-tool context is a `HookUIContext`, a strictly smaller surface than the
 * extension one — it has no `setHeader` at all, so `custom` is the call that throws
 * there. Calling the wrong member would fail on a missing method rather than on the
 * advice, which is exactly how a test ends up green for the wrong reason.
 */
function customMessage(context: HookUIContext): string {
	try {
		// The factory throws a *different* error on purpose: this context refuses
		// before it ever reaches the author's component. If the advice ever changes
		// to suggest a path that mounts here, this surfaces as that other message
		// rather than as a silently-passing assertion.
		context.custom<never>(() => {
			throw new Error("the frameless path must not reach the component factory");
		});
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("custom was expected to throw on a frameless context");
}

const NAMES_THE_GUARD = "Guard the call with pi.ui.hasUI";

describe("frameless advice matches what the calling context's hasUI actually does", () => {
	it("names the hasUI guard where hasUI is false, because there the guard works", () => {
		expect(noOpUIContext.hasUI).toBe(false);

		expect(setHeaderMessage(noOpUIContext)).toContain(NAMES_THE_GUARD);
	});

	it("names the hasUI guard on the custom-tool context, where hasUI is absent", () => {
		// This context is a `HookUIContext`: it declares no `hasUI` at all, so the
		// property reads `undefined`. Absent is not the same as declared `false`, but
		// both are falsy, so `if (pi.ui.hasUI)` skips the throwing call either way and
		// the advice still behaves as written.
		const context = createNoOpUIContext();

		expect("hasUI" in context).toBe(false);
		expect(customMessage(context)).toContain(NAMES_THE_GUARD);
	});

	it("refuses to name the guard at ACP, where hasUI is true and the call still throws", () => {
		const context = acpContext(FORM_CAPABILITIES);

		// The regression in one assertion: a client that supports `elicitation.form`
		// reports `hasUI: true`, so an author following the old message guards, is
		// admitted, and throws.
		expect(context.hasUI).toBe(true);
		expect(setHeaderMessage(context)).not.toContain(NAMES_THE_GUARD);
	});

	it("says at ACP which surfaces does work, instead of one that is a no-op there", () => {
		const message = setHeaderMessage(acpContext(FORM_CAPABILITIES));

		// `setStatus` is `() => {}` on this context. Keeping it in the sentence would
		// trade a thrown error for the silent absence the frameless message was
		// written to end.
		expect(message).toContain("pi.ui.setStatus is a no-op");
		// The dialogs are what `hasUI` really does describe, so they are the only
		// reachable alternative offered.
		expect(message).toContain("pi.ui.select");
	});

	it("keeps the ACP guard claim true whether or not the client supports forms", () => {
		// One message serves the whole ACP class, so the branch cannot be chosen per
		// instance. It claims the flag *can* be true rather than that it *is* — which
		// is the only phrasing that stays accurate for a client with no form support,
		// where `hasUI` is in fact `false` and the old guard would have worked.
		const withoutForms = acpContext(undefined);
		expect(withoutForms.hasUI).toBe(false);

		const message = setHeaderMessage(withoutForms);
		expect(message).not.toContain(NAMES_THE_GUARD);
		expect(message).toContain("does not describe this surface");
	});

	it("names the surface that failed, on every branch", () => {
		for (const context of [noOpUIContext, acpContext(FORM_CAPABILITIES)]) {
			expect(setHeaderMessage(context)).toContain("setHeader is not available");
		}
	});
});

/**
 * Every surface the message builder accepts, written out rather than derived.
 *
 * Deriving the list from `FramelessSurface` would check the type against itself: a surface
 * added to the union would widen the list and stay unchecked, which is the failure this
 * describes. Spelling it out means a new surface has to be added here to be covered.
 */
const FRAMELESS_SURFACES = [
	"setHeader",
	"setFooter",
	"custom",
	"setWidget",
	"setEditorComponent",
	"setEditorText",
	"setTitle",
	"setWorkingMessage",
	"setWorkingIndicator",
	"setToolsExpanded",
] as const;

/** The three literals `canMount(surface: "header" | "footer" | "custom")` accepts. */
const CAN_MOUNT_LITERALS = ["header", "footer", "custom"] as const;

const GUARDS = ["hasUI-blocks-the-call", "hasUI-does-not-block-the-call"] as const;

describe("the frameless advice names a canMount the caller can actually pass", () => {
	it("passes canMount only literals its signature accepts, for every surface and both guards", () => {
		// The advice is the discovery path for these surfaces — the bead that opened this
		// work rests on the error message being what an author reads when `canMount` cannot
		// tell them in advance. So an instruction naming a call that does not typecheck is
		// not a cosmetic slip: it is the seam handing over something unusable, while looking
		// like a handoff to someone who has the answer.
		const violations: string[] = [];

		for (const surface of FRAMELESS_SURFACES) {
			for (const guard of GUARDS) {
				const message = unavailableFrameMessage(surface, "ACP mode", guard);
				for (const [, argument] of message.matchAll(/canMount\("([^"]+)"\)/g)) {
					if (!(CAN_MOUNT_LITERALS as readonly string[]).includes(argument)) {
						violations.push(`${surface} [${guard}] -> canMount("${argument}")`);
					}
				}
			}
		}

		expect(violations).toEqual([]);
	});

	it("says the check does not cover the surface, rather than naming one that would not build", () => {
		// `setWidget` is excluded from `canMount` because its answer depends on the content.
		// The honest sentence is that the check does not take it — not a call that fails to
		// compile, which would send the author looking for a bug in their own extension.
		const message = unavailableFrameMessage("setWidget", "ACP mode", "hasUI-does-not-block-the-call");

		expect(message).not.toContain("canMount(");
		expect(message).toContain("pi.ui.canMount does not take this one either");
		// The surface is still named, and a route that works in ACP is still offered.
		expect(message).toContain("setWidget is not available");
		expect(message).toContain("pi.ui.select");
	});
});
