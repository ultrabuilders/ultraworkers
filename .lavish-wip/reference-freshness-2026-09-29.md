# Ghi chú độ mới của cây tham chiếu — đọc trước khi tin bất kỳ con số đo nào

Các kế hoạch trong repo này ghi hash của cây tham chiếu tại thời điểm đo. Những cây đó **đã đi
tiếp** kể từ đó. Hash trong tài liệu là **dấu vết của một phép đo**, không phải một ràng buộc:
đừng kiểm tra xem `pi` còn đúng ở `d6af72e` hay không, hãy kiểm tra xem **conclusion** còn đúng
không bằng cách đo lại.

## Cây tham chiếu, cũ → mới

| repo | hash ghi trong kế hoạch | **HEAD hiện tại** | ngày |
|---|---|---|---|
| `pi-ref` | `d6af72e18` / `4259686d` | **`8eb2bccf2`** | 2026-09-29 |
| `deepseek-harness` | `477b4f4` | **`639ed01539`** | 2026-09-29 |
| `codex-ref` | `e72da2b` | **`50d9c5d`** | 2026-09-29 |
| `opencode-ref` | `39021df` | **`3126808`** (nhánh `v2`) | 2026-09-29 |
| `gajae-ref` | `5c52314` | **`7e54f9cbc`** | 2026-09-29 |
| `senpi-ref` | `ea9216269` | **`08f7321d0`** | 2026-09-30 |
| `claude-code-ref` | `77a7934` | `77a7934` — **không đổi** | 2026-08-24 |

## Cái đã đo lại, và cái chưa

**Đã đo lại — divergence M1.** Bốn package dùng chung (`agent`, `ai`, `coding-agent`, `tui`),
so SHA-256 từng file `.ts`/`.tsx`, trên `pi@8eb2bccf2`:

| | M1 ghi | **Đo lại** |
|---|---|---|
| Giống hệt từ byte | 0 | **0** |
| Chỉ có ở `pi` | 1.270 | **1.276** |
| Chỉ có ở omp | 4.318 | **4.318** |
| Cùng đường dẫn, khác nội dung | 145 | **145** |

Tự khớp cả hai vế: `1.276+0+145 = 1.421` (tổng phía `pi`) và `4.318+0+145 = 4.463` (tổng phía
omp). **Kết luận của M1 không đổi** — commit mới của `pi` là bump dependency nên chỉ thêm file
ở phía `pi`. Chi tiết: [`.lavish-wip/remeasure-2026-09-29.md`](remeasure-2026-09-29.md).

**CHƯA đo lại** — các khoảng kiểm kê capability (810 năng lực ở `.lavish-wip/refaudit/`) và mọi
con số còn dựa trên `deepseek-harness@477b4f4`, `codex-ref@e72da2b`, `opencode-ref@39021df`,
`gajae-ref@5c52314`, `senpi-ref@ea92162`. Sáu cây đó đều đã đi. **Đừng coi số đếm capability là
còn đúng** cho tới khi đo lại; nó có thể đã lệch theo cả hai chiều.

## Ràng buộc pháp lý không đổi theo thời gian

`claude-code-ref` **không có LICENSE** (đã kiểm ở `77a7934`, 2026-08-24). Mượn ý tưởng thiết kế
thì được; **dán code thì không**. `docs/tui.md` và `packages/tui/CHANGELOG.md` đã hứa
`RenderStablePrefix` với người dùng mà không định nghĩa nó — xem bead `omp-beo`.

## Cách đo lại đúng

```bash
cd ../pi-ref && git fetch origin && git merge --ff-only origin/main
# rồi chạy lại phép đo SHA-256 trên 4 package dùng chung
```

Đừng chạy `bun test` để đo divergence — nó đo *hành vi*, không đo *cấu trúc cây*.
