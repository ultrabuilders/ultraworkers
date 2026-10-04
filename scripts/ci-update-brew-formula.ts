#!/usr/bin/env bun
//
// Render the Homebrew formula for `ultraworkers` from a published GitHub release and write
// it to a tap checkout. The release publishes per-platform bare binaries
// (ultraworkers-<platform>-<arch>); this reads their sha256 digests straight from the
// release metadata so the formula never drifts from the shipped assets.
//
// Usage:
//   bun scripts/ci-update-brew-formula.ts <tag> --out <path/to/Formula/ultraworkers.rb>
//   bun scripts/ci-update-brew-formula.ts v15.10.3        # prints to stdout

import { $ } from "bun";

const REPO = process.env.OMP_REPO ?? "can1357/oh-my-pi";
const HOMEPAGE = "https://omp.sh";
const DESC = "Coding agent with the IDE wired in";

interface ReleaseAsset {
	name: string;
	digest?: string;
}

function parseArgs(argv: readonly string[]): { tag: string; out: string | null } {
	const rest = [...argv];
	let out: string | null = null;
	const outIdx = rest.indexOf("--out");
	if (outIdx >= 0) {
		out = rest[outIdx + 1] ?? null;
		if (!out) throw new Error("--out requires a path");
		rest.splice(outIdx, 2);
	}
	const tag = rest.find(a => !a.startsWith("--"));
	if (!tag) throw new Error("usage: ci-update-brew-formula.ts <tag> [--out <file>]");
	return { tag, out };
}

async function fetchAssets(tag: string): Promise<ReleaseAsset[]> {
	const res = await $`gh release view ${tag} --repo ${REPO} --json assets`.quiet().nothrow();
	if (res.exitCode !== 0) {
		throw new Error(`gh release view ${tag} failed: ${res.stderr.toString().trim()}`);
	}
	const parsed = JSON.parse(res.stdout.toString()) as { assets: ReleaseAsset[] };
	return parsed.assets;
}

function sha256For(assets: readonly ReleaseAsset[], name: string): string {
	const asset = assets.find(a => a.name === name);
	if (!asset) throw new Error(`release is missing asset ${name}`);
	if (!asset.digest?.startsWith("sha256:")) {
		throw new Error(`asset ${name} has no sha256 digest (got ${asset.digest ?? "none"})`);
	}
	return asset.digest.slice("sha256:".length);
}

/**
 * The formula's filename stem, used when rendering to stdout (no `--out`).
 * It is also the name the README tells users to install, so it is the single
 * place the product's Homebrew identity is written down.
 */
const FORMULA_STEM = "ultraworkers";

/**
 * Homebrew resolves `Formula/<name>.rb` by matching the file's basename to the
 * formula class name, and a mismatch fails at LOAD rather than at download — so
 * `brew install can1357/tap/ultraworkers` would report an error about a class
 * the user never named, with nothing installed.
 *
 * The class name is therefore DERIVED from the `--out` path rather than written
 * out separately. A rename that moves the filename but not the class name is
 * exactly the half-migrated state that breaks the tap, and deriving makes that
 * state unrepresentable instead of merely detectable.
 */
export function formulaClassName(outPath: string | null): string {
	const base = outPath?.split("/").pop() ?? `${FORMULA_STEM}.rb`;
	const stem = base.endsWith(".rb") ? base.slice(0, -".rb".length) : base;
	const pascal = stem
		.split(/[-_]/)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
	return pascal === "" ? FORMULA_STEM : pascal;
}

// `${...}` is JS interpolation; the literal `#{version}` / `#{bin}` below are
// Ruby interpolations Homebrew resolves when it evaluates the formula.
export function renderFormula(version: string, sums: Record<string, string>, className: string): string {
	// Each `url` carries `using: :nounzip` because the release assets are bare
	// Mach-O/ELF executables, not archives. Without it Homebrew's default
	// CurlDownloadStrategy routes through UnpackStrategy::Uncompressed#extract_nestedly,
	// which nests the file outside the staging CWD; `Dir["ultraworkers-*"].first` then
	// returns `nil` and `bin.install nil => "ultraworkers"` raises.
	//
	// `with_env(HOME: buildpath)` redirects the CLI's `os.homedir()` lookup to
	// the writable staging dir so `generate_completions_from_executable` does
	// not touch the real `/Users/<user>/.omp` (denied by Homebrew's sandbox
	// profile, which would otherwise fail the popen).
	return `class ${className} < Formula
  desc "${DESC}"
  homepage "${HOMEPAGE}"
  version "${version}"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/${REPO}/releases/download/v#{version}/ultraworkers-darwin-arm64",
          using: :nounzip
      sha256 "${sums["ultraworkers-darwin-arm64"]}"
    end
    on_intel do
      url "https://github.com/${REPO}/releases/download/v#{version}/ultraworkers-darwin-x64",
          using: :nounzip
      sha256 "${sums["ultraworkers-darwin-x64"]}"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/${REPO}/releases/download/v#{version}/ultraworkers-linux-arm64",
          using: :nounzip
      sha256 "${sums["ultraworkers-linux-arm64"]}"
    end
    on_intel do
      url "https://github.com/${REPO}/releases/download/v#{version}/ultraworkers-linux-x64",
          using: :nounzip
      sha256 "${sums["ultraworkers-linux-x64"]}"
    end
  end

  def install
    bin.install Dir["ultraworkers-*"].first => "ultraworkers"
    (bin/"ultraworkers").chmod 0555
    with_env(HOME: buildpath) do
      generate_completions_from_executable(bin/"ultraworkers", "completions", shells: [:bash, :zsh, :fish])
    end
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/ultraworkers --version")
  end
end
`;
}

async function main(): Promise<void> {
	const { tag, out } = parseArgs(process.argv.slice(2));
	const version = tag.replace(/^v/, "");
	const assets = await fetchAssets(tag);

	const targets = [
		"ultraworkers-darwin-arm64",
		"ultraworkers-darwin-x64",
		"ultraworkers-linux-arm64",
		"ultraworkers-linux-x64",
	];
	const sums: Record<string, string> = {};
	for (const name of targets) sums[name] = sha256For(assets, name);

	const formula = renderFormula(version, sums, formulaClassName(out));
	if (out) {
		await Bun.write(out, formula);
		console.log(`wrote ${out} for ${tag}`);
	} else {
		process.stdout.write(formula);
	}
}

if (import.meta.main) {
	await main();
}
