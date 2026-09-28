# KẾ HOẠCH THỰC THIỆN — MILESTONE 1: BAO TRỌN `pi`

Milestone 1 đưa toàn bộ phần còn nợ của `pi` vào `omp` theo đúng tiêu chuẩn dùng cho phần đã có: **mọi thứ người dùng nhìn thấy phải là một surface có kiểm chứng, mọi thứ chỉ "đúng về bên trong" phải nói thẳng là bên trong**. Nó gồm 17 work item (W1–W17) chia thành 7 wave, trải trên `packages/coding-agent`, `packages/agent`, `packages/ai`, `packages/catalog`, `packages/tui`.

Đây là tiền đề — và chỉ là tiền đề — cho luận điểm của dự án: **một coding agent duy nhất, mọi thứ là plugin**. Luận điểm đó chỉ đứng vững nếu ba điều trước nó đã đúng: vòng đời plugin có thể tháo ra lắp vào sạch (Wave 1), những đường đang chạy ngày hôm nay không âm thầm hỏng (Wave 2), và những mặt bằng người dùng thực sự chạm tới — tiền, cache, chẩn đoán, transcript — đã được dựng lại thay vì mượn. Cho tới khi Wave 1–3 xong, mọi plugin thêm vào sau đó đều đứng trên một nền mà ta chưa chứng minh là đứng vững. Milestone 1 không thêm tính năng mới; nó làm những cái đã hứa chịu được kiểm chứng.

---

## Mục tiêu

Không mục tiêu nào ở đây được viết theo danh sách task. Mỗi mục dưới là một thứ người dùng **thấy được** hoặc **chịu được** sau milestone.

### A. Bề mặt mới, người dùng chủ động gọi

| Sau milestone | Người dùng làm gì |
| --- | --- |
| `/info` có thêm mục **Attribution** (W9) | Xem từng model nào thực sự tiêu token, bao nhiêu token, bao nhiêu đô la, cộng một dòng literal `Tools/summaries`, cộng tổng tiền của các lần **miss** prompt-cache do chính agent gây ra. Trước đó con số là một tổng phẳng, không tách được ai là người tốn tiền. |
| Lệnh `/bug-report` (W17) | Gom một gói chẩn đoán để gửi đi, có metadata, chi phí theo model, và **crash ring** ghi qua `getCrashLogPath()` vốn đã có sẵn nhưng chưa ai dùng. Nội dung transcript trong gói là **opt-in**, mặc định không có. Mọi khoá nhạy cảm (`apiKey` / `api_key` / `API-KEY`) bị bóp theo tên khoá đã chuẩn hoá camelCase. |
| Tìm trong transcript (W15) | `Ctrl+Shift+F` mở overlay fullscreen với thanh tìm; gõ để lọc các dòng đã render, thanh tìm đếm số kết quả, `Enter` / `Shift+Enter` nhảy viewport tới từng kết quả và highlight. |
| Thiết lập `providers.promptCacheRefresh` (W8) | Ba trạng thái `off` (mặc định ở release đầu) / `cost-gated` / `always`. Chỉ thứ người dùng **tự bật** mới được tiêu tiền của họ. |

### B. Hỏng âm thầm được chặn lại

Những thay đổi này người dùng không "thấy" một màn hình mới, nhưng họ sẽ không còn gặp nữa:

- **Lệnh `rm -rf /` không còn tự tự duyệt** (W6). Với `tools.approvalMode: yolo` — chế độ mặc định — một lệnh khớp `CRITICAL_BASH_PATTERNS` (`rm -rf /`, `rm --no-preserve-root`, `su`…) hôm nay tự approve một cách âm thầm ngay lúc cài. Sau W6, mọi chế độ phê duyệt đều trả về `policy: "deny"`.
- **Hai lần sửa cùng một file trong một lượt không còn xen kẽ nhau** (W12). Hai subagent (hay hai session) cùng đụng một file, bản ghi thứ hai sẽ không còn ghi đè lên bản ghi đang dở của bản ghi thứ nhất. Hàng đợi là **per-realpath**: cùng một file thì tuần tự, khác file thì vẫn song song.
- **Client JSON/ACP ngừng đọc không còn làm hỏng stdout** (W13). Frame của `omp` được trì hoãn có kiểm soát (thử lại khi gặp `ENOBUFS`/`EAGAIN`/`EWOULDBLOCK`, có chặn trên) thay vì bị cắt cụt giữa dòng hoặc bị vứt mất không dấu vết.
- **Windows + PowerShell không còn ra mojibake** (W14a). Người dùng Windows trỏ `shellPath` sang `pwsh`/`powershell` và chạy lệnh qua hotkey `!`, PTY tương tác hay tool `bash` sẽ nhận kết quả tool không phải UTF-8. W14a đi kèm **vô điều kiện**. W14b (tool `powershell` riêng) chỉ được dựng **nếu người dùng nói omp cần nó**.
- **ACP `_omp/usage` trả về đúng session được hỏi** (W4). Client hỏi usage của session B hôm nay nhận số của session A — session đầu tiên trong map. Sau W4 nó nhận của B.

### C. Những thay đổi hoàn toàn bên trong — nói thẳng

**8 trên 17 work item không có bất kỳ bề mặt người dùng nào.** Không UI, không output, không cờ, không đổi hành vi mặc định:

W1 (disposer cho `pi.on()`), W2 (`drainDisposers` tháo theo thứ tự ngược + cô lập lỗi), W3 (type guard ở biên giải mã frame collab), W5 (khoá bằng type bảo đảm khớp discriminant wire↔host), W7 (trục TTL theo tier của prompt-cache trong catalog), W10 (hợp đồng telemetry trung lập vendor), W11 (khoá hợp đồng `strict` qua extension-tool bridge), W16 (conformance chung cho mọi backend SessionStorage).

Chúng vẫn nằm trong milestone 1 vì ba lý do cụ thể, không phải vì "cho đủ số":

1. **W1 là gốc của mọi thứ khác.** Hôm nay `pi.on(event, handler)` không trả về gì cả, nên một teardown không có gì để gọi. Wave 1 không có W1 thì W2 không có disposer để drain, W12 không có mẫu để xếp hàng teardown, và W8 không có chỗ đăng ký disposer lúc session teardown.
2. **Chúng là chỗ hỏng âm thầm.** W3 biến một frame hỏng cấu trúc từ `TypeError` vô nghĩa vài lần gọi sau thành một lần **drop có tên lý do** ngay tại biên giải mã. W16 làm cho một sai lệch giữa backend SQL và Redis **hỏng test** thay vì lặng lẽ tồn tại.
3. **Chúng là hợp đồng, và hợp đồng thì phải khoá trước khi có người dùng.** W5 và W11 không sửa một dòng production nào; chúng biến một lời hứa đang nằm trong comment thành thứ mà `bun run check:ts` trả đỏ khi ai đó phá vỡ nó.

Nếu maintainer cần cắt cho deadline, **Wave 7 (W14, W15) là cái đuôi cắt được** — nó tự chứa, không ai chặn nó, và cả hai đều là bề mặt người dùng thuần tuý. W1–W6 và W8–W9 thì không.

---

## Không làm gì

Milestone 1 **không port** ba package của `pi`. Chúng không bị bỏ sót — chúng bị loại có chủ đích, và thay thế bằng thứ đã có sẵn trong cây:

| Package của `pi` bị từ chối | Thay bằng | Mức độ tin cậy |
| --- | --- | --- |
| `session-backends` | Họ backend `SessionStorage` đã có sẵn trong cây: filesystem, in-memory, indexed, SQL thật, Redis. W16 đặt tất cả vào **một** bộ câu hỏi hành vi chung để chúng không thể lệch nhau nữa. | Chỉ xác minh **theo tên và theo bề mặt**. Chưa chứng minh tương đương hành vi. |
| `durable` (một phần) | Session persistence đã có sẵn trong cây. | Xem cảnh báo bên dưới — nửa "document" **không có** thay thế nào. |
| *(package thứ ba)* | — | Chưa xác định. Xem bảng quyết định ở mục dưới. |

### Hai điều không được chôn vùi

**1. Bản thay thế cho `session-backends` chỉ được xác minh theo tên và theo bề mặt, KHÔNG theo tương đương hành vi.** Nghĩa là: chúng ta biết những backend có mặt trong cây, biết chúng có mặt thẩm mỹ API, và W16 sẽ ép chúng trả lời cùng một bộ câu hỏi. Chúng ta **không** biết chúng có làm đúng những thứ mà `pi`'s session-backends làm. Do đó câu **"năng lực là như nhau" chưa được chứng minh** và không được nói ra như một sự thật ở bất kỳ review note, changelog, hay thông điệp nào cho tới khi ai đó chạy conformance suite và đọc kết quả. Nói ngắn gọn: danh sách trên là một giả định đang được kiểm chứng, không phải một kết luận.

**2. Nửa "document" của `pi` durable không có thay thế nào đã được xác minh, và đây là điểm duy nhất trong milestone không có bằng chứng nào đứng sau.** Không có work item nào phủ nó. Không có file nào được chỉ định. Nó là một lỗ hổng bằng chứng, không phải một quyết định đã cân nhắc. Hệ quả thực hành: **nếu sau này có ai phát hiện một năng lực người dùng quan sát được đến từ `durable`, đây là chỗ đầu tiên phải soi.** Đừng mở một work item mới để bịa một thay thế; hãy quay lại đây và điền bằng chứng trước.

> **Cập nhật 2026-09-28 — lỗ hổng này ĐÃ ĐƯỢC ĐIỀN, và kết luận là đừng chép gì cả.**
> `SENPI_FINDINGS.md` đo trên cây thật: `durable` của `pi` là **package chết** — không package nào ngoài
> nó import, và bằng chứng duy nhất cho tính tồn tại của nó là **23 file test của chính nó**. Tầng session
> thật sự chạy nằm ở `packages/agent/src/harness/session/jsonl/`, và **8/8 file giống hệt từ byte** giữa
> `pi` và `senpi` (1.894 dòng). **Cả hai đều `hard-fail` khi JSONL hỏng** — còn omp có
> `parseJsonlLenient` + `malformedRecords → #rewriteRequired`.
>
> **Năng lực người dùng quan sát được mà `durable` mang, không mất đi: đó là một tầng chịu lỗi, và omp
> đã có một tầng chịu lỗi mạnh hơn.** Không phải "thiếu thay thế" — là **có sẵn thứ tốt hơn**.
>
> Hệ quả cho phạm vi: **`MILESTONE_1B_EXECUTION_PLAN.md` rút từ 7 package xuống 6, tiết kiệm 21.093 dòng.**
> Cổng mở bắt buộc trước khi tin: chạy lại `grep -rn "from.*durable"` trên cây `pi` và đối chiếu
> `8/8 file byte-identical` — đừng chép số của SENPI mà không đo lại.

---

## Điều kiện tiên quyết

Bốn thứ, theo thứ tự. Bỏ bước nào thì bước sau cho kết quả giả.

**1. Cài dependency.**

```bash
bun install --frozen-lockfile
```

Checkout này **không có `node_modules`**. Trước khi chạy, mọi lệnh dưới đều chết với `tsgo: command not found`.

**2. Build native addon — bắt buộc trước bất kỳ `bun test` nào.**

```bash
brew install bazelisk
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
```

**3. Điều kiện tiên quyết này quyết định một `bun test` đỏ có nghĩa là gì.** Ở HEAD hiện tại, chưa build addon thì:

```
bun test packages/coding-agent/test/rpc-output.test.ts
→ 0 pass / 1 fail / 1 error
  Failed to load pi_natives native addon for darwin-arm64
  packages/natives/native/index.js:23:24
```

Đó **không phải** kết quả của code bạn viết — nhưng cũng **không phải** mọi test đều đỏ. Chặn là **CHỌN LỌC theo bề mặt import, không phải toàn cục** — đo tại HEAD `106eb3e`, 2026-09-28, trong khi addon của `packages/natives` CHƯA build: `packages/omptype` **1.191 test / 0 fail** và `packages/utils` chạy được. Chỉ những file import `pi_natives` mới đỏ. Phép đo theo package: `omptype` 1139/0 · `utils` 658/17 · `catalog` 141/104 · `stats` 43/19 · `mnemopi` 146/53 · `agent` 4/46 · `ai` 73/450 · `tui` 149/205 · `coding-agent` 913/1445. Hệ quả thẳng về mặt thể chế: **trước khi chạy `bun run build:native`, một kết quả đỏ của `bun test` là vô nghĩa, và một work item chưa build addon thì phải được coi là CHƯA xác minh, không phải là xanh.** Đây không phải là lý thuyết — nó đã được quan sát thấy ở W13, W16 và W11, và riêng W13 được ghi rõ là gate *trong* (vacuous) cho tới khi addon có.

**4. Kiểm tra kiểu — chạy được, và là hàng rào duy nhất hữu ích trong ngày đầu.**

```bash
bun run check:ts
```

Lệnh này **không cần** native addon và đã được xác minh PASS tại baseline trên chính HEAD này (toàn bộ 16 package `Done`, không lỗi). Nó là oxlint + oxfmt + `tsgo --noEmit` trên mọi package. Vì vậy trong lúc chờ build addon, đây là công cụ duy nhất phát hiện được type error, import thiếu ở top-level, `ReturnType<>`, hay vi phạm format — những thứ mà một `bun test` bị chặn không thấy được.

> **Không bao giờ dùng `tsc` hay `npx tsc`.** Kiểm tra kiểu đi qua `bun run check:ts` / `bun run check:types`.

---

## Thứ tự thực hiện

7 wave, 17 work item. Bảng dưới là bản tóm tắt để quyết định có bắt đầu không; chi tiết từng item nằm ở spec riêng.

| Wave | Nội dung | Item | Cỡ | Phải đúng trước khi bắt đầu | Đúng vào lúc kết thúc |
| --- | --- | --- | --- | --- | --- |
| **1** | Nền móng vòng đời | W1, W2, W3, W5 | S, S, S, S | native addon đã build; `bun install` xong | `pi.on()` trả về hàm huỷ một lần, xoá **đúng** handler đó và xoá khoá Map khi danh sách rỗng; cả bốn vòng drain đi qua `drainDisposers`; frame collab hỏng bị drop có tên; type-only guard wire↔host làm `check:ts` đỏ khi lệch |
| **2** | Correctness trên các đường đang chạy | W4, W6, W12, W13 | S, S, M, S | Wave 1 xong **cho W12**; quyết định sản phẩm của W6 đã chốt | `rm -rf /` bị deny ở mọi chế độ; ACP usage trả đúng session; ghi file cùng realpath nối tiếp nhau, khác file vẫn song song; stdout không còn mất frame khi reader nghẽn |
| **3a** | Kinh tế cache | W7, W8 | M, M | **Bảng TTL theo provider/tier đã có nguồn** (xem quyết định); F6 (`decideWarm` / `WarmDecision`) đã tồn tại | Catalog có trục TTL per-tier do rule sở hữu; `providers.promptCacheRefresh` tồn tại ở `off`/`cost-gated`/`always`; **không** request byte nào thay đổi |
| **3b** | Quy kết chi phí | W9 | M | Không phụ thuộc wave nào | `/info` có Attribution; không token nào bị đếm hai lần |
| **4** | Hợp đồng hướng provider | **W11 rồi W10** | S, M | Không có | `strict` đi qua bridge mà không rơi và không bị bịa; telemetry có hợp đồng trung lập vendor + NOOP + in-memory + conformance; `otel.test.ts` **không đổi một dòng** |
| **5** | Chẩn đoán hướng người dùng | W17 | < M | W9 xong (W9 blocks W17) | `/bug-report` dựng được gói đã bóp khoá; transcript opt-in; crash ring sống |
| **6** | Storage conformance | W16 | M | Không có | Mọi backend trả lời cùng một bộ câu hỏi; nhóm `lateAtomicRollback` **đã chứng minh bắt được** sai lệch thật |
| **7** | TUI và Windows — **cái đuôi cắt được** | W14, W15 | S + M, M+ | Không có; chạy song song với bất kỳ ai | PowerShell ép UTF-8; `Ctrl+Shift+F` tìm trong transcript |

### Cấu trúc song song — cái gì chạy cùng, cái gì không

**Hard edges (không thể vượt):**

```
W1 ──▶ W2 ──▶ W12        W1 ──┐
                                 ├──▶ W8 ◀── W7 (HARD BLOCK)
W3 ───────────────────────┘         ▲
                                   └── F6 (decideWarm / WarmDecision — chưa tồn tại)
W9 ──▶ W17
W11 ──▶ W10
W7 + W8 ship như MỘT đơn vị
```

Đọc hình như sau:

- **W1 là đầu chuỗi và là lý do nó đứng đầu Wave 1.** Nó là nền cho W2, và W2 là nền cho W12. Qua W2, W1 còn là nền cho W8: cache warmer đăng ký một disposer lúc session teardown, mà hôm nay hàm `on()` trả `void` nên không có gì để gọi và một request đang bay bị rò.
- **W7 không phụ thuộc Wave 1.** Nó không đụng lifecycle, không đụng disposer. `light.json` nói thẳng: xây song song với Wave 1 được.
- **W8 đợi W1, W2, W3** (tất cả đều `blocks` W8) **và W7** (hard block) **và F6** — mà F6 chưa tồn tại trong repo. Đừng đọc danh sách này là "ba việc nhỏ": `promptCacheLifetime` và `decideWarm` đều chưa có chỗ nào trong cây, nên W8 là việc **không thể bắt đầu** cho tới khai cả hai đứng.
- **W8 KHÔNG phụ thuộc W2 về mặt code** — đường huỷ request bay đã tồn tại sẵn (`AnthropicCacheRefreshState` đã là `ProviderSessionState` với `cancel()`/`close()`, và `cancel()` đã gọi `abort()`). W2 chỉ là tiền đề cho extension disposer, không phải cho W8.
- **W13 về kỹ thuật song song với W2**, phụ thuộc thứ tự chứ không phụ thuộc mã: nó không import gì của W2. Xếp vào Wave 2 chỉ vì cần ba file test của Wave 1 đã chứng minh được đường test chạy được. Có thể làm cùng lúc; chỉ cần chạy full suite **một lần** sau khi cả hai land.
- **W11 phải land trước W10** (cùng Wave 4, không phải cùng commit) — và W10 là **hai commit, không bao giờ squash**.

**Hoàn toàn độc lập, chạy ngay được:** W4, W5, W6, W9, W11, W16, và W14/W15 nếu không cắt.

**Cái đuối cắt được:** Wave 7. Tự chứa, không ai chặn.

**Cảnh báo về độ trễ của gate:** nhiều gate trong wave sau hiện **không chạy được** vì addon chưa build, và `light.json` đã đánh dấu chúng là trong (vacuous). Trước khi dùng bất kỳ gate nào làm tiêu chuẩn nghiệm thu, build addon. Gate nào chưa build mà đỏ thì coi như **chưa xác minh**.

---

## Quyết định cần chốt trước khi code

Đây là những thứ **chặn việc bắt đầu**, không phải những thứ chặn việc merge. Không có gì ở đây là chi tiết triển khai.

| # | Quyết định | Ở đâu | Vì sao nó chặn | Ai chốt |
| --- | --- | --- | --- | --- |
| 1 | **Mặc định của bash critical-pattern dưới `yolo`.** Lệnh khớp `CRITICAL_BASH_PATTERNS` sẽ `deny` hay vẫn tự approve? | W6 | Đây là **ký hiệu sản phẩm**: nó đổi hành vi của chế độ mặc định trên máy người dùng thật. Chốt sau thì không sửa ngược được mà không phá người đã quen hành vi cũ. | Maintainer, bằng văn bản |
| 2 | **Bảng TTL prompt-cache theo provider/tier phải có nguồn trước khi W7 bắt đầu.** | W7 (chặn cả W8) | Là hard gate, không phải task. W7 cấp **schema**, W7 không cấp **data**. Kỹ sư không tìm được con số thì để field `undefined` — **đừng đoán**: TTL đo quá ca làm số lần refresh bùng nổ trên một entry lẽ ra còn sống; TTL đo quá thấp chỉ mất đi một lần trúng-cache tránh được. Sai lệch hai bên không cân bằng. | Nghiên cứu, trước Wave 3a |
| 3 | **Trục TTL có trùng lặp trục cũ không.** `promptCacheLifetime` có phải là cái đã có sẵn dưới tên khác không, hay là trục mới độc lập? | W7 (OQ1) | **Compiler sẽ không bắt lỗi này.** Cả ba gate của W7 có thể xanh trong khi quyết định thiết kế vẫn chưa được đưa ra. Đó là lý do nó là câu hỏi mở chặn, không phải chi tiết. Lưu ý khi làm: đừng đặt field cạnh `promptCacheBreakpointTtl` tại `packages/catalog/src/types.ts:403` — chỗ đó kéo nó lên `OpenAICompat`/`ResolvedOpenAIShare…` và gắn nó vào wire field đang có. | Maintainer + kỹ sư catalog |
| 4 | **Tính tới được của hàng đợi ghi file.** `writeFileWithFallback` tại `packages/coding-agent/src/tools/file-write-fallback.ts:402` có bọc khoá quanh **cả** vòng lặp fallback-handler (`:440-452`), mà vòng lặp đó gọi các handler do extension đăng ký. Handler đó có thể quay lại ghi chính file đó không? | W12 | Rủi ro cao nhất của W12 là **deadlock**: một lời gọi re-entrant chặn đứng hàng đợi. Đây là câu hỏi reachability phải trả lời **trước khi** viết helper, không phải sau khi test treo. | Kỹ sư, bằng cách đọc call path |
| 5 | **Package `pi` thứ ba bị từ chối — tên và thay thế là gì.** | Mục *Không làm gì* | Danh sách "không làm gì" của milestone chỉ xác minh được hai package theo tên. Không đóng được mục này thì phần "bỏ sót có chủ đích" chưa đầy đủ, và người đọc không biết chỗ nào an toàn để tìm năng lực còn thiếu. | Maintainer |

---

## Quy ước khi đọc

**Ngôn ngữ.** Toàn bộ văn bản giải thích viết bằng tiếng Việt. **Mọi thứ là mã thì giữ nguyên** — định danh, tên file, tên symbol, tên cờ, tên trường, thông điệp log, chuỗi trong test. Không dịch tên biến, không dịch tên file, không viết lại thông điệp lỗi. Khi phải trích dẫn một giá trị nguyên văn, trích nguyên văn trong backtick.

**Kiểm tra và kiểm thử.** Kiểm tra kiểu qua `bun run check:ts` (gốc) hoặc `bun run check:types` (một package). Kiểm thử qua `bun test`. **Không bao giờ dùng `tsc` hay `npx tsc`** — dùng chúng là bỏ qua toàn bộ cấu hình của repo. Nhớ rằng cả hai đều cần `bun install` trước, và `bun test` cần native addon (xem *Điều kiện tiên quyết*).

**Không bao giờ source-grep một file implementation trong test.** Một test đọc file `.ts`/`.rs` rồi khẳng định về **text** của nó — `expect(src).toContain("someCall()")`, `.toMatch(/import …/)`, `.not.toContain("oldName")`, hay "comment phải nói X" — là bị cấm. Nó kiểm tra code **trông** thế nào chứ không phải nó **làm** gì: nó vỡ trên refactor vô hại (ngắt dòng comment, đổi tên, sắp lại import) và nó xanh trong khi hành vi đã hỏng. Thay bằng: chạy code rồi kiểm tra output/state/lỗi; dùng type test cho bất biến cấu trúc; dùng oxlint rule cho thứ không thể kiểm chứng lúc chạy. (Đọc một file **code của bạn vừa ghi ra** — kết quả apply-patch, bundle sinh ra, fixture tạm — rồi khẳng định trên đó thì được; đó là hành vi, không phải quét nguồn.)

**Không bao giờ `mock.module()`.** Nó ghi vào registry module toàn cục và rò sang các file khác. Thay bằng `vi.spyOn(...)` trên object module đã import, kèm `vi.restoreAllMocks()` trong `afterEach`. Một test chạy được riêng lẻ nhưng làm hỏng file sau đó là test hỏng.

**Policy của catalog sửa ở cây `.kdl`, không phải ở JSON sinh ra.** Mọi thứ phụ thuộc danh tính model/provider — bậc cấp effort, giá, context window, modality, định tuyến API, cờ quirk — thuộc về cây rule ở `packages/catalog/src/compat/rules/`. Sửa ở đó, biên dịch bằng:

```bash
bun run gen:compat
```

rồi commit `rules.json` **cùng** file `.kdl` đã sửa. **Không bao giờ sửa tay** `packages/catalog/src/compat/rules.json`, và không bao giờ sửa tay `packages/catalog/src/models.json` — cả hai đều sinh ra, bàn tay thì bị ghi đè ở lần regenerate kế tiếp. Với W7, nhớ rằng **compiler sẽ không bắt** chuyện hai trục nói cùng một điều; đó là lý do nó nằm trong bảng quyết định ở trên chứ không phải trong danh sách việc.


---


## W1. Khôi phục disposer mà API `on()` của extension và hook trả về

**Thay đổi gì:** Cho `pi.on(event, handler)` trả về một hàm huỷ đăng ký một-lần, chỉ gỡ đúng handler đó và xoá key của Map khi danh sách rỗng — áp dụng cho cả extension API lẫn hook API.  **Wave:** Wave 1 — Lifecycle foundation (work items W1, W2, W3, W5).  **Effort:** S — khoảng 35–45 dòng đổi trên 5 file production (2 file type chỉ đổi kiểu trả về, 2 điểm cài đặt, 1 helper mới 8 dòng) cộng một file test ~120 dòng.

**Người dùng thấy:** Không trực tiếp — không UI, không output, không đổi hành vi mặc định. Giá trị trả về mới chỉ là một return value chưa ai dùng cho tới khi một work item sau (W8 cache warmer) đăng ký rồi gọi nó. Hiệu ứng là **âm**: một tác giả extension đã viết `const off = pi.on(...)` sẽ có `off()` chạy được thay vì `undefined`, và không caller hiện hữu nào bị ảnh hưởng — vì trước đây TypeScript trả `void` nên không gán được vào đâu.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/utils.ts` | sửa | Thêm `createHandlerDisposer(handlers: Map<string, HandlerFn[]>, event: string, handler: HandlerFn): () => void` — splice theo identity rồi xoá key Map. Đây là bản cài đặt dùng chung duy nhất mà cả hai loader gọi, nên không vi phạm quy tắc cấm hai bản cài đặt trùng nhau trong `AGENTS.md`. | Có — file tồn tại, 7.4 KB, hiện export `resolvePath` / `createNoOpUIContext` / `ExtensionExitError` / `withHostGuard`. `HandlerFn` **không** được export từ file này; hoặc khai Map là `Map<string, (...args: unknown[]) => Promise<unknown>>` inline, hoặc import kiểu. Cả hai loader đã có `import { resolvePath, withHostGuard } from "../utils";` (`extensions/loader.ts:40`, `hooks/loader.ts:15`) nên chỉ thêm tên vào import. |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | `ConcreteExtensionAPI.on` (dòng 210) đổi kiểu trả về `void` → `() => void`; thêm `return createHandlerDisposer(this.extension.handlers, event, handler);` sau ba dòng thân hàm hiện có. Thêm `createHandlerDisposer` vào import `../utils` ở dòng 40. | Có — text hiện tại ở 210–214; class khai báo ở 179 là `class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime` — `implements` này là kiểm tra cứng, nên chỉ sửa file type sẽ fail loudly ngay tại đây. `HandlerFn` là type alias cục bộ ở dòng 61. |
| `packages/coding-agent/src/extensibility/hooks/loader.ts` | sửa | `on` dạng object literal (dòng 93) đổi kiểu trả về `void` → `() => void`; thêm `return createHandlerDisposer(handlers, event, handler);` sau dòng 97. Thêm `createHandlerDisposer` vào import `../utils` ở dòng 15. | Có — text hiện tại ở 93–98. Cast `} as HookAPI;` nằm ở dòng **128**, không phải 92 (dòng 92 là `const api = {`; dòng 90–91 là comment nhắc tới cast). |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Toàn bộ 41 overload `on(event: "..."): void;` bên trong `export interface ExtensionAPI` (khai báo dòng 1256; overload nằm ở 1280–1340) thành `on(event: "..."): () => void;`. Phần chữ ký còn lại không đụng. | Có — `grep -c 'on(event: "'` = 41, cả 41 nằm trong 1256–1400 tức trong `ExtensionAPI`; không có `on(event: "` nào khác trong file. `ToolDefinition` ở dòng 636 (không phải 611) và **không** cần sửa — nó không phải event handler. |
| `packages/coding-agent/src/extensibility/hooks/types.ts` | sửa | Toàn bộ 24 overload `on(event: "..."): void;` bên trong `export interface HookAPI` (khai báo dòng 469; overload nằm ở 471–500) thành `on(event: "..."): () => void;`. | Có — đếm được 24. **Không** đụng dòng 134 (`) => (Component & { dispose?(): void }) | Promise<Component & { dispose?(): void }>,` — đó là dispose của UI component, không liên quan). |
| `packages/coding-agent/test/extensions-disposer.test.ts` | tạo | File test mới, 4 case, tách trên hai surface. Chi tiết ở mục *Hợp đồng test*. | Có — chưa tồn tại. Thư mục `packages/coding-agent/test/` có 791 file `.test.ts`. Theo đúng quy ước đặt tên của file lân cận (`extension-*.test.ts`, `hook-*.test.ts`). |

### Các bước

1. **Ghi lại baseline trước khi sửa** (`packages/coding-agent/src/extensibility/utils.ts`). Chạy `cd packages/coding-agent && bun run check:types`. Ngày hôm nay lệnh này FAIL với đúng một lỗi — `test/collab/w3-probe.test.ts(76,15): error TS2352` — nhưng file đó là probe tàn dư chưa được track từ nghiên cứu W3, không phải source đã commit. Dời nó ra (`mv packages/coding-agent/test/collab/w3-probe.test.ts /tmp/`) rồi chạy lại: xanh. Khôi phục lại file sau đó. Cổng của bạn là **không có lỗi MỚI**, không phải "zero lỗi".
2. **Thêm helper dùng chung** vào `packages/coding-agent/src/extensibility/utils.ts`, đúng như khối code_shape mục 1, kèm comment giới hạn phạm vi (đây là rút một đăng ký handler, không phải unload; các hook `Bun.plugin()` trong `extensibility/plugins/legacy-pi-compat.ts` mang tính process-global và vĩnh viễn — xem comment ở `legacy-pi-compat.ts:1990-1992`).
3. **Sửa phía extension** — `packages/coding-agent/src/extensibility/extensions/loader.ts:210`. Đổi `on<F extends HandlerFn>(event: string, handler: F): void` thành trả `() => void` và chèn `return createHandlerDisposer(this.extension.handlers, event, handler);` vào trong thân hàm sẵn có. Thêm `createHandlerDisposer` vào `import { resolvePath, withHostGuard } from "../utils";` tại dòng 40. Không cấu trúc lại thân hàm — cặp `push`/`set` hiện tại đã đúng về identity.
4. **Sửa phía hook** — `packages/coding-agent/src/extensibility/hooks/loader.ts:93`, thay đổi tương tự, truyền map `handlers` đã capture trong closure. Thêm `createHandlerDisposer` vào import `../utils` ở dòng 15. Cast `} as HookAPI;` ở dòng 128 giữ nguyên.
5. **Sửa 41 overload** — `packages/coding-agent/src/extensibility/extensions/types.ts:1280-1340`. Đổi hậu tố `): void;` thành `): () => void;` trên cả 41 khai báo `on(`. Dạng cơ học an toàn nhất: **chỉ trong khoảng 1280–1340**, thay hậu tố `): void;` kết thúc một khai báo `on(`. **Không** thay toàn cục `): void;` — file có nhiều method `register*` khác phải giữ `void`. Kiểm bằng `git diff --stat` phải ra đúng 41 dòng đổi (cộng reflow của formatter).
6. **Sửa 24 overload** — `packages/coding-agent/src/extensibility/hooks/types.ts:471-500`, làm y hệt. Lưu ý hai overload nhiều dòng (ví dụ `on(event: "session_before_compact", ...)` ở 476–479, và `ttsr_triggered` quanh 497) — hậu tố `): void;` nằm ở dòng đóng chứ không phải dòng mở `on(`. Kiểm đúng 24 dòng đổi.
7. **Viết 4 test case** trong `packages/coding-agent/test/extensions-disposer.test.ts`. Hai case phía extension dùng `loadExtensionFromFactory` (đã export, `extensions/loader.ts:464` — nhận factory **inline** nên closure giữ được các disposer, không cần file tạm). Hai case phía hook dùng `loadHooks` (đã export, `hooks/loader.ts:191` — dynamic-import một path thật, nên phải viết file hook tạm và trả disposer về qua `globalThis`, đúng cách bàn giao đã dùng tại `extension-prepared-rebind.test.ts:46`). Không dùng `mock.module()` ở bất cứ đâu; cũng không cần `vi.spyOn`. Dọn key `globalThis` trong `afterEach` bằng `Reflect.deleteProperty` để file an toàn khi chạy cả suite.
8. **Build native addon một lần** (`bun --cwd=packages/natives run build`) — thiếu nó thì `bun test` báo 0 pass / `Failed to load pi_natives native addon for darwin-arm64`, và không phân biệt được test của bạn pass với test không hề chạy. Sau đó chạy file và xác nhận số pass > 0.
9. **Chạy lại cổng** — `cd packages/coding-agent && bun run check:types` và xác nhận lỗi DUY NHẤT còn lại là lỗi `w3-probe.test.ts` đã có sẵn, tức không lỗi mới. Chạy thêm các suite extension/hook hiện có để bắt hồi quy: `bun test packages/coding-agent/test/extensions-runner.test.ts packages/coding-agent/test/extensions-discovery.test.ts packages/coding-agent/test/plugin-extensions-discovery.test.ts`.

### Hình dạng code

```ts
// ---------------------------------------------------------------------------
// 1) HELPER DÙNG CHUNG MỚI — packages/coding-agent/src/extensibility/utils.ts
//    (cả hai loader ĐÃ import từ "../utils", nên ở mỗi loader chỉ thêm tên
//     vào import; không module mới, không dynamic import)
// ---------------------------------------------------------------------------

/**
 * Build an identity-safe disposer for one registered handler.
 *
 * Scope note: this withdraws a single handler registration. It is NOT an
 * unload — extension modules are never unloaded, and the `Bun.plugin()` hooks
 * in extensibility/plugins/legacy-pi-compat.ts are process-global and permanent
 * by construction.
 *
 * Removal is by identity, never by index: between `on()` and the disposer call
 * the list may have shifted, and a second call to the same disposer must be a
 * no-op rather than evicting whichever neighbour moved into the old slot.
 * When the list empties, the Map key is deleted so the key set does not grow
 * across extension reloads.
 */
export function createHandlerDisposer(
	handlers: Map<string, HandlerFn[]>,
	event: string,
	handler: HandlerFn,
): () => void {
	return () => {
		const list = handlers.get(event);
		if (!list) return;
		const index = list.indexOf(handler);
		if (index === -1) return;
		list.splice(index, 1);
		if (list.length === 0) handlers.delete(event);
	};
}

// ---------------------------------------------------------------------------
// 2) IMPL — packages/coding-agent/src/extensibility/extensions/loader.ts:210
//    (trước đó là `on<F extends HandlerFn>(event: string, handler: F): void`)
// ---------------------------------------------------------------------------

	on<F extends HandlerFn>(event: string, handler: F): () => void {
		const list = this.extension.handlers.get(event) ?? [];
		list.push(handler);
		this.extension.handlers.set(event, list);
		return createHandlerDisposer(this.extension.handlers, event, handler);
	}

// ---------------------------------------------------------------------------
// 3) IMPL — packages/coding-agent/src/extensibility/hooks/loader.ts:93
//    (bên trong object literal `const api = { ... } as HookAPI` kết thúc :128)
// ---------------------------------------------------------------------------

		on(event: string, handler: HandlerFn): () => void {
			if (!handlers.has(event)) {
				handlers.set(event, []);
			}
			handlers.get(event)!.push(handler);
			return createHandlerDisposer(handlers, event, handler);
		},

// ---------------------------------------------------------------------------
// 4) TYPES — chỉ đổi kiểu trả về; thân 41 (ext) + 24 (hooks) overload giữ nguyên.
//    Tất cả đều đi từ `): void;` -> `): () => void;`
// ---------------------------------------------------------------------------

// packages/coding-agent/src/extensibility/extensions/types.ts — 41 chỗ, dòng 1280-1340
	on(event: "session_start", handler: ExtensionHandler<SessionStartEvent>): () => void;
	// ... còn 40 chỗ, đều nằm trong `export interface ExtensionAPI` (khai báo dòng 1256)

// packages/coding-agent/src/extensibility/hooks/types.ts — 24 chỗ, dòng 471-500
	on(event: "session_start", handler: HookHandler<SessionStartEvent>): () => void;
	// ... còn 23 chỗ, đều nằm trong `export interface HookAPI` (khai báo dòng 469)

// KHÔNG ĐỤNG packages/coding-agent/src/extensibility/hooks/types.ts:134
//   ) => (Component & { dispose?(): void }) | Promise<Component & { dispose?(): void }>,
// Đó là `dispose` của UI component, không phải disposer của handler.

// ---------------------------------------------------------------------------
// 5) TEST — packages/coding-agent/test/extensions-disposer.test.ts (mới)
//
// Không mock.module() ở đâu cả. Hai surface độc lập, test riêng, vì đây là
// hai object khác nhau với hai Map handler khác nhau.
// ---------------------------------------------------------------------------

// --- Phía extension: `loadExtensionFromFactory` (loader.ts:464) nhận factory
// --- inline nên closure giữ được disposer. Không cần file tạm.
const extension = await loadExtensionFromFactory(
	async (api) => {
		disposeA = api.on("session_start", handlerA);
		disposeB = api.on("session_start", handlerB);
		disposeC = api.on("session_start", handlerC);
	},
	cwd,
	new EventBus(),
	new ExtensionRuntime(),
	"w1-probe",
);
expect(extension.handlers.get("session_start")).toHaveLength(3);

disposeA();
expect(extension.handlers.get("session_start")).toHaveLength(2);

// dispose handler giữa, rồi dispose LẠI NỮA, phải không đụng C
// (C đã trượt vào ô mà B đang nằm)
disposeB();
expect(extension.handlers.get("session_start")).toEqual([handlerA, handlerC]);
disposeB(); // lần hai: no-op
expect(extension.handlers.get("session_start")).toEqual([handlerA, handlerC]);

disposeA();
disposeC();
expect(extension.handlers.has("session_start")).toBe(false); // key ĐÃ BỊ XOÁ

// --- Phía hook: `loadHooks` (hooks/loader.ts:191) dynamic-import một file thật,
// --- nên module hook tạm trả disposer về qua globalThis — đúng mẫu bàn giao
// --- đã dùng bởi extension-prepared-rebind.test.ts:46
const hookSource = `
	export default async function (api) {
		globalThis.__w1 = {
			a: api.on("tool_call", async () => { globalThis.__w1Hits.push("a"); }),
			b: api.on("tool_call", async () => { globalThis.__w1Hits.push("b"); }),
		};
	}
`;
await Bun.write(hookPath, hookSource);
const { hooks, errors } = await loadHooks([hookPath], cwd);
expect(errors).toHaveLength(0);
const { a, b } = Reflect.get(globalThis, "__w1") as { a: () => void; b: () => void };
const map = hooks[0]!.handlers;
a();
expect(map.get("tool_call")).toHaveLength(1);
b();
expect(map.has("tool_call")).toBe(false);
Reflect.deleteProperty(globalThis, "__w1");
Reflect.deleteProperty(globalThis, "__w1Hits");

// --- Caller JS bỏ qua giá trị trả về thì không bị ảnh hưởng (test #4 của plan).
//     Một hook/extension .ts gọi `api.on(ev, h);` như một câu lệnh rồi đăng ký
//     thêm handler thứ hai chứng minh giá trị trả về mới là vô hại.
```

### Hợp đồng test

File: `packages/coding-agent/test/extensions-disposer.test.ts`.

**Tóm tắt hợp đồng:** Rút một đăng ký handler sẽ gỡ đúng handler đó, để các anh em vẫn được đăng ký và vẫn chạy, và không để lại key event rỗng nào. Dispose lặp lại là vô hại chứ không phải đuổi nhầm người kế bị trượt vào ô trống.

**Điều tiêu dùng thấy nếu hồi quy:** Nếu việc gỡ là `splice(indexOf(originalFn))` mù quáng, hoặc `splice(0, 1)` mù quáng, thì dispose handler A sẽ âm thầm huỷ đăng ký handler B. Vì mọi điểm dispatch đều guard bằng `handlers && handlers.length > 0` (`extensions/runner.ts:1163`, `hooks/runner.ts:173`) và `handlers.length === 0` (`hooks/runner.ts:286`), hậu quả **không phải crash** — mà là một handler đơn giản ngừng chạy, không có lỗi nào ở đâu cả. Đó là hợp đồng đáng bảo vệ. Nếu không xoá key Map ở lần gỡ cuối, tập key sẽ dài thêm một tên event cho mỗi lần đăng ký bị huỷ qua các lần reload extension — rò rỉ bộ nhớ chậm, cũng âm thầm. Nếu disposer phía hook không được nối vào, `off()` là `undefined` và caller ném `TypeError: off is not a function`.

Bốn case, mỗi case chạy riêng trên **cả hai** surface:

1. **Sibling sống sót sau một lần gỡ** — đăng ký ba handler cho một event, dispose handler ĐẦU, khẳng định danh sách còn lại đúng là `[B, C]` (length 2, và mảng sống sót chứa đúng các function identity gốc theo đúng thứ tự). Nếu hồi quy: một disposer splice nhầm phần tử sẽ âm thầm tắt một handler mà caller chưa hề huỷ đăng ký. Khẳng định trên **identity của function**, không phải trên số đếm — khẳng định chỉ đếm vẫn xanh với cả bug hoán đổi hai phần tử.
2. **Key Map bị xoá khi danh sách rỗng** — dispose handler cuối cùng và khẳng định `handlers.has(event) === false`, đọc **trực tiếp trên Map**, không kiểm qua dispatch. Nếu hồi quy: bản port chỉ-splice để lại một mảng rỗng dưới key. Điểm mấu chốt: không gì trong codebase duyệt các key của Map handler (đã kiểm chứng — mọi reader đều là `.get(eventType)` cộng một guard độ dài), nên mảng rỗng sót lại là vô hình về hành vi và một khẳng định dựa trên dispatch sẽ **xanh** trên cả bản cài đặt hỏng.
3. **Dispose hai lần là vô hại** — đăng ký A, B, C. Dispose B (handler Ở GIỮA) → danh sách là `[A, C]`. Dispose B lần nữa → danh sách **vẫn** `[A, C]` và dài 2. Nếu hồi quy: đây chính là cái bẫy lệch-neighbour mà toàn bộ work item sinh ra để chặn. Sau lần splice đầu, C đã trượt vào ô mà B đang chiếm. Một disposer khóa theo **chỉ số** bắt được thay vì khóa theo identity sẽ đuổi C ở lần gọi thứ hai — một handler mà caller chưa từng chạm tới biến mất, và danh sách handler cứ thu nhỏ mỗi lần thử lại. `indexOf` theo identity + `return` sớm khi `=== -1` chính là thứ làm lần gọi thứ hai thành no-op.
4. **Caller bỏ qua giá trị trả về thì không bị ảnh hưởng** — trong một module hook tạm / factory extension inline, gọi `api.on(event, h)` như một câu lệnh trần (bỏ giá trị trả về) rồi đăng ký thêm handler thứ hai cho cùng event; khẳng định danh sách có cả hai handler đúng thứ tự và `handlers.has(event)` là `true`. Nếu hồi quy: kiểu trả về của một extension/hook API công khai đổi từ `void` sang `() => void`. Các module extension và hook ngoài đời bỏ qua giá trị đó; nếu refactor vô tình đổi đường đăng ký (push hai lần, return sớm, đảo thứ tự) thì các caller đó sẽ hỏng mà **không có lỗi biên dịch nào**, vì một giá trị trả về bị bỏ thì type-check kiểu nào cũng qua.

**Bị cấm trong test này:** `mock.module()` — nó mutate global module registry và rò sang các file khác (Bun #12823); dùng các entry point loader đã export, không cái nào cần nó. Source-grep `loader.ts` để khẳng định disposer tồn tại — hãy khẳng định trên Map và closure trả về. `not.toThrow()` trần hoặc check "không rỗng" — chúng không phân biệt được bản cài đặt đã sửa với bản hỏng. Mọi mutation `globalThis` lâu dài — mọi key `globalThis` mà test stash vào phải bị xoá trong `afterEach`.

### Xác minh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types   # 0 lỗi MỚI (1 lỗi có sẵn trong test/collab/w3-probe.test.ts chưa track là điều được phép)
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build   # một lần — thiếu nó bun test sẽ 0-pass
cd /Users/tranquangdang21/Projects/ultraworkers && bun test packages/coding-agent/test/extensions-disposer.test.ts   # phải > 0 pass, KHÔNG phải 0 pass / lỗi addon
cd /Users/tranquangdang21/Projects/ultraworkers && bun test packages/coding-agent/test/extensions-runner.test.ts packages/coding-agent/test/extensions-discovery.test.ts packages/coding-agent/test/plugin-extensions-discovery.test.ts   # không hồi quy
```

**Không dùng làm cổng:** `bun check` — nó là `check:ts` + `check:rs`; nửa Rust cần cargo toolchain và mất nhiều phút. `check:types` bên trong `packages/coding-agent` là cổng nhanh và đủ cho một thay đổi nhỏ chủ yếu là kiểu. Dự án cấm gọi trực tiếp trình biên dịch TypeScript — cổng chỉ có `check:types`.

**Kiểm tra diff sau khi làm:**
- `git diff --stat` phải cho thấy 41 dòng đổi trong `extensions/types.ts` và 24 trong `hooks/types.ts` (cộng reflow của formatter). Nếu file ext nhiều hơn nhiều, đã lỡ đụng `): void;` của method không phải `on`.
- `git status` phải vẫn hiện `packages/coding-agent/src/collab/crypto.ts` là modified và `packages/coding-agent/test/collab/w3-probe.test.ts` là untracked. Không cái nào là việc của W1 — **không** revert cái trước (đó là decode guard của W3 đang dở), và **không** commit cái nào dưới nhãn W1.

### Cổng hoàn thành

Ba khẳng định, cả ba đều đỏ trên HEAD hiện tại: (a) `bun test packages/coding-agent/test/extensions-disposer.test.ts` báo **≥ 4 test pass, 0 fail**; (b) case 3 cho thấy dispose hai lần vào handler ở giữa để lại danh sách dài 2; (c) case 2 cho thấy `handlers.has(event) === false` trên **cả hai** surface sau lần dispose cuối. Thêm `bun run check:types` trong `packages/coding-agent` không sinh lỗi mới.

**Cổng có thực sự đỏ được không:** Có. Cả ba file test và cả hai site cài đặt đều chưa tồn tại ở HEAD, nên trên code chưa sửa file test sẽ không tồn tại và không thể xanh; sau khi viết test mà chưa sửa loader thì `on` vẫn trả `undefined` và case gọi closure sẽ ném `TypeError` — đỏ thật, không phải đỏ giả. Điểm cần canh: **cổng type-check một mình không đỏ được cho nửa hooks** (xem mục *Cách sai dễ nhất*) — case 2 và case 3 mới là bằng chứng thật cho nửa đó, nên đừng để ai chạy `check:types` xanh rồi kết luận W1 xong.

### Phụ thuộc

- `depends_on`: không.
- `blocks`:
  - **W2** — helper drain theo thứ tự ngược và cô lập lỗi là mẫu cho hàng đợi teardown của W12, mà teardown chỉ có thể rút được disposer nếu disposer tồn tại.
  - **W8** — cache warmer đăng ký một disposer lúc teardown session; với kiểu trả về `void` của hôm nay nó không có gì để gọi và một request đang bay bị rò. Đây là phụ thuộc "phải có trước W8" mà plan nêu, và là lý do W1 đứng đầu Wave 1.

### Cách sai dễ nhất

**Tin `check:types` làm bằng chứng cho nửa hook.** Cast `} as HookAPI;` ở `hooks/loader.ts:128` là một **assertion**, không phải `implements`, nên nó quá dễ chấp nhận: theo quy tắc return-type-void của TypeScript, một hàm trả `() => void` vẫn gán được cho một chữ ký trả `void`, và phép so sánh cho `as` được thoả nếu **một** trong hai chiều đúng. Hệ quả: sửa `hooks/types.ts` mà quên `hooks/loader.ts` vẫn nhiều khả năng compile sạch và ship một disposer trả `undefined` lúc runtime — `off is not a function`. Nửa extension thì an toàn (`implements ExtensionAPI` ở dòng 179 là kiểm tra cứng). Chỉ có test runtime gọi thật closure trả về mới chứng minh được nửa hooks.

*(Kẻ gần thứ hai: tin cảnh báo "extensions wrap handlers" trong plan và viết disposer gỡ **wrapper** thay vì giá trị đã push. Cảnh báo đó sai cho codebase này — `extensions/loader.ts:212` là `list.push(handler)` và `hooks/loader.ts:97` là `handlers.get(event)!.push(handler)`, tức function của caller được lưu theo tham chiếu, không bọc. Đóng over `handler` rồi `indexOf(handler)` là **đúng**; port một bản gỡ-wrapper từ "tham chiếu" sẽ cho một no-op âm thầm vĩnh viễn.)*

### Cần người quyết

- **Helper đặt ở đâu?** `extensibility/utils.ts` (khuyến nghị — cả hai loader đã import từ đó) hay inline hai lần? Quy tắc cấm trùng lặp trong `AGENTS.md` nghiêng về helper dùng chung, nhưng một reviewer thích diff tối thiểu 4 file có thể bảo inline. **Đây là lựa chọn thiết kế thật duy nhất trong item**, và nó chặn ngay dòng sửa đầu tiên.
- **`HandlerFn` có cần export từ `extensibility/utils.ts` không, hay nên khai Map là `Map<string, (...args: unknown[]) => Promise<unknown>>` inline?** `HandlerFn` hiện là alias riêng lặp ở `extensions/loader.ts:61`, `extensions/types.ts:1696` và `hooks/loader.ts:21`. Gộp lại thì hấp dẫn nhưng là refactor rộng hơn W1 nên gánh. Câu này chặn việc viết dòng chữ ký đầu tiên của helper.
- **File untracked `packages/coding-agent/test/collab/w3-probe.test.ts` (1 lỗi kiểu) sẽ bị xoá, commit, hay để lại cho bên W3?** Chừng nào chưa xử lý, `bun run check:ts` cho cả repo vĩnh viễn đỏ, và cổng type-check sạch duy nhất của repo này là phạm vi package.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Hình dạng tham chiếu là loader của pi, 16 dòng, tại `pi-ref/.../extensions/loader.ts:256-271`. | **UNVERIFIABLE — path không tồn tại** | Không có thư mục `pi-ref` nào trong repo này (`find . -maxdepth 3 -name pi-ref -type d` trả về rỗng; không có `pi-ref` ở top level). Repo là một bản publish squash một commit duy nhất (`ecd516f feat: initial publish — oh-my-pi 18.3.3`) nên cũng không có history để khôi phục. Đừng đi tìm file đó và đừng dành thời gian để khớp với nó. `code_shape` trong đặc tả này viết theo code THẬT ở HEAD, và đó mới là chuẩn. |
| `packages/coding-agent/src/extensibility/extensions/types.ts` — `interface ToolDefinition` ở `:611`. | **STALE — sai dòng** | `ToolDefinition` ở dòng 636, không phải 611. Dòng 611 là `export interface ToolSessionEvent {`. Không cái nào cần sửa cho W1 (`ToolDefinition` là đăng ký tool, không phải event handler) nên anchor này vô hại — nhưng đừng để nó dẫn bạn sửa nhầm interface. Interface thật sự quan trọng là `export interface ExtensionAPI` ở dòng 1256. |
| Impl: object HookAPI tại `packages/coding-agent/src/extensibility/hooks/loader.ts:92-98` (`on(...): void`), cast `as HookAPI` ngay tại `:92`. | **SAI cả hai số** | Impl `on` ở dòng 93–98, không phải 92–98 (dòng 92 là `const api = {`). Quan trọng hơn: cast `} as HookAPI;` ở dòng **128**, không phải 92 — dòng 90–91 chỉ là comment hai dòng nhắc tới cast. Đi tìm dòng 92 để tìm cast sẽ ra đúng đầu object literal và có thể sửa nhầm. |
| Sai dễ nhất là splice handler GỐC thay vì wrapper thực sự đã push — "extensions wrap handlers, nên `indexOf(originalFn)` là -1". | **SAI SỰ THẬT với codebase này** | Không impl nào bọc cả. `extensions/loader.ts:212` là `list.push(handler)` và `hooks/loader.ts:97` là `handlers.get(event)!.push(handler)` — function của caller được lưu theo tham chiếu, không bọc. Constructor của class (`extensions/loader.ts:196-207`) rebind method prototype lên instance để callback tách rời an toàn nhưng không đụng identity handler, và không có Proxy nào trên API object ở đường đăng ký. Nên disposer đóng over `handler` rồi `indexOf(handler)` là **đúng**. Port disposer dạng gỡ-wrapper từ "tham chiếu" (không tồn tại) sẽ cho một no-op âm thầm vĩnh viễn — ngược hẳn với lỗi mà plan cảnh báo, và cảnh báo đó sẽ đẩy một kỹ sư cẩn thận đi thêm một lớp tra cứu thừa. |
| Vì có cast `as HookAPI`, cả hai impl buộc phải giữ kiểu tương thích chữ ký nếu không cast sẽ vỡ type-check. | **MỘT PHẦN SAI — đúng cho extensions, KHÔNG bảo đảm cho hooks** | Nửa extension CÓ bị ép: `class ConcreteExtensionAPI implements ExtensionAPI` (`extensions/loader.ts:179`) là kiểm tra cấu trúc cứng, nên đổi 41 overload mà không sửa method của class sẽ fail `bun check` loudly. Nửa hook KHÔNG được bảo đảm: một hàm trả `() => void` gán được cho chữ ký trả `void` (quy tắc return-type-void của TypeScript), và phép so sánh cho assertion `as` được thoả nếu **một** trong hai chiều đúng — nên một thay đổi chỉ trong `hooks/types.ts` nhiều khả năng vẫn compile và ship một disposer trả `undefined` lúc runtime. Hệ quả cho đặc tả này: chứng minh disposer phía hook bằng test runtime, đừng bằng type checker. Đừng để "`bun check` xanh" trở thành bằng chứng cho nửa đó. |
| Xác minh: `bun check && bun test packages/coding-agent/test/extensions-disposer.test.ts`. | **KHÔNG CHẠY ĐƯỢC như viết trong repo này** | Ba vướng riêng. (1) `bun check` là `check:ts` + `check:rs`; nửa Rust cần cargo toolchain và rất chậm — dùng `cd packages/coding-agent && bun run check:types`. (2) `bun test` hiện báo 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64` — addon chưa build. Build trước bằng `bun --cwd=packages/natives run build`, nếu không một lần chạy xanh và một lần "test không hề chạy" là không phân biệt được. (3) `bun run check:ts` cho cả repo ĐÃ ĐỎ trên HEAD: đúng một lỗi, `test/collab/w3-probe.test.ts(76,15): error TS2352`. File đó **chưa track** (`git ls-files --error-unmatch` → "did not match any file(s) known to git") — một probe nghiên cứu W3 còn sót. Dời nó đi thì `bun run check:types` trong `packages/coding-agent` là xanh. Cổng của bạn là "không lỗi mới". |
| Cây làm việc ở nhánh `milestone-1` sạch đủ để xây trên đó. | **SAI — cây bẩn, và đó là việc của W3 không phải W1** | `packages/coding-agent/src/collab/crypto.ts` đang modified và **chưa commit** (+42/-1): thêm bảng `FRAME_REQUIRED_FIELDS` và decode guard `assertCollabFrame` — đó là W3 ("một cast mù `as CollabFrame` tại `crypto.ts:57`"), đã xây dở một nửa bởi một probe trước đó. Nó type-check sạch nên không chặn W1, nhưng: đừng revert, và đừng để nó cưỡi vào một commit W1. Cũng cảnh báo — một `git diff` lúc đầu W1 sẽ hiện 43 dòng đổi của `crypto.ts` không phải của bạn. |
| Việc xoá key Map là nửa "bản port chỉ-splice bỏ sót", và thiếu nó "là rò rỉ chậm mỗi lần reload extension". | **ĐÚNG nhưng yếu hơn đã nêu — đó là tuyên bố về bộ nhớ, và điều đó đổi cách viết test** | Rò rỉ là thật, nhưng không consumer nào quan sát được, nghĩa là một test dựa trên dispatch cho nửa này chứng minh không điều gì. Đã kiểm chứng: mọi reader của Map handler đều là `.get(eventType)` rồi guard độ dài — `extensions/runner.ts:1163` (`handlers && handlers.length > 0`), `hooks/runner.ts:173` (giống), `hooks/runner.ts:286` (`if (!handlers || handlers.length === 0) continue`), và tương tự ở 285/333/365/402 và `extensions/runner.ts:1476/1488/1534/1596`. Không gì ở đâu duyệt các key của Map handler. Nên một mảng rỗng để lại dưới key là vô hình về hành vi. Case 2 của bộ test **phải** khẳng định `handlers.has(event) === false` trực tiếp trên object Map. Viết nó thành "event không còn dispatch" sẽ xanh trên cả bản cài đặt hỏng và tạo cảm giác an toàn giả. |
| Chỉ có hai file production cài đặt các API này. | **XÁC NHẬN — và các stub trong test là an toàn** | Grep toàn repo: các cài đặt production duy nhất là `ConcreteExtensionAPI` (`extensions/loader.ts:179`, `implements` cứng) và object literal của hook (`hooks/loader.ts:128`, `as HookAPI`). Sáu file test dựng stub một phần qua `as unknown as ExtensionAPI` (`autoresearch-tools.test.ts:70`, `autoresearch-git.test.ts:40`, `autoresearch-state.test.ts:474` và `:620`, `autoresearch-before-*-start.test.ts:43`, `modes/warp-events.test.ts:47`) — một double assertion nên không có kiểm tra tương thích nào bắn vào, chúng không cần sửa. Biết để không đi săn implementer thứ năm là đủ. |


---


## W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi

**Thay đổi gì:** Thêm một helper dùng chung `drainDisposers` chạy các callback teardown theo thứ tự đăng ký ngược (đăng sau chạy trước), không dừng khi một callback ném lỗi (ghi log thay vì ném lại), và lặp lại cho tới khi danh sách rỗng — rồi đưa cả bốn vòng drain hiện có đi qua nó. **Wave:** Wave 1 — Lifecycle foundation (W1, W2, W3, W5). **Effort:** S — một helper ~15 dòng, bốn call-site đổi một dòng, ba dòng import, một file test ~70 dòng, một dòng changelog.

**Người dùng thấy:** Không thấy trực tiếp — hardening nội bộ. Một callback teardown của extension ném lỗi (hoặc một unsubscribe cài đặt ném lỗi trong lúc reload config) không còn làm hỏng phần còn lại của quy trình tắt session, nên `Ctrl-C` / `/exit` không còn có nguy cơ rò một lần lưu draft, các job bash nền, hay event `session_shutdown` của extension. Manifest trong `~/.omp/logs/omp.YYYY-MM-DD.log` có thêm một dòng warn `Disposer threw during drain` mà trước đây một báo cáo crash sẽ không mang theo.

### File cần chạm tới

| Path | Hành động | Thay đổi | Đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/utils/disposers.ts` | tạo | Module mới export `drainDisposers(list: Array<() => void>): void` — dựa trên `pop`, drain tới rỗng, try/catch từng disposer, `logger.warn` khi ném, không bao giờ ném lại. Import `logger` từ `@oh-my-pi/pi-utils`. | Có. `ls packages/coding-agent/src/utils/disposers.ts` → No such file; không tồn tại drain helper nào sẵn có trong cây. `packages/coding-agent/src/utils/` không có barrel `index.ts`, nên import bằng đường dẫn tương đối trực tiếp, giống mọi util khác. |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | Dòng 4983 (trong `beginDispose()`, mở tại 4981): `for (const dispose of this.#disposers.splice(0)) dispose();` → `drainDisposers(this.#disposers);`. Dòng 5218 (pass thứ hai trong `dispose()`): thay thế tương tự. Thêm `import { drainDisposers } from "../utils/disposers";` vào khối import `../utils/*` sẵn có (dòng 250-255). | Có. Cả hai dòng xác nhận giống hệt nhau byte qua `sed -n '4983p'` và `sed -n '5218p'`. Field `#disposers: Array<() => void> = []` khai báo tại dòng 719, chỉ được push bởi `addDisposer()` ở dòng 2179. |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | Dòng 1347 (toàn bộ thân của `disposeFileFallbacks()`): `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();` → `drainDisposers(this.#fileFallbackDisposers);`. Thêm `import { drainDisposers } from "../../utils/disposers";` vào khối import `../../` (dòng 21-30). | Có. Field `#fileFallbackDisposers: Array<() => void> = []` tại dòng 537, push ở dòng 777 và 796. |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts` | sửa | Dòng 112 (toàn bộ thân của `disposeComposerShapes()`): `for (const dispose of this.#composerShapeDisposers.splice(0)) dispose();` → `drainDisposers(this.#composerShapeDisposers);`. Thêm `import { drainDisposers } from "../../utils/disposers";` vào khối import `../../utils/*` (dòng 36-37). | Có. Field `#composerShapeDisposers: Array<() => void> = []` tại dòng 86, push ở dòng 105. |
| `packages/coding-agent/test/disposer-drain.test.ts` | tạo | File test mới, ba test: thứ tự ngược, cô lập lỗi + ghi nhận vào logger, và drain-tới-rỗng qua hai vòng. Import `drainDisposers` từ `@oh-my-pi/pi-coding-agent/utils/disposers` và `logger` từ `@oh-my-pi/pi-utils`; `vi.restoreAllMocks()` trong `afterEach`. | Có. Quy ước thư mục và đặt tên đã xác nhận: 791 file `*.test.ts` nằm trực tiếp trong `packages/coding-agent/test/`. Kiểu import đối chiếu với `agent-session-aside-delivery.test.ts:19` (`@oh-my-pi/pi-coding-agent/utils/event-bus`). Bản đồ `exports` của package có wildcard `./*` → `./src/*.ts` (package.json:53), nên subpath resolve được. |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` trong mục con `### Fixed` mới, ví dụ `- Fixed session teardown aborting early when a registered extension teardown callback throws.` | Có. `## [Unreleased]` tồn tại ở dòng 3 và hiện đang rỗng. Theo AGENTS.md chỉ ghi góc nhìn người dùng — không kể nguyên nhân gốc, không kể chi tiết triển khai. |

### Các bước

1. **Tạo `packages/coding-agent/src/utils/disposers.ts`** theo khối code bên dưới. Dùng `Array.prototype.pop()` trong vòng `while (list.length > 0)` chứ không phải `splice(0)` + duyệt ngược: `pop` cho thứ tự đăng-sau-chạy-trước một cách tự nhiên, mutate thẳng mảng của caller nên call-site hiện tại không cần gán lại, và drain tới rỗng mà không cần vòng retry bên ngoài — một disposer push thêm disposer mới giữa chừng sẽ được gọi ngay ở lần lặp kế tiếp. Bọc mỗi lời gọi trong try/catch và báo qua `logger.warn` với lỗi được stringify bằng `String(error)`, khớp với dạng `logger.warn("...", { error: String(err) })` dùng khắp `session-teardown.ts` và `agent-session.ts`. Hàm không được có bất kỳ đường đi nào ném lại.

2. **`packages/coding-agent/src/session/agent-session.ts:4983`** — thay dòng `for (const dispose of this.#disposers.splice(0)) dispose();` bằng `drainDisposers(this.#disposers);`. Đây là câu lệnh thứ hai của `beginDispose()` (hàm mở tại 4981), ngay sau `this.#isDisposed = true;` và trước `this.#modelDiscoveryAbortController.abort();`. Không đảo thứ tự bất cứ câu nào khác trong hàm đó — các câu lệnh xung quanh là một thứ tự cố ý của các guard teardown.

3. **`packages/coding-agent/src/session/agent-session.ts:5218`** — thay dòng giống hệt thứ hai `for (const dispose of this.#disposers.splice(0)) dispose();` bằng `drainDisposers(this.#disposers);`. Nó nằm ngay dưới comment `// beginDispose() drained the rest; this catches registrations made during teardown.` (dòng 5217) — giữ nguyên comment đó, nó là lý do pass này tồn tại. Đây chính là pass làm cho vòng drain-tới-rỗng trở nên quan sát được; một helper chỉ splice một lần sẽ biến dòng này thành code chết.

4. **`packages/coding-agent/src/extensibility/extensions/runner.ts:1347`** — thay `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();`, tức toàn bộ thân của `disposeFileFallbacks()`, bằng `drainDisposers(this.#fileFallbackDisposers);`. Giữ nguyên JSDoc sẵn có của hàm (nó giải thích lý do dùng registry phạm vi toàn tiến trình).

5. **`packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112`** — thay `for (const dispose of this.#composerShapeDisposers.splice(0)) dispose();`, tức toàn bộ thân của `disposeComposerShapes()`, bằng `drainDisposers(this.#composerShapeDisposers);`. KHÔNG đụng tới `#dialogQueue` (dòng 93) hay `#extensionTerminalInputUnsubscribers` (dòng 85) — xem mục Cần người quyết.

6. **Ba dòng import.** Thêm `import { drainDisposers } from "../utils/disposers";` vào khối import `../utils/*` của `agent-session.ts` (dòng 250-255, không đuôi `.js`). Trong `runner.ts` thêm `import { drainDisposers } from "../../utils/disposers";` vào khối `../../` (sau dòng 30, `../../tools/file-write-fallback`). Trong `extension-ui-controller.ts` thêm `import { drainDisposers } from "../../utils/disposers";` cạnh các import `../../utils/*` sẵn có ở dòng 36-37. Cả ba là import tĩnh top-level — không import động, theo AGENTS.md.

7. **`packages/coding-agent/test/disposer-drain.test.ts` (file mới)** — viết ba test theo Hợp đồng test bên dưới. Thứ tự đăng ký phải là A, B, C và khẳng định là thứ tự chạy ngược C, B, A — chính khẳng định mới là điểm, nên dựng danh sách lời gọi bằng cách push vào `calls: string[]` từ mỗi closure và assert `calls` deep-equals `["C", "B", "A"]`. Test cô lập lỗi phải đăng ký disposer ném lỗi SAU CÙNG (để theo thứ tự ngược nó chạy trước) và assert disposer đăng ký trước vẫn đã chạy — đó đúng là failure mode cần chặn. Test hai vòng phải có một disposer push một disposer mới vào cùng mảng khi nó chạy, rồi assert mảng RỐNG sau đó, chứ không chỉ assert vòng đầu đã chạy. Dùng `vi.spyOn(logger, "warn").mockImplementation(() => {})` và `vi.restoreAllMocks()` trong `afterEach` — không bao giờ dùng `mock.module()`, nó rò rỉ qua các file (bun#12823). Không source-grep file triển khai.

8. **`packages/coding-agent/CHANGELOG.md:3`** — thêm mục con `### Fixed` ngay dưới `## [Unreleased]` (dòng 3) với một dòng hướng tới người dùng. Không đụng tới mục `## [18.3.3]` — mục đã phát hành là bất biến.

9. **Xác minh.** Chạy `bun install` trước (checkout này không có `node_modules` — xem mục Đính chính), rồi `bun run check:ts`, rồi `bun test packages/coding-agent/test/disposer-drain.test.ts`. Nếu file test hóa ra cần native addon chưa build, đó là hồi quy so với kỳ vọng đã ghi trong mục Cần người quyết và phải được báo cáo chứ không được lách.

### Hình dạng code

```typescript
// packages/coding-agent/src/utils/disposers.ts
import { logger } from "@oh-my-pi/pi-utils";

/**
 * Run registered teardown callbacks last-registered-first, draining until the
 * list is empty.
 *
 * Three properties this helper exists to guarantee:
 *  - Reverse order: a disposer registered by B must observe B's teardown already
 *    done, the way stacked acquisition requires.
 *  - Error isolation: one throwing disposer never prevents the ones after it
 *    from running, and never propagates. `beginDispose()` is called by
 *    `createSessionTeardown` BEFORE the `try` that wraps `saveDraft`, so a
 *    throw here would reject teardown before the draft is written and before
 *    background jobs are released.
 *  - Drain to empty: a disposer may register another disposer while teardown is
 *    running (`AgentSession.dispose` runs a second pass for exactly that), so a
 *    single splice would silently drop the late registration.
 */
export function drainDisposers(list: Array<() => void>): void {
	while (list.length > 0) {
		const dispose = list.pop();
		if (!dispose) continue;
		try {
			dispose();
		} catch (error) {
			logger.warn("Disposer threw during drain; continuing", { error: String(error) });
		}
	}
}

// call sites — all four become a single call
// agent-session.ts:4983 (beginDispose)  ->  drainDisposers(this.#disposers);
// agent-session.ts:5218 (second pass)   ->  drainDisposers(this.#disposers);
// runner.ts:1347                        ->  drainDisposers(this.#fileFallbackDisposers);
// extension-ui-controller.ts:112        ->  drainDisposers(this.#composerShapeDisposers);
```

### Hợp đồng test

Hợp đồng là: "draining disposers chạy chúng theo thứ tự đăng-sau-trước, một disposer ném lỗi vừa không chặn những cái sau nó vừa không thoát ra ngoài drain, và một disposer được đăng ký trong lúc đang drain vẫn được chạy." Ba test, mỗi test một mệnh đề, tất cả assert trên một mảng `string[]` thứ tự chạy quan sát được hoặc trên việc `logger.warn` được gọi — không assert vào wiring bên trong.

1. **`runs disposers in reverse registration order`** — đăng ký A, B, C (theo thứ tư đó), drain, assert `calls` deep-equals `["C", "B", "A"]`. Nếu hồi quy, người dùng thấy: một drain theo thứ tự thuận sẽ để lại tài nguyên do A nắm giữ còn sống khi teardown của B chạy — đúng cái rò rỉ milestone này sinh ra để đóng. Đây là khẳng định dễ hỏng nhất ở lần thử đầu, vì code hiện tại là thứ tự thuận ở cả bốn call-site.

2. **`a throwing disposer does not stop later disposers and is logged`** — đăng ký một disposer không ném lỗi trước, rồi một disposer ném lỗi (để thứ tự ngược chạy cái ném lỗi trước), drain. Assert (a) disposer không ném lỗi vẫn đã chạy, (b) chính `drainDisposers` không ném, và (c) `logger.warn` được gọi đúng một lần. Nếu hồi quy, người dùng thấy: không có try/catch thì disposer ném lỗi huỷ vòng lặp và phần teardown listener đăng ký trước nó không bao giờ chạy, rò lại một settings watcher còn sống trên một session đã dispose; không có lời gọi logger thì lỗi im lặng và người dùng báo "omp treo khi thoát" với log trống.

3. **`drains disposers registered during the drain`** — một disposer push một disposer thứ hai vào cùng mảng khi nó chạy; drain; assert mảng RỖNG sau đó và disposer đến muộn đã chạy. Nếu hồi quy, người dùng thấy: một helper chỉ splice một lần để mảng còn phần tử và disposer đến muộn không bao giờ chạy — đúng thứ mà pass thứ hai tại `agent-session.ts:5217` sinh ra để bắt. Chỉ assert vòng đầu đã chạy sẽ để lọt bug đó.

Không phủ, và cố ý không phủ: văn bản đúng của lời gọi `logger.warn`, số vòng drain, và mọi khẳng định nào về bản thân `beginDispose()` / `disposeFileFallbacks()` / `disposeComposerShapes()` — đó là call-site, hợp đồng nằm ở helper.

File test: `packages/coding-agent/test/disposer-drain.test.ts`.

### Xác minh

```bash
bun install && bun run check:ts && bun test packages/coding-agent/test/disposer-drain.test.ts
```

Lệnh `grep` bổ sung thuộc về cổng hoàn thành, không viết vào file test:

```bash
git grep -n "for (const dispose of" -- packages/coding-agent/src
```

Phải trả về **không** kết quả nào.

### Cổng hoàn thành

Cả ba test trong `packages/coding-agent/test/disposer-drain.test.ts` đều pass, và `bun run check:ts` sạch. Cụ thể: (1) thứ tự chạy là `["C", "B", "A"]`; (2) disposer không ném lỗi đã chạy **và** `logger.warn` nổ đúng một lần **và** `drainDisposers` trả về bình thường; (3) mảng rỗng và disposer đến muộn đã chạy. Ngoài ra `grep` phải trả về **không** hit nào cho `for (const dispose of` trong `packages/coding-agent/src` — chứng minh cả bốn call-site đã đi qua helper và không còn drain thứ tự thuận thứ năm nào bị bỏ sót. (`grep` đó là kiểm tra tính đầy đủ của việc di dời, không phải một khẳng định test, và không được viết vào file test.)

**Cổng có đi được đỏ không:** Có, theo ba đường độc lập. Một bản triển khai thứ tự thuận làm test (1) hỏng trên phép so sánh deep-equal. Một bản triển khai chỉ splice một lần làm test (3) hỏng trên mảng còn phần tử. Một bản triển khai không có try/catch làm test (2) hỏng trên cả mảng thứ tự chạy lẫn việc chính `drainDisposers` ném. Một bản triển khai có ném lại (bản port `throw errors[0]` của chord) làm test (2) hỏng ngay lập tức. Không gì trong cổng này có thể pass với một bản no-op, vì mọi khẳng định đều đọc một mảng thứ tự chạy cụ thể hoặc một số lần gọi logger. Lưu ý: khả năng chạy được của cổng hiện phụ thuộc vào `bun install` — trước đó cả `bun test` lẫn `check:ts` đều không chạy được.

### Phụ thuộc

- `depends_on`: không — mục này không phụ thuộc mục nào khác.
- `blocks`: W8, W12.

### Cách sai dễ nhất

Sai dễ nhất là port hình dạng `throw errors[0]` / `AggregateError` của chord. Drain là một hợp đồng đồng bộ được gọi bởi `beginDispose()`, mà `session-teardown.ts:70` gọi TRƯỚC cái `try` bọc `await deps.saveDraft(draftText)`. Một drain ném lỗi sẽ từ chối promise teardown trước khi draft được ghi, biến một rò rỉ có điều kiện thành rò rỉ không điều kiện — đúng kết quả mà doc comment quanh nó nói thiết kế này tồn tại để ngăn. Sai thứ hai là bản triển khai splice-một-lần, âm thầm vứt bỏ các disposer được đăng ký trong lúc teardown đang chạy; `agent-session.ts:5217` ghi lại một pass drain thứ hai tồn tại chỉ để bắt đúng những đó.

### Cần người quyết

- **Có thể chặn phạm vi — cần người quyết trước khi chốt danh sách file.** Tồn tại một call-site drain thứ năm có hình dạng teardown mà "four drain points" của plan không phủ: `clearExtensionTerminalInputListeners()` tại `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:1222-1227` duyệt `#extensionTerminalInputUnsubscribers` (một `Set<() => void>`, khai báo dòng 85, thêm ở dòng 1203) rồi gọi `.clear()`. Nó có cùng khuyết điểm cô lập — một `unsubscribe` ném lỗi chặn phần còn lại — nhưng khác cấu trúc dữ liệu, nên `drainDisposers(list: Array<...>)` không vừa với nó như đang viết. Cần người quyết: đưa vào W2 (mở rộng helper để nhận `Set`, hoặc chuyển field thành Array), hay trì hoãn rõ ràng? Ghi chú blast-radius của chính plan lập luận nên trì hoãn, vì đây là listener input của TUI chứ không phải chuỗi teardown session.
- **Không chặn — cần một phán đoán, không cần dừng lại để hỏi.** Tự đăng ký lại: vòng `while (list.length > 0)` sẽ quay vô tận nếu một disposer tự push lại chính nó vô điều kiện. Không disposer nào hiện tại làm vậy (mọi lần push đều ở `agent-session.ts:2179`, `runner.ts:777` và `:796`, `extension-ui-controller.ts:105`, và không cái nào tự tham chiếu), nên vòng lặp hiện có chặn trên. Nên thêm một trần lặp phòng thủ, hay để một vòng lặp không chặn trung thực bộc lộ một disposer bệnh lý là failure mode tốt hơn? Đây là phán đoán, không phải lỗi.
- **Không chặn, nhưng phải báo cáo chứ không lách.** File test này có cần native addon không? Test chỉ import `drainDisposers` và `logger` — không cái nào kéo theo `pi_natives` — nên KỲ VỌNG là chạy được ngay khi `bun install` xong, khác với phần còn lại của suite. Điều này chưa được xác nhận vì node_modules vắng mặt ở đây. Nếu nó hóa ra cần addon, W2 mất cổng duy nhất luôn chạy được và cần một cổng khác; hãy báo cáo thay vì tự lách.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Các drain site nằm ở `agent-session.ts:4953` và `:5188`; `runner.ts:1333`; `extension-ui-controller.ts:103`. | anchor cũ — cả bốn đều sai | Anchor thật: `packages/coding-agent/src/session/agent-session.ts:4983` (trong `beginDispose()`), `packages/coding-agent/src/session/agent-session.ts:5218` (pass thứ hai trong `dispose()`), `packages/coding-agent/src/extensibility/extensions/runner.ts:1347` (trong `disposeFileFallbacks()`), `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112` (trong `disposeComposerShapes()`). Lệch lần lượt +30, +30, +14 và +9. |
| Lấy hình dạng thứ tự ngược + try/catch mỗi hiệu ứng + log từ `pi-ref/packages/chord/src/facets/host.ts:125-142`. | không kiểm chứng được — tham chiếu không tồn tại trong repo này | Đừng cố đọc chord. Cài theo hợp đồng trong spec này và theo tiền lệ cô lập lỗi sẵn có trong repo — bằng chứng đó mạnh hơn: try/catch + `logger.warn` + continue đã dùng ở `agent-session.ts:5183-5186` (`releaseSharpshooterSession`) và trong `session-teardown.ts:72-75` (saveDraft). Bỏ trích dẫn chord không làm mất chi tiết hành vi nào. |
| Hai registrant hiện tại (`main.ts:1050`, `config/registry.ts:323`) đều là `Set.delete` và không thể ném lỗi. | sai một nửa — một anchor lệch một dòng, và mô tả `Set.delete` không chính xác | `session.addDisposer(stop)` nằm ở `packages/coding-agent/src/main.ts:1051`, không phải 1050. Không registrant nào là `Set.delete`: `main.ts:1051` truyền closure `stop` trả về từ `cfgScopedModelInputs.listen(...)`, và `config/registry.ts:323` truyền một closure `unsubscribe` dạng `() => { active = false; stop(); }` (định nghĩa ở dòng 319-322). Cả hai là stop của settings-listener, không phải xoá Set. KẾT LUẬN của plan (blast radius thấp, registrant hiện tại khó ném lỗi) vẫn đúng và đáng giữ trong phần cân nhắc changelog, nhưng đừng lặp lại claim `Set.delete`. `config/registry.ts:323` thì đã đúng. |
| `session-teardown.ts:70` gọi `deps.beginDispose()` trước cái `try` bọc `await deps.saveDraft(draftText)`, và doc comment nói thất bại của saveDraft không bao giờ huỷ chuỗi disposal. | ĐÃ KIỂM CHỨNG — đây là lý do nặng nhất cho việc không bao giờ ném lỗi | Giữ nguyên lập luận này trong doc comment của helper; nó là lý do drain không được ném lại, và không thể suy ra từ helper một mình. `sed -n '70p' packages/coding-agent/src/modes/session-teardown.ts` → `deps.beginDispose();`; `try {` nằm ở dòng 71 và doc comment ở dòng 62-64. |
| Pass drain thứ hai tại `agent-session.ts:5187-5188` là cái bẫy làm cho drain-tới-rỗng trở nên bắt buộc. | ĐÃ KIỂM CHỨNG (số dòng lệch 30) | Pass nằm ở `agent-session.ts:5217-5218`. Comment ở 5217 là `// beginDispose() drained the rest; this catches registrations made during teardown.` — trích nguyên văn nó vào lý do của test thứ ba để test đó hiển nhiên không phải chuyện giả định. |
| Môi trường: `bun run check:ts` chạy được vì không cần native addon; chỉ `bun test` bị chặn. | SAI cho checkout này — cả hai cổng đều bị chặn | `node_modules` không tồn tại, nên CẢ HAI lệnh đều hỏng trước khi tới bất kỳ mã addon nào. `bun test packages/coding-agent/test/agent-session-dispose-concurrent.test.ts` → `0 pass, 1 fail`, `Cannot find module '@oh-my-pi/pi-agent-core'`. `bun run check:ts` → `oxlint: command not found`, exit 127. `bun install` là điều kiện tiên quyết cho mọi bước xác minh và phải là thứ đầu tiên kỹ sư chạy. Điều này không đổi spec, chỉ đổi thứ tự thiết lập. |
| Có đúng bốn drain point của disposer. | đúng cho bốn điểm đó, nhưng chưa đầy đủ cho cả codebase | Bốn điểm là toàn bộ các drain của disposer — `git grep -n "for (const dispose of"` trên `packages/coding-agent/src` trả về đúng bốn hit và không có cái nào khác. Nhưng hai cấu trúc liền kề trông giống và KHÔNG được quét vào: `#dialogQueue` (`Array<() => void>`, dòng 93) được drain FIFO bằng `.shift()` ở dòng 1340 và là hàng đợi trình diễn dialog, không phải teardown; còn `#extensionTerminalInputUnsubscribers` (`Set<() => void>`, dòng 85) được drain ở 1223-1227 và là teardown thật, cùng khuyết điểm cô lập nhưng khác cấu trúc. Xem mục Cần người quyết về quyết định phạm vi cho cái sau. |


---


## W3. Runtime type guard tại biên giải mã của collab frame

**Thay đổi gì:** Thay ép kiểu mù `as CollabFrame` ở cuối `open()` bằng một kiểm tra field bắt buộc cho từng variant, để khung hỏng về cấu trúc bị loại ngay tại biên giải mã thay vì nổi thành `TypeError` vô nghĩa vài lời gọi sau đó.
**Wave:** Wave 1 — Lifecycle foundation (W1, W2, W3, W5). Đầu tiên trong chuỗi, không có cổng nào chắn trước.
**Effort:** S. ~50 dòng thêm vào `crypto.ts` (một map 18 hàng + một hàm ~20 dòng, trên file 67 dòng) và ~75 dòng thêm vào file test sẵn có; bản thân thay đổi production chỉ là một dòng tại `crypto.ts:57`.

**Người dùng thấy:** nội bộ, người dùng không thấy. Một khung collab hỏng hoặc bị can thiệp nay bị drop ngay tại biên giải mã, kèm lý do có tên trong debug log, thay vì được chuyển tay cho frame handler như một giá trị được đóng dấu kiểu hợp lệ. Khác biệt duy nhất người dùng quan sát được nằm ở dòng `collab: ignoring undecryptable guest frame` trong `~/.omp/logs/omp.<date>.log`.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/collab/crypto.ts` | sửa | Thêm `FRAME_REQUIRED_FIELDS` (module-private), alias nới rộng `FRAME_REQUIRED_LOOKUP`, và hàm `assertCollabFrame(value: unknown): CollabFrame`. Đổi dòng 57 từ `return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;` thành `return assertCollabFrame(JSON.parse(TEXT_DECODER.decode(plaintext)));`. Hàm **không** export — test chỉ đi tới được nó qua `open()`. | Có — `verified: true`. Dòng 57 xác nhận bằng `grep -n 'as CollabFrame' packages/coding-agent/src/collab/crypto.ts`. File dài 67 dòng, thay đổi đưa lên ~100. Đây là `as CollabFrame` production duy nhất trong repo (`git grep -n 'as CollabFrame' -- packages/` trả về đúng dòng này cộng 8 hit trong test). |
| `packages/coding-agent/test/collab/crypto.test.ts` | sửa | Thêm `sealSerialized` vào import crypto, `COLLAB_PROTO` vào import protocol, thêm 3 import type-only. Chèn thêm fixture + bảng `VARIANTS: CollabFrame[]` 18 phần tử và khối `describe("collab frame decode guard")` gồm 4 test, ngay sau khối `describe("collab crypto")` kết thúc ở dòng 41. | Có — `verified: true`. File tồn tại, 270 dòng, 11 KB, 29 test, hiện 29 pass / 0 fail. Import dùng alias `@oh-my-pi/pi-coding-agent/...` (dòng 2-19) — theo đúng dạng đó, đừng đổi sang dạng tương đối `../../src/collab/crypto` mà một số file test anh em dùng. |
| `packages/coding-agent/CHANGELOG.md` | sửa | Thêm một dòng dưới `## [Unreleased]` → `### Fixed`. | Chưa — file này không nằm trong `files_touched` của spec, không có neo nào được kiểm chứng. |

### Các bước

1. Mở `packages/coding-agent/src/collab/crypto.ts`. Ngay **trên** doc comment `/** Inverse of {@link seal}. Throws on auth failure or malformed input. */` (hiện ở `packages/coding-agent/src/collab/crypto.ts:49`), chèn const `FRAME_REQUIRED_FIELDS`, alias nới rộng `FRAME_REQUIRED_LOOKUP`, và hàm `assertCollabFrame` — nguyên văn theo khối `code_shape` bên dưới. Giữ nguyên JSDoc của `open()`: câu `Throws on auth failure or malformed input` vẫn đúng sau thay đổi này, nên không cần sửa.
2. Kiểm chứng chú thích `Record<CollabFrame["t"], readonly string[]>` liệt kê đủ cả 18 variant — nó liệt kê đủ, và **đừng** sửa tay nếu tsgo phàn nàn; chính chú thích này là cơ chế exhaustive. Nếu trong lúc mở W3 bạn thêm một variant mới vào `CollabFrame` (`packages/coding-agent/src/collab/protocol.ts:54`), phải thêm hàng tương ứng ở đây, nếu không build đỏ với TS2741 — điều đó là cố ý.
3. Thay dòng 57 (`return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;`) bằng `return assertCollabFrame(JSON.parse(TEXT_DECODER.decode(plaintext)));`. Đây là toàn bộ phần sửa trong `open()`; không đụng tới kiểm tra độ dài, các lời gọi `asStrict`, hay lời gọi AES-GCM.
4. Thêm `sealSerialized` vào danh sách import crypto, `COLLAB_PROTO` vào danh sách import protocol trong file test (`packages/coding-agent/test/collab/crypto.test.ts:2`). Thêm ba import type-only: `import type { AgentSnapshot } from "@oh-my-pi/pi-wire";` và `import type { SessionEntry, SessionHeader } from "@oh-my-pi/pi-coding-agent/session/session-entries";`. Xác nhận đường dẫn `session/session-entries` resolve được — nó được import y hệt ở `packages/coding-agent/src/collab/protocol.ts:26`.
5. Chèn các const fixture cấp module (`header`, `entry`, `agent`, `state`) và bảng `VARIANTS: CollabFrame[]` 18 phần tử, rồi khối `describe("collab frame decode guard")` với 4 test, nguyên văn theo `code_shape`. Đặt sau dòng 41 (`packages/coding-agent/test/collab/crypto.test.ts:41` — dấu đóng của `describe("collab crypto")`) để các test seal/open sẵn có vẫn nằm trên đầu file.
6. Chạy `bun test packages/coding-agent/test/collab/crypto.test.ts` từ repo root. Kỳ vọng **33 pass / 0 fail** (29 sẵn có + 4 mới). Nếu test round-trip đỏ, guard đang quá chặt — kiểm lại xem có danh sách bắt buộc nào chứa field mà kiểu `CollabFrame` đánh dấu optional không (`writeToken`, `images`, `readOnly`, `value`, `text` trên `agent-cmd`, `error` trên `transcript`).
7. Chạy `cd packages/coding-agent && bun run check:types` (đây là `tsgo -p tsconfig.json --noEmit`, **không** phải tsc — dự án cấm tsc). Kỳ vọng exit 0. Sau đó từ repo root chạy `bun run check:tools` — oxlint cộng `oxfmt --check` trên `src` và `test` — và kỳ vọng cả hai sạch. Chạy `bun run fmt` nếu oxfmt báo code mới cần format lại.
8. Thêm một dòng dưới `## [Unreleased]` → `### Fixed` trong `packages/coding-agent/CHANGELOG.md`. Gợi ý: `Fixed malformed collab frames being accepted at the decode boundary instead of being rejected before the frame handler.` Chưa có link issue/PR — thêm attribution theo AGENTS.md khi đã có số PR.
9. **Không** commit. Quy tắc repo là "NEVER commit unless asked". Để cây làm việc bẩn để người vận hành review.

### Hình dạng code

```ts
// ── packages/coding-agent/src/collab/crypto.ts ──────────────────────────────────
// Insert directly above the `open()` doc comment (today line 49).

/**
 * Non-optional fields per {@link CollabFrame} variant, checked at the decode boundary.
 *
 * Required-field, NOT exact-shape: a peer that predates this build may add fields
 * we do not know yet, and a stricter check would reject it. The `Record<CollabFrame["t"], …>`
 * annotation is the exhaustiveness mechanism — adding a variant to `CollabFrame` without a
 * row here is a compile error, while an unknown tag at runtime still falls through.
 */
const FRAME_REQUIRED_FIELDS: Record<CollabFrame["t"], readonly string[]> = {
	hello: ["proto", "name"],
	prompt: ["text"],
	"ui-response": ["reqId"],
	abort: [],
	"agent-cmd": ["cmd", "agentId"],
	"fetch-transcript": ["reqId", "agentId", "fromByte"],
	welcome: ["proto", "header", "state", "agents", "entryCount"],
	"snapshot-chunk": ["entries", "final"],
	entry: ["entry"],
	event: ["event"],
	state: ["state"],
	bus: ["channel", "data"],
	agents: ["agents"],
	"ui-request": ["request"],
	"ui-request-end": ["reqId"],
	transcript: ["reqId", "text", "newSize"],
	bye: ["reason"],
	error: ["message"],
};

/** Widened view so an unrecognised tag can be looked up without a cast at the call site. */
const FRAME_REQUIRED_LOOKUP: Readonly<Record<string, readonly string[] | undefined>> = FRAME_REQUIRED_FIELDS;

function assertCollabFrame(value: unknown): CollabFrame {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("collab frame is not a JSON object");
	}
	const tag = (value as { t?: unknown }).t;
	if (typeof tag !== "string") {
		throw new Error(`collab frame has no string "t" discriminator (got ${typeof tag})`);
	}
	const required = FRAME_REQUIRED_LOOKUP[tag];
	// Tolerant default: a variant this build has never heard of passes through untouched,
	// matching the documented house style in packages/wire/src/index.ts:9-12.
	if (!required) return value as CollabFrame;
	for (const field of required) {
		if (!(field in value)) {
			throw new Error(`collab frame "${tag}" is missing required field "${field}"`);
		}
	}
	return value as CollabFrame;
}

// ── open(), line 57 only ──────────────────────────────────────────────────────
	return assertCollabFrame(JSON.parse(TEXT_DECODER.decode(plaintext)));
```

```ts
// ── packages/coding-agent/test/collab/crypto.test.ts ──────────────────────────
// Extra imports: `sealSerialized` (crypto), `COLLAB_PROTO` (protocol),
//   import type { AgentSnapshot } from "@oh-my-pi/pi-wire";
//   import type { SessionEntry, SessionHeader } from "@oh-my-pi/pi-coding-agent/session/session-entries";

const header: SessionHeader = { type: "session", id: "s1", timestamp: "2026-09-08T00:00:00Z", cwd: "/tmp" };
const entry: SessionEntry = {
	type: "message",
	id: "e1",
	parentId: null,
	timestamp: "2026-09-08T00:00:00Z",
	message: { role: "user", content: "hi", timestamp: 0 },
};
const agent: AgentSnapshot = {
	id: "a1",
	displayName: "Main",
	kind: "main",
	status: "running",
	hasSessionFile: true,
	createdAt: 1,
	lastActivity: 2,
};
const state = {
	isStreaming: false,
	queuedMessageCount: 0,
	sessionName: "host",
	cwd: "/tmp",
	participants: [{ name: "Host", role: "host" as const }],
};

/** One fixture per `CollabFrame` variant. Adding a variant without a row here is a compile error. */
const VARIANTS: CollabFrame[] = [
	{ t: "hello", proto: COLLAB_PROTO, name: "guest" },
	{ t: "prompt", text: "hello" },
	{ t: "ui-response", reqId: 1, value: "ok" },
	{ t: "abort" },
	{ t: "agent-cmd", cmd: "chat", agentId: "a1", text: "go" },
	{ t: "fetch-transcript", reqId: 2, agentId: "a1", fromByte: 0 },
	{ t: "welcome", proto: COLLAB_PROTO, header, state, agents: [agent], entryCount: 1 },
	{ t: "snapshot-chunk", entries: [entry], final: true },
	{ t: "entry", entry },
	{ t: "event", event: { type: "model_changed" } },
	{ t: "state", state },
	{ t: "bus", channel: "task:subagent:lifecycle", data: { id: "a1", agent: "task", status: "started", index: 0 } },
	{ t: "agents", agents: [agent] },
	{ t: "ui-request", request: { kind: "editor", title: "Edit", reqId: 3 } },
	{ t: "ui-request-end", reqId: 3 },
	{ t: "transcript", reqId: 4, text: "{}", newSize: 10 },
	{ t: "bye", reason: "host done" },
	{ t: "error", message: "boom" },
];

describe("collab frame decode guard", () => {
	it("round-trips a well-formed frame of every CollabFrame variant", async () => {
		const key = await importRoomKey(generateRoomKey());
		for (const frame of VARIANTS) {
			expect(await open(key, await seal(key, frame))).toEqual(frame);
		}
	});

	it("rejects a decoded frame missing a required field at the guard", async () => {
		const key = await importRoomKey(generateRoomKey());
		const sealed = await sealSerialized(key, JSON.stringify({ t: "hello", proto: COLLAB_PROTO }));
		await expect(open(key, sealed)).rejects.toThrow(/missing required field "name"/);
	});

	it("rejects a payload whose discriminator is not a string", async () => {
		const key = await importRoomKey(generateRoomKey());
		for (const raw of ["{}", "[]", "null", "7", '"str"', JSON.stringify({ t: 42 })]) {
			await expect(open(key, await sealSerialized(key, raw))).rejects.toThrow();
		}
	});

	it("accepts a variant this build does not know", async () => {
		const key = await importRoomKey(generateRoomKey());
		const raw = { t: "future-thing", payload: { anything: true } };
		const opened: unknown = await open(key, await sealSerialized(key, JSON.stringify(raw)));
		expect(opened).toEqual(raw);
	});
});
```

Hai lưu ý khi viết code tốn mất một giờ nếu bỏ sót:

1. `await expect(...).rejects` — ba test sẵn có ở dòng 33/39 **không** await, tức là assertion trôi lơ lửng. Đừng sao chép mẫu đó vào test mới.
2. `const opened: unknown = …` — không có chú thích `: unknown` thì test cuối **không compile**: bun định kiểu `toEqual` là `toEqual(expected: T)` với T suy ra từ actual, nên một object variant-lạ không gán được cho kiểu trả về `CollabFrame`. Ép trực tiếp `as CollabFrame` cũng bị từ chối (TS2352, không overlap); `as unknown as CollabFrame` compile được nhưng là double assertion. Local kiểu `: unknown` là cách sạch.

### Hợp đồng test

Hợp đồng quan sát được: một khung collab mà payload JSON mâu thuẫn với chính variant của nó bị từ chối ngay tại biên giải mã, bằng một lỗi có message nêu tên variant và field thiếu — chứ không bị chuyển cho frame handler như một giá trị mang kiểu `CollabFrame` nhưng thiếu field mà mọi bên tiêu thụ của variant đó đều đọc. Người tiêu thụ hợp đồng này quan sát ba điều:

1. Cả 18 variant `CollabFrame` đã khai báo đều sống sót vòng tròn `seal`/`open` nguyên vẹn, nên guard không bao giờ trở thành hồi quy ngược tương thích.
2. Payload thiếu field bắt buộc, hoặc có `t` vắng mặt / không phải chuỗi, bị reject ngay tại `open()` — trước đây những payload đó resolve thành công rồi nổ muộn thành một `TypeError` không liên quan bên trong `CollabHost`/`CollabGuestLink`.
3. Payload mang tag variant mà build này chưa từng thấy vẫn mở thành công, nên peer cũ hơn hoặc mới hơn không bị từ chối.

Nếu hồi quy: guard lùi về kiểm tra exact-shape thì test 1 đỏ; mất nhánh tolerant default thì test 4 đỏ; xoá hẳn guard thì test 2 và 3 đỏ.

**File test:** `packages/coding-agent/test/collab/crypto.test.ts` — khối `describe("collab frame decode guard")`, 4 test, đặt sau dòng 41.

### Xác minh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun test packages/coding-agent/test/collab/crypto.test.ts   # expect 33 pass / 0 fail (29 existing + 4 new)
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types   # tsgo -p tsconfig.json --noEmit, expect exit 0
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:tools   # oxlint + oxfmt --check, expect clean
```

### Cổng hoàn thành

Cả ba lệnh trên đều pass. Cụ thể: (a) `bun test packages/coding-agent/test/collab/crypto.test.ts` báo **33 pass / 0 fail**; (b) `cd packages/coding-agent && bun run check:types` exit 0 — điều này nói riêng là chú thích `Record<CollabFrame["t"], readonly string[]>` đã đầy đủ, vì thiếu một hàng variant là TS2741; (c) `bun run check:tools` (oxlint + oxfmt --check) sạch.

Cổng này **đi được** cả chiều đỏ, và điều đó đã được chứng minh bằng mutation trên một bản sao scratch của nhánh: revert `crypto.ts` về ép kiểu mù gốc làm hai test reject đỏ (2 pass / 2 fail); bỏ nhánh tolerant `if (!required) return` làm test variant-lạ đỏ; thêm một field optional (`error` trên `transcript`, `readOnly` trên `welcome`) vào danh sách bắt buộc làm test round-trip đỏ. Cả ba mutation đều bị bắt.

### Phụ thuộc

- `depends_on`: không.
- `blocks`:
  - W8 (Wave 3a) — plan yêu cầu toàn bộ công việc biên giới collab phải land trong một lượt review.
  - Bất kỳ công việc nào sau này thêm variant `CollabFrame`: chú thích `Record<CollabFrame["t"], …>` biến một hàng guard bị quên thành lỗi compile — đây là ràng buộc có chủ đích.

### Cách sai dễ nhất

Sai lầm đắt nhất không phải là viết sai guard, mà là **siết quá tay**. `open()` có đúng một caller production — `packages/coding-agent/src/collab/relay-client.ts:578` — và catch của nó rẽ theo vai trò: ở host nó log rồi drop khung (`packages/coding-agent/src/collab/relay-client.ts:582`), nhưng ở **guest** nó gọi `#failFatal("bad key or corrupted frame")` (`packages/coding-agent/src/collab/relay-client.ts:584`), hàm này đặt `#closed = true`, đóng socket, và bắn `onClose(reason, false)` không reconnect (`packages/coding-agent/src/collab/relay-client.ts:675-689`). Nghĩa là một guard chặt nhầm **không** chỉ mất một khung — nó xé sập vĩnh viễn phiên collab phía guest và bảo người dùng phải vào lại. Field dễ cắn nhất là `data` trên variant `bus`, kiểu `unknown`: nếu một call site `emitSubagentFrame(channel, payload)` nào đó trong tương lai truyền `undefined`, `JSON.stringify` sẽ bỏ key và **mọi** guest đang nối tới host đó chết. Spec liệt kê 6 call site emit hiện tại (`packages/coding-agent/src/task/executor.ts:1497`, `1597`, `2641`, `2947`, `3321`, `4065`) đều truyền object literal cụ thể, nên hôm nay đường đó chưa với tới — nhưng spec không kèm bằng chứng kiểm chứng cho danh sách neo này, nên nếu phải dựa vào nó thì hãy tự kiểm lại trước. Nếu một ngày đường đó trở nên với tới, hãy bỏ `"data"` khỏi hàng `bus` chứ đừng siết bất cứ thứ gì khác.

Cạm bẫy thứ hai về mặt cơ học: ba test sẵn có ở dòng 33/39 của file test không `await` `expect(...).rejects`, và test cuối (`accepts a variant this build does not know`) không có local `const opened: unknown` sẽ **không compile**. Cả hai đều là bẫy sao chép mẫu.

### Cần người quyết

Cả ba câu hỏi dưới đây đều **không chặn** việc bắt đầu — spec đã chốt sẵn một mặc định cho mỗi câu. Chúng ở đây để người đọc xác nhận, không phải để chờ:

- **`data` trên variant `bus` có nên nằm trong danh sách bắt buộc không?** Giữ thì khớp với kiểu `CollabFrame` và test "missing required field" bám sát hiện thực; bỏ thì an toàn hơn về mặt cấu trúc trước một emit `undefined` tương lai và không tốn gì quan sát được. **Mặc định: giữ** (kiểu hiện tại nói required và không call site nào vi phạm), chỉ xem lại nếu có call site `emitSubagentFrame` mới truyền được `undefined`.
- **Guard có nên export để tái dùng không?** **Không.** `sealSerialized` đã export sẵn và đủ để test dựng payload hỏng, còn giữ guard ở module-private nghĩa là test chỉ quan sát được nó qua `open()` — đúng cái hợp đồng mà W3 thực sự nói tới. Export sẽ thêm một bề mặt API không có bên tiêu thụ nào.
- **Guard thuộc biên giới `JSON.parse` trong `crypto.ts`, hay nâng lên một tầng ở `relay-client`?** **`crypto.ts`.** `crypto.ts` là module duy nhất biết cả khung ciphertext lẫn kiểu `CollabFrame`, và là chỗ duy nhất mọi khung đã giải mã đều đi qua (`git grep -n 'as CollabFrame' -- packages/` không tìm thấy site production nào khác).

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "Repo HEAD là 5873776 trên nhánh milestone-1." | stale | HEAD là `ecd516f` (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`) trên nhánh `milestone-1`. Mọi neo khác trong plan (`crypto.ts:57`, `packages/wire/src/index.ts`, danh sách file collab) vẫn resolve đúng, nên chỉ có SHA là cũ — đừng đi tìm một commit bị thiếu. Bằng chứng: `git rev-parse --short HEAD` → `ecd516f`; `git branch --show-current` → `milestone-1`. |
| "`#recvChain` có `.catch()` ở đuôi nên một lần ném chỉ mất một frame." | wrong | `.catch()` ở đuôi **không** phủ guard. `open()` được gọi bên trong try/catch riêng của nó (`packages/coding-agent/src/collab/relay-client.ts:577-586`); `.catch()` của chain ở `packages/coding-agent/src/collab/relay-client.ts:595-597` chỉ bắt lỗi do `onFrame?.()` ném ra ở dòng 594. Catch bên trong rẽ theo vai trò: host → `logger.debug` rồi drop (`packages/coding-agent/src/collab/relay-client.ts:582`); guest → `#failFatal("bad key or corrupted frame")` (`packages/coding-agent/src/collab/relay-client.ts:584`), và `#failFatal` đặt `#closed = true`, đóng socket, bỏ các gửi đang chờ, rồi gọi `onClose(reason, false)` với reconnect tắt. Vì vậy một lần từ chối sai của guard giết luôn phiên phía guest. Định khung mối đe doạ của plan vẫn đúng ở chỗ đây là defense-in-depth chứ không phải bản vá bảo mật (guard nằm sau AES-256-GCM và relay chỉ là bơm byte mù nội dung), nhưng kết luận "sai cũng rẻ" không đứng vững, và thiết kế phải permissive tối đa. Bằng chứng: `sed -n '570,600p' packages/coding-agent/src/collab/relay-client.ts` cho thấy `try { frame = await open(...) } catch { … this.#failFatal("bad key or corrupted frame") … }` rồi `this.onFrame?.(frame, envelope.peerId);` rồi `.catch((err) => logger.debug(...))`. `#failFatal` định nghĩa ở `packages/coding-agent/src/collab/relay-client.ts:675` và đặt `this.#closed = true`. |
| "Ghi chú house-style nằm ở `packages/wire/src/index.ts:11-13`." | slightly stale | Câu "consumers cast at the JSON boundary and every `switch` keeps a tolerant `default:` branch" nay nằm ở dòng 10-11 của file đó (khối comment chạy 9-12). Hãy trích dẫn là `packages/wire/src/index.ts:9-12` trong comment của code. Hướng dẫn tự nó không đổi và vẫn đúng. Bằng chứng: `sed -n '9,12p' packages/wire/src/index.ts` trả về comment bốn dòng kết thúc bằng `*/` ở dòng 12. |
| "Xác minh là `bun check && bun test packages/coding-agent/test/collab/crypto.test.ts`; native addon chưa build nên `bun test` bị chặn." | half wrong | Claim addon đúng với thư mục nhưng sai với file này. `bun test packages/coding-agent/test/collab/` báo 29 pass / 21 fail kèm `Failed to load pi_natives native addon for darwin-arm64` — nhưng cả 21 lỗi đều thuộc file khác, còn `crypto.test.ts` pass 29/29 một mình vì nó không bao giờ nạp addon. Nên W3 **không** bị chặn: hãy chạy lệnh giới hạn theo file. Ngoài ra `bun check` chạy `check:rs` (cargo) song song với `check:ts`; với thay đổi chỉ TypeScript thì dùng `bun run check:types` giới hạn cho `packages/coding-agent` (là `tsgo -p tsconfig.json --noEmit`, không phải tsc) cộng `bun run check:tools` cho oxlint/oxfmt — cả hai tạo thành đúng những gì `check:ts` làm cho package này. Bằng chứng: `bun test packages/coding-agent/test/collab/crypto.test.ts` → `29 pass 0 fail 68 expect() calls` trước khi thay đổi; `bun test packages/coding-agent/test/collab/` → `29 pass 21 fail 21 errors`; `cd packages/coding-agent && bun run check:types` → exit 0. |
| "Effort là ~40 dòng cộng một test." | understated | Thay đổi production là ~68 dòng code mới trong `crypto.ts` (map 18 hàng là 20 dòng, JSDoc cộng alias lookup ~14, hàm ~20) cộng một dòng sửa ở dòng 57, và test là ~75 dòng vì hợp đồng round-trip cần một fixture cho mỗi variant. Tổng ~145 dòng so với ~40 của plan. Vẫn chắc chắn là effort S, và toàn bộ là việc cơ học. Bằng chứng: đã áp thay đổi lên một bản sao scratch và đo: `crypto.ts` đi từ 67 → 100 dòng, khối test mới là 75 dòng, cả tsgo và oxfmt sạch ngay lần chạy đầu. |
| "Guard là kiểm tra field bắt buộc theo từng variant, phủ mọi variant đi qua biên giới giải mã." | confirmed, with a useful addition | Plan không nói có bao nhiêu variant. Có đúng **18** discriminant: `abort`, `agent-cmd`, `agents`, `bus`, `bye`, `entry`, `error`, `event`, `fetch-transcript`, `hello`, `prompt`, `snapshot-chunk`, `state`, `transcript`, `ui-request`, `ui-request-end`, `ui-response`, `welcome`. Chú thích map là `Record<CollabFrame["t"], readonly string[]>` (thay vì `Record<string, …>` thuần) khiến một variant bị quên trở thành lỗi compile — đã kiểm chứng: xoá hàng `error` cho ra TS2741 liệt kê cả 18 literal. Cách đó hẳn hơn danh sách tự duy trì bằng tay của plan và nên dùng. Bằng chứng: một file scratch dùng map có chú thích type-check sạch dưới tsgo; bỏ hàng `error: ["message"]` cho ra `src/collab/w3-scratch-verify.ts(4,7): error TS2741: Property 'error' is missing in type '{…}' but required in type 'Record<"abort" \| "agent-cmd" \| … \| "welcome", readonly string[]>'`. |


---


## W4. Giới hạn ACP `_omp/usage` vào session được yêu cầu; ghi lại giả định gắn stdio một client

**Thay đổi gì:** Handler `case "_omp/usage":` hiện trả về session ĐẦU TIÊN trong map bất kể client hỏi session nào — sửa nó để resolve theo `params.sessionId`, đồng thời thêm comment (không phải guard) tại bảy chỗ tra `#sessions`. **Wave:** Wave 2 — Correctness trên các đường đang ship (W4, W6, W12, W13). **Effort:** S — một nhánh handler (~+2/-1 dòng) cộng bảy khối comment và một test. Plan xếp S và điều đó chính xác.

**Người dùng thấy:** Một ACP client hỏi token/quota của session B hôm nay nhận về số liệu của session A. Sau thay đổi này nó nhận đúng của B. Không UI mới, không flag mới, không đổi hành vi mặc định cho bất kỳ client một-session nào.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/modes/acp/acp-agent.ts` | sửa | Thay khối chọn session ba dòng trong `case "_omp/usage":` (case ở :1180, thân :1181-:1188) để nó resolve `params.sessionId` thay vì destructure entry đầu tiên của map. Thêm một khối comment giải thích đầy đủ tại :1384 (`#getSessionRecord`) và một comment cross-reference ngắn tại sáu site còn lại: :758, :1251, :1266, :1400, :2101, :2126. | có — file tồn tại (98 KB, 2831 dòng). Mọi anchor xác nhận lại bằng `git grep -n` tại HEAD `ecd516f`: `case "_omp/usage":` ở :1180, `const [firstRecord] = this.#sessions.values();` ở :1181, `#sessions.get` ở :758, :1251, :1266, :1384, :1400, :2101, :2126 (đúng bảy), `#assertMatchingCwd` định nghĩa ở :1391 và chỉ được gọi ở :1253 và :1268. |
| `packages/coding-agent/test/acp-agent.test.ts` | sửa | Thêm field `usageReports` và method `fetchUsageReports()` vào class `FakeAgentSession` (:117), thêm fixture helper `usageReportFor(sessionId)`, thêm `type { UsageReport }` vào import top-level `@oh-my-pi/pi-ai` sẵn có ở :6, và thêm một test khẳng định `_omp/usage` trả về reports của session được hỏi. | có — file tồn tại (128 KB, 3488 dòng). `FakeAgentSession` ở :117 và đã dựng trên entry `SessionManager` thật qua `SessionManager.create(cwd)` trong constructor, nên ràng buộc "không `mock.module()`, dựng trên SessionManager thật" của plan đã được harness hiện hữu thoả mãn. Class hiện KHÔNG có method `fetchUsageReports`; cái đó phải thêm vào. |

Cả hai file trên đều đã được kiểm chứng. Hai đường dẫn khác được nhắc tới bên dưới nhưng **không nằm trong danh sách file đã kiểm chứng**: `packages/coding-agent/src/session/agent-session.ts:11210` (chữ ký `AgentSession.fetchUsageReports`) và `packages/catalog/src/types.ts:138` (type alias `Provider`) — hãy tự xác nhận trước khi dựa vào.

### Các bước

1. Mở `packages/coding-agent/src/modes/acp/acp-agent.ts`, tới dòng 1180. Xác nhận bằng `git grep -n '_omp/usage' -- packages/coding-agent/src/modes/acp/acp-agent.ts` rằng case vẫn ở :1180 trước khi sửa — số dòng có thể trôi nếu wave trước đã vào; hãy khớp theo **text** `case "_omp/usage":`, không khớp theo số.
   Anchor: `packages/coding-agent/src/modes/acp/acp-agent.ts:1180`

2. Thay hai dòng `const [firstRecord] = this.#sessions.values();` / `const target = firstRecord?.session ?? this.#initialSession;` bằng dạng resolve-theo-sessionId trong `code_shape` bên dưới. Giữ nguyên `if (!target) { return { reports: [] }; }` và `return { reports: reports ?? [] };` — cả hai là hợp đồng đã có.
   Anchor: `packages/coding-agent/src/modes/acp/acp-agent.ts:1181`

3. Thêm comment cross-reference ngắn (2 dòng) ngay phía trên từng câu sau đây:
   - `const record = this.#sessions.get(params.sessionId);` trong `closeSession`
   - `const existing = this.#sessions.get(sessionId);` trong `#loadManagedSession`
   - câu tương tự trong `#resumeManagedSession`
   - `const loaded = this.#sessions.get(sessionId);` trong `#resolveForkSourceSessionPath`
   - `const record = this.#sessions.get(sessionId);` bên trong `setTimeout` ở `#scheduleBootstrapUpdates`
   - `if (this.#sessions.get(sessionId) !== record) {` trong `#emitBootstrapUpdates`

   Nội dung nằm ở `code_shape` dưới SHORT_COMMENT.
   Anchor: `packages/coding-agent/src/modes/acp/acp-agent.ts:758,1251,1266,1400,2101,2126`

4. Thêm khối comment giải thích đầy đủ (LONG_COMMENT trong `code_shape`) ngay phía trên `const record = this.#sessions.get(sessionId);` bên trong `#getSessionRecord`. Đây là site chuẩn: nó là điểm nghẽn duy nhất mà `setSessionMode`, `setSessionConfigOption`, `prompt` và `cancel` đều đi qua, và nó đã có sẵn định nghĩa `#assertMatchingCwd` liền kề tại :1391 để đối chiếu. KHÔNG lặp lại khối dài tại sáu site kia.
   Anchor: `packages/coding-agent/src/modes/acp/acp-agent.ts:1384`

5. **QUAN TRỌNG** — không thêm bất kỳ attachment check, fence, `throw`, hay guard nào vào bảy site. Sản phẩm bàn giao chỉ là comment. Nếu bạn thấy mình đang viết `if (!record.attachment) throw` thì dừng lại: đó là đáp án sai đã được ghi nhận (xem mục "Cách sai dễ nhất").
   Anchor: `packages/coding-agent/src/modes/acp/acp-agent.ts:1384`

6. Trong `packages/coding-agent/test/acp-agent.test.ts`, mở rộng dòng `import type { Model } from "@oh-my-pi/pi-ai";` ở :6 thành `import type { Model, UsageReport } from "@oh-my-pi/pi-ai";`. Chỉ import top-level — không bao giờ `await import()`, không `import("...").Type` ở vị trí type (AGENTS.md).
   Anchor: `packages/coding-agent/test/acp-agent.test.ts:6`

7. Bên trong class `FakeAgentSession`, thêm hai thành viên trong `code_shape` (field `usageReports` và method `fetchUsageReports()`) cạnh phần state test-double khác, ví dụ bên cạnh `usageFallbackConfirmer` (:147). Method phải là `async` và trả `this.usageReports` để mỗi fake session cho ra một payload phân biệt được. Nó mirror `AgentSession.fetchUsageReports(signal?: AbortSignal): Promise<UsageReport[] | null>` thật, nhưng fake được phép bỏ qua signal — call site production ở :1186 không truyền signal nào.
   Anchor: `packages/coding-agent/test/acp-agent.test.ts:147`

8. Thêm helper `usageReportFor(sessionId)` (xem `code_shape`) ở module scope trong file test, gần `advanceBootstrapGuard()`. Nó phải dựng một `UsageReport` đầy đủ kiểu, KHÔNG cast, KHÔNG `any` (AGENTS.md): `provider` là type alias `Provider` — theo mô tả ở đây, đây là `string` thuần, nên string literal là hợp lệ. Nhúng session id vào `metadata` làm payload tự định danh — đó là thứ biến phép assert phủ định thành có ý nghĩa thay vì tautology.
   Anchor: `packages/coding-agent/test/acp-agent.test.ts:551`

9. Thêm test mới bên trong block `describe("ACP agent", ...)` sẵn có, cạnh test ở :558 vốn đã gọi `newSession` hai lần. Chép nguyên văn phần setup hai session từ test đó: `const first = await harness.agent.newSession({ cwd: harness.cwdA, mcpServers: [] });` và tương tự cho `second` với `cwdB`. Thân test đầy đủ nằm ở `code_shape` dưới TEST.
   Anchor: `packages/coding-agent/test/acp-agent.test.ts:558`

10. Chạy cổng theo đúng thứ tự dưới đây. Hai lệnh đầu là tiền đề, không phải tuỳ chọn: checkout này **không có `node_modules`**, nên `bun run check:ts` hiện chết ngay ở bước đầu với `oxlint: command not found`, còn `bun test` chết với `Cannot find module '@oh-my-pi/pi-agent-core'`. Sau `bun install` + `bun run build:native` thì cả hai mới chạy được.

### Hình dạng code

Thay đổi production — `packages/coding-agent/src/modes/acp/acp-agent.ts`, `case "_omp/usage":` (hiện ở :1180). Thay 2 dòng, thêm 3. Lưu ý sự bất đối xứng có chủ đích: sessionId **được truyền vào** không bao giờ được fallback sang session khác (chỉ `record?.session`), còn sessionId **vắng mặt** thì giữ nguyên chuỗi fallback cũ cho các external client không bao giờ gửi nó.

```ts
		case "_omp/usage": {
			// Resolve the session the client actually asked about. This used to
			// destructure `#sessions.values()[0]`, so with two live sessions a client
			// asking about session 2 was answered with session 1's numbers.
			// A supplied-but-unknown sessionId resolves to nothing rather than
			// falling back, because falling back IS the bug being fixed.
			const requestedId = typeof params.sessionId === "string" ? params.sessionId : undefined;
			const [firstRecord] = this.#sessions.values();
			const record = requestedId !== undefined ? this.#sessions.get(requestedId) : firstRecord;
			const target = record?.session ?? (requestedId === undefined ? this.#initialSession : undefined);
			if (!target) {
				return { reports: [] };
			}
			const reports = await target.fetchUsageReports();
			return { reports: reports ?? [] };
		}
```

LONG_COMMENT — lý do đầy đủ, đặt **CHỈ** tại `packages/coding-agent/src/modes/acp/acp-agent.ts:1384` (`#getSessionRecord`):

```ts
	// No attachment check. `#sessions` is keyed by session id but never records
	// which client connection owns an entry. That is safe today only because the
	// stdio transport carries exactly one client per connection — a property of
	// the transport, not a design decision. A future socket or WebSocket
	// transport voids this assumption at ALL SEVEN `#sessions.get` sites at
	// once: :758, :1251, :1266, :1384, :1400, :2101, :2126.
	//
	// Do NOT add a per-call fence here. The legitimate single-client stdio path
	// would start failing, and fencing does not actually buy isolation: a
	// multi-client transport needs an explicit session router that owns the
	// attachment map and its leases, which is a transport-layer change, not a
	// patch at these call sites.
	//
	// The only attachment-adjacent check that exists today is
	// `#assertMatchingCwd` (defined just below, called from :1253 and :1268
	// only) — it verifies cwd, not client identity.
```

SHORT_COMMENT — đặt tại sáu site còn lại (:758, :1251, :1266, :1400, :2101, :2126):

```ts
	// No attachment check — see `#getSessionRecord` for why that is safe today
	// and why adding a fence here would break the single-client stdio path.
```

Thay đổi phía test 1 — `packages/coding-agent/test/acp-agent.test.ts`, bên trong `class FakeAgentSession` (ở :117), gần `usageFallbackConfirmer` (:147):

```ts
	usageReports: UsageReport[] | null = null;
	async fetchUsageReports(): Promise<UsageReport[] | null> {
		return this.usageReports;
	}
```

Thay đổi phía test 2 — helper ở module scope, gần `advanceBootstrapGuard()`:

```ts
function usageReportFor(sessionId: string): UsageReport {
	return { provider: "test-provider", fetchedAt: 0, limits: [], metadata: { sessionId } };
}
```

Thay đổi phía test 3 — test mới:

```ts
	it("scopes _omp/usage to the session the client asked about", async () => {
		const harness = await createHarness();
		const first = await harness.agent.newSession({ cwd: harness.cwdA, mcpServers: [] });
		const second = await harness.agent.newSession({ cwd: harness.cwdB, mcpServers: [] });

		const firstSession = harness.findSession(first.sessionId)!;
		const secondSession = harness.findSession(second.sessionId)!;
		firstSession.usageReports = [usageReportFor(first.sessionId)];
		secondSession.usageReports = [usageReportFor(second.sessionId)];

		const result = (await harness.agent.extMethod("_omp/usage", { sessionId: second.sessionId })) as {
			reports: UsageReport[];
		};

		expect(result).toEqual({ reports: [usageReportFor(second.sessionId)] });
		// Both sessions are live. Session 1's numbers must not leak into the
		// answer to a question about session 2.
		expect(result.reports).not.toContainEqual(usageReportFor(first.sessionId));
	});
```

### Hợp đồng test

**File test:** `packages/coding-agent/test/acp-agent.test.ts`

**Hợp đồng:** `_omp/usage` báo cáo usage của session được định danh bởi `params.sessionId`, và không của session nào khác. **Nếu hồi quy, người tiêu dùng thấy:** một ACP client có hai session sống sẽ render sai panel quota/token — hỏi về session B và hiện số của session A — mà không có lỗi, không có trạng thái rỗng, và không có gì trong log để phân biệt với output đúng. Đó là lý do phải assert **payload của session nào** quay về, và phải có cả chân phủ định (`not.toContainEqual`): với chỉ một session thì bug vô hình, nên một test chỉ mở một session sẽ pass ngay cả với code hỏng.

**Biên còn lại, do cùng code production phủ (assert nếu rẻ, nếu không thì bỏ — đừng dựng test thứ hai quanh nó):** khi `params.sessionId` trỏ tới một session không có trong `#sessions`, handler phải trả `{ reports: [] }` và **không** được trả reports của initial session hay session khác. Đây là nửa phủ định của fix, và cũng là chỗ dễ bị "sửa sai" nhất — thêm `?? this.#initialSession` vào chỗ đó chính là tái tạo bug.

**Không test phần comment.** Nó ghi lại một giả định về transport và không có hành vi quan sát được. Theo AGENTS.md, test khẳng định trên *text* của comment là source-grep bị cấm, còn test khẳng định "code đã chạy" là placeholder.

### Xác minh

Tiền đề (checkout này hoàn toàn không có `node_modules` — `ls node_modules` → `No such file or directory`):

```bash
bun install
bun run build:native          # packages/natives addon; test acp-agent nạp nó một cách gián tiếp

bun run check:ts              # TUYỆT ĐỐI không dùng tsc / npx tsc
bun test packages/coding-agent/test/acp-agent.test.ts -t "usage"
bun test packages/coding-agent/test/acp-agent.test.ts    # cả file, để chứng minh 7 comment và 2 fake member không phá gì
```

Bằng chứng đỏ/xanh cho cổng: với test đã có và thay đổi production đã revert, lệnh thứ ba phải **FAIL** với sessionId của `second` bị expected nhưng nhận về sessionId của `first`. Ghi lại failure đó trước khi revert fix vào lại.

Không dùng blocker mà văn bản đề bài nêu làm baseline: nó nói `bun test` báo `Failed to load pi_natives native addon for darwin-arm64`. Checkout này không ra lỗi đó. Lỗi đầu tiên thật là `Cannot find module '@oh-my-pi/pi-agent-core'`, vì thiếu hẳn `node_modules`.

### Cổng hoàn thành

Test mới trong `packages/coding-agent/test/acp-agent.test.ts`, chạy bằng `bun test packages/coding-agent/test/acp-agent.test.ts -t "usage"`, phải **ĐỎ** trước thay đổi `acp-agent.ts` và **XANH** sau đó. Cụ thể: trước fix, handler bỏ qua `params.sessionId`, trả `firstRecord` (session 1), và assertion `expect(result).toEqual({ reports: [usageReportFor(second.sessionId)] })` fail hiện ra id của session 1. Sau fix, cả `toEqual` và `not.toContainEqual` đều pass. Cổng thứ cấp: `bun run check:ts` exit 0, và toàn bộ file `acp-agent.test.ts` không có failure mới. Người review xác nhận phần comment bằng cách **đọc**, không chạy gì — cố ý không có cổng tự động cho phần đó.

**Cổng này có thực sự đi đỏ không:** có. Vì handler cũ trả về `firstRecord` một cách xác định, phép so sánh payload hai session khác nhau sẽ đỏ thật khi thiếu fix — và chân phủ định `not.toContainEqual` giữ cho nó không thành tautology.

### Phụ thuộc

Không. `depends_on` và `blocks` đều rỗng.

### Cách sai dễ nhất

Thêm **fencing** — từ chối session không có attachment check — thay vì viết comment. Bảy chỗ tra đó hôm nay an toàn **chỉ vì** transport stdio mang đúng một client mỗi kết nối; một fence ở đó sẽ phá vỡ chính đường single-client hợp lệ. Sai lầm đứng thứ hai: "sửa" trường hợp `unknown sessionId` bằng cách fallback về `#initialSession` — làm tái tạo đúng bug mà W4 này xoá (hỏi về session B và nhận số của A về).

### Cần người quyết

- Khi `sessionId` được truyền vào nhưng không tồn tại, nên trả `{ reports: [] }` (lựa chọn ở đây — không phá vỡ gì, không lộ số của session khác) hay ném ACP error (theo tính nghiêm của `#getSessionRecord`)? Đây là lựa chọn nhìn thấy được trên wire, hướng tới một external client mà repo này không nhìn thấy. Hướng dẫn ở đây chọn `[]` vì handler đã có sẵn nhánh đó và ném lỗi biến một lỗ hổng dữ liệu thành lỗi client. **Cần người xác nhận trước khi merge; đổi lại sau cũng chỉ là sửa một dòng.**
- Nên để cả bảy site mang khối giải thích đầy đủ, hay một khối đầy đủ tại `#getSessionRecord` (:1384) cộng cross-reference hai dòng ở sáu site còn lại (lựa chọn ở đây)? Plan nói "đặt comment tại cả bảy điểm", đọc nghiêm thì thành một đoạn văn lặp bảy lần. Cách chia này vẫn ghi lại giả định ở từng site — đó mới là điểm — mà không mang rủi ro trôi chữ của bảy bản sao. **Sự lệch này là có chủ đích; nêu rõ trong mô tả PR.**

Một câu hỏi nữa đã được cân nhắc và không chặn việc bắt đầu: có nên để `_omp/usage` nhận sessionId hay không, thay vì bắt client gọi một method per-session. Không có caller nào trong repo để phân xử, và hướng fix hiện tại là thay đổi nhỏ hơn — nên tài liệu này đi theo hướng đó.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "Nó phải resolve đúng session client hỏi, khớp với cách các handler anh em trong cùng `switch` đã làm qua `params.sessionId`" | SAI | Không case nào khác trong `extMethod` switch đó đọc `params.sessionId`. Switch trải :1131-:1208, các case là `_omp/sessions/listAll`, `_omp/projects/list`, `_omp/chats/byCwd`, `_omp/usage`, `_omp/extensions`, `_omp/extensions/toggle` — không cái nào nhắc `sessionId`. Quy ước `params.sessionId` mà fix nên khớp đến từ các method của giao thức ACP, tất cả đi qua helper `#getSessionRecord(params.sessionId)` định nghĩa ở :1383 và được gọi ở :767 (`setSessionMode`), :778 (`setSessionConfigOption`), :824 (`prompt`), :1076 (`cancel`). Hãy lấy `#getSessionRecord` làm khuôn mẫu — điều này cũng chính là lý do đặt khối comment dài ở :1384: đó là site chuẩn. |
| "Server của pi đã test và bác bỏ đúng hình dạng này (`pi-ref/packages/server/test/conformance.test.ts:223,246`) với một session-router giữ map attachment tường minh kèm lease." | KHÔNG KIỂM CHỨNG ĐƯỢC — trích dẫn cũ | `pi-ref/` không tồn tại trong repo này, nên các dòng được trích không thể kiểm tra và không được trích trong khối comment. KẾT LUẬN THIẾT KẾ (một transport multi-client cần session router tường minh với attachment map và lease, chứ không phải fence từng lần gọi) vẫn đúng và đáng ghi lại như lý do, nhưng phải phát biểu như design rationale không kèm file:line nào mà không ai theo được. Bỏ trích dẫn, giữ kết luận. |
| Plan (và văn bản đề bài) đều nói repo ở HEAD `5873776`. | CŨ nhưng vô hại | HEAD thật là `ecd516f35b64327392329443ceb52dfbc4e08f06` (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`) trên nhánh `milestone-1`. Khác `5873776` — nhưng cả bảy anchor của plan vẫn resolve CHÍNH XÁC tại `ecd516f`, nên không anchor nào cần sửa. Dù đã vậy, hãy khớp theo text quanh code chứ không theo số dòng trần, vì các wave trước trong milestone này sẽ làm dịch các dòng đó. |
| "Cấm `mock.module()` — dựng trên các entry SessionManager thật thay vì stub module." (hàm ý test phải được dựng như vậy) | ĐÃ ĐÚNG — đây là ràng buộc cần giữ, không phải việc cần làm | Harness hiện hữu đã thoả mãn: constructor của `FakeAgentSession` gọi `SessionManager.create(cwd)` để lấy session id thật, và `createHarness` dựng một `AcpAgent` thật trên một `AgentSideConnection` giả. Không có module stubbing nào để gỡ bỏ. Test mới chỉ cần dùng lại `createHarness()`. Điều plan BỎ SÓT là `FakeAgentSession` hoàn toàn không có method `fetchUsageReports`, nên phải thêm vào fake — đó mới là việc thật trong file test. |
| Fix chỉ được mô tả là "resolve session client hỏi", không nói gì về việc client bỏ trống `sessionId` thì sao. | THIẾU CHI TIẾT — lỗ hổng của plan, không phải plan sai | `_omp/usage` có **không** caller nào trong repo này (`git grep -rn '_omp/usage'` chỉ trả về case label phía server tại :1180), nên nó do một EXTERNAL client tiêu thụ mà repo không nhìn thấy. Do đó chuỗi fallback `?? this.#initialSession` sẵn có là gánh trọng thật cho bất kỳ client nào gọi mà không kèm sessionId, và fix phải giữ nó. Cần hai nhánh tách bạch, và sự bất đối xứng giữa chúng là điểm cốt lõi: sessionId vắng mặt giữ chuỗi cũ; sessionId có mặt nhưng không biết thì resolve thành không. Gộp cả hai vào một biểu thức là chỗ bug bị sửa một nửa. |
| "ENVIRONMENT: native addon chưa build, nên `bun test` hiện báo 0 pass với 'Failed to load pi_natives native addon for darwin-arm64'. Xác minh bằng `bun run check:ts` (không cần addon)." | SAI cho checkout này | Checkout này không có thư mục `node_modules` nào cả. Cả hai lệnh đều fail sớm hơn và vì lý do khác. `bun test packages/coding-agent/test/acp-agent.test.ts` fail với `Cannot find module '@oh-my-pi/pi-agent-core'` (1 fail, 1 error) — không phải thông báo native-addon. `bun run check:ts` chết ngay ở sub-step đầu tiên: `check:tools` → `oxlint: command not found`, exit 127, nên typecheck chưa bao giờ chạy. Chuỗi tiền đề thật là `bun install` rồi `bun run build:native`. Người tin văn bản đề bài sẽ tưởng `bun run check:ts` là baseline chạy được và mất thời gian phát hiện ra là không. |
| "chỉ `:1253` và `:1268` gọi `#assertMatchingCwd`", `#assertMatchingCwd` định nghĩa ở `:1391`; và có đúng bảy site `#sessions.get` chưa kiểm tra, gồm `:2126`.| ĐÚNG — không cần đính chính | Bản đếm lại của plan (được đánh dấu C18/A2 trong văn bản plan) là chính xác. Xác nhận độc lập: bảy chỗ `.get` ở 758, 1251, 1266, 1384, 1400, 2101, 2126; định nghĩa ở 1391; chỉ gọi ở 1253 và 1268. Lưu ý :2126 là `if (this.#sessions.get(sessionId) !== record) {` — một phép so khớp danh tính với record đã bắt, không phải kiểm tra attachment, đúng như plan nói. Dòng 721 là một vòng lặp `#sessions.values()` (không phải `.get`) và 1181 là dòng đang sửa; cả hai không thuộc bảy site. |


---


## W5. Làm cho trích dẫn type-conformance treo lơ lửng của package wire trở nên có thật

**Thay đổi gì:** Tạo `packages/coding-agent/test/collab/web-wire.types.ts` — một file chỉ có type, được `bun run check:ts` ép buộc rằng mọi discriminant `t` mà package `@oh-my-pi/pi-wire` khai báo đều có một biến thể tương ứng ở phía host trong `CollabFrame`; đó chính xác là điều câu bình luận tại `packages/wire/src/index.ts:7` đã hứa từ lâu nhưng trỏ tới một file chưa tồn tại.
**Wave:** Wave 1 — Lifecycle foundation (W1, W2, W3, W5)
**Effort:** S — một file type-only khoảng 45 dòng, không code runtime, không dependency mới. (`@oh-my-pi/pi-wire` vốn đã là dependency của coding-agent tại `packages/coding-agent/package.json:547`.)

**Người dùng thấy:** nội bộ, người dùng không thấy. Không có runtime code, không flag, không đổi default. Hệ quả duy nhất là gián tiếp: một frame wire/host lệch nhau trước đây lộ ra dưới dạng frame bị nuốt im lặng hoặc một `TypeError` vô nghĩa bên trong trình duyệt, thì nay làm `check:ts` đỏ trong CI.

### File cần chạm tới

| path | hành động (sửa/tạo/xoá) | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/test/collab/web-wire.types.ts` | tạo | File type-only conformance khoảng 45 dòng. Import `CollabFrame` từ `../../src/collab/protocol` và `WireFrame` từ `@oh-my-pi/pi-wire`, rút discriminant `t` của từng union, và khẳng định `WireT ⊆ CollabT` qua helper ràng buộc `type Expect<T extends true> = T`. Alias khẳng định được `export`. | có (`verified: true`) |
| `packages/wire/src/index.ts` | sửa — **thực tế KHÔNG sửa** | KHÔNG CÓ THAY ĐỔI. Dòng 7 (`* asserted type-only in \`packages/coding-agent/test/collab/web-wire.types.ts\`.`) vốn đã ghi đúng đường dẫn tương lai và trở thành đúng ngay khoảnh khắc file mới tồn tại. Sạch trước và sau: `git diff packages/wire/src/index.ts` rỗng. | có (`verified: true`) |

Ghi chú: đường dẫn không tùy ý — nó đúng bằng đường dẫn mà câu bình luận mồ côi tại `packages/wire/src/index.ts:7` đang trỏ tới, nên tạo file làm câu đó thành sự thật mà không cần sửa gì trong package wire. **Không** viết lại hay dời neo câu bình luận đó.

### Các bước

1. **Xác nhận baseline xanh trước khi đụng gì.** Chạy `bun install --frozen-lockfile` (bắt buộc — trong checkout này `node_modules` vắng mặt, nên cả `bun run check:ts` lẫn `bun test` đều không chạy được; việc này độc lập với native addon), rồi `bun run check:ts`. Mong đợi exit 0. **Không** dùng `tsc`/`npx tsc` (AGENTS.md cấm), và **không** chạy `bun test` cho item này — nó không liên quan và cần native addon chưa build. *(neo: `package.json:94`)*
2. **Tạo `packages/coding-agent/test/collab/web-wire.types.ts`** với đúng nội dung trong khối `code_shape` bên dưới. Hai điểm tải trọng, rất dễ làm sai: (a) alias khẳng định **phải** là `export type`, không phải `type` trần — một alias không export mà không dùng sẽ dính oxlint WARNING `eslint(no-unused-vars)` (đã kiểm chứng); (b) import phải là `import type` — vì `verbatimModuleSyntax: true` trong `packages/tsconfig.base.json`. *(neo: `packages/coding-agent/test/collab/web-wire.types.ts`)*
3. **Cổng 1 (xanh):** `bun run check:ts` phải PASS. Bên trong nó là `oxlint .` + `oxfmt --check` + `tsgo -p tsconfig.json --noEmit` cho từng package; file này được với tới vì `packages/coding-agent/tsconfig.json` đặt `"include": ["src", "test", "scripts"]`, và cả glob lint lẫn glob format `packages/*/{test,bench,examples,scripts}/**/*.ts` đều khớp nó. Đã kiểm chứng: oxlint exit 0, oxfmt báo `All matched files use the correct format`, tsgo báo 0 lỗi cho file này. *(neo: `packages/coding-agent/tsconfig.json`)*
4. **Cổng 2 (ĐỎ — phần làm cho item này đáng giá): chứng minh khẳng định có răng.** Tạm đổi tên MỘT discriminant trong package wire — `sed -i '' '379s/.*/\t| { t: "bye-vanished"; reason: string }/' packages/wire/src/index.ts` (dòng 379 là `| { t: "bye"; reason: string }`, arm cuối của `HostFrame`). Rồi chạy `bun run --cwd packages/coding-agent check:types` và xác nhận exit 1 với lỗi `test/collab/web-wire.types.ts(44,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.` **ĐÃ KIỂM CHỨNG:** thao tác này sinh **đúng một** lỗi, nằm trong file này, và **không** một lỗi dây chuyền nào ở nơi khác trong package — các `switch` ở phía guest giữ nhánh `default:` khoan dung, nên đổi tên một `t` không lan. Sự cô lập đó mới là kết quả đáng ghi: đỏ rõ ràng và chỉ trỏ về file conformance, không phải trăm chỗ gọi hệ quả. *(neo: `packages/wire/src/index.ts:379`)*
5. **Hoàn tác:** `git checkout -- packages/wire/src/index.ts`, rồi chạy lại `bun run --cwd packages/coding-agent check:types` và xác nhận exit 0 trở lại. **Cả hai chiều đều là bằng chứng** — một file conformance chưa từng đỏ lần nào thì không chứng minh được gì. Ghi cả hai mã exit vào phần mô tả PR. *(neo: `packages/wire/src/index.ts:379`)*
6. **Lượt dọn dẹp tùy chọn**, chỉ nếu bạn muốn trích dẫn tự giải thích được: dù sao cũng để nguyên `packages/wire/src/index.ts:7`. Thứ **duy nhất** bạn được phép thêm trong file mới là phần bình luận đầu file đã có sẵn trong `code_shape`, giải thích rằng file này do tsgo ép và cố ý không được `bun test` thu thập — điều đó chặn người kỹ sư tiếp theo "sửa" nó thành một `.test.ts` và lặng lẽ xoá mất bảo đảm. *(neo: `packages/coding-agent/test/collab/web-wire.types.ts:1`)*
7. **Changelog: KHÔNG thêm mục.** Đây là thay đổi nội bộ chỉ đụng test, không có bề mặt người dùng, và câu bình luận mà nó làm thành sự thật không hề đổi. Theo AGENTS.md, mục dưới `## [Unreleased]` dành cho cái người dùng sẽ thấy hoặc nay có thể làm. Nếu có người review yêu cầu, mục trung thực sẽ là một dòng `### Fixed` về trích dẫn cũ, không phải về một tính năng. *(neo: `packages/wire/CHANGELOG.md`)*

### Hình dạng code

```typescript
// packages/coding-agent/test/collab/web-wire.types.ts
//
// TYPE-ONLY conformance between the shared wire package and the collab host.
//
// No `expect`, no runtime assertion, no source-grep: this is a compile-time
// guarantee, so it is enforced by `tsgo` (via `bun run check:ts`), not by
// `bun test`. This file is deliberately NOT named `*.test.ts` — the runner in
// `scripts/ci-test-ts.ts` only collects `*.test.ts`, and
// `packages/coding-agent/tsconfig.json` includes `test`, so tsgo type-checks
// this file while `bun test` never loads it.
import type { CollabFrame } from "../../src/collab/protocol";
import type { WireFrame } from "@oh-my-pi/pi-wire";

type Assignable<From, To> = [From] extends [To] ? true : false;
type Expect<T extends true> = T;
type Discriminant<F> = F extends { t: infer T } ? T : never;

type WireT = Discriminant<WireFrame>;
type CollabT = Discriminant<CollabFrame>;

/**
 * CONTRACT: every frame discriminant declared by the wire package has a
 * matching host-side variant. This is the direction that has teeth — it goes
 * red when a frame is added to `packages/wire` that the host never emits, and
 * red when the host renames a `t` out from under it.
 *
 * Deliberately NOT asserted: payload-level assignability in either direction.
 * The two sides carry deliberately different `event` unions. Wire's
 * `AgentEvent` declares nine turn/message/tool-execution discriminants the host
 * never emits — `agent_start`, `turn_start`, `turn_end`, `message_start`,
 * `message_update`, `message_end`, `tool_execution_start`,
 * `tool_execution_update`, `tool_execution_end` (verified to be exactly
 * `Exclude<AgentEvent's type, AgentSessionEvent's type>`) — and the host's
 * `AgentSessionEvent` declares discriminants wire has no arm for
 * (`model_changed`, `advisor_cost_changed`, `advisor_yielded`,
 * `goal_updated`, `irc_message`, `todo_auto_clear`, and others).
 * `packages/wire/src/index.ts` states the design in its own header: the unions
 * "cover only the variants this client renders; consumers cast at the JSON
 * boundary and every `switch` keeps a tolerant `default:` branch". Asserting
 * payload assignability would fight that design.
 *
 * The reverse direction (`CollabT ⊆ WireT`) is also not asserted: the host is
 * allowed to emit a variant a browser client has not learned to render yet.
 * That is the forward-compatible half of the same design.
 */
export type WireCoveredByHost = Expect<Assignable<WireT, CollabT>>;
```

### Hợp đồng test

Đây là hợp đồng **lúc compile**, không phải lúc chạy — không có gì để người tiêu dùng quan sát lúc thực thi, và đó chính là ý nghĩa. Hợp đồng được bảo vệ: *"tập discriminant frame mà package wire khai báo là tập con của tập mà host collab thực sự tạo ra được."*

Nếu hồi quy, người tiêu dùng là một collab client chạy trên trình duyệt: nó `switch` trên `frame.t`, và một `t` bị host đổi tên — hoặc một `t` chỉ host biết — rơi vào nhánh `default:` khoan dung. Hôm nay điều đó có nghĩa là một frame bị **bỏ rơi trong im lặng**: UI của guest đứng yên, không lỗi, không dòng log, và không có test đỏ nào ở bất kỳ đâu. Sự im lặng đó chính là thứ mà typecheck biến thành một build break.

Cạm bẫy cụ thể mà item này sinh ra để đóng: nếu file này bị xoá, bị nới thành `Expect<true>`, hoặc bị đổi tên thành `web-wire.types.test.ts` (khi đó `scripts/ci-test-ts.ts:234` sẽ thu thập nó, nhưng nó không mang khẳng định runtime nào), bảo đảm biến mất mà `bun test` vẫn báo xanh.

**File test:** `packages/coding-agent/test/collab/web-wire.types.ts`

### Xác minh

```bash
# 0) Baseline — bắt buộc: không có node_modules thì mọi lệnh dưới đây fail
#    bằng `tsgo: command not found`
bun install --frozen-lockfile
bun run check:ts                      # mong đợi exit 0

# 1) XANH — file conformance có mặt, packages/wire/src/index.ts nguyên vẹn
bun run --cwd packages/coding-agent check:types   # mong đợi exit 0
# (chính xác là `tsgo -p tsconfig.json --noEmit`, packages/coding-agent/package.json:523)

# 2) ĐỎ — bắt buộc. Đổi tên discriminant ở packages/wire/src/index.ts:379
sed -i '' '379s/.*/\t| { t: "bye-vanished"; reason: string }/' packages/wire/src/index.ts
bun run --cwd packages/coding-agent check:types   # mong đợi exit 1
# mong đợi đúng lỗi này, và KHÔNG lỗi nào khác trong package:
#   test/collab/web-wire.types.ts(44,40): error TS2344:
#     Type 'false' does not satisfy the constraint 'true'.

# 3) Hoàn tác và xanh trở lại
git checkout -- packages/wire/src/index.ts
bun run --cwd packages/coding-agent check:types   # mong đợi exit 0

git diff packages/wire/src/index.ts               # mong đợi rỗng
```

Lưu ý khi dùng cổng: `bun run check:ts` là cổng **toàn repo**, nên trên cây bận rộn nó có thể đỏ vì lý do không liên quan tới file này — hãy đọc danh sách lỗi và xác nhận lỗi MỚI duy nhất là lỗi trong `web-wire.types.ts`. `bun test` **không** thuộc phần xác minh của item này và hiện bị chặn trong môi trường này bởi addon `pi_natives` chưa build; đừng thêm nó vào cổng, vì file cố ý nằm ngoài glob `*.test.ts` của runner.

### Cổng hoàn thành

Cổng có hai mặt, và **cả hai mặt đều đã chạy trên source thật, không phải suy luận**:

- **(a) XANH:** với `packages/coding-agent/test/collab/web-wire.types.ts` có mặt và `packages/wire/src/index.ts` không bị đụng, `bun run --cwd packages/coding-agent check:types` exit 0 — **đã quan sát**.
- **(b) ĐỎ:** với đúng một discriminant bị đổi tên tại `packages/wire/src/index.ts:379` và file conformance không bị đụng, cùng lệnh đó exit 1 và lỗi mới duy nhất là `web-wire.types.ts(44,40) TS2344: Type 'false' does not satisfy the constraint 'true'` — **đã quan sát**.
- Sau khi hoàn tác chỉnh sửa wire, lệnh exit 0 trở lại — **đã quan sát**.

**Cổng có đi được đỏ không: CÓ** (`gate_can_fail: true`). Mặt (b) đã được chạy và quan sát thật: đổi một discriminant làm check exit 1 với đúng một lỗi, không lỗi dây chuyền. Điều này làm phân biệt được một khẳng định thật với một khẳng định trang trí — mà chỉ có mặt (a) thì vô dụng, vì một file chứa `type X = Expect<true>` cũng qua mặt (a) một cách trơn tru.

### Phụ thuộc

- `depends_on`: không
- `blocks`: không

Ghi chú phụ thuộc mềm: có ý kiến cho rằng W5 nên land sau W3 để cả hai thay đổi biên giới collab được duyệt trong một lượt. **Đó không phải phụ thuộc code** — file conformance chỉ import `CollabFrame` (từ `packages/coding-agent/src/collab/protocol.ts`) và `WireFrame` (từ `@oh-my-pi/pi-wire`), W3 không đụng tới cái nào trong hai cái đó. Nó là một sở thích về thứ tự review và là hợp lệ, nhưng không được ghi lại như một phụ thuộc chặn, nếu không W5 sẽ nằm chờ không.

### Cách sai dễ nhất

Viết nó thành một `.test.ts` runtime với grep hoặc một `expect(true)` để đánh dấu chỗ — đó là cách sai mà plan nêu, và có lý do. Hình dạng đó **luôn** pass trong khi các type wire trôi đi lặng lẽ. Biến thể tinh vi hơn của cùng sai lầm đó là thêm các khẳng định assignability ở tầng payload "để làm nó mạnh hơn". Những khẳng định đó **không thể** đứng vững — đã kiểm chứng, hai union `event` khác nhau theo **cả hai chiều**: chín discriminant chỉ có ở wire, và hơn một tách chỉ có ở host — nên kỹ sư sẽ hoặc xoá file, hoặc nới khẳng định thành thứ không thể thất bại, và item vẫn "trông như xong" trong khi không chứng minh gì cả.

Rủi ro bậc hai là về mặt thủ tục: vì file này không được `bun test` thu thập, một người chỉ xác minh bằng cách chạy test sẽ thấy xanh suốt và **không bao giờ biết bảo đảm tồn tại**. Đó là lý do bước 4 (đỏ có chủ đích) là bắt buộc và phải được ghi vào PR body, không phải chỉ thực hiện rồi bỏ.

### Cần người quyết

- Có nên siết lại `packages/wire/src/index.ts:7` để nêu đúng lệnh ép (ví dụ `asserted type-only in \`packages/coding-agent/test/collab/web-wire.types.ts\`, enforced by \`bun run check:ts\``) không? Nó sẽ giúp người đọc sau khỏi đi tìm một cái test. Câu trả lời mặc định cho item này: **để nguyên dòng** — plan đã chọn rõ "tạo file chứ đừng xoá câu", và đụng vào package wire làm rộng bề mặt review của một item cỡ S chỉ để đổi lấy lợi ích thuần về comment. Nêu thành follow-up nếu reviewer muốn.
- Một hàm chiếu payload (ví dụ `toWireFrame(frame: CollabFrame): WireFrame` trong `packages/coding-agent/src/collab/protocol.ts`) là thứ duy nhất cho phép file conformance này khẳng định ở tầng **payload** thay vì tầng discriminant — và đó mới là lỗ hổng thật còn lại, vì một `CollabSessionState` thêm field sẽ đổi payload trên wire trong khi khẳng định discriminant vẫn xanh. Plan đã **loại rõ ràng** khỏi W5. Cần xác nhận nó vẫn nằm ngoài; nó cần work item riêng với phần bàn về rủi ro riêng.
- Khẳng định ngược (`CollabT ⊆ WireT`) bị bỏ có chủ ý vì host được phép phát ra một frame mà trình duyệt chưa học cách render. Nếu client guest bao giờ được tuyên bố là đầy đủ tính năng, khẳng định đó sẽ trở nên có nghĩa và nên được thêm vào — nhưng chỉ khi hợp đồng forward-compat được **rút lại tường minh trong comment**, không phải âm thầm.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `git grep -n "web-wire.types"` toàn repo chỉ ra đúng một dòng: chính dòng trích dẫn ở `packages/wire/src/index.ts:7` (exactly one hit repo-wide). | stale | Đúng khi plan được viết; không còn đúng ở HEAD hiện tại. Chính tài liệu plan nay đã được commit vào repo, nên grep trả về 9 kết quả: 8 bên trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (dòng 857, 859, 860, 872, 2250, 2263, 3134, 3135, 3158) cộng một kết quả source thật. Viết lại thành: "kết quả duy nhất ngoài tài liệu plan là `packages/wire/src/index.ts:7`". Phát hiện cốt lõi — không có file `web-wire.types.ts` nào tồn tại và không gì khác trong repo phụ thuộc vào nó — không thay đổi và vẫn được xác nhận.<br>*Bằng chứng:* `git grep -n "web-wire.types"` tại HEAD `ecd516f` trả về `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:857,859,860,872,2250,2263,3134,3135,3158` và `packages/wire/src/index.ts:7`. `ls packages/coding-agent/test/collab/` cho thấy 22 file `*.test.ts` cộng một thư mục `helpers/` và không có `web-wire.types.ts`. |
| Repo đang ở `git HEAD 5873776`. | stale | HEAD thực tế là `ecd516f35b64327392329443ceb52dfbc4e08f06` trên nhánh `milestone-1` — một lần publish khởi đầu đã squash của oh-my-pi 18.3.3, không phải commit upstream mà plan đã review. Mọi neo mà item này phụ thuộc đều đã được kiểm lại trên cây này và tất cả vẫn đứng vững, nên khác biệt là hình thức với riêng W5 — nhưng đừng dùng `5873776` khi bisect hoặc khi đọc trích dẫn plan về các item khác.<br>*Bằng chứng:* `git rev-parse HEAD` → `ecd516f35b64327392329443ceb52dfbc4e08f06`; `git branch --show-current` → `milestone-1`; `packages/wire/package.json:4` → `"version": "18.3.3"`. |
| `AgentSessionEvent` (định nghĩa ở `agent-session-events.ts:13`, **14** variant). | wrong | File và dòng đúng (`packages/coding-agent/src/session/agent-session-events.ts:13`) nhưng số đếm thì không: có **18** discriminant `type` duy nhất trên 19 arm (`agent_end` xuất hiện hai lần, cho hai variant khác hình dạng). Đừng chép "14" vào bất kỳ comment nào. Kết luận plan rút ra từ con số đó không đổi — union phía host lớn hơn hẳn union phía wire — nên comment trong file nên nêu **hướng** của khác biệt và chỉ ra ví dụ cụ thể, chứ không phải một con số.<br>*Bằng chứng:* `sed -n '13,82p' packages/coding-agent/src/session/agent-session-events.ts \| grep -o 'type: "[a-z_]*"' \| sort -u` cho ra 18 giá trị khác nhau. |
| Hai tập `AgentEvent` và `AgentSessionEvent` giao nhau chỉ ở `agent_end` và `notice` (the two event sets intersect at only `agent_end` and `notice`). | wrong | Giao rộng **ít nhất 7** discriminant, không phải 2. Đã kiểm chứng bằng các assertion membership ở tầng type: `agent_end`, `auto_compaction_start`, `auto_compaction_end`, `auto_retry_start`, `auto_retry_end`, `notice`, và `thinking_level_changed` đều là thành viên của **CẢ HAI** union. Điều này không đổi kết luận thiết kế — hai tập vẫn khác nhau theo cả hai chiều, nên payload assignability vẫn không thể khẳng định — nhưng lý do đã nêu là sai. Hãy dùng lý do đã sửa trong comment của file. Riêng phần này vẫn đúng như plan: wire khai báo đúng 9 discriminant chỉ có ở wire (`agent_start`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`) — tập đó chính xác là `Exclude<AgentEvent's type, AgentSessionEvent's type>`.<br>*Bằng chứng:* một probe ở tầng type khẳng định `In<"agent_end", W> & In<"agent_end", H>` (và tương tự cho sáu cái còn lại) compile sạch dưới `tsgo`; một probe riêng khẳng định `Eq<Exclude<W,H>, <9 discriminant vòng đời>>` cũng compile sạch. Probe đi kèm cố gắng khẳng định `Eq<W & H, <7 literal>>` thì **THẤT BẠI** — xem ghi chú trong trường risk về thủ thuật đồng nhất `Eq<>` không đáng tin với conditional type bị trì hoãn ở đây. |
| Thân file nháp của plan: `type WireCoveredByHost = Expect<Assignable<WireT, CollabT>>;` dưới dạng type alias trần, không export. | incomplete | Logic type thì đúng (compile xanh và test âm làm nó đỏ), nhưng viết như vậy sẽ dính một oxlint warning: `eslint(no-unused-vars): Type alias 'WireCoveredByHost' is declared but never used`. Hôm nay nó chỉ là warning nên **không** làm build hỏng — nhưng đó là tiếng ồ trên một file mà toàn bộ việc của nó là để được đọc cẩn thận. Thêm tiền tố `export` — nó tắt rule với chi phí bằng không và trông như cố ý. `code_shape` trong spec này đã làm vậy.<br>*Bằng chứng:* `oxlint` trên dạng alias trần in ra warning và exit 0; `oxlint` trên dạng `export type` in ra không gì và exit 0. `oxfmt --check` chấp nhận cả hai. |
| Lệnh xác minh là `bun check` (và `bun check` phải PASS khi có file, FAIL khi một wire type bị thu hẹp). | needs precision | `bun check` là lệnh **đúng** và nó có với tới file này, nhưng hai điều phải nói chính xác nếu không kỹ sư sẽ mất một tiếng. (1) `bun check` chạy cả `check:ts` và `check:rs` — nửa Rust cần toolchain và không liên quan gì ở đây; hãy dùng `bun run check:ts`, hoặc để quay nhanh thì `bun run --cwd packages/coding-agent check:types`, vốn đúng là `tsgo -p tsconfig.json --noEmit` (`packages/coding-agent/package.json:523`). (2) `bun run check:ts` là cổng toàn repo, nên trên cây bận rộn nó có thể đỏ vì lý do không liên quan. Hãy đọc danh sách lỗi và xác nhận lỗi MỚI duy nhất nằm trong `web-wire.types.ts`.<br>*Bằng chứng:* `package.json:93-95` (`check` = `--parallel check:ts check:rs`; `check:ts` = `check:tools` + `check:types` tuần tự theo từng package); `packages/coding-agent/package.json:523` (`check:types` = `tsgo -p tsconfig.json --noEmit`). Cả hai đã chạy: `bun run check:ts` exit 0 trên cây sạch. |
| Đóng khung nhiệm vụ: "native addon chưa build, nên `bun test` hiện báo 0 pass với `Failed to load pi_natives native addon for darwin-arm64` ... coi `bun test` là bị chặn cho tới khi addon được build." | irrelevant to this item — with an additional blocker the framing missed | `bun test` không nằm trong cổng của W5: đây là bảo đảm lúc compile và file cố ý nằm ngoài glob thu thập của runner. Chặn thật sự trong checkout này khác và đến sớm hơn nhiều — `node_modules` vắng mặt hoàn toàn, nên cả `tsgo` lẫn `oxlint` đều thiếu và `bun run check:ts` fail với `tsgo: command not found` trước khi câu hỏi addon kịp nảy sinh. Chạy `bun install --frozen-lockfile` đã xử lý (404 package, 3.2s) và native addon chưa bao giờ có mặt trong việc đó. Hãy đặt `bun install` làm bước 1 của item này để kỹ sư không đọc `command not found` thành checkout hỏng.<br>*Bằng chứng:* `tsgo: command not found` trước khi install; sau `bun install --frozen-lockfile` (`@typescript/native-preview@7.0.0-dev.20260707.2`, `oxlint@1.85.0`) thì `bun run check:ts` exit 0 mà không cần build addon. |
| W5 phụ thuộc W3 (W3 nên land trước để cả hai thay đổi biên giới collab chỉ được đụng một lần). | soft, not a code dependency — make this explicit or the engineer will wait for nothing | **Không có** phụ thuộc code. File conformance chỉ import `CollabFrame` (từ `packages/coding-agent/src/collab/protocol.ts`) và `WireFrame` (từ `@oh-my-pi/pi-wire`); W3 không đụng tới cái nào. Lý do đã nêu — gộp cả hai thay đổi biên giới collab vào một lượt review — là một sở thích về thứ tự review và là hợp lệ, nhưng không được ghi thành phụ thuộc chặn, nếu không W5 sẽ nằm chờ không. Điều đáng biết: W3 trong lúc đó đang được triển khai **song song** ngay trong cây làm việc này trong lúc xác minh W5 (`packages/coding-agent/src/collab/crypto.ts` nhận thêm một guard `FRAME_REQUIRED_FIELDS: Record<CollabFrame["t"], readonly string[]>`). Bản ghi đó tự nó cũng là một ràng buộc exhaustive trên các discriminant của `CollabFrame`, nên nó và file này **thống nhất theo cấu tạo** và sẽ cùng đỏ nếu tập `t` của `CollabFrame` thay đổi — đó là một đối chiếu chéo hữu ích, không phải một phụ thuộc.<br>*Bằng chứng:* `git status` trong lúc xác minh hiển thị `M packages/coding-agent/src/collab/crypto.ts` và `?? packages/coding-agent/test/collab/w3-probe.test.ts`, cả hai thuộc công việc W3 chạy song song, không thuộc W5. Danh sách file của chính W5 không đụng tới cái nào trong hai cái đó. |


---


## W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo

**Thay đổi gì:** Hai sửa một dòng trong `bash.ts` khiến mọi lệnh bash khớp `CRITICAL_BASH_PATTERNS` trả về `policy: "deny"` ở *mọi* chế độ phê duyệt — kể cả `yolo` mặc định — thay vì tự phê duyệt rồi chạy. **Wave:** Wave 2 (Correctness trên các đường đang ship) — gated by PRODUCT SIGN-OFF, must not gate W4/W12/W13. **Effort:** S — hai sửa một dòng trong source, năm cập nhật assertion test, hai test mới, hai sửa tài liệu, một dòng changelog.

**Người dùng thấy:** Với `tools.approvalMode: yolo` mặc định, một lệnh khớp `CRITICAL_BASH_PATTERNS` (`rm -rf /`, `rm --no-preserve-root`, `sudo rm`, `chmod -R 777 /`, fork bomb, `mkfs`, `dd of=/dev/`, `> /etc/passwd`, shutdown, v.v.) nay bị từ chối với thông báo `Tool "bash" is blocked by tool policy. Reason: Critical pattern detected` thay vì chạy không cần canh giữ. Tác động lớn thứ hai: một rule `bash.patterns` với `approval: "allow"` **không còn** cho phép lệnh critical — deny của tool là tuyệt đối và thắng allow của người dùng. Bất kỳ người dùng nào workflow phụ thuộc vào việc `rm -rf /tmp/...` (khớp regex critical neo vào `/`) được auto-allow trong `yolo` sẽ mất điều đó, và **không có lối thoát nào ở tầng settings** ngoài việc sửa code. Đây là thay đổi hành vi mặc định cho mọi người dùng `yolo`, và chính vì thế cần sign-off.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/tools/bash.ts` | sửa | Thêm `policy: "deny"` vào **cả hai** nhánh return critical: nhánh top-level ở dòng 516 và vòng lặp per-segment compound ở dòng 545. Không đổi logic nào khác. | Có (`verified: true`) |
| `packages/coding-agent/test/tools/approval.test.ts` | sửa | Cập nhật **năm** assertion đang khẳng định hình dạng không-policy, thêm một test hợp đồng yolo-deny và một test âm (lệnh vô hại). Fixture tổng hợp `dangerous` ở dòng 82 giữ nguyên. | Có (`verified: true`) |
| `docs/approval-mode.md` | sửa | Dòng 64: thay câu "In `yolo`, a bare critical override is ignored…" bằng luật mới. Dòng 124: ví dụ mở rộng `isCritical(args.command)` hiện đang khuyến nghị hình dạng `{tier,override,reason}` nay yếu hơn thực tế. | Có (`verified: true`) |
| `packages/coding-agent/CHANGELOG.md` | sửa | Thêm một bullet `### Changed` (hoặc `### Fixed`) dưới mục `## [Unreleased]` sẵn có ở dòng 3. | Có (`verified: true`) |

### Các bước

1. **CỔNG — không viết dòng code nào cho tới khi có sign-off bằng văn bản của product owner** về đúng thay đổi người-dùng-thấy đã ghi ở trên, cụ thể là: (a) lệnh bash critical nay bị hard-deny trong `yolo`, và (b) `bash.patterns` `allow` không còn override được một kết quả khớp critical. Nếu sign-off bị từ chối hoặc trì hoãn, đóng item này là `deferred` và ship Wave 2 mà không có nó (W4/W12/W13 không được chờ).
   *Anchor: N/A — cổng quy trình, không có file.*

2. Trong `bash.ts`, đổi dòng 516 từ `return { tier: "exec", override: true, reason: "Critical pattern detected" };` thành object literal nhiều dòng có thêm `policy: "deny",` **giữa** `override: true,` và `reason:`, khớp thứ tự field của nhánh deny liền kề ở dòng 507–511 (`tier`, `override`, `policy`, `reason`).
   *Anchor: `packages/coding-agent/src/tools/bash.ts:516`*

3. **Trong CÙNG file đó**, làm thay đổi y hệt ở dòng 545 (vòng lặp compound per-segment). Không được bỏ qua: kiểm tra top-level ở dòng 515 có điều kiện `!compoundSegments`, nên **mọi** lệnh compound đều đi tới dòng 545 — dòng 545 mới là nhánh một payload thực như `pwd && cmp a b && rm -rf /` thực sự đi qua. Bỏ sót một trong hai chỗ là cách sai dễ nhất.
   *Anchor: `packages/coding-agent/src/tools/bash.ts:545`*

4. Cập nhật `classifies critical bash patterns through BashTool.approval`: đổi `toEqual` ở dòng 371 thành kỳ vọng `{ tier: "exec", override: true, policy: "deny", reason: "Critical pattern detected" }`. **Đừng** đụng tới danh sách lệnh ngay phía trên — đó là corpus chống false-positive, và mọi phần tử vẫn phải được phân loại là critical.
   *Anchor: `packages/coding-agent/test/tools/approval.test.ts:371`*

5. Đổi tên `it()` ở dòng 426 (hiện là `"keeps critical bash patterns prompt-gated unless explicitly denied"` — không còn đúng) để mô tả hợp đồng mới, ví dụ `"denies critical bash patterns even when a configured pattern allows"`, và thêm `policy: "deny"` vào object kỳ vọng ở dòng 431–435. **Giữ nguyên** hai assertion anh em trong cùng test: `echo hello` dưới rule `*`/allow vẫn phải là `{tier:"write",policy:"allow"}` và `echo hello && rm file.txt` vẫn phải là `"exec"` — chúng là bằng chứng thay đổi không lan quá tay.
   *Anchor: `packages/coding-agent/test/tools/approval.test.ts:426`*

6. Trong `does not let an unmatched segment conceal a critical later segment`, đổi `toMatchObject` ở dòng 818–822 từ `policy: "prompt"` thành `policy: "deny"`. Assertion này chạy ở chế độ `write` (không phải yolo) — nó vẫn vỡ vì `resolveApproval` short-circuit ở `decision.policy === "deny"` trước khi chế độ được hỏi tới.
   *Anchor: `packages/coding-agent/test/tools/approval.test.ts:818`*

7. Trong `retains critical checks after removing literal shell quotes and escapes with an unmatched segment`, đổi `toMatchObject` ở dòng 834–838 từ `policy: "prompt"` thành `policy: "deny"`. Cả hai lệnh lặp (`rm -rf '/'` và `r\m -rf /`) vẫn phải bị deny, chứng minh việc bóc quote/canonicalize vẫn làm lộ ra kết quả khớp critical.
   *Anchor: `packages/coding-agent/test/tools/approval.test.ts:834`*

8. Thêm một test mới trong cùng khối `describe("tool-owned dynamic approval declarations")`, **sau** test của bước 4, chạy `BashTool` thật (dùng helper `createBashTool()` sẵn có) và khẳng định đường compound dưới yolo:
   - `resolveApproval(bash, { command: "pwd && cmp before after && rm -rf /" }, "yolo", { bash: "allow" })` khớp `{ policy: "deny", source: "tool", override: true }`
   - `requiresApproval(bash, { command: "rm -rf /" }, "yolo", { bash: "allow" })` throw một message bắt đầu bằng `Tool "bash" is blocked by tool policy`

   Đây là hợp đồng trung tâm, và nó **phải** đi qua vòng lặp compound ở dòng 545, không chỉ nhánh top-level ở dòng 516.
   *Anchor: `packages/coding-agent/test/tools/approval.test.ts:352` (chèn sau `it()` ở dòng 375)*

9. Thêm một test âm trong cùng khối: một lệnh vô hại dưới chế độ `yolo` mặc định vẫn phải resolve `allow`. `resolveApproval(createBashTool(), { command: "ls -la" }, "yolo", {})` phải khớp `{ policy: "allow" }`, và test `does not flag benign bash commands` hiện có (dòng 375) phải vẫn xanh. Đây là chốt chặn chống việc thay đổi lan sang lệnh thường.
   *Anchor: `packages/coding-agent/test/tools/approval.test.ts:375` (liền kề)*

10. Sửa `docs/approval-mode.md` dòng 64: xoá câu *"In `yolo`, a bare critical override is ignored, but an explicit tool/user `prompt` or `deny` policy is still enforced."* và thay bằng phát biểu rằng một bash pattern critical bị từ chối dứt khoát ở mọi chế độ, kể cả `yolo`, và rằng rule `bash.patterns` `allow` không override được nó (một rule `deny` đã cấu hình vẫn là cách nêu tên pattern cụ thể trong reason).
    *Anchor: `docs/approval-mode.md:64`*

11. Sửa ví dụ mở rộng ở `docs/approval-mode.md:124` để nhánh `isCritical(args.command)` trả về đúng hình dạng mà bash tool đã ship (có `policy: "deny"`), và thêm một mệnh đề nói rằng một quyết định `override: true` không kèm `policy` sẽ bị bỏ qua dưới `yolo`. Chỉ văn bản ví dụ thay đổi — ví dụ mang tính minh hoạ, không được biên dịch.
    *Anchor: `docs/approval-mode.md:124`*

12. Thêm bullet changelog dưới `## [Unreleased]` trong `packages/coding-agent/CHANGELOG.md` (tạo mục con `### Changed` nếu chưa có). Một dòng, hướng người dùng, không kể chi tiết triển khai.
    *Anchor: `packages/coding-agent/CHANGELOG.md:3`*

13. Chạy các lệnh xác minh. `bun test packages/coding-agent/test/tools/approval.test.ts` phải xanh, 0 failure. **Lưu ý:** trong checkout này `node_modules/` rỗng, nên **cả** `bun test` lẫn `bun run check:ts` đều fail trước khi chạy test nào — phải `bun install` trước (xem mục *Cần người quyết*).
    *Anchor: N/A — xác minh*

### Hình dạng code

```typescript
// packages/coding-agent/src/tools/bash.ts — TWO sites, identical edit.

// Site 1 — bash.ts:515-517 (top-level; skipped entirely when compoundSegments is set)
if (!compoundSegments && criticalCommand) {
	return {
		tier: "exec",
		override: true,
		policy: "deny",          // <-- ADDED
		reason: "Critical pattern detected",
	};
}

// Site 2 — bash.ts:542-546 (per-segment compound loop; the branch real compound payloads take)
for (const segment of compoundSegments) {
	const literalCommand = segment.argv.join(" ");
	if (criticalCommand || CRITICAL_BASH_PATTERNS.some(pattern => pattern.test(literalCommand))) {
		return {
			tier: "exec",
			override: true,
			policy: "deny",      // <-- ADDED
			reason: "Critical pattern detected",
		};
	}
}

// Why this works without touching approval.ts: resolveApproval already short-circuits on the
// tool's own deny BEFORE the mode is consulted —
//   if (decision.policy === "deny") return { policy: "deny", ..., source: "tool", ... };
// and requiresApproval turns that into a throw via denyError():
//   `Tool "bash" is blocked by tool policy.\nReason: Critical pattern detected`
// The yolo short-circuit at approval.ts:~252 is therefore never reached for a critical command.

// New test (real BashTool, compound path, yolo):
//   const bash = createBashTool({ "bash.allowCompoundCommands": true });
//   const args = { command: "pwd && cmp before after && rm -rf /" };
//   expect(resolveApproval(bash, args, "yolo", { bash: "allow" }))
//     .toMatchObject({ policy: "deny", source: "tool", override: true });
//   expect(() => requiresApproval(bash, args, "yolo", { bash: "allow" })).toThrow();

// Negative guard:
//   expect(resolveApproval(createBashTool(), { command: "ls -la" }, "yolo", {}))
//     .toMatchObject({ policy: "allow" });
```

### Hợp đồng test

Hợp đồng được bảo vệ: **một lệnh khớp `CRITICAL_BASH_PATTERNS` không bao giờ được `yolo` tự phê duyệt — nó resolve `policy: "deny"` với `source: "tool"` và `requiresApproval` throw, ở mọi chế độ, qua CẢ nhánh top-level lẫn nhánh compound per-segment.**

Nếu hồi quy, người tiêu dùng thấy `rm -rf /` (hoặc `pwd && cmp a b && rm -rf /`) âm thầm thực thi không cần canh giữ dưới chế độ phê duyệt mặc định trên máy của họ — mất dữ liệu im lặng, không prompt, không dòng log, và không gì trong transcript nói ra rằng bộ phân loại an toàn đã kích hoạt.

Nửa âm của hợp đồng cũng quan trọng ngang: nếu thay đổi lan quá tay, một lệnh thường như `ls -la` sẽ ngừng resolve thành `allow` trong `yolo` và mọi automation dựng trên chế độ mặc định sẽ vỡ rõ ràng. Hai assertion anh em ở bước 5 (`echo hello` vẫn `write`/`allow`, `echo hello && rm file.txt` vẫn `"exec"`) là chốt chặn âm thứ hai, chứng minh deny không rò vào trật tự phân giải của pattern đã cấu hình.

**Test file:** `packages/coding-agent/test/tools/approval.test.ts`

### Xác minh

```bash
bun install && bun run check:ts && bun test packages/coding-agent/test/tools/approval.test.ts
```

Kỳ vọng: oxlint/oxfmt sạch, type-check sạch, và `approval.test.ts` xanh hoàn toàn (0 fail) với 5 assertion vốn đang xanh được cập nhật theo bước 4–7 và 2 test mới từ bước 8–9 đã thêm. `bun check` (full repo check, theo AGENTS.md) là dạng nghiêm hơn của lệnh đầu nếu có thời gian.

**Chặn môi trường có sẵn, đã kiểm chứng trong checkout này:** `node_modules/` rỗng, nên `bun test` hiện fail với `Cannot find module '@oh-my-pi/pi-tui/tools/bash' from packages/coding-agent/src/tools/bash.ts` (0 pass, 1 fail) và `bun run check:ts` fail với `oxlint: command not found` (exit 127). Cả hai đều chưa chạm tới code cần kiểm thử. Phải chạy `bun install` trước.

### Cổng hoàn thành

`bun test packages/coding-agent/test/tools/approval.test.ts` exit 0 với 0 failure, **VÀ** suite có một test chạy `BashTool` thật dưới mode `"yolo"` và khẳng định `resolveApproval(...)` trả `policy: "deny"` / `source: "tool"` cho **CẢ** `rm -rf /` (top-level, `bash.ts:516`) và `pwd && cmp before after && rm -rf /` (compound, `bash.ts:545`) — trong khi `ls -la` dưới cùng mode vẫn trả `policy: "allow"`. Tương đương: revert một trong hai sửa `bash.ts` mà không revert test thì suite chuyển đỏ.

Cổng này **đi được xuống đỏ — có thật**: hai assertion tương phản (`ls -la` → `allow`, `echo hello` → `write`/`allow`) bảo đảm cổng không xanh nhầm bằng cách biến mọi thứ thành deny, và test compound bắt buộc phải đi qua `bash.ts:545` nên chỉ sửa mỗi dòng 516 sẽ để lộ. Rủi ro cao thứ hai là việc coi cổng sign-off ở bước 1 là mang tính tham khảo — đây là thay đổi mặc định cho mọi người dùng `yolo` và xoá luôn lối thoát qua `bash.patterns` allow, nên triển khai mà không có sign-off đã ghi lại chính là hỏng; nên đánh dấu skipped và ship Wave 2 không có nó thay vì đoán.

### Phụ thuộc

không — `depends_on` rỗng và `blocks` rỗng. Cổng sign-off ở bước 1 là quy trình, không phải phụ thuộc kỹ thuật; nó không được chặn W4/W12/W13.

### Cách sai dễ nhất

**Sửa một nửa cặp điểm.** Kiểm tra top-level ở `bash.ts:515` có điều kiện `!compoundSegments`, nên nó không với tới được với bất kỳ lệnh compound nào; dòng 545 mới là nhánh một payload thực sự chạm tới. Sửa riêng dòng 516 sẽ tạo ra một suite **hoàn toàn xanh** (corpus top-level ở dòng 350–370 rất lớn, khoảng 15 lệnh) trong khi `pwd && cmp a b && rm -rf /` vẫn tự phê duyệt dưới `yolo` — đúng cái hỏng âm thầm mà item này sinh ra để chặn. Vì thế test ở bước 8 bắt buộc phải dùng một lệnh **compound**, không được chỉ dùng `rm -rf /`.

### Cần người quyết

- **SIGN-OFF (cổng cứng):** product có chấp nhận rằng `bash.patterns` `{ approval: "allow" }` không còn cho phép **bất kỳ** lệnh nào khớp `CRITICAL_BASH_PATTERNS` không? Đây là phần sắc nhất của thay đổi và plan không nhắc tới. `rm -rf /tmp/build` khớp regex recursive-delete neo vào `/`, nên những người dùng hiện đang dựa vào allow rule để tự chạy cleanup trong `yolo` sẽ mất điều đó mà không có lối thoát ở tầng settings. Lựa chọn: (a) ship như hiện tại (**khuyến nghị** — một bộ phân loại an toàn có đường thoát đã tài liệu hoá thì không phải bộ phân loại an toàn); (b) cho critical deny nhường cho một `tools.approval.bash: "allow"` tường minh của người dùng (làm yếu cổng, và trái với thứ tự ưu tiên của chính nhánh deny liền kề); (c) thu hẹp `CRITICAL_BASH_PATTERNS` để loại `/tmp` và `/var/tmp`. Khuyến nghị (a), cần owner xác nhận tường minh.
- **Lệch khỏi plan ở `approval.test.ts:84`:** plan bảo đổi tên test `ignores override-based prompts in yolo mode` để mô tả hành vi mới. Chỉ dẫn đó sai. Đầu vào của test là một object tổng hợp dựng inline ở dòng 82 (`const dangerous = tool("bash", { tier: "exec", override: true, reason: "Critical pattern detected" })`) — nó không bao giờ gọi `BashTool`, nên vẫn xanh sau khi sửa `bash.ts`, và đổi tên sẽ khẳng định một điều sai. Giữ nguyên như hiện tại (nó vẫn bảo vệ một hình dạng thực sự với tới được: bất kỳ tool nào trả `override:true` mà không có `policy`) và thêm test BashTool thật ở bước 8. Cần xác nhận là chấp nhận được sự lệch này, hoặc chỉ đạo khác.
- **`deny` hay `prompt`:** dùng `policy: "prompt"` có chấp nhận được không? Dưới `yolo`, một quyết định tool mang `policy` tường minh được trả về nguyên văn với `override: false` (nhánh yolo của `approval.ts`), nên lệnh critical sẽ *prompt* thay vì bị từ chối. Nó bị loại để chọn `deny` vì `docs/approval-mode.md:162` tài liệu hoá rằng policy `prompt` không thỏa mãn được trong một phiên chạy headless, và các phiên ACP/headless sẽ fail không nhất quán; `deny` fail-closed một cách tất định. Cần xác nhận `deny` là ý định **trước khi** triển khai — đây không phải chi tiết để kỹ sư tự quyết.
- **Ví dụ ở `docs/approval-mode.md:124`:** nên đổi ví dụ hướng dẫn viết extension sang hình dạng mới, hay giữ nguyên như một phần minh hoạ rằng một override trần vẫn hợp lệ nhưng bị `yolo` bỏ qua? Đặc tả này đổi nó (bước 11) với lý do: hiện nó dạy tác giả extension một hình dạng âm thầm không làm gì dưới chế độ mặc định.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Ghi chú môi trường trong work order: repo ở git HEAD `5873776`. | wrong | HEAD thật là `ecd516f35b64327392329443ceb52dfbc4e08f06` (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`), kiểm chứng bằng `git rev-parse HEAD`. Mọi path và số dòng trong tài liệu này được suy ra lại trên commit đó, không phải 5873776. |
| Ghi chú môi trường: "native addon chưa build, nên `bun test` hiện báo 0 pass với `Failed to load pi_natives native addon for darwin-arm64`. Kiểm chứng bằng `bun run check:ts` (không cần addon)." | wrong | Phụ thuộc **chưa được cài** — `node_modules/` rỗng (`ls node_modules \| wc -l` → 0). `bun test` fail ở phân giải module (`Cannot find module '@oh-my-pi/pi-tui/tools/bash'`, 0 pass / 1 fail / 1 error), không phải vì native addon; và `bun run check:ts` **cũng** bị chặn (exit 127, `oxlint: command not found`). Không lệnh nào dùng làm cổng được cho tới khi `bun install` thành công. Đừng coi một `check:ts` xanh là bằng chứng baseline đã kiểm chứng trong checkout này. |
| Test cần viết (2): "CẬP NHẬT CÓ CHỦ ĐÍCH case sẵn có tại `approval.test.ts:84` — đổi tên để nói hành vi mới, không bao giờ xóa nó." | wrong | Test ở dòng 84 không vỡ và không nên đổi tên. Đối tượng của nó là fixture tổng hợp dựng inline ở dòng 82 — `{ tier: "exec", override: true, reason: "Critical pattern detected" }` — không bao giờ đi qua `BashTool.approval`, nên sửa `bash.ts` không thể đổi kết quả. Tệ hơn: nếu kỹ sư "cập nhật" fixture ở dòng 82 cho mang `policy:"deny"` để cái tên mới có nghĩa, họ cũng làm vỡ test liền kề ở dòng 90 (`user policy still controls execution in yolo mode`), vì `allow` và `prompt` ở đó đều giả định không có tool policy. Để nguyên dòng 82–97; thêm test BashTool thật ở bước 8. |
| "Test cần viết" liệt kê bốn thay đổi (1) yolo+critical trả deny, (2) cập nhật case ở :84, (3) lệnh vô hại âm, (4) compound critical vẫn bị deny — và nêu `approval.test.ts:84-88` là **vị trí test duy nhất** cần cập nhật. | incomplete | Thay đổi này làm vỡ **năm** assertion trên **bốn** test, không phải một. Ngoài chỉ dẫn sai ở :84, các sửa cần làm là: dòng 371 (`classifies critical bash patterns through BashTool.approval`), dòng 431–435 cùng tiêu đề `it()` ở 426 (`keeps critical bash patterns prompt-gated unless explicitly denied` — tiêu đề thành sai sự thật), dòng 818–822 (`does not let an unmatched segment conceal a critical later segment`), và dòng 834–838 (`retains critical checks after removing literal shell quotes and escapes with an unmatched segment`). Hai cái cuối vỡ ở chế độ `write`, không phải yolo, vì `resolveApproval` short-circuit ở `decision.policy === "deny"` trước khi chế độ được hỏi. Kỹ sư làm theo plan sẽ gặp bốn test đỏ không lường trước. |
| "Bối cảnh đã xác minh … cả hai nhánh critical trả `{tier:"exec", override:true, reason:"Critical pattern detected"}` với KHÔNG có `policy:"deny"`, trong khi đường deny do người dùng cấu hình ngay cạnh bên tại `:506-512` thì có đặt `policy:"deny"` đúng cách." | confirmed (line numbers slightly off) | Claim về hành vi đúng hoàn toàn và tái lập được. Đường deny cấu hình nằm ở dòng 506–512 với `policy: "deny"` ở dòng 510, và bản sinh đôi compound ở 526–530 với `policy:"deny"` ở dòng 528. Hai nhánh critical ở 516 và 545, khớp plan. `default: "yolo"` ở `settings.ts:294`, khớp plan. Ghi chú của plan rằng kiểm tra top-level bị bỏ qua khi `compoundSegments` có giá trị cũng được xác nhận bởi điều kiện `!compoundSegments` ở dòng 515. |
| "Cách sai dễ nhất: sửa `bash.ts:516` mà bỏ sót `bash.ts:545` … `:545` là chỗ một payload compound thực sự tới." | confirmed and load-bearing | Đã xác minh và đáng nâng mức độ: corpus top-level (≈15 lệnh ở dòng 350–370) đều đi qua đường non-compound, nên kỹ sư chỉ sửa `:516` sẽ thấy một suite hoàn toàn xanh trong khi đường compound vẫn còn lỗ hổng. Đây là lý do test ở bước 8 phải dùng lệnh compound chứ không chỉ `rm -rf /`. |


---


## W7. Thêm trục tuổi thọ prompt-cache theo từng tier vào model catalog qua cây KDL

**Thay đổi gì:** Thêm một trục KDL mới — thời gian sống (TTL) của prompt cache theo từng tier (`short`/`long`, tính bằng giây) — do rule sở hữu, mà không đụng tới field wire OpenAI đang có. **Wave:** 3a — Cache economics, core value (ship default-OFF). **Effort:** M.

**Người dùng thấy:** nội bộ, người dùng không thấy. W7 không thêm bề mặt nào cho người dùng và không đổi một byte request nào. Nó chỉ làm cho bảng TTL theo tier có nguồn gốc trở thành một biểu thức được trong cây rule, để W8 (cache warmer, mặc định tắt) đọc thay vì đọc hằng số 5 phút hard-code. Ship W7 mà không kèm W8 thì không có gì quan sát được thay đổi.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/catalog/src/types.ts` | sửa | Thêm hai type alias `CacheRetentionTier` và `PromptCacheLifetime`; thêm `promptCacheLifetime?: PromptCacheLifetime` vào `AnthropicCompat` (interface bắt đầu ở `:526`); thêm `"promptCacheLifetime"` vào union `Omit<...>` bên trong `ResolvedAnthropicCompat` (`:963`) và khai báo lại nó là optional trong intersection `& { ... }`. | Có |
| `packages/catalog/src/compat/axes.ts` | sửa | Đăng ký `"prompt-cache-lifetime": wire("promptCacheLifetime", ["anthropic", "bedrock"], "object")` trong bảng `AXES`, cạnh các trục prompt-cache của bedrock sẵn có ở `:216-218`. | Có |
| `packages/catalog/src/compat/rules/classes/anthropic.kdl` | sửa | Viết trục mới trong các khối rule có nguồn. Thêm ít nhất một khối dưới selector `on "anthropic" { ... }` (file đã có sẵn nhiều khối, ví dụ `:44`, `:183`) và, nếu Bedrock cũng phải đọc các con số này, nhân bản vào khối `on "amazon-bedrock" { ... }` ở `:255-360` cạnh các nhóm `prompt-cache-mode` / `prompt-cache-minimum-tokens` / `prompt-cache-maximum-checkpoints` hiện có. Dùng số nguyên giây không nhấy. | Có |
| `packages/catalog/src/compat/rules.json` | tạo | Sinh lại bằng `bun run gen:compat` và commit kèm thay đổi `.kdl`. Lệnh này **cũng** sinh lại `packages/catalog/src/compat/auth-ids.ts` và `packages/catalog/src/compat/provider-ids.ts` — phải kiểm tra diff của cả ba. | Có |
| `packages/catalog/test/prompt-cache-lifetime.test.ts` | tạo | Test mới ở mức rule, gồm bốn ca plan đã nêu: cả hai tier lộ ra qua `buildModel`; model không khai báo thì field resolve về `undefined` (khẳng định phủ định tường minh); `promptCacheBreakpointTtl` sẵn có vẫn resolve `"30m"`; payload wire của OpenAI không đổi. | Có |
| `packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` | tạo | Test hợp đồng wire chứng minh trục mới không làm dịch chuyển bất kỳ giá trị nào gửi đi OpenAI. Khẳng định `prompt_cache_options` đã build cho một model có `promptCacheLifetime` và một model không có là **giống hệt nhau**. | Có |

Lưu ý về độ chắc chắn: cả sáu file trên đều đã được kiểm chứng (`verified: true`). Hai điểm bổ sung đã kiểm chứng nhưng nằm ngoài danh sách file: shape `"object"` đã được compiler hỗ trợ — `objectValue()` trong `scripts/compat-compiler/compile-axes.ts` truyền thẳng `KdlScalar` (`string|number|boolean|null`) nên `{ short 300 }` một mình là một object thực sự partial. Và `bun run gen:compat` chạy sạch trong môi trường này, tạo **không** diff nào với file đã commit — nên generator là tất định và baseline sạch. Output: `wrote src/compat/rules.json (736 rules, 21 classes, 82 catalog providers, 91 auth providers, 221 files)`.

### Các bước

1. **`packages/catalog/src/types.ts:526`** — ngay **trên** dòng khai báo `export interface AnthropicCompat`, thêm hai type alias có export:
   `export type CacheRetentionTier = "short" | "long";` và
   `export type PromptCacheLifetime = Partial<Record<CacheRetentionTier, number>>;`
   Kèm doc comment nói rõ đơn vị là **giây** và một khoá vắng mặt nghĩa là thời gian sống của tier đó chưa biết. Đặt chúng cạnh các type liên quan cache khác (ngay trước `:526`), **không** đặt bên trong interface.

2. **`packages/catalog/src/types.ts:526` (thân `AnthropicCompat`)** — thêm `promptCacheLifetime?: PromptCacheLifetime;` với doc comment nói giá trị do KDL axis `prompt-cache-lifetime` sở hữu và **KHÔNG** được set khi cache behavior của provider chưa biết, nên consumer phải fail safe chứ không được tự đặt giá trị mặc định. **Không** thêm vào `OpenAICompat` (`:237`) — xem mục Đính chính, claim số 3.

3. **`packages/catalog/src/types.ts:963`** — `ResolvedAnthropicCompat` là `Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" | "thinkingLoopGuard">> & {...}`. Vì có `Required<>`, một field optional mới trên `AnthropicCompat` sẽ thành field **bắt buộc** trên kiểu resolved — trái với hợp đồng "fail-safe, vắng mặt khi chưa biết". Thêm `"promptCacheLifetime"` vào union `Omit<...>`, rồi khai báo lại `promptCacheLifetime?: PromptCacheLifetime;` bên trong intersection `& { ... }`, đúng như cách `streamIdleTimeoutMs` và `thinkingLoopGuard` đang được xử lý. **Bước bắt buộc**; bỏ qua thì kiểu sẽ nói dối về giá trị runtime.

4. **`packages/catalog/src/compat/axes.ts:216`** — trong record `AXES`, cạnh `"prompt-cache-maximum-checkpoints"` / `"prompt-cache-minimum-tokens"` / `"prompt-cache-mode"`, thêm:
   `"prompt-cache-lifetime": wire("promptCacheLifetime", ["anthropic", "bedrock"], "object"),`
   Tham số thứ ba là shape và **PHẢI** là `"object"` (một trục shape `scalar` chỉ nhận đúng một positional arg và không mang được khối con). Không truyền mảng `values` — từ vực đó chỉ áp cho shape scalar/array.

5. **`packages/catalog/src/compat/rules/classes/anthropic.kdl:44` (một khối `on "anthropic"`)** — viết rule bằng các giá trị có nguồn. Ví dụ về hình dạng bên trong một khối family/revision khớp:

   ```kdl
     prompt-cache-lifetime {
         short 300
         long 3600
     }
   ```

   Viết số **không nhấy** — KDL parse `300` thành number còn `"300"` thành string, và kiểu resolved đòi hỏi một `number`. Dùng `short`/`long` làm tên con (chữ thường, không dấu gạch nối, để `payloadKey()` chuyển thẳng nguyên vẹn). Có thể chỉ khai một tier trong một khối nhất định; payload thực sự partial. **Mọi giá trị đều cần comment nêu nguồn tài liệu của provider**, theo đúng quy ước sẵn có của file (xem comment model-card AWS ở `:252-254`).

6. **`packages/catalog/src/compat/rules/classes/anthropic.kdl:255` (`on "amazon-bedrock"`)** — nếu consumer Bedrock (`packages/ai/src/providers/amazon-bedrock.ts:960`) cũng cần đọc các con số này thì nhân bản trục vào khối `on "amazon-bedrock"`, cạnh các nhóm prompt-cache hiện có. Nếu Bedrock giữ nguyên boolean của nó thì bỏ qua bước này và đặt records của trục là `["anthropic"]` thôi. **Phải quyết OQ1 trước khi viết bất kỳ khối nào.**

7. **`repo root`** — chạy `bun run gen:compat`. Nó phải exit 0 và báo số rule/class. Rồi `git status --short packages/catalog/` — các thay đổi được mong đợi duy nhất là `rules.json` (cộng `auth-ids.ts` / `provider-ids.ts` nếu chúng dịch chuyển) cùng bản sửa `.kdl` của bạn. Commit các file sinh ra cùng với thay đổi rule, theo quy tắc Generated Files trong `AGENTS.md`.

8. **`packages/catalog/test/prompt-cache-lifetime.test.ts`** — viết test ở mức rule dùng các object `ModelSpec<"anthropic-messages">` tổng hợp (chép hình dạng helper `spec()` từ `anthropic-fable-5-1-cache-read.test.ts`), để khẳng định kiểm tra RULE chứ không kiểm tra JSON đã bundle. Phủ: (1) một model mà KDL khai báo sẽ lộ ra **cả hai** tier qua `buildModel(...).compat.promptCacheLifetime`; (2) một model không có khai báo nào resolve về `undefined` — **khẳng định tường minh**, đừng để nó pass một cách bỏ sót; (3) `buildModel` trên các fixture openai gpt-5.6 hiện có vẫn cho `promptCacheBreakpointTtl === "30m"` và `supportsPromptCacheBreakpoints === true`; (4) một ca phủ định chứng minh trục không rò sang provider mà nó không được viết cho.

9. **`packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts`** — viết test wire-unchanged. Build request params cho một model OpenAI Responses **có** set `promptCacheLifetime` và một model **không** có, rồi khẳng định `prompt_cache_options` sinh ra deep-equal. Với đường responses dùng `buildParams` đã export ở `packages/ai/src/providers/openai-responses.ts:1174`. Với đường completions xem OQ2 — `buildParams` ở `:1797` **không** được export, nên phải chọn trước chiến lược chặn. **Không** viết cái này thành một source-grep của hai dòng `ttl:` — `AGENTS.md` cấm khẳng định trên nội dung file triển khai, và test kiểu đó vẫn xanh ngay cả khi trục được nối ngược.

10. **`repo root`** — thêm một dòng entry dưới `## [Unreleased]` trong `packages/catalog/CHANGELOG.md` (và `packages/ai/CHANGELOG.md` nếu có đụng vào source của `packages/ai`). Giữ ngắn và hướng tới người dùng — đây là năng lực nội bộ, không có tác dụng nhìn thấy được, nên hãy diễn đạt theo năng lực mà nó mở ra. Đừng phê bình thứ tự mục changelog trong review; `bun run release` sẽ chuẩn hoá.

### Hình dạng code

```typescript
// packages/catalog/src/types.ts — đặt ngay trên `export interface AnthropicCompat` (:526)
export type CacheRetentionTier = "short" | "long";

/**
 * Thời gian sống của entry prompt cache theo từng tier, tính bằng GIÂY.
 * Một khoá vắng mặt nghĩa là thời gian sống của tier đó chưa biết — consumer
 * phải fail safe và không được thay bằng giá trị mặc định. Do KDL axis
 * `prompt-cache-lifetime` sở hữu; không bao giờ suy ra từ so khớp chuỗi
 * model-id trong TypeScript.
 */
export type PromptCacheLifetime = Partial<Record<CacheRetentionTier, number>>;

export interface AnthropicCompat {
  // …các field hiện có…
  /** Thời gian sống của entry prompt cache theo tier, tính bằng giây. Không set khi chưa biết. */
  promptCacheLifetime?: PromptCacheLifetime;
}

// packages/catalog/src/types.ts:963 — chính danh sách Omit giữ cho field này optional.
export type ResolvedAnthropicCompat = Required<Omit<AnthropicCompat,
  "streamIdleTimeoutMs" | "thinkingLoopGuard" | "promptCacheLifetime">> & {
  thinkingLoopGuard?: AnthropicCompat["thinkingLoopGuard"];
  streamIdleTimeoutMs?: number;
  /** Không set khi chưa biết; consumer fail safe. */
  promptCacheLifetime?: PromptCacheLifetime;
  officialEndpoint: boolean;
  firstPartyProvider: boolean;
};

// packages/catalog/src/compat/axes.ts — cạnh các trục prompt-cache của bedrock (:216-218)
"prompt-cache-lifetime": wire("promptCacheLifetime", ["anthropic", "bedrock"], "object"),

// packages/catalog/src/compat/rules/classes/anthropic.kdl — số nguyên giây không nhấy
on "anthropic" {
  family "opus" {
    revision "=4.5" {
      // <source: tài liệu cache-retention của provider>
      prompt-cache-lifetime {
        short 300
        long 3600
      }
    }
  }
}
```

### Hợp đồng test

Hợp đồng quan sát được là một hợp đồng **phủ định** cộng thêm một bảo đảm bao hàm. Nếu hồi quy, người tiêu dùng sẽ thấy:

- **(a)** Một model mà cây rule khai báo thời gian sống cache theo tier sẽ lộ ra **cả hai** tier qua `buildModel(...).compat.promptCacheLifetime` dưới dạng number tính bằng giây — consumer đọc field này sẽ biết TTL thật thay vì phải đoán. Nếu hồi quy ở đây, consumer lại phải quay về hằng số hard-code và phần cache economics của Wave 3a không có nền để dựng.
- **(b)** Một model không có khai báo nào sẽ resolve field về `undefined`, được **khẳng định tường minh**, để nhánh fail-safe của W8 được bảo vệ chứ không phải được giả định. Nếu trục bắt đầu default về `0` hoặc về một hằng số hard-code, test này đỏ.
- **(c)** `promptCacheBreakpointTtl` sẵn có vẫn resolve ra chuỗi `"30m"` cho GPT-5.6+ trên OpenAI API chính thức — chứng minh quyết định ở mục Đính chính (thêm một trục anh em, **không** mở rộng field wire hiện có) thực sự được tôn trọng. Nếu hồi quy, người tiêu dùng sẽ thấy request OpenAI đổi byte.
- **(d)** Object `prompt_cache_options` phát ra cho một model OpenAI **có** khai báo `promptCacheLifetime` deep-equal với cái phát ra cho model giống hệt **không** khai báo — chứng minh trục mới chắc chắn bất tác dụng với lưu lượng OpenAI. Nếu trục rò vào wire payload, người tiêu dùng sẽ thấy một trường lạ trong request.

Nếu một người triển khai sau này biến `promptCacheBreakpointTtl` thành một số theo tier, hoặc để trục mới rò vào wire payload OpenAI, thì **(c)** và **(d)** đều đỏ. Người tiêu dùng không thấy thay đổi wire và không thấy thay đổi hành vi cache nào từ work item này.

Hai file test:

- `packages/catalog/test/prompt-cache-lifetime.test.ts` — phủ (a), (b), (c) và một ca phủ định rò trục.
- `packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` — phủ (d).

### Xác minh

```bash
# CHẠY ĐƯỢC trong môi trường này (đã kiểm chứng):
bun run gen:compat            # exit 0; hiện regenerate ra không diff
bun run check:ts              # types + oxlint + oxfmt

# CHẠY ĐƯỢC nhưng nên giới hạn theo package (khuyến nghị, vì cây làm việc đang bị
# nhiễu bởi các phiên ghi file tạm thời song song — xem mục Cổng hoàn thành):
bun run --filter @oh-my-pi/pi-catalog check:types

# BỊ CHẶN trong môi trường này — đừng coi lỗi ở đây là hồi quy của bạn:
bun test packages/catalog/test/prompt-cache-lifetime.test.ts
bun test packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts
bun check
```

Lý do `bun test` bị chặn (đã kiểm chứng): `bun test` hỏng ngay lúc import **với mọi package**, kể cả `packages/catalog`, với lỗi `Failed to load pi_natives native addon for darwin-arm64` → `0 pass, 1 fail, 1 error`. Chuỗi gây ra là `build.ts` → `compat/resolve.ts:37` → `compat/cascade.ts:12` → `@oh-my-pi/pi-utils/lru` → `packages/natives`. `packages/catalog` không phụ thuộc trực tiếp pi-natives; nó bị kéo vào gián tiếp. Cách build được tài liệu hoá là `bun --cwd=packages/natives run build`, và lệnh đó shell ra `bun ../../scripts/bazel-natives.ts` — nhưng **cả bazel lẫn bazelisk đều không có trong PATH** ở đây (cargo thì có). Vì vậy addon không build được trong môi trường này. `bun check` = `check:ts` + `check:rs` chạy song song (`package.json:93`) nên thừa hưởng chính blocker đó.

Ngoài ra `bun run check:ts` hiện **không ổn định** trong cây làm việc này vì một lý do không liên quan tới W7: các phiên khác đang chạy song song ghi các file scratch type-probe không được track vào `packages/coding-agent/`, làm hỏng `check:types` của package đó (quan sát được lần lượt `w3-scratch-verify.ts`, rồi `__probe.types.ts`, rồi `__probe2.types.ts` qua ba lần chạy). Hãy chụp lại baseline của `check:ts` **trước khi bắt đầu**, và giới hạn cổng bằng `bun run --filter @oh-my-pi/pi-catalog check:types`.

### Cổng hoàn thành

Cả bốn điều kiện sau đều phải đúng:

1. `bun run gen:compat` exit 0 và `git status --short packages/catalog/` chỉ hiện đúng các file sinh lại đã mong đợi (kiểm tra **cả ba**: `rules.json`, `auth-ids.ts`, `provider-ids.ts`).
2. `bun run --filter @oh-my-pi/pi-catalog check:types` exit 0.
3. `bun run check:ts` không sinh lỗi **MỚI** ngoài baseline đã biết của các phiên chạy song song (chụp baseline trước khi bắt đầu).
4. Khi đã build được native addon: `bun test packages/catalog/test/prompt-cache-lifetime.test.ts packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` xanh, và suite sẵn có `packages/catalog/test/build.test.ts` "OpenAI explicit prompt-cache breakpoint compat" vẫn pass không đổi.

Cổng (1) một mình đã bắt được những lỗi nối dây có xác suất cao nhất: một directive chưa đăng ký sẽ fail với ``unknown directive `prompt-cache-lifetime` ``, một shape sai sẽ fail với `directive ... has a malformed value`, và một tên con camelCase sẽ fail với `must be kebab-case`.

**Cổng có thực sự đỏ được không:** Có, và nó đỏ theo một cách rất cụ thể, dễ chẩn đoán. `gen:compat` là một cổng thật: `collectAxis` / `axisFor` trong `scripts/compat-compiler/compile-axes.ts` ném `CompatCompileError` khi gặp directive lạ, một trục shape `scalar` bị đưa một khối con, một object child viết camelCase, hoặc cùng một trục bị gán hai lần trong một khối. Cổng kiểu cũng là cổng thật: quên bước `Omit` sẽ biến `promptCacheLifetime` thành một `PromptCacheLifetime` bắt buộc trên `ResolvedAnthropicCompat` trong khi `resolveAnthropicPolicy` không bao giờ gán nó — đó là lỗi kiểu hoặc một lời nói dối thầm lặng. **Cảnh báo phải thành thật, vì nó quan trọng:** nửa test của cổng này **KHÔNG chạy được** trong môi trường hiện tại, nên hôm nay chỉ cổng (1)–(3) là chạy được. Và phải nói rõ: compiler **sẽ không** phát hiện vấn đề "hai trục nói cùng một sự thật" — xem mục Đính chính, claim số 7 — nên cổng (1)–(3) có thể cùng xanh trong khi quyết định thiết kế vẫn chưa được đưa ra. Đó là lý do OQ1 được liệt kê như một câu hỏi mở chặn khởi đầu, không phải một chi tiết triển khai.

### Phụ thuộc

- **Cổng cứng, không phải một task:** phải có một bảng TTL prompt-cache theo từng provider và từng tier, có nguồn gốc, **trước khi** item này bắt đầu (open question 0 của plan). Chính các con số TTL là sản phẩm bàn giao của nghiên cứu đó; item này cung cấp schema, không cung cấp dữ liệu. Một kỹ sư không tìm được nguồn cho một con số thì phải để field ở `undefined` chứ không đoán — một TTL bị định giá quá cao làm số lần refresh phình lên trên một entry lẽ ra còn sống; bị định giá quá thấp thì chỉ mất thỉnh thoảng một lần miss có thể tránh được.
- **Không phụ thuộc cấu trúc.** Khác với phần lớn milestone này, W7 **không** phụ thuộc Wave 1 (W1/W2/W3/W5) — nó không chạm vào code lifecycle hay disposer nào. Có thể build song song với Wave 1.
- **W7 và W8 dự định ship như một đơn vị:** trục này một mình là trọng lượng chết, và warmer thì bị chặn nếu không có nó.

**Chặn:** W8 (cache warmer Anthropic, mặc định tắt) — bị chặn bởi đúng ý nghĩa của trục này. Đường hiện tại của W8 hard-code `ANTHROPIC_CACHE_TTL_MS = 5 * 60_000` tại `packages/ai/src/stream.ts:1209` và bật vô điều kiện tại `packages/coding-agent/src/sdk.ts:4111`; W8 chính là consumer sẽ đọc field mới.

### Cách sai dễ nhất

Làm theo đúng chỉ dẫn file của plan — tức thêm field ngay cạnh `promptCacheBreakpointTtl` ở `types.ts:403` — sẽ đặt nó lên `OpenAICompat` / `ResolvedOpenAISharedCompat` và làm cho trục vĩnh viễn vô hình với đúng consumer duy nhất cần tới nó. `applyWireAxes` (`resolve.ts:131-140`) chỉ gán một wire axis khi API của model ánh xạ tới một trong các records mà trục khai báo, và `API_COMPAT_RECORDS` ánh xạ `anthropic-messages` → `["anthropic"]` và `openai-responses` → `["openai-responses"]` — hai tập rời nhau. Một trục nằm trên các record OpenAI không bao giờ tới được một model Anthropic, nên field sẽ type-check, compile, regenerate sạch, và vẫn chết lặng lẽ ở runtime.

Sai dễ thứ hai: chép nguyên văn anchor `:258-266` và đặt rule chỉ bên trong `on "amazon-bedrock"`, khiến Anthropic first-party — chính là họ model mà warmer của W8 phục vụ — không có giá trị nào.

**Không cái sai nào trong hai cái đó tạo ra một build đỏ.**

### Cần người quyết

- **OQ1 — CHẶN KHỞI ĐỘNG.** Đã tồn tại một trục anh em đã được nối đầy đủ: `supports-long-prompt-cache-retention` (`axes.ts:153`, records `[...OAI, "bedrock"]`), với hai consumer đang sống gate `ttl: "1h"` tại `packages/ai/src/providers/amazon-bedrock.ts:960` và `packages/ai/src/providers/openai-responses.ts:1253`, resolve ở `resolve.ts:721` và `:830` với baseline hard-code `false` tại `resolve.ts:899`. Nó được khai báo ở `anthropic.kdl:266, 286, 292, 317, 328, 341, 349`. Một khi `promptCacheLifetime` tồn tại, đây là **hai nguồn sự thật cho cùng một điều**. Khối F5 của plan đề xuất: (a) xoá boolean và chuyển cả hai consumer sang `promptCacheLifetime?.long`, hoặc (b) giữ cả hai với một phân chia ý nghĩa tường minh. Lưu ý (a) là một thay đổi phá vỡ, chạm hai provider và một lần regenerate `models.json`, và lớn hơn hẳn item cỡ M này. **Cần một người quyết.** Khuyến nghị: giữ boolean cho milestone này (nó đã ship và đã đúng), giới hạn trục mới về `["anthropic"]` thôi, và mở một work item riêng cho việc hợp nhất — nhưng đó là khuyến nghị, không phải quyết định có thể tự ý đưa ra.
- **OQ2 — chặn bước 9.** Test (4) của plan yêu cầu build request params "qua đường public của provider" cho **cả** `openai-responses.ts` lẫn `openai-completions.ts`. Làm được với responses (`buildParams` được export ở `:1174` và gọi policy fn ở `:1365`) nhưng **không** làm được với completions: `buildParams` ở `:1797` là module-private, và policy fn `applyOpenAIChatCompletionsPromptCachePolicy` (`:1767`) cũng private, chỉ reachable từ `:1999`. Phải chọn một: (a) export `buildParams` từ `openai-completions` (một thay đổi production chỉ để test được — rẻ nhất, nhưng mở rộng public surface), (b) chạy `streamOpenAICompletions` với fetch bị chặn (hoàn toàn public, nặng hơn, cần mock server), hoặc (c) phủ responses qua `buildParams` đã export và phủ completions qua một test stream với mock-fetch. **Ghi lựa chọn vào comment đầu file test.**
- **OQ3.** `promptCacheLifetime` có nên cho người dùng ghi đè trong `models.yml` không? Nếu có thì nó cũng phải được thêm vào schema omptype viết tay ở `packages/coding-agent/src/config/models-config-schema-bundle.ts` (**không** sinh tự động — file này viết tay; field anh em `supportsLongPromptCacheRetention?: "boolean"` xuất hiện ở `:70` và `:96`). Nếu trục thuần rule-owned thì để ngoài và nói rõ là vậy. Khuyến nghị mặc định: để ngoài, vì các tầng sở hữu trong `AGENTS.md` đặt việc này thuộc cây KDL.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "Repo is at git HEAD 5873776 on branch milestone-1." | stale | HEAD thực tế là `ecd516f` (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`). Branch `milestone-1` là đúng. Số dòng trong plan vẫn resolve đúng với commit này — từng cái đều đã kiểm chứng — nên plan được viết trên nội dung tương đương dù SHA khác. Bằng chứng: `git log --oneline -1` → `ecd516f feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers` |
| Danh sách anchor: `types.ts:403` (`promptCacheBreakpointTtl?: "30m"`), `:795` (resolved), `:393` (`promptCacheSessionHeader`), `:863-865` (key union), `axes.ts:106`, `resolve.ts:533 & :723`, `openai-responses.ts:1168`, `openai-completions.ts:1791`, `anthropic.kdl:258-266` (+ lặp lại ở `:263, :269, :283, :289, :298`), `package.json:158`, `stream.ts:1209`, `sdk.ts:4111`. | confirmed | Không cần sửa — mọi anchor tái lập chính xác. Mục plan này hiếm khi có nền tảng chắc như vậy. Chuỗi `ttl: promptCache.ttl ?? model.compat.promptCacheBreakpointTtl` xuất hiện nguyên văn ở cả hai dòng consumer, và các lần lặp KDL rơi đúng vào những dòng đã nêu. Bằng chứng: `git grep` và `sed` trên từng anchor; `grep -n 'prompt-cache\|supports-long-prompt-cache-retention' packages/catalog/src/compat/rules/classes/anthropic.kdl` trả về 258,259,260,263,264,265,266,269,283,289,298 như đã nêu. |
| Field mới nên khai báo "ngay cạnh `promptCacheBreakpointTtl?: "30m"` ở `:403`, resolve ngay cạnh `:795`, và thêm vào key union ở `:863-865`". | wrong | `types.ts:403` nằm trong `OpenAICompat` (khai báo ở `:237`); `:795` nằm trong `ResolvedOpenAISharedCompat` (khai báo ở `:745`); `:863-865` nằm trong `Required<Omit<OpenAICompat, ...>>` của `ResolvedOpenAICompat` (khai báo ở `:823`). Cả ba đều là shape chỉ-dành-cho-OpenAI. Nhưng consumer của W7+W8 là warmer Anthropic, và `applyWireAxes` (`resolve.ts:131-140`) chỉ gán wire axis khi API của model ánh xạ tới một trong các records mà trục khai báo, với `API_COMPAT_RECORDS` ánh xạ `anthropic-messages` → `["anthropic"]` và `openai-responses` → `["openai-responses"]` — rời nhau. Một trục khai trên các shape OpenAI không bao giờ tới được model Anthropic. Field thuộc về `AnthropicCompat` (`:526`) và `ResolvedAnthropicCompat` (`:963`), với records của trục là `["anthropic"]` (cộng `"bedrock"` nếu OQ1 đi hướng đó). Làm theo plan đến từng chữ sẽ ra code compile, regenerate và qua mọi cổng trong khi chết ở runtime. Bằng chứng: `types.ts:237` `export interface OpenAICompat`; `:526` `export interface AnthropicCompat`; `:745` `export interface ResolvedOpenAISharedCompat`; `:963` `export type ResolvedAnthropicCompat`; `axes.ts:369-381` `API_COMPAT_RECORDS` (`"anthropic-messages": ["anthropic"]`); `resolve.ts:131-140` `applyWireAxes` gate trên `meta?.records.some(record => records.includes(record))`. |
| (ngầm, plan không nói) rằng thêm một field optional vào một shape compat đã resolve chỉ là sửa một dòng. | incomplete | `ResolvedAnthropicCompat` là `Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" | "thinkingLoopGuard">> & {...}`. Vòng bọc `Required<>` khiến `promptCacheLifetime?:` mới trên `AnthropicCompat` trở thành `PromptCacheLifetime` **bắt buộc** trên kiểu resolved, trái trực tiếp với yêu cầu cứng của chính plan là mặc định phải **vắng mặt** khi chưa biết. Field buộc phải được thêm vào union `Omit` và khai báo lại optional trong intersection `& {...}` — đúng mẫu file đã dùng cho `streamIdleTimeoutMs` và `thinkingLoopGuard`. Plan không hề nhắc tới, và làm sai thì kiểu sẽ claim một giá trị mà resolver không bao giờ gán. Bằng chứng: `types.ts:963` `export type ResolvedAnthropicCompat = Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard">> & {` |
| Trục mới nên được viết "cạnh `prompt-cache-mode` / `prompt-cache-minimum-tokens` / `prompt-cache-maximum-checkpoints` ở `:258-266` (và các lần lặp ở `:263, :269, :283, :289, :298`)". | misleading | Số dòng đúng, nhưng phần bị bỏ sót mới là phần mang tải trọng: tất cả những trục prompt-cache đó nằm bên trong khối `on "amazon-bedrock" { ... }` mở ra ở `anthropic.kdl:255`, nên chúng chỉ áp dụng cho provider `amazon-bedrock`. Chép nguyên anchor này sẽ viết rule chỉ cho Bedrock và để Anthropic first-party — họ model mà warmer của W8 thực sự phục vụ — không có gì. Rule bắt buộc phải xuất hiện thêm dưới một selector `on "anthropic" { ... }` (file có nhiều khối như vậy: `:14, :44, :64, :183`). Bằng chứng: `sed -n '250,360p' packages/catalog/src/compat/rules/classes/anthropic.kdl` — dòng 255 là `on "amazon-bedrock" {`, và các khối `on "anthropic"` của file nằm ở 14, 44, 64, 183. |
| Test (4) nên khẳng định payload gửi đi "tại `openai-responses.ts:1168` và `openai-completions.ts:1791`" bằng cách build request params qua đường public của provider. | partly-wrong | Chỉ làm được cho đường responses. `openai-responses.ts:1174` là `export function buildParams` và nó gọi `applyOpenAIResponsesPromptCachePolicy` ở `:1365`, nên params reachable. Nhưng `openai-completions.ts:1797` là `function buildParams(` không có export, và policy function `applyOpenAIChatCompletionsPromptCachePolicy` (`:1767`) cũng private, chỉ reachable từ `:1999`. Không có đường public nào tới các params đó. Cần lưu ý thêm: hướng dẫn tiếp theo của chính plan (dòng 3179) cấm viết cái này thành source-grep của hai dòng `ttl:` — test kiểu đó vẫn xanh ngay cả khi trục được nối ngược, và `AGENTS.md` cấm source-grep hoàn toàn. Đã ghi lại thành OQ2 với ba lựa chọn cụ thể. Bằng chứng: grep `^export ` trong `openai-completions.ts` chỉ ra `applyOpenRouterRoutingVariant`, `isOpenAICompletionsProgressChunk`, `OpenAICompletionsOptions`, `streamOpenAICompletions`, `parseChunkUsage`, `convertMessages` — không có `buildParams`; `sed -n '1797,1800p'` cho thấy `function buildParams(`. |
| (khối F5 của plan) "The boolean axis doesn't set priority=, so resolve will throw AmbiguousOverlapError — you'll hit it at bun run gen:compat." | wrong | `AmbiguousOverlapError` chỉ nổ lên khi hai rule **cùng rank** tranh **cùng một axis key** (`cascade.ts:245-253` khoá winner theo axis; doc của class ở `cascade.ts:6-9` nói các rule resolve độc lập theo từng axis). Hai axis **khác nhau** không bao giờ va nhau, và `collectAxis` chỉ lỗi khi một khóa bị gán lặp trong cùng một khối. Nên viết `prompt-cache-lifetime` cạnh `supports-long-prompt-cache-retention` sẽ **KHÔNG** tạo lỗi compiler. Vấn đề hai-nguồn-sự-thật là có thật và tinh thần `AGENTS.md` cấm nó, nhưng đó là một quyết định thiết kế không có cổng tự động nào — điều này làm nó **càng** cần được giải quyết có chủ đích (OQ1) chứ không kém đi. Plan hứa một tripwire compiler không tồn tại. Bằng chứng: `cascade.ts:6-9` "per axis the matching rule with the greatest (model-selector exactness, constrained-dimension count, priority) tuple wins, and an equal-tuple same-axis contest throws AmbiguousOverlapError"; `cascade.ts:245-253` khoá trên `winners[axis]`; `collectAxis` trong `compile-axes.ts` chỉ lỗi khi `axis.key in map`. |
| Xác minh là `bun run gen:compat && bun check && bun test packages/catalog/test/prompt-cache-lifetime.test.ts`. | partly-wrong | `bun test` bị chặn trong môi trường này với **mọi** package, kể cả `packages/catalog`, vốn không phụ thuộc trực tiếp pi-natives nhưng bị kéo vào gián tiếp qua `build.ts` → `compat/resolve.ts:37` → `compat/cascade.ts:12` → `@oh-my-pi/pi-utils/lru`. Cách build được tài liệu hoá shell ra bazel, và cả bazel lẫn bazelisk đều không có trong PATH. `bun check` = `check:ts` + `check:rs` chạy song song (`package.json:93`) và thừa hưởng chính blocker đó. `bun run gen:compat` **có** chạy — đã chạy và cho ra không diff nào với `rules.json` đã commit, xác nhận cả generator là tất định lẫn baseline sạch. Riêng `bun run check:ts` hiện không đáng tin trong cây làm việc này vì một lý do không liên quan tới W7: các phiên khác đang ghi các file scratch type-probe không được track vào `packages/coding-agent/`, làm hỏng `check:types` của package đó (quan sát `w3-scratch-verify.ts`, rồi `__probe.types.ts`, rồi `__probe2.types.ts` qua ba lần chạy liên tiếp). Hãy giới hạn cổng bằng `bun run --filter @oh-my-pi/pi-catalog check:types` và chụp baseline `check:ts` trước khi bắt đầu. Bằng chứng: `bun test packages/catalog/test/descriptors.test.ts` → 0 pass, 1 fail, `Failed to load pi_natives native addon for darwin-arm64`; `bun -e 'import("@oh-my-pi/pi-catalog/build")'` → cùng lỗi, trong khi `import("@oh-my-pi/pi-catalog/compat/axes")` → OK; `which bazel bazelisk` → not found; `bun run gen:compat` → `wrote src/compat/rules.json (736 rules, 21 classes, 82 catalog providers, 91 auth providers, 221 files)` với `git diff --stat` rỗng; ba lần `bun run check:ts` liên tiếp mỗi lần fail trên một file probe khác tên. |
| Sinh lại và commit `packages/catalog/src/compat/rules.json` kèm thay đổi `.kdl`. | incomplete | `bun run gen:compat` ghi **BA** file, không phải một: `rules.json` cộng `packages/catalog/src/compat/auth-ids.ts` và `packages/catalog/src/compat/provider-ids.ts` (xem `scripts/compile-compat.ts`). Thực tế hai file `.ts` chỉ dịch chuyển nếu bề mặt auth/provider thay đổi, điều mà một trục cache-lifetime không nên có, nhưng người triển khai vẫn phải kiểm tra `git status` cho cả ba thay vì giả định chỉ `rules.json` dịch chuyển. Bằng chứng: `scripts/compile-compat.ts` ghi `outPath`, `authIdsPath` và `providerIdsPath` trong một lần chạy. |


---


## W8. Biến vòng prompt-cache refresh đang có thành một vòng có cổng chi phí (không phải warmer thứ hai)

**Thay đổi gì:** Vòng lặp keep-alive prompt-cache đang chạy vô điều kiện hôm nay được gộp về một cờ tri-state duy nhất (`off` / `cost-gated` / `always`) cộng một cổng kinh tế, để thứ duy nhất tiêu tiền của người dùng là thứ họ đã tự bật.
**Wave:** 3a — Cache economics (ships together with W7, default-OFF).
**Effort:** M — bốn thay đổi vào code đang chạy, không phải port một package. Phần lớn công việc là viết lại các test đang khoá hành vi cũ, chứ không phải viết production code mới. Dành thêm cẩn thận cho test duy nhất phải ĐỔI kỳ vọng thay vì chỉ thêm một case.

**Người dùng thấy:** Có setting mới `providers.promptCacheRefresh` (`off` mặc định, `cost-gated`, `always`). Ở `off` — mặc định cho release đầu — các lần replay keep-alive 4m45s vô điều kiện đang ship hôm nay dừng hẳn, nên hoá đơn Anthropic của người dùng giảm và không có gì được chi tiêu. `always` khôi phục đúng hành vi hôm nay. `cost-gated` chỉ warm khi lợi ích kỳ vọng vượt sàn $0.05, và warm ở pha idle cần khoảng $0.35 chi phí miss mới thực sự bắn — nên ở đa số phiên nó đúng là không làm gì cả, và release notes phải nói thẳng điều đó ra, nếu không người đọc sẽ tưởng tính năng hỏng. Đây là thay đổi hành vi trên một tính năng đang chạy, nên cần một changelog entry nói thẳng.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/ai/src/stream.ts` | sửa | Thay `ANTHROPIC_CACHE_TTL_MS` hard-code (`:1209`) bằng `promptCacheLifetime` theo tier của W7 (thiếu ⇒ không warm, fail safe); thêm field `#decision` / `#phase` và mở rộng `arm()` (`:1237`) thành `(plan, cacheTouchedAtMs, decision, phase)`; `#refresh()` đọc phase probe ngay trước lúc quyết định; tính `warmCost`/`missCost` trong `armRefresh` (`:1454`) từ `model` + `message.usage` vốn đã có sẵn trong scope; nới `supportsAnthropicCacheRefresh` (`:1292`) thành KDL-driven cho trục api/provider/transport nhưng GIỮ `isLeakedThinkingHealExempt(model)`; bỏ hard-code `cacheRetention: "short"` ở warm request (`:1370`) thay bằng `resolveCacheRetention(options.cacheRetention)`; nới cổng retention ở `:1431`; giữ nguyên replay guard (`:1369`). | có — mọi line number trong spec cho `stream.ts` đã tái lập bằng `grep -n` trên HEAD `ecd516f` |
| `packages/ai/src/types.ts` | sửa | `:439`: mở rộng `anthropicCacheRefresh?: boolean` thành `anthropicCacheRefresh?: "off" \| "cost-gated" \| "always"` (thêm union type có tên được export; `undefined` giữ nguyên nghĩa cũ là off, nên mọi consumer hiện có bỏ trống field vẫn xanh). Thêm `anthropicCacheRefreshPhase?: () => "streaming" \| "idle"` ngay cạnh — là probe, không phải literal. | có — `:439` chính xác. Đây là mở rộng public type, nên là breaking change với mọi caller bên ngoài truyền boolean. |
| `packages/coding-agent/src/sdk.ts` | sửa | ở `:4111` thay `anthropicCacheRefresh: true` hard-code bằng tri-state đọc từ settings, và thêm phase probe `() => (agent.state.isStreaming ? "streaming" : "idle")`. `agent` đã có sẵn trong closure này — `agent.state.tools` được đọc ở `:4105`. KHÔNG đụng vào `transformProviderContext` (`:3949`); nó làm việc trên messages và không có đường tới stream options. | có — PLAN nói `:4105` — THỰC TẾ là `:4111`. Plan lệch 6 dòng; mọi anchor sdk.ts khác trong plan cũng lệch. Xem mục Đính chính. |
| `packages/coding-agent/src/session/settings.ts` | sửa | Đăng ký `providers.promptCacheRefresh` như enum tri-state theo khuôn `cfgProvidersAnthropicSlowMode` ở `:863` (`register({ id, type: "enum", values: [...] as const, default: "off" as const })`), mặc định `"off"`. | có — PLAN nói `:860` — THỰC TẾ là `:863`. Tiền lệ `slowMode` cố ý KHÔNG mang block `ui`; phải quyết rõ setting này có UI `/settings` hay chỉ script-only như model của nó. |
| `packages/ai/test/anthropic-cache-refresh.test.ts` | sửa | Thêm test (0)–(6) và VIẾT LẠI (không xoá) case retention ở `:335`. Đồng thời xác minh case OAuth chưa được plan nhắc tới ở `:359` vẫn xanh sau khi nới cổng `:1431` — nó khoá cùng một lỗ hổng bằng đường khác. | có — 386 dòng, 7 khối `it()` ở `:237, :257, :279, :297, :318, :335, :359`. Helper có sẵn: `createFetch`, `finishRequest`, `drainUntil`, `CACHE_REFRESH_DELAY_MS`, `withOfficialAnthropicEndpoint`. |
| `packages/ai/CHANGELOG.md` | sửa | Entry dưới `## [Unreleased]` → `### Changed`, nói thẳng rằng keep-alive prompt-cache vô điều kiện nay mặc định tắt và rằng warm ở pha idle cần khoảng $0.35 miss cost mới bắn. | **KHÔNG** — path tồn tại theo quy ước (`packages/*/CHANGELOG.md` theo AGENTS.md) nhưng không được mở trong lúc phân tích; phải xác nhận đúng file và heading `### Changed` trước khi sửa. |

### Các bước

1. **Làm vỡ môi trường trước, đừng sửa code vội.** Chạy `bun install` và `bun run build` (hoặc tối thiểu `bun run build:native`) để có native addon. Xác nhận `bun test packages/ai/test/anthropic-cache-refresh.test.ts` báo 7 pass / 0 fail **trước khi** sửa bất kỳ dòng production code nào, và ghi lại baseline xanh đó. Mọi cổng trong spec này vô nghĩa nếu thiếu nó — hiện tại file lỗi ra với thông báo gây hiểu lầm `Cannot find module '@oh-my-pi/pi-catalog/build'`, mà thực ra là `@oh-my-pi/pi-natives` không load được từ bên dưới. *(anchor: `packages/ai/src/stream.ts:1209`)*
2. **Xác nhận W7 đã landed:** `grep -rn promptCacheLifetime packages/catalog/src packages/ai/src` phải có hit. Nếu không có, DỪNG — W8 bị chặn cứng bởi W7. Đồng thời xác nhận helper kinh tế của F6 đã landed: `grep -rn 'decideWarm' packages/` phải trả về một định nghĩa. Nếu F6 vắng, DỪNG — kiểu `WarmDecision` mà spec này luồn qua `arm()` không tồn tại ở bất kỳ đâu trong repo. *(anchor: `packages/ai/src/stream.ts:1209`)*
3. **Xoá** `const ANTHROPIC_CACHE_TTL_MS = 5 * 60_000;`. Luồn `promptCacheLifetime` theo tier của W7 vào thay thế. Model không khai báo lifetime cho ra `undefined` và **không được** warm — đó là hợp đồng âm của W7 và W8 là consumer duy nhất của nó. Để nguyên `ANTHROPIC_CACHE_REFRESH_LEAD_MS` (`:1210`), `ANTHROPIC_CACHE_REFRESH_LIMIT` (`:1211`) và `ANTHROPIC_CACHE_REFRESH_STATE_KEY` (`:1212`). *(anchor: `packages/ai/src/stream.ts:1209`)*
4. **Mở rộng** `arm()` thành `arm(plan: AnthropicCacheRefreshPlan, cacheTouchedAtMs: number, decision: WarmDecision, phase: () => "streaming" | "idle"): void`. Thêm hai field ES `#private` mới — `#decision` và `#phase` — cạnh `#controller` / `#generation` / `#plan` / `#refreshesRemaining` / `#timer` sẵn có. Dùng `#private`, không bao giờ dùng từ khoá TS `private`. `#schedule` vẫn private và **không được** tự định giá bất cứ thứ gì; nó chỉ hỏi verdict đã quyết rồi. *(anchor: `packages/ai/src/stream.ts:1237`)*
5. **Trong `#refresh()`**, gọi phase probe NGAY TRƯỚC lúc quyết định — không phải lúc `arm()`. Ở `arm()` run vừa mới ổn định, đọc `isStreaming` ở đó gần như luôn ra `"streaming"` và nhánh 0.15 chết. Đưa kết quả vào quyết định của F6 qua `WarmDecisionInput.idle`. Giữ nguyên generation guard, phép giảm refresh-count và teardown `cacheTouchedAtMs === undefined` như hiện tại. *(anchor: `packages/ai/src/stream.ts:1258`)*
6. **Tính kinh tế trong `armRefresh`**, nơi `model` và `message.usage.{input,output,cacheRead,cacheWrite}` ĐÃ có sẵn trong scope — bail sẵn có ở `:1458` vốn đã đọc `message.usage.cacheRead + message.usage.cacheWrite`. Truyền `WarmDecision` sinh ra vào `refreshState.arm(...)` ở `:1465`. KHÔNG chuyển việc định giá vào `AnthropicCacheRefreshState`: pi định giá từ `SessionEntry[]`, mà `packages/ai` không có quyền truy cập cũng không được phép giành lấy. *(anchor: `packages/ai/src/stream.ts:1454`)*
7. **Thêm các hằng số đã port, giữ nguyên phân biệt pha** — chính phân biệt đó là toàn bộ ý nghĩa của chúng: `MAX_WARMING_AGE_MS = 60 * 60_000` (chỉ STREAMING), `MAX_IDLE_WARMING_AGE_MS = 30 * 60_000` (chỉ IDLE, ngắn hơn vì ước tính continuation suy giảm theo tuổi), `CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS_USD = 0.05`, `IDLE_CONTINUATION_PROBABILITY = 0.15` (chỉ IDLE) và `STREAMING_CONTINUATION_PROBABILITY = 1.0`. Copy số mà làm phẳng hai pha là sai lầm đắt thứ hai của mục này. *(anchor: `packages/ai/src/stream.ts:1209`)*
8. **Ở `types.ts:439`**, mở rộng `anthropicCacheRefresh?: boolean` thành `anthropicCacheRefresh?: "off" | "cost-gated" | "always"` và thêm field anh em `anthropicCacheRefreshPhase?: () => "streaming" | "idle"`. Export union dưới một cái tên thật (ví dụ `AnthropicCacheRefreshMode`) — không lặp lại string literal. `undefined` phải giữ nghĩa là off. Gộp tri-state trở lại thành boolean ở biên sdk làm `always` và `cost-gated` không phân biệt được, chỉ còn hai trạng thái reachable và cổng không có cách nào biết nó được phép bỏ qua. *(anchor: `packages/ai/src/types.ts:439`)*
9. **Ở `stream.ts:1292`**, nới `supportsAnthropicCacheRefresh` thành KDL-driven cho trục api / provider / transport. HÔM NAY có **BỐN** điều kiện, không phải ba — `model.api === "anthropic-messages" && model.provider === "anthropic" && model.transport !== "pi-native" && isLeakedThinkingHealExempt(model)` — và điều kiện thứ tư PHẢI SỐNG. Bỏ nó âm thầm là loại mọi model không phải leaked-thinking-heal exempt khỏi warm, tức là đổi hành vi trên đúng con đường tốn tiền. Theo AGENTS.md, phần mở rộng phải do một fact KDL dẫn, không bao giờ là một danh sách id hard-code thứ hai trong TS. Không provider nào khác được trở thành warmable. *(anchor: `packages/ai/src/stream.ts:1292`)*
10. **Ở `stream.ts:1431`**, bỏ `cacheRetention: "short"` hard-code trong warm request ở `:1370` — truyền `resolveCacheRetention(options.cacheRetention)` xuyên qua thay thế — và nới bail tương ứng ở `:1431` (`resolveCacheRetention(options.cacheRetention) !== "short"`). Hôm nay người dùng đặt `providers.cacheRetention = "long"` nhận được KHÔNG warm gì, điều này ngược: trường hợp long-retention chính là trường hợp context lớn nhất. Sau thay đổi này, test OAuth ở test:359 vẫn phải xanh — nó giữ xanh vì OAuth phát `ttl: "1h"` breakpoint, nên `hasShortAnthropicMessageBreakpoint` (`:1322`) vẫn bail lúc arm. *(anchor: `packages/ai/src/stream.ts:1431`)*
11. **Ở `stream.ts:1369`**, để nguyên replay guard đúng chỗ. LƯU Ý: nó KHÔNG phải hàm tên `isReplayable` — plan sai chỗ này. HEAD diễn đạt nó là `isAnthropicThinkingActive` (`:1348`) dẫn tới `anthropicCacheRefreshRequest: !thinkingEnabled` ở `:1369` cộng với `maxTokens: thinkingEnabled ? options?.maxTokens : 0`. Anthropic suy ra `budget_tokens` từ `max_tokens`, nên một lần replay dưới trần output khác sẽ đổi cache key **và** khiến model suy nghĩ hàng nghìn token. Khi bạn tổng quát hoá nó theo từng API, nhánh non-reasoning phải sống: một request không reasoning là replayable trên MỌI model. *(anchor: `packages/ai/src/stream.ts:1369`)*
12. **Ở `settings.ts:863`**, đăng ký `providers.promptCacheRefresh` như enum tri-state theo khuôn `cfgProvidersAnthropicSlowMode` (`register({ id, type: "enum", values: [...] as const, default: "off" as const })`), mặc định `"off"`. Không có hook override extension cho quyết định warming ở milestone 1 — tri-state cộng phase probe CHÍNH LÀ toàn bộ bề mặt công khai của W8. *(anchor: `packages/coding-agent/src/session/settings.ts:863`)*
13. **Ở `sdk.ts:4111`**, thay `anthropicCacheRefresh: true` hard-code bằng giá trị đọc từ settings, và thêm phase probe `() => (agent.state.isStreaming ? "streaming" : "idle")`. `agent` đã có sẵn trong scope — `agent.state.tools` được đọc ở `:4105`, bốn dòng phía trên. KHÔNG đụng `transformProviderContext` (`:3949`): nó biến đổi messages và không với tới được stream options, nên một scheduler treo vào đó thậm chí không dựng nổi. Rồi thêm changelog entry — lần này ship một thay đổi hành vi trên một tính năng đang chạy vô điều kiện. *(anchor: `packages/coding-agent/src/sdk.ts:4111`)*
14. **Ở `test/anthropic-cache-refresh.test.ts:335`**, viết test (0)–(6) theo hợp đồng test, rồi VIẾT LẠI case ở `:335` — hiện nó đang khoá đúng lỗ hổng mà thay đổi (10) sửa, nên kỳ vọng của nó phải lật thành "tier long CÓ warm, và lần warm đó vẫn phát `ttl: \"1h\"`". Xoá nó để lấy xanh là không chấp nhận được. Sau đó chạy lại toàn bộ file và xác nhận cả 7 case gốc lẫn các case mới đều xanh. *(anchor: `packages/ai/test/anthropic-cache-refresh.test.ts:335`)*

### Hình dạng code

```typescript
// packages/ai/src/types.ts — public surface widening

export type AnthropicCacheRefreshMode = "off" | "cost-gated" | "always";

export interface SimpleStreamOptions {
	// ...unchanged...
	/** Widened from `boolean`. `undefined` keeps its old meaning: off. */
	anthropicCacheRefresh?: AnthropicCacheRefreshMode; // was: boolean — :439
	/** Probe, NOT a literal: the phase can only be known when the timer fires. */
	anthropicCacheRefreshPhase?: () => "streaming" | "idle";
}

// packages/ai/src/stream.ts — economics live at the arm site, never inside the scheduler

const ANTHROPIC_CACHE_REFRESH_LEAD_MS = 15_000; // :1210 — unchanged
const ANTHROPIC_CACHE_REFRESH_LIMIT = 3; // :1211 — unchanged

// Phase distinction is load-bearing; do not flatten it.
const MAX_WARMING_AGE_MS = 60 * 60_000; // STREAMING only
const MAX_IDLE_WARMING_AGE_MS = 30 * 60_000; // IDLE only — shorter; estimates decay with age
const CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS_USD = 0.05;
const STREAMING_CONTINUATION_PROBABILITY = 1.0;
const IDLE_CONTINUATION_PROBABILITY = 0.15; // IDLE only

class AnthropicCacheRefreshState implements ProviderSessionState {
	#controller: AbortController | undefined;
	#generation = 0;
	#plan: AnthropicCacheRefreshPlan | undefined;
	#refreshesRemaining = 0;
	#timer: NodeJS.Timeout | undefined;
	#decision: WarmDecision | undefined; // new — decided upstream, never priced here
	#phase: (() => "streaming" | "idle") | undefined; // new — probe, not a value

	arm(
		plan: AnthropicCacheRefreshPlan,
		cacheTouchedAtMs: number,
		decision: WarmDecision,
		phase: () => "streaming" | "idle",
	): void {
		this.cancel();
		this.#plan = plan;
		this.#decision = decision;
		this.#phase = phase;
		this.#refreshesRemaining = ANTHROPIC_CACHE_REFRESH_LIMIT;
		this.#schedule(cacheTouchedAtMs, this.#generation);
	}

	async #refresh(generation: number): Promise<void> {
		// ...existing generation / refresh-count guards unchanged...
		// Probe is read HERE, immediately before the decision — reading it in arm()
		// yields "streaming" almost always and kills the 0.15 branch entirely.
		const idle = (this.#phase?.() ?? "streaming") === "idle";
		if (!this.#decision.warm) return;
		// ...existing plan.refresh(controller) body unchanged...
	}

	cancel(): void { /* unchanged — already aborts #controller; no W2 needed */ }
	close(): void {
		this.cancel();
	}
	#schedule(cacheTouchedAtMs: number, generation: number): void { /* unchanged shape */ }
}

// packages/ai/src/stream.ts:1454 — armRefresh is the ONE frame where price inputs exist

const armRefresh = (message: AssistantMessage): void => {
	if (
		message.stopReason === "error" ||
		message.stopReason === "aborted" ||
		message.usage.cacheRead + message.usage.cacheWrite <= 0 ||
		cacheTouchedAtMs === undefined ||
		capturedPayload === undefined ||
		!hasShortAnthropicMessageBreakpoint(capturedPayload) // :1322 — fifth arm-time condition
	) {
		return;
	}
	// `model` and the full usage breakdown are already in scope at :1454.
	const decision: WarmDecision = decideWarm({
		model,
		idle: false, // real value substituted at timer fire from the probe
		ageSinceTouchMs: Date.now() - cacheTouchedAtMs,
		usage: {
			input: message.usage.input,
			output: message.usage.output,
			cacheRead: message.usage.cacheRead,
			cacheWrite: message.usage.cacheWrite,
		},
	});
	refreshState.arm(
		createAnthropicCacheRefreshPlan(model, context, options, capturedPayload),
		cacheTouchedAtMs,
		decision,
		options?.anthropicCacheRefreshPhase ?? (() => "streaming"),
	);
};

// packages/coding-agent/src/sdk.ts:4111 — one switch, on the switch that is already live

streamFn: (streamModel, context, streamOptions) => {
	// ...unchanged notify / externalThinking / fallbackCreditRedemption prelude...
	return primaryStreamFn(streamModel, context, {
		...streamOptions,
		anthropicCacheRefresh: cfgProvidersPromptCacheRefresh.get(settings), // was: true
		// `agent` is already in scope here (agent.state.tools is read at :4105).
		anthropicCacheRefreshPhase: () => (agent.state.isStreaming ? "streaming" : "idle"),
		// ...rest unchanged...
	});
},
```

### Hợp đồng test

Bộ test bảo vệ ranh giới tiêu tiền, nên các assertion quan trọng nhất là **âm** — chứng minh những request ĐÃ KHÔNG được gửi đi. Tất cả nằm trong `packages/ai/test/anthropic-cache-refresh.test.ts`; KHÔNG tạo test nào ở `packages/coding-agent`.

- **(0) Cổng nghiệm thu.** Với `anthropicCacheRefresh: "off"` truyền thẳng vào `SimpleStreamOptions`, assert PAYLOAD REPLAY VẮNG MẶT — không phải chỉ "không có refresh mới". Một toggle được đo bằng "không có refresh mới" không chứng minh nó đã tắt thứ vốn đang chạy; chỉ một replay payload vắng mặt mới chứng minh điều đó. Đỏ nếu tri-state bị gộp về boolean (truthiness của chuỗi `"off"` vẫn warm), hoặc nếu `sdk.ts` vẫn hard-code một lần warm vô điều kiện.
- **(1)** Với TTL đã khai báo, warming bắn ở 90% TTL với sàn 10s; TTL ≤ 10s trả về `undefined` và warm **KHÔNG GÌ**. (Đây là hợp đồng âm của W7, tiêu thụ ở đây.)
- **(2)** Một lần flush cưỡng bức gửi **ĐÚNG MỘT** request với trần output 1 token.
- **(3)** Assertion kinh tế quan trọng nhất — âm: với bảng giá dẫn lợi ích kỳ vọng xuống dưới $0.05, KHÔNG request nào được gửi.
- **(4)** Nhánh idle, như một **CẶP**: cùng một probe trả về `"idle"` phải KHÔNG bắn dưới khoảng $0.35 miss cost (`0.15 * missCost - warmCost < 0.05`), và cùng probe đó trả về `"streaming"` phải bắn ở miss cost thấp hơn nhiều. Chính cặp này chứng minh probe thực sự được đọc đúng chỗ chứ không phải một literal hard-code.
- **(5)** Replay guard, âm **và** phần nghịch đảo bắt buộc: một model `anthropic-messages` CÓ reasoning với `compat.forceAdaptiveThinking !== true` phải TUYỆT ĐỐI không warm, và chính model đó trên một request NON-reasoning phải ĐƯỢC warm — nhánh non-reasoning phải sống.
- **(6)** Đổi model thì timer đang chờ bị dừng.
- **(7) VIẾT LẠI, không xoá**, case ở test:335 — "skips keep-alive refreshes and emits 1h breakpoints when retention is long" hiện đang khoá đúng lỗ hổng mà thay đổi (10) sửa. Kỳ vọng lật thành "tier long CÓ warm, và lần warm đó vẫn phát `ttl: \"1h\"`".

Nếu (0) hồi quy, người dùng bị tính tiền âm thầm cho các replay keep-alive mà họ đã tắt tường minh. Nếu (3) hồi quy, họ bị tính tiền cho những lần warm không tiết kiệm được gì. Nếu cặp ở (4) gộp lại, warm idle hoặc không bao giờ chạy, hoặc chạy liên tục — cái thứ nhất đọc ra như tính năng hỏng, cái thứ nhì đọc ra như một bug report về tiền.

Ngoài ra, cần xác minh — không ai trong plan nhắc — rằng case ở test:359 (OAuth, retention tự động) vẫn xanh sau khi nới cổng `:1431`.

### Xác minh

```bash
# Bước 0 — bắt buộc, không có native addon thì không dòng nào dưới đây chạy được
bun install && bun run build

# Baseline phải xanh TRƯỚC mọi chỉnh sửa
bun test packages/ai/test/anthropic-cache-refresh.test.ts   # phải ra 7 pass

# Sau khi làm xong
bun test packages/ai/test/anthropic-cache-refresh.test.ts   # cả 7 case gốc + case mới
bun run check:ts                                             # types/lint
test ! -e packages/coding-agent/src/session/cache-warmer.ts  # phần B của cổng

# TUYỆT ĐỐI KHÔNG: tsc, npx tsc
```

Hai cái bẫy môi trường đã được kiểm chứng, đừng mất thời gian:

- `bun run check:ts` hiện chết ngay ở bước đầu với `oxlint: command not found` — linter không được cài trong checkout này, nên cổng type sẽ là no-op cho tới khi bạn cài nó.
- Nếu dùng `bun run check` thì nó kéo theo `check:rs`, cần Rust toolchain.

### Cổng hoàn thành

**HAI PHẦN, vì một phần là chưa đủ.**

**PHẦN A** — `bun test packages/ai/test/anthropic-cache-refresh.test.ts` với test (0): `anthropicCacheRefresh: "off"` ở biên phải cho ra replay payload vắng mặt, cộng test (3) (không gửi request nào dưới sàn $0.05) và cặp idle/streaming của test (4). Đỏ nếu tri-state không được luồng từ đầu đến cuối, nếu cổng kinh tế vắng mặt, hoặc nếu phase probe bị đọc sai thời điểm.

**PHẦN B** — cái bẫy warmer-thứ-hai, mà Phần A về cấu trúc **KHÔNG THỂ** bắt được: assert `test ! -e packages/coding-agent/src/session/cache-warmer.ts`, và xác nhận qua code review rằng `streamSimpleWithAnthropicCacheRefresh` vẫn là con đường warm duy nhất. Đây là failure mode #1 mà plan nêu và nó im lặng: một file mới mặc định `"off"` không tốn xu nào, test của nó tự xanh, Phần A vẫn xanh — trong khi `anthropicCacheRefresh: true` ở `sdk.ts:4111` vẫn refresh vô điều kiện và không ai đụng tới. Một assertion về sự vắng mặt trên filesystem là chính đáng ở đây chính vì AGENTS.md cấm source-grep file implementation — không có cách nào mang hình thức test để hỏi "có phải có scheduler thứ hai không", nên guard là kiểm tra file cộng review.

**KHÔNG ĐƯỢC TÍNH LÀ CỔNG:** "không có test mới nào đỏ", "setting đã được đăng ký", hoặc bất kỳ assertion nào về sự tồn tại của toggle thay vì về tiền rời khỏi tài khoản.

**Cổng có thực sự đỏ được không:** Có. Phần A thực sự đỏ trên các failure mode thật — gộp tri-state về boolean ở biên khiến chuỗi `"off"` truthy, warming tiếp tục và assertion "payload vắng mặt" đỏ; bỏ cổng kinh tế thì test (3) đỏ; đọc phase ở `arm()` thay vì lúc timer nổ thì cặp ở test (4) phân kỳ. Phần B đỏ nếu có một warmer thứ hai được tạo ra — kiểm tra vắng mặt file là một assertion cơ học, có thể bác bỏ, thật. Cần nói thẳng vì nó quan trọng: **riêng Phần A sẽ KHÔNG bắt được sai lầm warmer-thứ-hai**, vì một module mới hoàn toàn không được chạm tới bởi một test truyền `"off"` qua `SimpleStreamOptions`. Đó chính là lý do cổng có hai phần; nếu người làm chỉ ship Phần A rồi kết luận W8 xong, failure mode đắt nhất của milestone là không được canh.

### Phụ thuộc

**depends_on**

- **W7 — CHẶN CỨNG.** `promptCacheLifetime` không tồn tại ở bất kỳ đâu trong repo hôm nay (`grep -rn promptCacheLifetime packages/catalog/src packages/ai/src` không trả về gì). Chính ghi chú của plan nói đúng: hợp đồng âm của W7 — lifetime không khai báo nghĩa là không warm — không có consumer nào nếu thiếu W8.
- **F6 (helper quyết định kinh tế) — cũng chặn, và plan đánh giá thấp chỗ này.** `decideWarm` / `WarmDecision` cũng không tồn tại ở bất kỳ đâu trong repo. Chữ ký `arm()` mới luồn `WarmDecision` xuyên qua, nên W8 cần F6 đã landed, không chỉ W7.
- **Cổng chung của wave 3a:** bảng TTL theo provider theo tier có nguồn (open question 0 của plan). Cổng đó bọc W7 và W8 cùng nhau, và không bọc gì khác.
- **KHÔNG phụ thuộc W2.** Đã kiểm chứng: `AnthropicCacheRefreshState` đã là một `ProviderSessionState` có `cancel()`/`close()`, và `cancel()` đã gọi `this.#controller?.abort()`, nên đường huỷ in-flight đã tồn tại hôm nay. W2 chỉ còn là tiền đề cho extension disposer, không phải cho W8.

**blocks:** không.

### Cách sai dễ nhất

Tạo ra một HỆ THỐNG THỨ HAI thay vì gate hệ thống đã có. Đây là cách đắt nhất để hỏng ở đây, chính vì nó im lặng: một file mới mặc định `"off"` không tốn xu nào, test của nó xanh, và cổng nghiệm thu vẫn xanh — trong khi `anthropicCacheRefresh: true` ở `sdk.ts:4111` vẫn refresh vô điều kiện và không ai bao giờ chạm tới. `AnthropicCacheRefreshState` ở `stream.ts:1218` ĐÃ lên lịch, ĐÃ có test, và ĐÃ được bật; việc của W8 là gate nó, không phải đứng cạnh nó.

Kẻ thứ nhực, và cũng là cái chính plan tự cảnh báo: copy hằng số của pi mà ĐÁNH MẤT phân biệt pha của chúng. `IDLE_CONTINUATION_PROBABILITY = 0.15` chỉ áp cho idle, còn streaming dùng `1.0`. Làm phẳng hai cái đó thì warm idle hoặc không bao giờ bắn (tính năng trông như hỏng ở đa số phiên), hoặc luôn bắn (bug ngược lại). Release notes phải nói rõ ngưỡng ~$0.35 cho idle.

Thứ ba: rơi mất điều kiện thứ tư của `supportsAnthropicCacheRefresh`. Hôm nay có BỐN điều kiện, không phải ba — `isLeakedThinkingHealExempt(model)` là cái dễ mất trong lúc mở rộng trục api/provider/transport, và mất nó sẽ âm thầm loại các model khỏi warm trên đúng con đường tốn tiền.

### Cần người quyết

- **F6 là một phụ thuộc cứng chưa được nói ra.** Plan chỉ nêu W7, nhưng chữ ký `arm()` đề xuất lại lấy `WarmDecision` "là shape ở F6" và không có type hay `decideWarm` nào tồn tại trong repo. F6 có được lên lịch trong milestone 1 không, hay W8 phải tự định nghĩa shape của quyết định? **Phải chốt trước khi kỹ sư bắt tay**, vì nó quyết định bước 4 có type được hay không.
- **`pi-ref/` không tồn tại trong checkout này** — không có thư mục như vậy, nên cả sáu hằng số mà plan nói sẽ port (`MAX_WARMING_AGE_MS` :16, `MAX_IDLE_WARMING_AGE_MS` :18, `CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS` :20, `IDLE_CONTINUATION_PROBABILITY` :26, `getCacheWarmingDelayMs` :29, `isReplayable` :55-57) cùng mọi tuyên bố hành vi lấy nguồn từ `cache-warmer.ts` đều **KHÔNG KIỂM CHỨNG ĐƯỢC** từ repo này. Package tham chiếu đó thực chất nằm ở đâu, và kỹ sư có nên tự suy ra giá trị từ bảng TTL đã công bố của Anthropic thay vì port không?
- **Mặc định `"off"` là một hành vi PHÁ VỠ trên một tính năng đang sống và đang miễn phí.** Người dùng hưởng lợi từ unconditional keep-alive sẽ mất nó mà không hề hành động gì. Một ghi chú migration trong changelog là đủ, hay release đầu cần một cửa sổ deprecation giữ lại mặc định cũ?
- **Nới cổng retention ở `:1431` để retention `long` cũng warm làm thay đổi kinh tế của các phiên context lớn nhất.** Điều này có tương tác với cách W9 tính chi phí cache-miss không, hay W9 hẳn là downstream và không biết gì?

Hai câu còn lại trong danh sách (`isLeakedThinkingHealExempt` đọc `$env.ANTHROPIC_BASE_URL`/`$env.FOUNDRY_BASE_URL` và `resolveCacheRetention` đọc `$env.PI_CACHE_RETENTION`, gây rủi ro lệch kết quả so với CI cho developer có `PI_CACHE_RETENTION=long` trong shell; và câu hỏi intent về trục KDL cho provider) được ghi lại ở mục Đính chính và làm sạch, nhưng chưa chặn việc bắt đầu.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `anthropicCacheRefresh: true` nằm ở `packages/coding-agent/src/sdk.ts:4105`, lân cận `externalThinking` ở `:4099` và `fallbackCreditRedemption` ở `:4102`; `transformProviderContext` ở `:3943`; `primaryStreamFn` ở `:4030-4036`; wrapper `streamFn` ở `:4086-4110`. | STALE — mọi anchor sdk.ts đều lệch | Số dòng thực: `anthropicCacheRefresh: true` ở `:4111`; `externalThinking` ở `:4104`; `fallbackCreditRedemption` ở `:4108`; `transformProviderContext` ở `:3949`; `primaryStreamFn` ở `:4036`; wrapper `streamFn` ở `:4092-4117`. Plan lệch 4–6 dòng khắp nơi, có lẽ do một lần sửa có trước HEAD. Bằng chứng: `grep -n` trên `packages/coding-agent/src/sdk.ts` tại HEAD `ecd516f`. |
| Replay guard là `isReplayable` trong `streamSimpleWithAnthropicCacheRefresh`, và HEAD đã có nó; port `isReplayable` của pi (pi-ref cache-warmer.ts:55-57) sẽ tổng quát hoá cái sẵn có. | SAI Ở CHI TIẾT — hàm không tồn tại | Không có `isReplayable` ở bất kỳ đâu trong `packages/ai/src/stream.ts`. HEAD diễn đạt guard là `isAnthropicThinkingActive` (stream.ts:1348) dẫn tới `anthropicCacheRefreshRequest: !thinkingEnabled` ở `:1369` cùng `maxTokens: thinkingEnabled ? options?.maxTokens : 0`. Kỹ sư đi tìm `isReplayable` để mở rộng sẽ không thấy gì và có thể kết luận guard vắng mặt — nó có thật, chỉ khác hình dạng và khác tên. Cảnh giác việc tổng quát hoá làm rơi nhánh non-reasoning: `isAnthropicThinkingActive` trả false khi `payload.thinking.type === "disabled"`, và nhánh độc lập model đó phải sống qua phép chia theo từng API. Bằng chứng: `grep -n isReplayable packages/ai/src/stream.ts` → không có hit. `sed -n '1348,1371p'`. |
| Test (7) viết lại `anthropic-cache-refresh.test.ts:335`, test duy nhất khoá hành vi retention-long cũ. | KHÔNG ĐẦY ĐỦ — một test thứ hai khoá cùng lỗ hổng và plan không hề nhắc | File có BẢY khối `it()` (`:237, :257, :279, :297, :318, :335, :359`). Cái ở `:359`, "arms no keep-alive refresh for an OAuth request with automatic retention", khoá cùng hành vi retention bằng một đường khác — OAuth resolve ra 1h, nên không tồn tại short breakpoint để `hasShortAnthropicMessageBreakpoint` tìm thấy. Nó vẫn nên xanh sau khi nới `:1431`, nhưng phải chạy lại có chủ đích, không được coi là hiển nhiên. Coi `:335` là test duy nhất bị ảnh hưởng là cách một wave 3a trông xanh ship kèm regression. Bằng chứng: `grep -n 'it(' packages/ai/test/anthropic-cache-refresh.test.ts` → 7 khối; `sed -n '359,386p'`. |
| Các điều kiện lúc arm là bốn cái trong `supportsAnthropicCacheRefresh` cộng usage bail; tập thay đổi plan mô tả không bao giờ nhắc `hasShortAnthropicMessageBreakpoint`. | KHÔNG ĐẦY ĐỦ — có điều kiện thứ năm lúc arm | `armRefresh` (stream.ts:1454) có bail năm nhánh, và nhánh thứ năm là `!hasShortAnthropicMessageBreakpoint(capturedPayload)` ở `:1461` (hàm nằm ở `:1322`). Mọi thay đổi lên trục TTL hay cổng retention đều phải suy luận với điều kiện này — thực tế chính nó là thứ giữ test OAuth ở `:359` xanh. Bằng chứng: `sed -n '1454,1466p' packages/ai/src/stream.ts`. |
| Tiền đề cứng duy nhất của W8 là W7. | KHÔNG ĐẦY ĐỦ — F6 là tiền đề cứng thứ hai | Chữ ký `arm()` đề xuất lấy `decision: WarmDecision` được mô tả là "là shape ở F6", nhưng cả `WarmDecision` lẫn `decideWarm` đều không tồn tại ở bất kỳ đâu trong repo. W8 cần F6 landed, y như cần W7. Danh sách phụ thuộc nên đọc là W7 + F6, và thứ tự wave nên xác nhận F6 xuống ở 3a hoặc sớm hơn. Bằng chứng: `grep -rn 'decideWarm\|WarmDecision' packages/` → không có hit. |
| Hằng số port từ `pi-ref/packages/coding-agent/src/core/cache-warmer.ts` ở các dòng :16, :18, :20, :26, :29, :55-57, :252, :380-390, :387-398. | KHÔNG KIỂM CHỨNG ĐƯỢC — path không tồn tại | Không có thư mục `pi-ref/` trong checkout này. Mọi giá trị và mọi tuyên bố hành vi lấy nguồn từ file đó nằm ngoài repo và không thể kiểm tra từ đây. Hãy coi sáu hằng số là input **CHƯA KIỂM CHỨNG**: tự suy ra chúng từ tài liệu TTL và bảng giá chính thức của Anthropic theo từng tier, hoặc tìm package tham chiếu rồi dẫn nguồn. Đừng copy mù. Bằng chứng: `ls -d pi-ref` → không có thư mục như vậy. |
| `cfgProvidersAnthropicSlowMode` ở `packages/coding-agent/src/session/settings.ts:860`. | STALE lệch 3 dòng | Nó ở `:863`. Khuôn cần copy là `register({ id, type: "enum", values: [...] as const, default: "off" as const })`. Lưu ý nó cố ý KHÔNG mang block `ui` — tiền lệ settings để theo là script-only, nên phải quyết rõ `providers.promptCacheRefresh` có UI `/settings` hay không. Bằng chứng: `grep -n cfgProvidersAnthropicSlowMode packages/coding-agent/src/session/settings.ts` → `:863`; `sed -n '855,870p'`. |
| `Agent` phát `agent_end` ở `packages/agent/src/agent.ts:1921` và `:1925`, và giữ `AgentState.isStreaming` ở `packages/agent/src/types.ts:946`. | STALE — cả hai đều lệch | `agent_end` được phát ở agent.ts:1975 (nhánh thành công) và `:1979` (nhánh lỗi); `case "agent_end":` ở `:1843` là một construct khác. `AgentState.isStreaming` ở types.ts:954. Phần **NỘI DUNG** của plan là đúng và đây là phần chịu tải của tính năng phase: probe `() => (agent.state.isStreaming ? "streaming" : "idle")` là hợp lý, và `agent` thực sự đã có sẵn trong closure `streamFn` (`agent.state.tools` được đọc ở `:4105`). Bằng chứng: `grep -n agent_end packages/agent/src/agent.ts`; `grep -n isStreaming packages/agent/src/types.ts`; `sed -n '4104,4106p' packages/coding-agent/src/sdk.ts`. |
| Xác minh là `bun check && bun test packages/ai/test/anthropic-cache-refresh.test.ts`; môi trường chặn test với "Failed to load pi_natives native addon for darwin-arm64" và `bun run check:ts` vẫn chạy được. | SAI — CẢ HAI lệnh đều bị chặn, và thông báo lỗi được nêu là một chuỗi hiểu sai | `bun run check:ts` hỏng ngay ở bước đầu: `check:tools` chạy `oxlint` và báo `command not found` — linter không được cài trong checkout này, nên phương án dự phòng plan nêu cũng không dùng được. `bun test` báo 0 pass / 1 fail / 1 error, và thông báo là `Cannot find module '@oh-my-pi/pi-catalog/build'` — trông như import hỏng nhưng KHÔNG phải: `@oh-my-pi/pi-catalog/build` resolve qua wildcard export tại catalog package.json:72 tới `packages/catalog/src/build.ts`, và file đó có thật. Một probe `bun -e` trực tiếp cho thấy nguyên nhân thật: `packages/natives/native/loader-state.js` ném lỗi vì native addon chưa từng được build. Nói cách khác, claim của task brief đúng về bản chất (thiếu addon) và sai về chữ nghĩa đích danh. Bước 1 phải là `bun install && bun run build`, và không được để kỹ sư đi "sửa" một import không hỏng. Bằng chứng: `bun run check:ts` → `oxlint: command not found`, exit 127. `bun test packages/ai/test/anthropic-cache-refresh.test.ts` → 0 pass, 1 fail, 1 error. `bun -e 'import { buildModel } from "@oh-my-pi/pi-catalog/build"'` → loadNative failure tại loader-state.js:970. `grep -c build packages/catalog/package.json` cho thấy wildcard export `./*` ở `:72`. |
| **ĐÃ XÁC MINH ĐÚNG** — đáng ghi lại để người làm không phải tự suy ra lại: `ANTHROPIC_CACHE_TTL_MS` ở stream.ts:1209; class ở :1218 giữ đúng #controller/#generation/#plan/#refreshesRemaining/#timer, không có lịch sử usage và không có price(); `arm()` ở :1237; `#schedule` private ở :1248; `supportsAnthropicCacheRefresh` ở :1292 với BỐN điều kiện gồm `isLeakedThinkingHealExempt`; cổng retention ở :1431; `cacheRetention: "short"` hard-code ở :1370; `armRefresh` ở :1454 và lệnh gọi `arm()` ở :1465; types.ts:439 là boolean; và claim rằng không cần W2 vì `cancel()`/`close()` cùng `#controller?.abort()` đã tồn tại. | ĐÃ XÁC MINH — tất cả đều đúng | Từng mục đều tái lập chính xác. Cách đọc code của plan ở đây là chính xác, kể cả điểm tinh tế rằng `transformProviderContext` làm việc trên messages và không thể làm chỗ ở cho một scheduler, và rằng `arm()` được gọi vô điều kiện trên mọi event `done` — vì vậy phase phải là một probe đọc lúc timer nổ chứ không phải một giá trị bắt lúc arm. Cũng đã xác minh: `anthropicCacheRefresh: true` ở sdk.ts thực sự là site stream-options duy nhất đặt nó, và hai lân cận của nó thực sự có đọc config. Bằng chứng: `grep -n` và `sed -n` trên `packages/ai/src/stream.ts`, `packages/ai/src/types.ts` và `packages/coding-agent/src/sdk.ts` tại HEAD `ecd516f`. |


---


## W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss

**Thay đổi gì:** Tách tổng token/chi phí phẳng của phiên thành một dòng cho mỗi model thực sự phục vụ token, cộng một dòng literal `"Tools/summaries"`, rồi thêm một tổng tiền đã định giá cho các lần trượt bộ nhớ đệm prompt do tiến trình gây ra.

**Wave:** 3b.  **Effort:** M.

**Người dùng thấy:** `/info` có thêm mục **Attribution**, liệt kê từng model đã thực sự đốt token, số token và chi phí dollar của nó, sắp theo cost giảm dần, cộng một dòng `Tools/summaries` cho các lệnh gọi compaction / branch-summary / tiến trình con mà tiến trình tự thực hiện thay bạn, và một dòng `Cache misses` báo bao nhiêu token đã phải trả lại ở giá cache-read với chi phí tương ứng. `/usage` (chế độ text của ACP) có thêm cùng khối per-model đó, đặt trên tổng phẳng đã có. Người dùng đã đổi model giữa phiên cuối cùng cũng biết model nào đang thực sự tốn tiền, và biết chi phí tóm tắt nội bộ đã tách khỏi model họ chọn.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/usage-breakdown.ts` | tạo | Module thuần mới: `buildUsageBreakdown()` trả về các dòng `UsageBucket` sắp cost giảm dần (mỗi model đã phục vụ + một literal `"Tools/summaries"`) cùng một `CacheMissCost` đã định giá `{ missedTokens, missedCost, idleMs, modelChanged, providerReportsCaching }`. Export `NOISE_FLOOR_TOKENS` và `CACHE_ATTRIBUTION_WINDOW_MS` bên cạnh `TOOLS_SUMMARIES_BUCKET`. | Có — không tồn tại ở HEAD `ecd516f`, đã xác nhận bằng `ls`; đây là file plan đề xuất và đường dẫn là đúng. |
| `packages/coding-agent/src/session/session-stats.ts` | sửa | `SessionStatsTracker.getSessionStats()` (`session-stats.ts:114`) thêm field `usageBreakdown`, tính từ đúng lượt đi đã gom tổng phẳng và `routedModels` (`session-stats.ts:114-205`). Không đụng bộ cộng hiện có — tổng phẳng phải giữ nguyên từng byte. | Có — `getSessionStats(): SessionStats` ở dòng 114; `addUsage` ở 134-151; lượt đi ba nguồn ở 152-172; `activeModelUsageEntries` ở 63-76; `taskToolUsage` ở 422-426. |
| `packages/coding-agent/src/session/agent-session-types.ts` | sửa | Thêm `usageBreakdown?: UsageBreakdown` (optional) vào interface `SessionStats` (451-477). | Có — `export interface SessionStats` ở dòng 451, interface kết thúc ở 477. Optional để các fixture object-literal ở `cli/gallery-fixtures/preview-session.ts:43` và `status-line.ts:40` vẫn compile. |
| `packages/coding-agent/src/modes/controllers/command-controller.ts` | sửa | `handleSessionCommand()` (349) render mục Attribution ngay sau khối `Cost` hiện có (kết thúc ở 431): mỗi bucket một dòng, cộng một dòng `Cache misses`. Bám theo cách render `routedModels` ở 380-386 (dùng `replaceTabs` + `sanitizeText`). | Có — `async handleSessionCommand()` ở 349; khối `Cost` ở 415-431, kết thúc bằng các dòng Credits; `showSessionInfo(info)` ở 461. |
| `packages/coding-agent/src/slash-commands/helpers/usage-report.ts` | sửa | `buildUsageReportText()` (167) nối khối per-model vào **nhánh fallback local-tallies**, sau dòng `Cost: $...` hiện có. Nhánh provider-reported giữ nguyên kèm comment giải thích lý do. | Có — `export async function buildUsageReportText` ở 167, file dài 202 dòng. Plan nói đây là export **duy nhất** của file — ĐÃ XÁC NHẬN, `git grep -n '^export'` trả về đúng một dòng đó. |
| `packages/coding-agent/test/usage-breakdown.test.ts` | tạo | Bốn test hợp đồng: (1) các dòng + `Tools/summaries` cộng đúng bằng tổng phẳng và compaction chỉ nằm trong `Tools/summaries`; (2) `upstreamModel` alias quy cho model đã phục vụ; (3) miss thật do idle có giá ra tiền, miss dưới noise floor đúng bằng 0; (4) tín hiệu model-change dính phân biệt provider chỉ-đọc-cache với provider không cache. | Có — không tồn tại ở HEAD, đã xác nhận bằng `ls`. Thư mục test có 791 file `*.test.ts` ở cấp này; đường dẫn là đúng. |
| `packages/coding-agent/test/session-manager/usage-statistics.test.ts` | không sửa (chạy lại làm hộ canh hồi quy) | Không cần sửa gì. Được chạy lại vì bước 7 đụng vào phần gom mà nó ghim. | Có — `describe("SessionManager usage statistics"...)` có thật; nó assert tổng `getUsageStatistics()` cho một entry `model_usage` và cho kết quả tool assistant+task — đúng những tổng W9 không được làm lệch. |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `[Unreleased]` > `Added`, mô tả lệch phí theo model, dòng `Tools/summaries`, và chi phí cache-miss. | **Không** — spec ghi rõ file này **chưa được mở khi kiểm chứng** (`verified: false`). Quy tắc attribution của AGENTS.md cho mục này (nội bộ, không issue link) không mập mờ nên không cần mở để gỡ mắc. Anchor chỉ có ở mức `## [Unreleased]`, không có số dòng. |

### Các bước

1. **Chốt baseline trước khi sửa gì.** Chạy `bun run check:ts` từ repo root và xác nhận xanh. Spec đã kiểm chứng điều này ngày 2026-09-27 tại HEAD `ecd516f` và nó pass. Cảnh báo: cây làm việc đang dùng chung với các worker milestone-1 khác ghi vào cùng nhánh — spec quan sát thấy một lần đỏ thoáng qua ở `packages/coding-agent/test/collab/w3-probe.test.ts` (một file lúc kiểm tra lại vài giây sau không còn trên đĩa). Nếu `check:ts` đỏ, hãy xác nhận file báo lỗi không phải do bạn tạo ra trước khi kết luận thay đổi của bạn làm hỏng nó.
   *Anchor: `repo root package.json` — script `check:ts`.*

2. **Tạo `packages/coding-agent/src/session/usage-breakdown.ts`.** Export ba hằng số (`TOOLS_SUMMARIES_BUCKET`, `NOISE_FLOOR_TOKENS`, `CACHE_ATTRIBUTION_WINDOW_MS`) và ba kiểu (`UsageBucket`, `CacheMissCost`, `UsageBreakdown`), rồi một hàm export thuần duy nhất `buildUsageBreakdown(input)`. Giữ nó thuần và chỉ-đọc: không gọi session-manager, không gọi registry, không có `Date.now()` bên trong — caller truyền `nowMs` vào. Tiêm phụ thuộc cho tra giá (`cacheReadRatePerMillion`) để hàm test được mà không cần `ModelRegistry`.
   *Anchor: `packages/coding-agent/src/session/usage-breakdown.ts` (file mới).*

3. **Cài lớp một — các bucket per-model — bằng cách sao đúng lượt đi mà `getSessionStats()` đã làm.** Đây là nước đi quan trọng: hàm đó ở `session-stats.ts:114-205` **đã** làm lượt đi ba nguồn; W9 tách bộ cộng phẳng đơn lẻ của nó thành bucket theo key thay vì bịa một lượt đi mới. Ba nguồn, mỗi nguồn rơi vào **đúng một** bucket:
   - (a) assistant message, key `${msg.provider}/${msg.upstreamModel ?? msg.model}`;
   - (b) tool result có `message.toolName === "task"`, đọc usage ra từ `message.details` đúng như `taskToolUsage` làm ở `session-stats.ts:422-426` — các cái này vào bucket `Tools/summaries`, vì kết quả tool `task` là một tiến trình con được tiến trình chính sinh ra, không phải model của bạn;
   - (c) entry `model_usage` lấy từ branch bằng `activeModelUsageEntries(branch)` (`session-stats.ts:63-76`) — cũng vào `Tools/summaries`.

   Chỉ tăng `turns` cho nguồn (a). Cộng `input`/`output`/`cacheRead`/`cacheWrite`/`totalTokens`/`cost` bằng đúng các field mà `addUsage` đọc ở `session-stats.ts:134-151` để hai bộ cộng không thể trôi lệch nhau.
   *Anchor: `packages/coding-agent/src/session/session-stats.ts:134-151, 152-172`.*

4. **Thêm bước lọc-và-sắp cuối cùng** mà plan chỉ định, tái tạo đúng `.filter(entry => entry.cost > 0 || entry.tokens > 0).sort((a, b) => b.cost - a.cost)` của pi: bỏ mọi bucket mà cost và totalTokens đều bằng 0, rồi sắp theo cost giảm dần. Hoà thì bẻ theo key tăng dần để render ổn định. Giữ dòng `Tools/summaries` trong chính danh sách này — nó là dòng ngang hàng, không phải footer.
   *Anchor: `packages/coding-agent/src/session/usage-breakdown.ts` (file mới).*

5. **Cài lớp hai — tổng cache-miss đã định giá — trong cùng hàm đó.** Duyệt các assistant message theo thứ tự; với mỗi cái **chưa** được giải thích (`transcript.cacheMissExplainedAt[i] !== true`, mảng dựng ở `session-context.ts:364-378`), tính `idleMs` là khoảng trống từ `completedAt ?? timestamp` của assistant message trước tới `timestamp` của message này. Một miss chỉ được tính khi **TẤT CẢ** đều đúng: `cacheRead === 0` ở lượt này, `reprocessedTokens (cacheWrite + input) > 0`, `reprocessedTokens >= NOISE_FLOOR_TOKENS`, và `idleMs >= CACHE_ATTRIBUTION_WINDOW_MS` hoặc có một đổi model đứng trước. `missedTokens += reprocessedTokens`. `missedCost += reprocessedTokens / 1_000_000 * cacheReadRatePerMillion(provider, servedId)` — **phép chia là bắt buộc** vì `Model.cost.cacheRead` là giá **trên một triệu** token (`packages/catalog/src/types.ts:1116-1122`: *"Per-million-token rates for one model pricing tier"*), trong khi `Usage.cost.*` đã là dollar. Khi tra giá trả về `undefined` thì cộng token nhưng không cộng cost.
   *Anchor: `packages/coding-agent/src/session/session-context.ts:364-378`, `packages/catalog/src/types.ts:1116-1122`.*

6. **Cài tín hiệu model-change DÍNH (sticky)** — đây là nhánh tinh tế plan đánh dấu và cũng là chỗ dễ làm sai nhất. Đừng đọc thẳng boolean ra từ `trackMessageCacheState`. Thay vào đó: đặt `providerReportsCaching = true` trên bucket ngay khi **BẤT KỲ** lượt nào trong phiên có `cacheRead > 0 || cacheWrite > 0`; chỉ khi nó còn false thì một đổi model mới giải thích được một miss. Chính điều này phân biệt được provider chỉ-đọc-cache (OpenAI: báo `cacheRead`, không bao giờ báo `cacheWrite`) với provider không báo cache gì cả — cái thứ nhất đã lật cờ trước khi lượt lạnh của nó tới, cái thứ hai không bao giờ lật nên vẫn còn được quy cho đổi model. Ghi `modelChanged` theo từng miss đóng góp, rồi OR chúng lại cho tổng.
   *Anchor: `packages/coding-agent/src/session/usage-breakdown.ts` (file mới).*

7. **Nối bộ cộng vào đường session stats.** Thêm `usageBreakdown` vào interface `SessionStats` (`agent-session-types.ts:451-477`) — **optional**, để các caller `getSessionStats()` hiện có và các fixture dựng `SessionStats` partial vẫn type-check (có object literal ở `packages/coding-agent/src/cli/gallery-fixtures/preview-session.ts:43` và `status-line.ts:40` sẽ vỡ nếu không optional). Tính nó bên trong `SessionStatsTracker` sau lượt đi hiện có, tái dùng dữ liệu `routedModels`/branch đã gom, để khối Attribution và tổng phẳng chứng minh được là cùng đi một lượt.
   *Anchor: `packages/coding-agent/src/session/agent-session-types.ts:451-477`, `packages/coding-agent/src/session/session-stats.ts:114-205`.*

8. **Render mục Attribution trong session info view.** Chèn ngay trong `handleSessionCommand()`, **sau** khối `Cost` hiện có (kết thúc ở `command-controller.ts:431`), để chi phí theo model nằm ngay cạnh tổng mà nó phân rã. Mỗi dòng: key, `totalTokens`, và cost làm tròn 4 chữ số thập phân — khớp với `stats.cost.toFixed(4)` sẵn có ở `command-controller.ts:420` để cột nhìn nhất quán. Rồi một dòng `Cache misses:` với `missedTokens` và `missedCost.toFixed(4)`, bỏ hẳn cả dòng khi `missedTokens` bằng 0. Sanitize key bằng `replaceTabs` + `sanitizeText` trước khi nội suy — render `routedModels` hiện có ở `command-controller.ts:384` làm đúng vậy, làm theo. Bỏ qua toàn bộ mục khi không có dòng nào.
   *Anchor: `packages/coding-agent/src/modes/controllers/command-controller.ts:415-431, 384`.*

9. **Thêm khối per-model vào text path `/usage` của ACP, chỉ ở nhánh fallback local-tallies** (sau `return` sớm ở `usage-report.ts:186`, cạnh dòng `Cost: $...` hiện có). Nhánh này là chuỗi thuần đã TUI-sanitize, không phải overlay có theme, nên dùng dòng thuần và chạy model key qua `sanitizeText`. Để nguyên nhánh provider-reported và thêm một dòng comment nói lý do (về bản chất nó không có dữ liệu per-model). Lưu ý `buildUsageReportText` đã được xác nhận là export **duy nhất** của `usage-report.ts`, nên file này không cần thêm bề mặt export mới.
   *Anchor: `packages/coding-agent/src/slash-commands/helpers/usage-report.ts:167-202`.*

10. **Viết `packages/coding-agent/test/usage-breakdown.test.ts`.** Dùng `SessionManager.inMemory()` + `appendMessage` / `appendModelUsage` / `buildSessionContext()` làm seam fixture — đúng pattern có sẵn trong `packages/coding-agent/test/session-manager/usage-statistics.test.ts`, và nó cho một branch thật cùng `cacheMissExplainedAt` thật mà không cần mock. Phủ:
    - (1) hai model cộng một compaction — assert các dòng cộng lại bằng `getUsageStatistics().cost` phẳng **VÀ** usage của compaction nằm trong dòng `Tools/summaries` và không nằm ở dòng model nào;
    - (2) provider alias — một assistant message có `upstreamModel` khác `model` được quy cho served id;
    - (3) miss do idle thật báo `missedTokens > 0` với `missedCost` bằng `missedTokens / 1e6 * rate`, còn miss dưới noise floor báo **đúng** 0 và 0;
    - (4) phân biệt dính — một provider đã báo cacheRead ấm ở lượt trước rồi lạnh sau **không** bị quy cho đổi model, trong khi provider mà không lượt nào báo cả cacheRead lẫn cacheWrite thì **vẫn** bị quy.

    Bốn nhánh khác nhau, không dòng trùng nhau, mỗi assert đặt tên một kết quả người dùng thấy được. **KHÔNG** assert vào câu chữ/label của prompt.
    *Anchor: `packages/coding-agent/test/session-manager/usage-statistics.test.ts:1-70` (pattern fixture để sao chép).*

11. **Chạy lại `packages/coding-agent/test/session-manager/usage-statistics.test.ts`.** Nó ghim đúng những tổng phẳng mà refactor ở bước 7 đụng tới; nếu trôi lệch thì lớp một đang đếm hai lần. Lưu ý file này chưa chạy được cho tới khi native addon được build — `bun --cwd=packages/natives run build`. Trước đó `bun run check:ts` là tín hiệu thực thi duy nhất của bạn.
    *Anchor: `packages/coding-agent/test/session-manager/usage-statistics.test.ts`.*

12. **Thêm một dòng dưới `## [Unreleased]` / `### Added` trong `packages/coding-agent/CHANGELOG.md`**, hướng người dùng, không có chi tiết cài đặt: *"`/info` now breaks down token cost by the model that actually served each turn, separates internal summarization into a Tools/summaries row, and reports the dollar cost of prompt-cache misses."* Theo AGENTS.md đây là thay đổi nội bộ không có issue link, nên dùng câu chữ thuần. *File CHANGELOG.md là file duy nhất trong mục này chưa được kiểm chứng — xem cột "đã kiểm chứng?" ở trên.*
    *Anchor: `packages/coding-agent/CHANGELOG.md`, mục `[Unreleased]` (chưa kiểm chứng, không có số dòng).*

### Hình dạng code

```typescript
// packages/coding-agent/src/session/usage-breakdown.ts  (new)
//
// NOTE: the plan's reference implementation (`pi-ref/.../core/usage-totals.ts`) does NOT
// exist in this repo. The shape below is derived from the walk that
// `session-stats.ts:114 getSessionStats()` already performs, split into buckets.

import type { Usage } from "@oh-my-pi/pi-ai";
import type { SessionEntry } from "./session-entries";

/** Literal bucket for internally-initiated calls that never touch the user's chosen model. */
export const TOOLS_SUMMARIES_BUCKET = "Tools/summaries";

/**
 * Cache misses below this many reprocessed tokens are granularity noise, not a
 * miss the user caused. Sourced from pi's NOISE_FLOOR_TOKENS = 1024, which does not
 * exist here; 2048 is this repo's existing floor (MIN_CACHE_FOOTPRINT in
 * packages/tui/src/chat/cache-invalidation-marker.ts:12). Pick ONE and comment why.
 */
export const NOISE_FLOOR_TOKENS = 2048;

/** Attribution window. pi's CACHE_TTL_MS (5min) is ANTHROPIC_CACHE_TTL_MS at packages/ai/src/stream.ts:1209. */
export const CACHE_ATTRIBUTION_WINDOW_MS = 5 * 60_000;

export interface UsageBucket {
  /** `${provider}/${servedModel}` for model rows; the literal TOOLS_SUMMARIES_BUCKET otherwise. */
  key: string;
  /** True for the Tools/summaries row. */
  isToolsOrSummaries: boolean;
  turns: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
}

export interface CacheMissCost {
  missedTokens: number;
  /** missedTokens / 1e6 * Model.cost.cacheRead -- TokenCost is a PER-MILLION rate. */
  missedCost: number;
  idleMs: number;
  modelChanged: boolean;
  /** Set once a turn on this provider proves caching is live (cacheRead > 0 or cacheWrite > 0). */
  providerReportsCaching: boolean;
}

export interface UsageBreakdown {
  /** cost-descending; entries with cost === 0 && totalTokens === 0 are dropped. */
  rows: UsageBucket[];
  cacheMiss: CacheMissCost;
}

export function buildUsageBreakdown(input: {
  messages: readonly Message[];
  branch: readonly SessionEntry[];
  transcript: { cacheMissExplainedAt?: readonly boolean[] };
  /** Resolves `${provider}/${id}` -> per-million cacheRead rate, or undefined. */
  cacheReadRatePerMillion: (provider: string, modelId: string) => number | undefined;
  nowMs: number;
}): UsageBreakdown;

// Identity for an assistant turn -- the `responseModel ?? model` fallback the plan asks for.
// NOTE the plan spells the field `responseModel`; on AssistantMessage in THIS repo it is
// `upstreamModel` (packages/ai/src/types.ts:1130-1138). `model` is what was REQUESTED.
const servedId = (m: AssistantMessage): string => m.upstreamModel ?? m.model;
const modelKey = (m: AssistantMessage): string => `${m.provider}/${servedId(m)}`;

// Layer-two core: stickiness. `modelChanged` alone cannot tell
//   (a) a read-only-cache provider (OpenAI reports cacheRead, never cacheWrite) from
//   (b) a provider that reports no caching at all.
// The discriminator is evidence, not identity: once ANY turn on the provider shows
// cacheRead > 0 || cacheWrite > 0, the provider demonstrably caches, so a later cold
// turn is NOT explained by a model change. Otherwise the model-change signal stays
// sticky -- it keeps explaining misses until caching is proven.
```

### Hợp đồng test

Người tiêu dùng là một con người hỏi *"model nào thực sự đang tốn tiền của tôi, và tiến trình đã tiêu bao nhiêu để tóm tắt lại chính ngữ cảnh của tôi?"*. **Nếu hồi quy, người dùng thấy** một tổng bị trộn lẫn không phân rã, không phân biệt được một compaction chạy nền đã đốt hết nửa phiên, hay một lần đổi model giữa phiên đã chuyển hóa đơn sang một model họ đã ngừng dùng từ mười lượt trước.

Bốn hợp đồng quan sát được mà test bảo vệ:

1. Các dòng per-model cộng với dòng `Tools/summaries` cộng **CHÍNH XÁC** bằng tổng phẳng có sẵn — đây là hộ canh đếm hai lần, và là lý do phải chạy kèm `usage-statistics.test.ts`. Nếu hồi quy, người dùng thấy mục Attribution cộng lại **lớn hơn** dòng `Cost: Total` họ đang nhìn — một cách vô lý số học mà UI làm nổi bật, nên hợp đồng (1) được viết thành phép bằng với tổng phẳng bị đụng, chứ không phải một ảnh chụp.
2. Một entry `model_usage` do compaction sinh ra rơi vào bucket `Tools/summaries` và **không** rơi vào dòng model nào. Nếu hồi quy, người dùng thấy một model bị quy cho chi phí mà nó không hề phục vụ.
3. Một assistant message có `upstreamModel` khác `model` được quy cho model đã phục vụ, không phải model đã yêu cầu. Nếu hồi quy, người dùng thấy hàng của một model gateway đang bị ghi đè bằng id mà họ đã gõ.
4. Một cache miss dưới noise floor báo **zero** missed tokens và **zero** missed cost. Nếu hồi quy, dòng `Cache misses` hiện ra một con số tiền từ hư không.

**File test:** `packages/coding-agent/test/usage-breakdown.test.ts` (tạo mới) và `packages/coding-agent/test/session-manager/usage-statistics.test.ts` (đã có, chạy lại).

### Xác minh

Chạy từ repo root (`/Users/tranquangdang21/Projects/ultraworkers`):

```bash
bun run check:ts
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build   # unblocks bun test; currently the only blocker
bun test packages/coding-agent/test/usage-breakdown.test.ts
bun test packages/coding-agent/test/session-manager/usage-statistics.test.ts
```

`bun run check:ts` là oxlint + oxfmt + `tsgo --noEmit` trên mọi package — nó bắt được lỗi kiểu mà `bun test` bị chặn không thấy. Không chạy trình kiểm tra kiểu riêng của TypeScript ở đây; tín hiệu kiểu duy nhất của mục này là `bun run check:ts`.

Kiểm tra thủ công: `/info` phải render mục Attribution **không rỗng** cho một phiên đã dùng hai model cộng một compaction. Chạy trong TUI, xác nhận dòng `Tools/summaries` có mặt và tổng cost của các dòng bằng đúng dòng `Cost: Total` đã hiện trên màn hình.

### Cổng hoàn thành

Hai lệnh, cả hai phải xanh:

1. `bun run check:ts` từ repo root — oxlint + oxfmt + `tsgo --noEmit` trên mọi package; nó bắt được lỗi kiểu mà `bun test` bị chặn không thấy.
2. Sau khi native addon đã build (`bun --cwd=packages/natives run build`): `bun test packages/coding-agent/test/usage-breakdown.test.ts packages/coding-agent/test/session-manager/usage-statistics.test.ts` — file mới cộng file có sẵn mà tổng phẳng của nó bị refactor, để một hồi quy trong tổng phẳng bị bộ test đang ghim sẵn bắt.

Thêm kiểm tra thủ công trong TUI như mô tả ở trên.

**Cổng này có thể đỏ không? Có.** Nó đỏ đúng khi bucketing sai ở chỗ quan trọng: nếu một entry `model_usage` (compaction / auto-thinking / judgment / kết quả `task` của tiến trình con) cũng bị cộng vào một dòng model, phép bằng của test mới (`tổng cost các dòng === tổng phẳng`, và dòng `Tools/summaries` có cost > 0 mà không dòng model nào mang nó) sẽ fail, đồng thời tổng của `usage-statistics.test.ts` cũng trôi. Nếu bỏ fallback `upstreamModel`, test provider-alias fail. Nếu không áp noise floor, test miss dưới 1024 token assert một cost khác 0 và sẽ fail. Nếu không cài quy tắc dính, test read-only-provider và test no-caching-provider cho ra cùng kết quả và test phân biệt sẽ fail. `bun run check:ts` độc lập đỏ trên bất kỳ lỗi kiểu nào, và nó đã được xác nhận là xanh ở HEAD `ecd516f` — nên đây là tín hiệu thật chứ không phải một nền đỏ có sẵn.

### Phụ thuộc

- `depends_on`: không — mục này không chặn ai và không bị ai chặn.
- `blocks`: `W17`.

### Cách sai dễ nhất

**Đếm hai lần.** Ba nguồn usage (assistant message, kết quả tool `task`, entry `model_usage`) phải mỗi nguồn rơi vào **đúng một** bucket, và một entry `model_usage` không bao giờ được tính thêm vào một dòng model. Đây là lý do tầng hai (cache-miss) không có chỗ đúng để đáp nếu tầng một bucketing chưa đúng — vì vậy hai tầng là **một** work item chứ không phải hai. Rủi ro thứ hai là chọn sai field định danh: plan nói `responseModel`, field này **không tồn tại** trên `AssistantMessage` của repo này (xem mục đính chính bên dưới); chỉ dùng `message.model` sẽ âm thầm quy sai mọi lượt có provider alias.

### Cần người quyết

- **Vị trí render trong `/info`** — các dòng per-model nằm bên trong khối `Cost` sẵn có (`command-controller.ts:415-431`) hay thành một mục **Attribution** mới ngay sau đó? *Khuyến nghị: một mục mới*, vì khối `Cost` hiện có còn mang Credits và Premium Requests, những thứ không có nghĩa per-model; gấp các dòng vào đó sẽ ám chỉ rằng chúng cũng được quy chiếu. (Chặn bước 8.)
- **`/usage` (ACP text path, `buildUsageReportText`) có thêm khối per-model không khi nó có giới hạn do provider báo?** Nhánh provider-reported `return` sớm (`usage-report.ts:175-186`) và không bao giờ tới các tổng cục bộ. *Khuyến nghị: chỉ thêm khối vào nhánh fallback local-tallies, kèm comment nói rõ nhánh provider-reported không có dữ liệu per-model theo bản chất.* (Chặn bước 9.)
- **Tên bucket `Tools/summaries` là literal ship thẳng hay một hằng số export?** *Khuyến nghị: export `TOOLS_SUMMARIES_BUCKET` từ module mới và dùng nó ở cả bộ cộng lẫn renderer*, để sau này đổi tên chỉ là một edit — nhưng plan chỉ định literal, nên **cần xác nhận tên là cuối cùng** trước khi W17 hard-code nó vào một template bug-report. (Không chặn W9; chặn W17.)
- **Ngưỡng noise floor: 1024 như plan nói, hay 2048 khớp sàn có sẵn của repo?** `NOISE_FLOOR_TOKENS` không tồn tại ở đây; hằng số gần nhất là `MIN_CACHE_FOOTPRINT = 2048` tại `packages/tui/src/chat/cache-invalidation-marker.ts:12`. Sketch code ghi *"Pick ONE and comment why"*. *Khuyến nghị 2048 để nhất quán nội bộ* (đây cũng là giá trị có sẵn trong sketch), **kèm đọc `detectCacheInvalidation` trước khi viết tầng hai** — hàm đó đã mã hoá sẵn luật phân biệt provider sắc hơn mà ghi chú "sticky" của plan đang với tới: nó yêu cầu `current.cacheWrite > 0` (`:61`) chính vì các provider implicit-cache báo `cacheWrite` bằng 0 (doc comment ở `:29-44`). Dùng lại lập luận đó tránh sinh ra một luật thứ hai tinh vi khác biệt.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| Shape tham chiếu: `pi-ref/packages/coding-agent/src/core/usage-totals.ts:37-73`, gồm `addUsageToTotals` ở :63, `.filter((entry) => entry.cost > 0 \|\| entry.tokens > 0)` ở :71, `.sort((a, b) => b.cost - a.cost)` ở :72, kiểu trả về `UsageCostBreakdownEntry` ở :30-34. | **STALE — toàn bộ tham chiếu vắng mặt khỏi repo này** | Không có thư mục `pi-ref` ở HEAD `ecd516f` (`ls -d pi-ref` → *No such file or directory*), và `git grep -rn 'getUsageCostBreakdown' packages/` lẫn `'addUsageToTotals'` đều **0 hit**. Không đọc được bản tham chiếu. Dựng phần đuôi filter+sort từ văn xuôi của plan (không mập mờ: *"lọc về 0, sắp theo cost giảm dần"*) và lấy phần lượt đi từ cái thật, trong repo: `SessionStatsTracker.getSessionStats()` tại `packages/coding-agent/src/session/session-stats.ts:114-205` đã làm **đúng** lượt đi ba nguồn mà W9 mô tả. Dùng nó làm hình dạng, đừng dùng pi-ref. |
| Key helper message bằng `` `${provider}/${responseModel ?? model}` ``, trong đó fallback `responseModel` là *"exactly what makes a provider-side alias attribute correctly"*. | **SAI TÊN FIELD, ý vẫn đúng** | `AssistantMessage` **không có** field `responseModel`. `git grep -rn 'responseModel' -- packages/` chỉ trúng các thuộc tính span OTel ở `packages/agent/src/telemetry.ts:1566, 1590, 1598, 1605` — không bao giờ là field của message. Field mang đúng ý này trên `AssistantMessage` là `upstreamModel` (`packages/ai/src/types.ts:1130-1138`: *"Concrete model that produced this turn when it is knowable independently of the requested id ... Compared against `model` to notice a gateway serving something other than what was requested"*). Fallback phải là `msg.upstreamModel ?? msg.model`. Ý của plan sống nguyên — phép `??` vẫn là thứ làm cho trường hợp provider-alias được quy đúng — chỉ có định danh là sai. Hệ quả: `trackMessageCacheState` tại `session-context.ts:364-373` **không** áp fallback này; nó dùng `${msg.provider}/${msg.model}` thô. Đó là hành vi có sẵn và có thể coi là lỗi nhỏ, nhưng sửa nó sẽ đổi lượt nào UI đánh dấu là đã-giải-thích — ngoài phạm vi W9, hãy báo cáo chứ đừng sửa. |
| Gom *"ALL tool results with usage"* **và** *"branch_summary/compaction entries with usage"* vào literal `"Tools/summaries"`. | **SAI HÌNH DẠNG — ba điểm vào thật khác hẳn** | Hai trong ba hình dạng được nêu không tồn tại như mô tả. (a) `ToolResultMessage` (`packages/ai/src/types.ts:1178-1198`) **không có** field `usage` — usage duy nhất một tool result có thể mang là lồng trong `details`, và chỉ kết quả tool `task` mới có: `taskToolUsage(details)` tại `session-stats.ts:422-426` đọc `Reflect.get(details, 'usage')` và chặn bằng `isUsage` (428-438). Vị từ thật là `message.toolName === "task"` (`session-stats.ts:155-158`), không phải "bất kỳ tool result nào có usage". (b) `CompactionEntry` (`session-entries.ts:121+`) **không có** field `usage` — nó mang `summary, shortSummary, firstKeptEntryId, tokensBefore, tokensAfter, method, details, preserveData, fromExtension`. Usage của compaction/branch-summary được ghi ngoài dải, thành một `ModelUsageEntry` riêng với `type: "model_usage"` (`session-entries.ts:80-91`, mang `purpose, role, api, provider, model, usage, stopReason`), do `SessionManager.appendModelUsage()` ghi tại `session-manager.ts:2820-2839`. Nguồn thứ ba vì thế là `activeModelUsageEntries(branch)` tại `session-stats.ts:63-76`. Hệ quả lên công việc: ý nghĩa thành phần bucket vẫn đúng (các lệnh gọi do tiến trình tự khởi xướng, không phải model của bạn) nhưng **ba bộ chọn phải viết lại**. Giá trị `purpose` quan sát được: `"auto-thinking"` (`model-controls.ts:634-637`) và các purpose judgment tự do (`judgment/index.ts:78-85`). |
| Giữ noise floor (pi dùng `NOISE_FLOOR_TOKENS = 1024`) và giữ `CACHE_TTL_MS = 5min` của pi làm attribution window. | **SAI TÊN — cả hai hằng số đã đổi/không có, một giá trị lệch** | `git grep -rn 'NOISE_FLOOR_TOKENS' -- packages/` → **0 hit**, hằng số không tồn tại ở đây. Gần nhất là `MIN_CACHE_FOOTPRINT = 2048` tại `packages/tui/src/chat/cache-invalidation-marker.ts:12`, phục vụ đúng mục đích (lọc các sụp cache nhỏ hơn footprint) nhưng cố ý bị chặn **sau** một lượt ấm trước đó (`prev.cacheRead < MIN_CACHE_FOOTPRINT` ở `:55`). `CACHE_TTL_MS` cũng không tồn tại; giá trị 5 phút là `ANTHROPIC_CACHE_TTL_MS = 5 * 60_000` tại `packages/ai/src/stream.ts:1209`. **KHÔNG** import cái nào từ chỗ plan ám chỉ — hãy định nghĩa hằng số riêng của W9 trong `usage-breakdown.ts` và comment nguồn gốc. Cần quyết định: 1024 theo plan, hay 2048 khớp sàn có sẵn của repo (xem "Cần người quyết"). |
| HEAD là `5873776`. | **STALE** | HEAD thật là `ecd516f` trên nhánh `milestone-1`, commit duy nhất là *"feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers"*. Repo chỉ có một commit khởi tạo bị squash, nên không có `5873776` để so — đừng mất thời gian tìm nó, và đừng giả định công việc milestone trước nào đã vào. |
| Consumer là `buildUsageReportText` tại `usage-report.ts:167`, *"verified as the file's ONLY export"*. | **CONFIRMED** | Không cần đính chính. `git grep -n '^export' -- packages/coding-agent/src/slash-commands/helpers/usage-report.ts` trả về đúng một dòng, `167:export async function buildUsageReportText(...)`. File dài 202 dòng và không thêm bề mặt export mới. Ghi lại là đã xác nhận để người triển khai khỏi phải kiểm lại. |
| Đầu vào cache-miss là `cacheMissExplainedAt?: boolean[]` tại `session-context.ts:117`, cộng `:345`, `:377`, `:727`. | **CONFIRMED — cả bốn số dòng chính xác** | Không cần đính chính. `:117` là field trên interface transcript (doc *"Array parallel to messages, indicating which assistant turns should have their prompt-cache misses suppressed/explained"*), `:345` khai báo `const cacheMissExplainedAt: boolean[] = []`, `:377` lệnh push trong `pushMessage`, `:727` chỗ gán khi return. Hai sự thật plan bỏ sót và người triển khai cần: field **chỉ** được điền khi `options?.transcript` được set (`:727` có chặn, và `pushMessage` return sớm trước khi push ở `:375-376`), nên nó là `undefined` ngoài chế độ transcript; và `trackMessageCacheState` có call site thứ hai ở `:577` cho các assistant ẩn trước compaction, nên mảng được ghi trên các đường không đi qua `pushMessage`. Consumer phải coi mảng là có-thể-vắng-mặt và song song chỉ số với `transcript.messages`, đúng như `ui-helpers.ts:509` làm. |
| Module mới là `packages/coding-agent/src/session/usage-breakdown.ts` và test mới là `packages/coding-agent/test/usage-breakdown.test.ts`. | **CONFIRMED — cả hai đều chưa có, đường dẫn đúng** | Không cần đính chính. Không file nào tồn tại ở HEAD, và `packages/coding-agent/src/session/` không có `index.ts` barrel, nên một module file phẳng với import tương đối trực tiếp là hình dạng đúng (khớp `session-stats.ts`, mà `agent-session.ts:408` import bằng `./session-stats`). Đường dẫn test nhất quán với 791 file `*.test.ts` phẳng trong `packages/coding-agent/test/`. |


---


## W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite

**Thay đổi gì:** Thêm một interface span trung lập-vendor (kèm NOOP, một adapter in-memory và một conformance suite dùng chung) mà mọi backend telemetry tương lai đều có thể hiện thực, rồi đặt đường OpenTelemetry sẵn có làm adapter mặc định bên dưới nó — không đổi một chữ ký export nào và không sửa một dòng nào của test OTEL hiện tại. **Wave:** Wave 4 (đi cùng W11; W11 đến trước — W10 đi sau vì hai commit của nó không được squash, và commit 2 mang rủi ro hồi quy cao nhất theo từng LOC trong milestone). **Effort:** M, nhưng bất đối xứng — commit 1 là S (bốn file nhỏ không phụ thuộc gì, một dòng barrel, một test), commit 2 là nửa M. Dưới cách hiểu C17 được chọn ở đây, commit 2 là một seam ~40 LOC ở hai hàm private/public chứ không phải viết lại 2114 LOC — đó là lý do tổng là M chứ không phải L.

**Người dùng thấy:** Không có gì ở milestone 1 — nội bộ. Không setting, không output, không flag, không đổi dependency. Lợi ích để dành: một milestone sau có thể ship backend telemetry Sentry hoặc structured-log mà không phải fork `telemetry.ts`, và một backend không phải OTEL thì không bị buộc phải kéo theo `@opentelemetry/api`.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/agent/src/telemetry/context.ts` | tạo | Hợp đồng trung lập-vendor. Bắt buộc chứa: `TelemetryAttributeValue` (kể cả `readonly string[]` và `readonly number[]`), `TelemetryAttributes`, `SpanStatus`, một interface tên `TelemetrySpan` (**KHÔNG** phải `Span` — xem đính chính P3) với `addEvent` / `setAttributes` / `setStatus` / `end`, và `TelemetryContext` với `startSpan<T>(context, name, fn): T` dạng callback. **Không import gì từ ngoài thư mục này.** Thư mục chưa tồn tại: `ls packages/agent/src/telemetry/` trả về `No such file or directory`; chỉ có `telemetry.ts` (2114 LOC). **Commit 1.** | có |
| `packages/agent/src/telemetry/noop.ts` | tạo | `NOOP_TELEMETRY_CONTEXT`: một `TelemetrySpan` đóng băng ở cấp module với ba-cộng-một method rỗng, và `startSpan` trả về `fn(NOOP_SPAN)` — giá trị trả về của callback **hoàn toàn không đổi**. Đây chính là hợp đồng phủ định mà plan nêu, và nó cần một khẳng định riêng. **Commit 1.** | có |
| `packages/agent/src/telemetry/memory.ts` | tạo | Adapter tham chiếu in-memory + một factory ghi lại dùng được cho conformance suite. Phải ghi: tên span, span cha, các event theo thứ tự, attributes đã gộp, status cuối cùng (kèm message), và `end()` đã được gọi hay chưa. Phải pass conformance suite. **Commit 1.** | có |
| `packages/agent/src/telemetry/conformance.ts` | tạo | Bộ test dùng chung, xuất ra `createCase(factory, group, name, test)` cộng một driver `runConformance(factory)`. Các case: span parentage (span con lồng dưới span bao quanh, không phải dưới root), ghi event, chuyển status, round-trip attribute kể cả attribute mảng, idempotence của `end()`, và passthrough giá trị trả về của callback. **Module này không được import NOOP hay adapter memory theo tên** — nó nhận implementation qua tham số `factory`, nếu không thì suite không còn trung lập-vendor. **Commit 1.** | có |
| `packages/agent/src/telemetry/index.ts` | tạo | Barrel star re-export: `export * from "./context"; export * from "./noop"; export * from "./memory";` và tùy chọn conformance. Specifier **không kèm extension** — đoạn §F8 của plan viết `"./context.ts"`, mà không file nào trong `packages/agent/src` dùng kiểu đó. **Commit 1.** Tạo cạnh `telemetry.ts` là an toàn: đã kiểm chứng bằng `bun` rằng `./telemetry` vẫn resolve về `telemetry.ts` kể cả khi `telemetry/index.ts` đã tồn tại. | có |
| `packages/agent/src/index.ts` | sửa | Thêm đúng một dòng `export * from "./telemetry/context";` (hoặc re-export barrel `telemetry/index`) **ngay sau dòng 24**. Bắt buộc, không tuỳ chọn: thiếu nó thì hợp đồng là một đường dẫn riêng tư và tiền đề của commit 2 trở nên vô dụng. Dòng 24 đã xác nhận đúng là `export * from "./telemetry";`. **Commit 1.** | có |
| `packages/agent/src/telemetry.ts` | sửa | **CHỈ COMMIT 2.** Seam tối thiểu, không phải viết lại: hiện thực hợp đồng trung lập-vendor dưới dạng adapter nền OTEL, và định tuyến `startSpan` private (`telemetry.ts:466`) cùng `runInActiveSpan` (`telemetry.ts:2048`) qua đó. Mọi chữ ký export giữ nguyên từng byte, `@opentelemetry/api` vẫn là đường mặc định, và `telemetry.ts:2106` giữ nguyên việc re-export `Span` / `SpanKind` / `SpanStatusCode` / `Tracer` / `trace`. 2114 LOC đã xác nhận. Đây là nơi rủi ro hồi quy cao nhất theo từng LOC trong milestone. **Commit 2.** | có |
| `packages/agent/test/telemetry-conformance.test.ts` | tạo | Chạy conformance suite dùng chung trên **cả** adapter in-memory lẫn `NOOP_TELEMETRY_CONTEXT`, cộng thêm một khẳng định độc lập rằng NOOP trả về đúng giá trị trả về của callback, bit-for-bit, và không ghi gì. Import từ **đường dẫn sâu** `@oh-my-pi/pi-agent-core/telemetry/context` v.v., **không** import từ package root, để test không kéo barrel của package. **Commit 1.** | có |
| `packages/agent/test/otel.test.ts` | sửa | **KHÔNG.** File này phải có diff **0 dòng**. Đó là lưới an toàn hồi quy cho commit 2. Nếu commit 2 đòi bất kỳ thay đổi nào ở đây thì **dừng lại**: refactor không giữ nguyên hành vi và adapter đang sai. Lưu ý: lưới này có hai điểm mù đã biết (đính chính P6) — nó không phải lưới an toàn đầy đủ. 1152 LOC đã xác nhận. | có |

### Các bước

1. **Tạo hợp đồng** — `packages/agent/src/telemetry/context.ts` (file mới). Đặt tên interface span là `TelemetrySpan`, **KHÔNG** phải `Span`: `packages/agent/src/index.ts:24` đã star-export `telemetry.ts`, mà `telemetry.ts` lại re-export `Span` của OTEL tại `telemetry.ts:2106`, nên một `Span` thứ hai được star-export sẽ làm `bun run check:ts` đỏ với TS2308. Bắt buộc có `end(): void` trên interface (hôm nay có 7 call site `span.end()`, và handle span sống lâu hơn lời gọi). Mở rộng `TelemetryAttributeValue` để có `readonly string[]` và `readonly number[]` (`telemetry.ts:755` và `telemetry.ts:764` gán mảng string). Cho `setStatus` thêm tham số thứ hai tuỳ chọn `message` (cả 5 call site `setStatus` đều truyền một message). **Không import gì từ ngoài thư mục này.**
2. **Tạo NOOP context** — `packages/agent/src/telemetry/noop.ts` (file mới). `startSpan` phải là `return fn(NOOP_SPAN)` — không try/catch, không wrapper, không biến đổi gì. Giá trị trả về phải **theo danh tính (identity)** là giá trị trả về của callback, cho mọi `T`, kể cả promise, `undefined` và object.
3. **Tạo adapter tham chiếu in-memory** — `packages/agent/src/telemetry/memory.ts` (file mới). Xuất factory `createMemoryTelemetryContext()` trả về cả `TelemetryContext` lẫn một danh sách record đọc được (`name`, `parent`, `events`, `attributes`, `status`, `statusMessage`, `ended`). Liên kết cha phải đến từ một stack span bao quanh tường minh, **không** phải từ ambient context, để parentage là tất định và kiểm thử được.
4. **Tạo bộ conformance** — `packages/agent/src/telemetry/conformance.ts` (file mới). Dạng các entry `createCase(factory, group, name, test)` cộng driver `runConformance(factory)`. Viết **một case cho mỗi nhánh khác nhau**: parentage, ghi event, chuyển status (`ok` và `error`, cộng mặc định là unset), round-trip attribute, round-trip attribute dạng mảng, idempotence của `end()`, passthrough giá trị trả về của callback. **Không import `noop.ts` hay `memory.ts` ở đây.**
5. **Tạo barrel** — `packages/agent/src/telemetry/index.ts` (file mới). Star re-export với specifier không kèm extension.
6. **Thêm dòng barrel vào package root** — `packages/agent/src/index.ts:24`. Thêm `export * from "./telemetry/context";` ngay sau dòng 24. Rồi chạy `bun run check:types` trong `packages/agent` và xác nhận xanh — đây chính là bước bắt được TS2308 nếu bước 1 làm sai.
7. **Viết test conformance** — `packages/agent/test/telemetry-conformance.test.ts` (file mới). Chạy suite trên **cả** adapter memory lẫn NOOP. Thêm khẳng định phủ định riêng cho NOOP: `expect(NOOP_TELEMETRY_CONTEXT.startSpan(ctx, 'n', () => sentinel)).toBe(sentinel)` — dùng `toBe` (identity), **không** dùng `toEqual`. Chạy `bun test packages/agent/test/telemetry-conformance.test.ts`.
8. **CỔNG COMMIT 1.** `bun run check:ts` xanh, conformance test xanh, và `git diff --stat` **chỉ** hiện sáu file mới cùng thay đổi một dòng ở `index.ts`. Commit 1 **không được** chạm vào `telemetry.ts` hay bất kỳ production path nào. Đưa lên và merge **trước khi** bắt đầu commit 2.
9. **Commit 2 — thêm implementation nền OTEL.** Định tuyến `startSpan` private qua nó, giữ nguyên chữ ký hiện có và giữ nguyên **từng byte** thứ tự ghép attribute (`packages/agent/src/telemetry.ts:466`; thứ tự ưu tiên tại `:466-491` là load-bearing: operation → model → conversation → agent → config → dynamic → caller). **Không được đảo thứ tự.**
10. **Commit 2 — định tuyến `runInActiveSpan`** qua activation hook của hợp đồng (`packages/agent/src/telemetry.ts:2048`), giữ nguyên ngữ nghĩa OTEL-context mà doc comment của nó mô tả (`startSpan` tạo nhưng không activate; chính wrapper là thứ làm cho các span provider/MCP phía dưới bám làm con). Giữ nó được export với cùng chữ ký — nó thuộc public surface.
11. **CỔNG COMMIT 2.** Xác nhận OTEL vẫn là đường mặc định và không có gì khác dịch chuyển: `git diff --stat packages/agent/test/otel.test.ts` **phải rỗng**. Nếu không rỗng thì **DỪNG** — đừng sửa test cho nó qua. Rồi chạy `bun test packages/agent/test/otel.test.ts` một khi native addon đã build.
12. **Commit 2 — changelog + vệ sinh commit.** Thêm một dòng dưới `## [Unreleased]` trong `packages/agent/CHANGELOG.md` (đây là refactor nội bộ, nên `### Changed` và diễn đạt theo hướng "không có gì thay đổi với người dùng", hoặc bỏ qua — người thật sẽ quyết). Rồi xác nhận `git log` hiện W10 đúng **hai** commit tách biệt, không bao giờ bị squash.

### Hình dạng code

```typescript
// packages/agent/src/telemetry/context.ts — no imports at all.

export type TelemetryAttributeValue =
	| string
	| number
	| boolean
	| readonly string[]
	| readonly number[];
export type TelemetryAttributes = Readonly<Record<string, TelemetryAttributeValue>>;

export type SpanStatus = "unset" | "ok" | "error";

/**
 * Named `TelemetrySpan`, NOT `Span`: packages/agent/src/index.ts:24 star-exports
 * telemetry.ts, which re-exports OTEL's `Span` (telemetry.ts:2106). A second
 * star-exported `Span` is TS2308 under `bun run check:ts`.
 *
 * `end()` is REQUIRED: telemetry.ts has 7 `span.end()` call sites and span
 * handles escape their creator (startChatSpan :693 -> finishChatSpan :1116,
 * across an await). A callback-scoped span with no end() cannot express this.
 */
export interface TelemetrySpan {
	addEvent(name: string, attributes?: TelemetryAttributes): void;
	setAttributes(attributes: TelemetryAttributes): void;
	setStatus(status: SpanStatus, message?: string): void;
	end(): void;
}

export interface TelemetryContext {
	/**
	 * Callback-based: the span exists for the duration of `fn`, and the return
	 * value of `fn` is the return value of startSpan. EVERY adapter must keep
	 * this shape — including NOOP. A NOOP that swallows the return value
	 * silently breaks the shape of every other adapter.
	 */
	startSpan<T>(context: TelemetryContext, name: string, fn: (span: TelemetrySpan) => T): T;
}

// packages/agent/src/telemetry/noop.ts
const NOOP_SPAN: TelemetrySpan = {
	addEvent() {},
	setAttributes() {},
	setStatus() {},
	end() {},
};

export const NOOP_TELEMETRY_CONTEXT: TelemetryContext = {
	// MUST return the callback's result UNCHANGED.
	startSpan<T>(_context: TelemetryContext, _name: string, fn: (span: TelemetrySpan) => T): T {
		return fn(NOOP_SPAN);
	},
};

// packages/agent/src/telemetry/index.ts — extensionless, matching the repo.
export * from "./context";
export * from "./memory";
export * from "./noop";

// packages/agent/src/index.ts, inserted immediately after line 24:
//   export * from "./telemetry";          <- existing line 24
//   export * from "./telemetry/context";  <- add this

// commit 2 — packages/agent/src/telemetry.ts, OTEL-backed, DEFAULT path.
// The adapter satisfies the contract structurally WITHOUT changing any
// exported signature, so telemetry.ts:2106 keeps re-exporting Span,
// SpanKind, SpanStatusCode, Tracer and trace verbatim, and
// packages/agent/src/run-collector.ts:19,144-145 (which types spans as the
// OTEL Span and WeakMap-keys them) keeps compiling untouched.
const otelAdapter: TelemetryContext = {
	startSpan<T>(_context: TelemetryContext, _name: string, fn: (span: TelemetrySpan) => T): T {
		// The real work stays in the private startSpan() at telemetry.ts:466,
		// whose signature and attribute-precedence order are unchanged. This
		// adapter only narrows the OTEL Span to the vendor-neutral surface.
		return fn(narrowSpan(otelSpan));
	},
};
```

### Hợp đồng test

Hợp đồng quan sát được: một implementation của `TelemetryContext` có thể hoán đổi vào mà mọi hành vi telemetry mà omp phơi bày vẫn y hệt. Test bảo vệ bốn thứ.

1. **SPAN PARENTAGE** — một span khởi tạo bên trong callback của span khác ghi span bao quanh làm cha, không bao giờ là root; người tiêu dùng đang debug một run trên backend không phải OTEL sẽ thấy đúng hình cây mà họ thấy trong OTEL hôm nay. Nếu hồi quy, người tiêu dùng thấy một cây span phẳng/tách rời trên backend mới.
2. **EVENT + STATUS** — `addEvent` và `setStatus` trên bề mặt trung lập-vendor tạo ra cùng các event của span và cùng `status.code` mà một exporter OTEL phía dưới sẽ thấy; `otel.test.ts:246`, `:317`, `:337`, `:384` là bằng chứng sẵn có cho phía OTEL. Nếu hồi quy, người tiêu dùng thấy span mất event hoặc sai mã trạng thái khi xuất ra ngoài.
3. **NOOP IDENTITY** — `NOOP_TELEMETRY_CONTEXT.startSpan` trả về giá trị của callback **theo danh tính** và không ghi gì. Nếu hồi quy, mọi code path dạng `return telemetry.startSpan(..., () => computeSomething())` âm thầm trả về `undefined` — đó là bug trả sai kết quả mà **không** khẳng định nào trên output OTEL sẽ bắt được.
4. **ARRAY ATTRIBUTES VÀ STATUS MESSAGES** — attribute `string[]` và message của `setStatus` sống sót qua vòng đi-về. Đây chính là hai chỗ `otel.test.ts` **không** hề che; nếu hợp đồng bị thu hẹp quá mức thì thứ duy nhất bắt được là bộ conformance này. Nếu hồi quy, người tiêu dùng thấy một backend Sentry hoặc structured-log trong tương lai lên xuống thành công nhưng âm thầm vứt mất stop sequences, danh sách available-tool, và mọi error message trên span thất bại.

File test: `packages/agent/test/telemetry-conformance.test.ts` (mới) và `packages/agent/test/otel.test.ts` (sửa **0 dòng** — nó là lưới hồi quy của commit 2, không phải nơi thêm khẳng định).

### Xác minh

```bash
# Chạy được NGAY HÔM NAY (không cần native addon) — cổng của commit 1.
cd packages/agent && bun run check:types
bun run check:ts

# Chỉ chạy được sau khi đã build native addon
#   (bun --cwd=packages/natives run build)
bun test packages/agent/test/telemetry-conformance.test.ts
bun test packages/agent/test/otel.test.ts
git diff --stat packages/agent/test/otel.test.ts   # PHẢI in ra rỗng
```

`cd packages/agent && bun run check:types` đã được xác nhận xanh tại HEAD `ecd516f`, và nó là thứ bắt được va chạm TS2308 giữa các barrel. Riêng `bun test packages/agent/test/otel.test.ts` hiện **đang bị chặn**: chạy ra `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64`. Mọi bước nào ghi "chạy test" đều bị chặn cho tới khi addon được build.

**Cách giảm thiểu để commit 1 vẫn kiểm chứng được mà không cần addon:** import test conformance từ **đường dẫn sâu** (`@oh-my-pi/pi-agent-core/telemetry/context`), không bao giờ từ package root. Exports map của package có `"./*": "./src/*.ts"`, nên đường dẫn sâu resolve thẳng ra file và không nạp `src/index.ts` — do đó không nạp pi-natives. **Điều này cần kiểm chứng thực nghiệm ở lần chạy đầu tiên**: nếu hóa ra đường dẫn sâu vẫn kéo theo natives, thì commit 1 chỉ kiểm chứng được bằng type-check cho tới khi addon được build, và điều đó phải được ghi rõ trong PR.

### Cổng hoàn thành

**COMMIT 1:** (a) `cd packages/agent && bun run check:types` xanh — đây là cổng load-bearing và là cổng **duy nhất** hiện chạy được; (b) `git diff --stat` liệt kê đúng sáu file mới dưới `packages/agent/src/telemetry/` cộng thay đổi một dòng ở `packages/agent/src/index.ts`, không có gì khác — đặc biệt `telemetry.ts` phải hiện **0 dòng thay đổi**; (c) `git log` cho thấy commit 1 là một commit riêng.

**COMMIT 2:** (a) `git diff --stat packages/agent/test/otel.test.ts` in ra **rỗng**; (b) `git diff --stat packages/agent/src/telemetry.ts` cho thấy một seam nhỏ, đọc review được — nếu đó là một bản viết lại toàn bộ file 2114 LOC thì thiết kế commit 2 theo đính chính P4 đã không được làm theo; (c) `bun test packages/agent/test/otel.test.ts` xanh một khi addon đã build; (d) `git log` cho thấy W10 là **đúng hai** commit tách biệt, không bao giờ bị squash.

**Cổng có thể thực sự đỏ không?** Có, với cổng type — và nó đã được chứng minh đỏ chứ không phải giả định. Chế độ lỗi chính xác đã được tái hiện trong một project scratch biệt lập: với `export * from "./telem"` và `export * from "./telem/context"` trong đó cả hai đều export một interface tên `Span`, trình kiểm tra kiểu phát ra `error TS2308: Module "./telem" has already exported a member named 'Span'`. Vì `telemetry.ts:2106` re-export `Span` của OTEL và plan bắt buộc thêm một star-export nữa vào `packages/agent/src/index.ts`, làm đúng theo tên interface của §F8 **sẽ** biến `bun run check:types` thành đỏ. Đổi tên thành `TelemetrySpan` là thứ làm nó xanh — tức là cổng phân biệt được đúng với sai. Cổng của commit 2 (`git diff --stat` trên `otel.test.ts`) cũng thực sự có thể bị bác bỏ: nó thành khác rỗng **ngay khi có ai đó sửa file đó**, đúng thứ mà plan đang cố ngăn. **Caveat duy nhất:** nửa hành vi của cả hai cổng hiện **không chạy được** vì native addon chưa build, nên vào đầu tuần cổng type là thật còn cổng test chỉ là một lời hứa.

### Phụ thuộc

Không. `depends_on` rỗng và `blocks` rỗng — W10 không chặn và không bị chặn bởi mục nào khác. (Lưu ý vận hành: plan dùng lại ID `W10` ba lần trong cùng một tài liệu — lần hai là CI/release/Docker/homebrew/nix rename, plan dòng 7962; lần ba là collab transport watchdog, plan dòng 8544. Mục ở đây là cái telemetry (Wave 4, dòng 1347-1429).)

### Cách sai dễ nhất

Thiết kế hợp đồng theo đúng bản phác §F8 của plan. Bản phác đó **không diễn đạt nổi** vòng đời span thật của omp — không có `end()`, và một span scope theo callback trong khi handle thật sự bay qua một `await` (`startChatSpan` tại `telemetry.ts:693` trả về handle, handle đó tới `finishChatSpan` tại `telemetry.ts:1116` và gọi `span.end()` ở `:1162`; tổng cộng 7 call site `span.end()`, **không** cái nào nằm trong callback đã tạo nó) — đồng thời hẹp quá về kiểu attribute. Sau đó mới phát hiện thứ duy nhất bắt được việc mất attribute âm thầm đó là một bộ test mà chính bạn đang viết **song song** với thứ nó lẽ ra phải giám sát.

Hai bẫy phụ đi cùng: (1) cám dỗ sửa `otel.test.ts` cho nó chạy qua — cấm tuyệt đối; (2) bản sửa C17 của chính plan mâu thuẫn với chỉ dẫn §W10/§F8 của nó, nên kỹ sư chỉ đọc §F8 sẽ dựng sai commit 2.

### Cần người quyết

- **`TelemetryAttributes` có nhận giá trị `null | undefined` không, giống `AttributeValue` của chính OTEL?** Đã kiểm trong `node_modules`: `AttributeValue` của OTEL là `string | number | boolean | Array<null|undefined|string> | Array<null|undefined|number> | Array<null|undefined|boolean>` và `Attributes` cho phép `AttributeValue | undefined`. Ở đây chọn hẹp hơn — `readonly string[]` / `readonly number[]` — vì đó mới là thứ omp thực sự gán hôm nay, nhưng một backend tương lai có thể cần `null`. **Người thật phải chọn:** bám OTEL tuyệt đối, hay giữ hẹp và mở rộng khi có backend cần. *(Chặn bước 1 — phải quyết trước khi gõ interface.)*
- **`conformance.ts` có được ship trong cây `src` đã publish không, hay chỉ dev?** `packages/agent/package.json` có `files: ["src"]` và `main`/`types` trỏ thẳng vào source, nên một module conformance nằm trong `src` sẽ tới tay mọi consumer. Nó vô hại (thuần, không phụ thuộc gì) nhưng đây là một lựa chọn có chủ đích, không phải tai nạn — hãy xác nhận đó là ý định chứ không phải một module chỉ-dùng-cho-test vốn thuộc về `test/`. *(Chặn bước 4.)*
- **Có export hợp đồng ra package root ngay ở milestone 1 không, hay giữ internal với một owner chịu trách nhiệm rõ ràng?** Plan coi dòng barrel là bắt buộc, và ở đây cũng đồng ý, vì tiền đề của commit 2 phụ thuộc vào nó. Nhưng nó cũng có nghĩa là một cam kết public API đang được tạo ra trong một milestone vốn được nói rõ là không hướng tới người dùng. Đáng để có một câu yes/no tường minh từ maintainer trước khi merge commit 1. *(Chặn bước 6.)*
- *(Không chặn việc bắt đầu)* Trong ba bản W10 của plan, cái nào đang nằm trên board của ai tuần này — bản CI/release/Docker/homebrew/nix rename hay bản collab transport watchdog? ID bị dùng lại ba lần trong một tài liệu, nên một ticket board khoá theo chữ `W10` sẽ đụng nhau.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| §F8: hình mẫu tham chiếu là `pi-ref/packages/telemetry/src/memory.ts` (219 LOC) và `pi-ref/packages/telemetry/src/testing/conformance.ts` (315 LOC); package telemetry của pi là 935 LOC so với 2114 của omp. | **không kiểm chứng được** — nguồn được tham chiếu không có trong repo này | Không tồn tại thư mục `pi-ref/`. `ls -d pi-ref` → NO pi-ref DIRECTORY; `git ls-files \| grep -c pi-ref` → 0 (xác nhận hai lần). `memory.ts` và `conformance.ts` phải được thiết kế từ đầu, không phải port; các con số 219/315/935 **không được** dùng để ước lượng hay để lập luận "không có lợi thế về LOC". Chiến lược (hợp đồng trung lập-vendor, giữ OTEL làm mặc định) vẫn đứng được bằng lý do riêng; chỉ có bằng chứng cho nó là không có. |
| §F8 / §W10: hợp đồng là `interface Span { addEvent; setAttributes; setStatus }` cộng `startSpan<T>(context, name, fn)` dạng callback. | **sai** — hợp đồng viết như vậy không diễn đạt nổi vòng đời span của omp | Không có `end()` trên interface và span bị scope theo callback, nhưng span của omp **không** phải callback-scoped: `startChatSpan` (`telemetry.ts:693`) **trả về** một handle, handle đó được đưa cho `finishChatSpan` (`telemetry.ts:1116`) qua một ranh giới `await`, và gọi `span.end()` tại `:1162`. Tổng cộng 7 call site `span.end()`, không cái nào nằm trong callback đã tạo nó. Một span không end được thì không implement được. Đã thêm `end(): void` vào interface. Vẫn giữ dạng callback — nó là thứ mô hình hoá `runInActiveSpan` (`:2048`) — nhưng interface phải mang `end()`. |
| §F8: interface span tên `Span`, và plan bắt thêm `export * from "./telemetry/context";` vào `packages/agent/src/index.ts` sau dòng 24. | **sai** — hai chỉ dẫn này cộng lại là một build break cứng (TS2308) | `packages/agent/src/index.ts:24` là `export * from "./telemetry";` và `telemetry.ts:2106` re-export `Span` của OTEL (`export { type Attributes, type Span, SpanKind, SpanStatusCode, type Tracer, trace }`). Star-export một interface thứ hai tên `Span` từ cùng một barrel làm `bun run check:ts` đỏ. Đặt tên interface hợp đồng là `TelemetrySpan` và export `Span` của OTEL nguyên vẹn. Điều này đã được kiểm chứng bằng cách biên dịch đúng hình dạng đó trong một project scratch, không phải bằng suy luận: `--noEmit --strict` trên hai barrel star-export cùng tên `Span` phát ra `error TS2308: Module "./telem" has already exported a member named 'Span'. Consider explicitly re-exporting to resolve the ambiguity.` Nguồn va chạm: `packages/agent/src/index.ts:24` + `packages/agent/src/telemetry.ts:2106`, cả hai đã xác nhận bằng đọc file. |
| §W10 (dòng 1347) và §F8 (dòng 2558): commit 2 diễn đạt lại `packages/agent/src/telemetry.ts` (2114 LOC) thành một adapter trên hợp đồng mới. | **tự mâu thuẫn** — bản sửa C17 của chính plan nói ngược lại, và C17 là thứ phải theo | C17 (plan dòng 380) nêu đúng phạm vi: seam **đã có sẵn** dưới dạng `AgentTelemetry` tại `telemetry.ts:406` và `resolveTelemetry` tại `:418`, và W10 nên cho ~15 free-function span helper một backing thay thế được bằng cách định nghĩa một hợp đồng hẹp **DƯỚI** `AgentTelemetry` và giữ `AgentTelemetry` làm public surface — và nói rõ "does NOT require re-expressing 2114 LOC". Một bản viết lại toàn bộ trái với điều đó và ít khả năng nhất để đạt được diff 0 dòng ở `otel.test.ts`. Hãy hiện thực commit 2 như seam ~40 LOC tại `startSpan` private (`:466`) và `runInActiveSpan` (`:2048`), với mọi chữ ký export giữ nguyên từng byte. Cả hai mục §W10 và §F8 nói "rewrite" đều phải coi là bị C17 thay thế. |
| §F8: `export type TelemetryAttributeValue = string \| number \| boolean;` | **sai** — quá hẹp, không biểu diễn được attribute omp đã phát ra | Hai call site gán mảng string: `telemetry.ts:755` `attrs[GenAIAttr.RequestStopSequences] = [...request.stopSequences]` và `telemetry.ts:764` `attrs[PiGenAIAttr.RequestAvailableTools] = request.tools.map(tool => tool.name)`. Một hợp đồng từ chối `string[]` sẽ buộc commit 2 hoặc phải vứt bỏ các attribute đó (một thay đổi hành vi âm thầm) hoặc phải nới rộng chống lại plan. Mở rộng để có `readonly string[]` và `readonly number[]`. Đã kiểm `node_modules` thay vì đoán: `AttributeValue` thật của OTEL là `string \| number \| boolean \| Array<null\|undefined\|string> \| Array<null\|undefined\|number> \| Array<null\|undefined\|boolean>` (`node_modules/@opentelemetry/api/build/src/common/Attributes.d.ts:18`). |
| §W10 và §F8: `otel.test.ts` (1152 LOC) là lưới an toàn cho commit 2, và việc nó pass với diff 0 dòng là bằng chứng giữ nguyên hành vi. | **sai một phần** — nó là lưới thật nhưng có hai điểm mù, và cả hai nằm đúng chỗ hợp đồng nhiều khả năng sai nhất | `otel.test.ts` có **không** khẳng định nào về `RequestStopSequences` hay `RequestAvailableTools`, và **không** có chỗ nào trong `packages/agent/test` nói tới `stopSequences` / `availableTools` / `available_tools`. Nó cũng chỉ khẳng định trên `status.code` (dòng 246, 317, 337, 384) và không bao giờ khẳng định `status.message`, trong khi cả 5 call site `setStatus` ở `telemetry.ts` đều truyền một message. Nên một adapter dựng trên hợp đồng của plan sẽ âm thầm vứt mất stop sequences, danh sách available-tool, và **mọi** error message trên span thất bại — trong khi cổng của chính plan vẫn xanh. Conformance suite **phải** che attribute dạng mảng và status message, và PR nên nói thẳng ra là `otel.test.ts` không che chúng. |
| Vendor-neutral `Span` có thể chảy qua được bên trong hiện tại của `telemetry.ts`. | **bị ràng buộc** — hai coupling cứng mà plan không nhắc tới | Thứ nhất, `packages/agent/src/run-collector.ts` khai báo `import type { Span } from "@opentelemetry/api"` và dùng Span sống làm khoá WeakMap với property gắn symbol (type ở `:144-145`, dùng ở `:180-274`). Thứ hai, `telemetry.ts:2106` re-export `Span`, `SpanKind`, `SpanStatusCode`, `Tracer` và `trace` ra **public surface**, kèm comment "Re-exports so consumers can write hooks without depending on @opentelemetry/api directly". Vậy các type OTEL đã là một phần public API và không thể gỡ trong milestone này. Cổng diff-0-dòng ở `otel.test.ts` chỉ đạt được nếu hợp đồng được thoả **mang tính cấu trúc**, đứng sau các chữ ký sẵn có, chứ không phải bằng cách thay thế type `Span`. Lưu ý thêm: `@opentelemetry/api` là dependency **runtime cứng** trong `packages/agent/package.json` (không optional, không peer) — milestone này không gỡ nó, và cũng không nên tuyên bố đã gỡ. |
| §F8: barrel re-export với extension tường minh — `export * from "./context.ts";` | **sai quy ước của repo này** | Không file nào trong `packages/agent/src` dùng extension `.ts` trong specifier import hay re-export (`git grep -n 'from "\..*\.ts"' -- packages/agent/src` → không có kết quả). Dùng `export * from "./context";`. Đường dẫn chuẩn đã xác nhận là `packages/agent/src/telemetry/context.ts`, và thêm thư mục `telemetry/` cạnh `telemetry.ts` là an toàn. |
| §W10: `packages/agent/src/index.ts:24` là `export * from "./telemetry";` và có ba consumer dùng specifier đó — `agent-loop.ts:74`, `compaction/anthropic.ts:22`, `compaction/branch-summarization.ts:11`. | **đúng phần lớn nhưng thiếu, có một số dòng lệch một** | Dòng 24 là đúng. `agent-loop.ts` import ở dòng **75**, không phải 74. Hai file compaction dùng `"../telemetry"` (chúng nằm sâu một thư mục), không phải `"./telemetry"`. Quan trọng hơn, danh sách consumer không đầy đủ — một refactor phải giữ **tất cả** chúng compile được: `compaction/compaction.ts:41` (plan bỏ sót), barrel ở `index.ts:24`, một import chỉ-type ở `types.ts:28`, và bốn file test import subpath công khai: `compaction-telemetry.test.ts:26`, `instrumented-oneshot-retry.test.ts:2`, `run-summary.test.ts:19`, `otel.test.ts:24`. |
| Task brief và plan tham chiếu repo ở git HEAD `5873776`. | **sai** | HEAD là `ecd516f` trên nhánh `milestone-1`, và đó là commit duy nhất trong repo (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`). Mọi anchor trong tài liệu này đã được kiểm chứng trên `ecd516f`. |
| §W10: "Verified: import ... from `"./telemetry"` STILL resolves to the FILE telemetry.ts, not to the directory." | **ĐÃ XÁC NHẬN** — claim structural load-bearing nhất của plan vẫn đúng, và đã được kiểm chứng lại bằng cách chạy thật | Không cần sửa gì, nhưng kiểm chứng đã được siết: điều này giữ **ngay cả khi `telemetry/index.ts` đã tồn tại**, nên tạo barrel là an toàn. Nghĩa là entry `"./*": {"types": "./src/*.ts", "import": "./src/*.ts"}` trong exports map của `packages/agent/package.json` vẫn phục vụ `@oh-my-pi/pi-agent-core/telemetry` cho **file**, và commit 1 không cần đổi `package.json` nào. Tái hiện trong scratch, chạy hai lần: với `mod.ts` một mình, rồi với cả `mod.ts` và `mod/index.ts`. Cả hai lần đều in `bun resolves ./mod -> FILE mod.ts`. |


---


## W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port

**Thay đổi gì:** Thêm đúng MỘT file test khoá lại việc `strict` đi qua extension-tool bridge mà không bị rơi (opt-in `true` vẫn là `true`) và không bị bịa thêm (vắng mặt vẫng là `undefined`, không phải `true`); không sửa một dòng production nào, không tạo `constrained-sampling.ts`.  **Wave:** Wave 4 (Hợp đồng hướng provider — W11 + W10). Không bị chặn bởi wave nào; không chặn mục nào. Đứng trước W10 vì rẻ nhất milestone.  **Effort:** S — một file test, hai hợp đồng trên output của bridge, không file production nào, không cần provider round-trip nên không cần network hay addon ở giai đoạn typecheck.

**Người dùng thấy:** none — internal. Không có thay đổi hành vi runtime, không có file production nào, không có mặt UI hay CLI nào.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/test/tools/strict-declaration-guard.test.ts` | tạo | File test MỚI, hai hợp đồng trên giá trị mà bridge trả về: (1) `strict: true` trên CustomTool đi qua `customToolToDefinition` → `wrapRegisteredTool` → `RegisteredToolAdapter` và đọc ra `=== true`; (2) tool KHÔNG khai báo `strict` đọc ra `=== undefined`, không phải `true`. | **Chưa** (`verified: false`) — đây là file chưa tồn tại, nên không có mã để trích dẫn. Spec đã xác nhận file KHÔNG tồn tại tại HEAD `ecd516f` (`ls` → exit 1). Đường dẫn đúng vì `bun run check:tools` (`package.json:95`) fmt/lint toàn bộ `packages/*/{test,bench,examples,scripts}/**/*.ts`, nên file mới nằm trong gate đó. |

Không có file production nào khác trong danh sách. Mọi file đọc ở bước 1–4 chỉ để đọc, không sửa.

### Các bước

1. Đọc `packages/coding-agent/src/extensibility/tool-proxy.ts` (35 dòng, cả file) **trước khi viết**. Đây là cơ chế thật sự quyết định hợp đồng, và nó **không** nằm ở `wrapper.ts` như plan nói. Ghi nhận dòng 12: `if (key === "constructor" || visited.has(key) || key in wrapper) { continue; }` — mọi key đã có sẵn trên wrapper bị **bỏ qua**, không proxy.
   *Anchor: `packages/coding-agent/src/extensibility/tool-proxy.ts:12`*
2. Đọc `packages/coding-agent/src/extensibility/extensions/wrapper.ts` dòng 32–48. `RegisteredToolAdapter` khai `declare strict: boolean;` ở dòng 37 — `declare` là **type-only, không emit field runtime**. Constructor gọi `applyToolProxy(registeredTool.definition, this)` ở dòng 47. Vì `declare` không emit gì, `"strict" in wrapper` là `false` lúc proxy chạy ⇒ `strict` **được** proxy. Đây chính là cơ chế làm cho tool có strict sống sót tới adapter.
   *Anchor: `packages/coding-agent/src/extensibility/extensions/wrapper.ts:37,47`*
3. Xác nhận nguồn đầu vào: `customToolToDefinition` ở `sdk.ts:1188` gán `strict: tool.strict` ở dòng 1205, với comment giải thích đúng lý do (#4336/#4340). Đây là chỗ nhận `strict` từ `CustomTool`.
   *Anchor: `packages/coding-agent/src/sdk.ts:1188,1205`*
4. Chép **khuôn khung** từ `packages/coding-agent/test/task-executor-mcp-parity.test.ts` dòng 64–80 (test `"survives the custom-tool → definition bridge into the registered session tool"`) — nó đã đi đúng chuỗi `customToolToDefinition` → `wrapRegisteredTool` và assert giá trị trên adapter. **Chỉ chép hình dạng** và cách cast `{ definition, extensionPath } as RegisteredTool`; tool của nó là `strict: false` nên không dùng lại được assertion.
   *Anchor: `packages/coding-agent/test/task-executor-mcp-parity.test.ts:64-80`*
5. Viết hợp đồng 1 (opt-in sống sót qua bridge): một `CustomTool` có `strict: true` → `customToolToDefinition` → `wrapRegisteredTool` → `expect(adapter.strict).toBe(true)`. Dùng tên tool **không** nằm trong allowlist Anthropic (`bash`/`python`/`edit`/`find`) để test không vô tình phụ thuộc nhánh allowlist.
   *Anchor: `packages/coding-agent/test/tools/strict-declaration-guard.test.ts`*
6. Viết hợp đồng 2 (vắng mặt không được bịa thành opt-in): tool **không khai báo** `strict` (phải **omit hẳn key**, không gán `undefined`) → `expect(adapter.strict).toBeUndefined()`. Đây là hợp đồng phủ định có lý do cụ thể: hai provider opt-in sẽ siết ngay mọi tool extension nếu bridge có giá trị mặc định — `openai-codex-responses.ts:5078` (`!!tool.strict`) và `devin.ts:659` (`tool.strict ?? false`).
   *Anchor: `packages/coding-agent/test/tools/strict-declaration-guard.test.ts`*
7. Viết comment ngay trên hợp đồng 2 cảnh báo **không** đọc sai: đây **không** phải "vắng mặt = non-strict". `openai-completions.ts:2594` đọc `tool.strict !== false` nên vắng mặt **vẫn** ra strict ở provider đó. Hợp đồng đang khoá là *"bridge không tự bịa opt-in"*, không phải *"wire mặc định là non-strict"* — đổi mặc định wire là việc khác, không thuộc W11.
   *Anchor: `packages/coding-agent/test/tools/strict-declaration-guard.test.ts`*
8. Chạy `bun run check:ts` từ repo root (chạy được **ngay**, không cần native addon) và `bunx oxfmt --check 'packages/coding-agent/test/tools/strict-declaration-guard.test.ts'`. Cả hai phải xanh trước khi coi là xong.
   *Anchor: `package.json:94-95`*
9. Sau khi native addon được build (`bun --cwd=packages/natives run build`), chạy `bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts` và xác nhận **2 pass**. Trước khi build, `bun test` **báo đỏ toàn bộ** (kể cả test có sẵn) — xem mục Cổng hoàn thành.
   *Anchor: `packages/natives/native/loader-state.js:970`*

### Hình dạng code

```typescript
import { describe, expect, it } from "bun:test";
import type { CustomTool } from "../src/extensibility/custom-tools/types";
import type { ExtensionRunner } from "../src/extensibility/extensions/runner";
import type { RegisteredTool } from "../src/extensibility/extensions/types";
import { wrapRegisteredTool } from "../src/extensibility/extensions/wrapper";
import { customToolToDefinition } from "../src/sdk";

// The adapter only needs a context factory; it is never exercised on this path.
const STUB_RUNNER = { createContext: () => ({}) } as unknown as ExtensionRunner;

function stubTool(name: string, strict?: boolean): CustomTool {
	const tool: CustomTool = {
		name,
		label: name,
		description: `stub ${name}`,
		parameters: { type: "object", properties: {} },
		async execute() {
			return { content: [{ type: "text", text: "ok" }] };
		},
	};
	// Assign only when the caller asked for a value, so the "absent" case omits
	// the key outright — that omitted state is what contract 2 is about.
	if (strict !== undefined) tool.strict = strict;
	return tool;
}

function toSessionAdapter(name: string, strict?: boolean) {
	const definition = customToolToDefinition(stubTool(name, strict));
	return wrapRegisteredTool({ definition, extensionPath: "<test>" } as RegisteredTool, STUB_RUNNER);
}

describe("strict across the extension-tool bridge", () => {
	it("keeps an explicit strict:true opt-in on the registered session tool", () => {
		// applyToolProxy skips any key already present on the wrapper
		// (tool-proxy.ts:12). It works today only because `declare strict` on
		// RegisteredToolAdapter (wrapper.ts:37) emits no runtime field.
		expect(toSessionAdapter("opt-in", true).strict).toBe(true);
	});

	it("does not fabricate an opt-in for a tool that never declared strict", () => {
		// NOT "absent means non-strict": openai-completions.ts:2594 reads
		// `tool.strict !== false`, so an omitted flag is still strict there. What is
		// locked here is narrower — the bridge must not invent a value, because the
		// two opt-in providers would tighten every extension tool on its own:
		// openai-codex-responses.ts:5078 (`!!tool.strict`), devin.ts:659
		// (`tool.strict ?? false`).
		expect(toSessionAdapter("no-strict").strict).toBeUndefined();
	});
});
```

### Hợp đồng test

Hai hợp đồng, cùng một file, **cả hai** assert trên giá trị mà bridge trả về — không phải trên field của class nguồn.

**(1) OPT-IN SỐNG SÓT.** Một `CustomTool` khai `strict: true` phải đọc ra `=== true` ở `RegisteredToolAdapter` sau khi đi qua `customToolToDefinition` → `wrapRegisteredTool`. Đây **không** phải success-passthrough: giá trị đi qua một proxy phản ánh (`applyToolProxy`) dùng `Reflect.ownKeys` + `Object.defineProperty`, và cơ chế `key in wrapper` ở `tool-proxy.ts:12` có thể **bỏ qua** nó.

**(2) VẮNG MẶT KHÔNG ĐƯỢC BỊA THÀNH OPT-IN.** Tool không khai báo `strict` phải đọc ra `=== undefined`, không phải `true` — hợp đồng phủ định, vì hai provider opt-in (`openai-codex-responses.ts:5078` `!!tool.strict`, `devin.ts:659` `tool.strict ?? false`) sẽ siết ngay **mọi** tool extension nếu bridge có giá trị mặc định.

**Nếu hồi quy:** ai đó sửa `customToolToDefinition` (`sdk.ts:1205`) hoặc `applyToolProxy`, `strict` rơi khỏi đường extension và hành vi đổi **theo provider** — `devin`/`codex` mất strict, còn OpenAI/Anthropic không đổi (vì chúng opt-out bằng `!== false` và `bash`/`edit` đều nằm trong allowlist) — nên không ai truy ra nguồn. Đó đúng là lý do file test này tồn tại.

**Khoảng trống cố ý:** năm dòng `readonly strict = true` của builtin (`bash.ts:604`, `read.ts:861`, `write.ts:440`, `ast-edit.ts:187`, `edit/index.ts:329`) **không** được khoá. Không có cách rẻ nào khoá chúng mà không biến thành static echo, và theo phân tích ba trạng thái + ba phép so sánh provider, xoá dòng đó chỉ đổi hành vi trên **hai** provider opt-in — một assertion đọc field class không bắt được. Khoá thật sẽ là provider round-trip, cỡ M. Với wave hiện tại (S), mặc định là **không khoá**, và người đọc phải biết khoảng trống đó còn ở đó.

File test: `packages/coding-agent/test/tools/strict-declaration-guard.test.ts`

### Xác minh

```bash
# CHẠY ĐƯỢC NGAY (không cần native addon)
bun run check:ts                                                    # đã verify PASS tại HEAD ecd516f
bunx oxfmt --check 'packages/coding-agent/test/tools/strict-declaration-guard.test.ts'
bunx oxlint packages/coding-agent/test/tools/strict-declaration-guard.test.ts

# BỊ CHẶN cho tới khi build addon
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build                                # điều kiện tiên quyết
bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts   # kỳ vọng: 2 pass
```

Cấm tuyệt đối dùng `tsc` / `npx tsc` — phải `bun check` / `bun run check:ts`. Lưu ý: `bun check` = `check:ts` + `check:rs` (`package.json:93`); `check:rs` cần cargo nên trong bài toán này chỉ chạy được `check:ts`.

### Cổng hoàn thành

`bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts` báo **2 pass**, **sau khi** native addon đã build. Điều kiện tiên quyết bắt buộc: `bun --cwd=packages/natives run build` — ở HEAD `ecd516f` addon **chưa** build, nên `bun test` hiện đỏ `0 pass / 1 fail` ngay cả với file test **đã tồn tại** (đã verify chạy thật `task-executor-mcp-parity.test.ts` → `0 pass, 1 fail, 1 error`: `Failed to load pi_natives native addon for darwin-arm64`).

Trước khi build, tiêu chuẩn nghiệm thu là `bun run check:ts` xanh (typecheck + oxlint + oxfmt).

Gate **không** dùng: đếm số tool có strict, đọc `readonly strict = true` trên 5 builtin, hoặc bất kỳ cách nào source-grep file implementation — AGENTS.md cấm, và cả ba đều là static echo.

**Cổng có thể đỏ không?** Có — `gate_can_fail: true`, và đã chứng minh bằng thực nghiệm chứ không suy luận. Spec đã chạy một bản replica trung thực của vòng lặp `applyToolProxy` (guard `key in wrapper`) với đúng hình dạng class của `RegisteredToolAdapter`: với `declare strict: boolean` (hiện tại) thì `strict` được proxy và `adapter.strict === true`; khi `declare` biến thành field runtime thật (`strict: boolean = false`), field initializer chạy **trước** thân constructor nên `key in this` thành `true`, guard bỏ qua proxy, và `adapter.strict` đọc ra `false` dù definition có `strict: true` — silent breakage, không throw, không cảnh báo. Đó chính xác là hồi quy mà test nào cũng chưa bắt được, và nó phân kỳ theo provider.
**Lưu ý trung thực:** trong môi trường hiện tại gate **không chạy được** vì addon chưa build — nó sẽ đỏ vì lý do **môi trường** chứ không phải vì lý do hợp đồng, nên phải build addon trước khi dùng gate này làm tiêu chuẩn nghiệm thu.

### Phụ thuộc

Không. `depends_on: []`, `blocks: []` — không bị chặn bởi mục nào và không chặn mục nào.

### Cách sai dễ nhất

Rủi ro thật duy nhất là **sống sót sai lầm**: ai đó đọc D-1, thấy cỡ S, rồi vẫn port vì bản gốc viết rõ — dựng `constrained-sampling.ts` cạnh `normalize.ts` và thêm field thứ hai cạnh `strict`. Kết quả là **hai nguồn sự thật** cho cùng một điều, đúng cái lỗi dossier chỉ ra ở W7, và sửa `ToolDefinition` — bề mặt authoring của extension — ngay trong M1, đúng cái seam header dành cho M2 WI-10.

Cách sai thứ hai: đi tìm một `edit.ts` không tồn tại rồi bị kẹt — bề mặt edit của omp là `write` + `ast_edit` + `edit/index.ts` cộng wire alias `apply_patch` (đã verify: `extensions-runner.test.ts:2436`, `customWireName: "apply_patch"` trên tool tên `edit`).

Cách sai thứ ba, nhẹ hơn: viết lại hai hợp đồng **đã có** — `strict: false` tường minh sống sót tới wire đã có test ở `packages/ai/test/openai-tool-strict-mode.test.ts:196,215,801,817,835`, và schema không biểu đạt được suy giảm xuống non-strict thay vì ném đã có ở `packages/ai/test/schema-strict-mode.test.ts:755,781`.

### Cần người quyết

- **Nâng W11 lên M để khoá 5 dòng `readonly strict = true` của builtin không?** Có, và phải nói ra chứ không lặng lẽ bỏ. File test này **cố ý** không khoá chúng. Muốn khoá thật thì phải assert trên wire của một provider opt-in (dựng tool list với `bash` rồi đọc payload `openai-codex-responses.ts:5078` hoặc `devin.ts:659` phát ra) — đó là provider round-trip, cỡ M, không phải S. Nếu không nâng, phải ghi rõ khoảng trống này vào bảng wave để người đọc không tưởng là sót.
- **Ba trạng thái `strict: "prefer"` của `pi` hay boolean của `omp`?** Chuyển sang M2, **không** quyết ở M1. Đây là quyết định về bề mặt authoring của extension (`ToolDefinition`), đúng loại câu hỏi mà header tài liệu dành cho M2 WI-10. M1 giữ boolean.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Repo ở git HEAD `5873776` (nói ở phần ENVIRONMENT của task và lặp lại ở W11). | STALE | HEAD thật là `ecd516f`, branch `milestone-1`. Recent commit là `ecd516f feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`. Mọi line number trong tài liệu này đã verify tại `ecd516f`. *Evidence: `git rev-parse --short HEAD` → `ecd516f`; `git rev-parse --abbrev-ref HEAD` → `milestone-1`.* |
| `interface ToolDefinition` nằm ở `packages/coding-agent/src/extensibility/extensions/types.ts:611`, field `strict` ở `:636`. | STALE — bản sửa trước tự nó sai, và đảo ngược hai số | Interface `ToolDefinition` ở dòng **636**; field `strict?: boolean` ở dòng **661**. Bản sửa trước đã hoán đổi hai con số cho nhau. Cả hai đều lệch +25 so với `5873776`. *Evidence: `grep -n '^export interface ToolDefinition' .../extensions/types.ts` → `636`; `grep -n 'strict?: boolean' .../extensions/types.ts` → `661`.* |
| Bản thứ hai của field `strict` ở `packages/ai/src/types.ts:1442`. | STALE (+1) | Dòng **1443**, trên `interface Tool<TParameters>` định nghĩa ở dòng 1438. Đây là kiểu mà adapter ở trên kế thừa, nên `adapter.strict` có type `boolean \| undefined` và cả hai assertion đều typecheck. *Evidence: `sed -n '1438,1443p' packages/ai/src/types.ts`.* |
| 3 opt-out `readonly strict = false` tại `mcp/tool-bridge.ts:663`, `:773`; `task/index.ts:561`. | STALE (+2 mỗi cái) | `mcp/tool-bridge.ts:665` và `:775`; `task/index.ts:563`. Tổng số vẫn đúng: 40 hit, 37 `= true`, 3 opt-out. *Evidence: `grep -rn 'readonly strict = ' packages/coding-agent/src/ \| grep -v '= true'` → đúng ba dòng trên.* |
| `applyToolProxy` ở `packages/coding-agent/src/extensibility/extensions/wrapper.ts:47` (W11 mô tả nó như một hàm của `wrapper.ts`, và danh sách file-đích của RỦI RO không hề nhắc tới nó). | INCOMPLETE — nhầm call site với definition | `wrapper.ts:47` là **call site** đúng. Nhưng **định nghĩa** nằm ở file khác: `packages/coding-agent/src/extensibility/tool-proxy.ts:6`. Đây là file thật sự quyết định hợp đồng — kỹ sử ở bước 1 — và nó có tiền lệ tiếp được dùng ở 4 chỗ khác (`modes/rpc/host-tools.ts:59`, `custom-tools/wrapper.ts:27`, `hooks/tool-wrapper.ts:38`, `extensions/wrapper.ts:166`). Sửa `customToolToDefinition` **hoặc** sửa file này đều làm rơi `strict` theo khuôn mẫu đã mô tả. *Evidence: `grep -rn 'applyToolProxy' packages/coding-agent/src/` → 6 hit, definition tại `extensibility/tool-proxy.ts:6`.* |
| `openai-codex-responses.ts:5078` → `!!(tool.strict)`. | IMPERFECT | Dòng 5078 đúng, biểu thức thật là `!!(!NO_STRICT && tool.strict)` — có thêm guard bypass toàn cục `NO_STRICT` mà plan bỏ sót. Không ảnh hưởng kết luận (vẫn là opt-in), nhưng khi viết comment trong test thì nên ghi `!!tool.strict` cho ngắn, đừng ghi sai biểu thức đầy đủ. *Evidence: `sed -n '5078p' packages/ai/src/providers/openai-codex-responses.ts`.* |
| Khuôn mẫu để chép ở `packages/coding-agent/test/task-executor-mcp-parity.test.ts:65-80`. | NEARLY EXACT (lệch 1) | Test bắt đầu ở dòng **64** (`it("survives the custom-tool → definition bridge into the registered session tool"`), kết thúc ở 80. Nội dung và hình dạng đúng như plan mô tả, kể cả việc nó đi qua `customToolToDefinition` rồi `wrapRegisteredTool` và assert giá trị trên adapter. *Evidence: `sed -n '55,80p' packages/coding-agent/test/task-executor-mcp-parity.test.ts`.* |
| `tools/provider-schema-compatibility.test.ts:99-101` chỉ phủ `true`/`false` tường minh, không phủ trường hợp vắng. | NEARLY EXACT (lệch 1) — kết luận ĐÚNG | Hai assertion nằm ở dòng **100-101** (`expect(task.strict).toBe(false)` và `expect(adaptSchemaForStrict(...).strict).toBe(false)`). Kết luận của plan vẫn đúng: chỉ phủ giá trị tường minh, không có test nào phủ trường hợp tool không khai báo `strict` — đúng khoảng trống mà hợp đồng 2 của W11 lấp. *Evidence: `sed -n '90,102p' packages/coding-agent/test/tools/provider-schema-compatibility.test.ts`.* |
| Giả định ngầm rằng `strict` chỉ cần một `if` ở adapter là được bảo vệ. | PLAN THIẾU — đây là phát hiện mới, không phải chỗ sai | W11 không nói tới `declare strict: boolean;` tại `wrapper.ts:37`, và đó chính là cơ chế làm hợp đồng mong manh. `declare` là type-only, **không** emit field runtime, nên `"strict" in wrapper` là `false` lúc `applyToolProxy` chạy và `strict` **được** proxy. Đã chạy replica trung thực của vòng lặp `applyToolProxy` và đo được cả hai nhánh: hiện tại `adapter.strict === true`; nếu `declare` đổi thành field runtime thật (`strict: boolean = false`), field initializer chạy trước thân constructor nên guard `key in wrapper` (`tool-proxy.ts:12`) **bỏ qua** proxy và `adapter.strict` đọc ra `false` dù definition có `strict: true` — silent, không throw. Đây là lý do cụ thể khiến hợp đồng 1 **không** phải success-passthrough, và là hồi quy mà comment trong test nên trích dẫn. *Evidence: `sed -n '32,48p' packages/coding-agent/src/extensibility/extensions/wrapper.ts` (dòng 37 `declare strict: boolean;`, dòng 47 `applyToolProxy(...)`); `sed -n '12p' packages/coding-agent/src/extensibility/tool-proxy.ts`; probe chạy thật cho cả hai nhánh.* |
| `bun check && bun test <file>` là lệnh xác minh. | INCOMPLETE — thiếu tiền điều kiện môi trường | `bun test` hiện **không** chạy được, và đây không phải hạn chế riêng của test mới. Đã verify: `bun test packages/coding-agent/test/task-executor-mcp-parity.test.ts` (file **đã tồn tại**) → `0 pass, 1 fail, 1 error`, `Failed to load pi_natives native addon for darwin-arm64`. Lỗi này chặn **toàn bộ** module graph của coding-agent, kể cả khi chạy `bun run` thuần (không chỉ `bun test`). Lệnh verify dùng ngay là `bun run check:ts` — đã chạy thật, PASS tại `ecd516f`. Ngoài ra `bun check` = `check:ts` + `check:rs` (`package.json:93`), mà `check:rs` cần cargo, nên trong bài toán này chỉ chạy được `check:ts`. *Evidence: `bun run check:ts` → tất cả package `Done`; `bun test packages/coding-agent/test/task-executor-mcp-parity.test.ts` → `0 pass 1 fail 1 error`; `package.json:93`.* |
| Các anchor còn lại: 5 builtin `strict = true`; `tryEnforceStrictSchema`; CONSTRAINTS.md dòng 51/56; cả 5 provider read site; allowlist Anthropic; `strict: tool.strict`; `wrapRegisteredTool`; `RegisteredToolAdapter`; 5 anchor test trong packages/ai; alias `apply_patch`; `constrainedSampling` = 0 hit. | VERIFIED EXACT — không cần sửa | Tất cả khớp tuyệt đối tại `ecd516f`. Dùng nguyên văn trong comment của test. *Evidence: `bash.ts:604`, `read.ts:861`, `write.ts:440`, `ast-edit.ts:187`, `edit/index.ts:329`; `normalize.ts:2436`; `CONSTRAINTS.md:51` (`MUST return { strict: false, schema: original }`) và `:56` (`MUST preserve an author's explicit tool.strict === false`); `openai-completions.ts:2594`, `openai-responses.ts:1492`, `anthropic.ts:5870` (+ allowlist `:5453` = bash/python/edit/find, gate `:5869` và keyword `:5871`), `openai-codex-responses.ts:5078`, `devin.ts:659`; `sdk.ts:1205`; `wrapper.ts:100` và `:32`; `openai-tool-strict-mode.test.ts:196/215/801/817/835`; `schema-strict-mode.test.ts:755/781`; `extensions-runner.test.ts:2436`; `grep -rn constrainedSampling packages/` → 0.* |


---


## W12. Tuần tự hoá các thay đổi file đồng thời theo realpath

**Thay đổi gì:** Thêm một hàng đợi theo `realpath` để các thao tác ghi/xoá trên **cùng một file** chạy tuần tự từng cái một, còn các file khác vẫn chạy song song, và đưa mọi tool có ghi/xoá file qua hàng đợi đó.
**Wave:** Wave 2 — Correctness trên các đường đang ship (W4, W6, W12, W13)
**Effort:** M — một helper mới (~60 LOC), hai file call-path sửa, một file test mới. Ước lượng của plan vẫn đúng; phần việc tăng thêm so với một bản port ngây thơ là vòng bọc `deleteFileWithFallback` (bước 5) và quyết định khóa cho fan-out của `ast_edit` (bước 6), hai thứ plan không nói tới.

**Người dùng thấy:** Khi hai tiến trình con (hoặc hai session) sửa cùng một file trong cùng một lượt, hai lần ghi không còn xen kẽ nữa — lần ghi thứ hai được áp dụng sạch sau lần ghi thứ nhất thay vì cắt đứt hoặc xáo lộn byte. Sửa hai file **KHÁC** nhau vẫn chạy đồng thời, nên không có hồi quy độ trễ đo được.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/utils/file-mutation-queue.ts` | tạo | Module mới export `withFileMutationQueue<T>(filePath, fn)`. `Map<string, Promise<void>>` ở cấp module, khoá theo realpath, cộng thêm một `registrationQueue` riêng để bản thân việc đăng ký cũng được tuần tự hoá. Bàn giao hai pha qua `Promise.withResolvers`, **không** phải `tail.then(run)`. | có — vắng mặt ở HEAD (`ls` + `git grep withFileMutationQueue` không ra gì). Thư mục `packages/coding-agent/src/utils/` đã tồn tại. Bản tham chiếu đọc được ở `$HOME/Projects/pi-ref/packages/coding-agent/src/core/tools/file-mutation-queue.ts` (61 LOC) — lưu ý đó là `core/tools/`, không phải `src/tools/`, và thư mục `utils` của omp là phẳng (không có barrel `src/utils/index.ts`). |
| `packages/coding-agent/src/tools/file-write-fallback.ts` | sửa | Bọc thân `writeFileWithFallback` (**:402**) và `deleteFileWithFallback` (**:305**) vào `withFileMutationQueue`, để một chỉnh sửa duy nhất cho file này phủ create/update/move/delete cho `edit` và `write`. | có — cả hai số dòng xác nhận bằng `sed -n`. `writeFileWithFallback` là chokepoint dùng chung: `git grep writeFileWithFallback` trong `src/` ra đúng **3** call site (`edit/index.ts:674`, `lsp/writethrough.ts:74`, `lsp/writethrough.ts:314`). |
| `packages/coding-agent/src/tools/ast-edit.ts` | sửa | Định tuyến các lệnh `astEdit(...)` đang apply qua `withFileMutationQueue` một cách tường minh — chúng **KHÔNG** đi qua `writeFileWithFallback`. | có — `grep -c writeFileWithFallback packages/coding-agent/src/tools/ast-edit.ts` trả 0. Ghi đi qua native `astEdit` (**:87**, **:137**) qua `urlFilesystem.shellFilesystem()`. |
| `packages/coding-agent/test/tools/file-mutation-queue.test.ts` | tạo | Test mới, 5 case bảo vệ hợp đồng của hàng đợi: tuần tự hoá cùng path, song song khác path, symlink/target dùng chung khoá, path chưa tồn tại không ném lỗi, đăng ký hai lần không xen kẽ. | có — thư mục `packages/coding-agent/test/tools/` đã tồn tại (30+ file). File test chưa tồn tại. |
| `packages/coding-agent/CHANGELOG.md` | sửa | Thêm một dòng dưới `## [Unreleased]` → `### Fixed`, văn phong hướng tới người dùng. | không — bước 8 không gắn cờ kiểm chứng. |

> **Bẫy phải biết trước khi code:** doc comment ở `file-write-fallback.ts:18-32` nói có **BỐN** call site, trong đó kể tới `edit/hashline/filesystem.ts` và `edit/modes/patch.ts` — **cả hai file này KHÔNG TỒN TẠI** ở HEAD này (đã kiểm chứng bằng `ls`). Đừng đi săn chúng; số thật là 3.

### Các bước

1. **Tạo helper** — `packages/coding-agent/src/utils/file-mutation-queue.ts` (file mới). Đọc trước `$HOME/Projects/pi-ref/packages/coding-agent/src/core/tools/file-mutation-queue.ts` (61 LOC). Chỉ import `realpath` từ `node:fs/promises` và `resolve` từ `node:path`. **KHÔNG** import bất cứ thứ gì từ `@oh-my-pi/pi-utils` — barrel đó kéo theo native addon và khiến test của module này không chạy được. Implement `isMissingPathError` inline (kiểm tra `code === "ENOENT" || code === "ENOTDIR"`) đúng như bản tham chiếu, thay vì import `isEnoent`/`isEnotdir`. Chuyển `new Promise<void>((resolveQueue) => { releaseNext = resolveQueue; })` của bản tham chiếu thành `Promise.withResolvers<void>()` theo AGENTS.md (tiền lệ trong repo: `packages/coding-agent/src/advisor/runtime.ts:454`).
2. **Khoá theo realpath (chi tiết 1/3)** — cùng file. Key là `await realpath(resolve(filePath))`, chỉ fallback về `resolve(filePath)` khi realpath reject với ENOENT hoặc ENOTDIR; **rethrow mọi lỗi khác** (ví dụ EACCES, ELOOP). Key chỉ dùng `resolve` sẽ âm thầm không serialize được hai tiến trình đi tới cùng một file qua symlink hoặc qua một đoạn `..`. Giữ `getMutationQueueKey` là một hàm có tên riêng để nhánh fallback đọc được.
3. **Tuần tự hoá chính việc đăng ký (chi tiết 2/3)** — cùng file. Dùng `let registrationQueue: Promise<void> = Promise.resolve()` ở cấp module. Mỗi lời gọi làm `const registration = registrationQueue.then(async () => { ...resolve key, đọc currentQueue, dựng nextQueue, set map... })`, rồi gán lại `registrationQueue = registration.then(() => undefined, () => undefined)` **trước khi** await. Không có bước này thì hai lời gọi `realpath` chạy đồng thời có thể cùng đọc một `currentQueue` và cùng nối vào đuôi nó — đúng cái race mà hàng đợi riêng này sinh ra để chặn. Dạng hai thám số `.then(ok, err)` là bắt buộc: `.then(() => undefined)` đơn thuần sẽ để lại `registrationQueue` ở trạng thái rejected vĩnh viễn và deadlock mọi lời gọi sau đó chỉ vì một lần throw.
4. **Bàn giao hai pha, KHÔNG phải `tail.then(run)` (chi tiết 3/3)** — cùng file. Bên trong callback đăng ký, tạo `nextQueue` bằng `Promise.withResolvers<void>()`, lưu `chainedQueue = currentQueue.then(() => nextQueue.promise)` vào map, và trả về `{ key, currentQueue, chainedQueue, releaseNext: nextQueue.resolve }`. Sau khi await registration: `await currentQueue`, rồi `try { return await fn(); } finally { releaseNext(); if (fileMutationQueues.get(key) === chainedQueue) fileMutationQueues.delete(key); }`. Khối `finally` là thứ khiến một mutation **ném lỗi** vẫn nhả khoá — một chuỗi thuần sẽ kẹt key vĩnh viễn và treo mọi mutation sau đó của file đó. Kiểm tra danh tính trước khi delete là thứ chặn một người hoàn tất muộn xoá nhầm một khoá kế nhiệm đã nối vào.
5. **Đi qua seam dùng chung** — `packages/coding-agent/src/tools/file-write-fallback.ts:402` và `:305`. Bọc **toàn bộ thân** `writeFileWithFallback` (:402) trong `withFileMutationQueue(dst, async () => { ...thân hiện có... })`, và làm đúng như vậy cho `deleteFileWithFallback` (:305). Một chỉnh sửa này phủ ba trong bốn tool có mutate: `edit` create/update (qua `createEditWritethrough` → `lsp/writethrough.ts:314`), đích của `edit` move (`edit/index.ts:674`), và `write` (`write.ts:909-911` → `lsp/writethrough.ts:314`). **Delete phải đi qua CÙNG hàng đợi với write** — một delete rơi đè lên một write đồng thời đúng là lost-update mà mục tiêu này sinh ra để chặn; đó là lý do `:305` nằm trong phạm vi dù plan chỉ nói tới đường ghi. Giữ nguyên vòng lặp `fallbackHandlers` / `deleteFallbackHandlers` và cơ chế bắt `logger.warn` khi handler ném; hàng đợi không được nuốt hay sắp xếp lại hành vi của handler.
6. **Định tuyến `ast_edit` một cách tường minh** — `packages/coding-agent/src/tools/ast-edit.ts:87` và `:137`. `grep -c writeFileWithFallback packages/coding-agent/src/tools/ast-edit.ts` bằng 0, nên bước 5 **KHÔNG** phủ tool này — đừng mặc định chokepoint đã tới nơi. Bọc các lời gọi `astEdit({...})` đang apply. Vì một lời gọi có thể ghi lại nhiều file dưới một glob, xem phần *Cần người quyết*: mặc định có thể bảo vệ là khoá theo phạm vi đích đã resolve của tool (`resolvedSearchPath`), để hai lời gọi `ast_edit` trên cùng phạm vi serialize còn hai phạm vi rời nhau vẫn song song. **KHÔNG** bọc lời gọi preview `dryRun: true` ở `:285` — nó chỉ parse và không được chiếm khoá ghi.
7. **Viết 5 test hợp đồng** — `packages/coding-agent/test/tools/file-mutation-queue.test.ts` (file mới). Dùng `bun:test` (`describe`/`expect`/`it`), `node:fs/promises` cho fixture, và `os.tmpdir()` + `fs.mkdtemp` để có thật một thư mục tạm. Import helper theo đường dẫn module. **KHÔNG** dùng `mock.module()`, **KHÔNG** source-grep, **KHÔNG** mutate `process.env` hay `Bun.*` ở phạm vi file. Dọn thư mục tạm trong `afterEach`.
8. **Changelog** — `packages/coding-agent/CHANGELOG.md`. Thêm một dòng dưới `## [Unreleased]` → `### Fixed`, văn phong hướng tới người dùng, ví dụ `Fixed two concurrent edits to the same file from separate sessions interleaving instead of applying cleanly.` Không kèm link issue trừ khi có số issue nội bộ thật. Không đụng vào bất kỳ section đã phát hành nào.

### Hình dạng code

```typescript
// packages/coding-agent/src/utils/file-mutation-queue.ts
// NOTE: deliberately imports ONLY node builtins. Importing the @oh-my-pi/pi-utils
// barrel here pulls the pi_natives addon, which makes this module's test
// unrunnable in an environment where the addon is not built.
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

const fileMutationQueues = new Map<string, Promise<void>>();
let registrationQueue: Promise<void> = Promise.resolve();

function isMissingPathError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		((error as { code?: unknown }).code === "ENOENT" || (error as { code?: unknown }).code === "ENOTDIR")
	);
}

async function getMutationQueueKey(filePath: string): Promise<string> {
	const resolvedPath = resolve(filePath);
	try {
		return await realpath(resolvedPath);
	} catch (error) {
		if (isMissingPathError(error)) return resolvedPath;
		throw error;
	}
}

/**
 * Serialize file mutation operations targeting the same file.
 * Operations for different files still run in parallel.
 */
export async function withFileMutationQueue<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
	// Detail 2: registration is itself serialized, so two concurrent key
	// resolutions cannot both read the same tail and both append to it.
	const registration = registrationQueue.then(async () => {
		const key = await getMutationQueueKey(filePath);
		const currentQueue = fileMutationQueues.get(key) ?? Promise.resolve();

		// Detail 3: two-phase handoff, not tail.then(run).
		const nextQueue = Promise.withResolvers<void>();
		const chainedQueue = currentQueue.then(() => nextQueue.promise);
		fileMutationQueues.set(key, chainedQueue);

		return { key, currentQueue, chainedQueue, releaseNext: nextQueue.resolve };
	});
	// Two-arg form: a plain then() would leave registrationQueue rejected
	// forever after one throw, deadlocking every subsequent mutation.
	registrationQueue = registration.then(
		() => undefined,
		() => undefined,
	);

	const { key, currentQueue, chainedQueue, releaseNext } = await registration;
	await currentQueue;
	try {
		return await fn();
	} finally {
		releaseNext();
		// Identity check: a late finisher must not evict a successor that has
		// already chained onto this entry.
		if (fileMutationQueues.get(key) === chainedQueue) fileMutationQueues.delete(key);
	}
}
```

### Hợp đồng test

Hợp đồng được bảo vệ là: **"mutation lên một file được áp dụng từng cái một; mutation lên các file khác vẫn chồng lấn."** Hồi quy ở đây khiến các tiến trình con âm thầm đè hoặc cắt đứt lẫn nhau — người dùng thấy một file mà nội dung không khớp với lần sửa nào, và không có lỗi nào ở đâu cả.

File: `packages/coding-agent/test/tools/file-mutation-queue.test.ts` (tạo mới).

| # | Test | Nếu hồi quy, người tiêu dùng thấy |
| --- | --- | --- |
| 1 | Cùng path, hai mutation chạy song song lập đồng thời | Nội dung file là phần còn sót của lần ghi sau đè lên lần ghi trước, byte bị cắt. Assert thứ tự quan sát được là **trước/sau** tuyệt đối không chồng nhau: mỗi task push `'start'`, await một tick, push `'end'`; assert không có `'start'` nào xuất hiện giữa `'start'` và `'end'` của một task khác. |
| 2 | **Hai path KHÁC nhau phải chồng lấn** | Đây là assertion giữ cho Map được khoá trung thực: một hàng đợi toàn cục là hồi quy hiệu năng đeo mặt nạ thành một bản sửa lỗi, và nó khiến mọi sửa file trong repo phải xếp hàng. Phải assert là chúng **có** chồng lấn. |
| 3 | Symlink và target của nó dùng chung **một** entry | Đây là cái mà key theo realpath mua được và key chỉ dùng `resolve` âm thầm bỏ sót: hai lời gọi qua hai đường tới cùng file vẫn giao nhau. |
| 4 | File chưa tồn tại **không** ném lỗi | Write vào một đường dẫn mới sẽ ném `ENOENT` và thay vì tạo file lại làm hỏng tool `write` mới. Nhánh fallback ENOENT/ENOTDIR là thứ giữ được điều này. |
| 5 | Đăng ký hai lần | Hai mutation đến trong lúc cái thứ nhất **vẫn đang resolve key** phải vẫn nối chuỗi, chứ không cùng đọc một predecessor và cùng chạy song song. Bỏ `registrationQueue` là test này đỏ. |

### Xác minh

```bash
# 1. Cổng kiểu (bắt buộc xanh) — KHÔNG dùng tsc, dự án cấm.
bun run check:ts

# 2. Build native addon — điều kiện tiên quyết để chạy được test.
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 3. Cổng hành vi: phải báo 5 pass / 0 fail.
bun test packages/coding-agent/test/tools/file-mutation-queue.test.ts

# 4. Cổng phủ: vẫn phải trả 0 — ast_edit được định tuyến tường minh, không phải được coi là đã phủ.
git grep -c writeFileWithFallback packages/coding-agent/src/tools/ast-edit.ts
```

Ghi chú về lệnh của plan: plan ghi `bun check && bun test ...`. `bun check` còn chạy `check:rs` (cargo) — không liên quan tới thay đổi này và chậm hơn nhiều. **`bun run check:ts` mới là cổng đúng cho mục này.** Nếu chưa cần kiểm tra Rust thì dùng `bun run test:rs`; **không bao giờ** chạy `cargo test` trực tiếp.

Trạng thái đã quan sát: `bun run check:ts` **xanh ở baseline** trên chính HEAD này (16/16 packages Done, không lỗi; không cần native addon). `bun test packages/coding-agent/test/tools/ast-edit.test.ts` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` (loader-state.js:970) — đó là lý do test bị chặn trước khi build addon.

### Cổng hoàn thành

Hai assertion độc lập, cả hai đều có thể đỏ.

**(1) Cổng kiểu:** `bun run check:ts` exit 0. Đỏ khi có lỗi kiểu, một import top-level bị thiếu, một `ReturnType<>`, hoặc vi phạm format (nó chạy kiểm tra formatter trên 5445 file). Đã xác nhận là có ý nghĩa: nó đang xanh, nên mọi đỏ mới đều do thay đổi này gây ra.

**(2) Cổng hành vi:** `bun test packages/coding-agent/test/tools/file-mutation-queue.test.ts` báo **5 pass / 0 fail**, một khi addon đã build.
- Test 2 (hai path khác nhau PHẢI chồng lấn) là cổng thực sự đỏ được với một implementation sai: bản port bằng một đuôi chuỗi toàn cục làm nó đỏ.
- Test 5 (đăng ký hai lần) là cổng cho chi tiết 2: bỏ `registrationQueue` là nó đỏ.
- Test 3 (symlink dùng chung entry) là cổng cho chi tiết 1: thay `realpath` bằng `resolve` thuần là nó đỏ.
- Thiếu nhánh fallback ENOENT làm đỏ test 4.
- Không `finally` khi release làm kẹt test 1.

Bất kỳ test nào trong ba test trên đi đỏ đều là một lỗi W12 thật, không phải flake.

**Cổng phủ:** `git grep -c writeFileWithFallback packages/coding-agent/src/tools/ast-edit.ts` vẫn trả `0`, xác nhận `ast_edit` được định tuyến tường minh chứ không bị âm thầm coi là đã phủ.

**Cổng này có thể đỏ không? Có.** `check:ts` đã được quan sát là xanh ở baseline (16/16 packages Done) trên đúng HEAD này, nên nó là một cổng sống chứ không phải no-op. Năm test hành vi nhắm vào năm lỗi khác nhau: port bằng đuôi toàn cục thì hỏng test 2; bỏ đăng ký tuần tự hoá thì hỏng test 5; key chỉ dùng `resolve` thì hỏng test 3; thiếu fallback ENOENT thì hỏng test 4; release không đặt trong `finally` thì kẹt test 1. Test chạy được ngay khi `bun --cwd=packages/natives run build` thành công — đó là nút thắt duy nhất đã được xác minh (một `bun test` trần của module chỉ dùng node builtin trong repo này hiện chạy 1/1).

### Phụ thuộc

Không. `depends_on` rỗng, `blocks` rỗng.

### Cách sai dễ nhất

**Kẹt hàng đợi do gọi lại không tái nhập.** Bọc `writeFileWithFallback` (`:402`) đặt khoá quanh **toàn bộ** vòng lặp fallback-handler (`:440-452`), vốn gọi các handler do extension đăng ký qua `addFileWriteFallback` (được nối tại `packages/coding-agent/src/extensibility/extensions/runner.ts:778`, exposed là `registerFileWriteFallback` tại `extensibility/extensions/types.ts:1379`). Nếu bất kỳ handler nào gọi ngược lại `writeFileWithFallback` hoặc `deleteFileWithFallback` cho cùng path, hàng đợi không bao giờ được nhả và path đó treo vĩnh viễn. **Hàng đợi này KHÔNG tái nhập** — không có owner token nào.

Hai lỗi kế cận đáng nhớ: `ast_edit` fan-out trên nhiều file mỗi lời gọi nên khoá theo file không có một key đơn lẻ; và đừng để module mới import barrel `@oh-my-pi/pi-utils` (đã xác minh: nó kéo theo native addon và làm test không chạy được trong môi trường này).

### Cần người quyết

Các câu hỏi dưới đây **chặn việc bắt đầu** — không có câu nào có thể trả lời sau khi code xong:

- **Mặt cắt extension (phải quyết).** `withFileMutationQueue` là nội bộ: một extension ngoài repo đăng ký tool qua `registerTool` (`packages/coding-agent/src/extensibility/extensions/types.ts:1347`) rồi tự gọi `Bun.write` sẽ né hàng đợi hoàn toàn. pi-ref đã giải quyết bằng cách export `withFileMutationQueue` trên public surface (xem `$HOME/Projects/pi-ref/packages/coding-agent/src/core/sdk.ts:120` và `src/index.ts:376`). omp phải chọn có chủ ý: (a) export nó từ extension API ngay bây giờ, hay (b) ghi trong handoff M2 rằng mutation của bên thứ ba không được serialize, kèm lý do. **Câu trả lời bắt buộc phải được viết vào handoff M2** — M2 không được phải đoán. (Lưu ý: anchor `types.ts:1322` mà plan trích là sai — đó là overload `on("auto_compaction_end")`; `registerTool` nằm ở `:1347`.)
- **Khoá fan-out của `ast_edit` (phải quyết).** Một lời gọi `ast_edit` có thể ghi lại **NHIỀU** file dưới một glob (`runAstEditTargets` lặp ở `:85-95`). Lựa chọn: (a) khoá theo path phạm vi đã resolve (`resolvedSearchPath`) — thô nhưng rẻ, và hai lời gọi `ast_edit` trên cùng phạm vi sẽ serialize; (b) khoá theo từng file được ghi lại — bất khả thi hôm nay, vì các lần ghi nằm bên trong lời gọi native `astEdit` và omp không nhìn thấy chúng riêng lẻ; (c) không định tuyến `ast_edit` và chấp nhận lỗ hổng. **Khuyến nghị (a)** và ghi rõ độ thô của nó. Plan khẳng định `ast_edit` phải được định tuyến nhưng không nói khoá theo cách nào.
- **Phạm vi atomicity read-modify-write (xác minh trước khi code).** Đường update của `edit` đọc file tại `packages/coding-agent/src/edit/index.ts:711` (`preWriteBytes = await Bun.file(request.path).bytes()`) và so sánh sau khi ghi (~`:735-747`, ném `'edit appeared successful but file content did not change'`). Nếu hàng đợi được vào ở `:402`, lần đọc ở `:711` nằm **NGOÀI** khoá, nên hai tiến trình vẫn đọc cùng một pre-image và lần ghi thứ hai âm thầm vứt lần ghi thứ nhất — hàng đợi chặn được interleaving và byte-tearing nhưng **KHÔNG** chặn được lost update. Quyết định W12 có tuyên bố chỉ sửa interleaving (lập luận được, khớp với cách plan diễn đạt) hay cả lost update (đòi phải dời khoá lên callback `#write` tại `edit/index.ts:495`, điểm phễu duy nhất cho MỌI thao tác edit) hay không. **Phải nói rõ phạm vi đã chọn trong PR.**
- **Phạm vi cần xác nhận: `concurrency = "exclusive"` đã phủ được cái gì.** CẢ `EditTool` (`edit/index.ts:328`) và `WriteTool` (`tools/write.ts:441`) đã khai báo `readonly concurrency = "exclusive"`. Đã truy: `packages/agent/src/agent-loop.ts:3589-3611` nối các tool exclusive qua một biến `lastExclusive` **phạm vi hàm** khai báo ở `:3511` bên trong `executeToolCalls` (bắt đầu ở `:3024`) — nên nó chỉ tuần tự hoá các lời gọi tool **bên trong một batch của một tiến trình**, và **KHÔNG** dùng chung qua các tiến trình hay session. Đó là lý do W12 vẫn cần (tiền đề của plan vẫn đúng: các tiến trình con chạy in-process qua `createAgentSession` tại `task/executor.ts:3960`, không spawn, nên chúng dùng chung module-level Map). PR nên nói điều này, không thì người review sẽ hỏi vì sao cần cả hai cơ chế. Lưu ý `ast_edit` **không** khai báo `concurrency` nào (tên ở `:152`, không có trường `concurrency`), nên nó mặc định là shared và không nhận bảo vệ nào từ agent-loop.
- *(Tuỳ chọn)* **Vệ sinh Map của hàng đợi.** Bản tham chiếu xoá entry Map khi release, nên Map tỉ lệ với số file **đang được mutate đồng thời**, chứ không phải số file từng chạm. Giữ nguyên điều đó; một Map chỉ to lên là một rò rỉ chậm trong session dài.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| `registerTool` nằm ở `packages/coding-agent/src/extensibility/extensions/types.ts:1322`. | STALE — lệch 25 dòng | `registerTool` khai báo ở **:1347**, dưới tiêu đề 'Tool Registration' ở :1343. Dòng 1322 là overload `on(event: "auto_compaction_end", ...)`. Đã kiểm chứng bằng `sed -n '1340,1355p'` và `git grep -n registerTool` (chỉ ra :634 trong doc comment và :1347). |
| `writeFileWithFallback` (file-write-fallback.ts:402) là đường ghi dùng chung với **BỐN** call site, theo doc comment ở :18-32 (nêu `edit/hashline/filesystem.ts` và `edit/modes/patch.ts`). | PARTLY STALE — comment mô tả các file không còn tồn tại ở HEAD này | Số call site thật trong `src/` là **BA**: `edit/index.ts:674`, `lsp/writethrough.ts:74`, `lsp/writethrough.ts:314`. Hai file mà doc comment nêu (`edit/hashline/filesystem.ts`, `edit/modes/patch.ts`) **KHÔNG TỒN TẠI** — thư mục `edit/` chỉ chứa index.ts, schemas.ts, settings.ts, store.ts, normalize.ts, blackbox.ts, auto-repair.ts và hai file `.md`. Người implement tin comment sẽ đi săn những file không tồn tại. `apply_patch` vẫn chạy (nó là một edit MODE được chọn tại `edit/index.ts:222`, không phải một tool riêng), và mọi edit mode đều đổ về callback `#write` duy nhất tại `edit/index.ts:495`. |
| Bản tham chiếu pi-ref nằm ở `pi-ref/packages/coding-agent/src/core/tools/file-mutation-queue.ts` (61 LOC) và pi nối hàng đợi theo từng tool ở `edit.ts:163` và `write.ts:67`. | CONFIRMED nhưng gây hiểu nhầm về chokepoint tốt nhất của omp | File đó có thật và đọc được, nhưng nằm ở `$HOME/Projects/pi-ref/...` (**KHÔNG** phải `pi-ref/...` tương đối với repo root của omp — bản thân plan cảnh báo điều này ở dòng 302 của nó, và `ls -d pi-ref` từ repo root thất bại). pi bọc hàng đợi quanh **thân TOOL** (`execute` của nó), không phải tại một chokepoint ghi, và pi **không có** `ast-edit.ts` nên chưa từng phải giải bài toán `ast_edit`. Ở omp, chokepoint tại file-write-fallback.ts **là** đường cắt tốt hơn (phủ ba tool trong một chỉnh sửa) — nhưng chỉ vì `edit` của omp chạy native với một phễu `#write` duy nhất ở :495, một hình dạng mà pi không có. **Đừng** chép vị trí theo từng tool của pi sang omp; chỉ chép phần bên trong của helper. |
| Tiền đề trong mô tả task: 'git HEAD 5873776'. | STALE | HEAD là `ecd516f` ('feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers'). Mọi số dòng trong spec này đã được kiểm chứng lại trên HEAD thật đó, nên các anchor đều đúng; chỉ có commit id trong brief là sai. |
| Plan nói tập tool có mutate gồm bốn file và việc bọc `writeFileWithFallback` phủ 'ba trong bốn', `ast_edit` cần định tuyến riêng; đồng thời thao tác delete của `edit` (edit/index.ts:645, :675) cũng phải đi cùng hàng đợi. | ĐÚNG nhưng THIẾU | Plan chỉ nêu `writeFileWithFallback` là chokepoint cần bọc, trong khi chính test của nó đòi delete cũng phải serialize. `deleteFileWithFallback` là một hàm export **RIÊNG** tại file-write-fallback.ts:305 với thân riêng — bọc `:402` để nó nằm hoàn toàn ngoài hàng đợi, nên một delete vẫn có thể rơi đè lên một write đồng thời. **Cả hai seam đều phải bọc.** Các call site delete của edit là edit/index.ts:645 (op `delete`) và :675 (unlink nguồn của op `move`). |


---


## W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung

**Thay đổi gì:** Gom ba cài đặt stdout-hygiene đang nằm rải rác trong cây (ACP takeover, print-mode promise tail, RpcOutputWriter spool) vào một `packages/coding-agent/src/utils/stdout-guard.ts` duy nhất, và thêm vào đó phần thật sự còn thiếu: thử lại khi gặp ENOBUFS/EAGAIN/EWOULDBLOCK, có chặn trên, để reader bị nghẽn làm chậm một frame thay vì làm hỏng hoặc vứt mất nó.

**Wave:** Wave 2 — Correctness trên các đường đang ship (`COMPREHUSIVE_PLAN_FOR_OMP_UPGRADE.md:500-525`; work item tại `:1680-1743`).

**Effort:** S — ~120 LOC production + ~110 LOC test. Nhỏ hơn con số của kế hoạch (~100 LOC) vì phần lớn hình dạng đã có sẵn trong cây; việc thật sự là RÚT chúng ra, không phải viết mới.

**Người dùng thấy:** Khi một client JSON/ACP ngừng đọc, frame của omp được trì hoãn thay vì bị cắt cụt giữa dòng hoặc bị vứt mất âm thầm; lý do stdout phải sạch của `omp acp` nằm trong một util dùng chung thay vì nằm lọt trong một file mode; output của `omp commit` không đổi một byte nào.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/utils/stdout-guard.ts` | tạo | Guard dùng chung: `isStdoutTakenOver()`, `takeOverStdout()` (trả undo, khôi phục cả `process.stdout` lẫn `console.log`), `writeRawStdout()` (serialize trên promise tail, retry `ENOBUFS`/`EAGAIN`/`EWOULDBLOCK` ~10ms, chặn trên), `flushRawStdout()` (drain fence). | **Chưa** — file chưa tồn tại. Thư mục cha `packages/coding-agent/src/utils/` đã xác minh tồn tại (45 file), nên đường dẫn hợp lệ. |
| `packages/coding-agent/test/stdout-guard.test.ts` | tạo | 3 test: retry-once-ENOBUFS-delivers-in-full; non-retryable-code-spreads-not-loops; takeover-undo-restores-identity. `vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach`, không `mock.module()`, không `Object.defineProperty(process, …)`. | **Chưa** — file chưa tồn tại. Thư mục `packages/coding-agent/test/` đã xác minh tồn tại. |
| `packages/coding-agent/src/modes/acp/acp-mode.ts` | sửa | Xoá `isolateProtocolStdout()` (`:43-63`) và `formatConsoleArgs` (`:65-72`), chuyển call site `:89` sang `stream.Writable.toWeb(takeOverStdout())`. Thêm `import { takeOverStdout } from "../../utils/stdout-guard";`. Giữ nguyên comment tại `:44-52` (giải thích lý do). Nếu `inspect` thành import chết thì xoá luôn `import { inspect } from "node:util"` (`:2`). | **Có** — định nghĩa `:43-63` và call site `:89` đã xác minh bằng sed/grep. |
| `packages/coding-agent/src/modes/print-mode.ts` | sửa | Xoá `stdoutTail` + `writeStdoutLine` (`:137-147`), thay 4 call site (`:153`, `:228`, `:324`, `:326`) bằng `void writeRawStdout(x)`, đổi drain fence `await stdoutTail;` (`:348`) thành `await flushRawStdout();`. Giữ nguyên comment tại `:130-135` — nó nhắc issue #5309/#7635 và là lý do tồn tại của cả khối. | **Có** — tất cả call site đã xác minh: `:137`, `:138`, `:153`, `:228`, `:324`, `:326`, `:348`. Đây là bước rủi ro nhất vì `print-mode-json-flush.test.ts` phải vẫn xanh. |
| `packages/coding-agent/src/modes/rpc/rpc-output.ts` | **không sửa** (giữ nguyên) | `RpcOutputWriter` đã mạnh hơn bản sẽ viết (nghe `drain` + disk spool + `process.once('exit')` dọn spool); thay nó là viết lại đường production đang chạy mà không cần. Ghi lại là work item hội tụ sau milestone, đừng gộp vào W13. | **Có** — 162 LOC đã xác minh, dùng tại `rpc-mode.ts:780`. |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Fixed`: `Fixed structured stdout output being truncated or dropped when a client stops reading (issue #7635)`. KHÔNG ghi chi tiết implementation, KHÔNG nhắc `takeOverStdout`, KHÔNG dùng issue #10930 (fix EPIPE đã ship ở `packages/utils/src/postmortem.ts:356`). | **Có** — `## [Unreleased]` tại dòng 3, đã xác minh tồn tại và hiện đang rỗng. |

### Các bước

1. **Trước khi viết dòng nào: dựng một repro thật của ENOBUFS.** Tạo `/tmp/enobufs-probe.mjs` — `const { spawn } = require('node:child_process')`; spawn một child chạy `process.stdout.write(JSON.stringify({blob:'x'.repeat(64*1024*1024)}) + '\n')` với stdout là pipe và KHÔNG đọc; bắt child `error` event, in ra `err.code`. Chạy 3 lần. Nếu `ENOBUFS`/`EAGAIN`/`EWOULDBLOCK` không xuất hiện ở CẢ error event LẪN sync throw, thì câu hỏi mở #2 đã trả lời: phần retry không có repro — chỉ ship phần gom về một chỗ và ghi rõ điều đó trong PR. **Đừng viết vòng lặp retry cho một mã không tới được** — vòng lặp không kiểm chứng được cũng là loại test/luồng mà `AGENTS.md` cấm.
   Anchor: `packages/coding-agent/test/stdout-guard.test.ts` (chưa tồn tại).

2. **Tạo `packages/coding-agent/src/utils/stdout-guard.ts`.** Import top-level `import * as stream from "node:stream"` và `import { inspect } from "node:util"` (cả hai đều đã dùng ở `acp-mode.ts:1-2`). Bốn export: `isStdoutTakenOver(): boolean`, `takeOverStdout(): NodeJS.WriteStream` (trả undo qua module state `#undoTakeover`, **KHÔNG** qua return value), `writeRawStdout(text: string): Promise<void>`, `flushRawStdout(): Promise<void>`. Copy nguyên văn `formatConsoleArgs` từ `acp-mode.ts:65-72`. Module-level `#tail: Promise<void> = Promise.resolve()`. Dùng `Promise.withResolvers<void>()` — KHÔNG `new Promise((resolve, reject) => …)`. Delay bằng `Bun.sleep(RETRY_DELAY_MS)`, không `setTimeout`. Nếu bước 1 cho thấy repro, bọc `writeWithRetry` trong `retryLoop` với `MAX_ATTEMPTS` chặn trên và `isRetryable()` chỉ nhận `ENOBUFS`/`EAGAIN`/`EWOULDBLOCK`. Không dùng `any`, không dùng `ReturnType<>`, field dùng `#`.
   Anchor: `packages/coding-agent/src/utils/stdout-guard.ts` (tạo mới; thư mục cha `packages/coding-agent/src/utils/` đã xác minh tồn tại, 45 file).

3. **THAY `isolateProtocolStdout()` bằng `takeOverStdout()` trong ACP.** Xoá hàm `isolateProtocolStdout` (dòng 43-63) và đổi call site dòng 89 thành `stream.Writable.toWeb(takeOverStdout())`. `formatConsoleArgs` chuyển sang `stdout-guard.ts`, xoá khỏi `acp-mode.ts`. Thêm `import { takeOverStdout } from "../../utils/stdout-guard";` (import tương đối, đặt cạnh nhóm import `../../` hiện có ở dòng 5-6). **Giữ nguyên mọi comment giải thích tại `:44-52`** — chúng là tài liệu về lý do, đừng xoá. Nếu `inspect` không còn được dùng trong `acp-mode.ts` sau khi xoá `formatConsoleArgs` thì xoá luôn `import { inspect } from "node:util"` — `bun run check:ts` sẽ bắt, nhưng đừng để lại import chết.
   Anchor: `packages/coding-agent/src/modes/acp/acp-mode.ts:43-63` (định nghĩa), `:89` (call site) — **cả hai đã xác minh**.

4. **Cho print-mode dùng chung `writeRawStdout()`.** Xoá `let stdoutTail` + `const writeStdoutLine` ở dòng 137-147, thay mọi call site `writeStdoutLine(x)` bằng `void writeRawStdout(x)` (4 chỗ: `:153`, `:228`, `:324`, `:326`). Đổi drain fence `await stdoutTail;` ở dòng 348 thành `await flushRawStdout();`. **GIỮ NGUYÊN comment tại `:130-135`.** Thêm `import { flushRawStdout, writeRawStdout } from "../utils/stdout-guard";`. PHẢI giữ nguyên hành vi: `writeStdoutLine` gọi `process.stdout.write(text, cb)` — nếu `writeRawStdout` resolve/reject khác, `runPrintMode` có thể thoát sớm. `print-mode-json-flush.test.ts` là bằng chứng cho **bước này**, không phải bằng chứng cho bước 2.
   Anchor: `packages/coding-agent/src/modes/print-mode.ts:137-147` (tail), `:153`/`:228`/`:324`/`:326` (call sites), `:348` (fence) — **tất cả đã xác minh**.

5. **KHÔNG chạm `rpc-output.ts` và `rpc-mode.ts`.** `RpcOutputWriter` dùng disk spool, nghe `drain`, tự dọn qua `process.once('exit')` — mạnh hơn bản sẽ viết ở bước 2, và thay nó là viết lại một đường production đang chạy. Ghi lại việc hội tụ này thành một work item riêng sau milestone nếu muốn; đừng gộp vào W13.
   Anchor: `packages/coding-agent/src/modes/rpc/rpc-output.ts:17-162` (không sửa).

6. **Viết `packages/coding-agent/test/stdout-guard.test.ts` với ĐÚNG BA test**, mỗi test một hợp đồng quan sát được, và KHÔNG thêm test thứ tư trùng coverage có sẵn:
   - `(1)` `'retries a write that fails once with ENOBUFS and delivers the frame in full'` — `vi.spyOn(process.stdout, 'write')` y hệt cách `print-mode-json-flush.test.ts:98` làm; lần đầu gọi callback với `{code:'ENOBUFS'}`, lần sau resolve; assert sink nhận đúng payload và `write` được gọi 2 lần.
   - `(2)` `'spreads a non-retryable write failure instead of retrying forever'` — callback với `{code:'EPERM'}`; assert promise REJECT với lỗi đó và `write` được gọi **đúng một lần**. Đây là hợp đồng âm quan trọng nhất: nó là thứ ngăn một vòng lặp retry vô tận trên pipe hỏng vĩnh viễn.
   - `(3)` `'takeOverStdout returns an undo that restores process.stdout and console.log'` — lưu `const original = process.stdout; const originalLog = console.log;`, gọi `takeOverStdout()`, assert `isStdoutTakenOver()` true và `process.stdout` khác identity, gọi undo, assert `process.stdout` và `console.log` trở lại **đúng identity gốc** và `isStdoutTakenOver()` false.
   - KHÔNG assert `'stray console.log đi tới stderr'` — `acp-stdout-hygiene.test.ts:86` đã bảo vệ cái đó end-to-end rồi.
   - KHÔNG assert `'flush resolve sau tail'` — `print-mode-json-flush.test.ts:94` đã bảo vệ.
   - Bắt buộc `afterEach(() => { vi.restoreAllMocks(); })` và gọi undo trong `afterEach` nếu test nào takeover còn treo. **TUYỆT ĐỐI** không `Object.defineProperty(process, 'stdout', …)` trong test, không `mock.module()`, không mutate `process.*` ở cấp file.
   Anchor: `packages/coding-agent/test/stdout-guard.test.ts` (tạo mới).

7. **Build native addon trước khi chạy test: `bun run build:native`.** Không có bước này thì `bun test` báo `0 pass / 1 fail` với `Failed to load pi_natives native addon for darwin-arm64` và **mọi** test đều trông như đỏ — kể cả test không liên quan. Đây là bẫy môi trường, không phải hồi quy.
   Anchor: `package.json` scripts `build:native`.

8. **Thêm entry vào `## [Unreleased]` của `packages/coding-agent/CHANGELOG.md`**, dạng `### Fixed`, một dòng, hướng người dùng. Dựng chữ để dán: `Fixed structured stdout output being truncated or dropped when a client stops reading (issue #7635)`. KHÔNG ghi chi tiết implementation, KHÔNG nhắc tên `takeOverStdout`, KHÔNG nhắm issue #10930 (fix EPIPE đã ship ở `packages/utils/src/postmortem.ts:356`).
   Anchor: `packages/coding-agent/CHANGELOG.md:3` (`## [Unreleased]` — **đã xác minh** tồn tại, hiện rỗng).

### Hình dạng code

```typescript
// packages/coding-agent/src/utils/stdout-guard.ts
// Rule: no `any`, no ReturnType<>, ES `#private`, top-level imports only, no console.*
// (the redirected console is the ONE sanctioned console use — it is the stderr sink),
// Promise.withResolvers() not new Promise().

import * as stream from "node:stream";
import { inspect } from "node:util";

const RETRY_DELAY_MS = 10;
const MAX_ATTEMPTS = 500; // ~5s, then take the existing error path. SEE open_questions.
const RETRYABLE_CODES = new Set(["ENOBUFS", "EAGAIN", "EWOULDBLOCK"]);

let #tail: Promise<void> = Promise.resolve();
let #undoTakeover: (() => void) | undefined;

export function isStdoutTakenOver(): boolean {
	return #undoTakeover !== undefined;
}

/**
 * Detour every writer that targets process.stdout onto stderr so it can never
 * corrupt a structured protocol on fd 1. Returns an undo that restores BOTH
 * process.stdout and console.log — a leaked takeover silently swallows every
 * later stdout write in the process.
 */
export function takeOverStdout(): NodeJS.WriteStream {
	if (#undoTakeover) throw new Error("stdout is already taken over");
	const protocolStdout = process.stdout;
	const stderrSink = new stream.Writable({
		write(chunk, _encoding, callback) {
			process.stderr.write(chunk, callback);
		},
	}) as unknown as NodeJS.WriteStream;
	const originalLog = console.log;
	Object.defineProperty(process, "stdout", { value: stderrSink, configurable: true, writable: true });
	console.log = (...args: unknown[]) => {
		process.stderr.write(`${formatConsoleArgs(args)}\n`);
	};
	#undoTakeover = () => {
		Object.defineProperty(process, "stdout", { value: protocolStdout, configurable: true, writable: true });
		console.log = originalLog;
		#undoTakeover = undefined;
	};
	return protocolStdout;
}

/** Serialized on the previous write's completion so records stay ordered. */
export function writeRawStdout(text: string): Promise<void> {
	#tail = #tail.then(() => writeWithRetry(text));
	return #tail;
}

function writeWithRetry(text: string): Promise<void> {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	process.stdout.write(text, err => {
		if (err) reject(err);
		else resolve();
	});
	return promise;
}

/** Resolves only AFTER the tail has settled — never before. */
export function flushRawStdout(): Promise<void> {
	return #tail;
}

function isRetryable(err: unknown): boolean {
	return typeof err === "object" && err !== null && "code" in err &&
		RETRYABLE_CODES.has(String((err as { code: unknown }).code));
}

function formatConsoleArgs(args: unknown[]): string { /* moved verbatim from acp-mode.ts:65-72 */ }

// --- retry lives in the tail, not around the call, until a repro proves
// --- otherwise. If ENOBUFS only ever arrives as a stream `error` event, the
// --- loop below moves into the callback. See open_questions.
// #tail = #tail.then(() => retryLoop(text));
// async function retryLoop(text: string): Promise<void> {
// 	for (let attempt = 0; ; attempt++) {
// 		try { await writeWithRetry(text); return; }
// 		catch (err) {
// 			if (!isRetryable(err) || attempt >= MAX_ATTEMPTS) throw err; // <- the assertion most likely to be dropped
// 			await Bun.sleep(RETRY_DELAY_MS);
// 		}
// 	}
// }
```

### Hợp đồng test

Ba hợp đồng mà `packages/coding-agent/test/stdout-guard.test.ts` (tạo mới) bảo vệ — mỗi câu "nếu hồi quy, người tiêu dùng thấy …":

1. **"Một lần ghi fail ENOBUFS thì được thử lại và frame tới nơi trọn vẹn."** Người tiêu thụ: một client JSON/ACP ngừng đọc rồi đọc lại. **Nếu hồi quy** ⇒ frame bị mất im lặng; client `JSON.parse` được dòng thiếu, hoặc nhận `agent_end` cụt.
2. **"Một lần ghi fail với mã KHÔNG retry được thì phát tán, không quay vòng."** Người tiêu thụ: pipe đã đóng vĩnh viễn. **Nếu hồi quy** ⇒ `omp` treo vô hạn thay vì rơi vào đường disconnect sẵn có. Đây là hợp đồng ÂM và là khẳng định dễ bị bỏ sót nhất — một vòng lặp retry không chặn trên là lỗi treo máy, không phải lỗi mất dữ liệu.
3. **"`takeOverStdout` trả về undo khôi phục cả `process.stdout` lẫn `console.log`."** Người tiêu thụ: bất kỳ ai chạy takeover trong cùng process — bao gồm **mọi** file test chạy sau trong cùng run. **Nếu hồi quy** ⇒ takeover rò rỉ, mọi stdout write sau đó bám vào stderr, và toàn bộ phần còn lại của suite im lặng mất output mà không đỏ dòng nào.

Cố ý **KHÔNG** có trong file test mới:

- `'stray console.log đi tới stderr'` — `packages/coding-agent/test/acp-stdout-hygiene.test.ts:86` đã bảo vệ end-to-end bằng subprocess thật (1 test, 191 dòng — **giữ nguyên**).
- `'drain fence resolve sau tail'` — `packages/coding-agent/test/print-mode-json-flush.test.ts:94` đã bảo vệ bằng payload 1.5MB (1 test, 153 dòng — **giữ nguyên**).

`AGENTS.md`: "Don't duplicate coverage across abstraction levels." Ba hợp đồng còn lại là ba hợp đồng CHƯA có ai bảo vệ. Ngoài ra phải giữ xanh: `packages/coding-agent/test/rpc-output.test.ts` (5 test, bước 5 không sửa production) và `packages/coding-agent/test/cli-stdout-epipe.test.ts` (1 test, `it.skipIf(process.platform === 'win32')`).

### Xác minh

```bash
# 1) BẮT BUỘC trước mọi lệnh bun test — không có thì mọi test dưới đây báo 0 pass.
bun run build:native

# 2) Types. KHÔNG dùng `bun check`: lệnh đó là `check:ts` + `check:rs`, kéo cả Rust toolchain.
#    Đã chạy thử: PASS (~35s), không cần native addon.
bun run check:ts

# 3) File mới — 3 test.
bun test packages/coding-agent/test/stdout-guard.test.ts

# 4) 8 test hồi quy, tất cả phải xanh. Đây mới là bằng chứng thật cho bước 3 và bước 4.
bun test \
  packages/coding-agent/test/acp-stdout-hygiene.test.ts \
  packages/coding-agent/test/print-mode-json-flush.test.ts \
  packages/coding-agent/test/rpc-output.test.ts \
  packages/coding-agent/test/cli-stdout-epipe.test.ts

# 5) TOÀN SUITE. Không thay được bằng pass file-local: takeover process.stdout là
#    process-global, một file test đơn lẻ xanh KHÔNG chứng minh được mình không phá
#    file chạy sau.
bun run test

# 6) Nếu chạy được: `omp acp` thủ công với một client, pipe qua `head -c 100` để reader
#    nghẽn, xác nhận không cắt dòng giữa chừng.
```

Không bao giờ dùng `tsc` — dự án cấm.

### Cổng hoàn thành

Ba điều phải **đồng thời** đúng, và mỗi điều đỏ được nếu làm sai:

- **A.** `bun run check:ts` PASS — types sạch sau khi xoá `isolateProtocolStdout`/`formatConsoleArgs` khỏi `acp-mode.ts` và `stdoutTail` khỏi `print-mode.ts`. Đỏ nếu còn import chết hoặc sai chữ ký.
- **B.** `bun test` trên 5 file ở mục test → **11 test xanh** (3 mới + 8 hồi quy). Đỏ nếu bước 3 phá ACP hygiene, bước 4 phá drain fence của #7635, hoặc hợp đồng (2) không có.
- **C.** `bun run test` TOÀN SUITE xanh — đây là điều **duy nhất** chứng minh takeover không rò rỉ. Gate B tự nó KHÔNG đủ: 5 file test đó có thể xanh trong khi một file thứ 6 chạy sau nhận stdout đã bị rebind. Đó đúng là failure mode đáng lo, và chỉ full suite mới bắt được.

**Cổng này có thể đỏ không?** Về mặt thiết kế thì có — cả ba điều kiện đều có thể đỏ. Nhưng phải nói thẳng: **cổng HIỆN KHÔNG CHẠY ĐƯỢC** trong môi trường này. `bun test packages/coding-agent/test/rpc-output.test.ts` trả `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` tại `packages/natives/native/index.js:23:24` — native addon chưa build. Cho tới khi chạy `bun run build:native`, `bun test` báo đỏ bất kể code đúng hay sai, nên đây là một cổng TRONG (vacuous). Chỉ điều kiện A là chạy được và có ý nghĩa ngay bây giờ — đã xác minh PASS. Nếu không build native addon thì phải coi W13 là **CHƯA xác minh**, không phải là xanh.

### Phụ thuộc

- **depends_on:** W2 (Wave 1) — phụ thuộc **THỨ TỰ**, không phụ thuộc code. W13 không import gì của W2. Kế hoạch xếp W13 vào Wave 2 với lý do "W13 dựa vào cả suite test" (`COMPREHUSIVE_PLAN_FOR_OMP_UPGRADE.md:512`), tức là cần ba file test Wave 1 đã chứng minh đường test có mục tiêu chạy được. Có thể làm W13 song song; chỉ cần chạy full suite một lần sau khi cả hai land.
- **blocks:** không.

### Cách sai dễ nhất

Đọc kế hoạch, thấy `grep ... | zero hit` và `port từ pi-ref`, rồi thấy `pi-ref` không tồn tại — và phản ứng bằng cách viết **MỘT writer backpressure thứ hai**, yếu hơn, cạnh `RpcOutputWriter` đã mạnh hơn và đã có test. Đó là cách sai chính: nó biến W13 từ "gom về một chỗ" thành "thêm một đường ghi stdout song song", và `AGENTS.md` § Central Utilities coi đó là bug.

Cách sai thứ hai, cũng thật: cài takeover không có đường hoàn tác rồi để nó sống hết vòng đời process, khiến mọi test file chạy sau trong cùng run kế thừa một `process.stdout` đã bị rebind.

### Cần người quyết

- **CHẶN THIẾT KẾ — giới hạn retry.** Kế hoạch nói "thử lại … với delay ~10ms" nhưng KHÔNG nói chặn bao nhiêu lần. Retry không chặn trên một reader bị treo vĩnh viễn = treo `omp` vĩnh viễn, tệ hơn bài toán ban đầu. **Khuyến nghị: 500 lần (~5s) rồi reject**, đổ vào đường lỗi sẵn có. Người phải chọn: con số này, vì nó cân "không bao giờ rơi frame" với "không bao giờ treo".
- **CHẶN THIẾT KẾ — ENOBUFS có thật sự tới được không.** `process.stdout.write` của Node/Bun là write bất đồng bộ có buffer; nó KHÔNG gọi `write(2)` non-blocking rồi trả EAGAIN về caller. Nếu ENOBUFS chỉ tới dưới dạng stream `error` event (giống EPIPE, mà `registerStdioDisconnectHandling` tại `packages/utils/src/postmortem.ts:356` đã xử lý), thì vòng retry phải nằm ở error path, không phải quanh lời gọi. **Dựng repro thật TRƯỚC khi viết vòng lặp** (bước 1). Nếu không dựng được repro thì deliverable chỉ còn phần gom về một chỗ.
- **PHẠM VI — W13 chỉ migrate ACP, hay cả ba?** `rpc-mode.ts:780` vẫn tự dựng `RpcOutputWriter(process.stdout, …)` và `print-mode.ts:137` vẫn giữ tail riêng. Cả ba đều là backpressure writer cùng loại. Migrate ACP một mình thì guard có đúng một consumer (được, nhưng util ~100 LOC với một consumer là ảo), còn migrate cả ba thì diff rộng hơn nhiều và phải giữ nguyên drain fence của print-mode. Kế hoạch không nói. **Khuyến nghị: ACP + print-mode** (print-mode thuần di chuyển, `await stdoutTail` ở `:348` thành `await flushRawStdout()`); **ĐỂ `RpcOutputWriter` nguyên** vì nó dùng disk spool, mạnh hơn hẳn, và thay nó là viết lại đường đang chạy production không cần thiết.
- **PHẠM VI — miễn trừ commit-CLI.** Kế hoạch miễn `commit/agentic/index.ts` (31 lệnh, **đã xác minh** đúng). Nhưng cùng subsystem còn `commit/agentic/agent.ts` (7), `commit/pipeline.ts` (6), `commit/execute.ts` (1), `commit/cli.ts` (1) — 15 lệnh nữa không được phân loại. Và toàn `src/cli/` còn 200+ lệnh nữa. Cần chốt: miễn theo TIẾN TRÌNH (chỉ `omp commit` vờ ra guard), hay miễn theo FILE một cách tường minh như kế hoạch nói.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Kế hoạch (`:1691-1693`): "`grep -rni 'takeOverStdout\|isStdoutTakenOver\|waitForRawStdout\|ENOBUFS' packages/` trả về zero hit" ⇒ "omp không có gì: … omp hoàn toàn không có câu trả lời" cho nguy hiểm backpressure này. | **Sai.** Grep thì đúng, suy luận thì sai. | Tên hàm vắng, NHƯNG hành vi thì có sẵn — và có **ba bản**. (1) `packages/coding-agent/src/modes/acp/acp-mode.ts:43` `isolateProtocolStdout()` LÀ `takeOverStdout()` đã viết sẵn: bắt stdout thật, `Object.defineProperty(process, 'stdout', {value: stderrSink, configurable: true, writable: true})`, rồi rebind `console.log`. (2) `packages/coding-agent/src/modes/print-mode.ts:137-147` `stdoutTail` + `writeStdoutLine` LÀ `writeRawStdout()` đã viết sẵn: serialize trên completion callback, có drain fence (`await stdoutTail` tại `:348`). (3) `packages/coding-agent/src/modes/rpc/rpc-output.ts:17-162` `RpcOutputWriter` (162 LOC) là writer **MẠNH HƠN CẢ** bản 108 LOC mà kế hoạch định port: nghe `drain`, spill ra temp-file spool khi nghẽn, `process.once('exit')` dọn spool, `AggregateError` khi vừa fail vừa hỏng cleanup. Thứ thật sự còn thiếu **KHÔNG** phải "cả hệ thống" mà chỉ là: retry ENOBUFS/EAGAIN/EWOULDBLOCK, một chỗ ở chung, và đường hoàn tác cho takeover. Đây là bản sửa quan trọng nhất: một kỹ sư đọc kế hoạch sẽ tưởng đang viết mới 100 LOC và vô tình tạo ra writer thứ tư yếu hơn. |
| Kế hoạch (`:1699-1702`): "port hình dạng từ `pi-ref/packages/coding-agent/src/core/output-guard.ts` (108 LOC)". | **Sai** — nguồn port không tồn tại trong repo này. | `ls -d pi-ref` → không có; `find . -name 'output-guard*' -not -path './node_modules/*'` → rỗng. Kỹ sư sẽ mất buổi sáng tìm file không có. **Viết tay từ đầu**, dùng ba bản trong cây làm tham chiếu — chúng tốt hơn bản gốc 108 LOC (xem dòng trên). Bỏ hẳn câu "port" khỏi việc lập kế hoạch chi tiết. |
| Kế hoạch (`:1707-1708`): "Đã kiểm tại HEAD: file `commit/agentic/index.ts` có 31 lệnh `process.stdout.write`". | **Đúng** — con số xác minh được. Nhưng phạm vi miễn trừ thì thiếu. | 31 là chính xác. Nhưng có **274** lệnh `process.stdout.write` trong `packages/coding-agent/src/`, và `cli/auth-broker-cli.ts` (34) + `cli/ttsr-cli.ts` (29) còn **nhiều hơn** file được miễn; riêng subsystem `commit/` còn `agent.ts` (7), `pipeline.ts` (6), `execute.ts` (1), `cli.ts` (1) = 15 lệnh chưa được phân loại. Miễn đúng một file để lại 15 lệnh cùng subsystem trong trạng thái mơ hồ. Vì takeover theo TIẾN TRÌNH chứ không theo dòng, cách đúng là: guard chỉ được bật ở những entry point có giao thức có cấu trúc trên fd 1; `omp commit` không bao giờ bật, nên toàn bộ 274 lệnh đều an toàn theo mặc kiến trúc. |
| Kế hoạch (`:1719-1724`) liệt kê 5 test cần viết, trong đó (3) "sau takeover, một `console.log` lạc đi tới stderr", (4) "drain chỉ resolve SAU KHI tail settle", và bối cảnh (1) là mất frame. | **Trùng coverage đã tồn tại** — `AGENTS.md` cấm rõ ràng. | (3) đã được bảo vệ end-to-end bởi `acp-stdout-hygiene.test.ts:86` (spawn thật `omp acp`, assert byte đầu tiên trên stdout parse được thành JSON-RPC, và assert KHÔNG JSON-RPC nào rò ra stderr). (4) đã được bảo vệ bởi `print-mode-json-flush.test.ts:94` (regression #7635: giữ callback của write `agent_end` 1.5MB, assert `runPrintMode` chưa settle và chưa dispose, rồi release, assert payload đủ và `JSON.parse` được). (1)-adjacent đã được bảo vệ bởi `rpc-output.test.ts` (5 test tại `:13`, `:72`, `:107`, `:121`, `:137`). Cái DUY NHẤT chưa có test là: retry ENOBUFS, spread lỗi không-retryable, và undo của takeover. Viết 5 test như kế hoạch nói sẽ thêm 3 cái trùng. |
| Kế hoạch (`:1730`): lệnh xác minh là `bun check && bun test packages/coding-agent/test/stdout-guard.test.ts && bun run test`. | **Sai một nửa** — `bun check` không dùng được ở đây. | `bun check` ở package.json gốc là `bun run --parallel check:ts check:rs` — nó KÉO CẢ RUST TOOLCHAIN, không liên quan gì tới thay đổi TS này. Dùng `bun run check:ts`. Đã chạy thử: PASS trong ~35s, KHÔNG cần native addon. Còn `bun test` thì ĐANG BỊ CHẶN: `bun test packages/coding-agent/test/rpc-output.test.ts` → `0 pass / 1 fail / 1 error`, `Failed to load pi_natives native addon for darwin-arm64`. Nghĩa là cổng của W13 hiện **KHÔNG chạy được** cho tới khi build `bun run build:native`. |
| Kế hoạch (`:1691-1694`): "omp đã ship `test/otel-export-probe.ts` và `otel-non-otlp-probe.ts` — đó là bằng chứng loại bug này đã nổi lên ở đây một lần rồi". | **Có một nửa đúng, một nửa suy diễn quá.** | Bốn file probe ĐÚNG tồn tại (`otel-export-probe.ts`, `otel-non-otlp-probe.ts`, `otel-resource-probe.ts`, `otel-signals-probe.ts`) — xác minh. Nhưng chúng là smoke probe khởi động cho OTEL exporter: bằng chứng rằng loại bug "binary/telemetry lẫn vào stdout" đã nổi lên, KHÔNG phải bằng chứng về ENOBUFS. Bằng chứng đúng hơn và mạnh hơn nằm ở chính cây code: `print-mode.ts:130-135` ghi rõ bug mất frame (issue #5309, #7635) và `cli-stdout-epipe.test.ts:6` ghi rõ bug EPIPE (issue #10930). Dùng hai issue id đó trong changelog, đừng dùng probe làm bằng chứng. |
| Mô tả repo trong task: "git HEAD `5873776`, currently on branch `milestone-1`". | **Sai SHA.** | HEAD thật của repo này là `ecd516f` ("feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers"), branch `milestone-1` — branch đúng, SHA thì không. Nội dung các file mà spec này viện dẫn đều tồn tại và đúng như mô tả, nên ảnh hưởng thực tế bằng không; nhưng đừng dùng `5873776` làm mốc khi tra cứu. |


---


## W14. Chặn encoding PowerShell trên các đường spawn của Windows

**Thay đổi gì:** Khi omp spawn một PowerShell thật để chạy lệnh, nó ép output về UTF-8 bằng một phép gán có bọc `try/catch`, để kết quả tool non-ASCII không còn về dạng mojibake — và một tool `powershell` riêng chỉ được dựng nếu người dùng nói omp muốn có nó. **Wave:** Wave 7 (TUI and Windows — the cuttable tail). **Effort:** W14a (phần encoding guard, luôn land): S — khoảng 30 dòng production cộng một file test. W14b (tool `powershell` riêng, chỉ khi câu hỏi mở 4a được trả lời có): M, khoảng 250-400 dòng.

**Người dùng thấy:** Một người dùng Windows trỏ `shellPath` của omp sang `pwsh`/`powershell` rồi chạy lệnh qua hotkey `!`, PTY tương tác, hoặc terminal của một ACP client sẽ nhận output non-ASCII đã giải mã đúng (đường dẫn có dấu, tên file CJK, emoji) thay vì mojibake. Trên host POSIX và trên đường shell nhúng mặc định thì không có gì thay đổi. Nếu người dùng trả lời có cho câu hỏi phạm vi, một tool `powershell` xuất hiện trong danh sách tool; nếu không, không có gì xuất hiện.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/exec/powershell-encoding.ts` | tạo | Module thuần export `POWERSHELL_UTF8_PREFIX` và `withPowerShellUtf8Output(command, shell)`, trả về `command` nguyên byte trừ khi `isPowerShell(shell)` đúng, khi đó trả về phép gán UTF-8 nối trước lệnh gốc. File mới, chưa tồn tại ở HEAD (`ecd516f`); hình dạng này bắt buộc vì các spawn site PowerShell hiện có trong omp chỉ là literal nằm trong `utils/clipboard.ts:231` và `:290`, không có helper chung để mở rộng. | có |
| `packages/coding-agent/src/exec/bash-executor.ts` | sửa | Trong `buildUserShellCommand` (dòng 379), cho `command` đi qua `withPowerShellUtf8Output` trước khi quote, để mọi user-shell spawn (`!` hotkey, PTY) đều có guard. Thêm `isPowerShell` vào import `@oh-my-pi/pi-utils/procmgr` sẵn có ở dòng 17 (hiện là `{ isCmdShell, isExecutable, type ShellConfig }`). `finalCommand` ở `:531-534` là caller duy nhất và đã route đúng các shell cần guard. | có |
| `packages/coding-agent/src/tools/bash.ts` | sửa | Trong `wrapShellLineForClientTerminal` (dòng 163-167), cho `line` đi qua `withPowerShellUtf8Output` trước khi áp `shellConfig.prefix`. Hàm đã nhận `shellConfig: { shell, args, prefix? }` nên không cần đổi chữ ký. Caller duy nhất là `bash.ts:1239`. Đường brush nhúng không được đụng tới. | có |
| `packages/coding-agent/test/tools/powershell-encoding.test.ts` | tạo | Test hợp đồng cho phép biến đổi: shell không phải PowerShell thì đi qua không đổi; shell PowerShell thì nhận đúng guard; guard không thể nuốt lệnh của người dùng. File test mới, cần build native addon trước khi chạy. | **không** — file mới, chưa kiểm chứng |
| `packages/coding-agent/src/tools/powershell.ts` | tạo (có điều kiện) | CHỈ KHI câu hỏi mở 4a được trả lời CÓ. Một class `PowerShellTool` (tool của omp là class, không phải factory function của pi-ref) cộng một điểm móc override `shellConfig` trên `BashExecutorOptions` và một `prompts/tools/powershell.md`. **KHÔNG** thuộc cổng của W14a. | **không** — chưa tồn tại ở HEAD, cố ý loại khỏi cổng |
| `packages/coding-agent/src/tools/builtin-names.ts` | sửa (chỉ W14b) | Thêm `"powershell"` vào mảng `as const` `BUILTIN_TOOL_NAMES` (bắt đầu dòng 1; `"bash"` ở dòng 3). `BuiltinToolName` suy ra từ đó nên `ToolName` tự đi theo. File 68 dòng; `normalizeToolName` và `CANONICAL_TOOL_NAMES` đều suy ra từ mảng này nên không cần sửa thêm chỗ nào trong file. | có |
| `packages/coding-agent/src/tools/index.ts` | sửa (chỉ W14b) | Thêm một entry factory `PowerShellTool` vào record `BUILTIN_TOOLS` (khai báo dòng 554; entry `bash: s => new BashTool(s)` ở dòng 557). File 966 dòng. `BUILTIN_TOOLS: Record<BuiltinToolName, ToolFactory>` ở `:554` sẽ không typecheck cho tới khi `BuiltinToolName` có `"powershell"`, nên `builtin-names.ts` phải đi cùng một lần thay đổi. | có |

Ghi chú về tên file test: bảng trên ghi `powershell-encoding.test.ts`, còn bước 6, `test_files` và phần Xác minh đều dùng `powershell.test.ts` — hãy dùng `powershell.test.ts` để khớp với lệnh xác minh.

### Các bước

1. **Hỏi phạm vi trước khi viết dòng code nào.** Hỏi người dùng nguyên văn câu hỏi mở 4a: omp có muốn một tool `powershell` hạng nhất, hay bash-only-trên-Windows là một quyết định phạm vi có chủ ý? Ghi câu trả lời vào PR description. **Không** suy luận từ codebase — plan nói rõ chỗ này phải đến từ người dùng. Nếu câu trả lời là KHÔNG hoặc không có câu trả lời, chỉ làm bước 1-6 và bỏ qua hẳn bước 7-10; item vẫn land. (neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:3072-3080 (P3)`, và `:1746-1748`)
2. **Tạo `packages/coding-agent/src/exec/powershell-encoding.ts`** export hằng số tiền tố đúng bằng `try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}` rồi một newline, và hàm thuần `withPowerShellUtf8Output(command: string, shell: string): string` trả về `command` không đổi khi `isPowerShell(shell)` sai, và `POWERSHELL_UTF8_PREFIX + command` khi đúng. Import `isPowerShell` từ `@oh-my-pi/pi-utils/procmgr` bằng named import top-level. **Không** tự viết lại phép so basename — `isPowerShell` là helper trung tâm được thừa nhận, nhân bản nó là vi phạm quy tắc. (neo: `packages/utils/src/procmgr.ts:71`)
3. **Trong `packages/coding-agent/src/exec/bash-executor.ts`**, thêm `isPowerShell` vào import procmgr ở dòng 17, rồi sửa `buildUserShellCommand` (dòng 379) để tham số `command` được biến đổi bằng `withPowerShellUtf8Output(command, shell)` trước khi quote và nối. Không đổi chữ ký và không dời call — `finalCommand` ở `:531-534` là caller duy nhất và vốn đã route đúng những shell cần đi qua đây. (neo: `bash-executor.ts:17,379`)
4. **Trong `packages/coding-agent/src/tools/bash.ts`**, sửa thân của `wrapShellLineForClientTerminal` để `line` đi qua `withPowerShellUtf8Output(line, shellConfig.shell)` trước khi nối `shellConfig.prefix`. Thêm import top-level của helper. Đây là đường ACP client-terminal và hiện là route spawn duy nhất chưa có xử lý encoding. (neo: `bash.ts:163-167`)
5. **Xác nhận bạn KHÔNG đụng đường shell nhúng.** `executeBash` chạy lệnh trong brush-core (một POSIX shell engine nằm trong native addon), không phải một shell được spawn, nên đường bash-tool mặc định không được nhận một câu lệnh PowerShell. Kiểm tra rằng chỉ có hai chỉnh sửa ở bước 3 và bước 4 — `git diff --stat` phải liệt kê đúng hai file source. (neo: `bash-executor.ts:1-5`)
6. **Viết `packages/coding-agent/test/tools/powershell.test.ts`** phủ ba hợp đồng trong mục *Hợp đồng test* bên dưới, rồi build native addon (`bun --cwd=packages/natives run build`) trước khi chạy — thiếu addon thì module graph không load được và test lỗi ngay thay vì fail một assertion. Chạy `bun run check:ts` và file test. Cả hai phải pass. (neo: `packages/coding-agent/test/tools/powershell-encoding.test.ts` (mới))
7. **CHỈ W14b (câu trả lời là CÓ).** Thêm field tùy chọn `shellConfig?: ShellConfig` vào `BashExecutorOptions` (interface ở dòng 33-67) để một tool có thể trỏ executor sang một shell cụ thể, và cho `executeBash` ưu tiên nó hơn `settings.getShellConfig()` ở dòng 487-490. Đây là móc nối mà plan tưởng đã tồn tại; nó không có. (neo: `bash-executor.ts:33-67,485-490`)
8. **CHỈ W14b.** Tạo `packages/coding-agent/src/tools/powershell.ts` với class `PowerShellTool` extends `AgentTool`, soi theo `BashTool` (`bash.ts:473`) cho approval, streaming update và result detail, ủy thác thực thi cho `executeBash` với `ShellConfig` pwsh lấy từ bước 7. Đặt `readonly name = "powershell"` và `readonly label = "PowerShell"` theo quy ước ở `bash.ts:474` và `:567`. Port cổng approval cho đúng: `BashTool.approval` chỉ tách các đoạn lệnh ghép khi `isPosixShell(shell)` (`bash.ts:484`), mà `isPosixShell("pwsh")` là false, nên lệnh PowerShell được match như một chuỗi lệnh nguyên khối — hãy kiểm chứng điều này với một PowerShell thật thay vì mặc định nó đúng. (neo: `bash.ts:473,474,484,567`)
9. **CHỈ W14b.** Tạo `packages/coding-agent/src/prompts/tools/powershell.md` và import nó đúng y như `bash.ts:38` import mô tả bash (`import powershellDescription from "../prompts/tools/powershell.md" with { type: "text" }`). Prompt không bao giờ được dựng trong code. (neo: `bash.ts:38`)
10. **CHỈ W14b.** Đăng ký tool: thêm `"powershell"` vào `BUILTIN_TOOL_NAMES` trong `builtin-names.ts` và entry factory trong `BUILTIN_TOOLS` ở `tools/index.ts`. Cả hai chỉnh sửa phải đi cùng một lần thay đổi, nếu không chú thích `Record<BuiltinToolName, ToolFactory>` sẽ không typecheck. Chạy lại `bun run check:ts`. (neo: `builtin-names.ts:3`, `tools/index.ts:554-557`)

### Hình dạng code

```typescript
// packages/coding-agent/src/exec/powershell-encoding.ts
import { isPowerShell } from "@oh-my-pi/pi-utils/procmgr";

/**
 * PowerShell emits output in the host's active code page unless the console
 * encoding is forced, so every non-ASCII tool result comes back as mojibake.
 * The assignment throws on some hosts (older Windows, redirected consoles),
 * and the command must still run when it does — hence the try/catch, which is
 * load-bearing rather than defensive.
 */
export const POWERSHELL_UTF8_PREFIX =
	"try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}\n";

/** Prepend the encoding guard only when the spawn target really is PowerShell. */
export function withPowerShellUtf8Output(command: string, shell: string): string {
	return isPowerShell(shell) ? `${POWERSHELL_UTF8_PREFIX}${command}` : command;
}

// packages/coding-agent/src/exec/bash-executor.ts:379
function buildUserShellCommand(shell: string, args: string[], command: string): string {
	const guarded = withPowerShellUtf8Output(command, shell);
	return [shell, ...ensureInteractiveShellArgs(shell, args), guarded].map(quoteShellArg).join(" ");
}

// packages/coding-agent/src/tools/bash.ts:163
export function wrapShellLineForClientTerminal(
	line: string,
	shellConfig: { shell: string; args: string[]; prefix?: string | undefined },
): { command: string; args: string[] } {
	const guarded = withPowerShellUtf8Output(line, shellConfig.shell);
	const finalLine = shellConfig.prefix ? `${shellConfig.prefix} ${guarded}` : guarded;
	return { command: shellConfig.shell, args: [...shellConfig.args, finalLine] };
}

// CONDITIONAL W14b — the seam the plan wrongly assumed already existed.
// packages/coding-agent/src/exec/bash-executor.ts, BashExecutorOptions (line 33)
export interface BashExecutorOptions {
	// ...existing fields...
	/** Spawn a specific shell instead of the session's resolved one. */
	shellConfig?: ShellConfig;
}
```

### Hợp đồng test

Ba hợp đồng, tất cả đều khẳng định giá trị mà một consumer thực sự đọc — chính PowerShell interpreter parse chuỗi lệnh được phát ra, nên byte chính xác của nó chính là hợp đồng (AGENTS.md: *"exact bytes/shape MAY be asserted when a provider, parser, protocol, or persisted consumer reads them"*). Nếu hồi quy, người tiêu dùng thấy: trên Windows, mọi tool result non-ASCII hiện ra dạng mojibake kiểu `ÄÆá»ç`, hoặc cả lệnh abort với lỗi đỏ và không có output nào.

1. **NEGATIVE / PRECEDENCE** — với các shell `/bin/bash`, `/bin/zsh`, `cmd.exe`, `withPowerShellUtf8Output` trả về đầu vào **nguyên byte**. Đây là assertion chặn item biến thành con dấu cao su: nếu không có nó, một helper prefix vô điều kiện vẫn pass các test PowerShell trong khi phá hỏng mọi lệnh POSIX, vì một câu lệnh PowerShell là lỗi cú pháp trong bash.
2. **TRANSFORMATION** — với `pwsh`, `powershell.exe`, và `C:\Program Files\PowerShell\7\pwsh.exe`, kết quả bắt đầu bằng `try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}` rồi một newline, và lệnh của người dùng xuất hiện nguyên văn sau đó — đây chính là hợp đồng encoding mà toàn bộ item tồn tại để mua.
3. **NON-CATASTROPHIC FAILURE** — guard là một khối `try`/`catch`, nên nếu phép gán encoding ném lỗi trên host cũ, lệnh của người dùng vẫn được tới. Khẳng định lệnh của người dùng xuất hiện **sau** `catch {}` đã đóng chứ không nằm bên trong nó, tức dòng phát ra là một câu lệnh có guard đứng trước một câu lệnh riêng. Nếu try/catch bị bỏ, hoặc tiền tố mất chữ `catch`, test này đỏ. Đây là proxy trung thực trên host POSIX cho ý "assert the command still executes on a host where the assignment throws" của plan — cùng hợp đồng, không stub byte, không cần host Windows.

File test: `packages/coding-agent/test/tools/powershell.test.ts` (mới).

### Xác minh

```bash
bun run check:ts
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
bun test packages/coding-agent/test/tools/powershell.test.ts
```

### Cổng hoàn thành

Hai phần, và phải chạy cả hai. (1) `bun run check:ts` — ở HEAD hiện đang pass (đo được: cả 15 package `Done`, không lỗi), nên bất kỳ lỗi type nào do thay đổi này tạo ra sẽ làm nó đỏ. (2) `bun --cwd=packages/natives run build && bun test packages/coding-agent/test/tools/powershell.test.ts` — file test phải báo 0 fail. Bước build là bắt buộc, không phải tuỳ chọn: ở HEAD addon vắng mặt, nên bất kỳ test nào có module graph chạm tới `@oh-my-pi/pi-natives` đều **không LOAD được**. Điều này là đo được, không phải phỏng đoán: `bun test packages/coding-agent/test/tools/` hiện cho 145 pass / 177 fail / 174 errors trên 322 tests, và mọi lỗi đều là lỗi `Failed to load pi_natives native addon for darwin-arm64`. Lưu ý `packages/coding-agent/src/tools/bash.ts:19` import `@oh-my-pi/pi-utils/procmgr`, mà dòng 3 của nó import `@oh-my-pi/pi-natives` — nên một test import tool (chứ không chỉ helper thuần) sẽ không chạy được cho tới khi addon tồn tại. Cổng còn kèm một kiểm tra phạm vi diff: `git diff --stat` phải hiện đúng hai file production (`bash-executor.ts`, `bash.ts`) cộng helper mới và test — có file production thứ ba nghĩa là đường shell nhúng đã bị sửa, và điều đó tuyệt đối không được xảy ra.

Cổng **có** thể đỏ thật: `check:ts` xanh ở HEAD nên lỗi type do thay đổi làm đỏ được, và file test có ba assertion có thể đỏ (đường non-PowerShell bị prefix nhầm, thiếu guard, hoặc lệnh bị nuốt vào trong `try`). Phần diff-scope cũng đỏ được nếu có file production thứ ba xuất hiện. Điểm duy nhất không đỏ được là khi bỏ qua bước build native addon: khi đó test lỗi load chứ không fail assertion, nên bước build phải nằm trong lệnh gate.

### Phụ thuộc

không — W14 không phụ thuộc item nào và không chặn item nào.

### Cách sai dễ nhất

Tin câu của plan *"Effort đã chốt, không còn mở ... đây là một tool definition cộng đăng ký, không phải một refactor"* rồi thả thẳng file `powershell.ts` 67 dòng của pi-ref vào `packages/coding-agent/src/tools/`. Nó sẽ **không** compile: `createShellToolDefinition`, `ShellToolConfig`, `createLocalShellOperations`, `BashOperations` và `BashSpawnHook` không tồn tại ở bất kỳ đâu trong module graph `tools/` của omp — `git grep` cho hai cái đầu trả về không kết quả nào, và ba bản sao duy nhất của ba cái sau nằm trong `extensibility/legacy-pi-coding-agent-shim.ts`, một shim tương thích plugin legacy chứ không phải tool đang chạy. Lối thoát quyến rũ là fork `BashTool` (1504 dòng) — đúng cái refactor mà plan cảnh báo. Đường nhỏ hơn và trung thực là W14a: sửa encoding ở hai spawn site đang tồn tại, và coi tool riêng là một quyết định phạm vi riêng.

### Cần người quyết

- **Câu hỏi mở 4a (plan P3, dòng 3072-3080) chưa được giải quyết và nó chặn W14b:** omp có muốn một tool `powershell` hạng nhất, hay bash-only-trên-Windows là một quyết định phạm vi có chủ ý? Câu này phải do người dùng trả lời, không được suy luận. Cho tới khi có câu trả lời, chỉ land W14a — chính plan nói W14 là droppable mà không mất đi tính đúng đắn nào người ta quan sát được hôm nay.
- Người dùng cũng cần được báo rằng mojibake plan mô tả **không** xảy ra trên đường Windows mặc định của omp. Nếu họ đọc câu *"mọi tool result non-ASCII bị hỏng"* của plan như một bug report đang sống, kỳ vọng đó cần được sửa trước khi ai dành một ngày cho W14b.
- W14a có nên ship không nếu câu trả lời 4a là *"Windows support cố ý bash-only"*? Nó ~30 dòng và bảo vệ một hợp đồng encoding có thật trên các đường spawn thực sự tồn tại (`!` hotkey, PTY, ACP terminal khi `shellPath` đặt là pwsh), nên khuyến nghị là có — nhưng đây là quyết định của người dùng, vì nó là một thay đổi hành vi trên một đường họ có thể không hỗ trợ.
- Bản của pi-ref bọc tiền tố bên trong seam `exec` operations. Bản port ở đây bọc tại chỗ ghép lệnh. Nếu sau này người dùng muốn tool `powershell`, helper của W14a dùng lại được nguyên vẹn; cần xác nhận không ai phản đối việc nó nằm ở `exec/` chứ không ở `tools/`.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| *"Effort đã chốt, không còn mở: shell tool đã tham số hoá đa-shell (`bash.ts:481-484` đọc `settings.getShellConfig().shell` và gate trên `isPosixShell`) ... nên đây là một tool definition cộng đăng ký, không phải một refactor."* (plan dòng 1751-1755) | **FALSE for omp** | Sự tham số hoá đa-shell chỉ tồn tại trong pi-ref, một repo khác, ở path khác. `packages/coding-agent/src/tools/bash.ts` của omp export đúng năm thứ: `wrapShellLineForClientTerminal` (163), `CRITICAL_BASH_PATTERNS` (188), `BashToolInput` (384), `BashToolOptions` (395), `BashTool` (473). `BashToolOptions` là một interface RỖNG. `BashTool` là class gọi module-level `executeBash` import ở dòng 22. `git grep ShellToolConfig` và `git grep createShellToolDefinition` trả về KHÔNG kết quả nào toàn repo. Vậy nên file `powershell.ts` 67 LOC của pi-ref không thể thả vào; một tool `powershell` thật là việc cỡ M, không phải 80 dòng. |
| *"trên host Windows, bash tool là đường shell duy nhất của omp — nghĩa là hoặc không có PowerShell, hoặc có một `powershell.exe -Command` được bash gọi mà bỏ qua tiền tố UTF-8 ... mọi tool result non-ASCII bị hỏng"* (plan dòng 1790-1793, và P3 tại 3073-3076) | **FALSE for đường mặc định** — lỗ hổng thật hẹp hơn nhiều | Bash tool của omp không spawn shell nào ở đường mặc định. Nó thực thi trong brush-core, một POSIX shell engine nhúng trong native addon. `useUserShell` chỉ true ở đường hotkey `!` và đường PTY. Nên bash tool mặc định không gọi `powershell.exe` và không có mojibake do code page ở đó. Lỗ hổng UTF-8 chỉ thật khi người dùng tự cấu hình `shellPath` sang `pwsh`/`powershell` rồi dùng một đường spawn (hotkey `!`, PTY tương tác, ACP client terminal). W14a được khoanh đúng vào những đường đó, và vì thế nó nhỏ. |
| *"`grep -rni powershell packages/coding-agent/src/` trả về 73 hit trên 10 file"* và các anchor `profile-alias.ts:5,11,19,33`, `bash.ts:481-484`, `procmgr.ts:81`, `clipboard.ts:228-231, :288-290` (plan dòng 1777-1789) | **VERIFIED** (trừ hai anchor, lệch ~3 dòng) | Giữ nguyên con số và các anchor profile-alias / isPosixShell — chúng chính xác. Hai sửa nhỏ: hai dòng thao tác trong `bash.ts` là 482 và 484 (không phải 481-484), và hai literal spawn `powershell.exe` trong clipboard nằm ở dòng 231 và 290, không phải 228-231 / 288-290. Chi phí của độ trôi này là vài phút, nhưng kỹ sư không nên đi săn dòng 228 không chứa spawn. |
| *"Prompt `PS>` hiển thị"* làm một test assertion (plan dòng 1800-1801), hàm ý một check chạy được trong omp | **UNSOUND theo cách viết** — không tồn tại chuỗi `PS>` nào trong omp và assertion suýt thành static echo bị cấm | `ShellToolConfig.prompt: "PS>"` của pi-ref không có bản tương ứng trong omp: tool của omp mang `readonly label` (`bash.ts:567`) cộng một file prompt markdown tĩnh import ở `bash.ts:38`. Một bản port phải thêm `prompts/tools/powershell.md` chứ không đặt một chuỗi `PS>`. Test assertion cũng bị bỏ: khẳng định một label là assertion về cách diễn đạt, mà AGENTS.md cấm, và bản *"Tường minh KHÔNG làm tool đã được đăng ký"* của chính plan đã cấm dạng gần giống. |
| `powershell.ts` của pi-ref chính là file cần port (plan dòng 1774-1776, 67 LOC) | **EXISTS và xác nhận LOC**, nhưng không port trực tiếp được | File có thật ở 67 LOC và hằng số tiền tố UTF-8 của nó khớp byte-for-byte với spec này. Hai chướng ngăn một port nối: nó phụ thuộc năm symbol omp không có, và nó dùng `ReturnType<typeof createBashTool>` ở dòng 49 và 56, điều AGENTS.md cấm thẳng (*"NEVER use ReturnType<>"*). Mọi bản port phải nêu tên type tool cụ thể. |
| Task brief: *"the native addon is not built, so `bun test` currently reports 0 pass with 'Failed to load pi_natives native addon for darwin-arm64'"* | **IMPRECISE** — addon đúng là thiếu, nhưng `bun test` không ở mức 0 pass | Addon thực sự vắng mặt và `bun run check:ts` thực sự pass. Nhưng `bun test` không bị chặn hoàn toàn: `bun test packages/coding-agent/test/tools/` cho 145 pass / 177 fail / 174 errors trên 322 tests. Sự thật chính xác và liên quan tới quyết định là: bất kỳ test nào có module graph chạm tới `@oh-my-pi/pi-natives` đều fail lúc LOAD. Vì `tools/bash.ts:19` → `procmgr.ts:3` → natives, một test import tool không chạy được tới khi addon được build — và đó là lý do cổng nêu rõ bước build thay vì coi `bun test` là dùng được. |
| omp đã có sẵn đường ống PowerShell trong shell layer, hàm ý chỉ thiếu một tool mỏng (plan dòng 1751-1755 và 1785-1787) | **PARTIALLY TRUE**, và đó là nửa hữu ích | `procmgr` của omp **đã** mô hình hoá PowerShell: `isPowerShell` (dòng 71) nhận powershell/powershell.exe/pwsh/pwsh.exe, và `getShellArgs` (dòng 53) đã trả về `-NoLogo -Command` cho nó. Nên người dùng đã có thể cấu hình `shellPath: pwsh` và nhận đúng spawn args. Cái thiếu duy nhất là encoding guard — và vì thế W14a là ~30 dòng chứ không phải refactor. omp cũng đã biết idiom encoding này: `utils/clipboard.ts:270` đặt `[Console]::OutputEncoding = [Text.Encoding]::UTF8` (không có try/catch, trong một script `$ErrorActionPreference='Stop'` — bối cảnh khác, nên không phải phản ví dụ với yêu cầu try/catch của plan, nhưng là prior art của pattern). |


---


## W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer

**Thay đổi gì:** `Ctrl+Shift+F` mở một overlay fullscreen có thanh tìm kiếm phủ lên một bản replay của toàn bộ transcript của phiên; gõ vào lọc các dòng đã render, thanh tìm đếm số khớp, `Enter` / `Shift+Enter` nhảy viewport tới từng kết quả và tô sáng nó.

**Wave:** Wave 7 ("TUI và Windows — cái đuôi cắt được"), cùng W14. Cổng chặn của Wave 7 là câu hỏi mở 4a (scope W14) và **không** bọc W15. W15 không phụ thuộc gì và là thứ đầu tiên phải cắt nếu milestone trượt.

**Effort:** M cho phần port 327 dòng (đây là copy, không phải thiết kế). Tổng thể M+, khoảng 400–500 LOC ròng, vì scroll target mà plan nêu không tồn tại cho transcript sống và search buffer phải được sinh ra bằng một lần replay qua `ChatTranscriptBuilder`. Hai chỗ sửa trong `app-keybindings.ts`, không phải ba. Nếu kỹ sư chọn phương án chỉ-có-thanh-tìm (câu hỏi mở 1) thì rút về M gọn.

**Người dùng thấy:** Bấm `Ctrl+Shift+F` (khi không có overlay nào mở) sẽ vẽ một overlay transcript fullscreen với thanh tìm kiếm ở đáy. Gõ để thu hẹp; thanh tìm hiện `"7/23"` hoặc `"No matches"`; `Enter` cuộn tới và tô sáng kết quả kế tiếp, `Shift+Enter` tới kết quả trước, `Escape` đóng lại và trả focus về prompt. Không có gì khác của TUI thay đổi — không key, layout, hay render path nào hiện hữu bị đụng tới.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/tui/src/chat/transcript-search-index.ts` | tạo | Search index được port nguyên văn từ `/Users/tranquangdang21/Projects/pi-ref/packages/tui/src/alt-screen-search.ts` dòng 34–195: `SearchSourceSpan`, `SearchCorpus`, `buildSearchCorpus`, `normalizeQuery`, `escapeRegExp`, `findSearchCorpusMatches`, class cache của search index, `findTranscriptSearchMatches(lines, query)`, `getTranscriptSearchMatchKey`. Mọi tên `AltScreenSearch*` đổi thành `TranscriptSearch*`. | **Chưa** — file không tồn tại ở HEAD (đây chính là file mới). Nguồn copy thì đã kiểm chứng: `pi-ref/packages/tui/src/alt-screen-search.ts` dài 327 LOC tại HEAD của pi-ref `d6af72e`. |
| `packages/tui/src/overlays/transcript-search.ts` | tạo | Thanh tìm 3 dòng được port (pi dòng 197–326) thành `TranscriptSearchComponent implements Component, Focusable`, cộng `TranscriptSearchOverlay` mới sở hữu replay `ChatTranscriptBuilder`, `TranscriptSearchIndex`, `TranscriptBrowser` và thanh tìm. **tsgo không nhìn thấy nó qua barrel**: `packages/tui/src/index.ts` có **zero** export `overlays`, consumer import theo subpath. | **Chưa** — file không tồn tại ở HEAD. Hình dạng subpath đã đối chiếu với hai tiền lệ đang sống: `packages/coding-agent/src/modes/controllers/input-controller.ts:19` và `selector-controller.ts:92`. `grep -c overlays packages/tui/src/index.ts` trả về 0. |
| `packages/tui/src/keybindings.ts` | sửa | Thêm `"tui.transcript.searchNext": true` và `"tui.transcript.searchPrevious": true` vào `interface Keybindings` (block mở ở dòng 7, member cuối `tui.select.cancel` ở dòng 43) và các entry `TUI_KEYBINDINGS` tương ứng ở cuối bảng mở tại dòng 58. | **Có** — `grep -n "^export const TUI_KEYBINDINGS" packages/tui/src/keybindings.ts` → `58:export const TUI_KEYBINDINGS = {` |
| `packages/tui/src/app-keybindings.ts` | sửa | Thêm `"app.transcript.search": true` vào `interface AppKeybindings` (block dòng 26–65, member cuối `app.live.toggle` ở dòng 64) và một entry `KEYBINDINGS` với `defaultKeys "ctrl+shift+f"` ngay sau entry `"app.history.search"` ở dòng 236–239. **Không** sửa dòng 68. | **Có** — dòng 26 `interface AppKeybindings`; dòng 68 `export type AppKeybinding = keyof AppKeybindings` (tự suy ra, không cần sửa — plan nói ba chỗ sửa, thực tế là hai); dòng 86 `export const KEYBINDINGS = {`. |
| `packages/coding-agent/src/modes/controllers/input-controller.ts` | sửa | Trong block `#globalEditorActionsListener` (bắt đầu dòng 319), thêm nhánh `app.transcript.search` cạnh nhánh `app.history.search` ở dòng 331–337: chặn bằng `hasOverlay()`, gọi `this.ctx.showTranscriptSearch()`, trả `{ consume: true }`. | **Có** — plan trích `:391` làm chặn overlay; `:391` thực ra nằm trong listener `app.tools.expand`. Chặn thật của history search là check `getFocused() instanceof HistorySearchComponent` ở `:332`. Nhánh mới không cần self-guard đó vì overlay này mount qua `showOverlay`, không phải `showSelector`. |
| `packages/coding-agent/src/modes/controllers/selector-controller.ts` | sửa | Thêm `showTranscriptSearch()` cạnh `showCopySelector()` (dòng 1204). Dùng lại nguyên vẹn entry source (`getBranch().filter(isTranscriptEntry)`, dòng 1205), block deps `ChatTranscriptBuilder` (dòng 1217–1226) và mount fullscreen `showOverlay` (dòng 1249–1255). | **Có** — `showCopySelector` ở 1204, mount options ở 1249–1255, import `HistorySearchComponent` ở `:92` và `new HistorySearchComponent(...)` ở `:475`. `isTranscriptEntry` nằm ở `packages/coding-agent/src/session/session-context.ts:214`. |
| `packages/tui/src/hotkeys-markdown.ts` | sửa | Thêm một dòng hotkey ngay sau dòng `app.history.search` ở dòng 79, nếu không thì binding không được tài liệu hoá ở đâu cả và người dùng không tìm ra được tính năng. | **Có** — dòng 79 là dòng `` | `${hotkeyLabel(bindings, "app.history.search")}` | Search prompt history | ``. |
| `packages/tui/test/transcript-search.test.ts` | tạo | Test hợp đồng cho index và máy trạng thái điều hướng. Không source-grep, không `mock.module`, không `not.toThrow()` trần. | **Chưa** — file không tồn tại ở HEAD. Quy ước thư mục test đã xác nhận: `packages/tui/test/` chứa 235 file `*.test.ts`. |
| `packages/tui/CHANGELOG.md` | sửa | Một dòng dưới `[Unreleased]` > `Added`: `Ctrl+Shift+F` tìm kiếm trong transcript đã render. | **Chưa** — theo quy tắc changelog của AGENTS.md; không đọc để giữ context có giới hạn. |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `[Unreleased]` > `Added`: keybinding mới nhìn thấy được từ phía người dùng. | **Chưa** — theo quy tắc changelog của AGENTS.md; không đọc để giữ context có giới hạn. |

### Các bước

0. **Trước khi viết code, kiểm tra lại chord còn trống.** Chạy:
   ```bash
   for k in ctrl+shift+f ctrl+shift+e ctrl+shift+k alt+k; do printf '%s -> ' $k; grep -rn -F "$k" packages/tui/src packages/coding-agent/src | wc -l; done
   ```
   Kiểm tra riêng `ctrl+g`, vì default next/previous của pi dùng nó. Ở HEAD: `ctrl+shift+f` / `ctrl+shift+e` / `ctrl+shift+k` / `alt+k` đều 0 hit; **`ctrl+g` ĐÃ BỊ CHIẾM** bởi `app.editor.external` (`packages/tui/src/app-keybindings.ts`, `defaultKeys "ctrl+g"`). `tui.altScreen.searchNext` của pi mặc định là `["enter","ctrl+g"]` và `searchPrevious` là `["shift+enter","ctrl+shift+g"]` (`pi-ref/packages/tui/src/keybindings.ts:196-207`) — **không** mang `ctrl+g` sang. Chỉ dùng `["enter"]` và `["shift+enter"]`. Danh sách này là trạng thái ở HEAD, không phải bảo đảm; chạy lại lúc merge. *(anchor: `packages/tui/src/keybindings.ts:186`)*

1. **Tạo `packages/tui/src/chat/transcript-search-index.ts`.** Copy dòng 34–195 của file pi-ref (`buildSearchCorpus`, `normalizeQuery`, `escapeRegExp`, `findSearchCorpusMatches`, class index, `findAltScreenSearchMatches`, `getAltScreenSearchMatchKey`) và đổi mọi identifier `AltScreenSearch*` thành `TranscriptSearch*`. Nguồn port nằm **ngoài** repo này, ở `/Users/tranquangdang21/Projects/pi-ref` (anh em cạnh `ultraworkers`) — không có `pi-ref/` bên trong `ultraworkers`; `ls -d pi-ref` từ repo root trả về không có file như vậy. Đây là copy, không phải viết lại: giữ nguyên regex `PRINTABLE_ASCII`, toàn bộ loop index theo run ở dòng 53–78, và cờ `linearColumns` trên cả hai chỗ dựng span, từng byte. Ba thứ đó là toàn bộ câu chuyện hiệu năng và chúng đã được viết sẵn. *(anchor: `/Users/tranquangdang21/Projects/pi-ref/packages/tui/src/alt-screen-search.ts:34`)*

2. **Sửa đúng một import không tồn tại trong omp.** Dòng 4 của pi import `getGraphemeSegmenter` từ `./utils`; omp không có symbol đó ở bất cứ đâu trong `packages/`. Dùng `getSegmenter()` (`packages/tui/src/utils.ts:226`), cùng `stripTerminalSequences` (`utils.ts:388`) và `visibleWidth` (`utils.ts:318`). Giữ các non-null assertion khi index span — oxlint đặt `typescript/no-non-null-assertion` là `"off"` (`.oxlintrc.json:26`), nên không phải lỗi lint. *(anchor: `packages/tui/src/utils.ts:226`)*

3. **Tạo `packages/tui/src/overlays/transcript-search.ts`, port `TranscriptSearchComponent` từ pi dòng 197–326.** Ba điều chỉnh, tất cả đều bị ép: (a) `Input` của omp không có constructor options và không có placeholder — `packages/tui/src/components/input.ts:53` chỉ expose field mutable công khai (`prompt`, `mask`, `onSubmit`, `onEscape`, `cursorOverride`) — nên bỏ object `{ prompt, placeholder, placeholderStyle }`, set `this.#input.prompt = "Find: "` sau khi construct, và bỏ hẳn placeholder; (b) `render(width: number): readonly string[]` — hợp đồng `Component` của omp trả `readonly string[]` (`packages/tui/src/tui.ts:241`), không phải `string[]` của pi; (c) đổi mọi field `private` sang ES `#field` theo AGENTS.md. Giữ nguyên logic thu hẹp theo width ở pi dòng 290–318 — đó là thứ ngăn thanh tìm tràn ra terminal hẹp. *(anchor: `/Users/tranquangdang21/Projects/pi-ref/packages/tui/src/alt-screen-search.ts:197`)*

4. **Trong `render()` vừa port, xoá helper `formatKey` tự chế của pi** (pi dòng 263–272) và gọi `formatKeyHints` từ `../key-hint-format` (`packages/tui/src/key-hint-format.ts:114`). `formatKeyHint` đã render modifier theo thứ tự chuẩn và đã làm phép thay thế Option trên darwin mà helper cục bộ đang chế hoá bằng tay — giữ bản sao cục bộ là trùng implementation của một helper trung tâm, mà AGENTS.md coi là bug kể cả khi cả hai đều chạy. Đọc hai nhãn từ `getKeybindings().getKeys("tui.transcript.searchPrevious")` và `("tui.transcript.searchNext")`.

5. **Đăng ký hai binding ở tầng TUI.** Thêm hai member `true` vào `interface Keybindings` (block mở ở `:7`; member cuối `tui.select.cancel` ở `:43`) và hai definition vào cuối `TUI_KEYBINDINGS` (bảng mở ở `:58`). Default lấy từ bước 0: next `["enter"]`, previous `["shift+enter"]`, mỗi cái kèm description. Cả hai được khai báo ở tầng TUI chứ không phải tầng app, vì component đọc chúng nằm trong `packages/tui` — đó cũng là tầng pi dùng (`tui.altScreen.searchNext`). *(anchor: `packages/tui/src/keybindings.ts:7`)*

6. **Đăng ký chord mở overlay.** Thêm `"app.transcript.search": true` vào `interface AppKeybindings` (block `:26-65`, member cuối `app.live.toggle` ở `:64`) và một entry `KEYBINDINGS` ngay sau entry `"app.history.search"` ở `:236-239`, với `defaultKeys "ctrl+shift+f"` và một description. Không đụng dòng 68: `AppKeybinding` là `keyof AppKeybindings` và tự nhận member mới. Câu "add an entry to all three places" của plan là hai chỗ sửa, không phải ba. *(anchor: `packages/tui/src/app-keybindings.ts:26`)*

7. **Đây là bước plan làm sai, và nó là toàn bộ hình dạng của tính năng.** Thêm `TranscriptSearchOverlay` vào `packages/tui/src/overlays/transcript-search.ts`. Nó sở hữu: một `ChatTranscriptBuilder` dựng lại từ **TOÀN BỘ** branch qua `rebuild(entries)` (`packages/tui/src/chat/chat-transcript-builder.ts:112`) — không phải đuôi `recentEntries` mà `CopySelectorComponent` mặc định, vì một ô tìm không nhìn thấy phần còn lại của phiên thì vô dụng; một `TranscriptSearchIndex`; một `TranscriptBrowser`; và thanh tìm. Dựng line buffer phẳng bằng cách flatten `builder.container.children` — gọi `child.render(contentWidth)` cho từng child rồi nối lại. Đây đúng là hợp đồng mà `OutlineRowCache` dựa vào (`packages/tui/src/chat/transcript-outline.ts:80-93`: một child trả về cùng một mảng khi các dòng của nó không đổi). **Không** dùng `TranscriptBrowser.renderOutlineRows` / `stripPromptZones` cho việc này: nó cắt prompt zone và dịch chuyển các cột mà toàn bộ phép map match phụ thuộc. *(anchor: `packages/tui/src/chat/chat-transcript-builder.ts:112`)*

8. **Tô sáng bên trong frame callback, không phải sau render.** `TranscriptBrowser.render()` làm `this.#scrollView.setLines(frame.body.lines)` (`packages/tui/src/chat/transcript-browser.ts:237`), nên trả về `body.lines` đã tô sáng ngay từ frame callback sẽ đưa chúng vào viewport mà không cần pass thứ hai. Dựng index từ các dòng **phẳng** và tô sáng một bản sao riêng — `buildSearchCorpus` gọi `stripTerminalSequences` trên mọi dòng nên index không phụ thuộc highlight, nhưng index plain text thì rẻ hơn và xác định. Match hiện tại dùng style accent/reverse, các match khác dùng nền dim. *(anchor: `packages/tui/src/chat/transcript-browser.ts:237`)*

9. **Cuộn tới match.** Set body anchor của browser về dòng đầu của match hiện tại mỗi lần điều hướng, để `ScrollView.revealRange` kéo nó vào khung nhìn — đó là cơ chế `TranscriptBrowser` vốn đã dùng cho anchor của chính nó và không cần scroll API mới. Nếu canh giữa đọc dễ chịu hơn thì dùng `setActiveRow(row, "center")` (`packages/tui/src/components/scroll-view.ts:267`). Không dựng abstraction scroll; không đụng vào transcript sống. *(anchor: `packages/tui/src/components/scroll-view.ts:267`)*

10. **Thêm `showTranscriptSearch()` cạnh `showCopySelector()`.** Copy đúng hình dạng của nó: entries từ `this.ctx.sessionManager.getBranch().filter(isTranscriptEntry)` (dòng 1205), cùng đúng chín dep `ChatTranscriptBuilder` (dòng 1217–1226), cùng đúng cách mount fullscreen `this.ctx.ui.showOverlay(overlay, { anchor: "bottom-center", width: "100%", maxHeight: "100%", margin: 0, fullscreen: true })` (dòng 1249–1255), rồi `setFocus` + `requestRender`. `Escape` / cancel đi vào đúng `done()` đó — hide handle và dispose overlay. Branch rỗng thì `this.ctx.showStatus("Nothing to search yet.")` rồi return, khớp guard ở `:1206`. `dispose()` phải gọi `builder.dispose()` và bỏ index. *(anchor: `packages/coding-agent/src/modes/controllers/selector-controller.ts:1204`)*

11. **Thêm handler bên trong `#globalEditorActionsListener`** (block bắt đầu `:319`), ngay sau nhánh `app.history.search` ở `:331-337`:
    ```ts
    if (matches(data, "app.transcript.search")) {
      if (this.ctx.ui.hasOverlay()) return undefined;
      this.ctx.showTranscriptSearch();
      return { consume: true };
    }
    ```
    **Không** thêm self-guard `instanceof` như history search có ở `:332` — guard đó tồn tại vì `showHistorySearch` đổi editor slot qua `showSelector` (`selector-controller.ts:228-245`), hàm đó không tạo overlay. Cái này mount qua `showOverlay`, nên `hasOverlay()` đã phủ trường hợp đang mở. *(anchor: `packages/coding-agent/src/modes/controllers/input-controller.ts:331`)*

12. **Thêm một dòng vào bảng hotkeys** sau dòng `app.history.search` để binding discoverable, rồi thêm một dòng vào mỗi file `packages/tui/CHANGELOG.md` và `packages/coding-agent/CHANGELOG.md` dưới `[Unreleased]` > `Added`. *(anchor: `packages/tui/src/hotkeys-markdown.ts:79`)*

### Hình dạng code

```typescript
// packages/tui/src/chat/transcript-search-index.ts — ported verbatim from
// /Users/tranquangdang21/Projects/pi-ref/packages/tui/src/alt-screen-search.ts:34-195
// The only adaptation: getGraphemeSegmenter -> getSegmenter (utils.ts:226).

const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;

export interface TranscriptSearchSegment { row: number; startCol: number; endCol: number }
export interface TranscriptSearchMatch { segments: TranscriptSearchSegment[] }

interface SearchSourceSpan {
  textStart: number; textEnd: number;
  row: number; startCol: number; endCol: number;
  linearColumns: boolean; // true => ASCII fast path, 1 char === 1 column
}
interface SearchCorpus { text: string; spans: SearchSourceSpan[] }

function buildSearchCorpus(lines: readonly string[]): SearchCorpus {
  // KEEP THIS LOOP. One span per non-space RUN, not one per cell, and
  // linearColumns: true so match->column math is plain arithmetic. This is
  // what the 0.85.0 perf work already is; a per-cell rebuild is the failure
  // mode this item exists to avoid.
  // ... (pi lines 47-103, unchanged, incl. the PRINTABLE_ASCII branch)
}

// The load-bearing detail: a match may start in one span and end in another,
// possibly on a different row (wrapped lines). The walk emits ONE segment per
// touched span, carrying each span's own row, and merges adjacent same-row ones.
export function findTranscriptSearchMatches(
  lines: readonly string[], query: string,
): TranscriptSearchMatch[] { /* pi:186 */ }

export function getTranscriptSearchMatchKey(m: TranscriptSearchMatch): string { /* pi:191 */ }

/** Caches corpus + matches; `changed` is the overlay's skip-render signal. */
export class TranscriptSearchIndex {
  #sourceLines: string[] | undefined;
  #corpus: SearchCorpus | undefined;
  #normalizedQuery: string | undefined;
  #matches: TranscriptSearchMatch[] = [];

  search(lines: readonly string[], query: string): { matches: TranscriptSearchMatch[]; changed: boolean } {
    // pi:162-183 — element-wise compare so an append invalidates, an identical
    // re-query does not.
  }
}

// packages/tui/src/overlays/transcript-search.ts — the overlay.
// The line buffer is a REPLAY, not the live transcript: the live
// TranscriptContainer retires finished blocks into native terminal scrollback
// and drops them from .children, so it cannot be searched or scrolled.
export class TranscriptSearchOverlay implements Component {
  #builder: ChatTranscriptBuilder;   // rebuild(wholeBranchEntries)
  #index = new TranscriptSearchIndex();
  #browser: TranscriptBrowser;       // owns the ScrollView
  #bar: TranscriptSearchComponent;   // the 3-row search bar, ported from pi:197
  #query = "";
  #cursor = 0;                        // index into #index.search(...).matches

  #plainLines(contentWidth: number): string[] {
    const out: string[] = [];
    for (const child of this.#builder.container.children) out.push(...child.render(contentWidth));
    return out;
  }

  #frame(context: TranscriptBrowserRenderContext): TranscriptBrowserFrame {
    // 1. plain = this.#plainLines(context.contentWidth)          (identity-stable)
    // 2. { matches } = this.#index.search(plain, this.#query)   (skip if !changed)
    // 3. body.lines = highlight(plain, matches, this.#cursor)  -> TranscriptBrowser
    //    feeds these to ScrollView.setLines() (transcript-browser.ts:237), so the
    //    highlight lands in the viewport with no extra render pass.
    // 4. body.anchor = first row of matches[this.#cursor] -> revealRange scrolls to it.
  }

  render(width: number): readonly string[] { /* #browser.render + bar rows */ }
  dispose(): void { this.#builder.dispose(); this.#bar.dispose?.(); }
}
```

### Hợp đồng test

File test: `packages/tui/test/transcript-search.test.ts`. Sáu hợp đồng được đặt tên:

1. **Span mapping, row và column, xuyên qua ngắt dòng.** Dựng tay một buffer nhiều dòng đã wrap (không render, không TUI) và truy vấn một chuỗi bắt đầu ở dòng này kết thúc ở dòng kế tiếp. Khẳng định `findTranscriptSearchMatches` trả về **một** match với **hai** segment mang đúng `row`/`startCol`/`endCol` cho mỗi cái. Đây là ca chứng minh phép map span → `(row, startCol, endCol)`, và là ca dễ sai nhất trong file. Consumer: pass tô sáng trong frame callback và scroll anchor. Nếu hồi quy, người dùng thấy đếm số khớp đúng và viewport nhảy đúng chỗ nhưng highlight vẽ đè lên những từ khác.
2. **Một message đã wrap thứ hai ở các dòng sau** nhận cột đúng của nó, không phải cột của dòng 0. Canh riêng field `row`, thứ mà (1) không phân biệt được khi match nằm ở dòng 0–1. Consumer: như trên.
3. **Index rebuild khi dòng đổi, và `changed: false` khi truy vấn lại y hệt.** Chạy thẳng `TranscriptSearchIndex`: search một buffer, rồi search một buffer đã thêm một dòng, và khẳng định match mới xuất hiện. Sau đó search lại cùng buffer với cùng query và khẳng định `changed === false`. Consumer: đường mỗi lần gõ phím trong `#frame`; `changed: false` là tín hiệu cho phép overlay bỏ qua re-render. Đây là lý do phải chạy thẳng class chứ không chỉ hàm rời.
4. **Điều hướng vòng qua cả hai đầu.** Với 3 match, next từ index 2 rơi về 0 và previous từ 0 rơi về 2. Consumer: `Enter` và `Shift+Enter` trong thanh tìm.
5. **Query không có match trả `[]` và thanh tìm nói `"No matches"`** — không throw, không trả về match rỗng. Consumer: đường render của thanh tìm, nơi nếu không có thì sẽ index `segments[0]` của hư vô.
6. **Việc có giới hạn, không phải ngưỡng thời gian.** Đưa vào một buffer 5.000 dòng với đúng một lần xuất hiện; khẳng định kết quả đúng một match và các segment của nó chỉ chạm những dòng có chứa văn bản đó. Khẳng định wall-clock không phải hợp đồng theo AGENTS.md; một output có giới hạn mới là. Đây chính là khẳng định sẽ đỏ nếu ai đó thay fast path index theo run bằng một lần rebuild per-cell.

**Không** test có chủ ý: layout pixel của thanh tìm, chord, và cách mount overlay. Đó là wiring, và AGENTS.md cấm test khẳng định constructor chép lại một fixture.

### Xác minh

```bash
# điều kiện tiên quyết, không phải tuỳ chọn
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# cổng chính — oxlint + oxfmt --check + tsgo; đã xanh ở HEAD (exit 0)
bun run --cwd=packages/tui check

# tsgo qua hai controller đã sửa
bun run --cwd=packages/coding-agent check:types

# BỊ CHẶN ở HEAD — xem mục "Cổng hoàn thành"
bun test packages/tui/test/transcript-search.test.ts
```

### Cổng hoàn thành

Ba cổng, ít nhất hai cổng thật sự đỏ được.

1. **Cổng registry — cổng thật.** `packages/coding-agent/src/modes/controllers/input-controller.ts` gọi `this.ctx.keybindings.matches(data, "app.transcript.search")`, và `KeybindingsManager.matches` nhận `keybinding: Keybinding` với `Keybinding = keyof Keybindings` (`packages/tui/src/keybindings.ts:293`, `:45`). Xoá member mới khỏi `interface AppKeybindings` (`packages/tui/src/app-keybindings.ts:26`) thì tsgo fail với TS2345 tại call site đó. Một binding không có trong interface thì không phải binding. Cổng này fail to, cụ thể.
2. **Cổng types + lint + format** — `bun run --cwd=packages/tui check` và `bun run --cwd=packages/coding-agent check:types` đều exit 0. Bắt được ba chỗ port sai (`getGraphemeSegmenter`, Input options ctor, `readonly string[]`) và việc chuyển sang ES-`#private`.
3. **Cổng test** — `bun test packages/tui/test/transcript-search.test.ts` báo 0 fail. **KHÔNG CHẠY ĐƯỢC NGÀY HÔM NAY:** ở HEAD nó báo 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64` (đã xác nhận bằng cách chạy `packages/tui/test/scroll-view.test.ts`). Phải build addon trước bằng `bun --cwd=packages/natives run build`.

**Cổng có thực sự đỏ được không:** có — cổng 1 và cổng 2 đỏ thật và cổng 1 đỏ rất cụ thể (TS2345 tại đúng call site). Riêng cổng 3 thì không chạy được cho tới khi build addon, nên tracker của milestone-1 nên coi W15 là **type-complete, test-pending** chứ không phải done, cho tới khi có ai build addon.

### Phụ thuộc

- `depends_on`: không.
- `blocks`: không.

### Cách sai dễ nhất

Tin vào scroll target mà plan nêu. Plan nói rendered line buffer thuộc `packages/tui/src/components/scroll-view.ts`, nhưng transcript chính đang sống **không** dùng `ScrollView` chút nào: `TranscriptContainer` (`packages/tui/src/chrome/transcript-container.ts:150`, được giữ ở `packages/coding-agent/src/modes/interactive-mode.ts:879`) đẩy các block đã hoàn tất vào scrollback native của terminal và gỡ chúng khỏi `.children`, nên không còn gì để tìm và cũng không có API nào để cuộn tới một dòng. Kỹ sư tin plan sẽ viết search trên `chatContainer.children` và ship một tính năng âm thầm bỏ qua mọi thứ ngoài screenful cuối cùng. Cái bẫy thứ hai, lấy thẳng từ plan: tự dựng lại index thay vì port nó, và mất fast path index theo `PRINTABLE_ASCII` cùng cờ `linearColumns` trên từng span — đó là thứ giữ một transcript 200k dòng khỏi việc cấp phát một object mapping cho mỗi cell.

### Cần người quyết

- **Hình dạng overlay** — câu hỏi này thực sự quyết định ước lượng. (A) Fullscreen searchable replay: một overlay mới tự sở hữu replay `ChatTranscriptBuilder` và `ScrollView` riêng, nên `Enter` thực sự cuộn transcript tới match. Đây là biến thể mô tả ở trên và là biến thể duy nhất có scroll-to-match hoạt động. (B) Dùng lại transcript sống với thanh tìm, không scroll-to-match, chỉ khớp bằng số lượng. (B) nhỏ hơn nhưng người dùng không nhìn thấy mình khớp cái gì — đúng thứ là mục đích của tính năng. Khuyến nghị A. Nếu milestone đã trượt, cách cắt trung thực là bỏ hẳn W15 — plan xếp nó cuối cùng chính vì cắt nó không tốn gì người dùng có thể cảm nhận.
- **Chi phí replay trên phiên lớn.** `CopySelectorComponent` cố tình chỉ replay phần đuôi (`recentEntries` / `INITIAL_ENTRIES`) và lazy-load toàn bộ lịch sử khi cần. Tìm kiếm cần **toàn bộ** branch, nên mỗi lần mở đều rebuild full. Trên một phiên 200k dòng đó là rủi ro hiệu năng thực sự duy nhất của mục này, và fast path không giúp ở đây vì nó chỉ áp cho indexing chứ không áp cho replay. Lựa chọn: (i) chấp nhận và hiện `indexing…` khi đang chạy, (ii) cache replay trên mode object và invalidate khi session đổi, (iii) giới hạn cửa sổ tìm kiếm và nói rõ điều đó trên UI. Người chọn cần một con số, không phải cảm giác — đo trước khi chọn.
- **Chord.** `ctrl+shift+f` là khuyến nghị (trống ở HEAD, và cũng là default của chính pi nên muscle memory chuyển sang được). Nhưng `Ctrl+Shift+F` là Find ở rất nhiều terminal và emulator, và số cái forward nó về emulator chứ không về ứng dụng. Trước merge, xác nhận nó thực sự tới được app trên các terminal mà omp tuyên bố hỗ trợ, hoặc chọn `alt+k` (cũng 0 hit ở HEAD).
- **Style highlight.** Spec nói accent/reverse cho match hiện tại và nền dim cho phần còn lại. Cả hai là quyết định theme, không phải kỹ thuật, và chính style phần-còn-lại là thứ làm cho kết quả 23 hit còn điều hướng được. Cần một người nắm theme.
- **Mở khoá test.** `bun test` bị chặn toàn repo cho tới khi build native addon (`bun --cwd=packages/natives run build`). Cổng 1 và 2 của mục này có thể pass mà không cần nó; cổng 3 thì không. Xác nhận addon có được build trước khi mục này được lên lịch hay không, nếu không thì work item sẽ ship ở trạng thái type-complete, test-pending.

### Đính chính so với plan

| claim (trích từ plan) | verdict | correction |
| --- | --- | --- |
| `pi-ref/packages/tui/src/alt-screen-search.ts` là nguồn port, 327 LOC, "đã xác minh". | `correct-but-misleading-path` | File có thật và dài 327 LOC, nhưng `pi-ref` **không** nằm trong repo này — nó ở `/Users/tranquangdang21/Projects/pi-ref`, ngang hàng với `ultraworkers`. `ls -d pi-ref` từ repo root trả về không có file như vậy, và `find . -name 'alt-screen-search*'` trong repo trả về rỗng. `pi-ref` đang ở HEAD riêng `d6af72e`. Kỹ sư phải đọc xuyên thư mục; trong cây repo này không có gì để copy. |
| Điểm 4, "Scroll target: the rendered line buffer belongs to `packages/tui/src/components/scroll-view.ts` and `scroll-viewport.ts`". | `wrong` | `ScrollView` không đứng sau transcript chính đang sống, và không tồn tại scroll-to-row API cho nó. Transcript sống là một `TranscriptContainer` (`packages/tui/src/chrome/transcript-container.ts:150`) được giữ ở `packages/coding-agent/src/modes/interactive-mode.ts:879`, và nó đẩy block đã xong vào scrollback **native** của terminal — `chatContainer.children` chỉ chứa đuôi sống, nên vừa không đủ hoàn chỉnh để tìm, vừa không có API để cuộn. `ScrollView` được dùng bởi `console-tui.ts:45`, bởi `TranscriptBrowser` (copy-selector, rewind-selector) và bởi `SelectList`. Hệ quả: line buffer cần tìm phải do một lần replay `ChatTranscriptBuilder` sinh ra — đúng pattern `showCopySelector` ở `selector-controller.ts:1204` — mount thành overlay fullscreen riêng với `ScrollView` riêng. Đây là sai lệch lớn nhất so với plan, và nó biến M của plan thành M+. |
| Điểm 3, "add a new entry to all three of interface AppKeybindings (:26), type AppKeybinding (:68), and table KEYBINDINGS (:86)". | `wrong-by-one` | Hai chỗ sửa, không phải ba. Dòng 68 là `export type AppKeybinding = keyof AppKeybindings`, tự suy ra; thêm member vào interface là đủ. Cũng nên ghi lại: interface `AppKeybindings` có 38 member, không phải 14 như một lần đọc một phần gợi ý — một member có trong bảng `KEYBINDINGS` nhưng thiếu trong interface sẽ không typecheck tại call site `matches()`. |
| Port mang theo default key của pi cho next/previous (`['enter','ctrl+g']` / `['shift+enter','ctrl+shift+g']`). | `collision` | Plan chưa hề kiểm tra `ctrl+g`. Nó đã bị bind vào `app.editor.external` trong omp. Chỉ mang `['enter']` và `['shift+enter']`. Danh sách chord trống trong plan là đúng và vẫn đúng, nhưng nó nói về chord **mở**, không nói về chord điều hướng. |
| "Candidates still free, verified zero hits: `ctrl+shift+f`, `ctrl+shift+e`, `ctrl+shift+k`, `alt+x`, `alt+k`." | `mostly-correct, one-exception` | `ctrl+shift+f`, `ctrl+shift+e`, `ctrl+shift+k` và `alt+k` đều 0 hit. `alt+x` là **1 hit, không phải 0** — nhưng nó nằm trong một doc comment ở `packages/tui/src/keys.ts:544`, nên về mặt chức năng vẫn trống. Vẫn khuyến nghị `ctrl+shift+f`: đó là default của chính `tui.altScreen.search` của pi, nên muscle memory chuyển sang. |
| "InputController mounts overlays: the import at `:19` and the overlay-focus block at `:391`." | `stale-anchor` | Import ở `input-controller.ts:19` đúng và còn hiện hành. `:391` không phải block overlay-focus — nó nằm trong listener `app.tools.expand` (bắt đầu `:375`). Chặn overlay mà plan nói tới là check `this.ctx.ui.hasOverlay() \|\| this.ctx.ui.getFocused() instanceof HistorySearchComponent` ở `:332`, bên trong nhánh `app.history.search` ở `:331-337`. Làm việc trong block đó, không làm việc quanh `:391`. |
| Port import `getGraphemeSegmenter` từ `./utils` (pi line 4). | `stale-symbol` | Không có symbol đó ở bất cứ đâu trong omp. Segmenter dùng chung là `getSegmenter()` ở `packages/tui/src/utils.ts:226`. Nếu không sửa thì đây là thứ đầu tiên tsgo từ chối, nên nó là fix 30 giây chứ không phải vấn đề thiết kế. |
| Field `private` và constructor options `new Input({...})` của component được port. | `needs-adaptation` | `Input` của omp (`packages/tui/src/components/input.ts:53`) không có constructor và không có object options — nó expose field mutable công khai (`prompt`, `mask`, `onSubmit`, `onEscape`, `cursorOverride`) và hoàn toàn không hỗ trợ placeholder. Construct bằng `new Input()` rồi set `input.prompt = "Find: "`; style placeholder dim của pi phải bỏ hoặc thay thế. Ngoài ra chuyển mọi `private` của TS sang `#field` theo AGENTS.md, và `render()` trả `readonly string[]` theo hợp đồng `Component` của omp (`packages/tui/src/tui.ts:241`). |
| Test mục (4), "the perf contract as a BOUNDED-WORK assertion: a large transcript does not compute highlights for off-screen matches". | `overstated` | Port 327 dòng không có giới hạn theo thiết kế — `findSearchCorpusMatches` trả về mọi match trong buffer, và không gì trong đó biết viewport tồn tại. Ràng buộc phải được đưa vào ở tầng overlay, nếu không thì khẳng định nói về thứ port không làm. Phát biểu trung thực trong test: trên buffer 5.000 dòng với một lần xuất hiện, index trả đúng một match chỉ chạm những dòng chứa văn bản, và overlay chỉ render cửa sổ đang thấy. Đó mới là hợp đồng output có giới hạn thật; cách diễn đạt của plan hứa hẹn một ràng buộc viewport mà port không có. |
| Khung nhiệm vụ nói repo đang ở git HEAD `5873776`. | `wrong` | HEAD thực tế là `ecd516f` (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`) trên nhánh `milestone-1`. Mọi anchor trong spec này đã được xác minh lại trên `ecd516f`, không phải `5873776`. |


---


## W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage

**Thay đổi gì:** Đưa mọi backend session-storage trong `packages/coding-agent/src/session/` (filesystem, in-memory, indexed, SQL thật, Redis) vào cùng một bộ tám câu hỏi hành vi dùng chung, để một thay đổi ở backend này không còn âm thầm mâu thuẫn với backend kia.
**Wave:** Wave 6 — Storage conformance (test-only, second cut candidate)
**Effort:** M.

**Người dùng thấy:** nội bộ, người dùng không thấy — không có thay đổi runtime code. Lợi ích là một sai lệch giữa backend SQL và backend Redis giờ **fail một test** thay vì nổi ra thành một người dùng mất transcript session in-memory khi đóng tiến trình.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/test/session/storage-conformance.ts` | tạo | Case factory dùng chung, không phụ thuộc backend: map `ConformanceGroups` các nhóm hợp đồng có tên + `createStorageConformance(name, createHarness, groups)` trả về `{ groups, skipped }` thay vì tự đăng ký test — để một nhóm bị bỏ sót là **một giá trị quan sát được** mà test khẳng định được, chứ không phải một sự vắng mặt im lặng. | có (`verified: true`). Vị trí này khác plan: plan đặt ở `src/session/`, sai với repo này — 81 module helper chỉ-dùng-cho-test nằm dưới `test/`, và export map `"./*" -> "./src/*.ts"` của package sẽ publish module test ra cho consumer. |
| `packages/coding-agent/test/session/storage-conformance.test.ts` | tạo | Đăng ký cả năm backend vào suite dùng chung với tập nhóm đã giới hạn theo `Pick`; đồng thời giữ hai test hợp đồng cho chính harness: một nhóm bị bỏ sót phải được báo trong `skipped` chứ không fail, và mỗi lần đăng ký phải báo đúng tập con mà nó khai báo. | có (`verified: true`). Thay cho hai file riêng `sql-storage-conformance.test.ts` / `redis-storage-conformance.test.ts` của plan. Cả hai backend thật đều là subclass của `IndexedSessionStorage` với tập nhóm giống hệt nhau, nên một file có `describe` mỗi backend nhỏ hơn và biến việc cắt Wave 6 thành một lần xoá một file. |
| `packages/coding-agent/test/session/indexed-over-real-backend.test.ts` | tạo | Regression mà work item này mang tên: chạy lại lịch settler F1 late-atomic-rollback và ma trận hồi phục transient-failure trên `SqlSessionStorage` THẬT (SQLite in-memory qua `Bun.SQL` thật), trên Redis double, và trên control Map sẵn có — khẳng định cả ba cùng đạt trạng thái bền vững. | có (`verified: true`). Đây là file lấp đầy ô coverage thực sự còn trống: cả lịch F1 lẫn ma trận durability từ trước tới nay chỉ chạy trên `GatedBackend` / `FakeBackend`. |

Không file nào ở `src/` bị sửa. Work item này thuần test.

### Các bước

1. **Kiểm chứng lại ba neo mà toàn bộ thiết kế đứng trên, trước khi viết dòng code nào.** Chạy:
   ```bash
   git rev-parse --short HEAD            # kỳ vọng: ecd516f trên branch milestone-1
   grep -n "extends IndexedSessionStorage" packages/coding-agent/src/session/*.ts
   #   kỳ vọng: sql-session-storage.ts:262 và redis-session-storage.ts:109
   grep -n "confirmWrites\|withSessionFileLockSync\|deleteSessionWithArtifactsIf\|defersSyncPublish" \
     packages/coding-agent/src/session/session-storage.ts \
     packages/coding-agent/src/session/indexed-session-storage.ts
   ```
   Nếu SQL hoặc Redis không còn `extends IndexedSessionStorage`, hoặc các optional member đã dời chỗ → **DỪNG**, thiết kế dưới đây mất hiệu lực và spec này phải được suy ra lại.
   Neo: `packages/coding-agent/src/session/sql-session-storage.ts:262`

2. **Tạo `packages/coding-agent/test/session/storage-conformance.ts`** với ba export: `StorageHarness` (một `SessionStorage` cộng `dispose()` và một handle `readFull` có thể gate), `ConformanceGroups` (map có tên của các factory nhóm), và `createStorageConformance(name, createHarness, groups)`. Hàm **phải** trả `{ groups, skipped }` và **không được** tự gọi `describe`/`it` — đó là điều làm hợp đồng skip khẳng định được ở bước 6. Duyệt `Object.keys(ALL_GROUPS)`, giữ lại key nào có trong đối số `groups`, và đưa mọi key vắng mặt vào `skipped`.
   Neo: `packages/coding-agent/test/session/storage-conformance.ts`

3. **Cài tám factory nhóm trong cùng file đó.**
   - `readWrite` — `writeTextSync` rồi `drain()` rồi `readText` round-trip đúng nguyên văn body; `rename` di chuyển body và để lại nguồn **ENOENT**; `unlink` xoá nó.
   - `indexCoherence` — sau mỗi lần ghi, `existsSync`, `statSync().size` (độ dài **byte UTF-8**, không phải độ dài chuỗi) và `listFilesSync(dir, "*.jsonl")` khớp với body thực sự đã lưu; hai lần ghi liên tiếp nhanh sinh `mtimeMs` tăng nghiêm ngặt.
   - `casToken` — `writeTextSync(path, body, { expectedSize: <độ dài byte hiện tại> })` được chấp nhận; cùng lời gọi với `expectedSize` cũ bị từ chối bằng `SessionWriteConflictError` mang đúng `path`/`expectedSize`/`actualSize`; `{ expectedSize: null }` trên path đã tồn tại thì từ chối, trên path không tồn tại thì thành công.
   - `sliceReads` — `readTextSlices` trả đúng cửa sổ byte đầu và byte cuối, gồm `(0, 0)` -> `["", ""]` và một yêu cầu vượt ngân sách trả về toàn bộ body.
   - `deferredPublish` — `defersSyncPublish === true`; `confirmWrites(path)` chỉ resolve sau khi backend publish, và reject khi một publish đã xếp hàng cho path đó thất bại.
   - `crossProcessLock` — `withSessionFileLockSync` serialize, và `deleteSessionWithArtifactsIf` chỉ xoá khi predicate chấp nhận nội dung **HIỆN TẠI**.
   - `failureRecovery` — với backend được cấu hình fail lần `writeFull`/`append` kế tiếp, index in-memory rollback về entry bền vững cuối cùng, body đã fail **không** đọc được, và lần ghi kế tiếp hội tụ rồi republish lại toàn bộ transcript.
   - `lateAtomicRollback` — đúng lịch F1 từ `indexed-late-atomic-rollback.test.ts:120-145`: reject atomic A, gate readback của A, publish một sync B khác kích thước rồi `await confirmWrites(path)`, thả readback của A, rồi khẳng định cả backend **lẫn** `statSync` đều vẫn mô tả B và một lần ghi có guard tiếp theo ở đúng size của B chạy thành công.
   Neo: `packages/coding-agent/test/session/storage-conformance.ts`

4. **Thêm năm factory harness.**
   - `createSqlHarness` — `new SQL("sqlite::memory:")` bọc trong một object `SqlSessionStorageClient` delegate `unsafe`/`transaction` tới client thật nhưng có thể (a) tiêm lỗi một lần và (b) đậu `readFull` sau một release gate — **copy seam bọc đó từ seam đã được chứng minh tại `packages/coding-agent/test/session/sql-session-storage.test.ts:51-60`**; trong `dispose` thì `await SqlSessionStorage.create({ client })` và `client.end()`.
   - `createRedisHarness` — dùng lại double `createFakeRedis` tự viết tay ở `packages/coding-agent/test/session/redis-session-storage.test.ts:37`, mở rộng với cùng hai điểm tiêm lỗi đó.
   - `createFileHarness` và `createMemoryHarness` — `FileSessionStorage` và `MemorySessionStorage` trên `Bun.tempDir()` / một map mới.
   - `createMapHarness` — `new IndexedSessionStorage(new FakeBackend())` dùng lại class `FakeBackend` ở `packages/coding-agent/test/session/session-manager-indexed-durability.test.ts:22` làm control.
   - **KHÔNG BAO GIỜ** dùng `mock.module()` — mutate object client được inject trong từng test rồi reset, để không rò rỉ ra file khác.
   Neo: `packages/coding-agent/test/session/sql-session-storage.test.ts:51`

5. **Viết `packages/coding-agent/test/session/storage-conformance.test.ts`.** Đăng ký năm khối `describe` — `SqlSessionStorage (real SQLite)`, `RedisSessionStorage (double)`, `IndexedSessionStorage (map control)`, `MemorySessionStorage`, `FileSessionStorage` — mỗi khối gọi `createStorageConformance` với tập con của nó, rồi một helper cục bộ `register(plan)` nối `plan.groups` vào `describe`/`it`. **Giới hạn theo năng lực, không theo tiện lợi:** ba backend indexed lấy toàn bộ nhóm; `MemorySessionStorage` và `FileSessionStorage` bỏ `deferredPublish` (không backend nào khai báo `defersSyncPublish` hay `confirmWrites`); ba backend không-phải-file bỏ `crossProcessLock` (chỉ `FileSessionStorage` hiện thực `withSessionFileLockSync` / `deleteSessionWithArtifactsIf`).
   Neo: `packages/coding-agent/test/session/storage-conformance.test.ts`

6. **Thêm hai test hợp đồng harness vào cùng file đó.**
   (1) `SqlSessionStorage` báo đúng `skipped === ["crossProcessLock"]` và `FileSessionStorage` báo đúng `skipped === ["deferredPublish"]` — chứng minh một nhóm bị bỏ sót là **skipped**, không phải failed, và cũng không âm thầm chạy.
   (2) Với **mọi** lần đăng ký: `Object.keys(plan.groups)` là tập con của tập năng lực đã khai báo **VÀ** mọi nhóm đã khai-báo-và-được-hỗ-trợ thực sự xuất hiện trong `groups` — đây là chốt gá chống anti-pattern, chặn trường hợp một backend âm thầm chạy sai tập nhóm, thứ mà plan đánh giá còn tệ hơn cả việc không đăng ký.
   Neo: `packages/coding-agent/test/session/storage-conformance.test.ts`

7. **Viết `packages/coding-agent/test/session/indexed-over-real-backend.test.ts`:** chạy nhóm `lateAtomicRollback` và `failureRecovery` qua `createSqlHarness`, `createRedisHarness` và `createMapHarness` trong **một vòng lặp tham số hoá duy nhất**, rồi khẳng định cả ba cùng đạt trạng thái bền vững giống hệt. Đây là nơi duy nhất lịch F1 và ma trận durability từng chạy trên đường thay thế row SQL thật thay vì một Map — nên đây là file mang coverage mới.
   Neo: `packages/coding-agent/test/session/indexed-over-real-backend.test.ts`

8. **Xác minh.** `bun test packages/coding-agent/test/session/storage-conformance.test.ts packages/coding-agent/test/session/indexed-over-real-backend.test.ts` phải exit 0 — nhưng lưu ý phải build native addon trước (`bun --cwd=packages/natives run build`), vì `bun test` hiện báo `0 pass / 1 fail` với `Failed to load pi_natives native addon for darwin-arm64` cho **mọi** file trong package này. Sau đó chạy `bun run check:ts` (đây là thứ chạy được trong môi trường chưa build — nó pass sạch trên `ecd516f`, 5445 files formatted, mọi package `Done`). **Không bao giờ** dùng `tsc` / `npx tsc`.

9. **Báo cáo các sai lệch suite phơi ra thành phát hiện RIÊNG, đừng âm thầm nới lỏng một nhóm để nó xanh.** Nếu một sai lệch hoá ra là bug production, nó trở thành một fix có tác động tới người dùng và vì vậy cần một mục trong `packages/coding-agent/CHANGELOG.md` dưới `## [Unreleased]` ở section thích hợp. Nếu **mọi** sai lệch đều được giải quyết theo hướng "suite đặt quá nhiều", W16 thực sự thuần test và **không** cần mục changelog nào. Hãy nói rõ chuyện nào đã xảy ra.
   Neo: `packages/coding-agent/CHANGELOG.md`

### Hình dạng code

```ts
// test/session/storage-conformance.ts — cơ chế. Thuần khiết, không describe/it.
import { IndexedSessionStorage } from "@oh-my-pi/pi-coding-agent/session/indexed-session-storage";
import type { SessionStorage } from "@oh-my-pi/pi-coding-agent/session/session-storage";

export interface StorageHarness {
	readonly storage: SessionStorage;
	/** Fail next N backend `writeFull` / `append` calls (transient-failure group). */
	failWrites(n: number): void;
	/** Park `readFull` until `releaseReadFull()` — required by the F1 late-rollback schedule. */
	gateReadFull(): void;
	releaseReadFull(): void;
	dispose(): Promise<void>;
}

export interface ConformanceGroups {
	readWrite(): void;
	indexCoherence(): void;
	casToken(): void;
	sliceReads(): void;
	deferredPublish(): void;
	crossProcessLock(): void;
	failureRecovery(): void;
	lateAtomicRollback(): void;
}

/** `Partial` IS the scope: an absent key is skipped, never failed. */
export interface ConformancePlan {
	readonly groups: Record<string, () => void>;
	readonly skipped: readonly string[];
}

export function createStorageConformance(
	name: string,
	createHarness: () => Promise<StorageHarness>,
	groups: Partial<ConformanceGroups>,
): ConformancePlan {
	const all: ConformanceGroups = {
		readWrite, indexCoherence, casToken, sliceReads,
		deferredPublish, crossProcessLock, failureRecovery, lateAtomicRollback,
	};
	const keys = Object.keys(all) as Array<keyof ConformanceGroups>;
	const kept = keys.filter(key => groups[key] !== undefined);
	const harness = once(createHarness);
	return {
		groups: Object.fromEntries(kept.map(key => [key, () => groups[key]!()])),
		skipped: keys.filter(key => groups[key] === undefined),
	};
}
```

```ts
// test/session/storage-conformance.test.ts — registration, one describe per backend.
const sqlPlan = createStorageConformance("SqlSessionStorage", createSqlHarness, {
	readWrite, indexCoherence, casToken, sliceReads,
	deferredPublish, failureRecovery, lateAtomicRollback,
	// crossProcessLock omitted on purpose -> must be reported as skipped
});
register("SqlSessionStorage (real SQLite)", sqlPlan);

it("reports an omitted group as skipped instead of failing it", () => {
	expect(sqlPlan.skipped).toEqual(["crossProcessLock"]);
	expect(filePlan.skipped).toEqual(["deferredPublish"]);
});
```

```ts
// test/session/indexed-over-real-backend.test.ts — the regression that closes the cell.
for (const [name, createHarness] of [
	["sql (real Bun.SQL sqlite)", createSqlHarness],
	["redis (double)", createRedisHarness],
	["map control", createMapHarness],
] as const) {
	it(`${name} keeps B durable when A's gated readback settles after B commits`, async () => {
		const h = await createHarness();
		const s = h.storage as IndexedSessionStorage;
		// ... same settler schedule as indexed-late-atomic-rollback.test.ts:120-145,
		//     but `failWrites` / `gateReadFull` come from the REAL backend client.
		expect(h.backendBody(path)).toBe(bBody);
		expect(s.statSync(path).size).toBe(bSize);
		s.writeTextSync(path, "C\n", { expectedSize: bSize }); // must not throw
		await h.dispose();
	});
}
```

### Hợp đồng test

**Hợp đồng:** mọi hiện thực `SessionStorage` trong `packages/coding-agent/src/session/` đều trả lời cùng tám câu hỏi có tên về read/write, index coherence, CAS token `expectedSize`, slice read cửa sổ byte, ngữ nghĩa drain của deferred publish, cross-process locking, hồi phục transient-failure, và lịch F1 late-atomic-rollback — và một backend về mặt cấu trúc không thể hỗ trợ một nhóm sẽ được ghi nhận là `skipped`, chứ không lặng lẽ pass.

**Nếu hồi quy, người dùng thấy** chế độ hỏng F1 được mô tả tại `packages/coding-agent/test/session/indexed-late-atomic-rollback.test.ts:5-11`: `#failFrame` (`packages/coding-agent/src/session/indexed-session-storage.ts:553-566`) phục hồi một snapshot trước-lúc-ghi lên trên index bền vững **mới hơn**, khiến `statSync` mô tả một body mà backend không còn giữ, lần ghi có guard kế tiếp bị CAS từ chối, và người dùng mất transcript session in-memory. Chế độ hỏng thứ hai là một storage đúng khi đứng riêng nhưng bất đồng với anh em của nó: nhánh conflict của `writeFull` ở backend SQL làm một lần `readFull` + re-check `Buffer.byteLength` rồi **nuốt** một lần thay thế byte-giống-hệt như thành công (`packages/coding-agent/src/session/sql-session-storage.ts:384-393`) — một nhánh chưa từng chạy lần nào trong test, vì lịch F1 tới giờ chỉ chạy trên `Map`.

**Hợp đồng của chính harness cũng gánh nặng không kém:** nếu một lần đăng ký âm thầm chạy sai tập nhóm, một khẳng định `deferredPublish` có thể pass trên một backend lưu trong body mà chưa từng defer gì, và suite sẽ báo xanh một coverage mà nó không có.

**File test:** `packages/coding-agent/test/session/storage-conformance.ts`, `packages/coding-agent/test/session/storage-conformance.test.ts`, `packages/coding-agent/test/session/indexed-over-real-backend.test.ts`.

### Xác minh

```bash
# BLOCKED cho tới khi build native addon (đã xác minh trên ecd516f: 0 pass, 1 fail,
# "Failed to load pi_natives native addon for darwin-arm64"):
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# The gate — must exit 0:
bun test packages/coding-agent/test/session/storage-conformance.test.ts \
         packages/coding-agent/test/session/indexed-over-real-backend.test.ts

# Works today, no addon needed (verified clean on ecd516f):
bun run check:ts

# The three pre-existing files this must not break:
bun test packages/coding-agent/test/session/sql-session-storage.test.ts \
         packages/coding-agent/test/session/redis-session-storage.test.ts \
         packages/coding-agent/test/session/session-manager-indexed-durability.test.ts \
         packages/coding-agent/test/session/indexed-late-atomic-rollback.test.ts
```

### Cổng hoàn thành

`bun test packages/coding-agent/test/session/storage-conformance.test.ts packages/coding-agent/test/session/indexed-over-real-backend.test.ts` exit 0, **VÀ** nhóm `lateAtomicRollback` chứng minh được là đã chạy trên một `SqlSessionStorage` thật dựng từ `new SQL("sqlite::memory:")` — xác nhận bằng việc suite pass trong khi nhánh conflict `writeFull` của backend SQL (`packages/coding-agent/src/session/sql-session-storage.ts:377-394`, phần re-check `readFull` + byte length) không có test nào khác chạm tới. Dạng phủ định của cổng: nếu bạn xoá nhánh real-SQL khỏi vòng lặp tham số hoá trong `indexed-over-real-backend.test.ts` và chỉ còn Map control, các khẳng định equality `sqlPlan.skipped` ở bước 6 vẫn pass trong khi coverage cross-product thực sự đã biến mất — vì vậy còn phải khẳng định `createSqlHarness` nằm trong danh sách harness mà vòng lặp duyệt, bằng cách biến chính danh sách harness của vòng lặp thành đối tượng của một test, và test đó đỏ khi danh sách rớt xuống dưới ba phần tử.

**Cổng này có thể đỏ thật, theo ba đường.** (1) Hai file test không tồn tại → `bun test` báo lỗi trên đường dẫn thiếu. (2) Các khẳng định `skipped` là so sánh mảng **bằng tuyệt đối**, nên một lần đăng ký thêm, mất, hay giới hạn sai một nhóm sẽ đỏ suite chứ không pass lặng lẽ. (3) Các khẳng định F1 là hành vi: `expect(statSync(path).size).toBe(bSize)` và một lần `writeTextSync(path, "C\n", { expectedSize: bSize })` không có guard phải **không** ném. Một hồi quy trong `#failFrame` (`packages/coding-agent/src/session/indexed-session-storage.ts:553-566`) hoặc trong nhánh conflict SQL (`packages/coding-agent/src/session/sql-session-storage.ts:384-393`) làm chúng đỏ. **Lưu ý về mức độ tin cậy:** cổng này **chưa** được chạy quan sát — `bun test` bị chặn trong môi trường này bởi native addon chưa build, nên nó được **lập luận từ mã nguồn**, không phải quan sát thấy pass. `bun run check:ts` thì **đã** chạy và pass sạch trên `ecd516f`.

### Phụ thuộc

không — `depends_on` rỗng và `blocks` rỗng. Không work item nào khác bị chặn và work item này không chặn work item nào khác.

### Cách sai dễ nhất

**Coi sai lệch đầu tiên mà suite phơi ra là ma sát test rồi tinh chỉnh nhóm cho tới khi nó xanh.** Rủi ro lớn nhất nằm ở chỗ số dòng không phải thứ làm item này là M — rủi ro nằm ở việc **hai sai lệch thật, đã nhìn thấy sẵn trong mã nguồn, gần như chắc chắn là thật chứ không phải nhiễu**, và cả hai đều cần một quyết định của con người:
1. `RedisSessionStorageBackend.move` (`packages/coding-agent/src/session/redis-session-storage.ts:261-267`) bắt lỗi migration meta-hash rồi chỉ `logger.warn`, để lại STRING key đã dời trong khi metadata vẫn trỏ về path cũ — trong khi `SqlSessionStorageBackend.move` (`packages/coding-agent/src/session/sql-session-storage.ts:427-432`) bọc toàn bộ move trong `client.transaction` và là all-or-nothing. Một nhóm mang hình dạng `crossProcessLock` khẳng định rename nguyên tử sẽ **fail** trên Redis, và thất bại đó là một bug bền vững thực sự, không phải bất đồng về đặc tả.
2. `SqlSessionStorageBackend.readSlices` ném `enoent(path)` cho một row không tồn tại (`packages/coding-agent/src/session/sql-session-storage.ts:358`) trong khi `RedisSessionStorageBackend.readSlices` trả `["", ""]` vì `GETRANGE` trên key không tồn tại cho chuỗi rỗng (`packages/coding-agent/src/session/redis-session-storage.ts:182-187`) — một sai lệch hình dạng "âm thầm mất dữ liệu", nơi SQL thì vang, Redis thì im.

### Cần người quyết

- **(chặn bắt đầu)** Đăng ký Redis có được chạy trên double tự viết tay không? Repo này không có hạ tầng test `bun:redis`, và cả hai file test Redis sẵn có đều nói thẳng là tránh server sống để "so the suite runs without a live server" (`packages/coding-agent/test/session/redis-session-storage.test.ts:1-16`). Chạy trên double kiểm **hợp đồng storage**, không phải ngữ nghĩa Redis-server — tính nguyên tử của Lua `EVAL` thật, hành vi con trỏ `SCAN` và lỗi kết nối vẫn chưa được test dù chạy thế nào. Xác nhận double là chấp nhận được cho milestone 1, hoặc budget một dịch vụ Redis trong CI.
- **(chặn phạm vi)** Có đưa Postgres và MySQL vào scope không? `sql-session-storage.test.ts` chỉ kiểm tra bằng chuỗi DDL/upsert theo dialect dựng lúc khởi tạo; không test nào thực thi các câu lệnh đó. Đưa Postgres/MySQL sống vào conformance suite là một công việc lớn hơn tất cả mọi thứ khác trong item này cộng lại, và ngoài scope milestone 1 trừ khi được yêu cầu tường minh.
- **(quyết định phát sinh khi chạy, không chặn bắt đầu)** Với sai lệch `move()` — Redis nuốt lỗi migration meta, SQL thì transactional — hành vi nào đúng? Một nhóm khẳng định rename nguyên tử sẽ fail trên Redis. Hoặc Redis sai và nó thành fix bug có tác động tới người dùng kèm mục changelog, hoặc nhóm đặt quá nhiều và nên được giới hạn lại cho Redis. **Con người phải quyết — đừng để suite tự quyết bằng cách bị nới lỏng.**
- **(quyết định phát sinh khi chạy, không chặn bắt đầu)** Cùng câu hỏi cho sai lệch `readSlices`-trên-path-không-tồn-tại (SQL ném ENOENT, Redis trả chuỗi rỗng). Đây là một đường đọc sống, nên câu trả lời quyết định liệu một người dùng Redis có bị phục vụ một session rỗng ma quỹ thay vì nhận lỗi hay không.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| "Repo đang ở git HEAD 5873776 trên branch milestone-1." | **STALE** | HEAD là `ecd516f` trên branch `milestone-1` (xác minh bằng `git rev-parse --short HEAD`). Suy ra lại mọi neo đã được kiểm chống `5873776`. Bằng chứng: `git log --oneline -1` -> `ecd516f feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`. |
| "pi ship hai lớp conformance để copy: `pi-ref/packages/agent/src/harness/session/testing/conformance/session-repo.ts` (1.185 LOC) và `pi-ref/packages/durable/src/testing/storage-conformance.ts` (1.520 LOC)." | **UNAVAILABLE** — cách đặt vấn đề "nhận cơ chế chứ không nhận mã" không thi hành được như đang viết | Không `pi-ref/` lẫn `packages/durable/` tồn tại trong repo này. Không có nguồn cục bộ để port, nên suite phải được **VIẾT MỚI** dựa trên hợp đồng `SessionStorage` của chính repo này, dùng file của pi chỉ như tham chiếu thiết kế nếu ai đó fetch chúng từ upstream. Hãy budget cho thiết kế từ đầu, không phải copy-and-adapt. Bằng chứng: `ls -d pi-ref` -> No such file or directory; `ls -d packages/durable` -> No such file or directory. |
| "`IndexedSessionStorage` × một backend thật là một ô chưa test — cross-product mà item này đóng." | **SAI — ô đó không tồn tại trong kiến trúc này** | `SqlSessionStorage extends IndexedSessionStorage` và `RedisSessionStorage extends IndexedSessionStorage`. Indexed không phải backend ngang hàng để cross với SQL/Redis; nó là **superclass chung** của chúng, và `indexed × real backend` là **duy nhất** cách wiring production đang tồn tại. Regression đầu bản của plan (test item 2) dựng trên tiền đề sai và không thể đặc tả như đang viết. Khoảng trống thật, xác minh được, hẹp hơn nhiều và chính là cái bước 7 nhắm tới: lịch F1 late-atomic-rollback và ma trận hồi phục transient-failure tới giờ chỉ chạy trên `GatedBackend` / `FakeBackend`, chưa từng chạy trên nhánh conflict thật của `SqlSessionStorageBackend.writeFull`. Bằng chứng: `sql-session-storage.ts:262` `export class SqlSessionStorage extends IndexedSessionStorage`; `redis-session-storage.ts:109` `export class RedisSessionStorage extends IndexedSessionStorage`; `indexed-session-storage.ts:118` `export class IndexedSessionStorage implements SessionStorage`. |
| "Không backend thật nào được test với hợp đồng CAS token, nên một suite xanh trên ba backend sẽ đóng khoảng trống." | **SAI MỘT PHẦN — coverage CAS trên SQL thật đã tồn tại** | `packages/coding-agent/test/session/sql-session-storage-manager.test.ts:128` đã khẳng định `SessionWriteConflictError` trên một kết nối SQLite in-memory `Bun.SQL` **thật**, đi qua `IndexedSessionStorage` và `SessionManager.rewriteEntries()`. Đừng tranh luận lại CAS-trên-SQL như coverage mới; khoảng trống thật là (a) lịch F1 và ma trận hồi phục lỗi chưa từng chạy trên backend thật, (b) `readTextSlices` chưa từng chạy trên `RedisSessionStorage` dù chỉ một lần, và (c) hai sai lệch `move`/`readSlices` nêu dưới. Bằng chứng: `it("rejects a stale rewrite after another SQL storage appends", ...)` -> `await expect(first.rewriteEntries()).rejects.toBeInstanceOf(SessionWriteConflictError)`; `grep -rn readTextSlices test/` trả hit ở `memory-session-storage.test.ts` và `sql-session-storage.test.ts:281` nhưng **không** hit nào ở `redis-session-storage.test.ts`. |
| "Tạo case factory tại `packages/coding-agent/src/session/storage-conformance.ts`." | **SAI VỊ TRÍ** cho repo này | Đặt tại `packages/coding-agent/test/session/storage-conformance.ts`. 81 module helper chỉ-dùng-cho-test nằm dưới `test/`, không phải `src/`, và export map `"./*" -> "./src/*.ts"` của package sẽ publish module test ra tới mọi consumer. Vị trí sibling-of-test khớp với tiền lệ `test/session-manager/helpers.ts`. Bằng chứng: `find test -name '*.ts' ! -name '*.test.ts' | wc -l` -> 81. |
| "Test mới: `test/session/sql-storage-conformance.test.ts`, `test/session/redis-storage-conformance.test.ts`, `test/session/indexed-over-real-backend.test.ts`." | **CỐ Ý GỘP (2 file, không phải 3)** | Cả hai backend thật là subclass của `IndexedSessionStorage` với tập nhóm **giống hệt**, nên một `storage-conformance.test.ts` duy nhất với một `describe` mỗi backend vừa nhỏ hơn vừa biến việc cắt Wave 6 thành **xoá một file** — đúng mục đích mà wave tuyên bố. Failure vẫn truy được nguồn vì mỗi backend giữ `describe` riêng. Bằng chứng: cả hai delegate `super(backend)` — `sql-session-storage.ts:277-282` và `redis-session-storage.ts:116-120`. |
| "Các file fake-backend sẵn có cần đối chiếu là `test/session/session-manager-indexed-durability.test.ts` và `test/indexed-late-atomic-rollback.test.ts`." | **SAI MỘT ĐƯỜNG DẪN** | `indexed-late-atomic-rollback.test.ts` nằm ở `test/session/indexed-late-atomic-rollback.test.ts`, không phải ở gốc `test/`. Cả hai file phải tiếp tục pass mà không đổi; conformance suite là phần cộng thêm và **không được** sửa chúng. Bằng chứng: `ls packages/coding-agent/test/session/indexed-late-atomic-rollback.test.ts` -> có (4.8 KB, 146 dòng, 1 test). |
| "Lệnh xác minh là `bun check && bun test <ba file>`." | **BỊ CHẶN BỞI MÔI TRƯỜNG** như đang viết | `bun test` không chạy được ở HEAD khi chưa có native addon. Đã xác minh: `bun test packages/coding-agent/test/session/indexed-late-atomic-rollback.test.ts` -> `0 pass / 1 fail`, `error: Failed to load pi_natives native addon for darwin-arm64`. Build trước bằng `bun --cwd=packages/natives run build`. `bun run check:ts` đã chạy và pass sạch (5445 files formatted, mọi package `Done`) và là xác minh **duy nhất** khả dụng trước khi addon tồn tại. Bằng chứng: `find . -name '*.node' -not -path '*/node_modules/*'` -> không có kết quả. |


---


## W17. Gói bug-report đã redact + crash ring

**Thay đổi gì:** Thêm một redactor theo *tên key* (chuẩn hoá camelCase trước khi so khớp, nên `apiKey` / `api_key` / `API-KEY` đều khớp), một crash ring ghi qua `getCrashLogPath()` đã có sẵn nhưng chưa ai dùng, và lệnh `/bug-report` dựng archive gửi đi được — trong đó nội dung transcript của phiên là **opt-in**, không bao giờ bật mặc định.
**Wave:** Wave 5 — Chẩn đoán hướng người dùng.
**Effort:** Nhỏ hơn mức M mà plan ấn định, vì khoảng một nửa danh sách file của plan đã tồn tại dưới hình thức khác. Phần code thật sự mới: `redact.ts` (~60 dòng, port gần nguyên vẹn), `crash-log.ts` (~120 dòng, port trừ khớp extension-stack), collector + danh sách file của `bug-report.ts` (~200 dòng), một entry lệnh (~50 dòng), và ma trận redaction (~150 dòng). Riêng phần tóm tắt bằng LLM là mảnh có thể phình nếu lệnh gọi model một lượt lại cần thêm retry plumbing — giữ nó sau cùng opt-in với transcript và coi là bỏ được.

**Người dùng thấy:** Lệnh `/bug-report` mới dựng một archive chẩn đoán và hiện đường dẫn của nó. Archive luôn mang metadata, phân bổ chi phí theo từng model, chẩn đoán các lượt trợ lý thất bại, và các bản ghi crash gần đây; transcript hội thoại và thư mục làm việc của nó chỉ được đưa vào khi người dùng nói rõ, và việc giao archive là một lựa chọn tường minh (ghi file cục bộ vs. chuyển tiếp) chứ không phải tự động tải lên. Một crash giết phiên được ghi lại và báo lại ở lần khởi động kế tiếp thay vì biến mất, và không key nào có tên trông giống mang thông tin đăng nhập sống sót vào archive.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/diagnostics/redact.ts` | tạo | Hàng hoá chính. Export `REDACTED = "<redacted>"`, `SENSITIVE_KEY`, `isSensitiveKey(key)` (chuẩn hoá camelCase → snake_case **trước khi** khớp), `redactUrl(value)`, `redactJsonValue(value)`. Port từ `bug-report.ts:17-60` của pi-ref, giữ nguyên hành vi; khác biệt duy nhất là cách viết import (pi dùng specifier `.ts` và `@earendil-works/*`, omp dùng extensionless và `@oh-my-pi/*`). | có |
| `packages/coding-agent/src/diagnostics/crash-log.ts` | tạo | Export `CrashRecord`, `readCrashLog(path?)`, `recordCrash(crash, path?)`, `takeUnnotifiedCrash(path?, now?)`, `clearCrashLog(path?)`. Port từ `crash-log.ts` (169 LOC) của pi-ref, bỏ `findExtensionStackMatches`. Dùng `getCrashLogPath()` có sẵn làm path mặc định — **không** tự dựng lại path bằng `join()` như pi làm. | có |
| `packages/coding-agent/src/diagnostics/bug-report.ts` | tạo | Export `BUG_REPORT_SCHEMA_VERSION = 1`, `BUG_REPORT_CUSTOM_ENTRY_TYPE = "omp.bug-report"`, `BugReportBundle`, `collectBugReportMetadata(...)`, `collectBugReportDiagnostics(...)`, `bugReportFiles(bundle)`, `writeBugReportArchive(bundle, filePath)` (gọi `writeArchive(filePath, "zip", ...)` từ `@oh-my-pi/pi-utils/ar`), `bugReportArchiveFileName(id)`. Cổng transcript là **hai** cổng độc lập: `includeSession: boolean` bắt buộc ở collector **và** `if (bundle.sessionJsonl !== undefined)` ở danh sách file. | có |
| `packages/coding-agent/src/prompts/diagnostics/bug-summary.md` | tạo | Template Handlebars chứa chỉ dẫn tóm tắt bug, thay cho hai hằng template-literal nội tuyến `BUG_SUMMARY_SYSTEM_PROMPT` và `BUG_SUMMARY_INSTRUCTIONS` của pi (bug-report.ts:316-333). Import bằng `import bugSummaryTemplate from "../prompts/diagnostics/bug-summary.md" with { type: "text" };`. | có |
| `packages/coding-agent/src/slash-commands/builtin-lifecycle.ts` | sửa | Thêm entry `bug-report` vào mảng `BUILTIN_LIFECYCLE_SLASH_COMMANDS`, **ngay sau** lệnh `debug` hiện có (object `{ name: "debug", ... }` tại dòng 545-553). Mang `subcommands: [{ name: "build", ... }, { name: "crashes", ... }]`, `allowArgs: true`, một `handle` cho dispatcher text/ACP và một `handleTui` cho bộ chọn TUI — mô hình `/usage` và `/debug` đều có cả hai. | có |
| `packages/coding-agent/src/slash-commands/helpers/bug-report.ts` | tạo | Adapter mỏng theo hình dạng `usage-report.ts`: phân tích subcommand, resolve session file / settings / model attribution của runtime, hỏi người dùng opt-in transcript, gọi `collectBugReportMetadata` + `collectBugReportDiagnostics` + `bugReportFiles`, ghi archive, và phát đường dẫn qua `runtime.output(...)` (text/ACP) hoặc `runtime.ctx.showStatus(...)` (TUI). | có |
| `packages/coding-agent/src/diagnostics/index.ts` | tạo | Barrel **chỉ** dùng star re-export: `export * from "./bug-report";`, `export * from "./crash-log";`, `export * from "./redact";`. Theo quy ước `packages/utils/src/ar/index.ts`. | có |
| `packages/coding-agent/test/diagnostics/redact.test.ts` | tạo | Ma trận redaction — hàng hoá thật sự theo plan. Bảy case, đúng thứ tự ở bước 9. Case (1) là case nâng đỡ. | **không** — file mới, hư mục `test/diagnostics/` chưa tồn tại; chưa chạy được hôm nay vì native addon chưa build |
| `packages/coding-agent/test/diagnostics/bug-report.test.ts` | tạo | Hợp đồng hình dạng bundle: `bugReportFiles` có nội dung diagnostics (không rỗng một cách vô nghĩa), **không** có `session.jsonl` khi không opt-in và **có** khi opt-in, và `recordCrash`/`takeUnnotifiedCrash` round-trip qua thư mục tạm với trần 5 bản ghi. | **không** — file mới, chưa kiểm chứng |

### Các bước

1. **Đọc nguồn port trước khi viết dòng nào.** `/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/bug-report.ts` (375 LOC — hợp đồng redaction ở dòng 17-60, collector metadata/diagnostics ở 119-215, danh sách file + hàm ghi archive ở 232-263, phần tóm tắt bằng LLM ở 265-375) và `/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/crash-log.ts` (169 LOC, toàn bộ file). **Lưu ý: pi-ref là một checkout RIÊNG — nó không nằm trong ultraworkers, nên các đường dẫn tương đối-repo kiểu `pi-ref/...` của plan không phân giải được từ thư mục gốc repo này.**

2. **Tạo `packages/coding-agent/src/diagnostics/redact.ts`.** Port dòng 17-60 của pi, giữ nguyên tên định danh và hành vi: `const REDACTED = "<redacted>";`, `const SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key|secret|token|password|passwd|credential|authorization|cookie)(?:$|[-_])/i;`, và `function isSensitiveKey(key: string): boolean { return SENSITIVE_KEY.test(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2")); }`. Chính `.replace()` đó là toàn bộ ý nghĩa của work item — nó làm cho `apiKey` khớp. Export `isSensitiveKey`, `redactUrl`, `redactJsonValue`, `REDACTED`. Copy `redactUrl` nguyên văn, kể cả dòng đệ quy trên scheme lồng nhau ở dòng đầu; copy `redactJsonValue` nguyên văn, kể cả early return `value === undefined` (cần vì `JSON.parse(JSON.stringify(undefined))` ném lỗi). Không cần import nào — module tự chứa.

3. **Tạo `packages/coding-agent/src/diagnostics/crash-log.ts`.** Port crash-log.ts của pi với ba rời có chủ ý: (a) path mặc định lấy từ `getCrashLogPath()` sẵn có (`import { getCrashLogPath } from "@oh-my-pi/pi-utils"`), **không** phải `join(agentDir, "crashes.json")` cục bộ của pi; (b) **BỎ** `findExtensionStackMatches` cùng hai path helper của nó — xem mục Đính chính bên dưới để biết vì sao; (c) mọi import `node:fs` là namespace import và dùng sync (`import * as fs from "node:fs"`, rồi `fs.readFileSync` / `fs.writeFileSync` / `fs.mkdirSync` / `fs.rmSync`) theo AGENTS.md. Giữ phần ghi ở dạng **sync** có chủ ý: module này chạy khi tiến trình đang chết, đúng trường hợp AGENTS.md nói rõ là ngoại lệ của quy tắc "tránh sync trong luồng bất đồng bộ".

4. **Tạo `packages/coding-agent/src/prompts/diagnostics/bug-summary.md`** chứa hai hằng prompt của pi dưới dạng các phần template Handlebars, và viết lại hàm sinh tóm tắt để `import bugSummaryTemplate from "../prompts/diagnostics/bug-summary.md" with { type: "text" };` ở top level. **Không** inline text prompt thành template literal như pi làm — AGENTS.md cấm dựng prompt trong code. Thân chỉ dẫn phải giữ bốn mục của pi (What the user was doing / What went wrong / Steps to reproduce / Relevant details) và ràng buộc kết: không đưa nội dung file, secret hay credential từ transcript vào; chỉ gọi tên file theo đường dẫn.

5. **Tạo `packages/coding-agent/src/diagnostics/bug-report.ts`.** Port `collectBugReportMetadata` và `collectBugReportDiagnostics` với input đúng hình dạng omp (kiểu model/provider/settings của omp đến từ `@oh-my-pi/pi-catalog` và `@oh-my-pi/pi-ai`, không phải `@earendil-works/*` của pi). Đổi tên `BUG_REPORT_CUSTOM_ENTRY_TYPE` sang namespace omp `"omp.bug-report"`. Với archive: **không** port `writeZipArchive` tự chế của pi — gọi hàm trung tâm `writeArchive(filePath, "zip", Object.entries(...))` từ `@oh-my-pi/pi-utils/ar`, hàm này đã cài sẵn zip qua `encodeZip`. **Không** import `adm-zip` hay `tar`: chúng chỉ xuất hiện trong node_modules như transitive dep của `onnxruntime-node` và `fastembed`, và không package workspace nào khai báo chúng.

6. **Làm cho opt-in transcript mang tính cấu trúc, không phải lời khuyên.** Hai cổng độc lập, cả hai đều bắt buộc: `collectBugReportMetadata` nhận `includeSession: boolean` bắt buộc và chỉ spread `cwd` vào session object dưới `...(includeSession ? { cwd: options.cwd } : {})`; `bugReportFiles` chỉ push `session.jsonl` dưới `if (bundle.sessionJsonl !== undefined)`. Boolean `metadata.session.included` là cổng thứ **ba**, chỉ để tham báo — không bao giờ coi nó là cổng. Plan nói rõ: transcript là dữ liệu người dùng, và redaction là phòng thủ nhiều lớp chứ không phải giấy phép.

7. **Tạo `packages/coding-agent/src/slash-commands/helpers/bug-report.ts`** và đăng ký lệnh trong `builtin-lifecycle.ts` ngay cạnh `/debug` (object `{ name: "debug", ... }` tại dòng 545-553). Cung cấp cả `handle` (text/ACP, dùng `runtime.output`) và `handleTui` (dùng `runtime.ctx`), y hệt cách `/usage` làm tại `builtin-session.ts:338-355`. Lệnh phải hỏi opt-in transcript một cách tường minh và phải trình bày việc giao archive như một lựa chọn (ghi cục bộ vs. chuyển tiếp) chứ không tải lên mặc định. Mọi chuỗi hiển thị cho người dùng đi qua `sanitizeText` / `shortenPath` trước khi hiện, và không chỗ nào ở đây được dùng `console.*` — TUI đang sống.

8. **Nối hàm ghi crash vào bề mặt crash thật của omp:** `@oh-my-pi/pi-utils/postmortem` — `register(id, callback)` (dòng 661) cho đường cleanup/exit và `interceptUnhandledRejections(interceptor)` (dòng 453) cho các rejection lẽ ra giết phiên. **Không** thêm `process.on("uncaughtException")` thô: omp đã dồn SIGINT/SIGTERM/SIGHUP/uncaughtException qua postmortem, thêm handler thứ hai sẽ tranh nhau.

9. **Viết `packages/coding-agent/test/diagnostics/redact.test.ts`** với đúng bảy case sau. (1) `redactJsonValue({ apiKey: "sk-live-XYZ" })` có giá trị bị thay — đây là case **chứng minh** phép chuẩn hoá camelCase→snake_case có mặt; một bản port chỉ resolve mà rơi `.replace()` sẽ hỏng nó trong im lặng. (2) Cùng object với key `api_key` và `API-KEY` cũng bị redact. (3) `redactUrl` cởi userinfo khỏi URL **scheme lồng nhau** dạng `scheme://user:pass@host?token=...`, chứng minh sự đệ quy. (4) Trong **một** test, một query param trông như secret bị viết lại thành `<redacted>` **và** một param vô hại được giữ nguyên byte — assert cả hai vế cùng lúc, vì redact quá và redact thiếu là hai kiểu hỏng ngược nhau và test một chiều chỉ bắt được một trong hai. (5) Một object hình dạng config có field `authorization` lồng được quét sạch. (6) Bundle **CÓ** nội dung diagnostics — assert một field không-phải-secret nào đó còn sống; test chỉ assert secret vắng mặt thì pass tầm thường trên bundle rỗng và chứng minh được điều gì. (7) Không có opt-in thì `bugReportFiles(bundle)` không chứa entry `session.jsonl`.

10. **Build native addon, rồi chạy toàn bộ cổng:** `bun --cwd=packages/natives run build`, sau đó `bun run check:ts`, sau đó `bun test packages/coding-agent/test/diagnostics/`. Hôm nay `bun test` **không chạy được** trong checkout này — nó báo `0 pass, 1 fail` với "Failed to load pi_natives native addon for darwin-arm64". Hãy coi đó là blocker môi trường có sẵn, **không** phải suite pass và **không** phải cổng đỏ.

### Hình dạng code

```typescript
// packages/coding-agent/src/diagnostics/redact.ts — self-contained, no imports.
// Verbatim behaviour from pi-ref bug-report.ts:17-60. The `.replace()` in
// isSensitiveKey is the load-bearing line: without it `apiKey` does NOT match
// SENSITIVE_KEY, and the single most common spelling in omp's own config
// sails through unredacted.
const REDACTED = "<redacted>";
const SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key|secret|token|password|passwd|credential|authorization|cookie)(?:$|[-_])/i;

export function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY.test(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

/** Strip credentials and secret-looking query parameters from a URL. */
export function redactUrl(value: string): string {
	// Nested scheme (`scheme://user:pass@host?token=…`): recurse on the inner URL.
	const nested = /^([a-z][a-z0-9+.-]*:)([a-z][a-z0-9+.-]*:\/\/.*)$/i.exec(value);
	if (nested) return `${nested[1]}${redactUrl(nested[2])}`;
	try {
		const url = new URL(value);
		let changed = false;
		if (url.username || url.password) {
			url.username = "";
			url.password = "";
			changed = true;
		}
		for (const key of url.searchParams.keys()) {
			if (isSensitiveKey(key)) {
				url.searchParams.set(key, REDACTED);
				changed = true;
			}
		}
		return changed ? url.toString() : value;
	} catch {
		return value;
	}
}

/** Copy a JSON value while removing values that may contain credentials. */
export function redactJsonValue(value: unknown): unknown {
	if (value === undefined) return undefined; // JSON.parse(JSON.stringify(undefined)) throws
	return JSON.parse(
		JSON.stringify(value, (key, child: unknown) => {
			// The replacer also fires for the ROOT with key ""; SENSITIVE_KEY cannot
			// match the empty string, so the root is never swallowed.
			if (child !== null && child !== undefined && isSensitiveKey(key)) return REDACTED;
			return typeof child === "string" ? redactUrl(child) : child;
		}),
	);
}

// packages/coding-agent/src/diagnostics/crash-log.ts — sync fs on purpose: this
// runs while the process is dying. `getCrashLogPath` already exists and has zero
// consumers, so no `join()` path derivation is written here.
import * as fs from "node:fs";
import * as path from "node:path";
import { getCrashLogPath, VERSION } from "@oh-my-pi/pi-utils";

export interface CrashRecord {
	timestamp: string;
	version: string;
	kind: "uncaught_exception" | "fatal_error";
	message: string;
	stack: string | null;
	sessionFile: string | null;
	cwd: string;
	notified?: boolean;
}

const MAX_CRASH_RECORDS = 5;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function readCrashLog(filePath: string = getCrashLogPath()): CrashRecord[] { /* … */ }
export function recordCrash(
	crash: { kind: CrashRecord["kind"]; error: unknown; sessionFile?: string; cwd: string },
	filePath: string = getCrashLogPath(),
): CrashRecord | undefined { /* best-effort; never throws */ }
export function takeUnnotifiedCrash(
	filePath: string = getCrashLogPath(),
	now: number = Date.now(),
): CrashRecord | undefined { /* newest un-notified record within MAX_AGE */ }
export function clearCrashLog(filePath: string = getCrashLogPath()): void { /* … */ }

// packages/coding-agent/src/diagnostics/bug-report.ts — the opt-in gate is
// structural: BOTH the collector and the file list must agree, so neither alone
// is a single point of leak.
export interface BugReportBundle {
	metadata: BugReportMetadata;
	diagnostics: BugReportDiagnostics;
	sessionJsonl?: string;   // present ONLY under explicit opt-in
	summary?: string;
}

export function bugReportFiles(bundle: BugReportBundle): BugReportFile[] {
	const files: BugReportFile[] = [
		{ name: "report.json", contentType: "application/json", data: `${JSON.stringify(bundle.metadata, null, 2)}\n` },
		{ name: "diagnostics.json", contentType: "application/json", data: `${JSON.stringify(bundle.diagnostics, null, 2)}\n` },
	];
	if (bundle.sessionJsonl !== undefined) {
		files.push({ name: "session.jsonl", contentType: "application/x-ndjson", data: bundle.sessionJsonl });
	}
	if (bundle.summary !== undefined) {
		files.push({ name: "summary.md", contentType: "text/markdown", data: bundle.summary.endsWith("\n") ? bundle.summary : `${bundle.summary}\n` });
	}
	return files;
}

export async function writeBugReportArchive(bundle: BugReportBundle, filePath: string): Promise<void> {
	// NOT pi's hand-rolled utils/zip.ts — the central archive writer already
	// implements zip. Do not add adm-zip/tar; both are transitive-only.
	await writeArchive(filePath, "zip", bugReportFiles(bundle).map(f => [f.name, f.data] as const));
}

// packages/coding-agent/src/slash-commands/builtin-lifecycle.ts — inserted
// directly after the existing `debug` entry (lines 545-553). usage-report.ts is a
// HELPER, not a registry; commands are declared here and aggregated by
// builtin-registry.ts:39-47.
{
	name: "bug-report",
	description: "Build a redacted diagnostics archive",
	allowArgs: true,
	subcommands: [
		{ name: "build", description: "Build the archive" },
		{ name: "crashes", description: "List recent recorded crashes" },
	],
	handle: async (command, runtime) => { /* … runtime.output(…) */ },
	handleTui: async (command, runtime) => { /* … runtime.ctx.showStatus(…) */ },
},
```

### Hợp đồng test

Hợp đồng quan sát được là: một giá trị mà **tên key** mang tính thông tin đăng nhập không bao giờ sống sót qua `redactJsonValue`, bất kể key viết theo cách nào; và một giá trị có tên key thường thì không bao giờ bị đụng tới. Cả hai chiều đều được assert.

- **(1)** `apiKey` là case bắt được bản port chỉ-resolve — bỏ `.replace()` camelCase→snake_case thì **riêng** case này đỏ, và đỏ trong im lặng, vì `SENSITIVE_KEY` cần một biên `^` hoặc `-`/`_` trước từ khoá mà `apiKey` không có.
- **(2)** chứng minh các biến thể có dấu phân cách vẫn khớp, để một sửa đổi sau này siết anchor không âm thầm thu hẹp quy tắc.
- **(3)** chứng minh `redactUrl` đệ quy vào scheme lồng nhau thay vì rơi xuống `new URL` rồi trả về nguyên đầu vào — đó chính là điều xảy ra nếu mất dòng đầu tiên của hàm.
- **(4)** assert **cả hai nửa trong một test**: param secret thành `<redacted>` **và** param vô hại giống hệt byte — vì redact quá và redact thiếu là hai chế độ hỏng ngược nhau, và một assert một chiều chỉ bắt được một trong hai.
- **(5)** chứng minh phép quét là đệ quy chứ không chỉ ở tầng ngoài, nên object hình dạng config có `authorization` lồng cũng được phủ.
- **(6)** assert bundle **CHỨA** một field chẩn đoán không phải-secret đã biết, chứ không chỉ assert secret vắng mặt: assert kiểu "chỉ vắng mặt" pass tầm thường trên bundle rỗng và sẽ chứng nhận một hàm redaction xoá sạch mọi thứ.
- **(7)** assert sự vắng mặt bắt buộc của `session.jsonl` khỏi `bugReportFiles` khi không opt-in — hợp đồng rằng transcript, là dữ liệu người dùng, không bao giờ được đóng gói mặc định.

Người tiêu dùng vỡ nếu hồi quy là người chạy `/bug-report` và đính kèm archive vào một issue công khai. Một false negative ở đây trao API key của họ cho mọi người đọc issue; một false positive chỉ ẩn đi một field vô hại. Vì vậy thiên lệch phải nghiêng hẳn về redact quá — và test phải viết sao cho hồi quy là to — đó chính là lý do case (6) tồn tại.

**File test:** `packages/coding-agent/test/diagnostics/redact.test.ts`, `packages/coding-agent/test/diagnostics/bug-report.test.ts` (cả hai đều mới, chưa kiểm chứng — xem bảng file ở trên).

### Xác minh

```bash
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
bun run check:ts
bun test packages/coding-agent/test/diagnostics/
git grep -n 'SENSITIVE_KEY' -- packages/coding-agent/src/diagnostics/   # the rule exists and is the one you wrote
git grep -n 'console\.' -- packages/coding-agent/src/diagnostics/ packages/coding-agent/src/slash-commands/helpers/bug-report.ts   # must return nothing — the TUI is alive while these run
```

### Cổng hoàn thành

W17 xong khi **tất cả** các điều dưới đây đều đúng, và cổng này **có thể đỏ** — mỗi dòng đỏ nếu phần công việc tương ứng bị thiếu:

1. `bun test packages/coding-agent/test/diagnostics/redact.test.ts` pass đủ bảy case, và bảy case đó **là** bảy case ở bước 9 — không phải một tập con. Bằng chứng nâng đỡ: tạm xoá `.replace(/([a-z0-9])([A-Z])/g, "$1_$2")` khỏi `isSensitiveKey`, xác nhận case (1) — **và chỉ** case (1) — đỏ, rồi khôi phục lại. **Nếu không có gì đỏ, case (1) không test điều nó tuyên bố và phải viết lại trước khi work item được coi là xong.** Đây là phép kiểm duy nhất phân biệt một bản port thật với một bản chỉ-resolve.
2. `grep` xác nhận phép chuẩn hoá camelCase có mặt trong file được ship, chứ không chỉ nằm trong comment.
3. `bugReportFiles` không trả về entry `session.jsonl` nào cho bundle dựng không có opt-in, và trả về một entry **khi** có opt-in. Cả hai nửa, cùng một lần chạy.
4. Test bundle assert một field không-phải-secret đã biết **CÒN** trong `diagnostics.json`. Nếu các assert duy nhất đều có dạng "secret vắng mặt", test sẽ pass trên bundle rỗng và chứng minh được điều gì — đó là **tiêu chí loại**, không phải ghi chú về văn phong.
5. `bun run check:ts` xanh (đã xanh tại HEAD `ecd516f` trước mọi thay đổi, nên bất cứ đỏ nào là do bạn).
6. Archive do hàm trung tâm `writeArchive(..., "zip", ...)` ghi; `git grep -n 'adm-zip\|from "tar"' -- packages/coding-agent/src/` trả về rỗng.
7. Không `console.*` trong code mới — xác minh bằng grep — và mọi chuỗi hiển thị cho người dùng đi qua `sanitizeText`/`shortenPath` trước khi hiện.

**Giới hạn nói thẳng:** `bun test` **KHÔNG** chạy được trong checkout này hôm nay. Nó báo `0 pass, 1 fail` với "Failed to load pi_natives native addon for darwin-arm64". Cho tới khi `bun --cwd=packages/natives run build` đã chạy, phần chạy được của cổng này chỉ là `bun run check:ts` một mình, và kỹ sư phải build addon trước khi tuyên bố phần test đã thoả. **Đừng ghi work item này là xong chỉ dựa trên type-check.**

Cổng có thể thực sự đỏ: có — cả bảy điều kiện đều là phép kiểm có thể đỏ khi phần việc tương ứng vắng mặt, ngoại trừ bảy điều kiện đó vẫn chưa chạy được cho tới khi native addon được build, nên trước lúc build cổng chỉ thật sự có một nửa (`check:ts`).

### Phụ thuộc

- `depends_on`: không.
- `blocks`: không.

Ghi chú từ mô tả wave: W17 bị soft-block bởi **W9** (phân bổ chi phí theo từng model) — một báo cáo nói "phiên này tốn $X trên các model Y và Z" đáng giá hơn một báo cáo không quy được chi phí — nhưng W9 là **đầu vào mềm, không phải cổng**, và W17 không chặn work item nào.

### Cách sai dễ nhất

**Ship phép chuẩn hoá camelCase→snake_case như thứ gì đó tuỳ chọn hoặc "dọn dẹp", thay vì là thứ nâng đỡ.** Code vẫn qua review và vẫn qua mọi test trừ case (1), và hỏng trong im lặng vì `apiKey` chỉ đơn giản là không khớp với một regex mà không ai đọc lại.

Ba lối gần kế, theo thứ tự:
- Coi `metadata.session.included` là cổng opt-in thay vì hai cổng cấu trúc trong `bugReportFiles` và collector — nó trông như một cái cờ, nên một sửa đổi sau chỉ cần set nó mà không gate payload là rò transcript trong khi mọi test vẫn xanh.
- Tưởng các đường dẫn `pi-ref/...` của plan phân giải được từ gốc ultraworkers — **không**, pi-ref là checkout riêng ở `/Users/tranquangdang21/Projects/pi-ref/`. Kỹ sư không tìm thấy file sẽ dựng lại hợp đồng từ văn xuôi và nhiều khả năng rơi mất phép chuẩn hoá mà không hề biết nó từng tồn tại.
- Mặc định transcript **BẬT** vì bundle report của `/debug` hiện có đã ship `session.jsonl` vô điều kiện — đó là hành vi công cụ cục bộ có sẵn, không phải tiền lệ cho một bundle vốn tồn tại để rời khỏi máy.

### Cần người quyết

**Chặn bắt đầu (quyết trước khi viết file):**
- **Crash ring có dùng `getCrashLogPath()` sẵn có (`~/.omp/agent/omp-crash.log`) không**, dù nó sẽ chứa một mảng JSON dưới đuôi `.log`? pi ghi JSON ra `crashes.json`. Plan nói rõ dùng helper sẵn có, nên mặc định ở đây theo plan — nhưng nếu một người thích tên `.json` khớp thì đó là một dòng thêm vào `packages/utils/src/dirs.ts` cộng một ghi chú rằng helper không còn zero-consumer nữa.

**Không chặn bắt đầu, nhưng cần một quyết định:**
- `findExtensionStackMatches` của pi (crash-log.ts:47-113, ~65 dòng) map stack trace về extension gây crash. Mô hình extension của omp không phải của pi: nguồn pi phụ thuộc `Extension.sourceInfo.{origin,source,baseDir,scope}`, còn record extension của omp có hình dạng khác. Nên để W17 hay hoãn? Spec này **hoãn** — đó là tiện nghi chẩn đoán, không thuộc hợp đồng redaction, và port mù là cách commit nhầm hình dạng.
- Giao archive: pi cho chọn upload vs. zip cục bộ. omp không có upload target issue-tracker nào mà work item này thiết lập. W17 nên chỉ ship đường archive cục bộ tường minh, còn upload để work item sau, hay đã có sẵn target để gọi vào? Spec **giả định chỉ archive cục bộ** — điều này thoả yêu cầu "lựa chọn tường minh" của plan mà không bịa ra endpoint.
- Có nên refactor `packages/coding-agent/src/mcp/errors.ts` (`SECRET_KEY` tại dòng 45, `sanitizeData` tại dòng 100) để ủng quyền cho `diagnostics/redact.ts` mới không? Đó là cùng một hợp đồng lập ra hai lần, mà AGENTS.md gọi là bug — nhưng nó là module-private, phép so khớp substring của nó cố ý lỏng hơn, và nó nuôi output lỗi MCP trực tiếp. **Khuyến nghị: KHÔNG làm trong W17** (W17 chỉ thêm, còn làm vậy sẽ đổi output của một đường chạy thật); ghi lại làm việc theo sau.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "Tham chiếu: `pi-ref/packages/coding-agent/src/core/bug-report.ts` (375 LOC), `pi-ref/packages/coding-agent/src/core/crash-log.ts` (169 LOC)." (plan:2012-2013) | STALE PATH, đúng nội dung | File có thật và số LOC chính xác tuyệt đối (375 và 169). Nhưng `pi-ref` **không phải** thư mục trong repo ultraworkers — `ls -d pi-ref` fail. Đó là checkout RIÊNG tại `/Users/tranquangdang21/Projects/pi-ref/` (đã xác nhận có mặt, 13 KB). Kỹ sư theo đường dẫn tương đối-repo của plan sẽ kết luận tài liệu tham chiếu không tồn tại và dựng lại hợp đồng từ văn xuôi — chính xác là cách phép chuẩn hoá camelCase bị rơi. |
| Redaction contract bắt được bởi phép chuẩn hoá camelCase→snake_case: `SENSITIVE_KEY` chỉ khớp `apiKey` **sau khi** `key.replace(/([a-z0-9])([A-Z])/g, "$1_$2")`, và một bản port chỉ-resolve hỏng nó trong im lặng. (plan:1981-1984, 2016-2019, 2030-2033) | CONFIRMED — claim quan trọng nhất của plan đứng vững | Đã kiểm trong **nguồn** pi, không chỉ văn xuôi. `isSensitiveKey` của pi đúng là `SENSITIVE_KEY.test(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2"))` và `SENSITIVE_KEY` đúng là regex plan trích. Lập luận đúng: regex cần biên `^` hoặc `-`/`_` trước từ khoá, `apiKey` trần không có cái nào. Case (1) của ma trận test là test đúng để bảo vệ điều này. Ngoài ra phép chuẩn hoá này **không tồn tại ở bất kỳ đâu trong omp hiện tại**: grep các pattern camelCase→snake trong `packages/coding-agent/src` và `packages/utils/src` chỉ ra kết quả không liên quan (`frontmatter.ts` làm **chiều ngược lại**, kebab→camel). |
| W17 phải TẠO `bug-report.ts` để "dựng bundle + zip", và sẵn không có zip. (plan:2007, 1988-1989) | MATERIALLY OVERSTATED | Phần dựng bundle **đã tồn tại** và dài 380 dòng. `packages/coding-agent/src/debug/report-bundle.ts` export `createReportBundle(options)` (dòng 85-90), ghi `.tar.gz` qua `writeArchive` chứa system.json, env.json (đã đi qua `sanitizeEnv`), config.json, logs.txt, raw-sse.txt, session.jsonl, cây artifacts, và profile CPU/memory/work tuỳ chọn. Nó có ba caller sống trong `debug/index.ts` và ba test. Nên file của plan không phải "tạo bundle" mà là "dùng lại bundle, thêm redaction, thêm cổng opt-in, thêm crash ring". Riêng zip không cần dependency mới: `writeArchive` tại `packages/utils/src/ar/write.ts:49` đã nhận `"zip"` và cài bằng `encodeZip` trong `packages/utils/src/ar/zip.ts`. |
| "Đăng ký slash-command trong registry hiện có cạnh `packages/coding-agent/src/slash-commands/helpers/usage-report.ts`." (plan:2009) | WRONG ANCHOR | `helpers/usage-report.ts` là helper dựng chuỗi text — export duy nhất là `buildUsageReportText(runtime: SlashCommandRuntime)` tại dòng 167. Nó không phải registry và không có gì được đăng ký "cạnh" nó. Slash command được khai báo dưới dạng object trong các module `builtin-*.ts` và gộp lại bởi spread `BUILTIN_SLASH_COMMAND_REGISTRY` tại `builtin-registry.ts` dòng 39-47. Nhà đúng cho một lệnh chẩn đoán là `builtin-lifecycle.ts`, ngay sau lệnh `debug` hiện có (object `{ name: "debug", ... }` tại dòng 545-553, vốn đã mang `icon: "bug"`). |
| `getCrashLogPath` tại `packages/utils/src/dirs.ts:955` phân giải `~/.omp/agent/omp-crash.log` và có zero consumer, nên W17 nên tạo module mới thay vì sửa module có sẵn. (plan:1993-2006) | CONFIRMED IN FULL | Mọi thành phần đều đã kiểm. `getCrashLogPath` ở dòng 955 với thân `return dirs.agentSubdir(agentDir, "omp-crash.log", "state")`; `git grep -n getCrashLogPath -- packages/` trả về đúng một dòng, chính là định nghĩa; `git grep -rln 'crash-log\|crashLog' -- packages/` trả về đúng một file, `packages/natives/CHANGELOG.md`; và `packages/coding-agent/src/core/crash-log.ts` không tồn tại. Kết luận — tạo `diagnostics/crash-log.ts` thay vì sửa — là đúng. |
| `crash-log.ts` của pi là mô hình để port (169 LOC). | TRUE BUT OVER-SIZED FOR omp | Nguồn port có thật (169 LOC, đã đọc hết), nhưng ~65 dòng là `findExtensionStackMatches` cùng hai path helper của nó (`normalizeStackPath`, `stackContainsPath`), phụ thuộc vào hình dạng `Extension.sourceInfo.{origin,source,baseDir,scope}` của pi. Record extension của omp có hình dạng khác, nên hàm đó không thể port mù. Lõi thật sự mang được là ~100 dòng còn lại: `CrashRecord`, trần 5 bản ghi, `MAX_AGE` 7 ngày, `readCrashLog`, `recordCrash`, `takeUnnotifiedCrash`, `clearCrashLog`. Spec này hoãn extension matcher — xem mục Cần người quyết. |
| Bundle nên được zip, và lựa chọn giao là upload vs. zip cục bộ. (plan:1988-1990, 2010-2011) | CORRECT, nhưng plan hàm ý thiếu một khả năng đã có | Zip có sẵn ở trung tâm — `writeArchive(destPath, "zip", entries)` trong `@oh-my-pi/pi-utils/ar`. **Không** thêm dependency: `adm-zip` và `tar` chỉ xuất hiện trong node_modules như transitive dep (`onnxruntime-node` kéo adm-zip; `fastembed` kéo tar) và **không** package.json workspace nào khai báo chúng. Cũng đừng port `packages/coding-agent/src/utils/zip.ts` tự chế của pi — nó dựng ZIP classic bằng `deflateRawSync` bằng tay, trùng lặp với một helper trung tâm mà AGENTS.md cấm. |
| Phần tóm tắt hội thoại do LLM viết là một phần của bundle. (plan:1988-1989, 2012-2013) | TRUE, nhưng bản port KHÔNG được nguyên văn | pi giữ prompt tóm tắt dưới dạng hai hằng template-literal nội tuyến, `BUG_SUMMARY_SYSTEM_PROMPT` và `BUG_SUMMARY_INSTRUCTIONS` (bug-report.ts:316-333). AGENTS.md cấm dựng prompt trong code — prompt phải nằm trong file `.md` tĩnh với Handlebars cho phần động, import `with { type: "text" }`. Nên prompt này phải được tách ra thành `packages/coding-agent/src/prompts/diagnostics/bug-summary.md` trong lúc port. Cấu trúc bốn mục của nó (What the user was doing / What went wrong / Steps to reproduce / Relevant details) và ràng buộc kết ('Do not include file contents, secrets, or credentials from the transcript; refer to files by path only') nên được giữ nguyên văn trong file `.md`. Quy ước `with { type: "text" }` đã xác nhận tại `packages/coding-agent/src/advisor/advise-tool.ts:13` và `auto-thinking/classifier.ts:18`. |
| Plan không nói crash writer gắn ở đâu, và hàm ý một process handler thô. (plan:2004-2006, im lặng về wiring) | OMISSION — một rủi ro wiring thật | omp đã dồn SIGINT/SIGTERM/SIGHUP/uncaughtException qua `@oh-my-pi/pi-utils/postmortem`. Thêm `process.on("uncaughtException")` thô sẽ tranh với teardown sẵn có và là rủi ro hồi quy. Điểm gắn đúng là `postmortem.register(id, callback)` (dòng 661) cho đường cleanup/exit và `interceptUnhandledRejections(interceptor)` (dòng 453) cho các rejection lẽ ra giết phiên. Lưu ý thêm: `packages/coding-agent/src/session/session-teardown.ts` được nhắc trong comment ở `modes/interactive-mode.ts:1600` và `extensibility/extensions/managed-timers.ts:7` nhưng **không tồn tại** tại HEAD — đừng đi tìm nó. `git grep -rn 'uncaughtException' -- packages/coding-agent/src packages/utils/src` không trả về chỗ đăng ký `process.on("uncaughtException")` nào. |
| W17 đưa redaction contract vào như thể không có gì tương đương trong omp. (plan:1978-1980) | INCOMPLETE — có tiền lệ và phải gọi tên | omp đã ship sẵn một redactor theo tên key: `SECRET_KEY` khai báo tại `packages/coding-agent/src/mcp/errors.ts:45` (regex literal ở dòng 46) và `sanitizeData` đệ quy tại `:100` thay giá trị dưới key khớp bằng `[redacted]` (phép thay ở `:117`), có giới hạn độ sâu/số entry và phát hiện vòng lặp. Nó là module-private — `grep -n '^export'` trên file đó cho 8 export, không cái nào là `sanitizeData` hay `SECRET_KEY`. Nó cố ý **LỎNG** hơn quy tắc của plan (so khớp substring, không chuẩn hoá camelCase, và comment của nó nói các tên ghép như `clientSecret` và `signingSecret` phải được xếp là secret). Vậy W17 là port-và-siết, không phải hiện thực lần đầu, và module mới phải là nơi mang quy tắc chặt hơn, có anchor biên. Theo AGENTS.md, hai hiện thực là thứ cần về sau dọn dẹp, nhưng bản của mcp nuôi output lỗi sống, nên refactor là việc theo sau chứ không phải W17. `git grep -rn SENSITIVE_KEY -- packages/` → **không** hit, xác nhận quy tắc đúng như plan chưa tồn tại. |
| Môi trường: git HEAD là `5873776`. (task text) | STALE | HEAD là `ecd516f` ("feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers"), trên nhánh `milestone-1`, chỉ có `.lavish-wip/` chưa track. **Mọi anchor trong spec này được kiểm chứng trên `ecd516f`.** |
| Môi trường: `bun test` bị chặn bởi native addon thiếu; `bun run check:ts` chạy được. (task text) | CONFIRMED | Cả hai đều đã kiểm. `bun run check:ts` hoàn tất xanh trên cả 15 package tại HEAD khi chưa áp dụng thay đổi W17 nào. `bun test packages/coding-agent/test/memory-redaction.test.ts` báo `0 pass, 1 fail, 1 error` với "Failed to load pi_natives native addon for darwin-arm64". Cách sửa là `bun --cwd=packages/natives run build`, sau đó cổng test mới chạy được. |


---


## Rủi ro và cách sai dễ nhất

Mười bảy work item có mười bảy `risk` riêng. Đọc chúng cạnh nhau thì chúng rút lại còn **bốn kiểu chết**, và bốn kiểu này không phải bốn lỗi ở bốn chỗ khác nhau — chúng là bốn cách milestone này đi sai mà mọi cổng nghiệm thu vẫn báo xanh.

| Work item | Rủi ro | Cách giảm |
| --- | --- | --- |
| W2, W4, W8, W9, W11, W12, W13, W14, W15, W16, W17 | **Cổng xanh giả — `bun test` chưa chạy được.** Ở HEAD `ecd516f`, `bun test` trả `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` tại `packages/natives/native/index.js:23:24`. Tới lúc addon được build, mọi cổng hành vi của các item này là **trong** (vacuous): W13 nói thẳng "Cho tới khi chạy `bun run build:native`, `bun test` báo đỏ bất kể code đúng hay sai, nên đây là một gate TRONG"; W16, W11, W12, W8, W9, W14, W15, W17 đều ghi cùng một điều kiện. | Build addon **trước** khi nhận việc: `bun --cwd=packages/natives run build` (hoặc `bun run build:native`). Tới lúc đó mọi item kể trên phải được coi là **chưa xác minh**, không phải là xanh. Trong lúc chờ, cổng thật duy nhất là `bun run check:ts` — đã PASS ở HEAD, không cần addon. Không dùng `tsc`. |
| W1, W5, W11, W16, W17 | **Cổng xanh mà không bảo vệ đúng thứ** — code chạy, im lặng, không throw. W5: viết thành runtime `.test.ts` với grep thì "passes forever while the wire types drift silent". W11: nếu `declare strict: boolean` thành field runtime thật, field initializer chạy trước thân constructor nên guard `key in this` thành `true`, guard BỎ QUA proxy và `adapter.strict` đọc ra `false` dù definition có `strict: true` — "silent breakage, không throw, không cảnh báo", và phân kỳ theo provider. W16: nới group cho tới khi xanh. W17: giao normalize `camelCase`→`snake_case` làm phần "cleanup" tuỳ chọn. W1: cast `as HookAPI` tại `hooks/loader.ts:128` đủ lỏng để đổi `hooks/types.ts` **không** kèm impl vẫn type-check sạch. | Mỗi cổng phải có ít nhất một assertion đọc **giá trị cụ thể** — run-order array, call count, wire payload — chứ không phải `expect(true)` hay một grep. Với W1, sửa `hooks/types.ts` và `hooks/loader.ts` trong cùng một commit, vì type-check sẽ không bắt được khi thiếu một trong hai. Với W11, khoá cả hai chiều của hợp đồng trên cùng output của bridge. Với W16, khi một group đỏ, **không** nới group để làm nó xanh. |
| W8, W11, W12, W13, W14, W15, W17 | **Chọn nhầm bản tham chiếu** — hoặc dựng thêm một hệ thống thứ hai cạnh cái đang chạy, hoặc port từ một nguồn không tồn tại. W8: "Creating a SECOND system instead of gating the existing one" — âm thầm nhất, vì file mới default `"off"` không tốn tiền, test riêng của nó xanh, và accounting không thấy. W13: viết một writer backpressure thứ hai, yếu hơn, cạnh `RpcOutputWriter` đã mạnh hơn và đã có test. W11: dựng `constrained-sampling.ts` cạnh `normalize.ts`. W12: phải nói rõ `concurrency = \"exclusive\"` đã serialise gì — nó chỉ trong MỘT batch của MỘT agent (`lastExclusive` function-local tại `packages/agent/src/agent-loop.ts:3511`, trong `executeToolCalls` bắt đầu ở `:3024`), không chia sẻ giữa các agent hay session; `ast_edit` không khai báo concurrency nên không được bảo vệ gì. W14/W15/W17: kế hoạch và bản tham chiếu mô tả một hình dạng mà cây này không có — W8 nói thẳng "`pi-ref/` does not exist in this checkout ... all six constants ... are UNVERIFIABLE from this repo"; W15 nói transcript chính KHÔNG dùng `ScrollView` như kế hoạch giả định; W17 nói `findExtensionStackMatches` phụ thuộc `Extension.sourceInfo.{origin,source,baseDir,scope}` mà record của omp khác hình dạng. | Mỗi item phải trả lời bằng chứng: "cái đang chạy là gì, và tôi đang sửa nó chứ không thêm bên cạnh". Với W12, viết vào PR một câu giải thích vì sao cần cả hai cơ chế. Với W8/W14/W15/W17, số và hình dạng phải **suy ra từ cây này hoặc từ nguồn công bố**, không từ trí nhớ về `pi-ref`; nếu không suy ra được thì để field undefined và ghi lại, đừng đoán. |
| W6, W8, W10, W12, W13, W17 | **Đổi hành vi người dùng thấy, trên đường production đang chạy, khi quyết định chưa được ký.** W6: `rm -rf /tmp/build` khớp regex recursive-delete neo `/`, nên user dựa vào allow rule để auto-run cleanup trong yolo mất luôn, không có escape hatch ở tầng settings — và thêm nữa là **half-applying the pair**: check ở `bash.ts:515` bị guard `!compoundSegments` nên không reachable với compound command, dòng `bash.ts:545` mới là nhánh payload thật đi tới; sửa 516 một mình là không làm gì. W8: `"off"` làm mặc định là một BREAK trên tính năng đang chạy và miễn phí. W10: "telemetry.ts sits on every agent path, so a regression here is a production incident and not a red test" — rủi ro hồi quy trên mỗi LOC cao nhất milestone. W12: queue chặn interleaving và byte-tearing nhưng KHÔNG chặn lost update, vì lần đọc pre-image tại `packages/coding-agent/src/edit/index.ts:711` nằm ngoài lock; và bọc `writeFileWithFallback` (:402) có thể deadlock nếu extension handler gọi lại vào chính queue đó. W13: chạm ba đường stdout đang chạy. W17: transcript là opt-in (đúng), nhưng redaction phải load-bearing — không thì bí mật lọt vào một file mà người dùng được dặn là an toàn để gửi đi. | Không item nào trong nhóm này được coi là xong khi test xanh mà quyết định sản phẩm chưa có. W6 cần sign-off của product trước khi sửa dòng nào. W8 cần chốt cửa sổ deprecation trước release. W10 cần commit tách riêng: `git diff --stat` trên `packages/ai/test/otel.test.ts` phải rỗng — đó là bằng chứng duy nhất rằng không có exported signature nào đổi. W12 phải nói rõ trong PR là chỉ sửa interleaving. W13 chỉ migrate những call site đã chốt ở bảng quyết định, không tự mở rộng. W17 khoá normalize như một assertion bắt buộc, không phải tuỳ chọn. |

**Vì sao bốn dòng này và không phải mười bảy.** Dòng 1 và dòng 2 là cùng một triệu chứng — bạn tin cổng, cổng im — nhưng khác nguồn: một cái do môi trường, một cái do bản thân cách viết test. Dòng 3 và dòng 4 là cùng một triệu chứng — bạn viết code đúng hình dạng nhưng sai ý. Ba đường hỏng nặng nhất theo thứ tự: **dòng 1** vì nó làm mất toàn bộ giá trị nghiệm thu của mười một item cùng lúc và không tự lộ ra; **dòng 4** vì hậu quả tới người dùng và tới production; **dòng 3** vì nó âm thầm để lại nợ kỹ thuật mà không ai phát hiện cho tới milestone sau. Bảy mục `risk` còn lại của các item là biến thể cục bộ của bốn dòng này, không phải đường hỏng thứ năm.

---

## Bảng quyết định cần bạn chốt

`questions.json` có **64 câu hỏi**. Hai câu của W16 về `move()` và về `readSlices` trên path không tồn tại là **cùng một quyết định** (hợp đồng nào là đúng, hay group bị over-specified) nên gộp thành một dòng và ghi rõ cả hai divergence — tổng còn **63 dòng**. Nhóm A là những câu không có câu trả lời thì **không bắt đầu được** work item, hoặc bắt đầu rồi thì viết ra sai ngay dòng code đầu tiên. Nhóm B là phần còn lại: gộp sau khi land, hoặc ghi vào handoff M2.

### Nhóm A — chặn việc bắt đầu work item

| Work item | Câu hỏi | Vì sao nó chặn | Mặc định nếu không trả lời |
| --- | --- | --- | --- |
| W1 (disposer) | File chưa track `packages/coding-agent/test/collab/w3-probe.test.ts` (1 type error) sẽ bị xoá, commit, hay để lại cho người nhận W3? | Trong lúc chưa xử lý, `bun run check:ts` **toàn repo** đỏ vĩnh viễn — và đó là cổng type sạch duy nhất còn lại của repo, cửa sổ duy nhất để chứng minh W1, W2, W6, W10, W11, W12, W13 không phá nhau. | chưa có mặc định — cần bạn quyết |
| W6 (deny critical patterns) | `policy: \"prompt\"` có thay được cho `deny` không? Dưới yolo một quyết định mang `policy` tường minh được trả nguyên văn kèm `override: false`, nên lệnh nguy hiểm sẽ hỏi thay vì bị từ chối. `prompt` bị loại vì `docs/approval-mode.md:162` nói `prompt` không thỏa được trong subagent headless, còn `deny` fail-closed xác định. | Câu hỏi tự nói: "this is not a detail the engineer should decide". Nó đổi nhánh if, không phải đổi một dòng. | `deny` (theo câu hỏi) |
| W6 (deny critical patterns) | **SIGN-OFF:** có chấp nhận rằng `bash.patterns` với `{ approval: \"allow\" }` không còn cho phép **bất kỳ** lệnh nào khớp `CRITICAL_BASH_PATTERNS` không? `rm -rf /tmp/build` khớp regex recursive-delete neo `/`, nên user đang dựa vào allow rule để auto-run cleanup trong yolo sẽ mất, không có escape hatch ở tầng settings. Ba lựa chọn: (a) ship nguyên; (b) deny nhường cho `tools.approval.bash: \"allow\"` tường minh; (c) thu hẹp `CRITICAL_BASH_PATTERNS` để loại `/tmp` và `/var/tmp`. | Đây là phần sắc nhất của thay đổi và kế hoạch không gọi tên nó. Chốt (b) hay (c) sau khi đã ship (a) thì là thay đổi hành vi lần hai. | (a) ship nguyên — khuyến nghị trong câu hỏi |
| W7 (`promptCacheLifetime`) | **OQ1 — chặn:** giữ boolean `supports-long-prompt-cache-retention` (đã wired ở `axes.ts:153`, khai ở `anthropic.kdl:266, 286, 292, 317, 328, 341, 349`, hai consumer gate `ttl: \"1h\"` tại `packages/ai/src/providers/amazon-bedrock.ts:960` và `openai-responses.ts:1253`, resolve ở `resolve.ts:721` và `:830` với baseline hard-code `false` ở `resolve.ts:899`) hay hợp nhất? (a) xoá boolean và migrate cả hai consumer sang `promptCacheLifetime?.long`; (b) giữ cả hai với nghĩa tách bạch tường minh. | Kế hoạch tự gọi đây là BLOCKING và nó đổi nội dung bước 6. Quan trọng hơn: compiler **không** bắt được chuyện "hai axis nói cùng một sự thật" — `gen:compat`, `check:ts` và `check:ts` ở catalog đều có thể xanh trong khi quyết định thiết kế vẫn chưa có. | chưa có mặc định — khuyến nghị trong câu hỏi: giữ boolean (đã ship và đúng), scope `promptCacheLifetime` chỉ cho `[\"anthropic\"]`, tách việc hợp nhất thành work item riêng |
| W8 (cache warmer) | F6 (`decideWarm` / `WarmDecision`) được lên lịch trong milestone 1, hay W8 tự định nghĩa shape? Chữ ký `arm()` mới nhận `WarmDecision`, mà trong repo chưa có type hay hàm nào tên đó. | Câu hỏi tự nói: phải chốt trước khi kỹ sư bắt đầu, vì nó quyết định bước 4 có gõ được hay không. | chưa có mặc định — cần bạn quyết |
| W8 (cache warmer) | `pi-ref/` không tồn tại trong checkout này, nên cả sáu hằng kế hoạch bảo port (`MAX_WARMING_AGE_MS` :16, `MAX_IDLE_WARMING_AGE_MS` :18, `CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS` :20, `IDLE_CONTINUATION_PROBABILITY` :26, `getCacheWarmingDelayMs` :29, `isReplayable` :55-57) và mọi claim hành vi trích từ `cache-warmer.ts` đều **không kiểm chứng được** từ repo này. Package tham chiếu thật nằm ở đâu, và có nên tự suy ra số từ bảng TTL công bố của Anthropic thay vì port? | Cùng một cổng chặn với W7: bảng TTL theo provider theo tier phải tồn tại trước khi W7 **và** W8 bắt đầu. Kỹ sư không source được một con số thì phải để field undefined chứ không đoán — TTL đo quá làm refresh nổ trên một entry lẽ ra còn sống, TTL đo thiếu chỉ mất một lần miss. | chưa có mặc định — cần bạn quyết |
| W11 (strict qua bridge) | Có nâng W11 lên M không? Năm dòng `readonly strict = true` của builtin cố ý **không** được file test này khoá; muốn khoá thật phải assert trên wire của một provider opt-in (dựng tool list với `bash` rồi đọc payload `openai-codex-responses.ts:5078` hoặc `devin.ts:659` phát ra) — đó là provider round-trip cỡ M, không phải S. | Quyết định cỡ của item. Nếu giữ S thì khoảng trống này bắt buộc phải được ghi vào bảng wave, để người đọc không tưởng là sót. | chưa có mặc định — cần bạn quyết (nếu giữ S thì phải ghi khoảng trống) |
| W12 (`withFileMutationQueue`) | **DECISION REQUIRED — bề mặt extension:** helper là internal. Một extension ngoài repo đăng ký tool qua `registerTool` (`packages/coding-agent/src/extensibility/extensions/types.ts:1347`) rồi gọi `Bun.write` trực tiếp là nép hoàn toàn. (a) export `withFileMutationQueue` ra API extension ngay, hay (b) ghi vào handoff M2 rằng mutation của bên thứ ba không được serialize, kèm lý do? | Câu hỏi tự nói: câu trả lời BẮT BUỘC phải nằm trong handoff M2 — M2 không được phải đoán. Đây cũng là quyết định bề mặt public, nên phải có trước khi viết. Lưu ý: neo `types.ts:1322` mà kế hoạch trích là một overload `on(\"auto_compaction_end\")`, không phải `registerTool`. | chưa có mặc định — cần bạn quyết |
| W12 (`withFileMutationQueue`) | **DECISION REQUIRED — keying cho `ast_edit`:** một call `ast_edit` có thể ghi nhiều file dưới một glob (`runAstEditTargets` lặp ở :85-95). (a) key theo scope path đã resolve (`resolvedSearchPath`) — thô nhưng rẻ, và hai call cùng scope sẽ serialize; (b) key theo từng file được ghi — không làm được hôm nay, vì các write nằm bên trong call native `astEdit` và omp không thấy từng file; (c) không route `ast_edit` và chấp nhận lỗ hổng. | Kế hoạch nói phải route `ast_edit` nhưng không nói key thế nào — đây đúng là phần code sẽ viết. Chọn (c) là một thay đổi phạm vi lặng lẽ. | (a) key theo `resolvedSearchPath`, ghi rõ độ thô đó trong PR (khuyến nghị trong câu hỏi) |
| W12 (`withFileMutationQueue`) | **VERIFY BEFORE CODING — read-modify-write:** `edit` đọc file tại `packages/coding-agent/src/edit/index.ts:711` (`preWriteBytes = await Bun.file(request.path).bytes()`) rồi so sau khi ghi (~:735-747, ném `'edit appeared successful but file content did not change'`). Nếu queue được vào ở :402 thì lần đọc đó nằm **ngoài** lock: hai agent vẫn đọc cùng một pre-image và lần ghi sau âm thầm vứt lần ghi trước. W12 claim chỉ sửa interleaving (khớp câu chữ kế hoạch, defend được) hay cả lost update (phải đưa lock lên callback `#write` ở `edit/index.ts:495`)? | Quyết định vị trí lock. Phải có trước dòng lock đầu tiên, và phải được nói rõ trong PR — nếu không, người đọc sẽ hiểu là đã hết lỗi lost update. | chưa có mặc định — cần bạn quyết |
| W13 (`stdout-guard`) | **ENOBUFS có thật sự tới được không?** `process.stdout.write` của Node/Bun là write bất đồng bộ có buffer; nó không gọi `write(2)` non-blocking rồi trả EAGAIN về caller. Nếu ENOBUFS chỉ tới dưới dạng stream `error` event (giống EPIPE, mà `registerStdioDisconnectHandling` tại `packages/utils/src/postmortem.ts:356` đã xử lý) thì vòng retry phải nằm ở error path, không phải quanh lời gọi. Cần dựng một repro thật (pipe 64KB, reader ngừng đọc) **trước** khi viết vòng lặp. | Vòng retry đặt quanh chỗ sai sẽ không bao giờ chạy, và cái giá là hơn 100 LOC không kiểm chứng được cộng với một tuyên bố backpressure trong mô tả mà không có bằng chứng. | Dựng repro trước; nếu không dựng được thì deliverable chỉ còn phần gom về một chỗ, không có vòng retry (theo câu hỏi) |
| W13 (`stdout-guard`) | **Phạm vi:** W13 chỉ migrate ACP, hay cả ba? `rpc-mode.ts:780` vẫn tự dựng `RpcOutputWriter(process.stdout, …)` và `print-mode.ts:137` vẫn giữ tail riêng. Migrate ACP một mình thì guard có đúng một consumer — được, nhưng một util 100 LOC với một consumer là ảo. Migrate cả ba thì diff rộng hơn nhiều và phải giữ nguyên drain fence của print-mode. | Quyết định danh sách call site, phải có trước khi mở file nào. Kế hoạch không nói. | ACP + print-mode (`await stdoutTail` ở `print-mode.ts:348` thành `await flushRawStdout()`), để nguyên `RpcOutputWriter` vì nó dùng disk spool và mạnh hơn hẳn (khuyến nghị trong câu hỏi) |
| W14 (PowerShell) | Open question 4a (kế hoạch P3, lines 3072-3080) chưa giải và chặn W14b: omp có muốn một tool `powershell` hạng nhất, hay bash-only-trên-Windows là một quyết định phạm vi có chủ ý? Câu này phải do người dùng trả lời, không được suy. | Chặn W14b. W14a vẫn độc lập, nhưng chốt sớm để W14 không phải chờ giữa chừng. | Chỉ land W14a một mình (theo câu hỏi) |
| W15 (transcript search) | **Hình dạng overlay — câu quyết định cả estimate.** (A) Fullscreen searchable replay: overlay mới tự sở hữu `ChatTranscriptBuilder` rebuild và `ScrollView` riêng, nên Enter thực sự cuộn transcript tới match — đúng như spec và là biến thể duy nhất có scroll-to-match hoạt động. (B) Dùng lại transcript sống, có search bar nhưng không scroll-to-match, chỉ khớp bằng đếm. | Quyết định này đổi cả cấu trúc file lẫn con số 327 dòng port. (B) nhỏ hơn nhưng người dùng không thấy mình khớp — tức là hỏng đúng mục đích của tính năng. | (A) fullscreen searchable replay (khuyến nghị trong câu hỏi); nếu milestone đã trễ, cách cắt trung thực là bỏ trọn W15 |
| W15 (transcript search) | **Chi phí replay trên session lớn.** `CopySelectorComponent` cố tình chỉ replay phần đuôi (`recentEntries` / `INITIAL_ENTRIES`) rồi lazy-load toàn bộ history. Search cần cả nhánh, nên mọi lần mở đều là một full rebuild; trên session 200k dòng đây là rủi ro hiệu năng thật duy nhất của item, và fast path không giúp vì nó chỉ áp cho indexing chứ không áp cho replay. (i) chấp nhận và hiện `indexing…`; (ii) cache replay trên mode object, invalidate khi session đổi; (iii) giới hạn cửa sổ tìm kiếm và nói rõ trong UI. | Người chọn cần một **con số**, không phải cảm giác — phải đo trước khi chọn. Nhánh (i) và (iii) là quyết định trải nghiệm người dùng, (ii) là quyết định kiến trúc. | chưa có mặc định — cần bạn quyết, sau khi đo |
| W16 (storage conformance) | Cho phép đăng ký Redis chạy trên double tự viết không? Repo không có hạ tầng `bun:redis`, và cả hai file test Redis hiện tại nói thẳng là tránh server sống (`so the suite runs without a live server`, `redis-session-storage.test.ts:1-16`). Chạy trên double thì test **contract của storage**, không test ngữ nghĩa Redis server: `EVAL` atomicity thật, hành vi cursor `SCAN` và connection error đều không được test dù thế nào. | Quyết định này đổi hạ tầng CI chứ không đổi code — nên phải chốt trước khi viết registration. | chưa có mặc định — cần bạn quyết |
| W16 (storage conformance) | Có đưa Postgres và MySQL vào phạm vi không? `sql-session-storage.test.ts` chỉ string-inspect DDL/upsert dialect dựng lúc khởi tạo; không test nào thực sự chạy các câu lệnh đó. Thêm Postgres/MySQL sống vào conformance suite là một việc lớn hơn tất cả phần còn lại của item cộng lại. | Cùng lý do: quyết định phạm vi và ngân sách hạ tầng, phải có trước khi viết. | Ngoài phạm vi milestone 1 trừ khi được yêu cầu tường minh (theo câu hỏi) |
| W17 (bug-report) | Crash ring có dùng luôn `getCrashLogPath()` (`~/.omp/agent/omp-crash.log`) như kế hoạch dặn không, dù nó sẽ chứa một JSON array dưới đuôi `.log`? pi ghi JSON ra `crashes.json`. Nếu bạn muốn tên khớp thì đó là một dòng trong `packages/utils/src/dirs.ts` cộng một ghi chú rằng helper không còn zero-consumer nữa. | Câu hỏi tự nói: quyết **trước khi viết file**, không phải sau. | Dùng `getCrashLogPath()` — kế hoạch nói rõ và câu hỏi xác nhận mặc định bám theo kế hoạch |

### Nhóm B — phần còn lại

| Work item | Câu hỏi | Vì sao nó chặn | Mặc định nếu không trả lời |
| --- | --- | --- | --- |
| W1 (disposer) | Helper nên nằm trong `extensibility/utils.ts` (cả hai loader đã import từ đó) hay inline hai lần? | Đây là lựa chọn thiết kế duy nhất thật sự của item. Quy tắc dedup trong AGENTS.md nghiêng về helper dùng chung; một reviewer thích diff 4 file có thể nghiêng ngược lại. | Helper dùng chung trong `extensibility/utils.ts` (khuyến nghị trong câu hỏi) |
| W1 (disposer) | `HandlerFn` có cần export ra khỏi `extensibility/utils.ts` không, hay helper kiểu Map là `Map<string, (...args: unknown[]) => Promise<unknown>>` inline? `HandlerFn` hiện là alias private bị lặp ở `extensions/loader.ts:61`, `extensions/types.ts:1696` và `hooks/loader.ts:21`. | Gộp ba bản copy nghe thì hấp dẫn nhưng rộng hơn W1 nên hấp thụ. | Kiểu Map inline, không export `HandlerFn` (theo câu hỏi) |
| W2 (drain points) | Có drain site thứ năm mà kế hoạch "bốn drain points" không phủ: `clearExtensionTerminalInputListeners()` tại `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:1222-1227` lặp `#extensionTerminalInputUnsubscribers` (một `Set<() => void>`, khai ở :85, thêm ở :1203) rồi `.clear()`. Nó có cùng lỗi cách ly — một `unsubscribe` ném sẽ chặn phần còn lại — nhưng khác kiểu dữ liệu, nên `drainDisposers(list: Array<...>)` không vừa. Đưa vào W2 (mở rộng helper nhận `Set`, hoặc đổi field sang Array), hay ghi rõ là hoãn? | Đây là một lỗi cách ly thật, chỉ là nằm ngoài chuỗi teardown của session. | Hoãn — blast-radius note của chính kế hoạch nghiêng về hướng này, vì đây là listener TUI chứ không phải chuỗi teardown session (theo câu hỏi) |
| W2 (drain points) | Vòng `while (list.length > 0)` sẽ quay vô hạn nếu một disposer tự push lại chính nó. Hiện chưa disposer nào làm vậy (mọi push nằm ở `agent-session.ts:2179`, `runner.ts:777` và `:796`, `extension-ui-controller.ts:105`, không cái nào tự tham chiếu) nên vòng lặp hiện có chặn hữu hạn. Thêm trần phòng thủ, hay để vòng lặp không chặn là cách hỏng tốt hơn vì nó lộ ra một disposer bệnh hoạn? | Quyết định ảnh hưởng hình dạng helper dùng chung cho cả teardown session. | chưa có mặc định — cần bạn quyết |
| W2 (drain points) | File test có cần native addon không? Nó chỉ import `drainDisposers` và `logger` — không cái nào kéo `pi_natives` vào — nên **được kỳ vọng** chạy được ngay khi `bun install` xong. Điều này chưa xác nhận vì `node_modules` vắng. Nếu hóa ra nó cần addon thì W2 mất cổng luôn-chạy-được duy nhất và phải tìm cổng khác. | Đây là cổng nghiệm thu duy nhất của W2 không phụ thuộc addon. Cần báo lại kết quả thay vì lách. | chưa có mặc định — cần chạy thử và báo lại |
| W3 (collab frame guard) | Field `data` trên variant `bus` có giữ trong danh sách required không? Giữ thì khớp type `CollabFrame` và test "thiếu field bắt buộc" chạy trung thành; bỏ thì an toàn hơn trước một emit `undefined` tương lai, và không tốn gì quan sát được. | Quyết định độ chặt của guard tại biên giải mã. | Giữ `data` bắt buộc — type hiện nói bắt buộc và không call site nào vi phạm; chỉ xem lại nếu một call site `emitSubagentFrame` mới có thể truyền `undefined` (theo câu hỏi) |
| W3 (collab frame guard) | Có export guard để tái dùng không? | Export thêm một bề mặt không có consumer nào. | Không export — `sealSerialized` đã export và đủ để test dựng payload hỏng; giữ guard module-private nghĩa là test chỉ quan sát được qua `open()`, đúng cái contract của item (theo câu hỏi) |
| W3 (collab frame guard) | Guard đặt ở biên `JSON.parse` trong `crypto.ts`, hay lên một tầng trong `relay-client`? | Vị trí quyết định có bắt được mọi frame hay không. | `crypto.ts` — đây là module duy nhất biết cả khung ciphertext lẫn type `CollabFrame`, và là chỗ duy nhất mọi frame đã giải mã đi qua (`git grep -n 'as CollabFrame' -- packages/` không thấy site production nào khác) |
| W4 (`_omp/usage`) | `sessionId` không có trong map thì trả `{ reports: [] }` (khuyến nghị của spec, không phá gì, không lộ số của session khác) hay ném ACP error (khớp strictness của `#getSessionRecord`)? | Đây là lựa chọn nhìn thấy được trên wire, với một client bên ngoài mà repo này không nhìn thấy. | `{ reports: [] }` (theo câu hỏi); đổi sau cũng là một dòng |
| W4 (`_omp/usage`) | Cả bảy site có mang cả khối lý giải đầy đủ không, hay một khối đầy đủ tại `#getSessionRecord` (:1384) cộng cross-reference hai dòng ở sáu chỗ còn lại? Kế hoạch nói "đặt comment tại cả bảy điểm", đọc nghiêm thì đó là một đoạn văn bị nhân bản bảy lần. | Không chặn code, chặn hình dạng review — và phải nêu sai lệch có chủ ý trong PR. | Một khối đầy đủ + sáu cross-reference hai dòng (khuyến nghị trong câu hỏi); ghi rõ sai lệch có chủ ý trong PR |
| W4 (`_omp/usage`) | Có lý do gì để `_omp/usage` không nên nhận `sessionId` (tức là bắt client gọi một method per-session) không? | Không có caller trong repo để phân xử, và hướng sửa là thay đổi nhỏ hơn. | Sửa theo hướng nhỏ: resolve `params.sessionId` (theo câu hỏi) |
| W5 (web-wire type guard) | Có siết `packages/wire/src/index.ts:7` để nêu đúng lệnh cưỡng chế (ví dụ "asserted type-only in `packages/coding-agent/test/collab/web-wire.types.ts`, enforced by `bun run check:ts`") không? | Chỉ là comment, nhưng sửa file trong package `wire` làm rộng bề mặt review của một item cỡ S. | Để nguyên dòng — kế hoạch chọn "tạo file, không xoá câu"; nếu reviewer muốn thì tách thành follow-up (theo câu hỏi) |
| W5 (web-wire type guard) | Một hàm chiếu payload (ví dụ `toWireFrame(frame: CollabFrame): WireFrame` trong `packages/coding-agent/src/collab/protocol.ts`) là thứ duy nhất cho phép file conformance assert ở tầng **payload** thay vì tầng discriminant — và đó mới là khoảng trống thật sự còn lại, vì một `CollabSessionState` thêm field là đổi payload wire trong khi assertion discriminant vẫn xanh. Kế hoạch scope **ngoài** W5. | Xác nhận phạm vi trước khi có ai đó mở rộng W8 theo. | Nằm ngoài W5; cần work item riêng với phần rủi ro riêng (theo câu hỏi) |
| W5 (web-wire type guard) | Assertion ngược (`CollabT ⊆ WireT`) bị bỏ có chủ ý vì host có thể hợp lệ phát một frame mà browser chưa học render được. Nếu client guest bao giờ được tuyên bố là feature-complete thì assertion này mới có nghĩa và nên thêm — nhưng chỉ khi hợp đồng forward-compat đã được retire tường minh trong comment, không âm thầm. | Điều kiện để mở lại, cần biết trước khi ai đó thêm. | Bỏ qua trong M1; chỉ thêm khi forward-compat được retire tường minh (theo câu hỏi) |
| W6 (deny critical patterns) | Kế hoạch bảo đổi tên test sẵn có ở `approval.test.ts:84` ("ignores override-based prompts in yolo mode") để mô tả hành vi mới. Chỉ dẫn đó **sai**: input của test là một object tổng hợp dựng inline ở dòng 82 (`const dangerous = tool(\"bash\", { tier: \"exec\", override: true, reason: \"Critical pattern detected\" })`), nó không hề gọi `BashTool`, nên vẫn pass sau khi sửa `bash.ts`, và đổi tên sẽ assert một điều sai. Giữ nguyên test đó (nó vẫn giữ một hình dạng thật sự reachable: bất kỳ tool nào trả `override:true` mà không có `policy`) và thêm test với `BashTool` thật ở bước 8. | Xác nhận sai lệch trước khi sửa, vì đây là chỗ dễ đổi tên theo kế hoạch một cách máy móc. | Giữ nguyên test, không đổi tên (theo câu hỏi) |
| W6 (deny critical patterns) | Ví dụ extension-authoring ở `docs/approval-mode.md:124` sửa sang hình dạng mới, hay để nguyên như một bằng chứng rằng override trần vẫn hợp lệ nhưng bị yolo bỏ qua? | Ảnh hưởng tài liệu mà extension author đọc. | Sửa theo hình dạng mới (bước 11) — ví dụ hiện tại đang dạy một hình dạng âm thầm không có tác dụng dưới chế độ mặc định (theo câu hỏi) |
| W7 (`promptCacheLifetime`) | **OQ2:** test (4) của kế hoạch yêu cầu dựng request params "qua public path của provider" cho **cả** `openai-responses.ts` và `openai-completions.ts`. Với responses thì làm được (`buildParams` export ở :1174, gọi policy fn ở :1365), nhưng với completions thì không: `buildParams` ở :1797 là module-private, `applyOpenAIChatCompletionsPromptCachePolicy` ở :1767 cũng vậy, chỉ reachable từ :1999. Chọn (a) export `buildParams`; (b) chạy `streamOpenAICompletions` với fetch bị chặn (hoàn toàn public, nặng, cần mock server); (c) cover responses qua `buildParams` export, cover completions qua test stream với mock fetch. | Quyết định bề mặt public của `openai-completions` chỉ để test được. Chọn (a) là thay đổi production chỉ vì testability. | chưa có mặc định — cần bạn quyết, và ghi lựa chọn vào comment header của file test |
| W7 (`promptCacheLifetime`) | **OQ3:** `promptCacheLifetime` có cho user override trong `models.yml` không? Nếu có thì phải thêm vào omptype schema viết tay `packages/coding-agent/src/config/models-config-schema-bundle.ts` (không phải file generated; `supportsLongPromptCacheRetention?: \"boolean\"` hiện ở :70 và :96). Nếu axis thuần rule-owned thì bỏ ra và nói rõ. | Quyết định có mở rộng bề mặt authoring cho user hay không. | Không cho override — strata sở hữu trong AGENTS.md đặt thứ này vào cây KDL (khuyến nghị mặc định trong câu hỏi) |
| W8 (cache warmer) | `"off"` làm mặc định là một **BREAK** trên tính năng đang chạy và miễn phí. User đang hưởng lợi từ keep-alive warming không điều kiện sẽ mất nó mà không cần hành động gì. Một ghi chú migration trong changelog là đủ, hay release đầu cần một cửa sổ deprecation giữ mặc định cũ? | Quyết định thuộc về release, phải chốt trước khi chốt mặc định. | chưa có mặc định — cần bạn quyết (giá trị mặc định `off` thì đã nêu trong effect của W8; câu hỏi này là về cửa sổ deprecation) |
| W8 (cache warmer) | **Cách ly test:** `isLeakedThinkingHealExempt` (`packages/ai/src/stream.ts:102`) đọc `$env.ANTHROPIC_BASE_URL` và `$env.FOUNDRY_BASE_URL`, còn `resolveCacheRetention` (`utils.ts:538`) đọc `$env.PI_CACHE_RETENTION`. Một máy có `PI_CACHE_RETENTION=long` trong shell sẽ cho kết quả khác CI, và AGENTS.md cấm mutate env ở cấp file. Suite hiện có đã có `withOfficialAnthropicEndpoint` trong `packages/ai/test/helpers` cho nửa endpoint — test mới nên đi qua một helper tương ứng cho nửa retention, hay mỗi case phải trung hoà env tường minh? | Quyết định công cụ test dùng chung; ảnh hưởng độ ổn định của suite trên máy kỹ sư. | chưa có mặc định — cần bạn quyết |
| W8 (cache warmer) | Nới cổng retention ở :1431 để `long` cũng warm sẽ đổi kinh tế của các session context lớn nhất. Điều này có tương tác với accounting cache-miss của W9 không, hay W9 hoàn toàn downstream và không biết? | Quyết định giá trị mà W9 báo cáo có còn đúng không khi chính sách warm đổi. | chưa có mặc định — cần bạn quyết |
| W8 (cache warmer) | Kế hoạch nói không provider nào khác được phép warm, nhưng cũng nói KDL fact có thể nói về axis api/provider/transport. Trạng thái cuối đúng là gì: "anthropic-messages trên mọi provider trừ pi-native transport", hay "chỉ provider anthropic, để axis sẵn sàng cho sau"? | Hai hình dạng KDL khác nhau, và sự khác biệt không khôi phục lại được sau này nếu thiếu migration. | chưa có mặc định — cần bạn quyết |
| W9 (usage attribution) | Các dòng per-model render ở đâu trong `/info`: bên trong block `Cost` sẵn có (`command-controller.ts:415-431`), hay thành một section `Attribution` mới ngay sau nó? | Quyết định hình dạng output. | Section `Attribution` mới — block `Cost` sẵn có còn mang Credits và Premium Requests vốn không có nghĩa per-model; gộp dòng vào đó sẽ ám chỉ chúng cũng được attribution (khuyến nghị trong câu hỏi) |
| W9 (usage attribution) | `/usage` (đường text của ACP, `buildUsageReportText`) có thêm block per-model khi có limit do provider báo không? | Quyết định nhất quán giữa `/info` và `/usage`. | Chỉ thêm block vào nhánh fallback local-tallies, và ghi comment rằng nhánh provider-reported không có dữ liệu per-model theo cấu trúc (theo câu hỏi) |
| W9 (usage attribution) | Tên bucket `Tools/summaries` là literal bán ra hay một hằng export dùng chung? | Tên này sẽ bị W17 hard-code vào template bug-report, nên phải chốt trước khi W17 viết. | Export `TOOLS_SUMMARIES_BUCKET` từ module mới và dùng ở cả aggregator lẫn renderer (khuyến nghị trong câu hỏi); literal vẫn là `"Tools/summaries"` |

| W10 (telemetry contract) | `TelemetryAttributes` có nhận giá trị `null`/`undefined` không, giống `AttributeValue` của OTEL? Đã kiểm `node_modules`: OTEL định nghĩa `string \| number \| boolean \| Array<null\|undefined\|string> \| Array<null\|undefined\|number> \| Array<null\|undefined\|boolean>` và `Attributes` cho phép `AttributeValue \| undefined`. Spec đang đặt hẹp hơn (`readonly string[]` / `number[]`) vì đó là thứ omp thực sự gán hôm nay. | Đây là hình dạng type đầu tiên của commit 1, và một backend sau này có thể cần `null`. | Hẹp (`readonly string[]` / `number[]`), nới ra khi có backend cần (theo câu hỏi) |
| W10 (telemetry contract) | `conformance.ts` được ship trong cây `src` đã publish hay chỉ dev? `packages/agent/package.json` có `files: [\"src\"]` và main/types trỏ vào source, nên một module conformance nằm trong `src` sẽ tới tay mọi consumer. Nó vô hại (thuần, không dependency) nhưng đây là lựa chọn có chủ ý, không phải tai nạn. | Quyết định có đóng gói hay không — ảnh hưởng bề mặt publish của package, khó gỡ sau. | Đặt ở `packages/agent/src/telemetry/conformance.ts` theo danh sách file của spec, tức là sẽ được publish; nếu muốn test-only thì chuyển sang `test/` (theo câu hỏi) |
| W10 (telemetry contract) | Có export contract ra package root trong milestone 1 không, hay giữ internal với một owner được gọi tên? Kế hoạch coi dòng barrel là bắt buộc và điều đó đúng, vì tiền đề của commit 2 phụ thuộc vào nó — nhưng nó cũng nghĩa là một cam kết API public được cam kết trong một milestone không hướng người dùng. | Cần một yes/no tường minh trước khi merge commit 1. | Export ra root — dòng barrel là bắt buộc vì tiền đề của commit 2 dựa vào nó (theo câu hỏi) |
| W10 (telemetry contract) | ID `W10` bị dùng lại ba lần trong một tài liệu: lần hai là đổi tên CI/release/Docker/homebrew/nix (plan line 7962), lần ba là collab transport watchdog (plan line 8544). Spec ở đây không nghi ngờ gì là telemetry (Wave 4, lines 1347-1429), nhưng một bảng ticket khoá theo "W10" sẽ đụng. | Va chạm ID làm việc tra cứu và giao task hỏng, không phải lỗi code. | chưa có mặc định — cần bạn quyết |
| W11 (strict qua bridge) | Có nhận ngữ nghĩa ba trạng thái `strict: \"prefer\"` của `pi` (tool không strict-safe vẫn chạy không ràng buộc) hay giữ boolean của `omp`? | Đây là quyết định về bề mặt authoring của extension (`ToolDefinition`) — đúng loại câu hỏi dành cho M2 WI-10. | **Chuyển sang M2, không quyết ở M1. M1 giữ boolean** (theo câu hỏi) |
| W12 (`withFileMutationQueue`) | **`concurrency = \"exclusive\"` đã phủ gì?** Cả `EditTool` (`edit/index.ts:328`) và `WriteTool` (`tools/write.ts:441`) đã khai báo nó. Truy đã: `packages/agent/src/agent-loop.ts:3589-3611` xích các tool exclusive qua biến `lastExclusive` **function-local** khai ở :3511 bên trong `executeToolCalls` (bắt đầu ở :3024) — nghĩa là nó chỉ serialize tool call **trong một batch của một agent**, KHÔNG chia sẻ giữa các agent hay session. Đó là lý do W12 vẫn cần (tiền đề của kế hoạch đúng: subagent chạy in-process qua `createAgentSession` ở `task/executor.ts:3960`, không spawn, nên chúng dùng chung Map module-level). Lưu ý `ast_edit` **không** khai báo concurrency (tên ở :152, không có field `concurrency`) nên mặc định shared và không được agent-loop bảo vệ gì. | Không chặn code, chặn PR: không nói thì reviewer sẽ hỏi tại sao cần cả hai cơ chế. | Ghi rõ vào PR; code không đổi theo phát hiện này |
| W12 (`withFileMutationQueue`) | **Tuỳ chọn — vệ sinh Map của queue.** Bản tham chiếu xoá entry của Map khi release, nên Map tỉ lệ với số file đang được mutate **đồng thời**, không phải số file từng chạm. Một Map chỉ to ra là một rò rỉ chậm trong session dài. | Rò rỉ chậm, không đỏ test, nên dễ mang sang milestone sau. | Giữ nguyên hành vi xoá entry khi release (theo câu hỏi) |
| W13 (`stdout-guard`) | **CHẶN THIẾT KẾ — giới hạn retry:** kế hoạch nói "thử lại ... với delay ~10ms" nhưng không nói chặn bao nhiêu lần. Retry không chặn trên một reader bị treo vĩnh viễn là treo `omp` vĩnh viễn — tệ hơn bài toán ban đầu. | Con số này cân "không bao giờ rơi frame" với "không bao giờ treo"; chỉ bạn mới quyết được. | 500 lần (khoảng 5s) rồi reject, đổ vào đường lỗi sẵn có (khuyến nghị trong câu hỏi) |
| W13 (`stdout-guard`) | **Phạm vi — miễn commit-CLI:** kế hoạch miễn `commit/agentic/index.ts` (31 lệnh, đã xác minh đúng). Nhưng cùng subsystem còn `commit/agentic/agent.ts` (7), `commit/pipeline.ts` (6), `commit/execute.ts` (1), `commit/cli.ts` (1) — 15 lệnh nữa không được phân loại — và toàn `src/cli/` còn hơn 200 lệnh. Miễn theo **tiến trình** (chỉ `omp commit` vờ ra guard), hay miễn theo **file** một cách tường minh như kế hoạch nói? | Quyết định tiêu chuẩn "đã miễn" — tiêu chuẩn mơ hồ nghĩa là item sau sẽ tranh luận lại. | chưa có mặc định — cần bạn quyết |
| W14 (PowerShell) | Người dùng cần được nói rằng mojibake kế hoạch mô tả **không** xảy ra trên đường Windows mặc định của omp. Nếu họ đọc câu "mọi tool result non-ASCII bị hỏng" như một bug report đang sống thì kỳ vọng đó phải được đính chính trước khi ai đó dành một ngày cho W14b. | Quyết định phạm vi thực tế của toàn item W14. | chưa có mặc định — cần bạn xác nhận đính chính này |
| W14 (PowerShell) | Nếu câu trả lời cho 4a là "Windows hỗ trợ bash-only một cách có chủ ý", thì W14a còn ship không? Nó khoảng 30 dòng và bảo vệ một hợp đồng encoding thật trên các đường spawn **đang tồn tại** (`!` hotkey, PTY, ACP terminal khi `shellPath` trỏ tới pwsh), nên khuyến nghị là có — nhưng đây là thay đổi hành vi trên một đường bạn có thể không hỗ trợ, nên là quyết định của bạn. | Quyết định phạm vi ship. | Có, ship W14a (khuyến nghị trong câu hỏi; bản thân câu hỏi nói đây là quyết định của bạn) |
| W14 (PowerShell) | Bản `pi-ref` bọc prefix bên trong seam `exec`; bản ở đây bọc tại call site ghép lệnh. Nếu sau này bạn muốn tool `powershell`, helper W14a dùng lại được nguyên vẹn. Có ai phản đối việc nó nằm ở `exec/` thay vì `tools/` không? | Vị trí file, ảnh hưởng import của W14b sau này. | Đặt ở `exec/`, không phải `tools/` (theo câu hỏi) |
| W15 (transcript search) | `ctrl+shift+f` là lựa chọn được khuyến nghị (trống ở HEAD, và là default của chính pi nên cơ bộ nhớ cơ thể chuyển sang được). Nhưng `Ctrl+Shift+F` là Find trong rất nhiều terminal và emulator, và một số forward nó cho emulator thay vì cho app. Trước khi merge, xác nhận nó thật sự tới được app trên các terminal mà omp tuyên bố hỗ trợ — hoặc chọn `alt+k` (cũng 0 hit ở HEAD). | Phải biết trước khi tài liệu hoá chord. | `ctrl+shift+f`, sau khi verify nó tới được app trên các terminal omp hỗ trợ (theo câu hỏi) |
| W15 (transcript search) | Tính năng có nên xuất hiện thêm dưới dạng slash command (`/search`) để vẫn gọi được khi chord bị terminal nuốt mất không? Thêm rẻ và dùng lại cùng `showTranscriptSearch()`, nhưng đó là bề mặt thứ hai mà kế hoạch không yêu cầu. | Quyết định có bề mặt thứ hai hay không. | chưa có mặc định — cần bạn quyết |
| W15 (transcript search) | Kiểu highlight: spec nói accent/reverse cho match hiện tại và nền dim cho các match còn lại. Cả hai là quyết định theme, không phải kỹ thuật, và cách style phần match-còn-lại là thứ duy nhất làm cho một kết quả 23 hit điều hướng được. Cần người sở hữu theme. | Giao diện, không chặn code — nhưng không có người quyết thì không ai dám chọn. | chưa có mặc định — cần bạn quyết |
| W15 (transcript search) | `bun test` bị chặn toàn repo cho tới khi addon được build (`bun --cwd=packages/natives run build`). Gate 1 và gate 2 của item này pass được mà không cần; gate 3 thì không. Addon có được build trước khi item này được xếp lịch không — nếu không, item sẽ ship type-complete và test-pending. | Quyết định có để item ship chưa nghiệm thu hẳn hay không. | chưa có mặc định — cần bạn quyết |
| W16 (storage conformance) | **Hai divergence, cùng một quyết định** (gộp hai câu hỏi thành một dòng). (1) `move()`: Redis nuốt lỗi migrate meta, SQL thì transactional — một group khẳng định rename atomic sẽ đỏ trên Redis. (2) `readSlices` trên path không tồn tại: SQL ném ENOENT, Redis trả chuỗi rỗng; đây là **đường đọc thật**, nên câu trả lời quyết định một user Redis có bị phục vụ một session rỗng ma hay không. Ở mỗi trường hợp: Redis sai và đây thành bug fix có changelog, hay group bị over-specified và nên scope ra khỏi Redis? | Quyết định này là hợp đồng, không phải chi tiết — và nó phải do người quyết, không để suite tự quyết bằng cách được nới. | chưa có mặc định — cần bạn quyết (cho cả hai divergence) |
| W17 (bug-report) | Có port `findExtensionStackMatches` của pi (`crash-log.ts:47-113`, khoảng 65 dòng, map stack trace về extension gây crash) không? Bản pi phụ thuộc `Extension.sourceInfo.{origin,source,baseDir,scope}`, còn record extension của omp có hình dạng khác. | Port mù là cách commit nhầm hình dạng. | Hoãn, không port trong W17 — đây là tiện nghi chẩn đoán, không thuộc hợp đồng redaction (theo câu hỏi) |
| W17 (bug-report) | Delivery: pi có cả upload lẫn local zip. omp không có upload target tới issue tracker mà item này thiết lập. W17 chỉ ship đường local-archive tường minh và để upload cho item sau, hay đã có sẵn target mà nên gọi? | Quyết định bề mặt giao diện của `/bug-report`. | Chỉ local-archive — thỏa yêu cầu "explicit choice" của kế hoạch mà không bịa endpoint (theo câu hỏi) |
| W17 (bug-report) | Có refactor `packages/coding-agent/src/mcp/errors.ts` (`SECRET_KEY` ở dòng 45, `sanitizeData` ở dòng 100) để delegate sang `diagnostics/redact.ts` mới không? Đây là cùng một hợp đồng cài hai lần, mà AGENTS.md gọi đó là bug — nhưng nó module-private, substring matching cố ý lỏng hơn, và đang nuôi output lỗi MCP thật. | Rủi ro thay đổi output của một đường đang chạy. | Không làm trong W17 — W17 chỉ additive, còn lại làm follow-up (khuyến nghị trong câu hỏi) |


---


## Đính chính so với plan tổng

Bảng dưới liệt kê đủ **141** đính chính của milestone này, nhóm theo work item. Mỗi dòng là một điểm kiểm được, không phải nhận xét chung chung.

Bốn loại lỗi lặp lại nhiều lần, nói một lần rồi các mục còn lại ghi tắt:

1. **SHA HEAD sai.** 13 mục (W3, W4, W5, W6, W7, W9, W10, W11, W12, W13, W15, W16, W17) lặp lại "repo ở git HEAD `5873776`". HEAD thật là `ecd516f` trên branch `milestone-1`, và đó là commit duy nhất của repo (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`). Mọi anchor đã verify lại đều dùng `ecd516f`.
2. **Nguồn `pi-ref/` không nằm trong repo này.** 12 mục trích nó. Với 8 mục (W1, W2, W4, W8, W9, W10, W13, W16) nguồn đó không đọc được từ đây; với 4 mục (W12, W14, W15, W17) file có thật, đúng LOC, nhưng nằm ở `/Users/tranquangdang21/Projects/pi-ref` — một checkout riêng, không phải thư mục con của `ultraworkers`. Hệ quả: mọi câu chữ "port từ `pi-ref/...`" phải đổi thành "thiết kế từ đầu" hoặc "đọc từ checkout riêng".
3. **Công thức xác minh `bun check && bun test <file>` không chạy được.** Ba mục (W1, W5, W13) gọi tên nó: `bun check` ở `package.json:93` là `bun run --parallel check:ts check:rs`, kéo cả Rust toolchain không liên quan tới thay đổi TS. Lệnh thay thế là `bun run check:ts` (toàn repo) hoặc `bun run check:types` (trong một package).
4. **Hai môi trường khác nhau bị gộp làm một.** 5 mục (W2, W4, W5, W6, W8) báo `node_modules` vắng hẳn — `bun test` chết ở `Cannot find module '@oh-my-pi/pi-*'`, `check:ts` chết ở `oxlint: command not found` — khác hẳn với "thiếu native addon" mà các mục khác mô tả. Cả hai đều chặn `bun test`, nhưng là hai lỗi khác nhau và phải chữa đúng lỗi.

### W1 — Khôi phục disposer mà API `on()` của extension và hook trả về (9 đính chính)

| # | claim của plan | verdict | đính chính |
|---|---|---|---|
| 1 | Hình dạng tham chiếu là loader của pi, 16 dòng, tại `pi-ref/.../extensions/loader.ts:256-271`. | UNVERIFIABLE — đường dẫn không tồn tại | Không có thư mục `pi-ref` ở bất kỳ đâu trong repo này (`find . -maxdepth 3 -name pi-ref -type d` rỗng; `ls pi-ref` không có). Repo là một lần publish squash duy nhất (`ecd516f`), nên không có history để truy lại file đó. |
| 2 | `interface ToolDefinition` ở `packages/coding-agent/src/extensibility/extensions/types.ts` dòng `:611`. | STALE — sai dòng | `ToolDefinition` ở dòng 636, không phải 611. Dòng 611 là `export interface ToolSessionEvent {`. Cả hai đều không cần sửa cho W1 (`ToolDefinition` là đăng ký tool, không phải event handler), nhưng đừng để anchor này đưa tay sang interface sai. |
| 3 | Object `HookAPI` ở `packages/coding-agent/src/extensibility/hooks/loader.ts:92-98`, cast `as HookAPI` ngay tại `:92`. | WRONG ở cả hai con số | Thân `on` nằm ở dòng 93-98, không phải 92-98 (dòng 92 là `const api = {`). Quan trọng hơn: cast `} as HookAPI;` nằm ở dòng **128**, không phải dòng 92 — dòng 90-91 chỉ là comment hai dòng nhắc tới cast. Tới dòng 92 tìm cast sẽ thấy phần đầu của object. |
| 4 | Lỗi dễ nhất là splice nhầm handler gốc thay vì wrapper đã push — "extensions wrap handlers, nên `indexOf(originalFn)` là -1". | FACTUALLY FALSE với codebase này | Không bản nào wrap. `extensions/loader.ts:212` là `list.push(handler)` và `hooks/loader.ts:97` là `handlers.get(event)!.push(handler)` — function object của caller được lưu theo tham chiếu, không bọc. Constructor của class (`extensions/loader.ts:196-207`) chỉ rebind `this`. |
| 5 | Vì có cast `as HookAPI`, cả hai implementation buộc phải giữ kiểu tương thích chữ ký, nếu không cast sẽ vỡ type-check. | PARTLY FALSE — đúng cho extensions, KHÔNG bảo đảm cho hooks | Nửa extension CÓ bị ép: `class ConcreteExtensionAPI implements ExtensionAPI` (`extensions/loader.ts:179`) là kiểm tra cấu trúc cứng, đổi 41 overload mà không sửa method sẽ làm `bun check` đỏ. Nửa hooks KHÔNG được bảo đảm: một hàm trả về kiểu khác vẫn qua cast. |
| 6 | Lệnh xác minh: `bun check && bun test packages/coding-agent/test/extensions-disposer.test.ts`. | UNRUNNABLE như viết trong repo này | Hai blocker nêu được: (1) `bun check` là `check:ts` + `check:rs`, nửa Rust cần cargo toolchain và rất chậm — dùng `cd packages/coding-agent && bun run check:types`; (2) `bun test` hiện báo 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64`, kể cả với file test đã tồn tại. |
| 7 | Cây làm việc ở branch `milestone-1` sạch đủ để dựa vào. | FALSE — cây bẩn, và đó là việc của W3, không phải W1 | `packages/coding-agent/src/collab/crypto.ts` đang sửa và CHƯA commit (+42/-1): thêm bảng `FRAME_REQUIRED_FIELDS` và guard decode `assertCollabFrame` — đó là W3 ("a blind cast as CollabFrame at crypto.ts:57"), đã làm dở từ một probe trước. Nó vẫn type-check. |
| 8 | Phần Map-key deletion là nửa "một port chỉ splice sẽ bỏ", và việc thiếu nó "là rò rỉ bộ nhớ chậm ở mọi lần reload extension". | TRUE nhưng yếu hơn đã nói — đây chỉ là claim về bộ nhớ, đổi cách viết test | Rò rỉ là thật, nhưng không consumer nào quan sát được, nghĩa là test theo dispatch cho nửa này không chứng minh gì. Đã verify: mọi reader của map handlers đều là `.get(eventType)` rồi guard độ dài — `extensions/runner.ts:1163` (`handlers && handlers.length > 0`), `hooks/runn...` |
| 9 | Chỉ có hai file production implement hai API này. | CONFIRMED — và các stub trong test vẫn an toàn | Grep toàn repo: các implementer production duy nhất là `ConcreteExtensionAPI` (`extensions/loader.ts:179`, `implements` cứng) và object literal phía hooks (`hooks/loader.ts:128`, `as HookAPI`). Sáu file test dựng stub một phần qua `as unknown as ExtensionAPI` (autoresearch-to...). |

### W2 — Bốn điểm drain: thứ tự ngược và cô lập lỗi (7 đính chính)

| # | claim của plan | verdict | đính chính |
|---|---|---|---|
| 1 | Drain sites ở `agent-session.ts:4953` và `:5188`; `runner.ts:1333`; `extension-ui-controller.ts:103`. | stale anchors — cả bốn đều sai | Anchor thật: `packages/coding-agent/src/session/agent-session.ts:4983` (trong `beginDispose()`), `agent-session.ts:5218` (lượt hai trong `dispose()`), `packages/coding-agent/src/extensibility/extensions/runner.ts:1347` (trong `disposeFileFallbacks()`), và site thứ tư trong `extension-ui-controller.ts`. Bốn dòng này giống hệt nhau: `for (const dispose of <field>.splice(0)) dispose();`. |
| 2 | Lấy hình dạng reverse-order + try/catch từng effect + log từ `pi-ref/packages/chord/src/facets/host.ts:125-142`. | unverifiable — tham chiếu không có trong repo này | Đừng đi tìm chord. Cài đặt từ hợp đồng trong spec và từ tiền lệ cách ly lỗi ngay trong repo — tiền lệ đó mạnh hơn: shape try/catch + `logger.warn` + continue đã dùng ở `agent-session.ts:5183-5186` (`releaseSharpshooterSession`). |
| 3 | Hai registrant hiện tại (`main.ts:1050`, `config/registry.ts:323`) đều là `Set.delete` và không thể ném. | half wrong — một anchor lệch một dòng, và mô tả `Set.delete` sai | `session.addDisposer(stop)` nằm ở `packages/coding-agent/src/main.ts:1051`, không phải 1050. Không registrant nào là `Set.delete`: `main.ts:1051` truyền closure `stop` trả về từ `cfgScopedModelInputs.listen(...)`, và `config/registry.ts:323` truyền closure `unsubscribe` của... |
| 4 | `session-teardown.ts:70` gọi `deps.beginDispose()` trước `try` bọc `await deps.saveDraft(draftText)`, và doc comment nói saveDraft fail không bao giờ huỷ disposer. | VERIFIED — đây là lý do nặng nhất để không bao giờ ném | Giữ nguyên lập luận này trong doc comment của helper; nó là lý do drain không được rethrow, và điều đó không hiện ra từ helper một mình. Evidence: `sed -n '70p'` → `deps.beginDispose();`; `try {` ở dòng 71. |
| 5 | Lượt drain thứ hai tại `agent-session.ts:5187-5188` là cái bẫy làm drain-to-empty trở nên bắt buộc. | VERIFIED (số dòng lệch 30) | Lượt pass nằm ở `agent-session.ts:5217-5218`. Comment ở 5217 là `// beginDispose() drained the rest; this catches registrations made during teardown.` — trích comment này vào lý do test để test thứ ba không thành giả định. |
| 6 | Môi trường: `bun run check:ts` chạy được vì không cần native addon; chỉ `bun test` bị chặn. | WRONG for checkout này — cả hai gate đều bị chặn | `node_modules` không tồn tại, nên cả hai lệnh chết trước khi chạm code addon. `bun test packages/coding-agent/test/agent-session-dispose-concurrent.test.ts` → `0 pass, 1 fail`, `Cannot find module '@oh-my-pi/pi-agent-core'`. `bun run check:ts` → `oxlint: command not found`. Phải `bun install` trước. |
| 7 | Có đúng bốn điểm drain disposer. | Đúng cho bốn điểm, nhưng chưa đủ cho cả codebase | Bốn điểm là toàn bộ các drain disposer — grep là bằng chứng không có điểm thứ năm cùng dạng. Nhưng hai cấu trúc gần giống không được quét vào: `#dialogQueue` (`Array<() => void>`, dòng 93) được drain FIFO bằng `.shift()` ở dòng 1340 và là một dialog queue, và `extensionTerminalInputUnsubscribers`. |

### W3 — Runtime type guard tại biên giải mã của collab frame (6 đính chính)

| # | claim của plan | verdict | đính chính |
|---|---|---|---|
| 1 | Repo HEAD là 5873776 trên branch `milestone-1`. | stale | HEAD là `ecd516f` (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`). Mọi anchor khác của plan (`crypto.ts:57`, `packages/wire/src/index.ts`, danh sách file collab) vẫn resolve đúng, nên chỉ có SHA là stale. |
| 2 | "`#recvChain` có `.catch()` ở đuôi nên một lần ném chỉ mất một frame" — một lần ném từ guard tốn nhiều nhất một frame. | wrong | `.catch()` ở đuôi không phủ guard. `open()` được gọi bên trong try/catch riêng (`relay-client.ts:577-586`); `.catch()` của chain ở 595-597 chỉ bắt lỗi do `onFrame?.()` ném ở dòng 594. Inner catch phân tuyến theo vai trò: host → `logger.debug` và drop... |
| 3 | Ghi chú house-style nằm ở `packages/wire/src/index.ts:11-13`. | slightly stale | Câu "consumers cast at the JSON boundary and every `switch` keeps a tolerant `default:` branch" nay nằm ở dòng 10-11 của file đó (khối comment chạy 9-12). Trích là `packages/wire/src/index.ts:9-12`. Nội dung khuyến nghị không đổi. |
| 4 | Xác minh là `bun check && bun test packages/coding-agent/test/collab/crypto.test.ts`; thiếu native addon nghĩa là `bun test` bị chặn. | half wrong | Claim về addon đúng cho thư mục nhưng sai cho file này. `bun test packages/coding-agent/test/collab/crypto.test.ts` → `29 pass 0 fail 68 expect() calls` trước mọi thay đổi. Chạy cả thư mục `test/collab/` mới ra `29 pass / 21 fail`, và cả 21 lỗi đều thuộc file khác. |
| 5 | Công sức khoảng 40 dòng code cộng một test. | understated | Thay đổi production là ~68 dòng code mới trong `crypto.ts` (bảng 18 hàng là 20 dòng, JSDoc và lookup alias ~14, hàm ~20) cộng một sửa một dòng ở dòng 57; test là ~75 dòng vì hợp đồng round-trip cần một fixture cho mỗi biến thể. Tổng ~145 dòng. Đã đo trên một bản scratch: `crypto.ts` đi từ 67 → 100 dòng. |
| 6 | Guard là kiểm tra field bắt buộc theo biến thể, phủ mọi biến thể frame đi qua biên decode. | confirmed, có thêm một ích | Plan không nói có bao nhiêu biến thể. Có đúng 18 discriminant: abort, agent-cmd, agents, bus, bye, entry, error, event, fetch-transcript, hello, prompt, snapshot-chunk, state, transcript, ui-request, ui-request-end, ui-response, welcome. Chú thích bảng map bằng annotated map type đã type-check sạch dưới tsgo; bỏ hàng `error: ["message"]` thì tạo lỗi. |
---

## ĐỊNH NGHĨA HOÀN THÀNH

Mỗi dòng dưới đây phải phán đoán được **đúng hoặc sai**. Không dòng nào là "code trông đúng".
Cột cuối nói cổng đó **có thực sự đỏ được** không khi việc chưa làm — đây là điều phân biệt một
cổng nghiệm thu với một dòng kể.

| # | Hạng mục | Điều kiện hoàn thành | Cổng đỏ được? |
|---|---|---|---|
| **W1** | Khôi phục disposer mà API `on()` trả về | Three assertions, all of which fail on today's HEAD: (a) `bun test packages/coding-agent/test/extensions-disposer.test.ts` reports >= 4 passing tests and 0 failures; (b) case 3 shows a middle-handler double-dispose leaving the li… | có |
| **W10** | Hợp đồng adapter telemetry trung lập vendor | COMMIT 1: (a) `cd packages/agent && bun run check:types` is green — this is the load-bearing gate and it is the ONLY one that is currently runnable; (b) `git diff --stat` lists exactly six new files under packages/agent/src/telem… | có |
| **W11** | Khoá hợp đồng `strict` qua extension-tool bridge | `bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts` báo 2 pass, SAU KHI native addon đã build. Điều kiện tiên quyết bắt buộc: `bun --cwd=packages/natives run build` — ở HEAD ecd516f addon CHƯA build, nên… | có |
| **W12** | Tuần tự hoá thay đổi file theo realpath | Two independent assertions, both able to go red. (1) TYPE GATE: `bun run check:ts` exits 0. Goes red on a type error, a missing top-level import, a `ReturnType<>`, or a format violation (it runs the formatter check across 5445 fi… | có |
| **W13** | Chặn ENOBUFS cho structured stdout | BA điều phải đồng thời đúng, và mỗi điều đỏ được nếu làm sai: A. `bun run check:ts` PASS — types sạch sau khi xoá `isolateProtocolStdout`/`formatConsoleArgs` khỏi acp-mode.ts và `stdoutTail` khỏi print-mode.ts. Đỏ nếu còn import… | có |
| **W14** | Chặn encoding PowerShell trên đường spawn Windows | Two parts, and both must be run. (1) `bun run check:ts` — passes at HEAD today (measured: all 15 packages `Done`, no errors), so any type error introduced by this change turns it red. (2) `bun --cwd=packages/natives run build &&… | có |
| **W15** | Tìm kiếm transcript trong TUI | Three gates, at least two of which genuinely go red. (1) REGISTRY GATE — the real one. packages/coding-agent/src/modes/controllers/input-controller.ts calls this.ctx.keybindings.matches(data, "app.transcript.search"), and Keybind… | có |
| **W16** | Hợp đồng conformance chung cho session storage | `bun test packages/coding-agent/test/session/storage-conformance.test.ts packages/coding-agent/test/session/indexed-over-real-backend.test.ts` exits 0, AND the `lateAtomicRollback` group demonstrably runs against a real `SqlSessi… | có |
| **W17** | Gói bug-report đã redact + crash ring | W17 is DONE when all of the following hold, and it is falsifiable — each line goes red if the corresponding work is missing. (1) `bun test packages/coding-agent/test/diagnostics/redact.test.ts` passes with all seven cases, and th… | có |
| **W2** | Bốn điểm drain: ngược thứ tự, cô lập lỗi | All three tests in `packages/coding-agent/test/disposer-drain.test.ts` pass, and `bun run check:ts` is clean. Specifically: (1) run order is `["C", "B", "A"]`; (2) the non-throwing disposer ran AND `logger.warn` fired once AND `d… | có |
| **W3** | Type guard ở biên giải mã collab frame | All three commands above pass. Specifically: (a) `bun test packages/coding-agent/test/collab/crypto.test.ts` reports 33 pass / 0 fail; (b) `cd packages/coding-agent && bun run check:types` exits 0 — which in particular means the… | có |
| **W4** | Giới hạn ACP `_omp/usage` vào session được yêu cầu | The new test in packages/coding-agent/test/acp-agent.test.ts, run via `bun test packages/coding-agent/test/acp-agent.test.ts -t "usage"`, must be RED before the `acp-agent.ts` change and GREEN after. Concretely: before the fix th… | có |
| **W5** | Trích dẫn type-conformance của package wire trở nên có thật | The gate is two-sided and both sides were run against real source, not reasoned about. (a) GREEN: with `packages/coding-agent/test/collab/web-wire.types.ts` present and `packages/wire/src/index.ts` untouched, `bun run --cwd packa… | có |
| **W6** | Deny lệnh bash critical-pattern dưới yolo | `bun test packages/coding-agent/test/tools/approval.test.ts` exits 0 with zero failures, AND the suite contains a test that drives the real `BashTool` under mode `"yolo"` and asserts `resolveApproval(...)` returns `policy: "deny"… | có |
| **W7** | Trục tuổi thọ prompt-cache theo tier trong catalog | All four must hold. (1) `bun run gen:compat` exits 0 and `git status --short packages/catalog/` shows only the expected regenerated files. (2) `bun run --filter @oh-my-pi/pi-catalog check:types` exits 0. (3) `bun run check:ts` in… | có |
| **W8** | Vòng refresh prompt-cache có cổng chi phí | TWO PARTS, because one is not enough. PART A — `bun test packages/ai/test/anthropic-cache-refresh.test.ts` with test (0): `anthropicCacheRefresh: "off"` at the boundary produces an absent replay payload, plus test (3) (no request… | có |
| **W9** | Attribution usage theo model + bucket Tools/summaries | Two commands, both must be green. (1) `bun run check:ts` from the repo root -- oxlint + oxfmt + `tsgo --noEmit` across every package; it catches the type errors that a blocked `bun test` cannot. (2) Once the native addon is built… | có |

**Milestone 1 hoàn thành khi cả 17 dòng trên đều đạt** — không phải khi code merge, mà khi từng
cổng chạy xanh trên HEAD sau khi thay đổi.

### Điều kiện áp dụng cho *mọi* cổng

Các cổng có ghi "sau khi build native addon" thì **không chạy được** cho tới khi
`bun --cwd=packages/natives run build` chạy xong. Tới lúc đó `bun test` hiện `0 pass` kèm
`Failed to load pi_natives native addon for darwin-arm64`. Một cổng báo xanh **trước** thời điểm đó
không có nghĩa — nó chỉ có nghĩa là addon chưa build.

---

## NHỮNG ĐIỀU CHƯA ĐƯỢC KIỂM CHỨNG

Mục này ngắn và cố ý không đệm. Đây là những gì bạn nên **không** tin tuyệt đối.

### 1. Milestone này chưa bao giờ được thực thi

Toàn bộ đặc tả được sinh bằng cách **đọc code và chạy lệnh kiểm tra anchor** (`git grep -n`,
`sed -n`), không phải bằng cách build rồi xem có chạy không. Một work item duy nhất — W3 — đã được
thử thật (áp dụng, typecheck, chạy test, rồi hoàn tác trên nhánh phụ), và nó xanh. **16 cái còn lại
thì không.** Đó là giới hạn thật của tài liệu này.

### 2. Thay thế cho ba package của `pi` chỉ được đối chiếu theo TÊN và BỀ MẶT

`chord`, `durable`, `session-backends` bị loại khỏi M1 với lập luận "đã có thay thế trực tiếp".
Cái thật sự được kiểm là **file thay thế tồn tại** và **phủ năng lực được nêu tên**. Chưa ai so
`tương đương hành vi` giữa thay thế và bản gốc. Nên câu *"năng lực giống hệt"* **chưa được
chứng minh** — nó là giả định, không phải kết luận.

### 3. Nửa "document" của `durable` không có thay thế nào được xác minh

`git grep "document runtime|DocumentsRuntime" -- packages/` không trả về gì. Đây là **điểm
không có bằng chứng duy nhất** trong milestone. Nếu bạn tìm ra một năng lực người-dùng-thấy-được
đến từ `durable`, hãy soi chỗ này trước tiên.

### 4. Mọi cổng nghiệm thu phụ thuộc việc build native addon

Xem mục [Điều kiện tiên quyết](#điều-kiện-tiên-quyết). Trước khi addon được build, một nửa cổng
của tài liệu này **không tạo ra tín hiệu nào cả** — chúng báo xanh giả hoặc đỏ giả, tuỳ lệnh.

### 5. Phần M1 trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` đã cũ

141 đính chính ở mục [Đính chính so với plan tổng](#đính-chính-so-với-plan-tổng) là những
điểm cụ thể mà phần M1 của plan tổng **không còn đúng**. Hãy dùng tài liệu này làm nguồn, và coi
plan tổng là bản khảo sát ban đầu.
