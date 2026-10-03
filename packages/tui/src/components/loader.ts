import type { ExtensionTUISurface } from "../tui";
import type { TspProps } from "@oh-my-pi/pi-wire";
import { elapsed, kbd, keyed, node, row, span, text } from "../native/describe";
import { plainText } from "../native/spans";
import type { DescribeContext, NativeChild, NativeNode, NativeUiEvent } from "../native/node";
import { isNativeRendering } from "../native/state";
import { describeShimmer, type ShimmerPalette, shimmerEnabled } from "../theme/shimmer";
import { getPaddingX, padding, sliceByColumn, visibleWidth } from "../utils";
import { Text } from "./text";

const DEFAULT_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const RENDER_INTERVAL_MS = 1000 / 30;
/** Milliseconds between spinner-frame advances; exported so time-derived spinners elsewhere tick at the Loader cadence. */
export const SPINNER_ADVANCE_MS = 80;
const RENDER_BACKPRESSURE_MULTIPLIER = 9;
const MAX_BACKPRESSURE_FRAME_COST_MS = 200;

/** Native repaint cadence of a retry countdown ring (the terminal eases the ring between frames). */
const RETRY_METER_REPAINT_MS = 500;

/** A working-row variant (§6.5): a retry countdown, or context compaction. */
export type WorkingRowVariant =
	| {
			readonly kind: "retry";
			readonly attempt: number;
			readonly max: number;
			/** The wait before the attempt, in ms, counted from the row's `startedAt`. */
			readonly delayMs: number;
	  }
	| { readonly kind: "compaction" };

/** What the dock's working row (§8.1, role `ultraworkers.working`) shows. */
export interface WorkingRowSpec {
	/** The intent, or the variant's label ("Retrying · attempt 1 of 3", "Compacting context…"). */
	readonly label: string;
	/** Epoch ms the work started: the `elapsed` origin and the retry countdown start. */
	readonly startedAt: number;
	readonly variant?: WorkingRowVariant;
	/** Shimmer palette of the label (a session-accented intent). */
	readonly palette?: ShimmerPalette;
	/** Live tok/s, docked before the stop control. */
	readonly rate?: number;
	/**
	 * Frame interval for the spinner, in milliseconds. Defaults to the product's
	 * own cadence. A slow terminal wants a slower spinner, and until this existed
	 * the only way to change it was to edit the theme's frames.
	 */
	readonly intervalMs?: number;
	/** Key id that interrupts (`escape`); undefined hides the stop control (Esc would not cancel). */
	readonly interruptKey?: string;
}

/** A key id as tooltip keys: `escape` reads `esc`, the rest as bound. */
function titleKey(key: string): string {
	return key === "escape" ? "esc" : key;
}

/**
 * The dock's working row: `starburst` spinner (or a retry countdown ring),
 * the intent shimmering, `·`, the elapsed time, a grow spacer, then the stop
 * control whose click sends `interrupt`. Compaction adds an indeterminate
 * `progress` before the stop control; a retry says "Cancel".
 */
export function describeWorkingRow(spec: WorkingRowSpec, cx: DescribeContext, now = Date.now()): NativeNode {
	const variant = spec.variant;
	const children: NativeChild[] = [];
	if (variant?.kind === "retry" && cx.supports("meter")) {
		const remaining = Math.max(0, variant.delayMs - (now - spec.startedAt));
		const value = variant.delayMs > 0 ? Math.round((remaining / variant.delayMs) * 100) / 100 : 0;
		children.push(node("meter", { value, style: "ring", size: "sm" }, undefined, "countdown"));
	} else {
		children.push(node("spinner", { style: "starburst", tone: "accent" }, undefined, "spinner"));
	}
	const label = describeShimmer([{ text: spec.label, palette: spec.palette }], "label");
	children.push(
		node(label.k, { ...label.p, role: "ultraworkers.working.label" } as TspProps, label.c, label.key),
		node("text", { text: "·", role: "ultraworkers.working.sep" }, undefined, "sep"),
		keyed(elapsed(now - spec.startedAt), "elapsed"),
		node("row", { grow: 1 }, undefined, "fill"),
	);
	if (variant?.kind === "compaction") children.push(node("progress", { value: null }, undefined, "progress"));
	if (spec.rate !== undefined) children.push(node("rate", { value: spec.rate, unit: "tok/s" }, undefined, "rate"));
	if (spec.interruptKey !== undefined) {
		const verb = variant?.kind === "retry" ? "Cancel" : "Stop";
		children.push(
			node(
				"row",
				{
					role: "ultraworkers.working.stop",
					gap: "xs",
					align: "center",
					title: `${verb}  ${titleKey(spec.interruptKey)}`,
					actions: { click: "interrupt" },
				},
				[kbd(titleKey(spec.interruptKey)), text(verb)],
				"stop",
			),
		);
	}
	return row(children, { role: "ultraworkers.working", align: "center", gap: "sm" });
}

type ColorFn = (str: string) => string;

/**
 * Styles Loader message fragments without changing their visible text or width.
 * Set `animated` for colorizers whose ANSI output changes over time.
 */
export type LoaderMessageColorFn = ColorFn & {
	readonly animated?: true;
};

/** Animates a spinner and colorized message while asynchronous work is pending. */
export class Loader extends Text {
	#frames = DEFAULT_SPINNER_FRAMES;
	#currentFrame = 0;
	/** Frames given at construction, kept so a later replace can preserve them. */
	#constructorFrames: readonly string[] = DEFAULT_SPINNER_FRAMES;
	#intervalId?: NodeJS.Timeout;
	/** Caller-supplied cadence, or the product default when unset. */
	#intervalMs?: number;
	#ui: ExtensionTUISurface | null = null;
	#lastSpinnerTick = 0;
	#layoutSource?: readonly string[];
	#layout?: readonly {
		leading: string;
		message: string;
		trailing: string;
		spinner: boolean;
		separator: string;
		bodyWidth?: number;
	}[];
	#layoutFrames: readonly string[];
	#layoutFrame: string;
	#trailer?: () => string | undefined;
	#native?: { message: string; trailer: string; shimmer: boolean; node: NativeNode };
	#working?: { spec: () => WorkingRowSpec; interrupt: () => void };
	#workingNative?: { key: string; node: NativeNode };
	#nativeTimer?: NodeJS.Timeout;

	constructor(
		ui: ExtensionTUISurface,
		private spinnerColorFn: ColorFn,
		private messageColorFn: LoaderMessageColorFn,
		private message: string | (() => string) = "Loading...",
		spinnerFrames?: string[],
		intervalMs?: number,
	) {
		super("", 1, 0);
		this.#ui = ui;
		this.#intervalMs = intervalMs !== undefined && intervalMs > 0 ? intervalMs : undefined;
		if (spinnerFrames && spinnerFrames.length > 0) {
			this.#frames = spinnerFrames;
		}
		this.#constructorFrames = this.#frames;
		const representatives = new Map<number, string>();
		this.#layoutFrames = this.#frames.map(frame => {
			const width = visibleWidth(frame);
			const representative = representatives.get(width);
			if (representative !== undefined) {
				return representative;
			}
			representatives.set(width, frame);
			return frame;
		});
		this.#layoutFrame = this.#layoutFrames[0];
		this.start();
	}
	/** Return the current message and animation state for debug inspection. */
	override debugState(): Record<string, unknown> {
		const message = this.#resolveMessage();
		return {
			message: message.slice(0, 120),
			messageLength: message.length,
			running: this.#intervalId !== undefined,
			frame: this.#currentFrame,
		};
	}

	override render(width: number): readonly string[] {
		const source = super.render(width);
		if (source !== this.#layoutSource) {
			const paddingX = getPaddingX(1);
			this.#layoutSource = source;
			this.#layout = source.map((line, i) => {
				const clamped = visibleWidth(line) > width ? sliceByColumn(line, 0, width, true) : line;
				const body = clamped.slice(paddingX);
				const content = body.trimEnd();
				const leading = clamped.slice(0, paddingX);
				const spinner = i === 0 && content.startsWith(this.#layoutFrame);
				const remainder = spinner ? content.slice(this.#layoutFrame.length) : content;
				const separator = spinner && remainder.startsWith(" ") ? " " : "";
				const message = remainder.slice(separator.length);
				const plainMessage = i === 0 ? Bun.stripANSI(message) : "";
				// A visible non-whitespace ending makes trimEnd independent of
				// colorizer ANSI placement. The separator isolates spinner width
				// from message graphemes; other cases retain whole-body measuring.
				const stableBodyWidth =
					plainMessage.length > 0 && plainMessage.trimEnd() === plainMessage && (!spinner || separator === " ");
				return {
					leading,
					message,
					trailing: body.slice(content.length),
					spinner,
					separator,
					bodyWidth: stableBodyWidth ? visibleWidth(leading + separator + message) : undefined,
				};
			});
		}

		const frame = this.#frames[this.#currentFrame];
		// The wrapped text carries one stable representative per frame width.
		// Same-width frames swap only the visible glyph here; crossing widths
		// rewraps against the representative selected by #syncText.
		const lines = [""];
		const layout = this.#layout ?? [];
		let coloredSpinner = "";
		for (const { leading, message, trailing, spinner, separator } of layout) {
			if (spinner) {
				coloredSpinner = this.spinnerColorFn(frame);
			}
			lines.push(
				`${leading}${spinner ? coloredSpinner : ""}${separator}${message ? this.messageColorFn(message) : ""}${trailing}`,
			);
		}
		if (this.#trailer && lines.length > 1) {
			const trailer = this.#trailer();
			if (trailer) {
				// Text pads rows to full width; drop that pad before docking right.
				const body = lines[1].trimEnd();
				const bodyWidth =
					layout[0].bodyWidth === undefined
						? visibleWidth(body)
						: layout[0].bodyWidth + visibleWidth(coloredSpinner);
				const gap = width - bodyWidth - visibleWidth(trailer);
				if (gap >= 2) lines[1] = body + padding(gap) + trailer;
			}
		}
		return lines;
	}

	/**
	 * A `spinner` (or the static glyph of a one-frame loader, e.g. an interrupt
	 * key hint) followed by the message, shimmering when the message colorizer
	 * animates, and the right-docked trailer. The terminal clocks the motion.
	 * Function messages are re-read whenever the engine revisits the loader.
	 */
	override describe(cx: DescribeContext): NativeNode {
		if (this.#working) return this.#describeWorking(cx);
		const message = plainText(this.#resolveMessage());
		const trailer = plainText(this.#trailer?.() ?? "");
		const shimmer = this.messageColorFn.animated === true && shimmerEnabled();
		const cached = this.#native;
		if (cached && cached.message === message && cached.trailer === trailer && cached.shimmer === shimmer) {
			return cached.node;
		}
		const indicator =
			this.#frames.length > 1
				? node("spinner", this.#frames === DEFAULT_SPINNER_FRAMES ? { style: "braille" } : {})
				: text([span(plainText(this.#frames[0] ?? "").trim(), "muted")], { wrap: "none" });
		const label = shimmer
			? describeShimmer([{ text: message }], "message")
			: node("text", { spans: [span(message, "muted")] }, undefined, "message");
		const children: NativeChild[] = [row([indicator, label], { gap: "sm", align: "baseline" })];
		if (trailer) children.push(text(trailer, { wrap: "none", truncate: "end" }));
		const described = row(children, { justify: "between", role: "ultraworkers.loader" });
		this.#native = { message, trailer, shimmer, node: described };
		return described;
	}

	/**
	 * Describe as the dock's working row ({@link describeWorkingRow}) instead
	 * of a spinner line; `spec` is re-read whenever the engine revisits the
	 * loader and `interrupt` answers a click on its stop control.
	 */
	setWorkingRow(spec: () => WorkingRowSpec, interrupt: () => void): void {
		this.#working = { spec, interrupt };
		this.#workingNative = undefined;
		this.#startNativeCountdown();
	}

	/** A click on the working row's stop control. */
	handleNativeEvent(event: NativeUiEvent): void {
		if (event.type === "action" && event.act === "interrupt") this.#working?.interrupt();
	}

	#describeWorking(cx: DescribeContext): NativeNode {
		const spec = this.#working!.spec();
		const now = Date.now();
		const variant = spec.variant;
		const countdown =
			variant?.kind === "retry" && cx.supports("meter")
				? Math.round((Math.max(0, variant.delayMs - (now - spec.startedAt)) / Math.max(1, variant.delayMs)) * 100)
				: -1;
		const key = [
			spec.label,
			spec.startedAt,
			variant?.kind,
			variant?.kind === "retry" ? `${variant.attempt}/${variant.max}` : "",
			countdown,
			spec.rate,
			spec.interruptKey,
			spec.palette?.mid,
			shimmerEnabled(),
		].join("\u0000");
		const cached = this.#workingNative;
		if (cached?.key === key) return cached.node;
		const described = describeWorkingRow(spec, cx, now);
		this.#workingNative = { key, node: described };
		return described;
	}

	/** A TSP terminal clocks the spinner and timer, but a retry ring's fill is ultraworkers': repaint it while counting down. */
	#startNativeCountdown(): void {
		if (this.#nativeTimer || !isNativeRendering() || this.#working?.spec().variant?.kind !== "retry") return;
		this.#nativeTimer = setInterval(() => this.#requestPaint(), RETRY_METER_REPAINT_MS);
		this.#nativeTimer.unref?.();
	}

	start() {
		this.#lastSpinnerTick = performance.now();
		this.#syncText();
		this.#requestPaint();
		// The TSP terminal animates the described spinner; nothing to repaint.
		if (isNativeRendering()) {
			this.#startNativeCountdown();
			return;
		}
		const intervalMs =
			this.#intervalMs ?? (this.messageColorFn.animated === true ? RENDER_INTERVAL_MS : SPINNER_ADVANCE_MS);
		this.#scheduleTick(intervalMs, intervalMs);
	}

	/**
	 * Replace the spinner frames and cadence after construction. Passing
	 * `undefined` restores the product defaults.
	 *
	 * Exists because the frames were fixed at construction, so a `/reload` or an
	 * extension that wanted a different spinner had to rebuild the whole
	 * animation to get one.
	 */
	/**
	 * Frames this Loader was constructed with, so a caller replacing the frames
	 * can keep anything structural it passed in. The working row puts its
	 * interrupt affordance there, and dropping it would remove the only visible
	 * way to stop a turn.
	 */
	getIndicatorHint(): string[] {
		return [...this.#constructorFrames];
	}

	setIndicator(indicator: { frames?: string[]; intervalMs?: number } | undefined): void {
		this.#intervalMs =
			indicator?.intervalMs !== undefined && indicator.intervalMs > 0 ? indicator.intervalMs : undefined;
		const frames = indicator?.frames;
		// `undefined` restores what this Loader was CONSTRUCTED with, not the
		// product default. A caller may pass its frames as a constructor argument
		// rather than as a theme — the working row passes its interrupt affordance
		// that way — and resetting to the global default would replace their value
		// with a third thing they never asked for.
		// A caller's frames go BEFORE this Loader's constructor frames, never instead
		// of them: the working row puts its interrupt affordance in the constructor
		// argument, and an extension must not be able to erase the only visible way
		// to stop a turn. Its own spinner leads, which is what the caller asked for.
		this.#frames =
			frames && frames.length > 0 ? [...frames, ...this.#constructorFrames] : [...this.#constructorFrames];
		// Same dedupe-by-width the constructor does: frames of equal display
		// width share one layout entry so the row cannot jitter between them.
		const representatives = new Map<number, string>();
		this.#layoutFrames = this.#frames.map(frame => {
			const width = visibleWidth(frame);
			const representative = representatives.get(width);
			if (representative !== undefined) return representative;
			representatives.set(width, frame);
			return frame;
		});
		if (this.#currentFrame >= this.#layoutFrames.length) this.#currentFrame = 0;
		this.#layoutFrame = this.#layoutFrames[0];
		// Re-derive the text the same way the tick does. The cached layout records
		// whether each line begins with the spinner, decided against the OLD
		// `#layoutFrame`; keep it and the row keeps rendering the old glyph, and
		// treats it as the message — so a swapped spinner silently rewrites what
		// the user reads.
		this.#syncText();
		this.#requestPaint();
	}

	stop() {
		if (this.#intervalId) {
			clearTimeout(this.#intervalId);
			this.#intervalId = undefined;
		}
		if (this.#nativeTimer) {
			clearInterval(this.#nativeTimer);
			this.#nativeTimer = undefined;
		}
	}

	/** Lifecycle teardown: stop the animation timer. Idempotent. */
	dispose() {
		this.stop();
	}
	/** Install a lazy right-docked suffix for the spinner row (e.g. a styled
	 * session title). Re-evaluated every paint; dropped when the row leaves
	 * less than a two-cell gap. */
	setTrailer(trailer: (() => string | undefined) | undefined): void {
		this.#trailer = trailer;
	}

	setMessage(message: string) {
		if (message === this.message) {
			return;
		}
		this.message = message;
		this.#syncText();
		this.#requestPaint();
	}

	#scheduleTick(intervalMs: number, delayMs: number): void {
		const timer = setTimeout(() => {
			if (this.#intervalId !== timer) return;
			if (isNativeRendering()) {
				// A TSP surface opened mid-animation: the terminal clocks it from here.
				this.#intervalId = undefined;
				return;
			}
			const startedAt = performance.now();
			const elapsed = startedAt - this.#lastSpinnerTick;
			const shouldAdvanceSpinner = elapsed >= SPINNER_ADVANCE_MS;
			if (shouldAdvanceSpinner) {
				const steps = Math.floor(elapsed / SPINNER_ADVANCE_MS);
				this.#currentFrame = (this.#currentFrame + steps) % this.#frames.length;
				this.#lastSpinnerTick += steps * SPINNER_ADVANCE_MS;
				this.#syncText();
			}
			if (shouldAdvanceSpinner || this.#ui?.synchronizedOutput === true) {
				this.#requestPaint();
			}

			const completedFrameCostMs = this.#ui?.lastFrameCostMs ?? 0;
			const requestCostMs = performance.now() - startedAt;
			if (this.#intervalId !== timer) return;
			const cadenceDelayMs = Math.max(0, intervalMs - requestCostMs);
			// Idle for nine times the full frame cost to keep animation at or
			// below 10% CPU even though requestComponentRender() only enqueues.
			const boundedFrameCostMs = Math.min(
				MAX_BACKPRESSURE_FRAME_COST_MS,
				Math.max(completedFrameCostMs, requestCostMs),
			);
			const backpressureDelayMs = boundedFrameCostMs * RENDER_BACKPRESSURE_MULTIPLIER;
			this.#scheduleTick(intervalMs, Math.max(cadenceDelayMs, backpressureDelayMs));
		}, delayMs);
		this.#intervalId = timer;
	}
	#resolveMessage(): string {
		return typeof this.message === "function" ? this.message() : this.message;
	}

	/** Re-wrap the underlying Text only when its message or frame width changes.
	 * When {@link message} is a function it is re-evaluated on every spinner
	 * tick, so a dynamic label (e.g. a live countdown) advances in sync with
	 * the glyph instead of freezing on the initial value. */
	#syncText(): boolean {
		const layoutFrame = this.#layoutFrames[this.#currentFrame];
		this.#layoutFrame = layoutFrame;
		return this.setText(`${layoutFrame} ${this.#resolveMessage()}`);
	}

	#requestPaint() {
		if (!this.#ui) {
			return;
		}
		this.#ui.requestComponentRender(this);
	}
}
