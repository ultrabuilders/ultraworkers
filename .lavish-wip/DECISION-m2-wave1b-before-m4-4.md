# Quyết định: ràng buộc "M2 Wave 1b xong trước M4-4" được ghi vào đâu trong M4?

Trả lời **mục 2** của `.lavish-wip/applied/NEEDS-OWNER-DECISION.md`. Đây là quyết định
**thuần kỹ thuật** — nó không đổi hợp đồng với người dùng, không đổi tên, không chọn
giữa hai kiến trúc. Bằng chứng tự quyết được, nên nó **không chặn** gì.

**Đo trên `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `6e8109d`, ngày 2026-09-29.**

---

## 1. Bằng chứng đã chạy

| câu hỏi | lệnh | kết quả |
|---|---|---|
| Ràng buộc có thật không? | `sed -n '90,105p' MILESTONE_2_EXECUTION_PLAN.md` | **Có, hai chỗ độc lập cùng nói một điều.** |
| M2 nói gì? (1) | `MILESTONE_2_EXECUTION_PLAN.md:97` | *"**Cần trước khi bắt đầu:** Wave 1 (WI-0 trust model). **Không chặn M4** theo thứ tự này, nhưng **phải xong trước M4-4**."* |
| M2 nói gì? (2) | `grep -n 'Đặt trước M4-4' MILESTONE_2_EXECUTION_PLAN.md` | Dòng **362**: *"Đặt trước M4-4 vì M4-4 là nơi phát sinh ra tình huống 'báo applied nhưng không có gì thay đổi' mà WI này chữa ở tầng thấp hơn."* |
| Tiêu đề mục cũng ghi? | `MILESTONE_2_EXECUTION_PLAN.md:338` | `## WI-PRESTEP-1. Ghi durable turn khi bị chặn (thêm 2026-09-28, **đặt trước M4**)` |
| **M4 có biết không?** | `grep -inE 'prestep\|session-log\|durable turn\|WI-PRESTEP\|Wave 1b' MILESTONE_4_EXECUTION_PLAN.md` | **`grep_exit=1` — 0 dòng.** M4 không nhắc `WI-PRESTEP-1`, `session-log`, `durable turn`, `Wave 1b` ở bất kỳ đâu. |
| M4-4 tự khai phụ thuộc gì? | `awk 'NR>=816 && NR<=826' MILESTONE_4_EXECUTION_PLAN.md` | `### Phụ thuộc` → `depends_on:` chỉ có **2** mục: build native addon (819), M3-A4 merge order (821). **Không có M2.** |
| M4-4 khai ở header? | `awk 'NR>=473 && NR<=476' MILESTONE_4_EXECUTION_PLAN.md` | `**Phụ thuộc:** build native addon; thứ tự merge với M3-A4` — cũng không có M2. |
| Bảng tiền đề của M4 đã có sẵn chưa? | `grep -n 'Điều kiện riêng của từng M4' MILESTONE_4_EXECUTION_PLAN.md` | **Có, dòng 339** — bảng `Điều kiện / Chặn item nào / Trạng thái` (341–352). |

**Đo bổ sung — bảng 339 đã sẵn sàng đón hàng này và không cần tạo cấu trúc mới:**

Bảng *Điều kiện riêng của từng M4* **đã có sẵn 3 hàng M2→M4-x**, đúng cùng hình dạng với
hàng cần thêm:

| dòng | hàng | chặn item nào |
|---|---|---|
| 344 | `**M2 WI-8a + WI-8b** phải merge` | M4-6 |
| 345 | `**M2 WI-2** … phải merge` | M4-9 |
| 346 | `Bản viết M2 WI-4 phải được thống nhất (§6.1)` | M4-7 |

Tức M4 **đã có tiền lệ đúng y hình** cho loại hàng này. Vậy đây không phải "thêm một dòng
lạ vào file 314 KB" như `NEEDS-OWNER-DECISION.md` mô tả — đó là **điền nốt một bảng đã có
sẵn chỗ trống**, theo đúng mẫu của ba hàng ngay trên nó.

**Đo bổ sung — con số tổng cũng phải đi theo, nếu không thì tạo mâu thuẫn mới:**

`MILESTONE_4_EXECUTION_PLAN.md:14` đang ghi `| Phụ thuộc chưa thoả | **3** (M2 WI-8a/8b cho
M4-6; M2 WI-2 cho M4-9; **GAP-M1-18** …) |`. Thêm hàng thứ tư thì số phải thành **4**, và
phần trong ngoặc phải kể thêm `M2 Wave 1b (WI-PRESTEP-1) cho M4-4`. **Đây là hệ quả bắt buộc
của lựa chọn (a) — không phải việc phát sinh thêm.** Bỏ qua nó là tái tạo đúng cái lỗi
"một sự thật viết ở một chỗ, đọc ở chỗ khác" mà đợt sửa này sinh ra để dẹp.

---

## 2. Mặc định đã chọn

**Phương án (a), hiện thực đúng theo bảng *Điều kiện riêng của từng M4* sẵn có (dòng 339),
cộng một mục trong `depends_on:` của chính M4-4 (dòng 818) — và cập nhật số 3 → 4 ở dòng 14.**

Ba chỗ, tất cả đều là **chỗ đang đã phục vụ đúng chức năng đó**:

1. **Dòng 341–352** — thêm một hàng vào bảng *Điều kiện riêng của từng M4*:

   ```
   | **M2 Wave 1b** (`WI-PRESTEP-1`, ghi durable turn khi bị chặn) phải merge | M4-4 | **CHƯA THOẢ** — ràng buộc do chính M2 đặt ở `MILESTONE_2_EXECUTION_PLAN.md:97` và `:362`: *"không chặn M4 theo thứ tự này, nhưng phải xong trước M4-4"*. Lý do đã ghi ở M2:362 — M4-4 là nơi phát sinh *"báo applied nhưng không có gì thay đổi"* mà WI-PRESTEP-1 chữa ở tầng thấp hơn; làm M4-4 trước sẽ chữa hai lần |
   ```

   Cột "Trạng thái" ghi **CHƯA THOẢ** vì `WI-PRESTEP-1` là việc M2 chưa thực thi trên
   nhánh này — cùng ngữ pháp với hàng 345 (`M2 WI-2`), vốn đã ghi **CHƯA THOẢ**.

2. **Dòng 818** (`depends_on:` của M4-4) — thêm một mục cùng văn phong với hai mục đang có:

   ```
   - M2 Wave 1b (`WI-PRESTEP-1`) — chỉ thứ tự, không phải phụ thuộc mã: M4-4 có thể
     build và test được nếu thiếu nó, nhưng sẽ chữa "báo applied nhưng không có gì thay
     đổi" ở tầng settings-writer, rồi `WI-PRESTEP-1` lại chữa lần nữa ở tầng log.
     Ràng buộc do M2 đặt: `MILESTONE_2_EXECUTION_PLAN.md:97`.
   ```

3. **Dòng 14** — đổi `**3**` thành `**4**` và thêm `M2 Wave 1b (WI-PRESTEP-1) cho M4-4`
   vào phần trong ngoặc.

**Không chọn (b)** — nhét vào bảng *Cổng đang đỏ ngay bây giờ* (dòng 13). Bảng đó đếm
**cổng kiểm thử**, không đếm tiền đề; `NEEDS-OWNER-DECISION.md` tự gọi đây là "lệch chức
năng", và đo thì đúng: dòng 13 nói về *"4/6 bước kiểm của M4-4 đỏ"*, dòng 14 mới là
`Phụ thuộc chưa thoả`. Ràng buộc đã có chỗ đúng của nó ngay bên dưới.

**Không chọn (c)** — bỏ câu khỏi M2. Câu đó **có thật** (M2:362 đã viết lý do), và bỏ nó
mất đúng thông tin đáng giá nhất: ràng buộc này ngăn làm cùng một lỗi hai lần ở hai tầng.

---

## 3. Vì sao đây là quyết định KỸ THUẬT, không phải quyết định SẢN PHẨM

`genuinely_needs_a_person: false`. Lý do cụ thể, không phải suông:

- **Ràng buộc đã tồn tại và đã có lý do, do chính M2 viết ra, hai lần.** Đây không phải
  phát minh ra một cam kết mới — nó là *thu bản chữ của một ràng buộc đã chốt*.
- **Không có bề mặt công khai nào bị đụng.** Hai dòng nằm trong `.md` của kế hoạch, không
  phải trong `packages/`. Không đổi API, không đổi tên package, không đổi hành vi.
- **Không chọn giữa hai kiến trúc lớn.** Ba chỗ sửa đều nằm trong cấu trúc *đã tồn tại*:
  một bảng đã có 3 hàng cùng hình dạng, một khối `depends_on:` đã có 2 mục, một con số
  đã có sẵn. Đây là điền nốt, không phải dựng.
- **Bằng chứng tự trả lời câu hỏi "đặt ở đâu".** Quy tắc của chính M4 đã quy: ràng buộc
  nằm ở bảng *Điều kiện riêng của từng M4* và ở `depends_on:` của item — vì ba hàng M2
  trước đó nằm đúng ở đó. Không có lựa chọn sản phẩm nào ẩn trong câu hỏi vị trí.

Cái duy nhất *trông* giống quyết định sản phẩm là câu hỏi *"ràng buộc này có thật
không?"* — và nó **không** cần người: M2 đã trả lời bằng hai câu, trong đó một câu là lý
do (`M2:362`). Ta chỉ đang làm cho M4 đọc được thứ M2 đã nói.

**Vì vậy nó KHÔNG chặn.** M4-4 vẫn bị chặn bởi hai thứ đã ghi sẵn và không liên quan
(`build native addon`, `M3-A4 merge order` — dòng 819/821), nên thêm hàng này **không
làm chậm thêm** thứ gì đang chạy được.

---

## 4. Cách đảo ngược

Đảo ngược là **xoá đúng ba thứ**, không đụng gì khác:

1. Xoá hàng `| **M2 Wave 1b** …` vừa thêm trong bảng *Điều kiện riêng của từng M4*
   (ngay sau dòng 346, hàng `M2 WI-4`).
2. Xoá mục `- M2 Wave 1b (\`WI-PRESTEP-1\`) — …` trong `depends_on:` của M4-4 (dòng 818).
3. Đổi lại `**4**` → `**3**` ở dòng 14 và bỏ `M2 Wave 1b (WI-PRESTEP-1) cho M4-4` khỏi
   phần trong ngoặc.

**Không có gì phải hoàn tác ở M2** — M2 giữ nguyên. Đó là điểm mấu chốt khiến mặc định
này an toàn: nó là **thêm thông tin vào chỗ đang đọc**, không sửa chỗ đang nói. Nếu sau
này ràng buộc bị gỡ khỏi M2, chỉ cần xoá ba mảnh trên và hai file trở về đúng trạng thái
hôm nay.

**Cách kiểm đã sửa được** (không tin lời, chạy lại):

```bash
# trạng thái HÔM NAY (đã chạy, để so)
grep -c 'WI-PRESTEP-1' MILESTONE_4_EXECUTION_PLAN.md                          # 0
awk 'NR>=341 && NR<=352' MILESTONE_4_EXECUTION_PLAN.md | grep -c 'M2 '      # 3
awk 'NR==14' MILESTONE_4_EXECUTION_PLAN.md | grep -o '\*\*[0-9]\+\*\*'        # **3**
```

```bash
# sau khi sửa — ba số này phải là 1, 4, **4**
grep -c 'WI-PRESTEP-1' MILESTONE_4_EXECUTION_PLAN.md                          # >=1
awk 'NR>=341 && NR<=352' MILESTONE_4_EXECUTION_PLAN.md | grep -c 'M2 '      # 4
awk 'NR==14' MILESTONE_4_EXECUTION_PLAN.md | grep -o '\*\*[0-9]\+\*\*'        # **4**
```

Lưu ý khi chạy: **đừng dùng mẫu `^| \*\*M2`** để đếm. Ba hàng M2 trong bảng không cùng
hình dạng — dòng 346 là `| Bản viết M2 WI-4 …`, không bắt đầu bằng `**`. Mẫu hẹp đó đếm
ra **2** thay vì 3, và sẽ đếm ra 3 thay vì 4 sau khi sửa — tức nó báo sai ngay tại cái
lỗi mà nó sinh ra để bắt. Mẫu `'M2 '` là mẫu đúng, và cả ba lệnh đều đã chạy ở trạng
thái hôm nay để lấy số đối chiếu.

---

## 5. Ghi chú: còn một vết liên quan, **không** sửa ở đợt này

`MILESTONE_2_EXECUTION_PLAN.md:97` nói *"**Không chặn M4** theo thứ tự này, nhưng phải xong
trước M4-4"*, trong khi `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:288` (bảng milestone) và
đường găng thẽ ngay dưới (dòng 291–292) ghi chuỗi `M1 → M2 → {M3, M4}` mà **không hề nhắc
Wave 1b**. Hai chỗ không mâu thuẫn — plan tổng nói về *milestone*, M2 nói về *một wave
trong* milestone — nhưng cũng **không ai trỏ tới nhau**.

Cái này **không sửa ở đây**. Nó là một quyết định khác (làm plan tổng có nói tới ràng buộc
cấp wave không, và nói ở đâu), và nó **không chặn** vì sau mặc định ở mục 2 thì người đọc
M4 đã thấy đầy đủ. Ghi ra đây để lượt sau không phải đo lại từ đầu.
