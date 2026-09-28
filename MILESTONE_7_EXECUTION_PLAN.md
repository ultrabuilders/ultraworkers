# KẾ HOẠCH THỰC THIỆN — MILESTONE 7: CÁI RIÊNG CỦA SENPI

**Đo ngày 2026-09-28.** Senpi HEAD `ea92162` · pi HEAD `d6af72e` · omp HEAD xem `git log -1`.

Milestone này được **tách ra khỏi M5** vì M5 là kế hoạch đổi tên `omp` → `ultraworkers`, còn
đây là kế hoạch lấy tính năng. Trộn chúng sẽ làm nghẽn cả hai: M5 có 12 work item với cổng
đỏ-xanh chi tiết, và phần lấy tính năng còn câu hỏi mở chưa có người quyết.

Toàn bộ số liệu và lập luận nền nằm ở `SENPI_FINDINGS.md` (6.709 dòng, 11 phần). Tài liệu này
**không lặp lại** phép đo đó — nó chỉ chứa phần đã biến thành việc làm.

---

## Mục tiêu

Người dùng cuối của omp sẽ thấy:

- **Cache của session không hết hạn vào đúng lúc nó đáng hết nhất.** Hiện omp đánh dấu
  `cache_control` rất tốt nhưng không có gì giữ cache sống khi session đang rỗng; mỗi lần quay
  lại sau một khoảng nghỉ là một lần trả tiền đầy đủ cho prefix đã dựng.
- **Bề mặt extension đủ rộng để viết loại extension mà senpi viết.** Đây là thứ người viết
  extension nhìn thấy, không phải người dùng cuối — nhưng nó là tiền đề cho mọi mục còn lại.
- **Vài lệnh nhỏ lấy từ senpi chạy được ngay** mà không cần bất kỳ hạ tầng mới nào.

Và điều quan trọng nhất, vì nó quyết định phạm vi:

- **Rất nhiều thứ người ta tưởng phải port, đã có sẵn trong omp dưới tên khác.** M7 được viết
  sau khi đo lại, và phép đo lại làm **giảm** phạm vi ở mọi work item, không work item nào to
  lên. Tài liệu này ghi lại cả những phép đo đã bác bỏ đề xuất, vì chúng là lý do phạm vi nhỏ.

## Vì sao tách khỏi M5

| | M5 | M7 |
|---|---|---|
| việc | đổi tên sản phẩm | lấy và mở rộng tính năng |
| người quyết | `APP_NAME` và `CONFIG_DIR_NAME` | cổng API và chi phí mặc định |
| rủi ro nếu sai | hỏng tên wire / mất dữ liệu cấu hình | thêm bề mặt API mà không ai dùng |
| vì sao không gộp | M5 đã có 12 work item; thêm 5 cái nữa làm mất khả năng đọc | |

## Thành thật về những gì ta KHÔNG lấy

Đây là phần quan trọng nhất của tài liệu, và nó dài vì con số đã bị đính chính nhiều lần.

| lần | con số | vì sao đổi |
|---|---|---|
| nghiên cứu vòng 1 | 40 builtin, port cả | mới đếm tên thư mục |
| vòng 2 | 25 đã có · 6 sai hướng · 9 thiếu | mở file omp thay vì grep |
| vòng 3 | **8** thiếu | `git grep -E '\bbtw\b'` trả 0 trên macOS; `btw` omp đã có 1.694 dòng |
| vòng 4 | **4 hạng mục, ~1.325 dòng** | `cursor.ts` đã xử dangling call; `model-resolver.ts` đã có `splitThinkingSuffix` |
| vòng đặc tả M7 | **3 work item còn sống, ~6 ngày** | `look-at` đảo ngược phạm vi; `tool-pair-guard` bị rút |

**Con số còn lại:** 3 work item còn sống (seam, warm cache, nhóm seam-free), cộng một work item
điều kiện tiên quyết về pháp lý, cộng một work item đã bị đính chính phạm vi (`look_at`).
Tổng ~6-8 engineer-day, không phải con số của "port 40 builtin".

**Ba builtin của senpi bắt nguồn từ chính omp.** `ttsr` và `todotools` được senpi ghi trong
`NOTICE.md` của họ là *"ported and adapted from oh-my-pi"*. Cả 7 file nguồn đều có trong omp
(tổng 3.051 dòng). Port ngược lại là đi vòng.

## Không làm gì

- **Không port `tool-pair-guard`.** Cổng của chính work item đó **đỏ** khi đo: `repairOrphanOutputs`
  đã là `true` trên cả hai entrypoint (`azure:384`, `openai-responses:1218`), và Anthropic lẫn
  chat-completions đều đã phủ ở `transform-messages.ts`. Theo luật của kế hoạch này, cổng đỏ
  nghĩa là **work item không tồn tại**. Chi tiết: mục `tool-pair-guard` ở Phụ lục.
- **Không mở 10 API method mà 0 builtin nào dùng** — `executeTool`, `registerFilesystemPolicy`,
  `registerMarkdownTransformer`, `registerMcpServer`, `registerReadClassifier`,
  `registerRemovedToolHint`, và 4 method `ctx.ui`. Mở chúng chỉ làm rối `types.ts` mà không
  nhận về gì. (Đo giới hạn ở `*.ts`: `changes.md` của fork có nhắc tên trong văn xuôi, đếm
  nhầm sẽ ra 2 — xem Phụ lục.)
- **Không sửa `directory-resolution.ts` ở sóng nào.** Đề xuất "ném builtin vào dòng 69" đã bị
  bác bỏ: dòng đó có thật nhưng **không quét cây omp** — nó chỉ chạy từ
  `resolveExtensionDirectory`, có đúng hai caller, và lời gọi duy nhất trong `loader.ts` nằm
  ở dòng 653 bên trong nhánh *"Explicitly configured paths"*. Sửa nó là đổi **hành vi khám phá
  extension toàn cục** của omp, không phải thêm một builtin.
- **Không chép tầng session của `pi` hay `senpi`.** Cả hai đều hard-fail khi JSONL hỏng; omp
  đang tự lành. Xem `MILESTONE_1B_EXECUTION_PLAN.md` mục 5.
- **Không lấy `mcp`, `compaction`, `webfetch`, `ask-user`, `todotools`** — omp đã mạnh hơn.
- **Không lấy `prompt-preset` và `gpt-apply-patch`.** Chúng dò model id trong TypeScript, đúng
  thứ `AGENTS.md` cấm. `packages/catalog` + KDL đã làm việc đó đúng cách.

## Điều kiện tiên quyết

1. **W0 (pháp lý) đóng trước mọi thứ.** Cổng của W0 là tiền điều kiện của cổng các work item
   khác. W0 có một phần phát hiện lại: `NOTICE.md` của omp **không tồn tại**, nên chưa có chỗ
   ghi attribution cho bất kỳ đóng góp nào.
2. **Hai cổng API phải có câu trả lời bằng văn bẳn trước khi viết dòng seam nào** — xem bảng
   quyết định.
3. **Không có cổng nào được chấp nhận nếu nó xanh khi KHÔNG NHÌN THẤY GÌ.** Đây là quy tắc đã
   bị vi phạm trong chính bản thảo của tài liệu này: một cổng dùng `git grep` không có
   `-- <path>` sẽ khớp **chính file kế hoạch đang viết**. Mọi cổng dùng git phải giới hạn
   phạm vi.
4. **Mọi thứ đọc session phải đi qua `parseJsonlLenient`** (`packages/utils/src/stream.ts:575`),
   không dùng `JSON.parse` trực tiếp. Đây là cổng dễ sai nhất của milestone.

## Thứ tự thực hiện

| sóng | work item | chặn gì | công |
|---|---|---|---|
| 0 | **W0** pháp lý + ghim nguồn | tất cả | ~1 ngày |
| 0 | **SEAM** — bốn seam API | mọi builtin cần event | ~5 ngày (thêm 1-2 nếu cổng P3 trả "hạn chế") |
| 1 | **WARM** — làm ấm prompt cache | không | ~2 ngày |
| 1 | **SEAMFREE** — nhóm builtin chạy được ngay | không, nhưng nên sau W0 | ~1-2 ngày |
| 2 | **LOOKAT** — đo lại rồi mới quyết dựng tool hay không | cổng P-L1-2 | ~0,5 ngày nếu chỉ vá |

S1 và S4 trong SEAM không chặn gì nên làm được ngay. S2 và S3 có cổng, nên thứ tự thực thi là
S1 → (chờ cổng) S2 → (chờ cổng) S3 → S4.

## Bảng quyết định cần người quyết

| # | câu hỏi | vì sao chặn | hệ quả nếu chọn sai |
|---|---|---|---|
| P3 | `model_select` có được cho extension **thay system prompt** không? | chặn S3 | senpi cho (`systemPrompt?: string \| null`). Nếu ta cũng cho, extension bất kỳ có thể thay toàn bộ prompt của omp — quyền rất lớn. Nếu ta hạn chế, phải viết thêm đường thay thế (chỉ chọn prompt đã đăng ký sẵn) — cộng 1-2 ngày. |
| P2 | Entry hay Message? Ba cách: ép entry qua `registerMessageRenderer` / thêm `registerEntryRenderer` / bỏ khái niệm entry | chặn S2 | đặt tiền lệ cho **mọi** extension sau này. Chọn sai thì phải phá hợp đồng đã có. |
| P0 | `/help` của extension lấy lệnh từ đâu? | **đã đổi** — xem bên dưới | nghiên cứu trước coi đây là quyết định sản phẩm chặn cả work item. Đo lại cho thấy omp **đã có** `getCommands()` trả lệnh extension với `source: "extension"`, và builtin bị **cố ý** loại khỏi đó. Vậy câu hỏi thật là **trộn hai registry**: `getSessionSlashCommands()` + `BUILTIN_SLASH_COMMAND_DEFS` (`builtin-registry.ts:60`). |
| PC | Chi phí mặc định của warm cache là bao nhiêu? | chặn WARM | senpi có `maxCostUsdPerSession` nhưng để 0 (tắt). Không có mặc định thì ta đang **thiết kế sản phẩm**, không phải port. |
| P-L1-2 | `look_at`: dựng tool mới, hay chỉ vá cái đã có? | chặn LOOKAT | xem work item. |

## Quy ước khi đọc

- **Neo `path:line` là bắt buộc và phải chạy lại được.** Một neo sai làm cả bước triển khai vô
  dụng. Cột `đã kiểm chứng?` trong bảng file cho biết neo nào đã đo và neo nào chỉ là hướng dẫn.
- **Đo lại bằng hai phép trước khi tin một con số.** Cả ba vòng nghiên cứu trước sai vì phép đo
  hỏng trả về 0 rồi đọc thành phát hiện.
- **Đừng dùng `git grep -E '\btên\b'`** — trên macOS `\b` là backspace, lệnh luôn trả 0. Dùng
  `git grep -w`.
- **Đếm file nào dùng symbol thì phải chỉ định đuôi `*.ts`**, nếu không `changes.md` của fork sẽ
  khớp và bạn sẽ tưởng có bằng chứng ngược lại.
- **Test không source-grep, không `mock.module()`, không `tsc`** — `AGENTS.md`. Mọi test phải bảo
  vệ một hợp đồng quan sát được, và có cả hợp đồng phủ định.

---

## Sóng 0a — W0: pháp lý và ghim nguồn (điều kiện tiên quyết)

**Sóng / phạm vi:** W0. Đây **không phải một hạng mục port** — không dòng code nào của omp được
đổi. W0 là **điều kiện tiên quyết**: mọi hạng mục port trong M7 đều bị chặn cho tới khi W0 đóng,
vì cổng của W0 là **tiền điều kiện của cổng của chúng**. W0 đứng ở sóng 0, trước Sóng 1.

Phạm vi gồm bốn việc, độc lập nhau, không cái nào chặn cái nào:
**(a)** chốt lại ba nghĩa vụ pháp lý khi lấy code từ senpi;
**(b)** quyết định *mảnh* nào của omp ghi attribution — và đo lại kết luận của nghiên cứu trước,
vì kết luận đó sai ở chỗ quan trọng nhất;
**(c)** ghim nguồn theo commit SHA theo đúng tiền lệ đã có sẵn trong repo;
**(d)** trả lời chiều attribution ngược cho `ttsr` và `todotools`.

> **Không phải việc port nên W0 không nằm trong bảng "23 chung · 21 chỉ-senpi · 18 chỉ-omp"**
> của nghiên cứu cũ, và cũng không cộng vào effort port. Nó là chi phí cố định của milestone.

**Hiệu ứng người dùng thấy:** Không có hiệu ứng trực tiếp lúc chạy. Hiệu ứng thật nằm ở chỗ
**người cài omp từ npm phải nhận được attribution đúng trong payload pháp lý đi kèm package**,
và ở chỗ omp không bao giờ trở thành bên nhận nợ của chính code do mình sinh ra. Cụ thể: sau W0,
mọi đóng góp lấy từ senpi đều mang tên nguồn + commit SHA tới tận file mà người dùng tải về,
và `npm install omp` không đọc được attribution của riêng package nào.

**Effort:** ~1 engineer-day. Tách nhỏ: viết `NOTICE` cạnh code ~0.25 ngày · nhân bản vào
aggregate ~0.25 ngày · **test đồng bộ ~0.5 ngày**. Ngân sách dồn về test là có chủ ý: theo
đúng bài học từ Sóng 1 của M3 (fixture loader A5 tốn nửa ngày vì sinh ra dữ liệu thật), phần
khó ở đây không phải viết văn bản pháp lý mà là làm cho hai bản sao không lệch nhau — và phần
lệch đó không tự biểu hiện, nó chỉ im lặng.

---

## A. Đo lại bốn điều kiện tiên quyết

Bốn mục dưới đây là **kết quả chạy lệnh**, không phải trích lại tài liệu nghiên cứu cũ. Ở mục
B3 nghiên cứu cũ sai, và đó là phần quan trọng nhất của work item này.

### B1. senpi có phải MIT thuần không? — CÓ, và thuần đến từng dòng

`senpi-ref/LICENSE` dài **22 dòng**. Ba dòng đầu là `MIT License` + hai dòng copyright
(`LICENSE:3` Mario Zechner / `LICENSE:4` Yeongyu Kim và senpi contributors). Từ `LICENSE:7`
đến `LICENSE:22` là **văn bản MIT chuẩn nguyên văn, không thêm điều khoản nào** — không có
ràng buộc bổ sung, không có điều khoản phi thương mại, không có điều khoản đòi phê duyệt.

**Ba nghĩa vụ cụ thể** (không phải "ba nghĩa vụ" chung chung):

1. **Giữ nguyên dòng copyright.** MIT đòi "The above copyright notice and this permission
   notice shall be included in all copies or substantial portions" (`LICENSE:14-15`).
   Với code lấy từ senpi, dòng cần giữ là `Copyright (c) 2026 Yeongyu Kim and senpi
   contributors` (`LICENSE:4`).
2. **Ghi attribution cho phần vay mượn** — xem B3 để biết ghi **vào đâu** (nghiên cứu cũ trả lời
   sai chỗ này).
3. **Không lấy thương hiệu.** Đây là nghĩa vụ **tự thêm**, không phải nghĩa vụ MIT. Nguồn:
   `senpi-ref/CONTRIBUTING.md:139-147`.

### B2. Có ràng buộc ẩn nào trong `NOTICE.md` / `CONTRIBUTING.md` / `SECURITY.md` không? — KHÔNG

Đo bằng `grep -niE` trên cả ba file, không đọc hết:

| file | dòng | kết quả |
| --- | --- | --- |
| `NOTICE.md` | 67 | 4 khoản, **tất cả permissive**. LinkeDOM 0.18.12 (**ISC** — nghĩa vụ duy nhất có hành vi thật trong toàn bộ senpi: phải giữ copyright + permission notice), system prompt cảm hứng từ Gajae-Code (MIT), extension TTSR port từ oh-my-pi (MIT), tool todo + `/todo` port từ oh-my-pi (MIT). |
| `CONTRIBUTING.md` | 162 | **Một** dòng khớp `licen`, và nó không liên quan: `CONTRIBUTING.md:143` nói phải gọi "Anthropic" theo referentially và tuân thủ điều khoản pháp lý của Anthropic. **Không có CLA. Không có DCO.** |
| `SECURITY.md` | 87 | **Không có** dòng khớp `licen`/`attribut`/`notice`/`third-party`/`disclos`. Đây thuần là chính sách công bố lỗ hổng. |

Nói cách khác: **ba nghĩa vụ ở B1 là toàn bộ nghĩa vụ.** Không có điều khoản bổ sung nào ẩn.

### B3. ĐÍNH CHÍNH — omp không có `NOTICE.md`, nhưng kết luận "nên tạo `NOTICE.md`" là SAI

Đây là phần quan trọng nhất của work item, và nó đảo ngược một chỉ dẫn cụ thể của nghiên cứu cũ.

**Mệnh đề của nghiên cứu cũ:** *"ghi attribution vào `NOTICE.md` của omp — omp hiện chưa có file
này"*. **Nửa đầu đúng, nửa sau dẫn tới hành động sai.**

`ls $OMP/NOTICE.md` → không tồn tại. Đã kiểm chứng. **NHƯNG** omp không thiếu cơ chế
attribution — omp đã có, đã dùng, đã ghim SHA, và **đã chứng minh nó tới tận người dùng npm**.
Cơ chế đó không tên là `NOTICE.md`:

**(i) Quy ước: `NOTICE` cạnh code.** Mỗi thành phần vay mượn trong omp có một file pháp lý
**nằm ngay cạnh thư mục code của nó**, không tập trung ở root:

| file pháp lý cạnh code | thành phần |
| --- | --- |
| `crates/vendor/brush-core/LICENSE` | brush shell, patch `[patch.crates-io]` |
| `crates/pi-builtins/LICENSE` | pi-builtins vendored |
| `crates/pi-shell/NOTICE` | thuật toán từ RTK |
| `crates/pi-natives/data/LICENSE.ctok` | ctok tokenizer data |
| `crates/pi-natives/src/fonts/Silver.LICENSE` | font Silver |
| `packages/coding-agent/src/markit/NOTICE` | markit-ai |
| `packages/coding-agent/src/export/html/vendor/NOTICE` | thư viện vendor của export html |

**(ii) Tiền lệ ghim SHA — `crates/pi-shell/NOTICE` là khuôn mẫu.** Nó ghi tên thuật toán đã
mượn, **SHA commit nguồn** `878af7de99e0ba71da2e8fd996f6b52a1836e06c`, tên file nguồn, tên file
đích, và **nêu rõ nó giữ gì / bỏ gì**. Đây đúng là hình thức M7 cần cho senpi.

**(iii) Aggregate `THIRD-PARTY-NOTICES.txt` (22.901 dòng) nhân bản từng file trên.** Mục
`TRACKED VENDORED CODE AND ASSET NOTICES` (`:18`) liệt kê từng file pháp lý cạnh code, mỗi mục
mở đầu bằng đường kẻ `--` rồi **đường dẫn file nguồn** — ví dụ `:249-250` rồi nội dung
`crates/pi-shell/NOTICE`, trong đó SHA xuất hiện ở `:260`. Đã kiểm chứng bằng `git grep -w`
rằng nội dung `markit/NOTICE` và `pi-shell/NOTICE` **thật sự nằm trong aggregate**, không phải
trích dẫn chéo.

**(iv) Aggregate này được BÁN RA — và đây là lý do quyết định.** Không phải file lưu trữ:

- `scripts/ci-release-publish.ts:93-94` đặt hằng `MIT_LICENSE` và `THIRD_PARTY_NOTICES`.
- `legalPayloadFiles()` (`:97`) trả về `["LICENSE", "THIRD-PARTY-NOTICES.txt"]` cho package MIT
  (`:100`).
- `stageLegalPayloads()` (`:111`) **chép đúng hai file đó vào mọi package publishable**.

Nghĩa là: attribution đặt trong `THIRD-PARTY-NOTICES.txt` **đi tới người dùng qua từng package
trên npm**. Attribution đặt trong một file `NOTICE.md` mới ở root thì **không** — không có
script nào chép nó, không có checksum nào băm nó, không có ai đọc nó.

Ngoài ra nó còn đi vào: artifact GitHub Release (`.github/workflows/ci.yml:1178` và `:1188`),
`SHA256SUMS.txt` (`ci.yml:1174-1177`), image Docker (`Dockerfile:167` → `/usr/share/doc/omp/`),
gói nix (`nix/package.nix:210` → `$out/share/doc/omp/`), và `README.md:686` trỏ người đọc tới.

> **Kết luận hành động: KHÔNG tạo `NOTICE.md` ở root.** Làm vậy là tạo ra một bề mặt pháp lý
> thứ hai, không được ship, không ai đọc, và tách attribution ra khỏi payload đang được
> kiểm chứng. Làm theo tiền lệ: `NOTICE` cạnh code + nhân bản vào aggregate.

**Cạm bẫy cần ghi rõ:** aggregate tự mô tả mình là *"This generated… aggregate"*
(`THIRD-PARTY-NOTICES.txt:3`) nhưng **không có generator nào trong repo** — `scripts/` không
có script nào sinh ra nó, `package.json` không có npm script nào nhắc tới, `ci.yml` chỉ dùng nó
làm path filter và artifact. Nó được **duy trì bằng tay**. Hệ quả trực tiếp: **không có gì tự
bắt lệch**, nên M7 sửa cả hai bản và phải tự thêm test đồng bộ (xem "Hợp đồng test"). Nói thẳng
"generated" trong khi không có generator là một dối trá; đừng tin vào từ đó.

### B4. Chiều attribution ngược: `ttsr` và `todotools` — omp KHÔNG nợ gì

Câu hỏi: nếu M7 chạm vào `ttsr`/`todotools` của senpi (dù chỉ để loại bỏ), `NOTICE.md` của ta
có phải giữ dòng *"ported from oh-my-pi"* không?

**Trả lời: KHÔNG. Và giữ dòng đó sẽ SAI SỰ THẬT.**

Lập luận, ba bước, mỗi bước đều đo được:

1. **Hướng dòng đi là omp → senpi, không phải ngược lại.** `senpi-ref/NOTICE.md:37-51` và
   `:53-67` nói nguyên văn TTSR và todo *"ported and adapted from oh-my-pi's"*, rồi liệt kê
   **7 file của omp**. `NOTICE.md:45` trỏ tới `https://github.com/can1357/oh-my-pi` — đúng
   upstream của repo này.
2. **Cả 7 file đó đều tồn tại trong omp, và là của omp.** Kiểm bằng `git ls-files` từng
   path: `packages/coding-agent/src/export/ttsr.ts`, `src/session/ttsr-coordinator.ts`,
   `src/capability/rule.ts`, `src/prompts/system/ttsr-interrupt.md`, `src/tools/todo.ts`,
   `src/prompts/tools/todo.md`, `src/modes/controllers/todo-command-controller.ts` — **7/7
   EXISTS**. omp là bên **sáng tạo**, không phải bên nhận.
3. **Quyền đã nằm sẵn trong giấy phép của chính omp.** `LICENSE:3-5` đã ghi
   `Copyright (c) 2025 Mario Zechner` / `2025-2026 Can Bölük` / `2026 Stencil Labs, Inc.` —
   ba bên mà `senpi-ref/NOTICE.md:48-50` và `:64-66` credit cho code đó.

**Suy ra cụ thể, theo file:**

| tình huống | file của ta phải ghi gì |
| --- | --- |
| M7 **không** chạm `ttsr*` / `todo*` của omp | **Không ghi gì cả.** Không có file nào của ta thay đổi. |
| M7 **sửa** một file gốc của omp (`ttsr.ts`, `todo.ts`, …) | **Không ghi gì.** Đây là sửa code của chính mình, phủ bởi `LICENSE:3-5`. Không có bên thứ ba nào trong vòng. |
| M7 **xoá** một file gốc của omp | **Không ghi gì.** Xoá không tạo nghĩa vụ attribution. |
| M7 **lấy code CHỈ CÓ Ở senpi** rồi đặt vào một trong các file trên | Ghi attribution **senpi** cho **phần đó** (xem B3), **không** ghi "ported from oh-my-pi" cho phần code gốc vẫn nằm đó. |

**Lưu ý vòng tròn attribution — đây là cái bẫy thật.** Nếu M7 lấy `ttsr` **từ senpi** (tức
đi vòng omp → senpi → omp), thì `NOTICE` cạnh code phải ghi **cả hai chiều** cho phần đó:
senpi là nguồn *trực tiếp* của bản M7 nhận, còn oh-my-pi là nguồn *gốc*. Ghi thiếu tầng gốc là
mất vòng dấu vết; ghi tầng gốc mà bỏ tầng trung gian là sai về mặt sự thật. **Hai dòng, không
phải một.** Đây là lý do nghiên cứu cũ nói "vẫn phải giữ dòng 'ported from oh-my-pi'" là
**đúng một nửa**: đúng khi M7 thực sự đi vòng, sai khi M7 chỉ sửa/xoá code của chính mình.

---

## File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| *(thư mục đích của hạng mục port)/NOTICE` | tạo | **MỘT file cho mỗi hạng mục port**, đặt cạnh code đã port, theo đúng khuôn `crates/pi-shell/NOTICE`. Nội dung bắt buộc có 5 mảnh: tên repo nguồn + URL · **SHA commit đã ghim** · tên file nguồn ở senpi · tên file đích ở omp · điều khoản giữ gì / bỏ gì. | Có. `crates/pi-shell/NOTICE` tồn tại và có **đúng 5 mảnh đó** — SHA ở dòng 8, tên file nguồn và đích cùng một câu, phần "preserves failures… strips header framing" ngay sau. Khuôn này đã qua review, không phải phỏng đoán. **Thư mục đích chưa xác định** — nó do hạng mục port chọn, W0 chỉ chốt khuôn. |
| `THIRD-PARTY-NOTICES.txt` | sửa | Nhân bản `NOTICE` mới vào mục `TRACKED VENDORED CODE AND ASSET NOTICES` (bắt đầu `:18`), theo đúng hình thức mục hiện có: đường kẻ `--`, rồi **đường dẫn file cạnh code**, rồi nội dung. Vị trí chèn: cùng nhóm với `crates/pi-shell/NOTICE` (`:249`). | Có. Mục `:18` tồn tại; mục pi-shell `:249-250` là hình thức mẫu; nội dung của nó **thật sự nằm trong aggregate** (SHA lặp ở `:260`) — `git grep -w` xác nhận. |
| `scripts/ci-release-publish.test.ts` | sửa | **MỞ RỘNG** describe `published legal payloads` (`:141`) bằng hợp đồng attribution: payload pháp lý mà package MIT thật sự giao cho npm phải chứa dòng copyright của senpi và SHA đã ghim. Đây là file test đã có, đã có factory, **không** tạo file mới. | Có. `scripts/ci-release-publish.test.ts:141-166` tồn tại, `describe("published legal payloads")` ở `:141`, `stageLegalPayloads` được gọi thật ở `:159`. `legalPayloadFiles` đã export (`:97`) và đã có test (`:142-146`). |
| `packages/coding-agent/test/notices-tracked-files-exist.test.ts` | tạo | Test MỚI: mọi đường dẫn mà mục `TRACKED VENDORED CODE AND ASSET NOTICES` khai báo phải **tồn tại trên đĩa**. Đây là hợp đồng chống aggregate nói về file đã bị đổi tên/xoá. | Có. Thư mục test tồn tại. Danh sách path đọc được ở `THIRD-PARTY-NOTICES.txt:22,59,250,289,320,339,375` — 7 mục, tất cả là file có thật (xem bảng B3-(i)). File test này chưa tồn tại. |
| `LICENSE` | **KHÔNG đụng** | Không thêm dòng nào. Attribution cho code vay mượn **không** thuộc `LICENSE` của bên nhận — nó thuộc `NOTICE`. Thêm vào đây sẽ nói dối rằng omp sở hữu thêm một đóng góp gốc. | Có. `LICENSE:1-22` là MIT thuần của omp với 3 dòng copyright tại `:3-5`; phần `TRACKED` của aggregate tách bạch "first-party licensing" khỏi "third-party code" ngay ở `THIRD-PARTY-NOTICES.txt:4-5`, đúng ranh giới này. |
| `NOTICE.md` (root) | **KHÔNG tạo** | Đây là kết luận trung tâm của B3. Tạo file này là tạo bề mặt pháp lý thứ hai không được ship. | Có. `ls NOTICE.md` → không tồn tại; `git ls-files \| grep -i notice` → **không có entry ở root** (10 hit còn lại đều là `NOTICE` cạnh code, `*-notice.md` là prompt, và `glyph-notice.md`). |

---

## Các bước

1. **CỔNG — lấy quyết định P-L1 bằng văn bản từ người duy trì TRƯỚC khi viết bất kỳ dòng
   pháp lý nào:** xác nhận rằng cơ chế attribution của omp là **`NOTICE` cạnh code + nhân bản
   vào `THIRD-PARTY-NOTICES.txt`**, và **không** tạo `NOTICE.md` ở root. Ghi câu trả lời
   nguyên văn vào work item này trong kế hoạch đã track. **Không** ghi vào file trong
   `.lavish-wip/` — thư mục đó chưa được track, nên không sống sót cùng commit và người
   review sẽ không thấy. Vì sao cần hỏi: cả ba lựa chọn (tạo `NOTICE.md` mới / dùng
   `THIRD-PARTY-NOTICES.txt` / sửa `LICENSE`) đều *hợp pháp về mặt pháp lý* — điều B3 chứng
   minh là cái nào **tới được người dùng**, và đó là tiêu chí duy nhất để chọn. Đây là quyết
   định về **bề mặt phân phối**, không phải về luật, nên không tự ý quyết được.
   *(anchor: `THIRD-PARTY-NOTICES.txt:4-5` (first-party vs third-party), `scripts/ci-release-publish.ts:100` (payload = LICENSE + aggregate))*

2. **Đóng băng SHA nguồn và ghi nó vào work item trước khi động vào code.** SHA là
   `ea9216269e9254b821446130b60d1e00759761dc`. Ghi kèm ngày đo và lệnh đã dùng để xác minh nó
   vẫn là commit đó (`git -C <senpi-ref> rev-parse HEAD` → đúng SHA; `git -C <senpi-ref>
   log -1 --format='%ci %s'` → `2026-09-28 14:12:31 +0900 Merge pull request #2273 from
   code-yeongyu/fix/2262-live-output-tail`). **Cấm** ghi "bản mới nhất", "HEAD", hay tên tag.
   Lý do không phải hình thức: `README.md:9` của senpi tự mô tả là *"an in-flight fork… Use it;
   don't bet a production pipeline on it"*, và senpi đã **xoá** cả stack computer-use 10 crate
   vì OMO đã sở hữu tính năng đó. Một tham chiếu không ghim không tái lập được, và đó chính là
   định nghĩa của việc không thể kiểm toán. *(anchor: `senpi-ref/README.md:9`)*

3. **Sửa `NOTICE` cạnh code, theo khuôn `crates/pi-shell/NOTICE`.** Sao chép đủ 5 mảnh; mảnh
   quan trọng nhất và mảnh dễ bỏ nhất là **"giữ gì / bỏ gì"** — mục `pi-shell/NOTICE` nêu rõ nó
   giữ failure/error/tổng kết và bỏ framing, và đó là thứ giúp người đọc sau này phân biệt
   "phái sinh" với "chép nguyên". *(anchor: `crates/pi-shell/NOTICE:1-12` (khuôn), `:8` (SHA))*

4. **Nhân bản vào `THIRD-PARTY-NOTICES.txt`.** Chèn cạnh mục `crates/pi-shell/NOTICE`
   (`:249`). **Sửa cả hai bản trong cùng một commit** — xem bước 6 về lý do đây là điểm dễ
   hỏng nhất. *(anchor: `THIRD-PARTY-NOTICES.txt:18` (mục đích), `:249-250` (mục mẫu))*

5. **Mở rộng test payload pháp lý — đây là hợp đồng thật, không phải kiểm tra văn bản.** Gọi
   `stageLegalPayloads` thật (như `:159` đã làm với fixture tạm) rồi khẳng định **payload mà
   package MIT giao cho npm** chứa dòng `Copyright (c) 2026 Yeongyu Kim and senpi
   contributors` và chứa SHA đã ghim. Vì sao đây là hợp đồng chứ không phải source-grep: nó
   chạy hàm export thật và khẳng định **byte đi ra ngoài**, tức đúng thứ người dùng nhận
   được. Đọc `THIRD-PARTY-NOTICES.txt` để khẳng định nội dung là **cần** — đó là dữ liệu mà
   hàm đó phát ra, không phải văn bản nguồn của một file triển khai.
   *(anchor: `scripts/ci-release-publish.test.ts:159` (gọi thật), `scripts/ci-release-publish.ts:111`)*

6. **Tạo test "mọi file mà aggregate khai báo đều tồn tại".** Đọc các đường dẫn trong mục
   `TRACKED VENDORED CODE AND ASSET NOTICES`, khẳng định từng cái tồn tại trên đĩa. Hợp đồng
   này bắt được đúng tai nạn của bước 4: đổi tên hoặc xoá `NOTICE` cạnh code mà quên sửa
   aggregate → aggregate vẫn khoe một file không tồn tại, và không có gì báo.
   *(anchor: `packages/coding-agent/test/notices-tracked-files-exist.test.ts` (mới), `THIRD-PARTY-NOTICES.txt:22,59,250,289,320,339,375`)*

7. **Thêm chốt chống hụt hụt (non-vacuity) vào CẢ HAI test.** Mỗi test phải khẳng định nó
   **thật sự đọc được dữ liệu** trước khi khẳng định điều kiện: khẳng định đã phân tích được
   **ít nhất một** mục `TRACKED`, và khẳng định chuỗi payload pháp lý **không rỗng**. Một
   parser hỏng tìm ra 0 mục rồi `expect(0).toBe(0)` sẽ làm cổng **xanh trong khi không kiểm tra
   gì** — đúng cái bẫy đã làm hỏng một test khác trong M3 (fixture một dòng vượt qua ràng buộc
   `lines.length > 1`). Cổng xanh mà không đo được gì là cổng không có tác dụng.
   *(anchor: test mới, phần khẳng định mở đầu)*

8. **CỔNG — câu hỏi P-L2: `NOTICE` cạnh code có phải MỘT file cho cả M7, hay MỘT file cho mỗi
   hạng mục port?** Đề xuất: **một file cho mỗi hạng mục port**, đặt cạnh thư mục đích, vì khuôn
   hiện có (`markit/NOTICE`, `pi-shell/NOTICE`) là **một file cho một thành phần**, và một
   `NOTICE` gộp cho cả milestone sẽ phải sửa lại mỗi khi thêm hạng mục. Hỏi trước vì nó quyết
   định cấu trúc thư mục của các hạng mục port về sau. *(anchor: `packages/coding-agent/src/markit/NOTICE:1-4`, `crates/pi-shell/NOTICE:1-3`)*

9. **Quy tắc bump SHA — trách nhiệm và kiểm tra.** Người chịu trách nhiệm là **work item port
   đã đưa mã vào**; một lần bump SHA **không** đi kèm thay đổi hành vi. Bắt buộc kèm: diff
   `git -C <senpi-ref> diff <sha-cũ>..<sha-mới> -- <đường dẫn nguồn đã port>`, và ghi kết quả
   vào `NOTICE`. Nếu diff chạm phần đã port thì bump phải là một work item riêng có cổng
   riêng, không được gộp. Cơ chế kiểm tra ở đây là **cổng đỏ-xanh ở Cổng hoàn thành**, không
   phải CI tự động — vì senpi nằm ngoài repo, CI không thể fetch nó mà không thêm một
   phụ thuộc mạng vào đường release.
   *(anchor: bước 2, `senpi-ref/README.md:9`)*

---

## Hợp đồng test

Bốn hợp đồng. **Cả bốn đều là hành vi quan sát được**, không đọc văn bản nguồn của file
triển khai để khẳng định về hình dạng code.

| # | hợp đồng | loại | vì sao đáng có |
| --- | --- | --- | --- |
| **T1** | Payload pháp lý mà `stageLegalPayloads` giao cho một package MIT **chứa** dòng copyright của senpi **và** SHA đã ghim. | dương | Đây là *hợp đồng duy nhất quan trọng*: attribution tới được người dùng qua npm, hay không tới. Bỏ nó thì M7 port đầy đủ mà không ai được biết. |
| **T2** | Cùng payload đó **không** chứa cách diễn đạt làm senpi thành bên bảo trợ/nhà cung cấp của omp (không có "endorsed by", không có "vendored from senpi" ở dạng bảo trợ). | **phủ định** | Nghĩa vụ thứ ba (B1.3) là nghĩa vụ **tự thêm**, và nó là nghĩa vụ duy nhất không ai kiểm tra bằng mắt một lần đọc thẳng. `CONTRIBUTING.md:139-147` của senpi nói rõ: *"Do not make senpi look endorsed by another project or vendor."* Chỉ `toContain` thì lỗi này lọt. |
| **T3** | Mọi đường dẫn khai báo trong mục `TRACKED VENDORED CODE AND ASSET NOTICES` đều tồn tại trên đĩa. | dương, phổ quát | Bắt tai nạn đổi tên/xoá file cạnh code mà aggregate quên sửa. Hợp đồng này có giá trị **hôm nay** cho 7 mục sẵn có, không chỉ cho M7. |
| **T4** | Cả T1 và T3 **đều khẳng định chúng đọc được dữ liệu** trước khi khẳng định điều kiện (≥1 mục được phân tích; payload không rỗng). | chống hụt hụt | Không có T4 thì một parser hỏng làm cổng xanh vô nghĩa. Đây là phần rẻ nhất và là phần hay bị bỏ nhất. |

**Cạm bẫy đã loại trừ, nêu rõ để không ai cắm vào:** đừng viết test khẳng định nội dung file
cạnh code xuất hiện **nguyên văn** trong aggregate. Điều đó **không đúng với toàn repo**:
mục `crates/vendor/brush-core/LICENSE` (`:21-57`) là **diễn giải lại có thêm văn xuôi**, không
phải bản sao. `markit` và `pi-shell` thì đúng là được nhân bản. Test chỉ nên khẳng định
**tồn tại** (T3) và **payload có attribution** (T1) — đừng khẳng định nhân bản verbatim trên
toàn repo, sẽ đỏ ngay vì brush-core.

**Không** dùng `mock.module()`. **Không** dùng `tsc` — `bun check`. **Không** đặt test này
trong `packages/natives/` hay `crates/` — nó thuộc `packages/coding-agent/test/` vì
`stageLegalPayloads` là script root và đó là nơi test script root đang nằm.

---

## Cổng hoàn thành

Cổng này phải **ĐỎ** được khi attribution còn thiếu, và phải phân biệt được "đã làm" với
"không chạy được".

**Lệnh:**

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
bun test scripts/ci-release-publish.test.ts packages/coding-agent/test/notices-tracked-files-exist.test.ts
```

**Đỏ trước, xanh sau — và bằng chứng đỏ phải thu được TRƯỚC khi làm bước 3:**

1. Chạy cổng ở cây sạch. Phải **ĐỎ** vì `NOTICE` của senpi chưa tồn tại, nên T1 không tìm thấy
   attribution. **Nếu cổng XANH ở cây sạch, dừng lại** — nghĩa là test không kiểm tra gì cả
   (vi phạm T4) và nó sẽ không bảo vệ gì sau này.
2. Làm bước 3-6.
3. Chạy lại. Phải **XANH**.
4. **Bằng chứng khác rỗng:** `git add -A && git diff --cached --stat` phải **thấy file mới**.
   `git diff --stat` một mình **không** thấy file mới — đây là bẫy đã làm hỏng tài liệu
   trước. Phải thấy đúng: 1 file `NOTICE` cạnh code (tạo), `THIRD-PARTY-NOTICES.txt` (sửa),
   `scripts/ci-release-publish.test.ts` (sửa), và file test mới (tạo). Cổng xanh mà
   `git diff --cached --stat` rỗng nghĩa là không có gì được làm.
5. **Đỏ-xanh ngược, một lần, để chứng minh cổng có tác dụng:** tạm xoá dòng SHA khỏi
   `THIRD-PARTY-NOTICES.txt`, chạy lại cổng, phải **ĐỎ**; khôi phục, phải **XANH**. Không làm
   bước này thì chưa biết cổng có bắt được thứ nó nói là bắt hay không.
6. `bun check` xanh.
7. Bước 1 (P-L1) và bước 8 (P-L2) có câu trả lời văn bản **đã ghi trong kế hoạch đã track**,
   không phải trong `.lavish-wip/`.

**Điều kiện tiên quyết:** cổng này **XANH là tiền điều kiện cho cổng của mọi hạng mục port**.
Một hạng mục port không được báo xanh khi attribution của nó chưa có trong payload.

---

## Rủi ro

| rủi ro | mức | đánh giá |
| --- | --- | --- |
| **Nghiên cứu cũ đã dẫn người thực hiện tạo `NOTICE.md` ở root** | **cao nếu không đính chính** | Đây chính là lý do W0 tồn tại như một hạng mục riêng. `NOTICE.md` ở root sẽ **không** được `stageLegalPayloads` chép vào package, không có trong `SHA256SUMS.txt`, không vào Docker/nix. Attribution viết ở đó là attribution **không tới được ai**. Đính chính nằm ở B3 và cổng bước 1. |
| **Sửa `THIRD-PARTY-NOTICES.txt` một tay, quên `NOTICE` cạnh code** | trung bình | Hệ quả: người đọc mã không thấy attribution ở nơi mã nằm, và bước bump SHA sau này không biết phải diff file nào. T3 bắt được chiều ngược (aggregate trỏ vào file không tồn tại) nhưng **không** bắt được chiều này. Vì vậy bước 4 nói rõ "sửa cả hai bản trong cùng một commit". |
| **Aggregate tự gọi mình "generated" nhưng không có generator** | trung bình | Không có gì tự bắt lệch, và không có gì cảnh báo khi ai đó chạy lại một quy trình sinh file (nếu tồn tại ngoài repo) và ghi đè bản sửa tay. Đã ghi rõ ở B3. Nếu sau này phát hiện có generator ngoài repo, **T3 và T1 phải chạy lại** vì chúng giả định bản tay. |
| **Ghim SHA rồi để lệch** | trung bình | Senpi là fork "in-flight" tự thừa nhận không ổn định, đã xoá cả stack 10 crate. SHA cũ vẫn **tái lập được** (đó là mục đích của việc ghim) nhưng sẽ lệch dần về sau. Bước 9 gắn trách nhiệm vào work item port và bắt kèm diff. |
| **Đọc thẳng `senpi-ref/` khi đánh giá bump** | thấp | `senpi-ref` là checkout cục bộ **không được track** (như `pi-ref` và `claude-code-ref` trước đó). Bằng chứng đọc từ nó không sống sót cùng commit. Vì vậy bước 1 và bước 8 ghi câu trả lời vào **kế hoạch đã track**, không phải vào `.lavish-wip/`. |
| **Test payload pháp lý biến thành source-grep** | thấp | Đã chặn ở Hợp đồng test: khẳng định trên **payload do hàm thật phát ra**, không phải trên văn bản nguồn của file triển khai. Đọc chính `THIRD-PARTY-NOTICES.txt` là cần — nó là dữ liệu đầu ra, không phải nguồn. |
| **Sửa nhầm `LICENSE`** | thấp | Đã khoá ở bảng File: `LICENSE` dòng **KHÔNG đụng**, kèm lập luận. Ranh giới first-party/third-party đã được chính repo vạch ở `THIRD-PARTY-NOTICES.txt:4-5`. |

---

## Sóng 0b — SEAM: mở bốn seam API

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

### Phản biện — đọc trước khi làm

Agent phản biện đọc toàn bộ work item trên và cố **bác bỏ** nó. Bản đầy đủ: `.lavish-wip/m7-md/verify-seam.md`. Các sửa bắt buộc đã được đưa vào thân work item; những gì còn lại ở đây.

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

---

## Sóng 1a — WARM: làm ấm prompt cache

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

### Phản biện — đọc trước khi làm

Agent phản biện đọc toàn bộ work item trên và cố **bác bỏ** nó. Bản đầy đủ: `.lavish-wip/m7-md/verify-cache.md`. Các sửa bắt buộc đã được đưa vào thân work item; những gì còn lại ở đây.

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

---

## Sóng 1b — SEAMFREE: nhóm builtin chạy được ngay

> Nguồn: `SENPI_FINDINGS.md` Phần 4 §4-§5, Phần 6 §6.1/§6.3, Phần 7 §7.1/§7.13/§7.18 · Tổng hợp §4-§6.
> Cây đích: `/Users/tranquangdang21/Projects/ultraworkers` (gọi tắt **omp**) · cây nguồn: `/Users/tranquangdang21/Projects/senpi-ref` (gọi tắt **senpi**), ghim theo `ea9216269e9254b821446130b60d1e00759761dc`.
> Chính sách pháp lý: senpi MIT thuần. Ba nghĩa vụ — giữ MIT notice · ghi attribution vào `NOTICE.md` (omp **chưa có** file này) · không lấy thương hiệu. Mọi mục "chép" dưới đây đều chịu ba nghĩa vụ này.

## Sóng / phạm vi

Sóng A của M7. **Phạm vi hẹp: 13 builtin không cần seam mới để đăng ký**, đã đo lại từng cái ở cả hai cây. Sóng này **không mở seam nào** — nó là sóng chạy được trước, kế tiếp sẽ là sóng seam (`agent_settled` → `registerEntryRenderer` → `model_select`).

Kết luận của sóng, chốt bằng phép đo riêng (mục "Đo lại" bên dưới): **13 là trần trên, và trần đó không đạt được.** Sau khi loại những cái omp đã mạnh hơn, và những cái bị chặn bởi contract không tương thích, danh sách thực làm được là **8**, trong đó **3 cái rẻ thật** và **5 cái phải viết lại kiến trúc**.

## Đo lại: "13 chạy được ngay" là con số nào

Tôi không lặp lại con số của nghiên cứu trước. Dưới đây là phép đo của riêng tôi, chạy trên đường dẫn thật.

**Sai đường dẫn là bẫy thứ ba, chưa ai ghi.** `SENPI_FINDINGS.md` §3 và §5.3 nói "40 builtin", và cây có `packages/coding-agent/src/core/extensions/builtin/`. Nhưng 13 tên trong §5.3 **không nằm dưới `builtin/` ở gốc cây senpi** — `find . -maxdepth 4 -type d -name 'builtin*'` trả về **rỗng**. Đường dẫn thật là `packages/coding-agent/src/core/extensions/builtin/`, và nó chứa **59 mục** (40 thư mục + 19 file lỏng), không phải 40. Ai đo lại bằng `builtin/<tên>` sẽ nhận 13 cái `MISSING-DIR` và kết luận sai.

Đường dẫn thật đã dùng cho mọi phép đo dưới đây:
`/Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin/<tên>`

### Bảng đối chiếu 13/13

Chuẩn là `BUILTIN_TOOL_NAMES` (`packages/coding-agent/src/tools/builtin-names.ts:1-32`, đọc nguyên file: **30 tool + 3 hidden** tại dòng 36) và `HIDDEN_TOOL_NAMES`.

| # | builtin senpi | dòng `.ts` (không test) | file `.ts` | `on("…")` | `changes.md` | omp đã có gì? | kết luận |
|---:|---|---:|---:|---:|:---:|---|---|
| 1 | `account` | **82** | 1 | 0 | N | `packages/ai/src/auth-storage.ts` có, nhưng **không** `CredentialAccountSummary`/`pinCredentialAccount`; `ctx.sessionSettings` **0 hit** | ❌ không chép được |
| 2 | `anthropic-bash` | 103 | 1 | 1 | N | 1 `before_provider_request`; omp có api `anthropic-messages` (`packages/ai/src/types.ts:75`) | ⚠️ contract provider |
| 3 | `bash-timeout` | **118** | 2 | 1 | Y | `bash.ts:330-357` **đã có** `timeout` clamp `TOOL_TIMEOUTS.bash.min/max` | ❌ đã có |
| 4 | `help` | 148 | 2 | 0 | Y | `buildHelpMarkdown` **0 hit** trong `src` | ⚠️ viết mới |
| 5 | `history-search` | **401** | 5 | 0 | N | `getSessionsDir` có; **`parseJsonlLenient` phải dùng** | ⚠️ viết mới + JSONL |
| 6 | `hooks` | **4.663** | 23 | **10** | N | không đo được (không `changes.md`) | ❌ bỏ |
| 7 | `imagegen` | 880 | 7 | 1 (`resources_discover`) | Y | `src/tools/image-gen.ts` 12 KB **đã có**, đã wire qua `sdk.ts:3218`; omp cũng có `resources_discover` (3 hit) | ❌ đã có |
| 8 | `model-fallback` | 207 | 3 | 0 | N | `fallbackChain` có (`task/executor.ts:261`) nhưng `setFallbackChain`/`ctx.sessionSettings` **0 hit** | ⚠️ viết mới |
| 9 | `nested-agents-md` | 539 | 11 | 4 | Y | 0 hit; cần `isReadToolResult` từ types của senpi | ⚠️ viết mới |
| 10 | `permission-system` | 1.638 | 15 | 3 | Y | `src/tools/approval.ts` 13 KB — kiến trúc khác | ❌ viết lại |
| 11 | `rules` | 2.842 | 19 | 4 | Y | 0 hit; `rule-activation` 0 hit | ❌ bỏ (cỡ) |
| 12 | `tool-pair-guard` | 269 | 3 | 1 | N | `sanitizeAnthropicToolPairs` **0 hit** trong `packages/` | ❌ viết mới |
| 13 | `webfetch` | 1.062 | 10 | 2 | Y | `src/tools/fetch.ts` **53 KB** — mạnh hơn nhiều | ❌ đã có |

**Bốn builtin rơi ngay ở bước đối chiếu** — không phải vì khó, mà vì omp đã có sẵn hoặc mạnh hơn:
`bash-timeout` (omp đã clamp timeout), `imagegen` (`image-gen.ts` đã chạy), `webfetch` (`fetch.ts` 53 KB vs 1.062 dòng senpi), và `account` (không có API nền).

**Hai builtin rơi vì cỡ và không đo được**: `hooks` (4.663 dòng, 23 file, 10 `on()`) và `rules` (2.842 dòng, 19 file). Cả hai đều **không có `changes.md` hoặc có nhưng 50-91% cắm core** — `rules` không đo được mức cắm core từ chính nghiên cứu trước (mâu thuẫn §7.12: 13/40 builtin không có `changes.md`, và `tool-pair-guard` nằm trong 13 đó ⇒ **không tồn tại phép đo nào** cho nó).

### Con số chốt: 13 → 8, trong đó 3 rẻ thật

Tôi chốt **8** cái thực làm được, xuống từ "13 là trần trên" của nghiên cứu trước — và con số đó **chưa tính việc viết lại**, nên giá trị dùng được thấp hơn 8:

- **3 rẻ thật** (chép được, không cần seam, không cần viết lại kiến trúc): `help` · `history-search` · `tool-pair-guard`.
  **Khác nghiên cứu trước:** nó nói "chỉ `loop-guard`, `bash-timeout`, `history-search`". Tôi đo lại và **`loop-guard` không nằm trong nhóm 13** — nó dùng 8 event gồm `agent_settled` (`grep -o` trên `loop-guard/` trả về đúng 8 tên: `agent_settled`, `agent_start`, `input`, `session_shutdown`, `session_start`, `tool_call`, `tool_execution_start`, `turn_end`), mà **`agent_settled` = 0 hit** trong `types.ts` của omp ⇒ nó **CẦN SEAM**. Và `bash-timeout` **đã có** ở omp (`bash.ts:330`). Cả hai đều không thuộc nhóm "rẻ thật". Nghiên cứu trước đã tự mâu thuẫn ở §5.3: nó liệt kê `loop-guard` như "thật sự không cần seam" trong khi danh sách 13 của chính nó không có `loop-guard`.
- **5 phải viết lại kiến trúc** (seam có, nhưng contract không tương thích): `anthropic-bash` · `model-fallback` · `nested-agents-md` · `tool-pair-guard` (một nửa) · `history-search` (một nửa).

## Xếp hạng theo giá trị / công

Xếp theo **công omp phải trả** (dòng phải viết), không theo cỡ senpi. Một builtin 4.000 dòng mà omp không có bản tương đương thì rẻ hơn một builtin 100 dòng mà phải viết lại cả tầng approval.

| hạng | mục | công (dòng omp) | hiệu ứng người dùng thấy | rủi ro |
|---:|---|---:|---|---|
| **1** | `help` (`/help` + `/keybindings`) | **~180** | `/help` trong TUI mở overlay liệt kê keybinding và **toàn bộ command đã cài, kể cả command của extension** — hiện tại omp không có lệnh này | Thấp. Không đọc session. Rủi ro thật duy nhất: `getCommands()` phải trả về danh sách command của extension đang bật, mà `help` senpi gọi `pi.getCommands()` (`types.ts:1504` — omp **đã có**) |
| **2** | `tool-pair-guard` | **~200** | Vá lỗi wire: khi model phát `tool_use` không có `tool_result` đi kèm (dangling / orphan), request bị sửa trước khi gửi thay vì để provider trả 500 | **Trung bình-cao.** `sanitizeAnthropicToolPairs` là 0 hit ở omp ⇒ phải **viết mới phần lõi**, không chép được. Và `before_provider_request` trả về `unknown` (`types.ts:1166`) — thay cả payload |
| **3** | `history-search` (`/history`) | **~320** | Gõ `/history`, overlay tìm trong **mọi session JSONL đã lưu**, nhảy tới session cũ | **Cao.** Đây là cổng JSONL. Xem cảnh báo bên dưới |
| **4** | `model-fallback` (`/fallback`) | **~200** | Bật/tắt chuỗi model thay thế khi lỗi retry — `/fallback` hiện **không tồn tại** ở omp | **Cao.** `ctx.sessionSettings` là **0 hit** trong `types.ts` của omp. Phải chọn: mở seam settings, hay viết bảng cấu hình riêng |
| **5** | `nested-agents-md` | **~350** | Tự chèn `NESTED_AGENTS.md` vào context khi chạy trong thư mục con agent | Trung bình. Cần `isReadToolResult` mà `types.ts` của senpi có, omp phải tự viết |
| **6** | `anthropic-bash` | **~110** | Chỉ bật bash native của Anthropic khi model đúng dòng | **Cao.** Đây là contract provider: `AGENTS.md` cấm hard-code chính sách theo model trong TS. Cần KDL axis, không phải `ctx.model.api === "anthropic-messages"` |

**Cái tôi xếp hạng cao nhất không nằm trong danh sách này:** `loop-guard`. Nó không phải seam-free (cần `agent_settled`), nhưng **omp đã có `ToolCallLoopGuard`** ở `packages/ai/src/utils/tool-call-loop-guard.ts:68`, đã có test, và đã được dùng ở `src/session/stream-guards.ts:220`. ⇒ Đây là work item của sóng seam, **không** phải sóng này. Ghi vào đây để không ai port trùng.

### Ba cái bị loại, và vì sao (không phải vì khó — vì omp đã có hoặc mạnh hơn)

| mục | bằng chứng omp | kết luận |
|---|---|---|
| `bash-timeout` (118 dòng) | `packages/coding-agent/src/tools/bash.ts:330` khai báo `BASH_TIMEOUT_DESCRIPTION` clamp theo `TOOL_TIMEOUTS.bash.min/max`; schema `timeout?` ở :334/:341/:349/:357 | **Đã có.** Port là viết lại một thứ đã tồn tại |
| `imagegen` (880 dòng) | `packages/coding-agent/src/tools/image-gen.ts` (12 KB), `getImageGenTools` ở :309, đã được wire tại `src/sdk.ts:3218-3219`; prompt nằm đúng chuẩn `AGENTS.md` (`.md`, :20) | **Đã có** |
| `webfetch` (1.062 dòng) | `packages/coding-agent/src/tools/fetch.ts` **53 KB** — có `renderHtmlToText` :592, `fetchReadUrl` :1613, `materializeReadUrlToFile` :1660, `executeReadUrl` :1686 | **Mạnh hơn nhiều.** `webfetch` không có tên trong `BUILTIN_TOOL_NAMES` (0 hit) vì omp đã gộp nó vào đường `read` |

## Bước đầu tiên: `directory-resolution.ts:69` — **BÁC BỎ**, và lý do

Nghiên cứu trước đề xuất: "ném 3 builtin seam-free vào `directory-resolution.ts:69` (`pkg.omp ?? pkg.pi`) trước khi viết dòng seam nào — rẻ nhất, không tốn công sửa nếu sai". Tôi đã đo. **Ý tưởng đúng về cơ chế, sai về hàm đích.**

**Đúng:** dòng 69 có thật và đúng nội dung:
```ts
const manifest = isRecord(pkg) ? (pkg.omp ?? pkg.pi) : undefined;
const entries = isRecord(manifest) ? manifest.extensions : undefined;
```
(`packages/coding-agent/src/extensibility/extensions/directory-resolution.ts:69-70`). Nó đọc `package.json`, lấy `extensions: string[]`, `path.resolve(dir, entry)`, và chấp nhận **cả file lẻ lẫn thư mục** (thư mục thì đi qua `findExtensionDirectoryIndex`, dòng 87-89). Cơ chế là thật, không phải suy đoán.

**Sai ở chỗ khác — và đây là chỗ quyết định:**

1. **Dòng này KHÔNG quét cây omp.** Nó chỉ chạy từ `resolveExtensionDirectory`, và hàm đó có **đúng hai caller**: `extensions/loader.ts:36` và `plugins/loader.ts:12`. Trong `loader.ts`, lời gọi duy nhất nằm ở **dòng 653 — bên trong nhánh "Explicitly configured paths"** (`for (const configuredPath of configuredPaths)`). Không có nhánh nào trong `loader.ts` gọi nó cho thư mục nguồn của omp.
2. **Vậy nên "ném vào `directory-resolution.ts:69`" nghĩa là gì?** Không có nghĩa cụ thể nào nếu không đặt các builtin vào một thư mục *được cấu hình tường minh*. Đó là thay đổi **hành vi khám phá extension của omp toàn cục**, không phải thêm một builtin. Nó sẽ khiến mọi người dùng omp thấy thêm N extension đã đăng ký lệnh, ở mọi workspace — một thay đổi sản phẩm, không phải một PR port.
3. **Rủi ro đúng là "không tốn công sửa nếu sai" — nhưng ngược lại về tính quan sát được.** Một PR port builtin đăng ký sai chỗ sẽ **hỏng im lặng**: `omp` vẫn chạy, không có extension nào đăng ký, không có lỗi. Đây đúng là loại cổng mà `MILESTONE_3_EXECUTION_PLAN.md` yêu cầu phân biệt "đã làm" với "không chạy được".

**Kết luận:** **không sửa `directory-resolution.ts` ở sóng này.** Thay vào đó đặt 3 builtin vào **một thư mục riêng, không nằm trên đường quét mặc định** (ví dụ `packages/coding-agent/src/extensibility/extensions/ported-senpi/`), và chỉ **nối chúng** khi bước 5 dưới đây chứng minh được chúng chạy. Cơ chế `directory-resolution.ts:69` vẫn là hàng dự phòng đúng — dùng nó ở bước tiếp theo, khi thư mục đã tồn tại và đã có test.

## Hiệu ứng người dùng thấy

Ba lệnh mới, không seam mới, không đụng tầng provider:

- `/help` trong TUI mở overlay liệt kê keybinding + **mọi command đã cài, kể cả của extension**. Ngoài TUI thì in một dòng hướng dẫn thay vì im lặng. `/keybindings` mở `keybindings.json` bằng `$EDITOR` và reload tại chỗ.
- `/history` mở overlay tìm trong toàn bộ session JSONL đã lưu, lọc theo text, nhảy tới session cũ. Đây là thứ người dùng đang mất nhiều thời gian nhất: session JSONL của omp nằm rải trong `~/.omp/`, không có đường quay lại.
- `tool-pair-guard` không có hiệu ứng trực tiếp — nó **ngăn** lỗi wire 500 khi model phát `tool_use` mà không kèm `tool_result`. Người dùng thấy một lượt chạy thành công thay vì một lỗi provider không rõ nguyên nhân.

**Không** thấy gì: không có thông báo lúc khởi động, không có cờ mới, không có thay đổi hành vi của builtin đang chạy. Đây là tiêu chí của sóng này — sóng mà `webfetch`/`imagegen`/`bash-timeout` (loại vì omp đã có) sẽ **vi phạm**.

## Effort

**~4,5 engineer-days** cho phần đã đặc tả (hạng 1-3), **~7 ngày** cho cả 6 mục đã xếp hạng.

| hạng | mục | công | Điểm nên dành nhiều hơn mức phẳng |
|---:|---|---:|---|
| 1 | `help` | **~1 ngày** | — |
| 2 | `tool-pair-guard` | **~1,5 ngày** | Viết mới phần lõi (không chép được) + chứng minh `before_provider_request` **thật sự thay payload** chứ không chỉ nhận `unknown` |
| 3 | `history-search` | **~2 ngày** | Fixture JSONL. Dành **nửa ngày riêng** cho nó |
| 4 | `model-fallback` | ~1,5 ngày | Chặn ở cổng P2 (xem dưới) |
| 5 | `nested-agents-md` | ~1,5 ngày | — |
| 6 | `anthropic-bash` | ~1 ngày + chờ KDL axis | Chặn ở cổng P3 |

Công của hạng 4-6 là **ước lượng**, chưa kiểm chứng bằng cách đọc hết nguồn senpi (tôi chỉ đọc `index.ts` của chúng). Không hàng nào trong bảng trên được `bun check` — đó là công việc của người thực hiện, không phải của sóng này.

## File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/directory-resolution.ts` | **KHÔNG đụng** | Đọc để hiểu cơ chế, không sửa. Sóng này bác bỏ việc sửa nó. | Có. File 145 dòng; dòng 69 đúng nội dung `pkg.omp ?? pkg.pi`, dòng 87-89 nhánh thư mục, dòng 102 `resolveExtensionDirectory` |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | **KHÔNG đụng** | Đọc để xác nhận chỉ có một lời gọi, ở nhánh configured-paths. | Có. Import ở :36; lời gọi **duy nhất** ở **:653**, nằm trong `for (const configuredPath of configuredPaths)` mở đầu :641 |
| `packages/coding-agent/src/tools/builtin-names.ts` | đọc | Chuẩn đối chiếu. **KHÔNG thêm** tên mới: 3 mục này là **lệnh**, không phải tool. | Có. Đọc nguyên file 68 dòng: 30 tool (dòng 2-31) + 3 hidden (dòng 36). `fetch`/`webfetch` = **0 hit** |
| `packages/coding-agent/src/extensibility/extensions/ported-senpi/` | **tạo** | Thư mục mới, **không nằm trên đường quét mặc định**. 3 entry point: `help.ts`, `history-search.ts`, `tool-pair-guard.ts` | Có (vắng mặt là đã kiểm chứng — `ls` thư mục `extensions/` không có entry này) |
| `packages/coding-agent/src/modes/interactive/help-content.ts` | tạo | `buildHelpMarkdown` — senpi import nó từ `modes/interactive/help-content.ts` nhưng omp **0 hit** ⇒ phải viết. Đây là hợp đồng thuộc về người dùng (liệt kê lệnh), nên phải khớp nguồn sự thật của omp, không chép bản senpi | Có. `git grep -nw 'help-content' -- packages/coding-agent/src` → rỗng |
| `packages/coding-agent/src/tools/approval.ts` | đọc | Chỉ để đối chiếu khi làm `permission-system` (**không thuộc sóng này**). 13 KB | Có (kích thước từ `ls`) |
| `packages/utils/src/stream.ts` | đọc | `parseJsonlLenient` tại **:575** — cổng JSONL bắt buộc cho `history-search` | Có. Định nghĩa tại `packages/utils/src/stream.ts:575`; consumer sẵn có ở `src/memories/index.ts:691` và `:734` |
| `packages/coding-agent/test/senpi-ported-help.test.ts` | tạo | Test hạng 1 | Có (chưa tồn tại) |
| `packages/coding-agent/test/senpi-ported-history-search.test.ts` | tạo | Test hạng 3. **Bắt buộc** có fixture JSONL hỏng | Có (chưa tồn tại) |
| `packages/coding-agent/test/senpi-ported-tool-pair-guard.test.ts` | tạo | Test hạng 2 | Có (chưa tồn tại) |
| `NOTICE.md` | **tạo** | File **chưa tồn tại** ở omp. Bắt buộc vì `AGENTS.md` không nêu nhưng `SENPI_FINDINGS.md` §1.2 + `task` yêu cầu: ghi attribution senpi MIT cho mọi dòng chép | Có. `SENPI_FINDINGS.md` §1.2 nêu rõ omp chưa có file này; senpi có `NOTICE.md` 2.1 KB |

## Các bước

1. **CỔNG — lấy P0 bằng văn bản: `/help` của sóng này có được phép liệt kê lệnh của extension không?** Nếu câu trả lời là "không", `help` rơi xuống hạng 5 và hạng 1 của sóng này thành `tool-pair-guard`. Ghi câu trả lời nguyên văn vào kế hoạch đã track — **không** ghi vào `.lavish-wip/` (thư mục đó chưa được track, người review không thấy). Không viết dòng code nào của `help` khi P0 còn mở. *(anchor: `types.ts:1504` `getCommands(): SlashCommandInfo[]`)*

2. **`help` — viết `buildHelpMarkdown` theo nguồn sự thật của omp, KHÔNG chép bản senpi.** senpi import nó từ `modes/interactive/help-content.ts` — file này **không tồn tại** ở omp. Nguồn cho nội dung là registry lệnh của chính omp, đừng chép danh sách của senpi. *(anchor: `packages/coding-agent/src/extensibility/extensions/types.ts:1504`)*

3. **`help` — trả lời cả hai nhánh.** `ctx.mode !== "tui"` thì `ctx.ui.notify(...)`; ngược lại thì `ctx.ui.custom<T>(...)` với `overlay: true`. Cả hai API đã có: `notify` tại `types.ts:258`, `custom` tại `types.ts:282`. Lệnh thứ hai là `/keybindings` — mở `keybindings.json` bằng `$EDITOR`; ở chế độ non-TUI thì `notify` hướng dẫn, không ném lỗi. *(anchor: `types.ts:258`, `types.ts:282`)*

4. **`tool-pair-guard` — XÁC MINH `before_provider_request` THẬT SỰ THAY PAYLOAD trước khi viết lõi.** Kiểm chứng rồi: `runner.ts:1820` khai báo `let currentPayload = payload`, `:1827-1829` đưa `currentPayload` vào event, và `:1841-1843` gán `currentPayload = handlerResult` khi handler trả khác `undefined`, rồi `return currentPayload`. ⇒ Cơ chế có thật, không phải bình luận trong type. Nhưng kiểm tra **từng provider** xem handler được gọi với body đúng provider (Anthropic `tools` vs OpenAI `tools`) — `payload` là `unknown` (`types.ts:774`), nên một giả định sai về hình dạng sẽ hỏng âm thầm. *(anchor: `packages/coding-agent/src/extensibility/extensions/runner.ts:1820,1827,1841,1843`)*

5. **`tool-pair-guard` — viết phần lõi MỚI, đừng chép.** `sanitizeAnthropicToolPairs` là **0 hit** trong `packages/` của omp (`git grep -nw`), nên `tool-pair-guard/index.ts:1` của senpi không có gì để chép. Chép được phần OpenAI (`sanitize-openai-chat-completions-payload.ts` 105 dòng + `sanitize-openai-responses-payload.ts` 149 dòng) chỉ khi cả hai provider đó của omp có payload tương đương. Đừng chép `index.ts` (15 dòng) — nó chỉ là ba lời gọi. *(anchor: senpi `builtin/tool-pair-guard/index.ts:1`; omp: 0 hit)*

6. **`history-search` — đặc tả port đủ để làm, gồm cả cổng JSONL.** Nguồn: senpi `builtin/history-search/` — `index.ts` (56, phần `resolveSearchRoot` + `registerCommand("history")`), `indexer.ts` (168), `overlay.ts` (141), `filter.ts` (29), `types.ts` (7). Entry point là `export default function historySearchExtension(pi: ExtensionAPI)`, đăng ký qua `pi.registerCommand`. **Cảnh báo JSONL — cổng chặn dễ sai nhất của cả M7:** `indexer.ts:44-50` định nghĩa `parseJsonLine` **gọi `JSON.parse(line)` trực tiếp** rồi nuốt `SyntaxError`. Khi port, thay **toàn bộ** đường đọc bằng `parseJsonlLenient` (`packages/utils/src/stream.ts:575`) — nó đã có sẵn consumer thật ở `src/memories/index.ts:691` và `:734`. Đừng chép nguyên xi `JSON.parse`. *(anchor: senpi `history-search/indexer.ts:44-50`; omp `packages/utils/src/stream.ts:575`)*

7. **`history-search` — dựng fixture JSONL trước khi viết overlay.** Cần tối thiểu: một file session **hợp lệ** có header `type: "session"`, một file chứa **một dòng JSON hỏng** giữa các dòng hợp lệ, và một dòng JSON hợp lệ nhưng không phải object. Đây là nửa ngày riêng theo ước lượng công ở trên — đừng gộp vào ngày overlay. *(anchor: senpi `history-search/indexer.ts:112-141` (`appendSessionEntries`, vòng lặp dòng))*

8. **Nối cả 3 vào loader — nhưng CHỈ sau khi bước 1-7 có test xanh.** Và **không sửa `directory-resolution.ts`**. Nếu cuối cùng vẫn muốn dùng cơ chế `package.json.extensions`, làm nó ở **PR sau**, khi thư mục đã tồn tại và đã có test bảo vệ. *(anchor: `packages/coding-agent/src/extensibility/extensions/directory-resolution.ts:69`)*

9. **`NOTICE.md` — tạo file, ghi attribution senpi MIT, ghim theo commit SHA `ea9216269e9254b821446130b60d1e00759761dc`.** Không ghi "bản mới nhất". Không lấy thương hiệu senpi. Giữ MIT notice gốc. *(anchor: `SENPI_FINDINGS.md` §1.2; senpi `NOTICE.md` 2.1 KB)*

10. **`bun check` (KHÔNG dùng `tsc`/`npx tsc`) và chạy đúng 3 file test mới.** Không `mock.module()`. Nếu cần spy thì `vi.spyOn` trên namespace đã import + `vi.restoreAllMocks()` trong `afterEach`. *(anchor: `AGENTS.md` "Testing Guidance")*

## Hợp đồng test

Ba file test mới, mỗi file bảo vệ **một** hợp đồng quan sát được, mỗi cái có **cả hợp đồng phủ định**. Không test nào source-grep (AGENTS.md cấm), không `mock.module()`.

**`senpi-ported-help.test.ts`** — đăng ký một extension giả **hai lệnh riêng biệt** rồi gọi `/help`:
- Khẳng định cả hai tên lệnh của extension xuất hiện trong output. *Đây là hợp đồng thật của P0* — nếu `/help` chỉ liệt kê lệnh builtin, người dùng vẫn tưởng extension chưa được nạp.
- **Phủ định:** gọi `/help` ở `ctx.mode !== "tui"` ⇒ khẳng định `notify` được gọi **và `custom` KHÔNG được gọi**. Đây là nhánh mà chép nguyên sẽ bỏ sót.
- **Phủ định:** `/keybindings` ở non-TUI ⇒ `notify`, không ném lỗi, không spawn editor.

**`senpi-ported-tool-pair-guard.test.ts`**:
- Payload có `tool_use` không kèm `tool_result` ⇒ handler trả về payload **đã sửa**, và quan trọng nhất: **không còn `tool_use` trơ** nào trong kết quả.
- **Phủ định (quan trọng nhất):** payload **đã cặp đúng** `tool_use`/`tool_result` ⇒ handler trả về `undefined` (không sửa). Đây là hợp đồng chống lỗi: một guard luôn trả về payload đã bản sao sẽ phá mọi request hợp lệ. Một test chỉ khẳng định "payload hỏng thì được sửa" sẽ xanh với một bản luôn ghi đè — vi phạm AGENTS.md ("success passthrough").
- Chạy với **payload đã được một handler khác sửa** để chứng minh chúng nối tiếp, không phải cạnh tranh.

**`senpi-ported-history-search.test.ts`**:
- File session hợp lệ ⇒ entry tìm được, `sessionId` lấy từ header.
- **Phủ định quan trọng nhất:** file JSONL chứa **một dòng hỏng** ở giữa ⇒ các entry hợp lệ **trước và sau** dòng hỏng vẫn được trả về, và hàm **không ném lỗi**. Đây chính là cổng `parseJsonlLenient` — nếu ai đó chép nguyên `JSON.parse` của senpi (`indexer.ts:46`), test này đỏ.
- Lọc không khớp ⇒ **overlay mở với danh sách rỗng**, không phải overlay rỗng bị bỏ qua.

**Cấm dùng trong cả ba file:** khẳng định chuỗi literal của output render (vi phạm "static echo"), `expect(true).toBe(true)`, `not.toThrow()` trần, kiểm tra "chuỗi không rỗng", và đọc file nguồn để `toContain("someCall()")`.

## Cổng hoàn thành

Mỗi cổng phải **phân biệt được "đã làm" với "không chạy được"**. Cổng trả về thành công khi **không nhìn thấy gì** là cổng không có tác dụng.

| # | cổng | lệnh / điều kiện | vì sao cổng này có tác dụng |
|---|---|---|---|
| **G1** | File mới **đã được track** | `git add -A && git diff --cached --stat` **phải thấy** 4 file mới trong `ported-senpi/`/`test/` + `NOTICE.md`. **`git diff --stat` trần KHÔNG được chấp nhận** — nó không thấy file untracked | Đây đúng là cái bẫy đã làm hỏng tài liệu trước. Thư mục `.lavish-wip/` untracked cũng vậy |
| **G2** | **Ba lệnh đã đăng ký thật** | Chạy omp, gõ `/help`, `/history` trong TUI ⇒ **mở overlay**. `tool-pair-guard` không quan sát được tay ⇒ dùng G3 | Cổng "không thấy gì" chính là thứ mà một port hỏng im lặng sẽ vượt qua |
| **G3** | Guard **thật sự thay payload** | Test: handler `before_provider_request` trả về payload đã sửa, và giá trị trả về tới `runner.ts:1843` (`currentPayload = handlerResult`) khác payload vào | Chứng minh đúng cơ chế đã kiểm chứng ở bước 4, không chỉ tin type |
| **G4** | JSONL hỏng **không làm hỏng** | Test với fixture có dòng JSON hỏng ⇒ không ném lỗi, entry hợp lệ hai bên vẫn trả về | Bảo vệ cổng `parseJsonlLenient` |
| **G5** | **Không hồi quy** | `bash-timeout` (`bash.ts:330-357`), `imagegen` (`image-gen.ts` + wiring `sdk.ts:3218`), `webfetch` (`fetch.ts` 53 KB) — **không file nào trong ba đó bị sửa**. `git diff --cached --stat` không được chứa chúng | Ba cái này rơi vì omp đã mạnh hơn. Chạm vào chúng = phá hệ thống đang chạy |
| **G6** | `bun check` sạch, 3 file test xanh, **không `mock.module()`** | `bun check` + `bun test` trên 3 file mới | `tsc` bị cấm |
| **G7** | `NOTICE.md` tồn tại và ghi SHA `ea9216269e9254b821446130b60d1e00759761dc` | Đọc file, kiểm tra có SHA | Nghĩa vụ pháp lý thứ hai; ghim SHA chứ không ghi "latest" |

## Rủi ro

| # | rủi ro | xác suất | hậu quả | chặn bởi |
|---|---|---|---|---|
| **R1** | **Port dùng `JSON.parse` trực tiếp thay vì `parseJsonlLenient`** | Cao nếu chép nguyên xi | Một session JSONL hỏng làm `/history` ném lỗi — mất đúng cái công cụ dùng để tìm session hỏng. Đây là cổng chặn dễ sai nhất của cả M7 | G4 + bước 6 |
| **R2** | **Đăng ký extension sai chỗ ⇒ im lặng** | Trung bình | Mọi cổng đều xanh, không có lệnh nào xuất hiện. Đây là hình dạng thất bại tệ nhất | G1 + G2 + bác bỏ `directory-resolution.ts` |
| **R3** | **`tool-pair-guard` sửa payload theo hình dạng của provider khác** | Trung bình | `payload` là `unknown` (`types.ts:774`); giả định sai về `tools` của Anthropic vs OpenAI là hỏng wire ở tầng thấp hơn lỗi ban đầu | G3 + bước 4 (kiểm từng provider) |
| **R4** | **`/help` liệt kê lệnh của extension khi người dùng không muốn** | Thấp | Rò thông tin tên lệnh nội bộ ra overlay chia sẻ màn hình | P0 ở bước 1 |
| **R5** | **Chạm nhầm vào `bash-timeout`/`imagegen`/`webfetch`** | Thấp | Ghi đè hệ thống đang chạy bằng bản nhỏ hơn | G5 |
| **R6** | **`history-search` lộ đường dẫn home ra overlay** | Trung bình | `AGENTS.md` "TUI Sanitization" bắt buộc `shortenPath()` + `replaceTabs()`; session JSONL chứa cwd thật | Bước 7 (fixture) + review |
| **R7** | **`model-fallback` bị chặn vĩnh viễn bởi `ctx.sessionSettings` = 0 hit** | Cao | Hạng 4 hóa ra là sóng seam, không phải sóng này | Cổng P2 dưới đây |
| **R8** | **Công ước của hạng 4-6 là ước lượng, không phải đo** | — | Tôi chỉ đọc `index.ts` của chúng. Nếu `model-fallback` cần cả tầng settings, ~1,5 ngày là sai | Cổng P2 |

### Ba cổng còn mở — chặn, và cần người quyết

| # | câu hỏi | chặn cái gì | vì sao không tự quyết |
|---|---|---|---|
| **P0** | `/help` có được liệt kê lệnh của extension không? | `help` (hạng 1) | Quyết định sản phẩm, không phải quyết định kỹ thuật. Nếu "không", hạng 1 đổi thành `tool-pair-guard` |
| **P2** | Cho `model-fallback` mở seam `ctx.sessionSettings` (một `ExtensionContext` mới, khoảng 20 dòng), hay viết bảng cấu hình riêng cho nó? | `model-fallback` (hạng 4) | Mở `sessionSettings` là **mở hạ tầng** — nó không thuộc sóng "không mở seam". Chạm vào là đổi bản chất milestone |
| **P3** | `anthropic-bash` có đáng chờ KDL axis không? | `anthropic-bash` (hạng 6) | `AGENTS.md` **cấm** hard-code chính sách theo model trong TS. Không có axis thì đây là vi phạm luật, không phải quyết định lợi nhuận |

**Không port trong sóng này, ghi để không ai port trùng:** `loop-guard` (cần `agent_settled`, 0 hit ở omp — thuộc sóng seam; và omp **đã có** `ToolCallLoopGuard` tại `packages/ai/src/utils/tool-call-loop-guard.ts:68`, đã test, đã dùng ở `src/session/stream-guards.ts:220`) · `hooks` (4.663 dòng) · `rules` (2.842 dòng) · `permission-system` (1.638 dòng, kiến trúc approval không tương thích) · `account` (không có `CredentialAccountSummary`/`pinCredentialAccount`/`ctx.sessionSettings` ở omp) · `tool_search` (không phải tool của omp; 8 hit là tên tool server-side của provider).

## Minh bạch về cái tôi đã và không đo

- **Đã đo, 3 phương pháp khớp nhau:** 13 builtin (đường dẫn thật `packages/coding-agent/src/core/extensions/builtin/`, 59 mục chứ không phải 40) · dòng `.ts` không test cho từng cái · `on("…")` của từng cái · `changes.md` có hay không · `BUILTIN_TOOL_NAMES` nguyên file.
- **Đã kiểm chứng từng dòng neo trong bảng "File cần chạm tới"** — không có neo nào chép từ tài liệu trước. Riêng `runner.ts:1820/1827/1841/1843` là tôi tự đọc.
- **Chưa đọc:** `hooks/` (23 file), `rules/` (19 file), `permission-system/` (15 file), `imagegen/` (7 file) — nên các mục "❌ bỏ" dựa trên **cỡ + thiếu phép đo cắm core**, không phải đọc code. Đây là lý do công ước của hạng 4-6 là ước lượng.
- **Bác bỏ được hai khẳng định của nghiên cứu trước**, bằng đo lại: (a) "`loop-guard` thật sự không cần seam" — nó dùng 8 event, gồm `agent_settled`; (b) "3 builtin seam-free thật sự là loop-guard / bash-timeout / history-search" — `bash-timeout` **đã có** ở omp, và `loop-guard` **không nằm trong 13**.
- **Hai bẫy phép đo đã biết vẫn còn hiệu lực** (`SENPI_FINDINGS.md` §7.18): `git grep -E '\b…\b'` trả 0 trên macOS — tôi dùng `git grep -w`; `git ls-files '<pathspec>'` là hợp nhất, không lọc theo thư mục — tôi dùng `find`. Và tôi tìm thêm **bẫy thứ ba**: đường dẫn `builtin/<tên>` ở gốc cây senpi **không tồn tại**; dùng nó sẽ cho 13 kết quả `MISSING-DIR`.

### Phản biện — đọc trước khi làm

Agent phản biện đọc toàn bộ work item trên và cố **bác bỏ** nó. Bản đầy đủ: `.lavish-wip/m7-md/verify-seamfree.md`. Các sửa bắt buộc đã được đưa vào thân work item; những gì còn lại ở đây.

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

---

## Sóng 2 — LOOKAT: đo lại rồi mới quyết

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

### Phản biện — đọc trước khi làm

Agent phản biện đọc toàn bộ work item trên và cố **bác bỏ** nó. Bản đầy đủ: `.lavish-wip/m7-md/verify-lookat.md`. Các sửa bắt buộc đã được đưa vào thân work item; những gì còn lại ở đây.

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

---

- **`look_at`** — phạm vi bị đảo ngược bởi phép đo: omp đã có toàn bộ lõi dưới tên
  `read <ảnh>?q=<câu hỏi>` (`image-question.ts` 181 dòng, `image-vision-fallback.ts` 197,
  `vision-guard.ts` 68). Work item bên dưới là **đo lại rồi quyết**, không phải port.
- **Số event của omp** là 41, không phải 46. Bốn nguồn trong nghiên cứu cho bốn số khác nhau;
  ba phương pháp đo độc lập đều ra 41 với danh sách giống hệt, và 46 không tái lập được.
- **Cổng `git grep` phải giới hạn phạm vi.** Bản thảo đầu của work item `tool-pair-guard` dùng
  `git grep` không có `-- <path>`, nên lệnh "rỗng" lúc đo lại lại khớp chính file kế hoạch đang
  viết. Bản thảo đó đã sửa; quy tắc giữ lại cho mọi cổng về sau.

---

# Phụ lục — work item bị rút và phản biện

## `tool-pair-guard` — đã bị rút, và vì sao

Work item này ban đầu dự kiến ~120-435 dòng. Cổng do chính nó viết ở bước 2 nói: *"nếu danh
sách rỗng, tức mọi entrypoint đều đã bật, thì work item này không tồn tại — dừng"*. Khi chạy,
danh sách rỗng:

```bash
$ git grep -lw buildResponsesInput -- packages/ai/src
packages/ai/src/providers/azure-openai-responses.ts
packages/ai/src/providers/openai-responses.ts
packages/ai/src/providers/openai-shared.ts
```

Đó là toàn bộ: một định nghĩa và hai entrypoint, cả hai đã truyền `repairOrphanOutputs: true`
(`azure:384`, `openai-responses:1218`). Anthropic và chat-completions đều đã phủ ở
`transform-messages.ts` (`"No result provided"` ở `:1118`, orphan `tool_result` ở `:1218`).

**Cổng đỏ nghĩa là work item không tồn tại.** Ghi lại ở đây thay vì xoá, vì một work item bị rút
vì lý do đo được là thông tin đáng giữ.

Phản biện cũng bác bỏ phần lập luận dẫn tới kết luận: bản thảo nói *"không có dòng nào tham
chiếu tầng dưới"*, nhưng dòng 1 của file bên senpi là
`import { sanitizeAnthropicToolPairs ... } from "@earendil-works/pi-ai"` — tức có tiêu thụ một
export của chính tầng đó. **Kết luận cuối vẫn đứng vững** (không có gì để port, đo độc lập), nhưng
lập luận thì hỏng, và hỏng theo hướng làm người đọc tin rằng senpi không có gì ở tầng `packages/ai`.

## Sáu file phản biện

Mỗi work item ở trên đã qua một agent phản biện riêng, có nhiệm vụ **bác bỏ** chứ không đồng ý.
Bảy trong số những lần sửa quan trọng nhất:

| work item | sửa |
|---|---|
| SEAM | `setModel`/`setActiveTools` **đã có sẵn** ở `types.ts:1501`/`:1507` với handler ở `:1756`/`:1758` — S3 chỉ còn một việc, effort tụt từ 10-12 xuống ~5 ngày. Và không có "3 hằng `setSession*`": `setSessionTitle` và `setSessionLabel` đều **0** ở cả hai cây. |
| SEAMFREE | Cổng P0 chặn nhầm: omp **đã có** `getCommands()` (`get-commands-handler.ts:13-14` nói rõ builtin bị cố ý loại), nên đây không phải blocker kỹ thuật. |
| SEAMFREE | Đề xuất bước đầu tiên `directory-resolution.ts:69` bị bác bỏ: dòng đó không quét cây omp. |
| LOOKAT | Phạm vi đảo ngược: omp đã giải xong bài toán dưới tên khác. |
| CACHE | Phân biệt phải rõ: **đánh dấu** cache omp đã có (`CacheRetention` ở `packages/ai/src/types.ts:124`, `anthropicCacheRefresh: true` ở `sdk.ts:4111`); chỉ phần **làm ấm** là thiếu. |
| PAIRGUARD | Một cổng tự khớp chính file đang viết; và hai con số "3" trong tài liệu là hai thứ khác nhau nên cổng dựa trên chúng vô nghĩa. |
| (tất cả) | Bẫy `git grep` không lọc đuôi file: `executeTool` khớp 2 file nếu không giới hạn `*.ts`, vì hai file đó là `changes.md` **của chính senpi**. Claim gốc (0 file) là đúng; phép đo suy ra sai thì tôi tự phát hiện khi kiểm lại. |

Toàn bộ file đặc tả và phản biện nằm ở `.lavish-wip/m7-md/` (12 file, 2.977 dòng) — thư mục đó
gitignored, nên **reviewer phải đọc tài liệu này, không đọc thư mục đó**.

## Những điều chưa được kiểm chứng

- Chưa ai thử chạy một extension thật của senpi trên omp. Mọi kết luận về "chạy được ngay" là
  từ **tương thích bề mặt API đo tĩnh**, không phải từ lần chạy thử.
- Chưa đo chi phí thực tế của việc hạn chế `systemPrompt` — con số "cộng 1-2 ngày" là ước
  lượng, chưa có cơ sở đếm.
- Chưa có ai quyết ba câu hỏi sản phẩm: P3, P0, PC. Chúng chặn work item, không phải hướng dẫn.
- Tỉ lệ "cắm core" của senpi (`253/564 = 44%`) là **tự-báo-cáo của tác giả senpi** trong
  `changes.md` của họ, không phải kiểm chứng độc lập. Có nguồn đưa ra mẫu số khác (509). Chưa
  chốt được mẫu số đúng.
- Không đo: ảnh cho `look_at` tốn bao nhiêu token; danh sách provider thật của `websearch`
  (26 là số *file provider*, không phải số provider đăng ký).

## Định nghĩa hoàn thành

M7 xong khi, và chỉ khi:

1. W0 đóng: `NOTICE.md` của omp tồn tại, có attribution cho từng đóng góp lấy từ senpi, kèm
   commit SHA; và có test đỏ được khi hai bản sao lệch nhau.
2. Cả bốn seam mở, hoặc có quyết định bằng văn bản rằng bốn cái tên sẽ **không** mở.
3. Warm cache chạy, có mặc định chi phí đã chốt, và tắt được mà không phát thêm request nào.
4. Cổng `parseJsonlLenient` của mọi work item đọc session đều xanh **và cổng JSONL đỏ được**
   khi ai đó dùng `JSON.parse` trực tiếp.
5. Cổng của `tool-pair-guard` vẫn đỏ — tức không ai vô tình bật lại cờ đó mà không biết mình
   đang làm gì.
