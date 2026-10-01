import { beforeAll, describe, expect, it } from "bun:test";
import { COMPOSER_DEFAULTS, Composer } from "@oh-my-pi/pi-tui/prompt/composer";
import { TranscriptContainer } from "@oh-my-pi/pi-tui/chrome/transcript-container";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import { Text } from "@oh-my-pi/pi-tui";
import { VirtualTerminal } from "./virtual-terminal";

const HEADER_MARKER = "ext-header-band";
const FOOTER_MARKER = "ext-footer-band";

function frameText(composer: Composer): string {
	// Strip per row, THEN join. `Bun.stripANSI` applied to the joined string drops
	// the final row whenever an earlier row ends mid-escape — measured here: the
	// viewport held five rows and the joined strip returned four, losing exactly
	// the band this file exists to check. Stripping row-wise keeps all five.
	return composer
		.renderFrame({ columns: 80, rows: 24 })
		.viewport.map(row => Bun.stripANSI(row))
		.join("\n");
}

describe("composer extension header/footer slots", () => {
	beforeAll(() => {
		initTheme();
	});

	it("renders both bands in the frame and keeps them across a header rebuild", () => {
		const composer = new Composer({
			terminal: new VirtualTerminal(80, 24),
			preferences: { ...COMPOSER_DEFAULTS, quiet: true },
		});
		composer.start();
		try {
			composer.extensionHeader.addChild(new Text(HEADER_MARKER, 0, 0));
			composer.extensionFooter.addChild(new Text(FOOTER_MARKER, 0, 0));
			expect(frameText(composer)).toContain(HEADER_MARKER);
			expect(frameText(composer)).toContain(FOOTER_MARKER);

			// The regression this placement exists to prevent. `#rebuildHeader` runs
			// `clear()` and re-does the header on every model change, resize and
			// quiet-mode toggle; anything attached straight to `#header` is silently
			// dropped there, so an extension header would disappear on the next
			// rebuild with no error anywhere. `setHeaderExtras` is the public door
			// into that rebuild, which makes it the cheapest way to prove the slots
			// are not its victims.
			composer.setHeaderExtras([new Text("extras-before", 0, 0)], [new Text("extras-after", 0, 0)]);
			expect(frameText(composer)).toContain("extras-before");
			expect(frameText(composer)).toContain("extras-after");
			expect(frameText(composer)).toContain(HEADER_MARKER);
			expect(frameText(composer)).toContain(FOOTER_MARKER);
		} finally {
			composer.stop();
		}
	});

	it("keeps both bands rendering once the runtime dock replaces the bootstrap editor", () => {
		const composer = new Composer({
			terminal: new VirtualTerminal(80, 24),
			preferences: { ...COMPOSER_DEFAULTS, quiet: true },
		});
		composer.start();
		try {
			composer.extensionHeader.addChild(new Text(HEADER_MARKER, 0, 0));
			composer.extensionFooter.addChild(new Text(FOOTER_MARKER, 0, 0));
			const transcript = new TranscriptContainer();
			transcript.addChild(new Text("transcript-body", 0, 0));
			composer.setRuntimeChildren([transcript]);

			// The header stays above the dock and the footer stays at the bottom
			// edge, which is the whole reason the footer is re-seated with the status
			// host rather than left where `start()` mounted it.
			const frame = frameText(composer);
			expect(frame).toContain("transcript-body");
			expect(frame).toContain(HEADER_MARKER);
			expect(frame).toContain(FOOTER_MARKER);
			expect(frame.indexOf(HEADER_MARKER)).toBeLessThan(frame.indexOf("transcript-body"));
			expect(frame.indexOf("transcript-body")).toBeLessThan(frame.indexOf(FOOTER_MARKER));
		} finally {
			composer.stop();
		}
	});
});
