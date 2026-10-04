import { describe, expect, it, spyOn } from "bun:test";
import { Args, Command, type CommandEntry, Flags, run } from "../src/cli";

class GoodCommand extends Command {
	static description = "prints good things";
	static flags = {
		verbose: Flags.boolean({ description: "be loud" }),
	};
	async run(): Promise<void> {}
}

class BenchLikeCommand extends Command {
	static description = "benchmark models";
	static args = {
		models: Args.string({ description: "model selectors", required: true, multiple: true }),
	};
	static flags = {
		runs: Flags.integer({ description: "requests per model", default: 10 }),
	};
	async run(): Promise<void> {
		await this.parse(BenchLikeCommand);
	}
}

describe("run() per-command help", () => {
	// Contract: `omp <cmd> --help` must load only the requested command module.
	// Loading the whole table would let any unrelated command whose import
	// hangs or crashes take down every per-command help invocation.
	it("loads only the requested command", async () => {
		let brokenLoads = 0;
		const commands: CommandEntry[] = [
			{ name: "good", load: async () => GoodCommand },
			{
				name: "broken",
				load: async () => {
					brokenLoads++;
					throw new Error("import-time crash");
				},
			},
		];
		const writes: string[] = [];
		const stdoutSpy = spyOn(process.stdout, "write").mockImplementation(chunk => {
			writes.push(String(chunk));
			return true;
		});
		try {
			await run({ bin: "omp", version: "0.0.0", argv: ["good", "--help"], commands });
		} finally {
			stdoutSpy.mockRestore();
		}
		expect(brokenLoads).toBe(0);
		expect(writes.join("")).toContain("prints good things");
		expect(writes.join("")).toContain("--verbose");
	});
});

describe("run() root help", () => {
	// Contract: root help renders registered metadata without importing command
	// implementations. Heavy or unavailable optional commands must not make
	// `omp --help` slow or crash.
	it("renders static metadata without loading command modules", async () => {
		let loads = 0;
		const commands: CommandEntry[] = [
			{
				name: "launch",
				load: async () => {
					loads++;
					throw new Error("runtime graph loaded");
				},
				help: {
					hidden: true,
					flags: { model: Flags.string({ description: "model selector" }) },
				},
			},
			{
				name: "good",
				load: async () => {
					loads++;
					throw new Error("runtime graph loaded");
				},
				help: { description: "prints good things" },
			},
		];
		const writes: string[] = [];
		const stdoutSpy = spyOn(process.stdout, "write").mockImplementation(chunk => {
			writes.push(String(chunk));
			return true;
		});
		try {
			await run({ bin: "omp", version: "0.0.0", argv: ["--help"], commands });
		} finally {
			stdoutSpy.mockRestore();
		}
		const output = writes.join("");
		expect(loads).toBe(0);
		expect(output).toContain("--model=<value>");
		expect(output).toContain("good  prints good things");
	});

	it("preserves constructable commands for existing custom help callbacks", async () => {
		const commands: CommandEntry[] = [
			{ name: "good", load: async () => GoodCommand, help: { description: "static summary" } },
		];
		let receivedConstructor = false;

		await run({
			bin: "omp",
			version: "0.0.0",
			argv: ["--help"],
			commands,
			help: config => {
				const Command = config.commands.get("good");
				expect(Command).toBe(GoodCommand);
				if (Command) {
					receivedConstructor = new Command([], config) instanceof GoodCommand;
				}
			},
		});

		expect(receivedConstructor).toBe(true);
	});
});

describe("the brand and the command are separate names", () => {
	// `bin` is what the program calls itself (the `--version` banner); `command` is
	// what the user types (every `$ <name> <command>` line). They used to be one
	// variable, so a rebrand changed both: help began printing
	// `$ ultraworkers update` while the command on PATH was still `omp`, and
	// pasting it failed. The two roles are separate values now, and the row below
	// is the proof they can move apart — a single variable cannot.
	async function runWith(names: { bin: string; command?: string }, argv: string[]): Promise<string> {
		const writes: string[] = [];
		const stdoutSpy = spyOn(process.stdout, "write").mockImplementation(chunk => {
			writes.push(String(chunk));
			return true;
		});
		try {
			await run({
				bin: names.bin,
				command: names.command,
				version: "1.2.3",
				argv,
				commands: [{ name: "bench", load: async () => BenchLikeCommand }],
			});
		} finally {
			stdoutSpy.mockRestore();
		}
		return writes.join("");
	}

	it("puts the brand on the version banner and the command on the usage line", async () => {
		const banner = await runWith({ bin: "brandname", command: "cmdname" }, ["--version"]);
		expect(banner).toBe("brandname/1.2.3\n");

		const usage = await runWith({ bin: "brandname", command: "cmdname" }, ["bench", "--help"]);
		expect(usage).toContain("$ cmdname bench MODELS... [FLAGS]");
		// The brand must not leak into a line the reader is meant to paste.
		expect(usage).not.toContain("brandname");
	});

	it("falls back to the brand when no separate command name is given", async () => {
		// Backwards compatibility for every caller that passes only `bin`, which is
		// what every existing test in this file does.
		const usage = await runWith({ bin: "brandname" }, ["bench", "--help"]);
		expect(usage).toContain("$ brandname bench MODELS... [FLAGS]");
	});
});

describe("run() usage errors", () => {
	// Contract: a missing required arg prints a concise `error:` + USAGE line to
	// stderr and exits 1 — it must NOT throw past run() (which would dump a
	// minified `dist/cli.js` code frame). Regression for #5369.
	it("prints a concise usage error instead of throwing on a missing required arg", async () => {
		const commands: CommandEntry[] = [{ name: "bench", load: async () => BenchLikeCommand }];
		const errs: string[] = [];
		const stderrSpy = spyOn(process.stderr, "write").mockImplementation(chunk => {
			errs.push(String(chunk));
			return true;
		});
		const prevExitCode = process.exitCode;
		try {
			await expect(run({ bin: "omp", version: "0.0.0", argv: ["bench"], commands })).resolves.toBeUndefined();
		} finally {
			stderrSpy.mockRestore();
			process.exitCode = prevExitCode ?? 0;
		}
		const out = errs.join("");
		expect(out).toContain("error: Missing required argument: models");
		expect(out).toContain("$ omp bench MODELS... [FLAGS]");
		expect(out).not.toContain("dist/cli.js");
	});

	// Contract: `--help` USAGE renders a required variadic as `MODELS...`, never
	// the misleading optional `[MODELS]`. Regression for #5369.
	it("renders a required variadic arg without optional brackets", async () => {
		const commands: CommandEntry[] = [{ name: "bench", load: async () => BenchLikeCommand }];
		const writes: string[] = [];
		const stdoutSpy = spyOn(process.stdout, "write").mockImplementation(chunk => {
			writes.push(String(chunk));
			return true;
		});
		try {
			await run({ bin: "omp", version: "0.0.0", argv: ["bench", "--help"], commands });
		} finally {
			stdoutSpy.mockRestore();
		}
		const out = writes.join("");
		expect(out).toContain("$ omp bench MODELS... [FLAGS]");
		expect(out).not.toContain("[MODELS]");
	});

	it("prints a concise usage error for an unknown flag", async () => {
		const commands: CommandEntry[] = [{ name: "bench", load: async () => BenchLikeCommand }];
		const errs: string[] = [];
		const stderrSpy = spyOn(process.stderr, "write").mockImplementation(chunk => {
			errs.push(String(chunk));
			return true;
		});
		const prevExitCode = process.exitCode;
		try {
			await expect(
				run({ bin: "omp", version: "0.0.0", argv: ["bench", "--unknown"], commands }),
			).resolves.toBeUndefined();
		} finally {
			stderrSpy.mockRestore();
			process.exitCode = prevExitCode ?? 0;
		}
		const out = errs.join("");
		expect(out).toContain("error: Unknown option '--unknown'");
		expect(out).toContain("$ omp bench MODELS... [FLAGS]");
	});
});
