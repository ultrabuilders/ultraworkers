import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { atomicWriteJson } from "@oh-my-pi/pi-utils";
import { TempDir } from "@oh-my-pi/pi-utils";

/**
 * `atomicWriteJson` is exported from the package barrel, so it is offered to
 * every caller — including the two registry writers in coding-agent that take
 * no lock. Its name is a promise that the write is atomic, and these tests hold
 * it to that: the observable contract is that a reader sees either the whole
 * previous file or the whole new one, never a truncated or empty file.
 */
describe("atomicWriteJson", () => {
	let dir: TempDir;
	let target: string;

	beforeEach(() => {
		dir = TempDir.createSync("@pi-atomic-write-");
		target = path.join(dir.path(), "state.json");
	});

	afterEach(() => {
		dir.remove();
	});

	it("leaves the file complete and parseable after a write", async () => {
		await atomicWriteJson(target, { plugins: ["alpha"] });

		expect(await Bun.file(target).json()).toEqual({ plugins: ["alpha"] });
	});

	it("ends the file with a newline, so it is well-formed for line tooling", async () => {
		await atomicWriteJson(target, { a: 1 });

		expect(await Bun.file(target).text()).toBe('{\n  "a": 1\n}\n');
	});

	it("resolves every concurrent write and leaves one whole document behind", async () => {
		// Distinct payloads, so the surviving file identifies which writer won.
		const payloads = Array.from({ length: 12 }, (_, i) => ({ writer: i, tag: `payload-${i}` }));

		const settled = await Promise.allSettled(payloads.map(payload => atomicWriteJson(target, payload)));

		// A shared temp name makes one writer rename away another's temp file,
		// so the loser fails with ENOENT. That rejection is the whole symptom.
		const rejected = settled.filter(r => r.status === "rejected");
		expect(rejected).toEqual([]);

		// Whoever won, the file must be one of the inputs in full — not a
		// truncation, not an empty file, not a blend of two.
		const final = await Bun.file(target).json();
		expect(payloads).toContainEqual(final);
	});

	it("leaves no temp files behind after a successful write", async () => {
		await atomicWriteJson(target, { a: 1 });

		const leftovers = (await fs.readdir(dir.path())).filter(name => name.includes("tmp"));
		expect(leftovers).toEqual([]);
	});
});
