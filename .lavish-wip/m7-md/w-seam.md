## Work item SEAM — mở bốn seam API cho extension (phần mở đường của M7)

**Sóng / phạm vi:** Sóng 0 của M7 — sóng mở đường, đứng trước mọi sóng port builtin khác. Bốn seam nghiên cứu chỉ ra, theo thứ tự đề xuất: **S1** `agent_settled` (rẻ nhất), **S2** `registerEntryRenderer` (kèm câu hỏi mở lớn về entry-vs-message), **S3** `model_select` + `setActiveTools`/`setModel` (gỡ nhiều nhất), **S4** `session_abort` + hằng `setSession*`. Không seam nào phụ thuộc seam nào khác về mặt code — nhưng S3 có **hai cổng cần người quyết** và S2 có **một**, nên thứ tự thực thi thực tế là S1 → (chờ cổng) S2 → (chờ cổng) S3 → S4. S1 và S4 không chặn gì nên làm được ngay.

Hai hằng đo được ở đây **sửa lại đề bài gốc theo hướng thuận lợi**, và cả hai đều phải nói trước khi ai viết dòng code đầu tiên:

- **`setModel` và `setActiveTools` KHÔNG phải thứ phải thêm — omp ĐÃ CÓ.** `setActiveTools` khai báo ở `extensibility/extensions/types.ts:1501`, `setModel` ở `:1507`, và cả hai đã có handler cắm ở `:1756` và `:1758`. Nghĩa là S3 chỉ còn **một** việc: thêm *event* `model_select`. Đây là tin tốt cho effort, nhưng nó cũng dời toàn bộ rủi ro của S3 sang **duy nhất** câu hỏi về `systemPrompt` — xem S3 dưới.
- **Không có "3 hằng `setSession*`".** Đo trên cây senpi: `setSessionModel` = 25 file, còn `setSessionTitle` = **0** và `setSessionLabel` = **0**. Trên omp cả ba đều = 0. Nên S4 là **một** setter (`setSessionModel`) + **một** event (`session_abort`), không phải bốn thứ.

**Hiệu ứng người dùng thấy:** người viết extension cuối cùng (không phải người đọc plan này) có thể (a) biết lượt agent đã *hoàn toàn* ổn định — kể cả sau bước retry-backoff, mà `agent_end` hiện tại không bắt được — để bơm watermark hay đồng bộ trạng thái; (b) vẽ một loại entry riêng của mình trong transcript thay vì phải nhét nó vào ô message; (c) nghe được lúc model đổi để chỉnh system prompt của chính mình; (d) nghe lúc phiên bị huỷ. Với người dùng cuối của omp không có gì thay đổi — đây là bề mặt cho người viết extension, và phần lớn thứ nhìn thấy nằm ở các work item port builtin sau.

**Effort:** ~5 engineer-days nếu cả hai cổng đều trả lời "mở" và "giới hạn". Phân bố: S1 ~0,5 ngày · S2 ~1,5 ngày · S3 ~1,5 ngày (chủ yếu là hợp đồng `systemPrompt` + test phủ định) · S4 ~1 ngày · cộng ~0,5 ngày cho một đợt `bun check` + test chung vì cả bốn seam đều đụng cùng một cặp file lõi. Con số này nhỏ hơn nhiều so với ước lượng 10-12 ngày nếu tính nhầm `setModel`/`setActiveTools` là phải viết mới. **Cộng thêm 1-2 ngày nếu cổng P3 trả lời "không cho extension thay system prompt"** — vì khi đó phải viết thêm đường thay thế (chỉ cho phép chọn prompt đã đăng ký sẵn thay vì chuỗi tự do).

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | S1+S3+S4 — thêm khai báo event vào khối `on(...)` (hiện trải :1280-1314 cho nhóm session/agent), và **không** sửa `setActiveTools`/`setModel` vì chúng đã có sẵn. | Có. `types.ts` = 1.849 dòng (khớp số đã đo trước). `on(event: "session_stop", ...)` ở `:1314`; `on(event: "agent_end", ...)` ở `:1313` — đây là hai dòng kẹp chỗ S1 và S4 sẽ chen vào. `setActiveTools(toolNames: string[]): Promise<void>` ở `:1501`; `setModel(model: Model): Promise<boolean>` ở `:1507`; hai field handler tương ứng ở `:1756` và `:1758`. |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | S1+S3+S4 — thêm một lệnh `this.emit({ type: ... })` cho mỗi event mới, tại đúng nơi vòng lặp đã gọi `agent_end`. S2 không đụng file này. | Có một phần. File = 1.963 dòng. Có **5** lệnh `this.emit({` (đếm bằng grep) — nhưng chúng không phân bổ đều theo event; `emit` tổng quát chạy qua `ext.handlers.get(eventType)` ở `:1163` và `:1476`, tức **thêm một event không cần sửa bảng dispatch**, chỉ cần một chỗ gọi. CHƯA kiểm chứng dòng cụ thể của lệnh emit `agent_end` — phải tra bằng `grep -n 'type: "agent_end"'` trước khi ghi neo. |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | S2 — thêm `registerEntryRenderer` cạnh `registerMessageRenderer` đã có ở `:269`. Cũng là nơi `setModel`/`setActiveTools` được cắm vào context (không sửa, chỉ để biết vị trí). | Có một phần. `registerMessageRenderer<T>(customType, renderer)` ở `loader.ts:269` — đúng dòng, đây là neo chèn. Phần `setModel` trong loader CHƯA định vị dòng. |
| `packages/coding-agent/src/extensibility/extensions/index.ts` | có thể sửa | S2 — chỉ nếu kiểu entry mới cần được export ra ngoài. File = 18 dòng. | Có. File tồn tại, 18 dòng — là barrel, nên theo AGENTS.md phải dùng `export *` chứ không phải named re-export. |
| `packages/coding-agent/src/extensibility/hooks/loader.ts` | có thể sửa | S2 — bản sao song song của bề mặt hook. Nếu quyết định entry-vs-message là "ép qua `registerMessageRenderer`" thì **không đụng**; nếu là "thêm `registerEntryRenderer`" thì phải sửa cả hai bên, nếu không thì extension và hook sẽ có API lệch nhau. | Có một phần. `registerMessageRenderer<T>(customType, renderer): void` ở `hooks/loader.ts:114`. |
| `packages/coding-agent/src/extensibility/hooks/types.ts` | có thể sửa | S2 — bản sao khai báo của bề mặt hook. | Có một phần. `registerMessageRenderer<T = unknown>(customType, renderer): void` ở `hooks/types.ts:557`. |
| `packages/coding-agent/test/` (file mới) | tạo | Test contract cho cả bốn seam. Không source-grep, không `mock.module()`. | Có. `packages/coding-agent/test/extensions-discovery.test.ts` tồn tại và đã có một `pi.registerMessageRenderer("my-custom-type", ...)` ở dòng 664 — đó là khuôn harness để sao chép. |


## Đo đạc — bốn seam, từng cái một

Phép đo dùng `git grep -w` (không dùng `\b` — trên macOS `\b` là backspace nên trả 0, bẫy đã làm sai ba tài liệu trước; xem SENPI_FINDINGS Phần 5 §0.1). Cột "thiếu thật" là so khớp **tên symbol**, không phải suy đoán.

| seam | omp (đích) | senpi (nguồn) | builtin senpi dùng | phân loại |
| --- | --- | --- | --- | --- |
| `agent_settled` | **0 file** | 60 file | 6 thư mục | **Thiếu thật** |
| `registerEntryRenderer` | **0 file** | 20 file | 5 thư mục | **Thiếu thật** |
| `model_select` | **0 file** | 49 file | 16 thư mục | **Thiếu thật** (đắt nhất) |
| `session_abort` | **0 file** | 17 file | 4 thư mục | **Thiếu thật** |
| `setModel` | **22 file** (đã có) | 68 file | 2 thư mục | **KHÔNG thiếu** |
| `setActiveTools` | **22 file** (đã có) | 74 file | 9 thư mục | **KHÔNG thiếu** |
| `setSessionModel` | 0 file | 25 file | 2 thư mục | Thiếu thật |
| `setSessionTitle` | 0 file | **0 file** | 0 | **Không tồn tại ở senpi** |
| `setSessionLabel` | 0 file | **0 file** | 0 | **Không tồn tại ở senpi** |

Hợp toàn bộ bảy symbol thật sự: **27/40 builtin** của senpi chạm ít nhất một seam. Đó là con số thật, không phải "15/40" như đề bài gối gợi ý — 15 là phỏng đoán, 27 là đếm.

**Đính chính quan trọng về đường dẫn:** lần kiểm đầu tiên của tôi grep thư mục `builtins/` của senpi và trả về 0 cho *mọi* thứ — kể cả `setActiveTools` vốn chắc chắn có dùng. Lý do: senpi **không có** thư mục `builtins/` ở gốc; nó nằm ở `packages/coding-agent/src/core/extensions/builtin/` (đúng 40 thư mục con, đếm bằng `ls -d */`). Một phép đo trả 0 một cách đều đặn trên **mọi** symbol là dấu hiệu của đường dẫn sai, không phải bằng chứng về tính năng. Đã đo lại trên đúng cây, kết quả ở bảng trên.

### S1 — `agent_settled` (rẻ nhất, ~0,5 ngày)

Thiếu thật: `git grep -lw agent_settled` trên omp trả **0 file**. Senpi có 60 file, trong đó 6 builtin thật sự đăng ký.

Nhưng có một phát hiện làm thay đổi *ý nghĩa* của S1, không chỉ độ khó. Ở senpi, `agent_settled` **không** chỉ là "sau `agent_end`" — nó là ranh giới mà tên của nó nói đúng: senpi phát nó ở `core/agent-session.ts:1952`, *trước* khi `_abortProvenance.takeLateUserJoin()` kiểm tra huỷ phiên và trước `_agentSettledDelivery.finish(...)` giải ngân các hành động hoãn. Có một cơ chế giaoiao hẹn giữa extension và phiên: extension trong `agent_settled` có thể **đặt lệnh trì hoãn** mà phiên sẽ giải ngân sau đó.

Trên omp, `agent_end` **đã** có phần trì hoãn tương đương: `session/agent-session.ts:2906` kiểm tra `if (event.type === "agent_end" && this.#promptInFlightCount > 0)` và trì hoãn, với chú thích ở `:925` rằng việc phát wire-level bị hoãn tới khi số prompt đang bay về 0. Còn `:1326` và `:1331` xử lý đúng việc sắp xếp lại thứ tự.

Hệ quả thực tế: **S1 rẻ hơn nghiên cứu ước tính, và nên mở dưới dạng mỏng.** Không cần chép cơ chế `DeferredAgentSettledAction` của senpi — omp đã có trì hoãn riêng. Cái thật sự thiếu chỉ là **tín hiệu báo "lượt đã hoàn toàn ổn định"** mà extension nghe được. Đừng mở nó rồi lặp lại cơ chế trì hoãn — sẽ thành hai nguồn sự thật về "lượt đã xong chưa", và đó là loại lỗi im lặng khó nhất.

Một chi tiết nữa cần nói chính xác vì nó ảnh hưởng test. Senpi phát `agent_settled` ở một chỗ mà lý do nổi tiếng là "sau retry backoff". **Đoán thay vì đo đã cho ra một kết luận sai, nên ghi lại cả lần sai:**

- Lần đo đầu: `git grep -lw retryBackoff` trên `packages/coding-agent/src/core/*` trả 0, và thư mục đó **không tồn tại** (session code nằm ở `src/session/`, không phải `src/core/`; `git ls-files | grep -w agent-session.ts` trả `packages/coding-agent/src/session/agent-session.ts`). Một lệnh trả 0 vì đường dẫn sai không chứng minh gì cả.
- Lần đo lại trên đúng cây: `retryBackoff` vẫn = 0, **nhưng** `retry` thì có — `agent-session.ts` import `ServingModel` từ `./retry-fallback-chains` (`:385`), có khối "Retry state" ở `:757`, và `:926` nói rõ có "auto-retry" trong phần post-emit. Tóm lại: omp **có** cơ chế retry, chỉ không dùng đúng tên `retryBackoff`.

Hệ quả cho công việc: đừng viết test lại kịch bản backoff của senpi như thể omp không có retry — sai. Cũng đừng dùng nó làm lý do chính để mở S1. Lý do đúng cho omp đã nêu ở trên và không cần retry: extension cần biết lượt đã **nằm yên**, và muốn tín hiệu đó phát từ *đúng một* chỗ. Hợp đồng test bám theo lý do đó, không bám theo lý do của senpi.

### S2 — `registerEntryRenderer` (~1,5 ngày, CÓ CỔNG P2)

Thiếu thật: 0 file ở omp. Senpi có nó ở `core/extensions/types.ts:2070` với chữ ký `registerEntryRenderer<T>(customType, renderer, options?)`.

Điều làm S2 *không* phải một bản chép là khác biệt ngữ nghĩa entry/message, và tôi đã đo được khác biệt đó:

- Kiểu render bên senpi là `EntryRenderer<T> = (entry: CustomEntry<T>, options: EntryRenderOptions, theme: Theme) => Component | undefined` (`types.ts:1825`).
- Chữ ký đầy đủ kèm `EntryRendererOptions<T>` (`types.ts:1831`) với **một** trường: `readonly replaces?: (previous, next) => boolean` — "trả true để `next` thay `previous` tại chỗ thay vì render thành thẻ thứ hai", và chỉ được hỏi khi `previous` đúng là thẻ transcript liền trước và cùng custom type.
- omp **không có** khái niệm `replaces` nào trong toàn bộ thư mục `extensibility/` — grep trả về đúng 3 hit, cả ba đều là nghĩa khác ("replaces" trong câu tiếng Anh về reinstall, về provider, về observer nội bộ).
- omp có `CustomEntry` (38 hit) và có `#renderEntry` trong `tui/src/chrome/transcript-container.ts:300,347,402,486` — nhưng đó là **method riêng của transcript**, không phải điểm đăng ký cho extension. Không có bảng đăng ký nào cho extension cắm vào.

Năm builtin của senpi dùng nó: `cache-keepalive`, `goal`, `loop`, `mcp`, `rule-activation`.

**Ba phương án, so sánh công và hậu quả:**

| | (a) Ép entry qua `registerMessageRenderer` | (b) Thêm `registerEntryRenderer` | (c) Bỏ khái niệm entry |
| --- | --- | --- | --- |
| Công | ~0,5 ngày — không file mới | ~1,5 ngày — 5-6 file | ~0 ngày (chỉ là *không thêm gì*) |
| Có phục vụ 5 builtin không | **Không** — mất `replaces` | Có, trọn vẹn | Không |
| Đường hồi tố | Không hề có đường này; entry chưa bao giờ đi qua message renderer | Không | Không |
| Khiến khách tiềm mặc định | `registerMessageRenderer` giờ mang hai nghĩa: message vào LLM context, entry thì **không**. Đó là cái bẫy nặng nhất, vì khác biệt này là về **LLM context**, không phải về hình thức | Rõ ràng, nhưng thêm một khái niệm cho người viết extension phải học | Sạch nhất về mặt khái niệm |
| Rủi ro âm thầm | Extension dùng `display: false` trên entry thì nội dung **lọt vào context LLM** — lộ dữ liệu vào model mà người dùng không hề biết. Test này khó viết vì lỗi là *thành công* về mặt kỹ thuật | Thêm bề mặt API để bảo trì | Đóng băng 5 builtin |

**Đề xuất: (b), kèm hẹn.** Nhưng đề xuất chỉ đứng vững nếu cổng P2 trả lời rõ hai điều: entry có được phép vào LLM context không (khuyến nghị: **không** — giữ đúng nghĩa senpi), và `replaces` có được cần ngay ở đợt đầu hay để sau (khuyến nghị: cần — thiếu nó thì `loop` và `goal` vỡ, và hai cái đó là phần lớn giá trị của nhóm này).

Phương án (a) chỉ nên chọn nếu P2 từ chối thêm khái niệm mới, và khi đó phải ghi rõ vào kế hoạch rằng **5 builtin không port được nguyên vẹn** — đó là thông tin người quyết cần biết, không phải chi tiết kỹ thuật để tự ý quyết sau.

### S3 — `model_select` (~1,5 ngày, CÓ CỔNG P3 — đắt nhất, 16 builtin)

Thiếu thật: 0 file ở omp. Senpi có `ModelSelectEvent` ở `core/extensions/types.ts:1358` với `model`, `previousModel`, `source`, `systemPrompt` (mô tả là "active system prompt trước khi handler chạy"), và `systemPromptOptions`. Kết quả `ModelSelectEventResult` (`:1369`) mang `systemPrompt?: string | null` với chú thích **`null` resets to the base senpi prompt**, cùng `systemPromptName?: string`.

**16/40 builtin** của senpi dùng `model_select`. Đây là seam đắt nhất và là lý do thứ tự đề xuất đặt nó ở vị trí 3 chứ không phải 1.

`setModel` và `setActiveTools` đã có sẵn ở omp (`types.ts:1501` và `:1507`, handler ở `:1756`/`:1758`), nên **phần dễ của S3 đã xong**. Chỉ còn event.

**Về rủi ro `systemPrompt` — và đây là chỗ đề bài gối đã nói đúng nên nói thẳng, nhưng đủ đầy đủ hơn:**

Quyền thay system prompt là quyền rất lớn: extension kiểm soát được mọi thứ model nhìn thấy. Ba lý do cụ thể khiến nó khác hẳn một setter bình thường:

1. **Tham số của request theo sau cũng đổi theo.** Đổi system prompt ở `model_select` không chỉ đổi lượt này — nó đổi mọi lượt tiếp theo cho tới khi ai đó đổi lại. Một extension lỗi ở đây làm hỏng phiên theo cách khó gỡ nhất: không phải lỗi một request, mà là lỗi kéo dài.
2. **Nó là đường vòng qua mọi guardrail khác.** Extension là code của bên thứ ba, tải từ marketplace. Cho nó ghi đè system prompt nghĩa là trao cho nó đường lách chính sách, không phải chỉ trao thêm một khả năng trình bày.
3. **Nó không đảo ngược được theo nghĩa thông thường.** Khác với việc thêm một dòng hướng dẫn, thay cả system prompt là thay *khung*. Người dùng không có cách nào biết prompt của họ đã bị thay bởi trừ khi nhìn thấy nó.

**Đo xem ai thật sự cần quyền đó — và kết quả thu hẹp rất nhiều.** Tôi quét từng builtin có `on("model_select"` và xem handler có trả về `systemPrompt` không. Kết quả: **đúng MỘT builtin** — `prompt-preset/index.ts:107`, và chỉ ở một nhánh:

```
pi.on("model_select", async (event, ctx) => {
    refreshHeader(ctx, event);
    if (hasUserSystemPrompt(event.systemPromptOptions)) {
        return { systemPrompt: null };          // ← reset về base
    }
    const preset = resolvePreset(event.model, getSettings(ctx), eventOptionsToBuilderInput(event, ctx));
    return { systemPrompt: preset ? withUserAppends(preset.prompt, event.systemPromptOptions) : null,
             systemPromptName: preset?.name };
});
```

17 builtin có chuỗi `systemPrompt` ở đâu đó, nhưng phần lớn là *cục bộ* (`systemPromptHash`, `systemPromptFile`, `systemPromptMode` trong `anthropic-subscription`, `bash-timeout`, `compaction`...) — chúng không đi qua kết quả của `model_select`. Quét riêng `before_agent_start` trả về **0** builtin nào trả `systemPrompt`. Vậy nhu cầu thật là **1 trên 40**, không phải 16.

**Và đây là phát hiện quan trọng nhất của cả work item:** omp **đã** trao quyền thay system prompt rồi, qua một đường khác. `BeforeAgentStartEventResult` (`types.ts:1194`) có `systemPrompt?: string[]` với chú thích *"Replace policy for the next request and its continuations, until the next preparation. Extensions chain in order."* Nghĩa là chữ ký `string[]`, nối tiếp theo thứ tự — một mô hình *chính sách*, không phải *thay thế tự do*.

Sự khác biệt này quyết định cả P3: senpi dùng `string | null` (thay thế tự do, `null` là reset), omp dùng `string[]` (chính sách, nối chuỗi). **Nếu P3 chọn (b) chép nguyên `string | null` thì omp sẽ có HAI ngữ nghĩa thay system prompt cùng tồn tại** — một qua `before_agent_start` theo chính sách, một qua `model_select` theo thay thế. Đó là hai nguồn sự thật cho cùng một quyền, và là loại phức tạp mà không test nào bắt được nếu không có test chống trùng.

**Ba lựa chọn trình bày cho P3, kèm khuyến nghị:**

- **(i) Mở `model_select` KHÔNG kèm quyền thay prompt** — chỉ cho biết model đổi; extension dùng `ctx.setModel` để chủ động đổi. `prompt-preset` **không port được nguyên vẹn**; phải đổi sang cơ chế `before_agent_start` dạng chính sách. Rẻ nhất, an toàn nhất, giữ đúng một ngữ nghĩa.
- **(ii) Mở `model_select` với `systemPrompt` nhưng chỉ theo dạng chính sách `string[]`, giống hệt `before_agent_start`** — giữ nguyên khả năng port `prompt-preset`, không tạo ngữ nghĩa thứ hai, nhưng phải thiết kế cách biểu diễn "reset về base" trong mô hình chính sách (mảng rỗng? một sentinel?).
- **(iii) Chép nguyên `string | null`** — port `prompt-preset` dễ nhất, nhưng tạo hai ngữ nghĩa cùng tồn tại. **Không khuyến nghị.**

Khuyến nghị của tôi là **(ii)**, với điều kiện: bước thiết kế cách biểu diễn reset phải viết ra giấy **trước** dòng code đầu tiên, và phải có test chứng minh một `model_select` trả `systemPrompt` không ghi đè kết quả của một `before_agent_start` đã chạy — theo thứ tự nào, ai thắng. Nếu P3 chọn (i), thì `prompt-preset` chuyển sang sóng sau và work item port phải ghi rõ điều đó, chứ đừng để người triển khai phát hiện khi nó không chạy.

### S4 — `session_abort` + `setSessionModel` (~1 ngày)

Thiếu thật: `session_abort` = 0 file ở omp. Senpi có nó, và context của nó cho thấy nó **không** chỉ là "sau `session_stop`" — senpi test nó ở `test/suite/agent-session-abort-event.test.ts:25` với tên *"emits session_abort when aborting during retry backoff (not streaming)"*, và `test/ttsr/coordinator-races.test.ts:261` khẳng định đúng **một** `session_abort` được phát. Vậy nó là tín hiệu *huỷ chủ động*, khác `session_stop` (dừng bình thường).

omp đã có `session_stop` (`types.ts:1314`) với `SessionStopEventResult`. Nhưng cả hai khác nhau về ý nghĩa: `stop` là "tôi xong", `abort` là "bị cắt". Extension cần phân biệt để biết có nên rollback hay giữ trạng thái.

`setSessionModel` = 25 file ở senpi, 2 builtin dùng. `setSessionTitle`/`setSessionLabel` = **0 ở senpi** — chúng không tồn tại, nên "3 hằng `setSession*`" trong đề bài là sai; thực tế là **một** setter.

Rủi ro thật ở S4 không phải kỹ thuật mà là **double-fire**: senpi phải cố thế phát `session_abort` đúng một lần (test ttsr khẳng định `toBe(1)`), và vẫn còn một test riêng cho "gap case". Khi port, phải chứng minh cả hai: đúng một lần khi huỷ giữa lượt, và **không** phát khi phiên chỉ đóng bình thường — đó là hợp đồng phủ định mà AGENTS.md đòi hỏi, và cũng là chỗ dễ làm sai nhất vì "không phát" không để lại dấu vết nếu không test.

## Không làm gì — 10 thứ có 0 builtin nào dùng

Đo lại trên **đúng** cây builtin của senpi (`packages/coding-agent/src/core/extensions/builtin/`, 40 thư mục con):

| symbol | builtin senpi dùng | quyết định |
| --- | --- | --- |
| `executeTool` | 0 | **Không mở** |
| `registerFilesystemPolicy` | 0 | **Không mở** |
| `registerMarkdownTransformer` | 0 | **Không mở** |
| `registerMcpServer` | 0 | **Không mở** |
| `registerReadClassifier` | 0 | **Không mở** |
| `registerRemovedToolHint` | 0 | **Không mở** |

Sáu symbol này có **0** builtin nào chạm. Mở chúng chỉ làm phình `types.ts` (1.849 dòng, đã lớn) với API mà không ai trong hệ sinh thái thực sự cần — và mỗi mục là một lời hứa phải giữ vừa. Bốn method `ctx.ui` mà nghiên cứu nêu cùng loại: tôi **không** xác nhận được con số 0 cho chúng bằng phép đo tương ứng (grep `ui` + `addStatus|setStatus|addToast|notify` trong `types.ts` trả về rõ ràng 0 hit trong `extensibility/`, nghĩa là tên đúng có thể khác), nên ghi ở đây là **chưa kiểm chứng, không mở cho tới khi có ai đo đúng tên**. Đây là điểm phải nói thẳng: một khẳng định "0 builtin dùng" mà không kèm đường dẫn đo thì chưa đáng tin, và tôi đã gặp đúng lỗi đó một lần trong chính phiên này (xem mục "Đính chính" ở S3).

Lập luận chung cho cả mục này: tiêu chuẩn mở một seam không phải "senpi có nó" mà là "có builtin nào cần nó". Theo đó, `model_select` (16) và `setActiveTools` (9) đứng đầu; `agent_settled` (6) và `registerEntryRenderer` (5) đi sau; `session_abort` (4), `setSessionModel` (2), `setModel` (2) — mà `setModel` đã có sẵn nên không cần làm gì; và sáu symbol cuối bằng 0 thì để nguyên.

## Các bước

1. **CỔNG P3 — lấy câu trả lời bằng văn bản từ người duy trì TRƯỚC KHI viết dòng S3 nào:** `model_select` có kèm quyền thay system prompt không, và theo dạng nào — (i) không kèm, (ii) `string[]` chính sách giống `before_agent_start`, hay (iii) `string | null` như senpi? Ghi nguyên văn câu trả lời vào work item S3 của `MILESTONE_7_EXECUTION_PLAN.md` đã track, KHÔNG ghi vào `.lavish-wip/` (thư mục này chưa được track nên không sống sót cùng commit và người review không thấy). S3 là seam đắt nhất (16/40 builtin) và là seam duy nhất có thể tạo ra hai nguồn sự thật về cùng một quyền — không bắt đầu khi P3 còn mở. *(anchor: `packages/coding-agent/src/extensibility/extensions/types.ts:1194` (quyền đã có sẵn), senpi `core/extensions/types.ts:1369` (dạng sẽ chép nếu chọn iii))*

2. **CỔNG P2 — lấy câu trả lời bằng văn bản cho S2, SAU khi P3 đã trả lời:** chọn phương án nào trong ba phương án, và nếu chọn (a) thì ghi rõ tên **5 builtin bị mất nguyên vẹn** (`cache-keepalive`, `goal`, `loop`, `mcp`, `rule-activation`) — không được viết kiểu "một vài builtin". Ghi nguyên văn vào work item S2. S2 không được bắt đầu khi P2 còn mở, vì nó đặt tiền lệ cho mọi extension viết sau. *(anchor: `packages/coding-agent/src/extensibility/extensions/loader.ts:269` (điểm chèn), :114 (bản hook))*

3. **S1 — thêm `AgentSettledEvent` vào `shared-events.ts` và khai báo `on(event: "agent_settled", ...)` trong `types.ts`, đặt ngay cạnh `on(event: "agent_end", ...)`.** Chọn vị trí này vì hai event tương ứng với hai mốc thời gian liên tiếp của một lượt. KHÔNG chép cơ chế `DeferredAgentSettledAction` của senpi — omp đã có trì hoãn riêng ở `agent-session.ts:2906`. Một event báo "lượt đã nằm yên", phát từ đúng một chỗ. *(anchor: `packages/coding-agent/src/extensibility/shared-events.ts:195` (payload `agent_end` sẵn có), `types.ts:1313` (dòng kẹp))*

4. **S1 — tra chính xác lệnh phát trước khi ghi neo, đừng đoán số dòng:** điểm phát là nơi vòng lặp đã phát `agent_end` tới extension runner. Đã xác nhận `runner.ts` có 5 lệnh `this.emit({` và tra cứu event đi qua `ext.handlers.get(eventType)` ở `runner.ts:1163` và `:1476` — nghĩa là **thêm một event không cần sửa bảng dispatch**, chỉ thêm một chỗ gọi. Chạy `grep -n 'type: "agent_end"' packages/coding-agent/src/session/agent-session.ts` để lấy dòng thật; CHƯA có số dòng đã kiểm chứng cho neo này, và M3 đã chứng minh chuyện dùng số dòng từ trí nhớ là nguồn sai lệch (lệch 2 ở một file, lệch 11-13 ở file khác trong cùng một danh sách neo). *(anchor: `packages/coding-agent/src/session/agent-session.ts:2906` (điểm trì hoãn đã có), `runner.ts:1163` (bảng dispatch không cần sửa))*

5. **S1 — dựng hợp đồng thử bằng thứ đo được, không bằng thứ mô phỏng:** hợp đồng thật là (a) handler `agent_settled` chạy **đúng một lần** mỗi lượt; (b) nó chạy **sau** `agent_end`; (c) hợp đồng phủ định — handler `agent_settled` không chạy khi phiên chỉ `stop` mà không có lượt nào bay. Đừng dùng "sau retry backoff" làm lý do mở S1: omp **có** retry (`agent-session.ts:385` import từ `./retry-fallback-chains`, khối "Retry state" ở `:757`, "auto-retry" ở `:926`), chỉ không dùng tên `retryBackoff`. Một test viết theo kịch bản backoff của senpi sẽ vượt qua một con đường không tồn tại, tức là test vô nghĩa theo nghĩa "success passthrough" của AGENTS.md. *(anchor: `packages/coding-agent/test/extensions-discovery.test.ts:664` (khuôn harness))*

6. **S3 — thêm `ModelSelectEvent` vào `shared-events.ts` và `on(event: "model_select", ...)` vào `types.ts`.** Trả về cho extension: `model`, `previousModel`, `source`. **Không** thêm `setModel`/`setActiveTools` — chúng đã có ở `types.ts:1501` và `:1507`, handler ở `:1756`/`:1758`; viết lại là tạo hai đường cho một việc. *(anchor: `types.ts:1501,1507,1756,1758`)*

7. **S3 — vận hành đúng kết quả P3 đã chốt ở bước 1.** Nếu P3 = (i): `ModelSelectEventResult` **không** có trường `systemPrompt`, và work item port `prompt-preset` phải ghi rõ nó chuyển sang cơ chế chính sách của `before_agent_start`. Nếu P3 = (ii): trường là `systemPrompt?: string[]` — **cùng kiểu và cùng ngữ nghĩa** với `BeforeAgentStartEventResult.systemPrompt` (`types.ts:1194`), và bước tiếp theo bắt buộc là thiết kế cách biểu diễn "reset về base" trong mô hình chính sách. Nếu P3 = (iii): phải viết trước một đoạn lý giải vì sao hai ngữ nghĩa cùng tồn tại là chấp nhận được. *(anchor: `types.ts:1194` (mẫu để đối chiếu ngữ nghĩa))*

8. **S3 — bắt buộc một test chống trùng quyền, đây là test quan trọng nhất của cả work item:** một `model_select` trả `systemPrompt` **không được** ghi đè kết quả của một `before_agent_start` đã chạy, và chiều ngược lại cũng vậy — phải khẳng định rõ cái nào thắng và theo thứ tự nào. Đây là hợp đồng mà không test nào khác bắt được: nếu sai, mọi test khác vẫn xanh vì mỗi đường hoạt động đúng riêng lẻ. Đây cũng là lý do phương án (iii) bị khuyến nghị chống. *(anchor: `types.ts:1194,1197`)*

9. **S2 — nếu P2 chọn (b):** thêm `EntryRenderer<T>` và `EntryRendererOptions<T>` vào `extensibility/extensions/types.ts`, rồi `registerEntryRenderer` vào `loader.ts:269` ngay cạnh `registerMessageRenderer`. `replaces` là **tính năng bắt buộc phải có ở đợt đầu**, không phải để sau: thiếu nó thì `loop` và `goal` vỡ, và hai cái đó là phần lớn giá trị của nhóm 5 builtin. **Sửa cả hai bên** — `extensions/` và `hooks/` (`hooks/loader.ts:114`, `hooks/types.ts:557`) — nếu không thì extension và hook có API lệch nhau, và đó là loại lệch chỉ lộ ra khi ai đó viết extension dùng cả hai. *(anchor: `loader.ts:269`, `hooks/loader.ts:114`, `hooks/types.ts:557`)*

10. **S2 — hợp đồng phủ định bắt buộc, và nó là lý do phương án (a) bị loại:** entry render bằng `registerEntryRenderer` phải **không** bao giờ đi vào LLM context. Nếu chọn (a) ép qua `registerMessageRenderer`, thì một entry khai `display: false` sẽ lọt vào context — lộ dữ liệu vào model mà người dùng không hề biết, và lỗi đó **thành công về mặt kỹ thuật** nên không test kỹ thuật nào bắt. Test này buộc phải khẳng định theo hướng quan sát được: sau khi một entry được render, danh sách message gửi cho provider không chứa nó. *(anchor: `packages/coding-agent/src/extensibility/extensions/loader.ts:269`)*

11. **S4 — thêm `SessionAbortEvent` và `on(event: "session_abort", ...)` cạnh `on(event: "session_stop", ...)` ở `types.ts:1314`.** Giữ nguyên tính chất phân biệt: `stop` là kết thúc bình thường, `abort` là bị cắt. Nếu P3 hay M7 về sau cần `setSessionModel`, thêm một hàm cùng kiểu với `setModel` (không phải `setSessionTitle`/`setSessionLabel` — hai cái đó **không tồn tại ở senpi**, đo được 0 file; "3 hằng `setSession*`" trong đề bài là sai). *(anchor: `types.ts:1314` (dòng kẹp), :1507 (mẫu hàm setter))*

12. **S4 — hai hợp đồng, và cái thứ hai mới là cái khó:** (a) huỷ giữa lượt thì `session_abort` phát **đúng một lần** — senpi phải cố thế giữ điều này và test của họ khẳng định `toBe(1)`; (b) hợp đồng phủ định: phiên chỉ đóng bình thường thì `session_abort` **không** phát. (b) là chỗ dễ sai nhất vì "không phát" để lại dấu vết gì, nên nếu không test thì nó sẽ hỏng trong im lặng. Ở omp chỉ có `session_stop`, nên hợp đồng phủ định còn cần chứng minh không có đường nào phát `session_abort` khi `stop` chạy. *(anchor: senpi `test/suite/agent-session-abort-event.test.ts:25`, `test/ttsr/coordinator-races.test.ts:261` (khuôn hai hợp đồng này))*

13. **Trước khi đóng sóng — chạy `bun check` (KHÔNG dùng `tsc`/`npx tsc`) và toàn bộ test của `packages/coding-agent`, rồi xác nhận cả bốn seam đều **phát ra** chứ không chỉ biên dịch được.** Bốn seam cùng đụng một cặp file lõi (`types.ts` + `runner.ts`), nên lỗi của S1 có thể làm hỏng S4 mà không có lỗi biên dịch nào chỉ ra. *(anchor: `packages/coding-agent/src/extensibility/extensions/types.ts:1280-1314` (khối khai báo))*

## Cổng hoàn thành

Mỗi cổng dưới đây **phân biệt được "đã làm" với "không chạy được"**. Cổng trả về thành công khi KHÔNG NHÌN THẤY gì là cổng không có tác dụng. Cổng dùng `git add -A && git diff --cached --stat` — **`git diff --stat` không thấy file mới**, nên dùng nó để kiểm tra việc tạo file test là kiểm tra sai theo hướng im lặng.

| # | cổng | lệnh | "đã làm" | "không chạy được" |
| --- | --- | --- | --- | --- |
| G0 | thấy file mới thật | `git add -A && git diff --cached --stat -- packages/coding-agent/test/` | danh sách có dòng `test/…` mới | rỗng — test chưa được tạo, dù code "xong" |
| G1 | seam khai báo, không đoán bằng trí nhớ | `git grep -lw agent_settled -- '*.ts' \| wc -l` (lặp cho từng seam) | ≥ 1 cho **mỗi** seam đã quyết mở | 0 — seam chỉ được nghĩ ra, chưa khai báo |
| G2 | seam **phát ra**, không chỉ khai báo | chạy test hợp đồng của seam; handler được gọi đúng số lần đã nêu | bộ đếm trong handler bằng số đã nêu (1 cho S1/S4) | 0 — khai báo `on(...)` nhưng không có chỗ phát, test vẫn xanh nếu viết sai |
| G3 | hợp đồng phủ định của S3 | test chống trùng quyền ở bước 8 | `model_select` không ghi đè `before_agent_start` và ngược lại, chiều thắng nêu rõ | thiếu test này thì cả hai ngữ nghĩa cùng tồn tại mà mọi test khác vẫn xanh |
| G4 | entry không lọt vào LLM context (nếu P2 = b) | test hợp đồng phủ định ở bước 10 | danh sách message gửi provider không chứa entry | entry lọt vào context mà test vẫn xanh — lỗi thành công về mặt kỹ thuật |
| G5 | typecheck | `bun check` | exit 0 | exit khác 0 — dùng `tsc`/`npx tsc` ở đây là sai quy trình |
| G6 | không đụng nhầm | `git diff --cached --stat` xem có file nào ngoài danh sách "File cần chạm tới" không | không có | file ngoài danh sách — thường là dấu hiệu đã sửa lan sang `hooks/` mà không ghi ra |

Cổng G2 là cổng quan trọng nhất và là cổng dễ bỏ nhất: G1 (khai báo tồn tại) đi qua chỉ cần một dòng trong `types.ts`, trong khi điều người đọc plan thực sự cần — extension có *thấy* event hay không — chỉ G2 mới đo được. Đừng coi G1 là đủ.

## Rủi ro

| rủi ro | xác suất | hậu quả | chặn bằng |
| --- | --- | --- | --- |
| **Hai ngữ nghĩa thay system prompt cùng tồn tại** — `before_agent_start` theo chính sách `string[]` (đã có, `types.ts:1194`) và `model_select` theo thay thế `string \| null` (nếu P3 = iii) | cao nếu chọn (iii) | rất cao — hai nguồn sự thật cho cùng một quyền; hành vi phụ thuộc thứ tự đăng ký, thay đổi khi thêm/bớt extension | P3 chọn (ii) hoặc (i); bắt buộc test G3 |
| **Thay system prompt kéo dài sang các lượt sau** — không chỉ lượt hiện tại | trung bình | cao — hỏng phiên theo kiểu khó gỡ nhất: người dùng không thấy lỗi, chỉ thấy model trả lời sai | Nêu rõ trong tài liệu API: thay cho tới lần chuẩn bị kế tiếp; test phải chứng minh lượt sau đã trở lại base |
| **`agent_settled` thành nguồn sự thật thứ hai về "lượt đã xong chưa"** bên cạnh `agent_end` đã có cơ chế trì hoãn ở `agent-session.ts:2906` | trung bình | cao — hai tín hiệu trùng nghĩa, lệch nhau khi có hành động trì hoãn | Chỉ phát tín hiệu, KHÔNG chép cơ chế trì hoãn của senpi (bước 3) |
| **`session_abort` phát hai lần** khi huỷ giữa lượt | trung bình | trung bình — extension chạy tác vụ hai lần, thường là tệ nhưng không luôn | Hợp đồng `toBe(1)` ở hợp đồng S4(a), lấy khuôn từ test ttsr của senpi |
| **Test viết theo kịch bản retry backoff của senpi** như thể omp không có retry | trung bình | test vô nghĩa: đi trên đường không tồn tại, xanh vĩnh viễn, và che mất việc lượt đã nằm yên thật hay chưa | Cấm rõ ở bước 5. Lưu ý: omp **có** retry, chỉ không tên `retryBackoff` — đừng suy ra ngược lại từ một lệnh grep trả 0 |
| **`registerEntryRenderer` chỉ sửa `extensions/` mà quên `hooks/`** | trung bình | trung bình — API lệch nhau giữa hai bề mặt, chỉ lộ ra khi ai đó dùng cả hai | Bước 9 nêu cả ba neo; G6 phát hiện file ngoài danh sách |
| **Entry lọt vào LLM context** (nếu chọn phương án (a)) | thấp nếu chọn (b) | **rất cao** — lộ dữ liệu người dùng vào model, và lỗi thành công về mặt kỹ thuật nên không test kỹ thuật nào bắt | Ưu tiên (b); hợp đồng phủ định G4 |
| **Phép đo trả 0 một cách đều đặn do sai đường dẫn** — đã xảy ra **2 lần** trong phiên này: (1) grep `builtins/` (không tồn tại) trả 0 cho *mọi* symbol, gồm cả `setActiveTools` vốn chắc chắn có dùng; (2) grep `retryBackoff` trên `src/core/*` (thư mục không tồn tại) suýt khiến tôi kết luận sai rằng omp không có retry | **đã xảy ra 2 lần** | cao nếu lặp lại — kết luận sai về cả bốn seam | Đường dẫn đúng: `packages/coding-agent/src/core/extensions/builtin/`. Quy tắc: 0 trên *mọi* symbol, hoặc 0 kèm thư mục không tồn tại, là triệu chứng đường dẫn — phải đo lại trước khi kết luận |
| **Dùng số dòng từ trí nhớ làm neo** | cao | trung bình — M3 đã đo được lệch 2 ở `ui-helpers` và lệch 11-13 ở `event-controller` trong *cùng một danh sách neo* | Mọi neo trong tài liệu này đều kèm "đã kiểm chứng?"; hai cái chưa có số dòng đã đánh dấu rõ là **chưa kiểm chứng** (bước 4, `emit` site của S1) |
| **Bốn method `ctx.ui` được nêu là "0 builtin dùng" nhưng tôi chưa xác nhận được bằng đo đúng tên** | — | thấp — đã ghi "chưa kiểm chứng" và để nguyên không mở | Không ai mở chúng cho tới khi có ai đo đúng tên symbol |
