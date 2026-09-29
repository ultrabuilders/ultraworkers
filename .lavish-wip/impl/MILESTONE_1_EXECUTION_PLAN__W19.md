# PHIẾU TRIỂN KHAI — W19 · `GAP-M1-19` — Cấm `console.*` ở tầng thư viện bằng lint

**Kế hoạch:** `MILESTONE_1_EXECUTION_PLAN.md` § `## W19.` (dòng 3857–3965)
**Sổ nguồn:** `.lavish-wip/GAP-REGISTER-2.md` mục `GAP-M1-19`, nguồn `codex.57`
**Trạng thái phiếu:** mọi neo trong sổ đã mở và đọc. **4 neo hỏng** — ghi ở §7, không sửa trong tài liệu kế hoạch.
**Ngày kiểm:** 2026-09-29 · cây: `/Users/tranquangdang21/Projects/ultraworkers` (ultraworkers = `omp`), `oxlint 1.85.0`.

---

## 1. Cái gì thay đổi, quan sát được

Một dòng `console.log` mới bên trong bất kỳ file nào của `packages/*/src/**` làm `bun run lint` **đỏ ngay lập tức**, và mỗi file được miễn phải khai một lý do được đặt tên trong test — nên `console.*` trong tầng thư viện trở thành thứ bị chặn bởi máy chứ không phải thứ được mong muốn bằng văn xuôi trong `AGENTS.md`.

Không có bề mặt người dùng mới. Đây là hàng rào cho người viết sau.

---

## 2. Bảng điểm sửa

### 2.1 `.oxlintrc.json` — phải **đổi hình dạng rule**, không chỉ thêm một dòng

Đây là **sửa lớn nhất** so với hình dạng mà sổ vẽ, và là chỗ làm cổng trở nên giả nếu gõ sai.

| path | symbol | TRƯỚC (trích từ file thật) | SAU |
| --- | --- | --- | --- |
| `.oxlintrc.json` | khối `rules` | dòng 6–30: khối `rules` kết thúc ở `"eslint/no-unused-expressions": "off"`; **không** có `eslint/no-console` | **không thêm** `eslint/no-console` vào `rules` ở cấp gốc — xem §2.2 vì sao |
| `.oxlintrc.json` | khối `overrides` | **không tồn tại** (`python3` đọc key: `['$schema','categories','rules','ignorePatterns']`) | thêm `overrides` 2 khối, **đúng thứ tự** ở §2.2 |
| `.oxlintrc.json` | `ignorePatterns` | dòng 31–58, **26** mục (không phải 24 — xem §7.2) | **không đụng**. Gate 4 của sổ giữ nguyên |

### 2.2 Hình dạng đúng của `.oxlintrc.json` — và vì sao khác sổ

Sổ vẽ `eslint/no-console: "error"` ở **cấp gốc**. Đo thật cho thấy hình dạng đó **đỏ 916 chỗ trên 153 file** vì `lint:tools` là `oxlint .` — quét **cả repo**, không chỉ `packages/*/src/**`:

```
$ python3 -c "import json;print(json.load(open('package.json'))['scripts']['lint:tools'])"
oxlint .
```

Hình dạng dùng thật — **bật rule bằng `overrides`, không bằng `rules` ở gốc**:

```jsonc
// .oxlintrc.json — bổ sung vào file hiện có, KHÔNG thay khối ignorePatterns
"overrides": [
	{
		"files": ["packages/*/src/**"],
		"rules": { "eslint/no-console": "error" }
	},
	{
		"files": [
			"packages/stats/src/index.ts",
			"packages/utils/src/logger.ts",
			"packages/*/src/cli/**",
			"packages/*/src/commands/**",
			"packages/metaharness/src/tb/cli.ts"
		],
		"rules": { "eslint/no-console": "off" }
	}
]
```

**Ba điều đo được về hình dạng này — cả ba đều là bẫy nếu gõ sai:**

1. **Allow-list PHẢI nằm SAU khối bật rule.** Probe trên cây thật, cùng hai khối, chỉ đảo thứ tự:

   ```
   "off" đặt SAU  "error" → packages/demo/src/lib/wire.ts lỗi, cli/main.ts sạch   ✅
   "off" đặt TRƯỚC "error" → cli/main.ts CŨNG lỗi                              ❌
   ```
   Override sau thắng. Đảo thứ tự ⇒ allow-list chết âm thầm, lint đỏ ở chính các file entrypoint.

2. **`overrides` ĐỦ sức bật rule lên.** Probe: chỉ có `overrides` với `"eslint/no-console": "error"`, không có khóa trong `rules` ⇒ vẫn bắt lỗi. Không cần (và không nên) thêm ở gốc.

3. **Đường dẫn trong `overrides`/`ignorePatterns` resolve theo thư mục chứa file config.** Đo được bằng cách chạy cùng một config từ hai nơi:

   ```
   oxlint -c /tmp/w19-proposed.oxlintrc.json .   → 1367 chỗ, crates/** python/** **/*.mjs ĐỎ (ignorePatterns không ăn)
   oxlint -c .oxlintrc.w19probe.json       .    →  916 chỗ, crates/** python/** **/*.mjs XANH
   ```
   Chạy `bun run lint` từ gốc repo thì đúng là hình thứ hai. Nhưng ai chạy `oxlint -c <đường dẫn tuyệt đối>` thì `ignorePatterns` 26 mục **biến mất im lặng** và nhận 451 chỗ lỗi rác.

### 2.3 Danh sách file thư viện phải sửa tay — **17 file, 87 chỗ**

Đây là danh sách thật, lấy từ `oxlint` chạy với hình dạng ở §2.2 (không phải từ trí nhớ, không phải từ `git grep` — xem §7.4):

| số chỗ | path |
| ---: | --- |
| 25 | `packages/stats/src/index.ts` → **miễn**, xem §2.4 |
| 18 | `packages/typescript-edit-benchmark/src/generate.ts` |
| 10 | `packages/coding-agent/src/compress/index.ts` |
| 6 | `packages/typescript-edit-benchmark/src/edit-shape-stats.ts` |
| 5 | `packages/coding-agent/src/config/model-resolver.ts` |
| 4 | `packages/mnemopi/src/core/extraction.ts` |
| 3 | `packages/mnemopi/src/core/veracity-consolidation.ts` |
| 3 | `packages/collab-web/src/lib/socket.ts` |
| 3 | `packages/agent/src/telemetry.ts` |
| 2 | `packages/utils/src/logger.ts` → **miễn**, xem §2.4 |
| 2 | `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts` |
| 1 | `packages/mnemopi/src/diagnose.ts` |
| 1 | `packages/mnemopi/src/core/beam/index.ts` |
| 1 | `packages/collab-web/src/lib/client.ts` |
| 1 | `packages/coding-agent/src/blob-broker/server.ts` |
| 1 | `packages/ai/src/providers/cursor/interaction-query.ts` |
| 1 | `packages/ai/src/providers/cursor.ts` |

**Tổng: 87 chỗ / 17 file.** Hai dòng "→ miễn" không sửa; chúng nằm trong allow-list của §2.2.

### 2.4 Hai mục allow-list mà sổ **không** có — thiếu thì cổng đỏ vì lý do sai

**(a) `packages/stats/src/index.ts` — sổ bỏ sót, và nó là file lớn nhất trong danh sách.**

Đo bằng cách liệt kê mọi `bin` trỏ vào `src/`, thay vì đoán:

```
$ python3 - <<'PY'   # duyệt packages/*/package.json, in bin nào bắt đầu bằng ./src/
packages/stats   omp-stats   ./src/index.ts
TOTAL bin-under-src: 1
PY
```

`packages/stats/package.json` có:
```json
"bin": { "omp-stats": "./src/index.ts" }
```

Nó là **entrypoint CLI độc lập** — đúng nghĩa exception trong `AGENTS.md:227`. Cả 25 `console.log` của nó là output cho người dùng:

```
packages/stats/src/index.ts:59: 	console.log("\n=== AI Usage Statistics ===\n");
packages/stats/src/index.ts:61: 	console.log("Overall:");
packages/stats/src/index.ts:62: 	console.log(`  Requests: ${formatNumber(overall.totalRequests)} …`);
```

Không miễn thì kỹ sư chỉ có hai lựa chọn đều sai: đụng vào một CLI đang chạy, hoặc thêm mục thứ tư vào allow-list mà không ghi lý do.

**(b) `packages/utils/src/logger.ts` — chính package logger.**

```
packages/utils/src/logger.ts:431: export function printTimings(): void {
packages/utils/src/logger.ts:433: 		console.error("\n--- Startup Timings ---\n(no markers)\n");
packages/utils/src/logger.ts:476: 	console.error(lines.join("\n"));
```

Đây là **chính là sink** — `printTimings()` in ra stderr có chủ đích. Không miễn thì kỹ sư bị buộc định tuyến chính sink của logger qua chính logger đó.

### 2.5 Sửa hai file được gọi tên trong sổ

| path | symbol | TRƯỚC (trích nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/ai/src/providers/cursor.ts` | `cursorDebug` (ghi debug log tới `stderr`) | dòng 405: ``console.error(`[CURSOR] ${type}${subtype ? `: ${subtype}` : ""}${dataStr}`);`` | `logger.debug("[CURSOR] …")` + `import { logger } from "@oh-my-pi/pi-utils"` ở đầu file. Đây là case đáng chú ý nhất vì nó nằm **trên đường wire provider** — `AGENTS.md:217` nói loại này "corrupts rendering or protocols". |
| `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts` | `migrate()` — tham số `logFn` | dòng 149: `	logFn: (line: string) => void = console.log,` | đổi default thành `noop` đã export, hoặc bắt buộc caller truyền `logFn`. **Không** phải `logger.log`. |
| `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts` | `migrate()` — fallback `??` | dòng 156: `	const effectiveLog = options.logFn ?? console.log;` | `const effectiveLog = options.logFn ?? noop;` |

**Vì sao hai dòng mnemopi không sửa được bằng cách đổi tên:** `console.log` ở đây là **giá trị mặc định của tham số hàm**, không phải lệnh in. `logger.log` không tồn tại trong `logger` của repo (đã kiểm: `logger` có `.error/.warn/.debug/.info`), nên `logger.log` sẽ không biên dịch; và nếu thay bằng `logger.debug`, hàm vẫn **mặc định ghi log ra file** thay vì im — tức là đổi hành vi, không phải sửa lỗi. Đây đúng là cái bẫy sổ cảnh báo ở mục *Cách sai dễ nhất*.

### 2.6 Không sửa

| path | lý do (đã đo) |
| --- | --- |
| `packages/tui/src/components/tab-bar.ts` | dòng 54 nằm trong khối `@example` của JSDoc: ` * tabBar.onTabChange = (tab) => console.log(\`Switched to ${tab.id}\`);` — là **chú thích**, `oxlint` không bắt. `rg 'console\.' packages/tui/src/` chỉ ra **đúng một** dòng này. Đừng "sửa" nó. |
| `packages/tui/{bench,test,scripts}/**` | ngoài `packages/*/src/**` nên hình dạng §2.2 không chạm tới. |
| `.oxlintrc.json` khối `ignorePatterns` | gate 4 của sổ. 26 mục, dòng 31–58. |
| `packages/*/src/cli/**`, `packages/*/src/commands/**`, `packages/metaharness/src/tb/cli.ts` | 18 file bị allow-list che; xem §5.2 về việc 18 file đó cần lý do. |

---

## 3. Các bước — mỗi bước có neo đã kiểm

1. **Sửa `.oxlintrc.json`** theo §2.2: thêm `overrides` 2 khối, allow-list **sau** khối bật rule, và **không** đụng `ignorePatterns`.
   *Neo:* `.oxlintrc.json:31` mở đầu `ignorePatterns` — khối phải giữ nguyên từ đây.

2. **Thêm 2 mục allow-list còn thiếu**: `packages/stats/src/index.ts`, `packages/utils/src/logger.ts` — kèm lý do, cùng lúc viết test ở bước 4.
   *Neo:* `packages/stats/package.json` (`"bin": { "omp-stats": "./src/index.ts" }`); `packages/utils/src/logger.ts:431` (`export function printTimings`).

3. **Sửa 15 file còn lại trong §2.3 sang `logger`** (87 chỗ trừ 2 file đã miễn = 60 chỗ sửa tay; 27 chỗ thuộc 2 file miễn).
   *Neo:* `packages/ai/src/providers/cursor.ts:405`; `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts:149` và `:156`.

4. **Viết test allow-list** ở `packages/coding-agent/test/lint-no-console-allowlist.test.ts` — nội dung hợp đồng ở §4.
   *Neo:* thư mục `packages/coding-agent/test/` đã tồn tại; test đọc file cấu hình ở gốc repo bằng `import.meta.dir` — copy cách làm của `packages/coding-agent/test/acp-initialize-conformance.test.ts`.

5. **Cổng đỏ ngay** — thêm một `console.log` vào file thư viện bất kỳ, `bun run lint` phải **ĐỎ**, xoá đi phải xanh lại. Đây là bằng chứng nâng đỡ bắt buộc.

6. `bun run check:ts`.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/lint-no-console-allowlist.test.ts` (mới)

Hợp đồng quan sát được: **không file nào được miễn `no-console` mà không có lý do được đặt tên, và chính rule đó phải đang bật.**

| # | case | hành vi | người dùng/người đọc thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | Rule đang bật | `.oxlintrc.json` phải chứa `eslint/no-console` với giá trị `error` ở **một** override | xoá cả khối `overrides` → test **đỏ**. Đây là hàng rào chống cổng luôn xanh. |
| 2 | Mỗi mục allow-list có lý do | mỗi glob trong khối `off` phải có một khóa trong map lý do | thêm `packages/foo/src/cli/**` mà không khai lý do → **đỏ** |
| 3 | Mọi lý do đều dùng | mỗi khóa trong map lý do phải khớp một glob đang có trong `overrides` | xoá một glob nhưng giữ lý do → **đỏ** (lý do thừa) |
| 4 | Chiều ngược: entrypoint CLI vẫn xanh | `packages/metaharness/src/tb/cli.ts` dùng `console.log` ở dòng 289 → `oxlint` **không** báo | đảo thứ tự hai khunk `overrides` → **đỏ**. Bắt đúng bẫy thứ tự ở §2.2 mục 1. |
| 5 | Ranh giới thật của rule | `packages/tui/src/components/tab-bar.ts:54` (JSDoc) **không** báo; một `console.log` thật trong `packages/tui/src/` thì **báo** | thêm `no-warning-comments`/rule lạ → **đỏ** |
| 6 | Cặp đôi mnemopi | `e6-triplestore-split.ts` không còn `console.log` ở **vị trí mặc định tham số**; hàm không ghi ra khi không truyền `logFn` | sửa dòng 156 mà bỏ dòng 149 → **đỏ** |

Case 4 và 6 là hai case **chạy `oxlint` thật** (spawn `bunx oxlint` trên repo), không phải đọc JSON. Case 1–3 là so khớp cấu hình — đó là hợp đồng chính trị của allow-list, nên source-grep ở đây là chính đối tượng bị kiểm, không phải test bị cấm; nhưng **không** được dùng `expect(x).toBeDefined()` hay chỉ assert "file tồn tại".

---

## 5. Cổng

### 5.1 Cổng có thực sự đỏ được không — **CÓ, và đã chứng minh bằng chạy thật**

Đây là câu quan trọng nhất của phiếu, nên đo thay vì tin. Ba phép đo trên `oxlint 1.85.0`:

**Đo 1 — hình dạng GỐC của sổ** (`rules` ở gốc + `overrides` 3 mục của sổ), chạy từ gốc repo:

```
$ bunx oxlint -c .oxlintrc.w19probe.json .
exit=1
916 chỗ eslint(no-console) / 153 file
```

**Đo 2 — hình dạng đúng của phiếu** (`overrides` 2 khối ở §2.2), cùng cách chạy:

```
$ bunx oxlint -c .oxlintrc.w19probe2.json .
exit=1
87 chỗ eslint(no-console) / 17 file
```

Cả hai config đo đều đã bị xoá sau khi đo; `git status` xác nhận repo không còn file probe.

**Đo 3 — cơ chế đỏ/xanh và exit code**, chạy trên cây probe tối giản `/tmp/w19-noconsole-probe` (không phải repo — repo chưa có rule nào bật nên chưa thể đỏ):

```
oxlint (rule bật, file vi phạm)   → in lỗi,  exit=1   ✅ ĐỎ
oxlint (vi phạm đã sửa)            → im lặng,  exit=0   ✅ XANH
```

Kết luận: **cổng đỏ được thật.** `eslint/no-console` có thật trong oxlint 1.85.0 (schema `node_modules/oxlint/configuration_schema.json:4529`), `overrides` có thật (schema dòng 84), và `bun run lint` (`lint:tools` = `oxlint .`) truyền exit code lên nên CI đỏ thật.

**Điều kiện để nó không thành cổng giả:** đo ở trên chỉ đỏ vì còn file vi phạm. Sau khi sửa hết 15 file, `bun run lint` sẽ xanh — và **mọi `console.log` thêm mới cũng sẽ làm nó xanh lại** trừ khi ai đó vô hiệu hoá rule. Case 1 của test (§4) là chốt chặn duy nhất cho việc đó. Nếu bỏ case 1, cổng này trở thành cổng luôn xanh.

### 5.2 Danh sách lệnh

```bash
bun run lint                       # phải xanh sau khi sửa hết
bun run check:ts                   # KHÔNG dùng tsc / npx tsc
bun test packages/coding-agent/test/lint-no-console-allowlist.test.ts
grep -c 'no-console' .oxlintrc.json          # phải ≥ 1  (hiện: 0)
git diff --stat .oxlintrc.json               # ignorePatterns không được đổi
```

### 5.3 Cổng hoàn thành — 6 điều, mỗi điều đỏ được bằng cách nào

| # | cổng | đỏ được bằng cách |
| --- | --- | --- |
| 1 | `grep -c 'no-console' .oxlintrc.json` ≥ 1 | hiện = 0 ⇒ đỏ ngay ở HEAD |
| 2 | `bun run lint` xanh ở HEAD | đỏ trước khi sửa 15 file (đo được 87 chỗ) |
| 3 | **bằng chứng nâng đỡ**: thêm `console.log` vào file thư viện → `bun run lint` đỏ → xoá → xanh | đo được exit=1 rồi exit=0 ở Đo 3 của §5.1; đo 1 và 2 xác nhận `oxlint .` trả exit=1 trên chính cây này |
| 4 | `git diff` trên `.oxlintrc.json` không đụng `ignorePatterns` | 26 mục, dòng 31–58 |
| 5 | 18 file bị allow-list che đều có lý do trong test | thêm 1 glob, bỏ 1 khóa lý do ⇒ case 2 đỏ |
| 6 | `e6-triplestore-split.ts:149,156` hết `console.log` ở vị trí mặc định | sửa 156 bỏ 149 ⇒ case 6 đỏ |

---

## 6. Cạm bẫy riêng của work item này

1. **Cơ chế đúng KHÔNG phải `ignorePatterns` — nhưng đừng đọc ngược để cho rằng bật ở gốc là an toàn.** `ignorePatterns` tắt **mọi** rule trên file đó (đúng như sổ nói). Nhưng hình dạng sổ vẽ — `rules` ở gốc + `overrides` chỉ để tắt — **đỏ 916 chỗ / 153 file** vì `oxlint .` quét cả repo. Sai theo hướng ngược lại, tức **nhét thêm miễn trừ** thay vì thêm hàng rào.

2. **Thứ tự hai chunk `overrides` quyết định luôn.** Đo được: `off` trước `error` ⇒ entrypoint CLI cũng đỏ. Đây là lối âm thầm — không có warning, chỉ có CI đỏ ở file không liên quan, và người gõ dễ quy cho allow-list "hỏng".

3. **Allow-list theo đường dẫn là miễn trừ theo *vị trí*, không theo *vai trò* — và `AGENTS.md` cấm đúng cách đó.** `AGENTS.md:227` viết nguyên văn:
   > "This exception is **semantic, not filename-based**; shared code must use `logger` or an explicit output sink."

   Bằng chứng cụ thể trong cây này, không phải giả định: `packages/coding-agent/src/cli/file-processor.ts` là **shared code nằm trong thư mục được miễn**. Nó được `packages/coding-agent/src/main.ts:27` import, và xuất ra **public subpath** `@oh-my-pi/pi-coding-agent/cli/file-processor` — mà `packages/coding-agent/test/block-images.test.ts:5` và `packages/coding-agent/test/cli/file-processor.test.ts:11` đang import từ đó. Đó là code embedder bên ngoài dùng được, không phải entrypoint CLI. Glob `packages/*/src/cli/**` sẽ miễn nó một cách âm thầm.

   → Hệ quả trực tiếp với *Cần người quyết* của sổ: sổ yêu cầu giữ nguyên nghĩa đường phép của `AGENTS.md` và nói rõ exception "không được thu hẹp thành allow-list tĩnh". Cơ chế allow-list **chính là** thu hẹp đó. Test ở §4 chỉ chứng minh được "mọi mục miễn đều có lý do" — nó **không** chứng minh được "file này đúng là CLI". Đừng bán test case 2 là bằng chứng cho rằng allow-list đúng nghĩa.

4. **Lệnh đo của sổ tự nó thiếu file.** `git grep -l … -- 'packages/*/src/**/*.ts'` trả **33**, nhưng pathspec `**/` của git bắt buộc khớp **ít nhất một** thư mục con, nên nó bỏ sót mọi file nằm thẳng trong `src/`. Đo lại với `'packages/*/src/*.ts'` cộng thêm → **40 file**. Bỏ sót lớn nhất: `packages/stats/src/index.ts` (25 chỗ) — đúng cái file sổ cần miễn. Đây là nguyên nhân gốc khiến "~10 file" ra sai.

5. **Đừng đo bằng `git grep` để quyết định danh sách sửa.** `git grep` chỉ thấy file đã track và chỉ thấy text; `oxlint` thấy cả repo, cả file untracked, và **không** bắt `console` nằm trong chú thích. Lấy danh sách từ `bunx oxlint -c <config> .` rồi `sort -u` đường dẫn. 17 file ở §2.3 là kết quả của cách đó.

6. **`ignorePatterns` biến mất nếu bạn chạy `oxlint -c <đường-dẫn-tuyệt-đối>`.** Đo được: 1367 chỗ thay vì 916. Nếu phải chạy từ chỗ khác, copy config vào gốc repo trước.

7. **Sửa `e6-triplestore-split.ts` bằng cách đổi tên là sửa hình thức.** `console.log` ở đó là **giá trị mặc định của tham số hàm** (`logFn: (line: string) => void = console.log`). `logger` trong repo không có `.log`, nên `logger.log` không biên dịch; còn `logger.debug` đổi *hành vi* — hàm vẫn ghi ra khi không ai truyền `logFn`. Đúng cái bẫy sổ đã cảnh báo; ở đây nó còn sắc hơn vì code sẽ không biên dịch nếu gõ theo hướng đó.

8. **`packages/typescript-edit-benchmark` không có trong bảng package của `AGENTS.md`.** Hai file của nó gánh 24/87 chỗ. Xác minh nó là package private, không có `bin` (`"private": true`, `bin: None`) — tức là thư viện đúng nghĩa, **không** được miễn chỉ vì "không ai quen tới".

---

## 7. Các neo trong work item đã sai so với cây thật

Ghi ra, **không** sửa trong `MILESTONE_1_EXECUTION_PLAN.md`.

### 7.1 Đếm neo

| loại | số |
| --- | ---: |
| neo đã kiểm | **12** |
| neo đúng | **8** |
| neo hỏng | **4** |

### 7.2 Danh sách neo hỏng

| # | trích trong sổ | thực tế | ảnh hưởng |
| --- | --- | --- | --- |
| 1 | `.oxlintrc.json` "đã có sẵn `ignorePatterns` **24 dòng**" (lặp ở bảng file, bước 1, gate 4, *Đính chính*) | **26** mục, dòng 31–58 | nhỏ, nhưng gate 4 nói "không được đụng khối 24 dòng" ⇒ review sẽ soi nhầm. Sửa thành 26. |
| 2 | "phần cần sửa tay sau khi các entrypoint được override là **~10 file**" | **17 file / 87 chỗ** (hình dạng đúng). Nếu giữ hình dạng gốc của sổ: **153 file / 916 chỗ** | lớn. "~10" là ước lượng sai 1,7× so với hình dạng đúng, và sai 15× so với hình dạng sổ vẽ. Sổ cũng tự thừa nhận hai con số "không cùng phạm vi". |
| 3 | allow-list "**đúng ba nhóm** entrypoint … `packages/*/src/cli/**`, `packages/*/src/commands/**`, `packages/metaharness/src/tb/cli.ts`" | thiếu **`packages/stats/src/index.ts`** — là `bin` duy nhất dưới `src/` trong toàn repo, và là file nhiều vi phạm nhất (25 chỗ). Thiếu **`packages/utils/src/logger.ts`** — chính là sink của logger | lớn. Không miễn thì hoặc phá CLI `omp-stats` đang chạy, hoặc thêm miễn trừ không có lý do. Ngược lại, `packages/*/src/cli/**` **miễn thừa** cho `file-processor.ts` (shared code, public subpath) |
| 4 | lệnh đo `git grep -l 'console\.\(log\|error\|warn\|info\|debug\)' -- 'packages/*/src/**/*.ts' \| wc -l` → **33** | con số 33 **đúng**, nhưng **phạm vi sai**: pathspec `**/` của git bắt buộc ≥1 thư mục con, nên bỏ sót mọi file nằm thẳng trong `src/`. Đúng phải là **40** | trung bình nhưng là nguyên nhân gốc của #2. `AGENTS.md` cũng yêu cầu "Đo lại bằng lệnh sau khi đã bật `overrides`, đừng chọn con số theo trí nhớ" — lệnh này không đo được cái cần đo. |

### 7.3 Neo đúng — đã mở và đọc

| trích trong sổ | nội dung thật tại dòng đó |
| --- | --- |
| `packages/ai/src/providers/cursor.ts:405` | ``console.error(`[CURSOR] ${type}${subtype ? `: ${subtype}` : ""}${dataStr}`);`` — đúng là `console.*` trong provider wire code, đúng dòng |
| `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts:149` | `	logFn: (line: string) => void = console.log,` — đúng là default parameter |
| `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts:156` | `	const effectiveLog = options.logFn ?? console.log;` — đúng là fallback cùng loại |
| `packages/tui/src/components/tab-bar.ts:54` | `` * tabBar.onTabChange = (tab) => console.log(`Switched to ${tab.id}`);`` — đúng là JSDoc `@example`, không phải mã chạy |
| `packages/tui/**` "TUI đã sạch" | `rg 'console\.' packages/tui/src/` → **đúng một** dòng, chính là dòng 54 trong JSDoc. Đúng. (`bench/`, `test/`, `scripts/` có console thật nhưng nằm ngoài `packages/*/src/**` nên hình dạng §2.2 không chạm tới) |
| `.oxlintrc.json` `grep -c 'no-console'` → 0 | đo lại: **0**. Đúng |
| `packages/metaharness/src/tb/cli.ts` | tồn tại, dòng 1 là `#!/usr/bin/env bun`, `console.log` ở dòng 289+. Đúng là entrypoint script |
| `packages/coding-agent/test/lint-no-console-allowlist.test.ts` | không tồn tại — đúng là file mới; sổ đã ghi "**không** — file mới, chưa kiểm chứng" |

### 7.4 Lệnh đo thay thế — dùng cái này

```bash
# danh sách file thật sự đỏ, lấy từ oxlint chứ không phải từ git grep
cp .oxlintrc.json /tmp/base.json          # sau khi đã thêm overrides ở §2.2
bunx oxlint . | grep 'eslint(no-console)' | sed 's/:[0-9]*:[0-9]*:.*//' | sort -u
```
