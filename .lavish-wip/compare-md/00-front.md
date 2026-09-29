# SO SÁNH HỆ THỐNG — OMP VỚI CÁC REPO THAM CHIẾU

Tài liệu này trả lời một câu duy nhất, bằng lệnh thật: **omp thiếu gì so với mọi thứ có thể học, và cái nào
không nên học.** Mỗi miền trả lời đủ mọi cây, kể cả khi kết luận là "không có" — vì đó cũng là dữ liệu.

## Các cây đo được

| Repo | HEAD | File `.ts`+`.tsx` | Dòng `.ts`+`.tsx` | Giấy phép |
|---|---|---|---|---|
| `omp` | `9cfbaba` | 5.522 | 1.695.782 | MIT (3 chủ) |
| `senpi` | `ea92162` | 5.554 | 955.527 | MIT (2 chủ) |
| `gajae` | `5c52314` | 4.474 | 1.781.490 | MIT |
| `pi` | `d6af72e` | 1.591 | 379.654 | MIT (1 chủ) |
| `opencode` | `39021df` | 4.355 (3.639 + 716 TSX) | 853.502 | MIT |
| `codex` | `e72da2b` | 758 | 11.477 | **Apache-2.0** |

> **Cách đo, để người đọc chạy lại được:** `cd <repo> && git ls-files '*.ts' '*.tsx' | wc -l`, và
> `git ls-files -z '*.ts' '*.tsx' | xargs -0 wc -l | awk '$NF!="total"{s+=$1} END{print s}'`.
>
> **Ba cái bẫy tôi vấp phải khi đo, để người sau không vấp lại:**
> 1. `xargs` **tự chia nhỏ** khi đường dẫn dài, nên `tail -1` cho bạn tổng của *lô cuối*, không phải
>    tổng chung. `awk` phải loại dòng `total` của **từng** lô: `'$NF!="total"'`.
> 2. `git -C <repo> ls-files` in đường dẫn **tương đối với repo đó**, còn `xargs wc` chạy ở thư mục
>    hiện tại. Phải `cd` vào repo trước, nếu không `wc` không tìm thấy file nào và tổng ra 0.
> 3. Nhiều pathspec của `git ls-files` là **hợp nhất (union)**, không giao. `git ls-files '<dir>/' '*.ts'`
>    ra **toàn bộ** file `.ts` của cả repo, không phải file trong `<dir>/`.
>
> Số của `omp` là **5.522 file / 1.695.782 dòng**. Con số 5.325 tôi dùng suốt phiên trước là do
> `find packages -name '*.ts'` — bỏ sót file ở gốc repo. Riêng `pi` tôi còn ghi **1.564**; đo lại
> bằng `git ls-files` ra **1.591**. Đã sửa.

## Bốn điều chỉnh nền tảng — và chúng đảo ngược cách tôi đặt vấn đề

### 1. `gajae` KHÔNG phải repo tham chiếu độc lập. Nó là fork của chính dòng omp.

Đo: `crates/pi-ast`, `crates/pi-iso` còn nguyên; `packages/ai/src/model-thinking.ts` và `packages/agent/src`
dùng chung đường dẫn. Nó còn **mới hơn `pi`**. Những gì `gajae` làm thêm là **hướng đi của một fork**,
không phải chuẩn để học vào. Nó vẫn có giá trị — nhưng phải đọc với con dấu đó.

### 2. `pi` không có MCP, cũng không có ACP.

Đo: `git ls-files | grep -ic mcp` → **0**; `grep -ic acp` → **0**. Hàng duy nhất nhắc MCP là một
optional peerDependency của `@google/genai`, không phải code của `pi`. `protocol`/`client`/`server` của
`pi` là **CBOR trên Unix socket** để điều phối nội bộ, không phải MCP.

### 3. `chord` KHÔNG phải cơ chế vòng đời extension.

Đo: **0 file** trong `core/extensions/` import `chord`; `chord` chỉ xuất hiện trong `experimental/`.
Vòng đời extension của `pi` là `core/extensions/` — **4.506 dòng**, tự quản lý. Ai thật sự phụ thuộc
`chord`: `durable` 35 file · `server` 9 · `client` 5.

Nên "chép `chord` để có vòng đời extension" là **sai đích**. Đã sửa trong `MILESTONE_1B_EXECUTION_PLAN.md`.

### 4. `senpi` là fork của `pi` — nên M1B có hai nguồn, không phải một.

Đo: `packages/` của senpi có 13 mục, `pi` có 12; senpi thêm `pty` và `senpi-codemode`. Cả hai đều có
`chord`, `protocol`, `client`, `server`, `telemetry`, `evals` — cùng tên, cùng tác giả. `LICENSE` của
senpi ghi **cả** Mario Zechner (upstream) lẫn Yeongyu Kim, và cả hai đều MIT. Tức là senpi = `pi` +
40 builtin extension (97.893 dòng) + 2 package mới.

Hệ quả: M1B chép 7 package từ `pi` — nhưng `senpi` **cũng** có 6/7 package đó, và là bản đang được
đội người dùng thật duy trì. Câu hỏi "chép từ đâu" giờ có hai đáp án và chưa chốt được.
Xem `SENPI_FINDINGS.md` và mục 5 của `MILESTONE_1B_EXECUTION_PLAN.md`.

## Hai việc thật, tìm ra khi so chứ không phải khi đọc

Cả hai nằm trong **code của chính omp**, và cả hai đều do so sánh mới lộ ra:

- **MCP protocol chậm hai thế hệ.** `packages/coding-agent/src/mcp/types.ts:175` ghim
  `MCP_PROTOCOL_VERSION = "2025-11-25"`, không có đường thoái lui. Lỗi sẽ **âm thầm**: tool trả về rỗng
  thay vì ném lỗi. opencode đã xử lý `2026-07-28`.
- **`approvalMode` fail-open.** `tools/approval.ts:80`:
  `isApprovalMode(configured) ? configured : "yolo"`. Khi **không có** settings thì rơi về `always-ask`
  (đường `:75`), nên cài mới vẫn an toàn — nhưng khi settings **có** mà khoá thiếu/sai kiểu thì rơi về
  `yolo`. Nên rơi về `always-ask`.

## Một việc thật nữa, và nó đảo ngược M1B: omp đang tự lành dữ liệu hỏng

Đây là kết luận nghiêm trọng nhất của cả tài liệu, và nó nằm ở miền session/storage.

- omp có `parseJsonlLenient` (`packages/utils/src/stream.ts:575`, có callback `onMalformedRecord`).
  `gajae` có cùng hàm ở `stream.ts:434` (không callback). `pi`, `opencode`, `codex` **không có**.
- omp đếm dòng hỏng → `session-manager.ts:1882` đặt `#rewriteRequired` → lần persist sau ghi lại
  thân file, dòng hỏng **biến mất vĩnh viễn**.
- `pi` ném `JsonlCorruptionError` (`durable/src/storage/jsonl/storage.ts:119`) và **không** có đường
  thoát nào ngoài việc ném.

Nên trong 5 repo, omp đứng đầu ở đúng trục "chịu được file hỏng" — và **chép nguyên xi session layer
của `pi` sẽ làm nó tệ đi**. Đã sửa `MILESTONE_1B_EXECUTION_PLAN.md` mục 5, và đánh dấu lại dòng
`src/storage/jsonl/storage.ts` trong bảng chép.

## Nơi omp thắng — và đừng để ai xóa

| | omp | so với |
|---|---|---|
| LSP | 10.392 dòng | gấp 2,5× `gajae`, **26×** `codex`; `pi` bằng 0 |
| Test/fixture MCP | 83 file | `opencode` 13 |
| Transport MCP | giữ cả 3 | `gajae` đã **bỏ** `sse.ts` |
| Phụ thuộc SDK chính thức | **0 hit** | không repo nào dùng |
| Mặc định giá model | 5.522/5.522 có `cacheRead`+`cacheWrite` | `codex` **0** trường giá |
| Chính sách model trong `.kdl` | 8.909 dòng, cấm viết bằng TS | `gajae` đã **gỡ KDL** → 86 model id hardcode |
| **Tự lành JSONL hỏng** | `parseJsonlLenient` + `#rewriteRequired` | `pi`/`opencode`/`codex` **không có** |
| **Nói thẳng giới hạn độ bền** | `session-manager.ts:690` *"not power-loss safe"* | cả 5 repo đều không an toàn mất điện, **chỉ omp nói ra** |
| Giữ chỗ session (retention) | gc 30 ngày, 20 global / 10 theo cwd | `opencode` **không có** retention nào |

Dòng KDL là phép thử tự nhiên: `gajae` từng có KDL, đã bỏ, và hậu quả đo được là
`model-thinking.ts` 1.179 dòng chứa **86 model id hardcode** — đúng thứ `AGENTS.md` của omp cấm.
