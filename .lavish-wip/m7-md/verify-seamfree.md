# Bác bỏ `w-seamfree.md` — kiểm chứng từng neo

> File bị bác bỏ: `.lavish-wip/m7-md/w-seamfree.md` (224 dòng).
> Cây kiểm: omp = `/Users/tranquangdang21/Projects/ultraworkers` · senpi = `/Users/tranquangdang21/Projects/senpi-ref` @ `ea9216269e9254b821446130b60d1e00759761dc` (HEAD, đã xác nhận).
> Ngân sách: 17 lệnh shell. Mọi khẳng định dưới đây đã chạy trên cây thật.

## Kết luận một dòng

**Không bác bỏ được phần lõi.** Bảng 13/13, toàn bộ neo `runner.ts` / `directory-resolution.ts` / `types.ts`, và mọi con số cỡ file ở cả hai cây đều **đúng**. Nhưng có **5 lỗi thật**, trong đó **2 lỗi làm hỏng một neo triển khai** (đường dẫn đích không tồn tại) và **3 lỗi làm sai lý do** khiến quyết định dựa trên đó đáng ngờ.

---

## A. SAI — có bằng chứng trái chiều

| khẳng định | lệnh kiểm | kết quả | đứng vững / sai / chưa đủ |
|---|---|---|---|
| Hạng 5 `nested-agents-md`: "Cần `isReadToolResult` mà `types.ts` của senpi có, **omp phải tự viết**" (dòng 36, 65) | `git grep -nw isReadToolResult -- packages/` | **3 hit** — `src/extensibility/legacy-pi-coding-agent-shim.ts:1616` `export function isReadToolResult(e: ToolResultEvent): e is ReadToolResultEvent`, có test ở `test/extensibility/legacy-pi-tool-result-guards.test.ts:8,40` | **SAI.** Hàm đã có, đã export, đã có test. Công hạng 5 (~350 dòng / ~1,5 ngày) bị thổi phồng, và "rủi ro trung bình: phải tự viết" là rủi ro không tồn tại |
| Dòng 68 + 216: "omp **đã có** `ToolCallLoopGuard`… **đã được dùng ở** `src/session/stream-guards.ts:220`" | `git grep -nw ToolCallLoopGuard -- packages/` · `sed -n '215,225p' stream-guards.ts` | 23 hit, **toàn bộ** nằm trong `packages/ai/src/utils/tool-call-loop-guard.ts` + `packages/ai/test/tool-call-loop-guard.test.ts`. **Không có consumer sản xuất nào.** `stream-guards.ts:220` đọc ra là `"loop-guard",` — chuỗi **nhãn thông báo** trong `emitNotice("warning", …)`, không phải dùng class | **SAI.** Class có + test có (`:68` đúng), nhưng "đã dùng ở `:220`" sai hoàn toàn. Đây là guard **tested-but-unwired**. Kết luận "không port `loop-guard`" thì vẫn đúng, nhưng **bằng chứng** sai — và "omp đã có" yếu hơn đã nói: có code chết, không có hành vi |
| Bảng "File cần chạm tới" dòng 130: **tạo** `packages/coding-agent/src/modes/interactive/help-content.ts` | `ls packages/coding-agent/src/modes/interactive/` · `find modes -maxdepth 1 -name 'interactive*'` | `No such file or directory`. omp có **`modes/interactive-mode.ts`** (một *file*), không có thư mục `modes/interactive/` | **SAI — neo chỉ vào hư không.** Kế hoạch chép *layout* của senpi (`./packages/coding-agent/src/modes/interactive/help-content.ts` **có thật** ở senpi) mà không kiểm thư mục đích có tồn tại không. Đây đúng loại "một neo sai làm cả bước triển khai vô dụng" |
| Dòng 91: `resolveExtensionDirectory` "có **đúng hai caller**: `extensions/loader.ts:36` và `plugins/loader.ts:12`" | `grep -rn 'resolveExtensionDirectory' src/` | `:36` và `:12` là **dòng import**, không phải caller. Call site thật thứ hai là **`plugins/loader.ts:321`** — `return resolveExtensionDirectory(joined, PLUGIN_EXTENSION_DIRECTORY_OPTIONS).files;` | **SAI (định nghĩa).** Hai call site thật là `extensions/loader.ts:653` và `plugins/loader.ts:321`. Mệnh đề phụ "trong `loader.ts` lời gọi duy nhất ở `:653`" thì **đúng**. Kết luận "không sửa `directory-resolution.ts`" **không đổi** |
| Dòng 17: `builtin/` "chứa **59 mục** (**40 thư mục + 19 file** lỗng)" | `ls …/builtin \| wc -l` · `find -maxdepth 1 -mindepth 1 -type d \| wc -l` · `-type f \| wc -l` | `ls` = **59** ✓ nhưng phân rã = **40 thư mục + 17 file = 57**. `find ! -type d ! -type f` = **rỗng** (không phải symlink) | **SAI.** Tổng 59 đúng, cấu phần sai. Sai ở đây vô hại (chỉ dùng để minh hoạ cỡ), nhưng đáng ghi vì cùng một câu lệnh mà tác giả tự nói là "3 phương pháp khớp nhau" |
| Dòng 17: "`find . -maxdepth 4 -type d -name 'builtin*'` trả về **rỗng**" ⇒ suy ra "13 tên **không nằm dưới** `builtin/`" | `find . -maxdepth 4 -type d -name 'builtin*' \| wc -l` | = **0** ✓ nhưng **suy luận sai**: `packages/coding-agent/src/core/extensions/builtin` nằm ở **độ sâu 6**, nên `maxdepth 4` không thể thấy nó. `maxdepth 4` rỗng **không chứng minh** thư mục không tồn tại | **SAI suy luận.** "Bẫy thứ ba" là hiện ứng phụ của chính câu lệnh dò. May thay phép đo 13/13 vẫn dùng **đường dẫn thật** nên kết quả không bị nhiễm |

---

## B. Sai một nửa — phần đúng, phần không

| khẳng định | lệnh kiểm | kết quả | đứng vững / sai / chưa đủ |
|---|---|---|---|
| Dòng 35 + 205 (R7): "`setFallbackChain`/`ctx.sessionSettings` **0 hit**", và R7 nói `model-fallback` "**bị chặn vĩnh viễn**" bởi `ctx.sessionSettings` | `git grep -nw setFallbackChain -- packages/` · `-nw sessionSettings -- packages/` | `setFallbackChain` = **8 hit** (không phải 0) — nhưng **cả 8** là `#setFallbackChain` private của class TUI trong `packages/tui/src/overlays/model-hub.ts`, **không liên quan** tới extension. `sessionSettings` = **52 hit**; riêng trong `extensions/types.ts` = **0** ✓ | **Nửa đúng nửa sai.** Mệnh đề "0 hit trong `types.ts`" **đúng** và seam context thật sự không tồn tại. Nhưng `setFallbackChain = 0 hit` **sai theo đúng phương pháp tác giả tự tuyên bố** (`git grep -nw`) — và 8 hit là *bẫy*: grep 0 thì kết luận đúng, nhưng tác giả không chạy lại lệnh của mình |
| Đóa P2 (dòng 213) + R7: mở `ctx.sessionSettings` là "**mở hạ tầng**… đổi bản chất milestone" | `sed -n '676,684p' extensions/runner.ts` · `sed -n '197p' extensions/wrapper.ts` | `runner.ts:680` `get sessionSettings(): Settings \| undefined { return this.settings; }` — **Settings đã tồn tại và runner đã giữ nó**. `wrapper.ts:197` dùng nó cho approval | **Đứng vững một nửa.** Seam *cho extension* thì chưa có, nhưng dữ liệu **đã có sẵn trong runner** — đây là "phơi ra một getter đã có", không phải "mở hạ tầng mới". R7 ghi *"chặn vĩnh viễn"* là **thổi phồng mức độ** |

---

## C. ĐỨNG VỮNG — đã kiểm, không bác bỏ được

Toàn bộ những mục dưới đây tôi **cố** bác bỏ và không được. Chạy đúng lệnh tác giả ghi, kết quả khớp.

### C1. Bảng 13/13 (dòng 26-40) — 10/13 hàng khớp tuyệt đối

Đo bằng `find … -name '*.ts' -not -name '*.test.ts' -not -path '*/__tests__/*' -exec cat {} + | wc -l`, đếm lại lần hai bằng `grep -rhoE 'on\(\s*"[a-z_]+"'`.

| # | builtin | dòng `.ts` | file | `on()` | `changes.md` | kết luận |
|---:|---|---:|---:|---:|:---:|---|
| 1 | `account` | 82 ✓ | 1 ✓ | 0 ✓ | N ✓ | ✓ |
| 2 | `anthropic-bash` | 103 ✓ | 1 ✓ | 1 ✓ | N ✓ | ✓ |
| 3 | `bash-timeout` | 118 ✓ | 2 ✓ | 1 ✓ | Y ✓ | ✓ |
| 4 | `help` | 148 ✓ | 2 ✓ | 0 ✓ | Y ✓ | ✓ |
| 5 | `history-search` | 401 ✓ | 5 ✓ | 0 ✓ | N ✓ | ✓ |
| 6 | `hooks` | 4.663 ✓ | 23 ✓ | **12** (khách 10) | N ✓ | cỡ ✓, `on()` lệch |
| 7 | `imagegen` | 880 ✓ | 7 ✓ | 1 ✓ | Y ✓ | ✓ |
| 8 | `model-fallback` | 207 ✓ | 3 ✓ | 0 ✓ | N ✓ | ✓ |
| 9 | `nested-agents-md` | 539 ✓ | 11 ✓ | 4 ✓ | Y ✓ | ✓ |
| 10 | `permission-system` | 1.638 ✓ | 15 ✓ | 3 ✓ | Y ✓ | ✓ |
| 11 | `rules` | 2.842 ✓ | 19 ✓ | 4 ✓ | Y ✓ | ✓ |
| 12 | `tool-pair-guard` | 269 ✓ | 3 ✓ | 1 ✓ | N ✓ | ✓ |
| 13 | `webfetch` | 1.062 ✓ | 10 ✓ | 2 ✓ | Y ✓ | ✓ |

Riêng `permission-system` khớp 3 ✓ — con số "6" tôi đo được ở lượt đầu là **artefact của `grep -o` đếm hai lần trên một dòng**; lượt hai (`grep -n '\bon\s*\('`) ra đúng **3** `pi.on(...)`. Tác giả đúng.

### C2. Toàn bộ neo `path:line` ở omp

| neo | lệnh | kết quả | |
|---|---|---|---|
| `types.ts` tổng = 1.849 dòng | `wc -l` | `1849` | ✓ |
| `types.ts:1504` `getCommands(): SlashCommandInfo[]` | `sed -n 1504p` | khớp từng ký tự | ✓ |
| `types.ts:258` `notify(message, type?)` | `sed -n 258p` | khớp | ✓ |
| `types.ts:282` `custom<T>(` | `sed -n 282p` | khớp | ✓ |
| `types.ts:774` `payload: unknown;` | `sed -n 774p` | khớp | ✓ |
| `types.ts:1166` | `sed -n 1166p` | `export type BeforeProviderRequestEventResult = unknown;` | ✓ |
| `runner.ts:1820` `let currentPayload = payload;` | `sed -n 1820p` | khớp | ✓ |
| `runner.ts:1827-1829` đưa `currentPayload` vào event | `sed -n 1827,1829p` | `payload: currentPayload` | ✓ |
| `runner.ts:1841-1843` gán lại | `sed -n 1841,1843p` | `currentPayload = handlerResult;` | ✓ |
| `return currentPayload` | `sed -n 1846p` | `:1846` | ✓ |
| `directory-resolution.ts` 145 dòng, `:69-70`, `:87-89`, `:102` | `wc -l` + 3× `sed` | khớp từng dòng | ✓ |
| `loader.ts:36` import · `:641` "4. Explicitly configured paths" · `:653` lời gọi | 3× `sed` | khớp | ✓ |
| `builtin-names.ts` 68 dòng, 30 tool + 3 hidden, `fetch`/`webfetch` = 0 | `wc -l` + `sed -n 33,40p` + `git grep -nwE` | 68 ✓ · `HIDDEN_TOOL_NAMES = ["yield","goal","think"]` tại dòng 36 ✓ · 0 hit ✓ | ✓ |
| `stream.ts:575` `parseJsonlLenient<T>(buffer, {onMalformedRecord})` | `sed -n 575p` | khớp | ✓ |
| `memories/index.ts:691` + `:734` là consumer thật | `sed -n 691p;734p` | cả hai đều `parseJsonlLenient<…>` | ✓ |
| `bash.ts:330` `BASH_TIMEOUT_DESCRIPTION` clamp `TOOL_TIMEOUTS.bash.min/max` | `sed -n 330p` | khớp từng ký tự | ✓ |
| `image-gen.ts` 12 KB · `getImageGenTools` tại `:309` · wiring `sdk.ts:3218-3219` | `wc -c` + 2× `sed` | 12.045 B ✓ · `:309` ✓ · `:3218` gọi `getImageGenTools` ✓ | ✓ |
| `fetch.ts` 53 KB · `renderHtmlToText:592` · `fetchReadUrl:1613` · `materializeReadUrlToFile:1660` · `executeReadUrl:1686` | `wc -c` + 4× `sed` | 54.166 B ✓ · cả 4 khớp | ✓ |
| `approval.ts` 13 KB | `wc -c` | 13.519 B ✓ | ✓ |
| `tool-call-loop-guard.ts:68` `export class ToolCallLoopGuard` | `sed -n 68p` | ✓ (dùng ở `:220` thì sai — mục A) |
| `task/executor.ts:261` `fallbackChain` | `sed -n 261p` | `const fallbackChain = (role !== undefined ? …)` | ✓ |
| `NOTICE.md` chưa tồn tại ở omp | `ls NOTICE.md` | `No such file or directory` | ✓ |
| `help-content` = 0 hit trong `packages/coding-agent/src` | `git grep -nw` | 0 | ✓ |

### C3. Các khẳng định "0 hit" còn lại — đều đúng

`git grep -nw <s> -- packages/`: `model_select` **0** ✓ · `buildHelpMarkdown` **0** ✓ · `sanitizeAnthropicToolPairs` **0** ✓ · `CredentialAccountSummary` **0** ✓ · `pinCredentialAccount` **0** ✓ · `warmPromptCache` **0** ✓ · `agent_settled` **0** (cả `types.ts` lẫn toàn `packages/`) ✓.

`tool_search`: **0** trong `tools/builtin-names.ts` ✓ và **8** trong `packages/` ✓ — đúng như kế hoạch nói ("8 hit là tên tool server-side của provider").

### C4. Toàn bộ nguồn port ở senpi

`git rev-parse HEAD` = `ea9216269e9254b821446130b60d1e00759761dc` ✓ đúng SHA ghim.

`tool-pair-guard/`: `index.ts` **15** ✓ · `sanitize-openai-chat-completions-payload.ts` **105** ✓ · `sanitize-openai-responses-payload.ts` **149** ✓.
`history-search/`: `index.ts` **56** ✓ · `indexer.ts` **168** ✓ · `overlay.ts` **141** ✓ · `filter.ts` **29** ✓ · `types.ts` **7** ✓.
senpi `NOTICE.md` = 2.193 B ≈ **2,1 KB** ✓ · senpi `modes/interactive/help-content.ts` **tồn tại** ✓ (thư mục đích chỉ thiếu ở omp).

**Bác bỏ thất bại ở chỗ khó nhất:** kế hoạch nói `indexer.ts:44-50` định nghĩa `parseJsonLine` gọi `JSON.parse(line)` trực tiếp rồi nuốt `SyntaxError`. Đây là cổng R1 — cổng chặn dễ sai nhất của cả M7. Tôi không đọc hết 168 dòng, nhưng có thể bác bỏ điểm này chỉ vì nó **làm yếu** kế hoạch chứ không làm sai: dù senpi dùng gì, kế hoạch bắt port dùng `parseJsonlLenient` vẫn đúng. Chưa bác bỏ được chi tiết `:44-50` — **ghi rõ chưa kiểm**.

---

## D. Cổng — "có phân biệt được «đã làm» với «không chạy được» không?"

| cổng | đánh giá | lý do |
|---|---|---|
| **G1** file mới đã track | ⚠️ **yếu** | `git add -A` sẽ **stage toàn bộ cây `.lavish-wip/`** — hàng chục thư mục untracked mà chính kế hoạch nói là "chưa được track, người review không thấy" (dòng 140). Cổng vẫn phân biệt được untracked, nhưng nó tự phá mục tiêu của chính nó. Nên dùng `git add <4 đường dẫn cụ thể>` |
| **G2** gõ `/help`, `/history` thấy overlay | ✅ **mạnh** | Đây là cổng thật sự duy nhất chứng minh "đã làm" khác "không chạy được". Giữ nguyên |
| **G3** guard thật sự thay payload | ✅ **mạnh** | Và cơ chế nền **đã kiểm chứng thật** (`runner.ts:1820→1846`). Đây là cổng tốt nhất trong bảng |
| **G4** JSONL hỏng không làm hỏng | ✅ **mạnh** | Cổng JSONL, có phủ định rõ |
| **G5** không hồi quy 3 file cũ | ✅ **đúng** | So kỹ thuật với `git diff --cached --stat` là cổng chống hồi quy hợp lệ |
| **G6** `bun check` + 3 file test | ✅ **ổn** | `bun check` một mình yếu, nhưng cặp với 3 file test thì đủ |
| **G7** `NOTICE.md` chứa SHA | ❌ **cổng chết theo định nghĩa của chính kế hoạch** | Xanh khi **chưa port dòng code nào** — chỉ cần tạo file rồi `grep` ra SHA. Nó không quan sát được hành vi nào. Đây là nghĩa vụ pháp lý, không phải cổng triển khai; nên tách khỏi bảng cổng |

**Nhận xét chung:** 5/7 cổng tốt. Kế hoạch tự đặt tiêu chuẩn "cổng xanh khi không nhìn thấy gì là cổng chết" (dòng 183) rồi **tự vi phạm** ở G1 và G7. Đáng ghi vì đây là tiêu chuẩn do chính file đặt ra.

---

## E. ĐÓA P0 — bác bỏ được, và là bác bỏ quan trọng nhất

Kế hoạch chặn **toàn bộ** việc viết `help` (hạng 1) vào một câu hỏi mở: *"`/help` có được phép liệt kê lệnh của extension không?"* — và tự ghi "Không viết dòng code nào của `help` khi P0 còn mở" (dòng 140), với lý do "Quyết định **sản phẩm**, không phải quyết định kỹ thuật".

Tôi đọc `extensibility/extensions/get-commands-handler.ts` (78 dòng). Nó trả lời **cả hai nửa**:

1. **Nửa kỹ thuật: ĐÃ có, không phải câu hỏi mở.** Doc comment dòng 13-14: *"**Built-in slash commands are intentionally excluded**; `getCommands()` is the surface extensions use to discover dynamic commands they did not register themselves."* Và `:36` gọi `runner.getRegisteredCommands(...)` đẩy vào với `source: "extension"`. Tức là **omp đã có hợp đồng trả lệnh extension, đã có type `source` phân biệt, đã có test-free wiring ở 5 frontend**. Cái còn mở chỉ là *quyết định có hiển thị hay không* — đó là một câu hỏi về nội dung overlay, không phải một blocker kỹ thuật chặn cả file. Chặn code trên cơ sở này là **chặn nhầm**.

2. **Nửa mà kế hoạch bỏ sót — và nó là mỏng dữ liệu thật:** vì builtin **bị cố ý loại khỏi** `getCommands()`, một overlay `/help` dựng trên `getCommands()` **sẽ không có bất kỳ lệnh builtin nào** — đúng thứ mà một màn hình trợ giúp cần nhất. Nguồn phải là **hai nguồn**: `getSessionSlashCommands()` (extension/prompt/skill) **+** `BUILTIN_SLASH_COMMAND_DEFS` (`builtin-registry.ts:60`), mà tài liệu nói "Each frontend prepends its own builtins". Kế hoạch nói chung chung "Nguồn cho nội dung là registry lệnh của chính omp" — **không nói đây là hai registry phải trộn**. Đây mới là câu hỏi thiết kế thật, và nó bị chôn dưới một nhãn sai.

→ **P0 nên đổi từ "quyết định sản phẩm chặn hạng 1" thành "trộn hai nguồn lệnh"**, và bỏ chặn ghi code.

---

## F. AGENTS.md — work item này có tạo ra code vi phạm không?

| luật | đánh giá |
|---|---|
| Cấm hard-code chính sách theo model trong TS | ✅ kế hoạch **tự phát hiện** và chặn đúng: `anthropic-bash` bị chặn ở P3 vì cần KDL axis. Đây là điểm tốt nhất của tài liệu |
| Cấm `mock.module()` | ✅ bước 10 nói rõ, kèm `vi.spyOn` + `vi.restoreAllMocks()` |
| Cấm `tsc` | ✅ G6 + bước 10 nói rõ `bun check` |
| Prompt phải nằm trong `.md`, không dựng trong TS | ✅ bước 2 yêu cầu `buildHelpMarkdown` theo nguồn sự thật của omp, không chép bản senpi |
| TUI Sanitization (`shortenPath()`, `replaceTabs()`) | ✅ R6 đã nêu, và `history-search` hiển thị cwd thật |
| **Central Utilities — "trước khi viết helper, kiểm tra đã có chưa; hai bản triển khai cùng thứ là bug"** | ❌ **VI PHẠM.** Bảng "File cần chạm tới" tạo mới `help-content.ts` với `buildHelpMarkdown`, nhưng omp **đã có** `builtin-registry.ts` (`BUILTIN_SLASH_COMMAND_DEFS`, 60) và `get-commands-handler.ts` (`getSessionSlashCommands`, 31). Tác giả **không hề grep** hai file này khi lập bảng — chỉ grep `buildHelpMarkdown` (0 hit) rồi kết luận "phải viết". `0 hit` chỉ chứng minh **tên hàm** chưa tồn tại, không chứng minh **chức năng** chưa có. Đây là vi phạm đúng luật AGENTS.md mà kế hoạch tự nhắc ở bước 10 |
| `any` · `ReturnType<>` · inline import | ✅ không dùng trong phần đặc tả |

---

## G. Effort — có cơ sở đếm, hay chỉ cảm giác?

| mục | cơ sở | đánh giá |
|---|---|---|
| Cỡ 13 builtin (cả hai cây) | **có** — đếm dòng thật, 10/13 khớp tuyệt đối | Đây là phần mạnh nhất của tài liệu. Đáng tin |
| Công hạng 1-2 (`help` ~180, `tool-pair-guard` ~200) | **gián tiếp** — dựa trên cỡ senpi 148 / 269 dòng + hệ số viết lại | Hợp lý, nhưng hệ số không được ghi ra ⇒ không kiểm chứng được |
| Công hạng 5 (`nested-agents-md` ~350) | **sai cơ sở** | Đã tính cả `isReadToolResult` phải tự viết — trong khi omp đã có sẵn. Công bị thổi |
| Công hạng 4-6 | tác giả **tự khai** là ước lượng, chỉ đọc `index.ts` | ✅ trung thực, và R8 đã ghi nhận. Đây là hành vi đúng, giữ nguyên |
| Tổng "~4,5 ngày cho hạng 1-3" | 1 + 1,5 + 2 = 4,5 ✓ cộng đúng | ✓ khớp với bảng |

Không bác bỏ được tổng effort như một con số, nhưng **cột "công" của hạng 5 và cột "công" của G7-chặn-`isReadToolResult` là ảo**.

---

## H. Đề xuất sửa, nhỏ nhất đủ để làm tài liệu này dùng được

1. **Sửa đường dẫn đích của hạng 1.** `modes/interactive/help-content.ts` **không tồn tại** ở omp (chỉ có `modes/interactive-mode.ts`). Đổi thành nơi thật, và **grep `builtin-registry.ts` + `get-commands-handler.ts` trước khi tạo file mới** — nhiều khả năng `/help` là *mở rộng* helper sẵn có, không phải file mới.
2. **Mở P0 thành hai câu hỏi kỹ thuật đã trả lời được**, và **bỏ lệnh "không viết dòng code nào của `help`"**. Câu hỏi thật cần trả lời: `/help` trộn `getSessionSlashCommands()` + `BUILTIN_SLASH_COMMAND_DEFS` thế nào, và có lọc `source` nào không.
3. **Xoá "omp phải tự viết `isReadToolResult`"** ở dòng 36 và 65; trỏ tới `legacy-pi-coding-agent-shim.ts:1616`.
4. **Sửa "đã được dùng ở `stream-guards.ts:220`"** → "`ToolCallLoopGuard` có + test, nhưng **không có consumer sản xuất**". Kết luận "không port `loop-guard`" giữ nguyên, và vẫn đúng.
5. **Sửa "đúng hai caller"** → hai **call site** là `extensions/loader.ts:653` và `plugins/loader.ts:321`.
6. **G1**: thay `git add -A` bằng `git add` 4 đường dẫn cụ thể. **G7**: bỏ khỏi bảng cổng, chuyển sang checklist pháp lý.
7. **Hạ nghiêm `R7`**: `ctx.sessionSettings` thiếu trên `ExtensionContext` là đúng, nhưng `Settings` **đã nằm trong `runner.ts:680`** — đây là "phơi ra getter sẵn có", không phải "mở hạ tầng / chặn vĩnh viễn". Giữ nguyên đóa P2 nhưng bỏ chữ "vĩnh viễn".

## I. Những gì tôi KHÔNG bác bỏ được

- **`indexer.ts:44-50` (`parseJsonLine` gọi `JSON.parse` trực tiếp)** — chưa mở file. Không ảnh hưởng kết luận vì hướng xử lý đã đúng, nhưng **chưa kiểm chứng**.
- **`runner.ts:321` trong `plugins/loader.ts` có làm "quét cây omp" không** — đọc doc comment `:294-306` cho thấy nó chỉ mở rộng **manifest entry của một plugin đã cấu hình**, không quét cây. Nghiêng về "kết luận của kế hoạch vẫn đúng", nhưng **chưa đọc hết** hàm.
- **Cổng P1 (nếu có) và `anthropic-bash`** — cố ý bỏ qua, thuộc sóng seam.
- **Các bổ sung của `hooks` / `rules` / `permission-system` / `imagegen`** — tác giả tự khai chưa đọc; tôi cũng không đọc. Các mục "❌ bỏ" dựa trên cỡ + thiếu `changes.md`, **chưa đủ dữ liệu** để bác bỏ.
