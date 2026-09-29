# KẾ HOẠCH THỰC THIỆN — MILESTONE 1: BAO TRỌN `pi`

Milestone 1 đưa toàn bộ phần còn nợ của `pi` vào `omp` theo đúng tiêu chuẩn dùng cho phần đã có: **mọi thứ người dùng nhìn thấy phải là một surface có kiểm chứng, mọi thứ chỉ "đúng về bên trong" phải nói thẳng là bên trong**. Nó gồm 21 work item (W1–W7, W9–W17, W18–W22) chia thành 8 wave, trải trên `packages/coding-agent`, `packages/agent`, `packages/ai`, `packages/catalog`, `packages/tui`.

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
| Lệnh `omp doctor` (W18) | Một lệnh chẩn đoán thật, in ra bảng check có `severity` + `detail` + `remedy` và **tự thừa nhận chỗ nó mù**: check nào hỏng tiền đề thì in "không kiểm được X vì Y" thay vì im lặng bỏ qua rồi báo xanh. Cùng một module đó xuất hiện trong `/debug`, và `~/.omp/logs` được tạo với `mode: 0o700` thay vì theo umask. Hôm nay `runDoctorChecks` đã viết xong nhưng **không có call site nào** — đúng 1 hit toàn repo, chính dòng định nghĩa. |
| Namespace lệnh `omp session` (W22) | Làm việc với session **bằng script**: `list` (mặc định, nhân bản output của `omp find`), `show`, `archive`, `unarchive`, `delete`, với cờ `--last` / `--all` / `--json`. Store và lệnh đều đã có; đây là khoảng cách **sửa cho khớp**, không phải tính năng mới. |
| ~~Thiết lập `providers.promptCacheRefresh` (W8)~~ | ⛔ **Ngoài phạm vi (2026-09-28).** Setting này không tồn tại trong repo (`grep -rn promptCacheRefresh packages/` → 0 hit) và sẽ không được dựng. Cổng chi phí prompt-cache đã được giải quyết bằng cờ `providers.cacheWarming` (`packages/coding-agent/src/session/settings.ts:1120-1121`). Xem khối ⛔ ở đầu §W8. |

### B. Hỏng âm thầm được chặn lại

Những thay đổi này người dùng không "thấy" một màn hình mới, nhưng họ sẽ không còn gặp nữa:

- **Lệnh `rm -rf /` không còn tự tự duyệt** (W6). Với `tools.approvalMode: yolo` — chế độ mặc định — một lệnh khớp `CRITICAL_BASH_PATTERNS` (`rm -rf /`, `rm --no-preserve-root`, `su`…) hôm nay tự approve một cách âm thầm ngay lúc cài. Sau W6, mọi chế độ phê duyệt đều trả về `policy: "deny"`.
- **Hai lần sửa cùng một file trong một lượt không còn xen kẽ nhau** (W12). Hai subagent (hay hai session) cùng đụng một file, bản ghi thứ hai sẽ không còn ghi đè lên bản ghi đang dở của bản ghi thứ nhất. Hàng đợi là **per-realpath**: cùng một file thì tuần tự, khác file thì vẫn song song.
- **Client JSON/ACP ngừng đọc không còn làm hỏng stdout** (W13). Frame của `omp` được trì hoãn có kiểm soát (thử lại khi gặp `ENOBUFS`/`EAGAIN`/`EWOULDBLOCK`, có chặn trên) thay vì bị cắt cụt giữa dòng hoặc bị vứt mất không dấu vết.
- **Windows + PowerShell không còn ra mojibake** (W14a). Người dùng Windows trỏ `shellPath` sang `pwsh`/`powershell` và chạy lệnh qua hotkey `!`, PTY tương tác hay tool `bash` sẽ nhận kết quả tool không phải UTF-8. W14a đi kèm **vô điều kiện**. W14b (tool `powershell` riêng) chỉ được dựng **nếu người dùng nói omp cần nó**.
- **Một lần bấm "Always allow" không còn cấp quyền cho cả tool** (W20). `acp-permission-gate.ts` hỏi bạn về *một lệnh cụ thể* (title lấy từ lệnh, `.slice(0, 80)`) nhưng lại ghi nhớ quyết định của bạn theo **tên tool** — nên bấm "Always allow" một lần trên `git status` là `rm -rf` cũng tự qua. Sau W20, khoá cache đi theo hành động đã canonicalize, và phạm vi sắp cấp được **hiện ra** trước khi bạn bấm.
- **ACP `_omp/usage` trả về đúng session được hỏi** (W4). Client hỏi usage của session B hôm nay nhận số của session A — session đầu tiên trong map. Sau W4 nó nhận của B.

### C. Những thay đổi hoàn toàn bên trong — nói thẳng

**10 trên 21 work item không có bất kỳ bề mặt người dùng nào.** Không UI, không output, không cờ, không đổi hành vi mặc định:

W1 (disposer cho `pi.on()`), W2 (`drainDisposers` tháo theo thứ tự ngược + cô lập lỗi), W3 (type guard ở biên giải mã frame collab), W5 (khoá bằng type bảo đảm khớp discriminant wire↔host), W7 (trục TTL theo tier của prompt-cache trong catalog), W10 (hợp đồng telemetry trung lập vendor), W11 (khoá hợp đồng `strict` qua extension-tool bridge), W16 (conformance chung cho mọi backend SessionStorage), W19 (cấm `console.*` ở tầng thư viện bằng lint), W21 (harden tiến trình trước main).

Chúng vẫn nằm trong milestone 1 vì bốn lý do cụ thể, không phải vì "cho đủ số":

1. **W1 là gốc của mọi thứ khác.** Hôm nay `pi.on(event, handler)` không trả về gì cả, nên một teardown không có gì để gọi. Wave 1 không có W1 thì W2 không có disposer để drain, và W12 không có mẫu để xếp hàng teardown.
2. **Chúng là chỗ hỏng âm thầm.** W3 biến một frame hỏng cấu trúc từ `TypeError` vô nghĩa vài lần gọi sau thành một lần **drop có tên lý do** ngay tại biên giải mã. W16 làm cho một sai lệch giữa backend SQL và Redis **hỏng test** thay vì lặng lẽ tồn tại.
3. **Chúng là hợp đồng, và hợp đồng thì phải khoá trước khi có người dùng.** W5 và W11 không sửa một dòng production nào; chúng biến một lời hứa đang nằm trong comment thành thứ mà `bun run check:ts` trả đỏ khi ai đó phá vỡ nó.
4. **W19 và W21 là kỷ luật, không phải tính năng — và kỷ luật thì rẻ nhất khi làm sớm.** W19 biến một quy tắc đang chỉ tồn tại bằng văn xuôi trong `AGENTS.md` thành lint đỏ: hôm nay `packages/ai/src/providers/cursor.ts:405` đã gọi `console.*` trong **provider wire code**, đúng loại lỗi mà `AGENTS.md` tự mô tả là "hỏng rendering hoặc hỏng protocol cho mọi consumer cùng lúc". W21 đóng trục duy nhất còn thiếu: omp giữ API token trong bộ nhớ và spawn subprocess không kiểm soát, mà hôm nay không có gì ngăn debugger attach, không có gì ngăn core dump, và `LD_PRELOAD` đi thẳng vào mọi child. Cả hai là hai mục có tỉ lệ giá trị/công sức cao nhất trong sổ khoảng trống.

Nếu maintainer cần cắt cho deadline, **Wave 7 (W14, W15) là cái đuôi cắt được** — nó tự chứa, không ai chặn nó, và cả hai đều là bề mặt người dùng thuần tuý. W1–W6, W9 và Wave 8 thì không: W20 đóng một lỗ hổng phê duyệt đang sống, và W19/W21 là hàng rào kỷ luật rẻ nhất nếu làm sớm.

---

## Không làm gì — ĐÃ BỊ QUYẾT ĐỊNH KIẾN TRÚC ĐẢO NGƯỢC (2026-09-28, commit `1454dc0`)

Bản trước của mục này ghi ba package "không port": `session-backends`, `durable` (một phần), và một
package thứ ba **chưa xác định**. Cả ba dòng đó hết hiệu lực. Lý do: `pi` là MIT (Copyright (c) 2025
Mario Zechner), nên chép rẻ hơn và ít rủi ro pháp lý hơn tái tạo; bốn package dùng chung đã phân kỳ
100% (0 file giống từ byte), nên mọi lần chép về sau phải là thao tác cơ hệc.

| Package của `pi` | Quyết định hiện hành |
| --- | --- |
| `session-backends` | **Còn để ngỏ** — thứ duy nhất trong ba cái chưa có quyết định. Thay thế hiện tại chỉ được kiểm **theo tên và bề mặt**, chưa chứng minh tương đương hành vi; W16 mới ép chúng trả lời cùng một bộ câu hỏi. |
| `durable` | **KHÔNG chép** — package chết, 0 file ngoài nó import. Xem khối *Cập nhật 2026-09-28* trong mục *Hai điều không được chôn vùi* ngay dưới đây. |
| **`chord`** | **CHÉP** — đây là package thứ ba từng ghi "Chưa xác định". Nằm trong sáu package của đợt này, vị trí 1 trong bảng *Thứ tự migrate*. |

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

**3. Điều kiện tiên quyết này quyết định một `bun test` đỏ có nghĩa là gì.** Trên một máy sạch — tức là đã `bun install` nhưng **chưa** chạy bước 2 — `bun test` chết ngay ở bước import:

```
bun test packages/coding-agent/test/rpc-output.test.ts
→ 0 pass / 1 fail / 1 error
  Failed to load pi_natives native addon for darwin-arm64
  packages/natives/native/index.js:23:24
```

Đó **không phải** kết quả của code bạn viết, và — điểm quan trọng — **không phải** hạn chế của máy này. Nó là **thiếu đúng một bước build**. Làm một lần: `brew install ninja` rồi `bun --cwd=packages/natives run build` (exit 0, sinh `pi_natives.darwin-arm64.node`) là hết; sau đó **toàn bộ** suite chạy. Đo lại trên chính máy này sau bước đó: `bun test packages/utils/test/` → **743 pass / 10 skip / 0 fail** (753 test, 80 file), và `bun test packages/coding-agent/test/mcp-config-scope-dedup.test.ts` → **8 pass / 0 fail**.

Trước bước build đó, chặn là **CHỌN LỌC theo bề mặt import, không phải toàn cục** — chỉ những file kéo `pi_natives` vào module graph mới đỏ, còn các package không chạm native thì vẫn xanh (đo tại HEAD `106eb3e`, 2026-09-28: `packages/omptype` 1.191 test / 0 fail). Hệ quả thẳng về mặt thể chế: **trước khi chạy `bun --cwd=packages/natives run build`, một kết quả đỏ của `bun test` là vô nghĩa, và một work item chưa build addon thì phải được coi là CHƯA xác minh, không phải là xanh.** Đây không phải là lý thuyết — nó đã được quan sát thấy ở W13, W16 và W11, và riêng W13 được ghi rõ là gate *trong* (vacuous) cho tới khi addon có.

**4. Kiểm tra kiểu — chạy được, và không cần bước build ở trên.**

```bash
bun run check:ts
```

Lệnh này **không cần** native addon và đã được xác minh PASS tại baseline trên chính HEAD này (toàn bộ 16 package `Done`, không lỗi). Nó là oxlint + oxfmt + `tsgo --noEmit` trên mọi package. Vì vậy nó bắt được type error, import thiếu ở top-level, `ReturnType<>`, hay vi phạm format ngay cả khi addon chưa build — nhưng nó **không** thay được `bun test` cho hợp đồng hành vi: sau bước 2 thì cả hai cùng chạy.

> **Không bao giờ dùng `tsc` hay `npx tsc`.** Kiểm tra kiểu đi qua `bun run check:ts` / `bun run check:types`.

---

## Thứ tự thực hiện

8 wave, 21 work item. Bảng dưới là bản tóm tắt để quyết định có bắt đầu không; chi tiết từng item nằm ở spec riêng. (W8 đã ra khỏi bảng ngày 2026-09-28 — xem khối ⛔ ở đầu §W8.)

| Wave | Nội dung | Item | Cỡ | Phải đúng trước khi bắt đầu | Đúng vào lúc kết thúc |
| --- | --- | --- | --- | --- | --- |
| **1** | Nền móng vòng đời | W1, W2, W3, W5 | S, S, S, S | native addon đã build; `bun install` xong | `pi.on()` trả về hàm huỷ một lần, xoá **đúng** handler đó và xoá khoá Map khi danh sách rỗng; cả bốn vòng drain đi qua `drainDisposers`; frame collab hỏng bị drop có tên; type-only guard wire↔host làm `check:ts` đỏ khi lệch |
| **2** | Correctness trên các đường đang chạy | W4, W6, W12, W13 | S, S, M, S | Wave 1 xong **cho W12**; quyết định sản phẩm của W6 đã chốt | `rm -rf /` bị deny ở mọi chế độ; ACP usage trả đúng session; ghi file cùng realpath nối tiếp nhau, khác file vẫn song song; stdout không còn mất frame khi reader nghẽn |
| **3a** | Kinh tế cache | W7 | M | **Bảng TTL theo provider/tier đã có nguồn** (xem quyết định) | Catalog có trục TTL per-tier do rule sở hữu; **không** request byte nào thay đổi |
| **3b** | Quy kết chi phí | W9 | M | Không phụ thuộc wave nào | `/info` có Attribution; không token nào bị đếm hai lần |
| **4** | Hợp đồng hướng provider | **W11 rồi W10** | S, M | Không có | `strict` đi qua bridge mà không rơi và không bị bịa; telemetry có hợp đồng trung lập vendor + NOOP + in-memory + conformance; `otel.test.ts` **không đổi một dòng** |
| **5** | Chẩn đoán hướng người dùng | W17 | < M | W9 xong (W9 blocks W17) | `/bug-report` dựng được gói đã bóp khoá; transcript opt-in; crash ring sống |
| **6** | Storage conformance | W16 | M | Không có | Mọi backend trả lời cùng một bộ câu hỏi; nhóm `lateAtomicRollback` **đã chứng minh bắt được** sai lệch thật |
| **7** | TUI và Windows — **cái đuôi cắt được** | W14, W15 | S + M, M+ | Không có; chạy song song với bất kỳ ai | PowerShell ép UTF-8; `Ctrl+Shift+F` tìm trong transcript |
| **8** | Năm mục từ sổ khoảng trống (`GAP-REGISTER-2.md`) | W18, W19, W20, W21, W22 | M, S, S–M, S, S | Không có. Nhưng W18 và W22 sửa **cùng một file** `cli-commands.ts` nên phải mở chung một đợt | `omp doctor` và `omp session` là hai lệnh thật trong registry, không rơi xuống `runCli`; `console.*` ở tầng thư viện là lint đỏ; "Always allow" khoá theo hành động đã canonicalize và hiện phạm vi sắp cấp; tiến trình không bị attach và không đổi core dump; `omp session` có `archive`/`unarchive` và `--last`/`--all`/`--json` |

*(Dòng Wave 8 cộng thêm ngày 2026-09-29 từ `.lavish-wip/GAP-REGISTER-2.md`. Câu "cái đuôi cắt được" ở Wave 7 là nói về bảy wave gốc và không mở rộng sang Wave 8 — xem mục *Cái đuối cắt được* bên dưới.)*

### Cấu trúc song song — cái gì chạy cùng, cái gì không

**Hard edges (không thể vượt):**

```
W1 ──▶ W2 ──▶ W12
W9 ──▶ W17
W11 ──▶ W10
W18 ══ W22
```

*(W8 đã bị gỡ khỏi sơ đồ này ngày 2026-09-28 — upstream đã dựng xong cache warmer, xem khối ⛔ ở
đầu §W8. Nhánh `W8 ◀── W7` và dòng "W7 + W8 ship như MỘT đơn vị" không còn đúng.)*

Đọc hình như sau:

- **W1 là đầu chuỗi và là lý do nó đứng đầu Wave 1.** Nó là nền cho W2, và W2 là nền cho W12.
- **W7 không phụ thuộc Wave 1.** Nó không đụng lifecycle, không đụng disposer. `light.json` nói thẳng: xây song song với Wave 1 được.
- **W13 về kỹ thuật song song với W2**, phụ thuộc thứ tự chứ không phụ thuộc mã: nó không import gì của W2. Xếp vào Wave 2 chỉ vì cần ba file test của Wave 1 đã chứng minh được đường test chạy được. Có thể làm cùng lúc; chỉ cần chạy full suite **một lần** sau khi cả hai land.
- **W11 phải land trước W10** (cùng Wave 4, không phải cùng commit) — và W10 là **hai commit, không bao giờ squash**.
- **W18 và W22 là một cặp, không phải hai item độc lập.** Cả hai sửa `packages/coding-agent/src/cli-commands.ts`, và bảng cổng đỏ phải chứa **một** assertion *"mọi subcommand trong registry thật sự được phân tuyến"*, không phải hai assertion riêng. Lý do: một lệnh thiếu trong `cli-commands.ts` rơi xuống `runCli` và **argv thành prompt cho LLM** (hồi quy #1499/#1496) — hậu quả im lặng, và hai assertion rời rạc sẽ cho phép nó quay lại. Ký hiệu `══` nghĩa là *phải mở chung một đợt*, khác `──▶` là *thứ tự merge*.

**Hoàn toàn độc lập, chạy ngay được:** W4, W5, W6, W9, W11, W16, W19, W20, W21, W22, và W14/W15 nếu không cắt. (W18 độc lập với tất cả, trừ W22 — xem dòng `W18 ══ W22` ở trên.)

**Cái đuối cắt được:** Wave 7. Tự chứa, không ai chặn. Câu này nói về **bảy wave gốc** và không mở rộng sang Wave 8: năm mục `GAP-REGISTER-2` không phải đuôi cắt được, vì W20 đóng một **lỗ hổng phê duyệt lan rộng** đang sống, và sổ xếp W18/W19/W21 vào nhóm có tỉ lệ giá trị/công sức cao nhất.

**Cảnh báo về độ trễ của gate:** nhiều gate trong wave sau cần bước build addon ở mục *Điều kiện tiên quyết*, và `light.json` đã đánh dấu chúng là trong (vacuous) cho tới lúc đó. Làm `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần — sau đó mọi gate trong tài liệu này chạy được. Gate nào chạy **trước** bước build mà đỏ thì coi như **chưa xác minh**.

---

## Quyết định cần chốt trước khi code

Đây là những thứ **chặn việc bắt đầu**, không phải những thứ chặn việc merge. Không có gì ở đây là chi tiết triển khai.

| # | Quyết định | Ở đâu | Vì sao nó chặn | Ai chốt |
| --- | --- | --- | --- | --- |
| 1 | **Mặc định của bash critical-pattern dưới `yolo`.** Lệnh khớp `CRITICAL_BASH_PATTERNS` sẽ `deny` hay vẫn tự approve? | W6 | Đây là **ký hiệu sản phẩm**: nó đổi hành vi của chế độ mặc định trên máy người dùng thật. Chốt sau thì không sửa ngược được mà không phá người đã quen hành vi cũ. | Maintainer, bằng văn bản |
| 2 | **Bảng TTL prompt-cache theo provider/tier phải có nguồn trước khi W7 bắt đầu.** | W7 | Là hard gate, không phải task. W7 cấp **schema**, W7 không cấp **data**. Kỹ sư không tìm được con số thì để field `undefined` — **đừng đoán**: TTL đo quá ca làm số lần refresh bùng nổ trên một entry lẽ ra còn sống; TTL đo quá thấp chỉ mất đi một lần trúng-cache tránh được. Sai lệch hai bên không cân bằng. | Nghiên cứu, trước Wave 3a |
| 3 | **Trục TTL có trùng lặp trục cũ không.** `promptCacheLifetime` có phải là cái đã có sẵn dưới tên khác không, hay là trục mới độc lập? | W7 (OQ1) | **Compiler sẽ không bắt lỗi này.** Cả ba gate của W7 có thể xanh trong khi quyết định thiết kế vẫn chưa được đưa ra. Đó là lý do nó là câu hỏi mở chặn, không phải chi tiết. Lưu ý khi làm: đừng đặt field cạnh `promptCacheBreakpointTtl` tại `packages/catalog/src/types.ts:403` — chỗ đó kéo nó lên `OpenAICompat`/`ResolvedOpenAIShare…` và gắn nó vào wire field đang có. | Maintainer + kỹ sư catalog |
| 4 | **Tính tới được của hàng đợi ghi file.** `writeFileWithFallback` tại `packages/coding-agent/src/tools/file-write-fallback.ts:402` có bọc khoá quanh **cả** vòng lặp fallback-handler (`:440-452`), mà vòng lặp đó gọi các handler do extension đăng ký. Handler đó có thể quay lại ghi chính file đó không? | W12 | Rủi ro cao nhất của W12 là **deadlock**: một lời gọi re-entrant chặn đứng hàng đợi. Đây là câu hỏi reachability phải trả lời **trước khi** viết helper, không phải sau khi test treo. | Kỹ sư, bằng cách đọc call path |

*(Hàng "package thứ ba bị từ chối" đã bị đóng bởi quyết định kiến trúc `1454dc0`: package thứ ba là
`chord`, và quyết định là **chép** chứ không phải từ chối.)*

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
| `packages/coding-agent/src/extensibility/hooks/types.ts` | sửa | Toàn bộ 24 overload `on(event: "..."): void;` bên trong `export interface HookAPI` (khai báo dòng 469; overload nằm ở 471–500) thành `on(event: "..."): () => void;`. | Có — đếm được 24. **Không** đụng dòng 134 (`) => (Component & { dispose?(): void }) \| Promise<Component & { dispose?(): void }>,` — đó là dispose của UI component, không liên quan). |
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
| Xác minh: `bun check && bun test packages/coding-agent/test/extensions-disposer.test.ts`. | **Cần sửa cấu thành lệnh + một tiền đề build một lần** | Ba vướng riêng. (1) `bun check` là `check:ts` + `check:rs`; nửa Rust cần cargo toolchain và rất chậm — dùng `cd packages/coding-agent && bun run check:types`. (2) `bun test` cần native addon: trên máy chưa build nó báo 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64`, kể cả với file test đã tồn tại. Đây là thiếu một bước build, không phải hạn chế của máy — `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là xong, và sau đó mọi cổng `bun test` trong tài liệu này chạy. Nếu bỏ qua bước đó thì một lần chạy xanh và một lần "test không hề chạy" là không phân biệt được. (3) `bun run check:ts` cho cả repo ĐÃ ĐỎ trên HEAD: đúng một lỗi, `test/collab/w3-probe.test.ts(76,15): error TS2352`. File đó **chưa track** (`git ls-files --error-unmatch` → "did not match any file(s) known to git") — một probe nghiên cứu W3 còn sót. Dời nó đi thì `bun run check:types` trong `packages/coding-agent` là xanh. Cổng của bạn là "không lỗi mới". |
| Cây làm việc ở nhánh `milestone-1` sạch đủ để xây trên đó. | **SAI — cây bẩn, và đó là việc của W3 không phải W1** | `packages/coding-agent/src/collab/crypto.ts` đang modified và **chưa commit** (+42/-1): thêm bảng `FRAME_REQUIRED_FIELDS` và decode guard `assertCollabFrame` — đó là W3 ("một cast mù `as CollabFrame` tại `crypto.ts:57`"), đã xây dở một nửa bởi một probe trước đó. Nó type-check sạch nên không chặn W1, nhưng: đừng revert, và đừng để nó cưỡi vào một commit W1. Cũng cảnh báo — một `git diff` lúc đầu W1 sẽ hiện 43 dòng đổi của `crypto.ts` không phải của bạn. |
| Việc xoá key Map là nửa "bản port chỉ-splice bỏ sót", và thiếu nó "là rò rỉ chậm mỗi lần reload extension". | **ĐÚNG nhưng yếu hơn đã nêu — đó là tuyên bố về bộ nhớ, và điều đó đổi cách viết test** | Rò rỉ là thật, nhưng không consumer nào quan sát được, nghĩa là một test dựa trên dispatch cho nửa này chứng minh không điều gì. Đã kiểm chứng: mọi reader của Map handler đều là `.get(eventType)` rồi guard độ dài — `extensions/runner.ts:1163` (`handlers && handlers.length > 0`), `hooks/runner.ts:173` (giống), `hooks/runner.ts:286` (`if (!handlers \|\| handlers.length === 0) continue`), và tương tự ở 285/333/365/402 và `extensions/runner.ts:1476/1488/1534/1596`. Không gì ở đâu duyệt các key của Map handler. Nên một mảng rỗng để lại dưới key là vô hình về hành vi. Case 2 của bộ test **phải** khẳng định `handlers.has(event) === false` trực tiếp trên object Map. Viết nó thành "event không còn dispatch" sẽ xanh trên cả bản cài đặt hỏng và tạo cảm giác an toàn giả. |
| Chỉ có hai file production cài đặt các API này. | **XÁC NHẬN — và các stub trong test là an toàn** | Grep toàn repo: các cài đặt production duy nhất là `ConcreteExtensionAPI` (`extensions/loader.ts:179`, `implements` cứng) và object literal của hook (`hooks/loader.ts:128`, `as HookAPI`). Sáu file test dựng stub một phần qua `as unknown as ExtensionAPI` (`autoresearch-tools.test.ts:70`, `autoresearch-git.test.ts:40`, `autoresearch-state.test.ts:474` và `:620`, `autoresearch-before-*-start.test.ts:43`, `modes/warp-events.test.ts:47`) — một double assertion nên không có kiểm tra tương thích nào bắn vào, chúng không cần sửa. Biết để không đi săn implementer thứ năm là đủ. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W1.md`. Mục này gấp lại phần kỹ sư cần **trước khi gõ**; nó không thay thế phiếu.

**Cảnh báo neo.** Nguyên văn từ phiếu:

> 62 neo đã mở bằng `sed -n "<n>p"` hoặc `rg -n`. 43 neo đúng như plan nói. 19 sai hoặc đã lỗi thời:

Những dòng sai có ảnh hưởng cao (bảng đầy đủ 22 dòng nằm ở mục 8 của phiếu):

| # | plan nói | thực tế | ảnh hưởng |
| --- | --- | --- | --- |
| 1 | `check:types` FAIL 1 lỗi ở `test/collab/w3-probe.test.ts(76,15): error TS2352` | file **không tồn tại**; `check:types` **exit 0, sạch** | **cao** — đổi baseline cổng thành 0 lỗi |
| 2 | 41 overload ở `extensions/types.ts` | **47** | **cao** — con số dùng làm cổng sai |
| 3 | 24 overload ở `hooks/types.ts` | **25** | **cao** — như trên |
| 4 | `export interface ExtensionAPI` ở `extensions/types.ts:1256` | dòng 1256 là `}`; thật ở **1277** | **cao** — dẫn sang sai interface |
| 5 | overload ở `extensions/types.ts:1280-1340` | thật **1301–1365** | **cao** |
| 11 | `extensions/runner.ts:1163` = `handlers && handlers.length > 0` | dòng 1163 là `}`; cặp thật ở **1192/1193** | trung bình (dùng để lập luận về guard) |
| 17 | `collab/crypto.ts` modified (+42/-1) | **cây sạch**; cast mù ở dòng **57** vẫn còn | trung bình (bỏ bước kiểm `git status` cuối) |
| 19 | `pi-ref/.../extensions/loader.ts:256-271` **UNVERIFIABLE** | project **tồn tại** ở `/Users/tranquangdang21/Projects/pi-ref`; neo 256–271 **chính xác tuyệt đối** | **cao** — đổi lý do cấm port tầng bọc |

**Bảng điểm sửa.** Cột TRƯỚC là văn bản trích nguyên văn từ file thật ở HEAD, đúng như phiếu ghi.

| path | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/utils.ts` | `createHandlerDisposer` (mới) | *(không tồn tại — file kết thúc bằng `withHostGuard` ở dòng 118)* | thêm hàm 8 dòng trả closure `() => void`, đóng trên `handlers`/`event`/`handler`, `indexOf` theo identity, `splice`, `delete` key khi rỗng |
| `packages/coding-agent/src/extensibility/extensions/loader.ts:40` | import từ `../utils` | `import { resolvePath, withHostGuard } from "../utils";` | `import { createHandlerDisposer, resolvePath, withHostGuard } from "../utils";` |
| `packages/coding-agent/src/extensibility/extensions/loader.ts:210` | `ConcreteExtensionAPI.on` | `	on<F extends HandlerFn>(event: string, handler: F): void {`<br>`		const list = this.extension.handlers.get(event) ?? [];`<br>`		list.push(handler);`<br>`		this.extension.handlers.set(event, list);`<br>`	}` | `	on<F extends HandlerFn>(event: string, handler: F): () => void {`<br>`		const list = this.extension.handlers.get(event) ?? [];`<br>`		list.push(handler);`<br>`		this.extension.handlers.set(event, list);`<br>`		return createHandlerDisposer(this.extension.handlers, event, handler);`<br>`	}` |
| `packages/coding-agent/src/extensibility/hooks/loader.ts:15` | import từ `../utils` | `import { resolvePath, withHostGuard } from "../utils";` | `import { createHandlerDisposer, resolvePath, withHostGuard } from "../utils";` |
| `packages/coding-agent/src/extensibility/hooks/loader.ts:93` | `on` trong object literal của `createHookAPI` | `		on(event: string, handler: HandlerFn): void {`<br>`			if (!handlers.has(event)) {`<br>`				handlers.set(event, []);`<br>`			}`<br>`			handlers.get(event)!.push(handler);`<br>`		},` | `		on(event: string, handler: HandlerFn): () => void {`<br>`			if (!handlers.has(event)) {`<br>`				handlers.set(event, []);`<br>`			}`<br>`			handlers.get(event)!.push(handler);`<br>`			return createHandlerDisposer(handlers, event, handler);`<br>`		},` |
| `packages/coding-agent/src/extensibility/extensions/types.ts:1301–1365` | 47 overload `on(...)` trong `export interface ExtensionAPI` (khai báo ở **1277**) | `	on(event: "session_start", handler: ExtensionHandler<SessionStartEvent>): void;`<br>và 46 dòng nữa, trong đó 6 dòng đóng multi-line kiểu:<br>`	on(`<br>`		event: "session_before_switch",`<br>`		handler: ExtensionHandler<SessionBeforeSwitchEvent, SessionBeforeSwitchResult>,`<br>`	): void;` | hậu tố `): void;` → `): () => void;` trên **cả 47** khai báo (41 một-dòng + 6 multi-line, hậu tố nằm ở dòng đóng 1306/1311/1316/1321/1330/1336) |
| `packages/coding-agent/src/extensibility/hooks/types.ts:471–500` | 25 overload `on(...)` trong `export interface HookAPI` (khai báo ở 469) | `	on(event: "session_start", handler: HookHandler<SessionStartEvent>): void;`<br>và 24 dòng nữa, trong đó 1 dòng đóng multi-line ở 476–479:<br>`	on(`<br>`		event: "session_before_compact",`<br>`		handler: HookHandler<SessionBeforeCompactEvent, SessionBeforeCompactResult>,`<br>`	): void;` | hậu tố `): void;` → `): () => void;` trên **cả 25** khai báo |
| `packages/coding-agent/test/extensions-disposer.test.ts` | file test mới | *(chưa tồn tại)* | file mới, 4 case × 2 surface |

**Không đụng:** `packages/coding-agent/src/extensibility/hooks/types.ts:134` —
`) => (Component & { dispose?(): void }) | Promise<Component & { dispose?(): void }>,`
Đó là `dispose` của UI component, không phải disposer của handler.

**Các bước có neo đã kiểm.** Số dòng dưới đây là số phiếu đã mở và đọc, không phải số trong plan.

1. **Ghi baseline** — `cd packages/coding-agent && bun run check:types`. Script thật là `tsgo -p tsconfig.json --noEmit` (`package.json:523`); `tsconfig.json` có `"include": ["src", "test", "scripts"]` nên thư mục test nằm trong phạm vi. Đo ngày 29-09-2026: **exit 0, không lỗi nào**. Cổng là **"0 lỗi"**, không phải "không lỗi mới".
2. **Thêm helper vào `extensibility/utils.ts`** — file có 193 dòng, 4 export: `resolvePath` (15), `createNoOpUIContext` (31), `ExtensionExitError` (54), `withHostGuard` (118). `HandlerFn` **không** cần export: nó là alias cục bộ lặp y hệt ở `extensions/loader.ts:61`, `extensions/types.ts:1721`, `hooks/loader.ts:22`, cả ba đều là `(...args: unknown[]) => Promise<unknown>` và không chỗ nào export. Đặt `createHandlerDisposer` ngay trước `withHostGuard` (118); kiểu tham số viết bằng **kiểu cấu trúc** nên `Map<string, HandlerFn[]>` truyền vào không cần ép.
3. **Sửa phía extension** (`extensions/loader.ts`) — dòng **210** đổi `void` thành `() => void`; thêm `return createHandlerDisposer(this.extension.handlers, event, handler);` ngay trước dấu `}` đóng ở dòng **214**; dòng **40** thêm tên vào import đã có. Kiểm bắt buộc: dòng **179** là `class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime {` — `implements` là kiểm tra cấu trúc cứng. Cặp `list.push(handler)` (212) + `set` (213) giữ nguyên: function của caller lưu **nguyên tham chiếu, không bọc**.
4. **Sửa phía hook** (`hooks/loader.ts`) — dòng **93** đổi `void` thành `() => void`; thêm `return createHandlerDisposer(handlers, event, handler);` ngay trước `},` ở dòng **98**; dòng **15** thêm tên vào import. `handlers` là tham số đã capture trong closure của `createHookAPI` (khai báo dòng **76**), không phải `this.*`. Giữ nguyên `} as HookAPI;` ở dòng **128**; dòng 92 là `const api = {` — đừng đi săn dòng 92.
5. **Sửa 47 overload phía extension** (`extensions/types.ts` **1301–1365**, interface khai báo **1277**) — chỉ trong khoảng đó, thay hậu tố `): void;` ở dòng **đóng** của một khai báo `on(`. 6 khai báo multi-line đóng ở 1306, 1311, 1316, 1321, 1330, 1336. **KHÔNG** thay toàn cục: file còn có `notify` (260), `setStatus` (266), `setWorkingMessage` (269), `setWidget` (272), `setFooter` (275), `setHeader` (278), `setTitle` (281), `setEditorText` (295), `pasteToEditor` (303), `addAutocompleteProvider` (322), dòng đóng 333, `setToolsExpanded` (351), `abort` (482), `shutdown` (486), `clearTimer` (526), `addAdditionalContext?` (533) — tất cả phải giữ `void`. Số đúng là **47, không phải 41**; đếm bằng `awk 'NR>=1277' packages/coding-agent/src/extensibility/extensions/types.ts | rg -c '^\s*on\('` → 47, và `git diff --stat` phải ra **47** dòng đổi trong file này.
6. **Sửa 25 overload phía hook** (`hooks/types.ts` **471–500**, interface khai báo **469**) — 1 khai báo multi-line ở **476–479** (`session_before_compact`), hậu tố nằm ở dòng 479. `ttsr_triggered` nằm ở dòng **497**. Số đúng là **25, không phải 24** (24 một-dòng + 1 multi-line): `awk 'NR>=469' packages/coding-agent/src/extensibility/hooks/types.ts | rg -c '^\s*on\('` → 25. `rg -c 'on\(event: "'` cho 24 và sẽ cho 25 sau khi gộp dòng 476–479 — **đừng dùng con số đó làm cổng**.
7. **Viết 4 test case** — `packages/coding-agent/test/extensions-disposer.test.ts` (mới; thư mục `test/` có 791 file `.test.ts`). Chữ ký thật đã mở và đọc: `loadExtensionFromFactory(factory, cwd, eventBus, runtime, name = "<inline>")` tại `extensions/loader.ts:464` — nhận factory **inline** nên closure giữ được disposer, **không cần file tạm**; `loadHooks(paths, cwd)` tại `hooks/loader.ts:191` với `LoadHooksResult` ở `hooks/loader.ts:64` và `LoadedHook.handlers: Map<string, HandlerFn[]>` ở `hooks/loader.ts:50`; `createHookAPI` **không export** nên phía hook buộc đi qua `loadHooks`, tức dynamic-import một file thật, và module đó phải trả disposer về qua `globalThis` — đúng mẫu `extension-prepared-rebind.test.ts:46`. Dọn key `globalThis` trong `afterEach` bằng `Reflect.deleteProperty`. **Không** dùng `mock.module()`; **không** cần `vi.spyOn`.

**Hợp đồng test.** File: `packages/coding-agent/test/extensions-disposer.test.ts`. Mỗi case chạy trên **cả hai** surface (extension + hook) — hai object khác nhau, hai Map handler khác nhau.

- **Case 1 — Sibling sống sót sau một lần gỡ.** Đăng ký A, B, C cho một event. Dispose A. Khẳng định danh sách còn lại đúng `[B, C]` theo **identity của function**, không phải theo số đếm. *Người dùng thấy gì nếu hồi quy:* một handler đơn giản ngừng chạy, không có lỗi nào ở đâu — mọi điểm dispatch đều guard bằng độ dài danh sách (`hooks/runner.ts:174`, `:286`, `extensions/runner.ts:1193`). Hệ quả **không phải crash**, nên phải khẳng định identity: một khẳng định chỉ-đếm vẫn xanh với cả bug hoán đổi hai phần tử.
- **Case 2 — Key Map bị xoá khi danh sách rỗng.** Dispose handler cuối cùng, khẳng định `handlers.has(event) === false` **đọc trực tiếp trên Map**, không kiểm qua dispatch. *Lý do:* grep toàn `packages/coding-agent/src/` cho thấy **không có chỗ nào duyệt key của Map handler** — cả 20 điểm đọc đều là `.get(eventType)` rồi guard độ dài (`hooks/runner.ts:173, 285, 333, 365, 402`; `extensions/runner.ts:919, 1192, 1505, 1517, 1563, 1625, 1676, 1710, 1750, 1772, 1794, 1852, 1887, 1915, 1970`). Mảng rỗng để lại dưới key là **vô hình về hành vi**, nên khẳng định dựa trên dispatch sẽ **xanh trên cả bản cài đặt hỏng**.
- **Case 3 — Dispose hai lần là vô hại.** Đăng ký A, B, C. Dispose B (ở **giữa**) → `[A, C]`. Dispose B lần nữa → vẫn `[A, C]`. *Người dùng thấy gì nếu hồi quy:* đây là cái bẫt lệch-neighbour. Sau lần splice đầu, C đã trượt vào ô B đang chiếm; disposer khoá theo **chỉ số** sẽ đuổi C ở lần gọi thứ hai — một handler chưa từng bị chạm tới biến mất, và danh sách cứ thu nhỏ mỗi lần thử lại.
- **Case 4 — Caller bỏ qua giá trị trả về thì không bị ảnh hưởng.** Gọi `api.on(event, h)` như câu lệnh trần, rồi đăng ký thêm handler thứ hai cho cùng event; khẳng định danh sách có **cả hai, đúng thứ tự** và `handlers.has(event)` là `true`. *Người dùng thấy gì nếu hồi quy:* kiểu trả về của API công khai đổi từ `void` sang `() => void`, còn module ngoài đời bỏ qua giá trị đó — refactor vô tình đổi đường đăng ký sẽ hỏng chúng mà **không có lỗi biên dịch nào**.
- **Cấm trong test này:** `mock.module()` (rò registry toàn cục — Bun #12823); source-grep `loader.ts` để khẳng định disposer tồn tại; `not.toThrow()` trần; check "không rỗng"; và mọi mutation `globalThis` lâu dài không được dọn trong `afterEach`.
- **Stub trong test khác: không cần sửa.** Grep toàn repo xác nhận chỉ có **hai** cài đặt production: `ConcreteExtensionAPI` (`extensions/loader.ts:179`, `implements` cứng) và object literal của hook (`hooks/loader.ts:128`, `as HookAPI`). Sáu file test dựng stub một phần qua double assertion nên không có kiểm tra tương thích nào bắn vào: `autoresearch-tools.test.ts:70`, `autoresearch-git.test.ts:40`, `autoresearch-state.test.ts:474` và `:620`, `autoresearch-before-agent-start.test.ts:43` (đều là `} as unknown as ExtensionAPI;`), `modes/warp-events.test.ts:47` (là `} as never as ExtensionAPI;`).

**Cổng có đỏ được không.** Lệnh:

```bash
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types

cd /Users/tranquangdang21/Projects/ultraworkers && \
  bun test packages/coding-agent/test/extensions-disposer.test.ts

cd /Users/tranquangdang21/Projects/ultraworkers && \
  bun test packages/coding-agent/test/extensions-runner.test.ts \
            packages/coding-agent/test/extensions-discovery.test.ts \
            packages/coding-agent/test/plugin-extensions-discovery.test.ts
```

Trả lời thẳng từ phiếu: **Có, nhưng phải bỏ một bằng chứng giả mà plan đang dùng.**

| cổng | baseline đo ngày 29-09-2026 | đỏ được? |
| --- | --- | --- |
| `bun test .../extensions-disposer.test.ts` | file chưa tồn tại | **CÓ, thật.** Trước khi viết test, file không có → `bun test` báo không tìm thấy file. Sau khi viết test mà chưa sửa loader, `on` vẫn trả `undefined`, nên case gọi closure sẽ ném `TypeError: disposeA is not a function` → đỏ thật chứ không phải đỏ giả. |
| `bun run check:types` (nửa extension) | **exit 0, sạch tuyệt đối** | **CÓ, thật.** `class ConcreteExtensionAPI implements ExtensionAPI` (dòng 179) là kiểm tra cấu trúc cứng → sửa 47 overload mà quên dòng 210 thì đỏ ngay. |
| `bun run check:types` (nửa hook) | exit 0, sạch | **KHÔNG.** Đây là điểm quan trọng nhất. Cast `} as HookAPI;` (dòng 128) là **assertion**, không phải `implements`. Một hàm trả `() => void` gán được cho chữ ký trả `void` (quy tắc return-type-void của TypeScript), và phép so sánh cho `as` được thoả nếu **một** trong hai chiều đúng. Sửa `hooks/types.ts` mà quên `hooks/loader.ts` vẫn nhiều khả năng compile sạch và ship một disposer trả `undefined` lúc runtime. |
| 3 file regression suite | `extensions-runner.test.ts` chạy được: **87 pass, 0 fail** | **CÓ, thật** (nhưng là cổng hồi quy, không phải cổng chứng minh W1 xong). |

**Sửa lại cổng cho đỏ được:** cột "nửa hook" ở trên **phải bị loại khỏi danh sách cổng và chuyển thành lời cảnh báo**. `check:types` xanh **không** phải bằng chứng cho W1. Bằng chứng duy nhất cho nửa hook là **case 2 và case 3 chạy trên surface hook**. Đừng để ai chạy `check:types` xanh rồi kết luận W1 xong.

Hai tuyên bố của plan về baseline đã hỏng, giữ nguyên để không dùng làm cổng:

1. **"`bun run check:types` FAIL với đúng một lỗi — `test/collab/w3-probe.test.ts(76,15): error TS2352`"** → **SAI.** File đó **không tồn tại** (`ls` không có; `git ls-files --error-unmatch` không có trong index; thư mục `test/collab/` không chứa file nào tên `w3-probe`). Chạy thật: **exit 0, không dòng lỗi nào**. Bước 1 của plan (dời file ra `/tmp/` rồi khôi phục) và câu "lỗi DUY NHẤT còn lại là `w3-probe`" đều mất tác dụng.
2. **"cây bẩn — `packages/coding-agent/src/collab/crypto.ts` đang modified, chưa commit, +42/-1"** → **SAI.** `git status --short` cho file đó ra rỗng, cây sạch. (Mặt định cast mù **vẫn còn**: dòng 57 là `return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;` — đó là việc của W3, chưa ai làm.)

Về `bun check` và addon native: **không dùng `bun check` làm cổng** — nó là `check:ts` + `check:rs`, nửa Rust cần cargo và rất chậm. Addon native **đã được build sẵn** (`packages/natives/native/pi_natives.darwin-arm64.node`, 185 MB) — đã xác nhận bằng cách chạy thật `bun test packages/coding-agent/test/extensions-runner.test.ts` → **87 pass, 0 fail**. Nên bước build addon của plan không bắt buộc trên cây này, **nhưng kiểm tra lại trước khi tin**: nếu thiếu, `bun test` báo 0 pass với `Failed to load pi_natives native addon` và bạn không phân biệt được "test pass" với "test không hề chạy". Cổng hồi quy `extensions-discovery.test.ts` và `plugin-extensions-discovery.test.ts` phiếu **không chạy** (ngoài phạm vi kiểm neo) — hãy tự chạy.

**Cạm bẫy riêng của mục này.** Cái dễ làm sai nhất là **cạm bẫy 1 — tin `check:types` làm bằng chứng cho nửa hook**. Nó **im lặng** pass: nửa extension có `implements` cứng nên tự bảo vệ, nửa hook có `as HookAPI` thì không. `check:types` xanh với một `hooks/loader.ts` **hoàn toàn chưa sửa**, và người đó sẽ ship `off is not a function`. Chỉ case 2/case 3 trên surface hook mới bắt được.

Các cạm bẫy còn lại, đủ để không đi sai:

- **Cạm bẫy 2 — đếm sai 41 / 24 rồi dùng con số sai làm cổng.** Số thật là **47** và **25** vì regex bỏ sót khai báo multi-line. Nếu bạn tin 41 rồi sửa bằng `sed` trên khoảng 1301–1365, bạn sẽ sửa cả 47 — tốt — nhưng `git diff --stat` ra 47 khác 41 và bạn **nghi ngờ mình làm sai rồi revert**. Đó là thời điểm plan giết bạn. Ngược lại, sửa bằng regex chỉ khớp `on(event: "..."): void;` trên một dòng sẽ bỏ sót 6/1 khai báo multi-line → `check:types` đỏ ở nửa extension, còn nửa hook lại **xanh** với `session_before_compact` còn sót — một hợp đồng nửa vời.
- **Cạm bẫy 3 — khoảng dòng trong plan lệch đủ xa để dẫn sang interface khác.** `sed -n '1280,1340p'` vẫn cho một khối overload trông quen (chỉ thiếu 7 cái đầu), nên bạn có thể sửa xong tưởng đã xong. Tương tự: plan ghi `ToolDefinition` ở 636 (thật là dòng comment; khai báo ở **638**) và `ToolSessionEvent` ở 611 (thật là dòng comment; khai báo ở **618**) — vô hại vì W1 không sửa chúng, nhưng chúng đo độ tin cậy của nhóm neo dòng trong plan.
- **Cạm bẫy 4 — port nhầm tầng bọc của `pi-ref`.** Plan đánh dấu `pi-ref/.../extensions/loader.ts:256-271` là UNVERIFIABLE — **điều đó sai**: `pi-ref` là project anh em ở `/Users/tranquangdang21/Projects/pi-ref`, và neo 256–271 **chính xác tuyệt đối**. Plan đúng khi nói **omp không bọc** (`extensions/loader.ts:212` và `hooks/loader.ts:97` đều push trần), nên đóng over `handler` rồi `indexOf(handler)` là **đúng trong omp** và test phải khẳng định trên `handler` gốc. Nhưng **đừng sao chép** tầng `registeredHandler` của `pi-ref` — nó chạy được nhưng thêm một lớp gián tiếp không cần thiết mà không test nào bắt được; và **đừng** "sửa" `indexOf(handler)` thành `indexOf(registeredHandler)` — biến đó không tồn tại trong omp. `pi-ref` còn có `assertActive()` ở dòng 257, omp không có; không port cái đó.
- **Cạm bẫy 5 — case 2 viết thành "event không còn dispatch".** Đã nêu ở hợp đồng test; đáng nhắc lại vì nó âm thầm nhất. Phải đọc thẳng `handlers.has(event)`.
- **Cạm bẫy 6 — chạm nhầm `dispose` của UI component** ở `hooks/types.ts:134`. Cùng tên, khác nghĩa. Nếu bạn thấy mình gõ `dispose` trong file đó, dừng lại và kiểm tra dòng.
- **Cạm bẫy 7 — `createHookAPI` không export** (`hooks/loader.ts:76`). Test **không** import được nó; bắt buộc đi qua `loadHooks` (`:191`) và `Bun.write` một file hook tạm trả disposer qua `globalThis`. Đừng export `createHookAPI` chỉ để test — đó là thay đổi API production cho một work item về disposer.

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
- `blocks`: W12.

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

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W2.md`.

**Cảnh báo neo.** Nguyên văn từ phiếu:

> **Số dòng trong plan sai ở 7 chỗ, lệch tới +128.** Đây là cái dễ làm hỏng nhất vì nó *trông* đúng. `agent-session.ts:4983` mở ra là `}`; `:5218` mở ra là `3_000,`. Nếu bạn tin số và sửa, bạn sửa nhầm hoặc báo "không tìm thấy" rồi tự bịa.
>
> Cột "cited" là số trong work item. Cột "actual" là `sed -n "<n>p"` trên cây này. **Đây là bảng bạn dùng khi gõ — không dùng số trong plan.**

Các dòng sai trong bảng neo 36 dòng của phiếu:

| # | Cited | Actual | Verdict | Nội dung thật ở dòng actual |
| --- | --- | --- | --- | --- |
| 2 | `agent-session.ts:4983` | **`agent-session.ts:5104`** | ❌ **+121** | `for (const dispose of this.#disposers.splice(0)) dispose();` |
| 3 | `agent-session.ts:4981` (mở `beginDispose()`) | **`agent-session.ts:5102`** | ❌ **+121** | `beginDispose(): void {` |
| 4 | `agent-session.ts:5218` | **`agent-session.ts:5346`** | ❌ **+128** | `for (const dispose of this.#disposers.splice(0)) dispose();` |
| 5 | `agent-session.ts:5217` (comment) | **`agent-session.ts:5345`** | ❌ **+128** | `// beginDispose() drained the rest; this catches registrations made during teardown.` |
| 6 | `agent-session.ts:719` (field) | **`agent-session.ts:737`** | ❌ **+18** | `#disposers: Array<() => void> = [];` |
| 7 | `agent-session.ts:2179` (push) | **`agent-session.ts:2214`** | ❌ **+35** | `this.#disposers.push(dispose);` (trong `addDisposer`, mở tại 2213) |
| 8 | `agent-session.ts:250-255` "khối import `../utils/*`" | **251, 253, 254, 255, 256, 258, 259, 260** | ❌ hình dạng sai | Không phải khối liền mạch — xen kẽ import `@oh-my-pi/pi-tui`. Dòng 251 = `import { parseCommandArgs } from "../utils/command-args";` |
| 9 | `agent-session.ts:5183-5186` (tiền lệ try/catch) | **`agent-session.ts:5311-5315`** | ❌ **+128** | `try { releaseSharpshooterSession(this); } catch (error) { logger.warn("Session dispose: Sharpshooter release failed", { error: String(error) }); }` |
| 10 | `runner.ts:1347` | **`runner.ts:1376`** | ❌ **+29** | `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();` |
| 11 | `runner.ts:537` (field) | **`runner.ts:541`** | ❌ **+4** | `#fileFallbackDisposers: Array<() => void> = [];` |
| 12 | `runner.ts:777` / `:796` (push) | **`runner.ts:781`** / **`:800`** | ❌ **+4 / +4** | `this.#fileFallbackDisposers.push(` |
| 27 | `main.ts:1051` (`addDisposer(stop)`) | **`main.ts:1059`** | ❌ **+8** | `session.addDisposer(stop);` (cuối `watchScopedModelSettings`, mở tại 1035) |
| 30 | `CHANGELOG.md:3` = `## [Unreleased]` | `CHANGELOG.md:3` | ✅ dòng | **NHƯNG plan nói nó "rỗng" là SAI** — `### Security` đã nằm ở dòng 5. Thêm `### Fixed` **sau dòng 7**. |
| 35 | `pi-ref/…/chord/src/facets/host.ts:125-142` — "**không kiểm chứng được, tham chiếu không tồn tại**" | **FILE CÓ TỒN TẠI** | ❌ **đính chính của plan sai** | `dispose()` mở tại 125; `for (const effect of this.#effects.splice(0).reverse()) {` ở **129**; `if (errors.length === 1) throw errors[0];` ở **140** |
| 36 | Đính chính plan: "node_modules vắng mặt, cả hai cổng bị chặn" | node_modules **có** | ❌ **đính chính plan lỗi thời** | `bun test …/agent-session-dispose-concurrent.test.ts` → `5 pass, 0 fail`. `oxlint`/`oxfmt` có trong `node_modules/.bin/`. `bun run check:ts` chạy được nhưng **đã đỏ sẵn** (5 lỗi trong `collab-web`). |

Các neo **đúng** để dùng: `runner.ts:21-30` (dòng 30), `extension-ui-controller.ts:112`, `:86`, `:105`, `:36-37`, `:85`, `:93`, `:1203`, `:1222-1227`, `:1340`, `session-teardown.ts:70`, `:71`, `:62-64`, `:72-75`, `config/registry.ts:323`, `:319-322`, `package.json:53`, `test/agent-session-aside-delivery.test.ts:19`, 791 file `*.test.ts`, `git grep "for (const dispose of"` → **đúng 4 hit**. Ngoài ra `main.ts:1051` bị đính chính thành 1059, và chính bảng neo cũ của plan (4953 / 5188 / 1333 / 103) cũng đã cũ — lệch **+151, +158, +43, +9**.

**Bảng điểm sửa.** Cột TRƯỚC trích nguyên văn từ file thật (dấu thụt là **tab**, đã kiểm bằng `cat -A`; cả bốn dòng đều thụt 3 tab).

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/utils/disposers.ts` | `drainDisposers` (mới) | *(file không tồn tại)* | `export function drainDisposers(list: Array<() => void>): void` — vòng `while (list.length > 0)` + `pop()` + try/catch từng cái + `logger.warn`, không bao giờ ném lại |
| `packages/coding-agent/src/session/agent-session.ts:5104` | `beginDispose()` (mở tại `:5102`) | `for (const dispose of this.#disposers.splice(0)) dispose();` | `drainDisposers(this.#disposers);` |
| `packages/coding-agent/src/session/agent-session.ts:5346` | `#doDispose()` (mở tại `:5268`) | `for (const dispose of this.#disposers.splice(0)) dispose();` | `drainDisposers(this.#disposers);` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1376` | `disposeFileFallbacks()` | `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();` | `drainDisposers(this.#fileFallbackDisposers);` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112` | `disposeComposerShapes()` | `for (const dispose of this.#composerShapeDisposers.splice(0)) dispose();` | `drainDisposers(this.#composerShapeDisposers);` |
| `packages/coding-agent/src/session/agent-session.ts:251` | import | *(đứng trước `import { parseCommandArgs } from "../utils/command-args";`)* | `import { drainDisposers } from "../utils/disposers";` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:30` | import | *(đứng trước `import { addFileDeleteFallback, addFileWriteFallback } from "../../tools/file-write-fallback";`)* | `import { drainDisposers } from "../../utils/disposers";` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:37` | import | *(đứng trước `import { getEditorCommand, openInEditor } from "../../utils/external-editor";`)* | `import { drainDisposers } from "../../utils/disposers";` |
| `packages/coding-agent/test/disposer-drain.test.ts` | 3 test (mới) | *(file không tồn tại)* | xem nguyên văn ở hợp đồng test dưới đây |
| `packages/coding-agent/CHANGELOG.md:7` | `### Fixed` (mới) | *(chưa có)* | `- Fixed session teardown aborting early when a registered extension teardown callback throws.` |

**Thứ tự quan trọng.** Ba dòng import phải được thêm **SAU CÙNG**, không phải giữa lúc sửa call-site. Phiếu đã thử: chèn import trước làm `agent-session.ts:5104 → 5105`, `:5346 → 5347`, `runner.ts:1376 → 1377`, `extension-ui-controller.ts:112 → 113`. Sửa call-site trước, import sau.

Nội dung file mới `src/utils/disposers.ts` (đã chạy thật, 3/3 test xanh):

```typescript
import { logger } from "@oh-my-pi/pi-utils";

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
```

**Các bước có neo đã kiểm.** Số dòng dưới đây là số phiếu đã mở và đọc, không phải số trong plan.

1. **Tạo `packages/coding-agent/src/utils/disposers.ts`** với khối ở trên. Tiền lệ đặt file: `packages/coding-agent/src/utils/late-cleanup.ts` (13 dòng) — cùng thư mục, cùng cách import `logger` từ `@oh-my-pi/pi-utils`. Tiền lệ về hình thức lỗi: `session-teardown.ts:74` dùng `logger.warn("...", { error: String(err) })`; `agent-session.ts:5314` dùng `logger.warn("Session dispose…")`.
2. **`agent-session.ts:5104`** — đây là câu lệnh thứ hai của `beginDispose()` (mở tại **5102**), ngay sau `this.#isDisposed = true;` và ngay trước `this.#modelDiscoveryAbortController.abort();`. Thay bằng `drainDisposers(this.#disposers);`.
3. **`agent-session.ts:5346`** — thay bằng `drainDisposers(this.#disposers);`. Nó nằm ngay dưới comment ở dòng **5345**: `// beginDispose() drained the rest; this catches registrations made during teardown.` **Giữ nguyên comment đó** — nó là lý do duy nhất mà pass thứ ba tồn tại. Sửa đúng vị trí này: nó nằm trong `#doDispose()` (mở tại **5268**), **không phải** trong `dispose()` (**5138**, chỉ là hàm ủy quyền).
4. **`extensions/runner.ts:1376`** — thay bằng `drainDisposers(this.#fileFallbackDisposers);`. Đây là **toàn bộ thân** của `disposeFileFallbacks()`. Giữ nguyên JSDoc ngay trên nó (5 dòng).
5. **`modes/controllers/extension-ui-controller.ts:112`** — thay bằng `drainDisposers(this.#composerShapeDisposers);`. Đây là **toàn bộ thân** của `disposeComposerShapes()`. Giữ nguyên JSDoc một dòng ngay trên nó. **KHÔNG** đụng tới `#dialogQueue` (**`:93`**) — nó được drain FIFO bằng `.shift()` tại dòng 1340 và là hàng đợi trình diễn dialog, không phải teardown.
6. **Ba dòng import — làm SAU CÙNG, sau bước 2-5.** `agent-session.ts`: chèn ngay TRƯỚC dòng **251** `import { parseCommandArgs } from "../utils/command-args";` (lưu ý `../utils/*` không phải mộ...). `runner.ts`: chèn ngay TRƯỚC dòng **30** `import { addFileDeleteFallback, addFileWriteFallback } from "../../tools/file-write-fallback";`. `extension-ui-controller.ts`: chèn ngay TRƯỚC dòng **37** `import { getEditorCommand, openInEditor } from "../../utils/external-editor";`. Cả ba là import tĩnh top-level — **TUYỆT ĐỐI** không `await import()` / `import("...")` (AGENTS.md cấm).
7. **Tạo `packages/coding-agent/test/disposer-drain.test.ts`** — nguyên văn file đã format sẵn (oxfmt sạch), ba test, ba mệnh đề.
8. **`packages/coding-agent/CHANGELOG.md`** — `## [Unreleased]` ở dòng 3 **KHÔNG rỗng** như plan nói: nó đã có `### Security` ở dòng 5 (từ commit `5acb674`). Thêm `### Fixed` ngay **sau khối Security đó**. Một dòng, góc nhìn người dùng, không kể nguyên nhân gốc.
9. **Xác minh** — chạy đúng ba lệnh ở mục cổng dưới đây, theo thứ tự đó. Không chạy `tsc` / `npx tsc` (AGENTS.md cấm tuyệt đối; repo dùng `tsgo` qua `check:types`).

**Hợp đồng test.** File: `packages/coding-agent/test/disposer-drain.test.ts` (đã chạy thật, `3 pass / 0 fail`, oxfmt sạch). Ba case, ba mệnh đề:

1. **`runs disposers in reverse registration order`** — đẩy A, B, C; sau drain khẳng định `calls` đúng `["C", "B", "A"]` **và** `disposers` rỗng. *Điều người dùng thấy nếu hồi quy:* tài nguyên do A nắm giữ **còn sống** khi teardown của B đã chạy xong — một listener đã deregister, một watcher đã dừng, nhưng thứ mua sau nó vẫn còn treo. Đây đúng là rò rỉ mà milestone sinh ra để đóng. Test này là **khẳng định dễ hỏng nhất ở lần thử đầu**, vì code hiện tại ở cả bốn call-site đều là thứ tự thuận.
2. **`a throwing disposer does not stop later disposers and is logged`** — `vi.spyOn(logger, "warn")`; một disposer ném `Error("teardown boom")`, một disposer `survivor` đứng trước. Khẳng định `not.toThrow()`, `calls` đúng `["survivor"]`, và `warn` gọi **đúng 1 lần**. *Điều người dùng thấy nếu hồi quy:* không có try/catch thì một disposer ném lỗi **huỷ cả vòng lặp**, các teardown listener đăng ký trước nó không bao giờ chạy, và một settings watcher còn sống trên một session đã dispose. Không có `logger.warn` thì lỗi **im lặng**: người dùng báo "omp treo khi thoát" và log trống.
3. **`drains disposers registered during the drain`** — một disposer push thêm một disposer "late" vào chính danh sách đang drain. Khẳng định `calls` đúng `["early", "late"]` **và** `disposers` rỗng. *Điều người dùng thấy nếu hồi quy:* một helper chỉ `splice(0)` **một lần** để mảng còn phần tử và disposer đến muộn không bao giờ chạy. **Chỉ assert vòng đầu đã chạy sẽ lọt bug đó.**

**Cố ý KHÔNG phủ:** văn bản đúng của lời gọi `logger.warn`, số vòng drain, và mọi khẳng định về bản thân `beginDispose()` / `disposeFileFallbacks()` / `disposeComposerShapes()` — đó là call-site, hợp đồng nằm ở helper. Không source-grep file triển khai (AGENTS.md cấm tuyệt đối). Không dùng `mock.module()` (rò rỉ toàn cục, bun#12823) — chỉ `vi.spyOn`. Import subpath đã kiểm hoạt động: `packages/coding-agent/package.json:53` khai báo `"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }` nên `@oh-my-pi/pi-coding-agent/utils/disposers` resolve được; tiền lệ ở `test/agent-session-aside-delivery.test.ts:19`.

**Cổng có đỏ được không.** Chạy từ `/Users/tranquangdang21/Projects/ultraworkers` trừ khi ghi khác.

```bash
# Cổng 1 — ba test hợp đồng (kỳ vọng: 3 pass, 0 fail)
bun test packages/coding-agent/test/disposer-drain.test.ts

# Cổng 2 — grep tính đầy đủ của việc di dời (kỳ vọng: KHÔNG hit nào, exit 1)
git grep -n "for (const dispose of" -- packages/coding-agent/src

# Cổng 3 — lint + format + type, giới hạn trong package bị sửa (kỳ vọng: exit 0)
cd packages/coding-agent && bun run check && cd ../..
```

`git grep` không tìm thấy gì thì **exit code là 1**, không phải 0. Đừng đọc nhầm là fail.

- **Cổng 1 (test) — CÓ, thử bằng thực nghiệm chứ không suy luận.** Phiếu đã dựng bản đúng (xanh `3 pass / 0 fail`), rồi thay bằng từng bản sai: thứ tự thuận `list.shift()` → `2 pass, 1 fail`; chỉ `splice(0)` một lần không drain-tới-rỗng → `2 pass, 1 fail`; không try/catch → `2 pass, 1 fail`; ném lại kiểu chord `throw errors[0]` → `2 pass, 1 fail`; no-op rỗng → `0 pass, 3 fail`. Không bản sai nào lọt — cổng này không pass được với một bản no-op, vì mọi khẳng định đều đọc một mảng thứ tự chạy cụ thể hoặc một số lần gọi logger.
- **Cổng 2 (grep) — CÓ.** Đỏ ngay nếu còn sót drain thứ tự thuận. Trên cây sạch nó trả về **đúng 4 hit** (`agent-session.ts:5104`, `agent-session.ts:5346`, `runner.ts:1376`, `extension-ui-controller.ts:112`) và không có hit thứ năm; sau khi áp cả bốn thay đổi: **0 hit**. Đây là kiểm tra tính đầy đủ của việc di dời, **không** phải một khẳng định test.
- **Cổng 3 (check) — CÓ, đã thử.** `bun run check` trong `packages/coding-agent` là `oxlint . && oxfmt --check … && bun run check:types` (`tsgo -p tsconfig.json --noEmit`). Đã chứng minh nó đỏ: tạo một file tạm sai định dạng trong `src/utils/` → `Format issues found in above 1 files` / `error: script "check" exited with code 1` (file đó đã bị xoá). Sau khi format lại bốn file của W2, cổng này xanh trên chính các file của W2.

**⚠️ Cổng trong plan phải bỏ: `bun run check:ts`.** Cổng đó **không bao giờ xanh trên cây này**, và không liên quan gì đến W2. Chạy nó trên cây chưa đụng gì cho **5 lỗi type có sẵn trong `@oh-my-pi/collab-web`** (`scripts/mock-host.ts(345,14)`, `src/lib/client.ts(423,9)`, `(424,21)`, `test/client.test.ts(314,30)`, `test/transcript-polling.test.ts(62,30)`), không nằm trong `packages/coding-agent`. Nếu để cổng này trong checklist, nó sẽ luôn đỏ và bạn sẽ không bao giờ biết W2 có làm hỏng gì — đúng cái "cảm giác an toàn giả" phải tránh. Cổng 3 thay thế nó.

Đính chính môi trường: plan nói `node_modules` vắng mặt và cả `bun test` lẫn `check:ts` đều không chạy được — **sai trên cây này**. `node_modules` có tồn tại, `bun test packages/coding-agent/test/agent-session-dispose-concurrent.test.ts` chạy được (`5 pass, 0 fail`), `oxlint`/`oxfmt` đều có trong `node_modules/.bin/`. Không cần `bun install` trước. Cổng 1 **không** cần native addon.

**Cạm bẫy riêng của mục này.** Xếp theo mức nguy hiểm thật sự, nguyên văn từ phiếu:

1. **Số dòng trong plan sai ở 7 chỗ, lệch tới +128** — xem cảnh báo neo ở trên. Cái dễ làm hỏng nhất vì nó *trông* đúng.
2. **Thêm import trước khi sửa call-site làm lệch số dòng của chính call-site bạn đang sửa.** Đã thử: +1 ở cả bốn file. Sửa call-site trước, import sau (bước 6 nằm sau bước 2-5 là cố ý).
3. **Port hình dạng `throw errors[0]` của chord.** Bẫy nguy hiểm nhất về *hành vi*, nguy hiểm hơn nhiều so với plan nói. Lý do không ném lại không nằm ở "cho đẹp" — nó nằm ở thứ tự gọi trong `session-teardown.ts:70-72`: `deps.beginDispose();` **ở ngoài** cái `try` bọc `await deps.saveDraft(draftText);`. Một `beginDispose()` ném lỗi sẽ từ chối promise teardown **trước khi draft được ghi** — biến một rò rỉ có điều kiện (chỉ xảy ra khi một teardown callback ném lỗi) thành rò rỉ không điều kiện (mất draft, mất việc giải phóng job bash nền, mất event `session_shutdown` của extension, **mọi lần thoát**). Doc comment ngay trên (`session-teardown.ts:62-64`) nói thẳng điều đó. Bản port của chord **thuộc về `Facet.dispose()`** — một hợp đồng khác.
4. **Bản `splice`-một-lần âm thầm vứt bở disposer đăng ký trong lúc teardown đang chạy.** `agent-session.ts:5345` ghi nguyên văn: `// beginDispose() drained the rest; this catches registrations made during teardown.` Dùng `pop()` trong `while` như plan nói — `pop` cho thứ tự ngược tự nhiên, mutate thẳng mảng của caller (nên call-site không cần gán lại). Nếu bạn viết `for (const d of list.splice(0).reverse())` thì test 3 đỏ — đó là cơ chế bảo vệ, đừng "sửa" test.
5. **`#extensionTerminalInputUnsubscribers` là call-site thứ năm có cùng khuyết điểm, và có thật** (`extension-ui-controller.ts:1222-1227`). Một `unsubscribe` ném lỗi chặn phần còn lại. **Nhưng nó là `Set`, không phải `Array`** (khai báo dòng 85, thêm ở 1203), nên `drainDisposers(list: Array<() => void>)` không vừa. **Khuyến nghị của phiếu: trì hoãn, đừng sửa trong W2** — nó là listener input của TUI chứ không phải chuỗi teardown session, nên lập luận "không bao giờ ném" không áp dụng nguyên vẹn.
6. **Vòng `while` có thể quay vô tận nếu một disposer tự push lại chính nó.** Đã kiểm: mọi lần push đều ở `agent-session.ts:2214` (`addDisposer`), `runner.ts:781` và `:800`, `extension-ui-controller.ts:105` — không cái nào tự tham chiếu. **KHÔNG thêm trần lặp phòng thủ.** Một vòng lặp không chặn trung thực bộc lộ một disposer bệnh lý ngay lập tức; một trần lặp giấu nó thành treo im lặng.
7. **`#dialogQueue` trông giống nhưng KHÔNG phải drain.** Nó là `Array<() => void>` (`extension-ui-controller.ts:93`) và được drain bằng `.shift()` tại dòng 1340 — nhưng đó là **hàng đợi trình diễn dialog FIFO**, không phải teardown. Đừng "cho nhất quán" mà đụng vào nó.
8. **`oxfmt` là một phần của cổng.** Một test file viết tay bằng mảng closure nhiều dòng bị co lại một dòng. Nếu thấy `Format issues found`, chạy `node_modules/.bin/oxfmt <file>` từ repo root rồi chạy lại cổng — **đừng** viết lại test cho khớp format, hãy để formatter sửa.

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
| "Xác minh là `bun check && bun test packages/coding-agent/test/collab/crypto.test.ts`; native addon chưa build nên `bun test` bị chặn." | half wrong | Claim addon đúng với thư mục nhưng sai với file này. Ở trạng thái **chưa build addon**, `bun test packages/coding-agent/test/collab/` báo 29 pass / 21 fail kèm `Failed to load pi_natives native addon for darwin-arm64` — nhưng cả 21 lỗi đều thuộc file khác, còn `crypto.test.ts` pass 29/29 một mình vì nó không bao giờ nạp addon. Nên W3 **không** bị chặn: hãy chạy lệnh giới hạn theo file, kể cả khi chưa build addon. Sau khi build addon thì cả thư mục đều xanh. Ngoài ra `bun check` chạy `check:rs` (cargo) song song với `check:ts`; với thay đổi chỉ TypeScript thì dùng `bun run check:types` giới hạn cho `packages/coding-agent` (là `tsgo -p tsconfig.json --noEmit`, không phải tsc) cộng `bun run check:tools` cho oxlint/oxfmt — cả hai tạo thành đúng những gì `check:ts` làm cho package này. Bằng chứng: `bun test packages/coding-agent/test/collab/crypto.test.ts` → `29 pass 0 fail 68 expect() calls` trước khi thay đổi; `bun test packages/coding-agent/test/collab/` → `29 pass 21 fail 21 errors`; `cd packages/coding-agent && bun run check:types` → exit 0. |
| "Effort là ~40 dòng cộng một test." | understated | Thay đổi production là ~68 dòng code mới trong `crypto.ts` (map 18 hàng là 20 dòng, JSDoc cộng alias lookup ~14, hàm ~20) cộng một dòng sửa ở dòng 57, và test là ~75 dòng vì hợp đồng round-trip cần một fixture cho mỗi variant. Tổng ~145 dòng so với ~40 của plan. Vẫn chắc chắn là effort S, và toàn bộ là việc cơ học. Bằng chứng: đã áp thay đổi lên một bản sao scratch và đo: `crypto.ts` đi từ 67 → 100 dòng, khối test mới là 75 dòng, cả tsgo và oxfmt sạch ngay lần chạy đầu. |
| "Guard là kiểm tra field bắt buộc theo từng variant, phủ mọi variant đi qua biên giới giải mã." | confirmed, with a useful addition | Plan không nói có bao nhiêu variant. Có đúng **18** discriminant: `abort`, `agent-cmd`, `agents`, `bus`, `bye`, `entry`, `error`, `event`, `fetch-transcript`, `hello`, `prompt`, `snapshot-chunk`, `state`, `transcript`, `ui-request`, `ui-request-end`, `ui-response`, `welcome`. Chú thích map là `Record<CollabFrame["t"], readonly string[]>` (thay vì `Record<string, …>` thuần) khiến một variant bị quên trở thành lỗi compile — đã kiểm chứng: xoá hàng `error` cho ra TS2741 liệt kê cả 18 literal. Cách đó hẳn hơn danh sách tự duy trì bằng tay của plan và nên dùng. Bằng chứng: một file scratch dùng map có chú thích type-check sạch dưới tsgo; bỏ hàng `error: ["message"]` cho ra `src/collab/w3-scratch-verify.ts(4,7): error TS2741: Property 'error' is missing in type '{…}' but required in type 'Record<"abort" \| "agent-cmd" \| … \| "welcome", readonly string[]>'`. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W3.md`.

**Cảnh báo neo.** Trong 21 neo mà work item nêu, **17 đúng tuyệt đối** và **3 sai** — nhưng một trong ba sai nằm ở chỗ bạn sẽ gõ đầu tiên.

- **`protocol.ts:26` — HỎNG cả số dòng lẫn hình thức import.** Dòng 26 thật ra là `import type { CollabSessionState } from "@oh-my-pi/pi-tui/status-line/types";`. Import `session-entries` nằm ở dòng **28** và là đường dẫn **tương đối** `"../session/session-entries"`, **không** phải alias như plan nói. Hệ quả thực tế: import bạn viết trong file test **vẫn đúng** — nhưng lý do phải nêu là khác (alias resolve vì `packages/coding-agent/package.json` có `"./*"`). **Đừng** viết comment kiểu "giống hệt `protocol.ts:26`" — sai.
- **Sáu call site `emitSubagentFrame` trong `executor.ts` — HỎNG CẢ SÁU.** Plan ghi 1497, 1597, 2641, 2947, 3321, 4065. Số thật: 1497→**1505**, 1597→**1605**, 2641→**2694**, 2947→**3000**, 3321→**3374**, 4065→**4121** (lệch 8 tới 56 dòng). Cách tìm lại: `grep -n 'emitSubagentFrame' packages/coding-agent/src/task/executor.ts` → hit ở 1505, 1605, 2694, 3000, 3374, 4121 (dòng 85 là import, bỏ qua). Kết luận của plan về chúng ("đều truyền object literal cụ thể") **vẫn đúng** — nhưng danh sách neo thì không.
- **HEAD là `ecd516f` — CŨ.** Thật là `65cc6c1`.

Các neo **đúng, dùng được**: `collab/crypto.ts:57` (`return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;`), `:49` (doc comment của `open()`), file dài 67 dòng; `as CollabFrame` production duy nhất (`git grep` → đúng 9 hit: 1 ở `crypto.ts:57`, 8 ở test); `test/collab/crypto.test.ts` dài 270 dòng / 29 test / `29 pass 0 fail 68 expect() calls`; `:41` là dấu đóng `describe("collab crypto")`; `:2` và `:33`/`:39` (không `await`); `collab/protocol.ts:54` (`export type CollabFrame =`); `relay-client.ts:578` (caller production **duy nhất** của `open()`), `:582`, `:584`, `:675` + `674-691`, `:594` và `.catch` ở `595-597`; `packages/wire/src/index.ts:9-12`; và cơ chế exhaustive `Record<CollabFrame["t"], …>` → TS2741 (đã tự tái kiểm chứng **cả hai chiều**).

**Bảng điểm sửa.** Cột TRƯỚC trích nguyên văn từ file thật.

| Đường/dẫn | Symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/collab/crypto.ts` (chèn **trên** dòng 49) | `FRAME_REQUIRED_FIELDS` | *không tồn tại* | `const FRAME_REQUIRED_FIELDS: Record<CollabFrame["t"], readonly string[]> = { …18 hàng… };` + JSDoc giải thích required-field-vs-exact-shape |
| `packages/coding-agent/src/collab/crypto.ts` (ngay sau map) | `FRAME_REQUIRED_LOOKUP` | *không tồn tại* | `const FRAME_REQUIRED_LOOKUP: Readonly<Record<string, readonly string[] \| undefined>> = FRAME_REQUIRED_FIELDS;` — alias nới rộng, để tag lạ tra cứu không cần cast tại call site |
| `packages/coding-agent/src/collab/crypto.ts` (ngay sau alias) | `assertCollabFrame` | *không tồn tại* | `function assertCollabFrame(value: unknown): CollabFrame` — **không export**; 3 nhánh: không phải object → throw; `t` không phải chuỗi → throw; `!required` → `return value as CollabFrame` (nhánh tolerant); còn lại lặt `required` và throw khi `!(field in value)` |
| `packages/coding-agent/src/collab/crypto.ts:57` | `open()` | `	return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;` | `	return assertCollabFrame(JSON.parse(TEXT_DECODER.decode(plaintext)));` — **đây là toàn bộ thay đổi production bên trong `open()`**, không đụng gì khác |
| `packages/coding-agent/src/collab/crypto.ts:49` | JSDoc của `open()` | `/** Inverse of {@link seal}. Throws on auth failure or malformed input. */` | **giữ nguyên** — câu `Throws on auth failure or malformed input` vẫn đúng sau thay đổi |
| `packages/coding-agent/test/collab/crypto.test.ts:2-8` | import crypto | `…open,\n\tseal,\n} from "@oh-my-pi/pi-coding-agent/collab/crypto";` | thêm `sealSerialized` ngay **sau** `seal,` (thứ tự sort của oxfmt) |
| `packages/coding-agent/test/collab/crypto.test.ts:9-19` | import protocol | `type CollabFrame,\n\tDEFAULT_RELAY_URL,` | thêm `COLLAB_PROTO,` **giữa** `type CollabFrame,` và `DEFAULT_RELAY_URL,` (thứ tự sort ASCII: `C` < `D`) |
| `packages/coding-agent/test/collab/crypto.test.ts` (sau dòng 19) | import type-only | *không có* | `import type { SessionEntry, SessionHeader } from "@oh-my-pi/pi-coding-agent/session/session-entries";` và `import type { AgentSnapshot } from "@oh-my-pi/pi-wire";` |
| `packages/coding-agent/test/collab/crypto.test.ts` (chèn sau dòng 41) | fixture + `VARIANTS` | *không có* | `header`, `entry`, `agent`, `state` (hằng cấp module) + `const VARIANTS: CollabFrame[]` đủ 18 phần tử |
| `packages/coding-agent/test/collab/crypto.test.ts:42` (sau dòng 41) | `describe("collab frame decode guard")` | *không có* | 4 test: round-trip 18 variant / thiếu field bắt buộc / `t` không phải chuỗi / tag lạ vẫn qua |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` | chỉ có `### Security` | **phải TẠO MỚI** mục `### Fixed` + một dòng mô tả |

Nội dung map `FRAME_REQUIRED_FIELDS` — đã đối chiếu **từng hàng** với kiểu thật (`CollabFrame` tại `protocol.ts:54-96`, `GuestFrame`/`HostFrame` tại `packages/wire/src/index.ts:324-380`). Cột "Nguồn" là dòng của discriminant trong `wire/src/index.ts`:

| Hàng | Field bắt buộc | Field **optional** (KHÔNG được đưa vào) | Nguồn |
| --- | --- | --- | --- |
| `hello` | `proto`, `name` | `writeToken?` | wire:326 |
| `prompt` | `text` | `images?` | wire:336 |
| `ui-response` | `reqId` | `value?` | wire:337 |
| `abort` | *(rỗng)* | — | wire:338 |
| `agent-cmd` | `cmd`, `agentId` | `text?` | wire:339 |
| `fetch-transcript` | `reqId`, `agentId`, `fromByte` | — | wire:340 |
| `welcome` | `proto`, `header`, `state`, `agents`, `entryCount` | `readOnly?` | wire:347 |
| `snapshot-chunk` | `entries`, `final` | — | wire:368 |
| `entry` | `entry` | — | wire:369 |
| `event` | `event` | — | wire:370 |
| `state` | `state` | — | wire:371 |
| `bus` | `channel`, `data` | — (`data: unknown` là bắt buộc về mặt kiểu) | wire:373 |
| `agents` | `agents` | — | wire:374 |
| `ui-request` | `request` | — | wire:375 |
| `ui-request-end` | `reqId` | — | wire:376 |
| `transcript` | `reqId`, `text`, `newSize` | `error?` | wire:378 |
| `bye` | `reason` | — | wire:379 |
| `error` | `message` | — | wire:380 |

Tổng cộng **18 hàng**, khớp đúng 18 discriminant mà `Record<CollabFrame["t"], …>` liệt kê trong thông báo TS2741.

**Các bước có neo đã kiểm.**

1. **Chèn khối guard vào `crypto.ts`, ngay trên dòng 49.** Dòng 47 là `	return out;` (đóng `sealSerialized`), 48 trống, 49 là doc comment của `open()`. Chèn map + alias + hàm vào khoảng trắng giữa 48 và 49. Dùng **tab** để thụt (`sed -n '16p' …crypto.ts | cat -A` → `^I^Iconst key = …`; oxfmt cũng ép tab). **Sau khi chèn, doc comment của `open()` dời xuống khoảng dòng 118 — đừng dùng số dòng cũ 49/57 sau khi đã chèn.**
2. **Để `Record<CollabFrame["t"], readonly string[]>` làm cơ chế exhaustive.** Chú thích này là thứ biến một variant bị quên thành lỗi compile. **Đừng sửa tay** nếu tsgo phàn nàn — hãy sửa đúng hàng thiếu. Nếu bạn vừa thêm variant mới vào `CollabFrame` (`protocol.ts:54`) thì phải thêm hàng tương ứng, và build đỏ với TS2741 là **đúng ý**.
3. **Thay dòng 57 (trước khi chèn khối ở bước 1).** Đây là **toàn bộ** phần sửa trong `open()`. Không đụng vào kiểm tra `data.byteLength <= IV_LENGTH` (51-53), hai lời gọi `asStrict` (54-55), hay `crypto.subtle.decrypt` (56).
4. **Bổ sung import cho file test.** `sealSerialized` vào khối import crypto (hiện 2-8), ngay sau `seal,`. `COLLAB_PROTO` vào khối import protocol (hiện 9-19), giữa `type CollabFrame,` và `DEFAULT_RELAY_URL,`. Hai import type-only mới đặt sau khối import protocol. Cả hai alias đều resolve (đã tự kiểm bằng cách biên dịch một file thử dùng đúng hai import này — sạch, 0 lỗi). **Không** chuyển sang đường dẫn tương đối `../../src/collab/crypto` như một số file test anh em dùng; file này đã theo alias.
5. **Chèn fixture + `VARIANTS` + khối `describe("collab frame decode guard")` sau dòng 41.** Dòng 41 là `});` đóng `describe("collab crypto")`, 42 trống, 43 bắt đầu `describe("collab link format", …)`. Chèn vào khoảng trắng giữa 41 và 43 để 29 test cũ vẫn nằm trên đầu file. Đã biên dịch thử **đúng bộ fixture và bảng 18 phần tử như plan viết**: sạch, 0 lỗi. Các shape quan trọng đã đối chiếu: `header` — `SessionHeader` (`session-entries.ts:35`); `entry` — `SessionEntry` (`session-entries.ts:300`) → `SessionMessageEntry` (`:75`), `UserMessage` (`packages/ai/src/types.ts:1017`); `agent` — `AgentSnapshot` (`packages/wire/src/index.ts:238`); `state` — `CollabSessionState` = `SessionState & {…}` (`packages/tui/src/status-line/types.ts:19`), `Participant` (`wire/src/index.ts:217`) cần `name` + `role: "host" | "guest"`; `{ t: "ui-request", request: { kind: "editor", title: "Edit", reqId: 3 } }` (`wire/src/index.ts:322`); `{ t: "event", event: { type: "model_changed" } }` — `model_changed` có thật (`agent-session.ts:9675`).
6. **Chạy test** — `cd /Users/tranquangdang21/Projects/ultraworkers && bun test packages/coding-agent/test/collab/crypto.test.ts`. Kỳ vọng **33 pass / 0 fail** (29 sẵn có + 4 mới). Nếu test round-trip đỏ, guard đang quá chặt — đối chiếu lại danh sách optional ở bảng trên (`writeToken`, `images`, `readOnly`, `value`, `text` trên `agent-cmd`, `error` trên `transcript`).
7. **Chạy type check + lint/format** — `cd packages/coding-agent && bun run check:types` (`tsgo -p tsconfig.json --noEmit` — **KHÔNG phải tsc**) và `cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:tools` (`oxlint . && oxfmt --check …`). `check:tools` sẽ báo một cảnh báo oxlint **có sẵn từ trước, không phải của bạn**: `test/mcp-project-config-not-trusted-by-default.test.ts:19:10: warning eslint(no-unused-vars): Identifier 'getConfigRootDir' is imported but never used.` Nếu oxfmt báo file mới cần format: `bun run fmt`.
8. **CHANGELOG.** `## [Unreleased]` ở `packages/coding-agent/CHANGELOG.md:3` hiện **chỉ có `### Security`** (dòng 5) — **chưa có `### Fixed`**. Bạn phải TẠO mục `### Fixed`, không phải thêm vào mục có sẵn. Đặt sau `### Security`. Gợi ý dòng: `Fixed malformed collab frames being accepted at the decode boundary instead of being rejected before the frame handler.`
9. **Không commit.** Quy tắc repo: "NEVER commit unless asked". Để cây bẩn cho người review.

**Hợp đồng test.** File: `packages/coding-agent/test/collab/crypto.test.ts`, khối mới `describe("collab frame decode guard")`, **4 test**, đặt sau dòng 41.

1. `round-trips a well-formed frame of every CollabFrame variant` — seal rồi open từng phần tử của `VARIANTS` (18 phần tử), assert `toEqual(frame)`.
2. `rejects a decoded frame missing a required field at the guard` — `sealSerialized(key, JSON.stringify({ t: "hello", proto: COLLAB_PROTO }))`, assert reject `/missing required field "name"/`.
3. `rejects a payload whose discriminator is not a string` — lặp `["{}", "[]", "null", "7", '"str"', JSON.stringify({ t: 42 })]`, assert reject.
4. `accepts a variant this build does not know` — payload `{ t: "future-thing", payload: { anything: true } }`, assert mở ra đúng nguyên vẹn.

| Hồi quy | Test bắt | Triệu chứng vận hành |
| --- | --- | --- |
| Guard siết thành exact-shape (chặn field lạ) | test 1 | Peer cũ/mới bị từ chối ngay lúc `hello`, guest không bao giờ nhận được `welcome` |
| Mất nhánh tolerant `if (!required) return` | test 4 | Mọi khung mang tag lạ — tức mọi bản build mới hơn — ném lỗi `collab frame "…" is missing required field` |
| Xoá hẳn guard | test 2 + 3 | Khung hỏng lọt qua, nổ muộn thành `TypeError` trong `CollabHost`/`CollabGuestLink` |
| Đưa nhầm field optional vào danh sách bắt buộc | test 1 | **Nguy hiểm nhất — xem dưới** |

Triệu chứng cụ thể của hồi quy nguy hiểm nhất, đã truy vết tới tận chỗ hiện ra: `open()` chỉ có **một** caller production là `relay-client.ts:578`; catch của nó rẽ theo vai trò (`relay-client.ts:579-587`). Phía **host** (`:582`) chỉ `logger.debug("collab: ignoring undecryptable guest frame")` rồi drop khung — người dùng **không thấy gì**. Phía **guest** (`:584`): `this.#failFatal("bad key or corrupted frame")` → `relay-client.ts:675-691` đặt `#closed = true`, `ws.close(1000)`, gọi `onClose(reason, false)` — **không reconnect**, và doc comment ở dòng 674 tự viết: `/** Decryption failure: wrong key or corrupted frame. Never reconnect. */`. `onClose` của guest xử lý ở `guest.ts:349-364`: nếu đã join xong và `willReconnect === false` → `this.#ctx.showStatus(\`Collab session ended (${reason})\`)` ở dòng 362, hiện đúng dòng `Collab session ended (bad key or corrupted frame)` rồi `#restoreAfterDisconnect()`. Nghĩa là **một khung hợp lệ bị guard chặt nhầm giết vĩnh viễn phiên collab phía guest**, người dùng phải vào lại bằng link, và thông báo hoàn toàn sai. Không có dòng log nào ở phía guest để chẩn đoán.

**Không** test cái này: chỉ số variant, thứ tự key trong object, hay bất kỳ chi tiết nội bộ nào khác.

**Cổng có đỏ được không.**

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
bun test packages/coding-agent/test/collab/crypto.test.ts          # 33 pass / 0 fail
cd packages/coding-agent && bun run check:types && cd ../..       # exit 0
bun run check:tools                                                 # oxlint + oxfmt --check, sạch
```

Câu trả lời thẳng từ phiếu: **Có — nhưng chỉ một chiều, và câu trả lời thẳng là: KHÔNG bảo vệ bạn khỏi lỗi nguy hiểm nhất.**

- **`check:types` — hai chiều, đây là cổng đáng tin nhất.** Đã tạo một file thử trong `src/collab/` với đúng 18 hàng của plan: đủ 18 hàng → **không** TS2741 nào; bỏ hàng `error: ["message"]` → `error TS2741: Property 'error' is missing in type '{…}' but required in type 'Record<"abort" | "agent-cmd" | …>`. Cơ chế exhaustive là thật, và nó bắt đúng lớp lỗi nó nói là bắt.
- **`bun test` — một chiều.** Bắt được: xoá guard (test 2, 3 đỏ), mất nhánh tolerant (test 4 đỏ), siết exact-shape (test 1 đỏ). Nhưng nó **không** bắt được guard quá chặt đối với một hình dạng khung thật mà bộ fixture không nghĩ tới. Test 1 chỉ round-trip 18 khung mà chính người viết test dựng ra — nó chứng minh "guard không chặn 18 hình dạng này", **không** chứng minh "guard không chặn bất kỳ hình dạng thật nào". Lỗ hổng cụ thể nhất: `data` trên variant `bus` có kiểu `unknown`; nếu một call site tương lai truyền `undefined`, `JSON.stringify` **bỏ hẳn key**, guard throw, và **mọi** guest đang nối tới host đó chết cùng lúc.
- **`check:tools` — một chiều, và chỉ về style.** Bắt được import thừa, sai thụt, sai format. Không bắt được gì về hành vi.

**Vấn đề nghiêm trọng hơn nhiều: cây này đang dùng chung, và cổng KHÔNG ĐỎ ĐƯỢC ở thời điểm bạn chạy.** Trong lúc kiểm chứng, `check:types` **đã đỏ trước khi W3 viết một dòng nào**, vì những file probe tạm của phiên khác nằm trong cây (`test/collab/__w5probe.ts`, `test/collab/web-wire.types.ts`, `test/zz-w9-probe.test.ts` — untracked). Chúng **thay đổi trong lúc phiếu đang kiểm chứng**; có phiên khác đang chạy W5 và W9 trên cùng cây. Nếu bạn xoá chúng để "làm cổng xanh", bạn vừa phá việc của người khác, vừa có thể xoá mất một phát hiện thật của W5.

**Cổng viết lại cho đỏ được — làm theo đúng thứ tự này:**

1. **Trước khi sửa gì, chụp lại baseline** (lưu output bằng `tee`): `bun test …/crypto.test.ts`, `(cd packages/coding-agent && bun run check:types)`, `bun run check:tools`, `git status --porcelain`.
2. **Sửa.**
3. **Chạy lại ba lệnh.**
4. **Chỉ quy kết đỏ cho thay đổi của bạn khi**: danh sách lỗi mới là **tập chứa thứ hơn hơn** của danh sách baseline (`comm -13 <(sort /tmp/w3-base-types.log) <(sort /tmp/w3-new-types.log)`) **và** có nhắc `collab/crypto.ts` hoặc `test/collab/crypto.test.ts`. Lỗi ở file lạ = của người khác.
5. **Đừng xoá file untracked của người khác.** Nếu chúng làm bạn không đọc được kết quả, hãy báo lại thay vì dọn.

**Định nghĩa "xong" chính xác** (đừng chỉ nhìn con số): `bun test …/crypto.test.ts` in ra `33 pass` / `0 fail` **và** trong đó có đủ 4 tên test mới; `check:types` exit 0 — và riêng exit 0 này đã chứng minh map đủ 18 hàng, vì thiếu một hàng là TS2741; `check:tools` exit 0 (bỏ qua warning `no-unused-vars` có sẵn).

Một claim của plan đã cũ: plan nói `bun test packages/coding-agent/test/collab/` báo `29 pass / 21 fail` vì thiếu native addon. Chạy lại: **`232 pass / 0 fail` trên 22 file** — addon đã được build. Giới hạn theo file vẫn nên làm (tín hiệu sạch hơn, nhanh hơn), nhưng lý do đã không còn là "bị chặn".

**Cạm bẫy riêng của mục này.** Xếp theo mức độ tốn thời gian nếu làm sai.

**1. Đây là work item duy nhất trong W-wave mà một sửa sai giết chết phiên của người dùng — không chỉ mất một khung.** Đã truy ở phần hợp đồng test: `open()` có đúng một caller production (`relay-client.ts:578`), và catch rẽ theo vai trò: host thì log rồi drop, **guest thì `#failFatal` → `#closed = true` → không reconnect**. Trong khi chỉnh, hãy tự hỏi "khung này có thể hỏng vì một field optional mà tôi vừa đưa nhầm vào bắt buộc không".

**2. Ba test sẵn có ở dòng 33 và 39 không `await` `expect(...).rejects`** (đã xác minh bằng `sed -n '33p;39p'`). Assertion của chúng trôi lơ lửng, Promise rejection không được kiểm. **Đừng sao chép mẫu này vào test mới** — trong 4 test mới, cả ba test dùng `rejects` đều phải `await`.

**3. Test cuối không có local `const opened: unknown` thì không compile.** Bun định kiểu `toEqual(expected: T)` với `T` suy ra từ actual, nên object variant-lạ không gán được cho kiểu trả về `CollabFrame`. Ép `as CollabFrame` trực tiếp bị từ chối (TS2352, không overlap); `as unknown as CollabFrame` compile được nhưng là double assertion. Local kiểu `: unknown` là cách sạch duy nhất.

**4. `role: "host" as const` trong fixture `state` là bắt buộc, không phải thừa.** `Participant.role` là `"host" | "guest"` (`wire/src/index.ts:219`); bỏ `as const` thì object literal suy ra `role: string` và không gán được cho `CollabSessionState`.

**5. Số dòng trong plan đã cũ ở ba chỗ, và chúng sẽ càng cũ hơn sau bước 1.** `protocol.ts:26` → thật là `:28`; sáu neo `executor.ts` → lệch từ 8 đến 56 dòng; HEAD `ecd516f` → thật là `65cc6c1`. Đặc biệt, **ngay khi bạn chèn khối guard ở bước 1, dòng 49 và 57 của `crypto.ts` dời xuống khoảng 118 và 126** — mọi neo dòng trong plan nói về `crypto.ts` chỉ đúng trước bước 1.

**6. Cây dùng chung với các phiên W5/W9 đang chạy.** Không phải cảnh báo lý thuyết: trong lúc kiểm chứng, `check:types` đã đỏ vì probe của người khác rồi lại xanh, không phải vì W3.

**7. `### Fixed` chưa tồn tại trong CHANGELOG.** `## [Unreleased]` chỉ có `### Security`. Bạn đang **tạo mới** mục, không phải thêm dòng vào mục sẵn có.

**8. Nội dung mã phải dùng tab.** Đã kiểm bằng `cat -A`. `oxfmt --check` là một phần của `check:tools` nên sai thụt sẽ đỏ, nhưng chạy `bun run fmt` sớm hơn đỡ vòng lặp.

Quy mô chạm: `src/collab/crypto.ts` +33 dòng và 1 dòng thay trong `open()` (67 → ~100 dòng); `test/collab/crypto.test.ts` +4 import, +5 fixture, +20 dòng `VARIANTS`, +26 dòng 4 test (270 → ~325 dòng); `CHANGELOG.md` +3 dòng. **Không** export `assertCollabFrame`, **không** thêm file mới, **không** đụng `relay-client.ts`, `protocol.ts`, hay bất kỳ call site `emitSubagentFrame` nào.

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

Không dùng blocker mà văn bản đề bài nêu làm baseline: nó nói `bun test` báo `Failed to load pi_natives native addon for darwin-arm64`. Đó là đúng **sau khi** `bun install` — và nó là thiếu một bước build, không phải hạn chế của máy. Trên máy sạch lỗi đầu tiên thật sự xuất hiện sớm hơn và là `Cannot find module '@oh-my-pi/pi-agent-core'`, vì `node_modules` chưa có. Chuỗi tiền đề đầy đủ, theo đúng thứ tự: `bun install` → `brew install ninja` → `bun --cwd=packages/natives run build`. Sau hai bước cuối thì toàn bộ suite chạy.

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
| "ENVIRONMENT: native addon chưa build, nên `bun test` hiện báo 0 pass với 'Failed to load pi_natives native addon for darwin-arm64'. Xác minh bằng `bun run check:ts` (không cần addon)." | SAI ở chỗ **thứ tự** tiền đề, đúng ở chỗ cần addon | `bun run check:ts` không cần addon là đúng. Nhưng trên máy sạch, cả hai lệnh đều fail **sớm hơn** và vì lý do khác: checkout không có thư mục `node_modules` nào cả. `bun test packages/coding-agent/test/acp-agent.test.ts` fail với `Cannot find module '@oh-my-pi/pi-agent-core'` (1 fail, 1 error) — chưa tới thông báo native-addon. `bun run check:ts` chết ngay ở sub-step đầu tiên: `check:tools` → `oxlint: command not found`, exit 127, nên typecheck chưa bao giờ chạy. Chuỗi tiền đề thật là `bun install`, rồi `brew install ninja` + `bun --cwd=packages/natives run build`; làm xong hai bước sau thì cổng test của W4 chạy bình thường. Người tin văn bản đề bài sẽ tưởng `bun run check:ts` là baseline chạy được và mất thời gian phát hiện ra là không. |
| "chỉ `:1253` và `:1268` gọi `#assertMatchingCwd`", `#assertMatchingCwd` định nghĩa ở `:1391`; và có đúng bảy site `#sessions.get` chưa kiểm tra, gồm `:2126`.| ĐÚNG — không cần đính chính | Bản đếm lại của plan (được đánh dấu C18/A2 trong văn bản plan) là chính xác. Xác nhận độc lập: bảy chỗ `.get` ở 758, 1251, 1266, 1384, 1400, 2101, 2126; định nghĩa ở 1391; chỉ gọi ở 1253 và 1268. Lưu ý :2126 là `if (this.#sessions.get(sessionId) !== record) {` — một phép so khớp danh tính với record đã bắt, không phải kiểm tra attachment, đúng như plan nói. Dòng 721 là một vòng lặp `#sessions.values()` (không phải `.get`) và 1181 là dòng đang sửa; cả hai không thuộc bảy site. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W4.md`.

**Cảnh báo neo.** Nguyên văn từ phiếu:

> **Số neo đã kiểm: 39. Đúng: 34. Sai/hỏng: 5.**

| claim trong plan | thực tế | ảnh hưởng tới việc gõ |
| --- | --- | --- |
| `packages/coding-agent/src/session/agent-session.ts:11210` là chữ ký `AgentSession.fetchUsageReports` | Chữ ký thật ở **`:11356`**: `async fetchUsageReports(signal?: AbortSignal): Promise<UsageReport[] \| null> {`. Dòng 11210 là dòng cuối của một khối JSDoc | lệch **+146** dòng |
| HEAD là `ecd516f35b6…` | HEAD thật `65cc6c181311b045a163680badee8d3a55c760cd`. Bảy neo của plan vẫn resolve **đúng** tại HEAD này, nên không neo nào cần dịch | Vô hại với code; nhưng **đừng ghi `ecd516f` vào PR** |
| "checkout này hoàn toàn không có `node_modules`"; `bun test` fail với `Cannot find module '@oh-my-pi/pi-agent-core'`; `bun run check:ts` chết ở `oxlint: command not found` | `node_modules` tồn tại. `bun test` chạy được (78 test xanh trước thay đổi). `oxlint`/`oxfmt` có trong `node_modules/.bin/`. | Xoá hẳn bước tiền đề của plan |
| "file test … 3488 dòng" | `wc -l` → **3450** | Vô hại; chỉ đừng dùng con số này trong PR |
| Bảng "Đính chính" của plan: "`pi-ref/` không tồn tại trong repo này, nên các dòng được trích không thể kiểm tra và không được trích trong khối comment" | **Sai.** `/Users/tranquangdang21/Projects/pi-ref` tồn tại; `packages/server/test/conformance.test.ts` tồn tại và hai dòng `:223` và `:246` **đúng như plan trích** | cho phép trích nguyên văn bằng chứng ngoài repo |

Các neo **đúng, dùng được**: `acp-agent.ts:1180` (`case "_omp/usage": {`), `:1181`, `:1182`, `:1183-1185`, `:1186`, `:1187`; `:758` (`closeSession`), `:1251` (`#loadManagedSession`), `:1266` (`#resumeManagedSession`), `:1384` (`#getSessionRecord`), `:1400` (`#resolveForkSourceSessionPath`), `:2101` (trong `setTimeout` của `#scheduleBootstrapUpdates`, định nghĩa `:2077`), `:2126` (`#emitBootstrapUpdates`); `:1391` (`#assertMatchingCwd`) với hai call site duy nhất `:1253` + `:1268`; `:1383`; bốn call site của `#getSessionRecord` là `:767, 778, 824, 1076`; `:1131` (`async extMethod(method, params: { [key: string]: unknown })`) và switch `1131-1208` có 6 case, **không** case nào đọc `sessionId`; `:721` (vòng lặp `for (const record of this.#sessions.values())`); test `:6`, `:117`, `:147`, `:551`, `:556`, `:558-561`; `catalog/src/types.ts:138` (`export type Provider = string;`); `ai/src/usage.ts:139` (`export interface UsageReport {`); `pi-ref …/conformance.test.ts:223` và `:246`.

**Bảng điểm sửa.** TRƯỚC/SAU dưới đây là **diff thật đã chạy qua `git diff`**, không phải viết lại từ trí nhớ.

Thân `case "_omp/usage":` tại `packages/coding-agent/src/modes/acp/acp-agent.ts` dòng 1180 (tab = 3 cho `case`, 4 cho thân). TRƯỚC (`sed -n '1180,1188p'`):

```ts
		case "_omp/usage": {
			const [firstRecord] = this.#sessions.values();
			const target = firstRecord?.session ?? this.#initialSession;
			if (!target) {
				return { reports: [] };
			}
			const reports = await target.fetchUsageReports();
			return { reports: reports ?? [] };
		}
```

SAU (4 dòng thay 2 — `+3/-1`; `git diff --stat` → `4 +++-`):

```ts
		case "_omp/usage": {
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

Bất đối xứng này là **có chủ đích** và là điểm cốt lõi của fix:

| `params.sessionId` | resolve thành | lý do |
| --- | --- | --- |
| không có | `#sessions.values()[0]`, rồi `#initialSession` | giữ nguyên chuỗi cũ cho external client không bao giờ gửi nó |
| có, tìm thấy | `#sessions.get(sessionId)` | đây là fix |
| có, **không** tìm thấy | `undefined` → `{ reports: [] }` | fallback chính là bug đang sửa |

Gộp hai nhánh sau vào một biểu thức (`?? this.#initialSession` cho mọi trường hợp) là tái tạo đúng bug.

`packages/coding-agent/test/acp-agent.test.ts` — 4 chỗ:

| vị trí | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| dòng 6 | import top-level | `import type { Model } from "@oh-my-pi/pi-ai";` | `import type { Model, UsageReport } from "@oh-my-pi/pi-ai";` |
| dòng 147, trong `class FakeAgentSession` (`:117`) | field + method | *(không tồn tại)* | `usageReports: UsageReport[] \| null = null;` + `async fetchUsageReports(): Promise<UsageReport[] \| null> { return this.usageReports; }` |
| ngay trên `advanceBootstrapGuard()` (`:551`) | helper ở module scope | *(không tồn tại)* | `function usageReportFor(sessionId: string): UsageReport { return { provider: "test-provider", fetchedAt: 0, limits: [], metadata: { sessionId } }; }` |
| ngay dưới `describe("ACP agent", () => {` (`:556`) | test mới | *(không tồn tại)* | xem hợp đồng test dưới đây |

`git diff --stat` sau khi áp cả hai file: `32 insertions(+), 2 deletions(-)` (4 dòng ở `acp-agent.ts`, 30 dòng ở test).

**Bảy khối comment (phần không đoán được bằng máy).** Dùng **một** khối giải thích đầy đủ tại `#getSessionRecord` (`:1384`) và **sáu** cross-reference 2 dòng tại các site còn lại.

**Các bước có neo đã kiểm.** Mọi neo dưới đây đã được mở và đọc ở HEAD `65cc6c1`. Wave trước có thể làm trôi số dòng — **khớp theo text trong ngoặc**, không khớp theo số trần.

1. **Xác nhận neo case handler** — `rg -n '_omp/usage' packages/coding-agent/src/modes/acp/acp-agent.ts`, kỳ vọng `1180:			case "_omp/usage": {`. Nếu khác, đọc quanh dòng trả về.
2. **Sửa thân case** (thay 2 dòng, thêm 3) theo khối ở bảng điểm sửa. Giữ nguyên `if (!target) { return { reports: [] }; }` và `return { reports: reports ?? [] };` — đó là hợp đồng có sẵn, không phải chỗ để cải thiện. Bắt buộc phải có `typeof params.sessionId === "string"`: chữ ký `extMethod` là `async extMethod(method: string, params: { [key: string]: unknown })` (dòng 1131), nên `params.sessionId` có kiểu `unknown` và **không** truyền thẳng vào `.get()` được.
3. **Sáu cross-reference comment** — thêm ngay phía trên từng dòng sau, 2 dòng comment không có gì khác:

| neo | câu neo vào | hàm bao |
| --- | --- | --- |
| `:758` | `const record = this.#sessions.get(params.sessionId);` | `closeSession` |
| `:1251` | `const existing = this.#sessions.get(sessionId);` | `#loadManagedSession` |
| `:1266` | `const existing = this.#sessions.get(sessionId);` | `#resumeManagedSession` |
| `:1400` | `const loaded = this.#sessions.get(sessionId);` | `#resolveForkSourceSessionPath` |
| `:2101` | `const record = this.#sessions.get(sessionId);` | `#scheduleBootstrapUpdates` (định nghĩa ở `:2077`, bên trong `setTimeout`) |
| `:2126` | `if (this.#sessions.get(sessionId) !== record) {` | `#emitBootstrapUpdates` |

Nội dung (2 dòng):
```ts
	// No attachment check — see `#getSessionRecord` for why that is safe today
	// and why adding a fence here would break the single-client stdio path.
```

4. **Khối comment đầy đủ tại `#getSessionRecord`** — neo `:1384`, dòng `const record = this.#sessions.get(sessionId);` ngay dưới `#getSessionRecord(sessionId: string)` ở `:1383`. Đây là site chuẩn: `setSessionMode` (`:767`), `setSessionConfigOption` (`:778`), `prompt` (`:824`), `cancel` (`:1076`) đều đi qua đây. ⚠️ **Sửa nội dung LONG_COMMENT của plan trước khi gõ** — xem cạm bẫy 6.3.
5. **KHÔNG thêm guard.** Không `throw`, không `if (!record.attachment)`, không fence nào ở bảy site. Sản phẩm bàn giao phần này **chỉ là comment**. Nếu đang viết dòng kiểm tra thì đã đi sai.
6. **Import type ở test** — `:6` → `import type { Model, UsageReport } from "@oh-my-pi/pi-ai";`. Chỉ import top-level; AGENTS.md cấm `await import()` và `import("...").Type` ở vị trí type.
7. **Thêm fake member** — trong `class FakeAgentSession` (`:117`), đặt cạnh `usageFallbackConfirmer` (`:147`). Fake **hiện không có** `fetchUsageReports` (`rg -n 'fetchUsageReports' packages/coding-agent/test/acp-agent.test.ts` → exit 1). Method phải `async`, trả `this.usageReports`; nó mirror `AgentSession.fetchUsageReports(signal?: AbortSignal): Promise<UsageReport[] \| null>` thật, fake được phép bỏ qua `signal` vì call site ở `:1186` không truyền signal nào.
8. **Helper `usageReportFor`** — ở module scope, ngay trên `advanceBootstrapGuard()` (`:551`):
```ts
function usageReportFor(sessionId: string): UsageReport {
	return { provider: "test-provider", fetchedAt: 0, limits: [], metadata: { sessionId } };
}
```
Fixture **đầy đủ kiểu, không cần cast**: `packages/ai/src/usage.ts:139` khai `interface UsageReport { provider: Provider; fetchedAt: number; limits: UsageLimit[]; resetCredits?; notes?; metadata?; raw? }`, và `Provider` là `export type Provider = string;` tại `packages/catalog/src/types.ts:138`. Nhúng `sessionId` vào `metadata` là điều làm phép assert phủ định thành **có nghĩa** thay vì tautology — hai session cho ra hai payload khác nhau thật sự.
9. **Test mới** — ngay dưới `describe("ACP agent", () => {` (`:556`). Chép nguyên văn phần setup hai session từ test sẵn có ở `:558-561`.
10. **Chạy cổng** — **không** cần `bun install` / `bun run build:native` ở checkout này.

**Hợp đồng test.** File `packages/coding-agent/test/acp-agent.test.ts`, test tên `"scopes _omp/usage to the session the client asked about"`.

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

**Nếu hồi quy, người dùng thấy gì:** một ACP client có hai session sống sẽ render sai panel quota/token — hỏi về session B và hiện số của session A — **không có lỗi, không có trạng thái rỗng, không có gì trong log** để phân biệt với output đúng.

**Vì sao phải có chân phủ định:** với chỉ một session thì bug hoàn toàn vô hình. Một test chỉ mở một session sẽ **pass ngay cả với code hỏng**. Hai assertion là cần cả hai: `toEqual` khẳng định payload đúng, `not.toContainEqual` chặn khả năng cả hai session cùng được trả về.

**Biên còn lại, do cùng code production phủ** — `params.sessionId` trỏ tới session không có trong `#sessions` phải trả `{ reports: [] }`, **không** được trả reports của initial session. Đây là nửa phủ định của fix và cũng là chỗ dễ "sửa sai" nhất. Plan nói *assert nếu rẻ* — **đây là chỗ rẻ**: thêm vào cùng test, không dựng thêm test mới:

```ts
		// A sessionId that is not in the map must not fall back to another
		// session's numbers — falling back IS the bug being fixed.
		const missing = (await harness.agent.extMethod("_omp/usage", { sessionId: "no-such-session" })) as {
			reports: UsageReport[];
		};
		expect(missing).toEqual({ reports: [] });
```

**Không test phần comment.** Nó ghi lại một giả định về transport, không có hành vi quan sát được; assert trên *text* của comment là source-grep bị cấm.

**Cổng có đỏ được không.** Tiền đề trong plan đã lỗi thời: `node_modules` tồn tại (tạo 2026-09-28 07:44) và test chạy được ngay — `bun test packages/coding-agent/test/acp-agent.test.ts -t "replays messageIds"` → `1 pass / 77 filtered out / 0 fail / 10 expect() calls`. Baseline thật trước khi đụng gì: **78 test, 0 fail**; sau khi thêm test mới: **79 test**.

**Cổng chính — ĐỎ ĐƯỢC, đã chứng minh bằng chạy thật.** Trước fix (chỉ mới thêm phía test, `acp-agent.ts` còn nguyên HEAD): `expect(result).toEqual(expected)` đỏ với `- "sessionId": "01a0ea7b-5aa9-…"` (expected, second) vs `+ "sessionId": "01a0ea7b-5a95-…"` (received, first) → `0 pass / 1 fail`. Sau fix: `1 pass / 78 filtered out / 0 fail / 2 expect() calls`. Cổng này đỏ **thật, không giả**: handler cũ bỏ qua `params.sessionId` và trả `firstRecord` một cách tất định; hai session có `sessionId` khác nhau nên hai payload khác nhau thật.

Cổng thứ cấp — cả ba đều đã chạy và xanh: cả file `acp-agent.test.ts` → `79 pass / 0 fail / 339 expect() calls`; `cd packages/coding-agent && bun run check:types` → exit 0 (chạy `tsgo -p tsconfig.json --noEmit`, **không phải** `tsc`); `bunx oxlint <2 file>` + `bunx oxfmt --check <2 file>` → oxlint không báo gì, oxfmt `All matched files use the correct format.`

Cổng **không tự động cho phần comment:** cố ý. Reviewer xác nhận 7 khối comment bằng cách **đọc**.

⚠️ **Cần sửa một chi tiết của plan về `-t "usage"`.** Filter đó **không chọn lọc** — sau khi thêm test, nó khớp **hai** test: test mới và `"replays messageIds and returns turn usage for prompts"` (`:1152`). Dùng filter hẹp hơn:

```bash
bun test packages/coding-agent/test/acp-agent.test.ts -t "scopes _omp/usage"
```

**Cạm bẫy riêng của mục này.**

**6.1 Dễ làm sai nhất: thêm fencing thay vì viết comment.** Bảy site `#sessions.get` hôm nay an toàn **chỉ vì** transport stdio mang đúng một client mỗi kết nối — đó là đặc tính của transport, không phải quyết định thiết kế. Một fence ở đó phá vỡ chính đường single-client hợp lệ. Nhìn dễ bị dẫn sai vì có sẵn `#getSessionRecord` ném `Unsupported ACP session: ${sessionId}` khi không tìm thấy, và `#assertMatchingCwd` (`:1391`) là một kiểm tra "tương tự" — nhưng nó kiểm tra **cwd**, không phải client identity. Cả hai đều không phải mẫu để sao chép. Nếu đang viết `if (!record.attachment) throw` → dừng lại, đó là đáp án sai. Bằng chứng ngoài repo cho kết luận thiết kế: `pi-ref/packages/server/src/session-router.ts:227-230` giữ map tường minh và phủ chặn ở **router**, không phủ ở call site.

**6.2 Hai dòng `#sessions.get` giống nhau từng byte.** `#loadManagedSession` (`:1251`) và `#resumeManagedSession` (`:1266`) có cặp dòng **giống hệt nhau**, kể cả thụt lề (đã kiểm bằng `cat -A`). `replace_all` / "thêm comment trước mọi dòng khớp `this.#sessions.get`" sẽ đặt comment sai chỗ hoặc nhân bản. Phải định vị **theo tên hàm bao quanh**, không theo text dòng. Tương tự: `:1384` và `:2101` cùng là `const record = this.#sessions.get(sessionId);` — phân biệt được **chỉ bằng thụt lề** (2 tab vs 3 tab). Đừng khớp bằng `trim()`.

**6.3 LONG_COMMENT của plan hard-code số dòng — tự già trong PR đầu tiên.** Khối comment của plan chứa câu `// A future socket or WebSocket transport voids this assumption at ALL SEVEN \`#sessions.get\` sites at once: :758, :1251, :1266, :1384, :1400, :2101, :2126.` Bảy con số đó chỉ đúng **tại HEAD `65cc6c1`** — chính bước 1 của plan đã cảnh báo "số dòng có thể trôi nếu wave trước đã vào" nhưng rồi lại nhét số dòng vào comment, tự mâu thuẫn. Sửa thành tên hàm:

```
	// A future socket or WebSocket transport voids this assumption at every
	// `#sessions.get` site at once — `closeSession`, `#loadManagedSession`,
	// `#resumeManagedSession`, `#getSessionRecord`, `#resolveForkSourceSessionPath`,
	// `#scheduleBootstrapUpdates`, `#emitBootstrapUpdates`.
```

**6.4 Fix "nửa vời" khiến test vẫn xanh.** Nếu thêm `?? this.#initialSession` vào nhánh *sessionId có mặt nhưng không tìm thấy*, test hiện tại **vẫn xanh** — vì nó chỉ hỏi về một session tồn tại. Đó là lý do assertion `{ reports: [] }` ở hợp đồng test là thứ bắt đúng lỗi "sửa một nửa" phổ biến nhất ở work item này.

**6.5 `-t "usage"` không chọn lọc** — xem mục cổng ở trên.

**6.6 Bảy site, bảy câu hỏi khác nhau.** `:2126` là `if (this.#sessions.get(sessionId) !== record) {` — một phép so khớp **danh tính với record đã bắt**, không phải tra cứu. Đừng dán nhầm comment "no attachment check" mà tưởng nó là một lookup.

Hai câu hỏi cần người quyết (chưa chặn việc bắt đầu): (1) `sessionId` có mặt nhưng không tồn tại → `{ reports: [] }` hay ném ACP error? Phiếu chọn `[]` vì handler đã có sẵn nhánh đó và ném lỗi biến một lỗ hổng dữ liệu thành lỗ client; **cần xác nhận trước khi merge**. (2) Một khối đầy đủ tại `#getSessionRecord` + cross-reference ở sáu site, hay bảy bản sao? Phiếu giữ cách chia này và **nêu rõ trong mô tả PR** vì plan gốc nói "đặt comment tại cả bảy điểm".

Một điều plan nói đúng và cần giữ nguyên: `_omp/usage` **không có caller nào trong repo** (`rg -n '_omp/usage' -g '!*.md'` chỉ trả về case label tại `:1180`) → nó do external client tiêu thụ, nên chuỗi fallback `?? this.#initialSession` phải được giữ.

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

1. **Xác nhận baseline xanh trước khi đụng gì.** Chạy `bun install --frozen-lockfile` (bắt buộc — trong checkout này `node_modules` vắng mặt, nên cả `bun run check:ts` lẫn `bun test` đều không chạy được; việc này độc lập với native addon), rồi `bun run check:ts`. Mong đợi exit 0. **Không** dùng `tsc`/`npx tsc` (AGENTS.md cấm), và **không** chạy `bun test` cho item này — nó không liên quan tới item nào. *(neo: `package.json:94`)*
2. **Tạo `packages/coding-agent/test/collab/web-wire.types.ts`** với đúng nội dung trong khối `code_shape` bên dưới. Hai điểm tải trọng, rất dễ làm sai: (a) alias khẳng định **phải** là `export type`, không phải `type` trần — một alias không export mà không dùng sẽ dính oxlint WARNING `eslint(no-unused-vars)` (đã kiểm chứng); (b) import phải là `import type` — vì `verbatimModuleSyntax: true` trong `tsconfig.base.json` ở gốc repo (không phải `packages/tsconfig.base.json` — thư mục `packages/` không chứa file này). *(neo: `packages/coding-agent/test/collab/web-wire.types.ts`)*
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

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W5.md`.

**Cảnh báo neo.** Trong 11 neo, **9 đúng** và **2 sai** — nhưng sai sót nghiêm trọng nhất không nằm trong bảng neo mà nằm trong **văn bản sẽ được chép nguyên văn vào file mãi mãi**.

**S1 — `package.json:94` không phải `check:ts`.** `check:ts` nằm ở **dòng 90**:
```
90:		"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",
91:		"check:tools": "oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' ...",
94:		"lint:ts": "bun run --parallel lint:tools && ...",
```
Lệnh `bun run check:ts` vẫn chạy đúng — chỉ là số dòng trong neo sai. Kỹ sư gõ neo vào PR description sẽ bị bắt.

**S2 — Vị trí lỗi đỏ là `(46,40)`, không phải `(44,40)`.** Output thật đã chạy:
```
test/collab/web-wire.types.ts(46,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.
```
Cột 40 đúng. Dòng 46 vì khối bình luận JSDoc 25 dòng chiếm dòng 21–45. **Tự chạy lại và dán output thật, đừng copy số 44.**

**S3 — Sai nghiêm trọng nhất: khẳng định "chín discriminant" trong bình luận SAI.** Tài liệu khẳng định, và sẽ được **chép nguyên văn vào file mãi mãi**: *"Wire's `AgentEvent` declares nine turn/message/tool-execution discriminants the host never emits — `agent_start`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`"*. **Đã kiểm bằng compiler, không phải bằng mắt** — probe `type OnlyWire = Exclude<D<WireAgentEvent>, D<AgentSessionEvent>>` cho `Type '"NEVER"' is not assignable to type '1'` → **`OnlyWire` là `never`**. Nghĩa là **không có discriminant nào thuộc wire mà host thiếu**; cả chín cái tên kia đều *có* trong host (host `AgentSessionEvent` tại `agent-session-events.ts:13` được xây trên `Exclude<AgentEvent, { type: "agent_end" }>` của **agent-core**). Chiều lệch **thật** là ngược lại: chiều host có mà wire không có cho ra **12** tên —
`advisor_cost_changed, advisor_yielded, config_warnings_changed, goal_updated, irc_message, model_changed, retry_fallback_applied, retry_fallback_succeeded, todo_auto_clear, todo_reminder, tool_stream_update, ttsr_triggered`.
Tài liệu liệt kê 6 tên trong số này; phần "và những cái khác" là đúng, và **đây mới** là bất đối xứng thật sự. Nếu để nguyên, file vĩnh viễn ghi một lý do sai — người đọc sau sẽ tin rằng payload của wire vượt host, trong khi thực tế ngược lại.

**S4 — Ghi chú nhỏ về neo `379`:** dòng 379 là arm **thứ hai từ cuối**, không phải arm cuối (arm cuối là 380 `| { t: "error"; message: string };`). Dùng 379 vẫn đúng mục đích (đổi tên `bye`), nhưng mô tả "arm cuối của `HostFrame`" thì không chính xác.

**S5 — Môi trường:** bước 1 của W5 nói "trong checkout này `node_modules` vắng mặt" — **sai**. `node_modules/` có 243 mục, `tsgo`/`oxlint`/`oxfmt` đều có trong `node_modules/.bin/`. Mọi cổng chạy được ngay, không cần `bun install --frozen-lockfile`.

Các neo **đúng**: `packages/wire/src/index.ts:7` và `:379`; `packages/coding-agent/package.json:547` (`"@oh-my-pi/pi-wire": "catalog:"`); `packages/coding-agent/tsconfig.json` (`{"extends": "../tsconfig.workspace.json", "include": ["src","test","scripts"]}`); `tsconfig.base.json` gốc repo có `"verbatimModuleSyntax": true`; `packages/tsconfig.base.json` không tồn tại (tài liệu nói đúng); `packages/wire/CHANGELOG.md` `## [Unreleased]` ở dòng 3 rỗng; `scripts/ci-test-ts.ts:234` (`if (!entry.isFile() || !entry.name.endsWith(".test.ts")) { continue; }`); và anchor bổ sung `packages/coding-agent/package.json:523` = `"check:types": "tsgo -p tsconfig.json --noEmit"`.

**Bảng điểm sửa.** Cột TRƯỚC nguyên văn từ file thật.

| đường/dẫn | symbol / hàm | TRƯỚC (nguyên văn từ file thật) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/test/collab/web-wire.types.ts` | *(toàn bộ file)* | **KHÔNG TỒN TẠI** — `ls` trả `No such file or directory` | File 46 dòng, type-only. Dòng 11–12 là hai `import type`; dòng 14–16 ba helper; dòng 18–19 hai union discriminant; dòng 46 là `export type WireCoveredByHost = Expect<Assignable<WireT, CollabT>>;` |
| `packages/wire/src/index.ts` | `WireFrame` / `HostFrame` | `* asserted type-only in \`packages/coding-agent/test/collab/web-wire.types.ts\`.` (dòng 7) | **KHÔNG ĐỔI.** Dòng 7 vốn đã ghi đúng đường dẫn tương lai; tạo file làm nó thành sự thật |
| `packages/wire/src/index.ts` | arm `bye` trong `HostFrame` (thứ hai từ cuối — xem S4) | `	\| { t: "bye"; reason: string }` (dòng 379) | **KHÔNG ĐỔI.** Chỉ bị mutate tạm ở bước cổng đỏ rồi `git checkout --` hoàn tác |
| `packages/wire/CHANGELOG.md` | `## [Unreleased]` | `## [Unreleased]` rỗng, ngay dòng 3 | **KHÔNG ĐỔI** — xem Bước 7 |

Trạng thái cây sau khi làm xong (đã kiểm bằng `git status --porcelain packages/`): đúng một dòng `?? packages/coding-agent/test/collab/web-wire.types.ts`.

**Các bước có neo đã kiểm.**

1. **Baseline xanh (đã chạy, exit 0)** — `cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:tools`. Kết quả thật: exit 0, với `Checking formatting... All matched files use the correct format. Finished in 280ms on 5445 files using 10 threads.` Một warning `eslint(no-unused-vars)` tại `packages/coding-agent/test/mcp-project-config-not-trusted-by-default.test.ts:19` là **có sẵn từ trước**, không liên quan, không làm đỏ. Không dùng `tsc`/`npx tsc` (AGENTS.md cấm).
2. **Tạo file** `packages/coding-agent/test/collab/web-wire.types.ts`, 46 dòng, đúng như khối `code_shape` — **trừ phần bình luận phải sửa theo S3**. Hai điểm tải trọng, đã kiểm chứng cả hai: **(a) Alias phải là `export type`** — file chứa `type NotExported = "hello";` không export sẽ ra `warning eslint(no-unused-vars): Type alias 'NotExported' is declared but never used.`; chính xác là **warning**, và `oxlint` **vẫn exit 0**. **(b) Import phải là `import type`** — `tsconfig.base.json` gốc repo có `"verbatimModuleSyntax": true`; `packages/tsconfig.base.json` không tồn tại. Import giá trị sẽ thành lỗi runtime dưới `verbatimModuleSyntax`.
3. **Cổng 1 XANH** — `bun run --cwd packages/coding-agent check:types` (EXIT=0, output rỗng) và `bun run check:tools` (EXIT=0). File được với tới vì `packages/coding-agent/tsconfig.json` có `"include": ["src","test","scripts"]`. Cả glob lint lẫn glob format đều khớp — **đã chứng minh bằng phản thí**: thêm `\n\nconst   x=1\n` vào cuối file, `oxfmt --check` → exit 1.
4. **Cổng 2 ĐỎ: chứng minh khẳng định có răng (đã chạy, exit 1)** — `sed -i '' '379s/.*/\t| { t: "bye-vanished"; reason: string }/' packages/wire/src/index.ts` rồi `bun run --cwd packages/coding-agent check:types`. Output thật, nguyên văn: `test/collab/web-wire.types.ts(46,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.` → `EXIT=1`, `--- total error lines: 1`. **Đúng một lỗi, nằm trong file conformance, không một lỗi dây chuyền nào** — đỏ rõ ràng, chỉ trỏ về đúng chỗ cần sửa, không phun ra trăm chỗ gọi hệ quả.
5. **Hoàn tác và xanh trở lại (đã chạy, exit 0)** — `git checkout -- packages/wire/src/index.ts`, rồi `check:types` EXIT=0 output rỗng; `git diff --stat packages/wire/` rỗng — wire sạch trước và sau. **Cả hai chiều đều là bằng chứng**; dán cả hai mã exit vào PR description.
6. **Dọn dẹp tùy chọn** — dù sao cũng **để nguyên** `packages/wire/src/index.ts:7`. Thứ duy nhất được phép thêm vào file mới là bình luận đầu file giải thích rằng nó cố ý **không** được `bun test` thu thập. Cơ sở đã kiểm: `scripts/ci-test-ts.ts:234` lọc `!entry.name.endsWith(".test.ts")` → `continue`; tên `web-wire.types.ts` không khớp nên runner không bao giờ nạp nó.
7. **Changelog: KHÔNG thêm mục.** `packages/wire/CHANGELOG.md` có `## [Unreleased]` rỗng ở dòng 3. **Không thêm gì** — đây là thay đổi nội bộ chỉ đụng test, không có bề mặt người dùng. Nếu reviewer đòi mục, mục trung thực là một dòng `### Fixed` về trích dẫn cũ — không phải về một tính năng.

**Hợp đồng test.** Đây là hợp đồng **lúc compile**, không phải lúc chạy. Không có gì để người dùng quan sát lúc thực thi — và đó chính là ý nghĩa. Tên file: `packages/coding-agent/test/collab/web-wire.types.ts` (cố ý **không** phải `*.test.ts`). Hợp đồng được bảo vệ: *"tập discriminant frame mà package wire khai báo là tập con của tập mà host collab thực sự tạo ra được."* **Case duy nhất:** khẳng định `Assignable<WireT, CollabT>` phải là `true`.

| Hồi quy | Biểu hiện |
| --- | --- |
| Package wire thêm frame `t` mới mà host không phát | `check:ts` **đỏ**: `web-wire.types.ts(46,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.` Trước đây: frame đó lọt xuống production và bị guest nuốt im lặng qua `default:`. |
| Host đổi tên một `t` (vd `bye` → `bye-vanished`) mà wire không theo | Cùng lỗi TS2344, cùng một dòng. Đây là hệ quả gián tiếp giá trị nhất của item. |
| Ai đó đổi tên file thành `web-wire.types.test.ts` | `bun test` nạp file, không tìm thấy test nào, **bảo đảm biến mất trong im lặng**. Đây là lý do bình luận đầu file phải nằm ở đó. |

**Điều KHÔNG assert, và vì sao (đã kiểm bằng compiler):**

- **Payload assignability chiều nào cũng không assert.** Probe `Assignable<CollabFrame, WireFrame>` → **`false`**. Host thêm `entryCount`, `readOnly`, `isTerminal`, `yielded`… mà wire không có. (W5 nói payload "hai chiều" là bất đối xứng — đúng ở chiều host→wire; nhưng ở chiều wire→host thì bất đối xứng nằm ở chỗ **khác**, xem S3.)
- **Chiều ngược discriminant (`CollabT ⊆ WireT`) hiện CŨNG đúng** — probe cho ra không lỗi. Không assert là một **quyết định thiết kế có chủ ý** (host được phép phát biến thể mà trình duyệt chưa học), không phải vì nó đang sai. **Giữ nguyên lập luận này, đừng viết "nó sai".**
- Wire có `t: "thinking_level_change"` chỉ trong `SessionEntry` (dòng 157), **không** phải arm `AgentEvent` — đừng đếm nhầm khi đọc `rg` thô.

**Cổng có đỏ được không.**

| # | Lệnh | ĐỎ được? | Bằng cách nào — đã chạy thật |
| --- | --- | --- | --- |
| 1 | `bun run check:tools` | ✅ **CÓ** | `oxlint .` exit 0; `oxfmt --check` trên glob có file này → exit 0. Chứng minh glob khớp bằng phản thí (thêm code xấu format → exit 1). |
| 2 | `bun run --cwd packages/coding-agent check:types` | ✅ **CÓ** | `tsgo -p tsconfig.json --noEmit`. Đỏ bằng mutate discriminant: `sed -i '' '379s/.*/\t\| { t: "bye-vanished"; reason: string }/'`. Xanh trở lại bằng `git checkout --`. **Đã chạy cả hai chiều: 0 → 1 → 0.** |
| 3 | `bun run check:ts` (gốc) | ✅ **CÓ** (cùng cơ chế với #2) | `check:ts` = `check:tools` + `--filter './packages/*' check:types`. Chạy #1 và #2 là đủ bằng chứng. |

**Tất cả ba cổng đều đỏ được, và điều đó đã được chứng minh bằng mã exit thật ở cả hai chiều.** Không có cổng nào ở đây là "luôn xanh". Điểm cần nhấn: cổng #2 là **cổng đỏ duy nhất phát hiện được hồi quy thật**. Cổng #1 bảo vệ style/format, không bảo vệ conformance — nếu ai đó xoá file `web-wire.types.ts`, cổng #1 vẫn xanh. **Đừng bao giờ chạy #1 một mình rồi kết luận "xanh".**

**Cạm bẫy riêng của mục này.**

**C1 — Bình luận nói dối thì file thành tài liệu độc hại vĩnh viễn.** Cạm bẫy lớn nhất. 25 dòng JSDoc giải thích *tại sao không assert payload* — và câu "chín discriminant host không bao giờ phát" là **sai** (S3). Khối `code_shape` ghi sẵn để copy nguyên văn, nên kỹ sư sẽ dán thẳng vào repo một tuyên bố sai về kiến trúc mà không hề hay biết. **Sửa chiều trong bình luận trước khi dán.**

**C2 — Số dòng trong neo không tự bảo vệ nó.** Bốn neo sai: `package.json:94` (thật là 90), lỗi `(44,40)` (thật là `(46,40)`), "arm cuối" (379 là arm thứ hai từ cuối), và "node_modules vắng mặt" (thật là có 243 mục). **Không neo nào trong số này làm hỏng lệnh bạn gõ — chúng chỉ làm hỏng PR description.** Đó là loại sai âm thầm tệ nhất: code chạy, reviewer tin neo, reviewer bị dắt sai.

**C3 — Cổng đỏ "phải đỏ rồi xanh lại" là bắt buộc, không phải nghi thức.** Một file conformance chưa từng đỏ lần nào thì không chứng minh được gì — nó có thể vô dùng mà vẫn xanh. Nhớ `git checkout -- packages/wire/src/index.ts`; nếu quên, bạn để lại một discriminant giả trong repo (và bước sau sẽ mutate nhầm cái giả đó). Lưu `cp` ra `/tmp` trước khi mutate là dự phòng rẻ.

**C4 — `export type` vs `type` trần: warning không làm đỏ cổng.** `eslint(no-unused-vars)` trả **warning**, `oxlint` vẫn exit 0. Nên "cổng xanh" không bảo chứng style.

**C5 — Đừng "sửa" file thành `.test.ts`.** Đặt tên `*.test.ts` ⇒ `bun test` nạp file, không thấy test nào, và **bảo đảm biến mất trong im lặng** — tệ hơn nhiều so với việc không có file, vì ai đó vẫn nghĩ có người canh.

**C6 — Cùng tên `AgentEvent`, hai nguồn khác nhau.** Wire có `AgentEvent` riêng; host dùng `AgentEvent` của **agent-core** rồi mở rộng thành `AgentSessionEvent` (`agent-session-events.ts:13`). Đọc `rg "AgentEvent"` rồi đoán chúng là một là sai — và đó chính xác là cái bẫn đã sinh ra S3. Khi đọc diff event, luôn kiểm tra import ở dòng 1 của file.

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

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W6.md`.

**Cảnh báo neo.** 18 neo xác nhận đúng; **7 sai/lệch** và **1 mục bỏ sót nghiêm trọng hơn hẳn**.

| neo trong plan | plan nói | thực tế | ảnh hưởng |
| --- | --- | --- | --- |
| `bash.ts` compound twin `526–530`, `policy` @`528` | object ở 526–530, `policy: "deny"` ở 528 | object ở **524–530**; `policy: "deny"` ở **527** (526 là `override: true,`) | lệch 1 dòng trong bảng "Đính chính" của chính plan |
| `bash.ts:542–546` (code-shape "Site 2") | vòng lặp ở 542–546 | vòng lặp `for` ở **542–547**; snippet của plan thiếu dấu `}` đóng `for` ở 547 | snippet trong plan **không biên dịch nguyên vẹn** nếu gõ nguyên si |
| `approval.test.ts:352` (bước 8, gọi là "describe block") | 352 là `describe("tool-owned dynamic approval declarations")` | **351** là `describe(...)`; **352** là `it("classifies critical bash patterns through BashTool.approval")` | lệch 1 dòng |
| `approval.test.ts:818–822` (bước 6) | `toMatchObject` ở 818–822, `policy: "prompt"` ở 818 | `toMatchObject({` mở ở **816**, `policy: "prompt",` ở **817**, đóng 821 | lệch 2 dòng; gõ theo plan sẽ sửa nhầm `source: "tool",` |
| `approval.ts:~252` (code-shape) | short-circuit yolo ở ~252 | `if (mode === "yolo") {` ở **255**, `if (decision.policy) {` ở **256** | "~" nên chấp nhận được; con trỏ thật là 255 |
| `approval.test.ts:350–370`, "khoảng 15 lệnh" | corpus top-level ở 350–370, ~15 lệnh | vòng lặp mở ở **353**, danh sách ở **354–369** = **16 lệnh** | mô tả, không ảnh hưởng sửa |
| `docs/approval-mode.md:124` (bước 11) | neo 124, đổi nhánh `isCritical(args.command)` | 124 **đúng** là dòng `isCritical(args.command)`; literal cần gõ nằm ở **125** | chấp nhận được; chỉ ghi rõ dòng đích |

**Bỏ sót, không phải neo sai (nghiêm trọng hơn hẳn):** `packages/coding-agent/test/tools/approval-mode.test.ts` — 3 test (`:157`, `:195`, `:245`) đỏ sau thay đổi, plan không hề nhắc file này, và lệnh cổng của plan không chạy nó.

Các neo **đúng, dùng được**: `bash.ts:516`, `:545`, `:515` (`if (!compoundSegments && criticalCommand) {`), `:506–512` (`policy: "deny"` @510), `:507–511` (thứ tự field); `approval.test.ts:82`, `:84`, `:90`, `:371`, `:375`, `:426`, `:431–435`, `:834–838` (lệnh gọi mở 833, đóng 837); `docs/approval-mode.md:64` và `:162`; `CHANGELOG.md:3` (chỉ có `### Security` @5); `tools/settings.ts:294` (`default: "yolo",`); `approval.ts:235` (`if (decision.policy === "deny") {` → `source: "tool"`).

**Bảng điểm sửa.** TRƯỚC trích nguyên văn từ file thật (tab hiển thị thành `\t` khi cần).

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/tools/bash.ts:516` | `BashTool.approval` — nhánh critical top-level | `\t\t\treturn { tier: "exec", override: true, reason: "Critical pattern detected" };` | object literal 5 dòng: `return {` / `tier: "exec",` / `override: true,` / **`policy: "deny",`** / `reason: "Critical pattern detected",` / `};` |
| `packages/coding-agent/src/tools/bash.ts:545` | `BashTool.approval` — vòng lặp compound per-segment | `\t\t\t\t\treturn { tier: "exec", override: true, reason: "Critical pattern detected" };` | y hệt dòng trên, cùng thứ tự field |
| `packages/coding-agent/src/tools/bash.ts:516` (tham chiếu thứ tự field) | nhánh deny do người dùng cấu hình | `bash.ts:507–512` — `return {` / `tier: "exec",` / `override: true,` / `policy: "deny",` / `reason: \`Blocked by bash pattern: ${patternRule.match}\`,` / `};` | **giữ nguyên**, chỉ dùng làm khuôn cho thứ tự field `tier, override, policy, reason` |
| `packages/coding-agent/test/tools/approval.test.ts:371` | `it("classifies critical bash patterns through BashTool.approval")` | `expect(bashApproval(command)).toEqual({ tier: "exec", override: true, reason: "Critical pattern detected" });` | `expect(bashApproval(command)).toEqual({ tier: "exec", override: true, policy: "deny", reason: "Critical pattern detected" });` |
| `packages/coding-agent/test/tools/approval.test.ts:426` | `it("keeps critical bash patterns prompt-gated unless explicitly denied")` | `it("keeps critical bash patterns prompt-gated unless explicitly denied", () => {` | `it("denies critical bash patterns even when a configured pattern allows", () => {` |
| `packages/coding-agent/test/tools/approval.test.ts:431–435` | assertion đầu của test trên | `expect(bashApproval("rm -rf /", settingsOverrides)).toEqual({` / `tier: "exec",` / `override: true,` / `reason: "Critical pattern detected",` / `});` | thêm `policy: "deny",` giữa `override: true,` và `reason:` |
| `packages/coding-agent/test/tools/approval.test.ts:817` *(plan ghi 818)* | `it("does not let an unmatched segment conceal a critical later segment")` | `expect(resolveApproval(bash, args, "write", { bash: "allow" })).toMatchObject({` @816 → `policy: "prompt",` @817 | `policy: "deny",` @817 |
| `packages/coding-agent/test/tools/approval.test.ts:834` | `it("retains critical checks after removing literal shell quotes and escapes with an unmatched segment")` | `expect(resolveApproval(bash, { command }, "write", { bash: "allow" })).toMatchObject({` @833 → `policy: "prompt",` @834 | `policy: "deny",` @834 |
| **`packages/coding-agent/test/tools/approval-mode.test.ts:157`** | `it("critical bash patterns do not prompt in yolo mode with bash allowed")` | `expect(textOf(result)).toContain("(no output)");` — lệnh `rm -f /tmp/bun-fake-timer-probe.test.ts` **thực thi thật** | đảo thành `await expect(...).rejects.toThrow('Tool "bash" is blocked by tool policy.\nReason: Critical pattern detected')`, đổi tên |
| **`packages/coding-agent/test/tools/approval-mode.test.ts:195`** | `it("CLI --auto-approve also bypasses safety-override patterns")` | `expect(textOf(result)).toContain("(no output)");` @207 | đảo thành `rejects.toThrow(...)`; cân nhắc đổi tên vì "bypasses" không còn đúng |
| **`packages/coding-agent/test/tools/approval-mode.test.ts:245`** | `it("ACP-approved arguments satisfy explicit user and tool-override prompts")` | nửa sau (dòng 262–273) chạy `rm -f /tmp/bun-fake-timer-probe.test.ts` với `acpApprovedArgs` và expect `"(no output)"` | nửa sau đảo thành `rejects.toThrow(...)`; **nửa trước (250–260, `echo acp-explicit`) giữ nguyên** |
| `docs/approval-mode.md:64` | — | câu cuối của đoạn: ``In `yolo`, a bare critical override is ignored, but an explicit tool/user `prompt` or `deny` policy is still enforced.`` | xoá câu đó, thay bằng: critical bị từ chối dứt khoát ở mọi chế độ kể cả `yolo`; `bash.patterns` `allow` không override được |
| `docs/approval-mode.md:58–61` | — | ``A tool can force a prompt with object-form approval:`` … `approval: { tier: "exec", override: true, reason: "Critical pattern detected" }` | **plan không nhắc** — cùng hình dạng cũ, sẽ dạy tác giả extension một thứ dưới `yolo` mặc định bị bỏ qua. Sửa cùng lúc với 125 |
| `docs/approval-mode.md:125` *(plan ghi 124)* | ví dụ `isCritical(args.command)` | `? { tier: "exec", override: true, reason: "Critical pattern detected" }` | `? { tier: "exec", override: true, policy: "deny", reason: "Critical pattern detected" }` |
| `packages/coding-agent/CHANGELOG.md:3` | `## [Unreleased]` | sau dòng 3 chỉ có `### Security` @5, **không có `### Changed`** | thêm mục con `### Changed` với một bullet hướng người-dùng |

**Không đụng tới:** `bash.ts:515`, `approval.test.ts:82`, và hai assertion anh em ở `approval.test.ts:436` (`echo hello` → `{tier:"write",policy:"allow"}`) + `:440` (`echo hello && rm file.txt` → `"exec"`). Đã đo: cả hai vẫn xanh sau thay đổi.

**Các bước có neo đã kiểm.**

0. **CỔNG QUY TRÌNH, chạy trước mọi dòng code.** Cần product owner xác nhận bằng văn bản cả hai điểm: (a) lệnh bash critical bị hard-deny trong `yolo`; (b) `bash.patterns` `allow` không còn override được kết quả khớp critical. Bị từ chối hoặc trì hoãn → đóng W6 là `deferred`, ship Wave 2 không có nó. W4/W12/W13 không được chờ. *Không có file — đây là cổng quy trình.*
1. **`bash.ts:516`, nhánh critical top-level.** Thêm `policy: "deny",` vào object trả về, đặt giữa `override: true,` và `reason:`, khớp thứ tự field của nhánh deny cấu hình ngay trên (`bash.ts:508–511`).
2. **`bash.ts:545`, vòng lặp compound per-segment.** Sửa y hệt. Lý do không được bỏ sót: `bash.ts:515` là `if (!compoundSegments && criticalCommand) {` — điều kiện `!compoundSegments` khiến nhánh top-level không bao giờ chạm tới lệnh compound.
3. **`approval.test.ts:371`, corpus top-level.** Đổi `toEqual` thêm `policy: "deny"`. **Không sửa danh sách lệnh** ngay trên (353–370).
4. **`approval.test.ts:426` + `431–435`, test allow-rule.** Đổi tên `it()` (tên cũ thành sai sự thật) và thêm `policy: "deny"`. Giữ nguyên hai assertion ở 436 và 440. *Đã đo: sau thay đổi chỉ assertion 431 đỏ; 436 và 440 vẫn xanh.*
5. **`approval.test.ts:817`, test compound + unmatched segment.** Đổi `policy: "prompt"` → `policy: "deny"`. Lệnh gọi `toMatchObject({` mở ở 816, đóng ở 821; plan ghi "818–822" — lệch 2 dòng.
6. **`approval.test.ts:834`, test quote/escape stripping.** Đổi `policy: "prompt"` → `policy: "deny"`.
7. **`approval-mode.test.ts:157`, test yolo end-to-end.** Đây là test quan trọng nhất trong toàn bộ item và **plan không nhắc tới file này**. Đảo `expect(textOf(result)).toContain("(no output)")` (dòng 171) thành `rejects.toThrow('Tool "bash" is blocked by tool policy…')`.
8. **`approval-mode.test.ts:195`, test `--auto-approve`.** Đảo tương tự (dòng 207, lệnh ở 199).
9. **`approval-mode.test.ts:245`, test ACP.** Chỉ đảo **nửa sau** (dòng 262–273). Nửa trước (250–260, `echo acp-explicit`) không liên quan.
10. **Test mới (hợp đồng trung tâm)**, trong `describe("tool-owned dynamic approval declarations")` (`:351`). Chèn sau test `it()` ở dòng 375 (test kết thúc ở 389). Chạy `BashTool` thật qua `createBashTool()`:

```ts
it("denies critical bash patterns in yolo mode through both approval paths", () => {
    const bash = createBashTool({ "bash.allowCompoundCommands": true });
    const args = { command: "pwd && cmp before after && rm -rf /" };
    // compound per-segment path (bash.ts:545)
    expect(resolveApproval(bash, args, "yolo", { bash: "allow" })).toMatchObject({
        policy: "deny", source: "tool", override: true,
    });
    // top-level path (bash.ts:516)
    expect(resolveApproval(bash, { command: "rm -rf /" }, "yolo", { bash: "allow" })).toMatchObject({
        policy: "deny", source: "tool", override: true,
    });
    expect(() => requiresApproval(bash, args, "yolo", { bash: "allow" })).toThrow(
        'Tool "bash" is blocked by tool policy',
    );
    // negative guard
    expect(resolveApproval(createBashTool(), { command: "ls -la" }, "yolo", {})).toMatchObject({
        policy: "allow",
    });
});
```

Đã chạy thử đúng script này trên mã đã sửa: khớp `{policy:"deny", source:"tool", override:true}` cho cả hai lệnh, `requiresApproval` throw, `ls -la` vẫn `allow`.

11. **`docs/approval-mode.md:64`.** Xoá câu cuối đoạn và thay bằng luật mới.
12. **`docs/approval-mode.md:61` và `:125`.** Sửa **cả hai** ví dụ mang hình dạng cũ (plan chỉ nhắc 124/125).
13. **`packages/coding-agent/CHANGELOG.md:3`.** Thêm mục con `### Changed` (hiện chưa có) với một bullet hướng người-dùng.

**Hợp đồng test.** Hợp đồng được bảo vệ: một lệnh khớp `CRITICAL_BASH_PATTERNS` không bao giờ được `yolo` tự phê duyệt — nó resolve `policy: "deny"` với `source: "tool"`, và `requiresApproval` throw, ở mọi chế độ, qua **cả** nhánh top-level (`bash.ts:516`) **lẫn** nhánh compound per-segment (`bash.ts:545`).

Hai file test liên quan, 7 test sửa lại, 1 test mới:

| file | test | hành động |
| --- | --- | --- |
| `approval.test.ts:352` | `classifies critical bash patterns through BashTool.approval` | sửa assertion |
| `approval.test.ts:426` | `keeps critical bash patterns prompt-gated unless explicitly denied` | đổi tên + sửa assertion |
| `approval.test.ts:806` | `does not let an unmatched segment conceal a critical later segment` | sửa assertion |
| `approval.test.ts:824` | `retains critical checks after removing literal shell quotes and escapes with an unmatched segment` | sửa assertion |
| `approval-mode.test.ts:157` | `critical bash patterns do not prompt in yolo mode with bash allowed` | đảo thành `rejects.toThrow` + đổi tên |
| `approval-mode.test.ts:195` | `CLI --auto-approve also bypasses safety-override patterns` | đảo thành `rejects.toThrow` |
| `approval-mode.test.ts:245` | `ACP-approved arguments satisfy explicit user and tool-override prompts` | đảo **nửa sau** thành `rejects.toThrow` |
| `approval.test.ts` (mới, sau 375) | `denies critical bash patterns in yolo mode through both approval paths` | thêm mới |

**Chốt chặn âm (phải giữ xanh, đã đo cả hai lần):** `approval.test.ts:375` `does not flag benign bash commands` — 9 lệnh vô hại vẫn `"exec"`; `:436` `echo hello` → `{tier:"write", policy:"allow"}` dưới rule `*`/allow; `:440` `echo hello && rm file.txt` → `"exec"`; các test allow/prompt bình thường trong `approval-mode.test.ts` (ví dụ `:186`); `ls -la` dưới `yolo` → `policy: "allow"` (đo trước và sau: **không đổi**).

**Người dùng thấy gì nếu hồi quy:** nếu `bash.ts:516` bị revert, `rm -rf /` chạy không cần hỏi dưới `yolo` — không prompt, không dòng log, transcript trống, mất dữ liệu im lặng. Nếu `bash.ts:545` bị revert, `pwd && cmp before after && rm -rf /` chạy không cần hỏi dưới `yolo` — cùng triệu chứng nhưng **chỉ với lệnh nối bằng `&&`**, nên người dùng chỉ thấy nếu workflow của họ có lệnh ghép. Nếu deny rò sang lệnh thường: `ls -la` dừng chạy trong `yolo`, automation vỡ rõ ràng, có log.

**Cổng có đỏ được không.**

⚠️ **Cổng của plan đã lỗi thời — phải sửa.** Plan viết `node_modules/` rỗng nên `bun test` fail với `Cannot find module '@oh-my-pi/pi-tui/tools/bash'` và `bun run check:ts` fail với `oxlint: command not found` (exit 127), phải chạy `bun install` trước. **Đo lại hôm nay: sai hoàn toàn.** `ls node_modules | wc -l` → **243**; `node_modules/.bin/oxlint` tồn tại. Baseline chạy thật: `approval.test.ts` → `70 pass 0 fail 256 expect() calls`; `approval-mode.test.ts` → `16 pass 0 fail 18 expect() calls`; toàn thư mục `test/tools/` → `2033 pass 0 fail 2296 tests, 263 skip`. **Không cần `bun install` — đừng để ai chạy theo plan, nó sẽ tốn thời gian và có thể làm lệch lockfile so với trạng thái đã được CI chấp nhận.**

Cổng plan đưa ra (`bun test …/approval.test.ts` exit 0) **ĐỎ ĐƯỢC, đã đo thật**: baseline 70 pass / 0 fail → sửa **cả hai** site `bash.ts` mà chưa sửa test → **4 fail** (đúng 4 test ở bước 3–6) → sửa **chỉ** site `bash.ts:516` + sửa test bước 3–6 nhưng chưa thêm test mới → **vẫn 4 fail**, gồm cả hai test compound ở 806 và 824. Nhưng nó **chưa đủ rộng** — đo `bun test packages/coding-agent/test/tools/` với cả hai site đã sửa cho **7 test đỏ**, trong đó 3 test nằm ở `approval-mode.test.ts` mà plan không hề nhắc tới.

Cổng viết lại, dùng đúng bản này:

```bash
# 1) hợp đồng — cả hai nhánh, cả hai chế độ
bun test packages/coding-agent/test/tools/approval.test.ts \
           packages/coding-agent/test/tools/approval-mode.test.ts
# yêu cầu: 0 fail

# 2) không vỡ hàng xóm — bắt buộc, vì đổi bash.ts là đổi hành vi tool dùng chung
bun test packages/coding-agent/test/tools/
# yêu cầu: 0 fail (baseline đo được: 2033 pass / 0 fail)

# 3) lint + format
./node_modules/.bin/oxlint packages/coding-agent/src/tools/bash.ts \
  packages/coding-agent/test/tools/approval.test.ts \
  packages/coding-agent/test/tools/approval-mode.test.ts
./node_modules/.bin/oxfmt --check packages/coding-agent/src/tools/bash.ts
```

Cổng này đỏ được theo cả bốn hướng, tất cả đều **đã đo**: revert `bash.ts:516` → tầng 1 đỏ (4 fail); revert `bash.ts:545` → tầng 1 đỏ (test 806 + 824); bỏ sót `approval-mode.test.ts` → tầng 2 đỏ (3 fail); để lọt "deny mọi thứ cho an toàn" → tầng 1 đỏ vì `echo hello` / `echo hello && rm file.txt` / `ls -la` không còn khớp.

**Cổng quy trình (không phải cổng kỹ thuật):** bước 0 (sign-off của product owner) **không thể đỏ được bằng lệnh**. Đây là điểm rủi ro cao nhất của item.

**Cạm bẫy riêng của mục này.**

**6.1 — Sửa một nửa cặp điểm.** Điều kiện `!compoundSegments` ở `bash.ts:515` khiến nhánh top-level không bao giờ chạm lệnh compound; `bash.ts:545` mới là nhánh một payload thật đi tới. **Sửa lại một claim của plan:** plan viết "sửa riêng dòng 516 sẽ tạo ra một suite hoàn toàn xanh" — **đo thật: không**, sửa riêng `516` cho **2 test đỏ**. Và claim "test ở bước 8 bắt buộc phải dùng lệnh compound" chỉ đúng một nửa: đã thử sửa `516` + áp dụng bước 3–6 mà **không** thêm test mới → hai test compound `806` và `824` **vẫn đỏ**. Tức là bản thân bước 5 và 6 đã là chốt chặn. Test mới vẫn cần, nhưng vì lý do khác: nó là thứ duy nhất chứng minh **chế độ `yolo` không bao giờ được hỏi tới**, và là thứ duy nhất phủ `requiresApproval` throw. Hai test 806/824 chạy ở chế độ `write`, chỉ phủ short-circuit của `resolveApproval`.

**6.2 — Ba test trong `approval-mode.test.ts` mà plan bỏ sót, và chúng chạy lệnh phá hủy thật.** `:157`, `:195`, `:245` đều **thực thi** `rm -f /tmp/bun-fake-timer-probe.test.ts` trên filesystem thật và expect `"(no output)"`. Tên test ở `:157` — *"critical bash patterns do not prompt in yolo mode with bash allowed"* — chính là hợp đồng cũ được **đặt tên**.

**6.3 — `rm -f /tmp/...` cũng là critical, không chỉ `rm -rf /`.** Regex `/\brm\s+(?:-\S+\s+)*(?:-[a-z]*[rRfF][a-z]*|--recursive|--force)\s+(?:-\S+\s+)*\//i` (`bash.ts:194`) chỉ neo mục tiêu vào **tiền tố** `/`, không đòi mục tiêu là đúng `/`. Đo: `rm -rf /tmp/build` → `true`, `rm -f /tmp/bun-fake-timer-probe.test.ts` → `true`, còn `rm -v /tmp/scratch` → `false` và `rm -rf -- ./build` → `false`.

**6.4 — Fixture tổng hợp ở `approval.test.ts:82` phải để nguyên.** Nội dung nguyên văn: `const dangerous = tool("bash", { tier: "exec", override: true, reason: "Critical pattern detected" });`. Nó không bao giờ gọi `BashTool` nên vẫn xanh, và nó vẫn bảo vệ một hình dạng **thật sự tới được** (bất kỳ tool nào trả `override: true` mà không kèm `policy`). Nếu kỹ sư thêm `policy: "deny"` vào nó cho "không sót", test sẽ xanh vì lý do sai.

**6.5 — Hai ví dụ trong `docs/approval-mode.md` mang cùng hình dạng cũ, plan chỉ sửa một.** `:61` và `:125`. Sửa `:125` mà bỏ `:61` thì tài liệu vẫn dạy tác giả extension một hình dạng bị `yolo` bỏ qua — đúng cái lý do plan nêu để sửa 124.

**6.6 — `settings.ts:294` nằm trong `src/tools/`, không phải `src/`.** Đường dẫn thật: `packages/coding-agent/src/tools/settings.ts:294` → `default: "yolo",`. Không có file `packages/coding-agent/src/settings.ts`.

**6.7 — Không có cây tham chiếu nào để đối chiếu.** Đã `rg -l` cả 7 cây tham chiếu: 0 kết quả cho `CRITICAL_BASH_PATTERNS` và `Critical pattern detected`. Đừng mất thời gian tìm precedent; đây là cơ chế gốc của omp.

---


## W7. Thêm trục tuổi thọ prompt-cache theo từng tier vào model catalog qua cây KDL

**Thay đổi gì:** Thêm một trục KDL mới — thời gian sống (TTL) của prompt cache theo từng tier (`short`/`long`, tính bằng giây) — do rule sở hữu, mà không đụng tới field wire OpenAI đang có. **Wave:** 3a — Cache economics, core value (ship default-OFF). **Effort:** M.

**Người dùng thấy:** nội bộ, người dùng không thấy. W7 không thêm bề mặt nào cho người dùng và không đổi một byte request nào. Nó chỉ làm cho bảng TTL theo tier có nguồn gốc trở thành một biểu thức được trong cây rule, và giá trị của nó nằm ở catalog. Ở tầng request, không có gì quan sát được thay đổi — và W8, consumer duy nhất từng đọc trục này, đã bị gỡ khỏi milestone (xem khối ⛔ ở đầu §W8), nên W7 ship một mình.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/catalog/src/types.ts` | sửa | Thêm hai type alias `CacheRetentionTier` và `PromptCacheLifetime`; thêm `promptCacheLifetime?: PromptCacheLifetime` vào `AnthropicCompat` (interface bắt đầu ở `:526`); thêm `"promptCacheLifetime"` vào union `Omit<...>` bên trong `ResolvedAnthropicCompat` (`:963`) và khai báo lại nó là optional trong intersection `& { ... }`. | Có |
| `packages/catalog/src/compat/axes.ts` | sửa | Đăng ký `"prompt-cache-lifetime": wire("promptCacheLifetime", ["anthropic", "bedrock"], "object")` trong bảng `AXES`, cạnh các trục prompt-cache của bedrock sẵn có ở `:216-218`. | Có |
| `packages/catalog/src/compat/rules/classes/anthropic.kdl` | sửa | Viết trục mới trong các khối rule có nguồn. Thêm ít nhất một khối dưới selector `on "anthropic" { ... }` (file đã có sẵn nhiều khối, ví dụ `:44`, `:183`) và, nếu Bedrock cũng phải đọc các con số này, nhân bản vào khối `on "amazon-bedrock" { ... }` ở `:255-360` cạnh các nhóm `prompt-cache-mode` / `prompt-cache-minimum-tokens` / `prompt-cache-maximum-checkpoints` hiện có. Dùng số nguyên giây không nhấy. | Có |
| `packages/catalog/src/compat/rules.json` | tạo | Sinh lại bằng `bun run gen:compat` và commit kèm thay đổi `.kdl`. Lệnh này **cũng** sinh lại `packages/catalog/src/compat/auth-ids.ts` và `packages/catalog/src/compat/provider-ids.ts` — phải kiểm tra diff của cả ba. | Có |
| `packages/catalog/test/prompt-cache-lifetime.test.ts` | tạo | Test mới ở mức rule, gồm bốn ca plan đã nêu: cả hai tier lộ ra qua `buildModel`; model không khai báo thì field resolve về `undefined` (khẳng định phủ định tường minh); `promptCacheBreakpointTtl` sẵn có vẫn resolve `"30m"`; payload wire của OpenAI không đổi. | Có |
| `packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` | tạo | Test hợp đồng wire chứng minh trục mới không làm dịch chuyển bất kỳ giá trị nào gửi đi OpenAI. Khẳng định `prompt_cache_options` đã build cho một model có `promptCacheLifetime` và một model không có là **giống hệt nhau**. | Có |

Lưu ý về độ chắc chắn: cả sáu file trên đều đã được kiểm chứng (`verified: true`). Hai điểm bổ sung đã kiểm chứng nhưng nằm ngoài danh sách file: shape `"object"` đã được compiler hỗ trợ — `objectValue()` trong `packages/catalog/scripts/compat-compiler/compile-axes.ts` truyền thẳng `KdlScalar` (`string|number|boolean|null`) nên `{ short 300 }` một mình là một object thực sự partial. Và `bun run gen:compat` chạy sạch trong môi trường này, tạo **không** diff nào với file đã commit — nên generator là tất định và baseline sạch. Output: `wrote src/compat/rules.json (736 rules, 21 classes, 82 catalog providers, 91 auth providers, 221 files)`.

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

# Cần native addon — build một lần rồi cả ba dòng dưới đây chạy:
#   brew install ninja && bun --cwd=packages/natives run build
bun test packages/catalog/test/prompt-cache-lifetime.test.ts
bun test packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts
bun check
```

Lý do `bun test` cần addon (đã kiểm chứng ở trạng thái **chưa build**): `bun test` hỏng ngay lúc import **với mọi package**, kể cả `packages/catalog`, với lỗi `Failed to load pi_natives native addon for darwin-arm64` → `0 pass, 1 fail, 1 error`. Chuỗi gây ra là `build.ts` → `compat/resolve.ts:37` → `compat/cascade.ts:12` → `@oh-my-pi/pi-utils/lru` → `packages/natives`. `packages/catalog` không phụ thuộc trực tiếp pi-natives; nó bị kéo vào gián tiếp. Cách build được tài liệu hoá là `bun --cwd=packages/natives run build`, và lệnh đó shell ra `bun ../../scripts/bazel-natives.ts`, cần `ninja` trong PATH. **Đây không phải hạn chế của máy — chỉ là thiếu bước build:** `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần (exit 0) là xong, và sau đó cả ba dòng trên chạy. `bun check` = `check:ts` + `check:rs` chạy song song (`package.json:93`) nên thừa hưởng chính điều kiện đó.

Ngoài ra `bun run check:ts` hiện **không ổn định** trong cây làm việc này vì một lý do không liên quan tới W7: các phiên khác đang chạy song song ghi các file scratch type-probe không được track vào `packages/coding-agent/`, làm hỏng `check:types` của package đó (quan sát được lần lượt `w3-scratch-verify.ts`, rồi `__probe.types.ts`, rồi `__probe2.types.ts` qua ba lần chạy). Hãy chụp lại baseline của `check:ts` **trước khi bắt đầu**, và giới hạn cổng bằng `bun run --filter @oh-my-pi/pi-catalog check:types`.

### Cổng hoàn thành

Cả bốn điều kiện sau đều phải đúng:

1. `bun run gen:compat` exit 0 và `git status --short packages/catalog/` chỉ hiện đúng các file sinh lại đã mong đợi (kiểm tra **cả ba**: `rules.json`, `auth-ids.ts`, `provider-ids.ts`).
2. `bun run --filter @oh-my-pi/pi-catalog check:types` exit 0.
3. `bun run check:ts` không sinh lỗi **MỚI** ngoài baseline đã biết của các phiên chạy song song (chụp baseline trước khi bắt đầu).
4. Khi đã build được native addon: `bun test packages/catalog/test/prompt-cache-lifetime.test.ts packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` xanh, và suite sẵn có `packages/catalog/test/build.test.ts` "OpenAI explicit prompt-cache breakpoint compat" vẫn pass không đổi.

Cổng (1) một mình đã bắt được những lỗi nối dây có xác suất cao nhất: một directive chưa đăng ký sẽ fail với ``unknown directive `prompt-cache-lifetime` ``, một shape sai sẽ fail với `directive ... has a malformed value`, và một tên con camelCase sẽ fail với `must be kebab-case`.

**Cổng có thực sự đỏ được không:** Có, và nó đỏ theo một cách rất cụ thể, dễ chẩn đoán. `gen:compat` là một cổng thật: `collectAxis` / `axisFor` trong `packages/catalog/scripts/compat-compiler/compile-axes.ts` ném `CompatCompileError` khi gặp directive lạ, một trục shape `scalar` bị đưa một khối con, một object child viết camelCase, hoặc cùng một trục bị gán hai lần trong một khối. Cổng kiểu cũng là cổng thật: quên bước `Omit` sẽ biến `promptCacheLifetime` thành một `PromptCacheLifetime` bắt buộc trên `ResolvedAnthropicCompat` trong khi `resolveAnthropicPolicy` không bao giờ gán nó — đó là lỗi kiểu hoặc một lời nói dối thầm lặng. **Cảnh báo phải thành thật, vì nó quan trọng:** nửa test của cổng này cần native addon — chạy `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là cổng (4) chạy được, không có hạn chế riêng nào. Trước bước build đó thì chỉ cổng (1)–(3) là chạy được. Và phải nói rõ: compiler **sẽ không** phát hiện vấn đề "hai trục nói cùng một sự thật" — xem mục Đính chính, claim số 7 — nên cổng (1)–(3) có thể cùng xanh trong khi quyết định thiết kế vẫn chưa được đưa ra. Đó là lý do OQ1 được liệt kê như một câu hỏi mở chặn khởi đầu, không phải một chi tiết triển khai.

### Phụ thuộc

- **Cổng cứng, không phải một task:** phải có một bảng TTL prompt-cache theo từng provider và từng tier, có nguồn gốc, **trước khi** item này bắt đầu (open question 0 của plan). Chính các con số TTL là sản phẩm bàn giao của nghiên cứu đó; item này cung cấp schema, không cung cấp dữ liệu. Một kỹ sư không tìm được nguồn cho một con số thì phải để field ở `undefined` chứ không đoán — một TTL bị định giá quá cao làm số lần refresh phình lên trên một entry lẽ ra còn sống; bị định giá quá thấp thì chỉ mất thỉnh thoảng một lần miss có thể tránh được.
- **Không phụ thuộc cấu trúc.** Khác với phần lớn milestone này, W7 **không** phụ thuộc Wave 1 (W1/W2/W3/W5) — nó không chạm vào code lifecycle hay disposer nào. Có thể build song song với Wave 1.
- **W7 từng được dự định ship cùng W8 như một đơn vị; nay W8 nằm ngoài phạm vi (xem khối ⛔ ở đầu §W8) nên W7 ship một mình.** Lập luận "trục này một mình là trọng lượng chết" vẫn đúng **về KDL** — `promptCacheLifetime` phải do rule sở hữu chứ không hard-code trong code. Cổng bảng TTL theo provider theo tier ở trên là tiền đề cứng của W7, và giờ chỉ của W7.

**Chặn (lịch sử, đã hết hiệu lực):** W8 (cache warmer Anthropic, mặc định tắt) từng bị chặn bởi đúng ý nghĩa của trục này; W8 nay nằm ngoài phạm vi (xem khối ⛔ ở đầu §W8). Các neo nó từng trỏ tới — `ANTHROPIC_CACHE_TTL_MS` tại `packages/ai/src/stream.ts:1209` và bật vô điều kiện tại `packages/coding-agent/src/sdk.ts:4111` — không còn tồn tại.

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
| (ngầm, plan không nói) rằng thêm một field optional vào một shape compat đã resolve chỉ là sửa một dòng. | incomplete | `ResolvedAnthropicCompat` là `Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard">> & {...}`. Vòng bọc `Required<>` khiến `promptCacheLifetime?:` mới trên `AnthropicCompat` trở thành `PromptCacheLifetime` **bắt buộc** trên kiểu resolved, trái trực tiếp với yêu cầu cứng của chính plan là mặc định phải **vắng mặt** khi chưa biết. Field buộc phải được thêm vào union `Omit` và khai báo lại optional trong intersection `& {...}` — đúng mẫu file đã dùng cho `streamIdleTimeoutMs` và `thinkingLoopGuard`. Plan không hề nhắc tới, và làm sai thì kiểu sẽ claim một giá trị mà resolver không bao giờ gán. Bằng chứng: `types.ts:963` `export type ResolvedAnthropicCompat = Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard">> & {` |
| Trục mới nên được viết "cạnh `prompt-cache-mode` / `prompt-cache-minimum-tokens` / `prompt-cache-maximum-checkpoints` ở `:258-266` (và các lần lặp ở `:263, :269, :283, :289, :298`)". | misleading | Số dòng đúng, nhưng phần bị bỏ sót mới là phần mang tải trọng: tất cả những trục prompt-cache đó nằm bên trong khối `on "amazon-bedrock" { ... }` mở ra ở `anthropic.kdl:255`, nên chúng chỉ áp dụng cho provider `amazon-bedrock`. Chép nguyên anchor này sẽ viết rule chỉ cho Bedrock và để Anthropic first-party — họ model mà warmer của W8 thực sự phục vụ — không có gì. Rule bắt buộc phải xuất hiện thêm dưới một selector `on "anthropic" { ... }` (file có nhiều khối như vậy: `:14, :44, :64, :183`). Bằng chứng: `sed -n '250,360p' packages/catalog/src/compat/rules/classes/anthropic.kdl` — dòng 255 là `on "amazon-bedrock" {`, và các khối `on "anthropic"` của file nằm ở 14, 44, 64, 183. |
| Test (4) nên khẳng định payload gửi đi "tại `openai-responses.ts:1168` và `openai-completions.ts:1791`" bằng cách build request params qua đường public của provider. | partly-wrong | Chỉ làm được cho đường responses. `openai-responses.ts:1174` là `export function buildParams` và nó gọi `applyOpenAIResponsesPromptCachePolicy` ở `:1365`, nên params reachable. Nhưng `openai-completions.ts:1797` là `function buildParams(` không có export, và policy function `applyOpenAIChatCompletionsPromptCachePolicy` (`:1767`) cũng private, chỉ reachable từ `:1999`. Không có đường public nào tới các params đó. Cần lưu ý thêm: hướng dẫn tiếp theo của chính plan (dòng 3179) cấm viết cái này thành source-grep của hai dòng `ttl:` — test kiểu đó vẫn xanh ngay cả khi trục được nối ngược, và `AGENTS.md` cấm source-grep hoàn toàn. Đã ghi lại thành OQ2 với ba lựa chọn cụ thể. Bằng chứng: grep `^export ` trong `openai-completions.ts` chỉ ra `applyOpenRouterRoutingVariant`, `isOpenAICompletionsProgressChunk`, `OpenAICompletionsOptions`, `streamOpenAICompletions`, `parseChunkUsage`, `convertMessages` — không có `buildParams`; `sed -n '1797,1800p'` cho thấy `function buildParams(`. |
| (khối F5 của plan) "The boolean axis doesn't set priority=, so resolve will throw AmbiguousOverlapError — you'll hit it at bun run gen:compat." | wrong | `AmbiguousOverlapError` chỉ nổ lên khi hai rule **cùng rank** tranh **cùng một axis key** (`cascade.ts:245-253` khoá winner theo axis; doc của class ở `cascade.ts:6-9` nói các rule resolve độc lập theo từng axis). Hai axis **khác nhau** không bao giờ va nhau, và `collectAxis` chỉ lỗi khi một khóa bị gán lặp trong cùng một khối. Nên viết `prompt-cache-lifetime` cạnh `supports-long-prompt-cache-retention` sẽ **KHÔNG** tạo lỗi compiler. Vấn đề hai-nguồn-sự-thật là có thật và tinh thần `AGENTS.md` cấm nó, nhưng đó là một quyết định thiết kế không có cổng tự động nào — điều này làm nó **càng** cần được giải quyết có chủ đích (OQ1) chứ không kém đi. Plan hứa một tripwire compiler không tồn tại. Bằng chứng: `cascade.ts:6-9` "per axis the matching rule with the greatest (model-selector exactness, constrained-dimension count, priority) tuple wins, and an equal-tuple same-axis contest throws AmbiguousOverlapError"; `cascade.ts:245-253` khoá trên `winners[axis]`; `collectAxis` trong `compile-axes.ts` chỉ lỗi khi `axis.key in map`. |
| Xác minh là `bun run gen:compat && bun check && bun test packages/catalog/test/prompt-cache-lifetime.test.ts`. | partly-wrong | `bun test` cần native addon với **mọi** package, kể cả `packages/catalog`, vốn không phụ thuộc trực tiếp pi-natives nhưng bị kéo vào gián tiếp qua `build.ts` → `compat/resolve.ts:37` → `compat/cascade.ts:12` → `@oh-my-pi/pi-utils/lru`. Cách build được tài liệu hoá shell ra bazel và cần `ninja` trong PATH. Đây là điều kiện tái lập được, không phải hạn chế của máy: `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là mọi `bun test` của tài liệu này chạy. `bun check` = `check:ts` + `check:rs` chạy song song (`package.json:93`) và thừa hưởng chính điều kiện đó. `bun run gen:compat` **có** chạy — đã chạy và cho ra không diff nào với `rules.json` đã commit, xác nhận cả generator là tất định lẫn baseline sạch. Riêng `bun run check:ts` hiện không đáng tin trong cây làm việc này vì một lý do không liên quan tới W7: các phiên khác đang ghi các file scratch type-probe không được track vào `packages/coding-agent/`, làm hỏng `check:types` của package đó (quan sát `w3-scratch-verify.ts`, rồi `__probe.types.ts`, rồi `__probe2.types.ts` qua ba lần chạy liên tiếp). Hãy giới hạn cổng bằng `bun run --filter @oh-my-pi/pi-catalog check:types` và chụp baseline `check:ts` trước khi bắt đầu. Bằng chứng: `bun test packages/catalog/test/descriptors.test.ts` → 0 pass, 1 fail, `Failed to load pi_natives native addon for darwin-arm64`; `bun -e 'import("@oh-my-pi/pi-catalog/build")'` → cùng lỗi, trong khi `import("@oh-my-pi/pi-catalog/compat/axes")` → OK; `which bazel bazelisk` → not found; `bun run gen:compat` → `wrote src/compat/rules.json (736 rules, 21 classes, 82 catalog providers, 91 auth providers, 221 files)` với `git diff --stat` rỗng; ba lần `bun run check:ts` liên tiếp mỗi lần fail trên một file probe khác tên. |
| Sinh lại và commit `packages/catalog/src/compat/rules.json` kèm thay đổi `.kdl`. | incomplete | `bun run gen:compat` ghi **BA** file, không phải một: `rules.json` cộng `packages/catalog/src/compat/auth-ids.ts` và `packages/catalog/src/compat/provider-ids.ts` (xem `packages/catalog/scripts/compile-compat.ts`). Thực tế hai file `.ts` chỉ dịch chuyển nếu bề mặt auth/provider thay đổi, điều mà một trục cache-lifetime không nên có, nhưng người triển khai vẫn phải kiểm tra `git status` cho cả ba thay vì giả định chỉ `rules.json` dịch chuyển. Bằng chứng: `packages/catalog/scripts/compile-compat.ts` ghi `outPath`, `authIdsPath` và `providerIdsPath` trong một lần chạy. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W7.md`.

**Cảnh báo neo.** Nguyên văn từ phiếu:

> **Đã kiểm: 55. Đúng: 54. Hỏng: 1.**
>
> Neo hỏng duy nhất: **`package.json:93`** (plan dùng làm bằng chứng `check` = `check:ts` + `check:rs`) — `:93` là `"lint": "bun run --parallel lint:ts lint:rs"`. Đúng là **`package.json:89`**: `"check": "bun run --parallel ch…`. Thay thế bằng `package.json:89` (dòng đúng) — đã kiểm ✅.

**Ngoài neo, ba tuyên bố của plan đã lỗi thời:**

1. **`bun test` KHÔNG còn bị chặn.** Plan ghi `Failed to load pi_natives native addon for darwin-arm64`. Đo: `bun test packages/catalog/test/` → **955 pass / 0 fail / 123 file**; addon có tại `packages/natives/native/pi_natives.darwin-arm64.node`. (`bazel`/`bazelisk` vẫn không có trong PATH.)
2. **Ba file scratch mà plan nêu tên không tồn tại.** `w3-scratch-verify.ts`, `__probe.types.ts`, `__probe2.types.ts` ở gốc `packages/coding-agent/` — **không file nào tồn tại**. File thật gây đỏ là `packages/coding-agent/src/collab/w3-scratch-verify.ts` (26 byte, `??` untracked). Chẩn đoán của plan **đúng bản chất** (phiên song song ghi file scratch), **sai đường dẫn**. Baseline `check:ts` **di chuyển giữa các lần chạy**: lần 1 → 5 lỗi TS ở `@oh-my-pi/collab-web` về `"bye"` không thuộc union frame; lần 2 → 1 lỗi `TS2741` ở `@oh-my-pi/pi-coding-agent`. Nên "so với baseline" không có nghĩa nếu không chụp baseline ngay trước lúc chạy.
3. **`gen:compat` in 737 rules, không phải 736.** Vẫn exit 0 và `git status` rỗng — kết luận "generator tất định + baseline sạch" giữ nguyên.

Các neo **đúng, dùng được** (54): `types.ts:237` (`OpenAICompat`), `:393`, `:403` (`promptCacheBreakpointTtl?: "30m";` — **nằm trong `OpenAICompat`**), `:526` (`AnthropicCompat`), `:745`, `:795`, `:823`, `:863-865`, `:963` (`Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard">> & {`); `axes.ts:74` (chữ ký `wire(key, records, shape = "scalar", values?)`), `:106`, `:153`, `:216-218`, `:380` (`export const API_COMPAT_RECORDS`, plan ghi `:369-381`), `:386` (`"anthropic-messages": ["anthropic"]`); `resolve.ts:37`, `:131-140` (`applyWireAxes` gate trên `meta?.records.some(...)`), `:533`/`:723`, `:721`, `:830`, `:899`; `cascade.ts:6-9`, `:12`, `:245-253` (`const held = winners[axis];`); `anthropic.kdl:14, 44, 64, 183` (bốn khối `on "anthropic"`), `:252-254` (comment model-card AWS), `:255` (`on "amazon-bedrock" {`), `:258-266`, `:266, 286, 292, 317, 328, 341, 349` (bảy dòng `supports-long-prompt-cache-retention #true`); `compile-axes.ts:17-20`, `:28-33`, `:41`, `:87-90`, `:96-101`; `kdl-reader.ts:80-81`; `compile-compat.ts:11-18`; `amazon-bedrock.ts:960`; `openai-responses.ts:1168`, `:1174`, `:1253`, `:1365`; `openai-completions.ts:1767` (private), `:1791`, `:1797` (**không** export), `:1999`; danh sách `^export ` của `openai-completions.ts` (6 mục, không có `buildParams`); `models-config-schema-bundle.ts:70` và `:96`; `anthropic-fable-5-1-cache-read.test.ts:20`; `build.test.ts:960` (`describe("OpenAI explicit prompt-cache breakpoint compat", …)`); và xác nhận **đã chết**: `stream.ts:1209` (nay là dòng `}` đóng hàm trước) + `sdk.ts:4111` (nay là `promptCacheKey: providerPromptCacheKey,`).

**Bảng điểm sửa.** TRƯỚC được trích nguyên văn từ file thật, đã mở và đọc trong cây này.

| đường/dẫn | symbol / hàm | TRƯỚC (nguyên văn) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/catalog/src/types.ts` (ngay trên dòng 526) | *(chưa tồn tại)* | dòng 525 là ` */` — dòng kết của doc comment ngay trên `export interface AnthropicCompat` | thêm 2 export: `export type CacheRetentionTier = "short" \| "long";` và `export type PromptCacheLifetime = Partial<Record<CacheRetentionTier, number>>;` |
| `packages/catalog/src/types.ts:526` | `AnthropicCompat` | `export interface AnthropicCompat {` | giữ nguyên dòng này; **bên trong thân interface** thêm `promptCacheLifetime?: PromptCacheLifetime;` |
| `packages/catalog/src/types.ts:237` | `OpenAICompat` | `export interface OpenAICompat {` | **không sửa.** Field KHÔNG được đặt ở đây (xem cạm bẫy #1) |
| `packages/catalog/src/types.ts:963` | `ResolvedAnthropicCompat` | `export type ResolvedAnthropicCompat = Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard">> & {` | `Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard" \| "promptCacheLifetime">> & {` |
| `packages/catalog/src/compat/axes.ts` (cạnh dòng 216–218) | `AXES` | dòng 216–218 hiện là ba trục prompt-cache của bedrock: `"prompt-cache-maximum-checkpoints": wire("promptCacheMaximumCheckpoints", ["bedrock"]),` / `"prompt-cache-minimum-tokens": wire("promptCacheMinimumTokens", ["bedrock"]),` / `"prompt-cache-mode": wire(…)` | thêm `"prompt-cache-lifetime": wire("promptCacheLifetime", ["anthropic", "bedrock"], "object"),` — xem bước 4 về OQ1 |
| `packages/catalog/src/compat/rules/classes/anthropic.kdl` (trong một khối `on "anthropic"`, ví dụ khối mở ở dòng 44) | rule block | khối `on "anthropic" {` ở dòng 44 hiện chưa có directive cache-lifetime | thêm khối con `prompt-cache-lifetime { short 300 / long 3600 }` kèm comment nguồn theo đúng quy ước file (mẫu ở 252–254) |
| `packages/catalog/src/compat/rules.json` | *(sinh ra)* | file sinh tự động, **không sửa tay** | `bun run gen:compat` sinh lại; kiểm diff cả 3 file sinh |
| `packages/catalog/test/prompt-cache-lifetime.test.ts` | *(tạo mới)* | không tồn tại | 4 case: (a) lộ cả hai tier, (b) `undefined` tường minh, (c) `promptCacheBreakpointTtl === "30m"` không đổi, (d) ca phủ định không rò sang provider khác |
| `packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` | *(tạo mới)* | không tồn tại | `prompt_cache_options` deep-equal giữa model có/không `promptCacheLifetime` |

**Không sửa:** `packages/ai/src/providers/*.ts` (trừ khi OQ2 chọn phương án (a)). Wire OpenAI phải giữ nguyên — đó là cả hợp đồng của work item.

**Các bước có neo đã kiểm.**

0. **CHỐT OQ1 TRƯỚC KHI VIẾT DÒNG KDL NÀO.** OQ1 là câu hỏi chặn khởi động, và nó **quyết định luôn nội dung dòng `axes.ts` ở bước 4**. Không thể làm sau. Sự thật đã kiểm chứng: **đã tồn tại một trục anh em đã nối đầy đủ** — `axes.ts:153` → `"supports-long-prompt-cache-retention": wire("supportsLongPromptCacheRetention", [...OAI, "bedrock"]),` (records **không** chứa `"anthropic"`, nên nó không bao giờ chạm model `anthropic-messages`); khai báo ở `anthropic.kdl` các dòng 266, 286, 292, 317, 328, 341, 349; consumer sống #1 `amazon-bedrock.ts:960`, consumer sống #2 `openai-responses.ts:1253`; resolve `resolve.ts:721`, `:830`, baseline hard-code `false` ở `resolve.ts:899`. Khi `promptCacheLifetime` tồn tại sẽ có **hai nguồn sự thật cho cùng một điều** — phải có người quyết trước. **Khuyến nghị (KHÔNG phải quyền tự quyết):** giữ boolean, giới hạn trục mới về `["anthropic"]`, mở work item riêng cho việc hợp nhất. Nếu chọn phương án này thì bước 4 dùng `["anthropic"]` và **bước 6 bỏ qua hoàn toàn**.
1. **`packages/catalog/src/types.ts`** (đặt giữa dòng 525 và 526) — chèn hai type alias **ở giữa**, tức ngay trên interface, **không** đặt bên trong interface:
```ts
export type CacheRetentionTier = "short" | "long";

/**
 * Thời gian sống của entry prompt cache theo từng tier, tính bằng GIÂY.
 * Một khoá vắng mặt nghĩa là thời gian sống của tier đó chưa biết —
 * consumer phải fail safe, không được thay bằng giá trị mặc định.
 * Do KDL axis `prompt-cache-lifetime` sở hữu.
 */
export type PromptCacheLifetime = Partial<Record<CacheRetentionTier, number>>;
```
2. **`types.ts:526`** (thân `AnthropicCompat`) — thêm `promptCacheLifetime?: PromptCacheLifetime;` kèm doc comment nói rõ giá trị do KDL axis sở hữu và **không** được set khi chưa biết. **Không** thêm vào `OpenAICompat` (`types.ts:237`).
3. **`types.ts:963`** (`ResolvedAnthropicCompat`) — thêm `"promptCacheLifetime"` vào union `Omit<...>`, rồi khai lại optional trong `& { … }`. Vì có `Required<>`, một field optional mới sẽ thành field **bắt buộc** trên kiểu resolved trong khi `resolveAnthropicPolicy` không bao giờ gán nó. **Bước bắt buộc** — bỏ qua thì kiểu nói dối về giá trị runtime.
4. **`packages/catalog/src/compat/axes.ts`** (chèn cạnh dòng 216–218) — thêm `"prompt-cache-lifetime": wire("promptCacheLifetime", ["anthropic", "bedrock"], "object"),`. Tham số thứ ba **phải** là `"object"`: `axisValue()` trong `compile-axes.ts` với shape `scalar` kiểm `if (node.args.length !== 1 || node.children) malformed(node);` — tức một khối con sẽ làm đỏ. Có tiền lệ `axes.ts:106` dùng 3 tham số với shape `object`. **Không truyền mảng `values`** — tham số thứ tư chỉ áp cho shape `scalar`/`array`.
5. **`packages/catalog/src/compat/rules/classes/anthropic.kdl`** — các khối `on "anthropic"` của file nằm ở các dòng **14** (`on "anthropic" "google-vertex" {`), **44** (`on "anthropic" {`), **64** (`on "anthropic" "cloudflare-ai-gateway" "google-vertex" {`), **183**. Khối `on "amazon-bedrock" {` mở ở dòng **255** và **toàn bộ** nhóm `prompt-cache-mode` / `prompt-cache-minimum-tokens` / `prompt-cache-maximum-checkpoints` (258–349) đều nằm bên trong nó. Hình dạng: `prompt-cache-lifetime { short 300 / long 3600 }`. Dùng `short`/`long` làm tên con: `payloadKey()` (`compile-axes.ts:28-33`) trả `AXES[child.name]?.key ?? …`; đã grep xác nhận **không có** axis nào tên `short` hay `long`. Có thể chỉ khai một tier trong một khối nhất định — payload thực sự partial.
6. **`anthropic.kdl` khối `on "amazon-bedrock"` (dòng 255)** — chỉ làm nếu OQ1 nghiêng sang phương án đưa Bedrock vào. Nếu OQ1 theo khuyến nghị: **bỏ qua bước này** và đặt records của trục là `["anthropic"]` thôi.
7. **Repo root → `bun run gen:compat`** — đã chạy thử ở cây này: **exit 0**, in `wrote src/compat/rules.json (737 rules, 21 classes, 82 catalog providers, 91 auth providers, 221 files)` và `git status --short packages/catalog/` **rỗng**. Đã đọc `packages/catalog/scripts/compile-compat.ts:11-18`: một lần chạy ghi **ba** file — `outPath` (`rules.json`), `authIdsPath` (`auth-ids.ts`), `providerIdsPath` (`provider-ids.ts`). Kiểm `git status` cho **cả ba**, đừng giả định chỉ `rules.json` dịch chuyển.
8. **`packages/catalog/test/prompt-cache-lifetime.test.ts`** — mẫu `spec()` đã đọc tại `packages/catalog/test/anthropic-fable-5-1-cache-read.test.ts:20`: `function spec(id: string): ModelSpec<"anthropic-messages"> {`. Bốn case, xem hợp đồng test.
9. **`packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts`** — xem OQ2 ở cạm bẫy #3: đã có sẵn 10 test đang import `buildParams`, làm theo mẫu là rẻ nhất.
10. **`packages/catalog/CHANGELOG.md`** (+ `packages/ai/CHANGELOG.md` nếu có đụng source `packages/ai`) — một dòng dưới `## [Unreleased]`, ngắn, diễn đạt theo năng lực mở ra chứ không mô tả việc.

**Hợp đồng test.** `packages/catalog/test/prompt-cache-lifetime.test.ts`:

| # | Case | Khẳng định | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| (a) | model mà KDL khai báo | `buildModel(...).compat.promptCacheLifetime` lộ **cả hai** tier **với `typeof === "number"`** (giây) | consumer phải quay lại hằng số hard-code; phần cache economics của Wave 3a mất nền |
| (b) | model không khai báo gì | field resolve về `undefined` — **khẳng định tường minh**, đừng để pass bằng sót | trục default về `0`/hằng số ⇒ nhánh fail-safe của W8 được giả định chứ không bảo vệ |
| (c) | fixture openai gpt-5.6 hiện có | `promptCacheBreakpointTtl === "30m"`, `supportsPromptCacheBreakpoints === true` | request OpenAI đổi byte — quyết định "thêm trục anh em, **không** mở rộng field wire hiện có" bị phá |
| (d) | ca phủ định rò trục | model thuộc provider **không** nằm trong records của trục thì field vắng | trục rò sang provider nó không được viết cho |

Mẫu cho (c): `packages/catalog/test/build.test.ts:960` có `describe("OpenAI explicit prompt-cache breakpoint compat", …)` với fixture `completionsSpec({ id: "gpt-5.6", provider: "openai", baseUrl: "https://api.openai.com/v1" })`.

`packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts`: case (d') — model OpenAI Responses **có** `promptCacheLifetime` vs model giống hệt **không** có ⇒ `prompt_cache_options` sinh ra **deep-equal**; nếu hồi quy, một trường lạ xuất hiện trong request OpenAI. Cùng file đó phải chứng minh (c) ở cấp wire: chuỗi `ttl: promptCache.ttl ?? model.compat.promptCacheBreakpointTtl` tồn tại nguyên văn ở `openai-responses.ts:1168` và `openai-completions.ts:1791`. **Cấm tuyệt đối:** không viết test này thành source-grep hai dòng `ttl:` — `AGENTS.md` cấm source-grep hoàn toàn, và test kiểu đó **vẫn xanh ngay cả khi trục được nối ngược**.

**Cổng có đỏ được không.** Trạng thái thật đo được ở cây này: `bun run gen:compat` **exit 0** (in `… (737 rules, …)`, `git status --short packages/catalog/` rỗng); `bun run --filter @oh-my-pi/pi-catalog check:types` **exit 0** (`Done in 6.04s`) — cổng đáng tin nhất; `bun test packages/catalog/test/` **955 pass / 0 fail / 123 file** (⚠️ plan nói `bun test` bị chặn — **KHÔNG còn đúng**); `bun run check:ts` **exit 1** nhưng lỗi **đổi mỗi lần chạy**.

Cổng đề xuất (thay bốn điều kiện cũ):

1. `bun run gen:compat` exit 0 **và** `git status --short packages/catalog/` chỉ hiện `rules.json` (+ `auth-ids.ts` / `provider-ids.ts` nếu dịch chuyển) cùng bản sửa `.kdl` của bạn.
2. `bun run --filter @oh-my-pi/pi-catalog check:types` exit 0.
3. `bun test packages/catalog/test/prompt-cache-lifetime.test.ts packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` xanh toàn bộ.
4. `bun test packages/catalog/test/build.test.ts` vẫn xanh — đặc biệt `describe("OpenAI explicit prompt-cache breakpoint compat")` không đổi.
5. `bun run check:ts` — **chạy sau cùng, và chỉ để ghi nhận**, không dùng làm tiêu chí đỏ/được. Chụp output, so với baseline của chính bạn. Lý do: nó đang đỏ vì file scratch của phiên khác.

**ĐỎ ĐƯỢC, phần lớn.** Đã đọc và xác nhận từng đường lỗi:

| Sai lầm | Đỏ bằng thông điệp này | Đọc ở đâu |
| --- | --- | --- |
| Directive chưa đăng ký | ``unknown directive `prompt-cache-lifetime` `` | `compile-axes.ts:90` (`axisFor`) |
| Shape sai (scalar bị đưa khối con, hoặc object không có khối con) | ``directive `X` has a malformed value`` | `kdl-reader.ts:80-81` (`malformed`) |
| Tên con camelCase | ``object payload key `X` must be kebab-case`` | `compile-axes.ts:30` (`payloadKey`) |
| Gán trục hai lần trong cùng một khối | ``axis `X` assigned twice in one block`` | `compile-axes.ts:101` (`collectAxis`) |
| Quên bước `Omit` (bước 3) | lỗi kiểu từ `check:types` | `types.ts:963` |

**⚠️ Nơi cổng KHÔNG đỏ được — phải biết trước:**

1. **Không cổng nào đỏ được cho "hai trục nói cùng một sự thật".** Plan (khối F5) hứa `AmbiguousOverlapError`. Đã đọc `cascade.ts:6-9` và `cascade.ts:245-253`: tranh chấp khoá theo `winners[axis]` — **hai axis khác nhau không bao giờ va nhau**.
2. **Không cổng nào đỏ được cho "số bị viết thành chuỗi".** Plan bước 5 nói *"kiểu resolved đòi hỏi một `number`"* — **câu này sai về cơ chế**. `objectValue()` (`compile-axes.ts:41`) gọi `scalarValue()` (`:17-20`) trả thẳng `KdlScalar`, nên một giá trị chuỗi sẽ đi qua `gen:compat` ✅, qua `check:types` ✅, qua cả 5 cổng ✅ — **và** đẩy một **string** vào `compat.promptCacheLifetime.short` ở runtime. Chỉ test case (a) mới bắt được. **Đây là lý do case (a) phải assert `typeof === "number"`, không được assert `toEqual` mơ hồ.**
3. **`check:ts` không phải cổng.** Nó đang đỏ vì file scratch của phiên khác và đổi mặt mỗi lần chạy. Dùng nó làm tiêu chí đỏ/được tạo ra an toàn giả.

**Cạm bẫy riêng của mục này.**

**#1 — Dễ nhất: đặt field vào `OpenAICompat` (`:237`) theo đúng chỉ dẫn file của plan.** Plan gốc bảo đặt field "ngay cạnh `promptCacheBreakpointTtl?: "30m"` ở `types.ts:403`". Đã đọc: `:403` nằm trong `OpenAICompat` (khai báo ở `:237`). Đặt ở đó sẽ đặt trục lên shape chỉ-dành-OpenAI, khiến nó **vĩnh viễn vô hình với đúng consumer duy nhất cần tới nó**. Vì sao im lặng: `applyWireAxes` (`resolve.ts:131-140`) chỉ gán khi API của model ánh xạ tới một record mà trục khai báo; `API_COMPAT_RECORDS` (`axes.ts:380-391`) map `anthropic-messages` → `["anthropic"]` và `openai-responses` → `["openai-responses"]` — hai tập rời nhau. Code sẽ type-check, compile, regenerate sạch, qua mọi cổng, **và chết lặng lẽ ở runtime**.

**#2 — Dễ nhất thứ hai: chép anchor `:255-360` và đặt rule chỉ trong khối Bedrock.** Toàn bộ nhóm `prompt-cache-mode` / `prompt-cache-minimum-tokens` / `prompt-cache-maximum-checkpoints` (258–349) đều nằm bên trong `on "amazon-bedrock" {` mở ở 255. Chép nguyên anchor sẽ viết rule chỉ cho Bedrock, để Anthropic first-party — họ model mà mọi consumer tương lai phục vụ — không có gì. **Không cái sai nào trong hai cái này tạo ra một build đỏ.** Đó là lý do test (a) và test (d) tồn tại.

**#3 — OQ2: đường completions không có cửa public.** `openai-responses.ts:1174` → `export function buildParams(` — export, dùng được (gọi policy ở `:1365`). `openai-completions.ts:1797` → `function buildParams(` — **không** export; policy `:1767` cũng private, chỉ reachable từ `:1999`. **Khuyến nghị: chọn phương án (c) — không cần sửa production code.** Đã có **10 test** đang import `buildParams` từ `@oh-my-pi/pi-ai/providers/openai-responses` và gọi dạng `buildParams(model, context, options, undefined).params` — xem `packages/ai/test/abliteration-effort-aliases.test.ts:16`. Ghi lựa chọn vào comment đầu file test như plan yêu cầu.

**#4 — Hai neo đã chết, đừng tìm.** `ANTHROPIC_CACHE_TTL_MS` **không tồn tại** trong mã nguồn (grep toàn repo chỉ ra nó chỉ xuất hiện trong file kế hoạch).

**#5 — `gen:compat` in 737, không phải 736.** Số liệu trong plan đã cũ; kết luận "generator tất định, baseline sạch" vẫn đúng và đã được xác nhận lại.

---


## W8. Biến vòng prompt-cache refresh đang có thành một vòng có cổng chi phí (không phải warmer thứ hai)

> ### ⛔ ĐÍNH CHÍNH 2026-09-28 — W8 nằm ngoài phạm vi; cổng của nó đỏ vĩnh viễn
>
> Upstream 18.3.5 đã xoá sạch tầng stream-level keep-alive mà W8 định sửa
> (`packages/ai/CHANGELOG.md:37`, breaking change #12699) và dựng thay bằng
> `packages/coding-agent/src/session/cache-warmer.ts` (599 dòng) + `test/cache-warmer.test.ts`
> (399 dòng). Bốn neo mà W8 chỉ định — `stream.ts:1209`, `types.ts:439`, `sdk.ts:4111`,
> `settings.ts:863` — không còn tồn tại. **Cũng không còn** các neo còn lại mà §W8 dùng
> (`stream.ts:1237`, `:1258`, `:1292`, `:1322`, `:1348`, `:1369`, `:1370`, `:1431`,
> `:1454`, `:1465`): `grep -n 'CacheRefresh\|ANTHROPIC_CACHE' packages/ai/src/stream.ts`
> ở HEAD trả về **0 dòng** — cả tầng stream-level đã biến mất, không chỉ vài dòng.
> **Cổng `test ! -e packages/coding-agent/src/session/cache-warmer.ts`
> ở dòng 1779 giờ đỏ vĩnh viễn; đừng chạy nó, đừng cố làm nó xanh.** Cổng chi phí mà W8 từng hỏi đã
> được giải quyết bằng cờ `providers.cacheWarming` (`settings.ts:1120-1121`).
>
> **Cùng đợt xoá đó, file test `packages/ai/test/anthropic-cache-refresh.test.ts` cũng biến
> mất** — `f804d66` xoá 386 dòng, 0 dòng thêm. Mọi câu hỏi kiểu "7 khối `it()` ở đâu",
> "case retention ở `:335`", "case OAuth ở `:359`" trong §W8 này là **số đo đúng cho
> `ecd516f` (18.3.3), không phải cho HEAD**. Đừng đi tìm chúng; chúng không tồn tại.
> Kẻ thừa kế thật sự của tầng warm là `packages/coding-agent/src/session/cache-warmer.ts`
> (599 dòng) + `packages/coding-agent/test/cache-warmer.test.ts` (399 dòng, 18 khối
> `test()` trong 2 `describe()`) — hai số đó đã đo ở HEAD.

**Thay đổi gì:** Vòng lặp keep-alive prompt-cache đang chạy vô điều kiện hôm nay được gộp về một cờ tri-state duy nhất (`off` / `cost-gated` / `always`) cộng một cổng kinh tế, để thứ duy nhất tiêu tiền của người dùng là thứ họ đã tự bật.
**Wave:** ~~3a — Cache economics (ships together with W7, default-OFF).~~ ⛔ **Đã hết hiệu lực 2026-09-28** — W8 nằm ngoài phạm vi, nên **W7 ship một mình** (xem mục *Phụ thuộc* của W7: "W7 từng được dự định ship cùng W8 như một đơn vị; nay W8 nằm ngoài phạm vi").
**Effort:** M — bốn thay đổi vào code đang chạy, không phải port một package. Phần lớn công việc là viết lại các test đang khoá hành vi cũ, chứ không phải viết production code mới. Dành thêm cẩn thận cho test duy nhất phải ĐỔI kỳ vọng thay vì chỉ thêm một case.

**Người dùng thấy:** Có setting mới `providers.promptCacheRefresh` (`off` mặc định, `cost-gated`, `always`). Ở `off` — mặc định cho release đầu — các lần replay keep-alive 4m45s vô điều kiện đang ship hôm nay dừng hẳn, nên hoá đơn Anthropic của người dùng giảm và không có gì được chi tiêu. `always` khôi phục đúng hành vi hôm nay. `cost-gated` chỉ warm khi lợi ích kỳ vọng vượt sàn $0.05, và warm ở pha idle cần khoảng $0.35 chi phí miss mới thực sự bắn — nên ở đa số phiên nó đúng là không làm gì cả, và release notes phải nói thẳng điều đó ra, nếu không người đọc sẽ tưởng tính năng hỏng. Đây là thay đổi hành vi trên một tính năng đang chạy, nên cần một changelog entry nói thẳng.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/ai/src/stream.ts` | sửa | Thay `ANTHROPIC_CACHE_TTL_MS` hard-code (`:1209`) bằng `promptCacheLifetime` theo tier của W7 (thiếu ⇒ không warm, fail safe); thêm field `#decision` / `#phase` và mở rộng `arm()` (`:1237`) thành `(plan, cacheTouchedAtMs, decision, phase)`; `#refresh()` đọc phase probe ngay trước lúc quyết định; tính `warmCost`/`missCost` trong `armRefresh` (`:1454`) từ `model` + `message.usage` vốn đã có sẵn trong scope; nới `supportsAnthropicCacheRefresh` (`:1292`) thành KDL-driven cho trục api/provider/transport nhưng GIỮ `isLeakedThinkingHealExempt(model)`; bỏ hard-code `cacheRetention: "short"` ở warm request (`:1370`) thay bằng `resolveCacheRetention(options.cacheRetention)`; nới cổng retention ở `:1431`; giữ nguyên replay guard (`:1369`). | có — mọi line number trong spec cho `stream.ts` đã tái lập bằng `grep -n` trên HEAD `ecd516f` |
| `packages/ai/src/types.ts` | sửa | `:439`: mở rộng `anthropicCacheRefresh?: boolean` thành `anthropicCacheRefresh?: "off" \| "cost-gated" \| "always"` (thêm union type có tên được export; `undefined` giữ nguyên nghĩa cũ là off, nên mọi consumer hiện có bỏ trống field vẫn xanh). Thêm `anthropicCacheRefreshPhase?: () => "streaming" \| "idle"` ngay cạnh — là probe, không phải literal. | có — `:439` chính xác. Đây là mở rộng public type, nên là breaking change với mọi caller bên ngoài truyền boolean. |
| `packages/coding-agent/src/sdk.ts` | sửa | ở `:4111` thay `anthropicCacheRefresh: true` hard-code bằng tri-state đọc từ settings, và thêm phase probe `() => (agent.state.isStreaming ? "streaming" : "idle")`. `agent` đã có sẵn trong closure này — `agent.state.tools` được đọc ở `:4105`. KHÔNG đụng vào `transformProviderContext` (`:3949`); nó làm việc trên messages và không có đường tới stream options. | có — PLAN nói `:4105` — THỰC TẾ là `:4111`. Plan lệch 6 dòng; mọi anchor sdk.ts khác trong plan cũng lệch. Xem mục Đính chính. |
| `packages/coding-agent/src/session/settings.ts` | sửa | Đăng ký `providers.promptCacheRefresh` như enum tri-state theo khuôn `cfgProvidersAnthropicSlowMode` ở `:863` (`register({ id, type: "enum", values: [...] as const, default: "off" as const })`), mặc định `"off"`. | có — PLAN nói `:860` — THỰC TẾ là `:863`. Tiền lệ `slowMode` cố ý KHÔNG mang block `ui`; phải quyết rõ setting này có UI `/settings` hay chỉ script-only như model của nó. |
| `packages/ai/test/anthropic-cache-refresh.test.ts` | sửa | Thêm test (0)–(6) và VIẾT LẠI (không xoá) case retention ở `:335`. Đồng thời xác minh case OAuth chưa được plan nhắc tới ở `:359` vẫn xanh sau khi nới cổng `:1431` — nó khoá cùng một lỗ hổng bằng đường khác. | **KHÔNG — file KHÔNG tồn tại ở HEAD.** Số đo trong bản plan cũ (386 dòng, 7 khối `it()` tại `:237, :257, :279, :297, :318, :335, :359`) là **đúng** cho `ecd516f` (18.3.3) — đã kiểm lại bằng `git show ecd516f:packages/ai/test/anthropic-cache-refresh.test.ts`. Nhưng `f804d66` (sync upstream 18.4.0) đã **xoá hẳn** file: `386 deletions, 0 insertions`. Ở HEAD, `git cat-file -e HEAD:packages/ai/test/anthropic-cache-refresh.test.ts` thất bại. Nên toàn bộ neo `:335` / `:359` / `:1431` bên dưới là neo của một file **đã không còn**, và cột "hành động" của dòng này không còn làm được gì. |
| `packages/ai/CHANGELOG.md` | sửa | Entry dưới `## [Unreleased]` → `### Changed`, nói thẳng rằng keep-alive prompt-cache vô điều kiện nay mặc định tắt và rằng warm ở pha idle cần khoảng $0.35 miss cost mới bắn. | **KHÔNG** — path tồn tại theo quy ước (`packages/*/CHANGELOG.md` theo AGENTS.md) nhưng không được mở trong lúc phân tích; phải xác nhận đúng file và heading `### Changed` trước khi sửa. |

### Các bước

1. **Làm vỡ môi trường trước, đừng sửa code vội.** Chạy `bun install` và `bun run build` (hoặc tối thiểu `bun run build:native`) để có native addon. Xác nhận `bun test packages/ai/test/anthropic-cache-refresh.test.ts` báo 7 pass / 0 fail **trước khi** sửa bất kỳ dòng production code nào, và ghi lại baseline xanh đó. Mọi cổng trong spec này vô nghĩa nếu thiếu nó — hiện tại file lỗi ra với thông báo gây hiểu lầm `Cannot find module '@oh-my-pi/pi-catalog/build'`, mà thực ra là `@oh-my-pi/pi-natives` không load được từ bên dưới. ⛔ **Bước này không chạy được ở HEAD**: file test đã bị `f804d66` xoá, nên `bun test` trên nó sẽ báo "no tests found" chứ không phải 7 pass. Baseline 7 pass chỉ tồn tại ở `ecd516f`. *(anchor: `packages/ai/src/stream.ts:1209`)*
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

Bộ test bảo vệ ranh giới tiêu tiền, nên các assertion quan trọng nhất là **âm** — chứng minh những request ĐÃ KHÔNG được gửi đi. Tất cả nằm trong `packages/ai/test/anthropic-cache-refresh.test.ts`; KHÔNG tạo test nào ở `packages/coding-agent`. ⛔ File đó **không còn ở HEAD** (xoá ở `f804d66`) — hợp đồng test dưới đây là của spec W8 đã hết hiệu lực, kèm các neo `:335` / `:359`.

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
bun test packages/ai/test/anthropic-cache-refresh.test.ts   # ⛔ KHÔNG chạy được: file đã bị f804d66 xoá

# Sau khi làm xong
bun test packages/ai/test/anthropic-cache-refresh.test.ts   # ⛔ tương tự — không có file để chạy
bun run check:ts                                             # types/lint
test ! -e packages/coding-agent/src/session/cache-warmer.ts  # phần B của cổng   # ⛔ đỏ vĩnh viễn — đừng chạy

# TUYỆT ĐỐI KHÔNG: tsc, npx tsc
```

Hai cái bẫy môi trường đã được kiểm chứng, đừng mất thời gian:

- `bun run check:ts` hiện chết ngay ở bước đầu với `oxlint: command not found` — linter không được cài trong checkout này, nên cổng type sẽ là no-op cho tới khi bạn cài nó.
- Nếu dùng `bun run check` thì nó kéo theo `check:rs`, cần Rust toolchain.

### Cổng hoàn thành

**HAI PHẦN, vì một phần là chưa đủ.**

**PHẦN A** — `bun test packages/ai/test/anthropic-cache-refresh.test.ts` với test (0): `anthropicCacheRefresh: "off"` ở biên phải cho ra replay payload vắng mặt, cộng test (3) (không gửi request nào dưới sàn $0.05) và cặp idle/streaming của test (4). Đỏ nếu tri-state không được luồng từ đầu đến cuối, nếu cổng kinh tế vắng mặt, hoặc nếu phase probe bị đọc sai thời điểm. ⛔ **Phần A không dựng được ở HEAD** — file test đã bị `f804d66` xoá, nên lệnh `bun test` trên nó không có file để chạy.

**PHẦN B** — cái bẫy warmer-thứ-hai, mà Phần A về cấu trúc **KHÔNG THỂ** bắt được: assert `test ! -e packages/coding-agent/src/session/cache-warmer.ts`, và xác nhận qua code review rằng `streamSimpleWithAnthropicCacheRefresh` vẫn là con đường warm duy nhất. Đây là failure mode #1 mà plan nêu và nó im lặng: một file mới mặc định `"off"` không tốn xu nào, test của nó tự xanh, Phần A vẫn xanh — trong khi `anthropicCacheRefresh: true` ở `sdk.ts:4111` vẫn refresh vô điều kiện và không ai đụng tới. Một assertion về sự vắng mặt trên filesystem là chính đáng ở đây chính vì AGENTS.md cấm source-grep file implementation — không có cách nào mang hình thức test để hỏi "có phải có scheduler thứ hai không", nên guard là kiểm tra file cộng review.

**KHÔNG ĐƯỢC TÍNH LÀ CỔNG:** "không có test mới nào đỏ", "setting đã được đăng ký", hoặc bất kỳ assertion nào về sự tồn tại của toggle thay vì về tiền rời khỏi tài khoản.

**Cổng có thực sự đỏ được không:** Có. Phần A thực sự đỏ trên các failure mode thật — gộp tri-state về boolean ở biên khiến chuỗi `"off"` truthy, warming tiếp tục và assertion "payload vắng mặt" đỏ; bỏ cổng kinh tế thì test (3) đỏ; đọc phase ở `arm()` thay vì lúc timer nổ thì cặp ở test (4) phân kỳ. Phần B đỏ nếu có một warmer thứ hai được tạo ra — kiểm tra vắng mặt file là một assertion cơ học, có thể bác bỏ, thật. Cần nói thẳng vì nó quan trọng: **riêng Phần A sẽ KHÔNG bắt được sai lầm warmer-thứ-hai**, vì một module mới hoàn toàn không được chạm tới bởi một test truyền `"off"` qua `SimpleStreamOptions`. Đó chính là lý do cổng có hai phần; nếu người làm chỉ ship Phần A rồi kết luận W8 xong, failure mode đắt nhất của milestone là không được canh.

### Phụ thuộc

> ⛔ **Mục này thuộc về spec W8 cũ, đã hết hiệu lực ngày 2026-09-28.** W8 nằm ngoài phạm vi
> (xem khối ⛔ ở đầu §W8), nên không còn "phải chờ" gì cả. Danh sách bên dưới được giữ lại như
> **vết của phân tích trước khi gỡ** — các mệnh đề trong đó vẫn đúng về mặt sự kiện, nhưng
> không còn mô tả trạng thái cần làm.

**depends_on**

- **W7 — CHẶN CỨNG.** `promptCacheLifetime` không tồn tại ở bất kỳ đâu trong repo hôm nay (`grep -rn promptCacheLifetime packages/catalog/src packages/ai/src` không trả về gì). Chính ghi chú của plan nói đúng: hợp đồng âm của W7 — lifetime không khai báo nghĩa là không warm — không có consumer nào nếu thiếu W8.
- **F6 (helper quyết định kinh tế) — cũng chặn, và plan đánh giá thấp chỗ này.** `decideWarm` / `WarmDecision` cũng không tồn tại ở bất kỳ đâu trong repo. Chữ ký `arm()` mới luồn `WarmDecision` xuyên qua, nên W8 cần F6 đã landed, không chỉ W7.
- **Cổng chung của wave 3a:** bảng TTL theo provider theo tier có nguồn (open question 0 của plan). Cổng đó ~~bọc W7 và W8 cùng nhau~~ **nay chỉ bọc W7** — W8 nằm ngoài phạm vi (2026-09-28), và không bọc gì khác.
- **KHÔNG phụ thuộc W2.** Đã kiểm chứng: `AnthropicCacheRefreshState` đã là một `ProviderSessionState` có `cancel()`/`close()`, và `cancel()` đã gọi `this.#controller?.abort()`, nên đường huỷ in-flight đã tồn tại hôm nay. W2 chỉ còn là tiền đề cho extension disposer, không phải cho W8.

**blocks:** không.

### Cách sai dễ nhất

Tạo ra một HỆ THỐNG THỨ HAI thay vì gate hệ thống đã có. Đây là cách đắt nhất để hỏng ở đây, chính vì nó im lặng: một file mới mặc định `"off"` không tốn xu nào, test của nó xanh, và cổng nghiệm thu vẫn xanh — trong khi `anthropicCacheRefresh: true` ở `sdk.ts:4111` vẫn refresh vô điều kiện và không ai bao giờ chạm tới. `AnthropicCacheRefreshState` ở `stream.ts:1218` ĐÃ lên lịch, ĐÃ có test, và ĐÃ được bật; việc của W8 là gate nó, không phải đứng cạnh nó.

Kẻ thứ nhực, và cũng là cái chính plan tự cảnh báo: copy hằng số của pi mà ĐÁNH MẤT phân biệt pha của chúng. `IDLE_CONTINUATION_PROBABILITY = 0.15` chỉ áp cho idle, còn streaming dùng `1.0`. Làm phẳng hai cái đó thì warm idle hoặc không bao giờ bắn (tính năng trông như hỏng ở đa số phiên), hoặc luôn bắn (bug ngược lại). Release notes phải nói rõ ngưỡng ~$0.35 cho idle.

Thứ ba: rơi mất điều kiện thứ tư của `supportsAnthropicCacheRefresh`. Hôm nay có BỐN điều kiện, không phải ba — `isLeakedThinkingHealExempt(model)` là cái dễ mất trong lúc mở rộng trục api/provider/transport, và mất nó sẽ âm thầm loại các model khỏi warm trên đúng con đường tốn tiền.

### Cần người quyết

> ⛔ **Các câu hỏi dưới đây thuộc về spec W8 cũ và không còn cần người trả lời** (2026-09-28):
> W8 nằm ngoài phạm vi, nên không có bước nào để gõ và không có type nào để chọn. Chúng được giữ
> lại như vết — **đừng mở lại** trừ khi W8 được đưa ngược vào phạm vi.

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
| Test (7) viết lại `anthropic-cache-refresh.test.ts:335`, test duy nhất khoá hành vi retention-long cũ. | KHÔNG ĐẦY ĐỦ — một test thứ hai khoá cùng lỗ hổng và plan không hề nhắc | File có BẢY khối `it()` (`:237, :257, :279, :297, :318, :335, :359`) — *đúng cho `ecd516f` (18.3.3); ở HEAD file đã bị `f804d66` xoá nên con số này không còn kiểm được*. Cái ở `:359`, "arms no keep-alive refresh for an OAuth request with automatic retention", khoá cùng hành vi retention bằng một đường khác — OAuth resolve ra 1h, nên không tồn tại short breakpoint để `hasShortAnthropicMessageBreakpoint` tìm thấy. Nó vẫn nên xanh sau khi nới `:1431`, nhưng phải chạy lại có chủ đích, không được coi là hiển nhiên. Coi `:335` là test duy nhất bị ảnh hưởng là cách một wave 3a trông xanh ship kèm regression. Bằng chứng: `grep -n 'it(' packages/ai/test/anthropic-cache-refresh.test.ts` → 7 khối; `sed -n '359,386p'`. |
| Các điều kiện lúc arm là bốn cái trong `supportsAnthropicCacheRefresh` cộng usage bail; tập thay đổi plan mô tả không bao giờ nhắc `hasShortAnthropicMessageBreakpoint`. | KHÔNG ĐẦY ĐỦ — có điều kiện thứ năm lúc arm | `armRefresh` (stream.ts:1454) có bail năm nhánh, và nhánh thứ năm là `!hasShortAnthropicMessageBreakpoint(capturedPayload)` ở `:1461` (hàm nằm ở `:1322`). Mọi thay đổi lên trục TTL hay cổng retention đều phải suy luận với điều kiện này — thực tế chính nó là thứ giữ test OAuth ở `:359` xanh. Bằng chứng: `sed -n '1454,1466p' packages/ai/src/stream.ts`. |
| Tiền đề cứng duy nhất của W8 là W7. | KHÔNG ĐẦY ĐỦ — F6 là tiền đề cứng thứ hai *(đính chính đúng về sự kiện, nhưng **đã hết hiệu lực** 2026-09-28: W8 nằm ngoài phạm vi)* | Chữ ký `arm()` đề xuất lấy `decision: WarmDecision` được mô tả là "là shape ở F6", nhưng cả `WarmDecision` lẫn `decideWarm` đều không tồn tại ở bất kỳ đâu trong repo. ~~W8 cần F6 landed, y như cần W7. Danh sách phụ thuộc nên đọc là W7 + F6, và thứ tự wave nên xác nhận F6 xuống ở 3a hoặc sớm hơn.~~ Bằng chứng vẫn giữ nguyên: `grep -rn 'decideWarm\|WarmDecision' packages/` → không có hit. |
| Hằng số port từ `pi-ref/packages/coding-agent/src/core/cache-warmer.ts` ở các dòng :16, :18, :20, :26, :29, :55-57, :252, :380-390, :387-398. | KHÔNG KIỂM CHỨNG ĐƯỢC — path không tồn tại | Không có thư mục `pi-ref/` trong checkout này. Mọi giá trị và mọi tuyên bố hành vi lấy nguồn từ file đó nằm ngoài repo và không thể kiểm tra từ đây. Hãy coi sáu hằng số là input **CHƯA KIỂM CHỨNG**: tự suy ra chúng từ tài liệu TTL và bảng giá chính thức của Anthropic theo từng tier, hoặc tìm package tham chiếu rồi dẫn nguồn. Đừng copy mù. Bằng chứng: `ls -d pi-ref` → không có thư mục như vậy. |
| `cfgProvidersAnthropicSlowMode` ở `packages/coding-agent/src/session/settings.ts:860`. | STALE lệch 3 dòng | Nó ở `:863`. Khuôn cần copy là `register({ id, type: "enum", values: [...] as const, default: "off" as const })`. Lưu ý nó cố ý KHÔNG mang block `ui` — tiền lệ settings để theo là script-only, nên phải quyết rõ `providers.promptCacheRefresh` có UI `/settings` hay không. Bằng chứng: `grep -n cfgProvidersAnthropicSlowMode packages/coding-agent/src/session/settings.ts` → `:863`; `sed -n '855,870p'`. |
| `Agent` phát `agent_end` ở `packages/agent/src/agent.ts:1921` và `:1925`, và giữ `AgentState.isStreaming` ở `packages/agent/src/types.ts:946`. | STALE — cả hai đều lệch | `agent_end` được phát ở agent.ts:1975 (nhánh thành công) và `:1979` (nhánh lỗi); `case "agent_end":` ở `:1843` là một construct khác. `AgentState.isStreaming` ở types.ts:954. Phần **NỘI DUNG** của plan là đúng và đây là phần chịu tải của tính năng phase: probe `() => (agent.state.isStreaming ? "streaming" : "idle")` là hợp lý, và `agent` thực sự đã có sẵn trong closure `streamFn` (`agent.state.tools` được đọc ở `:4105`). Bằng chứng: `grep -n agent_end packages/agent/src/agent.ts`; `grep -n isStreaming packages/agent/src/types.ts`; `sed -n '4104,4106p' packages/coding-agent/src/sdk.ts`. |
| Xác minh là `bun check && bun test packages/ai/test/anthropic-cache-refresh.test.ts`; môi trường chặn test với "Failed to load pi_natives native addon for darwin-arm64" và `bun run check:ts` vẫn chạy được. | Nửa đúng, nửa sai, và **cả hai lệnh đều chạy được** sau khi làm tiền đề | Claim "cần addon" đúng về bản chất; claim "`bun run check:ts` vẫn chạy được" sai trên một checkout chưa `bun install` — `check:tools` chạy `oxlint` và báo `command not found`, exit 127. Còn `bun test` ở trạng thái chưa build addon báo 0 pass / 1 fail / 1 error với thông báo `Cannot find module '@oh-my-pi/pi-catalog/build'` — trông như import hỏng nhưng KHÔNG phải: `@oh-my-pi/pi-catalog/build` resolve qua wildcard export tại catalog package.json:72 tới `packages/catalog/src/build.ts`, và file đó có thật. Một probe `bun -e` trực tiếp cho thấy nguyên nhân thật: `packages/natives/native/loader-state.js` ném lỗi vì native addon chưa từng được build. Chuỗi tiền đề là `bun install`, rồi `brew install ninja` + `bun --cwd=packages/natives run build` — làm xong thì cả hai lệnh chạy, và không được để kỹ sư đi "sửa" một import không hỏng. Bằng chứng: `bun run check:ts` → `oxlint: command not found`, exit 127 (trước `bun install`). `bun -e 'import { buildModel } from "@oh-my-pi/pi-catalog/build"'` → loadNative failure tại loader-state.js:970. `grep -c build packages/catalog/package.json` cho thấy wildcard export `./*` ở `:72`. |
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

`bun run check:ts` là oxlint + oxfmt + `tsgo --noEmit` trên mọi package — nó không cần native addon, nên vẫn chạy được ngay cả khi addon chưa build, và nó bắt được lỗi kiểu. Không chạy trình kiểm tra kiểu riêng của TypeScript ở đây; tín hiệu kiểu duy nhất của mục này là `bun run check:ts`.

Kiểm tra thủ công: `/info` phải render mục Attribution **không rỗng** cho một phiên đã dùng hai model cộng một compaction. Chạy trong TUI, xác nhận dòng `Tools/summaries` có mặt và tổng cost của các dòng bằng đúng dòng `Cost: Total` đã hiện trên màn hình.

### Cổng hoàn thành

Hai lệnh, cả hai phải xanh:

1. `bun run check:ts` từ repo root — oxlint + oxfmt + `tsgo --noEmit` trên mọi package; nó không phụ thuộc native addon nên chạy được ở mọi thời điểm.
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

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W9.md`.

**Cảnh báo neo.** Nguyên văn từ phiếu:

> **Tổng: 39 dòng kiểm (chứa ~60 neo cá nhân) — 12 dòng đúng chính xác, 27 dòng lệch hoặc hỏng.** Mọi mục trên đã được sửa ở Mục 2 và Mục 3 của phiếu này; **không sửa gì trong `MILESTONE_1_EXECUTION_PLAN.md`**.

| # | Cites | Nên trỏ tới | Thực tế |
| --- | --- | --- | --- |
| 1 | `session-stats.ts:114-205` | `getSessionStats()` | `:114–204`. Dòng 204 là `}` đóng hàm; 205 trống. |
| 2 | `session-stats.ts:134-151` cho `addUsage` | thân `addUsage` | `:133–149` — khai báo ở 133, `};` ở 149. Dòng 151 là `userMessages++;` thuộc vòng lặp. |
| 3 | `session-stats.ts:152-172` cho "lượt đi ba nguồn" | vòng lặp + entry `model_usage` | `:150–173`. Nguồn (c) nằm ở **dòng 173**, ngoài dải 152–172. |
| 4 | `agent-session-types.ts:451-477` | `export interface SessionStats` | **`:472–498`**. Lệch 21 dòng. |
| 5 | `session-entries.ts:121+` cho `CompactionEntry` | `CompactionEntry` | `:120–137` — khai báo ở dòng **120**, không phải 121. |
| 6 | `session-entries.ts:80-91` cho `ModelUsageEntry` | `ModelUsageEntry` | `:80–92` — đóng ở 92. |
| 7 | `session-entries.ts:80-91` nói mang `purpose, role, api, provider, model, usage, stopReason` | — | Đúng về field, nhưng **thiếu `errorMessage?: string`** ở dòng 91. |
| 8 | `session-manager.ts:2820-2839` | `appendModelUsage` | `:2820–2841` — `return entry.id;` ở 2840, `}` ở 2841. |
| 9 | `session-context.ts:727` "chỗ gán khi return" | gán `cacheMissExplainedAt` khi return | **`:741`**: `cacheMissExplainedAt: options?.transcript ? cacheMissExplainedAt : undefined,`. Dòng 727 là `messages.splice(i, 1);` — không liên quan. |
| 10 | `session-context.ts:364-378` "mảng dựng ở" | `trackMessageCacheState` + `pushMessage` | `:364–372` là `trackMessageCacheState`; `pushMessage` ở `:374–378`. Mảng khai báo ở **`:345`**. |
| 11 | `model-controls.ts:634-637` cho `purpose: "auto-thinking"` | chỗ ghi `model_usage` | Đúng là nơi `appendModelUsage` được gọi (`:635`), nhưng **literal `"auto-thinking"` không ở đây** — nó ở `src/auto-thinking/classifier.ts:144`. |
| 12 | `command-controller.ts:431` "khối Cost kết thúc ở" | đóng khối `Cost` | **`:428`**. Dòng 430 đã là `if (this.ctx.lspServers…)`. Chèn giữa 429 và 430. |
| 13 | `command-controller.ts:420` cho `stats.cost.toFixed(4)` | dòng `Total:` | **`:418`**. Dòng 420 là `if (normalizedPremiumRequests > 0) {`. |
| 14 | `command-controller.ts:384` cho render `routedModels` | `replaceTabs(sanitizeText(id))` | **`:383`**. Dòng 384 là `);` đóng `.map(`. |
| 15 | `command-controller.ts:380-386` | khối `routedModels` | `:379–386` — `if (stats.routedModels !== undefined) {` mở ở **379**. |
| 16 | `usage-report.ts:186` "sau `return` sớm" | sau nhánh provider-reported | `return renderUsageReports(...)` là `:180–185`, `}` đóng ở 186. Dòng `Cost: $...` là **`:200`**. |
| 17 | `usage-report.ts:175-186` "nhánh provider-reported" | cả nhánh | `:172–187` (`if (provider.fetchUsageReports) {` mở ở **172**). |
| 18 | `ai/src/types.ts:1130-1138` cho `upstreamModel` | field + doc | **`:1118–1125`** — doc 1118–1124, field ở 1125. Lệch 12 dòng. |
| 19 | `ai/src/stream.ts:1209` = `ANTHROPIC_CACHE_TTL_MS` | hằng số TTL | **KHÔNG TỒN TẠI.** Dòng 1209 trống; 1208 là `return { ...options, sessionId: crypto.randomUUID() };`. `rg -rn 'ANTHROPIC_CACHE_TTL_MS' .` chỉ trúng chính các file kế hoạch. |
| 20 | `ai/src/types.ts:1178-1198` cho `ToolResultMessage` | interface | **`:1166–1186`**. Lệch 12 dòng. |
| 21 | `telemetry.ts:1566, 1590, 1598, 1605` cho `responseModel` | các hit OTel | Hit thật: **`:1589, 1613, 1621, 1629, 1672, 1716`**. Cả 4 số trong plan đều sai. Ngoài ra plan nói "chỉ trúng telemetry" — **sai**, còn `judgment/index.ts:96, 271, 277, 441`. |
| 25 | `…cache-invalidation-marker.ts:61` cho `current.cacheWrite > 0` | — | **`:62`**: `if (current.cacheWrite <= 0) return undefined;`. Lệch 1. |
| 26 | `…cache-invalidation-marker.ts:29-44` doc comment | doc giải thích implicit-cache | Doc `:40–47` mới là đoạn giải thích implicit-cache; `:31–38` là đoạn "Requiring a prior warm read". `29–44` cắt ngang cả hai. |
| 30 | `session-context.ts:375-376` "return sớm trước khi push" | thứ tự | `375: messages.push(msg);` rồi `376: if (!options?.transcript) return;` — **push ở TRƯỚC**, guard ở SAU. Plan mô tả ngược. |
| 31 | `agent-session.ts:408` cho import `./session-stats` | import | **`:411`**. Lệch 3. |
| 32 | `preview-session.ts:43`, `status-line.ts:40` là object literal `SessionStats` | fixture buộc `optional` | Cả hai là `getUsageStatistics: () => ({` — **`UsageStatistics`**, không phải `SessionStats`. Không có object literal `SessionStats` nào trong repo. |
| 35 | HEAD là `ecd516f` | HEAD | **STALE** — HEAD hiện tại là `65cc6c1`. |
| 36 | `pi-ref/…/core/usage-totals.ts` | file tham chiếu | ✅ Đúng khi nói **không tồn tại** — nhưng `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` **có** mặt ở repo root và chứa các đoạn trích cùng nguồn. |
| 38 | Cần `brew install ninja` + `bun --cwd=packages/natives run build` trước khi test | chuẩn bị | **THỪA Ở CÂY HIỆN TẠI.** `which ninja` → `/opt/homebrew/bin/ninja`; addon đã tồn tại (185 MB); `bun test usage-statistics.test.ts` chạy được ngay. |
| 39 | `judgment/index.ts:78-85` cho "purpose judgment tự do" | khai báo `purpose` | `purpose: string;` ở **`:77`**, doc ở `:76`. Lệch nhẹ. |

Các dòng **đúng tuyệt đối** (dùng được): `catalog/src/types.ts:1116-1122` (`TokenCost`), `tui/.../cache-invalidation-marker.ts:12` (`MIN_CACHE_FOOTPRINT = 2048`) và `:55`, `session-stats.ts:422-426` (`taskToolUsage`) + `:428-438` (`isUsage`) + `:155-158` (điều kiện `toolName === "task"`), `session-context.ts:117, 345, 377` và `:577`, `usage-report.ts:167` ("export duy nhất, file 202 dòng"), `usage-statistics.test.ts:1-70`, và xác nhận file mới `usage-breakdown.ts` / `usage-breakdown.test.ts` chưa tồn tại (791 file `*.test.ts` phẳng trong `test/`).

**Bảng điểm sửa.** Cột TRƯỚC trích từ file thật.

| đường/dẫn | symbol / hàm | TRƯỚC (trích từ file thật) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/usage-breakdown.ts` | — (file mới) | *không tồn tại* (`ls` → No such file or directory) | Module thuần: `TOOLS_SUMMARIES_BUCKET = "Tools/summaries"`, `NOISE_FLOOR_TOKENS = 2048`, `CACHE_ATTRIBUTION_WINDOW_MS = 5 * 60_000`; kiểu `UsageBucket`, `CacheMissCost`, `UsageBreakdown`; hàm export duy nhất `buildUsageBreakdown(input)`. Không `Date.now()`, không gọi registry/session-manager; `nowMs` do caller truyền. |
| `packages/coding-agent/src/session/agent-session-types.ts` | `export interface SessionStats` (`:472–498`) | `:496  routedModels?: Record<string, number>;`<br>`:497  contextUsage?: ContextUsage;`<br>`:498 }` | thêm `usageBreakdown?: UsageBreakdown;` ngay **trước** dòng 498, cùng doc kiểu `/** Per-model cost attribution; absent when no turn has been served yet. */`. **Optional** — xem cạm bẫy #1. |
| `packages/coding-agent/src/session/session-stats.ts` | `SessionStatsTracker.getSessionStats()` (`:114–204`) | `:133  const addUsage = (usage: Usage): void => {` … `:150  for (const message of state.messages) {` … `:173  for (const entry of activeModelUsageEntries(this.#host.sessionManager.getBranch())) addUsage(entry.usage);` … `:201  ...` | gọi `buildUsageBreakdown` sau lượt đi hiện có, tái dùng `state.messages` + `branch` đã gom; trả kèm trong `SessionStats` |
| `packages/coding-agent/src/modes/controllers/command-controller.ts` | `handleSessionCommand()` (`:349`), sau khối `Cost` (`:415–428`) | `:428  }` ← đóng khối Cost<br>`:429` (trống)<br>`:430  if (this.ctx.lspServers && this.ctx.lspServers.length > 0) {` | Chèn mục Attribution giữa dòng 429 và 430. Mẫu render bám sẵn ở `:383`. |
| `packages/coding-agent/src/slash-commands/helpers/usage-report.ts` | `buildUsageReportText()` (`:167–202`), nhánh fallback (`:189–201`) | `:200  \`Cost: $${stats.cost.toFixed(6)}\`,`<br>`:201  ].join("\n");` | `:200  \`Cost: $${stats.cost.toFixed(6)}\`,`<br>thêm `...perModelLines,` vào mảng trả về. `sanitizeText` đã import ở `:2`. Nhánh provider-reported giữ nguyên. |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` (`:3`) | `:3  ## [Unreleased]`<br>`:4` (trống)<br>`:5  ### Security` | Chèn `### Added` giữa dòng 4 và 5, rồi một bullet. **Hiện `[Unreleased]` KHÔNG có `### Added`** — phải tạo mới, không phải thêm vào section có sẵn. |
| `packages/coding-agent/test/usage-breakdown.test.ts` | — (file mới) | *không tồn tại* | 4 test hợp đồng, xem hợp đồng test dưới đây. |
| `packages/coding-agent/test/session-manager/usage-statistics.test.ts` | không sửa | `describe("SessionManager usage statistics", ...)` | chạy lại làm hộ canh. Đã chạy ở HEAD: **7 pass, 0 fail**. |

**Các bước có neo đã kiểm.**

1. **Chốt baseline** — `cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts`. Xác nhận `package.json:90` = `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`, `package.json:91` = `check:tools` (oxlint + oxfmt), `packages/coding-agent/package.json:523` = `"check:types": "tsgo -p tsconfig.json --noEmit"`. Nếu đỏ, xác nhận file báo lỗi không phải do bạn tạo — cây dùng chung với worker milestone-1 khác.
2. **Tạo `usage-breakdown.ts`** — ba hằng số + ba kiểu + **một** hàm export `buildUsageBreakdown(input)`. Thuần, chỉ-đọc, không `Date.now()` — caller truyền `nowMs`. Tra giá phải là tham số tiêm vào. Dùng đúng ba giá trị này và **không import từ chỗ plan ám chỉ** (xem cạm bẫy #6):
```ts
export const TOOLS_SUMMARIES_BUCKET = "Tools/summaries";
// 2048 khớp MIN_CACHE_FOOTPRINT của repo (packages/tui/src/chat/cache-invalidation-marker.ts:12)
export const NOISE_FLOOR_TOKENS = 2048;
// 5 phút là TTL cache của Anthropic; KHÔNG có hằng số nào mang tên này trong repo
export const CACHE_ATTRIBUTION_WINDOW_MS = 5 * 60_000;
```
3. **Lớp một: bucket per-model, sao đúng lượt đi sẵn có.** `getSessionStats()` **đã** làm lượt đi ba nguồn — sao nó, đừng bịa lượt đi mới. **(a) assistant message** → bucket `${msg.provider}/${msg.upstreamModel ?? msg.model}` (neo `session-stats.ts:159–170`; `:168` đọc `message.upstreamModel`, `:166` `if (!usage) continue;` — assistant không có `usage` không được đưa vào). **(b) tool result `task`** → bucket `Tools/summaries`, đọc usage qua đúng `taskToolUsage` (neo `:155–158`, `:422–426`, `:428–438`). **(c) entry `model_usage` trên branch đang hoạt động** → bucket `Tools/summaries` (neo `:173` + `:63–76` `activeModelUsageEntries`). Chỉ tăng `turns` cho nguồn (a). Cộng `input/output/cacheRead/cacheWrite/totalTokens/cost` bằng **đúng** các field mà `addUsage` hiện có đọc (neo `:133–149`):
```
134: totalInput += usage.input;
135: totalOutput += usage.output;
136: totalReasoning += usage.reasoningTokens ?? 0;
137: totalCacheRead += usage.cacheRead;
138: totalCacheWrite += usage.cacheWrite;
139: totalTokens += usage.totalTokens;
140: totalPremiumRequests += usage.premiumRequests ?? 0;
141: totalCost += usage.cost.total;
```
4. **Lọc và sắp** — `.filter(e => e.cost > 0 || e.totalTokens > 0).sort((a, b) => b.cost - a.cost)`, hoà thì bẻ theo `key` tăng dần. Giữ `Tools/summaries` trong danh sách — nó là dòng ngang hàng, không phải footer.
5. **Lớp hai: tổng cache-miss đã định giá.** Duyệt assistant message theo thứ tự; với mỗi cái **chưa** được giải thích, tính `idleMs` = khoảng trống từ `completedAt ?? timestamp` của assistant trước tới `timestamp` của message này. Một miss chỉ được tính khi **TẤT CẢ** đúng: (1) `transcript.cacheMissExplainedAt[i] !== true`; (2) `cacheRead === 0` ở lượt này; (3) `reprocessedTokens = cacheWrite + input > 0`; (4) `reprocessedTokens >= NOISE_FLOOR_TOKENS`; (5) `idleMs >= CACHE_ATTRIBUTION_WINDOW_MS` **hoặc** có đổi model đứng trước. Rồi `missedTokens += reprocessedTokens` và `missedCost += reprocessedTokens / 1_000_000 * rate` — **phép chia là bắt buộc**. Neo rate là per-million (`packages/catalog/src/types.ts:1116–1122`; `Usage.cost.*` đã là dollar). Tra giá trả `undefined` → cộng token, **không** cộng cost. **Consumer phải coi mảng là có-thể-vắng-mặt** và song song chỉ số với `transcript.messages` — dùng `?.[i]`, không `![i]`.
6. **Tín hiệu model-change DÍNH (nhánh dễ sai nhất).** Đừng đọc thẳng boolean ra từ `trackMessageCacheState`. Thay vào đó: `providerReportsCaching = true` **ngay khi BẤT KỲ** lượt nào trong phiên có `cacheRead > 0 || cacheWrite > 0`; chỉ khi nó còn `false`, một đổi model mới giải thích được một miss; ghi `modelChanged` theo từng miss đóng góp, rồi OR lại cho tổng. Lập luận này đã có sẵn trong repo — đọc trước khi viết: `packages/tui/src/chat/cache-invalidation-marker.ts:49–63` (`:62` là `if (current.cacheWrite <= 0) return undefined;` với doc ở `:40–47`).
7. **Nối bộ cộng vào session stats** — thêm `usageBreakdown?: UsageBreakdown` vào `SessionStats`, **optional** (neo `agent-session-types.ts:472–498`; nhánh `routedModels?` ở `:496` là mẫu optional sẵn có). Tính bên trong `SessionStatsTracker` sau lượt đi hiện có. `branch` đã có sẵn trong scope (`session-stats.ts:173`).
8. **Render mục Attribution trong `/info`** — chèn **sau** khối `Cost`, tức làm giữa dòng 429 (trống) và dòng 430. Khối `Cost` kết thúc ở **dòng 428** (`}` đóng `if` từ dòng 415), **không phải 431** như plan ghi. Mỗi dòng: key, `totalTokens`, cost làm tròn 4 chữ số thập phân — khớp `stats.cost.toFixed(4)` sẵn có ở `:418`. Sanitize key đúng bằng `replaceTabs(sanitizeText(key))` trước khi nội suy, bám mẫu `command-controller.ts:379–386`. Rồi một dòng `Cache misses:` với `missedTokens` và `missedCost.toFixed(4)`, **bỏ hẳn** dòng khi `missedTokens === 0`.
9. **Khối per-model trong text path của `/usage`** — chỉ ở **nhánh fallback local-tallies**, sau dòng `Cost: $...` sẵn có. Nhánh này là chuỗi thuần đã TUI-sanitize, không phải overlay có theme → dùng dòng thuần, chạy model key qua `sanitizeText` (đã import ở `usage-report.ts:2`). Nhánh provider-reported (`:172–187`) giữ nguyên, thêm một dòng comment nói rõ lý do: nó không có dữ liệu per-model theo bản chất. `buildUsageReportText` là export **duy nhất** của file — không thêm bề mặt export mới. ⚠️ **Nhánh này lấy số từ `getUsageStatistics()`, KHÔNG phải `getSessionStats()`** — xem cạm bẫy #2 và bước 10.
10. **Viết test** — `packages/coding-agent/test/usage-breakdown.test.ts`, dùng `SessionManager.inMemory()` + `appendMessage` / `appendModelUsage` / `buildSessionContext()` làm seam. Mẫu fixture có sẵn ở `packages/coding-agent/test/session-manager/usage-statistics.test.ts:1–35`. Bốn nhánh khác nhau: **(1) phép bằng** — hai model + một compaction → tổng cost các dòng **bằng** `getSessionStats().cost` phẳng, VÀ usage của compaction nằm trong `Tools/summaries` và **không** nằm ở dòng model nào; **(2) provider alias** — assistant message có `upstreamModel` khác `model` được quy cho served id; **(3) cache miss** — miss do idle thật → `missedTokens > 0` với `missedCost === missedTokens / 1e6 * rate`; miss dưới noise floor → **đúng** 0 và 0; **(4) phân biệt dính** — provider đã báo `cacheRead` ấm ở lượt trước rồi lạnh sau **không** bị quy cho đổi model; provider không lượt nào báo cả `cacheRead` lẫn `cacheWrite` thì **vẫn** bị quy. **KHÔNG** assert vào câu chữ/label của prompt, và **KHÔNG** assert vào `getUsageStatistics()`.
11. **Chạy lại hộ canh** — `bun test packages/coding-agent/test/session-manager/usage-statistics.test.ts`. **Đã chạy ở HEAD: 7 pass, 0 fail, 18 expect() calls, 606ms.** Native addon **đã** build sẵn — không cần `bun --cwd=packages/natives run build`.
12. **CHANGELOG** — `## [Unreleased]` (dòng 3) hiện **chỉ có `### Security` ở dòng 5 — phải tạo `### Added` mới**, không phải thêm vào section có sẵn. Nội dung: `/info` now breaks down token cost by the model that actually served each turn, separates internal summarization into a `Tools/summaries` row, and reports the dollar cost of prompt-cache misses. Đây là thay đổi nội bộ không có issue link → dùng câu thuần.

**Hợp đồng test.** File `packages/coding-agent/test/usage-breakdown.test.ts` (tại mới) + `packages/coding-agent/test/session-manager/usage-statistics.test.ts` (đã có, chạy lại).

| # | Test | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| 1 | Các dòng per-model + `Tools/summaries` cộng **CHÍNH XÁC** bằng tổng phẳng | Mục Attribution cộng lại **lớn hơn** dòng `Cost: Total` đang nhìn — một cách vô lý số học mà UI làm nổi bật |
| 2 | Entry `model_usage` rơi vào `Tools/summaries` và **không** rơi vào dòng model nào | Một model bị quy cho chi phí mà nó không hề phục vụ |
| 3 | `upstreamModel` khác `model` → quy cho served id | Hàng của một model gateway bị ghi đè bằng id mà người dùng đã gõ |
| 4 | Miss dưới noise floor → `missedTokens === 0` **và** `missedCost === 0` | Dòng `Cache misses` hiện ra một con số tiền từ hư không |

Bốn nhánh khác nhau, không dòng trùng nhau. Không assert câu chữ/label.

**Cổng có đỏ được không.**

- **Cổng 1** — `bun run check:ts` từ repo root (oxlint + oxfmt + `tsgo --noEmit` trên mọi package). Bắt được lỗi kiểu mà `bun test` không thấy: field không optional phá vỡ một object literal; `buildUsageBreakdown` gọi sai kiểu; import sai đường dẫn. Baseline của cổng 1 **là thật** — `tsgo --noEmit` là kiểm kiểu thật, không phải nền đỏ có sẵn.
- **Cổng 2** — `bun test packages/coding-agent/test/usage-breakdown.test.ts packages/coding-agent/test/session-manager/usage-statistics.test.ts`.

**Có — và đã chạy thử để biết chắc, không phải suy đoán.** Cổng 2 đỏ đúng khi:

| Hành vi sai | Test nào đỏ | Vì sao đỏ |
| --- | --- | --- |
| Một entry `model_usage` bị cộng vào cả dòng model lẫn `Tools/summaries` | test 1 | `sum(rows.cost) > stats.cost` |
| Bỏ fallback `upstreamModel`, chỉ dùng `msg.model` | test 3 | bucket key là requested id, không phải served id |
| Không áp noise floor | test 4 | miss 5 token bị tính → `missedCost !== 0` |
| Không cài quy tắc dính | test 4 | hai provider cho cùng một kết quả → không phân biệt được |
| Refactor làm trôi tổng phẳng | `usage-statistics.test.ts` | tổng index lệch |

**Đã xác nhận ở HEAD:** `usage-statistics.test.ts` → **7 pass, 0 fail**. Hộ canh đỏ được, không phải trắng.

**⚠️ Một lỗ hổng thật của cổng: phép bằng kiểm SAI TỔNG.** Điều quan trọng nhất trong phiếu này, và plan **không** nêu. Có **hai** bộ cộng phẳng khác nhau trong repo, và chúng **không bằng nhau**:

| | `/info` (mục Attribution) | `/usage` (ACP text) |
| --- | --- | --- |
| nguồn | `getSessionStats()` — `session-stats.ts:114–204` | `getUsageStatistics()` — `session-manager.ts:2513–2515` → `#index.usageSnapshot()` |
| phạm vi | `state.messages` + `activeModelUsageEntries(branch)` — **chỉ branch đang hoạt động** | mọi entry **từng** ghi vào index, qua cả branch đã bỏ |
| `model_usage` ngoài branch | **không tính** | **vẫn tính** |

`session-manager.ts:475` cộng usage vào `#usage` ngay trong `insert()` cho **mọi** entry, không lọc branch; còn `session-stats.ts:63–76` cắt branch tại `getLatestCompactionEntry` / `reset_boundary`. Phiếu đã chạy một probe thật: `ACTIVE branch types: message,message,message` / `model_usage in ACTIVE branch? false` / `index getUsageStatistics().cost: 0.5`. `usage-statistics.test.ts:36–53` chính là test khẳng định hành vi này.

Hệ quả trực tiếp lên công việc: **(1)** test 1 phải assert phép bằng với `getSessionStats().cost`, **KHÔNG phải** `getUsageStatistics().cost` — nếu assert sai tổng, hoặc test đỏ vô lý, hoặc tệ hơn là implementer "sửa" cho xanh bằng cách nới bucketing và phá đúng thứ W9 sinh ra. **(2)** Bước 9 không thể chỉ dùng `getUsageStatistics()` — phải lấy `usageBreakdown` từ `runtime.session.getSessionStats()`. **(3)** Đây là lý do cổng phải đỏ được, và vì sao kiểm thủ công trong TUI là **bắt buộc**: kiểu thử không bắt được mâu thuẫn giữa hai tổng; chỉ nhìn `/info` và `/usage` cạnh nhau trong phiên thật mới thấy. Kiểm thủ công: `/info` phải render mục Attribution **không rỗng** cho một phiên đã dùng hai model cộng một compaction; dòng `Tools/summaries` phải có mặt; tổng cost các dòng phải bằng đúng dòng `Cost: Total` ngay trên màn hình.

**Cạm bẫy riêng của mục này.**

**1. Bắt buộc/non-bắt buộc — và lý do thật.** Plan nói `optional` để "fixture object-literal ở `preview-session.ts:43` và `status-line.ts:40` vẫn compile" — **sai**. Cả hai là `getUsageStatistics: () => ({` — **`UsageStatistics`**, không phải `SessionStats`. Không có object literal `SessionStats` nào trong repo.

**2. Hai bộ cộng phẳng.** Xem mục cổng ở trên. Đây là cạm bẫy chết người của W9: phép bằng ở test 1 là hợp đồng trung tâm, và assert vào tổng sai là cách chắc chắn nhất để tạo ra một hợp đồng trông xanh mà sai.

**3. Đếm hai lần.** Ba nguồn phải mỗi nguồn rơi vào **đúng một** bucket. Đây là lý do tầng hai không có chỗ đúng để đáp nếu tầng một chưa đúng — hai tầng là **một** work item, không phải hai.

**4. Đổi tên field định danh.** Plan nói `responseModel`. Field này **không tồn tại** trên `AssistantMessage`. `rg -n 'responseModel' --type ts` trả về `packages/agent/src/telemetry.ts:1589, 1613, 1621, 1629, 1672, 1716` và `judgment/index.ts:96, 271, 277, 441`.

**5. Sai hình dạng ba điểm vào.** `ToolResultMessage` (`packages/ai/src/types.ts:1166–1186`) **không có** field `usage`; usage chỉ lồng trong `details`, và chỉ tool `task` có. `CompactionEntry` (`session-entries.ts:120–137`) cũng không có `usage` trực tiếp.

**6. Ba hằng số phải tự định nghĩa.** `NOISE_FLOOR_TOKENS` không tồn tại (`rg` → 0 hit). `CACHE_TTL_MS` không tồn tại. `ANTHROPIC_CACHE_TTL_MS` **không tồn tại** ở bất kỳ đâu trong `packages/` — `rg -rn` chỉ trúng chính các file kế hoạch. Vì vậy dùng đúng ba giá trị ở bước 2.

**7. `cacheMissExplainedAt` có thể lệch độ dài.** Dùng `?.[i]`, không `![i]`.

**8. Đừng sửa `trackMessageCacheState`.** Nó dùng `${msg.provider}/${msg.model}` thô, không có fallback `upstreamModel` (`session-context.ts:366–367`: `const currentModel = \`${msg.provider}/${msg.model}\`;`). Sửa nó sẽ đổi lượt nào UI đánh dấu là đã-giải-thích.

**9. Render path phải sanitize.** `replaceTabs(sanitizeText(key))` trước khi nội suy, bám `command-controller.ts:383`. Bỏ qua thì một model id chứa tab phá TUI.

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

`cd packages/agent && bun run check:types` đã được xác nhận xanh tại HEAD `ecd516f`, và nó là thứ bắt được va chạm TS2308 giữa các barrel. Riêng `bun test packages/agent/test/otel.test.ts` **cần native addon**: ở máy chưa build nó chạy ra `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64`. Đó là thiếu một bước build chứ không phải hạn chế của máy — `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là mọi bước ghi "chạy test" đều chạy được.

**Cách giảm thiểu để commit 1 vẫn kiểm chứng được mà không cần addon:** import test conformance từ **đường dẫn sâu** (`@oh-my-pi/pi-agent-core/telemetry/context`), không bao giờ từ package root. Exports map của package có `"./*": "./src/*.ts"`, nên đường dẫn sâu resolve thẳng ra file và không nạp `src/index.ts` — do đó không nạp pi-natives. **Điều này cần kiểm chứng thực nghiệm ở lần chạy đầu tiên**: nếu hóa ra đường dẫn sâu vẫn kéo theo natives, thì commit 1 chỉ kiểm chứng được bằng type-check cho tới khi addon được build, và điều đó phải được ghi rõ trong PR.

### Cổng hoàn thành

**COMMIT 1:** (a) `cd packages/agent && bun run check:types` xanh — đây là cổng load-bearing, và là cổng duy nhất **không cần** native addon; (b) `git diff --stat` liệt kê đúng sáu file mới dưới `packages/agent/src/telemetry/` cộng thay đổi một dòng ở `packages/agent/src/index.ts`, không có gì khác — đặc biệt `telemetry.ts` phải hiện **0 dòng thay đổi**; (c) `git log` cho thấy commit 1 là một commit riêng.

**COMMIT 2:** (a) `git diff --stat packages/agent/test/otel.test.ts` in ra **rỗng**; (b) `git diff --stat packages/agent/src/telemetry.ts` cho thấy một seam nhỏ, đọc review được — nếu đó là một bản viết lại toàn bộ file 2114 LOC thì thiết kế commit 2 theo đính chính P4 đã không được làm theo; (c) `bun test packages/agent/test/otel.test.ts` xanh một khi addon đã build; (d) `git log` cho thấy W10 là **đúng hai** commit tách biệt, không bao giờ bị squash.

**Cổng có thể thực sự đỏ không?** Có, với cổng type — và nó đã được chứng minh đỏ chứ không phải giả định. Chế độ lỗi chính xác đã được tái hiện trong một project scratch biệt lập: với `export * from "./telem"` và `export * from "./telem/context"` trong đó cả hai đều export một interface tên `Span`, trình kiểm tra kiểu phát ra `error TS2308: Module "./telem" has already exported a member named 'Span'`. Vì `telemetry.ts:2106` re-export `Span` của OTEL và plan bắt buộc thêm một star-export nữa vào `packages/agent/src/index.ts`, làm đúng theo tên interface của §F8 **sẽ** biến `bun run check:types` thành đỏ. Đổi tên thành `TelemetrySpan` là thứ làm nó xanh — tức là cổng phân biệt được đúng với sai. Cổng của commit 2 (`git diff --stat` trên `otel.test.ts`) cũng thực sự có thể bị bác bỏ: nó thành khác rỗng **ngay khi có ai đó sửa file đó**, đúng thứ mà plan đang cố ngăn. **Caveat duy nhất:** nửa hành vi của cả hai cổng cần native addon — chạy `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là cả hai nhánh chạy được, không có hạn chế riêng nào.

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

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W10.md`.

**Cảnh báo neo.** 24 neo đúng; **21 neo hỏng**, và gần như toàn bộ trôi theo một hướng.

| Neo trong plan | Nên trỏ tới | Vì sao hỏng |
| --- | --- | --- |
| `telemetry.ts` 2114 LOC | **2237 LOC** | Trôi +123 |
| `otel.test.ts` 1152 LOC | **1122 LOC** | Trôi −30 |
| HEAD `ecd516f` | **`65cc6c1`** | Repo đã đi xa |
| `telemetry.ts:406` = `AgentTelemetry` | `:416` | Trôi +10 |
| `telemetry.ts:418` = `resolveTelemetry` | `:428` | Trôi +10 |
| `telemetry.ts:466` = `startSpan` private | `:476` | Trôi +10 |
| `telemetry.ts:466-491` thứ tự attribute | `:499-512` | **Thứ tự đúng**, chỉ sai dòng |
| `telemetry.ts:693` = `startChatSpan` | `:711` | Trôi +18 |
| `telemetry.ts:1116` = `finishChatSpan` | `:1134` | Trôi +18 |
| `telemetry.ts:1162` = `span.end()` | `:1181` | Trôi +19 |
| `telemetry.ts:2048` = `runInActiveSpan` | `:2171` | Trôi +123 |
| `telemetry.ts:2106` re-export OTEL | `:2229` | Trôi +123 |
| `telemetry.ts:755` = `RequestStopSequences` | `:773` | Trôi +18 |
| `telemetry.ts:764` = `RequestAvailableTools` | `:782` | Trôi +18 |
| bảng sửa ghi `PiGenAIAttr` | `OmpGenAIAttr` | **Sai tên enum** |
| plan dòng 380 = C17 | — | C17 **không tồn tại** trong plan; dòng 380 là `expect(map.get("tool_call")).toHaveLength(1);` |
| plan dòng 1347 = §W10 | — | Không phải §W10 |
| plan dòng 2558 = §F8 | — | Không phải §F8 |
| "nguồn `pi-ref` không kiểm chứng được" | `/Users/tranquangdang21/Projects/pi-ref/packages/telemetry/` | **CÓ, đọc được** — plan sai; số 219/315/935 thì đúng |
| "sáu file mới dưới `src/telemetry/`" | 5 dưới `src/` + 1 ở `test/` | Cổng luôn xanh vì con số viết sai không bao giờ khớp |
| "`bun test otel.test.ts` bị chặn bởi native addon" | `42 pass, 0 fail` | Addon đã build; cổng hồi quy thật đang **mở** |

**Neo ĐÚNG (24):** `index.ts:24` = `export * from "./telemetry";` · `src/telemetry/` không tồn tại · 7 call site `span.end()` (1181/1214/1658/1758/2003/2074/2216) · 5 call site `setStatus` tất cả kèm `message` · và các neo còn lại đã mở đọc.

**Bảng điểm sửa.** Tất cả văn bản "TRƯỚC" dưới đây được trích từ file thật, đã mở và đọc.

Commit 1 — file MỚI (cột TRƯỚC = trạng thái hiện tại đã kiểm):

| đường/dẫn | symbol | TRƯỚC (đã kiểm) | SAU |
| --- | --- | --- | --- |
| `packages/agent/src/telemetry/context.ts` | `TelemetryAttributeValue`, `TelemetrySpan`, `TelemetryContext` | **không tồn tại** — `lsd: packages/agent/src/telemetry/: No such file or directory (os error 2)` | Hợp đồng vendor-neutral, **zero import** |
| `packages/agent/src/telemetry/noop.ts` | `NOOP_TELEMETRY_CONTEXT` | không tồn tại | Context NOOP, span đóng băng |
| `packages/agent/src/telemetry/memory.ts` | `InMemoryTelemetryContext` | không tồn tại | Adapter tham chiếu + `getSpans()` |
| `packages/agent/src/telemetry/conformance.ts` | `createTelemetryAdapterConformance` | không tồn tại | 9 case / 5 group, runner-independent |
| `packages/agent/src/telemetry/index.ts` | barrel | không tồn tại | `export * from "./context"; …` (không extension) |
| `packages/agent/test/telemetry-conformance.test.ts` | driver | không tồn tại | Drove suite trên memory **và** NOOP |

Commit 1 — file SỬA:

| đường/dẫn | symbol | TRƯỚC (trích nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/agent/src/index.ts:24` | barrel re-export | `export * from "./telemetry";` | giữ nguyên dòng 24, **thêm ngay sau**: `export * from "./telemetry/context";` |

Commit 2 — file SỬA (`telemetry.ts`, seam ~40 LOC):

| đường/dẫn | symbol | TRƯỚC (trích nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/agent/src/telemetry.ts:476` | `startSpan` (private) | `function startSpan(`<br>`\ttelemetry: AgentTelemetry \| undefined,`<br>`\tkind: TelemetrySpanKind,`<br>`\tname: string,`<br>`…`<br>`): Span \| undefined` | thêm `narrowSpan` + adapter nền OTEL cạnh đó; **giữ nguyên từng byte thứ tự ghép attribute ở `:499-512`** |
| `packages/agent/src/telemetry.ts:2171` | `runInActiveSpan<T>` (public, exported) | `export function runInActiveSpan<T>(span: Span \| undefined, fn: () => Promise<T>): Promise<T> {`<br>`\tif (!span) return fn(…)` | định tuyến qua activation hook, **giữ nguyên chữ ký** |
| `packages/agent/src/telemetry.ts:2229` | re-export OTEL | `export { type Attributes, type Span, SpanKind, SpanStatusCode, type Tracer, trace };` | **BẤT BIẾN.** Đây là chỗ làm TS2308 nếu hợp đồng đặt tên interface là `Span` |

Commit 2 — file KHÔNG ĐỔI: `packages/agent/test/otel.test.ts` (42 test / 180 expect) — **diff đúng 0 dòng.** Không sửa dù nó có đỏ.

**SAI LỆCH THIẾT KẾ: bản phác của plan ≠ mã nguồn tham chiếu.** Plan nói nguồn `pi-ref` **không kiểm chứng được** — **sai**, nó nằm ở `/Users/tranquangdang21/Projects/pi-ref/packages/telemetry/` và đọc được. Con số của plan về nó đều đúng, nhưng **bản phác trong plan lệch ở 12 điểm**: kiểu attribute thiếu `readonly boolean[]`; giá trị attribute **cấm** `undefined` (thật là cho phép); tham số start `startSpan<T>(context, name, fn)` 3 tham số (thật là `SpanOptions { name, attributes? }`); kiểu trả về `T` đồng bộ (thật là `Promise<T>` bất đồng bộ); span không có `startSpan` trong bản phác (thật là `TelemetrySpan extends TelemetryContext`); bản phác **bắt buộc có** `end(): void` (thật là vòng đời = callback, không hề có `end`); `SpanStatus` là string literal rời (thật là discriminated union `{status:"ok"} \| {status:"error"; error?:{name,message}}`); NOOP trả `return fn(NOOP_SPAN)` **theo danh tính** (thật là `Promise.resolve(callback(span))`); tên export suite `createTelemetryAdapterConformance` (bản phác ghi `createCase` + `runConformance`); fixture đồng bộ (thật là `AsyncDisposable`, `getSpans(): Promise<…>`); hệ type schema `defineTelemetrySchema` + `createTypedSpanStarter` (~330 LOC) mà plan **không nhắc tới**; và extension `.ts` trong specifier. **Kết luận thiết kế:** `end()` của plan là **lệch có chủ ý và hợp lý** — OMP thật sự cần handle sống qua một `await` (`telemetry.ts:711` trả handle → `:1134` nhận → `:1181` gọi `span.end()`).

**Các bước có neo đã kiểm — commit 1 (S, không phụ thuộc gì).**

1. **Quyết trước (chặn bước 1).** Ba câu hỏi: `end()` vs `TelemetrySpan extends TelemetryContext`? Plan chọn `end()` — giữ lựa chọn đó và **viết lý do vào comment** (bằng chứng: 7 call site `span.end()` tại `:1181, 1214, 1658, 1758, 2003, 2074, 2216`). `startSpan` đồng bộ hay bất đồng bộ? Pi-ref là **bất đồng bộ**; bất đồng bộ khớp `runInActiveSpan` (`:2171`, trả `Promise<T>`) và `finishChatSpan` (`:1134`, `async`). `conformance.ts` ở `src/` hay `test/`? Plan chọn `src/`; exports map có `"./*": "./src/*.ts"` nên nó **tự động** nằm trong public surface — ghi rõ trong PR.
2. **Tạo `packages/agent/src/telemetry/context.ts`.** Zero import. Bắt buộc có `end(): void`. `TelemetryAttributeValue` phải có `readonly string[]` (bắt buộc — `telemetry.ts:773` và `:782` gán mảng string).
3. **Tạo `packages/agent/src/telemetry/noop.ts`.** `return fn(NOOP_SPAN)` (hoặc `Promise.resolve(fn(NOOP_SPAN))` nếu bước 1 chọn bất đồng bộ). Span `Object.freeze` ở cấp module.
4. **Tạo `packages/agent/src/telemetry/memory.ts`.** Port từ `pi-ref/packages/telemetry/src/memory.ts` (219 LOC) với sửa đổi bắt buộc ở cạm bẫy #5. Trường record: `id`, `parentId`, `name`, `attributes`, `events`, `status`…
5. **Tạo `packages/agent/src/telemetry/conformance.ts`.** Port 9 case / 5 group từ `pi-ref/packages/telemetry/src/testing/conformance.ts:64-314`. `createCase` ở `:12` **không export**.
6. **Tạo `packages/agent/src/telemetry/index.ts`.** `export * from "./context"; export * from "./memory"; export * from "./noop";` — **không extension** (`git grep -n 'from "\..*\.ts"' -- packages/agent/src` → 0 kết quả).
7. **Thêm dòng barrel ở `packages/agent/src/index.ts`, ngay sau dòng 24.**
8. **Viết `packages/agent/test/telemetry-conformance.test.ts`.** Import từ **đường dẫn sâu** `@oh-my-pi/pi-agent-core/telemetry/context` (KHÔNG từ package root). Driver dùng `describe`/`it` của `bun:test` — không `vitest`.
9. **CỔNG COMMIT 1** — xem mục cổng.

**Các bước có neo đã kiểm — commit 2 (nửa M, rủi ro hồi quy cao nhất milestone).**

10. **Thêm `narrowSpan` + adapter nền OTEL trong `telemetry.ts`**, đặt cạnh `startSpan` private (`:476`). **Giữ nguyên từng byte thứ tự ghép attribute ở `:499-512`** (`operation → model/provider → …`).
11. **Định tuyến `runInActiveSpan` (`:2171`) qua activation hook.** Giữ nguyên chữ ký. Doc comment ở `:2161-2167` mô tả đúng cơ chế và **đã được kiểm chứng**: `tracer.startSpan` tạo span nhưng không activate nó.
12. **CỔNG COMMIT 2** — xem mục cổng.
13. **Changelog + vệ sinh.** `packages/agent/CHANGELOG.md:3` là `## [Unreleased]`, hiện **rỗng**. Thêm `### Changed`. Sau đó `git log` phải thấy W10 là **đúng hai** commit tách biệt.

**Hợp đồng test.** File `packages/agent/test/telemetry-conformance.test.ts` (mới) · `packages/agent/test/otel.test.ts` (**sửa 0 dòng**).

| # | Case | Group (pi-ref) | Hồi quy ⇒ người dùng thấy gì |
| --- | --- | --- | --- |
| 1 | admit đúng một lần, giữ **chính** giá trị trả về | `callback lifecycle` | Mọi code path `return startSpan(…, () => computeSomething())` trả `undefined` — **sai kết quả âm thầm**, không test output nào bắt |
| 2 | Giữ **nguyên vẹn** giá trị reject, sync lẫn async (kể cả `undefined` và Proxy không đọc được) | `callback lifecycle` | Lỗi bị nuốt hoặc bị bọc lại — stack trỏ sai chỗ |
| 3 | `setStatus` cuối cùng thắng, **không** bị ghi đè tự động khi throw | `status` | Span thành công bị ghi thành error, và ngược lại |
| 4 | Merge attribute + event có thứ tự | `recording` | Event mất hoặc sai thứ tự trên backend mới |
| 5 | Attribute call hỏng là **atomic** (không lưu dở) | `recording` | Backend nhận attribute rác |
| 6 | Call sau settle là vô hiệu | `recording` | Dữ liệu ghi sau khi span đã đóng |
| 7 | **Parentage**: child lồng nhau + **đồng thời** (concurrent) | `parentage` | Cây span phẳng/tách rời trên backend không phải OTEL — người debug một run thấy sai hình cây |
| 8 | **Passivity**: payload không đọc được bị bỏ qua, callback vẫn chạy | `passivity` | Telemetry làm **hỏng** luồng agent vì một attribute lỗi |
| 9 | `setStatus` hỏng là atomic | `passivity` | Throw rác ra khỏi callback |
| 10 | **BỔ SUNG — không có trong pi-ref**: round-trip `string[]` + **message** của `setStatus` | (mới) | Backend tương lai âm thầm vứt mất `gen_ai.request.stop_sequences` (`telemetry.ts:773`) và `omp.gen_ai.request.tools` |
| 11 | **BỔ SUNG — không có ở cả pi-ref lẫn plan**: span chưa từng gọi `setStatus` phải giữ `UNSET` khi export, **không** trở thành `OK` | (mới) | `otel.test.ts:246` đổi `UNSET` → `OK`; test đỏ **trong khi** cổng vẫn xanh |
| 12 | NOOP identity + không ghi gì | (driver) | Xem case 1 |

**Case 10 và 11 là bắt buộc, không phải tuỳ chọn.** Chúng là thứ duy nhất che ba chỗ mà `otel.test.ts` **hoàn toàn không che** (grep `stopSequences|availableTools|status\.message` trong `otel.test.ts` → **0 kết quả**).

**Cổng có đỏ được không.**

Cổng commit 1:

| # | Lệnh | Đỏ được không? | Câu trả lời cụ thể |
| --- | --- | --- | --- |
| 1 | `cd packages/agent && bun run check:types` | **CÓ** | Đã chạy thật ở HEAD `65cc6c1`: **exit 0**. Đây là cổng bắt được TS2308 nếu hợp đồng đặt tên là `Span`: `index.ts:24` star-export `telemetry.ts`, mà `telemetry.ts:2229` re-export `Span` của OTEL. |
| 2 | `git diff --stat` | **CÓ** | Đỏ **ngay khi** ai đó chạm `packages/agent/src/telemetry.ts` ở commit 1. |
| 3 | `bun test packages/agent/test/telemetry-conformance.test.ts` | **CÓ** | Chạy được **ngay hôm nay**. Đã kiểm chứng thực nghiệm: deep path `@oh-my-pi/pi-agent-core/telemetry/probe` resolve và chạy `1 pass, 0 fail` **không** nạp native addon. Plan gọi đây là "cần kiểm chứng thực nghiệm ở lần chạy đầu tiên" — **đã kiểm chứng, và nó đúng**. |

Cổng commit 2:

| # | Lệnh | Đỏ được không? | Câu trả lời cụ thể |
| --- | --- | --- | --- |
| 1 | `git diff --stat packages/agent/test/otel.test.ts` | **CÓ** | Thành khác rỗng **ngay khi có ai đó sửa file đó**. Chạy sạch ngay bây giờ → rỗng. |
| 2 | `bun test packages/agent/test/otel.test.ts` | **CÓ** | **Đã chạy thật: `42 pass, 0 fail, 180 expect() calls`, 262ms.** Plan nói lệnh này đang bị chặn bởi `Failed to load pi_natives native addon` — **điều đó không còn đúng**. Cổng hồi quy thật sự của commit 2 **đang mở**. |
| 3 | `git diff --stat packages/agent/src/telemetry.ts` | **CÓ, nhưng yếu** | Đỏ khi diff lớn. Đây là cổng **duy nhất** phân biệt "seam 40 LOC" với "viết lại 2237 LOC". Nó là **số LOC**, không phải kiểm hành vi — một bản viết lại 2237 LOC thay đổi hành vi vẫn lọt. **Đừng coi nó là cổng an toàn.** |

Cổng nào **KHÔNG** đỏ được — và viết lại:

| Cổng của plan | Vấn đề | Viết lại |
| --- | --- | --- |
| "sáu file mới **dưới `packages/agent/src/telemetry/`**" | Chỉ **5** file nằm dưới `src/telemetry/`; file thứ sáu là `packages/agent/test/telemetry-conformance.test.ts`. Cổng này **luôn xanh** vì con số viết sai không bao giờ khớp bất kỳ trạng thái nào. | `git status --porcelain` phải in **đúng 5 dòng `?? packages/agent/src/telemetry/` + 1 dòng `?? packages/agent/test/telemetry-conformance.test.ts` + 1 dòng ` M packages/agent/src/index.ts`**, và **không** có dòng nào chứa `telemetry.ts`. |
| "`otel.test.ts` pass là **bằng chứng** giữ nguyên hành vi" | Sai một phần: nó **không** che `string[]` attribute, **không** che `status.message`, và **không** phân biệt `UNSET` với `OK`. | Thêm vào cổng commit 2: `bun test packages/agent/test/telemetry-conformance.test.ts` **cũng** phải xanh — case 10 và 11 là thứ che ba lỗ hổng đó. |
| "`bun run check:ts` toàn repo" là cổng commit 1 | Nó **đã xanh** ở HEAD `65cc6c1` (exit 0, 17 package xanh). Blocker W1 mà plan còn ghi đã biến mất. | Giữ dùng nó — nó xanh thật. Nhưng **đừng gọi nó là "cửa sổ duy nhất để chứng minh W10 không phá W1/W2/W6/W11/W12/W13"** nữa; nó đang xanh không vì lý do đó. |

**Cạm bẫy riêng của mục này.**

1. **Sửa `otel.test.ts` cho nó chạy qua.** Cấm tuyệt đối. Nó đang xanh; nếu nó đỏ sau commit 2 thì **refactor sai**, không phải test sai.
2. **Cổng diff-0-dòng là con dao cùn.** Nó bắt được "ai đó sửa test", nhưng **không** bắt được "adapter vứt mất `stopSequences` / `available_tools` / mọi `status.message`". Ba thứ đó chỉ conformance suite bắt.
3. **`UNSET` vs `OK` — bẫn im lặng, nguy hiểm nhất của commit 2.** Trong `telemetry.ts` **không có call site nào** set `SpanStatusCode.OK` hay `UNSET`: cả 5 `setStatus` đều là `SpanStatusCode.ERROR`.
4. **`await using` / `AsyncDisposable` KHÔNG typecheck trong repo này.** `tsconfig.base.json` đặt `lib: ["ES2024", "DOM.AsyncIterable"]`; đã kiểm chứng bằng `tsgo` trên một probe tách biệt → `error TS2318`.
5. **`private` trong `memory.ts` của pi-ref.** `memory.ts:193` viết `private readonly state`. AGENTS.md cấm `private`/`protected`/`public` trên field/method — phải dùng `#state`. Đây là loại vi phạm mà `bun run check` bắt.
6. **`.ts` trong specifier.** Pi-ref dùng `"./index.ts"` ở khắp nơi; `git grep -n 'from "\..*\.ts"' -- packages/agent/src` → **0 kết quả**. Copy nguyên văn sẽ lệch quy ước repo.
7. **`vitest` → `bun test`.** `pi-ref/.../test/conformance.test.ts:1` import từ `"vitest"`. Thân suite dùng `node:assert/strict` — chạy được dưới Bun, nhưng **file driver** phải viết lại.
8. **Coi conformance suite là "mô phỏng vừa đủ".** Nó là bộ **port thật** từ một package đã tồn tại và đã có 9 case. Viết lại 6 case suy nghĩ trong đầu là tự phát minh lại thứ đã có bằng chứng.
9. **`startSpan(context, name, fn)` tự truyền chính nó.** Tham số đầu tiên trong bản phác là `TelemetryContext` — cái mà caller phải truyền vào chính method của nó. Trong pi-ref tham số đó là `SpanOptions`.
10. **`C17` là tham chiếu treo.** Plan dẫn "C17 (plan dòng 380)" ba lần, nhưng `C17` **không được định nghĩa ở bất kỳ đâu** trong tài liệu.
11. **Đường dẫn sâu phải là đường dẫn sâu thật.** Nếu ai đó import `@oh-my-pi/pi-agent-core` (package root) trong test conformance, nó kéo `src/index.ts` → OTEL → natives.

Quy mô port thực tế: `pi-ref` `src` = 935 LOC, trong đó **~330 LOC** là hệ type schema `defineTelemetrySchema` mà W10 **không cần**. Ba câu hỏi plan yêu cầu người quyết đã tự quyết được hai: `TelemetryAttributes` **có** cho phép `undefined` (pi-ref dùng `[name: string]: AttributeValue | undefined` và `copyAttributes` **loại bỏ** undefined); `conformance.ts` **có** được ship ở `src/`.

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

# Cần native addon — build một lần ở trên, xong là dòng dưới chạy:
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build                                # điều kiện tiên quyết
bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts   # kỳ vọng: 2 pass
```

Cấm tuyệt đối dùng `tsc` / `npx tsc` — phải `bun check` / `bun run check:ts`. Lưu ý: `bun check` = `check:ts` + `check:rs` (`package.json:93`); `check:rs` cần cargo nên trong bài toán này chỉ chạy được `check:ts`.

### Cổng hoàn thành

`bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts` báo **2 pass**, **sau khi** native addon đã build. Điều kiện tiên quyết bắt buộc: `brew install ninja` rồi `bun --cwd=packages/natives run build` — một lần là đủ. Trước bước build đó `bun test` đỏ `0 pass / 1 fail` ngay cả với file test **đã tồn tại** (đã verify chạy thật `task-executor-mcp-parity.test.ts` → `0 pass, 1 fail, 1 error`: `Failed to load pi_natives native addon for darwin-arm64`); đó là thiếu build, không phải hạn chế của máy.

Trước khi build, tiêu chuẩn nghiệm thu là `bun run check:ts` xanh (typecheck + oxlint + oxfmt).

Gate **không** dùng: đếm số tool có strict, đọc `readonly strict = true` trên 5 builtin, hoặc bất kỳ cách nào source-grep file implementation — AGENTS.md cấm, và cả ba đều là static echo.

**Cổng có thể đỏ không?** Có — `gate_can_fail: true`, và đã chứng minh bằng thực nghiệm chứ không suy luận. Spec đã chạy một bản replica trung thực của vòng lặp `applyToolProxy` (guard `key in wrapper`) với đúng hình dạng class của `RegisteredToolAdapter`: với `declare strict: boolean` (hiện tại) thì `strict` được proxy và `adapter.strict === true`; khi `declare` biến thành field runtime thật (`strict: boolean = false`), field initializer chạy **trước** thân constructor nên `key in this` thành `true`, guard bỏ qua proxy, và `adapter.strict` đọc ra `false` dù definition có `strict: true` — silent breakage, không throw, không cảnh báo. Đó chính xác là hồi quy mà test nào cũng chưa bắt được, và nó phân kỳ theo provider.
**Lưu ý trung thực:** gate này **cần** native addon — chạy `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là nó dùng được làm tiêu chuẩn nghiệm thu. Trước bước build đó nó đỏ vì lý do **tiền đề môi trường** chứ không phải vì lý do hợp đồng.

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
| `bun check && bun test <file>` là lệnh xác minh. | INCOMPLETE — thiếu tiền điều kiện môi trường | `bun test` **cần** native addon, và đây không phải hạn chế riêng của test mới. Đã verify ở máy **chưa build addon**: `bun test packages/coding-agent/test/task-executor-mcp-parity.test.ts` (file **đã tồn tại**) → `0 pass, 1 fail, 1 error`, `Failed to load pi_natives native addon for darwin-arm64`. Lỗi đó chặn **toàn bộ** module graph của coding-agent, kể cả khi chạy `bun run` thuần (không chỉ `bun test`) — nhưng nó tự hết sau `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần, và khi đó mọi cổng `bun test` trong tài liệu này chạy. Lệnh verify chạy được ngay, không cần addon, là `bun run check:ts` — đã chạy thật, PASS tại `ecd516f`. Ngoài ra `bun check` = `check:ts` + `check:rs` (`package.json:93`), mà `check:rs` cần cargo, nên trong bài toán này chỉ chạy được `check:ts`. *Evidence: `bun run check:ts` → tất cả package `Done`; `bun test packages/coding-agent/test/task-executor-mcp-parity.test.ts` → `0 pass 1 fail 1 error` trước bước build; `package.json:93`.* |
| Các anchor còn lại: 5 builtin `strict = true`; `tryEnforceStrictSchema`; CONSTRAINTS.md dòng 51/56; cả 5 provider read site; allowlist Anthropic; `strict: tool.strict`; `wrapRegisteredTool`; `RegisteredToolAdapter`; 5 anchor test trong packages/ai; alias `apply_patch`; `constrainedSampling` = 0 hit. | VERIFIED EXACT — không cần sửa | Tất cả khớp tuyệt đối tại `ecd516f`. Dùng nguyên văn trong comment của test. *Evidence: `bash.ts:604`, `read.ts:861`, `write.ts:440`, `ast-edit.ts:187`, `edit/index.ts:329`; `normalize.ts:2436`; `CONSTRAINTS.md:51` (`MUST return { strict: false, schema: original }`) và `:56` (`MUST preserve an author's explicit tool.strict === false`); `openai-completions.ts:2594`, `openai-responses.ts:1492`, `anthropic.ts:5870` (+ allowlist `:5453` = bash/python/edit/find, gate `:5869` và keyword `:5871`), `openai-codex-responses.ts:5078`, `devin.ts:659`; `sdk.ts:1205`; `wrapper.ts:100` và `:32`; `openai-tool-strict-mode.test.ts:196/215/801/817/835`; `schema-strict-mode.test.ts:755/781`; `extensions-runner.test.ts:2436`; `grep -rn constrainedSampling packages/` → 0.* |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W11.md`.

**Cảnh báo neo.** Nguyên văn từ phiếu:

> **Tổng: 42 dòng neo — 17 ✓ · 25 ✗.** 25 dòng hỏng tập trung ở ba nhóm: dòng trong `wrapper.ts`, dòng trong `sdk.ts`, và cụm bốn neo Anthropic mà kế hoạch đặt lệch ~380 dòng.

| Neo trong kế hoạch | Thực tế | Nội dung thật ở vị trí đúng |
| --- | --- | --- |
| `extensibility/extensions/wrapper.ts:37` | ✗ → **:67** | `declare strict: boolean;` |
| `extensibility/extensions/wrapper.ts:47` | ✗ → **:77** | `applyToolProxy(registeredTool.definition, this);` |
| `extensibility/extensions/wrapper.ts:32-48` | ✗ → **62-82** | thân `RegisteredToolAdapter` |
| `wrapper.ts:32` (RegisteredToolAdapter) | ✗ → **:62** | `export class RegisteredToolAdapter implements AgentTool<any, any, any> {` |
| `wrapper.ts:100` (wrapRegisteredTool) | ✗ → **:134** | `export function wrapRegisteredTool(registeredTool: RegisteredTool, runner: ExtensionRunner): AgentTool {` |
| `wrapper.ts:166` (call site thứ hai) | ✗ → **:200** | `applyToolProxy(tool, this);` |
| `sdk.ts:1188` | ✗ → **:1200** | `export function customToolToDefinition(tool: CustomTool, sourcePath?: string): ToolDefinition {` |
| `sdk.ts:1205` | ✗ → **:1214** | `strict: tool.strict,` (comment #4336/#4340 ở `:1212-1213`) |
| `test/task-executor-mcp-parity.test.ts:64-80` | ✗ → **53-68** | `it("survives the custom-tool → definition bridge…` |
| `package.json:94-95` (check:tools) | ✗ → **:91** | `"check:tools": "oxlint . && oxfmt --check …"` |
| `package.json:93` (bun check) | ✗ → **:89** | `"check": "bun run --parallel check:ts check:rs"` |
| `anthropic.ts:5453` (allowlist) | ✗ → **:5384** | `const ANTHROPIC_STRICT_TOOL_ALLOWLIST = new Set(["bash", "python", "edit", "find"]);` |
| `anthropic.ts:5870` / `:5869` / `:5871` (gate) | ✗ → **:5799-5803** / **:5810** / **:5802** | `const candidateIndexes = tools.flatMap(…)` · `if (strictToolCount >= MAX_ANTHROPIC_STRICT_TOOLS) break;` · `if (hasAnthropicStrictIncompatibleKeyword(toolWireSchema(tool))) return [];` |
| `bash.ts:604` | ✗ → **:614** | `readonly strict = true;` |
| `tools/edit/index.ts:329` | ✗ → **`src/edit/index.ts:329`** | dòng đúng, **thiếu cấp `tools/`** trong đường dẫn |
| `extensions/types.ts:611/636` (interface) | ✗ → **:638** | `export interface ToolDefinition<TParams …> {` |
| `extensions/types.ts:636/661` (field) | ✗ → **:663** | `strict?: boolean;` |
| `ai/src/types.ts:1438` | ✗ → **:1427** | `export interface Tool<TParameters extends TSchema = TSchema> {` |
| `ai/src/types.ts:1443` | ✗ → **:1432** | `strict?: boolean;` |
| `CONSTRAINTS.md:51` | ✗ → **:52** | `` `tryEnforceStrictSchema` MUST return `{ strict: false, schema: original }` `` (`:51` là heading) |
| `CONSTRAINTS.md:56` | ✗ → **:57** | `Callers MUST preserve an author's explicit tool.strict === false …` |
| `extensions-runner.test.ts:2436` (apply_patch) | ✗ → **:2364** | `tool: { ...approvalTool, name: "edit", customWireName: "apply_patch" },` |
| `schema-strict-mode.test.ts:755,781` | ✗ → **:742, :768** | `it("downgrades to non-strict mode when strict enforcement throws"` · `it("degrades to non-strict when array items is an empty schema"` |
| `tools/provider-schema-compatibility.test.ts:99-101` | ✓ (lệch 1) | assert thật ở **:100-101**; kết luận vẫn đúng |
| git HEAD `ecd516f` | ✗ → **`65cc6c1`** | branch `milestone-1` |
| "addon chưa build, `bun test` đỏ" | ✗ → **đã build** | `pi_natives.darwin-arm64.node` 185 MB; parity test `7 pass / 0 fail` |

**Neo ĐÚNG (17):** `tool-proxy.ts:6` và `:12`; `packages/natives/native/loader-state.js:970`; `openai-codex-responses.ts:5078` (kế hoạch ghi `!!(tool.strict)` — **thiếu guard** `!NO_STRICT &&`); `devin.ts:659`; `openai-completions.ts:2594`; `openai-responses.ts:1492`; `read.ts:861`; `write.ts:440`; `ast-edit.ts:187`; `mcp/tool-bridge.ts:665, :775`; `task/index.ts:563`; `normalize.ts:2436` (thiếu path; thật `packages/ai/src/utils/schema/normalize.ts`); `openai-tool-strict-mode.test.ts:196,215,801,817,835`; `host-tools.ts:59` · `custom-tools/wrapper.ts:27` · `hooks/tool-wrapper.ts:38`; `extensions/wrapper.ts:77, :200`; `constrainedSampling` = 0 hit; và đếm `40` hit / `37` `= true` / `3` opt-out khớp tuyệt đối.

**Bảng điểm sửa.** Chỉ **một** dòng trong toàn bộ công việc:

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/test/tools/strict-declaration-guard.test.ts` | *(file mới — chưa tồn tại)* | *(không có file; `ls` → `No such file or directory`)* | File test 2 `it()`, import 5 symbol, một `STUB_RUNNER` stub, hai helper `stubTool` / `toSessionAdapter` |

Không có file production nào khác. Tám file dưới đây chỉ **đọc**, không sửa: `extensibility/tool-proxy.ts` · `extensibility/extensions/wrapper.ts` · `sdk.ts` · `test/task-executor-mcp-parity.test.ts` · `extensibility/custom-tools/types.ts` · `extensibility/extensions/runner.ts` · `extensibility/extensions/types.ts` · `packages/natives/`.

**Số đếm đã kiểm, dùng được nguyên văn trong comment test:**

```
$ rg -c "readonly strict = " packages/coding-agent/src/ | awk -F: '{s+=$2} END {print s}'   → 40
$ rg -n "readonly strict = " packages/coding-agent/src/ | grep -c "= true"                     → 37
$ rg -rn constrainedSampling packages/                                                          → 0 hit
```

**Các bước có neo đã kiểm.**

1. **Đọc cơ chế thật quyết định hợp đồng** — `packages/coding-agent/src/extensibility/tool-proxy.ts` (35 dòng, cả file). Đây **không** nằm ở `wrapper.ts` như kế hoạch nói. Neo `:6` là `export function applyToolProxy<TTool extends object>(tool: TTool, wrapper: object): void {`; neo `:12` là `if (key === "constructor" || visited.has(key) || key in wrapper) {` — mọi key đã có sẵn trên `wrapper` bị **bỏ qua** (`continue`), không proxy. `:16` mới là chỗ `Object.defineProperty(wrapper, key, { get() … })` — cơ chế thật sự mang giá trị qua. ⚠️ Kế hoạch ghi `wrapper.ts:47` cho call site — **sai**; call site thật là `wrapper.ts:77`.
2. **Vì sao `strict` sống sót: `declare` không emit** — `wrapper.ts` dòng **62–82** (kế hoạch ghi 32–48). `:62` là `export class RegisteredToolAdapter implements AgentTool<any, any, any> {`; `:67` là `declare strict: boolean;`; `:77` là `applyToolProxy(registeredTool.definition, this);`. `declare` là **type-only, không emit field runtime** ⇒ `"strict" in wrapper` là `false` lúc proxy chạy ⇒ `strict` **được** proxy. Hai neo phụ cùng file (kế hoạch ghi `:32` và `:100` — **cả hai sai**): `wrapRegisteredTool` định nghĩa tại **`wrapper.ts:134`**, `return new RegisteredToolAdapter(registeredTool, runner);` tại `:135`; call site thứ hai của `applyToolProxy` trong cùng file tại **`wrapper.ts:200`**.
3. **Nguồn đầu vào** — `packages/coding-agent/src/sdk.ts` (kế hoạch ghi `:1188`/`:1205` — **cả hai sai**). `:1200` là `export function customToolToDefinition(tool: CustomTool, sourcePath?: string): ToolDefinition {`; `:1212-1214` là comment #4336/#4340 rồi `strict: tool.strict,`. `sdk.ts:1188` thật ra là `}` đóng hàm `registerEvalCleanup()`. Kiểu nguồn: `CustomTool.strict?: boolean` tại `extensibility/custom-tools/types.ts:199`.
4. **Chép khuôn khung từ test sẵn có** — `test/task-executor-mcp-parity.test.ts` dòng **53–68** (kế hoạch ghi 64–80 — **sai**; `:64` là dòng giữa thân test). **Chỉ chép hình dạng**, không chép assertion: tool của nó là `strict: false`, không dùng lại được cho hợp đồng 1 (`toBe(true)`).
5. **Viết hợp đồng 1 (opt-in sống sót qua bridge)** — `CustomTool` có `strict: true` → `customToolToDefinition` → `wrapRegisteredTool` → `expect(adapter.strict).toBe(true)`. Dùng tên tool **không** nằm trong allowlist Anthropic, để test không vô tình phụ thuộc nhánh allowlist. Allowlist thật là `new Set(["bash", "python", "edit", "find"])` tại `packages/ai/src/providers/anthropic.ts:5384`, gate lọc ở `:5799-5803` (`if (!ANTHROPIC_STRICT_TOOL_ALLOWLIST.has(tool.name)) return [];` ở `:5800-5801`). ⚠️ Kế hoạch ghi allowlist ở `anthropic.ts:5453` và gate ở `:5870`/`:5869`/`:5871` — **cả bốn sai** (`:5453` là comment trong docblock; `:5870` là `case "refusal":`; `:5869` là `return "toolUse";`; `:5871` là `return "error";`).
6. **Viết hợp đồng 2 (vắng mặt không được bịa thành opt-in)** — tool **không khai báo** `strict` — phải **omit hẳn key**, không gán `undefined` — → `expect(adapter.strict).toBeUndefined()`. Lý do cụ thể: `openai-codex-responses.ts:5078` (`const strict = !!(!NO_STRICT && tool.strict);`) và `devin.ts:659` (`strict: tool.strict ?? false,`) là hai provider opt-in sẽ siết ngay mọi tool extension nếu bridge có giá trị mặc định. (Kế hoạch ghi codex là `!!(tool.strict)` — thật là có guard bypass toàn cục; không đổi kết luận, trong comment test cứ viết ngắn `!!tool.strict`.)
7. **Comment chống hiểu sai trên hợp đồng 2** — đây **không** phải "vắng mặt = non-strict". `openai-completions.ts:2594` (`const strict = !NO_STRICT && compat.supportsStrictMode !== false && tool.strict !== false;`) và `openai-responses.ts:1492` (`const strict = !NO_STRICT && strictMode && tool.strict !== false;`) đều đọc `!== false`, nên **vắng mặt vẫn ra strict** ở hai provider đó. Hợp đồng đang khoá là *"bridge không tự bịa opt-in"*, không phải *"wire mặc định là non-strict"*.
8. **Chạy cổng** — xem mục cổng.
9. **Ghi nhận khoảng trống cố ý** — năm dòng `readonly strict = true` của builtin **không** được khoá.

**Hợp đồng test.** File `packages/coding-agent/test/tools/strict-declaration-guard.test.ts` · Suite `describe("strict across the extension-tool bridge")` — 2 `it()`.

| # | Case | Assert | Vì sao không phải passthrough |
| --- | --- | --- | --- |
| 1 | `keeps an explicit strict:true opt-in on the registered session tool` | `expect(toSessionAdapter("opt-in", true).strict).toBe(true)` | Giá trị đi qua proxy phản ánh dùng `Reflect.ownKeys` + `Object.defineProperty` với `declare`; nó là hợp đồng cấu trúc, không phải echo |
| 2 | `does not fabricate an opt-in for a tool that never declared strict` | `expect(toSessionAdapter("no-strict").strict).toBeUndefined()` | Hợp đồng phủ định có lý do cụ thể: `openai-codex-responses` và `devin` sẽ siết mọi tool extension nếu bridge có giá trị mặc định |

**Nếu hồi quy:** ai đó sửa `customToolToDefinition` (`sdk.ts:1214`) hoặc `applyToolProxy`, `strict` rơi khỏi đường extension và hành vi đổi **theo provider** — `devin`/`codex` mất strict, còn OpenAI/Anthropic giữ nguyên.

**Khoảng trống cố ý:** năm dòng `readonly strict = true` của builtin **không** được khoá. Đã xác nhận không có cách rẻ nào khoá chúng mà không thành static echo. Xoá dòng đó chỉ đổi hành vi trên **hai** provider. (Bốn dòng builtin trong kế hoạch đúng; `bash.ts:604` sai → thật là `:614`; đường dẫn `edit/index.ts` sai cấp thư mục → thật là `src/edit/index.ts:329`.)

**Cổng có đỏ được không.**

Cổng chính — `bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts`, kỳ vọng **2 pass, 0 fail**.

> **Cổng này đỏ được, bằng cách nào — và nó KHÔNG bị chặn.** Kế hoạch khẳng định cổng này **không chạy được** vì thiếu native addon, và dặn trước `bun --cwd=packages/natives run build`. **Điều đó sai ở HEAD hiện tại.** `ls -la packages/natives/native/pi_natives.darwin-arm64.node` → 185 MB, đã build sẵn; `bun test packages/coding-agent/test/task-executor-mcp-parity.test.ts` → `7 pass / 0 fail`. Cổng của W11 chạy được **ngay, không một bước build nào**.
>
> **Cổng phải đỏ được bằng cơ chế thật, không phải bằng cảnh báo miệng.** Bằng chứng đỏ đã đo, chạy thật: nếu ai đó đổi `declare strict: boolean;` (`wrapper.ts:67`) thành field runtime thật (`strict: boolean = false`), field initializer chạy **trước thân constructor** nên `"strict" in this` thành `true` — kết quả probe: **false** (tức `adapter.strict` không còn trả `true`). Silent breakage: không throw, không cảnh báo, không log. **Hợp đồng 1 đỏ; hợp đồng 2 vẫn xanh** (nó vốn trả `undefined`). Vì vậy **hợp đồng 1 là hợp đồng phải có; đừng bao giờ gộp hai cái thành một.**

Cổng phụ — chạy được ngay:
```bash
bunx oxfmt --check 'packages/coding-agent/test/tools/strict-declaration-guard.test.ts'
bunx oxlint packages/coding-agent/test/tools/strict-declaration-guard.test.ts
bun run check:ts
```
Đã kiểm: `oxfmt 0.65.0` và `oxlint 1.85.0` có sẵn qua `bunx`. **Đỏ được không?** Đỏ ngay khi file lệch format/lint — đủ để bắt lỗi cơ bản, nhưng **không** bắt được hồi quy `strict`. **Đừng coi đây là cổng bảo vệ hợp đồng.** ⚠️ `bun check` = `check:ts` + `check:rs` (`package.json:89`) và `check:rs` cần cargo — **chỉ chạy `check:ts`**. Tuyệt đối không `tsc`/`npx tsc`.

**Cổng KHÔNG dùng:** đếm số tool có strict · đọc `readonly strict = true` trên 5 builtin · bất kỳ source-grep nào lên file implementation. AGENTS.md cấm source-grep trong test, và cả ba đều là static echo — xanh giả.

**Cạm bẫy riêng của mục này.**

**Cạm bẫy 1 — sống sót sai lầm (rủi ro lớn nhất).** Ai đó đọc D-1, thấy cỡ S, rồi vẫn port vì bản gốc viết rõ: dựng `constrained-sampling.ts` cạnh `normalize.ts` và thêm field thứ hai cạnh `strict`.

**Cạm bẫy 2 — tin số dòng trong kế hoạch.** Kế hoạch viết mọi số theo `ecd516f`; HEAD hiện tại là `65cc6c1` và **18/24 neo đã trôi**. Viết comment trong test trích `wrapper.ts:37` sẽ trỏ vào dòng sai.

**Cạm bẫy 3 — đi tìm `edit.ts` không tồn tại rồi bị kẹt.** Bề mặt edit của omp là `write` + `ast_edit` + `edit/index.ts` cộng wire alias `apply_patch`, không có file `edit.ts` đơn. Alias xác nhận tại `extensions-runner.test.ts:2364`: `tool: { ...approvalTool, name: "edit", customWireName: "apply_patch" },`.

**Cạm bẫy 4 — tin phần "Cổng hoàn thành" của kế hoạch.** Nó bảo phải build native addon trước, cảnh báo `brew install ninja`. Ở HEAD này addon đã có sẵn 185 MB — chạy build là **lãng phí vài phút**.

**Cạm bẫy 5 — viết lại hai hợp đồng đã có.** `strict: false` tường minh sống sót tới wire đã có test: `packages/ai/test/openai-tool-strict-mode.test.ts:196,215,801,817,835` (đã kiểm cả 5 — đúng).

Câu hỏi cần người quyết (chuyển sang M2, **không** quyết ở M1): (1) Ba trạng thái `strict: "prefer"` của `pi` hay boolean của `omp`? (2) Nâng W11 lên M để khoá 5 dòng `readonly strict = true` của builtin không? Nếu không nâng, phải ghi rõ khoảng trống này vào bảng wave để người đọc không tưởng là sót.

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

Trạng thái đã quan sát: `bun run check:ts` **xanh ở baseline** trên chính HEAD này (16/16 packages Done, không lỗi; không cần native addon). Trước bước build addon ở bước 2, `bun test packages/coding-agent/test/tools/ast-edit.test.ts` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` (loader-state.js:970) — đó là **tiền đề tái lập được**, không phải hạn chế của máy: build addon một lần là file test này chạy.

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

Hai lỗi kế cận đáng nhớ: `ast_edit` fan-out trên nhiều file mỗi lời gọi nên khoá theo file không có một key đơn lẻ; và đừng để module mới import barrel `@oh-my-pi/pi-utils` (đã xác minh: nó kéo theo native addon, nên test của module đó cần bước build addon ở mục *Điều kiện tiên quyết* mới chạy được).

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

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W12.md`.

**Cảnh báo neo.** Mỗi dòng dưới đây đã được mở bằng `sed -n` / `grep -n` / `git grep` tại HEAD `65cc6c1`.

| work item ghi | dòng thật | nội dung thật ở dòng đúng | mức lệch |
| --- | --- | --- | --- |
| `extensibility/extensions/types.ts:1347` = `registerTool` (**kể cả phần "Đính chính" của work item**) | **`:1372`** | `	registerTool<TParams extends TSchema = TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, …` | lệch 25 |
| `extensibility/extensions/types.ts:1379` = `registerFileWriteFallback` | **`:1404`** | `	registerFileWriteFallback(handler: FileWriteFallbackHandler): void;` | **lệch 25** |
| `task/executor.ts:3960` = `createAgentSession` | **`:4016`** | `			const sessionPromise = createAgentSession(buildSubagentSessionOptions(sessionManager, null));` | **lệch 56** |
| `agent-loop.ts:3589-3611` = cơ chế exclusive | **`:3587-3614`**, phần cốt lõi `:3609-3614` | `:3609` `		const start = concurrency === "exclusive" ? Promise.all([lastExclusive, ...sharedTasks]) : lastExclusive;` | lệch nhẹ |
| `extensibility/extensions/runner.ts:778` = chỗ nối `addFileWriteFallback` | **`:782`** | `					addFileWriteFallback(async req => {` | lệch 4 |
| `file-write-fallback.ts:440-452` = vòng `fallbackHandlers` | **`:444-453`** | `					for (const handler of Array.from(fallbackHandlers)) {` … đóng `}` ở `:453` | lệch 4 |
| `file-write-fallback.ts:18-32` = doc comment "bốn call site" | **`:17-31`**; câu "It has four call sites, and all of them route here" ở `:21-22` | doc comment **có** nói bốn và **có** kể `edit/hashline/filesystem.ts` — nhưng đếm thật trong `src/` là **3 write** (`edit/index.ts:674`, `lsp/writethrough.ts:74`, `lsp/writethrough.ts:314`) **+ 2 delete** (`edit/index.ts:645`, `:675`) | — |
| `ast-edit.ts:85-95` = vòng `runAstEditTargets` | **`:86-97`** | `	for (const target of targets) {` ở `:86`, `astEdit` ở `:87-97` | lệch 1 |
| `edit/index.ts:222` = "apply_patch là một edit MODE được chọn" | **`:358`** (chọn) / `:369`, `:379` (dùng) | `:222` là `	if (mode === "patch" \|\| mode === "apply_patch") {` — một **nhánh kiểm tra mode**, không phải chỗ chọn | lệch lớn về nghĩa |
| `ast-edit.ts:87`, `:137` "ghi qua `urlFilesystem.shellFilesystem()`" | hai chỗ gọi `shellFilesystem()` thật là **`:291`** (preview) và **`:438`** (apply) | ở `:87`/`:137` filesystem đến từ `options.filesystem`, **không** phải từ `urlFilesystem.shellFilesystem()` | claim sai |
| `test/tools/` "30+ file" | **172 entry** | | plan đếm thiếu, không sai |
| `CHANGELOG.md` "Thêm dòng dưới `### Fixed`" | `## [Unreleased]` **chỉ có `### Security`** | **`### Fixed` chưa tồn tại, phải tạo**, đặt sau `### Security` theo thứ tự AGENTS.md | work item tưởng section có sẵn |
| "Tiền đề trong mô tả task: 'git HEAD 5873776'" | HEAD thật: **`65cc6c1`** | | — |
| "Bước 2: `brew install ninja` **BẮT BUỘC TRƯỚC**" | **Sai** — addon đã build sẵn | | — |
| "Trạng thái đã quan sát: `bun test …/ast-edit.test.ts` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon`" | **Sai** ở HEAD hiện tại | | — |

**Neo ĐÚNG, dùng nguyên số dòng:** `file-write-fallback.ts:305` (`deleteFileWithFallback`) và `:402` (`writeFileWithFallback`); `ast-edit.ts:87`, `:137`, `:152` (`readonly name = "ast_edit";` — **không có field `concurrency` nào trong class**), `:285`/`:287` (`runAstEditOnce` preview / `dryRun: true`); `edit/index.ts:495`, `:645`, `:674`, `:675`, `:711`, `:728`/`:738`/`:740`, `:328` (`readonly concurrency = "exclusive";` của `EditTool`); `lsp/writethrough.ts:74` và `:314`; `tools/write.ts:441` (`WriteTool`) và `:909`; `packages/agent/src/agent-loop.ts:3024` (`async function executeToolCalls(`) và `:3511` (`let lastExclusive: Promise<void> = Promise.resolve();`); `src/advisor/runtime.ts:454` (`const { promise, resolve } = Promise.withResolvers<boolean>();` — tiền lệ); `CHANGELOG.md:3`; `git grep -c writeFileWithFallback src/tools/ast-edit.ts` → `0`; `edit/hashline/filesystem.ts` và `edit/modes/patch.ts` **không tồn tại**; `src/utils/file-mutation-queue.ts` và test tương ứng **không tồn tại** (`src/utils/` có 45 file, **không** có `index.ts`); và `bun run check:ts` xanh ở baseline (16/16 package Done, 5445 file đúng format).

**Bảng điểm sửa.** TRƯỚC được trích nguyên văn từ file thật ở HEAD `65cc6c1`.

| path | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/utils/file-mutation-queue.ts` | *(file mới)* | **không tồn tại** | `export async function withFileMutationQueue<T>(filePath: string, fn: () => Promise<T>): Promise<T>` + queue map theo realpath |
| `packages/coding-agent/src/tools/file-write-fallback.ts:402` | `writeFileWithFallback` | `export async function writeFileWithFallback(dst: string, content: string, file?: BunFile): Promise<void> {` | bọc **toàn bộ thân** vào `withFileMutationQueue(<dst>, async () => { …thân hiện có, thụt thêm 1 tab… })` |
| `packages/coding-agent/src/tools/file-write-fallback.ts:305` | `deleteFileWithFallback` | `export async function deleteFileWithFallback(dst: string, file?: BunFile): Promise<void> {`<br>`	try {` | y hệt dòng trên — **delete phải đi qua CÙNG hàng đợi với write** |
| `packages/coding-agent/src/tools/file-write-fallback.ts` (import) | *(import mới)* | file không import gì từ `../utils/` | `import { withFileMutationQueue } from "../utils/file-mutation-queue";` |
| `packages/coding-agent/src/tools/ast-edit.ts:433` | `runAstEditOnce(…, { dryRun: false })` (đường apply) | `						const applyResult = await runAstEditOnce(multiTargets, resolvedSearchPath, globFilte…` | bọc tại **call site apply `:433`**, không bọc hai dòng `:87`/`:137` |
| `packages/coding-agent/src/tools/ast-edit.ts` (import) | *(import mới)* | không có | `import { withFileMutationQueue } from "../utils/file-mutation-queue";` |
| `packages/coding-agent/test/tools/file-mutation-queue.test.ts` | *(file mới)* | **không tồn tại** | 5 `it` trong 1 `describe`, `bun:test`, `node:fs/promises` + `os.tmpdir()` + `fs.mkdtemp` |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` | `## [Unreleased]`<br>`### Security`<br>`- Project-scope MCP config …` | thêm mục `### Fixed` **mới** (chưa tồn tại), đặt sau `### Security` |

**Chữ ký `file-mutation-queue.ts` — dán nguyên văn, không sửa một ký tự.** Bản dưới đây là port từ bản tham chiếu 61 LOC, chỉ khác ở: `Promise.withResolvers` thay cho `new Promise` (theo AGENTS.md), ép kiểu `(error as { code?: unknown }).code`.

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
		((error as { code?: unknown }).code === "ENOENT" ||
			(error as { code?: unknown }).code === "ENOTDIR")
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
	// Registration is itself serialized, so two concurrent key resolutions cannot
	// both read the same tail and both append to it.
	const registration = registrationQueue.then(async () => {
		const key = await getMutationQueueKey(filePath);
		const currentQueue = fileMutationQueues.get(key) ?? Promise.resolve();

		// Two-phase handoff, not tail.then(run).
		const nextQueue = Promise.withResolvers<void>();
		const chainedQueue = currentQueue.then(() => nextQueue.promise);
		fileMutationQueues.set(key, chainedQueue);

		return { key, currentQueue, chainedQueue, releaseNext: nextQueue.resolve };
	});
	// Two-arg form: a plain then() would leave registrationQueue rejected forever
	// after one throw, deadlocking every subsequent mutation.
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

**Các bước có neo đã kiểm.**

1. **Tạo `src/utils/file-mutation-queue.ts`** — dán nguyên văn khối trên. `packages/coding-agent/src/utils/` tồn tại (45 file) và **không có** `index.ts` — import bằng đường dẫn module đầy đủ, không qua barrel. Tiền lệ `Promise.withResolvers`: `src/advisor/runtime.ts:454`. *Điều kiện:* file chỉ có hai import dòng 2-3, không import `@oh-my-pi/*`; không `new Promise`, không `any`, không `ReturnType<>`.
2. **Khoá theo realpath (chi tiết 1/3)** — key = `await realpath(resolve(filePath))`; chỉ fallback về `resolve(filePath)` khi reject với `ENOENT`/`ENOTDIR`; **rethrow mọi lỗi khác** (EACCES, ELOOP…). *Vì sao:* key chỉ dùng `resolve` âm thầm không serialize được hai tiến trình đi tới cùng một file qua symlink hoặc qua một đoạn `..`.
3. **Tuần tự hoá chính việc đăng ký (chi tiết 2/3)** — `let registrationQueue: Promise<void> = Promise.resolve();` ở cấp module; trong `withFileMutationQueue`, `const registration = registrationQueue.then(async () => { … })`, rồi gán `registrationQueue = registration.then(ok, err)`. *Vì sao:* không có bước này, hai lời gọi `realpath` chạy đồng thời có thể cùng đọc một `currentQueue` và cùng nối vào đuôi nó. Dạng hai tham số là **bắt buộc**.
4. **Bàn giao hai pha, KHÔNG phải `tail.then(run)` (chi tiết 3/3)** — bên trong callback đăng ký: `const nextQueue = Promise.withResolvers<void>()`, `const chainedQueue = currentQueue.then(() => nextQueue.promise)`, set map, trả `{ key, currentQueue, chainedQueue, releaseNext }`. *Điều kiện:* `releaseNext()` nằm trong `finally`, **không** phải sau `await fn()`; có kiểm tra danh tính trước khi `delete`. *Vì sao:* `finally` là thứ khiến một mutation **ném lỗi** vẫn nhả khoá — một chuỗi thuần sẽ kẹt key vĩnh viễn. Kiểm tra danh tính chặn một người hoàn tất muộn xoá nhầm một khoá kế nhiệm đã nối vào.
5. **Đi qua seam dùng chung** — neo 1 `file-write-fallback.ts:402`, neo 2 **cùng file `:305`**. Bọc **toàn bộ thân** mỗi hàm. Một chỉnh sửa ở `:402` phủ ba trong bốn tool có mutate:

| call site (đã kiểm) | nội dung dòng | phủ cho |
| --- | --- | --- |
| `src/edit/index.ts:674` | `			await writeFileWithFallback(request.moveTo, request.content);` | đích của `edit` move |
| `src/lsp/writethrough.ts:314` | `	const writeContent = async (value: string) => writeFileWithFallback(dst, value, file);` | `edit` create/update qua `createEditWritethrough`, và `write` qua `src/tools/write.ts:909` |
| `src/lsp/writethrough.ts:74` | `	await writeFileWithFallback(dst, content, file);` (`writethroughNoop`) | đường no-LSP |

**Delete phải đi qua CÙNG hàng đợi với write** — call site: `src/edit/index.ts:645` (op `delete`) và `:675` (op `move`). Vòng `for (const handler of Array.from(fallbackHandlers))` (**`:444-453`**) và `Array.from(deleteFallbackHandlers)` giữ nguyên cấu trúc.

6. **Định tuyến `ast_edit` một cách tường minh** — bọc tại **call site apply `:433`**, không bọc hai dòng `:87`/`:137`. Bọc hai dòng đó sẽ khoá cả preview lẫn apply vì cùng đi qua `runAstEditOnce`, và sẽ buộc phải khoá theo `target.basePath` cho từng target. *Điểm quan trọng work item chưa nói:* ở `:87`/`:137` filesystem đến từ `options.filesystem`, **không** phải từ `urlFilesystem.shellFilesystem()`; hai chỗ gọi `shellFilesystem()` thật là `:291` và `:438`.
7. **Viết 5 test hợp đồng.**
8. **Changelog** — tạo `### Fixed` mới, đặt sau `### Security`.

**Hợp đồng test.** Hợp đồng: mutation lên một file được áp dụng từng cái một; mutation lên các file khác vẫn chồng lấn. Hồi quy ở đây khiến các tiến trình con âm thầm đè hoặc cắt đứt lẫn nhau — người dùng thấy một file mà nội dung không khớp với lần sửa nào, **và không có lỗi nào ở đâu cả**. File `packages/coding-agent/test/tools/file-mutation-queue.test.ts` — `describe("withFileMutationQueue")`, 5 `it`.

| # | Test | Nếu hồi quy, người tiêu dùng thấy | Đỏ với lỗi nào |
| --- | --- | --- | --- |
| 1 | `serializes mutations for the same path` | Nội dung file là phần còn sót của lần ghi sau đè lên lần ghi trước, byte bị cắt. Assert thứ tự quan sát được **tuyệt đối không chồng nhau** | thiếu serialize theo key |
| 2 | `runs mutations for different paths concurrently` | Đây là assertion giữ cho Map được khoá trung thực. Một hàng đợi toàn cục là hồi quy hiệu năng đeo mặt nạc thành bản sửa lỗi | khoá toàn cục |
| 3 | `shares one queue between a symlink and its target` | Cái mà key theo realpath mua được và key chỉ dùng `resolve` âm thầm bỏ sót. Fixture: `writeFile(target)` + `symlink(target, alias)` trong tmpdir | key chỉ dùng `resolve` |
| 4 | `does not throw for a path that does not exist yet` | Write vào một đường dẫn mới sẽ ném `ENOENT` và thay vì tạo file lại làm hỏng tool `write` mới | thiếu nhánh fallback ENOENT/ENOTDIR |
| 5 | `chains two registrations made while the first key is still resolving` | Hai mutation đến trong lúc cái thứ nhất **vẫn đang resolve key** nối chuỗi, chứ không cùng đọc một predecessor và cùng chạy song song | bỏ `registrationQueue` |

Cách dựng test 5 cho **thật sự** đỏ khi bỏ `registrationQueue` (monkey-free): gọi `withFileMutationQueue` cho một path **chưa tồn tại** để buộc `realpath` phải reject → nhánh fallback. Bản tham chiếu đọc được: `$HOME/Projects/pi-ref/packages/coding-agent/test/file-mutation-queue.test.ts` (274 LOC); block `describe("withFileMutationQueue")` (dòng 34-93, 3 test) **port trực tiếp được** sau khi đổi `vitest` → `bun:test` và `delay` → `Bun.sleep`.

**Ngoài phạm vi — ghi vào PR, không test ở đây.** `edit` đọc pre-image tại `src/edit/index.ts:711` và so sánh **sau khi** ghi ở `:728-745`. ⇒ **Hàng đợi chặn được interleaving và byte-tearing, KHÔNG chặn được lost update.**

**Cổng có đỏ được không.**

1. **Kiểu + format (bắt buộc xanh)** — `bun run check:ts`. `package.json:90` = `check:tools && … check:types`; `check:tools` (`:91`) = `oxlint . && oxfmt --check …`. **CẤM `tsc`/`npx tsc`;** cũng **đừng** dùng `bun run check` (`:89` kéo cargo). **Cổng này CÓ đỏ được, và đã quan sát xanh tại baseline**: `All matched files use the correct format. Finished in 879ms on 5445 files using 10 threads. … 16/16 package Done …`. Nhiễu có sẵn, **không phải** lỗi của bạn: `test/mcp-project-config-not-trusted-by-default.test.ts:19:10: warning eslint(no-unused-vars)` — đây là `warning`, không làm cổng đỏ.
2. **Hành vi (phải 5 pass / 0 fail)** — `bun test packages/coding-agent/test/tools/file-mutation-queue.test.ts`. **Không cần build native addon** (đã build sẵn: `bun -e 'const m = await import("@oh-my-pi/pi-natives"); …'` → `128`; module mới chỉ import `node:fs/promises` + `node:path`). **Cổng này CÓ đỏ được, theo đúng 5 đường lỗi độc lập** — mỗi test bắt một lỗi khác nhau, nên năm test xanh **không** chứng minh cả năm chi tiết. Nếu test **treo** (không bao giờ kết thúc) thay vì đỏ: đó là khoá kẹt — thường do `releaseNext()` nằm ngoài `finally`, hoặc `registrationQueue` bị để lại ở trạng thái rejected.
3. **Phủ `ast_edit` (không phải hành vi, là phủ suy diễn)** — `git grep -c writeFileWithFallback packages/coding-agent/src/tools/ast-edit.ts` phải trả `0`. Nó **không** chứng minh `ast_edit` đã được bảo vệ — chỉ chứng minh bạn chưa làm hỏng điều kiện tiên quyết của bước 6.
4. **Vệ sinh** — `git status --porcelain packages/coding-agent/` đúng 5 path: 3 sửa + 2 tạo. Nhiều hơn ⇒ bạn đã đụng ngoài phạm vi.

**Cạm bẫy riêng của mục này.**

**Bẫy 1 — Tái nhập. Đây là bẫy chết người, không phải bẫy phong cách.** Bọc `writeFileWithFallback` (`:402`) đặt khoá quanh **toàn bộ** vòng lặp fallback-handler (`:444-453`), vốn gọi các handler do extension đăng ký qua `addFileWriteFallback` — được nối tại `src/extensibility/extensions/runner.ts:782`. Extension API là public surface, không thể kiểm chứng toàn bộ handler ngoài repo. Nếu bạn cảm thấy không an toàn, hãy **ghi rõ trong PR** rằng hàng đợi không tái nhập và một extension gọi ngược sẽ treo — đừng âm thầm nuốt.

**Bẫy 2 — `registrationQueue` dạng một tham số.** `.then(() => undefined)` để lại chuỗi ở trạng thái rejected vĩnh viễn. Một lần `realpath` throw EACCES là **deadlock toàn bộ mutation của cả tiến trình**, không riêng file đó. Bắt buộc hai tham số.

**Bẫy 3 — Bọc nhầm `:87`/`:137` trong `ast-edit.ts`.** Đây là cái work item chỉ đúng một nửa.

**Bẫy 4 — Tự nhận là đã chặn cả lost-update.** Nếu claim "concurrent edits no longer clobber" mà không nói rõ phạm vi, một reviewer sẽ dựng đúng repro lost-update lên bạn trong 5 phút.

**Bẫy 5 — Tin `bun check` hoặc tin phần mở đầu "đã kiểm chứng".** Work item dùng từ "đã kiểm chứng" cho cả những thứ đã lệch. Bản tham chiếu pi bọc hàng đợi quanh **thân TOOL** (`core/tools/edit.ts:163`, `core/tools/write.ts:67`), **không** phải quanh hàm fallback.

**Bẫy 6 — Tưởng `concurrency = "exclusive"` đã phủ việc này.** Cả `EditTool` (`src/edit/index.ts:328`) và `WriteTool` (`src/tools/write.ts:441`) đều khai báo nó, nhưng nó **không** phủ được đường này.

Hai mục có sẵn work item không nhắc: `$HOME/Projects/pi-ref/.../file-mutation-queue.test.ts` — 274 LOC, có thật (block 34-93 là bản mẫu trực tiếp cho 3 test); và `senpi-ref` là **mirror của `pi-ref`**, không phải nguồn độc lập — đừng đếm là hai xác nhận. 5 cây tham chiếu còn lại (`deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref`) **không** có `file-mutation-queue*` nào.

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

**Cổng này có thể đỏ không?** Về mặt thiết kế thì có — cả ba điều kiện đều có thể đỏ. Điều kiện tiên quyết duy nhất là native addon: trên máy **chưa build**, `bun test packages/coding-agent/test/rpc-output.test.ts` trả `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` tại `packages/natives/native/index.js:23:24`, tức `bun test` báo đỏ bất kể code đúng hay sai và cổng này là TRONG (vacuous). Nhưng đây là **thiếu một bước build**, không phải hạn chế của máy: `brew install ninja` rồi `bun run build:native` một lần (exit 0) là cả ba điều kiện chạy được. Điều kiện A thì không cần addon và đã xác minh PASS ở mọi thời điểm. Nếu bỏ qua bước build thì coi W13 là **CHƯA xác minh**, không phải là xanh.

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
| Kế hoạch (`:1730`): lệnh xác minh là `bun check && bun test packages/coding-agent/test/stdout-guard.test.ts && bun run test`. | **Sai một nửa** — `bun check` không dùng được ở đây. | `bun check` ở package.json gốc là `bun run --parallel check:ts check:rs` — nó KÉO CẢ RUST TOOLCHAIN, không liên quan gì tới thay đổi TS này. Dùng `bun run check:ts`. Đã chạy thử: PASS trong ~35s, KHÔNG cần native addon. Còn `bun test` thì **cần** native addon: trên máy chưa build, `bun test packages/coding-agent/test/rpc-output.test.ts` → `0 pass / 1 fail / 1 error`, `Failed to load pi_natives native addon for darwin-arm64`. Nghĩa là cổng của W13 cần `brew install ninja` rồi `bun run build:native` một lần trước — sau đó nó chạy bình thường. |
| Kế hoạch (`:1691-1694`): "omp đã ship `test/otel-export-probe.ts` và `otel-non-otlp-probe.ts` — đó là bằng chứng loại bug này đã nổi lên ở đây một lần rồi". | **Có một nửa đúng, một nửa suy diễn quá.** | Bốn file probe ĐÚNG tồn tại (`otel-export-probe.ts`, `otel-non-otlp-probe.ts`, `otel-resource-probe.ts`, `otel-signals-probe.ts`) — xác minh. Nhưng chúng là smoke probe khởi động cho OTEL exporter: bằng chứng rằng loại bug "binary/telemetry lẫn vào stdout" đã nổi lên, KHÔNG phải bằng chứng về ENOBUFS. Bằng chứng đúng hơn và mạnh hơn nằm ở chính cây code: `print-mode.ts:130-135` ghi rõ bug mất frame (issue #5309, #7635) và `cli-stdout-epipe.test.ts:6` ghi rõ bug EPIPE (issue #10930). Dùng hai issue id đó trong changelog, đừng dùng probe làm bằng chứng. |
| Mô tả repo trong task: "git HEAD `5873776`, currently on branch `milestone-1`". | **Sai SHA.** | HEAD thật của repo này là `ecd516f` ("feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers"), branch `milestone-1` — branch đúng, SHA thì không. Nội dung các file mà spec này viện dẫn đều tồn tại và đúng như mô tả, nên ảnh hưởng thực tế bằng không; nhưng đừng dùng `5873776` làm mốc khi tra cứu. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W13.md`.

**⛔ Cảnh báo lớn nhất của phiếu: KHÔNG có repro cho retry ENOBUFS. Đã chạy thật.**

Bước 1 của work item tự dựng repro và tự định nghĩa nhánh rẽ: *"Nếu `ENOBUFS`/`EAGAIN`/`EWOULDBLOCK` không xuất hiện ở CẢ error event LẪN sync throw, thì câu hỏi mở #2 đã trả lời: phần retry không có repro — chỉ ship phần gom về một chỗ."* **Phiếu đã chạy nhánh đó. Đáp án: KHÔNG có repro. Cả trên Bun lẫn Node.**

Probe (3 lần mỗi runtime, child ghi 64 MB vào stdout pipe, parent `pause()` reader và không đọc, gắn `error` listener lên cả child lẫn `child.stdout`):
- **Bun** (đúng runtime omp ship): callback ghi **có chạy**, với `err === null`. Bun buffer trong userspace rồi báo thành công. Không error event, không mã lỗi, không throw đồng bộ. 3/3.
- **Node v26.3.0**: callback ghi **không bao giờ chạy**, process sống, không error event. 3/3.

Hệ quả theo từng dòng của hình dạng code trong work item:

| Dòng trong work item | Thực tế |
| --- | --- |
| `isRetryable(err)` đọc `err.code` | Không bao giờ có `err` để đọc. Trên Bun `err` là `null`; trên Node callback không gọi. |
| `retryLoop` / `MAX_ATTEMPTS = 500` | **Dead code.** Không có đường vào. |
| `if (!isRetryable(err) \|\| attempt >= MAX_ATTEMPTS) throw err` | Không bao giờ chạy — "assertion dễ bị bỏ sót nhất" trong work item, và nó **vô nghĩa**. |
| Hợp đồng test (1) `'retries a write that fails once with ENOBUFS…'` | Test xanh, chứng minh một nhánh không tồn tại — đúng loại AGENTS.md cấm. |
| Hợp đồng test (2) `'spreads a non-retryable write failure…'` | Cùng vấn đề: `EPERM` cũng không tới được qua callback. |

**Failure mode thật của một reader bị treo KHÔNG phải "mã lỗi sai" — nó là promise không bao giờ settle.** Trên Node, `writeStdoutLine` (`print-mode.ts:138-147`) tạo ra một promise treo vĩnh viễn, `stdoutTail` không bao giờ settle, và drain fence `await stdoutTail;` tại `print-mode.ts:348` **treo vĩnh viễn**. `MAX_ATTEMPTS` không sửa được, vì không có lỗi nào để bắt. ⇒ **Deliverable đúng của W13: chỉ phần GOM về một chỗ. KHÔNG có vòng lặp retry.**

**⛔ Chặn cứng thứ hai.** Dòng changelog work item bắt dán — `Fixed structured stdout output being truncated or dropped when a client stops reading (issue #7635)` — **không được dán.** Không có gì được sửa; hành vi `#7635` đã được `print-mode-json-flush.test.ts:94` bảo vệ và đã đúng từ trước. Dán dòng đó là một tuyên bố với người dùng về một bug đã không còn. Ba lựa chọn trung thực: **(1) Không thêm changelog (khuyến nghị)** — refactor thuần, người dùng không thấy gì; **(2)** ghi dưới `### Changed`: `Changed structured stdout handling to route every mode through one shared guard.`; **(3)** chỉ khi tìm được repro cắt dòng **thật** mới viết `### Fixed`, với issue id của repro đó — không phải #7635, không phải #10930.

**⛔ Chặn cứng thứ ba.** Nếu sau khi gom xong vẫn muốn xử lý "reader treo ⇒ treo vĩnh viễn", thứ cần là **deadline trên fence**, không phải retry theo mã lỗi: `flushRawStdout()` phải race `Promise.race([#tail, Bun.sleep(DEADLINE_MS)])`, và khi hết hạn thì log + đi tiếp. Đó là một work item riêng, có repro riêng, **không nằm trong W13**.

**Cảnh báo neo.** 11 neo trong work item không khớp cây thật:

| # | Work item ghi | Thực tế | Ảnh hưởng |
| --- | --- | --- | --- |
| 1 | `acp-mode.ts:43-63` = `isolateProtocolStdout` | `:43-61`. Dòng 62 trống, 63 là `formatConsoleArgs` | Xoá 2 dòng quá → cắt đầu hàm kế |
| 2 | `acp-mode.ts:65-72` = `formatConsoleArgs` | `:63-71` | Copy nhầm 2 dòng lệch |
| 3 | "Giữ nguyên comment tại `:44-52`" | Comment là `:44-48`; `:49-52` là code. Thêm nữa có comment thứ hai ở `:56-57` mà work item **không nhắc** | Bỏ sót comment `:56-57` = mất giải thích |
| 4 | `print-mode.ts:130-135` = comment | Comment là `:131-136`; dòng 130 trống | Lệch 1 dòng |
| 5 | "Giữ nguyên comment tại `:130-135` — nó nhắc issue #5309/#7635" | Đúng nội dung, nhưng work item **không nhắc** comment thứ hai ở `:345-347` giải thích drain fence | Dễ xoá nhầm comment |
| 6 | `CHANGELOG.md:3` — "`## [Unreleased]` … **hiện đang rỗng**" | Dòng 3 đúng là `## [Unreleased]`, nhưng nó **không rỗng**: có `### Security` ở dòng 5 và 1 entry ở dòng 7 | Dán thẳng sẽ đặt sai chỗ |
| 7 | `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:1680-1743` = "work item" W13 | Dải đó là work item **approval mode / bash critical patterns** | trích dẫn nhầm |
| 8 | "`ls -d pi-ref` → không có; `find . -name 'output-guard*'` → rỗng. **Viết tay từ đầu.**" | **SAI.** Cả hai tồn tại: `/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/co…` | có bản tham chiếu thật |
| 9 | Mọi `:1691-1693`, `:1699-1702`, `:1707-1708`, `:1719-1724`, `:1730`, `:1691-1694` trong bảng "Đính chính" | Trỏ vào work item approval, không phải W13 | Bảng đính chính tự trích dẫn sai |
| 10 | "HEAD thật của repo này là `ecd516f`" | HEAD hôm nay là **`65cc6c1`** | Mốc tra cứu sai |
| 11 | "**Cổng HIỆN KHÔNG CHẠY ĐƯỢC**… native addon chưa build" | Đã build. `bun test rpc-output.test.ts` → **5 pass / 0 fail**; 4 file hồi quy → **8 pass / 0 fail** | Đánh giá nhầm W13 là không thể kiểm |

**Sai lệch hình dạng giữa `pi-ref/output-guard.ts` thật và bản work item vẽ ra.** Nếu bạn vẫn muốn tham chiếu file 108 dòng, **đừng port trực tiếp** — 6 chỗ khác: `takeOverStdout(): void` (dòng 45) vs `: NodeJS.WriteStream`; `restoreStdout()` là export riêng (dòng 72) vs undo qua module state `#undoTakeover`; monkey-patch `process.stdout.write` (54-63) vs `Object.defineProperty(process, "stdout", …)`; `writeRawStdout(text): void` + `process.exit(1)` khi lỗi (85-93) vs `: Promise<void>`; `writeRawStdoutChunk` có `while (true)` **không chặn trên** (21-43) vs `MAX_ATTEMPTS = 500`; `new Promise` + `setTimeout` (23, 40) vs `Promise.withResolvers()` + `Bun.sleep`. Hai cơ chế takeover khác nhau về hệ quả: `pi-ref` chặn ở **tầng `write`**, còn `acp-mode.ts:55` chặn ở **tầng `process.stdout`**. Call site duy nhất trong cây là `acp-mode.ts:89`, nên lấy cơ chế của `acp-mode.ts` là an toàn hơn.

**Neo ĐÚNG, dùng được:** `acp-mode.ts:43`, `:89`, `:1-2`, `:2`, `:5-6`, `:50`, `:90`; `print-mode.ts:137`, `:138`, `:153`, `:228`, `:324`, `:326`, `:348`; `rpc-output.ts:17-162` (162 dòng, có `drain`/`error`/`close`/`process.once("exit")`); `rpc-mode.ts:780`; `postmortem.ts:356`; `acp-stdout-hygiene.test.ts:86` (191 dòng, 1 test); `print-mode-json-flush.test.ts:94` (153 dòng, 1 test), `:98`, `:15`; `rpc-output.test.ts:13,72,107,121,137`; `cli-stdout-epipe.test.ts:6` và `:21`; `package.json:84` (`build:native`), `:85` (`test`), `:89` (`check`), `:90-91`; `packages/coding-agent/package.json:523`; các số đếm `process.stdout.write` (31 / 7 / 6 / 1 / 1 / 34 / 29 / 274) — **đều đúng**; 4 file probe OTEL; `src/utils/` 45 file; `test/` 843 mục; `src/utils/stdout-guard.ts` và `test/stdout-guard.test.ts` **không tồn tại** (đúng như work item nói).

**Bảng điểm sửa.** Tất cả văn bản "TRƯỚC" dưới đây trích từ file thật tại HEAD `65cc6c1`.

| đường/dẫn | symbol | TRƯỚC (nguyên văn từ file) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:2` | import `inspect` | `import { inspect } from "node:util";` | **xoá hẳn** — `inspect` chỉ dùng ở `formatConsoleArgs` (dòng 68), sau khi hàm đó đi |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:43-61` | `isolateProtocolStdout` | `function isolateProtocolStdout(): NodeJS.WriteStream {` … `return protocolStdout;` `}` (19 dòng) | **xoá hẳn**; thay bằng `takeOverStdout()` |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:63-71` | `formatConsoleArgs` | `function formatConsoleArgs(args: unknown[]): string {` … `}` (9 dòng) | **xoá khỏi đây**, chuyển **nguyên văn** sang `stdout-guard.ts` |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:40-42, 44-48, 56-57` | 3 khối comment giải thích | xem bước 3 | **chuyển theo** sang `stdout-guard.ts` cùng thân hàm. Đừng để lại ở `acp-mode.ts` |
| `packages/coding-agent/src/modes/acp/acp-mode.ts:89` | call site trong `runAcpMode` | `const input = stream.Writable.toWeb(isolateProtocolStdout());` | `const input = stream.Writable.toWeb(takeOverStdout());` |
| `packages/coding-agent/src/modes/acp/acp-mode.ts` (mới) | import | — | `import { takeOverStdout } from "../../utils/stdout-guard";` — đặt giữa dòng 6 và 7 |
| `packages/coding-agent/src/modes/print-mode.ts:131-136` | comment 6 dòng | xem bước 4 | **xoá khỏi đây**, dán vào `stdout-guard.ts` ngay trên `writeRawStdout` |
| `packages/coding-agent/src/modes/print-mode.ts:137-147` | `stdoutTail` + `writeStdoutLine` | `let stdoutTail: Promise<void> = Promise.resolve();` … `};` (11 dòng) | **xoá hẳn** |
| `packages/coding-agent/src/modes/print-mode.ts:153` | call site header | `writeStdoutLine(\`${JSON.stringify(header)}\n\`);` | `void writeRawStdout(\`${JSON.stringify(header)}\n\`);` |
| `packages/coding-agent/src/modes/print-mode.ts:228` | call site event | `writeStdoutLine(\`${JSON.stringify(printableEvent(event))}\n\`);` | `void writeRawStdout(\`${JSON.stringify(printableEvent(event))}\n\`);` |
| `packages/coding-agent/src/modes/print-mode.ts:324` | call site text | `writeStdoutLine(\`${sanitizeText(content.text)}\n\`);` | `void writeRawStdout(\`${sanitizeText(content.text)}\n\`);` |
| `packages/coding-agent/src/modes/print-mode.ts:326` | call site thinking | `writeStdoutLine(\`${sanitizeText(content.thinking)}\n\`);` | `void writeRawStdout(\`${sanitizeText(content.thinking)}\n\`);` |
| `packages/coding-agent/src/modes/print-mode.ts:345-348` | comment 3 dòng + drain fence | `await stdoutTail;` | comment 345-347 **giữ nguyên tại chỗ**; dòng 348 → `await flushRawStdout();` |
| `packages/coding-agent/src/modes/print-mode.ts` (mới) | import | — | `import { flushRawStdout, writeRawStdout } from "../utils/stdout-guard";` — đặt sau dòng 16 |
| `packages/coding-agent/src/utils/stdout-guard.ts` | **tạo mới** | file không tồn tại | 4 export: `isStdoutTakenOver()`, `takeOverStdout()`, `writeRawStdout()`, `flushRawStdout()`. **KHÔNG retry loop** |
| `packages/coding-agent/test/stdout-guard.test.ts` | **tạo mới** | file không tồn tại | **1** test (xem hợp đồng test) |
| `packages/coding-agent/CHANGELOG.md` | `### Fixed` | `[Unreleased]` đang có `### Security` ở dòng 5 và 1 entry ở dòng 7 | Theo chặn cứng thứ hai: hoặc không thêm gì, hoặc `### Changed` sau dòng 7 |
| `packages/coding-agent/src/modes/rpc/rpc-output.ts` | `RpcOutputWriter` | 162 dòng | **không đụng** |

**Các bước có neo đã kiểm.**

1. **Xác nhận lại nhánh "không retry"** — phiếu đã chạy probe 3×3 trên Bun và Node; kết luận: **không có `retryLoop`**.
2. **Tạo `packages/coding-agent/src/utils/stdout-guard.ts`** — 4 export ở bảng điểm sửa, không retry loop. `src/utils/` tồn tại (45 file).
3. **Thay `isolateProtocolStdout()` bằng `takeOverStdout()`** — chuyển theo **3 khối comment** (`:40-42`, `:44-48`, `:56-57`) cùng `formatConsoleArgs` nguyên văn; xoá `import { inspect }` (bắt buộc — AGENTS.md cấm import chết và `oxlint` báo `no-unused-vars`).
4. **Cho print-mode dùng chung** — chuyển comment 6 dòng (`:131-136`) sang `stdout-guard.ts` ngay trên `writeRawStdout`; đổi 4 call site (`:153`, `:228`, `:324`, `:326`) sang `void writeRawStdout(...)`; đổi drain fence `:348` sang `await flushRawStdout();` và **giữ nguyên** comment 345-347 tại chỗ.
5. **Đừng đụng `rpc-output.ts`**.
6. **Viết `packages/coding-agent/test/stdout-guard.test.ts`** — **MỘT test, không phải ba.**
7. **Cổng** — xem mục cổng.

**Hợp đồng test.** `packages/coding-agent/test/stdout-guard.test.ts` — **MỘT test.** Import `import { afterEach, describe, expect, it, vi } from "bun:test";` (mẫu từ `print-mode-json-flush.test.ts:15`).

**Test duy nhất — `'takeOverStdout returns an undo that restores process.stdout and console.log'`.** Lưu `const original = process.stdout;` và `const originalLog = console.log;`, gọi `takeOverStdout()`, assert `isStdoutTakenOver()` là `true` và `process.stdout` **khác identity**, rồi gọi undo, assert `process.stdout` và `console.log` trở lại **đúng identity gốc** và `isStdoutTakenOver()` là `false`. `afterEach(() => { vi.restoreAllMocks(); })`, và gọi undo trong `afterEach` nếu test nào takeover còn treo. Tuyệt đối không `Object.defineProperty(process, 'stdout', …)`, không `mock.module()`, không mutate `process.*` ở cấp file.

**Nếu hồi quy:** takeover rò rỉ ⇒ mọi stdout write sau đó bám vào stderr, và phần còn lại của suite im lặng mất output mà **không dòng nào đỏ**. Đây là consumer thật: **mọi file test chạy sau trong cùng run**.

**Hai test còn lại trong work item — đã bỏ, và vì sao:** `'retries a write that fails once with ENOBUFS and delivers the frame in full'` → **BỎ** (`ENOBUFS` không tới được; test sẽ xanh và chứng minh một nhánh không tồn tại); `'spreads a non-retryable write failure instead of retrying forever'` → **BỎ** (cùng lý do cho `EPERM`; và sau khi bỏ retry loop thì hàm viết không còn nhánh "retry forever" để bảo vệ — test bảo vệ một thứ vừa bị xoá).

**Không viết lại những test này:** `'stray console.log đi tới stderr'` đã có ở `acp-stdout-hygiene.test.ts:86`; `'drain fence resolve sau tail'` đã có ở `print-mode-json-flush.test.ts:94`. **Giữ nguyên.** Đây chính là test bằng chứng cho **bước 4** (print-mode), không phải cho bước 2.

**Phải xanh sau khi sửa:** `acp-stdout-hygiene.test.ts` (1) · `print-mode-json-flush.test.ts` (1) · `rpc-output.test.ts` (5, tại `:13` `:72` `:107` `:121` `:137`) · `cli-stdout-epipe.test.ts` (1). **Tổng 8 — đã đo 8 pass / 0 fail trước khi sửa.**

**Cổng có đỏ được không.**

```bash
bun run check:ts

bun test packages/coding-agent/test/stdout-guard.test.ts

bun test \
  packages/coding-agent/test/acp-stdout-hygiene.test.ts \
  packages/coding-agent/test/print-mode-json-flush.test.ts \
  packages/coding-agent/test/rpc-output.test.ts \
  packages/coding-agent/test/cli-stdout-epipe.test.ts

bun run test
```

Không bao giờ dùng `tsc` — AGENTS.md cấm. **CÓ, cả ba, và ngay bây giờ.** Đính chính quan trọng so với work item: nó nói cổng *"HIỆN KHÔNG CHẠY ĐƯỢC"* vì native addon chưa build — **điều đó đã không còn đúng**, addon đã build (`packages/natives/native/.build/` tồn tại).

| Cổng | Trạng thái đo được hôm nay | Đỏ được bằng cách nào |
| --- | --- | --- |
| **A.** `bun run check:ts` | **PASS** (~90s). `oxlint` chỉ có 1 warning có sẵn ở `mcp-project-config-not-trusted-by-default.test.ts:19`; `oxfmt --check` "All matched files use the correct format"; 16 package `check:types` đều Done | — |
| **B.** 4 file hồi quy | **8 pass / 0 fail / 33 expect()** (9.16s) | Bước 3 phá ACP hygiene (suy ra `stream` import chết, hoặc takeover không còn detour console) hoặc bước 4 phá drain fence #7635. |
| **B′.** file test mới | 1 test, chưa tồn tại | Undo không khôi phục đúng identity, hoặc takeover rò giữa các test trong file. |
| **C.** `bun run test` toàn suite | **CHƯA CHẠY** (quá dài cho phiếu này) | Takeover rò ⇒ stdout của các file chạy sau bám vào stderr, không dòng nào đỏ. |

**B không đủ.** 4 file hồi quy đó có thể xanh trong khi một file thứ 6 chạy sau nhận stdout đã bị rebind. **Chỉ C chứng minh được takeover không rò.** Nếu thời gian không cho chạy full suite thì **ghi rõ W13 là CHƯA xác minh** ở PR, đừng báo xanh.

**Cạm bẫy riêng của mục này.**

1. **`void` trên promise không nuốt rejection.** Ở 4 call site của print-mode: nếu write reject (pipe đã đóng), đó là **unhandled rejection** — Bun test sẽ đỏ cả file, production sẽ in `[Uncaught Exception]`. `writeStdoutLine` cũ trả `void` nhưng promise của nó **luôn được ai đó await** (chính là `await stdoutTail` ở `:348`). Sau khi tách ra module-level `#tail`, không còn gì await từng write. Phải tự xử lý: hoặc `writeRawStdout` tự nuốt lỗi và ghi vào `#failure` để `flushRawStdout()` rethrow một lần, hoặc giữ `void` nhưng phải chắc `#tail` luôn resolve. **Đừng chỉ copy `void` từ work item.**
2. **`#tail` bị đầu độc vĩnh viễn sau một lần reject.** `#tail = #tail.then(...)` — nếu `#tail` reject một lần thì mọi `.then` sau đó đều bị bỏ qua và lỗi cũ lan xuống mọi lần ghi về sau. Ở bước 2 nó trở thành **module-level state** nên sống lâu hơn nhiều: một test file gọi `writeRawStdout` và để reject sẽ làm hỏng mọi test sau trong cùng run. Cần nuốt lỗi ngay tại chỗ gán và để `flushRawStdout()` rethrow đúng một lần.
3. **Takeover không tự thu hồi, và `takeOverStdout()` ném nếu gọi hai lần.** Hôm nay chưa có lần gọi thứ hai nào (`runAcpMode` chỉ được gọi từ `main.ts:2200-2202`, và `acp-lazy-startup.test.ts` mock nó), nhưng đó là **tương lai**, không phải bảo đảm.
4. **`print-mode.ts` chạy SAU takeover trong cùng process sẽ ghi vào stderr.** Mọi output của print-mode đi thẳng vào stderr và **không test nào đỏ**. Đây là lý do gate C (full suite) tồn tại, và cũng là lý do `afterEach` trong test mới phải gọi undo.
5. **`check:ts` kiểm CẢ format, không chỉ types.** File mới dùng **tab, tabWidth 3, printWidth 120, double quotes, trailing comma, semi, arrow parens avoid** (`.oxfmtrc.json`). Copy bằng cách **paste** nguyên text trong file cũ, đừng gõ lại.
6. **Xoá `import { inspect }` là bắt buộc, không phải tuỳ chọn.**
7. **Đừng để lại comment ở chỗ cũ.** Comment ở `acp-mode.ts:40-48` và `print-mode.ts:131-136` là tài liệu về lý do. Nếu bạn xoá hàm mà comment ở lại, người đọc sau thấy comment giải thích một hàm không còn. **Chuyển theo, đừng xoá và đừng bỏ lại.**

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

Hai phần, và phải chạy cả hai. (1) `bun run check:ts` — ở HEAD hiện đang pass (đo được: cả 15 package `Done`, không lỗi), nên bất kỳ lỗi type nào do thay đổi này tạo ra sẽ làm nó đỏ. (2) `bun --cwd=packages/natives run build && bun test packages/coding-agent/test/tools/powershell.test.ts` — file test phải báo 0 fail. Bước build là bắt buộc, không phải tuỳ chọn: ở trạng thái **chưa build** addon, bất kỳ test nào có module graph chạm tới `@oh-my-pi/pi-natives` đều **không LOAD được**. Điều này là đo được, không phải phỏng đoán: `bun test packages/coding-agent/test/tools/` cho 145 pass / 177 fail / 174 errors trên 322 tests, và mọi lỗi đều là lỗi `Failed to load pi_natives native addon for darwin-arm64`; sau `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần thì cả 322 test chạy. Lưu ý `packages/coding-agent/src/tools/bash.ts:19` import `@oh-my-pi/pi-utils/procmgr`, mà dòng 3 của nó import `@oh-my-pi/pi-natives` — nên một test import tool (chứ không chỉ helper thuần) cần addon, còn test chỉ import helper thuần thì không. Cổng còn kèm một kiểm tra phạm vi diff: `git diff --stat` phải hiện đúng hai file production (`bash-executor.ts`, `bash.ts`) cộng helper mới và test — có file production thứ ba nghĩa là đường shell nhúng đã bị sửa, và điều đó tuyệt đối không được xảy ra.

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
| Task brief: *"the native addon is not built, so `bun test` currently reports 0 pass with 'Failed to load pi_natives native addon for darwin-arm64'"* | **IMPRECISE** — addon đúng là cần thiết, nhưng chặn là **chọn lọc theo bề mặt import**, không phải toàn cục | Ở trạng thái chưa build addon, `bun run check:ts` thực sự pass còn `bun test` thì fail **lúc LOAD** ở bất kỳ test nào có module graph chạm tới `@oh-my-pi/pi-natives` — đo được: `bun test packages/coding-agent/test/tools/` → 145 pass / 177 fail / 174 errors trên 322 tests, mọi lỗi cùng là `Failed to load pi_natives native addon for darwin-arm64`; các test không chạm natives thì vẫn xanh. Vì `tools/bash.ts:19` → `procmgr.ts:3` → natives, một test import tool cần addon. Đây là **tiền đề tái lập được**: `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là toàn bộ 322 test chạy. Đó là lý do cổng nêu rõ bước build thay vì coi `bun test` là dùng được sẵn. |
| omp đã có sẵn đường ống PowerShell trong shell layer, hàm ý chỉ thiếu một tool mỏng (plan dòng 1751-1755 và 1785-1787) | **PARTIALLY TRUE**, và đó là nửa hữu ích | `procmgr` của omp **đã** mô hình hoá PowerShell: `isPowerShell` (dòng 71) nhận powershell/powershell.exe/pwsh/pwsh.exe, và `getShellArgs` (dòng 53) đã trả về `-NoLogo -Command` cho nó. Nên người dùng đã có thể cấu hình `shellPath: pwsh` và nhận đúng spawn args. Cái thiếu duy nhất là encoding guard — và vì thế W14a là ~30 dòng chứ không phải refactor. omp cũng đã biết idiom encoding này: `utils/clipboard.ts:270` đặt `[Console]::OutputEncoding = [Text.Encoding]::UTF8` (không có try/catch, trong một script `$ErrorActionPreference='Stop'` — bối cảnh khác, nên không phải phản ví dụ với yêu cầu try/catch của plan, nhưng là prior art của pattern). |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W14.md`.

**Cảnh báo neo.** Nguyên văn từ phiếu:

> 26 dòng kiểm (23 neo của work item + 3 dòng plan nhắc gián tiếp). **19 đúng, 7 sai.**

| Neo trong work item | Dòng thật | Kết luận |
| --- | --- | --- |
| `src/exec/bash-executor.ts:17` (import procmgr) | **16** | **SAI** — dòng 17 là `import { Settings } from "../config/settings";` |
| `src/tools/bash.ts:38` (import prompt `.md`) | **26** | **SAI** — dòng 38 là `import { resolveCliEntryCmd } from "../subprocess/worker-client";` |
| `utils/src/procmgr.ts:71` (`isPowerShell`) | **73** | **SAI** — dòng 71 là text trong JSDoc của chính nó |
| `tools/index.ts:554` (`BUILTIN_TOOLS`) | **561** | **SAI** — dòng 554 là `}` đóng một interface phía trên |
| `tools/index.ts:557` (`bash: s => new BashTool(s)`) | **564** | **SAI** — dòng 557 là mở JSDoc `/**` |
| `COMPREHENSIVE_PLAN…:3072-3080 (P3)` | — | **SAI** — là 3 dòng bảng file của **W13** (print-mode / rpc-output) |
| `COMPREHENSIVE_PLAN…:1746-1748` | — | **SAI** — là comment `// Negative guard:` trong phần test của W4 (approval) |
| `tools/index.ts` "File 966 dòng" | **973** | **SAI** (`wc -l`) |
| bảng Đính chính: pi-ref `ReturnType<>` "dòng 49 và 56" | **52 và 59** | **SAI** |
| `profile-alias.ts:5,11,19,33` | đúng dòng, **sai path** | file ở `src/cli/profile-alias.ts`, không phải `src/tools/` |

**Hai neo đáng lo nhất**, vì chúng là neo của bước 1 — bước duy nhất W14a bắt buộc làm trước khi viết dòng code nào: **câu hỏi mở 4a không nằm ở 3072-3080 và không nằm ở 1746-1748** — nó nằm ở `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4769` (bảng "Cần người quyết") và `:4817`. Và **`bash.ts:38` không phải chỗ import prompt**; chỗ đúng là `bash.ts:26` — kỹ sư đi tìm dòng 38 sẽ không thấy `.md` nào và sẽ tưởng mình đang ở sai repo.

Các neo **đúng**: `bash-executor.ts:379`, `:531-534`, `:33-67`, `:485-490`, `:1-5`; `bash.ts:163-168` (phạm vi 163–168), `:1239`, `:19`, `:22`, `:473`/`:474`/`:484`/`:567`; `procmgr.ts:53`, `:3`, `:81`; `utils/clipboard.ts:231`, `:290`, `:270`; `tools/builtin-names.ts:1`/`:3`/68 dòng.

**Bảng điểm sửa.** TRƯỚC trích nguyên văn từ file thật tại HEAD `65cc6c1` (tab hiển thị thành `\t`).

| Đường/dẫn | Symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/exec/powershell-encoding.ts` | `POWERSHELL_UTF8_PREFIX`, `withPowerShellUtf8Output` | *(file mới — không tồn tại)* | file mới ~20 dòng, xem bước 2 |
| `packages/coding-agent/src/exec/bash-executor.ts:16` | import `@oh-my-pi/pi-utils/procmgr` | `import { isCmdShell, isExecutable, type ShellConfig } from "@oh-my-pi/pi-utils/procmgr";` | **giữ nguyên — KHÔNG thêm `isPowerShell`** (xem T4) |
| `packages/coding-agent/src/exec/bash-executor.ts:379-380` | `buildUserShellCommand` | `function buildUserShellCommand(shell: string, args: string[], command: string): string {`<br>`\treturn …` | thêm `const guarded = withPowerShellUtf8Output(command, shell);` **trước** `.map(quoteShellArg)` |
| `packages/coding-agent/src/exec/bash-executor.ts` (import mới) | — | — | thêm `import { withPowerShellUtf8Output } from "./powershell-encoding";` ngay cạnh `import { loadDirenvEnv } from "./direnv";` (dòng 23) |
| `packages/coding-agent/src/tools/bash.ts:163-168` | `wrapShellLineForClientTerminal` | `export function wrapShellLineForClientTerminal(`<br>`\tline: string,`<br>`\tshellConfig: { shell: string; args: string[]; prefix?: string \| undefined },`<br>`): { command: string; args: string[] } {`<br>`\tconst finalLine = …` | thêm `const guarded = withPowerShellUtf8Output(line, shellConfig.shell);` và dùng nó trong `finalLine`; **chữ ký không đổi** |
| `packages/coding-agent/src/tools/bash.ts:19` | import `@oh-my-pi/pi-utils/procmgr` | `import { isPosixShell } from "@oh-my-pi/pi-utils/procmgr";` | giữ nguyên |
| `packages/coding-agent/test/tools/powershell.test.ts` | 3 test | *(file mới — không tồn tại)* | xem hợp đồng test |

**W14b (KHÔNG làm ở phiếu này, chỉ ghi để khỏi tìm nhầm):** `tools/builtin-names.ts:1-32` (`BUILTIN_TOOL_NAMES`, `"bash",` ở dòng 3) → thêm `"powershell",`; `tools/index.ts:561` (`export const BUILTIN_TOOLS: Record<BuiltinToolName, ToolFactory> = {`) không đổi dòng này; `tools/index.ts:564` (`	bash: s => new BashTool(s),`) → thêm `	powershell: s => new PowerShellTool(s),`; `tools/powershell.ts` + `prompts/tools/powershell.md` là file mới.

**Các bước có neo đã kiểm.** Mọi neo dưới đây là dòng đã mở và đọc ở HEAD `65cc6c1`.

0. **(thêm vào, không có trong plan) Chốt câu hỏi phạm vi với người dùng trước**, dùng nguyên văn câu ở `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4769`: *"omp có muốn một tool `powershell` hạng nhất, hay bash-only-trên-Windows là một quyết định phạm vi có chủ ý?"* Ghi nguyên văn câu trả lời vào PR description. **Không** suy từ codebase. Nếu không có câu trả lời, chỉ làm bước 1–4 — item vẫn land.
1. **Tạo `packages/coding-agent/src/exec/powershell-encoding.ts`** (file mới):
```typescript
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
```
`isPowerShell` nằm ở `packages/utils/src/procmgr.ts:73` (không phải `:71`). **Không** viết lại phép so basename — `isPowerShell` là helper trung tâm. Đã chạy thật: `"/bin/bash" false · "/bin/zsh" false · "cmd.exe" false` / `"pwsh" true · "powershell.exe" true · "C:\Program Files\PowerShell\7\pwsh.exe" true`.
2. **Sửa `bash-executor.ts:379-380`** (`buildUserShellCommand`) — thêm import helper cạnh `import { loadDirenvEnv } from "./direnv";` (dòng 23), rồi `const guarded = withPowerShellUtf8Output(command, shell);` và trả `[shell, ...ensureInteractiveShellArgs(shell, args), guarded]`. Caller duy nhất đã xác minh: `bash.ts:379` được gọi đúng một lần, ở dòng 533, chỉ khi `useUserShell === true && !bashShell && !isCmdShell(shell) && !runCdInPersistentShell`.
3. **Sửa `bash.ts:163-168`** (`wrapShellLineForClientTerminal`) — `const guarded = withPowerShellUtf8Output(line, shellConfig.shell);` rồi `const finalLine = shellConfig.prefix ? \`${shellConfig.prefix} ${guarded}\` : guarded;`. Thêm import top-level `import { withPowerShellUtf8Output } from "../exec/powershell-encoding";`. Caller duy nhất đã xác minh: `bash.ts:1239`.
4. **Xác nhận KHÔNG chạm đường brush nhúng.** `executeBash` mặc định (không `useUserShell`) đưa `preflight.command` thẳng vào brush `Shell` — không đi qua `buildUserShellCommand`.

**Hợp đồng test.** File `packages/coding-agent/test/tools/powershell.test.ts` (mới) — dùng **đúng tên này**; bảng "File cần chạm tới" của plan ghi `powershell-encoding.test.ts` nhưng bước 6 và mục Xác minh ghi tên kia. Ba case, mỗi case một nhánh hỏng khác nhau:

1. **NEGATIVE / PRECEDENCE** — `/bin/bash`, `/bin/zsh`, `cmd.exe` → `withPowerShellUtf8Output("ls -la", shell)` trả đúng `"ls -la"`, **nguyên byte**. *Chặn cái gì:* item biến thành con dấu cao su — helper prefix vô điều kiện vẫn pass mọi test PowerShell trong khi phá vỡ mọi lệnh POSIX, vì một câu `try { … } catch {}` là lỗi cú pháp trong POSIX shell.
2. **TRANSFORMATION** — `pwsh`, `powershell.exe`, `C:\Program Files\PowerShell\7\pwsh.exe` → chuỗi phát ra bắt đầu bằng **literal** `try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}`. *Chặn cái gì:* thiếu guard, hoặc `isPowerShell` không nhận ra một trong ba cách viết (cả ba đã chạy thật ở bước 1 và trả `true`).
3. **NON-CATASTROPHIC FAILURE** — lệnh của người dùng **có sẵn `try`/`catch` và ngoặc nhọn của riêng nó**, ví dụ `try { Get-Item x } catch { Write-Host 'no' }`. *Chặn cái gì:* đây là input class mà case 2 không chạm tới; nó bắt được guard nuốt lệnh khi guard được đóng "lười" bằng cách quét ngoặc.

**Nếu hồi quy, người dùng thấy gì:** trên Windows, mọi tool result non-ASCII hiện ra dạng mojibake kiểu `ÄÆá»ç`; ở hướng ngược lại (guard áp nhầm lên shell POSIX), **không có lệnh nào chạy được**.

**Về việc test có cần native addon không: CÓ.** `powershell-encoding.ts` import `@oh-my-pi/pi-utils/procmgr`, mà `procmgr.ts:3` import `@oh-my-pi/pi-natives`.

**Cổng có đỏ được không.**

| Cổng | Đỏ được? | Bằng cách nào |
| --- | --- | --- |
| G1 `bun run check:ts` | **CÓ** | đo pass ở HEAD (15 package `check:types` đều `Done`, exit 0); type/lint/format sai → đỏ. `check:ts` (`package.json:90`) chạy `oxlint . && oxfmt --check …` **trước** khi typecheck — một file mới dánh bằng dấu cách thay vì tab sẽ đỏ cổng này vì lý do không liên quan. |
| G2 `bun test …/powershell.test.ts` | **CÓ** | 3 assertion độc lập (thiếu guard / guard áp nhầm / lệnh bị nuốt); tên file sai cũng đỏ (đo: exit 1). |
| G3 diff phạm vi | **CÓ (sau khi viết lại từ câu văn thành `diff -u`)** | file source thứ ba → `diff` exit 1, tức đường shell nhúng đã bị sửa. Đây là cái đáng đỏ nhất trong ba cái. |
| G4 build addon | **KHÔNG** | và ở máy này còn **không cần** — addon đã build sẵn. |

G3 viết lại thành lệnh (plan viết nó bằng **câu văn** — đó là loại cổng luôn xanh):
```bash
git status --porcelain=v1 | awk '{print $NF}' \
  | grep '^packages/coding-agent/src/' | sort > /tmp/w14-src-actual.txt
printf '%s\n' \
  packages/coding-agent/src/exec/bash-executor.ts \
  packages/coding-agent/src/exec/powershell-encoding.ts \
  packages/coding-agent/src/tools/bash.ts | sort > /tmp/w14-src-expected.txt
diff -u /tmp/w14-src-expected.txt /tmp/w14-src-actual.txt && echo "SCOPE OK"
```

G4 viết lại vì lý do của plan đã hết hạn. Plan bắt build addon **vô điều kiện** và biện minh bằng *"ở HEAD addon vắng mặt … 145 pass / 177 fail / 174 errors"*. **Đo lại ở `65cc6c1` trong checkout này — cả hai vế đều sai:** addon **có mặt** (185 MB, 128 export), và `bun test packages/coding-agent/test/tools/` → **2033 pass / 0 fail / 263 skip / 2296 tests**, 81.5s, không có 174 error nào. Giữ nó dạng **có điều kiện**:
```bash
[ -f packages/natives/native/pi_natives.darwin-arm64.node ] \
  || bun --cwd=packages/natives run build     # chỉ khi thiếu; khi đó mới cần `brew install ninja`
```
**Điều này thay đổi lập luận an toàn của plan:** vì addon đã có sẵn, bỏ qua G4 ở máy này không mất khả năng phát hiện hồi quy — nên câu *"Điểm duy nhất không đỏ được là khi bỏ qua bước build native addon"* là **lập luận hỏng**. Một điều phiếu **không** đo được: exit code của `bun test` khi một file test lỗi **load** addon — ở checkout này không tạo được tình huống đó.

**Cạm bẫy riêng của mục này.**

**T1 — Chèn guard SAU `quoteShellArg` là phá cả đường spawn.** `buildUserShellCommand` (`bash-executor.ts:379-380`) đưa lệnh qua `quoteShellArg` (`:375-377`):
```typescript
function quoteShellArg(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}
```
Đó là escape **POSIX shell**, và chuỗi kết quả được brush `Shell` parse rồi mới spawn. Guard phải nằm **trước** `.map(quoteShellArg)`.

**T2 — Đường PTY là ngõ cụt với PowerShell; vá nó là vừa thừa vừa phá cổng.** `usePty` (`bash-executor.ts:497-502`) đòi `supportsAutoUserShell(shell)` (`:338-341` là basename.includes bash/zsh/fish) → với `pwsh` **`usePty` luôn false**, nên nhánh PTY không chạy. Hệ quả: (a) câu *"PTY tương tác"* trong mục "Người dùng thấy" của plan là **không chính xác**; (b) nếu bạn vá thêm vào `executeUserShellPty` thì vừa thừa vừa phá cổng.

**T3 — Hai spawn site, không phải ba.** `!` hotkey: `input-controller.ts:1041-1053` → `command-controller.ts:1381` `handleBashCommand` → `:1423` `useUserShell: true` → `executeBash` → `finalCommand` (`:531`) → `buildUserShellCommand`. ACP client terminal: `bash.ts:1239`.

**T4 — `isPowerShell` không được import vào `bash-executor.ts`.** Không call site nào trong file đó gọi trực tiếp — `buildUserShellCommand` gọi helper. Import thừa làm `oxlint` đỏ (`no-unused-vars`), tức đỏ cổng G1 vì một lý do không liên quan tới hợp đồng.

**T5 — Suy ra chữ ký hàm mà không mở file.** `wrapShellLineForClientTerminal` (`bash.ts:163-168`) **không** cần đổi chữ ký: nó đã nhận `shellConfig: { shell, args, prefix? }`. `buildUserShellCommand` cũng vậy. W14a là hai sửa một-dòng, không phải refactor.

**T6 — `isPosixShell("pwsh")` là false — đã chạy thật, đừng giả định.** Regex `POSIX_SHELL_PATTERN` (`procmgr.ts:78`) trả false cho `pwsh`, `powershell.exe`, và `C:\Program Files\PowerShell\7\pwsh.exe`.

**T7 — `ReturnType<>` bị AGENTS.md cấm, và file pi-reference dùng nó.** `pi-ref/packages/coding-agent/src/core/tools/powershell.ts` (67 LOC) dùng `ReturnType<...>` ở dòng **52** và **59**. Hãy lấy hằng `UTF8_OUTPUT_PREFIX` từ dòng 16 của file đó, **đừng lấy cả file**.

**T8 — Vì sao không thể thả thẳng file của pi-ref.** `ShellToolConfig` và `createShellToolDefinition` có **0 hit** trong source omp (chỉ xuất hiện trong file markdown/json của `.lavish-wip`).

Câu hỏi còn treo: (1) câu hỏi mở 4a ở `:4769` — chặn W14b, W14a độc lập và vẫn land; (2) W14a có ship không nếu câu trả lời là "Windows cố ý bash-only"? Khuyến nghị **có** (~30 dòng, bảo vệ một hợp đồng encoding có thật trên hai đường spawn đang tồn tại); (3) **sai lệch kỳ vọng cần nói với người dùng**: mojibake mà plan mô tả **không** xảy ra trên đường Windows mặc định của omp — `executeBash` mặc định chạy trong brush-core, không spawn `powershell.exe`; `useUserShell` chỉ true ở hotkey `!` và PTY; (4) vị trí helper: `exec/` hay `tools/`? `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4818` hỏi đúng câu này; nếu W14b sau này được chọn, helper ở `exec/` dùng lại được nguyên vẹn.

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
| `packages/tui/src/hotkeys-markdown.ts` | sửa | Thêm một dòng hotkey ngay sau dòng `app.history.search` ở dòng 79, nếu không thì binding không được tài liệu hoá ở đâu cả và người dùng không tìm ra được tính năng. | **Có** — dòng 79 là dòng `` \| `${hotkeyLabel(bindings, "app.history.search")}` \| Search prompt history \| ``. |
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

# Cần native addon — build một lần rồi chạy; xem mục "Cổng hoàn thành"
bun test packages/tui/test/transcript-search.test.ts
```

### Cổng hoàn thành

Ba cổng, ít nhất hai cổng thật sự đỏ được.

1. **Cổng registry — cổng thật.** `packages/coding-agent/src/modes/controllers/input-controller.ts` gọi `this.ctx.keybindings.matches(data, "app.transcript.search")`, và `KeybindingsManager.matches` nhận `keybinding: Keybinding` với `Keybinding = keyof Keybindings` (`packages/tui/src/keybindings.ts:293`, `:45`). Xoá member mới khỏi `interface AppKeybindings` (`packages/tui/src/app-keybindings.ts:26`) thì tsgo fail với TS2345 tại call site đó. Một binding không có trong interface thì không phải binding. Cổng này fail to, cụ thể.
2. **Cổng types + lint + format** — `bun run --cwd=packages/tui check` và `bun run --cwd=packages/coding-agent check:types` đều exit 0. Bắt được ba chỗ port sai (`getGraphemeSegmenter`, Input options ctor, `readonly string[]`) và việc chuyển sang ES-`#private`.
3. **Cổng test** — `bun test packages/tui/test/transcript-search.test.ts` báo 0 fail. **Cần native addon:** ở trạng thái chưa build nó báo 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64` (đã xác nhận bằng cách chạy `packages/tui/test/scroll-view.test.ts`). Build addon trước bằng `brew install ninja` rồi `bun --cwd=packages/natives run build` — một lần là cổng này chạy.

**Cổng có thực sự đỏ được không:** có — cổng 1 và cổng 2 đỏ thật và cổng 1 đỏ rất cụ thể (TS2345 tại đúng call site). Riêng cổng 3 cần addon; sau `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần thì cả ba cổng chạy, và W15 không còn ở trạng thái **type-complete, test-pending**.

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
- **Mở khoá test.** `bun test` cần native addon: `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là cổng 3 của mục này chạy (cổng 1 và 2 thì vốn không cần addon). Xác nhận bước build đã chạy trước khi mục này được lên lịch, nếu không thì work item sẽ ship ở trạng thái type-complete, test-pending.

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

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W15.md`.

**Cảnh báo neo.**

| neo trong kế hoạch | kế hoạch nói | thực tế tại `65cc6c1` | verdict |
| --- | --- | --- | --- |
| `input-controller.ts:19` | "import ở `:19` đúng và còn hiện hành" (Đính chính) | `:19` = `import { AssistantMessageComponent } from "@o…` | hỏng |
| `input-controller.ts:319` | "block `#globalEditorActionsListener` bắt đầu dòng 319" | `:319` = `});` đóng listener trước. Guard `if (!this.#globalEditorActionsListenerInstalled) {` ở chỗ khác | hỏng |
| `selector-controller.ts:92` | "import `HistorySearchComponent` ở `:92`" | `:92` = `import { listLiveToolRecords, liveToolRecordFromSession } from "@oh-my-pi/pi-tui/overlays/extensions…` | hỏng |
| `keybindings.ts:43` | "member cuối `tui.select.cancel` ở dòng 43" | `:42` = `"tui.select.cancel": true;`. `:43` = `}` đóng interface | `stale-anchor`, lệch 1 |
| `keybindings.ts:186` | neo của bước 0 (kiểm chord trống) | `:186` = `const code = key.charCodeAt(0);` trong `isAsciiUppercaseLetter` — không liên quan | `irrelevant-anchor` |
| `session-context.ts:214` | "`isTranscriptEntry` nằm ở `:214`" | `:213` = signature, `:214` = dòng `return entry.type === …` | `off-by-one` (nhẹ) |
| bảng "File cần chạm tới" | `packages/tui/test/` "chứa 235 file `*.test.ts`" | `ls packages/tui/test/*.test.ts \| wc -l` = **222** | `wrong-count` |
| mục "Cổng hoàn thành" cổng 3 | "BỊ CHẶN Ở HEAD — 0 pass / 1 fail, `Failed to load pi_natives native addon`"; "tracker nên coi W15 là type-complete, test-pending" | `bun test` trên `packages/tui` **xanh** (13 / 28 / 119 pass), kể cả ở hai file có `import … "@oh-my-pi/pi-natives"` | **`wrong`** |
| mục "Đính chính" dòng cuối | "HEAD thực tế là `ecd516f`" | `git rev-parse --short HEAD` = **`65cc6c1`**, branch `milestone-1` | `stale` |
| bảng "File cần chạm tới" | không liệt kê | `modes/types.ts` và `modes/interactive-mode.ts` **bắt buộc** cho `this.ctx.showTranscriptSearch()` | **`omission`** |

**Xác nhận những thứ kế hoạch nói ĐÚNG (đã mở đọc, không phải tin):** `pi-ref` HEAD `d6af72e18`, `alt-screen-search.ts` 327 dòng; `PRINTABLE_ASCII` ở `:32`; `buildSearchCorpus` ở `:34`; loop 47-78; `linearColumns` trên **cả hai** nhánh; `findAltScreenSearchMatches` `:186`; `getAltScreenSearchM…` (tiếp).

**Bảng điểm sửa.** Kế hoạch liệt kê 9 file. Thực tế là **11 file** — kế hoạch bỏ sót hai dòng bắt buộc (đánh dấu ⚠).

| đường/dẫn | symbol | TRƯỚC (trích nguyên văn từ file) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/tui/src/chat/transcript-search-index.ts` | *(file mới)* | *(không tồn tại)* | Port `pi-ref/.../alt-screen-search.ts:4-194`. Đổi `getGraphemeSegmenter` → `getSegmenter`. `AltScreenSearch*` → tên mới |
| `packages/tui/src/overlays/transcript-search.ts` | *(file mới)* | *(không tồn tại)* | `TranscriptSearchComponent` (port `pi:197-326`) + `TranscriptSearchOverlay` (mới, **không có ở pi**) |
| `packages/tui/src/keybindings.ts` | `interface Keybindings` | dòng 42: `"tui.select.cancel": true;` rồi dòng 43 là `}` | thêm `"tui.transcript.searchNext": true;` + `"tui.transcript.searchPrevious": true;` **vào dòng 43 (trước `}`)** — không phải dòng 43 như kế hoạch nói |
| `packages/tui/src/keybindings.ts` | `TUI_KEYBINDINGS` (khai báo ở `:58`) | dòng 138-141: `	"tui.select.cancel": {` / `		defaultKeys: ["escape", "ctrl+c"],` / `		description: "Cancel selection",` / `	},` rồi `} as const satisfies KeybindingDefinitions;` | thêm 2 entry cùng hình dạng |
| `packages/tui/src/app-keybindings.ts` | `interface AppKeybindings` | dòng 64: `"app.live.toggle": true;` | thêm `"app.transcript.search": true;` — **không** đụng dòng 68 |
| `packages/tui/src/app-keybindings.ts` | `KEYBINDINGS` | dòng 236-239: `"app.history.search": { defaultKeys: "ctrl+r", description: "Search history" },` | thêm entry `defaultKeys: "ctrl+shift+f"` |
| `packages/tui/src/hotkeys-markdown.ts` | bảng hotkeys | dòng 79: `` `\| \`${hotkeyLabel(bindings, "app.history.search")}\` \| Search prompt history \|`, `` | thêm 1 dòng cùng hình dạng |
| `packages/coding-agent/src/modes/controllers/selector-controller.ts` | `showTranscriptSearch()` | ngay sau khối `showCopySelector()` kết thúc ở dòng 1257 | method mới, mirror `showCopySelector` (nguồn entries: `selector-controller.ts:1204-1206` `this.ctx.sessionManager.getBranch().filter(isTranscriptEntry)`) |
| `packages/coding-agent/src/modes/controllers/input-controller.ts` | `#globalEditorActionsListener` | dòng 331-337: nhánh `app.history.search` | thêm nhánh `app.transcript.search` |
| ⚠ `packages/coding-agent/src/modes/types.ts` | `InteractiveModeContext` | dòng 476: `	showCopySelector(): void;` | thêm `showTranscriptSearch(): void;` ngay sau. **Kế hoạch không liệt kê file này.** |
| ⚠ `packages/coding-agent/src/modes/interactive-mode.ts` | `InteractiveMode` | dòng 7116-7118: `	showCopySelector(): void {` / `		this.#selectorController.showCopySelector();` / `	}` | thêm `showTranscriptSearch()` cùng hình dạng. **Kế hoạch không liệt kê file này.** |
| `packages/tui/test/transcript-search.test.ts` | *(file mới)* | *(không tồn tại)* | 6 `it()` theo hợp đồng test |
| `packages/tui/CHANGELOG.md` | `[Unreleased]` | dòng 3 là `## [Unreleased]`, dòng 4 trống, dòng 5 là `## [18.4.0]` — **chưa có mục `### Added`** | thêm `### Added` + 1 dòng dưới `[Unreleased]` |
| `packages/coding-agent/CHANGELOG.md` | `[Unreleased]` | dòng 3 `## [Unreleased]`, dòng 5 `### Security` — **chưa có `### Added`** | thêm `### Added` đặt **sau** `### Security`, theo thứ tự AGENTS.md |

**Bảng "chỉ đọc, không sửa" — 16 file** (gồm `packages/tui/src/utils.ts`, `key-hint-format.ts`, `components/input.ts`, `tui.ts`, `chat/chat-transcript-builder.ts`, …).

**Các bước có neo đã kiểm.**

0. **Kiểm chord còn trống (chạy lại, đừng tin kế hoạch).** Đo ở HEAD: `ctrl+shift+f` **0**, `ctrl+shift+e` **0**, `ctrl+shift+k` **0**, `alt+k` **0**, `alt+x` **1**, `ctrl+g` **4**. ⇒ Kết luận: mang `["enter"]` / `["shift+enter"]` sang, **không** mang `ctrl+g` của pi. `ctrl+shift+f` trống → dùng.
1. **Copy `transcript-search-index.ts` (không viết lại)** — port từ `pi-ref/.../alt-screen-search.ts:4-194`, đổi `getGraphemeSegmenter` → `getSegmenter`.
2. **Port `TranscriptSearchComponent`** (3 chỉnh bắt buộc) — Input của omp **không có constructor** (`components/input.ts:53`): `render(width: number): readonly string[]` (`tui.ts:241`), và `Focusable` chỉ cần `focused` (+ optional `setUseTerminalCursor`) (`tui.ts:296-301`).
3. **Xoá `formatKey` cục bộ, dùng `formatKeyHints`**.
4. **Đăng ký 2 binding tầng TUI** — `interface Keybindings` (chèn trước `}` ở dòng 43) + `TUI_KEYBINDINGS` (khai báo ở `:58`, entry cuối ở `:138-142`).
5. **Đăng ký chord mở overlay (2 chỗ, không phải 3)** — `app-keybindings.ts` tự suy ra từ dòng 68, nên chỉ 2 chỗ.
6. **Tạo `TranscriptSearchOverlay`** (phần plan gọi "bước plan làm sai").
7. **Scroll tới match** — `body.anchor` là `{id, start, end}` với `start`/`end` là **CHỈ SỐ HÀNG** (`scroll-view.ts:50-56`); highlight trong frame callback là đúng (`transcript-browser.ts:237` `this.#scrollView.setLines(frame.body.lines);`).
8. **`showTranscriptSearch()` + 2 file bị bỏ sót** — `modes/types.ts:476` + `interactive-mode.ts:7116-7118`. Anchor overlay sẵn có để bám: `selector-controller.ts:1249-1255` (`this.ctx.ui.showOverlay(selector, { anchor: "bottom-center", width: "100%", maxHeight: "100%", margin: 0, fullscreen: true })`).
9. **Handler trong `#globalEditorActionsListener`.**
10. **Hotkeys + changelog.**

**Hợp đồng test.** File `packages/tui/test/transcript-search.test.ts` (mới). Quy ước thư mục đã kiểm: `packages/tui/test/` có **222** file `*.test.ts` (kế hoạch ghi 235 — sai). Không `mock.module`, không `not.toThrow()` trần, không source-grep.

| # | tên `it()` | dựng gì | khẳng định gì | **người dùng thấy gì nếu hồi quy** |
| --- | --- | --- | --- | --- |
| 1 | `findTranscriptSearchMatches` trả **một** match với **hai** segment khi query cắt qua ngắt dòng | buffer `["alpha beta", "gamma delta"]`, query `"beta gamma"` | `matches.length === 1`; `segments.length === 2` | Highlight nhổ mất chữ ở ranh giới dòng |
| 2 | match ở dòng sau nhận `row` của dòng đó, không phải dòng 0 | buffer dài ≥ 5 dòng, query chỉ xuất hiện ở dòng 3 | `segments.every(s => s.row === 3)`; `startCol` tính từ đầu dòng 3 | Highlight nhảy lên dòng 0 (đầu buffer) |
| 3 | `changed: false` khi truy vấn lại y hệt; `changed: true` + match mới khi buffer thêm dòng | `TranscriptSearchIndex` chạy thẳng: search → thêm 1 dòng có match → search lại | — | Tìm kiếm không cập nhật khi transcript dài thêm |
| 4 | điều hướng vòng qua cả hai đầu | 3 match, `next` từ index 2, `previous` từ index 0 | `next(2) === 0`; `previous(0) === 2` | Bấm `Enter` ở match cuối → thanh tìm nhảy `0/3` thay vì `1/3` |
| 5 | query không khớp trả `[]`, thanh tìm in `"No matches"` | query `"zzzz"` trên buffer có text | `findTranscriptSearchMatches(lines, "zzzz")` **bằng** `[]`; `getTranscriptSearchMatchKey` trên mảng rỗng trả `""` | Thanh tìm báo số match sai khi không có kết quả |
| 6 | index trên 5.000 dòng trả đúng **một** match, các segment chỉ chạm dòng chứa text | 5.000 dòng, đúng một lần xuất hiện của `"needle"` | `matches.length === 1`; `segments.every(s => s.row >= 0 && s.row < 5000)` | Highlight vẽ trên dòng không có text |

Không test có chủ ý: layout pixel của thanh tìm, chord, cách mount overlay — đó là wiring, và AGENTS.md cấm test khẳng định constructor chép lại fixture.

**Cổng có đỏ được không.**

- **Cổng 0 (mới, chặn)** — `rg -n "AltScreenSearch" packages/` (kỳ vọng: 0 hit). Đỏ bằng cách: port sót một identifier `AltScreenSearch*`. Không có cổng này thì tên cũ lọt vào file mới.
- **Cổng 1 — registry (thật, đỏ rất cụ thể)** — `bun run --cwd=packages/tui check && bun run --cwd=packages/coding-agent check:types`. **CÓ đỏ được**, đã truy ngược lý do: `input-controller.ts:13` (`import { formatDoubleTap } from "@oh-my-pi/pi-tui/app-keybindings";`) kéo `app-keybindings.ts` vào type graph, kích hoạt augmentation ở `app-keybindings.ts:69-71` (`interface Keybindings extends AppKeybindings {}`). Nếu xoá `"app.transcript.search": true;` khỏi `interface AppKeybindings` thì key đó biến mất khỏi `keyof Keybindings` → **TS2345 Argument of type '"app.transcript.search"' is not assignable to parameter of type 'Keybinding'** (dòng `keybindings.ts:293` `matches(data: string, keybinding: Keybinding): boolean {`).
  - **Cổng 1b — KHÔNG có cổng nào bắt chiều ngược lại.** `keybindings.ts:55` → `export type KeybindingDefinitions = Record<string, KeybindingDefinition>;`. `Record<string, …>` không exhaustive, nên thêm member vào `interface AppKeybindings` mà quên `TUI_KEYBINDINGS` **vẫn xanh toàn bộ**.
  - **Cổng 1c** — `hotkeys-markdown.ts:15` → `action: AppKeybinding`. Thêm binding mà bỏ dòng hotkey thì cũng không đỏ.
- **Cổng 2 — lint + format + types (thật, xanh sẵn)** — `bun run --cwd=packages/tui check` và `bun run --cwd=packages/coding-agent check:types`, cả hai exit 0 ở HEAD. Bắt được: `getGraphemeSegmenter` còn sót, `new Input({...})`, `render(): string[]` thay vì `readonly string[]`, `private` chưa đổi thành `#field`, và `tsgo` bắt **2 file bị bỏ sót ở bước 8**.
- **Cổng 3 — test (THẬT, VÀ ĐANG XANH)** — `bun test packages/tui/test/transcript-search.test.ts`. **Sửa kế hoạch:** nó viết *"BỊ CHẶN Ở HEAD — 0 pass / 1 fail với `Failed to load pi_natives native addon`… Phải build addon trước"*. Đo thật: `scroll-view.test.ts` → 13 pass; `keybindings.test.ts` + `input.test.ts` → 28 pass; `render-utils.test.ts` + `autocomplete.test.ts` → 119 pass. Hai file cuối **có** `import … "@oh-my-pi/pi-natives"` — addon load thành công. **Không chạy `brew install ninja`, không `bun --cwd=packages/natives run build`, không đánh dấu W15 là `test-pending`.** Đỏ được rất cụ thể ở từng `it()`; `it()` #1 đỏ nếu ai đó bỏ nhánh `linearColumns` ở `pi:129-131` (highlight vẽ đè lên từ khác).

**Cạm bẫy riêng của mục này.**

1. **Cây thật không có `ScrollView` sau transcript sống.** Kế hoạch gốc nói "rendered line buffer thuộc `packages/tui/src/components/scroll-view.ts`" — sai; neo `packages/tui/src/chrome/transcript-container.ts:150`.
2. **Hai file bị bỏ sót, và cổng 1 đỏ ở đó chứ không ở chỗ bạn nghĩ.** `modes/types.ts:476` + `interactive-mode.ts:7116`. Sửa 9 file đúng như kế hoạch rồi chạy cổng 1 → TS2339/TS2741 ở file không có trong danh sách.
3. **`satisfies Record<string, …>` không bắt thiếu entry.** Đây là loại lỗi **xanh toàn bộ cổng** — nguy hiểm hơn hẳn lỗi đỏ. Phải đếm bằng `rg -c` thủ công.
4. **`private` → `#field`, không phải `private`.** 6 field của `AltScreenSearchComponent` đều là `private` trong pi; AGENTS.md cấm keyword `private` trên field. Sửa 3 tên còn sót là oxfmt/oxlint không bắt được, chỉ có review.
5. **Bỏ `ctrl+g` mang theo từ pi.** Pi mặc định `["enter","ctrl+g"]` / `["shift+enter","ctrl+shift+g"]` (*đã đọc `pi-ref/packages/tui/src/keybindings.ts:196-207`*). `ctrl+g` đã bị `app.editor.external` chiếm và còn 3 chỗ nữa.
6. **`this.#input.prompt = "Find: "` phải set SAU `new Input()`.** Không có constructor options. Set trước khi gán sẽ ghi đè bằng `"> "`.
7. **Phải flatten ra mảng phẳng mới, không dùng `prepareOutline`/`renderOutlineRows`.** Chúng cắt prompt zone và dịch cột — toàn bộ phép map match → `(row, startCol)` dựa vào cột tuyệt đối. Dùng chúng là highlight lệch cột. Hợp đồng identity-stable mà `#plainLines` dựa vào nằm ở `transcript-outline.ts:80-93`.
8. **`body.anchor` là `{id, start, end}` với `start`/`end` là CHỈ SỐ HÀNG**, không phải ký tự, không phải chỉ số phẳng của mảng đã highlight. Truyền `endCol` vào `end` sẽ revealRange tới hàng 250 trên một màn hình cao 50 dòng.

Sai lệch khác so với kế hoạch: Effort "M cho phần port" là `understated` — port đúng 327 dòng, nhưng `TranscriptSearchOverlay` **không có trong pi** (thiết kế mới: flatten line buffer, tô sáng, quản lý con trỏ match, cuộn), nên M+ là đúng. "Hai chỗ sửa trong `app-keybindings.ts`, không phải ba" là **đúng** (đã xác nhận: `app-keybindings.ts:68` tự suy ra).

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

8. **Xác minh.** `bun test packages/coding-agent/test/session/storage-conformance.test.ts packages/coding-agent/test/session/indexed-over-real-backend.test.ts` phải exit 0 — nhưng lưu ý phải build native addon trước (`brew install ninja` rồi `bun --cwd=packages/natives run build`, một lần là đủ), vì ở trạng thái chưa build `bun test` báo `0 pass / 1 fail` với `Failed to load pi_natives native addon for darwin-arm64` cho **mọi** file trong package này. Sau bước build đó chạy `bun run check:ts` (nó không cần addon và pass sạch trên `ecd516f`, 5445 files formatted, mọi package `Done`). **Không bao giờ** dùng `tsc` / `npx tsc`.

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
# Cần native addon — build một lần (ở máy chưa build, đã xác minh trên ecd516f:
# 0 pass, 1 fail, "Failed to load pi_natives native addon for darwin-arm64"):
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# The gate — must exit 0:
bun test packages/coding-agent/test/session/storage-conformance.test.ts \
         packages/coding-agent/test/session/indexed-over-real-backend.test.ts

# No addon needed (verified clean on ecd516f):
bun run check:ts

# The three pre-existing files this must not break:
bun test packages/coding-agent/test/session/sql-session-storage.test.ts \
         packages/coding-agent/test/session/redis-session-storage.test.ts \
         packages/coding-agent/test/session/session-manager-indexed-durability.test.ts \
         packages/coding-agent/test/session/indexed-late-atomic-rollback.test.ts
```

### Cổng hoàn thành

`bun test packages/coding-agent/test/session/storage-conformance.test.ts packages/coding-agent/test/session/indexed-over-real-backend.test.ts` exit 0, **VÀ** nhóm `lateAtomicRollback` chứng minh được là đã chạy trên một `SqlSessionStorage` thật dựng từ `new SQL("sqlite::memory:")` — xác nhận bằng việc suite pass trong khi nhánh conflict `writeFull` của backend SQL (`packages/coding-agent/src/session/sql-session-storage.ts:377-394`, phần re-check `readFull` + byte length) không có test nào khác chạm tới. Dạng phủ định của cổng: nếu bạn xoá nhánh real-SQL khỏi vòng lặp tham số hoá trong `indexed-over-real-backend.test.ts` và chỉ còn Map control, các khẳng định equality `sqlPlan.skipped` ở bước 6 vẫn pass trong khi coverage cross-product thực sự đã biến mất — vì vậy còn phải khẳng định `createSqlHarness` nằm trong danh sách harness mà vòng lặp duyệt, bằng cách biến chính danh sách harness của vòng lặp thành đối tượng của một test, và test đó đỏ khi danh sách rớt xuống dưới ba phần tử.

**Cổng này có thể đỏ thật, theo ba đường.** (1) Hai file test không tồn tại → `bun test` báo lỗi trên đường dẫn thiếu. (2) Các khẳng định `skipped` là so sánh mảng **bằng tuyệt đối**, nên một lần đăng ký thêm, mất, hay giới hạn sai một nhóm sẽ đỏ suite chứ không pass lặng lẽ. (3) Các khẳng định F1 là hành vi: `expect(statSync(path).size).toBe(bSize)` và một lần `writeTextSync(path, "C\n", { expectedSize: bSize })` không có guard phải **không** ném. Một hồi quy trong `#failFrame` (`packages/coding-agent/src/session/indexed-session-storage.ts:553-566`) hoặc trong nhánh conflict SQL (`packages/coding-agent/src/session/sql-session-storage.ts:384-393`) làm chúng đỏ. **Lưu ý về mức độ tin cậy:** cổng này **chưa** được chạy quan sát — nó được **lập luận từ mã nguồn**, không phải quan sát thấy pass. Chạy `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là nó chạy được; đó là tiền đề tái lập được, không phải hạn chế của máy. `bun run check:ts` thì **đã** chạy và pass sạch trên `ecd516f`.

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
| "Tạo case factory tại `packages/coding-agent/src/session/storage-conformance.ts`." | **SAI VỊ TRÍ** cho repo này | Đặt tại `packages/coding-agent/test/session/storage-conformance.ts`. 81 module helper chỉ-dùng-cho-test nằm dưới `test/`, không phải `src/`, và export map `"./*" -> "./src/*.ts"` của package sẽ publish module test ra tới mọi consumer. Vị trí sibling-of-test khớp với tiền lệ `test/session-manager/helpers.ts`. Bằng chứng: `find test -name '*.ts' ! -name '*.test.ts' \| wc -l` -> 81. |
| "Test mới: `test/session/sql-storage-conformance.test.ts`, `test/session/redis-storage-conformance.test.ts`, `test/session/indexed-over-real-backend.test.ts`." | **CỐ Ý GỘP (2 file, không phải 3)** | Cả hai backend thật là subclass của `IndexedSessionStorage` với tập nhóm **giống hệt**, nên một `storage-conformance.test.ts` duy nhất với một `describe` mỗi backend vừa nhỏ hơn vừa biến việc cắt Wave 6 thành **xoá một file** — đúng mục đích mà wave tuyên bố. Failure vẫn truy được nguồn vì mỗi backend giữ `describe` riêng. Bằng chứng: cả hai delegate `super(backend)` — `sql-session-storage.ts:277-282` và `redis-session-storage.ts:116-120`. |
| "Các file fake-backend sẵn có cần đối chiếu là `test/session/session-manager-indexed-durability.test.ts` và `test/indexed-late-atomic-rollback.test.ts`." | **SAI MỘT ĐƯỜNG DẪN** | `indexed-late-atomic-rollback.test.ts` nằm ở `test/session/indexed-late-atomic-rollback.test.ts`, không phải ở gốc `test/`. Cả hai file phải tiếp tục pass mà không đổi; conformance suite là phần cộng thêm và **không được** sửa chúng. Bằng chứng: `ls packages/coding-agent/test/session/indexed-late-atomic-rollback.test.ts` -> có (4.8 KB, 146 dòng, 1 test). |
| "Lệnh xác minh là `bun check && bun test <ba file>`." | **Cần tiền đề môi trường** — build addon một lần là chạy được | `bun test` cần native addon. Ở máy chưa build đã xác minh: `bun test packages/coding-agent/test/session/indexed-late-atomic-rollback.test.ts` -> `0 pass / 1 fail`, `error: Failed to load pi_natives native addon for darwin-arm64`. Đây là thiếu một bước build, không phải hạn chế của máy — `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là cả ba file test chạy. `bun run check:ts` đã chạy và pass sạch (5445 files formatted, mọi package `Done`) và là xác minh **duy nhất** khả dụng ở trạng thái chưa build. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W16.md`. **Thuần test — không sửa dòng `src/` nào.**

**Cảnh báo neo.** HEAD thật lúc viết phiếu: `65cc6c1` trên `milestone-1`.

**Neo ĐÚNG, dùng nguyên số dòng trong plan:** `sql-session-storage.ts:262`, `redis-session-storage.ts:109`, `indexed-session-storage.ts:118`, `:553-566` (`#failFrame`), `sql-session-storage.ts:377-394` và `:384-393` (khối re-check), `:358` (`readSlices`), `redis-session-storage.ts:182-187`, `sql-session-storage.ts:427-432` (transaction bọc trọn `move`), `redis-session-storage.ts:261-267`; `test/session/indexed-late-atomic-rollback.test.ts:5-11` và `:120-145`; `redis-session-storage.test.ts:1-16` và `:37`; `session-manager-indexed-durability.test.ts:22`; `sql-session-storage.test.ts:281`; `sql-session-storage-manager.test.ts:128`; `packages/coding-agent/CHANGELOG.md`.

**Neo SAI hoặc lệch, đã dò lại:**

| Neo trong plan | Plan nói | Thật |
| --- | --- | --- |
| `git rev-parse --short HEAD` | `ecd516f` | `65cc6c1` (plan đã tự cảnh báo STALE, nay đã trôi thêm) |
| `test/session/sql-session-storage.test.ts:51-60` | "seam đã được chứng minh" để copy | 51–60 là `const queries: string[] = [];` + `const wrapped: SqlSessionStorageClient = {` … — **đúng vị trí, đúng vai trò**, nhưng nó **chỉ quan sát query**, không có cổng |
| `sql-session-storage.ts:277-282` và `redis-session-storage.ts:116-120` | "cả hai delegate `super(backend)`" | 277–282 và 116–120 là **`static async create(...)`**. `super(backend)` thật ở `sql-session-storage.ts:267` |
| "grep `readTextSlices test/` … không hit nào ở `redis-session-storage.test.ts`" | không hit | **SAI** — 8 hit trong file đó, gồm `it("readTextSlices returns byte windows from the head and tail")` ở **dòng 416**. Khe trống thật còn lại là **byte-EOF semantics**, không phải "chưa từng gọi" |
| "`readSlices` trên path không tồn tại: SQL ném ENOENT, Redis trả `["",""]` … đây là **đường đọc thật**" | — | **SAI Ở TẦNG `SessionStorage`** — probe: cả hai đều `THREW: ENOENT`; `IndexedSessionStorage.readTextSlices` (`indexed-session-storage.ts:281-282`) chặn ở index trước |
| "Nhóm `indexCoherence`: hai lần ghi liên tiếp nhanh sinh `mtimeMs` tăng nghiêm ngặt" | — | **SAI TRÊN MEMORY** — đo thật: file `true`, indexed `true`, **memory `false`** (`m1 === m2 === 1790641139654`); `session-storage.ts:1154` là nơi sinh hành vi đó |
| "Redis `move` nuốt lỗi migration meta-hash … một group hình dạng `crossProcessLock` khẳng định rename nguyên tử sẽ **fail** trên Redis" | — | **SUY ĐOÁN, chưa kiểm chứng** — `move` là method `SessionStorageBackend`, không phải API công khai |
| "81 module helper chỉ-dùng-cho-test" | 81 | `git ls-files` → 81 (đúng tại HEAD); `find` trên working tree cho **82** vì có file chưa track `packages/coding-agent/test/collab/web-wire.types.ts` |
| "đặt ở `test/session/` chứ không phải `src/session/`" | — | **ĐÚNG** — `package.json:53-56` export map `"./*"`; đặt helper ở `src/` sẽ publish ra consumer |
| "`bun test` bị chặn bởi `Failed to load pi_natives native addon`" | — | **ĐÃ LỖI THỜI** — addon đã tồn tại; `indexed-late-atomic-rollback.test.ts` → `1 pass / 0 fail / 3 expect`; 4 file có sẵn → `52 pass / 0 fail / 181 expect` |

**Các câu khẳng định đã kiểm chứng bằng chạy thật** (probe tạm, đã xoá sau khi chạy): `casToken` với `{ expectedSize: null }` trên path đã tồn tại — đúng trên cả 4 backend (file / memory / sql / map), đều `rejected(null/2)`, **không phải divergence**; **nhánh conflict SQL nuốt byte-giống-hệt — CÓ THẬT**: `writeTextAtomic(path, "hello\n", { expectedSize: 6 })` khi row đang là `"hello\n"` trả **OK, bị nuốt thành công**; **lịch F1 chạy được trên SQL thật** (seam đúng là bọc `client.unsafe` + regex khớp chính xác câu query); `rename` để lại nguồn ENOENT — đúng trên file / memory / sql / map (Redis không probe được vì `writeFull` đi qua `send("EVAL", [WRITE_FULL_SCRIPT, …])`).

**Bảng điểm sửa.** Không sửa file nào. Toàn bộ thay đổi là **tạo mới 3 file**; bảng dưới mô tả hình dạng sau khi viết, kèm văn bản thật đã trích từ file.

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/test/session/storage-conformance.ts` | *(không tồn tại)* | `ls` → `no matches found` | Module thuần, **không** `describe`/`it`. Export `StorageHarness`, `Conformance…` |
| `packages/coding-agent/test/session/storage-conformance.test.ts` | *(không tồn tại)* | — | 5 khối `describe` + 2 test hợp đồng harness |
| `packages/coding-agent/test/session/indexed-over-real-backend.test.ts` | *(không tồn tại)* | — | Vòng lặp tham số hoá 3 harness chạy `lateAtomicRollback` + `failureRecovery`, kèm một test nữa |
| `src/session/session-storage.ts:1154` | `MemorySessionStorage.writeTextSync` | `		this.#files.set(path, createMemoryFileEntry(content, Date.now()));` | **không đổi** — nhưng group `indexCoherence` phải được viết đúng cho memory |
| `src/session/sql-session-storage.ts:384-393` | `SqlSessionStorageBackend.writeFull` conflict branch | `		if (actualSize === expectedSize) return;` | **không đổi** — đây là hành vi cần test bảo vệ |

**Các bước có neo đã kiểm.**

1. **Chốt lại ba neo, đã verify.**
2. **`test/session/storage-conformance.ts`: cơ chế.**
3. **Tám group factory.**
4. **Năm harness factory.**
5. **`test/session/storage-conformance.test.ts`: đăng ký.**
6. **Hai test hợp đồng harness.**
7. **`test/session/indexed-over-real-backend.test.ts`.**
8. **Xác minh.**
9. **Báo cáo sai lệch thành phát hiện riêng.**

**Hợp đồng test.** File: `test/session/storage-conformance.ts`, `test/session/storage-conformance.test.ts`, `test/session/indexed-over-real-backend.test.ts`.

1. Mỗi backend × 7-8 nhóm: `readWrite`, `indexCoherence`, `casToken`, `sliceReads`, `deferredPublish`, `failureRecovery`, `lateAtomicRollback`; `crossProcessLock` chỉ trên `FileSessionStorage`.
2. `reports an omitted group as skipped instead of failing it` — so sánh mảng **tuyệt đối** trên `skipped`.
3. `never runs a group the backend did not declare` — chốt gá chống việc một backend âm thầm chạy sai tập nhóm.
4. `keeps B durable when A's gated readback settles after B commits` — lịch F1, chạy trên cả 3 harness thật.
5. `covers every registered harness` — danh sách harness ≥ 3 và có SQL.
6. `keeps the CAS token contract on a real SQL connection` — khẳng định nhánh `sql:384-393` nuốt byte-giống-hệt **và** ném khi size thật sự lệch.

**Điều người dùng thấy gì nếu hồi quy:**

- Hồi quy ở `#failFrame` (`indexed-session-storage.ts:553-566`) → một hội thoại session in-memory **mất khi đóng tiến trình**; mô tả đúng ở `test/session/indexed-late-atomic-rollback.test.ts:5-11`.
- Hồi quy ở nhánh conflict SQL → người dùng **không** thấy gì (byte-giống-hệt bị nuốt là đúng ý đồ). Họ chỉ thấy test đỏ. Đây là hợp đồng bảo vệ hành vi, không phải hành vi người dùng quan sát.
- Hồi quy ở group `sliceReads` → `SessionManager` đọc cửa sổ byte sai ở đầu/cuối transcript, hiển thị context cũ hoặc rỗng trong TUI.
- Hồi quy ở `skipped` → suite vẫn xanh nhưng một nhóm **không còn chạy** nữa. **Đây là hành vi tệ nhất và là lý do test #2 tồn tại.**

**Cổng có đỏ được không.**

Cổng chính:
```bash
bun test packages/coding-agent/test/session/storage-conformance.test.ts \
         packages/coding-agent/test/session/indexed-over-real-backend.test.ts
```

**CÓ ĐỎ ĐƯỢC, bằng ba đường đã kiểm chứng, không suy đoán:** (1) hai file không tồn tại → `bun test` báo lỗi trên đường dẫn thiếu; (2) `skipped` là so sánh mảng tuyệt đối → thêm/bớt/giới hạn sai một nhóm sẽ đỏ, không pass lặng lẽ; (3) F1 là assertion hành vi — đã **chạy** lịch này trên SQL thật và nó pass với giá trị cụ thể (`size 36 === bSize 36`).

**Vì sao nó KHÔNG phải cổng xanh giả:** cổng xanh giả ở đây là "xoá nhánh SQL khỏi vòng lặp nhưng `sqlPlan.skipped` vẫn pass". Đó là lý do `covers every registered harness` là **bắt buộc**.

**Cổng không thể đỏ — phải viết lại. `bun run check:ts` KHÔNG phải là cổng cho W16.** Nó pass sạch khi file test **không tồn tại**, và cũng pass sạch khi mọi group sai. Type-check không thấy hành vi. Giữ nó làm **smoke bổ trợ**, đừng tính là cổng. Cổng "4 file có sẵn vẫn xanh" cũng yếu hơn vẻ ngoài: baseline `52 pass / 0 fail / 181 expect` — nó đỏ nếu bạn phá `src/`, nhưng W16 **không được** sửa `src/`, nên về mặt cấu trúc nó gần như luôn xanh. Nó là **regression**, không phải cổng chứng minh.

**Cạm bẫy riêng của mục này.**

1. **`indexCoherence` sẽ đỏ trên `MemorySessionStorage` nếu viết đúng như plan.** Đo thật: memory cho `m1 === m2 === 1790641139654`.
2. **Đừng tin claim "Redis `readSlices` trả `["",""]` trên path không tồn tại" theo nghĩa plan nói.**
3. **Redis double phải implement `send("EVAL", …)`, không phải `set`.** `RedisSessionStorageBackend.writeFull` gọi `this.#client.send("EVAL", [WRITE_FULL_SCRIPT, "3", …])` (`redis-session-storage.ts:195-201`).
4. **Seam SQL phải phân biệt `readFull` bằng regex khớp TRÌNH, không `includes("AS content")`.** `readSlices` cũng chứa `AS content`. Probe đầu tiên của phiếu dùng `includes` và hỏng.
5. **`move` là API backend, không phải API công khai.** `SessionStorage` expose `rename` (`session-storage.ts:157`), không có `move`.
6. **Con số 81 vs 82.** `git ls-files` → 81 (khớp plan); `find` → 82 vì có file chưa track.
7. **`FileSessionStorage` và `MemorySessionStorage` là constructor không tham số.** Plan gợi ý chúng "trên `Bun.tempDir()`" — không có tham số root nào để truyền.
8. **Đừng dùng `mock.module()`.** Nó mutate global registry và rò ra file khác. Mutate object client được inject rồi reset trong từng test.

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

10. **Build native addon, rồi chạy toàn bộ cổng:** `brew install ninja` rồi `bun --cwd=packages/natives run build`, sau đó `bun run check:ts`, sau đó `bun test packages/coding-agent/test/diagnostics/`. Bước build là **tiền đề tái lập được** — trên máy chưa build, `bun test` báo `0 pass, 1 fail` với "Failed to load pi_natives native addon for darwin-arm64"; build một lần là hết và cổng test chạy. Trước bước build đó, đỏ ở đây **không** phải suite pass và **không** phải cổng đỏ.

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

**Tiền đề môi trường:** cần addon native. Trên máy chưa build, `bun test` báo `0 pass, 1 fail` với "Failed to load pi_natives native addon for darwin-arm64" — đây **không phải** hạn chế của máy mà là **thiếu một bước build**. Làm một lần: `brew install ninja` rồi `bun --cwd=packages/natives run build` (exit 0). Sau đó toàn bộ cổng test của mục này chạy. `bun run check:ts` thì không cần bước này. **Đừng ghi work item này là xong chỉ dựa trên type-check.**

Cổng có thể thực sự đỏ: có — cả bảy điều kiện đều là phép kiểm có thể đỏ khi phần việc tương ứng vắng mặt, và bảy điều kiện đó chạy được ngay sau khi build addon (một lần `brew install ninja` + `bun --cwd=packages/natives run build`); trước bước build đó cổng chỉ thật sự có một nửa (`check:ts`).

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
| Bundle nên được zip, và lựa chọn giao là upload vs. zip cục bộ. (plan:1988-1990, 2010-2011) | CORRECT, nhưng plan hàm ý thiếu một khả năng đã có | Zip có sẵn ở trung tâm — `writeArchive(destPath, "zip", entries)` trong `@oh-my-pi/pi-utils/ar`. **Không** thêm dependency: `adm-zip` và `tar` chỉ xuất hiện trong node_modules như transitive dep (`onnxruntime-node` kéo adm-zip; `fastembed` kéo tar) và **không** package.json workspace nào khai báo chúng. Cũng đừng port `pi-ref/packages/coding-agent/src/utils/zip.ts` tự chế của pi — **đường dẫn đó thuộc repo thượng nguồn `pi`, không phải repo này** (`packages/coding-agent/src/utils/zip.ts` không tồn tại ở đây). Nó dựng ZIP classic bằng `deflateRawSync` bằng tay, trùng lặp với một helper trung tâm mà AGENTS.md cấm. |
| Phần tóm tắt hội thoại do LLM viết là một phần của bundle. (plan:1988-1989, 2012-2013) | TRUE, nhưng bản port KHÔNG được nguyên văn | pi giữ prompt tóm tắt dưới dạng hai hằng template-literal nội tuyến, `BUG_SUMMARY_SYSTEM_PROMPT` và `BUG_SUMMARY_INSTRUCTIONS` (bug-report.ts:316-333). AGENTS.md cấm dựng prompt trong code — prompt phải nằm trong file `.md` tĩnh với Handlebars cho phần động, import `with { type: "text" }`. Nên prompt này phải được tách ra thành `packages/coding-agent/src/prompts/diagnostics/bug-summary.md` trong lúc port. Cấu trúc bốn mục của nó (What the user was doing / What went wrong / Steps to reproduce / Relevant details) và ràng buộc kết ('Do not include file contents, secrets, or credentials from the transcript; refer to files by path only') nên được giữ nguyên văn trong file `.md`. Quy ước `with { type: "text" }` đã xác nhận tại `packages/coding-agent/src/advisor/advise-tool.ts:13` và `auto-thinking/classifier.ts:18`. |
| Plan không nói crash writer gắn ở đâu, và hàm ý một process handler thô. (plan:2004-2006, im lặng về wiring) | OMISSION — một rủi ro wiring thật | omp đã dồn SIGINT/SIGTERM/SIGHUP/uncaughtException qua `@oh-my-pi/pi-utils/postmortem`. Thêm `process.on("uncaughtException")` thô sẽ tranh với teardown sẵn có và là rủi ro hồi quy. Điểm gắn đúng là `postmortem.register(id, callback)` (dòng 661) cho đường cleanup/exit và `interceptUnhandledRejections(interceptor)` (dòng 453) cho các rejection lẽ ra giết phiên. Lưu ý thêm: `packages/coding-agent/src/session/session-teardown.ts` được nhắc trong comment ở `modes/interactive-mode.ts:1600` và `extensibility/extensions/managed-timers.ts:7` nhưng **không tồn tại** tại HEAD — đừng đi tìm nó. `git grep -rn 'uncaughtException' -- packages/coding-agent/src packages/utils/src` không trả về chỗ đăng ký `process.on("uncaughtException")` nào. |
| W17 đưa redaction contract vào như thể không có gì tương đương trong omp. (plan:1978-1980) | INCOMPLETE — có tiền lệ và phải gọi tên | omp đã ship sẵn một redactor theo tên key: `SECRET_KEY` khai báo tại `packages/coding-agent/src/mcp/errors.ts:45` (regex literal ở dòng 46) và `sanitizeData` đệ quy tại `:100` thay giá trị dưới key khớp bằng `[redacted]` (phép thay ở `:117`), có giới hạn độ sâu/số entry và phát hiện vòng lặp. Nó là module-private — `grep -n '^export'` trên file đó cho 8 export, không cái nào là `sanitizeData` hay `SECRET_KEY`. Nó cố ý **LỎNG** hơn quy tắc của plan (so khớp substring, không chuẩn hoá camelCase, và comment của nó nói các tên ghép như `clientSecret` và `signingSecret` phải được xếp là secret). Vậy W17 là port-và-siết, không phải hiện thực lần đầu, và module mới phải là nơi mang quy tắc chặt hơn, có anchor biên. Theo AGENTS.md, hai hiện thực là thứ cần về sau dọn dẹp, nhưng bản của mcp nuôi output lỗi sống, nên refactor là việc theo sau chứ không phải W17. `git grep -rn SENSITIVE_KEY -- packages/` → **không** hit, xác nhận quy tắc đúng như plan chưa tồn tại. |
| Môi trường: git HEAD là `5873776`. (task text) | STALE | HEAD là `ecd516f` ("feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers"), trên nhánh `milestone-1`, chỉ có `.lavish-wip/` chưa track. **Mọi anchor trong spec này được kiểm chứng trên `ecd516f`.** |
| Môi trường: `bun test` cần native addon; `bun run check:ts` không cần. (task text) | CONFIRMED, và cách sửa đã được đo lại | `bun run check:ts` hoàn tất xanh trên cả 15 package tại HEAD khi chưa áp dụng thay đổi W17 nào, và nó không cần addon. Trên máy **chưa build**, `bun test packages/coding-agent/test/memory-redaction.test.ts` báo `0 pass, 1 fail, 1 error` với "Failed to load pi_natives native addon for darwin-arm64" — nhưng đó là **thiếu một bước build**, không phải hạn chế của máy. `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần (exit 0) là cổng test chạy; sau đó `bun test packages/utils/test/` cho 743 pass / 10 skip / 0 fail. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W17.md`.

**Cảnh báo neo.** Mỗi dòng dưới đây đã được mở bằng `sed -n "<n>p"` / `rg -n` / `git show`.

**Neo SAI hoặc LỆCH (dùng số đúng trong phiếu, KHÔNG dùng số của plan):**

| neo trong work item | thực tế | cách tìm lại |
| --- | --- | --- |
| `pi-ref/…/bug-report.ts:316-333` cho `BUG_SUMMARY_SYSTEM_PROMPT` + `BUG_SUMMARY_INSTRUCTIONS` | **Sai.** Ở `:282` và `:286`, kết thúc `:300`. Dòng 316 nằm giữa `selectMessages` và `GenerateBugReport…` | |
| `pi-ref/…/bug-report.ts:119-215` cho "collector metadata/diagnostics" | **Lệch.** `collectBugReportMetadata` ở `:154-181`; `collectBugReportDiagnostics` ở `:183-232`. Dòng 119 là giữa `describeProvi…` | |
| `pi-ref/…/bug-report.ts:232-263` cho "danh sách file + hàm ghi archive" | **Lệch.** `bugReportFiles` ở `:252-272`, `writeBugReportArchive` ở `:274-276`, `bugReportArchiveFileName` ở `:278-280` | `rg -n` |
| `pi-ref/…/bug-report.ts:17-60` cho redaction contract | **Lệch 1 về cuối.** Contract kết thúc ở `:59`; `:60` là dòng trống. Nội dung đúng tuyệt đối | `sed -n '59p'` → `}`, `sed -n '60p'` → rỗng |
| `pi-ref/…/crash-log.ts:47-113` cho `findExtensionStackMatches` | **Lệch.** Khối thật là **`:46-120`**: `type ExtensionStackMetadata` ở 46, `findExtensionStackMatches` ở 70, đóng ở 120 | `rg -n` |
| `packages/utils/src/dirs.ts:955` = `getCrashLogPath` | **Đúng ở `ecd516f`, lệch ở HEAD** (docblock đã dài thêm) | `git show` |
| `postmortem.ts:661` = `register(id, callback)` | **Đúng ở `ecd516f`, ở HEAD nó ở `:673`** (docblock bắt đầu 658) | `git show` |
| `postmortem.ts:453` = `interceptUnhandledRejections(interceptor)` | **Đúng ở `ecd516f`, ở HEAD nó ở `:465`** | `git show` |
| `builtin-session.ts:338-355` cho "mô hình `/usage`" | **Sai phạm vi.** 338-355 chỉ phủ tới giữa `handle`. Entry đầy đủ là **`:338-384`**; `handleTui` bắt đầu ở `:365` | `awk` |
| `auto-thinking/classifier.ts:18` cho quy ước `with { type: "text" }` | **Đúng ở `ecd516f`, lệch ở HEAD** (dòng 18 nay là `import type { ModelRegistry }`) | `git show` |
| "Môi trường: `bun test` bị chặn bởi native addon thiếu" | **Đúng ở `ecd516f`, SAI ở HEAD** — addon đã build (185 MB) | đã chạy |
| "Môi trường: git HEAD là `ecd516f`" | **SAI hôm nay** — HEAD là `65cc6c1`, đã đi qua 3 commit | `git log` |
| "pi-ref không phải thư mục trong repo ultraworkers" | **Đúng** — checkout riêng tại `/Users/tranquangdang21/Projects/pi-ref/`; cả 8 cây tham chiếu đều tồn tại | `ls -d` |

Còn **đúng**: `crash-log.ts` của pi là 169 LOC, `bug-report.ts` của pi là 375 LOC, `builtin-lifecycle.ts:545-553` đúng ở cả hai commit. Các neo đúng khác: `pi-ref/…/bug-report.ts:17`, `:19`, `:20`, `:22-23`, `:28`, `:52`, `:137`/`:142`, `:163`, `:168`, `:261`, `:274-276`, `:282-284`, `:286-300`; `crash-log.ts:6-15`, `:17-18`, `:20-22`, `:123-143`, `:146-161`, `:163-169`; `builtin-lifecycle.ts:546-548`; `builtin-registry.ts:39-47`.

**Bảng điểm sửa.** TRƯỚC được trích nguyên văn từ file thật ở HEAD `65cc6c1` (hoặc từ pi-ref với đường dẫn tuyệt đối đã nêu).

| path | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/diagnostics/redact.ts` | *(file mới)* | **không tồn tại** (`ls packages/coding-agent/src/diagnostics` → `No such file or directory`) | `const REDACTED = "<redacted>"` + `SENSITIVE_KEY` + `isSensitiveKey` / `redactUrl` / `redactJsonValue` |
| `packages/coding-agent/src/diagnostics/crash-log.ts` | *(file mới)* | **không tồn tại** | `export interface CrashRecord` + `recordCrash` / `takeUnnotifiedCrash` / `clearCrashLog` |
| `packages/coding-agent/src/diagnostics/bug-report.ts` | *(file mới)* | **không tồn tại** | `BUG_REPORT_SCHEMA_VERSION = 1`, `BUG_REPORT_CUSTOM_ENTRY_TYPE = "omp.bug-report"`, `BugReportBundle`, `bugReportFiles`, `writeBugReportArchive` |
| `packages/coding-agent/src/prompts/diagnostics/bug-summary.md` | *(file mới)* | **không tồn tại** | Template Handlebars |
| `packages/coding-agent/src/diagnostics/index.ts` | *(file mới)* | **không tồn tại** | `export * from "./bug-report";`<br>`export * from "./crash-log";`<br>`export * from "./redact";` |
| `packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:545-553` | `BUILTIN_LIFECYCLE_SLASH_COMMANDS` (khai ở `:163`) — entry `debug` | `	{`<br>`		name: "debug",`<br>`		icon: "bug",`<br>`		description: "Open debug tools selector",`<br>`	},` | thêm subcommand con trỏ vào helper mới |
| `packages/coding-agent/src/slash-commands/helpers/bug-report.ts` | *(file mới)* | **không tồn tại** | Adapter mỏng: `parseSubcommand` → hỏi opt-in → dựng bundle |
| `packages/coding-agent/test/diagnostics/redact.test.ts` | *(file mới)* | **không tồn tại** | 7 `it` trong 1 `describe` |
| `packages/coding-agent/test/diagnostics/bug-report.test.ts` | *(file mới)* | **không tồn tại** | Bundle shape + opt-in hai chiều + crash ring round-trip qua `TempDir` |
| `packages/coding-agent/CHANGELOG.md` `## [Unreleased]` | — | Không có mục nào về `/bug-report` | thêm một dòng hướng người dùng |

**`redact.ts` — dán nguyên văn từ nguồn, không sửa một ký tự.** Đây là **toàn bộ** hợp đồng redaction; trích từ `pi-ref/packages/coding-agent/src/core/bug-report.ts:19-59`, port nguyên văn (chỉ đổi `core` → `diagnostics`):

```typescript
// packages/coding-agent/src/diagnostics/redact.ts — self-contained, no imports.
const REDACTED = "<redacted>";
const SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key|secret|token|password|passwd|credential|authorization|cookie)(?:$|[-_])/i;

export function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY.test(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

/** Strip credentials and secret-looking query parameters from a URL. */
export function redactUrl(value: string): string {
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
			if (child !== null && child !== undefined && isSensitiveKey(key)) return REDACTED;
			return typeof child === "string" ? redactUrl(child) : child;
		}),
	);
}
```

Nếu `isSensitiveKey` cần export để test nhắm trực tiếp, export nó **cùng dòng khai báo** — đừng tách một dòng `export { isSensitiveKey }` ở cuối file.

**Ba cổng opt-in — KHÔNG được rút gọn thành một.** Đây là hợp đồng quan trọng nhất của work item; hai chỗ này phải **cùng tồn tại**, bỏ một chỗ là rò transcript.
- **Cổng 1 — collector**: `included: options.includeSession,` là **cờ tham báo, KHÔNG phải cổng**; `...(options.includeSession ? { cwd: options.cwd } : {})` mới là cổng. Và `includeSession: boolean;` trong interface là **bắt buộc, không có `?`**.
- **Cổng 2 — danh sách file**: `if (bundle.sessionJsonl !== undefined) { files.push({ name: "session.jsonl", … }); }`.
- **Cổng 3 — ghi archive**: KHÔNG port `writeZipArchive` tự chế của pi (file `../utils/zip.ts` **không tồn tại** ở repo này). Dùng:
```typescript
export async function writeBugReportArchive(bundle: BugReportBundle, filePath: string): Promise<void> {
	await writeArchive(filePath, "zip", bugReportFiles(bundle).map(f => [f.name, f.data] as const));
}
```
Đã kiểm `writeArchive` nhận `"zip"`: `packages/utils/src/ar/write.ts:49` là `export async function writeArchive(` và thân nó dispatch qua `encodeArchive`; format `zip` đi qua `encodeZip`.

**`crash-log.ts` — phần lõi mang được, phần bỏ.** **BỎ** (`pi-ref/…/core/crash-log.ts:46-120`, 75 dòng): `type ExtensionStackMetadata`, `normalizeStackPath` (`:48`), `stackContainsPath` (`:52`), `findExtensionStackMatches` (`:70-120`). **MANG** (port gần nguyên văn): `CrashRecord` (`:6-15`, giữ nguyên 9 field); `MAX_CRASH_RECORDS = 5` / `MAX_AGE` (`:17-18`, giữ nguyên); `readCrashLog(filePath = getCrashLogPath())` (`:24-39`) — **thay** `crashLogPath()` bằng `getCrashLogPath()`, giữ nguyên bộ lọc shape và `catch { return []; }`; `writeCrashLog(records, filePath)` (`:41-44`) — `fs.mkdirSync(fsPath.dirname(filePath), { recursive: true })` + `fs.writeFileSync`; `recordCrash` (`:123-143`) giữ `catch { return undefined; }` — best-effort, không bao giờ ném; `takeUnnotifiedCrash` (`:146-161`) giữ `now - Date.parse(record.timestamp) <= MAX_AGE`; `clearCrashLog` (`:163-169`) giữ `rmSync(path, { force: true })` trong try/catch. Import bắt buộc (namespace import cho `node:fs`, `node:path`; sync có chủ ý vì module chạy lúc tiến trình đang chết):
```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import { getCrashLogPath, VERSION } from "@oh-my-pi/pi-utils";
```
Tham số của pi tên là `path`, trong khi module này đã import namespace `path` — **đổi tên tham số thành `filePath`**.

**Các bước có neo đã kiểm.** Bảy phần, theo bảng điểm sửa ở trên: (1) tạo `redact.ts` dán nguyên văn; (2) tạo `crash-log.ts`; (3) tạo `bug-report.ts` với ba cổng; (4) tạo `bug-summary.md`; (5) tạo `diagnostics/index.ts`; (6) thêm subcommand vào `builtin-lifecycle.ts:545-553` + adapter `slash-commands/helpers/bug-report.ts`; (7) test + changelog.

**Hợp đồng test.** `packages/coding-agent/test/diagnostics/redact.test.ts` — 7 case:

| # | `it(...)` | assert | người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | `redacts a camelCase apiKey` | `redactJsonValue({ apiKey: "sk-live-XYZ" })` → `{ apiKey: "<redacted>" }` | **Case nâng đỡ.** Bỏ `.replace(/([a-z0-9])([A-Z])/g, "$1_$2")` → case này **đỏ một mình**. Người dùng đính archive lộ API key dạng camelCase |
| 2 | `redacts separated-case spellings of the same key` | cùng object với `api_key` và `API-KEY` → cả hai `<redacted>` | một sửa đổi sau siết anchor âm thầm thu hẹp quy tắc → provider config ghi `API-KEY` bị lộ |
| 3 | `redacts credentials inside a nested URL scheme` | `redactUrl("git+https://user:pass@host/x?token=abc")` không còn `pass`/`abc` | mất dòng đệ quy dòng 28 → `redactUrl` rơi xuống `new URL` và trả nguyên đầu vào |
| 4 | `redacts secret params and preserves harmless params byte-for-byte` | **trong một test**: `?token=abc&page=2` → `token` thành `<redacted>` **và** `page=2` còn nguyên byte | redact quá (mất `page`) và redact thiếu (lọt `token`) |
| 5 | `scans nested config-shaped objects` | `{ client: { authorization: "Bearer …" } }` → `<redacted>` ở tầng trong | quét chỉ ở tầng ngoài → credential lồng trong `client.headers` bị lọt |
| 6 | `a diagnostics bundle keeps its non-secret fields` | bundle có **một field không-phải-secret đã biết** còn sống trong `diagnostics.json` | assert chỉ "secret vắng mặt" pass tầm thường trên bundle rỗng |
| 7 | `omits session.jsonl from the archive without opt-in` | `bugReportFiles(bundle)` không có entry tên `session.jsonl` | toàn bộ transcript hội thoại của người dùng nằm trong archive họ định đính công khai |

`packages/coding-agent/test/diagnostics/bug-report.test.ts` — 4 case: (8) `includes session.jsonl once the session was explicitly included` — `bugReportFiles({ …bundle, sessionJsonl: "…" })` **có** đúng một entry `session.jsonl` (nửa còn lại của cổng 3); (9) `writes a zip archive containing report.json and diagnostics.json` — `writeBugReportArchive(bundle, join(tmp, "b.zip"))` rồi đọc lại bằng `openArchive` từ `@oh-my-pi/pi-utils/ar`; (10) `round-trips a crash through a temp directory` — `recordCrash(...)` → `takeUnnotifiedCrash(p)` trả về đúng record; gọi lần hai trả `undefined`; (11) `keeps at most five crash records` — ghi 7 crash, `readCrashLog(p).length === 5` và bản ghi còn lại là 5 cái **mới nhất**.

**Cổng có đỏ được không.** **CÓ — bảy điều kiện, và bảy điều kiện đều chạy được ngay tại HEAD.** Điểm này **khác** khẳng định của work item ( nó nói "`bun test` **KHÔNG** chạy được trong checkout này … 0 pass, 1 fail" ): `bun test packages/coding-agent/test/memory-redaction.test.ts` → `9 pass / 0 fail / 37 expect()`; `bash-executor.test.ts` → `68 pass / 0 fail / 182 expect()` (file này import `pi-natives`, nên nó **là** bằng chứng addon nạp được); `ls packages/natives/native/` → addon 185 MB; `bun run check:ts` xanh trên cả 15 package. ⇒ cổng này **có thể đỏ thật ngay bây giờ**, không cần build addon trước; bước 1 trong lệnh chỉ là để checkout sạch/máy mới có addon.

| # | phép kiểm | đỏ khi |
| --- | --- | --- |
| 1 | `bun test …/redact.test.ts` | bất kỳ case nào trong 7 case |
| 2 | xoá `.replace(/([a-z0-9])([A-Z])/g, "$1_$2")` tạm, chạy lại | **case (1) và chỉ case (1) phải đỏ.** Nếu không có gì đỏ → case (1) không test điều nó tuyên bố → viết lại case trước khi coi W17 xong |
| 3 | `git grep -n 'SENSITIVE_KEY' -- packages/coding-agent/src/diagnostics/` | đỏ khi rule không nằm trong file được ship (chỉ nằm trong comment) |
| 4 | assert `bugReportFiles` **không** có `session.jsonl` khi không opt-in **và** **có** khi opt-in — cùng một lần chạy | đỏ khi một trong hai nửa vắng |
| 5 | assert một field không-phải-secret còn sống trong `diagnostics.json` | đỏ khi mọi assert chỉ có dạng "secret vắng mặt" (tiêu chí loại) |
| 6 | `bun run check:ts` | đỏ khi có lỗi kiểu |
| 7 | grep `console.` / `adm-zip` / `from "tar"` | đỏ khi có bất kỳ hit nào |

**Cạm bẫy riêng của mục này.** Cái dễ làm sai nhất là **để `included:` bị đọc nhầm là cổng** trong khi thực tế nó chỉ là cờ tham báo — cổng thật là `...(options.includeSession ? { cwd: options.cwd } : {})` ở collector và `if (bundle.sessionJsonl !== undefined)` ở `bugReportFiles`. Bỏ đúng một trong hai thì transcript của người dùng nằm trong archive họ định đính công khai, mà **test vẫn có thể xanh** nếu bạn chỉ assert `included`. Vì vậy case 7 và case 8 phải nằm **cùng một lần chạy**. Hai lỗi còn lại đã ghi ở mục neo: (a) không port `writeZipArchive` của pi vì `../utils/zip.ts` không tồn tại ở repo này — dùng `writeArchive` từ `@oh-my-pi/pi-utils/ar`; (b) đừng để tên tham số `path` trong `crash-log.ts` vì module đã import namespace `path` từ `node:path`.

---

## W18. GAP-M1-18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù

**Thay đổi gì:** Biến `runDoctorChecks` + `formatDoctorResults` — hai export đang chết trong `extensibility/plugins/doctor.ts` — thành một bề mặt chẩn đoán thật: một module thu thập check **không phụ thuộc TUI** trả `readonly DoctorCheck[]` (mỗi phần tử có `severity` + `name` + `detail` + `remedy`), một bảng registry trong đó mỗi check là một hàm thuần, và **hai lối ra dùng chung một module** — `omp doctor` (stdout, `exit 0\|1`) và một mục trong `/debug`. Kèm header tự cảnh báo (check nào hỏng tiền đề thì in "không kiểm được X vì Y" thay vì im lặng bỏ qua) và `mkdirSync` với `mode: 0o700` cho thư mục log.
*(Mục `GAP-M1-18` của `.lavish-wip/GAP-REGISTER-2.md`, gộp từ `codex.127` + `dsh.105` + `gajae.33` + `gajae.106` — ba phát biểu khác nhau về cùng một lệnh, giữ ba mục nghĩa là ba lần sửa cùng một tệp ở ba milestone khác nhau.)*

**Wave:** Wave 8. Sổ đăng ký xếp mục này "ngay sau W17" — nó không chặn gì, và M1 không có tiền lệ (W13, W17 không chặn gì), nên làm ở đây thì dead code có consumer thật sớm nhất. Lý do **không** đặt ở M4 Wave D như đề xuất ban đầu: M4-9 (`omp extensions-triage`) đang mở đúng đường `cli-commands.ts` mà `doctor` cũng cần, và bảng cổng của M4-9 tự nói rằng "Command có thật sự được đăng ký hay không" là thứ **không cổng nào bắt được** — đặt hai lệnh mới vào cùng một milestone làm một điểm mù không có test bắt trở thành hai.

**Effort:** M.

**Người dùng thấy:** `omp doctor` trở thành một lệnh thật: in ra một bảng check có `severity` + `detail` + `remedy`, và **tự nói ra chỗ nó mù** — check nào không chạy được vì tiền đề hỏng thì in lý do thay vì im lặng bỏ qua và báo xanh. `~/.omp/logs` được tạo với `mode: 0o700` thay vì theo umask, và `doctor` báo ra mode thật. Cùng một module đó xuất hiện trong `/debug`.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts` | sửa | Tách `runDoctorChecks` (dòng 5) thành module thu thập check không phụ thuộc TUI, trả `readonly DoctorCheck[]` có `severity` + `name` + `detail` + `remedy`. Thêm bảng registry check, mỗi check là một hàm thuần. `formatDoctorResults` ngồi cạnh giữ vai trò định dạng. **Giữ nguyên export** kể cả sau khi có consumer. | Có — `runDoctorChecks` đúng **1 hit toàn repo**, là chính dòng định nghĩa; `formatDoctorResults` cũng chết. |
| `packages/coding-agent/src/cli-commands.ts` | sửa | Thêm mục `doctor`. Điều kiện bảo toàn tuyệt đối: thiếu mục này thì `omp doctor` rơi xuống `runCli` và **argv thành prompt cho LLM** (hồi quy #1499/#1496). Merge cùng W22. | Có — 49 lệnh cấp một; `grep -c 'name: "doctor"'` → **0**. |
| `packages/coding-agent/src/images-cli.ts` | **không sửa** (đọc làm khuôn) | `ImagesDoctorResult` (`:136-145`) đã có sẵn `exitCode` + `healthy` + `checks` — dùng lại làm khuôn, không phát minh shape mới. | Có |
| `packages/coding-agent/src/extensibility/plugins/plugin-cli.ts` | **không sửa** | `plugin-cli.ts:32` là doctor thứ hai hẹp đang có; verb `doctor` ở `:672` phải giữ nguyên hành vi. | Có |
| `packages/utils/src/logger.ts` | sửa | Dòng 171: `fs.mkdirSync(dir, { recursive: true })` thêm `mode: 0o700`. Phải **giữ nguyên** `recursive: true` — chỉ thêm `mode`. | Có |
| `packages/coding-agent/test/doctor/doctor.test.ts` | tạo | Hợp đồng: hai lối ra dùng chung một module; header tự cảnh báo; check credential chỉ báo có/không. Chi tiết ở mục *Hợp đồng test*. | **không** — file mới, hư mục `test/doctor/` chưa tồn tại; chưa chạy được hôm nay vì native addon chưa build |

### Các bước

1. **Chốt danh sách check TRƯỚC khi viết dòng nào** — đây là `GAP-D4`, xem mục *Cần người quyết*. Danh sách đã chốt trong sổ: config parse + `assertKnownSettingPaths`; credential reachability cho provider đang chọn (**chỉ báo có/không, không in giá trị**); parity `patches/*.patch` ↔ `package.json.patchedDependencies`; thư mục log; số extension active; `PATH`/`which` cho `git`; native addon đã build chưa. **Không** đưa vào: probe network, sandbox, bất kỳ thứ gì cần network.
2. **Tách module thu thập check** khỏi bất kỳ thứ gì của TUI. `runDoctorChecks` trả `readonly DoctorCheck[]`; `formatDoctorResults` nhận đúng mảng đó. Giữ nguyên tên export.
3. **Bảng registry check**, mỗi check là một hàm thuần — không check nào được tự ghi vào global hay đọc TUI.
4. **Hai lối ra dùng chung một module**: `omp doctor` (stdout, `exit 0\|1`) và một mục trong `/debug`. Đây là bước biến một script thành một hợp đồng test được.
5. **Header tự cảnh báo** (từ `dsh.105`): check nào hỏng tiền đề thì in "không kiểm được X vì Y" thay vì im lặng bỏ qua. **Áp dụng bắt buộc cho check ledger** — nếu GAP-M4-10 (sổ bản vá phụ thuộc cục bộ, M4) chưa merge, check phải nói *đó*, không được báo xanh.
6. **`mkdirSync` với `mode: 0o700`** tại `packages/utils/src/logger.ts:171`, giữ `recursive: true`; thêm một dòng trong doctor báo mode thật.
7. **Thêm mục `doctor`** vào `cli-commands.ts` — cùng đợt merge với W22, và dùng chung **một** assertion phân tuyến với W22.
8. **Viết test** theo *Hợp đồng test* dưới đây.
9. **Build native addon rồi chạy toàn bộ cổng**: `bun --cwd=packages/natives run build`, `bun run check:ts`, `bun test packages/coding-agent/test/doctor/`.

### Hình dạng code

```typescript
// packages/coding-agent/src/extensibility/plugins/doctor.ts — thu thập check KHÔNG
// phụ thuộc TUI. `omp doctor` và mục trong `/debug` gọi ĐÚNG module này; tách
// thành hai bản thì bước "biến một script thành một hợp đồng test được" là vô nghĩa.
export interface DoctorCheck {
	// Tập giá trị của `severity` CHƯA chốt — nó là một phần của GAP-D4 và phải
	// có trước bước 1, không phải sau. Đừng tự chọn rồi coi như đã chốt.
	readonly severity: string;
	readonly name: string;
	readonly detail: string;
	readonly remedy: string;
}

export function runDoctorChecks(): readonly DoctorCheck[] { /* … bảng registry … */ }
export function formatDoctorResults(checks: readonly DoctorCheck[]): string { /* … */ }

// Khuôn có thật để đối chiếu, không phát minh: ImagesDoctorResult tại
// packages/coding-agent/src/images-cli.ts:136-145 đã có sẵn
// exitCode + healthy + checks.
```

### Hợp đồng test

Hợp đồng quan sát được: **cùng một tập `name` đi ra từ cả hai lối ra**, và một check không chạy được thì **nói ra là không chạy được** chứ không biến mất.

- **(1)** `omp doctor` và mục `/debug` trả cùng một tập `name`, theo cùng một thứ tự. Đây là case bắt được việc tách hai bản module — dạng hỏng đó xanh hoàn toàn vì mỗi bản tự đúng với chính nó.
- **(2)** Khi tiền đề của một check hỏng (ví dụ ledger `patches/*.patch` chưa có nguồn), output phải chứa dòng "không kiểm được X vì Y" và **không** được chứa một dòng báo xanh cho X. Assert **cả hai chiều cùng lúc** — assert thiếu dòng cảnh báo thì im lặng vẫn xanh, assert có dòng cảnh báo thì báo xanh song song vẫn xanh.
- **(3)** Check credential reachability: assert output **có** nói provider đang chọn tới được hay không, và assert giá trị key **không** xuất hiện. Đây là bản âm phủ định của hợp đồng "chỉ báo có/không, không in giá trị".
- **(4)** `exit 0\|1` là hợp đồng: có check lỗi thì `exit 1`, sạch hết thì `exit 0`. Chỉ assert `exit 0` là xanh tầm thường.
- **(5)** Danh sách check ở bước 1 là một hợp đồng của riêng nó: **mọi check thêm sau này phải tự chứng minh bằng một test** — không thêm check chỉ vì "thông tin này hữu ích". Đây là nửa còn lại của `GAP-D4` và nó không tự kiểm được, nên nó là quy tắc review chứ không phải assertion.

Người dùng vỡ nếu hồi quy là `doctor` báo xanh trên một máy mà ledger đã hỏng, và người đó tin báo cáo rồi debug sai chỗ cả buổi.

### Xác minh

```bash
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
bun run check:ts
bun test packages/coding-agent/test/doctor/
grep -c 'name: "doctor"' packages/coding-agent/src/cli-commands.ts   # phải ≥ 1, không phải 0
bun run doctor     # exit 0|1; exit 1 thì kiểm tra remedy có nghĩa không
```

### Cổng hoàn thành

W18 xong khi **tất cả** các điều dưới đây đều đúng, và cổng này **có thể đỏ** — mỗi dòng đỏ nếu phần công việc tương ứng bị thiếu:

1. `grep -c 'name: "doctor"' packages/coding-agent/src/cli-commands.ts` ≥ **1**. Đây là dòng đỏ đầu tiên và rẻ nhất: thiếu mục này thì `omp doctor` rơi xuống `runCli` và argv thành prompt cho LLM.
2. `bun run doctor` trả `exit 1` khi có check `severity` lỗi và `exit 0` khi sạch — cả hai vế trong cùng một đợt.
3. `bun test packages/coding-agent/test/doctor/` xanh, và case (2) đỏ **riêng** nếu xoá nhánh header tự cảnh báo (bằng chứng nâng đỡ: xoá nhánh đó, xác nhận đúng case (2) đỏ, khôi phục lại).
4. `plugins/doctor.ts` vẫn export `runDoctorChecks` và `formatDoctorResults` sau khi có consumer. Không assert bằng source-grep trong test — kiểm bằng import.
5. `fs.mkdirSync` ở `packages/utils/src/logger.ts` **vẫn còn `recursive: true`** và đã có `mode: 0o700`.
6. Ba verb `doctor` sẵn có (`plugin-cli.ts:672`, `images-cli.ts:546`) giữ nguyên hành vi — `bun test` các suite `images`/`plugin` hiện có vẫn xanh.
7. `bun run check:ts` xanh (không dùng `tsc` / `npx tsc`).

**Tiền đề môi trường:** cần addon native. Trên máy chưa build, `bun test` báo `0 pass, 1 fail` với "Failed to load pi_natives native addon for darwin-arm64" — đây **không phải** hạn chế của máy mà là **thiếu một bước build**. Làm một lần: `brew install ninja` rồi `bun --cwd=packages/natives run build` (exit 0). Sau đó toàn bộ cổng test của mục này chạy. Ở trạng thái chưa build, cổng thật duy nhất chạy được là `bun run check:ts` cộng dòng `grep` ở điều 1. **Đừng ghi work item này là xong chỉ dựa trên type-check.**

### Phụ thuộc

- `depends_on`: không.
- `blocks`: không work item nào trong M1. Nhưng W22 sửa **cùng file** `cli-commands.ts` và sổ bắt buộc hai cái dùng **một** assertion phân tuyến, nên chúng phải mở chung một đợt.

### Cách sai dễ nhất

**Biến `doctor` thành cái bẫy check tự phát.** `GAP-D4` gọi thẳng đây là "cái bẫy kinh điển vì mọi tính năng mới đều muốn thêm một check" — và mỗi check thêm vào mà không tự chứng minh bằng test làm bảng cổng dài ra cho tới khi không ai còn đọc, đúng thứ bảng cổng của M4-9 đã tự mô tả. Cách sửa là quy tắc, không phải code: chốt danh sách ở bước 1, sau đó mọi check mới phải mang theo test của nó và được review như một dòng mới trong hợp đồng.

Hai lối gần kế:
- **Cho một check hỏng tiền đề báo xanh.** Đây là hỏng âm thầm đúng kiểu item này sinh ra để chặn: ledger chưa có nguồn thì phải in "không kiểm được X vì Y", không được bỏ qua im lặng.
- **Tách `omp doctor` và `/debug` thành hai module.** Mỗi bản tự xanh với chính nó, và test cũng xanh vì chẳng test cái gì về bản kia — trong khi đúng thứ cần bảo vệ là chúng là **một** module.

### Cần người quyết

- **`GAP-D4` — chốt danh sách check trước khi viết dòng nào.** Câu hỏi: *`doctor` là cái bẫy kinh điển vì mọi tính năng mới đều muốn thêm một check.* Phương án trong sổ: chốt danh sách ở bước 1; **mọi check sau đó phải tự chứng minh được bằng một test** — không thêm check chỉ vì "thông tin này hữu ích"; và cần một quy tắc ghi vào **PR template**, không chỉ ý định miệng. Đây là quyết định **chặn bắt đầu** vì nó quyết định bước 1 có gõ được hay không.
- **Thứ tự merge với W22 là bắt buộc**, không phải khuyến nghị: cả hai sửa `cli-commands.ts`, và bảng cổng đỏ phải chứa **một** assertion *"mọi subcommand trong registry thật sự được phân tuyến"*, không phải hai assertion riêng. Lý do rất cụ thể: một lệnh thiếu trong `cli-commands.ts` rơi xuống `runCli` và argv thành prompt cho LLM — đó là hậu quả im lặng, và hai assertion rời rạc sẽ cho phép nó quay lại.
- **Thứ tự với W21 không quan trọng, nhưng phải nói rõ trong PR rằng `doctor` chạy trong tiến trình đã harden** — `dumpable=0` nghĩa là một check muốn đọc core dump sẽ không được.

### Đính chính so với plan

> Bảng này đính chính các claim của **`.lavish-wip/GAP-REGISTER-2.md`** (mục `GAP-M1-18`), không phải của `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.

| claim | verdict | correction |
| --- | --- | --- |
| "`cli-commands.ts` đăng ký 50 command" (mục `GAP-M1-18`) | SAI CON SỐ | Số thật là **49**. Con số 50 đếm bằng `grep -c 'name: "'`, tức tính cả tên option lồng nhau. Đo lại: `grep -oE '^\s+name: "[a-z0-9-]+"' packages/coding-agent/src/cli-commands.ts \| sort -u \| wc -l` → 49. Kết luận không đổi: `doctor` vẫn không có. Đính chính này do chính mục `GAP-M1-22` của sổ đưa ra, và W22 ghi lại. |
| "M3 đã **chủ động loại** cái này khỏi phạm vi (`:2013`, `:2552` — 'dead code thấy lúc đi ngang, cố ý KHÔNG vào scope')" (mục `GAP-M1-18`) | ĐÚNG, NHƯNG CHỈ NÓI VỀ M3 | Việc loại có thật, nhưng nó là quyết định của **M3**, và sổ kết luận "nên nó không thuộc đợt nào" — tức là nó rơi vào khoảng trống giữa các milestone, không phải vào phạm vi của M3. `GAP-REGISTER-2` xếp lại nó vào M1. Kỹ sư đọc trích dẫn M3 mà không đọc vế sau sẽ kết luận sai rằng item này bị loại vĩnh viễn. |
| "Nửa còn lại của `dsh.105` cũng thiếu: `packages/utils/src/logger.ts:171` gọi `fs.mkdirSync(dir, { recursive: true })` không truyền `mode`, nên `~/.omp/logs` theo umask." | CONFIRMED, và ràng buộc đi kèm là của sổ | Sửa phải **thêm `mode: 0o700`**, tuyệt đối không được bỏ `recursive: true` — nếu mất nó thì lần chạy đầu tiên với thư mục log chưa tồn tại sẽ ném `ENOENT`. Đây là điều kiện bảo toàn, không phải chi tiết tuỳ chọn. |
| "Ba doctor còn lại đều hẹp: `IMAGES_ACTIONS` (`images-cli.ts:50`) và `plugin-cli.ts:32`" | ĐÚNG, VÀ NÓ LÀ KHUÔN | Sổ gọi `ImagesDoctorResult` (`images-cli.ts:136-145`, đã có sẵn `exitCode` + `healthy` + `checks`) là "khuôn có thật — dùng lại, không phát minh". Hình dạng `DoctorCheck` của W18 phải đọc được qua khuôn đó, không phải một hình dạng thứ ba cạnh nó. |
| "Pháp lý: chỉ mang ý tưởng, không chép dòng nào" | CONFIRMED — và nên giữ nguyên lập trường | `codex-rs/cli/src/doctor.rs` là 4.352 dòng Rust mô tả sản phẩm có hàng trăm biến môi trường quản trị (managed-env, spoofed version) — á vào omp là vô nghĩa. Nhánh Apache-2.0 của codex: nếu lấy bất kỳ dòng nào thì bắt buộc giữ `LICENSE` 201 dòng + `NOTICE` (**dòng ghi công Ratatui theo MIT trong `NOTICE` — xoá là vi phạm Điều 4(d)**) + tuyên bố đã sửa đổi. `dsh` MIT, `gajae` MIT thuần. **Khuyến nghị: không lấy dòng nào** — phần duy nhất đáng học là *tính tụ lệnh*, mà omp đã có sẵn khuôn. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W18.md`.

**Cảnh báo — các điểm trong plan đã đo sai (đã đo lại, không sửa plan):**

| claim của plan | đo lại | kết luận |
| --- | --- | --- |
| `packages/coding-agent/src/images-cli.ts` | file này **không tồn tại** | đường dẫn thật: `packages/coding-agent/src/cli/images-cli.ts` |
| `packages/coding-agent/src/extensibility/plugins/plugin-cli.ts` | file này **không tồn tại** | đường dẫn thật: `packages/coding-agent/src/cli/plugin-cli.ts` |
| `ImagesDoctorResult` ở `images-cli.ts:136-145` | khai báo ở **`:137-143`** (136 và 145 trống) | nội dung đúng (`exitCode:139`, `healthy:141`, `checks:142`), chỉ lệch biên |
| `bun test` **không** chạy được (`0 pass, 1 fail`, native addon) | `bun test` chạy: **29 pass / 0 fail**; `import("@oh-my-pi/pi-natives")` OK, 128 export | claim **đã cũ** — cổng test chạy được ngay |
| `bun run doctor` | **không có** script `doctor` trong bất kỳ `package.json` nào | lệnh này hôm nay exit ≠ 0 vì *lệnh không tồn tại*, không phải vì doctor hỏng |

**Neo đúng:** `doctor.ts:5`, `formatDoctorResults` chết, 49 lệnh cấp một, `grep -c 'name: "doctor"'` → 0, `logger.ts:171`, `IMAGES_ACTIONS` `:50`, images doctor verb `:546`, `plugin-cli.ts:32` (`| "doctor"`), `plugin-cli.ts:672`, `codex-rs/cli/src/doctor.rs` = 4352 dòng, `LICENSE` = 201 dòng, `test/doctor/` chưa có.

**Bảng điểm sửa.** Cột TRƯỚC trích nguyên văn từ file đã mở.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/plugins/types.ts:169` | `DoctorCheck` | `export interface DoctorCheck {`<br>`	name: string;`<br>`	status: "ok" \| "warning" \| "error";`<br>`	message: string;`<br>`	fixed?: bool…` | đổi sang `severity` / `detail` / `remedy` theo khuôn `ImagesDoctorCheck` |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts:3` | import | `import type { DoctorCheck } from "./types";` | giữ nguyên — **không** khai báo lại `DoctorCheck` trong file này |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts:5` | `runDoctorChecks` | `export async function runDoctorChecks(): Promise<DoctorCheck[]> {` | `export function runDoctorChecks(): readonly DoctorCheck[]` — bảng registry, mỗi check một hàm thuần, bỏ `async` |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts:2` | import TUI | `import { theme } from "@oh-my-pi/pi-tui/theme";` | bỏ hẳn khỏi file — formatter không được chạm TUI |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts:43` | `formatDoctorResults` | `export function formatDoctorResults(checks: DoctorCheck[]): string {`<br>dùng `theme.status.enabled/warning/error` ở dòng 51/53/54 | bỏ `theme.*`, xuất text thuần |
| `packages/coding-agent/src/extensibility/plugins/manager.ts:969` | `PluginManager.doctor` | `	async doctor(options: DoctorOptions = {}): Promise<DoctorCheck[]> {` | đổi `name/status/message` → `severity/detail/remedy`; nếu bỏ bước này, `plugin-doctor-version-drift.test.ts` đỏ ngay |
| `packages/coding-agent/src/cli-commands.ts:102` | registry entry | khối `dry-balance` (`:102-106`) | chèn entry `doctor` giữa `config` (`:97-101`) và `dry-balance` |
| `packages/coding-agent/src/commands/doctor.ts` | command module | *(chưa tồn tại)* | `export default class Doctor extends Command`, `process.exitCode = 1` |
| `packages/coding-agent/src/cli/command-help.ts:53` | help constant | `export const dryBalanceHelp = {` | thêm `export const doctorHelp = { description: "…" } satisfies CommandMetadata;` |
| `packages/coding-agent/src/debug/index.ts:41` | `DEBUG_MENU_ITEMS` | mảng `SelectItem[]` 12 mục, `:41-67`, **không có** mục doctor | thêm `{ value: "doctor", label: "View: doctor report", description: … }` |
| `packages/utils/src/logger.ts:171` | `ensureDir` | `	fs.mkdirSync(dir, { recursive: true });` | `	fs.mkdirSync(dir, { recursive: true, mode: 0o700 });` — **giữ nguyên `recursive: true`** |
| `packages/coding-agent/src/config/settings.ts:225` | `assertKnownSettingPaths` | `function assertKnownSettingPaths(layer: RawSettings, prefix = "") {` (**không** `export`) | `export function …` để doctor gọi được |

**Các bước có neo đã kiểm.**

1. **Chốt danh sách 7 check TRƯỚC khi viết dòng nào** (`GAP-D4`): config parse + `assertKnownSettingPaths`; credential reachability (chỉ có/không); parity `patches/*.patch` ↔ `package.json.patchedDependencies` (cả hai đã tồn tại: `patches/`, `package.json:206`); thư mục log; số extension active; `PATH`/`$which` cho `git`; native addon. **Không** probe network.
2. **Đổi hình dạng `DoctorCheck` ở `types.ts:169`**, không phải trong `doctor.ts`. Dùng lại đúng khuôn có thật `ImagesDoctorCheck` (`cli/images-cli.ts:80-84`): `severity: ImagesDoctorSeverity` / `name` / `detail`, cộng `remedy`. `ImagesDoctorSeverity` (`:78`) là `"ok" | "warn" | "error"` — **khác** `"warning"` mà `types.ts:173` đang dùng. Chọn một, sửa cả hai cùng lúc.
3. **Sửa `manager.ts:969` `PluginManager.doctor()`** theo hình dạng mới.
4. **Viết lại `runDoctorChecks` (`doctor.ts:5`)** thành bảng registry. Giữ nguyên tên export. Bỏ `async` — không check nào cần await.
5. **Gỡ TUI khỏi `formatDoctorResults` (`doctor.ts:43`, import ở `:2`).** Chú thích ở `doctor.ts:44-45` hiện nói *"returns plain text without theming"* trong khi code lại đọc `theme.status.*` ở `:51/53/54` — chú thích đang nói dối.
6. **Thêm `exit 0|1`.** Theo đúng khuôn `images-cli.ts:545-546`: `const healthy = !checks.some(c => c.severity === "error")` → `exitCode: healthy ? 0 : 1`.
7. **Header tự cảnh báo**: check hỏng tiền đề thì phát ra một entry `severity: "warn"`, `name: "<tên check gốc>"`, `detail: "không kiểm được X vì Y"` — và **không** phát ra entry xanh cho X. Đây là nửa còn lại của `GAP-D4`.
8. **Tạo `commands/doctor.ts`** theo khuôn `commands/gc.ts:9-46` (dùng `process.exitCode = 1` ở `:44`, **không** dùng `process.exit(1)`), cộng `doctorHelp` trong `command-help.ts`.
9. **Đăng ký entry** ở `cli-commands.ts`, chèn giữa `config` (`:97-101`) và `dry-balance` (`:102-106`). Merge cùng W22, dùng **một** assertion phân tuyến.
10. **Thêm mục vào `/debug`**: `DEBUG_MENU_ITEMS` (`debug/index.ts:41-67`), mở từ `slash-commands/builtin-lifecycle.ts:545-553`.
11. **`logger.ts:171`**: thêm `mode: 0o700`, **giữ nguyên** `recursive: true`.
12. **Build rồi chạy cổng.**

**Hợp đồng test.** Tệp `packages/coding-agent/test/doctor/doctor.test.ts` (thư mục chưa tồn tại — sẽ tạo mới).

| # | case | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| 1 | `runDoctorChecks()` và entry `/debug` trả **cùng một tập `name`, cùng thứ tự** | hai bản module trôi nhau; `/debug` xanh, `omp doctor` đỏ, không ai biết |
| 2 | Khi tiền đề hỏng: output **có** dòng `không kiểm được X vì Y` **và** **không** có dòng xanh cho X — assert **cả hai chiều trong cùng một case** | `doctor` báo xanh trên máy lỗi đã hỏng; người đó tin báo cáo rồi mất thời gian tìm chỗ khác |
| 3 | Check credential: có nói provider tới được hay không, **và** giá trị key không xuất hiện trong output | in ra `sk-…`; đây là rò rỉ bí mật ra stdout/log |
| 4 | `exit 1` khi có `severity === "error"`, `exit 0` khi sạch — **cả hai vế trong cùng một đợt** | chỉ assert `exit 0` là xanh tầm thường; `doctor` luôn trả 0 nên CI không bao giờ đỏ |
| 5 | `runDoctorChecks` + `formatDoctorResults` **import** được sau khi có consumer (không source-grep) | bị xoá export trong một PR refactor; `omp doctor` hỏng lúc runtime |
| 6 | Phân tuyến: `resolveCliArgv(["doctor"])` trả `{ argv: ["doctor"] }`, **không** phải `{ argv: ["launch", "doctor"] }` | `omp doctor` biến thành prompt gửi cho LLM — hồi quy #1496/#1499 |

Case 6 nằm trong `cli-argv-routing.test.ts` (đã có) hoặc một tệp dùng chung với W22 — **một** assertion, không hai. Baseline đã đo (xanh trước khi sửa): `images-cli.test.ts` + `plugin-doctor-version-drift.test.ts` + `cli-argv-routing.test.ts` + `cli-command-metadata.test.ts` = **29 pass / 0 fail**.

**Cổng có đỏ được không.**

| # | lệnh | ĐỎ ĐƯỢC KHÔNG? | Bằng cách nào |
| --- | --- | --- | --- |
| 1 | `bun test …/cli-argv-routing.test.ts` | **CÓ** | thêm `doctor` → xanh; bỏ entry khỏi `cli-commands.ts` → `resolveCliArgv(["doctor"])` trả `{argv:["launch","doctor"]}` và case đỏ |
| 2 | `bun test …/test/doctor/` | **CÓ** | xoá nhánh header tự cảnh báo → case 2 đỏ (assert cả hai chiều nên không lách được) |
| 3 | `bun test …/cli-command-metadata.test.ts` | **CÓ — miễn phí, plan không nhắc** | `:30` yêu cầu mọi entry có `help`; `:33` `await entry.load()`; `:41` so help metadata với `static description` |
| 4 | `bun test …/plugin-doctor-version-drift.test.ts` | **CÓ** | đổi hình dạng `DoctorCheck` mà quên sửa `manager.ts:969` → đỏ |
| 5 | `bun test …/images-cli.test.ts` | **CÓ** | đụng `images-cli.ts` → đỏ; cũng là bằng chứng verb `doctor` cũ giữ nguyên hành vi |
| 6 | `bun run check:ts` | **CÓ** | cổng type |
| 7 | `bun run check:tools` | **CÓ** | `oxfmt --check` trên `packages/*/src/**`. Cả `doctor.ts` lẫn `types.ts` đều indent **tab** (đã kiểm bằng `od -c`: byte đầu là `\t`) — giữ nguyên tab khi sửa |

**Cổng KHÔNG đỏ được — phải viết lại:**

| claim của plan | vấn đề | viết lại |
| --- | --- | --- |
| `grep -c 'name: "doctor"' …cli-commands.ts` ≥ 1 | đây là **source-grep** — chính plan cấm trong test; và nó xanh cả khi `load()` trỏ sai file | thay bằng cổng 1 ở trên |
| `bun run doctor` trả `exit 0\|1` | **không có script `doctor`** trong bất kỳ `package.json` nào | thêm `"doctor": "bun packages/coding-agent/src/cli.ts doctor"` vào `package.json` gốc, **hoặc** đổi cổng thành case 4 trong test |
| "`bun test` không chạy được, chỉ `check:ts` + `grep` mới có tín hiệu" | **đã cũ** | bỏ hẳn; coi `bun test` là cổng thật |
| `fs.mkdirSync` còn `recursive: true` **và** có `mode: 0o700` | kiểm bằng grep là source-grep | kiểm bằng hành vi: tạo logger với `dir` chưa tồn tại, rồi `fs.stat(dir).mode & 0o777` phải bằng `0o700` |

⚠️ **Cổng `mode: 0o700` chỉ kiểm được trên thư mục CHƯA TỒN TẠI** — `ensureDir` (`logger.ts:169-174`) bọc trong `if (!fs.existsSync(dir))`. Trên máy đã chạy omp, `~/.omp/logs` đã có và giữ mode cũ. Đây là hành vi đúng, nhưng check "mode thật" ở bước 6 sẽ báo đỏ trên chính máy của kỹ sư — **đừng sửa check để "cho xanh".**

**Cạm bẫy riêng của mục này.**

1. **`DoctorCheck` đã tồn tại, ở file khác, và đang được dùng.** Nó nằm ở `types.ts:169`, không phải trong `doctor.ts`. Hình dạng code trong plan vẽ `export interface DoctorCheck` **trong** `doctor.ts` — làm vậy là đụng tên, và vì `plugins/index.ts:3` (`export * from "./doctor"`) cùng `:9` (`export type * from "./types"`) đều là star re-export, ambiguous export sẽ làm hỏng cả barrel. Tệ hơn: `manager.ts:969` đang trả `DoctorCheck[]` cho `plugin-cli.ts:672`.
2. **Hai bảng chữ `severity` khác nhau đã cùng tồn tại.** `types.ts:173` dùng `"ok" | "warning" | "error"`; `images-cli.ts:78` dùng `"ok" | "warn" | "error"`. Trộn hai bảng là `check:ts` đỏ ở `manager.ts` — nhưng dễ hiểu nhầm là lỗi của check mới.
3. **Ràng buộc TUI nẩm ở chỗ ngược với dự đoán.** `runDoctorChecks` đã **không** phụ thuộc TUI rồi (chỉ `$which` ở `doctor.ts:1` và `Bun.env`); thứ phụ thuộc TUI là `formatDoctorResults`. Đừng tốn công "tách collection khỏi TUI" — phần cần sửa là formatter.
4. **`runDoctorChecks` hôm nay hardcode 3 binary và 3 biến môi trường** (`doctor.ts:9-13`: `sd`/`sg`/`git`; `:25-29`: `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`EXA_API_KEY`). Check credential trong bước 1 nói *"provider đang chọn"* — đó là yêu cầu khác hẳn, và thay đổi nó là thay đổi hợp đồng, không phải refactor. `plugin-cli.ts:672` đã có `--fix`; danh sách bước 1 **không** có `--fix`, đừng tự thêm vào.
5. **`/debug` không phải một lệnh — nó là một menu.** `builtin-lifecycle.ts:546` gọi `showDebugSelector()`, dựng `DEBUG_MENU_ITEMS` ở `debug/index.ts:41-67`. Thêm "một mục trong `/debug`" nghĩa là thêm một phần tử `SelectItem` **và** một nhánh xử lý.
6. **Cái bẫy check tự phát đúng như plan cảnh báo.** 7 check ở bước 1 là hợp đồng; mọi check thêm sau đó phải mang test của nó.
7. **Đừng viết lại `bun run doctor` thành `process.exit(1)`.** Xem `commands/gc.ts:44`. `process.exit()` cắt mất flush của stdout; **14** tệp trong `src/commands/` dùng `process.exitCode`, và chỉ **3** (`git.ts`, `install.ts`, `say.ts`) dùng `process.exit(`.

## W19. GAP-M1-19 — Cấm `console.*` ở tầng thư viện bằng lint, thay vì bằng quy ước trong `AGENTS.md`

**Thay đổi gì:** Chuyển quy tắc "cấm `console.*` ở tầng thư viện" từ văn xuôi trong `AGENTS.md` xuống tầng lint: thêm `eslint/no-console: "error"` vào `.oxlintrc.json` với `overrides` allow-list **theo đường dẫn** cho đúng các entrypoint CLI mà `AGENTS.md` đã cho phép, sửa các file còn lại sang `logger`, và khoá allow-list bằng **test** chứ không bằng lint-ignore — để "vì sao file này được phép" trở thành giá trị quan sát được.
*(Mục `GAP-M1-19` của `.lavish-wip/GAP-REGISTER-2.md`, nguồn `codex.57`.)*

**Wave:** Wave 8. Sổ xếp "cùng sóng với W13" (Wave 2) vì cùng là một thay đổi kỷ luật nhỏ và độc lập tuyệt đối — nó không import gì của W13, không chạm file nào W13 chạm.

**Effort:** S — nửa ngày. Tỉ lệ giá trị/công sức cao nhất trong toàn sổ.

**Người dùng thấy:** Không có bề mặt mới. Đây là hàng rào cho những người viết sau: hôm nay `packages/ai/src/providers/cursor.ts:405` gọi `console.*` trong **provider wire code** — đúng loại lỗi mà `AGENTS.md` mô tả là "hỏng rendering hoặc hỏng protocol cho mọi consumer cùng lúc" — và quy tắc chỉ tồn tại bằng văn xuôi nên không có gì ngăn nó.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `.oxlintrc.json` | sửa | Thêm `eslint/no-console: "error"` cộng `overrides` **allow-list theo đường dẫn** cho `packages/*/src/cli/**`, `packages/*/src/commands/**`, `packages/metaharness/src/tb/cli.ts`. **Không** dùng `ignorePatterns` cho việc này. | Có — `grep -c 'no-console' .oxlintrc.json` → **0**; file đã có sẵn `ignorePatterns` 24 dòng. |
| `packages/ai/src/providers/cursor.ts` | sửa | Dòng 405: `console.*` trong **provider wire code** — đổi sang `logger`. Đây là case đáng chú ý nhất trong danh sách vì nó nằm đúng trên đường wire. | Có |
| `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts` | sửa | Dòng 149 và 156 đang dùng `console.log` làm **default parameter** (`logFn: (line: string) => void = console.log`) — cần đổi thành **sink rõ ràng, không phải đổi tên**. | Có |
| các file thư viện còn lại | sửa | `git grep -l 'console\.\(log\|error\|warn\|info\|debug\)' -- 'packages/*/src/**/*.ts' \| wc -l` → **33 file** dính trước khi rule bật; phần cần sửa tay sau khi các entrypoint được override là **~10 file**. Lấy danh sách bằng lệnh, đừng đoán. | Có — con số 33 đo được |
| `packages/tui/**` | **không sửa** | TUI đã sạch (`tab-bar.ts:54` chỉ là `console.log` trong *chú thích JSDoc*, không phải mã chạy) — **không** cần override. | Có |
| `packages/coding-agent/test/lint-no-console-allowlist.test.ts` | tạo | Allowlist **bằng test**, không bằng lint-ignore: mỗi đường dẫn được phép phải trả lời được "vì sao được phép". | **không** — file mới, chưa kiểm chứng |

### Các bước

1. **Thêm rule và `overrides`.** `eslint/no-console: "error"` ở cấp gốc; `overrides` theo đường dẫn cho đúng ba nhóm entrypoint nêu trong bảng file. **Đừng** đưa entrypoint vào `ignorePatterns`: file đã có sẵn 24 dòng đó, và đưa vào sẽ tắt **mọi** rule khác trên các file đó, không chỉ `no-console`.
2. **Sửa các file còn lại sang `logger`.** Riêng `mnemopi/src/core/migrations/e6-triplestore-split.ts:149,156` cần một sink rõ ràng — `console.log` làm default parameter thì đổi tên không sửa được gì.
3. **Allowlist bằng test**, không bằng lint-ignore.
4. **Cổng đỏ ngay:** thêm một `console.log` vào bất kỳ file thư viện nào, chạy `bun run lint`, xác nhận đỏ, xoá nó. Sổ nói thẳng: không cần test nào khác để chứng minh item này.
5. Chạy `bun run check:ts` cho phần type/format.

### Hình dạng code

```jsonc
// .oxlintrc.json — CHỈ phần liên quan. KHÔNG thêm entrypoint vào `ignorePatterns`:
// `ignorePatterns` tắt mọi rule trên các file đó, không chỉ `no-console`.
{
	"rules": {
		"eslint/no-console": "error"
	},
	"overrides": [
		{
			"files": ["packages/*/src/cli/**", "packages/*/src/commands/**", "packages/metaharness/src/tb/cli.ts"],
			"rules": { "eslint/no-console": "off" }
		}
	]
}
```

### Hợp đồng test

Hợp đồng quan sát được: một `console.*` mới ở tầng thư viện làm lint đỏ, và mỗi đường dẫn được miễn phải có một lý do được nêu tên trong test.

- **(1)** Thêm `console.log` vào một file thư viện bất kỳ → `bun run lint` đỏ. Đây là bằng chứng nâng đỡ: cổng phải đỏ **trước** khi xoá dòng đó. Bằng chứng nâng đỡ bắt buộc theo quy ước của tài liệu này.
- **(2)** Allowlist được khoá bằng test: một đường dẫn nằm trong `overrides` mà không có lý do tương ứng trong test là test đỏ. Đây là lý do sổ bắt khoá allowlist bằng test thay vì lint-ignore — lint-ignore không trả lời được "vì sao file này được phép".
- **(3)** Chiều ngược: một entrypoint CLI **có** dùng `console.*` vẫn phải xanh. Không có chiều này thì cách sửa dễ nhất là tắt rule toàn cục và cả cổng vẫn xanh.
- **(4)** `packages/tui/**` không cần override — một file TUI có `console.log` trong mã chạy phải đỏ, trong khi `tab-bar.ts:54` (chỉ nằm trong chú thích JSDoc) không được làm đỏ. Đây là ranh giới thật của rule, không phải tiện lợi.

### Xác minh

```bash
bun run lint          # phải xanh sau khi sửa hết file
bun run check:ts
bun test packages/coding-agent/test/lint-no-console-allowlist.test.ts
git grep -c 'no-console' .oxlintrc.json   # phải ≥ 1
# Cổng đỏ ngay: thêm một dòng console.log vào một file thư viện, chạy `bun run lint`, phải ĐỎ.
```

### Cổng hoàn thành

1. `grep -c 'no-console' .oxlintrc.json` ≥ **1**.
2. `bun run lint` xanh tại HEAD sau khi sửa hết file vi phạm.
3. **Bằng chứng nâng đỡ:** thêm một `console.log` vào một file thư viện bất kỳ → `bun run lint` **đỏ**; xoá đi → xanh lại. Nếu cổng này không đỏ được, item chưa có bằng chứng.
4. Entry đi qua `overrides`, **không** đi qua `ignorePatterns` — `git diff` trên `.oxlintrc.json` không được đụng khối `ignorePatterns` 24 dòng.
5. `packages/metaharness/src/tb/cli.ts` vẫn được phép dùng `console.*` (chiều ngược của cổng).
6. `e6-triplestore-split.ts:149,156` không còn `console.log` làm default parameter.

Cổng có thể thực sự đỏ: có — điều 3 là phép kiểm có thể đỏ và là điều duy nhất cần để chứng minh item này.

### Phụ thuộc

- `depends_on`: không.
- `blocks`: không.

### Cách sai dễ nhất

**Dùng `ignorePatterns` cho allow-list.** Nó nghe có vẻ đúng và là cơ chế mà `.oxlintrc.json` đã có sẵn, nhưng nó tắt **mọi** rule trên các file đó — kể cả type-safety và format — chứ không chỉ `no-console`. PR sẽ xanh, review sẽ không thấy, và repo mất hàng rào ở đúng những file entrypoint mà người khác hay chạm nhất. Sổ đã đánh dấu đây là **sửa so với đề xuất ban đầu**, tức nó là chỗ đã bị đề xuất sai một lần.

Hai lối gần kế:
- **Dựng một hệ thống thay vì một dòng cấu hình.** Bản tham chiếu chỉ có `#![deny(clippy::print_stdout, clippy::print_stderr)]` + chú thích 2 dòng — **một dòng cấu hình, không phải một hệ thống**. Chuyển nó thành một lớp wrapper hay một plugin tuỳ biến là biến một quy tắc S thành một hạ tầng.
- **Đổi tên `console.log` thành `logger.log` ở `e6-triplestore-split.ts` mà không đổi default parameter.** Code trông đã sửa, lint xanh, và hàm vẫn mặc định ghi thẳng ra stdout.

### Cần người quyết

Sổ **không** gán quyết định nào (`GAP-D1…GAP-D9` và `GAP-D10…GAP-D13` đều không trỏ tới `GAP-M1-19`). Chỉ có một ràng buộc bảo toàn phải giữ, và nó là ràng buộc thiết kế chứ không phải câu hỏi mở:

- **Đường phép dùng `console.*` của `AGENTS.md` phải giữ nguyên nghĩa.** Exception *"Standalone CLI commands that exit without entering the TUI"* **không được thu hẹp** thành allow-list tĩnh, vì allow-list sẽ chết khi có entrypoint mới. Quy tắc mới phải **mở rộng** exception đó, không thay nó. Đây là lý do bước 3 khoá allowlist bằng test: một entrypoint mới phải được thêm vào có chủ đích, không phải âm thầm.

### Đính chính so với plan

> Bảng này đính chính các claim của **`.lavish-wip/GAP-REGISTER-2.md`** (mục `GAP-M1-19`), không phải của `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.

| claim | verdict | correction |
| --- | --- | --- |
| "Dùng `ignorePatterns` cho allow-list entrypoint" (đề xuất ban đầu trong sổ) | SAI CƠ CHẾ — đã tự sửa trong chính sổ §0 | Cơ chế đúng là `overrides`, **không phải** `ignorePatterns`. `.oxlintrc.json` đã có sẵn `ignorePatterns` 24 dòng; đưa entrypoint vào đó tắt **mọi** rule khác trên các file đó, không chỉ `no-console`. Đây là một trong ba chỗ §0 của sổ đã đo lại và sửa. |
| "Quy tắc chỉ tồn tại bằng văn xuôi" | CONFIRMED | `grep -c 'no-console' .oxlintrc.json` → **0**. Quy tắc nằm trong `AGENTS.md` và không có gì cưỡng chế nó. |
| "Quy tắc đang bị vi phạm: 33 file" | CONFIRMED, NHƯNG HAI CON SỐ TRONG SỔ KHÔNG CÙNG PHẠM VI | `git grep -l 'console\.\(log\|error\|warn\|info\|debug\)' -- 'packages/*/src/**/*.ts' \| wc -l` → **33 file**. Sổ đồng thời nói bước sửa tay là "~10 file". Hai con số không mâu thuẫn nếu hiểu 33 là tổng file dính **trước khi** các entrypoint được override, còn ~10 là phần còn lại sau đó — nhưng sổ không nói rõ, và kỹ sư lấy nhầm con số nào thì hoặc sửa thiếu, hoặc mở một diff 33 file không cần thiết. **Đo lại bằng lệnh sau khi đã bật `overrides`**, đừng chọn con số theo trí nhớ. |
| "Pháp lý: chỉ mang ý tưởng, mức nhẹ nhất trong sổ" | CONFIRMED | Không có dòng code nào để chép: bản tham chiếu dùng attribute Rust, omp cần rule oxlint, hai ngôn ngữ khác nhau. Đây là item duy nhất trong năm mục M1 không có ràng buộc `NOTICE` nào. |
| "`packages/tui/**` không cần override" | CONFIRMED | TUI đã sạch. `tab-bar.ts:54` chỉ là `console.log` **trong chú thích JSDoc**, không phải mã chạy — đừng "sửa" nó, và đừng vì nó mà mở override cho cả `packages/tui/**`. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W19.md`.

**Cảnh báo neo.** Đếm: **12 neo đã kiểm — 8 đúng, 4 hỏng.**

| # | trích trong sổ | thực tế | ảnh hưởng |
| --- | --- | --- | --- |
| 1 | `.oxlintrc.json` "đã có sẵn `ignorePatterns` **24 dòng**" (lặp ở bảng file, bước 1, gate 4, *Đính chính*) | **26** mục, dòng 31–58 | nhỏ, nhưng gate 4 nói "không được đụng khối 24 dòng" ⇒ review sẽ soi nhầm |
| 2 | "phần cần sửa tay sau khi các entrypoint được override là **~10 file**" | **17 file / 87 chỗ** (hình dạng đúng). Nếu giữ hình dạng gốc của sổ: **153 file / 916 chỗ** | lớn — "~10" là ước lượng sai 1,7× |
| 3 | allow-list "**đúng ba nhóm** entrypoint … `packages/*/src/cli/**`, `packages/*/src/commands/**`, `packages/metaharness/src/tb/cli.ts`" | thiếu **`packages/stats/src/index.ts`** — là `bin` duy nhất dưới `src/` | thiếu mục thứ tư, không ghi lý do |
| 4 | lệnh đo `git grep -l 'console\.\(log\|error\|warn\|info\|debug\)' -- 'packages/*/src/**/*.ts' \| wc -l` → **33** | con số 33 **đúng**, nhưng **phạm vi sai**: pathspec `**/` của git bắt buộc khớp **ít nhất một** thư mục con, nên nó bỏ sót mọi file nằm thẳng trong `src/` | danh sách thiếu file |

**Neo đúng, đã mở và đọc:** `packages/ai/src/providers/cursor.ts:405`; `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts:149` và `:156`; `packages/tui/src/components/tab-bar.ts:54` (JSDoc `@example`, không phải mã chạy); `packages/tui/**` "TUI đã sạch" (`rg 'console\.' packages/tui/src/` → **đúng một** dòng, chính là dòng 54 trong JSDoc); `.oxlintrc.json` `grep -c 'no-console'` → **0**; `packages/metaharness/src/tb/cli.ts` (dòng 1 là `#!/usr/bin/env bun`, `console.log` ở dòng 289+); và `test/lint-no-console-allowlist.test.ts` không tồn tại — đúng là file mới.

**Bảng điểm sửa — `.oxlintrc.json` phải ĐỔI HÌNH DẠNG RULE, không chỉ thêm một dòng.** Đây là sửa lớn nhất so với hình dạng sổ vẽ, và là chỗ làm cổng trở nên giả nếu gõ sai.

| path | symbol | TRƯỚC (trích từ file thật) | SAU |
| --- | --- | --- | --- |
| `.oxlintrc.json` | khối `rules` | dòng 6–30: khối `rules` kết thúc ở `"eslint/no-unused-expressions": "off"`; **không** có `eslint/no-console` | **không thêm** `eslint/no-console` vào `rules` ở cấp gốc |
| `.oxlintrc.json` | khối `overrides` | **không tồn tại** (`python3` đọc key: `['$schema','categories','rules','ignorePatterns']`) | thêm `overrides` 2 khối, **đúng thứ tự** bên dưới |
| `.oxlintrc.json` | `ignorePatterns` | dòng 31–58, **26** mục | **không đụng** (gate 4) |

Sổ vẽ `eslint/no-console: "error"` ở **cấp gốc**. Đo thật cho thấy hình dạng đó **đỏ 916 chỗ trên 153 file** vì `lint:tools` là `oxlint .` — quét **cả repo**, không chỉ `packages/*/src/**`. Hình dạng dùng thật — **bật rule bằng `overrides`, không bằng `rules` ở gốc**:

```jsonc
// .oxlintrc.json — bổ sung vào file hiện có, KHÔNG thay khối ignorePatterns
"overrides": [
	{
		"files": ["packages/*/src/**"],
		"rules": { "eslint/no-console": "error" }
	},
	{
		"files": [
			"packages/stats/src/index.ts",
			"packages/utils/src/logger.ts",
			"packages/*/src/cli/**",
			"packages/*/src/commands/**",
			"packages/metaharness/src/tb/cli.ts"
		],
		"rules": { "eslint/no-console": "off" }
	}
]
```

**Ba điều đo được về hình dạng này — cả ba đều là bẫy nếu gõ sai:**

1. **Allow-list PHẢI nằm SAU khối bật rule.** Probe trên cây thật: `"off" đặt SAU "error"` → `packages/demo/src/lib/wire.ts` lỗi, `cli/main.ts` sạch ✅; `"off" đặt TRƯỚC "error"` → `cli/main.ts` **CŨNG lỗi** ❌. Override sau thắng. Đảo thứ tự ⇒ allow-list chết âm thầm.
2. **`overrides` ĐỦ sức bật rule lên.** Probe: chỉ có `overrides` với `"eslint/no-console": "error"`, không có khóa trong `rules` ⇒ vẫn bắt lỗi. Không cần (và không nên) thêm ở gốc.
3. **Đường dẫn trong `overrides`/`ignorePatterns` resolve theo thư mục chứa file config.** Đo được bằng cách chạy cùng một config từ hai nơi: `oxlint -c /tmp/w19-proposed.oxlintrc.json .` → **1367 chỗ**, `crates/** python/** **/*.mjs` ĐỎ (ignorePatterns không ăn); `oxlint -c .oxlintrc.w19probe.json .` → **916 chỗ**, các thư mục đó XANH. Chạy `bun run lint` từ gốc repo thì đúng là hình thức thứ hai. Nhưng ai chạy `oxlint -c <đường dẫn tuyệt đối>` thì `ignorePatterns` 26 mục **biến mất im lặng**.

**Danh sách file thư viện phải sửa tay — 17 file, 87 chỗ** (lấy từ `oxlint` chạy với hình dạng trên, không phải từ `git grep`):

| số chỗ | path |
| ---: | --- |
| 25 | `packages/stats/src/index.ts` → **miễn** |
| 18 | `packages/typescript-edit-benchmark/src/generate.ts` |
| 10 | `packages/coding-agent/src/compress/index.ts` |
| 6 | `packages/typescript-edit-benchmark/src/edit-shape-stats.ts` |
| 5 | `packages/coding-agent/src/config/model-resolver.ts` |
| 4 | `packages/mnemopi/src/core/extraction.ts` |
| 3 | `packages/mnemopi/src/core/veracity-consolidation.ts` |
| 3 | `packages/collab-web/src/lib/socket.ts` |
| 3 | `packages/agent/src/telemetry.ts` |
| 2 | `packages/utils/src/logger.ts` → **miễn** |
| 2 | `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts` |
| 1 | `packages/mnemopi/src/diagnose.ts` |
| 1 | `packages/mnemopi/src/core/beam/index.ts` |
| 1 | `packages/collab-web/src/lib/client.ts` |
| 1 | `packages/coding-agent/src/blob-broker/server.ts` |
| 1 | `packages/ai/src/providers/cursor/interaction-query.ts` |
| 1 | `packages/ai/src/providers/cursor.ts` |

**Hai mục allow-list mà sổ KHÔNG có — thiếu thì cổng đỏ vì lý do sai.** (a) **`packages/stats/src/index.ts`** — đo bằng cách liệt kê mọi `bin` trỏ vào `src/`: chỉ có đúng một (`"bin": { "omp-stats": "./src/index.ts" }`). Nó là **entrypoint CLI độc lập**, đúng nghĩa exception trong `AGENTS.md:227`; cả 25 `console.log` của nó là output cho người dùng. (b) **`packages/utils/src/logger.ts`** — `printTimings()` in ra stderr có chủ ý; đây là **chính là sink**. Không miễn thì kỹ sư bị buộc định tuyến chính sink của logger qua chính logger đó.

**Sửa hai file được gọi tên trong sổ:**

| path | symbol | TRƯỚC (trích nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/ai/src/providers/cursor.ts` | `cursorDebug` (ghi debug log tới `stderr`) | dòng 405: ``console.error(`[CURSOR] ${type}${subtype ? `: ${subtype}` : ""}${dataStr}`);`` | `logger.debug("[CURSOR] …")` |
| `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts` | `migrate()` — tham số `logFn` | dòng 149: `	logFn: (line: string) => void = console.log,` | đổi default thành `noop` đã export |
| `packages/mnemopi/src/core/migrations/e6-triplestore-split.ts` | `migrate()` — fallback `??` | dòng 156: `	const effectiveLog = options.logFn ?? console.log;` | `const effectiveLog = options.logFn ?? …` |

**Không sửa:** `packages/tui/src/components/tab-bar.ts` (dòng 54 nằm trong khối `@example` của JSDoc — `oxlint` không bắt); `packages/tui/{bench,test,scripts}/**` (ngoài `packages/*/src/**`); khối `ignorePatterns`; và 18 file bị allow-list che.

**Các bước có neo đã kiểm.**

1. **Sửa `.oxlintrc.json`** — thêm `overrides` 2 khối, allow-list **sau** khối bật rule, **không** đụng `ignorePatterns`. *Neo:* `.oxlintrc.json:31` mở đầu `ignorePatterns`.
2. **Thêm 2 mục allow-list còn thiếu**: `packages/stats/src/index.ts`, `packages/utils/src/logger.ts` — kèm lý do, cùng lúc viết test ở bước 4. *Neo:* `packages/stats/package.json`; `packages/utils/src/logger.ts:431`.
3. **Sửa 15 file còn lại sang `logger`** (87 chỗ trừ 2 file đã miễn = 60 chỗ sửa tay; 27 chỗ thuộc 2 file miễn). *Neo:* `packages/ai/src/providers/cursor.ts:405`; `e6-triplestore-split.ts:149` và `:156`.
4. **Viết test allow-list** ở `packages/coding-agent/test/lint-no-console-allowlist.test.ts`. *Neo:* thư mục test đã tồn tại; test đọc file cấu hình ở gốc repo bằng `import.meta.dir` — copy cách làm của `test/acp-initialize-conformance.test.ts`.
5. **Cổng đỏ ngay** — thêm một `console.log` vào file thư viện bất kỳ, `bun run lint` phải **ĐỎ**, xoá đi phải xanh lại. Đây là bằng chứng nâng đỡ bắt buộc.
6. `bun run check:ts`.

**Hợp đồng test.** File `packages/coding-agent/test/lint-no-console-allowlist.test.ts` (mới). Hợp đồng quan sát được: **không file nào được miễn `no-console` mà không có lý do được đặt tên, và chính rule đó phải đang bật.**

| # | case | hành vi | người đọc thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | Rule đang bật | `.oxlintrc.json` phải chứa `eslint/no-console` với giá trị `error` ở **một** override | xoá cả khối `overrides` → test **đỏ**. Đây là hàng rào chống cổng luôn xanh. |
| 2 | Mỗi mục allow-list có lý do | mỗi glob trong khối `off` phải có một khóa trong map lý do | thêm `packages/foo/src/cli/**` mà không khai lý do → **đỏ** |
| 3 | Mọi lý do đều dùng | mỗi khóa trong map lý do phải khớp một glob đang có trong `overrides` | xoá một glob nhưng giữ lý do → **đỏ** (lý do thừa) |
| 4 | Chiều ngược: entrypoint CLI vẫn xanh | `packages/metaharness/src/tb/cli.ts` dùng `console.log` ở dòng 289 → `oxlint` **không** báo | đảo thứ tự hai khunk `overrides` → **đỏ**. Bắt đúng bẫy thứ tự ở mục trên. |
| 5 | Ranh giới thật của rule | `packages/tui/src/components/tab-bar.ts:54` (JSDoc) **không** báo; một `console.log` thật trong `packages/tui/src/` thì **báo** | thêm `no-warning-comments`/rule lạ → **đỏ** |
| 6 | Cặp đôi mnemopi | `e6-triplestore-split.ts` không còn `console.log` ở **vị trí mặc định tham số**; hàm không ghi ra khi không truyền `logFn` | sửa dòng 156 mà bỏ dòng 149 → **đỏ** |

Case 4 và 6 là hai case **chạy `oxlint` thật** (spawn `bunx oxlint` trên repo), không phải đọc JSON. Case 1–3 là so khớp cấu hình — đó là hợp đồng chính trị của allow-list, nên source-grep ở đây là chính đối tượng bị kiểm.

**Cổng có đỏ được không. CÓ, và đã chứng minh bằng chạy thật.** Ba phép đo trên `oxlint 1.85.0`:
- **Đo 1 — hình dạng GỐC của sổ** (`rules` ở gốc + `overrides` 3 mục của sổ), chạy từ gốc repo: `exit=1`, **916 chỗ / 153 file**.
- **Đo 2 — hình dạng đúng của phiếu** (`overrides` 2 khối), cùng cách chạy: `exit=1`, **87 chỗ / 17 file**. Cả hai config đo đều đã bị xoá sau khi đo; `git status` xác nhận repo không còn file probe.
- **Đo 3 — cơ chế đỏ/xanh và exit code**, trên cây probe tối giản `/tmp/w19-noconsole-probe`: rule bật + file vi phạm → in lỗi, `exit=1` ✅; vi phạm đã sửa → im lặng, `exit=0` ✅.

⇒ **cổng đỏ được thật.** `eslint/no-console` có thật trong oxlint 1.85.0 (schema `node_modules/oxlint/configuration_schema.json:4529`), `overrides` có thật (schema dòng 84). **Điều kiện để nó không thành cổng giả:** các đo trên chỉ đỏ vì còn file vi phạm. Sau khi sửa hết 15 file, `bun run lint` sẽ xanh — và **mọi `console.log` thêm mới cũng sẽ làm nó xanh lại** trừ khi ai đó vô hiệu hoá rule.

Danh sách lệnh:
```bash
bun run lint                       # phải xanh sau khi sửa hết
bun run check:ts                   # KHÔNG dùng tsc / npx tsc
bun test packages/coding-agent/test/lint-no-console-allowlist.test.ts
grep -c 'no-console' .oxlintrc.json          # phải ≥ 1  (hiện: 0)
git diff --stat .oxlintrc.json               # ignorePatterns không được đổi
```

| # | cổng hoàn thành | đỏ được bằng cách nào |
| --- | --- | --- |
| 1 | `grep -c 'no-console' .oxlintrc.json` ≥ 1 | hiện = 0 ⇒ **đỏ ngay ở HEAD** |
| 2 | `bun run lint` xanh ở HEAD | đỏ trước khi sửa 15 file (đo được 87 chỗ) |
| 3 | **bằng chứng nâng đỡ**: thêm `console.log` vào file thư viện → đỏ → xoá → xanh | đo được exit=1 rồi exit=0 ở Đo 3 |
| 4 | `git diff` trên `.oxlintrc.json` không đụng `ignorePatterns` | 26 mục, dòng 31–58 |
| 5 | 18 file bị allow-list che đều có lý do trong test | thêm 1 glob, bỏ 1 khóa lý do ⇒ case 2 đỏ |
| 6 | `e6-triplestore-split.ts:149,156` hết `console.log` ở vị trí mặc định | sửa 156 bỏ 149 ⇒ case 6 đỏ |

**Cạm bẫy riêng của mục này.**

1. **Cơ chế đúng KHÔNG phải `ignorePatterns` — nhưng đừng đọc ngược để cho rằng bật ở gốc là an toàn.** `ignorePatterns` tắt **mọi** rule trên file đó (đúng như sổ nói).
2. **Thứ tự hai chunk `overrides` quyết định luôn** — đo được: `off` trước `error` ⇒ entrypoint CLI cũng đỏ. Lối âm thầm, không warning, chỉ có CI đỏ ở file không liên quan.
3. **Allow-list theo đường dẫn là miễn trừ theo *vị trí*, không theo *vai trò* — và `AGENTS.md` cấm đúng cách đó.** `AGENTS.md:227` viết nguyên văn: *"This exception is **semantic, not filename-based**; shared code must use `logger` or an explicit output sink."* Bằng chứng cụ thể trong cây này, không phải giả định: `packages/coding-agent/src/cli/file-processor.ts` là **shared code nằm trong thư mục được miễn** (được `main.ts:27` import). Cơ chế allow-list **chính là** thu hẹp đó.
4. **Lệnh đo của sổ tự nó thiếu file** (xem neo #4 ở trên).
5. **Đừng đo bằng `git grep` để quyết định danh sách sửa.** `git grep` chỉ thấy file đã track và chỉ thấy text; `oxlint` thấy cả repo, cả file untracked, và **không** bắt `console` nằm trong chú thích. Lấy danh sách từ `cp .oxlintrc.json /tmp/base.json` rồi `bunx oxlint . | grep 'eslint(no-console)' | sed 's/:[0-9]*:[0-9]*:.*//' | sort -u`.
6. **`ignorePatterns` biến mất nếu bạn chạy `oxlint -c <đường-dẫn-tuyệt-đối>`** — đo được 1367 chỗ thay vì 916. Nếu phải chạy từ chỗ khác, copy config vào gốc repo trước.
7. **Sửa `e6-triplestore-split.ts` bằng cách đổi tên là sửa hình thức.** `console.log` ở đó là **giá trị mặc định của tham số hàm**; `logger` trong repo không có `.log`.
8. **`packages/typescript-edit-benchmark` không có trong bảng package của `AGENTS.md`.** Hai file của nó gánh 24/87 chỗ. Xác minh nó là package private, không có `bin` — tức là thư viện đúng nghĩa.

## W20. GAP-M1-20 — Khoá cache `allow_always` theo hành động đã canonicalize, không theo tên tool

**Thay đổi gì:** `packages/coding-agent/src/session/acp-permission-gate.ts` trả `cacheKey: toolName` ở **mọi** nhánh, trong khi `getPermissionIntent` lại **tính title từ lệnh** (`.slice(0, 80)`). Nghĩa là người dùng được hỏi về một lệnh cụ thể nhưng quyết định của họ lại được ghi nhớ theo tên tool. Thay bằng một hàm canonicalize dùng chung `canonicalizeApprovalKey(toolName, args)` đặt cạnh `getPermissionIntent`, khoá theo lớp hành động; đổi `PERMISSION_OPTIONS` để "Always allow" mang khoá đó theo **và hiển thị phạm vi sắp cấp**; giữ nguyên `reject_always` theo cùng khoá.
*(Mục `GAP-M1-20` của `.lavish-wip/GAP-REGISTER-2.md`, gộp từ `codex.49` + `codex.79` + `codex.95`. Đây là **lỗ hổng, không phải thiếu tiện nghi**.)*

**Wave:** Wave 8. Sổ xếp "ngay sau W6" — và W6 là thứ phải có trước, vì nó dựng lại ranh giới deny của chính nhánh approval mà khoá cache này nằm trong.

**Effort:** S–M (1–1,5 ngày).

**Người dùng thấy:** Hệ quả quan sát được hôm nay: bấm "Always allow" **một lần** trên `git status` ⇒ `#acpPermissionDecisions.set("bash", "allow_always")` ⇒ **mọi lệnh bash sau đó trong phiên đều tự động qua**, kể cả `rm -rf`. Sau W20, phạm vi sắp cấp được **hiện ra** ("allow `git status` for the rest of this session") và hai lệnh khác nhau cùng tool phải hỏi riêng. `docs/approval-mode.md` hiện không đề cập khoá cache này.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/acp-permission-gate.ts` | sửa | Thêm `canonicalizeApprovalKey(toolName, args)` ngay cạnh `getPermissionIntent`. Bỏ `cacheKey: toolName` ở **cả bốn** nhánh: dòng 55 (`bash`), 63 (`delete`), 70 và 75 (`move`). Đổi `PERMISSION_OPTIONS` để "Always allow" mang khoá canonicalize theo **và** hiển thị phạm vi sắp cấp. | Có — đã kiểm, cả bốn dòng đều trả `cacheKey: toolName`. |
| `packages/coding-agent/src/session/session-tools.ts` | sửa | Dòng 991: `#acpPermissionDecisions.set("bash", "allow_always")` phải ghi bằng khoá đã canonicalize, không phải tên tool. | Có |
| `bash-interceptor.ts` | **không sửa** (dùng lại) | Dùng lại parser sẵn có của `bash-interceptor.ts` để lấy mảng lệnh đã parse cho khoá `bash`. Không viết parser thứ hai. | Có |
| `docs/approval-mode.md` | sửa | Tài liệu hiện không đề cập khoá cache. Ba chế độ approval và ba tầng tool **không được đổi hình dạng**; 1.471 dòng test hiện có cũng vậy. | Có |
| `packages/coding-agent/test/session/permission-cache-key.test.ts` | tạo | Bản âm phủ định bắt buộc: hai lệnh khác nhau cùng tool phải hỏi riêng. | **không** — file mới, chưa kiểm chứng |

### Các bước

1. **Viết `canonicalizeApprovalKey(toolName, args)`** cạnh `getPermissionIntent`, trả khoá theo lớp: `bash` + mảng lệnh đã parse (dùng lại parser sẵn có của `bash-interceptor.ts`); `delete`/`move` + đường dẫn đã `realpath`; `edit` + loại thao tác phá hủy.
2. **Đổi `PERMISSION_OPTIONS`** để "Always allow" mang khoá đó theo, **và hiển thị phạm vi sắp cấp**. Nếu không hiện phạm vi thì key tốt hơn cũng không giúp — người dùng vẫn không biết mình vừa cấp gì.
3. **Giữ nguyên `reject_always` theo cùng khoá.** Tách khoá ra là một lệnh bị từ chối vĩnh viễn sẽ lại hỏi.
4. **Viết bản âm phủ định bắt buộc:** hai lệnh khác nhau cùng tool phải hỏi riêng. Không có nó thì "sửa" này chỉ là thêm chi tiết.
5. **Chốt `GAP-D5`** trước khi ship — xem *Cần người quyết*.
6. Chạy `bun run check:ts` và suite approval hiện có.

### Hình dạng code

```typescript
// packages/coding-agent/src/session/acp-permission-gate.ts — ngay cạnh
// getPermissionIntent. Hợp đồng này chỉ đổi cách *ghi nhớ* một quyết định;
// nó KHÔNG đổi tập quyết định.
export function canonicalizeApprovalKey(toolName: string, args: unknown): string {
	// bash   → tool + mảng lệnh đã parse (parser sẵn có của bash-interceptor.ts)
	// delete → tool + đường dẫn đã realpath
	// move  → tool + đường dẫn đã realpath
	// edit  → tool + loại thao tác phá hủy
}

// Cả hai quyết định dùng CHUNG khoá này. Tách khoá reject_always ra khỏi
// khoá allow_always là một lỗi: lệnh bị từ chối vĩnh viễn sẽ lại hỏi.
```

### Hợp đồng test

Hợp đồng quan sát được là: **phạm vi của một quyết định "always" hẹp bằng hành động đã canonicalize, và người dùng được cho biết phạm vi đó trước khi bấm.**

- **(1) Bản âm phủ định bắt buộc.** Duyệt "Always allow" cho `git status`, rồi chạy `rm -rf ./build` cùng tool `bash` → phải **hỏi lại**. Không có case này thì toàn bộ item là thêm chi tiết trang trí: một bản sửa chỉ thêm key mà không thu hẹp thì vẫn cho `rm -rf` đi qua, và test vẫn xanh.
- **(2) Chiều thu hẹp thật.** Duyệt "Always allow" cho `git status`, rồi chạy `git status` lần nữa → phải **không** hỏi. Đây là chiều ngược của (1); chỉ assert (1) thì một bản sửa "hỏi lại mọi thứ" cũng xanh.
- **(3) Phạm vi sắp cấp phải hiện ra.** Assert chuỗi mà người dùng đọc trước khi bấm có nói phạm vi ("allow `git status` for the rest of this session"). Không có nó thì khoá tốt hơn cũng không giúp.
- **(4)** `reject_always` dùng **cùng** khoá: sau khi từ chối vĩnh viễn một hành động, hành động đó không hỏi lại — **trong khi** một hành động khác cùng tool vẫn hỏi.
- **(5)** Hình dạng cũ không đổi: ba chế độ approval và ba tầng tool trong `docs/approval-mode.md` vẫn trả về đúng hình dạng cũ.

### Xác minh

```bash
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
bun --cwd=packages/natives run build
bun run check:ts
bun test packages/coding-agent/test/session/permission-cache-key.test.ts
bun test packages/coding-agent/test/tools/approval.test.ts   # 1.471 dòng test hiện có — không được đổi hình dạng
```

### Cổng hoàn thành

1. `bun test` bản âm phủ định xanh, và **case (1) đỏ riêng** nếu `canonicalizeApprovalKey` bị đổi lại thành trả `toolName` (bằng chứng nâng đỡ: sửa tạm, xác nhận đúng case (1) đỏ, khôi phục lại). Nếu không có gì đỏ, case (1) không test điều nó tuyên bố.
2. `grep` xác nhận không còn `cacheKey: toolName` ở bất kỳ nhánh nào trong `acp-permission-gate.ts` — bốn nhánh, bốn chỗ.
3. `PERMISSION_OPTIONS` hiển thị phạm vi sắp cấp, và test (3) đọc được chuỗi đó.
4. `reject_always` và `allow_always` dùng cùng một hàm khoá — assert bằng hành vi, không bằng source-grep.
5. Suite `approval.test.ts` hiện có vẫn xanh, không đổi một assertion nào.
6. `bun run check:ts` xanh (không dùng `tsc` / `npx tsc`).

Cổng có thể thực sự đỏ: có — điều 1 và 2 là hai phép kiểm độc lập, mỗi cái đỏ được khi phần việc tương ứng vắng mặt.

### Phụ thuộc

- `depends_on`: W6. Sổ xếp "ngay sau W6", và lý do là cả hai cùng nằm trên nhánh approval: W6 dựng lại ranh giới `deny` của chính lớp quyết định mà khoá cache này ghi vào. Nếu W6 chưa chốt (nó cần sign-off của product), W20 **vẫn làm được** — chỉ ghi rõ là nó chưa có nền.
- `blocks`: không.

### Cách sai dễ nhất

**Đổi khoá cache mà không hiện phạm vi sắp cấp.** Đây là cách sửa nửa vời, và nó là cách sập âm thầm: key tốt hơn cũng không giúp nếu người dùng không biết mình vừa cấp gì — họ bấm "Always allow" một lần và đi tin rằng chỉ lệnh đó được miễn, trong khi mọi lệnh cùng tool vẫn đi qua. Sổ nói thẳng: *"Nếu không hiện phạm vi thì key tốt hơn cũng không giúp."*

Ba lối gần kế, theo thứ tự:
- **Chỉ sửa một trong bốn nhánh.** `bash` ở `:55`, `delete` ở `:63`, `move` ở `:70` và `:75` — sửa ba nhánh và bỏ một nhánh thì một lớp hành động vẫn lan rộng, và test viết bằng `bash` vẫn xanh.
- **Tách khoá `reject_always`.** Một lệnh bị từ chối vĩnh viễn sẽ lại hỏi, và người dùng sẽ nghĩ omp không nhớ.
- **Đổi hình dạng ba chế độ approval hoặc ba tầng tool.** Item này chỉ đổi cách *ghi nhớ* một quyết định, không đổi tập quyết định. `M6 §3` nói approval của omp "đã hoàn chỉnh" — câu đó nói về ba tầng tool / ba chế độ / ba quyết định, **không** nói về khoá cache; đừng dùng nó làm lý do để không làm.

### Cần người quyết

- **`GAP-D5` — giữ đường hồi tương thích cho cache `allow_always` theo tên tool cũ không?** Các phiên đang cache sẽ hỏi lại một lần nữa. Phương án trong sổ: **khuyến nghị không giữ** — cache cũ theo tên tool chính là thứ đang gây lỗi (`rm -rf` sau một "always allow" cho `git status`). Nhưng đây là thay đổi hành vi người dùng thấy, nên phải nêu trong changelog, và **quyết định này phải của người chứ, không phải của người implementer**.
- Đây là quyết định **chặn ship, không chặn bắt đầu** — có thể viết `canonicalizeApprovalKey` và test trước, nhưng phải chốt trước khi merge vì nó quyết định có cần một nhánh migration không.

### Đính chính so với plan

> Bảng này đính chính các claim của **`.lavish-wip/GAP-REGISTER-2.md`** (mục `GAP-M1-20`), không phải của `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.

| claim | verdict | correction |
| --- | --- | --- |
| "Đây là lỗ hổng, không phải thiếu tiện nghi" | CONFIRMED — và đây là claim quan trọng nhất của mục | Chuỗi lỗi là đo được từng mắt: `getPermissionIntent` **tính title từ lệnh** (`.slice(0, 80)`) nhưng **khoá cache bằng tên tool** (`cacheKey: toolName` ở `:55`, `:63`, `:70`, `:75`) ⇒ `#acpPermissionDecisions.set("bash", "allow_always")` tại `session/session-tools.ts:991` ⇒ mọi lệnh bash sau đó trong phiên tự động qua, kể cả `rm -rf`. Đây là **phê duyệt lan rộng ngoài ý muốn**, và nó không xuất hiện trong `docs/approval-mode.md`. |
| "Ba chế độ approval và ba tầng tool … không được đổi hình dạng" | Ràng buộc bảo toàn, không phải claim về sự thật | Giữ nguyên nghĩa: item này chỉ đổi cách *ghi nhớ* một quyết định, **không đổi tập quyết định**. 1.471 dòng test hiện có là bằng chứng cho hình dạng đó; sửa chúng để "cho khớp" là xoá bằng chứng chứ không phải cập nhật. |
| "Không chép file 42 dòng Rust của codex; chép ý" | CONFIRMED | Ba việc của hình dạng port là ý, không phải dòng code: (1) hàm canonicalize dùng chung; (2) `PERMISSION_OPTIONS` mang khoá theo và hiện phạm vi; (3) giữ `reject_always` theo cùng khoá. Không có ràng buộc `NOTICE` nào ở mục này (không liên quan Ratatui). |
| "`M6 §3` nói approval của omp 'đã hoàn chỉnh'" | Cần đọc kèm, không đủ để bác bỏ item | Câu đó nói về **ba tầng tool / ba chế độ / ba quyết định**, không nói về khoá cache. Nó là bằng chứng rằng lớp quyết định đã đủ, không phải bằng chứng rằng phạm vi của một quyết định đã đúng. |
| "`docs/approval-mode.md` không đề cập [khoá cache]" | CONFIRMED | Hệ quả thẳng: người đọc tài liệu không có đường nào để biết "Always allow" rộng tới đâu. Vì vậy hiển thị phạm vi sắp cấp trong `PERMISSION_OPTIONS` là một nửa bắt buộc của item, không phải một nicety. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W20.md`.

**Cảnh báo neo.** Mọi dòng dưới đây đã được mở và đọc bằng `sed -n` / `awk` / `rg -n`.

| Neo trong work item | Dòng thật | Nội dung thật | Verdict |
| --- | --- | --- | --- |
| `acp-permission-gate.ts:55` (`bash`) | 55 | `return { toolName, title: command \|\| toolName, cacheKey: toolName };` | **OK** |
| `acp-permission-gate.ts:63` (`delete`) | 63 | `	cacheKey: toolName,` | **OK** |
| `acp-permission-gate.ts:70` (`move`) | 70 | `	if (from && to) return { toolName, title: \`Move ${from} to ${to}\`, paths: [from, to], cacheKey: toolName };` | **OK** |
| `acp-permission-gate.ts:75` (`move`) | 75 | `	cacheKey: toolName,` | **OK** |
| `getPermissionIntent` tính title từ lệnh, `.slice(0, 80)` | 54 | `	const command = stringProperty(input, "command")?.slice(0, 80);` | **OK** |
| `session-tools.ts:991` = `#acpPermissionDecisions.set("bash", "allow_always")` | 991 | `	this.#acpPermissionDecisions.set(permissionIntent.cacheKey, "allow_always");` | **HỎNG — trích sai văn bản** |
| "**cả bốn** nhánh … bốn chỗ" | 55/63/70/75 | 4 **chỗ**, nhưng chỉ **3 nhánh** (`bash`, `delete`, `move`×2). Nhánh `edit` (gate:86, :95) **đã** trả `cacheKey: "edit:delete"` / `"edit:move"` | **KHÔNG đúng** |
| `bash-interceptor.ts` — "dùng lại parser sẵn có" | 119 | `export function checkBashInterception(...)` trả `InterceptionResult { block, message?, suggestedTool? }` | **HỎNG — trỏ sai file.** `bash-interceptor.ts` không phải parser |
| `docs/approval-mode.md` không đề cập khoá cache | — | `rg -c 'cache' docs/approval-mode.md` → **exit 1, 0 hit** | **OK — CONFIRMED** |
| `test/session/permission-cache-key.test.ts` chưa tồn tại | — | `ls` → `No such file or directory` | **OK** (plan đã ghi "không") |
| `test/tools/approval.test.ts` — "**1.471 dòng**" | — | `wc -l` = **959**. Cũng 959 ở `HEAD~1`…`HEAD~3` | **SAI SỐ** — file approval 1471 dòng không tồn tại |
| *(không được nhắc)* `test/agent-session-acp-permission.test.ts` | 832 | `it("allow_always: caches decision and calls bridge only once for subsequent executes")` | **plan BỎ SÓT file này** |

**Chỗ nên dùng thay `bash-interceptor.ts`.** `bash-interceptor.ts:8` import từ `packages/coding-agent/src/tools/shell-tokenize.ts` — đó mới là parser:

| symbol | dòng |
| --- | --- |
| `tokenizeShellSegments(command): string[][]` | `shell-tokenize.ts:14` |
| `extractLiteralAndChainSegments(command): LiteralShellCommandSegment[] \| null` | `:217` |
| `extractFlatShellCommandSegments(command): FlatShellCommandSegment[]` | `:369` |
| `extractLeadingCdTarget(command)` | `:501` |
| `readShellWord(text)` | `:584` |

`FlatShellCommandSegment` (`:345`) = `{ text, …, pipedStdin }` — `text` là từng lệnh đã tách. Đây là hàm dùng được cho khoá `bash`.

**Bảng điểm sửa.** TRƯỚC trích nguyên văn từ file thật.

| path | symbol | TRƯỚC (trích từ file thật) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/acp-permission-gate.ts:55` | `getPermissionIntent`, nhánh `bash` | `return { toolName, title: command \|\| toolName, cacheKey: toolName };` | `cacheKey: canonicalizeApprovalKey("bash", input)` |
| `…acp-permission-gate.ts:63` | `getPermissionIntent`, nhánh `delete` | `	cacheKey: toolName,` | `	cacheKey: canonicalizeApprovalKey("delete", input),` |
| `…acp-permission-gate.ts:70` | `getPermissionIntent`, nhánh `move` (có from+to) | `paths: [from, to], cacheKey: toolName };` | `paths: [from, to], cacheKey: canonicalizeApprovalKey("move", input) };` |
| `…acp-permission-gate.ts:75` | `getPermissionIntent`, nhánh `move` (chỉ có from) | `	cacheKey: toolName,` | `	cacheKey: canonicalizeApprovalKey("move", input),` |
| `…acp-permission-gate.ts:86` | `getPermissionIntent`, nhánh `edit` | `	cacheKey: "edit:delete",` | `	cacheKey: \`edit:delete:${canonicalizedPath}\`,` (đã có tiền tố theo lớp; chỉ thêm phần đường dẫn) |
| `…acp-permission-gate.ts:95` | `getPermissionIntent`, nhánh `edit` | `	cacheKey: "edit:move",` | `	cacheKey: \`edit:move:${from}→${to}\`,` |
| `…acp-permission-gate.ts:15-20` | `PERMISSION_OPTIONS` | `export const PERMISSION_OPTIONS: ClientBridgePermissionOption[] = [` … `{ optionId: "allow_always", name: "Always allow", kind: "allow_alway…` | tách: giữ `PERMISSION_OPTIONS_BY_ID`, biến phần hiển thị thành hàm `buildPermissionOptions(scope)` |
| `packages/coding-agent/src/session/session-tools.ts:972` | `bridge.requestPermission!(…, PERMISSION_OPTIONS, signal)` | `		PERMISSION_OPTIONS,` | `		buildPermissionOptions(permissionScope),` |
| `packages/coding-agent/src/session/session-tools.ts:986` | tra option theo id | `		PERMISSION_OPTIONS_BY_ID.get(outcome.optionId)` | giữ nguyên — `optionId` không đổi, nên map vẫn tra được |

**Hàng KHÔNG sửa (plan nói sai):** `session-tools.ts:991` — dòng này **đã** đúng, nó ghi `permissionIntent.cacheKey` (một biến); chữ `"bash"` là giá trị của `cacheKey`, sinh ra ở gate:55. `session-tools.ts:993` — `reject_always` đã dùng **cùng biến**, yêu cầu "giữ nguyên `reject_always` theo cùng khoá" **đã được thoả mãn sẵn**. `session-tools.ts:939` — cùng lập luận. `test/tools/approval.test.ts` — kiểm `resolveApproval` (ma trận 3 mode × 3 tier, dòng 53-63), **không** chạm cache ACP.

**Các bước có neo đã kiểm.**

1. **Dựng `canonicalizeApprovalKey` ngay cạnh `getPermissionIntent`.** Neo: `acp-permission-gate.ts:48` (`export function getPermissionIntent(`), đặt hàm **trên** dòng 48. Nó **gọi lại** `getPermissionIntent` để lấy tool + paths, thay vì lặp lại logic phân loại:
```
canonicalizeApprovalKey(toolName, args):
  intent = getPermissionIntent(toolName, args)        // dùng lại, không viết parser thứ hai
  nếu không có intent → trả toolName                // fail-open về hành vi cũ, không phá gì
  bash   → `bash:${JSON.stringify(extractFlatShellCommandSegments(command).map(s => s.text))}`
            ↑ import từ ./shell-tokenize — KHÔNG phải từ ./bash-interceptor
  delete → `delete:${resolveToCwd(path, cwd)}`        ← resolveToCwd đã import sẵn ở gate:3
  move   → `move:${resolveToCwd(from)}→${resolveToCwd(to)}`
  edit   → giữ tiền tố edit:delete / edit:move, nối thêm đường dẫn đã resolve
```
2. **Thay 4 chỗ `cacheKey: toolName`.** Neo: `:55`, `:63`, `:70`, `:75`. Kiểm bằng `rg -c 'cacheKey: toolName'` — hiện bằng **4**, sau khi sửa phải bằng **0**.
3. **Biến `PERMISSION_OPTIONS` thành hàm có phạm vi.** Neo: `:15` (`export const PERMISSION_OPTIONS: ClientBridgePermissionOption[] = [`) và `:23` (`PERMISSION_OPTIONS_BY_ID`). Nhãn `option.name` đi thẳng ra wire: `acp-client-bridge.ts:130-134` map `options.map(option => ({ optionId, name, kind }))` — nên đổi `name` ở đây **là** thay đổi người dùng đọc được. `optionId` giữ nguyên. Neo gọi: `session-tools.ts:972` — truyền `buildPermissionOptions(permissionScope)`.
4. **Viết bản âm phủ định** — file mới `packages/coding-agent/test/session/permission-cache-key.test.ts`.
5. **Sửa test đang khoá hành vi lỗi.** Neo: `test/agent-session-acp-permission.test.ts:842` và `:844`. Đổi `"echo b"` → `"echo a"` và giữ `expect(permissionSpy).toHaveBeenCalledTimes(1)` tại `:846`. Test này **đang khẳng định đúng cái lỗi W20 xoá**; giữ nguyên nó là giữ lại lỗ hổng. Plan không nhắc tới file này.
6. **Ghi vào `docs/approval-mode.md`.** Neo: `:134` (`## ACP sessions`). Thêm đoạn nói phạm vi của "Always allow" là **theo lệnh/đường dẫn cụ thể, trong một phiên**, và quyết định bị xoá khi đổi phiên.
7. **Chốt `GAP-D5` trước khi merge.** Nguồn: `.lavish-wip/GAP-REGISTER-2.md:629`. Cần người chứ ký, không phải implementer.
8. **Chạy cổng.**

**Hợp đồng test.** File `packages/coding-agent/test/session/permission-cache-key.test.ts` (tạo mới — chưa tồn tại).

| # | Case | Nếu hồi quy, người dùng thấy |
| --- | --- | --- |
| **1** | Cho `git status` "Always allow", rồi chạy `rm -rf ./build` cùng tool `bash` | `rm -rf` **không hỏi** và chạy thẳng. Đây là hậu quả của lỗi. |
| **2** | Cho `git status` "Always allow", rồi chạy `git status` lần nữa | Lại hỏi ⇒ "Always allow" vô dụng, người dùng bấm hàng trăm lần. **Không có case này thì case 1 có thể xanh bằng cách "hỏi lại" mọi thứ** |
| **3** | `requestPermission` nhận `options` mà `name` của `allow_always` có chứa phạm vi | Nút vẫn ghi "Always allow" trần; người dùng không biết mình vừa cấp gì. Khoá tốt hơn cũng không cứu được |
| **4** | `reject_always` trên một hành động ⇒ hành động đó không hỏi lại; **cùng lúc** một hành động khác cùng tool **vẫn hỏi** | Tách khoá ⇒ lệnh bị từ chối vĩnh viễn lại hỏi, người dùng nghĩ omp kẹt |
| **5** | `delete` trên `/tmp/a.ts` rồi `delete` trên `/tmp/b.ts` | Xoá nhầm file không hỏi. (Case riêng cho nhánh `delete` — case 1-2 chỉ phủ `bash`.) |
| **6** | `move` có from+to, rồi `move` chỉ có from (nhánh `:75`) | Nhánh thứ hai bị bỏ sót nếu chỉ sửa `:70`. Đây là bẫy "sửa 3 trong 4". |

Case 1 và 2 là **bắt buộc cả hai** — một chiều không đủ. **Bẫn khi viết case 3:** helper hiện có của suite ACP là `makeBridge` (`agent-session-acp-permission.test.ts:75-82`) và nó **ném mất tham số thứ hai** (`async requestPermission(_toolCall, _options, _signal) { return outcome; }`). Muốn assert phạm vi hiển thị thì phải tự bắt `options` — dùng lại `makeBridge` sẽ **luôn xanh** dù bạn chưa làm bước 3.

**Cổng có đỏ được không.**

| # | Lệnh | Cổng có ĐỎ ĐƯỢC không? |
| --- | --- | --- |
| G1 | `bun test …/agent-session-acp-permission.test.ts` | **Có — nhưng phải sửa `:846` theo bước 5, không phải chỉ "giữ xanh".** Đã đo: biến dòng 846 từ `toHaveBeenCalledTimes(1)` → `(2)` cho `1 fail / 29 pass` |
| G2 | `bun test …/session/permission-cache-key.test.ts` | **Có.** Đã đo bằng chính thí nghiệm G1: đổi kỳ vọng 1→2 là đỏ. Nhưng chỉ khi case 1 **dùng hai lệnh khác nhau** |
| G3 | `bun test …/tools/approval.test.ts` | **Có, nhưng ĐÚNG RÕNG.** Nó không chạm cache ACP; xanh là mặc định, không phải bằng chứng |
| G4 | `bun run check:ts` | **Có**, nhưng yếu — chỉ bắt lỗi kiểu, không bắt hẹp phạm vi. **Không dùng `tsc` / `npx tsc`.** |
| G5 | `rg -c 'cacheKey: toolName' packages/coding-agent/src/session/acp-permission-gate.ts` | **Có** (hiện `4`, sau khi sửa phải `0`). **Nhưng yếu:** chỉ kiểm *chữ*, không kiểm *giá trị* |

**Cổng của plan cần SỬA — hai chỗ.** (1) **Cổng 5 của plan ("`approval.test.ts` vẫn xanh, không đổi assertion nào") trỏ nhầm file.** Suite quyết định là `agent-session-acp-permission.test.ts` (929 dòng, 30 test, hiện **30 pass / 0 fail**). (2) **Cổng 2 của plan là source-grep** — `AGENTS.md` cấm source-grep trong test; ở đây nó là lệnh tay nên không vi phạm, nhưng nó không chứng minh khoá đã hẹp theo hành động.

**Vì sao 5 cổng thay thế lành:** G1 đỏ khi khoá quá rộng; G2 đỏ khi khoá quá hẹp **hoặc** khi bỏ sót nhánh; G3 đỏ khi đổi hình dạng cũ; G4 đỏ khi lệch kiểu; G5 đỏ khi còn sót. Không cổng nào đỏ vì lý do củ.

**Cạm bẫy riêng của mục này.**

**6.1 — Bẫy lớn nhất, KHÔNG nằm trong danh sách "cách sai dễ nhất" của plan: `test/agent-session-acp-permission.test.ts:832` đang khoá chính cái lỗi W20 xoá, và plan không nhắc tới file này.** Hai lệnh **khác nhau** (`echo a` rồi `echo b`), kỳ vọng bridge chỉ gọi **một** lần. Sau W20, chúng canonicalize ra hai khoá khác nhau ⇒ bridge gọi **hai** lần ⇒ **ĐỎ**. Cách sửa: đổi `"echo b"` → `"echo a"`, giữ nguyên `toHaveBeenCalledTimes(1)`. Cùng file, các test còn lại **sống sót** và không cần đụng: `:850` boundaryCases (dùng cùng lệnh `"echo boundary"` cả hai lần), `:593`, `:669`, `:720` (đã dùng khoá `edit:move` / `edit:delete` khác nhau sẵn). **Chỉ `:832` là xung đột.**

**6.2 — Đừng sửa `session-tools.ts:991`.** Dòng này **đã đúng**. Sửa nó thành `canonicalizeApprovalKey(target.name, args)` sẽ **nhân đôi** việc canonicalize và tạo ra hai nơi sinh khoá.

**6.3 — `PERMISSION_OPTIONS` là hằng tĩnh — "đổi nó" nghĩa là phải đổi nó thành hàm.** Nó là `export const` ở `:15`, và `PERMISSION_OPTIONS_BY_ID` ở `:23` dựng từ nó lúc **module load**. Không thể gắn nhãn theo lệnh vào một hằng.

**6.4 — `edit` đã có khoá theo lớp rồi — đừng đếm nó là việc mới.** `acp-permission-gate.ts:86` và `:95` đã trả `cacheKey: "edit:delete"` / `"edit:move"`. Lớp `edit` **không** nằm trong bốn chỗ `cacheKey: toolName`. Làm lại sẽ phí và dễ phá `:593` / `:720`.

**6.5 — `bash-interceptor.ts` không phải parser.** Nó **quyết định có chặn không**, không trả mảng lệnh. Parser là `shell-tokenize.ts` (`:369`), mà `bash-interceptor.ts:8` chỉ *mượn*.

**6.6 — Đừng dùng `realpath` cho khoá.** `realpath` **resolve symlink**, nên hai lần gọi cùng một file qua hai đường symlink khác nhau sẽ trùng khoá (đúng ý), **nhưng** nó cũng phụ thuộc filesystem.

**6.7 — `reject_always` đã dùng chung khoá — đừng "sửa" thành tách.** `:991` và `:993` đọc **cùng** `permissionIntent.cacheKey`.

**6.8 — Nếu bạn chỉ sửa `bash`, hãy tự hỏi vì sao test vẫn xanh.** Cả ba lớp hành động dùng **cùng một cơ chế**; sửa riêng `bash` ⇒ các test `delete`/`move` vẫn xanh vì chúng không tồn tại. Đó là lý do case 5 và case 6 là bắt buộc chứ không phải "nice to have".

**Phụ thuộc:** `depends_on: W6` — W20 làm được ngay cả khi W6 chưa chốt. `blocks: không`. **Quyết định chặn ship: `GAP-D5`** (`.lavish-wip/GAP-REGISTER-2.md:629`) — có giữ đường hồi tương thích cho cache `allow_always` theo tên tool cũ không; phiếu khuyến nghị **không giữ**, cần người chứ ký.

## W21. GAP-M1-21 — Harden tiến trình trước main: cấm attach debugger, cấm core dump, lọc `LD_*` khỏi môi trường con

**Thay đổi gì:** Thêm một module `harden-process.ts` (~50 dòng) và **một** lời gọi ở đầu `cli.ts`, trước mọi import nặng: Linux `prctl(PR_SET_DUMPABLE, 0)` và `prctl(PR_SET_PDEATHSIG, SIGKILL)`; portable `setrlimit(RLIMIT_CORE, 0)`; và `sanitizeChildEnv()` bỏ `LD_PRELOAD` / `LD_LIBRARY_PATH` / `DYLD_INSERT_LIBRARIES` / `DYLD_LIBRARY_PATH` khỏi env truyền cho mọi child. Tất cả sau `try/catch` im lặng + `logger.debug`; **trên Windows phải là no-op sạch** — không được phép làm hỏng startup.
*(Mục `GAP-M1-21` của `.lavish-wip/GAP-REGISTER-2.md`, nguồn `codex.86`.)*

**Wave:** Wave 8. Sổ xếp "cùng sóng với `GAP-M1-19`" vì cùng là một thay đổi kỷ luật nhỏ, **độc lập tuyệt đối, không chạm file người khác đang sửa**.

**Effort:** S — khoảng 0,5 ngày. Bốn syscall, một module, một chỗ nối.

**Người dùng thấy:** Không có bề mặt mới. Cái thay đổi là: omp là CLI agent giữ API token trong bộ nhớ (`packages/ai/src/auth-storage.ts`, `packages/coding-agent/src/secrets/`) và spawn subprocess không kiểm soát (`bash-interceptor.ts`, `browser/launch.ts`) — hôm nay **không có gì** ngăn một debugger gắn vào tiến trình đó, **không có gì** ngăn nó đổ core dump chứa token, và `LD_PRELOAD` trong môi trường đi thẳng vào mọi child.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/harden-process.ts` | tạo | ~50 dòng. Linux: `prctl(PR_SET_DUMPABLE, 0)`, `prctl(PR_SET_PDEATHSIG, SIGKILL)`. Portable: `setrlimit(RLIMIT_CORE, 0)`. `sanitizeChildEnv()` bỏ `LD_PRELOAD` / `LD_LIBRARY_PATH` / `DYLD_INSERT_LIBRARIES` / `DYLD_LIBRARY_PATH`. Tất cả sau `try/catch` im lặng + `logger.debug`. | **không** — file mới. Đo được: `git grep -rn 'PR_SET_DUMPABLE\|RLIMIT_CORE\|PT_DENY_ATTACH\|LD_PRELOAD\|DYLD_INSERT' -- packages crates` → **0 hit** |
| `packages/coding-agent/src/cli.ts` | sửa | Một lời gọi harden ở đầu file, **trước mọi import nặng**. `process.title = APP_NAME` (dòng 54) phải chạy **sau** harden, không phải trước. Thêm guard `isProcessEntry`. | Có — hôm nay `cli.ts` chỉ làm đúng **một** việc tiền-main: `process.title = APP_NAME` tại dòng 54. Không setuid/setgid, không umask, không rlimit. |
| `bash-executor.ts` | sửa | `sanitizeChildEnv()` dùng chung cho `Bun.spawn` và `` $`cmd` ``. | Có |
| các child spawn hiện có (LSP, kernel, browser) | **không sửa** | Phải **tiếp tục nhận** PATH / NODE_PATH / Homebrew của chúng. Chỉ `LD_*` và `DYLD_*` bị lọc — lọc rộng hơn là hỏng ngay. | Có |
| `crates/pi-shell/src/process.rs` | **không sửa** | Đã có `kill_process_group` (`:1627`) và leo thang TERM→KILL ở `:1446/:1496/:1525` — phần này ĐÃ có, đừng làm lại. | Có |
| `packages/coding-agent/test/harden-process.test.ts` | tạo | Ba điều kiện bảo toàn bên dưới là hợp đồng của item này. | **không** — file mới, chưa kiểm chứng |

### Các bước

1. **Ghi lại phần omp ĐÃ có, đừng làm lại:** secret obfuscation, approval gate, process-group kill trong bash-executor. Sổ nói thẳng: *thiếu đúng một trục — trạng thái bảo vệ của chính tiến trình.*
2. **Tạo `harden-process.ts`** theo ba nhóm lệnh ở trên. Không chép dòng Rust nào từ bản tham chiếu — đây là bốn syscall, không phải bản quyền được bảo vệ.
3. **Nối vào `cli.ts` trước mọi import nặng.** `process.title = APP_NAME` (dòng 54) chuyển xuống **sau**.
4. **Thêm guard `isProcessEntry`** — bắt buộc, xem *Hợp đồng test* case (2).
5. **Dùng `sanitizeChildEnv()`** cho `Bun.spawn` và `` $`cmd` `` trong `bash-executor.ts`.
6. **Viết test** cho ba điều kiện bảo toàn.
7. Chạy `bun run check:ts` và smoke trên một máy Windows để xác nhận no-op sạch.

### Hình dạng code

```typescript
// packages/coding-agent/src/harden-process.ts — gọi ở đầu cli.ts, TRƯỚC mọi
// import nặng. Mọi lời gọi sau `try/catch` im lặng + `logger.debug`:
// harden không bao giờ được biến thành lý do omp không khởi động được.
export function hardenProcess(): void {
	// Linux:  prctl(PR_SET_DUMPABLE, 0); prctl(PR_SET_PDEATHSIG, SIGKILL);
	// Portable: setrlimit(RLIMIT_CORE, 0);
	// Windows: no-op sạch — không được phép làm hỏng startup.
}

/** Bỏ `LD_*` / `DYLD_*` khỏi env truyền cho child. KHÔNG lọc rộng hơn:
 *  LSP, kernel và browser vẫn phải nhận PATH / NODE_PATH / Homebrew của chúng. */
export function sanitizeChildEnv(env: Record<string, string>): Record<string, string> { /* … */ }
```

### Hợp đồng test

Hợp đồng quan sát được là ba điều kiện bảo toàn — cả ba đều bắt buộc, và tất cả đều là những cách hỏng im lặng:

- **(1) Thứ tự.** `process.title = APP_NAME` phải chạy **sau** harden. `prctl(PR_SET_PDEATHSIG)` trên một tiến trình cha đã thoát là hành vi khác — assert thứ tự, không assert "có gọi harden".
- **(2) Guard `isProcessEntry`.** `bun test` và SDK embedding đi vào **cùng** `cli.ts`. Không có guard thì test runner tự `dumpable=0`, và một test chủ động crash sẽ **im lặng** — đó là thất lạc khó chẩn đoán nhất từng gặp. Test phải chứng minh chạy dưới test runner thì harden **không** bật.
- **(3) Lọc đúng biên.** Child spawn vẫn nhận `PATH` / `NODE_PATH` / Homebrew; chỉ `LD_*` và `DYLD_*` bị bỏ. Lọc rộng hơn là hỏng ngay — assert cả hai chiều: biến `LD_*` bị bỏ **và** `PATH` còn nguyên byte.

Chiều ngược đáng chú ý: trên Windows, `hardenProcess()` phải là no-op sạch — một lời gọi ném lỗi ở đó là hỏng startup, tức hỏng sản phẩm chứ không phải hỏng item.

### Xác minh

```bash
bun run check:ts
bun test packages/coding-agent/test/harden-process.test.ts
# Cổng đỏ cho case (3): thêm một biến PATH giả vào sanitizeChildEnv, xác nhận case đỏ.
```

### Cổng hoàn thành

1. `bun test` xanh với cả ba case (1), (2), (3).
2. **Bằng chứng nâng đỡ cho (2):** bỏ guard `isProcessEntry`, chạy lại suite → case (2) phải đỏ. Đây là case bắt được việc tự làm test runner im lặng.
3. **Bằng chứng nâng đỡ cho (3):** sửa `sanitizeChildEnv()` để lọc cả `PATH` → case (3) phải đỏ.
4. `sanitizeChildEnv()` được dùng ở **cả hai** đường spawn trong `bash-executor.ts` (`Bun.spawn` và `` $`cmd` ``), không chỉ một.
5. `process.title = APP_NAME` vẫn còn trong `cli.ts` và nằm sau lời gọi harden.
6. Trên Windows: `hardenProcess()` không ném. Cần một máy Windows hoặc CI Windows để kiểm; nếu không có, ghi rõ là **chưa kiểm chứng** thay vì coi là xanh.
7. `bun run check:ts` xanh (không dùng `tsc` / `npx tsc`).

Cổng có thể thực sự đỏ: có — điều 2 và 3 là hai phép kiểm đỏ được độc lập.

### Phụ thuộc

- `depends_on`: không.
- `blocks`: không.

### Cách sai dễ nhất

**Quên guard `isProcessEntry`.** Đây là cách hỏng nặng nhất của item và nó **không** làm đỏ bất kỳ test nào. `bun test` và SDK embedding đi vào **cùng** `cli.ts`; không có guard thì test runner tự `dumpable=0`, và một test chủ động crash sẽ **im lặng** — thất lạc khó chẩn đoán nhất từng gặp, vì dấu vết của nó không nằm ở đâu cả.

Ba lối gần kế:
- **Đặt `process.title = APP_NAME` trước harden.** Đọc tự nhiên và sai: `prctl(PR_SET_PDEATHSIG)` trên một tiến trình cha đã thoát là hành vi khác.
- **Lọc `LD_*` quá rộng.** Mọi child spawn hiện có — LSP, kernel, browser — phải **tiếp tục nhận** PATH / NODE_PATH / Homebrew của nó. Lọc rộng hơn `LD_*`/`DYLD_*` là hỏng ngay.
- **Không nói trong PR rằng `doctor` chạy trong tiến trình đã harden.** Sổ yêu cầu nói rõ: `dumpable=0` nghĩa là một check muốn đọc core dump sẽ không được. Bỏ qua câu này thì một người đọc PR của W18 sẽ thiết kế một check đáng lẽ phải chạy được.

### Cần người quyết

Sổ **không** gán quyết định nào cho `GAP-M1-21` (`GAP-D1…GAP-D9` và `GAP-D10…GAP-D13` đều không trỏ tới nó). §7 của sổ xếp nó vào hai mục có **tỉ lệ giá trị/công sức cao nhất trong cả sổ**, và khác ở chỗ nó **không chặn gì**.

Có một điều kiện phải ghi rõ trong PR, không phải quyết định cần trả lời: **thứ tự với W18 không quan trọng**, nhưng PR phải nói rõ `doctor` chạy trong tiến trình đã harden.

### Đính chính so với plan

> Bảng này đính chính các claim của **`.lavish-wip/GAP-REGISTER-2.md`** (mục `GAP-M1-21`), không phải của `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.

| claim | verdict | correction |
| --- | --- | --- |
| "Đo được, không suy đoán: `git grep -rn 'PR_SET_DUMPABLE\|RLIMIT_CORE\|PT_DENY_ATTACH\|LD_PRELOAD\|DYLD_INSERT' -- packages crates` → 0 hit" | CONFIRMED | Không có gì trong cây. Entry point `packages/coding-agent/src/cli.ts` chỉ làm đúng **một** việc tiền-main: `process.title = APP_NAME` tại dòng 54. Không setuid/setgid, không umask, không rlimit. |
| "Phần omp ĐÃ có, phải nói để không làm lại" | CONFIRMED — đây là claim quan trọng thứ hai của mục | Secret obfuscation, approval gate, process-group kill trong bash-executor (`crates/pi-shell/src/process.rs:1627` `kill_process_group`, leo thang TERM→KILL ở `:1446/:1496/:1525`) đều đã có. Kết luận của sổ: **thiếu đúng một trục — trạng thái bảo vệ của chính tiến trình.** Đừng viết lại ba thứ trên. |
| "Bối cảnh thì đúng" | CONFIRMED | omp là CLI agent giữ API token trong bộ nhớ (`packages/ai/src/auth-storage.ts`, `packages/coding-agent/src/secrets/`) và spawn subprocess không kiểm soát (`bash-interceptor.ts`, `browser/launch.ts`). Đây là lý do trục còn thiếu có ý nghĩa, không phải một quy ước vệ sinh. |
| "Pháp lý: chỉ mang ý tưởng, không chép dòng nào" | CONFIRMED | Bản tham chiếu là Apache-2.0, nhưng phần này là **bốn syscall**, không phải bản quyền được bảo vệ. Nguyên tắc chỉ mang: *một tiến trình giữ bí mật không nên bị attach, và không nên đổi core dump.* |
| Ba điều kiện bảo toàn (thứ tự `process.title`, guard `isProcessEntry`, biên lọc child env) | Ràng buộc bắt buộc, được sổ nâng thành hợp đồng test | Cả ba đều là cách hỏng **im lặng** — không cái nào làm đỏ một test hiện có. Vì vậy W21 hạ chúng xuống thành ba case bắt buộc có bằng chứng nâng đỡ, thay vì để là ghi chú ở cuối mục. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W21.md`.

**Cảnh báo neo.** 13 neo đã kiểm · **11 đúng nguyên vẹn · 2 hỏng**.

| # | neo trong work item | kết quả |
| --- | --- | --- |
| 1 | `packages/coding-agent/src/cli.ts:54` | ✅ đúng nguyên vẹn |
| 2 | `packages/coding-agent/src/harden-process.ts` (tệp mới) | ✅ đúng là chưa tồn tại — nhưng **sai chỗ**: nên ở `packages/utils/src/` |
| 3 | `bash-executor.ts` — "cả hai đường spawn (`Bun.spawn` và `` $`cmd` ``)" | ❌ **HỎNG** — không có đường spawn nào: `rg 'Bun\.spawn' packages/coding-agent/src/exec/bash-executor.ts` → **0 hit** |
| 4 | `crates/pi-shell/src/process.rs:1627` | ✅ đúng nguyên vẹn |
| 5 | `crates/pi-shell/src/process.rs:1446` | ✅ đúng nguyên vẹn |
| 6 | `crates/pi-shell/src/process.rs:1496` | ✅ đúng nguyên vẹn (TERM) |
| 7 | `crates/pi-shell/src/process.rs:1525` | ✅ đúng nguyên vẹn (KILL) |
| 8 | `packages/ai/src/auth-storage.ts` | ✅ tồn tại, `export class AuthStorage` ở dòng 80 |
| 9 | `packages/coding-agent/src/secrets/` | ✅ tồn tại, 8 tệp |
| 10 | `bash-interceptor.ts` | ✅ tồn tại tại `tools/bash-interceptor.ts` — nhưng **không** spawn trực tiếp (đi qua `exec/bash-executor`) |
| 11 | `browser/launch.ts` | ✅ tồn tại tại `tools/browser/launch.ts`; `Bun.spawn` ở dòng 331 |
| 12 | `packages/coding-agent/test/harden-process.test.ts` (tệp mới) | ✅ đúng là chưa tồn tại |
| 13 | lệnh đo `git grep … -- packages crates` | ✅ 0 hit, đúng như plan nói — nhưng xem cảnh báo dưới |

**"cli.ts hôm nay chỉ làm đúng MỘT việc tiền-main" — SAI.** Dòng bảng trong plan và dòng "Đính chính" đều khẳng định điều này. `cli.ts` có **ba** việc tiền-main: (1) `cli.ts:9-12` — `delete process.env.MallocStackLogging;` / `delete process.env.MallocStackLoggingNoCompact;` trong `try {} catch {}`; (2) `cli.ts:46-51` — version gate; (3) `cli.ts:54` — `process.title = APP_NAME;`.

**Phép đo "0 hit" — đúng, nhưng dễ đọc sai.** `git grep -rn 'PR_SET_DUMPABLE\|RLIMIT_CORE\|PT_DENY_ATTACH\|LD_PRELOAD\|DYLD_INSERT' -- packages crates` → **0 hit**, nhưng kết luận "không có gì trong cây" rộng hơn phép đo cho phép: `prctl` **đã** có trong `packages/utils/src/process-name.ts:48` (`libc.symbols.prctl(PR_SET_NAME, ptr(buf), 0n, 0n, 0n);`, `const PR_SET_NAME = 15;` ở dòng 21) và `packages/utils/src/ptree.ts:51` (`libc.symbols.prctl(36, 1, 0, 0, 0)`). **Khung FFI W21 cần đã có sẵn, hai bản** — ước lượng "~50 dòng, file mới" của plan lạc quan; việc thật là **sao chép một khuôn đã tồn tại**.

**Bảng điểm sửa.** TRƯỚC trích nguyên văn từ file thật.

| đường/dẫn | symbol | TRƯỚC (trích từ file thật) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli.ts:54` | `process.title = APP_NAME` | `	process.title = APP_NAME;` | giữ nguyên dòng này, **nhưng dời xuống sau** khối `if (isProcessEntry) hardenProcess();` |
| `packages/coding-agent/src/cli.ts:63` | `isProcessEntry` | `const isProcessEntry = import.meta.main \|\| process.env.PI_COMPILED === "true";` | **KHÔNG thêm const mới.** Tái dùng hằng sẵn có |
| `packages/coding-agent/src/cli.ts:9-12` | `delete process.env.MallocStackLogging…` | `try {\n\tdelete process.env.MallocStackLogging;\n\tdelete process.env.MallocStackLoggingNoCompact;\n} catch {}` | giữ nguyên — đây là tiền lệ đúng để dùng làm khuôn |
| `packages/coding-agent/src/cli.ts:46-51` | version gate | `if (Bun.semver.order(Bun.version, MIN_BUN_VERSION) < 0) {` … `	process.exit(1);` | **không sửa**, nhưng phải **quyết định** harden chạy trước hay sau |
| *(tệp mới)* `packages/utils/src/process-hardening.ts` | `hardenProcess()` | — chưa tồn tại | `export function hardenProcess(): void` — 4 syscall sau `try/catch` im lặng, **không** bao giờ ném |
| `packages/utils/src/process-hardening.ts` | `hardenProcess()` — thân | — | Sao y hệt khuôn `setProcessName` tại `packages/utils/src/process-name.ts:37-56` |
| `packages/utils/src/env.ts:52-67` | `filterProcessEnv` | `if (\n\t\t\t!isSafeEnvName(key) \|\n\t\t\tisMacosMallocStackLoggingEnvName(key) \|\n\t\t\tvalue === undefined \|\n\t\t\t!isSafeEnvValue(valu…` | thêm một vế `isLoaderInjectionEnvName(key)` vào chuỗi điều kiện |
| `packages/utils/src/env.ts` (mới, cạnh `isMacosMallocStackLoggingEnvName` ở dòng 36-38) | `isLoaderInjectionEnvName` | — chưa tồn tại | `export function isLoaderInjectionEnvName(name: string): boolean` — **theo TIỀN TỐ** `LD_` / `DYLD_`, không phải danh sách literal |
| `packages/utils/src/env.ts:36-38` | `isMacosMallocStackLoggingEnvName` | `export function isMacosMallocStackLoggingEnvName(name: string): boolean {\n\treturn name === "MallocStackLogging" \|\| name ==…` | giữ nguyên |
| `packages/utils/src/procmgr.ts:31-42` | `buildSpawnEnv` | `return {\n\t\t...filterChildShellEnv(Bun.env),\n\t\tSHELL: shell,` | **không sửa** |
| `packages/coding-agent/test/harden-process.test.ts` | — | — chưa tồn tại | tệp mới. Nhưng **thêm** vào `packages/utils/test/env.test.ts` sẽ rẻ hơn cho case (3) |

**Các bước có neo đã kiểm.**

1. **Ghi lại phần omp ĐÃ có, đừng làm lại** — không gõ gì ở bước này, chỉ xác nhận bằng neo: `crates/pi-shell/src/process.rs:1627` (`pub fn kill_process_group`), `:1446`, `:1496` (TERM), `:1525` (KILL). 1496 → 1525 là leo thang TERM→KILL. **Cả bốn neo đúng nguyên vẹn.**
2. **Tạo `process-hardening.ts` theo khuôn FFI sẵn có, KHÔNG theo hình dạng trong plan.** Mở `packages/utils/src/process-name.ts:29-58` và copy khuôn. Bốn syscall, mỗi cái một `try/catch` rỗng riêng:

| syscall | nền tảng | hằng số | giá trị | nguồn |
| --- | --- | --- | --- | --- |
| `prctl(PR_SET_DUMPABLE, 0, 0, 0, 0)` | linux | `PR_SET_DUMPABLE` | `4` | codex `lib.rs:46` |
| `prctl(PR_SET_PDEATHSIG, SIGKILL, …)` | linux | `PR_SET_PDEATHSIG` / `SIGKILL` | `1` / `9` | **plan tự thêm, codex không có** |
| `setrlimit(RLIMIT_CORE, {0,0})` | unix | `RLIMIT_CORE` | `4` | codex `lib.rs:109` |
| (macOS) `ptrace(PT_DENY_ATTACH, …)` | darwin | `PT_DENY_ATTACH` | `31` | codex `lib.rs:88` — **plan bỏ sót** |

Ghi `args: [FFIType.i32, FFIType.i32, FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.i32` cho `prctl` — **khác** `process-name.ts:41` (dùng `FFIType.ptr` cho tham số 2 vì `PR_SET_NAME` cần con trỏ).
3. **Gỡ `LD_*` / `DYLD_*` ở tầng env trung tâm** — `packages/utils/src/env.ts:52-67` (`filterProcessEnv`). Thêm `isLoaderInjectionEnvName` cạnh `isMacosMallocStackLoggingEnvName` (`env.ts:36-38`) rồi thêm một vế vào chuỗi điều kiện ở dòng 57. **Tiền tố, không phải danh sách literal** — codex dùng `remove_env_vars_with_prefix(b"LD_")` (`lib.rs:60`) và `(b"DYLD_")` (`lib.rs:99`).
4. **Nối `hardenProcess()` vào `cli.ts`, tái dùng `isProcessEntry` sẵn có** — `cli.ts:63` đã có, **không export**. Thêm khối gọi **trên** dòng 63, dời `process.title = APP_NAME` (dòng 54) **xuống dưới** nó. Ràng buộc thứ tự cần ghi vào PR: `setFullProcessName()` chạy ở `cli.ts:548` và `:586` — **đã** sau mọi vị trí harden.
5. **Kiểm tra lại tương tác với `postmortem`** — `packages/utils/src/postmortem.ts:562-563`, trong `fatal()`: `const { default: inspector } = await import("node:inspector"); inspector.open(undefined, undefined, false);`. Mở đường dẫn này **trước** khi bật harden. Nếu `PR_SET_DUMPABLE=0` làm inspector không lên được, `fatal()` — đường báo lỗi cuối cùng của omp — sẽ chết im lặng.
6. **Test.**
7. **`bun run check:ts`, không dùng `tsc`.**

**Hợp đồng test.** Ba case bảo toàn, giữ nguyên ý plan. Nhưng **hai case phải nằm ở tệp khác nhau** so với plan nói, vì hai cái đầu là hành vi tiến trình và cái thứ ba là hành vi env thuần.

- **Case (1) — Thứ tự.** Tệp `packages/coding-agent/test/harden-process.test.ts` (mới). Không assert "có gọi harden" — điều đó đúng ở cả hai thứ tự; assert **quan hệ**: sau khi module `cli.ts` được nạp, `hardenProcess` phải đứng trước `process.title`. *Hồi quy:* `omp` không còn tự bảo vệ, nhưng không ai thấy — không có thông báo, không có log mặc định. **Hồi quy im lặng.**
- **Case (2) — Guard `isProcessEntry` (rủi ro nặng nhất của item).** Cùng tệp. *Khoảnh khắc dễ sai nhất:* `isProcessEntry` là `import.meta.main || process.env.PI_COMPILED === "true"`; tệp test có thể mang `PI_COMPILED`. Assert: dưới `bun test`, `hardenProcess()` **không** bật — đo lại `CoreDump`/dumpable ở chính tiến trình test trước và sau khi nạp `cli.ts`, phải **không đổi**. *Bằng chứng nâng đỡ:* bỏ `&& isProcessEntry` → case (2) **phải đỏ**. *Hồi quy:* mọi test chủ động crash trong 791 tệp `.test.ts` sẽ **không để lại dấu vết nào** — không stack, không core dump, không output.
- **Case (3) — Biên lọc env.** Tệp `packages/utils/test/env.test.ts` (**đã có**), **không** tạo `harden-process.test.ts` cho case này. Assert **cả hai chiều, cùng một fixture**: vào `{ PATH: "/usr/bin", NODE_PATH: "/x", LD_PRELOAD: "/tmp/steal.so", LD_LIBRARY_PATH: "/tmp", DYLD_INSERT_LIBRARIES: "/tmp/e.dylib", DYLD_LIBRARY_PATH: "/tmp", LD_TEST: "1" }`; ra: `PATH`, `NODE_PATH` còn **nguyên byte**; mọi khoá `LD_`/`DYLD_` biến mất — kể cả `LD_TEST` không nằm trong danh sách 4 literal của plan. *Bằng chứng nâng đỡ:* đổi `isLoaderInjectionEnvName` thành `return false` → case (3) **phải đỏ**.
- **Case (4) — bổ sung.** `hardenProcess()` trên **macOS** phải là no-op sạch, giống Windows. Máy dev là darwin và plan không có nhánh macOS.

**Cổng có đỏ được không.**

```bash
bun run check:ts
bun test packages/coding-agent/test/harden-process.test.ts
bun test packages/utils/test/env.test.ts
# Cổng đỏ cho case (2): bỏ "&& isProcessEntry" ở cli.ts, chạy lại tệp harden-process.
# Cổng đỏ cho case (3): đổi isLoaderInjectionEnvName thành `return false`, chạy lại env.test.
# Cổng đỏ cho macOS: bật nhánh ptrace(PT_DENY_ATTACH), chạy lại — case (4) phải đỏ.
```

| # | Cổng | Đỏ được? | Bằng cách nào / vì sao không |
| --- | --- | --- | --- |
| 1 | `bun test` xanh với ba case | ✅ | — |
| 2 | Bỏ guard `isProcessEntry` → case (2) đỏ | ✅ **nhưng dễ tự lừa** | Đỏ **chỉ khi** `PI_COMPILED` không có trong môi trường. Nếu có, case xanh dù harden bật. |
| 3 | `sanitizeChildEnv` lọc cả `PATH` → case (3) đỏ | ✅ | Fixture có `PATH` và assert byte nguyên vẹn. |
| 4 | `sanitizeChildEnv` dùng ở **cả hai** đường spawn của `bash-executor.ts` | ❌ **KHÔNG ĐỎ ĐƯỢC** | **Hai đường spawn ấy không tồn tại** — `rg 'Bun\.spawn' …/bash-executor.ts` → 0 hit; tệp dùng brush-core qua native bindings. Viết lại: `filterProcessEnv` (`env.ts:52`) là điểm nối **duy nhất**; mọi đường spawn — bash (`procmgr.ts:34` `buildSpawnEnv` → `filterChildShellEnv`), LSP, browser, MCP stdio, worker — đều đi qua nó. |
| 5 | `process.title = APP_NAME` còn trong `cli.ts` và nằm sau harden | ✅ | Nhưng **không** được viết bằng source-grep (`expect(src).toContain(...)` là cấm theo AGENTS.md) |
| 6 | Windows: `hardenProcess()` không ném | ⚠️ **Nửa vời** | Không có máy Windows; giữ cách ghi "**chưa kiểm chứng**" — nhưng thêm nhánh macOS vì máy dev **có** |
| 7 | `bun run check:ts` xanh | ✅ | Có sẵn ở `package.json:90`. |

**Cạm bẫy riêng của mục này.**

**6.1 — "Trước mọi import nặng" là không làm được trong ESM.** Mọi `import` của một module ESM đều được nâng lên trước **mọi** câu lệnh. Nên `cli.ts:9-12` trông như nằm trước import nhưng vẫn chạy **sau** khi mọi import đã nạp. Cách viết đúng: "**câu lệnh đầu tiên trong thân module**", và ràng buộc thứ tự có hiệu lực thật sự là `process.title` dòng 54 — không phải thứ tự import.

**6.2 — `isProcessEntry` đã tồn tại — bước 4 của plan ("Thêm guard") là viết chồng.** Nó có **ý nghĩa khác hoàn toàn** (phát hiện binary Windows đã compile, không phải chống harden test runner). Tái dùng nó là đúng, nhưng nó **không export**.

**6.3 — Nhánh macOS bị bỏ trắng, trên đúng máy đang phát triển.** Plan viết bốn syscall: Linux dumpable, Linux pdeathsig, portable rlimit, Windows no-op. **macOS không có mặt trong cả danh sách** — nhưng máy dev là darwin, và tham chiếu thật dùng `codex-rs/process-hardening/src/lib.rs:88` `libc::ptrace(libc::PT_DENY_ATTACH, 0, ...)`. `PT_DENY_ATTACH` trên macOS là **một chiều, không gỡ được** trong vòng đời tiến trình — đó là lý do codex ở đó gọi `std::process::exit(6)` khi thất bại.

**6.4 — `PR_SET_PDEATHSIG` không từ tham chiếu, và có một cái bẫy thật.** Codex **không** có nó (`lib.rs:46` chỉ `PR_SET_DUMPABLE`). Đây là đóng góp riêng của plan — chấp nhận được, nhưng phải biết nó kéo theo hệ quả plan không nói: `PDEATHSIG` bị **giới hạn** (Linux chỉ truyền tín hiệu khi tiến trình cha *chết thật*, không phải khi nó `exec`).

**6.5 — `process.title` không phải là lần đặt tên duy nhất.** `cli.ts:54` và `cli.ts:96` `setProcessName(APP_NAME)` (gọi ở `:548` và `:586`). `setProcessName` **đã** chạy sau mọi vị trí harden — nhưng phải **nói rõ** trong PR.

**6.6 — Tạo `sanitizeChildEnv` là vi phạm `AGENTS.md`.** *"Missing capability? Extend the central helper … and call it — don't fork its logic locally"*. `filterProcessEnv` đã là điểm nối trung tâm.

**Hình dạng code trong plan lệch tham chiếu ở bốn điểm** (đối chiếu `codex-rs/process-hardening/src/lib.rs`, 193 dòng): biên lọc env — plan dùng 4 literal, codex dùng **tiền tố**; nơi lọc — plan lọc từng child, codex **gỡ khỏi `process.env` của cha** lúc pre-main và không hề có hàm per-child; macOS — plan không nhắc, codex có `pre_main_hardening_macos`; khi syscall fail — plan `try/catch` im lặng + `logger.debug`, codex `std::process::exit(5/6/7)`. Dòng "khi syscall fail" là khác biệt **có chủ đích và đúng** (harden không được bao giờ là lý do omp không khởi động) — ghi rõ là **rời khỏi tham chiếu có chủ ý**. Dòng "nơi lọc" là khác biệt **quan trọng nhất**.

**Ba câu PR bắt buộc phải trả lời, không trả lời thì item không đóng được:** (1) macOS harden bằng gì — `PT_DENY_ATTACH` không gỡ được, hay chỉ `RLIMIT_CORE`, hay no-op? (2) `PR_SET_PDEATHSIG` giữ hay bỏ — nếu giữ, xử lý child sống lâu hơn session thế nào? (3) `postmortem` còn mở được inspector sau khi `dumpable=0` không — **đo thật, không suy luận**.

## W22. GAP-M1-22 — `omp session`: một bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu

**Thay đổi gì:** Thêm một entry `session` trong `cli-commands.ts` trỏ tới `commands/session.ts`, lặp lại khuôn của `commands/find.ts` (ba dòng: `name` / `load` / `help`). Năm verb: `list` (mặc định, **nhân bản output của `omp find`** chứ không viết lại), `show`, `archive`, `unarchive`, `delete`. Cờ chọn mục tiêu: `--last` / `--all` / `--json`.
*(Mục `GAP-M1-22` của `.lavish-wip/GAP-REGISTER-2.md`, nguồn `codex.129`. **Khoảng cách: SỬA CHO KHỚP** — store và lệnh đều có, chỉ thiếu bề mặt.)*

**Wave:** Wave 8. Sổ xếp "cùng miền với `GAP-M1-18`" và **bắt buộc merge cùng một đợt** với nó — xem *Cần người quyết*.

**Effort:** S — khoảng 1 ngày. Năm verb, trong đó bốn verb (`show` / `archive` / `unarchive` / `delete`) là wrapper, không phải logic mới; `list` là bản nhân bản của `omp find`.

**Người dùng thấy:** `omp session` trở thành namespace để làm việc đó **bằng script**: liệt kê, xem, lưu trữ, bỏ lưu trữ, xoá. Hôm nay `--resume` / `-r` / `--session`, `--continue`, `omp find`, `omp gc`, `omp share` và trong TUI `/resume` `/fork` `/delete` `/export` `/queue` đều có, nhưng **không có verb archive/unarchive session nào** và không có namespace để gọi bằng script.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli-commands.ts` | sửa | Thêm entry `session` trỏ tới `commands/session.ts`. Merge cùng W18, dùng chung **một** assertion phân tuyến. | Có — 49 lệnh cấp một; `grep -c 'name: "session"'` → **0** |
| `packages/coding-agent/src/commands/session.ts` | tạo | Lặp khuôn `commands/find.ts` — ba dòng `name` / `load` / `help`. Năm verb + ba cờ `--last` / `--all` / `--json`. `list` **nhân bản output của `omp find`**, không viết lại. | Có — `commands/find.ts` là khuôn, lấy từ chính omp chứ không từ bản tham chiếu |
| `SessionStorageBackend.loadIndex` | **dùng lại, không sửa** | Đã trả path/size/mtime/title — **nguồn duy nhất**. Mở đường đọc thứ hai cho cùng dữ liệu là tạo nguồn sự thật thứ hai, đúng thứ M4 cấm. | Có |
| `flag-tables.ts` | **giữ nguyên** | `:249` (`--resume` / `-r` / `--session` với `rejectEmpty`) và `:300` (`--continue`) nguyên vẹn — đường một-shot, đổi chúng là hồi quy trực tiếp. | Có |
| `packages/coding-agent/src/slash-commands/helpers/security.ts` | **giữ nguyên** | `:99` `--archive-existing` là một cờ của nhánh security scan, **không phải** verb archive session. | Có |
| `packages/coding-agent/test/session/session-cli.test.ts` | tạo | Assertion phân tuyến chung với W18 + bản âm phủ định "không mở đường đọc thứ hai". | **không** — file mới, chưa kiểm chứng |

### Các bước

1. **Đo lại số lệnh cấp một trước khi ghi vào PR** (xem *Đính chính*): con số thật là 49, không phải 50.
2. **Tạo `commands/session.ts`** theo đúng khuôn ba dòng của `commands/find.ts`.
3. **`list` phải nhân bản output của `omp find`** — `omp find` giữ **từng byte output** vì đã có script phụ thuộc.
4. **Bốn verb còn lại** (`show` / `archive` / `unarchive` / `delete`) đọc từ `SessionStorageBackend.loadIndex` — nguồn duy nhất.
5. **Ba cờ** `--last` / `--all` / `--json`.
6. **Đăng ký entry `session`** trong `cli-commands.ts`, cùng đợt merge với W18.
7. **Viết assertion phân tuyến dùng chung** với W18 — một cái, không phải hai.
8. Chạy `bun run check:ts` và `bun test` các suite session hiện có.

### Hình dạng code

```typescript
// packages/coding-agent/src/commands/session.ts — lặp khuôn
// packages/coding-agent/src/commands/find.ts: ba dòng name / load / help.
// `list` NHÂN BẢN output của `omp find`, không viết lại: `omp find` giữ
// từng byte output vì đã có script phụ thuộc.
// Mọi verb đọc từ SessionStorageBackend.loadIndex — nguồn duy nhất.
```

### Hợp đồng test

- **(1) Assertion phân tuyến — dùng chung với W18, một cái.** "Mọi subcommand trong registry thật sự được phân tuyến" phải đúng cho `doctor` lẫn `session` trong **cùng một** assertion. Hai assertion rời rạc sẽ cho phép hồi quy #1499/#1496 quay lại: một lệnh thiếu trong `cli-commands.ts` rơi xuống `runCli` và **argv thành prompt cho LLM** — hậu quả im lặng.
- **(2) Bản âm phủ định của nguồn sự thật.** `list` và `omp find` phải cho ra **cùng một nội dung** trên cùng một store. Nếu `list` tự đọc store theo đường riêng, hai lệnh có thể lệch nhau theo thời gian và không test nào bắt được.
- **(3)** Bốn verb còn lại đọc từ `loadIndex`. Assert bằng hành vi trên một store thật, không bằng source-grep.
- **(4) Bảo toàn:** `omp find` giữ **từng byte** output; `/resume` `/fork` trong TUI không đổi; `omp gc` và `omp share` giữ nguyên phạm vi dù chạm cùng tập session.
- **(5)** `flag-tables.ts:249` và `:300` giữ nguyên hành vi, kể cả `rejectEmpty` ở `--session`.

### Xác minh

```bash
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
bun --cwd=packages/natives run build
bun run check:ts
bun test packages/coding-agent/test/session/session-cli.test.ts
grep -c 'name: "session"' packages/coding-agent/src/cli-commands.ts   # phải ≥ 1, không phải 0
bun run session list      # phải khớp từng byte với `bun run find`
```

### Cổng hoàn thành

1. `grep -c 'name: "session"' packages/coding-agent/src/cli-commands.ts` ≥ **1**, và **cùng một** assertion phân tuyến cũng phủ `doctor` (W18).
2. `bun run session list` và `bun run find` cho ra cùng nội dung trên cùng một store.
3. `bun test` xanh, **kèm bằng chứng nâng đỡ**: đổi `list` sang tự đọc store theo đường riêng → case (2) phải đỏ.
4. `flag-tables.ts:249` (`:--resume` / `-r` / `--session` với `rejectEmpty`) và `:300` (`--continue`) không đổi một dòng — kiểm bằng `git diff --stat`.
5. `omp find`, `omp gc`, `omp share`, `/resume`, `/fork` giữ nguyên hành vi.
6. `bun run check:ts` xanh (không dùng `tsc` / `npx tsc`).

Cổng có thể thực sự đỏ: có — điều 1 và 3 là hai phép kiểm độc lập.

### Phụ thuộc

- `depends_on`: không về kỹ thuật. Nhưng **thứ tự merge với W18 là bắt buộc** — cả hai sửa `cli-commands.ts`, và bảng cổng đỏ phải chứa **một** assertion *"mọi subcommand trong registry thật sự được phân tuyến"*, không phải hai assertion riêng.
- `blocks`: không.

### Cách sai dễ nhất

**Viết lại output của `list` thay vì nhân bản `omp find`.** Nó trông sạch hơn và dễ hơn, và nó là một cách hỏng mà không có test nào sẽ bắt nếu không có case (2) — vì hai bản đều tự đúng với chính nó. `omp find` giữ **từng byte** output vì đã có script phụ thuộc; một bản "gần giống" phá chúng trong im lặng.

Lối gần kế, và nó nặng hơn:
- **Tách thành hai assertion phân tuyến, một cái cho W18 và một cái cho W22.** Sổ nói rõ lý do: một lệnh thiếu trong `cli-commands.ts` rơi xuống `runCli` và argv thành prompt cho LLM (hồi quy #1499/#1496) — hậu quả im lặng — và hai assertion rời rạc sẽ cho phép nó quay lại. Đây là lý do thứ tự merge là **bắt buộc**, không phải khuyến nghị.
- **Mở một đường đọc thứ hai cho cùng dữ liệu session.** `SessionStorageBackend.loadIndex` đã trả path/size/mtime/title và là nguồn duy nhất; làm thêm một đường là tạo nguồn sự thật thứ hai, đúng thứ M4 cấm.

### Cần người quyết

Sổ **không** gán quyết định nào cho `GAP-M1-22` (`GAP-D1…GAP-D9` và `GAP-D10…GAP-D13` đều không trỏ tới nó). §7 của sổ phân loại nó là **hỗ trợ vận hành, không phải lỗ hổng** — khác `GAP-M4-15`, mà sổ gọi là "hình dạng lỗ hổng tin cấu hình".

Có một ràng buộc thứ tự phải chốt trước khi mở PR:

- **Thứ tự merge với W18 — bắt buộc, và lý do rất cụ thể.** Cả hai sửa `cli-commands.ts`. Bảng cổng đỏ phải chứa **một** assertion *"mọi subcommand trong registry thật sự được phân tuyến"*, không phải hai assertion riêng. Lý do: một lệnh thiếu trong `cli-commands.ts` rơi xuống `runCli` và **argv thành prompt cho LLM** (hồi quy #1499/#1496) — đó là hậu quả im lặng, và hai assertion rời rạc sẽ cho phép nó quay lại.

### Đính chính so với plan

> Bảng này đính chính các claim của **`.lavish-wip/GAP-REGISTER-2.md`** (mục `GAP-M1-22`), không phải của `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.

| claim | verdict | correction |
| --- | --- | --- |
| "GAP-M1-18 ghi '50 command'" | SAI CON SỐ, ĐÃ ĐÍNH CHÍNH Ở CHÍNH MỤC NÀY | Con số 50 đếm bằng `grep -c 'name: "'`, tức tính cả tên option lồng nhau. Số thật là **49**: `grep -oE '^\s+name: "[a-z0-9-]+"' packages/coding-agent/src/cli-commands.ts \| sort -u \| wc -l`. **Kết luận không đổi** — `doctor` và `session` đều vẫn không có. W18 ghi lại con số 49. |
| "`grep -c 'name: "session"'` → 0" | CONFIRMED | `cli-commands.ts` không có lệnh cấp một nào tên `session`. Đây là một nửa của phép đo; nửa kia là `grep -rn 'archive' packages/coding-agent/src/slash-commands/` chỉ trả về `--archive-existing` tại `helpers/security.ts:99`, tức **không có verb archive/unarchive session nào**. |
| "Effort: S — Bốn verb là wrapper" nhưng mục liệt kê **năm** verb | KHÔNG MÂU THUẪN, NHƯNG DỄ ĐỌC SAI | Năm verb là `list` / `show` / `archive` / `unarchive` / `delete`. `list` là bản **nhân bản** của `omp find` nên không phải logic mới; bốn verb còn lại là wrapper. W22 ghi lại con số theo cách đó để không để lại hai cách đếm khác nhau trong cùng một tài liệu. |
| "Khoảng cách: SỬA CHO KHỚP" | CONFIRMED | Phần omp ĐÃ có, và khá nhiều: `--resume` / `-r` / `--session` với `rejectEmpty` (`flag-tables.ts:249`), `--continue` (`:300`), `omp find`, `omp gc`, `omp share`, và trong TUI `/resume` `/fork` `/delete` `/export` `/queue`. Thiếu đúng hai thứ: (a) một namespace lệnh để làm việc đó **bằng script**; (b) hai verb vòng đời — lưu trữ và bỏ lưu trữ — cùng cờ chọn mục tiêu theo câu (`--last`) và theo tập (`--all`). |
| "Pháp lý: chỉ mang ý tưởng" | CONFIRMED | Khuôn lấy từ chính `commands/find.ts` của omp, không từ bản tham chiếu — không có dòng nào được chép, nên không có ràng buộc `NOTICE` nào. |
| Bốn điều bảo toàn | Ràng buộc bắt buộc, được nâng thành hợp đồng test | (1) `--resume` / `--continue` / `-r` nguyên vẹn — đường một-shot, đổi chúng là hồi quy trực tiếp; (2) `omp find` giữ **từng byte** output — đã có script phụ thuộc; (3) `/resume` `/fork` trong TUI không đổi — lệnh CLI là **bề mặt thứ hai trên cùng store**, không phải nguồn sự thật thứ hai; (4) `omp gc` và `omp share` giữ nguyên phạm vi dù chạm cùng tập session. |


---

### Phiếu triển khai — đã kiểm trên cây 2026-09-29

Phiếu đầy đủ: `.lavish-wip/impl/MILESTONE_1_EXECUTION_PLAN__W22.md`.

**Cảnh báo neo.** Nguyên văn từ phiếu:

> **Tổng: 15 neo được kiểm. 7 đúng hoàn toàn, 3 đúng nhưng kèm lý do sai hoặc sai chỗ, 5 sai.**

| Neo trong W22 | Kết quả | Verdict |
|---|---|---|
| `cli-commands.ts` tồn tại | 451 dòng | **ĐÚNG** |
| `grep -c 'name: "session"'` → 0 | `0` | **ĐÚNG** |
| `grep -c 'name: "doctor"'` → 0 | `0` | **ĐÚNG** |
| "49 lệnh cấp một" | `49` | **ĐÚNG con số, SAI lý do** — xem bên dưới |
| `commands/session.ts` chưa có | `No such file or directory` | **ĐÚNG** (file tạo mới) |
| `test/session/session-cli.test.ts` chưa có | `No such file or directory` | **ĐÚNG** (file tạo mới) — **nhưng sai chỗ** |
| `commands/find.ts` là "khuôn, ba dòng `name` / `load` / `help`" | 38 dòng, là class oclif: `description` / `args` / `flags` / `run()` — **không có** `name` / `load` / `help` | **SAI một nửa** |
| `SessionStorageBackend.loadIndex` trả "path/size/mtime/title", là **nguồn duy nhất** | Interface tồn tại, trả **6** trường | **SAI** — `loadIndex` chỉ có trên backend *indexed* |
| `flag-tables.ts:249` = `--resume` / `-r` / `--session` với `rejectEmpty` | `":--resume": { set: setResume, rejectEmpty: true },` (`:250` = `-r`, `:251` = `--session`) | **ĐÚNG** |
| `flag-tables.ts:300` = `--continue` | `	"--continue",` (trong `VALUELESS_FLAGS`) | **ĐÚNG** |
| `slash-commands/helpers/security.ts:99` = `--archive-existing` | `		case "--archive-existing":` | **ĐÚNG** |
| "grep `archive` trong `slash-commands/` chỉ trả về `--archive-existing`" | 6 hit, tất cả đều là `archiveExisting` của security scan | **ĐÚNG trong phạm vi** |
| "không có verb archive/unarchive session nào" | `omp gc --archive` **đã archive session thật** (gzip + artifacts + dòng history) | **SAI** — xem bên dưới |
| "`list` nhân bản output của `omp find`" | `omp find` = tìm kiếm ngữ nghĩa **trên cây file**, bắt buộc có `query`, in score gauge + token + chi phí. Không đụng session store | **SAI** |
| "`bun run session list` và `bun run find` cho ra cùng nội dung" | hai lệnh khác miền dữ liệu | **SAI** — cổng 2 không tồn tại được |

**Ba chỗ tài liệu sai so với cây thật, xử lý trước khi gõ:**

1. **`list` KHÔNG thể "nhân bản output của `omp find`" — lỗi nghiêm trọng nhất.** W22 lặp **bốn lần** rằng `list` phải "nhân bản output của `omp find`", và cổng 2 đòi `bun run session list` khớp `bun run find` từng byte. `packages/coding-agent/src/cli/find-cli.ts:1-3` (nguyên văn): `` * `omp find`: run the semantic `find` tool's cascade from the shell. Same search as the tool, printed as a ranked, colored digest (or JSON). `` — nó **bắt buộc có query** (`find-cli.ts:74-78` exit 1 khi rỗng), quét cây file bằng `runCascade`, in score gauge + `$${stats.cost.toFixed(4)}`. **Hai miền dữ liệu khác nhau, không thể khớp từng byte.** Cách gõ đúng: `list` phải gọi `listSessionsReadOnly` / `listAllSessions` tại `session-listing.ts:646` và `:651` — **cùng hàm** mà `omp gc` và `/resume` dùng.
2. **"Không có verb archive/unarchive session nào" — SAI, cơ chế archive đã có.** `commands/gc.ts:16` (`archive: Flags.boolean({ description: "Archive cold sessions" }),`) và `:18` (`"cold-archive-after-days": Flags.integer(…)`); `gc-cli.ts:214-215` `getArchivedSessionsDir`; `:506-518` `archiveDestination()` ghi `` path.join(archiveRoot, `${relativePath}.gz`) `` (tức **gzip**); `:656-693` `moveSessionWithArtifacts()` gzip session, move thư mục artifacts, và **rollback** nếu giữa chừng hỏng. ⇒ nếu implementer viết `omp session archive` bằng `movePath` trần thì `omp gc --archive` sẽ **không nhìn thấy** session đó — đúng "nguồn sự thật thứ hai" mà W22 tự cấm.
3. **Bảng "File cần chạm tới" THIẾU `command-help.ts`.** `test/cli-command-metadata.test.ts:30` đã có sẵn `expect(entry.help, \`${entry.name} must provide static help metadata\`).toBeDefined();` — thêm entry `session` mà không có `sessionHelp` ⇒ test đỏ. Cần thêm file thứ 7.

Ngoài ra: **"49" đúng, nhưng lý do trong tài liệu thì sai.** W22 giải thích 50→49 bằng *"con số 50 đếm cả tên option lồng nhou"* — đo lại: `grep -oE '^\s+name: "[^"]*"' | sort | wc -l` → 50, `grep -oE '^\s+name: "[a-z0-9-]+"' | sort -u | wc -l` → 49, chênh lệch là entry nội bộ `__complete` tại `cli-commands.ts:88` (tên có dấu `_`). **Không có tên option lồng nào trong file.** Và **codex KHÔNG có namespace `session`** — nó dùng verb cấp một (`codex archive`, `codex delete`, `codex unarchive` trong `codex-rs/cli/src/main.rs:202-221`).

**Bảng điểm sửa.** Mọi mục TRƯỚC dưới đây được trích từ file thật, đã mở và đọc trong đợt này.

| # | đường/dẫn | symbol / hàm | TRƯỚC (nguyên văn) | SAU (hình dạng) |
|---|---|---|---|---|
| 1 | `packages/coding-agent/src/cli-commands.ts` **:210–214** | entry `shell` trong `commands: CommandEntry[]` | `	{`<br>`		name: "shell",`<br>`		load: () => import("./commands/shell").then(m => m.default),`<br>`		help: commandHelp.shellHelp,`<br>`	},` | Chèn ngay **trước** entry `shell`, cùng hình ba dòng (`name: "session"` / `load:` / `help: commandHelp.sessionHelp`), đặt sau `setup` `:205` để giữ thứ tự gần alphabet |
| 2 | `packages/coding-agent/src/cli/command-help.ts` **:127–131** *(KHÔNG có trong bảng "File cần chạm tới" của W22)* | `setupHelp` / `shellHelp` | `export const setupHelp = {`<br>`	…`<br>`} satisfies CommandMetadata;`<br><br>`export const shellHelp = { description: "Interactive shell console" } satisfies CommandMetadata;` | Thêm `sessionHelp` giữa hai cái trên: `export const sessionHelp = {`<br>`	description: "Work with saved sessions from a script: list, show, archive, unarchive, delete",`<br>`} satisfies CommandMetadata;` — **không có dòng này thì `bun test` đỏ ngay** |
| 3 | `packages/coding-agent/src/commands/session.ts` | *(file chưa tồn tại)* | `MISSING: packages/coding-agent/src/commands/session.ts` | Tạo mới. Lớp `Session extends Command` với `static description = commandHelp.description;`, một `Args.string` positional `action` (`options: ["list","show","archive","unarchive","delete"]`, `default: "list"`), một `Args.string` `target`, ba cờ `--last` / `--all` / `--json` |
| 4 | `packages/coding-agent/src/cli/find-cli.ts` **:74–78** | `runFindCommand` | `if (!cmd.query.trim()) {`<br>`		console.error(chalk.red("Error: query is required"));`<br>`		process.exit(1);`<br>`	}` | **KHÔNG SỬA.** Đây là bằng chứng rằng `omp find` là *tìm kiếm ngữ nghĩa theo câu truy vấn*, không phải liệt kê session |
| 5 | `packages/coding-agent/src/session/indexed-session-storage.ts` **:18–30** | `SessionStorageIndexEntry` / `SessionStorageBackend.loadIndex` | `export interface SessionStorageIndexEntry {`<br>`	path: string;`<br>`	size: number;`<br>`	mtimeMs: number;`<br>`	title?: string;`<br>`	titleSource?: SessionTitleUpdate["source"];`<br>`	titleUpdatedAt?: string;`<br>`}`<br><br>`export interface SessionStorageBackend {`<br>`	init(): Promise<void>;`<br>`	loadIndex(): Promise<Iterable<SessionStorageIndexEntry>>;` | **KHÔNG SỬA — và KHÔNG dùng làm nguồn cho `omp session`.** Đường đọc session thật là `session-listing.ts` |
| 6 | `packages/coding-agent/src/session/session-listing.ts` **:639–655, :702–708, :821–848** | `listSessions` / `listSessionsReadOnly` / `listAllSessions` / `findMostRecentSession` / `resolveResumableSession` | `export function listSessions(sessionDir: string, storage: SessionStorage): Promise<SessionInfo[]> {`<br>`	return scanSessionDir(sessionDir, storage, true);`<br>`}`<br><br>`export function listSessionsReadOnly(sessionDir: string, storage: SessionStorage): Promise<SessionInfo[]> {`<br>`	return scanSessionDirReadOnly(sessionDir, storage, true);`<br>`}` | **KHÔNG SỬA** — nhưng đây là đường đọc thật mà `list` phải gọi |
| 7 | `packages/coding-agent/src/commands/gc.ts` **:16, :18** | cờ `--archive` / `--cold-archive-after-days` | `		archive: Flags.boolean({ description: "Archive cold sessions" }),`<br>`…`<br>`		"cold-archive-after-days": Flags.integer({ description: "Minimum session age before archiving" }),` | **KHÔNG SỬA.** Nhưng nó phủ định một claim của W22: cơ chế archive session **đã có** |
| 8 | `packages/coding-agent/src/cli/gc-cli.ts` **:214–215, :506–518, :656–693** | `getArchivedSessionsDir` / `archiveDestination` / `moveSessionWithArtifacts` | `function getArchivedSessionsDir(agentDir: string): string {`<br>`	return path.join(path.dirname(getSessionsDir(agentDir)), "archive", "sessions");`<br>`}`<br>`…`<br>`	return {`<br>`		relativePath,`<br>`		destinationPath: path.join(archiveRoot, \`${relativePath}.gz\`),`<br>`	};`<br>`}` | **KHÔNG SỬA — nhưng verb `archive` mới KHÔNG được tự dựng lại.** Nó phải gọi lại đường này |
| 9 | `packages/coding-agent/src/cli/flag-tables.ts` **:248–252, :300** | `OPTIONAL_FLAGS` / `VALUELESS_FLAGS` | `export const OPTIONAL_FLAGS: Record<string, OptionalFlagConfig> = {`<br>`	"--resume": { set: setResume, rejectEmpty: true },`<br>`	"-r": { set: setResume, rejectEmpty: true },`<br>`	"--session": { set: setResume, rejectEmpty: true },`<br>`};`<br>và dòng 300: `	"--continue",` | **KHÔNG SỬA.** Đây là đường một-shot; đổi là hồi quy trực tiếp. Kiểm bằng `git diff --stat` |
| 10 | `packages/coding-agent/src/slash-commands/helpers/security.ts` **:99** | nhánh `case "--archive-existing":` | `			case "--archive-existing":` | **KHÔNG SỬA.** Cờ của nhánh security scan, không phải verb archive session |
| 11 | `packages/coding-agent/test/cli-argv-routing.test.ts` **:59–63** | test `gc` sẵn có | (test sẵn có) | thêm assertion phân tuyến ngay dưới |
| 12 | `packages/coding-agent/test/session/session-cli.test.ts` | *(file chưa tồn tại)* | `MISSING: …/test/session/session-cli.test.ts` | Tạo mới, **chỉ chứa** case (2)(3)(4) — assertion phân tuyến đặt ở dòng 11, không đặt ở đây |

**Các bước có neo đã kiểm.**

1. **Đo lại số lệnh trước khi viết PR** — `grep -oE '^\s+name: "[a-z0-9-]+"' packages/coding-agent/src/cli-commands.ts | sort -u | wc -l` → 49; `grep -n '__complete' …` → dòng 88. Ghi 49 **kèm lý do đúng**.
2. **Thêm `sessionHelp` vào `command-help.ts`.** Neo: `:127` (`export const setupHelp = {`) và `:131`. Chèn giữa. Bỏ bước này thì `cli-command-metadata.test.ts:30` đỏ.
3. **Tạo `commands/session.ts` theo khuôn thật.** Khuôn là `commands/worktree.ts:11-60`, **không** phải `find.ts` — vì `worktree.ts` là lệnh nhiều verb đã có sẵn. Mẫu `worktree.ts:18-23`: `action: Args.string({ description: "list (default), clear, or add", required: false, options: ["list", "clear", "add"], default: "list" })`. Header theo `commands/find.ts:5-9`. Ba cờ: `last` / `all` / `json`.
4. **`list` gọi đường chung, KHÔNG gọi `loadIndex`.** Neo: `session-listing.ts:646` (`listSessionsReadOnly`) và `:651` (`listAllSessions`). Định nghĩa `list` là: `listAllSessions()` khi `--all`, ngược lại `listSessionsReadOnly(dir)`.
5. **`--last` dùng `findMostRecentSession`.** Neo: `session-listing.ts:702-708` (`const sessions = await scanSessionDir(sessionDir, storage, false); return sessions[0]?.path ?? null;`).
6. **Bốn verb còn lại dùng `resolveResumableSession`.** Neo: `:821-848`. `omp share` đã làm đúng việc này — `commands/share.ts:16` import chính nó, `:26` mô tả `"Session id (prefix) or path to a session .jsonl"`.
7. **`archive` / `unarchive` phải đi qua đường của `omp gc`, không dựng đường mới.** Neo: `gc-cli.ts:214-215`, `:506-518`, `:656-693`. `unarchive` phải giải nén `.gz` về `sessionsRoot` bằng chính quy tắc `path.relative` ngược của `archiveDestination`.
8. **Đăng ký entry `session` trong `cli-commands.ts`.** Neo chèn: `:205` (`name: "setup"`) → `:210` (`name: "shell"`). **Cùng đợt merge với W18.**
9. **Viết assertion phân tuyến, MỘT cái.** Neo: `test/cli-argv-routing.test.ts:59-63`.
10. **Chạy cổng.**

**Hợp đồng test.** Bốn file liên quan. **Assertion (1) là của W18 — viết MỘT cái, đặt ở `cli-argv-routing.test.ts`:**

```ts
// packages/coding-agent/test/cli-argv-routing.test.ts — thêm sau dòng 63
import { commands } from "@oh-my-pi/pi-coding-agent/cli-commands";

test("every registered subcommand dispatches instead of falling through to launch", () => {
    for (const { name } of commands) {
        expect(resolveCliArgv([name, "--help"])).toEqual({ argv: [name, "--help"] });
    }
});
```

Lặp trên registry, không hard-code tên — đó là thứ biến "mọi subcommand thật sự được phân tuyến" thành một phép kiểm có thể đỏ, thay vì hai assertion rời rạc. Nó cũng tự phủ `doctor` khi W18 thêm entry. *Hồi quy:* xoá entry `session` khỏi `cli-commands.ts` → test đỏ ngay với tên lệnh; nếu lọt, `omp session list` **gửi `session list` thành prompt cho LLM** và mở một phiên agent mới (`cli-commands.ts:450`: `return { argv: ["launch", ...argv] };`) — hồi quy #1496/#1499, hậu quả im lặng.

**(2) Bản âm phủ định của nguồn sự thật** — `test/session/session-cli.test.ts` (tạo mới). Xây một store thật (thư mục tạm, vài file `*.jsonl` hợp lệ), rồi: `omp session list` và `listSessionsReadOnly()` trên cùng store cho ra **cùng tập `path`**, cùng thứ tự; `omp session show <id>` trả `SessionInfo` mà `resolveResumableSession()` trả cho cùng id. *Hồi quy:* nếu `list` tự glob `*.jsonl` thay vì gọi `listSessionsReadOnly`, `/resume` bỏ qua session 0-turn (`isEmptySession`, `session-listing.ts:676`) còn `omp session list` thì không — cùng một store, hai danh sách khác nhau.

**(3) Bốn verb đọc từ đường chung** — `show` / `archive` / `unarchive` / `delete` với một target không tồn tại phải **cùng** trả về cùng một lỗi resolve, và cùng thoát cùng mã. `archive` trên một session đã archive phải báo trùng đích, khớp với `gc-cli.ts:662` (`archive destination exists: ${destSession}`). *Hồi quy:* `omp session archive abc` báo "not found" trong khi `omp gc --archive` vẫn archive được, vì hai lệnh dùng hai bộ resolver khác nhau.

**(4) Bảo toàn** — `omp find` giữ **từng byte** output (chụp `bun run find "<query>" > before.txt` **trước** khi đổi, `diff` sau); `/resume` `/fork` trong TUI không đổi (`test/session/session-manager-fork.test.ts`, `test/session/peek-session-init.test.ts` phải xanh mà không sửa); `omp gc` / `omp share` giữ nguyên phạm vi; `flag-tables.ts:249` và `:300` không đổi một dòng.

**(5) Cần có sẵn, không viết mới** — `test/cli-command-metadata.test.ts:30` **đã** phủ "mọi entry phải có `help`".

**Cổng có đỏ được không.**

| # | Lệnh | ĐỎ ĐƯỢC KHÔNG | Bằng cách nào |
|---|---|---|---|
| G1 | `grep -c 'name: "session"' …cli-commands.ts` ≥ 1 | **CÓ** | Xoá entry `session` → grep trả `0`. Đỏ theo nghĩa đen. |
| G2 | assertion phân tuyến lặp trên `commands` (W18+W22, MỘT cái) | **CÓ** | Xoá entry `session` → `resolveCliArgv(["session","--help"])` trả `{ argv: ["launch", "session", "--help"] }` (theo `cli-commands.ts:450`) → `toEqual` fail |
| G3 | `bun run session list` khớp `bun run find` | **KHÔNG — CỔNG NÀY KHÔNG TỒN TẠI** | Không thể đỏ vì không thể xanh: `omp find` là tìm kiếm ngữ nghĩa file, `session list` là liệt kê session. **Phải bỏ và thay bằng G3'.** |
| G3' | `omp session list` cho ra **cùng tập `path`, cùng thứ tự** với `listSessionsReadOnly()` trên cùng store | **CÓ** | Đổi `list` sang glob `*.jsonl` trần, hoặc bỏ qua `isEmptySession` → danh sách lệch |
| G4 | `flag-tables.ts` không đổi một dòng | **CÓ** | `git diff --stat …/cli/flag-tables.ts` rỗng; sửa `:249` hoặc `:300` → file xuất hiện trong diff |
| G5 | `omp find` giữ từng byte | **CÓ** | Chụp `bun run find "<query>" > /tmp/before.txt` **trên base trước khi sửa**, `diff` sau. Phải chụp trước; nếu chụp sau khi sửa thì cổng luôn xanh |
| G6 | `bun run check:ts` | **CÓ** | Bỏ `sessionHelp` → `cli-command-metadata.test.ts:30` đỏ |

**Câu trả lời thẳng cho câu hỏi quan trọng nhất: 5/6 cổng đỏ được thật. G3 không bao giờ đỏ được vì nó không bao giờ xanh được** — nó là loại cổng tệ nhất: tạo cảm giác an toàn giả, và khiến implementer dỗi công sang viết lại `list` theo hình `omp find` (tức tạo đường đọc thứ hai — đúng thứ W22 tự cấm). **G3 phải được viết lại thành G3' trước khi mở PR.**

**Cạm bẫy riêng của mục này.**

**7.1 — Tin "nhân bản output `omp find`" và viết lại `list` từ đầu.** Cạm bẫy **dễ trúng nhất**, vì nó đến thẳng từ văn bản kế hoạch, lặp lại bốn lần. Nó *trông* hợp lý vì "nhân bản thay vì viết lại" nghe như nguyên tắc tốt — nhưng ở đây `omp find` và session store là hai miền dữ liệu không giao nhau. Kẻ gõ sẽ bỏ `listSessionsReadOnly` và tự dựng bảng. **Cách tránh duy nhất: đọc `session-listing.ts:646` trước khi viết dòng nào của `list`.**

**7.2 — Tin "không có archive session nào" và viết `archive` bằng `movePath` trần.** Cơ chế archive đã có trong `gc-cli.ts` với ba đặc tính không đoán được nếu chỉ đọc tên hàm: gzip (`.gz`), move kèm thư mục artifacts, và rollback giữa chừng. Bỏ sót một trong ba thì `omp gc --archive` im lặng không thấy session do `omp session archive` tạo ra — **hỏng dữ liệu âm thầm, không lỗi. Đây là cạm bẫy nặng nhất về hậu quả.**

**7.3 — Quên `command-help.ts` vì nó không nằm trong bảng "File cần chạm tới".** Thêm entry `session` là `check:ts`/`bun test` đỏ với `session must provide static help metadata` — và người gõ dễ tưởng đó là lỗi của W18 rồi đụng vào phần của người khác.

**7.4 — Tách assertion phân tuyến thành hai.** Chính W22 đã cảnh báo, nhưng cái cảnh báo nằm ở mục "Phụ thuộc" và "Cách sai dễ nhất" — xa hơn bước viết test. **Ghi assertion vào `cli-argv-routing.test.ts` ngay dưới test `gc` sẵn có ở dòng 59.**

**7.5 — Đếm 49 mà đưa nhầm lý do "tên option lồng nhou".** Chênh lệch là `__complete` ở dòng 88. Nếu ghi sai lý do vào PR, reviewer đối chiếu sẽ không tìm ra bằng chứng và phải tự đo lại.

**7.6 — Dùng `loadIndex` cho `list` vì tài liệu gọi nó là "nguồn duy nhất".** `loadIndex` (`indexed-session-storage.ts:30`) chỉ tồn tại trên các backend *indexed* (SQL/Redis). `listAllSessions` mặc định là `new FileSessionStorage()` và **không bao giờ gọi `loadIndex`** — nó glob `*/*.jsonl` rồi `collectSessionsFromFiles`. Dùng `loadIndex` sẽ hỏng trên backend file mặc định.

**7.7 — Thêm `--last` rồi tưởng nó tương đương `--continue`.** `flag-tables.ts:300` `--continue` là boolean không giá trị. `--last` trong codex là cờ của `resume`/`fork` để chọn session mới nhất. Nếu dùng lại `setResume` cho `--last` thì đụng vào đúng dòng mà W22 dặn giữ nguyên.

---


## Rủi ro và cách sai dễ nhất

Hai mươi mối work item còn trong phạm vi có hai mươi mối `risk` riêng (W8 đã ra khỏi phạm vi ngày 2026-09-28 nhưng §W8 vẫn còn nguyên trong file này như vết của spec cũ). Đọc chúng cạnh nhau thì chúng rút lại còn **bốn kiểu chết**, và bốn kiểu này không phải bốn lỗi ở bốn chỗ khác nhau — chúng là bốn cách milestone này đi sai mà mọi cổng nghiệm thu vẫn báo xanh.

| Work item | Rủi ro | Cách giảm |
| --- | --- | --- |
| W2, W4, W9, W11, W12, W13, W14, W15, W16, W17 | **Cổng xanh giả — `bun test` cần native addon.** Ở trạng thái chưa build, `bun test` trả `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` tại `packages/natives/native/index.js:23:24`, và mọi cổng hành vi của các item này là **trong** (vacuous). Đây **không phải** hạn chế của máy — chỉ là thiếu một bước build; W13, W16, W11, W12, W8, W9, W14, W15, W17 đều ghi cùng một điều kiện tái lập được. | Build addon **một lần** trước khi nhận việc: `brew install ninja` rồi `bun --cwd=packages/natives run build` (hoặc `bun run build:native`). Sau đó **mọi** item kể trên chạy được bình thường — đo lại: `bun test packages/utils/test/` → 743 pass / 10 skip / 0 fail, `bun test packages/coding-agent/test/mcp-config-scope-dedup.test.ts` → 8 pass / 0 fail. Tới lúc đó, item nào chưa chạy cổng của mình thì coi là **chưa xác minh**, không phải là xanh. Ở trạng thái chưa build, cổng thật duy nhất là `bun run check:ts` — đã PASS ở HEAD, không cần addon. Không dùng `tsc`. |
| W1, W5, W11, W16, W17 | **Cổng xanh mà không bảo vệ đúng thứ** — code chạy, im lặng, không throw. W5: viết thành runtime `.test.ts` với grep thì "passes forever while the wire types drift silent". W11: nếu `declare strict: boolean` thành field runtime thật, field initializer chạy trước thân constructor nên guard `key in this` thành `true`, guard BỎ QUA proxy và `adapter.strict` đọc ra `false` dù definition có `strict: true` — "silent breakage, không throw, không cảnh báo", và phân kỳ theo provider. W16: nới group cho tới khi xanh. W17: giao normalize `camelCase`→`snake_case` làm phần "cleanup" tuỳ chọn. W1: cast `as HookAPI` tại `hooks/loader.ts:128` đủ lỏng để đổi `hooks/types.ts` **không** kèm impl vẫn type-check sạch. | Mỗi cổng phải có ít nhất một assertion đọc **giá trị cụ thể** — run-order array, call count, wire payload — chứ không phải `expect(true)` hay một grep. Với W1, sửa `hooks/types.ts` và `hooks/loader.ts` trong cùng một commit, vì type-check sẽ không bắt được khi thiếu một trong hai. Với W11, khoá cả hai chiều của hợp đồng trên cùng output của bridge. Với W16, khi một group đỏ, **không** nới group để làm nó xanh. |
| W11, W12, W13, W14, W15, W17 | **Chọn nhầm bản tham chiếu** — hoặc dựng thêm một hệ thống thứ hai cạnh cái đang chạy, hoặc port từ một nguồn không tồn tại. ~~W8: "Creating a SECOND system instead of gating the existing one" — âm thầm nhất, vì file mới default `"off"` không tốn tiền, test riêng của nó xanh, và accounting không thấy.~~ *(W8 ngoài phạm vi 2026-09-28 — vết của spec cũ.)* W13: viết một writer backpressure thứ hai, yếu hơn, cạnh `RpcOutputWriter` đã mạnh hơn và đã có test. W11: dựng `constrained-sampling.ts` cạnh `normalize.ts`. W12: phải nói rõ `concurrency = \"exclusive\"` đã serialise gì — nó chỉ trong MỘT batch của MỘT agent (`lastExclusive` function-local tại `packages/agent/src/agent-loop.ts:3511`, trong `executeToolCalls` bắt đầu ở `:3024`), không chia sẻ giữa các agent hay session; `ast_edit` không khai báo concurrency nên không được bảo vệ gì. W14/W15/W17: kế hoạch và bản tham chiếu mô tả một hình dạng mà cây này không có — ~~W8 nói thẳng "`pi-ref/` does not exist in this checkout ... all six constants ... are UNVERIFIABLE from this repo";~~ W15 nói transcript chính KHÔNG dùng `ScrollView` như kế hoạch giả định; W17 nói `findExtensionStackMatches` phụ thuộc `Extension.sourceInfo.{origin,source,baseDir,scope}` mà record của omp khác hình dạng. W19: dựng một hệ thống (wrapper, plugin tuỳ biến) thay vì một dòng cấu hình — bản tham chiếu chỉ có một dòng `deny` cộng chú thích 2 dòng, không phải một hệ thống. | Mỗi item phải trả lời bằng chứng: "cái đang chạy là gì, và tôi đang sửa nó chứ không thêm bên cạnh". Với W12, viết vào PR một câu giải thích vì sao cần cả hai cơ chế. Với ~~W8~~/W14/W15/W17, số và hình dạng phải **suy ra từ cây này hoặc từ nguồn công bố**, không từ trí nhớ về `pi-ref`; nếu không suy ra được thì để field undefined và ghi lại, đừng đoán. |
| W6, W10, W12, W13, W17 | **Đổi hành vi người dùng thấy, trên đường production đang chạy, khi quyết định chưa được ký.** W6: `rm -rf /tmp/build` khớp regex recursive-delete neo `/`, nên user dựa vào allow rule để auto-run cleanup trong yolo mất luôn, không có escape hatch ở tầng settings — và thêm nữa là **half-applying the pair**: check ở `bash.ts:515` bị guard `!compoundSegments` nên không reachable với compound command, dòng `bash.ts:545` mới là nhánh payload thật đi tới; sửa 516 một mình là không làm gì. ~~W8: `"off"` làm mặc định là một BREAK trên tính năng đang chạy và miễn phí.~~ *(W8 ngoài phạm vi 2026-09-28.)* W10: "telemetry.ts sits on every agent path, so a regression here is a production incident and not a red test" — rủi ro hồi quy trên mỗi LOC cao nhất milestone. W12: queue chặn interleaving và byte-tearing nhưng KHÔNG chặn lost update, vì lần đọc pre-image tại `packages/coding-agent/src/edit/index.ts:711` nằm ngoài lock; và bọc `writeFileWithFallback` (:402) có thể deadlock nếu extension handler gọi lại vào chính queue đó. W13: chạm ba đường stdout đang chạy. W17: transcript là opt-in (đúng), nhưng redaction phải load-bearing — không thì bí mật lọt vào một file mà người dùng được dặn là an toàn để gửi đi. | Không item nào trong nhóm này được coi là xong khi test xanh mà quyết định sản phẩm chưa có. W6 cần sign-off của product trước khi sửa dòng nào. ~~W8 cần chốt cửa sổ deprecation trước release.~~ *(W8 ngoài phạm vi 2026-09-28 — không còn release nào của nó.)* W10 cần commit tách riêng: `git diff --stat` trên `packages/agent/test/otel.test.ts` phải rỗng — đó là bằng chứng duy nhất rằng không có exported signature nào đổi. W12 phải nói rõ trong PR là chỉ sửa interleaving. W13 chỉ migrate những call site đã chốt ở bảng quyết định, không tự mở rộng. W17 khoá normalize như một assertion bắt buộc, không phải tuỳ chọn. |

**Vì sao bốn dòng này và không phải hai mươi mối.** Dòng 1 và dòng 2 là cùng một triệu chứng — bạn tin cổng, cổng im — nhưng khác nguồn: một cái do môi trường, một cái do bản thân cách viết test. Dòng 3 và dòng 4 là cùng một triệu chứng — bạn viết code đúng hình dạng nhưng sai ý. Ba đường hỏng nặng nhất theo thứ tự: **dòng 1** vì nó làm mất toàn bộ giá trị nghiệm thu của mười một item cùng lúc và không tự lộ ra; **dòng 4** vì hậu quả tới người dùng và tới production; **dòng 3** vì nó âm thầm để lại nợ kỹ thuật mà không ai phát hiện cho tới milestone sau. Bảy mục `risk` còn lại của các item là biến thể cục bộ của bốn dòng này, không phải đường hỏng thứ năm.

---

## Bảng quyết định cần bạn chốt

`questions.json` có **64 câu hỏi**. Hai câu của W16 về `move()` và về `readSlices` trên path không tồn tại là **cùng một quyết định** (hợp đồng nào là đúng, hay group bị over-specified) nên gộp thành một dòng và ghi rõ cả hai divergence — tổng còn **63 dòng**. Thêm **2 dòng** ngày 2026-09-29 từ `.lavish-wip/GAP-REGISTER-2.md` §4 (`GAP-D4` → W18, `GAP-D5` → W20) — chúng **không** đến từ `questions.json` — nên bảng dưới có **65 dòng**. Nhóm A là những câu không có câu trả lời thì **không bắt đầu được** work item, hoặc bắt đầu rồi thì viết ra sai ngay dòng code đầu tiên. Nhóm B là phần còn lại: gộp sau khi land, hoặc ghi vào handoff M2.

### Nhóm A — chặn việc bắt đầu work item

> ⛔ **Sáu hàng `~~W8 (cache warmer)~~` dưới đây không còn cần bạn chốt** (2026-09-28): W8 đã ra
> khỏi phạm vi, nên không có work item nào để bắt đầu và không có quyết định nào còn treo. Chúng
> được giữ lại như vết của `questions.json` cũ — **đừng trả lời chúng**, và đừng tính chúng vào
> việc còn tồn đọng.

| Work item | Câu hỏi | Vì sao nó chặn | Mặc định nếu không trả lời |
| --- | --- | --- | --- |
| W1 (disposer) | File chưa track `packages/coding-agent/test/collab/w3-probe.test.ts` (1 type error) sẽ bị xoá, commit, hay để lại cho người nhận W3? | Trong lúc chưa xử lý, `bun run check:ts` **toàn repo** đỏ vĩnh viễn — và đó là cổng type sạch duy nhất còn lại của repo, cửa sổ duy nhất để chứng minh W1, W2, W6, W10, W11, W12, W13 không phá nhau. | chưa có mặc định — cần bạn quyết |
| W6 (deny critical patterns) | `policy: \"prompt\"` có thay được cho `deny` không? Dưới yolo một quyết định mang `policy` tường minh được trả nguyên văn kèm `override: false`, nên lệnh nguy hiểm sẽ hỏi thay vì bị từ chối. `prompt` bị loại vì `docs/approval-mode.md:162` nói `prompt` không thỏa được trong subagent headless, còn `deny` fail-closed xác định. | Câu hỏi tự nói: "this is not a detail the engineer should decide". Nó đổi nhánh if, không phải đổi một dòng. | `deny` (theo câu hỏi) |
| W6 (deny critical patterns) | **SIGN-OFF:** có chấp nhận rằng `bash.patterns` với `{ approval: \"allow\" }` không còn cho phép **bất kỳ** lệnh nào khớp `CRITICAL_BASH_PATTERNS` không? `rm -rf /tmp/build` khớp regex recursive-delete neo `/`, nên user đang dựa vào allow rule để auto-run cleanup trong yolo sẽ mất, không có escape hatch ở tầng settings. Ba lựa chọn: (a) ship nguyên; (b) deny nhường cho `tools.approval.bash: \"allow\"` tường minh; (c) thu hẹp `CRITICAL_BASH_PATTERNS` để loại `/tmp` và `/var/tmp`. | Đây là phần sắc nhất của thay đổi và kế hoạch không gọi tên nó. Chốt (b) hay (c) sau khi đã ship (a) thì là thay đổi hành vi lần hai. | (a) ship nguyên — khuyến nghị trong câu hỏi |
| W7 (`promptCacheLifetime`) | **OQ1 — chặn:** giữ boolean `supports-long-prompt-cache-retention` (đã wired ở `axes.ts:153`, khai ở `anthropic.kdl:266, 286, 292, 317, 328, 341, 349`, hai consumer gate `ttl: \"1h\"` tại `packages/ai/src/providers/amazon-bedrock.ts:960` và `openai-responses.ts:1253`, resolve ở `resolve.ts:721` và `:830` với baseline hard-code `false` ở `resolve.ts:899`) hay hợp nhất? (a) xoá boolean và migrate cả hai consumer sang `promptCacheLifetime?.long`; (b) giữ cả hai với nghĩa tách bạch tường minh. | Kế hoạch tự gọi đây là BLOCKING và nó đổi nội dung bước 6. Quan trọng hơn: compiler **không** bắt được chuyện "hai axis nói cùng một sự thật" — `gen:compat`, `check:ts` và `check:ts` ở catalog đều có thể xanh trong khi quyết định thiết kế vẫn chưa có. | chưa có mặc định — khuyến nghị trong câu hỏi: giữ boolean (đã ship và đúng), scope `promptCacheLifetime` chỉ cho `[\"anthropic\"]`, tách việc hợp nhất thành work item riêng |
| ~~W8 (cache warmer)~~ — ⛔ NGOÀI PHẠM VI | F6 (`decideWarm` / `WarmDecision`) được lên lịch trong milestone 1, hay W8 tự định nghĩa shape? Chữ ký `arm()` mới nhận `WarmDecision`, mà trong repo chưa có type hay hàm nào tên đó. | Câu hỏi tự nói: phải chốt trước khi kỹ sư bắt đầu, vì nó quyết định bước 4 có gõ được hay không. | chưa có mặc định — cần bạn quyết |
| ~~W8 (cache warmer)~~ — ⛔ NGOÀI PHẠM VI | `pi-ref/` không tồn tại trong checkout này, nên cả sáu hằng kế hoạch bảo port (`MAX_WARMING_AGE_MS` :16, `MAX_IDLE_WARMING_AGE_MS` :18, `CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS` :20, `IDLE_CONTINUATION_PROBABILITY` :26, `getCacheWarmingDelayMs` :29, `isReplayable` :55-57) và mọi claim hành vi trích từ `cache-warmer.ts` đều **không kiểm chứng được** từ repo này. Package tham chiếu thật nằm ở đâu, và có nên tự suy ra số từ bảng TTL công bố của Anthropic thay vì port? | Cùng một cổng chặn với W7: bảng TTL theo provider theo tier phải tồn tại trước khi W7 **và** W8 bắt đầu. Kỹ sư không source được một con số thì phải để field undefined chứ không đoán — TTL đo quá làm refresh nổ trên một entry lẽ ra còn sống, TTL đo thiếu chỉ mất một lần miss. | chưa có mặc định — cần bạn quyết |
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
| W18 (`omp doctor`) | **GAP-D4 — chặn:** chốt danh sách check **trước khi viết dòng nào**. `doctor` là cái bẫy kinh điển vì mọi tính năng mới đều muốn thêm một check. Câu hỏi từ `.lavish-wip/GAP-REGISTER-2.md` §4. | Quyết định này quyết định bước 1 của W18 có gõ được hay không. Mọi check thêm sau danh sách phải **tự chứng minh bằng một test**; sổ còn yêu cầu một quy tắc ghi vào **PR template**, không chỉ ý định miệng. | Chốt danh sách 7 check ở bước 1 của W18 (config parse + `assertKnownSettingPaths`; credential reachability; parity `patches/*.patch` ↔ `package.json.patchedDependencies`; thư mục log; số extension active; `PATH`/`which` cho `git`; native addon). **Không** probe network, sandbox, hay bất kỳ thứ gì cần network (theo câu hỏi) |
| W20 (approval cache key) | **GAP-D5 — chặn ship:** giữ đường hồi tương thích cho cache `allow_always` theo tên tool cũ không? Các phiên đang cache sẽ hỏi lại một lần nữa. | Cache cũ theo tên tool **chính là thứ đang gây lỗi** (`rm -rf` sau một "always allow" cho `git status`). Nhưng đây là thay đổi hành vi người dùng thấy, và quyết định này phải của người chứ chứ không phải của người implementer. | **Không giữ** (khuyến nghị trong câu hỏi); nêu trong changelog |
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
| ~~W8 (cache warmer)~~ — ⛔ NGOÀI PHẠM VI | `"off"` làm mặc định là một **BREAK** trên tính năng đang chạy và miễn phí. User đang hưởng lợi từ keep-alive warming không điều kiện sẽ mất nó mà không cần hành động gì. Một ghi chú migration trong changelog là đủ, hay release đầu cần một cửa sổ deprecation giữ mặc định cũ? | Quyết định thuộc về release, phải chốt trước khi chốt mặc định. | chưa có mặc định — cần bạn quyết (giá trị mặc định `off` thì đã nêu trong effect của W8; câu hỏi này là về cửa sổ deprecation) |
| ~~W8 (cache warmer)~~ — ⛔ NGOÀI PHẠM VI | **Cách ly test:** `isLeakedThinkingHealExempt` (`packages/ai/src/stream.ts:102`) đọc `$env.ANTHROPIC_BASE_URL` và `$env.FOUNDRY_BASE_URL`, còn `resolveCacheRetention` (`utils.ts:538`) đọc `$env.PI_CACHE_RETENTION`. Một máy có `PI_CACHE_RETENTION=long` trong shell sẽ cho kết quả khác CI, và AGENTS.md cấm mutate env ở cấp file. Suite hiện có đã có `withOfficialAnthropicEndpoint` trong `packages/ai/test/helpers` cho nửa endpoint — test mới nên đi qua một helper tương ứng cho nửa retention, hay mỗi case phải trung hoà env tường minh? | Quyết định công cụ test dùng chung; ảnh hưởng độ ổn định của suite trên máy kỹ sư. | chưa có mặc định — cần bạn quyết |
| ~~W8 (cache warmer)~~ — ⛔ NGOÀI PHẠM VI | Nới cổng retention ở :1431 để `long` cũng warm sẽ đổi kinh tế của các session context lớn nhất. Điều này có tương tác với accounting cache-miss của W9 không, hay W9 hoàn toàn downstream và không biết? | Quyết định giá trị mà W9 báo cáo có còn đúng không khi chính sách warm đổi. | chưa có mặc định — cần bạn quyết |
| ~~W8 (cache warmer)~~ — ⛔ NGOÀI PHẠM VI | Kế hoạch nói không provider nào khác được phép warm, nhưng cũng nói KDL fact có thể nói về axis api/provider/transport. Trạng thái cuối đúng là gì: "anthropic-messages trên mọi provider trừ pi-native transport", hay "chỉ provider anthropic, để axis sẵn sàng cho sau"? | Hai hình dạng KDL khác nhau, và sự khác biệt không khôi phục lại được sau này nếu thiếu migration. | chưa có mặc định — cần bạn quyết |
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
| W15 (transcript search) | `bun test` cần native addon: `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là cả ba gate của item này chạy (gate 1 và 2 vốn không cần addon). Bước build đã chạy trước khi item này được xếp lịch chưa — nếu chưa, item sẽ ship type-complete và test-pending. | Quyết định có để item ship chưa nghiệm thu hẳn hay không. | chưa có mặc định — cần bạn quyết |
| W16 (storage conformance) | **Hai divergence, cùng một quyết định** (gộp hai câu hỏi thành một dòng). (1) `move()`: Redis nuốt lỗi migrate meta, SQL thì transactional — một group khẳng định rename atomic sẽ đỏ trên Redis. (2) `readSlices` trên path không tồn tại: SQL ném ENOENT, Redis trả chuỗi rỗng; đây là **đường đọc thật**, nên câu trả lời quyết định một user Redis có bị phục vụ một session rỗng ma hay không. Ở mỗi trường hợp: Redis sai và đây thành bug fix có changelog, hay group bị over-specified và nên scope ra khỏi Redis? | Quyết định này là hợp đồng, không phải chi tiết — và nó phải do người quyết, không để suite tự quyết bằng cách được nới. | chưa có mặc định — cần bạn quyết (cho cả hai divergence) |
| W17 (bug-report) | Có port `findExtensionStackMatches` của pi (`crash-log.ts:47-113`, khoảng 65 dòng, map stack trace về extension gây crash) không? Bản pi phụ thuộc `Extension.sourceInfo.{origin,source,baseDir,scope}`, còn record extension của omp có hình dạng khác. | Port mù là cách commit nhầm hình dạng. | Hoãn, không port trong W17 — đây là tiện nghi chẩn đoán, không thuộc hợp đồng redaction (theo câu hỏi) |
| W17 (bug-report) | Delivery: pi có cả upload lẫn local zip. omp không có upload target tới issue tracker mà item này thiết lập. W17 chỉ ship đường local-archive tường minh và để upload cho item sau, hay đã có sẵn target mà nên gọi? | Quyết định bề mặt giao diện của `/bug-report`. | Chỉ local-archive — thỏa yêu cầu "explicit choice" của kế hoạch mà không bịa endpoint (theo câu hỏi) |
| W17 (bug-report) | Có refactor `packages/coding-agent/src/mcp/errors.ts` (`SECRET_KEY` ở dòng 45, `sanitizeData` ở dòng 100) để delegate sang `diagnostics/redact.ts` mới không? Đây là cùng một hợp đồng cài hai lần, mà AGENTS.md gọi đó là bug — nhưng nó module-private, substring matching cố ý lỏng hơn, và đang nuôi output lỗi MCP thật. | Rủi ro thay đổi output của một đường đang chạy. | Không làm trong W17 — W17 chỉ additive, còn lại làm follow-up (khuyến nghị trong câu hỏi) |


---


## Đính chính so với plan tổng

> ⛔ **Các mục ghi `W8` trong mục này thuộc về lịch sử, không phải việc còn tồn.** W8 đã ra khỏi phạm
> vi ngày 2026-09-28 (xem khối ⛔ ở đầu §W8). Mục này ghi lại **plan gốc đã nói gì và sai ở đâu**,
> nên W8 vẫn xuất hiện ở đây — đọc nó như một bản ghi, đừng suy ra W8 còn cần làm.

Bảng dưới liệt kê đủ **22** đính chính của milestone này, nhóm theo work item. Mỗi dòng là một điểm kiểm được, không phải nhận xét chung chung.

Bốn loại lỗi lặp lại nhiều lần, nói một lần rồi các mục còn lại ghi tắt:

1. **SHA HEAD sai.** 13 mục (W3, W4, W5, W6, W7, W9, W10, W11, W12, W13, W15, W16, W17) lặp lại "repo ở git HEAD `5873776`". HEAD thật là `ecd516f` trên branch `milestone-1`, và đó là commit duy nhất của repo (`feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers`). Mọi anchor đã verify lại đều dùng `ecd516f`.
2. **Nguồn `pi-ref/` không nằm trong repo này.** 12 mục trích nó. Với 8 mục (W1, W2, W4, W8, W9, W10, W13, W16) nguồn đó không đọc được từ đây; với 4 mục (W12, W14, W15, W17) file có thật, đúng LOC, nhưng nằm ở `/Users/tranquangdang21/Projects/pi-ref` — một checkout riêng, không phải thư mục con của `ultraworkers`. Hệ quả: mọi câu chữ "port từ `pi-ref/...`" phải đổi thành "thiết kế từ đầu" hoặc "đọc từ checkout riêng".
3. **Công thức xác minh `bun check && bun test <file>` không chạy được.** Ba mục (W1, W5, W13) gọi tên nó: `bun check` ở `package.json:93` là `bun run --parallel check:ts check:rs`, kéo cả Rust toolchain không liên quan tới thay đổi TS. Lệnh thay thế là `bun run check:ts` (toàn repo) hoặc `bun run check:types` (trong một package).
4. **Hai môi trường khác nhau bị gộp làm một.** 5 mục (W2, W4, W5, W6, W8) báo `node_modules` vắng hẳn — `bun test` chết ở `Cannot find module '@oh-my-pi/pi-*'`, `check:ts` chết ở `oxlint: command not found` — khác hẳn với "thiếu native addon" mà các mục khác mô tả. Cả hai đều chặn `bun test`, nhưng là hai lỗi khác nhau và phải chữa đúng lỗi.

Mục này hiện chỉ phủ **W1–W3**; **W4–W22 chưa có bảng đính chính** — nên câu *"hãy dùng tài liệu này làm nguồn"* chỉ đúng trong phạm vi W1–W3.

### W1 — Khôi phục disposer mà API `on()` của extension và hook trả về (9 đính chính)

| # | claim của plan | verdict | đính chính |
|---|---|---|---|
| 1 | Hình dạng tham chiếu là loader của pi, 16 dòng, tại `pi-ref/.../extensions/loader.ts:256-271`. | UNVERIFIABLE — đường dẫn không tồn tại | Không có thư mục `pi-ref` ở bất kỳ đâu trong repo này (`find . -maxdepth 3 -name pi-ref -type d` rỗng; `ls pi-ref` không có). Repo là một lần publish squash duy nhất (`ecd516f`), nên không có history để truy lại file đó. |
| 2 | `interface ToolDefinition` ở `packages/coding-agent/src/extensibility/extensions/types.ts` dòng `:611`. | STALE — sai dòng | `ToolDefinition` ở dòng 636, không phải 611. Dòng 611 là `export interface ToolSessionEvent {`. Cả hai đều không cần sửa cho W1 (`ToolDefinition` là đăng ký tool, không phải event handler), nhưng đừng để anchor này đưa tay sang interface sai. |
| 3 | Object `HookAPI` ở `packages/coding-agent/src/extensibility/hooks/loader.ts:92-98`, cast `as HookAPI` ngay tại `:92`. | WRONG ở cả hai con số | Thân `on` nằm ở dòng 93-98, không phải 92-98 (dòng 92 là `const api = {`). Quan trọng hơn: cast `} as HookAPI;` nằm ở dòng **128**, không phải dòng 92 — dòng 90-91 chỉ là comment hai dòng nhắc tới cast. Tới dòng 92 tìm cast sẽ thấy phần đầu của object. |
| 4 | Lỗi dễ nhất là splice nhầm handler gốc thay vì wrapper đã push — "extensions wrap handlers, nên `indexOf(originalFn)` là -1". | FACTUALLY FALSE với codebase này | Không bản nào wrap. `extensions/loader.ts:212` là `list.push(handler)` và `hooks/loader.ts:97` là `handlers.get(event)!.push(handler)` — function object của caller được lưu theo tham chiếu, không bọc. Constructor của class (`extensions/loader.ts:196-207`) chỉ rebind `this`. |
| 5 | Vì có cast `as HookAPI`, cả hai implementation buộc phải giữ kiểu tương thích chữ ký, nếu không cast sẽ vỡ type-check. | PARTLY FALSE — đúng cho extensions, KHÔNG bảo đảm cho hooks | Nửa extension CÓ bị ép: `class ConcreteExtensionAPI implements ExtensionAPI` (`extensions/loader.ts:179`) là kiểm tra cấu trúc cứng, đổi 41 overload mà không sửa method sẽ làm `bun check` đỏ. Nửa hooks KHÔNG được bảo đảm: một hàm trả về kiểu khác vẫn qua cast. |
| 6 | Lệnh xác minh: `bun check && bun test packages/coding-agent/test/extensions-disposer.test.ts`. | Cần sửa cấu thành lệnh, không phải không chạy được | (1) `bun check` là `check:ts` + `check:rs`, nửa Rust cần cargo toolchain và rất chậm — dùng `cd packages/coding-agent && bun run check:types`; (2) `bun test` cần native addon: ở máy chưa build nó báo 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64`, kể cả với file test đã tồn tại. Đây là điều kiện tái lập được — `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần là cả hai cổng chạy. |
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
| 4 | Xác minh là `bun check && bun test packages/coding-agent/test/collab/crypto.test.ts`; thiếu native addon nghĩa là `bun test` bị chặn. | half wrong | Claim về addon đúng cho thư mục nhưng sai cho file này: `bun test packages/coding-agent/test/collab/crypto.test.ts` → `29 pass 0 fail 68 expect() calls` trước mọi thay đổi, kể cả khi addon chưa build, vì file này không bao giờ nạp addon. Chạy cả thư mục `test/collab/` ở trạng thái chưa build mới ra `29 pass / 21 fail`, và cả 21 lỗi đều thuộc file khác. |
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
| **W11** | Khoá hợp đồng `strict` qua extension-tool bridge | `bun test packages/coding-agent/test/tools/strict-declaration-guard.test.ts` báo 2 pass, SAU KHI native addon đã build. Điều kiện tiên quyết bắt buộc: `brew install ninja` rồi `bun --cwd=packages/natives run build`, một lần là đủ — đó là thiếu một bước build, không phải hạn chế của máy;… | có |
| **W12** | Tuần tự hoá thay đổi file theo realpath | Two independent assertions, both able to go red. (1) TYPE GATE: `bun run check:ts` exits 0. Goes red on a type error, a missing top-level import, a `ReturnType<>`, or a format violation (it runs the formatter check across 5445 fi… | có |
| **W13** | Chặn ENOBUFS cho structured stdout | BA điều phải đồng thời đúng, và mỗi điều đỏ được nếu làm sai: A. `bun run check:ts` PASS — types sạch sau khi xoá `isolateProtocolStdout`/`formatConsoleArgs` khỏi acp-mode.ts và `stdoutTail` khỏi print-mode.ts. Đỏ nếu còn import… | có |
| **W14** | Chặn encoding PowerShell trên đường spawn Windows | Two parts, and both must be run. (1) `bun run check:ts` — passes at HEAD today (measured: all 15 packages `Done`, no errors), so any type error introduced by this change turns it red. (2) `bun --cwd=packages/natives run build &&… | có |
| **W15** | Tìm kiếm transcript trong TUI | Three gates, at least two of which genuinely go red. (1) REGISTRY GATE — the real one. packages/coding-agent/src/modes/controllers/input-controller.ts calls this.ctx.keybindings.matches(data, "app.transcript.search"), and Keybind… | có |
| **W16** | Hợp đồng conformance chung cho session storage | `bun test packages/coding-agent/test/session/storage-conformance.test.ts packages/coding-agent/test/session/indexed-over-real-backend.test.ts` exits 0, AND the `lateAtomicRollback` group demonstrably runs against a real `SqlSessi… | có |
| **W17** | Gói bug-report đã redact + crash ring | W17 is DONE when all of the following hold, and it is falsifiable — each line goes red if the corresponding work is missing. (1) `bun test packages/coding-agent/test/diagnostics/redact.test.ts` passes with all seven cases, and th… | có |
| **W18** | GAP-M1-18 — `omp doctor` | W18 is DONE when all of the following hold, and each line is falsifiable. (1) `grep -c 'name: "doctor"' packages/coding-agent/src/cli-commands.ts` is >= 1 — without it `omp doctor` falls through to `runCli` and argv becomes an LLM prompt (regression #1499/#1496). (2) `bun run doctor` exits 1 when a check is at error severity and 0 when clean — BOTH branches, in the same run. (3) The header self-warning case goes red ON ITS OWN when that branch is removed: a check whose precondition is broken must print "không kiểm được X vì Y" and must NOT also print a green line for X — both halves are asserted together, because a one-directional assert passes on a silent implementation. (4) `runDoctorChecks` and `formatDoctorResults` are still exported after `doctor` has a consumer (proved by import, never by source-grep). (5) The credential check reports presence/absence and the key value is absent from the output. Caveat stated plainly: `bun test` needs the native addon -- `brew install ninja` then `bun --cwd=packages/natives run build`, once. Before that build only `check:ts` and the `grep` in (1) produce any signal; after it, the whole test gate runs. | có |
| **W19** | GAP-M1-19 — cấm `console.*` bằng lint | W19 is DONE when (1) `grep -c 'no-console' .oxlintrc.json` is >= 1; (2) `bun run lint` is green at HEAD; (3) the load-bearing proof — adding one `console.log` to any library file turns `bun run lint` RED, and removing it turns it green again. A gate that cannot go red is not evidence. (4) the allow-list is enforced through `overrides`, NOT `ignorePatterns` — `git diff` on `.oxlintrc.json` must not touch the 24-line `ignorePatterns` block, because `ignorePatterns` disables every other rule on those files. (5) `packages/metaharness/src/tb/cli.ts` still passes (the reverse direction — otherwise switching the rule off repo-wide would also pass). | có |
| **W20** | GAP-M1-20 — khoá cache `allow_always` theo hành động | W20 is DONE when (1) the mandatory negative case holds and goes red ON ITS OWN if `canonicalizeApprovalKey` is reverted to returning `toolName`: approving "Always allow" for `git status` and then running `rm -rf ./build` through the same `bash` tool must ask again; (2) the tightening direction also holds — the SAME approval followed by `git status` must NOT ask; (3) `PERMISSION_OPTIONS` renders the scope being granted and the test reads that string; (4) `reject_always` and `allow_always` share one key function, proved by behaviour, never by source-grep; (5) no `cacheKey: toolName` remains on any of the four branches (bash :55, delete :63, move :70 and :75); (6) the existing `approval.test.ts` suite stays green with no assertion edited. | có |
| **W21** | GAP-M1-21 — harden tiến trình trước main | W21 is DONE when (1) all three preservation cases pass; (2) removing the `isProcessEntry` guard turns case (2) red by itself — without that guard `bun test` and SDK embedding enter the same `cli.ts`, the test runner silently becomes dumpable=0, and a deliberately crashing test produces no trace at all; (3) widening `sanitizeChildEnv` to filter `PATH` turns case (3) red by itself; (4) the filter is wired into BOTH spawn paths in `bash-executor.ts` (`Bun.spawn` and the Bun shell), not one; (5) `process.title = APP_NAME` still exists and runs AFTER the harden call; (6) on Windows `hardenProcess()` throws nothing — record this as UNVERIFIED if no Windows host or CI runner is available, rather than green. | có |
| **W22** | GAP-M1-22 — `omp session` | W22 is DONE when (1) `grep -c 'name: "session"' packages/coding-agent/src/cli-commands.ts` is >= 1 AND the SINGLE shared routing assertion added with W18 covers `doctor` as well — two separate assertions would let regression #1499/#1496 come back, because a command missing from `cli-commands.ts` falls through to `runCli` and argv becomes an LLM prompt, a silent consequence; (2) `bun run session list` and `bun run find` produce the same content on the same store, and re-routing `list` to its own read path turns that case red by itself; (3) `flag-tables.ts:249` (`:--resume` / `-r` / `--session` with `rejectEmpty`) and `:300` (`--continue`) are unchanged, verified with `git diff --stat`; (4) `omp find`, `omp gc`, `omp share`, `/resume` and `/fork` keep their behaviour. | có |
| **W2** | Bốn điểm drain: ngược thứ tự, cô lập lỗi | All three tests in `packages/coding-agent/test/disposer-drain.test.ts` pass, and `bun run check:ts` is clean. Specifically: (1) run order is `["C", "B", "A"]`; (2) the non-throwing disposer ran AND `logger.warn` fired once AND `d… | có |
| **W3** | Type guard ở biên giải mã collab frame | All three commands above pass. Specifically: (a) `bun test packages/coding-agent/test/collab/crypto.test.ts` reports 33 pass / 0 fail; (b) `cd packages/coding-agent && bun run check:types` exits 0 — which in particular means the… | có |
| **W4** | Giới hạn ACP `_omp/usage` vào session được yêu cầu | The new test in packages/coding-agent/test/acp-agent.test.ts, run via `bun test packages/coding-agent/test/acp-agent.test.ts -t "usage"`, must be RED before the `acp-agent.ts` change and GREEN after. Concretely: before the fix th… | có |
| **W5** | Trích dẫn type-conformance của package wire trở nên có thật | The gate is two-sided and both sides were run against real source, not reasoned about. (a) GREEN: with `packages/coding-agent/test/collab/web-wire.types.ts` present and `packages/wire/src/index.ts` untouched, `bun run --cwd packa… | có |
| **W6** | Deny lệnh bash critical-pattern dưới yolo | `bun test packages/coding-agent/test/tools/approval.test.ts` exits 0 with zero failures, AND the suite contains a test that drives the real `BashTool` under mode `"yolo"` and asserts `resolveApproval(...)` returns `policy: "deny"… | có |
| **W7** | Trục tuổi thọ prompt-cache theo tier trong catalog | All four must hold. (1) `bun run gen:compat` exits 0 and `git status --short packages/catalog/` shows only the expected regenerated files. (2) `bun run --filter @oh-my-pi/pi-catalog check:types` exits 0. (3) `bun run check:ts` in… | có |
| ~~**W8**~~ | ⛔ **NGOÀI PHẠM VI (2026-09-28)** — xem khối ⛔ ở đầu §W8. Dòng này được giữ lại như vết của spec cũ, **không phải một cổng còn sống**; cổng của nó đỏ vĩnh viễn. | ~~TWO PARTS, because one is not enough. PART A — `bun test packages/ai/test/anthropic-cache-refresh.test.ts` with test (0): `anthropicCacheRefresh: "off"` at the boundary produces an absent replay payload, plus test (3) (no request…~~ | ⛔ không còn áp dụng |
| **W9** | Attribution usage theo model + bucket Tools/summaries | Two commands, both must be green. (1) `bun run check:ts` from the repo root -- oxlint + oxfmt + `tsgo --noEmit` across every package; it needs no native addon, so it runs at any point. (2) After the one-time addon build… | có |

**Milestone 1 hoàn thành khi cả 21 dòng còn trong phạm vi ở trên đều đạt** (22 dòng nếu tính hàng `~~W8~~` đã gạch — hàng đó nằm ngoài phạm vi) — không phải khi code merge, mà khi từng
cổng chạy xanh trên HEAD sau khi thay đổi.

### Điều kiện áp dụng cho *mọi* cổng

Các cổng có ghi "sau khi build native addon" cần đúng một bước build **một lần**: `brew install ninja`
rồi `bun --cwd=packages/natives run build` (exit 0). Trên máy chưa build, `bun test` báo `0 pass` kèm
`Failed to load pi_natives native addon for darwin-arm64` — đó là **tiền đề tái lập được**, không phải
hạn chế của máy này. Sau bước build thì **toàn bộ** cổng `bun test` trong tài liệu này chạy, và một cổng
báo xanh **trước** thời điểm đó không có nghĩa — nó chỉ có nghĩa là addon chưa build.

---

## NHỮNG ĐIỀU CHƯA ĐƯỢC KIỂM CHỨNG

Mục này ngắn và cố ý không đệm. Đây là những gì bạn nên **không** tin tuyệt đối.

### 1. Milestone này chưa bao giờ được thực thi

Toàn bộ đặc tả được sinh bằng cách **đọc code và chạy lệnh kiểm tra anchor** (`git grep -n`,
`sed -n`), không phải bằng cách build rồi xem có chạy không. Một work item duy nhất — W3 — đã được
thử thật (áp dụng, typecheck, chạy test, rồi hoàn tác trên nhánh phụ), và nó xanh. **21 cái còn lại
thì không.** Đó là giới hạn thật của tài liệu này.

### 2. Thay thế cho `session-backends` chỉ được đối chiếu theo TÊN và BỀ MẶT

`chord` **không còn bị loại** — nó được chép (vị trí 1 trong M1B). `durable` **không chép** — package
chết. `session-backends` vẫn là thứ duy nhất chưa có quyết định, và nó là thứ duy nhất còn bị loại
khỏi M1 với lập luận "đã có thay thế trực tiếp". Cái thật sự được kiểm là **file thay thế tồn tại** và
**phủ năng lực được nêu tên**. Chưa ai so `tương đương hành vi` giữa thay thế và bản gốc. Nên câu
*"năng lực giống hệt"* **chưa được chứng minh** — nó là giả định, không phải kết luận.

### 3. Nửa "document" của `durable` không có thay thế nào được xác minh

`git grep "document runtime|DocumentsRuntime" -- packages/` không trả về gì. Đây là **điểm
không có bằng chứng duy nhất** trong milestone. Nếu bạn tìm ra một năng lực người-dùng-thấy-được
đến từ `durable`, hãy soi chỗ này trước tiên.

### 4. Mọi cổng nghiệm thu phụ thuộc MỘT bước build native addon

Xem mục [Điều kiện tiên quyết](#điều-kiện-tiên-quyết). Trước khi chạy `brew install ninja` rồi
`bun --cwd=packages/natives run build`, nửa cổng `bun test` của tài liệu này **không tạo ra tín hiệu
nào cả** — chúng báo xanh giả hoặc đỏ giả, tuỳ lệnh. Đây là tiền đề tái lập được, không phải hạn chế của
máy: làm xong bước build một lần thì toàn bộ suite chạy.

### 5. Phần M1 trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` đã cũ

22 đính chính ở mục [Đính chính so với plan tổng](#đính-chính-so-với-plan-tổng) là những
điểm cụ thể mà phần M1 của plan tổng **không còn đúng**. Hãy dùng tài liệu này làm nguồn, và coi
plan tổng là bản khảo sát ban đầu.
