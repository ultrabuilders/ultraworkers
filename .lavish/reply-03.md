Đã nhận và áp dụng. **6/6 câu đã chốt.**

Đây là feedback của listener mồ côi — nó nằm trong hàng đợi từ trước lúc bạn đóng trình duyệt, nên tôi chỉ thấy nó sau khi `--takeover`. Trong đó có **Câu 3–6 theo mặc định**, mà trước đó tôi chưa từng nhận được.

| | Quyết định |
|---|---|
| Câu 1 | (i) — mọi thứ là plugin *(đã áp dụng trước đó)* |
| Câu 2 | Mượn UI/UX tự do; không logo/tên "Claude Code"; vẫn không dán code từ cây không giấy phép |
| **Câu 3** | **Trust policy**: extension project-local **không** tự động load, phải được phép **tường minh**; `ctx.exec` **từ chối** với extension không tin cậy |
| **Câu 4** | **Không** cập nhật changelog — chỉ khi được yêu cầu tường minh |
| **Câu 5** | Sửa **5** chỗ trong blast radius, **3** còn lại để follow-up |
| **Câu 6** | **Để yên** ba khai báo `HandlerFn` trùng |

## Một hệ quả của Câu 3 + Câu 1

Hai quyết định này nói chung một điều, và tôi ghi rõ trong plan: chọn (i) **không** phải lý do để hoãn WI-0. Slogan đúng nghĩa đen hơn thì plugin càng *chính là* bề mặt tấn công — nên trust gate càng phải chốt, không phải ngược lại.

Và phần **cài thật** vẫn chưa có: `isProjectTrusted()` là `() => true` ở `runner.ts:1293` và `agent-session.ts:7552`. Tôi đã giao nó cho **M8 W6** — vì `M2:44` cấm đặt nó trong M2, và không tài liệu nào nhận nó.

## Cập nhật

- `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — Câu 3–6 chuyển sang **ĐÃ CHỐT**, mỗi câu ghi rõ kết luận và ngày
- Artifact: header **0 câu chưa chốt** (gạch 6), §4 đổi thành "Sáu câu hỏi — đã chốt hết", thêm thẻ xanh lên Câu 3–6
- Commit `5f01ce1d40`

**Còn 18 quyết định mới** ở M8/M9/M10 — tổng 6 + 7 + 5. Đó là batch kế tiếp cần bạn.
