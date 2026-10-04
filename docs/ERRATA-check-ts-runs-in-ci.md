# ERRATA — `check:ts` **có** chạy trong CI

Đính chính một tuyên bố tôi gửi hai reviewer và một commit message (`c396adb14`) rồi rút lại.
Tuyên bố sai, không phải hành vi sai — **không code nào bị sửa bởi việc này**, và cổng vẫn hành
xử đúng. Ghi lại vì cái sai ở đây nguy hiểm: nó nghe có vẻ đúng.

## Sai ở đâu

Ở `c396adb14` (commit message) và hai tin nhắn gửi reviewer, tôi viết:

> `check:ts` appears in **ZERO** workflows under `.github/workflows`, so nothing in CI
> consumes this exit code today.

**Sai.** Đo lại, có một tầng giữa mà tôi không mở:

```
ci.yml:190         run: bun run ci:check:full
  └─ scripts/ci-check-full.ts   GATES[0] = { name: "check:ts", script: "check:ts" }
       └─ check:ts             … && bun run check:test-baseline     ← bước 16/16
```

`ci:check:full` là một **script** (`scripts/ci-check-full.ts`), không phải chuỗi `&&` trong
`package.json`. Tôi tìm `check:ts` trong `package.json` và `.github/workflows/*.yml`, thấy 0 —
rồi kết luận "không ai gọi". **Giữa hai chỗ tôi tìm có đúng một chỗ nữa**, và tôi không mở nó.

Và gate của CI là thật, không phải log:
`ci-check-full.ts:64` — `const ok = verdicts.every(v => v.exitCode === 0)`.

⇒ `check:test-baseline` exit 1 (VOID) **làm job `Type check workspace` đỏ**. Đúng như nó nên làm.

## Vì sao lỗi này lặp lại được

Đây là **biến thể thứ tư** của cùng một hình dạng, và nó khác những lần trước ở chỗ hướng:

| lần                    | tôi tìm ở đâu           | thực tế ở đâu                               |
| ---------------------- | ----------------------- | ------------------------------------------- |
| `resolvePeerTransport` | trong `bus.ts`          | `deliverViaTransport` — tên khác, cùng tầng |
| `registerPeerTools`    | trong `packages/`       | đúng, 0 caller                              |
| `check:ts`             | `package.json` + `.yml` | `scripts/ci-check-full.ts` — **tầng giữa**  |

Lần này nguy hiểm nhất vì nó cho kết luận **có vẻ đúng**: "CI không chạy typecheck" là một phát
hiện lớn, và tôi đã gửi nó cho hai reviewer như sự thật. Nếu ai đó tin và hành động — ví dụ
"vậy CI không cần cổng, để tôi tắt" — thì hậu quả nặng hơn cả lần `bus.ts`.

Quy tắc rút ra, khác hẳn mấy lần trước:

> **Đếm 0 chỉ là kết luận về _tập_ mình đã tìm.** Trước khi nói "không ai gọi", phải liệt kê
> _mọi_ nơi gọi có thể nằm — kể cả tầng script trung gian. Với CI, đó là `.yml` **và**
> `scripts/ci-*.ts`. Đếm 0 trên một tầng là kết quả của bộ lọc, không phải của thế giới.

Bổ sung vào memory: một lỗi grep không chỉ là "tôi gõ sai tên" — nó có thể là **"tôi tìm ở
đúng tầng nhưng bỏ sót tầng giữa"**, và cái thứ hai nguy hiểm hơn vì kết luận nghe có vẻ đúng.

## Cái vẫn đúng (đo lại, không đổi)

- `check:test-baseline` là **bước 16/16**, không có gì sau trong `check:ts`.
- Nên VOID-exit-0 **không** chặn bước nào sau. Cái nó tốn là **read-out**: `check:ts` exit 0 →
  `ci:check:full` đánh dấu `PASS` → job xanh, trong khi không có verdict nào được đưa ra.

⇒ `c396adb14` **đúng** ở điểm này, sai ở điểm "không ai trong CI dùng exit code". Đọc lại
đúng phần đúng, bỏ phần sai.

## Hệ quả cho câu hỏi "có nên nối falsifier vào `check:ts` không"

Cũng sai theo cùng lý do. Chi phí đo được vẫn là **724s vs 2s** (`check:test-baseline` so với
`check:census`) — nhưng 724s đó **có** được trả trong CI, mỗi lần `Type check workspace` chạy.
Nối falsifier vào `check:ts` sẽ làm nó **724s × 2**. Đó là lý do vẫn để anh quyết, và lý do
giờ đã rõ hơn: nó không phải "trả cho người chạy tay", nó là **trả cho CI**.
