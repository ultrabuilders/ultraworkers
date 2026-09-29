## Mô hình tổng thể: thứ tự, và cái KHÔNG cắt

> Đọc `cuts.md` trước — mọi con số ở đây đều từ đó. File này là quyết định, không phải đo đạc.

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
