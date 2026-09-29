# Quyết định: `pico3` có thuộc phạm vi "omp chứa `pi`" không?

Trả lời `GAP-M1B-4`. Đây là câu hỏi mà M1B §1 nói thẳng là chưa trả lời, và mà M2 WI-9
(`unloadExtension`) cùng `GAP-M2-9` đều phụ thuộc vào.

**Đo trên `~/Projects/pi-ref` @ `d6af72e18`:**

## Bằng chứng

| câu hỏi | lệnh | kết quả |
|---|---|---|
| Ai import `pico3`? | `git grep -l pico3 -- '*.ts' \| grep -v /test/` | **4 file, tất cả trong `experimental/`** |
| `pico3` có được export công khai không? | `packages/agent/package.json:21` | `"./experimental/pico3"` — **chính tên đường dẫn ghi `experimental`** |
| `core/extensions` có được mount không? | `git grep -l 'core/extensions' -- '*.ts'` | `agent-session.ts`, `agent-session-runtime.ts`, `agent-session-services.ts`, `cli/args.ts`, `cli/project-trust.ts`, `bug-report.ts` |
| Quy mô | | `core/extensions` = 8 file / **4.506 dòng**; `pico3` = 25 file / **8.074 dòng** |

## Kết luận

**`core/extensions` là vòng đời extension ĐANG CHẠY. `pico3` là một engine thử nghiệm song song,
chưa được mount vào đường đi đã phát hành.**

Hai điều này khác nhau, và sự khác biệt quyết định toàn bộ phạm vi M1B:

1. **M1B §1 ĐÚNG.** Việc nó coi `core/extensions/` là vòng đời extension không sai. Bảng quyết
   định ở §1 không cần viết lại. Đây là kết luận ngược với giả định mà `GAP-M1B-4` nêu ra.
2. **`pico3` KHÔNG thuộc nghĩa vụ "chứa `pi"`.** Chính `pi` không mount nó trong đường đi đã
   phát hành. Chép nó vào omp sẽ là chép một nhánh thử nghiệm, không phải chép sản phẩm.
3. **NHƯNG nó là nguồn ý tưởng lớn nhất trong `pi` về vòng đời phiên.** `scheduler.ts` (17 KB),
   `membrane.ts` (4,5 KB), `bounded.ts` (2,8 KB), `jsonl.ts` (12 KB), `memory.ts` (9,4 KB) — đây là
   những thứ omp **không có** và `core/extensions` không cung cấp. Giá trị của `pico3` với omp là
   **ý tưởng để thiết kế lại**, không phải code để chép.

## Hệ quả trực tiếp

- **M2 WI-9 (`unloadExtension`) và `GAP-M2-9` không còn bị chặn.** Chúng giả định có "một vòng đời
  extension đã biết là gì" — bây giờ câu đó đã có đáp án: `core/extensions`.
- **Nhóm năng lực `pi` trong `GAP-REGISTER-2.md` phải được đọc lại theo ranh giới này.** Mọi mục
  bắt nguồn từ `pico3` chuyển từ "chép" sang "thiết kế lại hoặc bỏ".
- **Không có việc gì phải làm lại trong M1B §1.** Điều này giải quyết mối lo ngại lớn nhất mà
  `GAP-M1B-4` nêu: nếu `pico3` mới là sự thật thì mọi thứ đã chép dựa trên §1 đều phải xem lại.
  Không xảy ra.

## Cái omp thật sự thiếu, đã đo

`packages/agent/src/harness/pico3/` không có bản tương đương: `git grep membrane -- packages/`
trả về **0 file**. omp có `packages/agent/src/compaction/` (17 file) và `compaction.ts` 81 KB,
nhưng **không có scheduler, membranes, hay bounded context**.

Đây là một quyết định về *hướng đi*, không phải về phép chép. Nó thuộc về chủ sở hồn: có thể đưa
thiết kế của `pico3` vào omp như một mục tiêu riêng, hoặc coi `pi` là đủ và bỏ. Cả hai đều hợp lệ;
việc chọn là quyết định sản phẩm.

Nhưng **phạm vi chép đã rõ**: `core/extensions` vào, `pico3` ra.

## Cách kiểm lại câu trả lời này

```bash
cd ~/Projects/pi-ref
git grep -l pico3 -- '*.ts' | grep -v /test/            # kỳ vọng: chỉ file trong experimental/
grep -n '"./experimental/pico3"' packages/agent/package.json
git grep -l 'core/extensions' -- '*.ts'                  # kỳ vọng: agent-session*, cli/args, project-trust
```
