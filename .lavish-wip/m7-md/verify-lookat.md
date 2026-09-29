# Bác bỏ `w-lookat.md` — kiểm chứng từng neo

**Công cụ:** đối chiếu trực tiếp trên cây thật (omp = `/Users/tranquangdang21/Projects/ultraworkers`, senpi = `/Users/tranquangdang21/Projects/senpi-ref`).
**Nguyên tắc:** mặc định là sai. Không tìm được bằng chứng trái chiều thì ghi "chưa bác bỏ được".

---

## 0. Tóm tắt chung

Kết luận **cốt lõi của work item ĐỨNG VỮNG**: omp đã có toàn bộ lõi xử lý ảnh-thị-giac dưới tên khác (`read <ảnh>?q=`), nên hạng mục này là "vá", không phải "port 922 dòng". Đây là phát hiện có giá trị và nó đã được kiểm chứng độc lập.

Nhưng **các neo bên trong bảng "Đã có sẵn trong omp" có ít nhất 2 lỗi số dòng**, và đó chính là tiêu chuẩn của kế hoạch này. Chi tiết ở bên dưới.

---

## 1. Kiểm chứng neo `path:line` — bảng "Đã có sẵn trong omp"

| khẳng định | lệnh kiểm | kết quả | đứng vững / sai / chưa đủ dữ liệu |
| --- | --- | --- | --- |
| `image-question.ts` **181 dòng** | `wc -l` | `181` | **đứng vững** (khớp tuyệt đối) |
| `image-vision-fallback.ts` **197 dòng** | `wc -l` | `197` | **đứng vững** |
| `vision-guard.ts` **68 dòng** | `wc -l` | `68` | **đứng vững** |
| `resolveImageQuestionModel()` ở **:35** | `grep -n "export function resolveImageQuestionModel"` | `:35` | **đứng vững** |
| `askImageQuestion()` ở **:82** | `grep -n "export async function askImageQuestion"` | `:82` | **đứng vững** |
| Vòng role `["@vision","@default",activeModelPattern]` ở **:56** | `grep -n '@vision'` | `:56` | **đứng vững** |
| Khối ưu tiên cùng provider ở **:65-67** | `sed -n '65,67p'` | `:65` `const activeProvider = …`; `:66-67` `availableModels.find(candidate => candidate.provider === activeProvider && sendsImageInputOnWire(candidate), …)` | **đứng vững** — trích nguyên văn trong work item khớp |
| Thông điệp lỗi ở **:74-79** | `grep -n "Configure a vision-capable"` | `:74` chứa đúng câu `Resolved model …/… does not support image input. Configure a vision-capable model for modelRoles.vision.` | **đứng vững** |
| `sendsImageInputOnWire(model)` ở **:52** | `grep -n "export function sendsImageInputOnWire"` | **`:58`** | **SAI** — `:52` nằm giữa khối chú thích JSDoc, không phải dòng khai báo |
| `partitionVisionContent()` ở **:5** | `grep -n` | `:5` | **đứng vững** |
| `NON_VISION_IMAGE_PLACEHOLDER` ở **:4** | `grep -n` | `:4` | **đứng vững** |
| `loadImageInput()` **:326** | `grep -n` | `:326` | **đứng vững** |
| `loadSvgImageInput()` **:352** | `grep -n` | `:352` | **đứng vững** |
| `loadImageAttachmentInput()` **:391** | `sed -n '388,394p'` | `export async function loadImageAttachmentInput(` ở `:391` | **đứng vững** |
| `normalizeModelContextImages()` **:243** | `grep -rn` | `image-loading.ts:243` | **đứng vững** |
| `LoadedImageInput` ở **:165** | `grep -n` | `export interface LoadedImageInput {` ở `:165` | **đứng vững** |
| `vision-guard.ts:39-42` ghi rõ lý do | `sed -n '37,43p'` | `:39` = `export function isOpenAICompletionsVisionSupported`; chú thích `:37-38` nhắc "DashScope Qwen SKUs, DeepSeek models … reject `image_url`" | **đứng vững** (ý nghĩa khớp) |

### Lỗi 1 — `vision-guard.ts:52` (nặng: vì nó ở trong bảng "đã kiểm chứng")

`w-lookat.md:36` viết `sendsImageInputOnWire(model)` ở **:52** và gắn cột "đã kiểm chứng? = **Có**". Đó là sai — `:58` mới đúng.

Nhưng điều đáng nói hơn: **chính work item tự mâu thuẫn với nó.** ở dòng 88 (mục *Phải làm gì thay cho thế*) nó viết đúng `sendsImageInputOnWire()` (`vision-guard.ts:58`), và ở dòng 100 (bước 3) nó dùng `:58` làm neo. Vậy tức là bảng ở dòng 36 lệch với phần thân của chính tài liệu — một sự không nhất quán nội tại, không phải chỉ là lỗi gõ.

Hậu quả thực tế: ai `sed -n '52p' vision-guard.ts` sẽ đọc trúng dòng chú thích *"every other API ships the modalities the model declares"* và tưởng mình đã tìm thấy phần thân hàm — rồi kết luận sai về `pi-native` branch. Không phải lỗi chí mạng, nhưng đúng loại lỗi mà tiêu chuẩn "một neo sai làm cả bước triển khai vô dụng" muốn chặn.

---

## 2. Kiểm chứng neo `read.ts` + `internal-urls` + consumer

| khẳng định | lệnh kiểm | kết quả | kết luận |
| --- | --- | --- | --- |
| `read.ts:68` import `askImageQuestion, resolveImageQuestionModel` | `sed -n '66,70p'` | đúng dòng 68, đúng hai tên | **đứng vững** |
| `read.ts:1276` chuỗi gợi ý | `sed -n '1272,1280p'` | đúng dòng 1276, nguyên văn: ``To analyze the image, read `${imageQuestionPath}?q=<question>` — the question is answered by a vision model and returned as text.`` | **đứng vững** — trích khớp từng chữ |
| `read.ts:659` chặn bằng `spec(scheme)?.imageQuestion` | `sed -n '655,663p'` | `:659` đúng câu lệnh | **đứng vững** |
| `splitImageQuestionTarget` "ở `:1544`" | `grep -n` | **định nghĩa ở `:656`**; `:1544` chỉ là **chỗ gọi** (`const imageQuestion = splitImageQuestionTarget(readPath);`) | **sai nhẹ** — xem dưới |
| `internal-urls/types.ts:124` khai `imageQuestion` | `grep -rn` | `:124  imageQuestion?: true;` | **đứng vững** |
| `local-protocol.ts:426` bật cho `local://` | `grep -rn` | `:426  imageQuestion: true,` | **đứng vững** |
| `attachment-protocol.ts:20` bật cho `attachment://` | `grep -rn` | `:20  imageQuestion: true,` | **đứng vững** |
| Consumer `session-provider-boundary.ts:18` | `sed -n '15,20p'` | `:18` import `describeAttachedImagesForTextModel` từ `../utils/image-vision-fallback` | **đứng vững** |
| `parseJsonlLenient` ở `utils/src/stream.ts:575` | `grep -n` | `:575` | **đứng vững** |
| `image-question-system.md` tồn tại | `cat` | 20 dòng, nội dung là prompt thật (evidence-first, OCR, UI debugging) | **đứng vững** |
| `modelRoles.vision` tồn tại | `grep -rn modelRoles` | `config/model-roles.ts:60  vision: { tag: "VISION", name: "Vision", … }` | **đứng vững** |

**Lỗi 2 — `splitImageQuestionTarget` "ở `:1544`" (nhẹ).** Ở mọi dòng khác của bảng, mẫu viết "X ở `:N`" nghĩa là **dòng định nghĩa**. Ở đây `:1544` là chỗ gọi; định nghĩa ở `:656`. Không sai về hành vi (dòng 1544 có chứa đúng identifier), nhưng nếu ai đó mở `read.ts:1544` để *sửa* hàm thì họ sẽ sửa nhầm chỗ.

## 3. Kiểm chứng phía senpi — tất cả khớp tuyệt đải

Thư mục: `senpi-ref/packages/coding-agent/src/core/extensions/builtin/look-at/`

| khẳng định | lệnh kiểm | kết quả | kết luận |
| --- | --- | --- | --- |
| `model-selector.ts` **99** | `wc -l` | `99` | **đứng vững** |
| `image-input.ts` **185** | `wc -l` | `185` | **đứng vững** |
| `runner.ts` **162** | `wc -l` | `162` | **đứng vững** |
| `settings.ts` **30** | `wc -l` | `30` | **đứng vững** |
| 5 file `arguments,render,commands,prompts,index` = **446** | `cat … \| wc -l` | `125+118+117+22+64 = 446` | **đứng vững** |
| `prompts.ts` **22 dòng** | `wc -l` | `22` | **đứng vững** |
| `model-selector.ts:6-11` `DEFAULT_LOOK_AT_CHAIN` | `sed -n '1,20p'` | `:6` mở mảng, `:7-10` đúng 4 tên, `:11 ] as const;` — khớp nguyên văn khối trích trong tài liệu | **đứng vững** |
| `model-selector.ts:13` `AMBIGUOUS_ID_PROVIDER_PREFERENCE` | `sed -n '13p'` | `= ["openai", "google", "moonshotai"]` | **đứng vững** |
| `model-selector.ts:95` im lặng rơi về `visionCandidates[0]` | `sed -n '90,99p'` | `:95  return { model: visionCandidates[0], thinkingLevel: undefined };` | **đứng vững** |
| `index.ts:44` dùng `model.input.includes("image")` thô | `sed -n '40,48p'` | `:44  !ctx.model.input.includes("image") &&` | **đứng vững** |
| `prompts.ts:22` `LOOK_AT_PROMPT_SNIPPET` | `sed -n '18,24p'` | `:20` `LOOK_AT_DESCRIPTION`, `:22` `LOOK_AT_PROMPT_SNIPPET` | **đứng vững** |

Ngoài ra: `model-selector.ts:4` import `findExactModelReferenceMatch` từ `../../../model-resolver.ts` — khớp mô tả "bản senpi import nó từ module khác". ✓

## 4. Kiểm chứng số đếm — hai cách mỗi con số

| khẳng định | cách 1 | cách 2 | kết luận |
| --- | --- | --- | --- |
| `splitThinkingSuffix` gọi ở **8 chỗ** (`:142,152,269,908,1062,1132,1176,1460`) | `grep -n 'splitThinkingSuffix('` → **12 dòng**: 142 152 269 908 1062 1132 1176 1460 1464 2084 2104 2116 | `awk` loại dòng định nghĩa → **12** | **SAI — thật là 12, không phải 8** |
| `model-resolver.ts:142` | `sed -n '142p'` → `const strictSuffix = splitThinkingSuffix(pattern);` | — | **đứng vững** (nguyên văn khớp) |
| `findExactModelReferenceMatch` **không** export, ở `:686` | `sed -n '686p'` → `function findExactModelReferenceMatch(…` — không có `export` | — | **đứng vững** |
| `tui/…/model-selector.ts:44` | `grep -n` → `:44 export function splitThinkingSuffix(` | — | **đứng vững** |
| `model_select` trong omp = **0 hit** | `grep -rn "model_select" packages --include="*.ts" --include="*.md"` → **0** | — | **đứng vững** |
| senpi: **16 chỗ gọi ở 15 thư mục** | `grep -rn '\.on("model_select"'` bỏ test → **19 dòng / 19 thư mục** | loại thêm `examples/` → **18 / 18** (gồm `senpi-codemode/src`) | **SAI nhẹ** |
| `axes.ts` có **40 axis** | `grep -c "shape:"` → **42** | `grep -cE '^\t"[^"]+": \{ key:'` → **29** | **không tái lập được** |
| `SENPI_FINDINGS.md:2323` | `sed -n '2320,2326p'` → đúng dòng 2323, chứa nguyên văn: ``git grep -il 'look_at\|lookAt'` trong omp → **0 file**… Đây là bài toán token + context mà omp chưa giải.`` | — | **đứng vững** |
| §2 và §4.4 có tồn tại | `grep -n` → `:2323 ### 2. \`look-at\` (922 dòng, 2 hook)`, `:494 ### 4.4 Hạng 4` | — | **đứng vững** |
| omp **chưa có** `NOTICE.md` | file không tồn tại | — | **đứng vững** |
| 4 file test | `git ls-files` trả về đúng 4 tên nêu trong tài liệu | — | **đứng vững** |

**Lỗi 3 — "8 chỗ gọi `splitThinkingSuffix`" (sai, nhưng vô hại).** Thật là **12**. Bốn chỗ bị bỏ sót là `:1464`, `:2084`, `:2104`, `:2116` — tôi đã mở đọc, đều là lời gọi thật, không phải định nghĩa. Hướng sai **theo hướng có lợi cho kết luận** (càng nhiều chỗ gọi thì càng chắc là đã hiện thực đầy đủ), nên nó **không làm hỏng** lập luận "cột sống không cần port". Nhưng nó là một con số bị gắn nhãn "đã kiểm lại".

**Lỗi 4 — "16 chỗ gọi / 15 thư mục" (sai nhẹ, vô hại theo lập luận).** Thật là 18/18 trong `src` (không tính test, không tính `examples/`). Chiều sai lệch y hướng này cũng *củng cố* lập luận "mở seam `model_select` tốn nhiều hơn đã nghĩ", nên không mang tính quyết định.

**Lỗi 5 — "40 axis" trong `axes.ts` (không tái lập được).** Hai cách đếm hợp lý cho 42 và 29; không cách nào ra 40. Vì file này nằm trong câu chữ phụ ("File 19 KB, 40 axis") và không dùng làm neo, tôi ghi **không đủ dữ liệu** thay vì "sai" — nhưng con số này không nên được tin.

---

## 5. CỔNG — hỏng cổng, đây là phần nghiêm trọng nhất

Câu hỏi bắt buộc: *"lệnh này có phân biệt được «đã làm» với «không chạy được» không?"*

### 5.1 R2 — toàn bộ cổng `git log -S` là **CỔNG CHẾT** (nghiêm trọng nhất)

R2 dặn: *"**Không gỡ vội.** Bước 3 chỉ chạy sau khi đã trả lời P-L1-2 và xác nhận bằng `git log -S` rằng khối đó cố ý."*

Tôi chạy đúng lệnh đó:

```
git log --oneline -S 'candidate.provider === activeProvider' -- packages/coding-agent/src/utils/image-question.ts
→ ecd516f feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers
```

Một commit. Nhưng đó **không phải bằng chứng gì**, và tôi đã tìm ra vì sao:

| kiểm | kết quả |
| --- | --- |
| `git rev-list --count HEAD` | **23** |
| `git log --oneline -- <file>` | **1** commit |
| `git log --diff-filter=A -- <file>` | `ecd516f`, 2026-09-27, *"initial publish"* |

Toàn bộ 23 commit của repo là **vòng kế hoạch M1–M6** (docs/fix). Mọi dòng `src/` đều đến từ **một** commit bóp phẳng tên `initial publish`.

Hệ quả: `git log -S` trên bất kỳ file `src/` nào **luôn trả về đúng `ecd516f`**, bất kể chuỗi đó là quyết định cố ý hay sót từ nháp. Lệnh này **không thể** phân biệt "cố ý" với "thừa" — vì trong lịch sử này không có "sau đó", chỉ có "trước khi tồn tại".

Đây đúng là mẫu **cổng xanh khi không nhìn thấy gì**: nó trả về *một commit* cho mọi kết quả, nên người triển khai sẽ đọc "có commit → đã xác nhận cố ý" và gỡ khối `:65-67`. Nguy hiểm hơn: cảm giác an toàn giả tạo ra đúng ở chỗ R2 cảnh báo phải cẩn thận nhất.

**Phạm vi rộng hơn work item này:** đây là đặc tính của *cả repo*, không riêng `w-lookat.md`. Mọi cổng `git log -S` mà M7 kế hoạch chỉ định đều chết theo. Cần thay bằng một tiêu chuẩn khác (ví dụ: hỏi người ghi, hoặc so với lịch sử `pi`/`senpi` đã có sẵn, hoặc đơn giản là **giữ nguyên** khối đó vì R2 tự nói "không gỡ vội").

### 5.2 G-L1-4 — cổng `git grep -w` **đỏ ngay từ cây sạch, không bao giờ xanh**

G-L1-4: *"Không có **tên model nào** trong TS mới. Kiểm bằng `git grep -w` … Phải soi **cả diff**, không chỉ file mới."*

Chạy đúng trên cây **chưa sửa gì**:

| chuỗi | `git grep -l -w … -- '*.ts'` |
| --- | --- |
| `gpt-5.6-terra` | **25 file** |
| `gemini-3.1-pro-preview` | **8 file** |
| `gemini-3.5-flash` | **30 file** |
| `kimi-k3` | **25 file** |

Và 23/25 file hit của `gpt-5.6-terra` nằm dưới `test/`; hai file `src/` còn lại là `packages/ai/src/providers/openai-codex/request-transformer.ts` và `packages/ai/src/providers/cursor.ts` — tức **hợp đồng wire của provider**, nơi model id là residue hợp lệ, không phải bảng chính sách.

Hai lỗi độc lập:

1. **Đỏ ngay từ đầu.** Cổng không thể bao giờ xanh trên repo này. Người triển khai hoặc bị chặn vĩnh viễn, hoặc học cách bỏ qua nó. Cả hai đều giết cổng.
2. **Văn xuôi và lệnh trái nhau.** Cổng nói "phải soi cả diff", nhưng `git grep` quét **toàn cây**; nó không có tham số nào giới hạn theo diff. Lệnh đúng phải là `git diff --cached | grep -w …` hoặc `git grep -w … -- $(git diff --cached --name-only)`.

Ngoài ra, cổng này chỉ bắt **đúng 4 chuỗi đã biết**. Ai viết `claude-opus-4` vào TS mới vẫn xanh. Tên `claude-opus` có **141 file**, `gpt-5` có **258 file** trong cây hiện tại — tức lớp vi phạm mà cổng đặt tên là "tên model nào" rộng hơn rất nhiều so với 4 chuỗi nó thật sự kiểm.

*(Ghi chú: quan sát của tác giả rằng `\b` là backspace trên macOS nên `-E '\btên\b'` trả 0 — điều đó đúng với BSD grep, nhưng tôi chưa chạy riêng để xác nhận. Không tính là điểm cộng/điểm trừ.)*

### 5.3 G-L1-3 xung đột với P-L1-2 (khi cổng trả "đóng")

G-L1-3 đòi `git add -A && git diff --cached --stat` **có dòng**. Nhưng P-L1-2 nói: *"Nếu đủ → hạng mục này **đóng**, không code gì."* Một kết quả **hợp lệ** của cổng lại làm G-L1-3 đỏ.

Cần nói rõ: `git add -A` sẽ stage cả `.lavish-wip/`, nên "có dòng" có thể chỉ là tài liệu kế hoạch — tức G-L1-3 **xanh với một thay đổi tài liệu thuần túy**, đúng loại cổng chết mà bài toán cảnh báo. Bước 1 có ghi phải ghi câu trả lời vào work item đã track, nên có workaround ngầm; nhưng bản thân G-L1-3 không nói điều đó.

**Điểm tốt — tác giả tự bắt được một cổng chết.** G-L1-3 ghi rõ: *"Cổng này **trả về thành công khi không nhìn thấy gì** nếu dùng `git diff --stat`. Dùng `--cached`."* Đây chính xác là mẫu mà bài toán yêu cầu săn, và tác giả đã tự diệt nó trước khi nó được giao cho người khác. Ghi nhận.

### 5.4 Các cổng còn lại

| cổng | đánh giá |
| --- | --- |
| **P-L1-1** | **Cổng tốt.** Quyết định phạm vi, cần người quyết định tên, trả lời bằng văn bản. Không thể xanh nhầm. |
| **P-L1-2** | **Cổng tốt**, và nó ghi rõ `"đóng"` là kết quả hợp lệ — hiếm và đúng. (Nhưng xem 5.3 về xung đột với G-L1-3.) |
| **G-L1-5** | **Cổng tốt về hình thức** — "kiểm file, không kiểm 'đã nhớ chưa'". Điều kiện "nếu có port dòng nào" thì không có lệnh máy nào, nhưng ở hạng mục này kết luận là "không port" nên cổng không hoạt động. |

## 6. Ước lượng effort — có cơ sở đếm hay chỉ cảm giác?

| khoản | cơ sở | đánh giá |
| --- | --- | --- |
| L1a **~0.25 ngày** | khối 3 dòng đã xác định chính xác (`:65-67`), thay bằng `availableModels.find(sendsImageInputOnWire)` (đã có sẵn ở `:69`), + 1 test | **có cơ sở** — tôi đã mở đọc cả hai dòng |
| L1b / L1c **~0** | hai file omp đã phủ đúng vai trò senpi | **có cơ sở** |
| **+2.5 ngày** dựng `look_at` | **không** | R4 **tự thừa nhận**: *"`runner.ts` (162) và `arguments.ts` (125) … **chưa được đọc** … khối lượng ~2.5 ngày là **ước lượng, không phải phép đo**"* |
| **~0.5 ngày** tổng (chỉ vá) | 0.25 × 2 (L1a + test hợp đồng) | **có cơ sở** |

Kết luận về effort: **phần nhỏ có cơ sở đếm, phần lớn được dán nhãn cảm giác đúng chỗ.** R4 nói thẳng trước mặt người đọc rằng con số 2.5 ngày chưa được đo và phải đọc 2 file trước khi cam kết — đây là **thực hành tốt**, không phải lỗi. Không bác bỏ.

*(Ghi chú: R4 ghi `arguments.ts` là 125 dòng — tôi đo được 125. ✓)*

---

## 7. AGENTS.md — work item này có tạo ra code vi phạm không?

Tôi kiểm **cả hai chiều**: (a) phân tích của work item về senpi có đúng không, (b) các chỉ đạo của nó có để lại vi phạm trong omp không.

### 7.1 Phân tích "senpi vi phạm cả ba điều cấm" — **đúng, đã kiểm chứng**

| điều cấm AGENTS.md | bằng chứng | kết luận |
| --- | --- | --- |
| *"no per-model lookup tables"* trong TS | `model-selector.ts:6-11` `DEFAULT_LOOK_AT_CHAIN` = 4 tên model cứng | **đúng** |
| *"routing theo provider thuộc `providers/*.kdl`"* | `model-selector.ts:13` `AMBIGUOUS_ID_PROVIDER_PREFERENCE = ["openai","google","moonshotai"]` | **đúng** |
| *"Suy ra `input` từ tên"* | `model-selector.ts:65-66` `model.id.toLowerCase() === wanted`; `index.ts:44` `!ctx.model.input.includes("image")` | **đúng** — tôi đã mở đọc cả hai |

Phần tài liệu viết là "**Cột sống** của `model-selector.ts` senpi (22 dòng) không cần port" ở bảng hiệu chỉnh — con số 22 này tôi **chưa đo riêng**, nhưng nó không dùng làm neo.

### 7.2 Chỉ đạo của work item có để lại vi phạm trong omp không? — **không**

| mối lo AGENTS.md | work item đã làm gì |
| --- | --- |
| hardcode tên model trong TS | Bước 2 và G-L1-4 **cấm** mang `DEFAULT_LOOK_AT_CHAIN`; bước 2 là *"điều khoản bắt buộc, không phải gợi ý"*; bước 3 ra lệnh dùng `sendsImageInputOnWire` |
| prompt dựng trong TS | Bước 6 **bỏ** `prompts.ts`; và nói đúng rằng omp đã có `image-question-system.md` — tôi đã đọc, 20 dòng prompt thật. ✓ |
| `any` / `ReturnType<>` / inline import | Không chỗ nào trong work item đề xuất dùng. |
| `mock.module()` / `tsc` / source-grep | Mục *Hợp đồng test* **cấm cả ba** và chỉ định `bun check` — đúng AGENTS.md. |
| test full-suite safe | Yêu cầu `vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach`, không sửa `process.env`/`Bun.env` cấp file — đúng AGENTS.md. |
| helper trùng lặp | Bước 5 bắt buộc dùng `loadImageInput()` + `askImageQuestion()`, **không** viết lại `image-input.ts` 185 dòng của senpi. Đúng tinh thần "Central Utilities". |

### 7.3 Một điểm tác giả **bỏ sót** (không nghiêm trọng)

Work item nói `model-selector.ts` vi phạm *"**cả ba** điều AGENTS.md cấm"*. Thực ra còn một lệnh cấm nữa mà senpi phạm, ở **file khác**: `prompts.ts:20-22` chứa `LOOK_AT_DESCRIPTION` và `LOOK_AT_PROMPT_SNIPPET` — **prompt dựng thẳng trong TS**, vi phạm đúng mục *"Prompts: never build prompts in code … Prompts live in static `.md` files"*.

Không nghiêm trọng vì tác giu **đã loại `prompts.ts` ở bước 6 và lý do nêu đúng** (chỉ có nghĩa nếu bơm mô tả vào system prompt). Nhưng câu "cả ba điều cấm" thì **thiếu một cái** — và điều đó hơi quan trọng, vì chính bước 6 là chỗ dựa vào việc "bỏ `prompts.ts`" như một lý do *kỹ thuật*, chứ không phải *tuân thủ*.

### 7.4 Đánh giá cổng JSONL (bước 4)

Work item nói: hạng mục này **không** đọc session JSONL ở đường nào, nên `parseJsonlLenient` không liên quan. Tôi **chưa bác bỏ được** khẳng định này — nó là phủ định phổ quát về một thư mục tôi chưa quét hết. Nhưng nó cũng là phủ định **an toàn theo hướng thận trọng**: đúng thì tiết kiệm việc, sai thì chỉ tốn thêm một kiểm tra. Và ràng buộc đi kèm ("nếu ai thêm đường đọc session thì phải đi qua cổng đó") là đúng. Ghi: **chưa bác bỏ được, không mang tính rủi ro.**

---

## 8. KẾT LUẬN

**Kết luận cốt lõi: ĐỨNG VỮNG, và tôi đã kiểm chứng độc lập.**

Phát hiện quan trọng nhất của work item — *tìm theo **tên** cho kết quả sai âm tính, tìm theo **khả năng** thì omp đã có sẵn toàn bộ lõi* — là **đúng**, và tôi đã mở đọc từng file thay vì tin grep. `SENPI_FINDINGS.md:2323` đúng là chứa câu *"Đây là bài toán token + context mà omp chưa giải"*, và nó sai: `read.ts:1276` đã tự chỉ đường, `image-question.ts:82` đã hỏi được, `image-vision-fallback.ts:194` đã thay ảnh bằng text. Đảo phạm vi từ "port 922 dòng" sang "vá 3 dòng" là chính xác. **Không bác bỏ.**

**Nhưng 3 cổng trong tài liệu này hỏng, và đó là thứ làm bước triển khai vô dụng:**

1. **R2's `git log -S` là cổng chết theo cấu trúc** — repo chỉ có một commit cho mọi dòng `src/`, nên lệnh trả về `ecd516f` cho mọi kết quả và **không thể** phân biệt "cố ý" với "thừa". Người triển khai sẽ đọc nó là xác nhận rồi gỡ khối `:65-67`. *(Đáng sửa ở cấp M7: mọi cổng `git log -S` đều chết theo.)*
2. **G-L1-4 (`git grep -w`) đỏ ngay trên cây sạch** — 25/8/30/25 file hit cho 4 tên senpi, 23/25 nằm trong `test/`. Không bao giờ xanh. Thêm nữa lệnh quét cả cây trong khi văn xuôi đòi soi diff.
3. **G-L1-3 không diễn đạt được kết quả hợp lệ "đóng hạng mục"** mà P-L1-2 vốn cho phép, và `git add -A` có thể làm nó xanh chỉ vì tài liệu.

**5 lỗi số cụ thể** (không làm hỏng kết luận, nhưng đều là con số gắn nhãn "đã kiểm chứng"):
`vision-guard.ts:52` → thật là **:58** (và tài liệu tự mâu thuẫn: `:88` và `:100` dùng đúng `:58`) · `splitImageQuestionTarget` ":1544" là **chỗ gọi**, định nghĩa ở `:656` · `splitThinkingSuffix` "8 chỗ" → thật là **12** · senpi `model_select` "16/15" → thật là **18/18** · `axes.ts` "40 axis" → không tái lập được (42 hoặc 29).

**Hai điều tác giả làm tốt, nên ghi nhận công bằng:**
Tự diệt cổng chết `git diff --stat` của chính mình trước khi giao cho người khác, và **dán nhãn trung thực** con số 2.5 ngày là cảm giác chứ không phải phép đo (R4), kèm chỉ định đúng 2 file cần đọc trước.

**Khuyến nghị, theo thứ tự:**
1. **Xoá bước xác nhận `git log -S` khỏi R2.** R2 tự nói "không gỡ vội" — thì cứ giữ nguyên khối `:65-67`, đó là hành động rẻ và an toàn hơn một cổng không phân biệt được gì.
2. **Sửa G-L1-4** thành lệnh giới hạn theo diff: `git diff --cached | grep -wE 'gpt-5\.6-terra|gemini-3\.1-pro-preview|gemini-3\.5-flash|kimi-k3'` (hoặc thu hẹp thành "soi diff thay vì cả cây").
3. **Nói rõ G-L1-3 xử lý P-L1-2="đóng"** thế nào (ví dụ: kết quả "đóng" được miễn G-L1-3, và bỏ `git add -A` để nó không xanh nhờ tài liệu).
4. Sửa 5 số ở §2 và §4; bổ sung lệnh cấm thứ tư (`prompts.ts` dựng prompt trong TS) vào mục *Vi phạm AGENTS.md*.

**Chưa bác bỏ được (ghi rõ, không phủ nhận):** phủ định ở bước 4 (hạng mục không đọc session JSONL ở bất kỳ đường nào) — tôi chưa quét đủ để phủ nhận hoặc xác nhận; nó là phủ định thận trọng nên rủi ro thấp. Cũng chưa đo riêng con số "22 dòng cột sống" trong `model-selector.ts`.

---

*Bài bác bỏ này dùng 26 lệnh shell, không đọc file nào >400 dòng, chỉ mở các file được chỉ định.*
