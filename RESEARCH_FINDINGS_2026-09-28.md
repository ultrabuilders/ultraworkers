# NGHIÊN CỨU 2026-09-28 — dsh / omo / pi.dev / Cordis

> Tài liệu này là **kết quả đo**, viết sau khi clone và đọc mã nguồn thật. Nó không phải kế hoạch.
> Dữ liệu thô của toàn bộ agent nằm ở `RESEARCH_DSH_OMO_2026-09-28.md` (688 KB, thô).
>
> **Các clone đang nằm ở `~/Projects/` (NGOÀI repo này, để `git status` sạch — M5 có gate đòi cây sạch):**
>
> | Repo | HEAD | Vai trò |
> | --- | --- | --- |
> | `deepseek-harness` | `21638c56` (2026-09-27) | MIT, DeepSeek. **Khác HEAD plan dùng** (`477b4f4`) |
> | `oh-my-openagent` | `bc67110e` (2026-09-28) | SUL-1.0. **Khác plan** (`6c9e0aa`) |
> | `cordis-upstream-cordiverse` | `f8ea3cd` | Cordis sạch, MIT © Shigma |
> | `shigma-cosmokit` | `02e691c` | MIT © Shigma |
> | `shigma-schemastery` | `cf0b7e5` | MIT © Shigma |

---

## 1. Kết luận một dòng

`deepseek-harness` **là tài liệu nghiên cứu có số liệu cho đúng bài toán M2 đang giải**, không phải một
sản phẩm để sao chép kiến trúc. Nhưng phần lớn ý tưởng cụ thể mà M4 ghi vào là thứ **omp đã có, hoặc
đã có bản tốt hơn** — và điều đó chỉ lộ ra khi phản biện, không lộ ra khi đọc.

---

## 2. Ba tầng, và tầng nào thật sự tồn tại

Mọi lập luận "M1 đã bao trọn pi nên xong" đều lẫn lộn ba tầng này. Không plan nào tách chúng ra.

| Tầng | Nghĩa là gì | Trạng thái |
| --- | --- | --- |
| **A. BUNDLED** | source của pi nằm trong omp | ✅ M1/M1B |
| **B. RESOLVABLE** | `import "@earendil-works/pi-*"` của package bên thứ ba resolve được | ❓ chưa ai đo trong plan |
| **C. INSTALLABLE** | có lệnh cài package và load được | ❌ không tồn tại |

**Đo được (chưa nằm trong plan nào):**

- `grep -rn "pi.dev" MILESTONE_*.md COMPREHENSIVE_PLAN...` → **0 hit** trong 8 tài liệu.
- Tải 4 package thật từ registry. Import của chúng: **91 × `@earendil-works/pi-coding-agent`**,
  37 × `pi-agent-core`, 30 × `pi-tui`, 16 × `pi-ai` (**tổng 174**), và **15 × bare `typebox`**.
- `pi-subagents` khai `peerDependencies` đúng những package M1B định đổi tên
  (`@earendil-works/pi-ai: ">=0.86.1"` …), cộng `typebox: "*"`.
- Hợp đồng manifest: `pi-todo` khai `"pi": { "extensions": ["./src/index.ts"] }`.
- omp **không có lệnh install nào** — grep `cli/commands/` không khớp.
- **Nhưng** `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts` có
  `PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"]` — `earendil-works` **đã nằm trong
  danh sách alias**. Đây là seam có thể cứu tầng B gần như miễn phí. **Chưa ai xác minh nó chạy ở tầng
  nào** — đây là câu hỏi số 1 còn treo.
- **Bằng chứng hệ sinh thái là thật, không phải giả định:** `oh-my-openagent` pin
  `@earendil-works/pi-ai / pi-agent-core / pi-tui / pi-coding-agent` ở `0.84.2` qua `overrides`
  (309 import site `@opencode-ai/plugin`). Nó là **consumer hạ nguồn của đúng substrate pi**.

---

## 3. dsh: đo được gì

**Quy mô:** 13.946 file · 58 package group / 255 workspace package · ~710k dòng TS/TSX · 863 file test ·
**MIT © 2026 DeepSeek** · 212.133 sao / 24.893 fork trong ~2 tuần · entry mặc định là
`npx @deepseek-ai/dsh web` (**web, không phải terminal**).

### 3.1 "Everything is a plugin" — đúng, nhưng slogan sai một cách cụ thể

Không có ranh giới core/plugin; có **ranh giới trust-tier**. Ba cơ chế được enforce thật:
dependency-gated activation có hồi sinh, hard-fail service ownership, effect-owned reversible teardown.

*Đã tái lập được:* claim "no privileged core" tại `docs/architecture.md:13` **nói dối ở một điểm** — plugin
đăng ký effect lên `ctx.root` công khai sẽ **không unwind khi unload**, vì root fiber không phải fiber của
plugin và kernel không có capability check.

*Đã đo và sống sót phản biện:* phía client thì claim đó **đúng**, và nó được **enforce bằng rollup rule**
(`scripts/verify-package-dependencies.ts`), không phải bằng convention.

### 3.2 Workflow — không phải workflow engine

Model viết một chuỗi JS, compile vào `node:vm` trong tiến trình sandbox riêng. Combinator duy nhất là
`parallel()` và `pipeline()` — **cả hai đều là `Promise.all`**. `meta.phases` "không áp đặt cấu trúc thực
thi" (`workflow/src/types.ts:26-27`). Không DAG, không cạnh phụ thuộc.

*Đính chính bởi critic:* report đầu tiên **bỏ sót** `packages/experimental/agent-team/` — 6.872 dòng,
có `task-graph.ts:25-69` với `blockedBy` thật và DFS cycle detector. Và claim "không ai đọc lại session
log" là **sai**: `tool-workflow/src/invariant.ts:51-80` fold event thành `WorkflowTrace` và enforce pairing.

### 3.3 Tư duy — đây là thứ tốt nhất, và là thứ đáng lấy nhất

> Vòng lặp sở hữu **gần như không state**; nó sở hữu **một event log**, và mọi request là một phép suy ra
> thuần tuý từ log đó (`session.deriveMessages()`, `agent.ts:671`, incremental O(new-nodes) qua
> `derivedGeneration`/`derivedNodes`). Compaction, tool scheduling, retry, crash repair, cache-state,
> migration đều xếp **trên một append-only stream duy nhất**.

Xác nhận độc lập bởi hai nguồn khác nhau (đọc code + blog bên ngoài): *"Model-visible means logged —
bất cứ thứ gì tới được model request phải tái dựng được từ log, và một runtime invariant khẳng định điều đó."*

Cơ chế đáng chú ý nhất cho M4: `agent/pre-step` là **waterfall event**, listener có thể **reject**, và
**khi reject vẫn ghi một durable turn** — *"bằng chứng vĩnh viễn rằng agent đã thử nhưng bị chặn"*. Đây
chính là lỗi M4 đang chữa, giải bằng cách **ghi lại cả thất bại vào log bền vững** thay vì thêm cờ trả về.

### 3.4 Sandbox, guard, identity — đo thay vì tin

- Sandbox **thật**, OS-level trên cả ba nền tảng, fail-closed, có cấp enforcement `full`/`partial` trung thực.
- `guard/` = 321 dòng hygiene tham vấn, **không ngữ nghĩa bảo mật, không quyền veto**.
- `identity/` = 100 dòng chứa một UUID telemetry ẩn danh.
- **Không tồn tại exec policy khai báo** (xác minh ba cách).
- Chỗ yếu cạnh ông: approval gate chỉ phủ **nửa client** của plugin do model viết.

### 3.5 Settings — M4-6 không tìm được thứ dsh có

dsh có mô hình phân lớp thật và **claim cũ đúng từng chi tiết**: refusal tại
`packages/boot/config-editor/src/index.ts:128`, **bắn TRƯỚC lần ghi đầu tiên** (`:130`), có test hợp
đồng assert patch file byte-identical sau đó (`settings/tests/configuration.spec.ts:39-46`).

**Nhưng** đó là mô hình **composition**, không phải **provenance** — nó biết giá trị thắng và từ chối
ghi bị che, nhưng **không nói được file nào thắng, field nào thắng**. `provenance` xuất hiện 0 lần.

→ **M4-6 không phải là sao chép. Nó là thứ dsh cũng chưa có.**

*Đính chính bởi critic:* `credentials-local/src/index.ts:780-787` có `assertUnshadowed` **tốt hơn** — nó
**gọi tên lớp thắng và nêu cách sửa** ("unset it in the shell you start dsh from instead"). Đây là mẫu
đáng lấy, không phải M4-6.

---

## 4. Plan sai ở đâu (đã đo, không phải phỏng đoán)

Đợt kiểm chứng lại trong `COMPREHENSIVE_PLAN` bác **4/7** claim về dsh. Kiểm tra lại trên HEAD thật:

| Claim | Kết quả |
|---|---|
| "dsh không có hệ thống priority" | **SAI.** `grep vendor/` = 0 vì `vendor/` là Cordis upstream, nơi priority **không thể tồn tại**. Đúng chỗ: **161 hit priority trên 26 file, bốn hệ priority riêng biệt**. |
| "`Impl.check` dsh dùng zero lần" | **SAI.** Wiring phổ quát, `vendor/cordis/src/service.ts:57`. |
| "dsh chỉ có nghĩa vụ giữ copyright" | **SAI.** Bỏ sót `native/system` là **BSD 3-Clause**. |
| "guard là lớp an toàn" | **SAI.** Advisory hygiene, không veto. |
| "dsh có exec policy khai báo" | **SAI.** Không tồn tại. |
| Comment ở `runner.ts:1327-1331` nói invariant được enforce | **Bịa citation.** Comment không nói vậy. |

**Cấu trúc lỗi, không phải từng lỗi:** suốt tài liệu dùng `grep` ở một thư mục rồi kết luận về cả repo.
Đó đúng là loại lỗi mà chính tài liệu cảnh báo.

**Ngoài ra, tìm ra lớp bằng chứng mà không agent nào chạm tới:** `.agents/notes/` — **3.675 file quyết
định kiến trúc git-tracked** (518 implemented / 642 archived / 40 proposed / 14 rejected) cộng
`scripts/run-gates.ts` (1.660 dòng) và ~40 `verify-*.ts`. **dsh tài liệu hoá quyết định của nó ở mức CAO
HƠN mức code** — và chỗ này chính là "kỷ luật" mà M4 nói sẽ mượn.

---

## 5. Mẫu lặp quan trọng nhất: omp đã có sẵn

Trong 63 lượt phản biện, **42 bị bác, 21 sống sót**. Và các lý do bác lặp lại:

> *"omp **ĐÃ CÓ** guard giống hệt, và bản đó tốt hơn"* — `session-maintenance.ts:1357-1365` và `:4724-4732`.
>
> *"Bác bỏ với tư cách là một port — nhưng ý tưởng gốc thì **BORROW ở mức phẫu thuật**, và tôi xác nhận được một khiếm khuyết tiềm ẩn thật."*
>
> *"Port không net-positive; nó là hồi quy, và omp đã có một bản **thành thụ hơn nhiều** của ý tưởng đó, ngay trong công cụ mà claim nhắm tới."*

**Đọc đúng:** lập luận "dsh làm tốt hơn omp ở chỗ nào" **đang sản xuất ra ước lượng sai lệch về phía dương**,
giống hệt chiều ngược lại của SENPI. Đó là cùng một cơ chế, chạy ngược dấu.

---

## 6. Pháp lý — đính chính hai điều tôi nói sai trước đó

**SUL-1.0 (`oh-my-openagent`):** tôi đã nói chặn vì "thương mại" và đoán có thể cấm sửa đổi. **Cả hai sai.**
Đọc toàn văn `LICENSE.md`:

- Grant gồm: *"use, copy, distribute, make available, and **prepare derivative works of**"*.
- *"You may **use or modify** the software… You may distribute… **only if you do so free of charge for
  non-commercial purposes**."*

→ **Sửa đổi được, phát hành miễn phí phi thương mại được.** ultraworkers là MIT + miễn phí → thoả điều kiện dùng.
Chỗ chặn thật là `non-sublicensable`, và **có đường thoát**: *"anyone who gets a copy of any part of the
software from you also gets a copy of these terms… include in any modified copies a prominent notice
stating that you have modified the software."* → cây nhiều giấy phép, không phải tường.

**Khai báo giấy phép của omo — plan nói đúng, tôi kiểm lại:** root = `SUL-1.0`; **14** package khai `MIT`,
**35** không khai gì. Trong 14 cái "MIT", tôi mở từng cái: **12 cái là binary prebuild, 0 file `.ts`,
tổng 2 file**. Chỉ `lsp-daemon` và `lsp-tools-mcp` là source thật (cái sau có LICENSE + NOTICE riêng).

Vấn đề thật, theo agent: **không phải bừa bãn — đó là mâu thuẫn sống giữa `LICENSE.md` và metadata npm.**
Root là SUL-1.0 (cấm tự ý sửa/xoá notices) nhưng **24 package npm đã publish (12 platform × 2 họ tên)
khai MIT**. Kiểm trên registry sống: `oh-my-opencode-linux-x64@5.0.1` → MIT, trong khi
`oh-my-opencode@5.0.1` → SUL-1.0.

**dsh:** MIT sạch, chép được, chỉ nghĩa vụ giữ notice. Xác nhận bởi 2/2 lượt phản biện pháp lý.

---

## 7. Cordis — và hai chỗ plan sai

**Dòng gốc:** Cordis do **Shigma (Yifan Shi)** viết, là nền của **Koishi** (~4.000 plugin cộng đồng,
bốn năm production). Có **paper** *"A Programming Paradigm for Spatiotemporal Composability"*
(Đại học Bắc Kinh + DeepSeek-AI Harness, ~88 trang, 2026-08-13). MIT © 2021-present Shigma.

**Bài toán Cordis giải:** *"nạp thì dễ, gỡ thì địa ngục"* — và nó nêu tên VSCode: **87 trong 100 extension
top marketplace không thể gỡ lúc runtime mà không restart extension host.**

→ Đây chính xác là câu M2 viết: *"nếu một extension không thật sự được nhả ra khi bị tắt, thì câu chuyện
'mọi thứ là plugin' chỉ là một câu chuyện về **cách load**, không phải về **cách sống**."*
**M2 đang giải một bài toán có sẵn tài liệu nghiên cứu.**

### 7.1 Manifest của dsh sai 5/9 dòng

Plan nói: *"Muốn Cordis sạch thì lấy từ `github.com/cordiverse/cordis` tại commit mà manifest ghi."*

Manifest ghi `deepseek-harness/cordis`, `deepseek-harness/cosmokit`, `deepseek-harness/schemastery`.
**Cả ba repo đó không tồn tại công khai** (`remote: Repository not found`). Thực tế:
`cordiverse/cordis` là monorepo chứa sẵn 7/9; `cosmokit` + `schemastery` nằm ở `shigma/cosmokit` và
`shigma/schemastery` (cùng tác giả, cùng MIT).

→ **"Lấy Cordis sạch" khả thi, nhưng phải tự tìm. Đi theo manifest sẽ hỏng.**

### 7.2 KẾT LUẬN ĐO ĐƯỢC: KHÔNG lấy kernel Cordis

Diff thật 7 package giữa upstream rc.10 (`f8ea3cd`) và bản DeepSeek vendor (rc.7 + 22 bản vá). **Quy mô:**
4.991 dòng nguồn / 6.497 dòng test / 9 package; core 1.874 dòng. **+822 dòng net mà manifest báo — 70% là
JSDoc** (1.013 dòng thêm = 712 comment + 12 trống + 37 import churn + **252 code thật**, ~180 ở một file).

**Upstream rc.10 KHÔNG tự giao clean unload** — `grep -c 'effectInertia|setupBarrier|emitPluginDisposed'`
trên `fiber.ts` của upstream = **0**. Bản vá là của DeepSeek. Bốn bất biến họ phải thêm: effect nằm trên
danh sách chủ **trước** `setup()` chạy; `setupBarrier`/`waitForSetup`/`disposeAfter`; **`INACTIVE_EFFECT` khi
owner đang `UNLOADING`**; `effectInertia` WeakMap + `runDisposable()`; `emitPluginDisposed` chứa lỗi theo observer.

**Và bản vendor LÙI upstream ở ba chỗ, đã chạy thử:** `_hooks: {}` thay vì `Object.create(null)` →
`on('constructor')` ném TypeError; mất chốt "next() called multiple times" → chạy lại chuỗi dưới **âm
thầm**; **0 file test**. `vendor/timer/` thay hàng đợi bằng **một ô** → promise thứ nhất không bao giờ settle.

**Và `include` là một hạ cấp có chủ đích:** upstream có **604 dòng nguồn nhiều hơn + 809 dòng test** mà
vendor xoá, chính là payload của PR #932 mà họ revert (`e07f41d5fd`).

**Kết luận, không nhòe:**
1. **omp đã quyết rồi, bằng văn bản.** M2 WI-9 bước 10: *"Các bucket per-extension **CHÍNH LÀ** sổ sở
   hữu."* omp không thiếu kernel — **omp có một kernel, và hình dạng tốt hơn fiber.**
2. omp có **0 tham chiếu cordis**; không có seam để mọc từ đó.
3. Phần thu được là **~119 dòng code thật** chống một loại bug omp **chưa từng có bằng chứng dính**. Đó là
   một port, không phải dependency.
4. `cordis-plugin-logger-console` gọi `console.log` (`shared.ts:66`) — bị `AGENTS.md` cấm tuyệt đối.
5. npm `latest` = **`4.0.0-rc.10`**, mười RC, chưa có 4.0 ổn định, toolchain yarn/vitest.

**Ba ý lấy được dù không lấy code** (đã nhét vào M2 WI-9):
1. **Disposer single-shot cho người gọi, joinable cho chủ teardown** (~6 dòng) — omp không có tương đương.
2. **Chứa lỗi theo từng observer khi báo teardown** — omp **đã thoả** cho `session_shutdown`, hãy ghi
   thành bất biến để refactor không biến nó thành tuần tự.
3. **LIFO + gỡ theo identity** — sửa ngay lỗ hổng đã có: `runner.ts:1375-1376` là FIFO, không try/catch,
   trên registry toàn tiến trình; **một disposer ném làm mồ côi mọi fallback còn lại.**

**Cách lấy đúng: đừng chép file của DeepSeek.** Lấy `fiber.ts` upstream rc.10 và áp bản vá của riêng omp —
vì sửa đổi của DeepSeek **không được ghi trong LICENSE** (chỉ ở `vendor/README.md`, không thuộc artifact
được publish). ~30 dòng, không dependency, attribution sạch.

**M4 tự nhắm sai một mục:** M4 liệt kê "tái tải có nối" là thứ đáng mượn, nhưng `Fiber.update()` trong bản
vendor **chính là hệ quả của `Revert #932 transactional Cordis reload changes`** — trả `void`, vứt kết quả
waterfall `internal/update`, vứt suppression rejection. Upstream rc.10 thì ngược lại: awaitable, có nuốt
rejection. **M4 đang nhắm vào một nửa mà DeepSeek đã cố ý xoá** — đúng thứ omp đang cố rời bỏ.

---

## 8. Ba việc còn treo (không ai đo)

1. **`legacy-pi-compat.ts` chạy ở tầng nào?** Liệu nó có chạm tới specifier trong source của package bên
   thứ ba, hay chỉ chuẩn hoá tên nội bộ của omp. **Đây là câu hỏi quyết định tầng B ở §2.** Chưa có câu trả lời.
2. **diff upstream vs bản DeepSeek** — chưa chạy xong (đã dừng để kịp thời hạn). Đây là phép đo có giá trị
   nhất còn lại: nó cho biết chính xác cái gì là của Cordis và cái gì là của DeepSeek.
3. **Danh sách API surface mà package thật cần** — đã có 174 import site nhưng chưa trích xong *named symbol
   list* (thứ quyết định liệu omp export đủ không).

---

## 9. Đề xuất

| # | Việc | Vì sao | Ước lượng |
| --- | --- | --- | --- |
| 1 | Xác minh `legacy-pi-compat.ts` có can thiệp specifier bên thứ ba không | Quyết định tầng B; nếu có thì cả hệ sinh thái pi.dev chạy được gần như miễn phí | S |
| 2 | Chạy nốt diff Cordis upstream vs vendored | Trả lời "mượn kiến trúc hay chỉ mượn ý tưởng" bằng số | M |
| 3 | Đưa `.agents/notes/` + `run-gates.ts` vào cách M4 nói về "kỷ luật" | Đó **mới là** kỷ luật, không phải 4 work item | S |
| 4 | Sửa M1B: 7 package → 6 (bỏ `durable`) | Theo `SENPI_FINDINGS.md`: package chết, 21.093 dòng | S |
| 5 | Mở một work item cho **tầng C** (install) | Không milestone nào có | S–M |

*(Không phải tư vấn pháp lý. Toàn bộ neo pháp lý về dsh trong plan cũ tự ghi là "chưa được kiểm chứng lại";
hai mục ở §6 và §7.1 đã được kiểm lại ở đây trên HEAD thật.)*
