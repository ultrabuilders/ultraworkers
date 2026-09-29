# M7 — Work item: warm prompt cache (làm ấm cache, KHÔNG phải đánh dấu cache)

> Phân biệt hai việc: **đánh dấu** (`cache_control` breakpoint — omp ĐÃ CÓ) và **làm ấm**
> (gọi API chủ động để cache không hết hạn lúc session rỗi — omp THIẾU). Work item này chỉ làm
> phần thứ hai. Phần đánh dấu không viết lại, chỉ đo lại để phần mới không cạnh tranh.

## Sóng / phạm vi

**Sóng 1 — một vòng duy nhất, không chặn gì.** Đưa senpi's `cache-keepalive` vào omp dưới dạng
một extension builtin: một timer chỉ **vi sau** hành vi refresh theo yêu cầu mà omp đã có,
phát một request "warm" khi session đang rỗi, và dừng ngay khi agent bận hoặc người dùng nhập.

**Việc này KHÔNG gồm:** đánh dấu `cache_control` lên các block; cài đặt beta `extended-cache-ttl`;
khai báo `cacheRetention` trên model; phần **session-prewarm** của senpi (một request duy nhất lúc
khởi động, dành cho OpenAI Responses) — hai phần đó tách thành work item riêng.

## Đã đo — nền omp phải viết LÊN, không cạnh tranh

### Đánh dấu cache: ĐÃ CÓ

| neo | thực tế |
| --- | --- |
| `packages/ai/src/types.ts:124` | `export type CacheRetention = "none" \| "short" \| "long";` |
| `packages/ai/src/types.ts:431` | `cacheRetention?: CacheRetention;` — option request |
| `packages/ai/src/types.ts:439` | `anthropicCacheRefresh?: boolean;` — công tắc refresh theo yêu cầu |
| `packages/ai/src/providers/anthropic.ts:544` | `retention === "long" && model.compat.supportsLongCacheRetention ? "1h" : undefined` → `cacheControl.ttl = "1h"` |
| `packages/coding-agent/src/sdk.ts:4111` | `anthropicCacheRefresh: true` — omp đã BẬT theo mặc định cho coding agent |

Chuỗi đánh dấu đầy đủ đã chạy: `cacheRetention` → `getCacheControl` → `cache_control: {type:"ephemeral", ttl:"1h"}`.

### Làm ấm theo yêu cầu: ĐÃ CÓ (đây là thứ phải viến SAU nó)

`packages/ai/src/stream.ts:1209-1212` và `:1292-1296` — hành vi này đã có, là refresh nội trong một
turn: TTL cố định `ANTHROPIC_CACHE_TTL_MS = 5 * 60_000`, refresh trước 15 s (`ANTHROPIC_CACHE_REFRESH_LEAD_MS`),
tối đa 3 lần (`ANTHROPIC_CACHE_REFRESH_LIMIT`), chỉ cho `model.api === "anthropic-messages"`,
`provider === "anthropic"`, `transport !== "pi-native"`, và `cacheRetention === "short"`.
Sử dụng payload `max_tokens: 0` (`anthropic.ts:2326`) và gỡ `tool_choice` trước khi gửi
(#12597). Được bật ở `stream.ts:1369` (`anthropicCacheRefreshRequest: !thinkingEnabled`) và
`anthropic.ts:2075` (`zeroOutputCacheRefresh = options?.anthropicCacheRefreshRequest === true`).

**Hệ quả để hiểu sau:** omp có thể **sửa lỗi thời hạn của chính nó mà không thêm dòng nào**.
Cache refresh theo yêu cầu này chỉ sống trong một request. Senpi thấy điều đó thiếu — nên viết vòng
lặp ngoài request. Đó là khoảng trống duy nhất, cũng là toàn bộ phạm vi hợp lý của work item này.

### TTL `1h` không có cấu hình được

`cacheRetention` là **option request**, không phải field của model trong catalog: 0 hit cho
`cacheRetention` trong `packages/catalog/src`, 0 trong `packages/catalog/src/models.json`.
Các luật KDL có `supports-long-prompt-cache-retention` (`packages/catalog/src/compat/rules/classes/anthropic.kdl:266,286,292,317,328,341,349`)
và `supports-long-cache-retention` (`providers/anthropic.kdl:88`), nhưng chúng chỉ dẫn `cacheRetention` mặc định.
omp không có cách nào nói "dùng 1h" ngoài việc gửi option — và `sdk.ts` **không bao giờ** gửi.
Vì vậy `anthropic.ts:539` rơi về `defaultRetention = "short"` (trừ OAuth), và `:544` trả `ttl === undefined`:
cache luôn **5 phút**. Hàm `resolvePromptCacheTtlSeconds` của senpi **không tồn tại trong omp** (0 hit).

### Bốn symbol vắng mặt — đúng như báo cáo

```
warmPromptCache = 0   resolvePromptCacheTtlSeconds = 0   WarmPromptCacheOptions = 0
WarmPromptCacheResult = 0   WarmPromptCacheUsage = 0   promptCacheTtl = 0
getPromptCachePrefixRequest = 0   getPromptCacheKeepAliveSettings = 0
isOpenAIResponsesPromptCacheModel = 0   isAnthropicApiBaseUrl = 0
```

Đọc lại 12 symbol bổ sung (`appendEntry` = 56 hit; `isIdle` = 50; `hasPendingMessages` = 38;
`getSystemPrompt` = 32; `getSessionId` = 501; `getApiKeyAndHeaders` = 4; `agent_end` = 524;
`agent_start` = 168; `model_select` = 0). Ba symbol `registerEntryRenderer`, `session_parked`,
`session_resumed` đều = 0.

### Phần gốc của senpi — chép tốn bao nhiêu

`packages/coding-agent/src/core/extensions/builtin/cache-keepalive/`, **4 file, 569 dòng**:

| file | dòng | vai trò |
| --- | --- | --- |
| `index.ts` | 340 | vòng lặp + event subscribe + entry render + hàm giá |
| `session-prewarm.ts` | 110 | **không thuộc work item này** |
| `prewarm-entry.ts` | 33 | **không thuộc work item này** |
| `changes.md` | 86 | tài liệu |

**Chỉ `index.ts` là phần cần port, và nó không chạm core**: toàn bộ phụ thuộc ngoài là import từ
`@earendil-works/pi-ai` (4 symbol vắng), hai helper nội bộ (`convertToLlm`, `filterContextExcludedMessages`),
và ba surface mà omp đã có: `pi.appendEntry`, `pi.events.emit`, `ExtensionContext`.

Phần `ping()` (index.ts:141-233, ~95 dòng) tự túc hoàn toàn: gọi `current.getSystemPrompt()`,
`pi.getActiveTools()` / `pi.getAllTools()`, `current.modelRegistry.getApiKeyAndHeaders(current.model)`,
`pi.appendEntry(...)`. Không có core hook. **Port chép ~150 dòng từ `index.ts`** (bỏ phần session-prewarm
và bỏ hàm `toUsage`/entry type của prewarm), cộng ~10 dòng để nối vào registry extension.

### Bảy seam phải mở

| # | seam | nơi | hành động |
| --- | --- | --- | --- |
| 1 | `resolvePromptCacheTtlSeconds` | `packages/ai/src/` | thêm; đọc TTL từ catalog policy, không hard-code số |
| 2 | `warmPromptCache` | `packages/ai/src/` | thêm; gọi `max_tokens: 0` như `anthropic.ts:2326` |
| 3 | `getPromptCacheKeepAliveSettings` | `ExtensionContext` | thêm 4 field; đọc từ settings (logic trung lập) |
| 4 | `session_parked` / `session_resumed` | bus sự kiện | thêm 2 event; hoặc dùng `agent_end` + idle probe |
| 5 | `registerEntryRenderer` | `pi` API | **không mở** — dùng `pi.appendEntry` trần (56 hit, đã có sẵn) |
| 6 | `isAnthropicApiBaseUrl` | `packages/ai/src/` | thêm; lấy từ `model.compat` hoặc KDL, không so `baseUrl` bằng tên host |
| 7 | `ExtensionContext.getSystemPrompt` | `types.ts:496` | đã có — không mở |

Seam 5 là quyết định thiết kế quan trọng nhất: `registerEntryRenderer` = 0 hit trong omp, và mở nó
đồng nghĩa viết một lớp render entry mới. `pi.appendEntry` đã có 56 chỗ gọi — dùng nó, và để TUI
quyết định có hiển thị không.

## Hiệu ứng người dùng thấy

Session rỗi lâu hơn 5 phút với model Anthropic: cache **không** hết hạn giữa chừng. Hiện tại,
nếu người dùng rỗi 6 phút rồi gõ tiếp, turn tiếp theo trả toàn bộ prefix dưới dạng `input` thay vì
`cacheRead` — tốn tiền và chậm hơn, mà không có tín hiệu nào báo trước. Sau work item này, trong
khoảng rỗi đó có một request `max_tokens: 0` chạy nền để gia hạn, và cache vẫn đọc được khi người
dùng quay lại.

Người dùng **không** thấy: request warm (không token output), entry `cache-keepalive` trong transcript
(trừ khi bật log), hay bất kỳ thay đổi nào khi agent đang bận.

## Effort

**~4 engineer-days.**

| hạng mục | ngày |
| --- | --- |
| Seam 1+2: `resolvePromptCacheTtlSeconds` + `warmPromptCache` trong `packages/ai` | 1 |
| Seam 3+4: settings + 2 event (hoặc idle probe) | 0.5 |
| Port `index.ts` (~150 dòng) + nối registry | 1.5 |
| Test: cache ấm có hạn + không phát call thừa | 1 |

Phần dễ sai nhất tốn nửa ngày: test phải chứng minh **cả** hai hướng — cache được ấm, **và** không
phát thêm API call khi TTL còn dài. Một test chỉ kiểm tra hướng đầu sẽ xanh khi code gọi API mỗi 5 giây.

## File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/ai/src/stream.ts` | sửa | thêm `resolvePromptCacheTtlSeconds(model)` đọc TTL từ catalog policy; không đụng `ANTHROPIC_CACHE_TTL_MS` (5 phút) của refresh theo yêu cầu | Có. `:1209-1212` hằng số, `:1292-1296` `supportsAnthropicCacheRefresh`, `:1431` guard `cacheRetention === "short"` |
| `packages/ai/src/providers/anthropic.ts` | sửa | thêm `warmPromptCache()` — tái sử dụng đoạn `max_tokens: 0` + gỡ `tool_choice` ở `:2326-2334` | Có. `:2326` `refreshParams = { ...params, max_tokens: 0, stream: false }`, `:2332-2334` gỡ `tool_choice` |
| `packages/ai/src/types.ts` | sửa | thêm `WarmPromptCacheOptions`, `WarmPromptCacheResult`, `WarmPromptCacheUsage` | Có. `:124` `CacheRetention`, `:431` `cacheRetention?`, `:439` `anthropicCacheRefresh?` |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | thêm `getPromptCacheKeepAliveSettings?()` vào `ExtensionContext` | Có. `:478` `isIdle()`, `:482` `hasPendingMessages()`, `:496` `getSystemPrompt()` — chèn cạnh |
| `packages/coding-agent/src/extensibility/extensions/registry.ts` | sửa | đăng ký extension builtin mới | **Chưa đo** — cần `git ls-files` trước khi viết |
| `packages/coding-agent/src/core/extensions/builtin/cache-keepalive/index.ts` | tạo | port ~150 dòng từ senpi `index.ts`, bỏ session-prewarm | Có. Nguồn 340 dòng, đã đọc trọn |
| `packages/catalog/src/compat/rules/*.kdl` | sửa | thêm axis TTL nếu cần; chạy `bun run gen:compat` và commit `rules.json` | Có. `classes/anthropic.kdl:266` `supports-long-prompt-cache-retention`, `providers/anthropic.kdl:88` `supports-long-cache-retention` |
| `NOTICE.md` | tạo | attribution senpi (MIT) | Có. omp chưa có file này; senpi MIT thuần |

## Các bước

1. **CỔNG — lấy câu trả lời P0 bằng văn bản TRƯỚC KHI viết code:** chi phí mặc định là bao nhiêu?
   Bốn lựa chọn, mỗi lựa chọn một hệ quả khác nhau:

   | lựa chọn | hệ quả |
   | --- | --- |
   | **A. Luôn bật** | Mọi session Anthropic đều phát request warm. Đơn giản nhất, nhưng phí cho người dùng không hề rỗi — và senpi chọn cái này **không phải vì tốt**, mà vì `maxCostUsdPerSession` mặc định 0 (tắt) |
   | **B. Theo ngưỡng TTL** | Chỉ bật khi `resolvePromptCacheTtlSeconds(model) > 0`. Đây là cách **không cần thiết kế sản phẩm**: TTL đã là policy của provider, không phải của omp |
   | **C. Chỉ khi `cache_control` có mặt** | Chỉ bật khi model có `supports-long-prompt-cache-retention`. Hẹp nhất, nhưng bỏ qua trường hợp cache 5 phút vẫn đáng làm ấm |
   | **D. Tắt mặc định** | Giống senpi. An toàn nhất, nhưng work item này gần như vô dụng với người dùng thật |

   **Khuyến nghị: B.** Lý do: nó là lựa chọn duy nhất không cần một con số tùy ý nào. A và D đều cần
   người duy trì chọn một chính sách; C cần một con số ngưỡng. B chỉ cần đọc policy đã có.
   Ghi câu trả lời nguyên văn vào work item này. Không bắt đầu khi P0 còn mở.

2. **Đo `packages/coding-agent/src/extensibility/extensions/registry.ts`** bằng `git ls-files` và
   `grep -n "builtin"` trước khi sửa. Cần biết tên hàm đăng ký và thứ tự builtin. Nếu registry không
   tồn tại dưới dạng đó, dùng `git ls-files "packages/coding-agent/src/extensibility/extensions/"`
   để liệkê. *(anchor: `packages/coding-agent/src/extensibility/extensions/registry.ts` — chưa đo)*

3. **Seam 1 — thêm `resolvePromptCacheTtlSeconds(model)` vào `packages/ai/src/`.** Hàm trả về
   số giây TTL mà catalog policy cho phép cho model đó, hoặc `0` nếu không có. Đọc từ
   `model.compat.supportsLongCacheRetention` và axis KDL — **không** so sánh tên model, **không**
   hard-code `3600`. Nếu cần axis mới, sửa `packages/catalog/src/compat/rules/*.kdl` rồi chạy
   `bun run gen:compat` và commit `rules.json` cùng. *(anchor: `packages/ai/src/providers/anthropic.ts:544` — nơi `ttl` được quyết định)*

4. **Seam 2 — thêm `warmPromptCache()` vào `packages/ai/src/`.** Tái sử dụng đoạn đã có ở
   `anthropic.ts:2326-2334`: clone payload, `max_tokens: 0`, `stream: false`, gỡ `tool_choice`.
   Trả về `{ supported: boolean, usage: WarmPromptCacheUsage }`. `supported` phải `false` khi
   `supportsAnthropicCacheRefresh(model)` là `false` — để caller không phát request vô nghĩa.
   *(anchor: `packages/ai/src/providers/anthropic.ts:2326`)*

5. **Seam 3 — thêm `getPromptCacheKeepAliveSettings?()` vào `ExtensionContext`** tại
   `types.ts:496` (cạnh `getSystemPrompt`). Bốn field: `enabled`, `marginSeconds`,
   `maxRequestsPerSession`, `maxCostUsdPerSession`. Implementation đọc từ settings — **không** đọc
   theo tên provider. *(anchor: `packages/coding-agent/src/extensibility/extensions/types.ts:496`)*

6. **Seam 4 — chọn một trong hai đường cho `session_parked` / `session_resumed`:** (a) thêm 2 event
   vào bus, hoặc (b) không thêm — dùng `agent_end` + `isIdle()` probe. Đường (b) rẻ hơn và không mở
   seam mới, nhưng không dừng timer khi session parked. Nếu P0 chọn B, đường (b) đủ. *(anchor:
   `packages/coding-agent/src/extensibility/extensions/types.ts:1581` — `events: EventBus`)*

7. **Tạo `packages/coding-agent/src/core/extensions/builtin/cache-keepalive/index.ts`** bằng cách
   chép ~150 dòng từ senpi `index.ts`, bỏ `createSessionPrewarm`, `prewarm-entry.ts`, `toUsage`,
   và entry type `PromptCachePrewarmEntryData`. Giữ nguyên: `arm()`, `ping()`, `stop()`, ba hàm giá
   (`projectedPingCost`, `actualPingCost`, `finiteTokens`), và `generation` fence. Thay
   `isAnthropicApiBaseUrl(model.baseUrl)` bằng `supportsAnthropicCacheRefresh(model)` của omp.
   *(anchor: senpi `index.ts:104-233` — `arm()` + `ping()`)*

8. **Nối vào registry extension.** Đăng ký builtin mới. Không mở `registerEntryRenderer` — dùng
   `pi.appendEntry` trần như senpi. *(anchor: `packages/coding-agent/src/extensibility/extensions/registry.ts` — chưa đo)*

9. **Tạo `NOTICE.md`** ở root omp với attribution senpi (MIT), ghim theo commit SHA
   `ea9216269e9254b821446130b60d1e00759761dc`. Không lấy "bản mới nhất". *(anchor: root repo)*

10. **Tạo test `packages/ai/test/warm-prompt-cache.test.ts`.** Phải chứng minh **hai** hướng:
    (i) khi TTL còn dài, `warmPromptCache` **không** phát request nào; (ii) khi TTL gần hết, nó phát
    đúng một request `max_tokens: 0` và trả `supported: true`. Dùng `vi.spyOn` trên namespace module
    đã import + `vi.restoreAllMocks()` trong `afterEach`. Không dùng `mock.module()`. Không source-grep.
    *(anchor: `packages/ai/test/anthropic-cache-refresh.test.ts` — khuôn sẵn có)*

11. **Tạo test `packages/coding-agent/test/cache-keepalive.test.ts`.** Phải chứng minh: timer không
    phát request khi `isIdle()` trả `false`; timer không phát request khi `hasPendingMessages()` trả
    `true`; timer dừng sau `maxRequestsPerSession`; và `generation` fence chặn một ping cũ sau khi
    `stop()` được gọi. *(anchor: `packages/coding-agent/test/` — thư mục tồn tại)*

## Hợp đồng test

| hợp đồng | cách kiểm |
| --- | --- |
| Cache được ấm | `warmPromptCache` phát đúng 1 request `max_tokens: 0` khi TTL gần hết |
| Có hạn | `resolvePromptCacheTtlSeconds` trả `0` cho model không có policy → không phát request |
| Không phát thừa | Khi TTL còn dài, số request = 0 (không phải "ít hơn") |
| Không cạnh tranh với refresh theo yêu cầu | `anthropicCacheRefresh` vẫn bật và vẫn phát đúng 3 lần trong một turn |
| Không chạy khi bận | `isIdle() === false` → 0 request |
| Không chạy khi có pending | `hasPendingMessages() === true` → 0 request |
| Dừng đúng | Sau `maxRequestsPerSession` ping, timer không arm lại |
| Fence đúng | Ping cũ sau `stop()` không ghi entry |

## Cổng hoàn thành

Cổng **đỏ được** khi hạ tắt. Mỗi dòng phải phân biệt được "đã làm" với "không chạy được":

| cổng | thành công khi | thất bại khi |
| --- | --- | --- |
| P0 trả lời bằng văn bản | Câu trả lời nguyên văn nằm trong work item này | Còn dạng "một trong bốn" |
| `resolvePromptCacheTtlSeconds` | Trả `> 0` cho model có policy, `0` cho model không có | Trả `0` cho mọi model |
| `warmPromptCache` | Trả `supported: true` + usage đúng khi TTL gần hết | Trả `supported: false` khi phải `true` |
| Không phát thừa | 0 request khi TTL còn dài | ≥ 1 request |
| Không cạnh tranh | `anthropicCacheRefresh` vẫn phát 3 lần trong một turn | Ít hơn 3 lần |
| Không chạy khi bận | 0 request khi `isIdle() === false` | ≥ 1 request |
| Registry | Extension builtin mới xuất hiện trong danh sách | Không có |
| NOTICE.md | File tồn tại, ghim SHA `ea921626...` | Thiếu hoặc ghim "bản mới nhất" |
| `bun check` | Sạch | Lỗi type |
| `bun test` | Cả 2 file test xanh | Đỏ |

## Rủi ro

| rủi ro | hệ quả | giảm |
| --- | --- | --- |
| **P0 chọn A (luôn bật)** | Phí request warm cho người dùng không hề rỗi | Ghi rõ chi phí ước tính trong câu trả lời P0 |
| **Port dùng `JSON.parse` trực tiếp** | Biến lỗi JSONL thành crash | Mọi thứ đọc session phải qua `parseJsonlLenient` (`packages/utils/src/stream.ts:575`) — đây là cổng chặn dễ sai nhất |
| **Nhầm lẫn hai loại refresh** | Viết lại `anthropicCacheRefresh` thay vì thêm vòng mới | Giữ nguyên `ANTHROPIC_CACHE_TTL_MS` và `ANTHROPIC_CACHE_REFRESH_LIMIT`; chỉ thêm bên ngoài |
| **Hard-code TTL `3600`** | Vi phạm AGENTS.md (không hard-code policy theo provider) | Đọc từ `model.compat` + KDL; nếu cần axis mới thì sửa `.kdl` và chạy `bun run gen:compat` |
| **Mở `registerEntryRenderer`** | Viết một lớp render entry mới không cần thiết | Dùng `pi.appendEntry` trần (56 hit) |
| **Chép cả session-prewarm** | Work item phình gấp đôi, chạm OpenAI Responses | Bỏ `session-prewarm.ts` và `prewarm-entry.ts` — tách riêng |
| **Test chỉ kiểm một hướng** | Xanh khi code gọi API mỗi 5 giây | Bắt buộc cả hai hướng trong cùng file test |
| **Ghim sai SHA** | Attribution sai | Ghim `ea9216269e9254b821446130b60d1e00759761dc`, không lấy "bản mới nhất" |
