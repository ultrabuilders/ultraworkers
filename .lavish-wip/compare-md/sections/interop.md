## Miền: Tương thích (MCP, ACP, protocol khác)  omp so với 4 repo tham chiếu

Đo tại chỗ, không clone. Mọi số dưới đây chạy bằng `git -C <repo> ls-files` / `xargs cat | wc -l` / `git grep`.
Ngày commit cuối: omp 2026-09-28 · gajae 2026-09-26 · codex 2026-09-26 · pi 2026-09-25 · opencode 2026-09-25.

## Sửa hai điều kiện đã cho trước

**1. `pi` KHÔNG có MCP, và cũng không có ACP.**

```
$ git -C /Users/tranquangdang21/Projects/pi-ref ls-files | grep -icE "mcp"
0
$ git -C /Users/tranquangdang21/Projects/pi-ref ls-files | grep -icE "(^|[-_/])acp([-_/]|$)"
0
$ ls /Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/
bun  cli  client  experimental  extensions  modes  utils      # không có thư mục mcp/
```

Hai chỗ duy nhất trong `pi` nhắc "MCP":

```
$ git -C .../pi-ref grep -rn "modelcontextprotocol" -- '*.json' | head
package-lock.json:1198:  "@modelcontextprotocol/sdk": "^1.25.2"
```

Đó là **optional peerDependency của `@google/genai`**, không phải code của pi:

```
$ python3 -c "... d['packages'] ..."
PARENT: node_modules/@google/genai | peer: {'@modelcontextprotocol/sdk': '^1.25.2'}
```

Chỗ thứ hai là một dòng comment trong `packages/coding-agent/src/utils/tool-result-images.ts:17`.
Hệ quả: đề án M1B "chép `protocol`/`client`/`server` của pi" không liên quan gì MCP. Ba package đó
là **protocol embed nội bộ của riêng pi** (CBOR + framing + Unix socket), 3.970 LOC — xem mục 3.

**2. `gajae` KHÔNG phải repo tham chiếu độc lập — nó là fork của chính dòng omp.**

```
$ comm -12 <(git -C omp ls-files|sort) <(git -C gajae ls-files|sort) | wc -l
1724                                    # trong tổng 6.027 file của gajae, 7.946 của omp
```

Bằng chứng cấu trúc mạnh hơn con số: `gajae` đổi tên thư mục `src/mcp/` → `src/runtime-mcp/`, giữ nguyên
16 tên file:

```
$ comm -12 <(omp src/mcp basenames) <(gajae src/runtime-mcp basenames) | tr '\n' ' '
client.ts config-writer.ts config.ts http.ts index.ts json-rpc.ts loader.ts manager.ts
oauth-discovery.ts oauth-flow.ts smithery-auth.ts smithery-connect.ts smithery-registry.ts
stdio.ts tool-bridge.ts tool-cache.ts types.ts
```

Và `gajae/crates/` vẫn mang tên thời omp: `pi-ast`, `pi-iso`, `pi-natives`, `pi-shell`.
Remote: `github.com/Yeachan-Heo/gajae-code.git`. Nó **mới hơn `pi`** (2026-09-26 vs 2026-09-25), tức là
đang được bảo trì song song, không phải bản sao cũ. Mọi thứ gajae làm thêm so với omp là **hướng đi của
một fork**, và cái giá để chép từ đó là cái giá để đi con đường của họ — không phải cách duy nhất.

Dòng thời gian: `pi` (earendil-works/pi) → `omp` (ultrabuilders/ultraworkers) → `gajae`.
Chỉ `opencode` và `codex` thật sự độc lập (giao nhau với omp lần lượt 29 và 17 đường dẫn).

## per_repo

| repo | Có gì | Bằng chứng | Kích thước |
|---|---|---|---|
| **omp** | MCP **client** (đủ 3 transport); MCP **server** hẹp (bộ nhớ); ACP **agent** tự viết; LSP | `packages/coding-agent/src/mcp/` (26 file); `transports/{stdio,http,sse}.ts`; `packages/mnemopi/src/mcp-server.ts`; `packages/coding-agent/src/modes/acp/` | MCP client **10.792** LOC · MCP server 1.125 · ACP **5.896** LOC · LSP 10.392 |
| **pi** | **Không MCP. Không ACP.** Chỉ có protocol embed nội bộ (CBOR + Unix socket) | `git ls-files \| grep -ci mcp` → `0`; `@google/genai` peer dep | embed 3.970 LOC (`protocol`+`client`+`server` src) |
| **opencode** | MCP **client** (không server); ACP **agent** dùng SDK chính thức | `packages/core/src/mcp/` (5 file); `packages/cli/src/acp/` (9 file); không có `registerTool`/`StdioServerTransport` ở đâu | MCP client **2.390** LOC · ACP **2.166** LOC, 21 test file |
| **codex** | MCP **client** lớn nhất bảng (Rust); **không ACP**; app-server protocol để embed | `codex-rs/rmcp-client/`, `codex-rs/codex-mcp/`, `core/src/mcp_tool_call.rs`; `mcp_cmd.rs:54-60` chỉ có list/get/add/remove/login/logout — **không có `serve`** | MCP **50.590** LOC Rust · app-server-protocol **186.003** LOC |
| **gajae** | MCP client + **2 MCP server**; ACP agent (SDK 1.3.0) + **ACP làm provider**; bridge sang codex | `runtime-mcp/`; `coordinator-mcp/server.ts:11418-11507`; `sdk/mcp/server.ts:397-426`; `ai/src/providers/devin-acp.ts`; `coordinator-mcp/codex-handoff.ts` | MCP client 12.835 · MCP server 12.238 · ACP agent 7.294 + sdk 1.143 + provider 1.103 |

### 1. MCP: ai server, ai client, ai cả hai

| repo | Client | Server | Ghi chú |
|---|---|---|---|
| omp | ✅ 10.792 LOC | ⚠️ hẹp | `mnemopi/src/mcp-server.ts:72-87` dispatch `initialize`/`tools/list`/`tools/call`. Chỉ phục vụ bộ nhớ. **Không** phục vụ tool của omp. |
| pi | ❌ | ❌ | không có gì |
| opencode | ✅ 2.390 LOC | ❌ | `MCP.Service` chỉ kết nối ra. |
| codex | ✅ 50.590 LOC Rust | ❌ | không có subcommand `serve`. |
| gajae | ✅ 12.835 LOC | ✅ 12.238 LOC | **hai** server thật, xem dưới. |

**omp không phải MCP server.** Đây là điểm cần nói thẳng: `docs/mcp-server-tool-authoring.md` dễ gây
hiểu nhầm, nhưng file thật (`mcp-server.ts`, 155 dòng) chỉ là adapter stdio cho `mnemopi`, không liên quan
gì tới việc expose tool của omp. Vậy nên trên trục MCP, **omp là client hạng nặng nhất ngoài codex, nhưng
là client thuần**.

`gajae` là repo duy nhất phục vụ MCP ra ngoài, và làm bằng hai tầng khác nhau:

- `coordinator-mcp/server.ts` (11.748 dòng) — JSON-RPC thật, dispatch `initialize` (11418), `tools/list`
  (11432), `prompts/list` (11439), `resources/list` (11442), `tools/call` (11445). Kèm cả hàng đợi câu hỏi
  và vòng đời phiên.
- `sdk/mcp/server.ts` (490 dòng) — `runSdkMcpStdio()` (426): serve session SDK của chính nó qua stdio.

Đây là hướng "làm coordinator đa agent", không phải "làm tool cho người khác dùng".

### 2. ACP: repo nào nói chuyện được

| repo | ACP | Vài trò | SDK | LOC src | Test file |
|---|---|---|---|---|---|
| **gajae** | ✅ | agent **+ provider** | `@agentclientprotocol/sdk` **1.3.0** | 7.294 (agent) + 1.143 (sdk) + 1.103 (devin) | **49** |
| **omp** | ✅ | agent | **tự viết** | 5.896 | 16 |
| **opencode** | ✅ | agent | `@agentclientprotocol/sdk` **1.2.1** | 2.166 | 21 |
| **codex** | ❌ | — | — | 0 | 0 |
| **pi** | ❌ | — | — | 0 | 0 |

Đo bằng tên phương thức (không phải tên file), trong `packages/utils/src/acp/protocol.ts` +
`packages/coding-agent/src/modes/acp/*` của omp:

```
fs/read_text_file fs/write_text_file session/cancel session/close session/fork session/list
session/load session/new session/prompt session/request_permission session/resume
session/set_config_option session/set_mode session/update
```

14 phương thức. Cả ba cùng `PROTOCOL_VERSION = 1` (omp `utils/src/acp/protocol.ts:13`, opencode
`cli/src/acp/service.ts:202`). **Ba bản thực sự tương thích**, không chỉ trùng tên.

gajae chỉ lộ 4 phương thức dạng chuỗi vì nó gọi hằng số của SDK, không hardcode — đó là bằng chứng nó
thật sự dựa vào SDK, không phải chỉ copy tên.

### 3. Thứ tương thích thứ ba mà omp không có

**(a) ACP dùng làm *backend agent* — chỉ gajae có.**
`gajae/packages/ai/src/providers/devin-acp.ts` (1.103 dòng) tự mô tả:

> "Devin CLI exposes no raw model-inference endpoint. Its programmatic surface is `devin acp` […]
> GJC therefore speaks ACP as the *client* and treats Devin as an agent-level provider"

Nó spawn `devin acp`, giữ 1 session ACP suốt đời hội thoại, forward duy nhất lượt user mới nhất, và
render `session/update` thành block display-only. Đây là "điều hoà cho tới khi backend LLM không thật
sự là LLM" — một kiểu tương thích mà **không repo nào khác trong 5 repo có**, kể cả codex.

**(b) Bridge sang agent khác — chỉ gajae có.** `coordinator-mcp/codex-handoff.ts` (552) +
`codex-wake-publisher.ts` (429) = 981 dòng, phát `question.opened`, `turn.waiting_for_answer`,
`turn.completed`… sang codex qua Unix socket hoặc TCP, kèm kiểm tra endpoint và ủy quyền token.
Trong omp, `grep -rniE "bridge.*(codex|claude|gemini)"` chỉ trả về **một** dòng comment ở
`session/code-mode.ts:4`. Không có gì.

**(c) Protocol để embed — codex mạnh nhất, không phải thứ omp thiếu.**

| repo | Bề mặt embed | LOC |
|---|---|---|
| codex | `app-server-protocol` (Rust + JSON Schema + TypeScript sinh ra) | **186.003** |
| opencode | `packages/server` + `packages/protocol` | 8.018 |
| omp | `sdk.ts` + `rpc` | 5.082 |
| gajae | `sdk/` + `coordinator-mcp/` | 145.820 (nhưng phần lớn là bus Telegram/Slack/Discord) |
| pi | `protocol`+`client`+`server` (CBOR, Unix socket) | 3.970 |

codex định nghĩa schema JSON-RPC 186k LOC có cả bản `.json` và `.ts` sinh tự động, publish ra ngoài. Đây
là thứ lớn nhất bảng và omp không có gì tương đương — nhưng nó là chi phí, không phải món ngon.

**(d) LSP.** omp 10.392 LOC (`src/lsp/`, 49 file) · gajae 7.365 · opencode 4.023 · codex 1 · **pi 0**.
omp mạnh nhất. Đây là điểm omp thắng rõ.

### 4. Port và wire format: trùng tên hay tương thích thật

**MCP — không tương thích, và đây là phát hiện đáng chú ý nhất của cả đợt đo.**

```
omp     packages/coding-agent/src/mcp/types.ts:175
        export const MCP_PROTOCOL_VERSION = "2025-11-25";

gajae   runtime-mcp/*:  "2025-03-26"  "2025-11-25"  "2026-07-28"  "2026-11-01"
opencode packages/core/src/mcp/client.ts:81-92: hỗ trợ "2026-07-28" + legacy fallback
codex   "2024-11-05" "2025-01-05" "2025-02-01" "2025-03-26"
```

omp **ghim một bản duy nhất** ở `2025-11-25` và không có đường thoái lui nào. opencode xử lý
`2026-07-28`, nơi client phải học kết quả `tools/call` bằng cách retry thay vì đọc từ response
(`client.ts:81-92`) — đúng loại thay đổi ngữ nghĩa mà mã ghim cứng sẽ hỏng âm thầm. Hai con số đó không
tương thích với nhau, và `2025-11-25` của omp đã cũ hơn hai thế hệ.

**ACP — tương thích thật.** Cùng `PROTOCOL_VERSION = 1`, cùng tên phương thức, cùng nội dung
`ContentBlock` (text/image/audio/resource_link/embedded_resource — `utils/src/acp/protocol.ts:38-76`).
omp tự viết schema (`utils/src/acp/schema.ts`, 160 dòng) thay vì dùng SDK, và vẫn nói chuyện được với
Zed. Đây là bằng chứng rằng bề mặt wire của ACP đủ ổn định để viết tay.

**Điểm mà wire format không đo được, nhưng đo bằng số test thì thấy:** omp có 16 file test ACP và
**83** file test/fixture MCP. gajae có 49 test ACP. opencode có 21 test ACP nhưng chỉ 13 test MCP.
omp là repo duy nhất có hệ thống fixture MCP sinh ra để ép từng nhánh lỗi: `test/fixtures/crash-after-init-mcp.ts`,
`hang-during-init-mcp.ts`, `flaky-http-mcp.ts`, `reconnect-storm`… Đây là tài sản vận hành, không copy được
bằng cách chép file.

### 5. Chỗ omp ĐÃ làm tốt hơn

1. **Test fixture MCP.** 83 file test/fixture so với 13 của opencode và 67 của gajae. Không repo nào
   khác dựng được bộ fixture ép lỗi ở mức này.
2. **LSP.** 10.392 LOC / 49 file, gấp 2,5× gajae, gấp 26× codex, và `pi` không có gì.
3. **Giữ cả 3 transport MCP.** omp có `stdio` + `http` + `sse`; gajae đã **bỏ `sse.ts`** (chỉ còn
   `http.ts` + `stdio.ts`). Đây là quyết định của fork, không phải tiến bộ — nếu server cũ chỉ nói SSE
   thì gajae không nối được, còn omp nối được.
4. **Không ràng buộc SDK.** Không phụ thuộc `@modelcontextprotocol/sdk` lẫn `@agentclientprotocol/sdk`
   (grep cả hai trong mọi `package.json`: **0 hit**). Nhờ vậy một bản SDK nổi lên không làm hỏng build,
   và việc thêm transport không cần nâng cấp dependency. Đổi lại: phải tự bảo trì schema.
5. **Chiều ngược không bị ràng buộc.** omp không phụ thuộc vào `pi`, và không repo tham chiếu nào có
   `protocol`/`client`/`server` kiểu CBOR-embed mà omp thiếu. Việc chép chúng từ `pi` là lựa chọn, không
   phải vá lỗ hổng.

## omp thiếu gì

| # | Thiếu | Bằng chứng | Kích thước | Mất gì nếu bỏ qua |
|---|---|---|---|---|
| 1 | **MCP protocol revision 2026-07-28 / 2026-11-01** | `mcp/types.ts:175` ghim `2025-11-25`; opencode `client.ts:81-92` đã xử lý retry ngữ nghĩa mới | ~150-400 LOC đổi trong `client.ts` + `manager.ts` | Server mới chỉ hỗ trợ revision mới sẽ lỗi `tools/call` kiểu cũ — lỗi âm thầm, tool trả về rỗng |
| 2 | **ACP làm backend agent** (ACP-client provider) | chỉ gajae: `ai/src/providers/devin-acp.ts` | ~1.100 LOC + 1 test | Không dùng được agent nào chỉ expose ACP (Devin, Gemini CLI, một số vendor) như một provider. Đây là loại backend duy nhất trong bảng mà omp không nối tới. |
| 3 | **Bridge sang codex** (đánh thức phiên khác) | chỉ gajae: `codex-handoff.ts` + `codex-wake-publisher.ts` = 981 LOC | ~1.000 LOC | Không phối hợp được với codex đang chạy. Tính năng sản phẩm, không phải tương thích. |
| 4 | **Lày MCP server thật** (expose tool của omp) | gajae `sdk/mcp/server.ts` 490 LOC là bản nhỏ nhất, đã đủ `tools/list`+`tools/call` | ~500 LOC | omp chỉ tiêu thụ MCP, không phục vụ. Editor khác không nhúng được omp như backend tool. |
| 5 | **Bản schema MCP sinh ra** | codex `app-server-protocol/schema/{json,typescript}/` (7.241 LOC sinh tự động) | ~7.000 LOC + pipeline sinh | Không có hợp đồng wire ổn định cho bên thứ ba đồng bộ. |

**Không phải thiếu sót (đã kiểm, không thấy):** A2A. `git grep -rn "A2A"` trong omp trả 18 hit nhưng
toàn blob base64 trong `packages/tui/src/theme/glyph-bundle.json` và `MOE_BACKEND_A2A` trong
`ai/src/providers/devin/proto/exa/trainer_pb/config.proto:95`. Cả 5 repo đều không có A2A thật.
Đừng ai đề xuất port A2A.

## Kết luận

**Làm**

- **Nâng MCP lên 2026-07-28.** Đây là việc duy nhất tôi khẳng định nên làm. `mcp/types.ts:175` đang ghim
  `2025-11-25`; opencode đã xử lý ngữ nghĩa retry mới, gajae đã lên `2026-11-01`. Chi phí nhỏ
  (thay hằng + thêm nhánh trong `client.ts`/`manager.ts`), rủi ro hiện tại là tương thích với server mới.
  Làm trước mọi thứ khác trong danh sách này.

**Làm nếu có điều kiện**

- **MCP server tối thiểu** (~500 LOC, theo khuôn `gajae/sdk/mcp/server.ts`) — *chỉ khi* có yêu cầu
  nhúng omp vào editor. Nếu không, `mcp/client.ts` đã cho phép làm ngược: chạy một process làm MCP
  client rồi đẩy tool ngược. Đừng viết server chỉ vì "opencode/codex có" — chúng không có.
- **ACP làm provider** (~1.100 LOC) — *chỉ khi* có backend agent cụ thể cần nối. Chi phí không chỉ là
  code: `devin-acp.ts` phải trả lời 4 loại câu hỏi (ai giữ lịch sử hội thoại, ai thực thi tool, ai trả
  lời `session/request_permission`, ai render `session/update`) và mọi công cụ của omp trong lượt đó
  **không dùng được**. Đó là một quyết định sản phẩm, không phải một bổ sung kỹ thuật.
- **Bridge codex** (~1.000 LOC) — *chỉ khi* `collab-web` thực sự cần điều phối với tiến trình codex bên
  ngoài. Hiện tại đây là tính năng của gajae, không phải nợ kỹ thuật của omp.

**Không làm**

- **Chép `protocol`/`client`/`server` của `pi` với lý do "MCP".** Đo đã bác bỏ: `pi` có 0 file MCP.
  Ba package đó là CBOR-over-Unix-socket, 3.970 LOC, phục vụ điều phối nội bộ. `omp` đã có
  `collab-web` (WebSocket) và `sdk.ts`; thêm một giao thức embed thứ ba tạo ra ba đường vào, không
  phải một.
- **Port `coordinator-mcp` của gajae** (12.238 LOC). Đây là kiến trúc coordinator đa agent của một
  sản phẩm có Telegram/Slack/Discord bus (145.820 LOC trong `sdk/`). Chép khối này vào omp là chép
  cả mô hình sản phẩm của họ.
- **Port `app-server-protocol` của codex** (186.003 LOC). Chủ yếu là schema sinh tự động cho JSON-RPC
  nội bộ của chính codex; không phải chuẩn mà ai ngoài codex dùng.
- **Bỏ `sse.ts`.** gajae đã bỏ; đó là hồi quy, không phải chuẩn.

## Chi phí

| Việc | LOC ước tính | Rủi ro | Nguồn lấy |
|---|---|---|---|
| MCP → 2026-07-28 | 150-400 | Thấp. Rủi ro thật là **không** làm | opencode `core/src/mcp/client.ts:81-92` (mô tả ngữ nghĩa), gajae `runtime-mcp/protocol.ts` |
| MCP server tối thiểu | ~500 | Thấp | gajae `sdk/mcp/server.ts` (đã MIT, 490 dòng, sẵn `tools/list`+`tools/call`) |
| ACP làm provider | ~1.100 + test | **Cao** — đổi mô hình quyền sở hữu tool và lịch sử hội thoại | gajae `ai/src/providers/devin-acp.ts` (MIT) |
| Bridge codex | ~1.000 | Trung bình — protocol riêng, không chuẩn, phải khớp phiên bản codex | gajae `coordinator-mcp/codex-handoff.ts` |
| Schema sinh tự động | ~7.000 + pipeline | Trung bình | codex `app-server-protocol/` (Apache-2.0) |

**Ràng buộc giấy phép:** cả bốn repo tham chiếu đều cho phép sao chép — `pi` MIT, `opencode` MIT,
`codex` Apache-2.0, `gajae` MIT. Không có rào cản pháp lý nào chặn bất kỳ món nào trên đây. Ràng buộc
thật là **chi phí và mô hình sản phẩm**, không phải luật.

**Cái mất nếu bỏ qua toàn bộ:** chỉ mất khả năng nối tới các server MCP mới hơn `2025-11-25`. Đó là
khoản nợ kỹ thuật thật duy nhất. ACP, LSP, ba transport, bộ 83 fixture test — omp đã đứng vững ở đây,
thắng cả hai repo độc lập. Phần còn lại của danh sách là *sản phẩm*, không phải *tương thích*.
