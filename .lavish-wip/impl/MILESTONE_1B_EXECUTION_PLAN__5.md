# PHIẾU TRIỂN KHAI — `## 5. telemetry`

> Nguồn kế hoạch: `MILESTONE_1B_EXECUTION_PLAN.md`, mục `## 6. \`telemetry\`` (dòng 2197–2383). Tài liệu đánh số work item là `6`; workflow harness gọi nó là `5` (bỏ qua `## 5. durable` vì mục đó ghi rõ NGOÀI PHẠM VI). Nội dung dưới đây là của mục `telemetry`.
>
> Mọi trích dẫn trong phiếu này đã mở file thật và đọc. Nơi tài liệu sai so với cây thật, ghi ra ở §7, KHÔNG sửa trong tài liệu.

---

## 0. Bản đồ nguồn — đọc trước khi gõ

| | |
|---|---|
| **Nguồn duy nhất** | `/Users/tranquangdang21/Projects/pi-ref/packages/telemetry/` (12 file) |
| **Đích** | `/Users/tranquangdang21/Projects/ultraworkers/packages/telemetry/` — **chưa tồn tại**, `git status` sạch |
| **Các cây khác** | `senpi-ref/packages/telemetry` tồn tại nhưng KHÔNG phải nguồn (tài liệu đã đóng câu "chép từ `pi`, không phải `senpi`" ở mục 356 của kế hoạch). `gajae-ref`/`claude-code-ref` chỉ có thư mục tên trùng, không liên quan. `deepseek-harness`, `codex-ref`, `opencode-ref` không có `packages/telemetry`. |

Kích thước 12 file — đã đo, khớp 100% với bảng trong kế hoạch:

```
590  CHANGELOG.md          995  package.json         20482  README.md
209  tsconfig.build.json   645  src/noop.ts          13363  src/index.ts
6067 src/memory.ts       10631  src/testing/conformance.ts
 198  src/testing/index.ts  743  src/testing/types.ts
7093  test/telemetry.test.ts  1815  test/conformance.test.ts
```

Tổng 12 file = 62831 byte ✓. Riêng 8 file code = 40555 byte ✓ (`13363+6067+645+198+743+10631+7093+1815`). Bảng trong kế hoạch liệt kê 13 dòng vì dòng `LICENSE` được ghi rõ là **file MỚI**, không phải file chép.

---

## 1. Cái gì thay đổi, quan sát được

Sau work item này, `packages/telemetry` tồn tại trong omp như một package lá **zero-dependency, zero-I/O, typecheck xanh, 15 test xanh, định dạng xanh** — và quan trọng nhất là **mọi byte chép đều đi kèm giấy phép**: `packages/telemetry/LICENSE` mở đầu bằng `Copyright (c) 2025 Mario Zechner` của Mario Zechner, nguyên văn, không sửa.

Không có gì trong omp dùng package này ngay sau khi chép (đã kiểm: `grep -rn "TelemetryContext\|InMemoryTelemetryContext\|defineTelemetrySchema\|createTypedSpanStarter\|NOOP_TELEMETRY_CONTEXT" packages --include="*.ts"` → **0 hit**). Nên "quan sát được" của work item này KHÔNG phải hành vi CLI — nó là: cây build xanh, và giấy phép đúng chỗ.

---

## 2. Bảng điểm sửa

Mọi dòng TRƯỚC trích nguyên văn từ file thật ở `pi-ref` (đã `sed -n "<n>p"` từng dòng).

### 2.1 Bỏ đuôi `.ts` — 16 specifier, mọi cái đều bắt được bằng `grep`

| đường/dẫn | symbol | TRƯỚC | SAU |
|---|---|---|---|
| `src/noop.ts:1` | import type | `import type { SpanOptions, TelemetryContext, TelemetrySpan } from "./index.ts";` | `... from "./index";` |
| `src/index.ts:24` | re-export noop | `export { NOOP_TELEMETRY_CONTEXT } from "./noop.ts";` | `export * from "./noop";` (đồng thời đổi barrel — xem 2.2) |
| `src/index.ts:356` | re-export type | `export type { RecordedTelemetryEvent, RecordedTelemetrySpan } from "./memory.ts";` | bị **xoá**, gộp vào 357 |
| `src/index.ts:357` | re-export memory | `export { InMemoryTelemetryContext } from "./memory.ts";` | `export * from "./memory";` |
| `src/memory.ts:8` | import type | `} from "./index.ts";` | `} from "./index";` |
| `src/memory.ts:9` | import noop | `import { NOOP_TELEMETRY_CONTEXT } from "./noop.ts";` | `import { NOOP_TELEMETRY_CONTEXT } from "./noop";` |
| `src/testing/index.ts:1` | barrel | `export { createTelemetryAdapterConformance } from "./conformance.ts";` | `export * from "./conformance";` |
| `src/testing/index.ts:6` | barrel | `} from "./types.ts";` | bị **xoá**, gộp vào dòng 1 (xem 2.2) |
| `src/testing/types.ts:1` | import type | `import type { TelemetryContext } from "../index.ts";` | `... from "../index";` |
| `src/testing/types.ts:2` | import type | `import type { RecordedTelemetrySpan } from "../memory.ts";` | `... from "../memory";` |
| `src/testing/conformance.ts:2` | import type | `import type { SpanAttributes, SpanOptions, SpanStatus, TelemetrySpan } from "../index.ts";` | `... from "../index";` |
| `src/testing/conformance.ts:3` | import type | `import type { RecordedTelemetrySpan } from "../memory.ts";` | `... from "../memory";` |
| `src/testing/conformance.ts:8` | import type | `} from "./types.ts";` | `} from "./types";` |
| `test/telemetry.test.ts:13` | import | `} from "../src/index.ts";` | `} from "../src/index";` |
| `test/conformance.test.ts:2` | import | `import { InMemoryTelemetryContext, type SpanAttributes } from "../src/index.ts";` | `... from "../src/index";` |
| `test/conformance.test.ts:3` | import | `import { createTelemetryAdapterConformance, type TelemetryAdapterFixture } from "../src/testing/index.ts";` | `... from "../src/testing/index";` |

Danh sách 16 dòng này **khớp tuyệt đối** với danh sách ở bước 3 của kế hoạch.

> ⚠️ Sửa bảng rewrite của kế hoạch: hai dòng `from "./index.ts" | 3` và `from "./memory.ts" | 3` trong bảng "Dependency mới" là **sai** — đo thật là **2** mỗi cái (`grep -rhoE 'from "\.[^"]*"' src test | sort | uniq -c`). Tổng 3+3+2+2+1+2+2+2+1 = 18, nhưng thực tế có **16** specifier. Tổng `16` ở bước 3 mới đúng.

### 2.2 Quy tắc barrel — 2 file

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
|---|---|---|---|
| `src/testing/index.ts` | barrel | 6 dòng: `export { createTelemetryAdapterConformance } from "./conformance.ts";` + `export type {` … `} from "./types.ts";` | đúng 2 dòng: `export * from "./conformance";` / `export * from "./types";` |
| `src/index.ts:24` | noop re-export | `export { NOOP_TELEMETRY_CONTEXT } from "./noop.ts";` | `export * from "./noop";` |
| `src/index.ts:356-357` | memory re-export | 2 dòng `export type {...}` + `export {...}` | 1 dòng `export * from "./memory";` |

**Tương đươt đã kiểm bằng đếm, không bằng mắt:** `noop.ts` export 1 tên, `memory.ts` export 3 (`RecordedTelemetryEvent`, `RecordedTelemetrySpan`, `InMemoryTelemetryContext`), `conformance.ts` export 1, `types.ts` export 3. Dạng star ra đúng 4 + 4 tên. **Và đã chạy thật:** bộ test 15/15 xanh với dạng star (xem §5).

### 2.3 `private` → `#private` — đúng 1 field

| đường/dẫn | symbol | TRƯỚC | SAU |
|---|---|---|---|
| `src/memory.ts:193` | field `state` | `	private readonly state: InMemoryTelemetryState = {` | `	#state: InMemoryTelemetryState = {` |
| `src/memory.ts:200` | `startSpan` body | `		return startInMemorySpan(this.state, undefined, options, callback);` | `		return startInMemorySpan(this.#state, undefined, options, callback);` |
| `src/memory.ts:205` | `getSpans` body | `		return this.state.spans.map((span) => ({` | `		return this.#state.spans.map((span) => ({` |

Hai method công khai `startSpan` (`:199`) và `getSpans` (`:204`) giữ dạng trần. **Đây là toàn bộ thay đổi privacy của package** — sau khi sửa, `grep -rnE 'private |protected |public ' src` phải ra 0 hit.

### 2.4 Đổi test runner — 2 dòng

| đường/dẫn | TRƯỚC | SAU |
|---|---|---|
| `test/telemetry.test.ts:1` | `import { describe, expect, expectTypeOf, it } from "vitest";` | `import { describe, expect, expectTypeOf, it } from "bun:test";` |
| `test/conformance.test.ts:1` | `import { describe, expect, it } from "vitest";` | `import { describe, expect, it } from "bun:test";` |

Không `vi`, không `mock`, không global nào khác — đó là toàn bộ việc migrate runner.

> **`expectTypeOf` CÓ thật trong `bun:test` — đã kiểm thực nghiệm**, viết và chạy: `bun test v1.3.14 → 1 pass / 0 fail`.
> Nhưng **tiền lệ mà kế hoạch dẫn (`packages/coding-agent/test/extensions-runner.test.ts:5`) thì SAI** — dòng đó là `import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "bun:test";`, **không có `expectTypeOf`**. Thực tế `grep -rln "expectTypeOf" packages/*/test packages/*/src` → **0 file**. `expectTypeOf` là API của bun, không phải tiền lệ có sẵn trong repo. Suy ra: work item này là chỗ **đầu tiên** dùng `expectTypeOf` trong omp → càng không được bỏ dòng import đó.

### 2.5 Xoá 2 assertion vô nghĩa

| đường/dẫn | symbol | TRƯỚC | SAU |
|---|---|---|---|
| `test/telemetry.test.ts:71` | `compileTimeFailures` #1 | `		expectTypeOf(compileTimeFailures).toBeFunction();` | **xoá** (giữ `const compileTimeFailures = ...` ở `:60`) |
| `test/telemetry.test.ts:152` | `compileTimeFailures` #2 | `		expectTypeOf(compileTimeFailures).toBeFunction();` | **xoá** (giữ binding ở `:138`) |

Hợp đồng thật là **9 comment `@ts-expect-error`** bên trong 2 closure đó: 4 trong closure thứ nhất (`:62, :64, :66, :68`), 5 trong closure thứ hai (`:140, :143, :145, :147, :149`). Chính 9 directive đó là cái `tsgo` ép — xem bằng chứng ở §5.3.

### 2.6 Thay 5 `not.toThrow()` trần bằng kết quả quan sát được

| đường/dẫn | TRƯỚC | SAU (hình dạng) |
|---|---|---|
| `test/telemetry.test.ts:55` | `expect(() => JSON.stringify(schema)).not.toThrow();` | `expect(JSON.stringify(schema)).toBe(<chuỗi definition mong đợi>)` — chứng minh serialize **đúng**, không chỉ "không ném" |
| `test/telemetry.test.ts:122-124` | `expect(() =>`<br>`  createTypedSpanStarter(telemetryContext, unreadable([operationSchema, requestSchema] as const)),`<br>`).not.toThrow();` | gán `const unreadableStarter = createTypedSpanStarter(...)`, rồi `expect(await unreadableStarter("operation", { kind: "read" }, () => 42)).toBe(42)` — chứng minh `_schemas` **chưa từng được đọc** (proxy `unreadable` ném ngay ở getter nếu bị chạm) |
| `test/telemetry.test.ts:192` | `expect(() => span.addEvent("event", attributes)).not.toThrow();` | callback `return sentinel` sau cả 3 lời gọi; `expect(await result).toBe(sentinel)` |
| `test/telemetry.test.ts:193` | `expect(() => span.setAttributes(attributes)).not.toThrow();` | (cùng sentinel) |
| `test/telemetry.test.ts:194` | `expect(() => span.setStatus(status)).not.toThrow();` | (cùng sentinel) |

Về `:192-194`: `unreadable()` (`:188, :190, :191`) trả `Proxy` **ném ở `get`**. Nếu context no-op chạm vào payload, callback throw và promise reject — nên assert sentinel resolve được **là** bằng chứng "không hề inspect". Đó là một assertion thật, không phải đổi hình thức.

> **8 lời gọi `doesNotThrow(...)` trong `src/testing/conformance.ts` thì ĐỂ YÊN** — đó là code thư viện trong một export được publish, không phải assertion test của omp. Vị trí: `:212`, `:228`, `:229`, `:230`, `:289`, `:290`, `:291`, `:306` (đếm bằng `grep -n doesNotThrow` — khớp 100%).

### 2.7 `package.json` — dựng lại, không đổi token

| mục | TRƯỚC (`pi-ref/packages/telemetry/package.json`) | SAU (theo khuôn `packages/wire/package.json`) |
|---|---|---|
| `name` | `"@earendil-works/pi-telemetry"` (L2) | `"@oh-my-pi/pi-telemetry"` |
| `version` | `"0.87.1"` (L3) | **xem §7 — không phải `18.3.3`** |
| `description` | `"Vendor-neutral telemetry contracts and typed schema utilities for pi"` (L4) | `"... for omp"` |
| `author` | `"Mario Zechner"` (L33) | `{ "name": "Stencil Labs, Inc.", "url": "https://stencil.so" }` (khớp L7 của wire) |
| `main` / `types` | `./dist/index.js` / `./dist/index.d.ts` (L6-7) | `./src/index.ts` / `./src/index.ts` (khớp wire L23-24) |
| `exports` | 2 entry trỏ `./dist/*` (L8-17) | `{".": {types,import} → "./src/index.ts", "./testing": {...} → "./src/testing/index.ts"}` |
| `files` | `["dist","README.md"]` (L18-21) | xem §7 — bàn lại |
| `scripts` | `clean`/`build`/`test`/`prepublishOnly` (L22-27) | `check` / `check:types` (`tsgo -p tsconfig.json --noEmit`) / `lint` (`oxlint .`) / `fix` / `fmt` — copy nguyên khối wire L25-31 |
| `engines` | `{"node": ">=22.19.0"}` (L40-42) | `{"bun": ">=1.3.14"}` |
| `devDependencies` | `{"@types/node": "22.19.19", "vitest": "4.1.9"}` (L43-46) | `{"@types/bun": "catalog:"}` |
| `dependencies` | không có | không có |
| `repository.url` | `git+https://github.com/earendil-works/pi.git` (L37) | `git+https://github.com/can1357/oh-my-pi.git` + `directory` |
| `homepage` / `bugs` | không có | `https://omp.sh` / `.../issues` (wire L6, L14-16) |
| `keywords`, `license` | giữ | giữ nguyên |

**Đặc biệt:** `"build": "tsc -p tsconfig.build.json"` (L24) phải **xoá hẳn** — AGENTS.md cấm `tsc` tuyệt đối, và omp `noEmit:true` không có chỗ để build.

### 2.8 `tsconfig.build.json` → `tsconfig.json`

| | TRƯỚC | SAU |
|---|---|---|
| file | `packages/telemetry/tsconfig.build.json` (209 B, 8 dòng) | **xoá**; tạo mới `packages/telemetry/tsconfig.json` |
| nội dung | `{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "./dist", "rootDir": "./src" }, "include": ["src/**/*.ts"], "exclude": [...] }` | `{`<br>`	"extends": "../tsconfig.workspace.json",`<br>`	"include": ["src", "test"]`<br>`}` |

Khuôn lấy từ `packages/wire/tsconfig.json` — đã mở, đúng **4 dòng**. Không cần bước chép riêng: `packages/tsconfig.workspace.json` đã glob `*/src` và `*/test`.

### 2.9 `LICENSE` — file MỚI, byte-tái-lập-được

`/Users/tranquangdang21/Projects/pi-ref/LICENSE` đo được: **1069 byte**, 21 dòng text, **không kết thúc bằng newline** (`tail -c1` → `2e`).

Sau khi nối 2 dòng copyright của omp (`Copyright (c) 2025-2026 Can Bölük` + `Copyright (c) 2026 Stencil Labs, Inc.`, mỗi dòng có newline = 74 byte): `1069 + 74 = 1143` ✓ đúng con số trong bảng. Khuôn: `packages/wire/LICENSE` (dòng `Copyright (c) 2025-2026 Can Bölük` ở L3, `Copyright (c) 2026 Stencil Labs, Inc.` ở L4).

**Bố cục bắt buộc:** dòng `Copyright (c) 2025 Mario Zechner` của Mario phải đứng **đầu tiên**, nguyên văn, không sửa không đảo.

---

## 3. Các bước (mỗi bước có neo đã kiểm)

> Mọi neo dưới đây tôi đã mở và đọc trong lần chạy này. Nếu một neo không có mặt ở đây thì nó nằm trong §7.

**1. PHÁP LÝ TRƯỚC, trước khi ghi bất kỳ byte code nào.**
Tạo `packages/telemetry/LICENSE`: `cp` nguyên văn `/Users/tranquangdang21/Projects/pi-ref/LICENSE`, rồi nối 2 dòng copyright omp. Vì file pi không có newline cuối, nối bằng `printf '\nCopyright (c) 2025-2026 Can Bölük\nCopyright (c) 2026 Stencil Labs, Inc.\n' >> …` rồi xoá newline thừa ở L3, hoặc đơn giản hơn: viết lại file bằng `Bun.write` với nội dung ghép tay và `join("\n")`. **Đặt thông báo TRƯỚC khi chép code** — gắn thông báo sau là cách ghi công bị thất lạc.
*Kiểm:* `grep -c 'Copyright (c) 2025 Mario Zechner' packages/telemetry/LICENSE` → phải ra `1`; `wc -c` → `1143`.
*Neo:* `pi-ref/LICENSE:3` (dòng Mario), `packages/wire/LICENSE:3-4` (khuôn 2 dòng omp).

**2. Tạo `packages/telemetry/{src,src/testing,test}` và chép nguyên văn 8 file (40555 B).** Không sửa gì ở bước này — kể cả chưa format.
*Neo:* `pi-ref/packages/telemetry/src/{index,memory,noop}.ts`, `src/testing/{index,types,conformance}.ts`, `test/{telemetry,conformance}.test.ts`.

**3. Bỏ đuôi `.ts` khỏi 16 specifier** — danh sách đủ 16 dòng ở §2.1.
*Neo:* `src/noop.ts:1`; `src/index.ts:24,356,357`; `src/memory.ts:8,9`; `src/testing/index.ts:1,6`; `src/testing/types.ts:1,2`; `src/testing/conformance.ts:2,3,8`; `test/telemetry.test.ts:13`; `test/conformance.test.ts:2,3`.
*Đã đo:* `grep -rnoE 'from "\.[^"]*\.ts"' src test` → đúng 16 dòng, khớp bảng ở §2.1.

**4. Áp quy tắc barrel.** `src/testing/index.ts` → đúng 2 dòng. `src/index.ts:24` → `export * from "./noop";`, `:356-357` → gộp `export * from "./memory";`.
*Neo:* `src/index.ts:24,356,357`; `src/testing/index.ts:1,6`.
*Đếm tương đương:* 1 (noop) + 3 (memory) = 4; 1 (conformance) + 3 (types) = 4.

**5. `private` → `#private`.** Đúng 3 dòng.
*Neo:* `src/memory.ts:193,200,205`.
*Sau bước này:* `grep -rnE 'private |protected |public ' packages/telemetry/src/` phải ra **0 hit**.

**6. Đổi test runner, 2 dòng.**
*Neo:* `test/telemetry.test.ts:1`, `test/conformance.test.ts:1`.
*Đã kiểm:* `expectTypeOf` export thật từ `bun:test` (chạy thật, xanh).

**7. Xoá 2 assertion vô nghĩa.**
*Neo:* `test/telemetry.test.ts:71,152`.

**8. Thay 5 `not.toThrow()` trần.** Chi tiết ở §2.6.
*Neo:* `test/telemetry.test.ts:55,122-124,192-194`.
*Để yên:* 8 `doesNotThrow` trong `src/testing/conformance.ts`.

**9. Viết `packages/telemetry/package.json`** theo §2.7 + sửa version theo §7.
*Neo:* `packages/wire/package.json:1-54` (khuôn); `pi-ref/packages/telemetry/package.json:1-47` (nguồn).
*BẮT BUỘC:* phải có script `check:types` — xem §5.4, đây là bẫy cổng lớn nhất của work item này.

**10. Viết `packages/telemetry/tsconfig.json`** (4 dòng, thân §2.8). **Không** port `tsconfig.build.json`.
*Neo:* `packages/wire/tsconfig.json:1-4`.

**11. Đăng ký vào `package.json` gốc, mục `workspaces.catalog`** — vị trí chữ cái xem §7. Không sửa glob `workspaces.packages` (`packages/*` đã phủ), không cần path mapping.
*Neo:* `package.json` (`workspaces.catalog`).

**12. Viết lại `CHANGELOG.md`** theo khuôn omp: `# Changelog` + `## [Unreleased]` + đúng một `### Added`. **Không** chép 11 heading có ngày của pi (`0.84.0` → `0.87.1` — đã đếm: 11).
*Neo:* `pi-ref/packages/telemetry/CHANGELOG.md:5,7,9,11,13,15,17,19,21,23,25`.

**13. Viết lại `README.md`** — 13 occurrence scope (đếm lại bằng `grep -n earendil-works README.md`), mục 'Pi Package Integration' viết lại, mục Development sang `bun`, mục License ghi tên Mario Zechner.
*Neo:* `README.md:1,36,72,139,159,180,186,219,326,369,370,371,380` (13 occurrence, đã đọc từng dòng); `:365` (`## Pi Package Integration`), `:373`/`:381` (hàng rào code block), `:447`/`:460` (`## Development`), `:462`/`:464` (`## License` / `MIT`).

**14. Thêm entry vào `THIRD-PARTY-NOTICES.txt`** dưới heading `TRACKED VENDORED CODE AND ASSET NOTICES`, theo đúng format entry `crates/vendor/brush-core/LICENSE`.
*Neo:* `THIRD-PARTY-NOTICES.txt:18` (heading), `:22` (tên entry mẫu), `:24-30` (thân entry mẫu).

**15. `oxfmt` TRƯỚC khi chạy cổng.**
```bash
bunx oxfmt 'packages/telemetry/src/**/*.{ts,tsx}' 'packages/telemetry/test/**/*.ts'
```
*Đã đo:* đúng **5/8 file** cần format — `src/index.ts`, `src/memory.ts`, `src/testing/conformance.ts`, `test/conformance.test.ts`, `test/telemetry.test.ts`; in ra `Format issues found in above 5 files`. Lý do: `.oxfmtrc.json:4` `printWidth: 120` và `:10` `arrowParens: "avoid"`.
*Sau khi format, số dòng dịch chuyển:* `doesNotThrow` ở `conformance.ts` đi từ `:228-230` → `:219-221`. Đừng tra neo bằng số dòng sau bước 15.

**16. CỔNG.** Xem §5.

---

## 4. Hợp đồng test

Hai file, cùng sang `bun:test`, cùng ở mức hợp đồng (không source-grep, không `mock.module`, không mệnh đề vô nghĩa).

### 4.1 `packages/telemetry/test/telemetry.test.ts` — 5 test, 3 hợp đồng

| # | test | hợp đồng bảo vệ | **người dùng thấy gì nếu hồi quy** |
|---|---|---|---|
| 1 | `preserves serializable definitions and infers exact attributes` (`:30`) | `defineTelemetrySchema` trả **chính** đối số (`:54`); definition sống sót qua `JSON.stringify` (`:55` — sau bước 8 là so khớp chuỗi); 4 `@ts-expect-error` (`:62,64,66,68`) chứng minh tập khoá đóng | adapter phát span với khoá thuộc tính **sai chính tả hoặc chưa khai báo**; không có kiểm runtime nào bắt được, và nếu type cũng hỏng thì build đỏ ở `@ts-expect-error` thành `TS2578` |
| 2 | `combines schema vocabularies and binds child starters to their parent spans` (`:74`) | `createTypedSpanStarter` trên 2 schema tên rời nhau resolve về `42` (`:115`) với chuỗi `parentId` operation→request (`:120-121`); 5 `@ts-expect-error` (`:140,143,145,147,149`) chứng minh tên trùng / tên union / thuộc tính lệch schema đều là lỗi biên dịch | span con không gắn được vào span cha → cây trace đứt; hoặc thuộc tính của schema A lọt sang span của schema B |
| 3 | `admits callbacks synchronously and reuses one inert span` (`:157`) | no-op context nhận callback **đồng bộ** (`admitted` true ngay, `:168`), `startSpan` con trả **cùng object span** (`:164`), span đóng băng (`:170`) | callback bị đẩy sang microtask → mọi code đo "đã vào chưa" trong callback sai lệch 1 tick |
| 4 | `preserves synchronous and asynchronous rejection values` (`:173`) | giá trị bị từ chối giữ **nguyên danh tính** cho cả throw đồng bộ lẫn async rejection (`:178, :184`) | `catch` trong code ứng dụng nhận `undefined` thay vì lỗi thật |
| 5 | `does not inspect or retain telemetry payloads` (`:187`) | sau bước 8: callback trả sentinel và sentinel resolve ⇒ context no-op **không hề inspect** proxy `unreadable` (proxy ném ở `get`) | context no-op đọc payload → ném exception lúc runtime trên telemetry nên bị bỏ qua |

### 4.2 `packages/telemetry/test/conformance.test.ts` — 10 test

9 case từ `createTelemetryAdapterConformance` (`conformance.ts:61`), chạy trên `InMemoryTelemetryContext` dưới `bun:test` — đó là toàn bộ lý do tồn tại của bộ case (portable giữa các runner). **Đếm đủ 9** (`grep -n 'createCase(' src/testing/conformance.ts`):

| # | group | name | dòng |
|---|---|---|---|
| 1 | `callback lifecycle` | `admits once synchronously and preserves the result` | `:65` |
| 2 | `callback lifecycle` | `preserves synchronous and asynchronous rejection values` | `:87` |
| 3 | `status` | `uses last explicit status without automatic overwrite` | `:142` |
| 4 | `recording` | `merges attributes and records ordered events` | `:184` |
| 5 | `recording` | `ignores failed attribute calls atomically` | `:206` |
| 6 | `recording` | `makes calls after settlement inert` | `:220` |
| 7 | `parentage` | `records nested and concurrent child relationships` | `:246` |
| 8 | `passivity` | `suppresses unreadable telemetry payload failures` | `:274` |
| 9 | `passivity` | `ignores failed status calls atomically` | `:301` |

+1 test riêng: `returns detached snapshots without exposing mutable recording state` (`conformance.test.ts:23`) — sửa `attributes.tags` và `events[0].attributes.value` trên snapshot trả về không ảnh hưởng `getSpans()` kế tiếp (`:43-44`), và `settled`/`endSequence` đi từ `false`/`undefined` → `true`/`1` xuyên suốt `startSpan` đã await (`:34-38`).

**Tổng: 5 + 10 = 15 test.** Đã đo: `bun test` in `15 pass / 0 fail / 23 expect() calls`. Khớp tuyệt đối với con số `15 pass` trong kế hoạch.

### 4.3 AGENTS.md cấm gì ở đây

`not.toThrow()` trần và assertion kiểu "code chạy" bị cấm trong `test/`. 5 thay thế ở bước 8 là **bắt buộc**, không phải sở thích văn phong. 9 `doesNotThrow` trong `src/testing/` **không** thuộc diện (đó là thư viện trong export được publish).

---

## 5. Cổng

### 5.1 Ba lệnh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers

# 1. test
bun test packages/telemetry/

# 2. type + lint + format (gộp cả 3 lớp)
bun run check:ts
```

`check:ts` = `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`
- `check:tools` = `oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' 'packages/*/*.ts' 'scripts/**/*.ts'`
- `check:types` mỗi package = `tsgo -p tsconfig.json --noEmit`

**Kết quả thật sau khi làm đúng cả 16 bước** (tôi đã dựng, chạy, rồi xoá sạch):
`bun test` → 15/0 · `oxfmt --check` → exit 0 · `tsgo` → exit 0.

### 5.2 Cổng này CÓ ĐỎ ĐƯỢC KHÔNG — và BẰNG CÁCH NÀO

Tôi đã **tiêm hồi quy thật** vào cây rồi đo lại. Bảng dưới là số đo, không phải phỏng đoán.

| hồi quy tiêm vào | `bun test` | `tsgo` | `oxfmt --check` |
|---|---|---|---|
| chép nguyên văn, **chưa migrate gì** | 🟢 **15/0 XANH** | 🔴 TS5097 ×7 + TS2307 ×2 | 🔴 5 file |
| bỏ qua riêng bước 6 (vitest→bun:test) | 🟢 **XANH — MÙ** | 🔴 TS2307 ×2 | — |
| bỏ 9/16 đuôi `.ts` (các import **type-only**) | 🟢 xanh | 🟢 **XANH — MÙ** | — |
| bỏ 7/16 đuôi `.ts` (import giá trị) | 🟢 xanh | 🔴 TS5097 ×7 | — |
| vô hiệu hoá `ExactTelemetryAttributes` (`index.ts:140-141`) | 🟢 xanh (mù) | 🔴 `TS2578 Unused '@ts-expect-error'` tại `test/telemetry.test.ts:143` | — |
| gỡ 3 chốt ghi-sau-settlement (`memory.ts:135,143,151`) | 🔴 **1 fail** — `recording > makes calls after settlement inert` | 🟢 xanh | — |
| gỡ chốt settle hai-lần (`memory.ts:88`) | 🟢 **XANH — MÙ** | 🟢 **XANH — MÙ** | — |
| sai định dạng | 🟢 xanh | 🟢 xanh | 🔴 đỏ |

**Kết luận: cổng ĐỎ ĐƯỢC, thật, và ba lớp bổ sung cho nhau — không lớp nào thừa.** Nhưng có **ba điểm mù** phải nói thẳng:

1. **`bun test` một mình MÙ với việc đổi runner.** Bun tự alias `vitest` → `bun:test` khi chạy test. Tôi đã chứng minh: chép nguyên văn (vẫn `import … from "vitest"`, `vitest` **không hề nằm trong `node_modules`**) mà `bun test` vẫn ra `15 pass`. Chỉ `tsgo` mới bắt được (TS2307 ×2). → **Phải chạy CẢ HAI**, không được chạy `bun test` rồi cho là xong.
2. **`tsgo` MÙ với 9/16 đuôi `.ts`.** TS5097 chỉ nổ trên import/export **giá trị** viết trong **một dòng**. 9 specifier còn lại đều là `import type` / `export type` hoặc nằm ở dòng tiếp của khối import nhiều dòng ⇒ TypeScript xoá chúng trước khi resolve nên **không báo lỗi**. → **grep thủ công là bắt buộc**, không phải thói quen.
3. **Cả hai cổng đều MÙ với chốt settle hai-lần (`memory.ts:88`).** Gỡ `if (span.settled) return;` trong `settleSpan` ⇒ `bun test` 15/0, `tsgo` exit 0. Không case nào trong 9 case quan sát `endSequence` bị đếm hai lần. Đây là **lỗ hổng thật trong bộ case được port**, và kế hoạch **không nhắc tới nó**. Xem §6.

### 5.3 ⚠ Sửa một tuyên bố sai trong kế hoạch

Kế hoạch viết (bước 3, lặp lại ở phần Rủi ro):

> *"đã thử lại — giữ nguyên đuôi `.ts` vẫn typecheck sạch, vì `tsconfig.base.json` đặt `moduleResolution: "Bundler"` nên TypeScript cho phép đuôi `.ts` mà không cần `allowImportingTsExtensions`. **TS5097 KHÔNG nổ lên.**"* / *"cổng KHÔNG bắt được sót bước 3"*.

**SAI. Tôi đã chạy lại với đúng chuỗi kế thừa thật của repo** (`packages/telemetry/tsconfig.json` → `packages/tsconfig.workspace.json` → `tsconfig.base.json`): `tsgo` exit **1**, in `error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.` ở 7 chỗ. `tsconfig.base.json` có `moduleResolution: "Bundler"` (L6) và `noEmit: true` (L14) nhưng **không** có `allowImportingTsExtensions`.

Hệ quả cho người gõ: bước 3 **có cổng đỏ**, đừng vì tin kế hoạch mà bỏ. Nhưng đừng tin ngược lại là 16/16 đều bị bắt — vẫn phải grep (mục mù #2 ở §5.2).

### 5.4 ⚠ Cạm bẫy cổng lớn nhất: `--if-present` làm cổng tắt im lặng

`check:ts` chạy `bun run --filter './packages/*' --sequential --if-present check:types`. `--if-present` nghĩa là **package không có script `check:types` thì bị bỏ qua, im lặng, không báo**.

Tôi đã đo cả hai vế:
- Có một lỗi type thật trong `packages/telemetry/src/memory.ts`, **không có** `packages/telemetry/package.json` ⇒ `bun run --filter './packages/*' --if-present check:types` exit **0**. Cổng type **hoàn toàn mù** với package mới.
- Thêm `packages/telemetry/package.json` có `check:types` ⇒ cùng lỗi đó, cổng exit **1**, in `src/memory.ts(198,3): error TS1068`.

⇒ **Bước 9 (`package.json`) không phải việc giấy tờ — nó là công tắc bật cổng.** Trong toàn bộ cửa sổ giữa bước 2 và bước 9, package mới chỉ còn được `oxfmt --check` soi (theo path) chứ **không** có typecheck nào. Nếu bạn định dừng giữa chừng, hãy viết `package.json` sớm.

### 5.5 Cổng thứ ba — `bun --cwd=packages/natives run build`

Kế hoạch (bản cũ) nói cổng này *"không chạy được (thiếu `ninja`)"*. **Trên máy này nó chạy được** — tôi đã chạy: `Compiling pi-natives v18.4.0 … Finished \`local\` profile … in 1m 22s`, exit 0, sinh `packages/natives/native/pi_natives.darwin-arm64.node`. Một agent khác đã sửa dòng này trong kế hoạch sau đó (xem §7 #13).

Không cần cho telemetry. Nhưng lưu ý lý do thật khiến `bun test packages/telemetry/` xanh: telemetry **không import `@oh-my-pi/pi-natives`**, nên nó xanh **kể cả khi addon chưa build** — khác với `packages/utils` và `packages/agent` vốn kéo addon. Nếu máy bạn thiếu `ninja`, cổng này đỏ **không liên quan** đến work item này — đừng để nó làm nhiễu.

### 5.6 Grep khép vòng (không thay thế được cổng nào)

```bash
grep -rn 'earendil' packages/telemetry/                        # 0
grep -rn 'vitest' packages/telemetry/                          # 0
grep -rnE 'private |protected |public ' packages/telemetry/src/ # 0
grep -rnoE 'from "\.[^"]*\.ts"' packages/telemetry/            # 0
grep -rn 'not\.toThrow()' packages/telemetry/test/             # 0
grep -c 'Copyright (c) 2025 Mario Zechner' packages/telemetry/LICENSE  # 1
wc -c packages/telemetry/LICENSE                               # 1143
grep -c 'check:types' packages/telemetry/package.json          # 1   <- bật cổng type
```

Dòng cuối không có trong kế hoạch — thêm vào.

---

## 6. Cạm bẫy riêng của work item này

**6.1 — `startSpan` nghĩa ngược nhau, và cả hai đều tên `startSpan`.**
Bên pi: `startSpan(options, callback) => Promise<T>` — span **chỉ sống trong callback** (`src/index.ts:15`, `memory.ts:199`, `noop.ts:3`). Bên omp: helper module-private `function startSpan(` (`packages/agent/src/telemetry.ts:476`) và `telemetry.tracer.startSpan(` (`:512`) — span **tồn tại ngoài callback**. Cùng tên, mô hình thời gian sống ngược nhau. May mắn là package telemetry **không định nghĩa binding `startSpan` trần nào** nên bên trong nó không xung đột. Mối nguy thật sự là một file tương lai import cả hai — file đó **không được alias import nào về tên trần `startSpan`**. Đây là va chạm tâm lý rủi ro nhất của cả lần migrate; dễ quên nhất lúc review vì hai bên đều "đúng".

**6.2 — Ba tên trùng với `@opentelemetry/api`, và giữ tên là đúng.**
`AttributeValue`, `SpanOptions`, `SpanStatus` đều đã tồn tại trong omp với hình dạng khác. **Đừng "thống nhất"** — của pi là hợp đồng callback-scoped, của OTEL là kiểu wire span immediate, gộp lại sẽ bắt một trong hai test double phải đổi. Hôm nay không gì vỡ vì không type nào được barrel của omp re-export. Nhưng nếu ai đó sau này thêm `export * from "@oh-my-pi/pi-telemetry"` vào `packages/agent/src/index.ts`, nó đụng `export * from "./telemetry"` sẵn có ở `index.ts:24` ⇒ **ambiguous star export**. Ràng buộc này phải mang sang spec của `packages/agent`, không phải sửa ở đây.

**6.3 — `index.ts:140-141` là dòng quan trọng nhất và dễ mất nhất của cả package.**
```ts
export type ExactTelemetryAttributes<Expected, Actual extends Expected> = Actual &
	Record<Exclude<keyof Actual, keyof Expected>, never>;
```
Đừng viết lại, đừng rút gọn xuống một dòng, đừng đổi thứ tự. Nó là thứ chặn khoá thuộc tính lạ. Tôi đã thử **xoá vế `Record<…, never>`** ⇒ `tsgo` đỏ `TS2578 Unused '@ts-expect-error' directive` tại `test/telemetry.test.ts:143`. Đây là dòng duy nhất trong package được typecheck canh giữ bằng cơ chế directive.

**6.4 — `memory.ts:88` là lỗ hổng thật, không ai nhắc tới.**
`settleSpan` mở đầu bằng `if (span.settled) return;` — chốt **idempotency khi settle hai lần**. Ba chốt còn lại (`:135, :143, :151` — ghi-sau-settlement) **có** được case `makes calls after settlement inert` che, nhưng chốt `:88` thì **không case nào quan sát**: gỡ đi, cả `bun test` lẫn `tsgo` vẫn xanh. Không phải lý do để không chép — nhưng nếu bạn thấy ai đó "dọn code" dòng đó, đó là hồi quy âm thầm. Cân nhắc thêm một assertion quan sát `endSequence` không bị đếm hai lần.

**6.5 — `oxfmt` làm dịch số dòng, và 8 `doesNotThrow` nằm trong vùng đó.**
Bước 15 reflow file, `conformance.ts` co lại: `doesNotThrow` đi từ `:228-230` → `:219-221`. **Sau khi chạy `oxfmt`, đừng còn tra neo bằng số dòng của file `pi`.** Cùng cảnh báo cho `test/telemetry.test.ts` nếu bạn thêm assertion ở bước 8.

**6.6 — Copy đã giữ tab. Tab KHÔNG phải nguồn diff.**
`.oxfmtrc.json:2-3` đặt `useTabs: true`, `tabWidth: 3`. `pi` cũng dùng tab. Nếu `oxfmt --check` đỏ, nguyên nhân là `printWidth: 120` / `arrowParens: "avoid"`, không phải thụt lề.

**6.7 — `files` trong manifest: kế hoạch dặn xoá, khuôn `wire` thì giữ.**
Kế hoạch bảo xoá mảng `files`. Nhưng `packages/wire/package.json:38-42` **có** `files: ["src","README.md","CHANGELOG.md"]`, và nó tồn tại chính vì thế — publish package lúc đó không kéo `test/` vào tarball. Package telemetry có `test/` riêng. Nếu telemetry sẽ publish (một câu hỏi mở ở phần "Cần người quyết"), **giữ `files` và đặt `["src", "README.md", "CHANGELOG.md"]`**; nếu internal thì xoá cũng được. Đây là chỗ dễ "làm theo đúng kế hoạch" rồi âm thầm đóng gói cả test vào bản publish.

**6.8 — `L50-186` của `memory.ts` không được đụng, và đó là phần khó nhất.**
Khối đó chứa toàn bộ logic settlement / atomicity / passivity — mỗi `try/catch` quanh một ghi đều ăn nuốt lỗi (`// Recording is passive. Ignore malformed or unreadable telemetry payloads.`). Chép sai ở đây là thay đổi hành vi im lặng. Đây cũng là lý do bước 5 chỉ đổi đúng 3 dòng.

**6.9 — Vế pháp lý không hoàn tác được, nên nó là bước 1 chứ không phải việc phụ ở bước 13.**
Ghi công mà gắn sau khi đã chép code là cách ghi công bị thất lạc. Nếu có agent nào chạy ngược thứ tự, hãy dừng nó lại ở đây.

**6.10 — Zero người dùng, nên hỏng âm thầm là chuyện thật.**
35/38 symbol có 0 ref trong omp (đã kiểm: `TelemetryContext`, `InMemoryTelemetryContext`, `defineTelemetrySchema`, `createTypedSpanStarter`, `NOOP_TELEMETRY_CONTEXT` → 0 hit). Bán kính nổ giới hạn trong `packages/telemetry` và không thể làm hỏng CLI — nhưng cũng nghĩa là **không có tín hiệu nào ngoài cổng báo bạn**. Đó chính là lý do §5.2 bắt buộc phải đo.

---

## 7. Chỗ kế hoạch SAI so với cây thật (ghi ra, không sửa trong tài liệu)

| # | Kế hoạch nói | Cây thật | Ảnh hưởng |
|---|---|---|---|
| 1 | Version `18.3.3` (bước 9 + "Cần người quyết") | omp đang ở **`18.4.0`** — cả 12 package `@oh-my-pi/*` | **Sửa ngay.** Ghi `18.3.3` tạo package lệch version, `bun run release` sẽ loạn. Dùng `18.4.0`. |
| 2 | Chèn catalog "giữa `@oh-my-pi/pi-tui` và `@oh-my-pi/pi-utils`" (bước 11) | Alphabet: `pi-natives` < **`pi-telemetry`** < `pi-tui` (`te` < `tu`) | Chèn sai chỗ. Đúng là **giữa `@oh-my-pi/pi-natives` và `@oh-my-pi/pi-tui`**. |
| 3 | Bảng rewrite: `from "./index.ts"` **3**, `from "./memory.ts"` **3** | Đo thật: **2** và **2** (tổng 16, không phải 18) | Đếm sai ở 2 dòng. Danh sách 16 dòng ở bước 3 thì đúng. |
| 4 | "TS5097 KHÔNG nổ lên" / "cổng KHÔNG bắt được sót bước 3" (bước 3 + Rủi ro) | `tsgo` exit **1**, TS5097 ở 7 chỗ | Sai về cơ chế. Bước 3 **có** cổng đỏ (7/16). Xem §5.3. |
| 5 | `packages/agent/src/telemetry.ts:181` = `TelemetrySpanKind` | Thật là **`:189`** | Lệch 8 dòng. |
| 6 | `packages/agent/src/telemetry.ts:466` = helper `startSpan` | Thật là **`:476`** (`function startSpan(`) | Lệch 10 dòng. |
| 7 | `packages/agent/src/telemetry.ts:500` = `telemetry.tracer.startSpan(...)` | Thật là **`:512`** | Lệch 12 dòng. |
| 8 | `packages/agent/src/telemetry.ts:2100` = `setSpanAttribute(...)` | Thật là **`:2223`** (`export function setSpanAttribute(span: Span | undefined, key: string, value: AttributeValue): void {`) | Lệch 123 dòng. |
| 9 | `packages/agent/src/telemetry.ts:2106` = dòng re-export (`Attributes, Span, SpanKind, SpanStatusCode, Tracer, trace`) | L2106 là `ToolsOkCount = "omp.gen_ai.agent.tools.ok.count",`. Khối re-export thật ở **`:2229`**: `export { type Attributes, type Span, SpanKind, SpanStatusCode, type Tracer, trace };` | Đúng nội dung nhưng lệch 123 dòng — cùng hệ số với #8, #10, nên cả ba neo đều lệch đúng một lần thêm code. Lưu ý: danh sách này **không** có `AttributeValue`/`SpanOptions`/`SpanStatus` ⇒ xác nhận cơ sở của va chạm #6.2 ở §6. |
| 10 | `packages/agent/src/telemetry.ts` "2114 dòng" | **2237** dòng | Sai 123 dòng — cùng hệ số với #8, cùng một lần thêm code. |
| 11 | `packages/coding-agent/src/telemetry-export-otlp.ts:399` dùng `AttributeValue` | `:399` là `try {`. `AttributeValue` dùng ở **`:25`** (import) và **`:393`** (`function logAttributeValue(value: unknown): AttributeValue \| undefined`) | Lệch 6 dòng. |
| 12 | `packages/coding-agent/test/extensions-runner.test.ts:5` là tiền lệ `expectTypeOf` | Dòng đó không có `expectTypeOf`; cả omp có **0** occurrence | Tiền lệ bịa. Kết luận vẫn đúng (đã chạy thật) nhưng phải tự kiểm. Xem §2.4. |
| 13 | `bun --cwd=packages/natives run build` "không chạy được (thiếu ninja)" | **Đã được sửa trong kế hoạch** (dòng 2377, bởi agent khác, sau khi tôi đo): nay ghi rõ cần `ninja` trước, `brew install ninja` xong thì exit 0. Đo của tôi khớp: build thành công 1m22s | ~~Không còn là sai~~. Giữ lại để biết addon **đã** build ⇒ `bun test packages/telemetry/` chạy được không chỉ vì telemetry là package lá, mà vì addon cũng có sẵn. Nếu mất addon, telemetry vẫn xanh (không import natives) — đó là lý do thật. |
| 14 | `packages/stats` `db.ts 74 KB, parser.ts 19 KB, trace.ts 41 KB` | `db.ts` **59 KB** (60118 B), `parser.ts` **24 KB** (24157 B), `trace.ts` **42 KB** (42520 B) | Mô tả sai, không ảnh hưởng gõ. |

**Neo ĐÚNG, đã xác nhận** (để không phải tra lại): `packages/agent/src/telemetry.ts:44` (import `type AttributeValue`), `packages/coding-agent/src/telemetry-export-otlp.ts:25` (import), `packages/agent/src/index.ts:24` (`export * from "./telemetry";`), toàn bộ 9 neo `run-summary.test.ts` (`:24,27,28,36,37,45,72,76,83`), `packages/utils/src/abortable.ts:1` và `packages/ai/test/fixtures/completion-retention.ts:1` (cả hai `import assert from "node:assert/strict"` — default import, đúng như kế hoạch nói), `packages/omptype/test/ark/realWorld.test.ts:2` (`import { AssertionError } from "node:assert"` — named import ở `node:assert`, đúng như kế hoạch nói), `packages/coding-agent/test/storage-errors.test.ts:35` (`await using …`), `packages/wire/tsconfig.json:1-4`, `packages/wire/LICENSE:3-4`, `THIRD-PARTY-NOTICES.txt:18,22,24-30`, `.oxfmtrc.json:4,10`, `tsconfig.base.json:6,14`, `pi-ref/packages/agent/src/harness/telemetry.ts` (`AI_TELEMETRY_SCHEMA:42`, `HARNESS_TELEMETRY_SCHEMA:233` — bên pi, và omp **không** có `packages/agent/src/harness/`).

**Bảng "Bề mặt công khai": 38 dòng, đếm được đúng 38 ✓.** Khớp 100% với export thật.

---

## 8. Câu hỏi cần người quyết (chuyển tiếp, không tự quyết)

1. **`@oh-my-pi/pi-telemetry` hay `@oh-my-pi/omp-telemetry`?** — đổi tên package đã phát hành rất đau để hoàn tác. Chốt TRƯỚC khi chép.
2. **Publish hay internal?** — quyết định này quyết định giữ hay xoá `files` (§6.7), và quyết định lý do tồn tại của conformance suite. Không publish ⇒ phải cân nhắc bỏ subpath `./testing`.
3. **Version** — dùng `18.4.0` theo cây thật (§7 #1). Chỉ cần xác nhận ý định "một version sạch, không mang dòng đời pi".
4. **Schemas của pi (`AI_TELEMETRY_SCHEMA`, `HARNESS_TELEMETRY_SCHEMA`, `AGENT_TELEMETRY_SCHEMAS` ở `packages/agent/src/harness/telemetry.ts`) mang sang không?** — không có chúng, `defineTelemetrySchema` và `createTypedSpanStarter` tới omp mà **không có người tiêu dùng nào** và đọc ra như code chết. Việc chép là của spec `packages/agent`, không phải của work item này.
5. **`packages/agent/src/telemetry.ts` có phải là adapter mà conformance suite chấm?** — nếu không có gì chạy qua nó, suite vô dụng về mặt thực tế.

---

## 9. Nhật ký kiểm chứng của phiếu này

Mọi khẳng định đo được trên máy này (`bun 1.3.14`, `tsgo` từ repo):

- Chép nguyên văn 8 file vào `packages/telemetry/`, chạy 3 cổng, tiêm 7 hồi quy, đo lại, rồi **`rm -rf packages/telemetry`**. `git status` về đúng baseline (chỉ còn `packages/coding-agent/test/collab/web-wire.types.ts` vốn đã untracked từ đầu phiên). `node_modules` **không** bị đụng — không chạy `bun install`.
- `bunx oxfmt --check` trên 8 file nguyên văn → exit 1, đúng 5 file.
- `bun test` trên 8 file nguyên văn (vẫn `import … from "vitest"`) → **15 pass / 0 fail**.
- `bunx tsgo -p packages/telemetry/tsconfig.json --noEmit` trên 8 file nguyên văn → exit 1, TS5097 ×7 + TS2307 ×2.
- Sau khi áp đủ 16 bước: `bun test` 15/0, `oxfmt --check` exit 0, `tsgo` exit 0.
- Tiêm hồi quy: vô hiệu hoá `ExactTelemetryAttributes` → tsgo đỏ TS2578; gỡ 3 chốt `recordedSpan.settled` → `bun test` đỏ 1 fail; gỡ chốt `memory.ts:88` → **cả hai vẫn xanh**; bỏ `package.json` → cổng type root exit **0** (mù).
- `expectTypeOf` từ `bun:test` → chạy thật, 1 pass.
- `bun --cwd=packages/natives run build` → thành công, 1m22s.
