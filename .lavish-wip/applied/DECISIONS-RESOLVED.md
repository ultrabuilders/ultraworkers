# PHẦN KẾT — 11 quyết định, 11 mặc định đã chọn, sẵn sàng dán

Nguồn: `.lavish-wip/applied/NEEDS-OWNER-DECISION.md`.
Đo trên `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `e55bbee`
(`docs(plans): repair 8 blocking and 9 major defects; add 36 gap work items`), 2026-09-29.

---

## Cách đọc file này

Mỗi mục có cùng một bốn phần, theo đúng thứ tự:

1. **Mặc định đã chọn** — viết ở dạng **dán thẳng** vào tài liệu đích. Đây là phần duy
   nhất cần hành động.
2. **Lý do** — tại sao mặc định này, và vì sao phương án bị loại.
3. **Bằng chứng** — lệnh đã chạy, kèm kết quả. Chạy lại được, không tin lời.
4. **Cách đảo ngược** — đảo lại tốn bao nhiêu, và bằng lệnh kiểm nào biết đã về đúng
   trạng thái cũ.

**Cột "đã giải quyết bằng mặc định?" dưới đây là Có cho cả 11 mục.** Bản trước của file
này ghi "Chưa" cho cả 11, vì đợt đo đầu tiên không có câu trả lời nào. Đợt đo này đã có:
mỗi mục đều tự trả lời được bằng cây, bằng đếm hàng, hoặc bằng tiền lệ đã có sẵn trong
chính file kế hoạch. **Không mục nào còn chặn ai.**

> **Cảnh báo đọc trước mọi thứ.** Phần lớn con số trong `NEEDS-OWNER-DECISION.md` được
> đo lúc 00:41 trên HEAD `6e8109d`. Cây đã đi tới `e55bbee` —
> `MILESTONE_2_EXECUTION_PLAN.md` dài thêm **+884 dòng**, `MILESTONE_1B_EXECUTION_PLAN.md`
> và `MILESTONE_1_EXECUTION_PLAN.md` cũng sửa. **Nhiều dòng mà file nguồn trích dẫn không
> còn đúng.** Ở những chỗ đó, đợt đo này đã đo lại và ghi rõ con số mới. Đừng dán bất kỳ
> cái gì lấy từ file nguồn mà không đọc lại mục tương ứng ở đây.

**Ngoài phạm vi:** 4 mục gốc đã hết hạn (đã được sửa xong trong các đợt chạy song song)
không vào bảng này — bảng loại trừ chúng nằm ở `NEEDS-OWNER-DECISION.md:19-24`.

---

## (1) Bảng tổng

| # | Key | Quyết định | Đã giải quyết bằng mặc định? | Còn cần người? | Chặn milestone nào? |
|---|---|---|---|---|---|
| 1 | `milestone-table-r0-dependency` | `R0` là tiền đề của M1 hay của M1B? | **Có** — giữ bảng, R0 ở dạng văn xuôi | Không | **Không chặn.** Đụng `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:282` |
| 2 | `m2-wave1b-before-m4-4` | Có ghi ràng buộc "M2 Wave 1b xong trước M4-4" vào M4 không? | **Có** — thêm vào bảng tiền đề + `depends_on` của M4-4 | Không | **Không chặn.** 3 chỗ, tất cả trong `.md` kế hoạch |
| 3 | `wi-session-log-completion-row` | `WI-SESSION-LOG` xong khi nào, hay không thuộc M2? | **Có** — (b′) một hàng đo, in luôn dòng "CHƯA LÀM" | Không *(xem mục 3)* | **Không chặn.** M2 vẫn không đóng được — nhưng vì lý do khác |
| 4 | `4-brand-verdict-verification-command-measures-backwards` | Lệnh kiểm chứng phán quyết thương hiệu đo **ngược chiều** | **Có** — (A) thu hẹp còn đúng một file | Không | **Không chặn.** Chỉ `.lavish-wip/applied/DECISIONS.md` (untracked) |
| 5 | `m1b-collision-table-count-and-durable-rows` | Giữ 12 hàng `durable` không, tổng viết bao nhiêu? | **Có** — (a) giữ 64 hàng, gộp về một mốc đo | Không | **Không chặn.** Văn xuôi trong M1B |
| 6 | `item-6-m2-closed-questions-counted-as-open` | Rút hàng `WI-4` đã chốt ra, cập nhật số đếm? | **Có** — sửa số (90→89, 24→23), giữ hàng | Không | **Không chặn.** 6 chỗ, toàn văn xuôi |
| 7 | `m7-item7-w8-trace-keep-or-collapse` | Thân §W8 giữ làm vết hay thu gọn? | **Có** — (a) giữ thân, sửa 2 chi tiết nhỏ | Không | **Không chặn.** 4 chỗ, cả hai file |
| 8 | `decisions-md-anchors-into-m2` | Cập nhật 5 neo dòng trong `DECISIONS.md`? | **Có** — (b) neo theo nội dung, không theo số dòng | Không | **Không chặn.** Cùng một file untracked như mục 4 |
| 9 | `pi-durable-package-name` | Cắt `blob-broker` ra package tên gì? | **Có** — `@oh-my-pi/pi-blob` | Không | **Không chặn.** 2 dòng trong plan reorg |
| 10 | `reorg-count-convention` | Chốt quy ước đếm thư mục? | **Có** — quy ước `.ts`/`.tsx`, sửa 5 dòng | Không | **Không chặn.** Văn xuôi trong plan reorg |
| 11 | `NEEDS-OWNER-DECISION-11-m1-141-correction-count` | Con số "141 đính chính" trong M1 | **Có** — 141 → 22, nêu khoảng trống W4–W22 | Không | **Không chặn.** 6 chỗ, toàn văn xuôi |

**Chặn hôm nay: không mục nào.** Bản trước của file này chặn 1, 2, 3; đợt đo này gỡ
cả ba — mỗi mục trong số đó hoá ra tự quyết được bằng cây. Chi tiết vì sao ở mục (3).

---

## (2) Từng quyết định

---

### Mục 1 — `R0` là tiền đề của M1 hay của M1B

`milestone-table-r0-dependency` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** R0 (kế hoạch tổ chức lại package) là tiền đề của M1 hay của M1B? Bảng
milestone từng gán R0 cho M1, trong khi tài liệu nguồn của R0 nói nó là tiền đề của M1B.

#### Mặc định đã chọn

**Giữ nguyên bảng milestone như hiện tại — KHÔNG thêm hàng R0.** R0 ở lại dạng tiền đề
viết bằng văn xuôi, không phải một hàng của bảng. Khi ai đó thêm hàng M1B vào bảng (một
blocking riêng, đã được `DECISIONS.md` gọi tên), ô *Phụ thuộc* của hàng đó điền `M1, R0`.

Hành động duy nhất đáng gõ ngay — **thêm MỘT câu văn xuôi dưới bảng**
(`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:282`, tức ngay sau hàng M6 ở dòng 281):

```markdown
`R0` không phải tiền đề của M1 — nó là tiền đề của `M1B`, theo `PACKAGE_REORGANIZATION_PLAN.md:3`.
```

Ba ý trong câu đó là bắt buộc: R0 không phải tiền đề của M1 · R0 là tiền đề của M1B ·
nguồn là `PACKAGE_REORGANIZATION_PLAN.md:3`. Câu đó chỉ ghi lại điều đã đo, không thêm
cam kết mới, và nó bảo đảm người thêm hàng M1B sau này điền đúng ô *Phụ thuộc* thay vì
lặp lại nhầm lẫn cũ.

Không đụng bảng cũng nghĩa là **không đụng cái file mà các lượt sửa song song đang sửa.**

#### Lý do

Đây là quyết định KỸ THUẬT, và cây trả lời được bằng cấu trúc chứ không bằng khẩu vị —
nên nó KHÔNG được để chặn. R0 trả lời câu *"169 file từ pi rơi vào package nào"*. Chỉ M1B
là việc chép sáu package nguyên vẹn từ pi (169 file nguồn → 245 file sẽ chép vào), nên
chỉ M1B là nơi câu hỏi đó có tác dụng. M1 sửa code trong năm package đã tồn tại và không
tạo package nào, nên R0 không chặn nó. **Ba nguồn độc lập cùng trỏ về M1B**, đó là câu
trả lời bằng chứng, không phải lựa chọn sở thích.

Mặc định an toàn: bảng hiện có đúng sáu hàng và `PACKAGE_REORGANIZATION_PLAN.md:1` nói
"không thuộc sáu milestone" — hai câu đang khớp nhau. Thêm hàng R0 sẽ làm bảng thành bảy
hàng và **phá đúng cái khớp đó**, trong khi M1B (một tài liệu kế hoạch đầy đủ, thật) vẫn
đang thiếu. Như vậy ta sẽ chữa một mâu thuẫn bằng cách tạo thêm một mâu thuẫn mới. Mâu
thuẫn mà quyết định này sinh ra đã tự được gỡ bởi một lượt sửa song song, và trạng thái
sau lượt sửa đó là nhất quán. **Đừng vẽ lại nó.**

#### Bằng chứng

*Đo trước — tiền đề của quyết định đã cũ:*

1. `grep -rn "\bR0\b" --include="*.md" . --exclude-dir={node_modules,.git,.lavish-wip}`
   → **không có dòng nào.** Chuỗi "R0" không còn tồn tại trong bất kỳ file kế hoạch nào.
2. Bảng milestone `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:276-281` — đúng 6 hàng M1…M6.
   Ô *Phụ thuộc* của M1 (`:276`) là `—`. KHÔNG có hàng R0, KHÔNG có hàng M1B.
3. Chuỗi phụ thuộc `:285`: `M1 → M2 → {M3, M4} → M5 → M6` — không có R0, không có M1B.
4. Mốc thời gian: `NEEDS-OWNER-DECISION.md` mtime 00:41, `COMPREHENSIVE_PLAN` mtime 05:50.
   Hàng R0 đã bị một lượt sửa song song gỡ đi **SAU** khi tài liệu quyết định được viết.
5. `DECISIONS.md:341-345` tự gọi tên phần còn thiếu: *"bảng milestone thiếu M1B/M7 ở master
   … chưa quyết ở file này"*.

> **Cảnh báo — số dòng trong bản cũ của file này đã lỗi thời.** Mặc định viết sẵn trước
> đây (dòng 57 bản cũ) bảo *"thay hai hàng ở dòng 290–291"*. Đo lại: `:290` hôm nay là
> `- **M6 có thể kéo dài**: phần multi-session globals…`, `:291` trống, `:302` nằm trong
> mục "CÁCH ĐỌC TÀI LIỆU NÀY". **Áp patch đúng chữ sẽ cắt vào nhầm mục *Đường găng thẽ*.**

*Câu hỏi gốc vẫn trả lời được — bằng chứng cho "M1B", ba nguồn độc lập:*

- **A.** `PACKAGE_REORGANIZATION_PLAN.md:1` — *"Tài liệu này **không thuộc sáu milestone**.
  Nó là điều kiện tiên quyết để `MILESTONE_1B_EXECUTION_PLAN.md` thật sự rẻ và an toàn:
  nếu 169 file từ `pi` không biết rơi vào đâu, thì mỗi lần chép là một dự án riêng."*
- **B.** `MILESTONE_1B_EXECUTION_PLAN.md:3-6` — M1B chép **sáu package nguyên vẹn** từ pi:
  `chord`, `pi-protocol`, `pi-server`, `pi-client`, `pi-telemetry`, `pi-evals`; 169 file
  nguồn / 245 file sẽ chép vào. Đúng là "169 file không biết rơi vào đâu" mà R0 trả lời.
- **C.** `MILESTONE_1_EXECUTION_PLAN.md:3` — M1 (21 hạng mục) trải trên `packages/coding-agent`,
  `packages/agent`, `packages/ai`, `packages/catalog`, `packages/tui` — năm package **đã
  tồn tại**. `grep -cE "package mới|new package|tạo package" MILESTONE_1_EXECUTION_PLAN.md`
  → **0**. Và `grep -nE "MILESTONE_1_EXECUTION_PLAN|M1\b" PACKAGE_REORGANIZATION_PLAN.md`
  → **không có dòng nào**: tài liệu reorg không nhắc M1 lần nào.

Kết luận đo được: R0 chặn milestone **chép package** (M1B), không chặn milestone **sửa
code trong package sẵn có** (M1). Đây là hệ quả cấu trúc, không phải lựa chọn sở thích.

#### Cách đảo ngược

Nếu chủ sở hữu muốn R0 thành một hàng thật của bảng (làm đúng cách), thay đổi gồm đúng
ba chỗ, tất cả trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`:

1. Chèn hàng R0 **ngay trước dòng 276** (hàng M1), để nó đứng đầu chuỗi:
   `| 0 | **R0** | Tổ chức lại package (không phải milestone) | — | — | — | S |`
   Rồi đánh số lại cột `#` của M1…M6 từ 1…6 thành 2…7. Việc này phá đúng sự khớp
   "sáu hàng ↔ sáu milestone" ở `PACKAGE_REORGANIZATION_PLAN.md:1` — nên phải sửa câu đó
   thành *"bảng gồm sáu milestone cộng một điều kiện tiên quyết"*.
2. Thêm hàng M1B (thứ tự M1 → M1B → M2), ô *Phụ thuộc* ghi `M1, R0`.
3. Sửa chuỗi ở dòng 285 thành:
   `M1 ─┐` / `    ├─→ M1B → M2 → {M3, M4} → M5 → M6` / `R0 ─┘`
   và bỏ câu *"**Chuỗi phụ thuộc dài nhất:**"* hoặc sửa thành *"chuỗi dài nhất"* vì R0
   song song M1.

Ngược lại (đóng lại nếu đã áp phương án đó): xoá hàng R0 và hàng M1B, đưa số `#` về
1…6, trả dòng 285 về `M1 → M2 → {M3, M4} → M5 → M6`.

> **Đừng dùng số dòng 290/291** như bản cũ của file này đang ghi — số đó đã lỗi thời.

---

### Mục 2 — Có ghi ràng buộc "M2 Wave 1b xong trước M4-4" vào M4 không?

`m2-wave1b-before-m4-4` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** `MILESTONE_2_EXECUTION_PLAN.md:97` nói Wave 1b *"không chặn M4 theo thứ tự
này, nhưng phải xong trước M4-4"*, nhưng `MILESTONE_4_EXECUTION_PLAN.md` nhắc **0 lần**.
Có ghi ràng buộc đó vào M4 không, và ghi ở đâu?

#### Mặc định đã chọn

Phương án (a), hiện thực theo bảng *Điều kiện riêng của từng M4* đã có sẵn ở
`MILESTONE_4_EXECUTION_PLAN.md:339-352`. Ba chỗ, tất cả đều là chỗ **đang đã phục vụ
đúng chức năng đó**. **M2 giữ nguyên hoàn toàn.**

1. Thêm một hàng vào bảng *Điều kiện riêng của từng M4*, **ngay sau hàng M2 WI-4 ở dòng 346**:
   ```markdown
   | **M2 Wave 1b** (`WI-PRESTEP-1`, ghi durable turn khi bị chặn) phải merge | M4-4 | **CHƯA THOẢ** |
   ```
2. Thêm một mục vào khối `depends_on:` của chính M4-4 ở dòng 818:
   ```markdown
   - M2 Wave 1b (`WI-PRESTEP-1`) — chỉ thứ tự, không phải phụ thuộc mã
   ```
3. Cập nhật hệ quả bắt buộc: dòng 14 `**3**` → `**4**`, và thêm
   `M2 Wave 1b (WI-PRESTEP-1) cho M4-4` vào phần trong ngoặc.

#### Lý do

Quyết định thuần kỹ thuật, không phải sản phẩm — bằng chứng tự quyết được, nên nó KHÔNG
chặn gì. Cụ thể:

1. **Ràng buộc không phải điều phát minh** — M2 đã viết ra nó **HAI LẦN** kèm lý do (dòng
   97 và dòng 362), nên đây là thu bản chữ của một cam kết đã chốt, không phải tạo cam
   kết mới.
2. **Không đụng bề mặt công khai** — cả ba chỗ đều nằm trong `.md` kế hoạch, không phải
   trong `packages/`; không đổi API, không đổi tên, không đổi hành vi.
3. **Không chọn giữa hai kiến trúc lớn** — mọi chỗ sửa đều nằm trong cấu trúc ĐÃ TỒN TẠI:
   một bảng đã có sẵn 3 hàng M2 cùng hình dạng, một khối `depends_on:` đã có 2 mục, một
   con số đã có sẵn. Đây là điền nốt, không phải dựng.
4. **Bằng chứng tự trả lời câu "đặt ở đâu"** — quy tắc của chính M4 đã quy là ràng buộc
   nằm ở bảng *Điều kiện riêng của từng M4* và `depends_on:` của item, vì ba hàng M2 trước
   đó nằm đúng ở đó. Không có lựa chọn sản phẩm nào ẩn trong câu hỏi vị trí.

**Phát hiện quan trọng nhất khi đo:** `NEEDS-OWNER-DECISION.md` mô tả (a) là *"thêm một
dòng vào file 314 KB"* và nghi ngờ chỗ đặt. Đo thì **M4 ĐÃ CÓ bảng tiền đề riêng tại dòng
339** với đúng 3 hàng M2→M4-x cùng hình dạng (344→M4-6, 345→M4-9, 346→M4-7). Nên đây
không phải chỗ mới, mà là **chỗ trống sẵn có chờ**.

Hai phương án còn lại bị loại vì đo chứng minh lệch chức năng:

- **(b)** — loại: dòng 13 nói về *"4/6 bước kiểm đỏ"* (bảng cổng kiểm thử), dòng 14 mới là
  `Phụ thuộc chưa thoả` (bảng tiền đề). Tài liệu nguồn gọi (b) là "lệch chức năng" — đo
  thì đúng.
- **(c)** (xoá câu ở M2) — loại: câu đó CÓ THẬT và câu 362 đã viết lý do. Bỏ đi mất
  thông tin ngăn làm cùng một lỗi hai lần ở hai tầng.

Mặc định này **không làm chậm gì đang chạy được**, vì M4-4 vẫn bị chặn bởi hai thứ đã ghi
sẵn và không liên quan (`build native addon` dòng 819, `M3-A4 merge order` dòng 821).

#### Bằng chứng

Đo trên `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `e55bbee`, 2026-09-29.

*Ràng buộc có thật, và M2 nói hai lần:*

- `sed -n '90,105p' MILESTONE_2_EXECUTION_PLAN.md` → dòng 97: *"**Cần trước khi bắt đầu:**
  Wave 1 (WI-0 trust model). **Không chặn M4** theo thứ tự này, nhưng **phải xong trước
  M4-4**."*
- `grep -n 'Đặt trước M4-4' MILESTONE_2_EXECUTION_PLAN.md` → dòng 362 (lý do): *"Đặt trước
  M4-4 vì M4-4 là nơi phát sinh ra tình huống 'báo applied nhưng không có gì thay đổi' mà
  WI này chữa ở tầng thấp hơn."*
- `MILESTONE_2_EXECUTION_PLAN.md:338` — tiêu đề mục cũng ghi: *"## WI-PRESTEP-1. Ghi durable
  turn khi bị chặn (thêm 2026-09-28, **đặt trước M4**)"*

*M4 mù hoàn toàn:*

```bash
grep -inE 'prestep|session-log|durable turn|WI-PRESTEP|Wave 1b' MILESTONE_4_EXECUTION_PLAN.md
# grep_exit=1, 0 dòng

awk 'NR>=816 && NR<=826' MILESTONE_4_EXECUTION_PLAN.md   # khối depends_on: của M4-4
# chỉ có 2 mục: build native addon (819), M3-A4 merge order (821). Không có M2.

awk 'NR>=473 && NR<=476' MILESTONE_4_EXECUTION_PLAN.md   # header M4-4
# "**Phụ thuộc:** build native addon; thứ tự merge với M3-A4" — cũng không có M2.
```

*Số đối chiếu đã chạy (baseline cho lệnh kiểm):*

```bash
grep -c 'WI-PRESTEP-1' MILESTONE_4_EXECUTION_PLAN.md                        # 0
awk 'NR>=341 && NR<=352' MILESTONE_4_EXECUTION_PLAN.md | grep -c 'M2 '      # 3
awk 'NR==14' MILESTONE_4_EXECUTION_PLAN.md | grep -o '\*\*[0-9]\+\*\*'      # **3**
```

> **Cảnh báo về mẫu kiểm.** Mẫu hẹp `^\| \*\*M2` đếm ra **2** (vì dòng 346 là
> `| Bản viết M2 WI-4`, không bắt đầu bằng `**`), nên nó **sẽ báo sai ngay tại lỗi mà nó
> sinh ra để bắt.** Phải dùng `'M2 '`.

*Xác nhận không sửa file kế hoạch:*
`git status --short -- MILESTONE_2_EXECUTION_PLAN.md MILESTONE_4_EXECUTION_PLAN.md
COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md PACKAGE_REORGANIZATION_PLAN.md` → **rỗng.**

#### Cách đảo ngược

Đảo ngược là xoá đúng ba thứ, không đụng gì khác — và **không có gì phải hoàn tác ở M2**:

1. Xoá hàng `| **M2 Wave 1b** ...` vừa thêm trong bảng *Điều kiện riêng của từng M4*.
2. Xoá mục `- M2 Wave 1b (\`WI-PRESTEP-1\`) — ...` trong khối `depends_on:` của M4-4.
3. Đổi lại `**4**` → `**3**` ở dòng 14 và bỏ `M2 Wave 1b (WI-PRESTEP-1) cho M4-4` khỏi
   phần trong ngoặc.

Đây là điểm mấu chốt khiến mặc định an toàn: nó là **THÊM thông tin vào chỗ đang đọc**,
không SỬA chỗ đang nói. M2 giữ nguyên, nên nếu sau này ràng buộc bị gỡ khỏi M2, chỉ cần
xoá ba mảnh trên là hai file trở về đúng trạng thái hôm nay.

Kiểm đã sửa được (chạy lại, không tin lời):

```bash
grep -c 'WI-PRESTEP-1' MILESTONE_4_EXECUTION_PLAN.md                        # >=1  (nay 0)
awk 'NR>=341 && NR<=352' MILESTONE_4_EXECUTION_PLAN.md | grep -c 'M2 '      # 4    (nay 3)
awk 'NR==14' MILESTONE_4_EXECUTION_PLAN.md | grep -o '\*\*[0-9]\+\*\*'      # **4** (nay **3**)
```

Ba lệnh này **tự bắt được** trường hợp quên đổi 3→4: số ở dòng 14 lệch với số hàng M2
thật trong bảng là thấy ngay.

> **Ghi chú — một quyết định khác, KHÔNG làm ở đợt này.** M2:97 nói *"không chặn M4 theo
> thứ tự này"* trong khi `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:288` và đường găng thẽ ở
> 291-292 ghi chuỗi `M1 → M2 → {M3, M4}` không nhắc Wave 1b. Hai chỗ không mâu thuẫn
> (plan tổng nói về milestone, M2 nói về một wave trong milestone) nhưng cũng không ai
> trỏ tới nhau. Đây là quyết định khác (làm plan tổng có nói tới ràng buộc cấp wave
> không, và nói ở đâu) và nó **KHÔNG chặn**, vì sau mặc định này người đọc M4 đã thấy đầy
> đủ. Ghi ra để lượt sau không phải đo lại từ đầu.

---

### Mục 3 — `WI-SESSION-LOG` xong khi nào, hay nó không thuộc M2?

`wi-session-log-completion-row` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** Bảng *Định nghĩa hoàn thành* của `MILESTONE_2_EXECUTION_PLAN.md` có 22 hàng
cho 25 work item khai báo, thiếu đúng hàng của `WI-SESSION-LOG`, nên M2 tự nói *"không
thể đóng"*. Ba phương án: (a) phương án A chính là toàn bộ mục này, (b) hàng chỉ ghi phần
đo, (c) gỡ khỏi phạm vi M2 (17→16 / 25→24).

#### Mặc định đã chọn

**(b′)** — thêm **MỘT hàng** vào bảng *Định nghĩa hoàn thành*, tên hàng ghi rõ:

```markdown
WI-SESSION-LOG (phần đo — phần invariant chưa làm)
```

Hàng hứa bảng lỗ hổng **7 dòng** (resume / fork / transcript / compaction / cache-state /
telemetry / replay), mỗi dòng ghi *"đang giữ state riêng"* hay *"đọc lại từ nguồn"* — **CỘNG**
câu trả lời cho bước 2 của Cổng mở — và in ngay trên hàng dòng:

```
CHƯA LÀM: listener invariant — phần này là phương án A, hàng này không dựng được nó
```

Sửa `:5369`/`:5371` thành **23** dòng.

#### Lý do

Quyết định KỸ THUẬT, tự quyết được, không được chặn.

**Vì sao (b′) thay vì (a) mà nguồn khuyến nghị:** (a) viết ra trước khi chạy phép đo mà
chính mục nó yêu cầu. **Chạy rồi thì (a) sụp.** Invariant của A là
`expected = session.deriveMessages()` so với `options.messages`; ở omp,
`options.messages` **CHÍNH LÀ** `currentMessages` mà `ContextEvent` đưa ra — không có
nguồn thứ hai, nên phép so sánh vô nghĩa (luôn bằng nhau). Muốn nó có nghĩa thì phải có
nơi thứ hai giữ state, và **bảy nơi ứng viên đúng là bảy dòng bảng lỗ hổng.** Suy ra: bảng
lỗ hổng không phải phiên bản rẻ hơn của A — nó là **bước đầu tiên bắt buộc của A.**

**Lý do độc lập thứ hai, mạnh hơn:** điều kiện của (a) đòi đếm trên **TOÀN BỘ test
suite**, mà addon chưa build nên hàng đó **không bao giờ thoá ở checkout này** — một
cổng treo, không phải một cổng.

**Vì sao không (c):** số học tự loại nó — bảng thiếu đúng **MỘT hàng**, không thiếu một
work item. Cắt scope là xoá công việc để làm số khớp, đúng move mà các tài liệu review
đợt này đã bị phê bình.

**Vì sao (b′) khác (b) của nguồn:** (b) trần sẽ khiến bảng **TRÔNG xong** trong khi mục
lớn nhất chưa làm — đúng cái bẫy mà mục *Bàn giao* của Wave 1b cảnh báo. Dòng "CHƯA LÀM"
in trên hàng là thứ biến (b′) từ bẫy thành cổng thật.

Đây là mặc định an toàn: không phá cài đặt, không đụng bề mặt công khai, đảo ngược bằng
một lần xoá. **Quy tắc dừng ở `:322-324` giữ nguyên và không bị mặc định này lấy đi.**

#### Bằng chứng

Đo trên `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `e55bbee`, 2026-09-29.

*Cổng mở của chính mục* (`MILESTONE_2_EXECUTION_PLAN.md:299-310`) yêu cầu *"Grep trước"* ở
bước 2 — **cổng này chưa từng được chạy.** Kết quả:

```bash
grep -rn "deriveMessages" --include='*.ts' packages/ | wc -l   # 0
grep -rn "llm/stream"     --include='*.ts' packages/ | wc -l   # 0
grep -c "message/append\|'message'" packages/coding-agent/src/extensibility/shared-events.ts   # 0
# SessionEvent là union 12 arm, toàn arm vòng đời: start/switch/branch/compact/stop/shutdown/tree/goal

# Seam gần nhất lúc dispatch: ContextEvent tại shared-events.ts:182-185,
# chỉ mang `messages: AgentMessage[]`; grep `system|tools|temperature|maxTokens` trong block đó -> 0 hit.
# Bắn tại extensibility/hooks/runner.ts:370 và extensibility/extensions/runner.ts:1798.

find packages/natives -name '*.node'    # rỗng — addon chưa build
```

M2 ghi `coding-agent` ở HEAD là **913 pass / 1445 fail** (preflight build tại `:55-64`).
Điều kiện của (a) đòi đếm *"trên toàn bộ test suite"* → **không bao giờ thoá ở đây.**

*Số học đóng bảng:*

- `grep -c '^## WI-'` → **25**
- Hàng bảng *Định nghĩa hoàn thành* (`:5342-5368`) → **22**
- Cố ý ngoài M2 = **2** (WI-20, WI-21, khai tại `:5372`) ⇒ tập phải đóng **23**, bảng thiếu **1**
- `comm` trên tên cho ra đúng ba mục thiếu: WI-20, WI-21, WI-SESSION-LOG — hai cái đầu
  đã được giải thích, chỉ còn một dòng trống.

*Tiền lệ đo được trong chính 22 hàng:* 4 hàng là design/docs-only (WI-0, WI-10, WI-11,
WI-12 — đều deliver `docs/*.md`), nên hàng đo **KHÔNG** lệch chuẩn 22 hàng như tài liệu
nguồn lo.

*Chi phí mirror:* bảng được plan tổng nhúng **nguyên văn** —
`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:10327` (WI-19), `:10329` (câu *"22 dòng"*), `:10331`
(gạch *"sự bỏ sót thật"*). Số 25 xuất hiện 4 lần ở mỗi file.

#### Cách đảo ngược

Xoá đúng một hàng đã dán, rồi khôi phục 3 chỗ — **SỰ phải sửa CẢ HAI file**, vì bảng M2
được plan tổng nhúng nguyên văn (lớp lỗi *"viết một nơi, đọc nơi khác"* mà `PASS3.md` mục
7 đã gọi tên; sửa một file là tái tạo đúng lớp lỗi đó):

1. Xoá hàng `WI-SESSION-LOG` trong bảng *Định nghĩa hoàn thành* tại
   `MILESTONE_2_EXECUTION_PLAN.md` (~`:5368`) **VÀ** bản nhúng tại
   `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (~`:10327`).
2. `23` → trở lại `22` tại `MILESTONE_2_EXECUTION_PLAN.md:5369` và
   `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:10329`.
3. Khôi phục gạch đầu dòng *"sự bỏ sót thật"* tại `MILESTONE_2_EXECUTION_PLAN.md:5371`
   và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:10331`.

Không đụng code, không đụng count ở dòng 5, không đụng work item nào khác.

**Nếu sau này muốn chuyển sang (a) thật:** GIỮ hàng đo, thêm hàng thứ hai với điều kiện
của (a) — kèm preflight `brew install bazelisk; brew install ninja; bun --cwd=packages/natives
run build`, nếu không hàng đó không bao giờ thoá ở checkout chưa build. Chỉ làm **sau khi
bảng lỗ hổng đã đo và số "giữ state riêng" > 0**; nếu bảng ra 0, quy tắc dừng ở `:322-324`
bảo dừng.

---

### Mục 4 — Lệnh kiểm chứng phán quyết thương hiệu đo **ngược chiều**

`4-brand-verdict-verification-command-measures-backwards` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** Mục 4 của `NEEDS-OWNER-DECISION.md`: lệnh kiểm chứng phán quyết thương hiệu có
đo ngược không, và có mở `.lavish-wip/applied/DECISIONS.md` để sửa bằng chứng cho phán
quyết `m5-order` không?

#### Mặc định đã chọn

**(A), thu hẹp bằng đo thành đúng một file: sửa `.lavish-wip/applied/DECISIONS.md` và
KHÔNG file kế hoạch nào.**

1. Thay **7 dòng** mang `grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand'` bằng:
   ```bash
   grep -c '@oh-my-pi/'
   ```
2. Sửa câu ở dòng 162 từ *"**Không milestone nào giả định tên thương hiệu.**"* thành
   câu chữ chuẩn **đã được commit** từ `MILESTONE_5_EXECUTION_PLAN.md:3`:
   > *"M3 và M4 không **giả định** tên thương hiệu đã ổn định. Chúng vẫn *va chạm* với đợt
   > đổi tên, chỉ không phải theo kiểu tiền quyết."*

#### Lý do

Đây là sửa bằng chứng cho một sự thật kỹ thuật, không phải quyết định sản phẩm, nên nó
không được chặn.

**Lỗi cốt lõi là thật và đã tái lập được:** lệnh chỉ khớp tên **MỚI**. Ở M3, hit duy
nhất là một đường dẫn filesystem (`cd /Users/…/ultraworkers`); ở M4, hai hit là hai
đường dẫn `.lavish-wip/`. Nó **không bao giờ khớp** `oh-my-pi` — chính là thứ đang được
đổi tên. *Một lệnh không phát hiện được đối tượng của chính nó không thể chứng minh đối
tượng đó vắng mặt*, nên suy luận *"1 hit / 2 hit ⇒ không milestone nào giả định tên
thương hiệu"* là bằng chứng rỗng. Chú thích đi kèm cũng đã lỗi thời (xem bằng chứng).

**Vì sao mặc định này an toàn — đo, không giả định:**

- **Không đổi hợp đồng người dùng.** Kết luận (M5 chỉ hard-depend vào M2) đã chốt **và
  đã được commit** vào các kế hoạch được track ở `e55bbee`. Việc này sửa *bằng chứng*
  cho một phán quyết đã áp, không sửa phán quyết.
- **Không chạm bề mặt công khai.** `.lavish-wip/applied/` **hoàn toàn untracked**;
  `DECISIONS.md` là file quyết định làm việc, không bao giờ được ship, không nằm trong
  `packages/` hay `docs/`.
- **Không phá cài đặt.** Không gì về tên, giá trị wire, package scope, hay env var đổi.
- **Không sửa file nào được track.** `git status` sạch cho cả bốn file kế hoạch.
- **Sửa nguồn, không sửa bản sao, phá vòng lặp nhân bản ngay tại gốc.** Đây là lý do (B)
  bị loại: (B) là *"sửa bản sao trong kế hoạch, để nguyên DECISIONS.md"*, nhưng các bản
  sao **đã được sửa** còn `DECISIONS.md` là nguồn thượng nguồn hạ chúng được sao chép từ —
  lượt sau sẽ đọc lại và tin lại lệnh ngược chiều ở đó. (C) bị loại vì để lại cả hai bản
  sao còn lại của lỗi trong đúng file duy nhất còn chúng.

**Vì sao lập luận "các đợt trước được dặn đừng chạm DECISIONS.md" không ép phải hỏi
chủ:** ranh giới đó là **thoả thuận làm việc của các đợt đó**, không phải chính sách
repo. File untracked, và không có quy tắc cấm-chạm nào của chính nó (grep
`cấm không chạm` / `ranh giới` → không khớp). Lý do tồn tại của ranh giới đó — sợ chạm
sửa kế hoạch đang bay — cũng đã tan: các file kế hoạch đã commit và sạch.

Quyết định này tự quyết được từ cây: câu chữ chuẩn đã sửa **đã tồn tại nguyên văn** ở
`MILESTONE_5_EXECUTION_PLAN.md:3` và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:16748`, và
các con số thay thế lặp lại được. Chép lại văn bản có sẵn và một số đo được không phải
lựa chọn đòi hỏi ý định sản phẩm.

#### Bằng chứng

HEAD **đã trôi trong lúc đo**: tài liệu quyết định viết lúc `6e8109d`; HEAD hiện tại là
`e55bbee` (*"docs(plans): repair 8 blocking and 9 major defects; add 36 gap work items"*).

*Lỗi, đã tái lập:*

```bash
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md   # 1
# -> 709: cd /Users/tranquangdang21/Projects/ultraworkers

grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md   # 2
# -> 2615 và 2616, cả hai đều là .../ultraworkers/.lavish-wip/deepseek-harness và .../.lavish-wip/dsh
```

Mọi hit là đường dẫn filesystem chứa tên **MỚI**. Lệnh không thể khớp chuỗi **CŨ**
`oh-my-pi`, chính là thứ đang được đổi tên.

*Hướng đúng:*

```bash
grep -c '@oh-my-pi/' MILESTONE_3_EXECUTION_PLAN.md   # 31 dòng
grep -o '@oh-my-pi/' MILESTONE_3_EXECUTION_PLAN.md | wc -l   # 46 lượt
grep -c '@oh-my-pi/' MILESTONE_4_EXECUTION_PLAN.md   # 16 dòng
grep -o '@oh-my-pi/' MILESTONE_4_EXECUTION_PLAN.md | wc -l   # 17 lượt
```

Phân rã (độc lập, khớp đúng với M5:3 đã commit): M3 → 25 pi-tui, 9 pi-utils,
4 pi-coding-agent, 4 pi-agent-core, 2 pi-natives (=44) cộng 2 lần `@oh-my-pi/` dạng văn
xuôi = **46**. M4 → 7 pi-natives, 5 pi-tui, 4 pi-utils, 1 pi-coding-agent = **17 lượt
trên 16 dòng** (đây là chỗ lẫn dòng-với-lượt mà §4 cảnh báo).

*Chú thích đi kèm lệnh hỏng cũng đã lỗi thời:* `DECISIONS.md:160` nói hit M3 ở dòng
**690**; thật là **709**. `DECISIONS.md:161` nói hit M4 ở **1629-1630**; thật là **2615-2616**.

*Trạng thái từng chỗ trong 4 chỗ mà §4 nêu tên:*

1. `.lavish-wip/applied/DECISIONS.md` — `grep -c "ultraworkers|APP_NAME"` = **7** (dòng
   160, 178, 179, 180, 181, 270, 271). **CÒN HỎNG.**
2. `DECISIONS.md:162` — `grep -ci "milestone nào giả định"` = **1**. **CÒN HỎNG.**
3. `MILESTONE_5_EXECUTION_PLAN.md:3` — `awk 'NR==3' … | grep -c 'pi-tui 17'` = **0**;
   nay đã đọc *"pi-tui 25, pi-utils 9, pi-agent-core 4, pi-coding-agent 4, pi-natives 2
   — 44 lượt có tên package, cộng 2 lượt ghi dạng @oh-my-pi/* trong văn xuôi"*. **ĐÃ SỬA.**
4. `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — `grep -c "ultraworkers|APP_NAME"` = 0;
   `grep -c "điều kiện tiên quyết thực tế cho M3"` = 0; `grep -c "không milestone nào giả
   định"` = 0. Văn bản đã sửa có mặt: `grep -c "46 lượt trên 31 dòng"` = 1 ở cả hai file.
   **ĐÃ SỬA ở `e55bbee`.**

*Theo dõi (quyết định mặc định):*

```bash
git ls-files --error-unmatch .lavish-wip/applied/DECISIONS.md
# -> "did not match any file(s) known to git"
git status --porcelain .lavish-wip/applied/     # -> ?? .lavish-wip/applied/  (cả thư mục untracked)
git status --porcelain -- <4 file kế hoạch>     # -> rỗng (sạch, đã commit ở e55bbee)
grep -i "cấm không chạm\|ranh giới" DECISIONS.md   # -> không khớp (không có quy tắc tự cấm)
```

*Kết luận vẫn đứng vững:* `awk 'NR==3' MILESTONE_5_EXECUTION_PLAN.md | grep -oE
'.{60}giả định.{60}'` → *"… M3 và M4 không giả định tên thương hiệu đã ổn định. Chúng vẫn
*va chạm* với đợt đổi…"* — câu chữ chuẩn đã commit, sẵn sàng chép.

Các file **còn lại** mang lệnh hỏng hoặc câu sai chỉ là file làm việc/scratch:
`DECISIONS.md`, `DECISIONS-RESOLVED.md:204` (bản cũ), `PASS3.md`, `PASS4.md`,
`READINESS-REPORT.md`, `m5-md/00-front.md`, `RESIDUE-MILESTONE_5_EXECUTION_PLAN.md.md`.
**Không file kế hoạch nào được track bị ảnh hưởng.**

#### Cách đảo ngược

`DECISIONS.md` untracked nên git không revert được — **phải chụp lại chữ trước khi sửa.**
Ba vùng liên tục, chép nguyên văn:

**Vùng 1, dòng 159-163 (thân phán quyết)** — trả về:
> M5 **không** phải điều kiện tiên quyết của M3 hay M4. Kiểm chứng: `grep -c -E
> 'ultraworkers|APP_NAME|thương hiệu|rebrand'` trả **1** hit ở M3 (dòng 690 — một đường
> dẫn filesystem, `cd /Users/.../ultraworkers`) và **2** hit ở M4 (dòng 1629-1630 — hai
> đường dẫn `.lavish-wip/`). **Không milestone nào giả định tên thương hiệu.** Câu "M5 là
> tiền đề của M3/M4" trong M1B/M5 là sai.

**Vùng 2, dòng 177-184 (khối bằng chứng)** — trả hai cặp grep ở dòng 178-181 về:
```bash
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md   # 1
grep -n  -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md   # 690: cd /Users/…/ultraworkers
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md   # 2
grep -n  -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md   # 1629,1630: .lavish-wip/
```
(giữ nguyên dòng `awk 'NR==172'` và `ls -d scripts/rename`)

**Vùng 3, dòng 270-271 (khối tái lập)** — trả về:
```bash
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md   # 1
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md   # 2
```

Đảo ngược toàn bộ = dán lại ba vùng đó; khoảng 12 dòng, không file nào khác bị đụng,
không phải build hay cài lại gì. Kiểm bằng `grep -c "ultraworkers|APP_NAME"
.lavish-wip/applied/DECISIONS.md` trả **7** và `grep -ci "milestone nào giả định"` trả **1**.

> **Không đảo ngược** các số 31 / 16 / 25 / 9 / 7 / 5 / 4 / 1. Chúng đã đo và lặp lại
> được, và chính các kế hoạch đã commit đang ghi vậy. Chỉ văn xuôi và dạng lệnh là đảo
> ngược được.

---

### Mục 5 — Bảng va chạm của M1B: giữ 12 hàng `durable`, và tổng viết bao nhiêu?

`m1b-collision-table-count-and-durable-rows` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** Bảng *"Va chạm với thứ omp đã có"* trong `MILESTONE_1B_EXECUTION_PLAN.md`
giữ hay bỏ 12 hàng `durable`, và con số tổng phải viết là bao nhiêu?

#### Mặc định đã chọn

**Phương án (a) — GIỮ nguyên cả 64 hàng. KHÔNG di chuyển và KHÔNG xoá 12 hàng `durable`.**

Chuẩn hoá văn xuôi về **một mốc đo duy nhất**:

- Dòng **3308** viết **"33 trong 64 va chạm"** (bảng 1) và **"31 va chạm còn lại"** (bảng 2),
  kèm câu **"52 thuộc sáu package trong phạm vi; 12 hàng `durable` là tài liệu tham khảo"**.
- Hai chỗ **56** (dòng 6 và dòng 396) cũng gộp về mốc **64/52** thay vì đứng riêng.

Không sửa file kế hoạch nào ở đợt ghi bản ghi này — bản ghi quyết định chính là phản hồi
này, để người gọi áp dụng sau.

#### Lý do

Quyết định kỹ thuật thuần đo, không phải quyết định sản phẩm: không đổi hợp đồng người
dùng, không đổi tên thương hiệu, không phải chọn giữa hai kiến trúc lớn, và cây tự trả
lời được bằng đếm hàng. **Không được để chặn.**

Ba lý do khiến mặc định nghiêng hẳn về (a) sau khi đo lại:

1. **Bảng 1 vốn đã khớp — mục 5 đo nhầm vì đọc file cũ.** Mục 5 trong
   `NEEDS-OWNER-DECISION.md` (viết lúc 00:41:30) đo bảng 1 thành **32** hàng và kết luận
   *"văn xuôi nói 33 nên lệch"*. Cây hiện tại cho **33**. Cả con số 32 lẫn con số 63 mà
   mục 5 đề xuất đều là số của một bản cũ. **Số 63 — con số mà mục 5 khuyến nghị viết
   vào file — sẽ tái tạo đúng loại mâu thuẫn mà mục 5 sinh ra để xoá nó.**
2. **Nửa "ghi chú" của phương án (a) đã tồn tại sẵn.** Dòng **3353** đã viết rõ: *"12 hàng
   `durable` còn nằm trong bảng là tài liệu tham khảo, không phải việc phải làm"*. Không
   cần thêm câu nào. Nên phương án (a) thực chất chỉ còn **đúng một việc: sửa số.**
3. **12 hàng `durable` là bằng chứng của một quyết định đã chốt, không phải việc treo.**
   Dòng **405-407** ghi: chúng được giữ *"làm tài liệu tham khảo: đây là bằng chứng cho
   thấy vì sao chép `durable` sẽ là lùi về sau. Không ai làm theo."* Xoá chúng là xoá lý
   do; chuyển chúng xuống phụ lục là một lần sửa cơ học lớn trên file 627 KB để đổi lấy
   không có gì — mọi thông tin vẫn còn nguyên vị trí cũ, chỉ khác chỗ, và người đọc sau
   sẽ phải tra hai nơi.

Lỗi thật còn lại **hẹp hơn nhiều** so với mô tả: **chỉ có cặp "28 / 61" là sai** (đúng ra
31 / 64), cộng thêm số **56** ở dòng 6 và 396 là **số thứ ba đang sống mà không dòng bảng
nào sinh ra.** Nguyên nhân của cả ba là cùng một thói quen: ba chỗ ghi con số ở ba thời
điểm khác nhau, và bảng cứ lớn dần theo các lượt sửa song song. Mặc định ở đây là **thu
con số về một mốc đo duy nhất và bỏ mọi mốc thứ hai**, vì đó là thứ giữ cho lần sửa sau
này không tái tạo mâu thuẫn.

**Về 56:** nó KHÔNG suy ra được từ hai bảng, và không nên cố ép nó bằng phép cộng — bảng
còn chứa các hàng vi phạm luật `AGENTS.md` lộ ra lúc chép (`private`, `ReturnType<`,
`vitest`, đuôi `.ts"` trong specifier), vốn không phải *"va chạm với code"* theo nghĩa
dòng 6. Nên nó là một mốc thứ ba độc lập, và mặc định an toàn là **bỏ nó**, dùng chung mốc
với bảng, thay vì giữ một con số không kiểm chứng được.

#### Bằng chứng

```bash
$ git log --oneline -1
e55bbee docs(plans): repair 8 blocking and 9 major defects; add 36 gap work items
$ git status --porcelain MILESTONE_1B_EXECUTION_PLAN.md   # (rỗng — file sạch, đo trên HEAD)
$ stat -f '%Sm %N' -t '%Y-%m-%d %H:%M:%S' MILESTONE_1B_EXECUTION_PLAN.md .lavish-wip/applied/NEEDS-OWNER-DECISION.md
2026-09-29 05:11:00  MILESTONE_1B_EXECUTION_PLAN.md
2026-09-29 00:41:30  .lavish-wip/applied/NEEDS-OWNER-DECISION.md   # đo TRƯỚC cây ~4.5 giờ và trước 1 commit → số của nó cũ

# Đếm lại (một lệnh, lặp lại được):
$ F=MILESTONE_1B_EXECUTION_PLAN.md
$ awk 'NR>=3312 && NR<=3344' $F | grep -c '^|'   # bảng 1, dòng 3312–3344
33
$ awk 'NR>=3358 && NR<=3388' $F | grep -c '^|'   # bảng 2, dòng 3358–3388
31
# theo package:
#   bảng 1: 7 chord, 11 protocol, 7 server, 8 client                     -> 33
#   bảng 2: 1 client, 12 durable, 5 telemetry, 13 evals                 -> 31
#   durable (ngoài phạm vi): 12
#   tổng 64 ; thuộc 6 package trong phạm vi = 64 - 12 = 52
```

*Văn xuôi đang gì:*

```bash
$ sed -n '6p'    $F   # "... 516 symbol công khai, 56 va chạm với code"
$ sed -n '396p'  $F   # "**56 va chạm được ghi nhận.**"
$ sed -n '3308p' $F   # "**33 trong 61 va chạm** ... 28 va chạm còn lại ... nằm ở phần 2."
```

*Câu phân định `durable` ĐÃ CÓ SẴN:*

```bash
$ sed -n '3353p' $F
# "... **12 hàng `durable` còn nằm trong bảng là tài liệu tham khảo,
#     không phải việc phải làm** — xem mục 5."

$ sed -n '405,407p' $F
# "Cả ba mục dưới đây nằm ở `pi-durable`, và `durable` không được chép trong đợt này
#  ... Chúng được giữ lại như **tài liệu tham khảo**: đây là bằng chứng cho thấy
#  vì sao chép `durable` sẽ là lùi về sau. Không ai làm theo."
```

#### Cách đảo ngược

Đảo ngược là **một sửa bốn dòng**, tất cả trong `MILESTONE_1B_EXECUTION_PLAN.md`. Không
đụng code, không đụng bất kỳ package nào:

1. Dòng **3308** — đổi về câu hiện tại: *"**33 trong 61 va chạm** … 28 va chạm còn lại"*.
   (Ghi đè mặc định 64/31.)
2. Dòng **6** và dòng **396** — giữ nguyên số **56**. (Ghi đè mặc định gộp về 64/52.)
3. Dòng **3353** — giữ nguyên câu phân định 12 hàng `durable`.

**Không cần đụng tới 64 hàng bảng.** Đây là lý do mặc định được chọn: mọi thứ đo được
nằm ở văn xuôi, nên quyết định có thể bị đảo ngược trong một commit tài liệu mà không
cần chạm tới bất kỳ hàng bảng nào — **chi phí đảo ngược bằng 0 về mặt hành vi.**

Nếu sau này muốn bảng chỉ gồm việc thật (phương án (b)) hoặc bỏ hẳn `durable`
(phương án (c)), đó là việc riêng và **phải làm theo thứ tự ngược**: (i) chuyển/xoá 12
hàng `durable` trước, (ii) đếm lại từ cây đã đổi, (iii) rồi mới sửa văn xuôi theo số
mới. Làm ngược thứ tự này là chính x là cái sai lặp lại đã sinh ra 56/61/33.

---

### Mục 6 — Rút hàng `WI-4` đã chốt ra khỏi nhóm câu hỏi mở?

`item-6-m2-closed-questions-counted-as-open` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** Hai câu hỏi `WI-4` đã gạch *"ĐÃ CHỐT"* vẫn nằm trong bảng câu hỏi của M2 và
vẫn được đếm vào *"câu hỏi còn mở"* ở hai file. Có rút chúng ra khỏi nhóm và cập nhật số
đếm không?

#### Mặc định đã chọn

**Sửa số, GIỮ hàng — 90 → 89 và 24 → 23 ở 6 chỗ. KHÔNG rút hàng `M2:5151` ra khỏi bảng.**

Sáu chỗ mang số cũ:
```
MILESTONE_2_EXECUTION_PLAN.md:5, :5063, :5166
COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4965, :10023, :10126
```

#### Lý do

Phép trừ trên một bảng đếm được, không phải lựa chọn sản phẩm: không đổi hợp đồng với
người dùng, không đổi tên thương hiệu, không chọn giữa hai kiến trúc, không cần biết ý
muốn chủ sở hữu. Câu trả lời tự nằm trong cây.

**Hệ quả thật: 4/5 phần của mục 6 đã hết hạn** — số *"69"* chỉ còn ở dòng tổng kết và đã
được dán nhãn lịch sử, bản sao ở plan tổng đã vá xong, và **chỉ còn MỘT hàng đã chốt chứ
không phải hai.** Phương án (a) gợi ý (*"rút hai hàng, đếm lại từ đầu"*) không còn đúng
hình dạng việc, nên phải thu hẹp thành **sửa số**.

**Giữ hàng thay vì rút**, vì hàng `M2:5151` **LÀ bằng chứng cho chính quyết định đã chốt** —
nó ghi lại rằng `Object.freeze` một mình không có cơ chế cưỡng chế và phần `Readonly` đã
được kiểm chứng bằng probe TS2542. Rút đi là mất lý do. Nó cũng không nằm sai chỗ: ở
Nhóm 2 vì chặn phạm vi chứ không chặn bắt đầu, và cột cuối đã ghi sẵn mặc định — **chỉ là
bị đếm sai.**

> **Lưu ý phép đếm.** Hàng CÓ sẵn mặc định vẫn là câu hỏi mở (cột cuối là *"Mặc định sẽ
> được áp nếu bạn im lặng"*, nên `WI-2` hard-fail và `WI-5` `invalidateAllCaches` vẫn
> tính). Chỉ hàng **gạch chân + ĐÃ CHỐT** mới là câu chết, và toàn bộ hai bảng chỉ có
> đúng một hàng như vậy.

**Mục 6 nên bị hạ xuống khỏi nhóm "chặn việc bắt đầu"**: hàng đóng duy nhất nằm ở Nhóm 2
nên nó chưa bao giờ chặn bắt đầu một work item nào.

#### Bằng chứng

Đo trên `~/Projects/ultraworkers` @ `e55bbee`, nhánh `milestone-1`. HEAD trôi từ
`6e8109d` sang `e55bbee` trong lúc đo; số đếm không đổi.

*Phần đã hết hạn (4/5):*

1. `grep -rn 'không ai sở hỏu nó' *.md .lavish-wip/applied/*.md` → **0 hit trong cây**; chỉ
   khớp chính `NEEDS-OWNER-DECISION.md:289`. Bản sao ở plan tổng **ĐÃ vá**:
   `COMPREHENSIVE:10111` mang hàng gạch
   `~~Chú thích Readonly<> land trong WI-4 hay chờ WI-4b?~~ **ĐÃ CHỐT**`.
2. `M2:5` ghi *"90 câu hỏi còn mở"*, **không phải 69**. Số 69 chỉ còn ở `M2:5166` và đã
   được dán nhãn lịch sử: *"(Trước đợt sổ khoảng trống 2026-09-29: 69 câu trên 68 dòng,
   47 + 22…)"*.
3. Dòng 4248 không phải dòng đếm; dòng đếm là 5166 (trôi từ 4330).
4. Chỉ còn **MỘT** hàng `WI-4` đã gạch, ở `M2:5151` (Nhóm 2) — không phải hai hàng ở
   4317/4360.

*Lỗi còn lại — lệch đúng một. Biên bảng: Nhóm 1 = 5071-5135, Nhóm 2 = 5141-5164.*

```bash
awk 'NR>=5071&&NR<=5135' MILESTONE_2_EXECUTION_PLAN.md | grep -c '^|'          # 65 hàng
awk 'NR>=5071&&NR<=5135' MILESTONE_2_EXECUTION_PLAN.md | grep -cE 'ĐÃ CHỐT|~~'  # 0 đã đóng
awk 'NR>=5141&&NR<=5164' MILESTONE_2_EXECUTION_PLAN.md | grep -c '^|'          # 24 hàng
awk 'NR>=5141&&NR<=5164' MILESTONE_2_EXECUTION_PLAN.md | grep -cE 'ĐÃ CHỐT|~~'  # 1 đã đóng
```

**65 + 24 = 89 dòng** — khớp đúng *"89 dòng bảng"* mà `M2:5166` đã ghi. Vỡ ở chỗ chia
nhóm: Nhóm 1 ghi *"66 câu"* là **đúng** vì hàng `M2:5079` gộp **HAI** câu (native addon
của `WI-4` và `WI-5`) vào một dòng → 65 hàng = 66 câu. Nhóm 2 ghi *"24 câu"* nhưng 24 là
số **HÀNG** và đang nuốt hàng đã gạch → thật sự còn **23 câu**. 66 + 23 = **89**.

*Không đụng vào:* `.lavish-wip/m2-index/questions.json` có 69 mục và vẫn giữ câu `WI-4`
về Readonly như câu đang sống. Nó là ảnh chụp 2026-09-27 trước đợt thêm 21 dòng, và
`grep -rn 'm2-index' *.md` chỉ ra hai chỗ nhắc tới `WI-8a.spec.json` và symlink
`m2-index/specs` — **KHÔNG file kế hoạch nào lấy số từ nó.**

*Xác nhận tuân thủ "DOC CHI":*
`git status --porcelain -- '*.md' | grep -v '^?? \.lavish-wip/'` → **rỗng.** Không file
kế hoạch nào bị sửa.

#### Cách đảo ngược

Sáu số trên là văn xuôi thuần trong markdown. Đảo ngược = thay `89` về `90` và `23` về
`24` ở đúng sáu dòng đó, rồi bỏ câu giải thích về hàng đã chốt. Nếu có xung đột với
lượt sửa khác: `git checkout -- MILESTONE_2_EXECUTION_PLAN.md
COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.

Không có code, không có state, không có hợp đồng với người dùng — **đây là đường đảo
ngược rẻ nhất trong cả 11 mục.**

---

### Mục 7 — Thân §W8 giữ làm vết hay thu gọn?

`m7-item7-w8-trace-keep-or-collapse` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** §W8 (dòng 1570-1830 của `MILESTONE_1_EXECUTION_PLAN.md`) nên giữ nguyên thân
278 dòng làm vết, hay thu gọn lại? Và hai chi tiết nhỏ đi kèm (neo dòng sai, lệnh cổng
không nhãn) có sửa không?

#### Mặc định đã chọn

**(a) — giữ nguyên thân §W8**, và sửa **hai chỗ nhỏ**. Hai sửa phải áp cho **CẢ HAI file**:

1. Thêm nhãn ⛔ vào dòng cổng `M1:1779` / `COMPREHENSIVE:2200`.
2. Sửa neo *"ở dòng 1762"* → **"1779"** (ở `M1:1592` / `COMPREHENSIVE:2013`).

#### Lý do

Không phải quyết định sản phẩm — không đổi hợp đồng người dùng, không đổi tên thương
hiệu, không chọn giữa hai kiến trúc lớn. Đây là quyết định **hình dạng tài liệu nội
bộ**, và cây đã tự quyết được nó bằng **tiền lệ của chính nó**:

1. File đã chọn *"giữ vết"* nhất quán chứ không phải một lần: **10 khối ⛔ đã nằm sẵn
   bên trong §W8** (1581, 1604, 1622, 1752, 1774, 1777, 1793, 1803, 1804, 1827), không
   mục nào bị xoá.
2. Văn xuôi đã **tự gọi W8 là vết hai lần** bằng câu không thể nhầm — `M1:4308` *"§W8 vẫn
   còn nguyên trong file này như vết của spec cũ"* và `M1:4411-4413` *"đọc nó như một bản
   ghi, đừng suy ra W8 còn cần làm"*.
3. **Cả 12 tham chiếu §W8 trong repo đều trỏ tới khối ⛔ ở đầu mục, không tham chiếu
   thân** — người đọc đã được dẫn đúng chỗ.

Vậy chi phí thật của việc giữ thân **không phải** *"278 dòng gây hiểu nhầm"* mà là đúng
**MỘT ô trong bảng Cổng không có nhãn** — và ô đó là thứ duy nhất cần sửa. Giữ thân rẻ
hơn nhiều và đảo ngược bằng một dòng.

Hai phương án còn lại:

- **(b) thu gọn** — đo được rẻ hơn report tưởng (W8 chứa **0** tham chiếu
  `anthropic.kdl` nên không mất gì thuộc về W7), nhưng vẫn không phải mặc định vì đó là
  thay đổi **lớn hơn nhiều** trong file 685 KB, script đồng bộ hai file đang hỏng
  (`.broken`), nên đảo ngược tốn hơn một lượt sửa văn xuôi.
- **(c) chuyển xuống phụ lục** — tạo cấu trúc mới và **phá các neo trỏ vào bên trong W8**.

Về mặt *"chọn mặc định an toàn"*: (a) không xoá gì, không đụng bề mặt công khai, đảo ngược
bằng một thay đổi nhỏ — **đúng ba tiêu chí.**

#### Bằng chứng

HEAD `e55bbee`, nhánh `milestone-1`.

*Phạm vi:*

```bash
grep -n "^## W[0-9]"   # W8 ở 1579, W9 ở 1857  =>  §W8 = 278 dòng
# (khối ⛔ 1581-1601 = 23 dòng; thân sau block 1603-1856 = 254 dòng)
# Report ghi "260 dòng" — LỆCH.
```

*Ba chỗ report sai — đo lại vì M1 sửa lúc 05:16 sau khi report viết lúc 00:41:*

1. Report: *"khối ⛔ trỏ dòng 1762, cổng thật ở 1758"*. **CẢ HAI SAI.**
   `sed -n '1758p'` → bullet *"**(4)** Nhánh idle"*; `sed -n '1762p'` → **DÒNG TRỐNG**;
   `sed -n '1779p'` → *"test ! -e packages/coding-agent/src/session/cache-warmer.ts — phần
   B của cổng"*. Nếu làm theo khuyến nghị *"1762→1758"* thì thay số sai bằng số sai
   khác. **Số đúng: 1779.**
2. Report phản biện phương án (b): sẽ *"mất các đính chính đã kiểm chứng về `anthropic.kdl`
   mà W7 vẫn dùng"*. **SAI.** `awk 'NR>=1579&&NR<=1856' | grep -c anthropic.kdl` → **0**.
   Tất cả 7 tham chiếu nằm trong §W7 (1385-1578). Thu gọn W8 không đụng tới chúng.
3. Report bỏ sót: **W8 được nhúng NGUYÊN VĂN** vào `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.
   `diff <(sed -n '1579,1856p' M1) <(sed -n '2000,2277p' COMPREHENSIVE); echo $?` → **0**
   (0 dòng lệch). **Sửa M1 mà không sửa mirror là tạo ngay một lệch mới.** Script đồng bộ:
   `.lavish-wip/sync-mirrors.js.broken` (đang hỏng). Cả hai file đều ở trạng thái `M` trong
   `git status` nên gộp một lượt sửa văn xuôi được.

*Cổng thật sự đỏ (đúng như khối ⛔ nói):*

```bash
ls -l packages/coding-agent/src/session/cache-warmer.ts        # tồn tại, 599 dòng
test ! -e …; echo $?                                            # 1
```

*Bất nhất cần sửa:* fence *"### Xác minh"* (1769-1782) — 1774 và 1777 mang nhãn
*"# ⛔ KHÔNG chạy được"*, nhưng **1779** (`test ! -e …cache-warmer.ts`) là **dòng DUY
NHẤT trong ba lệnh đó không có nhãn**, dù khối ⛔ nói *"đừng chạy nó"*.

*Tiền lệ giữ vết:* `awk 'NR>=1579&&NR<=1856 && /⛔/' | wc -l` → **10** khối ⛔ đã có
sẵn trong W8. `grep -c "§W8" M1` → **12** tham chiếu, tất cả trỏ tới khối ⛔ đầu mục.

#### Cách đảo ngược

Cả ba đều là sửa văn xuôi một dòng, không đụng code.

1. Bỏ nhãn ⛔ ở dòng cổng: xoá đuôi *"# ⛔ đỏ vĩnh viễn — đừng chạy"* tại `M1:1779` và
   `COMPREHENSIVE:2200`.
2. Đổi neo về số cũ: *"ở dòng 1779"* → *"ở dòng 1762"* tại `M1:1592` và
   `COMPREHENSIVE:2013`. (1762 vốn đã sai từ trước; khôi phục chỉ để khớp diff cũ.)
3. Thu gọn thân theo phương án (b): xoá 254 dòng `M1:1603-1856` và `COMPREHENSIVE:2024-2277`,
   thay bằng một đoạn tóm tắt. Đã đo trước: không mất gì thuộc `anthropic.kdl` (0 tham
   chiếu trong W8). **Phải chạy lại script đồng bộ** — nhưng `.lavish-wip/sync-mirrors.js`
   đang hỏng (đổi tên `.broken`), phải sửa script trước khi dùng. **Đây là lý do (b) không
   phải mặc định: đảo ngược nó tốn hơn một lượt sửa văn xuôi.**

---

### Mục 8 — Có cập nhật 5 neo dòng trong `DECISIONS.md` không?

`decisions-md-anchors-into-m2` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** Có cập nhật lại các neo dòng trong `.lavish-wip/applied/DECISIONS.md` đang
trỏ vào `MILESTONE_2_EXECUTION_PLAN.md` không, và có đổi sang trỏ theo nội dung thay vì
theo số dòng không?

#### Mặc định đã chọn

**(b) — thay 5 neo số dòng bằng neo theo nội dung** (grep theo tiêu đề/cụm chữ), giữ số
dòng hiện tại chỉ làm chú thích *"tại e55bbee"*.

**Phương án (a) của file nguồn bị loại vì các con số nó chỉ ra là sai:**
`1484/1522/1642/4317/4360` — **không dòng nào chứa nội dung mà file mô tả.**

Năm lệnh grep thay thế, mỗi cái khớp **đúng một lần**:

```bash
grep -n '^## WI-4\. Đóng backdoor'                      # -> 1802
grep -n '^2\. \*\*Áp dụng thay đổi khai báo'            # -> 1840
grep -n '^- ~~\*\*Annotation `Readonly'                 # -> 1960
grep -n '^| WI-4 \| ~~Chú thích'                       # -> 5151
grep -n '^| WI-4 \| WI-4 là `Object.freeze`'            # -> 5196
```

#### Lý do

**Chẩn đoán đúng trong file nguồn là chẩn đoán sai.** Đây không phải *"`DECISIONS.md` lệch
đều 10 dòng"*, mà là `DECISIONS.md` **viết cho commit `6e8109d`** (nơi cả 5 neo rơi đúng
nội dung) và commit `e55bbee` đẩy M2 thêm **+856 dòng** mà không cập nhật nó. Lệch thật
là `+328/+328/+328/+844/+846`, **không đều**.

Áp phương án (a) đúng như đang viết sẽ để anchor **vẫn trỏ sai** — kết quả **tệ hơn
hiện trạng**, vì hiện trạng còn nhìn thấy là sai còn sau khi vá thì nó trông như đã đúng.
Ngay cả khi dùng số đúng (`1802/1840/1960/5151/5196`) thì (a) vẫn chỉ là **vá**: bằng
chứng rằng lỗi tái diễn là **HEAD đã chạy từ `6e8109d` sang `e55bbee` giữa chừng lúc
đo**, và chính `e55bbee` là cú đẩy làm lệch anchor — tức **M2 đang còn được sửa văn xuôi
và commit.**

Mặc định (b) là cách an toàn vì chạm **đúng một file scratch không được git track**,
không file kế hoạch nào bị sửa, không đụng bề mặt công khai, và **mỗi lệnh grep mới là
idempotent** — nếu nội dung sau này đổi tới mức không còn khớp, grep trả về rỗng và lệnh
fail, tức **lỗi lộ ra thay vì im**.

Đây là quyết định kỹ thuật thuần, không đổi hợp đồng người dùng, không đổi thương hiệu,
không chọn giữa hai kiến trúc lớn; toàn bộ 5 neo và 5 giá trị đúng đều **đo được bằng
lệnh đã chạy**.

**Ràng buộc duy nhất** mà file nguồn nêu là **phạm vi** (*"DECISIONS.md nằm trong
`.lavish-wip/`, ngoài phạm vi một file mà đợt này được phép chạm"*) — đó là **giới hạn
phạm vi của một lượt sửa trước, không phải ý định của chủ sở hữu.**

#### Bằng chứng

**HEAD chạy từ `6e8109d` sang `e55bbee` giữa chừng lúc đo — đã đo lại toàn bộ.**

1. Tại `6e8109d`, cả 5 neo rơi **ĐÚNG** nội dung mà file mô tả:
   ```bash
   for n in 1474 1512 1632 4307 4350; do git show 6e8109d:MILESTONE_2_EXECUTION_PLAN.md | sed -n "${n}p"; done
   # 1474 = "## WI-4. Đóng backdoor `toolRenderers`…"
   # 1512 = "2. **Áp dụng thay đổi khai báo.**…"
   # 1632 = câu hỏi Readonly/WI-4b
   # 4307 + 4350 = hai hàng bảng WI-4
   # M2 lúc đó dài 4536 dòng.
   ```
2. ```bash
   git show --stat --oneline e55bbee -- MILESTONE_2_EXECUTION_PLAN.md
   # -> "1 file changed, 884 insertions(+), 28 deletions(-)";  M2 dài 4536 -> 5392
   git show e55bbee:MILESTONE_2_EXECUTION_PLAN.md | grep -n "^## WI-4\."   # -> 1802
   git ls-files --error-unmatch .lavish-wip/applied/DECISIONS.md
   # -> "Did you forget to 'git add'?"   (không được track, không được e55bbee chạm)
   ```
3. Lệch thật đo từng neo: `1474→1802, 1512→1840, 1632→1960, 4307→5151, 4350→5196`
   ⇒ `+328/+328/+328/+844/+846`, **KHÔNG đều 10**.
4. Kiểm chứng *"giá trị đúng"* của file nguồn:
   ```bash
   for n in 1484 1522 1642 4317 4360; do sed -n "${n}p" MILESTONE_2_EXECUTION_PLAN.md; done
   # 1484 = | "retry_fallback_applied" | "retry_fallback_succeeded" |
   # 1522 = return { type: "turn_end", …
   # 1642 = ```bash
   # 4317 = đoạn văn "Cách sai thứ ba…"
   # 4360 = hàng bảng types.ts
   ```
   **Không dòng nào đúng mô tả** → *"+10"* là sai.
5. Bề mặt sửa thật: `grep -cE '\b(1474|1512|1632|4307|4350)\b'
   .lavish-wip/applied/DECISIONS.md` → **11 dòng, không phải 5.**
6. Mức chặn: `DECISIONS.md:232-233` tự ghi *"không chặn gì"*;
   `DECISIONS-RESOLVED.md:36` cột milestone ghi *"Không gấp"*.

#### Cách đảo ngược

**Không cần `git revert`** — `.lavish-wip/applied/DECISIONS.md` không được git track, nên
không có diff nào để hoàn tác. Cách đơn giản nhất: **chưa áp gì cả thì không cần làm gì.**

Nếu đã áp: sửa ngược **11 dòng** — 4 lệnh `awk` (dòng 221, 223, 229) và 2 lệnh `awk`
kiểm lại (274, 276) trở về `awk 'NR==…'` với số cũ; bảng *"Cần xuất hiện ở"* (239-242)
trở về cột số dòng cũ; và hai dòng văn xuôi (212, 232) trở lại tham chiếu 1512/4307.

Xác nhận đã về trạng thái cũ:
`grep -cE '\b(1474|1512|1632|4307|4350)\b' .lavish-wip/applied/DECISIONS.md` → phải ra **11**.

> Hai nửa (lệnh grep và bảng số dòng) **độc lập nhau** — bỏ riêng một nửa sẽ để lại anchor
> nửa sai.

---

### Mục 9 — Cắt `blob-broker` ra package tên gì?

`pi-durable-package-name` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** `blob-broker` được cắt ra package tên gì? Kế hoạch đề xuất
`@oh-my-pi/pi-durable` với lý do *"khớp `pi/durable`"* — nhưng `pi/durable` vừa bị phán
quyết là package chết và loại khỏi phạm vi chép. Giữ tên, đổi tên, hay bỏ lý do?

#### Mặc định đã chọn

**`@oh-my-pi/pi-blob`** — cắt `blob-broker` ra package tên này, **bỏ hẳn** lý do *"khớp
`pi/durable`"*, giữ nguyên vị trí Giai đoạn 3 (cắt package đầu tiên).

**KHÔNG để trống chỗ đặt tên** (điều mà `DECISIONS-RESOLVED.md` mục 9 bản cũ đã dàn
dọng thành một mục riêng).

Dán vào `PACKAGE_REORGANIZATION_PLAN.md`, **chỉ hai dòng: `:1161` và `:1205`.**
Dòng 434 và 446 nói về `pi/durable` **của repo `pi`** — **giữ nguyên, không đổi.**

#### Lý do

**Đo trước rồi mới chọn.** Ba phát hiện quyết định:

1. **`pi-durable` không tồn tại ở bất kỳ đâu ngoài file kế hoạch.** 0 hit trong `bun.lock`,
   0 dependency trong mọi `package.json`, không có trong `node_modules`,
   `git ls-files | grep -i durable` → 0 dòng. Nghĩa là **đổi tên ở đây không phá cài đặt
   nào — không có gì để phá.** Đây là lý do an toàn quyết định: rủi ro của việc đổi tên
   bằng đúng 0.
2. **Phán quyết `durable` là thật** *(đã tự chạy lại ở `~/Projects/pi-ref`)*: 63 file /
   21.093 dòng, **0 package ngoài nó import** (4 hit `pi-durable` bên ngoài
   `packages/durable/` đều là README, package-lock, tsconfig path, và một smoke script —
   không cái nào là mã sản phẩm). Mượn tên một package chết là mượn **nhãn của thứ không
   ai dùng**, và tên được đọc *trước* chú thích nên chú thích không cứu được.
3. **`pi-storage` (gợi ý của nguồn) là tên SAI — đo được.** `grep -c Storage` trên 27 file
   → **0 identifier**. Tầng này không lưu trữ, nó **mints URL** (*"Blob URL backends: give
   outgoing images an externally fetchable URL"* — chính docstring của `broker.ts:1`). Từ
   vựng thật: `BlobDestinationId` 59, `BlobUploader` 52, `BlobPublication` 36,
   `BlobUploadRequest` 27, `BlobBackend` 14. **Mọi tên đều bắt đầu bằng `Blob`.**

`pi-blob` khớp từ vựng mà code đã dùng — không cần giải thích lại, không thể hiểu sai.

Cắt `blob-broker` vẫn đúng là cắt đầu tiên: số đo tự đứng vững, không cần `pi` biện minh
(27 file, 8.917 dòng, chỉ 6 nơi import sản phẩm). **Đây là seam rẻ nhất trong toàn bảng.**
Phần cắt đã chốt từ trước — câu hỏi chỉ là *tên*, và tên thì cây tự trả lời được.

#### Bằng chứng

*Tên "pi-durable" chỉ có trong file kế hoạch:*

```bash
grep -c "pi-durable" bun.lock                                                       # 0
grep -rn "pi-durable" --include=package.json packages/ package.json                 # rỗng
ls node_modules/@oh-my-pi/ | grep durable                                             # không có
git ls-files | grep -i durable                                                       # 0 dòng
```

*Phán quyết `durable` tự kiểm ở `~/Projects/pi-ref`:*

```bash
git ls-files 'packages/durable/*' | wc -l                                            # 63
git ls-files 'packages/durable/*' | xargs wc -l | tail -1                           # 21093
git grep -n "pi-durable" -- '*.json' '*.ts' '*.md' | grep -v '^packages/durable/'
# -> chỉ README.md:33, package-lock.json:738,5778,
#    scripts/durable-browser-smoke-entry.ts:1-4, tsconfig.json:19-21   (0 mã sản phẩm)
git show HEAD:packages/agent/package.json | grep -c durable                          # 0
```

*Số đo `blob-broker` hôm nay (kế hoạch ghi 8.944d / 18 importer):*

```bash
find packages/coding-agent/src/blob-broker -type f | wc -l                           # 27  ✓
find packages/coding-agent/src/blob-broker -name '*.ts' -exec cat {} + | wc -l        # 8917  (≠ 8944)
# Đã loại trừ lỗi đếm newline: 0/27 file thiếu newline cuối -> 8944 là con số cũ, code đã đổi.

# importer sản phẩm: 6 — cli.ts, cli/images-cli.ts, config/all-settings.ts, sdk.ts,
#   session/provider-image-budget.ts, session/snapcompact-inline.ts   (+13 file test)
# "18" là số file kiểu cũ, không phải số nơi import.

ls packages/coding-agent/src/blob-broker/index.ts    # không có barrel
# -> cắt ra phải tạo index.ts + exports + workspace entry (chi phí đã tính sẵn trong kế hoạch)
```

*Tên mới bám số đo:*

```bash
grep -c "Storage" packages/coding-agent/src/blob-broker/*.ts          # tất cả 0
grep -ohE "\bBlob[A-Za-z]*" packages/coding-agent/src/blob-broker/*.ts | sort | uniq -c | sort -rn
# BlobDestinationId 59 · BlobUploader 52 · BlobPublication 36 · BlobUploadRequest 27
# Upload 16 · BlobBackend 14 · BlobRegistryEntry 8
grep -rl "@oh-my-pi/pi-blob"    .   # 0
grep -rl "@oh-my-pi/pi-storage" .   # 0
cd ~/Projects/pi-ref && ls packages/ | grep -iE 'blob|storage'   # rỗng
```

*Vị trí dán (đo lại hôm nay, số dòng trong nguồn đã trôi):*
`grep -n "pi-durable" PACKAGE_REORGANIZATION_PLAN.md` → **434, 446, 1161, 1205**.
434 và 446 nói về `pi/durable` **của repo pi** → **KHÔNG đổi.** Chỉ đổi **1161** và **1205**.

*Không sửa file kế hoạch nào:* `git status --porcelain | grep -v '^??'` → **rỗng** (cây sạch).

#### Cách đảo ngược

Một lần sửa `.md`, không đụng code — vì package chưa tồn tại:

```bash
# chỉ 2 dòng; 434/446 giữ nguyên vì chúng nói về pi/durable của repo pi
sed -i '' '1161s/@oh-my-pi\/pi-blob/@oh-my-pi\/pi-durable/' PACKAGE_REORGANIZATION_PLAN.md
sed -i '' '1205s/pi-blob/pi-durable/' PACKAGE_REORGANIZATION_PLAN.md
```

Nếu **đã cắt package thật rồi** mới muốn đổi tên: `git mv packages/blob
packages/pi-durable`, sửa `name` trong `package.json`, sửa path trong `tsconfig.json`,
rồi `grep -rl '@oh-my-pi/pi-blob'` để bắt nốt. Vẫn một commit — và **vẫn chưa ai import
vì nó mới.**

---

### Mục 10 — Quy ước đếm thư mục trong kế hoạch tổ chức lại

`reorg-count-convention` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** `PACKAGE_REORGANIZATION_PLAN.md` đếm thư mục theo **hai quy ước khác nhau**
(chỉ `.ts`/`.tsx` = 149 vs tất cả file = 174), nên bảng tự mâu thuẫn. Có dành một đợt đo
lại toàn bộ và chốt quy ước không, hay chỉ sửa những số đã lỗi thời?

#### Mặc định đã chọn

Chọn **quy ước `.ts`/`.tsx`** làm mặc định. Sửa **5 dòng** đang mang số cũ
`147` / `59.871` / `407` / `61.718`, và thêm **một câu** tuyên bố quy ước ngay trên bảng §1.

| Dòng | Sửa |
|---|---|
| `:336` | `pi/src/core 96 file vs omp/src/tools 147 file` → **149** |
| `:377` | `\| **tools** \| 147 \| 59.871 \|` → **149** / **61.700** |
| `:449` | `(147 file/59.871 = 407 dòng/file)` → **149** / **61.700** = **414** |
| `:647` | `### 4.2 tools (147 file, 359 out-edge)` → **149** |
| `:102` | `\| tools \| 149 \| 61.718 \|` → dòng = **61.700** (lệch 18) |

**TUYỆT ĐỐI KHÔNG sửa** `browser 50`, `computer 7`, `jfind 8`, `puppeteer 14 .txt`,
`84 file`, `prompts 227` — **chúng đã đúng.**

#### Lý do

**Mục 10 đúng 50%, và phần sai của nó là phần nguy hiểm.** Nó khuyên sửa `browser 50 → 59`
và `computer 7 → 9` vì tưởng đó là số cũ. Đo thật: **50 và 7 CHÍNH LÀ số đếm `.ts`**, còn
59 và 9 là số đếm tất cả file (phần dư là asset `.txt`/`.js`/`.py`). **Làm theo khuyến
nghị của mục 10 sẽ chuyển hai số ĐÚNG sang quy ước SAI** — tức chính tạo ra cái lỗi quy
ước lẫn mà mục 10 đang cố dẹp.

Tệ hơn: đo **11 hàng của bảng §1** → **10/11 khớp cột `.ts`, 0/11 khớp cột "tất cả"**.
Nghĩa là quy ước `.ts` **đã thắng trong chính file này rồi** — 149 không phải số may
mắn, nó là số đúng theo quy ước của cả bảng. Và `:653` đã **tự nói ra quy ước**
(`puppeteer 14 file .txt + 0 file .ts`, đo lại khớp tuyệt đối). **Quy ước có sẵn trong
file, chỉ viết rải rác thay vì ở đầu bảng.**

**147 không phải "quy ước thứ hai" mà là số mồ côi:** `git ls-tree` cho thấy 149 đã đúng
từ commit phát hành đầu tiên, nên 147 đo từ trước khi `pi` được chép vào `omp` và bị
mang nguyên văn sang §4.2. **Một số không khớp không tự sinh ra quy ước.**

Chọn mặc định an toàn vì: mọi số sửa đều có lệnh đo; toàn bộ thay đổi nằm trong
markdown, không đụng bề mặt công khai hay cây code; **phần đắt nhất của phương án (a) —
đo lại nhiều thư mục — đã xong** và nó cho ra 10/11 hàng vốn đã đúng, nên (a) còn lại
đúng bằng **một câu**. Không chọn (a) vì trả tiền cho một đợt riêng để làm việc còn sáu
dòng là chi phí vô nghĩa khi kết quả đo đã nằm sẵn.

#### Bằng chứng

*Đo trước — `cd packages/coding-agent/src/tools`:*

```bash
find . -type f | wc -l                                                            # 174
find . -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l                        # 149
find . -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn
# 149 ts · 21 txt · 2 py · 2 js
```

*Bằng chứng quyết định — 11 thư mục của bảng §1, đếm cả hai cách:*

```
config 24/25 · session 90/90 · tools 149/174 · modes 67/67 · extensibility 68/71
utils 41/43 · cli 78/78 · capability 18/18 · internal-urls 29/29 · registry 3/3 · mcp 26/26
(cột trước = .ts, cột sau = tất cả)

File ghi lần lượt: 24, 89, 149, 67, 68, 41, 78, 18, 29, 3, 26
-> 10/11 khớp `.ts`, 0/11 khớp "tất cả". Bảng §1 là bảng `.ts`.
```

*Hai số mục 10 bảo sửa — `:652` ghi `browser 50, computer 7, jfind 8`:*

```
browser:  all=59, ts=50  -> 50 ĐÚNG
computer: all=9,  ts=7   -> 7 ĐÚNG
jfind:    all=8,  ts=8   -> đúng
```
Chênh lệch là asset: `tools/browser/` có 21 `.txt` (stealth bundle, `manifest.json.txt`,
`LICENSE.txt`) + 2 `prelude.js`; `tools/computer/` có 2 `prelude.py`.
`:653` ghi `puppeteer 14 .txt + 0 .ts` → `find puppeteer -name '*.ts' | wc -l` = **0**,
`-name '*.txt'` = **14**. **Khớp tuyệt đối** → quy ước `.ts` đã được nêu ngay trong file.

*147 có cũ thật không — `git ls-tree -r --name-only <rev> -- packages/coding-agent/src/tools`:*

```
ecd516f (phát hành đầu):  ts=149  all=174
f804d66 (sync omp 18.4.0): ts=149  all=174
HEAD:                      ts=149  all=174
```
→ **149 đúng ngay từ đầu**; 147 là số đo từ trước khi chép `pi`, **không phải ảnh chụp cũ
hơn cùng quy ước.**

*Dòng đúng, KHÔNG ĐỤNG:* `:16` `:102` `:1230` (149) · `:652` (50/7/8) · `:653` (14) ·
`:654` (`find . -maxdepth 1 -type f | wc -l` = **84**, cả 84 đều là `.ts`) · `:695`/`:795`
(`find packages/coding-agent/src/prompts -name '*.md' | wc -l` = **227**, `-type f` =
**227** — bất biến cổng nghiệm thu đứng vững dù chọn quy ước nào).

#### Cách đảo ngược

Không cần `git revert` (mọi thứ untracked/markdown):

1. Bốn số `147` ở `:336`, `:377`, `:449`, `:647` → **147**.
2. `59.871` → trả lại, `407` → trả lại, `61.718` → trả lại, **xoá** `61.700` và `414`.
3. **Xoá câu quy ước** thêm ở bước 4.

Tổng: **5 số + 1 câu.**

> **Phát hiện khi đảo ngược:** nếu thấy `50`/`7` ở `:652` bị đổi thành 59/9 thì đợt sửa
> đó **đã đi ngược quyết định này** — số đúng bị chuyển sang quy ước sai.

---

### Mục 11 — Con số "141 đính chính" trong M1

`NEEDS-OWNER-DECISION-11-m1-141-correction-count` · `decidable_without_owner: true` · `blocking: false`

**Câu hỏi.** Mục 11 đặt ba phương án cho con số *"141 đính chính"* — (a) giữ nguyên 141,
(b) đếm lại theo phạm vi hiện hành bỏ W8, (c) giữ 141 và thêm câu chú thích — với lập luận
rằng 141 là **một số đúng nhưng không tự kiểm được**. Đo thật cho thấy **cả ba phương
án đều dựa trên một tiền đề sai:** 141 không bao giờ đúng ở bất kỳ commit nào. Bảng
*"Đính chính so với plan tổng"* chỉ có **22 dòng**, thuộc **3 mục con** (W1=9, W2=7, W3=6),
trong khi M1 có **22 work item** (W1–W22).

**Câu hỏi thật:** giữ một tuyên bố trọn vẹn sai, hay sửa số cho khớp cái đo được?

#### Mặc định đã chọn

**Sửa 141 → 22 ở cả hai chỗ** trong `MILESTONE_1_EXECUTION_PLAN.md` (dòng **4415** và
**4537**), và **thêm một câu phạm vi** ngay dưới phần mở đầu:

> Mục này hiện chỉ phủ **W1–W3**; **W4–W22 chưa có bảng đính chính** — nên câu *"hãy dùng
> tài liệu này làm nguồn"* chỉ đúng trong phạm vi W1–W3.

Giữ nguyên toàn bộ **22 dòng đính chính** và **ba tiêu đề con W1/W2/W3**. Không xoá gì,
không đánh số lại, không đụng 21 mục W còn lại.

#### Lý do

**141 không phải là *"con số đúng nhưng không tự kiểm được"* — nó là một tuyên bố sai**, và
nó đang được dùng như **giấy chứng nhận độ phủ**. Dòng 4415 viết *"Bảng dưới liệt kê ĐỦ
141 đính chính"*; chữ **"đủ"** là lời hứa trọn vẹn.

Tệ hơn, dòng 4537 dùng chính con số đó để bảo người đọc *"Hãy dùng tài liệu này làm
nguồn, và coi plan tổng là bản khảo sát ban đầu"* — người đọc tin 141 sẽ tin **cả 22
mục W** đã được đối chiếu, trong khi **19/22 mục (86%) chưa từng được.**

**Bằng chứng nặng nhất:** phần mở đầu của chính mục này **tự mâu thuẫn với bảng ngay
dưới nó** — preamble liệt kê đính chính cho W1–W17 (*"13 mục (W3, W4, W5, W6, W7, W9, W10,
W11, W12, W13, W15, W16, W17)"*, 12 mục trích pi-ref, 3 mục gọi `bun check`, 5 mục bị gộp
môi trường), còn bảng chỉ phủ W1–W3. Plan gốc `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`
có đủ W1–W22 (dòng 639-4616), nên **W4–W22 CÓ chất đính chính, chỉ là chưa ai viết ra.**

**Lập luận bảo vệ 141 trong tài liệu nguồn là vòng tròn:** nó dẫn chứng dòng 4537 là
*"định nghĩa"*, nhưng đọc thật thì câu đó chỉ trỏ ngược lại chính cái bảng để giải thích
con số trong bảng (*"141 đính chính ở mục […] là những điểm cụ thể mà phần M1 của plan
tổng không còn đúng"*) — nó **không nói vì sao 141 chứ không phải 22**. Đó không phải
định nghĩa, đó là **lặp lại**.

Hai phương án còn lại:

- **(b) đếm lại theo phạm vi hiện hành bỏ W8** — bị bác vì **tiền đề hỏng**: W8 không có
  dòng nào trong bảng, nên bỏ W8 khỏi phạm vi không làm thay đổi con số — dưới mọi cách
  đọc, số là **22**.
- **(c) giữ 141, thêm chú thích** — bị bác vì **sai là con số chứ không phải chú thích của
  nó**: thêm câu *"141 nghĩa là số chênh lệch"* vào một bảng 22 dòng vẫn là tuyên bố sai,
  chỉ thêm chữ.

Mặc định chọn là hướng **an toàn**: không xoá thông tin nào, không đụng bề mặt công khai
(đây là tài liệu kế hoạch nội bộ, không phải API ship), không đổi hành vi bất kỳ mục W
nào, và quan trọng nhất là **NÊU KHOẢNG TRỐNG thay vì che nó** — sau khi sửa, người đọc
tự biết W4–W22 chưa được đối chiếu.

#### Bằng chứng

Đo trên `~/Projects/ultraworkers` @ `e55bbee`, 2026-09-29.

1. Số dòng đính chính thật:
   `awk 'NR>=4409 && NR<=4461' MILESTONE_1_EXECUTION_PLAN.md | grep -c "^| [0-9]"` → **22**.
2. Những dòng đó thuộc mục nào: `grep -E "^### W[0-9]+ —"` → chỉ **W1 (9) + W2 (7) + W3
   (6) = 22**.
3. M1 có bao nhiêu work item: `grep -cE "^## W[0-9]+\."` → **22** (W1–W22).
   ⇒ **Mục này phủ 3/22 mục.**
4. **141 có từng đúng không:**
   ```bash
   git show 33d6e33:MILESTONE_1_EXECUTION_PLAN.md | awk '/^## Đính chính so với plan tổng/,0' | grep -c "^| [0-9]"   # 22
   git show 33d6e33:MILESTONE_1_EXECUTION_PLAN.md | grep -c "^### W"                                                        # 3
   ```
   Đây là commit đầu tiên của M1 (*"docs(m1): execution plan for milestone 1"*), khi plan
   còn có 17 mục W. **Con số 141 xuất hiện nguyên văn từ đó và chưa bao giờ khớp bảng.**
5. Có gì để đính chính cho W4–W22 không:
   `grep -nE "^#+.*\bW[0-9]+" COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` → plan gốc có đủ
   **W1–W22 tại dòng 639-4616**. W4–W22 **CÓ** chất đính chính, chỉ là chưa ai viết ra.
6. Phần mở đầu tự mâu thuẫn với bảng ngay dưới nó:
   `sed -n '4418,4422p' MILESTONE_1_EXECUTION_PLAN.md | grep -oE "W[0-9]+" | sort -u -V`
   → **W1…W17**; còn bảng thật phủ **W1, W2, W3**.
7. **Blast radius** — con số đã lan ra 6 chỗ, gồm một sổ cái tổng:
   `grep -n '141' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` → **265** (*"50 (toàn cục) + 141 ở
   M1 + 129 ở M2 + 134 ở M3 + 34 ở M4 + 146 ở M5"*), **354**, **4836**, **4958**.
   Dòng 265 **cộng 141 vào tổng 634**, nên **sửa M1 một mình sẽ để sổ cái không cộng với
   chính nó.** `MILESTONE_1_EXECUTION_PLAN.md`: **4415, 4537**.
8. **Vì sao không chặn:** mỗi mục W4–W22 tự mang spec đã kiểm chứng riêng với anchor cụ
   thể (ví dụ W4 tại `:850` xác nhận `case "_omp/usage":` ở `:1180` và 7 anchor
   `#sessions.get` bằng `git grep`). Con số sai làm hỏng **tuyên bố về độ phủ kiểm
   chứng**, không làm hỏng spec của từng mục.

> **Ghi chú — tài liệu nguồn trích dẫn số dòng đã trôi.** Nó dẫn *"dòng 3931"* cho câu
> định nghĩa và *"dòng 3887"* cho câu phạm vi việc. Ở HEAD `e55bbee` chúng là **4537** và
> **4493**; câu phạm vi việc đã được sửa thành **21** (22 nếu tính W8 đã gạch).

#### Cách đảo ngược

Sáu chỗ, đổi 22 về lại 141 và xoá câu phạm vi đã thêm:

- `MILESTONE_1_EXECUTION_PLAN.md` **4415** (*"đủ **22** đính chính"*) và **4537**
  (*"**22** đính chính ở mục […]"*) → trả về **141**
- Xoá câu *"mục này hiện phủ W1–W3, W4–W22 chưa có bảng đính chính"* đã thêm vào dưới
  phần mở đầu
- `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` **4836** và **4958** → trả về **141**
- `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` **354** (*"thêm **141** ở M1"*) và **265**
  (*"**50** (toàn cục) + **141** ở M1 + …"*) → trả về **141**

Không có gì khác phải gỡ: 22 dòng đính chính, ba tiêu đề con W1/W2/W3, và phần *"ĐỊNH
NGHĨA HOÀN THÀNH"* đều không bị đụng. Không migrate, không state, **không code nào đọc
con số này** — nó thuần văn bản.

> **Lưu ý khi đảo ngược:** số 141 là **con số sai đã đo được**, nên trả về nó là *khôi
> phục một tuyên bố trọn vẹn sai*, không phải khôi phục trạng thái đúng.

---

## (3) VẪN cần người quyết — và vì sao máy không tự quyết được

### Không mục nào trong 11 mục này còn cần người

Cả 11 đều mang `genuinely_needs_a_person: false` và `blocking: false`. Bản trước của file
này xếp 1, 2, 3 là **chặn**; đợt đo này gỡ cả ba. Lý do chung: cả 11 đều là quyết định
**kỹ thuật thuần** — không đổi hợp đồng người dùng, không đổi tên thương hiệu, không
chọn giữa hai kiến trúc lớn, và cây trả lời được bằng **đếm hàng**, **tiền lệ đã có sẵn
trong chính file kế hoạch**, hoặc **lệnh grep lặp lại được**.

### Năm thứ đã được dời ra, và cần người *sau khi* mặc định đã dán

Đây là danh sách trung thực. Mỗi dòng là một quyết định thật còn treo, **không phải** cái
cớ để giữ mục chưa làm.

| # | Còn treo gì | Vì sao máy không tự quyết được | Chặn gì |
|---|---|---|---|
| 1 | **Thêm hàng `M1B` (và `M7`) vào bảng milestone.** `DECISIONS.md:341-345` tự gọi tên phần này: *"bảng milestone thiếu M1B/M7 ở master … chưa quyết ở file này"*. Mặc định mục 1 **không** thêm hàng đó — nó chỉ viết một câu để khi ai đó thêm thì điền đúng ô *Phụ thuộc* (`M1, R0`). | Thêm một hàng vào bảng điều hướng là **cam kết về thứ tự thực thi** và làm bảng thành bảy hàng trong khi `PACKAGE_REORGANIZATION_PLAN.md:1` vẫn nói *"không thuộc sáu milestone"*. Phải sửa cả hai câu cùng lúc, và ai đó phải chịu trách nhiệm về việc sáu thành bảy. | Không gấp. Chặn việc xếp lịch M1B, không chặn M1. |
| 2 | **`WI-SESSION-LOG` — câu hỏi A-vs-B.** Mặc định mục 3 chỉ dựng **bảng lỗ hổng 7 dòng**, chưa dựng invariant. | Ở omp, `options.messages` **CHÍNH LÀ** `currentMessages` mà `ContextEvent` đưa ra — không có nguồn thứ hai, nên phép so sánh của phương án (a) vô nghĩa. Muốn nó có nghĩa thì phải có nơi thứ hai giữ state, và **bảy nơi ứng viên đúng là bảy dòng bảng lỗ hổng.** | Không gấp, nhưng **đây là câu hỏi kiến trúc thật** và nó chỉ thành câu hỏi sau khi bảng đo xong và số *"giữ state riêng" > 0*. **Nếu bảng ra 0, quy tắc dừng ở `M2:322-324` bảo dừng — không hỏi nữa.** |
| 3 | **Có nói tới ràng buộc cấp *wave* trong plan tổng không, và nói ở đâu.** `M2:97` nói *"không chặn M4 theo thứ tự này"* trong khi `COMPREHENSIVE:288` và đường găng thẽ ở `:291-292` ghi chuỗi `M1 → M2 → {M3, M4}` không nhắc Wave 1b. | Hai chỗ **không mâu thuẫn** (plan tổng nói về milestone, M2 nói về một wave trong milestone) nhưng cũng không ai trỏ tới nhau. Đây là quyết định về **mật độ tham chiếu của plan tổng**, không phải sự thật kỹ thuật. | **Không chặn** — sau mặc định mục 2, người đọc M4 đã thấy đầy đủ. Ghi ra để lượt sau không phải đo lại từ đầu. |
| 4 | **12 hàng `durable` ở bảng hay xuống phụ lục** (phương án (b)/(c) của mục 5). | Đó là chọn giữa **hai vai trò của cùng một tài liệu** (bảng việc phải làm vs. bảng tài liệu tham khảo). Mặc định đã chọn phía rẻ và đảo ngược bằng 0; nhưng nếu muốn bảng sạch thì đó là việc riêng. | Không gấp. **Phải làm theo thứ tự ngược: (i) chuyển/xoá hàng trước, (ii) đếm lại từ cây đã đổi, (iii) rồi mới sửa văn xuôi.** Làm ngược là tái tạo đúng 56/61/33. |
| 5 | **Bảng đính chính cho W4–W22 trong M1** (mục 11), và `.lavish-wip/sync-mirrors.js` đang hỏng. | Bảng đính chính W4–W22 là **công việc thực** (19 mục chưa từng được đối chiếu), không phải một phép đếm — máy không tự viết nội dung đối chiếu được mà không chạy lại từng work item. Script đồng bộ mirror thì hỏng ở mức file, và **mọi sửa đổi hai-file ở mục 3, 6, 7, 11 đều phụ thuộc nó.** | Không chặn. Nhưng nếu sửa mirror tay mà không có script, lỗi lệch sẽ **không tự báo**. |

### Cái KHÔNG còn cần người, đã gỡ trong đợt này

Ghi lại để không ai hỏi lại:

- **Mở `.lavish-wip/applied/DECISIONS.md` (mục 4, 8).** Đợt đo đầu gọi đây là ranh giới
  cấm chạm. Ranh giới đó là **thoả thuận làm việc của các đợt đó**, không phải chính sách
  repo: file untracked, không có quy tắc cấm-chạm nào của chính nó, và lý do tồn tại của
  nó (sợ chạm sửa kế hoạch đang bay) đã tan vì các file kế hoạch đã commit.
- **Quy tắc đếm thư mục (mục 10).** Đây *đã trông như* một thoả thuận, nhưng đo 11 hàng của
  bảng §1 cho **10/11 khớp `.ts`, 0/11 khớp "tất cả"** — quy ước đã thắng sẵn trong chính
  file. Và `:653` đã tự nêu nó. Máy chỉ việc thu nó lên đúng một chỗ.
- **Tên package (mục 9).** Trông như một lựa chọn phải sống với lâu dài, nhưng `pi-durable`
  **không tồn tại ở đâu ngoài file kế hoạch** → rủi ro bằng 0 — và `pi-storage` của nguồn
  là tên sai vì tầng này không *lưu trữ*, nó **mints URL**. Mọi identifier trong 27 file
  đều bắt đầu bằng `Blob`.
- **Giữ hay thu gọn §W8 (mục 7).** Trông như chọn giữa "giữ vết" và "spec có thể bắt tay
  làm", nhưng file **đã tự quyết rồi**: 10 khối ⛔ nằm sẵn trong §W8, văn xuôi tự gọi nó
  là vết hai lần, và cả 12 tham chiếu đều trỏ tới khối ⛔ đầu mục chứ không trỏ vào thân.
- **Cột "Phụ thuộc" của M1 (mục 1).** Trông như phát biểu về thứ tự thực thi, nhưng chỉ
  M1B mới chép package (169 file nguồn → 245 file chép vào); M1 sửa code trong năm package
  đã tồn tại và `grep -cE "package mới|new package|tạo package"` → **0**.

---

## (4) Ghi chú khi áp dụng

### Các mục cùng đụng một file — nên gộp lượt

| File | Các mục | Quy mô |
|---|---|---|
| `PACKAGE_REORGANIZATION_PLAN.md` | 9, 10 | 7 dòng + 1 câu |
| `.lavish-wip/applied/DECISIONS.md` | 4, 8 | 3 vùng liên tục + 11 dòng neo |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 5 | 4 dòng văn xuôi, **không đụng hàng bảng** |
| `MILESTONE_4_EXECUTION_PLAN.md` | 2 | 3 chỗ |
| `MILESTONE_1_EXECUTION_PLAN.md` + `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 3, 6, 7, 11 | **phải sửa CẢ HAI** |

### Bốn mục nhạy cảm với mirror — sửa một mình một file là tạo lỗi mới

Mục **3, 6, 7, 11** đều có phần ở `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` được **nhúng
nguyên văn** từ file milestone. Đây đúng là lớp lỗi *"viết một nơi, đọc nơi khác"* mà
`PASS3.md` mục 7 đã gọi tên — và `.lavish-wip/sync-mirrors.js` **đang hỏng** (đổi tên
`.broken`), nên mirror **không tự báo lệch**.

Mục 7 đã đo được bằng chứng cụ thể cho việc này:
`diff <(sed -n '1579,1856p' M1) <(sed -n '2000,2277p' COMPREHENSIVE); echo $?` → **0**.
Một sửa bên M1 mà không sửa bên mirror là tạo ngay một lệch.

Mục 3 và 6 ghi rõ số phải sửa ở **cả hai file** — đừng chỉ sửa `MILESTONE_2_EXECUTION_PLAN.md`.

### Trước khi áp: chạy lại `git status`

Các bằng chứng trong file này được đo **trong lúc HEAD trôi từ `6e8109d` sang `e55bbee`**.
Số dòng có thể đã dịch thêm. Ba việc nên làm trước khi dán:

```bash
git status --porcelain -- '*.md' | grep -v '^?? \.lavish-wip/'   # các file kế hoạch có sạch không
git log --oneline -1                                             # HEAD còn là e55bbee không
# rồi chạy lại các lệnh kiểm trong từng mục — chúng được viết để idempotent
```

### Đừng dùng số dòng từ bản cũ của file này hay từ `NEEDS-OWNER-DECISION.md`

Bản cũ dẫn `290-291` (mục 1) và nói §W8 dài *"260 dòng"* (mục 7, thật là **278**) —
cả hai đã lỗi thời. Mọi mục ở trên đã đo lại; hãy dán từ **đây**, không dán từ đó.

---

## Còn lại trong `NEEDS-OWNER-DECISION.md`

Bốn mục gốc đã hết hạn, không vào bảng này — bảng loại trừ nằm ở
`NEEDS-OWNER-DECISION.md:19-24`. Tài liệu đó **vẫn là nguồn của câu hỏi và phương án**;
file này chỉ thay phần *quyết định*. Sau khi áp các mặc định ở trên, mục (3) của tài
liệu gốc nên được đánh dấu lại cho khớp: nó vẫn ghi *"1 hit ở M3 (dòng 690)"*, trong khi
đo lại là **dòng 709**.
