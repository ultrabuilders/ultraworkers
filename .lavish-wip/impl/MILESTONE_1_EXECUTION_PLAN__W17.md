# PHIẾU TRIỂN KHAI — W17. Gói bug-report đã redact + crash ring

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md` (mục `## W17. Gói bug-report đã redact + crash ring`, dòng 3459–3727)
**Repo đích:** `/Users/tranquangdang21/Projects/ultraworkers`
**HEAD khi viết phiếu:** `65cc6c1` — `test(coding-agent): opt in explicitly where the suite is about parsing`
**Nguồn port (checkout RIÊNG, không nằm trong repo này):** `/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/bug-report.ts` (375 LOC) và `.../core/crash-log.ts` (169 LOC) — hai file đã mở và đọc hết.
**Quy ước import cần dùng (đã kiểm):** `import { writeArchive } from "@oh-my-pi/pi-utils/ar";` (`packages/utils/package.json:35-38` xuất `"./ar"`), `import { getCrashLogPath, VERSION, sanitizeText } from "@oh-my-pi/pi-utils";` (barrel `packages/utils/src/index.ts:5` star `./dirs`, `:33` star `./sanitize-text`), `import { shortenPath } from "@oh-my-pi/pi-tui/render/render-utils";` (đúng như `packages/coding-agent/src/tools/debug.ts:45`).

> Phiếu này KHÔNG sửa bất kỳ file kế hoạch nào. Mọi sai lệch giữa work item và cây thật được ghi ở **Phụ lục A**.

---

## 1. Cái gì thay đổi, quan sát được

Chạy `/bug-report` giờ dựng một archive zip chẩn đoán trên đĩa và in ra đường dẫn của nó; archive đó **luôn** mang metadata phiên + phân bổ chi phí theo model + chẩn đoán lượt trợ lý hỏng + các crash gần đây, nhưng **chỉ** mang `session.jsonl` khi người dùng trả lời "có" cho câu hỏi opt-in, và **không** có tên key nào trông giống thông tin đăng nhập (`apiKey`, `api_key`, `API-KEY`, `token`, `authorization`, `cookie`, …) sống sót vào bất kỳ trường JSON nào của nó. Một crash giết tiến trình được ghi vào `~/.omp/agent/omp-crash.log` và báo lại ở lần khởi động kế tiếp thay vì biến mất.

---

## 2. Bảng điểm sửa

TRƯỚC được trích nguyên văn từ file thật ở HEAD `65cc6c1` (hoặc từ pi-ref với đường dẫn tuyệt đối đã nêu).

| path | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/diagnostics/redact.ts` | *(file mới)* | **không tồn tại** (`ls packages/coding-agent/src/diagnostics` → `No such file or directory`) | `const REDACTED = "<redacted>";` + `const SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key\|secret\|token\|password\|passwd\|credential\|authorization\|cookie)(?:$\|[-_])/i;` + `export function isSensitiveKey` / `redactUrl` / `redactJsonValue`. **Không import gì** — self-contained, xem §3 bước 2 |
| `packages/coding-agent/src/diagnostics/crash-log.ts` | *(file mới)* | **không tồn tại** (`ls packages/coding-agent/src/core/crash-log.ts` → `No such file or directory`) | `export interface CrashRecord` + `readCrashLog` / `recordCrash` / `takeUnnotifiedCrash` / `clearCrashLog`. Mặc định path = `getCrashLogPath()`. **KHÔNG** copy `crashLogPath()`/`join(agentDir,"crashes.json")` của pi (`pi-ref/.../core/crash-log.ts:20-22`) |
| `packages/coding-agent/src/diagnostics/bug-report.ts` | *(file mới)* | **không tồn tại** | `BUG_REPORT_SCHEMA_VERSION = 1`, `BUG_REPORT_CUSTOM_ENTRY_TYPE = "omp.bug-report"`, `BugReportBundle`, `collectBugReportMetadata` (param `includeSession: boolean` **bắt buộc**), `collectBugReportDiagnostics`, `bugReportFiles`, `writeBugReportArchive`, `bugReportArchiveFileName` |
| `packages/coding-agent/src/prompts/diagnostics/bug-summary.md` | *(file mới)* | **không tồn tại** (`ls packages/coding-agent/src/prompts/diagnostics` → `No such file or directory`) | Template Handlebars giữ nguyên 4 mục của pi + ràng buộc không rò secret. Import: `import bugSummaryTemplate from "../prompts/diagnostics/bug-summary.md" with { type: "text" };` |
| `packages/coding-agent/src/diagnostics/index.ts` | *(file mới)* | **không tồn tại** | `export * from "./bug-report";`<br>`export * from "./crash-log";`<br>`export * from "./redact";` — **chỉ** star, theo `packages/utils/src/ar/index.ts` |
| `packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:545-553` | `BUILTIN_LIFECYCLE_SLASH_COMMANDS` (khai ở `:163`) — entry `debug` | `	{`<br>`		name: "debug",`<br>`		icon: "bug",`<br>`		description: "Open debug tools selector",`<br>`		handleTui: async (_command, runtime) => {`<br>`			await runtime.ctx.showDebugSelector();`<br>`			runtime.ctx.editor.setText("");`<br>`		},`<br>`	},` | Entry này **giữ nguyên**; **thêm ngay sau nó** một entry mới `{ name: "bug-report", icon: "bug", … }` có `subcommands: [{ name: "build" }, { name: "crashes" }]`, `allowArgs: true`, `handle` (dùng `runtime.output`) và `handleTui` (dùng `runtime.ctx.showStatus`) |
| `packages/coding-agent/src/slash-commands/helpers/bug-report.ts` | *(file mới)* | **không tồn tại** (`ls …/helpers/` không có `bug-report.ts`) | Adapter mỏng: `parseSubcommand` → hỏi opt-in → `collectBugReportMetadata` + `collectBugReportDiagnostics` + `bugReportFiles` → `writeBugReportArchive` → phát đường dẫn. Mọi chuỗi hiện ra đi qua `sanitizeText` + `shortenPath`. **Không `console.*`** |
| `packages/coding-agent/test/diagnostics/redact.test.ts` | *(file mới)* | **không tồn tại** (`ls packages/coding-agent/test/diagnostics` → `No such file or directory`) | 7 `it` trong 1 `describe`, xem §4 |
| `packages/coding-agent/test/diagnostics/bug-report.test.ts` | *(file mới)* | **không tồn tại** | Bundle shape + opt-in hai chiều + crash ring round-trip qua `TempDir` |
| `packages/coding-agent/CHANGELOG.md` `## [Unreleased]` | — | Không có mục nào về `/bug-report` | Thêm một dòng hướng người dùng (user-facing; xem §3 bước 8) |

### 2b. `redact.ts` — dán nguyên văn từ nguồn, không sửa một ký tự

Đây là **toàn bộ** hợp đồng redaction. Trích từ `/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/bug-report.ts:19-59`, đã đọc từng dòng. Port **nguyên văn**, chỉ đổi `const` thành `export const` cho `REDACTED` nếu test cần nó — nếu không thì giữ `const` (test chỉ cần `redactJsonValue`/`redactUrl`).

```typescript
// packages/coding-agent/src/diagnostics/redact.ts — self-contained, no imports.
const REDACTED = "<redacted>";
const SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key|secret|token|password|passwd|credential|authorization|cookie)(?:$|[-_])/i;

export function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY.test(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

/** Strip credentials and secret-looking query parameters from a URL. */
export function redactUrl(value: string): string {
	const nested = /^([a-z][a-z0-9+.-]*:)([a-z][a-z0-9+.-]*:\/\/.*)$/i.exec(value);
	if (nested) return `${nested[1]}${redactUrl(nested[2])}`;
	try {
		const url = new URL(value);
		let changed = false;
		if (url.username || url.password) {
			url.username = "";
			url.password = "";
			changed = true;
		}
		for (const key of url.searchParams.keys()) {
			if (isSensitiveKey(key)) {
				url.searchParams.set(key, REDACTED);
				changed = true;
			}
		}
		return changed ? url.toString() : value;
	} catch {
		return value;
	}
}

/** Copy a JSON value while removing values that may contain credentials. */
export function redactJsonValue(value: unknown): unknown {
	if (value === undefined) return undefined; // JSON.parse(JSON.stringify(undefined)) throws
	return JSON.parse(
		JSON.stringify(value, (key, child: unknown) => {
			if (child !== null && child !== undefined && isSensitiveKey(key)) return REDACTED;
			return typeof child === "string" ? redactUrl(child) : child;
		}),
	);
}
```

Nếu `isSensitiveKey` cần export để test nhắm trực tiếp, export nó **cùng dòng khai báo** — đừng tách một dòng `export { isSensitiveKey }` ở cuối file.

### 2c. Hai dòng cổng opt-in — không được rút gọn thành một

Đây là hợp đồng quan trọng nhất của work item. Hai chỗ này phải **cùng tồn tại**; bỏ một chỗ là rò transcript.

**Cổng 1 — collector** (`bug-report.ts`, port từ `pi-ref/.../bug-report.ts:154-181`, đặc biệt dòng 163 và 168):

```typescript
export function collectBugReportMetadata(options: CollectBugReportMetadataOptions) {
	// …
	session: {
		id: options.sessionId,
		included: options.includeSession,          // ← cờ tham báo, KHÔNG phải cổng
		summaryIncluded: options.includeSummary,
		messageCount: options.messageCount,
		...(options.includeSession ? { cwd: options.cwd } : {}),   // ← CỔNG 1 (thuộc tính bị nuốt khi không opt-in)
	},
	// …
}
```

Và trong `interface CollectBugReportMetadataOptions` (pi đặt ở dòng 137-152, trong đó `includeSession: boolean;` ở dòng 142):

```typescript
interface CollectBugReportMetadataOptions {
	id?: string;
	hint?: string;
	sessionId: string;
	cwd: string;
	includeSession: boolean;      // ← bắt buộc, không có `?`
	includeSummary: boolean;
	messageCount: number;
	// …
}
```

**Cổng 2 — danh sách file** (`bugReportFiles`, port từ `pi-ref/.../bug-report.ts:252-272`):

```typescript
export function bugReportFiles(bundle: BugReportBundle): BugReportFile[] {
	const files: BugReportFile[] = [
		{ name: "report.json", contentType: "application/json", data: `${JSON.stringify(bundle.metadata, null, 2)}\n` },
		{
			name: "diagnostics.json",
			contentType: "application/json",
			data: `${JSON.stringify(bundle.diagnostics, null, 2)}\n`,
		},
	];
	if (bundle.sessionJsonl !== undefined) {          // ← CỔNG 2
		files.push({ name: "session.jsonl", contentType: "application/x-ndjson", data: bundle.sessionJsonl });
	}
	if (bundle.summary !== undefined) {
		files.push({
			name: "summary.md",
			contentType: "text/markdown",
			data: bundle.summary.endsWith("\n") ? bundle.summary : `${bundle.summary}\n`,
		});
	}
	return files;
}
```

**Cổng 3 — ghi archive.** KHÔNG port `writeZipArchive` tự chế của pi (`pi-ref/.../bug-report.ts:274-276` gọi `writeZipArchive` từ `../utils/zip.ts` — file đó **không tồn tại** ở repo này). Gọi hàm trung tâm:

```typescript
export async function writeBugReportArchive(bundle: BugReportBundle, filePath: string): Promise<void> {
	await writeArchive(filePath, "zip", bugReportFiles(bundle).map(f => [f.name, f.data] as const));
}
```

Đã kiểm `writeArchive` nhận `"zip"`: `packages/utils/src/ar/write.ts:49` là `export async function writeArchive(` và thân nó dispatch qua `encodeArchive`; format `zip` đi qua `encodeZip` trong `packages/utils/src/ar/zip.ts`. Đã kiểm **không** có `adm-zip` / `from "tar"` nào trong `packages/coding-agent/src` (hit duy nhất là một dòng văn bản trong `tools/browser/relay/extension-assets/THIRD-PARTY-NOTICES.txt:985`).

### 2d. `crash-log.ts` — phần lõi mang được, phần bỏ

**BỎ** (`pi-ref/.../core/crash-log.ts:46-120`, 75 dòng): `type ExtensionStackMetadata`, `normalizeStackPath` (`:48`), `stackContainsPath` (`:52`), `findExtensionStackMatches` (`:70-120`). Chúng đọc `extension.sourceInfo.{origin,source,baseDir,scope}` — hình dạng của pi, không phải của omp.

**MANG** (port gần nguyên văn):

| symbol | nguồn pi | thay đổi bắt buộc |
| --- | --- | --- |
| `CrashRecord` | `:6-15` | giữ nguyên 9 field |
| `MAX_CRASH_RECORDS = 5` / `MAX_AGE = 7 * 24 * 60 * 60 * 1000` | `:17-18` | giữ nguyên |
| `readCrashLog(filePath = getCrashLogPath())` | `:24-39` | **thay** `crashLogPath()` bằng `getCrashLogPath()`; giữ nguyên bộ lọc shape và `catch { return []; }` |
| `writeCrashLog(records, filePath)` *(private)* | `:41-44` | `fs.mkdirSync(fsPath.dirname(filePath), { recursive: true })` + `fs.writeFileSync(filePath, …)` — namespace import `node:fs`, `node:path` |
| `recordCrash(crash, filePath = getCrashLogPath())` | `:123-143` | giữ `catch { return undefined; }` — best-effort, không bao giờ ném |
| `takeUnnotifiedCrash(filePath = getCrashLogPath(), now = Date.now())` | `:146-161` | giữ `now - Date.parse(record.timestamp) <= MAX_AGE` và `catch { /* Showing the notice again is harmless. */ }` |
| `clearCrashLog(filePath = getCrashLogPath())` | `:163-169` | giữ `rmSync(path, { force: true })` trong try/catch |

Import bắt buộc (AGENTS.md: namespace import cho `node:fs`, `node:path`; sync có chủ ý vì module chạy lúc tiến trình đang chết):

```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import { getCrashLogPath, VERSION } from "@oh-my-pi/pi-utils";
```

Lưu ý tên: tham số của pi tên là `path` (`function readCrashLog(path = crashLogPath())`), trong khi module này đã import namespace `path`. **Đổi tên tham số thành `filePath`** (bảng §2 đã viết theo tên này) để không phải `import * as path` rồi shadow. `VERSION` đến từ `@oh-my-pi/pi-utils` (re-export qua `packages/utils/src/dirs.ts:34` `export const VERSION: string = version;`), không phải từ `../config.ts` như pi.

---

## 3. Các bước

Mỗi bước dưới đây đã được mở và đọc trước khi viết phiếu.

1. **Đọc nguồn port trước khi viết dòng nào.** `/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/bug-report.ts` (375 LOC, đã xác nhận `wc -l`) và `.../core/crash-log.ts` (169 LOC, đã xác nhận). Phân vùng đúng:
   - redaction contract: **17–59** (`:17` `BUG_REPORT_CUSTOM_ENTRY_TYPE`, `:19` `REDACTED`, `:20` `SENSITIVE_KEY`, `:22-24` `isSensitiveKey`, `:27-48` `redactUrl`, `:51-59` `redactJsonValue`) — plan ghi "17-60", lệch 1 vì dòng 60 là dòng trống;
   - hai prompt LLM: **282–300** — `:282` `BUG_SUMMARY_SYSTEM_PROMPT`, `:286` `BUG_SUMMARY_INSTRUCTIONS`. **Plan ghi 316-333 — SAI, xem Phụ lục A.1.**
   - collector: **137–181** (`interface CollectBugReportMetadataOptions` ở 137, `collectBugReportMetadata` ở 154) + `collectBugReportDiagnostics` ở **183** → **232**.
   - danh sách file + ghi archive: **252–281** — `bugReportFiles` ở 252, `writeBugReportArchive` ở 274, `bugReportArchiveFileName` ở 278.
   - tóm tắt LLM: **282–375**.
   - `crash-log.ts`: `CrashRecord` 6–15, hằng 17–18, `crashLogPath` **20–22** (dựng path bằng `join(agentDir, "crashes.json")` — **bỏ**), `readCrashLog` 24–39, `writeCrashLog` 41–44, khối extension **46–120** (bỏ), `recordCrash` 123–143, `takeUnnotifiedCrash` 146–161, `clearCrashLog` 163–169.

2. **Tạo `packages/coding-agent/src/diagnostics/redact.ts`** — dán §2b nguyên văn. `.replace(/([a-z0-9])([A-Z])/g, "$1_$2")` ở dòng 23 của nguồn là **dòng nâng đỡ**: bỏ nó thì `apiKey` không khớp `SENSITIVE_KEY` (regex cần biên `^`/`-`/`_` trước từ khoá, mà `apiKey` trần không có). Đã kiểm: `rg 'SENSITIVE_KEY' packages/` → **không hit**; `rg '\(\[a-z0-9\]\)\(\[A-Z\]\)' packages/coding-agent/src packages/utils/src` → **không hit**, nên phép chuẩn hoá này thật sự chưa tồn tại ở omp. Module **không import gì**.

3. **Tạo `packages/coding-agent/src/diagnostics/crash-log.ts`** theo §2d. Ba rời có chủ ý: (a) path mặc định = `getCrashLogPath()`, **không** `join()`; (b) **không** `findExtensionStackMatches` + 2 helper của nó; (c) namespace import `node:fs`/`node:path`, giữ **sync** — module này chạy lúc tiến trình đang chết, đúng ngoại lệ AGENTS.md nói rõ.

4. **Tạo `packages/coding-agent/src/prompts/diagnostics/bug-summary.md`.** Chép nguyên văn phần thân bốn mục của `pi-ref/.../bug-report.ts:286-300`:
   - `## What the user was doing` — "One short paragraph."
   - `## What went wrong` — "Concrete description of the failure: wrong output, errors, hangs, tool failures, unexpected behavior. Quote error messages and tool output verbatim where they exist."
   - `## Steps to reproduce` — "Numbered list, as specific as the transcript allows."
   - `## Relevant details` — "Tool calls involved, files touched, model behavior, anything else that helps a developer reproduce or locate the problem."
   - ràng buộc kết (dòng 300): `Do not include file contents, secrets, or credentials from the transcript; refer to files by path only. Keep the report factual and concise.`
   - và phần system (dòng 282-284): `Do NOT continue the conversation. Do NOT respond to any questions in the conversation. ONLY output the report.`

   Biến phần động (conversation, hint) thành placeholder Handlebars. **Không** inline prompt thành template literal như pi. Quy ước import đã kiểm: `packages/coding-agent/src/advisor/advise-tool.ts:13` → `import adviseDescription from "../prompts/advisor/advise-tool.md" with { type: "text" };`; `packages/coding-agent/src/auto-thinking/classifier.ts:19-21` → ba import `with { type: "text" }` tương tự. Root `bunfig.toml` đã khai `[loader] ".md" = "text"`.

5. **Tạo `packages/coding-agent/src/diagnostics/bug-report.ts`** — port `collectBugReportMetadata` / `collectBugReportDiagnostics` với kiểu model/provider/settings của omp (`@oh-my-pi/pi-catalog`, `@oh-my-pi/pi-ai`), đổi `BUG_REPORT_CUSTOM_ENTRY_TYPE` sang `"omp.bug-report"`, và §2c cho archive. **Không** import `adm-zip`, **không** `tar`, **không** port `pi-ref/.../utils/zip.ts` (đường dẫn thuộc repo thượng nguồn, không tồn tại ở đây).

6. **Giữ opt-in transcript mang tính cấu trúc.** Ba dòng bắt buộc, đã trích ở §2c: `includeSession: boolean` không optional trong options; `...(options.includeSession ? { cwd: options.cwd } : {})` trong collector; `if (bundle.sessionJsonl !== undefined)` trong `bugReportFiles`. `metadata.session.included` là **cờ tham báo**, không bao giờ được coi là cổng.

7. **Tạo `packages/coding-agent/src/slash-commands/helpers/bug-report.ts`** và thêm entry `bug-report` vào `BUILTIN_LIFECYCLE_SLASH_COMMANDS` **ngay sau** entry `debug` ở `builtin-lifecycle.ts:545-553`. Lấy khuôn từ `/usage` ở `builtin-session.ts:338-384` (đã đọc): nó có `subcommands` + `allowArgs: true` + `handle` (dùng `runtime.output` + `commandConsumed()` từ `helpers/parse.ts:47`) + `handleTui` (dùng `runtime.ctx.showStatus`). `parseSubcommand` ở `helpers/parse.ts:58`. Kiểu `SlashCommandRuntime` ở `slash-commands/types.ts:60-77`, có `output`/`cwd`/`settings`/`session`/`sessionManager`. Lệnh phải hỏi opt-in transcript tường minh và trình bày giao archive là **lựa chọn** (ghi cục bộ vs. chuyển tiếp), không tải lên mặc định. Mọi chuỗi hiện ra đi qua `sanitizeText` (`packages/utils/src/sanitize-text.ts:23`) và `shortenPath` (`packages/tui/src/render/render-utils.ts:926`). **Không `console.*`** ở bất kỳ đâu.

8. **Nối crash writer vào postmortem của omp.** Điểm gắn: `postmortem.register(id, callback)` tại `packages/utils/src/postmortem.ts:673` (thân hàm; docblock bắt đầu ở 658) cho đường cleanup/exit, và `interceptUnhandledRejections(interceptor)` tại `packages/utils/src/postmortem.ts:465` cho rejection lẽ ra giết phiên. Kiểu import đúng trong coding-agent là namespace: `import * as postmortem from "@oh-my-pi/pi-utils"` — đã kiểm `agent-session.ts:1972` (`postmortem.register(\`agent-session:${…}\`, reason => {`) và `tools/browser/cmux/cmux-tab.ts:2567`. **Không** thêm `process.on("uncaughtException")` thô. Ghi một dòng `### Added` vào `packages/coding-agent/CHANGELOG.md` dưới `## [Unreleased]`.

9. **Viết `packages/coding-agent/test/diagnostics/redact.test.ts`** — đúng bảy case ở §4. Import theo convention đã có: `import { describe, expect, it } from "bun:test";` + `import { redactJsonValue, redactUrl } from "@oh-my-pi/pi-coding-agent/diagnostics/redact";` (đúng như `test/memory-redaction.test.ts:4-8` dùng `@oh-my-pi/pi-coding-agent/memory-backend/redact`; `packages/coding-agent/package.json:53-56` xuất `"./*"` → `./src/*.ts`).

10. **Viết `packages/coding-agent/test/diagnostics/bug-report.test.ts`** — bundle shape + opt-in hai chiều + crash ring round-trip, xem §4.

11. **Chạy cổng.** Xem §5.

---

## 4. Hợp đồng test

**Hợp đồng quan sát được, một câu:** một giá trị mà **tên key** mang tính thông tin đăng nhập không bao giờ sống sót qua `redactJsonValue`, bất kể key viết theo cách nào (`apiKey` / `api_key` / `API-KEY` / `clientSecret`); và một giá trị có tên key thường không bao giờ bị đụng. **Cả hai chiều đều assert.**

### `packages/coding-agent/test/diagnostics/redact.test.ts` — 7 case

| # | `it(...)` | assert | người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | `redacts a camelCase apiKey` | `redactJsonValue({ apiKey: "sk-live-XYZ" })` → `{ apiKey: "<redacted>" }` | **Case nâng đỡ.** Bỏ `.replace(/([a-z0-9])([A-Z])/g, "$1_$2")` → case này **đỏ một mình**. Người dùng đính archive lên issue công khai và `apiKey` của họ nằm trong đó |
| 2 | `redacts separated-case spellings of the same key` | cùng object với `api_key` và `API-KEY` → cả hai `<redacted>` | một sửa đổi sau siết anchor âm thầm thu hẹp quy tắc → provider config ghi `API-KEY` bị lộ |
| 3 | `redacts credentials inside a nested URL scheme` | `redactUrl("git+https://user:pass@host/x?token=abc")` không còn `pass`/`abc` | mất dòng đệ quy dòng 28 → `redactUrl` rơi xuống `new URL` và trả nguyên đầu vào; userinfo của private registry nằm trong archive |
| 4 | `redacts secret params and preserves harmless params byte-for-byte` | **trong một test**: `?token=abc&page=2` → `token` thành `<redacted>` **và** `page=2` còn nguyên byte | redact quá (mất `page`) và redact thiếu (lọt `token`) là hai chế độ hồi quy ngược nhau; assert một chiều chỉ bắt được một |
| 5 | `scans nested config-shaped objects` | `{ client: { authorization: "Bearer …" } }` → `<redacted>` ở tầng trong | quét chỉ ở tầng ngoài → credential lồng trong `client.headers` bị lọt |
| 6 | `a diagnostics bundle keeps its non-secret fields` | bundle có **một field không-phải-secret đã biết** còn sống trong `diagnostics.json` | assert chỉ "secret vắng mặt" pass tầm thường trên bundle rỗng → chứng nhận một redactor xoá sạch mọi thứ |
| 7 | `omits session.jsonl from the archive without opt-in` | `bugReportFiles(bundle)` không có entry tên `session.jsonl` | toàn bộ transcript hội thoại của người dùng nằm trong archive họ định đính công khai |

Case 6 và 7 đặt trong file `redact.test.ts` (đúng thứ tự bước 9 của plan) vì chúng cùng bảo vệ một hợp đồng: *bundle có nội dung, nhưng không có transcript trừ khi opt-in*.

### `packages/coding-agent/test/diagnostics/bug-report.test.ts` — 4 case

| # | `it(...)` | assert |
| --- | --- | --- |
| 8 | `includes session.jsonl once the session was explicitly included` | `bugReportFiles({ …bundle, sessionJsonl: "…" })` **có** đúng một entry `session.jsonl` — nửa còn lại của cổng 3 |
| 9 | `writes a zip archive containing report.json and diagnostics.json` | `await writeBugReportArchive(bundle, join(tmp, "b.zip"))`, rồi `Bun.file(p).size > 0` và đọc lại bằng `openArchive` từ `@oh-my-pi/pi-utils/ar` để thấy `report.json` + `diagnostics.json` |
| 10 | `round-trips a crash through a temp directory` | `recordCrash({ kind: "fatal_error", error: new Error("boom"), cwd }, p)` → `takeUnnotifiedCrash(p)` trả về đúng record đó; gọi lần hai trả `undefined` (đã đánh dấu notified) |
| 11 | `keeps at most five crash records` | ghi 7 crash, `readCrashLog(p).length === 5` và bản ghi còn lại là 5 cái **mới nhất** |

Case 10–11 dùng `TempDir` từ `@oh-my-pi/pi-utils` (`packages/utils/src/temp.ts:6`), đúng convention của `test/memory-redaction.test.ts:9`.

---

## 5. Cổng

```bash
# 1. Build native addon — BẮT BUỘC nếu máy chưa có. Đã kiểm: addon ĐÃ build sẵn
#    tại HEAD trên máy này (packages/natives/native/pi_natives.darwin-arm64.node,
#    185 MB, 2026-09-29 06:39).
bun --cwd=packages/natives run build

# 2. Type-check toàn repo.
bun run check:ts

# 3. Lint + format (chạy trong check:ts qua check:tools, nhưng chạy riêng để thấy rõ).
bunx oxlint packages/coding-agent/src/diagnostics packages/coding-agent/src/slash-commands/helpers/bug-report.ts
bunx oxfmt packages/coding-agent/src/diagnostics/*.ts packages/coding-agent/test/diagnostics/*.ts

# 4. Test.
bun test packages/coding-agent/test/diagnostics/

# 5. Hai grep có thể đỏ.
git grep -n 'SENSITIVE_KEY' -- packages/coding-agent/src/diagnostics/          # phải có
git grep -n 'console\.' -- packages/coding-agent/src/diagnostics/ packages/coding-agent/src/slash-commands/helpers/bug-report.ts   # phải RỖNG
git grep -n 'adm-zip\|from "tar"' -- packages/coding-agent/src/                # phải RỖNG
```

**Cổng này có ĐỎ ĐƯỢC không? Có — bảy điều kiện, và bảy điều kiện đều chạy được ngay tại HEAD.**

Điểm này **khác** khẳng định của work item: work item nói "`bun test` **KHÔNG** chạy được trong checkout này hôm nay … 0 pass, 1 fail, `Failed to load pi_natives native addon for darwin-arm64` … phần chạy được của cổng này chỉ là `bun run check:ts` một mình". **Đã kiểm lại ở HEAD `65cc6c1` và claim đó không còn đúng:**

- `bun test packages/coding-agent/test/memory-redaction.test.ts` → `9 pass / 0 fail / 37 expect() calls`
- `bun test packages/coding-agent/test/bash-executor.test.ts` → `68 pass / 0 fail / 182 expect() calls` (file này import `pi-natives`, nên nó **là** bằng chứng addon nạp được)
- `ls packages/natives/native/` → `pi_natives.darwin-arm64.node`, 185 MB, build 2026-09-29 06:39
- `bun run check:ts` → xanh trên cả 15 package (một warning oxlint có sẵn ở `test/mcp-project-config-not-trusted-by-default.test.ts:19`, không liên quan)

**Hệ quả:** cổng này **có thể đỏ thật ngay bây giờ**, không cần build addon trước. Bước 1 trong lệnh trên chỉ là để checkout sạch/máy mới có addon. **Không được** ghi work item xong dựa trên "check:ts xanh" — bước 4 phải thật sự chạy và xanh.

Các phép kiểm đỏ được, từng cái:

| # | phép kiểm | đỏ khi |
| --- | --- | --- |
| 1 | `bun test packages/coding-agent/test/diagnostics/redact.test.ts` | bất kỳ case nào trong 7 case |
| 2 | xoá `.replace(/([a-z0-9])([A-Z])/g, "$1_$2")` tạm, chạy lại | **case (1) và chỉ case (1) phải đỏ.** Nếu không có gì đỏ → case (1) không test điều nó tuyên bố → viết lại case trước khi coi W17 xong. Đây là phép kiểm phân biệt bản port thật với bản chỉ-resolve |
| 3 | `git grep -n 'SENSITIVE_KEY' -- packages/coding-agent/src/diagnostics/` | đỏ khi rule không nằm trong file được ship (chỉ nằm trong comment) |
| 4 | assert `bugReportFiles` **không** có `session.jsonl` khi không opt-in **và** **có** khi opt-in — cùng một lần chạy | đỏ khi một trong hai nửa vắng |
| 5 | assert một field không-phải-secret còn sống trong `diagnostics.json` | đỏ khi mọi assert chỉ có dạng "secret vắng mặt" (tiêu chí loại) |
| 6 | `bun run check:ts` | đỏ khi có lỗi kiểu |
| 7 | grep `console.` / `adm-zip` / `from "tar"` | đỏ khi có bất kỳ hit nào |

---

## 6. Cạm bẫy riêng của work item này

**Cạm bẫy 1 — `.replace()` bị coi là dọn dẹp.** Đây là cách sai dễ nhất và nó hồi quy **trong im lặng**: `redactJsonValue` vẫn chạy, các test khác vẫn xanh, chỉ case (1) đỏ. `SENSITIVE_KEY` cần một biên `^` hoặc `-`/`_` trước từ khoá; `apiKey` trần không có cái nào, nên một bản port chỉ-resolve sống sót qua mọi review. Đừng "cải thiện" regex bằng cách bỏ `.replace()`; hãy giữ nó và **để case (1) chứng minh**.

**Cạm bẫy 2 — hai hiện thực của cùng một hợp đồng.** AGENTS.md coi đây là bug. Đã kiểm: `packages/coding-agent/src/mcp/errors.ts:45-46` khai `SECRET_KEY` và `:100` `sanitizeData`, thay tại `:117` bằng `"[redacted]"`. Nó **cố ý lỏng hơn**: so khớp substring không chuẩn hoá camelCase. Module-private (`rg '^export'` cho 8 export, không cái nào là `sanitizeData`/`SECRET_KEY`). `diagnostics/redact.ts` phải là nơi mang quy tắc **chặt có biên**. **Không refactor `mcp/errors.ts` trong W17** — nó nuôi output lỗi MCP đang chạy. Ghi lại làm việc theo sau.

Ngoài ra đã kiểm và **không** phải trùng: `packages/coding-agent/src/memory-backend/redact.ts` (`redactMemorySecrets` ở `:145`, `redactMemoryTextFields` ở `:199`) redact theo **hình dạng giá trị** (JWT, provider token, `ghp_…`, `xoxb-…`), không theo tên key, và `rg 'SECRET|isSensitiveKey|apiKey'` trên file đó → không hit. Khác hợp đồng, không phải bản trùng.

**Cạm bẫy 3 — `metadata.session.included` trông như cổng.** Nó là cờ tham báo. Một sửa đổi sau chỉ cần set nó là rò transcript trong khi mọi test vẫn xanh. Payload phải bị gate ở **hai** chỗ (§2c).

**Cạm bẫy 4 — `/debug` hiện có đã ship `session.jsonl` vô điều kiện.** `packages/coding-agent/src/debug/report-bundle.ts:90` ghi `omp-report-${timestamp}.tar.gz`. Đó là hành vi của **công cụ cục bộ**, không phải tiền lệ cho một bundle sinh ra để rời khỏi máy. Đừng dùng nó làm lý do để bật transcript mặc định.

**Cạm bẫy 5 — tên import `path` của pi.** `pi-ref/.../core/crash-log.ts:24` viết `function readCrashLog(path = crashLogPath())`, trong khi AGENTS.md bắt namespace import `node:path`. Copy thẳng tên tham số sẽ shadow. Dùng `filePath` như §2d.

**Cạm bẫy 6 — cổng test bị coi là không chạy được.** Work item khẳng định `bun test` bị chặn. Nếu kỹ sư tin và dừng ở `check:ts`, W17 sẽ được coi là xong với **0 test nào chạy**. Đã kiểm lại: cổng chạy được. Bắt buộc chạy bước 4.

---

## Phụ lục A — Kiểm toán neo: cái nào đúng, cái nào lệch

Mỗi dòng dưới đây đã được mở bằng `sed -n "<n>p"` / `rg -n` / `git show`.

### A.1 Neo SAI hoặc LỆCH (dùng số đúng trong phiếu này, KHÔNG dùng số của plan)

| neo trong work item | thực tế | cách tìm lại |
| --- | --- | --- |
| `pi-ref/…/bug-report.ts:316-333` cho `BUG_SUMMARY_SYSTEM_PROMPT` + `BUG_SUMMARY_INSTRUCTIONS` | **Sai.** Ở `:282` và `:286`, kết thúc `:300`. Dòng 316 nằm giữa `selectMessages` và `GenerateBugReportSummaryOptions` | `rg -n 'BUG_SUMMARY_SYSTEM_PROMPT\|BUG_SUMMARY_INSTRUCTIONS' bug-report.ts` → `282`, `286` |
| `pi-ref/…/bug-report.ts:119-215` cho "collector metadata/diagnostics" | **Lệch.** `collectBugReportMetadata` ở `:154-181`; `collectBugReportDiagnostics` ở `:183-232`. Dòng 119 là giữa `describeProvider` | `rg -n '^export function\|^function\|^interface' bug-report.ts` |
| `pi-ref/…/bug-report.ts:232-263` cho "danh sách file + hàm ghi archive" | **Lệch.** `bugReportFiles` ở `:252-272`, `writeBugReportArchive` ở `:274-276`, `bugReportArchiveFileName` ở `:278-280` | `rg -n 'bugReportFiles\|writeBugReportArchive\|bugReportArchiveFileName'` |
| `pi-ref/…/bug-report.ts:17-60` cho redaction contract | **Lệch 1 về cuối.** Contract kết thúc ở `:59`; `:60` là dòng trống. Nội dung đúng tuyệt đối | `sed -n '59p'` → `}`, `sed -n '60p'` → rỗng |
| `pi-ref/…/crash-log.ts:47-113` cho `findExtensionStackMatches` | **Lệch.** Khối thật là **`:46-120`**: `type ExtensionStackMetadata` ở 46, `findExtensionStackMatches` ở 70, đóng ở 120 | `rg -n 'findExtensionStackMatches\|^function\|^type\|^export' crash-log.ts` |
| `crash-log.ts` của pi là "169 LOC, toàn bộ file" | **Đúng.** `wc -l` → `169` | đã chạy |
| `bug-report.ts` của pi là "375 LOC" | **Đúng.** `wc -l` → `375` | đã chạy |
| `packages/utils/src/dirs.ts:955` = `getCrashLogPath` | **Đúng ở `ecd516f`, lệch ở HEAD.** Tại `ecd516f` dòng 955 đúng là `export function getCrashLogPath(agentDir?: string): string {`. Ở HEAD `65cc6c1` nó đã dời lên **`:975`** (3 commit đã thêm 20 dòng vào `dirs.ts`). Số **đúng hôm nay: 975**. Thân hàm ở `:976`: `return dirs.agentSubdir(agentDir, "omp-crash.log", "state");` | `git show ecd516f:packages/utils/src/dirs.ts \| sed -n '955p'` vs `sed -n '975p' packages/utils/src/dirs.ts` |
| `postmortem.ts:661` = `register(id, callback)` | **Đúng ở `ecd516f`, lệch ở HEAD.** Tại `ecd516f` dòng 661 đúng là `export function register(`. Ở HEAD nó ở **`:673`** (docblock bắt đầu 658). | `git show ecd516f:…/postmortem.ts \| sed -n '661p'` vs `sed -n '673p'` |
| `postmortem.ts:453` = `interceptUnhandledRejections(interceptor)` | **Đúng ở `ecd516f`, lệch ở HEAD.** Tại `ecd516f` dòng 453 đúng là chữ ký hàm. Ở HEAD nó ở **`:465`**. | `git show ecd516f:…/postmortem.ts \| sed -n '453p'` vs `sed -n '465p'` |
| `builtin-lifecycle.ts:545-553` = `{ name: "debug", … }` | **Đúng ở cả hai commit.** `sed -n '545p'` → `	{`, `'546p'` → `		name: "debug",`, `'553p'` → `	},` | đã chạy |
| `builtin-session.ts:338-355` cho "mô hình `/usage`" | **Sai phạm vi.** 338-355 chỉ phủ tới giữa `handle`. Entry đầy đủ là **`:338-384`** (`384` là `	},`). `handleTui` bắt đầu ở `:365`. | `awk 'NR>=339 && NR<=395'` → dấu `	},` đầu tiên ở 384 |
| `auto-thinking/classifier.ts:18` cho quy ước `with { type: "text" }` | **Đúng ở `ecd516f`, lệch ở HEAD.** Tại `ecd516f` dòng 18 là import. Ở HEAD dòng 18 là `import type { ModelRegistry }`, các import `.md` ở **`:19-21`**. `advisor/advise-tool.ts:13` thì vẫn đúng. | `rg -n 'with \{ type: "text" \}' classifier.ts` → 19, 20, 21 |
| "Môi trường: `bun test` bị chặn bởi native addon thiếu; `check:ts` chạy được" | **Đúng ở `ecd516f`, SAI ở HEAD.** Addon đã được build (`packages/natives/native/pi_natives.darwin-arm64.node`, 185 MB, 2026-09-29 06:39). `bun test packages/coding-agent/test/memory-redaction.test.ts` → **9 pass / 0 fail**; `bash-executor.test.ts` (import `pi-natives`) → **68 pass / 0 fail**. Xem §5 | đã chạy |
| "Môi trường: git HEAD là `ecd516f`" | **Đúng ở thời điểm viết spec, SAI hôm nay.** HEAD là `65cc6c1`, đã đi qua 3 commit (`5acb674` sửa code thật trong `coding-agent`; `e55bbee` + `329564f` sửa plan). Diffstat trên 4 file mà W17 chạm: `dirs.ts +28/-4`, `postmortem.ts +24/-6`, `builtin-session.ts +14/-1` | `git log --oneline ecd516f..HEAD` |
| "pi-ref không phải thư mục trong repo ultraworkers" | **Đúng.** Checkout riêng tại `/Users/tranquangdang21/Projects/pi-ref/`; cả 8 cây tham chiếu trong task đều tồn tại | `ls -d` cho cả 8 |

### A.2 Neo ĐÚNG (dùng nguyên số trong phiếu này)

| neo | dòng thật chứa |
| --- | --- |
| `pi-ref/…/bug-report.ts:17` | `export const BUG_REPORT_CUSTOM_ENTRY_TYPE = "pi.bug-report";` |
| `pi-ref/…/bug-report.ts:19` | `const REDACTED = "<redacted>";` |
| `pi-ref/…/bug-report.ts:20` | `const SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key\|secret\|token\|password\|passwd\|credential\|authorization\|cookie)(?:$\|[-_])/i;` |
| `pi-ref/…/bug-report.ts:22-23` | `function isSensitiveKey(key: string): boolean {` / `	return SENSITIVE_KEY.test(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));` |
| `pi-ref/…/bug-report.ts:28` | `	const nested = /^([a-z][a-z0-9+.-]*:)([a-z][a-z0-9+.-]*:\/\/.*)$/i.exec(value);` |
| `pi-ref/…/bug-report.ts:52` | `	if (value === undefined) return undefined;` |
| `pi-ref/…/bug-report.ts:137` / `:142` | `interface CollectBugReportMetadataOptions {` / `	includeSession: boolean;` (bắt buộc, không optional) |
| `pi-ref/…/bug-report.ts:163` | `			included: options.includeSession,` |
| `pi-ref/…/bug-report.ts:168` | `			...(options.includeSession ? { cwd: options.cwd } : {}),` |
| `pi-ref/…/bug-report.ts:261` | `	if (bundle.sessionJsonl !== undefined) {` — cổng 2 |
| `pi-ref/…/bug-report.ts:274-276` | `writeBugReportArchive` → `return writeZipArchive(filePath, bugReportFiles(bundle));` — **không port**, dùng `writeArchive` |
| `pi-ref/…/bug-report.ts:282-284` | `BUG_SUMMARY_SYSTEM_PROMPT` + `Do NOT continue the conversation. …` |
| `pi-ref/…/bug-report.ts:286-300` | `BUG_SUMMARY_INSTRUCTIONS`, 4 mục + ràng buộc kết dòng 300 |
| `pi-ref/…/crash-log.ts:6-15` | `export interface CrashRecord { … }` — 9 field, khớp §2b của plan |
| `pi-ref/…/crash-log.ts:17-18` | `const MAX_CRASH_RECORDS = 5;` / `const MAX_AGE = 7 * 24 * 60 * 60 * 1000;` |
| `pi-ref/…/crash-log.ts:20-22` | `function crashLogPath(agentDir = getAgentDir()): string { return join(agentDir, "crashes.json"); }` — **bỏ**, thay bằng `getCrashLogPath()` |
| `pi-ref/…/crash-log.ts:123-143` | `export function recordCrash(…)` — `catch { return undefined; }` |
| `pi-ref/…/crash-log.ts:146-161` | `export function takeUnnotifiedCrash(path = crashLogPath(), now = Date.now())` |
| `pi-ref/…/crash-log.ts:163-169` | `export function clearCrashLog(path = crashLogPath())` |
| `packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:546-548` | `		name: "debug",` / `		icon: "bug",` / `		description: "Open debug tools selector",` |
| `packages/coding-agent/src/slash-commands/builtin-registry.ts:39-47` | `const BUILTIN_SLASH_COMMAND_REGISTRY: ReadonlyArray<SlashCommandSpec> = [` … 7 spread … `];` — `BUILTIN_LIFECYCLE_SLASH_COMMANDS` là spread thứ 4 |
| `packages/coding-agent/src/slash-commands/helpers/usage-report.ts:167` | `export async function buildUsageReportText(runtime: SlashCommandRuntime): Promise<string> {` — **đúng là helper, không phải registry** (nhận định WRONG ANCHOR của plan là đúng) |
| `packages/coding-agent/src/slash-commands/helpers/parse.ts:47` / `:58` | `export function commandConsumed(…)` / `export function parseSubcommand(…)` |
| `packages/coding-agent/src/slash-commands/types.ts:60` / `:68` | `export interface SlashCommandRuntime {` / `	output: (text: string) => Promise<void> \| void;` |
| `packages/coding-agent/src/mcp/errors.ts:45` / `:46` | `const SECRET_KEY =` / `	/(?:authorization\|bearer\|cookie\|secret\|passw(?:or)?d\|pwd\|token\|credential\|api[-_]?key\|private[-_]?key\|access[-_]?key\|signature)/i;` |
| `packages/coding-agent/src/mcp/errors.ts:100` / `:117` | `function sanitizeData(value: unknown, depth: number, seen: WeakSet<object>): unknown {` / `		result[key] = SECRET_KEY.test(key) ? "[redacted]" : sanitizeData(item, depth + 1, seen);` |
| `packages/utils/src/ar/write.ts:49` | `export async function writeArchive(` |
| `packages/utils/src/ar/index.ts` | 11 dòng `export * from "./…"` — mẫu barrel cho `diagnostics/index.ts` |
| `packages/utils/src/dirs.ts:975` | `export function getCrashLogPath(agentDir?: string): string {` (xem A.1 về độ lệch) |
| `packages/utils/src/postmortem.ts:673` | `export function register(` (xem A.1) |
| `packages/utils/src/postmortem.ts:465` | `export function interceptUnhandledRejections(interceptor: (reason: unknown) => boolean): () => void {` (xem A.1) |
| `packages/coding-agent/src/debug/report-bundle.ts:85` | `export async function createReportBundle(options: ReportBundleOptions): Promise<ReportBundleResult> {` |
| `packages/coding-agent/src/debug/report-bundle.ts:90` | `	const outputPath = path.join(reportsDir, `omp-report-${timestamp}.tar.gz`);` |
| `packages/coding-agent/src/advisor/advise-tool.ts:13` | `import adviseDescription from "../prompts/advisor/advise-tool.md" with { type: "text" };` |

### A.3 Claim phủ định (không có hit) — đã kiểm, đều đúng

| claim | lệnh | kết quả |
| --- | --- | --- |
| `getCrashLogPath` có **zero** consumer | `rg -n 'getCrashLogPath' packages/` | đúng một dòng — chính định nghĩa `dirs.ts:975` |
| `packages/coding-agent/src/core/crash-log.ts` không tồn tại | `ls` | `No such file or directory` |
| `packages/coding-agent/src/diagnostics/` không tồn tại | `ls` | `No such file or directory` |
| `packages/coding-agent/src/prompts/diagnostics/` không tồn tại | `ls` | `No such file or directory` |
| `packages/coding-agent/test/diagnostics/` không tồn tại | `ls` | `No such file or directory` |
| `SENSITIVE_KEY` chưa tồn tại trong omp | `rg -n 'SENSITIVE_KEY' packages/` | không hit |
| phép chuẩn hoá camelCase→snake chưa tồn tại | `rg '\(\[a-z0-9\]\)\(\[A-Z\]\)' packages/coding-agent/src packages/utils/src` | không hit |
| không `adm-zip` / `from "tar"` trong `src` | `rg -n 'adm-zip\|from "tar"' packages/coding-agent/src` | hit duy nhất là `tools/browser/relay/extension-assets/THIRD-PARTY-NOTICES.txt:985` (văn bản thông báo, không phải import) |
| `crash-log`/`crashLog` không có gì khác | `rg -ln 'crash-log\|crashLog' packages/` | đúng một file: `packages/natives/CHANGELOG.md` |
| `sanitizeText` tồn tại | `rg -n 'export function sanitizeText'` | `packages/utils/src/sanitize-text.ts:23`, re-export qua `packages/utils/src/index.ts:33` |
| `shortenPath` tồn tại | `rg -n 'export function shortenPath'` | `packages/tui/src/render/render-utils.ts:926` |
| `TempDir` tồn tại | `rg -n 'export class TempDir'` | `packages/utils/src/temp.ts:6` |

---

## Phụ lục B — Quyết định cần chốt trước khi viết dòng đầu

Ba quyết định dưới đây work item đã nêu nhưng **không** chốt. Số thứ tự theo mức chặn.

### B.1 CHẶN — crash ring ghi vào `~/.omp/agent/omp-crash.log` hay `crashes.json`?

Đã kiểm: `getCrashLogPath` (`dirs.ts:975-976`) trả `dirs.agentSubdir(agentDir, "omp-crash.log", "state")` — đuôi `.log` nhưng nội dung là **một mảng JSON** (`writeCrashLog` ghi `JSON.stringify(records, null, 2)`).

Hai lựa chọn:
- **(a)** Dùng `getCrashLogPath()` như plan nói. Đúng tinh thần "tái dùng helper có sẵn", nhưng đặt JSON dưới đuôi `.log`.
- **(b)** Đổi tên trong `dirs.ts` thành `omp-crashes.json`. Sạch hơn, nhưng là một dòng sửa ngoài phạm vi W17 và làm `getCrashLogPath` không còn zero-consumer (điều plan đã ghi ở mục *Cần người quyết*).

**Khuyến nghị: (a).** Lý do: `recordCrash` là best-effort, không có consumer nào khác, và đổi tên một helper dùng chung là thay đổi đọc được ra ngoài W17 với lợi ích thuần thẩm mỹ. Nếu chọn (b), phải mở một `### Changed` trong `packages/utils/CHANGELOG.md`.

### B.2 KHÔNG chặn — `findExtensionStackMatches` (đã hoãn, giữ nguyên lựa chọn của plan)

Đã kiểm `pi-ref/…/core/crash-log.ts:70-120` đọc `extension.sourceInfo.origin === "package" && extension.sourceInfo.source` và `extension.path`. Kiểu `Extension` của pi khai `sourceInfo: SourceInfo` ở `pi-ref/…/core/extensions/types.ts:1344`. Đây là hình dạng của **pi**, không phải của omp.

**Nghị quyết: hoãn.** Đây là tiện nghi chẩn đoán, không thuộc hợp đồng redaction. Port mù là cách commit nhầm hình dạng. Khối bị loại là **75 dòng** (`:46-120`), không phải 65 như plan ước lượng.

### B.3 KHÔNG chặn — giao archive: chỉ ghi cục bộ

Work item **giả định chỉ archive cục bộ**. Đây là lựa chọn đúng và nên giữ: không có endpoint issue-tracker nào trong phạm vi W17, và bịa ra một cái là tự tạo ra một đường rò dữ liệu mới — thứ bài toán này sinh ra để chặn.

Trong `bugReportFiles`, `metadata.session.delivery` nên là literal `"local"` (thay vì union `"zip" | "upload"` của pi ở `pi-ref/…/bug-report.ts:241`). Nếu sau này thêm upload, **phải thêm một nhánh ở cổng 2** chứ không chỉ set cờ.

### B.4 ĐÃ CÓ LỜI KHUYẾN NGHỊ — không refactor `mcp/errors.ts`

Xem Cạm bẫy 2 ở §6. Lý do cụ thể đã kiểm: `sanitizeData` nuôi output lỗi MCP đang chạy, không export ra ngoài, và quy tắc của nó cố ý lỏng hơn (substring, không chuẩn hoá camelCase). Ghi lại làm việc theo sau.
