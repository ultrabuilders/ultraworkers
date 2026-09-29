# Work item — `look_at`: model thị giác riêng để tiết kiệm token/context

**Sóng / phạm vi:** Sóng 1 của M7, hạng mục `L1`. **Phạm vi đã bị đảo ngược bởi phép đo:** nghiên cứu gốc xếp `look-at` vào hạng *"đáng lấy — đây là bài toán omp chưa giải"*. Đo lại theo **khả năng** (thay vì theo **tên**), thì **omp đã giải xong bài toán đó**, dưới tên `read <ảnh>?q=<câu-hỏi>`. Vì vậy phạm vi ở đây **không phải port 922 dòng** — nó là: **xác minh cái đã có, đo ba khoảng trống thật, rồi quyết định có cần dựng tool mới không** (Cổng P-L1-2).

Hai điều đo được, đủ để đảo kết luận:

1. **omp đã có toàn bộ lõi** — `image-question.ts` (181 dòng), `image-vision-fallback.ts` (197), `image-loading.ts`, `vision-guard.ts` (68), cộng 4 file test. Chi tiết ở bảng *Đã có sẵn trong omp*.
2. **`model-selector.ts` của senpi vi phạm AGENTS.md** ở cả ba điều cấm, trong một file 99 dòng. Port nó là **port ngược** — chi tiết ở mục *Vi phạm AGENTS.md*.

**Hiệu ứng người dùng thấy (đã có sẵn hôm nay, trước khi M7 bắt đầu):** dán ảnh vào một model **text-only** → ảnh được lưu dưới `local://`, một model thị giác mô tả nó, và ảnh bị thay bằng **khối text**. Gõ `read duong-dan-anh.png?q=cau-hoi` → câu hỏi đi tới model thị giác, **trả về text**, context lượt chính không phình. Phần M7 có thể thêm, nếu P-L1-2 trả "làm", là: một tool tên `look_at` để model **tự gọi** thay vì phải tự nhớ cú pháp `?q=` — và tự ẩn đi khi model chính đã nhìn được ảnh.

**Effort:** **~0.5 engineer-day** nếu chỉ vá, **~3 ngày** nếu dựng tool `look_at` đầy đủ. Con số này **thấp hơn nhiều** so với ước lượng ban đầu — xem *Ước lượng đã hiệu chỉnh* ở cuối work item, vì phần lớn giá trị **đã tồn tại sẵn trong omp dưới tên khác**.

| Hạng mục | Ngày | Ghi chú |
| --- | --- | --- |
| L1a — vá `image-question.ts` (bỏ ưu tiên cùng provider) | **~0.25** | Một khối 3 dòng + một test. |
| L1b — **viết lại `model-selector.ts`** | **~0** | **Không còn cần** — `image-question.ts:35` đã là bản thay thế đúng và tuân thủ AGENTS.md. |
| L1c — `image-input.ts` / `runner.ts` / `arguments.ts` | **~0** | **Không còn cần** — `image-loading.ts` + `askImageQuestion` đã phủ. |
| L1d — test hợp đồng | ~0.25 | Chỉ khi có thay đổi ở L1a. |
| (nếu P-L1-2 chọn "dựng tool") `look_at` đầy đủ + test | **+2.5** | Seam `model_select` **không cần** nếu bỏ auto-bật/tắt — xem P-L1-1. |

**Tổng: ~0.5 engineer-day** nếu chỉ vá; **~3 ngày** nếu dựng tool `look_at` đầy đủ.

## File cần chạm tới

> **Kết luận đo được, đảo ngược kết luận của nghiên cứu:** `SENPI_FINDINGS.md` §4.4 và §2 nói *"Đây là bài toán token + context mà omp chưa giải"*, dựa trên `git grep -il 'look_at\|lookAt'` → **0 file**. Phép đo đó **sai âm tính**: nó tìm *tên*, không tìm *khả năng*. Đo lại theo khả năng, omp **đã có sẵn toàn bộ lõi**, dưới tên khác.

### Đã có sẵn trong omp (không cần port)

| path | dòng | cái đã có | đã kiểm chứng? |
| --- | ---: | --- | --- |
| `packages/coding-agent/src/utils/image-question.ts` | **181** | `resolveImageQuestionModel()` ở **:35** + `askImageQuestion()` ở **:82**. Chọn model thị giác theo `@vision` → `@default` → model đang chạy → cùng provider → **model thị giác đầu tiên**. | Có, đọc `1-82`. **Đây chính là bản thay thế đúng cho cả `model-selector.ts` của senpi.** |
| `packages/coding-agent/src/tools/read.ts` | **:68, :1276** | `read <đường-dẫn-ảnh>?q=<câu-hỏi>` — tool `read` tự chuyển câu hỏi cho model thị giác và trả về **text**. Chuỗi gợi ý nguyên văn ở `:1276`: *"the question is answered by a vision model and returned as text"*. | Có. `splitImageQuestionTarget` ở `:1544`; `imageQuestion: true` khai ở `internal-urls/types.ts:124`, bật cho `local://` (`local-protocol.ts:426`) và `attachment://` (`attachment-protocol.ts:20`). |
| `packages/coding-agent/src/utils/image-vision-fallback.ts` | **197** | Khi model chính **không** nhìn được ảnh: lưu ảnh vào `local://`, hỏi model thị giác, **thay ảnh bằng khối text**. `resolveVisionModel()` ở **:104**. | Có, đọc gần trọn file. Consumer: `session/session-provider-boundary.ts:18`. |
| `packages/coding-agent/src/utils/image-loading.ts` | — | `loadImageInput()` **:326**, `loadSvgImageInput()` **:352**, `loadImageAttachmentInput()` **:391**, `normalizeModelContextImages()` **:243** (resize). `LoadedImageInput` ở **:165**. | Có. Đây là bản thay thế cho `image-input.ts` + `processImage` của senpi. |
| `packages/ai/src/providers/vision-guard.ts` | **68** | `sendsImageInputOnWire(model)` ở **:52**, `partitionVisionContent()` ở **:5**, `NON_VISION_IMAGE_PLACEHOLDER` ở **:4**. | Có, đọc đầy đủ. |
| `packages/catalog/src/compat/axes.ts` | **:328** | Axis `input-modalities` — `shape: "array"`, `values: ["text","image"]`. | Có. File 19 KB, **40 axis**. |
| `packages/catalog/src/compat/collapse.ts` | **:919** | `if (memberSpecs.some(spec => spec.input.includes("image"))) input.push("image")` — "family có ảnh" **đã được suy ra tự động**. | Có. |
| `packages/coding-agent/test/utils/image-question.test.ts` + 3 file test khác | — | Đã có test cho cả hai đường. | Có, `git ls-files` xác nhận 4 file. |

### Ba khoảng trống thật còn lại (không phải "port", mà là "vá")

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/utils/image-question.ts` | **sửa, 1 chỗ** | Bỏ ưu tiên **cùng provider** ở dòng 65-67 (xem Rủi ro R2). Đây là khác biệt duy nhất giữa hai bản `resolveVisionModel`. | Có. `model ??= availableModels.find(candidate => candidate.provider === activeProvider && sendsImageInputOnWire(candidate))` — chỉ có trong bản omp, không có trong bản senpi. |
| `packages/coding-agent/src/tools/read.ts` | **sửa, nếu P-L1-2 trả "làm"** | Cho phép truyền **câu hỏi tự do** vào `?q=` mà không cần người dùng can thiệp. Hiện chuỗi ở `:1276` **tự nói cho model biết** phải dùng `?q=` — nghĩa là model phải tự nhớ. Một tool `look_at` gọi thẳng sẽ bỏ được bước "nhớ". | Có. |
| `NOTICE.md` | **tạo** | Pháp lý — attribution senpi. omp **CHƯA CÓ** file này. | Có. Chỉ cần nếu còn port bất kỳ dòng nào. Nếu P-L1-2 trả "không port gì", **không cần file này cho hạng mục này**. |

### Những file của senpi **KHÔNG** chạm tới

| file senpi | dòng | vì sao bỏ |
| --- | ---: | --- |
| `model-selector.ts` | 99 | **Vi phạm AGENTS.md nghiêm trọng** — xem mục dưới. Thay bằng `resolveImageQuestionModel`. |
| `image-input.ts` | 185 | omp đã có `image-loading.ts` làm đúng việc này, tốt hơn (có resize + SVG). |
| `runner.ts` | 162 | omp đã có `askImageQuestion`. |
| `settings.ts` | 30 | omp đã có `modelRoles.vision` trong settings — cùng khái niệm, đã có sẵn. |
| `arguments.ts`, `render.ts`, `commands.ts`, `prompts.ts`, `index.ts` | 446 | Chỉ có nghĩa nếu P-L1-2 chọn làm tool. |

## Vi phạm AGENTS.md — đây là hạng mục nguy hiểm nhất

Hạng mục này vi phạm AGENTS.md **nặng hơn hẳn** `prompt-preset`, vì `model-selector.ts` vi phạm **cả ba** điều AGENTS.md cấm trong cùng một file 99 dòng:

**1. Bảng tra cứu tên model trong TS** — `model-selector.ts:6-11`:

```typescript
export const DEFAULT_LOOK_AT_CHAIN = [
	"gpt-5.6-terra:off",
	"gemini-3.1-pro-preview:low",
	"gemini-3.5-flash",
	"kimi-k3",
] as const;
```

AGENTS.md: *"NEVER hard-code model- or provider-conditional policy in TypeScript. No `id.includes("claude")`, no model-name regexes, no per-model lookup tables"* và *"An id that no selector can isolate gets an exact-id `models` residue rule with a comment — never a special case in TS."* Bốn tên này **không có selector nào cô lập được** → theo đúng luật, chúng phải là residue rule trong KDL.

**2. Chính sách theo provider trong TS** — `model-selector.ts:13`:

```typescript
const AMBIGUOUS_ID_PROVIDER_PREFERENCE: readonly string[] = ["openai", "google", "moonshotai"];
```

Đây là thứ tự ưu tiên provider viết thẳng. AGENTS.md: routing theo provider thuộc `providers/*.kdl`, không thuộc TS.

**3. Suy ra `input` từ tên** — hàm `resolveEntry` lọc ứng viên bằng `model.id.toLowerCase() === wanted` rồi phân giải theo danh sách provider. Cùng một bài toán mà `packages/catalog/src/compat/axes.ts:328` (`input-modalities`) và `collapse.ts:919` **đã giải xong bằng dữ liệu khai báo**.

**Phải làm gì thay cho thế — KHÔNG phải KDL axis mới.** Đo cho thấy omp **đã có sẵn** câu trả lời đúng, và nó không cần axis mới:

- `sendsImageInputOnWire(model)` (`vision-guard.ts:58`) là vị từ **duy nhất** nên dùng để hỏi "model này có thật sự gửi ảnh không" — nó còn phân biệt được transport `pi-native` với các transport qua Chat Completions guard. So sánh với `model.input.includes("image")` thô của senpi (`index.ts:44`): vị từ của omp chặn được cả những model OpenAI-completions khai sai (`vision-guard.ts:39-42` ghi rõ lý do).
- Thứ tự ưu tiên lấy từ **role alias trong settings**: `["@vision", "@default", activeModelPattern]` (`image-question.ts:56`) — người dùng chọn, không phải tác giả hard-code.
- Khi không có model nào nhìn được ảnh, `image-question.ts:74-79` **ném lỗi có thông điệp dạng hành động**: *"Configure a vision-capable model for modelRoles.vision."* — tốt hơn hẳn việc lặng lẽ rơi về `visionCandidates[0]` mà senpi làm ở `model-selector.ts:95`.

**Kết luận:** `input-modalities` (`axes.ts:328`) **đã đủ**. Không cần axis `vision-preference`. Thứ tự ưu tiên là **cấu hình người dùng**, không phải sự thật về model lineage — đặt nó vào KDL sẽ sai chỗ.

## Các bước

1. **CỔNG — chốt P-L1-2 bằng văn bản TRƯỚC khi viết dòng code nào:** `read <ảnh>?q=<câu-hỏi>` đã đủ chưa, hay cần một tool `look_at` riêng? Ghi câu trả lời nguyên văn vào work item này trong kế hoạch đã track — **không** ghi vào `.lavish-wip/` (thư mục chưa được track, không sống cùng commit). Nêu rõ **ai là người quyết** vì đây là quyết định phạm vi, không phải kỹ thuật. *(anchor: `SENPI_FINDINGS.md:2323` (kết luận cũ, sai âm tính), `packages/coding-agent/src/tools/read.ts:1276` (bằng chứng ngược lại))*

2. **Không port `model-selector.ts`.** Nếu P-L1-2 trả "làm tool", tool mới **phải gọi `resolveImageQuestionModel()`** (`image-question.ts:35`) chứ không được mang `DEFAULT_LOOK_AT_CHAIN` (`model-selector.ts:6-11`) hay `AMBIGUOUS_ID_PROVIDER_PREFERENCE` (`model-selector.ts:13`) sang. Đây là điều khoản bắt buộc, không phải gợi ý. *(anchor: `senpi .../look-at/model-selector.ts:6-11,13`; omp `packages/coding-agent/src/utils/image-question.ts:35-79`)*

3. **Nếu P-L1-2 trả "chỉ vá":** gỡ khối ưu tiên cùng provider ở `image-question.ts:65-67` (`candidate.provider === activeProvider && sendsImageInputOnWire(candidate)`), thay bằng `availableModels.find(sendsImageInputOnWire)`. Lý do ở Rủi ro R2. **Giữ nguyên** vòng `["@vision","@default",activeModelPattern]` ở `:56` và **giữ nguyên** khối lỗi có thông điệp ở `:74-79`. *(anchor: `packages/coding-agent/src/utils/image-question.ts:65` (viết), `:58` + `:74-79` (giữ nguyên))*

4. **Kiểm tra cổng JSONL của M7 ở đây:** hạng mục này **không đọc session JSONL** ở bất kỳ đường nào — `image-question.ts`, `image-vision-fallback.ts`, `image-loading.ts` đều lấy ảnh qua registry/`local://`, không đọc file session. Vì vậy `parseJsonlLenient` (`packages/utils/src/stream.ts:575`) **không liên quan** tới `look_at`. Nếu ai đó thêm đường đọc session vào đây, đó là phát sinh mới và phải đi qua cổng đó. *(anchor: `packages/utils/src/stream.ts:575`)*

5. **Nếu P-L1-2 trả "làm tool":** dựng tool trên `ToolSession` sẵn có, dùng `loadImageInput()` (`image-loading.ts:326`) và `askImageQuestion()` (`image-question.ts:82`) — **không** viết lại `image-input.ts` 185 dòng của senpi. `read.ts:68` cho thấy đã có sẵn cách import hai hàm này từ trong một tool. *(anchor: `packages/coding-agent/src/tools/read.ts:68`, `packages/coding-agent/src/utils/image-loading.ts:326`, `packages/coding-agent/src/utils/image-question.ts:82`)*

6. **Bỏ qua hoàn toàn `commands.ts` / `render.ts` / `prompts.ts` / `settings.ts`** ở sóng 1. Riêng `prompts.ts` (22 dòng, `LOOK_AT_DESCRIPTION` + `LOOK_AT_PROMPT_SNIPPET`) chỉ có nghĩa nếu tool mới được bơm mô tả vào system prompt — mà omp đã có prompt riêng ở `prompts/tools/image-question-system.md`. *(anchor: `senpi .../look-at/prompts.ts:22`; omp `packages/coding-agent/src/prompts/tools/image-question-system.md`)*

7. **Nếu có bất kỳ dòng nào của senpi được mang sang** (kể cả một hằng số), tạo `NOTICE.md` ở gốc repo, ghi attribution senpi (MIT), và ghim theo commit SHA `ea9216269e9254b821446130b60d1e00759761dc` — không ghim "bản mới nhất". Không lấy thương hiệu senpi. **Nếu P-L1-2 trả "không port dòng nào", bỏ qua bước này.** *(anchor: gốc repo, file mới)*

## Hợp đồng test

Cả bốn file test đã tồn tại và **phải mở rộng**, không tạo file mới cho phần "chỉ vá":
`packages/coding-agent/test/utils/image-question.test.ts` · `test/utils/image-vision-fallback.test.ts` · `test/tools/read-image-question.test.ts` · `test/read-cli-image-question.test.ts`.

| # | Hợp đồng | Loại | Vì sao là hợp đồng quan sát được |
| --- | --- | --- | --- |
| T1 | Khi `modelRoles.vision` trỏ tới một model **không** nhìn được ảnh, `resolveImageQuestionModel` **không** chọn nó và **không** im lặng rơi xuống — nó ném `ToolError` nêu đích danh `modelRoles.vision`. | phủ định | Đây là hợp đồng phân biệt "sai cấu hình" với "hỏng"; nó chặn đúng cái im lặng mà senpi làm ở `model-selector.ts:95` (`return { model: visionCandidates[0] }`). Nếu chỉ khẳng định "trả về model", test đi qua cả khi hàm hỏng. |
| T2 | `?q=` trên một scheme **không** khai `imageQuestion` bị từ chối, và query string của scheme đó **không** bị nuốt. | phủ định | `read.ts:659` chặn bằng `spec(scheme)?.imageQuestion`. Đây là ranh giới hợp đồng thật — `attachment://` và `local://` bật (`types.ts:124`), scheme khác thì không. |
| T3 | Ảnh dán vào một model **text-only** được thay bằng khối text mô tả **và** khối đó chứa `local://` trỏ tới file đã lưu — kể cả khi việc mô tả **thất bại**. | biên | `image-vision-fallback.ts:190` rơi về `DESCRIPTION_UNAVAILABLE_NOTE`, và `:194` vẫn phát `formatImageBlock`. Hợp đồng: ảnh không bao giờ biến mất không dấu vết. Đây là lý do tồn tại của cả cơ chế. |
| T4 | `?q=` trả lời **không** nối ảnh vào context của model chính. | phủ định | Đây là *lợi ích* của hạng mục. Nếu ai đó "vá" bằng cách nhét ảnh vào lượt chính, hợp đồng này vỡ im lặng và mọi test khác vẫn xanh. Không được bỏ. |
| T5 | Sau L1a (nếu có): một model thị giác **cùng provider** nhưng khai `input` không có `"image"` thì **không** được chọn, kể cả khi nó xếp trước trong danh sách. | phủ định | Khẳng định trực tiếp việc gỡ khối `:65-67` không làm hỏng bộ lọc — nếu gỡ quá tay thành "ưu tiên provider" thì bộ lọc biến mất. |

Ràng buộc: **không source-grep** (AGENTS.md cấm), **không `mock.module()`**, **không `tsc`** — dùng `bun check`. Test phải full-suite safe: nếu cần chặn hành vi môi trường thì dùng `vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach`, không sửa `process.env`/`Bun.env` ở cấp file. Cổng dưới đây dùng `git add -A && git diff --cached --stat` — `git diff --stat` **không** thấy file mới, nên một cổng dựa vào nó sẽ báo xanh khi chưa làm gì.

## Cổng hoàn thành

| Cổng | Điều kiện | Phân biệt được "đã làm" với "không chạy được" |
| --- | --- | --- |
| **P-L1-1** (cần người quyết) | Bỏ hay giữ auto-bật/tắt `look_at` khi model đổi? Nếu giữ thì **bắt buộc** mở seam `model_select` (omp **không có**, 0 hit; senpi có 16 chỗ gọi ở 15 thư mục). Nếu bỏ, hạng mục này **không cần seam nào** và chạy được ngay ở sóng 1. | Trả lời bằng văn bản, tên người quyết. Đây là cổng quyết định **cấu trúc milestone**, không phải chi tiết. |
| **P-L1-2** (cần người quyết) | `read <ảnh>?q=` đã đủ chưa? Nếu đủ → hạng mục này **đóng**, không code gì. Nếu chưa → dựng tool. | Ghi rõ: `"đóng"` là một kết quả **hợp lệ** của cổng, không phải cổng thất bại. |
| **G-L1-3** (tự kiểm) | `bun check` sạch; `bun test` xanh; `git add -A && git diff --cached --stat` **có dòng**. | Cổng này **trả về thành công khi không nhìn thấy gì** nếu dùng `git diff --stat`. Dùng `--cached`. |
| **G-L1-4** (tự kiểm) | Không có **tên model nào** trong TS mới. Kiểm bằng `git grep -w` (KHÔNG dùng `-E '\btên\b'` — `\b` là backspace trên macOS, trả 0 và làm ba tài liệu trước sai). | Phải soi **cả diff**, không chỉ file mới — một tên model lọt vào test fixture cũng vi phạm tinh thần mục đích. |
| **G-L1-5** (tự kiểm) | Nếu có port dòng nào: `NOTICE.md` tồn tại, có attribution, và SHA `ea9216269e9254b821446130b60d1e00759761dc` được ghim. | Kiểm file, không kiểm "đã nhớ chưa". |

## Rủi ro

**R1 — Pháp lý (mức: cao nếu còn port).** Nếu P-L1-2 trả "làm tool" mà vẫn giữ `DEFAULT_LOOK_AT_CHAIN`, thì bốn chuỗi tên model của senpi đi vào repo. Ngoài AGENTS.md, đó là **vấn đề pháp lý thật**: ba nghĩa vụ MIT — giữ notice, ghi attribution, không lấy thương hiệu — và omp **chưa có `NOTICE.md`**, nghĩa là hạng mục này sẽ là lý do phải tạo file đó. Giảm rủi ro: port **cấu trúc**, không port **hằng số**.

**R2 — Ưu tiên cùng provider là điểm khác biệt duy nhất giữa hai bản, và nó có thể là cố ý.** `image-question.ts:65-67` ưu tiên model thị giác **cùng provider** với model đang chạy, trước khi rơi về model thị giác đầu tiên. Bản senpi (`image-vision-fallback.ts:104-119`) **không** có bước này. Sự khác biệt này có thể là quyết định có chủ đích (giữ cùng hạ tầng credentials/billing) chứ không phải thừa. **Không gỡ vội.** Bước 3 chỉ chạy sau khi đã trả lời P-L1-2 và xác nhận bằng `git log -S` rằng khối đó cố ý.

**R3 — Sai âm tính theo tên sẽ lặp lại.** Nghiên cứu đã kết luận *"omp chưa giải bài toán này"* chỉ vì `git grep -il 'look_at\|lookAt'` trả 0. Bất kỳ work item M7 nào khác cũng dễ dính: tìm **khả năng**, không tìm **tên**. Trước khi ghi "thiếu thật" cho bất kỳ hạng mục port nào, phải đo lại theo hành vi. Đây là bài học chung cho cả M7, không riêng `look_at`.

**R4 — Phần chưa đọc.** `runner.ts` (162) và `arguments.ts` (125) của senpi **chưa được đọc** — ngân sách đọc hết trước khi biết kết luận là "không port" là lãng phí. Hệ quả: nếu P-L1-2 đổi thành "dựng tool", **hai file này chưa được khảo sát** và khối lượng ~2.5 ngày là ước lượng, không phải phép đo. Phải đọc chúng trước khi cam kết con số đó.

**R5 — Seam `model_select` là cái bẫy.** Hạng mục này là ứng viên dễ nhất để bị kéo vào việc mở `model_select` chỉ vì muốn có auto-bật/tắt. Nhưng auto-bật/tắt là **tiện nghi**, không phải chức năng: `read.ts:1276` đã tự nhắc model về `?q=`. Đừng trả 2.5 ngày cho M1 để lấy tiện nghi khi `read <ảnh>?q=` vẫn hoạt động.

## Ước lượng đã hiệu chỉnh

Hai lần hiệu chỉnh, theo đúng thứ tự phát hiện:

| Lần | Con số | Lý do |
| --- | --- | --- |
| Nghiên cứu gốc | **~1.945 dòng** để port | Chưa biết `config/model-resolver.ts:142` đã có `splitThinkingSuffix`. |
| Hiệu chỉnh 1 | **~1.325 dòng** | Đã kiểm lại: `model-resolver.ts:142` **CHÍNH XÁC** là `const strictSuffix = splitThinkingSuffix(pattern);` — hàm này được gọi ở **8 chỗ** trong file (`:142, :152, :269, :908, :1062, :1132, :1176, :1460`), định nghĩa ở `packages/tui/src/overlays/model-selector.ts:44` (`export function splitThinkingSuffix`). Cột sống của `model-selector.ts` senpi (22 dòng) **không cần port**. |
| Hiệu chỉnh 2 (lần này) | **~0 dòng port, hoặc ~0.5 ngày vá** | Đo theo **khả năng** thay vì theo **tên**: omp đã có `image-question.ts` (181), `image-vision-fallback.ts` (197), `image-loading.ts`, `vision-guard.ts` (68) + 4 file test. Không cần port dòng nào. |

Một chi tiết phụ đáng ghi vì nó cũng là bẫy: `findExactModelReferenceMatch` **không** được export — nó là `function` (không có `export`) ở `config/model-resolver.ts:686`, trong khi bản senpi import nó từ module khác. Nếu ai đó định tái dùng trực tiếp thì phải export nó, và đó là thay đổi API nên cần nói rõ — **nhưng với kết luận hiện tại thì không cần đụng tới**.

