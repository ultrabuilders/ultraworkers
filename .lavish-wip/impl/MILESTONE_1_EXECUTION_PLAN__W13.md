# PHIẾU TRIỂN KHAI — W13

**Work item:** `## W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung`
**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md:2632-2836`
**Repo:** `/Users/tranquangdang21/Projects/ultraworkers`, branch `milestone-1`, HEAD `65cc6c1`
**Ngày kiểm:** 2026-09-29

> **ĐỌC TRƯỚC MỤC 0.** Phiếu này viết theo đúng work item, nhưng có **một phát hiện thực nghiệm
> làm đổi phạm vi deliverable** và **11 neo hỏng** so với cây thật. Cả hai đều nằm ở Mục 0 và
> Mục 7. **Không viết `retryLoop` cho tới khi đọc Mục 0** — bằng chứng đo được ở đó cho thấy
> nhánh đó không có đường vào.

---

## 0. PHÁT HIỂN CHẶN — retry ENOBUFS không có repro (đã chạy thật)

Work item bước 1 tự dựng repro và tự định nghĩa nhánh rẽ: *"Nếu `ENOBUFS`/`EAGAIN`/`EWOULDBLOCK`
không xuất hiện ở CẢ error event LẪN sync throw, thì câu hỏi mở #2 đã trả lời: phần retry không có
repro — chỉ ship phần gom về một chỗ."*

**Tôi đã chạy nhánh đó. Đáp án: KHÔNG có repro. Cả trên Bun lẫn Node.**

Probe (3 lần mỗi runtime, child ghi 64 MB vào stdout pipe, parent `pause()` reader và không đọc,
gắn `error` listener lên cả child lẫn `child.stdout`):

```
# Node v26.3.0 — /tmp/child-writer.mjs ghi "x".repeat(64*1024*1024)
run1: {"exitCode":null,"stderr":"ALIVE-no-callback","codes":"none"}
run2: {"exitCode":null,"stderr":"ALIVE-no-callback","codes":"none"}
run3: {"exitCode":null,"stderr":"ALIVE-no-callback","codes":"none"}

# Bun (đúng runtime omp ship) — cùng child, cùng kịch bản
run1: {"exitCode":0,"stderr":"CB null\nALIVE-no-callback","codes":"none"}
run2: {"exitCode":0,"stderr":"CB null\nALIVE-no-callback","codes":"none"}
run3: {"exitCode":0,"stderr":"CB null\nALIVE-no-callback","codes":"none"}
```

Đọc kết quả:

- **Bun**: callback ghi **có chạy**, với `err === null`. Bun buffer trong userspace rồi báo thành
  công. Không error event, không mã lỗi, không throw đồng bộ. 3/3.
- **Node**: callback ghi **không bao giờ chạy**, process sống, không error event. 3/3.

Hệ quả trực tiếp, theo từng dòng của hình dạng code trong work item:

| Dòng trong work item | Thực tế |
| --- | --- |
| `isRetryable(err)` đọc `err.code` | Không bao giờ có `err` để đọc. Trên Bun `err` là `null`; trên Node callback không gọi. |
| `retryLoop` / `MAX_ATTEMPTS = 500` | **Dead code.** Không có đường vào. |
| `if (!isRetryable(err) \|\| attempt >= MAX_ATTEMPTS) throw err` | Không bao giờ chạy. Đây là "assertion dễ bị bỏ sót nhất" trong work item — và nó không chỉ dễ bị bỏ sót, nó **vô nghĩa**. |
| Hợp đồng test (1) `'retries a write that fails once with ENOBUFS…'` | Test xanh, chứng minh một nhánh không tồn tại. Đúng loại mà `AGENTS.md` cấm. |
| Hợp đồng test (2) `'spreads a non-retryable write failure…'` | Cùng vấn đề: `EPERM` cũng không tới được qua callback. |

**Failure mode thật của một reader bị treo KHÔNG phải "mã lỗi sai" — nó là promise không bao giờ
settle.** Trên Node, `writeStdoutLine` (`print-mode.ts:138-147`) tạo ra một promise treo vĩnh viễn,
`stdoutTail` không bao giờ settle, và drain fence `await stdoutTail;` tại `print-mode.ts:348`
**treo vĩnh viễn**. Đây chính là "omp treo vô hạn" mà hợp đồng (2) tuyên bố sẽ ngăn — nhưng code
hiện tại **đã** treo, và `MAX_ATTEMPTS` không sửa được, vì không có lỗi nào để bắt.

**Deliverable đúng của W13, sau khi nhánh này đã được trả lời: chỉ phần GOM về một chỗ. KHÔNG có
vòng lặp retry.** Đây đúng là nhánh mà bước 1 của work item đã viết sẵn để rẽ vào.

### Chặn cứng thứ hai, phát sinh từ phát hiện trên

Dòng changelog work item bắt dán —
`Fixed structured stdout output being truncated or dropped when a client stops reading (issue #7635)`
— **không được dán.** Không có gì được sửa. Hành vi `#7635` đã được `print-mode-json-flush.test.ts:94`
bảo vệ và đã đúng từ trước; W13 không đổi nó. Dán dòng đó là một tuyên bố với người dùng về một bug
đã không còn. Ba lựa chọn trung thực, chọn một:

1. **Không thêm changelog** (khuyến nghị). Đây là refactor thuần, `AGENTS.md` § Changelog nói
   entry phải "lead with what the user will see" — người dùng không thấy gì.
2. Ghi dưới `### Changed`, hướng người dùng nhưng không hứa sửa bug:
   `Changed structured stdout handling to route every mode through one shared guard.`
3. Chỉ khi bạn tìm được một repro cắt dòng **thật** thì mới viết `### Fixed`, và dán issue id
   của repro đó — không phải #7635, không phải #10930.

### Chặn cứng thứ ba

Nếu sau khi gom xong bạn vẫn muốn xử lý "reader treo ⇒ treo vĩnh viễn", thứ cần là **deadline trên
fence**, không phải retry theo mã lỗi: `flushRawStdout()` phải race `Promise.race([#tail,
Bun.sleep(DEADLINE_MS)])`, và khi hết hạn thì log + đi tiếp (frame đó không cứu được — nhưng
process không nên treo). Đó là một work item riêng, có repro riêng, và **không nằm trong W13**.

---

## 1. Cái gì thay đổi, quan sát được

Không có gì thay đổi với người dùng. W13 là **refactor thuần**: `isolateProtocolStdout()` ở
`acp-mode.ts:43` và `stdoutTail`/`writeStdoutLine` ở `print-mode.ts:137-147` — hai bản cài đặt
riêng của cùng một ý — được rút vào một `packages/coding-agent/src/utils/stdout-guard.ts`, và
`stdout` mà `omp acp` dùng làm transport JSON-RPC giờ nằm sau một guard có đường hoàn tác thay vì
một hàm không đường lui. Không có byte nào thay đổi trên stdout của bất kỳ mode nào.

---

## 2. Bảng điểm sửa

Tất cả văn bản "TRƯỚC" dưới đây trích từ file thật tại HEAD `65cc6c1`.

| đường/dẫn | symbol | TRƯỚC (nguyên văn từ file) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:2` | import `inspect` | `import { inspect } from "node:util";` | **xoá hẳn** — `inspect` chỉ dùng ở `formatConsoleArgs` (dòng 68), sau khi hàm đó đi thì import chết |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:43-61` | `isolateProtocolStdout` | `function isolateProtocolStdout(): NodeJS.WriteStream {` … `return protocolStdout;` `}` (19 dòng) | **xoá hẳn**; thân hàm chuyển sang `stdout-guard.ts` thành `takeOverStdout()` |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:63-71` | `formatConsoleArgs` | `function formatConsoleArgs(args: unknown[]): string {` … `}` (9 dòng) | **xoá khỏi đây**, chuyển **nguyên văn** sang `stdout-guard.ts` |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:40-42, 44-48, 56-57` | 3 khối comment giải thích | xem Mục 3 bước 3 | **chuyển theo** sang `stdout-guard.ts` cùng thân hàm. Đừng để lại ở `acp-mode.ts`, cũng đừng xoá. |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:89` | call site trong `runAcpMode` | `const input = stream.Writable.toWeb(isolateProtocolStdout());` | `const input = stream.Writable.toWeb(takeOverStdout());` |
| `packages/coding-agent/src/modes/acp/acp-mode.ts` (mới) | import | — | `import { takeOverStdout } from "../../utils/stdout-guard";` — đặt giữa dòng 6 và 7 (sau `../../session/agent-session`, trước `./acp-agent`) |
| `packages/coding-agent/src/modes/print-mode.ts:131-136` | comment 6 dòng | xem Mục 3 bước 4 | **xoá khỏi đây**, dán vào `stdout-guard.ts` ngay trên `writeRawStdout` (nó là lý do tồn tại của cả khối) |
| `packages/coding-agent/src/modes/print-mode.ts:137-147` | `stdoutTail` + `writeStdoutLine` | `let stdoutTail: Promise<void> = Promise.resolve();` … `};` (11 dòng) | **xoá hẳn** |
| `packages/coding-agent/src/modes/print-mode.ts:153` | call site header | `writeStdoutLine(\`${JSON.stringify(header)}\n\`);` | `void writeRawStdout(\`${JSON.stringify(header)}\n\`);` |
| `packages/coding-agent/src/modes/print-mode.ts:228` | call site event | `writeStdoutLine(\`${JSON.stringify(printableEvent(event))}\n\`);` | `void writeRawStdout(\`${JSON.stringify(printableEvent(event))}\n\`);` |
| `packages/coding-agent/src/modes/print-mode.ts:324` | call site text | `writeStdoutLine(\`${sanitizeText(content.text)}\n\`);` | `void writeRawStdout(\`${sanitizeText(content.text)}\n\`);` |
| `packages/coding-agent/src/modes/print-mode.ts:326` | call site thinking | `writeStdoutLine(\`${sanitizeText(content.thinking)}\n\`);` | `void writeRawStdout(\`${sanitizeText(content.thinking)}\n\`);` |
| `packages/coding-agent/src/modes/print-mode.ts:345-348` | comment 3 dòng + drain fence | `await stdoutTail;` | comment 345-347 **giữ nguyên tại chỗ** (nó mô tả fence của print-mode, không thuộc về guard); dòng 348 → `await flushRawStdout();` |
| `packages/coding-agent/src/modes/print-mode.ts` (mới) | import | — | `import { flushRawStdout, writeRawStdout } from "../utils/stdout-guard";` — đặt sau dòng 16 (`../telemetry-export`), trước dòng 17 (`./persistence-failure`) |
| `packages/coding-agent/src/utils/stdout-guard.ts` | **tạo mới** | file không tồn tại | 4 export: `isStdoutTakenOver()`, `takeOverStdout()`, `writeRawStdout()`, `flushRawStdout()`. KHÔNG retry loop (Mục 0). |
| `packages/coding-agent/test/stdout-guard.test.ts` | **tạo mới** | file không tồn tại | 1 test (Mục 5) |
| `packages/coding-agent/CHANGELOG.md` | `### Fixed` | `[Unreleased]` đang có `### Security` ở dòng 5 và 1 entry ở dòng 7 | Theo Mục 0: hoặc không thêm gì, hoặc `### Changed` sau dòng 7 |
| `packages/coding-agent/src/modes/rpc/rpc-output.ts` | `RpcOutputWriter` | 162 dòng | **không đụng** |

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

### Bước 1 — Xác nhận lại nhánh "không retry"

Chạy lại probe của Mục 0 một lần nữa trên máy của bạn để chắc chắn (copy y hệt
`/tmp/child-writer.mjs` + `/tmp/enobufs-probe-bun.mjs` ở Mục 0). Nếu vẫn `CB null` ×3, đi tiếp
**không có `retryLoop`**.

*Neo:* `packages/coding-agent/src/modes/print-mode.ts:348` — dòng `await stdoutTail;` (đã mở đọc:
đây là fence hiện tại mà `flushRawStdout()` sẽ thay).

### Bước 2 — Tạo `packages/coding-agent/src/utils/stdout-guard.ts`

`packages/coding-agent/src/utils/` tồn tại, 45 file. Import top-level:

```typescript
import * as stream from "node:stream";
import { inspect } from "node:util";
```

Cả hai đều đã có ở `acp-mode.ts:1` và `acp-mode.ts:2` (đã mở đọc).

`stdout-guard.ts` cần đủ nội dung sau — **viết tay, không port từ `pi-ref`** (nguồn port có thật,
xem Mục 7 neo #8, nhưng hình dạng khác; so bảng ở Mục 7):

```typescript
let #tail: Promise<void> = Promise.resolve();
let #undoTakeover: (() => void) | undefined;

export function isStdoutTakenOver(): boolean {
	return #undoTakeover !== undefined;
}

export function takeOverStdout(): NodeJS.WriteStream { /* thân từ acp-mode.ts:43-61 */ }

export function writeRawStdout(text: string): Promise<void> {
	#tail = #tail.then(() => writeOnce(text));
	return #tail;
}

function writeOnce(text: string): Promise<void> {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	process.stdout.write(text, err => {
		if (err) reject(err);
		else resolve();
	});
	return promise;
}

export function flushRawStdout(): Promise<void> {
	return #tail;
}
```

Ba khối comment bắt buộc chuyển theo (nguyên văn, xem Mục 3 bước 3 và 4 cho nội dung đầy đủ):
`:40-42`, `:44-48`, `:56-57` của `acp-mode.ts` và `:131-136` của `print-mode.ts`.

Quy tắc cứng (`AGENTS.md`): không `any`, không `ReturnType<>`, field `#`, không inline import,
`Promise.withResolvers()` không `new Promise()`, không `Bun.sleep` (không còn retry nên không
cần delay), không `console.*` ngoài cái rebind console của takeover.

*Neo:* `packages/coding-agent/src/modes/acp/acp-mode.ts:40` — dòng `/**` mở JSDoc
`Redirects stray stdout traffic to stderr…` (đã mở đọc; work item ghi `:44-52`, xem Mục 7).

### Bước 3 — Thay `isolateProtocolStdout()` bằng `takeOverStdout()`

Xoá `acp-mode.ts:43-61` và `:63-71`. Thêm import ở giữa dòng 6 và 7. Đổi call site dòng 89.

Ba khối comment phải chuyển theo thân hàm, nguyên văn:

```
:40-42  /**
        :  * Redirects stray stdout traffic to stderr so it can never corrupt the JSON-RPC channel.
        :  */

:44-48      // fd 1 is the JSON-RPC transport — the same invariant rpc-mode guards by
            // suppressing notifications. Extensions, dependencies, and console.log all
            // target process.stdout; a single OSC title or BEL spliced into the stream
            // desyncs frame parsing and the client times out. Capture the real stdout
            // for the transport, then detour every other writer to stderr.

:56-57      // Node's bootstrap console bound to the original stdout object; rebind so
            // extension console.log calls are detoured away from fd 1 as well.
```

*Neo:* `packages/coding-agent/src/modes/acp/acp-mode.ts:89` —
`const input = stream.Writable.toWeb(isolateProtocolStdout());` (đã mở đọc, đúng nội dung).

Kiểm tra sau khi sửa: `import * as stream from "node:stream"` **vẫn phải còn** — dòng 89 và 90 vẫn
dùng nó (`stream.Writable.toWeb`, `stream.Readable.toWeb`). Xoá nhầm là `check:ts` đỏ ngay.

### Bước 4 — Cho print-mode dùng chung

Xoá `print-mode.ts:137-147`. Bốn call site `:153` `:228` `:324` `:326` đổi thành
`void writeRawStdout(...)`. Dòng 348 đổi thành `await flushRawStdout();`. Comment `:131-136`
chuyển sang `stdout-guard.ts`; comment `:345-347` **ở lại**.

*Neo:* `packages/coding-agent/src/modes/print-mode.ts:137` —
`let stdoutTail: Promise<void> = Promise.resolve();` (đã mở đọc, đúng nội dung).

### Bước 5 — Đừng đụng `rpc-output.ts`

`RpcOutputWriter` dùng disk spool, nghe `drain`, `process.once("exit")` dọn spool, `AggregateError`
khi vừa fail vừa hỏng cleanup. Mạnh hơn bản ở bước 2. Thay nó là viết lại đường production đang
chạy. Chỉ ghi lại thành work item hội tụ sau milestone.

*Neo:* `packages/coding-agent/src/modes/rpc/rpc-output.ts:17` —
`export class RpcOutputWriter {` (đã mở đọc; file 162 dòng, class kết thúc ở 162).

### Bước 6 — Viết `packages/coding-agent/test/stdout-guard.test.ts`

**MỘT test, không phải ba.** Xem Mục 5 để biết vì sao hai test còn lại bị bỏ.

*Neo:* `packages/coding-agent/test/print-mode-json-flush.test.ts:15` —
`import { afterEach, describe, expect, it, vi } from "bun:test";` (đã mở đọc; import mẫu để copy).

### Bước 7 — Cổng

Xem Mục 6.

---

## 4. Cạm bẫy riêng của work item này

1. **`void` trên promise không nuốt rejection.** `void writeRawStdout(x)` ở 4 call site của
   print-mode: nếu write reject (pipe đã đóng), đó là **unhandled rejection** — Bun test sẽ đỏ
   cả file, và production sẽ in `[Uncaught Exception]`. `writeStdoutLine` cũ trả `void` nhưng
   promise của nó **luôn được ai đó await** (chính là `await stdoutTail` ở `:348`). Sau khi tách
   ra module-level `#tail`, không còn gì await từng write. Phải tự xử lý: hoặc `writeRawStdout`
   tự nuốt lỗi và ghi vào `#failure` để `flushRawStdout()` rethrow một lần, hoặc giữ
   `void` nhưng phải chắc `#tail` luôn resolve. Đừng chỉ copy `void` từ work item.

2. **`#tail` bị đầu độc vĩnh viễn sau một lần reject.** `#tail = #tail.then(...)` — nếu `#tail`
   reject một lần thì mọi `.then` sau đó đều bị bỏ qua và lỗi cũ lan xuống mọi lần ghi về sau.
   Đây là hành vi giống hệt `stdoutTail` cũ, nhưng ở bước 2 nó trở thành **module-level state**
   nên sống lâu hơn nhiều: một test file gọi `writeRawStdout` và để reject sẽ làm hỏng mọi
   test sau trong cùng run. Cần nuốt lỗi ngay tại chỗ gán (`#tail.catch(() => {})` cho nhánh
   riêng) và để `flushRawStdout()` rethrow đúng một lần.

3. **Takeover không tự thu hồi, và `takeOverStdout()` ném nếu gọi hai lần.** Trong production
   `runAcpMode` gọi đúng một lần và không bao giờ gọi undo ⇒ `#undoTakeover` ở lại `defined` tới
   hết process. Lần gọi thứ hai sẽ ném `stdout is already taken over`. Hôm nay chưa có lần gọi
   thứ hai nào (`runAcpMode` chỉ được gọi từ `main.ts:2200-2202`, và `acp-lazy-startup.test.ts`
   mock nó), nhưng đó là **tương lai**, không phải bảo đảm. Cân nhắc idempotent-then-throw hoặc
   trả về undo ngay.

4. **`print-mode.ts` chạy SAU takeover trong cùng process sẽ ghi vào stderr.** `writeRawStdout`
   ghi `process.stdout`; nếu một test khác trong cùng run còn takeover treo, mọi output của
   print-mode đi thẳng vào stderr và **không test nào đỏ**. Đây là lý do gate C (full suite) tồn
   tại, và cũng là lý do `afterEach` trong test mới phải gọi undo.

5. **`check:ts` kiểm CẢ format, không chỉ types.** `check:ts` =
   `bun run check:tools && bun run --filter './packages/*' … check:types`, mà `check:tools` =
   `oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' …`.
   File mới dùng **tab, tabWidth 3, printWidth 120, double quotes, trailing comma, semi, arrow
   parens avoid** (`.oxfmtrc.json`). Copy bằng cách **paste** nguyên text trong file cũ, đừng
   gõ lại. Hoặc chạy `bun run fmt:tools` một lể trước khi chạy cổng A.

6. **Xoá `import { inspect }` là bắt buộc, không phải tuỳ chọn.** `AGENTS.md` cấm import chết và
   `oxlint` sẽ báo `no-unused-vars`. Chỉ dùng `inspect` ở `acp-mode.ts:68`, tức là bên trong
   `formatConsoleArgs` — xoá hàm là import chết ngay.

7. **Đừng để lại comment ở chỗ cũ.** Comment ở `acp-mode.ts:40-48` và `print-mode.ts:131-136` là
   tài liệu về lý do. Nếu bạn xoá hàm mà comment ở lại, người đọc sau thấy comment giải thích
   một hàm không còn. Chuyển theo, đừng xoá và đừng bỏ lại.

---

## 5. Hợp đồng test

`packages/coding-agent/test/stdout-guard.test.ts` — **MỘT test.**

Import: `import { afterEach, describe, expect, it, vi } from "bun:test";` (mẫu từ
`print-mode-json-flush.test.ts:15`).

**Test duy nhất — `'takeOverStdout returns an undo that restores process.stdout and console.log'`.**
Lưu `const original = process.stdout;` và `const originalLog = console.log;`, gọi
`takeOverStdout()`, assert `isStdoutTakenOver()` là `true` và `process.stdout` **khác identity**,
rồi gọi undo, assert `process.stdout` và `console.log` trở lại **đúng identity gốc** và
`isStdoutTakenOver()` là `false`.

`afterEach(() => { vi.restoreAllMocks(); })`, và gọi undo trong `afterEach` nếu test nào takeover
còn treo. Tuyệt đối không `Object.defineProperty(process, 'stdout', …)`, không `mock.module()`,
không mutate `process.*` ở cấp file (`AGENTS.md` § Testing: `mock.module()` rò rỉ toàn cục).

**Nếu hồi quy:** takeover rò rỉ ⇒ mọi stdout write sau đó bám vào stderr, và phần còn lại của
suite im lặng mất output mà **không dòng nào đỏ**. Đây là consumer thật: **mọi file test chạy
sau trong cùng run**.

### Hai test còn lại trong work item — đã bỏ, và vì sao

| Test trong work item | Trạng thái | Lý do |
| --- | --- | --- |
| `'retries a write that fails once with ENOBUFS and delivers the frame in full'` | **BỎ** | `ENOBUFS` không tới được (Mục 0, đo 3/3 trên Bun). Test sẽ xanh và chứng minh một nhánh không tồn tại. `AGENTS.md`: "No placeholder tests, tautologies, or 'the code ran' assertions." |
| `'spreads a non-retryable write failure instead of retrying forever'` | **BỎ** | Cùng lý do cho `EPERM` qua callback. Và sau khi bỏ retry loop thì hàm viết không còn nhánh "retry forever" để bảo vệ. Test bảo vệ một thứ vừa bị xoá. |

### Không viết lại những test này

- `'stray console.log đi tới stderr'` — đã có ở `acp-stdout-hygiene.test.ts:86` (spawn thật
  `omp acp`, assert byte đầu tiên trên stdout parse được thành JSON-RPC). File 191 dòng, 1 test.
  **Giữ nguyên.**
- `'drain fence resolve sau tail'` — đã có ở `print-mode-json-flush.test.ts:94` (regression
  #7635, giữ callback write `agent_end` 1.5MB). File 153 dòng, 1 test. **Giữ nguyên.**
- Đây chính là test bằng chứng cho **bước 4** (print-mode), không phải cho bước 2.

### Phải xanh sau khi sửa

`acp-stdout-hygiene.test.ts` (1) · `print-mode-json-flush.test.ts` (1) · `rpc-output.test.ts` (5,
ở `:13` `:72` `:107` `:121` `:137`) · `cli-stdout-epipe.test.ts` (1, `it.skipIf(process.platform
=== "win32")` tại `:21`). Tổng 8 — đã đo **8 pass / 0 fail** trước khi sửa.

---

## 6. Cổng

### Lệnh

```bash
bun run check:ts

bun test packages/coding-agent/test/stdout-guard.test.ts

bun test \
  packages/coding-agent/test/acp-stdout-hygiene.test.ts \
  packages/coding-agent/test/print-mode-json-flush.test.ts \
  packages/coding-agent/test/rpc-output.test.ts \
  packages/coding-agent/test/cli-stdout-epipe.test.ts

bun run test
```

Không bao giờ dùng `tsc` — `AGENTS.md` cấm.

### Cổng này có đỏ được không? — CÓ, cả ba, và ngay bây giờ

**Đính chính quan trọng so với work item:** work item nói cổng *"HIỆN KHÔNG CHẠY ĐƯỢC"* vì
native addon chưa build (`0 pass / 1 fail / 1 error`, `Failed to load pi_natives native addon for
darwin-arm64`). **Điều đó đã không còn đúng.** Addon đã build (`packages/natives/native/.build/`
tồn tại). Tôi đã chạy thử ở HEAD `65cc6c1`:

| Cổng | Trạng thái đo được hôm nay | Đỏ được bằng cách nào |
| --- | --- | --- |
| **A.** `bun run check:ts` | **PASS** (~90s). `oxlint` chỉ có 1 warning có sẵn ở `mcp-project-config-not-trusted-by-default.test.ts:19`; `oxfmt --check` "All matched files use the correct format"; 16 package `check:types` đều Done. | Import chết còn lại (`inspect`), sai chữ ký, hoặc **sai format** — vì `check:ts` chạy `oxlint` + `oxfmt --check` TRƯỚC khi check types. Cạm bẫy #5. |
| **B.** 4 file hồi quy | **8 pass / 0 fail / 33 expect()** (9.16s) | Bước 3 phá ACP hygiene (suy ra `stream` import chết, hoặc takeover không còn detour console) hoặc bước 4 phá drain fence #7635. |
| **B′.** file test mới | 1 test, chưa tồn tại | Undo không khôi phục đúng identity, hoặc takeover rò giữa các test trong file. |
| **C.** `bun run test` toàn suite | **CHƯA CHẠY** (quá dài cho phiếu này) | Takeover rò ⇒ stdout của các file chạy sau bám vào stderr, không dòng nào đỏ. Đây là thứ **duy nhất** bắt được lỗi đó. |

**B không đủ.** 4 file hồi quy đó có thể xanh trong khi một file thứ 6 chạy sau nhận stdout đã bị
rebind. Chỉ C chứng minh được takeover không rò. Nếu thời gian không cho chạy full suite thì
**ghi rõ W13 là CHƯA xác minh** ở PR, đừng báo xanh.

---

## 7. Neo hỏng — ghi ra, không sửa trong tài liệu

11 neo trong work item không khớp cây thật. Danh sách đầy đủ:

| # | Work item ghi | Thực tế | Ảnh hưởng |
| --- | --- | --- | --- |
| 1 | `acp-mode.ts:43-63` = `isolateProtocolStdout` | `:43-61`. Dòng 62 trống, 63 là `formatConsoleArgs` | Xoá 2 dòng quá → cắt đầu hàm kế |
| 2 | `acp-mode.ts:65-72` = `formatConsoleArgs` | `:63-71` | Copy nhầm 2 dòng lệch |
| 3 | "Giữ nguyên comment tại `:44-52`" | Comment là `:44-48`; `:49-52` là code. Thêm nữa có comment thứ hai ở `:56-57` mà work item **không nhắc** | Bỏ sót comment `:56-57` = mất giải thích vì sao phải rebind `console.log` |
| 4 | `print-mode.ts:130-135` = comment | Comment là `:131-136`; dòng 130 trống | Lệch 1 dòng |
| 5 | "Giữ nguyên comment tại `:130-135` — nó nhắc issue #5309/#7635" | Đúng nội dung, nhưng work item **không nhắc** comment thứ hai ở `:345-347` giải thích drain fence | Dễ xoá nhầm comment của fence |
| 6 | `CHANGELOG.md:3` — "`## [Unreleased]` … **hiện đang rỗng**" | Dòng 3 đúng là `## [Unreleased]`, nhưng nó **không rỗng**: có `### Security` ở dòng 5 và 1 entry ở dòng 7. Dán thẳng sẽ đặt `### Fixed` sai chỗ | Sai vị trí entry |
| 7 | `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:1680-1743` = "work item" W13 | Dải đó là work item **approval mode / bash critical patterns** (bước 7-13: `approval.test.ts:834`, `docs/approval-mode.md:64`). W13 thật nằm ở **`:3055-3283`**; phần tóm tắt Wave 2 ở **`:453`** | Đọc nhầm tài liệu |
| 8 | "`ls -d pi-ref` → không có; `find . -name 'output-guard*'` → rỗng. **Viết tay từ đầu.**" | **SAI.** Cả hai tồn tại: `/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/output-guard.ts`, **108 dòng**. Chỉ sai vì tìm trong `ultraworkers/` thay vì cây anh em. | Mất buổi sáng tìm file có thật. Và khi đọc file thật sẽ thấy hình dạng **khác** hình dạng work item vẽ ra (xem dưới) |
| 9 | Mọi `:1691-1693`, `:1699-1702`, `:1707-1708`, `:1719-1724`, `:1730`, `:1691-1694` trong bảng "Đính chính" | Trỏ vào work item approval, không phải W13 | Bảng đính chính tự trích dẫn sai dòng |
| 10 | "HEAD thật của repo này là `ecd516f`" | HEAD hôm nay là **`65cc6c1`** ("test(coding-agent): opt in explicitly where the suite is about parsing") | Mốc tra cứu sai |
| 11 | "**Cổng HIỆN KHÔNG CHẠY ĐƯỢC**… native addon chưa build" | Đã build. `bun test rpc-output.test.ts` → **5 pass / 0 fail**; 4 file hồi quy → **8 pass / 0 fail** | Đánh giá nhầm W13 là không verify được |

### Sai lệch hình dạng giữa `pi-ref/output-guard.ts` thật và bản work item vẽ ra

Nếu bạn vẫn muốn tham chiếu file 108 dòng, đừng port trực tiếp — 6 chỗ khác:

| `pi-ref` (thật) | work item vẽ |
| --- | --- |
| `takeOverStdout(): void` (dòng 45) | `takeOverStdout(): NodeJS.WriteStream` |
| `restoreStdout()` là export riêng (dòng 72) | undo qua module state `#undoTakeover` |
| Monkey-patch `process.stdout.write` (dòng 54-63) | `Object.defineProperty(process, "stdout", …)` như `acp-mode.ts:55` |
| `writeRawStdout(text): void` + `process.exit(1)` khi lỗi (dòng 85-93) | `writeRawStdout(text): Promise<void>` |
| `writeRawStdoutChunk` có `while (true)` **không chặn trên** (dòng 21-43) | `MAX_ATTEMPTS = 500` |
| Dùng `new Promise` + `setTimeout` (dòng 23, 40) | `Promise.withResolvers()` + `Bun.sleep` |

Hai cơ chế takeover cũng khác nhau về hệ quả: `pi-ref` chặn ở **tầng `write`**, còn
`acp-mode.ts:55` chặn ở **tầng `process.stdout`**. Call site duy nhất trong cây là
`acp-mode.ts:89`, nên lấy cơ chế của `acp-mode.ts` là an toàn hơn — `pi-ref` thêm
`waitForRawStdoutBackpressure()` (dòng 95) mà không call site nào ở omp cần.

---

## 8. Đã kiểm, đúng, dùng được

| Neo | Nội dung thật tại dòng đó |
| --- | --- |
| `acp-mode.ts:43` | `function isolateProtocolStdout(): NodeJS.WriteStream {` |
| `acp-mode.ts:89` | `const input = stream.Writable.toWeb(isolateProtocolStdout());` |
| `acp-mode.ts:1-2`, `:2`, `:5-6` | `import * as stream from "node:stream";` / `import { inspect } from "node:util";` / nhóm import `../../` |
| `acp-mode.ts:50`, `:90` | `new stream.Writable({` / `stream.Readable.toWeb(process.stdin)` — chứng minh import `stream` phải giữ |
| `print-mode.ts:137` | `let stdoutTail: Promise<void> = Promise.resolve();` |
| `print-mode.ts:138` | `const writeStdoutLine = (text: string): void => {` |
| `print-mode.ts:153` | `writeStdoutLine(\`${JSON.stringify(header)}\n\`);` |
| `print-mode.ts:228` | `writeStdoutLine(\`${JSON.stringify(printableEvent(event))}\n\`);` |
| `print-mode.ts:324` | `writeStdoutLine(\`${sanitizeText(content.text)}\n\`);` |
| `print-mode.ts:326` | `writeStdoutLine(\`${sanitizeText(content.thinking)}\n\`);` |
| `print-mode.ts:348` | `await stdoutTail;` |
| `rpc-output.ts:17-162` | `export class RpcOutputWriter {` … `}` — 162 dòng, có `drain`/`error`/`close`/`process.once("exit")` |
| `rpc-mode.ts:780` | `const outputWriter = new RpcOutputWriter(process.stdout, failure => {` |
| `postmortem.ts:356` | `export function registerStdioDisconnectHandling(): () => void {` |
| `acp-stdout-hygiene.test.ts:86` | `it("emits a JSON-RPC initialize response as the first bytes on stdout", …)` — 191 dòng, 1 test |
| `print-mode-json-flush.test.ts:94` | `it("blocks exit until the final agent_end write drains, then delivers it in full", …)` — 153 dòng, 1 test |
| `print-mode-json-flush.test.ts:98` | `vi.spyOn(process.stdout, "write").mockImplementation((...args: unknown[]) => {` |
| `print-mode-json-flush.test.ts:15` | `import { afterEach, describe, expect, it, vi } from "bun:test";` |
| `rpc-output.test.ts:13,72,107,121,137` | 5 `it(...)` — đếm đủ, không thừa |
| `cli-stdout-epipe.test.ts:6` | `// Regression for #10930: a one-shot CLI run whose stdout consumer closes before` |
| `cli-stdout-epipe.test.ts:21` | `it.skipIf(process.platform === "win32")(`, 1 test |
| `package.json:84` | `"build:native": "bun --cwd=packages/natives run build"` |
| `package.json:85` | `"test": "bun scripts/ci-test-ts.ts local"` |
| `package.json:89` | `"check": "bun run --parallel check:ts check:rs"` — xác nhận work item nói đúng khi cấm `bun check` |
| `package.json:90-91` | `check:ts` = `check:tools && … check:types`; `check:tools` = `oxlint . && oxfmt --check …` |
| `package.json:523` | `"check:types": "tsgo -p tsconfig.json --noEmit"` trong `packages/coding-agent/package.json` |
| `src/commit/agentic/index.ts` | 31 lệnh `process.stdout.write` — đúng số work item ghi |
| `src/commit/agentic/agent.ts` / `commit/pipeline.ts` / `commit/execute.ts` / `commit/cli.ts` | 7 / 6 / 1 / 1 — đúng |
| `src/cli/auth-broker-cli.ts` / `src/cli/ttsr-cli.ts` | 34 / 29 — đúng |
| `packages/coding-agent/src/` | 274 lệnh `process.stdout.write` — đúng |
| `otel-export-probe.ts` / `otel-non-otlp-probe.ts` / `otel-resource-probe.ts` / `otel-signals-probe.ts` | cả 4 tồn tại ở `packages/coding-agent/test/` |
| `packages/coding-agent/src/utils/` | tồn tại, 45 file |
| `packages/coding-agent/test/` | tồn tại, 843 mục |
| `src/utils/stdout-guard.ts`, `test/stdout-guard.test.ts` | **không tồn tại** (đúng như work item nói) |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:453` | dòng tóm tắt Wave 2 cho W13 — `:512` (work item dùng) là "Điều kiện tiên quyết / Bốn thứ, theo thứ tự", không liên quan |

---

## 9. Phụ thuộc và việc cần người quyết

**Phụ thuộc:** không có phụ thuộc code. Có thể làm song song W2. Chỉ cần chạy full suite một lần
sau khi cả hai land.

**Cần người quyết trước khi gõ:**

1. **Chốt phạm vi changelog** (Mục 0, chặn cứng thứ hai). Khuyến nghị: không thêm entry.
2. **Xác nhận "không có retry loop"** sau khi đọc Mục 0. Nếu vẫn muốn giữ `MAX_ATTEMPTS` vì lý do
   chính sách nào đó, thì phải nói rõ trong PR rằng nhánh đó không có repro — và không viết test
   giả cho nó.
3. **Có làm deadline cho fence không** (Mục 0, chặn cứng thứ ba). Khuyến nghị: không, tách work
   item riêng, vì nó cần repro riêng và `print-mode-json-flush.test.ts` sẽ phải đổi.
4. **Cách xử lý rejection của `#tail`** (Cạm bẫy #1, #2). Đây là quyết định thiết kế thật, không
   có sẵn trong work item.
