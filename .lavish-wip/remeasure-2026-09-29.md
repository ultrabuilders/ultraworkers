# Đo lại 2026-09-29 trên `pi` mới — M1 vẫn đúng, chỉ hash và một con số cũ

Cây tham chiếu đã được fast-forward: `pi-ref` `d6af72e18 → 8eb2bccf2`. Bốn repo còn lại
(`senpi-ref`, `codex-ref`, `opencode-ref`, `gajae-ref`, `deepseek-harness`) cũng đã đi, nhưng
chúng không làm gốc cho phép đo nào đang ghi trong kế hoạch.

## Phép đo lại, chạy thật, không dùng lại số cũ

Bốn package dùng chung giữa `pi` và omp: `agent`, `ai`, `coding-agent`, `tui`.
Đối chiếu từng file `.ts`/`.tsx` theo **SHA-256 của byte nội dung**.

| | M1 ghi (đo trên `4259686d`) | **Đo lại @ `8eb2bccf2`** | thay đổi |
|---|---|---|---|
| Giống hệt từ byte | 0 | **0** | không |
| Chỉ có ở `pi` | 1.270 | **1.276** | **+6** |
| Chỉ có ở omp | 4.318 | **4.318** | không |
| Cùng đường dẫn, khác nội dung | 145 | **145** | không |

**Tự khớp cả hai vế** — đây là cách biết phép đo không bịa, vì hai vế khóa vào hai tổng khác nhau:

- phía `pi`: `1.276 + 0 + 145 = 1.421` = đúng tổng số file `.ts`/`.tsx` của `pi` trong 4 package đó
- phía omp: `4.318 + 0 + 145 = 4.463` = đúng tổng số file của omp trong 4 package đó

## Kết luận

**Các kết luận của M1 vẫn đứng vững.** `0` file giống hệt từ byte và `145` file cùng đường dẫn
nhưng khác nội dung không đổi — tức cấu trúc divergence mà M1 dựa vào vẫn đúng. Commit mới
nhất của `pi` là bump dependency, nên nó chỉ **thêm** file ở phía `pi` (+6), không sửa file nào
của omp.

**Có hai thứ trong M1 giờ đã cũ và phải sửa khi chạm tới:**

1. Mọi chỗ ghi `pi` HEAD là `4259686d` (mục "ĐIỀU CHỈNH PHẠM VI 2026-09-29" ở
   `MILESTONE_1_EXECUTION_PLAN.md:7214`, và dòng 5002 ghi `d6af72e18`) — giờ là `8eb2bccf2`.
2. Ô "chỉ có ở pi" ghi `1.270` — giờ là `1.276`.

Đây là **số đo**, không phải khẳng định: nếu ngày mai `pi` lại đi, phải đo lại, không được
suy ra từ con số ở đây.

## Ghi chú về `opencode-ref`

`opencode-ref` đang ở nhánh `v2`, và `v2` đã đi `39021df → 3126808`. Nhánh `main` của repo đó
ở `7945de2` — **không phải cùng dòng**, và đúng là phải bỏ qua. Lúc đầu tôi đọc nhầm là repo đó
"đi ba commit"; con số đó gộp cả hai nhánh. Sự thật là nhánh `v2` đi hai commit.

## Ghi chú về `claude-code-ref`

`claude-code-ref` **không có LICENSE** — mượn ý tưởng thiết kế thì được, dán code thì không.
Ràng buộc pháp lý này đã ghi trong bead M3 và không đổi.
