# Quyết định: neo dòng trong `DECISIONS.md` trỏ vào M2

Trả lời mục 8 của `.lavish-wip/applied/NEEDS-OWNER-DECISION.md:352`.
Đo trên `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `e55bbee`.
Không sửa file kế hoạch nào. Không sửa `DECISIONS.md` — file này chỉ ghi quyết định.

---

## Kết luận một dòng

**Đổi 5 neo sang neo theo nội dung (`grep` theo tiêu đề/cụm chữ), giữ số dòng hiện tại chỉ
làm chú thích "tại `e55bbee`".** Đây là phương án (b) của file nguồn, và (a) **bị loại** —
không phải vì đắt hơn, mà vì **con số mà file nguồn chỉ ra là sai**, và phương án đó sẽ
để lại anchor hỏng.

---

## 1. Đo trước: các neo **đã đúng** ở commit mà `DECISIONS.md` viết cho

`DECISIONS.md` không hỏng từ đầu. Nó viết cho commit `6e8109d`, và ở commit đó cả 5 neo
rơi đúng vào đúng nội dung mà chính file mô tả:

```bash
for n in 1474 1512 1632 4307 4350; do git show 6e8109d:MILESTONE_2_EXECUTION_PLAN.md | sed -n "${n}p" | cut -c1-90; done
```

| Neo | Nội dung ở `6e8109d` | Đúng như mô tả? |
|---|---|---|
| 1474 | `## WI-4. Đóng backdoor \`toolRenderers\` — \`Object.freeze\` + \`Readonly\` ở tầng kiểu` | ✅ |
| 1512 | `2. **Áp dụng thay đổi khai báo.** Neo: \`packages/tui/src/tools/index.ts:35\`…` | ✅ |
| 1632 | `- **Annotation \`Readonly<>\` nên nằm trong WI-4 hay chờ "WI-4b"…**` (câu hỏi còn mở) | ✅ |
| 4307 | `\| WI-4 \| Chú thích \`Readonly<>\` land trong WI-4 hay chờ WI-4b? \| …` | ✅ |
| 4350 | `\| WI-4 \| WI-4 là \`Object.freeze(toolRenderers)\` — một chốt chặn runtime…` | ✅ |

M2 ở `6e8109d` dài **4536** dòng. `WI-4` nằm ở **1474**.

## 2. Cái làm lệch: commit `e55bbee`, không phải "lượt sửa văn xuôi"

```bash
git show --stat --oneline e55bbee -- MILESTONE_2_EXECUTION_PLAN.md
#  MILESTONE_2_EXECUTION_PLAN.md | 912 +++++++++++++++---
#  1 file changed, 884 insertions(+), 28 deletions(-)
```

M2 dài 4536 → **5392** dòng. `WI-4` dời 1474 → **1802**. `DECISIONS.md` không được
`e55bbee` chạm vào (và nó còn không được git track: `git ls-files --error-unmatch
.lavish-wip/applied/DECISIONS.md` → *"Did you forget to 'git add'?"*).

**Lệch thật, đo lại từng neo:**

| Neo cũ | Nội dung | Thật ở `e55bbee` | Lệch thật |
|---|---|---|---|
| 1474 | tiêu đề `## WI-4.` | **1802** | **+328** |
| 1512 | bước 2, thay dòng khai báo | **1840** | **+328** |
| 1632 | câu hỏi (nay đã gạch, `ĐÃ CHỐT`) | **1960** | **+328** |
| 4307 | hàng bảng (nay `ĐÃ CHỐT`) | **5151** | **+844** |
| 4350 | hàng bảng `Object.freeze` | **5196** | **+846** |

## 3. Vì sao "lệch đều 10 dòng" là sai — và nguy hiểm

Cả `NEEDS-OWNER-DECISION.md:352` và `DECISIONS-RESOLVED.md:353` đều khẳng định neo
"lệch **đều** 10 dòng" và bảng "giá trị đúng" là `1484 / 1522 / 1642 / 4317 / 4360`.
Đo lại 5 dòng đó:

```bash
for n in 1484 1522 1642 4317 4360; do sed -n "${n}p" MILESTONE_2_EXECUTION_PLAN.md | cut -c1-70; done
```

| "Thật" theo file nguồn | Nội dung thật của dòng đó |
|---|---|
| 1484 | `\| "retry_fallback_applied" \| "retry_fallback_succeeded"` |
| 1522 | `return { type: "turn_end", turnIndex: this.#turnIndex - 1, …` |
| 1642 | ` ```bash ` |
| 4317 | `Cách sai thứ ba, và riêng đúng với cây code này, …` |
| 4360 | `\| packages/coding-agent/src/extensibility/…/types.ts \| sửa (thực tế: KHÔNG sửa) \| …` |

Không dòng nào trong 5 dòng đó chứa nội dung file nguồn mô tả. Nếu làm phương án (a)
đúng như đang viết — "thay `+4` bằng `+10`" — anchor sẽ **vẫn trỏ sai**, chỉ chệch sang
vùng trống khác. Đó là kết quả tệ hơn hiện trạng, vì hiện trạng còn nhìn thấy được là
sai, còn sau khi vá thì nó trông như đã đúng.

**Bề mặt sửa cũng bị đếm thiếu:** file nguồn nói "5 dòng". Số dòng thật chứa anchor
trong `DECISIONS.md` là **11** (`grep -cE '\b(1474|1512|1632|4307|4350)\b'` → 11): 4 dòng
lệnh bằng chứng (221, 223, 229), 4 dòng bảng "Cần xuất hiện ở" (239–242), 1 dòng văn xuôi
(212), 1 dòng văn xuôi (232), 2 dòng lệnh kiểm lại (274, 276).

## 4. Vì sao (a) — kể cả khi dùng số đúng — vẫn là vá

Bằng chứng rằng lỗi này **tái diễn**, không phải sự cố một lần: trong lúc tôi đo, HEAD
chạy từ `6e8109d` sang `e55bbee` **giữa chừng**, và `e55bbee` chính là cú đẩy làm lệch
anchor. Tức là M2 đang còn được sửa văn xuôi và commit. Trỏ lại 1802/1840/1960/5151/5196
là đúng **hôm nay** và hỏng lại ở commit văn xuôi kế tiếp — đúng cái "vá, không phải chữa"
mà chính file nguồn đã cảnh báo.

## 5. Mặc định đã chọn: neo theo nội dung

Thay 5 lệnh `awk 'NR==NNNN'` bằng `grep -n` theo nội dung. Mỗi cái khớp **đúng một lần**,
nên không mơ hồ:

| Neo cũ | Lệnh thay thế | Khớp | Dòng @ `e55bbee` |
|---|---|---|---|
| 1474 | `grep -n '^## WI-4\. Đóng backdoor' MILESTONE_2_EXECUTION_PLAN.md` | 1 | 1802 |
| 1512 | `grep -n '^2\. \*\*Áp dụng thay đổi khai báo' MILESTONE_2_EXECUTION_PLAN.md` | 1 | 1840 |
| 1632 | `grep -n '^- ~~\*\*Annotation \`Readonly' MILESTONE_2_EXECUTION_PLAN.md` | 1 | 1960 |
| 4307 | `grep -n '^| WI-4 \| ~~Chú thích' MILESTONE_2_EXECUTION_PLAN.md` | 1 | 5151 |
| 4350 | `grep -n '^| WI-4 \| WI-4 là \`Object.freeze' MILESTONE_2_EXECUTION_PLAN.md` | 1 | 5196 |

Ở bảng "Cần xuất hiện ở" (239–242), đổi cột "Dòng" thành cột "Neo" ghi nội dung, và
thêm một dòng chú thích: *"số dòng tại `e55bbee`: 1802 / 1840 / 1960 / 5151 / 5196"*.

**Vì sao an toàn:**
- Chạm **một** file, `.lavish-wip/applied/DECISIONS.md` — file scratch **không được git
  track** (17 file được track trong `.lavish-wip/`, nhưng không phải file này). Không
  file kế hoạch nào bị sửa. Không diff nào đi vào commit.
- Không đụng bề mặt công khai: `.lavish-wip/` là vùng làm việc, không ai import, không
  build nào đọc.
- Cơ chế tra cứu **không cần viết lại** như file nguồn lo — không có cơ chế nào cả.
  `DECISIONS.md` vốn đã in sẵn nội dung kỳ vọng ngay dưới mỗi lệnh `awk`; chỉ thay
  phần định vị.
- Mỗi lệnh mới là idempotent và tự kiểm: nếu sau này nội dung bị sửa tới mức không còn
  khớp, `grep` trả về **rỗng** và lệnh fail, thay vì âm thầm trả về dòng sai. Đây là
  hành vi an toàn — lỗi lộ ra thay vì im.

## 6. Cách đảo ngược

Không cần `git revert` — file không được track. Đơn giản hơn nữa: giữ `DECISIONS.md`
nguyên vẹn ở trạng thái hiện tại, và chỉ áp thay đổi khi có ai định mở file đó. Nếu đã
áp rồi muốn quay lại:

```bash
# 1. chép lại bản gốc (nếu còn) — hoặc sửa ngược 11 dòng về số cũ
# 2. xác nhận đã về trạng thái cũ
grep -cE '\b(1474|1512|1632|4307|4350)\b' .lavish-wip/applied/DECISIONS.md   # → 11
```

Sửa ngược là thay 5 lệnh `grep` về `awk 'NR==…'`, và bảng 239–242 về số cũ. Mỗi nửa
độc lập: bỏ riêng phần grep vẫn để bảng số dòng sai, bỏ riêng phần bảng vẫn để lệnh sai —
nên làm cả hai cùng lúc.

## 7. Vì sao đây không cần người

Đây là quyết định **kỹ thuật**, và bằng chứng tự quyết được:
- Không đổi hợp đồng với người dùng. Không đổi tên thương hiệu. Không chọn giữa hai
  kiến trúc lớn.
- Cả 5 neo và cả 5 giá trị đúng đều **đo được bằng lệnh**, đã chạy ở trên.
- Mục tiêu đã rõ trong chính file nguồn: giữ cho các câu trong `DECISIONS.md` nói đúng
  sự thật, và không để lượt sửa văn xuôi sau vô hiệu hoá chúng.
- Ràng buộc duy nhất mà file nguồn nêu là phạm vi — *"`DECISIONS.md` nằm trong
  `.lavish-wip/`, ngoài phạm vi một file mà đợt này được phép chạm"*. Đó là giới hạn
  phạm vi của **một lượt sửa trước**, không phải ý định của chủ sở hữu. Nó không chặn
  việc ghi quyết định; nó chỉ nói lượt đó không được tự sửa.

**Mức chặn: không chặn gì.** Không milestone nào đứng sau mục này — cột "chặn milestone
nào" của chính `DECISIONS-RESOLVED.md:36` ghi *"Không gấp"*, và `DECISIONS.md:232-233`
tự hạ cấp: *"M2:4307 đã có sẵn mặc định đúng … và **không chặn** gì."* Cột "Có" ở
`DECISIONS-RESOLVED.md:36` nói về việc *cần mở một file từng bị cấm*, không phải về
việc có ai bị chặn bởi kết quả.

Có một rủi ro thật nhưng không chặn: ai đó đọc lại `DECISIONS.md` và chạy
`awk 'NR==1474'` sẽ nhận về dòng `* extension-facing hook. Adding a name here…` rồi tưởng
đang sửa `WI-4`. Anchor sai gây **sửa nhầm**, không gây **đứng**. Vì vậy nó nên làm, nhưng
không việc gì bị nó giữ.

## 8. Gộp với mục 4?

`NEEDS-OWNER-DECISION.md:387` có ý kiến nên gộp mục 4 và mục 8 để mở `DECISIONS.md` một
lần. **Đồng ý về mặt cơ học** — cùng một file, cùng một lúc mở. Nhưng nên tách quyết
định: mục 4 là *đo ngược chiều* (một phép đo cho kết quả sai, cần sửa phép đo), mục 8 là
*neo trỏ sai* (cần đổi cách định vị). Gộp thì một lần mở file, hai lý do ghi riêng —
để khi mục 4 bị hoãn thì mục 8 vẫn đóng được.
