# PHIẾU TRIỂN KHAI — `## 2. protocol`

Kế hoạch: `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1B_EXECUTION_PLAN.md` §2 (dòng 1038–1259).
Nguồn: `/Users/tranquangdang21/Projects/pi-ref` HEAD — `packages/protocol`, 17 file, 55.559 byte (đã đo lại: `find . -type f | wc -l` = 17, `find . -type f -exec cat {} + | wc -c` = 55559).

> Phiếu này KHÔNG sửa kế hoạch. Ở chỗ nào kế hoạch sai so với cây thật, phiếu ghi ra và đưa đường đi đúng.

---

## 1. Cái gì thay đổi, quan sát được

Repo có thêm package `@oh-my-pi/pi-protocol` — một codec CBOR length-framed với 12 schema envelope nghiêm — chạy được trên `bun:test` với **133 test xanh (82 CBOR + 15 framing + 36 protocol, 386 `expect()` calls)** mà không cần build `packages/natives` và không cần `ninja`; đồng thời `packages/protocol` trở thành package thứ 17 xuất hiện trong `bun run check:ts`, và không còn một byte `@earendil-works/` nào trong nó.

---

## 2. Bảng điểm sửa

"TRƯỚC" trích nguyên văn từ file tôi vừa mở ở `pi-ref`; "SAU" là hình dạng sau khi sửa.

### 2.1 `src/` — 8 file, 15 specifier + 30 `private` + 3 import scope + 1 schema engine

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `src/protocol.ts:1` | scope | `import type { JsonValue } from "@earendil-works/chord";` | `import type { JsonValue } from "@oh-my-pi/chord";` |
| `src/protocol.ts:2` | schema engine | `import Type, { type Static } from "typebox";` | `import { type Static, Type } from "@oh-my-pi/omptype/typebox";` — **BẮT BUỘC là named import, xem cạm bẫy P1** |
| `src/protocol.ts:3` | `Check` | `import { Check } from "typebox/value";` | xoá hẳn |
| `src/protocol.ts:8` | `OpaqueJsonValueSchema` | `const OpaqueJsonValueSchema = Type.Unsafe<JsonValue>(Type.Unknown());` | `const OpaqueJsonValueSchema = Type.Unsafe<JsonValue>();` — **bắt buộc, xem cạm bẫy P2** |
| `src/protocol.ts:18` | `isServerId` | `	return Check(ServerIdSchema, value);` | `	return !(ServerIdSchema(value) instanceof type.errors);` (thêm `import { type } from "@oh-my-pi/omptype";` ở đầu file) |
| `src/codec.ts:1` | scope | `import { isJsonValue } from "@earendil-works/chord";` | `import { isJsonValue } from "@oh-my-pi/chord";` |
| `src/codec.ts:2` | `Check` | `import { Check } from "typebox/value";` | xoá hẳn |
| `src/codec.ts:21` | `parseClientMessage` | `if (!Check(ClientMessageSchema, value) \|\| !isJsonValue(value)) {` | `if (ClientMessageSchema(value) instanceof type.errors \|\| !isJsonValue(value)) {` — **giữ nguyên vế `\|\| !isJsonValue(value)`** |
| `src/codec.ts:28` | `parseServerMessage` | `if (!Check(ServerMessageSchema, value) \|\| !isJsonValue(value)) {` | `if (ServerMessageSchema(value) instanceof type.errors \|\| !isJsonValue(value)) {` |
| `src/codec.ts:3,4,11` | relative | `from "./cbor/index.ts"` / `"./framing.ts"` / `"./protocol.ts"` | bỏ hậu tố `.ts` |
| `src/cbor/decoder.ts:8` | relative | `} from "./options.ts";` | `} from "./options";` |
| `src/cbor/encoder.ts:10` | relative | `} from "./options.ts";` | `} from "./options";` |
| `src/cbor/index.ts:1,2,9` | relative | `"./decoder.ts"` / `"./encoder.ts"` / `"./options.ts"` | bỏ hậu tố `.ts` |
| `src/index.ts:1,2,3,22` | relative | `"./cbor/index.ts"` / `"./codec.ts"` / `"./framing.ts"` / `"./protocol.ts"` | bỏ hậu tố `.ts` |
| `src/cbor/decoder.ts:11,12,13,26,88,112,119,145,152` | 9 field/method `private` | `private readonly bytes: Uint8Array;` … `private readBytes(length: number): Uint8Array {` | `#bytes` … `#readBytes` |
| `src/cbor/encoder.ts:13,14,15,68` | 4 `private` | `private buffer: Uint8Array;` … `private ensureCapacity(additionalBytes: number): void {` | `#buffer` … `#ensureCapacity` |
| `src/framing.ts:45,46,47,48,49,50,51,52,53,141` | 10 `private` | `private readonly header = new Uint8Array(FRAME_HEADER_LENGTH);` … `private fail(message: string): never {` | `#header` … `#fail` (141 là **method**, xem cạm bẫy P3) |
| `src/codec.ts:66,67,68,69,70,107,124` | 7 `private` | `private failed = false;` … `private readonly decoder: ValidatedMessageDecoder<ServerMessage>;` | `#failed` … `#decoder` |
| `src/cbor/options.ts` | 4 const + 3 type + `resolveOptions` | `export const UINT32_BASE = …` … `export function resolveOptions(…)` | **chép nguyên văn, sửa 0 dòng** |

### 2.2 `test/` — 3 file, đúng 6 sửa đổi, không sửa gì khác

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `test/cbor/cbor.test.ts:1` | runner | `import { describe, expect, test } from "vitest";` | `… from "bun:test";` |
| `test/cbor/cbor.test.ts:9` | relative | `} from "../../src/index.ts";` | `} from "../../src";` |
| `test/framing.test.ts:1` | runner | `import { describe, expect, test } from "vitest";` | `… from "bun:test";` |
| `test/framing.test.ts:2` | relative | `import { DEFAULT_MAX_FRAME_LENGTH, encodeFrame, FrameDecoder, FrameError } from "../src/index.ts";` | `… from "../src";` |
| `test/protocol.test.ts:1` | runner | `import { describe, expect, test } from "vitest";` | `… from "bun:test";` |
| `test/protocol.test.ts:20` | relative | `} from "../src/index.ts";` | `} from "../src";` |

Bảng `knownVectors` (`test/cbor/cbor.test.ts:23` mở mảng, 34 entry ở dòng 24–57), helper `fromHex`/`toHex`, fixture `clientHello`/`serverHello` (`test/protocol.test.ts:22-27`, UUIDv4 `00000000-0000-4000-8000-000000000001`), và `test/framing.test.ts:73` (`expect(() => decoder.end()).not.toThrow();`) — **chép nguyên văn, không sửa một ký tự**.

### 2.3 Hồ sơ package

| đường/dẫn | TRƯỚC (pi-ref) | SAU |
| --- | --- | --- |
| `LICENSE` (mới) | không có trong `packages/protocol`; lấy từ `/Users/tranquangdang21/Projects/pi-ref/LICENSE` (1.069 byte, 21 dòng, dòng cuối **không** có newline) | 4 dòng header (`MIT License` / trống / `Copyright (c) 2025 Mario Zechner` / trống) + 17 dòng thân permission lấy nguyên văn từ dòng 5 hết của pi. **Đo được: 1.143 byte, 23 dòng.** Xem cạm bẫy P4 về số dòng. |
| `package.json` | `"name": "@earendil-works/pi-protocol"` (dòng 2), `"@earendil-works/chord": "^0.87.1"` + `"typebox": "1.3.27"` (dòng 42-43), `"main": "./dist/index.js"`, `"test": "vitest --run"`, `"clean": "shx rm -rf dist"`, `"build": "tsc -p tsconfig.build.json"`, `"engines": { "node": ">=22.19.0" }` | `name` → `@oh-my-pi/pi-protocol`; `version` → **`18.4.0`** (xem cạm bẫy P5); `main`/`types` → `./src/index.ts` + wildcard `"./*"` và `"./*.js"`; khối 5 script của omp với `check:types` = `tsgo -p tsconfig.json --noEmit`; deps `@oh-my-pi/chord: "catalog:"` (**không** thêm `typebox`); devDeps `@types/bun: "catalog:"`; `engines.bun: ">=1.3.14"`; `sideEffects: false`; `repository.url` → `git+https://github.com/can1357/oh-my-pi.git`, `directory: packages/protocol`; author Stencil Labs; `files: ["src","README.md","CHANGELOG.md"]` |
| `tsconfig.json` (mới) | không có | clone `packages/wire/tsconfig.json` nguyên văn: `{ "extends": "../tsconfig.workspace.json", "include": ["src", "test"] }` (đã đọc, 74 byte) |
| `tsconfig.publish.json` (mới) | không có | clone `packages/wire/tsconfig.publish.json` nguyên văn (339 byte, `outDir: "dist/types"`) |
| `vitest.config.ts` | 298 byte | **XOÁ** |
| `tsconfig.build.json` | 209 byte, `"build": "tsc -p tsconfig.build.json"` | **XOÁ** (AGENTS.md cấm `tsc`) |
| `tsconfig.test.json` | 220 byte, `"types": ["node", "vitest"]` | **XOÁ** |
| `README.md` | 3.447 byte, dòng 1 `# @earendil-works/pi-protocol`, dòng 15 chứa `` `@earendil-works/chord` ``, dòng 29 `} from "@earendil-works/pi-protocol";` | 3 thay scope; thêm 2 đoạn (bộ ba `PROTOCOL_VERSION`; attestation CBOR tự viết); sửa claim "experimental" ở dòng 3 và 41; ghi rõ `ProtocolError` vs `ProtocolValidationError` |
| `CHANGELOG.md` | 976 byte, lịch sử release của pi | THAY: `# Changelog` + `## [Unreleased]` + `Added length-framed CBOR RPC envelopes (@oh-my-pi/pi-protocol).` |
| root `package.json` | `workspaces.catalog` có 12 mục `@oh-my-pi/*` | thêm `"@oh-my-pi/chord": "18.4.0"` và `"@oh-my-pi/pi-protocol": "18.4.0"` |

---

## 3. Các bước (mỗi bước có neo đã kiểm)

Mọi neo dưới đây tôi đã mở và đọc; nội dung trích là nguyên văn từ file thật.

**Bước 0 — CẦN NGƯỜI QUYẾT, chặn bước 4.** Schema engine: `typebox@1.3.27` hay `@oh-my-pi/omptype/typebox`?
**Tôi đã đo được câu trả lời: OMPTYPE compile sạch, typebox là đường lùi.** Port thật trong thư mục tạm, `tsgo --noEmit` sạch 0 lỗi sau 3 sửa ở bảng 2.1 (named `Type` import, `Type.Unsafe<JsonValue>()` không tham số, `instanceof type.errors`). Nên: **chọn omptype**. Nếu chủ sở hữu vẫn giữ typebox thì bỏ qua bước 4 và giữ `import { Check } from "typebox/value"`, thêm `"typebox": "1.3.27"`.

**Câu hỏi mở #2 của kế hoạch (`JsonValue`/`isJsonValue` sống ở đâu) — đã tự trả lời được, không cần hỏi.**
Kế hoạch nói: *"export cái trước từ root index nhưng không export cái sau"*. **SAI.** Đo thật ở `pi-ref`:
- `packages/chord/src/index.ts:14` → `export { type CopyJsonOptions, copyJson, isJsonValue } from "./json.ts";`
- `packages/chord/src/index.ts:60` → `JsonValue,` (trong khối `export type { … }`)

Cả hai đều ở root barrel. Vậy dòng 1 của `protocol.ts` chép sang là `@oh-my-pi/chord` là đúng, không cần subpath.

---

**Bước 1 — SCAFFOLD.** `mkdir -p packages/protocol/src/cbor packages/protocol/test/cbor`. KHÔNG tạo `package.json` ở bước này (xem cạm bẫy P6).

**Bước 2 — PHÁP LÝ, chạy TRƯỚC mọi thứ.** Dựng `packages/protocol/LICENSE`.
Lệnh dựng (tôi đã chạy thử, ra đúng 1.143 byte / 23 dòng):
```bash
L=/Users/tranquangdang21/Projects/pi-ref/LICENSE
{ printf 'MIT License\n\n'
  sed -n '3p' "$L"
  printf 'Copyright (c) 2025-2026 Can Bölük\nCopyright (c) 2026 Stencil Labs, Inc.\n\n'
  sed -n '5,$p' "$L"; } > packages/protocol/LICENSE
```

**Bước 3 — CHÉP 5 file không phụ thuộc, theo thứ tự từ dưới lên.**
`src/cbor/options.ts` → `src/cbor/encoder.ts` → `src/cbor/decoder.ts` → `src/cbor/index.ts` → `src/framing.ts`.
Rồi: bỏ hậu tố `.ts` ở `decoder.ts:8`, `encoder.ts:10`, `cbor/index.ts:1,2,9`; đổi **23** `private` → `#` (decoder 9 ở `:11,12,13,26,88,112,119,145,152`; encoder 4 ở `:13,14,15,68`; framing 10 ở `:45-53,141`). `options.ts` sửa 0 dòng. Rồi `bun run fmt` trong package.

**Bước 4 — CHÉP `src/protocol.ts`, áp quyết định schema engine.** Chỉ 3 dòng `:1-3` + `:8` + `:18` đổi. Xem bảng 2.1.
Sau đó `bun run check:ts` — đây là nơi `StrictObject` hoặc typecheck hoặc không. **Đã đo: `StrictObject` ở `:9-10` typecheck SẠCH.** Rủi ro thật nằm ở `:8`, xem P2.

**Bước 5 — CHÉP `src/codec.ts`.** 4 nhóm: scope `:1`, bóc `.ts` ở `:3,4,11`, 2 call site `Check` ở `:21` và `:28` (giữ vế `||`), 7 `private` ở `:66,67,68,69,70,107,124`. Giữ nguyên latch `failed` (`:80`, `:88`, `:95`), cap 500 ký tự của `boundedErrorMessage` (`:36`), và 3 nhánh re-throw `error instanceof ProtocolValidationError` (`:50`, `:89`, `:100`).

**Bước 6 — CHÉP `src/index.ts`.** Bỏ `.ts` ở 4 specifier. Danh sách named export **chép nguyên văn** ở dòng **4-22** (không phải 3-22 — dòng 3 là `export * from "./framing.ts";`). Không thêm `JsonValue`, không thêm `ClientMessageSchema`/`ServerMessageSchema`. Đó chính là thứ giữ việc đổi engine ở bước 4 là private rewrite chứ không phải API break.

**Bước 7 — CHÉP 3 file test.** Đúng 6 sửa đổi ở bảng 2.2. Không sửa gì khác. Xác nhận: `grep -rc 'vitest' packages/protocol` → 0.

**Bước 8 — SOẠN `package.json` + 2 tsconfig.** Theo bảng 2.3. Chưa `bun install`.

**Bước 9 — ĐĂNG KÝ workspace.** Thêm 2 khoá catalog vào `workspaces.catalog` của root. `bun install`, commit `bun.lock` kèm source.
*LƯU Ý:* bước này chỉ chạy được sau khi `chord` (work item 1) đã có trong cây. Nếu chưa, dừng ở bước 8 và chạy GATE 1b + GATE 3 (mục 5) — cả hai không cần chord.

**Bước 10 — TÀI LIỆU.** `README.md` 3 thay scope + 2 đoạn mới + sửa claim "experimental" (`README.md:3` "for the experimental Pi protocol" và `:41` "The protocol is experimental and has no compatibility guarantees") + 1 dòng phân biệt `ProtocolError`/`ProtocolValidationError`. `CHANGELOG.md` thay lịch sử.

**Bước 11 — GATE 1.**
**Bước 12 — GATE 2.**

---

## 4. Hợp đồng test

Đo lại từ file thật, không lấy lại từ kế hoạch:

| file | call site `test(` | khối `test.each` | case lúc chạt | `expect(` | `describe(` |
| --- | --- | --- | --- | --- | --- |
| `test/cbor/cbor.test.ts` | 6 | 3 (34 + 13 + 29 entry) | **82** | 20 | 1 (`CBOR codec`) |
| `test/framing.test.ts` | 9 | 2 (2 + 4 entry) | **15** | 17 | 1 (`binary framing`) |
| `test/protocol.test.ts` | 13 | 7 (3+3+5+2+3+4+3 entry) | **36** | 38 | 2 |
| **TỔNG** | **28** | **12** | **133** | **75** | **4** |

**Tôi đã chạy thật con số này.** Bản chép trong thư mục tạm, chỉ áp đúng 6 sửa đổi cơ học của bước 7 + `typebox@1.3.27` thật + shim `isJsonValue` lấy nguyên văn từ chord:
```
 133 pass
 0 fail
 386 expect() calls
Ran 133 tests across 3 files.
```
và per-file: `82 pass` / `15 pass` / `36 pass`. **Khớp tuyệt đối với kế hoạch.**

**Ngoại lệ đã biết, tên ra để reviewer không phải tự săn:** `test/framing.test.ts:73` là `expect(() => decoder.end()).not.toThrow();` trần — thuộc loại AGENTS.md cấm. Giữ nguyên: nó là hợp đồng âm thật (`end()` trên stream rỗng không ném) và đứng ngay dưới khẳng định dương ở dòng 72 `expect(decoder.push(new Uint8Array())).toEqual([]);`.

**Điều người dùng thấy gì nếu hồi quy** — mỗi case gắn với một hành vi quan sát được trên wire:

| hồi quy | người dùng/peer thấy gì |
| --- | --- |
| `framing.test.ts:52` `handles every split point across a frame` | `FrameDecoder` trả về frame **sai** khi chunk của socket bị cắt ở một offset lẻ — message của server bị decode hỏng, chết cả stream chứ không chỉ một frame. |
| `framing.test.ts:62` `copies payload bytes instead of retaining or aliasing input chunks` | Sửa byte trong buffer đã đưa cho `push` làm đổi message đã trả — tin nhắn trong lịch sử bị bóp méo sau khi đã hiển thị. |
| `framing.test.ts:85` `rejects an oversized declared length as soon as its header is complete` | Peer gửi header 4 byte khai payload 4 GB làm decoder cấp phát 4 GB **trước khi** payload tới — hết OOM. |
| `protocol.test.ts:99` `rejects non-JSON opaque payloads` | Wire bắt đầu chấp nhận `Uint8Array`, `NaN`, `undefined`, cycle, prototype. Đây là case duy nhất đứng sau `isJsonValue` khi schema engine hạ `Type.Unsafe` xuống `type.unknown` — **bỏ vế `\|\| !isJsonValue(value)` là mất hàng rào này**. |
| `protocol.test.ts:205` `rejects unknown messages and fields` | Envelope `additionalProperties:false` hỏng → server nhận `{type:"hello", version:8, extra:true}` mà không báo lỗi; đây là hợp đồng chống tương thích ngược duy nhất. |
| `protocol.test.ts:176` `accepts a successful void response without a result field` | `ok:true` bắt buộc phải kèm `result` → mọi RPC trả về rỗng bị từ chối. |
| `cbor.test.ts:87` `["array hole", new Array(1)]` | Encoder chấp nhận lỗ hổng mảng; giá trị đọc ra khác giá trị ghi vào. |
| `cbor.test.ts:74` `preserves a leading Unicode BOM and treats __proto__ as data` | `__proto__` trên wire trở thành prototype pollution thay vì dữ liệu. |
| `cbor.test.ts:47` `[-0, "fb8000000000000000"]` | `-0` bị encode thành số nguyên `0` → phân biệt được bị mất. |

**Không thêm test nào.** Nếu sau khi chép còn hành vi chưa phủ, thêm một case khẳng định kết quả quan sát được; **tuyệt đối không** assert trên text của file `.ts` (AGENTS.md cấm source-grep).

---

## 5. Cổng

### GATE 1 — CHẶN, chạy được ngay hôm nay

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

**Có đỏ được không? CÓ, và tôi đã bằng chứng bằng cách làm hỏng nó.** `check:ts` = `check:tools` (oxlint + oxfmt) + `tsgo --noEmit` cho từng package. Tôi đã chạy `tsgo` trên bản port `protocol.ts` với **default import sai** (`import Type, { type Static } from "@oh-my-pi/omptype/typebox"`) và nó bắn **35 lỗi TS2339** dòng 7/8/9/10/12/23/30/31/… — tức đúng cái lỗi mà kế hoạch sẽ tạo ra nếu làm đúng theo lời nó. Với `Type.Unsafe<JsonValue>(Type.Unknown())` sai tham số thì **TS2345**. Nghĩa là lỗi cổng bị bắt ở tầng type, không lọt xuống test.
Baseline đo hôm nay: **16 package có `check:types`** (`agent ai browser-relay catalog coding-agent collab-web metaharness mnemopi natives omptype snapcompact stats tui typescript-edit-benchmark utils wire`) — sau thay đổi phải là **17**, và `@oh-my-pi/pi-protocol:check:types` phải hiện trong danh sách. Ba khẳng định: 0 oxlint error, không có diff oxfmt, `grep -rc '@earendil-works/' packages/protocol` = 0.

### GATE 1b — CHẶN, chạy được ngay hôm nay. 6 grep cơ học

```bash
git grep -c '@earendil-works/' -- packages/protocol                      # -> 0
grep -rn 'from "\.[^"]*\.ts"' packages/protocol/src packages/protocol/test # -> 0
grep -rn '^\s*private ' packages/protocol/src                             # -> 0
grep -rn 'vitest' packages/protocol                                       # -> 0
grep -rnE ': any|<any>|ReturnType<|await import\(' packages/protocol/src   # -> 0
head -4 packages/protocol/LICENSE | sed -n '3p'                            # -> Copyright (c) 2025 Mario Zechner
```

**Có đỏ được không? CÓ, đã đo cả hai chiều.**
- **Hôm nay (package chưa có):** `git grep -c` → exit 1; `grep -rn` trên thư mục không tồn tại → exit 2; `head -4` → exit 1. Tất cả **ĐỎ**.
- **Trên bản chép đúng:** 0 hit ở cả 4 grep đầu.
- **Sau khi cố ý làm hỏng:** tôi để sót một hậu tố `.ts` trong `codec.ts` và một `private` trong `encoder.ts` → `.ts` = 1 hit, `private` = 30 hit → **ĐỎ**.

Baseline upstream đã đo, khớp kế hoạch: `@earendil-works/` = **7 hit / 4 file** (README.md 3, package.json 2, `src/codec.ts` 1, `src/protocol.ts` 1); `.ts` relative = **15 dòng (12 ở src, 3 ở test)**; `private` = **30** (decoder 9, encoder 4, codec 7, framing 10); `vitest` = 7 hit (3 test + package.json 2 + vitest.config.ts + tsconfig.test.json) — 4 cái sau biến mất khi bỏ 2 file và viết lại `package.json`.

### GATE 2 — CHẶN, chạy được ngay khi `chord` có mặt

```bash
bun test packages/protocol     # mong 133 pass: 82 CBOR, 15 framing, 36 protocol
```

**Có đỏ được không? CÓ — nhưng phải nói thẳng một điều mà kế hoạch nói sai.**
Kế hoạch ghi GATE 2 là "BỊ CHẶN VÌ CHORD CHƯA ĐÁP". **Đo thật hôm nay: `bun test packages/protocol` trả exit 1**, không phải 0. Bun in `The following filters did not match any test files` rồi exit **1**. Nên cổng này **ĐỎ NGAY BÂY GIỜ** — nó không cần chord để đỏ, và kế hoạch đã tự hạ thấp mức chặn của nó không cần thiết.

**Nhưng exit code một mình là cổng nửa vời.** Tôi chạy `bun test packages/wire` — package có **0 file test** — cũng exit 1. Nghĩa là lệnh bắt được "không có test", nhưng **không** bắt được "thiếu 1 trong 3 file test". Chép sót `test/cbor/cbor.test.ts` thì vẫn exit 0 với 51 pass. Đó đúng là loại an toàn giả.

**Vì vậy GATE 2 phải kiểm SỐ, không chỉ exit code.** Đây là bản viết lại, dùng bản này:

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
# (1) đủ 3 file test
test "$(find packages/protocol/test -name '*.test.ts' | wc -l | tr -d ' ')" = 3 || { echo "RED: thiếu file test"; exit 1; }
# (2) đúng số case, không phải chỉ "exit 0"
out=$(bun test packages/protocol 2>&1); echo "$out"
echo "$out" | grep -q '^ 133 pass' || { echo "RED: không phải 133 pass"; exit 1; }
echo "$out" | grep -q '^ 0 fail'   || { echo "RED: có test fail"; exit 1; }
```
Đã kiểm chứng trên bản chép: dòng summary in ra đúng ` 133 pass` / ` 0 fail` / ` 386 expect() calls`.

### Kiểm tra phủ định (chứng minh phần bỏ sót ở bước 6 được giữ)

```bash
grep -c 'ClientMessageSchema\|ServerMessageSchema' packages/protocol/src/index.ts  # -> 0
grep -c 'export const ClientMessageSchema' packages/protocol/src/protocol.ts       # -> 1
```

**Có đỏ được không? CÓ, và ngay.** Nếu ai đó "nới" `src/index.ts` thành `export *`, dòng đầu ra `1` → đỏ. Nếu ai đó xoá `ClientMessageSchema` khỏi `protocol.ts` (để "dọn code chết"), dòng sau ra `0` → đỏ, và cả `pi-server`/`pi-client` sau này sẽ hỏng theo.

### GATE 3 (MỚI — thay cho `oxlint` chạy tay)

```bash
./node_modules/.bin/oxlint --config .oxlintrc.json packages/protocol
```

**Có đỏ được không? CÓ.** Đã chạy thật trên bản chép: exit 0, đúng **1 warning** cố ý —
`test/cbor/cbor.test.ts:87:18: warning unicorn(no-new-array): Do not use \`new Array(singleArgument)\`` trên `new Array(1)`. Đây là fixture "array hole", **giữ nguyên, đừng sửa** (sửa nó là xoá một case hợp đồng).
Lưu ý: các warning còn lại tôi thấy đều đến từ `node_modules/typebox` — chỉ xuất hiện trên **đường lùi typebox**. Trên đường omptype (đã khuyến nghị) không cài typebox nên không có chúng.

---

## 6. Cạm bẫy riêng của work item này

**P1 — `import Type` (default) là sai, và kế hoạch bảo làm đúng cái sai đó.**
`packages/omptype/src/typebox.ts:545` là `export default { Type };` — default export là **một object `{ Type }`**, không phải builder. Chép đúng lời kế hoạch (`import Type, { type Static } from "@oh-my-pi/omptype/typebox"`) sinh **35 lỗi TS2339** kiểu `Property 'String' does not exist on type '{ Type: {…} }'`. Dạng đúng là **named import**, và đó cũng là dạng cả 5 call site thật trong omp đang dùng:
`packages/coding-agent/src/extensibility/legacy-typebox.ts:4-10` (`Type as OmpType`), `test/extensions-runner.test.ts:8`, `test/agent-session-queued-policy.test.ts:3`, `test/hook-tool-wrapper-input.test.ts:7`.
→ `import { type Static, Type } from "@oh-my-pi/omptype/typebox";`

**P2 — Chỗ vỡ THẬT là `protocol.ts:8`, không phải `StrictObject`. Kế hoạch chỉ sai chỗ này.**
Kế hoạch ghi: *"generic `StrictObject` ở dòng 10 là construct DUY NHẤT chưa xác minh"*. **Đo thật: `StrictObject` ở `:9-10` typecheck sạch.** Cái vỡ là dòng 8:
`Type.Unsafe<JsonValue>(Type.Unknown())` → **TS2345**: `Argument of type 'CompatRuntime<unknown>' is not assignable to parameter of type 'Record<string, unknown>'`. Vì `tUnsafe` của omptype (`typebox.ts:509-513`) nhận **một raw JSON Schema document**, không phải một schema. Comment của chính nó nói: *"Raw JSON Schema is accepted for source compatibility but is not retained or validated."*
→ `const OpaqueJsonValueSchema = Type.Unsafe<JsonValue>();` (bỏ tham số). Sau 3 sửa này `tsgo --noEmit` **sạch 0 lỗi**. Hành vi không đổi: cả hai đều ra `type.unknown`, và hàng rào thật vẫn là `|| !isJsonValue(value)`.

**P3 — `framing.ts:141` là METHOD, không phải field.**
`private fail(message: string): never {` → `#fail(message: string): never {`. Biến nó thành dạng field là hỏng class. Nó chỉ được gọi từ `push` (`:78`, `:136`) và `end` (`:136`) nên không đổi caller nào. Ngược lại, 9 `private` ở `decoder.ts` và 4 ở `encoder.ts` đều là field/method thường, thay máy móc được.

**P4 — LICENSE: đúng byte, sai số dòng.**
Kế hoạch nói "22 dòng, 1.143 byte". **Đo thật: 1.143 byte ✓ nhưng 23 dòng.** Lý do: `packages/wire/LICENSE` và `packages/omptype/LICENSE` đều là 22 dòng vì chỉ có **2** dòng copyright; thêm dòng của Mario Zechner thành **3** → 23. Đừng dùng "22" làm tiêu chí nghiệm thu. Tiêu chí đúng là `head -4` phải cho `Copyright (c) 2025 Mario Zechner` ở dòng 3 — cái này tôi đã kiểm, `pi-ref/LICENSE` dòng 3 đúng là nó.

**P5 — Catalog là `18.4.0`, không phải `18.3.3`.**
Kế hoạch nói `18.3.3` ở cả bảng `package.json` và bước 8. Đọc root `package.json` hôm nay: **cả 12** mục `@oh-my-pi/*` trong `workspaces.catalog` đều là `18.4.0` (`@oh-my-pi/pi-wire` cũng vậy, và `packages/wire/package.json` là `18.4.0`). Dùng `18.3.3` sẽ tạo một phiên bản lệch với cả repo. (Kế hoạch cũng nói "cạnh 11 mục" — thực tế là 12.)

**P6 — Đăng ký `package.json` sớm sẽ che mất lỗi thật.**
Khoảnh khắc `packages/protocol/package.json` tồn tại, bun bắt đầu resolve dependency của nó — mà `@oh-my-pi/chord` chưa có. Lỗi resolution sẽ thay thế lỗi thật (`@earendil-works/*` còn sót, `private` còn sót). Đó là lý do đúng như kế hoạch nói: scaffold và viết file ở bước 1/3–8, `bun install` + đăng ký catalog ở bước 9.

**P7 — Đừng "DRY" hai bản `MAX_UINT32`.**
`cbor/options.ts:2` (`export const`) và `framing.ts:2` (`const`, **không** export). Bản của framing không bao giờ ra barrel. Đừng hợp nhất — nếu thêm `export` vào `framing.ts` thì nó sẽ đi qua `export * from "./framing.ts"` ở `src/index.ts:3` (dòng này **đã tồn tại sẵn**, không phải "sẽ mới"). Hệ quả tương tự: `textEncoder`/`textDecoder` ở `options.ts:32-33` phải giữ nguyên `export` **trong module** nhưng không được đưa vào named re-export của `cbor/index.ts:3-9` — chính danh sách 5 specifier đó giữ chúng ngoài public surface.

**P8 — `readItem` trong `decoder.ts` có nhánh `default` bắt buộc giữ.**
`decoder.ts:83-84` `default: throw new CborError("Malformed CBOR major type");` — nhánh này chỉ chạy được với major type 0–7 đã exhaust, nên trông như dead code nhưng là hàng rào. Đừng gộp với `readArgument`'s `default` ở `:140-141` khi đang dọn.

**P9 — Bản đo của kế hoạch về `omptype` có 3 chỗ lệch; đừng dùng làm tiêu chí.**
- `Type.Integer` **không** ở `typebox.ts:121-141` (đó là `TObject` và `CompatRuntime`); nó ở **`:518`**, và `minimum` được xử lý ở **`:258`/`:264`**.
- Kế hoạch nói facade "dùng trong production bởi `legacy-typebox.ts` và 4 file test" — thực tế có **5 file src** dùng nó (`legacy-typebox.ts`, `custom-tools/types.ts`, `hooks/types.ts`, `extensions/types.ts`, `custom-commands/types.ts`) cộng 4 file test.
- Kế hoạch nói "grep toàn packages: 0 lần `ProtocolError`" — thực tế **1**, trong `packages/coding-agent/src/eval/py/runner.py:2246, 2256` (một docstring + chuỗi `ename` của Python). Không có va chạm TypeScript, nên kết luận của kế hoạch vẫn đúng, nhưng con số thì sai.
- Kế hoạch nói chord "không export `JsonValue` từ root index" — **sai**, xem mục 3.

**P10 — `rejects non-JSON opaque payloads` không có case "prototype".**
Kế hoạch liệt kê "(số không finite, byte array, `undefined`, prototype, cycle)". Test thật (`protocol.test.ts:108-113`) có **4** case: `byte array`, `non-finite number`, `undefined property`, `cycle`. Không có prototype. Case `__proto__` nằm ở `cbor.test.ts:74` (khác file, khác tầng). Đừng viết thêm test để "bù" — bổ sung thêm là lệch khỏi bản chép nguyên văn.

**P11 — Hai chi tiết nhỏ khác, ghi để không phải săn.**
- `src/index.ts` khối named export là dòng **4-22**, không phải 3-22.
- `attestation.ts` dài **91 dòng** (đúng), nhưng vùng CBOR helper là `:12-47` — `cborMap` ở `:40` **nằm ngoài** dải `:11-37` mà kế hoạch ghi. `cborHeader(64, …)` (byte string) ở `:71`, đúng như kế hoạch mô tả.
- Bảng `knownVectors` (`cbor.test.ts:23-58`) chỉ chứa **cặp surrogate** (`:53` `["𐅑", "64f0908591"]`); case **surrogate đơn** nằm ở test từ chối `:109` (`expect(() => encodeCbor("\ud800")).toThrow(/Unicode/i)`), không nằm trong bảng vector.
- `bun:test` importer dưới `packages/` hôm nay là **2682** file, không phải 2697 (con số này không mang gì để quyết, nhưng đừng dùng nó làm đối chiếu).

---

## 7. Phụ lục — 9 neo hỏng đã kiểm, và vị trí đúng

| # | Kế hoạch ghi | Dòng đó thật sự là | Đúng là | Vì sao hỏng |
| --- | --- | --- | --- | --- |
| 1 | `protocol.ts:16` — `return Check(ServerIdSchema, value);` | dòng trống | **`protocol.ts:18`** | lệch 2; kế hoạch tự mâu thuẫn với bảng bề mặt công khai |
| 2 | `protocol.ts:20` — `export type ProtocolError` | dòng trống | **`protocol.ts:26`** | lệch 6; bảng bề mặt công khai của chính kế hoạch đã ghi `:26` |
| 3 | `codec.ts:11` — `export class ProtocolValidationError` | `} from "./protocol.ts";` | **`codec.ts:13`** | lệch 2 |
| 4 | `codec.ts:25` — `export function parseServerMessage` | `}` | **`codec.ts:27`** | lệch 2 |
| 5 | `framing.ts:29` — `encodeFrame(payload: Uint8Array): Uint8Array` | `if (!(payload instanceof Uint8Array)) throw new TypeError(…)` | **`framing.ts:28`** | lệch 1; bảng bề mặt công khai đã ghi `:28` |
| 6 | `cbor/options.ts:24` — `CborError` | dòng trống | **`cbor/options.ts:25`** | lệch 1 |
| 7 | `cbor/options.ts:29` — text decoder `fatal: true` | `}` | **`cbor/options.ts:33`** | lệch 4; (`:32-33` ở bảng bề mặt công khai thì đúng) |
| 8 | `packages/ai/src/providers/cursor.ts:889` — `log("error", "parseServerMessage", …)` | `sawTurnEnded = true;` | **`cursor.ts:892`** | lệch 3 |
| 9 | `typebox.ts:121-141` — `Type.Integer` với `minimum` | `TObject` / `CompatRuntime` | **`typebox.ts:518`** (Integer) và **`:258`/`:264`** (minimum) | trỏ nhầm vùng |

**Đã kiểm và ĐÚNG — không cần sửa (tiêu biểu):** toàn bộ 30 dòng `private` (tôi liệt kê từng dòng bằng `grep -rn '^\s*private '` và khớp 100%); toàn bộ 15 specifier `.ts` (12 src + 3 test); `cbor/decoder.ts` 9 symbol + `cbor/encoder.ts` 4 + `framing.ts` 10; 36 symbol ở `protocol.ts` (trừ #1, #2); `codec.ts:13,20,27,56,61,106,123,139,34,65`; `framing.ts:1,2,3,6,8,12,19,28,41,44`; `options.ts:1-3,6,7,8,10,25,32-33`; `encoder.ts:12,102`; `test/framing.test.ts:73`; `test/cbor/cbor.test.ts:87`; `README.md:1,15,29`; `packages/utils/src/acp/protocol.ts:13`; `packages/wire/src/index.ts:397`; `packages/wire/src/stream.ts:20`; `packages/coding-agent/src/modes/acp/acp-agent.ts:30,654`; `packages/coding-agent/src/collab/protocol.ts:113` (đúng `getUint32(0, false)`); `packages/coding-agent/src/tiny/jsonl-socket.ts:9-20` (49 dòng); cả 6 định nghĩa `JsonValue` trong omp; cả 3 `encodeFrame` test-local (`ai/test/issue-3124-repro.test.ts:49`, `aws-eventstream.test.ts:27`, `bedrock-stream-exception-status.test.ts:55`); `pi-ref/packages/chord/src/types.ts:21` và `json.ts:74` (trích khớp từng ký tự); `omptype/src/typebox.ts:85,207,209-216,426,509-513`; `security/contracts/validation.ts:10-14`.
**Và các con số:** 17 file / 55.559 byte; 3 file bỏ (298 + 209 + 220 = 727); 28 `test(` / 12 `test.each` / 75 `expect(` / 4 `describe`; 133 = 82 + 15 + 36; 386 `expect()` calls; 7 hit `@earendil-works/` / 4 file; root script `test` = `bun scripts/ci-test-ts.ts local`; `check:ts` đúng mô tả; 16 package typecheck hôm nay.
