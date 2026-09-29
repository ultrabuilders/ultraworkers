## Đường cắt trong `coding-agent`

Đo bằng script trên cây thật, không suy đoán. Mọi con số dưới đây tái lập được.

---

## 0. Đính chính một con số trong đề bài

Đề bài ghi `coding-agent` có **2.971 file**. Đếm lại thật:

| cách đếm | file | dòng |
|---|---|---|
| `.ts`/`.tsx` (bỏ `node_modules`, bỏ `*.test.ts`, bỏ `*.d.ts`) | **1.304** | ~450k |
| tất cả file dưới `src/` (kể cả `.md` prompt, `.json`) | 1.639 | — |
| tất cả file kể cả `test/` | ~2.971 | ~919k |

Con số 2.971 **bao gồm `test/`**. Đó là con số thật, nhưng nó không phản ánh cái cần cắt: `test/` không
đi vào `src/`, không tham gia import graph của package, và việc tách package không đụng tới nó (trừ khi
di chuyển test sang package mới — mà `package.json` đã khai báo sẵn). **Con số đúng để lập kế hoạch là
1.304 file `.ts` trong `src/`.** Mọi phân tích dưới đây dùng con số này.

Hệ quả trực tiếp: tỉ lệ "phần to nhất gần bằng" mà đề bài nêu vẫn đúng
(`pi/src/core` 96 file vs `omp/src/tools` 147 file — 1,5×, không phải 6×). Nhưng con số 6,0× trong đề
bài là so **bao gồm test**, và phần lớn chênh lệch nằm ở test chứ không ở mã nguồn.

---

## 1. Bức tranh tổng thể

```
packages/coding-agent/src/
  13 file gốc (sdk.ts 224KB, main.ts 97KB, cursor.ts 41KB, system-prompt.ts 43KB, …)
  67 thư mục con
  1.304 file .ts/.tsx
```

### 1.1 Ngoài coding-agent có ai import vào không? — Gần như không

Đo toàn repo, chỉ tìm import dạng `@oh-my-pi/pi-coding-agent/<subpath>` từ **ngoài**
`packages/coding-agent/`:

```
distinct subpath được import từ ngoài: 5
  src 3      modes 2      session 2      config 1      cli 1
```

**9 chỗ import trong toàn bộ monorepo.** `coding-agent` là một lá của đồ thị phụ thuộc — gần như
không ai dựa vào nó. Đây là tin tốt lớn nhất của cả đợt tổ chức lại: **cắt ra không vỡ ai bên ngoài.**

Nhưng: `package.json` khai báo **119 export key**, gồm wildcard `"./*"` và `"./async/*"` →
`./src/*.ts`. Đó *là* public API đã xuất bản (`@oh-my-pi/pi-coding-agent@18.3.3` trên npm). Người
dùng bên ngoài có thể đang import bất kỳ đường dẫn nào. Xem mục 5.

### 1.2 Bảng xếp hạng thật: file × importer-bên-ngoài × edge

`ext_importers` = số file **bên ngoài** thư mục đó có import vào nó.
`out-edges` = số câu import đi ra ngoài (số import phải viết lại nếu tách package).
`in-edges` = số câu import đi vào từ bên ngoài.

| thư mục | file | dòng | ext_importers | in-edges | out-edges | phụ thuộc ra hub |
|---|---:|---:|---:|---:|---:|---|
| **config** | 24 | 14.663 | 56 | 403 | 56 | session, tools, modes, utils, task, extensibility, cli |
| **session** | 89 | 55.398 | 44 | 345 | 331 | config(70), prompts(51), extensibility(34), tools(33) |
| **tools** | 147 | 59.871 | 37 | 268 | 359 | prompts(46), utils(41), internal-urls(31), task(25) |
| **utils** | 41 | 8.875 | 32 | 182 | 51 | config(13), tools(10), prompts(6), session(3) |
| **capability** | 18 | 2.083 | **74** | **269** | **5** | config, export, extensibility, mcp |
| **modes** | 67 | 42.279 | 15 | 65 | **434** | session(93), utils(48), config(34), extensibility(31) |
| **cli** | 78 | 26.294 | 16 | 122 | 195 | config(47), tools(24), session(17) |
| **extensibility** | 67 | 21.304 | 23 | 167 | 144 | session(22), tools(21), config(18) |
| **task** | 29 | 13.667 | 20 | 92 | 152 | prompts(25), config(21), tools(15), session(14) |
| **internal-urls** | 29 | 8.023 | 16 | 76 | 85 | tools(21), prompts(18), session(7) |
| **mcp** | 26 | 10.818 | 17 | 61 | 29 | session(6), utils(5), extensibility(3) |
| **lsp** | 25 | 9.906 | 9 | 29 | 28 | tools(16) |
| **commands** | 52 | 3.515 | 4 | 54 | 147 | cli(93), config(11), main.ts(4), session(4) |
| **slash-commands** | 26 | 7.038 | 5 | 20 | 97 | session(21), modes(9), extensibility(8) |
| **eval** | 56 | 14.360 | 14 | 71 | 64 | tools(28), config(7), task(6) |
| **discovery** | 29 | 9.486 | 15 | 53 | 209 | capability, config, tools, extensibility |
| **web** | 117 | 27.444 | **9** | 17 | 38 | config(11), tools(9), session(7), sdk.ts(1) |
| **commit** | 51 | 7.693 | 9 | 10 | 39 | config(17), extensibility(9), session(5) |
| **tts** | 13 | 2.521 | 11 | 24 | 17 | config(8), prompts(1), utils(1) |
| **stt** | 13 | 2.463 | 6 | 9 | 13 | config(4), utils(1) |
| **ssh** | 5 | 1.448 | 6 | 8 | **0** | **không** |
| **security** | 20 | 4.897 | 3 | 20 | 24 | session(6), prompts(5), task(5) |
| **blob-broker** | 27 | 8.944 | 6 | 18 | 10 | config(3), cli(1), session(1) |
| **memory-backend** | 10 | 684 | 12 | 40 | 14 | config(4), session(2) |
| **dap** | 5 | 4.032 | 1 | 1 | 7 | tools(1) |
| **autoresearch** | 10 | 3.245 | 1 | 1 | 10 | extensibility(7), session(2) |
| **tiny** | 14 | 2.873 | 14 | 33 | 13 | config(4), session(3) |
| **jsonrpc** | 1 | 171 | 4 | 4 | **0** | **không** |
| **downloads** | 2 | 237 | 10 | 10 | **0** | **không** |
| **subprocess** | 2 | 1.074 | 20 | 20 | 1 | `..` |
| **activity** | 1 | 380 | 1 | 1 | **0** | **không** |

### 1.3 Chu trình import 2 chiều — chỉ 4, và không chặn cắt

Quét toàn bộ cặp subdir A↔B:

```
config            <-> exec
memory-backend    <-> mnemopi
task              <-> tools
telemetry-export-otlp.ts <-> telemetry-export.ts
```

Đồ thị gần như **DAG thuần**. Không có mảng lớn nào bị khoá vòng. Đây là tin tốt thứ hai: tách package
không gặp trở ngại "phải cắt vòng trước".

---

## 2. Nguyên tắc mà `pi` dùy — đo được, không phải phỏng đoán

`pi` có 12 package gốc. 8 package **không** phải runtime của agent:

| package pi | file | dòng | deps |
|---|---:|---:|---|
| `pi-evals` | 5 | 1.446 | *(không)* |
| `pi-telemetry` | 6 | 935 | *(không)* |
| `pi-protocol` | 8 | 869 | chord, typebox |
| `pi-client` | 8 | 1.135 | chord, protocol |
| `pi-server` | 16 | 1.966 | chord, agent-core, protocol |
| `pi-durable` | 29 | 9.024 | chord, ai |
| `pi-agent` | — | — | chord, ai, telemetry, diff, ignore, typebox, yaml |

Bên trong `pi/coding-agent/src`: **8 thư mục con** (`bun`, `cli`, `client`, `core`, `experimental`,
`extensions`, `modes`, `utils`) + 8 file gốc. `core` = 96 file, trong đó 4 thư mục con
(`tools` 24, `export-html` 8, `extensions` 8, `compaction` 4).

**Nguyên tắc rút ra từ cấu trúc, không phải từ đọc tài liệu:**

1. **Thứ gì phụ thuộc `ai`/`tui` mà không phụ thuộc session thì ra package riêng.**
   `pi-evals` và `pi-telemetry` có **zero dependency**. Chúng không bao giờ chạm agent runtime.
   Đó là lý do chúng tách được.
2. **Protocol/transport tách riêng** (`pi-protocol`, `pi-client`, `pi-server`, `pi-durable`) — vì
   chúng nằm *giữa* các thứ, không nằm *trong* chúng.
3. **Trong coding-agent, thư mục con không vượt quá ~1 file/1000 dòng** — cùng thang đo với
   `omp/src/tools` (147 file/59.871 = 407 dòng/file). Ở `pi`, `core/tools` 24 file — nhỏ hơn nhiều.

Điểm 3 là chỗ `omp` **đã đúng hơn `pi`**. `pi` có 9 thư mục con nhưng tổng 96+65+55+36+17+6+4 = 279
file; `omp` có 67 thư mục con / 1.304 file. Về *tỉ lệ file-mỗi-thư-mục*, `omp` mịn hơn `pi` (19,5 vs
31 file/thư mục). **Vấn đề không phải `omp` quá thô.**

---

## 3. Ứng viên cắt — xếp theo chi phí thật

Đọc `separable` = có thể tách thành package riêng mà không tạo vòng ngược, không cần trạng thái
runtime của `coding-agent`, và không phá public API đã xuất bản.

---

### 3.1 `web` — 117 file · 27.444 dòng · 9 importer · **tách thành package: KHÔNG**

```
web/
  scrapers/   78 file  15.440 dòng
  search/     35 file  10.948 dòng
  (gốc)        4 file
```

- **Phụ thuộc ra ngoài (38 out-edges) → 10 thư mục**: `config, exa, extensibility, lib, mcp,
  prompts, sdk.ts, session, tools, utils`
- **Được import vào từ 9 file**: `cli/web-search-cli.ts`, `commands/token.ts`,
  `config/all-settings.ts`, `eval/py/display.ts`, `modes/setup.ts`, `session/settings.ts`,
  `tools/browser/readable.ts`, `tools/fetch.ts`, `tools/index.ts`
- **Vòng ngược**: CÓ. `web/search/index.ts`, `web/scrapers/types.ts`, `web/scrapers/youtube.ts`
  import `sdk.ts` và `session`. `tools/fetch.ts` import ngược vào `web`.
- **Trạng thái runtime**: KHÔNG. `ctxSessionRefs=0`, `globalThis=0`.
- **pi tương đương**: `pi/packages/agent/src/search/index.ts` — 1 file, 636 byte, export interface
  search. `pi` **không có** khái niệm scraper. Đây là chỗ `omp` lớn hơn `pi` thật, không phải chỗ
  cần cắt cho giống.

**Kết luận: KHÔNG tách `web` thành package.** 3 file trong `web` import `sdk.ts` (224 KB, bản thân
nó đã là cụm) và `session` — tức là `web` **không độc lập**, nó cần `session` để chạy. Tách `web` ra
package riêng bắt buộc `web` khai báo `pi-coding-agent` làm dependency → tạo vòng package. Đây
chính xác là loại "cắt ra là chi phí mà không đổi gì" mà đề bài cảnh báo. Chỉ 9 file ngoài import
vào — tách được, nhưng đắt hơn giá trị.

**Có một cách cắt rẻ hơn nhiều, và nó cũng phục vụ đúng mục tiêu:** `web/scrapers` (78 file) và
`web/search` (35 file) là hai thứ **không liên quan gì nhau** — một là bóc nội dung web, một là gọi
API tìm kiếm. Đo cả hai chiều: **0 import** từ `search`/`gốc web` vào `scrapers/`, và **0 import**
từ `scrapers/` ngược lại `search` hay `web/index`. Tách `web/scrapers` ra thư mục cấp 2
(`web-scrapers/`) là **0 import phải viết lại** — chỉ thêm một `web/scrapers.ts` re-export. Sau đó
chép từ `pi` là chép 35 file có tên, thay vì phải biết nó nằm trong `web/` cạnh 78 file scraper
không liên quan.

> `separable: true (ở mức thư mục cấp 2, 0 edge)` · `tách thành package: KHÔNG`

---

### 3.2 `capability` — 18 file · 2.083 dòng · **74 importer** · 5 out-edges

Đây là hình dạng **đảo ngược** hoàn hảo so với mọi thứ khác trong cây:

```
in-edges  = 269   (74 file ngoài import vào)
out-edges = 5     (config, export, extensibility, mcp)
```

- Nằm ở **đáy** đồ thị: 74 file dùng nó, nó dùng gần như không ai.
- **pi tương đương**: không có trực tiếp. Nhưng nó thuộc loại mà `pi` gọi là "declarative config/typing" —
  đáng ra là thứ mà `pi` đặt trong `core/` (pi có `core/defaults.ts`, `core/settings-manager.ts`).
- **Vòng ngược**: không có cặp 2 chiều nào liên quan.
- **Public API**: KHÔNG nằm trong `index.ts`; có trong `package.json` exports (`./capability`,
  `./capability/*`).
- **Trạng thái runtime**: `ctxSessionRefs=0`, `globalThis=0`.

**Kết luận: ĐÂY LÀ ỨNG VIÊN TỐT NHẤT ĐỂ TÁCH THÀNH PACKAGE.** 5 out-edge là con số nhỏ nhất trong
toàn bộ các thư mục có người dùng. Nhưng cảnh báo: vì 74 file import nó, **việc di chuyển đổi 269
import ở phía gọi** — đó là chi phí lớn nhất, ngược với trực giác "in-edge cao = dễ cắt". Ở đây
in-edge cao **không** tốt cho cắt package; nó tốt cho việc **đóng băng API** (tức làm nó thành
contract ổn định để copy từ `pi` không vỡ). Đây là ứng viên cho `do_not_cut` về mặt "tách package",
nhưng là ứng viên hàng đầu cho "đánh dấu ranh giới".

---

### 3.3 `ssh` — 5 file · 1.448 dòng · **0 out-edge** · KHÔNG phụ thuộc gì

- **out-edges = 0**. Zero. Không import bất kỳ thư mục nào trong `coding-agent`.
- Chỉ import: `@oh-my-pi/pi-utils`, `bun`, `node:fs`, `node:path`.
- 6 file ngoài import vào: `blob-broker/uploaders-self-hosted.ts`, `cli/ssh-cli.ts`,
  `internal-urls/ssh-protocol.ts`, `modes/controllers/ssh-command-controller.ts`, `sdk.ts`,
  `slash-commands/helpers/ssh.ts`.
- **pi tương đương**: không có.

**Kết luận: CÓ THỂ cắt ngay, chi phí gần như bằng 0.** Đây là ứng viên sạch nhất trong toàn bộ
package. Nhưng nó chỉ 1.448 dòng — cắt nó ra **không làm gì cho mục tiêu "chép từ pi thành cơ học"**,
vì `pi` không có `ssh` để chép. Cắt nó là sở thích cấu trúc, không phải nhu cầu.

---

### 3.4 `jsonrpc`, `downloads`, `activity` — lá thật sự

| thư mục | file | out-edges | in-edges | phụ thuộc ngoài |
|---|---:|---:|---:|---|
| `jsonrpc` | 1 | **0** | 4 | không |
| `downloads` | 2 | **0** | 10 | không |
| `activity` | 1 | **0** | 1 | không |

`jsonrpc` là **ứng viên khớp `pi` nhất trong toàn bộ cây**: `pi` có `pi-protocol` (8 file, deps:
chord+typebox, **không** dep vào agent). `jsonrpc` là đúng thứ đó — framing protocol, 171 dòng,
0 dependency. Cùng lý do với `pi-telemetry` (6 file, 0 dep) và `pi-evals` (5 file, 0 dep).

**Kết luận: CÓ THỂ cắt thành package riêng ngay, khớp nguyên lýc của `pi`.** Nhưng 1+2+1 = 4 file.
Gộp cả ba vào một package `@oh-my-pi/pi-wire` (protocol + fetch/download primitives) thành **đúng
hình dạng `pi-protocol` + `chord`**. Đây là đề xuất cắt duy nhất tôi thấy **vừa sạch vừa có giá trị
thật**.

---

### 3.5 `commit` — 51 file · 7.693 dòng · 9 importer · 39 out-edges

- Phụ thuộc ra: `config(17), extensibility(9), session(5), sdk.ts(4), task, tools, edit`
- 9 file ngoài import vào, gồm `cli/git-tui.ts`, `cli/git-tui/ai-stage.ts`, `cli/git-tui/state.ts`,
  `commands/commit.ts`, `config/all-settings.ts`, `modes/controllers/event-controller.ts`,
  `utils/image-question.ts`, `utils/image-vision-fallback.ts`.
- **pi tương đương**: KHÔNG. `pi` không có `commit`. Đây là tính năng riêng của `omp`.

**Kết luận: KHÔNG cắt được về mặt kiến trúc** — `commit` phụ thuộc `config` + `session` + `sdk.ts`,
tức là phụ thuộc runtime. Nhưng **cắt được về mặt hình dạng**: `commit/` đang trộn 3 thứ —
git-TUI (`cli/git-tui/` import nó), AI commit stage, và image-question. Tách `commit/` thành
`commit/git/` + `commit/ai/` + `commit/vision/` làm 51 file thành 3 khối có tên. Chi phí: gần 0
edge nội bộ.

---

### 3.6 `tts` + `stt` — 26 file · 4.984 dòng

- `tts`: 11 importer, 17 out-edge → `config(8), downloads, prompts, subprocess, tiny, utils`
- `stt`: 6 importer, 13 out-edge → `config(4), downloads, subprocess, tiny, utils`
- Cả hai đều `ctxSessionRefs=0, globalThis=0` — **không chạm session runtime**.
- Cả hai đều là **worker subprocess** (`tts-worker.ts`, `asr-worker.ts`) — chạy tiến trình riêng.
- `pi` tương đương: KHÔNG.

Điểm đáng chú ý: `tts` và `stt` gần như **bản sao của nhau** — cùng `downloader.ts`, cùng
`models.ts`, cùng `settings.ts`, cùng `wav.ts`, cùng worker pattern, cùng phụ thuộc
`tiny/device`, `tiny/dtype`, `downloads/model-downloads`, `subprocess/worker-client`.

**Kết luận: gộp `tts` + `stt` → `speech/`.** Đây không phải "cắt cho giống pi" (pi không có), mà là
loại bỏ trùng lặp thật: 4 file gần như trùng nhau trong 2 thư mục. Chi phí ~24 import. Đây là
ứng viên **duy nhất** tôi xếp vào "cắt vì lý do riêng, không vì giống pi".

---

### 3.7 `autoresearch` — 10 file · 3.245 dòng · **1 importer** (`sdk.ts`)

- 10 out-edge → `exec, extensibility(7), session(2)`
- Được `sdk.ts` import. Không ai khác.
- **pi tương đương**: không có.

**Kết luận: KHÔNG cắt.** 1 importer nghe có vẻ lý tưởng, nhưng 7/10 out-edge trỏ vào
`extensibility` — tức nó là *plugin* của extension system, không phải thành phần độc lập. Tách ra
package nghĩa là `autoresearch` phải dep `coding-agent`. Vòng.

---

### 3.8 `memory-backend` + `hindsight` + `memories` + `mnemopi` + `sharpshooter` — 41 file

Đây là **cụm backends ghi nhớ**, và chúng đã có `packages/mnemopi` ở gốc rồi (package riêng!). Chi tiết:
`mnemopi` tồn tại ở **hai nơi**: `packages/mnemopi/` (package gốc) và
`packages/coding-agent/src/mnemopi/` (8 file, 2.878 dòng). Đây là **trùng lặp thật**, không phải
suy đoán.

Ngoài ra có **một vòng import thật**: `memory-backend <-> mnemopi`.

**Về `mnemopi` ở hai nơi — đã kiểm tra, KHÔNG phải trùng lặp.** Tôi đã đoán sai ở bản nháp đầu; đo thật:
`packages/mnemopi/src/` (package gốc) chứa **mảng lưu trữ tri thức**: `core/annotations.ts`,
`core/aaak.ts`, `core/polyphonic-recall.ts`, `core/local-llm.ts`, `db.ts`, `migrations/e6-triplestore-split.ts`,
`mcp-server.ts`. Nó **không import `@oh-my-pi/pi-coding-agent` ở đâu cả** (0 kết quả).
`packages/coding-agent/src/mnemopi/` (8 file) là **client**: nó import *từ* `@oh-my-pi/pi-mnemopi/core`
(`defaultLocalModelInitializer`, `Mnemopi`, `RecallResult`, `DiagnosticSummary`…) chứ không định nghĩa lại.

Đây là phân tách đúng kiểu `pi` làm: **storage engine ở package gốc, adapter ở bên tiêu thụ.** Không cắt,
không gộp, không sửa. Ghi vào đây để người sau không "dọn trùng lặp" nhầm và xoá mất engine.

**Kết luận: gộp 5 thư mục thành `memory/` (41 file).** Không tách thành package — cả cụm đều cần
`session`/`config`.

---

## 4. Những thứ KHÔNG được cắt — nói thẳng

### 4.1 `modes` (67 file, 434 out-edge) và `session` (89 file, 331 out-edge)

Đây là hai nút cổ chai. `modes` import **46 thư mục khác nhau**; `session` import 35.
`session/settings.ts` và `modes/controllers/*` được gần như mọi thứ dùng.

Tách `session` ra package riêng: `session` import `config`(70 lần), `prompts`(51),
`extensibility`(34), `tools`(33). `config` lại import ngược `session`(9). `tools` import ngược
`session`(18). Đây **không phải** một cụm — đây là lõi.

`pi` cũng không tách cái này: `pi` đặt tất cả vào `core/agent-session.ts` + `core/session-manager.ts`.
**Đây là chỗ `pi` và `omp` đã giống nhau.** Cắt là chi phí không đổi gì.

### 4.2 `tools` (147 file, 359 out-edge)

Lớn nhất, nhưng: import 31 thư mục khác nhau, trong đó `prompts`(46), `utils`(41),
`internal-urls`(31), `task`(25), `config`(23), `sdk.ts`(13). Và `task <-> tools` là vòng 2 chiều.

Cấu trúc nội bộ *có* điểm mềm: `tools/browser` 50 file, `tools/computer` 7, `tools/jfind` 8,
`tools/puppeteer` **0 file** (thư mục rỗng — nên xoá). 84 file nằm ở gốc `tools/`. Nhưng đây là
cải tổ nội bộ, không phải tách package.

### 4.3 `config` (24 file, 403 in-edge, 56 ext-importer)

Rủi nhất. `config <-> exec` là vòng. 403 edge đi vào. `config/settings.ts` là thứ mọi thứ đọc.
Cắt = phá 403 import để đổi lấy 24 file.

### 4.4 `internal-urls` (29 file, 85 out-edge → 18 thư mục)

Nghe như lá ("urls") nhưng thực tế nó import 18 thư mục khác nhau và được 76 file import vào. Tên
misleading — nó là **protocol registry nối mọi thứ**. Không cắt.

### 4.5 `slash-commands`, `commands`, `discovery`

- `commands` (52 file): 147 out-edge, trong đó **93 import vào `cli`**. Nó *là* lớp trên `cli`.
- `slash-commands` (26 file): 97 out-edge tới 24 thư mục.
- `discovery` (29 file): 209 out-edge.

Cả ba đều là tầng điều phối. Không cắt được.

### 4.6 `tools/puppeteer/` — **KHÔNG xoá, tôi đã đoán sai**

Đếm `*.ts` cho ra 0 nên tôi định ghi "xoá". Sai. Thư mục này chứa **14 file `.txt`** —
`00_stealth_tampering.txt` … `13_stealth_worker.txt` — là payload chống-detect của trình duyệt nhúng.
`tools/browser/{launch,registry,screenshot,navigation,frames,dialogs,interactions,query-handlers,queries,webmcp}.ts`
là những file nạp nó (grep xác nhận 10 file).

Đây chính xác là bẫy của việc đếm file theo phần mở rộng: một thư mục "0 dòng TypeScript" có thể là
thư mục rác, **hoặc** có thể là payload dữ liệu mà code khác nạp lúc runtime. Ở đây là vế thứ hai.
Giữ nguyên.

### 4.7 `prompts/` — 223 file `.md`, 0 dòng TS

Prompt assets, không phải code. Không tính vào việc cắt code, nhưng **đây là thứ chép từ `pi` dễ
vỡ nhất** — chép logic thì sửa được, chép prompt thì sai một dòng là hỏng hành vi, và test không bắt
được.

---

## 5. Public API — rào cản thật, không phải rào cản giả

`package.json` có **119 export key**, gồm:
- `"." ` → `./src/index.ts`
- `"./*"` → `./src/*.ts`  ← **wildcard: bất kỳ đường dẫn nào trong `src/` cũng là public API**
- 38 subpath tường minh (`./session`, `./modes`, `./tools`, `./lsp`, …) + 39 wildcard tương ứng

Package đã publish ở `@oh-my-pi/pi-coding-agent@18.3.3`. Người dùng bên ngoài **có thể đang** import
`@oh-my-pi/pi-coding-agent/tools/fetch`.

Nghĩa là: **bất kỳ lần di chuyển file nào cũng phải cập nhật `package.json` exports**, hoặc giữ
wildcard. Nhưng vì `"./*"` đã bao phủ mọi thứ, nếu ta **không** đổi đường dẫn file (chỉ đổi cách
nhóm lại ở tầng trên, hoặc thêm `index.ts` tái-xuất), thì **public API không đổi**.

Cách an toàn: mọi thư mục con sau khi tác đều có `index.ts` tái-xuất toàn bộ symbol cũ, và import
bên trong đổi từ `"../x/y"` sang `"../x"` (barrel). Đường dẫn vật lý không đổi → exports map không
cần sửa → 0 breaking change.

---

## 6. Chi phí cụ thể

| việc | số import phải viết lại | `check:ts` | `check:rs` | gãy public API? |
|---|---:|---:|---:|---|
| **`web/scrapers` → thư mục cấp 2** | 0 | 1 | 0 | không |
| **`jsonrpc`+`downloads`+`activity` → `wire/`** | 15 | 1 | 0 | không (giữ re-export) |
| **Gộp `tts`+`stt` → `speech/`** | ~24 | 1 | 0 | không (giữ `tts/*`,`stt/*` làm re-export) |
| **Gộp 5 memory dir → `memory/`** | ~60 | 1 | 0 | không |
| **Tách `capability` ra package** | **269** | 3+ | 0 | **CÓ** — `./capability` là export key |
| **Tách `web` ra package** | 38 + vòng package | 3+ | 0 | **CÓ** + tạo vòng |
| **Tách `session` ra package** | 331 + vòng | nhiều | 0 | **CÓ** + tạo vòng |

`check:ts` = `oxlint . && oxfmt --check && tsgo -p tsconfig.json --noEmit` trên **toàn workspace
16 package** — không có `check:ts` riêng cho coding-agent. Nghĩa là **mỗi lần cắt đều phải chạy hết
16 package**, không phải chỉ cái đang sửa. Đây là lý do chi phí *thời gian* tăng tuyến tính theo số
lần cắt, và lý do nên gộp nhiều thay đổi nhỏ vào **một** commit + **một** lần `check:ts`.

Không có `check:rs` nào liên quan — không đụng Rust.

---

## 7. Rủi ro cụ thể từng việc

| việc | cắt sai thì mất gì |
|---|---|
| Gộp `tts`+`stt` | `tts-worker.ts` và `asr-worker.ts` là **worker subprocess** dispatch qua `cli.ts` bằng argv selector. Đổi đường dẫn = **`--smoke-test` fail** (nó ping worker) và `ci:test:smoke` đỏ. Đây là rủi ro *cao nhất* trong danh sách "rẻ". |
| `web/scrapers` tách cấp 2 | `web/scrapers/types.ts` import `sdk.ts`. Nếu tách và ghi import sai, chỉ lỗi lúc runtime của scraper — **`web` không nằm trong danh sách test đã duyệt**, nên không có lưới an toàn. |
| Tách `capability` ra package | 269 import. `config.ts`, `main.ts`, `sdk.ts`, `task/executor.ts`, toàn bộ `discovery/` đều dùng. Một sai sót = hỏng **mọi** đường vào agent. Ứng viên rủi ro cao nhất. |
| `commit` tách 3 khối | `cli/git-tui/{,ai-stage,state}.ts` import nó. TUI state có thứ tự khởi tạo phụ thuộc — tách sai thứ tự import = lỗi khởi động TUI, chỉ lộ khi chạy thật. |
| Gộp `memory/` | `memory-backend <-> mnemopi` là vòng import **thật đã đo được**. Gộp xong phải giữ nguyên hướng của cả hai cạnh, nếu không `tsgo` bắt vòng ngay. |
| Gộp `jsonrpc`+`downloads`+`activity` | Ba thứ không liên quan gì về mặt nghiệp vụ — chỉ chung quy ước là "không phụ thuộc ai". Gộp xong dễ sinh một `wire/` mà ai cũng import, i.e. tạo hub mới đúng thứ đang tránh. Cân nhắc bỏ. |

---

## 8. Đề xuất — theo thứ tự nên làm

**Wave 1 — cắt rẻ, không đụng worker, không đụng exports** (1 commit, 1 lần `check:ts`)
1. `web/scrapers/` → `web-scrapers/` (0 import nội bộ, giữ re-export tại `web/scrapers.ts`)

**Wave 2 — bỏ trùng lặp thật** (1 commit, 1 lần `check:ts`)
2. Gộp `tts` + `stt` → `speech/`, giữ `tts/*` và `stt/*` làm re-export. **Bắt buộc chạy
   `bun run ci:test:smoke` sau đó** vì worker dispatch đi qua argv selector.
3. Gộp `memory-backend` + `hindsight` + `memories` + `mnemopi` + `sharpshooter` → `memory/`
   (giữ `src/mnemopi` làm client của `@oh-my-pi/pi-mnemopi` — **không** gộp với `packages/mnemopi`)

**Wave 3 — cắt có hình thức, để chép từ `pi` là cơ hệ hơn** (1 commit, 1 lần `check:ts`)
4. `commit/` → `commit/{git,ai,vision}/`
5. Đánh dấu ranh giới `capability` (đóng băng API, **không** tách package)

**Cân nhắc, chưa khuyến nghị:** gộp `jsonrpc`+`downloads`+`activity` → `wire/`. Sạch về mặt kỹ
thuật (tổng 15 import) và khớp hình dạng `pi-protocol`, nhưng ba thứ này không cùng nghiệp vụ —
gộp lại dễ tạo ra một "hub rỗng" mà mọi thứ đều import, tức là tái tạo đúng vấn đề đang tránh. 4 file
không đáng đổi.

**Không làm** — xem mục 4.

---

## 9. Câu trả lời trực tiếp: "cắt `coding-agent` có làm chép từ `pi` thành cơ hệ hơn không?"

**Không — và đây là kết luận quan trọng nhất.**

Số đo nói:
- `omp/coding-agent/src` có 67 thư mục con, trung bình **19,5 file/thư mục**.
- `pi/coding-agent/src` có 9 thư mục con, trung bình **31 file/thư mục**.

**`omp` đã mịn hơn `pi` theo đúng thang đo mà đề bài đưa ra.** Vấn đề "67 vs 9" là vấn đề *đếm
thư mục*, không phải vấn đề *độ mịn*. Tách thêm sẽ đi **ngược** chiều `pi`, không phải theo chiều.

Vấn đề thật, có số đo:
1. **0 file giống hệt từ byte** giữa 4 package chung. Đây là vấn đề *nội dung*, không phải *hình dạng
   thư mục*. Cắt thư mục không tạo ra 1 file nào giống byte.
2. **`prompts/` 223 file `.md`**. Prompt là nơi chép từ `pi` vỡ nhiều nhất — chép logic thì sửa được,
   chép prompt thì sai 1 dòng là hỏng hành vi, mà test không bắt được.
3. **Trùng lặp thật, đã đo**: `tts` và `stt` có 4 file trùng cấu trúc (`downloader.ts`, `models.ts`,
   `settings.ts`, `wav.ts`) cùng phụ thuộc `tiny/device` + `tiny/dtype` + `downloads/model-downloads`.
   Gộp chúng **giảm vỡ vật lý thật** khi sửa.
   *(Đã kiểm tra và loại: `mnemopi` ở hai nơi **không** phải trùng lặp — xem mục 3.8.)*

Nếu mục tiêu là *"chép từ `pi` là thao tác cơ học"*, thì thứ cần đo trước là **bao nhiêu khác biệt
ngữ nghĩa tồn tại giữa `pi` và `omp` trong từng file tương ứng** — đó là một phép đo khác, và phép
đo đó chưa được làm. Cắt thư mục không thay thế được nó.

---

## Ghi chú phương pháp

Mọi số trong bài đo bằng script Node đọc trực tiếp cây nguồn:
- import edge: resolve từng `import … from "…"` / `import(…)` tới file thật, đếm cặp (file nguồn, file
  đích) có cắt qua ranh giới thư mục con. Chỉ tính import tương đối — import package ngoài không tạo
  edge nội bộ.
- importer ngoài: file **không** nằm trong thư mục đó nhưng có ≥1 edge vào nó.
- Chu trình: cặp subdir A,B mà A→B và B→A.

Cách đo ban đầu bằng `git grep -l "coding-agent/src/<dir>/"` **sai**: import nội bộ là tương đối
(`../tools/x`), nên chuỗi đường dẫn đầy đủ gần như không xuất hiện — lệnh đó cho ra
`web: outside=-117`, tức số âm. Đã thay bằng phép resolve import thật ở trên.

**Hai chỗ tôi đoán sai rồi sửa lại sau khi kiểm chứng** — ghi lại vì đây là bài học về phương pháp:

1. **`tools/puppeteer/` không rỗng.** Bộ lọc `*.ts` trả về 0, nhưng thư mục chứa 14 file `.txt` là
   payload stealth mà `tools/browser/*` nạp lúc runtime. Đếm file theo phần mở rộng đơn lẻ không
   đủ để kết luận "thư mục rác".
2. **`mnemopi` ở hai nơi không phải trùng lặp.** `packages/mnemopi/` là engine tri thức
   (`core/`, `db.ts`, `migrations/`) và **không** import ngược vào `pi-coding-agent`;
   `src/mnemopi/` chỉ là client dùng `@oh-my-pi/pi-mnemopi`. Đây là phân tách đúng, không sửa.

Cả hai đều bị bắt bởi cùng một câu hỏi: **"thứ này có được dùng ở đâu không?"** — câu hỏi đó đo được,
còn "thư mục này trông có rỗng không" thì không.
