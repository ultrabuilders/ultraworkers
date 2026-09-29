# Phiếu triển khai — GAP-M1B-1: Cổng ngân sách module-graph cho từng entrypoint

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1B_EXECUTION_PLAN.md` (mục ở dòng 2654)
**Cây tham chiếu dùng để đối chiếu:** `/Users/tranquangdang21/Projects/pi-ref` (không có bản `cost.ts` nào ở cây khác trùng ý nghĩa)
**Trạng thái cây lúc viết phiếu:** `milestone-1`, HEAD `65cc6c1`, Bun 1.3.14, Node v26.3.0

---

## 0. Tóm tắt kiểm lại neo

Mười một neo. **Bảy đúng, bốn sai** — trong đó một sai nghiêm trọng (`cost.ts`), và ba sai
lệch nhẹ. Chi tiết ở §7.

| # | Neo trong work item | Kết quả |
| --- | --- | --- |
| 1 | `packages/utils/src/module-timer.ts` (6.3 KB, `Bun.plugin` `build.onLoad`) | ✅ đúng (6 502 B = 6.3 KB; `plugin`/`build.onLoad` ở 134–150) |
| 2 | `packages/utils/src/timing-buffer.ts` (1.6 KB) | ✅ đúng (1 616 B) |
| 3 | `logger.ts:524` drain buffer vào cây log | ⚠️ lệch nhẹ — 524 là dòng **doc comment**; drain thật ở 530/532 |
| 4 | `package.json:75` `"dev:timing"` | ✅ đúng, trùng khớp từng ký tự |
| 5 | `package.json:90` (`check:ts`) và `:91` (`check:tools`) | ✅ đúng |
| 6 | `grep -rniE 'entry.?graph\|...'` → 0 hit | ✅ đúng (exit 1, không output) |
| 7 | `scripts/check-entry-graphs.mjs` ở `pi` (5.3 KB) | ✅ tồn tại, 5 478 B; **nhưng cơ chế không chép được nguyên văn** — xem §7.2 |
| 8 | `scripts/cost.ts` ở `pi` (5.3 KB) | ❌ **hỏng nặng** — file tồn tại, nhưng nó là báo cáo **chi phí tiền API**, không phải cổng module-graph |
| 9 | `agent-treeshake-smoke-entry.ts` / `browser-smoke-entry.ts` "chạm `experimental/`" | ❌ sai lý do — không file nào chạm `experimental/`; cả `pi` lẫn omp đều **không có** thư mục này |
| 10 | `packages/omptype/LICENSE` làm hình mẫu | ⚠️ lệch nhẹ — omptype/LICENSE **không** có dòng Zechner; 4 LICENSE đã port mới có |
| 11 | `.oxlintrc.json` `ignorePatterns` (rủi ro 3) | ⚠️ lệch nhẹ — 26 mục, không phải 24; và `**/*.mjs` **đã** nằm trong đó |

---

## 1. Cái gì thay đổi, quan sát được

`bun run check:ts` từ gốc repo **in ra một bảng ngân sách module-graph cho từng entrypoint của
omp và thoát khác 0 khi bất kỳ entrypoint nào vượt ngưỡng file đã commit** — và `bun run
dev:timing` vẫn in cây `--- Startup timings (hierarchical) ---` y hệt như trước.

Không phải "thêm một script". Không phải "in thêm một con số". Trước khi có việc này,
`bun run check:ts` nói **không** một gì về chi phí import; sau khi có, nó **đỏ** khi
`packages/coding-agent/src/cli.ts` (hoặc bất kỳ entry nào khác) kéo nhiều hơn ngưỡng —
và in ra danh sách file vượt ngưỡng để người đọc không phải đoán.

---

## 2. Bảng điểm sửa

Mọi cột TRƯỚC trích từ file thật, đã mở và đọc.

### 2.1 `package.json`

| path | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `package.json:75` | `scripts.dev:timing` | `"dev:timing": "PI_TIMING=x bun --cwd=packages/coding-agent --preload ../utils/src/module-timer.ts src/cli.ts",` | **không đổi** — đây là hợp đồng phải bảo toàn |
| `package.json:90` | `scripts.check:ts` | `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",` | `"check:ts": "bun run check:entry-graphs && bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",` |
| `package.json` | `scripts.check:entry-graphs` | *(không có)* | `"check:entry-graphs": "node scripts/check-entry-graphs.mjs",` — dòng mới, đặt cạnh `check:tools` ở `:91` |

> **Vì sao nối vào `check:ts` chứ không phải `check:tools`:** `check:tools` là
> `oxlint . && oxfmt --check …` (`:91`). Cổng không phải linter, không phải formatter.
> Đặt nó ở đầu `check:ts` nghĩa là cổng chạy **trước cả** lint — graph phình to thì báo đỏ
> sớm, không mất 30 giây oxlint trước rồi mới đỏ.

### 2.2 `scripts/check-entry-graphs.mjs` (chép từ `pi`, rồi sửa)

| path | symbol | TRƯỚC (từ `pi-ref/scripts/check-entry-graphs.mjs`) | SAU |
| --- | --- | --- | --- |
| `:18` | `ROOT` | `const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");` | không đổi — đã đúng vì file nằm ở `scripts/` |
| `:21-28` | `WORKSPACE` | 6 khoá `@earendil-works/chord`, `@earendil-works/pi-ai`, `@earendil-works/pi-durable`, `@earendil-works/pi-agent-core`, `@earendil-works/pi-telemetry`, `@earendil-works/pi-tui` | khoá `@oh-my-pi/*` của omp: `pi-ai`→`packages/ai/src`, `pi-agent-core`→`packages/agent/src`, `pi-tui`→`packages/tui/src`, `pi-utils`→`packages/utils/src`, `pi-catalog`→`packages/catalog/src`. **Bỏ** `chord`/`durable`/`telemetry` (chưa có trong omp) |
| `:34-44` | `BUDGETS` | khoá theo **exports-subpath** (`"./utils/*"`, `"./harness/context"`, …) đọc từ `manifest.exports` | **thay toàn bộ** bằng danh sách **entrypoint file** đọc từ `scripts/entry-graph-baseline.json` — xem §5.2, vì cơ chế `manifest.exports` không áp dụng cho `src/cli.ts` |
| `:46` | `SPEC` | `/(?:^|\n)\s*(?:import\|export)\s+(?!type\s)([^;]*?\sfrom\s*)?["']([^"']+)["']/g` | **phải sửa** — regex này **không** match `await import("…")`. Xem §6.1, đây là cạm bẫy số một của mục này |
| `:100-135` | vòng lặp driver | `for (const [pkgDir, budgets] of Object.entries(BUDGETS))` … đọc `manifest.exports?.[entry]` | đọc entry list từ baseline file, `walk()` từng entry, so `graph.length` với `maxFiles` |
| `:137-141` | kết thúc | `console.error(\`\n${failures} entry-point budget violation(s).\`); process.exit(1);` / `console.log("Entry point graphs are within budget.");` | giữ nguyên **và in thêm tên entry + số thực tế vs ngưỡng** — xem §5.1 |

### 2.3 `scripts/entry-graph-baseline.json` (tạo mới)

| path | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| *(file mới)* | — | *(không có)* | xem §5.2 — JSON gồm `entries[]` (path + `maxFiles`) và `provisional: true` |

### 2.4 `LICENSE` (hình mẫu)

| path | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `LICENSE` (gốc) | dòng 3 | `Copyright (c) 2025 Mario Zechner` | giữ **nguyên dòng này ở vị trí đầu**, nối thêm hai dòng của omp |

Dòng kết quả (khớp đúng hình dạng `packages/ai/LICENSE:3-5`):

```
Copyright (c) 2025 Mario Zechner
Copyright (c) 2025-2026 Can Bölük
Copyright (c) 2026 Stencil Labs, Inc.
```

### 2.5 Không chép

| path | lý do (đã kiểm) |
| --- | --- |
| `scripts/cost.ts` | **Sai đối tượng** — xem §7.1 |
| `scripts/agent-treeshake-smoke-entry.ts` | không chạm `experimental/` (lý do trong work item sai); nó import `@earendil-works/pi-agent-core` — tên package của `pi`, không resolve trong omp |
| `scripts/browser-smoke-entry.ts` | không chạm `experimental/`; import `@earendil-works/pi-client`, `@earendil-works/pi-protocol` — cả hai không tồn tại trong omp |

---

## 3. Các bước

Mỗi bước có neo đã kiểm ở §0. Thứ tự này cố ý: **pháp lý trước, code sau, ngưỡng cuối cùng.**

### Bước 1 — Pháp lý, trước khi có dòng code nào được đặt xuống

Tạo `LICENSE` ở gốc repo. Lấy nguyên văn 21 dòng MIT từ `/Users/tranquangdang21/Projects/pi-ref/LICENSE`
(đã đọc; dòng 3 là `Copyright (c) 2025 Mario Zechner`). Giữ dòng Zechner ở vị trí đầu, nối thêm
hai dòng omp. Hình dẫn chính xác là `packages/ai/LICENSE:1-5` — **không** phải
`packages/omptype/LICENSE` như work item ghi (xem §7.4).

### Bước 2 — Chép `check-entry-graphs.mjs` rồi sửa ngay

Chép `/Users/tranquangdang21/Projects/pi-ref/scripts/check-entry-graphs.mjs` (141 dòng, đã đọc
toàn bộ) vào `scripts/`. Giữ nguyên shebang `#!/usr/bin/env node` và docblock ở `:2-12` — docblock
đó là lý do file tồn tại, sửa nó là mất lý do.

Sửa `WORKSPACE` (`:21-28`) sang tên package omp. **Không** sửa `walk()` (`:69-82`) và **không**
sửa `resolveSpec()` (`:48-67`) ngoài phần khoá workspace — chúng đã đúng.

### Bước 3 — Sửa `SPEC` để nhìn thấy `await import("…")`  ← **bắt buộc, xem §6.1**

Không sửa bước này thì cổng đo **4 cạnh** trên tổng **40 cạnh thật** của `src/cli.ts`
(đã đếm: `node -e` chạy regex gốc trên `packages/coding-agent/src/cli.ts` → 4 hit;
`grep -c "await import("` → 36). Một cổng đo sai 10 lần là cổng không có.

### Bước 4 — Thay `BUDGETS` bằng baseline file, và viết baseline file

Driver cũ đọc `manifest.exports?.[entry]` (`:104`). `src/cli.ts` **không** nằm trong exports map
của omp — đã kiểm: `packages/coding-agent/package.json` có 119 khoá exports, `"./cli"` **không**
trong đó (chỉ có `"./cli/*"` trỏ `./src/cli/*.ts`); `src/cli.ts` chỉ được trỏ tới bởi
`bin.omp = "src/cli.ts"` (`:28`). Cơ chế `manifest.exports` vì vậy không dùng được cho entrypoint
CLI. Thay bằng danh sách path trong baseline file.

Baseline **phải** ghi `provisional: true` — xem §5.3, đây là quyết định còn treo.

### Bước 5 — Nối cổng vào `package.json`

Thêm `check:entry-graphs` và tiền tố nó vào `check:ts` (`:90`). Không đụng `dev:timing` (`:75`).
Không đụng `check:tools` (`:91`).

### Bước 6 — Chứng minh cổng đỏ được **trước khi** kết luận mình xong

Không tin `check:ts` xanh. Chạy §5.1. Đây là bước duy nhất trong cả phiếu mà work item gọi là
"quan trọng nhất", nên nó ở cuối, không ở giữa.

### Bước 7 — Chạy lại `dev:timing` và **dán bằng chứng**

`bun run dev:timing` (`:75`). Bằng chứng phải là cây `--- Startup timings (hierarchical) ---`,
**không phải** "exit 0". Xem §6.3 — cây này **không** in ra với `--version` hay `--help`, nên cách
chạy phải đúng.

---

## 4. Hợp đồng test

Không có file `bun:test` nào. Đây là **hợp đồng của một cái cổng**, và nó phải đỏ được.
Ba điều kiện, mỗi điều kiện là một lệnh và một quan sát:

### 4.1 Cổng đỏ được và in ra con số

```bash
# nhớ lại ngưỡng, hạ xuống 1, chạy lại, khôi phục
node -e "const f='scripts/entry-graph-baseline.json';const j=require('./'+f);j.entries[0].maxFiles=1;require('fs').writeFileSync(f,JSON.stringify(j,null,2))"
bun run check:entry-graphs; echo "exit=$?"
```

**Phải thấy:** exit khác 0, và output có dạng

```
packages/coding-agent/src/cli.ts reaches 15 files, budget 1
    packages/ai/src/types.ts
    packages/catalog/src/effort.ts
    …
```

**Hồi quy = người dùng thấy gì:** một PR thêm `export *` vào một barrel trên đường tới `cli.ts`
vẫn merge được, và ba tháng sau người đó tự hỏi vì sao `omp` khởi động chậm hơn — không có gì
trong lịch sử CI chỉ ra nguyên nhân. Đây đúng là thứ GAP-M1B-5 cần để chứng minh cải thiện.

> Con số **15** ở trên không phải phỏng đoán. Đã chạy bản sao nguyên văn `walk()` của `pi` (cùng
> `SPEC`, cùng `resolveSpec`) trên cây omp: `packages/coding-agent/src/cli.ts -> 15 files`.
> Danh sách đủ 15 đã lấy. Con số này sẽ **thay đổi** sau M1B port — đó là lý do baseline phải
> chụp đúng thời điểm, không phải vì lý do khác.

### 4.2 Đường đo không bị cổng nuốt

```bash
bun run dev:timing -- --version   # hoặc xem §6.3 cho cách ra cây thật
```

**Phải thấy:** preload vẫn được nạp. Bằng chứng dạng mạnh nhất, không cần chạy tới TUI:
`PI_TIMING=x bun --cwd=packages/coding-agent --preload ../utils/src/module-timer.ts -e 'import("packages/utils/src/module-timer.ts")'`
không ném lỗi **và** `globalThis[Symbol.for("omp.moduleLoadBuffer")]` tồn tại sau khi preload.

**Hồi quy = người dùng thấy gì:** `dev:timing` in ra một cái cây trống rỗng hoặc báo
`(no markers)`, và không ai phát hiện cho tới khi GAP-M1B-5 cố chứng minh một PR tối ưu có tác
dụng — bằng chứng duy nhất đã biến mất.

### 4.3 Ranh giới luật giữ nguyên

- Quét (grep) được phép **trong cổng**, không bao giờ trong test.
- Không `mock.module()`.
- Không khẳng định kiểu "chuỗi không rỗng" hay "dài hơn trước" khi không có consumer phía sau.
- Không có `bun:test` file nào cho cổng này. Ba điều trên là toàn bộ hợp đồng.

---

## 5. Cổng

### 5.1 Cổng chính — **có đỏ được**

```bash
# từ gốc repo
bun run check:entry-graphs        # một mình
bun run check:ts                  # qua cổng
```

**Trả lời cụ thể: cổng này CÓ đỏ được, bằng cách nào.**

Cơ chế đỏ nằm ở `check-entry-graphs.mjs:137-140` (giữ nguyên khi chép):

```js
if (failures > 0) {
    console.error(`\n${failures} entry-point budget violation(s).`);
    process.exit(1);
}
```

`failures` tăng ở hai chỗ, cả hai đều **fail-closed** — không có đường nào đi vòng:

- `:119-125` — `graph.length > budget.maxFiles` → in **toàn bộ danh sách file** vượt ngưỡng.
- `:126-132` — một mẫu `forbid` chạm đúng → in **từng file** vi phạm.

Không có `catch` nuốt lỗi, không có `continue` khi resolve thất bài. Ngưỡng đếm **số file**, tức
một con số nguyên — thêm một dòng `export *` vào một file trên đường đi là đủ làm đỏ.

**Đây là câu trả lời quan trọng nhất của phiếu, nên nói thẳng phần đáng lưu ý:** cổng này đỏ được
**cho hồi quy module-graph**, và **không** đỏ được cho thứ khác. Nó không đo thời gian, không đo
bộ nhớ, không bắt được việc thêm một `await import()` làm chậm khởi động. `dev:timing` đo thời
gian; `check-entry-graphs.mjs` đo **số file**. Ai đọc báo cáo cổng phải hiểu đó là hai thước đo
khác nhau, không phải hai cách đo cùng một thứ.

### 5.2 Baseline — **có đỏ được, nhưng chỉ sau khi chốt thời điểm**

```bash
node -e "const j=require('./scripts/entry-graph-baseline.json'); console.log(j.provisional, j.entries)"
```

**Trả lời cụ thể:** ngưỡng nằm trong file **đã commit** (`scripts/entry-graph-baseline.json`),
không hard-code trong script. Đây là điểm work item nhấn đúng, và lý do đúng: một ngưỡng nằm
trong code là một ngưỡng mà lần refactor sau sẽ sửa để "cho qua" mà không ai để ý. Tách ra file
riêng nghĩa là mọi lần nới ngưỡng xuất hiện trong `git diff` như một dòng dữ liệu, không phải như
một sửa lỗi.

**Cổng này có một điều kiện bắt buộc chưa được chốt, và tôi không tự chốt thay.** Work item dẫn
`GAP-D13`, mà `GAP-D13` chỉ tồn tại trong `.lavish-wip/GAP-REGISTER-2.md:1355` dưới dạng câu hỏi
mở, chưa phải quyết định. Ba phương án trong sổ:

| | phương án | hậu quả |
| --- | --- | --- |
| (a) | chụp ở HEAD hôm nay | cổng đỏ ngay lần chạy đầu; phản ứng tự nhiên là nới ngưỡng → cổng chết |
| (b) | chụp sau M1 merge **và** sau sóng port đầu tiên | đúng, nhưng trì hoãn; cổng bỏ lọt đúng sóng nó sinh ra để bắt |
| (c) | chụp ở HEAD **và** đánh dấu `provisional: true` trong chính file, chỉnh khi port xong | cổng đỏ sớm, có điều kiện |

**Khuyến nghị (c)**, và lý do cụ thể: (a) hỏng vì phản ứng mặc định của người implementer khi thấy
cổng đỏ là nới ngưỡng — biến cổng thành con số chết trong một lần sửa. (b) trì hoãn thì GAP-M1B-5
mất nền để chứng minh cải thiện. (c) giữ cả hai, **với điều kiện bắt buộc mà tôi đưa thêm vào
phiếu này**: dòng `provisional` phải nằm trong file baseline, và phải có **cơ chế ép cổng báo
"ngưỡng tạm"** khi nó đang provisional — nếu không, `"provisional": true` chỉ là một chữ trong
JSON mà không ai đọc, tức là tương đương phương án (a) với thêm một dòng JSON.

Nếu chốt (c), hình dạng cổng phải có:

```
scripts/entry-graph-baseline.json
  "provisional": true,
  "capturedAt": "<ngày>",
  "capturedAfter": "M1 merge chưa xong — ngưỡng tạm, chốt lại sau sóng port đầu",
  "entries": [ { "path": "packages/coding-agent/src/cli.ts", "maxFiles": 15 }, … ]
```

và khi `provisional === true`, exit code phải là **riêng** (ví dụ 2) để phân biệt "cổng có
chạy nhưng ngưỡng chưa chín" với exit 1 (vi phạm thật).

**Nhưng exit 2 thì `check:ts` sẽ đỏ theo** — vì `check:ts` (`:90`) nối bằng `&&`, nên bất kỳ
exit khác 0 nào cũng làm toàn bộ `check:ts` đỏ. Đây là hệ quả của lựa chọn (c) mà người đọc
phải biết trước, không phải sau:

> Chốt (c) **không** có nghĩa "cổng xanh trong lúc tạm". Nghĩa là "cổng đỏ **có lý do**, và
> lý do được ghi rõ trong output". Đỏ vì ngưỡng tạm vẫn hơn xanh vì không có ngưỡng — vì
> phải sửa mới xanh, và việc sửa đó để lại dấu vết trong `git diff`.

Nếu muốn cổng **xanh** trong lúc provisional, phải làm ngược lại: exit 0 nhưng in cảnh báo
`provisional` ra stderr. **Không khuyến nghị** — đó là chính là cổng "luôn xanh" mà chính work
item này gọi là tệ hơn không có cổng, chỉ khác là có thêm một dòng cảnh báo. Giữ exit ≠ 0.

### 5.3 Cổng "cổng đã vào" — **trả 0 hit trước, phải ≥ 1 hit sau**

```bash
grep -rniE 'entry.?graph|bundle.?budget|startup.?budget|graph.?cost' package.json scripts/ .github/
```

Đã chạy trên cây hiện tại: **exit 1, không output** — khớp `0 hit` trong work item. Sau khi
nối cổng, lệnh này phải trả ít nhất một hit (`package.json:check:entry-graphs` và
`package.json:check:ts`).

Đây là phép đo "trước khi thêm" của chính mục này, và nó là cách **duy nhất** chứng minh cổng
đã vào mà không cần một bài test source-grep — vốn bị *Quy ước khi đọc* cấm. Giữ nguyên ý này.

### 5.4 Cổng lint/format — **cổng này không tự được lint**

```bash
bun run check:tools
```

Đây là phần phải nói thẳng. `check:tools` (`:91`) là
`oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' 'packages/*/*.ts' 'scripts/**/*.ts'`.

Glob cuối là `'scripts/**/*.ts'` — **`.ts`, không phải `.mjs`**. Và `.oxlintrc.json:55` có
`"**/*.mjs"` trong `ignorePatterns`.

**Hệ quả trực tiếp: file `scripts/check-entry-graphs.mjs` sẽ không được oxlint quét, cũng
không được oxfmt kiểm tra định dạng.** Không phải rủi ro giả định — đây là hành vi đã kiểm
từ cấu hình hiện có.

Hai lựa chọn, và tôi chọn **(1)**:

1. **Viết cổng bằng `.ts`, không phải `.mjs`.** `scripts/**/*.ts` đã nằm trong glob oxfmt,
   và oxlint sẽ quét nó. Đổi cách gọi thành `bun scripts/check-entry-graphs.ts`. Pháp lý vẫn
   giữ nguyên (Zechner ở LICENSE). Đánh đổi: mất hình dạng "chép nguyên văn `.mjs`" — nhưng
   hình dẫn sự giống nhau ở đây chỉ là "chép rồi sửa danh sách entry", và bước 3–4 của phiếu
   này đã viết lại phần lõi của cổng rồi. Cổng đã không còn là bản chép.
2. **Giữ `.mjs` và sửa `ignorePatterns`.** Không khuyến nghị: đụng `ignorePatterns` là cái bẫt
   GAP-M1-19 đã ghi, và nó tắt rule cho **mọi** file khác khớp glob.

Nếu vẫn muốn giữ `.mjs` (ví dụ để đối chiếu 1-1 với `pi`), thì **phải** thêm `'scripts/**/*.mjs'`
vào glob oxfmt ở `check:tools:91` và **không** thêm gì vào `ignorePatterns`. Đó là hai sửa đổi
thay cho một.

---

## 6. Cạm bẫy riêng của work item này

### 6.1 Cạm bẫy số một: `SPEC` của `pi` không thấy `await import()` — và `cli.ts` của omp **toàn bộ** là dynamic import

Đây là cái dễ làm sai nhất, vì nó **không biểu hiện bằng lỗi**. Script chạy, exit 0, in
"Entry point graphs are within budget." — và con số nó bảo vệ là sai.

`pi-ref/scripts/check-entry-graphs.mjs:46`:

```js
const SPEC = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)([^;]*?\sfrom\s*)?["']([^"']+)["']/g;
```

`import\s+` — dấu cách bắt buộc sau `import`. `await import("./x")` có `import(` ngay, không
có khoảng trắng, nên **không** khớp.

Đã đếm trên cây thật:

```
STATIC  (regex của pi thấy):  4   ["@oh-my-pi/pi-utils/dirs","@oh-my-pi/pi-utils/worker-host","./cli/profile-bootstrap","./cli/worker-selectors"]
DYNAMIC (regex của pi BỎ QUA): 36
tổng cạnh thật: 40
```

Tỉ lệ **4 trên 40**. Đây không phải chi tiết nhỏ: `cli.ts` cố tình dùng dynamic import ở
khắp nơi — `packages/coding-agent/src/cli.ts:572` có chú thích giải thích đúng lý do:

> *"Intentional exception to the static-import convention: this latency boundary keeps the
> TUI graph out of worker, subcommand, help, and version launches."*

Kiến trúc của omp **cố tình** giữ graph lớn ra khỏi đường tĩnh. Cổng đo ngược lại đúng cái
thứ mà kiến trúc đó giấu. Không sửa `SPEC` thì cổng bảo vệ một thứ không tồn tại.

**Vì sao dễ làm sai:** vì copy-paste `SPEC` từ `pi` trông đúng, chạy thì xanh, và người
implementer không có lý do gì để nghi ngờ một regex mà mình vừa chép từ nguồn đáng tin.

### 6.2 Cạm bẫy hai: cơ chế `manifest.exports` không áp dụng cho entrypoint CLI

Driver gốc (`:101-110`) đi qua `manifest.exports?.[entry]` và báo đỏ nếu export không tồn tại:

```js
const declared = manifest.exports?.[entry];
if (!declared) {
    console.error(`${pkgDir} declares no export "${entry}" but a budget exists for it`);
```

`src/cli.ts` không có trong exports map. Đã kiểm `packages/coding-agent/package.json`:
119 khoá exports, `"./cli"` **không** có (chỉ `"./cli/*"` → `./src/cli/*.ts`), còn `src/cli.ts`
chỉ được trỏ tới bởi `bin.omp = "src/cli.ts"` (`:28`). Bản chép nguyên văn sẽ **đỏ ngay ở dòng
đầu tiên** với thông báo "declares no export".

Work item nói *"ngoài danh sách entry không có gì để repoint"* — đúng một nửa. Nửa kia: có một
**thứ nữa** phải repoint, đó là cả driver, không chỉ danh sách.

### 6.3 Cạm bẫy ba: bằng chứng `dev:timing` mà work item yêu cầu, chạy sai sẽ không ra cây

Bước 5 của work item: *"bằng chứng phải là cây log vẫn ra — không phải 'không có lỗi'"*. Đúng.
Nhưng `printTimings()` được gọi ở `packages/coding-agent/src/main.ts:2442` và `:2489` — **trong
`main.ts`, không phải `cli.ts`**, và sau khi scope model đã resolve.

Đã chạy thật:

| lệnh | kết quả |
| --- | --- |
| `bun run dev:timing --version` | in `omp/18.4.0`. **Không** có cây timings |
| `bun run dev:timing --help` | in help dài. **Không** có cây timings |
| `bun run dev:timing` (không arg) | mở TUI; cần model đã cấu hình |
| `bun run dev:timing --print "…"` với agent dir rỗng | dừng ở `No models available.` — chưa tới `printTimings` |

Nghĩa là: **"exit 0" ở đây không phải bằng chứng, và `--version`/`--help` cũng không phải.**
Bằng chứng đúng là cây `--- Startup timings (hierarchical) ---` với các dòng module dưới
nó — mà chỉ xuất hiện khi `main.ts` chạy tới `:2442`. Người implementer chạy `--version`, thấy
exit 0, ghi "không vỡ" và đóng ticket. Đó là kịch bản "thành công âm thầm" số ba trong danh
sách rủi ro — chỉ khác là nó xảy ra ngay ở bước ngay trước khi đóng.

Cách kiểm chắc chắn hơn, không cần model: preload có guard ở `module-timer.ts:108`
(`if (process.env.PI_TIMING)`) và đẩy vào buffer qua `moduleLoadBuffer()`
(`timing-buffer.ts:30-38`). Kiểm tra symbol tồn tại là bằng chứng preload còn sống, độc lập với
việc TUI có chạy tới đâu.

### 6.4 Cạm bẫy bốn: `cost.ts` — file sai, và nó sẽ cho kết quả nghe rất hợp lý

Chi tiết ở §7.1. Tóm tắt cạm bẫy: `cost.ts` là một báo cáo chi phí token, chạy thì in ra
bảng `$12.3456` rất đẹp, rất giống "cổng ngân sách". Người implementer chép nó vào, chạy thấy
in ra số, tưởng xong. Không có gì trong output đó liên quan đến module-graph.

---

## 7. Các mục trong work item sai so với cây thật

Ghi ra, không sửa trong tài liệu.

### 7.1 `scripts/cost.ts` — hỏng nặng

Work item ghi: *"`scripts/cost.ts` (5.3 KB) | chép rồi sửa | **Cùng danh sách entry**. Ngưỡng
đọc từ file baseline"*, và ở phần nguồn: *"`check-entry-graphs.mjs` và `cost.ts` là hai file
`.mjs` độc lập"*.

Đã đọc **toàn bộ 183 dòng** của `/Users/tranquangdang21/Projects/pi-ref/scripts/cost.ts`.

Nó làm gì: người dùng chạy `cost.ts -d <thư mục> -n <số ngày>`; nó mã hoá đường dẫn thành tên
session (`--<đường-dẫn-thay-/-` ở `:32-36`), đọc `~/.pi/agent/sessions/<tên>/*.jsonl`
(`:38-40`), lọc `entry.type === "message"` && `entry.message.role === "assistant"`
&& `entry.message?.usage?.cost` (`:92-94`), cộng `cost.total` theo ngày × provider
(`:113-118`), in bảng `TOTALS BY PROVIDER` và `GRAND TOTAL` (`:170-183`).

Đó là **báo cáo chi phí token LLM theo ngày**. Không có `walk`, không có `SPEC`, không có
`maxFiles`, không có `budget`. `grep -n "entry|BUDGET|maxFiles|budget" scripts/cost.ts` chỉ trả
về 8 hit, và **tất cả** là biến cục bộ tên `entry` trong vòng lặp parse JSONL — không liên quan.

Kiểm chéo: `find` trên cả 7 cây tham chiếu cho `cost.ts`/`cost.mjs` → chỉ `pi-ref` và
`senpi-ref`, và `senpi-ref/scripts/cost.ts` **giống hệt** (5 448 B, cùng nội dung). Không có
cây nào có một `cost.ts` nào khác. `git log -- scripts/cost.ts` trong `pi-ref` cho 2 commit,
cả hai đều về lint/deps — không phải về entry-graph.

**Nguồn gốc của nhầm lẫn nhiều khả năng là tên file.** `cost.ts` nghe như "cost of the module
graph". Nó không phải.

**Hệ quả cho effort:** work item ước lượng *"2 file `.mjs` + 1 file baseline + 1 dòng trong
`check:ts`"*. Thực tế là **1 file cổng + 1 file baseline + 1 dòng `package.json` + 1 file
`LICENSE`**, và phần cốt lõi của file cổng phải viết lại (driver + `SPEC`) chứ không chép
nguyên văn. Ước lượng S / 0,5 ngày vẫn **đúng**, nhưng vì lý do khác với work item nêu.

### 7.2 `check-entry-graphs.mjs` — có thật, nhưng "chép rồi sửa danh sách entry" là chưa đủ

File tồn tại, 5 478 B (khớp "5.3 KB"). Nhưng §6.1 và §6.2 cho thấy hai chỗ phải sửa ngoài danh
sách entry: `SPEC` (`:46`) và driver (`:101-135`). Cột ghi chú trong bảng "File cần chạm tới" —
*"Ở cây nguồn file này không import gì từ omp, nên ngoài danh sách entry không có gì để
repoint"* — đúng về mặt import (không có import nào từ omp) nhưng sai về mặt cơ chế.

Phần đúng và đáng giữ: docblock `:2-12` giải thích cơ chế, `walk()` `:69-82` và `resolveSpec()`
`:48-67` chạy đúng, và cặp `fail-closed` ở `:119-132` là cốt lõi để cổng đỏ được.

### 7.3 "Hai smoke entry chạm `experimental/`" — sai

Work item: *"KHÔNG lấy `agent-treeshake-smoke-entry.ts` / `browser-smoke-entry.ts` — chúng
chạm `experimental/` mà M1B đã loại."*

Đã đọc cả hai file trong `pi-ref/scripts/`. `grep -n "experimental"` trên cả hai → **0 hit**.
Và `find . -maxdepth 3 -name experimental` trong `pi-ref` → **không có thư mục nào**; làm lại
trong omp → cũng không.

Lý do thật để loại vẫn có, chỉ là lý do khác: `agent-treeshake-smoke-entry.ts:1-3` import
`@earendil-works/pi-agent-core` và `@earendil-works/pi-ai`; `browser-smoke-entry.ts:1-24`
import `@earendil-works/pi-client`, `@earendil-works/pi-protocol`… Tên package của `pi`, không
resolve trong omp (omp dùng `@oh-my-pi/*`). **Kết luận giữ nguyên, lý do phải viết lại** — vì
lý do sai sẽ khiến người đọc đi tìm một thư mục `experimental/` không tồn tại.

Hệ quả phụ đáng lưu: câu hỏi *"Hai smoke entry bị loại có cần một smoke entry tương đương cho
omp không?"* — câu trả lời là **không cần một entry riêng**, vì `packages/coding-agent/src/cli.ts`
**đã là** một entry thật, có trong `bin.omp`, và là entry đáng đo nhất. Effort "2 file + 1
baseline" của work item không cần sửa vì lý do này.

### 7.4 `packages/omptype/LICENSE` làm hình mẫu — chọn sai file

Work item: *"`LICENSE` | hình mẫu: `packages/omptype/LICENSE` | … giữ `Copyright (c) 2025 Mario
Zechner` là dòng **đầu**"*.

`packages/omptype/LICENSE:1-5` **không có dòng Zechner**:

```
MIT License

Copyright (c) 2025-2026 Can Bölük
Copyright (c) 2026 Stencil Labs, Inc.
```

Nó là mẫu MIT sống của omp, nhưng **không** phải mẫu cho bài toán "nối thêm dòng vào dòng Zechner
đã có". File đúng làm mẫu là bất kỳ file nào trong bốn file đã chứa cả hai bên —
`packages/ai/LICENSE:1-5`, `packages/agent/LICENSE`, `packages/coding-agent/LICENSE`,
`packages/tui/LICENSE` — đều có đúng ba dòng theo thứ tự Zechner → Bölük → Stencil.

Đã đối chiếu với nguồn: `pi-ref/LICENSE:3` là `Copyright (c) 2025 Mario Zechner`, và
`git log -1` của `pi-ref` cho `Mario Zechner <badlogicgames@gmail.com>`. Pháp lý MIT ở đây
đúng như work item nói; chỉ có **con trỏ hình mẫu** là sai.

### 7.5 `logger.ts:524` — neo lệch 6 dòng, chỉ tới doc comment

Work item: *"`logger.ts:524` drain buffer vào cây log"*.

`packages/utils/src/logger.ts:524` là dòng đầu của docblock JSDoc mô tả `spliceModuleLoadBuffer`.
Drain thật nằm ở:

- `:530` — `function spliceModuleLoadBuffer(): void {`
- `:532` — `const events = drainModuleLoadEvents();`
- `:443` — chỗ gọi `spliceModuleLoadBuffer()` từ `printTimings()`
- `:19` — `import { drainModuleLoadEvents } from "./timing-buffer";`

Nội dung mà tài liệu mô tả là **đúng** (đúng là drain buffer vào cây log); chỉ **số dòng** lệch.
Neo đúng cho hành vi: `packages/utils/src/logger.ts:443`.

### 7.6 `.oxlintrc.json` `ignorePatterns` — 26 mục, không phải 24

Rủi ro 3 của work item (và mục 1 của "Cái được bảo toàn" ở GAP-M1B-2) gọi nó là "24 dòng".
Đã đếm: `require('./.oxlintrc.json').ignorePatterns.length` → **26**. Khối đó chiếm `:31-58`.

Không quan trọng cho kết luận, nhưng có một điều quan trọng mà work item **không** nói, và nó
làm yếu rủi ro 3 đi: `**/*.mjs` **đã** nằm trong `ignorePatterns` (`:55`). Nghĩa là cổng `.mjs`
sẽ **tự động** nằm ngoài oxlint, không cần ai đưa vào danh sách. Rủi ro thật không phải "ai đó
thêm nhầm" — mà là **không ai thêm gì cả và cổng vẫn nằm ngoài lint, âm thầm**. Xem §5.4.

---

## 8. Danh sách câu lệnh cuối

```bash
# 1. cổng đỏ được — bắt buộc, không làm thì chưa xong
node -e "const f='scripts/entry-graph-baseline.json';const j=require('./'+f);j.entries[0].maxFiles=1;require('fs').writeFileSync(f,JSON.stringify(j,null,2))"
bun run check:entry-graphs; echo "exit=$?"     # phải khác 0, và in ra con số
# ...khôi phục maxFiles...

# 2. cổng qua cổng
bun run check:ts

# 3. preload còn sống
PI_TIMING=x bun --cwd=packages/coding-agent --preload ../utils/src/module-timer.ts \
  -e 'console.log(typeof globalThis[Symbol.for("omp.moduleLoadBuffer")] !== "undefined")'

# 4. cổng đã vào (trước: 0 hit)
grep -rniE 'entry.?graph|bundle.?budget|startup.?budget|graph.?cost' package.json scripts/ .github/

# 5. cây timings thật — cần main.ts chạy tới :2442, xem §6.3
bun run dev:timing
```

**Tuyệt đối không dùng `tsc` / `npx tsc`.** Kiểm tra kiểu là `bun check` / `bun run check:ts`.
Không sửa file kế hoạch nào. Không sửa `.oxlintrc.json` `ignorePatterns`.
