# Phiếu triển khai — GAP-M1B-2: Sáu cổng bất biến dependency/packaging

> Kế hoạch: `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1B_EXECUTION_PLAN.md`, mục
> `## GAP-M1B-2` (dòng 2810–2952).
> Ngày kiểm: 2026-09-29. Mọi trích dẫn dưới đây đã mở file thật và đọc; mọi số đo đã chạy thật.

---

## 0. KẾT LUẬN PHÁP LÝ (đọc phần này trước)

Work item này **viết sai 4 chỗ so với mã nguồn thật**, và 3 trong 4 chỗ sai đó làm cho
cổng **không thể đỏ** hoặc **đỏ vì lý do sai**. Đây là loại lỗi nguy hiểm nhất: triển khai
đúng theo văn bản sẽ tạo ra 4 cổng trông như có nhưng một cổng chết, một cổng đỏ ngay
vì 134 false positive, và hai cổng đỏ vì 62+41 false positive.

Bảng tóm tắt:

| # | Điều tài liệu khẳng định | Thực tế đo được | Hậu quả |
|---|---|---|---|
| A | `check-lockfile-commit` là cổng thứ 4, nối vào `check:ts` | omp **không có** `package-lock.json` (dùng `bun.lock`); script hardcode `package-lock.json` ở 3 chỗ | **Cổng chết vĩnh viễn** — không bao giờ đỏ được |
| B | `check-ts-relative-imports` chặn import relative mang `.ts`; cần allowlist 2 hit `.d.ts` | Script chỉ soi specifier kết thúc bằng `.js` (regex `\.js(?:[?#].*)?$`). Chạy thật trên omp: **41 hit, 0 hit nào là `.d.ts`** | Allowlist 2 hit `.d.ts` **bảo vệ một sự cố không thể xảy ra**; điều kiện 223 dòng `.ts` **không cổng nào canh** |
| C | "chép 4 script + 1 test" | `check-runtime-deps.mjs:19` import `./release-packages.mjs`, file đó lại import `./package-workspaces.mjs` | Bảng "hình dạng port" **thiếu 2 file** |
| D | Chạy 4 script trên cây omp sẽ xanh (sau khi sửa filter) | Chạy nguyên bản: pinned-deps **152 đỏ** (134 do `catalog:`), runtime-deps **63 đỏ** (62 do `bun:*`), ts-relative **41 đỏ** | Cổng đỏ ngay lần chạy đầu, **không phải vì 2 hit `.d.ts`** như tài liệu dự đoán |

Riêng điểm D là tin tốt: đỏ ngay lần chạy đầu vẫn là hành vi cổng tốt. Nhưng **nguyên nhân
đỏ phải đúng**, nếu không người implementer sẽ "sửa cho xanh" bằng cách xoá 2 import hợp lệ
(đúng cái bẫp tài liệu lo) — hoặc tệ hơn, bằng cách xoá hàng loạt import thật.

---

## 1. Cái gì thay đổi, quan sát được

Sau khi làm xong, `bun run ci:check:full` (tức `check:ts`, cổng CI thật ở
`.github/workflows/ci.yml:190`) sẽ **từ chối commit** khi ai đó thêm một
package dependency không pin đúng, khai một import runtime mà package chưa khai báo, một
import `.js` tương đối trong file `.ts`, hay một thay đổi lockfile ngoài ý muốn — và
`scripts/check-runtime-deps.test.mjs` chứng minh cổng đó đỏ được bằng cách tự dựng cây
fixture trong `node:test`.

Câu này **không thành** với work item như đang viết. Đúng hơn phải là:

> Ba cổng (`check-pinned-deps`, `check-runtime-deps`, `check-ts-relative-imports`) được
> nối vào `check:ts` và đỏ được trên cây hiện tại sau khi sửa ba điểm không tương thích
> (`catalog:`, `bun:*`, allowlist `.js` hợp lệ). Cổng thứ tư (`check-lockfile-commit`)
> **không nối vào `check:ts`** mà chuyển thành git hook, và **phải viết lại để đọc `bun.lock`**
> nếu muốn nó bảo vệ được thứ gì đó.

---

## 2. Bảng điểm sửa

Cột TRƯỚC trích nguyên văn từ file đã mở.

### 2.1 `scripts/check-pinned-deps.mjs` (chép từ `pi-ref`, 2238 B)

| path | symbol | TRƯỚC (nguyên văn) | SAU |
|---|---|---|---|
| `scripts/check-pinned-deps.mjs:30` | `isNonRegistrySpecifier` | `` /^(?:workspace:\|file:\|link:\|portal:\|git\+\|github:\|git:\|https?:\|ssh:\|git:\/\/)/ `` | phải thêm `catalog:` — **bắt buộc**, xem §5.1 |
| `scripts/check-pinned-deps.mjs:26` | `isInternalWorkspaceDependency` | `return name.startsWith("@earendil-works/pi-") \|\| internalPackageNames.has(name);` | phải nhận `@oh-my-pi/*` (**16/16**), không phải `@oh-my-pi/pi-*` |
| `scripts/check-pinned-deps.mjs:7` | `internalPackageNames` | `const internalPackageNames = new Set(["@earendil-works/chord"]);` | `new Set([])` — omp không có `chord` |

Bằng chứng chạy thật (`node scripts/check-pinned-deps.mjs` từ gốc omp, chưa sửa):

```
TOTAL FAILURES: 152
of which catalog:: 134
```

18 lỗi còn lại là nợ pin thật, phân bố:

```
.omp/tools/package.json: dependencies.@napi-rs/canvas          ^1.0.8
.omp/tools/package.json: dependencies.kitty-vt-wasm            ^0.2.0
packages/coding-agent/examples/extensions/with-deps/package.json: dependencies.ms
packages/metaharness/package.json: dependencies.@stencil-hq/vibemon
packages/metaharness/package.json: dependencies.{clsx,d3-scale,d3-shape,motion,react,react-dom,tailwind-merge}
packages/omptype/package.json: devDependencies.@sinclair/typebox
```

### 2.2 `scripts/check-runtime-deps.mjs` (chép từ `pi-ref`, 5095 B)

| path | symbol | TRƯỚC (nguyên văn) | SAU |
|---|---|---|---|
| `scripts/check-runtime-deps.mjs:19` | import | `import { getPublicWorkspacePackages } from "./release-packages.mjs";` | **thêm 2 file** `release-packages.mjs` + `package-workspaces.mjs`, hoặc gộp lại thành 1 |
| `scripts/check-runtime-deps.mjs:38` | `checkSpecifier` | `if (specifier.startsWith(".") \|\| specifier.startsWith("/") \|\| isBuiltin(specifier)) return;` | phải coi `bun` và `bun:*` là builtin — **bắt buộc**, xem §5.2 |
| `scripts/check-runtime-deps.mjs:4` | `isBuiltin` | `import { isBuiltin } from "node:module";` | giữ, nhưng thêm nhánh Bun **trước** khi gọi nó |
| `scripts/check-runtime-deps.mjs:91` | fallback | `configPath: existsSync(configPath) ? configPath : resolve(directory, fallbackConfigName),` | omp có **0/16** `tsconfig.build.json` → cả 16 package đi fallback |

Bằng chứng chạy thật (`node scripts/check-runtime-deps.mjs` từ gốc omp, chưa sửa):

```
EXIT=1
TOTAL failure lines: 63
  62  →  "bun is not declared" / "bun:sqlite" / "bun:ffi" / "bun:jsc"  (false positive)
   1  →  packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:742:
        omp-legacy-pi-modules is not declared in @oh-my-pi/pi-coding-agent's runtime dependencies
```

Chỉ **1 trong 63** là lỗi thật.

### 2.3 `scripts/check-ts-relative-imports.mjs` (chép từ `pi-ref`, 3351 B)

| path | symbol | TRƯỚC (nguyên văn) | SAU |
|---|---|---|---|
| `scripts/check-ts-relative-imports.mjs:38` | `isRelativeJavaScriptSpecifier` | `return /^\.\.?\//.test(specifier) && /\.js(?:[?#].*)?$/.test(specifier);` | **đây là chỗ làm đảo ngược toàn bộ work item.** Regex soi `.js`, không soi `.ts` |
| `scripts/check-ts-relative-imports.mjs:27` | `collectTypescriptFiles` | `if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {` | file `.d.ts` bị loại khỏi tập thu thập; nhưng `.d.ts` **specifier** vẫn lọt nếu nằm trong file `.ts` |
| `scripts/check-ts-relative-imports.mjs:102` | message | `console.error("Relative .js imports are not allowed in non-declaration .ts files:");` | giữ nguyên — nó nói đúng sự thật, tài liệu thì không |

Bằng chứng chạy thật (`node scripts/check-ts-relative-imports.mjs` từ gốc omp, chưa sửa):

```
EXIT=1
TOTAL failures: 41
=== any .d.ts specifier flagged? ===
0            <-- .d.ts KHÔNG BAO GIỜ bị flag
=== hits trong đúng 2 file tài liệu nhắc ===
  packages/coding-agent/src/tools/browser/prelude-definition.ts:7:31: ./prelude.js
  packages/coding-agent/src/tools/computer/prelude-definition.ts:5:32: ./prelude.js
```

41 hit phân bố: `packages/natives` 19, `packages/coding-agent` 12, `packages/tui` 6,
`scripts` gốc 2, `packages/ai` 1, `crates` 1.

### 2.4 `package.json:90,91`

| path | symbol | TRƯỚC (nguyên văn) | SAU |
|---|---|---|---|
| `package.json:90` | `check:ts` | `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",` | nối **3** cổng (không phải 4) |
| `package.json:91` | `check:tools` | `"check:tools": "oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' ... 'scripts/**/*.ts'",` | **không đổi** |
| `package.json:109` | `ci:check:full` | `"ci:check:full": "bun run check:ts",` | **không đổi** — đã là cổng CI thật |

`check:ts` là cổng CI thật: `.github/workflows/ci.yml:190` chạy `bun run ci:check:full`,
mà `ci:check:full` → `check:ts`. Nối vào `check:ts` **là** đưa vào CI.

### 2.5 `scripts/check-lockfile-commit.mjs` (chép từ `pi-ref`, 3991 B) — **CỔNG CHẾT**

| path | symbol | TRƯỚC (nguyên văn) | SAU |
|---|---|---|---|
| `scripts/check-lockfile-commit.mjs:5` | `allowValue` | `const allowValue = process.env.PI_ALLOW_LOCKFILE_CHANGE;` | đổi tên env sang tiền tố omp |
| `scripts/check-lockfile-commit.mjs:34` | `getLockfilePackageChanges` | `const before = readJsonFromGit("HEAD:package-lock.json");` | `bun.lock` — và `bun.lock` **không phải JSON** |
| `scripts/check-lockfile-commit.mjs:35` | `getLockfilePackageChanges` | `const after = readJsonFromGit(":package-lock.json");` | như trên |
| `scripts/check-lockfile-commit.mjs:82` | gate | `if (!stagedFiles.includes("package-lock.json")) { process.exit(0); }` | không bao giờ kích hoạt vì omp không có file đó |
| `scripts/check-lockfile-commit.mjs:51` | `isWorkspacePackagePath` | `return lockPath.startsWith("packages/");` | giữ |

Bằng chứng: `ls package-lock.json` → **không tồn tại**; omp chỉ có `bun.lock`, `Cargo.lock`,
`flake.lock`, `MODULE.bazel.lock`. Chạy script trên omp: `EXIT=0`.

Thêm nữa, trong chính `pi` cổng này **không nằm trong CI**:

```
pi package.json "check": ... && npm run check:pinned-deps && npm run check:runtime-deps
                       && npm run check:ts-imports && ...          <-- không có lockfile
pi .husky/pre-commit: node scripts/check-lockfile-commit.mjs      <-- chỉ ở đây
grep -rn 'check-lockfile-commit' pi-ref/.github/  → 0 hit
```

Nó là **git pre-commit hook**, không phải cổng CI. Dùng nó trong CI là vô nghĩa về mặt
kiến trúc: CI không có staged index.

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

> Thứ tự này **khác** thứ tự trong work item. Work item bảo "đặt allowlist 2 hit `.d.ts` ngay
> khi chép" (bước 3) — việc đó vô nghĩa vì `.d.ts` không bao giờ bị flag. Thay vào đó phải
> chạy cổng **trước**, đọc danh sách đỏ thật, rồi mới quyết định allowlist gì.

1. **Đặt pháp lý trước.** Tạo `scripts/LICENSE` theo khuôn `packages/omptype/LICENSE`
   (đã đọc, 22 dòng): dòng `MIT License`, trống, rồi dòng tác giả gốc **trước**, dòng omp
   **sau**. Root `LICENSE:3` là `Copyright (c) 2025 Mario Zechner` — giữ làm dòng đầu.

2. **Chép 7 file, không phải 5.** `check-pinned-deps.mjs`, `check-runtime-deps.mjs`,
   `check-runtime-deps.test.mjs`, `check-lockfile-commit.mjs`, `check-ts-relative-imports.mjs`
   **+ `release-packages.mjs` + `package-workspaces.mjs`**. Hai file cuối là bắt buộc vì
   `check-runtime-deps.mjs:19` import `release-packages.mjs`, và
   `release-packages.mjs:3` import `package-workspaces.mjs`. Bảng "hình dạng port" trong tài
   liệu thiếu chúng.

3. **Sửa `catalog:` trước tiên** ở `check-pinned-deps.mjs:30`. Đây là false positive lớn
   nhất (134/152). omp dùng Bun workspace catalog: `grep -h '"catalog:"' packages/*/package.json package.json | wc -l` → **127**;
   `package.json:182` là `"typescript": "catalog:"`.

4. **Sửa scope nội bộ** ở `check-pinned-deps.mjs:26-27`. Dùng `@oh-my-pi/` làm tiền tố
   chung, **không** dùng `@oh-my-pi/pi-`. Lý do: trong 16 package của omp có **6** tên không
   bắt đầu bằng `pi-`:
   `@oh-my-pi/browser-relay`, `@oh-my-pi/collab-web`, `@oh-my-pi/omptype`,
   `@oh-my-pi/snapcompact`, `@oh-my-pi/omp-stats`, `@oh-my-pi/typescript-edit-benchmark`.
   Port theo mẹo tiền tố `pi-` sẽ bỏ sót 6/16.

5. **Chạy `check-pinned-deps` lần đầu, đọc 18 lỗi còn lại** ở §2.1. Quyết định từng cái:
   pin cứng, hoặc đưa vào allowlist có lý do ghi bên cạnh. `.omp/tools/package.json` nên
   loại khỏi phạm vi quét (nó là thư mục agent-local, đã nằm trong
   `.oxlintrc.json:42` `"**.omp/**"`).

6. **Thêm nhánh Bun builtin** vào `check-runtime-deps.mjs:38`, **trước** khi gọi
   `isBuiltin` của `node:module` — vì `node:module` không biết `bun`, `bun:sqlite`,
   `bun:ffi`, `bun:jsc`. Đây là 62/63 lỗi.

7. **Quyết định về `tsconfig.build.json` trước khi chạy `check-runtime-deps`.** omp có
   `0/16` package nào có file này, nên cả 16 đều rơi vào
   `fallbackConfig = { include: ["src/**/*"] }` (dòng 22-23). Hệ quả: nhánh
   *"excluded from build but imported by it"* (dòng 118-120) trở nên **vô nghĩa** — mọi file
   dưới `src/` đều là root nên không file nào "bị loại". Hoặc tạo `tsconfig.build.json` cho
   16 package, hoặc **ghi rõ trong PR** rằng phần exclude của cổng này không có tác dụng
   với omp. Đừng để người sau tưởng nó đang canh.

8. **Chạy `check-ts-relative-imports` lần đầu, đọc 41 lỗi.** Xử lý theo nhóm, KHÔNG
   theo danh sách 2 file của tài liệu:
   - `packages/natives` (19) — chủ yếu `test/` và `bench/` import `../native/*.js` trong khi
     native là build artifact Rust. Cần allowlist theo thư mục, không theo dòng.
   - `packages/coding-agent/src` (12) — gồm `packages/coding-agent/src/export/html/index.ts:12,15`,
     nơi `.oxlintrc.json:53` đã ignore thư mục html.
   - `crates/pi-natives/tools/bench-natives.ts:7` — Rust crate, ngoài phạm vi TS.
   - `./prelude.js` trong 2 file prelude — đây mới là hit **thật** ở 2 file tài liệu nhắc,
     ở dòng **7** và **5**, không phải 5 và 3.

9. **Quyết định số phận `check-lockfile-commit` — KHÔNG nối vào `check:ts`.** Ba lựa chọn,
   nêu rõ trong PR:
   - **(a) Bỏ hẳn** khỏi phạm vi, ghi lý do: omp không dùng npm, không có `package-lock.json`.
   - **(b) Viết lại cho `bun.lock`** và thành git hook, không phải CI gate. `bun.lock` là
     text (JSONC của Bun), không phải JSON thuần nên `JSON.parse` ở dòng 14 sẽ vỡ.
   - **(c) Giữ nguyên bản chép** như một `pre-commit` hook chết — **không chọn**, xem §6.

10. **Nối 3 cổng vào `package.json:90`.** Không thêm file script nào vào
    `.oxlintrc.json`. Lưu ý: `**/*.mjs` **đã** nằm sẵn ở `.oxlintrc.json:55`, nên file `.mjs`
    vốn đã nằm ngoài lint — xem §6.2.

11. **Nối `check-runtime-deps.test.mjs` vào runner.** File dùng `node:test` +
    `node:assert/strict` + `spawnSync`; omp dùng `bun test`
    (`package.json:85` `"test": "bun scripts/ci-test-ts.ts local"`). omp hiện có
    **0** file `*.test.mjs`. Nếu không nối, file test chép sang là code chết.

---

## 4. Hợp đồng test

### 4.1 `scripts/check-runtime-deps.test.mjs` (chép từ `pi-ref`, 5067 B, 110 dòng)

Ba case đã đọc:

| test | fixture | kỳ vọng |
|---|---|---|
| `rejects undeclared imports even when the workspace package exists` (dòng 28) | `packages/server/package.json` tồn tại, nhưng `example` không khai | `status === 1`, stderr khớp `src[\\/]index\.ts:1: @earendil-works\/pi-server\/unix is not declared` |
| `accepts runtime declarations, builtins, self imports, relative imports, and erased types` (dòng 36) | deps + optional + peer khai đủ | `status === 0` |
| `rejects dev-only dependencies, side-effect imports, mixed exports, and literal runtime loads` (dòng 57) | chỉ `devDependencies` | `status === 1` |

**Port bắt buộc:** fixture dựng cây trong `mkdtemp(join(tmpdir(), "pi-runtime-deps-"))`
(dòng 12) và tên package `@earendil-works/pi-server` (dòng 29-30, 33) → đổi sang
`@oh-my-pi/pi-server`, prefix tmpdir thành `omp-runtime-deps-`.

**Case phải thêm cho omp** (không có trong bản `pi`): import `bun:sqlite` và `bun` phải
**xanh** (exit 0). Đây là hợp đồng giữ nhánh Bun ở bước 6 — không có case này thì ai đó xoá
nhánh Bun ở lần refactor sau cũng không ai biết.

**Người dùng thấy gì nếu hồi quy:** `bun test scripts/check-runtime-deps.test.mjs` đỏ ở
case `accepts ... builtins ...` vì `bun:sqlite` bị coi là dependency chưa khai → cổng đỏ
trên cây thật với 62 dòng, hoặc xanh im lặng vì ai đó thêm `bun:sqlite` vào
`dependencies` của mọi package cho xanh.

### 4.2 Hợp đồng của 3 cổng còn lại (không có file test)

Vì không có test runner, **bắt buộc** phải chứng minh thủ công rằng mỗi cổng đỏ được:

- `check-pinned-deps` đỏ được: thêm một dep `^1.0.0` vào bất kỳ `package.json` nào → exit 1.
  Đừng chấp nhận "cổng chạy xanh" là bằng chứng.
- `check-ts-relative-imports` đỏ được: thêm `import x from "./y.js"` vào một file `.ts` bất kỳ
  → exit 1. Đừng dùng `import x from "./y.ts"` làm bằng chứng — **cổng sẽ vẫn xanh** và
  người đọc tưởng cổng canh `.ts`.
- `check-runtime-deps` đỏ được: cover bằng `.test.mjs` ở trên.

**Điều người dùng thấy nếu hồi quy:** một PR thêm `import "lodash"` vào
`packages/tui/src/...` mà không khai `lodash` vào `packages/tui/package.json` vẫn merge
được. Đó là hồi quy quan sát được.

### 4.3 Điều KHÔNG được làm trong test

Theo `AGENTS.md`: không `mock.module()`, không assertion kiểu "dài hơn"/"không rỗng",
không source-grep. Riêng ở đây: **không** viết test kiểu `expect(grep_output).toContain(...)`
cho `check-ts-relative-imports` — quét là việc của cổng, không phải của test.

---

## 5. Cổng — và câu trả lời: cổng này có ĐỎ ĐƯỢC không?

### Cổng chính

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run ci:check:full
```
(`.github/workflows/ci.yml:190` → `package.json:109` → `package.json:90`).

### 5.1 `check-pinned-deps` — ĐỎ ĐƯỢC, sau khi sửa `catalog:`

- **Có đỏ được không?** Có, ngay lập tức, không cần dựng fixture.
- **Bằng cách nào?** Chạy nguyên bản `pi-ref` lên cây omp: **exit 1, 152 dòng đỏ**. Đó
  chính là bằng chứng nó đỏ được. Sau khi thêm `catalog:` vào `isNonRegistrySpecifier` và
  đổi scope sang `@oh-my-pi/`, còn 18 dòng — mỗi dòng phải được pin hoặc allowlist có chú thích.
- **Nếu không sửa `catalog:`?** 134 dòng đỏ toàn là `found catalog:`. Người implementer sẽ
  đọc đó là lỗi thật và đi pin 127 chỗ — tệ hơn nhiều so với không có cổng.

### 5.2 `check-runtime-deps` — ĐỎ ĐƯỢC, sau khi thêm nhánh Bun

- **Có đỏ được không?** Có. Chạy nguyên bản: **exit 1, 63 dòng**, trong đó 1 dòng là lỗi
  thật (`legacy-pi-compat.ts:742` → `omp-legacy-pi-modules`).
- **Bằng cách nào?** Sau khi coi `bun`/`bun:*` là builtin, cổng phải **xanh** trên cây hiện
  tại, và **đỏ** khi ai đó thêm import không khai. Xanh trên cây hiện tại là điều kiện bắt
  buộc — nó chứng minh nhánh Bun đã đúng, vì nếu không có nhánh đó cổng sẽ đỏ 62 dòng.
- **Fail-closed?** Đúng, theo nghĩa của tài liệu. Dòng 110
  `if (diagnostics.length > 0) throw new Error(...)` ném lỗi thay vì bỏ qua, và dòng
  `process.exit(1)` khi có failure. Không có đường nào nuốt lỗi rồi `exit 0`.
- **Cảnh báo phải nói ra trong PR:** vì 0/16 package có `tsconfig.build.json`, nhánh
  "excluded from build" (dòng 118) **không canh gì cả**. Đừng ghi cổng này "canh export
  boundary" — nó không.

### 5.3 `check-ts-relative-imports` — ĐỎ ĐƯỢC, nhưng KHÔNG canh thứ tài liệu nói

- **Có đỏ được không?** Có: chạy nguyên bản lên omp → **exit 1, 41 dòng**.
- **Bằng cách nào?** Sau khi allowlist hợp lệ, phải chứng minh đỏ bằng cách thêm
  `import x from "./y.js"` vào file `.ts`. Nếu dùng `"./y.ts"` để chứng minh thì cổng **không
  đỏ** — đó là bằng chứng sai.
- **Cổng này có canh được điều kiện 223 dòng `.ts` của §Va không? KHÔNG.** Bằng chứng quyết
  định: `grep -rn 'from "\.[^"]*\.ts"' --include="*.ts" pi-ref/packages | wc -l` → **4943**.
  Chính `pi` có 4943 dòng import relative `.ts` mà cổng của `pi` vẫn xanh. Cổng này về
  bản chất **không thể** canh `.ts`.
- **Vậy 2 hit `.d.ts` trong tài liệu là gì?** Là allowlist cho một sự cố không tồn tại.
  Chạy thật cho thấy 2 file đó **có** xuất hiện trong output — nhưng ở
  `browser/prelude-definition.ts:7` và `computer/prelude-definition.ts:5`, với specifier
  `./prelude.js`. Dòng 5 và 3 mà tài liệu trích (specifier `./declarations.d.ts`) không
  bao giờ bị flag.

### 5.4 `check-lockfile-commit` — KHÔNG ĐỎ ĐƯỢC. Nói thẳng và viết lại.

Đây là phần quan trọng nhất của phiếu.

- **Có đỏ được không?** **Không.** Ba lý do độc lập, mỗi lý do đủ để giết nó:
  1. omp **không có** `package-lock.json`. Script tham chiếu tên file đó ở dòng 34, 35, 82.
     Không có file ⇒ `stagedFiles.includes("package-lock.json")` luôn false ⇒ dòng 83
     `process.exit(0)`.
  2. Trong CI không có staged index. Ngay cả với `package-lock.json`, dòng 77-84 đọc
     `git diff --cached` sẽ rỗng trong CI.
  3. Trong chính `pi`, cổng này **không nằm trong `check:`** — nó chỉ chạy ở
     `.husky/pre-commit`. `grep -rn 'check-lockfile-commit' pi-ref/.github/` → **0 hit**.
- **Đo trên omp:** `node scripts/check-lockfile-commit.mjs` → `EXIT=0`.
- **Vì sao đây là loại lỗi tệ nhất:** một cổng luôn xanh tạo cảm giác an toàn giả. Người
  review thấy "lockfile-commit đã được nối" thì tin rằng thay đổi lockfile ngoài ý muốn bị
  chặn. Không bị chặn. Đây đúng là trường hợp tài liệu tự cảnh báo ở §5, và nó đã xảy ra
  trong chính văn bản này.
- **Viết lại thành cổng đỏ được, hoặc bỏ:**
  - **Phương án khuyến nghị — bỏ khỏi phạm vi, ghi lý do trong PR.** omp dùng Bun
    (`package.json:205` `"packageManager": "bun@>=1.4"`) và có `bun.lock`. Cổng bảo vệ một
    định dạng repo không tồn tại.
  - Nếu muốn giữ: phải viết lại cho `bun.lock` (text, không phải JSON thuần — dòng 14
    `JSON.parse(git(["show", ref]))` sẽ vỡ) **và** cài nó ở tầng git hook
    (`.husky/pre-commit` hoặc `core.hooksPath`), **không** nối vào `check:ts`. Cổng commit
    phải ở tầng commit.
  - **Không** chọn phương án "chép nguyên bản cho khớp hình dạng port". Đó là mua hình thức
    bằng một cổng chết.

---

## 6. Cạm bẫy riêng của work item này

### 6.1 Dễ làm sai nhất: tin allowlist 2 hit `.d.ts` và xoá import hợp lệ

Tài liệu cảnh báo: *"Không thì cổng đỏ vì file của chính omp, và người implementer sẽ 'sửa
cho xanh' bằng cách xoá đúng hai import hợp lệ đó."* — Cảnh báo này **đúng về hậu quả, sai về
nguyên nhân**. Cổng sẽ không bao giờ đỏ vì 2 dòng `.d.ts` đó. Nó sẽ đỏ vì 41 dòng `.js`.

Nhưng kịch bản xấu vẫn xảy ra, chỉ khác hình dạng: implementer thấy output đỏ, thấy
`prelude-definition.ts:7 ./prelude.js` nằm ngay cạnh `prelude-definition.ts:5
./declarations.d.ts` mà tài liệu đã dặn "đừng xoá", và xoá luôn cả import `.js` bên cạnh.
Hậu quả: browser/computer prelude mất phần JS runtime. Đây là loại hỏng **âm thầm** —
`codeModeDeclarations` và `javascript` là hai chỗ khác nhau trong object trả về
(`prelude-definition.ts:23` và `:24`), nên xoá `javascript` không làm hỏng type check.

**Cách tránh:** in ra danh sách 41 dòng, phân loại từng dòng theo *thư mục* (không theo
dòng), và ghi lý do cho mỗi nhóm vào allowlist. Nhóm `packages/natives/test/*` + `bench/*`
import `../native/*.js` là build artifact Rust — allowlist theo `packages/natives/{test,bench}/`.

### 6.2 `ignorePatterns` — lo bẫp đã được vô hiệu hoá một cách âm thầm

Tài liệu nói: *"Đặt cổng ngoài `ignorePatterns` 24 dòng sẵn có của `.oxlintrc.json`. Đưa
entrypoint vào đó tắt mọi rule khác trên các file đó."*

Hai vấn đề:
- **Đếm sai:** `ignorePatterns` ở `.oxlintrc.json:31-58` có **26** phần tử (dòng 32–57), không
  phải 24. Sai số nhỏ, nhưng người implemento đếm lại sẽ mất niềm tin vào phần còn lại.
- **Bẫp đã tự vô hiệu:** `.oxlintrc.json:55` đã có `"**/*.mjs"`. Cổng sẽ viết bằng `.mjs` nên
  **đã** nằm ngoài lint sẵn — không cần canh, nhưng cũng nghĩa là cổng **không có lint
  coverage nào**. Cùng lý do đó, `check:tools` (`package.json:91`) chỉ oxfmt
  `'scripts/**/*.ts'` — không có `.mjs` trong glob. Không ai hề lint 4 file cổng này.
  Nếu muốn có, phải thêm `.mjs` vào glob oxfmt, **không** phải bỏ chúng khỏi `ignorePatterns`.

Ngoài ra `.oxlintrc.json:53` đã ignore `packages/coding-agent/src/export/html/**`, đúng một
trong 12 hit ở `packages/coding-agent`. Nếu port bằng `oxlint` để lọc thì nhớ gate này dùng
TypeScript API, không dùng oxlint — **không** được lọc bằng `ignorePatterns` được.

### 6.3 Port theo mẹo tiền tố `pi-` sẽ bỏ sót 6/16 package

Chi tiết ở bước 4. Đây là loại lỗi "chạy xanh nhưng canh thiếu" — tệ nhất về mặt im lặng.
Cách an toàn: đọc danh sách tên package từ `package.json` workspaces thay vì khớp tiền tố.

### 6.4 `catalog:` là nguyên nhân đỏ lớn nhất, không phải dấu `^`

`bunfig.toml` có `exact = true`, tức Bun **đã** càiu hồn pinning cho lúc install. Nhưng cổng
đọc `package.json`, không đọc `bun.lock` — nên nó vẫn thấy 127 `catalog:` và 18 dấu `^`.
Cổng này và `bun install` đang kiểm hai thứ khác nhau. Ghi rõ điều này trong PR, nếu không
người sau sẽ tưởng cổng thừa vì `exact = true` đã lo.

### 6.5 Test chép sang sẽ chết nếu không nối runner

`check-runtime-deps.test.mjs` dùng `node:test`. omp dùng `bun test`
(`package.json:85`), và `package.json:87` `test:scripts` liệt kê tên file `.ts` tường minh.
omp có **0** file `*.test.mjs`. Không nối thì không test nào chạy, và tài liệu vẫn ghi
"file đó nằm trong hình dạng port" — trông như đã có test.

### 6.6 Chi phí thật

Ba cổng dùng `typescript/unstable/ast` + `typescript/unstable/sync`. Đã kiểm trên omp:
`typescript@7.0.2`, cả ba import đều resolve (`API` là function, `SyntaxKind.ImportKeyword === 101`).
Đây là **API preview** — nó có thể đổi tên giữa các bản TS. Vì `bunfig.toml` không pin
`typescript` cứng (root `package.json:182` là `catalog:`), một lần bump catalog là 4 cổng
hỏng cùng lúc. Cân nhắc ghi chú trong file hoặc thêm vào danh sách theo dõi.

---

## 7. Bảng neo đã kiểm

| neo trong work item | trạng thái | thực tế |
|---|---|---|
| `package.json:90` | ✅ đúng | `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",` |
| `package.json:91` | ✅ đúng | `"check:tools": "oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' ..."` |
| `tools/browser/prelude-definition.ts:5` | ⚠️ dòng đúng, **kết luận sai** | dòng 5 là `import browserDeclarations from "./declarations.d.ts" with { type: "text" };` — có thật, nhưng cổng không bao giờ soi `.d.ts` |
| `tools/computer/prelude-definition.ts:3` | ⚠️ dòng đúng, **kết luận sai** | dòng 3 là `import computerCodeModeDeclarations from "./declarations.d.ts" with { type: "text" };` — tương tự |
| `.oxlintrc.json` `ignorePatterns` "24 dòng" | ❌ sai | 26 phần tử, dòng 31–58 |
| `packages/omptype/LICENSE` | ✅ đúng | 22 dòng, MIT + dòng tác giả trước + `Copyright (c) 2026 Stencil Labs, Inc.` sau |
| kích thước 4 script + 1 test | ✅ đúng cả 5 | 2238 / 5095 / 5067 / 3991 / 3351 bytes |
| `packages/{chord,protocol,server,client}/src` | ✅ vắng | cả 4 thư mục không tồn tại; grep trả 0 |
| "grep 6 cổng → 0 hit" | ✅ đúng | 0 hit trên `package.json .github/ scripts/` |
| "chép 4 script + 1 test" | ❌ thiếu 2 | `check-runtime-deps.mjs:19` → `release-packages.mjs` → `package-workspaces.mjs` |
| "nối 4 cổng vào `check:ts`" | ❌ phải là 3 | cổng lockfile là pre-commit hook, không phải CI gate |

---

## 8. Việc cần người quyết (ngoài những việc tài liệu đã hỏi)

1. **`catalog:` xử lý thế nào** — coi là "đã pin ở tầng catalog" (thêm vào
   `isNonRegistrySpecifier`, cổng im) hay resolve ngược về catalog rồi kiểm version thật?
   Lựa chọn đầu rẻ hơn nhiều và ít sai sót hơn.
2. **18 dòng pin thật** trong §2.1 — pin cứng luôn, hay allowlist? `.omp/tools/package.json`
   nên bị loại khỏi phạm vi quét không.
3. **`tsconfig.build.json` cho 16 package** hay chấp nhận nhánh exclude vô dụng và ghi vào PR?
4. **`check-lockfile-commit`: bỏ (khuyến nghị), hay viết lại cho `bun.lock` ở tầng git hook?**
   Câu trả lời quyết định shape của PR nhiều hơn effort ước tính.
5. **41 hit `.js`** — có phải người ta muốn làm sạch luôn trong PR này (thành một work item
   riêng), hay chỉ allowlist cho PR này rồi mở work item sau? 41 dòng, phần lớn là
   `packages/natives/test/*` — nghiêng về work item riêng.
