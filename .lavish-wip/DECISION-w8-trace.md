# Quyết định: §W8 giữ thân làm vết, và hai chỗ phải sửa cùng lúc

Trả lời mục 7 của `NEEDS-OWNER-DECISION.md`. Đo lại tại HEAD `6e8109d`, nhánh `milestone-1`.

**Mặc định: (a) — giữ nguyên thân §W8.** Kèm hai sửa nhỏ, và hai sửa đó phải **áp cho cả hai
file** vì W8 tồn tại ở hai nơi.

---

## Kết quả đo — ba chỗ report đã lỗi thời

Report được viết lúc 00:41; `MILESTONE_1_EXECUTION_PLAN.md` sửa lúc 05:16. Ba chi tiết của nó
không còn đúng. Tôi đo lại từng cái:

| Report nói | Thật | Bằng chứng |
|---|---|---|
| "khối ⛔ trỏ **dòng 1762** trong khi cổng thật nằm ở dòng **1758**" | **Cả hai đều sai.** Cổng thật ở **1779**. | `sed -n '1758p'` → bullet `**(4)** Nhánh idle`; `sed -n '1762p'` → dòng trắng; `sed -n '1779p'` → `test ! -e …cache-warmer.ts` |
| (b) sẽ "mất các đính chính đã kiểm chứng về `anthropic.kdl` mà W7 vẫn dùng" | **Sai.** W8 chứa **0** tham chiếu `anthropic.kdl`. Cả 7 đều nằm trong §W7. | `awk 'NR>=1579&&NR<=1856' \| grep -c anthropic.kdl` → **0**; `awk 'NR>=1385&&NR<=1578'` → **7** |
| "thân mục vẫn còn nguyên **260 dòng**" | §W8 = **278 dòng** (1579–1856). ⛔ block 23 dòng; phần thân sau block = **254 dòng**. | `grep -n '^## W[0-9]'` → W8 ở 1579, W9 ở 1857 |

Điểm 1 quan trọng nhất: **report khuyên sửa neo `1762 → 1758`, và 1758 cũng sai.** Nếu làm theo
khuyến nghị đó thì ta thay một số sai bằng một số sai khác. Số đúng là **1779**.

Điểm 2 làm yếu phản biện của phương án (b): thứ report sợ mất **không nằm trong W8**, nên (b)
rẻ hơn report tưởng — nhưng (b) vẫn không phải mặc định, vì lý do dưới đây.

## Một sự thật report bỏ sót: W8 nằm ở HAI file

`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` nhúng nguyên văn §W8, **khác 0 dòng**:

```
$ diff <(sed -n '1579,1856p' MILESTONE_1_EXECUTION_PLAN.md) \
       <(sed -n '2000,2277p' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md)
$ echo $?
0
```

Nghĩa là sửa M1 mà không sửa mirror là **tạo ngay một lệch mới** — đúng loại lỗi mà cả đợt sửa
này sinh ra để dẹp. Script đồng bộ có sẵn nhưng đang hỏng: `.lavish-wip/sync-mirrors.js.broken`.

| Sửa gì | M1 | COMPREHENSIVE |
|---|---|---|
| Neo `ở dòng 1762` | 1592 | 2013 |
| Lệnh cổng cần đánh dấu | **1779** | **2200** |

Cả hai file đều đang ở `M` trong `git status`, nên một lượt sửa văn xuôi gộp được.

---

## Vì sao chọn (a)

Đây **không phải** quyết định sản phẩm. Không đổi hợp đồng người dùng, không đổi tên, không
chọn giữa hai kiến trúc. Nó là quyết định về hình dạng tài liệu nội bộ, và **chính file đã
tự trả lời** bằng tiền lệ của nó:

1. **File đã chọn "giữ vết" một cách nhất quán, không phải một lần.** Bên trong §W8 đã có
   **10** khối ⛔ (dòng 1581, 1604, 1622, 1752, 1774, 1777, 1793, 1803, 1804, 1827). Không
   mục nào bị xoá.
2. **Văn xuôi đã tự nói W8 là vết, hai lần, bằng câu không thể nhầm:**
   - `MILESTONE_1_EXECUTION_PLAN.md:4308` — *"§W8 vẫn còn nguyên trong file này như vết của
     spec cũ"*
   - `:4411-4413` — *"đọc nó như một bản ghi, đừng suy ra W8 còn cần làm"*
3. **Không có gì đang đọc W8 như việc.** Cả 12 tham chiếu `§W8` trong repo đều trỏ tới
   **khối ⛔ ở đầu mục** (câu "xem khối ⛔ ở đầu §W8"), không tham chiếu thân. Người đọc đã
   được dẫn đúng chỗ.

Vậy chi phí của việc giữ thân không phải "260 dòng gây hiểu nhầm" — nó là **một ô trong bảng
Cổng mà không có nhãn**, nhưng chính ô đó mới là thứ duy nhất cần sửa. Giữ thân là lựa chọn
rẻ hơn nhiều và đảo ngược được bằng một dòng.

## Hai sửa nhỏ đi kèm — và đây là phần quan trọng nhất

Nếu chỉ giữ nguyên thân mà không sửa hai chỗ này thì vẫn còn một lỗi thật:

**(1) Dòng cổng ở 1779 không có nhãn, trong khi hai người anh em ngay cạnh có.** Trong fence
`### Xác minh` (1769–1782):

```
1774  bun test …anthropic-cache-refresh.test.ts   # ⛔ KHÔNG chạy được: file đã bị f804d66 xoá
1777  bun test …anthropic-cache-refresh.test.ts   # ⛔ tương tự — không có file để chạy
1779  test ! -e …/cache-warmer.ts  # phần B của cổng      ← KHÔNG có ⛔
```

Khối ⛔ nói *"đừng chạy nó"* — nhưng dòng đó vẫn nằm trong một khối lệnh bash trông chạy được,
và là dòng **duy nhất** trong ba lệnh đó không mang nhãn. Đó là bất nhất thật, và nó rẻ.

Cách sửa bám đúng idiom sẵn có: thêm `# ⛔ đỏ vĩnh viễn — đừng chạy` vào dòng 1779, y như
hai dòng trên. **Không** gạch chéo toàn bộ dòng: một lệnh gạch chéo trong fence bash vẫn trông
copy-paste được, và sẽ lệch với hai người anh em.

**(2) Neo `ở dòng 1762` trỏ vào dòng trắng.** Sửa thành **1779** (không phải 1758 — xem bảng
trên). Đây là vá, không phải chữa: lượt sửa văn xuôi sau trên M1 sẽ lại làm hỏng nó. Nhưng nó
giữ cho con trỏ nói đúng sự thật hôm nay, và nó cùng hạng với mục 8 (neo lệch 10 dòng) nên
nên gộp cùng một lượt.

---

## Bằng chứng

Đo tại HEAD `6e8109d`, nhánh `milestone-1`:

```bash
# Phạm vi §W8
grep -n "^## W[0-9]" MILESTONE_1_EXECUTION_PLAN.md   # W8: 1579, W9: 1857  → 278 dòng

# Ba số mà report nhầm
sed -n '1758p;1762p;1779p' MILESTONE_1_EXECUTION_PLAN.md
#   1758 → "- **(4)** Nhánh idle…"     (bullet, không phải cổng)
#   1762 → ""                          (trống)
#   1779 → "test ! -e …cache-warmer.ts # phần B của cổng"

# Cổng thật sự đỏ, đúng như khối ⛔ nói
ls -l packages/coding-agent/src/session/cache-warmer.ts   # tồn tại, 599 dòng
test ! -e packages/coding-agent/src/session/cache-warmer.ts; echo $?   # 1 → đỏ

# Phản biện của (b) không có cơ sở
awk 'NR>=1579&&NR<=1856' MILESTONE_1_EXECUTION_PLAN.md | grep -c anthropic.kdl   # 0
awk 'NR>=1385&&NR<=1578' MILESTONE_1_EXECUTION_PLAN.md | grep -c anthropic.kdl   # 7

# W8 nằm ở hai file, giống hệt nhau
diff <(sed -n '1579,1856p' MILESTONE_1_EXECUTION_PLAN.md) \
     <(sed -n '2000,2277p' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md); echo $?        # 0

# Tiền lệ "giữ vết" đã có sẵn trong file
awk 'NR>=1579&&NR<=1856 && /⛔/' MILESTONE_1_EXECUTION_PLAN.md | wc -l          # 10
grep -c "§W8" MILESTONE_1_EXECUTION_PLAN.md                                      # 12
```

## Cách đảo ngược

Ba thay đổi, tất cả đều là sửa văn xuôi một dòng, không đụng code:

1. **Bỏ nhãn ⛔ ở dòng cổng** — xoá đuôi `# ⛔ đỏ vĩnh viễn — đừng chạy` ở `M1:1779` và
   `COMPREHENSIVE:2200`. Khôi phục nguyên trạng.
2. **Đổi neo về số cũ** — `ở dòng 1779` → `ở dòng 1762` ở `M1:1592` và `COMPREHENSIVE:2013`.
   (Số 1762 vốn đã sai từ trước; khôi phục nó chỉ để khớp diff cũ.)
3. **Thu gọn thân về (b)** — xoá 254 dòng sau khối ⛔ ở `M1:1603-1856` và
   `COMPREHENSIVE:2024-2277`, thay bằng một đoạn tóm tắt. Đo trước khi làm: hai tài liệu này
   không mất gì thuộc về `anthropic.kdl` (đã đo: 0 tham chiếu trong W8).

Nếu thu gọn, chạy lại `bun .lavish-wip/sync-mirrors.js` (đang `.broken` — phải sửa trước) để
hai file không lệch. Đây là lý do (b) **không phải** mặc định: nó là thay đổi lớn hơn nhiều,
và trong một file đã 685 KB với script đồng bộ hỏng, đảo ngược nó tốn hơn một lượt sửa văn xuôi.
