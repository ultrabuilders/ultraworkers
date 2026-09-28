# KẾ HOẠCH TỔ CHỨC LẠI PACKAGE — ĐỘ MỊN CỦA `pi`

Tài liệu này **không thuộc sáu milestone**. Nó là điều kiện tiên quyết để `MILESTONE_1B_EXECUTION_PLAN.md`
thật sự rẻ và an toàn: nếu 169 file từ `pi` không biết rơi vào đâu, thì mỗi lần chép là một dự án
riêng.

## Vì sao cần, bằng số đo

| Đại lượng | `pi` | `omp` |
|---|---|---|
| Package | 12 | 16 |
| File `.ts` | 1.564 | 5.325 |
| Dòng | 377.103 | 1.657.301 (4,4×) |
| **`coding-agent`** | 680 file · 154.200 dòng | 2.971 file · **918.868 dòng** (6,0×) |
| **Thư mục con trong `coding-agent/src`** | **9** | **67** |
| Phần lớn nhất bên trong | `core` 91 file | `tools` 149 file |
| **File giống hệt từ byte** ở 4 package dùng chung | **0** | **0** |

Chênh lệch **không nằm ở kích thước từng phần** — hai bên gần bằng nhau — mà ở **số phần**: omp
mảnh vụn mịn hơn `pi` **7,4 lần**. Đó là thứ khiến "chép rồi migrate" tốn công map tay từng file.

## Ba loại thao tác, và loại nào mới là việc thật

1. **GỘP** — giảm 67 thư mục con xuống ~10, theo hình dạng `pi`. Đổi tên thư mục + sửa import tương
   đối. **Không** đổi public API, **không** thêm package, **không** thêm entry point build. **Đây là việc
   chính, và nó rẻ hơn nhiều so với tách.**
2. **CẮT RA PACKAGE** — chỉ khi `pi` thật sự có package tương đương **và phần đó đã tồn tại ở omp**.
3. **VIẾT MỚI** — không phải di chuyển, dù nó sinh ra một package mang tên của `pi`.

Tài liệu này giữ ba loại **riêng biệt**, vì trộn chúng là cách làm một kế hoạch tổ chức lại biến
thành ảo tưởng "chuyển hết sang" — rồi tính nhầm việc viết mới vào ngân sách di chuyển.

## Luật đã ép trong lúc đo, và nó đã bắt được một đề xuất sai

> *"Đừng đề xuất cắt chỉ để giống `pi`. Mục tiêu là làm cho việc chép về sau là cơ học **và giảm vỡ
> vật lý** khi sửa. Nếu một thư mục lớn nhưng gắn chặt vào runtime của `coding-agent`, cắt ra là chi phí
> mà không đổi gì — hãy nói thẳng như vậy."*

Nó bắt được đúng một trường hợp: `ai/auth` (19 file · 10.603 dòng · **chỉ 5 importer** — rẻ nhất toàn
repo) là ứng viên **tệ nhất**, vì `pi/ai/src/auth/` đã tồn tại và omp đã đúng độ mịn.

## Cổng kiểm bắt buộc

- `bun run check:ts` exit 0 (0 lỗi, 16 package) — chạy được ngay, **không** cần addon.
- `bun test packages/tui` và `packages/ai` — chạy được; `coding-agent` thì **bị chặn một phần** bởi
  native addon (đo lại 2026-09-29: 855 pass / 1.439 fail, trong đó 1.433 lỗi là `pi-natives` chưa
  build). Vì vậy cắt bên trong `coding-agent` **không có kiểm thử đầy đủ** cho tới khi addon build
  được — đây là ràng buộc thứ tự thật, không phải lưu ý.
- Mỗi bước gộp phải là **một commit**, để hoàn tác được bằng `git revert`.
- **Bất biến số file.** Chụp `git ls-files packages/ | wc -l` **trước bước gộp đầu tiên**, và sau **mỗi**
  commit gộp chạy lại đúng lệnh đó: tổng số file trong `packages/` **không được giảm**. `prompts/` và
  `tools/puppeteer/` cũng vậy — đo riêng từng thư mục, cũng không được giảm. Cổng này không thừa: một
  file mồ côi biến mất lúc gộp **không** làm đỏ `check:ts`, và cũng **không** làm đỏ test, vì
  `coding-agent` đã đỏ sẵn (xem dòng trên). Không có phép đo này thì mất file là mất việc, và không ai
  thấy.
- Mọi thao tác ở đây là `git mv` + sửa import. **Không thao tác nào được phép xoá file**; xoá là một
  work item riêng với lý do riêng.

---

## Ứng viên tách — đã đo fan-in

> ID: `cuts`. Đo bằng script, không suy đoán. Mọi số dưới đây là output của máy.

## 0. Phương pháp — và một cảnh báo về `git grep`

Đề bài gợi ý dùng `git grep -l "<đường dẫn>" -- packages/ | wc -l`. **Cách đó sai**, và sai theo
hướng làm giảm số. Nó đếm *file có chuỗi đường dẫn trong text*, không đếm *file thực sự import*, nên:

- Nó không resolve được `import` ghi dạng package (`@oh-my-pi/pi-tui/tools/tool-errors` → `packages/tui/src/...`).
  Với omp, phần lớn import cross-package viết kiểu này, nên `git grep` bỏ sót gần hết.
- Nó không biết `exports` map trong `package.json`, nên không phân biệt subpath thật với subpath giả.
- Nó đếm trúng cả comment, chuỗi trong test fixture, và path trong `bench/`.

Script dùng ở đây: build graph thật trên 5.420 file `.ts/.tsx`, resolve qua `package.json` `exports`
(cả key chính xác, wildcard dài nhất, và `./*`), rồi đếm. **25 specifier không resolve được, tất cả
đều là fixture trong `test/`** (ví dụ `packages/tui/test/test-themes.ts`; `helper.cjs` và
`optional-missing.js` không tồn tại trong cây hiện tại) — không ảnh hưởng số.

Bằng chứng số phải dùng: cùng một thư mục, hai cách đếm

| thư mục | `git grep` (đề bài) | graph thật |
| --- | --- | --- |
| `config` | 274 | **949** |
| `session` | 203 | **769** |
| `tools` | 194 | **444** |
| `modes` | 60 | **327** |

Dùng số cột phải thì kết luận có thể ngược.

---

## 1. Số đo chính — `coding-agent/src` (67 thư mục con)

`importers` = số file **bên ngoài** thư mục đó có ít nhất một import vào bên trong.
`2-cycle` = số thư mục con khác mà nó vừa import vào vừa bị nó import lại (vòng 2 nhảy).

| dir | files | lines | importers | 2-cycle | cần thư mục con nào |
| --- | --- | --- | --- | --- | --- |
| config | 24 | 14.663 | **949** | **35** | 35 thư mục |
| session | 89 | 55.398 | **769** | — | 32 |
| tools | 149 | 61.718 | **444** | — | 34 |
| modes | 67 | 42.279 | **327** | — | 42 |
| extensibility | 68 | 21.309 | **284** | — | 18 |
| utils | 41 | 8.875 | **224** | 8 | 12 |
| cli | 78 | 26.294 | 148 | — | 30 |
| capability | 18 | 2.083 | 136 | 4 | 4 |
| internal-urls | 29 | 8.023 | 110 | 6 | 18 |
| registry | 3 | 1.813 | 97 | 3 | 6 |
| mcp | 26 | 10.818 | 97 | 6 | 9 |
| discovery | 29 | 9.486 | 86 | 4 | 7 |
| web | 117 | 27.444 | 66 | 3 | 9 |
| slash-commands | 26 | 7.038 | 65 | 3 | 23 |
| eval | 56 | 14.360 | 126 | 4 | 14 |
| task | 29 | 13.667 | 125 | 8 | 19 |
| launch | 12 | 3.227 | 39 | 2 | 4 |
| exec | 5 | 1.492 | 38 | 3 | 3 |
| tiny | 14 | 2.873 | 38 | 1 | 6 |
| collab | 10 | 4.672 | 38 | 2 | 6 |
| hindsight | 10 | 3.122 | 34 | 3 | 5 |
| advisor | 12 | 3.838 | 31 | 2 | 7 |
| export | 7 | 2.145 | 30 | 3 | 4 |
| lsp | 25 | 9.906 | 31 | 2 | 8 |
| secrets | 9 | 3.720 | 25 | 2 | 2 |
| subprocess | 2 | 1.074 | 25 | **0** | **NONE** |
| async | 4 | 1.774 | 50 | 2 | 2 |
| edit | 8 | 1.611 | 49 | 3 | 5 |
| commit | 51 | 7.693 | 21 | **1** | 6 |
| blob-broker | 27 | 8.944 | 18 | 3 | 6 |
| tts | 13 | 2.521 | 17 | 1 | 6 |
| security | 20 | 4.897 | 16 | 2 | 8 |
| stt | 13 | 2.463 | 12 | 1 | 5 |
| ssh | 5 | 1.448 | 15 | **0** | **NONE** |
| commands | 52 | 3.515 | 14 | 2 | 16 |
| ida | 9 | 2.077 | 9 | 3 | 6 |
| stream | 12 | 2.375 | 8 | 1 | 3 |
| autoresearch | 10 | 3.245 | 5 | **0** | 3 |
| dap | 5 | 4.032 | 5 | 1 | 5 |
| cleanse | 7 | 3.272 | 3 | **0** | 7 |
| compress | 4 | 671 | 2 | **0** | 6 |
| if-bench | 4 | 779 | 2 | **0** | 2 |
| exa | 3 | 435 | 1 | 0 | 2 |

Cột `importers` là **chi phí**, không phải **giá trị**. Số lớn = đắt. Số nhỏ = rẻ.

---

## 2. Public API: gần như không phải rào cản

Đo bằng graph, chỉ những file **ngoài** `packages/coding-agent/`:

```
1  tui           -> coding-agent (root barrel ".")
1  browser-relay -> coding-agent (root barrel ".")
tổng cộng: 2 file, 1 subpath duy nhất = "."
```

Và `packages/coding-agent/package.json` có **119 export key**, trong đó đã có `./*` wildcard →
`./src/*.ts`. Nghĩa là **mọi** thư mục con hiện đã "public" theo nghĩa exports.

Hệ quả trực tiếp, nói thẳng: **"cắt có phá public API không" gần như là câu hỏi rỗng ở đây.**
Không có consumer ngoài nào để phá. Cái duy nhất phải giữ là `src/index.ts` (root barrel) — vì
`tui` và `browser-relay` dùng nó. Nếu package mới không re-export đúng những gì root barrel đang
export thì mới vỡ, và đó là việc sửa trong 1 file, không phải việc migrate 1000 file.

Chi phí thật nằm ở **số import statement phải viết lại**, tức cột `importers`.

---

## 3. `tui/src` — KHÔNG cắt

| dir | files | lines | importers | needs |
| --- | --- | --- | --- | --- |
| theme | 14 | 4.985 | **588** | components |
| tools | 60 | 19.319 | **388** | 4 |
| overlays | 70 | 31.176 | 190 | 9 |
| render | 14 | 3.045 | 173 | 3 |
| chrome | 27 | 3.571 | 138 | 3 |
| components | 40 | 16.982 | 132 | 2 |
| chat | 32 | 8.184 | 120 | 7 |
| prompt | 29 | 6.528 | 80 | 5 |
| status-line | 13 | 5.789 | 57 | 5 |
| apps | 24 | 8.423 | 40 | 6 |
| setup | 15 | 2.307 | 5 | 7 |

9/10 thư mục có fan-in > 50. Chỉ `setup` (5 importer) là yếu, mà nó cần 7 thư mục khác → cắt ra sẽ
kéo theo cả 7. Đây là **xương sống**, không phải lá.

pi tương ứng: `pi/tui/src` chỉ có **1** thư mục con (`components`, 18 file) + 25 file `.ts` ở gốc.
Tức pi đã **làm phẳng** tui. Xem mục *Mô hình tổng thể* — đây là lý do thao tác đúng ở tui là **gộp**, không phải cắt.

## 4. `ai/src` — 15 thư mục, pi có 5

| dir | files | lines | importers | needs |
| --- | --- | --- | --- | --- |
| providers | 75 | 57.999 | **432** | 12 |
| utils | 46 | 13.955 | **224** | 3 |
| error | 16 | 2.692 | **220** | 1 |
| registry | 49 | 6.201 | **130** | 3 |
| usage | 25 | 7.971 | 44 | 4 |
| dialect | 26 | 6.120 | 35 | 1 |
| auth-broker | 9 | 4.434 | 28 | 4 |
| auth-gateway | 13 | 2.810 | 22 | 9 |
| **auth** | 19 | 10.603 | **5** | 4 |
| images | 8 | 896 | 4 | 1 |
| judgment / video / speech / transcription / embeddings / rerank | 3-5 | 172-725 | 3-5 | 1 |

`ai/auth` (19 file, 10.603 dòng, **5 importer**) là ứng viên cắt đẹp nhất toàn repo về mặt số — nhưng
**pi đã có `pi/ai/src/auth/` (17 file)**. Nó đã đúng độ mịn rồi. Cắt nó thành *package* là đi ngược mục
tiêu "giống pi". Đây là ví dụ điển hình cho bẫy "số nhỏ ⇒ cắt được": số nhỏ chỉ nói *rẻ*, không nói *đúng hướng*.

---

## 5. Đối chiếu với `pi`

`pi/coding-agent/src` có **8** thư mục con (đề bài ghi 9; đếm `*/` cho 8, cộng `prompts` không tồn tại ở pi).
`omp/coding-agent/src` có **67**.

Nhưng `pi/core/` (91 file) **không phải** 91 file phẳng — nó là **52 file `.ts` nằm thẳng ở gốc `core/`**
cộng 4 thư mục con (`tools` 24, `extensions` 8, `compaction` 4, `export-html` 3). Một số file rất to:
`agent-session.ts` 137 KB, `package-manager.ts` 84 KB, `resource-loader.ts` 42 KB, `model-runtime.ts` 32 KB.

**pi mịn hơn ở cấp package, thô hơn ở cấp thư mục.** Pi có 12 package với những thứ mà omp để nằm trong
`coding-agent`: `chord` (29 file, composition/RPC/plugin), `durable` (29 file, storage + session
transaction/publication), `protocol` (8, CBOR codec+framing), `client` (8), `server` (16), `telemetry` (6),
`evals` (5).

omp có 16 package nhưng phần thừa là `collab-web`, `metaharness`, `mnemopi`, `snapcompact`, `stats`,
`browser-relay`, `wire` — không trùng vai trò nào với `chord`/`durable`/`protocol`/`server`.

Ghép cặp có cơ sở (dựa trên tên file, đã đối chiếu):

| pi package | tương đương omp gần nhất | nhận xét |
| --- | --- | --- |
| `durable` (storage, session transaction/publication, forks) | `coding-agent/src/blob-broker` (storage, publication, daemon) | khớp tốt nhất — cùng ~27-29 file, cùng vai storage+publication |
| `chord` (services/state, wire, handle, provider, instances) | `collab` + `irc` + `registry` (15 file) | omp tách nhỏ hơn, chưa có package gộp |
| `protocol` (codec, framing, cbor) | package `wire` (3 file) + `stream/protocol.ts` | `wire` đã là package nhưng chỉ 3 file |
| `client` + `server` (transport, session-router) | **không có** | omp không tách transport ra package |
| `telemetry` (6 file) | `telemetry-export*.ts` (2 file ở gốc src) | quá nhỏ để đáng tách |

---

## 6. Đề xuất cắt — xếp theo chi phí tăng dần

Ngưỡng phân loại, dựa trên số đo:

- **≤ 10 importer + 0 vòng 2 nhảy** → cắt cơ học. 1 lần `sed`, 1 lần `bun check`.
- **11-40 importer** → cắt được nhưng phải rà lại barrel. 2 lần `bun check`.
- **41-150** → cần seam cho type, đây là việc thiết kế chứ không phải đổi tên. 3 lần `bun check`.
- **> 200** → xương sống. Cắt là chi phí không đổi gì.

### Nhóm A — cắt ngay, cơ học (0 vòng, ≤ 5 importer)

| ứng viên | files | lines | importers | cần gì | pi tương đương |
| --- | --- | --- | --- | --- | --- |
| `subprocess` | 2 | 1.074 | 25 | **NONE** | không có |
| `ssh` | 5 | 1.448 | 15 | **NONE** | không có |
| `cleanse` | 7 | 3.272 | 3 | config irc registry session task tools utils | không có |
| `autoresearch` | 10 | 3.245 | 5 | exec extensibility session | không có |
| `compress` | 4 | 671 | 2 | 6 thư mục | `core/compaction/` |
| `if-bench` | 4 | 779 | 2 | cli config | không có |
| `exa` | 3 | 435 | 1 | extensibility mcp | không có |

`cleanse`/`autoresearch` có 0 vòng 2 nhảy nên cắt thuần vị trí. Nhưng cả hai đều là **tính năng omp có,
pi không có** — cắt chỉ để tách khỏi `coding-agent`, không phải để khớp pi. Xem mục 7.

### Nhóm B — cắt được, đáng làm (1-2 vòng, ≤ 21 importer)

| ứng viên | files | lines | importers | 2-cycle | cần gì | pi tương đương |
| --- | --- | --- | --- | --- | --- | --- |
| `dap` | 5 | 4.032 | 5 | 1 | discovery exec jsonrpc lsp tools | không có |
| `stream` | 12 | 2.375 | 8 | 1 | config launch secrets | `telemetry` (yếu) |
| `commit` | 51 | 7.693 | 21 | 1 | config edit extensibility session task tools | `core/` (phẳng) |
| `commands` | 52 | 3.515 | 14 | 2 | 16 thư mục | `core/slash-commands.ts` |
| `blob-broker` | 27 | 8.944 | 18 | 3 | cli config launch session ssh subprocess | **`durable`** |
| `stt` / `tts` | 13 | ~2.500 | 12/17 | 1 | config downloads subprocess tiny utils | `ai/speech`, `ai/transcription` |
| `security` | 20 | 4.897 | 16 | 2 | 8 thư mục | không có |
| `ida` | 9 | 2.077 | 9 | 3 | cli config eval launch subprocess tools | không có |

**`commit` là ứng viên tốt nhất trong `coding-agent`**: 7.693 dòng, chỉ 21 importer, 1 vòng 2 nhảy.

**`blob-broker` là ứng viên tốt nhất nếu muốn khớp pi**: nó là thứ gần nhất với `pi/durable`
(storage/publication/daemon, 27 vs 29 file), và omp đang để nó nằm trong `coding-agent` trong khi pi
để nó ngoài.

### Nhóm C — cắt được nhưng phải làm seam (41-150 importer)

`capability` (136), `internal-urls` (110), `registry` (97), `mcp` (97), `discovery` (86),
`web` (66), `slash-commands` (65), `eval` (126), `task` (125), `launch` (39→B), `async` (50), `edit` (49).

Đặc biệt `web`: **117 file / 27.444 dòng** nhưng chỉ 66 importer — tỉ lệ ngon nhất trong các thư mục lớn.
Nhưng nó cần 9 thư mục con (`config exa extensibility lib mcp prompts session tools utils`) và có 3 vòng.
Và cần nói thẳng một điều dễ nhầm: **`web/` không phải web server**. Nó là *web search provider*
(`firecrawl.ts`, `kagi.ts`, `parallel.ts`, `scrapers/`, `search/`). Nó **không** tương ứng với
`pi/client` + `pi/server` + `pi/protocol`. Đừng map nó sang đó.

---

## 7. Cạm bẫy: "rẻ" ≠ "đúng hướng"

`ai/auth`: 19 file, 10.603 dòng, **5 importer**, 4 thư mục phụ thuộc → theo mọi tiêu chí định lượng
đây là ứng viên cắt đẹp nhất toàn repo. Nhưng `pi/ai/src/auth/` **đã tồn tại** (17 file). Nó đã đúng
độ mịn rồi. Cắt nó thành package là đi ngược mục tiêu.

Tương tự: `commit`, `commands`, `dap`, `stream`, `security`, `tts`, `stt`, `ida`, `cleanse`,
`autoresearch`, `compress` — **pi không có thứ tương ứng nào**. Chúng là sản phẩm riêng của omp.
Cắt chúng ra package **không làm việc chép từ pi dễ hơn**; nó chỉ giảm số thư mục con.

Mục tiêu đã nêu là *chép từ pi thành cơ học* + *giảm vỡ vật lý*. Với phần lớn thư mục trong Nhóm B/C,
cắt package **không phục vụ mục tiêu đó**. Xem mục *Mô hình tổng thể*.

---

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
từ `scrapers/` ngược lại `search`. Tách `web/scrapers` ra thư mục cấp 2
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
`tools/puppeteer` **14 file `.txt` + 0 file `.ts`** (**KHÔNG xoá** — xem mục 4.6; thư mục này trông rỗng
chỉ vì ta đếm sai đuôi file). 84 file nằm ở gốc `tools/`. Nhưng đây là cải tổ nội bộ, không phải tách
package.

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

> **Mục 4.2 đã gỡ câu sai này và trỏ tới đây.** Mục 4.2 từng ghi `tools/puppeteer` là *"0 file (thư
> mục rỗng — nên xoá)"*. **Câu đó sai và đã bị gỡ.** Xoá ở đây là **hỏng build**, không phải dọn rác —
> lý do ở hai đoạn kế.

Đếm `*.ts` cho ra 0 nên tôi định ghi "xoá". Sai. Thư mục này chứa **14 file `.txt`** —
`00_stealth_tampering.txt` … `13_stealth_worker.txt` — là payload chống-detect của trình duyệt nhúng.
Nó được nạp bởi **đúng một file**: `tools/browser/launch.ts:16-29`, `import` **tĩnh** cả 14 payload
với `with { type: "text" }` (đo: `git grep -ln 'puppeteer/.*\.txt' -- packages/coding-agent/src` →
một dòng kết quả). Vì là import tĩnh chứ không phải `readFile` lúc chạy, xoá thư mục này làm đỏ
`check:ts` — cổng ở mục *Cổng kiểm bắt buộc*.
*(Đính chính 2026-09-28: bản gốc của mục này ghi "10 file" và kèm danh sách 10 tên; cả hai đều sai —
trong danh sách ấy chỉ `launch.ts` thật sự nạp payload, các file còn lại không import tới
`tools/puppeteer/`.)*

Đây chính xác là bẫy của việc đếm file theo phần mở rộng: một thư mục "0 dòng TypeScript" có thể là
thư mục rác, **hoặc** có thể là payload dữ liệu mà code khác nạp lúc runtime. Ở đây là vế thứ hai.
Giữ nguyên.

### 4.7 `prompts/` — 227 file `.md`, 0 dòng TS

Prompt assets, không phải code. Không tính vào việc cắt code, nhưng **đây là thứ chép từ `pi` dễ
vỡ nhất** — chép logic thì sửa được, chép prompt thì sai một dòng là hỏng hành vi, và test không bắt
được.

---

## 5. Public API — rào cản thật, không phải rào cản giả

`package.json` có **119 export key**, gồm:
- `"." ` → `./src/index.ts`
- `"./*"` → `./src/*.ts`  ← **wildcard: bất kỳ đường dẫn nào trong `src/` cũng là public API**
- 49 subpath tường minh (`./capability`, `./modes`, `./tools`, `./lsp`, …) + 70 wildcard tương ứng

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
2. **`prompts/` 227 file `.md`**. Prompt là nơi chép từ `pi` vỡ nhiều nhất — chép logic thì sửa được,
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
   payload stealth mà **đúng một file** — `tools/browser/launch.ts` — nạp lúc runtime. Đếm file
   theo phần mở rộng đơn lẻ không đủ để kết luận "thư mục rác".
2. **`mnemopi` ở hai nơi không phải trùng lặp.** `packages/mnemopi/` là engine tri thức
   (`core/`, `db.ts`, `migrations/`) và **không** import ngược vào `pi-coding-agent`;
   `src/mnemopi/` chỉ là client dùng `@oh-my-pi/pi-mnemopi`. Đây là phân tách đúng, không sửa.

Cả hai đều bị bắt bởi cùng một câu hỏi: **"thứ này có được dùng ở đâu không?"** — câu hỏi đó đo được,
còn "thư mục này trông có rỗng không" thì không.

---

## Đường cắt trong `tui` và `ai`

Nhiệm vụ: cắt `tui` và `ai` để chép từ `pi` về sau thành thao tác cơ học.
Đo bằng script phân giải `exports` map thật của từng package, không đoán, không `grep` chuỗi.

**Cách đo (lặp lại được):** script đo từng chạy nằm ở `/tmp` (`imp6.mjs`) và **không được giữ trong
repo** — nó không còn tồn tại, nên các số dưới đây **không tái lập được** từ cây này. Nó dựng map
`importer → target` từ *toàn bộ* `packages/**/*.ts`
(5.325 file), phân giải cả đường dẫn tương đối lẫn bare specifier `@oh-my-pi/*` qua `exports` map
của từng `package.json`. Số "file bên ngoài import vào" = số file *duy nhất* nằm ngoài thư mục đang xét
mà import trực tiếp bất kỳ file nào trong thư mục đó (hoặc `index.ts` của nó).

> **Cảnh báo về cách đo:** hai lỗi trong bản đầu làm số sai hoàn toàn, đã sửa và đo lại.
> (1) `git grep -l "tools/"` khớp mọi thứ — `tools/` xuất hiện ở `coding-agent/src/tools` chứ không phải
> `tui/src/tools`; con số "766 file" là rác. (2) Bản phân giải đầu tiên dùng nguyên văn `"./*": "./src/*.ts"`,
> chỉ khớp specifier kết thúc đúng `.ts`, nên bỏ sót mọi subpath lồng nhau không đuôi (`apps/git/git-tui`).
> Lỗi (2) làm `tui/src/apps` ra **2** thay vì **40**. Mọi con số dưới đây lấy từ bản đã sửa.
> Bài học: đo import bằng `grep` trên repo này cho kết quả sai theo hướng không thể đoán trước.

---

## 0. Bối cảnh đo được

| | `pi` (HEAD d6af72e) | `omp` | tỉ lệ |
|---|---|---|---|
| `tui` file / dòng | 32 / 27.000 | **499 / 147.778** | 15,6× / 5,5× |
| `ai` file / dòng | 24 / 95.000 | **344 / 125.860** | 14,3× / 1,3× |
| thư mục con trong `src` | `tui` 1 (`components/`), `ai` 5 | `tui` 13, `ai` 18 | — |

**File giống hệt từ byte: `tui` 0/24, `ai` 0/11** (24 và 11 là số file có *cùng đường dẫn* ở cả hai cây;
không file nào trong số đó trùng nội dung). Con số 0 này giống hệt phát hiện đã nêu ở phần tổng thể,
giờ đã xác nhận riêng cho hai package này bằng `cmp` từng cặp.

Hai chênh lệch **về bản chất**, không phải về số lượng:

1. **`tui`: `omp` đã mịn hơn `pi`, không kém.** `pi` gộp `tui.ts` 1.473 + `tui-alt-screen.ts` 1.745 +
   `tui-main-screen.ts` 655 vào một khối ~3.900 dòng. `omp` có `tui.ts` 3.634 dòng *đã tách sẵn*, cộng
   `terminal-capabilities.ts` 1.556, `deccara.ts`, `glyph-protocol.ts`, `app-keybindings.ts` 668,
   `kitty-graphics.ts` mà `pi` không có. `pi` có đúng **một** thư mục con (`components/`); `omp` có 13.
   → **Trong `tui`, copy từ `pi` không phải là điều chỉnh độ mịn — `pi` thô hơn.** Việc chép là copy
   *vào chỗ đã mịn hơn*, nên phải map thủ công theo file, không theo thư mục.

2. **`ai`: chênh lệch là triết lý, không phải bố cục.** `pi/ai/src/providers/` = 60 file *mỗi file
   ~600 byte* — chỉ là descriptor trỏ tới model. `omp/ai/src/providers/` = 69 file, **57.999 dòng**,
   với `anthropic.ts` 233 KB, `cursor.ts` 199 KB, `openai-codex-responses.ts` 192 KB,
   `openai-responses-wire.ts` 169 KB, `openai-shared.ts` 159 KB. Tức `omp` đã chọn hướng *wire protocol
   tay viết*; `pi` chọn *descriptor + catalog*. **Đây là hai bản thiết kế khác nhau, không phải cùng
   một bài toát với độ mịn khác nhau.** Copy `providers/` từ `pi` sang `omp` sẽ *xoá* 58k dòng wire
   code, không phải tái tạo nó.

---

## 1. Bảng đo `tui/src` (13 thư mục con)

`ngoài` = file bên ngoài thư mục import vào; `xoá` = trong đó thuộc package khác (tức `coding-agent`).

| thư mục | file | dòng | ngoài | xoá | từ ai |
|---|---|---|---|---|---|
| `tools` | 60 | 19.319 | 388 | **339** | coding-agent |
| `theme` | 14 | 4.985 | 589 | **313** | coding-agent + tui |
| `overlays` | 70 | 31.176 | 190 | **148** | coding-agent |
| `chrome` | 27 | 3.571 | 138 | 46 | coding-agent + tui |
| `render` | 14 | 3.045 | 173 | 66 | coding-agent + tui |
| `components` | 40 | 16.982 | 132 | **2** | gần như chỉ tui |
| `chat` | 32 | 8.184 | 120 | 91 | coding-agent |
| `prompt` | 29 | 6.528 | 80 | 55 | coding-agent |
| `status-line` | 13 | 5.789 | 57 | 48 | coding-agent |
| `apps` | 24 | 8.423 | 40 | 31 | coding-agent |
| `setup` | 15 | 2.307 | 5 | 4 | coding-agent |

**Không thư mục nào ở `tui` đủ rời để cắt thành package mới.** Số nhỏ nhất là `setup` (5), nhưng nó
import *gần như mọi anh chị* — xem §3. `components` có 132 người import nhưng 130 trong chính `tui`.

## 2. Bảng đo `ai/src` (18 thư mục con)

| thư mục | file | dòng | ngoài | xoá | từ ai |
|---|---|---|---|---|---|
| `providers` | 75 | 57.999 | 434 | 156 | coding-agent, agent, catalog |
| `utils` | 46 | 13.955 | 224 | 103 | coding-agent, agent |
| `error` | 16 | 2.692 | 220 | 49 | coding-agent, agent, mnemopi |
| `registry` | 49 | 6.201 | 130 | 36 | coding-agent, catalog, tui |
| `usage` | 25 | 7.971 | 44 | 3 | gần như chỉ ai |
| `dialect` | 26 | 6.120 | 35 | 10 | agent |
| `auth-broker` | 9 | 4.434 | 28 | 15 | coding-agent, catalog, stats |
| `auth-gateway` | 13 | 2.810 | 22 | 1 | gần như chỉ ai |
| **`auth`** | **19** | **10.603** | **2** | **0** | **chỉ 2 file trong `ai`** |
| `images` | 8 | 896 | 4 | 0 | chỉ ai |

Nhóm `embeddings` (3 file/175), `judgment` (5/725), `rerank` (3/172), `speech` (5/210),
`transcription` (3/199), `video` (3/319) — tổng 22 file / 1.800 dòng, mỗi nhóm dưới 5 importer.
Đây là ứng viên gộp, không phải ứng viên tách.

---

## 3. Ứng viên TÁCH

### 3.1 `ai/src/auth` → package `@oh-my-pi/pi-auth` — **CÓ, cắt được** (ứng viên mạnh nhất)

Đây là ứng viên duy nhất trong hai package đã vượt qua cả ba tiêu chí.

- **Số đo:** 19 file · 10.603 dòng · **2 file ngoài import vào, 0 file ngoài package**. Hai file đó là
  `auth-retry.ts` và `auth-storage.ts`, đều nằm trong `ai`.
- **Vòng import ngược:** không. `auth/` **không có** `index.ts`, không được export qua barrel
  (`packages/ai/src/index.ts` không chứa dòng nào `export … from "./auth"`). Không ai import nó qua
  đường công khai — chỉ qua đường tương đối nội bộ.
- **Phụ thuộc runtime `coding-agent`:** không. `ai` không hề có `pi-coding-agent` trong deps
  (đã kiểm: 0 import).
- **Trách nhiệm:** đây là *credential store* (SQLite, pool, OAuth refresh, rotation, blocks) —
  một miền nghiệp vụ riêng, không phải "gọi LLM". Nó không thuộc về `ai` về mặt khái niệm.
- **Hai chiều đi vào/đi ra:** `auth/` **đi ra** 61 import (`../usage` 24, `../registry` 12, `../error` 10,
  `../types` 9, `../stream` 3) — đây là cản trở thật. `auth/` **đi vào** từ `usage/claude-reset.ts`,
  `usage/xai-oauth.ts`, `auth-retry.ts`, `auth-storage.ts`.
  → **Cắt được, nhưng phải trả nợ trước:** `auth/` cần `usage`/`registry`/`error`, mà `usage` lại cần
  ngược lại `auth`. Đây là vòng phụ thuộc nội bộ *bên trong* `ai`. Không phải vòng ở mức package
  (nếu tách `auth` ra, vòng đó **vẫn còn** giữa `pi-auth` và `pi-ai`, và sẽ cần `pi-auth` khai báo
  dependency ngược lên `pi-ai`).
- **Chi phí:** 2 import đổi (`auth-retry.ts`, `auth-storage.ts`), 0 phá public API (vì chưa có public
  API nào), thêm 1 `package.json` + export map, `bun run check:ts` khoảng 2–3 lần (1 lần sau khi
  dựng khung, 1 lần sau khi sửa import, 1 lần xác nhận sạch).
- **Rủi ro cụ thể nếu cắt sai:** mất vòng phụ thuộc `auth ↔ usage` hiện đang được TypeScript kiểm
  trong *một* `tsconfig`; tách ra là nó thành vòng giữa hai project và `tsgo` sẽ báo lỗi kiểu ở chỗ
  khó đoán. `auth/sqlite-credential-store.ts` 74 KB dùng `bun:sqlite` — cần chắc chắn không ai
  monkey-patch `Bun.*` toàn cục (AGENTS.md cấm, nhưng cần test-suite-safe).
- **Ưu tiên:** **cao nhất trong hai package này.** Đây là thứ duy nhất đo ra là cắt được.

### 3.2 `tui/src/apps` → `@oh-my-pi/pi-tui-apps` — **KHÔNG, đừng cắt**

- 24 file · 8.423 dòng · 40 file ngoài import vào, 31 từ `coding-agent`.
- Nghe thì "40 là ít" — nhưng 31 file đó là *các entrypoint CLI thật*:
  `cli/git-tui.ts`, `cli/ps-cli.ts`, `debug/index.ts`, `main.ts`, `if-bench/runner.ts`…
- Cắt ra package mới = đổi 31 file import + thêm 1 package. **Đổi lấy gì?** Không có phụ thuộc nào
  của nó với `tui` để cắt, và nó là TUI thuần (dùng `components/`, `theme/`, `render/` của `tui`).
- Chi phí/giá trị: **xấu.** 3.2 — không cắt.

### 3.3 Nhóm `embeddings`+`judgment`+`rerank`+`speech`+`transcription`+`video` — **KHÔNG cắt, hãy GỘP**

22 file / 1.800 dòng, mỗi nhóm < 5 importer, tất cả nằm trong `ai`. Đây là **over-fragmentation**,
chiều ngược với mục tiêu. Mỗi cái là một `exports` entry riêng trong `package.json` cho
vài trăm dòng. Gộp thành một `ai/src/capabilities/` sẽ **giảm** số điểm cần map khi chép.
→ Không phải ứng viên tách. Là ứng viên **gộp** (xem §5).

---

## 4. KHÔNG cắt — và nói thẳng vì sao

Đây là phần quan trọng nhất của báo cáo. Bảy thư mục dưới đây *trông* giống ứng viên (lớn, ít importer
tương đối) nhưng cắt ra là **chi phí mà không đổi gì**:

| thư mục | vì sao không cắt (đo được) |
|---|---|
| **`tui/src/setup`** (5 importer) | Số importer nhỏ nhất, **nhưng** import **gần như toàn bộ `tui`**: `../components/{input,select-list,spacer,tab-bar,text,wizard-step}`, `../overlays/{composer-shape-preview,composer-shape-registry,model-browser,model-picker,oauth-selector}`, `../prompt/welcome`, `../chrome/{keybinding-hints,shared}`, `../tools/web-search`, `../render/utils`, `../theme/theme`, `../terminal-capabilities`, `../tui`, `../keys`, `../mouse`, `../utils`, `../app-keybindings` — **20+ mục tiêu**. Cắt ra = vòng ngược với cả package. Chỉ hợp lý khi *giữ nguyên trong `tui`*. |
| **`tui/src/components`** | 132 importer nhưng **130 ở trong `tui`** → 2 file ngoài. Nhìn như "ít phụ thuộc ra ngoài" nhưng thực ra là **mắt xích trung tâm của `tui`**: 31 import nội bộ từ `components/`, và nó là nền của `setup`/`overlays`/`prompt`. Cắt ra = biến thành điểm nghẽn, tăng nghẽn, không giảm gì. |
| **`tui/src/tools`** (339 từ `coding-agent`) | 569 câu import từ 337 file của `coding-agent`. Đây là bề mặt công khai đã export (`"./tools"` trong export map). Tách = phá API + 569 import. **Không đáng.** |
| **`tui/src/overlays`** (148) / `chat` (91) / `theme` (313) / `render` (66) / `chrome` (46) / `status-line` (48) / `prompt` (55) | Đều > 45 importer từ `coding-agent` và đều là entry trong `exports` map. Tách = đổi hàng trăm import để đổi lấy một ranh giới package mà không ai yêu cầu. |
| **`ai/src/providers`** (156) | 58k dòng, nhưng là **điểm khác biệt triết lý với `pi`, không phải độ mịn**. `pi` dùng descriptor 600 byte; `omp` dùng wire code tay. Cắt `providers` ra package riêng sẽ *giữ nguyên* bất đồng này và thêm chi phí. Xử lý đúng là ở §5, không phải bằng cách tách thư mục. |
| **`ai/src/utils`** (103) / `error` (49) | Đã là subpath export công khai, importer rải khắp 3 package. Tách = đổi 224/220 import. |
| **`ai/src/registry`** | 130 importer, 36 ngoài package, **và trùng tên với `catalog`** — xem cảnh báo §5.1. Không tách, phải *hợp nhất*. |

---

## 5. Việc thật sự đáng làm (không phải cắt)

### 5.1 `ai/src/registry` ↔ `packages/catalog` — trùng lặp chưa giải quyết

9 tên file trùng ở cả hai nơi: `anthropic.ts`, `cursor.ts`, `cloudflare-ai-gateway.ts`,
`coreweave.ts`, `alibaba-token-plan.ts`, `build.ts`, `types.ts`, `index.ts`, `github-copilot.ts`.
`ai` import `catalog` ở **100 file**; `catalog` không hề khai báo `pi-ai` trong `package.json` (chỉ
`omptype`, `pi-utils`) — 4 "import" ngược lại **chỉ là dòng chú thích trong docblock**, không phải
import thật. Vậy **không có vòng ở mức package**; `catalog` sạch và là tầng dưới đúng.
→ Việc đáng làm: **gộp `registry` vào `catalog`** (dữ liệu provider không thuộc tầng gọi LLM), hoặc
chấp nhận trùng tên và ghi rõ ranh giới. Hiện trạng là 130 importer + 9 tên trùng mà không có doc nào
nói ranh giới nào thuộc đâu.

### 5.2 `ai`: ba thư mục auth cạnh tranh nhau

`ai/src/auth` (10.603 dòng, credential store) · `ai/src/auth-broker` (4.434, client/server cho tiến
trình riêng) · `ai/src/auth-gateway` (2.810, HTTP) — cộng thêm `auth-storage.ts` và `auth-retry.ts`
nằm rời ở gốc `src/`. Cùng một miền, **5 điểm vào**, và `auth-storage.ts` là lớp composer bọc
`./auth/*` thành namespace. Khi chép từ `pi`, không có cách nào biết "auth" của `pi` rơi vào đâu
trong 5 chỗ này.
→ Việc đáng làm: **gộp `auth-broker` + `auth-gateway` vào `auth/`** thành một miền, rồi tách cả
miền ra package (§3.1). Đây mới là thứ làm việc chép về sau thành cơ học — không phải vì giống `pi`,
mà vì hiện tại "auth" có 5 điểm neo và người chép không có cách nào đoán.

### 5.3 `tui`: 13 thư mục cho 13 miền, nhưng file lớn nằm rời

Các file lớn nhất của `tui` đều là file rời ở gốc `src/`, không thuộc thư mục nào:
`tui.ts` 3.634 dòng (124 importer), `terminal.ts` 2.320 (30), `terminal-capabilities.ts` 1.556 (39),
`latex-to-unicode.ts` 2.203 (4), `latex-block.ts` 1.449 (3).
`latex-*` (3.652 dòng) chỉ có **3 và 4** importer — đây mới là ứng viên tách thật sự mà §1 bỏ sót.
`pi` có `latex.ts` 1.506 dòng làm một file; `omp` có 2 file. Với 7 importer tổng cộng và
zero phụ thuộc runtime, gộp về một file hoặc một thư mục `latex/` là cải thiện thật.
`pi/ai` có `utils/`; `omp/tui` không có thư mục `utils/` mà để mọi thứ trong `utils.ts` 1.100 dòng.

---

## 6. Chi phí và số lần `bun run check:ts`

`check:ts` = `check:tools` + `check:types` tuần tự trên từ�ng package. Thời gian đo được: **một lần
toàn repo ~3–5 phút**. Mỗi đổi tên đường dẫn hàng loạt = 1 vòng sửa + 1 vòng `check:ts`.

| việc | import đổi | phá public API | `check:ts` |
|---|---|---|---|
| Tách `ai/src/auth` | 2 | không (chưa có API công khai) | 2–3 |
| Gộp `auth-broker`+`auth-gateway` vào `auth/` | ~20 | không (đều là subpath nội bộ) | 1–2 |
| Gộp 6 nhóm capability nhỏ của `ai` | 0 (chỉ barrel) | không (giữ alias) | 1 |
| Gộp `latex-*` của `tui` | ~7 | không (giữ alias export) | 1 |
| **Tổng đề xuất** | **~29** | **không** | **~5** |

Ngân sách cả gói reorg `tui`+`ai` nằm gọn trong ~30 import và ~5 lần `check:ts`. Mọi thứ lớn hơn
(providers, tools, components, overlays) đều **không nên đụng** theo số đo ở §1–§4.

---

## 7. Rủi ro cụ thể

- **Cắt `ai/src/auth` mà không xử lý vòng `auth ↔ usage`:** `auth/` import `../usage` 24 lần và
  `../registry` 12 lần; `usage/claude-reset.ts` + `usage/xai-oauth.ts` import ngược vào `auth/`.
  Tách package mà không tách `usage` ra cùng lúc ⇒ vòng phụ thuộc giữa hai `package.json` mà
  `tsgo` báo lỗi kiểu ở những file không liên quan trực tiếp. Sửa bằng cách đổi type sang
  `import type` chỉ che triệu chứng, không xử lý gốc.
- **Gộp 6 nhóm capability của `ai` mà bỏ alias:** `packages/ai/src/index.ts` đang
  `export * from "./embeddings"` … `export * from "./video"` — cả 6 đều là public subpath trong
  `exports` map. Bỏ là phá API cho `coding-agent` và cho người dùng SDK ngoài.
- **Đụng `tui/src/tools`:** 569 câu import từ 337 file. Đổi tên hàng loạt → tiếng Anh "sửa lỗi
  không liên quan" ở khắp `coding-agent`, không dễ phân biệt với lỗi thật.
- **Đụng `ai/src/providers`:** 121 file `coding-agent` import từ đây, và 21 từ `agent`. Bất kỳ đổi
  tên subpath nào là 142 file phải sửa, trong khi `pi` và `omp` *không dùng chung tên provider* —
  nên không có cơ chế "chép" nào hoạt động ở đây dù đã cấu trúc lại thế nào.

---

## 8. Kết luận

1. **`tui` không cần cắt.** Nó đã mịn hơn `pi` (13 thư mục + file tách sẵn so với 1 thư mục).
   Bảy thư mục có > 45 importer từ `coding-agent` và đều là public subpath → cắt là thua.
   Cải thiện rẻ nhất: gộp `latex-*` (7 importer) và gom `utils.ts` vào `utils/`.
2. **`ai` có đúng MỘT ứng viên tách thật: `ai/src/auth`** (19 file · 10.603 dòng · 2 importer ·
   0 cross-package · không có trong barrel). Cắt kèm `auth-broker` + `auth-gateway` để thành
   một miền auth duy nhất — việc này làm việc chép về sau cơ học *vì* xoá 5 điểm neo thành 1,
   chứ không phải vì giống `pi`.
3. **`ai/src/registry` vs `packages/catalog` là trùng lặp thật** (9 tên file trùng) và cần một
   quyết định hợp nhất; `catalog` sạch (không có vòng), nên `ai → catalog` là hướng đúng.
4. **Sự chênh `ai/providers` 58k dòng vs `pi` 600 byte là khác biệt thiết kế, không phải độ mịn.**
   Cấu trúc lại thư mục không xử lý được; và cũng không nên — mục tiêu là giảm vỡ vật lý khi sửa,
   không phải hội tụ về `pi`.
5. Không đề xuất nào ở đây nhằm "giống `pi"`. Mọi đề xuất đều dựa trên số importer đo được.

---

## Mô hình tổng thể: thứ tự, và cái KHÔNG cắt

> Đọc mục *Ứng viên tách — đã đo fan-in* trước — mọi con số ở đây đều từ đó. Mục này là quyết định, không phải đo đạc.

---

## Kết luận một dòng

**Câu hỏi đặt ra sai một cách quan trọng.** Đề bài giả định `pi` mịn hơn `omp` và ta cần cắt cho giống.
Đo thật thì ngược: `pi/coding-agent/src` có **8** thư mục con, `omp` có **67**. Và `pi/core/` là
**52 file phẳng nằm ở gốc** cộng 4 thư mục con — có `agent-session.ts` 137 KB, `package-manager.ts` 84 KB.

`pi` mịn hơn ở **cấp package** (12 package: `chord`, `durable`, `protocol`, `client`, `server`,
`telemetry`), thô hơn ở **cấp thư mục**.

Hệ quả: thao tác chính để chép từ `pi` thành cơ học là **GỘP 67 thư mục → ~10**, không phải cắt
thêm package. Cắt package chỉ đúng ở một số rất ít chỗ, và tệ hơn: phần lớn thứ *cắt ra được* là thứ
`pi` không có, nên cắt nó **không làm việc chép từ `pi` dễ hơn chút nào**.

---

## Vì sao "số file ngoài import vào" là tiêu chí đúng — và giới hạn của nó

Tiêu chí fan-in đo **chi phí di chuyển**, không đo **giá trị của việc di chuyển**. Đó là lý do
`ai/auth` (19 file, 10.603 dòng, **5 importer** — rẻ nhất toàn repo) lại là ứng viên **tệ nhất**:
`pi/ai/src/auth/` đã tồn tại, nó đã đúng độ mịn rồi.

Ba câu hỏi phải trả lời cùng nhau, không được tách:

1. **Cắt được không?** → fan-in thấp, ít vòng 2 nhảy, không cần điều kiện runtime của `coding-agent`.
2. **Cắt ra để làm gì?** → `pi` có thứ tương đương không? Nếu không, cắt chỉ là dọn dẹp, không phải *chép cơ học*.
3. **Cắt có làm giảm vỡ khi sửa không?** → hay chỉ đổi tên thư mục?

Câu 2 là câu bị bỏ qua nhiều nhất, và cũng là câu quyết định.

---

## Ba loại thao tác — đừng trộn

### Loại 1 — GỘP (giảm số thư mục con). Đây là việc chính.

`omp/coding-agent/src` 67 thư mục → mục tiêu ~10, theo hình dạng `pi`:

```
core/        <- session + task + advisor + registry + memories + hindsight + mnemopi + mnemopi-adj
tools/       <- tools + edit + exec + dap + jfind
modes/       <- modes + plan-mode + collab + live + stream
extensions/  <- extensibility + commands + slash-commands + custom-*
config/      <- config + internal-urls + security + secrets
web/         <- web + exa
cli/         <- cli + launch + if-bench
eval/        <- eval
utils/       <- utils
experimental/<- đuôi omp có, pi không (tiny, vibe, sharpshooter, if-bench…)
```

Chi phí gộp rẻ hơn nhiều so với cắt: đổi **tên thư mục** + sửa import tương đối (`../config/x` → `../core/x`).
Không đổi public API, không thêm package, không thêm entry point build. Và **đây mới là thứ làm
chép từ `pi` thành cơ học**: khi đường dẫn khớp, copy một cụm từ `pi` sang `omp` là copy thư mục.

Ưu tiên gộp theo thứ tự fan-in **tăng dần** (rẻ trước):

| bước | gộp cái gì | vì sao trước |
| --- | --- | --- |
| 1 | các thư mục lá 0-vòng: `subprocess`, `ssh`, `compress`, `if-bench`, `activity`, `judgment`, `stats`, `jsonrpc`, `lib`, `stencil`, `auto-thinking`, `speculation`, `downloads`, `irc`, `autolearn`, `goals`, `markit` | không vòng, không ai import chúng ngược lại |
| 2 | `tts` + `stt` → `speech/` (13+13 file, ~5.000 dòng, cùng shape) | cùng domain, cùng tập phụ thuộc |
| 3 | `advisor` + `secrets` + `cleanse` + `autoresearch` → `trust/` | đều là "kiểm tra rồi mới cho chạy" |
| 4 | `mnemopi` + `memories` + `hindsight` + `memory-backend` → `memory/` | đã có sẵn package `mnemopi`; gộp nốt phần còn lại |
| 5 | `tts/stt` song song với `ai/speech` + `ai/transcription` | xem `ai` ở dưới |

### Loại 2 — CẮT RA PACKAGE. Chỉ khi `pi` thực sự có package tương đương.

Đây là danh sách ngắn, và nó ngắn hơn nhiều so với trực giác:

| cắt ra | thành | vì sao | chi phí |
| --- | --- | --- | --- |
| `blob-broker` (27f / 8.944d) | `@oh-my-pi/pi-durable` | khớp `pi/durable` (storage, publication, session transaction) — cùng ~27 vs 29 file, cùng vai trò | 18 importer, 3 vòng → 2 lần `bun check` |
| `collab` + `irc` + `registry` (15f) | `@oh-my-pi/pi-chord` | khớp `pi/chord` (services/state, wire, handle, provider) | 38+10+97 importer, nhưng gộp trước rồi mới cắt → 2 lần `bun check` |
| `stream/protocol.ts` + `wire` (3f) | `@oh-my-pi/pi-protocol` | khớp `pi/protocol`; `wire` đã là package nhưng chỉ 3 file | nhỏ |
| *(thiếu)* transport client/server | `@oh-my-pi/pi-client`, `pi-server` | `pi` có, `omp` **không có gì tương đương** | đây là *thêm mới*, không phải di chuyển |
| *(thiếu)* telemetry | `@oh-my-pi/pi-telemetry` | `pi` có 6 file; omp có 2 file ở gốc `src` | viết mới |

Nói thẳng: chỉ **2 việc** trong bảng trên là *di chuyển*, phần còn lại là *viết code mới*. Đừng tính
nhầm.

### Loại 3 — KHÔNG CẮT. Đây là phần lớn.

| không cắt | fan-in | 2-cycle | lý do cụ thể |
| --- | --- | --- | --- |
| `config` | **949** | **35** | gần như mọi thứ trong repo import nó. 35 vòng 2 nhảy = 35 cặp thư mục không thể tách ra khỏi nhau. Đây là cái gốc rễ |
| `session` | **769** | — | 32 thư mục con phụ thuộc. Cắt = phải định nghĩa lại ranh giới session, tức là thiết kế lại kiến trúc |
| `tools` | **444** | — | 34 thư mục con phụ thuộc; còn là bề mặt công khai (`./tools`, `./tools/jfind` trong exports) |
| `modes` | **327** | — | 42 thư mục con phụ thuộc — nhiều nhất repo. Là TUI runtime |
| `extensibility` | **284** | — | 18 thư mục con; là điểm neo của plugin/hook |
| `utils` | **224** | 8 | bị 26 file trong `tools` import; là tầng dưới mọi thứ |
| `cli` | 148 | — | 30 thư mục con; `commands/` (50 file) import nó |
| `capability` | 136 | 4 | fan-in cao / tỉ lệ dòng cực thấp (18 file / 2.083 dòng) → là registry type, cắt sẽ vỡ type |
| `internal-urls` | 110 | 6 | 18 thư mục con; chuẩn hoá URL là hợp đồng toàn repo |
| `mcp`, `registry`, `discovery`, `eval`, `task` | 97-126 | 4-8 | ngưỡng 41-150: cần seam, là việc thiết kế |
| `tui/*` (trừ `setup`) | 40-588 | — | 9/10 thư mục có fan-in > 50. Là xương sống |
| `ai/{providers,utils,error,registry}` | 130-432 | — | tương tự |

**Nguyên tắc**: thư mục có fan-in > 200 **không phải ứng viên cắt**. Chúng là cái mà 200 file khác
đang dựa vào; di chuyển chúng là đổi chỗ 949 chỗ gọi để không đổi gì. Nói thẳng như vậy.

---

## Thứ tự thực thi

```
Giai đoạn 0  Không di chuyển gì. Chỉ thêm script đo fan-in vào CI.
             Lý do: mọi quyết định dưới đây dựa trên số đo, và số đo phải chạy lại được
             sau mỗi lần di chuyển. Không có cái này thì phần còn lại là niềm tin.

Giai đoạn 1  Gộp các thư mục lá 0-vòng (bước 1 trong Loại 1). ~16 thư mục, ~50 file.
             Chi phí: 1 lần bun check. Rủi ro: gần như không có — không ai import ngược chúng.

Giai đoạn 2  Gộp theo domain: speech/, trust/, memory/ (bước 2-5). ~70 file.
             Chi phí: 2-3 lần bun check. Rủi ro: đổi đường dẫn import, không đổi hành vi.

Giai đoạn 3  Cắt `blob-broker` → package `pi-durable`. Đây là cắt package ĐẦU TIÊN
             và có thể là duy nhất. Lý do: nó là thứ khớp `pi/durable` gần nhất,
             và fan-in 18 là thấp để làm an toàn.
             Chi phí: 18 file import + package.json + exports + workspace entry + 2 lần bun check.

Giai đoạn 4  Gộp `collab`+`irc`+`registry` rồi cắt ra `pi-chord`.
             Phải gộp TRƯỚC khi cắt: cắt lần lượt 3 package sẽ tạo 3 seam nơi chỉ cần 1.

Giai đoạn 5  Viết mới `pi-protocol` / `pi-client` / `pi-server` / `pi-telemetry` nếu muốn
             khớp 12-package của pi. Đây là việc MỚI, không phải di chuyển. Tách riêng
             khỏi roadmap reorg — nó không thuộc đợt này.

Giai đoạn 6  `tui`: gộp 10 thư mục → 1-2, theo hình dạng `pi/tui/src` (1 thư mục + file phẳng).
             Chỉ làm sau khi coding-agent ổn, vì cả `session` và `modes` import `tui` nặng.
```

---

## Rủi ro — nêu cụ thể, không nói chung

**Cắt sai `config`** (949 importer, 35 vòng): 949 file hỏng import, và 35 vòng 2 nhảy nghĩa là
không thể sửa bằng một đợt đổi tên — phải phá vỡ ít nhất một vòng, tức là **thiết kế lại hợp đồng
dữ liệu** giữa các thư mục. Đây không phải refactor, đây là viết lại.

**Cắt `session`/`tools`/`modes`**: mất khả năng thay đổi tool mà không rebuild TUI. Cụ thể là
`tools/` có `./tools` và `./tools/jfind` trong `exports` — 149 file, 444 importer.

**Gộp theo tên miền (`speech/`, `trust/`, `memory/`)**: rủi ro thật là **đụng tên**, không phải import.
Đã xác minh: `mnemopi` tồn tại ở **hai nơi cùng lúc** —
- package `packages/mnemopi` = `@oh-my-pi/pi-mnemopi`, 145 file, **76 file** import vào nó
- thư mục `coding-agent/src/mnemopi`, 8 file, **13 file** import qua đường dẫn tương đối
  (3 ở `tools`, 3 ở `sharpshooter`, 2 ở `session`, 2 ở `memory-backend`, 1 mỗi `task`,
  `internal-urls`, `config`)

Hai thứ cùng tên trong cùng workspace. Bun resolve theo `package.json` nên có thể không lỗi ngay,
nhưng sẽ hỏng khi ai đó import sai. Phải chọn rõ trước khi gộp `memory/`: hoặc bỏ thư mục trong
`coding-agent`, hoặc bỏ package. Không được để cả hai.

**Đã loại trừ: prompt `.md` không làm sai số đo.** Prompt được import bằng
`import content from "./x.md" with { type: "text" }` — regex bắt dạng này (`from "..."`).
Dạng side-effect không có `from` là dạng duy nhất bị bỏ sót; đã grep `src/`: **0 kết quả** trong
327 lần dùng `with { type: "text" }`. Nên con số `prompts` = **126 importer là đúng**, không phải
dưới thực tế.

---

## Điều KHÔNG nên làm

- **Đừng cắt package chỉ vì fan-in thấp.** `ai/auth` là bằng chứng: rẻ nhất repo, hướng sai nhất.
- **Đừng map `coding-agent/src/web` sang `pi/client`/`pi/server`/`pi/protocol`.** `web/` là
  *web search provider* (`firecrawl`, `kagi`, `parallel`, `scrapers/`), không phải web server.
  Map sai này sẽ sinh ra một `pi-server` rỗng.
- **Đừng dùng `git grep -l "<path>"` để đo fan-in.** Nó cho 274 với `config` khi số thật là 949.
  Sai theo hướng làm kết luận ngược.
- **Đừng cắt `tui/*`.** 9/10 thư mục có fan-in > 50; đó là xương sống, không phải lá.
- **Đừng hứa "giảm vỡ vật lý" từ việc tách package.** Tách package *tăng* vỡ vật lý lúc đầu
  (import rewrite) và chỉ giảm về sau nếu có nhiều người sửa song song. Với code chưa ai tách,
  lợi ích đó chưa tồn tại.
