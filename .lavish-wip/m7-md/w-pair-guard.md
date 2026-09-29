# `tool-pair-guard` — sanitize payload provider, cân bằng tool_use/tool_result

> **Ghi chú bắt buộc về chi phí — đọc trước khi ước lượng Effort.**
> Tài liệu `SENPI_FINDINGS.md` §5.3 (dòng 735-745) kết luận `tool-pair-guard` "vá ở tầng
> `packages/ai` mà omp không có" nên phải viết lại. **Lý do đó đã bị bác bỏ** (Phần 9 §7, dòng
> 5415-5440): `grep -rn 'packages/ai\|tool-pair-repair\|@earendil-works/pi-ai' $B/tool-pair-guard/`
> trả **rỗng**. Không có dòng nào tham chiếu tầng dưới.
>
> **NHƯNG kết luận "viết mới" vẫn đúng — vì một lý do KHÁC, không phải lý do của §5.3.** Lý do thật
> nằm ở chỗ scope bị đảo: senpi vá ở **tầng payload** (`before_provider_request`) và phải tự viết
> bộ sanitiize cho **3 wire format**. omp **đã có sẵn cơ chế tương đương ở tầng thấp hơn**
> (`repairOrphanOutputs`, xem bảng "Đo" bên dưới), chỉ là chưa bật ở mọi provider. Chi phí vì
> vậy là **VIẾT MỚI phần điều phối + chính sách**, phần cơ chế thì **có thể tái dùng**.
> Mức này không thuộc "chép 3 file 269 dòng" (không thể — wire format lệch) cũng không thuộc
> "viết lại 435 dòng từ đầu" (đã có sẵn hạ tầng). Số ngày ở phần Effort đã tính theo giữa hai cực
> đó, và nêu rõ điều kiện để rút xuống.

## Đo trước khi kết luận (2026-09-28)

| câu hỏi | lệnh | kết quả |
| --- | --- | --- |
| senpi vá ở tầng nào? | `git -C senpi-ref grep -lw before_provider_request` | `builtin/tool-pair-guard/index.ts:8` → **`before_provider_request`**, tức **ngay trước khi gửi provider**, không phải lúc đọc session. |
| `packages/ai` có bị vá? | `grep -rn 'packages/ai\|tool-pair-repair' $B/tool-pair-guard/` | **rỗng**. Xác nhận bác bỏ Phần 9 §7. |
| omp có `before_provider_request`? | `git grep -w before_provider_request -- packages` | **CÓ** — `extensibility/extensions/types.ts`, `runner.ts` (dispatch), `session/agent-session-types.ts`. Seam **đã tồn tại**. |
| omp có sẵn cơ chế sửa orphan? | `git grep -n repairOrphanOutputs -- packages` | **CÓ** — `packages/agent/src/compaction/compaction.ts:1514` và `packages/ai/src/providers/azure-openai-responses.ts:384`, cả hai đều `true`. |
| omp có sẵn bộ sanitize của senpi? | `git grep -lw 'sanitizeOpenAI\|sanitizeAnthropic'` | **rỗng**. Phải viết mới. |

<!-- ANCHOR:CURSOR-MEASUREMENT -->
### Kết luận đo: chính sách của senpi **đã có trong omp**, trên cả ba wire format

Đây là phần quan trọng nhất của work item, và nó **đảo ngược tiền đề của nhiệm vụ.**

| tầng | senpi | omp | cùng chính sách? |
| --- | --- | --- | --- |
| **A — lúc dựng context** | không làm gì | `session/session-context.ts:627-665` **xoá** khối `tool_use` không có `tool_result` khớp, trên toàn bộ đường leaf→root, **không chỉ lượt cuối**. Có opt-out `keepDanglingToolCalls` cho bản dựng transcript khi tool đang chạy. | **Hai chính sách đối nghịch** (xoá vs chèn) — xem bảng dưới. |
| **B — lúc dựng payload** | `before_provider_request` (3 tầng sanitizer) | `packages/ai/src/providers/transform-messages.ts:1118` chèn `"No result provided"` cho `tool_use` mồ côi; `:1218` xử lý orphan `tool_result`; `:1079-1080` theo dõi `tool_use` còn sống để drop orphan. `openai-shared.ts:1596` `repairOrphanResponsesToolCalls` chèn `function_call_output` giả, chạy **vô điều kiện** tại `:2145`. `openai-completions.ts:2378-2397` có thang 3 bậc cho trường hợp provider bác placeholder tổng hợp. | **CÙNG** — cả hai đều *chèn kết quả giả* để cân bằng cặp. |

Nói thẳng: **"vá tool_use/tool_result lệch nhau" không phải phần thiếu của omp. Nó là phần
đã được làm kỹ hơn bên senpi.** omp không chỉ có một bản vá, mà có **hai tầng độc lập** ở hai
thời điểm khác nhau, và tầng B còn đi kèm một hồi quy thật
(`packages/ai/test/issue-11473-orphan-output-wedge.test.ts`, issue #11473 — validator
DeepSeek cặp tool call theo lượt, nên một message chen giữa `function_call` và
`function_call_output` sẽ đóng vòng sớm → `400 No tool output found`).

Hệ quả cho §1.3 của `SENPI_FINDINGS.md` (dòng 3310-3340), vốn kết luận *"omp đã trả lời câu hỏi
't có sinh tool call mồ côi không' — có, và đã có một cách xử lý; việc còn lại là **trải cách đó
ra khỏi `cursor.ts` cho mọi provider**"*:

> **Câu đó đã được trả lời, và câu trả lời là: việc đó ĐÃ LÀM RỒI, ở tầng thấp hơn và cho mọi provider.**

§1.3 dựa vào `cursor.ts:3673` và `cursor.ts:4446` — nhưng `packages/coding-agent/src/cursor.ts`
của omp chỉ có **1019 dòng**. Dòng 3673/4446 **không tồn tại**; chúng là số dòng của *senpi*.
Đó là dấu hiệu tài liệu đã trộn hai repo. Cùng lỗi đó lặp lại ở `:2613`. Chỉ có **hai**
trích dẫn `:889` và `:953-955` là của omp, và cả hai đều nằm trong một khối chú thích giải
thích **tại sao** `todoSync` phải luôn settle (cursor.ts:889 nói đúng: một `toolCall` không
cặp sẽ bị `buildSessionContext` loại bỏ). Tức `:889` **xác nhận** tầng A, chứ không phải
"tầng A là thứ duy nhất còn thiếu".

<!-- ANCHOR:VERDICT -->
### Khoảng trống thật, hẹp hơn nhiều so với đề bài

Đo cho thấy đúng **một** chỗ còn lại, và nó **không phải** "thiếu cơ chế cân bằng cặp":

`repairOrphanOutputs` là **tuỳ chọn** (`openai-shared.ts:1860`, không có giá trị mặc định ⇒
`undefined` ⇒ falsy), và trong toàn bộ `packages/ai/src` chỉ **3 chỗ** bật:

| chỗ bật | dòng |
| --- | --- |
| `packages/agent/src/compaction/compaction.ts` | 1514 |
| `packages/ai/src/providers/azure-openai-responses.ts` | 384 |
| `packages/ai/src/providers/openai-responses.ts` | 1218 |

Trong khi `repairOrphanResponsesToolCalls` (chiều ngược lại: **call** không có **output**)
chạy **vô điều kiện** ở `openai-shared.ts:2145`. Nên:

- **chiều "tool_use mồ côi"** → đã phủ, mọi provider, không cần làm gì;
- **chiều "tool_result mồ côi"** → **chỉ** phủ trên 3 entrypoint, các entrypoint
  `buildResponsesInput` còn lại thì không.

Đây là bất đối xứng thật, và nó là thứ duy nhất còn đáng viết. Nhưng nó **không** phải port
`tool-pair-guard` của senpi: senpi không có khái niệm `repairOrphanOutputs` (đó là khái niệm
nội bộ của omp, sinh ra từ issue #11473). Port senpi vào đây **không giải quyết** khoảng trống này.

<!-- ANCHOR:WORK-ITEM -->

## `tool-pair-guard` — bật `repairOrphanOutputs` cho mọi entrypoint Responses

**Sóng / phạm vi:** M7, sóng 0 (lều phẳng, độc lập, không chặn work item nào khác). Đây là
work item **viết mới**, không phải port — xem hộp cảnh báo chi phí ở đầu file. Không có seam
mới: `before_provider_request` đã tồn tại, nhưng work item này **không dùng** seam đó (xem
"Các bước" bước 2 — đó là lý do nó rẻ hơn hẳn ước lượng 120-435 dòng của §1.3).

**Hiệu ứng người dùng thấy:** một `tool_result` mồ côi (kết quả tới nhưng lệnh gọi tương ứng
không còn trong lịch sử — xảy ra sau khi rewind, rẽ nhánh, hoặc compaction cắt mất lượt gọi)
không còn làm provider trả `400` giữa lúc đang chat. Trước đó, provider nghiêm ngặt bắt buộc
(ví dụ DeepSeek qua `openai-responses`) trả `400 No tool output found for tool call …` và phiên
chat chết. Sau đó, lệnh này được thay bằng một dòng ghi chú `[Orphan tool result; call_id=…]:`
đúng như các provider kia vốn đã làm.

**Effort:** **~0,5 engineer-day** (khoảng 3-4 giờ, gồm test). Cố ý thấp hơn con số
`~120-435 dòng` mà §1.3 của `SENPI_FINDINGS.md` ước lượng, và lý do là đo được: phần cơ chế
(`repairOrphanResponsesToolOutputs`) **đã tồn tại và đã có test**; phần còn lại chỉ là bật một
cờ đã được định nghĩa ở ba entrypoint khác. **Điều kiện để con số này sai:** nếu đo lại và thấy
một entrypoint gọi `buildResponsesInput` mà không thể bật cờ (ví dụ vì nó cố ý phát lại payload
đã ký), con số leo lên ~1,5 ngày. Đừng dùng ước lượng cũ.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/ai/src/providers/openai-shared.ts` | **KHÔNG đụng** | Đây là nơi cờ được định nghĩa (`:1860`) và nơi cơ chế chạy (`:2144`, `:2145`). Đọc để hiểu, không sửa. | Có. `:1860` `repairOrphanOutputs?: boolean;` — không mặc định, nên `undefined` ⇒ falsy. `:2144` có guard `options.repairOrphanOutputs ? … : messages`; `:2145` `repairOrphanResponsesToolCalls` không guard. |
| `packages/ai/src/providers/openai-responses.ts` | giữ nguyên | Đã bật `:1218`. Dùng làm **khuôn** cho các chỗ khác. | Có. Đọc trực tiếp dòng 1218. |
| `packages/ai/src/providers/azure-openai-responses.ts` | giữ nguyên | Đã bật `:384`. | Có. |
| `packages/agent/src/compaction/compaction.ts` | giữ nguyên | Đã bật `:1514`. | Có. |
| *(các entrypoint còn lại)* | sửa | Bật `repairOrphanOutputs: true`. **Phải liệt kê tường minh từng file sau khi khoanh vùng ở bước 2** — không dùng "v.v.". | **CHƯA** — xem bước 2. Không liệt kê tên file khi chưa đo là vi phạm cổng "đã kiểm chứng?". |
| `packages/ai/test/openai-responses-orphan-repair.test.ts` | mở rộng | Thêm ca **phủ định**: cờ tắt thì orphan **không** được sửa, input trả về nguyên trạng. | Có. File tồn tại; `git grep` cho thấy nó đã `import repairOrphanResponsesToolCalls` (dòng 4) và có `describe` ở `:8` với 5 test case (`:15,31,44,54,70`). |

<!-- ANCHOR:STEPS -->
### Các bước

1. **ĐỌC TRƯỚC, không sửa gì cả — đọc `packages/ai/src/providers/openai-shared.ts:2137-2148`** để
   xác nhận thứ tự ba bước: repair-outputs (có điều kiện) → repair-calls (vô điều kiện) →
   `hoistInterleavedResponsesToolBatchMessages`. Bước này tồn tại để bạn không viết bản thứ hai
   của một thứ đã có. *(anchor: `packages/ai/src/providers/openai-shared.ts:2144`)*

2. **CỔNG — khoanh vùng danh sách entrypoint.** Chạy
   `git grep -nw buildResponsesInput -- packages/ai/src` và **liệt kê tường minh** mọi file gọi
   nó, rồi đối chiếu với 3 file đã bật cờ ở trên. Bước này KHÔNG đổi hành vi, chỉ xác định
   danh sách. **Đây là cổng thật:** nếu danh sách rỗng (tức mọi entrypoint đều đã bật), thì
   **work item này không tồn tại** — dừng, ghi kết luận "không có việc", đừng viết code để
   chiều cờ. *(anchor: `packages/ai/src/providers/openai-shared.ts:1961` — chữ ký `buildResponsesInput`)*

3. **Trong danh sách còn lại, với từng entrypoint: bật `repairOrphanOutputs: true`** ngay cạnh
   các option khác đang truyền vào. Bật **một lần**, không sửa `openai-shared.ts`.
   *(anchor: `packages/ai/src/providers/openai-responses.ts:1218` — dòng khuôn)*

4. **BỎ QUA một cách có chủ đích:** `packages/ai/src/providers/bedrock-mantle.ts`,
   `gitlab-duo.ts`, `openai-codex-responses.ts` có chứa chuỗi `openai-responses` nhưng
   `git grep -nw buildResponsesInput` **không** thấy chúng gọi hàm đó. Chúng có thể đi đường
   riêng. Không suy diễn rằng chúng cần sửa — hãy tra đường đi thật của chúng trước, và ghi
   kết luận "thuộc / không thuộc" vào work item. *(anchor: kết quả `git grep` ở bước 2)*

5. **Định nghĩa hợp đồng phủ định trước khi viết test** (xem mục "Hợp đồng test" bên dưới) —
   đây là chỗ dễ phá session nhất, vì bật cờ sai sẽ **bịa thêm nội dung** vào lịch sử người dùng.

6. **Viết test.** Mở rộng `openai-responses-orphan-repair.test.ts`, đừng tạo file mới: file đó
   đã có sẵn harness và 5 ca, một file mới sẽ phải dựng lại cái đã có.

7. **`bun check`**, không `tsc`. Rồi chạy `bun test packages/ai/test/openai-responses-orphan-repair.test.ts packages/ai/test/issue-11473-orphan-output-wedge.test.ts` — file thứ hai là hồi quy #11473 và **phải vẫn xanh**, vì bật cờ thêm có thể đẩy một nốt orphan vào giữa cặp call/output và tái tạo đúng lỗi 400 đó.

### Hợp đồng test

Hợp đồng quan sát được, mỗi ca bảo vệ **một** nhánh khác nhau (không lặp cùng một đường):

1. **Cặp đã khớp thì không đổi.** Input có `function_call` + `function_call_output` cùng
   `call_id` ⇒ output ra **giống hệt** input, từng phần tử. Đây là hợp đồng quan trọng nhất:
   bật cờ không được được sửa lịch sử sạch.
2. **Orphan output khi cờ BẬT** ⇒ phần tử đó bị thay bằng đúng một `message` `role:"assistant"`
   chứa tiền tố `[Orphan tool result; call_id=…]:`, và `call_id` xuất hiện **nguyên văn** trong
   nội dung.
3. **HỢP ĐỒNG PHỦ ĐỊNH — cờ TẮT thì không sửa gì.** Cùng input orphan đó, `repairOrphanOutputs`
   không bật ⇒ trả về nguyên trạng, **không** có `message` nào được chèn. Không có ca nào
   khác bảo vệ được ranh giới bật/tắt; một thay đổi vô hại như đảo cờ điều kiện sẽ đi qua mà
   không test nào bắt.
4. **Orphan call (chiều ngược) không phụ thuộc cờ.** `function_call` không có output ⇒ luôn
   được chèn `function_call_output` giả, kể cả khi `repairOrphanOutputs` tắt, vì
   `openai-shared.ts:2145` gọi nó vô điều kiện. Đây là ca phủ định thứ hai, và nó ghim hành vi
   đã có sẵn để một tối ưu hoá vô tình không làm hỏng nó.
5. **Cắt ở 16 000 ký tự.** Output orphan dài hơn `ORPHAN_OUTPUT_LIMIT` phải bị cắt và có
   đuôi `...[truncated]`. Đây là hợp đồng chống làm phình context — một session thật với
   `read` trả về megabyte sẽ không còn nhồi nguyên vào payload.
6. **Hồi quy #11473 vẫn xanh** sau khi bật cờ: orphan call không được bị chen giữa một
   cặp `function_call`/`function_call_output` khác.

Cấm tuyệt đối: source-grep (AGENTS.md), `mock.module()`, `tsc`. Test gọi hàm export thật
(`repairOrphanResponsesToolOutputs`) chứ không đi qua mạng.

### Cổng hoàn thành

Cổng này phải **phân biệt được "đã làm" với "không chạy được"** — nếu nó trả về thành công mà
không nhìn thấy gì thì nó vô dụng.

- [ ] `git grep -nw buildResponsesInput -- packages/ai/src` cho ra danh sách file; **dán nguyên
      văn output** vào work item này, và đánh dấu từng file là thuộc / không thuộc. Không
      ghi "v.v.".
- [ ] `git add -A && git diff --cached --stat` **thấy** file đã sửa. (`git diff --stat` không
      thấy file mới — đó là bẫy đã làm sai tài liệu trước.)
- [ ] `git grep -cw repairOrphanOutputs -- packages/ai/src` — con số này **phải tăng** so với
      baseline **3** đo ở trên. Nếu vẫn là 3 mà bạn vẫn đang viết code, bạn đã sửa sai chỗ.
- [ ] `bun check` sạch.
- [ ] `bun test` trên **cả hai** file repair xanh, gồm hồi quy #11473.
- [ ] Ca phủ định (số 3 ở "Hợp đồng test") **được viết và xanh** — không được bỏ vì "tất nhiên
      là đúng".
- [ ] CHANGELOG `packages/ai/CHANGELOG.md` có một dòng dưới `## [Unreleased]` → `### Fixed`,
      dạng `Fixed <triệu chứng> ([#…](…))` nếu có issue, hoặc không kèm issue nếu là cải thiện
      thuần.

### Rủi ro

1. **Rủi ro chính — bịa nội dung vào lịch sử người dùng.** Đây không phải rủi ro lý thuyết:
   `repairOrphanResponsesToolOutputs` **chèn một `message` assistant** mô tả nội dung tool
   result. Bật cờ ở một entrypoint mà người dùng không chờ đợi sẽ làm lịch sử của họ chứa văn
   bản mà họ chưa từng thấy. Đây là lý do ca phủ định số 3 bắt buộc, và là lý do bước 5 phải
   viết định nghĩa **trước** test.
2. **Tái tạo #11473.** Bật cờ thêm nghĩa là thêm nốt orphan vào payload. Nếu một nốt được
   chèn giữa `function_call` và `function_call_output` của một cặp khác, validator theo lượt
   (DeepSeek) sẽ `400`. `hoistInterleavedResponsesToolBatchMessages` chạy **sau** và được viết
   để xử lý đúng việc này — nhưng nó là hàng phòng thủ, không phải giấy phép bỏ qua test hồi quy.
   **Đừng bao giờ bỏ file test #11473 khỏi danh sách chạy.**
3. **Con số Effort sai.** ~0,5 ngày dựa trên giả định "chỉ bật cờ". Nếu bước 2 phát hiện một
   entrypoint có lý do kỹ thuật không bật được, phải **cập nhật con số trong file này** thay vì
   làm lệch âm thầm.
4. **Bẫy `git grep -E '\btên\b'` trên macOS** — `\b` là backspace, trả 0 kết quả và làm đo
   sai. Dùng `git grep -w`. Đã làm sai ba tài liệu trước; xem `SENPI_FINDINGS.md` Phần 5 §0.1.
5. **Sai số dòng đã xảy ra một lần rồi.** `SENPI_FINDINGS.md` §1.3 trích `cursor.ts:3673` và
   `:4446`, nhưng `packages/coding-agent/src/cursor.ts` chỉ có **1019 dòng** — đó là số dòng của
   *senpi*. Trước khi neo một dòng trong tài liệu này, hãy mở file và xác nhận dòng đó tồn tại
   **trong repo omp**. Mọi neo `path:line` ở trên đã được kiểm bằng cách đọc file thật ở omp.

---

## PHẦN BỔ SUNG — khoảng trống **đóng**, work item bị rút lại

Đo lại ở bước 2 (chính cổng tôi đã viết trong work item trên) cho ra kết quả này:

```bash
$ git grep -lw buildResponsesInput -- packages/ai/src
packages/ai/src/providers/azure-openai-responses.ts
packages/ai/src/providers/openai-responses.ts
packages/ai/src/providers/openai-shared.ts
```

**Đây là toàn bộ danh sách.** Ba kết quả đó chính là: định nghĩa hàm (trong `openai-shared.ts`)
và **hai** entrypoint gọi nó. Cả hai entrypoint đều đã truyền `repairOrphanOutputs: true`
(`azure:384`, `openai-responses:1218`).

Baseline độc lập khớp:

```bash
$ git grep -cw repairOrphanOutputs -- packages/ai/src | grep -v ':0'
packages/ai/src/providers/azure-openai-responses.ts:1
packages/ai/src/providers/openai-responses.ts:1
packages/ai/src/providers/openai-shared.ts:2      # 1 khai báo option + 1 chỗ dùng
```

**Không còn entrypoint nào thiếu.** Cổng bước 2 của chính work item trên nói: *"nếu danh sách
rỗng (tức mọi entrypoint đều đã bật), thì **work item này không tồn tại** — dừng, ghi kết luận
'không có việc'".* Điều đó xảy ra.

Bổ sung phép đo cuối để chắc không còn sợt nào sót ở wire khác:

```bash
$ git grep -lw transformMessages -- packages/ai/src/providers
# amazon-bedrock · anthropic · apple-foundation-models · devin · google-shared
# ollama · openai-codex-responses · openai-completions · openai-shared
```

Cả **chat-completions** (`openai-completions.ts:2124`) và **Anthropic** (`anthropic.ts`) đều đi
qua `transform-messages.ts`, nơi đã chèn `"No result provided"` (`:1118`) cho `tool_use` mồ côi
và xử lý orphan `tool_result` (`:1218`). Ba wire đều phủ.

### Kết luận một câu

> **`tool-pair-guard` không tồn tại như một work item của M7.** Chính sách mà senpi dạy —
> *chèn kết quả giả để một `tool_use` mồ côi không làm provider 400* — **đã có trong omp**,
> ở `transform-messages.ts` (chat-completions + Anthropic) và `openai-shared.ts:2145`
> (Responses), với một hồi quy thật theo sau (issue #11473). Không có gì để port, không có
> seam nào phải mở, và **không có cổng nào đo được việc còn lại**.

Việc đáng làm cho tên mục này là **xoá khỏi backlog M7** và sửa lại §1.3 của `SENPI_FINDINGS.md`
(dòng 3310-3340), vốn kết luận *"việc còn lại là trải cách đó ra khỏi `cursor.ts` cho mọi
provider"* — **điều đó đã làm xong, ở tầng thấp hơn, cho mọi provider.**

### Nếu muốn mở lại work item này, phải thoả điều kiện gì

Không phải "làm thêm" — mà là **chứng minh một provider cụ thể vẫn 400**. Cụ thể:

1. Chỉ ra provider + wire format cụ thể, và message lỗi thật từ provider đó
   (không phải suy luận từ cấu hình).
2. Chứng minh nó đi qua `transform-messages.ts` hoặc `openai-shared.ts` **mà không** được
   vá — tức là nó phải thoả cả hai điều kiện, vì mọi provider hiện tại đều đi qua một trong hai.
3. Nếu là provider **future** chưa có mã: nêu rõ nó dùng wire nào, và bằng chứng wire đó có
   validator cặp theo lượt (kiểu DeepSeek #11473) — nếu không, provider đó không cần guard
   và mục chết luôn.

Cho tới khi một trong ba điều trên có bằng chứng, **đừng mở lại mục này.**

### Sai sót của chính tài liệu này — ghi lại để không lặp

Trong lúc viết, tôi đã tạm kết luận "còn khoảng trống: `repairOrphanOutputs` là opt-in và
chỉ 3 chỗ bật". Phần đó **đúng một nửa**: cờ *là* opt-in, nhưng **mọi entrypoint gọi hàm đều đã
bật**, nên "chỉ 3 chỗ" và "đủ 3 chỗ" là cùng một sự thật. Tôi suy ra khoảng trống từ việc đếm
số chỗ bật mà **không đối chiếu với số chỗ gọi**. Đếm số chỗ bật không nói lên gì nếu không
biết tổng số chỗ gọi.

Bài học cho các work item M7 còn lại: **một cờ opt-in không phải là khoảng trống cho tới khi
đã so `bật` với `gọi`.** Hai phép đo phải đi cùng nhau, và phép đo thứ hai chính là cổng ở bước 2.
