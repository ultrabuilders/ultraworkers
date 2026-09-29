## W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)

**Sóng:** Wave 3.

**Effort:** L — lớn nhất milestone sau việc phát hành. Plan tự ghi là "chưa định lượng" và nói thẳng ở mục «W8b không quy ra ngày được» (tra bằng `grep -n 'W8b không quy ra ngày được' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`; ra `14183` tại HEAD `1454dc0`) rằng mục này không suy ra được ngày từ phép nhân với W8a: W8a là 15 quyết định, W8b là hàng trăm hàng bảng quyết định, và phân bố giữa hai bên lệch nhau. Con số thực tế cao hơn plan ở ba chỗ nên effort cao hơn ước tính cũ: 599 file thay vì 585, 226 file thay vì 0 là file test mà plan không tách ra, và 11 file chồng với W9 phải rà lại hai lần. Cách chuẩn hoá mà plan đề xuất vẫn đúng và nên làm ngay khi bắt đầu: làm 50 hàng đầu của `disposition.tsv`, đo thời gian thật, rồi nhân để ước lượng phần còn lại — đừng chuẩn hoá bằng cách nhân con số file với một thời gian giả định.

**Rủi ro chính:** `sed` đại trà trên 599 file. Một lệnh sed token sẽ đổi cả tên hiển thị lẫn giá trị wire lẫn selector worker trong một lần, và sẽ không ai kiểm tra được — vì trước khi bảng quyết định tồn tại, không có danh sách nào trong repo nói cái gì được phép đổi. Đây không phải rủi ro giả định: đó chính là lý do mục này tồn tại thay vì một dòng trong W8.

### File cần chạm tới

| path | hành động | thay đổi | đã mở kiểm chứng? |
| --- | --- | --- | --- |
| `scripts/rename/disposition.tsv` | tạo | Bảng quyết định 6 cột, một hàng cho mỗi (path, disposition). 599 file nguồn + 26 file chồng scope `dot-omp-literal` + file chồng `bare-oh-my-pi`; tổng số hàng lớn hơn 599 vì một file vừa có lượt đổi vừa có lượt giữ thì tách thành hai hàng cùng `path`. **CHƯA TỒN TẠI** — `ls scripts/rename/` → `No such file or directory`; `git grep -ln disposition` chỉ trả về chính file plan. Đây là khoảng trống thật, không phải thứ cần sửa trong plan. Xem `open_questions[0]` về việc ai là người duyệt. | không (chưa tồn tại — thiết kế dưới đây là đề xuất, chưa được thử) |
| `scripts/rename/check-disposition.ts` | tạo | Bộ kiểm bảng quyết định: parse TSV, tính lại tập hit bằng biểu thức đã ghim, đối chiếu hai chiều (thiếu hàng / thừa hàng), kiểm `reason` không trống, `keep_refs` bắt buộc khi `disposition` bắt đầu bằng `keep-`, đóng từ vựng `disposition`, và kiểm duyệt bằng `git log`. In từng vi phạm ra stdout và `process.exit(1)`. Không tồn tại. Cần thiết vì cổng nghiệm thu 1 của plan chỉ viết bằng văn xuôi — không có lệnh nào chạy được, nên cổng đó không bao giờ đỏ được. | không (chưa tồn tại — thiết kế dưới đây là đề xuất, chưa được thử) |
| `scripts/rename/README.md` | tạo | Ghi schema 6 cột, từ vựng `disposition`, quy tắc `hits` (xem mục Hình dạng code), và quy trình duyệt: ai viết, ai duyệt, duyệt ở bước nào, và điều gì bị chặn nếu chưa duyệt. Không tồn tại. Cần vì quy tắc duyệt của plan chỉ tồn tại dưới dạng một câu tiếng Việt trong plan; kỹ sư triển khai từ đặc tả này sẽ không thấy plan. | không (chưa tồn tại — thiết kế dưới đây là đề xuất, chưa được thử) |
| 599 file `.ts` (tập sinh bằng lệnh, KHÔNG liệt kê tay) | sửa | Sửa đúng các lượt mang `disposition=rename`. 373 file nguồn + 226 file test. Đây là sản phẩm của bảng quyết định, không phải một danh sách viết tay. Đếm tại HEAD 1454dc0 cho **599**, KHÔNG phải 585 như plan ghi. Tự sinh lại danh sách bằng lệnh ở bước 1; đừng tin một danh sách dán trong tài liệu. | có (`verified: true`) |
| `packages/*/CHANGELOG.md` | sửa (không thêm gì) | **KHÔNG thêm mục changelog.** Work item này không yêu cầu mục changelog, và AGENTS.md cấm sửa khối đã phát hành. Ngoài ra N11 của §2.3 giữ nguyên mọi mục dưới khối `## [Unreleased]`. | có (`verified: true`) |

### Các bước

0. **DỪNG nếu chưa có W1, W2, W3 trên `main`.** Cả ba là điều kiện tiên quyết vì W1 biến 5 giá trị wire thành hằng số, và W2/W3 ổn định tên hiển thị — sau đó `grep '"omp"'` ở vị trí wire mới có nghĩa là "ai đó bỏ sót hằng số". Chạy `git log --oneline -1` và xác nhận ba work item đã merge.
   Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, mục «Phụ thuộc» của W8b — tra bằng `grep -n 'W1, W2, W3 (hằng số đã ổn định)' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (ra `13968` tại HEAD `1454dc0`; số dòng trôi theo từng commit nên đừng ghim số).

1. **Sinh lại danh sách 599 file từ cây hiện tại** — KHÔNG dùng con số 585 của plan và KHÔNG chạy `git grep` từ thư mục con. `git grep` không có pathspec thì chỉ quét thư mục đang đứng; chạy từ `.lavish-wip/m5-specs/` sẽ trả về 0 file và người làm sẽ tưởng cây đã sạch. Lệnh: `git grep -lE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | sort > /tmp/w8b-files.txt` rồi `wc -l < /tmp/w8b-files.txt` (kỳ vọng 599 tại HEAD 1454dc0; nếu khác thì cây đã trôi, ghi lại con số mới vào bảng, đừng ép về 585). Cùng lúc ghi lại số lượt: `git grep -oE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | wc -l` (kỳ vọng 1853).

2. **Tạo khung bảng:** `mkdir -p scripts/rename` (dùng `fs.mkdir` trong script, không spawn shell), rồi viết header đúng một dòng, tab phân cách, không quote: `scope\tpath\thits\tdisposition\treason\tkeep_refs`. KHÔNG thêm dòng comment vào file TSV — parser sẽ phải bỏ qua nó và đó là chỗ dễ sót lỗi; mọi giải thích nằm ở `scripts/rename/README.md` và ở cột `reason`.

3. **Điền bảng theo thứ tự ưu tiên rủi ro, không theo thứ tự alphabet.**
   - Nhóm A trước: 5 file chứa giá trị wire của N3–N6 — `packages/catalog/src/wire/codex.ts:52`, `packages/coding-agent/src/dap/session.ts:1465-1466`, `packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236`, `packages/coding-agent/src/modes/warp-events.ts:60`, `packages/ai/src/providers/gitlab-duo-workflow.ts:2232` — đánh `keep-wire`, `keep_refs=N3`…`N6`.
   - Nhóm B: 11 file chứa `__omp_worker_` — đánh `keep-worker-selector`, `keep_refs=W9`.
   - Nhóm C: 26 file chứa cả `".omp"` — đánh `keep-path`, `keep_refs=W4`.
   - Nhóm D: 226 file test, trong đó **24 đã nằm trong A/B/C** (4 của B, 20 của C) → còn **202** file test chưa gán — xem `open_questions[1]`, đây là va chạm sở hữu với W11.
   - Nhóm E: 373 file nguồn, trong đó **18 đã nằm trong A/B/C** (5 của A, 7 của B, 6 của C) → còn **355** file nguồn chưa gán, phần lớn `rename`.
   - **Các nhóm KHÔNG cộng lại thành 599.** A, B, C là lớp ghi đè trên cùng tập 599 (A ∪ B ∪ C = 42 file, đã đo), còn D/E là cách cắt theo test-vs-nguồn. 599 là kiểm tra bao phủ cuối cùng, không phải tổng các nhóm — và `disposition` phải cho phép một file có nhiều hàng (xem mục `hits`).
   Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, bảng N1–N17 của §2.3 — tra bằng `grep -n '^| N1 |' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (ra `13361` tại HEAD `1454dc0`; số dòng trôi theo từng commit nên đừng ghim số). Cả 5 neo dòng ở Nhóm A đã được mở và đối chiếu: 5/5 khớp biểu thức đã ghim.

4. **CHỐT hai file chứa `omp` mà KHÔNG khớp biểu thức đã ghim, trước khi điền tiếp.** `packages/coding-agent/src/modes/acp/acp-agent.ts:656` (`name: "oh-my-pi"`, N5) và `packages/coding-agent/src/telemetry-export-otlp.ts:51` (`SERVICE_NAME = "oh-my-pi"`, N7) đều là dạng trần nên token `omp` không xuất hiện trên dòng đó. Cả hai file CÓ nằm trong tập 599 (vì có hit khác), nên một quy tắc loại trừ theo TÊN FILE sẽ giữ đúng file nhưng không bảo vệ đúng DÒNG. Ghi chúng là hàng `keep-wire` với `keep_refs=N5` / `N7`. Cả hai neo đã mở và xác nhận là **no-match** với biểu thức đã ghim, đồng thời tra bằng `grep -qxF` vẫn có mặt trong tập 599.

5. **Chia `hits` cho TỪNG hàng, không chỉ cho từng file.** Đây là quyết định thiết kế quan trọng nhất của mục: nó biến bảng từ một danh sách ý kiến thành một bảng cân đối có thể bị phủ định. Với mỗi hàng, `hits` = số lượt của biểu thức đã ghim thuộc đúng lớp disposition đó. Bất biến bắt buộc: tổng `hits` của mọi hàng cùng một `path` phải bằng tổng lượt của file đó. Kiểm bằng biểu thức ứng với `disposition` của hàng đó — bảng đầy đủ nằm ở mục `hits` trong §Hình dạng code, và lưu ý `keep-worker-selector` / `keep-path` KHÔNG dùng ERE.

6. **Đổi tên ĐÚNG CÁC LƯỢT `disposition=rename`, từng file một.** KHÔNG chạy `sed` trên cả 599 file — đó chính là kịch bản mà mục này sinh ra để chặn. Thứ tự an toàn: (a) chỉnh hằng số trung tâm và 5 literal nhân bản (xem `open_questions[2]`), (b) 373 file nguồn, (c) 226 file test. Mỗi lần sửa phải là sửa một quyết định đã ghi ở bảng, không phải một lần quét lại file.
   Vì ba literal này thuộc W1 (hàng 17 của §2.2), ghi rõ `W1` vào cột `reason` của hàng tương ứng trong bảng quyết định — cột `reason` là tự do, nên dùng nó làm chỗ ghi sở hữu khi không muốn thêm cột — và nêu trong PR rằng ba dòng này bị W1 và W8b cùng chạm.
   Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, hàng cảnh báo «Tách thành hai pass với exclusion list» trong mục Rủi ro của W8b — tra bằng `grep -n 'Tách thành hai pass với exclusion list' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (ra `14107` tại HEAD `1454dc0`; số dòng trôi theo từng commit nên đừng ghim số).

7. **Chạy cổng nghiệm thu 1 — BẢNG ĐÃ ĐỦ VÀ ĐÃ ĐƯỢT DUYỆT.** `bun scripts/rename/check-disposition.ts --stage=pre`. Lệnh này phải ĐỎ nếu: thiếu hàng cho bất kỳ file nào trong tập 599, có hàng `reason` rỗng, có hàng `keep-*` mà `keep_refs` trống, `disposition` nằm ngoài từ vựng đóng, tổng `hits` lệch với số lượt thật. Thiếu người duyệt thứ hai thì KHÔNG đỏ — cổng chỉ in cảnh báo, lý do ở Cổng 0. Chỉ khi nó xanh mới được sang bước 8.

8. **Chạy cổng nghiệm thu 2 — SAU KHI ĐỔI TÊN.** `bun scripts/rename/check-disposition.ts --stage=post`. Cổng này dựa vào BẢNG, không dựa vào một danh sách viết tay thứ hai: mỗi hàng `rename` phải còn 0 lượt; mỗi hàng `keep-*` phải còn đúng số lượt ghi ở cột `hits`. Với file hỗn hợp (vừa có lượt đổi vừa có lượt giữ) đây là lý do cột `hits` phải tách theo lớp — nếu để chung, một lượt đổi bị bỏ sót sẽ bị che bởi lượt giữ hợp lệ và cổng vẫn xanh.

9. **Chạy typecheck:** `bun run check:ts`. Đây là tín hiệu chính và nó XANH trên máy này (exit 0, đã chạy thật 2026-09-28). Nhưng nó KHÔNG thấy một literal sai — một hàng `rename` bị bỏ sót vẫn typecheck xanh. Vì vậy nó là cổng thứ hai, không phải cổng chính.

10. **Chứng minh cổng thật sự đỏ được TRƯỚC khi báo xong.** Làm ba thao tác phá hỏng có chủ đích trên một bản sao, mỗi lần chạy lại cổng và ghi lại exit code: (1) xoá một hàng `rename` → `--stage=pre` phải đỏ; (2) để trống một cột `reason` → `--stage=pre` phải đỏ; (3) đổi tên token trong một file có hàng `keep-wire` → `--stage=post` phải đỏ. Không có bước này thì "cổng xanh" chỉ chứng minh cổng không nổ, chứ không chứng minh cổng canh.

11. **CHỈ chạy `bun run test:ts` nếu đã gỡ chặn native addon.** Trên máy này lệnh đó hiện ĐỎ vì lý do không liên quan gì đến việc đổi tên: `3 chunks passed / 185 failed`, `Error: Failed to load pi_natives native addon for darwin-arm64`. Nó đỏ TRƯỚC và SAU khi đổi tên giống nhau, nên không phân biệt được "tôi làm hỏng" với "addon chưa build". Gỡ chặn: `brew install ninja` TRƯỚC, rồi `bun --cwd=packages/natives run build` (thiếu `ninja` thì build chết với `CMake Error: CMake was unable to find a build program corresponding to "Ninja"`). Ghi kết quả `test:ts` vào PR dưới dạng thông tin, không dùng nó làm cổng chặn merge.
    Neo: `package.json:90` (`"test:ts": "bun scripts/ci-test-ts.ts local-ts"`) — số dòng do đặc tả nêu, chưa mở kiểm lại.

12. **Rà lại bảng SAU khi W9 merge.** W8b gán các hàng selector là `keep-worker-selector` với `keep_refs=W9`, nhưng W9 nằm ở wave 4, TẾT hơn W8b. Nghĩa là khi W8b chạy, các selector vẫn còn tên cũ và bảng ghi "giữ". Sau khi W9 đổi tên chúng, phải chạy lại `bun scripts/rename/check-disposition.ts --stage=post` và cập nhật cột `hits` của các hàng selector (số lượt giữ sẽ không còn là số cũ). Không làm bước này thì cổng wave 4 sẽ đỏ vì lý do không ai hiểu.
    Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, mục «Phụ thuộc» của W8b — tra bằng `grep -n 'W1, W2, W3 (hằng số đã ổn định)' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (ra `13968` tại HEAD `1454dc0`; số dòng trôi theo từng commit nên đừng ghim số).

### Hình dạng code

Hai sản phẩm, một sản phẩm dữ liệu và một sản phẩm kiểm.

**1. `scripts/rename/disposition.tsv`** — TSV thuần, đúng một dòng header, 5 tab mỗi hàng, không quote, không dòng comment. Sáu cột theo thứ tự cố định:

- `scope` — từ vựng đóng: `display-token` (tập 599 file `.ts`, mục này) | `dot-omp-literal` (94 file, W4) | `bare-oh-my-pi` (16 file, W8a) | `app-name-literal` (4 file, W1). Bốn tập chồng nhau — 26 file có cả `omp` token lẫn `".omp"`, 11 file có cả token lẫn selector — nên `scope` mới là thứ tách chúng trong cùng một tệp.
- `path` — đúng chuỗi `git grep -l` phát ra: không rút gọn, không tiền tố `./`, dùng `/` làm dấu phân cách.
- `hits` — số lượt THUỘC LỚP CỦA HÀNG NÀY, và **KHÔNG đếm được bằng một biểu thức duy nhất cho mọi lớp**. Biểu thức ứng với từng `disposition`: `rename` và `keep-wire` → `git grep -oE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- <path> | wc -l`; `keep-worker-selector` → `git grep -o '__omp_worker_' -- <path> | wc -l`; `keep-path` → `git grep -oE '"\.omp"' -- <path> | wc -l`. Lý do phải tách: ERE đã ghin cố tình loại `_` và `.` ở ranh giới trước `omp`, nên nó KHÔNG thấy selector lẫn literal `.omp` — đo cả ba lớp bằng ERE sẽ khiến 37 hàng `keep-*` ghi nhầm số của lớp khác. Bằng chứng đo lại: 11 file Nhóm B có 26 selector nhưng 31 lượt ERE; 26 file Nhóm C có 72 literal `".omp"` nhưng 83 lượt ERE; `packages/utils/src/dirs.ts` có 4 literal `".omp"` mà ERE không tính lượt nào. Ngữ nghĩa phụ thuộc `disposition`: với `rename` đây là số phải về 0; với `keep-*` đây là số phải CÒN LẠI nguyên vẹn. Bất biến kiểm tra: tổng `hits` của mọi hàng cùng `path` bằng tổng lượt thật của file đó. Đây là điểm khác biệt giữa một bảng quyết định và một bảng ý kiến — một lượt bị quên đếm sẽ làm lệch số và cổng sẽ đỏ.
- `disposition` — từ vựng đóng, không thêm mục mới: `rename` | `keep-wire` | `keep-path` | `keep-worker-selector` | `keep-doc-name`. Trong phạm vi `scope=display-token`, `keep-doc-name` hầu như không dùng (tài liệu là `.md`, thuộc W13) nhưng vẫn phải nằm trong từ vựng để checker không phải đoán.
- `reason` — bắt buộc, không trống ở bất kỳ hàng nào. Hàng không có lý do thì không được duyệt, cùng tiêu chuẩn với keep-list của §2.3.
- `keep_refs` — mục §2.3 (`N1`…`N17`) hoặc work item (`W4`, `W6`, `W9`, `W11`). Bắt buộc có khi `disposition` bắt đầu bằng `keep-`; bắt buộc rỗng khi `disposition` là `rename`.

Đơn vị của bảng là FILE, không phải lượt — 599 hàng là thứ người ta đọc nổi, 1853 hàng thì không. Một file vừa có lượt đổi vừa có lượt giữ thì tách thành HAI hàng cùng `path`, phân biệt bằng `disposition` và `hits`. Vì vậy kiểm tra đầy đủ là "có ÍT NHẤT MỘT hàng", không phải "đúng một hàng".

**2. `scripts/rename/check-disposition.ts`** — script Bun thuần, không import addon native, chạy được khi mọi test khác đang đỏ. Dùng `@oh-my-pi/pi-utils` cho logger nếu nó ghi ra stdout; vì đây là script CLI độc lập không đi vào TUI/RPC thì `console.log` được phép, nhưng phải là output có chủ đích (danh sách vi phạm), không phải log rải rác. Cấu trúc:

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
```

Biểu thức đếm là HẰNG SỐ trong file, không nội suy từ argv, và phải được viết đúng với dấu gạch chéo kép trong chuỗi TS:

```typescript
const OMP_TOKEN_ERE = '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)';
```

Cấm tuyệt đối `\b` và `\<` trong bất kỳ lệnh kiểm nào. Trên máy này `git grep -cE '\bomp\b' -- packages/utils/src/dirs.ts` trả về KHÔNG có dòng nào và exit 1, trong khi `grep -cE '\bomp\b'` trên đúng file đó trả về 104 — vì `git grep` dùng regcomp không hiểu `\b`, còn `grep` trên PATH là `ugrep 7.8.4` thì hiểu. Một cổng viết bằng `git grep -E '\bomp\b'` sẽ luôn xanh vì không khớp gì cả. Đó là loại cổng nguy hiểm nhất: nó không đỏ khi sai, nó chỉ không bao giờ đỏ.

Hai chế độ:
- `--stage=pre` — bảng phải đầy đủ và đã duyệt. Đỏ khi: thiếu hàng cho file nào trong tập 599; có hàng cho `path` không còn tồn tại trong cây; `reason` rỗng; `disposition` ngoài từ vựng; `hits` không khớp số đo bằng biểu thức ứng với `disposition` của chính hàng đó (xem mục `hits` — `keep-worker-selector` và `keep-path` dùng biểu thức riêng, không dùng ERE); `hits = 0` khi `keep_refs` trỏ tới một vị trí dạng trần không khớp bất kỳ biểu thức nào (trường hợp N5/N7) mà cột `reason` lại không ghi lý do; `keep_refs` rỗng khi `disposition` bắt đầu bằng `keep-`; `keep_refs` khác rỗng khi `disposition` là `rename`; tổng `hits` theo `path` lệch với tổng lượt thật; số file trong bảng khác số file `git grep` trả về. Chưa có người duyệt thứ hai thì chỉ in cảnh báo, KHÔNG đỏ — xem lý do ở Cổng 0.
- `--stage=post` — sau khi đổi tên. Với mỗi hàng `rename`: số lượt còn lại trong file phải bằng 0. Với mỗi hàng `keep-*`: số lượt còn lại phải BẰNG đúng `hits` đã ghi. Không có danh sách thứ hai để đối chiếu — tập hit còn lại được đối chiếu với chính `disposition` trong bảng, đúng như plan yêu cầu.

Không dùng `mock.module()`, không `any`, không `ReturnType<>`, không inline import. `parseDisposition` trả về object chứa cả `rows` lẫn `violations` nên hai chế độ dùng chung một parser và một nguồn sự thật.

**Điều KHÔNG được làm:** không `sed` trên 599 file. Đó chính là kịch bản tai nạn mà mục này tồn tại để chặn — một `sed` token sẽ đổi cả tên hiển thị lẫn giá trị wire lẫn selector worker, và không ai kiểm tra được vì không có danh sách nào nói cái gì được phép đổi.

### Hợp đồng test

Hợp đồng quan sát được của mục này là: **bảng quyết định và cây mã phải khớp nhau theo hai chiều, và bộ kiểm phải đỏ được khi chúng lệch.**

Cụ thể, `bun scripts/rename/check-disposition.ts` bảo vệ bốn hợp đồng, mỗi hợp đồng đều gọn tên được lỗi cụ thể mà người đọc sẽ thấy:

1. **Không file nào trong tập 599 bị bỏ sót khỏi bảng.** Tệp chưa có hàng nào thì đỏ. Lỗi bị chặn: một `sed` hoặc một PR sửa 480 file và bỏ 119 file không ai nhớ tới — đúng kết quả tệ nhất mà mục này sinh ra để tránh.
2. **Không hàng nào giữ mà không có lý do và không có căn cứ.** `reason` rỗng, hoặc `keep_refs` rỗng ở hàng `keep-*`, hoặc `keep_refs` khác rỗng ở hàng `rename` — đều đỏ. Lỗi bị chặn: một hàng `keep-wire` không nêu mục §2.3 nào cho phép, tức là giữ một giá trị wire chỉ vì ai đó ghi tên nó vào bảng.
3. **Số `hits` là số thật.** Tổng `hits` mỗi `path` phải bằng tổng lượt thật. Lỗi bị chặn: một lượt không được tính vào bất kỳ hàng nào — trường hợp nguy hiểm nhất vì nó biến một quyết định "giữ" thành quyết định "không ai để ý".
4. **Sau khi đổi tên, hệ quả đúng như bảng nói.** Hàng `rename` còn 0 lượt; hàng `keep-*` còn đúng số `hits`. Lỗi bị chặn: đổi tên quá tay vào giá trị wire, hoặc bỏ sót một lượt hiển thị trong file hỗn hợp — trường hợp mà nếu cột `hits` chỉ đếm theo file thì lượt bỏ sót sẽ bị che bởi lượt giữ hợp lệ.

Ranh giới giữ được là: nếu bảng bị xoá, script phải ĐỎ; nếu bảng đầy đủ và khớp, script phải XANH. Đó là một mệnh đề đúng–sai, không phải một sự kiện. Ở đây script đọc một BẢNG DỮ LIỆU đã được duyệt — không phải mã nguồn — và khẳng định quan hệ toàn vẹn giữa bảng đó và cây. Cùng một hình thức với `scripts/fix-changelogs.ts` sẵn có của repo.

**Điều kiện bắt buộc: chứng minh cổng đỏ được trước khi báo xong.** Một cổng chưa từng đỏ không có bằng chứng là nó đang canh. Chạy ba thao tác phá hỏng có chủ đích (xoá một hàng, để trống `reason`, đổi tên token trong file `keep-wire`) và ghi lại exit code thực tế của từng cái vào PR. Nếu không làm, `gate_can_fail` của mục này là `false` và nó không được coi là đã nghiệm thu.

Về `bun test`: trên máy này bộ test bị chặn bởi native addon, nên KHÔNG đặt test runner làm cổng. Nếu muốn có một file test, `scripts/rename/check-disposition.test.ts` chỉ được thêm sau khi đã gỡ chặn, và nó phải gọi hàm export của checker chứ không tự dựng lại logic — hai bản sao của cùng một bộ kiểm là hai bộ kiểm, một bản sẽ trôi.

Nếu hồi quy, người tiêu dùng thấy: một trong bốn vi phạm trên quay lại mà không báo trước — tên hiển thị còn sót tên cũ, hoặc một giá trị wire bị đổi nhầm khiến cài đặt/extension/dashboard chi phí đang chạy hỏng mà không có lỗi nào được ném ra. Tên file test: `scripts/rename/check-disposition.ts`, và tùy chọn `scripts/rename/check-disposition.test.ts` (chỉ sau khi gỡ chặn native addon).

### Xác minh

Tất cả lệnh dưới đây đã chạy thật trên máy này, HEAD `84cbac9`, ngày 2026-09-28, và ĐÃ CHẠY LẠI Ở HEAD `1454dc0` — kết quả không đổi, vì `git diff --stat 84cbac9 HEAD` cho thấy giữa hai commit chỉ `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` thay đổi, không có file `.ts` nào đổi. Chạy TẤT CẢ từ repo root `/Users/tranquangdang21/Projects/ultraworkers` — `git grep` không có pathspec thì chỉ quét thư mục đang đứng, và chạy từ `.lavish-wip/m5-specs/` trả về 0 file.

```bash
# Số liệu nền đã kiểm chứng (dùng để đối chiếu, KHÔNG ép về số của plan)
git grep -lE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | wc -l   # → 599 (plan ghi 585)
git grep -oE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | wc -l   # → 1853 (plan ghi 1826)
git rev-parse --short HEAD   # → 1454dc0 (đo ở 84cbac9 cũng ra 599/1853)

# Đếm lại độc lập bằng perl lookaround trên đúng 599 đường dẫn
# → occurrences=1853 files_with_hits=599 (git grep -o KHÔNG đếm thiếu)

# Tách nhóm: 373 file nguồn + 226 file test
# Theo gói: coding-agent 422, ai 59, tui 47, utils 14, catalog 12, scripts 11,
#           metaharness 10, stats 6, natives 5, wire 3, browser-relay 3, omptype 2,
#           agent 2, mnemopi 1, collab-web 1, và 1 file trong root `.omp/` của chính
#           repo (`.omp/tools/tui.ts`)
# Chồng scope: 26 file có cả `omp` token lẫn `".omp"`; 11 file có cả token lẫn
#             `__omp_worker_`; 562 file không dính cái nào trong hai.
# 318 file trong 599 có từ 2 LƯỢT trở lên (đếm bằng `git grep -oE`; nếu đếm
# bằng `git grep -cE` thì là 310, vì `-cE` đếm DÒNG). File nặng nhất là
# `packages/coding-agent/test/update-cli.test.ts`: 59 lượt trên 58 dòng.
# Số ở cột `hits` phải lấy từ `-oE`, không phải từ `-cE`.
# Literal `"omp"` (đúng ba ký tự) xuất hiện trong 98 file của tập 599
# (đếm FILE, không phải lượt).

# Bẫy regex — KHÔNG dùng \b trong bất kỳ lệnh kiểm nào
git grep -cE '\bomp\b' -- packages/utils/src/dirs.ts   # → không in dòng nào, exit 1
grep -cE '\bomp\b' packages/utils/src/dirs.ts          # → 104 (grep trên PATH là ugrep 7.8.4)
grep --version                                          # → ugrep 7.8.4 aarch64-apple-macosx
# Biểu thức đã ghim trên cùng file → 19 dòng

# Con số plan nói sai, đã đo lại
git grep -oE '"\.omp"' -- . | wc -l    # → 280 (plan ghi 258)
git grep -lE '"\.omp"' -- . | wc -l    # → 94  (plan ghi 89)
git grep -n '__omp_worker_' -- '*.ts' ':!*test*' | wc -l   # → 30 dòng (plan ghi 28)
git grep -l '__omp_worker_' -- '*.ts' ':!*test*' | wc -l   # → 14 file (plan ghi 13)
git grep -oh '__omp_worker_[a-z_]*' -- '*.ts' | sort -u | wc -l   # → 21 chuỗi phân biệt
git grep -lE '"oh-my-pi"' -- '*.ts' | wc -l   # → 14
git grep -lE '"oh-my-pi"' -- . | wc -l       # → 16 (cộng chính file plan tự nhiễm)
git grep -lE '"\.omp"' -- 'packages/**/test/**' | wc -l   # → 61
git grep -l '__omp_worker_' -- 'packages/**/test/**' | wc -l   # → 9
# hợp nhất hai tập trên → 70 file của W11; 24 trùng với tập file test của W8b

# Gỡ chặn native addon (chỉ khi cần cổng test:ts)
command -v ninja    # → rỗng
command -v cmake    # → /opt/homebrew/bin/cmake
command -v brew     # → /opt/homebrew/bin/brew
# bun --cwd=packages/natives run build  →  CMake Error: CMake was unable to find a build
#   program corresponding to "Ninja". CMAKE_MAKE_PROGRAM is not set.  (exit 1)
```

Các neo đã mở và xác nhận đúng (dùng làm mốc khi sửa): `packages/utils/src/dirs.ts:21` (`APP_NAME`), `:24` (`APP_URL`), `:27` (`CONFIG_DIR_NAME`), `:30` (`MAIN_CONFIG_FILENAMES`), `:36` (`USER_AGENT`), `:298` (`getConfigDirName`), `:1084` (`OMP_APP_NAME` trong `getAppName()`). Cả sáu neo của plan đều đúng. `packages/coding-agent/src/cli/update-cli.ts:166,190` (`manifest.omp`) và `packages/coding-agent/src/cli/worker-selectors.ts:9-21` (8 selector hằng số) cũng đúng.

Mốc thời gian quan sát được của `bun run check:ts` lần chạy lạnh 2026-09-28: `@oh-my-pi/typescript-edit-benchmark:check:types | Done in 211.83s`, `@oh-my-pi/pi-metaharness:check:types | Done in 152.51s`, `@oh-my-pi/pi-tui:check:types | Done in 74.87s`, `@oh-my-pi/snapcompact:check:types | Done in 21.15s`.

### Cổng hoàn thành

Theo thứ tự. Cổng 0 phải xanh trước khi coi mục này là bắt đầu.

Có BỐN cổng, đánh số 0–3; cổng 3 là thông tin, không chặn merge. Dòng mở đầu mục này trước đây ghi "Ba cổng" — đã sửa thành "Bốn cổng".

**Cổng 0 — bảng quyết định đầy đủ, cân đối, và đã được một người khác duyệt.** `bun scripts/rename/check-disposition.ts --stage=pre` exit 0. Đỏ khi: thiếu hàng cho bất kỳ file nào trong tập 599; hàng trỏ tới `path` không còn tồn tại; `reason` trống; `disposition` ngoài từ vựng đóng; `hits` không khớp tổng lượt thật của file; `keep_refs` sai quy tắc theo `disposition`. Điều kiện duyệt KHÔNG làm đỏ: nếu `git log --format='%ae' -- scripts/rename/disposition.tsv` chỉ trả về MỘT địa chỉ, cổng vẫn XANH nhưng phải in cảnh báo `WARN: bảng tự duyệt — chưa có người duyệt thứ hai` ra stdout, và PR phải ghi rõ tên người đã đọc. Lý do không chặn: lịch sử git của repo chỉ có hai tác giả (`git log --format='%ae' | sort | uniq -c` → 7 `e2e@example.com`, 1 `tranquangdang21@gmail.com`) và identity đang cấu hình là `E2E`, nên điều kiện ≥2 địa chỉ sẽ đỏ VĨNH VIỄN trên máy này và W8b sẽ không bao giờ ship được phần hiển thị.

**Cổng 1 — sau khi chạy.** `bun scripts/rename/check-disposition.ts --stage=post` exit 0. Mỗi hàng `rename` còn 0 lượt; mỗi hàng `keep-*` còn đúng số lượt ở cột `hits`. Cổng này đối chiếu tập hit còn lại với `disposition` TRONG CHÍNH BẢNG, không đối chiếu với một danh sách viết tay thứ hai — vì danh sách thứ hai chính là nơi mà một `grep` sẽ "xanh" trong khi việc đổi tên đã hỏng.

**Cổng 2 — typecheck.** `bun run check:ts` exit 0. Đã xác nhận xanh.

**Cổng 3 (không chặn merge, nhưng phải báo cáo kết quả) — `bun run test:ts`.** Ghi kết quả vào PR kèm lý do nếu không chạy được. KHÔNG dùng làm điều kiện nghiệm thu khi native addon chưa build, vì khi đó nó không phân biệt được "đổi tên làm hỏng" với "hạ tầng chưa sẵn sàng" — cả hai đều ra cùng một exit 1.

**Không nằm trong cổng, nhưng bắt buộc trước khi báo xong:** chứng minh cổng đỏ được bằng ba thao tác phá hỏng có chủ đích, ghi exit code thật vào PR (`steps[10]`). Không có bước này thì `gate_can_fail` là `false`.

Cổng này **có thực sự đỏ được không:** đặc tả khai `gate_can_fail: true` và cung cấp đúng cơ chế — cả hai cổng `--stage=pre` và `--stage=post` đều in vi phạm ra stdout rồi `process.exit(1)`, nên đỏ được về mặt cấu trúc. Nhưng đó là lập luận suông khi script chưa tồn tại, và chưa có bằng chứng thực nghiệm: ba file `scripts/rename/` (`disposition.tsv`, `check-disposition.ts`, `README.md`) chưa tồn tại, nên chưa lần nào cổng từng chạy, đừng nói là từng đỏ. Cổng 2 (`bun run check:ts`) đã chạy thật và xanh. Cổng 3 đỏ sẵn vì hạ tầng, nên không dùng làm bằng chứng. Bằng chứng duy nhất được chấp nhận là ba exit code thật ở bước 10.

### Phụ thuộc

- `depends_on`: W1, W2, W3.
- `blocks`: W11.

### Cách sai dễ nhất

1. **`sed` đại trà.** Đã nêu ở phần Rủi ro chính.
2. **Rủi ro che lỗi do file hỗn hợp.** 26 file có cả lượt đổi lẫn lượt giữ, 11 file có cả token lẫn selector. Nếu cột `hits` chỉ đếm theo file, một lượt đổi bị bỏ sót sẽ bị lượt giữ hợp lệ che đi và cổng vẫn xanh. Vì vậy `hits` BẮT BUỘC tách theo lớp disposition, và cổng phải so từng hàng chứ không so từng file.
3. **Va chạm sở hữu với W11 mà plan không nói ra.** 226 trong 599 file là file test. Tập W11 (wave 5) là 70 file test, và 24 file trong số đó TRÙNG với tập của W8b. Nếu W8b đổi tên literal trong một file test mà W11 sau đó sẽ chuyển sang đọc hằng số, công việc bị làm hai lần; tệ hơn, nếu W8b đổi tên một khẳng định literal thành một giá trị sai thì W11 sẽ kế thừa cái sai đó và test vẫn xanh. Cần một thỏa thuận ghi ra bằng văn bản trước khi code — xem `open_questions[1]`.
4. **Thứ tự với W9.** W8b gán hàng selector là `keep-worker-selector` với `keep_refs=W9`, nhưng W9 ở wave 4, TẾT hơn W8b ở wave 3. 11 file chứa cả hai loại hit. Nếu hai work item này cùng bay trên cùng một file, một bên sẽ ghi đè bảng của bên kia. Bắt buộc phải rà lại bảng sau khi W9 merge (`steps[12]`).
5. **Bẫy regex của máy này.** `git grep -E` và `grep -E` không đồng ý với nhau về `\b`. Một cổng viết bằng `\b` sẽ luôn xanh. Biểu thức đã ghim ở §2.1 không có `\b` và cho 19 dòng trên `dirs.ts` — dùng đúng nó.
6. **Chi phí của việc không có ai duyệt.** Nếu quy tắc "một người duyệt không phải người viết nó" không được tổ chức, mục này không bị chặn bởi hệ thống mà bị chặn bởi sự im lặng — và kết quả là 599 quyết định do một người tự duyệt, tức là bảng quyết định trở thành một danh sách tự khai. Xem `open_questions[0]`.

### Cần người quyết

- **AI LÀ NGƯỜI DUYỆT, DUYỆT LÚC NÀO, VÀ NẾU KHÔNG CÓ AI DUYỆT THÌ MỤC NÀY CÓ BỊ CHẶN KHÔNG?** Đây là câu hỏi vận hành, và plan chỉ trả lời bằng một câu. Cụ thể: (1) AI — lịch sử git của repo này chỉ có hai tác giả, `E2E <e2e@example.com>` (7 commit) và `Tran Quang Dang <tranquangdang21@gmail.com>` (1 commit), và identity đang cấu hình là `E2E`. Vậy người duyệt là người thứ hai kia, hay chính `E2E` phải đổi identity, hay quy tắc này vô hiệu lực khi milestone chạy một mình? (2) KHI NÀO — trước khi viết dòng đầu tiên của bảng, hay sau khi viết xong? Plan nói "không duyệt thì W8b không được sửa dòng nào trong 585 file đó", nghĩa là duyệt PHẢI xảy ra trước khi sửa mã, tức là trước khi viết bảng xong — vậy người duyệt phải theo dõi tiến trình viết bảng chứ không thể duyệt một lần lúc PR mở. (3) NẾU KHÔNG CÓ AI — câu trả lời đề xuất là KHÔNG chặn, nhưng phải ghi rõ trong PR rằng bảng tự duyệt và ai đã đọc. Lý do không nên chặn cứng: W8b là mục không quy ra ngày được, chặn nó vô điều kiện vì thiếu một người có nghĩa là milestone không bao giờ ship được phần hiển thị. Nhưng đặc tả này KHÔNG tự quyết — đó là quyết định của người đứng ngoài. Cách cài đã đặt: `--stage=pre` kiểm `git log --format='%ae' -- scripts/rename/disposition.tsv` có ít nhất hai địa chỉ khác nhau hay không, và in ra cảnh báo khi chỉ có một.
- **226 TRONG 599 FILE LÀ FILE TEST, VÀ 24 FILE TRONG SỐ ĐÓ TRÙNG VỚI TẬP 70 FILE CỦA W11. AI SỞ HỮU VIỆC ĐỔI TÊN TRONG 226 FILE ĐÓ?** Plan đặt W11 ở wave 5, sau W8b, và W11 nói rõ nhiệm vụ của nó là chuyển khẳng định literal sang đọc hằng số. Nếu W8b sửa literal trước, W11 sẽ làm lại; nếu W8b bỏ qua, cổng nghiệm thu 2 của W8b sẽ không bao giờ đạt vì W11 chưa chạy. Đề xuất: W8b CHỈ gán `disposition` cho 226 file test — tức `keep-wire` cho khẳng định wire, `rename` cho khẳng định tên hiển thị — nhưng KHÔNG sửa dòng nào trong chúng; W8a/W7/W9 sửa hằng số trước, W11 mới đọc lại. Nhưng điều đó biến `hits` của 226 hàng thành con số "đã biết sẽ đổi" chứ không phải "đã đổi", và cổng `--stage=post` sẽ đỏ. Cần một quyết định bằng văn bản, không phải một quy ước ngầm.
- **BA TRONG NĂM LITERAL `APP_NAME` NHÂN BẢN LÀ HÀNG 17 CỦA §2.2, KHÔNG THUỘC W8B — NHƯNG NÓ CÙNG NẰM TRONG TẬP 599.** Cụ thể `packages/coding-agent/src/cli/commands/init-xdg.ts:5` và `packages/tui/src/desktop-notify.ts:29` khai báo `const APP_NAME = "omp"` cục bộ thay vì đọc hằng số từ `dirs.ts`, và `packages/tui/src/terminal-capabilities.ts:45` khai báo `CMUX_NOTIFICATION_TITLE = "omp"`. Nếu W8b chỉ đổi hằng số trung tâm thì ba chỗ này vẫn hiện tên cũ. W1 sở hữu chúng (theo hàng 17) — nhưng chúng nằm trong tập 599 file của W8b, nên nếu W8b đánh `rename` cho chúng thì trùng sở hữu. Đề xuất: W8b đánh `rename` và sửa luôn, vì nó đã ở trong tập; nhưng phải ghi rõ trong PR để không tính trùng. *(Ba neo dòng này ĐÃ mở và xác nhận đúng: `init-xdg.ts:5` và `desktop-notify.ts:29` khai `const APP_NAME = "omp"`, `terminal-capabilities.ts:45` khai `const CMUX_NOTIFICATION_TITLE = "omp"`; cả ba file đều nằm trong tập 599.)*
- **CỘT `hits` CHO 562 FILE "THUẦN HIỂN THỊ" CÓ NHIỀU KHẢ NĂNG LÀ 1, NHƯNG KHÔNG PHẢI LUÔN.** File không chứa `".omp"`, không chứa selector, không chứa giá trị wire nào trong bảng N thì phần lớn lượt là tên hiển thị và `hits` sẽ bằng số dòng có token. Lấy `packages/coding-agent/test/update-cli.test.ts` làm ví dụ ranh giới: trong file này, các lượt `omp/18.0.6-canary.1` (User-Agent, 59 lượt đo bằng `-oE` trên 58 dòng, gom với 26 literal `"omp"` nên dễ gộp nhầm) KHÔNG khớp biểu thức đã ghim — vì `/` và `.` nằm trong lớp loại `[^a-zA-Z0-9_./-]` trước `omp` — cũng như `".local/bin/omp"`. Cột `hits` của `scope=display-token` vì thế CHỈ đếm token có dấu phân cách thật (nháy, space, backtick, `(`); các giá trị đường dẫn/User-Agent phải được bảo vệ bằng một hàng riêng nếu cần — bằng `scope=dot-omp-literal` hoặc `keep-path`, không phải bằng `hits` của `scope=display-token`. Người viết bảng phải mở từng file và tách, không được suy ra `hits` từ `grep -c`. Đây là lý do effort là L chứ không phải M.
- **W8B VÀ W9 CÙNG CHẠM 11 FILE.** W8b gán chúng là `keep-worker-selector` với `keep_refs=W9`, W9 sẽ đổi tên selector. Nếu W9 chạy trước khi bảng W8b được duyệt, bảng sẽ mô tả một thế giới không còn tồn tại và `--stage=post` sẽ đỏ. Có nên đưa W9 vào `depends_on` của W8b không, hay giữ thứ tự wave 3 → wave 4 và chấp nhận một lần rà lại bảng? Plan nói "bảng quyết định phải được rà lại sau W9", nghe như phương án thứ hai, nhưng không nói rõ.
- **CÓ NÊN ĐƯA 599 FILE CÒN LẠI THÀNH BA NHÓM EFFORT KHÁC NHAU THAY VÌ MỘT MỤC KHÔNG?** Tập 599 gồm 422 file coding-agent, 59 ai, 47 tui và 71 file của các gói khác. Các anchor đã kiểm chứng (`dirs.ts:21,24,27,36`, `update-cli.ts:166,190`, `worker-selectors.ts:9-21`) đều tập trung ở vài chục file; 318 file có từ 2 lượt trở lên (310 file nếu đếm theo dòng). Có thể một work item riêng cho tập có `hits` nhỏ, chạy song song, sẽ rẻ hơn — nhưng khi đó bảng quyết định bị chia và cổng phải đọc nhiều tệp. Plan đã cân nhắc và chọn một mục; ghi lại vì con số 599 làm mục này lớn hơn mức "L" mà một mục duy nhất nên mang.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| §2.2 hàng 6 và toàn bộ mục W8b: "1826 lượt / 585 file `.ts` chứa token `omp` đứng riêng", và cổng 0 của W8b dùng đúng con số 585 làm kỳ vọng. | SAI Ở CẢ HAI CON SỐ. Đây là phát hiện quan trọng nhất của đặc tả này. | Tại HEAD 1454dc0: **599 file** và **1853 lượt** — nhiều hơn con số của plan lần lượt là 14 file và 27 lượt. Mọi con số trong W8b dùng 585/1826 phải đổi thành 599/1853, và cổng phải so với số đo lại chứ không so với hằng số của plan. Nguyên nhân gần như chắc chắn là cây đã trôi từ HEAD mà plan dùng (`5873776`, nhắc ở §2.3 và §2.4) sang `84cbac9` — nhưng kể cả khi đó, cột "Hành động theo" của bảng và tiêu đề của W8b đang phát ra một lệnh cụ thể cho kỹ sư, nên sai 14 file là sai một cách có hậu quả. Bằng chứng: `git -C /Users/tranquangdang21/Projects/ultraworkers grep -lE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]\|$)' -- '*.ts' \| wc -l` → 599; cùng lệnh với `-o` thay `-l` → 1853; đếm lại độc lập bằng perl lookaround trên đúng 599 đường dẫn cho `occurrences=1853 files_with_hits=599`; `git rev-parse --short HEAD` → 84cbac9 (HEAD lúc đo; số đo đã tái lập ở 1454dc0, kết quả không đổi). |
| §2.1 và mọi mục khác giả định có thể chạy lệnh đếm "từ bất kỳ đâu trong repo" và so kết quả với con số đã ghi. | BẪT THẬT, ĐÃ TÁI LẬP. Đây là bẫy âm thầm nguy hiểm nhất của toàn bộ mục này. | `git grep` KHÔNG có pathspec thì chỉ quét thư mục đang đứng. Chạy đúng biểu thức của plan từ `.lavish-wip/m5-specs/` trả về **0 file và 0 lượt** — trông y hệt một cây đã đổi tên xong sạch. Vì vậy mọi lệnh trong đặc tả này đều phải chạy từ repo root, và cổng phải từ chối chạy khi cwd không phải gốc repo thay vì im lặng trả về 0. Bằng chứng: lần chạy đầu tiên, cwd = `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/m5-specs` → 0, 0, và cả lệnh không pathspec → 0; chạy lại bằng `git -C /Users/tranquangdang21/Projects/ultraworkers ...` → 599 và 1853. |
| Cổng nghiệm thu 2 của W8b: "`bun run check && bun run test:ts`" — và phần cổng này được coi là bằng chứng rằng việc đổi tên không phá gì. | CỔNG KHÔNG ĐỎ ĐƯỢC TRÊN MÁY NÀY. Nó đỏ sẵn, trước cả khi bạn sửa một dòng nào, nên nó không phân biệt được "tôi làm hỏng" với "hạ tầng chưa sẵn sàng". | `bun run test:ts` hiện exit 1 với `3 chunks passed / 185 failed`, nguyên nhân là `Error: Failed to load pi_natives native addon for darwin-arm64` — không liên quan gì đến việc đổi tên. Đặc tả này vì vậy thay cổng này bằng hai cổng luôn chạy được: `bun scripts/rename/check-disposition.ts --stage=post` (thuần Bun, không đụng addon) và `bun run check:ts` (đã xanh). `test:ts` chỉ còn là cổng thông tin, phải báo kết quả kèm lý do nếu không chạy được, và tuyệt đối không phải điều kiện nghiệm thu. Bằng chứng: `bun run test:ts` → `Ran 188 test command(s) in 114.3s`, `3 chunks passed`, `185 failed`, `error: script "test:ts" exited with code 1`, kèm `Cannot find module '.../packages/natives/native/pi_natives.darwin-arm64.node'`; `bun --cwd=packages/natives run build` → `CMake Error: CMake was unable to find a build program corresponding to "Ninja". CMAKE_MAKE_PROGRAM is not set.`, exit 1; `command -v ninja` → rỗng; `command -v cmake` → `/opt/homebrew/bin/cmake`; `command -v brew` → `/opt/homebrew/bin/brew`. Ngược lại `bun run check:ts` → exit 0, đã chạy thật. |
| §2.2 hàng 6 và mọi cổng của M5 giả định có thể viết điều kiện chạy bằng ranh giới từ `\b`. | ĐÚNG LÀ BẪT, VÀ NÓ BIẾN MỘT CỔNG THÀNH CỔNG KHÔNG BAO GIỜ ĐỎ. Biểu thức đã ghim ở §2.1 không mắc lỗi này — nhưng bất kỳ ai viết lại cổng bằng trực giác thì mắc. | Trên máy này `git grep` dùng regcomp và KHÔNG hiểu `\b`; `grep` trên PATH là `ugrep 7.8.4` thì CÓ. Cùng một mẫu trên cùng một file cho hai kết quả trái ngược. Một cổng viết bằng `git grep -E '\bomp\b'` luôn trả 0 dòng, tức luôn xanh, kể cả khi cây còn đầy tên cũ. Đặc tả này cấm `\b` và `\<` trong mọi lệnh kiểm và bắt dùng đúng biểu thức đã ghim ở §2.1. Bằng chứng: `git grep -cE '\bomp\b' -- packages/utils/src/dirs.ts` → không in dòng nào, exit 1; `grep -cE '\bomp\b' packages/utils/src/dirs.ts` → 104; `grep -cE '[[:<:]]omp' packages/utils/src/dirs.ts` → 104; biểu thức đã ghim trên cùng file → 19 dòng; `grep --version` → `ugrep 7.8.4 aarch64-apple-macosx`. |
| W8b: "Danh sách loại trừ bắt buộc: 7 mục trong `do_not_rename`" — gợi ý cả 7 vị trí wire nằm trong tập 585 file và được bảo vệ bởi biểu thức đã ghim. | SAI MỘT NỬA. 5 trên 7 vị trí khớp biểu thức; 2 vị trí không khớp. | `acp-agent.ts:656` (N5, `name: "oh-my-pi"`) và `telemetry-export-otlp.ts:51` (N7, `SERVICE_NAME = "oh-my-pi"`) là dạng TRẦN nên dòng đó không chứa token `omp` và không khớp biểu thức. Cả hai file ĐỀU nằm trong tập 599 (vì có hit khác), nên cái thật sự sai không phải "file không được bảo vệ" mà là "bảo vệ theo tên file không bảo vệ đúng dòng" — một rule dạng "loại trừ cả file" sẽ tạo cảm giác an toàn giả. Vì vậy các hàng `keep-wire` phải ghi ở mức mà cột `hits` tách được, và quy trình rà phải mở đúng dòng, không chỉ đúng file. Bằng chứng: với `E='(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]\|$)'`, kiểm `sed -n '<line>p' <file> \| grep -qE "$E"`: `packages/catalog/src/wire/codex.ts:52` MATCHES; `packages/coding-agent/src/dap/session.ts:1465` MATCHES; `packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236` MATCHES; `packages/coding-agent/src/modes/warp-events.ts:60` MATCHES; `packages/ai/src/providers/gitlab-duo-workflow.ts:2232` MATCHES; `packages/coding-agent/src/modes/acp/acp-agent.ts:656` **no-match**; `packages/coding-agent/src/telemetry-export-otlp.ts:51` **no-match**. Cả hai file vẫn có mặt trong tập 599 khi tra bằng `grep -qxF`. |
| §2.2 hàng 8 và mục W8b dùng làm số loại trừ: literal `".omp"` = 258 lượt / 89 file. | SAI. Con số thật là 280 lượt / 94 file. | Cùng lệnh, cùng cây, khác kết quả. Vì W8b dùng con số này làm tiền đề để nói "258 literal này thuộc W4/W6, không phải ở đây", sai ở đây có nghĩa là 22 lượt trong 5 file không ai nhận trách nhiệm. Bằng chứng: `git grep -oE '"\.omp"' -- . \| wc -l` → 280; `git grep -lE '"\.omp"' -- . \| wc -l` → 94. Trong riêng tập 599 file `.ts`, 26 file có literal `".omp"`. |
| W8b: "toàn bộ 28 vị trí selector của W9" là phần bắt buộc của danh sách loại trừ; §2.2 hàng 9 ghi 28 lượt / 13 file. | SAI Ở CẢ HAI CON SỐ. Lệnh nguyên bản của plan giờ cho ra 30 dòng / 14 file. | Bằng đúng lệnh của plan (`git grep -n '__omp_worker_' -- '*.ts' ':!*test*' \| wc -l`) → **30 dòng**, và `git grep -l '__omp_worker_' -- '*.ts' ':!*test*' \| wc -l` → **14 file**. Trong toàn bộ `.ts` (kể cả test) có 74 dòng; trong toàn bộ file đã track có 89 dòng. Số chuỗi selector phân biệt trong `.ts` là **21**, trong đó có hai giá trị trông như giá trị thử nghiệm (`__omp_worker_does_not_exist`, `__omp_worker_test`) và một tiền tố trần `__omp_worker_` được khẳng định nguyên văn trong `packages/utils/test/worker-host.test.ts`. Danh sách loại trừ của W8b phải ghi "30 dòng / 14 file / 21 chuỗi phân biệt" chứ không ghi 28. Bằng chứng: các lệnh `git grep` nêu trên chạy từ repo root; `git grep -oh '__omp_worker_[a-z_]*' -- '*.ts' \| sort -u \| wc -l` → 21; `packages/coding-agent/src/cli/worker-selectors.ts:9-21` chứa 8 hằng số selector (blob_broker, computer, daemon_broker, ida_host, lsp_mux, stats_activity, text_predict, terminal_output); `packages/coding-agent/src/cli.ts:182-189` chứa 8 hằng số khác (tiny_inference, stats_sync, tab, js_eval, js_eval_process, stt, tts, mnemopi_embed) — các neo này của plan ĐÚNG. |
| §2.2 hàng 2 và mục W8: literal dạng trần `"oh-my-pi"` nằm ở 15 file (14 `.ts` + `docs/provider-quirks.md`). | Gần đúng nhưng thiếu một file: 16, không phải 15. | Lệnh `git grep -lE '"oh-my-pi"' -- .` cho ra 16 file: 14 file `.ts` (khớp con số của plan) cộng `docs/provider-quirks.md` (plan đã tính) và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — chính file plan. File plan chứa `oh-my-pi` trong chính văn bản đặc tả nên nó tự nhiễm vào mọi lệnh đếm toàn repo. Đây không phải lỗi nghiêm trọng, nhưng nó có nghĩa là mọi lệnh `git grep -l ... -- .` trong M5 đang đếm thêm chính tài liệu kế hoạch, và ai chạy lại sẽ phải tự loại nó ra mà không có hướng dẫn. Bằng chứng: `git grep -lE '"oh-my-pi"' -- '*.ts' \| wc -l` → 14; `git grep -lE '"oh-my-pi"' -- . \| wc -l` → 16; `git grep -lE '"oh-my-pi"' -- . \| grep -v '\.ts$'` → `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` và `docs/provider-quirks.md`. |
| W11 (mục nghiệm thu phụ thuộc của W8b) phạm vi 68 file test, và W8b được mô tả như thể toàn bộ 585 file là việc của riêng nó. | SAI Ở CON SỐ, VÀ BỎ SÓT MỘT VA CHẠM SỞ HỮU NGUYÊN TẺ. | Tập W11 tính lại được là **70 file** (61 file có `".omp"` + 9 file có `__omp_worker_`), không phải 68. Quan trọng hơn con số: **226 trong 599 file của W8b là file test**, và **24 file trong số đó trùng với tập 70 file của W11**. Danh sách loại trừ mà W8b nêu (7 mục do_not_rename + selector + `".omp"`) không hề nhắc tới file test, trong khi 38% tập 599 là file test và W11 ở wave 5 — sau W8b. Đây là khoảng trống thật trong kế hoạch chứ không phải sai số: không ai đã nói W8b và W11 chia tay tập file test thế nào. Bằng chứng: `git grep -lE '"\.omp"' -- 'packages/**/test/**' \| wc -l` → 61; `git grep -l '__omp_worker_' -- 'packages/**/test/**' \| wc -l` → 9; hợp nhất hai tập → 70. Lọc tập 599 bằng `(^/\|(test\|tests)/\|\.test\.ts$)` → 226. `comm -12 <(tập W11) <(tập file test của W8b) \| wc -l` → 24, gồm `packages/coding-agent/test/acp-agent.test.ts`, `packages/coding-agent/test/modes/...`, `packages/utils/test/logger-contract.test.ts` và 21 file khác. 373 + 226 = 599. |
| Các neo `dirs.ts:21,24,27,30,36` và `getConfigDirName()` tại `dirs.ts:298` mà M5 dùng làm trung tâm toàn bộ việc đổi tên. | ĐÚNG TOÀN BỘ. Đã mở file và đối chiếu từng dòng. | Không cần sửa. Ghi lại ở đây vì đây là nhóm neo duy nhất của M5 còn nguyên vẹn, và vì nó là đối chứng cho các con số đã trôi ở trên: cấu trúc của cây không đổi, chỉ số lượng file khớp biểu thức đã tăng lên. Bằng chứng: `sed -n '15,40p' packages/utils/src/dirs.ts` cho dòng 21 `export const APP_NAME: string = "omp";`, dòng 24 `export const APP_URL: string = "https://omp.sh/";`, dòng 27 `export const CONFIG_DIR_NAME: string = ".omp";`, dòng 30 `export const MAIN_CONFIG_FILENAMES = ["config.yml", "config.yaml"] as const;`, dòng 36 `export const USER_AGENT = \`omp/${VERSION}\`;`. `sed -n '294,302p'` cho dòng 298 `return process.env.PI_CONFIG_DIR \|\| CONFIG_DIR_NAME;`. Ngoài ra `dirs.ts:1084` là `const value = process.env.OMP_APP_NAME?.trim();` trong `getAppName()`. |
| Giao việc bàn giao: "`bun run check:ts` chạy được: exit 0 sau ~29 giây trên máy rảnh". | Exit 0 thì đúng, con số 29 giây thì SAI trong lần chạy lạnh. (Lỗi này nằm ở giao việc bàn giao, không phải trong plan.) | Lần chạy lạnh ngày 2026-09-28 cho thấy riêng gói `typescript-edit-benchmark` đã mất 211.83s và `pi-metaharness` 152.51s. Khoảng 29 giây chỉ đúng khi bộ nhớ đệm kiểu của từng gói đã ấm. Kỹ sư chạy lần đầu và thấy lệnh còn chạy sau vài phút sẽ tưởng treo và giết nhầm. Bằng chứng: `bun run check:ts` → exit 0 với các dòng `@oh-my-pi/typescript-edit-benchmark:check:types \| Done in 211.83s`, `@oh-my-pi/pi-metaharness:check:types \| Done in 152.51s`, `@oh-my-pi/pi-tui:check:types \| Done in 74.87s`, `@oh-my-pi/snapcompact:check:types \| Done in 21.15s`. |

## Cần người xác nhận

Một chỗ trong đặc tả tự mâu thuẫn với chính nó. Không tự sửa ở trên.

1. **`hits` của hai hàng `keep-wire` không khớp quy tắc `hits` phải là số nguyên dương.** Bước 4 bắt ghi `packages/coding-agent/src/modes/acp/acp-agent.ts:656` và `packages/coding-agent/src/telemetry-export-otlp.ts:51` thành hàng `keep-wire`, nhưng đặc tả đã chứng minh hai dòng đó **no-match** với biểu thức đã ghim. Đồng thời phần Hình dạng code nói `hits` được đếm bằng đúng biểu thức đó, và chế độ `--stage=pre` đỏ khi "`hits` không phải số nguyên dương". Với hai hàng này, số lượt tính được bằng biểu thức là 0, nên `hits` không thể vừa là số nguyên dương vừa là số thật mà vẫn giữ được bất biến "tổng `hits` mỗi `path` bằng tổng lượt thật của file đó". Cần một quy tắc riêng — ví dụ cho phép `hits = 0` khi `keep_refs` trỏ tới một vị trí dạng trần không khớp biểu thức, hoặc một cột đếm riêng — trước khi viết checker.
