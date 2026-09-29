# W10 — Phiếu triển khai: hợp đồng adapter telemetry trung lập vendor + conformance suite

**Nguồn:** `MILESTONE_1_EXECUTION_PLAN.md` §W10 (dòng 2082–2266)
**HEAD khi kiểm chứng:** `65cc6c1` (`test(coding-agent): opt in explicitly where the suite is about parsing`)
**Ngày kiểm chứng:** 2026-09-29
**Số neo đã kiểm:** 46 · **đúng:** 25 · **hỏng/trôi:** 21 (bảng ở §7)

> Tài liệu này KHÔNG sửa plan. Mọi sai lệch được GHI RA ở §7.

---

## 1. Cái gì thay đổi, quan sát được

Sau W10, `packages/agent` có một hợp đồng span trung lập-vendor đã kiểm thử bằng máy (một `NOOP`, một adapter in-memory ghi lại, và một conformance suite chạy được trên **cả hai**), được export ra package root; một milestone sau có thể cắm backend Sentry/structured-log vào đó mà **không** phải sửa `telemetry.ts` và **không** phải kéo `@opentelemetry/api`. Với người dùng ở milestone 1: **không có gì thay đổi** — không setting, không output, không flag, không dependency mới. Bằng chứng giữ nguyên hành vi là `packages/agent/test/otel.test.ts` chạy xanh (42 pass) với **diff đúng 0 dòng**.

---

## 2. Bảng điểm sửa

Tất cả văn bản "TRƯỚC" dưới đây được trích từ file thật, đã mở và đọc.

### 2.1 Commit 1 — file MỚI (không có "TRƯỚC"; cột TRƯỚC = trạng thái hiện tại đã kiểm)

| đường/dẫn | symbol | TRƯỚC (đã kiểm) | SAU |
| --- | --- | --- | --- |
| `packages/agent/src/telemetry/context.ts` | `TelemetryAttributeValue`, `TelemetrySpan`, `TelemetryContext` | **không tồn tại** — `lsd: packages/agent/src/telemetry/: No such file or directory (os error 2)` | Hợp đồng vendor-neutral, **zero import** |
| `packages/agent/src/telemetry/noop.ts` | `NOOP_TELEMETRY_CONTEXT` | không tồn tại | Context NOOP, span đóng băng |
| `packages/agent/src/telemetry/memory.ts` | `InMemoryTelemetryContext` | không tồn tại | Adapter tham chiếu + `getSpans()` |
| `packages/agent/src/telemetry/conformance.ts` | `createTelemetryAdapterConformance` | không tồn tại | 9 case / 5 group, runner-independent |
| `packages/agent/src/telemetry/index.ts` | barrel | không tồn tại | `export * from "./context"; …` (không extension) |
| `packages/agent/test/telemetry-conformance.test.ts` | driver | không tồn tại | Drove suite trên memory **và** NOOP |

### 2.2 Commit 1 — file SỬA

| đường/dẫn | symbol | TRƯỚC (trích nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/agent/src/index.ts:24` | barrel re-export | `export * from "./telemetry";` | giữ nguyên dòng 24, **thêm ngay sau**: `export * from "./telemetry/context";` |

### 2.3 Commit 2 — file SỬA (`telemetry.ts`, seam ~40 LOC)

| đường/dẫn | symbol | TRƯỚC (trích nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/agent/src/telemetry.ts:476` | `startSpan` (private) | `function startSpan(`<br>`\ttelemetry: AgentTelemetry \| undefined,`<br>`\tkind: TelemetrySpanKind,`<br>`\tname: string,`<br>`…`): Span \| undefined {`<br>`\tif (!telemetry) return undefined;` | Thêm bước hẹp OTEL `Span` → `TelemetrySpan` ngay sau khi `tracer.startSpan` trả về. **Thứ tự ghép attribute `:499-512` giữ nguyên từng dòng.** |
| `packages/agent/src/telemetry.ts:2171` | `runInActiveSpan<T>` (public, exported) | `export function runInActiveSpan<T>(span: Span \| undefined, fn: () => Promise<T>): Promise<T> {`<br>`\tif (!span) return fn();`<br>`\treturn context.with(trace.setSpan(context.active(), span), fn);`<br>`}` | Định tuyến qua activation hook của hợp đồng. **Chữ ký export giữ nguyên từng byte** — nó thuộc public surface. |
| `packages/agent/src/telemetry.ts:2229` | re-export OTEL | `export { type Attributes, type Span, SpanKind, SpanStatusCode, type Tracer, trace };` | **BẤT BIẾN.** Đây là chỗ làm TS2308 nếu hợp đồng đặt tên interface là `Span`. |

### 2.4 Commit 2 — file KHÔNG ĐỔI

| đường/dẫn | symbol | Hành động |
| --- | --- | --- |
| `packages/agent/test/otel.test.ts` | 42 test / 180 expect | **diff đúng 0 dòng.** Không sửa dù nó có đỏ. |

### 2.5 SAI LỆCH THIẾT KẾ: bản phác của plan ≠ mã nguồn tham chiếu

Plan nói nguồn `pi-ref` **không kiểm chứng được**. **Sai.** Nó nằm ở `/Users/tranquangdang21/Projects/pi-ref/packages/telemetry/` và đọc được. Con số của plan về nó **đều đúng** (`memory.ts` 219 LOC, `conformance.ts` 315 LOC, package 935 LOC — đã đếm lại). Nhưng bản phác hợp đồng trong §W10 **không được lấy từ đó** — nó tự chế ra, và lệch ở những chỗ load-bearing:

| khía cạnh | mã nguồn thật `pi-ref/packages/telemetry/src/index.ts` | bản phác trong plan |
| --- | --- | --- |
| kiểu attribute | `index.ts:1` — `string \| number \| boolean \| readonly string[] \| readonly number[] \| readonly boolean[]` | thiếu `readonly boolean[]` |
| giá trị attribute | `index.ts:3-5` — `{ [name: string]: AttributeValue \| undefined }` (**cho phép `undefined`**) | `Readonly<Record<string, TelemetryAttributeValue>>` — **cấm** `undefined` |
| tham số start | `index.ts:7-10` — `SpanOptions { name, attributes? }` (1 tham số) | `startSpan<T>(context, name, fn)` — 3 tham số, tự truyền chính context |
| kiểu trả về | `index.ts:15` — `Promise<T>`, **bất đồng bộ** | `T`, **đồng bộ** |
| span con | `index.ts:18` — `TelemetrySpan extends TelemetryContext`, tức span **có** method `startSpan` | span không có `startSpan`; thay bằng `end()` |
| `end()` | **không hề có** — vòng đời = callback | bắt buộc có `end(): void` |
| `SpanStatus` | `index.ts:12` — discriminated union `{status:"ok"} \| {status:"error"; error?:{name,message}}` | string literal `"unset"\|"ok"\|"error"` + `message?` rời |
| NOOP trả về | `noop.ts:6-11` — `Promise.resolve(callback(span))`, bọc Promise | `return fn(NOOP_SPAN)` — **theo danh tính** |
| tên export suite | `testing/index.ts:1` — `createTelemetryAdapterConformance` | `createCase` + `runConformance` |
| fixture | `testing/types.ts:3-7` — `AsyncDisposable`, `getSpans(): Promise<…>` | danh sách record đồng bộ |
| hệ type schema | `index.ts:26-354` — `defineTelemetrySchema` + `createTypedSpanStarter` (~330 LOC) | plan **không nhắc tới** |
| extension trong specifier | `"./index.ts"` (có `.ts`) | phải bỏ — OMP không dùng kiểu này |

**Kết luận thiết kế:** `end()` của plan là **lệch có chủ ý và hợp lý** — OMP thật sự cần handle sống qua một `await` (`telemetry.ts:711` trả handle → `:1134` nhận → `:1181` gọi `span.end()`), điều mà span callback-scoped của pi-ref diễn đạt không nổi. Nhưng đó là **một quyết định phải nói ra**, không phải sự trùng khớp. Và chi phí của nó là: hợp đồng OMP **không drop-in** với pi-ref, nên `conformance.ts` phải viết lại, không copy.

---

## 3. Các bước (mọi neo đã kiểm)

### Commit 1 — S, không phụ thuộc gì

1. **Quyết trước (chặn bước 1).** Ba câu hỏi cần người quyết, theo thứ tự:
   - `end()` vs `TelemetrySpan extends TelemetryContext`? Plan chọn `end()`; giữ nguyên lựa chọn đó và **viết lý do vào comment** (bằng chứng: 7 call site `span.end()` tại `telemetry.ts:1181, 1214, 1658, 1758, 2003, 2074, 2216`).
   - `startSpan` đồng bộ hay bất đồng bộ? Pi-ref là **bất đồng bộ**. Bất đồng bộ khớp với `runInActiveSpan` (`telemetry.ts:2171`, trả `Promise<T>`) và với `finishChatSpan` (`:1134`, `async`). **Chọn bất đồng bộ.**
   - `conformance.ts` ở `src/` (được publish) hay `test/`? Plan chọn `src/`. Exports map có `"./*": "./src/*.ts"`, nên nó **tự động** nằm trong public surface. Ghi rõ điều này trong PR.
2. **Tạo `packages/agent/src/telemetry/context.ts`.** Zero import. Bắt buộc có `end(): void`. `TelemetryAttributeValue` phải có `readonly string[]` (bắt buộc — `telemetry.ts:773` và `:782` gán mảng string) và `readonly number[]` (hiện **chưa** dùng — `grep -nE "attrs\[…\] = \[|attrs\[…\] = .*\.map\("` chỉ trả về 2 hit, cả hai đều `string[]`; `readonly boolean[]` thì có ở pi-ref `index.ts:1` và nên mang theo để tương thích). **Đặt tên interface là `TelemetrySpan`, KHÔNG phải `Span`** — xem bưừng 5.
3. **Tạo `packages/agent/src/telemetry/noop.ts`.** `return fn(NOOP_SPAN)` (hoặc `Promise.resolve(fn(NOOP_SPAN))` nếu bước 1 chọn bất đồng bộ). Span `Object.freeze` ở cấp module — xem `pi-ref/.../src/noop.ts:14` (`Object.freeze(noopTelemetrySpan);`).
4. **Tạo `packages/agent/src/telemetry/memory.ts`.** Port từ `pi-ref/packages/telemetry/src/memory.ts` (219 LOC) với sửa đổi bắt buộc ở §8. Trường record: `id`, `parentId`, `name`, `attributes`, `events`, `status`, `settled`, `endSequence` (tương đương `ended` của plan). **Không dùng `private`** — `memory.ts:193` của pi-ref viết `private readonly state`, vi phạm AGENTS.md.
5. **Tạo `packages/agent/src/telemetry/conformance.ts`.** Port 9 case / 5 group từ `pi-ref/packages/telemetry/src/testing/conformance.ts:64-314`. `createCase` ở `:12` **không export** (chỉ `createTelemetryAdapterConformance` ở `:61` được export) — giữ nguyên tính riêng tư đó. Cần thêm helper `unreadable()` từ `:43-58` (Proxy ném ở mọi trap).
6. **Tạo `packages/agent/src/telemetry/index.ts`.** `export * from "./context"; export * from "./memory"; export * from "./noop";` — **không extension** (`git grep -n 'from "\..*\.ts"' -- packages/agent/src` → 0 kết quả).
7. **Thêm dòng barrel ở `packages/agent/src/index.ts`, ngay sau dòng 24.** Dòng 24 đã xác nhận là `export * from "./telemetry";`.
8. **Viết `packages/agent/test/telemetry-conformance.test.ts`.** Import từ **đường dẫn sâu** `@oh-my-pi/pi-agent-core/telemetry/context` (KHÔNG từ package root). Driver dùng `describe`/`it` của `bun:test` — **không** dùng `vitest` như `pi-ref/.../test/conformance.test.ts:1`. Chạy suite trên **cả** `InMemoryTelemetryContext` **và** `NOOP_TELEMETRY_CONTEXT`.
9. **CỔNG COMMIT 1** — xem §5.

### Commit 2 — nửa M, rủi ro hồi quy cao nhất milestone

10. **Thêm `narrowSpan` + adapter nền OTEL trong `telemetry.ts`.** Đặt cạnh `startSpan` private (`:476`). **Giữ nguyên từng byte thứ tự ghép attribute ở `:499-512`** — thứ tự ưu tiên `operation → model/provider → conversationId → agent → config.attributes → dynamic → caller` là load-bearing vì `Object.assign` ghi đè, và nó được plan đánh dấu không được đảo.
11. **Định tuyến `runInActiveSpan` (`:2171`) qua activation hook.** Giữ nguyên chữ ký. Doc comment ở `:2161-2167` mô tả đúng cơ chế và **đã được kiểm chứng**: `tracer.startSpan` tạo span nhưng không activate nó.
12. **CỔNG COMMIT 2** — xem §5.
13. **Changelog + vệ sinh.** `packages/agent/CHANGELOG.md:3` là `## [Unreleased]`, hiện **rỗng** (không có subsection nào). Thêm `### Changed`. Sau đó `git log` phải thấy W10 là **đúng hai** commit tách biệt.

---

## 4. Hợp đồng test

**File:** `packages/agent/test/telemetry-conformance.test.ts` (mới) · `packages/agent/test/otel.test.ts` (**sửa 0 dòng**)

| # | Case | Group (pi-ref) | Hồi quy ⇒ người dùng thấy gì |
| --- | --- | --- | --- |
| 1 | admit đúng một lần, giữ **chính** giá trị trả về | `callback lifecycle` | Mọi code path `return startSpan(…, () => computeSomething())` trả `undefined` — **sai kết quả âm thầm**, không test output nào bắt được |
| 2 | Giữ **nguyên vẹn** giá trị reject, sync lẫn async (kể cả `undefined` và Proxy không đọc được) | `callback lifecycle` | Lỗi bị nuốt hoặc bị bọc lại — stack trỏ sai chỗ |
| 3 | `setStatus` cuối cùng thắng, **không** bị ghi đè tự động khi throw | `status` | Span thành công bị ghi thành error, và ngược lại |
| 4 | Merge attribute + event có thứ tự | `recording` | Event mất hoặc sai thứ tự trên backend mới |
| 5 | Attribute call hỏng là **atomic** (không lưu dở) | `recording` | Backend nhận attribute rác |
| 6 | Call sau settle là vô hiệu | `recording` | Dữ liệu ghi sau khi span đã đóng |
| 7 | **Parentage**: child lồng nhau + **đồng thời** (concurrent) | `parentage` | Cây span phẳng/tách rời trên backend không phải OTEL — người debug một run thấy sai hình cây |
| 8 | **Passivity**: payload không đọc được bị bỏ qua, callback vẫn chạy | `passivity` | Telemetry làm **hỏng** luồng agent vì một attribute lỗi |
| 9 | `setStatus` hỏng là atomic | `passivity` | Throw rác ra khỏi callback |
| 10 | **BỔ SUNG — không có trong pi-ref**: round-trip `string[]` + **message** của `setStatus` | (mới) | Backend tương lai âm thầm vứt mất `gen_ai.request.stop_sequences` (`telemetry.ts:773`) và `omp.gen_ai.request.available_tools` (`:782`) |
| 11 | **BỔ SUNG — không có ở cả pi-ref lẫn plan**: span chưa từng gọi `setStatus` phải giữ `UNSET` khi export, **không** trở thành `OK` | (mới) | `otel.test.ts:246` đổi `UNSET` → `OK`; test đỏ **trong khi** cổng `git diff --stat` vẫn rỗng. Xem bẫn 3 ở §6. |
| 12 | NOOP identity + không ghi gì | (driver) | Xem case 1 |

**Case 10 và 11 là bắt buộc, không phải tuỳ chọn.** Chúng là thứ duy nhất che ba chỗ mà `otel.test.ts` **hoàn toàn không che** (grep `stopSequences|availableTools|status\.message` trong `otel.test.ts` → **0 kết quả**; và `SpanStatusCode` chỉ xuất hiện ở 4 dòng khẳng định `UNSET`/`ERROR`). `otel.test.ts` chỉ khẳng định `status.code` tại dòng **246, 317, 337, 384** — đúng như plan nói, và đúng là không có dòng nào khẳng định `status.message`, trong khi cả **5** call site `setStatus` (`:1206, 1209, 1570, 1995, 2072`) đều truyền một message.

---

## 5. Cổng

### Cổng commit 1

| # | Lệnh | Đỏ được không? | Câu trả lời cụ thể |
| --- | --- | --- | --- |
| 1 | `cd packages/agent && bun run check:types` | **CÓ** | Đã chạy thật ở HEAD `65cc6c1`: **exit 0**. Đây là cổng bắt được TS2308 nếu hợp đồng đặt tên là `Span`: `index.ts:24` star-export `telemetry.ts`, mà `telemetry.ts:2229` re-export `Span` của OTEL. Đổi tên thành `TelemetrySpan` là thứ làm nó xanh. |
| 2 | `git diff --stat` | **CÓ** | Nó đỏ **ngay khi** ai đó chạm `packages/agent/src/telemetry.ts` ở commit 1. Đó là điều plan đang cố ngăn. |
| 3 | `bun test packages/agent/test/telemetry-conformance.test.ts` | **CÓ** | Chạy được **ngay hôm nay**. Đã kiểm chứng thực nghiệm: deep path `@oh-my-pi/pi-agent-core/telemetry/probe` resolve và chạy `1 pass, 0 fail` mà **không** nạp native addon (probe đã xoá sạch sau đó). Plan gọi đây là "cần kiểm chứng thực nghiệm ở lần chạy đầu tiên" — **đã kiểm chứng, và nó đúng**. |

### Cổng commit 2

| # | Lệnh | Đỏ được không? | Câu trả lời cụ thể |
| --- | --- | --- | --- |
| 1 | `git diff --stat packages/agent/test/otel.test.ts` | **CÓ** | Nó thành khác rỗng **ngay khi có ai đó sửa file đó**. Chạy sạch ngay bây giờ → rỗng. |
| 2 | `bun test packages/agent/test/otel.test.ts` | **CÓ** | **Đã chạy thật: `42 pass, 0 fail, 180 expect() calls`, 262ms.** Plan nói lệnh này đang bị chặn bởi `Failed to load pi_natives native addon` — **điều đó không còn đúng**, addon đã build trong checkout này. Cổng hồi quy thật sự của commit 2 **đang mở**, không phải lời hứa. |
| 3 | `git diff --stat packages/agent/src/telemetry.ts` | **CÓ, nhưng yếu** | Nó đỏ khi diff lớn. Đây là cổng **duy nhất** phân biệt "seam 40 LOC" với "viết lại 2237 LOC". Nó là **số LOC**, không phải kiểm hành vi — một bản viết lại 2237 LOC thay đổi hành vi vẫn lọt. Đừng coi nó là cổng an toàn. |

### Cổng nào **KHÔNG** đỏ được — và viết lại

| Cổng của plan | Vấn đề | Viết lại |
| --- | --- | --- |
| "sáu file mới **dưới `packages/agent/src/telemetry/`**" | Chỉ **5** file nằm dưới `src/telemetry/`. File thứ sáu là `packages/agent/test/telemetry-conformance.test.ts`, nằm ở `test/`. Cổng này **luôn xanh** vì con số viết sai không bao giờ khớp với bất kỳ trạng thái nào. | `git status --porcelain` phải in **đúng 5 dòng `?? packages/agent/src/telemetry/` + 1 dòng `?? packages/agent/test/telemetry-conformance.test.ts` + 1 dòng ` M packages/agent/src/index.ts`**, và **không** có dòng nào chứa `telemetry.ts`. |
| "`otel.test.ts` pass là **bằng chứng** giữ nguyên hành vi" | Sai một phần. Nó **không** che `string[]` attribute, **không** che `status.message`, và **không** phân biệt `UNSET` với `OK` (xem bẫn 3 ở §6). Một adapter âm thầm vứt cả ba vẫn làm nó xanh. | Thêm vào cổng commit 2: `bun test packages/agent/test/telemetry-conformance.test.ts` **cũng** phải xanh — case 10 và 11 (§4) là thứ che ba lỗ hổng đó. |
| "`bun run check:ts` toàn repo" là cổng commit 1 | Nó **đã xanh** ở HEAD `65cc6c1` (exit 0, 17 package xanh). Blocker W1 mà plan còn ghi đã biến mất: `packages/coding-agent/test/zz-w9-probe.test.ts` không còn tồn tại. | Giữ dùng nó — nó xanh thật. Nhưng đừng gọi nó là "cửa sổ duy nhất để chứng minh W10 không phá W1/W2/W6/W11/W12/W13" nữa; nó đang xanh không vì lý do đó. |

---

## 6. Cạm bẫy riêng của W10

1. **Sửa `otel.test.ts` cho nó chạy qua.** Cấm tuyệt đối. Nó đang xanh; nếu nó đỏ sau commit 2 thì **refactor sai**, không phải test sai.
2. **Cổng diff-0-dòng là con dao cùn.** Nó bắt được "ai đó sửa test", nhưng **không** bắt được "adapter vứt mất `stopSequences` / `available_tools` / mọi `status.message`". Ba thứ đó chỉ conformance suite bắt. Đừng báo "giữ nguyên hành vi" khi chỉ mới chứng minh "không ai sửa test".
3. **`UNSET` vs `OK` — bẫn im lặng, nguy hiểm nhất của commit 2.** Trong `telemetry.ts` **không có call site nào** set `SpanStatusCode.OK` hay `UNSET`: cả 5 `setStatus` đều là `SpanStatusCode.ERROR` (`:1206, 1209, 1570, 1995, 2072` — grep `SpanStatusCode` xác nhận không có occurrence `OK`/`UNSET` nào trong production code). OTEL để mặc định là `UNSET`, và `otel.test.ts:246` khẳng định đúng `SpanStatusCode.UNSET`. Nhưng adapter tham chiếu của pi-ref **mặc định `{status: "ok"}`** khi settle (`memory.ts:114, 178`). Nếu commit 2 để cái mặc định `ok` đó chảy xuống span OTEL, `otel.test.ts:246` đổi từ `UNSET` sang `OK`, test **đỏ** — trong khi `git diff --stat` trên file test **vẫn rỗng**. Cổng diff không bắt được. Đây là lý do phải thêm **case 11** (§4) vào conformance.
4. **`await using` / `AsyncDisposable` KHÔNG typecheck trong repo này.** `tsconfig.base.json` đặt `lib: ["ES2024", "DOM.AsyncIterable"]`. Đã kiểm chứng bằng `tsgo` trên một probe tách biệt: `error TS2318: Cannot find global type 'AsyncDisposable'` và `error TS2318: Cannot find global type 'Disposable'`. Pi-ref dùng `await using fixture = await factory()` (`conformance.ts:22`) và `TelemetryAdapterFixture extends AsyncDisposable` (`testing/types.ts:3`). **Không copy nguyên văn** — phải viết lại fixture không cần `Symbol.asyncDispose`.
5. **`private` trong `memory.ts` của pi-ref.** `memory.ts:193` viết `private readonly state`. AGENTS.md cấm `private`/`protected`/`public` trên field/method — phải dùng `#state`. Đây là loại vi phạm mà `bun run check` của package sẽ **không** bắt (oxlint + tsgo), nên nó lọt vào review nếu bạn không tự nhớ.
6. **`.ts` trong specifier.** Pi-ref dùng `"./index.ts"` ở khắp nơi. `git grep -n 'from "\..*\.ts"' -- packages/agent/src` → **0 kết quả**. Copy nguyên văn sẽ lệch quy ước repo.
7. **`vitest` → `bun test`.** `pi-ref/.../test/conformance.test.ts:1` import từ `"vitest"`. OMP dùng `bun test`. Thân suite dùng `node:assert/strict` — cái đó chạy được dưới Bun, nhưng **file driver** phải viết lại bằng `describe`/`it` của `bun:test`.
8. **Coi conformance suite là "mô phỏng vừa đủ".** Nó là bộ **port thật** từ một package đã tồn tại và đã có 9 case. Viết lại 6 case suy nghĩ trong đầu là tự phát minh lại thứ đã có bằng chứng. Trong 9 case đó có cả nhóm `passivity` (chống payload không đọc được) mà bản phác của plan **không hề nhắc tới** — đó là phần giá trị nhất và sẽ bị mất nếu bạn port theo danh sách của plan.
9. **`startSpan(context, name, fn)` tự truyền chính nó.** Tham số đầu tiên trong bản phác của plan là `TelemetryContext` — cái mà caller phải truyền vào chính method của nó. Trong pi-ref tham số đó là `SpanOptions` (`index.ts:8`). Viết theo bản phác sẽ tạo ra một API mà mọi call site phải viết `ctx.startSpan(ctx, "name", …)`. Đừng.
10. **`C17` là tham chiếu treo.** Plan dẫn "C17 (plan dòng 380)" ba lần, nhưng `C17` **không được định nghĩa ở bất kỳ đâu** trong tài liệu, và dòng 380 là `expect(map.get("tool_call")).toHaveLength(1);` — không liên quan. Đừng đi tìm nó. Phạm vi commit 2 đã được mô tả đủ ở §3 bước 10-11.
11. **Đường dẫn sâu phải là đường dẫn sâu thật.** Nếu ai đó import `@oh-my-pi/pi-agent-core` (package root) trong test conformance, nó kéo `src/index.ts` → OTEL → và nặng hơn nữa là kéo natives. Giá trị của việc dùng deep path là chính xác để né cái đó.

---

## 7. Danh sách neo hỏng (GHI RA, không sửa plan)

Tất cả vị trí "thực tế" đã được mở và đọc tại HEAD `65cc6c1`.

| Neo trong plan | Nên trỏ tới | Thực tế | Vì sao hỏng |
| --- | --- | --- | --- |
| `telemetry.ts` 2114 LOC | — | **2237 LOC** | Trôi +123 |
| `otel.test.ts` 1152 LOC | — | **1122 LOC** | Trôi −30 |
| HEAD `ecd516f` | — | **`65cc6c1`** | Repo đã đi xa |
| `telemetry.ts:406` = `AgentTelemetry` | `telemetry.ts:416` | `*/` | Trôi +10 |
| `telemetry.ts:418` = `resolveTelemetry` | `telemetry.ts:428` | `readonly tracer: Tracer;` | Trôi +10 |
| `telemetry.ts:466` = `startSpan` private | `telemetry.ts:476` | `if (capture === true \|\| capture === "full") return "full";` | Trôi +10 |
| `telemetry.ts:466-491` thứ tự attribute | `telemetry.ts:499-512` | — | **Thứ tự đúng**, chỉ sai dòng |
| `telemetry.ts:693` = `startChatSpan` | `telemetry.ts:711` | doc comment | Trôi +18 |
| `telemetry.ts:1116` = `finishChatSpan` | `telemetry.ts:1134` | `serializeToolCallArgumentsForTelemetry` | Trôi +18 |
| `telemetry.ts:1162` = `span.end()` | `telemetry.ts:1181` | `code: "on_chat_usage_failed",` | Trôi +19 |
| `telemetry.ts:2048` = `runInActiveSpan` | `telemetry.ts:2171` | `telemetry: AgentTelemetry \| undefined,` | Trôi +123 |
| `telemetry.ts:2106` re-export OTEL | `telemetry.ts:2229` | `ToolsOkCount = "omp.gen_ai.agent.tools.ok.count",` | Trôi +123 |
| `telemetry.ts:755` = `RequestStopSequences` | `telemetry.ts:773` | `readonly systemPrompt?: string \| readonly string[];` | Trôi +18 |
| `telemetry.ts:764` = `RequestAvailableTools` | `telemetry.ts:782` | `};` | Trôi +18 |
| bảng sửa ghi `PiGenAIAttr` | `OmpGenAIAttr` | `attrs[OmpGenAIAttr.RequestAvailableTools] = …` | **Sai tên enum** |
| plan dòng 380 = C17 | — | `expect(map.get("tool_call")).toHaveLength(1);` | C17 **không tồn tại** trong plan |
| plan dòng 1347 = §W10 | — | ghi chú về `node_modules/` rỗng | Không phải §W10 |
| plan dòng 2558 = §F8 | — | ```` ```bash ```` | Không phải §F8 |
| "nguồn `pi-ref` không kiểm chứng được" | `/Users/tranquangdang21/Projects/pi-ref/packages/telemetry/` | **CÓ, đọc được** | Plan sai; số 219/315/935 thì đúng |
| "sáu file mới dưới `src/telemetry/`" | 5 dưới `src/` + 1 ở `test/` | — | Cổng luôn xanh |
| "`bun test otel.test.ts` bị chặn bởi native addon" | `42 pass, 0 fail` | Addon đã build | Cổng hồi quy thật đang mở |

**Neo ĐÚNG (24):** `index.ts:24` = `export * from "./telemetry";` · `src/telemetry/` không tồn tại · 7 call site `span.end()` (1181/1214/1658/1758/2003/2074/2216) · 5 call site `setStatus` tất cả kèm `message` (1206/1209/1570/1995/2072) · `otel.test.ts:246/317/337/384` khẳng định `status.code` · `otel.test.ts` **không** có khẳng định nào về `stopSequences`/`availableTools`/`status.message` · `otel.test.ts:24` · `run-collector.ts:19` · `run-collector.ts:144-145` · `run-collector.ts:180`/`:271` · `agent-loop.ts:75` · `compaction/anthropic.ts:22` · `compaction/branch-summarization.ts:11` · `compaction/compaction.ts:41` · `types.ts:28` · `compaction-telemetry.test.ts:26` · `instrumented-oneshot-retry.test.ts:2` · `run-summary.test.ts:19` · `node_modules/@opentelemetry/api/build/src/common/Attributes.d.ts:18` · `packages/agent/CHANGELOG.md:3` = `## [Unreleased]` · `cd packages/agent && bun run check:types` exit 0 · `bun run check:ts` exit 0 · không specifier nào có `.ts` trong `packages/agent/src` · `"./*": "./src/*.ts"` phục vụ deep path, chạy được không cần addon (đã kiểm chứng: `1 pass, 0 fail`) · `./telemetry` resolve về **file** khi cả `telemetry.ts` và `telemetry/index.ts` cùng tồn tại (đã kiểm chứng: `exports: [ "fromFile" ]`).

---

## 8. Ghi chú thêm cho kỹ sư

### 8.1 Ba câu hỏi plan yêu cầu người quyết — đã tự quyết được hai

- "`TelemetryAttributes` có nhận `null`/`undefined` không?" → **Có, cho phép `undefined`.** Pi-ref dùng `[name: string]: AttributeValue | undefined` (`index.ts:4`) và `copyAttributes` **loại bỏ** undefined (`memory.ts:57-58`), merge last-wins-với-undefined-không-ghi-đè (`memory.ts:63-69`). Bản phác của plan cấm `undefined` ở tầng type, nên **không diễn đạt được** hợp đồng merge đó. Nhận `undefined`.
- "`conformance.ts` có được ship không?" → Theo file list của plan: **có**, ở `src/`. Exports map `"./*"` tự động đưa nó vào public surface. Ghi rõ trong PR.
- "Có export ra package root không?" → **Có** (bước 7). Tiền đề commit 2 phụ thuộc vào nó.

### 8.2 Quy mô port thực tế

Pi-ref `src` = 935 LOC, trong đó **~330 LOC** là hệ type schema `defineTelemetrySchema` mà W10 **không cần**. Phần thật sự port được: `index.ts:1-22` (contract, 22 LOC) + `noop.ts` (20) + `memory.ts` (219) + `conformance.ts` (315) ≈ **576 LOC**. Con số này có ý nghĩa cho ước lượng, nhưng lưu ý: `memory.ts` dùng `private`, `conformance.ts` dùng `await using`, và cả hai dùng specifier `.ts` — cần sửa, không copy.

### 8.3 Thứ mà cả pi-ref lẫn plan đều không có

Không case nào trong 9 case của pi-ref kiểm `string[]` attribute đi về. Nhưng `telemetry.ts:773` và `:782` **đang** gán mảng string, và `otel.test.ts` không che chúng. Đây là khoảng trống thật ở cả hai nguồn. **Thêm case (mục 10 trong §4) — đừng coi là phần thừa.**
