/**
 * Every stream-timeout message the providers emit must classify as retryable.
 *
 * The coupling being pinned here has no error code to hold it: `isProviderRetryableError`
 * matches on message TEXT (through `TRANSIENT_TRANSPORT_PATTERN` in `error/flags.ts`,
 * which carries `timed? out|timeout|stream stall`). Measured both ways:
 *
 *   "Anthropic stream timed out while waiting for the first event"  → retryable
 *   "Anthropic stream while waiting for the first event"            → NOT retryable
 *
 * Same sentence, only the timeout wording removed. So rewording a message for readability —
 * "did not respond within 30s" — silently turns a stall worth replaying into a terminal
 * failure, with nothing in the log to say why.
 *
 * The previous coverage quoted exactly one provider's string literally
 * (`anthropic-retry.test.ts`). Ten others were correct but unanchored: nothing failed when
 * their wording changed. That is why each message below is IMPORTED from the module that
 * emits it rather than typed here. Re-typing them would recreate the gap this file closes —
 * the copy would still say the old thing while the producer said the new thing.
 */
import { describe, expect, it } from "bun:test";
import { isProviderRetryableError } from "@oh-my-pi/pi-ai/error";
import { ANTHROPIC_FIRST_EVENT_TIMEOUT_MESSAGE, ANTHROPIC_STREAM_IDLE_TIMEOUT_MESSAGE } from "@oh-my-pi/pi-ai/providers/anthropic";
import { FIRST_EVENT_TIMEOUT_ERROR as GEMINI_FIRST_EVENT_TIMEOUT_ERROR } from "@oh-my-pi/pi-ai/providers/google-gemini-cli";
import { OPENAI_CODEX_FIRST_EVENT_TIMEOUT_MESSAGE, OPENAI_CODEX_STREAM_IDLE_TIMEOUT_MESSAGE } from "@oh-my-pi/pi-ai/providers/openai-codex-responses";
import {
	OPENAI_COMPLETIONS_FIRST_EVENT_TIMEOUT_MESSAGE,
	OPENAI_COMPLETIONS_STREAM_IDLE_TIMEOUT_MESSAGE,
} from "@oh-my-pi/pi-ai/providers/openai-completions";
import {
	OPENAI_RESPONSES_FIRST_EVENT_TIMEOUT_MESSAGE,
	OPENAI_RESPONSES_STREAM_IDLE_TIMEOUT_MESSAGE,
} from "@oh-my-pi/pi-ai/providers/openai-responses";
import {
	PI_NATIVE_STREAM_FIRST_EVENT_TIMEOUT_ERROR,
	PI_NATIVE_STREAM_IDLE_TIMEOUT_ERROR,
} from "@oh-my-pi/pi-ai/providers/pi-native-client";

const TIMEOUT_MESSAGES: { provider: string; message: string }[] = [
	{ provider: "anthropic", message: ANTHROPIC_FIRST_EVENT_TIMEOUT_MESSAGE },
	{ provider: "anthropic", message: ANTHROPIC_STREAM_IDLE_TIMEOUT_MESSAGE },
	{ provider: "openai-responses", message: OPENAI_RESPONSES_FIRST_EVENT_TIMEOUT_MESSAGE },
	{ provider: "openai-responses", message: OPENAI_RESPONSES_STREAM_IDLE_TIMEOUT_MESSAGE },
	{ provider: "openai-completions", message: OPENAI_COMPLETIONS_FIRST_EVENT_TIMEOUT_MESSAGE },
	{ provider: "openai-completions", message: OPENAI_COMPLETIONS_STREAM_IDLE_TIMEOUT_MESSAGE },
	{ provider: "openai-codex", message: OPENAI_CODEX_FIRST_EVENT_TIMEOUT_MESSAGE },
	{ provider: "openai-codex", message: OPENAI_CODEX_STREAM_IDLE_TIMEOUT_MESSAGE },
	{ provider: "google-gemini-cli", message: GEMINI_FIRST_EVENT_TIMEOUT_ERROR },
	{ provider: "pi-native", message: PI_NATIVE_STREAM_FIRST_EVENT_TIMEOUT_ERROR },
	{ provider: "pi-native", message: PI_NATIVE_STREAM_IDLE_TIMEOUT_ERROR },
];

describe("stream timeout messages are retryable", () => {
	it.each(TIMEOUT_MESSAGES)("$provider: $message", ({ message }) => {
		expect(isProviderRetryableError(new Error(message))).toBe(true);
	});

	it("classifies by the timeout wording, not by the rest of the sentence", () => {
		// The ablation that gives the rows above their meaning: delete only the timeout
		// wording and the same sentence stops being retryable. Without this arm a
		// classifier that ignored messages entirely would pass every row above.
		expect(isProviderRetryableError(new Error(ANTHROPIC_FIRST_EVENT_TIMEOUT_MESSAGE))).toBe(true);
		expect(
			isProviderRetryableError(
				new Error(ANTHROPIC_FIRST_EVENT_TIMEOUT_MESSAGE.replace("timed out", "waited")),
			),
		).toBe(false);

		expect(isProviderRetryableError(new Error(ANTHROPIC_STREAM_IDLE_TIMEOUT_MESSAGE))).toBe(true);
		expect(
			isProviderRetryableError(new Error(ANTHROPIC_STREAM_IDLE_TIMEOUT_MESSAGE.replace("stalled", "waited"))),
		).toBe(false);
	});

	it("keeps a genuinely terminal failure terminal", () => {
		// A universal matcher would satisfy every row above. This is the row that
		// catches it: a rejected request fails identically on replay.
		expect(isProviderRetryableError(new Error("Invalid tool schema"))).toBe(false);
		expect(isProviderRetryableError(new Error("Bad request"))).toBe(false);
	});
});