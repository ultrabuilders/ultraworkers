# KẾ HOẠCH THỰC THIỆN — MILESTONE 4: MƯỢN KỶ LUẬT, KHÔNG MƯỢN KIẾN TRÚC

M1 bọc trọn `pi` làm tiền đề, M2 cắt seam composable, M3 dựng trải nghiệm người dùng kiểu Claude Code. M4 không thêm tính năng nào đáng kể. Nó là milestone duy nhất trong chương trình **lấy bài học từ một dự án khác** — `deepseek-ai/deepseek-harness` — và quyết định một dòng mà cả milestone đứng trên: *chỉ mượn KỶ LUẬT của dsh, không mượn KIẾN TRÚC, và không mượn bất kỳ thứ gì dsh đã phải tự vá để có được*. Sản phẩm bàn giao của M4 cho cả chương trình là một câu hỏi mà omp hiện tại không trả lời được: **thao tác này có thật sự xảy ra không?** Sau M4, lỗi "omp báo *applied*, nhưng không có gì thay đổi" không còn biểu đạt được.

**Trạng thái hiện tại của M4 (đọc để quyết định có bắt đầu hay không):**

| | |
| --- | --- |
| Work item còn lại | **10** — 4 mục gốc (M4-4, M4-6, M4-7, M4-9) + 6 mục `GAP-M4-10`..`GAP-M4-15` thêm 2026-09-29 — trên tổng 16 (10 ban đầu + 6 mới) |
| File được chạm | **69** mục đã kiểm chứng đường dẫn (37 của bốn mục gốc + 32 của sáu mục mới), trong đó 2 mục `[create,UNVERIFIED]` |
| Câu hỏi mở / đính chính | **25 câu hỏi mở, 41 đính chính** (34 của bốn mục gốc + 7 của sáu mục mới) |
| Sóng | 3 (B, C, D) — **cả ba đều `shippable: false`**, và nay có 10 work item thay vì 4 |
| Cổng đang đỏ ngay bây giờ | 3/6 bước kiểm của M4-4 đỏ — (b) vì file test mới chưa tồn tại; (c)(d) vì refactor chưa thực thi. (a)(e)(f) đã xanh từ 2026-09-29, sau khi build addon native |
| Phụ thuộc chưa thoả | **4** (M2 WI-8a/8b cho M4-6; M2 WI-2 cho M4-9; **GAP-M1-18 chưa có trong kế hoạch M1 — nó chặn `GAP-M4-15` tuyệt đối và phải merge trước `GAP-M4-10`**; M2 Wave 1b (WI-PRESTEP-1) cho M4-4) |

Đây **không phải** một milestone bắt đầu từ xanh. Hai trong bốn work item gốc phụ thuộc công việc M2 **chưa được thực thi** trên nhánh này, và item lớn nhất về mặt cơ học (M4-4) vẫn đỏ ở ba trong sáu cổng sau khi addon native đã build.

Sáu mục `GAP-M4-10`..`GAP-M4-15` thêm vào ngày 2026-09-29 từ `.lavish-wip/GAP-REGISTER-2.md`, và chúng sửa **cùng một lớp vi phạm** với bốn mục gốc: hệ thống tuyên bố một điều mà nó không kiểm chứng được. Không mục nào trong sáu mục chặn bốn mục gốc, và không mục nào trong sáu mục nằm ngoài ba sóng đã có.

---

## Mục tiêu

Viết bằng kết quả quan sát được, không bằng kết quả nội bộ.

**Người dùng cuối**

- Bật/tắt một plugin trong `/settings` **nhận được câu trả lời thật** thay vì `void` vô điều kiện: gọi đó biết lockfile có thật sự đổi không, và phiên đang chạy có nhận thay đổi không. *(M4-4)*
- Chỉnh một setting trong panel mà đang bị project config, `--config` overlay, runtime override hoặc biến môi trường chiếm giá trị: **panel nói rõ lớp nào đang che nó**, và giá trị chết đó **không còn được ghi vào `config.yml` toàn cục**. Trước M4, thao tác đó ghi một bản sao chết rồi gọi đó là "đã áp dụng". *(M4-6)*
- Một thẻ thiết bị `xd://` và mọi thẻ tool do extension đăng ký **thôi đóng băng giữa luồng**: renderer theo dõi buffer tham số thô giờ vẽ lại ở mỗi lần tiền tố dài thêm, thay vì chỉ vẽ lại khi *identity* của object `args` đã parse đổi. *(M4-7)*
- Một lệnh CLI mới, chỉ đọc: `omp extensions-triage`, in cho **mọi** extension mà loader tìm thấy — active / disabled / shadowed, và chính sách disable nào đã chặn nó. *(M4-9)*

**Người viết extension**

- `renderResult` cuối cùng nhận được đúng những gì type đã khai báo từ lâu: `argsComplete`, `executionStarted`, và kênh `rawArgs: { json, complete }` mới có kiểu. Hôm nay **hai adapter âm thầm vứt bốn field** trước khi extension kịp thấy chúng. *(M4-7)*
- Bật/tắt plugin trả về `ChangeResult` có cấu trúc, và một `SettingsWriteResult` cùng hình dạng — **một kiểu kết quả chung**, không phải hai kiểu gần giống nhau. *(M4-4 + M4-6)*

**Sáu mục thêm 2026-09-29 (`GAP-M4-10`..`GAP-M4-15`).** Danh sách trên là của bốn work item gốc. Sáu mục mới sửa **cùng một lớp vi phạm** — hệ thống tuyên bố một điều mà nó không kiểm chứng được — và chúng thêm vào mục tiêu người dùng:

- Sau một crash, transcript trả lời được **"ai đã duyệt cái này"** thay vì chỉ cho thấy một `tool_use` không có `tool_result`. *(GAP-M4-13)*
- Model và transcript phân biệt được **"ai đã chặn"** với **"hook hỏng, không ai chặn"** — fail-closed giữ nguyên, chỉ nhãn đổi. *(GAP-M4-12)*
- Một lỗi chuẩn hoá trong `catch` **không còn nuốt mất lỗi gốc** thay bằng một lỗi không liên quan. *(GAP-M4-11)*
- Người viết patch biết **vá cái gì, vì sao, bỏ khi nào** mà không phải đọc lại 35 KB diff. *(GAP-M4-10)*
- Người đọc tài liệu tìm được **cơ chế nào làm hành vi này thật**, kèm tên một cổng kiểm đỏ được cho mỗi hàng. *(GAP-M4-14)*
- Người dùng viết `hooks` vào `.claude/settings.json` được `omp doctor` **báo ra thay vì bỏ qua im lặng**. *(GAP-M4-15)*

**Thành thật về phần vô hình.** Ba trong bốn item gốc chỉ hiện ra khi có chuyện xấu xảy ra — một ghi file thất bại, một setting bị che, một extension bị chặn. Chỉ M4-7 có tác dụng nhìn thấy liên tục trên màn hình. Ngoài ra M4 tạo ra hạ tầng mà người dùng không bao giờ chạm tới: một `atomicWriteJson` dùng chung trong `packages/utils`, một `shadowing.ts` mới, một module capability mới, và một entry đăng ký lệnh CLI mới. Trong sáu mục mới, **năm trên sáu cũng chỉ hiện ra khi có chuyện xấu xảy ra** — một getter `message` ném, một hook hỏng, một transcript không trả lời được, một bản vá không ai giải thích được, một key cấu hình biến mất. Đổi lại, milestone này **giữ kỷ luật cho những milestone sau**: một release gate duy nhất, một quyết định changelog duy nhất, và các PR được phép merge nhưng không được phép release cho tới khi cả ba sóng xong.

---

## Vì sao chỉ mượn kỷ luật

> **CẢNH BÁO PHƯƠNG PHÁP, thêm sau khi kiểm chứng lại (2026-09-28).** Mục này ban đầu kết luận bằng
> `grep` ở **một** thư mục rồi suy ra về **cả repo**, và kiểm chứng lại trên HEAD thật đã bác **4/7 claim**.
> Quy tắc bắt buộc từ nay: **kiểm tra chỗ khái niệm thật sự sống trước khi kết luận vắng mặt.** Nếu
> `vendor/` là Cordis upstream thì "không có priority trong `vendor/`" chỉ chứng minh Cordis không có
> priority — không nói gì về dsh, và ở đây kết luận sai đã đảo chiều.

`light.json` không chứa bản kiểm kê mã nguồn dsh — nó chỉ chứa bốn work item. Nên phần "dsh làm tốt hơn omp ở chỗ nào" phải suy ra từ chính bốn item, và suy ra rất gọn: **cả bốn item đều sửa một loại vi phạm cùng một hình dạng — hệ thống tuyên bố một điều mà nó không kiểm chứng được.**

- **M4-4:** bật/tắt plugin trả `void` vô điều kiện. Không có cách nào để biết ghi file có thành công hay không. Hệ thống nói *"đã áp dụng"* bằng cách không hỏi.
- **M4-6:** panel ghi một giá trị mà không biết lớp nào đang sở hữu nó. Giá trị chết được ghi xuống đĩa và được gọi là *"đã áp dụng"* — lần này là do một **lớp khác** âm thầm ghi đè.
- **M4-7:** hai adapter nhận `options` rồi **vứt bốn field** đi trước khi extension thấy. Hợp đồng được khai báo đúng, rồi bị phá bởi đường nối.
- **M4-9:** một bản kiểm kê plugin mà tự suy diễn lại shadowing thay vì chiếu từ `loadAllExtensions`. Rủi ro mà chính kế hoạch gọi ra và đúng: **"một bản kiểm kê nói dối tệ hơn không có bản kiểm kê nào."**

Đó là kỷ luật được mượn: **không tuyên bố hiệu ứng mà bạn không đo được; không dựng nguồn sự thật thứ hai; không nuốt thứ được giao.** Đây là thứ một dự án buộc phải nói ra to, vì dsh là một *harness* không có monolith để giấu mình vào. omp thì ngược lại — là một monolith đã gắn plugin, nên kỷ luật phải được **cưỡng chế** từ trong ra chứ không thể thừa hưởng.

### Đính chính 2026-09-28 — đo lại trên HEAD thật

Checkout `~/Projects/deepseek-harness` ở HEAD `21638c56` (2026-09-27). **HEAD này khác `477b4f4` mà bản thảo dùng**, nên mọi neo `file:line` cũ cần kiểm lại. Kết quả:

| Claim của bản thảo | Kết quả kiểm chứng |
| --- | --- |
| "dsh không có hệ thống priority nào" (`grep -rn "priority" vendor/` → 0) | **SAI.** `vendor/` là Cordis upstream, nơi priority **không phải khái niệm tồn tại**. Đo đúng chỗ: **161 hit priority trên 26 file nguồn không test, và bốn hệ priority trưởng thành riêng biệt.** Đây là lỗi mẫu: suy ra sự vắng mặt của một khái niệm từ thư mục mà khái niệm đó không thể có. |
| "`Impl.check` (availability predicate của Cordis) dsh dùng **zero lần**" | **SAI.** `vendor/cordis/src/service.ts:57` — mọi subclass `Service extends` đều truyền `this[symbols.check]` vào `ctx.reflect.provide(name, …)`. Wiring là phổ quát, không phải ngẫu nhiên. |
| "dsh MIT, nghĩa vụ duy nhất là giữ copyright" | **SAI cho cả dsh.** Mọi claim về `vendor/` đều đúng (9 LICENSE đều MIT, đã kiểm lại từng cái), nhưng bỏ sót `native/system/LICENSE:1-3` là **BSD 3-Clause**. |
| `guard/` là một lớp an toàn | **SAI.** 321 dòng hygiene tham vấn, **không có ngữ nghĩa bảo mật, không có quyền veto**. |
| dsh có exec policy khai báo mang `match`/`not_match` + `justification` | **SAI — không tồn tại.** Xác minh ba cách. `packages/coding-agent/src/tools/bash-interceptor.ts` của omp là hình hài tương tự, nhưng để *chuyển hướng tool*, không phải *ra quyết định an toàn*. |
| comment ở `runner.ts:1327-1331` nói invariant "được enforce bằng construction" | **BỊA CITATION.** Comment đó là docstring thường, không nói vậy. Kết luận thì đúng; trích dẫn thì không tồn tại. |
| "Tài liệu đó **bán khuếch đại** ở đúng ba chỗ" | **UNVERIFIABLE.** Đếm 3 mà không nêu tên ở bất kỳ đâu; người đọc không kiểm được, người lập kế hoạch không hành động được. |

**Hệ quả cho phạm vi M4, nói thẳng:** trong 63 lượt phản biện trên các ý tưởng lấy từ dsh, **42 bị bác** và lý do bác lặp lại: *"omp **đã có** guard giống hệt và bản đó tốt hơn"*, *"omp đã có bản thành thụ hơn nhiều của ý tưởng đó, ngay trong công cụ mà claim nhắm tới"*. Đây là **cùng cơ chế với SENPI** — ước lượng sai lệch, chỉ khác dấu. Kết luận "chỉ mượn kỷ luật" **đứng vững**, nhưng lý do đứng sau nó phải viết lại.

**Lý do đúng, theo bản thảo tổng đã tự sửa:** không phải "sợ mượn nhầm" nữa, mà vì *mượn kiến trúc Cordis là mượn code của bên thứ ba đã bị fork 22 lần*. Cái đáng mượn là **ba** thứ, không phải một: **thứ tự ưu tiên, đăng ký fail-loud, và tái tải có nối.**

### Kiểm kê thật, thay cho bốn work item

Bốn work item của `light.json` không phải kiểm kê. Đo trên cây thật:

- **`.agents/notes/`** — **3.675 file quyết định kiến trúc git-tracked**; tiếng Anh có 1.214 Agent Notes (518 implemented / 642 archived / 40 proposed / 14 rejected). dsh **tài liệu hoá quyết định của nó ở mức cao hơn mức code**, và đây mới đúng là cái gọi là "kỷ luật". Tách ra ở `M4-DISCIPLINE-3`.
- **`scripts/run-gates.ts`** — 1.660 dòng, lane-based gate runner; ~40 `scripts/verify-*.ts`, mỗi cái có `*.spec.ts` đi kèm; `lefthook.yml` định nghĩa pre-commit / pre-merge / pre-push.
- Claim "no privileged core" **được máy kiểm, không phải convention**: `scripts/verify-package-dependencies.ts` enforce allowlist ở **mức export** cho cạnh Client→Host (`collectHostDependencyExportPolicyViolations`, quyết định ở `:546`). Bản thảo cũ nói "không có lint hay verify gate nào… nó là convention, nên sẽ mòn" — **điều đó sai.**
- **TUI đã tồn tại và bị xoá 8 tuần trước HEAD** (`~/Projects/deepseek-harness/.agents/notes/archived/simplification/2026-08-04-remove-tui-package.md` — nằm ở repo tham chiếu dsh, không có trong repo này). Bản thảo cũ kết luận "không có TUI" như thể đó là trạng thái ổn định.

### Quyết định 2026-09-28 — KHÔNG lấy kernel Cordis

Đo thật: diff 7 package giữa `cordiverse/cordis` (shallow `f8ea3cd`, rc.10) và
`deepseek-harness/vendor/` (rc.7 + 22 bản vá). Bản vendor **không phải fork-tiến** — mọi khác biệt là hai chiều,
và hướng chứng minh được từng dấu hiệu bằng `git log -S`.

**Quy mô:** 4.991 dòng nguồn / 6.497 dòng test trên 9 package; core 1.874 dòng. **+822 dòng net mà
manifest báo — 70% là JSDoc.** Đo trên 9 file core: 1.013 dòng thêm = 712 comment + 12 trống +
37 import churn + **252 dòng code thật**, trong đó ~180 nằm ở một file.

**Upstream rc.10 KHÔNG tự giao được clean unload.** Kiểm trực tiếp:
`grep -c 'effectInertia|setupBarrier|emitPluginDisposed' upstream/core/src/fiber.ts` → **0**. Bản vá là của
DeepSeek, không phải drift:

| Dòng trong bản vendor | Bất biến | Upstream |
| --- | --- | --- |
| `fiber.ts:515` | effect nằm trên danh sách chủ **trước khi** `setup()` chạy, nên unload bắt đầu từ trong setup vẫn thấy nó | `fiber.ts:338` đăng ký wrapper **sau** `this._execute(runner)` |
| `:462,:467,:475` | `setupBarrier` / `waitForSetup` / `disposeAfter` — unload reentrant chờ setup **và** mọi cleanup setup đó thu được | không có |
| `:421` | `throw new CordisError('INACTIVE_EFFECT')` khi owner đang `UNLOADING` | chỉ `assertActive()`; uid vẫn khác null trong `UNLOADING` |
| `:112,:114` | `effectInertia` WeakMap + `runDisposable()` — cleanup **sở hữu một lần, N quan sát cùng nối** | người gọi thứ hai nhận `undefined` và coi như đã teardown |
| `:120` | `emitPluginDisposed` — try/catch theo từng observer | `context.emit(...)` trần; không chứa lỗi theo callback |

**Và bản vendor LÙI upstream ở ba chỗ, đều đã chạy thử:**
`events.ts:132` dùng `_hooks: {}` thay vì `Object.create(null)` (upstream `:46`) → `on('constructor')` /
`on('toString')` **ném TypeError**; mất chốt `if (called) throw` "next() called multiple times" (upstream `:125`)
→ listener gọi `next()` hai lần chạy lại cả chuỗi dưới, **âm thầm**; và bản vendor có **0 file test** so với
6.497 dòng test upstream. `vendor/timer/` còn thay hàng đợi waiter bằng **một ô duy nhất** — `next()`
thứ hai ghi đè promise thứ nhất, promise đó **không bao giờ settle**.

**Kết luận: KHÔNG lấy kernel. Không nhòe.** Lý do theo trọng số:
1. **omp đã quyết rồi, bằng văn bản, với lý do đã nêu.** M2 WI-9 bước 10: *"KHÔNG phơi bản `unloadExtension`
   lên ExtensionAPI… Các bucket per-extension **CHÍNH LÀ** sổ sở hữu."* Các bucket trên `interface Extension`
   **đã là** một sổ sở hữu, được thiết kế cho 9 phương thức đăng ký phải giữ là 9. omp không thiếu kernel —
   **omp có một kernel, và hình dạng của nó tốt hơn fiber.**
2. omp có **0 tham chiếu cordis**; không có seam nào để mọc từ đó.
3. Phần thu được là **~119 dòng code thật** chống một loại bug mà omp **chưa có bằng chứng nào từng dính**.
   Đó là một port, không phải một dependency. Lấy dependency framework để có 119 dòng pattern là hỏi
   ở mọi quy mô.
4. Nó đấu với luật của chính repo: `cordis-plugin-logger-console` gọi `console.log` (`shared.ts:66`) —
   bị `AGENTS.md` cấm trong mọi đường TUI/RPC/SDK/worker.
5. `latest` trên npm là **`4.0.0-rc.10`** — mười RC, chưa có 4.0 ổn định, một người duy trì, toolchain
   yarn/vitest đối chiếu bun/bun-test của omp.

**Ba ý đáng lấy dù không lấy code** (đính vào M2 WI-9, xem mục kế):

1. **Disposer single-shot cho người gọi, joinable cho chủ teardown** (`fiber.ts:112,:515`). Sáu dòng WeakMap
   cộng một ô `inFlight`. Đây là bất biến khó nhất trong fork, và omp **không có tương đương**.
2. **Chứa lỗi theo từng observer khi báo teardown** (`fiber.ts:120`). omp **đã thoả** cho `session_shutdown`
   (`runner.ts:1501-1511`) — hãy ghi thành bất biến để một refactor không lặng lẽ nối tiếp vòng lặp.
3. **Teardown là LIFO, và disposer gỡ đúng cái nó đăng ký, theo identity.** `DisposableList.clear()`
   (`core/src/utils.ts:26-30`) trả `values.reverse()`.

**Cách lấy đúng:** **đừng chép file của DeepSeek.** Lấy `fiber.ts` của **upstream rc.10** và áp bản vá của
riêng omp. Cùng kết quả, attribution sạch — vì sửa đổi của DeepSeek **không được ghi ở đâu trong LICENSE**
(chỉ nằm trong `vendor/README.md`, mà file đó không thuộc artifact nào được publish: `files: ["lib/index.js",
"lib/types/**", "src"]`). ~30 dòng. Không dependency, không bề mặt rebase, và nó là của omp.

#### M4 sửa một mục trong danh sách "đáng mượn" của chính nó

M4:73 liệt kê ba thứ đáng mượn: thứ tự ưu tiên, đăng ký fail-loud, và **"tái tải có nối"**. **Đừng lấy
thứ ba từ dsh.** `Fiber.update()` trong bản vendor là hệ quả trực tiếp của
`Revert #932 transactional Cordis reload changes` (commit `e07f41d5fd`, lặp lại ở `d225dbba50`):
`fiber.ts:736-753` trả `void`, **vứt kết quả waterfall `internal/update`**, và vứt suppression
`task.catch(() => {})`. Upstream rc.10 `fiber.ts:478-494` là **ngược lại** — awaitable, có nuốt rejection,
`await update()` quan sát được thất bại khi khởi động lại.

> **M4 hiện đang nhắm vào một nửa mà DeepSeek đã cố ý xoá và thay bằng hành vi không-transactional — đúng
> thứ omp đang cố rời bỏ.** Dù M4 có nghĩa "có nối" là gì, cây vendor của dsh là cây sai để sao chép;
> **upstream mới đúng.**

**Và sửa luôn lý do, không chỉ danh sách.** Câu *"không phải 'sợ mượn nhầm' nữa"* trong M4 giờ sai vì một
lý do tốt hơn: **không phải cảnh giác pháp lý hay fork hygiene.** Danh sách mượn **đã đúng sẵn**, và cái lý do
bên dưới nó **là một cảm giác**. M4:68 đã ghi 42/63 claim bị bác vì cùng một lý do — *"omp đã có bản thành
thụ hơn nhiều"* — và phân tích này tìm thấy điều đó **lần thứ ba**. Lý do đúng để dừng: **bucket per-extension
của omp đã là một sổ sở hữu tốt hơn fiber, và thứ duy nhất dsh có mà omp thiếu là ~30 dòng văn xuôi về
thứ tự disposal.**

#### Chưa đo — nói thẳng

1. **Không tìm thấy issue, test đỏ, hay báo cáo người dùng nào ở omp thể hiện bug reentrant-disposal.**
   Ba ý trên rẻ và biện minh được, nhưng claim "chúng ngăn được thứ gì **hôm nay**" thì **chưa chứng minh**.
   Nếu cần bằng chứng: **một file test đối kháng duy nhất** chạy trên `ExtensionRunner` trước khi WI-9
   bước 6 ship. Đây là phép thử rẻ nhất nên làm, và nó quyết định cả ba ý có đáng giữ không.
2. `vendor/timer/` **chưa ai diff** (`next()` thô đã đọc, phần còn lại thì không). Đừng coi "22 bản vá" là
   bề mặt có ranh giới.
3. Manifest **có thể cũ** so với cây hiện tại.

### Wave 0 — ba work item sửa chính M4 (thêm 2026-09-28)

Cả ba **phải xong trước bất kỳ item nào của wave B/C/D**, vì chúng sửa tiền đề mà các item đó đứng trên.

#### M4-DISCIPLINE-1. Sửa các claim đã bị bác

**Cổng hoàn thành:** M4 không còn claim nào trong bảng đính chính ở trên; mỗi thay thế có số đo và đường dẫn; cảnh báo phương pháp đã nằm ở đầu §"Vì sao chỉ mượn kỷ luật". **Cỡ S. Không có phụ thuộc.**

#### M4-DISCIPLINE-2. Đổi tiêu chí DoD của M4-6 sang mẫu `assertUnshadowed`

**Vì sao, đo được:** dsh **không có** provenance. Nó có **composition** — biết giá trị thắng và từ chối ghi bị che, nhưng **không nói được file nào thắng, field nào thắng** (`provenance` = 0 hit toàn repo). Bản thảo cũ tưởng dsh có thứ này và vay được; **không có.**

**Nhưng** `packages/credentials/credentials-local/src/index.ts:780-787` (**ở repo tham chiếu dsh, không có trong repo này** — đã đối chiếu lại: `grep -rn 'assertUnshadowed' packages/` không trả về gì, chỉ có ở `~/Projects/deepseek-harness`) có `assertUnshadowed` **tốt hơn**: nó **gọi tên lớp thắng** *và* **nêu cách sửa** — *"supplied read-only by the launching environment, so set would be shadowed; unset it in the shell you start dsh from instead"*. Kèm `assertOwnerOnly` được kiểm lại **mỗi lần đọc và trước mỗi lần ghi**.

**Các bước:**
1. Đổi DoD của M4-6 từ *"biết lớp nào thắng"* (chưa ai đạt được, kể cả dsh) sang **"nêu tên lớp thắng và nêu hành động sửa"** — tiêu chí dsh thực sự đạt được.
2. Giữ nguyên nguyên tắc chặn-**trước**-khi-ghi. dsh throw ở `config-editor/src/index.ts:128`, `writeFileAtomic` ở `:130` — tức **chặn trước lần ghi**, không rollback. Đây là tiền lệ **tốt hơn** thiết kế "ghi rồi rollback trong bộ nhớ" mà M4-6 hiện tại đang cân nhắc. Nói rõ lựa chọn này trong M4-6.
3. Assertion bắt buộc: thông điệp phải chứa **cả** tên lớp thắng **và** hành động sửa. Test "không ghi được" trần **không đạt**.

**Cổng hoàn thành:** test chứng minh thông điệp chứa cả hai thành phần. **Cỡ S. Phụ thuộc M4-4** (cùng dải `setPluginSetting`).

#### M4-DISCIPLINE-3. Định nghĩa lại "kỷ luật": đọc kiểm kê quyết định, không chép cấu trúc thư mục

**Vì sao:** M4 hiện định nghĩa "kỷ luật" bằng **4 work item suy ra từ một spec không chứa kiểm kê**. Cái thật nằm ở `.agents/notes/` và ở tầng cổng kiểm.

**Các bước:**
1. Sửa §Mục tiêu: định nghĩa "kỷ luật" là **kiểm kê quyết định + cổng kiểm được enforce**, không phải "4 work item".
2. Một work item đọc `.agents/notes/` **theo loại quyết định** (không theo *file*), chọn ra cái nào là **chính sách có thể chuyển**. **Tuyệt đối không chép cấu trúc thư mục** — `.agents/notes/` là thứ riêng của dsh; điều chuyển được là *công thức của một quyết định có tên*, không phải *hình dạng thư mục của nó*.
3. Chốt: claim "no privileged core" ở omp phải **được gate kiểm tra tự động** (`scripts/verify-package-dependencies.ts` là mẫu: allowlist ở **mức export**, không phải ở mức import), **hoặc** phải được hạ xuống thành convention và nói rõ là convention. Hiện omp chưa có cái thứ nhất.

**Cổng hoàn thành:** M4 nêu được **ít nhất một** quyết định có tên của dsh (ai quyết, ngày, lý do) mà bản thảo cũ không biết. **Cỡ S.**

**Và những thứ dsh đã phải tự vá — đó chính là danh sách loại trừ.** Bốn dòng `risk` trong `light.json` viết bằng lời của chính kế hoạch, và chúng là bản dịch các bước vá đó thành câu hỏi cho omp:

| Dòng `risk` | Cái giá nếu vá sai |
| --- | --- |
| "ghi rồi báo *applied* trong khi giá trị bị project config che" | ghi config chết |
| "rollback của `/settings` — quyết định rollback là thứ có thể brick `/settings`" | hỏng chức năng vĩnh viễn |
| "một thay đổi chỉ-đổi-type xanh ở mọi nơi và không đến với ai" | refactor ảo, không đổi hành vi |
| "bản kiểm kê lệch với dashboard" | hai nguồn sự thật |

M4 **không mượn bất kỳ mảnh kiến trúc nào của dsh** mà để đến được bốn điều trên. Không có file nào trong 37 mục nguồn từ dsh; không có gì để vendor, không có asset đích danh, không có phần phụ thuộc license nào gắn vào bốn item này.

**Vì sao mượn kiến trúc của dsh sẽ sai — ba lý do, đều suy ra từ chính các phụ thuộc ghi trong `light.json`:**

1. **Ba trong bốn item có phụ thuộc cứng vào thứ chỉ tồn tại trong repo này.** M4-6 sửa bề mặt `pi.registerSetting` có namespace do M2 WI-8a/8b tạo ra. M4-9 bắt buộc phải đi sau M2 WI-2 (thứ tự nạp extension xác định). M4-4 phải xử lý thứ tự merge với M3-A4, vì M3-A4 viết lại đúng dải `setPluginSetting` 942-949. Kiến trúc mượn về không có chỗ để chứa ba cái đó — chúng sẽ phải bị bẻ lại hoặc bỏ.
2. **Nó sẽ phá đúng những thứ M1 và M2 đã dựng.** M1 bọc trọn `pi`, M2 cắt seam composable. M4-7 nằm *trước* M2 WI-4 theo thứ tự bắt buộc của kế hoạch, và chính vì vậy nó chỉ làm cho hợp đồng render **thật sự đến nơi**, còn phần đăng ký renderer là của WI-4. Đó là thứ tự "cứu seam", không phải thứ tự "thay seam".
3. **Các cổng kiểm của bốn item đều neo vào cây này.** Chúng grep `packages/`, chạy `packages/utils/test/file-lock.test.ts`, so kết quả CLI với dashboard. Một kiến trúc mượn về không làm bất kỳ điều gì trong số đó xanh.

Câu tắc để mang theo: **khi bốn ý đầu tiên của `one_line` có thể được viết thành một dòng mô tả hợp đồng cục bộ, hãy làm nó cục bộ.** Cả bốn đều vừa khít.

---

## Phạm vi đã thu hẹp

M4 từng có **mười** work item. Sáu đã rời đi. Tài liệu này nói về **mười**: bốn mục gốc còn lại, cộng sáu mục `GAP-M4-10`..`GAP-M4-15` thêm ngày 2026-09-29 từ `.lavish-wip/GAP-REGISTER-2.md`. Sáu mục mới không đi qua bộ lọc "rời đi" ở dưới — chúng là việc mới, không phải việc bị gộp hay bị bỏ.

**Sáu ID đã rời M4: `M4-0`, `M4-1`, `M4-2`, `M4-3`, `M4-5`, `M4-8`.**

Ba lý do, theo đúng cách kế hoạch đã ghi:

- **Năm item trùng công việc đã nằm trong M2 WI-1..WI-4** (seam composable và độ bền vững dữ liệu). Đây là lý do lớn nhất: M4 từng định mở rộng sang những thứ M2 đã giao.
- **`M4-3` rời đi vì nó là authoring surface thứ sáu, và M2 WI-4 đã đóng nó rồi.** Mở lại ở M4 là làm trùng.
- **`M4-5` rời đi vì nó là lỗi va chạm trong đường mint tên, không phải việc plugin.** Sai chỗ; nó thuộc về seam mint tên, không thuộc về chương trình "mọi thứ là plugin".

Riêng `M4-5` cần một câu nói thêm, vì "rời đi" ở đây **không** có nghĩa là "xong": nó là **một deliverable còn nợ của M4** — việc viết nó vào kế hoạch M1 vẫn phải làm, và hiện chưa hề có mục nào tên `M4-5` trong `MILESTONE_1_EXECUTION_PLAN.md`. Đừng đọc "đã ghi chú sang M1" là "đã bàn giao xong".

Chúng sống ở **tập work item của M2** (WI-1..WI-4) và trong phạm vi bọc trọn của M1. Tài liệu này cố tình **không lặp lại** ánh xạ ID→WI cụ thể — nó nằm ở kế hoạch tổng và kế hoạch thực thiện M2. Nếu cần tra cứu, hãy đọc kế hoạch M2; **đừng tìm `M4-0`..`M4-5` trong tài liệu này rồi kết luận M4 thiếu.**

Hệ quả trực tiếp cho bản chất milestone: M4 là **mười PR, không phải mười sáu** — vì sáu ID đã rời đi ở trên không quay lại. Kế hoạch M2 phải đi trước; M4 là phần đuôi của chương trình, không phải đầu.

---

## Quy tắc `shippable`

Đây là trục xương của milestone, và `light.json` nói thẳng: **cả ba sóng đều `shippable: false`.** Không sóng nào của M4 được phép đi một mình.

M4 có **đúng một** quyết định release, và nó phủ cả ba sóng. Đây là hệ quả dẫn xuất, từng đằng nặng:

1. **Không mục CHANGELOG nào được thêm trong PR riêng lẻ.** M4-4 chạm tới *ba* file CHANGELOG (coding-agent, tui, utils) — nhưng đó là **một** quyết định, không phải ba. Wave C và Wave D cùng nằm trong cùng quyết định đó.
2. **Merge được phép, release thì không.** `light.json` viết nguyên văn: *"merge is allowed, release is not."* Wave B có thể vào nhánh, có thể xanh, nhưng không xuất hiện trong bản phát hành cho tới khi Wave C và Wave D cũng xong.
3. **Wave B là MỘT PR.** M4-4 và M4-6 cùng thay đổi một giao diện có điều kiện đã thoả trong cùng `packages/tui/src/overlays/`. Kế hoạch nói thẳng: **một lần review, hai commit**. M4-6 thêm một thành viên vào `SettingsHost`; M4-4 đổi kiểu trả về của `PluginSettingsManager.setEnabled`.
4. **Hai kiểu kết quả phải gộp thành một.** `ChangeResult` của M4-4 là tiền lệ cho `SettingsWriteResult` của M4-6. Hai kiểu gần giống nhau là một PR không liên kết. Wave B phải ship **một** kiểu kết quả nhất quán.
5. **M4-7 không được mở PR trước khi bản viết của M2 WI-4 được thống nhất** (§6.1).
6. **Wave D cần ủy quyền bằng văn bản.** Cổng của M4-9 đòi có `shippable: false authorization granted in writing` trước khi coi là xong.

**Work item nào `shippable: false` và vì sao:**

| Item | Sóng | Vì sao không ship một mình |
| --- | --- | --- |
| M4-4 | B | Gộp với M4-6 thành một PR (cùng giao diện cấu trúc trong `packages/tui/src/overlays/`); định hình `ChangeResult` là tiền lệ cho M4-6 |
| M4-6 | B | Gộp với M4-4 — "one review, one changelog gate"; còn bị chặn bởi quyết định changelog chung |
| M4-7 | C | "§6.2 forbids shipping any M4 wave alone"; nó **đổi thứ renderer `xd://` đầu tiên nhận** và **đổi tên một key** — cả hai đều người dùng nhìn thấy |
| M4-9 | D | Chờ cổng changelog chung; thêm một lệnh CLI top-level mới |
| GAP-M4-11 | B | Chờ cổng changelog chung. PR **riêng** — không gộp vào PR của M4-4/M4-6, vì nó không chạm `packages/tui/src/overlays/`; nó chỉ dùng chung *quyết định release*, không dùng chung PR |
| GAP-M4-13 | B | Chờ cổng changelog chung; tiền lệ `ChangeResult` là của M4-4 nên PR phải nói rõ quan hệ với nó |
| GAP-M4-12 | C | Chờ cổng changelog chung; nó **đổi thứ model đọc** — từ "bị từ chối" sang "hook hỏng" — nên đây là thay đổi người dùng nhìn thấy trong transcript |
| GAP-M4-10 | D | Chờ cổng changelog chung. Thêm một file sinh tự động + một mục `CONTRIBUTING.md`; không đổi hành vi người dùng, nên nó **không** kéo theo quyết định release mới — nhưng vẫn nằm trong cùng cổng |
| GAP-M4-14 | D | Chờ cổng changelog chung. **Không** sửa một dòng `.ts` nào — bảng văn xuôi thuần, nên nó không kéo theo quyết định release mới |
| GAP-M4-15 | D | Chờ cổng changelog chung, **và** chờ GAP-M1-18 merge trước — đây là chỗ duy nhất để in ra, và theo GAP-D4 mọi check mới phải tự chứng minh bằng một test |

**Định nghĩa "M4 xong" mà quy tắc này áp đặt:** **mười** commit đã merge **+** một quyết định changelog duy nhất **+** một lần release. Không có đường nào để **ba** sóng thành công mà M4 vẫn treo. Và vì cả ba sóng đều đỏ hoặc chưa thể chạy ngay lúc này, đây là lý do thực tế để **không** mở Wave B trước khi M2 WI-8a/8b đã vào nhánh.

Một điểm đáng nói: sau khi thêm sáu mục `GAP-M4-10`..`GAP-M4-15`, **cả mười** work item đều có `blocks: []` — không item nào trong M4 chờ item nào khác. Chúng có thể đến cuối mà không chặn ai. Nhưng không cái nào được ship một mình. `shippable: false` không phải câu hỏi về thứ tự merge; nó là câu hỏi về quyền phát hành.

---

## Không làm gì

**Không thêm runtime plugin mới.** M4 không dựng hệ thống plugin. Nó sửa bốn hợp đồng *bên trong* các seam M2 đã cắt.

**Không thêm authoring surface thứ sáu.** Đó là `M4-3`, đã rời đi vì M2 WI-4 đã đóng nó.

**Không dựng bề mặt đăng ký renderer.** M4-7 chỉ làm cho các field **đã được khai báo trong type** thật sự đến nơi. Bề mặt đăng ký là M2 WI-4, và WI-4 xếp **sau** M4-7, không được nằm chung PR. WI-4 đã có sẵn trong §11 của M2 và đã đặc tả xong, nên phần còn lại chỉ là thống nhất **trước khi** M4-7 mở PR.

**M4-9 không báo nguồn che.** Tiêu đề đã ghi: *"scoped down: state/shadowed only, no shadow-source"*. Item ở phạm vi option **(a)** — 2 file mới, 2 file sửa, 1 test, khoảng một ngày, **không chạm shared core**. Option **(b)** (thêm `shadowedBy` và đổi `capability/index.ts` + 6 call site trong `state-manager.ts`, 2-3 ngày) **không nằm trong M4 đã thu hẹp**. Nếu sau này ai đó mở lại (b), nó là việc riêng.

**Không giải quyết câu hỏi `application`.** Cổng của M4-4 nói thẳng: *"DONE additionally requires a human decision on open question 1 (who owns `application`), because the plan's model for that type lives in a repo that does not exist here."* Kiểu đó **không có trong repo này**. M4-4 không được coi là xong khi câu hỏi này còn treo.

**Không coi các bước `grep` là test.** Cổng M4-4 tự nói: bước (c)(d)(e) là *"a human checklist, not a test"*. Cụ thể và đáng nhớ: nếu ai đó đổi thứ tự refactor để `#saveRuntimeConfig` bị **đổi tên** thay vì bị xoá, các lệnh grep vẫn xanh trong khi ổ khoá đã biến mất im lặng. **Phòng thủ duy nhất là test tranh chấp kèm control phản âm** — xoá `withFileLock` khỏi `#mutateConfig` và xác nhận test chuyển đỏ. Một cổng chưa từng thấy đỏ thì không phải cổng.

**Không sửa `tsc`, không `mock.module()`, không source-grep trong test.** Xem [Quy ước khi đọc](#quy-ước-khi-đọc).

**Mục pháp lý §7 về deepseek-harness.** `light.json` **không có trường nào** về pháp lý, giấy phép hay attribution — và điều đó là thông tin có giá trị: không file nào trong 37 mục đến từ dsh, không có gì để vendor, nên **§7 gắn với chương trình, không gắn với bốn item này**. Không có nghĩa vụ license nào chặn việc merge M4-4/6/7/9. Việc cần làm: **xác nhận §7 trong kế hoạch tổng trước khi phát hành** — vì điểm pháp lý chỉ trở thành việc thật ở thời điểm phát hành, đúng lúc cả ba sóng đang chờ cùng một quyết định changelog.

---

## Điều kiện tiên quyết

### Addon native phải build trước khi `bun test` có nghĩa

```
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
```

Đây là **tiền đề cứng, không phải tiện nghi** — và nó là **tiền đề tái lập được**, không phải hạn chế của máy. `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives`. Trên một máy sạch chưa build addon, mọi `bun test packages/coding-agent/test/**` chết ngay ở bước import:

```
bun test packages/utils/test/file-lock.test.ts
→ 0 pass, 1 fail
→ Failed to load pi_natives native addon for darwin-arm64
```

Đó là **thiếu một bước build**, không phải "cổng này không chạy được ở đây". Làm **một lần** hai lệnh trên (exit 0, sinh `pi_natives.darwin-arm64.node`) là toàn bộ suite chạy. Trên cây này việc đó **đã làm xong 2026-09-29** (`bun test packages/utils/test/` → 743 pass / 10 skip / 0 fail), nên từ giờ mọi cổng `bun test` trong tài liệu này đều chạy được.

Concretely, "addon chưa build" nghĩa là **test của M4-4 chưa viết được và chưa chạy được** — kể cả control phản âm, vì control phản âm đòi xoá `withFileLock` rồi xác nhận đỏ; không có lock thì không có gì để xoá. Sau khi build, cổng đỏ còn lại là công việc chưa làm: **3/6** bước kiểm của M4-4 đỏ — (b) vì file test mới chưa tồn tại, (c)(d) vì refactor chưa thực thi; (a)(e)(f) đã xanh.

### `bun run check:ts` chạy được không cần addon

Và nó **là** một cổng thật cho cả bốn work item gốc — không phải hình thức. Sáu mục `GAP-M4-10`..`GAP-M4-15` cũng khai `bun run check:ts` trong khối Xác minh của từng mục:

- **M4-4** bước (f): chính là thứ bắt được sự trôi giao diện `tui`/`coding-agent` mà kế hoạch cảnh báo, biến nó thành lỗi build thay vì một điều bất ngờ lúc chạy.
- **M4-6** cổng (4): ngoài việc sạch, nó còn **cấm** `SettingsProvenance` (tui, **tạo mới bởi M4-6**) và `SettingProvenance` (coding-agent, **đã tồn tại**) trôi lệch nhau — hai tên khác nhau, ở hai package khác nhau, cố ý giữ cho khớp điểm đầu-cuối.
- **M4-7** cổng G5.
- **M4-9** điều kiện (1).

### Điều kiện riêng của từng M4

| Điều kiện | Chặn item nào | Trạng thái |
| --- | --- | --- |
| Addon native đã build | M4-4 | **ĐÃ BUILD 2026-09-29** — cổng (a) xanh; chỉ còn (b)(c)(d) đỏ vì công việc chưa làm |
| **M2 WI-8a + WI-8b** phải merge — chúng là thứ tạo ra bề mặt `pi.registerSetting` có namespace mà M4-6 sửa | M4-6 | **CHƯA XÁC NHẬN** — WI-8a/8b là việc M2 chưa thực thi; phải xác nhận đã vào nhánh này trước khi bắt đầu |
| **M2 WI-2** (thứ tự nạp extension + giải quyết va chạm tường minh) phải merge | M4-9 | **CHƯA THOẢ** — `extension-load-order-determinism.test.ts` không tồn tại, `git grep -n 'extension-load-order' packages/coding-agent/` trả **0 hit** |
| Bản viết M2 WI-4 phải được thống nhất (§6.1) | M4-7 (trước khi mở PR) | Thuộc WI-4 của kế hoạch M2, đã có sẵn trong §11 và đã đặc tả xong |
| **M2 Wave 1b** (`WI-PRESTEP-1`, ghi durable turn khi bị chặn) phải merge | M4-4 | **CHƯA THOẢ** |
| Quyết định về merge order với M3-A4 | M4-4 | M3-A4 viết lại đúng dải `setPluginSetting` 942-949; hai bản vá độc lập sẽ âm thầm hủy lẫn nhau |
| Quyết định con người về câu hỏi mở 1 (ai sở hữu `application`) | M4-4 (điều kiện DONE) | Chờ bạn |
| Quyết định changelog của M4 (plan:§6.2) | Mở PR của Wave B | Chờ bạn — merge thì được, release thì không |
| Ủy quyền `shippable: false` của Wave D bằng văn bản | M4-9, `GAP-M4-10`, `GAP-M4-14`, `GAP-M4-15` | Chờ bạn |
| **GAP-M1-18** (`omp doctor`) phải merge, và danh sách check của nó phải đã đóng | `GAP-M4-15` (điều kiện tiên quyết tuyệt đối) | **CHƯA CÓ** — `grep -n "GAP-M1-18\|omp doctor" MILESTONE_1_EXECUTION_PLAN.md` trả **0 hit**; mục này chưa tồn tại trong kế hoạch M1. Theo GAP-D4, hàng check phải vào **danh sách** trước khi code |
| Merge order của `GAP-M4-10` với GAP-M1-18 | `GAP-M4-10` | `GAP-M4-10` merge **trước** — không có `LEDGER.md` thì doctor không có gì để báo |
| Quyết định merge order với **M2 WI-9** | `GAP-M4-12` | Chưa có — WI-9 sửa đường đăng ký handler mà item này sửa đường gọi; hai mặt của cùng một seam |
| **GAP-D8** (tiêu chí chọn trong 895 call site) + tên owner của phần nợ còn lại | `GAP-M4-11` | Chờ bạn |
| **GAP-D2** (`ApprovalEntry` mở rộng union `SessionEntry` hay tái dùng `CustomEntry`) | `GAP-M4-13` | Chờ bạn |
| Con số trần của hàng `proof: none` + tên người giữ trần | `GAP-M4-14` | Chờ bạn |

**Lưu ý khi đọc cột `verified`:** hai mục `[create,UNVERIFIED]` trong M4-4 (`packages/utils/src/atomic-write.ts` và `packages/coding-agent/test/plugin-runtime-config-lock.test.ts`) là **file chưa tồn tại** — chúng được tạo ra bởi chính item đó. Đó không phải đường dẫn sai.

---

## Thứ tự thực hiện

Ba sóng, theo thứ tự **B → C → D**. Lưu ý: đây là thứ tự **merge**, không phải thứ tự release. Không sóng nào release.

### Wave B — Ghi trạng thái bền vững và sự thật của bảng settings

**Gồm:** M4-4 + M4-6. **Một PR, một lần review, hai commit** — kế hoạch xác nhận điều này, không phải suy đoán. Cộng thêm hai mục độc lập cùng sóng: `GAP-M4-11` (hàm chuẩn hoá lỗi) và `GAP-M4-13` (cặp audit quyền). Cả hai là **PR riêng** — chúng dùng chung quyết định release, không dùng chung PR.

**Cần trước:** addon native đã build; M2 WI-8a/WI-8b đã merge; merge order với M3-A4 đã chốt; câu hỏi mở 1 về `application` đã có quyết định của người.

**Bàn giao:** `ChangeResult` + `withFileLock` + một `atomicWriteJson` dùng chung; lớp `shadowing.ts` mới; trả lời thật cho mọi ghi trạng thái bền vững; guard chặn ghi giá trị chết; **một** kiểu kết quả chung cho Wave B (không phải hai).

**Đúng sau khi kết thúc:**

- `git grep -n saveRuntimeConfig -- packages/` → **0 hit**
- `git grep -n atomicWriteJson -- packages/` → **đúng một** định nghĩa, trong `packages/utils`
- `grep -c secret .../manager.ts` → **0**
- `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` → **0** (cổng chống trôi: nó đỏ ngay khi có call site thứ 14 xuất hiện)
- `bun test packages/utils/test/file-lock.test.ts` → xanh (đã xanh từ 2026-09-29, sau khi build addon native)
- Test tranh chấp **và** control phản âm của nó đã từng được thấy đỏ
- Test project-shadow khẳng định trên **byte thật** của file rằng sau khi panel ghi, key không có trong `config.yml` toàn cục và giá trị **trước khi ghi** vẫn còn — rollback in-memory xảy ra trước khi debounce `#queueSave` 100ms ráo nên ghi và rollback của nó hợp nhất thành một lần save
- Test control "không có shadow" khẳng định **cùng key đó CÓ** trong `config.yml` — không có test này thì hai cổng trên thỏa mãn được bằng một con guard từ chối **mọi** ghi
- `bun run check:ts` sạch

**Rời khỏi Wave B mà chưa release.** Đây là ranh giới quan trọng: xanh ở đây nghĩa là "đúng", không phải "đã ship".

### Wave C — Hợp đồng render

**Gồm:** M4-7. **Cần trước:** bản viết WI-4 đã được thống nhất (§6.1) — chưa mở PR nếu chưa. Không để WI-4 thay đổi đường đăng ký renderer trong cùng PR; WI-4 xây trên hợp đồng mà item này tạo ra. Cộng thêm `GAP-M4-12` (nhãn "bị chặn" khác "hook hỏng") — nó dùng chính seam G3/G4 mà M4-7 dựng sẵn, nên **thứ tự trong cùng sóng là bắt buộc: M4-7 trước GAP-M4-12**.

**Bàn giao:** kênh `rawArgs: { json, complete }` có kiểu thật sự; **toàn bộ** object `options` được chuyển tiếp xuống renderer của extension (thay vì bốn field bị vứt); `__partialJson` thôi mang một nghĩa; renderer theo buffer thô vẽ lại theo mọi lần tiền tố dài thêm.

**Đúng sau khi kết thúc — năm cổng, tất cả đều cơ học và đều có thể đỏ:**

- **G1 — ADAPTER REACH (cổng quyết định).** `raw-args-render-channel.test.ts` **ĐỎ trên cây trước khi sửa** và xanh sau. Nó đỏ vì `RegisteredToolAdapter.renderResult` nhận `options.argsComplete === true` và khẳng định object đã bắt vẫn còn nó — hôm nay `wrapper.ts:62` đã vứt nó. **Để chứng minh cổng này có răng:** chỉ thêm field `rawArgs` vào hai interface, đổi gì khác, chạy lại — và quan sát nó **vẫn xanh**. Đó chính là bẫy mà kế hoạch gọi tên: một thay đổi chỉ-đổi-type xanh ở mọi nơi và không đến với ai. G1 là thứ phân biệt item này với một refactor ảo.
- **G2 — STREAM MONOTONICITY.** Chuỗi `rawArgs.json` ghi lại phải **không giảm** và **nối tiền tố**; giá trị cuối phải chứa `"path":"xd://probe"` (lớp ngoài) và **không phải** JSON thiết bị lớp trong.
- **G3 — REBUILD PARITY.** Render dựng lại từ transcript bằng render dựng động. Đỏ nếu `ui-helpers.ts:605` chưa được nối — một kiểu hỏng mà **cả `bun check` lẫn các test xdev có sẵn đều không nhìn thấy**.
- **G4 — HIDDEN-KEY NEGATIVE.** `HIDDEN_ARG_KEYS` (`json-tree.ts:23`) phải phủ key xdev mới. Khẳng định qua `formatArgsInline` rằng **cả cách viết cũ lẫn mới** đều không xuất hiện trong output. Đỏ ngay khi ai đó đổi tên ở `xdev.ts:57` và quên dòng này — rủi ro im lặng mà kế hoạch nêu tên.
- **G5 — TYPES.** `bun run check:ts` thoát 0.

**Sau Wave C:** hợp đồng render đã có thật, và **M2 WI-4 mới được phép xây lên trên nó**. Đây là thứ duy nhất trong M4 mở khóa công việc ở milestone khác. Vẫn chưa release.

### Wave D — Khả năng nhìn thấy triage

**Gồm:** M4-9 (phạm vi option **(a)**: state/shadowed, **không** có shadow-source). Cộng thêm ba mục cùng hình dạng PR — một lệnh/báo cáo **chỉ-đọc**, không sửa hành vi, không thêm seam: `GAP-M4-10` (sổ `patches/LEDGER.md`), `GAP-M4-14` (bảng `docs/feature-mechanism.md`), `GAP-M4-15` (một dòng trong `omp doctor`). Wave D đã mang `shippable: false` và một quyết định changelog chung, nên ba hàng này **không kéo theo quyết định release mới**.

**Cần trước:** **M2 WI-2 phải merge** — chưa thoả. Lý do không thể trì hoãn: nếu CLI này ship trước, nó báo một thứ tự mà người dùng **chưa từng thấy** trên dashboard.

**Bàn giao:** lệnh chỉ-đọc `omp extensions-triage`, **chiếu** đúng những hàng mà `loadAllExtensions` đã trả về, không suy diễn lại bất cứ thứ gì.

**Đúng sau khi kết thúc:**

- `bun run check:ts` sạch; `extensions-triage-cli.test.ts` xanh
- **Diff thủ công ở bước 13 cho thấy các hàng của CLI khớp dashboard chính xác** — cụ thể: một hàng mà dashboard gọi là `disabled` tuyệt đối không được bị CLI báo là `active`. Đây là điều kiện **không thể bịa**: xoá phần mirror `Settings.init()` / `cfgDisabledExtensions` khỏi CLI thì JSON vẫn trông hợp lý, nhưng mọi disable ở mức item sẽ lật sang `active` và diff sẽ lộ ra
- Dòng CHANGELOG tồn tại **và** ủy quyền `shippable: false` của Wave D đã được cấp bằng văn bản
- *(nếu mở lại option (b))* một hàng bị winner cùng tên che phải báo `shadowedBy` khác rỗng, và một test trong capability suite **đỏ** nếu `_shadowed` được set mà không có winner

**Một thứ mà *không* cổng nào bắt được, người review phải tự mắt xác nhận:** `Command` có thật sự được đăng ký trong `cli-commands.ts` hay không. Thiếu một mục registry làm `omp extensions-triage` rơi xuống `runCli` và **chuyển argv cho LLM như một prompt** (hồi quy #1496) — và **không test nào liệt kê ở đây sẽ nhận ra**. Gợi ý lệnh test của chính kế hoạch, `bun test ... -t 'acp'`, sẽ xanh trước **mọi** khiếm khuyết nêu trên.

**Sau Wave D:** đủ ba sóng đã merge. Chưa release gì cả. Bước kế tiếp là **một** quyết định changelog duy nhất phủ B, C và D — rồi release.

---

## Quyết định cần chốt trước khi code

Những cái này suy ra trực tiếp từ `depends_on` và từ dòng `risk`; không cái nào được bịa thêm.

| # | Quyết định | Vì sao nó chặn code | Chặn item |
| --- | --- | --- | --- |
| 1 | **Ai sở hữu `application`?** | Kiểu mà kế hoạch dùng cho nó **sống trong một repo không tồn tại ở đây**. Đây là câu hỏi mở 1 và là điều kiện DONE của M4-4 | M4-4 |
| 2 | **Merge order với M3-A4** cho dải `setPluginSetting` 942-949 | Cùng PR, hoặc một thứ tự merge tường minh. Hai bản vá độc lập sẽ âm thầm hủy lẫn nhau | M4-4 |
| 3 | **`ChangeResult` hay `SettingsWriteResult`?** | `ChangeResult` của M4-4 là tiền lệ. Chốt một hình dạng để Wave B ship **một** kiểu kết quả, không phải hai kiểu gần giống | M4-6 (với M4-4) |
| 4 | **Quyết định rollback của `/settings`** | Dòng `risk` nói thẳng: *"the rollback decision is what can brick /settings"*. Đây là cái có thể làm hỏng vĩnh viễn một chức năng | M4-6 |
| 5 | **M4-9 là (a) hay (b)?** | Tiêu đề đã khoanh vùng là (a) — state/shadowed, không shadow-source, không chạm shared core. Xác nhận (b) nằm ngoài M4, và nếu ai mở lại (b) thì đó là việc riêng với `capability/index.ts` + 6 call site | M4-9 |
| 6 | **Giữ hai tên `SettingsProvenance` (tui) và `SettingProvenance` (coding-agent), hay hợp nhất?** | Cổng chỉ **cấm trôi lệch**, không **bắt phải giống nhau**. Cần biết trước để viết `check:ts` và tên biến | M4-6 |
| 7 | **Có viết bản WI-4 bây giờ, hay sau Wave B?** | M4-7 không được mở PR trước khi nó được thống nhất (§6.1) | M4-7 (chặn sóng) |

---

## Quyết định cần bạn chốt

Bảng này là của người bảo trì, không phải của kỹ sư.

| # | Quyết định | Bối cảnh |
| --- | --- | --- |
| 1 | **Quyết định changelog của M4** (plan:§6.2) | Wave B **không thể mở PR** cho tới khi quyết định này có. *"Merge is allowed, release is not."* Đây là một quyết định duy nhất phủ cả ba sóng |
| 2 | **Ủy quyền `shippable: false` của Wave D bằng văn bản** | Cổng của M4-9 đòi nó như một điều kiện xong, bằng chữ |
| 3 | **Có bắt đầu M4 lúc này không, khi 2/4 item phụ thuộc công việc M2 chưa tồn tại?** | WI-8a/WI-8b (chặn M4-6) và WI-2 (chặn M4-9) đều chưa có trong cây. Wave C là item duy nhất không bị chặn bởi M2 — nó có thể đi trước nếu bạn muốn tạo hợp đồng render sớm cho WI-4 |
| 4 | **Chấp nhận việc giữ ba sóng unreleased?** | Cả ba đều `shippable: false`, nghĩa là người dùng có thể thấy thay đổi user-visible đã merge nhưng chưa xuất hiện trong bản phát hành cho tới khi milestone đóng lại. Đó là hệ quả trực tiếp của §6.2, không phải sự cố |
| 5 | **Xác nhận §7 về deepseek-harness** trước khi phát hành | Bốn item này không mang theo nghĩa vụ license nào (không file nào đến từ dsh). Nhưng điểm pháp lý chỉ thành việc thật **ở thời điểm phát hành** — đúng lúc cả ba sóng đang chờ cùng một quyết định changelog |

---

## Quy ước khi đọc

- **Tài liệu này bằng tiếng Việt. Code giữ nguyên tiếng Anh.** Tên file, tên symbol, tên commit và nội dung CHANGELOG không được dịch.
- **`bun check` và `bun test` — không bao giờ `tsc`, không bao giờ `npx tsc`.** `bun run check:ts` là cổng thật cho cả bốn work item gốc, và sáu mục `GAP-M4-10`..`GAP-M4-15` khai nó y hệt.
- **Không source-grep file implementation trong test.** Cấm `expect(src).toContain("someCall()")`, `.not.toContain("oldName")`, hay bất kỳ trò gì nào đọc mã nguồn rồi khẳng định về **hình dạng văn bản** của nó. Một test như vậy vỡ khi refactor vô hại và xanh khi hành vi đang hỏng. Khẳng định hợp đồng quan sát được; nếu phải khẳng định bất biến cấu trúc thì dùng type test hoặc oxlint rule — **không** quét chuỗi.
  - Hệ quả cụ thể cho M4-4: các bước `git grep` trong cổng là **checklist của con người, không phải test**. Đừng chuyển chúng vào file test.
  - Được phép: đọc một file mà **chính code của bạn vừa ghi** (kết quả apply-patch, bundle đã sinh, fixture tạm) và khẳng định về **output đó** — đó là hành vi, không phải source-grep.
- **Không `mock.module()`.** Nó đột biến module registry toàn cục và rò sang các file khác. Dùng `spyOn` trên object module đã import, `vi.restoreAllMocks()` trong `afterEach`. Mọi test phải **an toàn khi chạy full-suite**, không chỉ an toàn khi chạy một file.
- **Một cổng chưa từng thấy đỏ thì không phải cổng.** Với test tranh chấp của M4-4 và G1 của M4-7, phải **chứng minh** cổng có răng: xoá `withFileLock` / chỉ thêm field type, rồi xác nhận đỏ (hoặc xanh, đúng như G1 yêu cầu để chứng minh bẫy).
- **Cổng (3) của M4-9 không thể bịa**, nhưng việc `Command` có được đăng ký trong `cli-commands.ts` thì có thể. Cái đó phải mắt thấy, không phải test thấy.
- **`[create,UNVERIFIED]` nghĩa là file chưa tồn tại**, vì item đó tạo ra nó — không phải đường dẫn sai.


---


## M4-4. Ghi trạng thái bền vững và sự thật của bảng settings (sóng B)

**Sóng:** M4 Wave B — Ghi trạng thái bền vững và sự thật của bảng settings (`shippable: false`)
**Effort:** M theo ước lượng của plan; thực tế là M-L
**Phụ thuộc:** build native addon (`bun --cwd=packages/natives run build`); thứ tự merge với M3-A4

Các lệnh ghi trạng thái plugin trở thành một read-modify-write có khoá, trả lời cho
người gọi biết thay đổi có thực sự nằm trên đĩa hay không; writer JSON nguyên tử viết
tay dở dang trở thành một tiện ích dùng chung.

**Hiệu ứng người dùng thấy:** bật/tắt plugin trong `/settings` giờ trả về một câu
trả lời thật thay vì `void` vô điều kiện — người gọi biết lockfile có thực sự đổi
không, và phiên đang chạy có nhận thay đổi không. Cả hai writer của lockfile đều đi
qua khoá: `PluginManager` (overlay + `omp plugin enable/disable`) và
`MarketplaceManager` (`omp plugin install` và các lệnh marketplace). Không khoá
`MarketplaceManager` thì tính năng này chỉ bảo vệ được một nửa. Vì Wave B là
`shippable: false` (plan
mục 6.2), đây là thay đổi hành vi quan sát được và có thể không được ship cho tới
khi quyết định changelog duy nhất của M4 được phê duyệt.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/plugins/manager.ts` | sửa | Thay `#saveRuntimeConfig()` (148-151) bằng một helper read-modify-write có khoá; thêm interface `ChangeResult` được export; đổi `setEnabled` (874-881), `setEnabledFeatures` (898-920), `setPluginSetting` (942-949) và `deletePluginSetting` (954-961) sang trả `Promise<ChangeResult>`; chuyển cả chín call site (668, 724, 855, 880, 919, 948, 958, 1221, 1231) để truyền mutation của mình vào phần có khoá thay vì mutate object đã memoize trước đó. | verified |
| `packages/tui/src/overlays/plugin-settings.ts` | sửa | Nới ba chữ ký mutator trên `PluginSettingsManager` (bắt đầu ở :68) từ `Promise<void>` sang `Promise<ChangeResult>`: `setEnabled` (:72), `setEnabledFeatures` (:74), `setPluginSetting` (:75); cập nhật call site trong overlay tại :776, :786, :790 (và :823) để dùng kết quả. | verified |
| `packages/coding-agent/src/extensibility/plugins/marketplace/registry.ts` | sửa | Xoá `atomicWriteJson` cục bộ (44-71) và import bản dùng chung từ `@oh-my-pi/pi-utils`. Hai caller — `writeMarketplacesRegistry` (:95) và `writeInstalledPluginsRegistry` (:128) — giữ nguyên chữ ký. | verified |
| `packages/utils/src/atomic-write.ts` | tạo | Module trung tâm mới export `atomicWriteJson(filePath: string, data: unknown): Promise<void>` — ghi ra file tạm cùng thư mục, rồi `fs.rename` vào chỗ, kèm fallback unlink-rồi-rename khi Windows trả EPERM và dọn file tạm khi lỗi ngoài dự kiến; chuyển nguyên văn từ registry.ts. | **chưa kiểm chứng** — file chưa tồn tại, phải tạo. `git grep atomicWrite` không thấy bản trung tâm nào đã có trong `packages/utils`, nên đây là bản đầu tiên, không có gì để gộp. |
| `packages/utils/src/index.ts` | sửa | Thêm `export * from "./atomic-write";` đúng thứ tự alphabet (sau `./async`, trước `./binary`) để giữ barrel có trật tự. Barrel đã có `export * from "./file-lock";` ở **dòng 9** (dòng 7 là `./executable`). | verified (đã đếm lại bằng `grep -n '' packages/utils/src/index.ts`; thứ tự alphabet đã đối chiếu bằng `LC_ALL=C sort`: `abortable` < `async` < `atomic-write` < `binary`) |
| `packages/coding-agent/src/extensibility/plugins/marketplace/manager.ts` | sửa (BẮT BUỘC — cùng một lockfile) | `#runtimeLockPath` (906-908) phân giải ra **đúng** `getPluginsLockfile()`. Đã chạy và kiểm chứng: `PluginManager.#saveRuntimeConfig` và `MarketplaceManager.#writeRuntimeConfig("user")` ghi cùng một file. `#writeRuntimeConfig` (923-925) phải đi qua `withFileLock(this.#runtimeLockPath(scope), …)` với read-modify-write **bên trong** khoá, y hệt `#mutateConfig` của `PluginManager`, và ghi bằng `atomicWriteJson`. `withFileLock` tự phái `${resolve(filePath)}.lock`, nên hai bên dùng chung một lock file mà không cần hạ tầng mới. Ba call site của nó: :1076, :1087, :1097. | verified bằng cách chạy cả hai chuỗi phân giải đường dẫn — cùng ra `~/.omp/plugins/omp-plugins.lock.json` |
| `packages/coding-agent/src/cli/plugin-cli.ts` | sửa | Đưa `ChangeResult` lên bốn lệnh CLI có ghi: `setEnabled` (:1038), `setEnabledFeatures` (:761), `setPluginSetting` (:906), `deletePluginSetting` (:917). Cả bốn hôm nay đều là `await manager.x(...)` trần, nên nới kiểu vẫn tương thích mã nguồn và CLI vẫn biên dịch — nhưng nếu ý nghĩa của `ChangeResult` là để người gọi hành xử theo nó, thì bốn lệnh này chính là những người gọi đó. | verified |
| `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` | tạo | File test mới: tranh chấp hai instance, negative control bắt buộc, các nhánh `changed=false`, và nhánh ném lỗi. | **chưa kiểm chứng** — file chưa tồn tại. Mẫu cô lập mà spec trích dẫn (`plugin-config.test.ts:19-33`) cũng không được đánh dấu verified. |
| `packages/coding-agent/CHANGELOG.md` | sửa (BỊ CHẶN) | Ghi entry dưới `## [Unreleased]` (đang rỗng, bắt đầu ở dòng 3) cho thay đổi người dùng thấy: setEnabled và các hàm anh em giờ báo thay đổi có nằm trên đĩa không và có cần restart không. | verified (file tồn tại) — **nhưng KHÔNG viết entry trong PR này**, chỉ ghi nhận để theo dõi |
| `packages/tui/CHANGELOG.md` | sửa (BỊ CHẶN) | Cùng một entry bị chặn cho thay đổi kiểu trả về của `PluginSettingsManager` (một breaking change với implementor ngoài repo). Bề mặt breaking là thật: `packages/tui/package.json` dòng 94 export wildcard `./*`, nên `PluginSettingsManager` tới được bởi bất kỳ consumer bên ngoài nào. | verified (file tồn tại, 215 KB) — **nhưng KHÔNG viết entry trong PR này** |
| `packages/utils/CHANGELOG.md` | sửa (BỊ CHẶN) | Một entry `### Added` cho tiện ích `atomicWriteJson` dùng chung, một khi cổng changelog mở. | verified (file tồn tại, 43 KB) — entry này ít user-facing nhất trong ba cái và có thể bị bỏ khi quyết định changelog |

Ba dòng CHANGELOG ở trên là chỗ đánh dấu để theo dõi, **không phải việc phải làm bây
giờ**: plan mục 6.2 cấm work item này tự viết entry của riêng nó. Entry bị chặn sau
quyết định changelog duy nhất của M4, quyết định bao trùm cả Wave B, C và D.

### Các bước

1. **Dựng native addon TRƯỚC** — `bun --cwd=packages/natives run build`
   (điểm neo do spec đưa ra: `packages/natives/package.json:32`; neo này không được
   đánh dấu verified). Không có nó, mọi test trong item này không chạy được: `packages/utils/src/file-lock.ts:9`
   import `FileLock` từ `@oh-my-pi/pi-natives`, và bất kỳ test nào chạm `withFileLock` đều chết với
   `Failed to load pi_natives native addon for darwin-arm64`. Xác nhận bằng `bun test packages/utils/test/file-lock.test.ts`
   phải ra **4 pass / 0 fail**. Trên máy sạch nó đi từ `0 pass, 1 fail` sang xanh sau khi build; trên cây này
   nó **đã build xong 2026-09-29**, nên bước 0 chỉ còn là tiền đề tái lập cho máy khác.

2. **Tạo `packages/utils/src/atomic-write.ts`** (`marketplace/registry.ts:44-71`) và
   chuyển nguyên văn thân `atomicWriteJson` sang đó: `JSON.stringify` 2 khoảng trắng
   cộng dấu xuống dòng cuối, đường dẫn file tạm `${filePath}.tmp`, `fs.rename`, fallback
   unlink-rồi-rename khi EPERM, và dọn file tạm khi lỗi ngoài dự kiến. Giữ nguyên ép kiểu
   `(err as NodeJS.ErrnoException).code === "EPERM"` — nó không phải `any` và AGENTS.md cho phép.
   Thêm `export * from "./atomic-write";` vào barrel của utils đúng vị trí alphabet. Rồi
   xoá bản gốc ở `registry.ts:44-71` và trỏ hai caller sang import dùng chung.

3. **Thêm interface `ChangeResult`** (`manager.ts:148-151`): `{ changed: boolean; application: "applied" | "restart-required" }`.
   Thêm helper private `#mutateConfig(mutate, application)` (xem Hình dạng code) mở
   `withFileLock(getPluginsLockfile(), ...)`, đọc lại config từ đĩa **bên trong** khoá
   qua `#loadRuntimeConfig()` sẵn có, chụp ảnh nó, áp dụng mutation của caller lên object
   tươi, diff để tính `changed`, nhận object tươi làm `this.#runtimeConfig`, và chỉ ghi
   bằng `atomicWriteJson` khi `changed`. Xoá `#saveRuntimeConfig`. Import `withFileLock`
   và `atomicWriteJson` từ `@oh-my-pi/pi-utils` ở top level — không inline import.

4. **Chuyển bốn mutator công khai** (`manager.ts:874-961`). Đây là phần cơ học, và
   cũng là phần plan nói sai: mỗi hàm hiện mutate `this.#runtimeConfig` đã memoize
   **rồi mới** gọi save. Phải dời mutation **vào trong** callback — nếu để
   `config.plugins[name].enabled = enabled` nằm ngoài khoá, helper sẽ đọc trạng thái
   tươi, không áp gì, không diff gì, và báo `changed: false` trong khi âm thầm vứt mất
   lệnh ghi. `deletePluginSetting` (:954) hiện chặn lệnh ghi sau `if (config.settings[name])`;
   bỏ chặn đó và để diff tự sinh `changed: false` cho trường hợp thiếu khoá.

   `setEnabledFeatures` không vừa callback đồng bộ: nó `await this.getPlugin(...)` ở
   `:906` để validate tên feature trước khi mutate. Giữ khoá quanh lời gọi đó nghĩa là
   giữ một OS lock trong lúc đọc manifest trên đĩa. **Khuyến nghị: gọi `getPlugin`
   trước, ngoài khoá, rồi truyền kết quả vào trong callback** — validate tên feature là
   việc chỉ đọc, TOCTOU ở đây vô hại, còn việc kéo dài critical section qua I/O thì
   không. Nếu sau này cần validate phụ thuộc trạng thái trên đĩa, hãy đổi chữ ký thành
   `mutate: (config: PluginRuntimeConfig) => Promise<void>` và ghi lại quyết định đó vào
   changelog của M4-4, đừng để nó là thay đổi ngầm.

5. **Chuyển năm writer còn lại** (`manager.ts:668, 724, 855, 880, 919, 948, 958, 1221, 1231`):
   install (:668), uninstall (:724), link (:855), `#removeInvalidFeature` (:1221),
   `#removeOrphanedConfig` (:1231) — truyền mutation của chúng vào `#mutateConfig`.
   Hai helper private vốn đã trả boolean; giữ nguyên hình dạng boolean đó và **trả
   `ChangeResult` bên cạnh**, thay vì thay thế nó. Sau bước này
   `git grep -n saveRuntimeConfig -- packages/` phải trả về không hit — đó là bằng chứng
   cơ học cho thấy refactor đã xong.

6. **Nới `PluginSettingsManager`** (`plugin-settings.ts:72, 74, 75`): ba kiểu trả về
   thành `Promise<ChangeResult>` và import kiểu đó. Kiểu đó lấy từ đâu chính là câu hỏi
   mở số 1 — nếu tui không import được từ coding-agent (không được; chiều phụ thuộc chạy
   ngược lại), khai báo nó trong tui và để manager bên coding-agent thoả mãn nó một cách
   cấu trúc, đúng như interface được thoả mãn hôm nay. Rồi dùng kết quả tại các call
   site của overlay (:776, :786, :790, :823).

7. **Bốn lệnh CLI phải hành xử theo kết quả** (`plugin-cli.ts:761, 906, 917, 1038`),
   thay vì vứt đi — tối thiểu báo `application: "restart-required"` để người dùng bật
   plugin từ shell biết phiên đang chạy không thay đổi. Đây là user-visible và thuộc
   về entry changelog.

8. **Viết test** (`packages/coding-agent/test/plugin-runtime-config-lock.test.ts`) theo
   Hợp đồng test. Không thương lượng được: negative control. Không có nó, test hai
   instance chứng minh không điều gì, vì hai lệnh trên **một** instance vốn đều cùng
   nằm (object memoize là chung) — plan nói đúng điểm này, và đây là cách dễ nhất để
   ship một bộ test xanh mà không canh gì.

9. **Hoà giải với M3-A4** (`manager.ts:942-949`). Hoặc M3-A4 chưa land — khi đó PR này
   và M3-A4 phải là một PR, hoặc phải có thứ tự merge tường minh, vì cả hai đều viết
   lại `setPluginSetting` — hoặc nó đã land và bước này là rebase. Dù thế nào,
   `grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts` phải **in ra
   dòng `0`** trước và sau — dùng **GNU `grep -c`**, không phải `git grep -c` (`git grep -c`
   in **rỗng** chứ không in `0` khi không có match, nên lệnh đó không phân biệt được pass với
   sai lệnh); đó là hồi quy guard của M3, và nó đã là 0 ở baseline, nên nó canh một
   hồi quy tương lai chứ không chứng minh điều gì hôm nay.

10. **Chạy toàn bộ cổng** (khối Xác minh). Không đánh dấu xong trước khi mọi lệnh dưới
    đó pass. `bun run check:ts` hiện đang xanh sạch trên cây này — nếu nó đỏ, phép lệch
    interface tui/coding-agent là có thật và phải sửa ở đây, không hoãn.

### Hình dạng code

```typescript
// ── packages/coding-agent/src/extensibility/plugins/manager.ts ─────────────

/** Outcome of a plugin-config mutation, as observed on disk. */
export interface ChangeResult {
	/** False when the mutation was a no-op, so nothing was written. */
	changed: boolean;
	/** Whether the running session already reflects the write. */
	application: "applied" | "restart-required";
}

class PluginManager {
	// Replaces the old #saveRuntimeConfig():
	//   await this.#ensureConfigLoaded();
	//   await Bun.write(getPluginsLockfile(), JSON.stringify(this.#runtimeConfig, null, 2));
	//
	// The WHOLE read-modify-write runs inside the lock. The mutation is a
	// callback, not something already applied to this.#runtimeConfig — applying it
	// before calling this helper is the bug that silently discards every write.
	async #mutateConfig(
		// Callback đồng bộ theo chủ ý: validation bất đồng bộ của `setEnabledFeatures` chạy TRƯỚC khi vào khoá, xem bước 4.
		mutate: (config: PluginRuntimeConfig) => void,
		application: ChangeResult["application"],
	): Promise<ChangeResult> {
		return withFileLock(getPluginsLockfile(), async () => {
			// Fresh read INSIDE the lock. Reusing #ensureConfigLoaded() here would
			// hand back the per-instance memo and defeat the whole exercise.
			const fresh = await this.#loadRuntimeConfig();
			const before = JSON.stringify(fresh, null, 2);

			mutate(fresh);

			const changed = before !== JSON.stringify(fresh, null, 2);
			// Adopt the fresh object as this instance's memo so a later read on the
			// same instance sees what is actually on disk, not a stale snapshot.
			this.#runtimeConfig = fresh;
			if (changed) await atomicWriteJson(getPluginsLockfile(), fresh);
			return { changed, application };
		});
	}

	async setEnabled(name: string, enabled: boolean): Promise<ChangeResult> {
		return this.#mutateConfig(
			config => {
				if (!config.plugins[name]) {
					throw new Error(`Plugin ${name} not found in runtime config`);
				}
				config.plugins[name].enabled = enabled;
			},
			"restart-required", // see open question 1
		);
	}

	async deletePluginSetting(name: string, key: string): Promise<ChangeResult> {
		// The old `if (config.settings[name])` guard is gone: a missing key now
		// produces changed:false through the diff instead of through a branch.
		return this.#mutateConfig(config => {
			if (config.settings[name]) delete config.settings[name][key];
		}, "applied");
	}
}

// ── packages/utils/src/atomic-write.ts ───────────────────────────────────────
// Moved verbatim from marketplace/registry.ts:44-71. The EPERM cast is a
// NodeJS.ErrnoException cast, not `any`.
export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
	const content = `${JSON.stringify(data, null, 2)}\n`;
	const tmpPath = `${filePath}.tmp`;
	await Bun.write(tmpPath, content);
	try {
		await fs.rename(tmpPath, filePath);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "EPERM") {
			try {
				await fs.unlink(filePath);
			} catch {
				// Target may not exist — that's fine
			}
			await fs.rename(tmpPath, filePath);
		} else {
			try {
				await fs.unlink(tmpPath);
			} catch {
				// Best effort
			}
			throw err;
		}
	}
}
```

Lưu ý khi đọc khối trên: giá trị `"restart-required"` trong `setEnabled` và
`"applied"` trong `deletePluginSetting` là **chỗ tạm**, không phải quyết định — chính
spec ghi kèm `// see open question 1` bên cạnh, và câu hỏi mở số 1 bên dưới chính là
chuyện ai quyết trường `application`.

### Hợp đồng test

File chính: `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` (mới).

**(1) Chấm dứt lost-update.** Hợp đồng quan sát được: sau khi hai instance
`PluginManager` độc lập (mỗi instance giữ config memoize **riêng**, cùng trỏ tới một
lockfile) chạy `setEnabled` đồng thời, JSON trên đĩa phải chứa **cả hai** thay đổi.
Nếu hồi quy, người dùng thấy một lần bật/tắt plugin tự biến mất vì một writer khác
chạm lockfile trước — đúng thất bại đã sinh ra M4-4.

Hình học của test là tải trọng, và plan nói đúng: `#ensureConfigLoaded` (`manager.ts:141-146`)
memoize hoá `this.#runtimeConfig` theo từng instance, nên hai lệnh `setEnabled` trên
**một** instance mutate cùng một object và lần ghi thứ hai tất yếu chứa cả hai thay đổi
**ngay cả khi xoá hẳn khoá đi**. Test một instance vì vậy xanh trên cả code chưa sửa
và canh không cái gì. Test phải dựng hai instance `PluginManager` và khẳng định mỗi
instance nạp config riêng. Lưu ý `getPluginsLockfile` là đường dẫn **toàn cục**
(`~/.omp/plugins/omp-plugins.lock.json` qua `dirs.ts:652`), không gốc cwd, nên cả hai
instance phải được trỏ về cùng một lockfile tạm bằng mẫu `spyOn`.

**(2) Negative control — bắt buộc, thiếu nó thì (1) chứng minh không điều gì.**
Chạy lại kịch bản (1) với thuật toán **trước khi sửa**, viết ra ngay trong test như
một helper mutate-rồi-`Bun.write` trần không khoá, và khẳng định file trên đĩa chỉ chứa
**một** trong hai thay đổi. Đây là dòng làm cho (1) có nghĩa: nó trình diễn thất bại mà
khoá loại bỏ, bằng file thật, đường dẫn thật và thuật toán thật.

Ràng buộc hiện thực: dùng một bản cài lại nội tuyến, **không** vá `PluginManager`.
AGENTS.md cấm `mock.module()` hoàn toàn, và vá lớp để tự bỏ khoá của nó cũng là cùng
loại nói dối. Helper nội tuyến ghi đúng byte xuống đúng lockfile đã bị spy — đó là tái
hiện thật, không phải mock.

**(3) Ngữ nghĩa `ChangeResult`, mỗi nhánh một test:**
- `setEnabled` với giá trị nó đang có sẽ trả `changed:false` và để nguyên byte file.
  (Khác hẳn kết quả của nhánh thành công — đây là nhánh chứng minh `changed` được quan
  sát trên đĩa chứ không phải cờ trả về được vẹt.)
- `deletePluginSetting` trên khoá vắng trả `changed:false`.
- `setEnabled` trên plugin không xác định vẫn reject với `/not found in runtime config/`
  **và** để nguyên file — chứng minh lỗi ném xảy ra bên trong khoá trước mọi lệnh ghi,
  nên một lời gọi hỏng không thể làm hỏng lockfile.
- `setEnabled` trả `application: 'restart-required'` (đường không có HMR).

**Ngoài ra**, với helper được trích ra: `atomicWriteJson` không để lại file `.tmp` anh
em nào, và JSON sinh ra phải parse được, có dấu xuống dòng cuối. Nhánh EPERM trên
Windows **không** test được trên darwin-arm64 — không giả lập nó bằng source-grep
hay bằng cách ép errno; nói thẳng là chưa test ở đây.

**An toàn toàn bộ suite:** dùng đúng mẫu cô lập từ `packages/coding-agent/test/plugin-config.test.ts:19-33` —
`spyOn(piUtils, 'getPluginsDir'|'getPluginsLockfile'|'getProjectDir'|'getProjectPluginOverridesPath')`
trong `beforeEach`, `mock.restore()` trong `afterEach`, `fs.mkdtemp` dưới `os.tmpdir()`
và `removeWithRetries` để dọn. Không mutate `Bun.*` hay `process.env` ở cấp cả file.
(Neo `plugin-config.test.ts:19-33` đến từ ghi chú của một file **chưa kiểm chứng**, nên
bản thân neo đó cũng chưa kiểm chứng.)

Hai file test sẵn có phải giữ xanh: `packages/utils/test/file-lock.test.ts` (lưới an
toàn hồi quy cho chính `withFileLock`; xanh **một khi addon đã build**), và
`packages/coding-agent/test/plugin-config.test.ts` (dựng `PluginManager` trên chính
lockfile đã spy, gần nhất với một tích hợp cho thay đổi này).

Tuân thủ AGENTS.md: không thêm test nào chỉ khẳng định constructor hay file tồn tại.
Không source-grep `manager.ts` hay `registry.ts` để chứng minh refactor đã xảy ra —
lệnh `git grep saveRuntimeConfig` ở bước 5 là mục checklist của người, không phải test.

### Xác minh

```bash
# 1. Tiền đề tái lập cho máy sạch — addon native (đã build xong 2026-09-29 trên cây này).
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 2. Cổng (a): sau bước 1 phải ra 4 pass / 0 fail (trước khi build: 0 pass, 1 fail, lỗi pi_natives addon).
bun test packages/utils/test/file-lock.test.ts

# 3. Test của item này.
bun test packages/coding-agent/test/plugin-runtime-config-lock.test.ts

# 4. Lưới sẵn có gần nhất — phải giữ xanh.
bun test packages/coding-agent/test/plugin-config.test.ts

# 5. Types + lint + format. Hiện xanh sạch trên cây hiện tại; sau thay đổi vẫn phải xanh.
bun run check:ts

# 6. Kiểm tra cơ học hoàn tất (checklist của người, không phải test).
git grep -n 'saveRuntimeConfig' -- packages/            # expect ZERO hits
grep -c 'secret' packages/coding-agent/src/extensibility/plugins/manager.ts | grep -qx 0 && echo "PASS (0 hits)" || echo "FAIL"   # M3's guard — xem bước 9
git grep -n 'atomicWriteJson' -- packages/               # expect ONE definition, in packages/utils
```

Cách viết trong plan là `bun test packages/coding-agent/test/ && bun check` — **không
đủ**, và phần `bun check` là chỗ sai còn lại. `bun test` chạy được sau khi build addon
một lần (xem môi trường ở trên), nhưng item này làm tệ hơn vấn đề chung: chính `withFileLock` import
`FileLock` từ `@oh-my-pi/pi-natives` ở `file-lock.ts:9`, nên code được test giờ phụ
thuộc trực tiếp vào addon. Dùng `bun run check:ts` cho cổng TS thay vì `bun check`:
`bun check` fan ra thêm `check:rs`, mà Rust là toolchain riêng, không thuộc item này.

### Cổng hoàn thành

Cả sáu bước xác minh phải pass, đúng thứ tự, với addon đã build. Cụ thể, người review
phải chứng minh được: (a) `bun test packages/utils/test/file-lock.test.ts` xanh — nó là
4 pass / 0 fail ngay trên cây chưa có công việc (đo 2026-09-29), nên nó là cổng an
toàn chứ không phải cổng đang đỏ; (b) file test
mới pass **và** test negative-control của nó khẳng định thuật toán không khoá thực
sự mất một update (xoá tạm `withFileLock` khỏi `#mutateConfig` và xác nhận test tranh
chấp đỏ lên — một cổng chưa từng thấy đỏ thì không phải cổng); (c) `git grep -n saveRuntimeConfig -- packages/`
không có hit; (d) `git grep -n atomicWriteJson -- packages/` cho đúng một định nghĩa,
ở `packages/utils`; (e) `grep -c secret .../manager.ts` **in ra dòng `0`** (GNU grep;
`git grep -c` sẽ in rỗng — đừng dùng bản đó ở cổng này); (f) `bun run check:ts`
xanh — chính nó bắt được phép lệch interface tui/coding-agent mà plan cảnh báo.

DONE còn đòi hỏi thêm một quyết định của con người về câu hỏi mở số 1 (ai sở hữu
`application`), vì mô hình mà plan dùng cho kiểu đó nằm trong một repo không tồn tại ở đây.

**Cổng có thực sự đỏ được không:** Có, và sau khi build addon thì **chỉ còn bước 3 đỏ
— vì công việc chưa làm, không vì môi trường.** Đo lại 2026-09-29: bước 1 xanh (build
exit 0), bước 2 xanh — `bun test packages/utils/test/file-lock.test.ts` ra
`4 pass / 0 fail`, bước 3 đỏ vì file chưa tồn tại, **bước 4 cũng đã xanh** —
`bun test packages/coding-agent/test/plugin-config.test.ts` ra `7 pass / 0 fail`
(trước đây nó đỏ với đúng nguyên nhân addon của bước 2). Bước 5 là cổng thật: hiện xanh
sạch (`bun run check:ts` exit 0), và chính nó biến phép lệch interface tui/coding-agent
thành lỗi build thay vì một bất ngờ
lúc chạy. Bước duy nhất **không** tự kiểm chứng là 6 — các đếm grep là checklist của
người, không phải test; nếu ai đó sắp lại refactor để `#saveRuntimeConfig` bị **đổi
tên** thay vì bị xoá, các grep vẫn xanh trong khi khoá đã biến mất âm thầm. Test
tranh chấp kèm negative control mới là hàng phòng thủ thật, và bước (b) của cổng —
xoá khoá, xem nó đỏ lên — mới chứng minh hàng phòng thủ đó còn sống.

### Phụ thuộc

**depends_on:**
- Build native addon: `bun --cwd=packages/natives run build` — tiền đề cứng, không
  phải thứ cho có. `withFileLock` không dùng được và không test được nếu thiếu nó.
- M3-A4 (chỉ thứ tự merge, không phải phụ thuộc mã): M3-A4 viết lại cùng dải
  `setPluginSetting` 942-949. Plan đòi cùng PR hoặc một thứ tự merge tường minh; hai
  bản vá độc lập sẽ âm thầm huỷ lẫn nhau.
- M2 Wave 1b (`WI-PRESTEP-1`) — chỉ thứ tự, không phải phụ thuộc mã

**blocks:**
- M4-6 — chạm cùng gói `packages/tui/src/overlays/`; plan bắt một lần review, hai commit.
- Quyết định changelog duy nhất của M4 (plan mục 6.2) — Wave B là `shippable:false`
  và không thể ship trước cổng đó, cổng này còn bao trùm cả Wave C và D.
- Hoàn tất Wave B nói chung — M4-4 và M4-6 không phải hai PR độc lập vì cùng đổi một
  interface cấu trúc.

### Cách sai dễ nhất

Cách dễ sai nhất là hiện thực **đúng chữ** của plan: "bọc `#saveRuntimeConfig` trong
`withFileLock` và đọc lại config bên trong khoá". Cả chín call site mutate
`this.#runtimeConfig` đã memoize **trước** khi gọi save — đã kiểm chứng, ví dụ
`setEnabled` ở 874-881 làm `config.plugins[name].enabled = enabled;` rồi mới
`await this.#saveRuntimeConfig();`. Nếu bạn đặt lệnh đọc lại bên trong khoá và ghi
kết quả đọc lại, lần đọc lại sẽ **đè** mất mutation vừa được caller áp dụng. Kết quả
là một khoá tuần tự hoá hoàn hảo, một test vẫn có thể xanh nếu bạn cũng giữ object cũ,
và 100% lệnh ghi bị rơi âm thầm trong production. Mutation **phải** nằm trong phần
có khoá dưới dạng callback; không có cách nào bọc khoá quanh lệnh save sẵn có mà
giữ nguyên call site sẵn có.

Rủi ro thứ tự: biến `changed` thành một cờ trong bộ nhớ (`return changed` từ setter)
thay vì một diff quan sát trên đĩa sẽ khiến mọi test pass và trường đó trở nên vô
nghĩa — AGENTS.md nói thẳng điều này, và plan cũng nói.

### Cần người quyết

- **Ai quyết `application: 'applied' | 'restart-required'`?** `PluginManager` không có
  kiến thức HMR, và chuỗi này không có tham chiếu nào trong repo này
  (`git grep 'restart-required'` → 0 hit). Đường overlay chỉ reload **MỘT PHẦN**:
  `settings-selector.ts:1329` → `selector-controller.ts:305-312` gọi
  `clearPluginRootsAndCaches`, `refreshSkillState`, `refreshSlashCommandState` và
  `resetCapabilities`, nhưng **không** gọi `refreshAgentDiscovery` — thứ mà
  `reloadPlugins` thật sự làm (`acp-agent.ts:2167`). Nên một lần bật/tắt, theo nghĩa
  đen, chỉ áp dụng một nửa. Con người phải quyết: (a) `PluginManager` luôn trả
  `'restart-required'` và overlay nâng lên `'applied'` khi biết reload đã chạy,
  (b) giá trị được tính ở tầng tui, hay (c) `'applied'` được tuyên bố một khi
  `refreshAgentDiscovery` được thêm vào đường settings. Mô hình mà plan dùng cho kiểu
  này là `packages/boot/plugin-manager/src/types.ts:111-114` — **thư mục đó không tồn
  tại trong repo này**.
- **`PluginSettingsMarketplaceManager.setPluginEnabled` có nằm trong phạm vi đổi kiểu
  trả về không?** Plan liệt kê nó là "mutator thứ tư", nhưng nó do một lớp **khác**
  thực hiện — `MarketplaceManager` ở `marketplace/manager.ts:686` — và nó ghi **cả hai**:
  marketplace registry (`:728`, qua `atomicWriteJson`) *và* plugins lockfile (`:733` →
  `#setRuntimePluginEnabled` :1091-1097 → `#writeRuntimeConfig`). Nó không bao giờ chạm
  `#saveRuntimeConfig`, nhưng nó vẫn chạm **cùng một file lockfile** — xem mục kế tiếp.
  Nó chỉ chung gói overlay tui. Nới kiểu trả về của nó là một
  breaking change độc lập, có sức nặng changelog riêng.
- **`MarketplaceManager.#writeRuntimeConfig` (`marketplace/manager.ts:923-925`) PHẢI
  vào phạm vi — nó là writer thứ hai của CHÍNH lockfile mà khoá này bảo vệ.** Đã kiểm
  chứng bằng cách chạy cả hai chuỗi phân giải đường dẫn: cả hai đều ra
  `~/.omp/plugins/omp-plugins.lock.json`. Không khoá nó thì `setPluginEnabled` (qua
  `:733` → `#setRuntimePluginEnabled` :1091-1097) vẫn đè mất lệnh ghi mà `setEnabled`
  khoá lại được, và effect "không còn writer thứ hai đè mất thay đổi" là sai. Ba call
  site: :1076 (`#registerRuntimePlugin`), :1087 (`#removeRuntimePlugin`), :1097
  (`#setRuntimePluginEnabled`).
- **`atomicWriteJson` sau khi trích ra nên giữ hậu tố cố định `${filePath}.tmp`, hay
  chuyển sang dạng cứng hoá `${filePath}.${process.pid}.${random}.tmp` mà
  `packages/ai/src/auth-broker/snapshot-cache.ts:93` đang dùng?** Tên file tạm dùng
  chung chỉ an toàn khi **mọi** writer của một file cùng lấy cùng một khoá — điều đúng
  với lockfile sau thay đổi này, nhưng **không** đúng với hai marketplace registry vì
  chúng không khoá. Đáng quyết trước khi tiện ích này thành trung tâm.
- **Thứ tự changelog:** plan (mục 6.2) nói M4 ship dưới MỘT quyết định changelog bao
  trùm Wave B, C và D, và rằng kế hoạch này không bao giờ tự viết entry của mình. Vậy
  ba lần sửa `CHANGELOG.md` ở trên là chỗ đánh dấu để theo dõi, không phải việc làm
  bây giờ. Hãy xác nhận cách hiểu này trước khi ai đó thêm một entry.
- **`secret` guard có thuộc cổng của PR này không?** `grep -c secret manager.ts` đã là 0
  ở baseline, nên nó không phân biệt được "M3-A4 đã land" với "M3-A4 chưa từng tồn tại".
  Nếu M3-A4 land sau PR này, guard vẫn đáng giữ — nhưng nên được mô tả như một guard
  của M3 mà PR này không được phá, chứ không phải bằng chứng về trạng thái của M3-A4.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Chi tiết (b): "Bọc `#saveRuntimeConfig` trong `withFileLock` và đọc lại config bên trong lock" | **SAI — hiện thực đúng chữ này làm rơi 100% lệnh ghi** | Mutation phải nằm **BÊN TRONG** phần khoá dưới dạng callback. Cả chín call site mutate `this.#runtimeConfig` đã memoize trước khi gọi save (đã kiểm chứng: `setEnabled` 874-881 làm `config.plugins[name].enabled = enabled;` rồi mới save). Đọc lại bên trong khoá và ghi kết quả đọc lại sẽ xoá mất mutation vừa áp dụng. Hình dạng đúng là một helper `#mutateConfig(mutate, application)` làm read → áp callback → diff → ghi, tất cả bên trong `withFileLock`, và cả chín call site đổi hình dạng. Không có phiên bản nào của thay đổi này giữ nguyên call site. |
| `packages/boot/plugin-manager/src/types.ts:111-114` mô hình hoá kiểu `ChangeResult`; `.../index.ts:772/774/787` là tiền lệ thực thi; `packages/boot/config-editor/src/index.ts:127-129` là tiền lệ rollback. | **KHÔNG CÓ TRONG REPO NÀY — chỉ là tham chiếu ngoài** | `packages/boot/` không tồn tại ở đây. `ls packages/` trả về: agent, ai, browser-relay, catalog, coding-agent, collab-web, metaharness, mnemopi, natives, omptype, snapcompact, stats, tui, typescript-edit-benchmark, utils, wire. Cả ba đều là trích dẫn tới dự án tham chiếu (dsh). Hợp lệ như tiền lệ thiết kế, nhưng kỹ sư không nên đi tìm chúng cục bộ, và kiểu `ChangeResult` phải được định nghĩa lại từ đầu trong repo này chứ không sao chép. |
| `restart-required` được test khẳng định, và `setEnabled` nên báo nó "khi không có đường HMR". | **THIẾU ĐỊNH NGHĨA — "không có HMR" thực ra là reload một phần, và kiểu này không có tham chiếu nào** | `restart-required` không xuất hiện ở bất cứ đâu trong repo (0 hit). Và reload của overlay settings **chứng minh được là một phần**: `settings-selector.ts:1329` → `selector-controller.ts:305-312` gọi `clearPluginRootsAndCaches`, `refreshSkillState`, `refreshSlashCommandState` và `resetCapabilities`, nhưng **không** gọi `refreshAgentDiscovery` — thứ `reloadPlugins` thật làm ở `acp-agent.ts:2167`. Nên câu trả lời trung thực cho đường overlay hiện tại là "áp dụng một phần", mà cặp nhị phân `applied \| restart-required` không diễn đạt được. Đây là quyết định của con người, không phải chi tiết hiện thực. Xem câu hỏi mở số 1. |
| `PluginSettingsMarketplaceManager.setPluginEnabled` là mutator thứ tư, cũng nằm trong gói overlay này. | **GÂY HIỂU NHẦM — khác lớp, khác file, nhưng vẫn ghi CHUNG lockfile** | Nó do `MarketplaceManager` ở `marketplace/manager.ts:686` thực hiện, không phải `PluginManager`, và nó ghi marketplace registry qua `atomicWriteJson`, không bao giờ qua `#saveRuntimeConfig`. Nó không gọi `#saveRuntimeConfig`, nhưng nó **ghi cùng một file lockfile** qua `#writeRuntimeConfig` (xem phần trên). Vì vậy nó **không** nằm ngoài phạm vi khoá của M4-4 — xem "Cần người quyết" về `#writeRuntimeConfig`. Nó chỉ chung gói overlay tui, nên nới kiểu trả về là một quyết định breaking độc lập. |
| Trích `atomicWriteJson` từ `marketplace/registry.ts:44-70`. | **LỆCH MỘT Ở CUỐI** | Hàm trải 44-71. Dòng 70 đóng catch bên trong; dòng 71 là dấu ngoặc đóng của hàm. Xoá tới 71. |
| Kiểm bề mặt export wildcard `packages/tui/package.json:93-96` trước khi ship. | **LỆCH MỘT** | Khối export wildcard `./*` nằm ở dòng 94-97. Kết luận plan rút ra (`PluginSettingsManager` tới được bởi consumer bên ngoài) vẫn đúng. |
| Bằng chứng của M3-A4 là `grep -c secret manager.ts` → 0. | **ĐÃ LÀ 0 Ở BASELINE — đây là guard hồi quy, không phải bằng chứng** | Đếm là 0 ngay trên HEAD `808b365`, nên nó không phân biệt được "M3-A4 đã land" với "M3-A4 chưa từng tồn tại". Giữ như guard mà PR này không được phá, nhưng đừng đọc nó như một tuyên bố về trạng thái của M3-A4. Va chạm thật là cả hai bản vá viết lại `setPluginSetting` ở 942-949 — claim đó **đúng** và được kiểm chứng độc lập. |
| Lệnh: `bun test packages/coding-agent/test/ && bun check`. | **KHÔNG ĐỦ VÀ PHẦN `bun check` LÀ CHỖ SAI CÒN LẠI** | `bun test` sau khi build addon một lần thì chạy được, nhưng item này làm nặng thêm: chính `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives` ở `file-lock.ts:9`, nên code được test giờ phụ thuộc trực tiếp addon — trên máy sạch chưa build, cả suite chết ở bước import với `Failed to load pi_natives native addon for darwin-arm64`. Giữ `bun --cwd=packages/natives run build` làm bước 0. Và dùng `bun run check:ts` cho cổng TS thay vì `bun check` — `bun check` fan ra `check:rs`, mà Rust là toolchain riêng, không thuộc item này. |
| Chín call site, bảy cái đầu là mutator công khai (install / uninstall / link / setEnabled / setEnabledFeatures / setPluginSetting / deletePluginSetting). | **ĐÃ KIỂM CHỨNG — và plan thiếu một người gọi** | Cả chín số dòng tái lập chính xác: 668 (install), 724 (uninstall), 855 (link), 880 (setEnabled), 919 (setEnabledFeatures), 948 (setPluginSetting), 958 (deletePluginSetting), 1221 (`#removeInvalidFeature`), 1231 (`#removeOrphanedConfig`). Điều plan bỏ sót là phía **người tiêu dùng**: `plugin-cli.ts` gọi `setEnabledFeatures` (:761), `setPluginSetting` (:906), `deletePluginSetting` (:917) và `setEnabled` (:1038). Cả bốn đều là `await manager.x(...)` trần, nên chúng biên dịch không đổi sau khi nới kiểu — tức là giá trị trả về mới bị vứt âm thầm ngoài TUI trừ khi PR này cũng đưa nó ra đó. |
| `withFileLock` ở `packages/utils/src/file-lock.ts:70` — đã xác nhận có mặt; cross-process **by construction** (abstract Unix socket / named mutex / flock). | **ĐÃ KIỂM CHỨNG CHÍNH XÁC** | Không cần sửa gì. `export async function withFileLock<T>` ở dòng 70; chú thích tài liệu ở dòng 1-6 nói nguyên văn "Linux uses abstract Unix sockets, Windows uses named mutexes, and other Unix platforms use `flock(2)` on `${filePath}.lock`" — lời diễn giải của plan là chính xác. Ghi lại là **đã xác nhận** vì claim an toàn trung tâm của plan dựa vào đây: một test khẳng định loại trừ lẫn nhau giữa hai instance trong cùng một tiến trình là một bài tập hợp lệ cho khoá này, vì tranh chấp nằm trên OS handle chứ không phải trạng thái tầng JS. |

## Cần người xác nhận

Ba điểm dưới đây nằm ở ranh giới giữa "spec tự mâu thuẫn" và "đã kiểm chứng được".
Không tự quyết — cần một người xác nhận trước khi code.

1. **Đường ghi của `setPluginEnabled` đã xác minh — nó ghi CẢ HAI, tuần tự, không phải
   chọn một.** `marketplace/manager.ts:686-737`: dòng `:728`
   `await writeInstalledPluginsRegistry(registryPath, updated)` ghi
   `~/.omp/plugins/installed_plugins.json` qua `atomicWriteJson`; dòng `:733`
   `await this.#setRuntimePluginEnabled(...)` → `:1091-1097` đọc rồi ghi
   `~/.omp/plugins/omp-plugins.lock.json` qua `#writeRuntimeConfig` (`:923-925`,
   `Bun.write` trần, **không khoá**). Không có mâu thuẫn nào để người ta phải xác nhận;
   cả hai mô tả trong bản thảo đều đúng, chỉ là mỗi mô tả bỏ một nửa. Hệ quả đã được xử
   lý ở mục "Cần người quyết" về `#writeRuntimeConfig`.

2. **Bản `code_shape` của spec bị cắt cụt ở cuối.** Nó kết thúc ngay sau khi đóng khối
   `catch`, **không** có dấu `}` đóng thân hàm `atomicWriteJson`. Khối trong mục "Hình
   dạng code" phía trên đã được tôi thêm ngoặc đóng đó vào để là TypeScript hợp lệ —
   đây là phần tôi bổ sung, không phải nguyên văn spec, và nó được đánh dấu ở đây để
   không ai tưởng spec đã viết sẵn. Ngoài ra khối đó **bỏ hai comment** có trong bản gốc
   `registry.ts:53` (`// Windows EPERM fallback: unlink target, then rename`) và
   `registry.ts:62` (`// Clean up tmp on unexpected errors`), và thêm từ khoá `export` cho
   module mới. Khi thực hiện, hãy chuyển **nguyên văn** từ `registry.ts:44-71` — kể cả
   hai comment đó — rồi thêm `export`; đừng dán khối trong "Hình dạng code".

3. **Giá trị `application` trong khối code_shape không nhất quán giữa hai method**
   (`"restart-required"` cho `setEnabled`, `"applied"` cho `deletePluginSetting`). Điều này
   không mâu thuẫn với chính nó — chúng là hai call site khác nhau — nhưng chúng **là**
   chính câu hỏi mở số 1 chưa có câu trả lời mặc định: không có quyết định nào được đặt ra
   ở đâu cả, và `"restart-required"` không có một tham chiếu nào trong repo để neo vào.
   **Chưa có mặc định — cần bạn quyết.**



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo neo — đọc trước khi gõ.** Mục này có **7 neo sai hoặc lệch**; các số dòng cũ trong mục này của kế hoạch **giữ nguyên theo luật bất di bất dịch**, nên bạn phải tự dịch sang số thật trước khi gõ:

1. `dirs.ts:652` (`getPluginsLockfile`) — **HỎNG, lệch 10 dòng**: hàm thật ở **662-664**; dòng 652 là `getPluginsNodeModules`.
2. `deletePluginSetting (954-961)` — lệch 1 ở cuối: `:954` là chữ ký, `:960` là dấu `}` đóng hàm, **961 là dòng trống kế tiếp**.
3. `plugin-config.test.ts:19-33` — lệch 1 ở **cả hai đầu**: mẫu thật là **20-34** (19 trống; 34 là `});` của `afterEach`).
4. `coding-agent/CHANGELOG.md` "đang rỗng, bắt đầu ở dòng 3" — **stale**: dòng 3 đúng, nhưng **KHÔNG rỗng** — dòng 5 `### Security` đã có entry MCP (thêm 2026-09-29).
5. Đính chính "Đếm là 0 ngay trên HEAD `808b365`" — **stale**: HEAD thật của cây này là **`47720fd`**.
6. "thứ mà `reloadPlugins` thật sự làm (`acp-agent.ts:2167`)" — dòng đúng, **tên hàm sai**: hàm bao quanh tên là `#reloadPluginState` (`acp-agent.ts:2163`).
7. Cổng (d) `git grep -n 'atomicWriteJson' -- packages/` — **gate chết**: hôm nay in **3 dòng**, sau refactor vẫn **3 dòng**; lệnh **luôn xanh** với bất kỳ trạng thái nào, không bao giờ phân biệt được. Đã viết lại ở mục *Cổng* bên dưới.

Hai neo lệch nữa do chính đính chính của kế hoạch: `atomicWriteJson` nằm ở `registry.ts:44-71` chứ không phải 44-70 (dòng 70 đóng `catch` bên trong, **71** là dấu ngoặc đóng hàm), và khối export wildcard của `packages/tui/package.json` nằm ở **94-97** chứ không phải 93-96.

**Còn lại ~30 neo đã đúng tuyệt đối** và dùng được nguyên trạng: `manager.ts:148-151` / `141-146` / `874-881` / `898-920` / `942-949` / `:906`; cả 9 dòng `:668, 724, 855, 880, 919, 948, 958, 1221, 1231`; `plugin-settings.ts:68, 72, 74, 75, 776, 786, 790, 823`; `registry.ts:44-71, 53, 62, 95, 128`; `file-lock.ts:1-6, 9, 70`; `marketplace/manager.ts:686, 728, 733, 906-908, 923-925, 1076, 1087, 1097, 1091-1097`; `plugin-cli.ts:761, 906, 917, 1038`; `natives/package.json:32`; `settings-selector.ts:1329`; `selector-controller.ts:305-312`.

**Điểm kế hoạch chưa trích mà kỹ sư cần:** `packages/coding-agent/src/extensibility/plugins/settings-host.ts:16` (`manager: new PluginManager(cwd),`) là **chỗ duy nhất** trong repo gán `PluginManager` vào trường kiểu `PluginSettingsManager` của tui — trôi hình dạng `ChangeResult` sẽ **nổ thành lỗi build** dưới `check:ts`. Ngoài ra: `file-lock.ts:32` (`getLockPath`), `file-lock.ts:26-29` (`retries: 50, retryDelayMs: 100` ⇒ ngân sách chờ ~5s), `utils/src/temp.ts:90` (`removeWithRetries`), `runtime-config.ts:4` (`normalizePluginRuntimeConfig`), `types.ts:141-146`, và `test/modes/components/plugin-list-marketplace.test.ts:150-154` (mock `setPluginEnabled` trả `Promise<void>` — sẽ **đỏ** nếu ai nới kiểu `setPluginEnabled`).

**Bảng điểm sửa**

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/plugins/manager.ts:148-151` | `#saveRuntimeConfig` | `async #saveRuntimeConfig(): Promise<void> {`<br>`		await this.#ensureConfigLoaded();`<br>`		await Bun.write(getPluginsLockfile(), JSON.stringify(this.#runtimeConfig, null, 2));`<br>`	}` | **xoá hẳn.** Thay bằng `#mutateConfig(mutate, application): Promise<ChangeResult>` — read-modify-write + diff + `atomicWriteJson`, **toàn bộ bên trong** `withFileLock(getPluginsLockfile(), …)` |
| `…/plugins/manager.ts` (mới, cạnh `#ensureConfigLoaded` 141-146) | `ChangeResult` (export) | *(không tồn tại — `git grep ChangeResult packages/` = 0 hit)* | `export interface ChangeResult { changed: boolean; application: "applied" \| "restart-required"; }` |
| `…/plugins/manager.ts:874-881` | `setEnabled` | `async setEnabled(name: string, enabled: boolean): Promise<void> {`<br>`		const config = await this.#ensureConfigLoaded();`<br>`		if (!config.plugins[name]) {`<br>``			throw new Error(`Plugin ${name} not found in runtime config`);``<br>`		}`<br>`		config.plugins[name].enabled = enabled;`<br>`		await this.#saveRuntimeConfig();`<br>`	}` | `Promise<ChangeResult>`; `config.plugins[name].enabled = enabled;` **chuyển vào trong** callback của `#mutateConfig` |
| `…/plugins/manager.ts:898-920` | `setEnabledFeatures` | `async setEnabledFeatures(name: string, features: string[] \| null): Promise<void> {` … `:906  const plugin = await this.getPlugin(name, { path: path.join(getPluginsNodeModules(), name) });` … `:918  config.plugins[name].enabledFeatures = features;` `:919  await this.#saveRuntimeConfig();` | `Promise<ChangeResult>`. **`:906` gọi `getPlugin` TRƯỚC, ngoài khoá**, kết quả `plugin` đóng lại trong scope rồi truyền vào callback — không giữ OS lock qua I/O đọc manifest |
| `…/plugins/manager.ts:942-949` | `setPluginSetting` | `async setPluginSetting(name: string, key: string, value: unknown): Promise<void> {`<br>`		const config = await this.#ensureConfigLoaded();`<br>`		if (!config.settings[name]) {`<br>`			config.settings[name] = {};`<br>`		}`<br>`		config.settings[name][key] = value;`<br>`		await this.#saveRuntimeConfig();`<br>`	}` | `Promise<ChangeResult>`; mutation vào trong callback. **ĐÂY LÀ DẢI MÀ M3-A4 CŨNG VIẾT LẠI** — phải cùng PR hoặc thứ tự merge tường minh |
| `…/plugins/manager.ts:954-960` | `deletePluginSetting` | `…`<br>`		if (config.settings[name]) {`<br>`			delete config.settings[name][key];`<br>`			await this.#saveRuntimeConfig();`<br>`		}`<br>`	}` | `Promise<ChangeResult>`. **Bỏ chặn `if (config.settings[name])`** — khoá vắng tự sinh `changed:false` qua diff thay vì qua nhánh |
| `…/plugins/manager.ts:668, 724, 855, 958, 1221, 1231` | `install` / `uninstall` / `link` / `deletePluginSetting` / `#removeInvalidFeature` / `#removeOrphanedConfig` | `await this.#saveRuntimeConfig();` (6 dòng, nguyên văn giống hệt nhau) | `await this.#mutateConfig(config => { …mutation… }, "…");` |
| `…/plugins/manager.ts:880, 919, 948` | ba mutator công khai còn lại | `await this.#saveRuntimeConfig();` | như dòng trên |
| `…/plugins/marketplace/registry.ts:44-71` | `atomicWriteJson` (local) | nguyên văn 28 dòng, `async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {` … ``const tmpPath = `${filePath}.tmp`;`` … `// Windows EPERM fallback: unlink target, then rename` … `// Clean up tmp on unexpected errors` … `}` | **xoá khỏi registry.ts**, chuyển **nguyên văn** sang `packages/utils/src/atomic-write.ts` + thêm chữ `export`. Hai comment ở `registry.ts:53` và `:62` **phải đi theo** |
| `…/plugins/marketplace/registry.ts:95, 128` | `writeMarketplacesRegistry` / `writeInstalledPluginsRegistry` | `await atomicWriteJson(filePath, reg);` | giữ nguyên chữ ký; chỉ đổi import sang `@oh-my-pi/pi-utils` |
| `packages/utils/src/atomic-write.ts` | `atomicWriteJson` (mới) | *(file chưa tồn tại)* | `export async function atomicWriteJson(filePath: string, data: unknown): Promise<void>` — chuyển nguyên văn từ dòng trên |
| `packages/utils/src/index.ts` (chèn sau dòng 2) | barrel | dòng 2 = `export * from "./async";`, dòng 3 = `export * from "./binary";` | chèn `export * from "./atomic-write";` giữa hai dòng đó. Dòng 9 **đã có** `export * from "./file-lock";` — không cần đụng |
| `…/plugins/marketplace/manager.ts:923-925` | `#writeRuntimeConfig` | `async #writeRuntimeConfig(scope: "user" \| "project", config: PluginRuntimeConfig): Promise<void> {`<br>`		await Bun.write(this.#runtimeLockPath(scope), JSON.stringify(config, null, 2));`<br>`	}` | nhận `mutate` callback, đọc lại **bên trong** `withFileLock(this.#runtimeLockPath(scope), …)`, ghi bằng `atomicWriteJson`. **Đây là writer thứ hai của cùng một file lockfile** |
| `…/plugins/marketplace/manager.ts:1076, 1087, 1097` | `#registerRuntimePlugin` / `#removeRuntimePlugin` / `#setRuntimePluginEnabled` | `await this.#writeRuntimeConfig(scope, config);` (3 dòng) | truyền mutation vào, không truyền object đã mutate sẵn |
| `packages/tui/src/overlays/plugin-settings.ts:72` | `PluginSettingsManager.setEnabled` | `	setEnabled(name: string, enabled: boolean): Promise<void>;` | `Promise<ChangeResult>` |
| `…/plugin-settings.ts:74` | `PluginSettingsManager.setEnabledFeatures` | `	setEnabledFeatures(name: string, features: string[] \| null): Promise<void>;` | `Promise<ChangeResult>` |
| `…/plugin-settings.ts:75` | `PluginSettingsManager.setPluginSetting` | `	setPluginSetting(name: string, key: string, value: unknown): Promise<void>;` | `Promise<ChangeResult>` |
| `…/plugin-settings.ts:776, 786, 790, 823` | 4 call site overlay | `await this.#manager.setEnabled(plugin.name, enabled);`<br>`await this.#manager.setEnabledFeatures(plugin.name, [...current]);`<br>`await this.#manager.setPluginSetting(plugin.name, key, value);`<br>`await this.#manager.setPluginSetting(pluginName, key, value);` | `const r = await …;` rồi dùng `r` (bật/tắt trên UI, hoặc `onPluginChanged` mang theo kết quả) |
| `packages/coding-agent/src/cli/plugin-cli.ts:761` | `setEnabledFeatures` cmd | `await manager.setEnabledFeatures(pluginName, [...currentFeatures]);` | `const r = await …;` + in dòng `application` |
| `…/plugin-cli.ts:906` | `setPluginSetting` cmd | `await manager.setPluginSetting(pluginName, key, value);` | như trên |
| `…/plugin-cli.ts:917` | `deletePluginSetting` cmd | `await manager.deletePluginSetting(pluginName, key);` | như trên |
| `…/plugin-cli.ts:1038` | `setEnabled` cmd | `await manager.setEnabled(name, enabled);` | như trên |
| `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` | test mới | *(file chưa tồn tại)* | xem mục *Hợp đồng test* |
| 3 file `CHANGELOG.md` | — | — | **KHÔNG sửa trong PR này** (mục §6.2 của kế hoạch cấm). Chỉ đánh dấu. |

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc, không phải số trong kế hoạch)

0. **Dựng native addon — tiền đề cứng.** `brew install ninja` rồi `bun --cwd=packages/natives run build`. Neo `packages/natives/package.json:32` → `"build": "bun ../../scripts/bazel-natives.ts host --dest native"`. Vì sao cứng: `withFileLock` import `FileLock` từ addon ở `packages/utils/src/file-lock.ts:9` (`import { FileLock as NativeFileLock } from "@oh-my-pi/pi-natives";`) — không có addon thì **mọi** test chạm lock chết ngay ở bước import.
1. **Tạo `packages/utils/src/atomic-write.ts` + nối barrel.** Nguồn `registry.ts:44-71` (28 dòng): `:44` `async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {`, `:45` nội dung, `:46` ``const tmpPath = `${filePath}.tmp`;``, `:53` comment Windows EPERM, `:54` `if ((err as NodeJS.ErrnoException).code === "EPERM") {`, `:62` comment dọn tmp. Chuyển **nguyên văn** kể cả hai comment, thêm `export`. Barrel: `packages/utils/src/index.ts:2` `export * from "./async";` · `:3` `export * from "./binary";` — chèn giữa. Sau đó xoá `registry.ts:44-71`, và `registry.ts:95` + `:128` import từ `@oh-my-pi/pi-utils`.
2. **Thêm `ChangeResult` + `#mutateConfig`, xoá `#saveRuntimeConfig`** (`manager.ts:148-151`). Neo đọc lại: `manager.ts:141-146` `#ensureConfigLoaded` — nó **memoize** `this.#runtimeConfig` (`:142-143`), đó là lý do phải dùng `#loadRuntimeConfig()` (`:137-139`, đọc `#readRuntimeConfigAt(getPluginsLockfile())`) **bên trong** khoá chứ không dùng `#ensureConfigLoaded()`. Import `withFileLock` + `atomicWriteJson` từ `@oh-my-pi/pi-utils` **top level** — `manager.ts:6` (`getPluginsLockfile`) và `:13` (`} from "@oh-my-pi/pi-utils";`) đã có sẵn khối import, chỉ thêm tên vào.
3. **Chuyển bốn mutator công khai**: `:874-881` (`setEnabled`), `:898-920` (`setEnabledFeatures`), `:942-949` (`setPluginSetting`), `:954-960` (`deletePluginSetting`). Điểm duy nhất cần suy nghĩ là `:906` `const plugin = await this.getPlugin(name, { path: path.join(getPluginsNodeModules(), name) });` → gọi **trước**, ngoài khoá, rồi truyền `plugin` vào closure. Không đổi chữ ký `#mutateConfig` thành async.
4. **Chuyển năm writer còn lại**: `:668` install, `:724` uninstall, `:855` link, `:958` deletePluginSetting (dòng save bên trong nhánh), `:1221` `#removeInvalidFeature` và `:1231` `#removeOrphanedConfig` (cả hai đã trả `Promise<boolean>` — **giữ** boolean, trả `ChangeResult` bên cạnh).
5. **Khoá writer thứ hai: `MarketplaceManager.#writeRuntimeConfig`** (`:923-925`), ba call site `:1076`, `:1087`, `:1097`. Đã chạy chuỗi phân giải đường dẫn, xác nhận là **cùng một file**: `getPluginsLockfile()` = `path.join(getPluginsDir(), "omp-plugins.lock.json")` (`dirs.ts:662-664`); `#runtimeLockPath("user")` = `path.join(#runtimeRoot("user"), "omp-plugins.lock.json")` (`marketplace/manager.ts:906-908`) ⇒ cùng ra `~/.omp/plugins/omp-plugins.lock.json`. Còn hai writer của nó: `:728` (`writeInstalledPluginsRegistry` — registry, **không** khoá) và `:733` → `:1091-1097` (`#setRuntimePluginEnabled` → `#writeRuntimeConfig` — **lockfile, phải khoá**).
6. **Nới `PluginSettingsManager` ở tui**: `plugin-settings.ts:68` (interface), `:72`, `:74`, `:75` (ba mutator), call site `:776`, `:786`, `:790`, `:823`. Nếu tui không import được kiểu từ coding-agent (chiều phụ thuộc chạy ngược), **khai báo `ChangeResult` trong tui** và để `PluginManager` thoả mãn nó có cấu trúc — kiểu phải được **một** khai báo, không phải hai bản gần giống.
7. **Bốn lệnh CLI hành xử theo kết quả**: `plugin-cli.ts:761`, `:906`, `:917`, `:1038`. Hiện đều là `await manager.x(…)` trần.
8. **Viết test** — xem mục *Hợp đồng test*.
9. **Hoà giải với M3-A4**: dải `setPluginSetting` `manager.ts:942-949` là giao điểm. Chọn cùng PR, hoặc thứ tự merge tường minh.

**Hợp đồng test**

**File:** `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` (mới — `ls` xác nhận chưa tồn tại).

**Cách cô lập (bắt buộc)** — lấy nguyên mẫu từ `packages/coding-agent/test/plugin-config.test.ts:20-34`:
`beforeEach` tạo `fs.mkdtemp(path.join(os.tmpdir(), "omp-…"))`, rồi `spyOn` bốn hàm: `getPluginsDir`, `getPluginsLockfile`, `getProjectDir`, `getProjectPluginOverridesPath`. `afterEach`: `mock.restore();` + `await removeWithRetries(tmpRoot)`. `removeWithRetries` xuất phát từ `packages/utils/src/temp.ts:90`. `spyOn` bắt buộc vì `PluginManager.#loadRuntimeConfig()` (`manager.ts:137-139`) gọi `getPluginsLockfile()` — đường dẫn **toàn cục**, không gốc cwd (`manager.ts:119` `constructor(cwd: string = getProjectDir())` chỉ dùng cho project overrides).

| # | Case | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| 1 | Hai instance `PluginManager` độc lập, **cùng** lockfile đã spy, `setEnabled` chạy đồng thời (`Promise.all`) → JSON trên đĩa chứa **cả hai** plugin ở trạng thái mới | Một lần bật plugin **tự biến mất** — đúng thất bại đã sinh ra M4-4 |
| 2 | **Negative control (bắt buộc).** Cùng kịch bản (1) nhưng bằng thuật toán **trước khi sửa**: đọc JSON → mutate → `Bun.write` trần, **không khoá**. Assert file chỉ chứa **một** trong hai thay đổi | Không có case này thì case (1) chứng minh **không điều gì** — xanh trên cả code chưa sửa |
| 3 | `setEnabled` với giá trị đang có → `changed:false`, **byte trên đĩa không đổi** | `changed` trở thành cờ trong bộ nhớ, vô nghĩa |
| 4 | `deletePluginSetting` trên khoá vắng → `changed:false` | Nhánh "không có gì để xoá" ghi file rác |
| 5 | `setEnabled("không-có")` → reject `/not found in runtime config/` **và file không đổi** | Lời gọi hỏng làm hỏng lockfile — lỗi ném phải xảy ra **trước** mọi lệnh ghi, tức là bên trong khoá |
| 6 | `setEnabled` trả `application: 'restart-required'` | Trường `application` không bao giờ được đặt |
| 7 | `atomicWriteJson` không để lại `.tmp`; output parse được, có `\n` cuối | File tạm orphan; JSON hỏng |
| 8 | `MarketplaceManager.#writeRuntimeConfig` cũng đi qua khoá (nếu bước 5 đã làm) | Writer thứ hai vẫn đè mất — hiệu ứng "không còn writer thứ hai" là **sai** |

**Cố tình KHÔNG test:** nhánh EPERM trên Windows (không tái hiện được trên darwin-arm64, không giả lập được; nói thẳng là chưa test). Không test constructor. Không source-grep `manager.ts` để chứng minh refactor.

**Coi chừng:** `withFileLock` mặc định `retries: 50, retryDelayMs: 100` (`file-lock.ts:26-29`) → chờ tối đa ~5s. Test tranh chấp phải hoàn tất trong ngân sách đó, nếu không nó fail vì hết giờ chờ chứ không vì mất update.

**Hai file test phải giữ xanh:** `packages/utils/test/file-lock.test.ts` (đo hôm nay: **4 pass / 0 fail**) và `packages/coding-agent/test/plugin-config.test.ts` (đo hôm nay: **7 pass / 0 fail**).

**Cổng có đỏ được không — có, nhưng chỉ 2 trong 6 bước thật sự là cổng: (b) và (f).** Bốn bước còn lại hoặc xanh sẵn, hoặc không đo được thứ nó tưởng đo.

- **(a)** `bun test packages/utils/test/file-lock.test.ts` → hôm nay **4 pass / 0 fail**. ĐỎ ĐƯỢC, nhưng đây là *lưới an toàn*, **không phải cổng**: nó xanh khi **chưa làm gì cả**.
- **(b)** `bun test packages/coding-agent/test/plugin-runtime-config-lock.test.ts` → hôm nay **ĐỎ** (`The following filters did not match any test files`). **ĐỎ ĐƯỢC, đúng nghĩa.**
- **(c)** `git grep -n 'saveRuntimeConfig' -- packages/` → hôm nay **10 hit**. Đỏ được, nhưng **yếu**: ai đó chỉ cần **đổi tên** `#saveRuntimeConfig` thay vì xoá nó là grep vẫn xanh trong khi ổ khoá đã biến mất im lặng. **Viết lại thành hai grep chống-đổi-tên** — chúng bắt đúng thứ quan trọng (lệnh ghi trần **không khoá** vào lockfile), không quan tâm tên hàm:
  ```bash
  git grep -n 'Bun.write(getPluginsLockfile' -- packages/            # hôm nay: 1 hit  @ manager.ts:150
  git grep -n 'Bun.write(this.#runtimeLockPath' -- packages/         # hôm nay: 1 hit  @ marketplace/manager.ts:924
  ```
- **(d)** `git grep -n 'atomicWriteJson' -- packages/` — **LỆNH NÀY KHÔNG BAO GIỜ ĐÁNH GIÁ ĐƯỢC CỔNG.** Nó in 3 dòng hôm nay (1 định nghĩa ở `registry.ts:44` + 2 call site ở `:95`, `:128`) và sẽ in **3 dòng sau khi refactor** (1 định nghĩa ở `packages/utils/src/atomic-write.ts` + 2 call site vẫn ở `registry.ts`). `git grep -n` không phân biệt "định nghĩa" với "call site", nên lệnh **luôn xanh**. **Viết lại thành đếm ĐỊNH NGHĨA:**
  ```bash
  git grep -n 'async function atomicWriteJson' -- packages/          # phải đúng 1 dòng, trong packages/utils/
  test "$(git grep -c 'async function atomicWriteJson' -- packages/utils/ | cut -d: -f2)" = 1 \
    && echo "PASS: đúng 1 định nghĩa, ở packages/utils" || echo "FAIL"
  ```
  Đo thật hôm nay: lệnh in ra **đúng 1 dòng, ở `registry.ts:44`**, còn `git grep -c … -- packages/utils/` không khớp ⇒ in **`FAIL`**. Nó **đỏ hôm nay** vì vị trí sai, đỏ lại nếu ai chép thêm một bản, và xanh đúng khi bản duy nhất nằm trong `packages/utils`.
- **(e)** `grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts` → in ra `0`, **xanh sẵn ở baseline**. Nó canh hồi quy tương lai, **không** chứng minh M3-A4 đã land. Giữ, nhưng ghi nó là guard của M3 mà PR này không được phá. Giữ nguyên `grep -c` (GNU), **không** dùng `git grep -c` (in rỗng khi không match, không phân biệt pass với sai lệnh).
- **(f)** `bun run check:ts` → hôm nay **exit 0**. **ĐỎ ĐƯỢC — cổng thật.**

**Bổ sung bắt buộc mà kế hoạch nói nhưng không viết thành lệnh** — chứng minh cổng có răng:
```bash
# (b+) — xoá withFileLock khỏi #mutateConfig → phải ĐỎ. Sửa lại → phải xanh lại.
#       Không làm hai bước này thì (b) chưa từng thấy đỏ.
```
Một cổng chưa từng thấy đỏ thì không phải cổng.

**Cổng hoàn thành, đúng thứ tự bắt buộc:**
```bash
brew install ninja                                                    # 0: tiền đề
bun --cwd=packages/natives run build                                  # 0
bun test packages/utils/test/file-lock.test.ts                         # (a) 4 pass / 0 fail
bun test packages/coding-agent/test/plugin-runtime-config-lock.test.ts # (b) mới, xanh
bun test packages/coding-agent/test/plugin-config.test.ts              # 7 pass / 0 fail
git grep -n 'Bun.write(getPluginsLockfile' -- packages/               # (c) 0 hit
git grep -n 'Bun.write(this.#runtimeLockPath' -- packages/            # (c) 0 hit
# (d) đếm định nghĩa atomicWriteJson → 1, trong packages/utils/
grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts | grep -qx 0 && echo PASS || echo FAIL   # (e)
bun run check:ts                                                       # (f) exit 0
```

**Lệch chủ ý với AGENTS.md:** AGENTS.md nói "always `bun check`". Kế hoạch dùng `bun run check:ts`. **Kế hoạch đúng** — `package.json:89` cho thấy `"check": "bun run --parallel check:ts check:rs"`, mà Rust là toolchain riêng, không thuộc item này. Ghi vào PR để reviewer không tưởng bạn phớt lờ rule.

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: bọc khoá quanh `#saveRuntimeConfig` làm rơi 100% lệnh ghi.** Đây là cách sai **đúng chữ** của kế hoạch, và nó **không đỏ** ở bất kỳ cổng nào trong danh sách cũ. Cả chín call site mutate `this.#runtimeConfig` đã memoize **trước** khi gọi save — `manager.ts:874-881`: dòng `:874` chữ ký, `:875` `const config = await this.#ensureConfigLoaded();`, `:876` `if (!config.plugins[name]) { … }`, `:879` `config.plugins[name].enabled = enabled;` (**mutate ĐÃ xong, NGOÀI khoá**), `:880` `await this.#saveRuntimeConfig();`. Bọc `withFileLock` quanh `save` + đọc lại bên trong khoá ⇒ lần đọc lại **đè mất** mutation vừa áp. Kết quả: khoá tuần tự hoá hoàn hảo, mọi test có thể xanh, và **100% lệnh ghi rơi âm thầm trong production**. Mutation **phải** là callback ở trong phần khoá. Không có cách nào bọc khoá quanh lệnh save sẵn có mà giữ call site.
2. **`changed` là cờ trong bộ nhớ thì vô nghĩa.** `return changed` từ setter làm mọi test xanh và trường trở nên vô nghĩa. `changed` **phải** là diff quan sát trên đĩa: `JSON.stringify` trước/sau, so sánh trong khoá. Case 3 ở trên là hàng phòng thủ.
3. **Test một instance thì xanh trên cả code chưa sửa.** `#ensureConfigLoaded` (`manager.ts:141-146`) memoize theo từng instance, nên hai lệnh `setEnabled` trên **một** instance mutate cùng một object và lần ghi thứ hai tất yếu chứa cả hai thay đổi **ngay cả khi xoá hẳn khoá đi**. **Bắt buộc hai instance.**
4. **`mock.module()` bị cấm, và vá lớp cũng là cùng loại nói dời.** AGENTS.md cấm `mock.module()` hoàn toàn (rò rỉ registry toàn cục). Negative control phải là **bản cài lại nội tuyến**: đọc JSON → mutate → `Bun.write` trần, ghi đúng byte xuống đúng lockfile đã spy. Không vá `PluginManager` để tự bỏ khoá.
5. **`atomicWriteJson` dùng hậu tố `.tmp` cố định.** `registry.ts:46` → ``const tmpPath = `${filePath}.tmp`;``. Tên tạm dùng chung chỉ an toàn khi **mọi** writer của một file cùng lấy cùng một khoá. Sau M4-4 đúng với lockfile; **không** đúng với hai marketplace registry (`:728` và tương tự) vì chúng không khoá. `packages/ai/src/auth-broker/snapshot-cache.ts:93` dùng dạng cứng hoá ``const tmpPath = `${opts.path}.${process.pid}.${randomHex(8)}.tmp`;``. **Câu hỏi mở — quyết trước khi tiện ích này thành trung tâm.**
6. **`application` chưa có mặc định, và cặp nhị phân không diễn tả được hiện thực.** `git grep 'restart-required' -- packages/` → **0 hit**. Đường overlay chỉ reload **MỘT PHẦN**: `settings-selector.ts:1329` → `selector-controller.ts:305-312` gọi `clearPluginRootsAndCaches` (`:307`), `refreshSkillState` (`:308`), `refreshSlashCommandState` (`:309`), `resetCapabilities` (`:310`) — và **không** gọi `refreshAgentDiscovery`, thứ reload thật làm tại `acp-agent.ts:2167`. Trung thực phải nói là "áp dụng một phần", mà `"applied" | "restart-required"` **không** diễn tả được. **Chưa có mặc định — cần người quyết.**
7. **Đừng để dải `setPluginSetting` 942-949 bị hai bản vá âm thầm huỷ.** M3-A4 viết lại **đúng** dải này. Hai bản vá độc lập trên cùng dải → một trong hai biến mất không báo. Hoặc cùng PR, hoặc thứ tự merge tường minh.
8. **Nới kiểu `setPluginEnabled` là breaking change ĐỘC LẬP.** `PluginSettingsMarketplaceManager.setPluginEnabled` (`plugin-settings.ts:81`) do `MarketplaceManager` (`marketplace/manager.ts:686`) thực hiện — nó **khác lớp, khác file**, nhưng vẫn ghi CHUNG lockfile. Nếu nới kiểu nó, `packages/coding-agent/test/modes/components/plugin-list-marketplace.test.ts:150-154` (`spyOn(MarketplaceManager.prototype, "setPluginEnabled").mockImplementation(async … => {})` trả `Promise<void>`) **sẽ đỏ**. Đó là breaking change có sức nặng changelog riêng — **không** gộp vào PR này nếu chưa quyết.

---


## M4-6. Chặn ghi `settings` theo provenance (sóng B, merge với M4-4)

**Sóng:** M4 Wave B — `shippable: false`, merge với M4-4, một lượt review, một cổng changelog
**Effort:** M
**Phụ thuộc:** M2 WI-8a và WI-8b (chưa kiểm chứng — M2 chưa thực thi); M4-4 phải nằm trong cùng một PR hoặc có thứ tự merge tường minh; `ChangeResult` của M4-4 là tiền lệ hình dạng cho `SettingsWriteResult`.

Một câu tóm tắt: khi bạn đổi một setting trong panel `/settings` mà vẫn còn một project config, một overlay `--config`, một runtime override hoặc một biến môi trường đang cấp giá trị có hiệu lực, panel giờ nói rõ lớp nào đang che và giá trị chết đó không bao giờ được ghi vào `config.yml` global của bạn. Setting không bị che thì hành vi y hệt trước đây — `/settings` không bị brick với bất kỳ ai.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/tui/src/overlays/settings-defs.ts` | sửa | Thêm union type `SettingsProvenance` được export và một thành viên `provenance(path: string): SettingsProvenance` trên interface `SettingsHost` (hiện ở dòng 131-142). | Có |
| `packages/tui/src/overlays/settings-selector.ts` | sửa | Đưa cả 13 chỗ gọi về qua một helper mới `#writeSetting(host, path, value)` — 11 chỗ `this.#context.settings.set(` trên `SettingsSelectorComponent` và 2 chỗ `this.#settings.set(` trên `ProviderLimitsSubmenu`. Helper gọi `host.set(...)` chứ không gọi `settings.set(...)`, nên sau khi sửa không còn dòng `settings.set(` nào trong file — nhờ vậy cổng (1) vẫn là một lệnh đơn trung thực. | Có |
| `packages/coding-agent/src/config/shadowing.ts` | tạo | Module dùng chung mới, export `globalLayerValue(setting, scope)` và `shadowingSource(setting, scope)`, nhấc lên từ `config-cli.ts` để CLI và settings host dùng chung một cách hiện thông báo thứ bậc. | Có |
| `packages/coding-agent/src/cli/config-cli.ts` | sửa | Xoá `globalValue` cục bộ (dòng 318-322) và `shadowingSource` cục bộ (dòng 325-360), import cả hai từ `../config/shadowing`, truyền `settings` làm tham số scope. Hành vi của `omp config set` phải giống hệt từng byte. | Có |
| `packages/coding-agent/src/config/settings-ui.ts` | sửa | Cài `provenance: path => resolve(path).provenance(settings)` trên host object (`createSettingsHost`, dòng 51-82); cài chốt chặn sau-ghi bên trong `set`; nới kiểu trả về của `set` thành `SettingsWriteResult`. | Có |
| `packages/coding-agent/test/config/settings-provenance-guard.test.ts` | tạo | File test mới: mỗi lớp che thực sự khác nhau một test (project / env / overlay / runtime), cộng một test đối chứng không-che, cộng một khẳng định rollback trên đĩa. | Có |

Ghi chú kiểm chứng:

- Dòng 131 của `settings-defs.ts` là `export interface SettingsHost {`, dòng 141 là thành viên cuối (`validateProviderLimits`) — khoảng 131-142 của plan là chính xác. `tui` sở hữu kiểu này vì `tui` không import được từ `coding-agent`; `SettingsProvenance` buộc phải soi `SettingProvenance` ở `packages/coding-agent/src/config/settings.ts:62` (cùng 6 thành viên: `"env" | "runtime" | "overlay" | "project" | "global" | "default"`).
- 13 chỗ gọi trong `settings-selector.ts` đã xác nhận bằng `grep -n 'settings\.set('`: dòng 349, 393, 876, 879, 1162, 1200, 1202, 1216, 1218, 1220, 1222, 1251, 1258. Danh sách dòng của plan (346, 390, 869, 872, 1155, 1193, 1195, 1209, 1211, 1213, 1215, 1244, 1251) cũ nhưng **con số 13 là đúng**. File này là chỗ gọi `SettingsHost.set` DUY NHẤT trong toàn bộ `packages/tui` — đó chính là lý do helper có thể dồn về một nguồn.
- Module mới `shadowing.ts` nằm trong `coding-agent` và chỉ được `config-cli.ts` cùng `settings-ui.ts` dùng. **Không** import từ `coding-agent` vào `tui`. 13 chỗ gọi vẫn đi qua interface `SettingsHost`, không bao giờ gọi module này trực tiếp.
- `globalValue` (dòng 318) và `shadowingSource` (dòng 325) trong `config-cli.ts` đều là module-private — không nằm trong danh sách export (`ConfigAction`, `ConfigCommandArgs`, `parseConfigArgs`, `runConfigCommand`, `printConfigHelp`). `shadowingSource` kéo dài 325-360, **không phải** 325-357 như plan nói. Chỗ gọi duy nhất của `shadowingSource` là dòng 307 bên trong `handleSet`; `globalValue` có chỗ gọi riêng của nó ở dòng 306.
- `createSettingsHost` ở dòng 51 và `envNote` ở dòng 39-44 đều đúng như plan. Host object literal ở dòng 74-81; `set: (path, value) => resolve(path).set(settings, value)` là dòng 77.
- File test mới soi theo cấu trúc của `packages/coding-agent/test/config/settings-panel-clear.test.ts` sẵn có, vốn đã chạy `SettingsSelectorComponent` thật qua `handleInput` và khẳng định trên byte của `config.yml` trên đĩa. Dùng `beginSettingsTest` / `restoreSettingsTestState` từ `test/helpers/settings-test-state.ts`.

### Các bước

1. Tạo `packages/coding-agent/src/config/shadowing.ts`. Chuyển `globalValue` (`config-cli.ts:318-322`) vào đó, đổi tên thành `globalLayerValue`; chuyển `shadowingSource` (`config-cli.ts:325-360`) vào đó, giữ nguyên thân hàm. Cho CẢ HAI nhận tham số tường minh `scope: Settings` thay vì đóng trên proxy module `settings` — `globalLayerValue` đọc `scope.getGlobalSettings()`, `shadowingSource` gọi `setting.provenance(scope)`. Re-export kiểu `SettingProvenance` từ `./settings` để phía gọi không phải import thêm một lần nữa. Giữ nguyên từng chuỗi thông báo — đầu ra của CLI là thứ người dùng đọc và đã được phát hành. **Không đổi tên `json`.** Hàm thật trả `{ json: Record<string, string>; message: string }` (`config-cli.ts:325`) và `config-cli.ts:310` spread `...shadow?.json` thẳng vào output của `omp config set --json` — đó là hợp đồng đã phát hành. Thêm trường `source` CẠNH `json`, đừng thay nó: nếu thay, `bun run check:ts` vẫn xanh (kiểu trả về đổi đồng bộ ở cả hai nơi) trong khi script bên ngoài mất hẳn trường `overriddenBy`/`fallbackEnv`, phá vỡ chính yêu cầu byte-identical của hàng này. Neo: `packages/coding-agent/src/cli/config-cli.ts:318`.

2. Trong `config-cli.ts`, xoá cả hai hàm cục bộ và thêm import top-level `import { globalLayerValue, shadowingSource } from "../config/shadowing";`. Cập nhật hai chỗ gọi bên trong `handleSet` (hiện ở dòng 307) để truyền `settings` làm tham số thứ hai/thứ ba. Chạy `bun run check:ts` và phải sạch — đây là một cú di chuyển thuần, nên bất kỳ lỗi nào ở đây nghĩa là phần rút code không trung thành. Neo: `packages/coding-agent/src/cli/config-cli.ts:307`.

3. Trong `settings-defs.ts`, ngay phía trên interface `SettingsHost`, thêm `export type SettingsProvenance = "env" | "runtime" | "overlay" | "project" | "global" | "default";` và thêm `provenance(path: string): SettingsProvenance;` vào interface, kèm doc comment giải thích thứ tự: runtime override → overlay `--config` → project → global → schema default, với env được kiểm tra trước nên chỉ đi qua method này. Neo: `packages/tui/src/overlays/settings-defs.ts:131`.

4. Trong `settings-ui.ts`, nới `set` để trả về một kết quả. Định nghĩa và export `SettingsWriteResult` là một discriminated union: `{ status: "applied" } | { status: "shadowed"; source: Exclude<SettingsProvenance, "global" | "default">; message: string }`. Kiểu `source` hẹp là điểm cốt lõi của thay đổi này — nó làm cho nhánh rollback và nhánh UI trở nên exhaustive. Neo: `packages/coding-agent/src/config/settings-ui.ts:77`.

5. Cài chốt chặn trong `set` của `createSettingsHost` (dòng 77), đúng thứ tự này: (1) `const previous = globalLayerValue(setting, settings);` — `undefined` nghĩa là khoá chưa tồn tại trong lớp global; (2) `setting.set(settings, value);`; (3) đọc lại thứ thực sự đã đáp xuống sau khi chuẩn hoá qua `const written = globalLayerValue(setting, settings);` và giá trị có hiệu lực qua `const effective = setting.get(settings);`, rồi `const shadow = shadowingSource(setting, settings);` — (4) trả sớm `{ status: "applied" }` khi `shadow` là undefined HOẶC khi `Bun.deepEquals(effective, written)`, vì một lớp cao hơn giữ đúng giá trị đó không phải là che thật. Nếu không thì rollback: `previous === undefined ? setting.unset(settings) : setting.set(settings, previous);` và trả `{ status: "shadowed", source: shadow source, message: shadow.message }`. Neo: `packages/coding-agent/src/config/settings-ui.ts:77`.

6. Thêm `provenance: path => resolve(path).provenance(settings)` vào host object literal. Kiểu trả về khai báo của `SettingsHost.provenance` chính là thứ ép cả hai vế phải soi nhau: nếu `SettingProvenance` của coding-agent từng có thêm một thành viên, arrow function này sẽ ngừng type-check và `bun run check:ts` sẽ đỏ. Đó chính là chốt chặn trôi dạng — đừng thêm assertion runtime nào đè lên. Neo: `packages/coding-agent/src/config/settings-ui.ts:74`.

7. Trong `settings-selector.ts`, thêm `#writeSetting(host: SettingsHost, path: string, value: unknown): boolean` và gọi `host.set(path, value)` — nhận `host` làm tham số, KHÔNG bắt dính vào `this.#context`, để thân helper không chứa chuỗi `settings.set(` và cổng (1) ở bước 9 còn trung thực. Khi `status === "shadowed"` thì hiện `message` qua affordance lỗi/trạng thái nội tuyến mà component đã có, trả false; còn lại trả true. Rồi thay cả 13 chỗ gọi — dòng 349, 393, 876, 879, 1162, 1200, 1202, 1216, 1218, 1220, 1222, 1251, 1258 — bằng `#writeSetting(...)`, truyền đúng host của từng chỗ gọi. Neo: `packages/tui/src/overlays/settings-selector.ts:349`.

8. Hai chỗ của `ProviderLimitsSubmenu` (349 và 393) dùng `this.#settings` — một trường `SettingsHost` riêng trên class đó (khai ở dòng 294, class bắt đầu ở 292), KHÔNG phải `this.#context.settings` của `SettingsSelectorComponent` (dòng 520, class bắt đầu ở 498). Vì `#writeSetting` đã nhận host làm tham số ở bước 7, nhánh này được chốt sẵn: cho `ProviderLimitsSubmenu` một bản `#writeSetting` riêng trên class đó, gọi `this.#writeSetting(this.#settings, ...)` ở cả hai chỗ. Đừng lặng lẽ bỏ rơi hai lần ghi đó, chúng là đường đặt giá trị và dễ sót nhất. Neo: `packages/tui/src/overlays/settings-selector.ts:349`.

9. Chạy `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` — nó phải in ra 0. Điều kiện để con số 0 là thật chính là hình dạng helper ở bước 7: `#writeSetting` nhận `host` làm tham số và gọi `host.set(...)`, **không** viết `this.#context.settings.set(...)` trong thân nó. Nếu bạn viết thân helper theo kiểu đó thì dòng đó tự khớp regex và cổng in ra 1 dù bạn đã làm đúng mọi thứ — đó là lý do bước 7 chốt phải nhận host làm tham số chứ không bắt dính vào `#context`. Bất kỳ giá trị khác 0 nghĩa là bước 7 đã bỏ sót chỗ và chốt chặn có lỗ hổng. Neo: `packages/tui/src/overlays/settings-selector.ts`.

10. Khái quát hoá `envNote` (`settings-ui.ts:39-44`) thành một `provenanceNote(setting)` nối thêm vào phần mô tả cho MỌI lớp che, không riêng env, tái dùng đúng chuỗi thông báo của `shadowingSource` đã rút lên để panel và `omp config set` nói cùng một cách. Đây là thứ làm cho cái bóng hiện ra TRƯỚC khi người dùng ghi, và là bản vá cho lỗ hổng mà plan chỉ ra. Giữ nguyên cách diễn đạt riêng của envNote cho trường hợp env — nó đã phát hành và người dùng đã quen. Neo: `packages/coding-agent/src/config/settings-ui.ts:39`.

11. Viết `packages/coding-agent/test/config/settings-provenance-guard.test.ts` — xem mục hợp đồng test bên dưới. Neo: `packages/coding-agent/test/config/settings-panel-clear.test.ts`.

12. KHÔNG thêm mục changelog. Sóng B là `shippable: false` (plan §6.2 — dòng 11435 nêu ánh xạ sang Wave B, dòng 11437 là quy tắc một câu, dòng 11441 xác nhận Wave B/C/D đều `false`) và đang bị chặn sau một quyết định changelog M4 duy nhất chưa được đưa ra (plan dòng 11638, hạn trước khi Wave B mở PR). Cả hai mục `[Unreleased]` giữ nguyên. Ghi hình dạng thay đổi này vào phần thân PR. Neo: `packages/coding-agent/CHANGELOG.md:3`.

### Hình dạng code

```typescript
// packages/coding-agent/src/config/shadowing.ts  (lifted, scope made explicit)
import type { Settings, SettingProvenance } from "./settings";
import { type AnySetting } from "./registry";

/** Value `setting` holds in the global config layer — what a panel or CLI write persisted. */
export function globalLayerValue(setting: AnySetting, scope: Settings): unknown {
	let value: unknown = scope.getGlobalSettings();
	for (const segment of setting.segments) {
		value = isRecord(value) ? value[segment] : undefined;
	}
	return value;
}

/** Where the effective value comes from when it is not the global config (or the default), if anywhere. */
export function shadowingSource(
	setting: AnySetting,
	scope: Settings,
): { json: Record<string, string>; source: Exclude<SettingProvenance, "global" | "default">; message: string } | undefined {
	const provenance = setting.provenance(scope);
	switch (provenance) {
		case "global":
		case "default":
			return undefined;
		case "env": { /* ...unchanged from config-cli.ts:332-345... */ }
		case "project":
		case "overlay":
		case "runtime":
			/* ...unchanged... */
	}
}

// packages/coding-agent/src/config/settings-ui.ts  (inside createSettingsHost)
const writeSetting = (path: string, value: unknown): SettingsWriteResult => {
	const setting = resolve(path);
	const previous = globalLayerValue(setting, settings); // undefined ⇒ key absent from global

	setting.set(settings, value);

	// writeValue() mutates the in-memory global layer synchronously (settings.ts:818-838),
	// so re-reading provenance here observes the write without awaiting the debounced save.
	const written = globalLayerValue(setting, settings);   // normalised value that landed
	const effective = setting.get(settings);              // value the user actually gets
	const shadow = shadowingSource(setting, settings);

	// A higher layer holding the identical value is not a real shadow — do not roll back.
	if (!shadow || Bun.deepEquals(effective, written)) return { status: "applied" };

	if (previous === undefined) setting.unset(settings);
	else setting.set(settings, previous);

	return { status: "shadowed", source: shadow.source, message: shadow.message };
};

// packages/tui/src/overlays/settings-selector.ts  (one funnel per class, host arrives as an argument,
// so no line in the file ever reads `settings.set(` and gate (1) stays an honest single command)
#writeSetting(host: SettingsHost, path: string, value: unknown): boolean {
	const result = host.set(path, value);
	if (result.status === "shadowed") {
		this.#showInlineStatus(` ${result.message}`); // reuse the component's existing affordance
		return false;
	}
	return true;
}
```

Lưu ý khi đọc khối này: `this.#showInlineStatus(...)` là tên tượng trưng trong code shape — spec chỉ nói "dùng lại affordance sẵn có", không nêu tên thật. Xem mục `## Cần người xác nhận` bên dưới.

### Hợp đồng test

File test: `packages/coding-agent/test/config/settings-provenance-guard.test.ts`.

Hợp đồng quan sát được: một lần ghi từ `/settings` mà giá trị có hiệu lực do một lớp cao hơn cấp phải (a) không để lại giá trị chết trong `config.yml` global trên đĩa, (b) để lại đúng giá trị global trước đó của setting như cũ, và (c) báo rõ lớp nào đang che. Một lần ghi không có gì che phải đáp xuống bình thường trong `config.yml`.

Nếu hồi quy, người tiêu dùng thấy: họ bật một setting mà `.omp/config.yml` của dự án đã quyết định, panel báo là "đã áp dụng", rồi `config.yml` global lặng lẽ tích tụ các giá trị chết — đúng cái hỏng mà M4-6 sinh ra để chặn. Hàng đối chứng không-che KHÔNG phải hàng đệm: nó chứng minh chốt chặn phân biệt được `shadowed` với `applied`, và nó là test sẽ đỏ nếu ai đó biến chốt chặn thành từ chối trần và brick `/settings` cho mọi người dùng — rủi ro mà plan nêu là chế độ hỏng chính.

Cấu trúc sáu ca theo `files_touched`: một test cho mỗi lớp che thực sự khác nhau (project / env / overlay / runtime), một test đối chứng không-che, và một khẳng định rollback trên đĩa.

### Xác minh


Hệ quả cho cổng: sau khi build addon native một lần (đã xong 2026-09-29), **cả bốn cổng đều chạy được**; trên máy sạch thì cổng 2 và cổng 3 dừng ở bước import cho tới khi build xong — đỏ vì môi trường, không phải bởi thiết kế.

```bash
# 1. Kiểu — TUYỆT ĐỐI không dùng `tsc`/`npx tsc`, dự án cấm
bun run check:ts

brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 3. Các test liên quan settings
bun test packages/coding-agent/test/ -t 'settings'

# 4. Không hồi quy toàn package
bun test packages/coding-agent/test/

# 5. Không còn lần ghi nào đi vòng qua chốt chặn
grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts   # phải in ra 0

# 6. config-cli.ts không còn định nghĩa cục bộ nào, chỉ còn import + chỗ gọi
grep -c '^function shadowingSource\|^function globalValue' packages/coding-agent/src/cli/config-cli.ts   # phải in ra 0
grep -c 'from "\.\./config/shadowing"' packages/coding-agent/src/cli/config-cli.ts                        # phải in ra 1
```

Lưu ý về lệnh 6: đừng dùng `grep -c 'shadowingSource'` để kiểm tra việc rút code. Sau bước 2 file có **hai** dòng chứa tên đó — dòng import và chỗ gọi đã cập nhật trong `handleSet` — nên con số vẫn là 2, y hệt trạng thái trước bước 2 (chỗ gọi ở dòng 307 + định nghĩa ở dòng 325). Lệnh đó không phân biệt được trước/sau, và đòi nó in ra 1 là bất khả thi về toán học. Phải đếm định nghĩa còn sót và import đã thêm.

### Cổng hoàn thành

Bốn cổng, tất cả đều máy-móc. Cả bốn đều chạy được sau khi build addon native một lần (đã xong 2026-09-29); 2 và 3 cần bước build đó làm tiền đề (xem môi trường ở trên).

1. `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` in ra 0 — không lần ghi nào lách chốt chặn. Đây là cổng chống trôi: nó đỏ ngay khi bất kỳ ai thêm chỗ gọi thứ 14, thứ mà danh sách dòng hardcode của plan sẽ lặng lẽ bỏ sót. Điều kiện để con số 0 là thật đã được chốt ở bước 7: `#writeSetting` gọi `host.set(...)` chứ không gọi `settings.set(...)`, nên thân helper không tự khớp regex của chính cổng này.
2. Test project-shadow khẳng định `YAML.parse(await Bun.file(globalConfigPath).text())` KHÔNG chứa khoá sau một lần ghi từ panel, và có chứa giá trị TRƯỚC lúc ghi — một khẳng định ở mức byte trên file thật, đó là nghĩa của rollback ở đây (revert trong bộ nhớ trước khi debounce `#queueSave` 100ms rã xuống, nên lần ghi và lần rollback của nó gộp thành một lần save; đã kiểm chứng `settings.ts:818-838` và `#queueSave`).
3. Test đối chứng không-che khẳng định cùng khoá đó CÓ trong `config.yml` sau một lần ghi từ panel khi không có gì che. Không có nó, cổng (1) và (2) đều thoả được bằng một chốt chặn từ chối mọi lần ghi.
4. `bun run check:ts` sạch, điều này còn ép nốt rằng `SettingsProvenance` của tui và `SettingProvenance` của coding-agent chưa trôi lệch nhau.


### Phụ thuộc

`depends_on`:

- M2 WI-8a và WI-8b phải merge trước — chúng là thứ phơi bày bề mặt `pi.registerSetting` có namespace mà work item này sửa. **CHƯA KIỂM CHỨNG:** WI-8a/WI-8b là các work item của M2 chưa được thực thi; hãy xác nhận chúng đã nằm trên nhánh này trước khi bắt đầu.
- M4-4 phải nằm trong CÙNG một PR, hoặc có thứ tự merge tường minh — Sóng B nói cả hai mục đều thay đổi một interface được thoả cấu trúc trong cùng package `packages/tui/src/overlays/`. M4-6 thêm một thành viên vào `SettingsHost`; M4-4 đổi kiểu trả về của `PluginSettingsManager.setEnabled`. Một lượt review, hai commit.
- Hình dạng `ChangeResult` của M4-4 là tiền lệ cho `SettingsWriteResult` — hãy căn hai cái lại để Sóng B mang một kiểu kết quả thống nhất, không phải hai kiểu na ná nhau.

`blocks`:

- Sóng B của M4 không thể mở PR cho tới khi quyết định changelog M4 được đưa ra (plan:11638) — merge thì được, phát hành thì không.
- Chặn nửa còn lại của Sóng B: M4-4 không thể được review độc lập nếu chưa chốt hình dạng chung `ChangeResult` so với `SettingsWriteResult`.

### Cách sai dễ nhất

Chốt chặn là một phép xác minh sau khi ghi kèm rollback, và chính quyết định rollback là thứ có thể brick `/settings`. Có hai cách sai rõ ràng.

**(1) Từ chối trần.** Nếu chốt chặn từ chối mọi lần ghi mà provenance không phải `"global"`, thì với bất kỳ setting nào project config đã định nghĩa, panel trở thành chỉ-đọc và người dùng không sửa được gì cả. Test đối chứng không-che tồn tại chính là để bắt đúng điều đó, và chốt chặn buộc phải so sánh GIÁ TRỊ (effective so với written) chứ không chỉ so provenance, vì một lớp project giữ đúng giá trị đó là dương tính giả.

**(2) Lỗi ném ra khỏi chốt chặn.** Không chỗ gọi nào trong 13 chỗ đó được bọc try/catch (đã kiểm chứng: lệnh `throw` duy nhất trong `settings-selector.ts` là hai lần ném `Invalid record JSON` ở dòng 1208 và 1211), nên một lỗi ném ra từ `set` sẽ lan vào submit handler của component và có thể làm sập overlay giữa chừng. Chốt chặn phải TRẢ VỀ một kết quả, không bao giờ ném vì chuyện bị che; lỗi ghi thật (JSON hỏng, validation) vẫn ném như hiện nay.

Rủi ro thứ cấp, thấp hơn: trôi lệch interface giữa tui/coding-agent. `SettingsHost` được khai báo ở tui và được thoả theo cấu trúc bởi `createSettingsHost` ở coding-agent, mà `packages/tui/package.json` export `./*` dạng wildcard, nên về nguyên tắc có thể tồn tại những bên hiện thực ngoài repo. Thêm một thành viên ít nguy hiểm hơn hẳn việc đổi kiểu trả về của M4-4, nhưng chính vì có wildcard export nên thành viên `provenance` phải là phép bổ sung, không phải đổi chữ ký.

### Cần người quyết

- **Panel nên TO hay NHỎ khi bị che?** Spec trả về một kết quả và panel hiện thông báo nội tuyến. Nhưng một người dùng vừa gõ một giá trị vào ô chữ rồi nhấn enter, rồi thấy nó lặng lẽ quay về giá trị cũ, có thể đọc đó là mất dữ liệu. Phương án (a): từ chối lần ghi và nói lý do. Phương án (b): cho ghi, giữ giá trị trong `config.yml`, chỉ chú thích lại dòng đó. (b) chính là thứ `omp config set` đã làm hôm nay (`config-cli.ts:315-317` — báo cáo lớp che bằng chữ vàng và để nguyên giá trị đã ghi), nên nó có tiền lệ đã phát hành; (a) mới là thứ dsh làm. Đây là quyết định sản phẩm, không phải kỹ thuật, và nó quyết định liệu nửa rollback của chốt chặn có tồn tại hay không.
- **Tiền lệ dsh mà plan dẫn (`packages/boot/config-editor/src/index.ts:127-129` và `:133-137`) CÓ TỒN TẠI — nó chỉ nằm ở repo khác, không phải trong repo này.** Có checkout deepseek-harness tại `~/Projects/deepseek-harness` (git HEAD `477b4f4`), và số dòng plan nêu là chính xác từng dòng: `:127` là `if (!isDeepStrictEqual(effective?.config ?? {}, next)) {`, `:128` là `throw new Error(\`Configuration for "${entry.options.id}" is overridden by a home patch or command-line overlay\`)`, `:130` là `await writeFileAtomic(path, String(document), { mode: 0o600 })`. Đừng dùng `ls packages/` trong repo omp để kết luận về repo khác — lệnh đó không bao giờ có thể thấy nó. **Câu hỏi thật cần chốt là:** dsh chặn ghi TRƯỚC khi ghi (throw ở `:128`, `writeFileAtomic` ở `:130`), còn thiết kế của M4-6 ghi rồi mới rollback trong bộ nhớ. Đây là hai hành vi quan sát được khác nhau với người dùng: dsh không bao giờ để lại giá trị chết kể cả tạm thời; M4-6 hiện tại sẽ ghi rồi hoàn tác trong cùng một tick. Chọn cái nào? Lưu ý thêm cho người đọc: khối rollback của dsh ở `:133-137` bảo vệ `reconcileProfilePatches` (ghi profile patch), không phải bảo vệ config editor — đừng đọc nó như một guard chống-ghi-trùng. Tiền lệ thứ ba trong repo này là `config-cli.ts:295-318` (`handleSet`): xác minh sau khi ghi qua `globalValue` + `shadowingSource` rồi IN ra lớp che bằng chữ vàng — không ném, không rollback. Ba tiền lệ này bất đồng; hãy chốt cái nào chi phối trước khi viết chốt chặn.
- **`provenanceNote` (bước 10) nên nằm trong phần mô tả thường trực của setting, hay chỉ hiện sau một lần ghi?** Ghi chú vào mô tả thường trực nhiều thông tin hơn và không tốn chi phí gì, nhưng nó đổi mô tả của MỌI dòng bị che, một thay đổi thị giác rộng hơn phạm vi plan vẽ ra. Nó cũng làm danh sách mục dài thêm, mà danh sách đó được dựng lại ở mỗi lần chuyển tab (`#buildItemsForDefs` tại `settings-selector.ts:1280`) — không tốn, nhưng đáng xác nhận với số mục setting thật.
- **Xác nhận phụ thuộc M2 WI-8a / WI-8b đã thực sự đáp xuống.** Plan nêu nó như một chặn cứng nhưng M2 chưa thực thi; nếu các mục đó đã đổi bề mặt đăng ký setting, phần thêm interface ở bước 3 có thể phải khớp một hình dạng chưa tồn tại.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Hình dạng bản sửa lấy từ dsh tại `packages/boot/config-editor/src/index.ts:127-129` (throw `'is overridden by a home patch or command-line overlay'`) và `:133-137` (rollback theo byte). | SAI Ở KẾT LUẬN — file tồn tại, chỉ là không nằm trong repo này | Repo này đúng là không có `packages/boot/`, nhưng đó không phải bằng chứng file không tồn tại: có checkout deepseek-harness tại `~/Projects/deepseek-harness` (git HEAD `477b4f4`) và file tồn tại ở đó, đúng số dòng plan nêu — `grep -rn 'is overridden by a home patch' ~/Projects/deepseek-harness --include='*.ts'` → `packages/boot/config-editor/src/index.ts:128`. **Đừng dùng `ls packages/` trong repo omp để kết luận về repo khác.** Điểm đáng chú ý nhất khi đọc nguồn đó: bước throw của dsh nằm TRƯỚC `writeFileAtomic` (`:130`), tức dsh chặn ghi chứ không rollback một lần ghi đã xảy ra — khác với mô tả "rollback theo byte". Và khối `:133-137` bảo vệ `reconcileProfilePatches` (ghi profile patch), không phải bảo vệ config editor. Tiền lệ trong repo này là `packages/coding-agent/src/cli/config-cli.ts:295-318` (`handleSet`), xác minh sau khi ghi qua `globalValue` + `shadowingSource` và IN ra lớp che bằng chữ vàng — không ném, không rollback. Ba tiền lệ này bất đồng với nhau (đây là open question #2). |
| `packages/tui/src/overlays/settings-selector.ts` có một switch provenance ở dòng 325-357. | SAI — khoảng đó sao chép từ `config-cli.ts` | `settings-selector.ts:325-357` chứa `#showProviderList()` (bắt đầu dòng 321) và `#showProviderEditor(provider)` (bắt đầu dòng 363). Hôm nay không có logic provenance nào ở bất kỳ đâu trong `settings-selector.ts`. Khoảng 325-357 giống từng byte khoảng mà plan đưa cho `shadowingSource` trong `config-cli.ts`, nên plan đã nhân đôi một khoảng dòng qua hai file. Không có gì để giữ hay rút từ phía tui; vai trò duy nhất của file tui là 13 chỗ gọi. |
| 13 chỗ `settings.set(` nằm ở dòng 346, 390, 869, 872, 1155, 1193, 1195, 1209, 1211, 1213, 1215, 1244, 1251. | CŨ — đếm đúng, mọi số dòng đều sai | Số 13 chính xác tuyệt đối và THỨ TỰ khớp 1:1, nhưng số dòng lệch +3 ở hai chỗ đầu và +7 ở mười một chỗ còn lại. Dòng thật: 349, 393, 876, 879, 1162, 1200, 1202, 1216, 1218, 1220, 1222, 1251, 1258. Dùng output của `grep` lúc hiện thực, đừng dùng số của plan. |
| `shadowingSource` nằm ở `packages/coding-agent/src/cli/config-cli.ts:325-357`. | SAI MỘT PHẦN — đầu đúng, cuối sai, và thiếu một hàm bạn đồng hành | `shadowingSource` bắt đầu ở 325 (đúng) nhưng thân hàm kết thúc ở 360, không phải 357. Quan trọng hơn, plan không nhắc `globalValue` ở `config-cli.ts:318-322` — chính là hàm bạn cần để đọc giá trị global trước lúc ghi, tức là nguyên thủy rollback. Cả hai đều module-private (không có trong danh sách export) và cả hai phải đi cùng nhau, nếu không host sẽ tự cài lại một trong hai. Rút cả hai vào module dùng chung mới với tham số tường minh `scope: Settings` để settings host và CLI dùng chung một cách hiện thực. |
| `provenance(scope)` ở `registry.ts:763-766` và phép kiểm env ở `:764`. | ĐÚNG PHẦN LỚN — lệch một ở neo con | Khoảng 763-766 đúng. Dòng 764 là CHỮ KÝ `provenance(scope: ScopeLike): SettingProvenance {`; phép kiểm `#effectiveEnv` nằm ở dòng 765. Hãy dùng 765. |
| `settingsOf(scope).getProvenance()` không bao giờ trả `'env'`, nên dùng `setting.provenance(scope)`. | ĐÚNG — đã kiểm chứng với source | Đúng, và đáng giữ như một quy tắc tường minh. `Settings.getProvenance` (`settings.ts:800-808`) đi `#overrides` → `#configOverlay` → `#project` → `#global` → parent và hoàn toàn không có nhánh env; chỉ `Setting.provenance` (`registry.ts:765`) đặt phép kiểm `#effectiveEnv` lên trên. Cũng lưu ý union đầy đủ là sáu thành viên chứ không phải năm: `"env" \| "runtime" \| "overlay" \| "project" \| "global" \| "default"` (`settings.ts:62`) — kiểu soi trong tui phải mang đủ sáu. |
| Work item này là "chặn cả 13 chỗ". | NHẬN XÉT ĐÚNG, NHƯNG SAI MẠCH | 13 chỗ là bản kiểm kê đúng, nhưng chúng là chỗ sai để cưỡng chế bất cứ điều gì. Cả 13 đều là chỗ gọi `SettingsHost.set` bên trong MỘT file, và `SettingsHost.set` có đúng một hiện thực sản xuất — `createSettingsHost` tại `settings-ui.ts:77`. Cưỡng chế chốt chặn bên trong `set` đó tự động phủ cả 13 và không thể bị đánh bại bởi một panel M3 trong tương lai thêm chỗ thứ 14. `grep` toàn repo `settings.set(` / `#settings.set(` trong `packages/tui` trả về đúng 13 dòng đó và không gì khác. Cảnh báo của chính plan rằng danh sách dòng hardcode là hiện vật dễ vỡ nhất là đúng — cách sửa là XOÁ danh sách khỏi thiết kế, đừng bảo trì nó cẩn thận hơn. |
| `SettingsHost` là rủi ro interface xuyên package "y hệt PluginSettingsManager". | ĐÚNG, kèm một điều kiện làm giảm mức độ | Hình dạng thoả cấu trúc là có thật: tui khai báo `SettingsHost` và coding-agent thoả nó trong `createSettingsHost` (`settings-ui.ts:51`, import kiểu ở dòng 2), và `packages/tui/package.json` export wildcard `'./*' -> './src/*.ts'`, nên về nguyên tắc có thể có bên hiện thực ngoài repo. Nhưng grep chỉ ra MỘT hiện thực sản xuất trong repo này. M4-6 thêm một thành viên mới (bổ sung, không đổi chữ ký); M4-4 đổi kiểu trả về của một method có sẵn, đó mới là thứ phá vỡ thật sự. M4-6 là nửa ít rủi ro hơn của Sóng B. |
| Ngữ cảnh nhiệm vụ nói repo ở git HEAD `5873776`. | CŨ | Mọi spec trong lô này trích `5873776` đều lệch. HEAD tại lúc rà soát (2026-09-27) là `9cfbaba` trên nhánh `milestone-1`. Vì số SHA có tuổi, hãy chạy `git rev-parse --short HEAD` thay vì tin dòng này; lúc rà soát `git log --oneline -5` cho `9cfbaba`, `e040a60`, `808b365`, `33d6e33`, `ecd516f`. |

## Cần người xác nhận

Ba điểm dưới đây là mâu thuẫn NỘI TẠI của spec hoặc chỗ spec hứa dữ liệu rồi không cấp. Không tự sửa — cần người quyết trước khi viết code.

1. **Rollback được coi là đã chốt ở nửa build, lại được hỏi ở nửa quyết định.** Bước 5, bước 7, cổng (2) và hợp đồng test đều dựng sẵn rollback như một quyết định xong: `previous === undefined ? setting.unset(settings) : setting.set(settings, previous);`, khẳng định trên đĩa rằng khoá không còn sau lần ghi, và UI trả `false`. Nhưng open question #1 lại nói "nó quyết định liệu nửa rollback của chốt chặn có tồn tại hay không", và đặt ra phương án (b) — cho ghi và chỉ chú thích — là phương án có tiền lệ đã phát hành ở `omp config set`. Hai bên không thể đúng cùng lúc. Cần chốt: (a) rollback, hay (b) ghi rồi chú thích.

2. **Bước 11 hứa "sáu ca và đúng fixture" nhưng `test_contract` không có cái nào.** `test_contract` là một đoạn văn xuôi nêu hợp đồng quan sát được, không liệt kê tên sáu ca, không đưa fixture nào. Con số sáu chỉ suy ra được từ ghi chú trong `files_touched` (project / env / overlay / runtime + no-shadow + on-disk rollback), và đó là suy luận của người viết mục này, không phải dữ liệu spec. Cần fixture cụ thể cho sáu ca trước khi viết test — đặc biệt là cách dựng một project config ghi đè, một overlay `--config`, và một runtime override trong test harness.

3. **Affordance hiển thị thông báo trong tui chưa được đặt tên và chưa kiểm chứng.** Bước 7 nói hiện `message` "qua affordance lỗi/trạng thái nội tuyến mà component đã có", và code shape dùng `this.#showInlineStatus(...)` với chú thích "reuse the component's existing affordance" — tức là một tên tượng trưng. Spec không nêu method thật của `SettingsSelectorComponent` cho việc này, cũng không nêu hành vi khi thông báo dài hơn bề rộng dòng hay khi ghi trùng. Cần bạn chỉ đích danh affordance (hoặc nói rõ phải thêm một cái mới), và nói rõ `#writeSetting` sẽ trả false thì thao tác chỉnh sửa cục bộ trong panel đi tiếp thế nào.



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo neo — đọc trước khi gõ.** Cảnh báo của phiếu: dsh HEAD là `477b4f4`, HEAD repo này là `47720fd`. Hai chuỗi gần nhau, đừng lẫn. Dưới đây là những neo trong mục này đã bị kiểm và sai; số dòng cũ trong kế hoạch **giữ nguyên theo luật bất di bất dịch**, bạn tự dịch sang số thật:

1. **`config-cli.ts:315-317` (OQ1) — sai.** Kế hoạch trích nó làm ví dụ cho phương án (b) của `omp config set`. Nội dung thật: `:315` là `}` đóng hàm, `:316` trống, `:317` là JSDoc của `globalValue`. **Ba dòng đó không có gì về shadow cả.** Dải đúng là **`:306-307`** (`const saved = globalValue(def.setting);` / `const shadow = shadowingSource(def.setting);`) **+ `:314`** (`if (shadow) console.log(chalk.yellow(...));`).
2. **"chỉ có `throw` ở dòng 1208 và 1211" — sai, có BA.** `grep -n 'throw '` trả về **389**, **1208**, **1211**. Dòng 389 là `if (!Number.isFinite(limit) || limit <= 0) throw new Error("Limit must be a positive number.");` — nằm trong `onSubmit` của `ProviderLimitsSubmenu`, ngay cùng handler gọi `this.#settings.set(...)` ở `:393`, và **không** bọc try/catch. Kết luận của kế hoạch (không call site nào được bọc) vẫn đúng — file chỉ có **một** try/catch, ở `:1205-1207` — nhưng lập luận phải dựa vào thực tế đó, không dựa vào danh sách 2 dòng.
3. **"13 chỗ = toàn bộ đường ghi của `SettingsHost`" — thiếu một đường.** Còn `settings.unset(` ở **`settings-selector.ts:1112`**. Regex của cổng (1) là `settings\.set\(` nên `settings.unset(` **không khớp**.
4. **Bảng file-touched của `settings-defs.ts` thiếu một dòng.** Kế hoạch chỉ nói "thêm union + thêm `provenance`", nhưng `settings-defs.ts:134` đang là `set(path: string, value: unknown): void;` và **phải đổi**. Không sửa `:134` thì `#writeSetting` ở tui không thấy trường `status` nào và `check:ts` đỏ.
5. **Bước 4 (định nghĩa `SettingsWriteResult` trong `settings-ui.ts`) đặt sai phía.** tui **không** import được từ coding-agent — đã kiểm: `rg 'pi-coding-agent' packages/tui/src/ packages/tui/package.json` không trả về gì; chiều import là coding-agent → tui (`settings-ui.ts:2`).
6. **Dòng `:2803` của kế hoạch (GAP-REGISTER) mâu thuẫn với chính bước 9 + cổng (1) của mục này.** Nó yêu cầu `grep -c 'settings\.set('` phải **bằng đúng 13**; bước 9 và cổng (1) nói phải là **0**. Work item đã chọn "dồn về `host.set` → 0"; dòng 2803 vẫn viết theo thiết kế cũ. **Làm theo work item (0), và coi 2803 là đoạn đã lỗi thời.**
7. **OQ9 ghi HEAD `9cfbaba`** — HEAD tại lúc rà soát là `47720fd`.

**Các neo khác đã kiểm và ĐÚNG (dùng nguyên trạng):** `settings-defs.ts:131` / `:141` / `:142`; `settings.ts:62` (union `SettingProvenance` — **sáu** thành viên, không phải 5), `:800-808` (`getProvenance` — **không có nhánh env**), `:818-838` (`writeValue`), `:3324-3334` (`#queueSave` debounce 100ms); `registry.ts:763` / `:764` (chữ ký) / **`:765` (dùng dòng này — phép kiểm env)** / `:766`; `settings-ui.ts:2` / `:39-44` (`envNote`) / `:51` / `:69` / `:74` / `:77` / `:82`; `config-cli.ts:307` / `:310` / `:314` / `:318` / `:325` / `:360` (**không phải 357**); `settings-selector.ts:292` / `:294` / `:321` / `:349` / `:361` / `:363` (dải 325-357 **không** có logic provenance) / `:393` / `:498` / `:520` / `:876` / `:879` / `:1162` / `:1200` / `:1202` / `:1216` / `:1218` / `:1220` / `:1222` / `:1251` / `:1258` / `:1280`; `CHANGELOG.md:3`; `packages/tui/package.json:94`; dsh `:127` / `:128` / `:130` / `:133-137`; `settings-panel-clear.test.ts` (tồn tại, 70 dòng); `test/helpers/settings-test-state.ts:13` / `:31`.

**Bảng điểm sửa**

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/config/shadowing.ts` | *(tạo mới — không tồn tại)* | — | `globalLayerValue(setting, scope)` + `shadowingSource(setting, scope)`, scope tường minh, giữ nguyên từng chuỗi message |
| `packages/coding-agent/src/cli/config-cli.ts:318-322` | `globalValue` | `function globalValue(setting: AnySetting): unknown {`<br>`	let value: unknown = settings.getGlobalSettings();`<br>`	for (const segment of setting.segments) value = isRecord(value) ? value[segment] : undefined;`<br>`	return value;`<br>`}` | xoá; nơi gọi `:306` → `globalLayerValue(def.setting, settings)` |
| `packages/coding-agent/src/cli/config-cli.ts:325` | `shadowingSource` | `function shadowingSource(setting: AnySetting): { json: Record<string, string>; message: string } \| undefined {` | xoá; nơi gọi `:307` → `shadowingSource(def.setting, settings)` |
| `packages/coding-agent/src/cli/config-cli.ts:8` | import `isRecord` | `import { APP_NAME, getAgentDir, isRecord } from "@oh-my-pi/pi-utils";` | bỏ `isRecord` (chỉ dùng ở `:320`, sẽ biến mất) |
| `packages/coding-agent/src/cli/config-cli.ts:11` | import `AnySetting` | `import { type AnySetting, lookup } from "../config/registry";` | **giữ nguyên** — còn dùng ở `:35` và `:45` |
| `packages/tui/src/overlays/settings-defs.ts:134` | `SettingsHost.set` | `set(path: string, value: unknown): void;` | trả về kết quả (xem cạm bẫy 2) |
| `packages/tui/src/overlays/settings-defs.ts:141` | `SettingsHost` | `	validateProviderLimits(value: unknown): Record<string, number>;` | thêm `provenance(path: string): SettingsProvenance;` |
| `packages/tui/src/overlays/settings-defs.ts:130` | *(mới)* | — | `export type SettingsProvenance = "env" \| "runtime" \| "overlay" \| "project" \| "global" \| "default";` |
| `packages/coding-agent/src/config/settings-ui.ts:77` | `set` của `createSettingsHost` | `		set: (path, value) => resolve(path).set(settings, value),` | thân có chốt chặn 5 bước, trả `SettingsWriteResult` |
| `packages/coding-agent/src/config/settings-ui.ts:74` | host literal | `	return {` (mảnh 74-81) | thêm `provenance: path => resolve(path).provenance(settings),` |
| `packages/coding-agent/src/config/settings-ui.ts:39-44` | `envNote` | `function envNote(setting: AnySetting): string {`<br>`	if (!setting.envName \|\| setting.envValue() === undefined) return "";`<br>`	return setting.envFallback`<br>``		? ` Unset, it falls back to $${setting.envName}.`<br>		: ` $${setting.envName} overrides this setting while it is set.``;`<br>`}` | giữ nguyên (đã phát hành); thêm `provenanceNote` cạnh bên |
| `packages/tui/src/overlays/settings-selector.ts:349` | `ProviderLimitsSubmenu.onSubmit` | `					this.#settings.set("providers.maxInFlightRequests", normalized);` | `this.#writeSetting(this.#settings, "providers.maxInFlightRequests", normalized)` |
| `packages/tui/src/overlays/settings-selector.ts:1200` | `#setSettingValue` | `			this.#context.settings.set(path, -1);` | `this.#writeSetting(this.#context.settings, path, -1)` (×2: 1200, 1202) |
| `packages/tui/src/overlays/settings-selector.ts:1216` | `#setSettingValue` | `			this.#context.settings.set(path, parsed);` | `this.#writeSetting(this.#context.settings, path, parsed)` |
| `packages/tui/src/overlays/settings-selector.ts:1222` | `#setSettingValue` | `			this.#context.settings.set(path, value);` | `this.#writeSetting(this.#context.settings, path, value)` |
| `packages/tui/src/overlays/settings-selector.ts:1112` | `#createTextInput` | `				if (value === "") this.#context.settings.unset(def.path);` | **đường ghi thứ 14 mà kế hoạch bỏ sót** — xem cạm bẫy 1 |
| `packages/coding-agent/test/config/settings-provenance-guard.test.ts` | *(tạo mới)* | — | 4 lớp che + 1 đối chứng + 1 rollback trên đĩa |

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc)

1. **Tạo `packages/coding-agent/src/config/shadowing.ts`.** Neo `config-cli.ts:318`: `:318` `function globalValue(setting: AnySetting): unknown {`, `:319` `let value: unknown = settings.getGlobalSettings();`, `:320` `for (const segment of setting.segments) value = isRecord(value) ? value[segment] : undefined;`, `:321` `return value;`, `:322` `}`. `isRecord` phải được import trong file mới từ `@oh-my-pi/pi-utils`. `settings.getGlobalSettings()` có thật — `packages/coding-agent/src/config/settings.ts:1386` (`getGlobalSettings(): RawSettings {`). Đặt tên `globalLayerValue` (không phải `globalValue`) để phân biệt với `SettingsHost.get`. **Thêm trường `source` CẠNH `json`, đừng thay `json`** — đã kiểm: `config-cli.ts:310` là `console.log(JSON.stringify({ key: def.path, value: saved, ...shadow?.json }));`, spread thẳng `json` vào output `--json`. `json` là hợp đồng đã phát hành.
2. **Dọn `config-cli.ts`.** Neo `config-cli.ts:307`. Thêm `import { globalLayerValue, shadowingSource } from "../config/shadowing";`. Sửa hai chỗ gọi ở `:306`/`:307` thành truyền `settings` (singleton đã import ở `config-cli.ts:12`). `isRecord` ở `config-cli.ts:8` sẽ thành import chết — nó chỉ dùng ở `:320`. `check:ts` chạy `oxlint .` (root `package.json:91`), nên import chết sẽ đỏ. Phải bỏ nó. `AnySetting` ở `config-cli.ts:11` **phải giữ** — còn dùng ở `:35` và `:45`. `handleSet` bắt đầu ở `config-cli.ts:282`.
3. **Thêm `SettingsProvenance` và `provenance` vào `SettingsHost`.** Neo `settings-defs.ts:131`: `:131` `export interface SettingsHost {`, `:132` `entries`, `:133` `get(path)`, `:134` `set(path, value): void;`, `:135-138` JSDoc, `:139` `unset(path: string): void;`, `:140` `normalizeProviderLimits`, `:141` `validateProviderLimits`, `:142` `}`. Dải 131-142 của kế hoạch **chính xác từng dòng**. Union phải soi **6** thành viên, không phải 5 — nguồn `settings.ts:62`. `set` ở `:134` đang trả `void` và **phải đổi**. `unset` ở `:139` **đã có sẵn**.
4. **Định nghĩa `SettingsWriteResult`.** Neo `settings-ui.ts:77`. Union: `{ status: "applied" } | { status: "shadowed"; source: Exclude<SettingsProvenance, "global" | "default">; message: string }`. **Phải đặt union này ở phía tui, không phải coding-agent.**
5. **Cài chốt chặn trong `set`.** Neo `settings-ui.ts:77`. Thứ tự bắt buộc, mỗi bước có lý do đã kiểm: (1) `const previous = globalLayerValue(setting, settings);` (2) `setting.set(settings, value);` (3) đọc lại `written` / `effective` / `shadow` (4) `if (!shadow \|\| Bun.deepEquals(effective, written)) return { status: "applied" };` (5) rollback rồi trả `shadowed`. Vì sao phải đọc lại `written` sau `set` — đã kiểm `registry.ts:716`: `:716` `set(scope: ScopeLike, value: T): {`, `:717` `if (value === undefined) settingsOf(scope).unsetGlobalValue(this);`, `:718` `else settingsOf(scope).writeValue(this, this.#normalize(value), "global");`. `#normalize(value)` ở `:718` — giá trị xuống đĩa KHÔNG phải giá trị bạn truyền vào; đọc trước khi ghi sẽ so sai hai thứ khác nhau. Vì sao rollback gộp được thành một lần save — đã kiểm `settings.ts:836` (`if (layer === "global") this.#queueSave();`) và `settings.ts:3324-3334` (`#queueSave`, `clearTimeout(this.#saveTimer)`, `setTimeout(…, 100)`): rollback chạy trong cùng một tick nên `clearTimeout` lần hai giữ lại timer đầu. Rollback dùng `setting.unset(settings)` — `registry.ts:735` `unset(scope)` → `settingsOf(scope).unsetGlobalValue(this)`.
6. **Cài `provenance` trên host.** Neo `settings-ui.ts:74`. Host literal nằm ở `settings-ui.ts:74-81`, `createSettingsHost` mở ở `:51`, đóng ở `:82`. `resolve` khai ở `:69`: `:69` `const resolve = (path: string): AnySetting => {`, `:70` `const setting = lookup(path);`, `:71` ``if (!setting) throw new Error(`Unknown setting: ${path}`);``, `:72` `return setting;`, `:73` `};`. Thêm `provenance: path => resolve(path).provenance(settings),`. Nguồn phía nhận: `registry.ts:764` `provenance(scope: ScopeLike): SettingProvenance {` và `:765` `return this.#effectiveEnv(scope) !== undefined ? "env" : settingsOf(scope).getProvenance(this);`. **Dùng 765, không dùng 764** — 764 là chữ ký.
7. **Dồn 13 chỗ gọi về `#writeSetting`.** Neo `settings-selector.ts:349`. 13 dòng đã kiểm từng dòng, khớp 1:1 với danh sách kế hoạch: `:349` `this.#settings.set("providers.maxInFlightRequests", {});` (class `ProviderLimitsSubmenu`, mở ở `:292`), `:393` `this.#settings.set("providers.maxInFlightRequests", normalized);`, `:876` `this.#context.settings.set(path, boolValue);` (`#onSearchSettingChange`, `:871`), `:879` `this.#context.settings.set(path, newValue);`, `:1162` `this.#context.settings.set(def.path, value);` (`#createMultiSelect`, `:1149`), `:1200` / `:1202` `this.#context.settings.set(path, -1);` (`#setSettingValue`, `:1196`), `:1216` `this.#context.settings.set(path, parsed);`, `:1218` `this.#context.settings.set(path, Number(value));`, `:1220` `this.#context.settings.set(path, value === "true");`, `:1222` `this.#context.settings.set(path, value);`, `:1251` `this.#context.settings.set(path, boolValue);` (onChange của `#showSettingsTab`, `:1229`), `:1258` `this.#context.settings.set(path, newValue);`. `SettingsSelectorComponent` mở ở `:498`, `readonly #context: SettingsRuntimeContext;` ở `:520`; `ProviderLimitsSubmenu` mở ở `:292`, `readonly #settings: SettingsHost;` ở `:294`. **6/13 chỗ đã đi qua `#setSettingValue` (`:1196-1223`)** — đây là phễu sẵn có, chỉ cần sửa một chỗ thay vì sáu. `#writeSetting` phải nhận `host` làm tham số và gọi `host.set(...)`, KHÔNG bám `this.#context`, để cổng (1) thật sự về 0.
8. **Bản `#writeSetting` riêng cho `ProviderLimitsSubmenu`.** Neo `settings-selector.ts:349`. Hai chỗ 349/393 thuộc class đó, dùng `this.#settings` (khai ở `:294`), khác `this.#context.settings` của `SettingsSelectorComponent`.
9. **Chạy cổng (1).** Baseline hôm nay: `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` → **13**. Sau khi sửa phải là **0**.
10. **`provenanceNote`.** Neo `settings-ui.ts:39`: `:39` `function envNote(setting: AnySetting): string {`, `:40` `if (!setting.envName || setting.envValue() === undefined) return "";`, `:41` `return setting.envFallback`, `:42` ``? ` Unset, it falls back to $${setting.envName}.``, `:43` ``: ` $${setting.envName} overrides this setting while it is set.;``, `:44` `}`. Giữ nguyên `envNote` cho trường hợp env; thêm `provenanceNote` cho các lớp còn lại, tái dùng đúng chuỗi đã rút lên. Danh sách mục được dựng lại ở `#buildItemsForDefs` — `settings-selector.ts:1280`, đã kiểm đúng.
11. **Viết test.** Mẫu có sẵn: `beginSettingsTest()` / `restoreSettingsTestState()` ở `packages/coding-agent/test/helpers/settings-test-state.ts:13` và `:31`. Mẫu dựng panel thật ở `settings-panel-clear.test.ts:50-65`: dựng `new SettingsSelectorComponent({ availableThinkingLevels: [], thinkingLevel: undefined, availableThemes: ["dark"], providers: [], settings: host, plugins: createPluginSettingsHost(projectDir) }, { onChange: () => {}, onCancel: () => {} })`, rồi gõ `for (const ch of "searxng endpoint") selector.handleInput(ch);` và `selector.handleInput("\n"); selector.handleInput("\x15"); selector.handleInput("\n");`.
12. **KHÔNG thêm changelog.** Neo `packages/coding-agent/CHANGELOG.md:3` → `## [Unreleased]`. Giữ nguyên cả hai mục.

**Hợp đồng test**

**File:** `packages/coding-agent/test/config/settings-provenance-guard.test.ts` (tạo mới — hiện không tồn tại, đã kiểm `ls`).

| # | case | khẳng định | người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | project shadow | khoá **không** có trong `config.yml` sau lượt ghi từ panel; có lại giá trị global trước đó | gõ bật một setting mà `.omp/config.yml` của dự án đã quyết định → panel báo "đã áp dụng" → `config.yml` global lặng lẽ tích tụ giá trị chết |
| 2 | env shadow | khoá không có trong `config.yml` | gõ giá trị, panel báo đã áp dụng, nhưng `$VAR` vẫn chi phối và file vẫn dính giá trị |
| 3 | overlay shadow | khoá không có trong `config.yml` | tương tự, qua overlay `--config` |
| 4 | runtime shadow | khoá không có trong `config.yml` | tương tự, qua runtime override |
| 5 | **đối chứng không-che** | khoá **có** trong `config.yml` sau lượt ghi từ panel | chốt chặn biến thành từ chối trần → `/settings` thành chỉ-đọc với mọi setting mà project config đã định nghĩa |
| 6 | rollback trên đĩa | `YAML.parse(await Bun.file(globalConfigPath).text())` — khoá vắng mặt, phần còn lại của file **không đổi** so với trước lượt ghi | file bị ăn mòn dần theo mỗi lượt ghi bị che |

Case 5 không phải hàng đệm. Nó là thứ bắt đúng lỗi "từ chối trần" mà kế hoạch nêu là chế độ hỏng chính.

**Cần bổ sung (kế hoạch không có, nên thêm):**

| # | case | vì sao phải có |
| --- | --- | --- |
| 7 | `unset` trên khoá bị project che | `settings-selector.ts:1112` là đường ghi thứ 14, chạy qua `host.unset` chứ không qua `host.set` — không case nào ở trên chạm tới nó |
| 8 | `omp config set --json` byte-identical trước/sau khi rút code | kế hoạch đòi "giống hệt từng byte" nhưng không có cổng nào kiểm |

**Cổng có đỏ được không — cả bốn đều chạy được ngay trên máy này** (addon đã build, `file-lock.test.ts` 4 pass / 0 fail). Nhưng cần nói thẳng từng cổng:

- **(1)** `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` → baseline **13**, đỏ được. **Nhưng đây là cổng phủ định: nó chỉ chứng minh được sự vắng mặt của một mẫu, không chứng minh được chốt chặn tồn tại.** Nó không bắt được: đường ghi thứ 14 (`settings.unset(` ở `:1112` — regex là `settings\.set\(` nên **không khớp**); đường ghi thứ 15 viết dưới tên nhận khác (`host.set(`, `this.#settingsHost.set(`); một `set` implementation thứ hai (grep hiện chỉ ra **một**: `createSettingsHost`). Và kế hoạch **tự mâu thuẫn** với nó: bước 9 + cổng (1) nói con số phải là **0**, còn dòng `MILESTONE_4_EXECUTION_PLAN.md:2803` yêu cầu phải **bằng đúng 13**. **Làm theo work item (0), coi 2803 là đoạn đã lỗi thời.**
- **(2)** test project-shadow, đọc `config.yml` → **có** đỏ được, trung thực. **Nhưng nó đã chốt sẵn một quyết định sản phẩm chưa ai chốt:** nó **giả định phương án (a) rollback**. Nếu quyết định sản phẩm chốt phương án (b) — ghi rồi chú thích, đúng như `omp config set` đang làm — thì cổng (2) **vĩnh viễn đỏ** dù code đúng ý định. Một cổng đỏ vì lý do sản phẩm tệ hơn không có cổng. **Phải chốt OQ1 trước khi viết test.**
- **(3)** test đối chứng không-che → **có** đỏ được, trung thực.
- **(4)** `bun run check:ts` → **có** đỏ được, trung thực.

**Các cổng còn thiếu — đều có thể đỏ được, nên phải thêm:**

| cổng đề xuất | lệnh / cách kiểm | đỏ được? |
| --- | --- | --- |
| (5) import chết | `grep -c 'isRecord' packages/coding-agent/src/cli/config-cli.ts` → phải là **0** (baseline: **1**) | CÓ |
| (6) `omp config set` không đổi byte | chạy `omp config set --json` trước và sau, diff output | CÓ |
| (7) không còn định nghĩa cục bộ | `grep -c '^function shadowingSource\|^function globalValue' packages/coding-agent/src/cli/config-cli.ts` → **0** (baseline: **2**) | CÓ |
| (8) import mới có mặt | `grep -c 'from "\.\./config/shadowing"' packages/coding-agent/src/cli/config-cli.ts` → **1** (baseline: **0**) | CÓ |
| (9) `unset` cũng qua chốt chặn | test case 7 ở mục *Hợp đồng test* | CÓ |

Baseline đã đo hôm nay: (5) = 1, (7) = 2, (8) = 0.

**Đừng dùng `grep -c 'shadowingSource'` làm cổng.** Sau khi rút code, file có **hai** dòng chứa `shadowingSource` (import + chỗ gọi), con số y hệt trước đó (hôm nay = **2**). Lệnh đó không phân biệt được trước/sau. Dùng cổng (7)/(8).

**Cảnh báo về cổng (4):** `check:ts` = `check:tools && … check:types`, mà `check:tools` (`package.json:91`) là `oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' …`. Nghĩa là `oxfmt` kiểm **cả format**. Một helper viết tay lệch format sẽ đỏ cổng vì lý do thẩm mỹ. Đỏ thật, nhưng đỏ sai chỗ — hãy chạy `bunx oxfmt` trước khi báo cổng.

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: đường ghi thứ 14 mà kế hoạch không biết — `settings-selector.ts:1112`.** `1112: if (value === "") this.#context.settings.unset(def.path);`. Đây là **đường ghi duy nhất còn lại** trong panel mà không nằm trong danh sách 13, và nó **không khớp regex của cổng (1)**. Nó cũng chính là đường mà test tồn tại sẵn (`settings-panel-clear.test.ts`) đi qua (`\x15` xoá ô → enter). Nếu chốt chặn chỉ nằm trong `set`, người dùng xoá một ô mà project config đang chi phối sẽ thấy giá trị quay lại y nguyên mà không có dòng giải thích nào. Cần một `#clearSetting(host, path)` cùng trả về kết quả, hoặc ít nhất một quyết định tường minh là bỏ qua.
2. **Kiểu `SettingsWriteResult` đặt sai phía — tui không import được từ coding-agent.** Bước 4 của kế hoạch định nghĩa nó trong `settings-ui.ts` (coding-agent), nhưng bước 7 lại bắt tui đọc `result.status` từ `host.set(...)`. Và `settings-defs.ts:134` đang là `set(path: string, value: unknown): void;` — kế hoạch **không nói tới dòng này**, dù file-touched của `settings-defs.ts` chỉ liệt kê "thêm union + thêm `provenance`". Không sửa `:134` thì `#writeSetting` ở tui không thấy trường `status` nào và `check:ts` đỏ. Sửa: đặt `SettingsWriteResult` cùng `SettingsProvenance` trong `settings-defs.ts` (phía tui), và đổi `:134` thành `set(path: string, value: unknown): SettingsWriteResult;`.
3. **`get` trong chốt chặn ≠ giá trị panel hiển thị.** Panel hiển thị: `settings-ui.ts:76` → `get: path => lookup(path)?.layered(settings)`, và `registry.ts:540-544` ghi rõ `layered` là *"Value from the settings layers alone … **ignoring the environment variable** — what the settings panel shows and edits"*. Code shape của kế hoạch dùng `const effective = setting.get(settings);` — `get` **có** env. Hai khác nhau đúng ở trường hợp env. Hệ quả người dùng thấy: sau một lượt ghi bị chặn, ô nhập sẽ vẽ lại **giá trị trước khi ghi**, không phải giá trị vừa gõ. Đây chính là cảm giác "mất dữ liệu" mà OQ1 cảnh báo — và nó xảy ra **kể cả khi bạn chọn phương án (b)**, vì phương án (b) vẫn ghi giá trị mới xuống global nên `layered` trả về giá trị mới. Chọn (a) thì ô lùi về giá trị cũ; chọn (b) thì ô giữ giá trị mới và có dòng chú thích. Phải nói rõ với người dùng.
4. **Trả `false` không dừng được thao tác chỉnh sửa cục bộ.** `#createTextInput` gọi `onChange` **vô điều kiện** ngay sau lượt ghi (`settings-selector.ts:1112-1115`: `:1112` `if (value === "") this.#context.settings.unset(def.path);`, `:1113` `else this.#setSettingValue(def.path, value);`, `:1114` `this.#callbacks.onChange(def.path, this.#context.settings.get(def.path));`, `:1115` `wrappedDone(this.#formatTextInputValue(def, this.#context.settings.get(def.path)));`). Tương tự ở `:1251-1252` và `:1258-1259`. Nếu `#writeSetting` trả `false` mà caller bỏ qua giá trị trả về, panel vẫn `onChange` và vẫn vẽ lại. **Mọi call site phải bắt `false` và bỏ nhánh `onChange`/re-render** — hoặc `#writeSetting` phải tự gọi affordance và caller vẫn phải dừng. OQ3 nêu đúng chỗ này và chưa có câu trả lời.
5. **`tui` KHÔNG có affordance hiển thị thông báo nào.** OQ3 nói `#showInlineStatus` là "tên tượng trưng" — đúng, và nói thêm: **không tồn tại** cái tương tự. Đã grep `showError|showStatus|statusMessage|errorMessage|setStatus|toast|notify|showMessage|renderError|inlineStatus` trong `settings-selector.ts` → **không trả về gì**. Method gần nhất là `#getStatusPreviewString` (`:1304`), thuộc tính năng xem trước status-line, không phải thông báo tức thời. Bạn phải **thêm** affordance mới, hoặc trả thông báo qua `#footerHintText()` (`:572`).
6. **Hai tiền lệ mâu thuẫn — đọc đúng file.** `omp config set` trong repo này (đã đọc `config-cli.ts:282-315`): `:297` ghi trước (`def.setting.set(settings, def.setting.parse(value));`), `:298` `await settings.flush();`, `:306-307` kiểm **sau khi ghi** bằng `globalValue` + `shadowingSource`, `:314` báo cáo — **không** rollback, **không** ném. dsh (đọc `~/Projects/deepseek-harness/packages/boot/config-editor/src/index.ts:127-137`, HEAD `477b4f4`): `:127` `if (!isDeepStrictEqual(effective?.config ?? {}, next)) {`, `:128` ``throw new Error(`Configuration for "${entry.options.id}" is overridden by a home patch or command-line overlay`);``, `:130` `await writeFileAtomic(path, String(document), { mode: 0o600 })`, `:133-137` khối rollback bảo vệ `reconcileProfilePatches`, KHÔNG phải config editor. **Số dòng kế hoạch nêu cho dsh là chính xác từng dòng.**

---


## M4-7. Hợp đồng render có kiểu (sóng C)

**Sóng:** M4 Wave C — Hợp đồng render (`shippable: false` — sáp nhập với M4-4/M4-6 thành một quyết định changelog duy nhất của M4; §6.2 cấm ship bất kỳ sóng M4 nào một mình) | **Effort:** M | **Phụ thuộc:** không có phụ thuộc build (`depends_on` rỗng) — nhưng bị chặn bởi một quy tắc thứ tự: WI-4 của M2 đã có sẵn trong §11 và đã đặc tả xong; mục này chỉ cần chờ nó được thống nhất **trước khi** mở PR.

Một dòng tóm tắt: đưa cho renderer một kênh `rawArgs: { json, complete }` có kiểu trên options object, thực sự forward toàn bộ options object tới renderer của extension (hôm nay hai adapter âm thầm vứt mất bốn trường), và chấm dứt việc `__partialJson` mang hai nghĩa khác nhau cùng lúc.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/tui/src/tools/renderer.ts` | sửa | Thêm `rawArgs?: RawToolArgs` cùng kiểu `RawToolArgs` được export (`{ json: string; complete: boolean }`) vào `RenderResultOptions` (hiện ở :10-27), cạnh `argsComplete?` (:21) và `executionStarted?` (:26) đã có sẵn. | Có (`verified: true`) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Thêm `rawArgs?`, `argsComplete?` và `executionStarted?` vào interface `ToolRenderResultOptions` đang trôi dạt (thực tế ở :606-613, doc comment :605). | Có (`verified: true`) |
| `packages/coding-agent/src/extensibility/extensions/wrapper.ts` | sửa | Trong `RegisteredToolAdapter.renderResult` (:59-65), bỏ cái object literal `{ expanded, isPartial, spinnerFrame }` ở :62, forward thẳng toàn bộ `options`. | Có (`verified: true`) |
| `packages/coding-agent/src/sdk.ts` | sửa | Trong `customToolToDefinition` (:1188), wrapper `renderResult` (:1214-1223) forward toàn bộ `options` thay cho object literal ở :1217. | Có (`verified: true`) |
| `packages/tui/src/chat/tool-execution.ts` | sửa | (1) `updateArgs` (:387-397): giữ fast path so sánh tham chiếu cho args đã decode, nhưng thêm việc tăng `#displayInputVersion` và repaint khi chỉ tiền tố raw đổi; viết lại comment ở :388-391. (2) `ToolExecutionHandle.updateArgs` (:163) và literal `#renderState` (:328-340) có thêm kênh raw để `#rebuildDisplay` (:924-931) publish. (3) Các call site render (:971, :1002, :1129, :1150) không đổi. | Có (`verified: true`) |
| `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts` | sửa | Đưa tiền tố raw ra khỏi `displayArgsForPrefix` (:396-432) như một giá trị riêng, nới rộng shape tối thiểu `ToolArgsRevealComponent` (:5-8) và hai chỗ push `#tick` / `flushAll` (:566, :615) để mang theo nó; ngừng ghi chuỗi raw lên args object nếu câu hỏi mở 1 rơi vào nhánh đổi tên khóa ngoài. | Có (`verified: true`) |
| `packages/coding-agent/src/modes/utils/ui-helpers.ts` | sửa | Đường rebuild giữa stream truyền raw buffer vào constructor của `ToolExecutionComponent` (`:611`) dưới dạng kênh `rawArgs` có kiểu, để card rebuild và card sống render giống nhau. Ở file này **không có** `component.updateArgs(...)` nào để sửa — `grep -n updateArgs ui-helpers.ts` chỉ ra 3 hit, tất cả là `readGroup.updateArgs(...)` tại `:562`, `:576`, `:697`. | Có (`verified: true`) — nhưng plan trỏ sai file, xem bảng đính chính |
| `packages/tui/src/tools/xdev.ts` | sửa | Đổi tên khóa sổ sách device-arg BÊN TRONG do `decodeInnerArgs` (:57) ghi thành tên riêng tư không nhập nhằng, cập nhật phần strip tương ứng trong `displayDeviceArgs` (:113-116). Forward stream raw BÊN NGOÀI sang renderer đã mount qua `options.rawArgs` thay vì lén chuyển qua `args`. | Có (`verified: true`) |
| `packages/tui/src/tools/json-tree.ts` | sửa | Giữ `HIDDEN_ARG_KEYS` (:23) đồng bộ với tên khóa mà việc đổi tên ở xdev sinh ra, để cả bản viết cũ lẫn bản viết mới đều không lộ lên JSON tree đi về phía model. | Có (`verified: true`) |
| `packages/tui/test/tool-execution-xdev-render.test.ts` | sửa | Thêm test (1) và (2) của plan. | Có (`verified: true`) |
| `packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` | tạo | Test quyết định: chứng minh `rawArgs` / `argsComplete` / `executionStarted` sống sót qua CẢ HAI adapter site. | Có (`verified: true`) |

### Các bước

1. **Đọc trước khi sửa.** `sed -n '386,398p' packages/tui/src/chat/tool-execution.ts`, `sed -n '920,935p' packages/tui/src/chat/tool-execution.ts`, `sed -n '326,342p' packages/tui/src/chat/tool-execution.ts`. Comment ở :388-391 phát biểu bất biến mà thay đổi này sẽ làm thành sai: nó nói caller "luôn cấp phát một object args mới ở mỗi delta streamed", nên reference equality nghĩa là "chẳng có gì đáng kể đổi". Câu đó **đúng hôm nay và sai sau thay đổi này**. Đọc `sed -n '396,432p' packages/coding-agent/src/modes/controllers/tool-args-reveal.ts` để thấy chính xác lúc nào một object mới được cấp phát (dòng :424 `rawPrefixChanged` và :427-429) — đó là thứ làm short-circuit hiện tại có lý, và là thứ khiến nó hết lý ngay khi raw channel trở thành side channel. Neo: `packages/tui/src/chat/tool-execution.ts:387-397`.

2. **Khai báo shape raw-args một lần và export nó.** Trong `packages/tui/src/tools/renderer.ts`, thêm ngay trên `RenderResultOptions`: `export interface RawToolArgs { json: string; complete: boolean }`, rồi field `rawArgs?: RawToolArgs;` trên `RenderResultOptions`. Dùng jsdoc theo đúng style hiện có (mọi thành viên của `RenderResultOptions` đều có khối `/** ... */`). Vì `RenderResultContextOptions` (:30) được định nghĩa là `RenderResultOptions & {...}`, signature của built-in renderer ở :75 tự nhận field mới, không cần sửa thêm. Không dùng từ khoá `private`/`public` ở bất kỳ đâu; không dùng `ReturnType<>`. Neo: `packages/tui/src/tools/renderer.ts:10-27`.

3. **Nới rộng `ToolRenderResultOptions` ở surface extension** để public type thôi nói dối. Thêm ba thành viên optional cùng loại (`rawArgs`, `argsComplete`, `executionStarted`) vào interface ở `types.ts:606-613`, mỗi cái kèm jsdoc. Giữ nguyên là `interface` — đây là bề mặt tác giả công khai và phải giữ assignable về cấu trúc với thứ TUI truyền xuống. Không `import type` từ `@oh-my-pi/pi-tui` ở đây: hai package không được type-coupled (file hiện tại không có import đó, thêm vào là một hồi quy về layering). Neo: `packages/coding-agent/src/extensibility/extensions/types.ts:606-613`.

4. **Sửa short-circuit TRƯỚC khi nối channel mới** — thứ tự này mang tính chống đỡ; làm sau sẽ để lại một cửa sổ mà renderer tiêu thụ raw âm thầm đứng hình. Trong `updateArgs` (:387-397) giữ `if (args === this.#args) return;` cho fast path của args đã decode, nhưng đổi nó thành: version vẫn phải tăng khi raw channel đầu vào khác lần cuối đã thấy. Thread giá trị raw vào làm tham số thứ ba: `updateArgs(args: unknown, toolCallId?: string, rawArgs?: RawToolArgs)`. Lưu raw vừa thấy vào một field `#private`. Rồi viết lại comment :388-391 để nói bất biến thật sau thay đổi: args decode so sánh theo tham chiếu, **và** raw channel so sánh theo giá trị, cái nào đổi cũng nghĩa là phải repaint. Phản chiếu tham số optional thứ ba đó trên `ToolExecutionHandle.updateArgs` (tool-execution.ts:163) và shape tối thiểu `ToolArgsRevealComponent` ở tool-args-reveal.ts:7. Cả hai là tham số optional nên mọi caller sẵn có vẫn compile — kiểm bằng `bun run check:ts`. Neo: `packages/tui/src/chat/tool-execution.ts:387-397`.

5. **Publish channel vào render state dùng chung.** Nới rộng literal cấu trúc private `#renderState` ở tool-execution.ts:328-340 bằng `rawArgs?: RawToolArgs` và gán nó trong `#rebuildDisplay` (cạnh các phép gán sẵn có ở :926-930 sao `expanded` / `isPartial` / `argsComplete` / `executionStarted` / `spinnerFrame`). Đọc raw channel từ đúng field `#private` mà bước 4 ghi vào. Xác nhận nhánh custom-renderer (:950) và nhánh built-in (:1041) đều truyền `this.#renderState` — đúng vậy, ở :971 / :1002 / :1129 / :1150 — nên không call site nào cần sửa. Neo: `packages/tui/src/chat/tool-execution.ts:328-340, 924-931`.

6. **Forward toàn bộ options object ở cả hai adapter site** — đây là bước làm field trở thành thật với extension, và là bước mà plan nhận diện đúng là vô hình với `bun check` cũng như với bất kỳ test nào chỉ phủ built-in. `wrapper.ts:62`: thay object literal `{ expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame }` bằng chính tham số `options`. `sdk.ts:1217`: thay tương tự. **Để nguyên `renderCall` ở cả hai file** — wrapper.ts:55-57 và sdk.ts:1212 đã forward `options` nguyên vẹn, "sửa" chúng là thao tác rỗng che mất một bất đối xứng thật khỏi tầm nhìn của người đọc kế tiếp. Tham số ở call site được gõ `any` (wrapper.ts:59) hoặc đã bị cast thu hẹp (tool-execution.ts:996-1001) — ở cả hai trường hợp forward thẳng `options` vẫn là cách đúng; đừng thêm cast để dập tiếng. Lưu ý site thu hẹp thứ ba: `tool-execution.ts:996-1001` cast `tool.renderResult as (..., options: { expanded: boolean; isPartial: boolean; spinnerFrame?: number }, ...)` — tham số ở call site **không** phải `any`, nó **đã là một cast**. Cast đó chỉ có tác dụng lúc compile (runtime vẫn truyền nguyên `this.#renderState`), nên `bun run check:ts` vẫn xanh kể cả khi ba field bị ném — đó là máy phát hiện im lặng mà G1 nói tới. Không cần sửa cast này, nhưng đừng để người đọc tưởng call site được gõ `any` và xoá nó. Neo: `packages/coding-agent/src/extensibility/extensions/wrapper.ts:62`.

7. **Thread tiền tố raw từ đường reveal sống.** Trong `displayArgsForPrefix` (tool-args-reveal.ts:396-432) trả tiền tố raw như thành viên thứ ba của `DisplayArgsStep` trả về, cạnh `{ args, changed }` sẵn có, lấy từ đúng `displayPrefix` tính ở :427 — đừng tính lại, nếu không hai bên có thể lệch nhau ở một frame đã throttle. Đẩy nó vào `#tick` (:613-616, chỉ bên trong guard `if (display.changed)` sẵn có để fast path vẫn nhanh) và trong `flushAll` (:566). **Để `decodeStreamedToolArgs` (:455) yên**: nó là entry point của lần rebuild một-lần và shape trả về của nó bốn test sẵn có assert trực tiếp. Neo: `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts:396-432`.

8. **Thread tiền tố raw từ đường rebuild.** Tại `ui-helpers.ts:604`, `decodeStreamedToolArgs(partialJson, ...)` vốn đã cầm raw buffer trong tay ở tham số đầu tiên — hãy truyền đúng `partialJson` đó làm raw channel khi dựng `ToolExecutionComponent` ở `:611` (constructor nhận thêm tham số `rawArgs`; đây là **call site duy nhất** của đường rebuild, không có `component.updateArgs(...)` nào để sửa — `grep -n updateArgs ui-helpers.ts` chỉ ra 3 hit, tất cả là `readGroup.updateArgs(...)` tại :562, :576, :697 và không liên quan tới `ToolExecutionComponent`). Ternary ở `:604` fallback về `content.arguments` (nhánh ở `:610`) khi `partialJson` falsy; ở nhánh đó không có raw buffer, nên truyền `undefined` và để `rawArgs` vắng mặt thay vì bịa ra chuỗi rỗng. Đây là đường làm card rebuild và card sống render giống nhau, và là đường mà test (2) của plan bảo vệ. Neo: `packages/coding-agent/src/modes/utils/ui-helpers.ts:604-611`.

9. **Giải quyết câu hỏi mở 1 (xem mục "Cần người quyết") rồi mới đụng vào khóa ma thuật.** Nhánh được khuyến nghị: đổi tên khóa BÊN TRONG ghi ở `xdev.ts:57` thành tên private, cập nhật phần strip tương ứng ở `xdev.ts:114`, rồi thêm tên mới vào `HIDDEN_ARG_KEYS` ở `json-tree.ts:23` (giữ luôn `__partialJson` ở đó, vì khóa inner vẫn tồn tại dưới tên mới và khóa outer có thể vẫn tồn tại). Cùng một lượt đó, cho `renderXdevCall` (xdev.ts:145) forward stream raw BÊN NGOÀI sang renderer đã mount qua `options.rawArgs` — hiện nó chỉ forward `args.content` (từ write.ts:467), nên tiền tố raw bên ngoài chưa bao giờ tới được device renderer. Làm bước này **CUỐI CÙNG**, đúng thứ tự plan nói, để channel đã có trước khi khóa mà nó thay thế ngừng được ghi. Neo: `packages/tui/src/tools/xdev.ts:53-59, 113-116`.

10. **Chỉ sửa những test thực sự đổi nghĩa.** Sáu file tham chiếu chuỗi literal `__partialJson` đã được đối chiếu là tồn tại: `packages/coding-agent/test/modes/controllers/event-controller-args-reveal.test.ts`, `packages/coding-agent/test/tool-args-reveal.test.ts`, `packages/coding-agent/test/tools/edit-renderer.test.ts`, `packages/tui/test/bash-render.test.ts`, `packages/tui/test/json-tree-render.test.ts`, `packages/tui/test/tool-execution-custom-repaint.test.ts`. Chúng đọc **output đã render**, không đọc source, nên hợp lệ để sửa dưới AGENTS.md. Đọc từng assertion một và hỏi xem sau khi đổi tên nó còn mô tả hành vi thật không. Một test đang ghim "renderer nhận raw prefix" **không được** lặng lẽ bị viết lại thành "renderer nhận inner args" chỉ vì giờ code làm thế — sự đảo ngược đó đúng là hỏng hóc plan cảnh báo. Dưới nhánh được khuyến nghị (chỉ đổi tên khóa inner) phần lớn sáu file này **không cần** đổi; nếu bạn thấy mình đang viết lại cả sáu, bạn đã đi sang nhánh kia và phải đọc lại câu hỏi mở 1. Neo: `packages/tui/test/tool-execution-custom-repaint.test.ts:88`.

11. **Viết test quyết định ở dạng hạng nhất.** Tạo `packages/coding-agent/test/extensions/raw-args-render-channel.test.ts`. Case 1 (wrapper): dựng một `RegisteredToolAdapter` mà definition cấp `renderResult` bắt tham số thứ hai của nó; gọi `adapter.renderResult(result, options, theme, args)` với options mang `rawArgs`, `argsComplete: true`, `executionStarted: true`; assert cả ba đều tới nơi. Sao chép nguyên văn shape dựng từ `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts:59` — cần `definition` / `extensionPath` / `sourceInfo` (từ `extensionToolSourceInfo`) và một stub `runner`. Case 2 (sdk): gọi `customToolToDefinition({ ..., renderResult })` đã export và assert ba field đó sống sót giống hệt; theo `packages/coding-agent/test/tools/approval.test.ts:216`. **Không test nào được** đọc file source hay dùng `mock.module()` — cả hai đều bị AGENTS.md cấm. Thêm một assertion phủ định thứ ba: một field chưa từng nằm trên options object không được materialize, để cách sửa không trôi thành blanket passthrough kiểu `any`. Neo: `packages/coding-agent/test/extensions/raw-args-render-channel.test.ts`.


### Hình dạng code

```typescript
// packages/tui/src/tools/renderer.ts  (above RenderResultOptions, currently :10-27)
export interface RawToolArgs {
	/** Raw JSON prefix of THIS tool call's argument stream, growing until it closes. */
	json: string;
	/** True once the argument buffer closed (message_end / setArgsComplete). */
	complete: boolean;
}

export interface RenderResultOptions {
	expanded: boolean;
	isPartial: boolean;
	spinnerFrame?: number;
	argsComplete?: boolean;
	executionStarted?: boolean;
	// NEW: the typed channel that replaces the `args.__partialJson` magic key.
	// One meaning only: the OUTER buffer for this tool call. An `xd://` device
	// renderer's own inner-arg prefix does NOT live here — see xdev.ts.
	rawArgs?: RawToolArgs;
}

// packages/tui/src/chat/tool-execution.ts  (:387-397) — BOTH channels must advance the version.
updateArgs(args: unknown, _toolCallId?: string, rawArgs?: RawToolArgs): void {
	// Two independent freshness signals. The decoded args are compared by
	// reference (callers allocate a fresh object on each streamed delta), but the
	// raw channel is compared BY VALUE because it is a side channel: a frame can
	// carry a longer raw prefix while the decoded args object stays identical,
	// and a raw-consuming renderer must still repaint for that frame.
	const argsChanged = args !== this.#args;
	const rawChanged = !!rawArgs?.json && rawArgs.json !== this.#rawArgsJson;
	if (!argsChanged && !rawChanged) return;
	this.#args = args;
	this.#rawArgsJson = rawArgs?.json ?? "";
	this.#renderState.rawArgs = rawArgs;
	this.#displayInputVersion++;   // :394 — must stay AFTER both signals are known
	this.#updateSpinnerAnimation();
	this.#updateDisplay();
}

// packages/coding-agent/src/extensibility/extensions/wrapper.ts:62 — forward, do not rebuild.
this.renderResult = (result: any, options: any, theme: any, args?: any) =>
	registeredTool.definition.renderResult!(result, options, theme as Theme, args);
// Rendered: argsComplete / executionStarted / renderContext / rawArgs all survive.

// packages/coding-agent/src/sdk.ts:1217 — same shape, forwarding `options` untouched.
renderResult: tool.renderResult
	? (result, options, theme): Component =>
			tool.renderResult?.(result, options, theme) ?? ({ render: () => [] } as unknown as Component)
	: undefined,
```

### Hợp đồng test

Ba hợp đồng quan sát được, một trong số là hàng quyết định.

**(1) Đơn điệu của stream bên ngoài** — `packages/tui/test/tool-execution-xdev-render.test.ts`. Stream một `write` có path là `xd://probe` qua các tiền tố argument tăng dần, xuyên qua một `ToolExecutionComponent` thật; `probeTool.renderCall` đã mount ghi lại `options.rawArgs.json` mà nó nhận. Hợp đồng: chuỗi ghi được không giảm theo chiều dài, mỗi chuỗi là tiền tố của chuỗi kế tiếp, và chuỗi cuối là buffer write-call BÊN NGOÀI (chứa `"path":"xd://probe"`), **không** phải payload device bên trong (chứa `"command"`). Người tiêu dùng thấy gì nếu hồi quy: một card `xd://` mà phần preview raw đóng băng ở checkpoint parse đầu tiên, hoặc — đúng lỗi mà mục này sinh ra để chặn — hiện JSON device bên trong trong khi stream bên ngoài vẫn đang lớn dần, khiến card bịu diễn sai mức độ hoàn tất của lệnh gọi.

**(2) Cân bằng giữa rebuild và live** — cùng file. Chạy cùng một tool call hai lần — một lần qua đường reveal sống, một lần qua đường rebuild ở `ui-helpers.ts:605` — và assert cả hai cho render cuối **giống hệt từng byte**. Người tiêu dùng thấy gì nếu hồi quy: card đổi diện mạo khi người dùng đổi theme, bật/tắt một setting, hoặc đổi focus giữa lúc stream. Test này bảo vệ đường thứ ba mà plan định vị sai; lưu ý file plan nêu (`chat-transcript-builder.ts`) hoàn toàn là file khác và sẽ để hợp đồng này không được bảo vệ.

**(3) Hợp đồng đến-tay-adapter** — `packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` — **hàng quyết định**. Một tool được đăng ký qua `registerTool({ renderResult })`, được `RegisteredToolAdapter` bọc lại (và riêng lần nữa bởi `customToolToDefinition`), nhận được `rawArgs`, `argsComplete` và `executionStarted` trên options của nó. Người tiêu dùng thấy gì nếu hồi quy: một extension ngoài repo gate preview streaming của nó trên `options.argsComplete` sẽ render như thể chưa từng có gì hoàn tất, vĩnh viễn, vì field ấy được khai báo trong type rồi bị vứt đi ở adapter. Test này **xanh** trên một cách sửa chỉ thêm field vào interface, và **xanh** trên riêng đường built-in `xd://` — đó chính là điều làm nó thành hàng quyết định, và là thứ duy nhất `bun run check:ts` chứng minh được là không bắt được.

Assertion phủ định bắt buộc trong (3): một field option chưa từng tồn tại không được xuất hiện, để cách sửa adapter không trôi thành passthrough không kiểu mà cũng làm lộ sổ ghi render nội bộ cho extension.

Không phải hợp đồng, đừng test: rằng interface có N thành viên; rằng `rawArgs` tồn tại; rằng code "đã chạy".

### Xác minh


Các câu lệnh phải qua, theo đúng thứ tự:

```bash
bun run check:ts
# BẮT BUỘC: cmake build của opusic-sys cần Ninja; thiếu nó thì build exit 1
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
bun test packages/coding-agent/test/extensions/raw-args-render-channel.test.ts
bun test packages/tui/test/tool-execution-xdev-render.test.ts \
          packages/tui/test/tool-execution-custom-repaint.test.ts \
          packages/coding-agent/test/tool-args-reveal.test.ts
bun test packages/tui/test/ packages/coding-agent/test/
```

Câu lệnh của chính plan, `bun test packages/tui/test/ packages/coding-agent/test/ -t 'render' && bun check`, dùng được nhưng yếu hơn danh sách 1-5 ở trên: bộ lọc `-t 'render'` **không** chọn tên của test quyết định, và `bun check` rộng hơn lẫn chậm hơn `bun run check:ts`. Hãy ưu tiên danh sách liệt kê.

### Cổng hoàn thành

Các cổng đều cơ học và đều có thể đỏ.

- **G1 — ADAPTER REACH (cổng quyết định).** `bun test packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` đỏ trên cây trước thay đổi, xanh sau. Nó đỏ vì `RegisteredToolAdapter.renderResult` nhận `options.argsComplete === true` và assert object bị bắt vẫn còn field đó, trong khi hôm nay wrapper.ts:62 đã ném nó đi. **Cách chứng minh cổng này có răng:** chỉ thêm field `rawArgs` vào hai interface, không sửa gì khác, chạy lại, và quan sát nó vẫn XANH — đó là bằng chứng cổng có hàm vi ngoài một sửa đổi type, và đúng là cái bẫy mà plan nêu tên.
- **G2 — ĐƠN ĐIỆU STREAM.** Trong `packages/tui/test/tool-execution-xdev-render.test.ts`, chuỗi `rawArgs.json` ghi được bị assert không giảm và xích tiền tố, giá trị cuối bị assert có chứa `"path":"xd://probe"` (ngoài) và không phải JSON device bên trong. Đỏ nếu channel được đổ từ decode bên trong, hoặc không bao giờ repaint giữa stream.
- **G3 — CÂN BẰNG REBUILD.** Cùng file: render do rebuild bằng render do live. Đỏ nếu `ui-helpers.ts:605` chưa được nối — một dạng hỏng mà vô hình với cả `bun check` lẫn các test xdev chỉ-phủ-built-in.
- **G4 — PHỦ ĐỊNH KHÓA ẨN.** `HIDDEN_ARG_KEYS` (json-tree.ts:23) phủ tên khóa xdev mới. Assert qua `formatArgsInline` — đúng seam mà `packages/tui/test/json-tree-render.test.ts:32` đã dùng — rằng cả bản viết cũ lẫn bản viết mới đều không xuất hiện trong output. Đỏ ngay lúc ai đó đổi tên xdev.ts:57 mà quên dòng này; đây là rủi ro thầm lặng mà plan nêu.
- **G5 — TYPES + LINT/FORMAT.** `bun run check:ts` thoát 0. Lưu ý lệnh này là `oxlint . && oxfmt --check …` **rồi mới** tới 16 target `check:types` — nó đỏ cả khi jsdoc/format sai, không chỉ khi type sai.


### Phụ thuộc

`depends_on`: rỗng. Không có coupling ở tầng build — đã đối chiếu: không có file `packages/tui/src/tools/renderer-registry`, và ngoài mục này không work item M4 nào chạm `packages/tui/src/tools/`.

`blocks`:

- **M2 WI-4 (bề mặt đăng ký renderer; §6.1)** — chỉ là thứ tự bề mặt. WI-4 không được mang thay đổi của nó vào đường đăng ký renderer của extension trong cùng PR với mục này; mục này đổi `ToolRenderResultOptions` và hai adapter, WI-4 dựng trên hợp đồng sinh ra từ đó. Quy tắc thứ tự của plan là "M4-7 trước, WI-4 sau", và nó được thoả bằng việc mục này land thành commit riêng. Lưu ý: WI-4 đã có sẵn trong §11 của M2 và đã đặc tả xong; chỉ còn cổng thống nhất **trước khi** mục này mở PR.
- **Quyết định changelog của M4 (§6.2)** — Wave C là `shippable: false`. Mục này đổi thứ renderer `xd://` đầu tiên nhận và đổi tên một khóa, cả hai đều người dùng thấy được, nên nó merge như một phần của quyết định changelog M4 duy nhất bao trùm Wave B, C và D. **Không** thêm mục CHANGELOG trong PR này; **không** mở PR trước khi bản viết WI-4 được thống nhất.

### Cách sai dễ nhất

Cách sai nhiều khả năng nhất là giao một thay đổi chỉ nằm trên type, xanh mọi nơi và không chạm tới gì cả. Thêm `rawArgs` vào `RenderResultOptions` và `ToolRenderResultOptions` rồi dừng lại đó sẽ tạo ra: `bun run check:ts` xanh (cả hai interface đều structurally satisfiable), test built-in `xd://` xanh (TUI truyền `this.#renderState` nguyên khối, nên built-in thấy field mới miễn phí), và **không** thay đổi gì với bất kỳ extension nào — vì `wrapper.ts:62` và `sdk.ts:1217` dựng lại options object từ ba field có tên rồi vứt mọi thứ còn lại. Field sẽ được khai báo mà không với tới được, và hai field đã khai báo sẵn `argsComplete` và `executionStarted` vẫn vô hình với extension y như hôm nay. Không gì trong type checker nhìn thấy điều đó, và test built-in cũng không.

Kẻ vế hai là làm sai thứ tự bước: sửa forward ở adapter trước short-circuit ở `updateArgs` sẽ để một renderer tiêu thụ raw bỏ lỡ repaint trong trạng thái trung gian, và đổi tên khóa ma thuật trước khi channel có kiểu tồn tại sẽ để mọi reader built-in (`bash.ts:196-237`, `edit.ts:251`, `eval.ts:98`) đang đọc một khóa không ai ghi nữa. Cả hai hỏng hóc đó đều thầm lặng — chúng sinh ra một card trông hợp lý, không phải một lỗi.

### Cần người quyết

- **Khóa nào được đổi tên?** Plan chỉ nói "Cuối cùng mới bỏ khoá ma thuật" và risk note của nó nói một lần đổi tên "không cập nhật hidden list thì khóa lộ lên JSON tree". Nó không nói khóa nào. Hai ứng viên làm hai việc khác nhau thật sự. **KHUYẾN NGHỊ:** chỉ đổi tên khóa BÊN TRONG ghi ở `xdev.ts:57` (thay đổi 2 site: `xdev.ts:57` và phần strip ở `xdev.ts:114`, cộng `json-tree.ts:23`) và để `rawArgs` thuần túy CỘNG thêm cho stream bên ngoài. Cách đó giữ nguyên `bash.ts` / `edit.ts` / `eval.ts` và để sáu file test ghim literal còn hợp lệ nguyên trạng. Phương án thay thế — bỏ `__partialJson` hoàn toàn khỏi args object bên ngoài và chuyển bash/edit/eval sang `options.rawArgs.json` — là cách đọc khớp với kỳ vọng của plan rằng cả sáu file test cần cập nhật, và nó gấp khoảng 3x diện tích. **Thủ tục quyết định:** đây là quyết định của maintainer, không phải của người triển khai, vì hai nhánh ship lượng churn renderer khác nhau dưới cùng một quyết định changelog.
- **`rawArgs.complete` có dư thừa với `argsComplete` đã có không?** `RenderResultOptions` đã mang `argsComplete?: boolean`, và `rawArgs.complete` nói gần như điều đó. Hai nguồn sự thật cho một sự kiện là rủi ro trôi. **KHUYẾN NGHỊ:** giữ cả hai tạm thời — `argsComplete` bị set từ `setArgsComplete` (một sự kiện vòng đời) còn `rawArgs.complete` mô tả buffer mà renderer thực sự cầm — nhưng nếu người triển khai thấy hai cái có thể lệch nhau, **sự lệch đó chính là phát hiện** và phải được nêu ra chứ đừng xoa dịu.
- **Quyết định changelog M4 (§6.2) có một dòng nói riêng về việc `argsComplete`/`executionStarted` giờ đã tới được extension, tách khỏi dòng nói về đổi tên `__partialJson` không?** Plan coi cách sửa adapter là "cùng một dòng, và nó đóng một bug đang sống" — tức là không riêng biệt nào thấy được bởi người dùng. Hãy xác nhận cách đọc đó trước khi viết PR, vì changelog là một quyết định duy nhất cho cả M4 và một người viết extension ngoài repo đúng là người sẽ nhận ra.
- **`renderContext` có được sửa luôn trong PR này không?** Cùng hai adapter đó cũng ném nó (`#renderState.renderContext` được set ở `tool-execution.ts:960` nhánh custom, và `:1062` + `:1122` nhánh built-in — có bốn chỗ gán nếu tính cả `??=` ở `:885`, không phải hai — và `RenderResultContextOptions` ở renderer.ts:30 sinh ra chính là để mang nó). Plan chỉ nhắc `argsComplete` và `executionStarted`. **KHUYẾN NGHỊ:** đừng sửa ở đây — đó là một thay đổi hành vi quan sát được riêng và mục này đã ở mức churn của cả ba sóng. Nhưng hãy ghi lại là follow-up đã biết, vì để yên nghĩa là cách sửa forward ở adapter vẫn còn dang dở và người đọc kế tiếp sẽ không biết đó là một quyết định.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Plan §M4-7 "Vị trí": `packages/tui/src/chat/chat-transcript-builder.ts:446`, `:454`, `:513` — "đường render thứ ba". | **SAI FILE** — cái neo không tồn tại | Đường thứ ba là `packages/coding-agent/src/modes/utils/ui-helpers.ts:605` (`decodeStreamedToolArgs(partialJson, {...})`, dưới comment "Mid-stream rebuild (theme change, settings, focus replay)"), đi tới constructor của component ở `:611`. `git grep -n 'partialJson\|__partialJson\|decodeStreamedToolArgs' packages/tui/src/chat/chat-transcript-builder.ts` trả về **ZERO** match trên toàn bộ 597 dòng — file đó lo read-group collapsing (`readArgsCollapseIntoGroup`, `#ensureReadGroup`, `normalizeToolArgs`) và không bao giờ chạm raw buffer. Người triển khai theo plan sẽ nối đường rebuild vào một file không có plumbing raw-arg, và test (2) của plan sẽ được viết trên một seam không thể đỏ. |
| Plan §M4-7 "Chi tiết" bước 1: "sửa short-circuit ở `tool-execution.ts:388-394`. Early return ở `:392` nằm trên `#displayInputVersion++` ở `:394`", nên một renderer tiêu thụ raw sẽ không repaint giữa stream" — viết như một khiếm khuyết đang sống. | **ĐỊNH KHUNG SAI** — số dòng đúng, chẩn đoán thì không | Short-circuit **đúng hôm nay**. `displayArgsForPrefix` cấp phát object args mới ở mọi frame mà tiền tố raw lớn lên (`const rawPrefixChanged = entry.exposeRawPartialJson && prefix !== entry.displayPrefix;` ở :424, rồi một literal mới ở :428), trả `changed: true`, và `#tick` chỉ gọi `updateArgs` bên trong `if (display.changed)` (:613-616) — nên identity của args đổi đúng lúc tiền tố raw lớn lên, và `#displayInputVersion++` có bắn. Early return ở :392 là hợp lý. Nó **trở nên không hợp lý** chỉ như hệ quả của bước 2: khi `rawArgs` thành side channel, args decode có thể reference-identical trong khi `rawArgs.json` đã lớn lên, và guard sẽ nuốt mất frame. Nên bước 1 không phải sửa bug, nó là lan can làm bước 2 an toàn — đó là lý do thứ tự mang tính chống đỡ. Chính văn bản của plan ("nhưng phải tiến version khi chỉ phần tiền tố raw đổi") nói đúng yêu cầu; chỉ có cách đóng khung nó là một khiếm khuyết có sẵn là sai, và comment ở :388-391 ("Callers always allocate a new arg object on each streamed delta") trở thành sai **đúng vào thời điểm bước 2 land** và phải được viết lại chứ không được giữ. |
| Plan §M4-7 "Chi tiết" bước 2: "sửa hai adapter ở `wrapper.ts:59-64` và `sdk.ts:1217-1223` để forward toàn bộ options object" — hàm ý cả `renderCall` lẫn `renderResult` đều đang bị thu hẹp ở cả hai site. | **CHẨN ĐOÁN ĐÚNG, PHẠM VI THIẾU** — và plan nêu hai field bị ném trong khi có bốn | Chỉ `renderResult` thu hẹp. `wrapper.ts:55-57` forward `options` nguyên khối cho `renderCall` (`registeredTool.definition.renderCall!(args, options, theme as Theme)`), và `sdk.ts:1212` là tham chiếu trần `renderCall: tool.renderCall` không có wrapper nào. Người triển khai nghĩ "sửa cả hai adapter cho đối xứng" sẽ cào vô nửa `renderCall` cho cào và, tệ hơn, có thể thêm một cast thu hẹp ở đó, làm hỏng đúng con đường đang chạy tốt. Tách riêng: adapter ném **bốn** field chứ không phải hai. Ngoài `argsComplete` và `executionStarted`, chúng còn ném `renderContext`, thứ mà `#rebuildDisplay` set ở tool-execution.ts:960 (nhánh custom) và :1062 + :1122 (nhánh built-in — có bốn chỗ gán nếu tính cả `??=` ở :885, không phải hai) và mà `RenderResultContextOptions` (renderer.ts:30, dùng ở :75) sinh ra chính là để mang nó. Built-in renderer nhận được nó; extension renderer chưa bao giờ có nó. Drift rộng hơn plan nói, và cách sửa vá thêm miễn phí một bug sống thứ ba. |
| Plan §M4-7 "Vị trí": `packages/coding-agent/src/extensibility/extensions/types.ts:581-588` cho `ToolRenderResultOptions`, dùng ở `:661` (`renderCall`) và `:664` (`renderResult`). | **CŨ KHOẢNG 25 DÒNG** | `ToolRenderResultOptions` nằm ở types.ts:606-613 (doc comment :605), không phải 581-588. Các site dùng là types.ts:686 (`renderCall?: (args, options: ToolRenderResultOptions, theme) => Component`) và types.ts:691 (`renderResult?: (result, options, theme, args?) => Component`), không phải :661/:664. Claim thực chất của plan vẫn đứng vững — đã xác minh interface chỉ khai báo `expanded`, `isPartial` và `spinnerFrame`, và thực sự thiếu cả `argsComplete` lẫn `executionStarted` mà `RenderResultOptions` (renderer.ts:10-27) đã mang từ lâu. Chỉ số dòng cần sửa. |
| Plan §M4-7 "Rủi ro" (1): "Sáu file test trỏ tới chuỗi literal." | **XÁC MINH CHÍNH XÁC** | Đúng — đúng sáu file test tham chiếu `__partialJson`. Mang sang nguyên vẹn, kèm caveat: dưới nhánh được khuyến nghị của câu hỏi mở 1 (chỉ đổi tên khóa xdev bên trong) không file nào trong sáu cần sửa, vì cả sáu đều assert trên khóa BÊN NGOÀI. Kỳ vọng của plan rằng chúng "được kỳ vọng phải cập nhật" vì thế chỉ đúng dưới nhánh đổi tên khóa ngoài. Bất kể nhánh nào, cảnh báo của plan vẫn đứng: đọc từng assertion và xác nhận nó còn mô tả hành vi thật — một test ghim "renderer nhận raw prefix" không được lặng lẽ bị đảo thành "renderer nhận inner args". Bằng chứng: `git grep -n '__partialJson' -- packages/*/test/` → `event-controller-args-reveal.test.ts` (:140,:141,:183), `tool-args-reveal.test.ts` (:34,:36,:260), `edit-renderer.test.ts` (:53,:417), `bash-render.test.ts` (:57), `json-tree-render.test.ts` (:32), `tool-execution-custom-repaint.test.ts` (:23,:88,:98,:144,:161). Cả sáu đọc output đã render hoặc trạng thái object sống — không file nào source-grep một file triển khai, nên cả sáu vẫn hợp lệ dưới AGENTS.md. |
| Plan §M4-7 "Phụ thuộc": ràng buộc còn lại duy nhất là ràng buộc thứ tự bề mặt với M2 WI-4, và M4-7 không được mở PR trước khi WI-4 — đã có sẵn trong §11 và đã đặc tả xong — được thống nhất. | **XÁC MINH** — không có coupling tầng build, quy tắc thứ tự được xác nhận | Xác nhận bằng cách soi trực tiếp: `git grep -n 'packages/tui/src/tools/renderer-registry'` không thấy file nào như vậy, và không work item M4 nào ngoài mục này chạm `packages/tui/src/tools/`. Ràng buộc thực sự chỉ là thứ tự tư vấn, không phải coupling build — mục này có thể triển khai và review độc lập, nhưng PR của nó không được merge trước một WI-4 đã được review. Cũng đã xác nhận độc lập bằng chính văn bản gate của plan: Wave C là `shippable: false` và §6.2 nói không sóng M4 nào ship trước quyết định changelog M4 duy nhất bao trùm Wave B, C và D. |

## Cần người xác nhận

Mấy điểm dưới đây là **mâu thuẫn nội tại của chính đặc tả**, không phải mâu thuẫn với plan. Tôi không tự sửa; ghi ra đây để người đọc phải thấy.

- **`gate` tự mâu thuẫn về số lượng cổng.** Nó mở đầu bằng câu "Four gates. Each is mechanical and each can go red." nhưng liệt kê **năm** cổng G1, G2, G3, G4, G5 — rồi tự kết bằng "All five are able to fail on incomplete work." Mục "Cổng hoàn thành" ở trên đã dùng con số năm cho khớp với danh sách. Cần bạn xác nhận đó là **năm** cổng.
- **Số mục §6 khác nhau giữa các trường của spec.** Trường `wave` và `blocks` dùng **§6.2** cho quyết định changelog, còn `plan_corrections` mục 6 dùng **§6.3** cho cờ `shippable` của Wave C. Chưa có mặc định — cần bạn quyết số mục nào là đúng.
- **Hai cách ghi neo cho cùng hai call site trong `tool-args-reveal.ts`, và chúng không mâu thuẫn.** `files_touched` đưa call site (`:566`, `:615`), còn `steps` bước 7 đưa khoảng bao quanh (`#tick` `:613-616`, `flushAll` `:566`). `:615` nằm trọn trong `:613-616`, và cả hai vị trí đều đúng. `steps` chi tiết hơn và là cách đi — không có gì cần xác nhận ở đây.
- **Snippet `code_shape` của `sdk.ts:1217` — đã kiểm, không phải mâu thuẫn.** Nó **là** dạng sau khi sửa: forward thẳng `options`, không có object literal `{ expanded, isPartial, spinnerFrame }` nào. Copy nguyên văn là đúng bước 6. (Dạng trước khi sửa, đọc từ cây thật, là `const component = tool.renderResult?.(result, { expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame }, theme);` tại `sdk.ts:1215-1217` — khác snippet hoàn toàn.)
- **Câu hỏi mở 1 vừa cần người quyết vừa đã có sẵn mặc định.** Spec vừa gọi nó là quyết định của maintainer vì hai nhánh ship lượng churn khác nhau, vừa viết "If nobody decides, take the recommended branch and record the deviation in the PR description." Tôi đã trình bày cả hai vế. Cần bạn xác nhận có thực sự coi đây là quyết định cần chặn, hay mặc định nhánh khuyến nghị đã được uỷ quyền sẵn.



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo neo — đọc trước khi gõ, và đây là cảnh báo quan trọng nhất trong mục này.** Câu mở đầu phiếu, nguyên văn:

> toàn bộ neo trong §M4-7 đã được mở và đọc; **21/55 neo đúng tuyệt đối, 33 neo lệch số dòng (2–46 dòng), 1 neo sai về nội dung (`wrapper.ts` `renderCall` không forward `options` nguyên khối như plan nói), 1 claim sai hoàn toàn (`extensions/types.ts` KHÔNG hề "không type-coupled" với `pi-tui`)**. Vì vậy **đừng dùng số dòng của plan làm neo** — bảng điểm sửa bên dưới đã thay bằng số dòng thật, đã kiểm.

Tức là **hơn 60% neo trong mục này trỏ sai**, và ba trong số đó lệch vào **nhầm vùng code** — sửa `wrapper.ts:62` theo kế hoạch là sửa **dòng khai báo class**. Đã có người bị vấp. Các chi tiết cụ thể:

1. `types.ts:606-613` `ToolRenderResultOptions` → thật là **`:608-615`** (doc comment ở `:607`).
2. `types.ts:686` / `:691` (site dùng) → thật là **`:694`** (`renderCall`) / **`:699`** (`renderResult`).
3. `wrapper.ts:59-65` → class ở **`:62`**, field ở **`:70`**, thân ở **`:92-100`**.
4. `wrapper.ts:62` (object literal) → thật là **`:96`** (lệch +34).
5. `wrapper.ts:55-57` "forward `options` nguyên khối" → **SAI NỘI DUNG**: thật là **`:84-91`**, và nó đi qua `renderOptionsWithTheme` — một **Proxy** (định nghĩa ở `:43-57`) giữ nguyên own-key của options và chỉ bổ sung fallback theme.
6. `wrapper.ts:59` tham số gõ `any` → `:93`.
7. `sdk.ts:1188` `customToolToDefinition` → **`:1200`**; `sdk.ts:1214-1223` wrapper `renderResult` → **`:1225-1235`**; `sdk.ts:1217` object literal → **`:1229`**; `sdk.ts:1212` `renderCall: tool.renderCall` → **`:1224`**.
8. `tool-execution.ts:926-930` → **`:928-932`**; `:924-931` `#rebuildDisplay` → **`:926-932`**; nhánh custom `:950` → **`:958`**; nhánh built-in `:1041` → **`:1049`**; cast `:996-1001` → **`:1004-1009`**; call site render `:971, 1002, 1129, 1150` → thật là **`:979, :1016, :1083, :1137, :1164`** (kế hoạch **thiếu 2 site**, cộng `:1362`); gán `renderContext` `:960, 1062, 1122, 885` → thật **`:968, :1070, :1130, :887`**.
9. `edit-renderer.test.ts:417` → thật **`:405`** (cùng file còn có `:53`).
10. **`types.ts` "không có import `pi-tui`" — SAI HOÀN TOÀN.** File này có **17+ dòng** import `@oh-my-pi/pi-tui/*` (`:68` barrel, `:74 tools/edit`, `:82 theme`, `:90 tools/read`, …), và `packages/coding-agent/src/extensibility/custom-tools/types.ts:22` đã import đúng `RenderResultOptions` từ `@oh-my-pi/pi-tui/tools/renderer`. **Kết luận của kế hoạch vẫn dùng được** (khai báo cấu trúc, giữ surface tác giả công khai ổn định), nhưng **đừng viết lý do "không type-coupled" vào comment hay PR description**, vì reviewer sẽ mở file và thấy ngay.

**Các neo ĐÚNG (dùng nguyên trạng):** `renderer.ts:10-27` / `:21` / `:26` / `:30` / `:75`; `tool-execution.ts:387-397` / `:388-391` / `:392` / `:394` / `:163` / `:328-340`; `tool-args-reveal.ts:5-8` / `:7` / `:396-432` / `:424` / `:427-430` / `:455` / `:566` / `:613-616`; `ui-helpers.ts:604-611` / `:562, 576, 697`; `xdev.ts:57` / `:113-116` / `:145`; `write.ts:467`; `json-tree.ts:23`; `tool-execution-custom-repaint.test.ts:88`; `json-tree-render.test.ts:32`; `issue-5764-…test.ts:59`; `approval.test.ts:216`; `bash.ts:196-237`; `edit.ts:251`; `eval.ts:98`; `chat-transcript-builder.ts` không có raw plumbing (đính chính của kế hoạch **đúng**); `check:ts` có "16 target `check:types`" (đếm được 16); Ninja/cmake/opusic là bắt buộc (`MODULE.bazel:171`); `tool-execution-xdev-render.test.ts` tồn tại (89 dòng, 2 test).

**Cây nào thật sự liên quan:** toàn bộ mục nằm ở cây `ultraworkers` (omp). `pi-ref` **không có neo nào** của M4-7 chạm tới (`grep -rn "__partialJson" packages` → 0 hit; `packages/tui/src/tools/` không tồn tại). Sáu cây tham chiếu còn lại không chứa symbol `RenderResultOptions` / `__partialJson` của work item này. **Đây là work item thuần omp** — mọi claim sai đều sai vì đã lệch so với cây đó.

**Bảng điểm sửa**

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/tui/src/tools/renderer.ts` (`:10-27`) | `RenderResultOptions` | khối `expanded`/`isPartial`/`spinnerFrame?`/`argsComplete?`/`executionStarted?`; đóng `}` ở `:27` | thêm `rawArgs?: RawToolArgs;` ở cuối khối |
| `packages/tui/src/tools/renderer.ts` (trên `:10`) | *(mới)* `RawToolArgs` | — | `export interface RawToolArgs { json: string; complete: boolean }` |
| `packages/coding-agent/src/extensibility/extensions/types.ts` (`:608-615`) | `ToolRenderResultOptions` | `export interface ToolRenderResultOptions {` … `spinnerFrame?: number;` … `}` — chỉ 3 field | thêm `argsComplete?`, `executionStarted?`, `rawArgs?` |
| `packages/coding-agent/src/extensibility/extensions/wrapper.ts` (`:96`) | `RegisteredToolAdapter.renderResult` (ctor `:92-100`) | `{ expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame },` | `options,` (forward nguyên đối tượng) |
| `packages/coding-agent/src/sdk.ts` (`:1229`) | `customToolToDefinition` (`:1200`) → `renderResult` (`:1225-1235`) | `{ expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame },` | `options,` (forward nguyên đối tượng) |
| `packages/tui/src/chat/tool-execution.ts` (`:387-397`) | `ToolExecutionComponent.updateArgs` | `updateArgs(args: unknown, _toolCallId?: string): void {` … `if (args === this.#args) return;` … `this.#displayInputVersion++;` | `updateArgs(args: unknown, _toolCallId?: string, rawArgs?: RawToolArgs): void`; guard so sánh cả `args` (tham chiếu) lẫn `rawArgs.json` (giá trị) |
| `packages/tui/src/chat/tool-execution.ts` (`:163`) | `ToolExecutionHandle.updateArgs` | `updateArgs(args: unknown, toolCallId?: string): void;` | thêm tham số optional thứ ba |
| `packages/tui/src/chat/tool-execution.ts` (`:328-340`) | `#renderState` (type literal + init) | type literal có `spinnerFrame?`, `expanded`, `isPartial`, `argsComplete?`, `executionStarted?`, `renderContext?` | thêm `rawArgs?: RawToolArgs;` vào type literal |
| `packages/tui/src/chat/tool-execution.ts` (`:926-932`) | `#rebuildDisplay` | 5 phép gán `this.#renderState.expanded/isPartial/argsComplete/executionStarted/spinnerFrame` (`:928-932`) | thêm `this.#renderState.rawArgs = this.#rawArgs;` |
| `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts` (`:7`) | `ToolArgsRevealComponent` | `updateArgs(args: unknown, toolCallId?: string): void;` | thêm tham số optional thứ ba |
| `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts` (`:396-432`) | `displayArgsForPrefix` → `DisplayArgsStep` | trả `{ args, changed }` | thêm thành viên raw vào step trả về, lấy từ `displayPrefix` ở `:427` |
| `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts` (`:615`, `:566`) | `#tick` / `flushAll` | `entry.component.updateArgs(display.args, id);` / `entry.component.updateArgs(displayArgsForPrefix(entry, entry.target, true).args, id);` | truyền thêm raw channel làm tham số thứ ba |
| `packages/coding-agent/src/modes/controllers/event-controller.ts` (`:1434`, `:1750`) | hai call site `component.updateArgs(...)` | `component.updateArgs(renderArgs, content.id);` / `component.updateArgs(event.args, event.toolCallId);` | truyền raw channel — **file KHÔNG có trong danh sách file của kế hoạch** |
| `packages/coding-agent/src/modes/utils/ui-helpers.ts` (`:604-611`) | ternary `renderArgs` + `new ToolExecutionComponent(` | `decodeStreamedToolArgs(partialJson, {...})` → `: content.arguments;` → `new ToolExecutionComponent(renderToolName, renderArgs, {...}, ...)` | truyền `partialJson` vào constructor dưới dạng `rawArgs` |
| `packages/tui/src/tools/xdev.ts` (`:57`, `:114`) | `decodeInnerArgs` / `displayDeviceArgs` | `args.__partialJson = raw;` / `const { __partialJson: _partial, ...rest } = args;` | đổi tên khóa inner thành tên private ở cả hai chỗ (**sau khi** câu hỏi mở 1 được giải quyết) |
| `packages/tui/src/tools/xdev.ts` (`:159`, `:168`, `:191`) | `renderXdevCall` / `renderXdevResult` | `renderer.renderCall(args, options, theme);` | forward tiền tố raw **bên ngoài** qua `options.rawArgs` |
| `packages/tui/src/tools/json-tree.ts` (`:23`) | `HIDDEN_ARG_KEYS` | `const HIDDEN_ARG_KEYS = { [INTENT_FIELD]: 1, __partialJson: 1 };` | thêm tên khóa inner mới (giữ `__partialJson`) |

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc)

1. **Đọc trước khi sửa (bắt buộc).** `sed -n '387,397p' packages/tui/src/chat/tool-execution.ts`, `sed -n '424,431p' packages/coding-agent/src/modes/controllers/tool-args-reveal.ts`, `sed -n '543p' …/tool-args-reveal.ts`, `sed -n '396,403p' packages/tui/src/tools/renderer.ts`. Comment ở `tool-execution.ts:388-391` là *"Reference-equality short-circuit before any further work. Callers always allocate a new arg object on each streamed delta (see event-controller.ts and ui-helpers.ts), so a same-reference assignment signals 'nothing meaningful changed' and the renderer can skip."* Câu đó **đúng hôm nay** (`tool-args-reveal.ts:424` `const rawPrefixChanged = entry.exposeRawPartialJson && prefix !== entry.displayPrefix;` → literal mới ở `:428` → `changed: true` → `#tick` gọi `updateArgs` ở `:615`) và **sai ngay khi bước 2 land**. **Phải viết lại, không được giữ.**
2. **Khai báo + export `RawToolArgs`.** `packages/tui/src/tools/renderer.ts`, chèn ngay trên dòng `:10`: interface có hai thành viên `json` (raw JSON prefix của argument stream của CHÍNH tool call này, lớn dần tới khi đóng) và `complete` (true một khi buffer đóng — `message_end` / `setArgsComplete`). Rồi thêm `rawArgs?: RawToolArgs;` vào cuối `RenderResultOptions` (ngay sau `executionStarted?: boolean;` ở `:26`). Kiểu `RenderResultContextOptions` ở `:30` là `RenderResultOptions & { renderContext?: … }` → signature built-in ở `:75` (`options: RenderResultContextOptions`) **tự nhận field mới, không sửa thêm**. Không dùng `private`/`public`; không dùng `ReturnType<>`. Import vào `tool-execution.ts` bằng `import type { RawToolArgs } from "../tools/renderer";` (file đó đã import nhiều thứ từ `../tools/*`, xem `:19-27`).
3. **Nới rộng `ToolRenderResultOptions`.** `packages/coding-agent/src/extensibility/extensions/types.ts`, interface ở **`:608-615`** (doc comment ở **`:607`**), thêm ba thành viên optional kèm jsdoc. **Cần người quyết (xem cạm bẫy 4):** kế hoạch bảo "không `import type` từ `@oh-my-pi/pi-tui` vì hai package không type-coupled" — lý do đó **sai**, nhưng kết luận thì vẫn dùng được. Tóm lại: khai báo cấu trúc, đừng import.
4. **Sửa short-circuit TRƯỚC khi nối channel mới (thứ tự chống đỡ).** `packages/tui/src/chat/tool-execution.ts:387-397`: thân mới tách hai tín hiệu tươi độc lập — `const argsChanged = args !== this.#args;` và `const rawChanged = !!rawArgs?.json && rawArgs.json !== this.#rawArgsJson;` rồi `if (!argsChanged && !rawChanged) return;`, sau đó gán `this.#args = args;` và `this.#rawArgsJson = rawArgs?.json ?? "";`, rồi `this.#displayInputVersion++;` (dòng `:394` — **phải nằm SAU cả hai tín hiệu**), `this.#updateSpinnerAnimation();`, `this.#updateDisplay();`. Lý do: args đã decode so sánh theo tham chiếu (caller cấp phát object mới ở mỗi delta streamed), nhưng raw channel so sánh **THEO GIÁ TRỊ** vì nó là side channel — một frame có thể mang tiền tố raw dài hơn trong khi object args đã decode giữ nguyên tham chiếu, và renderer tiêu thụ raw vẫn phải repaint cho frame đó. Phản chiếu tham số optional thứ ba trên `tool-execution.ts:163` và `tool-args-reveal.ts:7`; cả hai là optional nên caller cũ vẫn compile.
5. **Publish channel vào `#renderState`.** Nới type literal `#renderState` ở `tool-execution.ts:328-340` bằng `rawArgs?: RawToolArgs;`, rồi gán trong `#rebuildDisplay` (hàm bắt đầu ở **`:926`**), ngay sau khối gán sẵn có ở **`:928-932`**. **Không call site render nào cần sửa** — `this.#renderState` được truyền nguyên khối ở `:979` (custom `renderCall`), `:1016` (custom `renderResult`), `:1083` (built-in multi-file `renderResult`), `:1137` (built-in `renderCall`), `:1164` (built-in `renderResult`), `:1362` (default card).
6. **Forward toàn bộ options ở CẢ HAI adapter site.** Đây là bước làm field trở thành thật, và là bước mà **không type-checker nào bắt được**. Ở `packages/coding-agent/src/extensibility/extensions/wrapper.ts:96`: TRƯỚC là `{ expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame },` → SAU là `options,`. Ở `packages/coding-agent/src/sdk.ts:1229` — y hệt. **Đừng đụng `renderCall`.** Ở `wrapper.ts:84-91` nó forward qua `renderOptionsWithTheme(options, theme as Theme)` — một `Proxy` (định nghĩa ở `:43-57`) giữ nguyên own-key của options và chỉ bổ sung fallback theme, không mất field nào. Ở `sdk.ts:1224` nó là `renderCall: tool.renderCall` — tham chiếu trần, không có wrapper. **Đừng xoá cast** ở `tool-execution.ts:1004-1009` (`tool.renderResult as (…, options: { expanded: boolean; isPartial: boolean; spinnerFrame?: number }, …)`): cast chỉ có tác dụng lúc compile, runtime vẫn truyền `this.#renderState` — nên `bun run check:ts` **vẫn xanh kể cả khi field bị ném**.
7. **Thread tiền tố raw từ đường reveal sống.** Trong `displayArgsForPrefix` (`tool-args-reveal.ts:396-432`), trả tiền tố raw như **thành viên thứ ba** của step trả về, lấy từ **đúng** `displayPrefix` tính ở `:427` — **đừng tính lại**, nếu không hai bên lệch nhau ở frame đã throttle. Đẩy vào **cả ba** chỗ gọi `updateArgs` trên component thật: `#tick` ở `:615` (chỉ bên trong guard `if (display.changed)` sẵn có ở `:614`), `flushAll` ở `:566`, và **`event-controller.ts` `message_update` ở `:1434`** (kế hoạch không liệt kê). **Để `decodeStreamedToolArgs` (`:455`) yên** — shape trả về của nó có test assert trực tiếp.
8. **Thread tiền tố raw từ đường rebuild.** `ui-helpers.ts:604-611`. `decodeStreamedToolArgs(partialJson, {...})` vốn đã cầm raw buffer ở tham số đầu tiên — truyền đúng `partialJson` đó vào constructor `new ToolExecutionComponent(` ở `:611`. Nhánh fallback ở `:610` (`: content.arguments` khi `partialJson` falsy) **không có raw buffer** → truyền `undefined`, đừng bịa chuỗi rỗng. Xác nhận: `grep -n updateArgs packages/coding-agent/src/modes/utils/ui-helpers.ts` → đúng **3 hit**, tất cả là `readGroup.updateArgs(...)` ở `:562`, `:576`, `:697` — **không có** `component.updateArgs(...)` nào trong file này. Kế hoạch ghi đúng.
9. **Câu hỏi mở 1 (đổi tên khóa magic), CUỐI CÙNG.** Sáu writer của `__partialJson` trong `src`: `tool-args-reveal.ts:380` `return { __partialJson: "" };` (outer, init rỗng), `:399` `const args = { input: prefix, __partialJson: prefix };` (outer), `:428` `{ ...entry.parsedArgs, __partialJson: displayPrefix }` (outer), `:457` `{ input: partialJson, __partialJson: partialJson }` (outer), `:463` `args.__partialJson = partialJson;` (outer), và **`xdev.ts:57`** `args.__partialJson = raw;` — **INNER, kẻ phá luật duy nhất**. Nhánh **được khuyến nghị**: chỉ đổi tên writer `xdev.ts:57` + strip `xdev.ts:114` + đăng ký tên mới vào `json-tree.ts:23`. `bash.ts:196/197/206/237`, `edit.ts:251`, `eval.ts:98` đọc **outer** → **không đụng tới**, và sáu file test ghim literal **không cần sửa**. Vì sao `HIDDEN_ARG_KEYS` là backstop thật (không phải phòng thủ hình thức): `decodeInnerArgs` output đi tới **ba** nơi, chỉ một nơi được strip — `xdev.ts:128` → `displayDeviceArgs(args)` (**đã strip**), `xdev.ts:159` → `renderer.renderCall(args, options, theme)` (**KHÔNG strip**), `xdev.ts:162` → `renderDefaultToolExecution({ label, args, options }, theme)` (**KHÔNG strip**) → đi thẳng vào `formatArgsInline`. Cùng một lượt đó, cho `renderXdevCall` forward tiền tố raw **bên ngoài** qua `options.rawArgs`: hôm nay nó chỉ nhận `args.content` (từ `write.ts:467`, `renderXdevCall(xdev.name, args.content, options, uiTheme, options.renderContext?.resolveXdevMounted)`), nên buffer ngoài **chưa bao giờ** tới được device renderer.
10. **Chỉ sửa test thực sự đổi nghĩa.** Sáu file tham chiếu `__partialJson` (đã đối chiếu tồn tại, đọc **output đã render** chứ không source-grep): `coding-agent/test/tool-args-reveal.test.ts:34,36,260` · `coding-agent/test/tools/edit-renderer.test.ts:53,405` *(kế hoạch ghi `:417` — lệch)* · `coding-agent/test/modes/controllers/event-controller-args-reveal.test.ts:140,141,183` · `tui/test/bash-render.test.ts:57` · `tui/test/json-tree-render.test.ts:32` · `tui/test/tool-execution-custom-repaint.test.ts:23,88,98,144,161`. Dưới nhánh khuyến nghị (chỉ đổi tên khóa inner) **không file nào cần sửa**. **Nếu bạn thấy mình đang viết lại cả sáu → bạn đã đi sang nhánh kia → đọc lại câu hỏi mở 1.**
11. **Viết test quyết định (hàng nhất)** — xem mục *Hợp đồng test*.

**Hợp đồng test**

Ba hợp đồng quan sát được, một trong số là hàng quyết định.

**(1) Đơn điệu của stream bên ngoài** — `packages/tui/test/tool-execution-xdev-render.test.ts`. File này tồn tại, 89 dòng, có 2 test sẵn (`:72` và `:80`). Thêm test mới: stream một `write` có path `xd://probe` qua các tiền tố argument tăng dần, xuyên qua một `ToolExecutionComponent` thật. `probeTool.renderCall` (hiện là `() => new Text("PROBE-CALL", 0, 0)` ở `:26` — cần đổi thành nhận `(args, options)`) ghi lại `options.rawArgs.json` mỗi lần được mount. Assert: chuỗi ghi được không giảm theo chiều dài; mỗi chuỗi là tiền tố của chuỗi kế tiếp; chuỗi cuối **chứa** `"path":"xd://probe"` và **không** phải JSON device bên trong. **Người dùng thấy gì nếu hồi quy:** một card `xd://` đóng băng phần preview raw ở checkpoint parse đầu tiên, hoặc hiện JSON device **bên trong** trong khi stream **bên ngoài** vẫn đang lớn dần — card bịu diễn sai mức độ hoàn tất của lệnh gọi.

**(2) Cân bằng giữa rebuild và live** — cùng file. Chạy cùng một tool call hai lần — một lần qua đường reveal sống (`event-controller.ts` → `#tick`), một lần qua đường rebuild (`ui-helpers.ts:605`) — assert render cuối **giống hệt từng byte**. **Người dùng thấy gì nếu hồi quy:** card **đổi diện mạo** khi người dùng đổi theme, bật/tắt một setting, hoặc đổi focus giữa lúc stream. Test này bảo vệ **đường thứ ba mà kế hoạch định vị sai file**: file kế hoạch nêu (`chat-transcript-builder.ts`) **hoàn toàn không có plumbing raw-arg** — đã kiểm: `grep -c 'partialJson\|__partialJson\|decodeStreamedToolArgs' packages/tui/src/chat/chat-transcript-builder.ts` → **0** trên 597 dòng. Nếu theo kế hoạch, test này được viết trên một seam **không thể đỏ**.

**(3) Hợp đồng đến-tay-adapter** — `packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` — **HÀNG QUYẾT ĐỊNH**.

- **Case 1 (wrapper):** dựng `RegisteredToolAdapter` mà `definition` cấp `renderResult` bắt tham số thứ hai. Gọi `adapter.renderResult(result, options, theme, args)` với `options` mang `rawArgs`, `argsComplete: true`, `executionStarted: true`. Assert cả ba tới nơi. Shape dựng tool: sao chép `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts:59-73` (`definition` / `extensionPath` / `sourceInfo` từ `extensionToolSourceInfo` — import từ **`.../extensions/loader`**, không phải `source-info` — và stub `runner`).
- **Case 2 (sdk):** gọi `customToolToDefinition({ ..., renderResult })` đã export, assert ba field sống sót giống hệt. Theo `packages/coding-agent/test/tools/approval.test.ts:216`.
- **Case 3 (phủ định, bắt buộc):** một field chưa từng nằm trên options object không được materialize → để cách sửa không trôi thành blanket passthrough và không làm lộ sổ ghi render nội bộ.
- **Cấm:** không test nào được đọc file source, không `mock.module()` (AGENTS.md).
- **Người dùng thấy gì nếu hồi quy:** một extension ngoài repo gate preview streaming trên `options.argsComplete` sẽ render như thể chưa từng có gì hoàn tất, **vĩnh viễn** — vì field được khai báo trong type rồi bị vứt ở adapter.
- **Đừng test:** rằng interface có N thành viên; rằng `rawArgs` tồn tại; rằng code "đã chạy".

**Cổng có đỏ được không — mỗi cổng dưới đây đã được CHẠY THẬT trên cây trước thay đổi. Không cổng nào ở đây là cổng xanh.**

**G1 — ADAPTER REACH (cổng quyết định) — ĐỎ ĐƯỢC, đã chứng minh bằng chạy:**
```bash
bun test packages/coding-agent/test/extensions/raw-args-render-channel.test.ts
```
Đã chạy, kết quả thật:
```
(fail) rawArgs render channel survives both adapters > wrapper: RegisteredToolAdapter forwards every options field
       Expected: true   Received: undefined
(fail) rawArgs render channel survives both adapters > sdk: customToolToDefinition forwards every options field
       Expected: true   Received: undefined
 1 pass  2 fail
```
Probe bổ sung in ra đúng cái adapter giữ lại:
```
WRAPPER captured keys: [ "expanded", "isPartial", "spinnerFrame" ]
SDK captured keys:     [ "expanded", "isPartial", "spinnerFrame" ]
```
**Cách chứng minh cổng này có răng (bắt buộc làm trước khi mở PR):** chỉ thêm field `rawArgs` vào **hai interface**, **không sửa gì khác**, chạy lại, quan sát nó vẫn **XANH**. Đó là bằng chứng cổng có hàm vi ngoài một sửa đổi type. Lý do kỹ thuật: assertion của test soi **runtime keys**, mà type bị erase — nên một sửa đổi thuần type không thể đổi kết quả. Test case 3 (phủ định) hôm nay **xanh sẵn** vì literal ba-field của adapter vốn đã thỏa; nó chỉ bảo vệ sau khi sửa, chống việc trôi thành spread `any`.

**G2 — ĐƠN ĐIỆU STREAM — ĐỎ ĐƯỢC, đã chứng minh bằng chạy:**
```bash
bun test packages/tui/test/tool-execution-xdev-render.test.ts
```
Probe chạy thật trên `renderXdevCall` + `ToolExecutionComponent` thật, in ra:
```
XDEV device renderer args keys:       [ "command", "__partialJson" ]
XDEV device renderer args.__partialJson: {"command":"Write-Output 42
XDEV device renderer options keys:    [ "expanded", "isPartial", "executionStarted", "argsComplete" ]
XDEV outer raw buffer was:            {"path":"xd://probe","content":"{\"command\":\"Write-Output 42\"}
LIVE options has rawArgs?:            false
```
Nghĩa là: device renderer hôm nay nhận **payload device bên trong** làm `__partialJson`, và `options` **không có** key `rawArgs` nào. Test assert `options.rawArgs.json` chứa `"path":"xd://probe"` sẽ **đỏ ngay** — không cần suy luận.

**G3 — CÂN BẰNG REBUILD — ĐỎ ĐƯỢC, nhưng CHƯA chạy (cần code mới để đỏ).** Cùng file `tool-execution-xdev-render.test.ts`. Cơ chế đỏ (chưa verify bằng chạy, nói thẳng): `ui-helpers.ts:604-611` dựng `ToolExecutionComponent` mà **không** truyền raw channel, trong khi đường live sẽ có. Hai card cùng một tool call sẽ khác nhau → assert "byte-for-byte equal" đỏ. Cách làm nó đỏ ngay, không cần chờ code mới: tạm thêm vào test một bản dựng card thủ công **không** truyền `rawArgs`, rồi so với bản dựng qua `ui-helpers`. Hoặc đơn giản hơn: sau khi bước 8 xong mà bỏ sót `ui-helpers.ts`, test đỏ — đó là hành vi cần bảo vệ. **Không được** viết test này trên `chat-transcript-builder.ts`.

**G4 — PHỦ ĐỊNH KHÓA ẨN — ĐỎ ĐƯỢC, đã chứng minh bằng chạy:**
```bash
bun test packages/tui/test/json-tree-render.test.ts
```
Seam: `formatArgsInline` (`json-tree.ts:74`), dùng filter `if (key in HIDDEN_ARG_KEYS) continue;` ở `:97`. Test sẵn có ở `json-tree-render.test.ts:31-34` với câu `test("hidden meta keys are skipped", …)`. Probe chạy thật với một tên khóa **chưa** đăng ký in ra (nguyên văn, ngoài code span vì chứa dấu nháy kép lồng nhau): **G4 probe output:** `__xdInnerPrefix="{"command":"x", path="xd://probe"`. Nó **lộ ra**. Đỏ ngay lúc ai đó đổi tên `xdev.ts:57` mà quên `json-tree.ts:23`. Đây là rủi ro thầm lặng kế hoạch cảnh báo — và nó thật, vì `xdev.ts:159` và `xdev.ts:162` truyền inner args **không strip** thẳng tới `formatArgsInline`.

**G5 — TYPES + LINT/FORMAT — ĐỎ ĐƯỢC, đã chứng minh bằng chạy:**
```bash
bun run check:ts
```
Đã xác minh: `check:ts` = `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`; `check:tools` = `oxlint . && oxfmt --check …`; và **đúng 16 package** có `check:types` (đã đếm: agent, ai, browser-relay, catalog, coding-agent, collab-web, metaharness, mnemopi, natives, omptype, snapcompact, stats, tui, typescript-edit-benchmark, utils, wire). Chứng minh đỏ: file .ts sai format trong glob → `oxfmt --check` exit **1** (đã chạy, output `Format issues found in above 1 files`). Nên cổng này đỏ được cả khi jsdoc sai, không chỉ khi type sai.

**Thứ tự chạy (giữ nguyên):**
```bash
bun run check:ts
# BẮT BUỘC: build native của packages/natives đi qua Bazel → opusic-sys → cmake + Ninja.
# Thiếu Ninja thì build exit 1 với "CMake was unable to find a build program
# corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
# Nguồn: MODULE.bazel:171 "# opusic-sys builds its bundled Opus via `cmake` and selects Ninja from PATH."
# Máy này đã có: /opt/homebrew/bin/ninja, /opt/homebrew/bin/cmake
brew install ninja   # chỉ khi thiếu
bun --cwd=packages/natives run build
bun test packages/coding-agent/test/extensions/raw-args-render-channel.test.ts
bun test packages/tui/test/tool-execution-xdev-render.test.ts \
          packages/tui/test/tool-execution-custom-repaint.test.ts \
          packages/coding-agent/test/tool-args-reveal.test.ts
bun test packages/tui/test/ packages/coding-agent/test/
```
Baseline đã đo: `bun test packages/tui/test/tool-execution-xdev-render.test.ts packages/tui/test/tool-execution-custom-repaint.test.ts` → **9 pass, 0 fail**.

Câu lệnh của kế hoạch, `bun test packages/tui/test/ packages/coding-agent/test/ -t 'render' && bun check`, **yếu hơn**: `-t 'render'` không chọn tên test quyết định, và `bun check` rộng hơn lẫn chậm hơn `bun run check:ts`.

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: thay đổi chỉ nằm trên type — xanh mọi nơi, không chạm gì cả.** Thêm `rawArgs` vào hai interface rồi dừng. `bun run check:ts` xanh (cả hai interface đều structurally satisfiable), test built-in `xd://` xanh (TUI truyền `this.#renderState` nguyên khối nên built-in thấy field mới **miễn phí**), và **không** thay đổi gì với extension nào — vì `wrapper.ts:96` và `sdk.ts:1229` dựng lại object từ ba field có tên rồi vứt mọi thứ còn lại. Field được khai báo mà không với tới được. **Không gì trong type checker nhìn thấy.** Riêng cast ở `tool-execution.ts:1004-1009` càng che: nó chỉ có tác dụng lúc compile, runtime vẫn truyền `this.#renderState` — nên `check:ts` xanh kể cả khi field bị ném. Đó chính là máy phát hiện im lặng.
2. **Đảo ngược thứ tự bước.** Sửa forward ở adapter **trước** short-circuit ở `updateArgs` → renderer tiêu thụ raw bỏ lỡ repaint ở trạng thái trung gian. Đổi tên khóa magic **trước** khi channel có kiểu tồn tại → mọi reader built-in (`bash.ts:196-237`, `edit.ts:251`, `eval.ts:98`) đọc một khóa không ai ghi nữa. Cả hai hỏng hóc **thầm lặng** — sinh ra một card trông hợp lý, không phải một lỗi.
3. **Tin số dòng của kế hoạch.** 33/55 neo lệch 2–46 dòng, và ba trong số đó lệch vào **nhầm vùng code**. Sửa `wrapper.ts:62` theo kế hoạch = sửa dòng khai báo class. Đã có người bị vấp.
4. **Cứu `renderCall` cho "đối xứng".** `renderCall` ở `wrapper.ts` **không** hề bị thu hẹp. Thêm cast hay wrapper ở đó là phá đúng con đường đang chạy tốt. (Và kế hoạch mô tả sai nó là "forward nguyên khối" — nó đi qua `renderOptionsWithTheme` Proxy.)
5. **Để một test đang ghim hành vi thật bị viết lại thành hành vi mới.** Một test ghim "renderer nhận raw prefix" không được lặng lẽ đổi thành "renderer nhận inner args" chỉ vì giờ code làm thế. Sự đảo ngược đó đúng là hỏng hóc kế hoạch cảnh báo.
6. **Dùng lại `rawArgs` cho cả hai nghĩa.** `__partialJson` hôm nay mang **hai** nghĩa: outer (5 writer trong `tool-args-reveal.ts`) và inner (1 writer ở `xdev.ts:57`). Nếu bạn định nghĩa `RawToolArgs` là "buffer của lời gọi này" rồi đổ cả hai vào cùng một field, bạn vừa hồi sinh đúng cái mơ hồ mà mục này sinh ra để diệt. Contract phải là: `rawArgs` = **outer, một nghĩa duy nhất**; inner tiền tố của device không sống ở đây.
7. **Cắt ngang `event-controller.ts`.** Đã kiểm toàn bộ `grep -rn "updateArgs" packages/tui/src packages/coding-agent/src`: ngoài `:615` và `:566` mà kế hoạch nêu, còn có **`event-controller.ts` `message_update` `:1434`** và **`tool_execution_start` `:1750`**, cùng `gallery-fixtures/fs.ts:65, :66` (fixture, không sao). Và `new ToolExecutionComponent(` xuất hiện ở **hai** nơi chứ không phải một: `ui-helpers.ts:611` (đường rebuild, kế hoạch nêu) và **`event-controller.ts:1406` (đường live, dựng card lần đầu từ `message_update` — kế hoạch không nêu)**. Vì sao quan trọng: `setTarget` (`tool-args-reveal.ts:501-544`) **không** gọi `component.updateArgs` — nó chỉ `return displayArgsForPrefix(...)` ở `:543`. Nếu bạn chỉ đẩy raw ở hai đường kế hoạch nêu, thì ở `:1434` (đường **chính** của `message_update`) raw channel sẽ không bao giờ được nạp — và đó là nơi `entry.displayArgs` có thể trả về **cùng tham chiếu** khi `parsedChanged` lẫn `rawPrefixChanged` đều false (`:425`), tức đúng trường hợp mà guard ở `tool-execution.ts:392` nuốt frame. → **Sửa bước 7 và bước 8: phải nối `event-controller.ts:1406` (constructor) và `:1434` / `:1750` (updateArgs), và thêm `event-controller.ts` vào danh sách file cần chạm.** Đây là phần mở rộng ngoài phạm vi kế hoạch, cần nói với maintainer.

**Câu hỏi mở — cần người quyết trước khi mở PR**

- **(a) `ToolRenderResultOptions` có import `RawToolArgs` từ `@oh-my-pi/pi-tui` không?** Kế hoạch bảo không, với lý do "hai package không được type-coupled". **Lý do đó sai** — `types.ts` có 17+ dòng import `@oh-my-pi/pi-tui/*`, và `custom-tools/types.ts:22` đã import đúng `RenderResultOptions` từ `@oh-my-pi/pi-tui/tools/renderer`. **Kết luận của kế hoạch vẫn dùng được** (khai báo cấu trúc, giữ surface tác giả công khai ổn định), nhưng **đừng viết lý do đó vào comment hay PR description** — reviewer sẽ mở file và thấy ngay. Nếu muốn một nguồn sự thật duy nhất thì `export type ToolRenderResultOptions = RenderResultOptions;` là đường đi, nhưng nó đổi tính danh của public type → quyết định của maintainer.
- **(b) Khóa nào được đổi tên?** Khuyến nghị: **chỉ** writer `xdev.ts:57` (inner) + strip `xdev.ts:114` + đăng ký `json-tree.ts:23`. Nhánh thay thế (bỏ `__partialJson` khỏi args ngoài, chuyển bash/edit/eval sang `options.rawArgs.json`) khớp với kỳ vọng của kế hoạch rằng sáu file test cần cập nhật, và gấp ~3× diện tích. Đây là quyết định của maintainer, không phải người triển khai.
- **(c) `rawArgs.complete` có dư thừa với `argsComplete` không?** `RenderResultOptions` đã mang `argsComplete?: boolean`. Khuyến nghị: giữ cả hai tạm — `argsComplete` là sự kiện vòng đời (set từ `setArgsComplete`), `rawArgs.complete` mô tả buffer renderer thật sự cầm. **Nếu thấy hai cái lệch nhau, đó là phát hiện — phải nêu ra, đừng xoa dịu.**
- **(d) `renderContext` có sửa luôn không?** Cùng hai adapter cũng ném nó. Gán ở `tool-execution.ts:887` (`??=`), `:968` (custom), `:1070` + `:1130` (built-in) — **bốn chỗ**. `RenderResultContextOptions` (`renderer.ts:30`) sinh ra chính là để mang nó. Khuyến nghị: **đừng sửa ở đây** (là thay đổi hành vi quan sát được riêng, mục này đã ở mức churn cả ba sóng) — nhưng **phải ghi lại là follow-up đã biết**, vì để yên nghĩa là cách sửa forward vẫn còn dang dở và người đọc kế tiếp sẽ không biết đó là một quyết định.
- **(e) Dòng changelog.** Adapter-forward sửa một bug đang sống mà không ai nhìn thấy. Xác nhận trước khi viết PR rằng nó gộp vào cùng một dòng với việc đổi tên `__partialJson` — vì một người viết extension ngoài repo đúng là người sẽ nhận ra.

**Ràng buộc thứ tự (giữ nguyên, đã đối chiếu):** `depends_on` rỗng — không có coupling tầng build. Wave C là `shippable: false`. Mục này merge như một phần của **quyết định changelog M4 duy nhất** bao trùm Wave B, C, D. **Không** thêm mục CHANGELOG trong PR này. Thứ tự bề mặt với **M2 WI-4**: mục này land thành commit riêng, trước WI-4. PR không được merge trước một WI-4 đã được review.

---


## M4-9. Khả năng nhìn thấy triage (sóng D)

**Sóng:** M4 Wave D — Khả năng nhìn thấy triage (`shippable: false`, chờ cổng changelog dùng chung của M4, plan §6.2/§6.3)
**Effort:** S cho phương án (a) (~1 ngày: 2 file mới + 2 file sửa + 1 test). M cho phương án (b) (~2-3 ngày: (a) cộng thêm một thay đổi shared-core trong `capability/index.ts` và một thay đổi 6 call site trong `state-manager.ts`). Phán quyết "S là lạc quan" của plan là đúng cho (b), còn (a) thực sự là S.
**Phụ thuộc:** Bắt buộc phải merge trước khi ship — M2 WI-2 (thứ tự nạp extension xác định + giải quyết va chạm tường minh). **CHƯA ĐẠT** tính đến 2026-09-27: `packages/coding-agent/test/extension-load-order-determinism.test.ts` không tồn tại và `git grep -n 'extension-load-order' packages/coding-agent/` trả về 0 hit, nên deliverable của WI-2 chưa có trong cây. Ngoài ra không phụ thuộc gì khác — phương án (a) không đụng shared core.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli/extensions-triage-cli.ts` | tạo | Module triển khai mới. Phép chiếu thuần tuý trên `loadAllExtensions`: nhân bản đúng tuyến ACP gồm `Settings.init()` + `cfgDisabledExtensions.get(sm)` để CLI và dashboard cùng đồng ý về trạng thái disable, ánh xạ mỗi `Extension` thành `ExtensionTriageRow`, in dòng đã khử vệ sinh hoặc `--json`. Không thêm state, không suy diễn shadowing, không ghi settings. | có (file chưa tồn tại — `ls packages/coding-agent/src/cli/` không thấy file extensions-triage nào; thư mục có sẵn và chứa 33 module `*-cli.ts` anh em (`ls packages/coding-agent/src/cli/*-cli.ts \| wc -l` → 33; tổng 62 mục trong thư mục tính cả `command-help.ts`, `flag-tables.ts`, `args.ts` và 3 thư mục con — không phải 44 như bản nháp trước)) |
| `packages/coding-agent/src/commands/extensions-triage.ts` | tạo | Lớp `Command` kiểu oclif mỏng: `export default class ExtensionsTriage extends Command` với `static description`, cờ `json: Flags.boolean()` và `run()` phân tích tham số rồi bàn giao cho `runExtensionsTriage`. Phải `export default` vì `cli-commands.ts` làm `.then(m => m.default)`. | có — **KHÔNG có trong plan**. Bắt buộc: `cli-commands.ts:99` cho thấy mọi entry nạp `./commands/<name>.ts` qua dynamic import giải về `.default` (ví dụ `load: () => import("./commands/config").then(m => m.default)`). Plan chỉ nêu file `-cli.ts` nên làm đúng chữ nghĩa plan sẽ tạo ra một file mà registry không định tuyến tới. Thư mục này đã có 50 wrapper như vậy; `commands/config.ts` là tham chiếu nhỏ nhất và đầy đủ. |
| `packages/coding-agent/src/cli/command-help.ts` | sửa | Thêm `export const extensionsTriageHelp = { description: "..." } satisfies CommandMetadata;` cạnh ~49 help entry còn lại. Cần để bộ render help nhẹ và `CommandMetadata` help giữ đồng bộ. | có — cùng lỗi thiếu trong plan. Đã xác nhận hình dạng tại `command-help.ts:3-5` (`acpHelp`) và interface `CommandMetadata` tại `packages/utils/src/cli.ts:136-142` (`{description?, hidden?, flags?, args?, examples?}`). |
| `packages/coding-agent/src/cli-commands.ts` | sửa | Thêm một `CommandEntry` vào mảng `commands` đã export: `{ name: "extensions-triage", load: () => import("./commands/extensions-triage").then(m => m.default), help: commandHelp.extensionsTriageHelp }`. Đây là toàn bộ phần nối cần thiết để `runCli` tuyến `omp extensions-triage` thay vì chuyển argv cho LLM như một prompt. | có (file tồn tại; header module ghi rõ thêm entry ở đây là đủ để chiếm argv, và dẫn #1496 — "args silently leak to the LLM" — là hồi quy mà tách bạch này chặn. `load:` dynamic import là bề mặt lazy-loading được thành lập và được cho phép; luật cấm inline import trong AGENTS.md chi phối import helper và kiểu, và cả 50 entry hiện có đều dùng đúng hình thức này) |
| `packages/coding-agent/test/extensions-triage-cli.test.ts` | tạo | Test hợp đồng cho phép chiếu. Dựng cây fixture với một skill cùng tên ở hai cấp để đúng một rơi vào `shadowed`, chạy `toTriageRow` trên output thật của `loadAllExtensions`, và khẳng định câu hỏi triage trả lời được: mỗi extension xuất hiện đúng một lần, state lấy từ union thật, có một dòng shadowed và nó mang `shadowedBy === undefined` (khoảng trống đã ghi nhận), và một dòng bị chính sách disable mang `disabledReason` của nó. | có (file mới; thư mục test tồn tại. Tham chiếu: `packages/coding-agent/test/extensions-discovery.test.ts` (32 KB) và `packages/coding-agent/test/discovery/disabled-extensions.test.ts` đã khai thác `loadAllExtensions` — đọc chúng trước và dùng lại fixture-tree helper thay vì bịa cây thứ hai. Không `mock.module()`; dùng `vi.spyOn` trên module đã import với `vi.restoreAllMocks()` trong `afterEach`.) |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Added`, mở đầu bằng kết quả người dùng thấy: ``Added `omp extensions-triage`, a read-only inventory of every discovered extension with its load state and the disable policy that blocked it (--json for machine-readable output)``. Không kể chuyện nguyên nhân gốc. | có — nhưng **BỊ CHẶN** bởi phép uỷ quyền changelog của Wave D: plan §6.3 đánh dấu Wave D là `shippable: false` và §6.2 nói cả ba sóng M4 còn sống gộp dưới một quyết định changelog duy nhất. Chưa ghi dòng này cho tới khi phép uỷ quyền tồn tại; theo AGENTS.md, kế hoạch này không bao giờ tự soạn changelog. |
| `packages/coding-agent/src/capability/index.ts` | sửa | **CHỈ phương án (b).** Đổi `seen` từ `Set<string>` thành `Map<string, Item>` và cả hai phép tính `aliasSeen` từ `.some()` sang `.find()` để phần tử thắng khôi phục được, rồi ghi nó là `_shadowedBy` tại hai chỗ `_shadowed = true` sẵn có. Ngày nay hai chỗ đó chỉ là boolean trần và phần tử thắng bị vứt. | có — mọi neo xác nhận bằng grep thật: `seen = new Set<string>()` tại `:228`; `seen.has(key)` tại `:242` và `:264`; `seen.add(key)` tại `:255` và `:265`; `deduped.some(...)` tại `:246` và `:269`; `item._shadowed = true` đúng tại `:247` và `:271`; đường sống sót tại `:273`. Plan nêu `:247` và `:271` là chỗ sửa và đúng, nhưng bỏ sót việc `:228`/`:246`/`:269` phải đổi trước, nếu không thì bản sửa là một thao tác rỗng. |
| `packages/coding-agent/src/capability/types.ts` | sửa | **CHỈ phương án (b).** Thêm trường `_shadowedBy` vào kiểu giao của item để trường mới được định kiểu tại biên thay vì ép kiểu ở nơi tiêu thụ. `CapabilityResult.all` đã được tài liệu hoá là "All items including shadowed duplicates (for diagnostics)" — đây chính là kênh chẩn đoán được cho phép. | có — `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>` xác nhận tại `types.ts:165`. Cùng kiểu giao nội tuyến đó bị lặp ở `capability/index.ts:144`, `:145`, `:146`, `:211`, `:218` — tất cả phải có trường mới, nếu không phép gán ở `:247`/`:271` sẽ không type-check. |
| `packages/coding-agent/src/modes/components/extensions/state-manager.ts` | sửa | **CHỈ phương án (b).** Truyền một `getShadowedBy` thật ở cả sáu call site `addItems` để `Extension.shadowedBy` được lấp đầy cho mọi kind. | có — `loadAllExtensions` xác nhận tại `:69`. Lệnh đọc `shadowedBy: opts?.getShadowedBy?.(item)` ở `:103` và khai báo kiểu `getShadowedBy?: (item: T) => string \| undefined;` ở `:81` là **hai** tham chiếu duy nhất trong toàn repo. Cả sáu call site (`:116`, `:127`, `:138`, `:149`, `:209`, `:220`) đã xác nhận bằng grep và không call site nào truyền option, nên trường luôn là `undefined` ngày nay. `resolveState` được gọi ở `:86-89` và còn ở `:180`, `:236`, `:267` cho các kind mcp/hook/file, vốn dựng hàng của chúng bằng tay chứ không qua `addItems` — bốn chỗ đó cần cùng cách xử lý, nếu không các kind mcp/hook/context-file vẫn là `undefined` ngay cả sau (b). |

### Các bước

1. **Ghi lại quyết định phạm vi trước khi viết code.** Chọn (a) hẹp — CLI chỉ báo `state` / `disabledReason` / `shadowed`, không bao giờ báo nguồn che khuất — hay (b) đầy đủ — ngoài ra làm cho `shadowedBy` có thật. Viết lựa chọn cùng một câu lý do vào mô tả PR. (a) là khuyến nghị: không cần đổi shared core, trả lời đúng câu hỏi triage ("plugin của tôi có nạp không, và chính sách nào chặn nó"), và giữ thay đổi `capability/index.ts` ra khỏi một PR CLI. (b) là một thay đổi thật sự đối với trạng thái khám phá dùng chung và xứng đáng có lần review riêng. Neo: plan COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:11524-11545 — đầu đề "M4-9 — CLI inventory trên loadAllExtensions", mục "Tiền đề của dossier là sai, và tôi đã kiểm", và hai nhánh (a)/ (b) tại :11538-11539. (Số dòng cũ 7982-8012 trỏ sang work item khác — đã sửa.)
2. **Xác nhận M2 WI-2 đã merge.** Cổng là sự tồn tại của `packages/coding-agent/test/extension-load-order-determinism.test.ts`. Nếu nó không có, DỪNG — mục này bị chặn. Ngày 2026-09-27 nó không tồn tại, nên M4-9 hiện chưa khởi động được và phải xếp hàng sau WI-2. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts` (vắng mặt tại 9cfbaba).
3. **Đọc hai nơi tiêu thụ hiện có trước khi thiết kế hình dạng hàng:** `isShadowedExtension` cùng interface `Extension` trong package tui, và các renderer `enablementLabel` / `#getStatusBadge`. Chúng quyết định một dòng shadowed được phép trông thế nào, và chúng đã render một chuỗi "Shadowed by X" mà hôm nay không bao giờ nhận được giá trị — hãy quyết có chủ đích xem CLI có nên dùng lại đúng cách diễn đạt đó hay giữ độc lập với nó. Neo: `packages/tui/src/overlays/extensions/types.ts:68` (`shadowedBy`), `:83` (`isShadowedExtension`); `inspector-model.ts:466-482`; `inspector-panel.ts:654-661` (đã đối chiếu: `types.ts:68` shadowedBy, `types.ts:83` isShadowedExtension, `inspector-model.ts:466` enablementLabel, `inspector-panel.ts:654` `#getStatusBadge` — cả bốn đều đúng).
4. **Phương án (a):** tạo `packages/coding-agent/src/cli/extensions-triage-cli.ts`. Export một hàm thuần `toTriageRow(ext: Extension): ExtensionTriageRow` và một `runExtensionsTriage(args)` làm `Settings.init()` rồi `cfgDisabledExtensions.get(sm)` rồi `loadAllExtensions(cwd, disabledIds)`. Đối số `disabledIds` là toàn bộ tròng game: truyền `undefined` khiến loader vẫn đọc `cfg` bên trong nhưng để lại Set `disabledExtensions` của `resolveState` rỗng, nên các disable ở cấp item sẽ ra `active` ở đây và `disabled` ở dashboard. Nhân bản chính xác `acp-agent.ts:1191-1193`. Neo: `packages/coding-agent/src/cli/extensions-triage-cli.ts` (mới); lấy làm mẫu `packages/coding-agent/src/modes/acp/acp-agent.ts:1191-1193`.
5. **Phương án (a):** phần hiển thị. `--json` phát `{ "extensions": [...] }` (tiền lệ: `omp config --json`, `omp skill --json`). Đầu ra người đọc là mỗi hàng một dòng: id, state, `disabledReason` trong ngoặc, provider, đường dẫn đã rút gọn. Chạy đường dẫn qua `shortenPath` và tab qua `replaceTabs` từ helper trung tâm — không tự chế hằng số cắt chuỗi. Dùng `console.log`: đây là CLI độc lập thoát ra mà không vào TUI, điều AGENTS.md cho phép tường minh. Nếu sau này đầu ra được render bên trong TUI thì chuyển sang `logger` tại điểm đó, không phải sớm hơn. Neo: `packages/coding-agent/src/cli/extensions-triage-cli.ts`; helper theo AGENTS.md mục "TUI Sanitization".
6. **Phương án (a):** tạo `packages/coding-agent/src/commands/extensions-triage.ts` làm lớp `Command` mỏng với cờ boolean `json`, import module triển khai bằng import **top-level** (không bao giờ `await import`), và `export default class`. Neo: `packages/coding-agent/src/commands/extensions-triage.ts` (mới); tham chiếu `packages/coding-agent/src/commands/config.ts`.
7. **Phương án (a):** thêm `extensionsTriageHelp` vào `command-help.ts` dùng dạng `{ description } satisfies CommandMetadata`. Neo: `packages/coding-agent/src/cli/command-help.ts` (sửa quanh `:3`).
8. **Phương án (a):** đăng ký lệnh trong `cli-commands.ts` — một entry trong mảng `commands`. Chính một sửa đổi này làm `runCli` tuyến `omp extensions-triage` tới lệnh thay vì rò rỉ argv cho LLM như một prompt (hồi quy #1496 mà header module cảnh báo). Neo: `packages/coding-agent/src/cli-commands.ts:98-101` (entry `config`, để xem hình dạng).
9. **Chỉ phương án (b), sau khi bước 1 chọn (b):** trong `capability/index.ts` đổi `seen` thành `Map<string, T & { _source: SourceMeta }>`, đổi hai phép tính alias `deduped.some(...)` thành `.find(...)`, và tại mỗi chỗ `_shadowed = true` gán phần tử thắng — `seen.get(key)` cho nhánh `keySeen`, phần tử trúng `.find()` cho nhánh `aliasSeen`. Cũng phải `seen.set(key, item)` trên cả đường sống sót lẫn đường bị dập. Cập nhật các kiểu giao nội tuyến lặp ở `:144`/`:145`/`:146`/`:211`/`:218` và kiểu công khai ở `types.ts:165` để mang `_shadowedBy`. Neo: `packages/coding-agent/src/capability/index.ts:228, :242, :246, :247, :255, :264, :265, :269, :271, :273`; `packages/coding-agent/src/capability/types.ts:165`.
10. **Chỉ phương án (b):** luồn phần tử thắng vào `state-manager`. Cấp `getShadowedBy` ở cả **SÁU** call site `addItems`, và nối tay cùng phép đọc đó ở ba chỗ dựng hàng bằng tay (mcp `:180`, hook `:236`, context-file `:267`) vốn đi vòng hẳn qua `addItems`. Bỏ sót bất kỳ chỗ nào thì kind đó vĩnh viễn là `undefined` — và vì trường là optional và vắng mặt trong im lặng, không gì sẽ fail ồn ào. Neo: `packages/coding-agent/src/modes/components/extensions/state-manager.ts:81, :103, :116, :127, :138, :149, :180, :209, :220, :236, :267`.
11. **Viết test hợp đồng.** Fixture: một skill có **cùng tên** xuất hiện ở cả cấp user và cấp project, nên đúng một hàng là shadowed; thêm một hàng bị provider disable để có `disabledReason`. Khẳng định câu hỏi triage chứ không phải tên trường: (1) mọi extension được khám phá đều xuất hiện đúng một lần, khoá theo id; (2) state của mỗi hàng là một trong các giá trị `ExtensionState` thật; (3) có một hàng shadowed **và** `shadowedBy` của nó là undefined — dưới (a) đó là hợp đồng đã ghi nhận mà một đợt refactor sau phải được báo để xem lại, dưới (b) đó là hồi quy chứng minh phần tử thắng đã được ghi; (4) một hàng bị chính sách disable mang `disabledReason` khác rỗng và khác `"shadowed"`; (5) mọi `disabledReason` khác rỗng đều thuộc union `Extension["disabledReason"]` thật (`DisabledReason`), không phải một chuỗi tự do. KHÔNG khẳng định `shadowedBy` là undefined như một sự thật vĩnh viễn — hãy khẳng định theo hướng ứng với phương án đã chọn. Neo: `packages/coding-agent/test/extensions-triage-cli.test.ts` (mới).
12. **Chạy cổng:** `bun run check:ts`, rồi `bun test packages/coding-agent/test/extensions-triage-cli.test.ts`. KHÔNG dùng `bun test packages/coding-agent/test/ -t 'acp'` của plan — xem plan_corrections ở bảng dưới; bộ lọc đó khớp theo TÊN test, và một test triage không mang tên "acp", nên câu lệnh sẽ xanh mà chưa từng chạy mã mới. Nếu native addon chưa build, `bun test` báo 0 pass kèm "Failed to load pi_natives native addon for darwin-arm64"; hãy build nó hoặc coi test là chưa chạy. Neo: `package.json:94` (`check:ts`), `:89` (`test`).
13. **Chạy thử binary thật trên cây thật:** `omp extensions-triage` và `omp extensions-triage --json`, rồi đối chiếu tập hàng với dashboard `/extensions` cho cùng cwd. Chúng phải khớp. Lệch nghĩa là phần nhân bản `disabledIds` ở bước 4 đã sai. Chỉ sau khi điều đó qua mới xin phép uỷ quyền changelog Wave D và viết dòng CHANGELOG một dòng. Neo: `packages/coding-agent/CHANGELOG.md` dưới `## [Unreleased]` → `### Added`.

### Hình dạng code

```ts
// packages/coding-agent/src/cli/extensions-triage-cli.ts  (option (a), the thin projection)
//
// RULE: this module must NOT re-derive state, shadowing, or disable policy. Every
// value below is read off the Extension rows loadAllExtensions already produced. If a
// field you need is missing, the fix is upstream (option (b)), never a local guess.

import { Settings } from "../config/settings";
import { cfgDisabledExtensions } from "../extensibility/settings";
import { loadAllExtensions } from "../modes/components/extensions/state-manager";
import { replaceTabs, shortenPath, truncateToWidth, TRUNCATE_LENGTHS } from "@oh-my-pi/pi-tui/render/render-utils";
import type { Extension } from "@oh-my-pi/pi-tui/overlays/extensions/types";

// Row shape is a strict subset of Extension — no new vocabulary, and no widening either.
export interface ExtensionTriageRow {
	id: string;
	kind: Extension["kind"];
	name: string;
	state: Extension["state"];
	disabledReason?: Extension["disabledReason"];
	shadowedBy?: string;
	sourceProvider: string;
	sourceLevel: string;
	path: string;
}

export interface ExtensionTriageArgs {
	flags: { json: boolean; cwd?: string };
}

// Pure projection — export it so the test can assert on it without spawning a process.
export function toTriageRow(ext: Extension): ExtensionTriageRow {
	return {
		id: ext.id,
		kind: ext.kind,
		name: ext.name,
		state: ext.state,
		disabledReason: ext.disabledReason,
		// Always undefined today. Exposed on purpose: option (a) documents the gap
		// rather than hiding it. See plan_corrections #2.
		shadowedBy: ext.shadowedBy,
		sourceProvider: ext.source.provider,
		sourceLevel: ext.source.level,
		path: ext.path,
	};
}

export async function runExtensionsTriage(args: ExtensionTriageArgs): Promise<void> {
	// MUST mirror packages/coding-agent/src/modes/acp/acp-agent.ts:1191-1193.
	// Passing undefined here makes resolveState's disabledExtensions Set empty, so
	// item-level-disabled rows render as `active` here and `disabled` in the TUI.
	const sm = await Settings.init();
	const disabledIds = cfgDisabledExtensions.get(sm);

	const extensions = await loadAllExtensions(args.flags.cwd, disabledIds);
	const rows = extensions.map(toTriageRow);

	if (args.flags.json) {
		// Standalone CLI that exits without entering the TUI: console.log is allowed
		// here per AGENTS.md "Logging and CLI Output". Keep structured stdout clean.
		console.log(JSON.stringify({ extensions: rows }, null, 2));
		return;
	}

	// Sanitize before printing (AGENTS.md "TUI Sanitization"): tabs -> spaces via replaceTabs(),
	// paths -> ~ via shortenPath(). No ad-hoc truncation constants.
	for (const row of rows) {
		const reason = row.disabledReason ? ` (${row.disabledReason})` : "";
		const line = replaceTabs(`${row.id} ${row.state}${reason} ${row.sourceProvider} ${shortenPath(row.path)}`);
		console.log(truncateToWidth(line, TRUNCATE_LENGTHS.LINE));
	}
}

// ---------------------------------------------------------------------------
// packages/coding-agent/src/commands/extensions-triage.ts  (thin Command wrapper)
// Every registered command in cli-commands.ts follows this exact three-part shape:
//   src/commands/<name>.ts   — oclif-style Command subclass, `export default class`
//   src/cli/<name>-cli.ts     — the implementation module, top-level imported
//   src/cli/command-help.ts   — a `{ description } satisfies CommandMetadata` entry
// See packages/coding-agent/src/commands/config.ts as the reference.
// ---------------------------------------------------------------------------

// import { Command, Flags } from "@oh-my-pi/pi-utils/cli";
// import { extensionsTriageHelp as commandHelp } from "../cli/command-help";
// import { type ExtensionTriageArgs, runExtensionsTriage } from "../cli/extensions-triage-cli";
//
// export default class ExtensionsTriage extends Command {
// 	static description = commandHelp.description;
// 	static flags = { json: Flags.boolean({ description: "Output JSON" }) };
//
// 	async run(): Promise<void> {
// 		const { flags } = await this.parse(ExtensionsTriage);
// 		const cmd: ExtensionTriageArgs = { flags: { json: flags.json } };
// 		await runExtensionsTriage(cmd);
// 	}
// }

// ---------------------------------------------------------------------------
// OPTION (b) — the upstream half, ONLY if the decision gate selects it.
// packages/coding-agent/src/capability/index.ts
//
// `seen` currently holds KEYS ONLY, so the winning item is unrecoverable at the
// keySeen branch; `aliasSeen` uses `.some()`, which returns a boolean, not the
// matching element. Both must change or _shadowedBy stays undefined silently.
//
//   :228  const seen = new Set<string>();
//      -> const seen = new Map<string, T & { _source: SourceMeta }>();
//
//   :242  const keySeen = key !== undefined && seen.has(key);
//   :246  deduped.some(existing => !disabledItems.has(existing) && equivalent(existing, item));
//   :247  if (keySeen || aliasSeen) item._shadowed = true;
//      -> const aliasHit = ... .find(existing => ...) // find, not some
//      -> const winner = keySeen ? seen.get(key) : aliasHit;
//      -> if (winner) { item._shadowed = true; item._shadowedBy = winner._source; }
//
//   :255  if (key !== undefined) seen.add(key);            // suppressed branch: seen.set(key, item)
//   :264  const keySeen = seen.has(key);
//   :265  seen.add(key);                                   // seen.set(key, item)
//   :266-269 aliasSeen ... deduped.some(...)               // -> .find(...)
//   :271  item._shadowed = true;                           // record winner as above
//
//   :273  deduped.push(item)  (winner path)                 // seen.set(key, item) here too
//
// Then thread the winner out through the item type (capability/types.ts:165, and the
// inline intersection types at index.ts:144-146) and hand a real getter to addItems:
//   packages/coding-agent/src/modes/components/extensions/state-manager.ts
//     :103  shadowedBy: opts?.getShadowedBy?.(item),
//   Six call sites must start passing one (:116 skills, :127 rules, :138 tools,
//   :149 native modules, :209 prompts, :220 slash commands) — e.g.
//     addItems(skills.all, "skill", { ..., getShadowedBy: s => shadowSourceOf(s) });
// Skipping any one of the six leaves that kind reporting undefined forever.
```

Khối trên dùng `replaceTabs`/`shortenPath`/`truncateToWidth`/`TRUNCATE_LENGTHS` từ `@oh-my-pi/pi-tui/render/render-utils` (đã xác minh tồn tại; xem `load-errors.ts:1` và `lsp/tool.ts:16` làm khuôn mẫu). Dùng SPACE làm dấu phân cột, không dùng `\t` — tab thô vừa làm hỏng cột, vừa lọt tab do người dùng cấu hình vào `name`/`disabledReason`/`sourceProvider` ra TUI.

### Hợp đồng test

File test: `packages/coding-agent/test/extensions-triage-cli.test.ts` (mới), cộng với hai file đã có để **đọc lấy fixture chứ không nhân bản**: `packages/coding-agent/test/extensions-discovery.test.ts` và `packages/coding-agent/test/discovery/disabled-extensions.test.ts`. Dưới phương án (b), phần khẳng định phần tử thắng được ghi phải nằm trong suite capability (`packages/coding-agent/test/capability/*.test.ts`), ở đúng tầng sở hữu `seen`/`deduped` chứ không đi qua CLI.

Diễn đạt hợp đồng: **nếu hồi quy, người dùng thấy** một câu trả lời sai cho câu hỏi mà lệnh này sinh ra để trả lời. Cụ thể, với một cây fixture có một skill cùng tên ở hai cấp ưu tiên và một extension bị chính sách disable chặn, `omp extensions-triage` (cả dạng `--json`) phải phát đúng **một hàng cho mỗi** extension được khám phá, mỗi hàng mang một state lấy từ union state thật và, với bất kỳ hàng nào không active, lý do chặn — và tập hàng đó phải khớp với những gì dashboard `/extensions` hiện ra cho cùng cwd.

Điều đó có nghĩa thế nào với người dùng: nếu nó hồi quy, một người dùng có plugin âm thầm không nạp được sẽ được báo rằng plugin đã nạp và đang active, nên họ sẽ debug nhầm tầng hoàn toàn. Toàn bộ mục đích của lệnh là làm cho câu hỏi "đã nạp nhưng bị chặn, và bị cái gì chặn" trả lời được mà không cần mở TUI.

Dưới phương án (a) còn có một hợp đồng thứ hai mang tính cố ý: một hàng shadowed báo `shadowedBy === undefined`. Điều đó đóng đinh khoảng trống hiện tại, để một đợt refactor sau này bắt đầu điền trường đó biết phải quay lại xem test này thay vì lặng lẽ đổi điều CLI tuyên bố. Dưới phương án (b), cùng phép khẳng định đó lật thành hồi quy test cho bản sửa: một hàng shadowed **phải** nêu nguồn che khuất của nó, và nếu một refactor đưa trở lại `item._shadowed = true` trần thì test đỏ thay vì trường lặng lặng quay về undefined.

### Xác minh

```bash
# Cổng tự động
# 0. TIỀN ĐỀ MÔI TRƯỜNG (đặt trước mọi lệnh `bun test`): addon chưa có thì mọi test
#    đỏ vì "Failed to load pi_natives native addon for darwin-arm64" — đỏ vì môi
#    trường, KHÔNG phải đỏ vì công việc. Cổng (2)-(5) khi đó là "chưa chạy".
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

bun run check:ts
bun test packages/coding-agent/test/extensions-triage-cli.test.ts

# CHỈ phương án (b) thêm:
bun test packages/coding-agent/test/capability/ packages/coding-agent/test/extensions-discovery.test.ts packages/coding-agent/test/discovery/disabled-extensions.test.ts

# THEO DÕI HỒI QUY sau khi thay đổi: bản sửa dedup đụng vào khám phá dùng chung
# và inspector là một nơi tiêu thụ sống của shadowedBy
bun test packages/coding-agent/test/extensions-runner.test.ts packages/coding-agent/test/extension-dashboard-mcp-parity.test.ts packages/tui/test/extension-inspector.test.ts

# ĐỒNG NHẤT CLI vs DASHBOARD — tự động hoá được, khuôn mẫu đã có sẵn:
bun test packages/coding-agent/test/extensions-triage-cli.test.ts   # dòng parity mới, dựng theo extension-dashboard-mcp-parity.test.ts:24-77

# (giữ lại bước thủ công như bước xác nhận lần hai, KHÔNG phải bước duy nhất)
# THỦ CÔNG: chạy binary đã build rồi diff tập hàng với dashboard /extensions cho cùng cwd
omp extensions-triage
omp extensions-triage --json
```

Tuyệt đối không dùng `tsc`/`npx tsc` — dự án cấm, dùng `bun run check:ts`.

### Cổng hoàn thành

Mục này XONG khi tất cả đồng thời đúng:

0. **Tiền đề môi trường:** `bun --cwd=packages/natives run build` đã chạy — **đã build xong 2026-09-29**. Trạng thái trước đó (đo 2026-09-27) là addon chưa có, và mọi `bun test` trong mục này đỏ với `Failed to load pi_natives native addon for darwin-arm64`; đó là **thiếu một bước build**, không phải hạn chế của máy — sau khi build, cùng lệnh đó ra `bun test packages/coding-agent/test/discovery/disabled-extensions.test.ts` → 6 pass / 0 fail (đo lại 2026-09-29). Trên máy sạch chưa build thì mọi điều kiện (2)-(5) phải ghi là "chưa chạy", không phải "chưa đạt".
1. `bun run check:ts` sạch.
2. `bun test packages/coding-agent/test/extensions-triage-cli.test.ts` qua.
3. Dòng parity tự động trong `extensions-triage-cli.test.ts` chứng minh các hàng của CLI khớp chính xác với đường đọc mà dashboard dùng cho cùng cwd — cụ thể là một hàng mà đường đọc đó gọi là `disabled` không bị CLI báo là `active`. Phép diff thủ công ở bước 13 giữ lại như xác nhận lần hai, không phải cổng duy nhất.
4. Với (b): một hàng fixture bị che bởi phần tử thắng cùng tên báo `shadowedBy` khác rỗng **và** có một test trong capability suite đỏ nếu `_shadowed` được đặt mà không có phần tử thắng.
5. Dòng CHANGELOG tồn tại và phép uỷ quyền `shippable: false` của Wave D đã được cấp bằng văn bản.

**Cổng này có thực sự đỏ được không: có, sau khi build addon.** Điều kiện (3) là điều không thể bịa: xoá phần nhân bản `Settings.init()` / `cfgDisabledExtensions` khỏi CLI thì đầu ra JSON vẫn trông rất hợp lý, nhưng mọi disable ở cấp item sẽ lật thành `active` và dòng parity sẽ lộ ra. Nhưng có một thứ cổng **không** bắt được, và người review phải tự kiểm bằng mắt: liệu lớp `Command` mới đã thực sự được đăng ký trong `cli-commands.ts` hay chưa — một entry registry thiếu làm `omp extensions-triage` trượt xuống `runCli` và chuyển argv cho LLM như một prompt (hồi quy #1496), và không test nào liệt kê ở đây sẽ nhận ra. Lệnh mà plan tự đề xuất, `bun test packages/coding-agent/test/ -t 'acp'`, KHÔNG chạy bất kỳ dòng mã mới: `-t` lọc theo TÊN test, các test acp hiện có đặt tên theo `describe("ACP agent")` (`acp-agent.test.ts:556`), còn một test extensions-triage sẽ không mang tên "acp". Lưu ý về trạng thái hôm nay: vì file test chưa tồn tại, lệnh này đang **ĐỎ** (exit 1, "filters did not match any test files") chứ không phải xanh — đỏ vì file vắng, không phải vì đã bắt được lỗi. Nó chỉ trở thành "xanh giả" sau khi file tồn tại mà triển khai hỏng.

### Phụ thuộc

- **depends_on:** M2 WI-2 (thứ tự nạp extension xác định + giải quyết va chạm tường minh) — **PHẢI** merge trước khi mục này ship. **Chưa đạt** tính đến 2026-09-27. Nếu CLI này ship trước, nó báo một thứ tự mà người dùng không bao giờ thấy trong dashboard. Ngoài ra: không có gì khác — phương án (a) không đụng shared core.
- **blocks:** không có. `blocks` rỗng.

### Cách sai dễ nhất

Lỗi số một, và nó đúng là lỗi mà plan nêu: ship một CLI tự suy diễn shadowing độc lập với `loadAllExtensions`, khiến inventory và dashboard runtime bất đồng — một inventory nói dối tệ hơn là không có inventory. Cách thể hiện cụ thể trong phương án (a) là truyền `undefined` cho đối số `disabledIds`: loader vẫn đọc `cfgDisabledExtensions` bên trong, nhưng Set `disabledExtensions` mà `resolveState` tham vấn vẫn rỗng, nên CLI báo các hàng bị disable ở cấp item là `active` trong khi dashboard TUI báo là `disabled`. Vì vậy việc nhân bản `acp-agent.ts:1191-1193` là bắt buộc, không phải tùy chọn.

Với phương án (b), rủi ro lớn nhất khác hẳn và mang tính cơ học: tại cả hai chỗ `item._shadowed = true`, phần tử thắng **không** khôi phục lại được với code hiện tại, nên một sửa `_shadowedBy = existing._source` ngây thơ sẽ compile, pass type-check, và vẫn âm thầm cho ra `undefined`. Nguyên nhân nằm ở ba chỗ phải đổi trước mà plan không nêu: `seen` khai báo là `Set<string>` chỉ chứa key (`:228`), `aliasSeen` dùng `.some()` trả về boolean chứ không phải phần tử khớp (`:246` và `:269`), và các kiểu giao nội tuyến lặp (`:144`, `:145`, `:146`, `:211`, `:218` cùng `types.ts:165`) đều chỉ khai báo `_shadowed?: boolean`.

### Cần người quyết

- **(a) hay (b)?** Plan tường minh từ chối chọn và đòi lựa chọn phải được ghi lại. Đây là **cổng quyết định** — bước 1. Khuyến nghị: ship (a) ngay (không cần đổi core và trả lời đúng câu hỏi triage), rồi tái tạo (b) thành một work item riêng thay vì gói một thay đổi capability-core dùng chung vào một PR CLI.
- **Tên lệnh.** Đặc tả dùng `extensions-triage`. Registry đã có `plugin`, `skill`, `config`; `extensions-triage` không mập mờ với bất kỳ cái nào. Cần xác nhận trước khi viết help string.
- **Đầu ra mặc định: bảng hay mỗi hàng một dòng?** Đặc tả giả định mỗi hàng một dòng đã khử vệ sinh. Nếu cần một tiền lệ về NHỊP in, dùng `packages/coding-agent/src/cli/plugin-cli.ts:646-647`. **Đừng dùng `:644` làm tiền lệ ngữ nghĩa**: dòng đó đọc `plugin.shadowedBy` của marketplace (`InstalledPluginSummary.shadowedBy?: "project"` — nghĩa "plugin user bị project ghi đè"), KHÁNG phải extension-scope shadowing; xem hàng "Đính chính so với plan" cuối bảng. Tiền lệ đúng hơn cho state/reason: `packages/tui/src/overlays/extensions/inspector-model.ts:466-482` (`enablementLabel`).
- **Wave D có ship trong cùng quyết định changelog với Wave B và C của M4 không, hay cần quyết định riêng?** Plan §6.2 nói cả ba sóng M4 gộp thành MỘT quyết định changelog và không sóng nào ship trước quyết định đó. Cần xác nhận chủ sở hữu thực sự đã cấp phép — `shippable: false` nghĩa là mục này không thể phát hành riêng.
- **Với phương án (b):** `_shadowedBy` nên mang một chuỗi hiển thị (ví dụ `skill:foo` qua `makeExtensionId`) hay một đường dẫn thô? Khuyến nghị dùng extension id, vì đó là thứ người dùng hành động được và cũng là thứ TUI inspector đã render tại `packages/tui/src/overlays/extensions/inspector-model.ts:466-482`.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `packages/coding-agent/src/modes/components/extensions/state-manager.ts:69` (`loadAllExtensions`) | CONFIRMED | Không có. Dòng 69 là `export async function loadAllExtensions(cwd?: string, disabledIds?: string[]): Promise<Extension[]>`. |
| `shadowedBy` được đọc tại `state-manager.ts:103` và không call site `addItems` nào truyền `getShadowedBy`, nên nó luôn là `undefined` (grep toàn repo trả về đúng 2 hit: khai báo kiểu và lệnh đọc). | CONFIRMED — đây là claim trung tâm của plan và nó đúng tuyệt đối. | Không có. Tiêu chí thoát mà plan đặt cho phương án (a) là có thật: nêu tên một nguồn che khuất là điều thực sự bất khả thi nếu không có mã mới, nên effort S thực sự lạc quan cho (b) và thực sự rẻ cho (a). Mang niềm tin điều này. Bằng chứng: `git grep -n 'getShadowedBy' -- packages/` trả về đúng 2 dòng — `state-manager.ts:81` (`getShadowedBy?: (item: T) => string \| undefined;`) và `state-manager.ts:103` (`shadowedBy: opts?.getShadowedBy?.(item),`). `git grep -n 'addItems' -- packages/` cho thấy 6 call site ở `:116, :127, :138, :149, :209, :220`, không cái nào truyền option. Xác nhận phía hạ nguồn: `isShadowedExtension` và renderer "Shadowed by X" tại `inspector-model.ts:466-482` của TUI đã xử lý trường này, nên một chuỗi không bao giờ tới là nhất quán với hành vi quan sát được. |
| Nguyên nhân gốc là `packages/coding-agent/src/capability/index.ts:247` và `:271`, nơi `item._shadowed = true` được gán như một boolean trần và phần tử thắng bị vứt. | CONFIRMED, kèm một bổ sung mà plan bỏ sót. | Hai chỗ `_shadowed = true` đúng là ở `:247` và `:271` như claim — nhưng khôi phục phần tử thắng cần **THÊM BA** sửa đổi plan không nhắc tới, nếu không bản sửa sẽ compile và lặng lẽ không làm gì. (i) `seen` khai báo `const seen = new Set<string>()` ở `:228` — chỉ key, không tham chiếu item, nên nhánh `keySeen` ở `:242`/`:264` không có gì để gọi tên. Nó phải thành `Map<string, T & { _source: SourceMeta }>`, với `seen.add(key)` ở `:255` và `:265` thành `seen.set(key, item)`. (ii) `aliasSeen` tính bằng `deduped.some(...)` ở `:246` và `:269`, trả về boolean chứ không phải phần tử khớp — cả hai phải thành `.find(...)`. (iii) các kiểu giao nội tuyến ở `index.ts:144, :145, :146, :211, :218` và kiểu công khai ở `types.ts:165` đều khai báo `_shadowed?: boolean` và phải có thêm trường mới, nếu không phép gán sẽ không type-check. Một kỹ sư làm theo plan đúng chữ nghĩa sẽ tạo ra mã pass `bun run check:ts` và báo `undefined` mãi mãi. Bằng chứng: grep `seen = new Set<string>\|deduped.some\|seen.has(key)\|seen.add(key)\|_shadowed = true` → 228, 242, 243, 246, 247, 255, 264, 265, 266, 269, 271, 273. `sed -n '274,320p'` xác nhận đường sống sót ở `:273`. `sed -n '150,180p' types.ts` xác nhận `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>` ở `:165`. Cùng grep đó còn xác nhận `return { items: deduped, all: ...allItems }` ở `:290-295` — item shadowed bị loại khỏi `items` nhưng **có** mặt trong `all`, đó là cái `loadAllExtensions` đọc. Nên các hàng shadowed thực sự tới được CLI với `state: "shadowed"`. |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:1189-1196` (route `_omp/extensions`) | NEARLY CONFIRMED — lệch một dòng ở cuối. | Khối `case "_omp/extensions":` là dòng 1189-1195. Dòng 1196 là `case "_omp/extensions/toggle":`, route KẾ TIẾP. Hãy dùng 1189-1195. Quan trọng hơn, khối này còn gánh tải ngoài cách dùng của plan: dòng 1191-1193 là `const sm = await Settings.init(); const disabledIds = cfgDisabledExtensions.get(sm);` và chúng chính là parity runtime-mà-CLI mà lệnh mới bắt buộc sao chép. Plan chỉ trích route này là nơi dữ liệu đã lộ ra; kỹ sư đọc lướt sẽ bỏ lỡ yêu cầu nhân bản và ship một CLI báo thiếu mọi disable ở cấp item. Bằng chứng: `sed -n '1189,1196p' ... \| cat -n` → 1189 case, 1190 cwd, 1191 Settings.init, 1192 cfgDisabledExtensions.get, 1193 loadAllExtensions(cwd, disabledIds), 1194 return, 1195 dấu ngoặc đóng, 1196 case kế tiếp. Import xác nhận ở `:48` (`Settings`) và `:88` (`cfgDisabledExtensions`). |
| Lệnh: `bun check && bun test packages/coding-agent/test/ -t 'acp'`. Kiểm thử: một test snapshot/CSV trên cây fixture có extension bị shadowed. | **WRONG ở cả hai điểm.** | Câu lệnh test là rỗng với work item này. `bun test -t <pattern>` lọc theo TÊN TEST, không theo tên file — các test acp hiện có đặt tên theo `describe("ACP agent")` (`packages/coding-agent/test/acp-agent.test.ts:556`), đó là lý do `-t 'acp'` bắt được chúng. Một test extensions-triage mới sẽ không mang tên "acp", nên câu lệnh này không chạy dòng mã nào và sẽ xanh trên một bản triển khai hỏng hoàn toàn. Lưu ý về trạng thái hôm nay: vì file test chưa tồn tại, lệnh này đang **ĐỎ** (exit 1, "filters did not match any test files") chứ không phải xanh — đỏ vì file vắng, không phải vì đã bắt được lỗi; nó chỉ trở thành "xanh giả" sau khi file tồn tại mà triển khai hỏng. Thay bằng `bun test packages/coding-agent/test/extensions-triage-cli.test.ts`. Riêng biệt, `bun check` chạy cả `check:ts` và `check:rs`; Rust là toolchain riêng không thuộc work item này, còn `bun test` sau khi build addon một lần thì chạy được, nên `check:ts` vẫn là cổng TS trung thực ở đây. Về phong cách test: AGENTS.md cấm khẳng định "wording/defaults" và test snapshot-một-fixture, và đòi test phải bảo vệ một hợp đồng quan sát được có TÊN. Vậy nên: đừng snapshot CSV/text. Hãy khẳng định phép biến đổi — một hàng cho mỗi extension khoá theo id, state lấy từ union thật, có một hàng shadowed, một hàng bị chính sách disable mang `disabledReason` khác rỗng. Định dạng text không phải hợp đồng được bảo vệ và khẳng định nó sẽ là một test wording bị cấm. Bằng chứng: `grep -n 'describe(' packages/coding-agent/test/acp-agent.test.ts` → `:556` `describe("ACP agent")`, `:2832`, `:3437` — tên, không phải filename. `grep -n '"check"\|"check:ts"\|"test"' package.json` → :89 test, :93 check, :94 check:ts. Ngày 2026-09-27 không có artifact `.node` của `pi_natives` nào dưới cây, khớp với lỗi addon khi đó; ngày 2026-09-29 đã build xong (`packages/natives/native/pi_natives.darwin-arm64.node`). |
| File mới `packages/coding-agent/src/cli/extensions-triage-cli.ts` + đăng ký nó trong registry lệnh của coding-agent. | **INCOMPLETE — thiếu hai file so với đặc tả đầy đủ.** | Registry không nạp các module `-cli.ts`. `cli-commands.ts:99` cho thấy hình dạng: `load: () => import("./commands/config").then(m => m.default)`. Một lệnh mới cần BA file cộng một entry registry: (1) `src/cli/extensions-triage-cli.ts` — phần triển khai; (2) `src/commands/extensions-triage.ts` — lớp `Command` mỏng `export default` nó, khớp 50 wrapper hiện có; (3) một entry `extensionsTriageHelp` trong `src/cli/command-help.ts` ở dạng `{ description } satisfies CommandMetadata`; (4) `CommandEntry` trong `src/cli-commands.ts`. Chỉ dựng file mà plan nêu sẽ tạo ra một module không gì định tuyến tới — và vì một entry registry thiếu làm `runCli` trượt xuống rồi chuyển argv cho LLM như một prompt (hồi quy #1496 được ghi trong chính header file đó), lệnh sẽ **có vẻ** chạy được trong demo và hỏng trong dùng thật. Bằng chứng: `sed -n '1,60p' packages/coding-agent/src/cli-commands.ts` và `grep -n -A4 'name: "config"'` → :98-101. `cat packages/coding-agent/src/commands/config.ts` cho thấy đủ chuỗi wrapper→impl→helpHelp. `ls packages/coding-agent/src/commands/` → 49 module; `sed -n '1,40p' packages/coding-agent/src/cli/command-help.ts` và `git grep -n -A6 'interface CommandMetadata' packages/utils/src/cli.ts` (:136-142) xác nhận hình dạng help. |
| Môi trường nêu: git HEAD 5873776. | **STALE — HEAD thực tế là 9cfbaba.** | Cây làm việc đang ở 9cfbaba ("docs(m3): execution plan for milestone 3, spec-verified against the tree"), trên nhánh milestone-1. Mọi neo trong tài liệu này đã kiểm lại trên 9cfbaba. Nếu một commit khác mới là ý định, hãy kiểm chứng lại trước khi triển khai. Bằng chứng: `git rev-parse --short HEAD` → 9cfbaba; `git status --short -- packages/` → rỗng, nên cây sạch trong `packages/`. (Con số 808b365 từng được ghi ở đây cũng đã lỗi thời.) |
| Phụ thuộc: "M2 WI-2 (post-sort) đã merge". | CONFIRMED là **chưa đạt** — đây là tiền đề, không phải sự thật đã thoả mãn. | WI-2 không có trong cây, nên M4-9 hiện **KHÔNG** khởi động được. Plan liệt kê nó là phụ thuộc nhưng người đọc dễ tưởng nó đã lên kệ. Làm rõ cổng ở bước 2 thay vì để là giả định nền. Deliverable của chính WI-2 là file `packages/coding-agent/test/extension-load-order-determinism.test.ts` — plan khai ở :4995 (hàng `files_touched`) và :5137 (mục "Tên file test"), các bước 8-11 của nó ở :5022-5028; thứ rẻ nhất để dò. (Số dòng cũ 6815 trỏ sang work item khác — đã sửa.) Bằng chứng: `ls packages/coding-agent/test/extension-load-order-determinism.test.ts` → No such file or directory. `git grep -n 'extension-load-order' packages/coding-agent/` → 0 hit. |
| (Ngầm) `shadowedBy` là một trường với một nghĩa. | **MISLEADING — tên này bị nạp quá tải trên ba hệ thống không liên quan.** | Trước khi đụng vào, hãy biết rằng `shadowedBy` đã mang hai nghĩa khác trong codebase này và cả hai đều không phải capability-shadowing mà plan nói tới: tóm tắt plugin marketplace dùng `shadowedBy?: "project"` (`packages/coding-agent/src/extensibility/plugins/marketplace/types.ts:196`, ghi chú ở `:188`) được render bởi `builtin-marketplace.ts` và `plugin-settings.ts`; và giao thức user-config nội bộ dùng `shadowedBy?: string` để nghĩa là "user config của bạn bị project config ghi đè" (`packages/coding-agent/src/internal-urls/cfg-protocol.ts:83`, render tại `interactive-mode.ts:5970-5971`). Chỉ `Extension.shadowedBy` của tui extensions mới là thứ mục này nói tới. Nhầm lẫn chúng là lỗi dễ nhất trong mục này và sẽ tạo ra một inventory báo shadowing phạm vi plugin như thể đó là capability shadowing. Bằng chứng: `git grep -rn 'shadowedBy' -- packages/` trả về **40 hit trên 17 file**, phân bố trên nhiều hệ thống hơn con số 35/sáu mà bản nháp trước nêu — bản thân con số đó cũng đã sai. Ba chỗ đã trích ở `marketplace/types.ts:196` (với doc tại `:188`), `cfg-protocol.ts:83`, và `tui/overlays/extensions/types.ts:68`. Phân bố theo file: `tui/src/overlays/plugin-settings.ts` 6, `tui/src/overlays/extensions/inspector-panel.ts` 4, `test/internal-urls/cfg-protocol.test.ts` 4, `src/slash-commands/builtin-marketplace.ts` 4, `tui/.../types.ts` 3, mười hai file còn lại 1-2 hit mỗi file. |

## Cần người xác nhận

Các điểm sau là **mâu thuẫn bên trong chính đặc tả**, không phải điểm sai so với plan. Không tự sửa ở đây; cần bạn chốt trước khi triển khai.

1. **Đã đóng trong lượt này — quy ước đánh số: 1-based theo thứ tự hàng trong bảng `plan_corrections`.** Con trỏ chết duy nhất là `risk` trong spec, vốn dẫn `#5` cho nội dung nằm ở hàng `#3` (nguyên nhân gốc `capability/index.ts:247`/`:271` — "phần tử thắng không khôi phục lại được"). Sửa con trỏ đó thuộc `M4-9.spec.json`, **không thuộc file md này**, nên nó vẫn cần một lượt riêng trên spec; ở đây chỉ chốt quy ước để tránh tái phát. Các tham chiếu còn lại trong md đã kiểm và đúng theo quy ước này: `code_shape` → `#2` ("shadowedBy đọc ở :103"), step 12 → hàng "lệnh test `bun test -t 'acp'`" (`#5`). Bảng có 9 hàng. Dưới quy ước 0-based, `#5` rơi vào hàng "thiếu hai file" — cũng sai, nên 1-based là quy ước duy nhất khớp.
2. **Trường `effort` đếm số file không khớp `files_touched` cho phương án (a).** `effort` ghi "2 new files + 2 modified + 1 test", nhưng `files_touched` liệt kê cho (a): tạo `extensions-triage-cli.ts`, tạo `commands/extensions-triage.ts`, sửa `command-help.ts`, sửa `cli-commands.ts`, tạo test, **và sửa `CHANGELOG.md`** — tức là 3 file mới tính cả test và **3** file sửa, không phải 2. Cần chốt dòng CHANGELOG có nằm trong phạm vi ước lượng effort của (a) hay không (nó đang bị chặn bởi uỷ quyền Wave D theo plan §6.2/§6.3, nên có thể tách khỏi ước lượng).



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo neo — đọc trước khi gõ.** Đính chính so với tài liệu gốc: M4-9 ghi phụ thuộc "M2 WI-2" là *đã thoả* ở bảng tổng, nhưng bước 2 và cổng hoàn thành ghi rõ là *chưa*. Bảng tổng dễ khiến người đọc nghĩ nó đã hạ cánh. Ở đây coi nó là **tiền đề chưa thoả**: `packages/coding-agent/test/extension-load-order-determinism.test.ts` vẫn không tồn tại (đo lại 2026-09-29). Đây là **điều kiện bắt đầu**, không phải lỗi tài liệu.

**Các neo trong mục này đã sai/lệch — số dòng cũ trong kế hoạch giữ nguyên theo luật bất di bất dịch, bạn tự dịch:**

1. **`package.json:94` (`check:ts`) — HỎNG.** `check:ts` ở **`:90`**. `:94` là `lint:ts`.
2. **`package.json:89` (`test`) — HỎNG.** `test` ở **`:85`**. `:89` là `check`.
3. **Bằng chứng ":89 test, :93 check, :94 check:ts" — HỎNG, cả ba.** Thật: `:85` test, `:89` check, `:90` check:ts, `:92` check:rs. **Tên lệnh thì đúng, chỉ số dòng sai.**
4. **`interactive-mode.ts:5970-5971` — HỎNG.** Dòng thật là **`:5984-5985`** (``request.shadowedBy ? `\n⚠️ Overridden by your …```). `:5970-5971` là `#promptAutoQaConsent` — không liên quan.
5. **`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:11524-11545` — HỎNG.** File nay **26 378 dòng**. `:11524` là "A7 BƯỚC 4 — định tuyến sự kiện thông báo". Mục M4-9 thật ở **`:15148`** (đầu đề) / **`:15170`** (nhánh a/b). Tương tự `:11538-11539` là mã `mouse-wheel.ts`; nhánh (a)/(b) ở `:15170`. **Tra bằng nội dung, không bằng số dòng.**
6. **`load-errors.ts:1` — ĐÚNG nội dung, SAI ngữ cảnh đường dẫn.** File thật ở `src/extensibility/extensions/load-errors.ts`, **không phải** `src/cli/`. Dòng 1 đúng nguyên văn.
7. **Lệnh `bun test packages/coding-agent/test/ -t 'acp'` — SAI so với tài liệu, và đây là phát hiện MẠNH hơn chứ không yếu hơn.** Tài liệu ghi "ĐỎ, exit 1, 'filters did not match any test files'". **Đo thật 2026-09-29: 4 pass / 317 skip / 0 fail, exit 0** — nó **đã là xanh giả từ hôm nay**. Nó sẽ xanh với một cài đặt hoàn toàn hỏng, kể cả sau khi bạn thêm cả ba file. `bun test -t <pattern>` lọc theo **TÊN test**, không theo tên tệp; filter khớp `describe("ACP agent")` ở `acp-agent.test.ts:556` và hai describe anh em.
8. **`acp-agent.ts:1189-1196` — lệch 1 ở cuối.** Khối `case "_omp/extensions": {` là **`:1189-1195`**; `:1196` là route kế tiếp (`case "_omp/extensions/toggle": {`).
9. **`extensions-discovery.test.ts` — kích thước sai nhỏ.** Tồn tại, **28 KB** (tài liệu ghi 32 KB).

**Các neo ĐÚNG (dùng nguyên trạng):** `state-manager.ts:69` / `:81` / `:86-89` / `:103` / `:116,127,138,149,209,220` (6 call site `addItems`, không cái nào truyền `getShadowedBy`) / `:180,236,267`; `capability/index.ts:228` / `:242` / `:246` / `:247` / `:255` / `:264` / `:265` / `:269` / `:271` / `:273` / `:144,145,146,211,218`; `capability/types.ts:165`; `acp-agent.ts:1191-1193`; `cli-commands.ts:98-101` / `:99` / `:1-10`; `command-help.ts:3-5`; `packages/utils/src/cli.ts:136-142`; `tui/overlays/extensions/types.ts:68` / `:83`; `inspector-model.ts:466-482` (`:482` là ``return `Shadowed${shadowedBy ? ` by ${sanitizeDisplayText(shadowedBy)}` : ""}`;``); `inspector-panel.ts:654-661`; `plugin-cli.ts:644` / `:646`; `marketplace/types.ts:188,196`; `cfg-protocol.ts:83`; `commands/config.ts`; `commands/shell.ts:13`; `lsp/tool.ts:16`; `CHANGELOG.md` `## [Unreleased]` (hiện có `### Security`; thêm `### Added` **sau** uỷ quyền); `acp-agent.test.ts:556`; `extension-dashboard-mcp-parity.test.ts:24-77` (`:60-61` mẫu `Settings.init` + `initializeWithSettings`; `:72` `loadAllExtensions(projectDir, [])`); `discovery/disabled-extensions.test.ts` (165 dòng; `:129-143` là fixture shadowed dựng sẵn); `test/capability/*.test.ts` (3 file); `tui/test/extension-inspector.test.ts` (935 dòng); `extensions-runner.test.ts` (4193 dòng); đo lại: `src/cli/*-cli.ts` = 33, `src/cli/` = 62, `src/commands/*.ts` = 52, đăng ký 50.

**Bổ sung — dùng đúng, không có trong tài liệu gốc:** `state-manager.ts:150-152` (`options.disabledExtensions ?? (settings ? cfgDisabledExtensions.get(settings) : undefined) ?? []` — cơ chế của cạm bẫy 1); `cli-commands.ts:450` (`return { argv: ["launch", ...argv] };` — cơ chế rò argv, là cổng ở mục *Cổng*); `cli-commands.ts:298` (`LAUNCH_FLAG_COMMANDS = { launch: true, acp: true }`); `cli-commands.ts:315,355` (`RESERVED_TOP_LEVEL_WORDS.extensions` — so khớp chính xác, không phải tiền tố); `cli/flag-tables.ts:114` (`"--cwd": (result, value) => { result.cwd = value; … }`); `tui/overlays/extensions/types.ts:31,36` (union `ExtensionState` / `DisabledReason` — cần cho type trong test); `tui/overlays/extensions/types.ts:183` (`export function makeExtensionId(kind, name)`); `cli-argv-routing.test.ts` (tồn tại, 2 describe — nơi đặt cổng mới).

**Bảng điểm sửa**

| đường/dẫn | symbol | TRƯỚC (nguyên văn từ file) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli/extensions-triage-cli.ts` | *(tạo mới)* | *(không tồn tại)* | `ExtensionTriageRow` + `ExtensionTriageArgs` + `toTriageRow(ext): ExtensionTriageRow` thuần + `runExtensionsTriage(args): Promise<void>` |
| `packages/coding-agent/src/commands/extensions-triage.ts` | *(tạo mới)* | *(không tồn tại)* | `export default class ExtensionsTriage extends Command`, `static flags = { json, cwd }` |
| `packages/coding-agent/src/cli/command-help.ts` | `extensionsTriageHelp` | *(chưa có)* | `export const extensionsTriageHelp = { description: "…" } satisfies CommandMetadata;` đặt cạnh `acpHelp` ở `:3-5` |
| `packages/coding-agent/src/cli-commands.ts` | `commands[]` | `{\n\t\t\tname: "config",\n\t\t\tload: () => import("./commands/config").then(m => m.default),\n\t\t\thelp: commandHelp.configHelp,\n\t\t},` (`:98-101`) | thêm một entry cùng hình dạng: `{ name: "extensions-triage", load: () => import("./commands/extensions-triage").then(m => m.default), help: commandHelp.extensionsTriageHelp }` |
| `packages/coding-agent/test/extensions-triage-cli.test.ts` | *(tạo mới)* | *(không tồn tại)* | 5 case hợp đồng, xem *Hợp đồng test* |
| `packages/coding-agent/test/cli-argv-routing.test.ts` | `describe(...)` mới | file có 2 describe, không đề cập `extensions-triage` | **thêm** 1 describe + 1 test khẳng định routing — đây là cổng mới, không có trong tài liệu gốc |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` → `### Added` | `## [Unreleased]\n\n### Security\n\n- Project-scope MCP config…` | một dòng `### Added`, **chỉ sau khi** có uỷ quyền bằng văn bản |
| `packages/coding-agent/src/capability/index.ts` | `seen` / `deduped` | `const seen = new Set<string>();` (`:228`) | **CHỈ (b)** — `new Map<string, T & { _source: SourceMeta }>()` |
| `packages/coding-agent/src/capability/types.ts` | `CapabilityResult.all` | `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>;` (`:165`) | **CHỈ (b)** — thêm `_shadowedBy?: string` |
| `packages/coding-agent/src/modes/components/extensions/state-manager.ts` | `addItems` opts | `getShadowedBy?: (item: T) => string \| undefined;` (`:81`) | **CHỈ (b)** — 6 call site bắt đầu truyền getter thật |

**Điểm phải sửa mà tài liệu gốc KHÔNG nêu:** `packages/coding-agent/src/commands/extensions-triage.ts` — `ExtensionTriageArgs.flags.cwd` trong hình dạng code là **không với tới được** nếu `Command` không khai báo cờ `cwd`. `--cwd` là *launch-global flag* (`cli/flag-tables.ts:114`) và `LAUNCH_FLAG_COMMANDS = { launch: true, acp: true }` (`cli-commands.ts:298`) — nên `omp --cwd /x extensions-triage` bị **gỡ** flag trước khi tới lệnh (`cli-commands.ts:406-417`, `:447`). Sửa: khai báo `cwd: Flags.string({ description: "…" })` trong `static flags` (mẫu: `commands/shell.ts:13`); người dùng gõ `omp extensions-triage --cwd /x`.

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc)

0. **TIỀN ĐỀ, kiểm trước mọi thứ khác.** M4-9 **không khởi động được** cho tới khi M2 WI-2 merge. Cổng là sự tồn tại của `packages/coding-agent/test/extension-load-order-determinism.test.ts`. Đo 2026-09-29: **không tồn tại**. `git grep -n 'extension-load-order' packages/coding-agent/` → 0 hit. Nếu vẫn vắng, **DỪNG**.
1. **Ghi lại quyết định phạm vi, bằng văn bản, trước khi viết code.** Chọn (a) — hẹp — hay (b) — đầy đủ. Ghi lựa chọn + một câu lý do vào mô tả PR. **Khuyến nghị: (a).** Trong cây hiện tại, `shadowedBy` không thể được điền mà không có code mới. (a) trả lời đúng câu hỏi triage và giữ `capability/index.ts` ra khỏi một PR CLI. (b) là thay đổi thật đối với trạng thái khám phá dùng chung — tách thành work item riêng. Phạm vi (a) nghĩa là gì, bằng mã: `ExtensionTriageRow.shadowedBy` luôn là `undefined`. Không phải vì ta quên, mà vì `grep -rn "getShadowedBy" packages/` trả về **đúng 2 dòng** — cả hai đều là *khai báo* và *đọc*, không chỗ nào *truyền*: `state-manager.ts:81` `getShadowedBy?: (item: T) => string | undefined;` và `state-manager.ts:103` `shadowedBy: opts?.getShadowedBy?.(item),`. Sáu call site `addItems` (`:116` skill, `:127` rule, `:138` tool, `:149` extension-module, `:209` prompt, `:220` slash-command) đều **không** truyền option đó.
2. **Đọc ba nơi tiêu thụ trước khi thiết kế hình dạng hàng.** `packages/tui/src/overlays/extensions/types.ts:68` `shadowedBy?: string;`; `:83` `export function isShadowedExtension(ext: Extension): boolean {`; `inspector-model.ts:466` `export function enablementLabel(state: ExtensionState, reason?: string, shadowedBy?: string): string {`; `inspector-panel.ts:654` `#getStatusBadge(state: ExtensionState, reason?: string, shadowedBy?: string): string {`. Cả bốn neo **đúng**. Lưu ý `:482` là nhánh "Shadowed by X" — **đã** được render hôm nay và **không bao giờ** nhận giá trị. Dưới (a) hãy giữ CLI độc lập với nó, và ghi lại bằng một dòng chú thích rằng khoảng trống này là có chủ đích. Hai union cần import làm type trong test: `types.ts:31` `export type ExtensionState = "active" | "disabled" | "shadowed";` và `types.ts:36` `export type DisabledReason = "provider-disabled" | "user-opt-in" | "item-disabled" | "shadowed";`.
3. **Tạo `src/cli/extensions-triage-cli.ts`.** Phép chiếu thuần. Nhân bản **chính xác** ba dòng `acp-agent.ts:1191-1193`: `const sm = await Settings.init();`, `const disabledIds = cfgDisabledExtensions.get(sm);`, `const extensions = await loadAllExtensions(cwd, disabledIds);`. Khối chứa chúng là `case "_omp/extensions": {` tại `:1189-1195`. **Vì sao `disabledIds` là toàn bộ tròng game — cơ chế chính xác, không phải heuristic:** `state-manager.ts:69-72` `export async function loadAllExtensions(cwd?: string, disabledIds?: string[]): Promise<Extension[]> {` … `const effectiveDisabledIds = disabledIds ?? [];` … `const disabledExtensions = new Set<string>(effectiveDisabledIds);`; và `state-manager.ts:109-111` `const loadOpts = cwd ? { cwd, includeDisabled: true, disabledExtensions: effectiveDisabledIds } : { includeDisabled: true, disabledExtensions: effectiveDisabledIds };`. `effectiveDisabledIds` **luôn là một mảng, không bao giờ `undefined`** ⇒ fallback ở loader `capability/index.ts:150-152` `const disabledExtensionIds = new Set<string>(options.disabledExtensions ?? (settings ? cfgDisabledExtensions.get(settings) : undefined) ?? []);` **không bao giờ được chạm tới** khi đi qua `loadAllExtensions`. Truyền `undefined` không chỉ làm rỗng Set mà `resolveState` tham vấn — nó còn làm rỗng Set mà **loader** dùng để lọc ở tầng discovery. **Hai tầng cùng sai, cùng một lần.** **Hiển thị:** `--json` phát `{ "extensions": [...] }`. Dạng đọc được: mỗi hàng một dòng, SPACE làm dấu phân cột. Chạy qua helper trung tâm `import { replaceTabs, shortenPath, TRUNCATE_LENGTHS, truncateToWidth } from "@oh-my-pi/pi-tui/render/render-utils";` (`extensibility/extensions/load-errors.ts:1` là đường dẫn đúng; `lsp/tool.ts:16` là mẫu thứ hai). Không tự chế hằng số cắt chuỗi — `TRUNCATE_LENGTHS.LINE` là 110 (`render-utils.ts:185-198`). Dùng `console.log`: đây là CLI thoát ra không vào TUI, đúng ngoại lệ của AGENTS.md. Nếu sau này được render trong TUI thì chuyển sang `logger` tại điểm đó.
4. **Tạo `src/commands/extensions-triage.ts`.** Mẫu tham chiếu: `packages/coding-agent/src/commands/config.ts`. Ba phần bắt buộc: (1) `export default class … extends Command` — vì `cli-commands.ts:99` làm `.then(m => m.default)`; (2) import module triển khai bằng import **top-level** (không bao giờ `await import`); (3) `static flags = { json: Flags.boolean(…), cwd: Flags.string(…) }`.
5. **Thêm `extensionsTriageHelp` vào `command-help.ts`.** Đặt cạnh `acpHelp` ở `:3-5`: `export const acpHelp = { description: "Run omp as an ACP (Agent Client Protocol) server over stdio" } satisfies CommandMetadata;`. Interface đích ở `packages/utils/src/cli.ts:136-142`.
6. **Đăng ký trong `cli-commands.ts`.** Một entry, đúng hình dạng `config` tại `:98-101`. **Đây là toàn bộ phần nối** giữa lệnh và người dùng — xem mục *Cổng* về lý do nó cần một test riêng.
7. **Viết test hợp đồng** — xem mục *Hợp đồng test*.
8. **Chạy cổng** — xem mục *Cổng*.
9. **Chạy thử binary thật, rồi mới xin uỷ quyền changelog.** `omp extensions-triage` rồi `omp extensions-triage --json`. Đối chiếu tập hàng với dashboard `/extensions` cho cùng cwd. Lệch = phép nhân bản `disabledIds` ở bước 3 sai. Chỉ sau khi qua mới xin uỷ quyền `shippable: false` của Wave D bằng văn bản, rồi mới viết dòng CHANGELOG.

**Hợp đồng test**

**File:** `packages/coding-agent/test/extensions-triage-cli.test.ts` (mới).
**Đọc lấy fixture, không nhân bản:** `packages/coding-agent/test/discovery/disabled-extensions.test.ts` (165 dòng) và `packages/coding-agent/test/extension-dashboard-mcp-parity.test.ts` (310 dòng).

*Fixture đã có sẵn, dùng lại thay vì dựng cây thứ hai.* `disabled-extensions.test.ts:129-143` đã dựng sẵn đúng cái tình huống "một bản bị che": `:129` `test("deduplicates against an empty snapshot when the caller omits disabled IDs", async () => {`, `:132` ghi `.omp/AGENTS.md` với nội dung "lower-priority project instructions", `:133` `await fs.mkdir(path.join(tempDir, ".gemini"), { recursive: true });`, `:134` ghi `.gemini/GEMINI.md` với nội dung "higher-priority project instructions", `:136` `initializeWithSettings(Settings.isolated({ disabledExtensions: ["context-file:project:GEMINI.md"] }));`, `:138` `const dashboard = await loadAllExtensions(tempDir);`, `:141` `expect(agents?.state).toBe("shadowed");`, `:142` `expect(gemini?.state).toBe("active");`. Đây là một `context-file` cùng khoá ở hai cấp ưu tiên — đúng cái mà tài liệu gốc mô tả là "một skill cùng tên ở hai cấp", nhưng đã có sẵn, đã chạy, và **không cần** bạn đoán key của skill. `loadAllExtensions(tempDir)` với `tempDir` này trả về đúng một hàng `shadowed` và một hàng `active`.

Mẫu khởi tạo (từ `extension-dashboard-mcp-parity.test.ts:60-61`): `const settings = await Settings.init({ inMemory: true, cwd: projectDir });` rồi `initializeWithSettings(settings);`. Rồi `setAgentDir(userAgentDir)` để không đụng profile thật (`:36`), và `afterEach` gọi `resetSettingsForTest()` + `__resetDirsFromEnvForTests()` + `removeWithRetries(...)` (`:64-69`).
**Không `mock.module()`.** Dùng `vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach`.

| # | Khẳng định | Hợp đồng bảo vệ | Hồi quy → người dùng thấy |
| --- | --- | --- | --- |
| 1 | `toTriageRow` là **tổng** của `loadAllExtensions`: `rows.length === extensions.length`, và `rows.map(r => r.id)` có **một id duy nhất** cho mỗi id khám phá | mỗi extension xuất hiện đúng một lần, khoá theo id | một hàng bị nhân đôi khiến người dùng tưởng có hai plugin |
| 2 | Mọi `row.state` thuộc `ExtensionState` thật (`"active" \| "disabled" \| "shadowed"`) và mọi `row.disabledReason` khác rỗng thuộc `DisabledReason` thật | state/reason không phải chuỗi tự do | một reason mới bịa ra mà dashboard không hiểu |
| 3 | Đúng một hàng `state === "shadowed"` | phép chiếu không làm mất hàng bị che | câu hỏi "plugin của tôi có nạp không" không có câu trả lời |
| 4 | Hàng `shadowed` đó có `shadowedBy === undefined` | khoảng trống đã ghi nhận — dưới (a) đây là hợp đồng có chủ đích | dưới (b) test này **phải lật** thành `shadowedBy` khác rỗng |
| 5 | Hàng bị chính sách disable mang `disabledReason` khác rỗng **và khác `"shadowed"`** (`"item-disabled"` theo `state-manager.ts:54`) | phép nhân bản `disabledIds` thật sự chạy | **đây là case quan trọng nhất** — xem mục *Cổng* |

**Cấm:** snapshot CSV/text, khẳng định chuỗi help, khẳng định có bao nhiêu dòng, `expect(output).toContain("Shadowed by")`. Định dạng văn bản không phải hợp đồng được bảo vệ.
**Nếu chọn (b):** phần khẳng định phần tử thắng được ghi **phải** nằm trong `packages/coding-agent/test/capability/` (hiện có `fs-special-files.test.ts`, `rule-agents.test.ts`, `rule-buckets.test.ts`) — đúng tầng sở hữu `seen`/`deduped`, không đi qua CLI.

**Cổng có đỏ được không — trả lời thẳng từng cổng một**

| cổng | đỏ được? | bằng cách nào |
| --- | --- | --- |
| (1) `bun run check:ts` | **CÓ** | `check:ts` = `check:tools && … check:types` (`package.json:90`), mà `check:tools` = `oxlint . && oxfmt --check …` (`:91`). Sửa sai kiểu → đỏ. Sai format → đỏ. |
| (2) `bun test …/extensions-triage-cli.test.ts` | **CÓ** | File vắng → bun báo lỗi. File có mà assertion sai → đỏ. |
| (2b) case 5 (`disabledReason` khác `"shadowed"`) | **CÓ, và đây là cổng thật sự quan trọng nhất** | Xoá đúng hai dòng `Settings.init()` + `cfgDisabledExtensions.get(sm)`: JSON **vẫn trông rất hợp lý** (mọi hàng đều có `id`, `state`, `path` hợp lệ), nhưng mọi disable cấp item lật sang `active` → case 5 đỏ. Không thể bỏ sót âm thầm. |
| (3) đăng ký lệnh | **CÓ — tài liệu gốc nói sai** | xem bên dưới |
| (4) uỷ quyền `shippable: false` bằng văn bản | **KHÔNG** | Không có lệnh nào làm nó đỏ. Đây là một **grant của con người**. Chỉ có thể là một ô tick trong PR body, ký tay. |
| (5) dòng CHANGELOG tồn tại | **KHÔNG** | Cùng lý do — và bị (4) chặn trước. |

> **Sửa cổng (4)+(5):** đừng giữ chúng như hai dòng checklist cùng cấp với (1)-(3). Gộp thành **một** điều kiện văn bản duy nhất ghi trong PR body, và **không** ghi vào checklist tự động. Một cổng luôn xanh còn tệ hơn không có cổng — nó tạo cảm giác an toàn giả.

**Cổng (3) — điểm mù mà tài liệu gốc nói là không có cổng nào bắt được. Tài liệu đó SAI, và đây là phát hiện lớn nhất của phiếu.** Tài liệu gốc viết: *"liệu lớp `Command` mới đã thực sự được đăng ký trong `cli-commands.ts` hay chưa … không test nào liệt kê ở đây sẽ nhận ra"*, và `GAP-M4-15` cảnh báo rằng thêm lệnh thứ hai cùng sóng biến thành hai điểm mù.

Điều đó **đúng về mặt `bun test`**, nhưng **sai về mặt hợp đồng**. Coi đường đi của argv: `cli-commands.ts:450` là `return { argv: ["launch", ...argv] };` — **fallback khi KHÔNG đăng ký**; `cli-commands.ts:427-434` `export function resolveCliArgv(argv: string[]): ResolvedCliArgv {` với `if (isSubcommand(first)) return { argv };` — **đường đi khi CÓ đăng ký**. `isSubcommand` (`:301-304`) tra `SUBCOMMAND_NAMES`, được dựng từ chính mảng `commands` (`:289-295`). Nghĩa là **đăng ký hay không là một hợp đồng quan sát được từ bên ngoài, assert được, không cần spawn process** — và đã có sẵn file test chuyên dụng: `packages/coding-agent/test/cli-argv-routing.test.ts` (tồn tại, 2 describe), ví dụ ở `:16-19` `expect(resolveCliArgv(["--approval-mode=yolo", "acp"])).toEqual({ argv: ["acp", "--approval-mode=yolo"] });` và fallback được chứng minh ở `:34-37` `expect(resolveCliArgv(["--model", "acp"])).toEqual({ argv: ["launch", "--model", "acp"] });`.

**Thêm vào file đó, không cần file mới** — một describe `resolveCliArgv keeps extensions-triage off the launch prompt path (#1496)` với hai test: `resolveCliArgv(["extensions-triage"])` phải bằng `{ argv: ["extensions-triage"] }`, và `resolveCliArgv(["extensions-triage", "--json"])` phải bằng `{ argv: ["extensions-triage", "--json"] }`. Bỏ entry khỏi `commands[]` → hai case này **đỏ ngay**, với `actual: { argv: ["launch", "extensions-triage"] }`. Đó chính là hồi quy #1496, bắt được bằng máy.

**Tên `extensions-triage` không đụng `RESERVED_TOP_LEVEL_WORDS`.** Bảng reserved đã có `extensions` tại `cli-commands.ts:315`, nhưng tra cứu ở `:355` là so khớp **chính xác** `argv[0]`, không phải tiền tố — nên `extensions-triage` không bị chặn nhầm. Đã kiểm, không phải rủi ro.
**Và `--cwd` bị gỡ trước lệnh** — đã kiểm ở `cli-argv-routing.test.ts:53-55` (`resolveCliArgv(["--cwd", "/tmp", "update"])` → `{ argv: ["update"] }`). Vì `extensions-triage` không nằm trong `LAUNCH_FLAG_COMMANDS` (`:298`), `omp --cwd /x extensions-triage` sẽ **mất** `--cwd /x`. Đó là lý do cờ `cwd` phải tự khai.

**Lệnh của tài liệu gốc: BỎ ĐI, ĐỪNG CHẠY.** `bun test packages/coding-agent/test/ -t 'acp'`. Chạy thật 2026-09-29: `4 pass / 317 skip / 0 fail`, `Ran 321 tests across 1513 files. [2.68s]` — **Xanh. Exit 0. Hôm nay.** Chạy **0 dòng** mã mới. Nó sẽ xanh với một cài đặt hoàn toàn hỏng, kể cả sau khi bạn thêm cả ba file.

**Thứ tự cổng hoàn thành:**
```bash
# 0. tiền đề (đã xong 2026-09-29 — không cần chạy lại nếu .node đã có)
ls packages/natives/native/pi_natives.darwin-arm64.node
# nếu vắng: brew install ninja && bun --cwd=packages/natives run build

# 1. type + lint + format
bun run check:ts

# 2. test của work item này
bun test packages/coding-agent/test/extensions-triage-cli.test.ts

# 3. đăng ký lệnh
bun test packages/coding-agent/test/cli-argv-routing.test.ts

# 4. hồi quy do (b) chạm shared discovery
bun test packages/coding-agent/test/extensions-discovery.test.ts \
           packages/coding-agent/test/extensions-runner.test.ts \
           packages/coding-agent/test/discovery/disabled-extensions.test.ts \
           packages/tui/test/extension-inspector.test.ts
```

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: truyền `undefined` cho `disabledIds` — im lặng, hai tầng cùng sai.** `loadAllExtensions` luôn đặt `disabledExtensions: effectiveDisabledIds` (mảng, không bao giờ `undefined`) vào `loadOpts` (`state-manager.ts:109-111`), nên fallback `options.disabledExtensions ?? cfgDisabledExtensions.get(settings) ?? []` ở `capability/index.ts:150-152` **không bao giờ chạy**. Bỏ phép nhân bản `acp-agent.ts:1191-1193` → cả bộ lọc loader lẫn `resolveState` cùng rỗng → mọi hàng bị disable cấp item báo `active`. Đầu ra vẫn parse được, JSON vẫn đẹp. **Đây là lỗi số một.**
2. **Tên `shadowedBy` đã mang ba nghĩa khác trong codebase, và cái thứ ba mới là cái work item này nói tới.** | hệ thống | vị trí | nghĩa | — | marketplace plugin | `src/extensibility/plugins/marketplace/types.ts:196` (`shadowedBy?: "project"`, doc ở `:188`; gán ở `manager.ts:680`; render ở `builtin-marketplace.ts:197`) | "plugin user bị project ghi đè" | | cfg protocol | `src/internal-urls/cfg-protocol.ts:83` (`shadowedBy?: string`; gán ở `:427`; render ở `interactive-mode.ts:5984-5985`) | "config của bạn bị project ghi đè" | | **extension scope** | `src/modes/components/extensions/types.ts:68` | ← **cái work item này nói tới** |. Nhập lẫn ba cái là lỗi dễ nhất trong file này, và nó tạo ra một bản kiểm kê báo shadowing ở tầng plugin trông như shadowing ở tầng capability.
3. **Registry entry là điểm mù duy nhất — và nó CÓ cổng, chỉ là không ai viết.** Đây là bẫy mà chính tài liệu gốc tự gọi ra rồi kết luận nhầm là không giải được. Xem mục *Cổng* cổng (3).
4. **`flags.cwd` không tới được nếu không tự khai.** Không khai thì `args.flags.cwd` luôn `undefined`, và cổng parity (3) chỉ có thể chạy với `process.cwd()` — tức là **không so được với dashboard cho một cwd khác**, tức là **cổng tự nó vô hiệu**.
5. **`commands/config.ts` gọi `await initTheme()` trước khi chạy lệnh.** Không bắt buộc nếu renderer dùng chuỗi thuần như hình dạng code trong tài liệu gốc. Nhưng nếu bạn dùng `theme.fg(...)` cho cột state, phải khởi tạo theme trước, không sẽ ném lỗi lúc chạy chứ không phải lúc type-check.
6. **Đừng khẳng định `shadowedBy === undefined` như sự thật vĩnh viễn.** Dưới (a) nó là hợp đồng **có chủ đích**; dưới (b) nó lật thành hồi quy. Không có test nào sống được cả hai. Ghi rõ trong PR phương án nào đã chọn.
7. **Bẫy kiểu test của AGENTS.md.** Đừng snapshot output văn bản. Không có consumer nào parse dòng in ra. `toTriageRow` là hàm thuần được export **đúng lý do này** — assert trên nó, không assert trên stdout.

---


## GAP-M4-10. Sổ bản vá phụ thuộc cục bộ: mỗi hunk phải trả lời được "vá cái gì, vì sao, bỏ khi nào" (sóng D)

**Sóng:** M4 Wave D — Khả năng nhìn thấy triage (`shippable: false`, chờ cổng changelog dùng chung của M4, plan §6.2/§6.3). Cùng đợt M4-9, **không chặn ai**.
**Effort:** S
**Phụ thuộc:** Không có phụ thuộc cứng. **Thứ tự bắt buộc: merge trước GAP-M1-18** (`omp doctor`) — không có `LEDGER.md` thì doctor không có gì để báo. Không đặt ở Wave B: làm vậy sẽ kéo thêm một quyết định release vào PR đang tranh luận về rollback của `/settings`. Đây là việc đọc-một-lần-để-hiểu, giống hệt `omp extensions-triage`.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `patches/LEDGER.md` | tạo | Sổ sinh: một hàng cho **mỗi hunk**, bốn cột `file` bị sửa / mục đích / issue-PR upstream / `drop-when: <version>`. Nó **sinh từ chính diff** nên không trở thành nguồn sự thật thứ hai — đúng luật M4. | có (file chưa tồn tại — `ls patches/` trả đúng 2 mục, cả hai đều là `.patch`) |
| `scripts/gen-patch-ledger.ts` | tạo | Script đọc `package.json` → `patchedDependencies`, tách từng file trong `patches/*.patch` theo `diff --git`, ghép với `LEDGER.md`, rồi in ra bảng. Hunk nào không có hàng tương ứng thì **fail**, không in ra một bảng nửa vời. | có (thư mục `scripts/` tồn tại; khuôn script sinh file đã có ở `scripts/ci-release-publish.ts` và `packages/browser-relay/scripts/build-extension.ts`) |
| `scripts/gen-patch-ledger.test.ts` | tạo | Hợp đồng ba tập lệch nhau: đọc `package.json.patchedDependencies` + `patches/*.patch` + `LEDGER.md` và **đỏ khi chúng lệch nhau**. | có (file mới; thư mục `scripts/` đã có test cạnh cạnh — xem `scripts/ci-release-publish.test.ts`) |
| `package.json` | sửa | Thêm một mục script `gen:patch-ledger` cạnh các script `gen:*` sẵn có. **Không đụng khối `patchedDependencies` ở `:206-209`.** | có — `patchedDependencies` là khối ở `package.json:206-209`, đúng hai mục, khớp đúng 2 file `.patch` |
| `CONTRIBUTING.md` | sửa | Thêm **một mục ngắn**: thêm patch = thêm hàng ledger, **cùng một PR**. | có — **đã kiểm: `grep -c "patch" CONTRIBUTING.md` trả 0**, tức file hiện có 0 dòng nào nhắc `patch`. Đây là mục mới, không phải sửa mục cũ |
| `patches/*.patch` | **không sửa** | Không đổi **một byte nào**. Đây là cái được bảo toàn chính của item. | có — bắt buộc, xem bước 4 |

### Các bước

1. **Đo lại hiện trạng trước khi thiết kế bảng.** `ls patches/*.patch | wc -l` → 2; `puppeteer-core@25.3.0.patch` 35.203 byte với 12 `diff --git`; `@ark%2Fschema@0.56.2.patch` 1.431 byte. **Không có mismatch cấu hình** — khối `patchedDependencies` ở `package.json:206-209` liệt kê đúng hai mục và khớp đúng hai file. Phần "vá cái gì" đã có. Cái thiếu là **vì sao** và **bỏ khi nào**: lý do nằm rải rác bên trong chính diff dưới dạng comment `// xxx-stealth:`, và `grep 'omp patch'` trong file puppeteer cho **0 hit**; chỉ file `@ark/schema` có **một** marker `(omp patch)` ở hunk đầu. Marker đó không nói hunk nào sửa issue upstream nào, không nói version nào sẽ nuốt nó, không nói 10 file kia còn là puppeteer nữa hay đã thành fork. Ngoài ra `THIRD-PARTY-NOTICES.txt:904` chỉ ghi `puppeteer-core 25.3.0 — Apache-2.0` — đó là **giấy phép**, không phải **ghi nhận sửa đổi**.

2. **Viết script sinh.** Bốn việc, không chép dòng nào từ dsh:
   1. Một script **sinh** `patches/LEDGER.md` từ chính diff — mỗi hunk một dòng: file bị sửa, mục đích, issue/PR upstream, `drop-when: <version>`. Vì nó **sinh** nên không thành nguồn sự thật thứ hai.
   2. Một hàng **bắt buộc** cho mỗi hunk; hunk nào không có hàng thì tool fail.
   3. Một test đọc `package.json.patchedDependencies` + `patches/*.patch` + `LEDGER.md` và đỏ khi ba tập lệch nhau.
   4. `CONTRIBUTING.md` thêm một mục ngắn: thêm patch = thêm hàng ledger, cùng một PR.

3. **Test phải là hợp đồng quan sát được, không phải source-grep.** AGENTS.md cấm đọc file implementation rồi khẳng định về hình dạng văn bản của nó. Ở đây ranh giới nằm ở chỗ khác: `patches/*.patch` là **artifact đầu vào** của cơ chế vá, và `LEDGER.md` là **output** của script — khẳng định ba tập lệch nhau là khẳng định quan sát được. Nhưng vì vậy test **phải so trên byte thật của file patch**, không phải trên trường `purpose` do script tự điền; nếu không thì ba tập luôn khớp và test đó vô nghĩa.

4. **Không đụng `package.json`, không đổi byte nào của patch.** Cần khẳng định bằng lệnh rằng `md5` của hai file `.patch` không đổi sau PR — đó là cách chứng minh duy nhất cho điều khoản "không đổi byte" (một nhận xét trong mô tả PR không phải cổng).

5. **Chạy cổng** (khối Xác minh). Không đánh dấu xong trước khi `bun run gen:patch-ledger` chạy sạch và test của item xanh.

### Hình dạng code

```typescript
// scripts/gen-patch-ledger.ts
//
// RULE: the ledger is GENERATED from the diff, never authored beside it. A row
// that disagrees with the patch file loses — that ordering is what keeps the
// ledger from becoming the second source of truth M4 forbids.

export interface LedgerRow {
	/** Path on the b/ side of the `diff --git` header. */
	readonly file: string;
	/** What this hunk does, in one line. */
	readonly purpose: string;
	/** Upstream issue/PR this hunk works around, or null when there is none. */
	readonly upstream: string | null;
	/** Version in which the hunk can be dropped. */
	readonly dropWhen: string;
}

export interface PatchedDependency {
	readonly spec: string;      // "@ark/schema@0.56.2"
	readonly patchPath: string; // "patches/@ark%2Fschema@0.56.2.patch"
}

/** Split a unified diff into per-file hunks. Pure; takes bytes, not paths. */
export function parsePatchHunks(patchText: string): Map<string, Array<{ header: string }>>;

/** The fail condition: a hunk with no ledger row, or a row with no hunk. */
export function reconcile(
	patched: readonly PatchedDependency[],
	hunksByFile: ReadonlyMap<string, ReadonlyArray<{ header: string }>>,
	rows: readonly LedgerRow[],
): { ok: true; table: string } | { ok: false; missing: string[]; orphaned: string[] };
```

Hình dạng `LEDGER.md` sinh ra, ví dụ đúng với cái đang nằm trong `patches/`:

```markdown
<!-- GENERATED by scripts/gen-patch-ledger.ts — do not edit by hand. -->

| file | purpose | upstream | drop-when |
| --- | --- | --- | --- |
| lib/puppeteer/cdp/FrameManager.js | <mục đích> | <issue/PR> | <version> |
```

Cột `upstream` là cột **có thể rỗng** — xem mục "Cần người quyết"; đó là câu hỏi chưa có câu trả lời, và nó không được giải quyết bằng cách tự điền.

### Hợp đồng test

File test: `scripts/gen-patch-ledger.test.ts` (mới).

Diễn đạt hợp đồng: **nếu hồi quy, người bảo trì merge patch mà không biết nó sửa cái gì hay bao giờ bỏ được.** Cụ thể, với cây `patches/` hiện tại, `reconcile` phải trả `ok: true` với đúng 12 hunk cho file puppeteer và đúng số hunk của file `@ark/schema`; và khi thêm một hunk giả vào một file patch trong fixture, `reconcile` phải trả `ok: false` với hunk đó nằm trong `missing`.

Khẳng định **âm** cũng bắt buộc: xoá một hàng ledger cho một hunk vẫn còn tồn tại thì `reconcile` phải đỏ — nếu không, "ba tập luôn khớp" và test vô nghĩa.

Hàng phủ định thứ hai, theo đúng câu "Cái được bảo toàn": một fixture nơi `package.json.patchedDependencies` liệt kê **ba** mục trong khi `patches/` chỉ có **hai** file phải đỏ, và ngược lại.

### Xác minh

```bash
# 1. Sinh lại sổ — phải không đổi một byte nào (idempotent)
bun run gen:patch-ledger
git diff --exit-code -- patches/LEDGER.md

# 2. Hợp đồng ba tập
bun test scripts/gen-patch-ledger.test.ts

# 3. Điều khoản "không đổi byte của patch" — chạy TRƯỚC và SAU khi code
md5 patches/puppeteer-core@25.3.0.patch patches/@ark%2Fschema@0.56.2.patch

# 4. Không đụng cấu hình
sed -n '206,209p' package.json

# 5. Types + lint + format
bun run check:ts
```

Tuyệt đối không dùng `tsc`/`npx tsc` — dự án cấm, dùng `bun run check:ts`.

### Cổng hoàn thành

Mục này XONG khi tất cả đồng thời đúng:

1. `bun run gen:patch-ledger` chạy và `git diff --exit-code -- patches/LEDGER.md` sạch — nghĩa là sổ **sinh lại được** từ chính diff.
2. `bun test scripts/gen-patch-ledger.test.ts` qua, **và** đã chứng minh cổng có răng: thêm một hunk vào fixture phải làm nó đỏ.
3. Hàng âm (xoá một hàng ledger) cũng đã từng thấy đỏ.
4. `md5` của hai file `.patch` **không đổi** so với trước PR.
5. `bun run check:ts` sạch.

**Cổng này có thực sự đỏ được không: có.** Điều kiện (1) là điều không thể bịa — nếu ai đó xoá `patchedDependencies` khỏi `package.json` mà quên xoá file patch, hoặc thêm hunk mà không thêm hàng, `gen:patch-ledger` lập tức fail. Cổng này **không** bắt được việc nội dung hai cột `purpose` và `upstream` có **đúng** không — đó là phần phải có người đọc, xem "Cần người quyết".

### Phụ thuộc

- **depends_on:** không có gì cứng. **Thứ tự bắt buộc với GAP-M1-18:** merge trước, vì `omp doctor` cần `LEDGER.md` để có gì báo.
- **blocks:** không có. `blocks` rỗng.

### Cách sai dễ nhất

Biến `LEDGER.md` thành nơi người ta **gõ** lý do, rồi để script chỉ kiểm tra khớp. Lúc đó ba tập luôn khớp — vì người viết sẽ sửa ledger cho khớp chứ không sửa ledger cho đúng — và test xanh trên một sổ nói dối. Đây đúng là nghịch lý "tự khớp" mà điều khoản "Cái được bảo toàn" cảnh báo.

Lối sai thứ hai, nhẹ hơn: thêm `hooks` tương tự cho **mọi** thứ có bản vá cục bộ, rồi lan sang một `LEDGER.md` ở tầng `crates/`. Item này chỉ nói về `patches/` — khoá Bun. Lan sang nơi khác là việc khác, và nó sẽ phải tự chứng minh bằng cùng một loại cổng.

### Cần người quyết

- **Cột `upstream` điền gì cho một hunk không có issue upstream?** Đây là câu hỏi thật do chính số đo mở ra: 10 trong 12 `diff --git` là mã thư viện thật và toàn bộ file puppeteer có **0** marker nào ngoài comment `// xxx-stealth:`. Một ô rỗng ở hàng đó là câu trả lời trung thực; một ô điền bừa là một nguồn sự thật thứ hai, đúng thứ M4 cấm. Cần chốt: cho phép `null` với lý do bắt buộc, hay bắt mỗi hunk phải có một issue.
- **Chấp nhận thứ tự merge trước GAP-M1-18?** Sổ khoảng trống ghi nó là **bắt buộc**, không phải khuyến nghị; nếu bạn muốn đảo thứ tự thì phải đổi cả hai mục cùng lúc.
- **Dòng CHANGELOG có thuộc item này không?** Nó là một file sinh ra bằng script và không đổi hành vi người dùng. Theo luật của M4 thì không; nhưng `CONTRIBUTING.md` có đổi cho người góp patch, nên cần xác nhận nó thuộc quyết định changelog chung của Wave D hay đi kèm item này.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `patches/puppeteer-core@25.3.0.patch` có "387 dòng +, 58 dòng -" | **SAI** — đếm lại được | Toàn patch (cả 12 `diff --git`) là **377 dòng `+` và 48 dòng `-`**; riêng mười file mã thư viện thật là **367 `+` / 38 `-`**. Không con số nào trong ba cho ra 387/58. Số đúng đi vào item, vì con số sai ở đây là kiểu lỗi đã xuất hiện bốn lần trong bộ đính chính của chính file này. Bằng chứng: đếm từng hunk bằng `awk` trên `patches/puppeteer-core@25.3.0.patch`. |
| "12 `diff --git`, trong đó 10 file là mã thư viện thật" | **ĐÚNG — và hai file còn lại cần nêu tên** | Hai diff còn lại không phải mã: `a/node_modules/puppeteer-core/.bun-tag-2e714b457f0bd8e8` và `a/node_modules/puppeteer-core/.bun-tag-a797aeb3ca2bd69f` (mỗi cái 5 `+` / 5 `-`), tức file đánh dấu do Bun sinh. Sổ ledger phải nói rõ chúng là gì, nếu không người đọc sẽ tưởng omp đang sửa hai file mã nữa. Bằng chứng: `grep '^diff --git' patches/puppeteer-core@25.3.0.patch`. |
| `package.json:206-209` nối cả hai patch | **XÁC NHẬN CHÍNH XÁC** | Khối `patchedDependencies` là dòng 206-209, đúng hai mục, đúng hai đường dẫn. `THIRD-PARTY-NOTICES.txt:904` cũng đúng nguyên văn: `- puppeteer-core 25.3.0 — Apache-2.0`. |
| `CONTRIBUTING.md` "0 dòng nào nhắc `patch`" | **XÁC NHẬN** | `grep -c "patch" CONTRIBUTING.md` → 0. Vậy mục cần thêm là mục **mới**, không phải sửa một mục cũ. |

## Cần người xác nhận

Các điểm sau nằm ở ranh giới giữa "sổ khoảng trống đã đo" và "kế hoạch chọn". Không tự quyết.

1. **Con số 387/58 trong sổ khoảng trống bị bác, và nó là loại lỗi đáng kể.** Nó không phải lỗi dấu — nó là một cặp số không tồn tại ở bất kỳ cách đếm nào. Sổ khoảng trống dùng số đó để nói "387 dòng +" như một **đại lượng**, tức nó định lượng hoá mức độ lệch. Với số đúng (377/48) thì mức lệch **nhỏ hơn** đáng kể so với cảm giác mà sổ tạo ra, và điều đó làm item rẻ hơn một chút — nhưng không đổi kết luận.
2. **Hai diff `.bun-tag-*` là file sinh tự động của Bun, không phải mã của omp.** Chúng vẫn phải có hàng ledger (một hàng bắt buộc cho **mỗi** hunk không phải ngoại lệ), nhưng câu hỏi cần người quyết là hàng đó ghi gì: `"file sinh tự động bởi Bun, không sửa tay"` hay ghi như một hunk sửa mã. Lựa chọn thứ hai sẽ sinh ra một định nghĩa sai về thứ omp đang vá.



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo neo — đọc trước khi gõ.** 13/13 neo trong mục này **đúng nguyên văn** khi kiểm đường dẫn, byte và nội dung. Nhưng **bốn chỗ trong mục này sai về con số hoặc về cấu trúc**, và chúng chính là chỗ dễ làm bạn gõ ra một cái sổ sai mà không hề biết. Số dòng cũ trong kế hoạch giữ nguyên theo luật bất di bất dịch:

1. **"đúng 12 hunk cho file puppeteer" — SAI. Số thật là 30.** Con số 12 là số `diff --git` — tức số **file** — lấy từ mục "File cần chạm tới" rồi dán thẳng vào hợp đồng. Bằng chứng: `lib/puppeteer/api/Frame.js` có **8** hunk và `lib/puppeteer/cdp/FrameManager.js` có **5** hunk. Nếu sổ khoá theo hunk thì `FrameManager.js` xuất hiện 5 lần, không phải 1. Vì vậy câu *"và đúng số hunk của file `@ark/schema`"* là câu **không kiểm được** — con số đó là 2, và nó phải được viết thẳng ra.
2. **"riêng mười file mã thư viện thật là 367 `+` / 38 `-`" — SAI. Mười file đó giữ TOÀN BỘ 377 `+` / 48 `-`.** Cộng cột `+` cho mười file `lib/puppeteer/**` ra đúng 377, cột `-` ra đúng 48. Không file `lib/` nào có 0 dòng. Con số 367/48 không xuất hiện ở bất kỳ phép cộng nào trên cây này. Hệ quả nhỏ nhưng quan trọng: toàn patch và phần "mã thư viện thật" **bằng nhau**. Đừng viết trong sổ rằng hai `.bun-tag` đóng góp 10 dòng — chúng đóng góp **0**.
3. **"hai file còn lại … mỗi cái 5 `+` / 5 `-`" — SAI, và sai ở CẤU TRÚC, không phải ở con số.** Chúng có **0 `+` / 0 `-`**, và có **0 hunk**. Bốn dòng đầu file thật, nguyên văn: dòng 1 `diff --git a/node_modules/puppeteer-core/.bun-tag-2e714b457f0bd8e8 b/.bun-tag-2e714b457f0bd8e8`, dòng 2 `new file mode 100644`, dòng 3 `index 0000000000000000000000000000000000000000..e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`, dòng 4 là diff thứ hai. `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` là SHA-1 của **file rỗng**. Không có dòng `---`, không `+++`, không `@@`. Đây là hai mục "khai báo file rỗng", không phải hunk sửa code.
4. **"Chúng vẫn phải có hàng ledger (một hàng bắt buộc cho MỖI hunk không phải ngoại lệ)" — VÔ LÝ dưới khoá theo hunk.** Mục "Cần người xác nhận" số 2 nói hai diff `.bun-tag-*` "vẫn phải có hàng ledger". Nhưng chúng có **không hunk nào**. Một `reconcile` khoá theo hunk sẽ không bao giờ sinh ra hàng cho chúng, và nếu bắt buộc thì nó sẽ báo đỏ vĩnh viễn trên đúng cây hiện tại. Đây là lý do phải chọn khoá **hàng** trước khi viết dòng code đầu tiên.

**Ngoài ra — `LedgerRow` trong "Hình dạng code" KHÔNG định danh được hunk.** Work item định nghĩa interface có `readonly file`, `readonly purpose`, `readonly upstream`, `readonly dropWhen`. Nhưng `reconcile` nhận `hunksByFile: ReadonlyMap<string, ReadonlyArray<{ header: string }>>` — hunk **có** `header`. Vậy mà `LedgerRow` **không** mang tham chiếu hunk nào. Với `FrameManager.js` có 5 hunk, sổ sẽ có 5 hàng mà **5 hàng đều có `file` giống hệt nhau** và không có gì phân biệt chúng. Bảng markdown ví dụ trong work item cũng chỉ có 4 cột, không cột nào là định danh hunk. Như vậy hàm `reconcile` **không thể** so khớp được dù chỉ có 1 hunk: nó không biết hàng thứ 3 ứng với hunk nào. **Sửa bắt buộc:** `LedgerRow` phải mang khoá hunk — hoặc `readonly hunk: string` (chính chuỗi `@@ -51,8 +51,10 @@ …`), hoặc `readonly hunkIndex: number` tính theo thứ tự trong file. Bảng markdown sinh ra phải có cột định danh tương ứng.

**Bảng điểm sửa**

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `patches/LEDGER.md` | *(tạo mới — `ls patches/` không có)* | — | file sinh: dòng `<!-- GENERATED by scripts/gen-patch-ledger.ts — do not edit by hand. -->` + bảng markdown, **32 hàng** nếu khoá hunk |
| `scripts/gen-patch-ledger.ts` | *(tạo mới)* | — | `parsePatchHunks` + `reconcile` + CLI ghi file; khuôn theo `scripts/gen-bazel-lock.ts` (`#!/usr/bin/env bun` + `import.meta.dir` + cờ `--check`) |
| `scripts/gen-patch-ledger.test.ts` | *(tạo mới)* | — | 4 case: happy path, hunk thêm→đỏ, hàng xoá→đỏ, mismatch `patchedDependencies`↔`patches/` hai chiều |
| `package.json:167` | khối `scripts` | `"check-spoofed-versions": "bun scripts/check-spoofed-versions.ts"` | chèn `"gen:patch-ledger": "bun scripts/gen-patch-ledger.ts",` **phía trên** dòng này (dòng này là mục cuối, không có dấu phẩy) |
| `package.json:206-209` | `patchedDependencies` | `"patchedDependencies": {`<br>`	"@ark/schema@0.56.2": "patches/@ark%2Fschema@0.56.2.patch",`<br>`	"puppeteer-core@25.3.0": "patches/puppeteer-core@25.3.0.patch"`<br>`}` | **không đổi một ký tự** — nhưng dồn xuống dòng **207-210** |
| `CONTRIBUTING.md:93-101` | mục mới, đặt trước `## Review` | `## Review`<br>`<br>`<br>`Maintainers review the submitted behavior and the contributor's understanding` | thêm `## Local dependency patches` (~4 dòng) **trước** `## Review`; file 101 dòng |
| `.github/workflows/ci.yml:617` | allowlist test scripts | `bun test scripts/ci-test-ts.test.ts scripts/release.test.ts` | `bun test scripts/ci-test-ts.test.ts scripts/release.test.ts scripts/gen-patch-ledger.test.ts` — **file bị bỏ sót trong work item** |
| `patches/puppeteer-core@25.3.0.patch` | `md5` | `de58a43ccbfe895d0d741d481fae82d6` (35.203 byte) | **không đổi** |
| `patches/@ark%2Fschema@0.56.2.patch` | `md5` | `3db02a61cff556913c429faec932fa7c` (1.431 byte) | **không đổi** |

**Bảng đếm thật — dán vào test fixture, đừng đoán lại.** `patches/puppeteer-core@25.3.0.patch`, đếm bằng `awk` từng mục `diff --git`:

| file (phía `a/`) | hunk `@@` | `+` | `-` |
| --- | ---: | ---: | ---: |
| `node_modules/puppeteer-core/.bun-tag-2e714b457f0bd8e8` | **0** | **0** | **0** |
| `node_modules/puppeteer-core/.bun-tag-a797aeb3ca2bd69f` | **0** | **0** | **0** |
| `lib/puppeteer/api/ElementHandle.js` | 5 | 68 | 7 |
| `lib/puppeteer/api/Frame.js` | 8 | 52 | 7 |
| `lib/puppeteer/cdp/ExecutionContext.js` | 2 | 10 | 6 |
| `lib/puppeteer/cdp/Frame.js` | 2 | 2 | 2 |
| `lib/puppeteer/cdp/FrameManager.js` | 5 | 189 | 3 |
| `lib/puppeteer/cdp/IsolatedWorld.js` | 2 | 20 | 0 |
| `lib/puppeteer/cdp/WebWorker.js` | 2 | 15 | 4 |
| `lib/puppeteer/common/util.js` | 1 | 3 | 1 |
| `lib/puppeteer/common/QueryHandler.js` | 2 | 13 | 3 |
| `lib/puppeteer/node/ChromeLauncher.js` | 1 | 5 | 15 |
| **tổng** | **30** | **377** | **48** |

`patches/@ark%2Fschema@0.56.2.patch`: **1** `diff --git`, **2** hunk `@@` — `@@ -51,8 +51,10 @@` (dòng 5) và `@@ -111,7 +113,7 @@` (dòng 18).

**Tổng sổ = 32 hàng** nếu khoá theo hunk (30 + 2); **13 hàng** nếu khoá theo file (12 + 1).

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc)

0. **Chốt khoá hàng TRƯỚC khi viết dòng code đầu tiên.** Đây là bước kế hoạch không có, và mọi thứ sau nó phụ thuộc vào nó. **Khoá theo hunk** (`file` + `@@` header) → 32 hàng; hai diff `.bun-tag-*` có **0 hàng**, nên sổ không nhắc tới chúng, và câu "mỗi hunk một hàng" được giữ đúng nghĩa. **Khoá theo diff** → 13 hàng; hai `.bun-tag-*` phải có hàng, và mỗi file `FrameManager.js` gộp 5 hunk vào một hàng — mất đúng thứ mục này sinh ra để bảo vệ. Khuyến nghị: **khoá theo hunk**, và thêm một đoạn giải thích ngắn ở cuối `LEDGER.md` nói rõ hai file `.bun-tag-*` là entry của Bun sinh tự động, không phải hunk sửa tay. Đây cũng chính là câu hỏi người quyết ở cuối — nhưng nó **không chặn** việc code nếu chọn khoá hunk.
1. **Viết `scripts/gen-patch-ledger.ts`.** Neo đã kiểm `package.json:166-167` (chỗ chèn script), và khuôn generator ở `scripts/gen-bazel-lock.ts:1-25` (`#!/usr/bin/env bun`, `const repoRoot = path.join(import.meta.dir, "..")`, cờ `--check` dùng để so hash thay vì ghi). `parsePatchHunks(patchText)` phải **thuần**, nhận chuỗi, không đọc đĩa — để test fixture nạp một diff giả không cần file thật. Chia theo `diff --git` trước, rồi theo `@@` sau. **Cấm** coi `---`/`+++` của header là hunk. `reconcile` trả `{ ok: false; missing; orphaned }` — `missing` là hunk không có hàng, `orphaned` là hàng không có hunk. Cả hai phải đỏ. Dùng `Bun.file().text()` / `Bun.write()` (AGENTS.md). `fs.readdir` cho thư mục `patches/`. Không `console.log` trong đường chạy TUI — đây là script CLI một lần nên `console.*` được phép, nhưng cứ in ra `logger` theo mặc định và chỉ dùng `process.stdout` cho bảng.
2. **Thêm script vào `package.json`.** Neo đã kiểm `package.json:166-167`: dòng 166 là `		"gen:glyphs": "bun --cwd=packages/tui run gen:glyphs",` và dòng 167 là `		"check-spoofed-versions": "bun scripts/check-spoofed-versions.ts"`. Dòng 167 là mục cuối của khối `scripts` và **không có dấu phẩy**. Dòng mới phải có dấu phẩy. Chèn ở `:167` (giữa `gen:glyphs` và `check-spoofed-versions`) để nhóm `gen:*` không bị chia.
3. **Sinh `patches/LEDGER.md` lần đầu.** Neo đã kiểm: `patches/` chỉ có 2 file, không có `LEDGER.md`. Chạy `bun run gen:patch-ledger`, xong `git add patches/LEDGER.md`. Chạy lần hai phải không đổi byte.
4. **Mục `CONTRIBUTING.md`.** Neo đã kiểm: `grep -c "patch" CONTRIBUTING.md` → **0**; mục cuối là `## Review` ở `CONTRIBUTING.md:93`, file dài 101 dòng, dòng 101 là `changes.`. Đây là mục **mới**, không phải sửa mục cũ. Chèn trước `## Review` để nhóm với `## Pull request requirements` hơn là đuôi file. Nội dung ~4 dòng: thêm patch = thêm hàng `LEDGER.md` + chạy `bun run gen:patch-ledger` + commit **cùng PR**.
5. **Sửa `.github/workflows/ci.yml:617`.** Neo đã kiểm: dòng đó nguyên văn là `              bun test scripts/ci-test-ts.test.ts scripts/release.test.ts` — đó là **allowlist hai file**. Job chạy trước nó là `bun run ci:test:ts:workspace`, và `ci-test-ts.ts:88-110` liệt kê `fastWorkspacePackages` / `nativeAndIntegrationPackages` / `localOnlyWorkspacePackages` — **không bucket nào chứa `scripts/`**. Hệ quả: một `scripts/gen-patch-ledger.test.ts` mới sẽ **không bao giờ chạy trong CI**, và test đỏ cũng không ai thấy. **Work item không liệt kê `.github/workflows/ci.yml` trong "File cần chạm tới" — đó là một file bị bỏ sót.**
6. **Chạy cổng** (mục *Cổng*).

**Hợp đồng test**

**File:** `scripts/gen-patch-ledger.test.ts` (mới, kế cạnh `scripts/ci-release-publish.test.ts`). `scripts/ci-release-publish.test.ts:1` dùng `import { describe, expect, it } from "bun:test";` và `import * as fs from "node:fs/promises"` — theo đúng đó.

Fixture phải là **byte thật của một patch** (chuỗi nhiều dòng trong test, hoặc file tạm bằng `fs.mkdtemp`), **không** phải object trường `purpose` do script tự điền — lý do nằm ở bước 3 của work item: nếu test chỉ so trường do script điền thì ba tập luôn khớp và test vô nghĩa.

| # | Case | Khẳng định | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | happy path trên cây thật | `reconcile(cây thật)` → `ok: true`, số hàng = **32** (30 puppeteer + 2 ark) | Người đọc `LEDGER.md` thấy mỗi hunk có một hàng; nếu số hàng lệch 32, sổ đang bỏ sót hoặc gộp hunk |
| 2 | **âm** — thêm một hunk giả vào diff của fixture | `ok: false`, hunk đó nằm trong `missing` | Maintainer vá thêm một hunk lên puppeteer mà không khai lý do → sổ im lặng, người đọc không biết hunk đó vá cái gì |
| 3 | **âm** — xoá một hàng ledger cho hunk vẫn còn | `ok: false`, hàng đó nằm trong `orphaned` | Người viết xoá dòng ledger cho "gọn" → không ai còn thấy hunk đó cần lý do; đây là nghịch lý tự-khớp mà work item cảnh báo |
| 4 | **âm hai chiều** — `patchedDependencies` liệt kê 3 mục, `patches/` chỉ có 2 file; và ngược lại | cả hai đều đỏ | Ai sửa `package.json` mà quên dọn `patches/` (hoặc ngược lại) → patch không còn được Bun áp dụng mà repo vẫn xanh |
| 5 | hai file `.bun-tag-*` không sinh hàng hunk nào | `missing` rỗng cho chúng, sổ vẫn `ok: true` | Không có case này thì khoá hàng bị bẻ bởi chính cây hiện tại và cổng luôn đỏ |

Case 5 chỉ có nghĩa nếu chọn khoá hunk ở bước 0. Nếu chọn khoá diff, thay bằng: hai `.bun-tag-*` **có** hàng, và `purpose` của chúng phải nói rõ là file Bun sinh.

**Cổng có đỏ được không — câu trả lời thẳng: Ở dạng kế hoạch viết, KHÔNG ĐỦ.** Bốn trong năm cổng là cổng cục bộ, một cổng (`check:ts`) không chạm tới file mới nhất, và cổng (1) đo sai thứ.

| Cổng | Lệnh | **Có đỏ được không?** |
| --- | --- | --- |
| (1) sổ sinh lại được | `bun run gen:patch-ledger && git diff --exit-code -- patches/LEDGER.md` | **Có** — nhưng chỉ bắt được việc sổ **cũ**, không bắt việc sổ **nói dối** |
| (2) test ba tập | `bun test scripts/gen-patch-ledger.test.ts` | **Có, nhưng chỉ khi đã sửa `ci.yml:617`** — nếu không thì đây là lệnh cục bộ, không phải cổng |
| (3) hàng âm từng thấy đỏ | thủ công | **Không tự đỏ** — phải làm thủ công một lần rồi ghi lại. Không có máy nào ngăn PR sau |
| (4) `md5` hai file `.patch` không đổi | `md5 …` | **Có, nhưng thủ công và dễ bỏ** |
| (5) `bun run check:ts` | `bun run check:ts` | **Không** với `scripts/gen-patch-ledger.ts` — `check:tools` chỉ oxlint+oxfmt, `tsgo` bị `--filter './packages/*'` thu hẹp |

**Cổng (4) viết lại cho đỏ được.** `md5` là **ảnh chụp**, không phải so sánh. Người làm PR chạy nó sau khi đã sửa xong thì nó luôn xanh với chính file mình vừa sửa. Đổi thành `git diff --exit-code -- patches/`. Đỏ **ngay** nếu một byte nào trong `patches/` bị đụng, kể cả khi người làm PR không nhớ để chạy `md5`. Cờ đỏ tức thì; và nó cũng bắt được việc thêm file `.patch` mới mà quên thêm hàng ledger — điều mà `md5` hai tên file cố định không bao giờ bắt. Nếu vẫn muốn giữ `md5` (để dán vào mô tả PR như bằng chứng), thì phải chạy **trước** khi sửa bất cứ thứ gì, và dán **cả hai** giá trị:
```
de58a43ccbfe895d0d741d481fae82d6  patches/puppeteer-core@25.3.0.patch
3db02a61cff556913c429faec932fa7c  patches/@ark%2Fschema@0.56.2.patch
```

**Cổng (1) viết lại cho đỏ được.** `git diff --exit-code -- patches/LEDGER.md` sau khi đã commit sổ thì **luôn xanh** — nó chỉ bắt việc bạn chạy generator *sau* khi đã commit mà quên commit kết quả. Nó **không** bắt được điều work item muốn: sổ nói sai. Muốn cổng này có răng ở đúng chỗ, hãy thêm một kiểm tra vào chính `gen:patch-ledger.ts`, kiểu `--check`, theo đúng khuôn `scripts/gen-bazel-lock.ts` (file đó dùng cờ `--check` để "exit 1 when MODULE.bazel.lock is stale"):
```bash
bun run gen:patch-ledger --check   # exit 1 khi patches/LEDGER.md lệch bảng sinh ra
```
và chạy nó **trong CI** (cùng chỗ với `ci.yml:617`). Khi đó: thêm hunk mà quên cập nhật sổ → đỏ; sổ bị sửa tay → đỏ; sổ bị xoá → đỏ. **Ba sửa ở trên — `--check` trong CI, `git diff --exit-code -- patches/`, và sửa `ci.yml:617` — biến nó thành cổng thật. Không có chúng, một cổng luôn xanh tệ hơn không có cổng.**

**Lệnh kiểm của kế hoạch — `sed -n '206,209p' package.json` — BỎ. Nó tự phá chính nó.** Work item bắt "Không đụng `package.json`" và xác minh bằng `sed -n '206,209p' package.json`. Nhưng bước thêm script mục đó lại **chèn một dòng vào trên**, đẩy khối `patchedDependencies` xuống dưới. Đã mô phỏng chính xác thao tác chèn: sau khi làm đúng yêu cầu, `sed -n '206,209p'` in ra `},` + khối mở + ark + puppeteer — **mất dấu `}` đóng**, và người review nhìn vào đó sẽ tưởng khối cấu hình bị sửa. Thay bằng:
```bash
# Khối cấu hình phải y nguyên — kiểm theo NỘI DUNG, không theo số dòng
git diff --exit-code -- package.json
```
Sau khi thêm script, `git diff package.json` phải ra **đúng một dòng `+`** và không có dòng `-` nào. Đó là cổng thật: nó đỏ nếu ai đó đụng `patchedDependencies`, và nó tự miễn nhiễm với việc khối bị dồn dòng.

**Lệnh cuối, đúng thứ tự:**
```bash
md5 patches/puppeteer-core@25.3.0.patch patches/@ark%2Fschema@0.56.2.patch   # TRƯỚC
# … sửa code …
bun run gen:patch-ledger
git diff --exit-code -- patches/          # không một byte .patch nào đổi
git diff --exit-code -- package.json      # đúng một dòng +, tự thêm script
bun test scripts/gen-patch-ledger.test.ts
bun run check:ts
md5 patches/puppeteer-core@25.3.0.patch patches/@ark%2Fschema@0.56.2.patch   # SAU — y hệt
```
Tuyệt đối không `tsc` / `npx tsc` — dự án cấm.

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: nhầm `diff --git` với hunk.** Work item **tự mâu thuẫn**: nó nói "một hàng cho **mỗi hunk**" ở bốn chỗ khác nhau, nhưng hợp đồng test lại đòi "đúng 12 hunk", và 12 là số `diff --git`. Người gõ code chạy `grep -c '^@@'`, thấy 30, tưởng mình hiểu sai tài liệu, rồi làm theo con số 12. Kết quả: `Frame.js` (8 hunk) chỉ có 1 hàng, sổ báo 13 hàng thay vì 32, và đúng mục mà cả item sinh ra để bảo vệ — *"vá cái gì"* — lại bị mất ở tệp file nhiều hunk nhất. **Đây là bẫy sẽ xảy ra với người gõ cẩn thận nhất, vì họ cứ "sửa cho khớp tài liệu".** Bằng chứng bắt buộc nhớ: `lib/puppeteer/api/Frame.js` = **8 hunk**, `lib/puppeteer/cdp/FrameManager.js` = **5 hunk** (189 `+` trong 5 hunk), `lib/puppeteer/api/ElementHandle.js` = **5 hunk**.
2. **Nghịch lý tự-khớp (work item đã cảnh báo, và cách nó xảy ra).** Work item nói đúng: đừng biến `LEDGER.md` thành nơi người ta **gõ** lý do rồi để script chỉ kiểm tra khớp. Nhưng lời cảnh báo không cho biết **cửa sổ** để làm điều đó: `LedgerRow` trong "Hình dạng code" có `purpose` và `upstream` do script điền, và `reconcile` **không** kiểm tra chúng (vì nó **không thể**). Nên nếu bạn bám đúng chữ ký trong tài liệu, bạn sẽ xây một cái máy chỉ so khớp — tức đúng cái bẫy tài liệu vừa cảnh báo, trong khuôn mà tài liệu vẽ ra. **Lối thoát thật:** `purpose`/`upstream`/`dropWhen` phải nằm trong **sidecar** có nguồn riêng mà `reconcile` **không** sinh ra, và hàng ledger sinh chỉ mang khoá hunk + con trỏ tới sidecar. Như vậy ba tập khớp **vì ba nguồn độc lập khớp**, chứ không phải vì ba tập cùng được sinh từ một chỗ. Đây là quyết định thiết kế, và nó **chưa có câu trả lời trong work item** — xem mục *Cần người quyết* mục 1.
3. **Hai diff `.bun-tag-*` làm hỏng `parsePatchHunks`.** Chúng có `diff --git` + `new file mode` + `index 000..e69de29` rồi **hết file** — không `---`, không `+++`, không `@@`. Một parser viết bằng regex thẳng "mọi khối bắt đầu bằng `diff --git` là một file, các khối `@@` bên trong là hunk" sẽ chạy đúng ở đây, nhưng khi gặp block kế tiếp mà không có `---`/`+++` sẽ dễ nuốt nhầm. Bằng chứng bắt buộc có trong test: assert hai tên `.bun-tag-*` có mặt trong danh sách file nhưng có **0** hunk.
4. **`check:ts` xanh không có nghĩa file mới đúng kiểu.** `bun run check:ts` không typecheck `scripts/`. Thêm vào đó `lint-staged` (`package.json:187-201`) chỉ phủ `scripts/**/*.ts` — **không** phủ `patches/LEDGER.md` hay `CONTRIBUTING.md`, nên hai file markdown đó không qua formatter nào. Nếu bạn muốn sổ ổn định byte, hãy để script tự format bảng (căn cột cố định, `\n` cuối file) thay vì trông chờ ai đó.
5. **Sửa `LEDGER.md` bằng tay rồi commit.** Sổ bắt đầu bằng `<!-- GENERATED by scripts/gen-patch-ledger.ts — do not edit by hand. -->` nhưng không có hook nào ngăn tay sửa. Nếu bạn sửa tay một lý do (rất dễ, vì cột `purpose` trống và trông như chỗ để gõ), lần chạy kế tiếp sẽ **ghi đè** mất — và nếu bạn không chạy lại trước khi commit, `--check` ở CI sẽ đỏ với lý do mà người review đoán sai. Đây là lý do cổng `--check` phải nằm trong CI chứ không phải trong tay người gõ.
6. **Lan sang tầng khác.** Work item đã tự cảnh báo: chỉ `patches/`, khoá Bun. Đừng sinh `LEDGER.md` ở `crates/`. Đừng thêm generic hook cho "mọi thứ có bản vá cục bộ" — mỗi nơi phải tự chứng minh bằng cùng một loại cổng.

**Cần người quyết (chặn trước khi gõ dòng 8.1)**

1. **`purpose` / `upstream` sống ở đâu?** Nếu script tự điền thì `reconcile` không kiểm được chúng và ta lại dựng đúng cổng luôn-xanh mà work item cảnh báo. Đề xuất: sidecar riêng (`patches/LEDGER.notes.json` hoặc khối YAML ở cuối `LEDGER.md` mà generator **không** xoá), ledger sinh chỉ mang khoá hunk + con trỏ. **Đây là câu hỏi chặn việc code.**
2. **Cột `upstream` cho hunk không có issue?** Cùng câu hỏi của work item. Đo được: 18 comment `// xxx-stealth:` rải trong 10 file, và **0** hunk nào ở file puppeteer có marker. Cho phép `null` là câu trả lời trung thực; ô điền bừa là nguồn sự thật thứ hai.
3. **Hai `.bun-tag-*` ghi gì?** Nếu chọn khoá hunk (bước 0) thì chúng không có hàng nào và câu hỏi này thu hẹp thành: có cần một dòng giải thích trong `LEDGER.md` không.
4. **Cột CHANGELOG thuộc item này?** Không đổi hành vi người dùng → theo luật M4 là không; nhưng `CONTRIBUTING.md` đổi cho người góp patch. Chờ quyết định changelog chung của Wave D.
5. **Thứ tự merge trước GAP-M1-18?** Đã đo: `doctor` hiện chỉ tồn tại dưới dạng `omp plugin doctor` (`packages/coding-agent/src/cli/plugin-cli.ts:32`, xử lý ở `:168`, qua `handleDoctor(manager, cmd.flags)`) — chưa có `omp doctor` cấp gốc. Nên phụ thuộc là thật, không hình thức.

---

## GAP-M4-11. Một hàm chuẩn hoá lỗi không ném được, thay cho 895 bản sao của cùng một idiom (sóng B)

**Sóng:** M4 Wave B — Ghi trạng thái bền vững và sự thật của bảng settings (`shippable: false`, chờ cổng changelog dùng chung của M4, plan §6.2/§6.3). Cùng đợt M4-4/M4-6.
**Effort:** M về cơ chế, **đắt về kỷ luật ghi chú**
**Phụ thuộc:** Không có phụ thuộc cứng với M2. Nhưng nó là **một hàm + một oxlint rule + một test**, không phải một refactor 895 chỗ — xem GAP-D8 ở "Cần người quyết".

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/src/normalize-error.ts` | tạo | `normalizeErrorMessage(value: unknown): string`. Bọc **mọi** truy cập thuộc tính trong try/catch riêng, không dùng `String(value)` trực tiếp lên object tuỳ ý, fallback `Object.prototype.toString.call(value)`, và **không bao giờ** ném. | có (file chưa tồn tại — `packages/utils/src/` không có file nào tên `normalize-error`) |
| `packages/utils/test/normalize-error.test.ts` | tạo | Test: ném object có getter `message` **ném lỗi**; khẳng định hàm trả về chuỗi và **không** ném; khẳng định **âm** rằng lỗi gốc vẫn là lỗi được báo, không phải lỗi của getter. | có (file mới; thư mục `packages/utils/test/` tồn tại — xem `packages/utils/test/file-lock.test.ts`) |
| `packages/agent/src/agent-loop.ts` | sửa | **Di dời có chọn lọc** — một trong bốn đường mà bẫy là thật. | có (rải đều từ đây: `git grep -c` cho 3 hit) |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | Đường session — call site phải lấy chuỗi qua hàm mới. | có (file tồn tại; cùng file chứa `emitToolCall` ở `:4509`, xem GAP-M4-12) |
| `packages/utils/src/logger.ts` | sửa | Đường logger. | có — logger là logger trung tâm mà `AGENTS.md` chỉ định; sửa ở bản sao riêng thay vì ở đây là tạo nguồn sự thật thứ hai |
| `packages/coding-agent/src/dap/client.ts` | sửa | Bản `toErrorMessage` riêng ở `:49` **giữ nguyên hành vi**; có thể gọi hàm mới, nhưng **không được xoá**. | có — `function toErrorMessage(value: unknown): string {` tại `:49`, module-private, không có trong export list |
| `packages/coding-agent/src/dap/session.ts` | sửa | Bản `toErrorMessage` riêng ở `:118`, cùng điều kiện. | có — `function toErrorMessage(value: unknown): string {` tại `:118` (`:116` là hằng `STOP_CAPTURE_TIMEOUT_MS`, `:117` trống) |
| cấu hình oxlint | sửa | Một rule cấm idiom thô trong **code mới**. AGENTS.md cho phép dùng oxlint để giữ bất biến cấu trúc và **cấm** source-grep trong test, nên đây là đường đúng, không phải đường lách. | có — đường này được AGENTS.md mở sẵn; không cần một lý do pháp lý để chọn nó |

### Các bước

1. **Đo lại con số trước khi viết.** `git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l` → **895**, rải đều từ `packages/agent/src/agent-loop.ts` (3 hit) tới `packages/ai/src/auth-broker/server.ts` (8). Con số này là câu trả lời cho "mức nghiêm trọng có thật không", nên nó phải là con số của cây hôm nay, không phải của cây hôm ghi đặc tả.

2. **Viết hàm, không refactor 895 chỗ.** Bốn việc:
   1. `normalizeErrorMessage(value: unknown): string` trong `packages/utils` — bọc **mọi** truy cập thuộc tính trong try/catch riêng, không dùng `String(value)` trực tiếp lên object tuỳ ý, fallback `Object.prototype.toString.call(value)` (không ném được với Symbol / null / Proxy đã huỷ), và **không bao giờ** ném.
   2. **Di dời có chọn lọc**: các đường mà bẫy là thật — agent loop, session, TUI error render, logger — chứ không phải cả 895. Ghi rõ vào item rằng phần còn lại là **nợ kỹ thuật có chủ**.
   3. Một **oxlint rule** cấm idiom thô trong code mới.
   4. Test: ném object có getter `message` ném lỗi, khẳng định `normalizeErrorMessage` trả về chuỗi và **không** ném; khẳng định **âm** rằng lỗi gốc vẫn là lỗi được báo, không phải lỗi của getter.

3. **Đừng xoá hai bản `private` ở `dap/`.** Chúng **giữ nguyên hành vi** — có thể gọi hàm mới, nhưng không được xoá. Đây là điều khoản bảo toàn, không phải tùy chọn: hai hàm đó nằm trên đường giao tiếp debugger, nơi một chuỗi bị đổi hình dạng là một hồi quy khó chịu và khó tái hiện.

4. **Ghi tiêu chí chọn vào mô tả PR.** 895 chỗ **không được sửa hết** trong PR này; PR phải nêu rõ tiêu chí đã dùng để chọn bốn đường đó. Không có câu này thì người đọc không phân biệt được "chọn lọc có chủ ý" với "làm được đến đâu làm đến đấy".

5. **Chạy cổng** (khối Xác minh).

### Hình dạng code

```typescript
// packages/utils/src/normalize-error.ts

/**
 * Render an unknown thrown value as a string WITHOUT ever throwing.
 *
 * Why this is not `value instanceof Error ? value.message : String(value)`:
 * both `obj.message` and `String(obj)` invoke user code. A Proxy — or simply an
 * object with a `message` getter that throws — makes the normalization itself
 * throw. That runs INSIDE a catch block, so the original error is replaced by an
 * unrelated one.
 */
export function normalizeErrorMessage(value: unknown): string {
	if (value instanceof Error) {
		try {
			return value.message;
		} catch {
			// A throwing `message` getter on an Error subclass lands here.
			return Object.prototype.toString.call(value);
		}
	}
	if (typeof value === "string") return value;

	try {
		// Object.prototype.toString is the one coercion that does not dispatch to
		// user code: safe for Symbol, null, and a revoked Proxy.
		return Object.prototype.toString.call(value);
	} catch {
		// A revoked Proxy throws from the tag lookup too. There is no value left
		// to render, so return a fixed string rather than propagating.
		return "[unrenderable error]";
	}
}
```

Khuôn của idiom bị cấm trong code mới (oxlint rule), chỉ để nhận diện — **không** chép vào test dưới dạng source-grep:

```typescript
// FORBIDDEN in new code — the getter can throw inside the catch block.
const msg = err instanceof Error ? err.message : String(err);
```

### Hợp đồng test

File test: `packages/utils/test/normalize-error.test.ts` (mới).

Diễn đạt hợp đồng: **nếu hồi quy, người dùng thấy một lỗi không liên quan thay cho lỗi thật.** Cụ thể, với một object có getter `message` ném lỗi, `normalizeErrorMessage` phải trả về một chuỗi và **không** ném; và lỗi mà caller vốn định báo phải vẫn là lỗi gốc, không phải lỗi của getter. Ở 895 call site thì đây không phải lý thuyết.

Hàng âm bắt buộc: một object **không** phải `Error` nhưng có getter `message` trả về chuỗi — hàm không được trả về chuỗi đó một cách âm thầm, vì đó là đường mà idiom cũ đi. Hàng này là thứ phân biệt "chuẩn hoá an toàn" với "chỉ chuyển sang một chỗ khác".

Ba nhánh khác phải mỗi nhánh một khẳng định, vì chúng là ba hợp đồng khác nhau: `null` và `undefined`; `Symbol()`; và một **revoked Proxy** — cái cuối cùng là trường hợp duy nhất làm `Object.prototype.toString.call` ném, nên nếu không có nó thì nhánh `catch` cuối là code không bao giờ chạy.

### Xác minh

```bash
# 0. TIỀN ĐỀ MÔI TRƯỜNG (đặt trước mọi lệnh `bun test`): addon chưa có thì mọi test
#    đỏ vì "Failed to load pi_natives native addon for darwin-arm64" — đỏ vì môi
#    trường, KHÔNG phải đỏ vì công việc.
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 1. Con số mốc — phải khớp con số trong mô tả item
git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l

# 2. Hàm mới
bun test packages/utils/test/normalize-error.test.ts

# 3. Bốn đường đã di dời — không hồi quy
bun test packages/agent/test/ packages/coding-agent/test/dap/

# 4. Types + lint + format. Hiện xanh sạch trên cây hiện tại; sau thay đổi vẫn phải xanh.
bun run check:ts
bun run lint

# 5. Kiểm tra cơ học hoàn tất (checklist của người, không phải test):
#    con số ở bước 1 phải GIẢM, không được tăng — đó là bằng chứng di dời có chủ ý
#    chứ không phải thêm một bản sao nữa.
```

Tuyệt đối không dùng `tsc`/`npx tsc` — dự án cấm, dùng `bun run check:ts`.

### Cổng hoàn thành

Mục này XONG khi tất cả đồng thời đúng:

0. **Tiền đề môi trường:** `bun --cwd=packages/natives run build` đã chạy; nếu chưa thì mọi điều kiện (2)-(4) ghi là "chưa chạy", không phải "chưa đạt".
1. Con số ở bước 1 của khối Xác minh **giảm** so với mốc ghi trong item.
2. `bun test packages/utils/test/normalize-error.test.ts` qua, gồm cả hàng âm của getter và cả ba nhánh `null` / `Symbol` / revoked Proxy.
3. Hai bản `private` ở `dap/client.ts:49` và `dap/session.ts:118` **còn nguyên hành vi** — chạy `bun test packages/coding-agent/test/dap/`.
4. Mô tả PR nêu rõ tiêu chí đã dùng để chọn **bốn** đường, và phần còn lại được ghi là nợ kỹ thuật **có chủ**.
5. `bun run check:ts` sạch; oxlint rule mới không làm đỏ cây hiện tại (nếu đỏ, đó là phát hiện thật về idiom thừa, và phải được xử lý có chủ, không bằng cách tắt rule).

**Cổng này có thực sự đỏ được không: có.** Hàng âm của getter là điều không thể bịa — bản triển khai hôm nay sẽ ném. Nhưng cổng này **không** bắt được hàng 895 — và không cổng nào bắt được, vì đó là lý do phần còn lại phải là nợ kỹ thuật có chủ chứ không phải một cổng.

### Phụ thuộc

- **depends_on:** không có. Đây là item không chặn ai trong M4.
- **blocks:** không có. `blocks` rỗng.

### Cách sai dễ nhất

Làm thành **một refactor 895 chỗ**. Diff đó không review được và nó **che mất thay đổi thật** — người đọc không còn biết dòng nào là hành vi và dòng nào là cơ chế. Đây là lý do GAP-D8 tồn tại: tiêu chí chọn phải được chốt **trước**, rồi phần còn lại ghi là nợ có chủ.

Lối sai thứ hai, tinh vi hơn: đặt hàm trong `packages/utils` nhưng không nối nó vào đường nào, chỉ thêm rule cấm idiom mới. Lúc đó số 895 không giảm, item "xanh" theo mọi cổng, và bốn đường bẫy-thật vẫn ném. Đó chính là loại "xanh mà không tới đâu" mà §Rủi ro của file này gọi tên — và nó là lý do điều kiện (1) là một cổng, không phải một ghi chú.

### Cần người quyết

- **GAP-D8: 895 call site — sửa hết, hay di dời có chọn lọc?** Khuyến nghị trong sổ khoảng trống: **không sửa hết trong PR này** — sẽ thành một diff không review được và che mất thay đổi thật. Cần chốt **tiêu chí chọn** (đề xuất: đường chạy trong `catch` ở agent loop, session, TUI error render, logger — nơi nuốt lỗi gốc là thiệt hại thật) và ghi phần còn lại là **nợ kỹ thuật có chủ** kèm owner. **Chưa có mặc định — cần bạn quyết.**
- **Ai là owner của nợ 895 − N?** Một dòng ghi nợ mà không có tên không phải nợ, nó là ý muốn. Cần một tên và một cách nhắc.
- **Hàm mới có nằm trong barrel `packages/utils` không?** Nếu có, nó trở thành bề mặt export công khai của package và bắt buộc phải có type test; nếu không, nó là một import sâu mà `AGENTS.md` cũng phải duyệt. Cần chốt trước khi viết import ở bốn call site.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "Không có hàm dùng chung nào: `export function errorMessage\|normalizeError\|toErrorMessage` trong `packages/utils/src` và `packages/coding-agent/src` chỉ trả về **hai** bản *private trong file* — `dap/client.ts:49` và `dap/session.ts:118`" | **SAI** — và nó làm đánh giá rủi ro nhẹ hơn thật | `packages/utils/src` có **zero** hàm dạng đó — phần này đúng. Nhưng `packages/coding-agent/src` có **ba** bản **đã export**: `src/ida/protocol.ts:31`, `src/slash-commands/helpers/parse.ts:66`, `src/subprocess/worker-runtime.ts:48`. Tệ hơn: `worker-runtime.ts` có **hai tên cho cùng một ý** — `errorText` ở `:44` và `errorMessage` ở `:48`, ngay cạnh nhau. Tức "không có hàm dùng chung" đúng, còn "chỉ có hai bản riêng" thì sai; số bản riêng lớn hơn con số ghi, và đã có người **export** chúng ra. Hệ quả thực hành: bước 2 phải nói rõ nó sẽ làm gì với ba bản đã export đó, chứ không chỉ với hai bản private. Bằng chứng: `git grep -n '^export function errorMessage\|^export function errorText' -- packages/utils/src packages/coding-agent/src`. |
| Con số 895 | **XÁC NHẬN CHÍNH XÁC** | `git grep -h "instanceof Error ? .*\.message : String(" -- packages/ \| wc -l` → 895, trên đúng cây hiện tại. Hai neo `toErrorMessage` cũng đúng: `dap/client.ts:49` và `dap/session.ts:118`. Sổ khoảng trống nói "không có hàm nào trong `packages/utils/src` trả về" là đúng. |

## Cần người xác nhận

1. **Claim "chỉ có hai bản private" bị bác, và nó đổi phạm vi item.** Đây không phải một sai lệch vô hại: sổ khoảng trống dùng nó để kết luận rằng việc di dời chỉ chạm hai file. Thật ra có **năm** bản `toErrorMessage`/`errorMessage` đã tồn tại — hai private, ba export — và bản thân việc hợp nhất chúng là một phần của item chứ không phải việc làm sau. Cần chốt: item này có gộp luôn ba bản đã export vào hàm mới, hay để lại và ghi nợ?
2. **`worker-runtime.ts` có hai tên cho một ý.** `errorText` (`:44`) và `errorMessage` (`:48`) cạnh nhau trong cùng một file là bằng chứng mạnh nhất cho "đây là idiom nhân bản", nhưng nó cũng là một phát hiện ngoài phạm vi. Không tự ý gộp; cần bạn quyết xem nó có thuộc item này không.



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo neo — đọc trước khi gõ. Mục này có HAI phiếu, cả hai đều tự khai là viết cho `GAP-M4-11`.** Cảnh báo tiêu đề của phiếu thứ nhất, nguyên văn: *"Lệnh giao việc ghi work item là `## M4-11. Chạy cái doctor đang nằm chết`. **Tiêu đề đó không tồn tại trong bất kỳ cây nguồn tham chiếu nào.** … Nếu người gõ được giao đúng 'chạy cái doctor', hãy dừng — đó là một work item khác (`GAP-M1-18`, `omp doctor`), nằm ở kế hoạch M1, và `MILESTONE_4_EXECUTION_PLAN.md:354` đã ghi rõ nó **chưa tồn tại** trong kế hoạch M1."* Hai phiếu đo 21 neo: **đúng 16 · hỏng 5**. Cụ thể:

1. **Hình dạng code trong mục này tự NÉM ở đúng trường hợp mà mục này bắt buộc phải test.** Phiếu thứ hai đã chạy thật hình dạng **nguyên văn** của kế hoạch:
   ```
   1 Error-throwing-getter  => "[object Error]"
   2 plain-throwing-getter  => "[object Object]"
   3 plain-safe-getter      => "[object Object]"
   4 null => "[object Null]"  undefined => "[object Undefined]"
   5 Symbol => "[object Symbol]"
   6 revoked THREW TypeError: Proxy has already been revoked. No more operations are allowed to be performed on it
   ```
   Hàng 6 **ném**. Nguyên nhân: `value instanceof Error` ở dòng đầu gọi `getPrototypeOf` qua proxy, và proxy đã bị revoke thì trap đó ném — **trước khi** tới `try` bao quanh `Object.prototype.toString.call`. Phiếu thứ nhất đo cùng thứ: `D normalize THREW → Proxy has already been revoked`. **Dùng hình dạng ở mục *Các bước* bước 2, đừng dán khối của kế hoạch.**
2. **`bun test packages/coding-agent/test/dap/` — thư mục KHÔNG tồn tại.** `ls` → "No such file or directory". `bun test` trên nó in "The following filters did not match any test files" và **exit 1** — tức là cổng đỏ **vĩnh viễn**, không phải vì công việc. Đây đúng là loại "cổng luôn đỏ tệ" — phiếu thứ nhất gọi nó "cổng giả — đổi thành `packages/coding-agent/test/debug/`". DAP test thật nằm ở `packages/coding-agent/test/debug/`: `dap-config.test.ts`, `dap-launch-failures.test.ts`, `dap-multi-session.test.ts` (đo: **54 pass / 0 fail**).
3. **`packages/utils/src/logger.ts` là "Đường logger" cần sửa — SAI.** `git grep -c "instanceof Error ? .*\.message : String(" -- packages/utils/src/logger.ts` → **0 hit**. Logger **không** phải call site nào của idiom. Sửa nó cũng **không làm giảm** con số 895. Bẫy ở logger là **thật** nhưng theo cơ chế khác: `jsonReplacer` tại `packages/utils/src/logger.ts:182` đọc `message: value.message` (`:186`) và `stack: value.stack` (`:187`) không có try/catch, rồi chạy trong `JSON.stringify(entry, jsonReplacer)` tại `:247`. Đã chạy thật: một `Error` subclass có getter `message` ném làm `jsonReplacer` **ném**, và nó ném ra khỏi `formatLogInfo` (`:235`) — tức là **đường logger hỏng trước cả khi ném tới**.
4. **"rải đều từ `agent-loop.ts` (3 hit) TỚI `auth-broker/server.ts` (8)" — ngôn ngữ "tới" bị đọc là trần, nhưng max thật là `packages/coding-agent/src/modes/controllers/command-controller.ts` với 27 hit.** Con số 8 đúng (`git grep -c` → 8), nhưng 27 mới là trần. Nếu bạn hiểu câu đó là "cây hằng số nằm giữa 3 và 8" thì bạn sẽ bỏ sót file nhiều nhất.
5. **Mô tả fixture của hợp đồng test: "object có getter `message` ném lỗi" ⇒ hôm nay ném — SAI, và đây là cổng giả.** Object thường cho `String()` **không** gọi getter `message`, nên nó **không ném**, mà ra `[object Object]`. Đã chạy cả hai. Xem mục *Hợp đồng test* — cách dựng fixture đúng.

**Các neo ĐÚNG (dùng nguyên trạng):** `agent-loop.ts` = 3 hit (`:2909`, `:3417`, `:3454`); con số **895** qua `git grep` — **đúng tuyệt đối**; `agent-session.ts:4509` = `emitToolCall`; `dap/client.ts:49` và `dap/session.ts:118` = `function toErrorMessage(value: unknown): string {` (và `:116` là `STOP_CAPTURE_TIMEOUT_MS`, `:117` trống); `ida/protocol.ts:31` và `slash-commands/helpers/parse.ts:66` = `export function errorMessage`; `worker-runtime.ts:44` `errorText` / `:48` `errorMessage`; `packages/utils/test/file-lock.test.ts` tồn tại; `packages/utils/src/normalize-error.ts` và `packages/utils/test/normalize-error.test.ts` chưa tồn tại; `.oxlintrc.json` tồn tại, oxlint **1.85.0**, có `jsPlugins` + `overrides`; `bun run check:ts` và `bun run lint` tồn tại; `bun --cwd=packages/natives run build` tồn tại; `packages/agent/test/` tồn tại; `packages/coding-agent/test/debug/` tồn tại.

**Đo lại trên cây này (đừng chạy lại rồi ghi con số khác):**
```bash
git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l
```
→ **895**. Phân rã: `packages/**/src/**` = **821**, `packages/**/test/**` = **56**. 56 hit trong `test/` gồm **23 dòng JSON fixture** (`packages/coding-agent/test/fixtures/before-compaction.jsonl`) — transcript đã ghi, không phải code, **không bao giờ được migrate**.

**Bảng điểm sửa**

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/utils/src/normalize-error.ts` **(tạo)** | `normalizeErrorMessage` | *file không tồn tại* | hàm thuần, **không bao giờ ném** — bản đúng ở bước 2 |
| `packages/utils/test/normalize-error.test.ts` **(tạo)** | — | *file không tồn tại* | 7 case, xem *Hợp đồng test* |
| `packages/utils/src/index.ts` | barrel | `export * from "./materialize-string";` (dòng 20) | thêm `export * from "./normalize-error";` giữa dòng 20 và 21 |
| `packages/agent/src/agent-loop.ts:2909` | `validate()` closure | `validationError instanceof Error ? validationError.message : String(validationError);` | `normalizeErrorMessage(validationError)` |
| `packages/agent/src/agent-loop.ts:3417` | tool-result text | `content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],` | `content: [{ type: "text", text: normalizeErrorMessage(e) }],` |
| `packages/agent/src/agent-loop.ts:3454` | tool-result text | *trùng dạng với 3417* | `normalizeErrorMessage(e)` |
| `packages/coding-agent/src/session/agent-session.ts:10583` | rollback failure text | `` rollbackFailure = `cwd rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`; `` | `` rollbackFailure = `cwd rollback failed: ${normalizeErrorMessage(rollbackError)}`; `` |
| `packages/coding-agent/src/session/agent-session.ts:10589` | **`const original`** | `const original = error instanceof Error ? error.message : String(error);` | `const original = normalizeErrorMessage(error);` — **đây là site giữ trọng tâm**: nó đặt tên là "original" rồi nuốt mất nó |
| `packages/coding-agent/src/session/agent-session.ts` (14 site còn lại) | `error:`/`err:`/`republishError` | `error: err instanceof Error ? err.message : String(err),` (2794, 2816, 2822, 2834, 2909, 2954, 4269, 7534, 7658, 7661, 8526, 8574, 8634, 9502) | `error: normalizeErrorMessage(err),` |
| `packages/coding-agent/src/session/agent-session.ts:7658` | `#extensionRunner.emitError` | `error: err instanceof Error ? err.message : String(err),` | `error: normalizeErrorMessage(err),` |
| `packages/coding-agent/src/session/agent-session.ts:7661` | `const message` trong `catch` của custom command | `const message = err instanceof Error ? err.message : String(err);` | `const message = normalizeErrorMessage(err);` |
| `packages/tui/src/chrome/error-block.ts:19` | `sanitizeErrorLine` | `const message = error instanceof Error ? error.message : String(error);` | `normalizeErrorMessage(error)` — **file này KHÔNG có trong bảng "File cần chạm tới" của mục này** |
| `packages/utils/src/logger.ts:183-186` | `jsonReplacer` | `message: value.message,` / `stack: value.stack,` — **không có try/call nào** | **KHÔNG sửa trong item này** — 0 hit idiom. Xem cạm bẫy 6 |
| `packages/coding-agent/src/dap/client.ts:49-52` | `toErrorMessage` | `function toErrorMessage(value: unknown): string {`<br>`	if (value instanceof Error) return value.message;`<br>`	return String(value);`<br>`}` | **giữ nguyên hành vi** — có thể gọi hàm mới, **không được xoá** |
| `packages/coding-agent/src/dap/session.ts:118-121` | `toErrorMessage` | *giống hệt, y hệt 4 dòng* | **giữ nguyên hành vi** — có thể gọi hàm mới, **không được xoá** |
| `packages/coding-agent/src/ida/protocol.ts:31-33` | `errorMessage` **đã export** | `export function errorMessage(error: unknown): string {`<br>`	return error instanceof Error ? error.message : String(error);`<br>`}` | xem mục *Cần người quyết* — gộp hay giữ nợ? |
| `packages/coding-agent/src/slash-commands/helpers/parse.ts:66-68` | `errorMessage` **đã export** | *giống hệt, y hệt 3 dòng* | như trên |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:44-46` | `errorText` **đã export** | `return error instanceof Error ? (error.stack ?? error.message) : String(error);` | **KHÁC HẲN** — ưu tiên `stack`. Gộp vào hàm mới là **đổi hành vi** |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:48-50` | `errorMessage` **đã export** | `return error instanceof Error ? error.message : String(error);` | như trên |
| `.oxlintrc.json` | `rules` | khối `rules` hiện có 12 rule, không có rule nào cấm idiom | xem bước 4–5 — **cạm bẫy lớn nhất của mục này** |

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc)

0. **Đo lại, ghi mốc (không sửa gì).** `git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l` → **895** trên đúng cây này, khớp tuyệt đối mốc trong mục này.
1. **Chọn bốn đường, và chốt tiêu chí chọn.**

| đường | file | neo đã kiểm | số idiom | vì sao là bẫy-thật |
| --- | --- | --- | --- | --- |
| agent loop | `packages/agent/src/agent-loop.ts` | `:2909`, `:3417`, `:3454` | 3 | `:3417` và `:3454` nằm ngay trong `catch (e) {` (đọc `:3414` và `:3451`); `:2909` nằm trong một `try` của validation, **không phải** `catch` |
| session | `packages/coding-agent/src/session/agent-session.ts` | **16** hit; `:10589` là site giữ trọng tâm | 16 | `const original = …` rồi một `throw new Error(…)` ghép `original` với `rollbackFailure` — nuốt lỗi gốc rồi ném lỗi mới |
| TUI error render | `packages/tui/src/chrome/error-block.ts` | `:19` (`sanitizeErrorLine`) | 1 | hàm render mà caller gọi **từ trong** `catch` (ví dụ `btw-controller.ts`, `btw-panel.ts`) |
| logger | `packages/utils/src/logger.ts` | `jsonReplacer` tại `:182` | **0** | **không phải call site idiom** — xem cảnh báo neo 3 |
| *(đáng chú ý nhất toàn cây)* | `packages/coding-agent/src/modes/controllers/command-controller.ts` | — | **27** | nhiều nhất toàn cây; đường hiển thị ra màn hình; người dùng thấy chuỗi hỏng |

**Tiêu chí chọn phải viết thành câu trong mô tả PR**, không viết trong đầu. Đề xuất: *"chỉ di dời những call site nằm trong khối `catch` và nằm trên đường mà lỗi gốc bị thay"* — nơi nuốt lỗi gốc là thiệt hại **đã thấy được**, không phải chỉ là mất thông tin khi debug. Với tiêu chí đó, `agent-session.ts` có 16 chỗ trong đó 4 chỗ nằm trong `catch` thật; phần còn lại là log/emit metadata — vẫn là đường nuốt lỗi. **Khuyến nghị cụ thể: di dời TOÀN BỘ 20 hit ở ba file có idiom** (3 + 16 + 1). Lý do: cùng một file, cùng một kiểu sửa một dòng, review được, và `error-block.ts` chỉ có đúng 1 hit nên không tốn gì. Bỏ sót 13 hit trong `agent-session.ts` để tiết kiệm sẽ để lại đúng loại "xanh mà không tới đâu". Nói thẳng trong PR: **20 trên 895 là 2,2%** — cổng này đỏ được ở mức "có thay đổi", không đỏ được ở mức "thay đủ".
2. **Viết hàm ở `packages/utils/src/normalize-error.ts`.** Không phải bản trong kế hoạch — bản trong kế hoạch **ném**. Hình dạng đúng, đã chạy qua 11 input, **không ném lần nào**: `export function normalizeErrorMessage(value: unknown): string` với `if (typeof value === "string") return value;` **lên trên cùng**; rồi `try { if (value instanceof Error) return value.message; } catch { try { return Object.prototype.toString.call(value); } catch { return "[unrenderable error]"; } }`; rồi `try { return Object.prototype.toString.call(value); } catch { return "[unrenderable error]"; }`. Toàn bộ khối `instanceof` **nằm trong** `try` — vì `instanceof` dispatch tới `Symbol.hasInstance` và `getPrototypeOf` trap của proxy, nên chính phép kiểm cũng phải nằm trong guard. `Object.prototype.toString` không dispatch tới `toString` của người dùng. Đã kiểm bằng probe: `[object Null]`, `[object Undefined]`, `[object Symbol]`, `[object Error]`, `[object Object]`, `[object Number]`, và revoked Proxy → `[unrenderable error]`, tất cả **không ném**.
3. **Nối hàm vào các đường đã chọn.** Riêng `agent-session.ts` là 16 site — **đổi hết trong một file là hợp lý**, vì một file là một đường, không phải refactor 895 chỗ. Mốc đã kiểm (không suy đoán): `rg -c "instanceof Error \? .*\.message : String\(" packages/coding-agent/src/session/agent-session.ts` → `16`, nằm ở 2794, 2816, 2822, 2834, 2909, 2954, 4269, 7534, 7658, 7661, 8526, 8574, 8634, 9502, 10583, 10589.
4. **oxlint: đọc kỹ trước khi viết.** File cấu hình `.oxlintrc.json` (đã kiểm, tồn tại, 1.5 KB), oxlint bản **1.85.0** (đã chạy `bunx oxlint --version`). Đã thử nghiệm thật: `no-restricted-properties` **có** trong schema nhưng **không bắt được** idiom — chạy thật trên file mẫu: exit 0, không một lỗi nào, kể cả với `object: "Error", property: "message"`. `no-restricted-syntax` **không tồn tại** trong oxlint (`rg -c '"no-restricted-syntax"' node_modules/oxlint/configuration_schema.json` → 0) — chỉ có `no-restricted-exports`, `no-restricted-globals`, `no-restricted-imports`, `no-restricted-properties`. Lối duy nhất đã chạy thật và **bắt được** là `jsPlugins` (schema có khoá `jsPlugins` ở `node_modules/oxlint/configuration_schema.json:59`). Vậy rule phải là một file plugin cục bộ dạng `scripts/oxlint-plugins/no-raw-error-ternary.js`: `export default { meta: { name: "local" }, rules: { "no-raw-error-ternary": { meta: { name: "local/no-raw-error-ternary" }, create(context) { return { ConditionalExpression(node) { …báo khi test là `instanceof` với `right.name === "Error"`… } } } } } };` với message kiểu *"Use normalizeErrorMessage() — this idiom can throw inside a catch block."*. Đây là `scripts/` chứ không phải `packages/` — nó là cấu hình lint toàn cây, không thuộc package nào. Đã xác minh chạy thật, bắt đúng 1 lỗi ở đúng dòng.
5. **`overrides` để cây legacy không đỏ.** Rule bắt được idiom ở **mọi** file, kể cả 875 hit legacy. Với cây này, `overrides` phải **tắt** rule trên toàn bộ cây hiện tại, và chỉ bật lại ở nơi mới. Nếu 875 hit nằm rải trên nhiều file, việc liệt kê tay dễ sót và **sót là cây đỏ**. **Hãy sinh danh sách bằng lệnh**, đừng gõ tay:
   ```bash
   git grep -l "instanceof Error ? .*\.message : String(" -- packages/ | sed 's|^|      "|; s|$|",|'
   ```
   Chạy lại lệnh này sau khi di dời, nên danh sách phải ngắn lại — đó chính là bằng chứng cơ học cho điều kiện cổng (1).
6. **PR description phải có câu tiêu chí (điều kiện cổng 4).** PR phải nêu: (a) tiêu chí đã dùng để chọn các call site; (b) 875 hit còn lại là **nợ kỹ thuật có chủ**; (c) `packages/utils/src/logger.ts` **không** nằm trong phạm vi vì không chứa idiom, kèm lý do vì sao bẫy ở đó vẫn là bẫy; (d) **tên owner của nợ**. 895 − N phần còn lại là nợ có chủ, cần **một tên** và **một cách nhắc**. Một dòng ghi nợ không có tên không phải nợ.
7. **Xử lý 3 bản đã export + 2 bản private.** Mục này đã tự bác claim "chỉ có hai bản private". Có **năm** bản, đã kiểm từng dòng:

| file:line | tên | trạng thái |
| --- | --- | --- |
| `packages/coding-agent/src/ida/protocol.ts:31` | `errorMessage` | export, giống hệt idiom gốc |
| `packages/coding-agent/src/slash-commands/helpers/parse.ts:66` | `errorMessage` | export, giống hệt idiom gốc |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:48` | `errorMessage` | export, giống hệt idiom gốc |
| `packages/coding-agent/src/subprocess/worker-runtime.ts:44` | `errorText` | export, **khác** — `error.stack ?? error.message` |
| `packages/coding-agent/src/dap/client.ts:49` | `toErrorMessage` | private, giống hệt |
| `packages/coding-agent/src/dap/session.ts:118` | `toErrorMessage` | private, giống hệt |

Cả ba bản export đều có **nhiều call site thật** (ví dụ `ida/client.ts`, `ida/host.ts`, `ida/supervisor.ts` dùng `errorMessage` từ `protocol.ts`). Gộp chúng là **thay đổi hành vi ở các file khác**, không chỉ là gom trùng lặp. `errorText` **không** thể gộp mà không đổi hành vi (mất `stack`) — call site của nó là `worker-runtime.ts:327`, `:331`, cả hai đều regex `CUDA_DEVICE_UNAVAILABLE_RE` / `TRANSITIVE_CUDA_LIBRARY_RE` cần **stack**, không chỉ message. **Đừng tự gộp.**

**Hợp đồng test**

**File:** `packages/utils/test/normalize-error.test.ts` (mới). Mốc đã kiểm: `packages/utils/test/file-lock.test.ts` tồn tại — import style là `import { … } from "../src/file-lock";` (deep relative, **không** qua barrel). Bắt chước.

**Nếu hồi quy, người dùng thấy gì:** một lỗi không liên quan thay cho lỗi thật. Cụ thể đã đo: `F naive report THREW → getter exploded <-- original LOST`, và `F safe report → [object Error]`.

| # | case | khẳng định | hôm nay? |
| --- | --- | --- | --- |
| 1 | `Error` với **own-property** `message` getter ném | trả chuỗi, **không ném** | 🔴 **ĐỎ** — chính là hàng quyết định (`E raw THREW → getter exploded`) |
| 2 | **hàng âm**: object **không phải** `Error`, có `message` getter trả chuỗi | trả `"[object Object]"`, **không** trả chuỗi đó | 🟢 xanh — chống "chuyển idiom sang chỗ khác" |
| 3 | `null` | trả `"[object Null]"` | 🟢 |
| 4 | `undefined` | trả `"[object Undefined]"` | 🟢 |
| 5 | `Symbol("x")` | trả `"[object Symbol]"`, **không** ném | 🟢 (`String(Symbol())` ném — nhánh này thật sự phân biệt) |
| 6 | **revoked Proxy** | trả `"[unrenderable error]"`, **không** ném | 🔴 **ĐỎ** với bản trong kế hoạch (`D raw THREW → Proxy has already been revoked`) |
| 7 | `Proxy` bọc `Error`, `get` trap ném khi đọc `message` | trả chuỗi, **không** ném | 🔴 **ĐỎ** (`C raw THREW → trap exploded`) |

**Cách dựng fixture cho case 1 — đọc kỹ, đây là chỗ dễ sai nhất:**
```typescript
// SAI — KHÔNG làm case 1 đỏ. Đã chạy: ra "[object Object]", không ném.
const bad = { get message(): string { throw new Error("getter exploded"); } };

// ĐÚNG — own property trên một Error thật. Đã chạy: hôm nay NÉM.
const err = new Error("original");
Object.defineProperty(err, "message", {
	get() { throw new Error("getter exploded"); },
	configurable: true,
});
```
Vì sao: `instanceof Error` trên object thường là `false`, nên `String(bad)` được gọi — mà `String()` trên object thường **không** đụng getter `message`, nên không ném. Lớp con của `Error` cũng không cứu được: `new Error("x")` tạo `message` là **own data property**, nó che getter ở prototype. Đã chạy cả hai, đều ra `"orig"`, không ném.

**Phần di dời KHÔNG cần test mới:** các call site đó đã có test hoặc đã được hợp đồng của chúng bảo vệ. Thêm test mới ở đó là vi phạm AGENTS.md ("Đừng lặp lại coverage ở nhiều tầng").
**Tuyệt đối không source-grep:** `normalize-error.test.ts` **không** được đọc file nguồn rồi `expect(src).toContain(...)`. Hình dạng "FORBIDDEN in new code" trong kế hoạch chỉ để nhận diện, **không** chép vào test. Ràng buộc cấu trúc "không có idiom thô" do **oxlint rule** giữ — đó đúng là đường AGENTS.md mở sẵn.

**Cổng có đỏ được không**

**Tiền đề môi trường:**
```bash
brew install ninja                                    # BẮT BUỘC TRƯỚC
bun --cwd=packages/natives run build
```
Script `build` của `packages/natives` **đã kiểm tồn tại**: `bun ../../scripts/bazel-natives.ts host --dest native`.

**Lệnh:**
```bash
# 1. mốc — phải GIẢM so với 895
git grep -h "instanceof Error ? .*\.message : String(" -- packages/ | wc -l

# 2. hàm mới + 7 case
bun test packages/utils/test/normalize-error.test.ts

# 3. các đường đã di dời — KHÔNG hồi quy
bun test packages/agent/test/
bun test packages/coding-agent/test/debug/
bun test packages/tui/test/

# 4. types + lint
bun run check:ts
bun run lint
```

**Cổng này có ĐỎ ĐƯỢC không? CÓ — 3 trong 7 case đỏ ngay hôm nay.** Đã chạy, không suy đoán: case 1 🔴, case 6 🔴, case 7 🔴. **Nhưng** cổng chỉ đỏ được **nếu** case 1 dùng own-property getter. Nếu gõ theo mô tả nguyên văn của kế hoạch ("một object có getter `message`"), case 1 **xanh từ ngày đầu** và cổng tự biến thành cổng giả.

**Điều cổng này bắt được:** case 1, 6, 7 đỏ.
**Điều cổng này KHÔNG bắt được:** 875 chỗ còn lại. Và **không cổng nào bắt được** — đó chính là lý do phần còn lại phải là nợ kỹ thuật có chủ, không phải một cổng.

**Hai lệnh trong khối Xác minh của mục này ĐÃ ĐỎ SẴN trên cây sạch — phải ghi số baseline và so CHÊNH LỆCH, không so tuyệt đối:**

| Cổng | Baseline 2026-09-29 | Đỏ được? |
| --- | --- | --- |
| `bun test packages/utils/test/normalize-error.test.ts` | file chưa có → không chạy được | **CÓ** — hàng 1/2/6 đỏ với bất kỳ bản triển khai nào bỏ try quanh `instanceof`; hàng âm 3 đỏ với bản chỉ `try` quanh `value.message` |
| `bun test packages/agent/test/` | **617 pass / 13 fail** | **KHÔNG** — đã đỏ sẵn. 13 fail là `compact() Anthropic native lane` và `shouldUseAnthropicNativeCompaction`, không liên quan. Cổng này **luôn xanh-tệ** |
| `bun test packages/coding-agent/test/debug/` | **54 pass / 0 fail** | **CÓ** — đây là cổng thật cho hai bản `toErrorMessage` ở `dap/`. `dap-launch-failures.test.ts:7-8` import trực tiếp cả `dap/client` lẫn `dap/session` — nên nó **thật sự** chạm qua hai hàm đó |
| `bun test packages/tui/test/` | **2808 pass / 7 fail** | **KHÔNG** — đã đỏ sẵn (6 `glyph protocol probe` + 1 `resize on Warp`) |
| `bun run check:ts` | xanh | **CÓ** |
| `bun run lint` / `bun run lint:tools` | xanh | **CÓ** — nhưng chỉ sau khi `overrides` bắt đủ file legacy. Nếu overrides sót, cây đỏ và đó là phát hiện thật |
| Con số 895 **giảm** | 895 | **CÓ, nhưng yếu** — đỏ được ở mức `895 ≠ sau`. Đây là điều kiện *khác 0*, không phải *đủ* |
| `bun test packages/coding-agent/test/dap/` | thư mục không tồn tại | **ĐỎ VĨNH VIỄN, không mang thông tin** — thay bằng `packages/coding-agent/test/debug/` |

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: hình dạng code trong mục này tự ném trên chính case nó đòi test.** Kỹ sư cắng dán khối TypeScript ở mục "Hình dạng code" sẽ viết test đúng theo mục đó, rồi **test đỏ** ở hàng revoked Proxy, rồi tưởng mình sai test. Nguyên nhân đã nêu ở cảnh báo neo 1. Đây không phải chi tiết hình thức: nó nghĩa là hàm mang tên "không bao giờ ném" sẽ ném đúng trên một trong ba input mà mục này bắt buộc phải test.
2. **Case 1 xanh ngay từ đầu nếu dựng fixture sai.** Chi tiết ở mục *Hợp đồng test*. Đây là cổng giả — loại nguy hiểm nhất.
3. **oxlint KHÔNG biểu đạt được "chỉ cấm trong code MỚI".** oxlint áp rule lên **cả cây**. Bật một rule cấm idiom thô ⇒ **821 dòng trong `src/` đỏ ngay lập tức**. Xử lý bằng `// oxlint-disable-next-line` trên 821 dòng chính là "refactor 895 chỗ" mà mục này cấm — chỉ là mặc áo lint. Repo có tiền lệ (`oxlint-disable-next-line` xuất hiện 90 lần), nên đường đó **không bị cấm** và rất dễ đi vào. Ba lựa chọn thật, chọn một và **viết lý do vào PR**: (1) thu hẹp phạm vi rule qua `overrides` trong `.oxlintrc.json` — chỉ áp cho file mới; nhược là lint không phân biệt "file mới" với "file cũ", nên ranh giới là vô nghĩa ngay khi file cũ được sửa. (2) Không thêm rule, chỉ dựng hàm + test, và ghi cấm idiom vào `AGENTS.md` như quy ước review; nhược là không tự động hoá. (3) `jsPlugins` (oxlint 1.85.0 hỗ trợ, nhưng alpha) — viết rule tuỳ biến thật, cho phép whitelist theo file; nhược là alpha, và PR mang dependency mới. **Khuyến nghị: lựa chọn 1**, kèm một allowlist tường minh trong `.oxlintrc.json`.
4. **Bốn bản `errorMessage`/`errorText` KHÔNG cùng hành vi.** `errorText` (`worker-runtime.ts:44`) ưu tiên `error.stack`. Nếu bạn gộp nó vào `normalizeErrorMessage`, mọi log worker **mất stack** — và không test nào của `worker-runtime` chắc chắn bắt được, vì chúng chỉ assert message.
5. **56 hit trong `test/` không phải code.** 23 dòng trong đó là JSON fixture. Đừng migrate.
6. **Đừng đổi `const original` ở `agent-session.ts:10589` một cách mờ.** Đó là site giữ trọng tâm: nó đặt tên biến là `original` rồi ngay sau đó ném lỗi mới ghép `original` với `rollbackFailure`. Hàm mới làm cho tên `original` thành đúng nghĩa — nhưng chỉ khi bạn thay **cả hai** chỗ (10583 và 10589). **Sửa một trong hai là tạo ra thông điệp sai lệch.**
7. **`logger.ts` không chứa idiom, nhưng bảng của mục này ghi nó là cần sửa.** `git grep -c "instanceof Error ? .*\.message : String(" -- packages/utils/src/logger.ts` → **0 hit**. Nếu kỹ sư tin bảng và đi sửa, họ sẽ phải **tự bịa** một thay đổi: hoặc thêm import không dùng, hoặc refactor `jsonReplacer` — cả hai đều là thay đổi hành vi ngoài tiêu chí "thay idiom". **Bẫy ở logger là thật** nhưng theo cơ chế khác (`jsonReplacer` đọc `.message`/`.stack` không chắn, chạy trong `JSON.stringify` tại `:247`; đã chạy thật và thấy ném), nên phải nói rõ là **ngoài phạm vi**, không phải im lặng bỏ qua.
8. **`overrides` gõ tay sẽ sót, và sót là cây đỏ.** Rule bắt idiom ở mọi file. 875 hit legacy rải trên nhiều file. Liệt kê tay trong `.oxlintrc.json` thì một file sót là `bun run lint` đỏ. **Sinh danh sách bằng `git grep -l` (bước 5), và chạy lại sau khi di dời để nó ngắn lại** — đó là bằng chứng cơ học cho điều kiện cổng (1).
9. **Hàng âm dễ bị viết thành hàng bỏ qua.** Đã chạy: với `{ message: "leaked" }`, `String(err)` của idiom cũ trả `"[object Object]"` — **không** rò. Nhưng nếu kỹ sư viết hàm kiểu `if (value instanceof Error) return value.message;` rồi thêm một nhánh đọc `value.message` cho object thường, thì hàng này hấp thụ `"leaked"` và **tái tạo đúng đường rò của idiom cũ** — chỉ khác hình thức. **Đừng viết nó thành `expect(result).toBeTruthy()`; phải khẳng định KHÔNG chứa chuỗi gốc.**

**Cần người quyết — chưa có mặc định nào được chốt**

1. **Claim "chỉ có hai bản private" bị bác, và nó đổi phạm vi item.** Thật ra có **năm** bản `toErrorMessage`/`errorMessage` đã tồn tại — hai private, ba export — và bản thân việc hợp nhất chúng là một phần của item chứ không phải việc làm sau. Cần chốt: item này có gộp luôn ba bản đã export vào hàm mới, hay để lại và ghi nợ?
2. **`worker-runtime.ts` có hai tên cho một ý.** `errorText` (`:44`) và `errorMessage` (`:48`) cạnh nhau trong cùng một file là bằng chứng mạnh nhất cho "đây là idiom nhân bản", nhưng nó cũng là một phát hiện ngoài phạm vi. **Không tự ý gộp**; cần bạn quyết xem nó có thuộc item này không.
3. **GAP-D8 — tiêu chí chọn 895 call site.** Chưa có quyết định nào được đặt ra ở đâu cả. `ls .lavish-wip/DECISION-*.md` → không có file nào đề cập `GAP-D8` hay `895`.
4. **Owner của nợ còn lại**, và **hàm có nằm trong barrel `packages/utils` không**. Về mặt kỹ thuật câu hỏi barrel là **giả**: `packages/utils/package.json` có `"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }` ⇒ **deep import `@oh-my-pi/pi-utils/normalize-error` đã chạy được ngay**, không cần sửa `package.json`. Cái thật sự cần chốt là **quy ước**: 4 call site phân tán trong 3 package khác nhau không đáng để mở ra một đường import thứ hai cho package này. Khuyến nghị: đưa vào barrel, chèn `export * from "./normalize-error";` giữa dòng 20 và 21 theo thứ tự alphabet.

---

## GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C)

**Sóng:** M4 Wave C — Hợp đồng render (`shippable: false`, chờ cổng changelog dùng chung của M4, plan §6.2/§6.3). Cùng đợt M4-7.
**Effort:** S–M
**Phụ thuộc:** Chạm `extensibility/extensions/` và `extensibility/hooks/` — cùng vùng với **M2 WI-9** (sổ sở hữu per-extension). Không chặn, nhưng **phải ghi thứ tự merge với WI-9**.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | `ToolCallEventResult` mang thêm phân loại: `{ block: true; reason; kind: "denied" \| "hook-failed" }`. | có (file tồn tại; `ToolCallEventResult` khai cùng file với `tool_approval_requested` ở `:985`) |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | `onFailure` của `emitToolCall` gắn `kind: "hook-failed"` cho cả nhánh timeout và nhánh lỗi; đường hủy thì giữ nguyên nghĩa hiện có. Gọi `emitError` trên đường `tool_call` để khớp với `emit()`. | có — `async emitToolCall(...)` tại `:1615`; `block: true` tại `:1636`; chuỗi `` `Extension ${ext.path} failed: ${message}` `` tại `:1640`; chú thích "On-timeout policy: **fail-closed**" tại `:1610-1614`; `onFailure?.("timeout", …)` / `onFailure?.("error", …)` tại `:1476` và `:1488` |
| `packages/coding-agent/src/extensibility/extensions/wrapper.ts` | sửa | Truyền ký hiệu `kind` xuống lỗi tool thay vì ném `reason` trần. | có — `if (callResult?.block) {` tại `:262`, `throw new Error(reason)` tại `:264` |
| `packages/coding-agent/src/extensibility/hooks/runner.ts` | sửa | Thêm timeout cho `emitToolCall` theo cùng hạn mức `extensionHandlerTimeoutMs` đã dùng; bọc handler trong try/catch và gọi `emitError({ hookPath, event, error })` để khớp `emit()`. **KHÔNG** đổi quyết định fail-closed. | có — `async emitToolCall(event: ToolCallEvent)` tại `:327` với chú thích tự thừa nhận *"Errors are thrown (not swallowed) so caller can block on failure"* ở `:325-326`; `async emit(...)` tại `:271` là đường **đã làm đúng**, nó gọi `this.emitError` ở `:310` |
| `packages/coding-agent/src/extensibility/hooks/tool-wrapper.ts` | sửa | Truyền ký hiệu phân loại xuống lỗi tool. | có — khối `catch` chạy `:78-83`, `throw new Error(\`Hook failed, blocking execution: ${String(err)}\`)` tại `:82` |
| `packages/coding-agent/src/session/agent-session.ts` | **soát** | `emitToolCall` được gọi ở đây và đường nối này phải được soát, không chỉ hai wrapper. | có — `const callResult = await runner.emitToolCall(` tại `:4509`, đúng số dòng |
| renderer hiện tại | sửa | `ToolExecutionComponent` + `tool-execution.ts` hiển thị **hai nhãn khác nhau**. Đây là hợp đồng quan sát được, và là nơi G3/G4 của M4-7 đã dựng sẵn seam để test. | có — seam dựng sẵn đã ghi ở mục M4-7 (G3 là rebuild parity, G4 là hidden-key) |

### Các bước

1. **Ghi lại trước khi code: quyết định fail-closed KHÔNG đổi.** Fail-closed là đúng và phải giữ. Chỉ sửa **nhãn**. Hôm nay hook hỏng thì tool không chạy, và sau item này nó vẫn không chạy.

2. **Đọc cả ba đường trước khi sửa, vì chỉ một trong ba đã làm đúng:**
   1. `extensions/runner.ts:1615` `emitToolCall` chạy handler qua `#runHandlerWithTimeout`; khi handler lỗi/hết giờ thì `onFailure` trả `{ block: true, reason: "Extension <path> failed: <msg>" }`, và `extensions/wrapper.ts:262` đổi `callResult.block` thành `throw new Error(reason)`. **Model nhận đúng chuỗi đó như một tool error** — tức một crash của bên thứ ba được trình bày cho model như một quyết định từ chối mà không ai từ chối.
   2. `hooks/runner.ts:327` `emitToolCall` (đường `hooks.json`) tệ hơn: không try/catch, không timeout, và comment tự thừa nhận *"Errors are thrown (not swallowed) so caller can block on failure"*; `hooks/tool-wrapper.ts` ném tiếp `Hook failed, blocking execution`.
   3. Hàm `emit()` trong cùng file `hooks/runner.ts` — **đường chung — đã làm đúng**: bọc từng handler trong try/catch và gọi `this.emitError({ hookPath, event, error })`.

   Vậy omp **đã có** đúng hình dạng ở 1 trong 3 chỗ, và **không nơi nào** phân biệt "bị chặn" với "hỏng".

3. **Năm việc:**
   1. `ToolCallEventResult` mang thêm phân loại `{ block: true; reason; kind: "denied" | "hook-failed" }`; `wrapper.ts:262` và `hooks/tool-wrapper.ts` truyền ký hiệu này xuống lỗi tool.
   2. Renderer hiện tại (`ToolExecutionComponent` + `tool-execution.ts`) hiển thị **hai nhãn khác nhau**.
   3. Gọi `emitError` trên đường `tool_call` để khớp với `emit()` — sửa dấu vết quyền lợi.
   4. Thêm timeout cho `hooks/runner.ts:327` theo cùng hạn mức `extensionHandlerTimeoutMs` đã dùng.
   5. **Khẳng định âm bắt buộc:** một handler trả `{ block: true }` **thật** vẫn phải ra nhãn `denied`.

4. **Soát cả đường nối, không chỉ hai wrapper.** Rủi ro lớn nhất ở item này không phải code mà là **đường nối**: `agent-session.ts:4509` gọi `emitToolCall` không bọc try/catch, nên phải soát cả nó. Một sửa chỉ ở wrapper mà bỏ qua call site này thì hai wrapper đúng còn dấu vết quyền lợi thì sống.

5. **Chạy cổng** (khối Xác minh). Mọi test hiện có khẳng định "hook lỗi ⇒ tool bị chặn" phải **giữ xanh**, không được sửa cho xanh.

### Hình dạng code

```typescript
// packages/coding-agent/src/extensibility/extensions/types.ts
//
// The block DECISION is unchanged — a broken handler still fails closed. What
// changes is the LABEL the model and the user see, so "nobody denied this" is
// never rendered as "somebody denied this".

export interface ToolCallEventResult {
	input?: unknown;
	additionalContext?: string[];
	/** True when the tool must not run. Fail-closed, by design. */
	block?: boolean;
	reason?: string;
	/**
	 * Why the tool is blocked. `denied` = a handler returned block:true.
	 * `hook-failed` = a handler threw or timed out. Required whenever block is
	 * set, so a caller can never lose the distinction.
	 */
	kind?: "denied" | "hook-failed";
}
```

```typescript
// packages/coding-agent/src/extensibility/extensions/runner.ts, inside emitToolCall
// Existing fail-closed policy, relabelled — the `block: true` stays exactly as is.
block: true,
reason: timedOut
	? `Extension ${ext.path} timed out`
	: `Extension ${ext.path} failed: ${message}`,
kind: "hook-failed", // was implicit; every failure path below is hook-failed
```

Nhãn ở tầng renderer, hai nhánh phải **khác nhau** và đây là hợp đồng quan sát được:

```typescript
// A handler that returned block:true — someone said no.
"Blocked by " + sourceName;
// A handler that threw or timed out — nobody said no, the hook broke.
"Hook failed: " + sourceName + " did not complete";
```

### Hợp đồng test

Hai hợp đồng, và cái thứ hai mới là cái làm item này có nghĩa.

**(1) Fail-closed không đổi.** Mọi test hiện có khẳng định "hook lỗi ⇒ tool bị chặn" phải **giữ xanh**, không được sửa cho xanh. Đây là điều khoản bảo toàn: hôm nay hook hỏng thì tool không chạy, và sau item này nó vẫn không chạy. Chỉ *từ khóa* trong thông báo đổi.

**(2) Khẳng định âm bắt buộc — một handler trả `{ block: true }` thật vẫn phải ra nhãn `denied`.** Không có nó thì "sửa" này chỉ là đổi chữ toàn bộ: mọi thứ trở thành `hook-failed`, hợp đồng vẫn "xanh", và người dùng mất đúng thông tin họ cần — ai đã chặn tôi.

Hợp đồng quan sát được, nêu tên lỗi người dùng thấy: hôm nay một extension bên thứ ba ném exception trong handler `tool_call` làm model thấy một tool error trông như lệnh cấm của người dùng. Sau item này, model và transcript phải phân biệt được: *"ai đã chặn"* và *"hook hỏng, không ai chặn"*. Đây là cùng loại vi phạm mà M4 đặt tên — hệ thống trông như đã quyết, và không có gì quyết.

Ranh giới nơi test đứng: khẳng định ở seam mà M4-7 đã dựng sẵn (G3 rebuild parity, G4 hidden-key), **không** khẳng định ở một render path lẻ. Đây là cùng cảnh báo mà AGENTS.md nói về previews nhiều đường: sửa một đường không sửa đường còn lại.

### Xác minh

```bash
# 0. TIỀN ĐỀ MÔI TRƯỜNG (đặt trước mọi lệnh `bun test`): addon chưa có thì mọi test
#    đỏ vì "Failed to load pi_natives native addon for darwin-arm64" — đỏ vì môi
#    trường, KHÔNG phải đỏ vì công việc.
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 1. Fail-closed phải giữ xanh — đây là điều khoản bảo toàn, không phải cổng mới
bun test packages/coding-agent/test/extensions-runner.test.ts packages/coding-agent/test/hooks-runner.test.ts

# 2. Seam M4-7 đã dựng sẵn — khẳng định nhãn phải đi qua đây, không qua render path lẻ
bun test packages/tui/test/tool-execution-xdev-render.test.ts packages/tui/test/json-tree-render.test.ts

# 3. Cả hai đường wrapper
bun test packages/coding-agent/test/extension-tool-wrapper.test.ts packages/coding-agent/test/hooks-tool-wrapper.test.ts

# 4. Không hồi quy toàn package
bun test packages/coding-agent/test/ packages/tui/test/

# 5. Types + lint + format
bun run check:ts
bun run lint
```

Tuyệt đối không dùng `tsc`/`npx tsc` — dự án cấm, dùng `bun run check:ts`.

### Cổng hoàn thành

Mục này XONG khi tất cả đồng thời đúng:

0. **Tiền đề môi trường:** addon đã build, nếu không thì (1)-(3) ghi là "chưa chạy".
1. Mọi test hiện có khẳng định "hook lỗi ⇒ tool bị chặn" vẫn **xanh**, không sửa đổi một khẳng định nào để làm xanh.
2. Hàng âm bắt buộc: một handler trả `{ block: true }` thật ra nhãn `denied`, **và** đã từng thấy đỏ khi `kind` bị gán sai ở cả hai chỗ.
3. Cả **ba** đường — `extensions/runner.ts`, `hooks/runner.ts`, và `hooks/runner.ts` `emit()` — đều đi qua cùng một cơ chế `emitError` khi báo lỗi. Đường thứ ba đã đúng sẵn; nó ở trong cổng để một refactor sau không lặng lẽ phá nó.
4. `hooks/runner.ts` `emitToolCall` **có** timeout, và hạn mức đọc từ đúng hằng mà `extensions/runner.ts` đang dùng — không phải một con số viết tay.
5. `bun run check:ts` sạch; không hồi quy trong `packages/coding-agent/test/` và `packages/tui/test/`.

**Cổng này có thực sự đỏ được không: có**, và cổng quyết định là hàng âm (2) — bỏ `kind` ở `runner.ts:1640` thì nhãn `denied` biến mất và hàng đỏ. Cổng này **không** bắt được việc `agent-session.ts:4509` có được soát hay không, vì call site đó không đổi chữ ký; đó là một kiểm tra của con người, ghi rõ như vậy.

### Phụ thuộc

- **depends_on:** không có phụ thuộc cứng. Nhưng **phải ghi thứ tự merge với M2 WI-9** vào mô tả PR: WI-9 sửa đúng đường đăng ký handler mà item này sửa đường gọi. Không chặn nhau, nhưng hai bản vá độc lập trên hai mặt của cùng một seam thì hợp nhất không theo thứ tự là âm thầm hủy lẫn nhau.
- **blocks:** không có. `blocks` rỗng.

### Cách sai dễ nhất

Đổi **quyết định** thay vì đổi **nhãn**. Rất dễ: bỏ `block: true` ở nhánh lỗi để "hook hỏng thì cứ cho chạy" nghe có vẻ hợp lý hơn cho người dùng. Đó là đảo ngược điều khoản bảo toàn, và nó biến một hỏng hóc thành một việc thực thi không kiểm soát. Fail-closed là chủ ý; item này chỉ sửa chỗ người đọc **tưởng** ai đã quyết.

Lối sai thứ hai, cùng loại với lối sai của M4-7: sửa `tool-execution.ts` và bỏ `event-controller.ts` / `ui-helpers.ts`. Hai nhãn sẽ đúng lúc stream và sai khi dựng lại transcript — đúng kiểu hỏng mà cả `bun check` lẫn test xdev có sẵn đều không nhìn thấy.

Lối sai thứ ba, nhỏ hơn: gán `kind: "hook-failed"` cho **cả** mọi `block: true`, kể cả khi handler trả về thật. Đó chính là trường hợp mà hàng âm (2) bắt.

### Cần người quyết

- **Thứ tự merge với M2 WI-9.** WI-9 sửa đường đăng ký handler, item này sửa đường gọi. Hai mặt của cùng một seam. Cần một thứ tự tường minh hoặc một PR chung; chọn sai thì hai bản vá âm thầm hủy lẫn nhau. **Chưa có mặc định — cần bạn quyết.**
- **Hai nhãn ở tầng renderer viết thế nào?** Nhãn là **hợp đồng quan sát được** — nó hiện ra trên màn hình và đi vào transcript — nên chữ phải chốt trước, không phải sau. Sổ khoảng trống đưa hai hướng tinh thần ("ai đã chặn" và "hook hỏng, không ai chặn") nhưng không đưa chữ.
- **`hooks/runner.ts` `emitToolCall` có thêm timeout là đúng, nhưng hạn mức nào?** Nó phải dùng **đúng** hằng mà `extensions/runner.ts` đang dùng, không phải một giá trị mới. Nếu hai đường phải khác nhau vì lý do sản phẩm, cần nói rõ lý do — chứ không âm thầm tạo hai hằng.
- **Có nên gọi `emitError` ở đường `tool_call` của extensions không, hay chỉ ở `hooks`?** Sổ khoảng trống nói "sửa dấu vết quyền lợi" mà không nói phạm vi. Chọn rộng hơn là một thay đổi hành vi quan sát được (thêm một dòng lỗi vào đầu ra).

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `hooks/tool-wrapper.ts:77-80` ném tiếp `Hook failed, blocking execution` | **LỆCH** — khối bắt đầu muộn hơn một dòng | `catch (err)` mở ở **`:78`**; `:79` là dòng chú thích `// Hook error or block - throw to mark as error`; `:80-81` là `if (err instanceof Error) { throw err; }`; `throw new Error(\`Hook failed, blocking execution: ${String(err)}\`)` nằm ở **`:82`**, và khối đóng ở `:83`. Dải đúng là `:78-83`. Không sai kết luận — chỉ sai vị trí, và đây là loại lỗi đã xuất hiện sáu lần trong bộ đính chính của file này. Bằng chứng: `sed -n '70,85p' packages/coding-agent/src/extensibility/hooks/tool-wrapper.ts`. |
| "Ba đường, ba hành vi, chỉ một đúng" | **XÁC NHẬN CHÍNH XÁC** | Cả ba neo đều đúng nguyên văn: `extensions/runner.ts:1615` là `async emitToolCall(event: ToolCallEvent, signal?: AbortSignal)`, chú thích fail-closed ở `:1610-1614`, `block: true` ở `:1636` và chuỗi `` `Extension ${ext.path} failed: ${message}` `` ở `:1640`; `hooks/runner.ts:327` là `async emitToolCall(event: ToolCallEvent)` với chú thích *"Errors are thrown (not swallowed) so caller can block on failure"* ngay phía trên. Và đường thứ ba **đã làm đúng**: `emit()` ở `:271` bọc handler trong try/catch và gọi `this.emitError` ở `:310` (hai chỗ gọi còn lại ở `:378` và `:416` thuộc `emitContext` và `emitBeforeAgentStart`, **không** thuộc `emitToolCall`) — tức bằng chứng rằng `emitToolCall` của hooks **không** gọi `emitError`, đúng như sổ nói. Bằng chứng: `grep -n 'async emit\|emitError' packages/coding-agent/src/extensibility/hooks/runner.ts`. |
| `agent-session.ts:4509` gọi `emitToolCall` không bọc try/catch | **XÁC NHẬN CHÍNH XÁC** | Dòng 4509 là `const callResult = await runner.emitToolCall(`. Đường dẫn đầy đủ là `packages/coding-agent/src/session/agent-session.ts` — sổ chỉ ghi tên file không kèm thư mục, và repo có nhiều file cùng tên đệm, nên phải ghi đủ. Bằng chứng: `find packages -name agent-session.ts` → đúng một kết quả, `packages/coding-agent/src/session/agent-session.ts`. |

## Cần người xác nhận

1. **Fail-closed là quyết định đã chốt, và nó nằm ngoài phạm vi sửa.** Sổ khoảng trống nói thẳng "fail-closed phải giữ nguyên ở cả ba đường". Đây là điều khoản bảo toàn, không phải đề xuất — nên nếu bạn muốn mở lại nó, đó là một quyết định riêng và nó phải đổi cả cổng (1), không chỉ dòng chữ trong renderer.
2. **`hooks/runner.ts` `emitToolCall` không có timeout, trong khi `extensions/runner.ts` có.** Đây là khác biệt thật giữa hai hệ hook, và nó có nghĩa là một hook `hooks.json` treo sẽ treo cả phiên. Thêm timeout là **cải thiện**, không phải bảo toàn — tức nó **đổi hành vi người dùng quan sát được** (một hook treo trước đây treo mãi, giờ tool bị chặn sau hạn mức). Cần xác nhận đây là chủ ý, vì nó đáng lẽ phải có một dòng CHANGELOG.



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo neo.** Lệch định danh, đọc trước khi gõ: harness giao nhiệm vụ là `M4-13`, nhưng tiêu đề khớp với `## GAP-M4-12. Một hook nổi không được rửa thành quyết định chặn (sóng C)` tại `MILESTONE_4_EXECUTION_PLAN.md:1975`. `GAP-M4-13` (`:2149`) là mục khác hẳn — "Cặp audit bền vững cho mỗi lần hỏi quyền". Phiếu này viết cho **GAP-M4-12**.

Đo 19 neo dạng `path:line`: **13 đúng nguyên văn · 4 lệch · 2 sai nội dung**. Cụ thể:

1. **`extensions/types.ts:985` — SAI.** `sed -n '985p'` → `export interface ToolApprovalRequestedEvent {`. Đó là **event**, không phải result. `grep -n ToolCallEventResult types.ts` trả **3** hit: `:129` (import), `:1189` (`export type { ToolCallEventResult } from "../shared-events";`), `:1361` (dùng trong `on(event: "tool_call", …)`). **Không có khai báo interface nào trong file này.** Vị trí đúng: **`packages/coding-agent/src/extensibility/shared-events.ts:314`** (`export interface ToolCallEventResult {`), file 487 dòng. Cả hai wrapper import qua `./types` (`extensions/wrapper.ts:27`, `hooks/tool-wrapper.ts:14`), mà `hooks/types.ts:423` cũng chỉ re-export từ `../shared-events` — nên `shared-events.ts` là **nơi duy nhất** thêm được `kind`.
2. **`extensions/wrapper.ts:262` — LỆCH +1.** Thật là **`:263`** (`:262` = `)) as ToolCallEventResult | undefined;`).
3. **`extensions/wrapper.ts:264` — LỆCH +1.** Thật là **`:265`** (`:264` = `const reason = callResult.reason || "Tool execution was blocked by an extension";`).
4. **`hooks/tool-wrapper.ts:78-83` (bảng file) và `:77-80` (bảng đính chính) — LỆCH +1 Ở CẢ HAI BẢNG.** Thật: `} catch (err) {` ở **`:79`**, `// Hook error or block - throw to mark as error` ở `:80`, `if (err instanceof Error) {` ở `:81`, `throw err;` ở `:82`, `throw new Error(…)` với thông điệp ```Hook failed, blocking execution: ${String(err)}``` ở **`:84`**, `}` đóng ở `:85`. Dải đúng là **`:79-85`**. Bảng "Đính chính" của chính work item (`:78` / `:79` / `:80-81` / `:82` / `:83`) **SAI +1 TRÊN MỌI DÒNG** — nó sinh ra để sửa lỗi lệch một dòng lại lệch đúng một dòng, và đó là bằng chứng "sáu lần trong bộ đính chính của file này" là loại lỗi **đang tái diễn**, không phải sự cố lẻ.
5. **Hàng "renderer hiện tại" — SAI, và nó làm thay đổi lớn nhất của mục này.** Work item nói `ToolExecutionComponent` + `tool-execution.ts` hiển thị **hai nhãn khác nhau**. `grep -rn "Blocked by" packages/tui/src packages/coding-agent/src` → **0 hit** (hai hit `"Blocked by bash pattern:"` nằm ở `tools/bash.ts:511,528`, không liên quan). `ToolExecutionComponent` khai ở `packages/tui/src/chat/tool-execution.ts:243`, file 1407 dòng, chỉ có **một** cờ `isError` và **không** có trường nào mang kind/sourceName. **Renderer hôm nay có MỘT nhãn, không phải hai; hợp đồng "hai nhãn" là MỚI HOÀN TOÀN.** Cột "đã kiểm chứng?" của hàng này cũng **không có neo** — nó chỉ trỏ sang "seam M4-7 đã dựng sẵn", mà seam M4-7 là plumbing field `argsComplete`/`executionStarted`/`rawArgs`, **không phải** seam nhãn.

**Các neo ĐÚNG (dùng nguyên trạng):** `extensions/runner.ts:1615` `async emitToolCall(event: ToolCallEvent, signal?: AbortSignal): Promise<ToolCallEventResult | undefined> {`; `:1610-1614` chú thích "On-timeout policy: **fail-closed**" (`:1610` là `* On-timeout policy: **fail-closed** (return ` `{ block: true }` `). This is`, `:1614` là `*/`); `:1636` `block: true,`; `:1640` `reason:` với `` `Extension ${ext.path} failed: ${message}` ``; `:1476` `return onFailure?.("timeout", error);`; `:1488` `return onFailure?.("error", message);`; `hooks/runner.ts:327` `async emitToolCall(event: ToolCallEvent): Promise<ToolCallEventResult | undefined> {`; `:322-326` khối doc (`:325` là "Errors are thrown (not swallowed) so caller can block on failure."); `:271` `async emit(`; `:310` `this.emitError({`; `:378` và `:416` là hai call site `emitError` còn lại; `emitToolCall` (`:327-351`) **không** gọi `emitError` lần nào; `agent-session.ts:4509` `const callResult = await runner.emitToolCall(` và hàm bao là `#beforeToolCall` (`:4491`), **không có** `try` nào quanh chỗ gọi.

**Chỗ work item BỎ SÓT — tìm được khi đọc code, không phải neo hỏng:**

| chỗ | nội dung thật | vì sao quan trọng |
| --- | --- | --- |
| `extensions/runner.ts:1656` | `return { block: true, reason: ` `Tool execution was cancelled while an extension handler was pending` ` };` | Đây là **producer thứ hai** của `block: true`. Work item chỉ nói "đường hủy thì giữ nguyên nghĩa hiện có", nhưng schema mới bắt buộc `kind` mọi khi `block` có mặt → union `"denied" \| "hook-failed"` **không đủ**, hoặc nhánh hủy phải mang một giá trị thứ ba. Xem test `extensions-runner.test.ts:1938` ("cancels a pending confirmation and blocks tool execution when the outer dispatch aborts (#4223)"). |
| `hooks/tool-wrapper.ts:66-68` | `if (callResult?.block) { const reason = callResult.reason \|\| "Tool execution was blocked by a hook"; throw new Error(reason); }` | Đây là **đường `denied` của hooks**, và work item **không nhắc tới**. Bảng file chỉ liệt kê khối `catch`. Sửa `catch` mà bỏ `:66-68` thì hooks vẫn ném `reason` trần. |
| `agent-session.ts:4518-4520` | `if (callResult?.block) { return { block: true, reason: callResult.reason \|\| "Tool execution was blocked by an extension" }; }` | Call site **dựng lại** object `{ block, reason }` → `kind` bị **rơi im lặng**. Work item gọi đây là "một kiểm tra của con người" vì "call site không đổi chữ ký" — nhưng nó **có** dựng lại, và đó là chỗ rơi cụ thể, không phải kiểm tra mơ hồ. |
| `packages/agent/src/types.ts:859-864` | `export interface BeforeToolCallResult { block?; reason?; args?; additionalContext?; }` | Kiểu thứ **ba**, song song với `ToolCallEventResult`, là kiểu trả về của `#beforeToolCall`. Work item không nhắc. Muốn mang `kind` tới renderer thì nó cũng phải có `kind`. `packages/agent/test/agent-loop.test.ts:4850,7056` và `run-summary.test.ts:278` là nơi kiểu này được dùng. |
| `extensions/runner.ts:259-334` | `raceHandlerWithTimeout` — 76 dòng, **không export**, dựa vào hai symbol module-private ở `:140-141` (`EXTENSION_HANDLER_TIMEOUT`, `EXTENSION_HANDLER_ABORTED`) | Cơ chế pause/resume budget (`pauseDepth`/`remainingMs`/`activeSince`) chính là thứ **trừ thời gian chờ dialog OMP** ra khỏi hạn mức. Bước "thêm timeout cho `hooks/runner.ts`" là một refactor 76 dòng có quyết định kiến trúc, không phải thêm một `if`. |
| `extensions/runner.ts:1471-1475` và `:1482-1487` | `this.emitError({...})` **đã được gọi** ở cả nhánh timeout lẫn nhánh lỗi, bên trong `#runHandlerWithTimeout` | **Cổng "đã xong" sẽ xanh với KHÔNG một dòng sửa nào.** Chỉ `hooks/runner.ts:336-338` thật sự thiếu. |

**Ba file test trong khối Xác minh không tồn tại:** `packages/coding-agent/test/extensions-runner.test.ts` **CÓ** (131 KB). `packages/coding-agent/test/hooks-runner.test.ts` **KHÔNG CÓ** (`find . -name 'hooks-runner.test.ts'` trả rỗng). `packages/coding-agent/test/extension-tool-wrapper.test.ts` **KHÔNG CÓ**. `packages/coding-agent/test/hooks-tool-wrapper.test.ts` **KHÔNG CÓ**. `packages/tui/test/tool-execution-xdev-render.test.ts` **CÓ**. `packages/tui/test/json-tree-render.test.ts` **CÓ**. File hook-wrapper gần nhất thực sự tồn tại: `packages/coding-agent/test/hook-tool-wrapper-input.test.ts` (số ít, không phải số nhiều).

**Tiền đề môi trường ĐÃ THOẢ:** `packages/natives/native/pi_natives.darwin-arm64.node` **đã tồn tại**. Bước 0 của khối Xác minh (cài `ninja` + `bun --cwd=packages/natives run build`) là dư. Nếu vẫn thấy *"Failed to load pi_natives native addon"*, đó là môi trường của máy khác, không phải việc này.

**Bảng điểm sửa**

| đường/dẫn | symbol | TRƯỚC (trích nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `extensibility/shared-events.ts:314` | `interface ToolCallEventResult` | `	/** If true, block the tool from executing */`<br>`	block?: boolean;`<br>`	/** Reason for blocking (returned to LLM as error) */`<br>`	reason?: string;` | thêm `kind?: "denied" \| "hook-failed" \| "cancelled";` ngay dưới `reason`, có doc comment nói rõ **bắt buộc** khi `block` có mặt và ai sinh ra từng giá trị. **(Không phải `extensions/types.ts` — xem cảnh báo neo 1.)** |
| `extensibility/extensions/runner.ts:1635-1641` | callback `onFailure` trong `emitToolCall` | `					(kind, message) => ({`<br>`						block: true,`<br>`						reason:`<br>`							kind === "timeout"`<br>`								? ` `Extension ${ext.path} timed out after ${timeoutMs}ms` `<br>`								: ` `Extension ${ext.path} failed: ${message}`,`<br>`					}),` | `kind: "hook-failed",` thêm vào literal. `block: true` **giữ nguyên**. Đổi tên tham số `kind` → `failure` để không đụng tên trường mới. |
| `extensibility/extensions/runner.ts:1655-1657` | nhánh abort | `		if (signal?.aborted) {`<br>`			return { block: true, reason: ` `Tool execution was cancelled while an extension handler was pending` ` };`<br>`		}` | `kind: "cancelled",` thêm vào literal (hoặc gộp vào `hook-failed` — xem *Cần người quyết*). |
| `extensibility/extensions/runner.ts:1644-1646` | `if (handlerResult.block) { return handlerResult; }` | `				if (handlerResult.block) {`<br>`					return handlerResult;`<br>`				}` | chuẩn hoá trước khi trả: `return handlerResult.kind ? handlerResult : { ...handlerResult, kind: "denied" };` — đây là chỗ **duy nhất** sinh nhãn `denied`, và là nơi hàng âm ở *Hợp đồng test* bắt đỏ. |
| `extensibility/hooks/runner.ts:336-338` | vòng lặp handler trong `emitToolCall` | `			for (const handler of handlers) {`<br>`				// No timeout - let user take their time`<br>`				const handlerResult = (await handler(event, ctx)) as ToolCallEventResult \| undefined;` | bọc trong timeout dùng chung (bước 5) + `try/catch`; nhánh lỗi trả `{ block: true, kind: "hook-failed", reason: ` `Hook ${hook.path} failed: ${message}` ` }` **và** gọi `this.emitError({ hookPath, event, error })`; nhánh `block` thì chuẩn hoá `kind: "denied"`. Xoá hai dòng chú thích `:324` và `:337` — chúng nói điều sai sau thay đổi. |
| `extensibility/extensions/wrapper.ts:263-265` | `if (callResult?.block)` | `				if (callResult?.block) {`<br>`					const reason = callResult.reason \|\| "Tool execution was blocked by an extension";`<br>`					throw new Error(reason);`<br>`				}` | mang `callResult.kind` vào lỗi theo một kênh có cấu trúc (xem *Cạm bẫy 2*): `throw blockedToolError(callResult.kind, reason, "an extension")` — hoặc tối thiểu đổi `reason` sang dạng có nhãn khi `kind === "hook-failed"`. Không đổi `block`. |
| `extensibility/hooks/tool-wrapper.ts:66-68` | `if (callResult?.block)` | `				if (callResult?.block) {`<br>`					const reason = callResult.reason \|\| "Tool execution was blocked by a hook";`<br>`					throw new Error(reason);`<br>`				}` | y hệt dòng trên, với nhãn "a hook". **Hàng này không có trong bảng file của work item** — thêm vào. |
| `extensibility/hooks/tool-wrapper.ts:79-85` | khối `catch` | `} catch (err) {` … `throw new Error(…)` với thông điệp ```Hook failed, blocking execution: ${String(err)}``` … `}` | bọc lỗi non-`Error` thành thông điệp này; sau bước 3 nhánh này **chỉ còn** bắt lỗi không phải `Error`, phải giữ nguyên hành vi. |
| `session/agent-session.ts:4518-4520` | `#beforeToolCall`, nhánh block | `		if (callResult?.block) {`<br>`			return { block: true, reason: callResult.reason \|\| "Tool execution was blocked by an extension" };`<br>`		}` | `return { block: true, kind: callResult.kind, reason: … };` — nếu `BeforeToolCallResult` được mở rộng. |
| `agent/src/types.ts:859-864` | `interface BeforeToolCallResult` | `export interface BeforeToolCallResult {`<br>`	block?: boolean;`<br>`	reason?: string;`<br>`	args?: Record<string, unknown>;`<br>`	additionalContext?: string;`<br>`}` | thêm `kind?: "denied" \| "hook-failed" \| "cancelled";`. Kiểu thứ ba, work item không nhắc. |
| `tui/src/chat/tool-execution.ts:243` (`class ToolExecutionComponent`) | kết quả tool | không có trường nào phân biệt nguồn chặn | thêm một trường trên kết quả đã chuẩn hoá (vd `blockKind`) và rẽ **hai nhánh render khác nhau**: `denied` → nhãn "ai đã chặn"; `hook-failed` → nhãn "hook hỏng, không ai chặn". Chi tiết cơ chế ở *Cạm bẫy 2*. |
| `coding-agent/src/modes/utils/ui-helpers.ts:605` | `decodeStreamedToolArgs(partialJson, {…})` | rebuild transcript, `:611` gọi constructor component | phải truyền `blockKind` qua **cả** đường này và đường stream (`modes/controllers/event-controller.ts`). Bỏ một trong hai thì nhãn đúng lúc stream, sai khi dựng lại transcript. |

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc)

0. **Ghi lại trước khi code: quyết định fail-closed KHÔNG đổi.** Bằng chứng cụ thể: `extensions/runner.ts:1610-1613` (`On-timeout policy: **fail-closed** (return { block: true })`) và `:1636` (`block: true,`). Cả hai giữ **nguyên văn**. Điều khoản bảo toàn: hôm nay hook hỏng thì tool không chạy, sau mục này nó vẫn không chạy.
1. **Sửa type ở đúng file.** Thêm `kind` vào `shared-events.ts:314` (`interface ToolCallEventResult`, ngay sau `reason?: string;` ở `:317`). *Không* sửa `extensions/types.ts` — `:1189` chỉ là `export type { ToolCallEventResult } from "../shared-events";`, sửa ở đó là sửa bản sao không ai đọc.
2. **Gắn nhãn ở ba producer của `extensions/runner.ts`.** `:1635-1641` → `kind: "hook-failed"`. `:1655-1657` (abort) → `kind: "cancelled"`. `:1644-1646` (`if (handlerResult.block) return handlerResult;`) → chuẩn hoá `kind: "denied"` khi handler không tự mang.
3. **Vá `hooks/runner.ts:327` cho đúng hình dạng của `extensions/runner.ts:1615`.** ở `:336-338`, hiện là `const handlerResult = (await handler(event, ctx)) as ToolCallEventResult | undefined;` — không try/catch, không timeout. Thêm: timeout dùng chung (bước 4), `try/catch` quanh handler, nhánh lỗi trả `{ block: true, kind: "hook-failed", reason }` **và** gọi `this.emitError({ hookPath: hook.path, event: "tool_call", error: message })` theo đúng khuôn của `:309-315`. Xoá chú thích sai ở `:324` và `:337`.
4. **Cấp kênh có cấu trúc tới renderer, qua CẢ BA consumer của `callResult.block`.** Đây là bước work item coi là dễ nhất và thực ra là bước khó nhất. `extensions/wrapper.ts:263-265` → throw. `hooks/tool-wrapper.ts:66-68` → throw *(không có trong bảng file của work item)*. `hooks/tool-wrapper.ts:79-85` → bọc lỗi non-`Error`; sau bước 3 nhánh này **chỉ còn** bắt lỗi không phải `Error`, phải giữ nguyên hành vi. `agent-session.ts:4518-4520` → dựng lại `{ block, reason }`, **rơi `kind`**; sửa hoặc kind chết ngay đó. Kiểu trung gian: `BeforeToolCallResult` (`agent/src/types.ts:859-864`).
5. **Thêm timeout cho `hooks/runner.ts` bằng cơ chế ĐANG ĐÚNG, không phải bằng `Bun.sleep`.** `raceHandlerWithTimeout` (`extensions/runner.ts:259-334`) dài 76 dòng, không export, dựa hai symbol module-private ở `:140-141`. Nó có `pauseDepth`/`remainingMs`/`activeSince` để **trừ thời gian chờ dialog OMP** ra khỏi hạn mức — đúng như mô tả setting tại `extensibility/settings.ts:160`: *"time awaiting OMP-owned dialogs does not count"*. Thêm một `Promise.race` thuần sẽ giết dialog của người dùng sau 30 giây, phá hành vi đang có. **Quyết định bắt buộc: tách `raceHandlerWithTimeout` + hai symbol ra module chung** (khuyến nghị), hoặc chấp nhận nhân bản. **Không được viết `Bun.sleep(30_000)`.**
6. **Hằng thời hạn: đọc từ đúng chỗ.** `extensionHandlerTimeoutMs` (`extensions/runner.ts:104`) là `let` **module-private, không export**; chỉ `testSetExtensionHandlerTimeoutMs` (`:110`) gán được. Thứ export là `EXTENSION_HANDLER_TIMEOUT_MS` (`:103` = `30_000`) và `cfgExtensionHandlersToolCallTimeoutMs` (`settings.ts:151-162`, `default: 30_000`). Dùng `EXTENSION_HANDLER_TIMEOUT_MS`; **không** tạo hằng thứ ba. Nếu hooks cần override theo settings thì phải nói rõ — hiện hooks không có bất kỳ setting timeout nào.
7. **Renderer: hai nhánh, và cả hai đường dựng transcript.** `ToolExecutionComponent` (`tui/src/chat/tool-execution.ts:243`) nay có **một** cờ `isError`; `grep "Blocked by" packages/tui/src` = **0 hit**. Hai nhánh là **việc mới, không phải chỉnh sửa**. Phải sửa **cả** `tool-execution.ts` (đường stream) **và** `coding-agent/src/modes/utils/ui-helpers.ts:605` + `modes/controllers/event-controller.ts` (đường rebuild).
8. **Khẳng định âm bắt buộc.** Một handler trả `{ block: true, reason: "…" }` thật vẫn ra nhãn `denied`. Xem *Hợp đồng test*.
9. **Chạy cổng.** Khối Xác minh của work item **không chạy được nguyên trạng** vì 3 trong 5 file test không tồn tại — xem *Cổng*.

**Hợp đồng test**

**(1) Fail-closed không đổi — nhưng điều khoản "không được sửa test cho xanh" KHÔNG THI HÀNH ĐƯỢC, phải viết lại.** Work item nói: *"Mọi test hiện có khẳng định 'hook lỗi ⇒ tool bị chặn' phải giữ xanh, không được sửa cho xanh."* Cụ thể là không dùng `toEqual`, chỉ kiểm tool **không** chạy. Nhưng ba test đang dùng `toEqual` — khớp từng trường — nên **bắt buộc đỏ** khi `kind` được thêm:

| test | dòng | khẳng định |
| --- | --- | --- |
| `extensions-runner.test.ts` (timeout mặc định) | `:1633-1636` | `expect(await decision).toEqual({ block: true, reason: ` `Extension ${extensionPath} timed out after ${EXTENSION_HANDLER_TIMEOUT_MS}ms` ` });` |
| `extensions-runner.test.ts` (timeout 10ms) | `:1929-1932` | `expect(await decision).toEqual({ block: true, reason: ` `Extension ${extensionPath} timed out after 10ms` ` });` |
| `extensions-runner.test.ts` ("discards collected additional context when a later handler blocks") | `:3121-3128` | `).resolves.toEqual({ block: true, reason: "blocked" });` |

Hai test đầu đỏ khi thêm `kind: "hook-failed"`. Test thứ ba đỏ khi `runner.ts:1644-1646` chuẩn hoá `kind: "denied"`. **Không thể vừa thêm `kind` vừa giữ nguyên ba khẳng định này. Đây là mâu thuẫn logic trong work item, không phải khó kỹ thuật.**

Cách viết lại đúng — **giữ đúng khẳng định điều khoản bảo toàn, đổi cách khẳng định** (đây là sửa test *để phản ánh hợp đồng mới*, không phải nới khẳng định): (1) vẫn khẳng định "tool KHÔNG chạy" — giữ nguyên; (2) khẳng định block vẫn là true và reason vẫn chứa mã đường hỗng (`expect(decision?.reason).toContain("failed")` / `toContain("timed out after")`); (3) khẳng định phân loại `expect(decision?.kind).toBe("hook-failed")`. Nhưng vẫn dùng `toEqual` với shape **ĐẦY ĐỦ** khi đã quyết định union: `expect(await decision).toEqual({ block: true, kind: "hook-failed", reason: … });`

`expect(executeCalls).toEqual([])` ở `:1697` và `expect(executed).toBe(false)` ở `:2000` là **điều khoản bảo toàn thật** — **giữ nguyên tuyệt đối**. `rejects.toThrow()` ở `:1997` không khẳng định chuỗi nên an toàn.

**(2) Khẳng định âm bắt buộc — hàng này là cổng quyết định**

| file test mới | case | người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| `packages/coding-agent/test/tool-call-block-kind.test.ts` (mới) | handler trả `{ block: true, reason: "policy: no writes" }` → `emitToolCall` trả `kind === "denied"` | transcript hiện nhãn "ai đã chặn". Nếu `runner.ts:1644-1646` bỏ chuẩn hoá, nhãn `denied` biến mất — hoặc tệ hơn, mọi thứ thành `hook-failed` và người dùng mất đúng thông tin "ai đã chặn tôi" |
| cùng file | handler ném `new Error("boom")` → `kind === "hook-failed"` **và** `runner.onError` nhận `{ event: "tool_call", error: "boom" }` | transcript hiện nhãn "hook hỏng: … chưa hoàn tất". Không có ai chặn. |
| cùng file | handler treo, timeout kích hoạt → `kind === "hook-failed"`, `reason` chứa `timed out after` | y hệt, và tool vẫn không chạy |
| cùng file | `controller.abort()` giữa lúc handler đang chờ → `kind === "cancelled"`, `reason` chứa `cancelled while an extension handler was pending` | người dùng hủy, không phải ai chặn. Nhãn `hook-failed` ở đây là **thông tin sai** |
| `packages/coding-agent/test/hook-tool-wrapper-input.test.ts` (đã có) | hook `hooks.json` trả block thật → lỗi mang nhãn `denied`; hook ném lỗi → `hook-failed` | đường hooks phải phân biệt được y hệt đường extensions, nếu không thì "đã sửa" chỉ áp dụng cho một nửa người dùng |
| `packages/tui/test/tool-execution-block-label.test.ts` (mới) | dựng component với kết quả `kind: "denied"` và `kind: "hook-failed"`, đối chiếu **cả** đường stream **và** `ui-helpers.ts:605` rebuild | hai chuỗi render **khác nhau và nhìn thấy được**. Nếu chỉ sửa `tool-execution.ts`, transcript dựng lại sẽ đổi nhãn — kiểu hỏng mà `bun check` không thấy |

Không dùng `mock.module()` (AGENTS.md cấm). Dùng `vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach`.

**Cổng có đỏ được không — trả lời từng cổng một**

| cổng | đỏ được? | bằng cách nào, cụ thể |
| --- | --- | --- |
| (1) điều khoản bảo toàn | **CÓ** | Xoá `block: true,` ở `extensions/runner.ts:1636`. `expect(executeCalls).toEqual([])` ở `extensions-runner.test.ts:1697` và `expect(executed).toBe(false)` ở `:2000` đỏ ngay. **Đây là cổng duy nhất chặn được việc đảo ngược quyết định.** |
| (2) hàng âm `denied` | **CÓ** | Bỏ chuẩn hoá ở `extensions/runner.ts:1644-1646` (hoặc gán `kind: "hook-failed"` cho mọi `block: true`). `tool-call-block-kind.test.ts` đỏ vì `kind` không còn là `"denied"`. Đồng thời `extensions-runner.test.ts:3128` đỏ. **Cổng quyết định của mục này.** |
| (3) hai nhãn ở renderer | **CÓ** | Sửa `tool-execution.ts` nhưng bỏ `ui-helpers.ts:605` / `event-controller.ts` → `tool-execution-block-label.test.ts` đỏ ở nhánh rebuild. Nhưng **chỉ** sau khi đã tạo kênh có cấu trúc ở bước 4; hôm nay chưa có gì để đỏ. |
| (4) `emitError` trên cả ba đường | **KHÔNG — cổng giả, bỏ nó** | `#runHandlerWithTimeout` **đã** gọi `this.emitError` ở `extensions/runner.ts:1471-1475` và `:1482-1487`, tức đường extensions **đã thoả** trước khi có việc gì. Cổng này xanh với 0 dòng sửa. Chỉ `hooks/runner.ts:336-338` thật sự thiếu. **Viết lại thành: một test khẳng định `runner.onError` nhận `{ event: "tool_call" }` trên ĐƯỜNG HOOKS.** |
| (5) timeout cho hooks dùng đúng hằng | **CÓ, nhưng cần test riêng** | Đổi `EXTENSION_HANDLER_TIMEOUT_MS` sang một số khác trong test ⇒ `tool-call-block-kind.test.ts` đỏ. Nhưng **phải** có một test riêng khẳng định thời gian chờ dialog **không** bị trừ (đây là hành vi `pauseDepth` ở `runner.ts:259-334` bảo vệ; thêm `Bun.sleep` thuần sẽ phá nó và không test nào ở trên bắt được). |
| (6) `bun run check:ts` | **CÓ, một phần** | Đỏ nếu `kind` không được khai ở `shared-events.ts:314` mà lại dùng ở wrapper — `ToolCallEventResult` không có trường đó. **Không đỏ với lỗi logic.** |

**Cổng KHÔNG bắt được (viết rõ để không ai tưởng có):**
- `agent-session.ts:4509` có được soát hay không. Cổng này **không** bắt được vì `BeforeToolCallResult` không có `kind` nên `check:ts` im; và nếu ai đó chỉ sửa hai wrapper thì `agent-session.ts:4518-4520` âm thầm nuốt `kind` mà **không** test nào đỏ. **Đây là một kiểm tra của con người — và là kiểm tra quan trọng nhất trong mục này.**
- Việc `hooks/runner.ts` thực sự dùng cơ chế pause/resume chứ không phải `Promise.race` thuần (xem *Cạm bẫy 1*).

**Cổng viết lại, đúng thứ tự:**
```bash
# 1. Điều khoản bảo toàn — chỉ đổi cách khẳng định, KHÔNG đổi ý nghĩa
bun test packages/coding-agent/test/extensions-runner.test.ts

# 2. Hợp đồng mới (hàng âm + nhánh cancelled + hai đường wrapper)
bun test packages/coding-agent/test/tool-call-block-kind.test.ts
bun test packages/coding-agent/test/hook-tool-wrapper-input.test.ts

# 3. Nhãn ở renderer, cả hai đường stream lẫn rebuild
bun test packages/tui/test/tool-execution-block-label.test.ts
bun test packages/tui/test/tool-execution-xdev-render.test.ts

# 4. Không hồi quy toàn package
bun test packages/coding-agent/test/ packages/tui/test/ packages/agent/test/

# 5. Types + lint
bun run check:ts
bun run lint
```
Không dùng `tsc` / `npx tsc` (AGENTS.md cấm).

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: bước "thêm timeout cho hooks" nghe như một dòng, thực tế là 76 dòng có bẫy giết người dùng.** `raceHandlerWithTimeout` (`extensions/runner.ts:259-334`) không chỉ race: nó có `pauseDepth` / `remainingMs` / `activeSince` để **tạm dừng đồng hồ khi người dùng đang đọc dialog**. Mô tả setting tại `extensibility/settings.ts:160` nói thẳng: *"time awaiting OMP-owned dialogs does not count"*. Nếu bạn viết `Promise.race([handler(e, ctx), Bun.sleep(30_000)])`, một hook hỏi `ctx.ui.confirm` sẽ **bị giết sau 30 giây dù người dùng đang suy nghĩ**. **Đây là hồi quy nghiêm trọng hơn nhiều so với việc thiếu timeout, và không test nào trong khối Xác minh của work item bắt được.**
2. **`throw new Error(reason)` nuốt cấu trúc; nhãn ở renderer không có kênh nào để tới.** Work item vẽ hai chuỗi ở tầng renderer, nhưng thứ đi tới renderer hôm nay là **một chuỗi** — `ToolExecutionComponent` (`tool-execution.ts:243`) chỉ có `isError`. Thêm `kind` vào `ToolCallEventResult` **không** tự tạo ra kênh: `wrapper.ts:265` stringify nó thành `Error.message`, `agent-loop.ts:545` đóng gói thành `content: [{ type: "text" }] + isError: true`. Nếu bạn chỉ thêm `kind` rồi ở renderer phân biệt bằng cách kiểm tiền tố chuỗi, bạn vừa viết string-matching trên protocol — đúng cái mà `ToolCallEventResult` sinh ra để chặn. **Phải thêm một trường có cấu trúc xuyên từ `callResult` → `BeforeToolCallResult` → tool result → component. Đây là phần việc lớn nhất của mục này và work item KHÔNG nêu.**
3. **Work item nói "hai nhãn khác nhau" là trạng thái hiện tại; nó không phải.** `grep "Blocked by" packages/tui/src` = 0 hit. Cột "đã kiểm chứng?" của hàng renderer cũng không có neo. Kẻ triển khai tin rằng chỉ cần tách hai nhánh sẽ ra hai nhãn sẽ **sửa nhầm chỗ** và tưởng xong.
4. **Điều khoản bảo toàn của work item tự mâu thuẫn.** "Không được sửa một khẳng định nào để làm xanh" + `toEqual` ở ba test = không thể cùng lúc đúng. Ai đọc chỉ lật điều khoản sẽ hoặc bỏ `kind` (mục vô nghĩa) hoặc sửa ba test và tưởng đã vi phạm. Phải viết lại thành "giữ nguyên `executeCalls === []` / `executed === false`; `toEqual` thì cập nhật shape".
5. **Bảng "Đính chính" của chính work item lệch +1 ở mọi dòng** (`hooks/tool-wrapper.ts`: nói 78/79/80-81/82/83, thật 79/80/81-83/84/85). Bảng file gốc cũng lệch. Bỏ qua điều này thì bạn sửa nhầm dòng rồi tưởng code không đúng — và sẽ kết luận sai rằng mã nguồn đã lệch với tài liệu.
6. **`extensions/types.ts` là chỗ sửa sai.** `:1189` chỉ là re-export type-only. Sửa file đó thêm `kind` sẽ **không** tạo ra trường nào, và `bun check` sẽ báo lỗi ở wrapper — dễ dẫn tới người triển khai quay lại sửa `shared-events.ts` rồi tưởng mình vừa sửa `types.ts` thành công.
7. **Cổng (4) trong kế hoạch xanh sẵn.** `#runHandlerWithTimeout` đã gọi `emitError` ở cả hai nhánh. Dành thời gian cho một cổng luôn xanh là mất thời gian; nó tạo cảm giác an toàn giả cho đúng cái mà work item đang cảnh báo.
8. **Bốn consumer của `callResult.block`, work item nói hai.** `extensions/wrapper.ts:263`, `hooks/tool-wrapper.ts:66`, `hooks/tool-wrapper.ts:79`, `agent-session.ts:4518`. Sửa hai cái đầu thì hai cái sau vẫn trần — và `agent-session.ts:4519` **tự dựng lại** object nên `kind` biến mất trong im lặng, đúng loại hỏng mà không cổng nào bắt.

---

## GAP-M4-13. Cặp audit bền vững cho mỗi lần hỏi quyền: sau một crash, trả lời được "ai đã duyệt cái này" (sóng B)

**Sóng:** M4 Wave B — Ghi trạng thái bền vững và sự thật của bảng settings (`shippable: false`, chờ cổng changelog dùng chung của M4, plan §6.2/§6.3). Cùng đợt M4-4.
**Effort:** M
**Phụ thuộc:** M4-4 — tiền lệ `ChangeResult` là chung. PR **riêng** nhưng **cùng quyết định release**. Phải nói rõ thứ tự merge với M4-9 nếu lệnh đọc dùng chung hạ tầng.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/session-entries.ts` | sửa | Thêm `ApprovalEntry` vào union `SessionEntry`, và cơ chế "trong log nhưng **không** đi vào context của model". | có — union nằm ở `:300-315` với **16** thành viên, và `grep -c "Approval"` trên file cho **0**; cơ chế sẵn có là `EPHEMERAL_MODEL_CHANGE_ROLE` |
| `packages/coding-agent/src/extensibility/extensions/wrapper.ts` | sửa | Ghi **đúng một lần** khi hỏi và **đúng một lần** khi trả lời, bọc quanh turn. Nguồn của bản ghi **phải** là `resolveApproval` — nơi duy nhất quyết định chính sách — chứ không phải call site. | có — `resolveApproval` tại `:290` (và lần gọi sớm hơn ở `:233`); `type: "tool_approval_requested"` phát tại `:328`, `"tool_approval_resolved"` tại `:340` |
| `packages/coding-agent/src/session/turn-recovery.ts` | đọc | Cơ chế "trong log, không trong model" **đã có sẵn** — `EPHEMERAL_MODEL_CHANGE_ROLE`. Phải **tái dùng**, không nhân bản. | có — import ở `:72`, dùng ở `:1686` và `:1958` |
| lệnh chỉ-đọc | tạo | Đọc lại được các cặp approval. Cùng họ với `omp extensions-triage` của M4-9. | có (lệnh M4-9 chưa tồn tại trong cây; xem mục M4-9) |

### Các bước

1. **Đọc lại vì sao đây là lỗi của M4-4 đặt ở chỗ rủi ro cao nhất.** M4-4 nói: `/settings` ghi xong rồi báo *applied* mà không biết có lên đĩa không. Ở đây: một bash chạy rồi transcript không lưu rằng **con người** đã duyệt nó, chỉ lưu kết quả. Cùng lỗi hình dạng, hậu quả nặng hơn.

2. **Đo lại hiện trạng trước khi thiết kế.** Union `SessionEntry` (`session/session-entries.ts:300-315`) có **16** thành viên và **không có thành viên nào là approval** — `grep -c "Approval"` trên file trả **0**. `tool_approval_requested` / `tool_approval_resolved` (`extensibility/extensions/types.ts:985` và `:994`, phát tại `wrapper.ts:328` và `:340`) là **event trong RAM**; `modes/warp-events.ts:197-203` chỉ chuyển tiếp cho một bản ghi sự kiện ngoài. Sau một crash, transcript cho thấy một `tool_use` không có `tool_result` — nhưng **không** phân biệt được "người đã bấm duyệt rồi máy chết" với "cổng quyền chưa từng chạy".

3. **Bốn việc:**
   1. `ApprovalEntry { toolCallId, toolName, resolvedPolicy, decision, decidedAt, gate: "tui" | "acp" | "xdev" | "policy" }` ghi **đúng một lần** khi hỏi và **đúng một lần** khi trả lời, bọc quanh turn như `wrapper.ts:328`/`:340` đã làm cho event.
   2. **Ràng buộc quan trọng nhất:** entry này **có trong log nhưng không được đi vào context của model** — nó là bản ghi kiểm toán, không phải message. Cơ chế sẵn có để làm việc đó là `EPHEMERAL_MODEL_CHANGE_ROLE` (`session/turn-recovery.ts:72`), tức đã có tiền lệ "trong log, không trong model". **Không thêm đường lọc thứ hai.**
   3. Đọc lại được qua một lệnh chỉ-đọc — cùng họ với `omp extensions-triage` của M4-9.
   4. **Phụ thuộc bắt buộc:** `resolveApproval` (`wrapper.ts:290`) là nơi duy nhất quyết định chính sách, nên bản ghi phải lấy từ **đó**, không ghi lại ở call site — nếu không thì chính ta dựng nguồn sự thật thứ hai, đúng thứ M4 cấm.

4. **Giữ tương thích ngược.** `SessionEntry` union phải đọc được transcript cũ — transcript không có entry approval vẫn phải mở được. Và cơ chế `EPHEMERAL_MODEL_CHANGE_ROLE` phải được **tái dùng**, không nhân bản; nhân bản là cách tạo nguồn sự thật thứ hai mà chính M4 cấm.

5. **Chạy cổng** (khối Xác minh).

### Hình dạng code

```typescript
// packages/coding-agent/src/session/session-entries.ts
//
// This entry is an AUDIT RECORD, not a message. It belongs in the transcript and
// must never reach the model's context — the existing mechanism for exactly that
// is EPHEMERAL_MODEL_CHANGE_ROLE. Reuse it; a second filter is a second source
// of truth, which is what M4 forbids.

export interface ApprovalEntry {
	/** Links the "asked" record to the "answered" one. */
	toolCallId: string;
	toolName: string;
	/** The policy resolveApproval actually selected — not what the UI assumed. */
	resolvedPolicy: string;
	decision: "approved" | "denied";
	decidedAt: number;
	/** Which surface asked a human. `policy` = no human was asked at all. */
	gate: "tui" | "acp" | "xdev" | "policy";
}
```

Sau một crash, câu hỏi mà lệnh chỉ-đọc phải trả lời được là câu này — và **đây** là hợp đồng quan sát được, không phải việc có mặt một entry:

```text
$ omp approval-audit --call-id bash_01
  asked     14:02:11  gate=tui      policy=read-only-diff
  decided   14:02:19  gate=tui      decision=approved
  tool ran  14:02:19  bash …
```

Hôm nay, cùng câu hỏi đó trả về "không có gì": transcript cho thấy một `tool_use` không có `tool_result` và không có gì phân biệt được "người đã bấm duyệt rồi máy chết" với "cổng quyền chưa từng chạy".

### Hợp đồng test

Hợp đồng quan sát được, nêu tên lỗi người dùng thấy: hôm nay, sau một crash, người dùng mở transcript và **không phân biệt được** một lần hỏi quyền đã được người duyệt với một lần hỏi quyền chưa từng chạy. Sau item này, câu hỏi "ai đã duyệt cái này" phải trả lời được từ transcript.

Ba hợp đồng, mỗi hợp đồng một nhánh khác nhau:

1. **Một cặp, đúng một lần mỗi nửa.** Một lần hỏi quyền tạo ra **một** entry hỏi và **một** entry trả lời, khoá theo `toolCallId`. Đếm nhiều hơn một nửa nghĩa là bản ghi bị ghi ở call site, và đó là nguồn sự thật thứ hai.
2. **Không vào context của model.** Đây là điều khoản quan trọng nhất, và nó có một hình dạng kiểm chứng được: sau khi một tool được duyệt, chuỗi message đi tới provider phải **không** chứa entry approval. Đây là khẳng định **âm** — sự vắng mặt có ý nghĩa, không phải chi tiết hình thức.
3. **Tương thích ngược.** Transcript cũ — không có entry approval nào — phải đọc được, và lệnh chỉ-đọc phải báo "không có bản ghi" thay vì lỗi.

Hàng âm bắt buộc: một entry approval **không** được xuất hiện trong context của model kể cả khi `decision` là `denied` — vì đó là cách dễ rơi vào nhất (thêm nó vào mọi entry mới, cho an toàn).

### Xác minh

```bash
# 0. TIỀN ĐỀ MÔI TRƯỜNG (đặt trước mọi lệnh `bun test`): addon chưa có thì mọi test
#    đỏ vì "Failed to load pi_natives native addon for darwin-arm64" — đỏ vì môi
#    trường, KHÔNG phải đỏ vì công việc.
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 1. Session
bun test packages/coding-agent/test/session-entries.test.ts

# 2. Cặp audit
bun test packages/coding-agent/test/approval-audit.test.ts

# 3. Không hồi quy ở tầng approval
bun test packages/coding-agent/test/extension-tool-wrapper.test.ts packages/coding-agent/test/extensions-runner.test.ts packages/coding-agent/test/approval-mode.test.ts

# 4. Tương thích ngược: đọc được transcript cũ
bun test packages/coding-agent/test/session-restore.test.ts packages/coding-agent/test/session-compaction.test.ts

# 5. Types + lint + format
bun run check:ts
bun run lint
```

Tuyệt đối không dùng `tsc`/`npx tsc` — dự án cấm, dùng `bun run check:ts`.

### Cổng hoàn thành

Mục này XONG khi tất cả đồng thời đúng:

0. **Tiền đề môi trường:** addon đã build, nếu không thì (1)-(3) ghi là "chưa chạy".
1. Một lần hỏi quyền sinh ra **đúng một** cặp entry, khoá theo `toolCallId`.
2. Hàng âm bắt buộc: entry approval **không** xuất hiện trong chuỗi message đi tới provider — kể cả khi `decision` là `denied`. Đã từng thấy đỏ khi bỏ cơ chế `EPHEMERAL_MODEL_CHANGE_ROLE`.
3. Transcript cũ (không có entry approval) đọc được, và lệnh chỉ-đọc báo "không có bản ghi" chứ không lỗi.
4. `bun run check:ts` sạch; không hồi quy ở (3) và (4).

**Cổng này có thực sự đỏ được không: có**, và cổng quyết định là (2) — bỏ cơ chế "trong log, không trong model" thì entry approval đi thẳng vào context và hàng đỏ. Cổng này **không** bắt được việc bản ghi có lấy từ `resolveApproval` hay từ call site: cả hai đều cho ra **một** cặp entry như nhau. Đó là một kiểm tra của con người — đọc lại chỗ ghi và xác nhận nó nằm trong `resolveApproval`.

### Phụ thuộc

- **depends_on:** M4-4 — tiền lệ `ChangeResult` là chung. PR **riêng** nhưng **cùng quyết định release**. Phải nói rõ thứ tự merge với M4-9 nếu lệnh đọc dùng chung hạ tầng.
- **blocks:** không có. `blocks` rỗng.

### Cách sai dễ nhất

Ghi bản ghi ở **call site** thay vì ở `resolveApproval`. Kết quả trông y hệt — vẫn một cặp entry, vẫn khoá theo `toolCallId` — và mọi cổng ở trên đều xanh. Nhưng `resolvedPolicy` lúc đó là giá trị mà **giao diện giả định**, không phải giá trị mà chính sách thật đã quyết. Đó chính xác là lỗi mà M4-4 sinh ra ở dạng khác: tuyên bố một điều mà không kiểm chứng được. Vì vậy cổng (2) là cổng máy chạy được, còn chỗ ghi là một kiểm tra của con người — và phải ghi rõ như vậy thay vì giả vờ cổng phủ.

Lối sai thứ hai: **thêm một đường lọc riêng** cho entry approval thay vì tái dùng `EPHEMERAL_MODEL_CHANGE_ROLE`. Nó sẽ chạy, và sẽ là nguồn sự thật thứ hai — đúng thứ mà cả milestone này cấm.

Lối sai thứ ba, nhỏ hơn: coi đây là một audit log bên ngoài transcript. Khi đó nó không đi cùng session, không đi cùng file, và câu hỏi "phiên này ai đã duyệt" vẫn không trả lời được.

### Cần người quyết

- **GAP-D2: `ApprovalEntry` mở rộng union `SessionEntry`, hay tái dùng `CustomEntry` có sẵn?** (a) Biến thể mới → format mở rộng, cần cân nhắc migration, nhưng truy vấn được bằng type; (b) `CustomEntry` → **không** mở rộng format, nhưng phải đọc log bằng tay. Cùng loại với "open question M4-4-OQ1" mà M4 đã ghi. **Chưa có mặc định — cần bạn quyết.**
- **`gate` nhận bốn giá trị — danh sách đó có đúng không?** Union nằm ở `:300-315` và `gate` phải mô tả được **mọi** nơi hỏi quyền. Nếu còn một bề mặt thứ năm thì `gate` sẽ không phân biệt được, và bản ghi sẽ trả lời sai chính câu hỏi mà nó sinh ra để trả lời. Cần đối chiếu danh sách bề mặt thật trước khi chốt union này.
- **`resolvedPolicy` mang kiểu gì?** Nếu là chuỗi tự do thì hai policy khác tên sẽ không phân biệt được khi đọc lại. Nếu là union thật thì nó phải lấy từ đúng union mà `resolveApproval` trả về — và việc đó lại quay về cổng (2) ở trên.
- **Lệnh chỉ-đọc dùng chung hạ tầng với M4-9 hay không?** Nếu có, thứ tự merge với M4-9 phải được ghi trước khi code, chứ không phải sau.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Mọi neo đo được trong sổ | **XÁC NHẬN CHÍNH XÁC — toàn bộ** | Union `SessionEntry` đúng ở `:300-315` với **16** thành viên và `grep -c "Approval"` trả **0**. `tool_approval_requested` khai ở `extensibility/extensions/types.ts:985` và phát tại `wrapper.ts:328`; `tool_approval_resolved` khai ở `:994` và phát tại `:340`. `modes/warp-events.ts:197-203` đúng nguyên văn (`:197` là `api.on("tool_approval_requested", …)`). `resolveApproval` được gọi tại `wrapper.ts:290` (và một lần sớm hơn ở `:233`). `EPHEMERAL_MODEL_CHANGE_ROLE` import ở `session/turn-recovery.ts:72`, dùng ở `:1686` và `:1958`. Không có gì cần sửa — đây là mục được đo kỹ nhất trong sáu mục M4, nên nó được ghi vào đây như một **bản ghi đã kiểm**, không phải như một phát hiện mới. |

## Cần người xác nhận

1. **Đây là mục có ít rủi ro kỹ thuật nhất trong sáu mục, và nhiều câu hỏi nhất.** Mọi neo đều đúng nguyên văn; điều chưa có là quyết định, không phải dữ kiện. Đừng đọc "đã kiểm" ở bảng trên là "đã quyết xong".
2. **`gate` là chỗ dễ sai âm thầm nhất của item.** Bản ghi sinh ra để trả lời "ai đã duyệt cái này", và nó chỉ trả lời được nếu `gate` phân biệt được **mọi** nơi hỏi quyền. Danh sách bốn giá trị đến từ sổ khoảng trống, chưa được đối chiếu với các bề mặt thật trên cây — và một bề mặt thứ năm sẽ làm bản ghi im lặng gộp hai loại quyết định khác nhau vào một.



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo neo.** Lệch định danh, đọc trước khi gõ: harness giao nhiệm vụ là `M4-14`, nhưng tiêu đề `Cặp audit bền vững cho mỗi lần hỏi quyền` nằm ở hàng **2149** dưới heading `GAP-M4-13`. Hàng 2302 mới là `GAP-M4-14` (`Bảng feature → cơ chế`, sóng D, không liên quan). Phiếu bám **tiêu đề**, vì tiêu đề khớp nguyên văn; số thứ tự thì lệch một.

**Cảnh báo quan trọng nhất của mục này: điểm ghi bản ghi mà kế hoạch chỉ đích danh là SAI VỀ NGHĨA, và nó sai ở đúng chỗ dễ sai nhất.**

1. **`wrapper.ts:290` là CALL SITE, không phải định nghĩa.** Kế hoạch viết: *"`resolveApproval` (`wrapper.ts:290`) là nơi duy nhất quyết định chính sách, nên bản ghi phải lấy từ **đó**"*. Dòng 290 là `const resolved = resolveApproval(this.tool, resolvedArgs, approvalMode, userPolicies);` — một lời gọi. `wrapper.ts:18` chỉ `import { resolveApproval }` từ `../tools/approval`. **Định nghĩa thật:** `packages/coding-agent/src/tools/approval.ts:203` `export function resolveApproval(tool: ApprovalSubject, args: unknown, mode: ApprovalMode, userConfig: Record<string, unknown> = {},): ResolvedApproval {`. Đây là một **hàm thuần bốn tham số, không có session handle, không có context**. Không thể ghi vào transcript từ trong nó mà không đổi chữ ký thành một callback tùy ý — tức biến một hàm thuần thành hàm có tác dụng phụ, đúng cái làm mất khả năng suy luận của nó. Và nếu quay sang phương án "ghi ở call site", `resolveApproval` có **bảy** call site trong `src/`: `cursor.ts:341`, `cursor.ts:1012`, `modes/controllers/event-controller.ts:1778`, `tools/approval.ts:346`, `speculation/host.ts:135`, `eval/preludes.ts:99`, `extensibility/extensions/wrapper.ts:233`, `wrapper.ts:290`. Không phải một, mà là bảy. → **Số dòng kế hoạch nêu cho dsh là chính xác từng dòng**, nhưng câu "chỗ ghi phải là `resolveApproval` chứ không phải call site" — câu mà work item dùng làm **ràng buộc quan trọng nhất** và làm cả cổng (2) — **không thực hiện được như đang viết**, và cách viết nó **đúng bằng loại sai mà mục "Cách sai dễ nhất" cảnh báo**. → **Viết lại thành: một chỗ ghi duy nhất, đặt ở `wrapper.ts` ngay trên `if (approvalCheck.required)` (`:314`), đọc chính sách từ biến `resolved` đã có sẵn từ `:290`, và thêm một assertion/hằng số buộc `resolved` là nguồn duy nhất.**
2. **`session-entries.ts:300-315` — LỆCH 1 DÒNG.** Union thật là **`:300-316`**, không phải `:300-315` — dòng cuối là 316. Số thành viên **16** thì đúng. `grep -c "Approval"` trên file trả **0**, đúng như kế hoạch nói. File dài 360 dòng.
3. **`EPHEMERAL_MODEL_CHANGE_ROLE` KHÔNG phải cơ chế lọc context — dùng nó là sai diễn giải.** Nó là `packages/coding-agent/src/session/session-entries.ts:33` `export const EPHEMERAL_MODEL_CHANGE_ROLE = "fallback";` — một **chuỗi vai trò model** đánh dấu một lần đổi model tạm. Đọc hết mọi chỗ dùng trong `src/`: `session-context.ts:129` (chọn model khôi phục), `model-controls.ts:284` (đặt vai trò khi ghi), `turn-recovery.ts:1686` (bỏ qua gợi ý retry), `turn-recovery.ts:1958` / `:2174` / `:2241` (`appendModelChange(..., EPHEMERAL_MODEL_CHANGE_ROLE, ...)`), `persisted-agents.ts:230/328` (bỏ qua khi lưu agent đã persist). **Không chỗ nào lọc context của model.** Cơ chế thật nằm ở chỗ khác: `packages/coding-agent/src/session/session-context.ts:212` `export type TranscriptEntry = SessionMessageEntry | CustomMessageEntry;`, `:214` `export function isTranscriptEntry(entry: SessionEntry): entry is TranscriptEntry {`, `:215` `return entry.type === "message" || entry.type === "custom_message";`, `:218` `export function buildSessionContext(`. **Đó mới là "trong log, không trong model": bất kỳ entry nào `type` không phải `message` và không phải `custom_message` thì bị loại khỏi context một cách cấu trúc.** Bảng "Đính chính so với plan" của work item ghi "Mọi neo đo được trong sổ | XÁC NHẬN CHÍNH XÁC — toàn bộ", và các số dòng **đều đúng** — nhưng kết luận rút ra từ chúng thì sai. **Số dòng đúng không cứu được một diễn giải sai.** → Viết lại bước này thành: **tái dùng `isTranscriptEntry`** (tức chọn `type` không thuộc `{message, custom_message}`), **đừng tái dùng `EPHEMERAL_MODEL_CHANGE_ROLE`, và đừng thêm bộ lọc thứ hai.**
4. **Cổng `hasApprovalHandlers` nuốt mất CẢ HAI event — đây là lỗi âm thầm không ai nêu trong work item.** `wrapper.ts:323-334`: `:323` `const hasApprovalHandlers = this.runner.hasHandlers("tool_approval_requested") || this.runner.hasHandlers("tool_approval_resolved");`, `:324` `const sessionId = …`, rồi `if (hasApprovalHandlers) { await this.runner.emit({ type: "tool_approval_requested", …` — cả hai event approval đều **nằm sau** cổng này. Đã quét toàn cây: `tool_approval_requested` có **đúng một** subscriber — `modes/warp-events.ts:197` `api.on("tool_approval_requested", event => {` — và subscriber đó chỉ chuyển tiếp ra log sự kiện ngoài. `rg` trên `src/` cho `tool_approval_requested` trả về đúng: `warp-events.ts:197`, `speculation/host.ts:71`, `wrapper.ts:324`, `wrapper.ts:328`, `types.ts:985`, `types.ts:1359`. **Hệ quả: nếu bạn dựng bản ghi audit lên hai event này, thì trong một phiên TUI bình thường — không có warp client kết nối — không có event nào được phát ra, và bản ghi sẽ RỖNG.** Cổng (2) của work item vẫn xanh vì nó chỉ kiểm tra entry không lọt vào context — vốn đã đúng sẵn vì `type` mới. Cổng đó **không** bắt được "bản ghi không bao giờ được ghi". → **Ghi audit TRƯỚC `const hasApprovalHandlers`, ngay trên `if (approvalCheck.required)` (`:314`).**
5. **`resolvedPolicy: string` nên là `ApprovalPolicy`.** `approval.ts:16` đã có `type ApprovalPolicy = "allow" | "deny" | "prompt"`, và `ResolvedApproval` (`approval.ts:85`) đã mang `policy`, `tier`, `reason`, `override`, `source`, `policyKey`. Phẳng xuống một chuỗi tự do là **tự tạo lại đúng lớp lỗi mà M4 cấm**. Work item đã tự hỏi ở mục "Cần người quyết" và giờ đã có câu trả lời: **lấy nguyên `ResolvedApproval` vào bản ghi, đừng phẳng thành chuỗi.**

**Các neo khác đã kiểm và ĐÚNG:** `wrapper.ts:233` `const preResolved = resolveApproval(...)`; `wrapper.ts:328` `type: "tool_approval_requested",`; `wrapper.ts:340` `type: "tool_approval_resolved",`; `extensibility/extensions/types.ts:985` `type: "tool_approval_requested";`; `types.ts:994` `type: "tool_approval_resolved";`; `modes/warp-events.ts:197-203`; `turn-recovery.ts:72` (import); `turn-recovery.ts:1686`; `turn-recovery.ts:1958`; `omp extensions-triage` (M4-9) **ĐÚNG là chưa có** — `rg` toàn `packages/` không có kết quả.

**Sáu trong bảy tên test trong work item KHÔNG tồn tại:** `packages/coding-agent/test/session-entries.test.ts` **KHÔNG tồn tại**; `packages/coding-agent/test/approval-audit.test.ts` **KHÔNG tồn tại** (đây là file mới, phải tạo); `packages/coding-agent/test/extension-tool-wrapper.test.ts` **KHÔNG tồn tại**; `packages/coding-agent/test/extensions-runner.test.ts` tồn tại (đã chạy thử: **87 pass, 0 fail**); `packages/coding-agent/test/approval-mode.test.ts` **KHÔNG tồn tại** — file thật ở `packages/coding-agent/test/tools/approval-mode.test.ts`; `packages/coding-agent/test/session-restore.test.ts` **KHÔNG tồn tại**; `packages/coding-agent/test/session-compaction.test.ts` **KHÔNG tồn tại** — file thật gần nhất là `agent-session-compaction.test.ts`. `bun test <đường/dẫn-không-có>` fail ngay.

**Bảng điểm sửa**

| đường/dẫn | symbol | TRƯỚC (nguyên văn từ file) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/session-entries.ts` | `ApprovalEntry` (chưa có) | union `SessionEntry` kết thúc ở `\| ResetBoundaryEntry;` — không có biến thể approval | thêm `export interface ApprovalEntry extends SessionEntryBase { type: "approval"; … }` và thêm `\| ApprovalEntry` vào union (thật là `:300-316`, 16 biến thể) |
| `packages/coding-agent/src/session/session-manager.ts` | `appendApproval` (chưa có) | `appendCustomEntry(customType: string, data?: unknown): string {` (`:2951`) và `appendModelChange(model: string, role?: string, resolvedModelIsFallback = false): string {` (`:2873`) | thêm `appendApproval(...)` theo **đúng khuôn** của hai hàm trên: dựng entry, `...this.#freshEntryFields()`, `this.#recordEntry(entry)`, `return entry.id` |
| `packages/coding-agent/src/extensibility/extensions/wrapper.ts` | khối `if (approvalCheck.required)` | `const hasApprovalHandlers = this.runner.hasHandlers("tool_approval_requested") \|\| this.runner.hasHandlers("tool_approval_resolved");` (`:323`) — **cả khối emit nằm sau cổng này** | ghi audit **ngoài** `hasApprovalHandlers`, ngay trên `if (approvalCheck.required)` (`:314`), để bản ghi không phụ thuộc việc có extension handler hay không |
| `packages/coding-agent/src/cli-commands.ts` | `commands` | `export const commands: CommandEntry[] = [` (`:27`), hiện có `stats`, `render`, `skill`, `token`… | thêm một entry `{ name: "approval-audit", load: () => import("./commands/approval-audit").then(m => m.default), help: commandHelp.approvalAuditHelp }` |
| `packages/coding-agent/src/cli/command-help.ts` | `approvalAuditHelp` (chưa có) | — | thêm help text, theo khuôn các help đứa cạnh |

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc)

1. **Dừng lại và đọc mục *Cần người quyết*. Mục này chưa sẵn sàng để gõ**, vì hai điều quyết định còn treo. Câu hỏi treo thứ nhất là `EPHEMERAL_MODEL_CHANGE_ROLE` có phải cơ chế "trong log, không trong model" không. **Nó không phải** — xem cảnh báo neo 3. Cơ chế thật là `isTranscriptEntry` (`session-context.ts:214`), và `ApprovalEntry` với `type: "approval"` được miễn nhiễm theo định nghĩa, **không cần thêm bộ lọc nào** — đúng tinh thần "đừng nhân bản đường lọc" mà work item muốn, nhưng vì một lý do khác.
2. **Chỗ ghi bản ghi: kế hoạch trỏ sai.** Xem cạm bẫy 1. Viết lại thành: **một chỗ ghi duy nhất** ở `wrapper.ts` ngay trên `if (approvalCheck.required)` (`:314`), đọc chính sách từ biến `resolved` đã có sẵn từ `:290`, dùng `resolved.policy` (`ApprovalPolicy`, `approval.ts:16`) thay cho `resolvedPolicy: string` tự do, và **lấy nguyên `ResolvedApproval` (`approval.ts:85`) vào bản ghi**.
3. **Chặn cổng `hasApprovalHandlers`.** Xem cạm bẫy 3. Ghi audit **trước** `const hasApprovalHandlers`, ngay trên `if (approvalCheck.required)` (`:314`).
4. **Union `SessionEntry`:** neo lệch một dòng (thật `:300-316`, 16 thành viên), số thành viên thì đúng. `grep -c "Approval"` trên file trả **0**, đúng như kế hoạch nói. File dài 360 dòng.
5. **Backward compatibility: đã có sẵn, gần như miễn phí.** `session-migrations.ts` chỉ có `migrateV1ToV2` và `migrateV2ToV3`, và `CURRENT_SESSION_VERSION = 3` (`session-entries.ts:13`). **Không có bước nào liệt kê các `type` hợp lệ** — loader đọc JSONL thô (`session-loader.ts:326` `parseSessionEntries`, `:90` `parseSessionContent`). Một transcript cũ không có entry approval vẫn parse được, vì không có gì phải migrate. Đây là hợp đồng **âm** — sự vắng mặt có ý nghĩa — nên nó xứng đáng một test riêng, và là test rẻ nhất trong cả ba.
6. **Lệnh chỉ-đọc: chưa có, và tiền lệ M4-9 thật sự chưa tồn tại.** `rg "extensions-triage"` trên toàn `packages/` → **không có kết quả nào**. Lệnh của M4-9 chưa tồn tại, đúng như work item ghi. Nên "cùng họ với `omp extensions-triage`" là một lời hứa với một thứ chưa sinh ra; **đừng chờ nó**. Đường ghi lệnh: `cli-commands.ts:27` `export const commands: CommandEntry[] = [`. Đọc session từ file: `session-loader.ts:531` `loadSessionMessagesReadOnly(filePath: string)`. **Nhưng lệnh audit cần ENTRY, không cần MESSAGE** — nên nó phải dùng `parseSessionEntries` (`:326`) hoặc `loadSessionFile` (`:353`), rồi lọc `entry.type === "approval"`, **không** dùng `loadSessionMessagesReadOnly` (hàm đó lọc ra đúng những thứ bạn cần). **Đây là cái bẫy dễ sai nhất khi gõ lệnh này.**
7. **Chạy cổng** (mục *Cổng*).

**Hợp đồng test**

**Ba nhà ở thật cho ba hợp đồng** (thay cho bảy tên file trong work item, sáu tên không tồn tại):

1. **Một cặp, đúng một mỗi nửa** → `packages/coding-agent/test/approval-audit.test.ts` (mới), cộng `packages/coding-agent/test/extensions-runner.test.ts`.
2. **Không vào context của model** → `packages/coding-agent/test/session-messages.test.ts` (tồn tại, 16 KB) — đây là nơi đúng để khẳng định chuỗi message đi tới provider không chứa entry approval. Nối vào `buildSessionContext` / `isTranscriptEntry` (`session-context.ts:214`).
3. **Tương thích ngược** → `packages/coding-agent/test/session-read-only-hydration.test.ts` (tồn tại) — đã có sẵn đúng khuôn: nó dựng header `{ type: "session", version: 3, … }` bằng tay và nối `parseSessionEntries`/`resolveBlobRefsInEntries`. Viết case "transcript không có entry approval nào vẫn đọc được" theo đúng khuôn đó, và "lệnh audit báo *không có bản ghi* chứ không throw".

**Các case:**

- **ghi đúng một cặp khoá theo toolCallId** — một lần hỏi quyền sinh đúng một entry hỏi + một entry trả lời.
- **bản ghi được ghi khi không có extension handler nào** — hợp đồng bắt được lỗi ở bước 3. Chạy approval với `runner` không đăng ký handler `tool_approval_requested`, rồi khẳng định transcript **vẫn có** cặp entry. **Không có case này thì lỗi cổng `hasApprovalHandlers` đi lọt.**
- **entry approval không xuất hiện trong context của model kể cả khi decision là denied** — hàng âm bắt buộc, khẳng định **sự vắng mặt**.
- **resolvedPolicy lấy từ chính sách đã quyết, không phải giá trị giao diện giả định** — đây là hợp đồng mà cổng máy **không** bắt được; nó chỉ đỏ được bằng cách so `resolved.policy` với giá trị mà chính sách trả về.
- **transcript cũ không có entry approval vẫn mở được; lệnh audit báo không có bản ghi, không throw**.

**Điều người dùng thấy nếu hồi quy:** sau một crash, `omp approval-audit --call-id bash_01` in ra "không có bản ghi" cho một lần hỏi quyền **đã có người bấm duyệt** — đúng cái mất mát mà work item nêu tên, và nó im lặng, không báo lỗi.

**Cổng có đỏ được không, và bằng cách nào**

**Cổng (2) — hàng âm — CÓ đỏ được.** Bỏ cơ chế "loại khỏi context" đi, tức là đặt `ApprovalEntry.type = "message"` hoặc đưa nó vào `TranscriptEntry` (`session-context.ts:212`), thì entry approval đi thẳng vào chuỗi message đi tới provider và `session-messages.test.ts` đỏ. **Đây là cổng máy chạy được, và nó là cổng duy nhất trong work item là thật.**

Một lưu ý về lịch sử: work item viết "Đã từng thấy đỏ khi bỏ cơ chế `EPHEMERAL_MODEL_CHANGE_ROLE`". Phiếu **không chứng kiến** lần đỏ đó và không truy được nó trong cây, nên **đừng dựa vào nó**. Lập luận đỏ ở trên dựng từ `isTranscriptEntry` (`session-context.ts:214`) — và nó đỏ được **bất kể** cơ chế nào bị bỏ, vì nó kiểm tra hệ quả chứ không kiểm tra nguyên nhân.

**Nhưng vì kế hoạch đặt sai chỗ ghi, cổng (2) không bắt được lỗi lớn nhất của mục này.** Cụ thể:

- **Ghi bản ghi ở call site thay vì ở chính sách** — mọi cổng ở trên vẫn xanh, vì cả hai cách đều ra một cặp entry khoá theo `toolCallId`, và `resolvedPolicy` chỉ sai khi giá trị mà giao diện giả định khác giá trị chính sách quyết. Work item tự thừa nhận điều này ở "Cách sai dễ nhất" và nói đó là kiểm tra của con người — giữ nguyên kết luận đó, nhưng thêm một điều: sau bước 2, đây không còn là lựa chọn "ghi ở đâu" nữa, vì `resolveApproval` không thể ghi được. **Cổng máy bảo vệ được phần "đúng một nguồn sự thật", con người bảo vệ phần "giá trị đúng".**
- **Bản ghi không bao giờ được ghi (bước 3)** — cổng này **đang xanh trong kế hoạch và sẽ xanh sau khi gõ**. **Không cổng nào trong work item bắt được nó. Đây là lỗi phát hiện thêm, không phải lỗi kế hoạch nêu.**

→ **Viết lại cổng (1) cho đỏ được**, bổ sung vào khối Xác minh:
```
# 1b. Cổng riêng cho lỗi cổng hasApprovalHandlers — BẮT BUỘC, không có nó thì
#     toàn bộ mục có thể ship với bản ghi rỗng mà mọi cổng khác vẫn xanh.
#     Case: approval chạy với runner KHÔNG đăng ký handler tool_approval_requested
#     → transcript vẫn phải có đủ một cặp entry khoá theo toolCallId.
```
Cổng này đỏ được theo cách cụ thể: dựng một `ExtensionRunner` không extension nào, chạy một tool cần approval, đọc lại session file, đòi `type === "approval"` phải có **hai** entry. Nếu ai đó lại ghi sau `hasApprovalHandlers`, entry count = 0 và cổng đỏ.

**Cổng, đúng thứ tự:**
```bash
# 0. Tiền đề môi trường — ĐÃ ĐÚNG trên máy này:
#    packages/natives/native/pi_natives.darwin-arm64.node tồn tại, ninja ở /opt/homebrew/bin/ninja.
#    Nếu mất, chạy: bun --cwd=packages/natives run build
#    (KHÔNG cần `brew install ninja` — đã có.)

# 1. Cặp audit (file mới)
bun test packages/coding-agent/test/approval-audit.test.ts

# 2. Hàng âm: entry approval không lọt vào context của model
bun test packages/coding-agent/test/session-messages.test.ts

# 3. Tương thích ngược
bun test packages/coding-agent/test/session-read-only-hydration.test.ts

# 4. Không hồi quy ở tầng approval (đường dẫn đúng, khác work item)
bun test packages/coding-agent/test/extensions-runner.test.ts packages/coding-agent/test/tools/approval-mode.test.ts packages/coding-agent/test/tools/approval.test.ts

# 5. Types + lint
bun run check:ts
bun run lint
```
Đã xác nhận `bun run check:ts` và `bun run lint` tồn tại ở `package.json:90` và `:93`. Đã xác nhận `bun test` chạy được: `extensions-runner.test.ts` → **87 pass, 0 fail**.

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: `wrapper.ts:290` là call site, không phải định nghĩa.** Work item dùng `:290` làm neo cho ràng buộc "bản ghi phải lấy từ `resolveApproval`", nhưng dòng đó là `const resolved = resolveApproval(...)` — lời gọi. **Ai đó mở file, thấy đúng dòng, và ghi xuống dưới nó; mọi cổng vẫn xanh.** Định nghĩa ở `tools/approval.ts:203`, và nó thuần.
2. **`EPHEMERAL_MODEL_CHANGE_ROLE` không phải cơ chế lọc context.** Nó là `= "fallback"`, một chuỗi vai trò model (`session-entries.ts:33`). Bảng "Đính chính so với plan" của work item ghi "Mọi neo đo được trong sổ | XÁC NHẬN CHÍNH XÁC — toàn bộ", và các số dòng **đều đúng** — nhưng kết luận rút ra từ chúng ("đã có tiền lệ 'trong log, không trong model'") thì sai. **Số dòng đúng không cứu được một diễn giải sai.** Cơ chế thật là `isTranscriptEntry` (`session-context.ts:214`).
3. **Cổng `hasApprovalHandlers` (`wrapper.ts:323`) nuốt mất cả hai event.** Bản ghi đặt trên event thì rỗng trong phiên TUI thường. Xem bước 3.
4. **Lệnh audit phải đọc entry, không đọc message.** `loadSessionMessagesReadOnly` (`session-loader.ts:531`) lọc ra đúng những thứ bạn cần. Dùng `parseSessionEntries` (`:326`) hoặc `loadSessionFile` (`:353`).
5. **Sáu trong bảy tên test trong work item không tồn tại.** `bun test <đường/dẫn-không-có>` fail ngay. Hai cái sai chỗ: `approval-mode.test.ts` nằm ở `test/tools/`, không phải `test/`.
6. **`gate` — câu hỏi treo mà đã đối chiếu được.** Work item hỏi "union 4 giá trị `tui | acp | xdev | policy` có đúng không?". Đối chiếu với cây: `tui` → `wrapper.ts:351` `if (!this.runner.hasUI())` (`runner.ts:952` `hasUI()` là `this.#uiContext !== noOpUIContext`); `acp` → `wrapper.ts:305` `acpApprovedArgs` + `session/acp-permission-gate.ts:7` `PERMISSION_REQUIRED_TOOLS` + `session-tools.ts:930`; `xdev` → `wrapper.ts:302` `xdevApproved` + `internal-urls/xd-protocol.ts:107`; `policy` → `resolved.policy === "deny"` không hỏi ai. **Bốn giá trị phủ đúng các bề mặt có trong `wrapper.ts`.** Nhưng cảnh báo số 2 trong "Cần người xác nhận" vẫn đúng ở chỗ khác: `resolveApproval` còn được gọi từ `speculation/host.ts:135` và `cursor.ts:341/1012`, hai đường **không đi qua** `wrapper.ts` — nếu chúng cũng hỏi quyền thì `gate` sẽ không phân biệt được. **Đó là câu hỏi cần trả lời trước khi chốt union, không phải câu hỏi về số lượng giá trị.**
7. **`resolvedPolicy: string` nên là `ApprovalPolicy`.** `approval.ts:16` đã có `type ApprovalPolicy = "allow" | "deny" | "prompt"`, và `ResolvedApproval` (`approval.ts:85`) đã mang `policy`, `tier`, `reason`, `override`, `source`, `policyKey`. Phẳng xuống một chuỗi tự do là tự tạo lại đúng lớp lỗi mà M4 cấm.

---

## GAP-M4-14. Bảng feature → cơ chế: mỗi hành vi người dùng thấy phải trỏ tới đúng một file và đúng một cổng kiểm (sóng D)

**Sóng:** M4 Wave D — Khả năng nhìn thấy triage (`shippable: false`, chờ cổng changelog dùng chung của M4, plan §6.2/§6.3). Cùng đợt M4-9. Thêm một hàng bảng văn xuôi ở đây **không kéo theo quyết định release mới** — Wave D đã mang `shippable: false` và một quyết định changelog chung rồi.
**Effort:** S–M. **Rẻ hơn hẳn M4-DISCIPLINE-3** vì không phải đọc repo khác.
**Phụ thuộc:** Không chặn ai. Nên làm **sau M4-DISCIPLINE-3** vì họ cùng nói về chứng minh — nhưng DISCIPLINE-3 là về *quyết định* còn bảng này là về *hành vi*. Làm trước sẽ tạo **hai nguồn sự thật cạnh nhau**, đúng thứ M4 cấm.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `docs/feature-mechanism.md` | tạo | Bảng markdown, ba cột: `feature` (hành vi người dùng thấy) \| `mechanism` (**đường đẳng cả hai đường thật, không phải tên package**) \| `proof` (tên cổng kiểm đỏ được, hoặc chữ `none` + lý do). | có (file chưa tồn tại — không có file nào tên `feature-mechanism` trong `docs/`) |
| test kiểm bảng | tạo | Đỏ khi một hàng trỏ tới một file **đã bị xoá**. Đây là hợp đồng quan sát được, và nó là thứ khiến bảng đáng tin hơn một danh sách ước muốn. | có (xem bước 4) |
| 60+ file trong `docs/` | **không sửa** | **KHÔNG được gộp lại.** Không sửa bất kỳ file `.ts` nào. | có — xem hàng đính chính |

### Các bước

1. **Đo lại trước khi viết, và ghi cả con số vào item.** `find docs -name "*.md" | wc -l` → **134**, trong đó **82** ở cấp đầu thư mục; `ls docs/tools/ | wc -l` → **36**. omp có tài liệu rất đầy đủ nhưng tổ chức **THEO SUBSYSTEM**, và **không có artifact nào trả lời câu hỏi ngược lại**: `grep -rniE 'proof obligation|traceability|feature.*matrix|feature map' docs/` → đúng **1** hit không liên quan (`plugin-manager-installer-plumbing.md:108` nói về feature map của chính installer đó). Đây đúng là câu hỏi M4 tự đặt cho mình — *"thao tác này có thật sự xảy ra không?"* — nhưng không có chỗ nào ghi câu trả lời.

2. **Điều kiện thời điểm, nói thẳng: M4 là milestone cuối của chương trình.** Một bảng trả lời *"cơ chế nào làm hành vi này thật"* chỉ có giá trị khi đứng **sau** M1/M2/M3 đã đóng; đặt sớm thì nó **mô tả một thế giới chưa tồn tại** — đúng cái lý do GAP-M6-16 đã nêu.

3. **Bắt đầu từ CHÍNH bốn mục M4** vì chúng là bốn hàng mà milestone này tự tuyên bố — đó là **bằng chứng khả thi trước khi mở rộng**. Không chép file nào từ nguồn tham chiếu; bảng và đường dẫn viết mới.

4. **Điều khoản bắt buộc để bảng không thành nghi thức:** hàng `proof: none` phải kèm lý do, và **số hàng `none` là một con số được đăng ký trong kế hoạch chứ không được để tăng vô hạn** — vì một bảng toàn `none` thì **tệ hơn không có bảng**. Đó là cách một sổ kỷ luật chết.

5. **Nhánh phủ định bắt buộc:** một hàng trỏ tới một file **đã bị xoá** thì bảng đỏ. Đó là hợp đồng quan sát được, và nó là thứ khiến bảng đáng tin hơn một danh sách ước muốn.

6. **Hướng sửa khi phát hiện tài liệu sai:** **sửa TÀI LIỆU, không sửa bảng để khớp** — ngược hẳn với GAP-M4-10, ở đó bảng **sinh từ diff** nên bảng là chuẩn. Ở đây không có gì sinh ra bảng, nên khi tài liệu và cơ chế lệch nhau, tài liệu là thứ sai.

### Hình dạng code

Bảng, không phải mã. Bốn hàng mở đầu — bốn mục M4, theo đúng thứ tự kế hoạch dựng:

```markdown
<!-- docs/feature-mechanism.md -->

| feature | mechanism | proof |
| --- | --- | --- |
| Bật/tắt plugin trong `/settings` báo thật đã ghi lên đĩa hay chưa | `PluginManager.#mutateConfig` → `withFileLock` → `atomicWriteJson` | `plugin-runtime-config-lock.test.ts` |
| Panel `/settings` báo lớp nào đang che một dòng | `createSettingsHost` (`settings-ui.ts:77`) cưỡng chế qua `shadowingSource` dùng chung | `config/settings-provenance-guard.test.ts` |
| Renderer extension nhận `rawArgs` / `argsComplete` / `executionStarted` | `RegisteredToolAdapter.renderResult` forward nguyên `options` | `extensions/raw-args-render-channel.test.ts` (G1) |
| `omp extensions-triage` in ra mọi extension loader tìm thấy | phép chiếu thuần tuý trên `loadAllExtensions`, không suy diễn | `extensions-triage-cli.test.ts` |
```

Quy tắc viết cột `mechanism`, và nó là điều làm bảng có giá trị hoặc vô dùng: **đường đẳng cả hai đường thật, không phải tên package.** Một hàng ghi `capability` là một hàng vô nghĩa — `capability` là nơi code sống, không phải cơ chế làm hành vi đó thật. Cột `proof` chỉ nhận tên cổng kiểm **đỏ được**, hoặc chữ `none` kèm lý do.

### Hợp đồng test

Hợp đồng quan sát được, nêu tên lỗi người dùng thấy: hôm nay không có artifact nào trả lời được "cơ chế nào làm hành vi này thật", và bốn mục của M4 đều là hành vi người dùng thấy. Người đọc muốn biết cơ chế thì phải đọc tài liệu theo subsystem rồi tự đoán.

Hợp đồng của bảng là **tính bất biến của nó**, và nó có hai hàng:

1. **Phủ định bắt buộc:** một hàng trỏ tới một file **đã bị xoá** thì bảng đỏ. Đây là thứ khiến bảng đáng tin hơn một danh sách ước muốn, và nó là cổng duy nhất bảng này có.
2. **Có trần:** số hàng `proof: none` phải bằng con số đã đăng ký trong kế hoạch này. Vượt trần thì đỏ. Một bảng toàn `none` thì **tệ hơn không có bảng** — đó là cách một sổ kỷ luật chết, và nó phải chết bằng một cổng máy chạy được chứ không bằng một ý thức.

Hai hàng này cùng nhau là hợp đồng: hàng (1) bảo vệ tính **đúng**, hàng (2) bảo vệ tính **có giá trị**. Chỉ có (1) thì bảng đúng và vô dụng; chỉ có (2) thì bảng có giá trị và nói dối.

### Xác minh

```bash
# 0. TIỀN ĐỀ MÔI TRƯỜNG (đặt trước mọi lệnh `bun test`): addon chưa có thì mọi test
#    đỏ vì "Failed to load pi_natives native addon for darwin-arm64" — đỏ vì môi
#    trường, KHÔNG phải đỏ vì công việc.
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 1. Bảng tồn tại và có đủ bốn hàng mở đầu
grep -c '^| ' docs/feature-mechanism.md

# 2. Cổng phủ định
bun test packages/coding-agent/test/feature-mechanism-table.test.ts

# 3. Mốc đo — phải khớp con số ghi trong item
find docs -name "*.md" | wc -l
ls docs/tools/ | wc -l

# 4. Không sửa file .ts nào
git diff --name-only -- 'packages/**/*.ts'   # phải rỗng

# 5. Types + lint + format
bun run check:ts
```

Tuyệt đối không dùng `tsc`/`npx tsc` — dự án cấm, dùng `bun run check:ts`.

### Cổng hoàn thành

Mục này XONG khi tất cả đồng thời đúng:

0. **Tiền đề môi trường:** addon đã build, nếu không thì (2) ghi là "chưa chạy".
1. `docs/feature-mechanism.md` có bốn hàng mở đầu ứng với đúng bốn mục M4, và mỗi hàng có `mechanism` là **đường** chứ không phải tên package.
2. Cổng phủ định đã từng thấy đỏ: một hàng trỏ tới file đã xoá làm bảng đỏ.
3. Số hàng `proof: none` **bằng** con số đăng ký ở mục "Cần người quyết", và mỗi hàng `none` có lý do.
4. `git diff --name-only -- 'packages/**/*.ts'` **rỗng** — item này không sửa một dòng mã nào.
5. **Không file `docs/` hiện có nào bị gộp lại.**

**Cổng này có thực sự đỏ được không: có**, cả hai. (2) là điều không thể bịa: xoá một file mà một hàng trỏ tới, bảng phải đỏ. Nhưng cổng này **không** bắt được việc một hàng có **đúng** cơ chế hay không — đó là phần phải có người đọc, và nó là lý do cột `proof` được thiết kế để **đỏ được** thay vì chỉ "có vẻ đúng".

### Phụ thuộc

- **depends_on:** không có gì chặn. Thứ tự khuyến nghị: **sau M4-DISCIPLINE-3** (cùng nói về chứng minh, nhưng DISCIPLINE-3 là về *quyết định* còn bảng này là về *hành vi*; làm trước tạo hai nguồn sự thật cạnh nhau) và **sau M1/M2/M3 đã đóng**.
- **blocks:** không có. `blocks` rỗng.

### Cách sai dễ nhất

Để trần `none` trôi. Đó là cách một sổ kỷ luật chết: mỗi hàng mới thêm vào đều "chưa có cổng kiểm", con số tăng dần, và không ai để ý vì không có gì đỏ. Bảng vẫn còn, vẫn đúng về mặt kỹ thuật, và **không còn đáng tin** — tệ hơn không có bảng, vì nó trông như có.

Lối sai thứ hai: khi phát hiện tài liệu sai so với cơ chế, **sửa bảng cho khớp tài liệu**. Hướng đúng là ngược lại: sửa TÀI LIỆU. Ở đây không có gì sinh ra bảng — khác hẳn GAP-M4-10, ở đó bảng **sinh từ diff** nên bảng là chuẩn. Trộn hai hướng này là cách nhanh nhất để dựng hai nguồn sự thật.

Lối sai thứ ba, và nó là lý do item này **rẻ hơn hẳn** M4-DISCIPLINE-3: cố đọc repo khác để lấy mẫu. Không có mẫu nào để lấy — bảng này viết mới từ chính cây này.

### Cần người quyết

- **Con số trần của hàng `proof: none` là bao nhiêu?** Bốn hàng mở đầu đều có cổng kiểm thật, nên con số khởi điểm có thể là 0 — nhưng một bảng bốn hàng với trần 0 thì bảng sẽ chết ngay lần mở rộng đầu tiên. Đây là con số phải **đăng ký trong kế hoạch**, và nó là câu hỏi duy nhất chặn code. **Chưa có mặc định — cần bạn quyết.**
- **Ai giữ trần?** Một trần không có tên không phải trần, nó là ước muốn.
- **Bảng này có phải một deliverable của M4, hay của chương trình?** M4 là milestone cuối, và bảng chỉ có giá trị sau khi M1/M2/M3 đóng. Nếu nó thuộc M4 thì nó phải nằm trong quyết định release chung; nếu nó thuộc chương trình thì nó không được gói vào quyết định đó. Cần chốt trước khi mở PR, không phải sau.
- **Cột `proof` có nhận một tên script trong `scripts/` không?** Cổng của M4-4 đã dạy một bài: một cổng grep mà chưa từng thấy đỏ thì không phải cổng. Một hàng `proof` trỏ tới một lệnh chưa bao giờ chạy xanh là hàng đó không bảo vệ gì.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "60+ file trong `docs/`, 36 file `docs/tools/<name>.md`" | **ĐÚNG NHƯNG ĐÁNH GIÁ THẤP HƠN THẬT** | `find docs -name "*.md" \| wc -l` → **134**, trong đó **82** ở cấp đầu thư mục. `ls docs/tools/ \| wc -l` → **36**, con số này đúng nguyên văn. "60+" không sai (134 > 60) nhưng nó **understate hơn một nửa**, và điều đó quan trọng ở đúng item này: điều khoản bảo toàn lớn nhất của nó là **{con số} file `docs/` hiện có KHÔNG được gộp lại**, nên con số sai ở đây làm một điều khoản bảo toàn yếu đi. Bảng đính chính phải ghi 134. |
| Không có artifact nào trả lời câu hỏi ngược lại | **XÁC NHẬN CHÍNH XÁC** | `grep -rniE 'proof obligation\|traceability\|feature.*matrix\|feature map' docs/` → đúng **1** hit, `docs/plugin-manager-installer-plumbing.md:108`, và nó nói về feature map của chính installer đó. Không có gì cần sửa. |
| "Không sửa bất kỳ file `.ts` nào" | **XÁC NHẬN** | Cổng (4) của mục này là `git diff --name-only -- 'packages/**/*.ts'` phải rỗng. Đó là một cổng máy chạy được, và nó là hình dạng đúng cho một item mà bản chất là tài liệu. |

## Cần người xác nhận

1. **Con số 60+ file `docs/` bị đánh giá thấp hơn thật, và nó nằm trong một điều khoản bảo toàn.** 134, không phải 60+. Ở mọi mục khác của file này, một con số sai chỉ làm lời mô tả sai; ở đây nó làm **điều khoản "không gộp lại" yếu đi hơn một nửa**. Vì vậy mọi nơi trong item này nói "60+" đã được sửa thành 134.
2. **Đây là item duy nhất trong sáu mục không sửa một dòng mã nào, và đó là chủ ý — nhưng nó cũng là chỗ dễ nhận nhầm nhất khi review.** Một PR chỉ toàn markdown trông như công việc nhỏ. Cổng (4) tồn tại để chứng minh điều đó, và nó chỉ có nghĩa nếu ai đó thật sự chạy nó.


---

## GAP-M4-15. File cấu hình của nhà khác bị đọc một nửa: `hooks` trong `.claude/settings.json` biến mất không một lời (sóng D)

**Sóng:** M4 Wave D — Khả năng nhìn thấy triage (`shippable: false`, chờ cổng changelog dùng chung của M4, plan §6.2/§6.3). Cùng đợt M4-9, không chặn ai.
**Effort:** S — một hàm thuần + một dòng doctor. **Không chạm đường chạy hook nào**, nên không có bất biến hành vi nào phải bảo toàn ngoài ba điều dưới.
**Phụ thuộc:** **GAP-M1-18 là điều kiện tiên quyết tuyệt đối.** Đây là **chỗ duy nhất** để in ra, và GAP-M1-18 đã đóng danh sách check. Phải thêm một hàng vào danh sách đó **TRƯỚC khi code**, và theo GAP-D4 mọi check mới phải tự chứng minh bằng một test. **Thứ tự bắt buộc: GAP-M1-18 trước item này.**

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/discovery/claude.ts` | **không sửa** | `loadHooks()` **giữ nguyên hoàn toàn** — thư mục `hooks/{pre,post}/` vẫn là đường chính. | có — `async function loadHooks(ctx: LoadContext)` tại `:377`; hai chỗ ghép đường dẫn thư mục ở `:383` và `:389` |
| `packages/coding-agent/src/config/settings.ts` | **không mở rộng** | `assertKnownSettingPaths` **phải TIẾP TỤC chỉ bảo vệ lớp override của constructor** — đó là chính sách đúng (typo guard). **Mở rộng nó ra lớp file sẽ phá mọi file cấu hình của nhà khác.** | có — định nghĩa ở `:225`; lệnh gọi duy nhất từ bên ngoài là `:632`; `:231` là lệnh gọi đệ quy của chính nó |
| hàm thuần `droppedForeignKeys` | tạo | `droppedForeignKeys(file, knownSettingIds)` trả các key lạ đã bị **khởi đầu từ một file settings của nhà khác**. Chạy **SAU khi `projectLayerForMerge` đã lọc**, nếu không sẽ báo nhầm key đã bị chủ động loại. | có (hàm chưa có; `grep -rn "droppedForeignKeys" packages/` → 0 hit) |
| `omp doctor` (GAP-M1-18) | sửa | Một dòng in những key đó — *"file này có 3 key omp không hiểu, trong đó có `hooks`"*. Chỉ khi key lạ đó **là** `hooks` thì dòng cảnh báo nói rõ omp chỉ đọc `hooks/pre/` và `hooks/post/`. | có (`config/settings.ts:1020` là `addFile(path.join(projectCwd, ".claude", "settings.json"))` — tức file này **là** một lớp cấu hình thật) |

### Các bước

1. **Đo lại hiện trạng — và nó tệ hơn "im lặng".** omp đăng ký `.claude/settings.json` là **một LỚP CẤU HÌNH THẬT** (`config/settings.ts:1020` → `addFile(path.join(projectCwd, ".claude", "settings.json"))`), nên **mọi key omp biết trong file đó đều có hiệu lực**. Nhưng `hooks` thì không:
   - `discovery/claude.ts:377` `loadHooks()` chỉ đọc **THƯ MỤC** `hooks/pre/` và `hooks/post/`, không đọc key `hooks` trong file settings.
   - `grep '"hooks"'` trên `discovery/claude.ts` + `config/settings.ts` → **không có hit nào là consumer**.
   - **Tệ hơn im lặng:** `assertKnownSettingPaths` (`settings.ts:225`) **CHỈ** được gọi từ lớp `--config` của constructor, **không phải lớp file**. Nên một `hooks` hợp lệ trong `.claude/settings.json` **không ném lỗi mà bị bỏ qua im lặng**.

   Đây đúng là hình dạng vi phạm mà M4 đặt tên: **hệ thống trông như đã cấu hình, và không có gì thay đổi.**

2. **Ba việc, và ba việc này là TOÀN BỘ item:**
   1. Một hàm thuần `droppedForeignKeys(file, knownSettingIds)` trả các key lạ đã bị **khởi đầu từ một file settings của nhà khác**.
   2. Một dòng trong `omp doctor` (GAP-M1-18) in những key đó.
   3. Chỉ khi key lạ đó **là** `hooks` thì dòng cảnh báo nói rõ omp chỉ đọc `hooks/pre/` và `hooks/post/`.

3. **Ranh giới quan trọng, và đây là ranh giới.** **KHÔNG sửa `loadHooks`.** Nguồn tham chiếu đòi bridge **cả** `hooks.json` lẫn dialect Codex, và việc đó là **một quyết định sản phẩm lớn hơn nhiều** — một hook của Claude Code có thể chặn tool theo cách omp không diễn giải được. Sửa **đúng thứ nhỏ nhất mà vẫn đúng: báo cáo sự mất mát thay vì báo im lặng.**

4. **Ba điều được bảo toàn, cả ba đều là "đừng sửa cái đang đúng":**
   1. `loadHooks()` của `claude.ts` **giữ nguyên hoàn toàn** — thư mục `hooks/{pre,post}/` vẫn là đường chính.
   2. `assertKnownSettingPaths` **phải TIẾP TỤC chỉ bảo vệ lớp override của constructor**, vì đó là chính sách đúng (typo guard). **Mở rộng nó ra lớp file sẽ phá mọi file cấu hình của nhà khác** — khách hàng của omp viết `.claude/settings.json` với key mà omp không biết, và đó là bình thường.
   3. Kiểm kê phải chạy **SAU khi `projectLayerForMerge` đã lọc**, nếu không sẽ báo nhầm key đã bị chủ động loại.

5. **Chạy cổng** (khối Xác minh).

### Hình dạng code

```typescript
// packages/coding-agent/src/config/dropped-foreign-keys.ts
//
// WHY THIS EXISTS: .claude/settings.json is a real config LAYER in omp
// (config/settings.ts:1020), so every key omp knows in that file takes effect.
// But `hooks` is a key omp does not know, and nothing reports it. The result is
// the exact shape M4 names: the system looks configured, and nothing changed.
//
// Deliberately NOT a fix: loadHooks() keeps reading hooks/{pre,post}/ only.
// Bridging a real Claude Code hook into omp is a far larger product decision.

export interface DroppedForeignKey {
	/** The key as written in the foreign settings file. */
	readonly key: string;
	/** Which file it came from, for a message a human can act on. */
	readonly sourcePath: string;
	/** Optional, key-specific explanation. Required for `hooks`. */
	readonly note?: string;
}

/**
 * Keys present in a foreign settings file that omp does not know.
 *
 * MUST be called AFTER `projectLayerForMerge` has filtered — otherwise keys that
 * were deliberately dropped upstream get reported as silently ignored, which is
 * a different claim and a wrong one.
 */
export function droppedForeignKeys(
	file: Readonly<Record<string, unknown>>,
	knownSettingIds: ReadonlySet<string>,
): DroppedForeignKey[];
```

Dòng doctor, và **chỉ khi** key lạ đó là `hooks` thì mới nói rõ omp chỉ đọc gì:

```typescript
// ─ file .claude/settings.json có 3 key omp không hiểu: hooks, modelOverride, fooBar
//   key `hooks`: omp chỉ đọc thư mục hooks/pre/ và hooks/post/, không đọc key này
```

### Hợp đồng test

Hợp đồng quan sát được, nêu tên lỗi người dùng thấy: hôm nay, một người dùng viết `hooks` vào `.claude/settings.json`, không có lỗi nào hiện ra, và **không có hook nào chạy**. Sau item này, `omp doctor` nói ra điều đó.

Bốn hợp đồng, mỗi hợp đồng một nhánh:

1. **Phân biệt.** Một key lạ phải **không** ném lỗi — đây là hợp đồng phủ định của điều khoản bảo toàn (2), và nó là hợp đồng quan trọng nhất của item: khách hàng của omp viết `.claude/settings.json` với key mà omp không biết là **bình thường**.
2. **Đặc biệt hoá.** Chỉ khi key lạ đó **là** `hooks` thì dòng cảnh báo mới nói rõ omp chỉ đọc `hooks/pre/` và `hooks/post/`. Một key lạ bất kỳ khác chỉ được liệt kê, **không** được gán chú thích hook.
3. **Sau khi lọc.** Một key đã bị `projectLayerForMerge` loại chủ động thì **không** được báo. Đây là hàng âm quan trọng nhất: gọi hàm sai chỗ thì nó báo nhầm một key đã bị loại có chủ ý, tức báo cáo một hành vi không tồn tại.
4. **Đường chính còn nguyên.** `loadHooks()` không đổi: một `hooks/pre/` và `hooks/post/` trên cây fixture vẫn được nạp đúng như trước. Không có cái này thì item đã lấn sang một quyết định sản phẩm khác.

Theo GAP-D4, **mọi check mới phải tự chứng minh bằng một test** — hàng (1) và hàng (2) là hai check của cùng một dòng doctor, và cả hai phải có test riêng. Một dòng doctor không có test là một lời hứa bằng miệng.

### Xác minh

```bash
# 0. TIỀN ĐỀ MÔI TRƯỜNG (đặt trước mọi lệnh `bun test`): addon chưa có thì mọi test
#    đỏ vì "Failed to load pi_natives native addon for darwin-arm64" — đỏ vì môi
#    trường, KHÔNG phải đỏ vì công việc.
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 1. Kiểm kê key lạ
bun test packages/coding-agent/test/dropped-foreign-keys.test.ts

# 2. Check doctor mới — mỗi check một test, theo GAP-D4
bun test packages/coding-agent/test/doctor.test.ts

# 3. Đường chính phải giữ nguyên
bun test packages/coding-agent/test/discovery/hooks.test.ts packages/coding-agent/test/discovery/disabled-extensions.test.ts

# 4. Không hồi quy ở tầng settings
bun test packages/coding-agent/test/config/

# 5. Điều khoản bảo toàn: assertKnownSettingPaths vẫn CHỈ bảo vệ lớp override
sed -n '225,231p;632p' packages/coding-agent/src/config/settings.ts

# 6. Types + lint + format
bun run check:ts
bun run lint
```

Tuyệt đối không dùng `tsc`/`npx tsc` — dự án cấm, dùng `bun run check:ts`.

### Cổng hoàn thành

Mục này XONG khi tất cả đồng thời đúng:

0. **Tiền đề môi trường:** addon đã build, nếu không thì (1)-(3) ghi là "chưa chạy".
1. `dropped-foreign-keys.test.ts` qua, gồm hàng âm "key đã bị `projectLayerForMerge` loại thì không được báo".
2. Cả **hai** check của dòng doctor có test riêng, theo GAP-D4.
3. `loadHooks()` **không đổi** — một `hooks/pre/` và `hooks/post/` trên cây fixture vẫn nạp đúng như trước.
4. `assertKnownSettingPaths` **vẫn chỉ** được gọi từ lớp override của constructor.
5. GAP-M1-18 đã merge, và danh sách check của nó đã có hàng này **từ trước khi code**.

**Cổng này có thực sự đỏ được không: có**, và cổng quyết định là hàng âm (3) ở trong hợp đồng test — gọi `droppedForeignKeys` **trước** `projectLayerForMerge` thì một key đã bị loại chủ động sẽ bị báo, và hàng đỏ. Điều kiện (4) thì là một kiểm tra của con người — nó cố ý bảo vệ một hành vi **không đổi**, nên không có cách nào làm nó đỏ mà không phá hành vi đang đúng.

### Phụ thuộc

- **depends_on:** **GAP-M1-18 (`omp doctor`) là điều kiện tiên quyết tuyệt đối.** Đây là chỗ duy nhất để in ra, và GAP-M1-18 đã đóng danh sách check. Theo GAP-D4 phải thêm một hàng vào danh sách đó **TRƯỚC khi code**, và mọi check mới phải tự chứng minh bằng một test. **Thứ tự bắt buộc: GAP-M1-18 trước item này.**
- **blocks:** không có. `blocks` rỗng.

### Cách sai dễ nhất

Sửa `assertKnownSettingPaths` để nó cũng bảo vệ lớp file. Nhìn thì rất hợp lý — một key lạ trong `.claude/settings.json` thì chắc là typo — và nó **phá mọi file cấu hình của nhà khác**: khách hàng của omp viết `.claude/settings.json` với key mà omp không biết, và đó là bình thường. Đây là trường hợp mà "báo im lặng" đúng và "báo lỗi" sai. Lớp override của constructor là nơi duy nhất chính sách typo-guard có ý nghĩa, vì đó là lớp người dùng gõ cho chính omp.

Lối sai thứ hai, cùng loại, hấp dẫn hơn nữa: sửa `loadHooks` để bridge key `hooks` thành hook thật. Đó là thứ nguồn tham chiếu đòi, và nó là **một quyết định sản phẩm lớn hơn nhiều** — một hook của Claude Code có thể chặn tool theo cách omp không diễn giải được. Item này chỉ sửa đúng thứ nhỏ nhất mà vẫn đúng: **báo cáo sự mất mát thay vì báo im lặng.**

Lối sai thứ ba, kỹ thuật: gọi `droppedForeignKeys` sớm hơn `projectLayerForMerge`. Nó chạy, nó xanh, và nó báo những key đã bị loại **có chủ ý** — tức báo một hành vi không tồn tại. Đây là lý do hàng âm (3) là hàng quan trọng nhất chứ không phải hàng phụ.

### Cần người quyết

- **Danh sách check của `omp doctor` đã đóng chưa?** Đây là câu hỏi của GAP-D4, và nó chặn item này tuyệt đối. Nếu danh sách chưa chốt thì hàng này chưa được thêm vào — và thêm vào sau khi code là đúng cái bẫy mà GAP-D4 gọi tên.
- **`knownSettingIds` lấy từ đâu?** Hàm thuần cần nó, và nó phải là **một** nguồn. Nếu nó được dựng lại từ một vòng lặp riêng thì nó trở thành nguồn sự thật thứ hai — đúng thứ M4 cấm. Cần chốt lấy từ registry hiện có hay nơi nào khác.
- **Dòng doctor in ra bao nhiêu key?** Một file settings của nhà khác có thể có nhiều key lạ. In tất cả là nhiều; in một dòng tóm tắt rồi kể tên `hooks` riêng là ít. Cần chốt trước khi viết help string.
- **Có cần một cờ tắt không?** Người dùng viết `.claude/settings.json` với key mà omp không biết là bình thường, nên dòng này sẽ xuất hiện với **nhiều người không sai gì cả**. Cần chốt xem có phải dòng "thông tin" thuần hay một cảnh báo.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "`assertKnownSettingPaths` **CHỈ** được gọi từ `#overrideLayer` (dòng 632)" | **ĐÚNG VỀ KẾT LUẬN — nhưng grep cho BA hit, không phải một** | `grep -n "assertKnownSettingPaths"` cho ba dòng: `:225` là **định nghĩa hàm**, `:231` là **lệnh gọi đệ quy của chính nó** khi đi xuống object con, và `:632` là lệnh gọi duy nhất **từ bên ngoài**. Tức "chỉ bảo vệ lớp override" là **đúng tuyệt đối**, nhưng ai chạy lệnh grep thấy ba hit sẽ tưởng đó là ba call site. Ghi rõ phân biệt này vào item, vì cổng (4) của mục này chính là lệnh grep đó. Bằng chứng: `grep -n "assertKnownSettingPaths" packages/coding-agent/src/config/settings.ts`. |
| `grep '"hooks"'` trên `discovery/claude.ts` + `config/settings.ts` → "không có hit nào là consumer" | **ĐÚNG — nhưng lệnh không rỗng** | Lệnh trả **hai** hit: `claude.ts:383` (`path.join(projectBase, "hooks")`) và `claude.ts:389` (`path.join(userBase, "hooks")`). Cả hai là **nối thư mục**, không phải consumer của key `hooks` trong file settings — nên kết luận của sổ là đúng, và cách diễn đạt "không có hit nào là consumer" chính xác vì nó đã nói **consumer**, không phải "không hit". Giữ nguyên cách nói này khi viết test, và đừng biến nó thành một cổng `grep -c '"hooks"' == 0` — cổng đó **đỏ vĩnh viễn** với một bản làm đúng. |
| `.claude/settings.json` là một lớp cấu hình thật, và `loadHooks()` chỉ đọc thư mục | **XÁC NHẬN CHÍNH XÁC** | `config/settings.ts:1020` đúng nguyên văn là `addFile(path.join(projectCwd, ".claude", "settings.json"));`, ngay dưới hai lệnh `addFile` cho `config.yml` và `settings.json` của thư mục project. `loadHooks` khai ở `discovery/claude.ts:377`. Tức "mọi key omp biết trong file đó đều có hiệu lực" là đúng, và đó là chính làm cho `hooks` thành một lỗ hổng im lặng chứ không phải một chi tiết. |

## Cần người xác nhận

1. **M4-9 đã mở đúng đường `cli-commands.ts` cho một lệnh chỉ-đọc, và bảng cổng của nó tự ghi nhận một điểm mù.** Điểm mù đó là: lệnh có thật sự được đăng ký hay không — thiếu một mục registry làm `omp extensions-triage` rơi xuống `runCli` và chuyển argv cho LLM như một prompt (hồi quy #1496), và **không test nào bắt được**. Thêm **một báo cáo chỉ-đọc thứ hai ở CÙNG sóng** biến điểm mù đó thành **hai điểm mù cùng một nguyên nhân**. Đây là lý do thứ tự M4-9 và item này cùng sóng, chứ không phải vì chúng giống nhau.
2. **GAP-M1-18 đã đóng danh sách check chưa, và câu đó chặn item này tuyệt đối.** Không phải vì dòng doctor khó viết — mà vì theo GAP-D4, một check mới thêm sau khi danh sách đã đóng là một check không tự chứng minh được. Nếu bạn muốn hàng này vào `omp doctor`, nó phải vào **danh sách** trước, không phải vào **doctor** sau.



### Phiếu triển khai — đã kiểm trên cây 2026-09-29

**Cảnh báo tên work item — đọc trước khi gõ bất cứ dòng nào.** Lệnh giao việc gọi work item này là **`M4-15. Sổ ngưỡng hiệu năng có phân loại bằng chứng`**. Tên đó **không tồn tại trong kế hoạch M4**, và nó thuộc về một milestone khác: `grep -n "ngưỡng hiệu năng\|phân loại bằng chứng\|Sổ ngưỡng" MILESTONE_4_EXECUTION_PLAN.md` → **0 hit**, còn `grep -rn "Sổ ngưỡng hiệu năng có phân loại bằng chứng" .` → chỉ khớp `MILESTONE_6_EXECUTION_PLAN.md` và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`. Cái tên đó là **`GAP-M6-13`** (`perf-threshold.ledger.ts` + `EvidenceClass`) của kế hoạch M6. Trong kế hoạch M4 chỉ có **mười** work item, và **mục số 15 duy nhất là `GAP-M4-15`**. → Phiếu này viết cho **`GAP-M4-15`**. Nếu bạn thực sự muốn `GAP-M6-13`, dừng lại: nó là việc khác hoàn toàn (ngưỡng benchmark, không liên quan `.claude/settings.json`).

**Cảnh báo neo.** Mục này có **một điều kiện tiên quyết chặn tuyệt đối** và **hai đường dẫn test sai trong khối Xác minh**. Số dòng cũ trong kế hoạch giữ nguyên theo luật bất di bất dịch:

1. **`GAP-M1-18` phải merge trước, và hàng này phải vào *danh sách* trước khi vào *doctor*.** Đo hôm nay: `grep -c "GAP-M1-18" MILESTONE_1_EXECUTION_PLAN.md` → **8** (không phải 0 như kế hoạch M4 ghi ở dòng 354 — sổ M4 đã cũ ở chỗ đó, xem cảnh báo 4 bên dưới). `grep -n "runDoctorChecks\|formatDoctorResults" packages/ -r` cho đúng hai dòng: `packages/coding-agent/src/extensibility/plugins/doctor.ts:5` và `:43`. `grep -c 'name: "doctor"' packages/coding-agent/src/cli-commands.ts` → **0**. → **`omp doctor` chưa tồn tại; `runDoctorChecks` vẫn là code chết.** `GAP-M1-18` là `W18` của `MILESTONE_1_EXECUTION_PLAN.md:3730`, Wave 8, và nó tự nói *"Danh sách đã chốt trong sổ"*. **Danh sách 7 check đó KHÔNG có hàng này.** Thêm vào *doctor* mà không thêm vào *danh sách* đúng là cái bẫy `GAP-D4` gọi tên. **Hàng này là lý do mục này phải chờ.**
2. **`packages/coding-agent/test/doctor.test.ts` (Xác minh, bước 2) — không tồn tại, và sai cả hình dạng.** M1 W18 chỉ định `packages/coding-agent/test/doctor/doctor.test.ts` (**có thư mục**), và lệnh cổng của W18 là `bun test packages/coding-agent/test/doctor/`. Hôm nay `ls -d packages/coding-agent/test/doctor` → **No such file or directory**. → **Dùng đường dẫn của W18.**
3. **`packages/coding-agent/test/discovery/hooks.test.ts` (Xác minh, bước 3) — không tồn tại.** `test/discovery/` có **27 file**, không file nào tên `hooks`. `find packages/coding-agent/test -name "*hook*test*.ts"` trả về: `agent-session-user-shortcut-hooks.test.ts`, `agent-session-plan-compact-hook-instructions.test.ts`, `hook-editor.test.ts`, `compaction-hooks.test.ts`, `hook-tool-wrapper-input.test.ts`. Và `grep -c "hooks" packages/coding-agent/test/discovery/disabled-extensions.test.ts` → **0**. Cả hai đều **vô dụng cho mục đích nêu** — file thứ nhất không tồn tại, file thứ hai **không chứa chữ `hooks`**. Lệnh ấy hôm nay không bắt được gì. **Và đây là phát hiện đáng kể: hiện KHÔNG có test nào phủ `loadHooks` của `claude.ts`.** `loadHooks` chỉ được tham chiếu ở `discovery/*.ts` (định nghĩa + đăng ký loader), không test nào. → Case "đường chính còn nguyên" **phải viết mới**, không phải "chạy lại cho xanh".
4. **Kế hoạch M4 tự mâu thuẫn về `GAP-M1-18`.** `MILESTONE_4_EXECUTION_PLAN.md:354` ghi `grep -n "GAP-M1-18\|omp doctor" MILESTONE_1_EXECUTION_PLAN.md` → **0 hit**, `CHƯA CÓ`. Lệnh đó hôm nay → **8 hit**, mục `W18` tại `MILESTONE_1_EXECUTION_PLAN.md:3730`. Sự thực vẫn là "chưa merge" (0 dòng trong `cli-commands.ts`, `runDoctorChecks` 1 hit), nên **điều kiện tiên quyết vẫn đúng — chỉ cơ sở dẫn là cũ.** Đừng báo cáo "chưa tồn tại" cho người đọc — hãy báo **"đã lên sổ M1, Wave 8, chưa merge"**.
5. **`config/settings.ts:1020` — đúng nguyên văn, SAI NGHĨA.** Nội dung thật: `		addFile(path.join(projectCwd, ".claude", "settings.json"));` — dòng này nằm trong **`#configWatchTargets()`** (định nghĩa ở `:993`, thân hàm kết thúc ở `:1023` với `return targets;`; được gọi đúng một chỗ, từ `#syncFileWatchers()` tại `:1032`), tức nó đăng ký **mục tiêu `fs.watch`**, không đăng ký lớp cấu hình. Nó chứng minh file **được theo dõi**, không chứng minh file **được parse thành lớp**. Bằng chứng thật cho "là một lớp cấu hình thật" là `settings.ts:2177` + `:2198-2199` (`loadCapability(settingsCapability.id, { cwd: discoveryCwd })` → `merged = this.#deepMerge(merged, dropSettingsGroupShadows(item.data as RawSettings, item.path));` → `sourcePaths.push(item.path);`), cộng `discovery/helpers.ts:1107`. **Kết luận của kế hoạch vẫn đúng; dẫn chứng thì không.** Đây cũng là mục *Đính chính* thứ ba trong kế hoạch — nó khẳng định "XÁC NHẬN CHÍNH XÁC", và phần đúng là phần *kết luận*, không phải phần *neo*.
6. **Hàng âm (case 3) thiếu MỘT bộ lọc.** Kế hoạch nói "sau khi `projectLayerForMerge` đã lọc". Thật là sau **cả hai** `projectLayerForMerge` (`:236`) **và** `dropSettingsGroupShadows` (`:293`) — xem cạm bẫy 3.
7. **`DoctorCheck` shape chưa ổn định.** `packages/coding-agent/src/extensibility/plugins/types.ts:169-178` hôm nay là `export interface DoctorCheck { name: string; status: "ok" \| "warning" \| "error"; message: string; fixed?: boolean; }`; W18 đang nhắm `{ severity, name, detail, remedy }` và **tự ghi `severity` CHƯA chốt** ("Tập giá trị của `severity` **CHƯA chốt** … Đừng tự chọn rồi coi như đã chốt"). **Khối "Hình dạng code" của kế hoạch phải chờ.**
8. **Ví dụ trong kế hoạch dùng id không tồn tại.** `modelOverride` / `fooBar` trong dòng doctor mẫu: `grep -rn 'id: "modelOverride"' packages/coding-agent/src/config/registry.ts` → **0 hit**. Là ví dụ minh hoạ; **đừng đưa vào test.**
9. **`hooks` không phải setting đã đăng ký** — `grep -rn 'id: "hooks"' packages/coding-agent/src/config/registry.ts` → **0 hit**. Và `dropSettingsGroupShadows` tự nói trong docstring rằng *"unknown keys … pass through unchanged"* — nên `hooks` đi thẳng qua, không cảnh báo, không lỗi. **Lỗ hổng là thật.**
10. **Tiền đề môi trường đã thoả, khối Xác minh bước 0 thừa.** `which ninja` → `/opt/homebrew/bin/ninja`; `find packages/natives -name "*.node" -not -path "*/node_modules/*"` → `packages/natives/native/pi_natives.darwin-arm64.node`; `bun test packages/coding-agent/test/config/settings-registry.test.ts` → **18 pass / 0 fail**. Giữ khối đó (máy khác vẫn cần), nhưng **đừng ghi là "chưa chạy được vì addon"** khi đánh giá mục này.

**Các neo ĐÚNG (dùng nguyên trạng):** `discovery/claude.ts:377` `async function loadHooks(ctx: LoadContext): Promise<LoadResult<Hook>> {`; `:383` `const projectHooksDir = path.join(projectBase, "hooks");`; `:389` `const userHooksDir = path.join(userBase, "hooks");`; `config/settings.ts:225` `function assertKnownSettingPaths(layer: RawSettings, prefix = ""): void {`; `:231` `assertKnownSettingPaths(value, id);` (lệnh gọi **đệ quy**); `:632` `assertKnownSettingPaths(layer);` (**lệnh gọi duy nhất từ bên ngoài**, trong `#overrideLayer`); `grep -n "assertKnownSettingPaths"` → đúng **3** hit: 225, 231, 632; `grep -n '"hooks"'` trên `claude.ts` + `settings.ts` → đúng **2** hit: `:383`, `:389` — **cả hai là nối thư mục, không phải consumer**; `config/registry.ts:800` `export function all(): readonly AnySetting[] {` (trả `ordered`); `:795` `export function lookup(id: string): AnySetting | undefined {`; `settings.ts:43` `	all as allSettings,`; `settings.ts:236` `function projectLayerForMerge(project: RawSettings): RawSettings {`; `settings.ts:293` `export function dropSettingsGroupShadows(data: RawSettings, sourcePath: string, basePrefix = ""): RawSettings {`; `discovery/helpers.ts:1107` `candidates.push(path.join(dir, ".claude", "settings.json"), path.join(dir, ".claude", "settings.local.json"));` — **HAI file**; `packages/utils/src/type-guards.ts:1` `export function isRecord(value: unknown): value is Record<string, unknown> {`; `config/settings.ts:65` `export interface RawSettings {` (`[key: string]: unknown`); `package.json:90` `"check:ts"` và `:93` `"lint"`; `grep -rn "droppedForeignKeys" packages/` → **0 hit**; `src/config/dropped-foreign-keys.ts` **không tồn tại**.

**Bảng điểm sửa**

| # | đường/dẫn | symbol | TRƯỚC (nguyên văn từ file thật) | SAU (hình dạng sau khi sửa) |
|---|---|---|---|---|
| S1 | `packages/coding-agent/src/config/dropped-foreign-keys.ts` | `droppedForeignKeys` + `DroppedForeignKey` | **file không tồn tại** — `ls: …: No such file or directory` | file mới, export `interface DroppedForeignKey` + `export function droppedForeignKeys(file: Readonly<Record<string, unknown>>, knownSettingIds: ReadonlySet<string>): DroppedForeignKey[]` |
| S2 | `packages/coding-agent/src/config/settings.ts:293` | `dropSettingsGroupShadows` | `export function dropSettingsGroupShadows(data: RawSettings, sourcePath: string, basePrefix = ""): RawSettings {` | **không đổi dòng nào**, nhưng `droppedForeignKeys` **phải tôn trọng** nó: một key đã bản này `continue` loại thì không được báo |
| S3 | `packages/coding-agent/src/config/settings.ts:236` | `projectLayerForMerge` | `function projectLayerForMerge(project: RawSettings): RawSettings {` | **không đổi dòng nào**; đây là bộ lọc thứ hai mà hàng âm của test phải trượt qua |
| S4 | `packages/coding-agent/src/config/registry.ts:800` | `all` (import vào `settings.ts:43` với tên `allSettings`) | `export function all(): readonly AnySetting[] {`<br>`	return ordered;` | **không đổi**. Chỉ dùng làm nguồn: `knownSettingIds = new Set(allSettings().map(s => s.id))` |
| S5 | `packages/coding-agent/src/config/settings.ts:225/231/632` | `assertKnownSettingPaths` | `:225` `function assertKnownSettingPaths(layer: RawSettings, prefix = ""): void {`<br>`:231` `		assertKnownSettingPaths(value, id);`<br>`:632` `		assertKnownSettingPaths(layer);` | **không đổi dòng nào**. Đây là hành vi được bảo toàn tuyệt đối |
| S6 | `packages/coding-agent/src/discovery/claude.ts:377/383/389` | `loadHooks` | `:377` `async function loadHooks(ctx: LoadContext): Promise<LoadResult<Hook>> {`<br>`:383` `	const projectHooksDir = path.join(projectBase, "hooks");`<br>`:389` `		const userHooksDir = path.join(userBase, "hooks");` | **không đổi dòng nào**. `hooks/pre/`, `hooks/post/` vẫn là đường chính |
| S7 | `packages/coding-agent/src/extensibility/plugins/doctor.ts:5` | `runDoctorChecks` | `export async function runDoctorChecks(): Promise<DoctorCheck[]> {`<br>caller count: `grep -rn "runDoctorChecks" packages/` → **1 hit**, chính dòng định nghĩa | thêm **một** check mới vào bảng registry, theo shape mà W18 chốt. **Chỉ làm được sau khi W18 merge** |
| S8 | `packages/coding-agent/test/dropped-foreign-keys.test.ts` | — | **không tồn tại** | file mới, 4 case (xem *Hợp đồng test*) |
| S9 | `packages/coding-agent/test/doctor/…` | — | `ls -d packages/coding-agent/test/doctor` → **No such file or directory** | hàng check `hooks` được test trong đúng thư mục W18 tạo ra, **không** phải `test/doctor.test.ts` như kế hoạch ghi |

**Các bước có neo đã kiểm** (số dòng dưới đây là số thật đã mở và đọc)

1. **Trước khi gõ dòng đầu tiên — hai việc bắt buộc, theo đúng thứ tự.**
   **(a) Chặn tuyệt đối: `GAP-M1-18` phải merge trước, và hàng này phải vào *danh sách* trước khi vào *doctor*.** Xem cạnh bẫy 4.
   **(b) Chốt shape của `DoctorCheck` — không làm được nếu chưa biết dòng in ra hình dạng gì.** Hôm nay `DoctorCheck` **đang** là `{name, status, message, fixed?}` (`types.ts:169`); W18 đang nhắm tới `{ severity, name, detail, remedy }` và tự ghi trong khối code rằng tập giá trị của `severity` **CHƯA chốt**. Hệ quả trực tiếp: khối "Hình dạng code" trong kế hoạch (dòng mẫu kiểu `// ─ file .claude/settings.json có 3 key omp không hiểu: hooks, modelOverride, fooBar`) **không thể viết final** cho tới khi W18 chốt `severity`. **Đừng khắc chuỗi đó vào test — hãy assert theo shape W18 chốt.**
2. **Viết hàm thuần.** Tạo `packages/coding-agent/src/config/dropped-foreign-keys.ts`. **Trả lời dứt khoát câu "`knownSettingIds` lấy từ đâu?"** (mục *Cần người quyết* của kế hoạch) — có một câu trả lời đúng duy nhất, và nó đã có sẵn: dùng `allSettings().map(s => s.id)` với `settings.ts:43` `	all as allSettings,` và `registry.ts:800`. **Không** dựng set riêng từ một vòng lặp mới — `assertKnownSettingPaths` (`:225`) đã dùng đúng registry này qua `lookupSetting(id)`, và một nguồn sự thật thứ hai đúng là thứ M4 cấm. Dùng lại `isRecord` từ `@oh-my-pi/pi-utils` (`packages/utils/src/type-guards.ts:1`) chứ không tự viết lại; kiểu `RawSettings` (`settings.ts:65`) là `{ [key: string]: unknown }` — tương thích với tham số `Readonly<Record<string, unknown>>`. **Đệ quy theo cùng cách `assertKnownSettingPaths` đệ quy** (`:226-232`): đi từng key, `id = prefix ? `${prefix}.${key}` : key`, nếu `knownSettingIds.has(id)` thì bỏ qua cả nhánh; nếu value là object thì đệ quy; nếu value là lá **và** id không biết → đẩy vào kết quả. **Dừng đi tại lá, không đẩy lồng nhau** — một lỗi gõ ở `a.b.c` phải ra **một** dòng, không ba.
3. **Xác nhận lỗ hổng là thật, bằng lệnh chạy được.** `hooks` **không** phải setting đã đăng ký (0 hit). Và `dropSettingsGroupShadows` tự nói trong docstring rằng *"unknown keys … pass through unchanged"*. Đường đọc thật: `settings.ts:2177` `const result = await loadCapability(settingsCapability.id, { cwd: discoveryCwd });`, rồi `:2198` `merged = this.#deepMerge(merged, dropSettingsGroupShadows(item.data as RawSettings, item.path));` và `:2199` `sourcePaths.push(item.path);`. Ứng viên đường dẫn, `packages/coding-agent/src/discovery/helpers.ts:1107`: `candidates.push(path.join(dir, ".claude", "settings.json"), path.join(dir, ".claude", "settings.local.json"));`. **Hai file, không chỉ một. Dòng doctor phải phủ CẢ HAI** — hoặc nói rõ là chỉ phủ `settings.json` và im về `settings.local.json`, chứ đừng âm thầm bỏ sót.
4. **Ràng buộc "chạy SAU khi đã lọc" — kế hoạch nói thiếu một nửa.** Kiểm kê phải chạy sau `projectLayerForMerge` (`:236`, chỉ lọc `modelRoles`, chạy lúc **merge** `:3625`) — **và** sau `dropSettingsGroupShadows` (`:293`, lọc **giá trị không phải object đè lên một settings group**, `logger.warn` rồi `continue`; nó là bộ lọc chạy **trên đúng file settings của nhà khác** mà mục này đang kiểm kê). → **Hàng âm của test phải trượt qua CẢ HAI.** Một hàm chỉ trượt `projectLayerForMerge` vẫn sẽ báo nhầm key `tui: "fullscreen"` đã bị drop có chủ ý.
5. **Đọc file trong doctor mà không phá ranh giới tầng.** Kế hoạch nói `.claude/settings.json` "là một lớp cấu hình thật" và dẫn chứng `settings.ts:1020`. **Dẫn chứng đó không đúng nghĩa** (xem cảnh báo neo 5). Cách đúng để lấy nội dung thô: (1) dùng `Settings` hiện có để biết **file nào thực sự được nạp** (`getProvenance` trả `"project"` ⟹ key đó đến từ file settings của nhà khác; xem `settings.ts:800-808`); (2) đọc thô bằng `Bun.file(...).text()` + `Bun.JSON5.parse()` trong try/catch với `isEnoent` từ `@oh-my-pi/pi-utils` — **tuyệt đối không dùng `readFileSync`/`existsSync`** (AGENTS.md, mục *File I/O*); (3) **không** thêm một `Settings` instance thứ hai chỉ để lấy dữ liệu — đó là nguồn sự thật thứ hai.
6. **Dòng doctor.** Đúng ba hành động, và ba hành động đó là **toàn bộ** mục này: (1) một dòng liệt kê key lạ của từng file; (2) **chỉ khi** key lạ **là** `hooks` thì mới kèm chú thích rằng omp chỉ đọc `hooks/pre/` và `hooks/post/`; (3) một key lạ bất kỳ khác **không** được gán chú thích hook. Ba câu hỏi còn mở và cách chốt mặc định an toàn (chốt trước khi viết help string): **in bao nhiêu key?** → cắt ở **5**, rồi `… và N key khác` (một file của nhà khác có thể có 40 key; in hết là spam). **Cờ tắt không?** → **không**; đây là dòng *thông tin*, `severity` info/warning, không phải lỗi — khách hàng omp viết key lạ vào `.claude/settings.json` là chuyện bình thường, nếu nó làm đỏ thì người ta tắt cả `doctor`. **`modelOverride` / `fooBar`?** → **đó là ví dụ minh hoạ, không phải id thật** (0 hit trong registry); đừng hard-code hai tên đó vào test.
7. **Chạy cổng** (mục *Cổng*).

**Hợp đồng test**

**`packages/coding-agent/test/dropped-foreign-keys.test.ts` (mới):**

| case | khẳng định | người dùng thấy gì nếu hồi quy |
|---|---|---|
| **(1) Phân biệt** | key lạ trong file cấu hình **không** ném lỗi; `Settings` vẫn khởi tạo và `get()` vẫn trả giá trị hợp lệ | ông viết `permissions: {...}` vào `.claude/settings.json`; omp báo "Unknown setting" và **không khởi động**. **Đây là hồi quy nặng nhất của mục này** |
| **(2) Đặc biệt hoá** | key lạ `hooks` → có `note`; key lạ `permissions` → **không** có `note` (assert phủ định, không phải "không rỗng") | mọi key lạ đều bị gán chú thích giống nhau → dòng đầy misinformation, tệ hơn im lặng |
| **(3) Sau khi lọc — hàng âm** | key đã bị `projectLayerForMerge` loại → không báo; **và** key đã bị `dropSettingsGroupShadows` loại → không báo. **Hai assertion, một test hoặc hai test — nhưng phải có CẢ HAI** | doctor báo `tui: "fullscreen"` bị "bỏ qua" trong khi `settings.ts:303` **đã** `logger.warn` rồi `continue` → báo cáo một hành vi không tồn tại |
| **(4) Đường chính còn nguyên** | xem bên dưới | nếu mục này lấn sang quyết định sản phẩm khác, không có test nào bắt |

Case (1) là **hợp đồng phủ định** của điều khoản bảo toàn, và là hợp đồng quan trọng nhất của mục này. Theo AGENTS.md đây là dạng "precedence or negative contract" — hợp lệ, nhưng phải có **consumer contract** đi kèm: khẳng định `Settings` **khởi tạo được** và **không** throw, chứ không phải "hàm không ném".

**Test cho dòng doctor.** Theo `GAP-D4`, **mỗi check mới phải tự chứng minh bằng một test**. Kế hoạch yêu cầu đúng hai (case 1 và case 2). Thêm vào **đúng thư mục W18 tạo**: `packages/coding-agent/test/doctor/doctor.test.ts` (**đường dẫn kế hoạch ghi sai** — nó chạy `bun test packages/coding-agent/test/doctor.test.ts`; M1 W18 chỉ định thư mục `test/doctor/`, và lệnh cổng của W18 là `bun test packages/coding-agent/test/doctor/`; hôm nay **cả hai** đều không tồn tại). Hai test: `hooks` trong `.claude/settings.json` → output **có** chứa `hooks` **và** chứa `hooks/pre/` + `hooks/post/`; `permissions` trong `.claude/settings.json` → output **có** chứa `permissions`, và assert **không** chứa `hooks/pre/` (nếu không có assertion phủ định này, case (2) xanh với một bản làm gộp cả hai).

**Test "đường chính còn nguyên" — kế hoạch trỏ vào file không tồn tại.** `bun test packages/coding-agent/test/discovery/hooks.test.ts packages/coding-agent/test/discovery/disabled-extensions.test.ts` — file thứ nhất không tồn tại, file thứ hai **không chứa chữ `hooks`** (0 hit). Lệnh hôm nay không bắt được gì. Và **hiện không có test nào phủ `loadHooks` của `claude.ts`** → case (4) **không có hạ tầng, bạn phải viết mới**, không phải "chạy lại cho xanh". Fixture: cây tạm có `hooks/pre/x.sh` và `hooks/post/y.sh`, chạy discovery, assert hai hook nạp đúng `type`/`level`. Dùng `TempDir` từ `@oh-my-pi/pi-utils` (đúng như `test/config/settings-registry.test.ts:8` đang làm), và `afterEach` dọn — test phải an toàn toàn suite.

**Cổng có đỏ được không — CÓ, nhưng chỉ một nửa, và nửa đó phải nói thẳng.**

| điều kiện cổng | đỏ được? | bằng cách nào / tại sao không |
|---|---|---|
| case (3) — key đã bị lọc không được báo | **CÓ, đỏ thật** | gọi `droppedForeignKeys` **trên `item.data` thô** thay vì trên dữ liệu đã qua `dropSettingsGroupShadows`/`projectLayerForMerge` → key `tui: "fullscreen"` bị báo → hàng âm đỏ. **Đây là cổng quyết định** |
| case (2) — chỉ `hooks` mới có note | **CÓ, đỏ thật** | gộp chú thích vào mọi key lạ → assert phủ định đỏ |
| case (1) — key lạ không ném lỗi | **CÓ, đỏ thật** | sửa `assertKnownSettingPaths` (`:225`) để chạy trên lớp file → `Settings` throw → test đỏ |
| cổng (4): `assertKnownSettingPaths` vẫn chỉ ở lớp override | **KHÔNG** | đây là bảo toàn hành vi **không đổi**. Không có cách nào làm nó đỏ mà không phá hành vi đang đúng. Kế hoạch đã thừa nhận điều này — giữ nguyên như vậy |
| cổng (5): `GAP-M1-18` merge + hàng vào danh sách trước code | **KHÔNG tự đỏ được** | đây là kiểm tra của con người, không có lệnh nào bắt. **Nếu bạn bỏ nó, mục này vẫn xanh toàn bộ** — đó là lỗ hổng thật của cổng này |
| `bun run check:ts` | **Xanh vô nghĩa ở đây** | nó không chạy một khẳng định nào; với case (3) nó bỏ lọt đúng lỗi gọi sai chỗ. **Đừng ghi mục là xong dựa vào nó** |

**Kết luận thẳng:** cổng này có **3 điều kiện tự đỏ thật** trên 6. Ba điều kiện còn lại — **đặc biệt (5), chính là điều kiện tiên quyết tuyệt đối của mục này** — là kiểm tra của con người và sẽ xanh dù bạn bỏ qua.

**Viết lại cho đỏ được, đề xuất của phiếu này:** thêm một test chốt danh sách, kiểu "mọi check trong bảng registry của doctor phải có **một** test tên đúng `it("<tên check> …")` trong `test/doctor/`". Như vậy thêm một check mà không thêm test ⟹ đỏ. Đó là cách biến `GAP-D4` từ quy tắc review thành assertion — và nó là câu trả lời cho câu hỏi mà W18 tự nói là "không tự kiểm được".

**Cổng, đúng thứ tự (đường dẫn đã sửa):**
```bash
# 0. Tiền đề môi trường — ĐÃ THOẢ SẴN
which ninja                       # /opt/homebrew/bin/ninja
ls packages/natives/native/pi_natives.darwin-arm64.node   # tồn tại

# 1. Kiểm kê key lạ (file mới)
bun test packages/coding-agent/test/dropped-foreign-keys.test.ts

# 2. Dòng doctor — ĐƯỜNG DẪN ĐÃ SỬA
bun test packages/coding-agent/test/doctor/

# 3. Đường chính — PHẢI VIẾT MỚI
bun test packages/coding-agent/test/discovery/<tên-bạn-chọn>.test.ts

# 4. Không hồi quy ở tầng settings
bun test packages/coding-agent/test/config/

# 5. Điều khoản bảo toàn: assertKnownSettingPaths vẫn CHỈ ở lớp override
sed -n '225,231p;632p' packages/coding-agent/src/config/settings.ts   # in 8 dòng
grep -n "assertKnownSettingPaths" packages/coding-agent/src/config/settings.ts
#    kỳ vọng grep: ĐÚNG 3 hit — 225 (định nghĩa), 231 (đệ quy), 632 (lớp override)

# 6. Types + lint
bun run check:ts      # package.json:90
bun run lint          # package.json:93
```
Đã xác nhận `check:ts` (`bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`) và `lint` (`bun run --parallel lint:ts lint:rs`) đều tồn tại. **Tuyệt đối không `tsc` / `npx tsc`.**

Đã chạy thật để biết cổng có sống không: `bun test packages/coding-agent/test/config/settings-registry.test.ts` → **18 pass / 0 fail**. `sed -n '225,231p;632p'` in **8** dòng (225–231 cộng 632) — đó là số dòng *in ra*, không phải số *call site*. Call site thật kiểm bằng `grep -n "assertKnownSettingPaths"`, phải ra **đúng 3**.

**Cạm bẫy riêng của mục này**

1. **Cái dễ làm sai nhất: sửa `assertKnownSettingPaths` để nó bảo vệ cả lớp file.** Nhìn rất hợp lý. Nó **phá mọi file cấu hình của nhà khác** — khách hàng omp viết key mà omp không biết vào `.claude/settings.json` là chuyện bình thường. Ở đây "báo im lặng" đúng và "báo lỗi" sai. Chỉ lớp override của constructor (`:632`) mới là nơi typo-guard có nghĩa, vì đó là lớp người dùng gõ cho chính omp. *Đây là lỗi dễ nhất vì nó làm case (1) của mục này đỏ — may mà test bắt được.*
2. **Bridge `hooks` thành hook thật trong `loadHooks`.** Hấp dẫn hơn nữa, và đó **là** thứ nguồn tham chiếu đòi — `gajae-ref/docs/customization.md:146` nói rõ Codex có `hooks.json` là *"a different authority"*, `claude-code-ref/src/utils/plugins/pluginLoader.ts:1238` nói file hooks của Claude có *"a wrapper structure with description and hooks"*. Nhưng nó là **một quyết định sản phẩm lớn hơn nhiều**: một hook của Claude Code có thể chặn tool theo cách omp không diễn giải được. Mục này sửa **đúng thứ nhỏ nhất mà vẫn đúng**. **Đừng để "nguồn tham chiếu đòi" kéo bạn qua ranh giới đó.**
3. **Gọi `droppedForeignKeys` sớm hơn bộ lọc.** Nó chạy, nó xanh, và nó báo những key đã bị loại **có chủ ý** — tức báo một hành vi không tồn tại. Kế hoạch chỉ nhắc `projectLayerForMerge`; **còn `dropSettingsGroupShadows` (`:293`) thì kế hoạch quên hẳn**, và nó mới là cái chạy trên đúng file mà mục này kiểm kê. **Đây là lý do hàng âm (3) là hàng quan trọng nhất chứ không phải hàng phụ.**
4. **Tin dòng 354 của kế hoạch rằng `GAP-M1-18` "chưa có trong kế hoạch M1".** Nó có — 8 hit, mục `W18` tại `MILESTONE_1_EXECUTION_PLAN.md:3730`. Kế hoạch cũ. Kết luận thì vẫn đúng (W18 **chưa merge**), cơ sở thì sai. **Đừng báo cáo "chưa tồn tại" cho người đọc — hãy báo "đã lên sổ M1, Wave 8, chưa merge".**
5. **Khắc chuỗi output của doctor vào test trước khi W18 chốt `severity`.** `DoctorCheck` hôm nay là `{name, status, message, fixed?}` (`types.ts:169-178`); W18 đang nhắm `{severity, name, detail, remedy}`. Chốt chuỗi sớm là viết lại hai lần.
6. **Dùng `test/discovery/disabled-extensions.test.ts` làm bằng chứng "đường chính còn nguyên".** File đó có **0** lần chữ `hooks`. Nó xanh vì nó đúng, không phải vì nó phủ thứ gì. **Đây là loại cổng xanh giả đúng nhất trong mục này.**
7. **Thêm một `Settings` instance thứ hai trong doctor.** Nó chạy, và nó tạo nguồn sự thật thứ hai cho câu hỏi "key này đến từ đâu" — cùng loại với lỗi "dựng `knownSettingIds` từ vòng lặp riêng".

**Câu hỏi kế hoạch hỏi, đã có câu trả lời kiểm được**

| câu hỏi (mục *Cần người quyết*) | trả lời kiểm được |
|---|---|
| `knownSettingIds` lấy từ đâu? | `allSettings().map(s => s.id)` — `registry.ts:800`, import ở `settings.ts:43`. **Một** nguồn, đúng nguồn `assertKnownSettingPaths` đang dùng |
| In bao nhiêu key? | cắt 5, rồi `… và N key khác` (chặt, để người đọc tự mở file) |
| Cần cờ tắt không? | không; dòng là *thông tin*, không phải lỗi |
| Danh sách check của `omp doctor` đã đóng chưa? | **đã đóng** — W18 liệt 7 check, không có hàng này. **Thêm vào *danh sách* trước khi code** |

**Thứ tự làm — một dòng:** 1. Chờ `W18` merge. 2. Thêm hàng này vào *danh sách* check của W18 **trước khi code**. 3. Chốt `severity` (nếu W18 chưa chốt). 4. Viết `dropped-foreign-keys.ts` + test 4 case. 5. Chạy cổng — với đường dẫn test đã sửa, và bằng chứng (3) phủ **cả hai** bộ lọc. 6. **Chỉ khi đó** mới viết dòng doctor.

---

## Pháp lý (§7)

> ### ⚠️ CẢNH BÁO — ĐỌC TRƯỚC KHI COPY BẤT KỲ FILE NÀO
>
> **Các neo pháp lý trong mục này được ghi lại từ một phiên nghiên cứu ĐÃ CÓ checkout deepseek-harness. Chúng chưa được kiểm chứng lại trên cây hiện tại.**
>
> Máy này **không có** checkout nào của `deepseek-ai/deepseek-harness`. Đã kiểm:
>
> - Không có `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/deepseek-harness`
> - Không có `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/dsh`
> - Thư mục `/Users/tranquangdang21/Documents/dsh-vs-omp-audit/` chỉ chứa **một** file: `report.md` (47 KB, 319 dòng)
>
> Nghĩa là: **không claim nào về `LICENSE`, `BRAND_GUIDELINES.md`, `vendor/README.md`, `vendor/cordis/package.json` hay `patches/` của dsh là kiểm chứng được lúc này.** Chúng tồn tại như *ghi chép của một nguồn thứ cấp*, không phải như bằng chứng.
>
> **Việc phải làm TRƯỚC khi copy bất kỳ file nào:**
>
> ```bash
> git clone https://github.com/deepseek-ai/deepseek-harness
> # rồi đọc lại, từng dòng:
> sed -n '1,5p'   deepseek-harness/LICENSE            # giấy phép gốc của dsh
> sed -n '1,15p'  deepseek-harness/BRAND_GUIDELINES.md  # nhãn hiệu — chưa có nguồn thứ cấp nào
> sed -n '1,70p'  deepseek-harness/vendor/README.md     # manifest + 22 divergence
> sed -n '1,3p'   deepseek-harness/vendor/cordis/LICENSE # ai thực sự giữ bản quyền code được port
> ```
>
> **Đây là điều kiện tiên quyết, không phải lưu ý thủ tục.** Nếu `BRAND_GUIDELINES.md` hoặc `vendor/README.md` nói khác với những ghi chép ở đây, thì phải sửa mục này theo file thật, không sửa theo bản thảo. Không ai được coi mục này là căn cứ để copy file trước khi đọc lại nguồn.

Nguồn duy nhất còn trên đĩa là `/Users/tranquangdang21/Documents/dsh-vs-omp-audit/report.md`. Mục pháp lý của nó nằm ở `report.md:250-271`, mở đầu bằng câu:

```
**Đã verify, không suy đoán:**
```

(`report.md:252`). Bảng của nó là nguồn thứ cấp duy nhất cho mọi claim về dsh. Những gì bên dưới đây tách rõ cái nào đọc được từ cây này và cái nào chỉ là ghi chép.

---

### Những gì ĐÃ kiểm chứng được trên cây này

- **oh-my-pi là MIT với ba chủ sở hữu.** **[ĐÃ KIỂM CHỨNG]** `LICENSE:1-5`, nguyên văn:

  ```
  MIT License

  Copyright (c) 2025 Mario Zechner
  Copyright (c) 2025-2026 Can Bölük
  Copyright (c) 2026 Stencil Labs, Inc.
  ```

  *Đính chính quan trọng:* báo cáo kiểm toán ghi sai ở `report.md:265` — nó chỉ nêu một dòng, `Copyright (c) 2025 Mario Zechner`. Trên đĩa có **ba**. Bản thảo §7 đúng, báo cáo thiếu. Ai đọc báo cáo sẽ tưởng chỉ có một bên; đây là lý do `deny.toml`/attribution phải đọc từ file thật chứ không từ báo cáo.

- **Mọi manifest đều khai MIT.** **[ĐÃ KIỂM CHỨNG]** `package.json:5` → `"license": "MIT",`; `packages/coding-agent/package.json:17` → `"license": "MIT",`. Quét **toàn bộ 17** manifest dưới `packages/`: 16 package workspace (`snapcompact`, `coding-agent`, `wire`, `browser-relay`, `tui`, `typescript-edit-benchmark`, `metaharness`, `catalog`, `utils`, `agent`, `omptype`, `ai`, `natives`, `mnemopi`, `stats`, `collab-web`) đều khai `"license": "MIT"`; manifest thứ 17 là `packages/coding-agent/examples/extensions/with-deps/package.json` — **không khai `license`**, nhưng nó là ví dụ extension nằm ngoài workspace (`package.json:9` chỉ glob `packages/*`) và không được publish, nên không phát sinh nghĩa vụ nào.

- **Nghĩa vụ duy nhất của MIT là giữ copyright notice và permission notice.** **[ĐÃ KIỂM CHỨNG — văn bản văn bản luật có sẵn trên đĩa]** Không phải trích MIT của dsh, mà là chính LICENSE của oh-my-pi, tức cùng một văn bản chuẩn. `LICENSE:14-15`, nguyên văn:

  ```
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  ```

  Cùng điều đó, `LICENSE:10-11` cấp rõ `to use, copy, modify, merge, publish, distribute, sublicense, and/or sell`. Đây là toàn bộ điều kiện mà MIT đặt ra — không có điều khoản bắt buộc công bố nguồn, không có điều khoản đối xứng, không có điều khoản cấm bán.

- **`cargo-deny` không chặn MIT.** **[ĐÃ KIỂM CHỨNG]** `deny.toml:31` nằm trong mảng `allow` (khối `[licenses]` mở ở `deny.toml:12`, mảng `allow` chạy `deny.toml:22-35`) và chứa `"MIT",`. Chính sách này áp cho lưới crate Rust, không áp cho TypeScript — nhưng với một mục port dạng text, nó vẫn cho thấy MIT nằm trong tập được chấp nhận.

- **Khuôn dạng attribution mà repo đã dùng có thật, và đúng vị trí bản thảo nêu.** **[ĐÃ KIỂM CHỨNG]** `THIRD-PARTY-NOTICES.txt:18` → `TRACKED VENDORED CODE AND ASSET NOTICES`. Ngay bên dưới, `THIRD-PARTY-NOTICES.txt:22-40` là mục `crates/vendor/brush-core/LICENSE` với đúng ba thứ bản thảo mô tả: giữ copyright upstream, mô tả đường dẫn (`reubeno/brush`), và liệt kê *cụ thể* các sửa đổi cục bộ ("Windows path handling fixes… an async background-PID fix for the nohup wrapper…"). Đây là mẫu để sao chép cho bất kỳ mục M4 nào.

- **Phần lớn văn bản notice theo crate là do `cargo about` sinh ra.** **[ĐÃ KIỂM CHỨNG]** `about.toml:4-17` khai `accepted` gồm `"MIT"` ở `about.toml:5`. Cơ chế đúng như bản thảo nói: một lần regen sẽ viết lại phần sinh, mục thủ công của M4 sẽ biến mất — trừ khi được viết lại sau mỗi lần regen.

- **Mục tiêu port `pi-ai` là hồi quy chức năng — phía omp xác nhận được.** **[ĐÃ KIỂM CHỨNG]** `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts:2` nguyên văn:

  ```ts
  import { parseStreamingJson, parseStreamingJsonThrottled, STREAMING_JSON_PARSE_MIN_GROWTH } from "@oh-my-pi/pi-utils";
  ```

  Ba ký hiệu, đúng như bản thảo nêu. omp giữ thêm một **cửa sổ parse bị throttle**, nghiêm hơn hẳn việc gỡ thẳng. Phần còn lại của claim (nội dung bản vá của dsh) không kiểm được — xem bên dưới.

---

### Ba điểm pháp lý then chốt

Ba điểm này giữ nguyên vì chúng quyết định hành động, nhưng nhãn kiểm chứng của chúng **không đồng đều**. Đọc nhãn trước khi dựa vào.

**(a) MIT cho phép dùng lại CODE, nghĩa vụ duy nhất là giữ copyright và permission notice.**

- **[ĐÃ KIỂM CHỨNG — phần văn bản luật]** — xem `LICENSE:10-11` và `LICENSE:14-15` ở trên. Đây là văn bản MIT thật, nằm trên đĩa, và đó là toàn bộ nghĩa vụ của nó.
- **[CHƯA KIỂM CHỨNG ĐƯỢC — phần áp dụng cho dsh]** — bản thảo khẳng định `LICENSE:1-3` của dsh đọc nguyên văn `"MIT License"` / `"Copyright (c) 2026 DeepSeek"` và ghi *"Đã kiểm: đúng vậy"*. Câu đó **không kiểm được trên cây này**. Nguồn duy nhất là `report.md:256`. Đây là chỗ dễ sai nhất theo hướng nguy hiểm: nếu dsh không MIT ở root (ví dụ một repo dùng giấy phép kép nhưng LICENSE gốc khác, hoặc có `LICENSE` theo từng subsystem), thì cả mục này đổi dấu. Kiểm: `sed -n '1,5p' deepseek-harness/LICENSE` sau khi clone.
- **[CHƯA KIỂM CHỨNG ĐƯỢC — ngoại lệ đã biết trong chính báo cáo]** — `report.md:263` liệt kê các dependency bên thứ ba của vendored (`@standard-schema/spec`, `js-yaml`, `chokidar`, `picomatch`, `@babel/code-frame`, `supports-color`, `node-addon-require-builtin`). Bản thảo §7 **không** đề cập tới chúng. Nếu M4 chạm tới bất kỳ gì kéo theo một trong bảy package này thì phải đọc license riêng của nó, không được suy từ MIT của dsh. Ngoài ra `§8` của bản thảo tổng đã tự cảnh báo `native/system/` là BSD 3-Clause — `report.md` không nói điều đó, và nó cũng không kiểm được.

**(b) Nhãn hiệu KHÔNG thuộc grant MIT.**

- **[ĐÃ KIỂM CHỨNG — nguyên lý]** — quyền copyright không cấp quyền nhãn hiệu. Đây là ranh giới cơ bản của hệ thống pháp lý, và nó đúng độc lập với việc dsh có `BRAND_GUIDELINES.md` hay không. Nhánh này đúng bất kể điều gì xảy ra với file của dsh.
- **[CHƯA KIỂM CHỨNG ĐƯỢC — và yếu hơn các claim khác]** — bản thảo dẫn `BRAND_GUIDELINES.md:9` (nhãn hiệu đã đăng ký của DeepSeek, cảnh báo dùng trái phép trong tên dự án *"may also involve trademark infringement"*), `BRAND_GUIDELINES.md:7` (mô tả được phép, ví dụ *"built on DeepSeek Harness"*) và `BRAND_GUIDELINES.md:8` (khi đặt tên nên dùng **"DSH"**). **Không có nguồn thứ cấp nào trên máy này.** Đã grep toàn bộ `report.md` (319 dòng) với `brand|trademark` → **0 hit**; grep rộng hơn (`brand|trademark|nhãn hiệu|đăng ký`) → **1 hit**, và hit đó là `report.md:24` (`splice theo thứ tự đăng ký` — nghĩa là thứ tự đăng ký disposer, không liên quan nhãn hiệu). Mục pháp lý của báo cáo tự mở đầu bằng *"Đã verify, không suy đoán"* (`report.md:252`) và vậy mà **không nhắc tới nhãn hiệu đang một lần**. Đây là claim mong manh nhất của mục này: nó không chỉ thiếu kiểm chứng sơ cấp, nó còn thiếu cả xác nhận thứ cấp.
  → Kiểm: `sed -n '1,20p' deepseek-harness/BRAND_GUIDELINES.md` sau khi clone. **Đừng dùng chuỗi "DeepSeek" trong tên package/module/subcommand, và đừng dùng "DSH" như tên công khai, cho tới khi đọc được file này.** Đây là điểm bị bỏ sót nhiều nhất theo đánh giá của bản thảo, và việc nó đứng một mình không có nguồn làm nó càng dễ bị coi là sẵn sàng.
- **[CHƯA KIỂM CHỨNG ĐƯỢC]**`Cần người xác nhận trước khi phát hành công khai` — giữ nguyên, và nên nâng lên thành điều kiện chặn, vì toàn bộ Wave B/C/D của M4 đang `shippable: false` cho một lý do khác (§6.2). Việc M4 chưa phát hành là thuận lợi: **không có bề mặt công khai nào đã tồn tại để phải gỡ.**

**(c) Tái tạo sạch từ pattern đã tài liệu hoá thì không nợ notice nào.**

- **[CHƯA KIỂM CHỨNG ĐƯỢC — nhưng đây là claim mang tính khuyến nghị, không phải dữ kiện]**` Bản thảo viết: tái tạo sạch mô hình từ `docs/cordis-primer.md` và `docs/architecture.md` thì không nợ notice, và đó là đường kế hoạch nghiêng về, vì M4 chỉ port **kỷ luật ưu tiên** (một mảng ~40 dòng logic, chưa tới 200 dòng tổng) chứ không phải runtime. Bản thảo không nói ranh giới pháp lý nằm ở đâu — nó chỉ khẳng định hệ quả (tái tạo sạch thì không nợ notice) và đòi phải quyết rõ từng deliverable. **Câu tiếp đây là đóng góp của lượt kiểm chứng này, không phải trích dẫn.**
- **Sai lầm cần nêu thẳng, vì đây là nơi dễ tự thuyết phục mình nhất:** "chỉ port kỷ luật, chưa tới 200 dòng" **không phải** tiêu chí pháp lý. Ranh giới là *mức độ giống nhau và nguồn gốc suy nghĩ*, không phải số dòng. Một mảng 40 dòng mà đọc ra là bản chép lại cấu trúc `DisposableList` của Cordis thì vẫn là mã nguồn được sao chép, và vẫn nợ notice. Ngược lại một mô hình 500 dòng viết lại từ đặc tả hành vi thì không nợ. Vì vậy con số "40 dòng / 200 dòng" trong bản thảo là **ngân sách kỹ thuật, không phải tiêu chí pháp lý** — đừng dùng nó để kết luận rằng một deliverable nào đó "chắc chắn sạch".
- **Hệ quả vận hành, đã kiểm được:** bản thảo yêu cầu *"phải quyết rõ cho từng deliverable và ghi lại quyết định đó"*. Đây là yêu cầu đúng và là phần quan trọng nhất của mục này — nhưng nó chỉ thực hiện được **sau** khi đọc lại nguồn. Với mỗi deliverable của M4, ghi vào PR: lấy từ đâu (cụ thể tới file và dòng), hoặc *tái tạo từ pattern nào đã tài liệu hoá*, và ai kết luận. Cần **người có chuyên môn xác nhận ranh giới này, không phải kỹ sư tự kết luận.**

---

### Đính chính sau khi kiểm chứng

Bốn claim của bản thảo sai hoặc không chính xác. Không có claim nào trong số này đổi hướng quyết định của M4, nhưng cả bốn đều sai về *sự thật*, và sai về sự thật ở mục pháp lý thì đắt hơn sai ở mục kỹ thuật.

1. **Số dòng `TRACKED VENDORED CODE` trong `ci.yml` là sai.** Bản thảo ghi `.github/workflows/ci.yml:889`, `:899`. Trên đĩa, `THIRD-PARTY-NOTICES.txt` xuất hiện ở **`ci.yml:22`** và **`:51`** (bộ lọc path), **`:1178`** (sinh `SHA256SUMS.txt`) và **`:1188`** (danh sách file của `softprops/action-gh-release`). Dòng 887-900 thật sự chứa là khối comment về Rosetta và Xcode của job `release_binary_hosted` — không liên quan gì. **Sửa thành `ci.yml:1188`** cho ý "đi kèm mọi bản phát hành", và `ci.yml:22`, `:51`, `:1178` cho ba chỗ còn lại. Nội dung thì đúng: file có thật trong danh sách release asset.

2. **Số dòng `stageLegalPayloads` là sai.** Bản thảo ghi `scripts/ci-release-publish.ts:85`, `88-93`. Thực tế: hằng `MIT_LICENSE` / `THIRD_PARTY_NOTICES` ở **`:93-94`**, hàm `legalPayloadFiles` khai ở **`:97`**, và nhánh quyết định ở **`:99-100`**:

   ```ts
   case "MIT":
       return [MIT_LICENSE, THIRD_PARTY_NOTICES];
   ```

   `stageLegalPayloads` được **định nghĩa ở `:111`** và được **gọi ở ba call site: `:279`, `:319` và `:599`** (`:599` là `coreManifest.license ?? "MIT"` — đường đóng gói package lõi). Dòng 85-88 rơi vào giữa `interface PackageManifest` (`:81-89`), không liên quan. **Sửa thành `scripts/ci-release-publish.ts:97-100` và `:111`.** Nội dung thì đúng: mọi package MIT đều nhận cả hai file.

3. **`grep -rln 'TRACKED VENDORED CODE'` khớp nhiều hơn "chính file .txt đó" — và điều này làm rủi ro nặng hơn bản thảo nói.** Bản thảo viết lệnh này chỉ khớp bên trong chính file `.txt` đó. Chạy lại trên cây hiện tại cho **4** kết quả **ngoài `.lavish-wip/`** (chính file mục này và file danh sách phát hiện cũng chứa chuỗi đó, nên grep toàn cây chưa lọc sẽ ra nhiều hơn): `THIRD-PARTY-NOTICES.txt` (root), `packages/coding-agent/src/tools/browser/relay/extension-assets/THIRD-PARTY-NOTICES.txt`, `packages/natives/THIRD-PARTY-NOTICES.txt`, và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (bản thảo tự trích dẫn chính nó — dương giả). **Ba file `.txt` là ba bản giống nhau từng byte** (`md5 = 0d464153645a70d915816410b75d9cbd`, đều 22901 dòng), cả ba đều được git track. **Cơ chế thật là `stageLegalPayloads` — *"Package-local license/notice files win; missing files fall back to the repository payload"* (`:108-109`) — và nó không đồng nhất giữa ba bản; đó mới là chỗ cần canh.** (grep `THIRD-PARTY-NOTICES` trong `scripts/`, `.github/workflows/`, `package.json` cho **11** hit: 4 ở `ci.yml`, 1 ở `scripts/ci-release-publish.ts:94`, 6 ở `scripts/ci-release-publish.test.ts` — và grep đó **bỏ sót** hai script ở `packages/*/scripts/`, là hai chỗ duy nhất thực sự di chuyển file.) Cụ thể:

   **(i)** `packages/coding-agent/src/tools/browser/relay/extension-assets/THIRD-PARTY-NOTICES.txt` là **artifact sinh tự động**, không phải bản sao thủ công — `packages/browser-relay/scripts/build-extension.ts:40-42` copy từ file root, rồi `:51-61` nhúng vào thư mục `extension-assets` (định nghĩa ở `:21`) mà chính script tự in *"commit these"* ở `:66`. Nó được wire vào build tại `packages/browser-relay/package.json:16`, và bản sinh ra được `packages/coding-agent/src/cli/license.ts:2` import thẳng làm payload cho lệnh `omp license`. Sửa tay bản này là **việc thừa** — `bun run build` của browser-relay sẽ ghi đè.
   
   **(ii)** `packages/natives/THIRD-PARTY-NOTICES.txt` là **nguồn thủ công có quyền ưu tiên** — `resolveLegalPayload` ở `packages/natives/scripts/gen-npm-packages.ts:128-133` ưu tiên file package-local (`NATIVE_LEAF_LEGAL_FILES` khai ở `:61`, đưa vào `files` ở `:99`), nên nó **thắng** file root và được `fs.copyFile` vào từng thư mục `npm/<tag>/` (`:168-172`). Bản này lệch âm thầm là lệch **có hậu quả** — nó đi thẳng vào npm tarball, và hiện không có test nào assert nó bằng root.
   
   **(iii)** File root là nguồn duy nhất được `ci.yml:22`, `:51`, `:1178`, `:1188` đưa vào release asset và mọi package MIT.
   
   **Hệ quả thật, ngược với cách tài liệu cũ diễn đạt:** một mục M4 thêm vào root mà không sửa bản natives sẽ **không xuất hiện** trong các leaf package đã phát hành; còn sửa bản relay bằng tay là việc thừa. **Đây là phát hiện mới của lượt kiểm chứng này, không có trong bản thảo, và nó nặng hơn phần "bảo trì thủ công" mà bản thảo đã cảnh báo.**

4. **Báo cáo kiểm toán đếm thiếu chủ sở hữu bản quyền của chính oh-my-pi.** `report.md:265` ghi oh-my-pi là `MIT License` / `Copyright (c) 2025 Mario Zechner` — một dòng. `LICENSE:3-5` trên đĩa có **ba**. Bản thảo §7 nói đúng ("ba chủ sở hữu"). Không sửa bản thảo; ghi vào đây vì ai đọc `report.md` làm nguồn sẽ sai, và vì nó là ví dụ rõ nhất cho vì sao các neo pháp lý phải đọc từ file thật chứ không từ báo cáo.

Ngoài ra, một chỗ **lệch giữa bản thảo và nguồn thứ cấp của nó** (chưa đủ cơ sở gọi là sai, nhưng phải ghi): bản thảo nói 22 divergence nằm ở `vendor/README.md` *"từ dòng 29"*, còn `report.md:236` ghi `vendor/README.md:31-58`. Hai nguồn không khớp nhau. Số 22 thì **ba lần lặp trong báo cáo** (`report.md:170`, `:236`, `:269`) và `:170` còn gắn nó với "2.696 dòng" — con số đó xuất hiện ở cả hai nơi, nên nó là dữ kiện thật của báo cáo, chỉ là chưa kiểm được. Khi clone, đếm lại từ file và ghi dải dòng thật.

---

### Điều chưa kiểm chứng được

Toàn bộ danh sách dưới đây **không có bằng chứng nào trên máy này** ngoài `report.md`. Chúng không sai — chúng **chưa được biết là đúng**. Đây là những gì một người sẽ dựa vào để quyết định có copy file nào, nên chúng được liệt kê đầy đủ thay vì gộp.

> Mọi lệnh trong cột *Cách kiểm* giả định bạn đang đứng **bên trong** checkout. Viết tắt cho gọn; nếu chạy từ thư mục cha, thêm tiền tố `deepseek-harness/` vào mọi đường dẫn (giống hộp cảnh báo ở trên) — ví dụ `sed -n '1,5p' deepseek-harness/LICENSE`, `ls deepseek-harness/vendor/`.

| # | Claim của bản thảo | Nguồn thứ cấp duy nhất | Cách kiểm sau khi clone dsh |
|---|---|---|---|
| 1 | dsh MIT, không phiên bản; `LICENSE:1-3` = `"MIT License"` / `"Copyright (c) 2026 DeepSeek"` | `report.md:256` | `sed -n '1,5p' LICENSE` |
| 2 | Phần đáng port là Cordis đã vendor, 9 package + `packages/boot/hmr` | **không có.** `report.md:258` chỉ xác nhận 9 vendor package đều MIT; mệnh đề này là nguyên văn từ bản thảo (`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:11597`), không xuất hiện trong báo cáo | `ls vendor/` |
| 3 | Mọi LICENSE vendor đọc `"Copyright (c) 2021-present Shigma"`; chủ là Shigma/cordiverse, **không phải** DeepSeek | `report.md:257` | `head -3 vendor/*/LICENSE` |
| 4 | `vendor/README.md:5`: *"Upstream MIT `LICENSE` files are preserved in each package directory."* | `report.md:260` | `sed -n '1,10p' vendor/README.md` |
| 5 | Quy trình sync dsh giữ LICENSE upstream (`vendor/README.md:64`) | `report.md:261` | `sed -n '60,70p' vendor/README.md` |
| 6 | Manifest chia nguồn: `cordis`+`loader` từ cordiverse; `include`/`group`/`timer`/`hmr`/`logger-console` từ fork DeepSeek; `cosmokit`+`schemastery` từ fork DeepSeek | `report.md:262` | `sed -n '1,20p' vendor/README.md` |
| 7 | **22** divergence cục bộ đã đánh số, dải dòng `31-58` (bản thảo ghi "từ dòng 29") | `report.md:170`, `:236`, `:269` | đếm lại từ `vendor/README.md` |
| 8 | `vendor/cordis/package.json` = `@deepseek-ai/cordis` `4.0.4` MIT | `report.md:259` | `cat vendor/cordis/package.json` |
| 9 | dsh có `THIRD_PARTY_NOTICES.md` 23KB ở root | `report.md:264` | `ls -la THIRD_PARTY_NOTICES.md` |
| 10 | `native/system/` là **BSD 3-Clause**, không phải MIT | *(báo cáo không nói; chỉ có §8 bản thảo tổng)* | `head -3 native/system/LICENSE` |
| 11 | **`BRAND_GUIDELINES.md:7`, `:8`, `:9`** — nhãn hiệu đã đăng ký, cảnh báo trademark infringement, quy tắc đặt tên "DSH" | **không có. 0 hit trong toàn bộ `report.md`.** | `sed -n '1,20p' BRAND_GUIDELINES.md` |
| 12 | `patches/@earendil-works__pi-ai@0.85.1.patch` toàn bộ là gỡ `block.arguments = parseStreamingJson(block.partialJson)` | **không có. Báo cáo không nhắc tới file patch này.** | `cat patches/@earendil-works__pi-ai@0.85.1.patch` |

Ba dòng đó (#2, #11, #12) nổi lên vì chúng là **claim không có nguồn thứ cấp nào** — kể cả khi đối chiếu với một báo cáo tự nhận là *"Đã verify, không suy đoán"*. Nếu số 11 và 12 được viết từ đọc trực tiếp `BRAND_GUIDELINES.md` và thư mục `patches/` trong một phiên đã mất, thì chúng có thể đúng; nhưng hiện tại chúng đứng trên cùng một chỗ với các claim khác mà lại yếu hơn, vì không có gì để đối chiếu. **Xử lý chúng như câu hỏi mở, không như dữ kiện.**

Số 12 cần thêm một bước: dù claim "port bản vá đó là hồi quy chức năng" có phía omp đã xác nhận (`tool-args-reveal.ts:2`, xem trên), thì việc **gạch khỏi danh sách port** là một quyết định kỹ thuật và nó **đúng bất kể nội dung patch là gì** — vì omp đã có thiết kế mạnh hơn, nên không có lý do kỹ thuật nào để lấy. Đừng để một claim pháp lý chưa kiểm chứng mang quyết định đã đúng sẵn.

---

### Không phải tư vấn pháp lý

Đây là tổng hợp sự thật về văn bản cấp phép và hệ quả thực tế của chúng, dựng từ các file được trích. Nó không phải tư vấn pháp lý, và ba câu hỏi dưới đây cần người có chuyên môn trả lời, không phải kỹ sư:

1. **Ranh giới "tái tạo sạch"** ở điểm (c) — kỹ thuật không tự phân định được ranh giới này.
2. **Nhãn hiệu** ở điểm (b) — và mọi câu hỏi về việc dùng tên, trước khi bất kỳ thứ gì của M4 được phát hành công khai.
3. **`packages/natives/THIRD-PARTY-NOTICES.txt` phải được giữ bằng file root bằng cách nào** — nó thắng root trong `resolveLegalPayload` và đi vào mọi leaf tarball, hiện không có test nào assert hai file bằng nhau. Có nên thêm một assertion byte-equality vào `packages/natives/test/npm-packages.test.ts` (nơi đã có sẵn fixture `THIRD-PARTY-NOTICES.txt`), và ai là người chịu trách nhiệm khi `cargo about` regen ghi đè phần sinh?


---


## Rủi ro và cách sai dễ nhất

M4 khó ở đúng chỗ nó dễ thành công: bốn work item gốc đều nhỏ, đều có gate cơ học, và đều xanh ngay khi bề mặt khai báo đúng — và sáu mục `GAP-M4-10`..`GAP-M4-15` thêm vào cùng hình dạng đó. Ba cách nhiều khả năc đi sai nhất, theo thứ tự sát thời điểm phát hiện ra.

**Mượn quá tay.** M4 lấy kỷ luật của `deepseek-ai/deepseek-harness`, nhưng mô hình mà kế hoạch dựa vào nằm ở `packages/boot/` — repo này không có package đó. Tiền lệ rollback (`packages/boot/config-editor/src/index.ts:127-129` và `:133-137`) và tiền lệ kiểu `application` (`packages/boot/plugin-manager/src/types.ts:111-114`) đều không mở được để kiểm chứng. Hệ quả cụ thể nhất nằm ở M4-6: tiền lệ dsh là (a) từ chối lượt ghi và giải thích, còn tiền lệ đã ship trong chính repo này — `omp config set` tại config-cli.ts:314 (`if (shadow) console.log(chalk.yellow(...))` — dòng 315 là dấu `}` đóng hàm và 317 là JSDoc của `globalValue`, đừng dừng ở đó) — là (b) ghi vào rồi chỉ ghi chú. Copy hình dạng dsh nghĩa là dựng cả nửa rollback mà người đọc quen với hành vi ngược lại.

**Xanh mà không tới đâu.** Ở M4-7, cố tình chỉ thêm trường `rawArgs` vào hai interface mà không sửa gì khác thì test vẫn GREEN — đó chính là cái bẫy gate của mục này tự nêu. Ở M4-9, thiếu một mục đăng ký `Command` trong `cli-commands.ts` làm `omp extensions-triage` rơi xuống `runCli` và chuyển argv thành prompt đưa cho LLM (hồi quy #1496), và không test nào trong danh sách gate sẽ nhận ra. Cùng một kiểu hỏng, xử lý một lần.

**Khoá ra không khoá gì.** Đây là nội dung thật của risk của M4-4, và nó không nằm ở chữ nghĩa của câu "bọc `#saveRuntimeConfig` trong `withFileLock` và đọc lại config bên trong lock". Cả chín call site (all nine call sites) đều mutate `this.#runtimeConfig` đã memoize TRƯỚC khi gọi save. Cài nguyên văn cả câu đó tạo ra một lock trông đúng, giữ đúng thứ đã bị mất trong bộ nhớ, và mọi gate bằng grep vẫn xanh.

Trước khi vào bảng: **cổng native addon là tiền đề tái lập** cho M4-4 — và nó **đã build xong 2026-09-29**. `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives` (file-lock.ts:9), nên trên máy sạch chưa build nó vừa không dùng được vừa không test được: bước 1 trong sáu bước của gate — `bun test packages/utils/test/file-lock.test.ts` — ra `0 pass, 1 fail` với `Failed to load pi_natives native addon for darwin-arm64`. Sau bước build một lần (`brew install ninja` rồi `bun --cwd=packages/natives run build`, exit 0) cùng lệnh đó ra **4 pass / 0 fail**. Hai file `packages/utils/src/atomic-write.ts` và `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` mang nhãn `[create,UNVERIFIED]` — và đó là đúng nghĩa: cả hai là file M4-4 **tạo ra**, không phải file cần đi tìm. Spec M4-4 ghi rõ `action: "create"` với note "Does not exist yet — create". Nhãn `UNVERIFIED` ở đây nói 'chưa tồn tại vì sắp tạo', KHÔNG phải 'đường dẫn có thể sai' — đừng dừng công việc để săn xem chúng có thật không. Điều đáng chú ý hơn: cổng này nuốt luôn cả Wave B, vì M4-6 merge chung một PR với M4-4 dù bản thân nó không đụng tới lock. Hệ quả thứ hai: negative control bắt buộc của M4-4 (xoá `withFileLock` khỏi `#mutateConfig` rồi xác nhận test tranh chấp đỏ) cũng cần addon chạy — tức trên máy chưa build, ngay cả phòng vệ cũng không chứng minh được là còn sống. Trên cây này nó chạy được.

| work item | rủi ro | cách giảm |
| --- | --- | --- |
| M4-4 | Lock bao quanh thứ đã hỏng: chín call site mutate `this.#runtimeConfig` trước khi save, nên khoá được cài đúng hình dạng vẫn bảo vệ một read-modify-write đã thua. | Negative control là bắt buộc, không phải tuỳ chọn: tạm xoá `withFileLock` khỏi `#mutateConfig`, xác nhận test tranh chấp đỏ, rồi trả lại. Không thấy đỏ là không có gate. Đừng trông chờ `git grep -n saveRuntimeConfig -- packages/` — nếu ai đó đổi tên `#saveRuntimeConfig` thay vì xoá, grep vẫn bằng 0 trong khi lock đã biến mất im lặng. |
| M4-4 + M4-6 (Wave B) | Cổng `pi_natives` từng đứng trước toàn bộ Wave B trên một máy sạch: `file-lock.test.ts` ra `0 pass, 1 fail`, và M4-6 đi chung PR nên không mở được dù không liên quan tới lock. | `brew install ninja` rồi `bun --cwd=packages/natives run build` là **tiền đề tái lập**, làm một lần cho mọi máy — không phải việc làm song song với viết code. `0 pass, 1 fail` ở trạng thái đó **là** lỗi môi trường và nó đã chuyển xanh (4 pass / 0 fail, đo 2026-09-29), nên đừng đọc nó là bằng chứng gate thật — bằng chứng gate thật là negative control ở hàng M4-4 ngay trên. |
| M4-7 + M4-9 | Một kiểu hỏng chung: khai báo đúng kiểu, xanh toàn bộ, không tới được người dùng. Ở M4-7 thêm `rawArgs` vào hai interface mà không sửa gì khác thì test vẫn GREEN; Ở M4-9 mất mục đăng ký `Command` trong `cli-commands.ts` thì argv bị đưa thành prompt cho LLM. | Nguyên tắc chung: gate phải đo hành vi quan sát được từ bên ngoài, không đo một type edit. M4-7 có sẵn phép tự kiểm — làm G1 xanh khi chưa sửa gì; nếu nó vẫn xanh thì gate chưa có răng. M4-9 không có phép đó, nên phần đăng ký lệnh phải kiểm bằng mắt. |
| M4-9 | CLI tự suy diễn shadowing thay vì chiếu đúng các hàng `loadAllExtensions` đã trả về, khiến tồn kho và dashboard runtime lệch nhau. Danh sách nói dối tệ hơn không có danh sách. | Wave D phải đợi M2 WI-2 merge — chưa có: `packages/coding-agent/test/extension-load-order-determinism.test.ts` không tồn tại và `git grep -n 'extension-load-order' packages/coding-agent/` ra 0 hit. Điều kiện gate (3) bắt đúng lỗi này: xoá phép mirror `Settings.init()` / `cfgDisabledExtensions` thì mọi disable cấp item lật sang `active` và lệch với dashboard. |
| M4-6 | Guard là kiểm tra sau-khi-ghi kèm rollback, và chính quyết định rollback là thứ có thể làm brick `/settings`. Quyết định sản phẩm LOUD/QUIET chưa có, nên nửa rollback chưa tồn tại để mà viết. | Gate (2) và (3) phải đi cặp, không được tách. (2) khẳng định key KHÔNG còn trong `config.yml` sau lượt ghi và chứa giá trị trước-ghi; (3) khẳng định key CÓ trong `config.yml` khi không lớp nào che. Bỏ (3) thì (1) và (2) thoả mãn được bằng một guard từ chối mọi lượt ghi. (1) là cổng chống trôi, nhưng phải đo DELTA chứ không phải giá trị tuyệt đối. Baseline hôm nay là **13** (11 × `this.#context.settings.set`, 2 × `this.#settings.set`) — cổng này ĐANG ĐỎ và không thể xanh nếu panel còn giữ đường ghi của nó. Viết lại thành hai điều kiện: (1a) `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` phải **bằng đúng 13** — không thêm, không bớt call site; (1b) mỗi một trong 13 chỗ đó phải nằm sau guard, kiểm bằng hành vi chứ không bằng đếm: ghi vào một dòng đang bị che thì `config.yml` không đổi (gate (2)), ghi vào dòng không bị che thì có đổi (gate (3)). Cổng (1) chỉ bắt được việc THÊM call site; nó không bắt được call site CŨ đã lọt khỏi guard — đó là lý do (2) và (3) phải đi cặp và không được tách. |
| M4 (cả milestone) | Mượn quá tay: kế hoạch trỏ vào `packages/boot/…` cho cả tiền lệ rollback lẫn kiểu `application`, mà package đó không tồn tại ở đây — mượn kiến trúc sẽ kéo theo thứ dsh đã phải tự vá. | Vay kỷ luật, không vay kiến trúc: quy tắc, trường, hệ quả dẫu xuất. Mỗi khi con trỏ chạm `packages/boot/…`, tiêu chuẩn áp dụng là tiền lệ trong repo — config-cli.ts:295-318 — chứ không phải con trỏ đó. Hai câu hỏi mở ở bảng dưới tồn tại chính vì lỗ hổng này, và chúng chặn trước khi viết dòng code đầu tiên. |

## Bảng quyết định cần bạn chốt

Đủ hai mươi lăm câu, sắp theo mức chặn: **mười bối** câu trên cùng chặn việc viết dòng code đầu tiên, năm câu kế chặn việc mở PR và phát hành, sáu câu cuối đã có mặc định nên chỉ cần xác nhận. **Mười ba** câu không có mặc định nào để rơi về. Sáu câu trong số đó đến từ sáu mục `GAP-M4-10`..`GAP-M4-15` thêm ngày 2026-09-29.

| work item | câu hỏi | vì sao nó chặn | mặc định nếu không trả lời |
| --- | --- | --- | --- |
| M4-6 | M2 WI-8a / WI-8b đã merge thật chưa? | Kế hoạch nêu đây là cổng cứng, nhưng M2 chưa chạy và mục này ghi rõ NOT VERIFIED. M4-6 thêm một thành viên vào bề mặt đăng ký setting; nếu WI-8a/8b đã đổi hình dạng bề mặt đó, phần thêm ở bước 3 có thể phải khớp một hình dạng chưa tồn tại. | chưa có mặc định — cần bạn quyết |
| M4-4 | Ai quyết trường `application: 'applied' \| 'restart-required'`? | Gate của M4-4 viết thẳng: DONE còn cần một quyết định của người ở đúng câu hỏi này, vì kiểu mẫu của kế hoạch nằm trong một repo không tồn tại ở đây. `PluginManager` không có kiến thức HMR và chuỗi `restart-required` có 0 tham chiếu trong mã nguồn — `git grep -n 'restart-required' -- packages/` ra 0 hit (chạy không giới hạn phạm vi thì ra 3 hit, cả 3 đều nằm trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`; đừng báo cáo con số 0 mà không kèm phạm vi); overlay chỉ reload một phần — settings-selector.ts:1329 → selector-controller.ts:305-312 gọi `clearPluginRootsAndCaches` + `refreshSkillState` + `refreshSlashCommandState` + `resetCapabilities` nhưng KHÔNG gọi `refreshAgentDiscovery` mà `reloadPlugins` thật sự làm ở acp-agent.ts:2167. Nghĩa là một toggle chỉ áp dụng một nửa, và giá trị trả về sẽ nói dối nếu chọn sai chủ sở hữu. | chưa có mặc định — cần bạn quyết |
| M4-6 | Panel LOUD hay QUIET khi ghi vào một dòng đang bị che? | Câu này quyết định có tồn tại nửa rollback của guard hay không — tức là có viết được `packages/coding-agent/src/config/shadowing.ts` theo hình dạng nào. Người đã gõ một giá trị và bấm enter rồi thấy nó tự lùi có thể đọc đó là mất dữ liệu. (b) đã ship: `omp config set` báo bóng shadow và vẫn để giá trị nằm trong file (config-cli.ts:314). (a) là tiền lệ dsh. Đây là quyết định sản phẩm, không phải kỹ thuật. | chưa có mặc định — cần bạn quyết |
| M4-6 | Tiền lệ nào chi phối: của dsh hay tiền lệ trong repo? | Nửa rollback-theo-byte dựa trên `packages/boot/config-editor/src/index.ts:127-129` và `:133-137` — không có package `packages/boot/` nên không mở kiểm chứng được. Tiền lệ trong repo là config-cli.ts:295-318: kiểm tra sau khi ghi nhưng báo cáo, không rollback. Chọn sai chủ nghĩa là guard có hai hành vi đối nghịch tùy người đọc. | chưa có mặc định — cần bạn quyết |
| M4-7 | Đổi tên khoá nào? | Hai nhánh ship mức churn renderer khác nhau dưới cùng một quyết định changelog, nên đây là quyết định của maintainer chứ không phải của người viết. Nhánh hẹp giữ nguyên bash.ts / edit.ts / eval.ts và sáu file test đang ghim chuỗi; nhánh rộng bỏ `__partialJson` khỏi args ngoài và chuyển cả ba tool sang `options.rawArgs.json`. Câu hỏi cũng nói thẳng đây là quyết định cần ghi lại nếu không ai chọn. | Nhánh khuyến nghị: chỉ đổi tên khoá trong ghi ở **`packages/tui/src/tools/xdev.ts:57`** (thêm chỗ strip tại **`packages/tui/src/tools/xdev.ts:114`** và `packages/tui/src/tools/json-tree.ts:23`) và để `rawArgs` thuần additive cho luồng ngoài. Phải ghi đủ đường dẫn: repo có HAI file tên `xdev.ts`, và `packages/coding-agent/src/tools/xdev.ts` không chứa `__partialJson` nào (0 hit) — dòng 57 của file đó là `web_search: true,` trong `XDEV_KEEP_TOP_LEVEL`, bấm nhầm vào đó là rơi vào hằng số không liên quan. Nếu không ai quyết thì đi theo nhánh này và ghi lệch lệch vào mô tả PR. |
| M4-9 | (a) hay (b)? | Câu hỏi tự gọi nó là DECISION GATE ở bước 1. Không có nó thì không biết CLI có chạm vào capability-core hay không, và effort nhảy từ S lên M. | (a): ship (a) ngay — không cần đổi core, trả lời được câu hỏi triage — và tách (b) thành work item riêng thay vì gói một thay đổi dùng chung vào PR CLI. |
| M4-4 | `atomicWriteJson` giữ hậu tố `${filePath}.tmp` cố định hay chuyển sang dạng `${filePath}.${process.pid}.${random}.tmp`? | Tên tệp tạm dùng chung chỉ an toàn khi mọi writer của một file đều lấy cùng một lock — đúng với lockfile sau thay đổi này, KHÔNG đúng với hai registry marketplace vì chúng không khoá. Dạng hardened đã có tiền lệ tại packages/ai/src/auth-broker/snapshot-cache.ts:93. Câu hỏi nêu rõ: quyết trước khi util thành điểm dùng chung. | chưa có mặc định — cần bạn quyết |
| M4-4 | `MarketplaceManager.#writeRuntimeConfig` (marketplace/manager.ts:923-925) có trong phạm vi không? | Đây là writer runtime-config thứ hai, cùng hình dạng read-modify-write, không khoá, không đi qua `atomicWriteJson`. Bỏ qua nó đúng bằng vi phạm "hai cách làm" mà chính risk 2 của kế hoạch cảnh báo — và nó sẽ thành điểm vào tiếp sau khi util trở thành trung tâm. | chưa có mặc định — cần bạn quyết |
| M4-4 | `PluginSettingsMarketplaceManager.setPluginEnabled` có đổi kiểu trả về không? | Kế hoạch gọi nó là "mutator thứ tư", nhưng nó do một lớp KHÁC thực thi — `MarketplaceManager` tại marketplace/manager.ts:686 — và ghi registry marketplace, không phải lockfile plugin, không bao giờ chạm `#saveRuntimeConfig`; nó chỉ chung gói `packages/tui/src/overlays/`. Nới kiểu trả về là một breaking change riêng với sức nặng changelog riêng. | chưa có mặc định — cần bạn quyết |
| GAP-M4-11 | **GAP-D8: 895 call site — sửa hết, hay di dời có chọn lọc?** | Sửa hết tạo ra một diff không review được và nó **che mất thay đổi thật**: người đọc không còn phân biệt được dòng nào là hành vi và dòng nào là cơ chế. Cần chốt **tiêu chí chọn** và ghi phần còn lại là nợ kỹ thuật **có chủ** kèm owner. | chưa có mặc định — cần bạn quyết |
| GAP-M4-13 | **GAP-D2: `ApprovalEntry` mở rộng union `SessionEntry`, hay tái dùng `CustomEntry` có sẵn?** | (a) biến thể mới → format mở rộng, cần cân nhắc migration, nhưng truy vấn được bằng type; (b) `CustomEntry` → không mở rộng format, nhưng phải đọc log bằng tay. Cùng loại với open question M4-4-OQ1. Union `SessionEntry` ở `session/session-entries.ts:300-315` có 16 thành viên và **không** có thành viên approval nào, nên đây là một thay đổi format thật chứ không phải một dòng bổ sung. | chưa có mặc định — cần bạn quyết |
| GAP-M4-12 | Thứ tự merge với **M2 WI-9**? | WI-9 sửa đúng đường **đăng ký** handler mà item này sửa đường **gọi**. Không chặn nhau, nhưng hai bản vá độc lập trên hai mặt của cùng một seam thì hợp nhất không theo thứ tự là âm thầm hủy lẫn nhau. | chưa có mặc định — cần bạn quyết |
| GAP-M4-14 | Con số trần của hàng `proof: none` là bao nhiêu? | Bốn hàng mở đầu đều có cổng kiểm thật, nên trần khởi điểm có thể là 0 — nhưng một bảng bốn hàng với trần 0 thì chết ngay lần mở rộng đầu tiên. Con số này phải **đăng ký trong kế hoạch**, và nó là câu hỏi duy nhất chặn code. | chưa có mặc định — cần bạn quyết |
| GAP-M4-15 | Danh sách check của `omp doctor` (GAP-M1-18, theo GAP-D4) đã đóng chưa? | Đây là **chỗ duy nhất** để in ra, và GAP-D4 nói rõ mọi check mới phải tự chứng minh bằng một test. Thêm hàng này vào **sau** khi danh sách đã đóng đúng là cái bẫy mà GAP-D4 gọi tên. | chưa có mặc định — cần bạn quyết |
| M4-4 | Ba dòng CHANGELOG.md là việc làm hay chỉ là placeholder? | §6.2 nói M4 ship thành MỘT quyết định changelog gồm các wave B, C, D, và bản kế hoạch này không bao giờ tự viết entry. Hiểu sai thì ba dòng trong M4-4 sẽ biến thành entry thật và phá vỡ quyết định chung. | Theo cách đọc của kế hoạch: coi ba dòng CHANGELOG.md là placeholder để theo dõi, chưa viết entry; M4 gộp thành một quyết định changelog duy nhất. |
| M4-9 | Wave D đi chung quyết định changelog với B và C không? | `shippable: false` nghĩa là không thể phát hành riêng. Cần xác nhận chủ sở hữu đã cấp quyền bằng văn bản — nếu không, Wave D vẫn có thể mở PR và chỉ dừng ở bước release, tức công việc hoàn thành nhưng không đi được. | Theo §6.2: cả ba wave M4 gộp làm MỘT quyết định changelog, không wave nào phát hành trước khi quyết định đó tồn tại. |
| M4-7 | Có dòng changelog riêng cho `argsComplete` / `executionStarted` không? | Kế hoạch đọc việc sửa adapter là "cùng một dòng, và nó đóng một bug đang sống" — tức không tách. Phải chốt trước khi viết PR, vì changelog là một quyết định chung cho cả M4, và tác giả extension ngoài repo đúng là người duy nhất sẽ nhận ra sự khác biệt này. | Theo cách đọc của kế hoạch: không tách dòng, gộp vào dòng đổi tên `__partialJson`. |
| M4-6 | `provenanceNote` (bước 10) gắn vào description bền vững hay chỉ hiện sau một lượt ghi? | Gắn vào description bền vững thông tin hơn hẳn và không tốn gì, nhưng nó đổi description của MỌI dòng bị che — rộng hơn phạm vi hình ảnh mà kế hoạch vẽ, và danh sách được dựng lại mỗi lần chuyển tab (`#buildItemsForDefs` tại settings-selector.ts:1280). Câu hỏi yêu cầu xác nhận bằng số đếm settings thật, không phải ước lượng. | chưa có mặc định — cần bạn quyết |
| M4-7 | `renderContext` có sửa luôn trong PR này không? | Cùng hai adapter đó cũng hứt `renderContext` (`#renderState.renderContext` được set ở tool-execution.ts:960 và :1122 (đó là hai lệnh gán; 959 là dòng comment ngay phía trên, và 1121 chỉ mới là biến tạm `renderContext` chứ chưa gán vào `#renderState` — đừng dừng ở 959), và `RenderResultContextOptions` tại renderer.ts:30 sinh ra chính để mang nó). Kế hoạch chỉ nhắc `argsComplete` và `executionStarted`. Nhánh khuyến nghị là không sửa — nhưng phải ghi lại là việc còn lại, vì nếu không, bản sửa forwarding vẫn còn dang dở và người đọc sau sẽ không biết đó là một quyết định có chủ ý. | Không sửa `renderContext` trong PR này; ghi lại làm follow-up đã biết. |
| M4-7 | `rawArgs.complete` có thừa với `argsComplete` sẵn có không? | Hai nguồn sự thật cho một điều là chỗ trôi. Nhưng nếu hai cờ kia thực sự lệch nhau, sự lệch đó CHÍNH LÀ phát hiện và phải được nêu ra chứ không được bôi trơn. | Giữ cả hai: `argsComplete` đến từ sự kiện vòng đời qua `setArgsComplete`, còn `rawArgs.complete` mô tả buffer mà renderer thực sự cầm. Nếu thấy lệch, nêu ra chứ không sửa âm thầm. |
| M4-9 | Tên lệnh là gì? | Registry đã có `plugin`, `skill`, `config`; đặt sai tên thì phải viết lại help string. Câu hỏi yêu cầu chốt trước khi viết help string. | `extensions-triage` theo spec; không nhập nhằng với `plugin`, `skill`, `config`. |
| M4-9 | Xuất mặc định: bảng hay một dòng cho mỗi hàng? | Đây là hình dạng JSON mà test phải khẳng định; đổi sau khi viết test thì tốn việc. | Một dòng đã sanitize cho mỗi hàng, khớp với hình dạng `omp plugin list` tại packages/coding-agent/src/cli/plugin-cli.ts:644. |
| GAP-M4-10 | Chấp nhận thứ tự **merge trước GAP-M1-18**? | Sổ khoảng trống ghi nó là **bắt buộc**, không phải khuyến nghị: không có `LEDGER.md` thì `omp doctor` không có gì để báo. Nếu muốn đảo thứ tự thì phải đổi **cả hai** mục cùng lúc. | Giữ thứ tự đã ghi: GAP-M4-10 merge trước GAP-M1-18. |
| M4-4 | Cổng `secret` có thuộc gate của PR này không? | `grep -c secret manager.ts` đã bằng 0 ở baseline, nên nó không phân biệt được "M3-A4 đã merge" với "M3-A4 chưa từng tồn tại". Giữ làm cổng thì tốt, mô tả sai thì người đọc tin nhầm về trạng thái M3. | Giữ cổng, nhưng mô tả lại là một cổng M3 mà PR này không được phá vỡ, không dùng làm bằng chứng về trạng thái của M3-A4. |
| M4-9 | Với (b): `_shadowedBy` mang chuỗi hiển thị hay đường dẫn thô? | Chỉ có ý nghĩa nếu (b) được chọn — nếu (a) thì câu này thành vô nghĩa. Người dùng chỉ hành động được theo cái mình đọc được, và TUI inspector đã render dạng extension id rồi. | Mang extension id (ví dụ `skill:foo` qua `makeExtensionId`), theo khuyến nghị của câu hỏi; khớp với inspector-model.ts:466-482. |


---


## Đính chính so với plan tổng

Bốn mươi… không: **34 đính chính** trên bốn work item gốc của M4 — M4-4 (10), M4-6 (9), M4-7 (6), M4-9 (9) — cộng **7** trên sáu mục mới, tổng **41**. Bảy đính chính mới nằm ngay trong mục "Đính chính so với plan" của chính sáu mục `GAP-M4-10`..`GAP-M4-15` (10: 2, 11: 2, 12: 1, 13: 0, 14: 1, 15: 1), vì chúng đối chiếu với `.lavish-wip/GAP-REGISTER-2.md`, không phải với bản thảo tổng — nên chúng không có mục "Bằng chứng" riêng ở dưới đây mà đã nêu lệnh đo ngay trong cột thứ ba. M4-4 và M4-6 cùng nằm ở sóng B và phải gộp thành một PR, nên chúng được xếp cạnh nhau. M4-7 ở sóng C, M4-9 ở sóng D. Số thứ tự trong cột đầu là số thứ tự của đính chính **trong work item đó**, và mỗi mục "Bằng chứng" bên dưới dùng đúng số đó, nên đọc chéo được.

### Nhóm lỗi lặp — đọc một câu, các dòng cùng nhóm đã nói gọn

Có ba kiểu sai xuất hiện nhiều lần; các dòng cùng nhóm được rút gọn ở bảng và giữ chi tiết ở mục bằng chứng.

- **Đường dẫn của dsh bị đưa vào như thể nằm trong repo này** — xuất hiện đúng hai lần: M4-4 #2 và M4-6 #1. Cùng một lỗi, hai work item khác nhau đều dính; nói một lần ở M4-4 #2, M4-6 #1 trỏ ngược lại.
- **HEAD cũ 5873776** — xuất hiện đúng hai lần: M4-6 #9 và M4-9 #7. Cùng một lỗi, cùng một số; nói một lần ở M4-6 #9, M4-9 #7 trỏ ngược lại.
- **Lệch số dòng (off-by-one hoặc stale), nội dung kết luận vẫn đúng** — rải ở M4-4 #5, M4-4 #6, M4-6 #3, M4-6 #5, M4-7 #4, M4-9 #4. Ở mỗi dòng chỉ cần sửa con số.

Còn lại là các đính chính đổi cả hình dạng thay đổi, đổi tệp, hoặc đổi kết luận — những cái đó không rút gọn được.

---

### M4-4 (sóng B, gộp chung PR với M4-6) — 10 đính chính

| work item | claim của plan | verdict | đính chính |
| --- | --- | --- | --- |
| M4-4 #1 | Chi tiết (b): "Bọc `#saveRuntimeConfig` trong `withFileLock` và đọc lại config bên trong lock" | **WRONG** — làm đúng câu sẽ mất 100% ghi | Phép biến đổi phải dời **vào trong** phần khoá, dạng callback. Cả chín call site đều biến đổi `this.#runtimeConfig` đã memo **trước** khi gọi save (setEnabled 874-881 là ví dụ: `config.plugins[name].enabled = enabled;` rồi mới lưu). Đọc lại bên trong lock và ghi kết quả đọc lại là vứt mất chính thay đổi vừa áp dụng. Hình dạng đúng là một helper `#mutateConfig(mutate, application)` làm read → apply callback → diff → write, toàn bộ nằm trong `withFileLock`. **Không có phiên bản nào để chín call site hiện tại sống sót nguyên vẹn** — tất cả đều phải đổi hình dạng. |
| M4-4 #2 | `packages/boot/plugin-manager/src/types.ts:111-114` mô hình hoá ChangeResult, `packages/boot/plugin-manager/src/index.ts:772/774/787` là tiền lệ thực thi, `packages/boot/config-editor/src/index.ts:127-129` là tiền lệ rollback | **KHÔNG CÓ TRONG REPO NÀY** — tham chiếu ngoài | `packages/boot/` không tồn tại. Cả ba đều là trích dẫn từ dsh. Hợp lệ như tiền lệ thiết kế, nhưng kỹ sư không nên đi tìm chúng trong repo, và kiểu `ChangeResult` phải định nghĩa lại từ đầu ở đây chứ không sao chép. *Trùng loại với M4-6 #1.* |
| M4-4 #3 | `restart-required` do test khẳng định, và `setEnabled` nên báo nó "khi không có đường HMR" | **CHƯA ĐỦ** — "không có đường HMR" nghĩa là tải lại *một phần*, và kiểu dữ liệu chưa có điểm tựa | `restart-required` không xuất hiện ở đâu trong repo (0 hit). Reload của overlay settings rõ ràng là tải lại một phần: `settings-selector.ts:1329` → `selector-controller.ts:305-312` gọi `clearPluginRootsAndCaches`, `refreshSkillState`, `refreshSlashCommandState` và `resetCapabilities`, nhưng **không** gọi `refreshAgentDiscovery` — trong khi `reloadPlugins` thật sự gọi nó ở `acp-agent.ts:2167`. Câu trả lời trung thực cho đường overlay hiện tại là "đã áp dụng một phần", còn kiểu nhị phân `applied \| restart-required` không diễn đạt được. **Đây là quyết định của người đọc, không phải chi tiết lập trình — chưa có mặc định, cần bạn quyết** (xem open question M4-4-OQ1). |
| M4-4 #4 | `PluginSettingsMarketplaceManager.setPluginEnabled` là mutator thứ tư, cũng nằm trong package overlay này | **GỢI Ý SAI** — khác lớp, khác tệp, không phải writer của lockfile | Nó do `MarketplaceManager` cài tại `packages/coding-agent/src/extensibility/plugins/marketplace/manager.ts:686`, không phải `PluginManager`, và ghi registry marketplace qua `atomicWriteJson` — không bao giờ đi qua `#saveRuntimeConfig`. Không phải một trong chín writer. Nó chỉ dùng chung package overlay tui, nên việc mở rộng kiểu trả về của nó là một quyết định breaking **độc lập**. |
| M4-4 #5 | Trích `atomicWriteJson` từ `marketplace/registry.ts:44-70` | **LỆCH MỘT Ở CUỐI** | Hàm trải 44-71. Dòng 70 đóng catch bên trong, dòng 71 là dấu ngoặc đóng hàm. Xoá tới 71. |
| M4-4 #6 | Kiểm bề mặt export wildcard `packages/tui/package.json:93-96` trước khi ship | **LỆCH MỘT** | Khối export `'./*'` nằm ở dòng **94-97**. Kết luận plan rút ra (PluginSettingsManager tới được tay người dùng ngoài repo) vẫn đúng. |
| M4-4 #7 | Bằng chứng của M3-A4 là `grep -c secret manager.ts` → 0 | **ĐÃ BẰNG 0 Ở MỐC NỀN** — đây là canh gác hồi quy, không phải bằng chứng | Đếm được 0 ngay bây giờ trên HEAD 9cfbaba, nên không phân biệt được "M3-A4 đã vào" với "M3-A4 chưa tồn tại". Giữ làm canh gác mà PR này không được phá, nhưng đừng đọc nó là phát biểu về trạng thái của M3-A4. Va chạm thật là cả hai bản vá đều ghi lại `setPluginSetting` ở 942-949 — **phần này ĐÚNG và đã kiểm độc lập**. |
| M4-4 #9 | Chín call site, bảy cái đầu là mutator công khai (install / uninstall / link / setEnabled / setEnabledFeatures / setPluginSetting / deletePluginSetting) | **ĐÚNG — và plan thiếu một caller** | Cả chín số dòng đều khớp: 668 (install), 724 (uninstall), 855 (link), 880 (setEnabled), 919 (setEnabledFeatures), 948 (setPluginSetting), 958 (deletePluginSetting), 1221 (`#removeInvalidFeature`), 1231 (`#removeOrphanedConfig`). Cái plan thiếu là phía **consumer**, và phía đó có **tám** call site, không phải bốn. Bốn chỗ ở CLI: `packages/coding-agent/src/cli/plugin-cli.ts` — `setEnabledFeatures` (:761), `setPluginSetting` (:906), `deletePluginSetting` (:917), `setEnabled` (:1038). Bốn chỗ còn lại nằm ở tầng TUI, trong `packages/tui/src/overlays/plugin-settings.ts`: `setEnabled` (:776), `setEnabledFeatures` (:786), `setPluginSetting` (:790), `setPluginSetting` (:823). Cả tám đều là `await …setX(...)` trần, nên sau khi kiểu trả về được mở rộng chúng vẫn compile không đổi — tức là giá trị mới bị **âm thầm vứt bỏ** ở cả hai tầng trừ khi PR này còn đưa nó ra. Bốn chỗ TUI là nơi người dùng thực sự nhìn thấy kết quả, nên nếu PR chỉ sửa phía CLI thì lỗi "báo applied, không có gì đổi" — thứ M4 sinh ra để dập — vẫn sống nguyên trong UI. |
| M4-4 #10 | `withFileLock` ở `packages/utils/src/file-lock.ts:70` — đã xác nhận có mặt; cross-process by construction | **XÁC NHẬN CHÍNH XÁC** | Không có gì để sửa. `export async function withFileLock<T>` ở dòng 70; doc comment dòng 1-6 nói nguyên văn rằng Linux dùng abstract Unix socket, Windows dùng named mutex, các Unix khác dùng `flock(2)` trên `${filePath}.lock` — diễn giải của plan chính xác. Ghi lại là đã xác nhận vì **tuyên bố an toàn trung tâm** của plan dựa vào đây: một test khẳng định loại trừ lẫn nhau giữa hai instance trong cùng một tiến trình là bài tập hợp lệ của khoá này, vì tranh chấp nằm ở OS handle chứ không ở trạng thái tầng JS. |

#### Bằng chứng — M4-4

- **#1** — `sed -n '874,881p' packages/coding-agent/src/extensibility/plugins/manager.ts` và `sed -n '130,151p'` của cùng tệp: thứ tự biến đổi-rồi-lưu có ở mọi call site, và `#ensureConfigLoaded` (141-146) là nơi phát ra object dùng chung.
- **#2** — `ls packages/` không có mục `boot`. Đã đối chiếu với cây hiện tại tại HEAD 9cfbaba.
- **#3** — `git grep 'restart-required'` → 0 hit; `sed -n '303,312p' packages/coding-agent/src/modes/controllers/selector-controller.ts` so với `sed -n '2163,2169p' packages/coding-agent/src/modes/acp/acp-agent.ts`.
- **#4** — `git grep -n setPluginEnabled` → cài đặt ở `marketplace/manager.ts:686`; chín call site `#saveRuntimeConfig` đều nằm trong `manager.ts` và không cái nào tới được từ đó.
- **#5** — `grep -n 'async function atomicWriteJson'` → 44; `sed -n '70,72p'` cho thấy `\t}` rồi `}` rồi dòng trống.
- **#6** — `grep -n '"\./\*"' packages/tui/package.json` → 94; `sed -n '88,100p'` cho thấy khối mở ở 94, types/import ở 95-96, dấu ngoặc đóng ở 97.
- **#7** — `grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts` → 0. Dải 942-949 xác nhận bằng `async setPluginSetting` ở 942 và `await this.#saveRuntimeConfig();` ở 948.
- **#8** — Đo 2026-09-27: `bun test packages/utils/test/file-lock.test.ts` → "0 pass, 1 fail", "Failed to load pi_natives native addon for darwin-arm64"; `find packages/natives -name '*.node'` → rỗng; `bun --cwd=packages/natives run build` → **exit 1**: `CMake Error: CMake was unable to find a build program corresponding to "Ninja"` (thiếu `ninja`). **Đo lại 2026-09-29**, sau khi `brew install ninja` (1.13.2): build **exit 0**, `packages/natives/native/pi_natives.darwin-arm64.node` có mặt, và cùng lệnh test đó ra **4 pass / 0 fail** (`bun test packages/utils/test/` → 743 pass / 10 skip / 0 fail). `bun run check:ts` → exit 0, cả 16 package đều Done.
- **#9** — `git grep -n saveRuntimeConfig -- packages/` → 10 hit, trong đó 9 là call site khớp đúng liệt kê (668, 724, 855, 880, 919, 948, 958, 1221, 1231) và một là định nghĩa `#saveRuntimeConfig` ở `manager.ts:148`. `git grep -nE '\.(setEnabled|setEnabledFeatures|setPluginSetting|deletePluginSetting)\(' -- packages/ ':!*test*'` → **8 dòng**: 4 trong `cli/plugin-cli.ts` và 4 trong `tui/overlays/plugin-settings.ts`.
- **#10** — Đã đọc trọn `packages/utils/src/file-lock.ts` (100 dòng); test tiền lệ có sẵn ở `packages/utils/test/file-lock.test.ts` và `packages/utils/test/fixtures/file-lock-holder.ts`.

---

### M4-6 (sóng B, gộp chung PR với M4-4) — 9 đính chính

| work item | claim của plan | verdict | đính chính |
| --- | --- | --- | --- |
| M4-6 #1 | Hình dạng sửa lấy từ dsh tại `packages/boot/config-editor/src/index.ts:127-129` (throw "is overridden by a home patch or command-line overlay") và `:133-137` (rollback theo byte) | **WRONG** — tệp không tồn tại | Không có thư mục `packages/boot/` trong repo này; `ls packages/` cho ra agent, ai, browser-relay, catalog, coding-agent, collab-web, metaharness, mnemopi, natives, omptype, snapcompact, stats, tui, typescript-edit-benchmark, utils, wire. `grep -rn 'is overridden by a home patch' packages/` không trả về gì. **Đừng coi thiết kế rollback-theo-byte của dsh là tiền lệ có thể trích dẫn.** Tiền lệ thật trong repo là `packages/coding-agent/src/cli/config-cli.ts:295-318` (`handleSet`): nó kiểm chứng sau khi ghi bằng `globalValue` + `shadowingSource` và **in** bóng của giá trị ra màu vàng — không throw, không rollback. Phải đối chiếu với đó, và nêu rõ hai tiền lệ đang bất đồng (open question M4-6-OQ1). *Trùng loại với M4-4 #2.* |
| M4-6 #2 | `packages/tui/src/overlays/settings-selector.ts` có provenance switch ở dòng 325-357 | **WRONG** — dải đó sao chép từ config-cli.ts | 325-357 chứa `#showProviderList()` (bắt đầu ở 321) và `#showProviderEditor(provider)` (bắt đầu ở **363**; 361 là dấu ngoặc đóng của `#showProviderList`). **Hôm nay không có logic provenance ở bất kỳ đâu trong settings-selector.ts.** Dải 325-357 trùng từng byte với dải plan đưa cho `shadowingSource` trong config-cli.ts, tức plan đã nhân bản một dải số dòng sang hai tệp. Không có gì để giữ hay nâng từ phía tui; tệp tui chỉ liên quan ở 13 call site. |
| M4-6 #3 | 13 chỗ `settings.set(` nằm ở dòng 346, 390, 869, 872, 1155, 1193, 1195, 1209, 1211, 1213, 1215, 1244, 1251 | **STALE** — đếm đúng, mọi số dòng sai | Con số 13 đúng tuyệt đối và **thứ tự khớp 1:1**, nhưng số dòng lệch +3 cho hai chỗ đầu và +7 cho mười một chỗ còn lại. Dòng thật: 349, 393, 876, 879, 1162, 1200, 1202, 1216, 1218, 1220, 1222, 1251, 1258. Lúc triển khai, lấy từ output grep chứ đừng dùng số của plan. |
| M4-6 #4 | `shadowingSource` nằm ở `packages/coding-agent/src/cli/config-cli.ts:325-357` | **SAI MỘT PHẦN** — đầu đúng, cuối sai, và thiếu một hàm bạn đồng hành | `shadowingSource` bắt đầu ở 325 (đúng) nhưng thân hàm kết thúc ở **360**, không phải 357. Quan trọng hơn: plan không nhắc `globalValue` ở `config-cli.ts:318-322` — đó là hàm bạn cần để đọc giá trị global trước khi ghi, tức là **thuỷ tinh của rollback**. Cả hai đều module-private (không có trong export list) và **phải đi cùng nhau**, nếu không host sẽ tự cài lại một trong hai. Nâng cả hai vào module dùng chung mới, với tham số tường minh `scope: Settings`, để settings host và CLI dùng chung một cài đặt. |
| M4-6 #5 | `provenance(scope)` ở `registry.ts:763-766`, kiểm tra env ở `:764` | **ĐÚNG PHẦN LỚN** — sub-anchor lệch một | Dải 763-766 đúng. Dòng 764 là **chữ ký** `provenance(scope: ScopeLike): SettingProvenance {`; phép kiểm `#effectiveEnv` nằm ở dòng **765**. Dùng 765. |
| M4-6 #6 | `settingsOf(scope).getProvenance()` không bao giờ trả về `'env'`, nên dùng `setting.provenance(scope)` | **XÁC NHẬN** — đã đối chiếu mã nguồn | Đúng, và đáng giữ thành một quy tắc tường minh. `Settings.getProvenance` (`settings.ts:800-808`) đi qua `#overrides` → `#configOverlay` → `#project` → `#global` → parent và **không có nhánh env nào cả**; chỉ `Setting.provenance` (`registry.ts:765`) còn lớp kiểm `#effectiveEnv` lên trên. Lưu ý thêm: union đầy đủ là **sáu** thành viên, không phải năm — `"env" \| "runtime" \| "overlay" \| "project" \| "global" \| "default"` (`settings.ts:62`); kiểu mirror ở tui phải mang đủ sáu. |
| M4-6 #7 | Work item là "guard all 13 sites" | **QUAN SÁT ĐÚNG, ĐƯỜNG MAY SAI** | 13 chỗ là danh mục đúng, nhưng là nơi sai để cưỡng chế bất cứ điều gì. Cả 13 đều là caller của `SettingsHost.set` **trong một tệp**, và `SettingsHost.set` có đúng một cài đặt sản xuất — `createSettingsHost` tại `settings-ui.ts:77`. Cưỡng chế guard bên trong `set` đó phủ hết 13 chỗ và không thể bị chính M3 lái thêm một panel thứ 14 đánh bại. Grep toàn repo `settings.set(` / `#settings.set(` trong packages/tui trả về đúng 13 dòng đó và không gì khác. Cảnh báo của chính plan về danh sách hardcode là manh mối dễ vỡ nhất là đúng — cách sửa là **xoá danh sách khỏi thiết kế**, đừng bảo trì nó cẩn thận hơn. |
| M4-6 #8 | `SettingsHost` là rủi ro interface xuyên package, "đúng như `PluginSettingsManager`" | **XÁC NHẬN**, kèm một lưu ý làm giảm mức nghiêm trọng | Hình dạng "cấu trúc thoả mãn" là có thật: tui khai báo `SettingsHost`, coding-agent thoả mãn trong `createSettingsHost` (`settings-ui.ts:51`, import kiểu ở dòng 2), và `packages/tui/package.json` export wildcard `'./*' -> './src/*.ts'`, nền về lý thuyết bên ngoài repo vẫn cài được. Nhưng grep chỉ ra **một** cài đặt sản xuất trong repo này. M4-6 thêm một thành viên mới (bổ sung, không đổi chữ ký); M4-4 mới là đổi **kiểu trả về** của một phương thức đã có, và đó mới là phần breaking thật. M4-6 là nửa rủi ro thấp hơn của sóng B. |
| M4-6 #9 | Ngữ cảnh nhiệm vụ nói repo ở git HEAD 5873776 | **STALE (đã stale lần nữa)** | Khi đính chính này viết, HEAD là 808b365. Cây đã đi tới **9cfbaba** (`docs(m3): execution plan…`, kế 808b365 và e040a60 `docs(m2): execution plan…`), trên nhánh milestone-1. Trong hai commit đó `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` được viết lại từ 10234 lên 13776 dòng, nên **mọi con trỏ dòng vào tài liệu tổng trong bộ đính chính này đều đã chết** — kể cả 7958-7960 (M4-7 #6) và 6815 (M4-9 #8). Các neo vào *mã nguồn* trong repo vẫn còn đúng: `git diff --stat 808b365..HEAD -- packages/` rỗng, hai commit kể chỉ đụng file tài liệu. Trước khi triển khai, hãy tìm lại hai mục đó bằng nội dung (`grep -n 'Wave C — Hợp đồng render'`, `grep -n 'extension-load-order-determinism'`) chứ không theo số dòng. *Trùng loại với M4-9 #7.* |

#### Bằng chứng — M4-6

- **#1** — `ls packages/`; `find . -type d -name config-editor` → không có kết quả; `grep -rn 'overridden by a home patch' --include='*.ts' packages/` → không có kết quả; `sed -n '295,318p' packages/coding-agent/src/cli/config-cli.ts`.
- **#2** — `sed -n '320,400p' packages/tui/src/overlays/settings-selector.ts`; `grep -n '#showProviderList\|#showProviderEditor' packages/tui/src/overlays/settings-selector.ts`.
- **#3** — `grep -n 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` → 13 dòng; `grep -c` → 13.
- **#4** — `grep -n 'shadowingSource\|globalValue' packages/coding-agent/src/cli/config-cli.ts` → 307, 318, 325; `sed -n '353,360p'` cho thấy dấu ngoặc đóng ở 360; `grep -n '^export' packages/coding-agent/src/cli/config-cli.ts` → 5 export, không hàm nào trong số đó.
- **#5** — `grep -n 'provenance(scope\|#effectiveEnv' packages/coding-agent/src/config/registry.ts` → 526 (định nghĩa), 538, 764, 765.
- **#6** — `sed -n '795,815p' packages/coding-agent/src/config/settings.ts`; `sed -n '764,766p' packages/coding-agent/src/config/registry.ts`; `grep -n 'export type SettingProvenance' packages/coding-agent/src/config/settings.ts` → dòng 62.
- **#7** — `grep -rn 'settings\.set(\|#settings\.set(' --include='*.ts' packages/tui/src/` → 13 kết quả, tất cả trong settings-selector.ts; `grep -rn 'SettingsHost' --include='*.ts' packages/` → cài đặt duy nhất `createSettingsHost`.
- **#8** — `grep -rn 'SettingsHost' --include='*.ts' packages/`; `sed -n '80,110p' packages/tui/package.json` cho thấy `'./*': { types: './src/*.ts', import: './src/*.ts' }`.
- **#9** — `git rev-parse --short HEAD` → 9cfbaba.

---

### M4-7 (sóng C) — 6 đính chính

| work item | claim của plan | verdict | đính chính |
| --- | --- | --- | --- |
| M4-7 #1 | §M4-7 "Vị trí": `packages/tui/src/chat/chat-transcript-builder.ts:446`, `:454`, `:513` — "đường render thứ ba" | **SAI TỆP** — neo không tồn tại | Đường thứ ba là `packages/coding-agent/src/modes/utils/ui-helpers.ts:605` (`decodeStreamedToolArgs(partialJson, {...})`, dưới chú thích "Mid-stream rebuild (theme change, settings, focus replay)"), đi tới constructor của component ở :611 (608-610 là phần đóng đối số của chính lời gọi ở :605). `git grep -n 'partialJson\|__partialJson\|decodeStreamedToolArgs' packages/tui/src/chat/chat-transcript-builder.ts` trả về **không hit nào** trong toàn bộ 597 dòng — tệp đó lo gộp nhóm read (`readArgsCollapseIntoGroup`, `#ensureReadGroup`, `normalizeToolArgs`) và không chạm vào raw buffer. Người triển khai theo plan sẽ nối đường rebuild vào một tệp không có đường ống raw-arg nào, và test (2) của plan sẽ được viết trên một seam không thể hỏng. |
| M4-7 #2 | §M4-7 "Chi tiết" bước 1: "sửa short-circuit ở `tool-execution.ts:388-394`…", trình bày như một lỗi sống đang được sửa | **ĐỊNH KHUNG SAI** — số dòng đúng, chẩn đoán thì không | Short-circuit **đúng ngay hôm nay**. `displayArgsForPrefix` cấp phát một args object mới ở mọi frame mà tiền tố raw lớn lên (`const rawPrefixChanged = entry.exposeRawPartialJson && prefix !== entry.displayPrefix;` ở :424, rồi một literal mới ở :428), trả `changed: true` ở :431, và `#tick` chỉ gọi `updateArgs` bên trong `if (display.changed)` (:614-616) — nên danh tính tham chiếu của args đổi đúng lúc tiền tố raw lớn lên, và `#displayInputVersion++` có bắn. Early return ở :392 là hợp lý. Nó **chỉ thành sai** như hệ quả của bước 2: một khi `rawArgs` là side channel, args đã decode có thể reference-identical trong khi `rawArgs.json` đã lớn lên, và guard sẽ nuốt frame. Nên bước 1 không phải bản vá lỗi, mà là **guard-rail làm bước 2 an toàn** — đó là lý do thứ tự là gánh. Chính plan đã nêu đúng yêu cầu ("nhưng phải tiến version khi chỉ phần tiền tố raw đổi"); chỉ có cách trình bày như lỗi có sẵn là sai, và chú thích ở :388-391 ("Callers always allocate a new arg object on each streamed delta") thành sai **đúng vào cái thời điểm bước 2 hạ cánh** — phải viết lại, không giữ. |
| M4-7 #3 | §M4-7 "Chi tiết" bước 2: "sửa hai adapter ở `wrapper.ts:59-64` và `sdk.ts:1217-1223` để forward toàn bộ options object thay vì object literal" — ngụ ý cả `renderCall` lẫn `renderResult` đều bị thu hẹp ở cả hai chỗ | **CHẨN ĐOÁN ĐÚNG, PHẠM VI THIẾU** — và plan nói rơi hai field ở nơi có bốn | Chỉ **`renderResult`** bị thu hẹp. `wrapper.ts:55-57` forward thẳng `options` cho `renderCall` (`registeredTool.definition.renderCall!(args, options, theme as Theme)`), và `sdk.ts:1212` là tham chiếu trần `renderCall: tool.renderCall`, không có wrapper nào. Người triển khai "sửa đối xứng cả hai adapter" sẽ đụng vô nửa `renderCall` để không, tệ hơn là có thể thêm một cast thu hẹp ở đó và làm hỏng **đúng con đường đang chạy được**. Riêng ra: adapter **rơi bốn field, không phải hai** plan nêu. Ngoài `argsComplete` và `executionStarted`, chúng còn rơi `renderContext` — mà `#rebuildDisplay` đặt ở `tool-execution.ts:960` (nhánh custom, dòng 959 là chú thích ngay phía trên) và :1122 (nhánh built-in; :1121 là dòng `const renderContext = this.#buildRenderContext();`), và mà `RenderResultContextOptions` (`renderer.ts:30`, dùng ở :75) sinh ra để mang. Renderer built-in nhận được nó; renderer của extension **chưa bao giờ**. Drift rộng hơn plan nói, và bản vá sửa luôn một lỗi sống thứ ba. |
| M4-7 #4 | §M4-7 "Vị trí": `packages/coding-agent/src/extensibility/extensions/types.ts:581-588` cho `ToolRenderResultOptions`, dùng ở `:661` (`renderCall`) và `:664` (`renderResult`) | **STALE KHOẢNG 25 DÒNG** | `ToolRenderResultOptions` nằm ở `types.ts:606-613` (chú thích ở :605), không phải 581-588. Chỗ dùng là `types.ts:686` (`renderCall?: (args, options: ToolRenderResultOptions, theme) => Component`) và `types.ts:691` (`renderResult?: (result, options, theme, args?) => Component`), không phải :661/:664. **Khẳng định nội dung của plan vẫn nguyên vẹn** — đã xác minh interface chỉ khai báo `expanded`, `isPartial` và `spinnerFrame`, và thật sự thiếu cả `argsComplete` lẫn `executionStarted` mà `RenderResultOptions` (`renderer.ts:10-27`) đã mang từ lâu. Chỉ số dòng cần sửa. |
| M4-7 #5 | §M4-7 "Rủi ro" (1): "Sáu file test trỏ tới chuỗi literal" | **XÁC NHẬN CHÍNH XÁC** | Đúng — đúng sáu file test tham chiếu `__partialJson`. Chuyển tiếp không đổi, kèm lưu ý: dưới nhánh được khuyến nghị của open question M4-7-OQ1 (chỉ đổi tên khoá xdev bên trong) **không file nào trong sáu cần sửa**, vì cả sáu đều khẳng định trên khoá **ngoài**. Kỳ vọng của plan rằng chúng "được kỳ vọng phải cập nhật" chỉ đúng ở nhánh đổi tên khoá ngoài. Bất kỳ nhánh nào, cảnh báo của plan vẫn đứng vững: đọc từng khẳng định và xác nhận nó còn mô tả hành vi thật — một test ghim "renderer nhận raw prefix" không được lặng lẽ bị đảo thành "renderer nhận args bên trong". |
| M4-7 #6 | §M4-7 "Phụ thuộc": ràng buộc duy nhất còn lại là ràng buộc thứ tự bề mặt với M2 WI-4, và M4-7 không được mở PR trước khi WI-4 — đã có sẵn trong §11 và đã đặc tả xong — được chốt | **XÁC NHẬN** — không có ràng buộc build, quy tắc thứ tự đúng | Đã kiểm bằng soi mã: `git grep -n 'packages/tui/src/tools/renderer-registry'` không có tệp này, và không work item M4 nào khác chạm `packages/tui/src/tools/`. Ràng buộc thật sự là thứ tự khuyến nghị, không phải ràng buộc build — work item này có thể triển khai và review độc lập, nhưng PR của nó không được merge trước một WI-4 đã review. Cũng đã xác nhận độc lập bằng chính văn bản gate của plan: sóng C là `shippable: false` (§6.3) và §6.2 nói không sóng M4 nào ship trước quyết định changelog M4 duy nhất cho cả sóng B, C và D. |

#### Bằng chứng — M4-7

- **#1** — `git grep -n 'partialJson\|__partialJson\|decodeStreamedToolArgs' -- packages/tui/src/chat/chat-transcript-builder.ts` → 0 match. `git grep -n 'decodeStreamedToolArgs' -- packages/` → caller sản xuất duy nhất là ui-helpers.ts:605 (cộng định nghĩa ở tool-args-reveal.ts:455 và bộ bench). `wc -l` = 597.
- **#2** — `tool-args-reveal.ts:424` `const rawPrefixChanged = entry.exposeRawPartialJson && prefix !== entry.displayPrefix;`; :427-429 tính `displayPrefix` + literal args mới ở :428, và `changed: true` ở :431; :613-616 `const display = displayArgsForPrefix(...); if (display.changed) { entry.component.updateArgs(display.args, id); ... }`. `tool-execution.ts:392` `if (args === this.#args) return;` nằm trên :394 `this.#displayInputVersion++;`, và :800 xác nhận version đó đi vào repaint key.
- **#3** — `sed -n '54,66p' packages/coding-agent/src/extensibility/extensions/wrapper.ts` — :55-57 renderCall truyền thẳng `options`, :59-65 renderResult dựng lại. `sed -n '1212,1222p' packages/coding-agent/src/sdk.ts` — :1212 là `renderCall: tool.renderCall` trần, :1217 là literal thu hẹp. `git grep -n 'renderContext' -- packages/coding-agent/src/extensibility/` → 0 hit (bề mặt extension không hề có khái niệm này). `git grep -n RenderResultContextOptions -- packages/` → chỉ renderer.ts:30 và renderer.ts:75.
- **#4** — `sed -n '605,614p' packages/coding-agent/src/extensibility/extensions/types.ts` → interface nguyên văn. `git grep -n 'ToolRenderResultOptions' -- packages/` → types.ts:606 (khai báo), :686, :691 (dùng). `sed -n '10,27p' packages/tui/src/tools/renderer.ts` → `RenderResultOptions` với `argsComplete?` khai báo ở **:21** và `executionStarted?` khai báo ở **:26** (dải 10-27 là ranh giới interface; 19 và 24 là dòng chú thích doc bên trong, không phải dòng khai báo).
- **#5** — `git grep -n '__partialJson' -- packages/*/test/` → `packages/coding-agent/test/modes/controllers/event-controller-args-reveal.test.ts` (:140,:141,:183), `packages/coding-agent/test/tool-args-reveal.test.ts` (:34,:36,:260), `packages/coding-agent/test/tools/edit-renderer.test.ts` (:53,:417), `packages/tui/test/bash-render.test.ts` (:57), `packages/tui/test/json-tree-render.test.ts` (:32), `packages/tui/test/tool-execution-custom-repaint.test.ts` (:23,:88,:98,:144,:161). Cả sáu đều đọc output đã render hoặc trạng thái object sống — không tệp nào source-grep tệp cài đặt, nên cả sáu vẫn hợp lệ.
- **#6** — `ls packages/tui/src/tools/` không có renderer-registry.ts. `grep -n 'Wave C — Hợp đồng render' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` → :11500, nguyên văn "**Shippable:** `false`. Thứ một `xd://` renderer nhận thay đổi, và `__partialJson` đổi khoá — cả hai quan sát được. Chờ cùng cửa changelog của M4 (mục 6.2)." *(Số dòng 7958-7960 từng ghi trong bản cũ đã chết: tài liệu tổng dài 10234 → 13776 dòng. Xem M4-6 #9.)*

---

### M4-9 (sóng D) — 9 đính chính

| work item | claim của plan | verdict | đính chính |
| --- | --- | --- | --- |
| M4-9 #1 | `packages/coding-agent/src/modes/components/extensions/state-manager.ts:69` (`loadAllExtensions`) | **XÁC NHẬN** | Không có gì để sửa. Dòng 69 là `export async function loadAllExtensions(cwd?: string, disabledIds?: string[]): Promise<Extension[]>`. |
| M4-9 #2 | `shadowedBy` được đọc ở `state-manager.ts:103` và không call site `addItems` nào truyền `getShadowedBy`, nên nó luôn là `undefined` (grep toàn repo trả về đúng 2 hit) | **XÁC NHẬN** — đây là khẳng định cốt lõi của plan và nó đúng tuyệt đối | Không có gì để sửa. Tiêu chí thoát mà plan đặt cho phương án (a) là có thật: đặt tên nguồn che khuất là điều **không thể làm được nếu không có code mới**, nên công sức S thật sự lạc quan cho (b) và thật sự rẻ cho (a). Mang cái này đi tiếp với lòng tin. |
| M4-9 #3 | Nguyên nhân gốc ở `packages/coding-agent/src/capability/index.ts:247` và `:271`, nơi `item._shadowed = true` gán boolean trần và bị loại mất | **XÁC NHẬN**, kèm một bổ sung quan trọng mà plan bỏ sót | Hai chỗ `_shadowed = true` đúng ở :247 và :271 — nhưng **khôi phục lại kẻ thắng cần thêm ba chỉnh sửa nữa** mà plan không nhắc, nếu không bản vá sẽ compile và im lặng không làm gì. (i) `seen` khai báo là `const seen = new Set<string>()` ở :228 — chỉ khoá, không giữ tham chiếu item, nên nhánh `keySeen` ở :242/:264 chẳng có gì để đặt tên; nó phải thành `Map<string, T & { _source: SourceMeta }>`, với `seen.add(key)` ở :255 và :265 thành `seen.set(key, item)`. (ii) `aliasSeen` được tính bằng `deduped.some(...)` ở :246 và :269, trả boolean chứ không phải phần tử khớp — cả hai phải thành `.find(...)`. (iii) các kiểu giao cạn tại chỗ `index.ts:144, :145, :146, :211, :218` và kiểu công khai ở `types.ts:165` đều khai báo `_shadowed?: boolean`, phải có thêm field mới thì phép gán mới type-check. Người triển khai theo plan đúng nghĩa sẽ tạo ra code qua `bun run check:ts` và báo `undefined` mãi mãi. |
| M4-9 #4 | `packages/coding-agent/src/modes/acp/acp-agent.ts:1189-1196` (route `_omp/extensions`) | **GẦN NHƯ XÁC NHẬN** — lệch một ở cuối | Khối `case "_omp/extensions":` là dòng **1189-1195**. Dòng 1196 là `case "_omp/extensions/toggle":`, tức route kế tiếp. Quan trọng hơn: khối này còn gánh tải ngoài cái plan dùng nó để lấy. Dòng 1191-1193 là `const sm = await Settings.init(); const disabledIds = cfgDisabledExtensions.get(sm);` và chúng chính là **điều hoà runtime-với-CLI mà lệnh mới phải sao chép**. Plan trích route này chỉ như chỗ dữ liệu đã lộ ra; người đọc lướt qua sẽ bỏ sót yêu cầu đối chiếu và ship một CLI báo thiếu mọi disable ở mức item. |
| M4-9 #5 | Lệnh: `bun check && bun test packages/coding-agent/test/ -t 'acp'`. Kiểm thử: test snapshot/CSV trên cây fixture có một extension bị che | **SAI CẢ HAI** | Lệnh test rỗng với work item này. `bun test -t <pattern>` lọc theo **TÊN test**, không theo tên tệp — các test acp sẵn có đặt tên theo `describe("ACP agent")` (`packages/coding-agent/test/acp-agent.test.ts:556`), đó là lý do `-t 'acp'` bắt được chúng. Test extensions-triage mới sẽ không mang tên "acp", nên lệnh này không chạy dòng code mới nào và vẫn xanh trên một cài đặt hoàn toàn hỏng. Thay bằng `bun test packages/coding-agent/test/extensions-triage-cli.test.ts`. Riêng `bun check` chạy cả `check:ts` và `check:rs`; Rust là toolchain riêng không thuộc work item này, còn `bun test` sau khi build addon một lần thì chạy được, nên `check:ts` vẫn là cổng TS trung thực ở đây. Về **kiểu test**: AGENTS.md cấm khẳng định "wording/defaults" và test snapshot-của-fixture, và đòi test phải bảo vệ một hợp đồng quan sát được **có tên**. Vậy nên: đừng snapshot CSV/text. Hãy khẳng định phép biến đổi — mỗi extension một hàng khoá theo id, trạng thái lấy từ union thật, có một hàng bị che, một hàng bị policy-disable mang `disabledReason` không rỗng. Định dạng văn bản không phải hợp đồng được bảo vệ, và khẳng định nó sẽ là test wording bị cấm. |
| M4-9 #6 | Tệp mới `packages/coding-agent/src/cli/extensions-triage-cli.ts` + đăng ký vào command registry của coding-agent | **THIẾU** — thiếu hai tệp so với nói | Registry **không** nạp các module `-cli.ts`. `cli-commands.ts:99` cho ra hình dạng: `load: () => import("./commands/config").then(m => m.default)`. Lệnh mới cần **ba tệp cộng một mục registry**: (1) `src/cli/extensions-triage-cli.ts` — cài đặt; (2) `src/commands/extensions-triage.ts` — lớp `Command` mỏng `export default` nó, khớp 50 wrapper đã đăng ký trong `cli-commands.ts`; (3) một mục `extensionsTriageHelp` trong `src/cli/command-help.ts` ở dạng `{ description } satisfies CommandMetadata`; (4) `CommandEntry` trong `src/cli-commands.ts`. Chỉ dựng tệp plan nêu sẽ tạo ra một module không có gì định tuyến tới — và vì **mục registry thiếu làm `runCli` rơi xuống và chuyển argv thành prompt gửi tới mô hình** (hồi quy #1496, ghi ngay trong header của chính tệp đó), lệnh sẽ trông như chạy được trong demo và hỏng trong dùng thật. |
| M4-9 #7 | Môi trường nêu: git HEAD 5873776 | **STALE — HEAD thật là 9cfbaba** | Cây làm việc ở 9cfbaba ("docs(m3): execution plan for milestone 3"), trên nhánh milestone-1. **Mọi neo dạng `file:line` trong spec này đã được kiểm trên 808b365 và vẫn còn hiệu lực** — `git diff --stat 808b365..HEAD -- packages/` rỗng, hai commit kể chỉ đụng file tài liệu. Nhưng chúng đụng `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (10234 → 13776 dòng), nên **hai con trỏ dòng vào tài liệu tổng ở M4-7 #6 và M4-9 #8 đã chết** — tra lại bằng nội dung. Nếu ý bạn là commit khác nữa, phải kiểm lại trước khi triển khai. *Trùng loại với M4-6 #9.* |
| M4-9 #8 | Phụ thuộc: "M2 WI-2 (post-sort) merged" | **XÁC NHẬN là chưa thoả** — đây là tiền đề, không phải sự thật đã xảy ra | WI-2 không có trong cây, nên **M4-9 hiện chưa khởi động được**. Plan liệt kê nó là phụ thuộc, nhưng người đọc dễ tưởng nó đã hạ cánh. Làm cho cổng này tường minh ở bước 2 thay vì để làm giả định nền. Sản phẩm bàn giao của chính WI-2 là tệp `packages/coding-agent/test/extension-load-order-determinism.test.ts` (tra trong plan bằng `grep -n 'extension-load-order-determinism'`, không theo số dòng — xem M4-6 #9) — đó là thứ rẻ nhất để đi dò. |
| M4-9 #9 | (Ngầm) `shadowedBy` là một field với một nghĩa | **GỢI Ý SAI** — tên này bị nạp đầy ở ba hệ thống không liên quan | Trước khi đụng vào, biết rằng `shadowedBy` **đã** mang hai nghĩa khác trong codebase này, và cả hai đều không phải capability-shadowing mà plan nói về. (a) Tóm tắt plugin trong marketplace dùng `shadowedBy?: "project"` (`packages/coding-agent/src/extensibility/plugins/marketplace/types.ts:196`, tài liệu ở :188), render bởi `builtin-marketplace.ts` và `plugin-settings.ts`. (b) Giao thức cấu hình người dùng nội bộ dùng `shadowedBy?: string` để nghĩa là "cấu hình user của bạn bị cấu hình project của bạn ghi đè" (`packages/coding-agent/src/internal-urls/cfg-protocol.ts:83`, render ở `interactive-mode.ts:5970-5971`). Chỉ `Extension.shadowedBy` ở tui là thứ work item này nói tới. Nhập nhằng chúng là sai lầm dễ nhất trong tệp này, và sẽ tạo ra một bản kiểm kê báo shadowing ở tầng plugin trông như shadowing ở tầng capability. |

#### Bằng chứng — M4-9

- **#1** — `sed -n '55,130p' packages/coding-agent/src/modes/components/extensions/state-manager.ts` — chữ ký xuất hiện ngay sau chú thích doc "Load all extensions from all capabilities."
- **#2** — `git grep -n 'getShadowedBy' -- packages/` trả về đúng 2 dòng: `state-manager.ts:81` (`getShadowedBy?: (item: T) => string | undefined;`) và `state-manager.ts:103` (`shadowedBy: opts?.getShadowedBy?.(item),`). `git grep -n 'addItems' -- packages/` cho thấy 6 chỗ gọi ở :116, :127, :138, :149, :209, :220, không chỗ nào truyền option. Được củng cố ở phía dưới: `isShadowedExtension` và renderer "Shadowed by X" tại `inspector-model.ts:466-482` của TUI đã xử lý field này, nên một chuỗi không bao giờ tới là điều nhất quán với hành vi quan sát được.
- **#3** — `grep -n 'seen = new Set<string>\|deduped.some\|seen.has(key)\|seen.add(key)\|_shadowed = true' packages/coding-agent/src/capability/index.ts` → 228, 242, 243, 246, 247, 255, 264, 265, 266, 269, 271, 273. `sed -n '274,320p'` xác nhận đường sống sót lại ở :273. `sed -n '150,180p' packages/coding-agent/src/capability/types.ts` xác nhận `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>` ở :165. Cùng grep đó còn xác nhận `return { items: deduped, all: ...allItems }` ở :291-296 — item bị che bị loại khỏi `items` nhưng **có mặt trong `all`**, và `loadAllExtensions` đọc `all`. Nên các hàng bị che thật sự đi tới CLI với `state: "shadowed"`.
- **#4** — `sed -n '1189,1196p' packages/coding-agent/src/modes/acp/acp-agent.ts | cat -n` → 1189 case, 1190 cwd, 1191 Settings.init, 1192 cfgDisabledExtensions.get, 1193 loadAllExtensions(cwd, disabledIds), 1194 return, 1195 dấu ngoặc đóng, 1196 case kế tiếp. Import xác nhận ở :48 (`Settings`) và :88 (`cfgDisabledExtensions`).
- **#5** — `grep -n 'describe(' packages/coding-agent/test/acp-agent.test.ts` → :556 `describe("ACP agent")`, :2832, :3437 — là **tên**, không phải tên tệp. `grep -n '"check"\|"check:ts"\|"test"' package.json` → :89 test, :93 check, :94 check:ts. Ngày 2026-09-27 không có artifact `.node` nào của `pi_natives` trong cây, khớp với lỗi addon khi đó; ngày 2026-09-29 đã build xong (`packages/natives/native/pi_natives.darwin-arm64.node`).
- **#6** — `sed -n '1,60p' packages/coding-agent/src/cli-commands.ts` và `grep -n -A4 'name: "config"'` → :98-101. `cat packages/coding-agent/src/commands/config.ts` cho thấy chuỗi wrapper→impl→helpHelp đầy đủ. `find packages/coding-agent/src/commands -maxdepth 1 -name '*.ts' | wc -l` → **52** module trong thư mục, trong đó **50** được `cli-commands.ts` đăng ký (`grep -cE '^\t\tname: "'` → 50) — phần chênh là `launch-help.ts` (chỉ xuất metadata `launchHelp`) và `settings.ts` (module khai báo setting, không phải command). `sed -n '1,40p' packages/coding-agent/src/cli/command-help.ts` và `git grep -n -A6 'interface CommandMetadata' packages/utils/src/cli.ts` (:136-142) xác nhận hình dạng help.
- **#7** — `git rev-parse --short HEAD` → 9cfbaba; `git status` cho thấy chỉ có thư mục `.lavish-wip/` chưa track, nên cây sạch tại commit đó.
- **#8** — `ls packages/coding-agent/test/extension-load-order-determinism.test.ts` → No such file or directory. `git grep -n 'extension-load-order' packages/coding-agent/` → 0 hit. `grep -n 'extension-load-order-determinism' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` → :4995, nguyên văn "File test mới". *(Số dòng :6815 từng ghi trong bản cũ đã chết: tài liệu tổng dài 10234 → 13776 dòng. Xem M4-6 #9.)*
- **#9** — `git grep -rn 'shadowedBy' -- packages/` trả về **40 hit trên 17 tệp**, thuộc nhiều hệ thống không liên quan; ba cái nêu trên nằm ở `marketplace/types.ts:196`, `cfg-protocol.ts:83` và `tui/overlays/extensions/types.ts:68`. (Con số "35 hit" và "sáu hệ thống" trong bản cũ là của một lần đếm khác; đếm lại ở 808b365 cũng ra 40, nên đây là lỗi đếm chứ không phải HEAD trôi.)

---

### Ba quyết định còn treo, chưa có mặc định

Các đính chính trên có ba chỗ dừng ở ranh giới dữ liệu, và cả ba đều cần người đọc quyết trước khi code:

*Ba nhãn dưới đây được đặt lại theo `questions.json`; nhãn `open question 1` cũ đã từng dùng cho hai câu hỏi khác nhau ở M4-4 và M4-7, đừng tra theo nhãn đó.*

- **open question M4-7-OQ1** — nhánh nào khi đổi tên khoá `__partialJson`: đổi khoá xdev bên trong, hay đổi khoá ngoài. Quyết định này đổi luôn kết luận về sáu file test của M4-7 #5. Chưa có mặc định — cần bạn quyết.
- **open question M4-4-OQ1** — khi `setEnabled` báo trạng thái sau khi đổi, có `restart-required` không, và kiểu nhị phân `applied | restart-required` có phải thay bằng ba trạng thái để nói "đã áp dụng một phần" không. Chưa có mặc định — cần bạn quyết.
- **open question M4-6-OQ1** — hai tiền lệ hiện có đang bất đồng: `config-cli.ts` thì in cảnh báo bằng màu vàng, còn thiết kế của dsh thì throw rồi rollback theo byte. Reconcile theo hướng nào, và rollback có quay về tiền lệ dsh hay ở lại trong repo. Chưa có mặc định — cần bạn quyết.


---


## Định nghĩa hoàn thành

Mỗi dòng là một cổng có thể đỏ, phát biểu để phán đoán được đúng hay sai. Cổng xanh trên một work item không kéo theo work item khác xanh.

| work item | điều kiện phải đúng | bằng chứng cụ thể |
| --- | --- | --- |
| M4-4 | Sáu bước xác minh xanh theo thứ tự, **với native addon đã build**; phòng thủ thật duy nhất là test tranh chấp, và nó phải **đỏ** khi xoá hẳn `withFileLock` khỏi `#mutateConfig` — một cổng chưa từng thấy đỏ thì không phải cổng; `git grep -n saveRuntimeConfig -- packages/` ra 0 hit; `git grep -n atomicWriteJson -- packages/` ra đúng một định nghĩa, trong `packages/utils`; `grep -c secret .../manager.ts` ra 0; `bun run check:ts` xanh; **và** đã có quyết định bằng văn bản về câu hỏi mở số 1 (ai sở hữu `application`) | `bun test packages/utils/test/file-lock.test.ts` phải xanh — trên cây chưa có công việc nó **đã** xanh (4 pass / 0 fail, đo 2026-09-29 sau khi build addon). File mới `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` dựng **hai** `PluginManager` độc lập, mỗi cái memoize config riêng (`#ensureConfigLoaded`, `manager.ts:141-146`), cùng trỏ một lockfile tạm qua `spyOn` trên bốn hàm `getPluginsDir`, `getPluginsLockfile`, `getProjectDir`, `getProjectPluginOverridesPath` — vì `getPluginsLockfile` là đường dẫn toàn cục `~/.omp/plugins/omp-plugins.lock.json` (`dirs.ts:652`), không suy ra từ cwd. Hai `setEnabled` chạy đồng thời → JSON trên đĩa chứa **cả hai** thay đổi. Hàng đối chứng âm viết lại thuật toán trước-nhất nội tuyến, không khoá, và khẳng định đĩa chỉ chứa **một**. Nhánh `ChangeResult`, mỗi nhánh một test: `setEnabled` về giá trị đang có → `changed:false` và byte trên đĩa không đổi; `deletePluginSetting` trên khoá vắng → `changed:false`; plugin lạ vẫn ném `/not found in runtime config/` và **không** đụng file; `setEnabled` trả `application: 'restart-required'`. `atomicWriteJson` không để lại `.tmp` và sinh JSON parse được, có dòng cuối. `packages/coding-agent/test/plugin-config.test.ts` phải giữ xanh |
| M4-6 | Bốn cổng cơ học, tất cả đều đỏ được. (1) `grep -cF 'settings.set(' packages/tui/src/overlays/settings-selector.ts` và `grep -cF 'settings.unset(' packages/tui/src/overlays/settings-selector.ts`, cộng lại phải bằng **0** — cổng chống trôi, đỏ ngay khi có call site thứ mười lăm. Hôm nay chúng in **13** và **1**, tổng **14**: 13 `settings.set(` cộng một `settings.unset(def.path)` tại `settings-selector.ts:1112` (đường xoá giá trị đã lưu trong ô text). Cổng cũ chỉ đếm `settings.set(` nên bỏ sót dòng 1112 và vẫn xanh khi còn đường ghi bypass. (2) Test đổ bóng bằng project khẳng định `YAML.parse(await Bun.file(globalConfigPath).text())` **không** chứa khoá sau một lần ghi từ panel, và chứa **đúng giá trị trước khi ghi**. (3) Test đối chứng không-đổ-bóng khẳng định cùng khoá đó **có** trong `config.yml` sau một lần ghi từ panel khi không lớp nào che. (4) `bun run check:ts` sạch — cổng này chỉ bắt được lỗi **trong từng package**, KHÔNG bắt được trôi kiểu giữa tui và coding-agent: `SettingsProvenance` và `SettingProvenance` là hai union khai độc lập ở hai package, và tui không hề phụ thuộc `@oh-my-pi/pi-coding-agent` (cạnh phụ thuộc chạy ngược lại — coding-agent mới là package khai báo `@oh-my-pi/pi-tui`), nên `tsc` không thấy chúng lệch nhau. Muốn cổng này có răng thì M4-6 phải thêm một trong hai: cho tui import kiểu từ coding-agent, hoặc sinh cả hai union từ một nguồn chung. Nếu không làm, phải ghi rõ đây là khoảng trống đã biết. | Hợp đồng: một lần ghi `/settings` mà giá trị hiệu lực do lớp trên cấp phải (a) không để lại giá trị chết trong `config.yml` trên đĩa, (b) giữ nguyên giá trị global trước đó, (c) báo lớp nào đang che. Hàng (3) không phải hàng đệm: nó là thứ chứng minh con chốt phân biệt "bị che" với "đã áp dụng", và là test **đỏ** nếu ai đó biến con chốt thành từ chối mọi thứ rồi làm hỏng `/settings` cho mọi người — đúng rủi ro mà bản kế hoạch gọi là chế độ hỏng chính. Lùi ghi và lùi rollback gộp thành một lần lưu nhờ debounce `#queueSave` 100 ms (`settings.ts:818-838`). Thêm hai kiểm tra phân biệt được thay cho một: (i) `grep -c 'function shadowingSource' packages/coding-agent/src/cli/config-cli.ts` phải in **0** — hàm cục bộ đã rút đi; (ii) `grep -c 'shadowingSource(def.setting' packages/coding-agent/src/cli/config-cli.ts` phải in **1** và `grep -c 'from "../config/shadowing"'` phải in **1** — chỗ gọi trong `handleSet` còn sống, nay truyền thêm `settings` làm tham số scope. Cổng cũ `grep -c 'shadowingSource' == 1` phải bỏ: nó in **2** trên cây hiện tại (chỗ gọi tại `config-cli.ts:307` + định nghĩa cục bộ tại `config-cli.ts:325`) và vẫn in **2** sau khi làm đúng, nên đỏ vĩnh viễn với bản làm đúng — cách duy nhất để nó xanh là xoá chỗ gọi, tức phá vỡ báo cáo shadow của `omp config set`. File test: `packages/coding-agent/test/config/settings-provenance-guard.test.ts` (mới) |
| M4-7 | Năm cổng, trong đó **G1 là cổng phân định**. G1: `bun test packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` đỏ trên cây trước thay đổi và xanh sau. G2: chuỗi `rawArgs.json` ghi lại **không giảm** và tiền tố-lồng nhau, giá trị cuối chứa `"path":"xd://probe"` và **không** phải JSON thiết bị bên trong. G3: bản dựng lại bằng bản sống, giống byte. G4: `HIDDEN_ARG_KEYS` (`json-tree.ts:23`) phủ khoá xdev mới, và qua `formatArgsInline` **không** chữ nào trong cả hai cách viết xuất hiện. G5: `bun run check:ts` exit 0 | Hợp đồng quyết định: một tool đăng ký qua `registerTool({ renderResult })`, bọc bởi `RegisteredToolAdapter` (và riêng bởi `customToolToDefinition`), phải nhận `rawArgs`, `argsComplete` và `executionStarted` trên options của nó — hôm nay `wrapper.ts:62` bỏ mất. Lỗi người dùng thấy: một extension ngoài repo gate preview streaming trên `options.argsComplete` sẽ hiển thị như chưa bao giờ hoàn tất, vĩnh viễn. Khẳng định âm bắt buộc: một field options **chưa từng** có không được xuất hiện, để bản sửa không trôi thành passthrough không kiểu làm lộ sổ ghi nội bộ ra ngoài. G2 và G3 cùng nằm trong `packages/tui/test/tool-execution-xdev-render.test.ts`; hợp đồng rebuild phải đứng ở `ui-helpers.ts:605` — tệp bản kế hoạch nêu (`chat-transcript-builder.ts`) là **sai hoàn toàn** và sẽ để hợp đồng này không phòng thủ được, một chế độ hỏng mà cả `bun check` lẫn bộ test xdev cũ đều không thấy |
| M4-9 | Năm điều kiện cùng lúc: `bun run check:ts` sạch; `bun test packages/coding-agent/test/extensions-triage-cli.test.ts` xanh; **đối chiếu tay** ở bước 13 cho thấy tập hàng của CLI khớp dashboard `/extensions` — cụ thể một hàng dashboard gọi là `disabled` không được CLI báo là `active`; với (b), một hàng fixture bị che bởi bên thắng cùng tên phải báo `shadowedBy` **không rỗng**, và một test trong capability suite phải đỏ nếu `_shadowed` được set mà không có bên thắng; dòng CHANGELOG tồn tại; giấy phép `shippable: false` của sóng D đã được cấp **bằng văn bản** | `omp extensions-triage --json` trên binary đã build, diff tập hàng với dashboard cho cùng một cwd — đây là điều kiện **không thể bịa**: xoá phép sao chép `Settings.init()` / `cfgDisabledExtensions` khỏi CLI thì JSON vẫn trông hợp lý, nhưng mọi disable ở mức item sẽ lật sang `active` và diff sẽ lộ ra. Cổng này **không** bắt được việc `Command` mới có thật sự được đăng ký trong `cli-commands.ts` không: thiếu một mục registry làm `omp extensions-triage` rơi xuống `runCli` rồi chuyển argv thành prompt cho LLM (hồi quy #1496), và không test nào được liệt kê ở đây sẽ nhận ra. Lệnh bản kế hoạch gợi ý, `bun test packages/coding-agent/test/ -t 'acp'`, sẽ xanh trước **mọi** khuyết điểm vừa nêu. Khẳng định về `shadowedBy` phải nằm trong capability suite, ở lớp sở hữu `seen`/`deduped`, không đi qua CLI |
| GAP-M4-10 | Năm điều: `bun run gen:patch-ledger` chạy và `git diff --exit-code -- patches/LEDGER.md` sạch (sổ **sinh lại được** từ chính diff); test ba tập xanh **và** đã chứng minh có răng bằng cách thêm một hunk vào fixture; hàng âm (xoá một hàng ledger) đã từng thấy đỏ; `md5` của hai file `.patch` **không đổi**; `bun run check:ts` sạch | Điều kiện (1) và (4) là điều không thể bịa: xoá `patchedDependencies` khỏi `package.json` mà quên xoá file patch thì `gen:patch-ledger` fail ngay; và "không đổi byte" chỉ chứng minh được bằng `md5` trước/sau, không phải bằng một nhận xét trong mô tả PR. Cổng **không** bắt được nội dung hai cột `purpose` và `upstream` có đúng không — phần đó phải có người đọc |
| GAP-M4-11 | Bốn điều: con số `instanceof Error ? … : String(` **giảm** so với mốc 895 ghi trong item; `normalize-error.test.ts` xanh gồm hàng âm của getter **và** ba nhánh `null` / `Symbol` / revoked Proxy; hai bản `private` ở `dap/client.ts:49` và `dap/session.ts:118` còn nguyên hành vi; mô tả PR nêu tiêu chí chọn bốn đường và ghi phần còn lại là nợ có chủ | Hàng âm của getter là điều không thể bịa — triển khai hôm nay sẽ ném. Nhưng cổng **không** bắt được 895 chỗ còn lại, và không cổng nào bắt được: đó là lý do phần còn lại phải là **nợ kỹ thuật có chủ** chứ không phải một cổng. Con số ở điều kiện (1) là thứ phân biệt "di dời có chủ ý" với "chỉ thêm rule cấm" — cái sau làm item xanh mà không đổi gì |
| GAP-M4-12 | Năm điều: mọi test hiện có khẳng định "hook lỗi ⇒ tool bị chặn" **vẫn xanh**, không sửa một khẳng định nào cho xanh; hàng âm bắt buộc — handler trả `{ block: true }` thật ra nhãn `denied` — **đã từng thấy đỏ** khi `kind` bị gán sai ở cả hai chỗ; cả ba đường đều đi qua cùng một cơ chế `emitError` khi báo lỗi; `hooks/runner.ts` `emitToolCall` **có** timeout đọc từ đúng hằng mà `extensions/runner.ts` dùng; `bun run check:ts` sạch | Hàng âm là cổng quyết định: bỏ `kind` ở `runner.ts:1640` thì nhãn `denied` biến mất. Cổng (1) là **điều khoản bảo toàn**, không phải cổng mới — fail-closed phải giữ nguyên, chỉ *từ khóa* trong thông báo đổi. Cổng này **không** bắt được `agent-session.ts:4509` có được soát hay không, vì call site đó không đổi chữ ký: đó là một kiểm tra của con người |
| GAP-M4-13 | Bốn điều: một lần hỏi quyền sinh ra **đúng một** cặp entry khoá theo `toolCallId`; hàng âm bắt buộc — entry approval **không** xuất hiện trong chuỗi message đi tới provider, kể cả khi `decision` là `denied` — đã từng thấy đỏ khi bỏ cơ chế `EPHEMERAL_MODEL_CHANGE_ROLE`; transcript cũ đọc được và lệnh chỉ-đọc báo "không có bản ghi" chứ không lỗi; `bun run check:ts` sạch | Hàng âm là cổng quyết định: bỏ cơ chế "trong log, không trong model" thì entry đi thẳng vào context. Cổng **không** bắt được bản ghi có lấy từ `resolveApproval` hay từ call site — cả hai đều cho ra **một** cặp entry như nhau, nên chỗ ghi là một kiểm tra của con người. Đây cũng là mục duy nhất trong sáu mục mà **mọi** neo đo đều đúng nguyên văn, nên nó thiếu rủi ro kỹ thuật và thừa câu hỏi quyết |
| GAP-M4-14 | Năm điều: bốn hàng mở đầu ứng với đúng bốn mục M4 và mỗi hàng có `mechanism` là **đường** chứ không phải tên package; cổng phủ định đã từng thấy đỏ khi một hàng trỏ tới file đã xoá; số hàng `proof: none` **bằng** con số đăng ký và mỗi hàng `none` có lý do; `git diff --name-only -- 'packages/**/*.ts'` **rỗng**; không file `docs/` hiện có nào bị gộp lại | Cả hai cổng đều đỏ được và chúng là **hai hợp đồng khác nhau**: hàng (2) bảo vệ tính **đúng**, hàng (3) bảo vệ tính **có giá trị**. Chỉ có (2) thì bảng đúng và vô dụng; chỉ có (3) thì bảng có giá trị và nói dối. Cổng **không** bắt được một hàng có **đúng** cơ chế hay không — đó là lý do cột `proof` được thiết kế để **đỏ được** thay vì chỉ "có vẻ đúng" |
| GAP-M4-15 | Năm điều: `dropped-foreign-keys.test.ts` xanh gồm hàng âm "key đã bị `projectLayerForMerge` loại thì không được báo"; cả **hai** check của dòng doctor có test riêng, theo GAP-D4; `loadHooks()` **không đổi** — `hooks/pre/` và `hooks/post/` trên fixture vẫn nạp đúng như trước; `assertKnownSettingPaths` **vẫn chỉ** được gọi từ lớp override của constructor; GAP-M1-18 đã merge và danh sách check của nó đã có hàng này **từ trước khi code** | Hàng âm ở hợp đồng test là cổng quyết định: gọi `droppedForeignKeys` **trước** `projectLayerForMerge` thì một key đã bị loại chủ động sẽ bị báo — tức báo một hành vi không tồn tại. Điều kiện (4) thì là một kiểm tra của con người: nó cố ý bảo vệ một hành vi **không đổi**, nên không có cách nào làm nó đỏ mà không phá hành vi đang đúng |
| **Toàn M4** | Cả **mười** cổng trên xanh **trên cùng một cây**, với native addon đã build; `M4-4` và `M4-6` nằm chung **một PR**; các quyết định của người (câu hỏi mở số 1 về `application`, giấy phép `shippable: false` của sóng D, và sáu câu của `GAP-M4-10`..`GAP-M4-15`) đã có chủ sở hữu và hạn bằng văn bản; hợp đồng test của cả mười mục đã thật sự chạy, kể cả các hàng âm của chúng | Work item nào đỏ thì M4 chưa xong, kể cả khi ba cái kia xanh. `bun run check:ts` một mình **không đủ** — nó không chạy một khẳng định nào, và với `M4-4` nó còn bỏ lọt đúng lỗi mà ba bước grep không bắt: nếu ai đó **đổi tên** `#saveRuntimeConfig` thay vì xoá, các grep vẫn xanh trong khi ổ khoá đã im lặng biến mất |

**Cảnh báo về exit code của các cổng grep.** Mọi cổng grep trong bảng — `grep -c` lẫn `git grep` — đều là mẫu **kỳ vọng 0**, mà chúng trả exit **1** khi không khớp, tức trả 1 đúng lúc việc đã đúng (đã kiểm: `grep -c 'THIS_PATTERN_DOES_NOT_EXIST' packages/tui/src/overlays/settings-selector.ts` in `0` rồi exit 1; `git grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts` không in gì, exit 1 — trong khi ở trạng thái đang hỏng, `grep -c` in 13 và exit 0, nên chuỗi lật ngược đúng lúc sửa xong). Đừng dán chúng nguyên xi vào script `set -e` hoặc chuỗi `&&`. Dạng dùng được: `test "$(grep -cF 'settings.set(' packages/tui/src/overlays/settings-selector.ts)" -eq 0` (thoát 0 khi đúng), `test -z "$(git grep -n saveRuntimeConfig -- packages/)"`, `test "$(git grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts || true)" -eq 0`.

## Những điều chưa được kiểm chứng

- **Milestone này mới chỉ được đặc tả, chưa được thực hiện.** Toàn bộ nội dung sinh ra bằng cách đọc cây mã và chạy lệnh, không phải bằng cách làm công việc. Chưa work item nào được code. **Chưa cổng nào trong bảng trên từng chạy trên một cây đã có công việc** — nên chưa cổng nào được chứng minh là có răng. Riêng phần đo nền thì đã chạy và đã ghi, hai lần. Lần đo 2026-09-27 (trước khi build addon): `bun run check:ts` exit 0 trên cây sạch; `bun test packages/utils/test/file-lock.test.ts` và `bun test packages/tui/test/tool-execution-xdev-render.test.ts` đều `0 pass, 1 fail, 1 error`; bước 1–2 **và bước 4** của `M4-4` đỏ vì addon (`bun test packages/coding-agent/test/plugin-config.test.ts` cũng ra `0 pass, 1 fail, 1 error` với cùng lỗi addon). **Lần đo lại 2026-09-29, sau khi build addon:** bước 1, 2, 4, 5 đều xanh — `file-lock.test.ts` 4 pass, `tool-execution-xdev-render.test.ts` 2 pass, `plugin-config.test.ts` 7 pass (lưới gần nhất phải giữ xanh, chứ không phải việc đã làm), `check:ts` exit 0 — và bước 3 vẫn đỏ vì file chưa tồn tại, tức đỏ vì công việc chưa làm chứ không vì môi trường. Với `M4-9` không có phép đo nào được ghi lại.

- **Tiền đề native addon đã build, nhưng nó là điều kiện tái lập chứ không phải điều kiện mặc định.** `M4-4` phụ thuộc nó sớm nhất: `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives` (`file-lock.ts:9`). Trên cây này addon **đã** build (2026-09-29), nên `bun test` chạy và `bun test packages/utils/test/` ra 743 pass / 10 skip / 0 fail. Trên máy sạch thì thiếu nó thì mọi lệnh `bun test` chết ngay ở bước import với `Failed to load pi_natives native addon for darwin-arm64` — đó là **thiếu một bước build**, không phải hạn chế của máy. Hệ quả phải nói thẳng trong mọi PR của M4: ghi cả hai lệnh tiền đề (`brew install ninja` và `bun --cwd=packages/natives run build`) vào phần cách chạy, vì một tuyên bố "test pass" đọc trên một máy chưa build không có chỗ đứng. `bun run check:ts` thì không cần bước này.

- **Neo `file:line` là ảnh chụp tại một thời điểm.** `wrapper.ts:62`, `ui-helpers.ts:605`, `json-tree.ts:23`, `settings.ts:818-838`, `file-lock.ts:9`, `manager.ts:141-146`, `dirs.ts:652`, `loader-state.js:970` chụp ở cây hiện tại; không cổng nào trong bốn mục tự kiểm neo, nên chúng trôi mà không ai báo đỏ. Số thời gian mà `M4-7` ghi cũng chỉ là một lần đo, và nó sai. Đo lại ngày 2026-09-27 trên darwin-arm64, `bun run check:ts` exit 0 với **16** mục kiểm tra kiểu, nhưng tổng **3m06s** lần chạy lạnh (lần đầu trong phiên: `pi-coding-agent` 70.4s, `pi-catalog` 27.9s, `pi-metaharness` 40.0s, `pi-ai` 8.4s, `omp-stats` 19.8s) và **33–43s** ở các lần chạy sau. Các con số `301s / 138s / 110s` và mốc "khoảng 10 phút" không tái lập được ở lần đo này, nên đừng lên kế hoạch theo chúng. Không có `.tsbuildinfo` nào trong cây và `check:types` là `tsgo -p tsconfig.json --noEmit` không có cờ incremental, nên chênh lệch lạnh/ấm nằm ở cache hệ thống và tải máy chứ không phải build info: **coi đây là cổng rẻ về thời gian so với `bun test`**, đừng tránh nó vì tưởng chậm.

- **Điểm chưa chắc, gọi thẳng tên:**
  - **Cổng phân định G1 của `M4-7` căng nhau với chính hợp đồng test của nó.** G1 nói test đỏ trên cây trước thay đổi *vì* `argsComplete` bị bỏ ở `wrapper.ts:62`; nhưng G1 và hợp đồng test lại cùng nói test **xanh** khi chỉ thêm `rawArgs` vào hai interface mà không sửa gì khác. Cả hai không thể cùng đúng — chuyện gì xảy ra phụ thuộc `RegisteredToolAdapter` dựng options bằng cách chọn tường minh hay bằng spread, mà dữ liệu không ghi. Phải đọc cây trước khi tin cổng phân định; bước tự kiểm "thêm `rawArgs` rồi quan sát" cũng chưa từng chạy.
  - **`M4-4` còn một quyết định của người nằm trong chính định nghĩa DONE, và nó chưa có.** Cổng ghi rõ: DONE *additionally* cần quyết định bằng văn bản về câu hỏi mở số 1 — ai sở hữu `application` — vì mô hình cho kiểu đó trong bản kế hoạch nằm ở một repo không tồn tại ở đây. Chưa có mặc định — cần bạn quyết.
  - **Ba bước grep của `M4-4` là danh sách kiểm của người, không phải test.** Chính cổng nói: nếu refactor được sắp lại để **đổi tên** `#saveRuntimeConfig` thay vì xoá, các grep vẫn xanh trong khi ổ khoá đã biến mất. Chỉ test tranh chấp kèm hàng đối chứng âm mới là phòng thủ thật, và hàng âm đó phải được chứng minh là sống bằng cách xoá lock rồi bắt test đỏ.
  - **`M4-9` mang cả hai nhánh (a) và (b) của hợp đồng `shadowedBy`, mà hai nhánh cho ra hai khẳng định đối nghịch nhau** — (a) hàng bị che phải báo `shadowedBy === undefined`, (b) hàng bị che phải nêu tên bên thắng. Điều kiện (4) của cổng được viết theo (b); dữ liệu không ghi lại nhánh nào là quyết định. Thêm nữa, việc `Command` có thật sự được đăng ký trong `cli-commands.ts` không nằm ngoài mọi test mà cổng liệt kê.
  - **Sáu file test của `M4-7` chưa biết sẽ đổi hay không.** Tất cả đều ghi `UPDATE ONLY IF open question 1 resolves to the outer-rename branch`, và nhánh đó chưa có câu trả lời. Cùng nhãn "open question 1" xuất hiện ở cả `M4-7` (nhánh outer-rename) và `M4-4` (ai sở hữu `application`) với hai chủ đề khác nhau — đừng đọc chúng là một câu hỏi. G4 cũng chưa chốt nơi đặt: nó dùng đúng seam `formatArgsInline` mà `packages/tui/test/json-tree-render.test.ts:32` đang dùng, mà file đó lại nằm trong nhóm sáu file "chỉ sửa nếu nhánh outer-rename".
  - **Nhánh EPERM trên Windows của `atomicWriteJson` không kiểm chứng được ở đây.** Nền tảng đo được là darwin-arm64; hợp đồng test nói thẳng là đừng giả lập bằng cách ép errno hay bằng cách soi mã nguồn. Nó phải được ghi là chưa thử.
  - **`M4-6` đo bằng thời gian.** Hợp đồng dựa vào việc lùi ghi trong bộ nhớ xảy ra **trước khi** debounce `#queueSave` 100 ms ráo, để ghi và lùi gộp thành một lần lưu (`settings.ts:818-838`). Đó là một giả định về thứ tự, không phải bất biến mà công cụ bảo đảm; cổng (2) và (3) sẽ đỏ theo nhịp thay vì theo logic nếu debounce đổi hành vi.
