# Quyết định: hàng hoàn thành cho `WI-SESSION-LOG` — và vì sao M2 đang bị chặn oan

Nguồn: `.lavish-wip/applied/NEEDS-OWNER-DECISION.md` mục 3. Đo trên `~/Projects/ultraworkers`,
nhánh `milestone-1`, HEAD `6e8109d`, ngày 2026-09-29. **Không sửa file kế hoạch nào** — file
này chỉ là quyết định.

## Câu hỏi

`WI-SESSION-LOG` xong khi nào, hay nó không thuộc M2?

## Mặc định đã chọn: **(b′) — hàng đo, ghi rõ phần invariant để sau**

Dán thêm một hàng vào bảng *Định nghĩa hoàn thành* của `MILESTONE_2_EXECUTION_PLAN.md`.
Hàng đó **không** hứa invariant; nó hứa **phép đo mà invariant phải dựa vào**, và nó ghi
thẳng trên mặt hàng rằng phần còn lại nằm ngoài hàng này.

> **Khác (b) của tài liệu nguồn ở đâu:** (b) của nguồn chỉ ghi bảng lỗ hổng. (b′) ghi bảng lỗ
> hổng **và** câu trả lời cho "deriveMessages của omp là gì", **và** dòng
> `chưa làm: invariant` in ngay trên hàng. Không có dòng đó thì (b′) trở lại thành bẫt mà
> chính mục *Bàn giao* của Wave 1b cảnh báo.

Tên của hàng phải ghi "**`WI-SESSION-LOG` (phần đo — phần invariant chưa làm)**", không được
ghi trần `WI-SESSION-LOG`. Tên ghi sai là cách bảng này đã lừa người đọc một lần rồi.

## Vì sao không phải (a) — và đây là phép đo làm đổi câu trả lời

Tài liệu nguồn khuyến nghị (a), và lý do nó đưa ra vẫn đúng. Nhưng (a) **không thi hành được
trên cây này**, và tài liệu nguồn viết nó ra *trước khi* chạy phép đo mà chính mục đó yêu cầu.

`MILESTONE_2_EXECUTION_PLAN.md:299-310` là *Cổng mở — đo trước khi viết*. Bước 2 của nó viết
rõ: **"`deriveMessages` của omp ngày nay là gì — có sẵn, không, hay dưới tên khác?
**Grep trước.**"** Cổng này **chưa từng được chạy**. Tôi chạy nó:

| câu hỏi của Cổng mở | lệnh | kết quả |
| --- | --- | --- |
| omp có `deriveMessages`? | `grep -rn "deriveMessages" --include='*.ts' packages/ \| wc -l` | **0** |
| omp có seam `llm/stream`? | `grep -rn "llm/stream" --include='*.ts' packages/ \| wc -l` | **0** |
| `SessionEvent` có arm ghi message? | `grep -c "message/append\|'message'" …/shared-events.ts` | **0** — 12 arm, toàn arm vòng đời (start/switch/branch/compact/stop/shutdown/tree/goal) |
| seam gần nhất lúc dispatch | `extensibility/shared-events.ts:182-185` | `ContextEvent` chỉ mang `messages: AgentMessage[]` — grep `system\|tools\|temperature\|maxTokens` trong block đó: **0 hit** |
| seam đó bắn ở đâu | `grep -rn 'type: "context"' --include='*.ts' packages/coding-agent/src` | `extensibility/hooks/runner.ts:370`, `extensibility/extensions/runner.ts:1798` |

Đây là mấu chốt. Invariant của phương án A là:

```ts
const expected = session.deriveMessages()
if (JSON.stringify(options.messages) !== JSON.stringify(expected)) fail(…)
```

Trong omp, `options.messages` **chính là** `currentMessages` mà `ContextEvent` đưa ra. Không
có nguồn thứ hai để suy ra. Nếu "tái dựng" từ chính cái mảng đó thì phép so sánh là
**vô nghĩa** — nó luôn bằng nhau. Để nó có nghĩa, phải có một nơi thứ hai giữ state, và bảy
nơi ứng viên đúng là bảy dòng của bảng lỗ hổng: resume, fork, transcript, compaction,
cache-state, telemetry, replay.

**Suy ra: bảng lỗ hổng không phải là phiên bản rẻ hơn của phương án A — nó là bước đầu
tiên bắt buộc của phương án A.** Không có nó thì "thêm invariant" là một dòng gõ, không
phải một cái cổng.

Và còn một lý do thứ hai, độc lập: điều kiện của (a) là *"số việc phạm mà nó bắt được trên
**toàn bộ test suite** được ghi bằng số"*. Ở checkout này native addon **chưa build**
(`find packages/natives -name '*.node'` → rỗng), nên `coding-agent` chạy
**913 pass / 1445 fail** tại HEAD. Hàng theo (a) sẽ **không bao giờ thoả** ở đây, phải build
addon trước theo đúng preflight mà `MILESTONE_2_EXECUTION_PLAN.md:55-64` đã ghi sẵn. Một
cổng mà môi trường hiện tại không cho chạy là một cổng treo, không phải một cổng.

## Vì sao không phải (c) — và phép đo đã tự loại nó

(c) là cắt phạm vi. Tôi không tự cắt. Nhưng phép đo cho thấy (c) cũng **không cần thiết**, vì
số học đã tự nói lên phương án nào:

```
sections '## WI-' trong M2          : 25
hàng bảng *Định nghĩa hoàn thành*  : 22
cố ý ngoài M2 (WI-20, WI-21, :5372) : 2
=> tập phải đóng của M2              : 23
=> bảng thiếu                        : 23 − 22 = 1
```

Và `comm` trên tên liệt kê ra đúng ba mục thiếu: `WI-20`, `WI-21`, `WI-SESSION-LOG`. Hai cái
đầu **đã được giải thích** ngay tại `:5372` là cố ý. Chỉ còn đúng **một** dòng trống, và nó
là dòng của `WI-SESSION-LOG`.

Nói cách khác: bảng thiếu **một hàng**, không thiếu một work item. Đó là bằng chứng rằng
kế hoạch đã với tay tới đúng hình dạng "thêm một hàng" và chỉ chưa viết ra. Cắt scope sẽ
là **xóa** công việc để làm số khớp — đúng cái làm số khớp mà `DECISIONS-RESOLVED.md` và
`READINESS-REPORT.md` đã bị phê bình suốt đợt này.

## Hàng cần dán (nội dung, để người viết copy)

```
| `WI-SESSION-LOG` (phần đo — **phần invariant chưa làm**) | Bảng lỗ hổng 7 dòng
(resume / fork / transcript / compaction / cache-state / telemetry / replay), mỗi dòng đánh
dấu "đang giữ state riêng" hay "đọc lại từ nguồn" — và câu trả lời cho câu hỏi Cổng mở bước 2.
**CHƯA LÀM, và nêu thẳng:** listener invariant. Phần đó là phương án A, nó **không** dựng
được từ hàng này — tính đến 2026-09-29 omp không có `deriveMessages` (0 hit) và không có
seam `llm/stream` (0 hit), nên chưa có nguồn thứ hai để so; `ContextEvent`
(`shared-events.ts:182-185`) chỉ mang `messages`. Hàng này xong **không** phải M2 xong
vì mục này xong — nó chỉ đóng được phép đo. | Hai lệnh grep ở cột bên cạnh chạy được ngay ở
HEAD và trả **0 hit** cả hai; bảng 7 dòng có trong thân mục, mỗi dòng có nhãn, và con số
"giữ state riêng" được ghi bằng số. |
```

Sau khi dán, `:5369` và `:5371` sửa thành: bảng có **23** dòng, và ba mục thiếu **đều đã
giải thích** (hai cái cố ý, một cái vừa được đo).

## Đây có cần người không

**Không, và nó không được chặn ai.** Đây là quyết định **kỹ thuật**, và bằng chứng tự quết
được: ba lệnh grep ở trên trả về 0/0/0 một cách tất định, và số học 23 − 22 = 1 chỉ ra
đúng một hàng còn trống. Không có gì ở đây là hợp đồng với người dùng, tên thương hiệu, hay
hợp đồng công khai nào bị đụng. Hàng này sống trong một file markdown kế hoạch, ai cũng đảo
ngược được bằng một lần xoá.

**Cái duy nhất còn cần người nằm sau nó, và nằm ngoài câu hỏi này:** khi bảng lỗ hổng đã
đo xong và **con số "giữ state riêng" ra > 0**, lúc đó câu hỏi A-vs-B mới thật sự là câu hỏi
kiến trúc, và lúc đó nó cần một người trả lời. Quy tắc dừng đã có sẵn ở `:322-324` và giữ
nguyên: **nếu số vi phạm mà invariant bắt được bằng 0 thì ghi thẳng "không có bằng chứng omp
cần B" rồi dừng** — đừng lật mô hình vì nó trông đúng. Mặc định này không lấy đi quyền
trả lời đó; nó chỉ đưa quyền ấy ra khỏi chỗ không ai có thể trả lời.

## Cách đảo ngược

Xoá đúng một hàng đã dán. Ba chỗ còn lại nằm trong hai file (bảng M2 được plan tổng nhúng
nguyên văn — cùng lớp lỗi "viết một nơi, đọc nơi khác" mà `PASS3.md` mục 7 đã gọi tên):

1. Xoá hàng trong bảng *Định nghĩa hoàn thành* — `MILESTONE_2_EXECUTION_PLAN.md` (~:5368)
   **và** bản nhúng trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (~:10327). Bỏ sót một trong
   hai là tái tạo đúng lớp lỗi mirror.
2. `22` → trở lại ở `MILESTONE_2_EXECUTION_PLAN.md:5369` và
   `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:10329`.
3. Khôi phục gạch đầu dòng "sự bỏ sót thật" ở `MILESTONE_2_EXECUTION_PLAN.md:5371` và
   `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:10331`.

Không có thay đổi nào về code, count ở dòng 5, hay bất kỳ work item nào khác. Đây là lý do
(b′) là mặc định an toàn: nó **không phá cài đặt đang tồn tại**, **kh��ng đụng bề mặt công
khai**, và đảo ngược bằng **một lần xoá**.

## Nếu sau này muốn chuyển sang (a) thật

Giữ hàng đo này, thêm hàng thứ hai, và thay điều kiện bằng cái (a) yêu cầu — **kèm preflight
build addon**, nếu không hàng đó không bao giờ thoả ở checkout chưa build:

```
brew install bazelisk
brew install ninja                                    # BẮT BUỘC TRƯỚC
bun --cwd=packages/natives run build
```

Chỉ làm sau khi bảng lỗ hổng đã đo và **con số "giữ state riêng" > 0**. Nếu bảng ra 0, quy
tắc dừng ở `:322-324` bảo dừng, và hàng đo này trở thành câu trả lời trọn vẹn.
