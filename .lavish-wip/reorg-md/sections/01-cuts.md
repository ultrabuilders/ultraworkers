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
đều là fixture trong `test/`** (`test-themes.js`, `helper.cjs`, `optional-missing.js`…) — không ảnh hưởng số.

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
Tức pi đã **làm phẳng** tui. Xem `model.md` — đây là lý do thao tác đúng ở tui là **gộp**, không phải cắt.

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
cắt package **không phục vụ mục tiêu đó**. Xem `model.md`.
