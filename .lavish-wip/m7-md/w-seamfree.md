# M7 — Work item: 13 builtin "seam-free" của senpi, và bảng xếp hạng chọn

> Nguồn: `SENPI_FINDINGS.md` Phần 4 §4-§5, Phần 6 §6.1/§6.3, Phần 7 §7.1/§7.13/§7.18 · Tổng hợp §4-§6.
> Cây đích: `/Users/tranquangdang21/Projects/ultraworkers` (gọi tắt **omp**) · cây nguồn: `/Users/tranquangdang21/Projects/senpi-ref` (gọi tắt **senpi**), ghim theo `ea9216269e9254b821446130b60d1e00759761dc`.
> Chính sách pháp lý: senpi MIT thuần. Ba nghĩa vụ — giữ MIT notice · ghi attribution vào `NOTICE.md` (omp **chưa có** file này) · không lấy thương hiệu. Mọi mục "chép" dưới đây đều chịu ba nghĩa vụ này.

## Sóng / phạm vi

Sóng A của M7. **Phạm vi hẹp: 13 builtin không cần seam mới để đăng ký**, đã đo lại từng cái ở cả hai cây. Sóng này **không mở seam nào** — nó là sóng chạy được trước, kế tiếp sẽ là sóng seam (`agent_settled` → `registerEntryRenderer` → `model_select`).

Kết luận của sóng, chốt bằng phép đo riêng (mục "Đo lại" bên dưới): **13 là trần trên, và trần đó không đạt được.** Sau khi loại những cái omp đã mạnh hơn, và những cái bị chặn bởi contract không tương thích, danh sách thực làm được là **8**, trong đó **3 cái rẻ thật** và **5 cái phải viết lại kiến trúc**.

## Đo lại: "13 chạy được ngay" là con số nào

Tôi không lặp lại con số của nghiên cứu trước. Dưới đây là phép đo của riêng tôi, chạy trên đường dẫn thật.

**Sai đường dẫn là bẫy thứ ba, chưa ai ghi.** `SENPI_FINDINGS.md` §3 và §5.3 nói "40 builtin", và cây có `packages/coding-agent/src/core/extensions/builtin/`. Nhưng 13 tên trong §5.3 **không nằm dưới `builtin/` ở gốc cây senpi** — `find . -maxdepth 4 -type d -name 'builtin*'` trả về **rỗng**. Đường dẫn thật là `packages/coding-agent/src/core/extensions/builtin/`, và nó chứa **59 mục** (40 thư mục + 19 file lỏng), không phải 40. Ai đo lại bằng `builtin/<tên>` sẽ nhận 13 cái `MISSING-DIR` và kết luận sai.

Đường dẫn thật đã dùng cho mọi phép đo dưới đây:
`/Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin/<tên>`

### Bảng đối chiếu 13/13

Chuẩn là `BUILTIN_TOOL_NAMES` (`packages/coding-agent/src/tools/builtin-names.ts:1-32`, đọc nguyên file: **30 tool + 3 hidden** tại dòng 36) và `HIDDEN_TOOL_NAMES`.

| # | builtin senpi | dòng `.ts` (không test) | file `.ts` | `on("…")` | `changes.md` | omp đã có gì? | kết luận |
|---:|---|---:|---:|---:|:---:|---|---|
| 1 | `account` | **82** | 1 | 0 | N | `packages/ai/src/auth-storage.ts` có, nhưng **không** `CredentialAccountSummary`/`pinCredentialAccount`; `ctx.sessionSettings` **0 hit** | ❌ không chép được |
| 2 | `anthropic-bash` | 103 | 1 | 1 | N | 1 `before_provider_request`; omp có api `anthropic-messages` (`packages/ai/src/types.ts:75`) | ⚠️ contract provider |
| 3 | `bash-timeout` | **118** | 2 | 1 | Y | `bash.ts:330-357` **đã có** `timeout` clamp `TOOL_TIMEOUTS.bash.min/max` | ❌ đã có |
| 4 | `help` | 148 | 2 | 0 | Y | `buildHelpMarkdown` **0 hit** trong `src` | ⚠️ viết mới |
| 5 | `history-search` | **401** | 5 | 0 | N | `getSessionsDir` có; **`parseJsonlLenient` phải dùng** | ⚠️ viết mới + JSONL |
| 6 | `hooks` | **4.663** | 23 | **10** | N | không đo được (không `changes.md`) | ❌ bỏ |
| 7 | `imagegen` | 880 | 7 | 1 (`resources_discover`) | Y | `src/tools/image-gen.ts` 12 KB **đã có**, đã wire qua `sdk.ts:3218`; omp cũng có `resources_discover` (3 hit) | ❌ đã có |
| 8 | `model-fallback` | 207 | 3 | 0 | N | `fallbackChain` có (`task/executor.ts:261`) nhưng `setFallbackChain`/`ctx.sessionSettings` **0 hit** | ⚠️ viết mới |
| 9 | `nested-agents-md` | 539 | 11 | 4 | Y | 0 hit; cần `isReadToolResult` từ types của senpi | ⚠️ viết mới |
| 10 | `permission-system` | 1.638 | 15 | 3 | Y | `src/tools/approval.ts` 13 KB — kiến trúc khác | ❌ viết lại |
| 11 | `rules` | 2.842 | 19 | 4 | Y | 0 hit; `rule-activation` 0 hit | ❌ bỏ (cỡ) |
| 12 | `tool-pair-guard` | 269 | 3 | 1 | N | `sanitizeAnthropicToolPairs` **0 hit** trong `packages/` | ❌ viết mới |
| 13 | `webfetch` | 1.062 | 10 | 2 | Y | `src/tools/fetch.ts` **53 KB** — mạnh hơn nhiều | ❌ đã có |

**Bốn builtin rơi ngay ở bước đối chiếu** — không phải vì khó, mà vì omp đã có sẵn hoặc mạnh hơn:
`bash-timeout` (omp đã clamp timeout), `imagegen` (`image-gen.ts` đã chạy), `webfetch` (`fetch.ts` 53 KB vs 1.062 dòng senpi), và `account` (không có API nền).

**Hai builtin rơi vì cỡ và không đo được**: `hooks` (4.663 dòng, 23 file, 10 `on()`) và `rules` (2.842 dòng, 19 file). Cả hai đều **không có `changes.md` hoặc có nhưng 50-91% cắm core** — `rules` không đo được mức cắm core từ chính nghiên cứu trước (mâu thuẫn §7.12: 13/40 builtin không có `changes.md`, và `tool-pair-guard` nằm trong 13 đó ⇒ **không tồn tại phép đo nào** cho nó).

### Con số chốt: 13 → 8, trong đó 3 rẻ thật

Tôi chốt **8** cái thực làm được, xuống từ "13 là trần trên" của nghiên cứu trước — và con số đó **chưa tính việc viết lại**, nên giá trị dùng được thấp hơn 8:

- **3 rẻ thật** (chép được, không cần seam, không cần viết lại kiến trúc): `help` · `history-search` · `tool-pair-guard`.
  **Khác nghiên cứu trước:** nó nói "chỉ `loop-guard`, `bash-timeout`, `history-search`". Tôi đo lại và **`loop-guard` không nằm trong nhóm 13** — nó dùng 8 event gồm `agent_settled` (`grep -o` trên `loop-guard/` trả về đúng 8 tên: `agent_settled`, `agent_start`, `input`, `session_shutdown`, `session_start`, `tool_call`, `tool_execution_start`, `turn_end`), mà **`agent_settled` = 0 hit** trong `types.ts` của omp ⇒ nó **CẦN SEAM**. Và `bash-timeout` **đã có** ở omp (`bash.ts:330`). Cả hai đều không thuộc nhóm "rẻ thật". Nghiên cứu trước đã tự mâu thuẫn ở §5.3: nó liệt kê `loop-guard` như "thật sự không cần seam" trong khi danh sách 13 của chính nó không có `loop-guard`.
- **5 phải viết lại kiến trúc** (seam có, nhưng contract không tương thích): `anthropic-bash` · `model-fallback` · `nested-agents-md` · `tool-pair-guard` (một nửa) · `history-search` (một nửa).

## Xếp hạng theo giá trị / công

Xếp theo **công omp phải trả** (dòng phải viết), không theo cỡ senpi. Một builtin 4.000 dòng mà omp không có bản tương đương thì rẻ hơn một builtin 100 dòng mà phải viết lại cả tầng approval.

| hạng | mục | công (dòng omp) | hiệu ứng người dùng thấy | rủi ro |
|---:|---|---:|---|---|
| **1** | `help` (`/help` + `/keybindings`) | **~180** | `/help` trong TUI mở overlay liệt kê keybinding và **toàn bộ command đã cài, kể cả command của extension** — hiện tại omp không có lệnh này | Thấp. Không đọc session. Rủi ro thật duy nhất: `getCommands()` phải trả về danh sách command của extension đang bật, mà `help` senpi gọi `pi.getCommands()` (`types.ts:1504` — omp **đã có**) |
| **2** | `tool-pair-guard` | **~200** | Vá lỗi wire: khi model phát `tool_use` không có `tool_result` đi kèm (dangling / orphan), request bị sửa trước khi gửi thay vì để provider trả 500 | **Trung bình-cao.** `sanitizeAnthropicToolPairs` là 0 hit ở omp ⇒ phải **viết mới phần lõi**, không chép được. Và `before_provider_request` trả về `unknown` (`types.ts:1166`) — thay cả payload |
| **3** | `history-search` (`/history`) | **~320** | Gõ `/history`, overlay tìm trong **mọi session JSONL đã lưu**, nhảy tới session cũ | **Cao.** Đây là cổng JSONL. Xem cảnh báo bên dưới |
| **4** | `model-fallback` (`/fallback`) | **~200** | Bật/tắt chuỗi model thay thế khi lỗi retry — `/fallback` hiện **không tồn tại** ở omp | **Cao.** `ctx.sessionSettings` là **0 hit** trong `types.ts` của omp. Phải chọn: mở seam settings, hay viết bảng cấu hình riêng |
| **5** | `nested-agents-md` | **~350** | Tự chèn `NESTED_AGENTS.md` vào context khi chạy trong thư mục con agent | Trung bình. Cần `isReadToolResult` mà `types.ts` của senpi có, omp phải tự viết |
| **6** | `anthropic-bash` | **~110** | Chỉ bật bash native của Anthropic khi model đúng dòng | **Cao.** Đây là contract provider: `AGENTS.md` cấm hard-code chính sách theo model trong TS. Cần KDL axis, không phải `ctx.model.api === "anthropic-messages"` |

**Cái tôi xếp hạng cao nhất không nằm trong danh sách này:** `loop-guard`. Nó không phải seam-free (cần `agent_settled`), nhưng **omp đã có `ToolCallLoopGuard`** ở `packages/ai/src/utils/tool-call-loop-guard.ts:68`, đã có test, và đã được dùng ở `src/session/stream-guards.ts:220`. ⇒ Đây là work item của sóng seam, **không** phải sóng này. Ghi vào đây để không ai port trùng.

### Ba cái bị loại, và vì sao (không phải vì khó — vì omp đã có hoặc mạnh hơn)

| mục | bằng chứng omp | kết luận |
|---|---|---|
| `bash-timeout` (118 dòng) | `packages/coding-agent/src/tools/bash.ts:330` khai báo `BASH_TIMEOUT_DESCRIPTION` clamp theo `TOOL_TIMEOUTS.bash.min/max`; schema `timeout?` ở :334/:341/:349/:357 | **Đã có.** Port là viết lại một thứ đã tồn tại |
| `imagegen` (880 dòng) | `packages/coding-agent/src/tools/image-gen.ts` (12 KB), `getImageGenTools` ở :309, đã được wire tại `src/sdk.ts:3218-3219`; prompt nằm đúng chuẩn `AGENTS.md` (`.md`, :20) | **Đã có** |
| `webfetch` (1.062 dòng) | `packages/coding-agent/src/tools/fetch.ts` **53 KB** — có `renderHtmlToText` :592, `fetchReadUrl` :1613, `materializeReadUrlToFile` :1660, `executeReadUrl` :1686 | **Mạnh hơn nhiều.** `webfetch` không có tên trong `BUILTIN_TOOL_NAMES` (0 hit) vì omp đã gộp nó vào đường `read` |

## Bước đầu tiên: `directory-resolution.ts:69` — **BÁC BỎ**, và lý do

Nghiên cứu trước đề xuất: "ném 3 builtin seam-free vào `directory-resolution.ts:69` (`pkg.omp ?? pkg.pi`) trước khi viết dòng seam nào — rẻ nhất, không tốn công sửa nếu sai". Tôi đã đo. **Ý tưởng đúng về cơ chế, sai về hàm đích.**

**Đúng:** dòng 69 có thật và đúng nội dung:
```ts
const manifest = isRecord(pkg) ? (pkg.omp ?? pkg.pi) : undefined;
const entries = isRecord(manifest) ? manifest.extensions : undefined;
```
(`packages/coding-agent/src/extensibility/extensions/directory-resolution.ts:69-70`). Nó đọc `package.json`, lấy `extensions: string[]`, `path.resolve(dir, entry)`, và chấp nhận **cả file lẻ lẫn thư mục** (thư mục thì đi qua `findExtensionDirectoryIndex`, dòng 87-89). Cơ chế là thật, không phải suy đoán.

**Sai ở chỗ khác — và đây là chỗ quyết định:**

1. **Dòng này KHÔNG quét cây omp.** Nó chỉ chạy từ `resolveExtensionDirectory`, và hàm đó có **đúng hai caller**: `extensions/loader.ts:36` và `plugins/loader.ts:12`. Trong `loader.ts`, lời gọi duy nhất nằm ở **dòng 653 — bên trong nhánh "Explicitly configured paths"** (`for (const configuredPath of configuredPaths)`). Không có nhánh nào trong `loader.ts` gọi nó cho thư mục nguồn của omp.
2. **Vậy nên "ném vào `directory-resolution.ts:69`" nghĩa là gì?** Không có nghĩa cụ thể nào nếu không đặt các builtin vào một thư mục *được cấu hình tường minh*. Đó là thay đổi **hành vi khám phá extension của omp toàn cục**, không phải thêm một builtin. Nó sẽ khiến mọi người dùng omp thấy thêm N extension đã đăng ký lệnh, ở mọi workspace — một thay đổi sản phẩm, không phải một PR port.
3. **Rủi ro đúng là "không tốn công sửa nếu sai" — nhưng ngược lại về tính quan sát được.** Một PR port builtin đăng ký sai chỗ sẽ **hỏng im lặng**: `omp` vẫn chạy, không có extension nào đăng ký, không có lỗi. Đây đúng là loại cổng mà `MILESTONE_3_EXECUTION_PLAN.md` yêu cầu phân biệt "đã làm" với "không chạy được".

**Kết luận:** **không sửa `directory-resolution.ts` ở sóng này.** Thay vào đó đặt 3 builtin vào **một thư mục riêng, không nằm trên đường quét mặc định** (ví dụ `packages/coding-agent/src/extensibility/extensions/ported-senpi/`), và chỉ **nối chúng** khi bước 5 dưới đây chứng minh được chúng chạy. Cơ chế `directory-resolution.ts:69` vẫn là hàng dự phòng đúng — dùng nó ở bước tiếp theo, khi thư mục đã tồn tại và đã có test.

## Hiệu ứng người dùng thấy

Ba lệnh mới, không seam mới, không đụng tầng provider:

- `/help` trong TUI mở overlay liệt kê keybinding + **mọi command đã cài, kể cả của extension**. Ngoài TUI thì in một dòng hướng dẫn thay vì im lặng. `/keybindings` mở `keybindings.json` bằng `$EDITOR` và reload tại chỗ.
- `/history` mở overlay tìm trong toàn bộ session JSONL đã lưu, lọc theo text, nhảy tới session cũ. Đây là thứ người dùng đang mất nhiều thời gian nhất: session JSONL của omp nằm rải trong `~/.omp/`, không có đường quay lại.
- `tool-pair-guard` không có hiệu ứng trực tiếp — nó **ngăn** lỗi wire 500 khi model phát `tool_use` mà không kèm `tool_result`. Người dùng thấy một lượt chạy thành công thay vì một lỗi provider không rõ nguyên nhân.

**Không** thấy gì: không có thông báo lúc khởi động, không có cờ mới, không có thay đổi hành vi của builtin đang chạy. Đây là tiêu chí của sóng này — sóng mà `webfetch`/`imagegen`/`bash-timeout` (loại vì omp đã có) sẽ **vi phạm**.

## Effort

**~4,5 engineer-days** cho phần đã đặc tả (hạng 1-3), **~7 ngày** cho cả 6 mục đã xếp hạng.

| hạng | mục | công | Điểm nên dành nhiều hơn mức phẳng |
|---:|---|---:|---|
| 1 | `help` | **~1 ngày** | — |
| 2 | `tool-pair-guard` | **~1,5 ngày** | Viết mới phần lõi (không chép được) + chứng minh `before_provider_request` **thật sự thay payload** chứ không chỉ nhận `unknown` |
| 3 | `history-search` | **~2 ngày** | Fixture JSONL. Dành **nửa ngày riêng** cho nó |
| 4 | `model-fallback` | ~1,5 ngày | Chặn ở cổng P2 (xem dưới) |
| 5 | `nested-agents-md` | ~1,5 ngày | — |
| 6 | `anthropic-bash` | ~1 ngày + chờ KDL axis | Chặn ở cổng P3 |

Công của hạng 4-6 là **ước lượng**, chưa kiểm chứng bằng cách đọc hết nguồn senpi (tôi chỉ đọc `index.ts` của chúng). Không hàng nào trong bảng trên được `bun check` — đó là công việc của người thực hiện, không phải của sóng này.

## File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/directory-resolution.ts` | **KHÔNG đụng** | Đọc để hiểu cơ chế, không sửa. Sóng này bác bỏ việc sửa nó. | Có. File 145 dòng; dòng 69 đúng nội dung `pkg.omp ?? pkg.pi`, dòng 87-89 nhánh thư mục, dòng 102 `resolveExtensionDirectory` |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | **KHÔNG đụng** | Đọc để xác nhận chỉ có một lời gọi, ở nhánh configured-paths. | Có. Import ở :36; lời gọi **duy nhất** ở **:653**, nằm trong `for (const configuredPath of configuredPaths)` mở đầu :641 |
| `packages/coding-agent/src/tools/builtin-names.ts` | đọc | Chuẩn đối chiếu. **KHÔNG thêm** tên mới: 3 mục này là **lệnh**, không phải tool. | Có. Đọc nguyên file 68 dòng: 30 tool (dòng 2-31) + 3 hidden (dòng 36). `fetch`/`webfetch` = **0 hit** |
| `packages/coding-agent/src/extensibility/extensions/ported-senpi/` | **tạo** | Thư mục mới, **không nằm trên đường quét mặc định**. 3 entry point: `help.ts`, `history-search.ts`, `tool-pair-guard.ts` | Có (vắng mặt là đã kiểm chứng — `ls` thư mục `extensions/` không có entry này) |
| `packages/coding-agent/src/modes/interactive/help-content.ts` | tạo | `buildHelpMarkdown` — senpi import nó từ `modes/interactive/help-content.ts` nhưng omp **0 hit** ⇒ phải viết. Đây là hợp đồng thuộc về người dùng (liệt kê lệnh), nên phải khớp nguồn sự thật của omp, không chép bản senpi | Có. `git grep -nw 'help-content' -- packages/coding-agent/src` → rỗng |
| `packages/coding-agent/src/tools/approval.ts` | đọc | Chỉ để đối chiếu khi làm `permission-system` (**không thuộc sóng này**). 13 KB | Có (kích thước từ `ls`) |
| `packages/utils/src/stream.ts` | đọc | `parseJsonlLenient` tại **:575** — cổng JSONL bắt buộc cho `history-search` | Có. Định nghĩa tại `packages/utils/src/stream.ts:575`; consumer sẵn có ở `src/memories/index.ts:691` và `:734` |
| `packages/coding-agent/test/senpi-ported-help.test.ts` | tạo | Test hạng 1 | Có (chưa tồn tại) |
| `packages/coding-agent/test/senpi-ported-history-search.test.ts` | tạo | Test hạng 3. **Bắt buộc** có fixture JSONL hỏng | Có (chưa tồn tại) |
| `packages/coding-agent/test/senpi-ported-tool-pair-guard.test.ts` | tạo | Test hạng 2 | Có (chưa tồn tại) |
| `NOTICE.md` | **tạo** | File **chưa tồn tại** ở omp. Bắt buộc vì `AGENTS.md` không nêu nhưng `SENPI_FINDINGS.md` §1.2 + `task` yêu cầu: ghi attribution senpi MIT cho mọi dòng chép | Có. `SENPI_FINDINGS.md` §1.2 nêu rõ omp chưa có file này; senpi có `NOTICE.md` 2.1 KB |

## Các bước

1. **CỔNG — lấy P0 bằng văn bản: `/help` của sóng này có được phép liệt kê lệnh của extension không?** Nếu câu trả lời là "không", `help` rơi xuống hạng 5 và hạng 1 của sóng này thành `tool-pair-guard`. Ghi câu trả lời nguyên văn vào kế hoạch đã track — **không** ghi vào `.lavish-wip/` (thư mục đó chưa được track, người review không thấy). Không viết dòng code nào của `help` khi P0 còn mở. *(anchor: `types.ts:1504` `getCommands(): SlashCommandInfo[]`)*

2. **`help` — viết `buildHelpMarkdown` theo nguồn sự thật của omp, KHÔNG chép bản senpi.** senpi import nó từ `modes/interactive/help-content.ts` — file này **không tồn tại** ở omp. Nguồn cho nội dung là registry lệnh của chính omp, đừng chép danh sách của senpi. *(anchor: `packages/coding-agent/src/extensibility/extensions/types.ts:1504`)*

3. **`help` — trả lời cả hai nhánh.** `ctx.mode !== "tui"` thì `ctx.ui.notify(...)`; ngược lại thì `ctx.ui.custom<T>(...)` với `overlay: true`. Cả hai API đã có: `notify` tại `types.ts:258`, `custom` tại `types.ts:282`. Lệnh thứ hai là `/keybindings` — mở `keybindings.json` bằng `$EDITOR`; ở chế độ non-TUI thì `notify` hướng dẫn, không ném lỗi. *(anchor: `types.ts:258`, `types.ts:282`)*

4. **`tool-pair-guard` — XÁC MINH `before_provider_request` THẬT SỰ THAY PAYLOAD trước khi viết lõi.** Kiểm chứng rồi: `runner.ts:1820` khai báo `let currentPayload = payload`, `:1827-1829` đưa `currentPayload` vào event, và `:1841-1843` gán `currentPayload = handlerResult` khi handler trả khác `undefined`, rồi `return currentPayload`. ⇒ Cơ chế có thật, không phải bình luận trong type. Nhưng kiểm tra **từng provider** xem handler được gọi với body đúng provider (Anthropic `tools` vs OpenAI `tools`) — `payload` là `unknown` (`types.ts:774`), nên một giả định sai về hình dạng sẽ hỏng âm thầm. *(anchor: `packages/coding-agent/src/extensibility/extensions/runner.ts:1820,1827,1841,1843`)*

5. **`tool-pair-guard` — viết phần lõi MỚI, đừng chép.** `sanitizeAnthropicToolPairs` là **0 hit** trong `packages/` của omp (`git grep -nw`), nên `tool-pair-guard/index.ts:1` của senpi không có gì để chép. Chép được phần OpenAI (`sanitize-openai-chat-completions-payload.ts` 105 dòng + `sanitize-openai-responses-payload.ts` 149 dòng) chỉ khi cả hai provider đó của omp có payload tương đương. Đừng chép `index.ts` (15 dòng) — nó chỉ là ba lời gọi. *(anchor: senpi `builtin/tool-pair-guard/index.ts:1`; omp: 0 hit)*

6. **`history-search` — đặc tả port đủ để làm, gồm cả cổng JSONL.** Nguồn: senpi `builtin/history-search/` — `index.ts` (56, phần `resolveSearchRoot` + `registerCommand("history")`), `indexer.ts` (168), `overlay.ts` (141), `filter.ts` (29), `types.ts` (7). Entry point là `export default function historySearchExtension(pi: ExtensionAPI)`, đăng ký qua `pi.registerCommand`. **Cảnh báo JSONL — cổng chặn dễ sai nhất của cả M7:** `indexer.ts:44-50` định nghĩa `parseJsonLine` **gọi `JSON.parse(line)` trực tiếp** rồi nuốt `SyntaxError`. Khi port, thay **toàn bộ** đường đọc bằng `parseJsonlLenient` (`packages/utils/src/stream.ts:575`) — nó đã có sẵn consumer thật ở `src/memories/index.ts:691` và `:734`. Đừng chép nguyên xi `JSON.parse`. *(anchor: senpi `history-search/indexer.ts:44-50`; omp `packages/utils/src/stream.ts:575`)*

7. **`history-search` — dựng fixture JSONL trước khi viết overlay.** Cần tối thiểu: một file session **hợp lệ** có header `type: "session"`, một file chứa **một dòng JSON hỏng** giữa các dòng hợp lệ, và một dòng JSON hợp lệ nhưng không phải object. Đây là nửa ngày riêng theo ước lượng công ở trên — đừng gộp vào ngày overlay. *(anchor: senpi `history-search/indexer.ts:112-141` (`appendSessionEntries`, vòng lặp dòng))*

8. **Nối cả 3 vào loader — nhưng CHỈ sau khi bước 1-7 có test xanh.** Và **không sửa `directory-resolution.ts`**. Nếu cuối cùng vẫn muốn dùng cơ chế `package.json.extensions`, làm nó ở **PR sau**, khi thư mục đã tồn tại và đã có test bảo vệ. *(anchor: `packages/coding-agent/src/extensibility/extensions/directory-resolution.ts:69`)*

9. **`NOTICE.md` — tạo file, ghi attribution senpi MIT, ghim theo commit SHA `ea9216269e9254b821446130b60d1e00759761dc`.** Không ghi "bản mới nhất". Không lấy thương hiệu senpi. Giữ MIT notice gốc. *(anchor: `SENPI_FINDINGS.md` §1.2; senpi `NOTICE.md` 2.1 KB)*

10. **`bun check` (KHÔNG dùng `tsc`/`npx tsc`) và chạy đúng 3 file test mới.** Không `mock.module()`. Nếu cần spy thì `vi.spyOn` trên namespace đã import + `vi.restoreAllMocks()` trong `afterEach`. *(anchor: `AGENTS.md` "Testing Guidance")*

## Hợp đồng test

Ba file test mới, mỗi file bảo vệ **một** hợp đồng quan sát được, mỗi cái có **cả hợp đồng phủ định**. Không test nào source-grep (AGENTS.md cấm), không `mock.module()`.

**`senpi-ported-help.test.ts`** — đăng ký một extension giả **hai lệnh riêng biệt** rồi gọi `/help`:
- Khẳng định cả hai tên lệnh của extension xuất hiện trong output. *Đây là hợp đồng thật của P0* — nếu `/help` chỉ liệt kê lệnh builtin, người dùng vẫn tưởng extension chưa được nạp.
- **Phủ định:** gọi `/help` ở `ctx.mode !== "tui"` ⇒ khẳng định `notify` được gọi **và `custom` KHÔNG được gọi**. Đây là nhánh mà chép nguyên sẽ bỏ sót.
- **Phủ định:** `/keybindings` ở non-TUI ⇒ `notify`, không ném lỗi, không spawn editor.

**`senpi-ported-tool-pair-guard.test.ts`**:
- Payload có `tool_use` không kèm `tool_result` ⇒ handler trả về payload **đã sửa**, và quan trọng nhất: **không còn `tool_use` trơ** nào trong kết quả.
- **Phủ định (quan trọng nhất):** payload **đã cặp đúng** `tool_use`/`tool_result` ⇒ handler trả về `undefined` (không sửa). Đây là hợp đồng chống lỗi: một guard luôn trả về payload đã bản sao sẽ phá mọi request hợp lệ. Một test chỉ khẳng định "payload hỏng thì được sửa" sẽ xanh với một bản luôn ghi đè — vi phạm AGENTS.md ("success passthrough").
- Chạy với **payload đã được một handler khác sửa** để chứng minh chúng nối tiếp, không phải cạnh tranh.

**`senpi-ported-history-search.test.ts`**:
- File session hợp lệ ⇒ entry tìm được, `sessionId` lấy từ header.
- **Phủ định quan trọng nhất:** file JSONL chứa **một dòng hỏng** ở giữa ⇒ các entry hợp lệ **trước và sau** dòng hỏng vẫn được trả về, và hàm **không ném lỗi**. Đây chính là cổng `parseJsonlLenient` — nếu ai đó chép nguyên `JSON.parse` của senpi (`indexer.ts:46`), test này đỏ.
- Lọc không khớp ⇒ **overlay mở với danh sách rỗng**, không phải overlay rỗng bị bỏ qua.

**Cấm dùng trong cả ba file:** khẳng định chuỗi literal của output render (vi phạm "static echo"), `expect(true).toBe(true)`, `not.toThrow()` trần, kiểm tra "chuỗi không rỗng", và đọc file nguồn để `toContain("someCall()")`.

## Cổng hoàn thành

Mỗi cổng phải **phân biệt được "đã làm" với "không chạy được"**. Cổng trả về thành công khi **không nhìn thấy gì** là cổng không có tác dụng.

| # | cổng | lệnh / điều kiện | vì sao cổng này có tác dụng |
|---|---|---|---|
| **G1** | File mới **đã được track** | `git add -A && git diff --cached --stat` **phải thấy** 4 file mới trong `ported-senpi/`/`test/` + `NOTICE.md`. **`git diff --stat` trần KHÔNG được chấp nhận** — nó không thấy file untracked | Đây đúng là cái bẫy đã làm hỏng tài liệu trước. Thư mục `.lavish-wip/` untracked cũng vậy |
| **G2** | **Ba lệnh đã đăng ký thật** | Chạy omp, gõ `/help`, `/history` trong TUI ⇒ **mở overlay**. `tool-pair-guard` không quan sát được tay ⇒ dùng G3 | Cổng "không thấy gì" chính là thứ mà một port hỏng im lặng sẽ vượt qua |
| **G3** | Guard **thật sự thay payload** | Test: handler `before_provider_request` trả về payload đã sửa, và giá trị trả về tới `runner.ts:1843` (`currentPayload = handlerResult`) khác payload vào | Chứng minh đúng cơ chế đã kiểm chứng ở bước 4, không chỉ tin type |
| **G4** | JSONL hỏng **không làm hỏng** | Test với fixture có dòng JSON hỏng ⇒ không ném lỗi, entry hợp lệ hai bên vẫn trả về | Bảo vệ cổng `parseJsonlLenient` |
| **G5** | **Không hồi quy** | `bash-timeout` (`bash.ts:330-357`), `imagegen` (`image-gen.ts` + wiring `sdk.ts:3218`), `webfetch` (`fetch.ts` 53 KB) — **không file nào trong ba đó bị sửa**. `git diff --cached --stat` không được chứa chúng | Ba cái này rơi vì omp đã mạnh hơn. Chạm vào chúng = phá hệ thống đang chạy |
| **G6** | `bun check` sạch, 3 file test xanh, **không `mock.module()`** | `bun check` + `bun test` trên 3 file mới | `tsc` bị cấm |
| **G7** | `NOTICE.md` tồn tại và ghi SHA `ea9216269e9254b821446130b60d1e00759761dc` | Đọc file, kiểm tra có SHA | Nghĩa vụ pháp lý thứ hai; ghim SHA chứ không ghi "latest" |

## Rủi ro

| # | rủi ro | xác suất | hậu quả | chặn bởi |
|---|---|---|---|---|
| **R1** | **Port dùng `JSON.parse` trực tiếp thay vì `parseJsonlLenient`** | Cao nếu chép nguyên xi | Một session JSONL hỏng làm `/history` ném lỗi — mất đúng cái công cụ dùng để tìm session hỏng. Đây là cổng chặn dễ sai nhất của cả M7 | G4 + bước 6 |
| **R2** | **Đăng ký extension sai chỗ ⇒ im lặng** | Trung bình | Mọi cổng đều xanh, không có lệnh nào xuất hiện. Đây là hình dạng thất bại tệ nhất | G1 + G2 + bác bỏ `directory-resolution.ts` |
| **R3** | **`tool-pair-guard` sửa payload theo hình dạng của provider khác** | Trung bình | `payload` là `unknown` (`types.ts:774`); giả định sai về `tools` của Anthropic vs OpenAI là hỏng wire ở tầng thấp hơn lỗi ban đầu | G3 + bước 4 (kiểm từng provider) |
| **R4** | **`/help` liệt kê lệnh của extension khi người dùng không muốn** | Thấp | Rò thông tin tên lệnh nội bộ ra overlay chia sẻ màn hình | P0 ở bước 1 |
| **R5** | **Chạm nhầm vào `bash-timeout`/`imagegen`/`webfetch`** | Thấp | Ghi đè hệ thống đang chạy bằng bản nhỏ hơn | G5 |
| **R6** | **`history-search` lộ đường dẫn home ra overlay** | Trung bình | `AGENTS.md` "TUI Sanitization" bắt buộc `shortenPath()` + `replaceTabs()`; session JSONL chứa cwd thật | Bước 7 (fixture) + review |
| **R7** | **`model-fallback` bị chặn vĩnh viễn bởi `ctx.sessionSettings` = 0 hit** | Cao | Hạng 4 hóa ra là sóng seam, không phải sóng này | Cổng P2 dưới đây |
| **R8** | **Công ước của hạng 4-6 là ước lượng, không phải đo** | — | Tôi chỉ đọc `index.ts` của chúng. Nếu `model-fallback` cần cả tầng settings, ~1,5 ngày là sai | Cổng P2 |

### Ba cổng còn mở — chặn, và cần người quyết

| # | câu hỏi | chặn cái gì | vì sao không tự quyết |
|---|---|---|---|
| **P0** | `/help` có được liệt kê lệnh của extension không? | `help` (hạng 1) | Quyết định sản phẩm, không phải quyết định kỹ thuật. Nếu "không", hạng 1 đổi thành `tool-pair-guard` |
| **P2** | Cho `model-fallback` mở seam `ctx.sessionSettings` (một `ExtensionContext` mới, khoảng 20 dòng), hay viết bảng cấu hình riêng cho nó? | `model-fallback` (hạng 4) | Mở `sessionSettings` là **mở hạ tầng** — nó không thuộc sóng "không mở seam". Chạm vào là đổi bản chất milestone |
| **P3** | `anthropic-bash` có đáng chờ KDL axis không? | `anthropic-bash` (hạng 6) | `AGENTS.md` **cấm** hard-code chính sách theo model trong TS. Không có axis thì đây là vi phạm luật, không phải quyết định lợi nhuận |

**Không port trong sóng này, ghi để không ai port trùng:** `loop-guard` (cần `agent_settled`, 0 hit ở omp — thuộc sóng seam; và omp **đã có** `ToolCallLoopGuard` tại `packages/ai/src/utils/tool-call-loop-guard.ts:68`, đã test, đã dùng ở `src/session/stream-guards.ts:220`) · `hooks` (4.663 dòng) · `rules` (2.842 dòng) · `permission-system` (1.638 dòng, kiến trúc approval không tương thích) · `account` (không có `CredentialAccountSummary`/`pinCredentialAccount`/`ctx.sessionSettings` ở omp) · `tool_search` (không phải tool của omp; 8 hit là tên tool server-side của provider).

## Minh bạch về cái tôi đã và không đo

- **Đã đo, 3 phương pháp khớp nhau:** 13 builtin (đường dẫn thật `packages/coding-agent/src/core/extensions/builtin/`, 59 mục chứ không phải 40) · dòng `.ts` không test cho từng cái · `on("…")` của từng cái · `changes.md` có hay không · `BUILTIN_TOOL_NAMES` nguyên file.
- **Đã kiểm chứng từng dòng neo trong bảng "File cần chạm tới"** — không có neo nào chép từ tài liệu trước. Riêng `runner.ts:1820/1827/1841/1843` là tôi tự đọc.
- **Chưa đọc:** `hooks/` (23 file), `rules/` (19 file), `permission-system/` (15 file), `imagegen/` (7 file) — nên các mục "❌ bỏ" dựa trên **cỡ + thiếu phép đo cắm core**, không phải đọc code. Đây là lý do công ước của hạng 4-6 là ước lượng.
- **Bác bỏ được hai khẳng định của nghiên cứu trước**, bằng đo lại: (a) "`loop-guard` thật sự không cần seam" — nó dùng 8 event, gồm `agent_settled`; (b) "3 builtin seam-free thật sự là loop-guard / bash-timeout / history-search" — `bash-timeout` **đã có** ở omp, và `loop-guard` **không nằm trong 13**.
- **Hai bẫy phép đo đã biết vẫn còn hiệu lực** (`SENPI_FINDINGS.md` §7.18): `git grep -E '\b…\b'` trả 0 trên macOS — tôi dùng `git grep -w`; `git ls-files '<pathspec>'` là hợp nhất, không lọc theo thư mục — tôi dùng `find`. Và tôi tìm thêm **bẫy thứ ba**: đường dẫn `builtin/<tên>` ở gốc cây senpi **không tồn tại**; dùng nó sẽ cho 13 kết quả `MISSING-DIR`.
