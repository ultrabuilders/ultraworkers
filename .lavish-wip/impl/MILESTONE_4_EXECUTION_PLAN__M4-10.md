# Phiếu triển khai — GAP-M4-10. Sổ bản vá phụ thuộc cục bộ

**Kế hoạch:** `MILESTONE_4_EXECUTION_PLAN.md:1649` (mục `## GAP-M4-10.`)
**HEAD khi rà soát:** `47720fd` (nhánh `milestone-1`) — `git rev-parse --short HEAD`
**Ngày rà soát:** 2026-09-29
**Nguồn:** toàn bộ neo trong work item trỏ vào chính cây `omp` này. Không work item nào
của M4-10 trỏ sang `pi-ref` / `deepseek-harness` / `codex-ref` / `opencode-ref` /
`gajae-ref` / `claude-code-ref` / `senpi-ref`, nên không có cây tham chiếu nào khác cần mở.

---

## 1. Cái gì thay đổi, quan sát được

Khi bạn mở `patches/LEDGER.md`, bạn thấy **một hàng cho mọi hunk vá** trong
`patches/*.patch`, và mỗi hàng trả lời được ba câu: file nào bị sửa, vì sao, và từ
phiên bản nào thì hunk đó bị xoá. Sổ **không tự gõ** — nó được sinh ra từ chính diff
bằng `bun run gen:patch-ledger`, nên thêm một hunk mà không khai lý do sẽ làm lệch
sổ và `reconcile` đỏ. Hành vi runtime của omp **không đổi một byte nào**:
`patches/*.patch` giữ nguyên `md5`, `package.json` `patchedDependencies` giữ nguyên
hai mục.

---

## 2. VIỆC 1 — Kiểm lại từng neo

Tất cả dưới đây tôi đã mở và đọc bằng `sed -n "<n>p"` / `rg -n` / `awk`. **13/13 neo
đúng nguyên văn.** Chi tiết bảng:

| Neo trong work item | Lệnh kiểm | Kết quả thật | Verdict |
| --- | --- | --- | --- |
| `ls patches/` trả đúng 2 mục, cả hai đều `.patch` | `ls -la patches/` | `@ark%2Fschema@0.56.2.patch`, `puppeteer-core@25.3.0.patch` | **ĐÚNG** |
| `ls patches/*.patch \| wc -l` → 2 | chạy | `2` | **ĐÚNG** |
| `puppeteer-core@25.3.0.patch` 35.203 byte | `wc -c` | `35203` | **ĐÚNG** |
| `@ark%2Fschema@0.56.2.patch` 1.431 byte | `wc -c` | `1431` | **ĐÚNG** |
| puppeteer patch có 12 `diff --git` | `grep -c '^diff --git'` | `12` | **ĐÚNG (nhưng xem mục 3.1 — 12 là *file*, không phải *hunk*)** |
| `package.json:206-209` là khối `patchedDependencies`, đúng hai mục | `sed -n '206,209p' package.json` | `"patchedDependencies": {` / `"@ark/schema@0.56.2": "patches/@ark%2Fschema@0.56.2.patch",` / `"puppeteer-core@25.3.0": "patches/puppeteer-core@25.3.0.patch"` / `}` | **ĐÚNG CHÍNH XÁC** |
| khớp đúng 2 file `.patch` | đối chiếu tay | 2 ↔ 2 | **ĐÚNG** |
| `grep 'omp patch'` trong file puppeteer cho 0 hit | `grep -c 'omp patch'` | `0` (exit 1) | **ĐÚNG** |
| chỉ `@ark/schema` có **một** marker `(omp patch)` ở hunk đầu | `sed -n '5p;13p'` | hunk đầu `@@ -51,8 +51,10 @@` ở dòng 5; marker ở dòng 13: `+        // than alphabetized-by-hash order (omp patch)` | **ĐÚNG** |
| lý do nằm rải rác dưới dạng comment `// xxx-stealth:` | `grep -c 'xxx-stealth'` | `18` | **ĐÚNG** |
| `THIRD-PARTY-NOTICES.txt:904` ghi `puppeteer-core 25.3.0 — Apache-2.0` | `sed -n '904p'` | `- puppeteer-core 25.3.0 — Apache-2.0` | **ĐÚNG NGUYÊN VĂN** |
| `grep -c "patch" CONTRIBUTING.md` → 0 | chạy | `0` (exit 1) → mục cần thêm là mục **mới** | **ĐÚNG** |
| `scripts/ci-release-publish.ts` + `scripts/ci-release-publish.test.ts` tồn tại | `ls -la` | `27 KB` / `8.7 KB` | **ĐÚNG** |
| `packages/browser-relay/scripts/build-extension.ts` tồn tại | `ls -la` | `2.6 KB` | **ĐÚNG** |
| `patches/LEDGER.md`, `scripts/gen-patch-ledger.ts`, `scripts/gen-patch-ledger.test.ts` chưa tồn tại | `ls` | không có trong `ls patches/` / `ls scripts/` | **ĐÚNG (file mới)** |

### 2.1. Bảng đếm thật (dán vào test fixture, đừng đoán lại)

`patches/puppeteer-core@25.3.0.patch`, đếm bằng `awk` từng mục `diff --git`:

| file (phía `a/`) | hunk `@@` | `+` | `-` |
| --- | ---: | ---: | ---: |
| `node_modules/puppeteer-core/.bun-tag-2e714b457f0bd8e8` | **0** | **0** | **0** |
| `node_modules/puppeteer-core/.bun-tag-a797aeb3ca2bd69f` | **0** | **0** | **0** |
| `lib/puppeteer/api/ElementHandle.js` | 5 | 68 | 7 |
| `lib/puppeteer/api/Frame.js` | 8 | 52 | 7 |
| `lib/puppeteer/cdp/ExecutionContext.js` | 2 | 10 | 6 |
| `lib/puppeteer/cdp/Frame.js` | 2 | 2 | 2 |
| `lib/puppeteer/cdp/FrameManager.js` | 5 | 189 | 3 |
| `lib/puppeteer/cdp/IsolatedWorld.js` | 2 | 20 | 0 |
| `lib/puppeteer/cdp/WebWorker.js` | 2 | 15 | 4 |
| `lib/puppeteer/common/util.js` | 1 | 3 | 1 |
| `lib/puppeteer/common/QueryHandler.js` | 2 | 13 | 3 |
| `lib/puppeteer/node/ChromeLauncher.js` | 1 | 5 | 15 |
| **tổng** | **30** | **377** | **48** |

`patches/@ark%2Fschema@0.56.2.patch`: **1** `diff --git`, **2** hunk `@@` —
`@@ -51,8 +51,10 @@` (dòng 5) và `@@ -111,7 +113,7 @@` (dòng 18).

**Tổng sổ = 32 hàng** nếu khoá theo hunk (30 + 2); **13 hàng** nếu khoá theo file
(12 + 1). Mục 3.1 nói rõ vì sao con số này quyết định thiết kế.

---

## 3. Bốn chỗ tài liệu SAI so với cây thật (ghi ra, không sửa tài liệu)

### 3.1. "đúng 12 hunk cho file puppeteer" — SAI. Số thật là **30**.

Hợp đồng test trong work item viết: *"`reconcile` phải trả `ok: true` với **đúng 12 hunk**
cho file puppeteer"*. Con số 12 là số `diff --git` — tức số **file** — lấy từ mục
"File cần chạm tới" và dán thẳng vào hợp đồng. Số hunk thật là:

```
$ grep -c '^@@' patches/puppeteer-core@25.3.0.patch
30
$ grep -c '^@@' 'patches/@ark%2Fschema@0.56.2.patch'
2
```

Bằng chứng cũng cho thấy vì sao 12 là sai: `lib/puppeteer/api/Frame.js` có **8** hunk
và `lib/puppeteer/cdp/FrameManager.js` có **5** hunk. Nếu sổ khoá theo hunk thì
`FrameManager.js` xuất hiện 5 lần, không phải 1.

Cũng vì vậy câu *"và đúng số hunk của file `@ark/schema`"* là câu **không kiểm
được** — con số đó là 2, và nó phải được viết thẳng ra, không để "đúng số hunk".

### 3.2. "riêng mười file mã thư viện thật là 367 `+` / 38 `-`" — SAI. Mười file đó giữ **toàn bộ** 377 `+` / 48 `-`.

Bằng chứng: cộng cột `+` trong bảng 2.1 cho mười file `lib/puppeteer/**` ra đúng 377,
cột `-` ra đúng 48. Không file `lib/` nào có 0 dòng. Con số 367/48 không xuất hiện ở
bất kỳ phép cộng nào trên cây này.

Hệ quả nhỏ nhưng quan trọng: toàn patch và phần "mã thư viện thật" **bằng nhau**. Đừng
viết trong sổ rằng hai `.bun-tag` đóng góp 10 dòng — chúng đóng góp **0**.

### 3.3. "hai file còn lại … mỗi cái 5 `+` / 5 `-`" — SAI. Chúng là **0 `+` / 0 `-`**, và có **0 hunk**.

Đây là nhóm sửa sai nghiêm trọng nhất, vì nó sai ở *cấu trúc*, không phải ở con số.
Bốn dòng đầu file thật, nguyên văn:

```
1: diff --git a/node_modules/puppeteer-core/.bun-tag-2e714b457f0bd8e8 b/.bun-tag-2e714b457f0bd8e8
2: new file mode 100644
3: index 0000000000000000000000000000000000000000..e69de29bb2d1d6434b8b29ae775ad8c2e48c5391
4: diff --git a/node_modules/puppeteer-core/.bun-tag-a797aeb3ca2bd69f b/.bun-tag-a797aeb3ca2bd69f
```

`e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` là SHA-1 của **file rỗng**. Không có dòng
`---`, không có `+++`, không có `@@`. Đây là hai mục "khai báo file rỗng", không phải
hunk sửa code.

### 3.4. "Chúng vẫn phải có hàng ledger (một hàng bắt buộc cho **mỗi** hunk không phải ngoại lệ)" — **vô lý dưới khoá theo hunk**.

Mục "Cần người xác nhận" số 2 nói hai diff `.bun-tag-*` "vẫn phải có hàng ledger". Nhưng
bằng chứng 3.3 cho thấy chúng có **không hunk nào**. Một `reconcile` khoá theo hunk sẽ
không bao giờ sinh ra hàng cho chúng, và nếu bắt buộc thì nó sẽ báo đỏ vĩnh viễn trên
đúng cây hiện tại. Đây là lý do phải chọn khoá **hàng** trước khi viết dòng code đầu
tiên — xem mục 8.1.

### 3.5. Ngoài ra: `LedgerRow` trong "Hình dạng code" **không định danh được hunk**

Work item định nghĩa:

```typescript
export interface LedgerRow {
	readonly file: string;      // Path on the b/ side of the `diff --git` header
	readonly purpose: string;
	readonly upstream: string | null;
	readonly dropWhen: string;
}
```

Nhưng `reconcile` nhận `hunksByFile: ReadonlyMap<string, ReadonlyArray<{ header: string }>>`
— hunk **có** `header`. Vậy mà `LedgerRow` **không** mang tham chiếu hunk nào. Với
`FrameManager.js` có 5 hunk, sổ sẽ có 5 hàng mà **5 hàng đều có `file` giống hệt nhau**
và không có gì phân biệt chúng. Bảng markdown ví dụ trong work item cũng chỉ có 4 cột,
không cột nào là định danh hunk. Như vậy hàm `reconcile` **không thể** so khớp được
dù chỉ có 1 hunk: nó không biết hàng thứ 3 ứng với hunk nào.

Sửa bắt buộc: `LedgerRow` phải mang khoá hunk — hoặc `readonly hunk: string` (chính
chuỗi `@@ -51,8 +51,10 @@ …`), hoặc `readonly hunkIndex: number` tính theo thứ tự
trong file. Bảng markdown sinh ra phải có cột định danh tương ứng, nếu không người đọc
không biết hàng nào nói về hunk nào.

### 3.6. Ngoài ra: cổng `sed -n '206,209p' package.json` sẽ **tự phá chính nó**

Work item bắt "Không đụng `package.json`" và xác minh bằng `sed -n '206,209p' package.json`.
Nhưng bước thêm script mục đó lại **chèn một dòng vào trên**, đẩy khối `patchedDependencies`
xuống dưới. Đã mô phỏng chính xác thao tác chèn:

```
167 		"gen:patch-ledger": "bun scripts/gen-patch-ledger.ts",
207 	"patchedDependencies": {
209 		"puppeteer-core@25.3.0": "patches/puppeteer-core@25.3.0.patch"
```

Nghĩa là sau khi làm đúng yêu cầu, `sed -n '206,209p'` in ra `},` + khối mở + ark +
puppeteer — **mất dấu `}` đóng**, và người review nhìn vào đó sẽ tưởng khối cấu hình bị
sửa. Cổng này phải viết lại theo nội dung, không theo số dòng — xem mục 7.

### 3.7. Ngoài ra: test mới **không chạy trong CI** nếu không sửa `ci.yml`

`.github/workflows/ci.yml:617`, nguyên văn:

```
              bun test scripts/ci-test-ts.test.ts scripts/release.test.ts
```

Đó là **allowlist hai file**. Job chạy trước nó là `bun run ci:test:ts:workspace`, và
`ci-test-ts.ts:88-110` liệt kê `fastWorkspacePackages` / `nativeAndIntegrationPackages` /
`localOnlyWorkspacePackages` — **không bucket nào chứa `scripts/`**. Hệ quả: một
`scripts/gen-patch-ledger.test.ts` mới sẽ **không bao giờ chạy trong CI**, và test đỏ
cũng không ai thấy. Work item không liệt kê `.github/workflows/ci.yml` trong "File cần
chạm tới" — đó là một file bị bỏ sót.

### 3.8. Ngoài ra: `bun run check:ts` **không** typecheck `scripts/`

`package.json:90`: `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`.
`check:tools` (`package.json:91`) là `oxlint . && oxfmt --check … 'scripts/**/*.ts'` —
lint + format, **không** typecheck. Phần `tsgo` bị `--filter './packages/*'` thu hẹp
về package, nên `scripts/` không đi qua. Trong khi `tsconfig.tools.json` **có**
`"include": ["scripts", …]`, nhưng `check:ts` không build project reference gốc. Đây là
file mới duy nhất của item, và cổng số 5 không chạm được nó. Bù lại:
`bun test scripts/gen-patch-ledger.test.ts` import và **thực thi** module nên bắt được
lỗi runtime — nhưng không bắt lỗi kiểu.

---

## 4. Bảng điểm sửa

TRƯỚC: trích nguyên văn từ file thật đã mở ở phần 2.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `patches/LEDGER.md` | *(tạo mới — `ls patches/` không có)* | — | file sinh: dòng `<!-- GENERATED by scripts/gen-patch-ledger.ts — do not edit by hand. -->` + bảng markdown, **32 hàng** nếu khoá hunk |
| `scripts/gen-patch-ledger.ts` | *(tạo mới)* | — | `parsePatchHunks` + `reconcile` + CLI ghi file; khuôn theo `scripts/gen-bazel-lock.ts` (`#!/usr/bin/env bun` + `import.meta.dir` + cờ `--check`) |
| `scripts/gen-patch-ledger.test.ts` | *(tạo mới)* | — | 4 case: happy path, hunk thêm→đỏ, hàng xoá→đỏ, mismatch `patchedDependencies`↔`patches/` hai chiều |
| `package.json:167` | khối `scripts` | `"check-spoofed-versions": "bun scripts/check-spoofed-versions.ts"` | chèn `"gen:patch-ledger": "bun scripts/gen-patch-ledger.ts",` **phía trên** dòng này (dòng này là mục cuối, không có dấu phẩy) |
| `package.json:206-209` | `patchedDependencies` | `"patchedDependencies": {`<br>`	"@ark/schema@0.56.2": "patches/@ark%2Fschema@0.56.2.patch",`<br>`	"puppeteer-core@25.3.0": "patches/puppeteer-core@25.3.0.patch"`<br>`}` | **không đổi một ký tự** — nhưng dồn xuống dòng **207-210** |
| `CONTRIBUTING.md:93-101` | mục mới, đặt trước `## Review` | `## Review`<br>`<br>`<br>`Maintainers review the submitted behavior and the contributor's understanding` | thêm `## Local dependency patches` (~4 dòng) **trước** `## Review`; file 101 dòng |
| `.github/workflows/ci.yml:617` | allowlist test scripts | `bun test scripts/ci-test-ts.test.ts scripts/release.test.ts` | `bun test scripts/ci-test-ts.test.ts scripts/release.test.ts scripts/gen-patch-ledger.test.ts` — **file bị bỏ sót trong work item** |
| `patches/puppeteer-core@25.3.0.patch` | `md5` | `de58a43ccbfe895d0d741d481fae82d6` (35.203 byte) | **không đổi** |
| `patches/@ark%2Fschema@0.56.2.patch` | `md5` | `3db02a61cff556913c429faec932fa7c` (1.431 byte) | **không đổi** |

---

## 5. Các bước — mỗi bước có neo đã kiểm

### Bước 0 — Chốt khoá hàng TRƯỚC khi viết dòng code đầu tiên

Đây là bước plan không có, và mọi thứ sau nó phụ thuộc vào nó. Bằng chứng 2.1 + 3.3 + 3.5:

- **Khoá theo hunk** (`file` + `@@` header) → 32 hàng; hai diff `.bun-tag-*` có **0 hàng**,
  nên sổ không nhắc tới chúng, và câu "mỗi hunk một hàng" được giữ đúng nghĩa.
- **Khoá theo diff** → 13 hàng; hai `.bun-tag-*` phải có hàng, và mỗi file
  `FrameManager.js` gộp 5 hunk vào một hàng — mất đúng thứ mục này sinh ra để bảo vệ.

Khuyến nghị: **khoá theo hunk**, và thêm một đoạn giải thích ngắn ở cuối `LEDGER.md`
nói rõ hai file `.bun-tag-*` là entry của Bun sinh tự động, không phải hunk sửa tay.
Đây cũng chính là câu hỏi người quyết ở mục 9(2) — nhưng nó **không chặn** việc code nếu
chọn khoá hunk.

### Bước 1 — Viết `scripts/gen-patch-ledger.ts`

Neo đã kiểm: `package.json:166-167` (chỗ chèn script), và khuôn generator ở
`scripts/gen-bazel-lock.ts:1-25` (`#!/usr/bin/env bun`, `const repoRoot = path.join(import.meta.dir, "..")`,
cờ `--check` dùng để so hash thay vì ghi).

- `parsePatchHunks(patchText)` phải **thuần**, nhận chuỗi, không đọc đĩa — để test
  fixture nạp một diff giả không cần file thật.
- Chia theo `diff --git` trước, rồi theo `@@` sau. **Cấm** coi `---`/`+++` của header
  là hunk.
- `reconcile` trả `{ ok: false; missing; orphaned }` — `missing` là hunk không có hàng,
  `orphaned` là hàng không có hunk. Cả hai phải đỏ.
- Dùng `Bun.file().text()` / `Bun.write()` (AGENTS.md). `fs.readdir` cho thư mục `patches/`.
- Không `console.log` trong đường chạy TUI — đây là script CLI một lần nên `console.*`
  được phép, nhưng cứ in ra `logger` theo mặc định và chỉ dùng `process.stdout` cho bảng.

### Bước 2 — Thêm script vào `package.json`

Neo đã kiểm: `package.json:166-167`

```
166: 		"gen:glyphs": "bun --cwd=packages/tui run gen:glyphs",
167: 		"check-spoofed-versions": "bun scripts/check-spoofed-versions.ts"
```

Dòng 167 là mục cuối của khối `scripts` và **không có dấu phẩy**. Dòng mới phải có dấu
phẩy. Chèn ở `:167` (giữa `gen:glyphs` và `check-spoofed-versions`) để nhóm `gen:*`
không bị chia.

### Bước 3 — Sinh `patches/LEDGER.md` lần đầu

Neo đã kiểm: `patches/` chỉ có 2 file, không có `LEDGER.md`.

Chạy `bun run gen:patch-ledger`, xong `git add patches/LEDGER.md`. Chạy lần hai phải
không đổi byte.

### Bước 4 — Mục `CONTRIBUTING.md`

Neo đã kiểm: `grep -c "patch" CONTRIBUTING.md` → `0`; mục cuối là `## Review` ở
`CONTRIBUTING.md:93`, file dài 101 dòng, dòng 101 là `changes.`

Đây là mục **mới**, không phải sửa mục cũ. Chèn trước `## Review` để nhóm với
`## Pull request requirements` hơn là đuôi file. Nội dung ~4 dòng: thêm patch = thêm
hàng `LEDGER.md` + chạy `bun run gen:patch-ledger` + commit **cùng PR**.

### Bước 5 — Sửa `.github/workflows/ci.yml:617`

Neo đã kiểm (xem 3.7). Không sửa dòng này thì test không bao giờ chạy trong CI và cổng
số 2 của work item chỉ còn là lệnh cục bộ.

### Bước 6 — Chạy cổng (mục 7)

---

## 6. Hợp đồng test

**File:** `scripts/gen-patch-ledger.test.ts` (mới, kế cạnh `scripts/ci-release-publish.test.ts`).

`scripts/ci-release-publish.test.ts:1` dùng `import { describe, expect, it } from "bun:test";`
và `import * as fs from "node:fs/promises"` — theo đúng đó. Fixture phải là **byte thật
của một patch** (chuỗi nhiều dòng trong test, hoặc file tạm bằng `fs.mkdtemp`), **không**
phải object trường `purpose` do script tự điền — lý do nằm ở bước 3 của work item:
nếu test chỉ so trường do script điền thì ba tập luôn khớp và test vô nghĩa.

| # | Case | Khẳng định | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | happy path trên cây thật | `reconcile(cây thật)` → `ok: true`, số hàng = **32** (30 puppeteer + 2 ark) | Người đọc `LEDGER.md` thấy mỗi hunk có một hàng; nếu số hàng lệch 32, sổ đang bỏ sót hoặc gộp hunk |
| 2 | **âm** — thêm một hunk giả vào diff của fixture | `ok: false`, hunk đó nằm trong `missing` | Maintainer vá thêm một hunk lên puppeteer mà không khai lý do → sổ im lặng, người đọc không biết hunk đó vá cái gì |
| 3 | **âm** — xoá một hàng ledger cho hunk vẫn còn | `ok: false`, hàng đó nằm trong `orphaned` | Người viết xoá dòng ledger cho "gọn" → không ai còn thấy hunk đó cần lý do; đây là nghịch lý tự-khớp mà work item cảnh báo |
| 4 | **âm hai chiều** — `patchedDependencies` liệt kê 3 mục, `patches/` chỉ có 2 file; và ngược lại | cả hai đều đỏ | Ai sửa `package.json` mà quên dọn `patches/` (hoặc ngược lại) → patch không còn được Bun áp dụng mà repo vẫn xanh |
| 5 | hai file `.bun-tag-*` không sinh hàng hunk nào | `missing` rỗng cho chúng, sổ vẫn `ok: true` | Không có case này thì khoá hàng bị bẻ bởi chính cây hiện tại và cổng luôn đỏ |

Case 5 chỉ có nghĩa nếu chọn khoá hunk ở bước 0. Nếu chọn khoá diff, thay bằng: hai
`.bun-tag-*` **có** hàng, và `purpose` của chúng phải nói rõ là file Bun sinh.

---

## 7. Cổng

### 7.1. Năm cổng plan nêu — đánh giá từng cái

| Cổng | Lệnh | **Có đỏ được không?** |
| --- | --- | --- |
| (1) sổ sinh lại được | `bun run gen:patch-ledger && git diff --exit-code -- patches/LEDGER.md` | **Có** — nhưng chỉ bắt được việc sổ **cũ**, không bắt việc sổ **nói dối** (xem 7.3) |
| (2) test ba tập | `bun test scripts/gen-patch-ledger.test.ts` | **Có, nhưng chỉ khi đã sửa `ci.yml:617`** — nếu không thì đây là lệnh cục bộ, không phải cổng |
| (3) hàng âm từng thấy đỏ | thủ công | **Không tự đỏ** — phải làm thủ công một lần rồi ghi lại. Không có máy nào ngăn PR sau |
| (4) `md5` hai file `.patch` không đổi | `md5 …` | **Có, nhưng thủ công và dễ bỏ** — xem 7.2 |
| (5) `bun run check:ts` | `bun run check:ts` | **Không** với `scripts/gen-patch-ledger.ts` — `check:tools` chỉ oxlint+oxfmt, `tsgo` bị `--filter './packages/*'` thu hẹp (xem 3.8) |

### 7.2. Cổng (4) viết lại cho đỏ được

`md5` là **ảnh chụp**, không phải so sánh. Người làm PR chạy nó sau khi đã sửa xong thì
nó luôn xanh với chính file mình vừa sửa. Đổi thành cổng so với `HEAD`:

```bash
git diff --exit-code -- patches/
```

Đỏ **ngay** nếu một byte nào trong `patches/` bị đụng, kể cả khi người làm PR không nhớ
để chạy `md5`. Cờ đỏ tức thì; và nó cũng bắt được việc thêm file `.patch` mới mà quên
thêm hàng ledger — điều mà `md5` hai tên file cố định không bao giờ bắt.

Nếu vẫn muốn giữ `md5` (để dán vào mô tả PR như bằng chứng), thì phải chạy **trước**
khi sửa bất cứ thứ gì, và dán **cả hai** giá trị:

```
de58a43ccbfe895d0d741d481fae82d6  patches/puppeteer-core@25.3.0.patch
3db02a61cff556913c429faec932fa7c  patches/@ark%2Fschema@0.56.2.patch
```

### 7.3. Cổng (1) viết lại cho đỏ được

`git diff --exit-code -- patches/LEDGER.md` sau khi đã commit sổ thì **luôn xanh** —
nó chỉ bắt việc bạn chạy generator *sau* khi đã commit mà quên commit kết quả. Nó
**không** bắt được điều work item muốn: sổ nói sai.

Muốn cổng này có răng ở đúng chỗ, hãy thêm một kiểm tra vào chính `gen:patch-ledger.ts`,
kiểu `--check`, theo đúng khuôn `scripts/gen-bazel-lock.ts` (file đó dùng cờ `--check`
để "exit 1 when MODULE.bazel.lock is stale"):

```bash
bun run gen:patch-ledger --check   # exit 1 khi patches/LEDGER.md lệch bảng sinh ra
```

và chạy nó **trong CI** (cùng chỗ với `ci.yml:617`). Khi đó: thêm hunk mà quên cập
nhật sổ → đỏ; sổ bị sửa tay → đỏ; sổ bị xoá → đỏ.

**Câu trả lời thẳng cho câu hỏi "cổng này có đỏ được không":** Ở dạng plan viết —
**không đủ**. Bốn trong năm cổng là cổng cục bộ, một cổng (`check:ts`) không chạm tới
file mới nhất, và cổng (1) đo sai thứ. Ba sửa ở trên — `--check` trong CI, `git diff --
exit-code -- patches/`, và sửa `ci.yml:617` — biến nó thành cổng thật. Không có chúng,
một cổng luôn xanh tệ hơn không có cổng.

### 7.4. Lệnh kiểm của plan — `sed -n '206,209p' package.json` (không phải cổng, nhưng đang được dùng như cổng)

Bỏ. Nó tự phá (mục 3.6). Thay bằng:

```bash
# Khối cấu hình phải y nguyên — kiểm theo NỘI DUNG, không theo số dòng
git diff --exit-code -- package.json
```

Sau khi thêm script, `git diff package.json` phải ra **đúng một dòng `+`** và không
có dòng `-` nào. Đó là cổng thật: nó đỏ nếu ai đó đụng `patchedDependencies`, và nó
tự miễn nhiễm với việc khối bị dồn dòng.

### 7.5. Lệnh cuối, đúng thứ tự

```bash
md5 patches/puppeteer-core@25.3.0.patch patches/@ark%2Fschema@0.56.2.patch   # TRƯỚC
# … sửa code …
bun run gen:patch-ledger
git diff --exit-code -- patches/          # không một byte .patch nào đổi
git diff --exit-code -- package.json      # đúng một dòng +, tự thêm script
bun test scripts/gen-patch-ledger.test.ts
bun run check:ts
md5 patches/puppeteer-core@25.3.0.patch patches/@ark%2Fschema@0.56.2.patch   # SAU — y hệt
```

Tuyệt đối không `tsc` / `npx tsc` — dự án cấm.

---

## 8. Cạm bẫy riêng của work item này

### 8.1. Cạm bẫy lớn nhất: nhầm `diff --git` với hunk

Work item tự mâu thuẫn. Nó nói "một hàng cho **mỗi hunk**" ở bốn chỗ khác nhau, nhưng
hợp đồng test lại đòi "đúng 12 hunk", và 12 là số `diff --git`. Người gõ code chạy
`grep -c '^@@'`, thấy 30, tưởng mình hiểu sai tài liệu, rồi làm theo con số 12. Kết
quả: `Frame.js` (8 hunk) chỉ có 1 hàng, sổ báo 13 hàng thay vì 32, và đúng mục mà cả
item sinh ra để bảo vệ — *"vá cái gì"* — lại bị mất ở tệp file nhiều hunk nhất. Đây là
bẫy sẽ xảy ra với người gõ cẩn thận nhất, vì họ cứ "sửa cho khớp tài liệu".

Bằng chứng bắt buộc nhớ: `lib/puppeteer/api/Frame.js` = **8 hunk**,
`lib/puppeteer/cdp/FrameManager.js` = **5 hunk** (189 `+` trong 5 hunk),
`lib/puppeteer/api/ElementHandle.js` = **5 hunk**.

### 8.2. Cạm bẫy thứ hai: nghịch lý tự-khớp (work item đã cảnh báo, và cách nó xảy ra)

Work item nói đúng: đừng biến `LEDGER.md` thành nơi người ta **gõ** lý do rồi để
script chỉ kiểm tra khớp. Nhưng lời cảnh báo không cho biết **cửa sổ** để làm điều đó:
`LedgerRow` trong "Hình dạng code" có `purpose` và `upstream` do script điền, và
`reconcile` **không** kiểm tra chúng (mục 3.5 nói rõ nó không thể). Nên nếu bạn bám
đúng chữ ký trong tài liệu, bạn sẽ xây một cái máy chỉ so khớp — tức đúng cái bẫy
tài liệu vừa cảnh báo, trong khuôn mà tài liệu vẽ ra.

Lối thoát thật: `purpose`/`upstream`/`dropWhen` phải nằm trong **sidecar** có
nguồn riêng mà `reconcile` **không** sinh ra, và hàng ledger sinh ra chỉ mang khoá
hunk + con trỏ tới sidecar. Như vậy ba tập khớp **vì ba nguồn độc lập khớp**, chứ
không phải vì ba tập cùng được sinh từ một chỗ. Đây là quyết định thiết kế, và nó
chưa có câu trả lời trong work item — xem mục 9(1).

### 8.3. Cạm bẫy thứ ba: hai diff `.bun-tag-*` làm hỏng `parsePatchHunks`

Chúng có `diff --git` + `new file mode` + `index 000..e69de29` rồi **hết file** — không
`---`, không `+++`, không `@@`. Một parser viết bằng regex thẳng "mọi khối bắt đầu bằng
`diff --git` là một file, các khối `@@` bên trong là hunk" sẽ chạy đúng ở đây, nhưng
khi gặp block kế tiếp mà không có `---`/`+++` sẽ dễ nuốt nhầm. Bằng chứng bắt buộc có
trong test: assert hai tên `.bun-tag-*` có mặt trong danh sách file nhưng có **0** hunk.

### 8.4. Cạm bẫy thứ tư: `check:ts` xanh không có nghĩa file mới đúng kiểu

Xem 3.8. `bun run check:ts` không typecheck `scripts/`. Thêm vào đó `lint-staged`
(`package.json:187-201`) chỉ phủ `scripts/**/*.ts` — **không** phủ `patches/LEDGER.md`
hay `CONTRIBUTING.md`, nên hai file markdown đó không qua formatter nào. Nếu bạn muốn
sổ ổn định byte, hãy để script tự format bảng (căn cột cố định, `\n` cuối file)
thay vì trông chờ ai đó.

### 8.5. Cạm bẫy thứ năm: sửa `LEDGER.md` bằng tay rồi commit

Sổ bắt đầu bằng `<!-- GENERATED by scripts/gen-patch-ledger.ts — do not edit by hand. -->`
nhưng không có hook nào ngăn tay sửa. Nếu bạn sửa tay một lý do (rất dễ, vì cột
`purpose` trống và trông như chỗ để gõ), lần chạy kế tiếp sẽ **ghi đè** mất — và nếu
bạn không chạy lại trước khi commit, `--check` ở CI sẽ đỏ với lý do mà người review
đoán sai. Đây là lý do cổng `--check` phải nằm trong CI chứ không phải trong tay người
gõ.

### 8.6. Cạm bẫy thứ sáu: lan sang tầng khác

Work item đã tự cảnh báo: chỉ `patches/`, khoá Bun. Đừng sinh `LEDGER.md` ở `crates/`.
Đừng thêm generic hook cho "mọi thứ có bản vá cục bộ" — mỗi nơi phải tự chứng minh bằng
cùng một loại cổng.

---

## 9. Cần người quyết (chặn **trước khi** gõ dòng 8.1)

1. **`purpose` / `upstream` sống ở đâu?** Nếu script tự điền thì `reconcile` không kiểm
   được chúng (3.5 + 8.2) và ta lại dựng đúng cổng luôn-xanh mà work item cảnh báo.
   Đề xuất: sidecar riêng (`patches/LEDGER.notes.json` hoặc khối YAML ở cuối
   `LEDGER.md` mà generator **không** xoá), ledger sinh chỉ mang khoá hunk + con trỏ.
   Đây là câu hỏi chặn việc code.
2. **Cột `upstream` cho hunk không có issue?** Cùng câu hỏi của work item. Đo được: 18
   comment `// xxx-stealth:` rải trong 10 file, và **0** hunk nào ở file puppeteer có
   marker. Cho phép `null` là câu trả lời trung thực; ô điền bừa là nguồn sự thật thứ hai.
3. **Hai `.bun-tag-*` ghi gì?** Nếu chọn khoá hunk (bước 0) thì chúng không có hàng nào
   và câu hỏi này thu hẹp thành: có cần một dòng giải thích trong `LEDGER.md` không.
4. **Cột CHANGELOG thuộc item này?** Không đổi hành vi người dùng → theo luật M4 là
   không; nhưng `CONTRIBUTING.md` đổi cho người góp patch. Chờ quyết định changelog
   chung của Wave D.
5. **Thứ tự merge trước GAP-M1-18?** Đã đo: `doctor` hiện chỉ tồn tại dưới dạng
   `omp plugin doctor` (`packages/coding-agent/src/cli/plugin-cli.ts:32`, xử lý ở
   `:168`, qua `handleDoctor(manager, cmd.flags)`) — chưa có `omp doctor` cấp gốc. Nên
   phụ thuộc là thật, không hình thức.

---

## 10. Người review nên tự hỏi gì

- Sổ có **32** hàng không? (không phải 13, không phải 14)
- `git diff --exit-code -- patches/` sạch? (không phải `md5` chạy sau khi sửa)
- `git diff package.json` ra **đúng một dòng `+`**?
- `FrameManager.js` có 5 hàng chứ không phải 1?
- Hai file `.bun-tag-*` được giải thích bằng văn bản chứ không phải bằng 5/5 giả?
- Test mới có được CI chạy không (`.github/workflows/ci.yml:617`)?
- Có hàng nào trong `LEDGER.md` do script tự điền mà không có nguồn độc lập không?
