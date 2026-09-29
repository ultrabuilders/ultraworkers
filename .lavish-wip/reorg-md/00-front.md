# KẾ HOẠCH TỔ CHỨC LẠI PACKAGE — ĐỘ MỊN CỦA `pi`

Tài liệu này **không thuộc sáu milestone**. Nó là điều kiện tiên quyết để `MILESTONE_1B_EXECUTION_PLAN.md`
thật sự rẻ và an toàn: nếu 232 file từ `pi` không biết rơi vào đâu, thì mỗi lần chép là một dự án
riêng.

## Vì sao cần, bằng số đo

| Đại lượng | `pi` | `omp` |
|---|---|---|
| Package | 12 | 16 |
| File `.ts` | 1.564 | 5.325 |
| Dòng | 377.103 | 1.657.301 (4,4×) |
| **`coding-agent`** | 680 file · 154.200 dòng | 2.971 file · **918.868 dòng** (6,0×) |
| **Thư mục con trong `coding-agent/src`** | **9** | **67** |
| Phần lớn nhất bên trong | `core` 91 file | `tools` 149 file |
| **File giống hệt từ byte** ở 4 package dùng chung | **0** | **0** |

Chênh lệch **không nằm ở kích thước từng phần** — hai bên gần bằng nhau — mà ở **số phần**: omp
mảnh vụn mịn hơn `pi` **7,4 lần**. Đó là thứ khiến "chép rồi migrate" tốn công map tay từng file.

## Ba loại thao tác, và loại nào mới là việc thật

1. **GỘP** — giảm 67 thư mục con xuống ~10, theo hình dạng `pi`. Đổi tên thư mục + sửa import tương
   đối. **Không** đổi public API, **không** thêm package, **không** thêm entry point build. **Đây là việc
   chính, và nó rẻ hơn nhiều so với tách.**
2. **CẮT RA PACKAGE** — chỉ khi `pi` thật sự có package tương đương **và phần đó đã tồn tại ở omp**.
3. **VIẾT MỚI** — không phải di chuyển, dù nó sinh ra một package mang tên của `pi`.

Tài liệu này giữ ba loại **riêng biệt**, vì trộn chúng là cách làm một kế hoạch tổ chức lại biến
thành ảo tưởng "chuyển hết sang" — rồi tính nhầm việc viết mới vào ngân sách di chuyển.

## Luật đã ép trong lúc đo, và nó đã bắt được một đề xuất sai

> *"Đừng đề xuất cắt chỉ để giống `pi`. Mục tiêu là làm cho việc chép về sau là cơ học **và giảm vỡ
> vật lý** khi sửa. Nếu một thư mục lớn nhưng gắn chặt vào runtime của `coding-agent`, cắt ra là chi phí
> mà không đổi gì — hãy nói thẳng như vậy."*

Nó bắt được đúng một trường hợp: `ai/auth` (19 file · 10.603 dòng · **chỉ 5 importer** — rẻ nhất toàn
repo) là ứng viên **tệ nhất**, vì `pi/ai/src/auth/` đã tồn tại và omp đã đúng độ mịn.

## Cổng kiểm bắt buộc

- `bun run check:ts` exit 0 (0 lỗi, 16 package) — chạy được ngay, **không** cần addon.
- `bun test packages/tui` và `packages/ai` — chạy được; `coding-agent` thì **bị chặn một phần** bởi
  native addon (đo: 913 pass / 1.445 fail). Vì vậy cắt bên trong `coding-agent` **không có kiểm thử đầy
  đủ** cho tới khi addon build được — đây là ràng buộc thứ tự thật, không phải lưu ý.
- Mỗi bước gộp phải là **một commit**, để hoàn tác được bằng `git revert`.
