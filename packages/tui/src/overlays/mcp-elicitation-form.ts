/**
 * Form presented for an MCP `elicitation/create` request.
 *
 * Three rules shape this component, and each one exists because the alternative
 * fails silently rather than loudly:
 *
 * 1. **The three outcomes stay distinguishable.** Submit, decline and cancel are
 *    separate callbacks, so the caller learns which one the user actually chose.
 *    A single "cancelled" callback would make a considered refusal
 *    indistinguishable from walking away, and the server cannot tell them apart
 *    either — it only ever sees the action that reaches the wire.
 * 2. **A `required` field blocks submit** through the field's own validation
 *    rather than a check after the fact, so the error sits on the field the user
 *    is looking at.
 * 3. **A `writeOnly` value is masked in the field and excluded from the
 *    transcript.** Masking alone is not enough: a value echoed into the
 *    conversation record outlives the overlay, so {@link collectedContent} never
 *    returns one.
 */
import { Spacer } from "../index";
import { matchesAppInterrupt } from "../keybinding-matchers";
import { matchesKey } from "../keys";
import { formTheme } from "../chrome/form-theme";
import { OverlayPanel } from "../chrome/overlay-box";
import { Form, TextFormField } from "../components/form";
import { editorKey, interruptKey, rawKeyHint } from "../chrome/keybinding-hints";
import { node } from "../native/describe";
import type { DescribeContext, NativeNode } from "../native/node";
import { overlayCard } from "../native/overlay";
import { plainText } from "../native/spans";

/** One field of the requested schema, as this component needs it. */
export interface McpElicitField {
	readonly name: string;
	readonly title: string;
	readonly description?: string;
	readonly required: boolean;
	readonly writeOnly: boolean;
	readonly placeholder?: string;
}

/** What the user did, carried back to the caller without a secret in it. */
export type McpElicitChoice =
	| { readonly action: "accept"; readonly content: Record<string, string | number | boolean | string[]> }
	| { readonly action: "decline" | "cancel" };

export interface McpElicitationFormOptions {
	readonly title: string;
	readonly message: string;
	readonly fields: readonly McpElicitField[];
	/** Called with the filled content. Never invoked for a secret field. */
	readonly onAccept: (content: Record<string, string | number | boolean | string[]>) => void;
	readonly onDecline: () => void;
	readonly onCancel: () => void;
}

export class McpElicitationFormComponent extends OverlayPanel {
	readonly #fields: readonly McpElicitField[];
	readonly #inputs: TextFormField[];
	readonly #form: Form;
	readonly #onDecline: () => void;
	#lastChoice: McpElicitChoice | undefined;

	constructor(options: McpElicitationFormOptions) {
		super(options.title, "ultraworkers.overlay.mcp-elicitation");

		this.#fields = options.fields;
		this.#onDecline = options.onDecline;

		const submit = (): void => {
			// Required is enforced per field below, so reaching here means the form
			// is complete. A writeOnly field contributes no value: it was shown as
			// a masked input and its contents must not leave this component.
			const content: Record<string, string | number | boolean | string[]> = {};
			for (const field of this.#fields) {
				if (field.writeOnly) continue;
				const value = this.#inputs[this.#fields.indexOf(field)]?.getValue() ?? "";
				if (value === "" && !field.required) continue;
				content[field.name] = value;
			}
			this.#lastChoice = { action: "accept", content };
			options.onAccept(content);
		};

		this.#inputs = options.fields.map(field => {
			const input = new TextFormField({
				theme: formTheme,
				prompt: field.required ? `${field.title} *` : field.title,
				hint: field.description,
				...(field.placeholder ? { empty: "submit" as const } : {}),
				// `secret` is what keeps the typed characters off the screen; the
				// second half of the guarantee is skipping the field on submit.
				secret: field.writeOnly,
				// An empty required field reports on the field itself rather than
				// producing a form that silently submits an empty value.
				validate: value => {
					if (field.required && value.trim() === "") return `${field.title} is required`;
					return undefined;
				},
				onSubmit: () => submit(),
				onCancel: () => {
					this.#lastChoice = { action: "cancel" };
					options.onCancel();
				},
			});
			return input;
		});

		this.#form = new Form({
			fields: this.#inputs,
			onCancel: () => {
				this.#lastChoice = { action: "cancel" };
				options.onCancel();
			},
			isCancel: matchesAppInterrupt,
		});

		this.addChild(this.#form);
		if (options.message) {
			this.addChild(new Spacer(1));
		}
		this.addChild(new Spacer(1));
	}

	/** The outcome the user produced, or undefined while the form is open. */
	get choice(): McpElicitChoice | undefined {
		return this.#lastChoice;
	}

	handleInput(keyData: string): void {
		// Decline is its own key rather than a button in the form: the user has to
		// be able to say no without touching the fields, and it has to stay a
		// distinct outcome from submit and from the interrupt that cancels. The
		// check runs before the form sees the key, or `d` would be typed into
		// whichever field is focused.
		if (matchesKey(keyData, "d") && !this.#lastChoice) {
			this.#lastChoice = { action: "decline" };
			this.#onDecline();
			return;
		}
		this.#form.handleInput(keyData);
	}

	pasteText(text: string): void {
		this.#form.pasteText(text);
	}

	override describe(_cx: DescribeContext): NativeNode {
		const title = plainText(this.title);
		// The decline key is only discoverable if it is written down; a hidden
		// binding is the same as no binding for anyone who does not read the
		// source.
		const hint = node(
			"row",
			{ gap: "md" },
			[
				node("text", { text: rawKeyHint("d", "decline") }),
				node("text", { text: `${editorKey("tui.input.submit")} submit` }),
				node("text", { text: `${interruptKey()} cancel` }),
			],
			"hints",
		);
		return overlayCard(this.nativeRole, title, [this.#form, hint]);
	}
}
