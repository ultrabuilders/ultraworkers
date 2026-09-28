# KẾ HOẠCH THỰC THIỆN — MILESTONE 4: MƯỢN KỶ LUẬT, KHÔNG MƯỢN KIẾN TRÚC

M1 bọc trọn `pi` làm tiền đề, M2 cắt seam composable, M3 dựng trải nghiệm người dùng kiểu Claude Code. M4 không thêm tính năng nào đáng kể. Nó là milestone duy nhất trong chương trình **lấy bài học từ một dự án khác** — `deepseek-ai/deepseek-harness` — và quyết định một dòng mà cả milestone đứng trên: *chỉ mượn KỶ LUẬT của dsh, không mượn KIẾN TRÚC, và không mượn bất kỳ thứ gì dsh đã phải tự vá để có được*. Sản phẩm bàn giao của M4 cho cả chương trình là một câu hỏi mà omp hiện tại không trả lời được: **thao tác này có thật sự xảy ra không?** Sau M4, lỗi "omp báo *applied*, nhưng không có gì thay đổi" không còn biểu đạt được.

**Trạng thái hiện tại của M4 (đọc để quyết định có bắt đầu hay không):**

| | |
| --- | --- |
| Work item còn lại | **4** (M4-4, M4-6, M4-7, M4-9) trên tổng 10 ban đầu |
| File được chạm | 37 mục đã kiểm chứng đường dẫn, trong đó 2 mục `[create,UNVERIFIED]` |
| Câu hỏi mở / đính chính | **19 câu hỏi mở, 34 đính chính** |
| Sóng | 3 (B, C, D) — và **cả ba đều `shippable: false`** |
| Cổng đang đỏ ngay bây giờ | 4/6 bước kiểm của M4-4 đỏ — (a)(b) vì cây chưa build addon native; (c)(d) vì refactor chưa thực thi |
| Phụ thuộc chưa thoả | 2 (M2 WI-8a/8b cho M4-6; M2 WI-2 cho M4-9) |

Đây **không phải** một milestone bắt đầu từ xanh. Hai trong bốn item phụ thuộc công việc M2 **chưa được thực thi** trên nhánh này, và item lớn nhất về mặt cơ học (M4-4) không viết test được cho tới khi build addon native xong.

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

**Thành thật về phần vô hình.** Ba trong bốn item chỉ hiện ra khi có chuyện xấu xảy ra — một ghi file thất bại, một setting bị che, một extension bị chặn. Chỉ M4-7 có tác dụng nhìn thấy liên tục trên màn hình. Ngoài ra M4 tạo ra hạ tầng mà người dùng không bao giờ chạm tới: một `atomicWriteJson` dùng chung trong `packages/utils`, một `shadowing.ts` mới, một module capability mới, và một entry đăng ký lệnh CLI mới. Đổi lại, milestone này **giữ kỷ luật cho những milestone sau**: một release gate duy nhất, một quyết định changelog duy nhất, và các PR được phép merge nhưng không được phép release cho tới khi cả ba sóng xong.

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
- **TUI đã tồn tại và bị xoá 8 tuần trước HEAD** (`.agents/notes/archived/simplification/2026-08-04-remove-tui-package.md`). Bản thảo cũ kết luận "không có TUI" như thể đó là trạng thái ổn định.

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

**Nhưng** `packages/credentials/credentials-local/src/index.ts:780-787` có `assertUnshadowed` **tốt hơn**: nó **gọi tên lớp thắng** *và* **nêu cách sửa** — *"supplied read-only by the launching environment, so set would be shadowed; unset it in the shell you start dsh from instead"*. Kèm `assertOwnerOnly` được kiểm lại **mỗi lần đọc và trước mỗi lần ghi**.

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
2. **Nó sẽ phá đúng những thứ M1 và M2 đã dựng.** M1 bọc trọn `pi`, M2 cắt seam composable. M4-7 nằm *trước* M2 WI-4b theo thứ tự bắt buộc của kế hoạch, và chính vì vậy nó chỉ làm cho hợp đồng render **thật sự đến nơi**, còn phần đăng ký renderer là của WI-4b. Đó là thứ tự "cứu seam", không phải thứ tự "thay seam".
3. **Các cổng kiểm của bốn item đều neo vào cây này.** Chúng grep `packages/`, chạy `packages/utils/test/file-lock.test.ts`, so kết quả CLI với dashboard. Một kiến trúc mượn về không làm bất kỳ điều gì trong số đó xanh.

Câu tắc để mang theo: **khi bốn ý đầu tiên của `one_line` có thể được viết thành một dòng mô tả hợp đồng cục bộ, hãy làm nó cục bộ.** Cả bốn đều vừa khít.

---

## Phạm vi đã thu hẹp

M4 từng có **mười** work item. Sáu đã rời đi. Tài liệu này chỉ nói về bốn.

**Sáu ID đã rời M4: `M4-0`, `M4-1`, `M4-2`, `M4-3`, `M4-5`, `M4-8`.**

Ba lý do, theo đúng cách kế hoạch đã ghi:

- **Năm item trùng công việc đã nằm trong M2 WI-1..WI-4** (seam composable và độ bền vững dữ liệu). Đây là lý do lớn nhất: M4 từng định mở rộng sang những thứ M2 đã giao.
- **`M4-3` rời đi vì nó là authoring surface thứ sáu, và M2 WI-4 đã đóng nó rồi.** Mở lại ở M4 là làm trùng.
- **`M4-5` rời đi vì nó là lỗi va chạm trong đường mint tên, không phải việc plugin.** Sai chỗ; nó thuộc về seam mint tên, không thuộc về chương trình "mọi thứ là plugin".

Riêng `M4-5` cần một câu nói thêm, vì "rời đi" ở đây **không** có nghĩa là "xong": nó là **một deliverable còn nợ của M4** — việc viết nó vào kế hoạch M1 vẫn phải làm, và hiện chưa hề có mục nào tên `M4-5` trong `MILESTONE_1_EXECUTION_PLAN.md`. Đừng đọc "đã ghi chú sang M1" là "đã bàn giao xong".

Chúng sống ở **tập work item của M2** (WI-1..WI-4) và trong phạm vi bọc trọn của M1. Tài liệu này cố tình **không lặp lại** ánh xạ ID→WI cụ thể — nó nằm ở kế hoạch tổng và kế hoạch thực thiện M2. Nếu cần tra cứu, hãy đọc kế hoạch M2; **đừng tìm `M4-0`..`M4-5` trong tài liệu này rồi kết luận M4 thiếu.**

Hệ quả trực tiếp cho bản chất milestone: M4 là **bốn PR, không phải mười**. Kế hoạch M2 phải đi trước; M4 là phần đuôi của chương trình, không phải đầu.

---

## Quy tắc `shippable`

Đây là trục xương của milestone, và `light.json` nói thẳng: **cả ba sóng đều `shippable: false`.** Không sóng nào của M4 được phép đi một mình.

M4 có **đúng một** quyết định release, và nó phủ cả ba sóng. Đây là hệ quả dẫn xuất, từng đằng nặng:

1. **Không mục CHANGELOG nào được thêm trong PR riêng lẻ.** M4-4 chạm tới *ba* file CHANGELOG (coding-agent, tui, utils) — nhưng đó là **một** quyết định, không phải ba. Wave C và Wave D cùng nằm trong cùng quyết định đó.
2. **Merge được phép, release thì không.** `light.json` viết nguyên văn: *"merge is allowed, release is not."* Wave B có thể vào nhánh, có thể xanh, nhưng không xuất hiện trong bản phát hành cho tới khi Wave C và Wave D cũng xong.
3. **Wave B là MỘT PR.** M4-4 và M4-6 cùng thay đổi một giao diện có điều kiện đã thoả trong cùng `packages/tui/src/overlays/`. Kế hoạch nói thẳng: **một lần review, hai commit**. M4-6 thêm một thành viên vào `SettingsHost`; M4-4 đổi kiểu trả về của `PluginSettingsManager.setEnabled`.
4. **Hai kiểu kết quả phải gộp thành một.** `ChangeResult` của M4-4 là tiền lệ cho `SettingsWriteResult` của M4-6. Hai kiểu gần giống nhau là một PR không liên kết. Wave B phải ship **một** kiểu kết quả nhất quán.
5. **M4-7 không được mở PR trước khi bản viết của M2 WI-4b được thống nhất** (§6.1). Tệ hơn: WI-4b **chưa tồn tại** trong danh sách work item của kế hoạch M2 (WI-0..WI-13) — bản thân nó là một việc phải làm trước.
6. **Wave D cần ủy quyền bằng văn bản.** Cổng của M4-9 đòi có `shippable: false authorization granted in writing` trước khi coi là xong.

**Work item nào `shippable: false` và vì sao:**

| Item | Sóng | Vì sao không ship một mình |
| --- | --- | --- |
| M4-4 | B | Gộp với M4-6 thành một PR (cùng giao diện cấu trúc trong `packages/tui/src/overlays/`); định hình `ChangeResult` là tiền lệ cho M4-6 |
| M4-6 | B | Gộp với M4-4 — "one review, one changelog gate"; còn bị chặn bởi quyết định changelog chung |
| M4-7 | C | "§6.2 forbids shipping any M4 wave alone"; nó **đổi thứ renderer `xd://` đầu tiên nhận** và **đổi tên một key** — cả hai đều người dùng nhìn thấy |
| M4-9 | D | Chờ cổng changelog chung; thêm một lệnh CLI top-level mới |

**Định nghĩa "M4 xong" mà quy tắc này áp đặt:** bốn commit đã merge **+** một quyết định changelog duy nhất **+** một lần release. Không có đường nào để bốn sóng thành công mà M4 vẫn treo. Và vì cả ba sóng đều đỏ hoặc chưa thể chạy ngay lúc này, đây là lý do thực tế để **không** mở Wave B trước khi M2 WI-8a/8b đã vào nhánh.

Một điểm đáng nói: M4-9 là item **duy nhất `blocks: []`** — không item nào trong M4 chờ nó. Nó có thể đến cuối mà không chặn ai. Nhưng nó vẫn không được ship một mình. `shippable: false` không phải câu hỏi về thứ tự merge; nó là câu hỏi về quyền phát hành.

---

## Không làm gì

**Không thêm runtime plugin mới.** M4 không dựng hệ thống plugin. Nó sửa bốn hợp đồng *bên trong* các seam M2 đã cắt.

**Không thêm authoring surface thứ sáu.** Đó là `M4-3`, đã rời đi vì M2 WI-4 đã đóng nó.

**Không dựng bề mặt đăng ký renderer.** M4-7 chỉ làm cho các field **đã được khai báo trong type** thật sự đến nơi. Bề mặt đăng ký là M2 WI-4b, và WI-4b xếp **sau** M4-7, không được nằm chung PR. WI-4b còn phải được viết và thống nhất **trước khi** M4-7 mở PR.

**M4-9 không báo nguồn che.** Tiêu đề đã ghi: *"scoped down: state/shadowed only, no shadow-source"*. Item ở phạm vi option **(a)** — 2 file mới, 2 file sửa, 1 test, khoảng một ngày, **không chạm shared core**. Option **(b)** (thêm `shadowedBy` và đổi `capability/index.ts` + 6 call site trong `state-manager.ts`, 2-3 ngày) **không nằm trong M4 đã thu hẹp**. Nếu sau này ai đó mở lại (b), nó là việc riêng.

**Không giải quyết câu hỏi `application`.** Cổng của M4-4 nói thẳng: *"DONE additionally requires a human decision on open question 1 (who owns `application`), because the plan's model for that type lives in a repo that does not exist here."* Kiểu đó **không có trong repo này**. M4-4 không được coi là xong khi câu hỏi này còn treo.

**Không coi các bước `grep` là test.** Cổng M4-4 tự nói: bước (c)(d)(e) là *"a human checklist, not a test"*. Cụ thể và đáng nhớ: nếu ai đó đổi thứ tự refactor để `#saveRuntimeConfig` bị **đổi tên** thay vì bị xoá, các lệnh grep vẫn xanh trong khi ổ khoá đã biến mất im lặng. **Phòng thủ duy nhất là test tranh chấp kèm control phản âm** — xoá `withFileLock` khỏi `#mutateConfig` và xác nhận test chuyển đỏ. Một cổng chưa từng thấy đỏ thì không phải cổng.

**Không sửa `tsc`, không `mock.module()`, không source-grep trong test.** Xem [Quy ước khi đọc](#quy-u-c-khi-%C4%91-c).

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

Đây là **tiền đề cứng, không phải tiện nghi.** `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives`. Không có addon:

```
bun test packages/utils/test/file-lock.test.ts
→ 0 pass, 1 fail
→ Failed to load pi_natives native addon for darwin-arm64
```

Concretely, "addon chưa build" nghĩa là **test của M4-4 chưa viết được và chưa chạy được** — kể cả control phản âm, vì control phản âm đòi xoá `withFileLock` rồi xác nhận đỏ; không có lock thì không có gì để xoá. Trên máy lạnh đây là một khoảng thời gian thật, và nó nằm **trước** phần viết code của M4-4. Bốn trong sáu bước kiểm của M4-4 đỏ ngay lúc này: (a)(b) vì cây chưa build addon native, (c)(d) vì refactor chưa thực thi.

### `bun run check:ts` chạy được không cần addon

Và nó **là** một cổng thật cho cả bốn item — không phải hình thức:

- **M4-4** bước (f): chính là thứ bắt được sự trôi giao diện `tui`/`coding-agent` mà kế hoạch cảnh báo, biến nó thành lỗi build thay vì một điều bất ngờ lúc chạy.
- **M4-6** cổng (4): ngoài việc sạch, nó còn **cấm** `SettingsProvenance` (tui, **tạo mới bởi M4-6**) và `SettingProvenance` (coding-agent, **đã tồn tại**) trôi lệch nhau — hai tên khác nhau, ở hai package khác nhau, cố ý giữ cho khớp điểm đầu-cuối.
- **M4-7** cổng G5.
- **M4-9** điều kiện (1).

### Điều kiện riêng của từng M4

| Điều kiện | Chặn item nào | Trạng thái |
| --- | --- | --- |
| Addon native đã build | M4-4 | Chưa build — cổng đỏ |
| **M2 WI-8a + WI-8b** phải merge — chúng là thứ tạo ra bề mặt `pi.registerSetting` có namespace mà M4-6 sửa | M4-6 | **CHƯA XÁC NHẬN** — WI-8a/8b là việc M2 chưa thực thi; phải xác nhận đã vào nhánh này trước khi bắt đầu |
| **M2 WI-2** (thứ tự nạp extension + giải quyết va chạm tường minh) phải merge | M4-9 | **CHƯA THOẢ** — `extension-load-order-determinism.test.ts` không tồn tại, `git grep -n 'extension-load-order' packages/coding-agent/` trả **0 hit** |
| Bản viết M2 WI-4b phải viết và thống nhất (§6.1) | M4-7 (trước khi mở PR) | Chưa tồn tại trong danh sách WI của kế hoạch M2 |
| Quyết định về merge order với M3-A4 | M4-4 | M3-A4 viết lại đúng dải `setPluginSetting` 942-949; hai bản vá độc lập sẽ âm thầm hủy lẫn nhau |
| Quyết định con người về câu hỏi mở 1 (ai sở hữu `application`) | M4-4 (điều kiện DONE) | Chờ bạn |
| Quyết định changelog của M4 (plan:§6.2) | Mở PR của Wave B | Chờ bạn — merge thì được, release thì không |
| Ủy quyền `shippable: false` của Wave D bằng văn bản | M4-9 | Chờ bạn |

**Lưu ý khi đọc cột `verified`:** hai mục `[create,UNVERIFIED]` trong M4-4 (`packages/utils/src/atomic-write.ts` và `packages/coding-agent/test/plugin-runtime-config-lock.test.ts`) là **file chưa tồn tại** — chúng được tạo ra bởi chính item đó. Đó không phải đường dẫn sai.

---

## Thứ tự thực hiện

Ba sóng, theo thứ tự **B → C → D**. Lưu ý: đây là thứ tự **merge**, không phải thứ tự release. Không sóng nào release.

### Wave B — Ghi trạng thái bền vững và sự thật của bảng settings

**Gồm:** M4-4 + M4-6. **Một PR, một lần review, hai commit** — kế hoạch xác nhận điều này, không phải suy đoán.

**Cần trước:** addon native đã build; M2 WI-8a/WI-8b đã merge; merge order với M3-A4 đã chốt; câu hỏi mở 1 về `application` đã có quyết định của người.

**Bàn giao:** `ChangeResult` + `withFileLock` + một `atomicWriteJson` dùng chung; lớp `shadowing.ts` mới; trả lời thật cho mọi ghi trạng thái bền vững; guard chặn ghi giá trị chết; **một** kiểu kết quả chung cho Wave B (không phải hai).

**Đúng sau khi kết thúc:**

- `git grep -n saveRuntimeConfig -- packages/` → **0 hit**
- `git grep -n atomicWriteJson -- packages/` → **đúng một** định nghĩa, trong `packages/utils`
- `grep -c secret .../manager.ts` → **0**
- `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` → **0** (cổng chống trôi: nó đỏ ngay khi có call site thứ 14 xuất hiện)
- `bun test packages/utils/test/file-lock.test.ts` → xanh (hiện là 0 pass / 1 fail)
- Test tranh chấp **và** control phản âm của nó đã từng được thấy đỏ
- Test project-shadow khẳng định trên **byte thật** của file rằng sau khi panel ghi, key không có trong `config.yml` toàn cục và giá trị **trước khi ghi** vẫn còn — rollback in-memory xảy ra trước khi debounce `#queueSave` 100ms ráo nên ghi và rollback của nó hợp nhất thành một lần save
- Test control "không có shadow" khẳng định **cùng key đó CÓ** trong `config.yml` — không có test này thì hai cổng trên thỏa mãn được bằng một con guard từ chối **mọi** ghi
- `bun run check:ts` sạch

**Rời khỏi Wave B mà chưa release.** Đây là ranh giới quan trọng: xanh ở đây nghĩa là "đúng", không phải "đã ship".

### Wave C — Hợp đồng render

**Gồm:** M4-7. **Cần trước:** bản viết WI-4b đã được thống nhất (§6.1) — chưa mở PR nếu chưa. Không để WI-4b thay đổi đường đăng ký renderer trong cùng PR; WI-4b xây trên hợp đồng mà item này tạo ra.

**Bàn giao:** kênh `rawArgs: { json, complete }` có kiểu thật sự; **toàn bộ** object `options` được chuyển tiếp xuống renderer của extension (thay vì bốn field bị vứt); `__partialJson` thôi mang một nghĩa; renderer theo buffer thô vẽ lại theo mọi lần tiền tố dài thêm.

**Đúng sau khi kết thúc — năm cổng, tất cả đều cơ học và đều có thể đỏ:**

- **G1 — ADAPTER REACH (cổng quyết định).** `raw-args-render-channel.test.ts` **ĐỎ trên cây trước khi sửa** và xanh sau. Nó đỏ vì `RegisteredToolAdapter.renderResult` nhận `options.argsComplete === true` và khẳng định object đã bắt vẫn còn nó — hôm nay `wrapper.ts:62` đã vứt nó. **Để chứng minh cổng này có răng:** chỉ thêm field `rawArgs` vào hai interface, đổi gì khác, chạy lại — và quan sát nó **vẫn xanh**. Đó chính là bẫy mà kế hoạch gọi tên: một thay đổi chỉ-đổi-type xanh ở mọi nơi và không đến với ai. G1 là thứ phân biệt item này với một refactor ảo.
- **G2 — STREAM MONOTONICITY.** Chuỗi `rawArgs.json` ghi lại phải **không giảm** và **nối tiền tố**; giá trị cuối phải chứa `"path":"xd://probe"` (lớp ngoài) và **không phải** JSON thiết bị lớp trong.
- **G3 — REBUILD PARITY.** Render dựng lại từ transcript bằng render dựng động. Đỏ nếu `ui-helpers.ts:605` chưa được nối — một kiểu hỏng mà **cả `bun check` lẫn các test xdev có sẵn đều không nhìn thấy**.
- **G4 — HIDDEN-KEY NEGATIVE.** `HIDDEN_ARG_KEYS` (`json-tree.ts:23`) phải phủ key xdev mới. Khẳng định qua `formatArgsInline` rằng **cả cách viết cũ lẫn mới** đều không xuất hiện trong output. Đỏ ngay khi ai đó đổi tên ở `xdev.ts:57` và quên dòng này — rủi ro im lặng mà kế hoạch nêu tên.
- **G5 — TYPES.** `bun run check:ts` thoát 0.

**Sau Wave C:** hợp đồng render đã có thật, và **M2 WI-4b mới được phép xây lên trên nó**. Đây là thứ duy nhất trong M4 mở khóa công việc ở milestone khác. Vẫn chưa release.

### Wave D — Khả năng nhìn thấy triage

**Gồm:** M4-9 (phạm vi option **(a)**: state/shadowed, **không** có shadow-source).

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
| 7 | **Có viết bản WI-4b bây giờ, hay sau Wave B?** | M4-7 không được mở PR trước khi nó được thống nhất (§6.1), và nó **chưa tồn tại** | M4-7 (chặn sóng) |

---

## Quyết định cần bạn chốt

Bảng này là của người bảo trì, không phải của kỹ sư.

| # | Quyết định | Bối cảnh |
| --- | --- | --- |
| 1 | **Quyết định changelog của M4** (plan:§6.2) | Wave B **không thể mở PR** cho tới khi quyết định này có. *"Merge is allowed, release is not."* Đây là một quyết định duy nhất phủ cả ba sóng |
| 2 | **Ủy quyền `shippable: false` của Wave D bằng văn bản** | Cổng của M4-9 đòi nó như một điều kiện xong, bằng chữ |
| 3 | **Có bắt đầu M4 lúc này không, khi 2/4 item phụ thuộc công việc M2 chưa tồn tại?** | WI-8a/WI-8b (chặn M4-6) và WI-2 (chặn M4-9) đều chưa có trong cây. Wave C là item duy nhất không bị chặn bởi M2 — nó có thể đi trước nếu bạn muốn tạo hợp đồng render sớm cho WI-4b |
| 4 | **Chấp nhận việc giữ ba sóng unreleased?** | Cả ba đều `shippable: false`, nghĩa là người dùng có thể thấy thay đổi user-visible đã merge nhưng chưa xuất hiện trong bản phát hành cho tới khi milestone đóng lại. Đó là hệ quả trực tiếp của §6.2, không phải sự cố |
| 5 | **Xác nhận §7 về deepseek-harness** trước khi phát hành | Bốn item này không mang theo nghĩa vụ license nào (không file nào đến từ dsh). Nhưng điểm pháp lý chỉ thành việc thật **ở thời điểm phát hành** — đúng lúc cả ba sóng đang chờ cùng một quyết định changelog |

---

## Quy ước khi đọc

- **Tài liệu này bằng tiếng Việt. Code giữ nguyên tiếng Anh.** Tên file, tên symbol, tên commit và nội dung CHANGELOG không được dịch.
- **`bun check` và `bun test` — không bao giờ `tsc`, không bao giờ `npx tsc`.** `bun run check:ts` là cổng thật cho cả bốn item.
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
   đi từ 0 pass / 1 fail sang xanh trước khi viết dòng code nào.

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
# 1. Gỡ chặn trước — addon CHƯA được build trong môi trường này.
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build

# 2. Chứng minh đã gỡ chặn (hiện tại: 0 pass, 1 fail, lỗi pi_natives addon).
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

Cách viết trong plan là `bun test packages/coding-agent/test/ && bun check` —
**không đủ và không chạy được như viết**. `bun test` báo 0 pass cho tới khi native
addon được build, và item này làm tệ hơn vấn đề chung: chính `withFileLock` import
`FileLock` từ `@oh-my-pi/pi-natives` ở `file-lock.ts:9`, nên code được test giờ phụ
thuộc trực tiếp vào addon. Dùng `bun run check:ts` cho cổng TS thay vì `bun check`:
`bun check` fan ra thêm `check:rs`, mà Rust là toolchain riêng, không thuộc item này.

### Cổng hoàn thành

Cả sáu bước xác minh phải pass, đúng thứ tự, với addon đã build. Cụ thể, người review
phải chứng minh được: (a) `bun test packages/utils/test/file-lock.test.ts` xanh — nó
đang là 0 pass / 1 fail, nên riêng nó đã là một cổng thật và hiện đang đỏ; (b) file test
mới pass **và** test negative-control của nó khẳng định thuật toán không khoá thực
sự mất một update (xoá tạm `withFileLock` khỏi `#mutateConfig` và xác nhận test tranh
chấp đỏ lên — một cổng chưa từng thấy đỏ thì không phải cổng); (c) `git grep -n saveRuntimeConfig -- packages/`
không có hit; (d) `git grep -n atomicWriteJson -- packages/` cho đúng một định nghĩa,
ở `packages/utils`; (e) `grep -c secret .../manager.ts` **in ra dòng `0`** (GNU grep;
`git grep -c` sẽ in rỗng — đừng dùng bản đó ở cổng này); (f) `bun run check:ts`
xanh — chính nó bắt được phép lệch interface tui/coding-agent mà plan cảnh báo.

DONE còn đòi hỏi thêm một quyết định của con người về câu hỏi mở số 1 (ai sở hữu
`application`), vì mô hình mà plan dùng cho kiểu đó nằm trong một repo không tồn tại ở đây.

**Cổng có thực sự đỏ được không:** Có, và **bốn** trong sáu bước đang đỏ ngay hôm nay.
Bước 1-2 đỏ: native addon chưa build, `withFileLock` import `FileLock` từ
`@oh-my-pi/pi-natives` (`file-lock.ts:9`), và `bun test packages/utils/test/file-lock.test.ts`
báo `0 pass, 1 fail` với `Failed to load pi_natives native addon for darwin-arm64` —
đã chạy và xác nhận. Bước 3 đỏ vì file chưa tồn tại. **Bước 4 cũng đỏ, với đúng nguyên
nhân của bước 2**: `bun test packages/coding-agent/test/plugin-config.test.ts` báo
`0 pass, 1 fail` cùng lỗi addon — đã chạy và xác nhận. Bước 5 là cổng thật: hiện xanh
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
| `restart-required` được test khẳng định, và `setEnabled` nên báo nó "khi không có đường HMR". | **THIẾU ĐỊNH NGHĨA — "không có HMR" thực ra là reload một phần, và kiểu này không có tham chiếu nào** | `restart-required` không xuất hiện ở bất cứ đâu trong repo (0 hit). Và reload của overlay settings **chứng minh được là một phần**: `settings-selector.ts:1329` → `selector-controller.ts:305-312` gọi `clearPluginRootsAndCaches`, `refreshSkillState`, `refreshSlashCommandState` và `resetCapabilities`, nhưng **không** gọi `refreshAgentDiscovery` — thứ `reloadPlugins` thật làm ở `acp-agent.ts:2167`. Nên câu trả lời trung thực cho đường overlay hiện tại là "áp dụng một phần", mà cặp nhị phân `applied | restart-required` không diễn đạt được. Đây là quyết định của con người, không phải chi tiết hiện thực. Xem câu hỏi mở số 1. |
| `PluginSettingsMarketplaceManager.setPluginEnabled` là mutator thứ tư, cũng nằm trong gói overlay này. | **GÂY HIỂU NHẦM — khác lớp, khác file, nhưng vẫn ghi CHUNG lockfile** | Nó do `MarketplaceManager` ở `marketplace/manager.ts:686` thực hiện, không phải `PluginManager`, và nó ghi marketplace registry qua `atomicWriteJson`, không bao giờ qua `#saveRuntimeConfig`. Nó không gọi `#saveRuntimeConfig`, nhưng nó **ghi cùng một file lockfile** qua `#writeRuntimeConfig` (xem phần trên). Vì vậy nó **không** nằm ngoài phạm vi khoá của M4-4 — xem "Cần người quyết" về `#writeRuntimeConfig`. Nó chỉ chung gói overlay tui, nên nới kiểu trả về là một quyết định breaking độc lập. |
| Trích `atomicWriteJson` từ `marketplace/registry.ts:44-70`. | **LỆCH MỘT Ở CUỐI** | Hàm trải 44-71. Dòng 70 đóng catch bên trong; dòng 71 là dấu ngoặc đóng của hàm. Xoá tới 71. |
| Kiểm bề mặt export wildcard `packages/tui/package.json:93-96` trước khi ship. | **LỆCH MỘT** | Khối export wildcard `./*` nằm ở dòng 94-97. Kết luận plan rút ra (`PluginSettingsManager` tới được bởi consumer bên ngoài) vẫn đúng. |
| Bằng chứng của M3-A4 là `grep -c secret manager.ts` → 0. | **ĐÃ LÀ 0 Ở BASELINE — đây là guard hồi quy, không phải bằng chứng** | Đếm là 0 ngay trên HEAD `808b365`, nên nó không phân biệt được "M3-A4 đã land" với "M3-A4 chưa từng tồn tại". Giữ như guard mà PR này không được phá, nhưng đừng đọc nó như một tuyên bố về trạng thái của M3-A4. Va chạm thật là cả hai bản vá viết lại `setPluginSetting` ở 942-949 — claim đó **đúng** và được kiểm chứng độc lập. |
| Lệnh: `bun test packages/coding-agent/test/ && bun check`. | **KHÔNG ĐỦ VÀ SẼ KHÔNG CHẠY ĐÚNG NHƯ VIẾT** | `bun test` báo 0 pass cho tới khi native addon được build, và item này làm nặng thêm: chính `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives` ở `file-lock.ts:9`, nên code được test giờ phụ thuộc trực tiếp addon. Thêm `bun --cwd=packages/natives run build` làm bước 0. Và dùng `bun run check:ts` cho cổng TS thay vì `bun check` — `bun check` fan ra `check:rs`, mà Rust là toolchain riêng, không thuộc item này. |
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


Hệ quả cho cổng: ở trạng thái môi trường hiện tại, **chỉ cổng 1 và cổng 4 chạy được**; cổng 2 và cổng 3 bị chặn bởi môi trường, không phải bởi thiết kế. Đừng dùng hết thời gian debug lỗi Ninja trong khi tưởng đang debug guard.

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

Bốn cổng, tất cả đều máy-móc. 1 và 4 chạy được ngay ở trạng thái môi trường hiện tại; 2 và 3 cần native addon (xem môi trường ở trên).

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
| `settingsOf(scope).getProvenance()` không bao giờ trả `'env'`, nên dùng `setting.provenance(scope)`. | ĐÚNG — đã kiểm chứng với source | Đúng, và đáng giữ như một quy tắc tường minh. `Settings.getProvenance` (`settings.ts:800-808`) đi `#overrides` → `#configOverlay` → `#project` → `#global` → parent và hoàn toàn không có nhánh env; chỉ `Setting.provenance` (`registry.ts:765`) đặt phép kiểm `#effectiveEnv` lên trên. Cũng lưu ý union đầy đủ là sáu thành viên chứ không phải năm: `"env" | "runtime" | "overlay" | "project" | "global" | "default"` (`settings.ts:62`) — kiểu soi trong tui phải mang đủ sáu. |
| Work item này là "chặn cả 13 chỗ". | NHẬN XÉT ĐÚNG, NHƯNG SAI MẠCH | 13 chỗ là bản kiểm kê đúng, nhưng chúng là chỗ sai để cưỡng chế bất cứ điều gì. Cả 13 đều là chỗ gọi `SettingsHost.set` bên trong MỘT file, và `SettingsHost.set` có đúng một hiện thực sản xuất — `createSettingsHost` tại `settings-ui.ts:77`. Cưỡng chế chốt chặn bên trong `set` đó tự động phủ cả 13 và không thể bị đánh bại bởi một panel M3 trong tương lai thêm chỗ thứ 14. `grep` toàn repo `settings.set(` / `#settings.set(` trong `packages/tui` trả về đúng 13 dòng đó và không gì khác. Cảnh báo của chính plan rằng danh sách dòng hardcode là hiện vật dễ vỡ nhất là đúng — cách sửa là XOÁ danh sách khỏi thiết kế, đừng bảo trì nó cẩn thận hơn. |
| `SettingsHost` là rủi ro interface xuyên package "y hệt PluginSettingsManager". | ĐÚNG, kèm một điều kiện làm giảm mức độ | Hình dạng thoả cấu trúc là có thật: tui khai báo `SettingsHost` và coding-agent thoả nó trong `createSettingsHost` (`settings-ui.ts:51`, import kiểu ở dòng 2), và `packages/tui/package.json` export wildcard `'./*' -> './src/*.ts'`, nên về nguyên tắc có thể có bên hiện thực ngoài repo. Nhưng grep chỉ ra MỘT hiện thực sản xuất trong repo này. M4-6 thêm một thành viên mới (bổ sung, không đổi chữ ký); M4-4 đổi kiểu trả về của một method có sẵn, đó mới là thứ phá vỡ thật sự. M4-6 là nửa ít rủi ro hơn của Sóng B. |
| Ngữ cảnh nhiệm vụ nói repo ở git HEAD `5873776`. | CŨ | Mọi spec trong lô này trích `5873776` đều lệch. HEAD tại lúc rà soát (2026-09-27) là `9cfbaba` trên nhánh `milestone-1`. Vì số SHA có tuổi, hãy chạy `git rev-parse --short HEAD` thay vì tin dòng này; lúc rà soát `git log --oneline -5` cho `9cfbaba`, `e040a60`, `808b365`, `33d6e33`, `ecd516f`. |

## Cần người xác nhận

Ba điểm dưới đây là mâu thuẫn NỘI TẠI của spec hoặc chỗ spec hứa dữ liệu rồi không cấp. Không tự sửa — cần người quyết trước khi viết code.

1. **Rollback được coi là đã chốt ở nửa build, lại được hỏi ở nửa quyết định.** Bước 5, bước 7, cổng (2) và hợp đồng test đều dựng sẵn rollback như một quyết định xong: `previous === undefined ? setting.unset(settings) : setting.set(settings, previous);`, khẳng định trên đĩa rằng khoá không còn sau lần ghi, và UI trả `false`. Nhưng open question #1 lại nói "nó quyết định liệu nửa rollback của chốt chặn có tồn tại hay không", và đặt ra phương án (b) — cho ghi và chỉ chú thích — là phương án có tiền lệ đã phát hành ở `omp config set`. Hai bên không thể đúng cùng lúc. Cần chốt: (a) rollback, hay (b) ghi rồi chú thích.

2. **Bước 11 hứa "sáu ca và đúng fixture" nhưng `test_contract` không có cái nào.** `test_contract` là một đoạn văn xuôi nêu hợp đồng quan sát được, không liệt kê tên sáu ca, không đưa fixture nào. Con số sáu chỉ suy ra được từ ghi chú trong `files_touched` (project / env / overlay / runtime + no-shadow + on-disk rollback), và đó là suy luận của người viết mục này, không phải dữ liệu spec. Cần fixture cụ thể cho sáu ca trước khi viết test — đặc biệt là cách dựng một project config ghi đè, một overlay `--config`, và một runtime override trong test harness.

3. **Affordance hiển thị thông báo trong tui chưa được đặt tên và chưa kiểm chứng.** Bước 7 nói hiện `message` "qua affordance lỗi/trạng thái nội tuyến mà component đã có", và code shape dùng `this.#showInlineStatus(...)` với chú thích "reuse the component's existing affordance" — tức là một tên tượng trưng. Spec không nêu method thật của `SettingsSelectorComponent` cho việc này, cũng không nêu hành vi khi thông báo dài hơn bề rộng dòng hay khi ghi trùng. Cần bạn chỉ đích danh affordance (hoặc nói rõ phải thêm một cái mới), và nói rõ `#writeSetting` sẽ trả false thì thao tác chỉnh sửa cục bộ trong panel đi tiếp thế nào.


---


## M4-7. Hợp đồng render có kiểu (sóng C)

**Sóng:** M4 Wave C — Hợp đồng render (`shippable: false` — sáp nhập với M4-4/M4-6 thành một quyết định changelog duy nhất của M4; §6.2 cấm ship bất kỳ sóng M4 nào một mình) | **Effort:** M | **Phụ thuộc:** không có phụ thuộc build (`depends_on` rỗng) — nhưng bị chặn bởi một quy tắc thứ tự: WI-4b của M2 phải được viết vào §11 và được thống nhất **trước khi** mục này mở PR.

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

- **M2 WI-4b (bề mặt đăng ký renderer; §6.1)** — chỉ là thứ tự bề mặt. WI-4b không được mang thay đổi của nó vào đường đăng ký renderer của extension trong cùng PR với mục này; mục này đổi `ToolRenderResultOptions` và hai adapter, WI-4b dựng trên hợp đồng sinh ra từ đó. Quy tắc thứ tự của plan là "M4-7 trước, WI-4b sau", và nó được thoả bằng việc mục này land thành commit riêng. Lưu ý: bản thân WI-4b chưa tồn tại trong §11 — plan nói điều này phải được viết và thống nhất **trước khi** mục này mở PR.
- **Quyết định changelog của M4 (§6.2)** — Wave C là `shippable: false`. Mục này đổi thứ renderer `xd://` đầu tiên nhận và đổi tên một khóa, cả hai đều người dùng thấy được, nên nó merge như một phần của quyết định changelog M4 duy nhất bao trùm Wave B, C và D. **Không** thêm mục CHANGELOG trong PR này; **không** mở PR trước khi bản viết WI-4b được thống nhất.

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
| Plan §M4-7 "Chi tiết" bước 1: "sửa short-circuit ở `tool-execution.ts:388-394`. Early return ở `:392` nằm trên `#displayInputVersion++` ở `:394", nên một renderer tiêu thụ raw sẽ không repaint giữa stream" — viết như một khiếm khuyết đang sống. | **ĐỊNH KHUNG SAI** — số dòng đúng, chẩn đoán thì không | Short-circuit **đúng hôm nay**. `displayArgsForPrefix` cấp phát object args mới ở mọi frame mà tiền tố raw lớn lên (`const rawPrefixChanged = entry.exposeRawPartialJson && prefix !== entry.displayPrefix;` ở :424, rồi một literal mới ở :428), trả `changed: true`, và `#tick` chỉ gọi `updateArgs` bên trong `if (display.changed)` (:613-616) — nên identity của args đổi đúng lúc tiền tố raw lớn lên, và `#displayInputVersion++` có bắn. Early return ở :392 là hợp lý. Nó **trở nên không hợp lý** chỉ như hệ quả của bước 2: khi `rawArgs` thành side channel, args decode có thể reference-identical trong khi `rawArgs.json` đã lớn lên, và guard sẽ nuốt mất frame. Nên bước 1 không phải sửa bug, nó là lan can làm bước 2 an toàn — đó là lý do thứ tự mang tính chống đỡ. Chính văn bản của plan ("nhưng phải tiến version khi chỉ phần tiền tố raw đổi") nói đúng yêu cầu; chỉ có cách đóng khung nó là một khiếm khuyết có sẵn là sai, và comment ở :388-391 ("Callers always allocate a new arg object on each streamed delta") trở thành sai **đúng vào thời điểm bước 2 land** và phải được viết lại chứ không được giữ. |
| Plan §M4-7 "Chi tiết" bước 2: "sửa hai adapter ở `wrapper.ts:59-64` và `sdk.ts:1217-1223` để forward toàn bộ options object" — hàm ý cả `renderCall` lẫn `renderResult` đều đang bị thu hẹp ở cả hai site. | **CHẨN ĐOÁN ĐÚNG, PHẠM VI THIẾU** — và plan nêu hai field bị ném trong khi có bốn | Chỉ `renderResult` thu hẹp. `wrapper.ts:55-57` forward `options` nguyên khối cho `renderCall` (`registeredTool.definition.renderCall!(args, options, theme as Theme)`), và `sdk.ts:1212` là tham chiếu trần `renderCall: tool.renderCall` không có wrapper nào. Người triển khai nghĩ "sửa cả hai adapter cho đối xứng" sẽ cào vô nửa `renderCall` cho cào và, tệ hơn, có thể thêm một cast thu hẹp ở đó, làm hỏng đúng con đường đang chạy tốt. Tách riêng: adapter ném **bốn** field chứ không phải hai. Ngoài `argsComplete` và `executionStarted`, chúng còn ném `renderContext`, thứ mà `#rebuildDisplay` set ở tool-execution.ts:960 (nhánh custom) và :1062 + :1122 (nhánh built-in — có bốn chỗ gán nếu tính cả `??=` ở :885, không phải hai) và mà `RenderResultContextOptions` (renderer.ts:30, dùng ở :75) sinh ra chính là để mang nó. Built-in renderer nhận được nó; extension renderer chưa bao giờ có nó. Drift rộng hơn plan nói, và cách sửa vá thêm miễn phí một bug sống thứ ba. |
| Plan §M4-7 "Vị trí": `packages/coding-agent/src/extensibility/extensions/types.ts:581-588` cho `ToolRenderResultOptions`, dùng ở `:661` (`renderCall`) và `:664` (`renderResult`). | **CŨ KHOẢNG 25 DÒNG** | `ToolRenderResultOptions` nằm ở types.ts:606-613 (doc comment :605), không phải 581-588. Các site dùng là types.ts:686 (`renderCall?: (args, options: ToolRenderResultOptions, theme) => Component`) và types.ts:691 (`renderResult?: (result, options, theme, args?) => Component`), không phải :661/:664. Claim thực chất của plan vẫn đứng vững — đã xác minh interface chỉ khai báo `expanded`, `isPartial` và `spinnerFrame`, và thực sự thiếu cả `argsComplete` lẫn `executionStarted` mà `RenderResultOptions` (renderer.ts:10-27) đã mang từ lâu. Chỉ số dòng cần sửa. |
| Plan §M4-7 "Rủi ro" (1): "Sáu file test trỏ tới chuỗi literal." | **XÁC MINH CHÍNH XÁC** | Đúng — đúng sáu file test tham chiếu `__partialJson`. Mang sang nguyên vẹn, kèm caveat: dưới nhánh được khuyến nghị của câu hỏi mở 1 (chỉ đổi tên khóa xdev bên trong) không file nào trong sáu cần sửa, vì cả sáu đều assert trên khóa BÊN NGOÀI. Kỳ vọng của plan rằng chúng "được kỳ vọng phải cập nhật" vì thế chỉ đúng dưới nhánh đổi tên khóa ngoài. Bất kể nhánh nào, cảnh báo của plan vẫn đứng: đọc từng assertion và xác nhận nó còn mô tả hành vi thật — một test ghim "renderer nhận raw prefix" không được lặng lẽ bị đảo thành "renderer nhận inner args". Bằng chứng: `git grep -n '__partialJson' -- packages/*/test/` → `event-controller-args-reveal.test.ts` (:140,:141,:183), `tool-args-reveal.test.ts` (:34,:36,:260), `edit-renderer.test.ts` (:53,:417), `bash-render.test.ts` (:57), `json-tree-render.test.ts` (:32), `tool-execution-custom-repaint.test.ts` (:23,:88,:98,:144,:161). Cả sáu đọc output đã render hoặc trạng thái object sống — không file nào source-grep một file triển khai, nên cả sáu vẫn hợp lệ dưới AGENTS.md. |
| Plan §M4-7 "Phụ thuộc": ràng buộc còn lại duy nhất là ràng buộc thứ tự bề mặt với M2 WI-4b, và M4-7 không được mở PR trước khi WI-4b được viết vào §11 và thống nhất. | **XÁC MINH** — không có coupling tầng build, quy tắc thứ tự được xác nhận | Xác nhận bằng cách soi trực tiếp: `git grep -n 'packages/tui/src/tools/renderer-registry'` không thấy file nào như vậy, và không work item M4 nào ngoài mục này chạm `packages/tui/src/tools/`. Ràng buộc thực sự chỉ là thứ tự tư vấn, không phải coupling build — mục này có thể triển khai và review độc lập, nhưng PR của nó không được merge trước một WI-4b đã được review. Cũng đã xác nhận độc lập bằng chính văn bản gate của plan: Wave C là `shippable: false` và §6.2 nói không sóng M4 nào ship trước quyết định changelog M4 duy nhất bao trùm Wave B, C và D. |

## Cần người xác nhận

Mấy điểm dưới đây là **mâu thuẫn nội tại của chính đặc tả**, không phải mâu thuẫn với plan. Tôi không tự sửa; ghi ra đây để người đọc phải thấy.

- **`gate` tự mâu thuẫn về số lượng cổng.** Nó mở đầu bằng câu "Four gates. Each is mechanical and each can go red." nhưng liệt kê **năm** cổng G1, G2, G3, G4, G5 — rồi tự kết bằng "All five are able to fail on incomplete work." Mục "Cổng hoàn thành" ở trên đã dùng con số năm cho khớp với danh sách. Cần bạn xác nhận đó là **năm** cổng.
- **Số mục §6 khác nhau giữa các trường của spec.** Trường `wave` và `blocks` dùng **§6.2** cho quyết định changelog, còn `plan_corrections` mục 6 dùng **§6.3** cho cờ `shippable` của Wave C. Chưa có mặc định — cần bạn quyết số mục nào là đúng.
- **Hai cách ghi neo cho cùng hai call site trong `tool-args-reveal.ts`, và chúng không mâu thuẫn.** `files_touched` đưa call site (`:566`, `:615`), còn `steps` bước 7 đưa khoảng bao quanh (`#tick` `:613-616`, `flushAll` `:566`). `:615` nằm trọn trong `:613-616`, và cả hai vị trí đều đúng. `steps` chi tiết hơn và là cách đi — không có gì cần xác nhận ở đây.
- **Snippet `code_shape` của `sdk.ts:1217` — đã kiểm, không phải mâu thuẫn.** Nó **là** dạng sau khi sửa: forward thẳng `options`, không có object literal `{ expanded, isPartial, spinnerFrame }` nào. Copy nguyên văn là đúng bước 6. (Dạng trước khi sửa, đọc từ cây thật, là `const component = tool.renderResult?.(result, { expanded: options.expanded, isPartial: options.isPartial, spinnerFrame: options.spinnerFrame }, theme);` tại `sdk.ts:1215-1217` — khác snippet hoàn toàn.)
- **Câu hỏi mở 1 vừa cần người quyết vừa đã có sẵn mặc định.** Spec vừa gọi nó là quyết định của maintainer vì hai nhánh ship lượng churn khác nhau, vừa viết "If nobody decides, take the recommended branch and record the deviation in the PR description." Tôi đã trình bày cả hai vế. Cần bạn xác nhận có thực sự coi đây là quyết định cần chặn, hay mặc định nhánh khuyến nghị đã được uỷ quyền sẵn.


---


## M4-9. Khả năng nhìn thấy triage (sóng D)

**Sóng:** M4 Wave D — Khả năng nhìn thấy triage (`shippable: false`, chờ cổng changelog dùng chung của M4, plan §6.2/§6.3)
**Effort:** S cho phương án (a) (~1 ngày: 2 file mới + 2 file sửa + 1 test). M cho phương án (b) (~2-3 ngày: (a) cộng thêm một thay đổi shared-core trong `capability/index.ts` và một thay đổi 6 call site trong `state-manager.ts`). Phán quyết "S là lạc quan" của plan là đúng cho (b), còn (a) thực sự là S.
**Phụ thuộc:** Bắt buộc phải merge trước khi ship — M2 WI-2 (thứ tự nạp extension xác định + giải quyết va chạm tường minh). **CHƯA ĐẠT** tính đến 2026-09-27: `packages/coding-agent/test/extension-load-order-determinism.test.ts` không tồn tại và `git grep -n 'extension-load-order' packages/coding-agent/` trả về 0 hit, nên deliverable của WI-2 chưa có trong cây. Ngoài ra không phụ thuộc gì khác — phương án (a) không đụng shared core.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli/extensions-triage-cli.ts` | tạo | Module triển khai mới. Phép chiếu thuần tuý trên `loadAllExtensions`: nhân bản đúng tuyến ACP gồm `Settings.init()` + `cfgDisabledExtensions.get(sm)` để CLI và dashboard cùng đồng ý về trạng thái disable, ánh xạ mỗi `Extension` thành `ExtensionTriageRow`, in dòng đã khử vệ sinh hoặc `--json`. Không thêm state, không suy diễn shadowing, không ghi settings. | có (file chưa tồn tại — `ls packages/coding-agent/src/cli/` không thấy file extensions-triage nào; thư mục có sẵn và chứa 33 module `*-cli.ts` anh em (`ls packages/coding-agent/src/cli/*-cli.ts \| wc -l` → 33; tổng 62 mục trong thư mục tính cả `command-help.ts`, `flag-tables.ts`, `args.ts` và 3 thư mục con — không phải 44 như bản nháp trước)) |
| `packages/coding-agent/src/commands/extensions-triage.ts` | tạo | Lớp `Command` kiểu oclif mỏng: `export default class ExtensionsTriage extends Command` với `static description`, cờ `json: Flags.boolean()` và `run()` phân tích tham số rồi bàn giao cho `runExtensionsTriage`. Phải `export default` vì `cli-commands.ts` làm `.then(m => m.default)`. | có — **KHÔNG có trong plan**. Bắt buộc: `cli-commands.ts:99` cho thấy mọi entry nạp `./commands/<name>.ts` qua dynamic import giải về `.default` (ví dụ `load: () => import("./commands/config").then(m => m.default)`). Plan chỉ nêu file `-cli.ts` nên làm đúng chữ nghĩa plan sẽ tạo ra một file mà registry không định tuyến tới. Thư mục này đã có 49 wrapper như vậy; `commands/config.ts` là tham chiếu nhỏ nhất và đầy đủ. |
| `packages/coding-agent/src/cli/command-help.ts` | sửa | Thêm `export const extensionsTriageHelp = { description: "..." } satisfies CommandMetadata;` cạnh ~49 help entry còn lại. Cần để bộ render help nhẹ và `CommandMetadata` help giữ đồng bộ. | có — cùng lỗi thiếu trong plan. Đã xác nhận hình dạng tại `command-help.ts:3-5` (`acpHelp`) và interface `CommandMetadata` tại `packages/utils/src/cli.ts:136-142` (`{description?, hidden?, flags?, args?, examples?}`). |
| `packages/coding-agent/src/cli-commands.ts` | sửa | Thêm một `CommandEntry` vào mảng `commands` đã export: `{ name: "extensions-triage", load: () => import("./commands/extensions-triage").then(m => m.default), help: commandHelp.extensionsTriageHelp }`. Đây là toàn bộ phần nối cần thiết để `runCli` tuyến `omp extensions-triage` thay vì chuyển argv cho LLM như một prompt. | có (file tồn tại; header module ghi rõ thêm entry ở đây là đủ để chiếm argv, và dẫn #1496 — "args silently leak to the LLM" — là hồi quy mà tách bạch này chặn. `load:` dynamic import là bề mặt lazy-loading được thành lập và được cho phép; luật cấm inline import trong AGENTS.md chi phối import helper và kiểu, và cả 49 entry hiện có đều dùng đúng hình thức này) |
| `packages/coding-agent/test/extensions-triage-cli.test.ts` | tạo | Test hợp đồng cho phép chiếu. Dựng cây fixture với một skill cùng tên ở hai cấp để đúng một rơi vào `shadowed`, chạy `toTriageRow` trên output thật của `loadAllExtensions`, và khẳng định câu hỏi triage trả lời được: mỗi extension xuất hiện đúng một lần, state lấy từ union thật, có một dòng shadowed và nó mang `shadowedBy === undefined` (khoảng trống đã ghi nhận), và một dòng bị chính sách disable mang `disabledReason` của nó. | có (file mới; thư mục test tồn tại. Tham chiếu: `packages/coding-agent/test/extensions-discovery.test.ts` (32 KB) và `packages/coding-agent/test/discovery/disabled-extensions.test.ts` đã khai thác `loadAllExtensions` — đọc chúng trước và dùng lại fixture-tree helper thay vì bịa cây thứ hai. Không `mock.module()`; dùng `vi.spyOn` trên module đã import với `vi.restoreAllMocks()` trong `afterEach`.) |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Added`, mở đầu bằng kết quả người dùng thấy: ``Added `omp extensions-triage`, a read-only inventory of every discovered extension with its load state and the disable policy that blocked it (--json for machine-readable output)``. Không kể chuyện nguyên nhân gốc. | có — nhưng **BỊ CHẶN** bởi phép uỷ quyền changelog của Wave D: plan §6.3 đánh dấu Wave D là `shippable: false` và §6.2 nói cả ba sóng M4 còn sống gộp dưới một quyết định changelog duy nhất. Chưa ghi dòng này cho tới khi phép uỷ quyền tồn tại; theo AGENTS.md, kế hoạch này không bao giờ tự soạn changelog. |
| `packages/coding-agent/src/capability/index.ts` | sửa | **CHỈ phương án (b).** Đổi `seen` từ `Set<string>` thành `Map<string, Item>` và cả hai phép tính `aliasSeen` từ `.some()` sang `.find()` để phần tử thắng khôi phục được, rồi ghi nó là `_shadowedBy` tại hai chỗ `_shadowed = true` sẵn có. Ngày nay hai chỗ đó chỉ là boolean trần và phần tử thắng bị vứt. | có — mọi neo xác nhận bằng grep thật: `seen = new Set<string>()` tại `:228`; `seen.has(key)` tại `:242` và `:264`; `seen.add(key)` tại `:255` và `:265`; `deduped.some(...)` tại `:246` và `:269`; `item._shadowed = true` đúng tại `:247` và `:271`; đường sống sót tại `:273`. Plan nêu `:247` và `:271` là chỗ sửa và đúng, nhưng bỏ sót việc `:228`/`:246`/`:269` phải đổi trước, nếu không thì bản sửa là một thao tác rỗng. |
| `packages/coding-agent/src/capability/types.ts` | sửa | **CHỈ phương án (b).** Thêm trường `_shadowedBy` vào kiểu giao của item để trường mới được định kiểu tại biên thay vì ép kiểu ở nơi tiêu thụ. `CapabilityResult.all` đã được tài liệu hoá là "All items including shadowed duplicates (for diagnostics)" — đây chính là kênh chẩn đoán được cho phép. | có — `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>` xác nhận tại `types.ts:165`. Cùng kiểu giao nội tuyến đó bị lặp ở `capability/index.ts:144`, `:145`, `:146`, `:211`, `:218` — tất cả phải có trường mới, nếu không phép gán ở `:247`/`:271` sẽ không type-check. |
| `packages/coding-agent/src/modes/components/extensions/state-manager.ts` | sửa | **CHỈ phương án (b).** Truyền một `getShadowedBy` thật ở cả sáu call site `addItems` để `Extension.shadowedBy` được lấp đầy cho mọi kind. | có — `loadAllExtensions` xác nhận tại `:69`. Lệnh đọc `shadowedBy: opts?.getShadowedBy?.(item)` ở `:103` và khai báo kiểu `getShadowedBy?: (item: T) => string | undefined;` ở `:81` là **hai** tham chiếu duy nhất trong toàn repo. Cả sáu call site (`:116`, `:127`, `:138`, `:149`, `:209`, `:220`) đã xác nhận bằng grep và không call site nào truyền option, nên trường luôn là `undefined` ngày nay. `resolveState` được gọi ở `:86-89` và còn ở `:180`, `:236`, `:267` cho các kind mcp/hook/file, vốn dựng hàng của chúng bằng tay chứ không qua `addItems` — bốn chỗ đó cần cùng cách xử lý, nếu không các kind mcp/hook/context-file vẫn là `undefined` ngay cả sau (b). |

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

0. **Tiền đề môi trường:** `bun --cwd=packages/natives run build` đã chạy. Tính đến 2026-09-27 addon chưa có (`find . -name "*.node" -not -path "./node_modules/*"` → rỗng), và mọi `bun test` trong mục này đỏ với `Failed to load pi_natives native addon for darwin-arm64` (đã chạy thật: `bun test packages/coding-agent/test/discovery/disabled-extensions.test.ts` → 0 pass, 1 fail, 1 error) — đó là đỏ vì môi trường, KHÔNG phải đỏ vì công việc. Nếu addon chưa build thì mọi điều kiện (2)-(5) phải ghi là "chưa chạy", không phải "chưa đạt".
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
| `shadowedBy` được đọc tại `state-manager.ts:103` và không call site `addItems` nào truyền `getShadowedBy`, nên nó luôn là `undefined` (grep toàn repo trả về đúng 2 hit: khai báo kiểu và lệnh đọc). | CONFIRMED — đây là claim trung tâm của plan và nó đúng tuyệt đối. | Không có. Tiêu chí thoát mà plan đặt cho phương án (a) là có thật: nêu tên một nguồn che khuất là điều thực sự bất khả thi nếu không có mã mới, nên effort S thực sự lạc quan cho (b) và thực sự rẻ cho (a). Mang niềm tin điều này. Bằng chứng: `git grep -n 'getShadowedBy' -- packages/` trả về đúng 2 dòng — `state-manager.ts:81` (`getShadowedBy?: (item: T) => string | undefined;`) và `state-manager.ts:103` (`shadowedBy: opts?.getShadowedBy?.(item),`). `git grep -n 'addItems' -- packages/` cho thấy 6 call site ở `:116, :127, :138, :149, :209, :220`, không cái nào truyền option. Xác nhận phía hạ nguồn: `isShadowedExtension` và renderer "Shadowed by X" tại `inspector-model.ts:466-482` của TUI đã xử lý trường này, nên một chuỗi không bao giờ tới là nhất quán với hành vi quan sát được. |
| Nguyên nhân gốc là `packages/coding-agent/src/capability/index.ts:247` và `:271`, nơi `item._shadowed = true` được gán như một boolean trần và phần tử thắng bị vứt. | CONFIRMED, kèm một bổ sung mà plan bỏ sót. | Hai chỗ `_shadowed = true` đúng là ở `:247` và `:271` như claim — nhưng khôi phục phần tử thắng cần **THÊM BA** sửa đổi plan không nhắc tới, nếu không bản sửa sẽ compile và lặng lẽ không làm gì. (i) `seen` khai báo `const seen = new Set<string>()` ở `:228` — chỉ key, không tham chiếu item, nên nhánh `keySeen` ở `:242`/`:264` không có gì để gọi tên. Nó phải thành `Map<string, T & { _source: SourceMeta }>`, với `seen.add(key)` ở `:255` và `:265` thành `seen.set(key, item)`. (ii) `aliasSeen` tính bằng `deduped.some(...)` ở `:246` và `:269`, trả về boolean chứ không phải phần tử khớp — cả hai phải thành `.find(...)`. (iii) các kiểu giao nội tuyến ở `index.ts:144, :145, :146, :211, :218` và kiểu công khai ở `types.ts:165` đều khai báo `_shadowed?: boolean` và phải có thêm trường mới, nếu không phép gán sẽ không type-check. Một kỹ sư làm theo plan đúng chữ nghĩa sẽ tạo ra mã pass `bun run check:ts` và báo `undefined` mãi mãi. Bằng chứng: grep `seen = new Set<string>\|deduped.some\|seen.has(key)\|seen.add(key)\|_shadowed = true` → 228, 242, 243, 246, 247, 255, 264, 265, 266, 269, 271, 273. `sed -n '274,320p'` xác nhận đường sống sót ở `:273`. `sed -n '150,180p' types.ts` xác nhận `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>` ở `:165`. Cùng grep đó còn xác nhận `return { items: deduped, all: ...allItems }` ở `:290-295` — item shadowed bị loại khỏi `items` nhưng **có** mặt trong `all`, đó là cái `loadAllExtensions` đọc. Nên các hàng shadowed thực sự tới được CLI với `state: "shadowed"`. |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:1189-1196` (route `_omp/extensions`) | NEARLY CONFIRMED — lệch một dòng ở cuối. | Khối `case "_omp/extensions":` là dòng 1189-1195. Dòng 1196 là `case "_omp/extensions/toggle":`, route KẾ TIẾP. Hãy dùng 1189-1195. Quan trọng hơn, khối này còn gánh tải ngoài cách dùng của plan: dòng 1191-1193 là `const sm = await Settings.init(); const disabledIds = cfgDisabledExtensions.get(sm);` và chúng chính là parity runtime-mà-CLI mà lệnh mới bắt buộc sao chép. Plan chỉ trích route này là nơi dữ liệu đã lộ ra; kỹ sư đọc lướt sẽ bỏ lỡ yêu cầu nhân bản và ship một CLI báo thiếu mọi disable ở cấp item. Bằng chứng: `sed -n '1189,1196p' ... | cat -n` → 1189 case, 1190 cwd, 1191 Settings.init, 1192 cfgDisabledExtensions.get, 1193 loadAllExtensions(cwd, disabledIds), 1194 return, 1195 dấu ngoặc đóng, 1196 case kế tiếp. Import xác nhận ở `:48` (`Settings`) và `:88` (`cfgDisabledExtensions`). |
| Lệnh: `bun check && bun test packages/coding-agent/test/ -t 'acp'`. Kiểm thử: một test snapshot/CSV trên cây fixture có extension bị shadowed. | **WRONG ở cả hai điểm.** | Câu lệnh test là rỗng với work item này. `bun test -t <pattern>` lọc theo TÊN TEST, không theo tên file — các test acp hiện có đặt tên theo `describe("ACP agent")` (`packages/coding-agent/test/acp-agent.test.ts:556`), đó là lý do `-t 'acp'` bắt được chúng. Một test extensions-triage mới sẽ không mang tên "acp", nên câu lệnh này không chạy dòng mã nào và sẽ xanh trên một bản triển khai hỏng hoàn toàn. Lưu ý về trạng thái hôm nay: vì file test chưa tồn tại, lệnh này đang **ĐỎ** (exit 1, "filters did not match any test files") chứ không phải xanh — đỏ vì file vắng, không phải vì đã bắt được lỗi; nó chỉ trở thành "xanh giả" sau khi file tồn tại mà triển khai hỏng. Thay bằng `bun test packages/coding-agent/test/extensions-triage-cli.test.ts`. Riêng biệt, `bun check` chạy cả `check:ts` và `check:rs`; trong môi trường hiện tại nửa Rust và `bun test` đều bị chặn bởi native addon chưa build, nên `check:ts` là cổng trung thực cho tới khi addon được build. Về phong cách test: AGENTS.md cấm khẳng định "wording/defaults" và test snapshot-một-fixture, và đòi test phải bảo vệ một hợp đồng quan sát được có TÊN. Vậy nên: đừng snapshot CSV/text. Hãy khẳng định phép biến đổi — một hàng cho mỗi extension khoá theo id, state lấy từ union thật, có một hàng shadowed, một hàng bị chính sách disable mang `disabledReason` khác rỗng. Định dạng text không phải hợp đồng được bảo vệ và khẳng định nó sẽ là một test wording bị cấm. Bằng chứng: `grep -n 'describe(' packages/coding-agent/test/acp-agent.test.ts` → `:556` `describe("ACP agent")`, `:2832`, `:3437` — tên, không phải filename. `grep -n '"check"\|"check:ts"\|"test"' package.json` → :89 test, :93 check, :94 check:ts. Không tìm thấy artifact `.node` của `pi_natives` nào dưới cây, khớp với lỗi addon được báo. |
| File mới `packages/coding-agent/src/cli/extensions-triage-cli.ts` + đăng ký nó trong registry lệnh của coding-agent. | **INCOMPLETE — thiếu hai file so với đặc tả đầy đủ.** | Registry không nạp các module `-cli.ts`. `cli-commands.ts:99` cho thấy hình dạng: `load: () => import("./commands/config").then(m => m.default)`. Một lệnh mới cần BA file cộng một entry registry: (1) `src/cli/extensions-triage-cli.ts` — phần triển khai; (2) `src/commands/extensions-triage.ts` — lớp `Command` mỏng `export default` nó, khớp 49 wrapper hiện có; (3) một entry `extensionsTriageHelp` trong `src/cli/command-help.ts` ở dạng `{ description } satisfies CommandMetadata`; (4) `CommandEntry` trong `src/cli-commands.ts`. Chỉ dựng file mà plan nêu sẽ tạo ra một module không gì định tuyến tới — và vì một entry registry thiếu làm `runCli` trượt xuống rồi chuyển argv cho LLM như một prompt (hồi quy #1496 được ghi trong chính header file đó), lệnh sẽ **có vẻ** chạy được trong demo và hỏng trong dùng thật. Bằng chứng: `sed -n '1,60p' packages/coding-agent/src/cli-commands.ts` và `grep -n -A4 'name: "config"'` → :98-101. `cat packages/coding-agent/src/commands/config.ts` cho thấy đủ chuỗi wrapper→impl→helpHelp. `ls packages/coding-agent/src/commands/` → 49 module; `sed -n '1,40p' packages/coding-agent/src/cli/command-help.ts` và `git grep -n -A6 'interface CommandMetadata' packages/utils/src/cli.ts` (:136-142) xác nhận hình dạng help. |
| Môi trường nêu: git HEAD 5873776. | **STALE — HEAD thực tế là 9cfbaba.** | Cây làm việc đang ở 9cfbaba ("docs(m3): execution plan for milestone 3, spec-verified against the tree"), trên nhánh milestone-1. Mọi neo trong tài liệu này đã kiểm lại trên 9cfbaba. Nếu một commit khác mới là ý định, hãy kiểm chứng lại trước khi triển khai. | Bằng chứng: `git rev-parse --short HEAD` → 9cfbaba; `git status --short -- packages/` → rỗng, nên cây sạch trong `packages/`. (Con số 808b365 từng được ghi ở đây cũng đã lỗi thời.) |
| Phụ thuộc: "M2 WI-2 (post-sort) đã merge". | CONFIRMED là **chưa đạt** — đây là tiền đề, không phải sự thật đã thoả mãn. | WI-2 không có trong cây, nên M4-9 hiện **KHÔNG** khởi động được. Plan liệt kê nó là phụ thuộc nhưng người đọc dễ tưởng nó đã lên kệ. Làm rõ cổng ở bước 2 thay vì để là giả định nền. Deliverable của chính WI-2 là file `packages/coding-agent/test/extension-load-order-determinism.test.ts` — plan khai ở :4995 (hàng `files_touched`) và :5137 (mục "Tên file test"), các bước 8-11 của nó ở :5022-5028; thứ rẻ nhất để dò. (Số dòng cũ 6815 trỏ sang work item khác — đã sửa.) Bằng chứng: `ls packages/coding-agent/test/extension-load-order-determinism.test.ts` → No such file or directory. `git grep -n 'extension-load-order' packages/coding-agent/` → 0 hit. |
| (Ngầm) `shadowedBy` là một trường với một nghĩa. | **MISLEADING — tên này bị nạp quá tải trên ba hệ thống không liên quan.** | Trước khi đụng vào, hãy biết rằng `shadowedBy` đã mang hai nghĩa khác trong codebase này và cả hai đều không phải capability-shadowing mà plan nói tới: tóm tắt plugin marketplace dùng `shadowedBy?: "project"` (`packages/coding-agent/src/extensibility/plugins/marketplace/types.ts:196`, ghi chú ở `:188`) được render bởi `builtin-marketplace.ts` và `plugin-settings.ts`; và giao thức user-config nội bộ dùng `shadowedBy?: string` để nghĩa là "user config của bạn bị project config ghi đè" (`packages/coding-agent/src/internal-urls/cfg-protocol.ts:83`, render tại `interactive-mode.ts:5970-5971`). Chỉ `Extension.shadowedBy` của tui extensions mới là thứ mục này nói tới. Nhầm lẫn chúng là lỗi dễ nhất trong mục này và sẽ tạo ra một inventory báo shadowing phạm vi plugin như thể đó là capability shadowing. Bằng chứng: `git grep -rn 'shadowedBy' -- packages/` trả về **40 hit trên 17 file**, phân bố trên nhiều hệ thống hơn con số 35/sáu mà bản nháp trước nêu — bản thân con số đó cũng đã sai. Ba chỗ đã trích ở `marketplace/types.ts:196` (với doc tại `:188`), `cfg-protocol.ts:83`, và `tui/overlays/extensions/types.ts:68`. Phân bố theo file: `tui/src/overlays/plugin-settings.ts` 6, `tui/src/overlays/extensions/inspector-panel.ts` 4, `test/internal-urls/cfg-protocol.test.ts` 4, `src/slash-commands/builtin-marketplace.ts` 4, `tui/.../types.ts` 3, mười hai file còn lại 1-2 hit mỗi file. |

## Cần người xác nhận

Các điểm sau là **mâu thuẫn bên trong chính đặc tả**, không phải điểm sai so với plan. Không tự sửa ở đây; cần bạn chốt trước khi triển khai.

1. **Đã đóng trong lượt này — quy ước đánh số: 1-based theo thứ tự hàng trong bảng `plan_corrections`.** Con trỏ chết duy nhất là `risk` trong spec, vốn dẫn `#5` cho nội dung nằm ở hàng `#3` (nguyên nhân gốc `capability/index.ts:247`/`:271` — "phần tử thắng không khôi phục lại được"). Sửa con trỏ đó thuộc `M4-9.spec.json`, **không thuộc file md này**, nên nó vẫn cần một lượt riêng trên spec; ở đây chỉ chốt quy ước để tránh tái phát. Các tham chiếu còn lại trong md đã kiểm và đúng theo quy ước này: `code_shape` → `#2` ("shadowedBy đọc ở :103"), step 12 → hàng "lệnh test `bun test -t 'acp'`" (`#5`). Bảng có 9 hàng. Dưới quy ước 0-based, `#5` rơi vào hàng "thiếu hai file" — cũng sai, nên 1-based là quy ước duy nhất khớp.
2. **Trường `effort` đếm số file không khớp `files_touched` cho phương án (a).** `effort` ghi "2 new files + 2 modified + 1 test", nhưng `files_touched` liệt kê cho (a): tạo `extensions-triage-cli.ts`, tạo `commands/extensions-triage.ts`, sửa `command-help.ts`, sửa `cli-commands.ts`, tạo test, **và sửa `CHANGELOG.md`** — tức là 3 file mới tính cả test và **3** file sửa, không phải 2. Cần chốt dòng CHANGELOG có nằm trong phạm vi ước lượng effort của (a) hay không (nó đang bị chặn bởi uỷ quyền Wave D theo plan §6.2/§6.3, nên có thể tách khỏi ước lượng).


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

M4 khó ở đúng chỗ nó dễ thành công: bốn work item đều nhỏ, đều có gate cơ học, và đều xanh ngay khi bề mặt khai báo đúng. Ba cách nhiều khả năc đi sai nhất, theo thứ tự sát thời điểm phát hiện ra.

**Mượn quá tay.** M4 lấy kỷ luật của `deepseek-ai/deepseek-harness`, nhưng mô hình mà kế hoạch dựa vào nằm ở `packages/boot/` — repo này không có package đó. Tiền lệ rollback (`packages/boot/config-editor/src/index.ts:127-129` và `:133-137`) và tiền lệ kiểu `application` (`packages/boot/plugin-manager/src/types.ts:111-114`) đều không mở được để kiểm chứng. Hệ quả cụ thể nhất nằm ở M4-6: tiền lệ dsh là (a) từ chối lượt ghi và giải thích, còn tiền lệ đã ship trong chính repo này — `omp config set` tại config-cli.ts:314 (`if (shadow) console.log(chalk.yellow(...))` — dòng 315 là dấu `}` đóng hàm và 317 là JSDoc của `globalValue`, đừng dừng ở đó) — là (b) ghi vào rồi chỉ ghi chú. Copy hình dạng dsh nghĩa là dựng cả nửa rollback mà người đọc quen với hành vi ngược lại.

**Xanh mà không tới đâu.** Ở M4-7, cố tình chỉ thêm trường `rawArgs` vào hai interface mà không sửa gì khác thì test vẫn GREEN — đó chính là cái bẫy gate của mục này tự nêu. Ở M4-9, thiếu một mục đăng ký `Command` trong `cli-commands.ts` làm `omp extensions-triage` rơi xuống `runCli` và chuyển argv thành prompt đưa cho LLM (hồi quy #1496), và không test nào trong danh sách gate sẽ nhận ra. Cùng một kiểu hỏng, xử lý một lần.

**Khoá ra không khoá gì.** Đây là nội dung thật của risk của M4-4, và nó không nằm ở chữ nghĩa của câu "bọc `#saveRuntimeConfig` trong `withFileLock` và đọc lại config bên trong lock". Cả chín call site (all nine call sites) đều mutate `this.#runtimeConfig` đã memoize TRƯỚC khi gọi save. Cài nguyên văn cả câu đó tạo ra một lock trông đúng, giữ đúng thứ đã bị mất trong bộ nhớ, và mọi gate bằng grep vẫn xanh.

Trước khi vào bảng: **cổng native addon chưa build** chặn trước mọi thứ khác ở M4-4. `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives` (file-lock.ts:9), nên khi addon chưa build thì nó vừa không dùng được vừa không test được. Bước 1 trong sáu bước của gate — `bun test packages/utils/test/file-lock.test.ts` — đang báo `0 pass, 1 fail` với `Failed to load pi_natives native addon for darwin-arm64`, và điều này đã được xác nhận bằng cách chạy. Hai file `packages/utils/src/atomic-write.ts` và `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` mang nhãn `[create,UNVERIFIED]` — và đó là đúng nghĩa: cả hai là file M4-4 **tạo ra**, không phải file cần đi tìm. Spec M4-4 ghi rõ `action: "create"` với note "Does not exist yet — create". Nhãn `UNVERIFIED` ở đây nói 'chưa tồn tại vì sắp tạo', KHÔNG phải 'đường dẫn có thể sai' — đừng dừng công việc để săn xem chúng có thật không. Điều đáng chú ý hơn: cổng này nuốt luôn cả Wave B, vì M4-6 merge chung một PR với M4-4 dù bản thân nó không đụng tới lock. Hệ quả thứ hai: negative control bắt buộc của M4-4 (xoá `withFileLock` khỏi `#mutateConfig` rồi xác nhận test tranh chấp đỏ) cũng cần addon chạy — tức trên máy chưa build, ngay cả phòng vệ cũng không chứng minh được là còn sống.

| work item | rủi ro | cách giảm |
| --- | --- | --- |
| M4-4 | Lock bao quanh thứ đã hỏng: chín call site mutate `this.#runtimeConfig` trước khi save, nên khoá được cài đúng hình dạng vẫn bảo vệ một read-modify-write đã thua. | Negative control là bắt buộc, không phải tuỳ chọn: tạm xoá `withFileLock` khỏi `#mutateConfig`, xác nhận test tranh chấp đỏ, rồi trả lại. Không thấy đỏ là không có gate. Đừng trông chờ `git grep -n saveRuntimeConfig -- packages/` — nếu ai đó đổi tên `#saveRuntimeConfig` thay vì xoá, grep vẫn bằng 0 trong khi lock đã biến mất im lặng. |
| M4-4 + M4-6 (Wave B) | Cổng `pi_natives` chưa build đứng trước toàn bộ Wave B: `file-lock.test.ts` đang `0 pass, 1 fail`, và M4-6 đi chung PR nên không mở được dù không liên quan tới lock. | `bun --cwd=packages/natives run build` là bước đầu tiên của mục, không phải việc làm song song với viết code. Đừng đọc `0 pass, 1 fail` hôm nay là lỗi môi trường — nó là bằng chứng gate thật, và nó phải chuyển xanh trước khi bước 2 của gate có ý nghĩa. |
| M4-7 + M4-9 | Một kiểu hỏng chung: khai báo đúng kiểu, xanh toàn bộ, không tới được người dùng. Ở M4-7 thêm `rawArgs` vào hai interface mà không sửa gì khác thì test vẫn GREEN; Ở M4-9 mất mục đăng ký `Command` trong `cli-commands.ts` thì argv bị đưa thành prompt cho LLM. | Nguyên tắc chung: gate phải đo hành vi quan sát được từ bên ngoài, không đo một type edit. M4-7 có sẵn phép tự kiểm — làm G1 xanh khi chưa sửa gì; nếu nó vẫn xanh thì gate chưa có răng. M4-9 không có phép đó, nên phần đăng ký lệnh phải kiểm bằng mắt. |
| M4-9 | CLI tự suy diễn shadowing thay vì chiếu đúng các hàng `loadAllExtensions` đã trả về, khiến tồn kho và dashboard runtime lệch nhau. Danh sách nói dối tệ hơn không có danh sách. | Wave D phải đợi M2 WI-2 merge — chưa có: `packages/coding-agent/test/extension-load-order-determinism.test.ts` không tồn tại và `git grep -n 'extension-load-order' packages/coding-agent/` ra 0 hit. Điều kiện gate (3) bắt đúng lỗi này: xoá phép mirror `Settings.init()` / `cfgDisabledExtensions` thì mọi disable cấp item lật sang `active` và lệch với dashboard. |
| M4-6 | Guard là kiểm tra sau-khi-ghi kèm rollback, và chính quyết định rollback là thứ có thể làm brick `/settings`. Quyết định sản phẩm LOUD/QUIET chưa có, nên nửa rollback chưa tồn tại để mà viết. | Gate (2) và (3) phải đi cặp, không được tách. (2) khẳng định key KHÔNG còn trong `config.yml` sau lượt ghi và chứa giá trị trước-ghi; (3) khẳng định key CÓ trong `config.yml` khi không lớp nào che. Bỏ (3) thì (1) và (2) thoả mãn được bằng một guard từ chối mọi lượt ghi. (1) là cổng chống trôi, nhưng phải đo DELTA chứ không phải giá trị tuyệt đối. Baseline hôm nay là **13** (11 × `this.#context.settings.set`, 2 × `this.#settings.set`) — cổng này ĐANG ĐỎ và không thể xanh nếu panel còn giữ đường ghi của nó. Viết lại thành hai điều kiện: (1a) `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` phải **bằng đúng 13** — không thêm, không bớt call site; (1b) mỗi một trong 13 chỗ đó phải nằm sau guard, kiểm bằng hành vi chứ không bằng đếm: ghi vào một dòng đang bị che thì `config.yml` không đổi (gate (2)), ghi vào dòng không bị che thì có đổi (gate (3)). Cổng (1) chỉ bắt được việc THÊM call site; nó không bắt được call site CŨ đã lọt khỏi guard — đó là lý do (2) và (3) phải đi cặp và không được tách. |
| M4 (cả milestone) | Mượn quá tay: kế hoạch trỏ vào `packages/boot/…` cho cả tiền lệ rollback lẫn kiểu `application`, mà package đó không tồn tại ở đây — mượn kiến trúc sẽ kéo theo thứ dsh đã phải tự vá. | Vay kỷ luật, không vay kiến trúc: quy tắc, trường, hệ quả dẫu xuất. Mỗi khi con trỏ chạm `packages/boot/…`, tiêu chuẩn áp dụng là tiền lệ trong repo — config-cli.ts:295-318 — chứ không phải con trỏ đó. Hai câu hỏi mở ở bảng dưới tồn tại chính vì lỗ hổng này, và chúng chặn trước khi viết dòng code đầu tiên. |

## Bảng quyết định cần bạn chốt

Đủ mười chín câu, sắp theo mức chặn: chín câu trên cùng chặn việc viết dòng code đầu tiên, năm câu kế chặn việc mở PR và phát hành, năm câu cuối đã có mặc định nên chỉ cần xác nhận. Tám câu không có mặc định nào để rơi về.

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
| M4-4 | Ba dòng CHANGELOG.md là việc làm hay chỉ là placeholder? | §6.2 nói M4 ship thành MỘT quyết định changelog gồm các wave B, C, D, và bản kế hoạch này không bao giờ tự viết entry. Hiểu sai thì ba dòng trong M4-4 sẽ biến thành entry thật và phá vỡ quyết định chung. | Theo cách đọc của kế hoạch: coi ba dòng CHANGELOG.md là placeholder để theo dõi, chưa viết entry; M4 gộp thành một quyết định changelog duy nhất. |
| M4-9 | Wave D đi chung quyết định changelog với B và C không? | `shippable: false` nghĩa là không thể phát hành riêng. Cần xác nhận chủ sở hữu đã cấp quyền bằng văn bản — nếu không, Wave D vẫn có thể mở PR và chỉ dừng ở bước release, tức công việc hoàn thành nhưng không đi được. | Theo §6.2: cả ba wave M4 gộp làm MỘT quyết định changelog, không wave nào phát hành trước khi quyết định đó tồn tại. |
| M4-7 | Có dòng changelog riêng cho `argsComplete` / `executionStarted` không? | Kế hoạch đọc việc sửa adapter là "cùng một dòng, và nó đóng một bug đang sống" — tức không tách. Phải chốt trước khi viết PR, vì changelog là một quyết định chung cho cả M4, và tác giả extension ngoài repo đúng là người duy nhất sẽ nhận ra sự khác biệt này. | Theo cách đọc của kế hoạch: không tách dòng, gộp vào dòng đổi tên `__partialJson`. |
| M4-6 | `provenanceNote` (bước 10) gắn vào description bền vững hay chỉ hiện sau một lượt ghi? | Gắn vào description bền vững thông tin hơn hẳn và không tốn gì, nhưng nó đổi description của MỌI dòng bị che — rộng hơn phạm vi hình ảnh mà kế hoạch vẽ, và danh sách được dựng lại mỗi lần chuyển tab (`#buildItemsForDefs` tại settings-selector.ts:1280). Câu hỏi yêu cầu xác nhận bằng số đếm settings thật, không phải ước lượng. | chưa có mặc định — cần bạn quyết |
| M4-7 | `renderContext` có sửa luôn trong PR này không? | Cùng hai adapter đó cũng hứt `renderContext` (`#renderState.renderContext` được set ở tool-execution.ts:960 và :1122 (đó là hai lệnh gán; 959 là dòng comment ngay phía trên, và 1121 chỉ mới là biến tạm `renderContext` chứ chưa gán vào `#renderState` — đừng dừng ở 959), và `RenderResultContextOptions` tại renderer.ts:30 sinh ra chính để mang nó). Kế hoạch chỉ nhắc `argsComplete` và `executionStarted`. Nhánh khuyến nghị là không sửa — nhưng phải ghi lại là việc còn lại, vì nếu không, bản sửa forwarding vẫn còn dang dở và người đọc sau sẽ không biết đó là một quyết định có chủ ý. | Không sửa `renderContext` trong PR này; ghi lại làm follow-up đã biết. |
| M4-7 | `rawArgs.complete` có thừa với `argsComplete` sẵn có không? | Hai nguồn sự thật cho một điều là chỗ trôi. Nhưng nếu hai cờ kia thực sự lệch nhau, sự lệch đó CHÍNH LÀ phát hiện và phải được nêu ra chứ không được bôi trơn. | Giữ cả hai: `argsComplete` đến từ sự kiện vòng đời qua `setArgsComplete`, còn `rawArgs.complete` mô tả buffer mà renderer thực sự cầm. Nếu thấy lệch, nêu ra chứ không sửa âm thầm. |
| M4-9 | Tên lệnh là gì? | Registry đã có `plugin`, `skill`, `config`; đặt sai tên thì phải viết lại help string. Câu hỏi yêu cầu chốt trước khi viết help string. | `extensions-triage` theo spec; không nhập nhằng với `plugin`, `skill`, `config`. |
| M4-9 | Xuất mặc định: bảng hay một dòng cho mỗi hàng? | Đây là hình dạng JSON mà test phải khẳng định; đổi sau khi viết test thì tốn việc. | Một dòng đã sanitize cho mỗi hàng, khớp với hình dạng `omp plugin list` tại packages/coding-agent/src/cli/plugin-cli.ts:644. |
| M4-4 | Cổng `secret` có thuộc gate của PR này không? | `grep -c secret manager.ts` đã bằng 0 ở baseline, nên nó không phân biệt được "M3-A4 đã merge" với "M3-A4 chưa từng tồn tại". Giữ làm cổng thì tốt, mô tả sai thì người đọc tin nhầm về trạng thái M3. | Giữ cổng, nhưng mô tả lại là một cổng M3 mà PR này không được phá vỡ, không dùng làm bằng chứng về trạng thái của M3-A4. |
| M4-9 | Với (b): `_shadowedBy` mang chuỗi hiển thị hay đường dẫn thô? | Chỉ có ý nghĩa nếu (b) được chọn — nếu (a) thì câu này thành vô nghĩa. Người dùng chỉ hành động được theo cái mình đọc được, và TUI inspector đã render dạng extension id rồi. | Mang extension id (ví dụ `skill:foo` qua `makeExtensionId`), theo khuyến nghị của câu hỏi; khớp với inspector-model.ts:466-482. |


---


## Đính chính so với plan tổng

Bốn mươi… không: **34 đính chính**, trải trên đúng bốn work item còn lại của M4 — M4-4 (10), M4-6 (9), M4-7 (6), M4-9 (9). M4-4 và M4-6 cùng nằm ở sóng B và phải gộp thành một PR, nên chúng được xếp cạnh nhau. M4-7 ở sóng C, M4-9 ở sóng D. Số thứ tự trong cột đầu là số thứ tự của đính chính **trong work item đó**, và mỗi mục "Bằng chứng" bên dưới dùng đúng số đó, nên đọc chéo được.

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
- **#8** — Đã chạy `bun test packages/utils/test/file-lock.test.ts` → "0 pass, 1 fail", "Failed to load pi_natives native addon for darwin-arm64". `find packages/natives -name '*.node'` → rỗng. Đã thử `bun --cwd=packages/natives run build` → **exit 1**: `CMake Error: CMake was unable to find a build program corresponding to "Ninja"` (thiếu `ninja`), nên lối ra chưa mở. `bun run check:ts` → exit 0, cả 16 package đều Done.
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
| M4-7 #6 | §M4-7 "Phụ thuộc": ràng buộc duy nhất còn lại là ràng buộc thứ tự bề mặt với M2 WI-4b, và M4-7 không được mở PR trước khi WI-4b được viết vào §11 và chốt | **XÁC NHẬN** — không có ràng buộc build, quy tắc thứ tự đúng | Đã kiểm bằng soi mã: `git grep -n 'packages/tui/src/tools/renderer-registry'` không có tệp này, và không work item M4 nào khác chạm `packages/tui/src/tools/`. Ràng buộc thật sự là thứ tự khuyến nghị, không phải ràng buộc build — work item này có thể triển khai và review độc lập, nhưng PR của nó không được merge trước một WI-4b đã review. Cũng đã xác nhận độc lập bằng chính văn bản gate của plan: sóng C là `shippable: false` (§6.3) và §6.2 nói không sóng M4 nào ship trước quyết định changelog M4 duy nhất cho cả sóng B, C và D. |

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
| M4-9 #5 | Lệnh: `bun check && bun test packages/coding-agent/test/ -t 'acp'`. Kiểm thử: test snapshot/CSV trên cây fixture có một extension bị che | **SAI CẢ HAI** | Lệnh test rỗng với work item này. `bun test -t <pattern>` lọc theo **TÊN test**, không theo tên tệp — các test acp sẵn có đặt tên theo `describe("ACP agent")` (`packages/coding-agent/test/acp-agent.test.ts:556`), đó là lý do `-t 'acp'` bắt được chúng. Test extensions-triage mới sẽ không mang tên "acp", nên lệnh này không chạy dòng code mới nào và vẫn xanh trên một cài đặt hoàn toàn hỏng. Thay bằng `bun test packages/coding-agent/test/extensions-triage-cli.test.ts`. Riêng `bun check` chạy cả `check:ts` và `check:rs`; trong môi trường hiện tại cả nửa Rust lẫn `bun test` đều bị chặn bởi addon chưa build, nên `check:ts` là cổng trung thực cho tới khi addon được build. Về **kiểu test**: AGENTS.md cấm khẳng định "wording/defaults" và test snapshot-của-fixture, và đòi test phải bảo vệ một hợp đồng quan sát được **có tên**. Vậy nên: đừng snapshot CSV/text. Hãy khẳng định phép biến đổi — mỗi extension một hàng khoá theo id, trạng thái lấy từ union thật, có một hàng bị che, một hàng bị policy-disable mang `disabledReason` không rỗng. Định dạng văn bản không phải hợp đồng được bảo vệ, và khẳng định nó sẽ là test wording bị cấm. |
| M4-9 #6 | Tệp mới `packages/coding-agent/src/cli/extensions-triage-cli.ts` + đăng ký vào command registry của coding-agent | **THIẾU** — thiếu hai tệp so với nói | Registry **không** nạp các module `-cli.ts`. `cli-commands.ts:99` cho ra hình dạng: `load: () => import("./commands/config").then(m => m.default)`. Lệnh mới cần **ba tệp cộng một mục registry**: (1) `src/cli/extensions-triage-cli.ts` — cài đặt; (2) `src/commands/extensions-triage.ts` — lớp `Command` mỏng `export default` nó, khớp 50 wrapper đã đăng ký trong `cli-commands.ts`; (3) một mục `extensionsTriageHelp` trong `src/cli/command-help.ts` ở dạng `{ description } satisfies CommandMetadata`; (4) `CommandEntry` trong `src/cli-commands.ts`. Chỉ dựng tệp plan nêu sẽ tạo ra một module không có gì định tuyến tới — và vì **mục registry thiếu làm `runCli` rơi xuống và chuyển argv thành prompt gửi tới mô hình** (hồi quy #1496, ghi ngay trong header của chính tệp đó), lệnh sẽ trông như chạy được trong demo và hỏng trong dùng thật. |
| M4-9 #7 | Môi trường nêu: git HEAD 5873776 | **STALE — HEAD thật là 9cfbaba** | Cây làm việc ở 9cfbaba ("docs(m3): execution plan for milestone 3"), trên nhánh milestone-1. **Mọi neo dạng `file:line` trong spec này đã được kiểm trên 808b365 và vẫn còn hiệu lực** — `git diff --stat 808b365..HEAD -- packages/` rỗng, hai commit kể chỉ đụng file tài liệu. Nhưng chúng đụng `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (10234 → 13776 dòng), nên **hai con trỏ dòng vào tài liệu tổng ở M4-7 #6 và M4-9 #8 đã chết** — tra lại bằng nội dung. Nếu ý bạn là commit khác nữa, phải kiểm lại trước khi triển khai. *Trùng loại với M4-6 #9.* |
| M4-9 #8 | Phụ thuộc: "M2 WI-2 (post-sort) merged" | **XÁC NHẬN là chưa thoả** — đây là tiền đề, không phải sự thật đã xảy ra | WI-2 không có trong cây, nên **M4-9 hiện chưa khởi động được**. Plan liệt kê nó là phụ thuộc, nhưng người đọc dễ tưởng nó đã hạ cánh. Làm cho cổng này tường minh ở bước 2 thay vì để làm giả định nền. Sản phẩm bàn giao của chính WI-2 là tệp `packages/coding-agent/test/extension-load-order-determinism.test.ts` (tra trong plan bằng `grep -n 'extension-load-order-determinism'`, không theo số dòng — xem M4-6 #9) — đó là thứ rẻ nhất để đi dò. |
| M4-9 #9 | (Ngầm) `shadowedBy` là một field với một nghĩa | **GỢI Ý SAI** — tên này bị nạp đầy ở ba hệ thống không liên quan | Trước khi đụng vào, biết rằng `shadowedBy` **đã** mang hai nghĩa khác trong codebase này, và cả hai đều không phải capability-shadowing mà plan nói về. (a) Tóm tắt plugin trong marketplace dùng `shadowedBy?: "project"` (`packages/coding-agent/src/extensibility/plugins/marketplace/types.ts:196`, tài liệu ở :188), render bởi `builtin-marketplace.ts` và `plugin-settings.ts`. (b) Giao thức cấu hình người dùng nội bộ dùng `shadowedBy?: string` để nghĩa là "cấu hình user của bạn bị cấu hình project của bạn ghi đè" (`packages/coding-agent/src/internal-urls/cfg-protocol.ts:83`, render ở `interactive-mode.ts:5970-5971`). Chỉ `Extension.shadowedBy` ở tui là thứ work item này nói tới. Nhập nhằng chúng là sai lầm dễ nhất trong tệp này, và sẽ tạo ra một bản kiểm kê báo shadowing ở tầng plugin trông như shadowing ở tầng capability. |

#### Bằng chứng — M4-9

- **#1** — `sed -n '55,130p' packages/coding-agent/src/modes/components/extensions/state-manager.ts` — chữ ký xuất hiện ngay sau chú thích doc "Load all extensions from all capabilities."
- **#2** — `git grep -n 'getShadowedBy' -- packages/` trả về đúng 2 dòng: `state-manager.ts:81` (`getShadowedBy?: (item: T) => string | undefined;`) và `state-manager.ts:103` (`shadowedBy: opts?.getShadowedBy?.(item),`). `git grep -n 'addItems' -- packages/` cho thấy 6 chỗ gọi ở :116, :127, :138, :149, :209, :220, không chỗ nào truyền option. Được củng cố ở phía dưới: `isShadowedExtension` và renderer "Shadowed by X" tại `inspector-model.ts:466-482` của TUI đã xử lý field này, nên một chuỗi không bao giờ tới là điều nhất quán với hành vi quan sát được.
- **#3** — `grep -n 'seen = new Set<string>\|deduped.some\|seen.has(key)\|seen.add(key)\|_shadowed = true' packages/coding-agent/src/capability/index.ts` → 228, 242, 243, 246, 247, 255, 264, 265, 266, 269, 271, 273. `sed -n '274,320p'` xác nhận đường sống sót lại ở :273. `sed -n '150,180p' packages/coding-agent/src/capability/types.ts` xác nhận `all: Array<T & { _source: SourceMeta; _shadowed?: boolean }>` ở :165. Cùng grep đó còn xác nhận `return { items: deduped, all: ...allItems }` ở :291-296 — item bị che bị loại khỏi `items` nhưng **có mặt trong `all`**, và `loadAllExtensions` đọc `all`. Nên các hàng bị che thật sự đi tới CLI với `state: "shadowed"`.
- **#4** — `sed -n '1189,1196p' packages/coding-agent/src/modes/acp/acp-agent.ts | cat -n` → 1189 case, 1190 cwd, 1191 Settings.init, 1192 cfgDisabledExtensions.get, 1193 loadAllExtensions(cwd, disabledIds), 1194 return, 1195 dấu ngoặc đóng, 1196 case kế tiếp. Import xác nhận ở :48 (`Settings`) và :88 (`cfgDisabledExtensions`).
- **#5** — `grep -n 'describe(' packages/coding-agent/test/acp-agent.test.ts` → :556 `describe("ACP agent")`, :2832, :3437 — là **tên**, không phải tên tệp. `grep -n '"check"\|"check:ts"\|"test"' package.json` → :89 test, :93 check, :94 check:ts. Không tìm thấy artifact `.node` nào của `pi_natives` trong cây, khớp với lỗi addon đã ghi nhận.
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
| M4-4 | Sáu bước xác minh xanh theo thứ tự, **với native addon đã build**; phòng thủ thật duy nhất là test tranh chấp, và nó phải **đỏ** khi xoá hẳn `withFileLock` khỏi `#mutateConfig` — một cổng chưa từng thấy đỏ thì không phải cổng; `git grep -n saveRuntimeConfig -- packages/` ra 0 hit; `git grep -n atomicWriteJson -- packages/` ra đúng một định nghĩa, trong `packages/utils`; `grep -c secret .../manager.ts` ra 0; `bun run check:ts` xanh; **và** đã có quyết định bằng văn bản về câu hỏi mở số 1 (ai sở hữu `application`) | `bun test packages/utils/test/file-lock.test.ts` phải xanh — hôm nay `0 pass, 1 fail`. File mới `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` dựng **hai** `PluginManager` độc lập, mỗi cái memoize config riêng (`#ensureConfigLoaded`, `manager.ts:141-146`), cùng trỏ một lockfile tạm qua `spyOn` trên bốn hàm `getPluginsDir`, `getPluginsLockfile`, `getProjectDir`, `getProjectPluginOverridesPath` — vì `getPluginsLockfile` là đường dẫn toàn cục `~/.omp/plugins/omp-plugins.lock.json` (`dirs.ts:652`), không suy ra từ cwd. Hai `setEnabled` chạy đồng thời → JSON trên đĩa chứa **cả hai** thay đổi. Hàng đối chứng âm viết lại thuật toán trước-nhất nội tuyến, không khoá, và khẳng định đĩa chỉ chứa **một**. Nhánh `ChangeResult`, mỗi nhánh một test: `setEnabled` về giá trị đang có → `changed:false` và byte trên đĩa không đổi; `deletePluginSetting` trên khoá vắng → `changed:false`; plugin lạ vẫn ném `/not found in runtime config/` và **không** đụng file; `setEnabled` trả `application: 'restart-required'`. `atomicWriteJson` không để lại `.tmp` và sinh JSON parse được, có dòng cuối. `packages/coding-agent/test/plugin-config.test.ts` phải giữ xanh |
| M4-6 | Bốn cổng cơ học, tất cả đều đỏ được. (1) `grep -cF 'settings.set(' packages/tui/src/overlays/settings-selector.ts` và `grep -cF 'settings.unset(' packages/tui/src/overlays/settings-selector.ts`, cộng lại phải bằng **0** — cổng chống trôi, đỏ ngay khi có call site thứ mười lăm. Hôm nay chúng in **13** và **1**, tổng **14**: 13 `settings.set(` cộng một `settings.unset(def.path)` tại `settings-selector.ts:1112` (đường xoá giá trị đã lưu trong ô text). Cổng cũ chỉ đếm `settings.set(` nên bỏ sót dòng 1112 và vẫn xanh khi còn đường ghi bypass. (2) Test đổ bóng bằng project khẳng định `YAML.parse(await Bun.file(globalConfigPath).text())` **không** chứa khoá sau một lần ghi từ panel, và chứa **đúng giá trị trước khi ghi**. (3) Test đối chứng không-đổ-bóng khẳng định cùng khoá đó **có** trong `config.yml` sau một lần ghi từ panel khi không lớp nào che. (4) `bun run check:ts` sạch — cổng này chỉ bắt được lỗi **trong từng package**, KHÔNG bắt được trôi kiểu giữa tui và coding-agent: `SettingsProvenance` và `SettingProvenance` là hai union khai độc lập ở hai package, và tui không hề phụ thuộc `@oh-my-pi/pi-coding-agent` (cạnh phụ thuộc chạy ngược lại — coding-agent mới là package khai báo `@oh-my-pi/pi-tui`), nên `tsc` không thấy chúng lệch nhau. Muốn cổng này có răng thì M4-6 phải thêm một trong hai: cho tui import kiểu từ coding-agent, hoặc sinh cả hai union từ một nguồn chung. Nếu không làm, phải ghi rõ đây là khoảng trống đã biết. | Hợp đồng: một lần ghi `/settings` mà giá trị hiệu lực do lớp trên cấp phải (a) không để lại giá trị chết trong `config.yml` trên đĩa, (b) giữ nguyên giá trị global trước đó, (c) báo lớp nào đang che. Hàng (3) không phải hàng đệm: nó là thứ chứng minh con chốt phân biệt "bị che" với "đã áp dụng", và là test **đỏ** nếu ai đó biến con chốt thành từ chối mọi thứ rồi làm hỏng `/settings` cho mọi người — đúng rủi ro mà bản kế hoạch gọi là chế độ hỏng chính. Lùi ghi và lùi rollback gộp thành một lần lưu nhờ debounce `#queueSave` 100 ms (`settings.ts:818-838`). Thêm hai kiểm tra phân biệt được thay cho một: (i) `grep -c 'function shadowingSource' packages/coding-agent/src/cli/config-cli.ts` phải in **0** — hàm cục bộ đã rút đi; (ii) `grep -c 'shadowingSource(def.setting' packages/coding-agent/src/cli/config-cli.ts` phải in **1** và `grep -c 'from "../config/shadowing"'` phải in **1** — chỗ gọi trong `handleSet` còn sống, nay truyền thêm `settings` làm tham số scope. Cổng cũ `grep -c 'shadowingSource' == 1` phải bỏ: nó in **2** trên cây hiện tại (chỗ gọi tại `config-cli.ts:307` + định nghĩa cục bộ tại `config-cli.ts:325`) và vẫn in **2** sau khi làm đúng, nên đỏ vĩnh viễn với bản làm đúng — cách duy nhất để nó xanh là xoá chỗ gọi, tức phá vỡ báo cáo shadow của `omp config set`. File test: `packages/coding-agent/test/config/settings-provenance-guard.test.ts` (mới) |
| M4-7 | Năm cổng, trong đó **G1 là cổng phân định**. G1: `bun test packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` đỏ trên cây trước thay đổi và xanh sau. G2: chuỗi `rawArgs.json` ghi lại **không giảm** và tiền tố-lồng nhau, giá trị cuối chứa `"path":"xd://probe"` và **không** phải JSON thiết bị bên trong. G3: bản dựng lại bằng bản sống, giống byte. G4: `HIDDEN_ARG_KEYS` (`json-tree.ts:23`) phủ khoá xdev mới, và qua `formatArgsInline` **không** chữ nào trong cả hai cách viết xuất hiện. G5: `bun run check:ts` exit 0 | Hợp đồng quyết định: một tool đăng ký qua `registerTool({ renderResult })`, bọc bởi `RegisteredToolAdapter` (và riêng bởi `customToolToDefinition`), phải nhận `rawArgs`, `argsComplete` và `executionStarted` trên options của nó — hôm nay `wrapper.ts:62` bỏ mất. Lỗi người dùng thấy: một extension ngoài repo gate preview streaming trên `options.argsComplete` sẽ hiển thị như chưa bao giờ hoàn tất, vĩnh viễn. Khẳng định âm bắt buộc: một field options **chưa từng** có không được xuất hiện, để bản sửa không trôi thành passthrough không kiểu làm lộ sổ ghi nội bộ ra ngoài. G2 và G3 cùng nằm trong `packages/tui/test/tool-execution-xdev-render.test.ts`; hợp đồng rebuild phải đứng ở `ui-helpers.ts:605` — tệp bản kế hoạch nêu (`chat-transcript-builder.ts`) là **sai hoàn toàn** và sẽ để hợp đồng này không phòng thủ được, một chế độ hỏng mà cả `bun check` lẫn bộ test xdev cũ đều không thấy |
| M4-9 | Năm điều kiện cùng lúc: `bun run check:ts` sạch; `bun test packages/coding-agent/test/extensions-triage-cli.test.ts` xanh; **đối chiếu tay** ở bước 13 cho thấy tập hàng của CLI khớp dashboard `/extensions` — cụ thể một hàng dashboard gọi là `disabled` không được CLI báo là `active`; với (b), một hàng fixture bị che bởi bên thắng cùng tên phải báo `shadowedBy` **không rỗng**, và một test trong capability suite phải đỏ nếu `_shadowed` được set mà không có bên thắng; dòng CHANGELOG tồn tại; giấy phép `shippable: false` của sóng D đã được cấp **bằng văn bản** | `omp extensions-triage --json` trên binary đã build, diff tập hàng với dashboard cho cùng một cwd — đây là điều kiện **không thể bịa**: xoá phép sao chép `Settings.init()` / `cfgDisabledExtensions` khỏi CLI thì JSON vẫn trông hợp lý, nhưng mọi disable ở mức item sẽ lật sang `active` và diff sẽ lộ ra. Cổng này **không** bắt được việc `Command` mới có thật sự được đăng ký trong `cli-commands.ts` không: thiếu một mục registry làm `omp extensions-triage` rơi xuống `runCli` rồi chuyển argv thành prompt cho LLM (hồi quy #1496), và không test nào được liệt kê ở đây sẽ nhận ra. Lệnh bản kế hoạch gợi ý, `bun test packages/coding-agent/test/ -t 'acp'`, sẽ xanh trước **mọi** khuyết điểm vừa nêu. Khẳng định về `shadowedBy` phải nằm trong capability suite, ở lớp sở hữu `seen`/`deduped`, không đi qua CLI |
| **Toàn M4** | Cả bốn cổng trên xanh **trên cùng một cây**, với native addon đã build; `M4-4` và `M4-6` nằm chung **một PR**; hai quyết định của người (câu hỏi mở số 1 về `application`, giấy phép `shippable: false` của sóng D) đã có chủ sở hữu và hạn bằng văn bản; hợp đồng test của cả bốn mục đã thật sự chạy, kể cả các hàng âm của chúng | Work item nào đỏ thì M4 chưa xong, kể cả khi ba cái kia xanh. `bun run check:ts` một mình **không đủ** — nó không chạy một khẳng định nào, và với `M4-4` nó còn bỏ lọt đúng lỗi mà ba bước grep không bắt: nếu ai đó **đổi tên** `#saveRuntimeConfig` thay vì xoá, các grep vẫn xanh trong khi ổ khoá đã im lặng biến mất |

**Cảnh báo về exit code của các cổng grep.** Mọi cổng grep trong bảng — `grep -c` lẫn `git grep` — đều là mẫu **kỳ vọng 0**, mà chúng trả exit **1** khi không khớp, tức trả 1 đúng lúc việc đã đúng (đã kiểm: `grep -c 'THIS_PATTERN_DOES_NOT_EXIST' packages/tui/src/overlays/settings-selector.ts` in `0` rồi exit 1; `git grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts` không in gì, exit 1 — trong khi ở trạng thái đang hỏng, `grep -c` in 13 và exit 0, nên chuỗi lật ngược đúng lúc sửa xong). Đừng dán chúng nguyên xi vào script `set -e` hoặc chuỗi `&&`. Dạng dùng được: `test "$(grep -cF 'settings.set(' packages/tui/src/overlays/settings-selector.ts)" -eq 0` (thoát 0 khi đúng), `test -z "$(git grep -n saveRuntimeConfig -- packages/)"`, `test "$(git grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts || true)" -eq 0`.

## Những điều chưa được kiểm chứng

- **Milestone này mới chỉ được đặc tả, chưa được thực hiện.** Toàn bộ nội dung sinh ra bằng cách đọc cây mã và chạy lệnh, không phải bằng cách làm công việc. Chưa work item nào được code. **Chưa cổng nào trong bảng trên từng chạy trên một cây đã có công việc** — nên chưa cổng nào được chứng minh là có răng. Riêng phần đo nền thì đã chạy và đã ghi: `bun run check:ts` exit 0 trên cây sạch; `bun test packages/utils/test/file-lock.test.ts` và `bun test packages/tui/test/tool-execution-xdev-render.test.ts` đều `0 pass, 1 fail, 1 error`; bước 1–2 **và bước 4** của `M4-4` đỏ vì addon (`bun test packages/coding-agent/test/plugin-config.test.ts` cũng ra `0 pass, 1 fail, 1 error` với cùng lỗi addon — nó là "lưới gần nhất phải giữ xanh" chứ không phải việc đã làm), bước 3 đỏ vì file chưa tồn tại, bước 5 xanh sạch. Với `M4-9` không có phép đo nào được ghi lại.

- **Mọi thứ phụ thuộc native addon đều chưa kiểm chứng được.** `bun test` trong checkout này báo `Failed to load pi_natives native addon for darwin-arm64`; lối ra là `bun --cwd=packages/natives run build`. `M4-4` bị chặn sớm hơn nữa: `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives` (`file-lock.ts:9`). Hệ quả phải nói thẳng trong mọi PR của M4: tới lúc addon được build, bất kỳ lệnh nào chạy `bun test` đều báo toàn bộ suite hỏng, nên một tuyên bố "test pass" là tuyên bố không có chỗ đứng.

- **Neo `file:line` là ảnh chụp tại một thời điểm.** `wrapper.ts:62`, `ui-helpers.ts:605`, `json-tree.ts:23`, `settings.ts:818-838`, `file-lock.ts:9`, `manager.ts:141-146`, `dirs.ts:652`, `loader-state.js:970` chụp ở cây hiện tại; không cổng nào trong bốn mục tự kiểm neo, nên chúng trôi mà không ai báo đỏ. Số thời gian mà `M4-7` ghi cũng chỉ là một lần đo, và nó sai. Đo lại ngày 2026-09-27 trên darwin-arm64, `bun run check:ts` exit 0 với **16** mục kiểm tra kiểu, nhưng tổng **3m06s** lần chạy lạnh (lần đầu trong phiên: `pi-coding-agent` 70.4s, `pi-catalog` 27.9s, `pi-metaharness` 40.0s, `pi-ai` 8.4s, `omp-stats` 19.8s) và **33–43s** ở các lần chạy sau. Các con số `301s / 138s / 110s` và mốc "khoảng 10 phút" không tái lập được ở lần đo này, nên đừng lên kế hoạch theo chúng. Không có `.tsbuildinfo` nào trong cây và `check:types` là `tsgo -p tsconfig.json --noEmit` không có cờ incremental, nên chênh lệch lạnh/ấm nằm ở cache hệ thống và tải máy chứ không phải build info: **coi đây là cổng rẻ về thời gian so với `bun test`**, đừng tránh nó vì tưởng chậm.

- **Điểm chưa chắc, gọi thẳng tên:**
  - **Cổng phân định G1 của `M4-7` căng nhau với chính hợp đồng test của nó.** G1 nói test đỏ trên cây trước thay đổi *vì* `argsComplete` bị bỏ ở `wrapper.ts:62`; nhưng G1 và hợp đồng test lại cùng nói test **xanh** khi chỉ thêm `rawArgs` vào hai interface mà không sửa gì khác. Cả hai không thể cùng đúng — chuyện gì xảy ra phụ thuộc `RegisteredToolAdapter` dựng options bằng cách chọn tường minh hay bằng spread, mà dữ liệu không ghi. Phải đọc cây trước khi tin cổng phân định; bước tự kiểm "thêm `rawArgs` rồi quan sát" cũng chưa từng chạy.
  - **`M4-4` còn một quyết định của người nằm trong chính định nghĩa DONE, và nó chưa có.** Cổng ghi rõ: DONE *additionally* cần quyết định bằng văn bản về câu hỏi mở số 1 — ai sở hữu `application` — vì mô hình cho kiểu đó trong bản kế hoạch nằm ở một repo không tồn tại ở đây. Chưa có mặc định — cần bạn quyết.
  - **Ba bước grep của `M4-4` là danh sách kiểm của người, không phải test.** Chính cổng nói: nếu refactor được sắp lại để **đổi tên** `#saveRuntimeConfig` thay vì xoá, các grep vẫn xanh trong khi ổ khoá đã biến mất. Chỉ test tranh chấp kèm hàng đối chứng âm mới là phòng thủ thật, và hàng âm đó phải được chứng minh là sống bằng cách xoá lock rồi bắt test đỏ.
  - **`M4-9` mang cả hai nhánh (a) và (b) của hợp đồng `shadowedBy`, mà hai nhánh cho ra hai khẳng định đối nghịch nhau** — (a) hàng bị che phải báo `shadowedBy === undefined`, (b) hàng bị che phải nêu tên bên thắng. Điều kiện (4) của cổng được viết theo (b); dữ liệu không ghi lại nhánh nào là quyết định. Thêm nữa, việc `Command` có thật sự được đăng ký trong `cli-commands.ts` không nằm ngoài mọi test mà cổng liệt kê.
  - **Sáu file test của `M4-7` chưa biết sẽ đổi hay không.** Tất cả đều ghi `UPDATE ONLY IF open question 1 resolves to the outer-rename branch`, và nhánh đó chưa có câu trả lời. Cùng nhãn "open question 1" xuất hiện ở cả `M4-7` (nhánh outer-rename) và `M4-4` (ai sở hữu `application`) với hai chủ đề khác nhau — đừng đọc chúng là một câu hỏi. G4 cũng chưa chốt nơi đặt: nó dùng đúng seam `formatArgsInline` mà `packages/tui/test/json-tree-render.test.ts:32` đang dùng, mà file đó lại nằm trong nhóm sáu file "chỉ sửa nếu nhánh outer-rename".
  - **Nhánh EPERM trên Windows của `atomicWriteJson` không kiểm chứng được ở đây.** Nền tảng đo được là darwin-arm64; hợp đồng test nói thẳng là đừng giả lập bằng cách ép errno hay bằng cách soi mã nguồn. Nó phải được ghi là chưa thử.
  - **`M4-6` đo bằng thời gian.** Hợp đồng dựa vào việc lùi ghi trong bộ nhớ xảy ra **trước khi** debounce `#queueSave` 100 ms ráo, để ghi và lùi gộp thành một lần lưu (`settings.ts:818-838`). Đó là một giả định về thứ tự, không phải bất biến mà công cụ bảo đảm; cổng (2) và (3) sẽ đỏ theo nhịp thay vì theo logic nếu debounce đổi hành vi.
