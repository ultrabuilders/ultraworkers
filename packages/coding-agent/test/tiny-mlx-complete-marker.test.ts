/**
 * The MLX completion marker decides whether an already-downloaded model is
 * re-fetched. `_is_complete` is the ONLY skip path in `download_repo` — there is
 * no "the files are there, call it done" fallback — so renaming the marker
 * without reading the old name sends every existing install back to the Hub for
 * the whole model, silently and expensively.
 *
 * The contract is exercised by running the real Python: asserting over a
 * transcribed copy of the logic would only prove the copy agrees with itself,
 * which is the failure this file exists to prevent.
 */
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const MLX_SERVER = path.resolve(import.meta.dir, "../src/tiny/mlx-server.py");

/** Ask the real `_is_complete` whether a directory counts as downloaded. */
async function isComplete(dir: string, files: Array<[string, number]>): Promise<boolean> {
	const script =
		`import importlib.util, json, sys\n` +
		`spec = importlib.util.spec_from_file_location("mlx_server", ${JSON.stringify(MLX_SERVER)})\n` +
		`mod = importlib.util.module_from_spec(spec)\n` +
		`spec.loader.exec_module(mod)\n` +
		`sys.stdout.write(json.dumps(mod._is_complete(sys.argv[1], [(n, s) for n, s in json.loads(sys.argv[2])])))\n`;
	const proc = Bun.spawn([process.env.PYTHON ?? "python3", "-c", script, dir, JSON.stringify(files)], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0) throw new Error(`mlx marker probe exited ${code}: ${stderr}`);
	return JSON.parse(stdout) as boolean;
}

/** A model directory whose weights are all present, marked complete by `marker`. */
async function downloadedModel(marker: string | null, files: Array<[string, number]>): Promise<string> {
	const dir = TempDir.createSync("@pi-mlx-marker-").path();
	for (const [name] of files) await fs.writeFile(path.join(dir, name), "weights");
	if (marker !== null) {
		await fs.writeFile(path.join(dir, marker), JSON.stringify({ repo: "test/repo", files: files.map(([n]) => n) }));
	}
	return dir;
}

const FILES: Array<[string, number]> = [
	["config.json", 1],
	["model.safetensors", 2],
];

describe("MLX completion marker", () => {
	it("treats a model marked by the current name as downloaded", async () => {
		const dir = await downloadedModel(".ultraworkers-complete.json", FILES);
		expect(await isComplete(dir, FILES)).toBe(true);
	});

	it("still treats a model marked by the pre-rename name as downloaded", async () => {
		// The regression: dropping the legacy name re-downloads a multi-GB model
		// for every install that downloaded before the rename.
		const dir = await downloadedModel(".omp-complete.json", FILES);
		expect(await isComplete(dir, FILES)).toBe(true);
	});

	it("requires a marker, so a half-downloaded directory is never skipped", async () => {
		// The fallback must not degrade into "the files exist, call it done": a
		// directory with weights but no marker is exactly the interrupted download.
		const dir = await downloadedModel(null, FILES);
		expect(await isComplete(dir, FILES)).toBe(false);
	});

	it("does not skip when the marker names a different file set", async () => {
		const dir = await downloadedModel(".omp-complete.json", FILES);
		expect(await isComplete(dir, [["config.json", 1]])).toBe(false);
	});

	it("does not skip when a file the marker claims is missing", async () => {
		const dir = await downloadedModel(".ultraworkers-complete.json", FILES);
		await fs.rm(path.join(dir, "model.safetensors"));
		expect(await isComplete(dir, FILES)).toBe(false);
	});
});
