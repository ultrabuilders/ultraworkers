# Phiếu triển khai — M4-12 (thực chất là `GAP-M4-11`)

> **Lưu ý về ID.** Lệnh giao nói work item là `## M4-12. Một hàm chuẩn hoá lỗi không ném được`.
> Trong `MILESTONE_4_EXECUTION_PLAN.md` **không có** heading `## M4-12` với tiêu đề đó.
> Heading khớp tiêu đề là `## GAP-M4-11. Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom (sóng B)`
> tại `MILESTONE_4_EXECUTION_PLAN.md:1810`. `GAP-M4-12` (`:1975`) là item khác hẳn — "Một hook nổi không được rửa thành quyết định chặn".
> Phiếu này viết cho **GAP-M4-11** (tiêu đề khớp). Tên file giữ nguyên theo lệnh: `MILESTONE_4_EXECUTION_PLAN__M4-12.md`.

---

## 1. Cái gì thay đổi, quan sát được

Một lần ném bất thường từ trong `catch` — một `Error` subclass hoặc `Proxy` có getter `message` ném — thay vì báo lỗi gốc, sẽ làm hệ thống báo **một lỗi không liên quan** (`getter blew up`, hoặc `Proxy has already been revoked`) và mất luôn thông tin gốc; sau phiếu này, ở bốn đường chạy trong `catch` (agent loop, session, TUI error render, logger), nó trả về một chuỗi bình thường và lỗi gốc vẫn là lỗi được báo.

---

## 2. Bảng điểm sửa

TRƯỚC được trích từ file thật, đã mở và đọc ở phần 6.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/utils/src/normalize-error.ts` **(tạo)** | `normalizeErrorMessage` | *(không tồn tại — `ls` = "No such file or directory")* | `export function normalizeErrorMessage(value: unknown): string` — mọi truy cập thuộc tính bọc try/catch riêng, fallback `Object.prototype.toString.call`, **không bao giờ** ném |
| `packages/utils/test/normalize-error.test.ts` **(tạo)** | — | *(không tồn tại)* | 5 hàng: Error-throwing-getter, plain-object-throwing-getter, plain-object-safe-getter (hàng âm), `null`/`undefined`, `Symbol()`, revoked Proxy |
| `packages/agent/src/agent-loop.ts:2909` | `validationErrorMessage` | `validationError instanceof Error ? validationError.message : String(validationError);` | `normalizeErrorMessage(validationError)` |
| `packages/agent/src/agent-loop.ts:3417` | `result` trong `catch (e)` | `content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],` | `content: [{ type: "text", text: normalizeErrorMessage(e) }],` |
| `packages/agent/src/agent-loop.ts:3454` | `result` trong `catch (e)` | `content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],` | `content: [{ type: "text", text: normalizeErrorMessage(e) }],` |
| `packages/coding-agent/src/session/agent-session.ts:7661` | `const message` trong `catch` của custom command | `const message = err instanceof Error ? err.message : String(err);` | `const message = normalizeErrorMessage(err);` |
| `packages/coding-agent/src/session/agent-session.ts:7658` | `#extensionRunner.emitError` | `error: err instanceof Error ? err.message : String(err),` | `error: normalizeErrorMessage(err),` |
| `packages/coding-agent/src/session/agent-session.ts:10589` | `const original` (cwd rollback) | `const original = error instanceof Error ? error.message : String(error);` | `const original = normalizeErrorMessage(error);` |
| `packages/coding-agent/src/session/agent-session.ts:10583` | `rollbackFailure` (cwd rollback) | `` rollbackFailure = `cwd rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`; `` | `` rollbackFailure = `cwd rollback failed: ${normalizeErrorMessage(rollbackError)}`; `` |
| `packages/tui/src/chrome/error-block.ts:19` | `sanitizeErrorLine` | `const message = error instanceof Error ? error.message : String(error);` | `const message = normalizeErrorLine(error);` hoặc `normalizeErrorMessage(error)` — xem bước 3 |
| `packages/utils/src/logger.ts:186` | `jsonReplacer` | `message: value.message,` (bên trong `JSON.stringify(entry, jsonReplacer)` tại `:247`) | **không** dùng `normalizeErrorMessage` — xem cảnh báo bước 3 |
| `packages/coding-agent/src/dap/client.ts:49` | `toErrorMessage` | `function toErrorMessage(value: unknown): string {`<br>`	if (value instanceof Error) return value.message;`<br>`	return String(value);`<br>`}` | **giữ nguyên** — điều khoản bảo toàn của plan §3 |
| `packages/coding-agent/src/dap/session.ts:118` | `toErrorMessage` | `function toErrorMessage(value: unknown): string {`<br>`	if (value instanceof Error) return value.message;`<br>`	return String(value);`<br>`}` | **giữ nguyên** — điều khoản bảo toàn của plan §3 |
| `.oxlintrc.json` | `jsPlugins` + `rules` + `overrides` | *(chưa có khóa nào trong ba; file chỉ có `categories`/`rules`/`ignorePatterns`)* | jsPlugin `local/no-raw-error-ternary` + `overrides` tắt rule cho cây legacy |

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

### Bước 1 — Đo lại mốc trước khi viết

```bash
git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l
```

Trên cây hôm nay (2026-09-29) trả về **895** — khớp đúng mốc plan ghi. Không chạy lại để "xác nhận" rồi ghi con số khác; nếu khác thì ghi con số thật kèm ngày.

### Bước 2 — Viết hàm ở `packages/utils/src/normalize-error.ts`

**Sửa hình dạng mà plan đưa.** Khuôn trong plan §"Hình dạng code" **ném** trên đúng case mà plan đòi test ở (revoked Proxy). Đã chạy thật, xem §6.2. Hình dạng phải có `try` bao **cả** khối `instanceof`:

```typescript
// packages/utils/src/normalize-error.ts

/**
 * Render an unknown thrown value as a string WITHOUT ever throwing.
 *
 * Why this is not `value instanceof Error ? value.message : String(value)`:
 * both `obj.message` and `String(obj)` invoke user code. A Proxy — or simply an
 * object with a `message` getter that throws — makes the normalization itself
 * throw. That runs INSIDE a catch block, so the original error is replaced by an
 * unrelated one.
 */
export function normalizeErrorMessage(value: unknown): string {
	try {
		if (value instanceof Error) {
			try {
				return value.message;
			} catch {
				// A throwing `message` getter on an Error subclass lands here.
				return safeTag(value);
			}
		}
		if (typeof value === "string") return value;
	} catch {
		// `instanceof` reads the prototype through the proxy's `getPrototypeOf`
		// trap, so it THROWS on a revoked Proxy — before the tag lookup below
		// would have. Guarding only the tag call is not enough.
	}
	return safeTag(value);
}

function safeTag(value: unknown): string {
	try {
		// Object.prototype.toString is the one coercion that does not dispatch to
		// user code: safe for Symbol and null.
		return Object.prototype.toString.call(value);
	} catch {
		// A revoked Proxy throws from the tag lookup too. There is no value left
		// to render, so return a fixed string rather than propagating.
		return "[unrenderable error]";
	}
}
```

Đã chạy đúng hình dạng này: 6/6 nhánh trả chuỗi, không nhánh nào ném (§6.2).

### Bước 3 — Di dời có chọn lọc: 4 đường, nhưng đếm lại

Plan §"Các bước" nói bốn đường là "agent loop, session, TUI error render, logger". Đo trên cây thật:

| đường | số idiom | neo |
| --- | --- | --- |
| `packages/agent/src/agent-loop.ts` | **3** | `:2909`, `:3417`, `:3454` |
| `packages/coding-agent/src/session/agent-session.ts` | **16** | `:7658`, `:7661`, `:10583`, `:10589`, … |
| `packages/tui/src/chrome/error-block.ts` | **1** | `:19` (`sanitizeErrorLine`) |
| `packages/utils/src/logger.ts` | **0** | xem cảnh báo bên dưới |

**Hai chỗ phải sửa so với plan:**

1. **Bảng "File cần chạm tới" của plan không liệt kê `packages/tui/src/chrome/error-block.ts`**, nhưng danh sách "bốn đường" ở §"Các bước" lại có "TUI error render". TUI error render **chính là** `error-block.ts:19`. Thêm file này vào bảng, nếu không thì kỹ sư gõ theo bảng sẽ bỏ sót nó.

2. **`packages/utils/src/logger.ts` KHÔNG chứa idiom.** Đo: `git grep -c "instanceof Error ? .*\.message : String(" -- packages/utils/src/logger.ts` → exit 1, 0 hit. Bảng của plan ghi nó là "Đường logger" cần sửa — sai. Logger **không** phải call site nào của idiom. Sửa nó cũng **không làm giảm** con số 895, tức là nó không phục vụ điều kiện cổng (1).

   Nhưng logger **vẫn** là một bẫy thật, theo một cơ chế khác: `jsonReplacer` tại `packages/utils/src/logger.ts:182` đọc `message: value.message` (`:186`) và `stack: value.stack` (`:187`) không có try/catch, rồi chạy trong `JSON.stringify(entry, jsonReplacer)` tại `:247`. Đã chạy thật: một `Error` subclass có getter `message` ném làm `jsonReplacer` **ném**, và nó ném ra khỏi `formatLogInfo` (`:235`) — tức là **đường logger hỏng trước cả khi ném tới**.

   Vì vậy: **không** sửa `logger.ts` bằng `normalizeErrorMessage`. Nó không có idiom để thay. Nếu muốn gồm nó vào phạm vi, đó là **một work item riêng** (bọc `jsonReplacer`), và phải nói rõ trong mô tả PR là ngoài tiêu chí "thay idiom". Không gộp vội — nó làm thay đổi hình dạng `formatLogInfo` cho mọi entry của logger, đó là thay đổi hành vi chứ không phải thay idiom.

**Tiêu chí chọn (điều kiện cổng 4).** Ghi vào mô tả PR bằng câu có thể kiểm chứng: *"chỉ di dời những call site nằm trong khối `catch` và nằm trên đường mà lỗi gốc bị thay"*. Với tiêu chí đó:
- `agent-loop.ts:3417` và `:3454` — cả hai nằm ngay trong `catch (e) {` (đọc `:3414` và `:3451`). Đạt.
- `agent-loop.ts:2909` — nằm trong một `try` của validation, không phải `catch`. **Không đạt tiêu chí này.** Xem bước 3.1.
- `agent-session.ts:7658`, `:7661` — trong `catch` của custom command. Đạt.
- `agent-session.ts:10583`, `:10589` — trong `catch` của cwd switch. Đạt.
- `error-block.ts:19` — `sanitizeErrorLine` không nằm trong `catch`; nó là hàm render mà caller gọi **từ trong** `catch` (ví dụ `btw-controller.ts`, `btw-panel.ts`). Đạt theo nghĩa "trên đường mà lỗi gốc bị nuốt".

#### 3.1 — Cỡ nào thì đủ cho điều kiện cổng (1)?

Điều kiện cổng (1) là "con số **giảm**", không định nghĩa bao nhiêu. Bốn đường = 3 + 16 + 1 + 0 = **20 hit**, nên 895 → **875**. Đó là đủ để đỏ được: 20 là khác 0, và không thể tăng lên trừ khi ai đó viết thêm idiom.

Nhưng cần nói thẳng: **20 trên 895 là 2,2%**. Cổng này đỏ được ở mức "có thay đổi", không đỏ được ở mức "thay đủ". Đừng bán nó là thứ hai. Nếu muốn con số có ý nghĩa hơn mà vẫn review được, chọn **theo tiêu chí catch** thay vì theo file: grep `catch` block có idiom. Ở `agent-session.ts` riêng đã có 16 chỗ, trong đó 4 chỗ nằm trong `catch` thật; phần còn lại là log/emit metadata — vẫn là đường nuốt lỗi.

**Khuyến nghị cụ thể:** di dời **toàn bộ 20 hit** ở ba file có idiom. Lý do: cùng một file, cùng một kiểu sửa một dòng, review được, và `error-block.ts` chỉ có đúng 1 hit nên không tốn gì. Bỏ sót 13 hit trong `agent-session.ts` để tiết kiệm sẽ để lại đúng loại "xanh mà không tới đâu" mà plan §"Cách sai dễ nhất" cảnh báo.

#### 3.2 — `error-block.ts` cần một quyết định phụ

`sanitizeErrorLine` làm **thêm** việc sau khi lấy message: `message.replace(/\r\n?/g, "\n")` tại `:20`, rồi `shortenEmbeddedPaths(replaceTabs(sanitizeText(...)))`, rồi `truncateToWidth`. Nó được thiết kế để nhận **string hoặc Error** (`packages/coding-agent/test/error-line.test.ts:8` truyền thẳng một chuỗi). `normalizeErrorMessage` trả về `"[object Object]"` cho object thường — đúng, nhưng nghĩa là **mọi object không phải `Error` vẫn hiện `[object Object]`** thay vì chuỗi của nó.

Hàm cũ cũng vậy (`String(error)` cũng cho `[object Object]`), nên **hành vi không đổi**. Nhưng nếu muốn giữ nguyên chặt, gọi `normalizeErrorMessage` rồi vẫn chạy tiếp chuỗi `replace`/`sanitize` như cũ — đừng vừa thay idiom vừa đổi pipeline.

### Bước 4 — oxlint rule: phải là **jsPlugin**, không phải rule có sẵn

Đã thử nghiệm thật với oxlint 1.85.0 (bản đang cài trong `node_modules/oxlint`):

- `no-restricted-properties` **có** trong schema nhưng **không bắt được** idiom. Chạy thật trên file mẫu: exit 0, không một lỗi nào — kể cả với `object: "Error", property: "message"`.
- `no-restricted-syntax` **không tồn tại** trong oxlint (`rg -c '"no-restricted-syntax"' node_modules/oxlint/configuration_schema.json` → 0). Chỉ có `no-restricted-exports`, `no-restricted-globals`, `no-restricted-imports`, `no-restricted-properties`.
- Lối duy nhất đã chạy thật và **bắt được** là `jsPlugins` (schema có khoá `jsPlugins` ở `node_modules/oxlint/configuration_schema.json:59`).

Vậy rule phải là một file plugin cục bộ. Hình dạnh plugin mà oxlint chấp nhận (đã xác minh chạy thật, bắt đúng 1 lỗi ở đúng dòng):

```javascript
// scripts/oxlint-plugins/no-raw-error-ternary.js
const plugin = {
	meta: { name: "local" },
	rules: {
		"no-raw-error-ternary": {
			meta: { name: "local/no-raw-error-ternary" },
			create(context) {
				return {
					ConditionalExpression(node) {
						const test = node.test;
						if (
							test &&
							test.type === "BinaryExpression" &&
							test.operator === "instanceof" &&
							test.right &&
							test.right.name === "Error"
						) {
							context.report({
								node,
								message: "Use normalizeErrorMessage() — this idiom can throw inside a catch block.",
							});
						}
					},
				};
			},
		},
	},
};
export default plugin;
```

Đây là `scripts/` chứ không phải `packages/` — nó là cấu hình lint toàn cây, không thuộc package nào.

### Bước 5 — `overrides` để cây legacy không đỏ

Rule bắt được idiom ở **mọi** file, kể cả 875 hit legacy. Đã chạy thật `overrides` với `files: ["legacy/**"]` + `rules: { "local/no-raw-error-ternary": "off" }`: chỉ file mới báo lỗi, file legacy im lặng.

Với cây này, `overrides` phải **tắt** rule trên toàn bộ cây hiện tại, và chỉ bật lại ở nơi mới. Cách bền nhất: tắt theo danh sách thư mục đã biết, và ghi danh sách đó vào mô tả PR (chính là "nợ có chủ", ở dạng cấu hình thay vì dạng lời hứa).

Nếu 875 hit nằm rải trên ~40 file, việc liệt kê tay dễ sót và sót là cây đỏ. **Hãy sinh danh sách bằng lệnh**, đừng gõ tay:

```bash
git grep -l "instanceof Error ? .*\.message : String(" -- packages/ | sed 's|^|      "|; s|$|",|'
```

Bước 6 chạy lại lệnh này sau khi di dời, nên danh sách phải ngắn lại — đó chính là bằng chứng cho điều kiện cổng (1).

### Bước 6 — PR description phải có câu tiêu chí (điều kiện cổng 4)

PR phải nêu: (a) tiêu chí đã dùng để chọn các call site, (b) 875 hit còn lại là **nợ kỹ thuật có chủ**, (c) `packages/utils/src/logger.ts` **không** nằm trong phạm vi vì không chứa idiom (kèm lý do vì sao bẫy ở đó vẫn là bẫy — xem bước 3 mục 2), (d) tên owner của nợ.

### Bước 7 — Ba bản `errorMessage`/`errorText` đã export (phần plan nói "chưa quyết")

Đã xác minh đủ 5 bản (2 private ở `dap/`, 3 export):

| vị trí | dạng | trích |
| --- | --- | --- |
| `packages/coding-agent/src/ida/protocol.ts:31` | export | `export function errorMessage(error: unknown): string {` |
| `packages/coding-agent/src/slash-commands/helpers/parse.ts:66` | export | `export function errorMessage(error: unknown): string {` |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:44` | export | `export function errorText(error: unknown): string {` |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:48` | export | `export function errorMessage(error: unknown): string {` |
| `packages/coding-agent/src/dap/client.ts:49` | private | `function toErrorMessage(value: unknown): string {` |
| `packages/coding-agent/src/dap/session.ts:118` | private | `function toErrorMessage(value: unknown): string {` |

Cả ba bản export đều có **nhiều call site thật** (ví dụ `ida/client.ts`, `ida/host.ts`, `ida/supervisor.ts` dùng `errorMessage` từ `protocol.ts`). Gộp chúng là **thay đổi hành vi ở các file khác**, không chỉ là gom trùng lặp. Đây là câu hỏi mở của plan ("Cần người xác nhận" mục 1) — **đừng tự gộp**.

`errorText` (`:44`) là ngoại lệ thật: nó trả `error.stack ?? error.message`, khác hẳn `errorMessage`. Không được gộp nó vào.

### Bước 8 — Chạy cổng

Xem §5.

---

## 4. Hợp đồng test

**File:** `packages/utils/test/normalize-error.test.ts` (mới). Thư mục `packages/utils/test/` tồn tại — có `file-lock.test.ts` sẵn.

**Cấu hình đã kiểm:** `packages/utils/package.json:47` → `"check:types": "tsgo -p tsconfig.json --noEmit"`. Test của package chạy bằng `bun test --parallel` (`package.json:49`).

### 5 hàng, mỗi hàng một hợp đồng khác nhau

| # | Case | Input | Khẳng định | Nếu hồi quy, người dùng thấy gì |
| --- | --- | --- | --- | --- |
| 1 | Error subclass, getter `message` **ném** | `class Boom extends Error { get message() { throw ... } }` | trả về `string`, **không** ném | Trong `catch`, lỗi thật biến mất, thay bằng `getter blew up` |
| 2 | Object thường, getter `message` **ném** | `{ get message() { throw ... } }` | trả `string`, không ném | Nhánh `catch` lọt, lỗi gốc bị đổi |
| 3 | **HÀNG ÂM** — object thường, getter `message` trả chuỗi | `{ message: "leaked" }` | kết quả **không chứa** `"leaked"` (thực tế: `"[object Object]"`) | Đây là hàng phân biệt "chuẩn hoá an toàn" với "chỉ chuyển idiom sang một chỗ khác". Nếu hàng này đỏ, hàm đã hấp thụ chuỗi `.message` của object không phải `Error` — tức là **vẫn rò` theo đường cũ** |
| 4 | `null` / `undefined` | — | mỗi cái một `expect`, kết quả là chuỗi | `String(null)` = `"null"` vẫn được; nhưng phải chứng minh không ném |
| 5 | `Symbol()` | — | trả chuỗi, không ném | `String(Symbol())` **ném** `TypeError: Cannot convert a Symbol value to a string` — hàng này bắt được nhánh `typeof value === "string"` bị sót |
| 6 | **revoked Proxy** | `Proxy.revocable({}, {}); revoke()` | trả chuỗi, không ném | **Hàng này đỏ với đúng hình dạng code trong plan.** Xem §6.2 |

Hàng 3, 5, 6 là ba hợp đồng **khác nhau** — xem bước 4.1.

#### 4.1 — Vì sao hàng 6 (revoked Proxy) là hàng không thể bỏ

Đã chạy thật từng bước:

```
A instanceof Error      => THREW: Proxy has already been revoked. No more operations are allowed to be performed on it
B typeof proxy          => "object"   (typeof KHÔNG ném)
C Object.prototype.toString.call(proxy) => THREW: Object.prototype.toString cannot be called on a Proxy that has been revoked
```

Cả **hai** đều ném. Nghĩa là `instanceof` **ném trước** khi tới nhánh `catch` cuối. Đó là lý do hình dạng trong plan (chỉ bọc try quanh `message` và quanh `toString`) **không** qua hàng này.

Chạy lại với hình dạng đã sửa ở bước 2:

```
revoked      => "[unrenderable error]"
Boom         => "[object Error]"
plainSafe    => "[object Object]"
null         => "[object Null]"
Symbol       => "[object Symbol]"
string       => "txt"
```

6/6, không ném. Hàng này là bằng chứng cho **vì sao** `try` phải bao cả `instanceof` — không có nó, hàm vi phạm chính hợp đồng "không bao giờ ném" mà tên hàm và plan đều hứa.

### Test cho phần di dời

`packages/utils/test/normalize-error.test.ts` là hợp đồng của hàm. Phần di dời **không** cần test mới: các call site đó đã có test hoặc đã được hợp đồng của chúng bảo vệ. Thêm test mới ở đó là vi phạm AGENTS.md §Testing ("Đừng lặp lại coverage ở nhiều tầng").

### Tuyệt đối không source-grep

`normalize-error.test.ts` **không** được đọc file nguồn rồi `expect(src).toContain(...)`. AGENTS.md cấm điều này tường minh. Hình dạng "FORBIDDEN in new code" trong plan chỉ để nhận diện, **không** chép vào test. Ràng buộc cấu trúc "không có idiom thô" do **oxlint rule** giữ — đó đúng là đường AGENTS.md mở sẵn.

---

## 5. Cổng

### 5.1 — Lệnh

```bash
# 0. TIỀN ĐỀ MÔI TRƯỜNG
brew install ninja
bun --cwd=packages/natives run build

# 1. Mốc
git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l     # 895 hôm nay

# 2. Hàm mới
bun test packages/utils/test/normalize-error.test.ts

# 3. Ba đường đã di dời — không hồi quy
bun test packages/agent/test/
bun test packages/coding-agent/test/debug/
bun test packages/tui/test/

# 4. Types + lint
bun run check:ts
bun run lint:tools

# 5. Cơ học hoàn tất: số ở bước 1 phải GIẢM, và overrides phải ngắn lại
git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l     # 875
git grep -l "instanceof Error ? .*\.message : String(" -- packages/ | wc -l     # regenerate overrides
```

### 5.2 — Cổng nào **ĐỎ ĐƯỢC**, bằng cách nào

Đã chạy baseline trên cây sạch (chưa sửa gì) để biết cái nào là đỏ sẵn:

| Cổng | Baseline 2026-09-29 | Đỏ được? |
| --- | --- | --- |
| `bun test packages/utils/test/normalize-error.test.ts` | file chưa có → không chạy được | **CÓ** — hàng 1/2/6 đỏ với bất kỳ bản triển khai nào bỏ try quanh `instanceof`; hàng âm 3 đỏ với bản chỉ `try` quanh `value.message`. Đã chứng minh bằng chạy thật ở §6.2 |
| `bun test packages/agent/test/` | **617 pass / 13 fail** | **KHÔNG** — đã đỏ sẵn. 13 fail là `compact() Anthropic native lane` và `shouldUseAnthropicNativeCompaction`, không liên quan. Cổng này **luôn xanh-tệ**. Phải ghi số baseline vào mô tả PR và so **chênh lệch**, không so tuyệt đối |
| `bun test packages/coding-agent/test/debug/` | **54 pass / 0 fail** | **CÓ** — đây là cổng thật cho hai bản `toErrorMessage` ở `dap/` |
| `bun test packages/tui/test/` | **2808 pass / 7 fail** | **KHÔNG** — đã đỏ sẵn (6 `glyph protocol probe` + 1 `resize on Warp`). So chênh lệch, không so tuyệt đối |
| `bun run check:ts` | xanh | **CÓ** |
| `bun run lint:tools` | xanh | **CÓ** — nhưng chỉ sau khi `overrides` bắt đủ file legacy. Nếu overrides sót, cây đỏ và đó là phát hiện thật |
| Con số 895 **giảm** | 895 | **CÓ, nhưng yếu** — đỏ được ở mức `895 ≠ sau`. Đây là điều kiện *khác 0*, không phải *đủ*. Nói thẳng trong PR |

### 5.3 — Sửa lại cổng nào không đỏ được

**`bun test packages/coding-agent/test/dap/` — thư mục này KHÔNG tồn tại.** `ls` → "No such file or directory". `bun test` trên nó in "The following filters did not match any test files" và **exit 1** — tức là cổng đỏ **vĩnh viễn**, không phải vì công việc. Đây đúng là loại "cổng luôn đỏ tệ" mà task cảnh báo. Thay bằng `packages/coding-agent/test/debug/` (54/0 xanh, và `dap-launch-failures.test.ts:7-8` import trực tiếp cả `dap/client` lẫn `dap/session` — nên nó **thật sự** chạm qua hai hàm `toErrorMessage`).

**`bun test packages/agent/test/` và `bun test packages/tui/test/`** phải kèm số baseline trong mô tả PR, và điều kiện hoàn thành phải viết là "**không có fail mới so với baseline 13 / 7**", không phải "0 fail".

**Không thay đổi `packages/utils/src/logger.ts`.** Không có idiom để thay (đo = 0 hit). Sửa nó là thay đổi `formatLogInfo`, là việc khác.

### 5.4 — Cổng không bắt được gì

- **875 hit còn lại.** Không cổng nào bắt được — đây là lý do phần còn lại phải là nợ có chủ, không phải một cổng.
- **`jsonReplacer` ở `logger.ts:182`.** Bẫy thật, đã chạy thật và thấy ném, nhưng **không nằm trong phạm vi** và **không cổng nào ở trên chạm tới nó**. Nếu không nói rõ trong PR, người đọc sẽ tưởng logger đã an toàn.
- **Ba bản `errorMessage` đã export** (`ida/protocol.ts:31`, `parse.ts:66`, `worker-runtime.ts:48`) vẫn ném. Gộp hay không là câu hỏi mở của plan.

---

## 6. Cạm bẫy riêng của work item này

### 6.1 — Cạm bẫy số 1: hình dạng code trong plan tự ném trên chính case nó đòi test

Đây là cạm bẫy lớn nhất, và nó **không thể bỏ qua**: kỹ sư cắng dán khối TypeScript ở plan §"Hình dạng code" sẽ viết test đúng theo plan, rồi **test đỏ** ở hàng revoked Proxy, rồi tưởng mình sai test.

Đã chạy thật hình dạng **nguyên văn** của plan:

```
1 Error-throwing-getter  => "[object Error]"
2 plain-throwing-getter  => "[object Object]"
3 plain-safe-getter      => "[object Object]"
4 null => "[object Null]"  undefined => "[object Undefined]"
5 Symbol => "[object Symbol]"
6 revoked THREW TypeError: Proxy has already been revoked. No more operations are allowed to be performed on it
```

Hàng 6 ném. Nguyên nhân: `value instanceof Error` ở dòng đầu gọi `getPrototypeOf` qua proxy, và proxy đã bị revoke thì trap đó ném — **trước khi** tới `try` bao quanh `Object.prototype.toString.call`.

Đây không phải chi tiết hình thức: nó nghĩa là hàm mang tên "không bao giờ ném" sẽ ném đúng trên một trong ba input mà plan bắt buộc phải test. Sửa ở bước 2, và hiểu **vì sao** (`instanceof` cũng là user code).

### 6.2 — Cạm bẫy số 2: hai cổng test đã đỏ sẵn

Đo baseline rồi mới biết: `packages/agent/test/` **13 fail**, `packages/tui/test/` **7 fail** trên cây sạch. Hai lệnh này trong khối Xác minh của plan sẽ đỏ trước khi bạn gõ dòng code đầu tiên. Không có số baseline thì mọi lần chạy đều trông giống hồi quy.

### 6.3 — Cạm bẫy số 3: cổng `test/dap/` trỏ vào thư mục không tồn tại

Đã nêu ở §5.3. Đỏ vĩnh viễn, không mang thông tin.

### 6.4 — Cạm bẫy số 4: `logger.ts` không chứa idiom, nhưng bảng của plan ghi nó là cần sửa

`git grep -c "instanceof Error ? .*\.message : String(" -- packages/utils/src/logger.ts` → **0 hit**. Nếu kỹ sư tin bảng và đi sửa, họ sẽ phải **tự bịa** một thay đổi: hoặc thêm import không dùng, hoặc refactor `jsonReplacer` — cả hai đều là thay đổi hành vi ngoài tiêu chí "thay idiom". Bẫy ở logger là **thật** nhưng theo cơ chế khác (`jsonReplacer` đọc `.message`/`.stack` không chắn, chạy trong `JSON.stringify` tại `:247`; đã chạy thật và thấy ném), nên phải nói rõ là **ngoài phạm vi**, không phải im lặng bỏ qua.

### 6.5 — Cạm bẫy số 5: `overrides` gõ tay sẽ sót, và sót là cây đỏ

Rule bắt idiom ở mọi file. 875 hit legacy rải trên nhiều file. Liệt kê tay trong `.oxlintrc.json` thì một file sót là `bun run lint:tools` đỏ. Sinh danh sách bằng `git grep -l` (bước 5), và chạy lại sau khi di dời để nó ngắn lại — đó là bằng chứng cơ học cho điều kiện cổng (1).

### 6.6 — Cạm bẫy số 6: hàng âm (object thường có getter `message`) dễ bị viết thành hàng bỏ qua

Đã chạy: với `{ message: "leaked" }`, `String(err)` của idiom cũ trả `"[object Object]"` — **không** rò. Nhưng nếu kỹ sư viết hàm kiểu:

```typescript
if (value instanceof Error) return value.message;
if (typeof (value as { message?: unknown }).message === "string") return (value as { message: string }).message;
```

thì hàng này hấp thụ `"leaked"` và **tái tạo đúng đường rò của idiom cũ** — chỉ khác hình thức. Hàng âm là thứ duy nhất ngăn điều đó. Đừng viết nó thành `expect(result).toBeTruthy()`; phải khẳng định **không chứa** chuỗi gốc.

### 6.7 — Cạm bẫy số 7: `errorText` (`worker-runtime.ts:44`) KHÔNG phải bản trùng

```typescript
export function errorText(error: unknown): string {
	return error instanceof Error ? (error.stack ?? error.message) : String(error);
}
```

Nó trả `stack ?? message` — khác hẳn `errorMessage` ngay cạnh nó ở `:48`. Gộp nó vào hàm mới là **mất thông tin stack**. Call site của nó: `worker-runtime.ts:327`, `:331` — cả hai đều regex `CUDA_DEVICE_UNAVAILABLE_RE` / `TRANSITIVE_CUDA_LIBRARY_RE` cần **stack**, không chỉ message. Gộp là hỏng chức năng.

### 6.8 — Cạm bẫy số 8: bảng "File cần chạm tới" thiếu `error-block.ts`

Danh sách "bốn đường" ở §"Các bước" có "TUI error render"; bảng file thì không. TUI error render là `packages/tui/src/chrome/error-block.ts:19`. Gõ theo bảng → bỏ sót, và số không giảm đúng như kỳ vọng.

---

## 7. Phát hiện về chính tài liệu (ghi ra, không sửa)

| Claim trong plan | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Con số mốc 895 | **Đúng** | `git grep -h "instanceof Error ? .*\.message : String(" -- packages/ \| wc -l` → 895 |
| `dap/client.ts:49` là `function toErrorMessage` | **Đúng** | `sed -n '49p'` → `function toErrorMessage(value: unknown): string {` |
| `dap/session.ts:118` là `function toErrorMessage`, `:116` là `STOP_CAPTURE_TIMEOUT_MS`, `:117` trống | **Đúng cả ba** | `sed -n '114,118p'` → `:116 const STOP_CAPTURE_TIMEOUT_MS = 5_000;` / `:117` trống / `:118 function toErrorMessage(...)` |
| `agent-loop.ts` 3 hit | **Đúng** | `:2909`, `:3417`, `:3454` |
| `auth-broker/server.ts` 8 hit | **Đúng** | `git grep -c` → 8 |
| `packages/utils/src/` không có `normalize-error` | **Đúng** | `ls` → No such file |
| `packages/utils/test/` tồn tại, có `file-lock.test.ts` | **Đúng** | cả hai đều có |
| `src/ida/protocol.ts:31`, `parse.ts:66`, `worker-runtime.ts:48` là export; `errorText` ở `:44` | **Đúng cả bốn** | `git grep -n '^export function errorMessage\|^export function errorText'` → đúng 4 dòng |
| **Hình dạng code** trong §"Hình dạng code" | **SAI — ném** | revoked Proxy ném ở `instanceof`, trước `try` cuối. Đã chạy thật. Sửa ở bước 2 |
| `packages/utils/src/logger.ts` là "Đường logger" cần sửa | **SAI** | 0 hit idiom. Bẫy thật nhưng qua `jsonReplacer:182`, không phải idiom |
| `bun test packages/coding-agent/test/dap/` | **SAI** | thư mục không tồn tại; lệnh exit 1 vĩnh viễn |
| Bảng file liệt kê TUI error render | **THIẾU** | `packages/tui/src/chrome/error-block.ts:19` có 1 hit, có trong danh sách "bốn đường" nhưng không có trong bảng |
| "oxlint rule cấm idiom thô" | **Cần jsPlugin** | `no-restricted-syntax` không tồn tại trong oxlint; `no-restricted-properties` chạy thật không bắt idiom. `jsPlugins` bắt được |
| `agent-session.ts` chứa `emitToolCall` ở `:4509` (nhắc ở GAP-M4-12) | **Đúng** | `sed -n '4509p'` → `const callResult = await runner.emitToolCall(` |

**Chưa có mặc định nào được chốt** cho: GAP-D8 (tiêu chí chọn 895 call site), owner của nợ còn lại, hàm có nằm trong barrel `packages/utils` không, và có gộp ba bản `errorMessage` đã export không. `ls .lavish-wip/DECISION-*.md` → không có file nào đề cập `GAP-D8` hay `895`. Bốn câu này chặn viết import ở call site, nên phải chốt trước khi code.
