# Phiếu triển khai — W4: Giới hạn ACP `_omp/usage` vào session được yêu cầu

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md`, mục `## W4.` (dòng 850).
**HEAD khi viết phiếu:** `65cc6c181311b045a163680badee8d3a55c760cd` trên nhánh `milestone-1` (`test(coding-agent): opt in explicitly where the suite is about parsing`).
**Cây tham chiếu:** phần code sửa nằm 100% trong `ultraworkers`. `pi-ref` **có tồn tại** tại `/Users/tranquangdang21/Projects/pi-ref` và được dùng ở mục *Bằng chứng ngoài repo*.

---

## 1. Cái gì thay đổi, quan sát được

Khi hai ACP session cùng sống và client hỏi `_omp/usage` với `sessionId` của session **B**, handler trả về số liệu token/quota của session **A** — sai session, không lỗi, không log, không trạng thái rỗng để báo hiệu. Sau thay đổi, nó trả đúng của B, và khi `sessionId` được truyền vào mà không tồn tại thì trả `{ reports: [] }` chứ không rơi về session khác.

Không có UI mới, không có flag mới, không đổi hành vi cho client gửi `_omp/usage` mà không kèm `sessionId` (chuỗi fallback cũ được giữ nguyên).

---

## 2. Bảng điểm sửa

TRƯỚC/SAU dưới đây là **diff thật đã chạy qua `git diff`**, không phải viết lại từ trí nhớ.

### 2.1 `packages/coding-agent/src/modes/acp/acp-agent.ts` — thân `case "_omp/usage":` (dòng 1180)

TRƯỚC (`sed -n '1180,1188p'`, tab = 3 cho `case`, 4 cho thân):

```ts
		case "_omp/usage": {
			const [firstRecord] = this.#sessions.values();
			const target = firstRecord?.session ?? this.#initialSession;
			if (!target) {
				return { reports: [] };
			}
			const reports = await target.fetchUsageReports();
			return { reports: reports ?? [] };
		}
```

SAU (4 dòng thay 2 — `+3/-1`; `git diff --stat` → `4 +++-`):

```ts
		case "_omp/usage": {
			const requestedId = typeof params.sessionId === "string" ? params.sessionId : undefined;
			const [firstRecord] = this.#sessions.values();
			const record = requestedId !== undefined ? this.#sessions.get(requestedId) : firstRecord;
			const target = record?.session ?? (requestedId === undefined ? this.#initialSession : undefined);
			if (!target) {
				return { reports: [] };
			}
			const reports = await target.fetchUsageReports();
			return { reports: reports ?? [] };
		}
```

Bất đối xứng này là **có chủ đích** và là điểm cốt lõi của fix:

| `params.sessionId` | resolve thành | lý do |
| --- | --- | --- |
| không có | `#sessions.values()[0]`, rồi `#initialSession` | giữ nguyên chuỗi cũ cho external client không bao giờ gửi nó |
| có, tìm thấy | `#sessions.get(sessionId)` | đây là fix |
| có, **không** tìm thấy | `undefined` → `{ reports: [] }` | fallback chính là bug đang sửa |

Gộp hai nhánh sau vào một biểu thức (`?? this.#initialSession` cho mọi trường hợp) là tái tạo đúng bug.

### 2.2 `packages/coding-agent/test/acp-agent.test.ts` — 4 chỗ

| vị trí | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| dòng 6 | import top-level | `import type { Model } from "@oh-my-pi/pi-ai";` | `import type { Model, UsageReport } from "@oh-my-pi/pi-ai";` |
| dòng 147, trong `class FakeAgentSession` (:117) | field + method | *(không tồn tại)* | `usageReports: UsageReport[] \| null = null;` + `async fetchUsageReports(): Promise<UsageReport[] \| null> { return this.usageReports; }` |
| ngay trên `advanceBootstrapGuard()` (:551) | helper ở module scope | *(không tồn tại)* | `function usageReportFor(sessionId: string): UsageReport { return { provider: "test-provider", fetchedAt: 0, limits: [], metadata: { sessionId } }; }` |
| ngay dưới `describe("ACP agent", () => {` (:556) | test mới | *(không tồn tại)* | xem §4 |

`git diff --stat` sau khi áp cả hai file: `32 insertions(+), 2 deletions(-)` (4 dòng ở `acp-agent.ts`, 30 dòng ở test).

### 2.3 Bảy khối comment (phần không đoán được bằng máy)

Bảy site `#sessions.get` — dùng **một** khối giải thích đầy đủ tại `#getSessionRecord` (:1384) và **sáu** cross-reference 2 dòng tại các site còn lại (:758, :1251, :1266, :1400, :2101, :2126). Xem §6.2 về việc bỏ số dòng hard-code trong comment.

---

## 3. Các bước

> Mọi neo dưới đây đã được mở và đọc ở HEAD `65cc6c1`. Wave trước có thể làm trôi số dòng — **khớp theo text trong ngoặc**, không khớp theo số trần.

### Bước 1 — Xác nhận neo case handler

```bash
rg -n '_omp/usage' packages/coding-agent/src/modes/acp/acp-agent.ts
```

Kỳ vọng `1180:			case "_omp/usage": {`. Nếu khác, đọc quanh dòng trả về.

### Bước 2 — Sửa thân case (thay 2 dòng, thêm 3)

Sửa đúng khối ở §2.1. Giữ nguyên `if (!target) { return { reports: [] }; }` và `return { reports: reports ?? [] };` — đó là hợp đồng có sẵn, không phải chỗ để cải thiện.

Bắt buộc phải có `typeof params.sessionId === "string"`: chữ ký `extMethod` là
`async extMethod(method: string, params: { [key: string]: unknown })` (dòng 1131), nên `params.sessionId` có kiểu `unknown` và **không** truyền thẳng vào `.get()` được.

### Bước 3 — Sáu cross-reference comment

Thêm ngay phía trên từng dòng sau (2 dòng comment, không có gì khác):

| neo | câu neo vào | hàm bao |
| --- | --- | --- |
| `:758` | `const record = this.#sessions.get(params.sessionId);` | `closeSession` |
| `:1251` | `const existing = this.#sessions.get(sessionId);` | `#loadManagedSession` |
| `:1266` | `const existing = this.#sessions.get(sessionId);` | `#resumeManagedSession` |
| `:1400` | `const loaded = this.#sessions.get(sessionId);` | `#resolveForkSourceSessionPath` |
| `:2101` | `const record = this.#sessions.get(sessionId);` | `#scheduleBootstrapUpdates` (định nghĩa ở `:2077`, bên trong `setTimeout`) |
| `:2126` | `if (this.#sessions.get(sessionId) !== record) {` | `#emitBootstrapUpdates` |

Nội dung (2 dòng):
```ts
	// No attachment check — see `#getSessionRecord` for why that is safe today
	// and why adding a fence here would break the single-client stdio path.
```

⚠️ `:1251` và `:1266` **giống nhau từng byte** (đã kiểm bằng `cat -A`). Xem §6.2.

### Bước 4 — Khối comment đầy đủ tại `#getSessionRecord`

Neo `:1384` — dòng `const record = this.#sessions.get(sessionId);` ngay dưới `#getSessionRecord(sessionId: string)` ở `:1383`. Đây là site chuẩn: `setSessionMode` (`:767`), `setSessionConfigOption` (`:778`), `prompt` (`:824`), `cancel` (`:1076`) đều đi qua đây, và `#assertMatchingCwd` nằm ngay dưới ở `:1391`.

⚠️ **Sửa nội dung LONG_COMMENT của plan trước khi gõ** — xem §6.3, khối đó hard-code bảy số dòng sẽ tự già ngay trong PR đầu tiên.

### Bước 5 — KHÔNG thêm guard

Không `throw`, không `if (!record.attachment)`, không fence nào ở bảy site. Sản phẩm bàn giao phần này **chỉ là comment**. Nếu đang viết dòng kiểm tra thì đã đi sai — xem §6.1.

### Bước 6 — Import type ở test

`:6` → `import type { Model, UsageReport } from "@oh-my-pi/pi-ai";`. Chỉ import top-level; AGENTS.md cấm `await import()` và `import("...").Type` ở vị trí type.

### Bước 7 — Thêm fake member

Trong `class FakeAgentSession` (`:117`), đặt cạnh `usageFallbackConfirmer` (`:147`). Fake **hiện không có** `fetchUsageReports` (đã xác nhận: `rg -n 'fetchUsageReports' packages/coding-agent/test/acp-agent.test.ts` → exit 1, không có dòng nào). Không thêm thì handler gọi `target.fetchUsageReports()` sẽ ném `TypeError` ở runtime.

Method phải `async`, trả `this.usageReports`. Nó mirror `AgentSession.fetchUsageReports(signal?: AbortSignal): Promise<UsageReport[] | null>` thật; fake được phép bỏ qua `signal` vì call site ở `:1186` không truyền signal nào.

### Bước 8 — Helper `usageReportFor`

Ở module scope, ngay trên `advanceBootstrapGuard()` (`:551`):
```ts
function usageReportFor(sessionId: string): UsageReport {
	return { provider: "test-provider", fetchedAt: 0, limits: [], metadata: { sessionId } };
}
```

Fixture này **đầy đủ kiểu, không cần cast**: `packages/ai/src/usage.ts:139` khai
`interface UsageReport { provider: Provider; fetchedAt: number; limits: UsageLimit[]; resetCredits?; notes?; metadata?; raw? }`.
`Provider` là `export type Provider = string;` tại `packages/catalog/src/types.ts:138` (đã xác nhận đúng dòng), nên `"test-provider"` hợp lệ.

Nhúng `sessionId` vào `metadata` là điều làm phép assert phủ định thành **có nghĩa** thay vì tautology — hai session cho ra hai payload khác nhau thật sự.

### Bước 9 — Test mới

Ngay dưới `describe("ACP agent", () => {` (`:556`). Chép nguyên văn phần setup hai session từ test sẵn có ở `:558-561`. Thân test ở §4.

### Bước 10 — Chạy cổng

Xem §5. **Không cần `bun install` / `bun run build:native`** ở checkout này — xem §5.1.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/acp-agent.test.ts`
**Tên test:** `"scopes _omp/usage to the session the client asked about"`

```ts
	it("scopes _omp/usage to the session the client asked about", async () => {
		const harness = await createHarness();
		const first = await harness.agent.newSession({ cwd: harness.cwdA, mcpServers: [] });
		const second = await harness.agent.newSession({ cwd: harness.cwdB, mcpServers: [] });

		const firstSession = harness.findSession(first.sessionId)!;
		const secondSession = harness.findSession(second.sessionId)!;
		firstSession.usageReports = [usageReportFor(first.sessionId)];
		secondSession.usageReports = [usageReportFor(second.sessionId)];

		const result = (await harness.agent.extMethod("_omp/usage", { sessionId: second.sessionId })) as {
			reports: UsageReport[];
		};

		expect(result).toEqual({ reports: [usageReportFor(second.sessionId)] });
		// Both sessions are live. Session 1's numbers must not leak into the
		// answer to a question about session 2.
		expect(result.reports).not.toContainEqual(usageReportFor(first.sessionId));
	});
```

**Nếu hồi quy, người dùng thấy gì:** một ACP client có hai session sống sẽ render sai panel quota/token — hỏi về session B và hiện số của session A — **không có lỗi, không có trạng thái rỗng, không có gì trong log** để phân biệt với output đúng.

**Vì sao phải có chân phủ định:** với chỉ một session thì bug hoàn toàn vô hình. Một test chỉ mở một session sẽ **pass ngay cả với code hỏng**. Hai assertion là cần cả hai: `toEqual` khẳng định payload đúng, `not.toContainEqual` chặn khả năng cả hai session cùng được trả về.

**Biên còn lại, do cùng code production phủ:** `params.sessionId` trỏ tới session không có trong `#sessions` phải trả `{ reports: [] }`, **không** được trả reports của initial session. Đây là nửa phủ định của fix và cũng là chỗ dễ "sửa sai" nhất. Plan nói *assert nếu rẻ* — **đây là chỗ rẻ**: thêm vào cùng test, một `extMethod` call + một `expect(result).toEqual({ reports: [] })`, không dựng thêm test mới.

```ts
		// A sessionId that is not in the map must not fall back to another
		// session's numbers — falling back IS the bug being fixed.
		const missing = (await harness.agent.extMethod("_omp/usage", { sessionId: "no-such-session" })) as {
			reports: UsageReport[];
		};
		expect(missing).toEqual({ reports: [] });
```

**Không test phần comment.** Nó ghi lại một giả định về transport, không có hành vi quan sát được. Theo AGENTS.md, assert trên *text* của comment là source-grep bị cấm; assert "code đã chạy" là placeholder.

---

## 5. Cổng

### 5.1 Tiền đề — **plan đã lỗi thời ở đây**

Plan viết checkout này không có `node_modules` nên phải chạy `bun install` + `bun run build:native` trước. **Điều đó không còn đúng.** `node_modules` tồn tại (tạo 2026-09-28 07:44) và test chạy được ngay:

```
$ ls -d node_modules
node_modules
$ bun test packages/coding-agent/test/acp-agent.test.ts -t "replays messageIds"
 1 pass / 77 filtered out / 0 fail / 10 expect() calls    [2.04s]
```

Baseline thật trước khi đụng gì: **78 test, 0 fail**. Sau khi thêm test mới: **79 test**. Không có bước tiền đề nào.

### 5.2 Cổng chính — có ĐỎ ĐƯỢC, đã chứng minh bằng chạy thật

Đây là câu quan trọng nhất của phiếu, nên nó được **chạy thật**, không chỉ lý luận.

**Trước fix** (chỉ mới thêm phía test, `acp-agent.ts` còn nguyên HEAD):

```
$ bun test packages/coding-agent/test/acp-agent.test.ts -t "scopes _omp/usage"

expect(result).toEqual(expected)
@@ -6,3 +6,3
        "metadata": {
-         "sessionId": "01a0ea7b-5aa9-7000-93e5-a097fb6f23c0",     <- expected (second)
+         "sessionId": "01a0ea7b-5a95-7000-9a93-ff7c92f5de71",     <- received (first)
        },
 0 pass / 1 fail / 1 expect() calls
```

**Sau fix:**

```
$ bun test packages/coding-agent/test/acp-agent.test.ts -t "scopes _omp/usage"
 1 pass / 78 filtered out / 0 fail / 2 expect() calls
```

**Vì sao cổng này ĐỎ THẬT, không giả:** handler cũ bỏ qua `params.sessionId` và trả `firstRecord` một cách tất định; hai session có `sessionId` khác nhau nên hai payload khác nhau thật. Assertion so sánh payload → đỏ thật khi thiếu fix. `not.toContainEqual` giữ nó không thành tautology. Đây không phải loại cổng luôn xanh.

**Cổng thứ cấp — cả ba đều đã chạy và xanh:**

| cổng | kết quả thực tế |
| --- | --- |
| `bun test packages/coding-agent/test/acp-agent.test.ts` (cả file) | `79 pass / 0 fail / 339 expect() calls` |
| `cd packages/coding-agent && bun run check:types` | exit 0 (chạy `tsgo -p tsconfig.json --noEmit`, **không phải** `tsc`) |
| `bunx oxlint <2 file>` + `bunx oxfmt --check <2 file>` | oxlint không báo gì; oxfmt: `All matched files use the correct format.` |

`bun run check:ts` ở gốc repo = `check:tools` (`oxlint . && oxfmt --check …`) **rồi** `--filter './packages/*' --sequential check:types`. Với thay đổi chỉ TypeScript thì hai lệnh trên tạo đúng những gì `check:ts` làm cho package này, chạy nhanh hơn nhiều. `bun run check:ts` đầy đủ vẫn nên chạy trước khi mở PR.

**Cổng không tự động cho phần comment:** cố ý. Reviewer xác nhận 7 khối comment bằng cách **đọc**.

### 5.3 Cần sửa một chi tiết của plan về `-t "usage"`

Plan dùng `bun test … -t "usage"` làm cổng. Filter đó **không chọn lọc** — sau khi thêm test, nó khớp **hai** test: test mới và `"replays messageIds and returns turn usage for prompts"` (`:1152`). Dùng filter hẹp hơn:

```bash
bun test packages/coding-agent/test/acp-agent.test.ts -t "scopes _omp/usage"
```

---

## 6. Cạm bẫy riêng của work item này

### 6.1 Dễ làm sai nhất: thêm fencing thay vì viết comment

Bảy site `#sessions.get` hôm nay an toàn **chỉ vì** transport stdio mang đúng một client mỗi kết nối — đó là đặc tính của transport, không phải quyết định thiết kế. Một fence ở đó phá vỡ chính đường single-client hợp lệ.

Nhìn dễ bị dẫn sai vì có sẵn `#getSessionRecord` ném `Unsupported ACP session: ${sessionId}` khi không tìm thấy, và `#assertMatchingCwd` (`:1391`) là một kiểm tra "tương tự". Nhưng `#assertMatchingCwd` kiểm tra **cwd**, không phải client identity. Cả hai đều không phải mẫu để sao chép vào W4.

Nếu đang viết `if (!record.attachment) throw` → dừng lại. Đó là đáp án sai.

Bằng chứng ngoài repo cho kết luận thiết kế (tương phản hoàn toàn với cách làm sai):
`pi-ref/packages/server/src/session-router.ts:227-230` giữ map tường minh và phủ chặn ở **router**, không phủ ở call site:

```ts
		const attachment = this.attachmentsByClient.get(client);
		if (!attachment || attachment.session.id !== target.sessionId || attachment.id !== target.attachmentId) {
			throw new SessionNotAttachedError();
		}
```

Cùng ý, `pi-ref/packages/server/test/conformance.test.ts:223` — `test("requires the requesting client to hold the targeted Session attachment", …)` — và `:246` — `test("rejects a stale attachment route after switching Sessions", …)`. **Hai dòng này trích đúng**; xem §7.

### 6.2 Hai dòng `#sessions.get` giống nhau từng byte

`#loadManagedSession` (`:1251`) và `#resumeManagedSession` (`:1266`) có cặp dòng **giống hệt nhau**, kể cả thụt lề:

```
1251:│	│const existing = this.#sessions.get(sessionId);
1266:│	│const existing = this.#sessions.get(sessionId);
```

`replace_all` / "thêm comment trước mọi dòng khớp `this.#sessions.get`" sẽ đặt comment sai chỗ hoặc nhân bản. Phải định vị **theo tên hàm bao quanh** (`#loadManagedSession` / `#resumeManagedSession`), không theo text dòng.

Tương tự: `:1384` và `:2101` cùng là `const record = this.#sessions.get(sessionId);` — phân biệt được **chỉ bằng thụt lề** (2 tab vs 3 tab). Đừng khớp bằng `trim()`.

### 6.3 LONG_COMMENT của plan hard-code số dòng — tự già trong PR đầu tiên

Khối comment mà plan đưa chứa đúng câu này:

```
	// A future socket or WebSocket transport voids this assumption at ALL SEVEN
	// `#sessions.get` sites at once: :758, :1251, :1266, :1384, :1400, :2101, :2126.
```

Bảy con số đó chỉ đúng **tại HEAD `65cc6c1`**. Chính bước 1 của plan đã cảnh báo "số dòng có thể trôi nếu wave trước đã vào" — nhưng rồi lại nhét số dòng vào comment, tự mâu thuẫn. Sửa thành tên hàm, vừa bền vừa đọc tốt hơn:

```
	// A future socket or WebSocket transport voids this assumption at every
	// `#sessions.get` site at once — `closeSession`, `#loadManagedSession`,
	// `#resumeManagedSession`, `#getSessionRecord`, `#resolveForkSourceSessionPath`,
	// `#scheduleBootstrapUpdates`, `#emitBootstrapUpdates`.
```

Tên hàm không bao giờ cần cập nhật khi có wave khác chèn dòng.

### 6.4 Fix "nửa vời" khiến test vẫn xanh

Nếu thêm `?? this.#initialSession` vào nhánh *sessionId có mặt nhưng không tìm thấy*, test hiện tại **vẫn xanh** — vì nó chỉ hỏi về một session tồn tại. Đó là lý do §4 khuyến nghị thêm assertion `{ reports: [] }`: nó là thứ bắt đúng lỗi "sửa một nửa" phổ biến nhất ở work item này.

### 6.5 `-t "usage"` không chọn lọc

Xem §5.3.

### 6.6 Bảy site, bảy câu hỏi khác nhau

`:2126` là `if (this.#sessions.get(sessionId) !== record) {` — một phép so khớp **danh tính với record đã bắt**, không phải tra cứu. Đừng dán nhầm comment "no attachment check" mà tưởng nó là một lookup.

---

## 7. Kết quả kiểm lại từng neo

**Số neo đã kiểm: 39. Đúng: 34. Sai/hỏng: 5.**

### Neo đúng

| neo | nội dung đọc được |
| --- | --- |
| `acp-agent.ts:1180` | `case "_omp/usage": {` |
| `acp-agent.ts:1181` | `const [firstRecord] = this.#sessions.values();` |
| `acp-agent.ts:1182` | `const target = firstRecord?.session ?? this.#initialSession;` |
| `acp-agent.ts:1183-1185` | `if (!target) { return { reports: [] }; }` |
| `acp-agent.ts:1186` | `const reports = await target.fetchUsageReports();` |
| `acp-agent.ts:1187` | `return { reports: reports ?? [] };` |
| `acp-agent.ts:758` | `const record = this.#sessions.get(params.sessionId);` trong `closeSession` |
| `acp-agent.ts:1251` | `const existing = this.#sessions.get(sessionId);` trong `#loadManagedSession` |
| `acp-agent.ts:1266` | `const existing = this.#sessions.get(sessionId);` trong `#resumeManagedSession` |
| `acp-agent.ts:1384` | `const record = this.#sessions.get(sessionId);` trong `#getSessionRecord` |
| `acp-agent.ts:1400` | `const loaded = this.#sessions.get(sessionId);` trong `#resolveForkSourceSessionPath` |
| `acp-agent.ts:2101` | `const record = this.#sessions.get(sessionId);` trong `setTimeout` của `#scheduleBootstrapUpdates` (định nghĩa `:2077`) |
| `acp-agent.ts:2126` | `if (this.#sessions.get(sessionId) !== record) {` trong `#emitBootstrapUpdates` |
| `acp-agent.ts:1391` | `#assertMatchingCwd(session: AgentSession, cwd: string): void {` |
| `acp-agent.ts:1253`, `:1268` | hai call site duy nhất của `#assertMatchingCwd` — đúng, không có chỗ thứ ba |
| `acp-agent.ts:1383` | `#getSessionRecord(sessionId: string): ManagedSessionRecord {` |
| `acp-agent.ts:767, 778, 824, 1076` | bốn call site của `#getSessionRecord` (`setSessionMode`, `setSessionConfigOption`, `prompt`, `cancel`) |
| `acp-agent.ts:1131` | `async extMethod(method: string, params: { [key: string]: unknown }): Promise<{ [key: string]: unknown }> {` |
| `acp-agent.ts:1131-1208` | switch trải đúng phạm vi plan nêu; 6 case, **không** case nào đọc `sessionId` (`rg 'sessionId' \| awk -F: '$1>=1131 && $1<=1212'` → rỗng) |
| `acp-agent.ts:721` | `for (const record of this.#sessions.values()) {` — vòng lặp, không thuộc bảy site |
| `test:6` | `import type { Model } from "@oh-my-pi/pi-ai";` |
| `test:117` | `class FakeAgentSession {` |
| `test:147` | `usageFallbackConfirmer: ((confirmation: UsageFallbackConfirmation) => Promise<boolean>) \| undefined;` |
| `test:551` | `async function advanceBootstrapGuard(): Promise<void> {` |
| `test:556` | `describe("ACP agent", () => {` |
| `test:558-561` | test `supports multiple live ACP sessions…` với `first`/`second` gọi `newSession` hai lần |
| `catalog/src/types.ts:138` | `export type Provider = string;` — đúng dòng, đúng nội dung |
| `ai/src/usage.ts:139` | `export interface UsageReport {` — xác nhận fixture §3-bước-8 đủ field bắt buộc |
| `pi-ref …/conformance.test.ts:223` | `test("requires the requesting client to hold the targeted Session attachment", async () => {` |
| `pi-ref …/conformance.test.ts:246` | `test("rejects a stale attachment route after switching Sessions", async () => {` |

### Neo hỏng — ghi ra, KHÔNG sửa trong tài liệu kế hoạch

| claim trong plan | thực tế | ảnh hưởng tới việc gõ |
| --- | --- | --- |
| `packages/coding-agent/src/session/agent-session.ts:11210` là chữ ký `AgentSession.fetchUsageReports` | Chữ ký thật ở **`:11356`**: `async fetchUsageReports(signal?: AbortSignal): Promise<UsageReport[] \| null> {`. Dòng 11210 là dòng cuối của một khối JSDoc về `resumeAfterAskReanswer` | Chỉ ảnh hưởng mô tả. Dùng `:11356` khi viết PR description. Bước 7 không cần dòng này |
| HEAD là `ecd516f35b6…` | HEAD thật `65cc6c181311b045a163680badee8d3a55c760cd`. Bảy neo của plan vẫn resolve **đúng** tại HEAD này, nên không neo nào cần dịch | Vô hại với code; nhưng đừng ghi `ecd516f` vào PR |
| "checkout này hoàn toàn không có `node_modules`"; `bun test` fail với `Cannot find module '@oh-my-pi/pi-agent-core'`; `bun run check:ts` chết ở `oxlint: command not found` | `node_modules` tồn tại. `bun test` chạy được (78 test xanh trước thay đổi). `oxlint`/`oxfmt`/`tsgo` đều chạy được | Plan bảo chạy `bun install` + `bun run build:native` làm tiền đề — **bỏ**, tốn thời gian vô ích. §5.1 |
| "file test … 3488 dòng" | `wc -l` → **3450** | Vô hại; chỉ đừng dùng con số này trong PR |
| Bảng "Đính chính" của plan: "`pi-ref/` không tồn tại trong repo này, nên các dòng được trích không thể kiểm tra và không được trích trong khối comment" | **Sai.** `/Users/tranquangdang21/Projects/pi-ref` tồn tại; `packages/server/test/conformance.test.ts` tồn tại (502 dòng); `:223` và `:246` trích **đúng nội dung** (bảng neo đúng ở trên). Bằng chứng mạnh hơn nữa: `pi-ref/packages/server/src/session-router.ts` có `attachmentsByClient` và `releaseAttachment` | **Không bỏ trích dẫn.** Plan khuyên gỡ vì tin là repo không có; thực tế có. Giữ `:223`/`:246` trong PR — đó là bằng chứng thật cho kết luận thiết kế ở §6.1. |

### Điểm plan nói đúng và cần giữ nguyên

- Bảy site `#sessions.get` và `#assertMatchingCwd` chỉ được gọi ở `:1253` + `:1268` — đếm lại độc lập, khớp.
- Không case nào khác trong `extMethod` đọc `params.sessionId` — đã kiểm bằng range filter, rỗng.
- `FakeAgentSession` hoàn toàn không có `fetchUsageReports` — `rg` exit 1. Harness hiện hữu đã thoả mãn ràng buộc "không `mock.module()`, dựng trên `SessionManager` thật" (`FakeAgentSession` gọi `SessionManager.create(cwd)`; `createHarness` dựng `AcpAgent` thật trên `AgentSideConnection` giả, cast qua `as unknown as AgentSession`). Việc thật trong file test là **thêm member vào fake**.
- `_omp/usage` không có caller nào trong repo (`rg -n '_omp/usage' -g '!*.md'` chỉ trả về case label tại `:1180`) → nó do external client tiêu thụ, nên chuỗi fallback `?? this.#initialSession` phải được giữ.

### Câu hỏi cần người quyết (chưa chặn việc bắt đầu)

1. `sessionId` có mặt nhưng không tồn tại → `{ reports: [] }` (lựa chọn của plan) hay ném ACP error? Lựa chọn ở đây là `[]` vì handler đã có sẵn nhánh đó và ném lỗi biến một lỗ hổng dữ liệu thành lỗ client. **Cần xác nhận trước khi merge**; đổi lại sau chỉ là sửa một dòng.
2. Một khối đầy đủ tại `#getSessionRecord` + cross-reference ở sáu site, hay bảy bản sao? Giữ cách chia này và **nêu rõ trong mô tả PR** vì plan gốc nói "đặt comment tại cả bảy điểm".

### Trạng thái repo sau khi kiểm

Cả hai file đã được `git checkout --` về HEAD. `git status --porcelain` cho cả hai path: **rỗng**.
