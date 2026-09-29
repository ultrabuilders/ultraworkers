# Bác bỏ `w-pair-guard.md` — kiểm chứng từng neo `path:line`

**File bị bác bỏ:** `.lavish-wip/m7-md/w-pair-guard.md` (297 dòng)
**Ngày:** 2026-09-28 · **Hạn mức:** 45 lệnh shell — **đã dùng 22**
**Cây thật:** omp = `/Users/tranquangdang21/Projects/ultraworkers` · senpi = `/Users/tranquangdang21/Projects/senpi-ref`

---

## 1. Tóm tắt điều hành

| kết luận | số |
| --- | --- |
| neo **đứng vững** | 27 |
| neo **sai** | 7 |
| **chưa đủ dữ liệu** | 2 |

**Phần `PHẦN BỔ SUNG` (dòng 222-297) — tức kết luận *"không tồn tại như work item, xoá khỏi
backlog"* — đứng vững trên mọi phép đo tôi chạy lại.** Đo được đúng 3 file gọi
`buildResponsesInput` trong `packages/ai/src`, cả 3 file đó đã bật cờ, cờ là opt-in có guard
thật, và cả hai chiều (call mồ côi / output mồ côi) đều có sẵn. Đây là phần đáng giữ, và nó
là phần **duy nhất** trong file có giá trị quyết định.

**Nhưng phần trên (dòng 1-220) viết sai 7 chỗ.** Hai chỗ sai nghiêm trọng nhất, cùng một
loại: chúng là **bằng chứng trái chiều với chính luận điểm của file**.

---

## 2. Bảng kiểm chứng

### 2.1 Nhóm SAI (không bác bỏ được — phải sửa file)

| # | khẳng định của `w-pair-guard.md` | lệnh kiểm | kết quả | verdict |
|---|---|---|---|---|
| S1 | dòng 6: `grep -rn 'packages/ai\|tool-pair-repair\|@earendil-works/pi-ai' $B/tool-pair-guard/` → **rỗng** | cùng lệnh, `B=…/builtin/tool-pair-guard` | **1 hit**: `index.ts:1: import { sanitizeAnthropicToolPairs … } from "@earendil-works/pi-ai";` | **SAI** |
| S2 | dòng 4-5: `SENPI_FINDINGS.md` **§5.3 (dòng 735-745)** | `sed -n '733,746p' SENPI_FINDINGS.md` | 735-745 là bảng phép đo `git grep -E '\bbtw\b'` + mục "dùng/không dùng" — **không phải §5.3**. §5.3 thuộc `deep-risk.md` (theo `SENPI_FINDINGS.md:830`) | **SAI** |
| S3 | dòng 52 & 216: 3673/4446/2613 "**là số dòng của *senpi***" | `git -C senpi-ref ls-files \| grep cursor.ts` → chỉ 2 file, 100 và 261 dòng; `senpi grep -l 'dangling call into every rebuilt transcript'` → **exit 1** | Số dòng này **không tồn tại ở repo nào**. Không phải của senpi | **SAI** |
| S4 | dòng 36: `openai-completions.ts:2378-2397` "có thang 3 bậc cho trường hợp provider bác placeholder tổng hợp" — nằm trong hàng "**B — lúc dựng payload**" về cân bằng `tool_use`/`tool_result` | `sed -n '2374,2400p'` | 2378-2397 là thang 3 bậc cho **`reasoning_content`** của block `thinking` (DeepSeek V4, Kimi, OpenRouter). **Không liên quan gì** tới cặp tool | **SAI** (nhầm bằng chứng) |
| S5 | dòng 65-71: "trong toàn bộ `packages/ai/src` **chỉ 3 chỗ bật**" + bảng liệt kê `packages/agent/src/compaction/compaction.ts` | `git grep -cw repairOrphanOutputs -- packages/ai/src` | Trong `packages/ai/src` chỉ **2** file bật. File thứ 3 nằm ở `packages/` **`agent`**/`src`, ngoài giới hạn câu | **SAI** (lẫn phạm vi) |
| S6 | dòng 116: test file có "`describe` ở `:8` với **5 test case** (`:15,31,44,54,70`)" | `grep -n 'it(' …/openai-responses-orphan-repair.test.ts` | **7** ca: `:9, 26, 38, 48, 62` (`describe` #1) + `:86, 101` (`describe` #2). **Không ca nào ở 15/31/44/54/70** | **SAI** (5/5 dòng sai) |
| S7 | dòng 66 + 188-189 + 240-243: hai con số "**3**" | xem mục 3 | Con số 3 ở dòng 66-71 = 3 *chỗ bật* (2 trong `ai/src` + 1 ở `agent/src`). Con số 3 ở dòng 240-243 = 3 *file có hit* trong `packages/ai/src`, trong đó 1 là **file khai báo**. Cổng "con số này phải tăng so với baseline 3" vì vậy trỏ vào **hai thứ khác nhau** | **SAI** (cổng mơ hồ) |

### 2.2 Nhóm ĐỨNG VỮNG

| # | khẳng định | lệnh kiểm | kết quả | verdict |
|---|---|---|---|---|
| V1 | senpi vá ở `before_provider_request`, dòng 8 | `sed -n '1,14p' …/builtin/tool-pair-guard/index.ts` | dòng 8 = `pi.on("before_provider_request", (event) => {` | đứng vững |
| V2 | `grep -rn 'packages/ai\|tool-pair-repair\|@oh-my-pi/pi-ai' …` → rỗng | cùng lệnh (mẫu thứ 3 của **SENPI**, khác S1) | exit 1, rỗng | đứng vững |
| V3 | `SENPI_FINDINGS.md` Phần 9 §7 nằm ở dòng 5415-5440 | `sed -n '5413,5441p'` | đúng: `## 7. Bác bỏ #11 — §5.3: tool-pair-guard không vá ở packages/ai` | đứng vững |
| V4 | `SENPI_FINDINGS.md` §1.3 nằm ở dòng 3310-3340 | `sed -n '3310,3340p'` | đúng: bảng 3 dòng `cursor.ts:3673/4446/2613` + bảng "hai chính sách" | đứng vững |
| V5 | omp có `before_provider_request` | `git grep -lw before_provider_request -- packages` | có (11 file, nhiều hơn 3 file doc liệt kê — nhưng doc không tuyên bố exhaustive) | đứng vững |
| V6 | `sanitizeOpenAI\|sanitizeAnthropic` → rỗng | `git grep -lw 'sanitizeOpenAI\|sanitizeAnthropic' -- packages` | exit 1, rỗng | đứng vững ⚠️ xem V6b |
| V6b | *lệnh doc viết không có `-- packages`* | `git grep -lw 'sanitizeOpenAI\|sanitizeAnthropic'` | **exit 0** — khớp chính `w-pair-guard.md` (file đang staged) | cổng tự khớp chính nó |
| V7 | `compaction.ts:1514`, `azure:384`, `openai-responses:1218` đều bật cờ | `awk 'NR==…'` từng file | cả 3 dòng = `repairOrphanOutputs: true,` | đứng vững |
| V8 | `openai-shared.ts:1860` = `repairOrphanOutputs?: boolean;` | `sed -n '1858,1862p'` | đúng dòng 1860, không mặc định | đứng vững |
| V9 | `openai-shared.ts:1961` = chữ ký `buildResponsesInput` | `sed -n '1959,1963p'` | đúng dòng 1961 | đứng vững |
| V10 | `:2144` có guard, `:2145` gọi vô điều kiện, `:2146` hoist | `sed -n '2137,2148p'` | đúng cả 3, đúng thứ tự | đứng vững |
| V11 | `openai-shared.ts:1596` = def `repairOrphanResponsesToolCalls` | `sed -n '1594,1598p'` | đúng dòng 1596 | đứng vững |
| V12 | `git grep -lw buildResponsesInput -- packages/ai/src` = **3 file** | cùng lệnh | `azure-openai-responses.ts`, `openai-responses.ts`, `openai-shared.ts` — **khớp nguyên văn** | đứng vững |
| V13 | `-c` counts = `azure:1, openai-responses:1, openai-shared:2` | `git grep -cw …` | khớp nguyên văn | đứng vững |
| V14 | `transform-messages.ts:1118` chèn `"No result provided"` | `sed -n '1114,1121p'` | đúng dòng 1118 | đứng vững |
| V15 | `transform-messages.ts:1218` xử lý orphan `tool_result` | `sed -n '1214,1222p'` | đúng dòng 1218 = `if (!validToolUseIds.has(resultKey)) {` | đứng vững |
| V16 | `transform-messages.ts:1079-1080` theo dõi `tool_use` sống | `sed -n '1075,1082p'` | đúng: `const validToolUseIds = new Set<string>();` | đứng vững |
| V17 | `openai-completions.ts:2124` gọi `transformMessages` | `sed -n '2120,2126p'` | đúng dòng 2124 | đứng vững |
| V18 | danh sách 9 file gọi `transformMessages` | `git grep -lw transformMessages -- packages/ai/src/providers` | khớp **đúng 9/9** tên file doc liệt kê | đứng vững |
| V19 | `session-context.ts:627` bắt đầu đoạn strip dangling | `awk 'NR==627'` | đúng: `// Strip dangling tool_use blocks …` | đứng vững |
| V20 | opt-out `keepDanglingToolCalls` | `awk 'NR==650'` | đúng: `const keepDangling = options?.transcript === true && options.keepDanglingToolCalls === true;` | đứng vững |
| V21 | `cursor.ts` chỉ **1019** dòng | `wc -l` | 1019 | đứng vững |
| V22 | `cursor.ts:889` nói đúng (toolCall không cặp bị `buildSessionContext` loại) | `awk 'NR==889'` | đúng **từng chữ** | đứng vững |
| V23 | `cursor.ts:953-955` | `awk 'NR>=953&&NR<=955'` | đúng, khối chú thích orphan tool completions | đứng vững |
| V24 | 3673/4446/2613 **không tồn tại** trong omp `cursor.ts` | `awk 'NR==3673\|\|NR==4446\|\|NR==2613'` | rỗng (file chỉ 1019 dòng) | đứng vững |
| V25 | `ORPHAN_OUTPUT_LIMIT` = 16 000, đuôi `...[truncated]` | `git grep -nw ORPHAN_OUTPUT_LIMIT` | `openai-shared.ts:1567` = `16_000`; `:1568` = `` `${…slice(0,…)}\n...[truncated]` `` | đứng vững |
| V26 | hai file test tồn tại | `ls` | cả hai có | đứng vững |
| V27 | `codex-responses` / `bedrock-mantle` / `gitlab-duo` không gọi `buildResponsesInput` | `git grep -lw buildResponsesInput -- packages/ai/src` | không có trong danh sách 3 file | đứng vững |

### 2.3 Nhóm CHƯA ĐỦ DỮ LIỆU

| # | khẳng định | vì sao chưa bác bỏ được |
|---|---|---|
| C1 | **"Ba wire đều phủ"** (dòng 258-260) | Đúng ở mức *hai chiều đều được xử lý*, nhưng doc gộp phẳng hai hướng ngược nhau: `transform-messages.ts:1218` **XOÁ** orphan `tool_result` ("must be dropped"), còn `openai-shared.ts:1568` **CHÈN** một note giả. Tôi xác nhận cả hai, nhưng **không** exhaustive-enumerate từng provider để chứng minh "mọi provider đều đi qua một trong hai" — nên câu đó tôi để nguyên trạng, không phải là đã đứng vững. |
| C2 | **Effort "~0,5 engineer-day"** (dòng 100) | Không có cơ sở đếm file/dòng nào đứng sau — và nó mâu thuẫn với chính `PHẦN BỔ SUNG` nói work item không tồn tại. Ước lượng cho một việc mà chính file bác bỏ thì không có cơ sở để kiểm chứng theo bất kỳ hướng nào. |

---

## 3. Hai lỗi "cổng" — chỗ nguy hiểm nhất

**3.1. Cổng hoàn thành tự khớp chính file đang viết (V6b).** Dòng 26 của `w-pair-guard.md` ghi
lệnh `git grep -lw 'sanitizeOpenAI\|sanitizeAnthropic'` **không có `-- packages`**. Chạy
nguyên lệnh đó trên cây hiện tại trả **exit 0**, khớp chính `w-pair-guard.md` (file đang ở
trạng thái staged `A`). Tức lệnh "rỗng" trong bảng Đo chỉ rỗng vì tình cờ, và bất kỳ lần
chạy lại nào từ giờ cũng sẽ **không rỗng**. Đây đúng loại cổng chết mà chính tài liệu cảnh
báo ở dòng 213-214.

**3.2. Hai con số "3" là hai thứ khác nhau (S5 + S7).**

| chỗ | "3" đếm cái gì |
|---|---|
| dòng 66-71 (bảng "chỗ bật") | 3 **chỗ bật**: `compaction.ts:1514`, `azure:384`, `openai-responses:1218` |
| dòng 240-243 (baseline `-c`) | 3 **file có hit trong `packages/ai/src`**: `azure`(1), `openai-responses`(1), `openai-shared`(**2** = 1 khai báo + 1 dùng) |

Hai bảng **không giao nhau** ở file thứ ba. Hệ quả trực tiếp: cổng ở dòng 188-189 *"con số
này **phải tăng** so với baseline 3"* không có nghĩa vì nó không nói đang đếm cái gì. Với
lệnh `git grep -cw`, tăng từ 3 lên 4 chỉ xảy ra nếu **thêm file thứ 4** — nhưng nếu ai đó
thêm lần gọi thứ 2 vào một file đang có 1 hit thì con số file vẫn là 3, và cổng **xanh trong
khi không có gì được làm đúng**.

---

## 4. Bằng chứng trái chiều mạnh nhất — phần bị bác bỏ *quá tay*

Hộp cảnh báo mở đầu file (dòng 6-7) kết luận: **"Không có dòng nào tham chiếu tầng dưới"**,
và `PHẦN BỔ SUNG` củng cố: senpi *"là một extension thuần túy, không vá gì ở tầng dưới"*.

Nhưng dòng 1 của chính file đó là:

```ts
import { sanitizeAnthropicToolPairs as sanitizeAnthropicPayload } from "@earendil-works/pi-ai";
```

Tức senpi **tiêu thụ một hàm sanitize do package `pi-ai` của nó cung cấp** — khác tên với
`tool-pair-repair.ts` mà §5.3 nêu, nhưng **cùng tầng và cùng chức năng**. Điều này có nghĩa:

- Phần đúng: extension không **vá** (`patch`) tầng dưới, không có đường dẫn tới
  `packages/ai/src` theo *đường dẫn file* — grep rỗng là thật (V2).
- Phần sai: kết luận *"không có tham chiếu tầng dưới"* **mạnh hơn bằng chứng**. Grep theo
  *tên package* mới là cách đúng để tìm tham chiếu tầng dưới, và nó **có hit**. Lệnh mà
  doc dùng để bác bỏ (S1) chính là lệnh grep theo tên package — và nó **không rỗng**.

Tôi **không** bác bỏ kết luận cuối cùng (không có gì để port), vì kết luận đó đứng vững
trên phép đo độc lập (`buildResponsesInput` chỉ có 3 file, cả 3 đã bật cờ). Nhưng lập luận
đưa tới đó ở phần mở đầu thì **hỏng**, và nó hỏng theo đúng hướng làm người đọc tin rằng
senpi không có gì ở tầng `packages/ai` — trong khi thực tế `sanitizeAnthropicToolPairs` là
một export của chính tầng đó.

---

## 5. Cổng: có phân biệt được "đã làm" với "không chạy được" không?

| cổng | đánh giá |
|---|---|
| **bước 2** (dòng 126-131) — khoanh vùng `buildResponsesInput` | ✅ **Cổng thật, và nó đã cứu tài liệu.** Chính tác giả chạy nó, thấy danh sách không có file thứ 4, và tự kết luận work item không tồn tại. Đây là bài học đúng: **đếm số chỗ bật mà không đối chiếu số chỗ gọi thì vô nghĩa** (dòng 288-297 tự thú nhận điều này — thành thật). |
| `git add -A && git diff --cached --stat` thấy file đã sửa | ✅ phân biệt được. Cảnh báo "git diff --stat không thấy file mới" là đúng. |
| `git grep -cw repairOrphanOutputs` phải tăng > 3 | ⚠️ **mơ hồ** — xem §3.2. Đếm file, không đếm chỗ bật. Tăng "xanh" khi làm sai việc. |
| `bun check` sạch | ❌ một mình thì là cổng chết (xanh khi không nhìn thấy gì). Chỉ có giá trị khi đi cùng `git diff --cached --stat`. Doc tự nói điều này ở dòng 180-181, nhưng vẫn liệt kê nó như một mục checkbox độc lập. |
| ca phủ định "cờ tắt thì không sửa" (mục 3) | ✅ **hợp đồng test tốt nhất trong file.** Bảo vệ đúng ranh giới bật/tắt, và chính file nói rõ vì sao: "một thay đổi vô hại như đảo cờ điều kiện sẽ đi qua mà không test nào bắt". Đúng tinh thần AGENTS.md. |
| **các cổng ở nửa trên (changelog, `git diff`, 2 file test)** | ❌ **cổng chết theo nghĩa đen** — chúng bảo vệ một work item mà chính `PHẦN BỔ SUNG` đã rút lại. |

**Vấn đề cấu trúc lớn nhất:** file **không rút lại nửa trên**. Nó vẫn để nguyên một work item
đầy đủ — 7 bước, 6 hợp đồng test, 7 mục cổng, ước lượng effort — cho một việc mà chính nó nói
là không tồn tại. Người đọc rơi vào dòng 86 sẽ thấy một work item sẵn sàng để làm. Tài liệu
chỉ **nối thêm** một phần bổ sung ở cuối, không đánh dấu phần trên là đã hủy. Sửa đúng là:
xoá dòng 86-220 và giữ lại 1-84 (phép đo) + 222-297 (kết luận), hoặc chèn một dòng
**"⚠️ đã rút lại — xem PHẦN BỔ SUNG"** ngay trên dòng 84.

---

## 6. AGENTS.md — work item này có tạo ra code vi phạm không?

Không. Cụ thể:

| quy tắc | trạng thái |
|---|---|
| hard-code model id trong TS | ✅ không có |
| viết prompt bằng TS | ✅ không có |
| `any` | ✅ không có |
| `ReturnType<>` | ✅ không có |
| inline import | ✅ không có |
| `mock.module()` | ✅ **cấm tường minh** ở dòng 175 |
| `tsc` | ✅ **cấm tường minh** ở dòng 175, và bước 7 bắt dùng `bun check` |
| source-grep trong test | ✅ **cấm tường minh** ở dòng 175 — đúng, và test gọi hàm export thật |
| Changelog | ✅ `packages/ai/CHANGELOG.md` tồn tại (255 KB), quy tắc `### Fixed` được nêu đúng |

**Một ma sát chưa nói:** hợp đồng test #5 (dòng 169-171) yêu cầu kiểm tra cắt ở
`ORPHAN_OUTPUT_LIMIT`, nhưng hằng đó là **`const` cục bộ trong hàm** tại
`openai-shared.ts:1567` — **không export**. Test buộc phải hard-code `16_000` trong chính nó.
Không phải vi phạm, nhưng là chi tiết ma sát nên nói thẳng trước khi ai viết test.
Ngoài ra đuôi thật là `\n...[truncated]` (**có `\n` trước**), doc viết `...[truncated]`.

---

## 7. Bảng sửa tối thiểu

| dòng | sửa thành |
|---|---|
| 6 | bỏ `@earendil-works/pi-ai` khỏi lệnh (đó là mẫu của w-pair-guard, không phải của SENPI), **hoặc** thừa nhận 1 hit ở `index.ts:1` và sửa kết luận "không có tham chiếu tầng dưới" |
| 4-5 | xoá "dòng 735-745"; §5.3 của `SENPI_FINDINGS.md` **không nằm ở đó** — dùng neo đúng là `:5415-5440` (đã có trong file) |
| 36 | gỡ `openai-completions.ts:2378-2397` khỏi hàng "B" hoặc chú thích đúng là thang 3 bậc `reasoning_content` |
| 52, 216 | đổi "là số dòng của senpi" thành **"không tồn tại ở repo nào"** (senpi không có `cursor.ts` nào vượt 261 dòng) |
| 65-71 | sửa "trong toàn bộ `packages/ai/src` chỉ 3 chỗ bật" → **2**; chuyển `compaction.ts` ra khỏi bảng, hoặc đổi giới hạn thành `packages` |
| 116 | "5 test case (`:15,31,44,54,70`)" → **7 ca**: `:9, 26, 38, 48, 62, 86, 101`; `import` ở `:3-7` chứ không phải "dòng 4" |
| 26 | thêm `-- packages` vào lệnh grep, nếu không nó tự khớp chính file này |
| 188-189 | nói rõ đếm **file** hay **chỗ bật**; nếu đếm file thì cổng phải yêu cầu **thêm file**, không phải "con số tăng" |
| 84-220 | đánh dấu **đã rút lại**, hoặc xoá — nửa này là một work item hoàn chỉnh cho việc không tồn tại |
| 169-171 | ghi rõ `ORPHAN_OUTPUT_LIMIT` không export → test phải hard-code `16_000`; đuôi thật là `\n...[truncated]` |

---

## 8. Điều tôi **không** bác bỏ được

- **Kết luận trung tâm.** "Không có gì để port, không có seam nào phải mở" — **đứng vững**, và
  tôi đã kiểm lại bằng hai phép đo độc lập (danh sách file gọi `buildResponsesInput`, và đếm
  `-c` riêng). Đừng đụng vào nó.
- **Cổng bước 2.** Nó đúng, và chính nó đã giết work item. Nếu có một bài học rút ra từ file
  này thì là bài học này, không phải phần effort.
- **Hợp đồng phủ định (mục 3).** Đúng chuẩn AGENTS.md — bảo vệ ranh giới bật/tắt, không lặp
  đường.
- **Cảnh báo `\b` trên macOS** (dòng 213-214) — đúng, và `SENPI_FINDINGS.md:733-745` xác
  nhận độc lập: cùng từ khoá, `grep -E '\bbtw\b'` cho 0 còn `grep -w` cho 52.
- **Câu "port senpi không giải quyết được khoảng trống `repairOrphanOutputs`"** (dòng 82) —
  hợp lý, vì `repairOrphanOutputs` là khái niệm nội bộ của omp sinh từ #11473, không có
  gì tương đương ở senpi.
