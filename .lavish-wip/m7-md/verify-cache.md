# Bác bỏ `w-cache.md` — work item "warm prompt cache"

**Kết luận một dòng: ĐỨNG VỮNG VỀ ĐỘ CHÍNH XÁC CỦA ANO, SAI VỀ CỔNG VÀ VỀ ƯỚC LƯỢNG.**

Các neo `path:line` mà tài liệu dùng để dẫn đường triển khai gần như **hoàn hảo** — tôi không tìm được
một neo sai nào trong 40 neo có số dòng. Đó là phần tốt. Nhưng tài liệu **không phải** là một kế
hoạch dùng được được: nó đẩy hai việc lớn ra khỏi phạm vi (registry, P0) mà không tính tiền, đặt
"cổng chặn dễ sai nhất" vào một rủi ro **không thể xảy ra**, và đánh dấu 4/9 con số là không
tái lập được.

Quy ước: **ĐỨNG VỮNG** = tái lập được bằng ≥2 cách · **SAI** = có bằng chứng trái chiều ·
**CHƯA ĐỦ DỮ LIỆU** = không bác bỏ được, cũng không xác nhận được.

---

## 1. Bảng kiểm chứng

### 1.1. Neo có số dòng (phần mạnh nhất của tài liệu)

| khẳng định | lệnh kiểm | kết quả | đứng vững / sai / chưa đủ dữ liệu |
| --- | --- | --- | --- |
| `types.ts:124` = `CacheRetention` | `sed -n 124p` | `export type CacheRetention = "none" \| "short" \| "long";` | **đứng vững** |
| `types.ts:431` = `cacheRetention?` | `sed -n 431p` | `cacheRetention?: CacheRetention;` | **đứng vững** |
| `types.ts:439` = `anthropicCacheRefresh?` | `sed -n 439p` | `anthropicCacheRefresh?: boolean;` | **đứng vững** |
| `anthropic.ts:544` quyết định `ttl` | `sed -n 544p` | `const ttl = retention === "long" && model.compat.supportsLongCacheRetention ? "1h" : undefined;` | **đứng vững** |
| `anthropic.ts:539` `defaultRetention` | `sed -n 539p` | `isOAuthToken && … ? "long" : "short"` | **đứng vững** (tài liệu ghi "(trừ OAuth)" — chính xác) |
| `anthropic.ts:2075` `zeroOutputCacheRefresh` | `sed -n 2075p` | `options?.anthropicCacheRefreshRequest === true` | **đứng vững** |
| `anthropic.ts:2326` payload `max_tokens: 0` | `sed -n 2326p` | `{ ...params, max_tokens: 0, stream: false }` | **đứng vững** |
| `anthropic.ts:2332-2334` gỡ `tool_choice` | `sed -n 2332,2334p` | `delete refreshParams.tool_choice;` | **đứng vững** |
| `stream.ts:1209-1212` hằng số refresh | `sed -n 1209,1212p` | đủ 4 hằng: TTL `5*60_000`, LEAD `15_000`, LIMIT `3`, STATE_KEY | **đứng vững** |
| `stream.ts:1292-1296` `supportsAnthropicCacheRefresh` | `sed -n 1292,1296p` | `model.api === "anthropic-messages" && …` | **đứng vững** |
| `stream.ts:1369` bật refresh | `sed -n 1369,1370p` | `anthropicCacheRefreshRequest: !thinkingEnabled,` + `cacheRetention: "short"` | **đứng vững** |
| `stream.ts:1431` guard `"short"` | `sed -n 1431p` | `resolveCacheRetention(options.cacheRetention) !== "short"` | **đứng vững** (xem ghi chú §2.1) |
| `sdk.ts:4111` `anthropicCacheRefresh: true` | `sed -n 4111p` | `anthropicCacheRefresh: true,` | **đứng vững** |
| `classes/anthropic.kdl` 7 dòng 266/286/292/317/328/341/349 | `grep -n` | đúng 7 dòng, đúng thứ tự, đều là `supports-long-prompt-cache-retention` | **đứng vững** |
| `providers/anthropic.kdl:88` | `grep -n` | `supports-long-cache-retention #true` | **đứng vững** |
| `ext types.ts:478` `isIdle()` | `sed -n 478p` | `isIdle(): boolean;` | **đứng vững** |
| `ext types.ts:482` `hasPendingMessages()` | `sed -n 482p` | `hasPendingMessages(): boolean;` | **đứng vững** |
| `ext types.ts:496` `getSystemPrompt()` | `sed -n 496p` | `getSystemPrompt(): string[];` | **đứng vững** |
| `ext types.ts:1581` `events: EventBus` | `sed -n 1581p` | `events: EventBus;` | **đứng vững** |
| `utils/stream.ts:575` `parseJsonlLenient` | `grep -n` | dòng 575 = `export function parseJsonlLenient<T>(...)` | **đứng vững** |

**20/20 neo có số dòng khớp tuyệt đối.** Đây không phải chuyện may. Người viết đã mở file thật.

### 1.2. Các khẳng định "0 hit"

Đo bằng 2 cách: `git grep -I -w -- '*.ts'` (chỉ file đã track) và `rg -g '*.ts'` (kể cả untracked).

| khẳng định | lệnh kiểm | kết quả | đứng vững / sai / chưa đủ dữ liệu |
| --- | --- | --- | --- |
| 10 symbol warm-cache vắng mặt (`warmPromptCache`, `resolvePromptCacheTtlSeconds`, `WarmPromptCacheOptions/Result/Usage`, `promptCacheTtl`, `getPromptCachePrefixRequest`, `getPromptCacheKeepAliveSettings`, `isOpenAIResponsesPromptCacheModel`, `isAnthropicApiBaseUrl`) | `git grep -c -w` + `rg -c -w` | cả hai cách đều **0** | **đứng vững** |
| `registerEntryRenderer` = 0 | `git grep -c -w` | 0 (cả `EntryRenderer` cũng = 0 trong `coding-agent/src`) | **đứng vững** |
| `session_parked` / `session_resumed` = 0 | `git grep -c -w` | 0 | **đứng vững** |
| `model_select` = 0 | `git grep -c -w` | 0 (senpi: 28 chỗ / 20 thư mục) | **đứng vững** |
| `cacheRetention` = 0 trong `packages/catalog/src` | `git grep -c -w` | 0 (kể cả `models.json`) | **đứng vững** |
| omp chưa có `NOTICE.md` | `ls NOTICE.md` | `No such file or directory` | **đứng vững** |
| senpi là MIT thuần | `head -3 LICENSE` | `MIT License` | **đứng vững** |
| senpi HEAD = SHA ghim | `git rev-parse HEAD` | `ea9216269e9254b821446130b60d1e00759761dc` | **đứng vững** |
| `packages/ai/test/anthropic-cache-refresh.test.ts` tồn tại | `test -e` | EXISTS | **đứng vững** |
| `packages/coding-agent/test/` tồn tại | `test -e` | EXISTS | **đứng vững** |

**Lưu ý phương pháp:** nếu tính cả `.md` thì `warmPromptCache` = 7, `model_select` = 60. Tài liệu
không nói phương pháp, nhưng ngữ cảnh ("omp đã có X chưa") buộc phải hiểu là mã nguồn. Không tính là
sai — nhưng một tài liệu kế hoạch nên ghi phạm vi grep.

### 1.3. Con số đo được — đây là chỗ SAI

Đo 3 cách: (1) số dòng khớp qua `git grep -c`, (2) số file, (3) số lần xuất hiện `-o`.
Thêm (4) `rg` có untracked, (5) `grep -rIn` toàn cây bỏ `node_modules`, (6) `pi.<symbol>`.

| khẳng định | lệnh kiểm | kết quả | đứng vững / sai / chưa đủ dữ liệu |
| --- | --- | --- | --- |
| `appendEntry` = 56 | `git grep -c -w '*.ts'` | 56 dòng / 24 file / 57 lần | **đứng vững** |
| `isIdle` = 50 | như trên | 50 dòng / 23 file / 51 lần | **đứng vững** |
| `hasPendingMessages` = 38 | như trên | 38 dòng / 17 file / 38 lần | **đứng vững** |
| `getApiKeyAndHeaders` = 4 | như trên | 4 dòng / 2 file | **đứng vững** |
| `getSystemPrompt` = **32** | 6 phương pháp | 31 dòng / 12 file / 31 lần. Không phương pháp nào ra 32 | **sai** (lệch 1) |
| `agent_start` = **168** | 6 phương pháp | 158 dòng / 176 lần / 67 file. Không ra 168 | **sai** (lệch 10) |
| `agent_end` = **524** | 6 phương pháp | 487 dòng / 494 lần / 113 file. Không ra 524 | **sai** (lệch 37) |
| `getSessionId` = **501** | 6 phương pháp | 487 dòng / 582 lần / 173 file. Không ra 501 | **sai** (lệch 14) |
| senpi `cache-keepalive/` = 4 file / 569 dòng | `wc -l` từng file | 340 + 110 + 33 + 86 = **569**, 4 file | **đứng vững** |
| `index.ts` `ping()` = `:141-233`, **~95 dòng** | `grep -n "function ping"` | def `ping` ở **:145**, `arm` ở **:107**, `stop` ở **:91**; `:141` là *chỗ gọi* `void ping(...)`, `:233` là `else arm();` **bên trong** ping | **sai** |
| `arm()+ping()` = `:104-233` | `grep -n` | `:104` là dấu `}`; span thật của `stop`+`arm`+`ping` là **:91→~250 (~160 dòng)** | **sai** |

---

## 2. Bác bỏ: những chỗ sai

### 2.1. [SAI] "Cổng chặn dễ sai nhất" không tồn tại trong work item này

Dòng 245 xếp `JSON.parse` thẳng vào bảng rủi ro, gắn nhãn **"đây là cổng chặn dễ sai nhất"** —
cùng hạng với việc ghim sai SHA. Kiểm:

```
grep -n "JSON.parse\|readJsonl\|parseJsonl\|readFile" \
  senpi-ref/.../cache-keepalive/index.ts
→ (rỗng)
```

`index.ts` **không đọc file nào cả**. Nó giữ message trong RAM từ `current.getSystemPrompt()` và
mảng `lastMessages` sẵn có. `parseJsonlLenient` không liên quan: không có session file nào bị
mở. Rủi ro này được dán từ bối cảnh M7 tổng, không từ work item này.

Hậu quả cụ thể: cổng được dùng để "chặn dễ sai nhất" **không bảo vệ gì**, đồng thời nó **thay** ba
rủi ro có thật mà tài liệu bỏ trống (§2.4, §2.5, §2.6). Một bảng rủi ro mà hàng đầu bảng sai thì
phần còn lại của bảng cũng đáng ngờ.

### 2.2. [SAI] Danh sách phụ thuộc port thiếu 3 import

Dòng 80-82 khẳng định: *"toàn bộ phụ thuộc ngoài là import từ `@earendil-works/pi-ai` (4 symbol
vắng), hai helper nội bộ, và ba surface omp đã có"*. Import thật của `index.ts` là **7 câu lệnh**:

| import | tài liệu đề cập? | ảnh hưởng |
| --- | --- | --- |
| `@earendil-works/pi-ai` (`:2-11`) | có — nhưng là **7 symbol**, không phải 4 | tài liệu đếm 4, thật là 7: `isAnthropicApiBaseUrl`, `resolvePromptCacheTtlSeconds`, `warmPromptCache`, `WarmPromptCacheOptions`, `WarmPromptCacheResult` + 3 type (`Context`, `Model`, `Tool`). 4 cái đầu là *value*, 3 cái sau là *type* — có lẽ tác giả chỉ đếm value. Không sai chết người, nhưng sai số. |
| `../../../messages.ts` → `convertToLlm`, `filterContextExcludedMessages` | có | `convertToLlm` = 507 hit trong omp ✅. **`filterContextExcludedMessages` = 0** — phải viết mới, tài liệu không nói. |
| `../../notice/index.ts` → **`noticeEntryRenderer`** | **KHÔNG** | Đây chính là chỗ dính `registerEntryRenderer`. Tài liệu quyết định "không mở seam, dùng `pi.appendEntry` trần" — nhưng port vẫn phải xử lý import này. |
| `../../types.ts` → `EntryRenderer`, `ExtensionAPI`, `ExtensionContext`, `ExtensionFactory` | một phần (chỉ `ExtensionContext`) | 4 symbol, chỉ 1 được nêu. |
| `../goal/cache-warm.ts` → **`formatWarmTokenCount`** | **KHÔNG** | `formatWarmTokenCount` = 0 hit trong omp → phải viết mới hoặc thay thế. |
| `./session-prewarm.ts` → `createSessionPrewarm` | có (bỏ đi) | ✅ |
| `@earendil-works/pi-agent-core` → `type AgentMessage` | **KHÔNG** | chỉ type, rẻ. |

Bốn quyết định phải làm thêm (2 viết mới, 2 cắt) **không nằm trong bảng "File cần chạm tới"**.

### 2.3. [SAI] Bỏ sót 2 surface mà chính `index.ts` cần

`grep` trên `ExtensionContext` của omp cho thấy 4 symbol mà tài liệu **không liệt kê**, và 2 cái
được `index.ts` gọi trực tiếp:

| symbol | omp | dùng ở |
| --- | --- | --- |
| `getPromptCacheSafeWaitSeconds` | **0 hit** | `index.ts:121` — `current.getPromptCacheSafeWaitSeconds?.()` **trong `arm()`** |
| `prepareProviderRequest` | **0 hit** | `index.ts:168` — `await current.prepareProviderRequest?.(lastMessages)` **trong `ping()`** |

Đây là **seam thứ 5 và thứ 6 thật**, không nằm trong bảng "Bảy seam phải mở". Nghiêm trọng hơn:
`getPromptCacheSafeWaitSeconds` là thứ tính `intervalMs` ở dòng 136 — mất nó thì timer không biết
chờ bao lâu, tức là **timing của cả work item** chưa được giải quyết. Tài liệu nói port "~150 dòng"
là "gần như tự túc"; thực tế phần định thời gian đó không tự túc.

### 2.4. [SAI] `registry.ts` không tồn tại — và tài liệu đặt 2 neo vào nó

```
git ls-files packages/coding-agent/src/extensibility/extensions/
→ compact-handler.ts, directory-resolution.ts, get-commands-handler.ts, index.ts,
  load-errors.ts, loader.ts, managed-timers.ts, model-api.ts, runner.ts,
  types.ts, wrapper.ts          (11 file — KHÔNG có registry.ts)
ls -d packages/coding-agent/src/core  →  No such file or directory
```

Tài liệu **nói thẳng** chỗ này chưa đo (dòng 138, 162, 194) — tính trung thực, phải công nhận. Nhưng
hậu quả chưa được kéo theo: cả bước 2 lẫn bước 8 của kế hoạch đều neo vào một file không tồn tại, và
thư mục đích `packages/coding-agent/src/core/extensions/builtin/` — nơi tài liệu dự tính tạo file
— **không có trong omp** (`git ls-files '.../extensibility/extensions/builtin*'` → 0 file).

Nghĩa là: không có cách "đăng ký builtin" sẵn có để nối vào. Việc này là **thiết kế mới**, không phải
"thêm 1 dòng vào registry". Tài liệu dự phí 0 ngày cho nó. Đây là lý do tôi **không bác bỏ được**
con số effort nhưng **không chấp nhận** nó (§3).

### 2.5. [SAI] P0 là câu hỏi 3 lựa chọn, không phải 4 — B và C là cùng một mã

Dòng 146-153: *"Bốn lựa chọn, mỗi lựa chọn một hệ quả khác nhau"*. Nhưng:

- B được định nghĩa: *"Chỉ bật khi `resolvePromptCacheTtlSeconds(model) > 0`"*.
- C được định nghĩa: *"Chỉ bật khi model có `supports-long-prompt-cache-retention`"*.
- Bước 3 (dòng 166-167) định nghĩa hàm: *"Đọc từ `model.compat.supportsLongCacheRetention` và
  axis KDL"*.

Nếu hàm trả `>0` **đúng khi** `supportsLongCacheRetention` thì **B ≡ C**: cùng một điều kiện, cùng
một dòng code. Tài liệu còn cố tình bịa một lỗi cho C để B trông hấp dẫn hơn — nó nói C *"cần một
con số ngưỡng"*, nhưng C là **boolean trên model**, không cần con số nào.

Thêm nữa, chính tài liệu đã tự bác bỏ B bằng đo của nó (dòng 52-53): vì `sdk.ts` không bao giờ gửi
`cacheRetention`, `ttl` **luôn** là `undefined` ⇒ TTL **luôn 5 phút**. Nếu B được hiểu là "TTL `1h` có
mặt" thì B **luôn trả 0** và work item chết ngay. B chỉ sống được nếu đọc
`supportsLongCacheRetention` — tức là lại thành C.

**Đề nghị:** gộp B+C thành một lựa chọn, đổi tên thành *"bật khi model có policy long-cache"*, và
câu hỏi còn lại chỉ là A (bật hết, có phí) vs D (tắt mặc định). Cổng P0 vẫn nên giữ — nhưng nó
hỏi sai câu.

### 2.6. [SAI] Bước 7 chỉ đường tới một hàm không export

> *"Thay `isAnthropicApiBaseUrl(model.baseUrl)` bằng `supportsAnthropicCacheRefresh(model)` của omp."*

```
grep -n "supportsAnthropicCacheRefresh" packages/ai/src/stream.ts packages/ai/src/index.ts
→ stream.ts:1292:function supportsAnthropicCacheRefresh<TApi extends Api>(...)   ← KHÔNG export
→ stream.ts:1431:  (chỉ dùng nội bộ)
```

Hàm **không export**, và toàn bộ `packages/ai/src` chỉ có 2 tham chiếu — cả hai trong cùng file.
Bước 7 không thể làm theo như viết. Bảng "File cần chạm tới" cũng không liệt kê `stream.ts` là nơi
export nó ra (mặc dù có liệt kê `stream.ts` cho việc khác — dễ bị đọc là đã lo).

Có sẵn một cách sạch hơn mà tài liệu không nói: `resolveCacheRetention` **đã export** từ
`packages/ai/src/utils.ts:538`.

### 2.7. [SAI NHỎ] Mô tả guard `stream.ts:1431`

Bảng ghi `:1431` là guard `cacheRetention === "short"`. Thật là:
`resolveCacheRetention(options.cacheRetention) !== "short"` — có hàm bọc, không phải so sánh thẳng
(điều này cũng giải thích vì sao `defaultRetention` ở `anthropic.ts:539` **không** truyền vào đây —
nghĩa là nhánh guard lấy mặc định riêng, không dùng default của provider). Số dòng đúng; mô tả
rút gọn quá mức, nhưng không đảo ý nghĩa.

---

## 3. Cổng: có phân biệt được "đã làm" với "không chạy được" không?

| cổng | đánh giá |
| --- | --- |
| `resolvePromptCacheTtlSeconds` trả `>0` khi có policy, `0` khi không | ✅ **tốt**. Hai nhánh khác nhau, lỗi rõ ràng. |
| `warmPromptCache` trả `supported:true` + usage | ⚠️ trung bình — `supported:false` khi phải `true` là lỗi, nhưng `supported:true` + usage sai thì test có thể xanh. |
| Không phát thừa: 0 request khi TTL còn dài | ✅ **tốt nhất trong bảng** — ngưỡng tường minh, không có vùng mơ hồ. |
| **"Không cạnh tranh": `anthropicCacheRefresh` vẫn phát đúng 3 lần** | ❌ **cổng chết**. `ANTHROPIC_CACHE_REFRESH_LIMIT = 3` là hằng số, và `stream.ts:1431` **return sớm** (`return streamSimpleRequest(...)`) khi điều kiện không khớp — tức khi warm cache **không** phát, refresh cũng **không** chạy. Cổng xanh khi warm chưa được viết. Đổi thành: warm **không** làm `ANTHROPIC_CACHE_TTL_MS`/LIMIT đổi giá trị, và 1 turn vẫn refresh tối đa 3 lần *khi warm không chạy*. |
| Registry: "extension builtin mới xuất hiện trong danh sách" | ❌ **cổng chết** — không có "danh sách" nào (không có `registry.ts`, không có thư mục `builtin/`). Xanh ngay khi chưa làm gì. |
| `NOTICE.md`: tồn tại + ghim SHA | ⚠️ yếu — kiểm `contains("ea921626")` trên text là kiểm hình thức, không kiểm attribution đúng. Nhưng chấp nhận được, vì file bắt buộc phải tồn tại. |
| `bun check` sạch | ✅ yếu nhưng thật (bắt lỗi type). |
| `bun test` 2 file xanh | ✅ thật. |
| **P0: "câu trả lời nguyên văn nằm trong work item"** | ❌ **cổng chết theo định nghĩa của chính tài liệu.** "Còn dạng 'một trong bốn'" là **không kiểm được bằng lệnh** — đó là một văn bản, không phải trạng thái. Đây đúng là loại cổng mà bài toán cảnh báo. |

**Tóm: 10 cổng, 3 cổng chết** (không cạnh tranh, Registry, P0) và 1 cổng vô nghĩa về mặt kỹ thuật
(REFRESH vốn đã là `return` sớm). Ba cổng chết nằm đúng ở ba chỗ tài liệu tự nhận là "chưa đo" —
tức là phần chưa đo lại chính là phần không có cổng thật.

---

## 4. Ước lượng effort

Bảng tự cộng đúng (1 + 0.5 + 1.5 + 1 = 4 ngày). Nhưng nó **không tính** những việc tôi đã chứng minh
là tồn tại:

| bị bỏ sót | bằng chứng | ước lượng |
| --- | --- | --- |
| Thiết kế cách đăng ký builtin (không có sẵn) | `registry.ts` không tồn tại; `src/core/` không tồn tại; 0 file `builtin*` | chưa đủ dữ liệu để đo — nhưng chắc chắn ≠ 0 ngày |
| 2 surface mới: `getPromptCacheSafeWaitSeconds`, `prepareProviderRequest` | §2.3, cả hai = 0 hit | +0.5 |
| 2 viết mới: `filterContextExcludedMessages`, `formatWarmTokenCount` | §2.2, cả hai = 0 hit | +0.5 |
| `supportsAnthropicCacheRefresh` phải export | §2.6 | +0.1 |
| `NOTICE.md` + `bun run gen:compat` (nếu thêm axis) | bảng effort không có dòng này | +0.3 |

**Ước lượng thực tế: ~5.5-6 ngày**, không phải 4. Tệ hơn: dòng "Port `index.ts` (~150 dòng) + nối
registry | 1.5" gộp **hai việc khác hẳn nhau** — chép 160 dòng cơ học, và thiết kế cách cắm vào omp.
Cần tách.

---

## 5. AGENTS.md — work item này có tạo ra code vi phạm không?

| quy tắc | trạng thái |
| --- | --- |
| Không hard-code model id trong TS | ✅ **tốt** — bước 3 ghi rõ *"không so sánh tên model, không hard-code `3600`"*, và bảng rủi ro có hàng riêng cho việc này. |
| Policy model/provider sống trong KDL | ✅ tốt — chỉ định đúng `.kdl` + `bun run gen:compat` + commit `rules.json`. |
| Không dùng `mock.module()` | ✅ tốt — bước 10 cấm rõ ràng. |
| Không dùng `tsc` | ✅ tốt — cổng dùng `bun check`. |
| Không `ReturnType<>` / không inline import | ✅ không thấy. |
| **Không `any`** | ❌ **vi phạm sắp xảy ra, tài liệu không cảnh báo.** Nguồn port có `index.ts:316` `function projectedPingCost(model: Model<any>, ...)` và `:323` `actualPingCost(model: Model<any>, ...)`. Chép nguyên văn = vi phạm AGENTS.md. Cần sửa thành `Model<Api>` khi port. |
| **Test phải chứng minh cả hai hướng** | ✅ tốt — đây là phần tốt nhất của tài liệu, và tôi giữ nguyên đánh giá. |

Ngoài `any`, tài liệu **tuân thủ AGENTS.md tốt hơn mức trung bình** — nó chủ động tránh cả hai bẫy
"model policy trong TS" và "test một chiều".

---

## 6. Điều tôi KHÔNG bác bỏ được

Ghi rõ để không bị hiểu là đã bác bỏ hết:

- **Toàn bộ phần "Đã đo" ở §"Đánh dấu cache: ĐÃ CÓ"** — 20/20 neo khớp tuyệt đối, tôi đã mở file
  đọc thật chứ không tin grep. Giữ nguyên.
- **10 symbol "0 hit"** — tái lập được bằng 2 phương pháp độc lập. Giữ nguyên.
- **Quyết định ở seam 5 (không mở `registerEntryRenderer`)** — đúng. `registerEntryRenderer` = 0,
  `EntryRenderer` = 0, `pi.appendEntry` = 56 chỗ. Đây là phán đoán tốt nhất của tài liệu.
- **`senpi` HEAD `ea921626…` = SHA ghim** — khớp tuyệt đối. Rủi ro "ghim sai SHA" là hợp lý.
- **Chi phí port ~150 dòng** — bảo thủ, nhưng `arm+ping+stop` thật là ~160 dòng nên con số gần đúng.
  Sai là *cách chia*, không phải *độ lớn*.
- **Bốn symbol warm-cache vắng mặt** — xác nhận. Đây là tiền đề đúng của cả work item.

---

## 7. Đề nghị sửa (theo thứ tự ưu tiên)

1. **Xoá hàng rủi ro `JSON.parse`** khỏi bảng — hoặc chuyển sang work item nào thật sự đọc session.
   Đổi "cổng chặn dễ sai nhất" sang `getPromptCacheSafeWaitSeconds` (thiếu = timer không có nhịp).
2. **Bổ sung 2 seam** `getPromptCacheSafeWaitSeconds` + `prepareProviderRequest` vào bảng seam và
   bảng file; bổ sung 2 helper phải viết mới vào bảng file.
3. **Gộp lựa chọn B và C** của P0 thành một; viết lại cổng P0 thành tiêu chí kiểm được
   (ví dụ: `bun run gen:compat` sinh `rules.json` không đổi, hoặc một test chứng minh hàm đọc được
   policy từ catalog).
4. **Sửa cổng "không cạnh tranh"** — hiện tại xanh khi chưa làm gì.
5. **Ghi rõ trong bước 7** rằng `supportsAnthropicCacheRefresh` phải export trước, hoặc dùng
   `resolveCacheRetention` (`packages/ai/src/utils.ts:538`).
6. **Sửa neo senpi** `ping()` → `:145`, `arm()` → `:107`, `stop()` → `:91`; span thật `:91→~250`.
7. **Sửa 4 con số** `getSystemPrompt` 32→31, `agent_start` 168→158 (hoặc 176 lần xuất hiện),
   `agent_end` 524→487, `getSessionId` 501→487 — và **ghi phương pháp đếm** vào tài liệu.
8. **Tách dòng effort** "port 150 dòng" và "nối registry" thành hai dòng.
9. **Cảnh báo `Model<any>`** ở `index.ts:316,323` cho người port.

---

## 8. Chấm điểm

| tiêu chí | điểm |
| --- | --- |
| Độ chính xác neo `path:line` | **9/10** — 20/20 khớp tuyệt đối |
| Bốn symbol "không tồn tại" | **10/10** — tái lập 2 cách |
| Đường dẫn tới nguồn senpi | **8/10** — số file/dòng chuẩn, nhưng neo hàm sai |
| Bảng rủi ro | **3/10** — hàng đầu sai, bỏ sót 4 rủi ro thật |
| Cổng hoàn thành | **5/10** — 3 cổng chết |
| Ước lượng effort | **5/10** — thiếu ~1.5-2 ngày, gộp 2 việc |
| Tuân thủ AGENTS.md | **7/10** — tốt, trừ `Model<any>` |
| **Tổng** | **6,8/10** |

**Kết luận cuối:** dùng được làm **tài liệu đo đạc** — phần đo của nó đáng tin, tôi chưa bác bỏ
được một neo có số dòng nào. Nhưng **không dùng được làm kế hoạch triển khai** cho tới khi sửa 6
mục ở §7. Ba cổng chết và hai bản neo cắm vào `registry.ts` (một file không tồn tại, dùng cho 2
trong 11 bước) là lý do.

*Bảng kiểm: 20 neo dòng + 10 symbol-0 + 9 con số + 10 dòng senpi + 8 phát hiện cấu trúc = 57 kiểm tra,
11 shell command.*
