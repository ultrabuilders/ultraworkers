# PHẢN BIỆN — `w-seam.md`

**Đối tượng:** `.lavish-wip/m7-md/w-seam.md` (219 dòng)
**Cây kiểm:** omp `/Users/tranquangdang21/Projects/ultraworkers` · senpi `/Users/tranquangdang21/Projects/senpi-ref`
**Ngày:** 2026-09-28 · ngân sách: 11 lệnh shell (hạn mức 45)

## Kết luận một dòng

**Không bác bỏ được phần cốt lõi.** Toàn bộ neo `path:line` quan trọng đều đúng, và con số 27/40 — thứ cả tài liệu tự gọi là "con số thật" — tôi đo lại bằng hai cách độc lập và **trùng khớp**. Nhưng có **3 lỗi số liệu** và **1 lỗi kỹ thuật** trong chính phần lập luận dẫn tới khuyến nghị (S3/P3), và cái thứ nhất trong ba lỗi số liệu là **sai theo hướng làm khuyến nghị yếu đi**, không phải mạnh đi. Sửa 4 dòng là đủ; bỏ work item này thì mất một tài liệu đúng.

---

## 1. Bảng kiểm chứng

| khẳng định | lệnh kiểm | kết quả | đứng vững / sai / chưa đủ dữ liệu |
|---|---|---|---|
| `types.ts` = 1.849 dòng | `wc -l` | 1849 | **đứng vững** |
| `runner.ts` = 1.963 dòng | `wc -l` | 1963 | **đứng vững** |
| `extensions/index.ts` = 18 dòng, là barrel | `wc -l` + `grep 'export \*'` | 18, có 3 `export *` | **đứng vững** |
| `on(event: "agent_end")` ở `:1313` | `grep -n` | 1313 | **đứng vững** |
| `on(event: "session_stop")` ở `:1314` | `grep -n` | 1314 | **đứng vững** |
| khối khai báo `on(...)` trải `:1280-1314` | `grep -n \| head/tail` | 1280 → 1340 | **sai (nhỏ)** — xem §2.1 |
| `setActiveTools(...)` ở `:1501` | `grep -n` | 1501 | **đứng vững** |
| `setModel(...)` ở `:1507` | `grep -n` | 1507 | **đứng vững** |
| handler `setActiveTools`/`setModel` ở `:1756`/`:1758` | `grep -n` | 1756 / 1758 | **đứng vững** |
| `BeforeAgentStartEventResult` ở `:1194` | `sed -n 1190,1200p` | 1194, `systemPrompt?: string[]` + chú thích "Extensions chain in order" | **đứng vững** |
| `registerMessageRenderer` ở `extensions/loader.ts:269` | `grep -n` | 269 | **đứng vững** |
| `registerMessageRenderer` ở `hooks/loader.ts:114` | `grep -n` | 114 | **đứng vững** |
| `registerMessageRenderer` ở `hooks/types.ts:557` | `grep -n` | 557 | **đứng vững** |
| harness `pi.registerMessageRenderer("my-custom-type")` ở test:664 | `sed -n 660,668p` | 664 | **đứng vững** |
| omp có 41 event `on(...)` | `grep -c 'on(event: "'` | 41 | **đứng vững** (giống dữ kiện có sẵn) |
| `runner.ts` có 5 lệnh `this.emit({` | `grep -n` | 5 (823, 839, 872, 898, 904) | **đứng vững** |
| `ext.handlers.get(eventType)` ở `:1163` và `:1476` | `grep -n` | 1163, 1476 | **đứng vững** nhưng **diễn giải sai** — xem §2.4 |
| `agent-session.ts:2906` kiểm `agent_end` + `#promptInFlightCount > 0` | `grep -n` | 2906 | **đứng vững** |
| `agent-session.ts:925` chú thích trì hoãn wire-level | `sed -n 925p` | đúng nội dung | **đứng vững** |
| `agent-session.ts:385` import `ServingModel` từ `./retry-fallback-chains` | `sed -n 385p` | đúng | **đứng vững** |
| `agent-session.ts:757` khối "Retry state" | `sed -n 757p` | `// Retry state` | **đứng vững** |
| `agent-session.ts:926` nói "auto-retry" | `sed -n 926p` | có | **đứng vững** |
| `agent-session.ts:1326`/`:1331` sắp xếp lại thứ tự | `sed -n 1324,1332p` | `#pendingAgentEndEmit` drain | **đứng vững** |
| `shared-events.ts:195` payload `agent_end` | `sed -n 190,200p` | 195 = `type: "agent_end"` | **đứng vững** |
| omp **không** có `replaces` (grep 3 hit, nghĩa khác) | `git grep -nw replaces -- 'packages/coding-agent/src/extensibility/**'` | **4 hit**, đều nghĩa khác | **sai (nhỏ)** — xem §2.2 |
| omp có `CustomEntry` (38 hit) | `git grep -nw` | **16 dòng / 8 file**; không `-w` thì 136 | **sai** — xem §2.3 |
| `#renderEntry` ở transcript-container `:300,347,402,486` | `grep -n` | 4 dòng đó đều đúng (thêm 619,633,746,762,773,843) | **đứng vững** |
| omp: 7 seam symbol = 0 file | `git grep -lw` từng cái | 0 cả 7 | **đứng vững** |
| omp: `setModel` = **22 file** | `git grep -lw` (3 cách) | **53** (src 21 + test 34, cộng dồn có file chung) | **sai** — xem §2.4 |
| omp: `setActiveTools` = 22 file | `git grep -lw` | 22 | **đứng vững** |
| senpi: 40 thư mục con builtin | `ls -d */ \| wc -l` | 40 | **đứng vững** |
| senpi: `agent_settled` 60 / `registerEntryRenderer` 20 / `model_select` 49 / `session_abort` 17 / `setModel` 68 / `setActiveTools` 74 / `setSessionModel` 25 | `git grep -lw` | 60/20/49/17/68/74/25 — **khớp tuyệt đối** | **đứng vững** |
| senpi: `setSessionTitle` / `setSessionLabel` = 0 | `git grep -lw` | 0 / 0 | **đứng vững** — đề bài gối sai, tài liệu đính chính đúng |
| senpi: 6/5/16/4/2/9/2 builtin dùng từng seam | đếm theo thư mục con | 6/5/16/4/2/9/2 | **đứng vững** (xem ghi chú `service-tier.ts` ở §2.5) |
| **27/40 builtin chạm ≥1 seam** | cách A (`grep -rl` union) và cách B (union per-symbol) | **27 = 27** | **đứng vững** |
| 6 symbol "0 builtin dùng" | `git grep -lw` trong `builtin/` | cả 6 = 0 | **đứng vững** |
| `registerEntryRenderer` senpi `types.ts:2070` | `sed -n 2070p` | đúng | **đứng vững** |
| `EntryRenderer` `:1825`, `EntryRendererOptions` `:1831` | `sed -n` | đúng | **đứng vững** |
| `ModelSelectEvent` `:1358`, `ModelSelectEventResult` `:1369` | `sed -n` | đúng | **đứng vững** |
| senpi phát `agent_settled` ở `agent-session.ts:1952` | `sed -n 1948,1956p` | 1952 đúng, thứ tự cả ba khẳng định đúng | **đứng vững** |
| `prompt-preset/index.ts:107` là builtin **duy nhất** trả `systemPrompt` | quét từng handler `model_select` | prompt-preset đúng, **nhưng `openai-image-gen` cũng có handler `model_select`** | **sai** — xem §3.1 |
| Quét `before_agent_start` trả về **0** builtin nào trả `systemPrompt` | quét 7 builtin | **7 builtin trả `systemPrompt`** | **sai, nặng** — xem §3.2 |
| 17 builtin có chuỗi `systemPrompt` | đếm thư mục con | 17 | **đứng vững** |
| senpi test `agent-session-abort-event.test.ts:25` | `sed -n 23,27p` | dòng 25 = `it("emits session_abort when aborting during retry backoff…` | **đứng vững** |
| `ttsr/coordinator-races.test.ts:261` khẳng định `toBe(1)` | `sed -n 258,263p` | `expect(...session_abort).length).toBe(1)` | **đứng vững** |
| `packages/durable/` không có ở senpi | `ls -d` | không tồn tại | **đứng vững** |

---

## 2. Lỗi số liệu (4 lỗi, tất cả đều sửa được bằng cách đổi con số)

### 2.1 Khối `on(...)` trải `:1280-1314` → thực tế `:1280-1340`

Tài liệu dùng `types.ts:1280-1314` làm neo cho "khối khai báo" (bước 13) và mô tả đó là nhóm session/agent. Đo thật:

```
grep -n 'on(event: "' .../types.ts | head -1   → 1280
grep -n 'on(event: "' .../types.ts | tail -1   → 1340
```

Hai mốc `:1280` và `:1313`/`:1314` đều đúng — chỉ là **điểm cuối bị cắt sớm 26 dòng**. Nhóm session/agent đúng là nằm ở đầu khối, nên neo dùng để chèn (`:1313` cạnh `:1314`) vẫn đúng. **Không có gì hỏng**; nhưng một người đọc neo `1280-1314` rồi mở file sẽ tưởng khối kết thúc ở đó và tìm nhầm. Sửa thành `1280-1340`.

### 2.2 `replaces` trong `extensibility/`: 3 hit → **4 hit**

```
git grep -nw replaces -- 'packages/coding-agent/src/extensibility/**' | wc -l   → 4
```

Bốn hit: `types.ts:1540`, `types.ts:1602`, `manager.ts:340` (ba cái đã ghi) **và `types.ts:1678`** ("observer invoked when an already-loaded extension registers or **replaces** a tool"). Tài liệu gom 1540 và 1602 thành một mục "về provider" nên đếm 3. Cả 4 đều đúng là nghĩa khác — **kết luận "omp không có khái niệm `replaces`" vẫn đứng vững**, chỉ là con số sai. Không ảnh hưởng phương án nào ở S2.

### 2.3 `CustomEntry` "38 hit" → **16 dòng / 8 file**

```
git grep -nw CustomEntry -- '*.ts' | wc -l   → 16
git grep -lw CustomEntry -- '*.ts' | wc -l   → 8
git grep -n  CustomEntry -- '*.ts' | wc -l   → 136   (không -w, khớp `CustomEntryX`)
```

Không cách nào ra 38. 38 có lẽ đếm ở phạm vi hẹp hơn (ví dụ chỉ `src/extensibility/`) — nhưng tài liệu không ghi phạm vi, nên con số không tái lập được. **Không ảnh hưởng kết luận**: `CustomEntry` có tồn tại ở omp là đủ để luận điểm "entry vs message là khác biệt thật", và đó là điều tài liệu thực sự dùng.

### 2.4 `setModel` ở omp = "22 file" → thực tế **53 file**; và `:1163` bị diễn giải sai

Đây là lỗi số liệu nghiêm trọng nhất về mặt thống kê, dù không phá kết luận:

```
git grep -lw setModel -- '*.ts' | wc -l                → 53
grep -rlw --include='*.ts' setModel packages | wc -l    → 53   (cách 2, độc lập)
git grep -lw setModel -- 'packages/*/src/**' | wc -l   → 21   (chỉ src)
git grep -lw setModel -- 'packages/*/test/**' | wc -l  → 34   (chỉ test)
```

Tài liệu ghi 22 cho cả `setModel` và `setActiveTools`. `setActiveTools` = 22 là **đúng**. Có lẽ số 22 của `setModel` bị **chép nhầm từ dòng trên** — và 21 (src-only) rất gần 22, nên nhiều khả năng đếm trên `src/` rồi làm tròn. Kết luận "KHÔNG thiếu, đã có sẵn" **vẫn đúng và còn mạnh hơn** (53 file chứng minh phổ biến hơn nhiều so với 22). Nhưng ai đó dùng cột "22 file" để so sánh với senpi 68 sẽ bị sai tỉ lệ.

**Diễn giải sai đi kèm:** tài liệu viết `emit` tổng quát chạy qua `ext.handlers.get(eventType)` ở `:1163` và `:1476`. Đúng về dòng, nhưng:

- `:1163` nằm trong `hasHandlers(eventType: string): boolean` — đó là **hàm kiểm tra có handler không**, không phải đường phát.
- Đường phát thật là `emit()` ở `:1464`, và `:1476` là chỗ tra cứu handler **bên trong** nó.
- `RunnerEmitEvent` (`:347`) là `Exclude<ExtensionEvent, …>` — thêm event mới **vẫn phải** được thêm vào union `ExtensionEvent` ở `types.ts` để không bị exclude, tức "không cần sửa bảng dispatch" đúng, nhưng "chỉ cần một chỗ gọi" thì thiếu một bước. Rủi ro thấp (thêm union là việc cùng file), nhưng bước 3/4 ghi "chỉ cần một chỗ gọi" là chưa đủ.

### 2.5 Ghi chú nhỏ về `service-tier.ts`

Cột "builtin senpi dùng" đếm theo thư mục con, nhưng `service-tier.ts` là **một file phẳng**, không phải thư mục. Nó xuất hiện trong `model_select` (16) và `setSessionModel` (2). Con số vẫn đúng như đếm; chỉ cần biết để không ngạc nhiên khi thấy tên có `.ts`.

---

## 3. Lỗi trong lập luận dẫn tới khuyến nghị — đây mới là chỗ đáng sửa

### 3.1 "Đúng MỘT builtin trả `systemPrompt`" — số đúng, **tiêu chuẩn loại sai**

Tài liệu quét từng builtin có `on("model_select"` và kết luận chỉ `prompt-preset/index.ts:107` trả `systemPrompt`. Tôi làm lại bằng cách duyệt riêng từng handler:

```
for f in $(grep -rl 'pi\.on("model_select"' --include='*.ts' builtin/); do
  awk '/pi\.on\("model_select"/,/^\t\}\);/' $f | grep -q 'systemPrompt:' && echo "$f"; done
→ prompt-preset/index.ts
```

Kết quả **giống hệt**: đúng một builtin trả `systemPrompt` *từ `model_select`*. Nhưng `openai-image-gen` **có** handler `model_select` (`pi.on("model_select", …)`) — nó chỉ không trả `systemPrompt` từ đó, mà trả từ `before_agent_start`. Phát biểu "đúng một builtin" là **đúng** nếu hiểu là "một builtin *cần quyền này qua model_select*", và đó chính là điều tài liệu dùng để lập luận. **Không bác bỏ được**; ghi ra đây để người đọc không tưởng tôi tìm ra mâu thuẫn.

### 3.2 "Quét riêng `before_agent_start` trả về **0** builtin nào trả `systemPrompt`" — **SAI, và đây là lỗi nặng nhất**

Đây là lỗi duy nhất đáng gọi là sai thật. Tôi quét ngược lại — các builtin có `before_agent_start` **và** trả `systemPrompt`:

```
for f in $(grep -rl 'before_agent_start' --include='*.ts' builtin/); do
  awk '/"before_agent_start"/,/^\t\}\)/' $f | grep -q 'systemPrompt:' && echo "$f"; done
```

**Bảy builtin trả `systemPrompt` từ `before_agent_start`:**

| builtin | dòng |
|---|---|
| `anthropic-web-search` | — |
| `openai-web-search` | — |
| `terminal/extension.ts` | — |
| `bash-timeout` | `index.ts:53` |
| `openai-image-gen` | `index.ts:101` |
| `anthropic-bash` | — |
| `imagegen` | `index.ts:65` |

Tài liệu khẳng định con số **0**. Điều này làm **sụt** luận điểm mà chính tài liệu dùng để bác phương án (iii):

> "Nếu P3 chọn (iii) chép nguyên `string | null` thì omp sẽ có HAI ngữ nghĩa cùng tồn tại."

Luận điểm đó **vẫn đúng** — nhưng lý do đúng không phải "chưa ai dùng `before_agent_start` để thay prompt", mà là **"7 builtin đã dùng nó"**. Đây là lập luận **mạnh hơn nhiều**: 7/40 builtin đã phụ thuộc ngữ nghĩa chính sách `string[]` ở `before_agent_start`, nên thêm `string | null` ở `model_select` sẽ phá vỡ hành vi **đang chạy**, chứ không chỉ tạo ra hai cách diễn giải lý thuyết. Nên sửa câu này theo hướng **củng cố** khuyến nghị (ii), không phải theo hướng làm yếu.

Cũng lưu ý: ô "17 builtin có chuỗi `systemPrompt`" là **đúng** (tôi đếm ra đúng 17), và danh sách 7 ở trên nằm trong 17 đó. Nên phần "phần lớn là *cục bộ* … chúng không đi qua kết quả của `model_select`" là đúng; chỉ có vế "0 builtin nào trả `systemPrompt` từ `before_agent_start`" là sai.

---

## 4. Cổng: có cổng nào là cổng chết không?

Không. Tôi thử phá từng cổng bằng câu hỏi "lệnh này có phân biệt được «đã làm» với «không chạy được» không?" — và tôi đã **chạy thử** G1 trên cây thật:

```
git grep -lw agent_settled -- '*.ts' | wc -l   → 0    (đúng: chưa ai làm)
```

Lệnh chạy được, trả 0, và sẽ trả ≥1 khi có ai thêm khai báo. **G1 sống.** Điểm mạnh thật của thiết kế cổng nằm ở chỗ tài liệu tự nói: G1 chỉ chứng minh *có dòng khai báo*, G2 mới chứng minh *event thật sự phát ra* — và G2 chạy test contract nên phân biệt được. Tôi xác nhận G2 là cổng thật.

Hai cổng có giá trị thực tế tôi muốn ghi nhận thêm:
- **G0** dùng `git add -A && git diff --cached --stat` — đúng, vì `git diff --stat` không thấy file mới. Tôi xác nhận `packages/coding-agent/test/` tồn tại, nên đường dẫn cổng chạy được.
- **G5** dùng `bun check` và ghi rõ `tsc` là sai quy trình — đúng AGENTS.md.

Một điểm yếu nhỏ: **G1 lặp cho `setSessionModel` sẽ vô nghĩa** nếu P3/P2 chốt theo hướng không mở setter đó. Tài liệu có ghi "≥1 cho **mỗi** seam đã quyết mở" — đã tự bảo vệ, nhưng dễ đọc nhầm. Nên ghi rõ danh sách seam nào *phải* có và danh sách nào *tùy quyết định cổng*.

---

## 5. AGENTS.md — work item này có tạo ra code vi phạm không?

Quét 6 lớp vi phạm trong chính tài liệu:

| quy tắc | tình trạng |
|---|---|
| hard-code model id trong TS | **không** — tài liệu không đề xuất viết id model nào vào code |
| prompt trong TS | **không** — S3/S4 chỉ khai báo *kiểu* `systemPrompt`, không dựng chuỗi prompt; và tài liệu nói rõ `string[]` là chính sách |
| `any` | **không** — không đề xuất `any` |
| `ReturnType<>` | **không** — không xuất hiện |
| inline import (`await import`) | **không** — không đề xuất import động |
| `mock.module()` | **không** — tài liệu **cấm** nó rõ ràng (dòng 24) |
| `tsc` | **không** — dùng `bun check`, cấm `tsc` rõ ràng (dòng 188, 201) |

**Không có vi phạm nào.** Điểm cần lưu ý về JSONL: đề bài gốc cảnh báo mọi thứ đọc session phải qua `parseJsonlLenient`. Work item này **không đọc session JSONL** (chỉ thêm event + setter), nên cổng đó không áp dụng ở đây — nhưng nếu test contract của S1/S4 viết bằng harness có nối file session thì phải nhớ. Không tính là lỗi của tài liệu, chỉ là ranh giới cần nối với work item sau.

Một vi phạm **tiềm ẩn** đáng ghi: nếu P2 chọn phương án (b), bước 9 sẽ thêm `EntryRenderer<T>` — một generic type có thể dễ dẫn tới `any` khi cài handler. Chưa vi phạm (chưa có code), nhưng nên ghi vào checklist review.

---

## 6. Ước lượng effort — có cơ sở đếm không?

**Có**, và đây là điểm tài liệu làm tốt. Cơ sở đếm thật:

- Bốn file lõi có sẵn kích thước đo được: `types.ts` 1849, `runner.ts` 1963, `loader.ts` 677, `hooks/loader.ts` 243, `hooks/types.ts` 600.
- Khối `on(...)` **một dòng mỗi event** — thêm 1 event S1 và 1 event S4 = 2 dòng khai báo, đây là phần rẻ nhất và con số 0,5 ngày là hợp lý.
- S3 chỉ còn **thêm event** vì `setModel`/`setActiveTools` đã có (đã kiểm chứng ở `:1501`, `:1507`, `:1756`, `:1758`).
- Điểm phát `agent_end` **không nằm trong `runner.ts`** mà ở `agent-session.ts:4540` (`#emitAgentEndNotification` gọi `this.#extensionRunner?.emit({ type: "agent_end", … })`) — tức S1 còn phải đụng thêm **một file ngoài danh sách "File cần chạm tới"** mà bảng ở dòng 16-24 **không liệt kê**. Đây là thiếu sót thật trong bảng file, và nó cũng làm G6 ("file ngoài danh sách") sẽ bắt nhầm chính người làm đúng việc.

**Ước lượng ~5 ngày: chấp nhận được**, có cơ sở. Nhưng tôi **không đồng ý** với cách nó được trình bày: con số 5 ngày là **giả định hai cổng trả lời thuận lợi**, và tài liệu nói thẳng điều đó — đó là dạng trung thực. Nhưng nó **chưa cộng** hai khoản em lệch:
1. Thêm `agent-session.ts` vào phạm vi (một file 5.600+ dòng, có cơ chế trì hoãn sẵn — chạm vào đây không rẻ như `types.ts`).
2. 7 builtin đã trả `systemPrompt` từ `before_agent_start` nghĩa là nếu P3 chọn (ii), **hợp đồng phải giữ nguyên hành vi của cả 7**, và test chống trùng (G3/bước 8) phải bao phủ chúng chứ không chỉ một extension giả lập.

Ước lượng thực dục: **5-7 ngày**, không phải 5. Vẫn rẻ hơn nhiều so với 10-12 như tài liệu cảnh báo, nên khuyến nghị tổng thể vẫn đúng.

---

## 7. Phán quyết

| phần | phán quyết |
|---|---|
| Bốn neo chèn chính (`:1313`, `:1314`, `:269`, `:114`, `:557`) | **đứng vững tuyệt đối** — dùng được ngay |
| Bảng "thiếu thật" (omp 0 / senpi 60-20-49-17-68-74-25) | **đứng vững tuyệt đối** — khớp từng số |
| 27/40 | **đứng vững** — hai cách độc lập cùng ra 27 |
| Đính chính `setSessionTitle`/`setSessionLabel` = 0 | **đứng vững** — đề bài gối sai, tài liệu đúng |
| Thứ tự S1 → S2 → S3 → S4 | **chấp nhận** — hợp lý |
| "setModel/setActiveTools đã có" | **đứng vững, mạnh hơn ghi** (53 file chứ không 22) |
| Đề xuất S2 = phương án (b) | **chưa bác bỏ được** — luận điểm `replaces` vẫn đúng dù con số hit sai |
| Khuyến nghị S3 = (ii) | **đứng vững và nên mạnh hơn** — 7 builtin đã dùng `before_agent_start` |
| S1 mở mỏng, không chép cơ chế trì hoãn | **đứng vững** — đây là phần tốt nhất của tài liệu |
| Cổng G0-G6 | **đứng vững**, không có cổng chết; G1 đã chạy thử |
| AGENTS.md | **không vi phạm** |

**Nên làm gì:** giữ work item, sửa 4 dòng. Cụ thể:
1. Đổi `1280-1314` → `1280-1340` (2 chỗ).
2. Đổi `3 hit` → `4 hit` cho `replaces`.
3. Bỏ "38 hit" của `CustomEntry`, thay bằng "8 file / 16 dòng".
4. Đổi `setModel` 22 file → 53 file (và 21 ở `src/` nếu muốn nói phạm vi hẹp).
5. **Quan trọng nhất:** sửa câu "quét `before_agent_start` trả về 0 builtin nào trả `systemPrompt`" → **7 builtin**, kèm danh sách. Câu này hiện đang *làm yếu* chính khuyến nghị mạnh nhất của tài liệu.
6. Thêm `packages/coding-agent/src/session/agent-session.ts` vào bảng "File cần chạm tới" (điểm phát `agent_end` ở `:4540`), nếu không thì G6 sẽ báo nhầm.

**Chưa bác bỏ được:** phương án (b) của S2 và khuyến nghị (ii) của S3 — cả hai đều là **quyết định chính sách cần người quyết**, không phải khẳng định kiểm chứng được. Tôi không tìm ra bằng chứng trái chiều, nên ghi rõ là chưa bác bỏ được chứ không phải đồng ý.

