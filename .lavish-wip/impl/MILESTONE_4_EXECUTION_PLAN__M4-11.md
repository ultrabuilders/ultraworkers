# Phiếu triển khai — GAP-M4-11: `normalizeErrorMessage` không ném được

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_4_EXECUTION_PLAN.md`
**Mục:** dòng 1810, `## GAP-M4-11. Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom (sóng B)`
**Ngày kiểm:** 2026-09-29 · cây `milestone-1` @ `47720fd`
**Neo đã kiểm:** 21 · **đúng:** 16 · **hỏng:** 5 (xem §9)

---

## 0. Cảnh báo tiêu đề — đọc trước khi gõ

Lệnh giao việc ghi work item là `## M4-11. Chạy cái doctor đang nằm chết`.
**Tiêu đề đó không tồn tại trong bất kỳ cây nguồn tham chiếu nào.**

```
rg -n "nằm chết" --glob '!node_modules' .        → 0 hit
rg -n "^## M4-11" MILESTONE_4_EXECUTION_PLAN.md  → 0 hit
```

M4-11 thật trong `MILESTONE_4_EXECUTION_PLAN.md` là **`GAP-M4-11`** (dòng 1810), về
`normalizeErrorMessage`. Phiếu này viết cho mục đó. Nếu người gõ được giao đúng
"chạy cái doctor", hãy dừng — đó là một work item khác (`GAP-M1-18`, `omp doctor`),
nằm ở kế hoạch M1, và `MILESTONE_4_EXECUTION_PLAN.md:354` đã ghi rõ nó
**chưa tồn tại** trong kế hoạch M1.

---

## 1. Cái gì thay đổi, quan sát được

Khi một giá trị bị ném vào `catch` mang `message` getter ném lỗi (Error con bị ghi
đè thuộc tính, hoặc `Proxy` bọc Error), `omp` hôm nay **báo ra lỗi của getter thay vì
lỗi thật** — người dùng thấy `getter exploded` cho một sự cố hoàn toàn khác; sau
item này, `normalizeErrorMessage` trả về một chuỗi và **không bao giờ ném**, nên lỗi
gốc là lỗi duy nhất còn lại trên màn hình.

Đã chạy thật trên cây này, không suy đoán:

```
F naive report THREW → getter exploded   <-- original LOST
F safe report  → [object Error]
```

---

## 2. Bảng điểm sửa

Mọi cột TRƯỚC trích nguyên văn từ file đã mở.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/utils/src/normalize-error.ts` **(tạo)** | `normalizeErrorMessage` | *file không tồn tại* | hàm thuần, **không bao giờ ném** — bản đúng ở §6 |
| `packages/utils/test/normalize-error.test.ts` **(tạo)** | — | *file không tồn tại* | 7 case, xem §5 |
| `packages/utils/src/index.ts` | barrel | `export * from "./materialize-string";` (dòng 20) | thêm `export * from "./normalize-error";` giữa dòng 20 và 21 — xem §3 bước 5 về câu hỏi barrel |
| `packages/agent/src/agent-loop.ts:2909` | `validate()` closure | `validationError instanceof Error ? validationError.message : String(validationError);` | `normalizeErrorMessage(validationError)` |
| `packages/agent/src/agent-loop.ts:3417` | tool-result text | `content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],` | `content: [{ type: "text", text: normalizeErrorMessage(e) }],` |
| `packages/agent/src/agent-loop.ts:3454` | tool-result text | *trùng dạng với 3417* | `normalizeErrorMessage(e)` |
| `packages/coding-agent/src/session/agent-session.ts:10583` | rollback failure text | `` rollbackFailure = `cwd rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`; `` | `` rollbackFailure = `cwd rollback failed: ${normalizeErrorMessage(rollbackError)}`; `` |
| `packages/coding-agent/src/session/agent-session.ts:10589` | **`const original`** | `const original = error instanceof Error ? error.message : String(error);` | `const original = normalizeErrorMessage(error);` — **đây là site giữ trọng tâm**: nó đặt tên là "original" rồi nuốt mất nó |
| `packages/coding-agent/src/session/agent-session.ts` (14 site còn lại) | `error:`/`err:`/`republishError` | `error: err instanceof Error ? err.message : String(err),` (2794, 2816, 2822, 2834, 2909, 2954, 4269, 7534, 7658, 7661, 8526, 8574, 8634, 9502) | `error: normalizeErrorMessage(err),` |
| `packages/utils/src/logger.ts:183-186` | `jsonReplacer` | `message: value.message,` / `stack: value.stack,` — **không có try/call nào** | bọc trong `try { … } catch` → `normalizeErrorMessage` |
| `packages/coding-agent/src/dap/client.ts:49-52` | `toErrorMessage` | `function toErrorMessage(value: unknown): string {`<br>`	if (value instanceof Error) return value.message;`<br>`	return String(value);`<br>`}` | **giữ nguyên hành vi** — có thể gọi hàm mới, **không được xoá** |
| `packages/coding-agent/src/dap/session.ts:118-121` | `toErrorMessage` | *giống hệt, y hệt 4 dòng* | **giữ nguyên hành vi** — có thể gọi hàm mới, **không được xoá** |
| `packages/coding-agent/src/ida/protocol.ts:31-33` | `errorMessage` **đã export** | `export function errorMessage(error: unknown): string {`<br>`	return error instanceof Error ? error.message : String(error);`<br>`}` | xem GAP-D8 — gộp hay giữ nợ? |
| `packages/coding-agent/src/slash-commands/helpers/parse.ts:66-68` | `errorMessage` **đã export** | *giống hệt, y hệt 3 dòng* | như trên |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:44-46` | `errorText` **đã export** | `return error instanceof Error ? (error.stack ?? error.message) : String(error);` | **khác hẳn** — ưu tiên `stack`. Hợp nhất vào hàm mới là **đổi hành vi** |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:48-50` | `errorMessage` **đã export** | `return error instanceof Error ? error.message : String(error);` | như trên |
| `.oxlintrc.json` | `rules` | khối `rules` hiện có 12 rule, không có rule nào cấm idiom | xem §3 bước 6 — **cạm bẫy lớn nhất của item này** |

---

## 3. Các bước

### Bước 1 — Đo lại, ghi mốc (không sửa gì)

```bash
git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l
```

→ **895** trên đúng cây này. Đã chạy, khớp tuyệt đối với mốc trong item.

Phân rã để biết cái gì **thật sự** là code:

| vùng | số hit |
| --- | --- |
| `packages/**/src/**` | **821** |
| `packages/**/test/**` | **56** |
| tổng | 895 |

56 hit trong `test/` gồm 23 dòng **JSON fixture** (`packages/coding-agent/test/fixtures/before-compaction.jsonl`) — transcript đã ghi, không phải code, **không bao giờ được migrate**. Đừng để con số này làm bạn tưởng phải sửa chúng.

### Bước 2 — Viết hàm, dùng bản ở §6

Không phải bản trong plan. Bản trong plan **ném** (xem §9, neo hỏng #4). Tạo
`packages/utils/src/normalize-error.ts`.

Mốc đã kiểm: `ls packages/utils/src/normalize-error.ts` → *No such file or directory*.

### Bước 3 — Chọn bốn đường, và chốt tiêu chí chọn

`GAP-M4-11` yêu cầu bốn đường. Từ cây thật:

| đường | file | neo đã kiểm | vì sao là bẫy-thật |
| --- | --- | --- | --- |
| agent loop | `packages/agent/src/agent-loop.ts` | `:2909`, `:3417`, `:3454` (đúng **3** hit) | cả 3 đều **trong** `catch` của tool-result |
| session | `packages/coding-agent/src/session/agent-session.ts` | **16** hit; `:10589` là site giữ trọng tâm | `const original = …` rồi `throw new Error(\`${original} (${rollbackFailure}…)\`)` — nuốt lỗi gốc rồi ném lỗi mới |
| logger | `packages/utils/src/logger.ts` | `jsonReplacer` tại `:183-186` | `value.message` / `value.stack` không guard, chạy cho **mọi** log có `{ err }` |
| TUI error render | `packages/coding-agent/src/modes/controllers/command-controller.ts` (27 hit — **nhiều nhất toàn cây**) | `:27` hit | đường hiển thị ra màn hình; người dùng thấy chuỗi hỏng |

**Tiêu chí chọn phải viết thành câu trong mô tả PR**, không viết trong đầu. Đề xuất:
*"bốn đường được chọn vì chạy trong `catch` và đẩy chuỗi ra bề mặt người dùng (log, TUI, tool result, session rollback) — nơi nuốt lỗi gốc là thiệt hại đã thấy được, không phải chỉ là mất thông tin khi debug."*

### Bước 4 — Nối hàm vào bốn đường

Dùng bảng §2. Riêng `agent-session.ts` là 16 site — **đổi hết trong một file là hợp lý**, vì một file là một đường, không phải refactor 895 chỗ.

Mốc đã kiểm (không suy đoán): `rg -c "instanceof Error \? .*\.message : String\(" packages/coding-agent/src/session/agent-session.ts` → `16`, nằm ở 2794, 2816, 2822, 2834, 2909, 2954, 4269, 7534, 7658, 7661, 8526, 8574, 8634, 9502, 10583, 10589.

### Bước 5 — Barrel hay deep import

`packages/utils/package.json` có:

```json
"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }
```

⇒ **deep import `@oh-my-pi/pi-utils/normalize-error` đã chạy được ngay**, không cần sửa `package.json`. Câu hỏi mở trong plan ("barrel hay import sâu") về mặt kỹ thuật là giả — cái thật sự cần chốt là **quy ước**, không phải khả năng.

`AGENTS.md` cấm `any`, cấm `ReturnType<>`, cấm inline import — không có quy tắc nào cấm deep import. Nhưng `packages/utils/src/index.ts` là barrel `export *` cho 40+ module, và 4 call site nằm ở 3 package khác nhau. **Khuyến nghị: đưa vào barrel** (`export * from "./normalize-error";`, chèn giữa dòng 20 và 21 theo thứ tự alphabet) và import qua `@oh-my-pi/pi-utils`. Lý do: 4 call site phân tán không đáng để mở ra một đường import thứ hai cho package này.

### Bước 6 — oxlint: đọc kỹ trước khi viết

File cấu hình: `.oxlintrc.json` (đã kiểm, tồn tại, 1.5 KB). `oxlint` bản **1.85.0** (đã chạy `bunx oxlint --version`).

Schema của `oxlint` hỗ trợ `jsPlugins` (plugin ESLint viết bằng JS) và `overrides`. Đây là đường **duy nhất** để cấm một *pattern* như `A ? a.b : String(a)`, vì không có rule lõi nào biểu đạt được điều đó.

**Nhưng đây là cạm bẫy lớn nhất của item, xem §8.**

### Bước 7 — Xử lý 3 bản đã export + 2 bản private

`GAP-M4-11` đã tự bác claim "chỉ có hai bản private". Có **năm** bản, đã kiểm từng dòng:

| file:line | tên | trạng thái |
| --- | --- | --- |
| `packages/coding-agent/src/ida/protocol.ts:31` | `errorMessage` | export, giống hệt idiom gốc |
| `packages/coding-agent/src/slash-commands/helpers/parse.ts:66` | `errorMessage` | export, giống hệt idiom gốc |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:48` | `errorMessage` | export, giống hệt idiom gốc |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:44` | `errorText` | export, **khác** — `error.stack ?? error.message` |
| `packages/coding-agent/src/dap/client.ts:49` | `toErrorMessage` | private, giống hệt |
| `packages/coding-agent/src/dap/session.ts:118` | `toErrorMessage` | private, giống hệt |

`errorText` **không** thể gộp vào `normalizeErrorMessage` mà không đổi hành vi (mất `stack`). Đừng gộp nó. `GAP-M4-11` yêu cầu **chốt trước** là gộp 3 bản export hay ghi nợ — đây là câu hỏi mở, không phải việc tự quyết.

### Bước 8 — PR phải nêu tiêu chí chọn + ghi nợ có chủ

895 − N phần còn lại là **nợ kỹ thuật có chủ**, cần **một tên** và **một cách nhắc**. Một dòng ghi nợ không có tên không phải nợ.

---

## 4. Cạm bẫy: bốn bản `errorMessage` **không** cùng hành vi

`errorText` (`worker-runtime.ts:44`) ưu tiên `error.stack`. Nếu bạn gộp nó vào
`normalizeErrorMessage`, mọi log worker **mất stack** — và không test nào của
`worker-runtime` chắc chắn bắt được, vì chúng chỉ assert message.

---

## 5. Hợp đồng test

**File:** `packages/utils/test/normalize-error.test.ts` (mới).
Mốc đã kiểm: `packages/utils/test/file-lock.test.ts` tồn tại — import style là
`import { … } from "../src/file-lock";` (deep relative, **không** qua barrel). Bắt chước.

**Nếu hồi quy, người dùng thấy gì:** một lỗi không liên quan thay cho lỗi thật.
Cụ thể đã đo: `F naive report THREW → getter exploded <-- original LOST`.

| # | case | khẳng định | hôm nay? |
| --- | --- | --- | --- |
| 1 | `Error` với **own-property** `message` getter ném | trả chuỗi, **không ném** | 🔴 **ĐỎ** — chính là hàng quyết định |
| 2 | **hàng âm**: object **không phải** `Error`, có `message` getter trả chuỗi | trả `"[object Object]"`, **không** trả chuỗi đó | 🟢 xanh — chống "chuyển idiom sang chỗ khác" |
| 3 | `null` | trả `"[object Null]"` | 🟢 |
| 4 | `undefined` | trả `"[object Undefined]"` | 🟢 |
| 5 | `Symbol("x")` | trả `"[object Symbol]"`, **không** ném | 🟢 (`String(Symbol())` ném — nhánh này thật sự phân biệt) |
| 6 | **revoked Proxy** | trả `"[unrenderable error]"`, **không** ném | 🔴 **ĐỎ** với bản trong plan — xem §6 và §9 |
| 7 | `Proxy` bọc `Error`, `get` trap ném khi đọc `message` | trả chuỗi, **không** ném | 🔴 **ĐỎ** |

**Cách dựng fixture cho case 1 — đọc kỹ, đây là chỗ dễ sai nhất:**

```typescript
// SAI — KHÔNG làm case 1 đỏ. Đã chạy: ra "[object Object]", không ném.
const bad = { get message(): string { throw new Error("getter exploded"); } };

// ĐÚNG — own property trên một Error thật. Đã chạy: hôm nay NÉM.
const err = new Error("original");
Object.defineProperty(err, "message", {
	get() { throw new Error("getter exploded"); },
	configurable: true,
});
```

Vì sao: `instanceof Error` trên object thường là `false`, nên `String(bad)` được gọi —
mà `String()` trên object thường **không** đụng getter `message`, nên không ném.
Lớp con của `Error` cũng không cứu được: `new Error("x")` tạo `message` là **own
data property**, nó che getter ở prototype. Đã chạy cả hai, đều ra `"orig"`, không ném.

---

## 6. Hình dạng code — bản ĐÚNG

Plan đưa khối code sai (ném ở `instanceof`, xem §9 neo hỏng #4). Bản dưới đây đã
chạy qua **11** input, **không ném lần nào**:

```typescript
// packages/utils/src/normalize-error.ts

/**
 * Render an unknown thrown value as a string WITHOUT ever throwing.
 *
 * Why this is not `value instanceof Error ? value.message : String(value)`:
 * `instanceof`, `value.message`, and `String(value)` all invoke user code. A
 * Proxy — or an `Error` whose `message` is a throwing own-property getter —
 * makes the normalization itself throw. That runs INSIDE a catch block, so the
 * original error is replaced by an unrelated one.
 */
export function normalizeErrorMessage(value: unknown): string {
	if (typeof value === "string") return value;
	try {
		// `instanceof` dispatches to `Symbol.hasInstance` and the proxy's
		// `getPrototypeOf` trap, so the check itself has to live in the guard.
		if (value instanceof Error) return value.message;
	} catch {
		try {
			return Object.prototype.toString.call(value);
		} catch {
			return "[unrenderable error]";
		}
	}
	try {
		// Object.prototype.toString does not dispatch to a user `toString`.
		return Object.prototype.toString.call(value);
	} catch {
		// A revoked Proxy throws from the tag lookup too. Nothing is left to
		// render, so return a fixed string rather than propagating.
		return "[unrenderable error]";
	}
}
```

Khác biệt so với bản trong plan: `instanceof` **nằm trong** `try`, và nhánh `typeof === "string"`
lên trên cùng. Đã kiểm bằng probe: `[object Null]`, `[object Undefined]`,
`[object Symbol]`, `[object Error]`, `[object Object]`, `[object Number]`, và
revoked Proxy → `[unrenderable error]`, tất cả **không ném**.

---

## 7. Cổng

### Tiền đề môi trường

```bash
brew install ninja                                    # BẮT BUỘC TRƯỚC
bun --cwd=packages/natives run build
```

Script `build` của `packages/natives` **đã kiểm tồn tại**: `bun ../../scripts/bazel-natives.ts host --dest native`.

### Lệnh

```bash
# 1. mốc — phải GIẢM so với 895
git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l

# 2. hàm mới + 7 case
bun test packages/utils/test/normalize-error.test.ts

# 3. bốn đường đã di dời — KHÔNG hồi quy
bun test packages/agent/test/
bun test packages/coding-agent/test/debug/          # ← KHÔNG phải test/dap/, xem dưới

# 4. types + lint
bun run check:ts
bun run lint
```

`bun run check:ts` và `bun run lint` **đã kiểm là có thật** trong `package.json` gốc.
Tuyệt đối không `tsc`.

### ⚠ Đường dẫn trong plan hỏng

Plan ghi `bun test packages/coding-agent/test/dap/`. **Thư mục đó không tồn tại.**

```
$ ls packages/coding-agent/test/dap/
lsd: ... No such file or directory

$ bun test packages/coding-agent/test/dap/
8465 files were searched
note: Tests need ".test", "_test_", ".spec" or "_spec_" in the filename
```

Lệnh đó **luôn xanh và không chạy test nào cả**. Đây đúng là loại "cổng luôn xanh tệ
hơn không có cổng". DAP test thật nằm ở `packages/coding-agent/test/debug/`:
`dap-config.test.ts`, `dap-launch-failures.test.ts`, `dap-multi-session.test.ts`.

### Cổng này có ĐỎ ĐƯỢC không? **Có — 3 trong 7 case đỏ ngay hôm nay**

Đã chạy, không suy đoán:

| case | trạng thái hôm nay | bằng chứng |
| --- | --- | --- |
| 1 — own getter trên `Error` | 🔴 **ĐỎ** | `E raw THREW → getter exploded` |
| 6 — revoked Proxy | 🔴 **ĐỎ** | `D raw THREW → Proxy has already been revoked` |
| 7 — Proxy bọc Error, `get` ném | 🔴 **ĐỎ** | `C raw THREW → trap exploded` |

**Nhưng** cổng chỉ đỏ được **nếu** case 1 dùng own-property getter. Nếu gõ theo mô tả
nguyên văn của plan ("một object có getter `message`"), case 1 **xanh từ ngày đầu**
và cổng tự biến thành cổng giả. Đó là lý do §5 phải chỉ rõ cách dựng fixture.

**Điều cổng này bắt được:** case 1, 6, 7 đỏ.
**Điều cổng này KHÔNG bắt được:** 895 chỗ còn lại. Và **không cổng nào bắt được** —
đó chính là lý do phần còn lại phải là nợ kỹ thuật có chủ, không phải một cổng.

---

## 8. Cạm bẫy riêng của work item này

### 1. oxlint KHÔNG biểu đạt được "chỉ cấm trong code MỚI"

Đây là cái sai dễ nhất, và plan không nói.

oxlint áp rule lên **cả cây**. Bật một rule cấm idiom thô ⇒ **821 dòng trong `src/` đỏ
ngay lập tức**. Xử lý bằng `// oxlint-disable-next-line` trên 821 dòng chính là
"refactor 895 chỗ" mà `GAP-M4-11` cấm — chỉ là mặc áo lint. Repo có tiền lệ
(`oxlint-disable-next-line` xuất hiện 90 lần), nên đường đó **không bị cấm** và rất
dễ đi vào.

Ba lựa chọn thật, chọn một và **viết lý do vào PR**:

1. **Thu hẹp phạm vi rule** qua `overrides` trong `.oxlintrc.json` — chỉ áp cho file
   mới. Nhược: lint không phân biệt "file mới" với "file cũ", nên ranh giới là vô
   nghĩa ngay khi file cũ được sửa.
2. **Không thêm rule**, chỉ dựng hàm + test, và ghi cấm idiom vào `AGENTS.md` như
   quy ước review. Nhược: không tự động hoá.
3. **`jsPlugins`** (oxlint 1.85.0 hỗ trợ, nhưng alpha) — viết rule tuỳ biến thật, cho
   phép whitelist theo file. Nhược: alpha, và PR mang dependency mới.

**Khuyến nghị: lựa chọn 1**, kèm một allowlist tường minh trong `.oxlintrc.json`.

### 2. Bản code trong plan NÉM Ở đúng chỗ plan nói nó không ném

```typescript
// Bản trong plan — `instanceof` nằm NGOÀI mọi try/catch:
if (value instanceof Error) {          // ← revoked Proxy NÉM Ở ĐÂY
```

Đã chạy: `D normalize THREW → Proxy has already been revoked`.
`instanceof` gọi `getPrototypeOf` trap. Hàm sinh ra để **không bao giờ ném** thì ném
ở đúng input mà plan dùng để biện minh cho `catch` cuối.

Nếu gõ nguyên văn khối code của plan rồi viết nguyên văn test của plan ⇒ **test đỏ
vì hàm bug**, và rất dễ mất hàng giờ đi tìm chỗ sai. Dùng §6.

### 3. Case 1 xanh ngay từ đầu nếu dựng fixture sai

Chi tiết ở §5. Đây là cổng giả — loại nguy hiểm nhất.

### 4. `errorText` ưu tiên `stack` — gộp là mất stack

`worker-runtime.ts:44`. Chi tiết ở §4.

### 5. 56 hit trong `test/` không phải code

23 dòng trong đó là JSON fixture. Đừng migrate.

### 6. Đừng đổi `const original` ở `agent-session.ts:10589` một cách mờ

Đó là site giữ trọng tâm: nó đặt tên biến là `original` rồi ngay sau đó `throw new
Error(\`${original} (${rollbackFailure}…)\`)`. Hàm mới làm cho tên `original` thành
đúng nghĩa — nhưng chỉ khi bạn thay **cả hai** chỗ (10583 và 10589). Sửa một trong hai
là tạo ra thông điệp sai lệch.

---

## 9. Danh sách neo đã kiểm

| # | neo | kết quả |
| --- | --- | --- |
| 1 | `packages/utils/src/normalize-error.ts` (chưa tồn tại) | ✅ đúng |
| 2 | `packages/utils/test/normalize-error.test.ts` (chưa tồn tại) | ✅ đúng |
| 3 | `packages/utils/test/file-lock.test.ts` tồn tại | ✅ đúng |
| 4 | `packages/agent/src/agent-loop.ts` = 3 hit (2909, 3417, 3454) | ✅ đúng |
| 5 | `packages/ai/src/auth-broker/server.ts` = 8 hit | ⚠️ số đúng, **vai trò sai** (xem hỏng #3) |
| 6 | con số 895 qua `git grep` | ✅ đúng tuyệt đối |
| 7 | `agent-session.ts:4509` = `emitToolCall` | ✅ đúng |
| 8 | `dap/client.ts:49` = `function toErrorMessage(value: unknown): string {` | ✅ đúng |
| 9 | `dap/session.ts:118` cùng nội dung; `:116` STOP_CAPTURE_TIMEOUT_MS; `:117` trống | ✅ đúng cả ba |
| 10 | `ida/protocol.ts:31` = `export function errorMessage` | ✅ đúng |
| 11 | `slash-commands/helpers/parse.ts:66` = `export function errorMessage` | ✅ đúng |
| 12 | `worker-runtime.ts:44` `errorText` / `:48` `errorMessage` | ✅ đúng cả hai |
| 13 | `packages/utils/src/logger.ts` là "đường logger" của idiom thô | ❌ **hỏng #2** |
| 14 | `bun test packages/coding-agent/test/dap/` | ❌ **hỏng #1** |
| 15 | `.oxlintrc.json` tồn tại; oxlint 1.85.0; có `jsPlugins` + `overrides` | ✅ đúng |
| 16 | `bun run check:ts` tồn tại | ✅ đúng |
| 17 | `bun run lint` tồn tại | ✅ đúng |
| 18 | `bun --cwd=packages/natives run build` tồn tại | ✅ đúng |
| 19 | `packages/agent/test/` tồn tại | ✅ đúng |
| 20 | plan: "`packages/utils/package.json` cần type test nếu vào barrel" | ⚠️ `./*` **đã** export deep path → câu hỏi barrel về mặt kỹ thuật là giả |
| 21 | plan: khối code "**không bao giờ** ném" | ❌ **hỏng #4** |

### Neo hỏng (5)

| # | plan nói | thực tế | ảnh hưởng |
| --- | --- | --- | --- |
| 1 | `bun test packages/coding-agent/test/dap/` | thư mục **không tồn tại**; lệnh luôn xanh, không chạy test nào | cổng giả — đổi thành `packages/coding-agent/test/debug/` |
| 2 | `packages/utils/src/logger.ts` là đường di dời | **0** hit idiom thô. Hình dạng thật là `jsonReplacer` `:183-186` với `value.message`/`value.stack` không guard | bước 3 vẫn đúng, nhưng phải sửa *hình dạng*, không thay chữ |
| 3 | "rải đều từ `agent-loop.ts` (3 hit) **tới** `auth-broker/server.ts` (8)" | ngôn ngữ "tới" = điểm cuối đoạn, nhưng max thật là **`command-controller.ts`, 27 hit** | con số 8 bị đọc là trần; 27 mới là trần |
| 4 | khối code "**không bao giờ** ném" | `instanceof` ngoài try ⇒ **ném** ở revoked Proxy | dùng §6, không dùng khối của plan |
| 5 | test: "object có getter `message` ném lỗi" ⇒ hôm nay ném | object thường ⇒ `String()` không gọi getter ⇒ **không ném**, ra `[object Object]` | cổng giả; phải own-property getter trên `Error` thật |
