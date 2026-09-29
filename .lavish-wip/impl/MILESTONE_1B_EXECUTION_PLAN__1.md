# Phiếu triển khai — `## 1. chord`

**Kế hoạch:** `MILESTONE_1B_EXECUTION_PLAN.md` (dòng 595–1032)
**Nguồn:** `/Users/tranquangdang21/Projects/pi-ref` @ `d6af72e18` (`packages/chord`, 62 file / 690 344 byte)
**Đích:** `packages/chord` — **hiện chưa tồn tại** trong `ultraworkers/packages/`
**Ngày kiểm:** 2026-09-29 · bun 1.3.14 · tsgo từ `node_modules/.bin/tsgo`

---

## 1. Cái gì thay đổi, quan sát được

Repo bắt đầu phục vụ `@oh-my-pi/chord` — 148 symbol công khai về facet, replicated state và remote service — nên `pi-server`, `pi-client`, `pi-durable`, `pi-protocol` có thể import được; 298 khối test hợp đồng của chord chạy dưới `bun test` và đỏ nếu ai đó cắt bớt chúng; và `bun run check:ts` ở gốc repo kiểm kiểu được cả `src/` lẫn `test/` của package mới.

---

## 2. Bảng điểm sửa

Cột TRƯỚC trích nguyên văn từ file nguồn; `<TAB>` = ký tự tab thật.

### 2.1 Manifest

| đường/dẫn | symbol / khoá | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/chord/package.json` | `name` | `"name": "@earendil-works/chord",` (nguồn `:2`) | `"name": "@oh-my-pi/chord",` |
| | `version` | `"version": "0.87.1",` (nguồn `:3`) | `"version": "18.4.0"` — **không phải `18.3.3`**, xem §6.1 |
| | `main` / `types` | `"main": "./dist/index.js",` / `"types": "./dist/index.d.ts",` (nguồn `:6-7`) | cả hai → `"./src/index.ts"` |
| | `exports` | 5 subpath tường minh + `"./package.json"` (nguồn `:8-35`) | `{".":{types:"./src/index.ts",import:"./src/index.ts"},"./*":{types:"./src/*.ts",import:"./src/*.ts"},"./*.js":"./src/*.ts"}` |
| | `files` | `["dist","README.md","src/delta/README.md"]` (nguồn `:37-41`) | `["src","README.md","CHANGELOG.md","LICENSE"]` |
| | `scripts` | `clean`/`build`/`test`/`prepublishOnly` (nguồn `:42-47`) | bỏ `clean`+`build`+`prepublishOnly`; `test` → `bun test --parallel`; thêm `check`, `check:types`, `lint`, `fix`, `fmt` y hệt `packages/omptype/package.json` |
| | `author` | `"author": "Earendil Works",` (nguồn `:55`) | `{"name":"Stencil Labs, Inc.","url":"https://stencil.so"}` |
| | `repository.url` | `"url": "git+https://github.com/earendil-works/pi.git",` (nguồn `:59`) | `"git+https://github.com/can1357/oh-my-pi.git"`, `directory: "packages/chord"` |
| | `engines` | `{"node": ">=22.19.0"}` (nguồn `:62-64`) | `{"node": ">=20", "bun": ">=1.3.14"}` (khớp `omptype`) |
| | `dependencies` | `{"esbuild": "0.28.2"}` (nguồn `:65-67`) | giữ nguyên |
| | `devDependencies` | `{"shx":"0.4.0","vitest":"4.1.9"}` (nguồn `:68-71`) | `{"@types/bun":"catalog:"}` |
| | `sideEffects` | `false` (nguồn `:36`) | giữ `false` (`omptype` không đặt khoá này — đúng như kế hoạch ghi) |
| `package.json` (gốc) | `workspaces.catalog` | `"diff": …,` ngay trước `"fastembed": …,` | chèn `"esbuild": "0.28.2",` giữa hai khóa đó |
| `packages/chord/LICENSE` | — | không tồn tại ở nguồn; `pi-ref/LICENSE` 1069 byte, **byte cuối là `.` (0x2E), không có newline** | `Copyright (c) 2025 Mario Zechner` (dòng đầu) → `Copyright (c) 2025-2026 Can Bölük` → `Copyright (c) 2026 Stencil Labs, Inc.`, có newline kết thúc |
| `packages/chord/tsconfig.json` | — | không tồn tại ở nguồn (nguồn chỉ có `tsconfig.build.json` 209 byte) | 133 byte, clone `packages/omptype/tsconfig.json` |

### 2.2 Bốn kiểu viết lại cơ học

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 25 file `src/` | import tương đối | `from "./api.ts"` / `from "../services/loopback.ts"` (84 specifier) | bỏ hậu tố (84) |
| 19 file `test/` | import tương đối | `from "../src/….ts"` (35 specifier) | bỏ hậu tố (35) |
| 7 file | chuỗi scope | `@earendil-works/chord` (24 lần) + `@earendil-works/pi-` (2 lần ở `boundary.test.ts`) | `@oh-my-pi/chord` / `@oh-my-pi/pi-` |
| 5 file `src/` | thụt lề | thụt lề 4-space (98 dòng: `api.ts` 3, `context/index.ts` 6, `delta/index.ts` 73, `index.ts` 2, `types.ts` 14) | tab (oxfmt, `useTabs:true` `tabWidth:3`) |

### 2.3 Ba `ReturnType<>` + một cấu trúc promise

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `src/node/bundle.ts:118` | kết quả build esbuild | `<TAB>let result: Awaited<ReturnType<typeof build>>;` | `<TAB>let result: BuildResult;` + `import type { BuildResult } from "esbuild"` ở top-level |
| `src/node/package.ts:57` | stat package.json | `<TAB>let candidateStats: Awaited<ReturnType<typeof stat>>;` | `<TAB>let candidateStats: Stats;` |
| `src/node/package.ts:182` | stat entry | `<TAB><TAB>let entryStats: Awaited<ReturnType<typeof stat>>;` | `<TAB><TAB>let entryStats: Stats;` + `import type { Stats } from "node:fs"` ở top-level |
| `src/context/index.ts:98-116` | `awaitWithContext` | `<TAB>return new Promise<T>((resolve, reject) => {` … (thân 15 dòng) | `const { promise, resolve, reject } = Promise.withResolvers<T>();` … giữ nguyên `{once:true}`, gỡ listener ở **cả hai** nhánh, reject với `abortError(signal)` |

### 2.4 `retention.test.ts` — viết lại worker spawn (dòng neo trong tài liệu SAI, xem §6.2)

| dòng thật | TRƯỚC | SAU |
| --- | --- | --- |
| `:1` | `import { spawnSync } from "node:child_process";` | xóa dòng; dùng `Bun.spawnSync` |
| `:24-28` | `const child = spawnSync(process.execPath, ["--expose-gc", fileURLToPath(new URL("./retention.worker.ts", import.meta.url)), scenario], { encoding: "utf8", timeout: 60_000 });` | `const child = Bun.spawnSync([process.execPath, "--expose-gc", workerPath, scenario], { stdout: "pipe", stderr: "pipe" });` |
| `:26` | `"./retention.worker.ts"` | `"./retention.worker"` (bỏ hậu tố) |
| `:29` | `expect(child.error, child.stderr).toBeUndefined();` | **xoá hẳn** — `Bun.spawnSync` không có `.error`, xem §6.3 |
| `:30` | `expect(child.status, \`${child.stdout}\n${child.stderr}\`).toBe(0);` | `expect(child.exitCode, \`${child.stdout}\n${child.stderr}\`).toBe(0);` — `Bun.spawnSync` có `exitCode`, **không có `status`** |

### 2.5 Export-star ambiguity — kế hoạch chỉ sai đối tác

| đường/dẫn | TRƯỚC | SAU |
| --- | --- | --- |
| `src/types.ts:4-5` | `export type { RemoteServiceError } from "./services/errors.ts";`<br>`export type { RemoteServiceProvider } from "./services/provider.ts";` | giữ nguyên (đây là chỗ đúng cần xử lý) |
| `src/index.ts:4-85` | 8 khối re-export **có tên** | 6 khối runtime → `export * from`; `export type { Draft } from "./delta/index"` giữ nguyên dạng type-only; khối `./types.ts` → `export * from "./types"` |

**Không có va chạm nào với `services/wire.ts`** — `wire.ts` export **không** `RemoteServiceProvider` lẫn không `RemoteServiceError`. Va chạm thật là giữa `export * from "./types"` với `export * from "./services/errors"` và `export * from "./services/provider"` (index.ts đã star hai cái đó ở `:15-20` và `:21-26`). Nếu bỏ nhầm re-export trong `wire.ts` thì vẫn còn TS2308.

### 2.6 Cạm bẫy: bốn vòng rút drain của omp — **KHÔNG đụng**

| đường/dẫn | dòng thật | nội dung | hành động |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/agent-session.ts` | **5104**, **5346** (tài liệu ghi 4983, 5218) | `for (const dispose of this.#disposers.splice(0)) dispose();` | giữ nguyên |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts` | 112 (đúng) | `for (const dispose of this.#composerShapeDisposers.splice(0)) dispose();` | giữ nguyên |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | **1376** (tài liệu ghi 1347) | `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();` | giữ nguyên |

---

## 3. Các bước (mọi neo đã mở và đọc)

1. **`packages/chord/LICENSE` trước mọi dòng mã.** Chép nguyên văn `pi-ref/LICENSE` (1069 byte), nối thêm hai dòng của omp, thêm newline cuối. Kiểm: `head -4 packages/chord/LICENSE` phải in `MIT License` / trống / `Copyright (c) 2025 Mario Zechner` / `Copyright (c) 2025-2026 Can Bölük`.
2. **esbuild.** Chèn `"esbuild": "0.28.2"` vào `workspaces.catalog` giữa `"diff"` và `"fastembed"`, rồi `bun install`. Kiểm: `ls -d node_modules/esbuild` phải ra. *(đã xác minh hôm nay: `node_modules/esbuild` vắng; dấu vết duy nhất trong lockfile là optional-peer của vite `^0.27.0 \|\| ^0.28.0` mà 0.28.2 thỏa)*
3. **Chép 30 file `src/`** (29 `.ts` + `src/delta/README.md`), giữ nguyên cây thư mục `context/ delta/ facets/ node/ services/`.
4. **Bỏ hậu tố `.ts`:** 84 specifier trong `src/`, 35 trong `test/` (bỏ benchmark). `sed -E 's|from "(\.\.?/[^"]*)\.ts"|from "\1"|g'`.
5. **Chuyển 3 barrel sang `export * from`** — `src/index.ts` 8 khối, `src/node.ts` 4 khối, `src/bundler.ts` 5 khối. Xử lý ambiguity ở §2.5, **không** phải wire.ts.
6. **Viết lại 24 chuỗi scope** trong 7 file: `package.json` 2, `README.md` 9, `src/delta/README.md` 3, `src/node/bundle-loader.ts` 3 (dòng 329/330/333), `src/node/bundle.ts` 2 (dòng 97), `test/bundle.test.ts` 3, `test/boundary.test.ts` 2 (làm ở bước 12).
7. **Ba `ReturnType<>`** ở `src/node/bundle.ts:118`, `src/node/package.ts:57`, `src/node/package.ts:182` → `BuildResult` / `Stats`, import top-level.
8. **`Promise.withResolvers`** ở `src/context/index.ts:102`, thân hàm `:98-116`.
9. **`packages/chord/package.json`** theo §2.1, version **18.4.0**.
10. **`packages/chord/tsconfig.json`** 133 byte, clone `packages/omptype/tsconfig.json`. Không chép `tsconfig.build.json` của nguồn.
11. **Chép 21 file test**, đổi 19 dòng `from "vitest"` → `from "bun:test"`.
12. **`vi.waitFor` × 10** — `test/services.test.ts:601,725,733,757` và `test/facets.test.ts:142,154,185,190,278,286` (đã đếm đúng 10, đúng dòng). `bun:test` **không có** `vi.waitFor` và **không có** `expect.poll` (đã probe: `typeof vi.waitFor === "undefined"`, `typeof expect.poll === "undefined"`; `vi.fn` và `it.each` thì có). Thay bằng vòng poll tay.
13. **Viết lại `retention.test.ts`** theo §2.4 + đổi 2 chuỗi `@earendil-works/pi-` ở `test/boundary.test.ts:15` và `:26`.
14. **Hai README + CHANGELOG**, rồi `bun run fmt` + `bun run lint` trong package.
15. **Đăng ký package vào `scripts/ci-test-ts.ts`** — thêm `"packages/chord"` vào mảng `fastWorkspacePackages` (dòng ~88). **Bước này không có trong tài liệu gốc và là bắt buộc**, xem §5.3.
16. **Chạy cổng** — xem §5.

---

## 4. Hợp đồng test

21 file · **35 nhóm `describe()`** · **298 khối** (đã đếm lại từng file, khớp tuyệt đối với tài liệu: 73/23/15/50/21/9/6/10/23/24/8/2/9/1/6/7/5/4/2).

| file | khối | hợp đồng bảo vệ | hồi quy ⇒ người dùng thấy gì |
| --- | --- | --- | --- |
| `test/delta-tracker/tracker.test.ts` | 73 | thứ tự nhân quả CRDT, đồng nhất revision, chia sẻ cấu trúc | hai phiên sửa cùng một tài liệu mà không ghi đè lẫn nhau |
| `test/delta-apply-immutable.test.ts` | 9 | `__proto__` / `constructor` / `prototype` phải **ném** `UnsafePathError` | ô nhiễm prototype vào object của tiến trình |
| `test/facets.test.ts` + `facet-loader.test.ts` | 15 + 10 | `dispose()` rút **ngược**, cô lập lỗi từng effect, gộp >1 thành `AggregateError` | facet không giải phóng tài nguyên khi một effect ném |
| `test/service-wire.test.ts` | 8 | 11 parser trên `unknown` từ chối input dị hình | client/server lệch schema âm thầm, message rơi im lặng |
| `test/bundle.test.ts` | 6 | `@oh-my-pi/chord` vẫn external sau khi đổi scope | bundle nhúng **hai bản** runtime, tăng bộ nhớ và phá singleton |
| `test/boundary.test.ts` | 2 | không specifier `@earendil-works/` nào tới được entry đã phát hành | import trong tài liệu không resolve được |
| `test/state-fuzz.test.ts` | 1 | fuzzing phải khẳng định kết quả **có biên** hoặc lỗi nêu tên | `not.toThrow()` trần bị bác trong review |
| `test/delta-tracker/retention.test.ts` | 2 | 14 kịch bản GC, spawn worker | tracker giữ revision đã chết, bộ nhớ phình theo phiên |
| `test/context.test.ts` | 6 | `awaitWithContext` bỏ qua việc bỏ listener ở nhánh reject | AbortSignal rò rỉ listener sau vài nghìn lần gọi |

Quy tắc áp cho cả 21: không `mock.module()`; không `vi.` nào mà `bun:test` không có; không `node:child_process`; không source-grep; `vi.restoreAllMocks()` trong `afterEach`.

---

## 5. Cổng

### 5.1 Cổng 1 — `bun run check:ts` (gốc repo)

Script thật: `check:tools && bun run --filter './packages/*' --sequential --if-present check:types`.

**Có ĐỎ ĐƯỢC KHÔNG? Có — nhưng chỉ một nửa.** Đo trực tiếp trên máy này:

| việc bị bỏ sót | `check:ts` có bắt? | bằng cách nào (đã chạy thật) |
| --- | --- | --- |
| sót hậu tố `.ts` | ✅ **CÓ** | `tsgo --noEmit` → `error TS5097`, **exit 1**. Đã dựng lại đúng chuỗi tsconfig (`extends tsconfig.base.json`, không `allowImportingTsExtensions`) và chạy: giữ đuôi → exit 1; bóc đuôi → exit 0. |
| thụt lề 4-space | ✅ **CÓ** | `oxfmt --check` → `Format issues found`, **exit 1** (đo trực tiếp, không qua pipe) |
| export-star trùng tên | ✅ **CÓ** | `tsgo` → TS2308 |
| **3 `ReturnType<>`** | ❌ **KHÔNG** | `tsgo` exit **0** với `Awaited<ReturnType<typeof stat>>` nguyên vẹn. `.oxlintrc.json` không có luật nào cấm `ReturnType`; `typescript/no-explicit-any` còn bị đặt `"off"`. |
| **`new Promise` → `withResolvers`** | ❌ **KHÔNG** | `tsgo` exit **0**. Không có luật lint nào. |
| **còn sót `@earendil-works/chord`** | ❌ **KHÔNG** | chuỗi nằm trong array literal và so sánh chuỗi — typecheck hợp lệ. Chỉ `grep` tay và `test/boundary.test.ts` bắt được. |
| `node:child_process` còn sót | ❌ **KHÔNG** | oxlint không cấm |
| `oxlint` nói bất cứ gì | ❌ | `categories.correctness: "warn"` và lệnh không có `--deny-warnings` → **oxlint exit 0 dù có warning** (đo trực tiếp) |

### 5.2 Cổng 2 — `bun test packages/chord/test`

**Có ĐỎ ĐƯỢC KHÔNG? Có.** Đo trực tiếp: chạy một file test cố ý hỏng trong `packages/omptype/test/` → `bun test` **exit 1**, `1 fail`. Bộ lọc thư mục chạy được từ gốc repo.

Nhưng nó **chỉ bảo vệ bạn trên máy này**. Xem 5.3.

### 5.3 Cổng 3 — CI KHÔNG chạy test của chord. Đây là lỗ hổng thật.

`scripts/ci-test-ts.ts` dùng **danh sách package viết cứng**, không có dynamic discovery:

- `fastWorkspacePackages` (dòng ~88) = `omptype, utils, catalog, ai, snapcompact, agent, mnemopi`
- `nativeAndIntegrationPackages` (dòng ~99) = `natives, tui, collab-web, typescript-edit-benchmark`
- `localOnlyWorkspacePackages` (dòng ~108) = `python/robomp/web`

`.github/workflows/ci.yml:613` chạy `bun run ci:test:ts:workspace` → mode `workspace` → **chỉ** `fastWorkspacePackages`.

**Nếu làm đúng 15 bước của tài liệu gốc mà bỏ qua bước 15 ở §3, thì `packages/chord` không nằm trong bất kỳ danh sách nào.** Hệ quả: 298 khối test xanh trên máy của bạn, **CI không bao giờ chạy chúng**, và một hồi quy ở tháng sau sẽ xanh tràn. Đây đúng là "cổng luôn xanh tệ hơn không có cổng" — một PR ghi "test-VERIFIED" mà CI không hề kiểm.

**Viết lại cổng cho đỏ được — bắt buộc thêm vào mọi PR chord:**

```bash
# 1. đăng ký package (bước 15 §3) — nếu chưa, cổng CI là giả
grep -q '"packages/chord"' scripts/ci-test-ts.ts

# 2. hai lệnh này phải đều exit 0
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
cd /Users/tranquangdang21/Projects/ultraworkers && bun test packages/chord/test
```

Bổ sung: thêm `packages/chord` vào `.github/workflows/ci.yml` chỗ nào đó không bắt buộc — thêm vào `fastWorkspacePackages` là đủ, vì cả `ci:test:ts:workspace` (CI) lẫn `test`/`test:ts` (cục bộ) đều đi qua cùng một mảng.

### 5.4 Đề xuất cổng thứ 4 (đỏ được, chi phí ~1 dòng)

Vì 4 mục trong §5.1 không ai bắt được, thêm vào `packages/chord/package.json`:

```json
"check:ci": "grep -rqn 'earendil-works' src test && exit 1 || exit 0"
```

Rồi thêm `&& bun run check:ci` vào script `check` của package. `check:ts` gọi `check:types` chứ không gọi `check`, nên phải thêm vào `check:types` hoặc sửa `scripts/ci-test-ts.ts` — **cần người quyết**, xem §7.

---

## 6. Cạm bẫy riêng của work item này

### 6.1 Version `18.3.3` trong tài liệu đã cũ
Tài liệu ghi `version 0.87.1 -> 18.3.3`. Hôm nay **mọi** package trong repo đều ở `18.4.0` (`omptype`, `wire`, `utils`, `tui`, `ai`, `agent`, `catalog` — đã đọc từng `package.json`). Đặt chord ở `18.3.3` sẽ tạo một package lệch phiên bản ngay từ commit đầu.

### 6.2 Neo `retention.test.ts:81` không tồn tại
File chỉ có **34 dòng**. `node:child_process` ở **dòng 1**, `spawnSync(...)` ở **dòng 24**, specifier `./retention.worker.ts` ở **dòng 26**. Đọc dòng 81 sẽ không ra gì.

### 6.3 `Bun.spawnSync` không có `.status` và không có `.error`
Đo trực tiếp trên bun 1.3.14, `Bun.spawnSync` trả về:

```
{ exitCode, stdout, stderr, success, resourceUsage, pid }
```

`"status" in result === false`, `"error" in result === false`. Viết `expect(child.status, …).toBe(0)` sẽ fail với `undefined`. Tệ hơn: `expect(child.error, child.stderr).toBeUndefined()` sẽ **xanh vĩnh viễn** vì `undefined === undefined` — biến một assert thành no-op. Đổi thành `child.exitCode` và **xoá hẳn** dòng `child.error`.

Ngoài ra `spawnSync` của Node nhận `encoding: "utf8"` và `timeout`; `Bun.spawnSync` dùng `stdout: "pipe"` và không có `timeout` tương đương. Tham số thứ ba của `it.each` (`:32`, `65_000`) là timeout của vitest — kiểm tra `bun:test` có tôn trọng nó không trước khi giữ.

### 6.4 Đối tác của export-star conflict
Tài liệu nói `types.ts` và `services/wire.ts` cùng lộ `RemoteServiceProvider`/`RemoteServiceError`. **Sai.** `wire.ts` không export cái nào. `types.ts:4-5` mới là nơi re-export cả hai (type-only), và nó va chạm với `services/errors.ts` + `services/provider.ts` — hai module **đã** được star ở `index.ts:15-20` và `:21-26`. Bỏ nhầm chỗ thì TS2308 vẫn còn.

### 6.5 Đừng "hòa giải" bốn vòng rút drain
`src/facets/host.ts:125-142` (đã đọc) rút ngược + `throw errors[0]` / `AggregateError`. Bốn vòng rút trong omp là forward + không try/catch. Chúng **cố ý khác nhau**: `beginDispose()` chạy ở `session-teardown.ts:70`, **trước** `await deps.saveDraft(draftText)` ở `:72`, nên một vòng rút ném lỗi biến rò rỉ tài nguyên có điều kiện thành mất bản nháp không điều kiện. Khi chord đã nằm trong cây, cách "sửa" trông hợp lý nhất là đấu bốn vòng rút ấy qua host.ts — đó là **hồi quy**. Chốt bằng `git diff --stat`: PR này phải **0 dòng** dưới `packages/coding-agent`.

### 6.6 `test/boundary.test.ts` sẽ xanh một cách rỗng nếu bỏ sót
Nếu còn `@earendil-works/pi-` trong file mà đổi phần mềm, test vẫn xanh vì nó kiểm tra chuỗi **cũ** không xuất hiện — và chuỗi mới thì không ai kiểm. Đổi **cả hai** dòng 15 và 26, đừng đổi logic assert.

### 6.7 Hai số trong tài liệu đã trôi
- "355 import trần" cho `omptype`+`utils`: đo hôm nay là **167** (`omptype/src`+`test`), **85** (`utils/src`), **252** cả hai. Phần "0 import tương đối có đuôi" thì **đúng** (đã verify cả hai).
- "bun test packages/omptype/test → 1139 pass / 52 todo / 0 fail": hôm nay là **1056 pass / 0 fail / 85 file**. Luận điểm tài liệu rút ra (runner chạy sạch khi addon chưa build) vẫn đúng; con số thì không.

### 6.8 `bun.lock:1455` là neo trong file sinh tự động
Dấu vết esbuild hôm nay nằm ở dòng **1440** (optional-peer của vite), không phải 1455. Lockfile được sinh lại mỗi `bun install` nên con số này sẽ trôi tiếp — đừng dùng làm neo.

---

## 7. Cần người quyết (chưa có câu trả lời trong tài liệu)

1. **Ai giữ quyền đăng ký `packages/chord` vào `scripts/ci-test-ts.ts`?** Không ai trong 15 bước của tài liệu làm việc này, và thiếu nó thì cổng CI là giả (§5.3).
2. **Cổng grep chuỗi scope** ở §5.4 có được chấp nhận không? Nó là một source-grep, mà AGENTS.md cấm trong *test* nhưng cho phép trong bước kiểm migration thủ công. Cần chốt để không mỗi người tự quyết.
3. **`test/boundary.test.ts` có vượt luật "no source-grep" không?** Tài liệu đã tự trả lời "có" nhưng nói nên để reviewer phán lại. Quan điểm của phiếu này: nó kiểm **phân giải import** chứ không phải văn bản, nên ở trong ranh giới — nhưng nó đủ sát đường để cần người ký.
4. **`TODO_CONTEXT`** (`src/context/index.ts:56`, đã đọc) — giữ tên hay đổi? Xu hướng của tài liệu: giữ.
5. **6 file benchmark + `PLANNING.md`** (~87 KB đo được là 86 855 byte) — chép ở đợt sau không?

---

## 8. Nhật ký kiểm neo

**Đã kiểm, KHỚP (148 + ~40 mục):**
- 148/148 neo bảng *Bề mặt công khai* — dòng ở đó chứa đúng tên symbol *(kể cả hàng 148 `JsonRevisionValidator` @ `revision-validator.ts:8`; `validateRevision` thật sự xuất hiện **0 lần** trong toàn bộ `pi-ref`)*
- 62/62 kích thước byte trong bảng *File cần chép* — khớp từng byte
- 84 + 35 = 119 hậu tố `.ts`; 42 trong 23 file nếu tính benchmark
- 24 scope trong 7 file, 29 trong 8 file (`PLANNING.md` 5) — khớp từng file
- 5 file `src/` thụt lề 4-space, **đúng 98 dòng**; 21/21 file test tab sẵn
- 35 `describe` / 298 khối — khớp từng file
- 10 `vi.waitFor` đúng dòng; 4 `vi.fn`; 0 `toThrowError`; 0 `any` trong `src`
- Mọi neo sửa: `context/index.ts:98-116,102` · `node/bundle.ts:4,97,118` · `node/package.ts:57,182` · `bundle-loader.ts:329-333` · `boundary.test.ts:15,26` · `facets/host.ts:125-142,340` · `types.ts:15,21` · `delta/index.ts:131,133,279,310` · `manifest.ts:1-5` · `errors.ts:1`
- `extension-ui-controller.ts:112` và `session-teardown.ts:70` — **đúng**
- `omptype`/`wire` `package.json`: exports wildcard, không `./package.json`, không `sideEffects`, `files` không có LICENSE — **đúng**
- `omptype/tsconfig.json` 133 byte — **đúng**

**Đã kiểm, SAI (9):**

| neo trong tài liệu | thật |
| --- | --- |
| `test/delta-tracker/retention.test.ts:81` | file 34 dòng; `:1` import, `:24` spawnSync, `:26` worker path |
| `packages/coding-agent/src/session/agent-session.ts:4983` | `:5104` |
| `packages/coding-agent/src/session/agent-session.ts:5218` | `:5346` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1347` | `:1376` |
| `packages/ai/src/types.ts:1476` (`Context`) | `:1465` |
| `packages/coding-agent/src/eval/judgment-bridge.ts:47` | `:53` |
| `packages/ai/src/providers/cursor.ts:4643` | `:4681` |
| `bun.lock:1455` | `:1440` (và file sinh tự động) |
| `pi-ref` chưa có trong cây khi W2 chạy | giờ có, ở `d6af72e18` — phần "unverifiable" của W2 **đã hết hiệu lực**, nhưng kết luận "giữ 4 vòng rút của omp" vẫn đúng |
