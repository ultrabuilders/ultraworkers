import { describe, expect, test } from "bun:test";
import {
	ADJECTIVES,
	allocateName,
	allocateNames,
	countGraphemes,
	NameSpaceExhaustedError,
	NAME_GRAPHEME_LIMIT,
	NAME_SPACE_SIZE,
	nameKey,
	NOUNS,
	RESERVED_NAMES,
	sanitiseName,
} from "@ultraworkers/peer/identity";

describe("the closed name space", () => {
	test("every name decomposes into a known adjective and a known noun", () => {
		// Not a source-grep: this runs over the exported data. A generated name
		// that does not decompose would be a name nothing can recognise.
		const nouns = new Set(NOUNS);
		for (const name of allocateNames(() => false)) {
			const tail = name.replace(/^.*?(?=[A-Z])/, "");
			expect(nouns.has(tail.toLowerCase()), `${name} has no adjective+noun decomposition`).toBe(true);
		}
		expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length);
	});

	test("is 9,900 names with no duplicates on either axis", () => {
		expect(NAME_SPACE_SIZE).toBe(9_900);
		expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length);
		expect(new Set(NOUNS).size).toBe(NOUNS.length);
	});

	test("contains no entry that names a job, a subsystem or a capability", () => {
		// Word-stem match, not substring: "magenta" contains "agent" and is a
		// colour. A substring test here reports a role word that is not one, and
		// a gate built around that false positive guards nothing.
		const stems = ["migrat", "refactor", "worker", "backend", "frontend", "tester", "auditor"];
		for (const word of [...ADJECTIVES, ...NOUNS]) {
			for (const stem of stems) {
				expect(word.toLowerCase().includes(stem), `${word} looks like a role`).toBe(false);
			}
		}
	});

	test("exhaustion is a named failure, not a reuse", () => {
		const taken = new Set(allocateNames(() => false));
		expect(() => allocateName("i-1", c => taken.has(c))).toThrow(NameSpaceExhaustedError);
	});
});

describe("allocation", () => {
	test("skips names the store already holds", () => {
		const first = allocateName("i-1", () => false);
		const second = allocateName("i-2", c => c === first.name);
		expect(second.name).not.toBe(first.name);
	});

	test("carries the instanceId, never derives identity from the name", () => {
		expect(allocateName("instance-7", () => false).instanceId).toBe("instance-7");
	});

	test("folding is case-insensitive because NTFS is", () => {
		expect(nameKey("BlueLake")).toBe(nameKey("bluelake"));
	});
});

describe("sanitising", () => {
	test("strips format and control characters", () => {
		// A zero-width joiner and an escape sequence are display attacks in a
		// label, not decoration.
		expect(sanitiseName("A‎B")).toBe("AB");
		// The escape byte itself is stripped; the visible text around it survives,
		// so the terminal is never handed a sequence to execute.
		expect(sanitiseName("foo\u001b[31mbar")).toBe("foo[31mbar");
	});

	test("truncates at 64 graphemes, not code units", () => {
		const family = "\u{1f469}‍👧‍👦"; // one grapheme
		const name = sanitiseName(family.repeat(100)) ?? "";
		expect(countGraphemes(name)).toBe(NAME_GRAPHEME_LIMIT);
		expect(name.endsWith("…")).toBe(true);
	});

	test("refuses a name with nothing left after stripping", () => {
		// A fallback here would hand back a name the caller never asked for and
		// then publish it to every peer.
		expect(sanitiseName("​​")).toBeNull();
		expect(sanitiseName("   ")).toBeNull();
	});
});

describe("reserved names", () => {
	test("refuses the impersonation that misleads a human reading a transcript", () => {
		for (const reserved of RESERVED_NAMES) {
			expect(nameKey(reserved)).toBe(nameKey(reserved.toUpperCase()));
		}
		expect([...RESERVED_NAMES]).toEqual(["user", "system"]);
	});
});
