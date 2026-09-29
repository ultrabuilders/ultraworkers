# Phiếu triển khai — W11 (Chỉ bộ test khẳng định tên về hằng số, sóng 5)

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md` §W11 (dòng 3526–3712)
**Đo trên:** HEAD `47720fd` (nhánh `milestone-1`). Đặc tả đo trên `1454dc0`; `git diff --stat 1454dc0 HEAD -- 'packages/*/test/**'` = **643 files changed**, nên toàn bộ bảng số của đặc tả đã cũ. Mọi con số dưới đây chạy lại bằng lệnh thật.

---

## 1. Cái gì thay đổi, quan sát được

Sau W11, không ai nhìn thấy gì khác trong sản phẩm — nhưng `bun scripts/ci-rename-test-literals.ts` sẽ **thoát 1 với danh sách mọi literal tên cũ còn sót trong `packages/*/test/**` mà chưa có lý do bằng văn bản**, và ba pin giá trị thật (`APP_NAME`, `CONFIG_DIR_NAME`, `WIRE_NAME`) sẽ đỏ nếu ai đó gõ nhầm tên thương hiệu mới vào hằng số.

---

## 2. Bảng điểm sửa

Trích `TRƯỚC` từ file thật, đã `sed`/`awk` mở đọc.

| Path | Symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/utils/test/worker-host.test.ts` | `WORKER_HOST_SELECTOR_PREFIX` pin | `:24` `expect(WORKER_HOST_SELECTOR_PREFIX).toBe("__omp_worker_");` | **GIỮ NGUYÊN VĂN** |
| `packages/utils/test/worker-host.test.ts` | `isWorkerHostSelector` | `:25` `expect(isWorkerHostSelector("__omp_worker_stats_sync")).toBeTrue();`<br>`:26` `expect(isWorkerHostSelector("__omp_worker_computer")).toBeTrue();` | `` expect(isWorkerHostSelector(`${WORKER_HOST_SELECTOR_PREFIX}stats_sync`)).toBeTrue(); ``<br>`` expect(isWorkerHostSelector(`${WORKER_HOST_SELECTOR_PREFIX}computer`)).toBeTrue(); `` |
| `packages/coding-agent/test/worker-selector.test.ts` | `runCli` selector | `:23` `await runCli(["__omp_worker_does_not_exist"]);`<br>`:26` `expect(stderr).toHaveBeenCalledWith("Error: unknown worker selector: __omp_worker_does_not_exist\n");`<br>`:40` `"__omp_worker_does_not_exist",` | Hằng số cục bộ `const INVALID = \`${WORKER_HOST_SELECTOR_PREFIX}does_not_exist\`;` — hậu tố `does_not_exist` **giữ nguyên văn** (test khẳng định selector KHÔNG hợp lệ bị từ chối) |
| `packages/coding-agent/test/worker-selector.test.ts` | `cmd:` argv | `:65` `cmd: [process.execPath, "packages/coding-agent/src/cli.ts", "__omp_worker_js_eval_process"],`<br>*(tương tự `:86`, `:135`, `:188`)* | `` [`${WORKER_HOST_SELECTOR_PREFIX}js_eval_process`] `` |
| `packages/coding-agent/test/executable-fallback.test.ts` | `resolveWorkerSpawnCmd` | `:35,:36,:59,:60,:83,:84,:139,:140` — 8 lượt `"__omp_worker_test"` | `` `${WORKER_HOST_SELECTOR_PREFIX}test` `` (hậu tố `test` giữ nguyên — đây là selector tùy ý, không phải selector thật) |
| `packages/coding-agent/test/eval/process-entry-import.test.ts` | `pingComputerWorker` | `:33` `argv: string[] = ["__omp_worker_computer"],` | `` argv: string[] = [`${WORKER_HOST_SELECTOR_PREFIX}computer`], `` |
| `packages/coding-agent/test/fixtures/computer-worker-cli-selector.ts` | Worker argv | `:3` `argv: ["__omp_worker_computer"],` | `` argv: [`${WORKER_HOST_SELECTOR_PREFIX}computer`], `` |
| `packages/coding-agent/test/eval/worker-core.test.ts` | globalThis gate | `:105` `(globalThis as { __omp_worker_core_gate?: … }).__omp_worker_core_gate = {` … (24 lượt / 16 dòng) | **KHÔNG ĐỔI GIÁ TRỊ.** Thêm MỘT dòng comment: đây là globalThis instrument trùng tiền tố, không phải selector |
| `packages/coding-agent/test/issue-1606-repro.test.ts` | doc comment | `:11` `` * `process.execPath … __omp_worker_tiny_inference` (detached, owning a `` | Sửa chữ hoặc bỏ; ghi `disposition.tsv` `reason=comment-only` |
| `packages/coding-agent/test/issue-3031-repro.test.ts` | doc comment | `:13` `` * round-trips through `__omp_worker_mnemopi_embed`, and `SIGKILL`s the child `` | Như trên |
| `packages/coding-agent/test/issue-7352-repro.test.ts` | doc comment | `:6` `` * unreaped `__omp_worker_mnemopi_embed` child. The embed-worker IPC request `` | Như trên |
| `packages/coding-agent/test/export-html-template.test.ts` | tmpdir prefix | `:26` `const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "omp-html-template-"));` | Cosmetíc — tuỳ chọn |
| `packages/coding-agent/test/export-html-template.test.ts` | `bundledDependencyStubs` | `:32` `"@oh-my-pi/pi-utils": 'export const APP_NAME = "omp"; export const isEnoent = () => false;',` | **`APP_NAME` trong chuỗi mock phải theo giá trị mới.** Sai chỗ này → probe biên dịch với specifier không còn phân giải |
| `packages/coding-agent/test/export-html-template.test.ts` | `THEME_STORAGE_KEY` | `:143` `expect(first).toContain("const THEME_STORAGE_KEY = 'omp-export-theme';");` | **TUYỆT ĐỐI GIỮ NGUYÊN** |
| `packages/coding-agent/test/modes/warp-events.test.ts` | `agent` field | `:111` `agent: "omp",` | `agent: WIRE_NAME,` (khớp `src/modes/warp-events.ts:60`) |
| `packages/coding-agent/test/acp-agent.test.ts` | ext method | `:1140` `const result = await harness.agent.extMethod("_omp/sessions/listAll", { limit: 2 });`<br>`:1144` `await expect(harness.agent.extMethod("omp/sessions/listAll", { limit: 2 })).rejects.toThrow(` | `const ACP_EXT_LIST_ALL = "_omp/sessions/listAll";` dùng ở `:1140`. **`:1144` giữ nguyên dạng không tiền tố.** KHÔNG dùng `APP_NAME` |
| `packages/utils/test/brand-constants.test.ts` | file mới | *(không tồn tại)* | Pin `APP_NAME` = tên mới, `CONFIG_DIR_NAME` = `"." + tên mới`, `WIRE_NAME` = `"omp"` (CŨ, không đổi), `expect(WIRE_NAME).not.toBe(APP_NAME)` |
| `scripts/ci-rename-test-literals.ts` | file mới | *(không tồn tại)* | Detector: quét `packages/*/test/**`, khớp 6 mẫu, đối chiếu `scripts/rename/disposition.tsv`, exit 1 nếu có hit không có disposition |
| `scripts/rename/disposition.tsv` | file của W8b | *(không tồn tại)* | W11 chỉ THÊM hàng, mỗi hàng `reason` khác rỗng |

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

### Bước 0 — Chốt lại baseline (BẮT BUỘC, đặc tả đã hỏng)

Đặc tả ghi 217/200/54/1/1/14 trên 128 file. **Đo lại trên `47720fd`:**

| Mẫu | Đặc tả | Thật (`47720fd`) | Lệnh |
| --- | --- | --- | --- |
| `".omp"` | 217 lượt / 61 file | **195 / 60** | `git grep -oF -- '".omp"' -- 'packages/*/test/**' \| wc -l` |
| `"omp"` | 200 / 54 | **199 / 54** | `git grep -oF -- '"omp"' -- 'packages/*/test/**' \| wc -l` |
| `__omp_worker_` | 54 / 9 | **48 / 9** | idem |
| `_omp/` | 1 | **1** ✓ | idem |
| `omp-export-theme` | 1 | **1** ✓ | idem |
| `"oh-my-pi"` | 14 / 7 | **12 / 5** | idem |
| **Union file** | 128 | **126** | `for pat in …; do git grep -lF -- "$pat" -- 'packages/*/test/**'; done \| sort -u \| wc -l` |
| **Tổng lượt** | 487 | **456** | cộng sáu dòng trên |
| `60+9` | 70 | **69** | `comm -12` hai tập = **0** (không giao nhau) ✓ |

Phân bố `.omp` thật: coding-agent **56**, tui 2, ai 1, utils 1 (đặc tả ghi 57/2/1/1).
Lệnh một dòng cho cả bảng:
```bash
for pat in '".omp"' '"omp"' '__omp_worker_' '_omp/' 'omp-export-theme' '"oh-my-pi"'; do
  printf '%-20s occ=%-5s files=%s\n' "$pat" \
    "$(git grep -oF -- "$pat" -- 'packages/*/test/**' | wc -l | tr -d ' ')" \
    "$(git grep -lF -- "$pat" -- 'packages/*/test/**' | wc -l | tr -d ' ')"
done
```

### Bước 1 — Đối chiếu `do_not_rename` (COMPREHENSIVE_PLAN §2.3)

Ghi kết quả vào `disposition.tsv` cho: root `.omp` cấp project (W6a phương án b — **giữ nguyên**), group và user Unix `omp`, nhãn runner `omp-kata`, layout sandbox `.omp-xdg` + `<.omp-xdg>/{data,state,cache}/omp`, `APP_URL`/`USER_AGENT`.
Tập (i) của bước 5 PHẢI loại `.omp` cấp project ra — nó thuộc tập (ii).

### Bước 2 — Chốt danh sách KHÔNG đụng tới

- `packages/coding-agent/test/profile-cli.test.ts` — đã import `APP_NAME` ở `:9`, dùng **một lần** ở `:144` (`expect(output).not.toContain(\`${APP_NAME}/${VERSION}\`);`). *(Đặc tả ghi dùng ở `:154,:179,:205` — sai; chỉ có `:144`.)*
- `packages/coding-agent/test/utils/resume-command.test.ts` — import `:3`, dùng `:14` và `:21`. **Đúng với đặc tả.**
- `packages/coding-agent/test/fixtures/before-compaction.jsonl` — 2.3 MB, 26 dòng chứa `APP_NAME`. Transcript lịch sử, đóng băng.
- Bốn file có `APP_NAME` trong test tree: `export-html-template.test.ts`, `before-compaction.jsonl`, `profile-cli.test.ts`, `resume-command.test.ts` ✓ (đặc tả ghi 4, đúng).

### Bước 3 — Viết pin trước mọi thay đổi khác, hai pha

`packages/utils/test/brand-constants.test.ts` (chưa tồn tại — `ls` → No such file).
Pha (a): chạy ở TÊN CŨ và xác nhận XANH. Hiện tại `packages/utils/src/dirs.ts:22` là `export const APP_NAME: string = "omp";` và `:28` là `export const CONFIG_DIR_NAME: string = ".omp";` — nghĩa là tên mới **chưa** tồn tại; W3 mới đổi chúng. Pin phải xanh với giá trị cũ trước khi bước (b).
Pha (b): chỉ sau đó mới đổi giá trị pin sang tên mới. `WIRE_NAME` **không** đổi — đó là cả ý nghĩa của W1.

### Bước 4 — Sửa mock specifier `export-html-template.test.ts:32`

NẾU sai, probe biên dịch với một specifier không còn phân giải. `:26` tuỳ chọn. **TUYỆT ĐỐI KHÔNG đụng `:143`.**

### Bước 5 — Giữ literal ACP

`acp-agent.test.ts:1140` giữ `_omp/sessions/listAll`, chuyển thành hằng số cục bộ. `:1144` là case ÂM — `extMethod("omp/sessions/listAll")` không có tiền tố và PHẢI bị từ chối — để nguyên.
Nguồn: `packages/coding-agent/src/modes/acp/acp-agent.ts:1135` `case "_omp/sessions/listAll": {`, `:1144` `case "_omp/projects/list": {`, `:1172` `case "_omp/chats/byCwd": {`, `:1180` `case "_omp/usage": {`, `:1189` `case "_omp/extensions": {`, `:1196` `case "_omp/extensions/toggle": {` — **6 case, tất cả literal cứng, không dẫn xuất từ `APP_NAME`.** Tổng cộng 6 literal wire ACP, không phải 7 (xem mục sai ở §7).

### Bước 6 — `warp-events.test.ts:111` → `WIRE_NAME`

Khớp `packages/coding-agent/src/modes/warp-events.ts:60` `agent: "omp",`. Pin literal của nhóm wire nằm ở `brand-constants.test.ts`.

### Bước 7 — `worker-host.test.ts:25,:26`

`:24` GIỮ NGUYÊN VĂN. Chạy `bun test packages/utils/test/worker-host.test.ts` → phải in `4 pass` / `0 fail`. **Đã đo: `4 pass / 0 fail`.**

### Bước 8 — Bốn file selector thật

`worker-selector.test.ts`, `executable-fallback.test.ts`, `eval/process-entry-import.test.ts`, `fixtures/computer-worker-cli-selector.ts`.
**Số dòng THẬT** (đặc tả lệch 1 dòng ở cả worker-selector):
- `worker-selector.test.ts` — `js_eval_process` tại `:65, :86, :135, :188`; `does_not_exist` tại `:23, :26, :40`; comment tại `:6`.
- `executable-fallback.test.ts` — `:35,:36,:59,:60,:83,:84,:139,:140` (đúng với đặc tả).
- `eval/process-entry-import.test.ts` — `:33` (đúng).
- `fixtures/computer-worker-cli-selector.ts` — `:3` (đúng).
Hậu tố `does_not_exist` PHẢI giữ nguyên.

### Bước 9 — `eval/worker-core.test.ts`: KHÔNG đổi giá trị

File dài 584 dòng. 24 lượt `__omp_worker_` trên **16 dòng**: `:105, :115, :154, :155, :172, :182, :241, :242, :257, :275, :309, :310, :349, :364, :410, :411`. Tất cả là `__omp_worker_core_gate` / `__omp_worker_cwd_gate` — globalThis instrument. Thêm MỘT dòng comment. Bước này loại 24/48 lượt 'selector' khỏi ngân sách.

### Bước 10 — Ba lượt doc comment

`issue-1606-repro.test.ts:11`, `issue-3031-repro.test.ts:13`, `issue-7352-repro.test.ts:6` — cả ba đúng dòng. Ghi `disposition.tsv` với `reason=comment-only`.

### Bước 11 — 60 file / 195 lượt `.omp`, KHÔNG được sed

Với từng lượt, phân loại vào đúng một trong ba tập:
- (i) config root của app dưới test → `CONFIG_DIR_NAME` hoặc candidate list hai root của W4;
- (ii) đường dẫn LEGACY được seed để chứng minh dual-read → **GIỮ LITERAL**, thêm comment nói rõ đây là legacy;
- (iii) tên trong chuỗi không phải đường dẫn → giữ hoặc đổi tuỳ ngữ nghĩa.

Ví dụ thật đã đọc — `packages/utils/test/logger-contract.test.ts`:
- `:52` `PI_CONFIG_DIR: ".omp",` → tập (i)
- `:182` `const defaultLogsDir = path.join(result.primaryDir, ".omp", "logs");` → tập (i)

### Bước 11b — 57 file còn lại (199 lượt `"omp"` + 12 lượt `"oh-my-pi"`)

Phân bố `"omp"` đã đối chiếu, **tất cả khớp đặc tả**:
`test/update-cli.test.ts` 26 · `test/tools/browser-relay-bridge.test.ts` 20 · `test/hindsight-backend.test.ts` 12 · `utils/test/profiles.test.ts` 10 · `metaharness/test/manager.test.ts` 10 · `test/hindsight-mental-models.test.ts` 10 · `tui/test/desktop-notify.test.ts` 9.

Phân bố `"oh-my-pi"` (12 lượt / 5 file), **cũng khớp**:
`tools/web-scrapers/git-hosting.test.ts` 4 (`:152,:160,:192,:201`) · `ai/test/zai-oauth.test.ts` 3 (`:109,:437,:444`) · `ai/test/cursor-exec-modern.test.ts` 3 (`:280,:1450,:1458`) · `tools/web-search-exa.test.ts` 1 · `oauth-flow.test.ts` 1.
*(Đặc tả ghi `cursor-exec-modern.test.ts:280,1474,1482` và `web-search-exa.test.ts:608` — sai. X-exa-source thật ở `packages/coding-agent/test/tools/web-search-exa.test.ts:577` `expect(headers?.get("x-exa-source")).toBe("oh-my-pi");`. Hai file `acp-initialize-conformance.test.ts` và `acp-lazy-startup.test.ts` mà đặc tả liệt kê không còn chứa `"oh-my-pi"`.)*

Ba literal wire bên thứ ba phải GIỔ:
- `packages/coding-agent/test/oauth-flow.test.ts:81` `expect((registrationPayload as { client_name?: string } | null)?.client_name).toBe("oh-my-pi");`
- `packages/coding-agent/test/tools/web-search-exa.test.ts:577` header `x-exa-source`
- `packages/ai/test/cursor-exec-modern.test.ts:280,1450,1458` repo `can1357/oh-my-pi`

### Bước 12 — Viết detector `scripts/ci-rename-test-literals.ts` (file mới)

Quét `packages/*/test/**`; khớp sáu mẫu; đối chiếu **TỪNG** hit (file + line) với `scripts/rename/disposition.tsv`; exit 1 + in danh sách hit không disposition; exit 0 khi sạch. Chạy nó để chứng minh nó đỏ được.
Cảnh báo khi implement: `packages/ai/test/fixtures/harmony-leak-corpus.json` chứa chuỗi `can1357/oh-my-pi` rất dài trong `argJson` — detector phải bỏ qua fixture JSON, nếu không sẽ có hàng dài 1 KB trong `disposition.tsv`.

### Bước 13 — KHÔNG sửa `python/omp-rpc/tests/test_client.py:1044,1061`

Đã đọc:
- `:1044` `executable="omp",`
- `:1061` `"omp",`
`scripts/ci-test-ts.ts:109-110` xác nhận `// Packages the CI buckets deliberately skip but a local full run should still cover. robomp-web lives under python/robomp and is outside every CI TS bucket.` + `const localOnlyWorkspacePackages = ["python/robomp/web"];` — nên `bun run test:ts` không nhìn thấy `python/**/tests/`. Bắt buộc ghép `bun run test:py` vào cổng.

### Bước 14 — 16 lượt `"omp"` còn lại trong `python/**/tests/`, GIỮ, ghi disposition

Đã đọc từng dòng (lưu ý: `test_sandbox.py` và `test_worker.py` nằm ở **`python/robomp/tests/`**, không phải `python/omp-rpc/tests/`):

- **3 lượt group Unix** — `python/omp-rpc/tests/test_user_group.py:36` `group="omp",` · `:40` `assert call.kwargs["group"] == "omp"` · `python/robomp/tests/test_worker.py:465` `assert client_kwargs["extra_groups"] == ["omp"]` → `reason=keep` (do_not_rename §3.4).
- **6 lượt layout sandbox `.omp-xdg`** — `python/robomp/tests/test_sandbox.py:1072, :1074, :1076` (`ws_root / ".omp-xdg" / "data" | "state" | "cache" / "omp"`) và `:1106, :1108, :1110` (`ws.root / …`) → `reason=keep`.
- **4 lượt `(…/"omp").is_dir()` XDG** — `test_sandbox.py:760` `assert (base / "omp").is_dir()` · `:829` (như trên) · `test_worker.py:345` `assert (path / "omp").is_dir()` · `:387` `assert (base / "omp").is_dir()` → `reason=keep` (do_not_rename §3.3).
- **3 lượt `executable="omp"`** — `test_user_group.py:26, :34, :45` → `reason=defer-W13p` (KHÔNG ghi `keep`; W13' sở hữu).

Tổng: 3 + 6 + 4 + 3 = **16**, cộng `test_client.py` 2 lượt của W13' = 18. Đã đo `git grep -cF '"omp"' -- 'python/**/tests/**'`:
```
python/omp-rpc/tests/test_client.py:2
python/omp-rpc/tests/test_user_group.py:5
python/robomp/tests/test_sandbox.py:8
python/robomp/tests/test_worker.py:3
```

---

## 4. Hợp đồng test

1. **`packages/utils/test/brand-constants.test.ts`** (mới) — tên hiển thị và tên tệp/cấu hình là hai thứ khác nhau. Hồi quy: nếu W1/W3 lỡ đặt `WIRE_NAME` bằng tên mới, pin đỏ và cả Warp terminal / ACP client / DAP adapter / Hindsight bank đổi danh tính cùng lúc mà **không lỗi nào được ném ra**.
2. **`packages/utils/test/worker-host.test.ts:24`** — tiền tố selector còn được nhận. Hồi quy: đổi tiền tố mà quên một selector ⇒ `isWorkerHostSelector` trả false ⇒ worker im lặng không chạy.
3. **`packages/coding-agent/test/worker-selector.test.ts`** — selector lạ bị từ chối với exit code khác 0. Hồi quy: selector gõ sai trông giống sức khoẻ.
4. **`packages/coding-agent/test/acp-agent.test.ts:1140`** — tên ext method ACP là hợp đồng bên thứ ba. Hồi quy: đổi nó ⇒ app không còn nhận lệnh từ host ACP.
5. **Hai pin đã persist — dùng bản có, KHÔNG tạo file mới:**
   - `export-html-template.test.ts:143` `expect(first).toContain("const THEME_STORAGE_KEY = 'omp-export-theme';");` — nguồn `packages/coding-agent/src/export/html/template.js:4` `const THEME_STORAGE_KEY = 'omp-export-theme';`, đọc/ghi bằng `localStorage`. Hồi quy: **mất theme đã lưu của MỌI người dùng hiện hữu, và không có lỗi nào.**
   - `acp-agent.test.ts:1140` — test thật sự dispatch method nên nó là pin đúng.

Cấm: không khẳng định nào chỉ đọc hằng số rồi so với chính hằng số đó (`expect(PREFIX).toBe(PREFIX)` là tautology). Detector là script Bun đọc file + nạp TSV, KHÔNG phải test — AGENTS.md cấm source-ggrep **bên trong test**, không cấm detector CI. Ranh giới này phải nói thẳng trong PR.

---

## 5. Cổng

Lệnh của đặc tả (`bun run check && bun run test:ts && bun run test:py`) **không phải cổng đỏ được** — `test:ts` cần addon native, `test:py` cần pytest, `check` kéo cả `check:rs` cần cargo. Lệnh đỏ không phân biệt "W11 chưa làm" với "thiếu tiền đề".

### Tầng 1 — chạy được NGAY, đã đo trên `47720fd`

| # | Lệnh | Kết quả đo | Đỏ được? |
| --- | --- | --- | --- |
| 1a | `bun run check:ts` | **exit 0** | ✅ Đỏ được: bắt import hỏng, hằng số chưa tồn tại, `WIRE_NAME` chưa export. **KHÔNG** bắt được hằng số bị đổi SAI GIÁ TRỊ (xem giới hạn bên dưới) |
| 1b | `bun test packages/utils/test/worker-host.test.ts` | **4 pass / 0 fail**, 37 ms | ✅ Đỏ được: pin `:24` ghim `"__omp_worker_"`, đổi giá trị pin ⇒ đỏ |
| 1c | `bun scripts/ci-rename-test-literals.ts` | *(file chưa tồn tại)* | ✅ Đỏ được: lần chạy đầu **exit 1 với 456 hit trên 126 file** |

### Tầng 2 — nghiệm thu thật, cần tiền đề

`bun run test:ts` + `bun run test:py` phải cùng chạy, kèm canary bắt buộc: script khẳng định run cho ra **số pass > 0** VÀ **không chứa** chữ ký `Failed to load pi_natives native addon` / `No module named pytest`. Đã đo: `python3 -m pytest --version` → `No module named pytest`, nên `test:py` hiện đỏ vì môi trường.

### Đính chính môi trường — đặc tả đã cũ, và nó ĐẢO chiều một quyết định

Đặc tả nói addon chưa build nên `worker-selector.test.ts` "0 pass/1 fail/1 error" và nên nâng nó lên tầng 2. **Đo lại trên `47720fd`:**

```
bun test packages/coding-agent/test/worker-selector.test.ts   → 7 pass / 0 fail
bun test packages/utils/test/logger-contract.test.ts          → 12 pass / 0 fail
bun test packages/omptype/test/ark/arrays/array.test.ts       → 2 pass   (đặc tả ghi 24)
```

Hệ quả: (1) `worker-selector.test.ts` **chạy được và xanh ngay** — nâng nó thành **tầng 1**, đây là cổng mạnh nhất của W11 vì nó bảo vệ W9. (2) Câu "chỉ `worker-host.test.ts` chạy được" trong đặc tả **sai** — có ít nhất 3/69 file chạy được. (3) Cổng 1b không còn là cổng selector duy nhất.

### Trả lời thẳng câu hỏi quan trọng nhất: cổng này có ĐỎ ĐƯỢC không?

**CỌNG 1c — CÓ, tuyệt đối.** Nó đỏ ngay lần chạy đầu (456 hit), đỏ mỗi khi có literal tên cũ mới xuất hiện trong test mà không có hàng disposition. Nó không cần addon, không cần pytest, chạy trong <1s.

**NHƯNG cổng 1c KHÔNG bắt được đúng thứ W11 sinh ra để chặn.** Nó chỉ hỏi "hit này có được giải thích không", **không** hỏi "lý do có đúng không". Nếu bạn ghi `reason=dual-read-legacy` cho một lượt thật ra là config root, detector vẫn xanh và test dual-read của W4 vẫn bị viết thành 'root mới tồn tại'. **Không có cổng tự động nào bắt được lỗi đó** — nó cần người đọc `reason`.

**Cổng 1a KHÔNG đỏ được với lỗi chính của W11.** `tsgo` kiểm tra kiểu, không kiểm tra giá trị hằng số. `APP_NAME = "ten-sai"` vẫn typecheck sạch. Vậy nên **cổng duy nhất** bảo vệ giá trị là pin literal ở `brand-constants.test.ts`, và cổng đó chỉ bảo vệ được trong lúc chuyển đổi (pha b của bước 3) — sau khi pin được cập nhật sang tên mới, nó xanh trở lại, đúng như nó phải.

**Sửa lại cổng cho đỏ được thật** — thêm một canary value, thay vì tin `check:ts`:

```bash
# Cổng 1d — CANARY GIÁ TRỊ: chạy SAU khi mọi thay đổi, TRƯỚC khi commit.
# Chỉ liệt kê W1 + W6a, tức những giá trị PHẢI giữ nguyên qua M5.
node -e '
const fs = require("fs");
const d = fs.readFileSync("packages/utils/src/dirs.ts", "utf8");
const bad = [];
// WIRE_NAME chưa tồn tại trước W1 — chỉ kiểm khi đã có.
if (/export const WIRE_NAME: string = "(?!omp")/.test(d)) bad.push("WIRE_NAME đã đổi khỏi \"omp\"");
// CONFIG_DIR_NAME home-root
if (!/export const CONFIG_DIR_NAME: string = "\.omp"/.test(d) && !process.env.ALLOW_CONFIG_RENAME) bad.push("CONFIG_DIR_NAME đổi khỏi \".omp\"");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
'
```
Nếu không muốn thêm canary ngoài repo: **bắt buộc** review thủ công diff của `packages/utils/src/dirs.ts` và của `src/dap/session.ts:1465-1466`, `src/blob-broker/uploaders-legacy.ts:236`, `src/modes/warp-events.ts:60`, `src/modes/acp/acp-agent.ts:657`, `src/hindsight/bank.ts:29` — 5 site W1 đã xác minh đúng dòng.

**Tiêu chí nghiệm thu duy nhất** (đặc tả đã nói, giữ nguyên): `bun scripts/ci-rename-test-literals.ts` exit 0 **VÀ** cả 3 lệnh tầng 1 xanh **VÀ** một người duy nhất review toàn bộ diff.

---

## 6. Cạm bẫy riêng của work item này

**Cạm bẫy 1 — tin số dòng của đặc tả, rồi `sed` theo.** `worker-selector.test.ts` lệch **đúng 1 dòng ở cả 8 neo**. Đặc tả bảo sửa `:66`; `:66` thật là `cwd: path.resolve(__dirname, "../../.."),` — dòng `:65` mới là `cmd:`. `sed -i '' '66s/__omp_worker_js_eval_process/${WORKER_HOST_SELECTOR_PREFIX}js_eval_process/'` sẽ **không hỏng** (không có match) hoặc hỏng nếu bạn viết `c\`. Trước mỗi lệnh sửa hàng loạt, chạy `awk 'NR==<n> {print NR": "$0}' <file>` và ĐỌC kết quả.

**Cạm bẫy 2 — tin `acp-agent.ts:656` là `name: "oh-my-pi"`.** Nó **không phải**. `:656` là `name: "omp",`, `:657` là `title: "omp",`. Không có chuỗi `"oh-my-pi"` nào trong `acp-agent.ts` (chỉ có import path). Hậu quả nếu tin: bạn sẽ nghĩ `name` đã được W1 giao và sửa nó theo — nhưng W1 **chỉ** phủ `title` ở `:657`. Sửa `name` là đổi wire ACP không được W1 cho phép, và không có test nào bắt.

**Cạm bẫy 3 — thay literal bằng hằng số hàng loạt.** Bộ test đọc hằng số sẽ XANH với một hằng số bị đổi sai — tệ hơn chính bộ test hardcode mà nó thay thế, vì còn mang lại cảm giác an toàn giả. Đặc biệt nguy hiểm với selector: `WORKER_HOST_SELECTOR_PREFIX` chỉ được `packages/utils/src/worker-host.ts:4` dùng, còn `cli.ts:182-189` vẫn ghi **8 literal hardcode** (`TINY_WORKER_ARG`, `STATS_SYNC_WORKER_ARG`, …). Test dựng `${WORKER_HOST_SELECTOR_PREFIX}js_eval_process` sẽ xanh dù `cli.ts:186` đã trôi. 8 hằng số đó KHÔNG được export — không có cách nào test tự bảo vệ; đó là giới hạn thật, ghi vào disposition.

**Cạm bẫy 4 — xoá HẾT `.omp` cho sạch.** Phá test dual-read của W4 và xoá tấm chắn chống việc ai đó đổi tên group Unix `omp` trên máy người dùng.

**Cạm bẫy 5 — chạy pass "đọc hằng số" lên `python/**/tests/`.** Xoá 16/18 lượt phải giữ. Nhớ `test_sandbox.py` / `test_worker.py` ở `python/robomp/tests/`, không phải `python/omp-rpc/tests/`.

**Cạm bẫy 6 — tin `bun run test:ts` là cổng nghiệm thu mà không build addon.** Ở `47720fd` addon ĐÃ build (commit `47720fd` ghi rõ), nên "đỏ vì thiếu addon" là chuyện quá khứ. Đỏ hôm nay là tín hiệu thật — nhưng `test:py` vẫn đỏ vì thiếu pytest, nên một lần đỏ của `test:py` **không mang thông tin cho W11**.

---

## 7. Điểm trong đặc tả SAI so với cây thật (ghi ra, không sửa trong tài liệu)

| Claim trong đặc tả | Thật | Nguồn kiểm chứng |
| --- | --- | --- |
| baseline 217/200/54/14, 128 file, 487 hit | 195/199/48/12, 126 file, 456 hit | §3 bước 0 |
| `worker-selector.test.ts` neo `:66,:87,:136,:189` / `:24,:27,:41` / `:7` | lệch **+1** toàn bộ: `:65,:86,:135,:188` / `:23,:26,:40` / `:6` | `awk` trên file |
| `worker-core.test.ts` "20 lượt" tại 20 dòng `:105…:461` | **24 lượt / 16 dòng**: `:105,115,154,155,172,182,241,242,257,275,309,310,349,364,410,411` | `grep -n` |
| `acp-agent.ts:656` là `name: "oh-my-pi"` (3 chỗ) | `:656` là `name: "omp",`; **không có** `"oh-my-pi"` trong file. Tổng literal wire ACP = 6, không phải 7 | `awk 'NR>=650&&NR<=662'`; `grep -n oh-my-pi` |
| `profile-cli.test.ts` dùng APP_NAME ở `:154,:179,:205` | chỉ `:144` (import ở `:9`) | `grep -n APP_NAME` |
| `package.json:135` = `test:py` | `:131` | `grep -n '"test:py"'` |
| `package.json:91` = `test:scripts` | `:87` | `grep -n '"test:scripts"'` |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13809` bằng chứng `name: "oh-my-pi"` | dòng 13809 **trống**; 13810 là "Sáu mục thêm 2026-09-29 (GAP-M4-10..15)" | `awk 'NR>=13805&&NR<=13815'` |
| `logger-contract.test.ts:354` | file chỉ **337 dòng**; `.omp` ở `:52` và `:182` | `wc -l`, `grep -nF` |
| `cursor-exec-modern.test.ts:280,1474,1482` | `:280, :1450, :1458` | `grep -n` |
| `web-search-exa.test.ts:608` là `x-exa-source` | `:577`; `:608` là `{ status: 200, headers: { "Content-Type": … } }` | `awk`, `grep -n x-exa-source` |
| `test_sandbox.py` / `test_worker.py` trong `python/omp-rpc/tests/` | ở **`python/robomp/tests/`** | `git grep -lF '"omp"'` |
| `"oh-my-pi"` ở `acp-initialize-conformance.test.ts` và `acp-lazy-startup.test.ts` | hai file này **không còn** chứa `"oh-my-pi"` | `git grep -lF` |
| `blob-broker/uploaders-legacy.ts:236` (đường dẫn ngầm có `collab/`) | `packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236` | `awk` — nội dung đúng, đường dẫn thiếu `collab/` |
| addon chưa build ⇒ `worker-selector.test.ts` 0 pass/1 fail | **7 pass / 0 fail** | `bun test` |
| `logger-contract.test.ts` đỏ vì addon | **12 pass / 0 fail** | `bun test` |
| `omptype/.../array.test.ts` 24 pass | **2 pass** | `bun test` |
| "`worker-host.test.ts` là file DUY NHẤT trong 70 chạy được" | sai — ít nhất 3/69 chạy được | `bun test` × 3 |
| `scripts/rename/` chưa tồn tại | **đúng** — vẫn chưa tồn tại | `ls scripts/rename` |
| `scripts/ci-rename-test-literals.ts` chưa tồn tại | **đúng** | `ls` |
| `packages/utils/test/brand-constants.test.ts` chưa tồn tại | **đúng** | `ls` |
| 6 case `case "_omp/…":` ở `:1135,:1144,:1172,:1180,:1189,:1196` | **đúng** | `git grep -n '_omp/'` |
| 5 site wire W1: `dap/session.ts:1465-1466`, `warp-events.ts:60`, `acp-agent.ts:657`, `hindsight/bank.ts:29` | **đúng** | `awk` |
| `blob-broker/uploaders-legacy.ts:236` | **đúng** | `awk` |
| `WIRE_NAME` chưa tồn tại trong source | **đúng** — chỉ xuất hiện trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | `git grep -n WIRE_NAME` |
| `scripts/ci-test-ts.ts:109-110` | **đúng** | `awk` |
| 18 lượt `"omp"` trong `python/**/tests/` (2/5/8/3) | **đúng về số**, sai về thư mục (xem trên) | `git grep -cF` |
| `comm -12` hai tập = 0 | **đúng** | `comm -12 … \| wc -l` |
| 9 file có `__omp_worker_`; 4 file có `APP_NAME` | **đúng** | `git grep -l` |
| `before-compaction.jsonl` 2.3 MB, 26 lượt APP_NAME | **đúng** | `ls -la`, `grep -c` |
| `oauth-flow.test.ts:81` | **đúng** | `awk` |
| Phân bố `"omp"` 7 file trong 11b | **đúng hết** (26/20/12/10/10/10/9) | `git grep -cF` |
| Phân bố `"oh-my-pi"` 5 file | **đúng về số lượt** (4/3/3/1/1), sai 2/5 về dòng | `git grep -cF` |
| `python3 -m pytest --version` → No module named pytest | **đúng** | chạy thật |
