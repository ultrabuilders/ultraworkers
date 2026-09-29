# BÁO CÁO SẴN SÀNG TRIỂN KHAI — tám kế hoạch milestone của `omp`

Đo trên cây `omp` tại `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `6e8109d`, ngày 2026-09-28.
Mười tài liệu trong phạm vi: `MILESTONE_1`, `MILESTONE_1B`, `MILESTONE_2` … `MILESTONE_7`,
`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (sau đây gọi tắt là **master**), và
`PACKAGE_REORGANIZATION_PLAN.md` (sau đây gọi tắt là **REORG**).

## Cách đọc bảng trạng thái

Ba mức verdict, theo một tiêu chí duy nhất có thể phán đoán:

- **SẴN SÀNG** — kỹ sư mở file, đọc tuần tự, làm theo từng bước mà không phải tự phân xử một mâu
  thuẫn, và không dừng ở một cổng không bao giờ xanh.
- **CẦN SỬA** — thiết kế đúng, nhưng văn bản còn tự mâu thuẫn hoặc trỏ vào một cổng chết. Sửa văn
  bản là đủ, không cần quyết định kiến trúc mới.
- **CHƯA ĐỦ** — tài liệu chưa chứa quyết định mà người đọc cần để bắt đầu, hoặc điều hướng sai khiến
  người đọc bỏ sót cả một kế hoạch.

| Tài liệu | Dòng | Verdict | Blocking | Major |
|---|---|---|---|---|
| `MILESTONE_1_EXECUTION_PLAN.md` | 3.904 | **CẦN SỬA** | 2 | 0 |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 2.789 | **CẦN SỬA** | 3 | 0 |
| `MILESTONE_2_EXECUTION_PLAN.md` | 4.536 | **SẴN SÀNG** | 0 | 1 |
| `MILESTONE_3_EXECUTION_PLAN.md` | 2.843 | **SẴN SÀNG** | 0 | 0 |
| `MILESTONE_4_EXECUTION_PLAN.md` | 2.011 | **SẴN SÀNG** | 0 | 1 |
| `MILESTONE_5_EXECUTION_PLAN.md` | 4.792 | **CẦN SỬA** | 1 | 0 |
| `MILESTONE_6_EXECUTION_PLAN.md` | 1.416 | **SẴN SÀNG** | 0 | 1 |
| `MILESTONE_7_EXECUTION_PLAN.md` | 1.899 | **SẴN SÀNG** | 0 | 0 |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (master) | 22.032 | **CHƯA ĐỦ** | 2 | 4 |
| `PACKAGE_REORGANIZATION_PLAN.md` | 1.240 | **CHƯA ĐỦ** | 0 | 3 |

**Cách đếm.** Tổng 8 blocking / 10 major. Bốn blocking là ba lỗi khác nhau nằm ở ba nơi: phạm vi
`durable` được sửa trong M1B (1) và trong bảng *Định nghĩa hoàn thành* của chính M1B (2) và trong bảng
*Thứ tự migrate* của M1B (3) — chúng là ba câu trả lời ngược nhau cho **cùng một câu hỏi**, và chỉ
câu đầu mới đúng. Blocking còn lại: W8 (M1), bảng milestone thiếu M1B/M7 (master), mâu thuẫn thứ tự
M5 (master + M5), ô "package thứ ba" ghi *Chưa xác định* (M1 + master). Bốn lỗi này không phụ thuộc
lẫn nhau và sửa được trong một buổi.

---

## Những thứ chặn triển khai

Gom theo **loại lỗi**, không theo file. Mỗi mục: claim sai → vì sao nguy hiểm → lệnh kiểm → bản sửa
dán được.

### A. Cổng đỏ vĩnh viễn — tài liệu bắt làm thứ upstream đã xoá

**Một.** `MILESTONE_1_EXECUTION_PLAN.md` §W8, sửa vòng prompt-cache refresh ở tầng stream: thay
`ANTHROPIC_CACHE_TTL_MS` tại `packages/ai/src/stream.ts:1209`, mở `anthropicCacheRefresh` thành
tri-state ở `packages/ai/src/types.ts:439`, bật/tắt qua `packages/coding-agent/src/sdk.ts:4111`.
Cổng hoàn thành ở dòng 1748 là:

```bash
test ! -e packages/coding-agent/src/session/cache-warmer.ts
```

**Vì sao nguy hiểm.** Upstream `18.3.5` đã xoá sạch tầng stream-level keep-alive mà W8 định sửa — đây
là breaking change được ghi thẳng trong `packages/ai/CHANGELOG.md:37` — và thay bằng đúng file mà
cổng W8 cấm. Bốn neo W8 chỉ định không còn tồn tại. Kỹ sư đi đúng hướng dẫn sẽ tìm một hằng số không
có, viết lại một interface field không có, rồi dừng ở cổng. Cổng này **không bao giờ xanh**, và nó
nằm ở dòng 1748 — rất sâu, sau khi đã tốn phần lớn công của W7.

```bash
test -e packages/coding-agent/src/session/cache-warmer.ts && wc -l packages/coding-agent/src/session/cache-warmer.ts
test -f packages/coding-agent/test/cache-warmer.test.ts && wc -l packages/coding-agent/test/cache-warmer.test.ts
rg -c 'anthropicCacheRefresh' packages/ai/src/types.ts packages/coding-agent/src/sdk.ts
rg -c 'ANTHROPIC_CACHE_TTL_MS' packages/ai/src/stream.ts
test -f packages/ai/test/anthropic-cache-refresh.test.ts || echo "ABSENT"
```

Kết quả: `599` dòng, `399` dòng, `0` hit, `0` hit, `ABSENT`.

**Bản sửa.** Mở đầu `## W8.` bằng khối cảnh báo, theo đúng khuôn M1B dùng cho đính chính tầng B/C:

> ### ⛔ ĐÍNH CHÍNH 2026-09-28 — W8 nằm ngoài phạm vi; cổng của nó đỏ vĩnh viễn
>
> Upstream 18.3.5 đã xoá sạch tầng stream-level keep-alive mà W8 định sửa
> (`packages/ai/CHANGELOG.md:37`, breaking change #12699) và dựng thay bằng
> `packages/coding-agent/src/session/cache-warmer.ts` (599 dòng) + `test/cache-warmer.test.ts`
> (399 dòng). Bốn neo mà W8 chỉ định — `stream.ts:1209`, `types.ts:439`, `sdk.ts:4111`,
> `settings.ts:863` — không còn tồn tại. **Cổng `test ! -e packages/coding-agent/src/session/cache-warmer.ts`
> ở dòng 1748 giờ đỏ vĩnh viễn; đừng chạy nó, đừng cố làm nó xanh.** Cổng chi phí mà W8 từng hỏi đã
> được giải quyết bằng cờ `providers.cacheWarming` (`settings.ts:1120-1121`).

Rồi gỡ W8 khỏi bảng wave 3a ở dòng 129 và khỏi sơ đồ hard-edge (dòng 143-149, nhánh `W8 ◀── W7`),
thay bằng một dòng ghi chú — cùng cách M7 đã làm cho work item WARM của nó. Với W7: giữ nguyên W7
(lập luận về trục `promptCacheLifetime` trong KDL vẫn đúng) nhưng sửa hai mệnh đề đã thành sai —
dòng 1534 "W7 và W8 dự định ship như một đơn vị" và dòng 1380 "Ship W7 mà không kèm W8 thì không có
gì quan sát được thay đổi". Áp cùng cách này cho bản sao trong master ở dòng 1977, 2155, 2171,
2199-2214, 4121-4122, 4158-4159.

### B. Ba câu trả lời ngược nhau cho cùng một câu hỏi: "chép package nào"

**Hai.** `MILESTONE_1B_EXECUTION_PLAN.md` mở đầu bằng mục *ĐIỀI CHỈNH PHẠM VI 2026-09-28* (dòng
15-38) chốt sáu package, bỏ `durable`. Nhưng phần thân cùng file vẫn trả lời ngược lại, và câu trả
lời ngược lại nằm ở đúng những chỗ kỹ sư đọc để **quyết định**, không phải ở chỗ chú thích:

- dòng 3 (mở đầu) — "chuyển toàn bộ **bảy** package";
- dòng 299 (bảng *Thứ tự migrate*) — hàng 5 vẫn là `@oh-my-pi/pi-durable | packages/durable`;
- dòng 314-316 — `workspaces.catalog` vẫn phải đăng ký `@oh-my-pi/pi-durable`;
- dòng 1000 — "Thứ tự bắt buộc là `chord` → `protocol` → `server` → `client` → **`durable`** →
  `telemetry` → `evals`";
- dòng 2775 (*Định nghĩa hoàn thành*) — "Đợt này xong khi cả **bảy** package — `chord`, `protocol`,
  `server`, `client`, `durable`, `telemetry`, `evals` — đã nằm trong cây";
- dòng 2773 — hàng `| AGENTS.md (áp cho cả 7) |` với glob
  `packages/{chord,protocol,server,client,durable,telemetry,evals}/src`.

**Ba.** Cùng file, bảng *Định nghĩa hoàn thành* (dòng 2770) vẫn gate toàn đợt trên `packages/durable`
với sáu điều kiện cụ thể, trong đó có `bun test packages/durable` xanh.

**Vì sao nguy hiểm.** Mục *Điều chỉnh* tự thừa nhận điều này ở dòng 31, nhưng "hai việc phải làm cùng
lúc" của nó là hai câu **mô tả**, không phải hai chỉnh sửa, và cả hai đều chưa được thực hiện. Kỹ sư
mở *Định nghĩa hoàn thành* để biết khi nào được dừng sẽ chép `durable`. Kỹ sư mở *Thứ tự migrate*
để bắt đầu cũng sẽ chép `durable` — 63 file, 21.093 dòng mà chính tài liệu gọi là package chết. Và
DoD sẽ **không bao giờ xanh**: 21.093 dòng code chết được build lại rồi vẫn thiếu một cái gì đó.

```bash
grep -n -E 'bảy package|7 package' MILESTONE_1B_EXECUTION_PLAN.md
awk 'NR>=314 && NR<=316' MILESTONE_1B_EXECUTION_PLAN.md
awk 'NR==2775' MILESTONE_1B_EXECUTION_PLAN.md
ls packages/ | grep -x durable || echo "packages/durable chưa tồn tại"
```

Mười lần xuất hiện "bảy package", không lần nào trong đó nói "trước đây là 7".

**Bản sửa — chọn MỘT câu trả lời và làm nó thành duy nhất.** Nếu giữ phạm vi sáu (đúng với lập luận
"durable là package chết"), thêm ngay sau dòng tiêu đề 1 của M1B, TRƯỚC mọi thứ:

> ## PHẠM VI ĐÃ CHỐT — SÁU package, `durable` KHÔNG nằm trong đợt này
>
> `chord`, `pi-protocol`, `pi-server`, `pi-client`, `pi-telemetry`, `pi-evals`. Mọi câu "bảy package"
> còn lại trong file này — dòng mở đầu, bảng *Thứ tự migrate* hàng 5, khối `workspaces.catalog`, mục 5,
> và *Định nghĩa hoàn thành* — là **văn bản cũ, đã bị mục này ghi đè**. Khi đọc thấy chúng, đọc mục
> này trước. Mục 5 **KHÔNG phải** work item; nó là tài liệu tham khảo, không ai được làm theo.
>
> `durable` không bị loại vì thiếu giá trị — nó bị loại vì không package nào trong `pi` import nó, và vì
> tầng session thật sự chạy nằm ở `agent/harness/session/jsonl/`, nơi omp đã mạnh hơn
> (`parseJsonlLenient` + `#rewriteRequired`). Hệ quả phải nói thẳng: **lỗ hổng bằng chứng ở M1 về
> nửa "document" đã được điền** — xem `MILESTONE_1_EXECUTION_PLAN.md:64`.

Rồi sửa ba chỗ để hết mâu thuẫn:

1. dòng 3 → "chuyển **sáu** package";
2. bảng *Thứ tự migrate* → xoá hàng 5, đánh số lại 6→5, 7→6; thêm một dòng ghi chú ngay dưới bảng
   ghi rõ `durable` đã bị gỡ ngày 2026-09-28 và lý do; sửa dòng 1000 cho khớp;
3. dòng 2770-2775 → xoá hàng `| durable | Sáu điều kiện… |`, đổi hàng AGENTS.md thành
   `| AGENTS.md (áp cho cả 6) |` với glob
   `packages/{chord,protocol,server,client,telemetry,evals}/src`, và đổi câu kết thành: "Đợt này
   xong khi cả **sáu** package — `chord`, `protocol`, `server`, `client`, `telemetry`, `evals` — đã
   nằm trong cây, `bun run check:ts` xanh, **và** mọi cổng `bun test` trong bảng trên đã có kết quả —
   28 case `protocol`, 41 case `server`, và 4/4 file `evals`."

4. Đổi tiêu đề mục 5 thành `## 5. durable — TÀI LIỆU THAM KHẢO, NGOÀI PHẠM VI` và thêm ngay dưới
   nó: *"**Không chép package này trong đợt này.** Toàn bộ mục này được giữ lại **vì** nó là nguồn
   duy nhất của đặc tả `docs/pico-v5.md` (mục 5.4 Scheduler, mục 6 Submissions/Inbox, mục 7 Hooks,
   mục 8 built-in tasks), tức là năng lực task/scheduler mà omp chưa có. Ai cần nó sau này thì đọc ở
   đây, không chép theo các bước bên dưới."*

**Bốn.** Cùng mâu thuẫn đó, ở **master**: dòng 44 vẫn kết luận về `durable` là *"Nguồn thì có:
`packages/durable/src/documents.ts`, 7,7 KB. **Chép nó vào là đóng lỗ hổng.**"*, và bảng ở dòng 29-35
vẫn tính `232` file. Master là tài liệu được đọc đầu tiên và tự phong là nguồn sự thật, nên câu đó sẽ
đưa kỹ sư chép 21.093 dòng code chết — đúng việc M1B đã gỡ. Sửa bảng: bỏ hàng `durable`, đổi "Bảy
package" → "Sáu package", tổng `232` → `165 file`, thêm hàng ghi chú cuối bảng trỏ về mục *Điều chỉnh
phạm vi* của M1B. Sửa dòng mục lục 409: "(7 package, 232 file)" → "(6 package, ~165 file)".

*Nếu ngược lại — giữ bảy package — thì xoá hẳn mục Điều chỉnh dòng 15-38 và sửa lại lập luận ở
`SENPI_FINDINGS.md`, vì lập luận "code chết" không đủ để bác một quyết định đã commit. Đây là hai
lựa chọn thật, phải chọn một; hiện tại tài liệu đang trả lời cả hai.*

### C. Bảng điều hướng bỏ sót hai cả kế hoạch

**Năm.** Master tự phong là "nguồn sự thật cho việc triển khai" và bảng *THỨ TỰ MILESTONE* liệt kê
sáu milestone `M1 → M2 → {M3, M4} → M5 → M6` với câu **"M6 là điểm cuối của mọi thứ"**. M1B (2.789
dòng, phần bắt buộc để M1 "bao trọn `pi`") và M7 (1.899 dòng, 4 work item) **không xuất hiện ở bất kỳ
hàng nào**, không có hàng phụ thuộc, không được cộng vào tổng.

```bash
rg -n '^\| [0-9]+ \| \*\*M' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
rg -c 'M1B' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
rg -c 'WI-ECOSYS' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
awk 'NR>=256 && NR<=268' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
```

Sáu hàng, không M1B, không M7. `M1B` chỉ xuất hiện **một** lần ở dòng 19776, trong ngữ cảnh session
của M7, và chỉ là con trỏ chéo. `WI-ECOSYS` — không lần nào. Tổng ghi `Work item 83 / Wave 36` là
đúng cho M1-M6 và im lặng về phần còn lại. Bảng MỤC LỤC ở dòng 405-419 cũng không có M1B lẫn M7. M7
được inlined vào master ở dòng 19698, nên người đọc master không có cách nào biết nó tồn tại nếu
không cuộn hết 22 nghìn dòng.

**Vì sao nguy hiểm.** Đây là lỗi làm mất việc, không phải lỗi trình bày. Người đọc master — đúng người
được dẫn vào để lập kế hoạch — sẽ lên lịch M2 (8-10 engineer-weeks), rồi M3/M4, rồi M5, rồi dừng ở
M6, và **hoàn toàn không thấy** M1B: sáu package, khoảng 245 file phải chép, với điều kiện tiên quyết
cứng là *"Mọi work item trước đó trong M1 phải xong"*.

**Bản sửa.** Thêm hai hàng vào bảng *THỨ TỰ MILESTONE*:

```
| 1b | **M1B** | Chuyển 6 package còn lại của `pi` vào omp + tầng B/C | M1 | 6 package + 3 (sóng 0.5) | 0.5 + 6 | L (chưa ước lượng) |
| 7  | **M7**  | Tính năng lấy từ senpi + bốn seam API | M1B, M2 | 4 | 4 | S+M (~7–8 engineer-day) |
```

Sửa dòng 285 thành: **`M1 → M1B → M2 → {M3, M4} → M5 → M6`**, kèm câu "M7 chạy song song được với
M2 — kiểm chứng: `rg -c 'registerEntryRenderer' MILESTONE_2_EXECUTION_PLAN.md` ra 0 hit, tức M7 S2/S3/S4
chỉ thêm API mới chứ không sửa cái M2 đã cắt." Sửa hai ô ở dòng 262-263 thành
`Work item | 83 (M1–M6) + 9 (M1B) + 3 (M7)` và `Wave | 36 (M1–M6) + 7 (M1B) + 4 (M7)`. Thêm hai
hàng M1B và M7 vào bảng MỤC LỤC ở dòng 405-419.

### D. Ba phát biêu loại trừ lẫn nhau về thứ tự M5

**Sáu.** Master dòng 280 xếp M5 **sau** M3/M4 (cột phụ thuộc ghi `M1–M4`); master dòng 288-289 nói
**"M5 không cần M3 hay M4 về mặt kỹ thuật"**; còn `MILESTONE_5_EXECUTION_PLAN.md:3` nói M5 **"là điều
kiện tiên quyết thực tế cho M3 và M4, vì cả hai đều giả định tên thương hiệu đã ổn định"**.

```bash
awk 'NR>=284 && NR<=292' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
awk 'NR==3' MILESTONE_5_EXECUTION_PLAN.md
rg -c 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md
rg -c 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md
```

M3 trả về **1** hit và nó là một đường dẫn filesystem, không phải giả định tên. M4 trả về **2** hit, cả
hai đều là đường dẫn `.lavish-wip/`. **Không milestone nào giả định tên thương hiệu.** Tiền đề thật
của M5 nằm ở `MILESTONE_5_EXECUTION_PLAN.md:171`: *"**M2 phải đã merge**: bảng `legacy-pi-compat` đóng
băng, exports map chốt trên `main`."*

**Vì sao nguy hiểm.** Master tự nói *"Ai code theo tài liệu này thì không cần suy lại — đọc là làm"*.
Kỹ sư sẽ dừng ở mâu thuẫn thứ ba, hoặc tệ hơn là chọn nhánh sai và xếp lịch 6 tuần M5 ở cuối chuỗi,
trong lúc phần thật sự chặn M5 là hai điều kiện lead-time dài **không thuộc milestone nào** và cần
mở sớm.

**Bản sửa.** Sửa master dòng 280 thành phụ thuộc `M2`, và thay đoạn 288-289 bằng:

> - **M5 chỉ phụ thuộc cứng M2** (bảng `legacy-pi-compat` đóng băng, exports map chốt trên `main`).
>   Nó **không** phụ thuộc M3 hay M4 — kiểm chứng: M3 và M4 không có tham chiếu nào tới thương hiệu,
>   `APP_NAME` hay rebrand. Chạy M5 song song với M3/M4 ngay khi M2 merge.
> - **Hai điều kiện có lead time dài của M5 nằm ngoài chuỗi phụ thuộc và nên mở sớm:**
>   `scripts/rename/keep-list.txt` phải có trên `main` và được một người duyệt khác người viết
>   (chặn nguyên sóng 3), và scope npm `@ultraworkers` phải tồn tại (nằm ngoài repo).

Rồi sửa `MILESTONE_5_EXECUTION_PLAN.md:3` cho khớp: đổi "là điều kiện tiên quyết thực tế cho M3 và
M4" thành "chỉ phụ thuộc cứng M2; hai điều kiện lead-time dài của nó nên mở song song với M3/M4".

### E. Ô trống ghi "chưa xác định" cho một thứ đã chốt từ trước

**Bảy.** Master dòng 471-476 và `MILESTONE_1_EXECUTION_PLAN.md` dòng 48-53 đều có bảng *"Không làm
gì"* ghi ba package của `pi` bị từ chối, trong đó ô thứ ba ghi **`*(package thứ ba)*` | — | Chưa xác
định. Xem bảng quyết định ở mục dưới.`** Master dòng 588 còn giao một việc cho Maintainer với nội
dung: *"**Package `pi` thứ ba bị từ chối — tên và thay thế là gì.**"*

```bash
awk 'NR>=469 && NR<=476' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
awk 'NR==588' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
rg -n 'chưa xác định' MILESTONE_1_EXECUTION_PLAN.md
rg -n 'bị loại khỏi M1' MILESTONE_1_EXECUTION_PLAN.md
```

**Vì sao nguy hiểm.** Quyết định kiến trúc commit `1454dc0` đã chốt: package thứ ba là **`chord`**, và
quyết định là **CHÉP** nó (nó nằm trong bảng 7 package), không phải từ chối. Commit đó ghi thẳng vào
message: *"M1's 'Không làm gì' currently records chord, durable and session-backends as waived, and
that is now wrong."* Bảng vẫn ghi nguyên văn như cũ. Tệ hơn: M1 tự mâu thuẫn với chính nó — dòng 56
nói *Chưa xác định*, dòng 3884 nói *"`chord`, `durable`, `session-backends` bị loại khỏi M1"*. Và
dòng 588 vẫn giao một việc cho người quản lý đã có đáp án.

**Bản sửa.** Trong cả hai file, thay toàn bộ mục *Không làm gì* bằng:

> ## Không làm gì — ĐÃ BỊ QUYẾT ĐỊNH KIẾN TRÚC ĐẢO NGƯỢC (2026-09-28, commit `1454dc0`)
>
> Bản trước của mục này ghi ba package "không port": `session-backends`, `durable` (một phần), và
> một package thứ ba **chưa xác định**. Cả ba dòng đó hết hiệu lực. Lý do: `pi` là MIT (Copyright
> (c) 2025 Mario Zechner), nên chép rẻ hơn và ít rủi ro pháp lý hơn tái tạo; bốn package dùng chung
> đã phân kỳ 100% (0 file giống từ byte), nên mọi lần chép về sau phải là thao tác cơ hệc.
>
> | Package của `pi` | Quyết định hiện hành |
> | --- | --- |
> | **`chord`** | **CHÉP** — đây là package thứ ba từng ghi "Chưa xác định". Nó là tầng runtime composition phục vụ `server`/`client`/`durable`, không phải cơ chế vòng đời extension. |
> | `durable` | **KHÔNG chép** — package chết, 0 file ngoài nó import. Xem *Điều chỉnh phạm vi* 2026-09-28 trong `MILESTONE_1B_EXECUTION_PLAN.md`. |
> | `session-backends` | **Còn để ngỏ** — đây là package duy nhất trong ba cái không nằm trong quyết định kiến trúc. Thay thế hiện tại chỉ được kiểm **theo tên và bề mặt**, chưa chứng minh tương đương hành vi; W16 mới ép chúng trả lời cùng một bộ câu hỏi. |

Xoá hàng 5 khỏi bảng *"Quyết định cần chốt trước khi code"* ở master dòng 588, thay bằng ghi chú dưới
bảng: *(Hàng "package thứ ba bị từ chối" đã bị đóng bởi quyết định kiến trúc `1454dc0`: package thứ ba
là `chord`, và quyết định là chép chứ không phải từ chối.)* Sửa dòng 3884 của M1 thành: *"`chord` và
`durable` **không còn bị loại** — xem quyết định kiến trúc `1454dc0`. `session-backends` vẫn là thứ
duy nhất chưa có quyết định."*

---

## Lỗi mức major

Gọn, không lặp lại phần trên.

| # | Tài liệu | Vị trí | Lỗi | Sửa |
|---|---|---|---|---|
| 1 | master | 3-4 | Nguồn kiểm chứng không tồn tại: `oh-my-pi@5873776` không có trong repo (`git cat-file -t 5873776` → `Not a valid object name`), và `~/Projects/oh-my-pi` không tồn tại. Repo thật tên là `omp` ở `~/Projects/ultraworkers`, HEAD `6e8109d`. Bốn neo khác (`808b365`, `e040a60`, `106eb3e`, `ecd516f`) đều tra được. | Sửa dòng 3-4 thành "…trên cây đích `omp` tại `~/Projects/ultraworkers` — commit nền khác nhau theo từng milestone, xem bảng dưới." Sửa hàng đầu bảng NGUỒN, kèm dòng: *"trước khi dùng một neo, hãy chạy lại lệnh đo của nó — đây là quy tắc, không phải tuỳ chọn."* |
| 2 | master | 46, 409 + REORG | Quyết định 2 ("tổ chức lại package theo độ mịn của `pi`") được đặt ở ba nơi và không nơi nào thực thi nó. Cột "Phụ thuộc" của hàng M1 là `—`; ba điều kiện tiên quyết của M1B không có mục nào là tổ chức lại package; và `PACKAGE_REORGANIZATION_PLAN.md` **không được file nào trong repo trỏ tới** (`rg -l 'PACKAGE_REORGANIZATION' --glob '*.md'` ngoài `.lavish-wip` → 0 kết quả). Một tài liệu tự nhận là "điều kiện tiên quyết" mà không ai dẫn tới là orphan, không phải tiền đề. | Thêm hàng `\| 0 \| **R0** \| Tổ chức lại package theo độ mịn của `pi` \| — \| xem `PACKAGE_REORGANIZATION_PLAN.md` \| \| \|`, đổi cột phụ thuộc của M1 thành `**R0**`, và thêm vào *Điều kiện tiên quyết* của M1B một mục 0 giải thích vì sao: bốn package đã phân kỳ 100% nên chép lên cấu trúc hiện tại là ánh xạ tay từng file, không kiểm chứng được bằng gì ngoài đọc tay. |
| 3 | REORG | *Cổng kiểm bắt buộc* | Ràng buộc bảo toàn **2.046 file omp-only** chỉ có ở master dòng 78 (`1.341` trong `coding-agent`, `365` trong `tui`). REORG — tài liệu duy nhất mô tả thao tác di chuyển — không chứa số nào: `rg '2\.046\|1\.341\|365\|308' PACKAGE_REORGANIZATION_PLAN.md` → 0 hit. Cổng của nó chỉ có `check:ts`, `bun test packages/tui`/`ai`, và "mỗi bước gộp phải là một commit". Không có bất biến số file. Tệ hơn, chính REORG ghi ở dòng 47-48 rằng test của `coding-agent` **đang đỏ** vì native addon (913 pass / 1.445 fail) — tức cắt bên trong `coding-agent`, nơi chứa 1.341 file, **không có lưới kiểm thử đầy đủ**. Một file mồ côi bị mất trong lúc gộp sẽ không làm đỏ `check:ts`, không làm đỏ test, và không ai đếm lại. | Thêm mục thứ tư vào *Cổng kiểm bắt buộc*: chụp `git ls-files packages/ \| wc -l` trước bước gộp đầu, và sau **mỗi** commit gộp so lại — tổng số file trong `packages/` không được giảm; `prompts/` (223 file `.md`) và `tools/puppeteer/` (14 file `.txt`) không được giảm. Kèm câu: *"Mọi thao tác ở đây là `git mv` + sửa import. Không thao tác nào được phép xoá file; xoá là một work item riêng với lý do riêng."* |
| 4 | REORG | 643 vs 664 | §4.2 dòng 643 ghi `tools/puppeteer` **0 file** (thư mục rỗng — **nên xoá**). §4.6 dòng 664 ghi **KHÔNG xoá, tôi đã đoán sai**. Cùng một thư mục, hai chỉ dẫn ngược nhau; §4.2 là chỗ liệt kê "điểm mềm" nơi người đọc dừng mắt khi lập danh sách việc. | Sửa dòng 643 thành: "`tools/puppeteer` **14 file `.txt` + 0 file `.ts`** (**KHÔNG xoá** — xem mục 4.6; thư mục này trông rỗng chỉ vì ta đếm sai đuôi file)". Thêm đầu §4.6: *"**Đọc mục này TRƯỚC mục 4.2.** Mục 4.2 từng ghi `tools/puppeteer` là '0 file (thư mục rỗng — nên xoá)'. **Câu đó sai và đã bị gỡ.** 10 file trong `tools/browser/` nạp payload này lúc runtime. Xoá là hỏng chức năng, không phải dọn rác."* |
| 5 | M1B | 2770 | Hàng `\| AGENTS.md (áp cho cả 7) \|` trong DoD vẫn áp luật cho 7 package trong khi phạm vi là 6. | Theo cách sửa ở mục B.3. |
| 6 | M2 | 79-177 | `WI-SESSION-LOG` (dòng 221) và `WI-PRESTEP-1` (dòng 298), cùng thêm ngày 2026-09-28, **không nằm trong bất kỳ wave nào** và không có hàng nào trong bảng *Định nghĩa hoàn thành*. Kiểm chứng: `awk 'NR>=79 && NR<=177' MILESTONE_2_EXECUTION_PLAN.md \| rg -c 'SESSION-LOG\|PRESTEP'` → 0. WI-PRESTEP-1 tự mang chỉ dẫn thứ tự "Đặt trước M4-4" — một ràng buộc nằm ngoài lịch thực thi. Wave 1 của M2 là wave quyết định chặn cả sáu thứ; làm theo bảng wave thì hai mục này không bao giờ được lên lịch. Master vẫn ghi M2 = "15". | Thêm **Wave 1b** sau Wave 1: *"**Gồm:** WI-SESSION-LOG, rồi WI-PRESTEP-1. **Cần trước:** Wave 1 (WI-0 trust model). **Không chặn M4** theo thứ tự này, nhưng phải xong trước M4-4."* Sửa hai ô số liệu ở master dòng 277 và 410 thành 17. |
| 7 | M4 | 13 chỗ | `WI-4b` là cổng chặn M4-7, và M4 tự thừa nhận ở dòng 254 nó *"**chưa tồn tại** trong danh sách work item của kế hoạch M2 (WI-0..WI-13) — bản thân nó là một việc phải làm trước"*. Phía M2 đã có sẵn bản sửa đưa nửa kiểu vào WI-4, đang nằm trong bảng câu hỏi mở chưa ai duyệt. Hai tài liệu đang chờ nhau. | Chốt WI-4b trong M2 (thêm câu vào bước 3 của WI-4: *"Phần kiểu của WI-4b đã được hấp thụ vào đây (`Readonly<Record<string, ToolRenderer>>`); WI-4b không tồn tại như một work item riêng."*), rồi thay 13 tham chiếu ở M4 bằng một con trỏ. |
| 8 | master | 92, 18354-18360 | Master mô tả SUL-1.0 là *"non-sublicensable, **chỉ nội bộ/phi thương mại**"* và nói *"điều khoản `non-sublicensable` tự nó đã đóng phương án dùng code"*. `MILESTONE_6_EXECUTION_PLAN.md:32-46` đã đính chính rõ: SUL-1.0 **cấp quyền** *"use, copy, distribute, make available, and **prepare derivative works of**"* và cho phép sửa đổi + phát hành miễn phí phi thương mại — **đó là hiểu sai**. Master chưa hấp thụ, và bảng điều chỉnh tổng hợp của nó không có hàng nào cho đính chính này (đã kiểm: `awk 'NR>=21700 && NR<=21730' … \| rg -c 'SUL\|openagent'` → 0 hàng M6). | Thay dòng 92 và 18354-18360 bằng văn bản đính chính lấy nguyên văn từ M6:34-46, và thêm một hàng vào bảng *"BẢNG ĐÍNH CHÍNH TỔNG HỢP"* cạnh hàng M4 sẵn có ở dòng 21709. Kết luận thực dụng không đổi: **không chép dòng nào**, ý tưởng thì không có giấy phép bảo hộ. |
| 9 | M6 | toàn bộ | M6 là milestone duy nhất trong tám cái **chưa từng đi qua một vòng rà soát**. Kiểm chứng: `.lavish-wip/` có `m1b-review{,2,3}.js`, `m2-review{,2,wi12}.js`, `m3-review{,2,3}.js`, `m4-review{,2}.js`, `m5-review{,2}.js` — và **không có** `m6-review*`. Nó lại là đầu vào quyết định layout cho M3 (dòng 145: *"## Audit `opencode` — MIT — **quyết định layout cho M3**"*), và tự khai bốn điều kiện hoàn thành là **chưa đạt** — trong đó điều kiện A tự ghi *"**Chuyện này hiện đang hỏng**"*. | Rà soát M6 theo đúng khuôn M2-M5, giới hạn vào bốn điều kiện M6 tự nói là chưa đạt: hoà giải `opencode.md` §4 vs §5 (bốn hàng M6 đã liệt kê: `session-ui` 174 vs 147, `desktop` 397 vs 217, `plugin` 71 vs 63, `tui` 454 vs 455) và **xoá** bảng thua thay vì chú thích cả hai; thêm cột `lệnh` cho mọi bảng đo trong cả ba audit; đóng 2 trong 22 hàng quyết định còn mở; điền cột kết quả mong đợi trong checklist điều kiện D (đang trống ở mọi dòng). |

---

## Lỗi đã bị bác bỏ

Bảy phát hiện trông rất thuyết phục như **không đúng**. Ghi lại để người đọc không sửa nhầm.

**1. "Không tài liệu nào ghi nhận lỗ hổng `durable` bị mở lại."** — Sai. `MILESTONE_1_EXECUTION_PLAN.md:64`
ngay hai dòng dưới câu mà phát hiện trích, có nguyên văn: *"**Cập nhật 2026-09-28 — lỗ hổng này ĐÃ
ĐƯỢC ĐIỀN, và kết luận là đừng chép gì cả.**"* kèm lý do, cổng mở bắt buộc, và câu *"Hệ quả cho phạm
vi: `MILESTONE_1B_EXECUTION_PLAN.md` rút từ 7 package xuống 6, tiết kiệm 21.093 dòng."* Cả hai nằm
trong đúng commit `756afaf` mà phát hiện dẫn là "việc đảo ngược". Lỗ hổng đã được ghi nhận.

**2. "M6 hứa 15 work item / 5 wave nhưng file M6 không có work item nào."** — Sai. 15 work item **có
thật**, nằm trong chính master ở bảng gap dòng 21670 trở đi, dạng `| **M6** | **W1** … | **W15** |`.
M6 tự nói là tài liệu nghiên cứu không sinh dòng code nào, và DoD của nó là "mọi claim phải có lệnh
tái lập được" — đó là hợp đồng hợp lệ cho một milestone nghiên cứu. Vấn đề nếu có nằm ở cách master
định giá công, không nằm ở M6.

**3. "WI-4b có hai vế mâu thuẫn: phải thống nhất trước M4-7 nhưng lại xếp sau M4-7."** — Sai phần
cơ chế. Hai vế không ngược nhau: M4-7 bị chặn bởi **bản viết và sự thống nhất** của WI-4b (một
sự kiện cần người), không phải bởi **bản thân code** của WI-4b. Còn lại đúng: WI-4b không có chủ, và
M2 đã đề xuất cách đóng nó (xem major #7).

**4. "M3 và M4 chạy song song sẽ tạo hai bản vá độc lập trên cùng dải `setPluginSetting`."** — Sai
nguyên nhân. `rg -c 'M3-A4' MILESTONE_3_EXECUTION_PLAN.md` → 0: M3 không có work item nào tên
M3-A4, nên va chạm này không tồn tại như mô tả. Dải `setPluginSetting` là điểm va chạm thật — nhưng
giữa **M3 với M4-4/M4-6**, và cả hai bên đều đã ghi merge order tường minh.

**5. "M7 dính `git log -S` chết vì repo chỉ có một commit cho mọi dòng `src/`, và `NOTICE.md` không
tồn tại nên W0 không có chỗ ghi."** — Sai về số dòng và về cơ chế. `MILESTONE_7_EXECUTION_PLAN.md`
dài 1.899 dòng, không phải 21 nghìn; hai lệnh `sed` mà phát hiện dẫn trả về rỗng. Văn bản được trích
có thật, ở dòng 1794 và 1692. Phần đúng chỉ là: cảnh báo `git log -S` nằm sâu trong phụ lục, và
điều kiện W0 nói "`NOTICE.md` không tồn tại" mà không nói phải tạo file nào.

**6. "REORG §1 nói gộp 67→10 là việc chính, §9 nói không."** — Bác bỏ như một lỗi *bản sửa đề xuất*.
Hai mục đúng nguyên văn, nhưng cả hai đã được ghi nhận: §9 trả lời thẳng câu hỏi của chính quyết
định `1454dc0` bằng **"Không"**, và nói rõ *"phép đo đó chưa được làm"*. Vấn đề còn lại là thiếu một
dòng đính chính ở §1 — mức major, không phải blocking.

**7. "Gộp `tts` + `stt` sẽ đè 5 file trùng tên."** — Sai về rủi ro. Năm tên trùng có thật
(`downloader.ts`, `index.ts`, `models.ts`, `settings.ts`, `wav.ts`) và nội dung hai bên khác nhau, nhưng
`mv` không phải là thao tác bất khả thu hồi: `git revert` một commit gộp trả về đúng trạng thái trước,
và đó chính là quy tắc REORG đã đặt sẵn ("mỗi bước gộp phải là **một commit**").

---

## Phát hiện một nửa

Những cái một bên bác bỏ, một bên giữ lại, hoặc cần người quyết.

**a. `THIRD-PARTY-NOTICES.txt` — đoạn văn đúng, chỗ ghi sai.** Master mô tả một file notices 22.901
dòng với ba mục cấp cao, 201 package trong ba nhóm, 49 khối LICENSE khoá SHA-256, mục
`SCOPED NON-PERMISSIVE PACKAGES`. Mọi neo đều khớp **chính xác** với `THIRD-PARTY-NOTICES.txt` ở gốc
repo này (`:8`, `:827`, `:835`, `:1047`, `:1053`, `:10804`; `@babel/code-frame 7.29.7 — MIT` ở `:837`).
Nhưng đoạn văn nằm **trong khối pháp lý của `claude-code-ref`** — và repo đó **không có file notices
nào**, không phải trong working tree lẫn trong lịch sử (`git log --all --diff-filter=A -- '*THIRD-PARTY*'`
→ rỗng). Câu kết của đoạn văn lại là một **phán quyết tuân thủ**: *"the missing part, and only this
part, is the two non-redistributed groups."* Ghi dưới tên repo tham chiếu, người đọc kết luận lỗ hổng
thuộc về một checkout không ai được chép từ đó. Nó thuộc về chính omp — sản phẩm M5 sẽ phát hành
lại. **Cần người quyết một câu:** hai nhóm `DOWNLOADED-AT-RUNTIME` và `BUILD-ONLY` có thực sự không
đi kèm bất kỳ tarball nào không (xem `stageLegalPayloads()` tại `scripts/ci-release-publish.ts:111`).

**b. `session-backends` — rơi khỏi phạm vi mà không ai hỏi.** Master và M1 đều từ chối nó với mức tin
cậy *"chỉ xác minh theo tên và theo bề mặt"*, nhưng bảng 7 package của master và danh sách 6 package
của M1B đều **không có** nó, và không tài liệu nào đưa ra quyết định. Người đọc master không biết nó
từng tồn tại. Sau khi sửa mục *Không làm gì* ở mục E, đây là thứ duy nhất còn để ngỏ — và cần một câu
trả lời bằng văn bản, không phải một ô trống.

**c. Bao nhiêu thứ "chưa ai kiểm".** Các phát hiện ở trên đều dựa trên câu hỏi: *con số này còn đúng
không?* Có ba câu hỏi khác chưa có câu trả lời, và tôi không đo được chúng:

- **M2 WI-1 commit 1** — bảng *Cổng hoàn thành* nói ba file (có `types.ts`), bốn chỗ khác nói commit 1
  **không được** chạm `types.ts`. Chính M2 ghi đây là "mâu thuẫn nội tại chưa giải quyết"; nếu đúng
  là không chạm, con số là hai. Không được chọn âm thầm một trong hai.
- **M4-7 G1** — cùng một hợp đồng test nói test đỏ trên cây trước thay đổi (vì `argsComplete` bị rơi ở
  `wrapper.ts:62`) **và** xanh nếu chỉ thêm `rawArgs` vào hai interface. Cả hai không thể đúng. Bản
  tự kiểm "thêm `rawArgs` rồi quan sát" **chưa từng chạy**.
- **M4-9 mang cả hai nhánh (a) và (b)** của hợp đồng `shadowedBy`, và chúng cho ra hai khẳng định
  ngược nhau; điều kiện (4) của cổng được viết cho (b). Chưa ghi nhánh nào được chọn.

**d. Cổng không đỏ được — có thật, và đã biết cách sửa.** `git grep -c` trả **exit 1** khi không khớp
và **exit 0** khi có khớp. Kiểm chứng trên cây này:

```bash
git grep -c 'import' -- AGENTS.md >/dev/null; echo "có khớp -> $?"
git grep -c 'ZZZ_definitely_not_present_ZZZ' -- AGENTS.md >/dev/null; echo "0 khớp -> $?"
git grep -c writeFileWithFallback packages/coding-agent/src/tools/ast-edit.ts; echo "cổng W12 -> $?"
```

Kết quả: `0`, `1`, `1`. Nghĩa là cổng #4 của W12 (`MILESTONE_1_EXECUTION_PLAN.md:2532`) **đang đỏ
trên cây đúng** — đó là trạng thái đúng của nó, không phải lỗi. Nhưng exit code bị đảo ngược so với
ý nghĩa, và lệnh không được bọc trong `test`/`[ ]`/`||` nên nó chỉ là một lệnh in. Sáu lệnh GATE 1b
của M1B (`MILESTONE_1B_EXECUTION_PLAN.md:1167` trở đi) cùng dạng, và dòng 1186 khẳng định *"Cổng có
thực sự đỏ được không: **CẢ BA**"* — một khẳng định chưa đo. Kiến thức sửa đã có sẵn trong repo:
`MILESTONE_4_EXECUTION_PLAN.md:560` đã cảnh báo đúng điều này nhưng chưa áp cho M1/M1B.

**e. Bảng markdown mất ô cuối.** GFM tách ô trên `|` bất kể `|` nằm trong code span hay không; chỉ
`\|` mới thoát được. Quét từng khối bảng ngoài code fence và so số ô của mỗi hàng với hàng tiêu đề:

```
COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md   thừa 114   thiếu 1
MILESTONE_1_EXECUTION_PLAN.md           thừa   8   thiếu 0
MILESTONE_1B_EXECUTION_PLAN.md          thừa  11   thiếu 0
MILESTONE_2_EXECUTION_PLAN.md           thừa  24   thiếu 0
MILESTONE_3_EXECUTION_PLAN.md           thừa  31   thiếu 0
MILESTONE_4_EXECUTION_PLAN.md           thừa  10   thiếu 0
MILESTONE_5_EXECUTION_PLAN.md           thừa  26   thiếu 0
MILESTONE_6_EXECUTION_PLAN.md           thừa   1   thiếu 0
MILESTONE_7_EXECUTION_PLAN.md           thừa   0   thiếu 1
PACKAGE_REORGANIZATION_PLAN.md          thừa   0   thiếu 0
TỔNG                                   thừa 225   thiếu 2
```

Phần thừa luôn rơi vào **đuôi cột cuối** — ở các kế hoạch này cột đó là ô bằng chứng / "đã kiểm
chứng?". Nghĩa là **bằng chứng kiểm chứng biến mất khỏi bản hiển thị, không có lỗi nào báo**. Hai hàng
thiếu ô nằm ở `MILESTONE_7_EXECUTION_PLAN.md:1294` và bản sao nguyên văn của nó ở master:20991.

**f. Bốn neo `file:line` chỉ tới dòng không tồn tại.** Trong 3.652 trích dẫn `path:line` ngoài code
fence, 3.644 nằm trong phạm vi — 99,8%. Tám trích dẫn vượt độ dài file thuộc về bốn lỗi, mỗi lỗi xuất
hiện hai bản (plan + bản sao master): `status-line-settings-cache.test.ts:374-381` (file dài **343**
dòng), `packages/agent/src/index.ts:19-37` (dài **34**), `plugins/loader.ts:474-483` (dài **482**).

```bash
wc -l packages/coding-agent/test/status-line-settings-cache.test.ts \
      packages/agent/src/index.ts \
      packages/coding-agent/src/extensibility/plugins/loader.ts
```

---

## Khoảng trống của chính đợt rà soát này

Ghi rõ để không ai đọc phần trên tưởng là đã phủ hết.

- **Mẫu lấy mẫu là gì.** Tám tài liệu kế hoạch cộng master và REORG, tức toàn bộ markdown ở gốc repo.
  **Không** có `CROSS_REPO_COMPARISON.md`, `SENPI_FINDINGS.md`, `RESEARCH_DSH_OMO_2026-09-28.md`,
  `RESEARCH_FINDINGS_2026-09-28.md` — bốn tài liệu nghiên cứu lớn không nằm trong mẫu, dù chúng là
  nguồn của nhiều con số mà M1/M1B trích dẫn. Chúng có thể chứa mâu thuẫn với kế hoạch mà ở đây
  không thấy.
- **Không có ai chạy bất kỳ cổng nào.** Chưa `bun run check:ts`, chưa `bun test`, chưa build native
  addon. Mọi phán đoán ở trên là về **văn bản và cây**, không phải về hành vi chạy được. Riêng kết
  luận "M1B không còn bị chặn môi trường" chỉ là đọc `packages/natives` trạng thái từ trạng thái track,
  chưa xác nhận bằng một lần build.
- **Điểm yếu của chính phép đo bảng.** Bộ tách ô ở mục (e) dùng `\|` làm ký tự thoát và coi code span
  **không** bảo vệ `|` — đúng theo GFM. Một số bộ tách khác (bảo vệ pipe trong code span) cho ra con
  số nhỏ hơn nhiều. Số 225 là theo quy tắc nghiêm; nếu trình hiển thị của bạn bảo vệ pipe trong code
  span, con số sẽ giảm — nhưng các ô **thừa** vẫn là lỗi thật.
- **Chưa kiểm gì trong `.lavish-wip/`.** Thư mục đó chứa các đặc tả trung gian mà M7 tự ghi là
  *"gitignored — reviewer phải đọc tài liệu này, không đọc thư mục đó"*. Không khẳng định nào ở đây
  kiểm tra được tính nhất quán giữa hai nguồn đó.
- **Phạm vi hẹp theo bản chất.** Tài liệu này trả lời *"kế hoạch có sẵn sàng để kỹ sư đi theo
  không"*. Nó không nói gì về **chất lượng thiết kế** của các kế hoạch đó — một kế hoạch có thể
  hoàn hảo về mặt văn bản và vẫn chọn sai kiến trúc. Những câu hỏi kiến trúc còn mở (Cổng P3 của
  M7, 33 câu ở M1B, bảng quyết định ở từng milestone) **không** nằm trong phạm vi này và cần người
  quyết, không phải sửa văn bản.
- **Không đo đạc độc lập lần hai.** Mọi con số ở trên lấy từ một lần chạy mỗi lệnh. Khi nào sửa văn
  bản, hãy chạy lại chính lệnh đó trước khi tin kết quả sửa.

---

## Thứ tự nên làm

Bốn blocking đầu **không phụ thuộc lẫn nhau** — có thể làm song song. Nhưng hai cặp dưới đây phải
gộp vào **một lượt sửa**, nếu không mâu thuẫn sẽ mọc lại.

**Lượt 1 — bảng điều hướng của master.** Sửa cùng lúc cả mục C (thêm hàng M1B/M7, sửa chuỗi phụ
thuộc, sửa hai ô thống kê, thêm hai hàng mục lục) **và** mục D (cột phụ thuộc của M5, đoạn 288-289).
Cùng một bảng, sửa một lần. Làm trước vì nó là thứ người đọc dùng để quyết định có làm M1B hay
không — mọi sửa đổi phạm vi ở lượt 2 đều phải chỗ này có chỗ để ghi.

**Lượt 2 — phạm vi `durable`, ba tài liệu, một quyết định.** Chọn sáu hay bảy, rồi sửa **cùng lúc** ở
M1B (dòng 3, bảng *Thứ tự migrate* dòng 299, khối `workspaces.catalog` dòng 314-316, dòng 1000, bảng
*Định nghĩa hoàn thành* dòng 2770-2775, tiêu đề mục 5) và master (bảng dòng 29-35, dòng 44, mục lục
409). Đây là **một** quyết định nằm ở ba chỗ; sửa một chỗ là bản sửa vô nghĩa.

**Lượt 3 — ô "package thứ ba".** Độc lập với hai lượt trên nhưng **cùng một bảng** ở cả master và
M1, nên gộp vào lượt 1 hoặc 2 để khỏi mở file hai lần. Sửa dòng 471-476 master và dòng 48-53 M1, cộng
dòng 588 master và dòng 3884 M1.

**Lượt 4 — W8.** Độc lập hoàn toàn, nhưng **rẻ nhất theo thời gian** — một khối cảnh báo ở đầu §W8
và bốn dòng sửa ở master. Nếu tính theo giờ kỹ sư tiết kiệm, làm lượt này **trước lượt 1**, vì nó
là lỗi duy nhất làm một người mất trọn buổi sáng rồi dừng ở một cổng không thể xanh.

**Rồi mới tới major**, theo thứ tự ảnh hưởng: #2 và #3 (REORG orphan + bất biến 2.046 file — mất
file là mất việc không đo được được) → #4 (puppeteer) → #8 (SUL) → #7 (WI-4b) → #6 (hai work item
mồ côi của M2) → #1 (commit nền) → #9 (rà soát M6).

**Một việc không thuộc danh sách sửa nhưng nên làm ngay:** dựng một lượt rà soát cho M6 theo đúng khuôn
M2-M5. M6 là đầu vào quyết định layout của M3, và bốn điều kiện hoàn thành của nó tự ghi là chưa đạt.
Nó là milestone duy nhất chưa từng có vòng rà soát, và điều kiện A của nó — "mọi claim phải kèm một
lệnh tái lập được" — là đúng thứ mà bảy tài liệu còn lại đang vi phạm ở những chỗ vừa nêu trên.

---

## Một bài học chung

Cả tám kế hoạch đều mắc **cùng một lỗi**: **một quyết định được ghi ở đúng một chỗ, rồi đọc ở chỗ
khác**. Không lỗi nào trong tám blocking là lỗi cần suy nghĩ kỹ thuật. Tất cả đều là hệ quả của việc
một sự thật mới đến muộn — upstream 18.3.5 dựng cache warmer, quyết định kiến trúc `1454dc0` đảo
ngược ba package, SENPI đo được `durable` là code chết, M7 được thêm vào cây — và sự thật đó được
ghi vào **mục đầu file** đúng một lần, đúng một lần, thay vì được lan ra tới **những chỗ kỹ sư đọc
để quyết định**: bảng *Thứ tự migrate*, bảng *Định nghĩa hoàn thành*, bảng *THỨ TỰ MILESTONE*, cột
"Phụ thuộc".

Hệ quả là loại lỗi nguy hiểm nhất: **tài liệu không nói dối ai**. Mỗi câu trong nó đúng ở chỗ nó nằm.
Nhưng người đọc không đọc theo thứ tự người viết đọc — họ đọc theo thứ tự họ cần. Và ở thứ tự đó,
mọi lỗi nằm ngay trên đường đi.

Có một hệ quả thứ hai, nhỏ hơn nhưng đáng để nhớ: **tám trong mười blocking nằm ở bảng và danh
sách, không nằm ở văn xuôi**. Văn xuôi được sửa kịp — mỗi sự thật mới đều có một đoạn giải thích
rõ, đo được, có lệnh. Bảng thì không được sửa, vì không ai nghĩ tới. Nếu muốn một quy tắc cho lần
sau: **mỗi lần thêm một mục vào *Điều chỉnh phạm vi*, hãy đếm xem nó xuất hiện ở bao nhiêu bảng trước
khi đóng file** — rồi sửa hết những bảng đó, ngay lúc đó, không để sang lượt sau.
