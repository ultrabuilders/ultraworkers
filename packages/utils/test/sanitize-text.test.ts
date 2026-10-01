import { describe, expect, it } from "bun:test";
import { sanitizeText } from "@oh-my-pi/pi-utils/sanitize-text";

describe("sanitizeText", () => {
	it("strips ANSI CSI and removes C0/C1 control chars while keeping tab + LF", () => {
		const input = "\x1b[31mred\x1b[0m\ra\u0000b\tline\ncarriage\r\u0001\u0085";
		expect(sanitizeText(input)).toBe("redab\tline\ncarriage");
	});

	it("drops lone surrogates and preserves valid surrogate pairs", () => {
		expect(sanitizeText(`a\ud800b\udc00c`)).toBe("abc");
		const validPair = "a\u{1f600}b";
		expect(sanitizeText(validPair)).toBe(validPair);
	});

	it("drops replacement characters on malformed input", () => {
		expect(sanitizeText("a\ud800�b")).toBe("ab");
	});

	it("preserves replacement characters on well-formed input", () => {
		expect(sanitizeText("a�b")).toBe("a�b");
	});

	it("preserves valid surrogate pairs while stripping controls", () => {
		const validPair = "\u{1f600}";
		expect(sanitizeText(`a${validPair}\u0000b`)).toBe(`a${validPair}b`);
	});

	it("strips OSC sequences terminated by BEL", () => {
		expect(sanitizeText("\x1b]0;title\x07hello")).toBe("hello");
	});

	it("strips OSC sequences terminated by ST (ESC \\)", () => {
		expect(sanitizeText("\x1b]8;;https://x\x1b\\link\x1b]8;;\x1b\\!")).toBe("link!");
	});

	it("returns the original string instance when no changes are needed", () => {
		const clean = "plain ascii\twith\ttabs\nand newlines";
		expect(sanitizeText(clean)).toBe(clean);
	});

	it("strips DCS sequences terminated by ST", () => {
		expect(sanitizeText("before\x1bPpayload\x1b\\after")).toBe("beforeafter");
	});

	it("strips DCS sequences terminated by BEL, keeping the text after them", () => {
		// The row above covers the same sequence type with the ST terminator, which is
		// why this gap survived: BEL is the other legal terminator, and it is the one
		// that does not work. `Bun.stripANSI` does not recognise BEL as closing a
		// string-introduced sequence, so it treats everything after it as part of the
		// sequence and deletes it.
		expect(sanitizeText("before\x1bPpayload\x07after")).toBe("beforeafter");
		expect(sanitizeText("before\x1b_payload\x07after")).toBe("beforeafter");
	});

	it("keeps later lines of command output that follows a BEL-terminated DCS", () => {
		// The reachable case, and it is data loss rather than a rendering artefact.
		// `cleanse/checkers.ts` runs `sanitizeText` over a command's stdout/stderr, so
		// any output containing one of these sequences — a binary dump, a terminal
		// replay, an inline-image escape — was silently cut off at that byte. Nothing
		// reported the truncation: the caller received a short string that looked
		// complete, and the model was never told anything was missing.
		const stdout = "line one\nline two\n\x1b_pi:c\x07\nline four\nline five";
		expect(sanitizeText(stdout)).toBe("line one\nline two\n\nline four\nline five");
	});

	it("handles single-byte ESC finals (e.g. ESC c reset)", () => {
		expect(sanitizeText("a\x1bcb")).toBe("ab");
	});

	it("strips DEL and normalizes lone CR", () => {
		expect(sanitizeText("a\x7fb\rc")).toBe("abc");
	});
});
