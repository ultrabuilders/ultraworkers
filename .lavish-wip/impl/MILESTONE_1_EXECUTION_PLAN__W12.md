# PHIẾU TRIỂN KHAI — W12. Tuần tự hoá các thay đổi file đồng thời theo realpath

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md` (mục `## W12.`, dòng 2441)
**Repo đích:** `/Users/tranquangdang21/Projects/ultraworkers`
**HEAD khi viết phiếu:** `65cc6c1` — `test(coding-agent): opt in explicitly where the suite is about parsing`
**Bản tham chiếu:** `$HOME/Projects/pi-ref/packages/coding-agent/src/core/tools/file-mutation-queue.ts` (61 LOC, đã đọc; `senpi-ref` là mirror, cùng nội dung)

> Phiếu này KHÔNG sửa bất kỳ file kế hoạch nào. Mọi sai lệch giữa work item và cây thật được ghi ở **Phụ lục A**.

---

## 1. Cái gì thay đổi, quan sát được

Hai mutation ghi/xoá cùng một file từ hai tiến trình con (hoặc hai session) trong cùng một lượt không còn xen kẽ nữa — mutation thứ hai chờ mutation thứ nhất rồi áp dụng lên trạng thái sau đó, thay vì đè hoặc cắt đứt byte của nhau; mutation trên hai file **khác nhau** vẫn chạy đồng thời, nên không có hồi quy độ trễ nào đo được.

---

## 2. Bảng điểm sửa

TRƯỚC được trích nguyên văn từ file thật ở HEAD `65cc6c1`.

| path | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/utils/file-mutation-queue.ts` | *(file mới)* | **không tồn tại** | `export async function withFileMutationQueue<T>(filePath: string, fn: () => Promise<T>): Promise<T>` + `getMutationQueueKey` + `isMissingPathError`; `Map` module-level + `registrationQueue` |
| `packages/coding-agent/src/tools/file-write-fallback.ts:402` | `writeFileWithFallback` | `export async function writeFileWithFallback(dst: string, content: string, file?: BunFile): Promise<void> {`<br>`	// Attempt 0 is the plain write. The single retry is reachable only when the`<br>`	for (let attempt = 0; ; attempt++) {` | `export async function writeFileWithFallback(dst: string, content: string, file?: BunFile): Promise<void> {`<br>`	return withFileMutationQueue(dst, async () => {`<br>`		// …toàn bộ thân cũ, thụt 1 tab…`<br>`		for (let attempt = 0; ; attempt++) { … }`<br>`	});`<br>`}` — vòng `fallbackHandlers` **giữ nguyên**, không thu gọn |
| `packages/coding-agent/src/tools/file-write-fallback.ts:305` | `deleteFileWithFallback` | `export async function deleteFileWithFallback(dst: string, file?: BunFile): Promise<void> {`<br>`	try {`<br>`		if (file) {`<br>`			await file.unlink();`<br>`		} else {`<br>`			await fs.unlink(dst);` | `export async function deleteFileWithFallback(dst: string, file?: BunFile): Promise<void> {`<br>`	return withFileMutationQueue(dst, async () => {`<br>`		try { … } catch (error) { … }`<br>`	});`<br>`}` — toàn bộ `try/catch` + vòng `deleteFallbackHandlers` nằm trong callback |
| `packages/coding-agent/src/tools/file-write-fallback.ts` (import) | *(import mới)* | file không import gì từ `../utils/` | `import { withFileMutationQueue } from "../utils/file-mutation-queue";` |
| `packages/coding-agent/src/tools/ast-edit.ts:433` | `runAstEditOnce(…, { dryRun: false })` (đường apply) | `						const applyResult = await runAstEditOnce(multiTargets, resolvedSearchPath, globFilter, {`<br>`							rewrites: normalizedRewrites,`<br>`							dryRun: false,` | `const applyResult = await withFileMutationQueue(resolvedSearchPath, () =>`<br>`	runAstEditOnce(multiTargets, resolvedSearchPath, globFilter, { …dryRun: false… }),`<br>`);` — khoá theo **phạm vi đã resolve**, xem Mục 3 bước 6 |
| `packages/coding-agent/src/tools/ast-edit.ts` (import) | *(import mới)* | không có | `import { withFileMutationQueue } from "../utils/file-mutation-queue";` |
| `packages/coding-agent/test/tools/file-mutation-queue.test.ts` | *(file mới)* | **không tồn tại** | 5 `it` trong 1 `describe`, `bun:test`, `node:fs/promises` + `os.tmpdir()` + `fs.mkdtemp` |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` | `## [Unreleased]`<br>`### Security`<br>`- Project-scope MCP config … re-enable it per project.` | Thêm mục `### Fixed` **mới** (chưa tồn tại) đặt **sau** `### Security`, trước `## [18.4.0]`, với một dòng hướng người dùng |

### 2b. Chữ ký `file-mutation-queue.ts` — dán nguyên văn, không sửa một ký tự

Bản dưới đây là port từ bản tham chiếu 61 LOC, chỉ khác ở: `Promise.withResolvers` thay cho `new Promise` (theo AGENTS.md), ép kiểu `(error as { code?: unknown }).code` (bản tham chiếu dựa vào narrowing `"code" in error`), và thêm comment giải thích. **Không import gì từ `@oh-my-pi/pi-utils`.**

```typescript
// packages/coding-agent/src/utils/file-mutation-queue.ts
// NOTE: deliberately imports ONLY node builtins. Importing the @oh-my-pi/pi-utils
// barrel here pulls the pi_natives addon, which makes this module's test
// unrunnable in an environment where the addon is not built.
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

const fileMutationQueues = new Map<string, Promise<void>>();
let registrationQueue: Promise<void> = Promise.resolve();

function isMissingPathError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		((error as { code?: unknown }).code === "ENOENT" ||
			(error as { code?: unknown }).code === "ENOTDIR")
	);
}

async function getMutationQueueKey(filePath: string): Promise<string> {
	const resolvedPath = resolve(filePath);
	try {
		return await realpath(resolvedPath);
	} catch (error) {
		if (isMissingPathError(error)) return resolvedPath;
		throw error;
	}
}

/**
 * Serialize file mutation operations targeting the same file.
 * Operations for different files still run in parallel.
 */
export async function withFileMutationQueue<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
	// Registration is itself serialized, so two concurrent key resolutions cannot
	// both read the same tail and both append to it.
	const registration = registrationQueue.then(async () => {
		const key = await getMutationQueueKey(filePath);
		const currentQueue = fileMutationQueues.get(key) ?? Promise.resolve();

		// Two-phase handoff, not tail.then(run).
		const nextQueue = Promise.withResolvers<void>();
		const chainedQueue = currentQueue.then(() => nextQueue.promise);
		fileMutationQueues.set(key, chainedQueue);

		return { key, currentQueue, chainedQueue, releaseNext: nextQueue.resolve };
	});
	// Two-arg form: a plain then() would leave registrationQueue rejected forever
	// after one throw, deadlocking every subsequent mutation.
	registrationQueue = registration.then(
		() => undefined,
		() => undefined,
	);

	const { key, currentQueue, chainedQueue, releaseNext } = await registration;
	await currentQueue;
	try {
		return await fn();
	} finally {
		releaseNext();
		// Identity check: a late finisher must not evict a successor that has
		// already chained onto this entry.
		if (fileMutationQueues.get(key) === chainedQueue) fileMutationQueues.delete(key);
	}
}
```

---

## 3. Các bước

Mỗi neo dưới đây đã được mở và đọc ở HEAD `65cc6c1`. Số dòng ghi kèm là nội dung thật tại dòng đó.

### Bước 1 — Tạo `src/utils/file-mutation-queue.ts`

Dán nguyên văn khối ở **Mục 2b**. Thư mục `packages/coding-agent/src/utils/` tồn tại (45 file) và **không có** `src/utils/index.ts` — import bằng đường dẫn module đầy đủ, không qua barrel.

Tiền lệ `Promise.withResolvers` trong repo: `packages/coding-agent/src/advisor/runtime.ts:454` → `const { promise, resolve } = Promise.withResolvers<boolean>();`

- [ ] File tạo ra có **chỉ** hai import dòng 2-3, không import `@oh-my-pi/*`.
- [ ] Không có `new Promise` trong file. Không có `any`. Không có `ReturnType<>`.

### Bước 2 — Khoá theo realpath (chi tiết 1/3)

`getMutationQueueKey` dán nguyên văn ở Mục 2b. Key = `await realpath(resolve(filePath))`; chỉ fallback về `resolve(filePath)` khi reject với `ENOENT`/`ENOTDIR`; **rethrow mọi lỗi khác** (EACCES, ELOOP). Giữ `getMutationQueueKey` là hàm có tên riêng để nhánh fallback đọc được.

*Vì sao:* key chỉ dùng `resolve` âm thầm không serialize được hai tiến trình đi tới cùng một file qua symlink hoặc qua một đoạn `..`.

### Bước 3 — Tuần tự hoá chính việc đăng ký (chi tiết 2/3)

`let registrationQueue: Promise<void> = Promise.resolve();` ở cấp module. Trong `withFileMutationQueue`, `const registration = registrationQueue.then(async () => { … })`, rồi gán `registrationQueue = registration.then(() => undefined, () => undefined)` **trước khi** await.

*Vì sao:* không có bước này, hai lời gọi `realpath` chạy đồng thời có thể cùng đọc một `currentQueue` và cùng nối vào đuôi nó. Dạng hai tham số `.then(ok, err)` là **bắt buộc** — `.then(() => undefined)` đơn thuần để lại `registrationQueue` ở trạng thái rejected vĩnh viễn và deadlock mọi lời gọi sau đó chỉ vì một lần throw.

### Bước 4 — Bàn giao hai pha, KHÔNG phải `tail.then(run)` (chi tiết 3/3)

Bên trong callback đăng ký: `const nextQueue = Promise.withResolvers<void>()`, `const chainedQueue = currentQueue.then(() => nextQueue.promise)`, set map, trả `{ key, currentQueue, chainedQueue, releaseNext: nextQueue.resolve }`. Sau `await registration`: `await currentQueue`, rồi `try { return await fn(); } finally { releaseNext(); if (fileMutationQueues.get(key) === chainedQueue) fileMutationQueues.delete(key); }`.

- [ ] `releaseNext()` nằm trong `finally`, **không** phải sau `await fn()`.
- [ ] Có kiểm tra danh tính trước khi `delete`.

*Vì sao:* `finally` là thứ khiến một mutation **ném lỗi** vẫn nhả khoá — một chuỗi thuần sẽ kẹt key vĩnh viễn. Kiểm tra danh tính chặn một người hoàn tất muộn xoá nhầm một khoá kế nhiệm đã nối vào.

### Bước 5 — Đi qua seam dùng chung

**Neo 1 — `packages/coding-agent/src/tools/file-write-fallback.ts:402`**
`export async function writeFileWithFallback(dst: string, content: string, file?: BunFile): Promise<void> {`
Neo 2 — **cùng file, `:305`**
`export async function deleteFileWithFallback(dst: string, file?: BunFile): Promise<void> {`

Bọc **toàn bộ thân** mỗi hàm vào `withFileMutationQueue(<dst>, async () => { …thân hiện có, thụt thêm 1 tab… })`.

Một chỉnh sửa ở `:402` phủ ba trong bốn tool có mutate:

| call site (đã kiểm) | nội dung dòng | phủ cho |
| --- | --- | --- |
| `src/edit/index.ts:674` | `			await writeFileWithFallback(request.moveTo, request.content);` | đích của `edit` move |
| `src/lsp/writethrough.ts:314` | `	const writeContent = async (value: string) => writeFileWithFallback(dst, value, file);` | `edit` create/update qua `createEditWritethrough`, và `write` qua `src/tools/write.ts:909` |
| `src/lsp/writethrough.ts:74` | `	await writeFileWithFallback(dst, content, file);` (`writethroughNoop`) | đường no-LSP |

**Delete phải đi qua CÙNG hàng đợi với write.** Call site delete đã kiểm: `src/edit/index.ts:645` (`			await deleteFileWithFallback(request.path, Bun.file(request.path));` — op `delete`) và `:675` (cùng dòng, unlink nguồn của op `move`). Bọc `:402` mà không bọc `:305` để một delete rơi đè lên một write đồng thời — đúng lost-update mà mục tiêu này sinh ra để chặn.

- [ ] Vòng `for (const handler of Array.from(fallbackHandlers))` (**`:444-453`**) và `Array.from(deleteFallbackHandlers)` giữ nguyên cấu trúc, kể cả `logger.warn("File write fallback handler threw; trying next handler", {…})` / `"File delete fallback handler threw; trying next handler"`.
- [ ] Không nuốt, không sắp xếp lại, không thêm handler nào.

### Bước 6 — Định tuyến `ast_edit` một cách tường minh

`grep -c writeFileWithFallback packages/coding-agent/src/tools/ast-edit.ts` → **0** (đã chạy). Bước 5 **KHÔNG** phủ tool này.

Hai lời gọi native, đã kiểm:
- `packages/coding-agent/src/tools/ast-edit.ts:87` → `		const targetResult = await astEdit({` (trong `runAstEditTargets`, lặp `for (const target of targets)` ở `:86`)
- `packages/coding-agent/src/tools/ast-edit.ts:137` → `	return astEdit({` (trong `runAstEditOnce`)

**Điểm quan trọng mà work item nói chưa tới:** hai dòng đó nằm trong hàm, ở đó filesystem đến từ `options.filesystem` — **không** phải từ `urlFilesystem.shellFilesystem()`. Hai chỗ gọi `shellFilesystem()` thật là `:291` (preview) và `:438` (apply). Bọc tại `:87` sẽ phải khoá theo `target.basePath` **cho từng target** (một lời gọi fan-out N glob sẽ lấy N khoá lồng nhau — có thứ tự, nhưng không thuận), và nó **không phân biệt được** preview với apply, vì cả hai đều đi qua cùng `runAstEditOnce`.

**Cách gõ đúng ở omp (áp dụng khuyến nghị (a) của work item):** bọc tại **call site apply `:433`**, không bọc hai dòng `:87`/`:137`.

Neo: `packages/coding-agent/src/tools/ast-edit.ts:433`
```
						const applyResult = await runAstEditOnce(multiTargets, resolvedSearchPath, globFilter, {
							rewrites: normalizedRewrites,
							dryRun: false,
```

Sau khi sửa:
```typescript
const applyResult = await withFileMutationQueue(resolvedSearchPath, () =>
	runAstEditOnce(multiTargets, resolvedSearchPath, globFilter, {
		rewrites: normalizedRewrites,
		dryRun: false,
		/* …giữ nguyên phần còn lại của khối options… */
	}),
);
```

- [ ] `resolvedSearchPath` **có** trong scope ở `:433` (nó tới từ destructuring ở `:283`: `const { searchPath: resolvedSearchPath, scopePath, isDirectory, multiTargets, globFilter } = scope;`).
- [ ] Call site **preview `:285`** (`const result = await runAstEditOnce(multiTargets, resolvedSearchPath, globFilter, {` với `dryRun: true` ở `:287`) **không** bị bọc. Nó chỉ parse và không được chiếm khoá ghi.
- [ ] Độ thô được chấp nhận và **ghi rõ trong PR**: khoá theo *phạm vi đã resolve*, không phải theo từng file bị ghi lại. Hai lời gọi `ast_edit` trên cùng phạm vi thì serialize; hai phạm vi rời nhau thì song song; `ast_edit` trên `/src` và `edit` trên `/src/a.ts` vẫn chạy song song (không loại trừ lẫn nhau). Lý do không khoá được theo từng file: các lần ghi nằm bên trong lời gọi native `astEdit` (`import { … astEdit … } from "@oh-my-pi/pi-natives"` — `ast-edit.ts:11`) và omp không nhìn thấy chúng riêng lẻ.
- [ ] Ghi nhận thêm: apply của `ast_edit` chạy **deferred**, bên trong `queueResolveHandler(this.session, { … apply: async (_reason: string) => { … } })` (`:427-438`). Nó không chạy trong tool call gốc. Đây là lý do khoá theo `resolvedSearchPath` (dữ liệu scope đã đóng) vẫn đúng.

### Bước 7 — Viết 5 test hợp đồng

File mới: `packages/coding-agent/test/tools/file-mutation-queue.test.ts` (thư mục `test/tools/` tồn tại, 172 entry).

Import theo đúng quy ước file đứng cạnh — `packages/coding-agent/test/tools/ast-edit.test.ts:1-3`:
```typescript
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { withFileMutationQueue } from "@oh-my-pi/pi-coding-agent/utils/file-mutation-queue";
```

- [ ] KHÔNG `mock.module()`. KHÔNG source-grep. KHÔNG mutate `process.env` / `Bun.*` ở phạm vi file.
- [ ] `const tempDirs: string[] = []` + `afterEach(async () => { await Promise.all(tempDirs.splice(0).map(d => fs.rm(d, { recursive: true, force: true }))); })` — copy đúng từ bản tham chiếu dòng 23-32.
- [ ] `await Bun.sleep(ms)` cho mọi delay (AGENTS.md), **không** `new Promise(r => setTimeout(r, ms))` như bản tham chiếu dùng.

Xem Mục 4.

### Bước 8 — Changelog

`packages/coding-agent/CHANGELOG.md:3` là `## [Unreleased]`. Dưới nó **chỉ có** `### Security` (dòng 5) — **`### Fixed` chưa tồn tại và phải tạo mới**, đặt sau `### Security`, trước `## [18.4.0] - 2026-09-28` (dòng 9), theo thứ tự section của AGENTS.md.

Dòng, văn phong hướng người dùng, không kèm link issue:
```markdown
### Fixed

- Fixed two concurrent edits to the same file from separate sessions interleaving instead of applying cleanly.
```

- [ ] Không đụng section đã phát hành.
- [ ] Không ghi chi tiết implementation, không nhắc tên helper.

---

## 4. Hợp đồng test

**Hợp đồng được bảo vệ:** mutation lên một file được áp dụng từng cái một; mutation lên các file khác vẫn chồng lấn.

Hồi quy ở đây khiến các tiến trình con âm thầm đè hoặc cắt đứt lẫn nhau — người dùng thấy một file mà nội dung không khớp với lần sửa nào, **và không có lỗi nào ở đâu cả**.

File: `packages/coding-agent/test/tools/file-mutation-queue.test.ts` — `describe("withFileMutationQueue")`, 5 `it`.

| # | Test | Nếu hồi quy, người tiêu dùng thấy | Đỏ với lỗi nào |
| --- | --- | --- | --- |
| 1 | `serializes mutations for the same path` | Nội dung file là phần còn sót của lần ghi sau đè lên lần ghi trước, byte bị cắt. Assert thứ tự quan sát được **tuyệt đối không chồng nhau**: mỗi task push `"start"`, `await Bun.sleep`, push `"end"`; `expect(order).toEqual(["a:start","a:end","b:start","b:end"])` | `releaseNext()` đặt ngoài `finally` → kẹt |
| 2 | `runs mutations for different paths concurrently` | Đây là assertion giữ cho Map được khoá trung thực. Một hàng đợi toàn cục là hồi quy hiệu năng đeo mặt nạc thành bản sửa lỗi — mọi sửa file trong repo phải xếp hàng. Phải assert là chúng **có** chồng lấn: `expect(order.indexOf("b:start")).toBeLessThan(order.indexOf("a:end"))` | port bằng một đuôi chuỗi toàn cục |
| 3 | `shares one queue between a symlink and its target` | Cái mà key theo realpath mua được và key chỉ dùng `resolve` âm thầm bỏ sót: hai lời gọi qua hai đường tới cùng file vẫn giao nhau. Fixture: `writeFile(target)` + `symlink(target, alias)` trong tmpdir | thay `realpath` bằng `resolve` thuần |
| 4 | `does not throw for a path that does not exist yet` | Write vào một đường dẫn mới sẽ ném `ENOENT` và thay vì tạo file lại làm hỏng tool `write` mới | thiếu nhánh fallback ENOENT/ENOTDIR |
| 5 | `chains two registrations made while the first key is still resolving` | Hai mutation đến trong lúc cái thứ nhất **vẫn đang resolve key** nối chuỗi, chứ không cùng đọc một predecessor và cùng chạy song song | bỏ `registrationQueue` |

Cách dựng test 5 cho **thật sự** đỏ khi bỏ `registrationQueue`: phải có một mutation giữ key ở trạng thái chưa resolve đủ lâu. Cách chắc nhất là monkey-free — gọi `withFileMutationQueue` cho một path **chưa tồn tại** (buộc `realpath` phải reject → nhánh fallback, thêm một vòng microtask) rồi ngay lập tức gọi lần thứ hai cùng path, và assert `order` vẫn là `["a:start","a:end","b:start","b:end"]`. Nếu test 5 vẫn xanh khi bạn tạm bỏ dòng `registrationQueue = registration.then(...)` thì test đó không bảo vệ gì — phải làm lại.

**Bản tham chiếu đọc được:** `$HOME/Projects/pi-ref/packages/coding-agent/test/file-mutation-queue.test.ts` (274 LOC). Block `describe("withFileMutationQueue")` (3 test, dòng 34-93) **port trực tiếp được** sau khi đổi `vitest` → `bun:test` và `delay` → `Bun.sleep`. Block `describe("built-in edit and write tools")` (5 test, dòng 95-274) **không port được** — nó chạy `createEditTool`/`createWriteTool` của riêng pi, còn omp chạy native qua `packages/agent`; đừng cố.

### 4b. Ngoài phạm vi — ghi vào PR, không test ở đây

`edit`'a đường update đọc pre-image tại `src/edit/index.ts:711` (`				preWriteBytes = await Bun.file(request.path).bytes();`) và so sánh **sau khi** ghi ở `:729-745` (nhánh `if (postWriteBytes !== undefined && bytesEqual(postWriteBytes, preWriteBytes))` tại `:738`, ném `` `edit appeared successful but file content did not change on disk: ${request.displayPath}` `` tại `:740`). Lần đọc nằm **NGOÀI** khoá `:402`.

⇒ Hàng đợi chặn được **interleaving và byte-tearing**, KHÔNG chặn được **lost update**. PR phải nói rõ phạm vi này. Xem Mục 6, bẫy 4.

---

## 5. Cổng

### Cổng 1 — Kiểu + format (bắt buộc xanh)

```bash
bun run check:ts
```
`package.json:90` → `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`; `check:tools` (`:91`) = `oxlint . && oxfmt --check …`.

> **Cấm `tsc`/`npx tsc`.** Cũng **đừng** dùng `bun run check` (`:89` = `--parallel check:ts check:rs`) — `check:rs` kéo cargo, không liên quan và chậm hơn nhiều.

**Cổng này có đỏ được không? CÓ, và đã quan sát xanh tại baseline.** Chạy trên đúng HEAD `65cc6c1`:
```
All matched files use the correct format.
Finished in 879ms on 5445 files using 10 threads.
… 16/16 package Done …
```
Nó đỏ khi có lỗi kiểu, một import top-level bị thiếu, một `ReturnType<>`, một `any`, hoặc vi phạm format.

> Nhiễu có sẵn, **không phải** lỗi của bạn:
> `packages/coding-agent/test/mcp-project-config-not-trusted-by-default.test.ts:19:10: warning eslint(no-unused-vars): Identifier 'getConfigRootDir' is imported but never used.`
> Đây là `warning`, không làm cổng đỏ.

### Cổng 2 — Hành vi (phải 5 pass / 0 fail)

```bash
bun test packages/coding-agent/test/tools/file-mutation-queue.test.ts
```

> **Không cần build native addon.** Addon đã build sẵn ở cây này: `bun -e 'const m = await import("@oh-my-pi/pi-natives"); console.log(Object.keys(m).length)'` → `128`. Module mới chỉ import `node:fs/promises` + `node:path`, nên nó không chạm addon; nhưng file test import qua alias `@oh-my-pi/pi-coding-agent` nên cứ chạy thật.

**Cổng này có đỏ được không? CÓ, theo đúng 5 đường lỗi độc lập** (xem cột cuối bảng Mục 4). Mỗi test bắt một lỗi khác nhau, nên năm test xanh **không** chứng minh cả năm chi tiết — chỉ cần bỏ `registrationQueue` (chi tiết 2) thì test 5 đỏ trong khi 1-4 vẫn xanh. Đó là chính xác cái bạn muốn.

Nếu test treo (không bao giờ kết thúc) thay vì đỏ: đó là khoá kẹt — thường do `releaseNext()` nằm ngoài `finally`, hoặc do `registrationQueue` bị để lại ở trạng thái rejected.

### Cổng 3 — Phủ `ast_edit` (không phải hành vi, là phủ suy diễn)

```bash
git grep -c writeFileWithFallback packages/coding-agent/src/tools/ast-edit.ts
```
Phải trả `0` (đã chạy ở baseline). Nó **không** chứng minh `ast_edit` đã được bảo vệ — nó chỉ chứng minh bạn chưa làm hỏng điều kiện tiên quyết của bước 6. Hãy tự review lại `:433` bằng mắt.

### Cổng 4 — Vệ sinh

```bash
git status --porcelain packages/coding-agent/
```
Đúng 5 path: 3 sửa (`file-write-fallback.ts`, `ast-edit.ts`, `CHANGELOG.md`) + 2 tạo (`src/utils/file-mutation-queue.ts`, `test/tools/file-mutation-queue.test.ts`). Nhiều hơn ⇒ bạn đã đụng ngoài phạm vi.

---

## 6. Cạm bẫy riêng của work item này

**Bẫy 1 — Tái nhập. Đây là bẫy chết người, không phải bẫy phong cách.**

Bọc `writeFileWithFallback` (`:402`) đặt khoá quanh **toàn bộ** vòng lặp fallback-handler (`:444-453`), vốn gọi các handler do extension đăng ký qua `addFileWriteFallback` — được nối tại `src/extensibility/extensions/runner.ts:782` (`addFileWriteFallback(async req => {`), exposed là `registerFileWriteFallback` tại `src/extensibility/extensions/types.ts:1404`. Nếu bất kỳ handler nào gọi ngược lại `writeFileWithFallback` hoặc `deleteFileWithFallback` cho cùng path, hàng đợi không bao giờ được nhả và path đó treo vĩnh viễn — **không có timeout, không có owner token, không tái nhập được**.

Vì sao dễ sai: extension API là public surface, không thể kiểm chứng toàn bộ handler ngoài repo. Nếu bạn cảm thấy không an toàn, hãy ghi rõ trong PR rằng hàng đợi không tái nhập và một extension gọi ngược sẽ treo — đừng âm thầm nuốt.

**Bẫy 2 — `registrationQueue` dạng một tham số.** `.then(() => undefined)` để lại chuỗi ở trạng thái rejected vĩnh viễn. Một lần `realpath` throw EACCES là **deadlock toàn bộ mutation của cả tiến trình**, không riêng file đó. Bắt buộc hai tham số.

**Bẫy 3 — Bọc nhầm `:87`/`:137` trong `ast-edit.ts`.** Đây là cái work item chỉ đúng một nửa. Bọc hai dòng đó sẽ khoá cả preview lẫn apply vì cùng đi qua `runAstEditOnce`, và sẽ buộc phải khoá theo `target.basePath` cho từng target. Bọc tại call site apply `:433`, khoá `resolvedSearchPath`.

**Bẫy 4 — Tự nhận là đã chặn cả lost-update.** Hãy đọc Mục 4b trước khi viết mô tả PR. Nếu claim "concurrent edits no longer clobber" mà không nói rõ phạm vi, một reviewer sẽ dựng đúng repro lost-update lên bạn trong 5 phút.

**Bẫy 5 — Tin `bun check` hoặc tin phần mở đầu "đã kiểm chứng".** Work item dùng từ "đã kiểm chứng" cho cả những thứ đã lệch (xem Phụ lục A). Bản tham chiếu pi bọc hàng đợi quanh **thân TOOL** (`core/tools/edit.ts:163`, `core/tools/write.ts:67`), **không** phải tại một chokepoint ghi. Ở omp, chokepoint `file-write-fallback.ts` **là** đường cắt tốt hơn — nhưng chỉ vì `edit` của omp có một phễu `#write` duy nhất tại `src/edit/index.ts:495` (`				(_error, request) => this.#write(request, signal),`) mà pi không có. **Chỉ chép phần bên trong của helper; đừng chép vị trí theo từng tool của pi.**

**Bẫy 6 — Tưởng `concurrency = "exclusive"` đã phủ việc này.** Cả `EditTool` (`src/edit/index.ts:328` → `	readonly concurrency = "exclusive";`) và `WriteTool` (`src/tools/write.ts:441` → `	readonly concurrency = "exclusive";`) đều khai báo nó, nhưng `packages/agent/src/agent-loop.ts` nối các tool exclusive qua biến `lastExclusive` **phạm vi hàm** khai báo ở `:3511` (`	let lastExclusive: Promise<void> = Promise.resolve();`) bên trong `executeToolCalls` (bắt đầu ở `:3024`). Nó chỉ tuần tự hoá tool **trong một batch của một tiến trình**, KHÔNG dùng chung qua các tiến trình hay session. `ast_edit` không khai báo `concurrency` nào (chỉ có `readonly name = "ast_edit";` tại `ast-edit.ts:152`), nên nó mặc định shared và **không nhận bảo vệ nào** từ agent-loop. PR phải nói điều này, không thì reviewer sẽ hỏi sao cần cả hai cơ chế.

---

## Phụ lục A — Kiểm toán neo: cái nào đúng, cái nào lệch

Mỗi dòng dưới đây đã được mở bằng `sed -n` / `grep -n` / `git grep` tại HEAD `65cc6c1`.

### A.1 Neo ĐÚNG (dùng nguyên số dòng trong phiếu này)

| neo | dòng thật chứa |
| --- | --- |
| `src/tools/file-write-fallback.ts:305` | `export async function deleteFileWithFallback(dst: string, file?: BunFile): Promise<void> {` |
| `src/tools/file-write-fallback.ts:402` | `export async function writeFileWithFallback(dst: string, content: string, file?: BunFile): Promise<void> {` |
| `src/tools/ast-edit.ts:87` | `		const targetResult = await astEdit({` |
| `src/tools/ast-edit.ts:137` | `	return astEdit({` |
| `src/tools/ast-edit.ts:152` | `	readonly name = "ast_edit";` (không có field `concurrency` nào trong class) |
| `src/tools/ast-edit.ts:285` / `:287` | `runAstEditOnce(...)` (preview) / `				dryRun: true,` |
| `src/edit/index.ts:495` | `				(_error, request) => this.#write(request, signal),` |
| `src/edit/index.ts:645` | `			await deleteFileWithFallback(request.path, Bun.file(request.path));` (op `delete`) |
| `src/edit/index.ts:674` | `			await writeFileWithFallback(request.moveTo, request.content);` |
| `src/edit/index.ts:675` | `			await deleteFileWithFallback(request.path, Bun.file(request.path));` (op `move`) |
| `src/edit/index.ts:711` | `				preWriteBytes = await Bun.file(request.path).bytes();` |
| `src/edit/index.ts:728` / `:738` / `:740` | `if (preWriteBytes !== undefined) {` / `if (postWriteBytes !== undefined && bytesEqual(postWriteBytes, preWriteBytes)) {` / `` `edit appeared successful but file content did not change on disk: ${request.displayPath}`, `` |
| `src/edit/index.ts:328` | `	readonly concurrency = "exclusive";` (`EditTool`) |
| `src/lsp/writethrough.ts:74` | `	await writeFileWithFallback(dst, content, file);` |
| `src/lsp/writethrough.ts:314` | `	const writeContent = async (value: string) => writeFileWithFallback(dst, value, file);` |
| `src/tools/write.ts:441` | `	readonly concurrency = "exclusive";` (`WriteTool`) |
| `src/tools/write.ts:909` | `			const diagnostics = await writethrough(absolutePath, cleanContent, signal, undefined, batchRequest, dst =>` |
| `packages/agent/src/agent-loop.ts:3024` | `async function executeToolCalls(` |
| `packages/agent/src/agent-loop.ts:3511` | `	let lastExclusive: Promise<void> = Promise.resolve();` |
| `src/advisor/runtime.ts:454` | `		const { promise, resolve } = Promise.withResolvers<boolean>();` |
| `CHANGELOG.md:3` | `## [Unreleased]` |
| `git grep -c writeFileWithFallback src/tools/ast-edit.ts` | `0` |
| `edit/hashline/filesystem.ts`, `edit/modes/patch.ts` | **không tồn tại** (thư mục `src/edit/` chỉ có index/schemas/settings/store/normalize/blackbox/auto-repair + 2 file `.md`) — xác nhận đúng như work item nói |
| `src/utils/file-mutation-queue.ts`, `test/tools/file-mutation-queue.test.ts` | **không tồn tại** — xác nhận đúng; `src/utils/` có 45 file và **không** có `index.ts` |
| pi-ref `core/tools/file-mutation-queue.ts` | 61 LOC, đọc được, nội dung khớp Mục 2b |
| pi-ref `core/sdk.ts:120` | `	withFileMutationQueue,` trong khối export |
| pi-ref `src/index.ts:376` | `	withFileMutationQueue,` re-export từ `./core/tools/index.ts` |
| pi-ref `edit.ts:163` / `write.ts:67` | `			return withFileMutationQueue(absolutePath, async () => {` (bọc quanh thân tool) |
| `bun run check:ts` | xanh ở baseline: 16/16 package Done, 5445 file đúng format |

### A.2 Neo LỆCH — dùng số trong cột "đúng", KHÔNG dùng số của work item

| work item ghi | dòng thật | nội dung thật ở dòng đúng | mức lệch |
| --- | --- | --- | --- |
| `extensibility/extensions/types.ts:1347` = `registerTool` (**kể cả phần "Đính chính" của work item**) | **`:1372`** | `	registerTool<TParams extends TSchema = TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, TDetails>): void;` (header `// Tool Registration` ở `:1367-1369`) | **lệch 25** |
| `extensibility/extensions/types.ts:1379` = `registerFileWriteFallback` | **`:1404`** | `	registerFileWriteFallback(handler: FileWriteFallbackHandler): void;` | **lệch 25** |
| `task/executor.ts:3960` = `createAgentSession` | **`:4016`** | `			const sessionPromise = createAgentSession(buildSubagentSessionOptions(sessionManager, null));` | **lệch 56** |
| `agent-loop.ts:3589-3611` = cơ chế exclusive | **`:3587-3614`**, phần cốt lõi `:3609-3614` | `:3609` `		const start = concurrency === "exclusive" ? Promise.all([lastExclusive, ...sharedTasks]) : lastExclusive;` · `:3613` `			lastExclusive = task;` | thiếu 3 dòng cuối — phép gán `lastExclusive = task` nằm **ngoài** range work item nêu |
| `extensibility/extensions/runner.ts:778` = chỗ nối `addFileWriteFallback` | **`:782`** | `					addFileWriteFallback(async req => {` | lệch 4 |
| `file-write-fallback.ts:440-452` = vòng `fallbackHandlers` | **`:444-453`** | `					for (const handler of Array.from(fallbackHandlers)) {` … đóng `}` ở `:453` | lệch 4 |
| `file-write-fallback.ts:18-32` = doc comment "bốn call site" | **`:17-31`**; câu "It has four call sites, and all of them route here" ở `:21-22` | doc comment **có** nói bốn và **có** kể `edit/hashline/filesystem.ts` + `edit/modes/patch.ts` | lệch nhẹ |
| `ast-edit.ts:85-95` = vòng `runAstEditTargets` | **`:86-97`** | `	for (const target of targets) {` ở `:86`, `astEdit` ở `:87-97` | lệch 1 |
| `edit/index.ts:222` = "apply_patch là một edit MODE được chọn" | **`:358`** (chọn) / `:369`, `:379` (dùng) | `:222` là `	if (mode === "patch" || mode === "apply_patch") {` — một **nhánh kiểm tra mode**, không phải chỗ chọn mode; chỗ chọn là `:358` `			case "apply_patch":` | lệch nhẹ, ý đúng |
| `ast-edit.ts:87`, `:137` "ghi qua `urlFilesystem.shellFilesystem()`" | hai chỗ gọi `shellFilesystem()` thật là **`:291`** (preview) và **`:438`** (apply) | ở `:87`/`:137` filesystem đến từ `options.filesystem`; `shellFilesystem()` chỉ là nơi **cấp** nó. Nội dung ("không đi qua `writeFileWithFallback`") vẫn đúng | diễn đạt nén quá mức |
| `test/tools/` "30+ file" | **172 entry** | | plan đếm thiếu, không sai |
| `CHANGELOG.md` "Thêm dòng dưới `### Fixed`" | `## [Unreleased]` **chỉ có `### Security`** | **`### Fixed` chưa tồn tại, phải tạo**, đặt sau `### Security` theo thứ tự AGENTS.md | work item tưởng section có sẵn |

### A.3 Claim của work item SAI với cây thật — sửa trước khi code

| claim | thực tế đã kiểm |
| --- | --- |
| "Bước 2: `brew install ninja` **BẮT BUỘC TRƯỚC** — cmake build của opusic-sys cần Ninja. Thiếu nó, lệnh ngay dưới exit 1 với `CMake was unable to find a build program corresponding to Ninja`" | **Sai.** `packages/natives/package.json:32` → `"build": "bun ../../scripts/bazel-natives.ts host --dest native"` — build bằng **Bazel**, không có tham chiếu cmake/ninja nào trong `packages/natives/package.json` hay `scripts/bazel-natives.ts`. Không cần `brew install ninja`. Script đúng nếu cần: `bun run build:native` (`package.json:84` → `bun --cwd=packages/natives run build`). |
| "Trạng thái đã quan sát: `bun test packages/coding-agent/test/tools/ast-edit.test.ts` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` (loader-state.js:970) — đó là lý do test bị chặn trước khi build addon." | **Sai tại HEAD này.** Đã chạy: `bun test packages/coding-agent/test/tools/ast-edit.test.ts` → `7 pass / 0 fail / 46 expect() calls`, 924ms. Addon đã build sẵn: `import("@oh-my-pi/pi-natives")` → 128 export. **Cổng 2 chạy được ngay, không cần bước build.** |
| "Tiền đề trong mô tả task: 'git HEAD 5873776'" | HEAD thật: **`65cc6c1`**. |
| doc comment `file-write-fallback.ts` nói có BỐN call site | Đúng là doc comment sai, nhưng **đếm thật trong `src/` là 3 write** (`edit/index.ts:674`, `lsp/writethrough.ts:74`, `lsp/writethrough.ts:314`) **+ 2 delete** (`edit/index.ts:645`, `:675`). Work item đã đúng khi nói 3. |

### A.4 Thứ có sẵn mà work item không nhắc

- **`$HOME/Projects/pi-ref/packages/coding-agent/test/file-mutation-queue.test.ts` — 274 LOC, có thật.** Block đầu (`describe("withFileMutationQueue")`, dòng 34-93, 3 test) là bản mẫu trực tiếp cho 3 test của bạn. Dùng `vitest` và `delay()` bằng `setTimeout` — phải đổi sang `bun:test` và `Bun.sleep`. Block thứ hai (dòng 95-274) chạy `createEditTool`/`createWriteTool` của riêng pi, **không** dùng được với omp.
- **`senpi-ref` là mirror của `pi-ref`** — có cùng `packages/coding-agent/src/core/tools/file-mutation-queue.ts` và cùng file test. Không phải nguồn độc lập, đừng đếm là hai xác nhận.
- 5 cây tham chiếu còn lại (`deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref`) **không** có `file-mutation-queue*` nào — đã `find` toàn cây, trừ `node_modules`.

---

## Phụ lục B — Câu hỏi cần người quyết (chặn, không trả lời được sau khi code)

Ba câu này phải có câu trả lời bằng chữ **trong PR**, không phải trong đầu người ghi code.

1. **Mặt cắt extension.** `withFileMutationQueue` là nội bộ. Một extension ngoài repo đăng ký tool qua `registerTool` (`types.ts:1372`) rồi tự gọi `Bun.write` sẽ **né hàng đợi hoàn toàn**. pi đã export nó trên public surface (`core/sdk.ts:120`, `src/index.ts:376`). omp phải chọn: (a) export từ extension API bây giờ, hay (b) ghi trong handoff M2 rằng mutation của bên thứ ba không được serialize, kèm lý do. **M2 không được phải đoán.**
2. **Phạm vi atomicity.** PR phải nói rõ: W12 sửa **interleaving** (lập luận được, khớp cách diễn đạt hiện tại của work item), **không** sửa **lost update** — vì lần đọc pre-image ở `edit/index.ts:711` nằm ngoài khoá. Nếu muốn sửa cả hai, khoá phải dời lên callback `#write` tại `edit/index.ts:495`. Chọn và viết ra.
3. **Độ thô của khoá `ast_edit`.** Khoá theo `resolvedSearchPath` (`:433`) là thô: hai phạm vi rời vẫn song song, và `ast_edit` trên `/src` không loại trừ `edit` trên `/src/a.ts`. Ghi rõ điều này trong PR thay vì để reviewer tự phát hiện.
