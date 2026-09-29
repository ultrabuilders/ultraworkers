# PHIẾU TRIỂN KHAI — W9: Tên binary và bề mặt selector

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md` dòng 2854–3326 · **Sóng:** 4 · **Effort:** M
**Tên mới đã chốt:** `ultraworkers` (tiêu đề M5, dòng 1: "REBRAND THÀNH `ultraworkers`").
→ `APP_NAME` = `"ultraworkers"`, `WORKER_HOST_SELECTOR_PREFIX` = `"__ultraworkers_worker_"`, bin = `ultraworkers`.

**Nguyên tắc đọc phiếu này:** mọi dòng `TRƯỚC` trong bảng bên dưới được trích từ file thật ở
`HEAD` (`milestone-1`, `47720fd`). Không có trích dẫn nào từ trí nhớ. Mục 7 liệt kê **mọi neo
hỏng** đã phát hiện, kèm vị trí đúng.

---

## 1. Cái gì thay đổi, quan sát được

Sau W9, lệnh cài vào PATH tên `ultraworkers` thay cho `omp`, và cả **16** selector worker được
dựng từ **một** hằng số tiền tố duy nhất nên không còn chỗ nào ghim lại thương hiệu cũ — nếu một
selector bị bỏ sót, `isWorkerHostSelector()` trả `false`, CLI in `Error: unknown worker selector`
rồi `exit 1`, thay vì im lặng không khởi động worker.

---

## 2. Bảng điểm sửa

`TRƯỚC` = nguyên văn từ file thật. `SAU` = hình dạng sau khi sửa.

### 2.1 Nguồn duy nhất của tiền tố

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/utils/src/worker-host.ts:4` | `WORKER_HOST_SELECTOR_PREFIX` | `export const WORKER_HOST_SELECTOR_PREFIX = "__omp_worker_";` | `export const WORKER_HOST_SELECTOR_PREFIX = "__ultraworkers_worker_";` |

`:7-9` `isWorkerHostSelector()` **không đụng tới** — nó đọc hằng số, nên tự theo.

### 2.2 Tám hằng selector (dựng từ tiền tố)

`packages/coding-agent/src/cli/worker-selectors.ts` — thêm 1 dòng import ở đầu, rồi 8 dòng:

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `:9` | `BLOB_BROKER_WORKER_ARG` | `export const BLOB_BROKER_WORKER_ARG = "__omp_worker_blob_broker";` | ``export const BLOB_BROKER_WORKER_ARG = `${WORKER_HOST_SELECTOR_PREFIX}blob_broker`;`` |
| `:11` | `COMPUTER_WORKER_ARG` | `... = "__omp_worker_computer";` | ``... = `${WORKER_HOST_SELECTOR_PREFIX}computer`;`` |
| `:13` | `DAEMON_BROKER_WORKER_ARG` | `... = "__omp_worker_daemon_broker";` | ``... = `${WORKER_HOST_SELECTOR_PREFIX}daemon_broker`;`` |
| `:15` | `IDA_HOST_WORKER_ARG` | `... = "__omp_worker_ida_host";` | ``... = `${WORKER_HOST_SELECTOR_PREFIX}ida_host`;`` |
| `:17` | `LSP_MUX_WORKER_ARG` | `... = "__omp_worker_lsp_mux";` | ``... = `${WORKER_HOST_SELECTOR_PREFIX}lsp_mux`;`` |
| `:19` | `STATS_ACTIVITY_WORKER_ARG` | `... = "__omp_worker_stats_activity";` | ``... = `${WORKER_HOST_SELECTOR_PREFIX}stats_activity`;`` |
| `:21` | `TEXT_PREDICT_WORKER_ARG` | `... = "__omp_worker_text_predict";` | ``... = `${WORKER_HOST_SELECTOR_PREFIX}text_predict`;`` |
| `:23` | `TERMINAL_OUTPUT_WORKER_ARG` | `... = "__omp_worker_terminal_output";` | ``... = `${WORKER_HOST_SELECTOR_PREFIX}terminal_output`;`` |

> **`TEXT_PREDICT` ở `:21`, `TERMINAL_OUTPUT` ở `:23`.** Mục "Cần người xác nhận" của đặc tả nói hai
> khối code mâu thuẫn về chỗ này. **Đo đã giải quyết: `:21` là TEXT_PREDICT, `:23` là
> TERMINAL_OUTPUT** — khối "Hình dạng code" đúng, bảng "File cần chạm tới" ghi chéo.

### 2.3 `cli.ts` — xoá 5 khai báo trùng, dựng 3 hằng còn lại

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli.ts:31` | import | `import { declareWorkerHostEntry, installWorkerInbox, isWorkerHostSelector } from "@oh-my-pi/pi-utils/worker-host";` | thêm `WORKER_HOST_SELECTOR_PREFIX` vào **cùng** import (không tạo import thứ hai) |
| `packages/coding-agent/src/cli.ts:182` | `TINY_WORKER_ARG` | `const TINY_WORKER_ARG = "__omp_worker_tiny_inference";` | **xoá**; thêm `import { TINY_WORKER_ARG } from "./tiny/title-protocol";` |
| `packages/coding-agent/src/cli.ts:183` | `STATS_SYNC_WORKER_ARG` | `const STATS_SYNC_WORKER_ARG = "__omp_worker_stats_sync";` | ``const STATS_SYNC_WORKER_ARG = `${WORKER_HOST_SELECTOR_PREFIX}stats_sync`;`` |
| `packages/coding-agent/src/cli.ts:184` | `TAB_WORKER_ARG` | `const TAB_WORKER_ARG = "__omp_worker_tab";` | ``const TAB_WORKER_ARG = `${WORKER_HOST_SELECTOR_PREFIX}tab`;`` |
| `packages/coding-agent/src/cli.ts:185` | `JS_EVAL_WORKER_ARG` | `const JS_EVAL_WORKER_ARG = "__omp_worker_js_eval";` | ``const JS_EVAL_WORKER_ARG = `${WORKER_HOST_SELECTOR_PREFIX}js_eval`;`` |
| `packages/coding-agent/src/cli.ts:186` | `JS_EVAL_PROCESS_ARG` | `const JS_EVAL_PROCESS_ARG = "__omp_worker_js_eval_process";` | **xoá**; `import { JS_EVAL_PROCESS_ARG } from "./eval/js/context-manager";` — **PHẢI export trước** (xem 2.4) |
| `packages/coding-agent/src/cli.ts:187` | `STT_WORKER_ARG` | `const STT_WORKER_ARG = "__omp_worker_stt";` | **xoá**; `import { STT_WORKER_ARG } from "./stt/asr-client";` |
| `packages/coding-agent/src/cli.ts:188` | `TTS_WORKER_ARG` | `const TTS_WORKER_ARG = "__omp_worker_tts";` | **xoá**; `import { TTS_WORKER_ARG } from "./tts/tts-client";` |
| `packages/coding-agent/src/cli.ts:189` | `MNEMOPI_EMBED_WORKER_ARG` | `const MNEMOPI_EMBED_WORKER_ARG = "__omp_worker_mnemopi_embed";` | **xoá**; `import { MNEMOPI_EMBED_WORKER_ARG } from "./mnemopi/embed-client";` |

`runWorkerEntrypoint()` (`:191`–`:~305`) **không sửa một nhánh `if` nào** — đã đếm: đúng **16**
nhánh `if (arg === …)`, dùng đủ 16 tên qua scope. Xoá 5 dòng trên là an toàn về mặt phân giải tên.

### 2.4 Năm bản trùng ở file khác — bỏ khai báo, dùng chung

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/stt/asr-client.ts:72` | `STT_WORKER_ARG` | `export const STT_WORKER_ARG = "__omp_worker_stt";` | xoá dòng; thêm `export { STT_WORKER_ARG } from "../cli/worker-selectors";` (dùng ở `:80`) |
| `packages/coding-agent/src/tts/tts-client.ts:135` | `TTS_WORKER_ARG` | `export const TTS_WORKER_ARG = "__omp_worker_tts";` | xoá; re-export như trên |
| `packages/coding-agent/src/mnemopi/embed-client.ts:38` | `MNEMOPI_EMBED_WORKER_ARG` | `export const MNEMOPI_EMBED_WORKER_ARG = "__omp_worker_mnemopi_embed";` | xoá; re-export như trên |
| `packages/coding-agent/src/tiny/title-protocol.ts:20` | `TINY_WORKER_ARG` | `export const TINY_WORKER_ARG = "__omp_worker_tiny_inference";` | xoá; re-export như trên |
| `packages/coding-agent/src/eval/js/context-manager.ts:130` | `JS_EVAL_PROCESS_ARG` | `const JS_EVAL_PROCESS_ARG = "__omp_worker_js_eval_process";` | ``export const JS_EVAL_PROCESS_ARG = `${WORKER_HOST_SELECTOR_PREFIX}js_eval_process`;`` (dùng ở `:1023`) |

> **Sửa lỗi trong đặc tả:** bước 4 của đặc tả bảo import `JS_EVAL_PROCESS_ARG` từ
> `context-manager`, nhưng khối "Hình dạng code" lại bảo **KHÔNG** import vì nó là `const` trần.
> **Đo thật: nó là `const` trần, không có `export`.** Cả hai câu đều đúng về hiện trạng, nhưng
> không thể cùng đúng. Khối code đúng về **kết quả mong muốn** (một nguồn duy nhất) nhưng sai về
> **cơ chế** (nó không cho phép xoá bản trùng ở `cli.ts:186`). Cách duy nhất thoát mâu thuẫn:
> **thêm `export`** vào `context-manager.ts:130` rồi import từ đó. Đây cũng là thứ khối code tự
> mâu thuẫn khi nó vừa dựng `JS_EVAL_PROCESS_ARG` bằng tay ở test vừa nói không có bề mặt export.

### 2.5 Ba literal thô (nơi hỏng im lặng)

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/eval/js/context-manager.ts:1010` | `spawnBunWorker` | `? new Worker(hostEntry, { type: "module", argv: ["__omp_worker_js_eval"] })` | `? new Worker(hostEntry, { type: "module", argv: [JS_EVAL_WORKER_ARG] })` |
| `packages/coding-agent/src/tools/browser/tab-supervisor.ts:1615` | `spawnTabWorker` | `? new Worker(hostEntry, { type: "module", argv: ["__omp_worker_tab"] })` | `? new Worker(hostEntry, { type: "module", argv: [TAB_WORKER_ARG] })` |
| `packages/stats/src/aggregator.ts:142` | `createSyncWorker` | `return new Worker(hostEntry, { type: "module", argv: ["__omp_worker_stats_sync"] });` | ``return new Worker(hostEntry, { type: "module", argv: [`${WORKER_HOST_SELECTOR_PREFIX}stats_sync`] });`` |

**Chỗ lấy hằng số cho hai dòng đầu — đặc tả bỏ trống, đây là câu trả lời:**
`cli.ts:184` (`TAB_WORKER_ARG`) và `cli.ts:185` (`JS_EVAL_WORKER_ARG`) là `const` trần **không
export**, nên `tab-supervisor.ts` và `context-manager.ts` không lấy được từ `cli.ts` mà không tạo
vòng import (xem mục 6). Lời giải đúng: **chuyển cả ba** `TAB_WORKER_ARG`,
`JS_EVAL_WORKER_ARG`, `STATS_SYNC_WORKER_ARG` **vào `cli/worker-selectors.ts`** và export chúng
từ đó. Đã kiểm vòng import: `cli/worker-selectors.ts` chỉ import
`@oh-my-pi/pi-utils/worker-host` — nó là module lá, nên `tab-supervisor.ts` và
`context-manager.ts` import nó được mà không sinh vòng.

Dòng thứ ba: `packages/stats` **không được** import từ `pi-coding-agent` — docblock
`aggregator.ts:132-138` nói rõ "keeps zero runtime dependency on `@oh-my-pi/pi-coding-agent`".
Dựng từ `WORKER_HOST_SELECTOR_PREFIX` import từ `@oh-my-pi/pi-utils/worker-host`, đúng như
`workerHostEntry` đã được import ở `aggregator.ts:3`.

### 2.6 Ba khai báo bin + fallback PATH

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `scripts/ci-release-publish.ts:186` | `publishBin` | `publishBin: { omp: "dist/cli.js" },` | `publishBin: { ultraworkers: "dist/cli.js" },` |
| `packages/coding-agent/package.json:28` | `bin` | `"omp": "src/cli.ts"` | `"ultraworkers": "src/cli.ts"` |
| `packages/coding-agent/src/task/omp-command.ts:11` | `DEFAULT_CMD` | `const DEFAULT_CMD = process.platform === "win32" ? "omp.cmd" : "omp";` | ``const DEFAULT_CMD = process.platform === "win32" ? `${APP_NAME}.cmd` : APP_NAME;`` + thêm `import { APP_NAME } from "@oh-my-pi/pi-utils";` |
| `packages/coding-agent/src/subprocess/worker-client.ts:131` | `resolveExecutablePath` | `$which("omp", { requireAbsolutePaths: true, cache: WhichCachePolicy.Bypass }),` | `$which(APP_NAME, { requireAbsolutePaths: true, cache: WhichCachePolicy.Bypass }),` |

`omp-command.ts:15` `const envCmd = $env.PI_SUBPROCESS_CMD;` — **GIỮ NGUYÊN** (N16 đóng băng họ tiền tố `PI_*`).
`resolveWorkerSpawnCmd` (`worker-client.ts:169-178`) chỉ chuyển tiếp chuỗi, không sửa.

**Không đổi (đã đọc, đã ghi nhận):**
- `packages/coding-agent/package.json:13` `"homepage": "https://omp.sh"` (N9 chặn tới khi có domain)
- `packages/coding-agent/package.json:538` `"@oh-my-pi/omp-stats": "catalog:"` (N17 giữ basename, W7 đổi scope)
- `scripts/ci-release-publish.ts:438` `path.join(os.tmpdir(), "omp-pack-")` — thư mục tạm
- `subprocess/worker-client.ts:203` (comment `~/.omp/agent/cache` — `CONFIG_DIR_NAME`, W6 mới lật), `:384` (`"omp-worker-stderr-"` — thư mục tạm), `:548` (comment `--smoke-test`)
- `crates/pi-natives/src/utok/claude/testdata/fixtures.json` — 5 lượt, tất cả nằm trong trường `"text"` của snapshot tokenizer. **KHÔNG sed.** Đổi nội dung là đổi điều kiện thử của tokenizer, không phải đổi sản phẩm.

### 2.7 `profile-alias.ts` — tách hai lớp

File này có **13** token `omp` đứng riêng (đo: `rg -o '(^|[^a-zA-Z])omp([^a-zA-Z]|$)'` → 13), nằm trên 9 dòng.

**Lớp A — ĐỔI:**

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `:30-33` | `DEFAULT_ALIAS_COMMAND` | `display: "omp",` / `posix: "omp",` / `fish: "omp",` / `powerShell: "omp",` | cả 4 → `APP_NAME` |
| `:157-158` | chốt chặn shadow | `if (normalized.toLowerCase() === "omp") {`<br>`throw new Error('Invalid alias "omp". Refusing to shadow the base omp command.');` | **CẦN NHÁNH THỨ HAI**: `const base = APP_NAME.toLowerCase();`<br>`if (normalized.toLowerCase() === base \|\| normalized.toLowerCase() === "omp") {`<br>`` throw new Error(`Invalid alias "${aliasName}". Refusing to shadow the base ${APP_NAME} command.`); `` |
| `:292` | fish function | `` `function ${aliasName} --wraps omp --description 'OMP profile ${profile}'` `` | `` `function ${aliasName} --wraps ${APP_NAME} --description '…'` `` |

**Lớp B — ĐÓNG BĂNG (khuyến nghị mặc định):**

| dòng | nội dung | lý do đóng băng |
| --- | --- | --- |
| `:286-287` | `` const start = `# >>> omp profile alias: ${aliasName} >>>`; `` / `` const end = `# <<< omp profile alias: ${aliasName} <<<`; `` | `upsertBlock()` (`:308`) đọc ngược marker này từ file rc của người dùng |
| `:309-310` | cặp `start`/`end` thứ hai, y hệt | như trên |
| `:268` | `return posixJoinUnc(configHome, "fish", "conf.d", "omp-profiles.fish");` | file sinh ra đã nằm trong `conf.d` của máy người dùng |

Đổi marker ⇒ `content.indexOf(start)` trả `-1` ⇒ `upsertBlock` **append** block thứ hai mỗi lần chạy
`--alias`, và block cũ (vẫn gọi `command omp`) không bao giờ bị dọn.

### 2.8 `completion-gen.ts` — KHÔNG cần sửa để đổi tên lệnh

Đo: `rg -o 'omp'` → **109**; `rg -oi 'complet[a-z]*'` → **58**; `rg -o '_omp[a-z_]*' | wc -l` → **29**;
và `rg -o '(^|[^a-zA-Z0-9_])omp([^a-zA-Z0-9_]|$)' | wc -l` → **0**.

Con số **0** là quan trọng nhất: **không có token `omp` đứng riêng nào trong file**. Tên lệnh đến
qua `commands/completions.ts:29` — `const config: CliConfig = { bin: APP_NAME, version: VERSION, commands: map };`.
W3 đã làm xong phần lớn việc của W9 ở đây. 29 token còn lại là **tên hàm shell** trong script sinh
ra (`_omp`, `_omp_root`, `_omp_call`, `_omp_tools`, `_omp_models_list`, `_omp_commands`, `_omp_cmd_*`,
`_omp_comma`, `__fish_omp_no_subcommand`). Đổi hay không là quyết định thẩm mỹ, **không có rủi ro
kỹ thuật** vì fish chỉ dùng chuỗi `-n` làm điều kiện. Nếu đổi, nhớ `completion-gen.ts:447` ghi rõ
quy ước file autoload của zsh tên là `_omp`.

### 2.9 Năm dòng comment mô tả selector (tùy chọn nhưng W9 đã chạm file rồi)

| đường/dẫn | dòng | TRƯỚC |
| --- | --- | --- |
| `packages/coding-agent/src/blob-broker/server.ts` | `:2` | `` * Worker entry for the project-shared blob daemon (`__omp_worker_blob_broker`). `` |
| `packages/coding-agent/src/mnemopi/embed-client.ts` | `:122` | `` * `__omp_worker_mnemopi_embed` child (issue #7352). On expiry the embed fails `` |
| `packages/coding-agent/src/mnemopi/embed-worker.ts` | `:4` | `` * `__omp_worker_mnemopi_embed` selector). The whole point of this module is `` |
| `packages/coding-agent/src/stats/activity-worker.ts` | `:4` | `` * `__omp_worker_stats_activity` selector). Owns the stats DB handle for the `` |
| `packages/coding-agent/src/predict/daemon.ts` | `:3` | `` * `__omp_worker_text_predict`, started through the `text-predict` global broker). `` |

### 2.10 Tài liệu

| đường/dẫn | dòng | việc |
| --- | --- | --- |
| `AGENTS.md` | `:52` | 4 selector `__omp_worker_stats_sync`, `__omp_worker_tab`, `__omp_worker_js_eval`, `__omp_worker_tiny_inference` → tên mới |
| `AGENTS.md` | `:57` | `argv: ["__omp_worker_<name>"]` → tên mới |
| `AGENTS.md` | `:62` | **CÂU SAI, PHẢI SỬA (không phải tuỳ chọn).** Đo thật: `runSmokeTest()` (`cli.ts:136-180`) gọi **14** `await smokeTest*` (dòng 151,152,166,167,168,170,171,172,173,174,175,176,177,178) phủ **13/16** selector trên darwin. Câu hiện tại ghi "spawns the stats sync worker and the tiny-model subprocess" — đây là nguồn gốc của con số "2/15" mà kế hoạch lặp lại. |
| `packages/coding-agent/DEVELOPMENT.md` | `:52` | `` dispatches the hidden `__omp_worker_*` argv selectors `` → tên mới (1 lượt) |
| `docs/tools/ida.md` | `:14` | `` `omp.ida.<id>` daemon (`__omp_worker_ida_host`) `` — **chỉ sửa `__omp_worker_ida_host`**, giữ `omp.ida.<id>` (xem mục 6) |
| `packages/stats/CHANGELOG.md` | `:263` | `- Renamed `__omp_stats_sync_worker` to `__omp_worker_stats_sync`.` — **KHÔNG SỬA**, mục đã phát hành là bất biến |

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

**Bước 0 — Chốt ba quyết định trước khi viết dòng nào.** Ghi vào PR, không sửa file kế hoạch:
(a) `DEFAULT_CMD` ở `omp-command.ts:11` có suy ra từ `APP_NAME` không → **có**, phương án (b);
(b) marker `profile-alias.ts:286-287,309-310` và tên file `:268` đóng băng hay đổi → **đóng băng**;
(c) `omp-stats` (`packages/stats/package.json:30-31`) có thuộc W9 không → **không**, để W10/W12.
*(neo đã kiểm: `packages/coding-agent/src/cli/profile-alias.ts:286`)*

**Bước 1 — Chụp baseline THẬT, đừng tin con số 97.**
```bash
git grep -o '__omp_worker_' -- . ':!*EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l
git grep -l '__omp_worker_' -- . ':!*EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l
git grep -oh '__omp_worker_[a-z_]*' -- . ':!*EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | sort -u | wc -l
```
**Đo được hôm nay: 91 / 28 / 21.** Con số **97** trong đặc tả **KHÔNG tái lập được** vì lệnh ghi
trong đặc tả chỉ loại `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` mà quên chính
`MILESTONE_5_EXECUTION_PLAN.md` — file đó chứa 137 lượt. Chạy đúng lệnh của đặc tả cho **228 / 29 / 22**.
Ghi baseline đo được vào PR.
*(neo đã kiểm: `packages/utils/src/worker-host.ts:4`)*

**Bước 2 — Đổi hằng số nhỏ, KHÔNG đụng test.** Cùng một lần sửa: `worker-host.ts:4`; 8 hằng ở
`worker-selectors.ts:9,11,13,15,17,19,21,23`; 3 hằng còn lại ở `cli.ts:183,184,185`; ba khai báo bin
(`ci-release-publish.ts:186`, `package.json:28`, `omp-command.ts:11`); `worker-client.ts:131`;
`profile-alias.ts:30-33` + `:157-158` + `:292`.
**TUYỆT ĐỐI KHÔNG chạy `sed` toàn repo trên `__omp_worker_`** — nó sẽ bắt `fixtures.json` (5 lượt),
`test/eval/worker-core.test.ts` (24 lượt), `test/executable-fallback.test.ts` (8 lượt) và ba
docblock issue-repro. Đó là 44 lượt không nên đổi.
*(neo đã kiểm: `packages/utils/src/worker-host.ts:4`)*

**Bước 3 — Chuyển 3 hằng spawn-site vào `worker-selectors.ts`, rồi xoá 5 khai báo trùng ở `cli.ts`.**
Thêm vào `worker-selectors.ts` (cùng file 8 hằng trên):
```ts
export const STATS_SYNC_WORKER_ARG = `${WORKER_HOST_SELECTOR_PREFIX}stats_sync`;
export const TAB_WORKER_ARG       = `${WORKER_HOST_SELECTOR_PREFIX}tab`;
export const JS_EVAL_WORKER_ARG   = `${WORKER_HOST_SELECTOR_PREFIX}js_eval`;
```
rồi ở `cli.ts`: xoá `:182,183,184,185,186,187,188,189` (8 dòng) và thay bằng import từ
`./cli/worker-selectors` + 5 import mới (`.tiny/title-protocol`, `.stt/asr-client`,
`.tts/tts-client`, `.mnemopi/embed-client`, `.eval/js/context-manager`).
Ở 5 file kia (2.4): xoá dòng khai báo, thay bằng re-export hoặc template.
Sau bước này: `git grep -c '__omp_worker_' -- packages/coding-agent/src/cli.ts` → **0**.
*(neo đã kiểm: `packages/coding-agent/src/cli.ts:42`)*

**Bước 4 — Xoá ba literal thô.**
(1) `context-manager.ts:1010` → `argv: [JS_EVAL_WORKER_ARG]` (import từ `../cli/worker-selectors`);
(2) `tab-supervisor.ts:1615` → `argv: [TAB_WORKER_ARG]` (import từ `../../cli/worker-selectors`);
(3) `aggregator.ts:142` → `` argv: [`${WORKER_HOST_SELECTOR_PREFIX}stats_sync`] `` (import từ
`@oh-my-pi/pi-utils/worker-host`; **KHÔNG** import từ `cli.ts`).
Điều kiện kết thúc: lệnh ở mục 5 phải trả **0 dòng**.
*(neo đã kiểm: `packages/stats/src/aggregator.ts:142` — xem mục 7, đặc tả ghi `:130`)*

**Bước 5 — Chạy lệnh khép nắp (đây là CỔNG, xem mục 5).**
```bash
git grep -n '__omp_worker_' -- 'packages/**/*.ts' ':!*test*' | grep -v '^\S*: *\*'
```
Hôm nay nó trả **26 dòng** (xem bảng). Sau W9 nó phải trả **0**.
*(neo đã kiểm: `packages/coding-agent/src/tools/browser/tab-supervisor.ts:1615`)*

**Bước 6 — Cập nhật 5 dòng comment (2.9).** Riêng `predict/daemon.ts:3` không có trong kế hoạch cũ.
*(neo đã kiểm: `packages/coding-agent/src/predict/daemon.ts:3`)*

**Bước 7 — Viết ca test parity MỚI, rồi CHỨNG MINH NÓ ĐỎ TRƯỚC.**
Tạo `packages/coding-agent/test/worker-selector-parity.test.ts` (mục 4). Sau khi viết xong:
tạm đổi `WORKER_HOST_SELECTOR_PREFIX` về `"__omp_worker_"`, chạy test → phải **ĐỎ**; đổi lại
`"__ultraworkers_worker_"` → phải **XANH**. Chưa làm bước chứng minh này thì chưa được tính là có test.
*(file chưa tồn tại — xác nhận bằng `ls`: `No such file or directory`)*

**Bước 8 — Cập nhật hai file test đang ghim chữ cũ.**
`packages/utils/test/worker-host.test.ts:24-26` (3 khẳng định) và
`packages/coding-agent/test/profile-alias.test.ts` (47 dòng khớp `omp`). Thêm hai ca chốt chặn alias:
tên đúng tên lệnh mới bị **TỪ CHỐI**, tên gần giống được **CHẤP NHẬN**.
*(neo đã kiểm: `packages/utils/test/worker-host.test.ts:24`)*

**Bước 9 — Ghi danh sách CỐ Ý GIỮ vào PR.** 48 lượt trong 9 file test
(`test/eval/worker-core.test.ts` **24**, `test/worker-selector.test.ts` **8**,
`test/executable-fallback.test.ts` **8**, `test/worker-host.test.ts` **3**,
`test/issue-{7352,3031,1606}-repro.test.ts` 1 mỗi file, `test/fixtures/computer-worker-cli-selector.ts` 1,
`test/eval/process-entry-import.test.ts` 1) + 5 lượt trong `fixtures.json`.
`__omp_worker_does_not_exist` **phải giữ nguyên** — nó CỐ Ý sai; đổi nó thành tên mới biến ca
"unknown selector" thành ca "selector hợp lệ" và làm hỏng đúng thứ nó đang bảo vệ.
*(neo đã kiểm: `packages/coding-agent/test/eval/worker-core.test.ts:105`)*

**Bước 10 — Sửa tài liệu (2.10), gồm câu sai ở `AGENTS.md:62`.**
*(neo đã kiểm: `AGENTS.md:62`)*

**Bước 11 — Chạy cổng (mục 5).** Không thêm mục changelog ở bất kỳ package nào trừ khi được yêu cầu tường minh.

---

## 4. Hợp đồng test

### 4.1 File MỚI: `packages/coding-agent/test/worker-selector-parity.test.ts`

```ts
import { describe, expect, it } from "bun:test";
import { WORKER_HOST_SELECTOR_PREFIX, isWorkerHostSelector } from "@oh-my-pi/pi-utils/worker-host";
import * as selectors from "../src/cli/worker-selectors";
import { STT_WORKER_ARG } from "../src/stt/asr-client";
import { TTS_WORKER_ARG } from "../src/tts/tts-client";
import { MNEMOPI_EMBED_WORKER_ARG } from "../src/mnemopi/embed-client";
import { TINY_WORKER_ARG } from "../src/tiny/title-protocol";

// Sau bước 3, cả 16 đều export từ worker-selectors; spread đủ 16.
// Nếu bạn giữ bước 3 ở dạng "3 hằng vẫn ở cli.ts", dựng 3 giá trị dưới đây
// từ WORKER_HOST_SELECTOR_PREFIX và thêm vào mảng — test vẫn bắt được lệch.
const ALL_16 = [...Object.values(selectors)];   // phải ra đúng 16

describe("worker selector parity", () => {
	it("mọi selector khai báo đều khớp tiền tố — 16/16", () => {
		expect(ALL_16).toHaveLength(16);
		for (const arg of ALL_16) expect(isWorkerHostSelector(arg)).toBeTrue();
	});
	it("tiền tố dùng đúng thương hiệu mới, không phải thương hiệu cũ", () => {
		expect(WORKER_HOST_SELECTOR_PREFIX).toBe("__ultraworkers_worker_");
		expect(isWorkerHostSelector("__omp_worker_stats_sync")).toBeFalse();  // HÀNG ÂM
	});
	it("không selector nào trùng nhau", () => {
		expect(new Set(ALL_16).size).toBe(16);
	});
});
```

| hợp đồng | ca | điều người dùng thấy nếu hồi quy |
| --- | --- | --- |
| **1 — tính toàn vẹn tiền tố** | 16/16 khớp + hàng âm | CLI lên mà không có tab, không sync stats, không eval JS, không đọc tab trình duyệt — **không có thông báo lỗi nào** |
| **2 — tính duy nhất** | `new Set(ALL_16).size === 16` | hai selector trùng nội dung; `isWorkerHostSelector` trả `true` cho cả hai nên lớp lỗi này không bị bắt bởi hợp đồng 1 |

**Chứng minh hàng âm sống (bắt buộc trước khi tính DONE):** đổi `WORKER_HOST_SELECTOR_PREFIX` về
`"__omp_worker_"`, chạy test → phải **ĐỎ**; đổi lại → **XANH**.

### 4.2 `packages/utils/test/worker-host.test.ts:24-26` — cập nhật

| dòng | TRƯỚC | SAU |
| --- | --- | --- |
| `:24` | `expect(WORKER_HOST_SELECTOR_PREFIX).toBe("__omp_worker_");` | `expect(WORKER_HOST_SELECTOR_PREFIX).toBe("__ultraworkers_worker_");` |
| `:25` | `expect(isWorkerHostSelector("__omp_worker_stats_sync")).toBeTrue();` | `expect(isWorkerHostSelector("__ultraworkers_worker_stats_sync")).toBeTrue();` |
| `:26` | `expect(isWorkerHostSelector("__omp_worker_computer")).toBeTrue();` | `expect(isWorkerHostSelector("__ultraworkers_worker_computer")).toBeTrue();` |

Dòng `:27` (`"--version"` → false) và `:28` (`undefined` → false) **giữ nguyên**.

### 4.3 `packages/coding-agent/test/profile-alias.test.ts` — hợp đồng 3 và 4

| ca | nội dung | vì sao bắt buộc |
| --- | --- | --- |
| 3a | alias tên đúng `ultraworkers` (và `ULTRAWORKERS`) bị **TỪ CHỐI**, giữ nguyên việc từ chối `omp`/`OMP` | chốt chặn phải có **nhánh thứ hai** |
| 3b | alias tên gần giống (ví dụ `ultraworkers-x`) được **CHẤP NHẬN** | một chốt chặn viết sai thành `startsWith` sẽ xanh ở 3a và **đỏ** ở 3b — đây là ca duy nhất phân biệt được chốt chặn thật với một chuỗi hardcode |
| 4 | *(đã có sẵn)* ca `:263` "replaces a previous block for the same alias" | **đặc tả nói "thêm ca thứ tư" — CA NÀY ĐÃ TỒN TẠI VÀ ĐÃ ĐỎ ĐƯỢC.** Nó đưa vào block marker CŨ rồi khẳng định `not.toContain("--profile=old")`. Nếu ai đó đổi marker ở `:286-287`, `upsertBlock` sẽ append block thứ hai, `--profile=old` **vẫn còn**, và ca này **ĐỎ**. Không cần viết ca mới; chỉ cần **bảo đảm nó vẫn xanh** sau W9. |

Nếu hồi quy 3: `--alias` tạo một profile tên trùng binary của chính người dùng, và mọi lời gọi
`omp --profile=X` bắt đầu chạy lệnh không phải ý mình.
Nếu hồi quy 4: mỗi lần chạy `--alias` lại tích thêm một định nghĩa alias trùng trong `.zshrc`,
và block cũ gọi `command omp` không bao giờ được dọn — người dùng chỉ thấy file rc phình dần.

### 4.4 File KHÔNG được sửa

| file | lý do | số lượt giữ |
| --- | --- | --- |
| `test/executable-fallback.test.ts` | `__omp_worker_test` là argv tùy ý, chỉ để `resolveWorkerSpawnCmd` chuyển tiếp | 8 |
| `test/eval/worker-core.test.ts` | `__omp_worker_core_gate` là tên thuộc tính `globalThis` (`:105`), không liên quan worker host | 24 |
| `test/issue-{1606,3031,7352}-repro.test.ts` | chỉ nằm trong docblock | 1 mỗi file |
| `test/fixtures/computer-worker-cli-selector.ts:3`, `test/eval/process-entry-import.test.ts:33` | argv thật, chuyển sang import hằng số **nếu muốn** — không bắt buộc, không sai | 1 mỗi file |

**Cấm trong test:** KHÔNG source-grep file nguồn (AGENTS.md cấm — đặc tả tự nói đúng ở
`plan_corrections`); KHÔNG `mock.module()`; KHÔNG khẳng định `fn(x) === x` cho hằng số;
KHÔNG thêm mục changelog.

---

## 5. Cổng

### 5.1 Trạng thái thật của 4 tầng trên máy này (đã chạy, không phải suy đoán)

```bash
# TẦNG 2a — ĐÃ CHẠY: 4 pass / 0 fail, 12 expect() calls, 40ms
bun test packages/utils/test/worker-host.test.ts

# TẦNG 2b — ĐÃ CHẠY: 23 pass / 0 fail, 56 expect() calls, 53ms
cd packages/coding-agent && bun test test/profile-alias.test.ts

# TẦNG 3  — ĐÃ CHẠY: 7 pass / 0 fail, 15 expect() calls, 1.73s
cd packages/coding-agent && bun test test/worker-selector.test.ts

# TẦNG 4  — ĐÃ CHẠY: exit 0, in ra "smoke-test: ok"
bun run ci:test:smoke
```

**Hai tin tốt phủ định đặc tả:**
1. `which ninja` → `/opt/homebrew/bin/ninja`. **Ninja ĐÃ có sẵn.** Addon native **ĐÃ build**.
   `worker-selector.test.ts` chạy **7 pass / 0 fail**, không đỏ. Tiền đề `brew install ninja` +
   `bun --cwd=packages/natives run build` trong tầng 3 của đặc tả là **thừa trên máy này** — và
   báo cáo "test failed" vì chưa build là **sai**.
2. `ci:test:smoke` (`package.json:119`, **không phải `:123`**) chạy được và xanh ngay.

### 5.2 Cổng có thực sự đỏ được không? — **KHÔNG. Và đây là điều quan trọng nhất của phiếu này.**

Tôi đã dựng ma trận "hồi quy nào làm tầng nào đỏ" từ mã thật. Kết quả:

| hồi quy | T1 `check:ts` | T2 worker-host + profile-alias | T3 worker-selector + parity | T4 smoke |
| --- | --- | --- | --- | --- |
| Xoá khai báo mà quên import | **ĐỎ** (lỗi kiểu) | xanh | xanh | xanh |
| Tạo vòng import `cli.ts` ↔ `context-manager.ts` | **ĐỎ** | xanh | xanh | xanh |
| Đổi tiền tố, quên sửa `worker-host.test.ts:24-26` | xanh | **ĐỎ** | xanh | **ĐỎ** |
| Một trong 16 hằng còn tiền tố cũ | xanh | xanh | **ĐỎ** (ca parity) | **ĐỎ** nếu smoke phủ |
| `DEFAULT_ALIAS_COMMAND` chưa đổi | xanh | **ĐỎ** | xanh | xanh |
| Chốt chặn alias mất nhánh thứ hai | xanh | xanh (xanh **giả** — xem dưới) | xanh | xanh |
| **`aggregator.ts:142` để sót `__omp_worker_stats_sync`** | xanh | xanh | **xanh** | **XANH trên darwin** |
| **`tab-supervisor.ts:1615` để sót `__omp_worker_tab`** | xanh | xanh | **xanh** | **XANH** (không smoke nào gọi `tab`) |

**Hai chỗ hỏng im lặng mà đặc tả tự gọi là "nơi hỏng im lặng" — `stats_sync` và `tab` — đều có thể
bị bỏ sót mà CẢ BỐN TẦNG VẪN XANH trên darwin.** Lý do đo được:
- `smokeTestSyncWorker` (`aggregator.ts:205`) có `if (process.platform === "darwin") return;`
  ở **dòng 206** — smoke không bao giờ chạm tới `stats_sync` trên macOS.
- `tab` không có lời gọi `smokeTest*` nào (`cli.ts:151-178` không có dòng nào nhắc `tab`).
- Ca parity **không** so `aggregator.ts:142` hay `tab-supervisor.ts:1615` với bất cứ thứ gì —
  nó dựng `stats_sync`/`tab` từ tiền tố, nên nó chỉ chứng minh "16 hằng đã export khớp tiền tố",
  **không** chứng minh "ba spawn site dùng hằng số".

Ngoài ra: **TẦNG 1 KHÔNG bắt được tiền tố.** `check:ts` là cổng KIỂU (`bun run check:tools &&
bun run --filter './packages/*' check:types`; `check:tools` = `oxlint . && oxfmt --check …`).
Một chuỗi literal sai vẫn là `string` hợp lệ — typecheck không đỏ. Đặc tả nói tầng 1 đỏ khi "còn
tên hằng cũ sót lại trong phạm vi nguồn": đúng cho **tên định danh** đã xoá, **sai** cho **chuỗi
thương hiệu**.

Và một lỗ hổng nữa: **tầng 2 KHÔNG bắt được chốt chặn alias mất nhánh thứ hai.** Ca `:324`
("refuses to shadow the base omp command case-insensitively") chỉ liệt kê `["omp", "OMP"]` —
nó xanh cả khi nhánh `"ultraworkers"` đã bị xoá. Đó chính là lý do hợp đồng 3b tồn tại.

### 5.3 Cổng ĐÃ VIẾT LẠI ĐỂ ĐỎ ĐƯỢC

Thêm **TẦNG 2.5** giữa tầng 2 và tầng 3. Đây là lệnh của đặc tả, nâng lên thành cổng.

```bash
# ===== TẦNG 2.5 — KHẮP NẮM HAI LỖ HỔNG CỦA TẦNG 3 VÀ TẦNG 4 =====
git grep -n '__omp_worker_' -- 'packages/**/*.ts' ':!*test*' | grep -v '^\S*: *\*'
# PASS = 0 dòng.  FAIL = BẤT KỲ dòng nào.
# ĐÃ ĐO Ở HEAD SẠN: 26 dòng (8 ở cli.ts:182-189, 8 ở worker-selectors.ts:9-23,
# 1 ở worker-host.ts:4, 1 ở context-manager.ts:130, 1 ở context-manager.ts:1010,
# 1 ở embed-client.ts:38, 1 ở stt/asr-client.ts:72, 1 ở title-protocol.ts:20,
# 1 ở tab-supervisor.ts:1615, 1 ở tts-client.ts:135, 1 ở aggregator.ts:142).
# Sau W9: 0. Cả 5 dòng comment đã được bước 6 sửa nên cũng về 0.
```

**Vì sao đây là cổng ĐỎ ĐƯỢC và là lựa chọn đúng:** sau bước 4, trong `.ts` nguồn không còn lý do
hợp lệ nào để `__omp_worker_` tồn tại — mọi selector đã dựng từ tiền tố, mọi comment đã sửa. Vì vậy
tiêu chí PASS là **"0 dòng"**, KHÔNG phải "khớp danh sách cho trước". Đây là lệnh shell chạy tay /
trong CI, **không phải `bun test`** — AGENTS.md cấm source-grep trong test, và `plan_corrections`
của đặc tả tự nói đúng: "nó phải là script trong `scripts/`, không phải test".

**Cổng cuối cùng, đủ 5 tầng:**

```bash
# TẦNG 1 — kiểu + lint + format. ĐỎ khi import sai, vòng import, tên định danh đã xoá còn sót.
bun run check:ts

# TẦNG 2 — hai bất biến chính. ĐỎ khi tiền tố/chốt chặn alias/marker chưa cập nhật.
bun test packages/utils/test/worker-host.test.ts
cd packages/coding-agent && bun test test/profile-alias.test.ts

# TẦNG 2.5 — ba spawn site. ĐỎ khi còn literal thô. Đây là tầng DUY NHẤT bắt được
# stats_sync và tab trên darwin.
git grep -n '__omp_worker_' -- 'packages/**/*.ts' ':!*test*' | grep -v '^\S*: *\*'   # phải rỗng

# TẦNG 3 — dispatch thật + parity. ĐỎ khi 16 hằng lệch tiền tố.
cd packages/coding-agent && bun test test/worker-selector.test.ts test/worker-selector-parity.test.ts

# TẦNG 4 — phân phối. ĐỎ khi worker không tái nhập entrypoint dưới tên mới.
bun run ci:test:smoke

# TẦNG 5 — nghiệm thu: đối chiếu với baseline đo ở bước 1 (91 / 28 / 21),
# giải thích TỪNG chênh lệch bằng danh sách ở bước 9.
```

**Khi viết báo cáo, bắt buộc ghi rõ độ phủ của tầng 4:** trên darwin là **13/16** — thiếu
`stats_sync` (`aggregator.ts:206` return sớm), `tab` và `js_eval_process` (không có lời gọi smoke
nào tới). Trên Linux 14/16. **KHÔNG được viết "smoke xanh nghĩa là selector đã đúng".**

**ĐIỀU CẤM:** không dùng `tsc`/`npx tsc` (dự án cấm) — cổng kiểu là `bun run check:ts`.
Không chấp nhận `grep sạch` làm bằng chứng ở tầng 5 — 53 lượt sentinel (48 test + 5 `fixtures.json`)
phải **CỐ Ý** còn lại. Không coi `bun test` là sẵn sàng chỉ vì hai file tầng 2 chạy được.

---

## 6. Cạm bẫy riêng của work item này

1. **Pháp lý file rc — cạm bẫy lớn nhất, và kế hoạch cũ không nhắc tới.**
   `profile-alias.ts:286-287` và `:309-310` khai báo marker `# >>> omp profile alias: <tên> >>>`;
   `upsertBlock()` (`:308`) **đọc ngược** marker này từ `.zshrc`/`.bashrc`/`.fish` của người dùng.
   Đổi chuỗi marker ⇒ `indexOf` trả `-1` ⇒ **append** block thứ hai mỗi lần chạy `--alias`, và
   block cũ (vẫn gọi `command omp`) không bao giờ bị dọn. **ĐÓNG BĂNG marker.** Đây là bẫy "hai
   lớp danh tính": tên hiển thị đổi được, chuỗi nhận diện trên đĩa người dùng thì không.
   Lưu ý: ca test `:263` **đã** bảo vệ điều này và **đã đỏ được** — hãy giữ nó xanh, đừng viết ca mới.

2. **Sai chỗ lấy hằng số ở hai spawn site.** `TAB_WORKER_ARG` (`cli.ts:184`) và
   `JS_EVAL_WORKER_ARG` (`cli.ts:185`) là `const` trần không export. Nếu bạn làm đúng lời đặc tả
   ("thay literal bằng hằng") mà chuyển 3 hằng này vào `worker-selectors.ts`, bạn sẽ **xoá** chúng
   khỏi `cli.ts` theo bước 3 — và `cli.ts:223,236` hết tên để so sánh. **Thứ tự đúng: chuyển 3 hằng
   vào `worker-selectors.ts` TRƯỚC, rồi mới xoá ở `cli.ts`.** Đã kiểm vòng import:
   `worker-selectors.ts` là module lá, `tab-supervisor.ts` và `context-manager.ts` import nó được.

3. **Đừng `sed` toàn repo.** `__omp_worker_` xuất hiện trong `fixtures.json` của tokenizer Rust
   (5 lượt, trường `"text"` của snapshot), `test/eval/worker-core.test.ts` (24 lượt, tên thuộc
   tính `globalThis`), `test/executable-fallback.test.ts` (8 lượt, argv tùy ý) và ba docblock
   issue-repro. `sed` sẽ đổi **53 lượt không nên đổi** và làm hỏng điều kiện thử của tokenizer.

4. **Đừng tin `check:ts` bắt được tiền tố.** Nó là cổng kiểu. Chuỗi literal sai vẫn là `string` hợp
   lệ. Nếu bạn tin tầng 1 và bỏ tầng 2.5, bạn sẽ giao một diff mà **mọi cổng đều xanh** nhưng
   `stats_sync` và `tab` đã chết.

5. **Ba dòng trong `package.json` trùng nhau về nghĩa.** `:28` là bin (đổi), `:13` là homepage
   (N9 chặn), `:538` là dependency scope (N17/W7). Cùng một file, dễ sửa nhầm hàng.

6. **`update-cli.ts:1137`** phân loại cài đặt dựa trên tên đường dẫn:
   `if (packageNames.size === 0 && !path.basename(cacheDir).toLowerCase().includes("omp")) return undefined;`
   Ngoài W9 (thuộc W10/W12) nhưng **phải biết trước khi ai đó chạy sed toàn repo**.

7. **`docs/tools/ida.md:14` chứa hai thứ.** Sửa `__omp_worker_ida_host`; **giữ nguyên**
   `omp.ida.<id>` — đó là danh tính runtime/socket, không nằm trong danh sách wire N4.

8. **`PI_SUBPROCESS_CMD` (`omp-command.ts:15`) là bất biến vĩnh viễn.** N16 đóng băng họ tiền tố
   `PI_*`. Đừng "cho nhất quán" mà đổi.

---

## 7. Danh sách neo đã kiểm — và neo nào HỎNG

Tôi đã mở và đọc từng dòng dưới đây bằng `sed -n "<n>p"` / `rg -n`. **Cột "kết quả" là quan sát
từ file thật, không phải từ đặc tả.**

### 7.1 Neo ĐÚNG (giữ nguyên số dòng trong đặc tả)

| neo | nội dung thật ở dòng đó |
| --- | --- |
| `packages/utils/src/worker-host.ts:4` | `export const WORKER_HOST_SELECTOR_PREFIX = "__omp_worker_";` |
| `packages/utils/src/worker-host.ts:7-9` | `isWorkerHostSelector()` dùng `startsWith(WORKER_HOST_SELECTOR_PREFIX)` |
| `cli/worker-selectors.ts:9,11,13,15,17,19,21,23` | đúng 8 hằng, đúng thứ tự |
| `packages/coding-agent/src/cli.ts:31` | `import { declareWorkerHostEntry, installWorkerInbox, isWorkerHostSelector } from "@oh-my-pi/pi-utils/worker-host";` |
| `packages/coding-agent/src/cli.ts:182-189` | đúng 8 hằng, đúng thứ tự (182 TINY, 183 STATS_SYNC, 184 TAB, 185 JS_EVAL, 186 JS_EVAL_PROCESS, 187 STT, 188 TTS, 189 MNEMOPI_EMBED) |
| `packages/coding-agent/src/cli.ts:258` | `if (arg === STT_WORKER_ARG) {` |
| `packages/coding-agent/src/cli.ts:545` | `if (isWorkerHostSelector(resolvedArgv[0])) {` |
| `packages/coding-agent/src/tools/computer/worker-entry.ts:37` | `if (!Bun.argv.some(isWorkerHostSelector)) {` |
| `stt/asr-client.ts:72` / `:80` | khai báo; `spawnCommand: resolveWorkerSpawnCmd(STT_WORKER_ARG),` |
| `tts/tts-client.ts:135` | `export const TTS_WORKER_ARG = "__omp_worker_tts";` |
| `mnemopi/embed-client.ts:38` / `:122` | khai báo; dòng comment `__omp_worker_mnemopi_embed` |
| `tiny/title-protocol.ts:20` | `export const TINY_WORKER_ARG = "__omp_worker_tiny_inference";` |
| `eval/js/context-manager.ts:130` / `:1010` | `const JS_EVAL_PROCESS_ARG = …` (trần, không export); `argv: ["__omp_worker_js_eval"]` |
| `tools/browser/tab-supervisor.ts:1615` | `argv: ["__omp_worker_tab"]` |
| `scripts/ci-release-publish.ts:186` | `publishBin: { omp: "dist/cli.js" },` |
| `scripts/ci-release-publish.ts:243` / `:301` | `manifest.bin = { ...pkg.publishBin };` |
| `packages/coding-agent/package.json:28` / `:13` / `:538` | `"omp": "src/cli.ts"`; `"homepage": "https://omp.sh"`; `"@oh-my-pi/omp-stats": "catalog:"` |
| `task/omp-command.ts:11` | `const DEFAULT_CMD = process.platform === "win32" ? "omp.cmd" : "omp";` |
| `task/omp-command.ts:15` | `const envCmd = $env.PI_SUBPROCESS_CMD;` |
| `subprocess/worker-client.ts:130` / `:131` | comment; `$which("omp", { requireAbsolutePaths: true, cache: WhichCachePolicy.Bypass }),` |
| `subprocess/worker-client.ts:203` / `:384` / `:548` | comment `~/.omp/agent/cache`; `"omp-worker-stderr-"`; comment `--smoke-test` |
| `subprocess/worker-client.ts:169-178` | `resolveWorkerSpawnCmd` trọn vẹn |
| `profile-alias.ts:30-33` / `:157-158` / `:268` / `:286-287` / `:292` / `:308` / `:309-310` | tất cả khớp chính xác; file có **13** token `omp` đứng riêng |
| `commands/completions.ts:29` | `const config: CliConfig = { bin: APP_NAME, version: VERSION, commands: map };` |
| `completion-gen.ts:447` | comment quy ước autoload `_omp` |
| `AGENTS.md:52` / `:57` | 4 + 1 = **5** lượt `__omp_worker_` |
| `AGENTS.md:62` | câu sai "spawns the stats sync worker and the tiny-model subprocess" |
| `packages/coding-agent/DEVELOPMENT.md:52` | `dispatches the hidden `__omp_worker_*` argv selectors` |
| `docs/tools/ida.md:14` | `omp.ida.<id>` daemon (`__omp_worker_ida_host`) |
| `packages/utils/test/worker-host.test.ts:24-26` | đúng 3 khẳng định ghim tiền tố cũ (`:27-28` là negative, không ghim) |
| `test/eval/worker-core.test.ts:105` | `(globalThis as { __omp_worker_core_gate?: … }).__omp_worker_core_gate = {` |
| `test/fixtures/compiled-worker-selector-host.ts:5` | `const STATS_WORKER_ARG = \`${WORKER_HOST_SELECTOR_PREFIX}stats_sync\`;` |
| `cli/update-cli.ts:551` / `:1588` / `:1639` | đều là comment/docblock |
| `blob-broker/server.ts:2`, `embed-worker.ts:4`, `activity-worker.ts:4`, `predict/daemon.ts:3` | 4 dòng comment, đúng thứ tự |
| 8 protocol re-export | `blob-broker/protocol.ts:11`, `ida/protocol.ts:11`, `launch/protocol.ts:11`, `launch/terminal-output-worker-protocol.ts:3`, `lsp/mux/protocol.ts:13`, `predict/protocol.ts:12`, `stats/activity-protocol.ts:13`, `tools/computer/protocol.ts:4` — cả 8 khớp tuyệt đối |
| `packages/stats/CHANGELOG.md:263` | `- Renamed `__omp_stats_sync_worker` to `__omp_worker_stats_sync`.` (mục đã phát hành) |
| `crates/…/testdata/fixtures.json` | 5 lượt, tất cả trên một dòng JSON |
| `packages/coding-agent/test/worker-selector-parity.test.ts` | **không tồn tại** (đặc tả ghi đúng: "tạo") |
| `cli.ts:136-180` | `runSmokeTest()`, 14 lời gọi `await smokeTest*` ở 151,152,166,167,168,170,171,172,173,174,175,176,177,178 |
| `cli.ts:191+` | `runWorkerEntrypoint` có **đúng 16** nhánh `if (arg === …)` |

### 7.2 Neo HỎNG — đặc tả ghi sai, đây là vị trí đúng

| đặc tả ghi | thực tế | dùng số nào |
| --- | --- | --- |
| `packages/stats/src/aggregator.ts:130` (bảng file + bước 5) | `:130` là `}` — dòng đóng interface `WorkerHandle` | **`:142`** |
| `packages/stats/src/aggregator.ts:121-125` (docblock "zero runtime dependency") | `:121` là comment về JSON parse; docblock ở 132–138, câu "keeps zero runtime dependency" ở **`:137`** | `:137` |
| `packages/stats/src/aggregator.ts:186-189` (docblock darwin) | docblock darwin ở 197–201 | `:197-201` |
| `packages/stats/src/aggregator.ts:193-194` (`if darwin return`) | `:193` là comment; hàm `smokeTestSyncWorker` ở **`:205`**, early return ở **`:206`** | `:205-206` |
| `packages/stats/package.json:27` | `:27` trống/nội dung khác | **`:30-31`** (`"bin": {` / `"omp-stats": "./src/index.ts"`) |
| `packages/coding-agent/src/cli/update-cli.ts:1135` | `:1135` là `? await collectInstalledPackageNames(globalNodeModulesDir)` | **`:1137`** |
| `package.json:123` (`ci:test:smoke`, lặp 3 lần trong đặc tả) | `:123` là `"stats:sync": "python3 …"` | **`:119`** |
| `packages/utils/src/dirs.ts:21` (`APP_NAME`, mục Phụ thuộc W3) | `:21` là JSDoc `/** App name (e.g. "omp") */` | **`:22`** |
| `scripts/ci-release-publish.ts:436` (`omp-pack-`) | lệch 2 | **`:438`** |
| `scripts/ci-release-publish.ts:165` (mô tả nội dung) | đặc tả nói `{ dir: "packages/omptype", … }`; thật là `{ dir: "packages/utils", kind: "typescript" },` | hướng đúng (không liên quan), **nội dung sai** |
| `test/worker-selector.test.ts:24,41` (`__omp_worker_does_not_exist`) | thật ở **`:23, :26, :40`** | 3 lượt, không phải 2 |
| `test/worker-selector.test.ts:3` (import native addon) | `import { isPidRunning } from "@oh-my-pi/pi-utils/procmgr";` | đúng dòng, nhưng **máy này đã build nên không đỏ** |
| khối code shape: import `worker-selectors` ở `cli.ts:36-44 (đã có)` | import thật ở **`:33-42`** | `:33-42` |
| `cli.ts:136-179` và `:151-179` | `runSmokeTest` trọn 136–180; 14 lời gọi ở 151–178 | `136-180` / `151-178` |
| `task/omp-command.ts:21-23` (điều kiện `.ts`/`.js`) | khối là **20–23**, điều kiện ở **21–22** | `20-23` |

### 7.3 Con số trong đặc tả KHÔNG tái lập được

| claim | đo thật |
| --- | --- |
| baseline **97** lượt | **91** (đúng phạm vi) / **228** (đúng lệnh của đặc tả) |
| `test/eval/worker-core.test.ts` **30** lượt | **24** |
| `test/worker-selector.test.ts` **2** × `does_not_exist` | **8** tổng: 3 `does_not_exist` + 4 `js_eval_process` + 1 comment |
| "45 lượt test-sentinel" (bước 14) | **48** |
| "13/16 selector trên darwin" | **đúng** — 14 lời gọi smoke, thiếu `stats_sync` (darwin return sớm), `tab`, `js_eval_process` |
| `completion-gen.ts` 109 lượt `omp` | **đúng** (109) |
| `… 58 nằm trong "completion"/"complete"` | **đúng** (58) |
| "token thương hiệu thật = 29" | **đúng** (29 = số lượt `rg -o '_omp[a-z_]*'`). Nhưng phép trừ 109 − 58 = 51 **không** ra 29; con số 29 đến từ một phép đo khác. |
| "không token `omp` đứng riêng nào" (ý thật của đoạn này) | **đúng, và mạnh hơn**: `rg -o '(^\|[^a-zA-Z0-9_])omp([^a-zA-Z0-9_]\|$)'` → **0** |
| "13 token `omp` đứng riêng trong `profile-alias.ts`" | **đúng** (13) |
| 13 file / 24 vị trí (tiêu đề §3.5) | nguồn thật = **14 file / 30 vị trí**; toàn repo (trừ file kế hoạch) = **28 file / 91 lượt** |
| số lượt `cli:test:smoke` phủ trong đặc tả "13/16 darwin" | đúng, nhưng đặc tả tự mâu thuẫn: bước 14 lại viết "13/16 trên darwin" rồi "14/16 trên Linux" trong khi mục Cần người quyết nói thiếu `tab` lẫn `js_eval_process` — hai câu này tương thích, nhưng nên viết một lần. |
| "tầng 3 BỊ CHẶN vì thiếu ninja / addon chưa build" | **SAI trên máy này**: `ninja` ở `/opt/homebrew/bin/ninja`, addon đã build, `worker-selector.test.ts` **7 pass / 0 fail** |

### 7.4 Mâu thuẫn nội bộ của đặc tả (đo đã giải quyết)

1. **`JS_EVAL_PROCESS_ARG`:** bước 4 bảo import từ `context-manager`; khối code bảo **KHÔNG** import vì
   nó là `const` trần. **Đo: `const` trần, không `export`.** → phải thêm `export` (mục 2.4).
2. **`TEXT_PREDICT_WORKER_ARG`:** hai khối cho hai vị trí. **Đo: `:21`.** Khối code đúng.
3. **Ca hợp đồng 4 ("marker tương thích ngược")** bị mục "Cần người xác nhận" yêu cầu viết mới,
   nhưng `profile-alias.test.ts:263` **đã là** ca đó và **đã đỏ được** nếu marker đổi.
4. **"Ba lớp" vs "bốn lớp"** rủi ro — đặc tả tự nhận; mục này trình bày bốn.

### 7.5 Phạm vi cây tham chiếu

Đã kiểm 7 cây tham chiếu: `pi-ref`, `deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`,
`claude-code-ref`, `senpi-ref` — **`rg -c 'omp_worker_'` → 0 ở cả 7**. W9 là thay đổi **thuần của cây
omp**; không có mã `pi` nào tham chiếu tiền tố này. Đây không phải work item "chép từ `pi`".

---

## 8. Phụ thuộc

- **W1** (`WIRE_NAME`) — 5 vị trí wire phải rời literal `"omp"` trước, không thì grep trong W9 trộn
  wire với display với selector trong cùng một lượt khớp.
- **W3** (`APP_NAME` ở `dirs.ts:22`) — W9 dựa vào nó ở `commands/completions.ts:29`,
  `omp-command.ts:11`, `worker-client.ts:131`, `profile-alias.ts:30-33`.
- **W7** (scope npm) — các khai báo `bin` W9 đổi nằm trong manifest đã đổi scope.
- **Chặn sau:** W10 (tên asset tách `omp-` → `ultraworkers-`), W11 (dựa vào ca parity), W13'.

## 9. Cần người quyết (đã chốt ở bước 0)

| câu hỏi | khuyến nghị | lý do đo được |
| --- | --- | --- |
| `DEFAULT_CMD` ghim cứng hay suy ra từ `APP_NAME`? | **suy ra** (phương án b) | có tiền lệ đúng trong repo: `test/fixtures/compiled-worker-selector-host.ts:5` |
| Marker `# >>> omp profile alias:` + `omp-profiles.fish`? | **ĐÓNG BĂNG cả hai** | `upsertBlock` (`:308`) đọc ngược marker từ file rc; `conf.d` của fish nạp mọi file |
| `omp-stats` có thuộc W9 không? | **KHÔNG** | `packages/stats/package.json:30-31`; `update-cli.ts:1137` phân loại cài đặt theo tên → thuộc W10/W12 |
| `omp.ida.<id>` là wire hay display? | **chưa quyết** — W9 chỉ sửa `__omp_worker_ida_host` cạnh nó | không nằm trong danh sách N4 của §2.3 |
| Thêm smoke cho `tab` / `js_eval_process`? | **không** — chấp nhận 13/16 trên darwin | thêm smoke là bước ngoài W9 và cần thêm module graph worker |
| Ba token sentinel trong test? | **giữ nguyên cả ba** | `__omp_worker_test` argv tùy ý, `__omp_worker_does_not_exist` cố ý sai, `__omp_worker_core_gate` là tên `globalThis` |
