# PHIẾU TRIỂN KHAI — W8b

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_5_EXECUTION_PLAN.md`, mục `## W8b.` (dòng 2602–2843)
**Nguồn:** `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (bảng N1–N17 §2.3, mục `do_not_rename` dòng 16895)
**Cây đo:** HEAD `47720fd` (2026-09-29). Đặc tả đo ở HEAD `1454dc0`.
**Ngày đo:** 2026-09-29

> **Cảnh báo lớn nhất của phiếu này:** cây đã trôi rất xa so với HEAD mà đặc tả đo. `git diff --stat 1454dc0 HEAD -- '*.ts'` → **796 file, +12780/−21813**. Mọi con số trong đặc tả (599/1853, 26, 94, 280, 14, 61, 24, 373/226) đều sai ở HEAD hôm nay. Kỹ sư **không được** dùng bất kỳ con số nào trong đặc tả làm kỳ vọng cứng. Bảng «Số đo lại» ở mục 2 là con số đúng dùng được.

---

## 1. Cái gì thay đổi, quan sát được

Khi `bun scripts/rename/check-disposition.ts --stage=pre` và `--stage=post` cùng exit 0, thì **không còn chỗ nào trong 607 file `.ts` mà token `omp` đứng riêng có thể bị đổi mà không ai biết** — mỗi lượt đều đã được một bảng 6 cột ghi rõ `rename` hay `keep-*`, kèm lý do và mục §2.3 tham chiếu; và sau khi đổi, cùng một bảng đó chứng minh được **không lượt `rename` nào còn sót** và **không lượt `keep-*` nào bị đụng nhầm**.

---

## 2. Bảng điểm sửa

### 2.1 Ba file `scripts/rename/` — tạo mới (đề xuất của đặc tả, chưa tồn tại)

Đã kiểm: `ls scripts/rename/` → `No such file or directory`. Đây là khoảng trống thật, đặc tả nói đúng.

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `scripts/rename/disposition.tsv` | header TSV 6 cột | *(file không tồn tại)* | dòng header đúng một dòng, tab phân cách, không quote, không dòng comment: `scope⇥path⇥hits⇥disposition⇥reason⇥keep_refs` |
| `scripts/rename/check-disposition.ts` | `parseDisposition` / `checkPre` / `checkPost` | *(file không tồn tại)* | xem bảng dưới |
| `scripts/rename/README.md` | schema 6 cột + từ vựng + quy trình duyệt | *(file không tồn tại)* | mô tả từ vựng `scope`/`disposition`, quy tắc `hits`, và ai duyệt ở bước nào |

Hình dạng `check-disposition.ts` — trích nguyên văn từ đặc tả (mục «Hình dạng code»):

```typescript
export type Disposition = "rename" | "keep-wire" | "keep-path" | "keep-worker-selector" | "keep-doc-name";
export type Scope = "display-token" | "dot-omp-literal" | "bare-oh-my-pi" | "app-name-literal";

export interface DispositionRow {
  scope: Scope;
  path: string;
  hits: number;
  disposition: Disposition;
  reason: string;
  keepRefs: string[];
}

export function parseDisposition(text: string): { rows: DispositionRow[]; violations: string[] };
export function checkPre(rows: DispositionRow[], treeHits: Map<string, number>): string[];
export function checkPost(rows: DispositionRow[], treeHits: Map<string, number>): string[];

const OMP_TOKEN_ERE = '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)';
```

Ba file này là **sản phẩm của W8b** — không có chúng thì 607 file không có cổng nào canh.

### 2.2 Biểu thức đếm — cái duy nhất được phép dùng

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `scripts/rename/check-disposition.ts` | `OMP_TOKEN_ERE` | *(chưa có)* | hằng số `'…'` ở trên; **cấm `\b` và `\<`** |

Vì sao cấm: đo lại hôm nay trên `packages/utils/src/dirs.ts` —
- `git grep -cE '\bomp\b' -- packages/utils/src/dirs.ts` → **không in dòng nào, exit 1**
- `command grep -cE '\bomp\b' packages/utils/src/dirs.ts` → **105**
- `command grep -cE '[[:<:]]omp' packages/utils/src/dirs.ts` → **105**
- biểu thức đã ghim, đếm DÒNG → **19 dòng**; đếm LƯỢT (`-oE`) → **21 lượt**

Một cổng viết bằng `git grep -E '\bomp\b'` **luôn xanh** vì không khớp gì. Đó là loại cổng nguy hiểm nhất: nó không đỏ khi sai.

### 2.3 Số đo lại tại HEAD `47720fd` — thay toàn bộ con số của đặc tả

Đo từ repo root. `git grep` không có pathspec thì chỉ quét thư mục đang đứng.

| đại lượng | đặc tả (HEAD `1454dc0`) | đo thật (HEAD `47720fd`) | lệnh |
| --- | --- | --- | --- |
| file `.ts` có token `omp` | 599 | **607** | `git grep -lE "$E" -- '*.ts' \| wc -l` |
| lượt token `omp` | 1853 | **1867** | `git grep -oE "$E" -- '*.ts' \| wc -l` |
| file test / file nguồn | 226 / 373 | **227 / 380** | lọc `(^\|/)(test\|tests)/\|\.test\.ts$` |
| file có cả token lẫn `".omp"` | 26 | **27** | `comm -12` hai tập |
| file có cả token lẫn selector | 11 | **11** (đúng) | `comm -12` hai tập |
| file chỉ thuần hiển thị | 562 | **564** | `607 − 43` |
| A ∪ B ∪ C | 42 | **43** | xem bên dưới |
| literal `".omp"` toàn repo — lượt / file | 280 / 94 | **401 / 94** | `git grep -oE '"\.omp"' -- . \| wc -l` |
| file test có `".omp"` | 61 | **60** | `git grep -lE '"\.omp"' -- 'packages/**/test/**' \| wc -l` |
| tập W11 (hợp nhất 2 tập test) | 70 | **69** | `cat \| sort -u \| wc -l` |
| W11 ∩ tập test của W8b | 24 | **25** | `comm -12` |
| file `.ts` chứa `"oh-my-pi"` | 14 | **11** | `git grep -lE '"oh-my-pi"' -- '*.ts' \| wc -l` |
| selector non-test — dòng / file | 30 / 14 | **30 / 14** (đúng) | `git grep -n '__omp_worker_' -- '*.ts' ':!*test*'` |
| chuỗi selector phân biệt | 21 | **21** (đúng) | `git grep -oh '__omp_worker_[a-z_]*' -- '*.ts' \| sort -u \| wc -l` |
| file có ≥2 lượt (`-oE`) | 318 | **321** | `cut -d: -f1 \| uniq -c \| awk '$1>=2'` |
| file có ≥2 dòng (`-cE`) | 310 | **312** | `git grep -cE "$E" -- '*.ts' \| awk -F: '$2>=2'` |
| file trong 607 chứa literal `"omp"` | 98 | **98** (đúng) | vòng lặp `git grep -qE '"omp"' -- $f` |
| `update-cli.test.ts` lượt / dòng | 59 / 58 | **59 / 58** (đúng) | `-oE` vs `-cE` |

`401` lượt `".omp"` toàn repo (đặc tả ghi 280) phần lớn đến từ **chính các file kế hoạch**: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` 81 lượt, `MILESTONE_5_EXECUTION_PLAN.md` 77 lượt. Đây chính là bẫy «tài liệu tự nhiễm» mà `open_questions[1]` của W8a đã cảnh báo — **mọi lệnh đếm phải có `:!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`**, kể cả khi tính `scope=display-token`.

Phân bố theo gói ở HEAD hôm nay: coding-agent 426, ai 59, tui 47, utils 14, catalog 12, stats 10, metaharness 10, natives 5, wire 3, browser-relay 3, omptype 2, agent 2, `scripts/` 11, và 1 file trong `.omp/` của chính repo (`.omp/tools/tui.ts`).

### 2.4 Cột `hits` — mỗi disposition một biểu thức

Đây là quyết định thiết kế quan trọng nhất. ERE đã ghin **cố ý loại `_` và `.`** ở ranh giới trước `omp`, nên nó **không thấy** selector lẫn literal `.omp`. Đo lại trên 11 file Nhóm B hôm nay: **26 selector nhưng 31 lượt ERE**; trên 27 file Nhóm C: **73 literal nhưng 85 lượt ERE**; `packages/utils/src/dirs.ts` có **4 literal `".omp"` mà ERE tính 0 lượt** cho lớp đó.

| `disposition` | biểu thức đo `hits` |
| --- | --- |
| `rename` | `git grep -oE '(^\|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]\|$)' -- <path> \| wc -l` |
| `keep-wire` | cùng ERE trên |
| `keep-worker-selector` | `git grep -o '__omp_worker_' -- <path> \| wc -l` |
| `keep-path` | `git grep -oE '"\.omp"' -- <path> \| wc -l` |
| `keep-doc-name` | không dùng trong `scope=display-token` (tài liệu là `.md`, thuộc W13) |

Bất biến kiểm: **tổng `hits` mọi hàng cùng `path` = tổng lượt thật của file đó**. Đo bằng `-oE`, **không** bằng `-cE` (cái sau đếm DÒNG — 321 vs 312 ở trên là bằng chứng).

### 2.5 Sửa 607 file — từng lượt `disposition=rename`

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 380 file nguồn + 227 file test | token `omp` đứng riêng | `… "omp" …` (token đứng riêng) | giá trị tên hiển thị mới, **theo từng hàng của bảng** |
| `packages/utils/src/dirs.ts` | `APP_NAME` | `export const APP_NAME: string = "omp";` | đọc/ghi qua hằng số đã đổi của W1 |
| `packages/coding-agent/src/cli/commands/init-xdg.ts` | `APP_NAME` | `const APP_NAME = "omp";` | đọc hằng số từ `dirs.ts` |
| `packages/tui/src/desktop-notify.ts` | `APP_NAME` | `const APP_NAME = "omp";` | đọc hằng số từ `dirs.ts` |
| `packages/tui/src/terminal-capabilities.ts` | `CMUX_NOTIFICATION_TITLE` | `const CMUX_NOTIFICATION_TITLE = "omp";` | đọc hằng số từ `dirs.ts` |

**ĐỪNG chạy `sed` trên 607 file.** Đó chính là kịch bản tai nạn mục này sinh ra để chặn.

---

## 3. Các bước, mỗi bước có neo đã kiểm

### Bước 0 — DỪNG nếu W1/W2/W3 chưa trên `main`
- **Neo:** `git log --oneline -1` trên `main` phải chứa ba work item.
- **Cổng:** `git log --oneline main | head -50` và đọc tên commit.
- **Kiểm rồi:** ở HEAD `47720fd` (branch `milestone-1`) `dirs.ts:22` **vẫn là** `export const APP_NAME: string = "omp";` — tức W1 **chưa** đổi hằng số trung tâm. Bước 0 **chưa thỏa**.

### Bước 1 — Sinh lại danh sách từ cây hiện tại
- **Neo:** chạy từ repo root `/Users/tranquangdang21/Projects/ultraworkers`.
```bash
E='(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)'
git grep -lE "$E" -- '*.ts' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | sort > /tmp/w8b-files.txt
wc -l < /tmp/w8b-files.txt
git grep -oE "$E" -- '*.ts' | wc -l
```
- **Đã kiểm:** 607 file / 1867 lượt tại `47720fd`. Bảng 2.3 là con số đúng.
- **Bẫy đã tái lập:** `git grep` không có pathspec thì chỉ quét thư mục đang đứng; chạy từ `.lavish-wip/m5-specs/` trả 0. Cổng phải **từ chối chạy** khi cwd không phải gốc repo, thay vì im lặng trả 0.

### Bước 2 — Tạo khung bảng
- **Neo:** `fs.mkdir("scripts/rename", { recursive: true })` trong script, **không** spawn shell.
- Header đúng một dòng, tab phân cách, **không dòng comment** (parser phải bỏ qua comment là chỗ dễ sót lỗi; mọi giải thích nằm ở `README.md` và cột `reason`).

### Bước 3 — Điền bảng theo thứ tự rủi ro, không alphabet
- **Neo Nhóm A (5 file chứa giá trị wire)** — tất cả **đã mở và đối chiếu, 5/5 MATCH** với ERE đã ghin:

| path:line | nội dung thật | khớp ERE? | disposition |
| --- | --- | --- | --- |
| `packages/catalog/src/wire/codex.ts:52` | `	ORIGINATOR_CODEX: "omp",` | MATCH | `keep-wire`, `keep_refs=N3` |
| `packages/coding-agent/src/dap/session.ts:1465` | `			clientID: "omp",` | MATCH | `keep-wire`, `keep_refs=N4` |
| `packages/coding-agent/src/dap/session.ts:1466` | `			clientName: "omp",` | MATCH | (cùng hàng) |
| `packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236` | `				const body = multipartFile(request, "f", { k: apiKey, z: "omp" });` | MATCH | `keep-wire`, `keep_refs=N5` |
| `packages/coding-agent/src/modes/warp-events.ts:60` | `				agent: "omp",` | MATCH | `keep-wire`, `keep_refs=N6` |
| `packages/ai/src/providers/gitlab-duo-workflow.ts:2232` | `		serverName: "omp",` | MATCH | `keep-wire`, `keep_refs=N7` |

- **Neo Nhóm B:** 11 file chứa `__omp_worker_` → `keep-worker-selector`, `keep_refs=W9`. Đã kiểm danh sách đủ 11; trong đó `packages/coding-agent/src/cli.ts` có 8 selector, `packages/coding-agent/test/executable-fallback.test.ts` có 8.
- **Neo Nhóm C:** 27 file chứa cả `".omp"` → `keep-path`, `keep_refs=W4`. 6 file nguồn đã mở: `packages/coding-agent/src/cli/agents-cli.ts`, `packages/coding-agent/src/config.ts`, `packages/coding-agent/src/task/discovery.ts`, `packages/coding-agent/src/tools/browser/storage-state.ts`, `packages/utils/src/dirs.ts`, `scripts/session-stats/audit.ts`.
- **Neo Nhóm D:** 227 file test; 24 đã nằm trong B/C → **25** còn lại chưa gán (đặc tả ghi 202; xem `open_questions[1]` — va chạm sở hữu với W11, giờ là **25** file trùng chứ không phải 24).
- **Neo Nhóm E:** 380 file nguồn; 18 đã nằm trong A/B/C (5 + 7 + 6 — **đã đếm lại, đúng**) → **362** chưa gán.
- **Các nhóm KHÔNG cộng lại thành 607.** A ∪ B ∪ C đo được **43** file (đặc tả ghi 42 — lệch 1 vì Nhóm C có 27 file chứ không phải 26). 43 là lớp ghi đè; D/E là cách cắt test-vs-nguồn. 607 là kiểm tra bao phủ cuối cùng.

### Bước 4 — CHỐT hai file có `omp` mà KHÔNG khớp biểu thức đã ghim
> **⚠ PHẦN NÀY ĐÃ LỖI THỜI — đọc kỹ trước khi làm.**

Đặc tả nói hai file này là **no-match**:
- `packages/coding-agent/src/modes/acp/acp-agent.ts:656` — đặc tả ghi `name: "oh-my-pi"` (N5)
- `packages/coding-agent/src/telemetry-export-otlp.ts:51` — đặc tả ghi `SERVICE_NAME = "oh-my-pi"` (N7)

Đo lại hôm nay:

| path:line | nội dung thật | khớp ERE? | verdict |
| --- | --- | --- | --- |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:656` | `				name: "omp",` | **MATCH** | **ĐÃ ĐỔI** — xem dưới |
| `packages/coding-agent/src/telemetry-export-otlp.ts:51` | `const SERVICE_NAME = "oh-my-pi";` | no-match | đúng như đặc tả |

`acp-agent.ts:656` được đổi bởi commit `f804d66` («Sync from upstream omp 18.4.0»):
```diff
-				name: "oh-my-pi",
+				name: "omp",
```
→ Hàng này **không còn là no-match**; nó thuộc Nhóm A (`keep-wire`), và cột `hits` của nó đếm bằng ERE như các hàng `keep-wire` khác. Cả hai file vẫn còn trong tập 607 (đã kiểm bằng `grep -qxF`).

Cái đặc tả nói đúng và vẫn giữ nguyên giá trị: **bảo vệ theo TÊN FILE không bảo vệ đúng DÒNG** — cổng phải so từng hàng, không so từng file.

### Bước 5 — Chia `hits` cho TỪNG hàng
Bảng biểu thức ở mục 2.4. `keep-worker-selector` và `keep-path` **KHÔNG dùng ERE**. Số ở cột `hits` lấy từ `-oE`, không phải `-cE`.

### Bước 6 — Đổi tên đúng các lượt `disposition=rename`
Thứ tự an toàn: (a) hằng số trung tâm + 5 literal nhân bản, (b) 380 file nguồn, (c) 227 file test. Mỗi lần sửa là sửa **một quyết định đã ghi ở bảng**.

Ba literal `const APP_NAME = "omp"` / `CMUX_NOTIFICATION_TITLE = "omp"` thuộc W1 (hàng 17 §2.2) nhưng nằm trong tập 607. **Đã mở và xác nhận, cả ba đúng:**
- `packages/coding-agent/src/cli/commands/init-xdg.ts:5` → `const APP_NAME = "omp";`
- `packages/tui/src/desktop-notify.ts:29` → `const APP_NAME = "omp";`
- `packages/tui/src/terminal-capabilities.ts:45` → `const CMUX_NOTIFICATION_TITLE = "omp";`

Ghi `W1` vào cột `reason` của các hàng đó và nêu trong PR rằng ba dòng bị W1 và W8b cùng chạm.

### Bước 7 — Cổng nghiệm thu 1
`bun scripts/rename/check-disposition.ts --stage=pre` — xem mục 4.

### Bước 8 — Cổng nghiệm thu 2
`bun scripts/rename/check-disposition.ts --stage=post` — xem mục 4.

### Bước 9 — Typecheck
`bun run check:ts`. **Đã kiểm:** `package.json:90` → `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`. (Đặc tả ghi neo này cho `test:ts` ở dòng 90 — **sai**; `test:ts` nằm ở dòng **86**.)

### Bước 10 — Chứng minh cổng đỏ được
Ba phá hỏng có chủ đích, mỗi lần ghi exit code thật vào PR. Không làm thì `gate_can_fail = false`.

### Bước 11 — `bun run test:ts`
> **⚠ CỔNG NÀY ĐÃ ĐỔI TRẠNG THÁI. Xem mục 4.**

### Bước 12 — Rà lại bảng SAU khi W9 merge
Sau khi W9 đổi tên selector, chạy lại `--stage=post` và cập nhật cột `hits` của các hàng `keep-worker-selector`.

---

## 4. Cổng

### Cổng 0/1 — `check-disposition.ts` (mới tạo, **cổng chính**)

| | `--stage=pre` | `--stage=post` |
| --- | --- | --- |
| Lệnh | `bun scripts/rename/check-disposition.ts --stage=pre` | `bun scripts/rename/check-disposition.ts --stage=post` |
| ĐỎ khi | thiếu hàng cho file nào trong tập 607; hàng trỏ tới `path` không tồn tại; `reason` trống; `disposition` ngoài từ vựng; `hits` lệch với đo bằng biểu thức ứng với `disposition` của chính hàng đó; `keep_refs` rỗng khi `disposition` bắt đầu bằng `keep-`; `keep_refs` khác rỗng khi `disposition=rename`; tổng `hits` theo `path` lệch tổng lượt thật; số file trong bảng ≠ số file `git grep` trả về | mỗi hàng `rename` còn ≠ 0 lượt; mỗi hàng `keep-*` còn ≠ đúng `hits` |
| Cơ chế đỏ | in từng vi phạm ra stdout rồi `process.exit(1)` | như cột trái |

**Cổng này CÓ ĐỎ ĐƯỢC KHÔNG — câu trả lời cụ thể:** **Có, về mặt cấu trúc, NHƯNG CHƯA CÓ BẰNG CHỨNG THỰC NGHIỆM.** Cả hai chế độ đều có đường thoát `process.exit(1)` và in vi phạm ra stdout — nhưng **cả ba file `scripts/rename/` đều chưa tồn tại**, nên cổng **chưa từng chạy lần nào**, đừng nói là từng đỏ. `check-disposition.ts` chưa được viết, chưa được thử, chưa biết nó có parse đúng hay không.

**Bằng chứng duy nhất được chấp nhận:** ba exit code thật ở bước 10. Không có chúng thì `gate_can_fail = false` và mục này **không được coi là đã nghiệm thu**.

**Điều kiện duyệt KHÔNG làm đỏ — và đây là điểm phải nói thẳng:** nếu `git log --format='%ae' -- scripts/rename/disposition.tsv` chỉ trả về MỘT địa chỉ, cổng vẫn XANH và chỉ in `WARN: bảng tự duyệt — chưa có người duyệt thứ hai`. Lý do không chặn: lịch sử git hôm nay là **30 `e2e@example.com` + 8 `tranquangdang21@gmail.com`** (đặc tả ghi 7 + 1 — đã cũ), identity đang cấu hình là `E2E`, nên điều kiện ≥2 địa chỉ sẽ đỏ **vĩnh viễn** trên máy này và W8b sẽ không bao giờ ship được phần hiển thị.

→ **Hệ quả phải nói ra:** với 607 quyết định, bảng này **dễ trở thành một danh sách tự khai**. Đó không phải rủi ro giả định — nó là kết quả tất yếu khi không có người duyệt thứ hai. Xem `open_questions[0]`.

### Cổng 2 — `bun run check:ts` (exit 0)

**Có ĐỎ ĐƯỢC KHÔNG:** **Có, nhưng thấp.** Nó đỏ khi có lỗi kiểu. Nó **KHÔNG** thấy một literal sai — một hàng `rename` bị bỏ sót vẫn typecheck xanh. Vì vậy nó là cổng thứ hai, **không phải cổng chính**. Đây là lý do đặc tả cấm dùng nó thay cho bảng quyết định.

### Cổng 3 — `bun run test:ts` — **⚠ ĐẶC TẢ ĐÃ LỖI THỜI**

Đặc tả nói: «Trên máy **chưa build** addon thì lệnh đó ĐỎ: `3 chunks passed / 185 failed`, `Error: Failed to load pi_natives native addon`», và `command -v ninja` → rỗng.

**Đo lại hôm nay:**
- `command -v ninja` → `/opt/homebrew/bin/ninja` (**đã cài**)
- `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại, 185 MB, mtime 2026-09-29 07:32
- `bun -e 'await import("@oh-my-pi/pi-natives")'` → `addon OK, exports: 128` — **addon nạp được**
- Commit `47720fd`: «docs(plans): the native addon is built, so "bun test is blocked" is false»

→ **Addon ĐÃ build. Tiền đề đã được gỡ.** Cổng 3 **không còn đỏ sẵn vì hạ tầng**. Đặc tả nói nó «đỏ TRƯỚC và SAU giống nhau nên không phân biệt được» — lập luận đó **mất hiệu lực**. Cổng 3 giờ là cổng thật, phải chạy và báo cáo kết quả; nếu nó đỏ thì đỏ vì việc đổi tên, không phải vì hạ tầng. **Phải chạy lại và cập nhật kết luận này trước khi báo xong.**

### Cổng không được chạy sai
```bash
# SAI — luôn xanh vì git grep -E không hiểu \b
git grep -cE '\bomp\b' -- packages/utils/src/dirs.ts   # → không in dòng nào, exit 1

# ĐÚNG
git grep -cE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- packages/utils/src/dirs.ts   # → 19 dòng
```
Ngoài ra: **đừng chạy `git grep` không có pathspec từ thư mục con** — trả 0 và trông y hệt cây đã sạch.

---

## 5. Hợp đồng test

Tên file: `scripts/rename/check-disposition.ts` (cổng), tùy chọn `scripts/rename/check-disposition.test.ts`.

Nếu viết test: nó **phải gọi hàm export của checker**, không tự dựng lại logic — hai bản sao của cùng một bộ kiểm là hai bộ kiểm, một bản sẽ trôi. Cấm `mock.module()`.

Bốn hợp đồng, mỗi cái gọn tên lỗi cụ thể:

| # | Hợp đồng | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| 1 | Không file nào trong tập 607 bị bỏ sót khỏi bảng | tên hiển thị còn sót tên cũ ở một góc UI; người dùng thấy `omp` thay vì tên mới |
| 2 | Không hàng nào giữ mà không có lý do và căn cứ | một giá trị **wire** bị đổi nhầm → cài đặt / extension / dashboard chi phí đang chạy hỏng **mà không có lỗi nào được ném ra** |
| 3 | Số `hits` là số thật (tổng theo `path` = tổng lượt thật) | một lượt không được tính vào hàng nào → quyết định "giữ" biến thành "không ai để ý" |
| 4 | Sau khi đổi, hệ quả đúng như bảng nói | đổi quá tay vào giá trị wire, **hoặc** bỏ sót một lượt trong file hỗn hợp — trường hợp mà nếu `hits` chỉ đếm theo file thì lượt bỏ sót bị che bởi lượt giữ hợp lệ |

Ranh giới phải giữ được: **xoá bảng → script ĐỎ; bảng đầy đủ và khớp → script XANH.** Đó là một mệnh đề đúng–sai, không phải một sự kiện. Script đọc một **bảng dữ liệu đã duyệt**, không phải mã nguồn, và khẳng định quan hệ toàn vẹn giữa bảng đó và cây — cùng hình thức với `scripts/fix-changelogs.ts` sẵn có (**đã kiểm: file tồn tại**, 37 KB).

---

## 6. Cạm bẫy riêng của W8b

1. **`sed` đại trà trên 607 file.** Một lệnh sed token sẽ đổi cả tên hiển thị lẫn giá trị wire lẫn selector worker trong một lần, và **không ai kiểm tra được** — vì trước khi bảng quyết định tồn tại, không có danh sách nào trong repo nói cái gì được phép đổi.
2. **File hỗn hợp che lỗi.** 27 file có cả lượt đổi lẫn lượt giữ, 11 file có cả token lẫn selector. Nếu `hits` chỉ đếm theo **file**, một lượt đổi bị bỏ sót bị lượt giữ hợp lệ che đi và cổng **vẫn xanh**. Vì vậy `hits` bắt buộc tách theo lớp `disposition`, và cổng phải so **từng hàng**, không so từng file.
3. **`-cE` đếm DÒNG, `-oE` đếm LƯỢT.** 321 vs 312 ở tập 607; `update-cli.test.ts` 59 lượt trên 58 dòng. Cột `hits` lấy từ `-oE`.
4. **Bẫy regex của máy này.** `git grep -E` **không** hiểu `\b` là ranh giới từ; `grep -E` thì có. Cổng viết bằng `\b` **luôn xanh**. Đo lại: `git grep -cE '\bomp\b'` → exit 1, không in gì; `command grep -cE '\bomp\b'` → 105. Dùng đúng biểu thức đã ghim.
5. **`git grep` không có pathspec thì chỉ quét thư mục đang đứng.** Chạy từ `.lavish-wip/m5-specs/` trả **0 file, 0 lượt** — trông y hệt cây đã sạch. Cổng phải **từ chối chạy** khi cwd không phải gốc repo.
6. **Tài liệu kế hoạch tự nhiễm vào mọi lệnh đếm.** `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` tự chứa 81 lượt `".omp"` và 20 lượt `"oh-my-pi"`. Mọi lệnh `git grep ... -- .` phải có `:!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`. Đây là lý do 401 ≠ 280.
7. **`hits = 1` là khả năng lớn, KHÔNG phải luôn luôn.** Trong `update-cli.test.ts`, các lượt `omp/18.0.6-canary.1` (User-Agent) và `".local/bin/omp"` **không** khớp ERE — vì `/` và `.` nằm trong lớp loại `[^a-zA-Z0-9_./-]` trước `omp`. Phải bảo vệ bằng hàng riêng (`scope=dot-omp-literal` / `keep-path`), **không** bằng `hits` của `scope=display-token`. Người viết bảng phải mở từng file và tách, **không** suy ra `hits` từ `grep -c`.
8. **Va chạm sở hữu với W11.** 227/607 là file test; **25** file trong đó trùng tập 69 file của W11. Nếu W8b đổi literal trước, W11 làm lại; tệ hơn, nếu W8b đổi một khẳng định literal thành giá trị **sai**, W11 kế thừa cái sai đó và test **vẫn xanh**.
9. **Thứ tự với W9.** W8b (wave 3) gán selector là `keep-worker-selector`/`keep_refs=W9`, nhưng W9 ở **wave 4, tế hơn**. 11 file chứa cả hai. Phải rà lại bảng sau khi W9 merge (bước 12), nếu không cổng wave 4 sẽ đỏ vì lý do không ai hiểu.
10. **Bảng tự duyệt.** 607 quyết định do một người tự duyệt = bảng quyết định trở thành danh sách tự khai. Cổng cố tình **không** đỏ vì thiếu người duyệt thứ hai (xem mục 4) — nghĩa là cơ chế an toàn ở đây **chỉ là quy ước**, không phải cổng. PR phải ghi rõ tên người đã đọc.
11. **`allow-edits` của người ghi bảng.** Bước 5 là bước dễ làm sai nhất và **không thể đoán bằng grep**: đó là bước duy nhất buộc phải mở từng file và **tách tay**. Đây là lý do effort là L chứ không phải M.

---

## 7. DANH SÁCH NEO HỎNG — đọc trước khi gõ

Đã mở từng dòng, đã đối chiếu. `đúng` = dòng nói đúng thứ tài liệu nói.

| neo trong đặc tả | trạng thái | vị trí đúng / nội dung thật |
| --- | --- | --- |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:656` | **HỎNG** | Vẫn ở dòng 656 nhưng nội dung **đã đổi**: nay là `				name: "omp",` (MATCH ERE), không phải `name: "oh-my-pi"`. Đổi bởi `f804d66`. Bước 4 viết sai. |
| `packages/coding-agent/src/telemetry-export-otlp.ts:51` | đúng | `const SERVICE_NAME = "oh-my-pi";` — vẫn no-match. |
| `packages/utils/src/dirs.ts:21` | **HỎNG (lệch 1)** | `21` nay là docblock `/** App name (e.g. "omp") */`. Khai báo ở **`22`**: `export const APP_NAME: string = "omp";` |
| `packages/utils/src/dirs.ts:24` | **HỎNG (lệch 1)** | `24` là docblock `/** Public homepage ... */`. Khai báo ở **`25`**: `export const APP_URL: string = "https://omp.sh/";` |
| `packages/utils/src/dirs.ts:27` | **HỎNG (lệch 1)** | `27` là docblock `/** Config directory name (e.g. ".omp") */`. Khai báo ở **`28`**: `export const CONFIG_DIR_NAME: string = ".omp";` (giá trị **vẫn** `.omp`) |
| `packages/utils/src/dirs.ts:30` | **HỎNG (lệch 4)** | Khai báo ở **`34`**: `export const MAIN_CONFIG_FILENAMES = ["config.yml", "config.yaml"] as const;` |
| `packages/utils/src/dirs.ts:36` | **HỎNG (lệch 4)** | `36` là docblock `/** Default User-Agent header string (e.g. "omp/17.2.12") */`. Khai báo ở **`40`**: `export const USER_AGENT = \`omp/${VERSION}\`;` |
| `packages/utils/src/dirs.ts:298` | **HỎNG (lệch 12)** | `298` nay là `export function getSafeProjectCwd(): string {`. `getConfigDirName()` ở **`310`**, `return process.env.PI_CONFIG_DIR \|\| CONFIG_DIR_NAME;` ở **`311`**. |
| `packages/utils/src/dirs.ts:1084` | **HỎNG (lệch 23)** | `1084` nay là `	if (scope === "user") {`. `const value = process.env.OMP_APP_NAME?.trim();` ở **`1107`**. |
| `package.json:90` | **HỎNG (gán nhầm)** | Đặc tả ghi neo này cho `"test:ts"`. Dòng 90 thật là `"check:ts"`. `"test:ts"` ở dòng **`86`**: `"test:ts": "bun scripts/ci-test-ts.ts local-ts",` |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13361` (`grep -n '^| N1 |'`) | **HỎNG (không còn tồn tại)** | `grep -n '^| N1 |'` trả **rỗng** — không có hàng nào bắt đầu bằng `\| N1 \|` trong file. Bảng N1–N17 **không ở dạng bảng markdown** ở HEAD này; mục `do_not_rename` ở dòng **16895** mô tả nó bằng văn xuôi và trỏ tới bảng `keep-list.txt` / `do_not_rename.tsv` (cả hai đều chưa tồn tại). **Đây là neo chết** — dùng `sed -n '16895,16910p'` thay. |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:14183` | **HỎNG (trôi)** | `grep -n 'W8b không quy ra ngày được'` → **`19392`** và **`21690`**. (Đặc tả đã tự cảnh báo "đừng ghim số".) |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13968` | **HỎNG (trôi)** | `grep -n 'W1, W2, W3 (hằng số đã ổn định)'` → **`19409`** và **`19444`**. |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:14107` | **HỎNG (trôi)** | `grep -n 'Tách thành hai pass với exclusion list'` → **`19430`** và **`21614`**. |
| `packages/catalog/src/wire/codex.ts:52` | đúng | `	ORIGINATOR_CODEX: "omp",` |
| `packages/coding-agent/src/dap/session.ts:1465-1466` | đúng | `clientID: "omp",` / `clientName: "omp",` |
| `packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236` | đúng | `const body = multipartFile(request, "f", { k: apiKey, z: "omp" });` |
| `packages/coding-agent/src/modes/warp-events.ts:60` | đúng | `				agent: "omp",` |
| `packages/ai/src/providers/gitlab-duo-workflow.ts:2232` | đúng | `		serverName: "omp",` |
| `packages/coding-agent/src/cli/commands/init-xdg.ts:5` | đúng | `const APP_NAME = "omp";` |
| `packages/tui/src/desktop-notify.ts:29` | đúng | `const APP_NAME = "omp";` |
| `packages/tui/src/terminal-capabilities.ts:45` | đúng | `const CMUX_NOTIFICATION_TITLE = "omp";` |
| `packages/coding-agent/src/cli/update-cli.ts:166,190` | đúng | `if (!isRecord(manifest) \|\| !isRecord(manifest.omp)) return undefined;` (ở cả hai) |
| `packages/coding-agent/src/cli/worker-selectors.ts:9-21` | đúng | 8 hằng số selector từ `BLOB_BROKER_WORKER_ARG` đến `TEXT_PREDICT_WORKER_ARG` |
| `packages/coding-agent/src/cli.ts:182-189` | đúng | 8 hằng số selector từ `TINY_WORKER_ARG` đến `MNEMOPI_EMBED_WORKER_ARG` |
| `scripts/rename/` (3 file) | đúng | không tồn tại |
| `scripts/fix-changelogs.ts` | đúng | tồn tại, 37 KB |

**Tổng: 27 neo đã kiểm — 18 đúng, 9 hỏng.** Không có neo nào chỉ sai số dòng mà vẫn nói đúng nội dung: 9 cái hỏng hoặc trôi hẳn, hoặc chết.

---

## 8. Sai lệch số liệu so với đặc tả (đo lại ở HEAD `47720fd`)

| claim trong đặc tả | verdict | số thật |
| --- | --- | --- |
| 599 file / 1853 lượt | SAI | **607 / 1867** |
| 226 file test + 373 file nguồn | SAI | **227 + 380** |
| A ∪ B ∪ C = 42 file | SAI | **43** |
| 26 file có cả token lẫn `".omp"` | SAI | **27** |
| 562 file thuần hiển thị | SAI | **564** |
| literal `".omp"` = 280 lượt / 94 file | SAI Ở LƯỢT | **401 / 94** (vì 158 lượt nằm trong chính file kế hoạch) |
| 61 file test có `".omp"` | SAI | **60** |
| tập W11 = 70 file | SAI | **69** |
| W11 ∩ test của W8b = 24 | SAI | **25** |
| 14 file `.ts` chứa `"oh-my-pi"` | SAI | **11** |
| 318 file có ≥2 lượt (`-oE`) | SAI | **321** |
| 310 file có ≥2 dòng (`-cE`) | SAI | **312** |
| 202 file test chưa gán | SAI | **207** (227 − 4 B − 21 C + 6 chồng) |
| `git log --format='%ae' | sort | uniq -c` → 7 + 1 | SAI | **30 + 8** |
| `command -v ninja` → rỗng | **SAI — đã cài** | `/opt/homebrew/bin/ninja`; addon 185 MB đã build, nạp được (128 export) |
| `acp-agent.ts:656` là `name: "oh-my-pi"` (no-match) | **SAI** | `name: "omp"` — **MATCH** ERE |
| `package.json:90` là `test:ts` | SAI | 90 là `check:ts`; `test:ts` ở 86 |
| `grep --version` → `grep (BSD grep, GNU compatible) 2.6.0-FreeBSD` | đúng **cho `command grep`/`/usr/bin/grep`** | nhưng `grep` trong shell zsh của phiên này là **shell function → ugrep 7.8.4**. Dùng `command grep` khi cần BSD grep. |
| 30 dòng / 14 file selector non-test; 21 chuỗi phân biệt | ĐÚNG | — |
| `update-cli.test.ts` 59 lượt / 58 dòng | ĐÚNG | — |
| 98 file trong 607 chứa literal `"omp"` | ĐÚNG | — |
| Biểu thức đã ghim cho 19 dòng trên `dirs.ts` | ĐÚNG | 19 dòng, **21 lượt** |
| `git grep -E '\bomp\b'` exit 1 vs `grep -E` 104 | đúng về hình dạng | **105** (đã tăng 1) |
| Nhóm B: 11 file, 26 selector, 31 lượt ERE | ĐÚNG | — |
| Nhóm D: 24 file test chồng; 4 của B, 20 của C | gần đúng | 4 của B ✓, **21** của C |
