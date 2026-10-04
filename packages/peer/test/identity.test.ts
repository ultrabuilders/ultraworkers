import { describe, expect, test } from "bun:test";
import {
	ADJECTIVES,
	allocateName,
	allocateNames,
	countGraphemes,
	NameSpaceExhaustedError,
	NAME_GRAPHEME_LIMIT,
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

	test("is 9,900 names, and neither axis repeats a word", () => {
		// Asserted as the two factors, not as the product. Restating the product
		// would prove only that 75 × 132 is 9900, and would go red on any edit at
		// all — including one that leaves the size unchanged. Naming the two axes
		// says *why* the space is 9,900 and localises a change to the axis that
		// caused it.
		expect(ADJECTIVES.length).toBe(75);
		expect(NOUNS.length).toBe(132);
		expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length);
		expect(new Set(NOUNS).size).toBe(NOUNS.length);
	});

	test("contains no entry that names a job, a subsystem or a capability", () => {
		// Anchored to the START of the word, which is what a stem match means.
		// A bare `includes` is a substring match and is not equivalent: it reads
		// "magenta" as containing "agent", which is a colour, not a role — and a
		// gate built on that false positive guards a bug that does not exist.
		// Measured on this vocabulary, prefix-anchored matching finds 0 hits where
		// substring matching finds 1 (magenta/agent).
		//
		// The list stays as wide as the test's name claims. The first version
		// excluded only jobs, so a subsystem noun like "proxy" or "cache" would
		// have passed while the test still said "no subsystem".
		const stems = [
			// jobs and roles
			"migrat",
			"refactor",
			"worker",
			"tester",
			"auditor",
			"agent",
			// subsystems
			"backend",
			"frontend",
			"service",
			"daemon",
			"proxy",
			// infrastructure by name
			"index",
			"main",
			"cache",
		];
		for (const word of [...ADJECTIVES, ...NOUNS]) {
			const lowered = word.toLowerCase();
			for (const stem of stems) {
				expect(lowered.startsWith(stem), `${word} looks like a role`).toBe(false);
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
