# PHIẾU TRIỂN KHAI — MILESTONE_5 W10

**Work item:** `## W10. CI / release / Docker / homebrew / nix (sóng 4)`
**Nguồn:** `MILESTONE_5_EXECUTION_PLAN.md:3327-3524`
**HEAD khi kiểm chứng:** `47720fd` (branch `milestone-1`) — plan tự nhận bằng chứng chạy trên `1454dc0`, **đã cũ**.
**Ngày kiểm chứng:** 2026-09-29
**Số neo đã mở đọc:** 256 · **Đúng:** 231 · **Hỏng:** 25 (xem §0)

> Đặc tả gốc rất kỹ. 231/256 neo đúng, toàn bộ neo trong `ci.yml`, `flake.nix`, `nix/home-manager.nix`, `install.sh`, `install.ps1`, `run-ci.sh`, 4 Dockerfile, `.github/actions/*` đều chính xác tuyệt đối. Nhưng có **3 lớp lỗi** mà kỹ sư gõ theo sẽ hỏng: (a) 25 neo hỏng tập trung ở `nix/package.nix` / `update-cli.ts` / `package.json` / `dirs.ts` / `Cargo.toml`; (b) danh sách dòng CẦN ĐỔI trong `ci.yml` thiếu 9 dòng thật; (c) **cổng đo được 35 pass, không phải 37**, và cổng có thể đơn giản hơn nhiều vì addon đã build.

---

## 0. Bảng neo hỏng — đọc trước khi gõ

25 neo sai. Không neo nào trong số này chỉ lệch 1–2 dòng: `nix/package.nix` lệch **+5 đến +6** trên toàn bộ 17 dòng còn lại, nên sửa "cho gần đúng" là sửa sai dòng.

| Anchor trong plan | Dòng thật | Nội dung thật ở dòng thật | Ghi chú |
| --- | --- | --- | --- |
| `package.json:91` | **87** | `"test:scripts": "bun test scripts/ci-test-ts.test.ts …"` | 91 là `check:tools`. Đây là dòng quan trọng nhất của W10 vì nó là thay đổi `package.json` duy nhất. |
| `packages/coding-agent/src/cli/update-cli.ts:1206` | **1208** | ``return `${APP_NAME}-${os}-${archName}.exe`;`` | 1206 là dòng trống. |
| `packages/coding-agent/src/cli/update-cli.ts:1208` | **1210** | ``return `${APP_NAME}-${os}-${archName}`;`` | Cả hai neo plan đều lệch +2. |
| `packages/utils/src/dirs.ts:24` | **25** | `export const APP_URL: string = "https://omp.sh/";` | 24 là dòng comment. |
| `packages/utils/src/dirs.ts:36` | **37** | ``export const USER_AGENT = `omp/${VERSION}`;`` | 36 là dòng comment. |
| `scripts/ci-release-publish.ts:165` | **186** | `publishBin: { omp: "dist/cli.js" },` | 165 là `{ dir: "packages/utils", kind: "typescript" },`. |
| `Cargo.toml:30` | **31** | `homepage = "https://omp.sh/"` | 30 là `authors = [...]`. |
| `Cargo.toml:31` | **32** | `repository = "https://github.com/can1357/oh-my-pi"` | |
| `nix/package.nix:198` | **204** | `echo "Compiling OMP"` | |
| `nix/package.nix:208` | **214** | `install -Dm755 packages/coding-agent/dist/omp "$out/bin/omp"` | |
| `nix/package.nix:209` | **215** | `install -Dm644 LICENSE "$out/share/doc/omp/LICENSE"` | |
| `nix/package.nix:210` | **216** | `install -Dm644 THIRD-PARTY-NOTICES.txt "$out/share/doc/omp/THIRD-PARTY-NOTICES.txt"` | |
| `nix/package.nix:213` | **219** | `# The addon is gzip-compressed inside the compiled binary, so its linked` | false-positive EN |
| `nix/package.nix:227` | **233** | `remove-references-to -t ${bun} "$out/bin/omp"` | |
| `nix/package.nix:230` | **236** | `# Prebuilt addons that omp bun-installs into its cache at first use` | false-positive EN |
| `nix/package.nix:244` | **250** | `# wrapProgram: the wrapper replaces $out/bin/omp with a script and moves the ELF` | |
| `nix/package.nix:245` | **251** | `# to $out/bin/.omp-wrapped.` | |
| `nix/package.nix:247` | **253** | `patchelf --add-needed libstdc++.so.6 "$out/bin/omp"` | |
| `nix/package.nix:248` | **254** | `wrapProgram "$out/bin/omp" \` | |
| `nix/package.nix:256` | **262** | `# above and the autoPatchelfHook RPATH pass that follows it do. bun --compile` | false-positive EN |
| `nix/package.nix:263` | **269** | ``# `.omp-wrapped`.`` | |
| `nix/package.nix:265` | **271** | `bun ${../scripts/fix-dt-verdef.ts} "$out/bin/.omp-wrapped"` | |
| `nix/package.nix:273` | **277** | `# Capture rather than pipe into grep: piping masks a signal death of omp` | |
| `nix/package.nix:275` | **281** | `smokeOutput="$(HOME="$TMPDIR" "$out/bin/omp" --smoke-test)"` | |
| `nix/package.nix:277` | **283** | `BUN_BE_BUN=1 "$out/bin/omp" -e \` | |
| `nix/package.nix:282` | **288** | `env -u LD_LIBRARY_PATH BUN_BE_BUN=1 "$out/bin/omp" -e \` | |
| `nix/package.nix:286` | **293** | `patchelf --print-needed "$out/bin/.omp-wrapped" \| grep -q '^libstdc\+\+\.so\.6$'` | |
| `nix/package.nix:296` | **302** | `env -u LD_LIBRARY_PATH BUN_BE_BUN=1 "$out/bin/omp" -e \` | |
| `nix/package.nix:305` | **311** | `homepage = "https://omp.sh";` | |
| `nix/package.nix:308` | **314** | `mainProgram = "omp";` | |

Neo `nix/package.nix:98` (`pname = "omp-bun-runtime-template";`) và `:115` (`pname = "omp";`) là **hai neo duy nhất đúng** trong file này.

### 0.1. Ba tuyên bố "không có hit" trong plan là SAI

| Plan nói | Thật |
| --- | --- |
| `nix/nixos-module.nix`: "Xác nhận không có hit `omp` trực tiếp" | Có **3 hit**: `:9` `cfg = config.programs.omp;`, `:12` `options.programs.omp = {`, `:18` `defaultText = … "inputs.omp.packages.…"`. Đặc biệt `:12` là **tên option thứ hai** `programs.omp` — bản NixOS của option home-manager. Quyết định "giữ `programs.omp`" của §Cần người quyết **phải phủ cả file này**, không chỉ `home-manager.nix`. |
| `nix/dev-shell.nix`: "Xác nhận không có hit `omp` trực tiếp" | Có 1 hit: `:18` `name = "omp-dev";` (cosmetic). |
| Bảng "File cần chạm tới" có **30 dòng** | Bảng có **33 dòng**. Trong đó 2 dòng tự ghi "KHÔNG SỬA" (`update-cli.ts` #17, `ci-release-publish.ts` #32) ⇒ phạm vi sửa thật = **31 file** + 1 file tạo mới. Bước review yêu cầu "đảm bảo số file khớp 30 dòng" sẽ **bắt nhầm một diff đúng**. |

---

## 1. Cái gì thay đổi, quan sát được

Sau W10, tên release asset, tên shim nhị phân, tên image Docker, tên package Nix và tên nhị phân trong installer đổi sang tên mới **thành một khối** — tải `omp-darwin-arm64` từ GitHub Releases, `brew install`, `curl … | sh`, `nix build`, và `docker build` đều dùng cùng một tên; đồng thời nhãn runner `omp-kata`, đường dẫn cấu hình `~/.omp/agent` và option home-manager `programs.omp` **không đổi một byte**.

---

## 2. Bảng điểm sửa

### 2.1 Nhóm ĐỔI — tên asset release (producer + consumer, CÙNG MỘT COMMIT)

| path | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `scripts/ci-release-build-binaries.ts` | `outfile` (producer, 8 dòng) | `outfile: "packages/coding-agent/binaries/omp-darwin-arm64",` (`:37`) | `outfile: "packages/coding-agent/binaries/<NEW>-darwin-arm64",` — cùng hình dạng ở `:44,51,58,65,72,79,86` |
| `scripts/ci-update-brew-formula.ts` | `const targets` | `const targets = ["omp-darwin-arm64", "omp-darwin-x64", "omp-linux-arm64", "omp-linux-x64"];` (`:120`) | `["<NEW>-darwin-arm64", …]` |
| `scripts/ci-update-brew-formula.ts` | `url` (4 cặp) | `url "https://github.com/${REPO}/releases/download/v#{version}/omp-darwin-arm64",` (`:76`) | đổi tiền tố giống `:81,89,94` |
| `scripts/ci-update-brew-formula.ts` | `sha256` (4 dòng) | `sha256 "${sums["omp-darwin-arm64"]}"` (`:78`) | đổi giống `:83,91,96` |
| `scripts/ci-update-brew-formula.ts` | `def install` | `bin.install Dir["omp-*"].first => "omp"` (`:101`) | `Dir["<NEW>-*"].first => "<NEW>"` |
| `scripts/ci-update-brew-formula.ts` | chmod | `(bin/"omp").chmod 0555` (`:102`) | `(bin/"<NEW>").chmod 0555` |
| `scripts/ci-update-brew-formula.ts` | completions | `generate_completions_from_executable(bin/"omp", "completions", …)` (`:104`) | `bin/"<NEW>"` |
| `scripts/ci-update-brew-formula.ts` | `test do` | `assert_match version.to_s, shell_output("#{bin}/omp --version")` (`:109`) | `#{bin}/<NEW> --version` |
| `scripts/ci-update-brew-formula.test.ts` | fixture `SUMS` | `"omp-darwin-arm64": "darwin_arm64_sha",` … (`:5-8`) | đổi 4 khoá |
| `scripts/ci-update-brew-formula.test.ts` | vòng lặp assertion | `for (const arch of ["omp-darwin-arm64", "omp-darwin-x64", "omp-linux-arm64", "omp-linux-x64"]) {` (`:21`) | đổi 4 phần tử |
| `scripts/ci-update-brew-formula.test.ts` | regex HOME redirect | `/with_env\(HOME: buildpath\) do\n\s+generate_completions_from_executable\(bin\/"omp", …` (`:35`) | `bin\/"<NEW>"` |

### 2.2 Nhóm ĐỔI — `.github/workflows/ci.yml` (25 dòng thật, không phải 21)

| symbol | TRƯỚC (nguyên văn) | SAU | dòng |
| --- | --- | --- | --- |
| `binary_path` | `binary_path: packages/coding-agent/binaries/omp-linux-x64,` | đổi tiền tố | 776, 785, 793, 802, 810, 821, 909, 922 |
| shim trong container | `docker run --rm -v "$binary:/usr/local/bin/omp:ro" alpine:3.22 sh -ec '` | `/usr/local/bin/<NEW>:ro` | 864 |
| **gọi shim** | `… XDG_DATA_HOME="$runtime_dir/xdg" omp --version` | `<NEW> --version` | **867** ⚠ *plan bỏ sót* |
| **gọi shim** | `… XDG_DATA_HOME="$runtime_dir/xdg" omp --smoke-test` | `<NEW> --smoke-test` | **868** ⚠ *plan bỏ sót* |
| upload artifact | `name: omp-binary-${{ matrix.target_id }}` | `name: <NEW>-binary-…` | 873, 994 |
| upload artifact (win) | `name: omp-binary-win32-arm64` | `name: <NEW>-binary-win32-arm64` | 1019 |
| **download pattern** | `pattern: omp-binary-*` | `pattern: <NEW>-binary-*` | **1162** ⚠ *plan bỏ sót — đổi 873/994/1019 mà bỏ 1162 = artifact không được tải về* |
| smoke dir | `$runtimeDir = Join-Path $env:RUNNER_TEMP "omp-smoke"` | `"<NEW>-smoke"` | 1024 |
| **gọi binary Windows** | `& "packages/coding-agent/binaries/omp-windows-arm64.exe" --version` | đổi tiền tố | **1030** ⚠ *plan bỏ sót — job smoke Windows đỏ nếu quên* |
| **gọi binary Windows** | `& "packages/coding-agent/binaries/omp-windows-arm64.exe" --smoke-test` | đổi tiền tố | **1032** ⚠ *plan bỏ sót* |
| glob upload | `packages/coding-agent/binaries/omp-* \` | `<NEW>-*` | 1175, 1185 |
| **codesign** | `codesign --verify --strict --verbose=4 ./omp-darwin-arm64` | `./<NEW>-darwin-arm64` | 1210, 1211 |
| **notarize** | `HOME=… ./omp-darwin-arm64 --version` | `./<NEW>-darwin-arm64` | 1213 |
| **notarize** | `HOME=… ./omp-darwin-arm64 --smoke-test` | `./<NEW>-darwin-arm64` | **1214** ⚠ *plan bỏ sót* |
| **adhoc check** | `if codesign -dvvv ./omp-darwin-arm64 2>&1 \| grep -qE "flags=.*adhoc\|Signature=adhoc"; then` | `./<NEW>-darwin-arm64` | **1218** ⚠ *plan bỏ sót* |
| **spctl** | `spctl -a -t exec -vv ./omp-darwin-arm64 \|\| echo "spctl non-zero …"` | `./<NEW>-darwin-arm64` | **1225** ⚠ *plan bỏ sót* |
| browser-relay zip | `packages/browser-relay/dist/omp-browser-relay-extension.zip \` | `<NEW>-browser-relay-extension.zip` | 1176, 1186 |
| brew formula | `bun scripts/ci-update-brew-formula.ts "…" --out homebrew-tap/Formula/omp.rb` | `Formula/<NEW>.rb` | 1321 |
| **brew diff-check** | `if git diff --quiet -- Formula/omp.rb; then` | `Formula/<NEW>.rb` | **1323** ⚠ *plan bỏ sót — đổi 1321 mà bỏ 1323 ⇒ job luôn "không có diff" ⇒ tap không bao giờ được commit* |
| brew commit | `commit -m "omp ${{ … release-tag }}" -- Formula/omp.rb` | đổi cả message lẫn path | 1329 |

**Quan trọng — 3 dòng `oh-my-pi` trong ci.yml KHÔNG thuộc W10:** `:326` (`npm view @oh-my-pi/pi-natives-linux-x64@latest`) và `:1035` (comment về `@oh-my-pi/pi-natives-<tag>`) là **npm scope** → thuộc W7. Plan xếp chúng vào nhóm ĐỔI; đổi chúng ở W10 là sửa sang tên scope mà W7 chưa quyết. **Xếp vào GIỮ, chờ W7.**

### 2.3 Nhóm ĐỔI — installer (đường cài primary)

| path | symbol | TRƯỚC | SAU | dòng |
| --- | --- | --- | --- | --- |
| `scripts/install.sh` | `install_binary` | `BINARY="omp-${PLATFORM}-${ARCH}"` | `BINARY="<NEW>-${PLATFORM}-${ARCH}"` | 241 |
| `scripts/install.sh` | dựng URL | `BINARY_URL="https://github.com/${REPO}/releases/download/${LATEST}/${BINARY}"` | giữ nguyên hình dạng | 266 |
| `scripts/install.sh` | ghi file | `curl … "$BINARY_URL" -o "${INSTALL_DIR}/omp"` | `-o "${INSTALL_DIR}/<NEW>"` | 268 |
| `scripts/install.sh` | chmod | `chmod +x "${INSTALL_DIR}/omp"` | `"${INSTALL_DIR}/<NEW>"` | 269 |
| `scripts/install.sh` | smoke | `if ! SMOKE_OUTPUT="$("${INSTALL_DIR}/omp" --version 2>&1)"; then` | `"${INSTALL_DIR}/<NEW>"` | 276 |
| `scripts/install.sh` | báo lỗi | `echo "✗ omp was downloaded to ${INSTALL_DIR}/omp but cannot start:"` | đổi cả hai vế | 278 |
| `scripts/install.sh` | báo lỗi musl | `… Install them, then re-run 'omp':` | `'…'` | 282 |
| `scripts/install.sh` | báo thành công | `echo "✓ Installed omp to ${INSTALL_DIR}/omp"` | đổi cả hai | 293 |
| `scripts/install.sh` | thông báo | `echo "✓ Installed omp via bun"` / `echo "Run 'omp' to get started!"` | đổi | 214, 215 |
| `scripts/install.sh` | thông báo PATH | `echo "Run 'omp' to get started!"` / `echo "Add ${INSTALL_DIR} to your PATH, then run 'omp'"` | đổi | 297, 298 |
| `scripts/install.ps1` | `$BinaryName` | `$BinaryName = "omp-windows-$NativeArchitecture.exe"` | `"<NEW>-windows-$NativeArchitecture.exe"` | 49 |
| `scripts/install.ps1` | `$OutPath` | `$OutPath = Join-Path $InstallDir "omp.exe"` | `"<NEW>.exe"` | 308 |
| `scripts/install.ps1` | thông báo | `Write-Host "[OK] Installed omp via bun"` / `"Run 'omp' to get started!"` / `"[OK] Installed omp to $OutPath"` / `"… then run 'omp' to get started!"` | đổi | **277, 281, 312, 325, 327** ⚠ *plan chỉ nêu 5/10 dòng* |

**Hợp đồng hai vế (bắt buộc):** `install.sh:241` sinh **TÊN ASSET**, `install.sh:268` ghi **TÊN NHỊ PHÂN**. Tách = người dùng tải đúng file nhưng nhận tên file cũ (hoặc ngược lại) → 404 hoặc shim hỏng. `scripts/musl-release.test.ts` bắt đúng hợp đồng này — xem §4.

### 2.4 Nhóm ĐỔI — Docker (hai file CÙNG LÚC)

| path | dòng | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `Dockerfile` | 3 | `# oh-my-pi — pi image` | header |
| `Dockerfile` | 13, 14, 17, 18, 21, 186 | `#     docker build -t oh-my-pi/pi:dev .` … `docker run --rm oh-my-pi/pi:dev --help` | tag mới |
| `Dockerfile` | 180 | `    > /usr/local/bin/omp \` | `> /usr/local/bin/<NEW>` |
| `Dockerfile` | 181 | `    && chmod +x /usr/local/bin/omp` | `<NEW>` |
| `Dockerfile` | 216 | `ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/omp"]` | `<NEW>` |
| `Dockerfile.robomp` | 5 | `# Extends \`pi-base\` (from /Dockerfile, default target oh-my-pi/pi:dev) and adds` | tag mới |
| `Dockerfile.robomp` | 12 | `#     bun run pi:image   # build oh-my-pi/pi:dev first` | tag mới |
| `Dockerfile.robomp` | **19** | `ARG PI_BASE=oh-my-pi/pi:dev` | `ARG PI_BASE=<ORG>/<NEW>:<TAG>` |
| `Dockerfile.robomp` | 41 | `FROM ${PI_BASE} AS runtime` | giữ `${PI_BASE}`; **stage tên `runtime`, KHÔNG phải `pi-base`** |
| `Dockerfile.dockerignore` | 1 | `# Build context for the pi-root \`Dockerfile\` (oh-my-pi/pi:dev). Shadows` | tag mới |

**Quan trắc đã kiểm:** `Dockerfile` có stage `pi-base` (`:118 FROM python:3.12-slim-bookworm AS pi-base`) và `pi-runtime` (`:189 FROM pi-base AS pi-runtime`); target mặc định là `pi-runtime` (FROM cuối). `Dockerfile.robomp:19` trỏ `oh-my-pi/pi:dev` = tag của target mặc định. Nếu đổi tên stage `pi-base` ở `Dockerfile` mà không sửa `:189 FROM pi-base`, image không build được.
**Không đụng** `.dockerignore:32`, `Dockerfile.dockerignore:27`, `Dockerfile.robomp.dockerignore:32` — đều là `.omp/plugins/`, path thuộc W4/W6.

### 2.5 Nhóm ĐỔI — nix (dùng SỐ DÒNG THẬT, không phải số trong plan)

| path | dòng thật | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- | --- |
| `nix/package.nix` | **98** ✓ | `pname` | `pname = "omp-bun-runtime-template";` | `<NEW>-bun-runtime-template` |
| `nix/package.nix` | **115** ✓ | `pname` | `pname = "omp";` | `pname = "<NEW>";` — **phải khớp `flake.nix:103,106,107`** |
| `nix/package.nix` | 204 | log | `echo "Compiling OMP"` | `echo "Compiling <NEW>"` |
| `nix/package.nix` | 214 | install | `install -Dm755 packages/coding-agent/dist/omp "$out/bin/omp"` | `dist/<NEW>` → `$out/bin/<NEW>` |
| `nix/package.nix` | 215 | install | `install -Dm644 LICENSE "$out/share/doc/omp/LICENSE"` | `$out/share/doc/<NEW>/LICENSE` |
| `nix/package.nix` | 216 | install | `install -Dm644 THIRD-PARTY-NOTICES.txt "$out/share/doc/omp/THIRD-PARTY-NOTICES.txt"` | `$out/share/doc/<NEW>/…` |
| `nix/package.nix` | 233 | remove-refs | `remove-references-to -t ${bun} "$out/bin/omp"` | `$out/bin/<NEW>` |
| `nix/package.nix` | 250, 251 | comment | `# wrapProgram: the wrapper replaces $out/bin/omp …` / `# to $out/bin/.omp-wrapped.` | cosmetic |
| `nix/package.nix` | 253 | patchelf | `patchelf --add-needed libstdc++.so.6 "$out/bin/omp"` | `$out/bin/<NEW>` |
| `nix/package.nix` | 254 | wrapProgram | `wrapProgram "$out/bin/omp" \` | `$out/bin/<NEW>` |
| `nix/package.nix` | 269 | comment | ``# `.omp-wrapped`.`` | cosmetic |
| `nix/package.nix` | 271 | fix-dt-verdef | `bun ${../scripts/fix-dt-verdef.ts} "$out/bin/.omp-wrapped"` | `$out/bin/.<NEW>-wrapped` |
| `nix/package.nix` | 277, 279 | comment | `# … masks a signal death of omp` / `# … surfaces omp's` | false-positive EN, BỎ QUA |
| `nix/package.nix` | 281 | smoke | `smokeOutput="$(HOME="$TMPDIR" "$out/bin/omp" --smoke-test)"` | `$out/bin/<NEW>` |
| `nix/package.nix` | 283, 288, 302 | exec | `BUN_BE_BUN=1 "$out/bin/omp" -e \` | `$out/bin/<NEW>` |
| `nix/package.nix` | 293 | patchelf | `patchelf --print-needed "$out/bin/.omp-wrapped" \| grep -q '^libstdc\+\+\.so\.6$'` | `.<NEW>-wrapped` |
| `nix/package.nix` | **311** | `homepage` | `homepage = "https://omp.sh";` | quyết định domain (chung với `ci-update-brew-formula.ts:15`) |
| `nix/package.nix` | **314** | `mainProgram` | `mainProgram = "omp";` | `mainProgram = "<NEW>";` |
| `flake.nix` | 103, 106, 107 | attr | `omp = packageFor system;` / `inherit omp;` / `default = omp;` | `<NEW> = packageFor system;` … |
| `flake.nix` | 114 | `apps.program` | `program = "${self.packages.${system}.default}/bin/omp";` | `/bin/<NEW>` |
| `flake.nix` | 117 | `apps` | `omp = self.apps.${system}.default;` | `<NEW>` |
| `flake.nix` | 174, 177 | check tên | `pkgs.runCommand "omp-module-evaluation" { }` / `pkgs.runCommand "omp-bun-lock" {` | `"<NEW>-module-evaluation"`, `"<NEW>-bun-lock"` |
| `flake.nix` | 188, 195 | attr | `omp = self.packages.${system}.default;` | `<NEW>` |
| `flake.nix` | 199, 201 | module | `homeManagerModules.omp = self.homeManagerModules.default;` / `nixosModules.omp = …` | `.default` giữ nguyên (người dùng gọi bằng tên) — xem §6 |

**Neo ghép phải khớp:** `flake.nix:171` `assert homeManagerEvaluation.config.home.activation ? ompConfig;` ↔ `nix/home-manager.nix:53` `home.activation.ompConfig = …`. Đổi một vế ⇒ `nix flake check` đỏ. **Khuyến nghị giữ cả hai** (xem §6).

### 2.6 Nhóm GIỮ — không đổi một byte

| path | dòng | nội dung | vì sao giữ |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | 159, 229, 285, 513, 567, 598, 621, 639, 657, 675, 695, 711 | `runs-on: … 'omp-kata'` / `runs-on: omp-kata` | nhãn runner scale set ARC đăng ký ngoài repo |
| `.github/workflows/ci.yml` | 85, 108, 186, 573 | comment tiếng Anh chứa `omp-kata` | prose |
| `.github/workflows/ci.yml` | 34 | `branches: [main, omp2]` | trigger filter — hỏi maintainer, đừng tự xoá |
| `.github/workflows/ci.yml` | 578 | `# rulesets are off for main/omp2)…` | comment |
| `.github/actionlint.yaml` | 2, 6 | `# runner scale set … \`runs-on: omp-kata\`` / `      - omp-kata` | allowlist nhãn; **actionlint KHÔNG chạy trong CI** (đã kiểm: `grep -rn 'actionlint' .github/workflows/ scripts/ package.json` → rỗng) |
| `.github/actions/bun-install/action.yml` | 5, 6, 16, 54, 95, 104 | comment prose về runner image | |
| `.github/actions/bazel-cache/action.yml` | 7 | `omp-kata jobs use the cluster remote cache.` | |
| `.github/actions/bazel-natives/action.yml` | 5 | comment | |
| `.github/actions/native-artifacts/action.yml` | 6 | comment | |
| `.github/workflows/bazel-cache-warm.yml` | 97 | comment | |
| `.dockerignore` | 32 | `.omp/plugins/` | path, W4/W6 |
| `Dockerfile.dockerignore` | 27 | `.omp/plugins/` | path |
| `Dockerfile.robomp.dockerignore` | 32 | `.omp/plugins/` | path |
| `scripts/install.ps1` | 29 | `$env:LOCALAPPDATA\omp` | path |
| `scripts/install.ps1` | 149 | `Join-Path $env:USERPROFILE ".omp\agent"` | path |
| `scripts/install.ps1` | 225 | `"omp-install-" + [System.Guid]::NewGuid()…` | path tạm |
| `nix/home-manager.nix` | 57, 58 | `run mkdir -p "$HOME/.omp/agent"` / `run install -m 600 ${configFile} "$HOME/.omp/agent/config.yml"` | path, W4/W6 |
| `nix/home-manager.nix` | 9, 14 | `cfg = config.programs.omp;` / `options.programs.omp = {` | **option người dùng viết trong `home.nix`** — xem §6 |
| `nix/nixos-module.nix` | 9, 12, 18 | `cfg = config.programs.omp;` / `options.programs.omp = {` / `defaultText = … "inputs.omp.packages.…"` | **cùng option, bản NixOS** — plan nói file này "không có hit", SAI |
| `nix/dev-shell.nix` | 18 | `name = "omp-dev";` | cosmetic, có thể giữ |
| `nix/home-manager.nix` | 11, 20, 28 | `yaml.generate "omp-config.yml" …` / `defaultText = … "inputs.omp.packages.…"` / ``{file}`~/.omp/agent/config.yml` `` | 11 = tên file Nix sinh ra, chỉ dùng bởi `:58`; 20/28 = text hiển thị |
| `packages/utils/src/dirs.ts` | 22 | `export const APP_NAME: string = "omp";` | thuộc W1/W3 — nhưng **đây là gốc của toàn chuỗi tên** |
| `packages/utils/src/dirs.ts` | 25, 37 | `APP_URL = "https://omp.sh/"` / `USER_AGENT = \`omp/${VERSION}\`` | thuộc N9 |

### 2.7 BỎ QUA — false-positive tiếng Anh (12 lượt / 11 dòng trong `ci.yml`)

Đã đo: `grep -o 'omp' .github/workflows/ci.yml \| wc -l` → **65**; `grep -c 'omp'` → **62 dòng**. Trong đó 12 lượt / 11 dòng là tiếng Anh:

`:163` `compliance` · `:166` `compiled` · `:200` `compares` · `:296` `Compute` · `:814` `cross-compiled` · `:849` `--compile` + `cross-compile.` · `:891` `cross-compiles` · `:892` `cross-compiles` · `:948` `compressing` · `:1006` `--compile` · `:1106` `completion`

Lưu ý `Compute` VIẾT HOA và `compares` (không phải `computes` — `grep -c 'computes' .github/workflows/ci.yml` → 0). Brand thật = 53 lượt / 51 dòng.

**Bỏ qua thêm 8 dòng trong `nix/package.nix`:** 142 `libgcc_s` · 219 `gzip-compressed` · 236 `omp bun-installs` · 262 `bun --compile` · 269 `` `.omp-wrapped` `` (comment của 271) · 277 `death of omp` · 279 `surfaces omp's` · 251/250 là comment mô tả dòng 254/271 (ĐỔI KÈM, cosmetic).

**Và 8 dòng trong `scripts/install-tests/settings-session.ts`** — plan gọi đây là "9 lượt `omp` … sửa phần tên lệnh, GIỮ phần path `.omp`". **Sai cả hai vế:** file này **không có tên lệnh nào** (binary đến qua `argv` ở `:8 const cli = process.argv.slice(2)…`) và **không có path `.omp` nào** (`agentDir` ở `:12` nằm trong thư mục tạm). 8/9 hit là tiếng Anh: `:17` *c**omp**letes* · `:39` `chat.**comp**letion.chunk` · `:73` `openai-**comp**letions` · `:112` `pr**omp**tTemplates` · `:152`,`:153` `sessions[0].pr**omp**t(…)` · `:214` `did not c**omp**lete`. Chỉ `:10 "omp-settings-session-"` là brand thật. **`sed 's/omp/<NEW>/g'` trên file này sẽ hỏng 8 chỗ.**

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

> **Bước 0 (MỚI — chặn).** `scripts/rename/` **chưa tồn tại** (đã kiểm: `ls scripts/rename/` → `No such file or directory`). Bước 1 của plan là DỪNG chờ nó. Nhưng W10 đóng góp 4 mục keep-list (`omp-kata`, `https://omp.sh`, `programs.omp`, tên nhị phân installer). **Chốt trước:** W10 được tạo file này trong chính commit đó, hay chờ W7?

1. **DỪNG** — xác nhận `scripts/rename/keep-list.txt` tồn tại và do người duyệt khác viết. Kiểm tra: `ls scripts/rename/keep-list.txt`. Trạng thái: **chưa tồn tại**.
2. **Thêm tấm chắn homebrew TRƯỚC khi đổi tên.** `package.json:87` (⚠ **không phải :91**) — chèn `scripts/ci-update-brew-formula.test.ts` vào `"test:scripts"`, trước `scripts/release.test.ts`. Chạy `bun test scripts/ci-update-brew-formula.test.ts` → phải xanh **trước** khi đổi bất kỳ tên nào. Bằng chứng nền đã chạy: **2 pass / 0 fail** (⚠ plan ghi 3).
3. **Chụp baseline asset.** `git grep -n 'outfile: "packages/coding-agent/binaries/' scripts/ci-release-build-binaries.ts > /tmp/w10-assets-before.txt`. Neo: `scripts/ci-release-build-binaries.ts:37,44,51,58,65,72,79,86` (8 literal `omp-*`; thứ tự thật: darwin-arm64, darwin-x64, **linux-x64(51)**, **linux-arm64(58)**, linux-musl-x64, linux-musl-arm64, windows-x64.exe, windows-arm64.exe).
4. **ĐỔI TÊN ASSET — CẢ HAI VẾ CÙNG MỘT COMMIT.** Producer: 8 dòng `outfile`. Consumer: `scripts/ci-update-brew-formula.ts:76,78,81,83,89,91,94,96,101,102,104,109,120` **+ fixture `scripts/ci-update-brew-formula.test.ts:5,6,7,8,21,35`**. `update-cli.ts` **không sửa** (đọc `APP_NAME` ở `:1208,:1210`).
5. **ĐỔI DOCKER — hai file CÙNG LÚC.** `Dockerfile:3,13,14,17,18,21,180,181,186,216` + `Dockerfile.robomp:5,12,19` + `Dockerfile.dockerignore:1`. Bắt buộc `Dockerfile.robomp:19 ARG PI_BASE` trỏ tới tag mà `Dockerfile` build ra (target mặc định `pi-runtime`, `Dockerfile:189`). Kiểm: `grep -n 'ARG PI_BASE\|FROM ${PI_BASE}\|^FROM ' Dockerfile Dockerfile.robomp` rồi đối chiếu tay từng cặp.
6. **GIỮ NHIỀU HƠN MỌI.** `git grep -n '\.omp' -- .dockerignore Dockerfile.dockerignore Dockerfile.robomp.dockerignore nix/home-manager.nix` → phải khớp baseline. Neo: `.dockerignore:32`, `Dockerfile.dockerignore:27`, `Dockerfile.robomp.dockerignore:32`, `nix/home-manager.nix:57,58`.
7. **ĐỔI NIX.** `nix/package.nix` — dùng **SỐ DÒNG THẬT ở §2.5**, không phải số trong plan. `flake.nix:103,106,107,114,117,171,174,177,188,195,199,201`. `pname` (`:115`) và `mainProgram` (`:314`) phải khớp attr ở `flake.nix:103`. `flake.nix:171` ↔ `nix/home-manager.nix:53` là khoá ghép.
8. **ĐỔI INSTALLER.** `scripts/install.sh:241,266,268,269,276,278,282,293,214,215,297,298` + `scripts/install.ps1:49,308,277,281,312,325,327`. Giữ `install.ps1:29,149,225`. ⚠ **Phải sửa cùng lúc `scripts/musl-release.test.ts:87,88`** — xem §4.
9. **CHỐT CHỒNG LẤN TRƯỚC KHI CODE.** `scripts/install-tests/run-ci.sh` mang ba thứ: tên tarball theo scope (`:164,170,173,190,196,199,206,221,222` → W7), tên nhị phân (`:94,95,103,235` → W9), ma trận cài (→ W10). Chọn một chủ sở hữu, ghi vào PR. **Hợp đồng hai file:** `OMP_INSTALL_TEST_SKIP_NATIVE_BUILD` đọc ở `run-ci.sh:86`, đặt ở `ci.yml:723` (đã kiểm: `OMP_INSTALL_TEST_SKIP_NATIVE_BUILD: "1"`) — sửa cả hai cùng lúc, nếu không CI **âm thầm build native thay vì bỏ qua**.
10. **ĐỔI CI.** Dùng BẢNG QUYẾT ĐỊNH §2.2, **không dùng `sed`**. Nhóm GIỮ: 12 dòng `runs-on:` + 4 comment `omp-kata`, `:34`, `:578`, 2 npm scope `:326,:1035`, 12 false-positive EN.
11. **XÁC NHẬN NHIỀU HƠN MỘT Ở `.github/`.** `grep -rn 'omp-kata' .github/` → phải ra **28 dòng trên 7 file** (ci.yml 16, actionlint.yaml 2, bun-install 6, bazel-cache 1, bazel-natives 1, native-artifacts 1, bazel-cache-warm 1). Vì **không có tấm chắn tự động nào** cho nhãn runner, bắt buộc `git diff .github/ | grep -i kata` trước khi merge.
12. **ĐỐI CHIẾU ASSET HAI VẾ.** Chạy assertion trong §5 — nó bắt được **cả hai chiều** (đã thử: đổi tên producer `:37` → in `MISSING producer outfile: [ "omp-darwin-arm64" ]`, exit 1).
13. Cập nhật keep-list 4 mục, chạy `git grep -c -f scripts/rename/keep-list.txt`.
14. Chạy cổng §5. **Kỳ vọng 35 pass, không phải 37** (đã đo).
15. **MA TRẬN CÀI ĐẶT** — `bash scripts/install-tests/run-ci.sh`. Sau khi chạy: `git diff --quiet HEAD -- packages/natives/package.json`. Script có `trap restore_workspace` ở `:14-18` nhưng **đừng tin nó** — so với `HEAD` để bắt cả phần đã staged. Trên máy này: `docker` có, `podman` không.

---

## 4. Hợp đồng test

**Không viết test mới** (AGENTS.md cấm bản sao). Nhưng danh sách file test của plan **thiếu 3 file đang assert trực tiếp vào những thứ W10 đổi** — bỏ sót là cổng đỏ ngay ở commit đầu tiên:

| file test | dòng | assert gì | nếu hồi quy, người dùng thấy gì |
| --- | --- | --- | --- |
| `scripts/musl-release.test.ts` **⚠ plan không liệt kê** | `:87` | `expect(result.stdout).toContain("Downloading omp-linux-musl-x64...")` | đổi `install.sh:241` mà quên test ⇒ `curl` tải tên cũ ⇒ **`curl … \| sh` 404 cho mọi người dùng Linux** |
| `scripts/musl-release.test.ts` **⚠** | `:88` | `expect(await Bun.file(path.join(installDir, "omp")).text())` | đổi `install.sh:268` (tên file ghi) mà quên ⇒ binary được tải về tên khác, `omp` trong PATH không chạy được |
| `scripts/musl-release.test.ts` | `:71` | fake curl ghi `echo "omp v1.0.0"` | fixture |
| `scripts/ci-update-brew-formula.test.ts` | `:5-8,21,35` | fixture `SUMS` + regex `bin/"omp"` | **`brew install` sống vỡ** — công thức không còn khớp sha |
| `scripts/ci-release-build-binaries.test.ts` | `:19,21,23,25` | `expect(output).toContain("… outfile=packages/coding-agent/binaries/omp-windows-x64.exe")` | producer Windows lệch |
| `scripts/ci-release-publish.test.ts` | — | bản đồ bin (11 test) | npm `bin` lệch |
| `scripts/release.test.ts` | — | (16 test) | |
| `scripts/musl-release.test.ts` | — | (2 test) | |
| `packages/coding-agent/test/update-cli.test.ts` **⚠ plan không liệt kê** | `:418,442,968,1025,1455,1670` (+ URL repo `can1357/oh-my-pi` ở `:969,1456`) | `binaryName` hardcode | đổi `APP_NAME` ở W1/W3 ⇒ **`bun test packages/coding-agent` đỏ**, updater test hỏng |

**Điều người dùng thấy nếu hồi quy, theo kịch bản thật nhất:** đổi tên asset ở producer mà không đổi consumer (hoặc ngược lại) ⇒ người cài mới chạy `curl -fsSL https://omp.sh/install \| sh` và nhận **`curl: (22) The requested URL returned error: 404`**; người dùng Homebrew nhận `curl: (22) … 404` từ `CurlDownloadStrategy`, hoặc `SHA256 mismatch`. Cả hai đều **ở đường cài primary**, không phải đường dev.

---

## 5. Cổng

### 5.1 Cổng của plan: **ĐỎ ĐƯỢC, nhưng kỳ vọng ghi sai**

```bash
bun run check:ts && bun test scripts/ci-release-build-binaries.test.ts scripts/musl-release.test.ts scripts/ci-release-publish.test.ts scripts/release.test.ts scripts/ci-update-brew-formula.test.ts && bun -e '
const p = await Bun.file("scripts/ci-release-build-binaries.ts").text();
const c = await Bun.file("scripts/ci-update-brew-formula.ts").text();
const produced = [...p.matchAll(/outfile: "packages\/coding-agent\/binaries\/([^"]+)"/g)].map(m => m[1]);
const block = [...c.matchAll(/const targets = \[([^\]]*)\]/gs)][0][1];
const wanted = [...block.matchAll(/"([^"]+)"/g)].map(m => m[1]);
const missing = wanted.filter(n => !produced.includes(n));
if (missing.length) { console.error("MISSING producer outfile:", missing); process.exit(1); }
console.log("asset map ok:", produced.length, "produced,", wanted.length, "consumed");
' && git diff --quiet HEAD -- packages/natives/package.json
```

**Đã chạy thật trên `47720fd`:**
- `bun run check:ts` → **exit 0** (~75 s)
- 5 file test → **`35 pass / 0 fail` / 98 expect / 3.26 s** — ⚠ **không phải 37**. Số thật từng file: `ci-release-build-binaries` 4 · `musl-release` 2 · `ci-release-publish` 11 · `release` **16** (plan ghi 17) · `ci-update-brew-formula` **2** (plan ghi 3).
- assertion → `asset map ok: 8 produced, 4 consumed`, **exit 0**
- `git diff --quiet HEAD -- packages/natives/package.json` → exit 0

**Lý do kỳ vọng 37 là sai:** 37 là kết quả của `bun run test:scripts` (**5 file khác** — gồm `ci-test-ts.test.ts`, không có `ci-update-brew-formula.test.ts`). Cổng của plan đổi danh sách 5 file nhưng giữ nguyên con số của danh sách cũ. Phép tính thật: 4+2+11+16+2 = **35**.

**Lý do lý do "bỏ `test:scripts` vì thiếu addon" đã lỗi thời:** trên máy này `bun run test:scripts` chạy **37 pass / 0 fail** (addon đã build — commit `47720fd` ghi rõ: *"the native addon is built, so 'bun test is blocked' is false"*). `scripts/ci-test-ts.test.ts` chạy **4 pass / 0 fail**.

### 5.2 Cổng viết lại cho đúng (khuyến nghị dùng bản này)

```bash
bun run test:scripts && bun run check:ts && bun -e '
const p = await Bun.file("scripts/ci-release-build-binaries.ts").text();
const c = await Bun.file("scripts/ci-update-brew-formula.ts").text();
const produced = [...p.matchAll(/outfile: "packages\/coding-agent\/binaries\/([^"]+)"/g)].map(m => m[1]);
const block = [...c.matchAll(/const targets = \[([^\]]*)\]/gs)][0][1];
const wanted = [...block.matchAll(/"([^"]+)"/g)].map(m => m[1]);
const missing = wanted.filter(n => !produced.includes(n));
if (missing.length) { console.error("MISSING producer outfile:", missing); process.exit(1); }
console.log("asset map ok:", produced.length, "produced,", wanted.length, "consumed");
' && git diff --quiet HEAD -- packages/natives/package.json
```

Sau khi làm bước 2 (`ci-update-brew-formula.test.ts` vào `test:scripts`), kỳ vọng là **39 pass / 0 fail** (4 ci-test-ts + 4 + 2 + 11 + 16 + 2).
`bun run test:scripts` tự động phủ nhánh homebrew sau khi thêm file — đúng mục tiêu của bước 2, và không tạo ra một danh sách 5 file phải đồng bộ thủ công.

**Cổng này có ĐỎ ĐƯỢC không, bằng cách nào:**

| phần | bắt được hồi quy nào | đã kiểm chứng |
| --- | --- | --- |
| `bun run test:scripts` (6 file) | asset lệch consumer (đổi URL/sha/fixture trong `ci-update-brew-formula.ts`) | plan đã thử: đổi `:76` → đỏ |
| assertion `asset map ok` | asset lệch producer (đổi 1 `outfile`) — **chiều nguy hiểm, mà 6 file test KHÔNG bắt** | **đã thử trên bản sao: `MISSING producer outfile: [ "omp-darwin-arm64" ]`, exit 1** |
| `bun run check:ts` | type/lint hỏng sau đổi | exit 0 |
| `git diff --quiet HEAD -- packages/natives/package.json` | `run-ci.sh` để bẩn `package.json` | exit 0 |

**Phạm vi cổng — nói thẳng những gì nó KHÔNG bắt:**
- **Không đọc** `nix/*`, `flake.nix`, `Dockerfile*`, `.github/**`, `scripts/install.ps1`, `scripts/rename/keep-list.txt`.
- Bắt được `install.sh` **một phần**: `musl-release.test.ts` chạy `sh scripts/install.sh --binary` với curl giả (đã đọc `:78-88`), nên bắt lệch TÊN ASSET ↔ TÊN NHỊ PHÂN ở `install.sh` — **nhưng chỉ nhánh musl, và KHÔNG bắt `install.ps1`**.
- **Nhãn runner `omp-kata`**: không tấm chắn tự động nào (actionlint không chạy trong CI — đã kiểm). Phải soi tay `git diff .github/ | grep -i kata`.
- **`nix`**: máy này `command -v nix` → **không có** ⇒ `nix flake check` **CHƯA CHẠY**, tuyệt đối không tính là pass.
- **Ma trận cài**: `docker` có, `podman` không. `run-ci.sh` dùng gì? Phải ghi "CHƯA CHẠY" nếu không chạy được.

---

## 6. Cạm bẫy riêng của W10

1. **25 neo hỏng, tập trung ở `nix/package.nix` (17/19 lệch +5…+6).** Sửa "cho gần đúng" = sửa sai dòng. Bắt buộc dùng số ở §2.5. Đặc biệt `pname` ở `:115` và `mainProgram` ở `:314` là hai dòng **duy nhất quyết định danh tính package** — sai là đổi tên store path và phá `flake.nix`.
2. **`sed` không phân biệt sẽ phá 12 hit ở `ci.yml` + 8 ở `nix/package.nix` + 8 ở `settings-session.ts` = 28 dòng.** Riêng `settings-session.ts` nguy hiểm nhất: `prompt`, `completes`, `chat.completion.chunk`, `openai-completions`, `promptTemplates`, `complete` — tất cả chứa `omp`. Dùng **bảng quyết định**, không dùng `sed`.
3. **9 dòng `ci.yml` mà plan bỏ sót, trong đó 3 dòng làm job chết âm thầm:** `1162` (`pattern: <NEW>-binary-*`) đổi mà quên ⇒ artifact **không tải về**; `1323` (`git diff --quiet -- Formula/<NEW>.rb`) đổi mà quên ⇒ tap **không bao giờ được commit**; `1030`/`1032` (gọi binary Windows) ⇒ job smoke Windows đỏ. Ba dòng này **không đỏ ở local, chỉ đỏ trên CI**.
4. **`ci.yml:326` và `:1035` là npm scope, KHÔNG phải brand.** Plan xếp vào nhóm ĐỔI — đổi ở W10 là sửa sang tên scope mà W7 chưa quyết. Xếp GIỮ.
5. **`programs.omp` xuất hiện ở HAI file, không phải một.** Plan chỉ nêu `nix/home-manager.nix:9,14` và nói `nixos-module.nix` "không có hit" — SAI, `nixos-module.nix:9,12,18` khai báo option thứ hai. Quyết định "giữ" phải phủ cả hai, cộng `flake.nix:151,152,166` (`programs.omp.enable = true;` trong test eval) và `flake.nix:20`-style `defaultText` chứa `inputs.omp.packages`.
6. **Hợp đồng ba chân của `install.sh`:** `:241` (tên asset) → `:266` (URL) → `:268` (tên file ghi). Tách vế = 404 cho người dùng. `musl-release.test.ts:87,88` là tấm chắn, nhưng **file đó không nằm trong bảng "File cần chạm tới"** — phải thêm vào diff.
7. **`OMP_INSTALL_TEST_SKIP_NATIVE_BUILD` là hợp đồng hai file** (`run-ci.sh:86` đọc, `ci.yml:723` đặt). Đổi tên một vế ⇒ CI **âm thầm build native** thay vì bỏ qua — chậm hơn, không đỏ. Đây là loại hỏng không ai thấy.
8. **`nix flake check` không chạy được trên máy này** (`nix` không có). Toàn bộ rủi ro `pname`/`mainProgram`/`ompConfig` nằm ở đó mà cổng không đụng tới. Ghi "CHƯA CHẠY" vào PR.
9. **Số file trong diff ≠ 30.** Bảng có 33 dòng, trong đó 2 dòng "KHÔNG SỬA" ⇒ 31 file sửa + 1 file tạo. Nếu còn sửa thêm `scripts/musl-release.test.ts` (bắt buộc) ⇒ **32 sửa + 1 tạo = 33 file**. Bước review của plan ("đảm bảo số file khớp 30 dòng") sẽ bắt nhầm một diff đúng. Sửa con số thành **33** trước khi review.
10. **`OMP_REPO` dùng chung 5 chỗ** — `ci-update-brew-formula.ts:14`, `ci-release-notes.ts:36`, `fix-changelogs.ts:12`, `ci-macos-upload-secrets.sh:32`, `fix-changelogs.test.ts:442` (đã kiểm từng dòng). Không chỗ nào trong CI đặt nó ⇒ **mặc định là thứ duy nhất có tác dụng**. Đổi tên biến là hợp đồng tương thích; đổi mặc định thì nên giữ `OMP_REPO` làm bí danh. `:14` là nơi **mọi URL** ở `:76,81,89,94` lấy repo — bỏ sót nó ⇒ `brew install` vẫn trỏ repo cũ dù asset đã đổi tên.

### Cần người quyết (chưa tự quyết)

- **`nix/home-manager.nix:9,14` + `nix/nixos-module.nix:9,12,18` — `programs.omp`.** Tên option người dùng viết trong `home.nix`/`configuration.nix` của họ. **Khuyến nghị: giữ nguyên, thêm vào `do_not_rename`** với lý do "tên option là config người dùng viết tay, không phải trạng thái máy" (cùng loại với `.omp` cấp project / N14).
- **`scripts/ci-update-brew-formula.ts:15` `HOMEPAGE = "https://omp.sh"` và `nix/package.nix:311` `homepage = "https://omp.sh";`.** Domain thứ BA đóng attribution (hai cái kia `dirs.ts:25` `APP_URL`, `dirs.ts:37` `USER_AGENT`, đã thuộc N9). **Quyết một lần cho cả hai.** Nếu domain mới chưa resolve ⇒ giữ cũ + keep-list; Formula trỏ host chết thì `brew install` vẫn chạy nhưng attribution hỏng.
- **`README.md:40` (`curl -fsSL https://omp.sh/install | sh`) và `:85` (`irm https://omp.sh/install.ps1 | iex`)** phụ thuộc domain. Nếu domain đổi, phải đổi cùng một lần phát hành. Tài liệu thuộc W13 nhưng W10 sửa `install.sh`/`install.ps1` — hai bên phải thống nhất tên.
- **`ci.yml:34` `branches: [main, omp2]` + comment `:578`.** Đã kiểm: trên `origin` không có nhánh `omp2` (chỉ `main`, `milestone-1`). Có thể là filter chết hoặc chỉ tồn tại trên fork gốc. **Đừng tự ý xoá** — hỏi maintainer.
- **`Cargo.toml:31,32`** (`homepage = "https://omp.sh/"`, `repository = "https://github.com/can1357/oh-my-pi"`) — nằm ngoài bảng file của plan. `repository` trỏ org khác hẳn (`can1357` vs `ultrabuilders`) — có thể là quyết định có chủ ý, đừng đổi bừa. Thuộc W10 hay W13?
- **`scripts/rename/keep-list.txt`** — cho phép W10 tạo trong chính commit, hay chờ W7?
