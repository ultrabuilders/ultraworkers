# Quyết định: bảng câu hỏi M2 đếm cả câu đã gạch — sửa số, giữ hàng

Trả lời mục 6 của `applied/NEEDS-OWNER-DECISION.md`.

**Đo trên `~/Projects/ultraworkers` @ `e55bbee`, nhánh `milestone-1`.**

## Bốn phần của mục 6 đã hết hạn

Mục 6 mô tả một tình trạng đã được các đợt sửa chạy song song vá xong. Kiểm lại từng câu:

| Mục 6 nói | Thực tế hôm nay |
|---|---|
| `M2:4317` và `:4360` là hai hàng `WI-4` đã gạch | Chỉ còn **một** hàng, ở `M2:5151`, trong Nhóm 2. Dòng trôi +834. |
| Dòng 5 và 4248 ghi "69 câu hỏi còn mở" | `M2:5` ghi **90**; dòng 4248 không phải dòng đếm. Số 69 chỉ còn ở `:5166`, **đã được dán nhãn là số lịch sử**. |
| `:4330` đếm 69 / 47 / 22 | Đã ở `:5166`, đếm 90 / 66 / 24. |
| `COMPREHENSIVE:8523` còn hàng `WI-4` nguyên dạng, ghi *"không ai sở hữu nó"* | **Đã sửa.** Cụm từ đó có **0 hit** trong cả cây (lệnh: `grep -rn 'không ai sở hữu nó' *.md .lavish-wip/applied/*.md` → chỉ khớp chính `NEEDS-OWNER-DECISION.md`). `COMPREHENSIVE:10111` mang đúng hàng gạch `~~…~~ **ĐÃ CHỐT**`, khớp với `M2:5151`. |

Nên phương án (a) của mục 6 — *"rút hai hàng ra, đếm lại từ đầu"* — không còn đúng hình dạng
việc. Không có hai hàng để rút, và hai file đã đồng bộ với nhau.

## Lỗi còn lại: lệch đúng một

Số **90** ở cả hai file vẫn đếm một hàng đã gạch. Đếm lại bằng cách tách hai bảng:

```bash
# biên bảng: Nhóm 1 = 5071-5135, Nhóm 2 = 5141-5164
awk 'NR>=5071&&NR<=5135' MILESTONE_2_EXECUTION_PLAN.md | grep -c '^|'        # 65 hàng
awk 'NR>=5071&&NR<=5135' MILESTONE_2_EXECUTION_PLAN.md | grep -cE 'ĐÃ CHỐT|~~' # 0 đã đóng
awk 'NR>=5141&&NR<=5164' MILESTONE_2_EXECUTION_PLAN.md | grep -c '^|'        # 24 hàng
awk 'NR>=5141&&NR<=5164' MILESTONE_2_EXECUTION_PLAN.md | grep -cE 'ĐÃ CHỐT|~~' # 1 đã đóng
```

65 + 24 = **89 dòng bảng** — khớp đúng con số mà `M2:5166` đã ghi. Vỡ ở chỗ chia nhóm:

- **Nhóm 1:** 65 hàng, 0 đã đóng. File ghi "66 câu" — đúng, vì hàng `M2:5079` gộp **hai**
  câu (native addon của WI-4 và của WI-5) vào một dòng. 65 hàng = 66 câu.
- **Nhóm 2:** 24 hàng, **1 đã đóng** (`M2:5151`). File ghi "24 câu" — nhưng 24 là số *hàng*,
  và nó đang nuốt luôn hàng đã gạch. Nhóm 2 thật sự còn **23 câu**.

66 + 24 = 90. Đúng thật là 66 + 23 = **89**.

Lưu ý phép đếm đúng: một hàng **có sẵn mặc định** vẫn là câu hỏi mở — cột cuối của bảng là
*"Mặc định sẽ được áp nếu bạn im lặng"*, nên `WI-2` (hard-fail) hay `WI-5`
(`invalidateAllCaches()`) vẫn được tính. Chỉ hàng **gạch chân + ĐÃ CHỐT** mới là câu đã
chết, và trong toàn bộ hai bảng chỉ có đúng một hàng như vậy.

## Quyết định

**Sửa số, giữ hàng.** Không rút `M2:5151` ra khỏi bảng.

Sáu chỗ mang con số sai, đổi `90` → `89` và `24` → `23`:

| file | dòng | hiện |
|---|---|---|
| `MILESTONE_2_EXECUTION_PLAN.md` | 5 | "đã đánh dấu 90 câu hỏi còn mở" |
| `MILESTONE_2_EXECUTION_PLAN.md` | 5063 | "90 câu hỏi mở trên 25 work item" |
| `MILESTONE_2_EXECUTION_PLAN.md` | 5166 | "90 câu trên 89 dòng bảng … 24 câu chỉ chặn về sau" |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 4965 | "đã đánh dấu 90 câu hỏi còn mở" |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 10023 | "90 câu hỏi mở trên 25 work item" |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 10126 | "90 câu trên 89 dòng bảng … 24 câu chỉ chặn về sau" |

Kèm một câu ở `M2:5166` và `COMPREHENSIVE:10126` nói rõ 89 = 88 dòng còn sống + 1 hàng đã
chốt được giữ lại làm vết, để lần đếm sau không phải đo lại từ đầu.

### Vì sao giữ hàng thay vì rút

Hàng `M2:5151` **là bằng chứng** cho chính quyết định đã chốt — nó ghi lại rằng
`Object.freeze` một mình không có cơ chế cưỡng chế và phần `Readonly` đã được kiểm chứng
bằng probe `TS2542`. Rút nó đi là mất lý do, đúng cái lỗi mà `DECISIONS.md` gọi tên ở
phần bài học chung. Nó nằm ở Nhóm 2 vì lý do đúng: nó chặn phạm vi nhưng không chặn bắt
đầu, và cột cuối đã ghi sẵn mặc định — nên nó không nằm sai chỗ, chỉ bị đếm sai.

### Điều KHÔNG nên làm

`.lavish-wip/m2-index/questions.json` có **69** mục và vẫn giữ câu hỏi `WI-4` về
`Readonly` như một câu đang sống. **Đừng sửa nó và đừng lấy nó làm chuẩn.** Nó là ảnh chụp
ngày 2026-09-27, trước đợt sổ khoảng trống 2026-09-29 thêm 21 dòng, và không file kế hoạch
nào tham chiếu tới nó để lấy số (`grep -rn 'm2-index' *.md` chỉ ra hai chỗ nhắc tới
`WI-8a.spec.json` và symlink `m2-index/specs`, không phải tới bảng đếm). Sửa nó là sửa
một cái nhìn thấy được để làm đẹp một file scratch.

## Cách đảo ngược

Sáu số ở trên là văn xuôi thuần trong file markdown. Đảo ngược = thay `89` về `90` và
`23` về `24` ở đúng sáu dòng đó, rồi bỏ câu giải thích về hàng đã chốt. Không có code, không
có state, không có hợp đồng với người dùng — `git checkout --` hai file kế hoạch là
đủ nếu có xung đột.

## Tại sao tự quyết được

Đây là phép trừ trên một bảng đếm được, không phải lựa chọn sản phẩm: không đổi hợp đồng
với người dùng, không đổi tên thương hiệu, không chọn giữa hai kiến trúc, không cần ý muốn
chủ sở hữn. Lệnh đếm ở trên tái lập được từ cây, và mối chặn mà mục 6 nêu — một câu đã có
đáp án đang được tính vào "chặn bắt đầu" — **đã tự biến mất**: hàng đóng duy nhất nằm ở
Nhóm 2, nên nó chưa bao giờ chặn bắt đầu một work item nào. Mục 6 nên bị hạ xuống khỏi
nhóm chặn việc bắt đầu.
