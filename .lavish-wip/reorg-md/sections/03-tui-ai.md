## Đường cắt trong `tui` và `ai`

Nhiệm vụ: cắt `tui` và `ai` để chép từ `pi` về sau thành thao tác cơ học.
Đo bằng script phân giải `exports` map thật của từng package, không đoán, không `grep` chuỗi.

**Cách đo (lặp lại được):** `/tmp/imp6.mjs` — dựng map `importer → target` từ *toàn bộ* `packages/**/*.ts`
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
