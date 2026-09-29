# KẾ HOẠCH THỰC THIỆN MỞ RỘNG MILESTONE 1 — CHUYỂN TOÀN BỘ `pi` VÀO omp

Tài liệu này bàn việc chuyển toàn bộ sáu package mà omp chưa có từ `earendil-works/pi` (MIT) vào
repo, bằng cách **chép nguyên văn rồi migrate**, không phải viết lại từ đầu. Sáu package đó là
`chord`, `pi-protocol`, `pi-server`, `pi-client`, `pi-telemetry`, `pi-evals` — tổng
169 file nguồn / 1.127.593 byte, 245 file sẽ chép vào, 516 symbol công khai, 64 va chạm với code
đã có (52 thuộc sáu package trong phạm vi). Đây là tài liệu DUY NHẤT bao trọn phần còn thiếu của M1; 17 hạng mục W1–W17 của M1 gốc nằm
riêng ở `MILESTONE_1_EXECUTION_PLAN.md`.

Mục đích của phần MỞ ĐẦU này là đủ để người bảo trì quyết định trong hai phút: có nên bắt tay vào
đợt migrate này hay không, và nếu có thì bắt đầu từ đâu. Nó không thay thế từng spec package.

---

## ĐIỀU CHỈNH PHẠM VI 2026-09-28 — 7 package xuống 6, và một tầng bị thiếu

> **Đọc mục này trước mọi thứ khác trong file.** Nó ghi đè hai con số và một tiền đề xuất hiện bên dưới.
> Bằng chứng: `SENPI_FINDINGS.md` và `RESEARCH_FINDINGS_2026-09-28.md`, cả hai đo trên cây thật.

### 1. `durable` không còn nằm trong phạm vi — **7 package xuống 6, tiết kiệm 21.093 dòng**

`durable` của `pi` là **package chết**: không package nào ngoài nó import, và bằng chứng duy nhất cho
tính tồn tại của nó là **23 file test của chính nó**. Tầng session thật sự chạy nằm ở
`packages/agent/src/harness/session/jsonl/`, và **8/8 file giống hệt từ byte** giữa `pi` và `senpi`
(1.894 dòng). **Cả hai đều `hard-fail` khi JSONL hỏng.**

Chép bất kỳ tầng session nào của chúng vào omp là **lùi về sau** so với `parseJsonlLenient` +
`malformedRecords → #rewriteRequired` mà omp đang có. Chép 21.093 dòng code chết là chi phí vô ích.

**Hai việc phải làm cùng lúc:**
1. Mọi chỗ trong file này nói "7 package", "bảy package", `pi-durable` ở bảng va chạm, và con số
   `21.093` như một phần tử chép — **đã sai theo mặt phạm vi**. Sáu package còn lại:
   `chord`, `pi-protocol`, `pi-server`, `pi-client`, `pi-telemetry`, `pi-evals`.
2. `MILESTONE_1_EXECUTION_PLAN.md` tự gọi tên đây là *"điểm duy nhất trong milestone không có bằng chứng
   nào đứng sau"*. Bằng chứng **đã có** — nó chỉ chưa được chép sang. Đóng lỗ hổng đó.

**Cổng mở trước khi tin con số:** chạy lại `grep -rn "from.*durable"` trên cây `pi` và đối chiếu
`8/8 file byte-identical`. Đừng chép số của SENPI mà không đo lại.

### 2. "Bao trọn `pi`" chỉ là **tầng A**. Hệ sinh thái `pi.dev` là tầng B và C, và không tồn tại.

`https://pi.dev/packages` là một **registry sống** (`pi install npm:<pkg>`): package đăng cách đây
14 phút, `pi-mcp-adapter` 761K lượt/tháng. `grep "pi.dev"` trên cả 8 tài liệu kế hoạch → **0 hit**.

Đo trên **4 package thật** tải từ registry:

| Import specifier | Số lần |
| --- | --- |
| `@earendil-works/pi-coding-agent` | **91** |
| `@earendil-works/pi-agent-core` | 37 |
| `@earendil-works/pi-tui` | 30 |
| `@earendil-works/pi-ai` | 16 |
| `typebox` (bare) | **15** |

`pi-subagents` khai `peerDependencies` gồm `@earendil-works/pi-ai: ">=0.86.1"`, `@earendil-works/pi-agent-core`,
`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, và `typebox: "*"`.
`pi-todo` khai hợp đồng manifest `"pi": { "extensions": ["./src/index.ts"] }`.

> ### ⛔ ĐÍNH CHÍNH 2026-09-28 (lượt 2) — tầng B và C **ĐÃ TỒN TẠI**
>
> Bản đính chính đầu tiên của mục này nói **"omp không có lệnh install nào"**. **Đó là sai.** Sự thật đo được
> bằng cách **chạy thật**, không phải grep: `omp plugin install <pkg>` trên omp 18.4.1 với 20 package thật →
> **17 cài và load OK**, 3 fail cứng, 2 partial. Và omp **đã resolve** `@earendil-works/pi-*` lúc chạy
> thông qua **Bun.plugin `onResolve` shim** trong `legacy-pi-compat.ts`.
>
> **Lý do tôi sai, để không ai lặp lại:** tôi grep `packages/coding-agent/src/cli/commands/` cho
> `install|plugin|ext` và nhận 0 kết quả — rồi kết luận lớn. **Đó chính là lỗi mà chính M4 vừa bị phê bình
> ở dsh: suy ra sự vắng mặt từ một grep hẹp, rồi đem ra khẳng định về cả hệ thống.** Lệnh được đăng ký
> ngoài thư mục tôi nhìn. **Bài học: với câu hỏi "omp có làm được không", hãy chạy nó — đừng grep.**
>
> **Kết luận đảo chiều: tầng A, B và C đều tồn tại. Điều plan thiếu không phải nền tảng — mà là mức độ
> bao phủ, và nó đã được đo chính xác:**

| Tầng | Kết luận đo được |
| --- | --- |
| A. BUNDLED | ✅ đúng như M1 nói |
| B. RESOLVABLE | ✅ **có** — Bun.plugin `onResolve` shim. Độ phủ: `pi-coding-agent` **43/45** export, `pi-tui` **26/27**, `pi-ai` **7/7**, `typebox` **3/6**; **`chord` không được cover** (0 hit trong shim) |
| C. INSTALLABLE | ✅ **có** — `omp plugin install`. **17/20 package thật chạy** |

**Ba khoảng trống thật, đo được, tên cụ thể — đây mới là việc đáng làm:**

| Triệu chứng runtime | Package | Symbol thiếu |
| --- | --- | --- |
| `pi.registerEntryRenderer is not a function` | `pi-subagents`, `@tintinweb/pi-subagents` | `ExtensionAPI` khai **18/23**; `registerEntryRenderer` xác nhận vắng bằng cả grep lẫn lỗi runtime |
| `Export named 'withFileMutationQueue' not found` | `pi-mcp-adapter` | shim `pi-coding-agent` thiếu `ModelRuntime`, `withFileMutationQueue` |
| `registry.getProvider is not a function` | `pi-background-tasks` (partial) | `ModelRegistry` thiếu `getProvider` + 6 handoff method |
| `event.systemPromptOptions.sections` undefined | `@companion-ai/feynman` (partial) | `ExtensionContext` khai **13/30** |

**Và khoảng cách đang tự thu hẹp:** cùng phép thử trên omp 18.1.13 cho **15 OK / 5 FAIL**; trên 18.4.1 là
**17 OK / 3 FAIL**. Không có work item nào đang đẩy con số đó — **nó đang tự đi.**

**Quy mô hệ sinh thái (đo, không phải ước lượng):** **5.398 package** trên `pi.dev` (npm
`keywords:pi-package` báo 10.772 nhưng trùng lặp ~2×; con số dùng được **~5.250**). Loại: extension 2.975
(55%), skill 157, theme 37, prompt 12, mixed 231, **không phân loại 1.999 (37%)** — trong 60 mẫu
"không phân loại", **48 thật ra có manifest `pi`**. **93% permissive** (MIT 4.664, Apache-2.0 196).
Tải/tháng: p50 386 · p90 2.256 · p99 21.380 · max 1.120.235; **tổng 10,19 triệu/tháng**, top 800 gói = 80%
lưu lượng. `pi-coding-agent` 10,5M/tháng. **56/60 extension top khai một dependency `@earendil-works/pi-*`.**

**Về quy tắc `@earendil-works/X` → `@oh-my-pi/X` của file này:** nó **đúng** cho phạm vi nội bộ của omp.
Đối với package bên thứ ba, shim đã xử lý — và phép thử 20/20 nói nó chạy. **Câu hỏi đã đóng, và câu trả lời
là "đã có, phủ 43/45".**

**Điều duy nhất còn thật sự treo:** 47 work item đánh số trên 7 plan, **0 cái nào cho install, 0 cho
ecosystem, 0 cho plugin distribution.** Vậy mà tầng B và C **đã chạy được**. Phần bị bỏ sót không phải
nền tảng — mà là **không ai sở hữu ba khoảng trống API ở bảng trên**, và không có ai đo độ phủ bao giờ.

---

## Sóng 0.5 — ba work item cho tầng B và C

> ### ⛔ ĐÍNH CHÍNH LƯỜT 2 — WI-ECOSYS-1 và WI-ECOSYS-2 **ĐÃ ĐƯỢC TRẢ LỜI, KHÔNG CÒN LÀ BLOCKED**
>
> Chúng bị đặt `BLOCKED_ON_MEASUREMENT` vì tôi tin một grep hẹp. **Phép thử chạy thật đã trả lời cả hai:**
>
> - **Tầng B có rồi** — Bun.plugin `onResolve` shim trong `legacy-pi-compat.ts`. 20 package thật: **17 chạy**.
> - **Tầng C có rồi** — `omp plugin install`. Không cần xây.
> - **`typebox` đã được cover 3/6**; phần thiếu là `Compile`, `Check`, `Errors` trên **subpath**
>   (`typebox/value` 4 site, `typebox/compile` 3 site) — **cố ý không remap**.
>
> **Còn lại đúng một việc, và nó không phải nền tảng:** đóng **ba khoảng trống API** đã đo ở phần trên,
> rồi **thêm một phép thử độ phủ chạy được** để con số 17/20 không trôi theo thời gian mà không ai canh.
>
> **Cổng duy nhất nên thêm:** một script kiểm độ phủ chạy trên danh sách package thật, có số trong báo cáo.
> Đó là thứ biến "17/20" từ một con số lạ thành một cái cổng, và nó là thứ duy nhất trong nhóm này còn đáng viết.

> Thêm 2026-09-28. Đặt **trước mọi sóng port**, vì chúng quyết định *đoàn gì sẽ được port* và *port xong
> thì dùng được để làm gì*. M1B hiện trả lời "chép gì"; nó không trả lời "chép xong thì người dùng
> dùng được thứ mà hệ sinh thái pi có".

### WI-ECOSYS-3. Chốt `typebox`

Gỡ blocker đã ghi ở phần Mở đầu ("`typebox` chưa chốt… chặn cả ba package"). Đồng thời gỡ blocker của
tầng B — 15 import site thật, trong đó có `peerDependencies: { "typebox": "*" }`.

Các bước: (1) grep `typebox` trong corpus đã tải, liệt kê **từng symbol** và **từng cách dùng**;
(2) kiểm `@sinclair/typebox@0.34.52` đã có trong cây chưa — **đọc `bun.lock`, đừng tin tài liệu cũ** —
rồi đối chiếu từng symbol plugin cần; (3) trình ba lựa chọn kèm giá: thêm dep thật / re-export shim /
bundler alias; (4) **cổng bắt buộc: một package thật từ registry phải load được.** `check:ts` xanh
không phải bằng chứng — nó xanh ngay cả khi xoá sạch cả file kiểm thử.

Cổng hoàn thành: mỗi symbol đo ở bước 1 có dòng "được / không được"; một package thật load được.
**Cỡ S. Phụ thuộc: không. Làm trước WI-ECOSYS-1.**

### WI-ECOSYS-1. Resolve specifier `@earendil-works/*` của package bên thứ ba — `BLOCKED_ON_MEASUREMENT`

Cổng mở, phải đo trước khi viết một dòng code:
1. Đọc `legacy-pi-compat.ts` **toàn bộ**. Xác định nó là (i) chuẩn hoá extension **id**, (ii) viết lại
   **npm dependency specifier**, (iii) **import-map** module resolution, hay (iv) khác.
2. Trace call path từ "extension source được load" → "specifier được resolve". Nếu đường đó không chạm
   `legacy-pi-compat`, **ghi thẳng như vậy** — đừng suy luận.
3. Tác dụng riêng của từng cái: `CANONICAL_PI_SCOPE`, `PI_SCOPE_ALIASES`, `PI_PACKAGE_NAMES`,
   `LEGACY_PI_SPECIFIER_FILTER`. Cái nào ảnh hưởng package bên thứ ba, cái nào chỉ là tên nội bộ.
4. Kiểm lại failure mode M5 đã ghi: canonicaliser chết lặng lẽ ở dev (lỗi resolve bị `try/catch` nuốt)
   và crash cứng ở binary đã compile. Nếu đúng, đây là blocker của blocker.

Nếu kết luận là **có thể**: mở rộng alias **ở tầng resolve của extension loader**, không phải ở
`package.json` của omp — vì package bên thứ ba resolve trong **cây của chính nó**.

Nếu kết luận là **không thể**: **dừng lại.** Đó là quyết định phạm vi, có thể cần `imports` map trong
manifest của package, hoặc một resolver riêng. Đừng implement trước khi biết mình đang sửa tầng nào.

Cổng hoàn thành: một package thật từ registry load được **không sửa một dòng nào trong source của nó**,
và `check:ts` vẫn xanh. **Cỡ S. Phụ thuộc: WI-ECOSYS-3.**

### WI-ECOSYS-2. Cài package từ npm + đọc manifest `pi.extensions` — `BLOCKED_ON_MEASUREMENT`

Phụ thuộc WI-ECOSYS-1 — **cài xong mà không load được thì vô nghĩa.**

Cổng mở: (1) đọc `install.mjs` của package thật — `pi-subagents` có `bin` trỏ `install.mjs`; đó là
bootstrap mà `pi install` gọi, hay chỉ là CLI của chính package? **Đừng giả định.** (2) Xác định omp
tìm extension ở đâu: literal path strings, global config dir, project dir, `.omp/`. (3) Sau khi cài,
package đăng ký thế nào — manifest field, convention, hay config tường minh?

**Ràng buộc sản phẩm, bắt buộc:** **trust phải nghĩ trước khi cài, không phải sau.** `isProjectTrusted()`
hiện là `() => true` (M2 WI-0 đã nói rõ). Cài package npm từ registry là hành vi khác nhiều so với bật
một extension đã nằm sẵn trong thư mục. **Cái này chặn WI-ECOSYS-2 nếu M2 chưa chốt trust model.**
Không đụng marketplace — ngoài phạm vi, bị M2-OQ7 ràng buộc.

Cổng hoàn thành: cài một package thật → restart → extension chạy, không sửa source của package. **Cỡ M.**

---

## Mục tiêu

Với người dùng omp, đợt này mang tới hai thứ cụ thể:

- **Một tầng runtime composition** (`chord`): vòng đời facet kích hoạt/huỷ, engine delta bất
  biến (CRDT) với tracker, diff, apply, encoder/decoder và chốt ô nhiễm prototype, một scope hủy
  theo `Context`, và provider/consumer dịch vụ từ xa.
- **Một cặp server/client nói chuyện qua RPC CBOR khung length-framed** (`pi-server`,
  `pi-client`, trên đặc tả wire `pi-protocol`), vận hành qua Unix-domain socket và không phụ thuộc
  transport cụ thể. Phía server host các Session bền vững; phía client là request/response có bảng
  tương quan theo `request-N`, hủy bằng `AbortSignal`, và rào hydration cho subscription.

`pi-durable` — runtime hội thoại/task/tài liệu bền vững của `pi` (bảng session, tài liệu, checkpoint
+ migration, fork, ba tầng lưu trữ memory / JSONL / SQLite) — **không nằm trong đợt này**; xem
*Điều chỉnh phạm vi* ở đầu file.

Với người viết extension, đợt này mở ra sáu package có thể import từ catalog: `@oh-my-pi/chord`,
`@oh-my-pi/pi-protocol`, `@oh-my-pi/pi-server`, `@oh-my-pi/pi-client`, `@oh-my-pi/pi-telemetry`,
`@oh-my-pi/pi-evals`. Đó là toàn bộ giá trị thực dụng của `pi-telemetry` ở thời điểm này — xem
mục Va chạm.

### Thành thật về những gì họ KHÔNG được

- **Không có test runner mới.** Bốn dependency của `pi-evals` (`vitest`, `vitest-evals`,
  `@vitest-evals/core`, `autoevals`) là một nền tảng test thứ hai, đặt cạnh `bun test` sẵn có. Bốn
  trong bảy dependency của `pi-evals` phải KHÔNG thêm. Hệ quả: harness eval chỉ chạy được phần lõi
  `bun test` chứ không chạy được các phần dựa trên `describeEval`/judge/reporter của vitest.
- **`typebox` chưa chốt.** `pi-protocol` khai báo `typebox@1.3.27` và dựng mọi envelope bằng
  `Type.*` + `Static<>`. omp không có `typebox` trong lockfile (chỉ có `@sinclair/typebox@0.34.52`
  — dependency transitive, khác API) và không có `node_modules/typebox`. Đây là quyết định chặn
  cả ba package `pi-protocol` → `pi-server` → `pi-client`.
- **Chỉ MỘT dependency runtime npm bên ngoài được chắc chắn thêm**: `esbuild@0.28.2`, của riêng
  `chord`, và chỉ dùng ở đúng một file — `src/node/bundle.ts:4`. Mọi import ngoài khác trong
  `src/` của `chord` đều là builtin của Node.
- **`pi-evals` chép một phần, không phải toàn bộ.** Khoảng 40% nó là máy móc Docker/vitest/tarball
  phát hành mà omp không có bản tương đương. Arm `without_docs` không xoá gì trong cây nguồn:
  `packages/evals/docker/Dockerfile:15-19` `rm -rf` trong
  `/opt/evaluator/install/node_modules/@earendil-works/pi-coding-agent/{README.md,CHANGELOG.md,docs,examples}`
  — tức thư mục npm ĐÃ CÀI trong image, không phải `packages/coding-agent/`. Ở omp,
  `packages/coding-agent/docs` không tồn tại và `files` trong `package.json` cũng không liệt kê
  `docs`, nên vế `docs` của phép thử là vô nghĩa. Nhưng rủi ro thật nặng hơn nằm ở chỗ đối lập:
  `packages/evals/docker/entrypoint.ts:55-62` (nhánh `with_docs`) ném `Missing documentation` khi
  thiếu `docs/models.md` hoặc `examples/README.md`, và `entrypoint.ts:31-33` đòi
  `package.json`/`npm-shrinkwrap.json`/`dist/index.js` trong thư mục đã cài. Dockerfile chép nguyên
  văn sẽ làm image `with_docs` **nổ ngay** khi khởi động container, chứ không phải "đo được không ra
  gì". Phải viết lại cả hai arm cho hình dạng cây omp — đó là một quyết định có tên, không phải một
  phép chép cơ học.
- **Tên `eval` không phải của package này.** `packages/coding-agent/src/eval/` của omp đã là một
  hệ thống lớn, không liên quan (59 file JS/Python sandbox, kernel session…). `pi-evals` là thứ
  khác và không được gộp.
- **Adapter SQLite của `pi-durable` còn nợ.** durable dùng `node:sqlite`; repo omp dùng
  `bun:sqlite` ở 51 file. Spec ghi việc viết adapter `bun:sqlite` là một bước SAU, chưa nằm trong
  cổng.
- **`ModelRuntime` không tồn tại ở omp**, nên phần dò model của `pi-evals` bị chặn. Cùng cơn với
  `CreateAgentSessionOptions.tools`/`.noTools`, `createAgentSessionServices`,
  `InlineExtension`, `getDocsPath`/`getExamplesPath`/`getReadmePath` — tất cả đều là 0 định nghĩa
  trong omp.

---

## Vì sao chép chứ không làm lại

**Bằng chứng một — bốn package omp đã có giữ nguyên tên, chỉ đổi scope.** Đợt migrate này không phải
lần đầu omp chạm vào `pi`; bốn package của `pi` đã nằm trong catalog dưới đúng tên, chỉ khác tiền tố
scope:

| Package của `pi` | Bản trong omp | Trạng thái |
| --- | --- | --- |
| `pi-agent-core` | `@oh-my-pi/pi-agent-core` | đã có trong omp |
| `pi-ai` | `@oh-my-pi/pi-ai` | đã có trong omp |
| `pi-utils` | `@oh-my-pi/pi-utils` | đã có trong omp |
| `typebox` | `@oh-my-pi/omptype` (mặt nạ TypeBox tương thích, dùng production) | đã có trong omp |

Ba package đầu giữ nguyên tên, chỉ đổi scope. Package thứ tư giữ VAI TRÒ (`@oh-my-pi/omptype/typebox`
đang được `packages/coding-agent/src/extensibility/legacy-typebox.ts` và bốn file test dùng thật),
khác tên. Khi tên đã khớp và scope đã khớp, việc dựng lại chỉ để có một bản "sạch" là tự tạo việc.

Nhưng phải nói thẳng một điều mà chính dữ liệu của `pi-server` cảnh báo: điều khoản "cùng tên, chỉ
khác scope" **đúng với TÊN và sai với PACKAGE**. `packages/agent/src` của omp là 34 file `.ts`
/ 739.550 byte (thêm 16 file `.md`) phát ra 18 module phẳng; của `pi` là 117 file `.ts` /
1.145.928 byte. Giữ tên không có nghĩa giữ được hợp đồng — và ở đây ngay cả quy mô cũng lệch theo hai
hướng khác nhau.

**Bằng chứng hai — nghĩa vụ pháp lý chỉ có đúng một hạng mục.** `pi` là MIT. Nghĩa vụ duy nhất là giữ
nguyên copyright và permission notice. Hạng mục này là TẠO MỚI hai file, không phải `cmp` file có
sẵn: ở `pi` tại `d6af72e` chỉ có MỘT `LICENSE` ở rễ repo
(`git ls-files | grep -iE 'license|notice'` trả về đúng một dòng) và không package nào trong sáu
package có file LICENSE/NOTICE riêng. Vì vậy `packages/evals/NOTICE` phải được `cp` từ `LICENSE`
ở rễ `pi-ref` tại commit `d6af72e` rồi `cmp` bản chép với bản gốc đó; nó phải chứa nguyên văn dòng
`Copyright (c) 2025 Mario Zechner` cùng toàn văn permission notice lấy từ
cùng file đó. Không có yêu cầu nào về tên tác giả ở header file, không có yêu cầu nào về cơ chế
"derived work". Đây là phần việc pháp lý của cả đợt: một file LICENSE cho `chord`, `pi-protocol`,
`pi-client`, một file NOTICE cho `pi-server` và một file NOTICE cho `pi-evals`.

**Bằng chứng ba — lập luận ngược lại.** Ở đây, chép có **ÍT rủi ro pháp lý hơn tái tạo sạch**, chứ
không phải nhiều hơn. Lý do: một bản viết lại "sạch" chỉ thực sự an toàn khi người viết thật sự
chưa từng đọc bản gốc. Ở đợt này thì điều đó không đúng — mọi spec đều dựa trên việc đọc mã `pi`,
đọc cấu trúc thư mục của nó, và đo từng file của nó. Với bản gốc đã nằm trên bàn, viết lại mà
không giữ dấu vết dẫn xuất là **mất** vỏ bọc bản quyền mà lại **giữ** toàn bộ rủi ro: không có
LICENSE, không có dấu vết tác giả, không có đường chứng minh tương thích hành vi. Chép kèm giấy tờ
thì bằng chứng nằm ngay trong cây. Về mặt hành vi thì lập luận cũng nghiêng về chép: code bị chép
byte-for-byte thì mọi sai lệch phát sinh sau đó đều là một quyết định có tên và có người chịu, chứ
không phải một tai nạn không ai nhận.

---

## Thứ tự migrate

**Lịch do thứ tự quyết định, không do khối lượng.** Bằng chứng ngay trong bảng: `chord` là package
lớn nhất trong sáu (62 file / 690.344 byte) và đứng đầu — nhưng lý do không phải vì lớn, mà vì
`pi-protocol`, `pi-server` và `pi-client` đều import nó ngay.
`pi-telemetry` là 12 file / 62.831 byte, nhỏ nhất trong sáu, và đứng thứ năm.
`pi-evals` chỉ 30 file / 133.025 byte nhưng đứng cuối. Ngược lại, `pi-client` nhỏ (18 file) nhưng
đứng thứ tư, vì 8 trên 27 test của nó không viết được nếu `pi-server` chưa có mặt.

| Vị trí | Package | Vị trí trong cây | Vì sao ở đúng chỗ này | Cái gì chặn nó |
| --- | --- | --- | --- | --- |
| 1 | `@oh-my-pi/chord` | `packages/chord` | Nền của cả đợt migrate — `pi-protocol`, `pi-server` và `pi-client` đều import nó, và M1 W1/W2 đã tuyên bố port tay từ chính file này. | Không có. Là package đầu tiên. Cần cài `esbuild@0.28.2` và dựng `package.json`/`tsconfig`/LICENSE. |
| 2 | `@oh-my-pi/pi-protocol` | `packages/protocol` (hàng ngang của `packages/wire`, không thay nó) | Wire schema; phải đứng trước server và client vì cả hai dùng nó. Toàn bộ coupling với `chord` chỉ là 2 symbol / 2 dòng import. | `chord` (bắt buộc) + quyết định schema engine. |
| 3 | `@oh-my-pi/pi-server` | `packages/server` | State machine 576 dòng mà giá trị nằm ở THỨ TỰ thao tác, không phải ở thuật toán. | `chord` + `pi-protocol` + `SessionMetadata` (không có ở omp) + native build cho 41 test. |
| 4 | `@oh-my-pi/pi-client` | `packages/client` (đường tiêu thụ dự kiến `@oh-my-pi/pi-coding-agent/client`) | Phí điều phối vượt phí viết code — 8/27 test không viết được nếu chưa có server. | `chord` + `pi-protocol` + `pi-server` cho 8/27 test đó. |
| 5 | `@oh-my-pi/pi-telemetry` | `packages/telemetry` | 12 file nhỏ, 0 dependency mới, 5 va chạm tên gần giống nhưng khác nghĩa. | Không có. Có thể chạy song song với mọi package khác. |
| 6 | `@oh-my-pi/pi-evals` | `packages/evals` | 4 trong 7 dependency phải KHÔNG thêm (`vitest`); `ModelRuntime` không có ở omp nên chặn phần dò model. | `vitest` (phải quyết) + `ModelRuntime` + câu hỏi arm `without_docs`. |

> **`durable` đã bị gỡ khỏi bảng này ngày 2026-09-28.** Nó là package chết: **0** package nào ngoài nó
> import (`packages/agent/package.json` không có `pi-durable`), 63 file / 21.093 dòng. Tầng session
> thật sự chạy nằm ở `packages/agent/src/harness/session/jsonl/` — nơi omp đã mạnh hơn
> (`parseJsonlLenient` + `#rewriteRequired`). Xem *ĐIều chỉnh phạm vi* ở đầu file.

Hệ quả thực tế: `chord` là cổng chai duy nhất của nửa đầu đồ thị. Không có nó thì 1, 2, 3, 4 đứng
hết. Vì vậy bắt đầu ở đâu thì không có nghi vấn: **bắt đầu từ `chord`** — dù nó không phải package
lớn nhất. Rủi ro của nó không nằm ở độ lớn mà ở đúng một chỗ, xem mục kế tiếp.

---

## Dependency: cái nào thêm, cái nào KHÔNG

Sáu package mới đăng ký trong khối `workspaces.catalog` của `package.json` gốc — `@oh-my-pi/chord`,
`@oh-my-pi/pi-protocol`, `@oh-my-pi/pi-server`, `@oh-my-pi/pi-client`, `@oh-my-pi/pi-telemetry`,
`@oh-my-pi/pi-evals`. Đây là dependency nội bộ, không có gì phải cân.

Bên ngoài thì hẻng. Toàn bộ phần phụ thuộc mới của đợt này:

| Dependency | Phiên bản | Package dùng | Đã có trong omp | Quyết định |
| --- | --- | --- | --- | --- |
| `esbuild` | `0.28.2` | `chord` | không | **Thêm.** Dependency runtime npm bên ngoài duy nhất của cả sáu package, dùng ở đúng một file (`src/node/bundle.ts:4`). Bản này thoả khoảng optional-peer của vite (`^0.27.0 \|\| ^0.28.0`) nên không sinh xung đột phiên bản. |
| `typebox` | `1.3.27` (ghim chính xác) | `pi-protocol` | không | **Chưa chốt** — xem bảng quyết định. Nếu chọn `@oh-my-pi/omptype/typebox` thì không cài gì cả. |
| `vitest` | `4.1.9` | `pi-evals` | không | **KHÔNG thêm** — tạo nền tảng test thứ hai cạnh `bun test`. |
| `vitest-evals` | `0.15.0` | `pi-evals` | không | **KHÔNG thêm** — API `describeEval`/judge của vitest. |
| `@vitest-evals/core` | `0.15.0` | `pi-evals` | không | **KHÔNG thêm** — đọc báo cáo JSON của vitest. |
| `autoevals` | `0.3.0` | `pi-evals` | không | **KHÔNG thêm** — judge Levenshtein, chỉ dùng bởi `tui.docs.eval.ts`. |
| `shx` | `0.4.0` | `chord`, `pi-protocol`, `pi-server`, `pi-client`, `pi-evals` (KHÔNG phải chỉ `pi-evals`) | không | **KHÔNG thêm** — là devDependency của năm package và chỉ phục vụ script `clean` (`shx rm -rf dist` ở `chord`, `pi-protocol`, `pi-server`, `pi-client`, `pi-telemetry`; `shx rm -rf .eval` ở `pi-evals`). Vì không thêm, script `clean` phải được viết lại bằng idiom của omp khi chép `package.json`, nếu không sẽ gọi một binary không tồn tại. `pi-telemetry` là ngoại lệ duy nhất: không khai báo `shx` nhưng vẫn có script `clean` gọi nó. |
| `@types/bun` | `catalog:` | `chord`, `pi-evals` | có | **Dùng bản có sẵn.** Thay `@types/node`/`@types/vitest`. |
| `oven/bun docker base image` | `1.4-slim` | `pi-evals` | không | **Đổi** — thay `node:24-slim`. Không phải npm dep nhưng là một thay đổi thật trong container eval. |

Phần còn lại là dependency nội bộ đã có sẵn, và đáng chú ý là có package **không cần dependency nào
mới**: `pi-telemetry` có `new_deps: []` — 12 file / 62.831 byte, trong đó phần code (6 file `src/`
+ 2 file `test/`) là 40.555 byte, zero-dep, một chiếc lá thuần.

Hai điểm phải nói thẳng vì dữ liệu tự mâu thuẫn:

- **Hai con số khác nhau nói về hai thứ khác nhau, không phải một mâu thuẫn.** Ở `pi` tại `d6af72e` cả
  sáu package đều là `0.87.1`, và `pi-protocol` khai `@earendil-works/chord: ^0.87.1` — đó là
  dependency range upstream. Còn `18.3.3` là phiên bản publish của omp: mọi `@oh-my-pi/*` trong
  khối `workspaces.catalog` đều là `18.3.3`. `18.3.4` chỉ xuất hiện trong một dòng mô tả của spec
  `pi-server` và không khớp với bất kỳ giá trị nào trong cây. Không có gì phải quyết ở đây; nhưng
  `18.3.4` phải bị loại khỏi mọi spec.
- **Scope của `chord` lệch với sáu package kia.** Index ghi `@oh-my-pi/chord`, trong khi sáu package
  còn lại đều là `@oh-my-pi/pi-*`. Giữ nguyên bất đối xứng hay chuẩn hoá — chưa có mặc định — cần
  bạn quyết.

---

## Nguồn chép: `pi`, KHÔNG phải `senpi` — và câu này đã đóng

Có một repo thứ sáu trên đĩa: `senpi` (https://github.com/code-yeongyu/senpi), MIT, là fork **đúng dòng
`pi` này**. Nó có `chord`, `protocol`, `server`, `client`, `telemetry`, `evals` — cùng tên, cùng tác
giả. Trông như một nguồn chép thay thế tốt hơn (được người dùng thật duy trì, HEAD 3 ngày trước).
**Đo thì không phải.**

| Bằng chứng | `pi` | `senpi` |
|---|---|---|
| version mọi package | **0.87.1** | `agent`/`ai`/`coding-agent`/`telemetry`/`protocol`/`server`/`client` = `2026.9.28-3`; **`chord` = `0.85.1`** |
| `packages/durable/` | **63 file** | **0 file** — không tồn tại |
| `packages/` | 12 | 13 (thêm `pty`, `senpi-codemode`) |

Hai kết luận, mỗi cái đủ để chốt:

1. **Không chép được `durable` từ `senpi`** — nó không có package đó. `git ls-files
   'packages/durable/*' | wc -l` → `0`; 11 chỗ khác chứa chữ "durable" đều là
   `builtin/terminal/durable-command.ts`, `durable-file.ts` và test — không phải package.
2. **`chord` của `senpi` là bản LÙI.** Nó kẹt ở `0.85.1` vì `packages/protocol/changes.md` ghi rõ
   package đó được ghim đúng version upstream mà nó resolve được, vì fork không publish. Còn `pi` đã
   đi tới `0.87.1`. Kéo `chord` từ `senpi` là **lùi hai bản minor**.

Về 5 package còn lại, tỉ lệ file giống **từ byte** với `pi`: `protocol` 15/17 · `server` 24/29 ·
`client` 15/19 · `telemetry` 8/12 — tức là phần lớn là bản cũ hơn một chút, và phần "chỉ có ở senpi"
gần như luôn đúng **2 file**: `changes.md` + một file sổ, tức là sổ ghi chép fork chứ không phải code.
Riêng `evals` là ngoại lệ lớn (senpi **bỏ 25 file** của pi), nhưng `evals` vốn đã là package kém giá
nhất trong sáu.

**Kết luận:** M1B chép từ `pi-ref`, như tài liệu này vốn đã ghi. `senpi` **không** thay được `pi` làm
nguồn. Nó có giá trị ở chỗ khác hẳn: 40 builtin extension, 97.893 dòng — đó là nội dung cho M5, xem
`SENPI_FINDINGS.md`.

> Chi tiết đo và lệnh tái lập: `SENPI_FINDINGS.md` mục "M1B va chạm với senpi".

---

## Va chạm

Đây là mục quan trọng nhất của cả tài liệu, và lý do khiến "chép là xong" là một câu nói sai.

**64 va chạm được ghi nhận — 52 thuộc sáu package trong phạm vi.** Nhưng con số đó không có
nghĩa là 64 chỗ phải sửa tay theo cùng một kiểu. Đa số **không phải cùng tên mà là cùng tên khác hành vi** — cùng tên khác **giá trị**, hoặc
cùng tên nhưng mô hình vòng đời ngược nhau. Và phần lớn trong số đó được giải quyết bằng đúng một
chiêu: **giữ cả hai bên, không đổi tên** — để specifier của import phân giải, để hai symbol cùng
tên sống ở hai package khác nhau. Đổi tên bên nào cũng là một quyết định phá huỷ hợp đồng công
khai, nên phải trả giá bằng một quyết định, không phải bằng một lần tìm-thay.

### Ba va chạm đổi thứ người dùng thấy được

> **Cả ba mục dưới đây nằm ở `pi-durable`, và `durable` không được chép trong đợt này** (xem
> *Điều chỉnh phạm vi* ở đầu file). Chúng được giữ lại như **tài liệu tham khảo**: đây là bằng chứng
> cho thấy vì sao chép `durable` sẽ là lùi về sau. Không ai làm theo.

Cả ba đều là hành vi quan sát được từ bên ngoài, không phải chi tiết
triển khai:

1. **`DEFAULT_MAX_LINES` — cùng tên, KHÁC GIÁ TRỊ.** `durable` = 2000, omp = 3000. Một lệnh shell
   dài 2.500 dòng sẽ bị `durable` cắt còn không bị omp cắt. Người dùng thấy output khác nhau giữa
   hai đường đi, không lý do gì để giải thích.
2. **Quy tắc đếm dòng khi cắt — cùng tên, KHÁC HÀNH VI.** `durable` đếm `totalLines` bỏ newline
   ở cuối, omp đếm bằng `countNewlines+1`; chuỗi `'a\nb\n'` ra **2 dòng ở durable, 3 dòng ở omp**.
   Marker cắt dòng cũng lệch: `durable` cắt ở 500 (`GREP_MAX_LINE_LENGTH`) và chèn
   `... [truncated]`; omp cắt ở 512. Cùng một nội dung, hai kết quả hiển thị khác nhau.
3. **`Shell` — cùng tên, KHÁC NGHĨA HOÀN TOÀN.** Ở `durable` nó là một **interface** (`exec` +
   `cleanup`) tại `src/env/index.ts:180`; ở omp nó là **string-union** `'bash'|'zsh'|'fish'`. Đây là
   thứ đổi thứ người viết extension phải viết, không chỉ thứ người dùng thấy.

### Vài ví dụ đáng chú ý khác

- **`toError(error: unknown): Error`** — trùng chức năng byte-for-byte giữa bản local của `pi-client`
  và bản chuẩn trong `pi-utils`. Đây là **va chạm code thật duy nhất** trong cả đợt. Cách xử lý đã
  rõ: chỉ định lại import sang `@oh-my-pi/pi-utils`, không giữ bản sao.
- **`PromiseResolvers<T>` / `createPromiseResolvers<T>()`** — cặp resolver tự chế của `pi`, và chính
  file nguồn của nó nói nên xoá. Thay bằng `Promise.withResolvers()`.
- **`Context` — cùng tên, khác khái niệm hoàn toàn.** `Context` của `chord`/`durable` là scope hủy;
  `Context` ở `packages/ai/src/types.ts:1476` là context của LLM. Giữ cả hai.
- **`JsonValue` — sáu định nghĩa trong omp, ba hình dạng khác nhau**, là va chạm có bán kính lan xa
  nhất: `pi-server`, `pi-client`, `pi-durable`, `pi-protocol` đều chạm vào nó.
- **`PROTOCOL_VERSION` — cùng tên export, KHÁC NGHĨA VÀ KHÁC GIÁ TRỊ**; **`encodeFrame` — cùng tên,
  chữ ký không tương thích, ba định nghĩa trong cây**. Riêng ở `pi-protocol` còn có một bản CBOR
  writer tự viết tay trong omp — đây là bản trùng byte-level thật sự duy nhất của cây.
- **Đường đi của durable dùng `node:child_process`** trong khi repo omp chỉ còn đúng một file dùng nó
  (`packages/metaharness/src/runner.ts`), và dùng `node:sqlite` trong khi omp dùng `bun:sqlite` ở
  51 file. Cả hai đều trái `AGENTS.md`.
- **`pi-telemetry` mang về khái niệm thứ BA về telemetry** mà omp đã có hai cái. Chúng không trùng
  nhau và **không được gộp**. `startSpan` của pi là callback-scoped (span sống đúng bằng thời gian
  callback); `startSpan` của omp là immediate. Cùng tên, mô hình vòng đời ngược nhau.
- **`pi-server` xuất `class Server<TMetadata>`** trong khi omp dùng chữ trần `Server` cho hai thứ
  không liên quan. Không phải va chạm mã, là va chạm nhận thức.

### Một va chạm không nằm trong danh sách 56

Va chạm lớn nhất của đợt này không nằm trong bất kỳ mục nào: `pi-evals` có thể **pass mọi cổng và vẫn
đo được không ra gì**. Arm `without_docs` chỉ xoá trong thư mục npm đã cài, mà `docs` thì omp không
có; `verifySystemPrompt` và các điều kiện loại trừ tham chiếu tới `ModelRuntime` mà omp không có.
Cổng `bun test packages/evals` **không chạm tới Docker**: cả sáu file test nằm trong
`packages/evals/test/` và không tham chiếu Dockerfile hay entrypoint, chúng chỉ chạy bên trong
container qua `ENTRYPOINT`. Vì vậy cổng này xanh không nói được gì về `without_docs` — kể cả khi
cả hai arm đọc cùng một tài liệu. Muốn có một cổng thật cho phép thử này thì phải thêm một cổng
riêng kiểm tra cấu trúc image, không phải chờ `bun test` xanh. Đây là lý do `pi-evals` đứng cuối
bảng, và là lý do câu hỏi về nó nằm trong bảng quyết định.

---

## Một tiền đề của M1 gốc bị bác

**M1 W1/W2 tuyên bố gì.** Hai hạng mục đó tuyên bố đã **port tay** cơ chế drain ngược thứ tự và cô lập
lỗi từ `pi-ref/packages/chord/src/facets/host.ts:125-142` sang omp.

**Kiểm chứng được gì.** `drainDisposers` **không tồn tại** trong omp. Và bốn vòng drain vẫn còn nguyên
hình dạng `for (const dispose of this.#X.splice(0)) dispose();` — thuận thứ tự, không `try/catch`.
Không có cô lập lỗi ở bất kỳ đâu trong bốn vòng đó. Tức là tiền đề sai ở cả hai vế: tên hàm không
tồn tại, và hành vi được mô tả không có ở đó.

**Vì sao điều này QUAN TRỌNG — vì đây là va chạm ngữ nghĩa, không phải khác biệt về tên.** Có **hai
thiết kế drain cố ý khác nhau**:

- `chord` dùng drain **ngược thứ tự khai báo, có cô lập lỗi**: đảo thứ tự huỷ là bảo đảm tài nguyên
  khai sau được giải phóng trước tài nguyên mà nó phụ thuộc; `try/catch` quanh mỗi dispose là bảo
  đảm một dispose ném lỗi không chặn các dispose còn lại.
- omp dùng **thuận thứ tự, không cô lập lỗi** ở cả bốn vòng.

Đây là hai quyết định thiết kế có chủ ý ở hai repo, không phải một sự lệch cần dẹp cho phẳng. Nếu
hòa giải theo chiều dễ thấy — hạ `chord` xuống thuận thứ tự cho khớp với omp, hoặc bê ngược bốn vòng
của omp lên để trông giống `chord` — thì sẽ **mất dữ liệu**. Chiều hạ `chord` xuống là huỷ sai thứ
tự: tài nguyên bị giải phóng trước khi thứ nó dùng kịp, tức là flush/xoá nhầm phần dữ liệu còn treo.
Chiều bê ngược lên là thay đổi hành vi của code omp đang chạy ổn, và thay đổi đó không có test nào
bảo chứng. Trong hai chiều, chỉ một chiều làm mất dữ liệu — nhưng chiều đó là chiều dễ thấy, vì nó
làm cho hai bên trông giống nhau.

**Việc phải làm.** Một trong hai điều sau, và điều này chưa có mặc định — cần bạn quyết:

1. Sửa lại phần W1/W2 trong `MILESTONE_1_EXECUTION_PLAN.md` để ghi đúng thực trạng: bốn vòng drain
   thuận thứ tự, không `try/catch`, không có `drainDisposers`. Đồng thời bỏ tiền đề "đã port tay" khỏi
   lý do chuyển `chord` — `chord` vẫn phải migrate vì ba package khác phụ thuộc nó, không phải vì
   phần của nó đã nằm sẵn trong omp.
2. Hoặc chấp nhận rằng đợt này chuyển `dispose()` của `chord` **nguyên văn** vào `packages/chord` như
   một package riêng, không đụng tới bốn vòng drain đang chạy ở omp.

Điều không được làm: để hai bên tiếp tục trông giống nhau trên giấy tờ. Tiền đề đã bị kiểm chứng là
sai một lần; để nguyên sai lần thứ hai thì người tiếp nhận sẽ tin vào một bảo đảm không tồn tại.

---

## Điều kiện tiên quyết

**1. Native addon phải build được trước — đây là tiền đề tái lập được, không phải hạn chế của máy.**
Trên một máy sạch, `bun test packages/coding-agent/test/**` chết ngay ở bước import với
`Failed to load pi_natives native addon for darwin-arm64`. Đó là **thiếu một bước build**, không
phải giới hạn của máy. Làm một lần:

```bash
brew install ninja
bun --cwd=packages/natives run build
```

Bước này đã chạy exit 0 trên máy này và sinh `packages/natives/native/pi_natives.darwin-arm64.node`;
sau đó toàn bộ suite chạy, và cổng `bun test` của cả sáu package đều mở. Đo lại cùng ngày:
`bun test packages/utils/test/` → **743 pass / 10 skip / 0 fail** (753 test, 80 file) và
`bun test packages/coding-agent/test/mcp-config-scope-dedup.test.ts` → 8 pass / 0 fail. Ở máy
CHƯA build addon, `pi-protocol` (28 khai báo `test()` cộng 12 khối `test.each`), `pi-server`
(41 khai báo `test()` cộng 1 khối `test.each`) và `pi-evals` (6 file test) đều đỏ vì đúng lý do này —
không phải vì chúng sai. Số khai báo `test()` được đếm bằng `grep -cE '^\s*(test|it)\('` trên từng
file; số case thật khi chạy còn cao hơn vì mỗi `test.each` sinh ra nhiều case. Cổng của `pi-durable`
còn nặng hơn: `packages/durable/test/`
có **195** khai báo `test()` — nhiều hơn tổng của `pi-server` (41) và `pi-client` (27) cộng lại —
nên nó đòi `bun test packages/durable` xanh với số lượng case lớn nhất trong cả đợt. `bun run
check:ts` thì không cần bước build này — nó là cổng chạy được ngay cả trên máy sạch.

**2. `bun run check:ts` phải chạy xanh từ trước khi bắt đầu.** Đây là cổng chặn (GATE 1) của cả sáu
spec, và nó là cổng duy nhất chạy được ngay. Baseline đo được trong dữ liệu: exit 0, 24.2s wall —
tức hàng chục giây, hãy dành ngân sách dưới khoảng 30 giây cho mỗi lần chạy, vì mỗi lần sửa scope
hay hậu tố `.ts` đều phải qua lại nó. Nếu `check:ts` đang đỏ trước khi bạn viết dòng đầu tiên của
`chord`, thì mọi lỗi về sau sẽ lẫn vào lỗi cũ.

**3. Mọi work item trước đó trong M1 phải xong.** 17 hạng mục W1–W17 nằm ở
`MILESTONE_1_EXECUTION_PLAN.md`. Đợt mở rộng này chồng lên chúng ở đúng một chỗ đã biết là tiền đề
sai (xem mục trên) — nhưng ngoài ra nó nối vào code mà W1–W17 đã đụng tới, nên phần còn tồn đọng phải
đóng trước.

---

## Quyết định cần chốt trước khi code

Dữ liệu index tổng hợp được **33 câu hỏi mở** (chord 6, protocol 1, server 1, client 6, durable 8,
telemetry 6, evals 5) nhưng **không chứa nội dung** của chúng, trừ một câu được nêu rõ. Bảng dưới chỉ
liệt kê những câu chặn code mà index có bằng chứng. Phần còn lại nằm trong từng spec package.

| # | Quyết định | Vì sao chặn | Trạng thái |
| --- | --- | --- | --- |
| 1 | Schema engine cho `pi-protocol`: `typebox@1.3.27` (ghim chính xác) hay `@oh-my-pi/omptype/typebox`? | Chặn `pi-protocol` → chặn `pi-server` → chặn 8/27 test của `pi-client`. Mặt `@oh-my-pi/omptype` đã có builder `Type.*` và `Static` mà protocol gọi, cộng `additionalProperties:false`, `minLength`, `pattern`, `minimum`; **chỉ thiếu `Check`**, thay bằng một dòng theo đúng idiom sẵn có của omp: `const r = schema(value); if (r instanceof type.errors) throw ...`. | **Chưa có mặc định — cần bạn quyết** (là `open_questions[0]` của spec protocol) |
| 2 | Cụm `vitest` cho `pi-evals`: thêm 4 package, hay chấp nhận harness không có runner-native? | Thêm thì có hai nền tảng test trong một repo. Không thêm thì `describeEval`, judge, `StructuredOutputJudge`, `ToolCallJudge` và đọc báo cáo vitest đều mất. | **Chưa có mặc định — cần bạn quyết** |
| 3 | Arm `without_docs` của `pi-evals` có còn ý nghĩa trong omp không? | `docs` mà pi xoá không tồn tại ở omp; giữ nguyên thì cả hai arm đọc cùng tài liệu và phép thử đo được không ra gì. Ba cách thoát: viết lại thí nghiệm cho omp, thu hẹp phạm vi, hoặc không chép nhánh đó. | **Chưa có mặc định — cần bạn quyết** |
| 4 | `SessionMetadata` đặt ở đâu? | Nó là bound chung của `ServerHost`/`Server`/`SessionRouter`/`createUnixServer` và **không tồn tại ở đâu trong omp**. Bốn symbol còn lại mà `pi-server` import từ `pi-agent-core` (`Context`, `BACKGROUND_CONTEXT`, `TODO_CONTEXT`, `withAbortSignal`) chỉ là re-export thuần của `@earendil-works/chord/context`, nên trỏ lại `@oh-my-pi/chord/context` là package chỉ còn nợ `pi-agent-core` đúng một symbol. | **Chưa có mặc định — cần bạn quyết** |
| 5 | `MemorySessionRepo` đặt ở đâu? | `TestServerHost` phụ thuộc nó; đây là abstraction session-repository của `pi-agent-core`, không có bản tương đương trong omp và không có chỗ đứng rõ ràng. | **Chưa có mặc định — cần bạn quyết** |
| 6 | Tên scope: giữ `@oh-my-pi/chord` lệch với sáu `@oh-my-pi/pi-*`, hay chuẩn hoá? | Chạm vào mọi dòng import và mọi chuỗi định dạng trên đĩa của `chord` (một trong 6 va chạm của nó là chính các chuỗi định dạng trên đĩa gọi tên package upstream, mà package đó không còn là nữa). | **Chưa có mặc định — cần bạn quyết** |
| 7 | Phiên bản `chord` trong catalog: `18.3.3` hay `0.87.1`? | Index tự mâu thuẫn: ba spec ghi `18.3.3`/`18.3.4`, spec `pi-durable` ghi `0.87.1`. Phải thống nhất trước khi viết bất kỳ `package.json` nào. | **Câu hỏi sai — không phải một lựa chọn để cân.** `0.87.1` là dependency range upstream của `pi`, `18.3.3` là phiên bản publish của omp; chỉ có `18.3.4` là rác và phải bị loại khỏi mọi spec. |
| 8 | Phần văn bản sửa cho W1/W2 về drain. | Xem mục "Một tiền đề của M1 gốc bị bác". Chọn giữa việc sửa lại `MILESTONE_1_EXECUTION_PLAN.md`, hoặc chấp nhận `dispose()` của `chord` như một thiết kế riêng. | **Chưa có mặc định — cần bạn quyết** |

---

## Quy ước khi đọc

**Ngôn ngữ.** Văn xuôi tiếng Việt. Giữ nguyên: đường dẫn, neo dạng `file:line`, tên định danh, câu lệnh,
tên package, tên file test. Khi trích một giá trị đo được, giữ nguyên con số và đơn vị của nguồn.

**Kiểm tra.** `bun run check:ts` và `bun test`. **Tuyệt đối không dùng `tsc`** — dự án cấm. Hai loại
cổng này tách bạch: `check:ts` chạy được ngay, `bun test` cần `packages/natives` đã build (xem Điều
kiện tiên quyết). Không kết luận "xong" khi mới chỉ qua `check:ts`.

**Grep trong test là cấm, grep trong cổng thì được.** Đây là ranh giới quan trọng nhất của mục này và
nó dễ nhầm, vì các spec dùng grep rất nhiều:

- Cổng kiểm tra thì được phép quét: GATE 1b của `pi-protocol` là 6 lệnh grep cơ học (0
  `@earendil-works/`, 0 hậu tố `.ts` trong specifier tương đối, 0 `private`, 0 `vitest`, 0 `any` /
  `ReturnType<` / `await import(`, và dòng LICENSE), cổng của `pi-durable` có 6 mục kiểm tương tự.
  Chúng kiểm tra một thay đổi về HÌNH DẠNG file sau khi chép.
- Test thì không bao giờ được đọc file implementation rồi khẳng định trên **văn bản** của nó. Một
  test kiểu `expect(src).toContain("someCall()")` chết theo mọi refactor vô hại và sống nguyên khi
  hành vi hỏng. Test phải chạy code và kiểm tra hợp đồng quan sát được.

**`mock.module()` thì không bao giờ.** Nó ghi vào module registry toàn cục và rò sang các file test
khác. Thay bằng `vi.spyOn` trên object module đã import, kèm `vi.restoreAllMocks()` trong `afterEach`.
Không có ngoại lệ nào ở đợt này, kể cả trong các file test mới chép sang.

**Phép chép là cơ học; mọi đổi hành vi là một quyết định riêng.** Bộ viết lại cố định cho mọi package
là: bỏ hậu tố `.ts` ở specifier tương đối, đổi `@earendil-works/` sang `@oh-my-pi/`, `private` thành
`#`, `vitest` sang `bun:test`, `ReturnType<>` thành tên kiểu thật, không `await import()` và không
`import("pkg").Type`; xoá mọi script gọi `tsc` trong `package.json` chép (sáu package có
`"build": "tsc -p tsconfig.build.json"`; `pi-server`/`pi-client` còn có
`"typecheck": "tsc -p tsconfig.test.json"`) và thay bằng cổng `bun run check:ts` của repo —
`tsc`/`npx tsc` bị dự án cấm tuyệt đối; `new Promise((resolve, reject) => …)` phải thành
`Promise.withResolvers()` (13 chỗ trong `server`/`durable` `src/`, cộng 5 chỗ trong `client/src/` —
gồm cả `promise.ts` — và 1 chỗ mỗi package ở `chord`/`telemetry`); `console.log` trong
`evals/src/cli.ts` phải qua `logger` từ `@oh-my-pi/pi-utils` trừ khi được chứng minh là CLI độc lập
thoát sớm; script `clean` gọi `shx` phải viết lại vì `shx` không được thêm; `LICENSE`/`NOTICE` phải
được tạo mới từ `LICENSE` ở rễ `pi-ref` chứ không "giữ nguyên văn" (xem mục Vì sao chép chứ không làm
lại). Bất kỳ thay đổi nào ngoài danh sách đó — đặc biệt là bất kỳ thay đổi nào chạm vào một va chạm
ở mục trên — phải được ghi thành một quyết định có tên, không được làm lặng lẽ. Ba va chạm "người
dùng thấy được" ở `pi-durable` là mẫu kinh điển: đừng chọn một giá trị rồi im lặng.


---


## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)

> ### Đính chính: `chord` không phải cơ chế vòng đời extension
>
> Bản thảo đầu gọi `chord` là "cơ chế vòng đời, nền của cả đợt migrate". **Đo lại thì sai**, và đây là
> loại sai tốn kém nhất vì nó định hướng cả kế hoạch.
>
> | Câu hỏi | Đo được |
> |---|---|
> | `chord` có được import trong `core/extensions/` không? | **0 file** |
> | `chord` được import ở đâu? | `experimental/services` 14 · `experimental` 5 · `experimental/plugins` 2 · `experimental/micro` 1 |
> | Vòng đời extension của `pi` nằm ở đâu? | `core/extensions/` — **4.506 dòng** (`index` `loader` `runner` `types`), **không đụng chord** |
> | Ai thật sự phụ thuộc `chord`? | `durable` 35 file · `server` 9 · `client` 5 |
>
> Nên `chord` là **tầng runtime composition** phục vụ `durable`/`server`/`client` và phần
> `experimental/` — **không** phải cơ chế vòng đời extension. Hệ quả thẳng: **kéo `chord` vào không
> giải quyết vòng đời extension của omp**, và 669 dòng `src/` của nó (17.651 dòng cộng test) sẽ đi
> vào cây mà không phục vụ mục tiêu đã ghi.
>
> Việc cần làm lại: `core/extensions/` của `pi` so với `packages/coding-agent/src/extensibility/extensions/`
> của omp. Đó là so sánh **thật sự liên quan** tới vòng đời, và nó chưa nằm trong tài liệu này.

> ### ✅ ĐÍNH CHÍNH 2026-09-29 — `pico3` KHÔNG nằm trong phạm vi chép; `core/extensions` là vòng đời ĐANG CHẠY
>
> Câu hỏi "chép gì từ `pi`" đã có đáp án, đo trên `pi-ref` @ `d6af72e18`:
>
> - `pico3` (25 file / 8.074 dòng, `packages/agent/src/harness/pico3/`) chỉ được import bởi **4 file
>   production, tất cả nằm trong `experimental/`**, và được export qua đường dẫn
>   `"./experimental/pico3"` (`packages/agent/package.json:21`) — tên đường dẫn tự nó đã ghi
>   `experimental`. Không file nào trong đường đi đã phát hành mount nó.
> - `core/extensions/` (8 file / 4.506 dòng) **được mount thật**: `core/agent-session.ts`,
>   `core/agent-session-runtime.ts`, `core/agent-session-services.ts`, `cli/args.ts`,
>   `cli/project-trust.ts`, `core/bug-report.ts`.
>
> **Hai hệ quả, ngược nhau:**
>
> 1. **§1 của tài liệu này ĐÚNG.** Bảng quyết định dựa trên `core/extensions/` không cần viết lại.
>    Không có việc chép nào đã làm dựa trên nó cần xem lại.
> 2. **`pico3` không thuộc nghĩa vụ "omp chứa `pi"`.** Chính `pi` không mount nó. Chép nó là chép một
>    nhánh thử nghiệm.
>
> **Nhưng `pico3` là nguồn ý tưởng lớn nhất của `pi` về vòng đời phiên**, và omp thiếu toàn bộ:
> `git grep membrane -- packages/` trả về **0 file**. `pico3` có `scheduler.ts` (17 KB),
> `membrane.ts` (4,5 KB), `bounded.ts` (2,8 KB), `jsonl.ts` (12 KB), `memory.ts` (9,4 KB) — omp có
> `packages/agent/src/compaction/` (17 file) nhưng **không có scheduler, membranes, hay bounded
> context**. Đây là mục tiêu thiết kế, **không phải mục chép**; thuộc về quyết định sản phẩm.
>
> **Hệ quả về mặt thứ tự:** M2 WI-9 (`unloadExtension`) và `GAP-M2-9` trước đây bị coi là đang
> chờ câu trả lời này. Câu trả lời đã có, nên **chúng không còn bị chặn bởi M1B**.
>
> Bằng chứng đầy đủ và lệnh kiểm lại: `.lavish-wip/DECISION-pico3.md`.


**Vị trí trong thứ tự migrate:** thứ nhất trong sáu package. Đây là runtime ghép thành phần ứng dụng mà năm package còn lại đứng trên. Spec gọi nó là “FIRST of the 7 new packages” — câu đó viết từ lúc đợt này còn bảy package, nay còn sáu. Danh sách public API của nó bị ba package anh em dùng ngay (`pi-server`, `pi-client`, `pi-protocol`) — vì vậy nó phải đứng trước tất cả.

**Quy mô:** nguồn tại `/Users/tranquangdang21/Projects/pi-ref/packages/chord`, 62 file / 690344 byte. Trong đó 30 file nguồn / 314681 byte, 21 file test hợp đồng (19 file `.test.ts` + fixture `retention.worker.ts` + helper `helpers.ts`), 6 file benchmark bị bỏ (`test/delta-traversal.bench.ts` cùng 5 file dưới `test/delta-benchmark/`, ~87 KB) và `PLANNING.md` (41634 byte). Hai file nặng nhất là `src/delta/tracker.ts` (78059 byte) và `src/delta/index.ts` (25058 byte) — riêng hai file delta chiếm 15% toàn package (33% phần `src/`); cả thư mục `src/delta/` là 44% phần `src/`.

**Cổng đỏ được:** `bun run check:ts`, spec ghi `gate_can_fail: true`. Chi tiết ở mục *Cổng hoàn thành*.

### File cần chép

Bảng dưới liệt kê đủ 64 mục của `files_to_copy` trong spec, gồm cả `LICENSE` và `CHANGELOG.md` vốn không tồn tại ở cây nguồn. Cột “bytes” là kích thước ở cây nguồn.

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `packages/chord/package.json` | 1571 | chép rồi sửa | name -> @oh-my-pi/chord; version 0.87.1 -> 18.3.3; author 'Earendil Works' -> {name:'Stencil Labs, Inc.', url:'https://stencil.so'}; repository.url -> git+https://github.com/can1357/oh-my-pi.git, directory 'packages/chord'; bugs.url -> .../can1357/oh-my-pi/issues; homepage -> https://omp.sh; bỏ map `exports` 5 khóa (dist/types/import/source) và thay bằng hình dạng WILDCARD của omp, KHÔNG phải 4 subpath tường minh: `{".": {types:'./src/index.ts', import:'./src/index.ts'}, "./*": {types:'./src/*.ts', import:'./src/*.ts'}, "./*.js": './src/*.ts'}` (đúng bằng `packages/omptype/package.json` và `packages/wire/package.json`; không thêm khóa `./package.json` — không package omp nào có khóa đó); main/types -> ./src/index.ts; bỏ scripts.build (lệnh build dựa trên trình biên dịch mà dự án cấm dùng) cùng clean/prepublishOnly; thêm check/check:types/lint/fix/fmt/test theo packages/omptype/package.json; devDependencies: bỏ shx 0.4.0 và vitest 4.1.9, thêm '@types/bun':'catalog:'; dependencies: giữ esbuild 0.28.2; engines -> {node:'>=20', bun:'>=1.3.14'}; files -> ['src','README.md','CHANGELOG.md','LICENSE'] (omptype không liệt kê LICENSE; giữ nó ở đây vì MIT cần nó đi kèm); sideEffects: false giữ nguyên từ nguồn (omptype không đặt khóa này). |
| `packages/chord/LICENSE` | 1069 | chép nguyên văn | KHÔNG lấy từ package nguồn — pi-ref không có LICENSE riêng cho từng package. Dùng nguyên văn `/Users/tranquangdang21/Projects/pi-ref/LICENSE`, rồi NỐI THÊM các dòng bản quyền của omp cho khớp kiểu nhà ở `packages/omptype/LICENSE`: giữ `Copyright (c) 2025 Mario Zechner` là dòng ĐẦU, rồi thêm `Copyright (c) 2025-2026 Can Bölük` và `Copyright (c) 2026 Stencil Labs, Inc.`. Bỏ dòng Zechner là hành động duy nhất làm cho bản chép này vi phạm luật — MIT đòi thông báo phải đi kèm với phần lớn mã nguồn. Bảo đảm có dòng cuối (file của pi-ref không có). |
| `packages/chord/CHANGELOG.md` | 0 | chép rồi sửa | File mới, không tồn tại ở nguồn. Tạo với `## [Unreleased]` và một dòng `### Added`: `Added @oh-my-pi/chord — application composition runtime for facets, replicated state, and remote services, migrated from @earendil-works/chord.` Theo AGENTS.md, dòng này mở đầu bằng cái người dùng được, không tự sự diễn giải nguyên nhân. |
| `packages/chord/src/index.ts` | 2072 | chép rồi sửa | 8 hậu tố `.ts`; chuyển 8 khối re-export có tên thành `export * from` theo luật barrel của AGENTS.md ('In pure index.ts barrels, use star re-exports even for single-specifier cases'); 4-space -> tab. Cảnh báo mơ hồ do export-star: `./types.ts` và `./services/wire.ts` cùng lộ ra `RemoteServiceProvider`/`RemoteServiceError`. Giải quyết bằng cách bỏ đường re-export thừa trong `types.ts`, giữ cả hai ở barrel. |
| `packages/chord/src/api.ts` | 3916 | chép rồi sửa | 5 hậu tố `.ts`; tab. |
| `packages/chord/src/types.ts` | 12039 | chép rồi sửa | 4 hậu tố `.ts`; tab; thêm chú thích ngay trên `Context` (dòng 15) nói về Context không liên quan của pi-ai, để không ai thử hợp nhất chúng. |
| `packages/chord/src/json.ts` | 4840 | chép rồi sửa | 1 hậu tố `.ts`. Không đụng logic — chính các điều kiện ném `TypeError` LÀ hợp đồng. |
| `packages/chord/src/context/index.ts` | 3763 | chép rồi sửa | 1 hậu tố `.ts`; tab; VIẾT LẠI dòng 102: `return new Promise<T>((resolve, reject) => {` thành `const { promise, resolve, reject } = Promise.withResolvers<T>();` và dựng lại thân hàm quanh nó, giữ nguyên việc gắn/tháo listener hủy cùng phần dọn dẹp tương đương `finally`. Đây là site cấu trúc promise bị cấm duy nhất của package. |
| `packages/chord/src/delta/index.ts` | 25058 | chép rồi sửa | 5 hậu tố `.ts`; tab. `RESERVED_SEGMENTS` (:131), `UnsafePathError` (:133), `assertSafePath` (:279) và `PathError` (:310) phải sống sót nguyên byte ngoại trừ thụt lề — đó là hàng rào chống ô nhiễm prototype. |
| `packages/chord/src/delta/tracker.ts` | 78059 | chép rồi sửa | 5 hậu tố `.ts`. File lớn nhất package. Thuần cơ học — không đổi logic. |
| `packages/chord/src/delta/diff.ts` | 16970 | chép rồi sửa | 2 hậu tố `.ts`. |
| `packages/chord/src/delta/apply-immutable-trusted.ts` | 4654 | chép rồi sửa | 2 hậu tố `.ts`. Không đổi public. Trong lúc chép, xác nhận mọi call site đều truyền vào op đã qua `assertSafePath` — module này cố ý bỏ qua bước kiểm lại. |
| `packages/chord/src/delta/revision-validator.ts` | 3007 | chép rồi sửa | 1 hậu tố `.ts`. |
| `packages/chord/src/delta/draft.ts` | 386 | chép nguyên văn | Chỉ có type, 10 dòng, không import — file src duy nhất đã sạch sẵn. |
| `packages/chord/src/delta/README.md` | 10531 | chép rồi sửa | 3 lần `@earendil-works/chord/delta` -> `@oh-my-pi/chord/delta` (dòng 4, 10, 71) và bỏ hậu tố `.ts` khỏi hai specifier import ví dụ. Được phát hành qua `files` trong package.json nên nó đi theo bản cài đặt. |
| `packages/chord/src/facets/host.ts` | 32110 | chép rồi sửa | 8 hậu tố `.ts`. Vòng rút effect ở :125-142 giữ nguyên ngữ nghĩa — thứ tự ngược, try/catch cho từng effect, `AggregateError` khi >1. KHÔNG hạ thấp nó thành log-rồi-tiếp-tục: thay đổi đó thuộc về W2 trong coding-agent, không thuộc chỗ này. |
| `packages/chord/src/facets/loader.ts` | 324 | chép rồi sửa | 1 hậu tố `.ts`. |
| `packages/chord/src/services/provider.ts` | 22333 | chép rồi sửa | 5 hậu tố `.ts`. |
| `packages/chord/src/services/consumer.ts` | 21879 | chép rồi sửa | 7 hậu tố `.ts`. |
| `packages/chord/src/services/state.ts` | 11569 | chép rồi sửa | 5 hậu tố `.ts`. |
| `packages/chord/src/services/wire.ts` | 9020 | chép rồi sửa | 2 hậu tố `.ts`. 11 hàm parse/create là hợp đồng wire xuyên package — hành vi chấp nhận/từ chối không đổi. |
| `packages/chord/src/services/state-codec.ts` | 5010 | chép rồi sửa | 3 hậu tố `.ts`. |
| `packages/chord/src/services/instances.ts` | 4244 | chép rồi sửa | 2 hậu tố `.ts`. |
| `packages/chord/src/services/handle.ts` | 3468 | chép rồi sửa | 0 hậu tố `.ts`. |
| `packages/chord/src/services/errors.ts` | 785 | chép nguyên văn | Không import, không chuỗi scope, đã dùng tab sẵn (15 dòng thụt lề bằng tab, 0 dòng bằng khoảng trắng) — chép nguyên văn được, kể cả thụt lề. |
| `packages/chord/src/services/loopback.ts` | 653 | chép rồi sửa | 2 hậu tố `.ts`. |
| `packages/chord/src/services/state-internals.ts` | 800 | chép rồi sửa | 2 hậu tố `.ts`. |
| `packages/chord/src/node/bundle.ts` | 8876 | chép rồi sửa | 1 hậu tố `.ts`; dòng 97: cả `@earendil-works/chord` và `@earendil-works/chord/*` trong mảng `external` của esbuild -> `@oh-my-pi/chord` / `@oh-my-pi/chord/*`; dòng 118: `Awaited<ReturnType<typeof build>>` -> kiểu esbuild có tên (xem mục *Dependency mới* — esbuild re-export kiểu kết quả của nó; import ở top-level, tuyệt đối không import inline). |
| `packages/chord/src/node/bundle-loader.ts` | 16573 | chép rồi sửa | 2 hậu tố `.ts`; dòng 329/330/333: ba phép so sánh `@earendil-works/chord` trong bộ phân giải specifier -> `@oh-my-pi/chord`. |
| `packages/chord/src/node/package.ts` | 9232 | chép rồi sửa | 1 hậu tố `.ts`; dòng 57 và 182: `Awaited<ReturnType<typeof stat>>` -> `import type { Stats } from "node:fs"` ở đầu file, dùng như `let x: Stats`. |
| `packages/chord/src/node/manifest.ts` | 1514 | chép nguyên văn | Chỉ hằng số. Năm chuỗi giá trị KHÔNG được viết lại — xem mục *Va chạm với thứ omp đã có*. |
| `packages/chord/src/node.ts` | 610 | chép rồi sửa | 4 hậu tố `.ts`; chuyển hai khối re-export có tên thành `export * from`. |
| `packages/chord/src/bundler.ts` | 386 | chép rồi sửa | 5 hậu tố `.ts`; chuyển sang `export * from` theo luật barrel. |
| `packages/chord/README.md` | 10466 | chép rồi sửa | 9 lần `@earendil-works/chord` -> `@oh-my-pi/chord`; bỏ `.ts` khỏi các specifier import ví dụ; thay phần mở đầu cài đặt/import riêng của pi bằng phiên bản của omp; thêm dòng ghi công ở đầu: 'Migrated from earendil-works/pi (MIT, Copyright (c) 2025 Mario Zechner).' |
| `packages/chord/test/delta-tracker/tracker.test.ts` | 56112 | chép rồi sửa | `from "vitest"` -> `from "bun:test"`. 73 khối describe/it — lưới hồi quy của CRDT. File test có giá trị cao nhất trong toàn bộ migration. |
| `packages/chord/test/services.test.ts` | 27609 | chép rồi sửa | vitest -> bun:test. 23 khối. |
| `packages/chord/test/facets.test.ts` | 20955 | chép rồi sửa | vitest -> bun:test. 15 khối. Chứa các khẳng định về vòng rút khi dispose mà M1 W2 từng muốn. |
| `packages/chord/test/delta.test.ts` | 17921 | chép rồi sửa | vitest -> bun:test. 50 khối. |
| `packages/chord/test/state.test.ts` | 16354 | chép rồi sửa | vitest -> bun:test. 21 khối. |
| `packages/chord/test/delta-apply-immutable.test.ts` | 9133 | chép rồi sửa | vitest -> bun:test. Lưới hồi quy ô nhiễm prototype — khẳng định các lần từ chối `RESERVED_SEGMENTS` vẫn nổ. |
| `packages/chord/test/bundle.test.ts` | 10829 | chép rồi sửa | vitest -> bun:test; 3 lần `@earendil-works/chord` -> `@oh-my-pi/chord` (các khẳng định về những gì bundler đánh dấu external phải bám theo scope mới). File này còn cần có binary esbuild — là file test duy nhất không thể xanh trước khi `bun install` đã tải esbuild. |
| `packages/chord/test/facet-loader.test.ts` | 11801 | chép rồi sửa | vitest -> bun:test. 10 khối. |
| `packages/chord/test/state-diff.test.ts` | 10268 | chép rồi sửa | vitest -> bun:test. 23 khối. |
| `packages/chord/test/delta-diff.test.ts` | 10826 | chép rồi sửa | vitest -> bun:test. 24 khối. |
| `packages/chord/test/service-wire.test.ts` | 9469 | chép rồi sửa | vitest -> bun:test. 8 khối. Canh giữ 11 parser trên đầu vào độc hại. |
| `packages/chord/test/delta-tracker/retention.test.ts` | 992 | chép rồi sửa | vitest -> bun:test; bỏ hậu tố `.ts` trong `"./retention.worker.ts"` -> `"./retention.worker"`; thay `node:child_process` (AGENTS.md cấm, dòng 81 đưa nó vào cột "Not") bằng `Bun.spawnSync(["--expose-gc", workerPath, scenario], { stdout: "pipe", stderr: "pipe" })` rồi đọc qua `.stdout`/`.stderr` — dưới bun, `process.execPath` chính là bun, và cờ `--expose-gc` đã thử chạy được (`globalThis.gc` là `function`) nên không cần đổi. 2 khối. |
| `packages/chord/test/delta-tracker/retention.worker.ts` | 11910 | chép rồi sửa | worker spawn phải theo luật của omp (`hostEntry()` với nhánh fallback trực tiếp module). Yêu cầu `declareWorkerHostEntry` của AGENTS.md giới hạn cho worker production; đây là fixture test nên fallback `new Worker(new URL(...), {type:'module'})` trực tiếp là chấp nhận được — nhưng hãy chốt câu hỏi bảng dispatch trong mục *Cần người quyết* trước khi chọn. |
| `packages/chord/test/state-draft.test.ts` | 5006 | chép rồi sửa | vitest -> bun:test. 9 khối. |
| `packages/chord/test/state-fuzz.test.ts` | 4282 | chép rồi sửa | vitest -> bun:test. 1 khối. Fuzzing — khẳng định kết quả CÓ BIÊN hoặc lỗi được nêu ra, không bao giờ là `not.toThrow()` trần. |
| `packages/chord/test/context.test.ts` | 3546 | chép rồi sửa | vitest -> bun:test. 6 khối. Vẫn phải xanh sau khi viết lại bằng `Promise.withResolvers`. |
| `packages/chord/test/json.test.ts` | 2679 | chép rồi sửa | vitest -> bun:test. 7 khối. |
| `packages/chord/test/delta-clone.test.ts` | 2130 | chép rồi sửa | vitest -> bun:test. 5 khối. |
| `packages/chord/test/state-value.test.ts` | 1524 | chép rồi sửa | vitest -> bun:test. 4 khối. |
| `packages/chord/test/boundary.test.ts` | 1504 | chép rồi sửa | vitest -> bun:test; 2 kiểm tra tiền tố `@earendil-works/pi-` (dòng 15 và 26) -> `@oh-my-pi/pi-`. File này duyệt package và khẳng định không specifier scope thượng nguồn nào lọt vào một entry đã phát hành — đây là một cổng cấu trúc thật, và KHÔNG vi phạm lệnh cấm source-grep vì nó là kiểm tra ranh giới phân giải import, không phải khẳng định về văn bản mã. |
| `packages/chord/test/helpers.ts` | 78 | chép rồi sửa | Bỏ hậu tố `.ts`: `from "../src/services/loopback.ts"` -> `from "../src/services/loopback"`. Ngoài ra không còn gì để đổi. |
| `packages/chord/PLANNING.md` | 41634 | bỏ | n/a — không chép. |
| `packages/chord/tsconfig.build.json` | 209 | bỏ | n/a — không chép. omp không bao giờ chạy trình biên dịch bị cấm; `packages/omptype` giao một `tsconfig.json` 133 byte cho `tsgo --noEmit` thay thế. Hãy viết file đó. |
| `packages/chord/test/delta-traversal.bench.ts` | 6849 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/benchmark.ts` | 5535 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/benchmark.worker.ts` | 15065 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/conversation-view-benchmark.ts` | 9737 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/conversation-view-benchmark.worker.ts` | 39131 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/memory-benchmark.ts` | 4404 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/memory-benchmark.worker.ts` | 6134 | bỏ | n/a — không chép trong M1. |

Về thụt lề: trong toàn package chỉ 5/29 file `.ts` dưới `src/` thật sự dùng thụt lề khoảng trắng và cần chuyển sang tab — `api.ts`, `context/index.ts`, `delta/index.ts`, `index.ts`, `types.ts` (tổng 98 dòng). 24 file `src/` còn lại VÀ cả 21 file test đã là tab sẵn, nên bảng không nhắc `tab` ở những hàng đó: `oxfmt` không đổi gì.

### Bề mặt công khai

148 symbol. `already_exists_in_omp` trong spec là kết quả quét 0-hit trên toàn bộ `packages/**/*.ts`; chỉ hai symbol từng có mặt: `Context` và `JsonValue` (mục *Va chạm*). 147/148 neo khớp đúng với nguồn; hàng thứ 148 (`JsonRevisionValidator`) là chỗ duy nhất phải SỬA SO VỚ SPEC — `public_api` của spec ghi nó là `validateRevision` @ `revision-validator.ts:1`, nhưng `validateRevision` xuất hiện 0 lần trong toàn pi-ref và file đó chỉ export đúng một thứ: `export class JsonRevisionValidator` ở dòng 8. Cột dưới đây ghi theo NGUỒN.

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa |
| --- | --- | --- | --- | --- |
| `createFacetHost` | function | `packages/chord/src/api.ts:22` | `packages/chord/src/api.ts:22` | chưa |
| `createStaticFacetLoader` | function | `packages/chord/src/api.ts:32` | `packages/chord/src/api.ts:32` | chưa |
| `combineFacetLoaders` | function | `packages/chord/src/api.ts:41` | `packages/chord/src/api.ts:41` | chưa |
| `defineFacet` | function | `packages/chord/src/api.ts:69` | `packages/chord/src/api.ts:69` | chưa |
| `defineService` | function | `packages/chord/src/api.ts:73-80` | `packages/chord/src/api.ts:73-80` | chưa |
| `createRemoteServiceBinding` | function | `packages/chord/src/api.ts:87` | `packages/chord/src/api.ts:87` | chưa |
| `replicatedState` | function | `packages/chord/src/api.ts:91-100` | `packages/chord/src/api.ts:91-100` | chưa |
| `Draft` | type | `packages/chord/src/delta/draft.ts:2` | `packages/chord/src/delta/draft.ts:2` | chưa |
| `CopyJsonOptions` | type | `packages/chord/src/json.ts:10` | `packages/chord/src/json.ts:10` | chưa |
| `copyJson` | function | `packages/chord/src/json.ts:16` | `packages/chord/src/json.ts:16` | chưa |
| `isJsonValue` | function | `packages/chord/src/json.ts:74` | `packages/chord/src/json.ts:74` | chưa |
| `REMOTE_SERVICE_ERROR_CODES` | const | `packages/chord/src/services/errors.ts:1` | `packages/chord/src/services/errors.ts:1` | chưa |
| `RemoteServiceErrorCode` | type | `packages/chord/src/services/errors.ts:12` | `packages/chord/src/services/errors.ts:12` | chưa |
| `isRemoteServiceErrorCode` | function | `packages/chord/src/services/errors.ts:14` | `packages/chord/src/services/errors.ts:14` | chưa |
| `RemoteServiceError` | class | `packages/chord/src/services/errors.ts:18` | `packages/chord/src/services/errors.ts:18` | chưa |
| `ServiceUpdatePublisher` | type | `packages/chord/src/services/provider.ts:66` | `packages/chord/src/services/provider.ts:66` | chưa |
| `RemoteServiceEndpoint` | interface | `packages/chord/src/services/provider.ts:73` | `packages/chord/src/services/provider.ts:73` | chưa |
| `RemoteServiceProvider` | class | `packages/chord/src/services/provider.ts:78` | `packages/chord/src/services/provider.ts:78` | chưa |
| `createRemoteServiceEndpoint` | function | `packages/chord/src/services/provider.ts:532` | `packages/chord/src/services/provider.ts:532` | chưa |
| `validateRemoteServiceImplementation` | function | `packages/chord/src/services/provider.ts:570` | `packages/chord/src/services/provider.ts:570` | chưa |
| `ServiceStateEncoder` | interface | `packages/chord/src/services/state-codec.ts:11` | `packages/chord/src/services/state-codec.ts:11` | chưa |
| `ServiceStateDecoder` | interface | `packages/chord/src/services/state-codec.ts:17` | `packages/chord/src/services/state-codec.ts:17` | chưa |
| `createServiceStateEncoder` | function | `packages/chord/src/services/state-codec.ts:60` | `packages/chord/src/services/state-codec.ts:60` | chưa |
| `createServiceStateDecoder` | function | `packages/chord/src/services/state-codec.ts:90` | `packages/chord/src/services/state-codec.ts:90` | chưa |
| `createServiceCatalogueCall` | function | `packages/chord/src/services/wire.ts:54` | `packages/chord/src/services/wire.ts:54` | chưa |
| `createServiceSubscribeCall` | function | `packages/chord/src/services/wire.ts:58` | `packages/chord/src/services/wire.ts:58` | chưa |
| `createServiceUnsubscribeCall` | function | `packages/chord/src/services/wire.ts:62` | `packages/chord/src/services/wire.ts:62` | chưa |
| `decodeServiceControlCall` | function | `packages/chord/src/services/wire.ts:66` | `packages/chord/src/services/wire.ts:66` | chưa |
| `parseServiceCall` | function | `packages/chord/src/services/wire.ts:89` | `packages/chord/src/services/wire.ts:89` | chưa |
| `parseServiceCatalogue` | function | `packages/chord/src/services/wire.ts:99` | `packages/chord/src/services/wire.ts:99` | chưa |
| `parseServiceSubscriptionSnapshot` | function | `packages/chord/src/services/wire.ts:113` | `packages/chord/src/services/wire.ts:113` | chưa |
| `parseWireServiceSubscriptionSnapshot` | function | `packages/chord/src/services/wire.ts:118` | `packages/chord/src/services/wire.ts:118` | chưa |
| `parseServiceProviderUpdate` | function | `packages/chord/src/services/wire.ts:123` | `packages/chord/src/services/wire.ts:123` | chưa |
| `parseWireServiceProviderUpdate` | function | `packages/chord/src/services/wire.ts:128` | `packages/chord/src/services/wire.ts:128` | chưa |
| `ServiceControlCall` | type | `packages/chord/src/services/wire.ts:44` | `packages/chord/src/services/wire.ts:44` | chưa |
| `WireServiceMemberSnapshot` | type | `packages/chord/src/services/wire.ts:11` | `packages/chord/src/services/wire.ts:11` | chưa |
| `WireServiceInstanceSnapshot` | type | `packages/chord/src/services/wire.ts:15` | `packages/chord/src/services/wire.ts:15` | chưa |
| `WireServiceSubscriptionSnapshot` | type | `packages/chord/src/services/wire.ts:20` | `packages/chord/src/services/wire.ts:20` | chưa |
| `WireServiceProviderUpdate` | type | `packages/chord/src/services/wire.ts:26` | `packages/chord/src/services/wire.ts:26` | chưa |
| `ContextKey` | interface | `packages/chord/src/types.ts:8` | `packages/chord/src/types.ts:8` | chưa |
| `Context` | interface | `packages/chord/src/types.ts:15` | `packages/chord/src/types.ts:15` | **rồi** — xem *Va chạm* |
| `JsonValue` | type | `packages/chord/src/types.ts:21` | `packages/chord/src/types.ts:21` | **rồi** — xem *Va chạm* |
| `JsonRepresentation` | type | `packages/chord/src/types.ts:26` | `packages/chord/src/types.ts:26` | chưa |
| `ReplicatedState` | interface | `packages/chord/src/types.ts:43` | `packages/chord/src/types.ts:43` | chưa |
| `MutableReplicatedState` | interface | `packages/chord/src/types.ts:53` | `packages/chord/src/types.ts:53` | chưa |
| `ReplicatedStateDelivery` | interface | `packages/chord/src/types.ts:38` | `packages/chord/src/types.ts:38` | chưa |
| `ReplicatedStateSource` | interface | `packages/chord/src/types.ts:99` | `packages/chord/src/types.ts:99` | chưa |
| `ReplicatedStateSourceFrame` | interface | `packages/chord/src/types.ts:68` | `packages/chord/src/types.ts:68` | chưa |
| `ReplicatedStateSourceAttachment` | interface | `packages/chord/src/types.ts:78` | `packages/chord/src/types.ts:78` | chưa |
| `ReplicatedStateSourceOptions` | type | `packages/chord/src/types.ts:103` | `packages/chord/src/types.ts:103` | chưa |
| `AttachedReplicatedState` | interface | `packages/chord/src/types.ts:109` | `packages/chord/src/types.ts:109` | chưa |
| `ServiceMode` | type | `packages/chord/src/types.ts:117` | `packages/chord/src/types.ts:117` | chưa |
| `Service` | interface | `packages/chord/src/types.ts:120` | `packages/chord/src/types.ts:120` | chưa |
| `RemoteServiceContract` | type | `packages/chord/src/types.ts:167` | `packages/chord/src/types.ts:167` | chưa |
| `ServiceSpawner` | interface | `packages/chord/src/types.ts:169` | `packages/chord/src/types.ts:169` | chưa |
| `RemoteServices` | interface | `packages/chord/src/types.ts:173` | `packages/chord/src/types.ts:173` | chưa |
| `ServiceCatalogueEntry` | type | `packages/chord/src/types.ts:181` | `packages/chord/src/types.ts:181` | chưa |
| `ServiceInstanceAddress` | type | `packages/chord/src/types.ts:186` | `packages/chord/src/types.ts:186` | chưa |
| `ServiceMemberSnapshot` | type | `packages/chord/src/types.ts:191` | `packages/chord/src/types.ts:191` | chưa |
| `ServiceInstanceSnapshot` | type | `packages/chord/src/types.ts:195` | `packages/chord/src/types.ts:195` | chưa |
| `ServiceSubscriptionSnapshot` | type | `packages/chord/src/types.ts:200` | `packages/chord/src/types.ts:200` | chưa |
| `ServiceProviderUpdate` | type | `packages/chord/src/types.ts:206` | `packages/chord/src/types.ts:206` | chưa |
| `ServiceCall` | type | `packages/chord/src/types.ts:219` | `packages/chord/src/types.ts:219` | chưa |
| `ServiceSubscription` | interface | `packages/chord/src/types.ts:227` | `packages/chord/src/types.ts:227` | chưa |
| `RemoteServiceTransport` | interface | `packages/chord/src/types.ts:241` | `packages/chord/src/types.ts:241` | chưa |
| `RemoteServiceBindingOptions` | interface | `packages/chord/src/types.ts:251` | `packages/chord/src/types.ts:251` | chưa |
| `RemoteServiceBinding` | interface | `packages/chord/src/types.ts:259` | `packages/chord/src/types.ts:259` | chưa |
| `FacetEnvironment` | interface | `packages/chord/src/types.ts:263` | `packages/chord/src/types.ts:263` | chưa |
| `Facet` | interface | `packages/chord/src/types.ts:285` | `packages/chord/src/types.ts:285` | chưa |
| `RemoteServiceSource` | interface | `packages/chord/src/types.ts:290` | `packages/chord/src/types.ts:290` | chưa |
| `FacetOptions` | interface | `packages/chord/src/types.ts:301` | `packages/chord/src/types.ts:301` | chưa |
| `FacetHost` | interface | `packages/chord/src/types.ts:307` | `packages/chord/src/types.ts:307` | chưa |
| `LoadedFacets` | interface | `packages/chord/src/types.ts:314` | `packages/chord/src/types.ts:314` | chưa |
| `FacetLoader` | interface | `packages/chord/src/types.ts:319` | `packages/chord/src/types.ts:319` | chưa |
| `BACKGROUND_CONTEXT` | const | `packages/chord/src/context/index.ts:55` | `packages/chord/src/context/index.ts:55` | chưa |
| `TODO_CONTEXT` | const | `packages/chord/src/context/index.ts:56` | `packages/chord/src/context/index.ts:56` | chưa |
| `createContextKey` | function | `packages/chord/src/context/index.ts:58` | `packages/chord/src/context/index.ts:58` | chưa |
| `withContextValue` | function | `packages/chord/src/context/index.ts:63` | `packages/chord/src/context/index.ts:63` | chưa |
| `withAbortSignal` | function | `packages/chord/src/context/index.ts:71` | `packages/chord/src/context/index.ts:71` | chưa |
| `withoutAbortSignal` | function | `packages/chord/src/context/index.ts:78` | `packages/chord/src/context/index.ts:78` | chưa |
| `withCancel` | function | `packages/chord/src/context/index.ts:83` | `packages/chord/src/context/index.ts:83` | chưa |
| `awaitWithContext` | function | `packages/chord/src/context/index.ts:98` | `packages/chord/src/context/index.ts:98` | chưa |
| `Seg` | type | `packages/chord/src/delta/index.ts:14` | `packages/chord/src/delta/index.ts:14` | chưa |
| `Path` | type | `packages/chord/src/delta/index.ts:15` | `packages/chord/src/delta/index.ts:15` | chưa |
| `NonEmptyPath` | type | `packages/chord/src/delta/index.ts:16` | `packages/chord/src/delta/index.ts:16` | chưa |
| `PathRef` | type | `packages/chord/src/delta/index.ts:19` | `packages/chord/src/delta/index.ts:19` | chưa |
| `Op` | type | `packages/chord/src/delta/index.ts:32` | `packages/chord/src/delta/index.ts:32` | chưa |
| `WireOp` | type | `packages/chord/src/delta/index.ts:52` | `packages/chord/src/delta/index.ts:52` | chưa |
| `isReplace` | const | `packages/chord/src/delta/index.ts:70` | `packages/chord/src/delta/index.ts:70` | chưa |
| `isBase` | const | `packages/chord/src/delta/index.ts:76` | `packages/chord/src/delta/index.ts:76` | chưa |
| `overlap` | function | `packages/chord/src/delta/index.ts:87` | `packages/chord/src/delta/index.ts:87` | chưa |
| `diffRevisions` | function | `packages/chord/src/delta/index.ts:114` | `packages/chord/src/delta/diff.ts:1` | chưa |
| `RESERVED_SEGMENTS` | const | `packages/chord/src/delta/index.ts:131` | `packages/chord/src/delta/index.ts:131` | chưa |
| `UnsafePathError` | class | `packages/chord/src/delta/index.ts:133` | `packages/chord/src/delta/index.ts:133` | chưa |
| `assertValidOp` | function | `packages/chord/src/delta/index.ts:152` | `packages/chord/src/delta/index.ts:152` | chưa |
| `assertValidWireOp` | function | `packages/chord/src/delta/index.ts:211` | `packages/chord/src/delta/index.ts:211` | chưa |
| `assertSafePath` | function | `packages/chord/src/delta/index.ts:279` | `packages/chord/src/delta/index.ts:279` | chưa |
| `PathError` | class | `packages/chord/src/delta/index.ts:310` | `packages/chord/src/delta/index.ts:310` | chưa |
| `apply` | function | `packages/chord/src/delta/index.ts:326` | `packages/chord/src/delta/index.ts:326` | chưa |
| `applyImmutable` | function | `packages/chord/src/delta/index.ts:409` | `packages/chord/src/delta/index.ts:409` | chưa |
| `applyImmutableBatches` | function | `packages/chord/src/delta/index.ts:419` | `packages/chord/src/delta/index.ts:419` | chưa |
| `Encoder` | interface | `packages/chord/src/delta/index.ts:515` | `packages/chord/src/delta/index.ts:515` | chưa |
| `encoder` | function | `packages/chord/src/delta/index.ts:523` | `packages/chord/src/delta/index.ts:523` | chưa |
| `Decoder` | interface | `packages/chord/src/delta/index.ts:618` | `packages/chord/src/delta/index.ts:618` | chưa |
| `decoder` | function | `packages/chord/src/delta/index.ts:622` | `packages/chord/src/delta/index.ts:622` | chưa |
| `Tracker` | interface | `packages/chord/src/delta/tracker.ts:135` | `packages/chord/src/delta/tracker.ts:135` | chưa |
| `Change` | type | `packages/chord/src/delta/tracker.ts:129` | `packages/chord/src/delta/tracker.ts:129` | chưa |
| `Prepared` | type | `packages/chord/src/delta/tracker.ts:121` | `packages/chord/src/delta/tracker.ts:121` | chưa |
| `track` | function | `packages/chord/src/delta/tracker.ts:321` | `packages/chord/src/delta/tracker.ts:321` | chưa |
| `bundleFacets` | function | `packages/chord/src/bundler.ts:6` | `packages/chord/src/bundler.ts:6` | chưa |
| `bundleFacetPackage` | function | `packages/chord/src/bundler.ts:9` | `packages/chord/src/bundler.ts:9` | chưa |
| `BundleFacetsOptions` | type | `packages/chord/src/bundler.ts:2` | `packages/chord/src/bundler.ts:2` | chưa — tên re-export, định nghĩa ở `src/node/bundle.ts` |
| `BundleFacetsResult` | type | `packages/chord/src/bundler.ts:3` | `packages/chord/src/bundler.ts:3` | chưa — tên re-export, định nghĩa ở `src/node/bundle.ts` |
| `FacetBundlePlatform` | type | `packages/chord/src/bundler.ts:4` | `packages/chord/src/bundler.ts:4` | chưa — tên re-export, định nghĩa ở `src/node/bundle.ts` |
| `BundleFacetPackageOptions` | type | `packages/chord/src/bundler.ts:8` | `packages/chord/src/bundler.ts:8` | chưa |
| `BundleFacetPackageResult` | type | `packages/chord/src/bundler.ts:8` | `packages/chord/src/bundler.ts:8` | chưa |
| `createFacetBundleLoader` | function | `packages/chord/src/node.ts:8` | `packages/chord/src/node.ts:8` | chưa |
| `createFacetBundleArtifactLoader` | function | `packages/chord/src/node.ts:7` | `packages/chord/src/node.ts:7` | chưa |
| `readFacetBundleArtifact` | function | `packages/chord/src/node.ts:9` | `packages/chord/src/node.ts:9` | chưa |
| `readFacetBundleManifest` | function | `packages/chord/src/node.ts:10` | `packages/chord/src/node.ts:10` | chưa |
| `FACET_BUNDLE_FORMAT` | const | `packages/chord/src/node/manifest.ts:1` | `packages/chord/src/node/manifest.ts:1` | chưa |
| `FACET_BUNDLE_FORMAT_VERSION` | const | `packages/chord/src/node/manifest.ts:2` | `packages/chord/src/node/manifest.ts:2` | chưa |
| `FACET_BUNDLE_MANIFEST_FILE` | const | `packages/chord/src/node/manifest.ts:3` | `packages/chord/src/node/manifest.ts:3` | chưa |
| `FACET_BUNDLE_ARTIFACT_FORMAT` | const | `packages/chord/src/node/manifest.ts:4` | `packages/chord/src/node/manifest.ts:4` | chưa |
| `FACET_BUNDLE_ARTIFACT_FORMAT_VERSION` | const | `packages/chord/src/node/manifest.ts:5` | `packages/chord/src/node/manifest.ts:5` | chưa |
| `FacetBundleEntry` | interface | `packages/chord/src/node/manifest.ts:7` | `packages/chord/src/node/manifest.ts:7` | chưa |
| `FacetBundleManifest` | interface | `packages/chord/src/node/manifest.ts:18` | `packages/chord/src/node/manifest.ts:18` | chưa |
| `FacetBundlePlugin` | interface | `packages/chord/src/node/manifest.ts:25` | `packages/chord/src/node/manifest.ts:25` | chưa |
| `FacetBundleArtifact` | interface | `packages/chord/src/node/manifest.ts:31` | `packages/chord/src/node/manifest.ts:31` | chưa |
| `FacetBundleLoaderOptions` | type | `packages/chord/src/node.ts:4` | `packages/chord/src/node.ts:4` | chưa — tên re-export, định nghĩa ở `src/node/bundle-loader.ts` |
| `FacetBundleArtifactLoaderOptions` | type | `packages/chord/src/node.ts:2` | `packages/chord/src/node.ts:2` | chưa — tên re-export, định nghĩa ở `src/node/bundle-loader.ts` |
| `FacetBundleExternalResolver` | type | `packages/chord/src/node.ts:3` | `packages/chord/src/node.ts:3` | chưa — tên re-export, định nghĩa ở `src/node/bundle-loader.ts` |
| `FacetKernel` | class | `packages/chord/src/facets/host.ts:340` | `packages/chord/src/facets/host.ts:340` | chưa |
| `disposeLoadedFacets` | function | `packages/chord/src/facets/loader.ts:3` | `packages/chord/src/facets/loader.ts:3` | chưa |
| `ServiceSlot` | class | `packages/chord/src/services/handle.ts:9` | `packages/chord/src/services/handle.ts:9` | chưa |
| `InstanceDirectory` | class | `packages/chord/src/services/instances.ts:18` | `packages/chord/src/services/instances.ts:18` | chưa |
| `InstanceDirectoryEntry` | interface | `packages/chord/src/services/instances.ts:4` | `packages/chord/src/services/instances.ts:4` | chưa |
| `createLoopbackServiceTransport` | function | `packages/chord/src/services/loopback.ts:5` | `packages/chord/src/services/loopback.ts:5` | chưa |
| `RemoteServiceBindingImpl` | class | `packages/chord/src/services/consumer.ts:425` | `packages/chord/src/services/consumer.ts:425` | chưa |
| `MutableReplicatedStateImpl` | class | `packages/chord/src/services/state.ts:105` | `packages/chord/src/services/state.ts:105` | chưa |
| `ReplicatedStateReplica` | class | `packages/chord/src/services/state.ts:265` | `packages/chord/src/services/state.ts:265` | chưa |
| `attachReplicatedStateSource` | function | `packages/chord/src/services/state.ts:245` | `packages/chord/src/services/state.ts:245` | chưa |
| `serviceDeliveryContext` | function | `packages/chord/src/services/state.ts:345` | `packages/chord/src/services/state.ts:345` | chưa |
| `ReplicatedStateInternals` | interface | `packages/chord/src/services/state-internals.ts:4` | `packages/chord/src/services/state-internals.ts:4` | chưa |
| `registerReplicatedStateInternals` | function | `packages/chord/src/services/state-internals.ts:12` | `packages/chord/src/services/state-internals.ts:12` | chưa |
| `getReplicatedStateInternals` | function | `packages/chord/src/services/state-internals.ts:16` | `packages/chord/src/services/state-internals.ts:16` | chưa |
| `applyImmutableTrusted` | function | `packages/chord/src/delta/apply-immutable-trusted.ts:15` | `packages/chord/src/delta/apply-immutable-trusted.ts:15` | chưa |
| `JsonRevisionValidator` | class | `packages/chord/src/delta/revision-validator.ts:8` | `packages/chord/src/delta/revision-validator.ts:8` | chưa |

Bốn package anh em đứng trên nền này và import đúng những symbol sau, nên chúng là hợp đồng chéo gói: `pi-server` lấy `REMOTE_SERVICE_ERROR_CODES`, `ServiceStateEncoder`, `createServiceStateEncoder`, `decodeServiceControlCall`, `parseServiceCall`, `parseServiceSubscriptionSnapshot`, `parseServiceProviderUpdate`, `ServiceProviderUpdate`, `ServiceCall`; `pi-client` lấy `ServiceStateDecoder`, `createServiceStateDecoder`, `createServiceCatalogueCall`, `createServiceSubscribeCall`, `parseServiceCall`, và gọi vào phần cơ máy đứng sau `createRemoteServiceBinding`; `pi-durable` lấy `Op`, `track`, `apply`, `applyImmutable`, `applyImmutableBatches`, `RemoteServiceContract`, `BACKGROUND_CONTEXT`, `withoutAbortSignal`, `awaitWithContext`; `pi-protocol` lấy `JsonValue` và `isJsonValue`. Trong số đó vài symbol không đi qua barrel gốc mà chỉ là module nội bộ — `validateRemoteServiceImplementation`, `RemoteServiceContract`, `FacetKernel`, `disposeLoadedFacets` — nhưng vẫn được `test/services.test.ts` và `test/facets.test.ts` gọi tới, nên chúng phải được chép.

Vài quy mô đáng ghi nhớ: `RemoteServiceProvider` là 616 dòng (sổ đăng ký dịch vụ phía server), `RemoteServiceBindingImpl` là 660 dòng (file services lớn nhất), `Tracker` đứng sau 2205 dòng triển khai, `applyImmutableTrusted` là 128 dòng và không export gì qua barrel.

### Dependency mới

| package | phiên bản | license | đã có ở omp chưa |
| --- | --- | --- | --- |
| `esbuild` | `0.28.2` | MIT | chưa |
| `@types/bun` | `catalog:` | MIT | **rồi** |

**`esbuild` 0.28.2** là dependency runtime ngoài DUY NHẤT của cả package, và nó được import ở đúng một file: `src/node/bundle.ts:4` `import { type BuildOptions, build, type Message } from "esbuild"`. Mọi import ngoài khác trong `src/` đều là builtin của node (`node:crypto`, `node:fs/promises`, `node:module`, `node:os`, `node:path`, `node:url`, `node:vm`). Hôm nay đã xác minh nó vắng: không có `"esbuild"` trong package.json gốc hay bất kỳ `packages/*/package.json` nào, và `ls -d node_modules/esbuild` trả về “No such file or directory”. Dấu vết duy nhất trong `bun.lock` là dòng 1455, nơi esbuild xuất hiện như optional peer của vite (`peerDependencies: {..., "esbuild": "^0.27.0 || ^0.28.0", ...}`, `optionalPeers: [..., "esbuild", ...]`) — được khai báo, chưa bao giờ cài. 0.28.2 thỏa mãn khoảng đó, nên thêm nó không tạo xung đột phiên bản với vite.

**Cái KHÔNG thêm:**

- `@types/node` — nhu cầu import `node:` của chord được `@types/bun` trong catalog gốc của repo thay thế, nên không thêm.
- `vitest` 4.1.9 — bị gỡ khỏi devDependencies; toàn bộ 21 file test đổi sang `bun:test`.
- `shx` 0.4.0 — bị gỡ khỏi devDependencies; chỉ phục vụ script `clean` mà omp không dùng.
- Mọi script build dựa trên trình biên dịch bị cấm — bị xóa; typecheck chạy qua `tsgo -p tsconfig.json --noEmit`.
- 6 file benchmark dưới `test/delta-benchmark/` cùng `test/delta-traversal.bench.ts` và `PLANNING.md` — không phải dependency nhưng là ~87 KB nằm ngoài phạm vi; xem *Cần người quyết*.

### Va chạm với thứ omp đã có

Mục quan trọng nhất. Sáu mục dưới đây, và cả sáu đều là QUYẾT ĐỊNH — kể cả những cái được giải quyết bằng “giữ cả hai bên, không đổi tên”.

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| Vòng rút dọn disposer — XUNG ĐỘT NGỮ NGHĨA, và tiền đề của M1 W2 là sai. Ghi chú nhiệm vụ nói M1 W1/W2 “đã port thủ công drain thứ tự ngược + cô lập lỗi từ packages/chord/src/facets/host.ts:125-142”. Đã xác minh là sai theo hai cách. (1) Bản ghi `plan_corrections` của chính W2 ghi claim đó là verdict 'unverifiable — the reference does not exist in this repo', evidence '`ls -d pi-ref` → No such file or directory; `find . -path ./node_modules -prune -o -name host.ts -path \'*chord*\' -print` trả về rỗng', và correction là 'Do not attempt to read chord.' (2) Không có gì được đặt xuống: `drainDisposers` không tồn tại ở bất kỳ đâu trong omp. Bốn vòng rút mà W2 nhắm vẫn là dạng gốc: thứ tự thuận, không try/catch. | packages/chord/src/facets/host.ts:125-142 | packages/coding-agent/src/session/agent-session.ts:4983, packages/coding-agent/src/session/agent-session.ts:5218, packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112, packages/coding-agent/src/extensibility/extensions/runner.ts:1347 — cả bốn đều là `for (const dispose of this.#X.splice(0)) dispose();` | **GIỮ CỦA OMP.** Chép chord KHÔNG được nghĩa là chuyển bốn vòng rút này. Hai thiết kế cố ý bất đồng: `FacetKernel.dispose` của chord rút ngược, cô lập từng lỗi, rồi NÉM LẠI (`if (errors.length === 1) throw errors[0]; if (errors.length > 1) throw new AggregateError(errors, ...)`). Hợp đồng của W2 là ghi log rồi đi tiếp, vì `beginDispose()` được gọi từ `session-teardown.ts:70` TRƯỚC cái try bao quanh `await deps.saveDraft(draftText)` — một vòng rút ném lỗi sẽ từ chối teardown trước khi bản nháp được ghi, biến một rò rỉ tài nguyên có điều kiện thành đường mất dữ liệu không điều kiện. Sai lệch đó là đúng cho omp. Cài lại bốn vòng rút theo `FacetKernel` của chord là một thay đổi RIÊNG, SAU NÀY, theo spec riêng của W2, và khi làm vậy hãy giữ log-rồi-tiếp-tục. Spec này chỉ đặt xuống `packages/chord`; nó đổi không dòng nào trong `packages/coding-agent`. |
| JsonValue — sáu định nghĩa trong omp, ba hình dạng khác nhau. Va chạm tầm tới lớn nhất trong package, vì `pi-server`, `pi-client`, `pi-durable` và `pi-protocol` đều import `JsonValue` của chord. | packages/chord/src/types.ts:21 — `null \| boolean \| number \| string \| JsonValue[] \| { [key: string]: JsonValue }` | packages/catalog/src/discovery/protobuf.ts:11 (hình dạng giống hệt), packages/mnemopi/src/types.ts:2 (qua `JsonScalar`, giống hệt), packages/mnemopi/src/mcp-tools.ts:9 (qua `JsonPrimitive`, giống hệt), packages/mnemopi/src/core/beam/types.ts:4 (giống hệt), packages/ai/src/judgment/types.ts:17 (bản READONLY: `readonly JsonValue[]` / `{ readonly [key: string]: JsonValue }`), packages/coding-agent/src/secrets/obfuscator.ts:72 (LỆCH: nhánh object là `{ [key: string]: JsonValue \| undefined }`) | **GIỮ BẢN CỦA CHORD, nhưng đừng cố hợp nhất sáu bản của omp trong thay đổi này.** Chép nguyên văn `JsonValue` của chord là đúng và không phá vỡ gì: cả bốn package anh em import nó đều được chép từ cùng cây pi nên nhất quán với nhau. Bản `obfuscator.ts` là một chỗ lệch thật, nhưng không gì trong migration này truyền một giá trị từ obfuscator qua ranh giới chord, nên hợp nhất nằm ngoài phạm vi. Ghi lại làm việc theo sau: một `JsonValue` + `isJsonValue` chung ở `@oh-my-pi/pi-utils`, và cho cả sáu định nghĩa cùng hai bản của chord import từ đó. Lưu ý spec của `pi-protocol` nói nó import `JsonValue` và `isJsonValue` từ chord — sau migration này chúng đến từ `@oh-my-pi/chord`, và bản chép của `pi-protocol` phải được trỏ vào import đó thay vì giữ bản riêng. |
| isJsonValue — tên đã bị chiếm ba lần trong omp, một lần với chữ ký không tương thích. | packages/chord/src/json.ts:74 — `isJsonValue(value: unknown): value is JsonValue`, a TYPE GUARD | packages/coding-agent/src/eval/judgment-bridge.ts:47 và packages/ai/src/providers/cursor.ts:4643 (cả hai `(value: unknown): value is JsonValue`, tương thích), cộng packages/omptype/src/json-schema.ts:296 vốn là `isJsonValue(value: unknown, seen = new Set<object>()): boolean` — boolean thuần, thêm tham số tập vòng lặp, KHÔNG phải type guard | **GIỮ BẢN CỦA CHORD làm export chuẩn.** Không import site nào hiện star-import cả `@oh-my-pi/chord` lẫn một module export bản của omptype, nên bản chép không tạo mơ hồ. Đừng đụng bản của omptype trong thay đổi này — nó nằm sau một chữ ký khác và việc thay nó là một refactor riêng. Nhưng hãy làm cho `pi-protocol` import guard của chord thay vì khai báo một bản thứ tư. |
| Context — cùng tên, khác hẳn khái niệm. | packages/chord/src/types.ts:15 — immutable key/value cancellation scope: `value<T>(key: ContextKey<T>): T \| undefined`, `toString()`, and an `abortSignal` getter | packages/ai/src/types.ts:1476 — `export interface Context { systemPrompt?: string[]; messages: Message[]; tools?: Tool[]; inactiveTools?: Tool[] }`, một PAYLOAD REQUEST, export từ `@oh-my-pi/pi-ai` và được import theo tên ở hơn 10 file | **GIỮ CẢ HAI, KHÔNG GỘP.** Chúng không liên quan và cả hai đều đúng. Bản chép an toàn hôm nay vì không file nào star-import cả hai barrel — cả hơn 10 import `Context` từ `@oh-my-pi/pi-ai` đều là named import, và TS chỉ nêu mơ hồ khi va chạm `export *`. Rủi ro còn lại là một re-export barrel trong tương lai: nếu có module nào làm `export * from "@oh-my-pi/pi-ai"` cùng `export * from "@oh-my-pi/chord"`, TS sẽ nêu TS2308. Hãy để lại một chú thích tại `packages/chord/src/types.ts:15` nêu `Context` không liên quan của pi-ai để người sau không thử hợp nhất chúng. Không đổi tên symbol nào — `durable`, `client`, `server` và `protocol` đều import `Context` của chord theo tên, và đổi tên sẽ phá bốn package mà không đổi lấy gì. |
| Draft — một kiểu permissive hơn nhiều trong một codebase cấm `any` ở nơi khác. | packages/chord/src/delta/draft.ts:2 — recursive `-readonly` mapped type with an explicit depth cutoff at 8 | không có định nghĩa `Draft` nào trong omp (0 kết quả cho `type Draft\|interface Draft`) | **KHÔNG VA CHẠM — nhưng hãy ghi lại ý định.** Mốc cắt tồn tại để trình biên dịch không làm nổ stack trên các kiểu sâu. Giữ nguyên văn; đừng “đơn giản hóa” nó thành đệ quy không giới hạn. Chord có zero `any` trong `src` (đã xác minh: `: any\\|<any>\\|as any\\|any[]` = 0), nên bản chép không mang theo nợ `any`. |
| Chuỗi định dạng trên đĩa mang tên package thượng nguồn, mà package này không còn là nữa. | packages/chord/src/node/manifest.ts:1-5 — FACET_BUNDLE_FORMAT = "chord.facet-bundle", FACET_BUNDLE_ARTIFACT_FORMAT = "chord.facet-bundle-artifact", FACET_BUNDLE_MANIFEST_FILE = "chord-facets.json" | không có thứ tương đương trong omp; bề mặt bundler là hoàn toàn mới | **GIỮ NGUYÊN VĂN CÁC CHUỖI.** KHÔNG viết lại thành `"omp.…"` trong phạm vi viết lại scope. Chúng là danh tính của một artefact trên đĩa: một facet bundle do pi ghi ra phải vẫn nạp được dưới `@oh-my-pi/chord`, và ngược lại. Đổi tên chúng trong im lặng sẽ vô hiệu hoá mọi bundle còn nằm trên đĩa. Nếu omp sau này muốn định dạng riêng, đó là một lần tăng phiên bản định dạng, không phải sửa chuỗi trong một commit migration. |

### Các bước

1. **TẠO `packages/chord/LICENSE` TRƯỚC, trước khi bất kỳ dòng mã nào đặt xuống.** Chép nguyên văn `/Users/tranquangdang21/Projects/pi-ref/LICENSE`, rồi nối thêm các dòng bản quyền của omp để phần đầu đọc: `Copyright (c) 2025 Mario Zechner` / `Copyright (c) 2025-2026 Can Bölük` / `Copyright (c) 2026 Stencil Labs, Inc.` — khớp kiểu nhà ở `packages/omptype/LICENSE`. Bảo đảm có dòng cuối. Đây là điều kiện MIT gắn với mọi bước sau: pi là MIT (Copyright (c) 2025 Mario Zechner) và thông báo cho phép phải đi kèm với phần lớn mã nguồn. Làm việc này trước để không có commit trung gian nào chứa mã chép mà thiếu thông báo. *(anchor: `packages/chord/LICENSE`)*
2. Thêm esbuild vào khối `workspaces.catalog` của package.json gốc dưới dạng `"esbuild": "0.28.2"` (theo thứ tự alphabet, sau `"diff"` và trước `"fastembed"`), rồi chạy `bun install`. Đã xác minh là vắng hôm nay: không có khóa esbuild trong bất kỳ manifest nào, `ls -d node_modules/esbuild` thất bại, và dấu vết duy nhất trong `bun.lock` là optionalPeer của vite `^0.27.0 || ^0.28.0` mà 0.28.2 thỏa mãn — nên bước này thêm package mà không xáo trộn vite. Đây là dependency ngoài duy nhất migration giới thiệu. *(anchor: `package.json (workspaces.catalog)`)*
3. Chép nguyên văn 30 file dưới `src/` vào `packages/chord/src/`, giữ nguyên bố cục thư mục con (`context/`, `delta/`, `facets/`, `node/`, `services/`). Không đổi tên, không làm phẳng. *(anchor: `packages/chord/src/`)*
4. Bỏ hậu tố `.ts` khỏi TẤT CẢ 119 specifier import/export tương đối trong toàn package, KHÔNG chỉ `src/`: 84 specifier trong 25 file `src/` (`grep -rhoE 'from "\.\.?/[^"]*\.ts"' src | wc -l`) VÀ 35 specifier trong 19 file `test/` (cùng lệnh đó trên `test`, sau khi loại 4 file benchmark bị bỏ — tính cả benchmark thì là 42 trong 23 file). Quy ước của omp là không đuôi: `packages/omptype` và `packages/utils` có 0 import tương đối có đuôi và 355 import trần. Bỏ sót nhóm thứ hai sẽ làm `check:ts` đỏ: `tsconfig.json` mẫu của package khai báo `include: ["src","test","bench"]`, và chuỗi tsconfig mà package kế thừa (`tsconfig.json` -> `packages/tsconfig.workspace.json` -> `tsconfig.base.json`) không đặt `allowImportingTsExtensions` — chỉ `tsconfig.tools.json` đặt, mà nó chỉ phủ `scripts/` cùng `packages/natives/scripts/gen-npm-packages.ts`, không phủ `packages/chord` — nên `tsgo` nổ `TS5097` ("An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled") trên từng specifier còn đuôi — đã dựng lại đúng hình dạng tsconfig đó và chạy `tsgo -p ... --noEmit`: giữ đuôi -> exit 1, bóc đuôi -> exit 0. Làm bằng một sed cơ học trên `from "\.\.?/…\.ts"` -> `from "./…"`; không đụng specifier `node:` hay esbuild. *(anchor: `all of packages/chord/{src,test}/**/*.ts`)*
5. Chuyển các barrel `src/index.ts`, `src/node.ts` và `src/bundler.ts` từ re-export có tên sang `export * from` theo AGENTS.md. Ở `src/index.ts` có 8 khối re-export có tên: 6 khối mang giá trị runtime (`./api.ts`, `./json.ts`, `./services/errors.ts`, `./services/provider.ts`, `./services/state-codec.ts`, `./services/wire.ts`) trở thành star, cộng 2 khối type-only (`export type { Draft } from "./delta/index.ts"` và khối `./types.ts`) cũng được phép thành star; chỗ nào star va chạm (`types.ts` và `services/wire.ts` cùng lộ ra `RemoteServiceProvider` và `RemoteServiceError`) thì bỏ đường re-export thừa thay vì giữ cả hai. Giữ `export type { Draft } from "./delta/index"` dạng type-only — luật cho phép star re-export cho type nhưng không bắt buộc chuyển các dòng type-only không mang giá trị runtime. *(anchor: `packages/chord/src/index.ts, packages/chord/src/node.ts, packages/chord/src/bundler.ts`)*
6. Viết lại `@earendil-works/chord` -> `@oh-my-pi/chord` đúng 24 lần xuất hiện trong 7 file được chép: `package.json` (2 — dòng 2 `name` và dòng 59 `repository.url`), `README.md` (9), `src/delta/README.md` (3), `src/node/bundle-loader.ts` (3, dòng 329/330/333), `src/node/bundle.ts` (2 ở dòng 97 — specifier trần và glob `/*`), `test/bundle.test.ts` (3), `test/boundary.test.ts` (2, xử lý riêng ở bước 12). Tổng cộng là 29 lần trong 8 file nếu tính cả `PLANNING.md` (5, không chép) — con số này đáng nêu vì bỏ sót lần thứ hai trong `package.json` sẽ để lại URL trỏ về repo thượng nguồn trong manifest đã phát hành. Các dòng trong `bundle-loader` là bộ phân giải ánh xạ specifier của package về lại `../index.<ext>`, còn `bundle.ts:97` đánh dấu package là external cho esbuild; cả hai phải bám theo tên mới, nếu không bundler sẽ hỏng lúc chạy mà không có lỗi kiểu. *(anchor: `packages/chord/src/node/bundle-loader.ts:329-333, packages/chord/src/node/bundle.ts:97`)*
7. Viết lại 3 chỗ dùng `ReturnType<>` bị cấm (AGENTS.md: “NEVER use ReturnType<> — use the actual type name”). `src/node/bundle.ts:118` `Awaited<ReturnType<typeof build>>` trở thành kiểu kết quả build có tên của esbuild, import ở top-level từ `"esbuild"`. `src/node/package.ts:57` và `:182` `Awaited<ReturnType<typeof stat>>` trở thành `import type { Stats } from "node:fs"` dùng như `let x: Stats`. Thêm import ở đầu mỗi file — vị trí kiểu `import("esbuild").BuildResult` inline bị cấm. *(anchor: `packages/chord/src/node/bundle.ts:118, packages/chord/src/node/package.ts:57, packages/chord/src/node/package.ts:182`)*
8. Viết lại cấu trúc promise bị cấm duy nhất ở `src/context/index.ts:102` thành `Promise.withResolvers<T>()`. Giữ đúng ngữ nghĩa: gắn listener hủy với `{once:true}`, gỡ nó ở CẢ nhánh resolve và reject, và reject với `abortError(signal)` (hàm này ưu tiên `signal.reason` khi nó là một Error, nếu không thì dựng một DOMException có name 'AbortError'). Rồi chạy lại `test/context.test.ts` — đó là test duy nhất phủ hàm này. *(anchor: `packages/chord/src/context/index.ts:98-116`)*
9. Viết `packages/chord/package.json` theo cột sửa trong bảng *File cần chép*. Bốn điều sẽ vỡ nếu bỏ sót: (a) `main`/`types` phải trỏ tới `./src/index.ts` chứ không phải `./dist` — omp phát hành mã nguồn; (b) map `exports` bỏ các khóa `dist`/`source` và nhận ĐÚNG hình dạng wildcard của omp, không phải 4 subpath tường minh của pi: `{".": {types:'./src/index.ts', import:'./src/index.ts'}, "./*": {types:'./src/*.ts', import:'./src/*.ts'}, "./*.js": './src/*.ts'}` — đây chính là `packages/omptype/package.json` và `packages/wire/package.json`. Dạng wildcard còn là thứ duy nhất resolve được các subpath sâu mà `bundle-loader.ts` sinh ra. Không thêm khóa `./package.json` (không package omp nào có); (c) KHÔNG script nào gọi trình biên dịch bị cấm còn sót — script build bị xóa và kiểm tra kiểu chạy qua `check:types: tsgo -p tsconfig.json --noEmit`; (d) esbuild 0.28.2 là mục `dependencies` duy nhất. *(anchor: `packages/chord/package.json`)*
10. Viết `packages/chord/tsconfig.json` (133 byte, theo mẫu `packages/omptype/tsconfig.json`) để `tsgo -p tsconfig.json --noEmit` kiểm tra kiểu cho package. KHÔNG chép `tsconfig.build.json` của nguồn — nó extends `tsconfig.base.json` gốc của pi, phát ra `./dist` bằng trình biên dịch bị cấm, và tham chiếu một danh sách exclude `src/**/*.d.ts` không có bản tương ứng ở đây. *(anchor: `packages/chord/tsconfig.json`)*
11. Chép 21 file test hợp đồng (không phải 6 benchmark) vào `packages/chord/test/`, giữ thư mục con `delta-tracker/`. Rồi viết lại `from "vitest"` -> `from "bun:test"` trên 19 dòng import. Ở nơi file dùng thứ mà vitest có nhưng `bun:test` không (đáng chú ý nhất là `vi.waitFor` — KHÔNG có trong `bun:test`, và `expect.poll` cũng không có trên bun 1.3.14; đã probe trực tiếp: `typeof vi.waitFor === "undefined"`, `typeof vi.fn === "function"`, `typeof it.each === "function"`), thay bằng bản tương đương của bun hoặc cấu trúc lại khẳng định. Cụ thể `vi.waitFor` có 10 lời gọi nằm ở `test/services.test.ts:601,725,733,757` và `test/facets.test.ts:142,154,185,190,278,286` — cần một vòng poll tự viết tay, ví dụ `for (let i = 0; i < N; i++) { try { expect(...); break } catch { await Bun.sleep(...) } }`. `vi.fn` thì bun có sẵn nên giữ. KHÔNG có `toThrowError` ở đâu trong package (0 lần xuất hiện) — đừng tìm nó. Không để lại import vitest, vì `bun test` sẽ không resolve được module và cả file lỗi. *(anchor: `packages/chord/test/**`)*
12. Viết lại 2 kiểm tra tiền tố `@earendil-works/pi-` trong `test/boundary.test.ts` (dòng 15 và 26) thành `@oh-my-pi/pi-`. File này duyệt package và khẳng định không specifier scope thượng nguồn nào tới được entry point đã phát hành; nếu để chuỗi cũ, test sẽ pass một cách rỗng và bảo đảm ranh giới đó tan biến lặng lẽ. Đổi chuỗi, đừng đổi test. *(anchor: `packages/chord/test/boundary.test.ts:15, packages/chord/test/boundary.test.ts:26`)*
13. Chép hai README. `packages/chord/README.md`: 9 lần viết lại scope cùng phần mở đầu cài đặt/import, và thêm dòng ghi công 'Migrated from earendil-works/pi (MIT, Copyright (c) 2025 Mario Zechner)'. `packages/chord/src/delta/README.md`: 3 lần viết lại scope (dòng 4, 10, 71) cùng hậu tố `.ts` trên hai import ví dụ. README delta được phát hành — `package.json` của nguồn liệt kê nó trong `files` — nên ví dụ của nó phải hiện scope `@oh-my-pi`, nếu không chúng sẽ tài liệu hoá một import không resolve được. *(anchor: `packages/chord/README.md, packages/chord/src/delta/README.md`)*
14. Tạo `packages/chord/CHANGELOG.md` với mục `## [Unreleased]` và một dòng `### Added`, theo luật changelog của AGENTS.md: hướng tới người dùng, không tự sự diễn giải nguyên nhân, không chi tiết hiện thực. Rồi chạy `bun run fmt` trong package (oxfmt) để chuẩn hoá nguồn 4-space về kiểu tab/tabWidth-3/printWidth-120 của repo, và `bun run lint` (oxlint). *(anchor: `packages/chord/CHANGELOG.md`)*
15. Chạy cổng: `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers`. Exit 0, ~29s trên máy rảnh. Cổng thứ hai, chạy ĐƯỢC NGAY: `bun test packages/chord/test` — KHÔNG cần `brew install ninja`. Lý do: `packages/natives` đã build xong trên máy này (`brew install ninja` + `bun --cwd=packages/natives run build`, exit 0), và ngay cả khi addon còn chưa build thì điều đó chỉ chặn những package kéo addon; chord không kéo addon nào, và 21 file test của nó chỉ import `node:*` cùng `vitest` (không có `@oh-my-pi`, không có natives — đã quét). Đã chứng minh runner chạy sạch khi addon chưa có: `bun test packages/omptype/test` -> 1139 pass / 52 todo / 0 fail. Cổng thật sự của thay đổi này là CẢ HAI: `bun run check:ts` (kiểu) và `bun test packages/chord/test` (hành vi). Chỉ chạy một trong hai là chưa đủ. *(anchor: repo root)*

### Hợp đồng test

21 file, 35 nhóm `describe()`, 298 khối describe/it/test, tất cả đổi từ vitest sang `bun:test`. Mỗi cái bảo vệ một hợp đồng quan sát được; không cái nào là static echo. Các nhóm gánh trọng lực, theo thứ tự ưu tiên:

1. `test/delta-tracker/tracker.test.ts` (56112 byte, 73 khối) — CRDT. Thứ tự nhân quả, danh tính revision, chia sẻ cấu trúc, và điều gì xảy ra khi hai revision của cùng một trạng thái được theo dõi đồng thời. Đây là file làm cho package đáng chép hơn là viết lại.
2. `test/delta-apply-immutable.test.ts` (9133 byte, 9 khối) — hợp đồng AN TOÀN. Phải chứng minh rằng `apply`/`applyImmutable` trên một đường dẫn chứa `__proto__`, `constructor` hoặc `prototype` THẢ `UnsafePathError` chứ không ghi xuyên qua, và rằng việc ném ra là kết quả quan s được (không phải một op bị bỏ qua lặng lẽ). Một hồi quy biến lần ném thành no-op sẽ làm mọi test khác trong package vẫn xanh.
3. `test/facets.test.ts` (20955 byte, 15 khối) + `test/facet-loader.test.ts` (11801 byte, 10 khối) — máy trạng thái vòng đời. Phải chứng minh `dispose()` chạy các effect theo THỨ TỰ ĐẢO của thứ tự đăng ký, cô lập một effect ném lỗi để các effect còn lại vẫn chạy, và gộp nhiều lỗi thành một. Đây chính là cái neo M1 W2 không xác minh được; sau migration này tham chiếu nằm sẵn trong cây tại `packages/chord/src/facets/host.ts:125-142` và `test/facets.test.ts` là tài liệu chạy được của nó.
4. `test/service-wire.test.ts` (9469 byte, 8 khối) — ranh giới đầu vào độc hại. 11 parser trong `src/services/wire.ts` nhận `unknown`; khẳng định mỗi cái từ chối đầu vào sai hình thức bằng một kết cục cụ thể (undefined hay ném) và một frame đúng hình thức thì đi-về tròn được. Đây là hợp đồng phủ định, thứ AGENTS.md nêu tường minh là được chấp nhận.
5. `test/bundle.test.ts` (10829 byte, 6 khối) — chứng minh bundler vẫn đánh dấu `@oh-my-pi/chord` là external sau khi viết lại scope, và manifest đi-về tròn được. Đây là file không thể xanh trước khi `bun install` thực sự đã tải esbuild.
6. `test/boundary.test.ts` (1504 byte) — duyệt package và khẳng định không specifier `@earendil-works/` nào tới được một entry đã phát hành. Không phải source-grep bị cấm: nó là kiểm tra ranh giới phân giải import, không phải khẳng định về văn bản mã.
7. `test/state-fuzz.test.ts` (4282 byte, 1 khối) — fuzzing. Theo ngoại lệ kết thúc của AGENTS.md, các test này phải khẳng định một đầu ra CÓ BIÊN, một lỗi được nêu ra, hoặc một thay đổi trạng thái. `not.toThrow()` trần không chấp nhận được và phải bị bác trong review.

Quy tắc áp cho cả 21: không `mock.module()` (Bun rò registry module toàn cục giữa các file — oven-sh/bun#12823); không `vi.spyOn` trên namespace module được import dưới dạng giá trị; không assertion source-grep; không `expect(true).toBe(true)`; không assertion “dài hơn” hay “chuỗi không rỗng” khi không có consumer phía sau; dọn dẹp theo từng test bằng `vi.restoreAllMocks()` trong `afterEach` thay vì đột biến `Bun.*`, `process.env` hay `process.platform` ở cả file. Không để lại bất kỳ `vi.` nào mà `bun:test` không có (`vi.waitFor`, `vi.advanceTimersByTime`… — `bun test packages/chord/test` sẽ bắt, nhưng đừi để tới lúc đó mới biết). Không `node:child_process` — dùng `Bun.spawnSync`/`Bun.spawn`; file duy nhất vi phạm ở nguồn là `test/delta-tracker/retention.test.ts`. Bất cứ thứ gì chép từ nguồn mà không đạt các quy tắc này phải được viết lại hoặc xóa, không giữ lại chỉ vì nó xanh ở thượng nguồn.

Danh sách đủ 21 đường dẫn (21 file; `retention.worker.ts` là fixture chứ không phải file test, `helpers.ts` là helper chứ không phải file test — nên chỉ 19 file thật sự là test):

- `packages/chord/test/delta-tracker/tracker.test.ts`
- `packages/chord/test/delta-tracker/retention.test.ts`
- `packages/chord/test/delta-tracker/retention.worker.ts`
- `packages/chord/test/facets.test.ts`
- `packages/chord/test/facet-loader.test.ts`
- `packages/chord/test/services.test.ts`
- `packages/chord/test/service-wire.test.ts`
- `packages/chord/test/delta-apply-immutable.test.ts`
- `packages/chord/test/delta-diff.test.ts`
- `packages/chord/test/delta.test.ts`
- `packages/chord/test/delta-clone.test.ts`
- `packages/chord/test/state.test.ts`
- `packages/chord/test/state-diff.test.ts`
- `packages/chord/test/state-draft.test.ts`
- `packages/chord/test/state-fuzz.test.ts`
- `packages/chord/test/state-value.test.ts`
- `packages/chord/test/context.test.ts`
- `packages/chord/test/json.test.ts`
- `packages/chord/test/bundle.test.ts`
- `packages/chord/test/boundary.test.ts`
- `packages/chord/test/helpers.ts`

### Xác minh

Cổng chính: `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers` — exit 0, ~29s khi rảnh. Nó chạy oxlint + oxfmt --check + tsgo --noEmit trên toàn workspace, nên bắt được cả bốn kiểu viết lại cơ học (tab, hậu tố `.ts`, star barrel, thay `ReturnType<>` và `new Promise`) trong một lượt. Nó KHÔNG chạy 21 file test.

Chạy test KHÔNG bị chặn: `bun --cwd=/Users/tranquangdang21/Projects/ultraworkers test packages/chord/test` chạy được ngay. Addon native của `packages/natives` đã build xong trên máy này (`brew install ninja` + `bun --cwd=packages/natives run build`, exit 0) — và dù chưa build thì chord cũng không kéo addon nào, nên 21 file của nó độc lập với việc đó. Vị trí thành thật: PR phải là typecheck-VERIFIED và test-VERIFIED; chỉ được ghi "chưa xác minh bằng test" nếu `bun test packages/chord/test` thật sự đỏ vì một nguyên nhân cụ thể được nêu tên.

Các kiểm tra không cần `bun test`:

```bash
# binary esbuild phải có sau bước 2 (hiện tại: No such file or directory)
ls -d node_modules/esbuild

# không còn chuỗi thượng nguồn nào trong package
grep -rn 'earendil-works' packages/chord

# không còn ReturnType<> hay cấu trúc promise bị cấm trong src
grep -rn 'ReturnType<\|new Promise' packages/chord/src

# không còn specifier tương đối mang hậu tố .ts — toàn package, KHÔNG chỉ src
grep -rE 'from "\.\.?/[^"]*\.ts"' packages/chord

# dòng Zechner phải nằm ĐẦU, sau đó là hai dòng của omp
head -4 packages/chord/LICENSE

# zero thay đổi dưới packages/coding-agent — bốn vòng rút của W2 phải nguyên vẹn
git diff --stat

# cổng chính
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

`grep -rn 'earendil-works' packages/chord` đúng là một source-grep, nhưng nó chạy như một bước kiểm tra migration thủ công, không commit thành test — kiểm tra ranh giới đã commit là `test/boundary.test.ts`, kiểm tra phân giải import chứ không phải văn bản file.

### Cổng hoàn thành

`bun run check:ts`

Cổng này thực sự đỏ được: spec ghi `gate_can_fail: true`, và nó bắt được phần lớn việc bị bỏ sót (hậu tố `.ts`, chuỗi scope, thụt lề, barrel, ba `ReturnType<>` cùng một cấu trúc promise) — nhưng nó KHÔNG chạy 21 file test, nên nó không đỏ được với việc 73 khối tracker bị cắt bớt hay với hành vi wire đổi âm thầm.

### Rủi ro

MEDIUM, và phần medium tụ lại ở một chỗ rất cụ thể.

Rủi ro cơ học thấp và tự báo lại: sót một hậu tố `.ts` hay sót một chuỗi scope là lỗi biên dịch hoặc một lệnh grep không trả về 0. `bun run check:ts` bắt hết.

Rủi ro thật là việc chép `dispose()` của chord sẽ mở lại câu hỏi drain của M1 W2 với câu trả lời SAI. Ghi chú nhiệm vụ nói W1/W2 đã port thủ công reverse-drain + cô lập lỗi, và rằng việc chép “xóa sạch rủi ro đó” — đúng một nửa, sai một nửa, và nửa sai là nửa nguy hiểm. Đã xác minh: (a) bản ghi `plan_corrections` của chính W2 ghi trích dẫn chord là 'unverifiable — the reference does not exist in this repo' với correction 'Do not attempt to read chord', nên không ai từng đọc mã nguồn; (b) không có gì đặt xuống — `drainDisposers` không tồn tại trong omp và cả bốn vòng rút mục tiêu vẫn đọc là `for (const dispose of this.#X.splice(0)) dispose();`, tức THỨ TỰ THUẬN và không try/catch. Nên bốn vòng rút ấy hiện không phải thiết kế của W2 cũng không phải của chord. Chép chord không sửa chúng, và nó tạo một cái bẫy mới: một khi `packages/chord/src/facets/host.ts:125-142` tồn tại trong cây với hình dạng `throw errors[0]` / `AggregateError`, cách “sửa” trông hợp lý nhất là đấu bốn vòng rút qua đó — và đó sẽ là một HỒI QUY. W2 đã bác hình dạng đó một cách có chủ đích, vì `beginDispose()` chạy từ `session-teardown.ts:70` trước cái try bao quanh `await deps.saveDraft(draftText)`, nên một vòng rút ném lỗi biến một rò rỉ tài nguyên có điều kiện thành một thất bại ghi bản nháp không điều kiện. Giảm thiểu: thay đổi này đụng KHÔNG dòng nào trong `packages/coding-agent`, và bước kiểm tra `git diff --stat` ở mục *Xác minh* làm cho điều đó kiểm chứng được.

Rủi ro bậc hai: esbuild là một dependency runtime mới thật sự trong một repo từng chỉ dựa vào addon native. Nó là MIT, là một package nổi tiếng duy nhất, 0.28.2 thỏa mãn khoảng optional-peer mà vite khai báo nên không có gì khác dịch chuyển, và nó được import bởi đúng một file — nhưng nó có nghĩa `bun test packages/chord/test/bundle.test.ts` không thể xanh trước khi `bun install` thực sự tải nó, và một checkout CI mới mà bỏ qua install sẽ vỡ ở đó chứ không phải ở bước kiểm tra kiểu.

Rủi ro thứ ba: toàn bộ `src/delta/` là 44% phần `src/` và là lý do chép thay vì viết lại, nghĩa là giá trị của migration nằm trọn vẹn ở việc 73 khối tracker có sống sót nguyên vẹn qua phép chuyển vitest -> bun:test hay không. Nếu chúng bị cắt bớt lặng lẽ cho runner nhanh hơn, bản chép đã mất lý do tồn tại.

Ước lượng công sức theo spec: Medium-Large, ~1.5 ngày — ~30 phút cho LICENSE + package.json + tsconfig + cài esbuild; ~2 giờ cho 119 hậu tố `.ts` (84 trong `src/`, 35 trong `test/`) và 24 chuỗi scope; ~1 giờ cho chuyển barrel và giải quyết mơ hồ do export-star; ~30 phút cho 3 `ReturnType<>` và 1 `Promise.withResolvers`; ~2 giờ cho 19 chuyển đổi vitest -> bun:test cộng phần runner làm vỡ; ~1 giờ cho oxfmt/oxlint trên 52 file; ~1 giờ cho hai README và changelog. Phần có thể nở ra đáng kể là file tracker 56112 byte: nếu runner của bun bất đồng với vitest ở một ca lồng sâu hay ca cô lập worker, hãy dành thêm thời gian gỡ lỗi ở đó thay vì nới lỏng khẳng định.

### Cần người quyết

- Câu hỏi drain của M1 W2 cần một người chịu trách nhiệm quyết, và đó KHÔNG phải việc của thay đổi này. Bốn vòng rút hiện có (packages/coding-agent/src/session/agent-session.ts:4983, :5218, packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112, packages/coding-agent/src/extensibility/extensions/runner.ts:1347) nên chuyển sang thiết kế log-rồi-tiếp-tục của W2, để nguyên, hay căn theo thiết kế ném lỗi của chord? Bằng chứng nghiêng về thiết kế của W2 về tính đúng đắn (nó bảo vệ `saveDraft`) và spec này cố ý không chạm vào chúng. Nhưng giờ chord đã có trong cây, sẽ có người muốn "hòa giải" hai bên — và việc hòa giải phải đi theo chiều NGƯỢC lại với trực giác.
- 6 file benchmark (test/delta-traversal.bench.ts cùng 5 file dưới test/delta-benchmark/, ~87 KB) và PLANNING.md (41634 bytes) có nên được chép trong một đợt sau không? Spec này bỏ qua cả 7. Kiểu nhà của omp đặt benchmark trong thư mục `bench/` cấp trên (packages/omptype/bench/), nên port chúng vừa phải di dời vừa phải chuyển từ bench API của vitest sang `bun bench`. Đáng quyết định tường minh thay vì để chúng mục rữa trong cây nguồn.
- TODO_CONTEXT (src/context/index.ts:56) được đặt tên theo một TODO trong cây nguồn và được export. Giữ nguyên tên để bản chép trung thành, hay đổi thành cái gì đó có nghĩa ngay từ bây giờ? Đổi tên là an toàn — không gì ngoài package import nó, và không anh em nào trong sáu package dùng một hằng Context theo tên. Nghiêng về giữ tên, để một diff với pi trong tương lai vẫn sạch.
- test/delta-tracker/retention.worker.ts spawn một Worker. Yêu cầu `declareWorkerHostEntry` / bảng dispatch của AGENTS.md viết cho worker production phải quay lại cli.ts; đây là fixture test. Hãy chốt rằng nhánh fallback trực tiếp `new Worker(new URL(...), {type:'module'})` là chấp nhận được cho một fixture bun:test, hay định tuyến nó qua host entry như code production.
- test/boundary.test.ts duyệt package và khẳng định không specifier scope thượng nguồn nào tới được một entry đã phát hành. Hãy xác nhận nó vượt qua luật "no source-grep". Cách hiểu của spec là nó kiểm tra PHÂN GIẢI import chứ không phải VĂN BẢN file — đó đúng là ranh giới mà luật vạch ra, nhưng nó đủ sát đường để một reviewer nên phán thẳng thay vì thừa kế phán đoán của người trước.
- Có muốn một `JsonValue`/`isJsonValue` dùng chung ở `@oh-my-pi/pi-utils` để thay cho sáu định nghĩa của omp cộng hai cái của chord (va chạm #2 và #3) không? Lần migrate này cố ý không hợp nhất — cả bốn package anh em đều import bản của chord và chúng nhất quán với nhau. Nhưng sự phân kỳ là có thật: packages/coding-agent/src/secrets/obfuscator.ts:72 chấp nhận `| undefined` trong nhánh object, những bản kia thì không, và packages/ai/src/judgment/types.ts:17 dùng biến thể readonly. Nên có người nhận riêng việc dọn dẹp đó.


---


## 2. `protocol` — wire schema, phải đứng trước server và client

**Vị trí trong thứ tự migrate:** thứ hai trong sáu package. Nó là hàng ngang của `packages/wire` chứ không thay nó. Thứ tự bắt buộc là `chord` → `protocol` → `server` → `client` → `telemetry` → `evals`, và mục này phải đứng ngay sau `chord` vì nó import `@oh-my-pi/chord`; không thể là package đầu tiên. Cố làm nó trước sẽ ra một lỗi `check:ts` 24 giây chỉ nói `cannot find module '@oh-my-pi/chord'`.

**Quy mô:** chép nguyên 17 file / 55.559 byte của `packages/protocol` (CBOR codec + length-prefixed framing + typebox envelope schemas + 28 call site `test(`) vào package `packages/protocol` mới. 95% việc là 7 chuỗi scope, 15 hậu tố `.ts`, 30 chỗ `private` → `#private`, và 3 dòng import `vitest` → `bun:test`. Ước lượng LOW — khoảng một phần ba ngày, và nhỏ nhất trong sáu package. Phép cộng của spec: 17 file upstream (3 file trong đó bị bỏ: `vitest.config.ts` 298, `tsconfig.build.json` 209, `tsconfig.test.json` 220 = 727 byte) + 3 file mới tự viết (`LICENSE` 1.069, `tsconfig.json` 74, `tsconfig.publish.json` 339 = 1.482 byte) = 20 hàng trong bảng dưới.

**Cổng đỏ được:** CÓ, một phần. GATE 1 và GATE 1b chạy được ngay hôm nay và có thể đỏ thật. GATE 2 (`bun test packages/protocol`) **không** bị chặn bởi môi trường — package này có 0 import `packages/natives` và repo không có preload trong cấu hình test — nên nó sẽ đỏ thật ngay khi có mặt; hiện chỉ chờ `chord` đáp (bước 9).

### File cần chép

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `LICENSE` | 1069 | chép nguyên văn | File MỚI — không có sẵn ở upstream. Dựng theo đúng hình dạng `packages/wire/LICENSE`: 1 dòng `MIT License`, 1 dòng trống, 3 dòng copyright (`Copyright (c) 2025 Mario Zechner` ở dòng 3, rồi 2 dòng của omp: `Copyright (c) 2025-2026 Can Bölük`, `Copyright (c) 2026 Stencil Labs, Inc.`), 1 dòng trống, rồi phần thân permission + warranty-disclaimer **17 dòng** nguyên văn — tức `LICENSE` của pi từ dòng 5 đến hết (`LICENSE` của pi dài 21 dòng, trong đó 4 dòng đầu là header). File ra 22 dòng (dòng cuối không có newline), 1.143 byte. KHÔNG bỏ dòng copyright của pi: `head -4` phải vẫn ra `Copyright (c) 2025 Mario Zechner` ở dòng 3. |
| `package.json` | 960 | chép rồi sửa | `name` → `@oh-my-pi/pi-protocol`; `"@earendil-works/chord": "^0.87.1"` → `"@oh-my-pi/chord": "catalog:"`; bỏ hoặc giữ dòng dependency `typebox` theo `open_questions[0]`; thay `main`/`types`/`exports` bằng dạng source của omp (`"main": "./src/index.ts"` + wildcard `./*` và `./*.js`); thay 4 script pi bằng khối `check`/`check:types`/`lint`/`fix`/`fmt` của omp (`check:types` là `tsgo -p tsconfig.json --noEmit` — TUYỆT ĐỐI không dùng `tsc`); `repository.url` → `git+https://github.com/can1357/oh-my-pi.git`, `directory: packages/protocol`, author → Stencil Labs, `version` → catalog 18.3.3; thêm `@types/bun: catalog:` vào devDependencies và `engines.bun: >=1.3.14`; đặt `"sideEffects": false`. |
| `README.md` | 3447 | chép rồi sửa | 3 chuỗi scope: dòng 1 `# @earendil-works/pi-protocol` → `# @oh-my-pi/pi-protocol`; dòng 15 (đoạn "through `@earendil-works/chord`") → `@oh-my-pi/chord`; dòng 29 mẫu `from "@earendil-works/pi-protocol"`. Thêm 2 đoạn mới: (a) phân biệt `PROTOCOL_VERSION = 8` với ACP `PROTOCOL_VERSION = 1`; (b) ghi rõ `attestation.ts` là CBOR tự viết duy nhất và cố ý không đi qua encoder này. Sửa luôn claim "protocol còn thử nghiệm" và bỏ hậu tố `.ts` nếu mẫu import có. |
| `CHANGELOG.md` | 976 | chép rồi sửa | THAY, không nối thêm. Giữ tiêu đề `# Changelog` và một mục `## [Unreleased]`, thêm một dòng `Added length-framed CBOR RPC envelopes (@oh-my-pi/pi-protocol).`. Không link issue/PR. |
| `src/cbor/options.ts` | 1722 | chép nguyên văn | Không import, không chuỗi scope, không `private`, không relative import. 4 const export, `CborOptions`, `ResolvedCborOptions`, `CborError` và `resolveOptions` giữ nguyên. KHÔNG nâng `textEncoder`/`textDecoder` ra public. |
| `src/cbor/encoder.ts` | 6712 | chép rồi sửa | 4 `private` → `#` (buffer:13, offset:14, maxByteLength:15, ensureCapacity:68). 1 relative import: dòng 10 `} from "./options.ts";` → `} from "./options";`. Không sửa `writeFloat64` (thiếu byteOffset/byteLength là an toàn) và không sửa `-0` (cố ý encode thành float64) — cả hai bị ghim bởi vector `-0` → `fb8000000000000000`. |
| `src/cbor/decoder.ts` | 5761 | chép rồi sửa | 9 `private` → `#` (bytes:11, offset:12, options:13, readItem:26, readSimple:88, readLength:112, readArgument:119, readByte:145, readBytes:152). 1 relative import: dòng 8 `} from "./options.ts";` → `} from "./options";`. Giữ nhánh `default: throw new CborError("Malformed CBOR major type")` trong `readItem`. |
| `src/cbor/index.ts` | 241 | chép rồi sửa | 3 specifier mất `.ts`: dòng 1 `"./decoder.ts"` → `"./decoder"`, dòng 2 `"./encoder.ts"` → `"./encoder"`, dòng 9 `"./options.ts"` → `"./options"`. GIỮ named re-export (5 specifier) thay vì `export *` — để giữ `MAX_UINT32` và `textEncoder`/`textDecoder` ngoài public surface; nói rõ đây là chệch chủ ý, không phải sơ suất. |
| `src/framing.ts` | 5561 | chép rồi sửa | 10 `private` → `#` (header:45, headerLength:46, maxFrameLength:47, payloadBlocks:48, currentPayloadBlock:49, currentPayloadBlockLength:50, expectedPayloadLength:51, payloadLength:52, state:53, fail:141). `FRAME_HEADER_LENGTH`, `MAX_UINT32`, `PAYLOAD_BLOCK_SIZE`, `DecoderState` ở lại module-private. Giữ các non-null assertion `this.header[0]!` — chúng cần thiết dưới tsconfig của workspace. |
| `src/codec.ts` | 4652 | chép rồi sửa | (a) 7 `private` → `#` (failed:66, frames:67, kind:68, maxFrameLength:69, parse:70; decoder:107, decoder:124); (b) 3 relative import mất `.ts` (dòng 3 `"./cbor/index.ts"`, dòng 4 `"./framing.ts"`, dòng 11 `"./protocol.ts"`); (c) dòng 1 `from "@earendil-works/chord"` → `from "@oh-my-pi/chord"`; (d) dòng 2 `import { Check } from "typebox/value";` — thay theo `open_questions[0]`, rồi 3 call site `Check(X, value)` (dòng 18, 26 và protocol.ts:16) đổi sang idiom `schema(value) instanceof type.errors`. Giữ nguyên latch `failed`, cap 500 ký tự của `boundedErrorMessage`, và các nhánh re-throw `error instanceof ProtocolValidationError`. |
| `src/protocol.ts` | 3831 | chép rồi sửa | (a) dòng 1 `@earendil-works/chord` → `@oh-my-pi/chord`; (b) dòng 2 `import Type, { type Static } from "typebox";` → `from "@oh-my-pi/omptype/typebox"`; (c) dòng 3 `Check` bị xoá hoặc đổi hướng; (d) dòng 16 `return Check(ServerIdSchema, value);` → idiom `instanceof type.errors`; (e) helper `StrictObject` dòng 10 dùng generic `const T extends Parameters<typeof Type.Object>[0]` — đây là construct DUY NHẤT chưa xác minh tương thích với omptype. |
| `src/index.ts` | 483 | chép rồi sửa | 4 specifier mất `.ts` (dòng 1, 2, 3, 22). Danh sách named export từ `./protocol.ts` (dòng 3-22) chép NGUYÊN VĂN — đặc biệt KHÔNG thêm `JsonValue`, `ClientMessageSchema`/`ServerMessageSchema`. |
| `test/cbor/cbor.test.ts` | 6437 | chép rồi sửa | (a) dòng 1 `import { describe, expect, test } from "vitest";` → `from "bun:test"`; (b) dòng 9 `} from "../../src/index.ts";` → `} from "../../src";`; (c) bảng `knownVectors` 34 mục (mảng mở ở dòng 23, 34 entry ở dòng 24-57) và helper `fromHex`/`toHex` chép nguyên văn (là test vector RFC, viết lại sẽ hỏng test). 6 call site `test(` / 20 call site `expect(` — nở thành 82 case lúc chạy — giữ nguyên. |
| `test/framing.test.ts` | 4041 | chép rồi sửa | (a) dòng 1 `from "vitest"` → `from "bun:test"`; (b) dòng 2 `from "../src/index.ts"` → `from "../src"`. 9 test nguyên văn, gồm vòng lặp byte-một-byte và quét mọi điểm cắt. |
| `test/protocol.test.ts` | 10008 | chép rồi sửa | (a) dòng 1 `from "vitest"` → `from "bun:test"`; (b) dòng 20 `} from "../src/index.ts";` → `} from "../src"`. 13 test / 2 describe nguyên văn, giữ fixture `clientHello`/`serverHello` và id v4 `00000000-0000-4000-8000-000000000001`. |
| `tsconfig.json` | 74 | chép nguyên văn | File MỚI, clone từ `packages/wire/tsconfig.json`: `{ "extends": "../tsconfig.workspace.json", "include": ["src", "test"] }`. Thay `tsconfig.build.json` + `tsconfig.test.json` của upstream. |
| `tsconfig.publish.json` | 339 | chép nguyên văn | File MỚI, clone từ `packages/wire/tsconfig.publish.json`. Phát declaration ra `dist/types`. Cần vì build của pi dùng `tsc -p tsconfig.build.json` mà luật omp cấm `tsc`; `tsconfig.json` đủ cho `check:types`. |
| `vitest.config.ts` | 298 | bỏ | DROP — đặt `globals: true` và `environment: "node"`; bun:test không có globals để bật và không có môi trường node riêng. Xoá nó loại bỏ mọi dấu vết vitest. |
| `tsconfig.build.json` | 209 | bỏ | DROP — config build `tsc -p tsconfig.build.json` của pi. Bị thay bằng cặp `tsconfig.json` + `tsconfig.publish.json` của omp, và script duy nhất dùng nó (`"build": "tsc -p ..."`) bị AGENTS.md cấm. |
| `tsconfig.test.json` | 220 | bỏ | DROP — config `noEmit` + `types: ["node", "vitest"]` của pi. Workspace tsconfig đã bao `*/test`; mục `vitest` types biến mất cùng runner. |

### Bề mặt công khai

Cột "neo ở nguồn" ghim dòng ĐỊNH NGHĨA tại `pi-ref` HEAD `d6af72e`; dùng `git grep -nw '<symbol>' -- packages/protocol` để tra lại nếu nguồn đổi.

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa |
| --- | --- | --- | --- | --- |
| `decodeCbor` | function | `packages/protocol/src/cbor/decoder.ts:161` | `packages/protocol/src/cbor/index.ts` | chưa |
| `encodeCbor` | function | `packages/protocol/src/cbor/encoder.ts:211` | `packages/protocol/src/cbor/index.ts` | chưa |
| `CborError` | class | `packages/protocol/src/cbor/options.ts:25` | `packages/protocol/src/cbor/index.ts` | chưa |
| `CborOptions` | interface | `packages/protocol/src/cbor/options.ts:10` | `packages/protocol/src/cbor/index.ts` | chưa |
| `DEFAULT_MAX_CBOR_BYTE_LENGTH` | const | `packages/protocol/src/cbor/options.ts:6` | `packages/protocol/src/cbor/index.ts` | chưa |
| `DEFAULT_MAX_CBOR_CONTAINER_LENGTH` | const | `packages/protocol/src/cbor/options.ts:7` | `packages/protocol/src/cbor/index.ts` | chưa |
| `DEFAULT_MAX_CBOR_DEPTH` | const | `packages/protocol/src/cbor/options.ts:8` | `packages/protocol/src/cbor/index.ts` | chưa |
| `ProtocolValidationError` | class | `packages/protocol/src/codec.ts:13` | `packages/protocol/src/codec.ts` | chưa |
| `parseClientMessage` | function | `packages/protocol/src/codec.ts:20` | `packages/protocol/src/codec.ts` | chưa |
| `parseServerMessage` | function | `packages/protocol/src/codec.ts:27` | `packages/protocol/src/codec.ts` | chưa |
| `encodeClientMessage` | function | `packages/protocol/src/codec.ts:56` | `packages/protocol/src/codec.ts` | chưa |
| `encodeServerMessage` | function | `packages/protocol/src/codec.ts:61` | `packages/protocol/src/codec.ts` | chưa |
| `ClientMessageDecoder` | class | `packages/protocol/src/codec.ts:106` | `packages/protocol/src/codec.ts` | chưa |
| `ServerMessageDecoder` | class | `packages/protocol/src/codec.ts:123` | `packages/protocol/src/codec.ts` | chưa |
| `isSupportedProtocolVersion` | function | `packages/protocol/src/codec.ts:139` | `packages/protocol/src/codec.ts` | chưa |
| `DEFAULT_MAX_FRAME_LENGTH` | const | `packages/protocol/src/framing.ts:6` | `packages/protocol/src/framing.ts` | chưa |
| `FrameDecoderOptions` | interface | `packages/protocol/src/framing.ts:8` | `packages/protocol/src/framing.ts` | chưa |
| `FrameError` | class | `packages/protocol/src/framing.ts:12` | `packages/protocol/src/framing.ts` | chưa |
| `encodeFrame` | function | `packages/protocol/src/framing.ts:28` | `packages/protocol/src/framing.ts` | chưa |
| `FrameDecoder` | class | `packages/protocol/src/framing.ts:44` | `packages/protocol/src/framing.ts` | chưa |
| `PROTOCOL_VERSION` | const | `packages/protocol/src/protocol.ts:5` | `packages/protocol/src/protocol.ts` | chưa |
| `isServerId` | function | `packages/protocol/src/protocol.ts:17` | `packages/protocol/src/protocol.ts` | chưa |
| `ServerId` | type | `packages/protocol/src/protocol.ts:15` | `packages/protocol/src/protocol.ts` | chưa |
| `RpcTarget` | type | `packages/protocol/src/protocol.ts:47` | `packages/protocol/src/protocol.ts` | chưa |
| `SessionTarget` | type | `packages/protocol/src/protocol.ts:45` | `packages/protocol/src/protocol.ts` | chưa |
| `ClientHello` | type | `packages/protocol/src/protocol.ts:33` | `packages/protocol/src/protocol.ts` | chưa |
| `ClientMessage` | type | `packages/protocol/src/protocol.ts:63` | `packages/protocol/src/protocol.ts` | chưa |
| `RequestEnvelope` | type | `packages/protocol/src/protocol.ts:60` | `packages/protocol/src/protocol.ts` | chưa |
| `CancelEnvelope` | type | `packages/protocol/src/protocol.ts:61` | `packages/protocol/src/protocol.ts` | chưa |
| `ProtocolError` | type | `packages/protocol/src/protocol.ts:26` | `packages/protocol/src/protocol.ts` | chưa |
| `ProtocolErrorCode` | type | `packages/protocol/src/protocol.ts:25` | `packages/protocol/src/protocol.ts` | chưa |
| `ServerHello` | type | `packages/protocol/src/protocol.ts:105` | `packages/protocol/src/protocol.ts` | chưa |
| `ServerHelloError` | type | `packages/protocol/src/protocol.ts:106` | `packages/protocol/src/protocol.ts` | chưa |
| `ResponseEnvelope` | type | `packages/protocol/src/protocol.ts:107` | `packages/protocol/src/protocol.ts` | chưa |
| `ServiceEventEnvelope` | type | `packages/protocol/src/protocol.ts:108` | `packages/protocol/src/protocol.ts` | chưa |
| `AttachmentEnvelope` | type | `packages/protocol/src/protocol.ts:109` | `packages/protocol/src/protocol.ts` | chưa |
| `ServerMessage` | type | `packages/protocol/src/protocol.ts:110` | `packages/protocol/src/protocol.ts` | chưa |
| `ClientMessageSchema` | const (KHÔNG re-export) | `packages/protocol/src/protocol.ts:62` | nội bộ `protocol.ts` — không đưa ra barrel của omp | chưa |
| `ServerMessageSchema` | const (KHÔNG re-export) | `packages/protocol/src/protocol.ts:98` | nội bộ `protocol.ts` — không đưa ra barrel của omp | chưa |
| `OpaqueJsonValueSchema` / `ServerTargetSchema` / anh em | const (module-private) | `packages/protocol/src/protocol.ts:8, 36` | module-private trong `src/protocol.ts` | chưa |
| `textEncoder` / `textDecoder` | const (module-private) | `packages/protocol/src/cbor/options.ts:32-33` | module-private trong `src/cbor/options.ts` | chưa |
| `UINT32_BASE` / `MAX_UINT32` / `MAX_CONFIGURED_DEPTH` / `CborWriter` / `CborReader` / `ValidatedMessageDecoder` / `StrictObject` | const/interface/class/function (module-private) | `packages/protocol/src/cbor/options.ts:1-3`, `cbor/encoder.ts:12`, `cbor/decoder.ts:10`, `codec.ts:65`, `protocol.ts:9` | module-private trong từng file | chưa |
| `FRAME_HEADER_LENGTH` / `PAYLOAD_BLOCK_SIZE` / `DecoderState` / `resolveMaxFrameLength` / `boundedErrorMessage` / `encodeProtocolMessage` / `isPlainObject` | const/type/function (module-private) | `packages/protocol/src/framing.ts:1,3,19,41`; `codec.ts:34,39`; `cbor/encoder.ts:102` | module-private | chưa |

Ghi chú bắt buộc cho bề mặt công khai:

- `ClientMessageSchema` và `ServerMessageSchema` là **cố ý bỏ** khỏi barrel. `src/index.ts` re-export từ `./protocol.ts` bằng danh sách named tường minh vốn đã BỎ qua cả hai; chỉ hàm parse/encode/decoder đi qua biên. PHẢI giữ: đây là runtime value do schema engine sinh ra, nếu thành public thì việc đổi engine ở bước 4 thành API break thay vì private rewrite.
- `textDecoder` là `new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })`. `fatal: true` mang ý nghĩa: nó là thứ khiến `decodeCbor` từ chối UTF-8 hỏng thay vì thay bằng U+FFFD, và đó cũng là lý do `attestation.ts` KHÔNG được định tuyến qua codec này.
- `MAX_UINT32 = 0xffff_ffff` được khai báo HAI lần trong package (`cbor/options.ts:2` có export, `framing.ts:2` không export). Bản trùng chỉ an toàn vì bản của framing không bao giờ tới barrel. Giữ cả hai private; đừng "DRY" chúng thành một export, vì sẽ mới publish `MAX_UINT32` qua `export * from "./framing.ts"`.
- `ClientMessageDecoder`/`ServerMessageDecoder` LATCH sau lần lỗi đầu: mọi `push`/`end` sau đó rethrow `<kind> message decoder has failed` mà không chạm vào stream. Đây là quyết định protocol có chủ đích (một stream length-prefixed không thể resync) và phải được giữ.
- `ProtocolValidationError` là loại lỗi DUY NHẤT đi qua public API — `FrameError` và `CborError` luôn được nó bọc lại.

### Dependency mới

| dependency | phiên bản | đã có ở omp | vì sao |
| --- | --- | --- | --- |
| `@oh-my-pi/chord` | catalog (18.3.3, workspace) | chưa | `protocol.ts:1` import `type JsonValue`, `codec.ts:1` import `isJsonValue`. Đó là TOÀN BỘ coupling — 2 symbol, 2 dòng import. Cả hai nằm upstream ở `chord/src/types.ts:21` (type) và `chord/src/json.ts:74` (predicate). chord là LEAF: npm dependency duy nhất là esbuild, và 2 symbol này không chạm tới nó. |
| `typebox@1.3.27` | 1.3.27 (ghim chính xác, upstream không dùng caret) | chưa | Đây là quyết định duy nhất chặn package, và câu trả lời nằm ở `open_questions[0]`. upstream ghim chính xác 1.3.27 (bản mới nhất là 1.3.34). MIT (đã xác minh qua `npm view typebox@1.3.27 license` → MIT). |
| `@oh-my-pi/omptype` | catalog (18.3.3, workspace) — THAY typebox theo `open_questions[0]` | ĐÃ CÓ | omp đã có facade TypeBox-compatible tại `@oh-my-pi/omptype/typebox`, dùng trong production bởi `packages/coding-agent/src/extensibility/legacy-typebox.ts` và 4 file test. Đo được: nó export `Type.{String,Number,Integer,Boolean,Null,Any,Unknown,Never,Literal,Union,Intersect,Enum,Array,Tuple,Object,Record,Optional,Nullable,Readonly,Partial,Required,Pick,Omit,Composite,Unsafe}` và `Static` — tức mọi builder `protocol.ts` gọi, cộng `additionalProperties:false` (typebox.ts:426 map thành `def["+"] = "reject"`), `minLength` (:207), `pattern` (:209-216), `minimum` (:121-141). Thiếu duy nhất là `Check`. |

KHÔNG thêm dependency nào khác. Đặc biệt:

- `typebox` chỉ được thêm vào `dependencies` khi `open_questions[0]` giữ lại typebox. Đường được khuyến nghị là port sang `@oh-my-pi/omptype/typebox` và KHÔNG thêm `typebox`. Lý do chống lại `typebox`: một repo có hai schema engine là bug dù cả hai đều chạy.
- Các quét `private` → `#private` là thứ duy nhất trong nhóm sweep của AGENTS.md có việc ở đây. Đo được: nguồn upstream có **0** `any`, **0** `ReturnType<>`, **0** `await import(`, **0** `console.*`, **0** import `node:*`, **0** `new Promise(`. Nghĩa là namespace import cho `node:fs`/`node:path`/`node:os`, `Promise.withResolvers()` và logger-thay-console đều là no-op ở package này.

### Va chạm với thứ omp đã có

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| `PROTOCOL_VERSION` — cùng tên export, KHÁC nghĩa và khác giá trị | `packages/protocol/src/protocol.ts:5` — `export const PROTOCOL_VERSION = 8 as const` | `packages/utils/src/acp/protocol.ts:13` — `export const PROTOCOL_VERSION = 1` (ACP, dùng ở `packages/coding-agent/src/modes/acp/acp-agent.ts:30` và `:654`) | **GIỮ CẢ HAI, không đổi tên.** `packages/utils/src/index.ts` KHÔNG re-export `./acp` — `acp.ts` là sub-barrel riêng chỉ gọi được qua `@oh-my-pi/pi-utils/acp`, và `grep -rlw 'PROTOCOL_VERSION' packages` ra đúng 2 file (`packages/utils/src/acp/protocol.ts:13` và `packages/coding-agent/src/modes/acp/acp-agent.ts`), không file nào import nó từ root barrel. Cần cờ `-w`: không có nó thì lệnh ra 9 file, vì `MCP_PROTOCOL_VERSION`/`WARP_CLI_AGENT_PROTOCOL_VERSION` cũng khớp. Nên hai hằng không bao giờ star-merge vào cùng namespace. Ghi bộ ba vào README: sau khi đáp, repo có BA hằng version — `PROTOCOL_VERSION = 8` (CBOR RPC), `PROTOCOL_VERSION = 1` (ACP, dưới `/acp`), `COLLAB_PROTO = 3` (`packages/wire/src/index.ts:397`) — cộng `STREAM_PROTO = 1` (`packages/wire/src/stream.ts:20`). Đổi tên là phá vỡ một bề mặt ACP bên ngoài, và tên của pi-protocol là tên upstream đã chép. |
| `encodeFrame` — cùng tên, chữ ký không tương thích, 3 định nghĩa trong cây | `packages/protocol/src/framing.ts:29` — `encodeFrame(payload: Uint8Array): Uint8Array`, prefix dài 4 byte BE | `packages/ai/test/issue-3124-repro.test.ts:49`, `packages/ai/test/aws-eventstream.test.ts:27`, `packages/ai/test/bedrock-stream-exception-status.test.ts:55` — đều `function encodeFrame(headers: Record<string, string>, payload: Uint8Array): Uint8Array`, file-local, module-private, framing AWS event-stream | **GIỮ CẢ HAI, không đổi tên.** Cả ba là helper test module-private — không cái nào export, không cái nào vào barrel, không thể đụng nhau lúc link. Cạm bẫy là tương lai: nếu star export của pi-protocol từng được re-export từ pi-ai hay một test-utils barrel chung, `export * from` sẽ âm thầm che mất một cái. Giảm thiểu bằng một ghi chú trong README tên cả ba, không phải đổi tên. |
| `parseServerMessage` — cùng token, dùng như CHUỖI chứ không phải symbol | `packages/protocol/src/codec.ts:25` — `export function parseServerMessage(value: unknown): ServerMessage` | `packages/ai/src/providers/cursor.ts:889` — `log("error", "parseServerMessage", { error: String(e) })`, một nhãn log | **KHÔNG va chạm, không có gì để sửa.** Đó là string literal trong một provider không liên quan. Chỉ nói trong mô tả PR để người review chạy symbol grep thô không báo động giả. Không đổi nhãn log: nhãn log là bề mặt vận hành (grep được trong `~/.omp/logs`). |
| `JsonValue` — sáu định nghĩa trong cây với sáu hình dạng khác nhau | `packages/protocol/src/protocol.ts:1` — `import type { JsonValue } from "@earendil-works/chord"` (`chord/src/types.ts:21`: `null \| boolean \| number \| string \| JsonValue[] \| { [key: string]: JsonValue }` — CHẶT, không undefined) | `packages/ai/src/judgment/types.ts:17` (bản `readonly`), `packages/catalog/src/discovery/protobuf.ts:11`, `packages/mnemopi/src/mcp-tools.ts:9`, `packages/mnemopi/src/types.ts:2`, `packages/mnemopi/src/core/beam/types.ts:4`, `packages/coding-agent/src/secrets/obfuscator.ts:72` (duy nhất cho phép `JsonValue \| undefined` theo key) | **GIỮ BẢN CỦA CHORD, và không re-export gì cả.** (a) `protocol.ts` giữ `import type { JsonValue } from "@oh-my-pi/chord"` — KHÔNG định nghĩa lại type cục bộ, vì làm vậy sẽ khiến `OpaqueJsonValueSchema` là hợp đồng khác với cái `isJsonValue` cưỡng chế; (b) `JsonValue` KHÔNG được xuất hiện trong danh sách named export của `src/index.ts`, nên không bao giờ star-merge với bản của pi-ai hay mnemopi. Bất đối xứng với `obfuscator.ts`: hình dạng cho phép `undefined` của nó ĐÚNG cho bộ che bí mật và SAI cho wire payload. |
| CBOR writer tự viết bằng tay trong omp — bản trùng byte-level thật sự duy nhất trong cây | `packages/protocol/src/cbor/encoder.ts` (216 dòng) — writer CBOR definite-length đầy đủ | `packages/coding-agent/src/live/attestation.ts:11-37` — `cborHeader`/`cborUnsigned`/`cborText`/`cborMap` dựng tay cùng major type (0 unsigned, 3 text, 4 byte string, 5 map, 7 float64 qua tiền tố `0xfb` thô) cho ChatGPT DeviceCheck attestation | **CỐ Ý KHÔNG GỘP**, đây là phát hiện âm mang ý nghĩa nặng nhất. Ba lý do đo được: (1) `attestation.ts` dài 91 dòng và phần CBOR khoảng 30 dòng; định tuyến nó qua codec chung là kéo 216 dòng dependency để thay 30, và `cborHeader(64, ...)` cần byte string mà attestation dựng nhưng API encoder chung sẽ đòi diễn đạt lại. (2) Không test được ở đây: `generateCodexAttestation` early-return trừ khi `process.platform === "darwin" && process.arch === "arm64"` và bọc một native call — đúng cái coverage GATE 2 không cung cấp. Refactor mà không tập nào chạy được là refactor không có lưới an toàn. (3) Codec chung và attestation decode bằng text decoder KHÁC NHAU — `fatal: true, ignoreBOM: true` (`cbor/options.ts:29`) so với mặc định non-fatal của Buffer — nên thay một bằng bên kia là thay đổi hành vi thật của một OAuth attestation. HÀNH ĐỘNG: ghi vào `packages/protocol/README.md` rằng đây là CBOR tự viết tay duy nhất trong omp và encoder chung là câu trả lời NẾU sau này ai đó muốn dùng. |
| `FrameDecoder` không có đối chiếu, nhưng idiom framing của omp là hai hình dạng khác | `packages/protocol/src/framing.ts:44` — splitter frame nhị phân length-prefixed tăng dần | `packages/coding-agent/src/tiny/jsonl-socket.ts:9-20` (`LineParser`, JSON phân tách dòng trên `node:net`, 49 dòng) và `packages/coding-agent/src/collab/protocol.ts:105-119` (header 4 byte BE peerId + payload bọc AES-GCM, đọc bằng `DataView.getUint32(0, false)`) | **KHÔNG GỘP, và nói rõ trong README** để đóng câu hỏi. Header của collab tại `collab/protocol.ts:113` đúng là dùng 4 byte BE uint32 — cùng hình dạng với frame header của pi-protocol — nhưng nó là TIỀN TỐ PEER-ID cố định 4 byte, không phải độ dài payload, và là một `subarray` một lần không trạng thái trên WebSocket message hoàn chỉnh, không phải splitter tăng dần. Gộp vào `FrameDecoder` sẽ đổi nghĩa của các byte. Framing newline của jsonl-socket là protocol khác hẳn. |
| Từ khoá `private` trên 30 thành viên — vi phạm AGENTS.md, và khác biệt ngữ nghĩa THẬT ở một chỗ | 30 khai báo: `cbor/decoder.ts:11,12,13,26,88,112,119,145,152` (9); `cbor/encoder.ts:13,14,15,68` (4); `codec.ts:66,67,68,69,70,107,124` (7); `framing.ts:45-53,141` (10) | AGENTS.md "Class privacy": trường ES `#private`, không từ khoá `private`/`protected`/`public` trừ trên constructor parameter property | **VIẾT LẠI cả 30.** Phần lớn là thay `private ` → `#` máy móc, nhưng một thành viên cần quyết định chứ không phải thay thế: `FrameDecoder.fail` (`framing.ts:141`) là METHOD `private` và phải thành `#fail`; nó chỉ được gọi từ `push` và `end` nên không đổi caller nào. `CborWriter.buffer`/`offset` chỉ đọc/ghi trong class, và `ensureCapacity` (`encoder.ts:68`) gán lại `this.buffer` — với `#buffer` vẫn hợp lệ. Trong `codec.ts`, `ValidatedMessageDecoder` tự nó là module-private và 5 thành viên cùng 2 trường `decoder` trên `Client`/`ServerMessageDecoder` đều chuyển đổi. Chạy toàn bộ dưới `bun run check:ts` — TypeScript bắt mọi chỗ chuyển đổi sót, nên lần quét này kiểm chứng được chứ không phải đánh giá bằng mắt. |
| Relative import có hậu tố `.ts` — phong cách pi so với phong cách omp | 15 dòng relative import/export, tất cả đều mang `.ts` tường minh: `cbor/decoder.ts:8`, `cbor/encoder.ts:10`, `cbor/index.ts:1,2,9`, `codec.ts:3,4,11`, `index.ts:1,2,3,22`, `test/cbor/cbor.test.ts:9`, `test/framing.test.ts:2`, `test/protocol.test.ts:20` | 0 lần trong `packages/wire/src` và `packages/omptype/src`; 2 lần trong TOÀN BỘ `packages/*/src`, cả hai đều là asset import của file `.d.ts` (`packages/coding-agent/src/tools/browser/prelude-definition.ts:5` và `.../computer/prelude-definition.ts:3`). Đo được: `grep -rho 'from "\.[^"]*\.ts"' packages/*/src` = 2. | **BỎ `.ts` ở cả 15.** Không chỉ để đẹp: có `.ts` thì các file chép sẽ là module duy nhất trong cây dùng extension tường minh, còn oxfmt/oxlint/tsgo đều chạy với moduleResolution của omp. Rẻ để kiểm: sau lần quét, `grep -rn 'from "\.[^"]*\.ts"' packages/protocol/src` phải trả 0 (đếm được: cây đích có 12 relative import hợp lệ, nên đừng dùng `from "\./` — lệnh đó khớp cả import đã bỏ hậu tố, và luôn ra 5 dòng), và 2 asset import `.d.ts` sẵn có ở nơi khác không bị ảnh hưởng vì chúng nhắm file khai báo, không phải module. |
| Tên loại lỗi: một TYPE tên `ProtocolError` nằm cạnh một CLASS tên `ProtocolValidationError` | `packages/protocol/src/protocol.ts:20` (`export type ProtocolError` — một hình dữ liệu) so với `packages/protocol/src/codec.ts:11` (`export class ProtocolValidationError`), cộng `FrameError` (`framing.ts:12`) và `CborError` (`cbor/options.ts:24`) | grep toàn packages: 0 lần `ProtocolError` / `ProtocolValidationError` / `FrameError` / `CborError` | **KHÔNG đổi tên, giữ nguyên cả hai tên.** Phân biệt này là hợp đồng lỗi cốt lõi của protocol và rất dễ làm sai: `ProtocolError` là thứ MỘT peer TỪ XA gửi trong response envelope và là một giá trị đi qua wire; `ProtocolValidationError` là thứ thư viện NÀY ném cục bộ và là một class. Gộp chúng sẽ khiến không thể viết handler bắt lỗi decode cục bộ mà không nuốt luôn thông báo lỗi từ xa. Không có va chạm trong cây. Thêm một dòng vào README nói cái nào là cái nào, vì tên gần giống sẽ đọc ra như lỗi đánh vần. |
| `vitest` — 3 dòng import, 4 describe, 28 call site `test(` | `test/cbor/cbor.test.ts:1`, `test/framing.test.ts:1`, `test/protocol.test.ts:1` — đều `import { describe, expect, test } from "vitest"` | 2697 file dưới `packages/` import từ `bun:test`. Script `test` gốc là `bun scripts/ci-test-ts.ts local`. Không có vitest ở omp. | **VIẾT LẠI 3 dòng import thành `from "bun:test"` và XOÁ `vitest.config.ts`** (298 byte, `globals: true`, `environment: "node"`). Config bị xoá không phải mất mát: `globals: true` là thứ duy nhất test dùng từ nó, và dưới bun:test import vẫn tường minh. `environment: "node"` cũng không phải mất mát — Bun không có môi trường jsdom/happy-dom để khác. Rồi xoá `tsconfig.build.json` và `tsconfig.test.json`, dùng `{ "extends": "../tsconfig.workspace.json", "include": ["src", "test"] }` cộng một `tsconfig.publish.json` clone từ `packages/wire/tsconfig.publish.json`. KHÔNG port test sang shim `expect` của pi-ai — các assertion ở đây là so sánh byte và chuỗi chính xác (`toEqual(new Uint8Array([0,0,0,3,0xaa,0xbb,0xcc]))`) và matcher native của Bun xử lý trực tiếp. |

Ngoài ra, va chạm với `packages/wire` — KHÔNG phải là rủi ro, nhưng đáng nói để đóng câu hỏi: hai package không chồng lấn. `pi-wire` là các hình dữ liệu JSON không phụ thuộc gì cộng hằng link/relay cho collab relay; nó tường minh "không encode, decode, validate, encrypt hay route frame". `pi-protocol` là codec CBOR length-framed có validate envelope chặt, viết cho một RPC server trên Unix socket. Khác transport, khác encoding, khác vòng đời, khác người dùng. `COLLAB_PROTO = 3` và `STREAM_PROTO = 1` của `pi-wire` là hằng version cùng họ số với `PROTOCOL_VERSION = 8` nhưng điều phành protocol không liên quan. KHÔNG GỘP, và không gì trong omp phải migrate: `pi-protocol` là bổ sung thuần. Mối quan hệ thật duy nhất là nguy cơ đặt tên — một repo có cả `pi-wire` và `pi-protocol` mời câu hỏi "import cái nào?" — và câu trả lời thuộc về cả hai README, không phải một refactor.

### Các bước

1. **SCAFFOLD thư mục package** (`packages/protocol/` — chưa tồn tại, 0 trong 17 file đáp ở bước này). `mkdir -p packages/protocol/src/cbor packages/protocol/test/cbor`. KHÔNG `bun install` và KHÔNG đăng ký workspace ở đây — bước 3 và bước 10 lo việc đó. Lý do: glob của workspace là `packages/*`, nên ngay khoảnh khắc `package.json` tồn tại bun sẽ thử resolve dependency của nó, mà khoảnh khắc đó hai import trong `protocol.ts`/`codec.ts` vẫn là `@earendil-works/*`. Đăng ký sớm tạo ra lỗi resolution che mất việc thật.
2. **PHÁP LÝ, VÀ NÓ ĐẾN TRƯỚC** (`packages/protocol/LICENSE`). Tạo file LICENSE: lấy notice của pi từ `/Users/tranquangdang21/Projects/pi-ref/LICENSE` (1.069 byte) — 1 dòng `MIT License`, 1 dòng trống, rồi 3 dòng copyright liền nhau (`Copyright (c) 2025 Mario Zechner` ở dòng 3, `Copyright (c) 2025-2026 Can Bölük`, `Copyright (c) 2026 Stencil Labs, Inc.`), rồi 1 dòng trống, rồi thân permission + warranty-disclaimer **17 dòng** sao chép từng byte (tức `LICENSE` của pi từ dòng 5 đến hết — file đó dài 21 dòng, trong đó 4 dòng đầu là header). File ra 22 dòng, đúng hình dạng `packages/wire/LICENSE`. KHÔNG bỏ dòng copyright của pi. Đây là toàn bộ nghĩa vụ MIT và nó được thoả bằng đúng một bước này; phần attribution phải là một FILE trong package, không phải phép lịch sự trong mô tả PR.
3. **CHÉP 5 file không phụ thuộc** (`packages/protocol/src/{cbor/options.ts,cbor/encoder.ts,cbor/decoder.ts,cbor/index.ts,framing.ts}`), từ dưới lên để không module nào trỏ vào module chưa có: options.ts → encoder.ts → decoder.ts → cbor/index.ts → framing.ts. Rồi áp dụng, theo thứ tự: (i) bỏ hậu tố `.ts` khỏi 4 relative specifier ở `decoder.ts:8`, `encoder.ts:10`, `cbor/index.ts:1,2,9`; (ii) chuyển 23 thành viên `private` trong năm file này thành `#` (decoder 9, encoder 4, framing 10). `options.ts` không cần sửa gì. Chạy `bun run fmt` trên package.
4. **CHÉP `protocol.ts` và áp dụng QUYẾT ĐỊNH SCHEMA ENGINE** (`packages/protocol/src/protocol.ts:1-3, :16`) — đây là file duy nhất nơi câu trả lời không phải thay thế máy móc, và vì thế nó tách riêng. Đường khuyến nghị: dòng 1 `@earendil-works/chord` → `@oh-my-pi/chord`; dòng 2 `from "typebox"` → `from "@oh-my-pi/omptype/typebox"`; dòng 3 `import { Check } from "typebox/value";` bị XOÁ; dòng 16 `return Check(ServerIdSchema, value);` → `return !isSchemaError(ServerIdSchema(value));` với một helper module-local 3 dòng (`import { type } from "@oh-my-pi/omptype"` + `const isSchemaError = (r: unknown): r is type.errors => r instanceof type.errors`). Đường dự phòng (nếu chủ sở hữu giữ typebox): import `Check` từ `typebox/value` không đổi và thêm `"typebox": "1.3.27"` vào dependencies. Rồi `bun run check:ts` — generic `StrictObject` ở dòng 10 là construct DUY NHẤT chưa xác minh tương thích với chữ ký `Type.Object` của omptype, và đây là nơi nó hoặc typecheck hoặc không. Nếu không, lùi về typebox và ghi lại lý do; đừng bóp méo schema.
5. **CHÉP `codec.ts` và áp dụng 4 sửa đổi** (`packages/protocol/src/codec.ts:1-4, :11, :66-70, :107, :124`): (i) dòng 1 `@earendil-works/chord` → `@oh-my-pi/chord`; (ii) dòng 3, 4, 11 mất hậu tố `.ts`; (iii) 2 call site `Check` ở dòng 18 và 26 đổi thành kiểm tra `instanceof type.errors` của omptype ở bước 4 (cả hai đều là `if (!Check(Schema, value) || !isJsonValue(value))` — bản viết lại PHẢI giữ `||`, vì `isJsonValue` mới là thứ từ chối payload opaque không phải JSON và là chốt chặn payload thật của package, do omptype hạ `Type.Unsafe` xuống `type.unknown` một cách có chủ đích); (iv) 7 thành viên `private` → `#`. Giữ nguyên: latch `failed` trong `ValidatedMessageDecoder` và thông điệp rethrow của nó, cap 500 ký tự của `boundedErrorMessage`, và các nhánh re-throw `error instanceof ProtocolValidationError` giữ lỗi validate cục bộ không bị bọc.
6. **CHÉP `index.ts`** (`packages/protocol/src/index.ts:1-22`). Bỏ `.ts` ở 4 specifier (dòng 1, 2, 3, 22). Chép NGUYÊN VĂN danh sách named export ở dòng 3-22 — không nới thành star, không thêm `JsonValue`, không thêm `ClientMessageSchema`/`ServerMessageSchema`. Chính cái thiếu sót đó giữ cho việc đổi engine ở bước 4 là private rewrite chứ không phải breaking API change.
7. **CHÉP 3 file test** (`packages/protocol/test/{cbor/cbor.test.ts,framing.test.ts,protocol.test.ts}`). Đúng 5 sửa đổi trên toàn bộ: 3 `from "vitest"` → `from "bun:test"` (`cbor.test.ts:1`, `framing.test.ts:1`, `protocol.test.ts:1`) và 3 bóc hậu tố `.ts` (`cbor.test.ts:9` `"../../src/index.ts"` → `"../../src"`, `protocol.test.ts:20` `"../src/index.ts"` → `"../src"`, `framing.test.ts:2` nữa). KHÔNG SỬA GÌ KHÁC. Toàn bộ 28 call site `test(` / 75 call site `expect(` (133 case lúc chạy — 12 `test.each` nở ra), bảng CBOR vector 34 mục, vòng lặp byte-một-byte và quét mọi điểm cắt chép nguyên văn — chúng là hợp đồng, trừ ngoại lệ `not.toThrow()` đã ghi ở mục Hợp đồng test. `test()` và `describe()` là bản địa của bun:test nên không call site nào cần viết lại. Xác nhận bằng `grep -rc 'vitest' packages/protocol` → 0.
8. **SOẠN `package.json` cho omp** (`packages/protocol/package.json`): name `@oh-my-pi/pi-protocol`, version `18.3.3` khớp catalog, `main`/`types` → `./src/index.ts` với wildcard exports `./*` và `./*.js` mà mọi package omp đều mang, dependencies `@oh-my-pi/chord: catalog:` (cộng `typebox: 1.3.27` chỉ trên đường dự phòng), devDependencies `@types/bun: catalog:`, khối check 5 script của omp với `check:types` = `tsgo -p tsconfig.json --noEmit` (TUYỆT ĐỐI không dùng `tsc`), `engines.bun: >=1.3.14`, `sideEffects: false`, files `["src", "README.md", "CHANGELOG.md"]`, và metadata repository/author/bugs của omp. Rồi viết `tsconfig.json` và `tsconfig.publish.json` bằng cách clone của `packages/wire`. Chưa chạy `bun install`.
9. **ĐĂNG KÝ package** (root `package.json`, `workspaces.catalog`). Thêm `"@oh-my-pi/chord": "18.3.3"` và `"@oh-my-pi/pi-protocol": "18.3.3"` cạnh 11 mục `@oh-my-pi/*` hiện có — glob workspace `packages/*` đã tự nhặt thư mục, nên chỉ thiếu khoá catalog. LƯU Ý: nếu chord chưa đáp (và nó phải đáp trước), `@oh-my-pi/chord: catalog:` không resolve và `bun install` sẽ fail. Khi đó chỉ dựng package với shim `chord` cục bộ tạm nếu chủ sở hữu đã cho phép; câu trả lời ưu tiên là migrate chord trước. Rồi `bun install` và commit thay đổi `bun.lock` kèm theo source.
10. **TÀI LIỆU** (`packages/protocol/{README.md,CHANGELOG.md}`). README: 3 thay thế scope, rồi THÊM 2 đoạn mà spec này sinh ra và upstream không có bản tương đương — (a) `PROTOCOL_VERSION = 8` ở đây so với ACP `PROTOCOL_VERSION = 1` (dưới `@oh-my-pi/pi-utils/acp`) so với `COLLAB_PROTO = 3` (pi-wire) so với `STREAM_PROTO = 1`, và (b) `packages/coding-agent/src/live/attestation.ts` giữ CBOR tự viết tay duy nhất trong omp và CỐ Ý không đi qua encoder này (với ba lý do: 30 dòng so với cây 216 dòng, bị platform-gate và không test được, text decoder fatal so với non-fatal). Cũng nói rõ `ProtocolError` (một giá trị trên wire) và `ProtocolValidationError` (một class cục bộ) là hai thứ khác nhau dù tên gần giống. CHANGELOG: thay lịch sử release của pi bằng một `## [Unreleased]` và một dòng Added.
11. **GATE 1 — `bun run check:ts`.** Chạy GATE 1 và dán output vào PR. Đây là cổng thật sự bắn ngay hôm nay: nó chạy oxlint + oxfmt trên package mới và `tsgo --noEmit` trên toàn bộ. Baseline đo trên máy này: exit 0, 24,2s wall (79,3s user, 346% cpu), 5.445 file được format, 16 package typecheck. Mong package mới xuất hiện dưới dạng `@oh-my-pi/pi-protocol:check:types` trong danh sách. Ba khẳng định phải đúng: 0 error từ oxlint (chạy bằng `./node_modules/.bin/oxlint --config .oxlintrc.json` — bản ghim của omp; warning thì có đúng 1 cái cố ý, xem khẳng định #6), không có diff oxfmt, và `grep -rc '@earendil-works/' packages/protocol` == 0.
12. **GATE 2 — `bun test packages/protocol`** (BỊ CHẶN VÌ CHORD CHƯA ĐÁP — KHÔNG PHẢI VÌ MÔI TRƯỜNG). `bun test packages/protocol` chạy được ngay khi `@oh-my-pi/chord` có mặt ở bước 9. Nó **không** bị chặn bởi `packages/natives`: package này có 0 import `natives` (`git grep -n 'natives' -- packages/protocol` ở pi-ref rỗng, kể cả trong test) và repo không có preload trong cấu hình test. Đã chạy thật trên bản chép (chép 3 file test + bóc hậu tố `.ts` + cài `typebox@1.3.27` thật + shim `isJsonValue` từ source chord thật, trong thư mục tạo mới): **133 pass / 0 fail / 386 `expect()` calls**, trong môi trường chưa build `natives`. Không cần `brew install ninja`, không cần build `natives`. Nút thắt thật là bước 9 (đăng ký workspace + `bun install` sau khi chord đáp). Mong **133 pass: 82 CBOR, 15 framing, 36 protocol** — 28 là số call site `test(` tĩnh, 133 là số case thật (`test.each` nở 12 lần). Đừng "sửa" một test fail bằng cách sửa test — nếu một test fail thì bản chép đã phân kỳ, và cách sửa nằm ở bước 3/4/5/7, không nằm trong assertion.

### Hợp đồng test

28 call site `test(` / 75 call site `expect(` (133 case lúc chạy / 386 `expect()` calls), chép nguyên văn từ upstream. Chúng gần như đã đúng khuôn dưới quy tắc test của AGENTS.md, với MỘT ngoại lệ đã biết: `test/framing.test.ts:73` là `expect(() => decoder.end()).not.toThrow()` trần — thuộc loại AGENTS.md cấm ("No placeholder tests, tautologies, or "the code ran" assertions (`expect(true).toBe(true)`, bare `not.toThrow()`, …)"). Giữ nguyên vì đó là hợp đồng âm thật (`end()` trên stream rỗng không ném) và nó đi cùng một khẳng định dương ngay dòng trên — nhưng ghi tên nó ra đây để reviewer không phải tự săn. Ba file test:

- `packages/protocol/test/framing.test.ts` — 9 call site `test(` (15 case lúc chạy), 1 describe `binary framing`.
- `packages/protocol/test/protocol.test.ts` — 13 call site `test(` (36 case lúc chạy), 2 describe.
- `packages/protocol/test/cbor/cbor.test.ts` — 6 call site `test(` (82 case lúc chạy), 1 describe `CBOR codec`, dựng trên bảng `knownVectors` 34 mục gồm byte string RFC 8949 (`f6`, `1b001fffffffffffff`, `fb8000000000000000` cho -0, `4401020304`, `a26161016162820203`, và text surrogate đơn so với ghép cặp).

`test/framing.test.ts` bảo vệ: 7 byte chính xác [0,0,0,3,0xaa,0xbb,0xcc] và frame rỗng 4 byte không; thứ tự sống sót khi đẩy từng byte một; payload vượt 64 KiB ghép lại qua ranh giới `PAYLOAD_BLOCK_SIZE`; `handles every split point across a frame` — vòng lặp MỌI offset và khẳng định frame trả về giống hệt, đây là tính chất mà splitter tự viết sẽ làm sai; byte payload được copy chứ không giữ alias vào chunk (sửa chunk sau `push` không được đổi frame đã trả — đây là lý do `FrameDecoder` copy vào block); chunk rỗng và stream rỗng sạch; độ dài khai báo quá lớn bị từ chối NGAY khi 4 byte header đủ (hợp đồng chống DoS); frame đúng bằng giá trị cực hạn được nhận (biên là kín); và không thể `push` sau `end`.

`test/protocol.test.ts` bảo vệ: hằng handshake 8 được ghim; payload `call` đi một vòng mà không bị package diễn giải; `rejects non-JSON opaque payloads` (số không finite, byte array, `undefined`, prototype, cycle) — ĐÂY là test quan trọng nhất cho việc đổi sang omptype, vì omptype hạ `Type.Unsafe` xuống `type.unknown` và `isJsonValue` là thứ duy nhất còn cưỡng chế điều này; envelope huỷ lệnh; cập nhật route attachment kể cả `null` khi detach; `accepts a successful void response without a result field` — `result` là TUỲ CHỌN trên `ok: true`; `rejects unknown messages and fields` — hợp đồng `additionalProperties: false`, và là test chứng minh hạ `def["+"] = "reject"` của omptype chạy đúng; `does not parse JSON strings as messages`; và bề mặt codec end-to-end gồm `encodes complete client and server frames`, `enforces outbound frame limits`, `incrementally decodes fragmented and coalesced client messages` (tương tự cho server), `rejects truncated and oversized framing`, bao gồm cả ánh xạ `ProtocolValidationError`.

`test/cbor/cbor.test.ts` bảo vệ: `undefined` bị bỏ khỏi property nhưng giá trị falsey được giữ; BOM Unicode đầu được giữ và `__proto__` bị coi là dữ liệu (`ignoreBOM: true` trên decoder, và an toàn prototype-pollution qua `Object.defineProperty` trong decoder); map có symbol key enumerable bị từ chối; chuỗi lossy, cycle và độ sâu encoder vượt hạn bị từ chối; hạn mức depth và độ dài khai báo được kiểm TRƯỚC khi duyệt giá trị (hợp đồng DoS); và hạn mức chặt hơn do caller cung cấp thật sự chạy.

Không được thêm gì cả: AGENTS.md cấm test placeholder, `expect(true).toBe(true)`, `not.toThrow()` trần, kiểm tra rỗng/độ dài, và source-grep một file triển khai. Nếu sau khi chép còn hành vi nào chưa được phủ, hãy thêm một case khẳng định kết quả QUAN SÁT ĐƯỢC, và không bao giờ khẳng định trên text của file `.ts`.

### Xác minh

GATE 1 — CHẶN, CHẠY ĐƯỢC NGAY:

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

GATE 2 — BỊ CHẶN, nhưng vì CHORD CHƯA ĐÁP chứ không phải vì môi trường. Nó không cần `ninja` và không cần build `packages/natives`:

```bash
bun test packages/protocol          # mong 133 pass: 82 CBOR, 15 framing, 36 protocol
```

Các khẳng định máy móc (mỗi cái là một grep, mỗi cái phải đúng):

```bash
git grep -c '@earendil-works/' -- packages/protocol   # -> 0 (baseline: 7 lần / 4 file — README.md 3, package.json 2, src/codec.ts 1, src/protocol.ts 1)
grep -rn 'from "\.[^"]*\.ts"' packages/protocol/src packages/protocol/test   # -> 0 (baseline upstream: 12 dòng ở src, 3 ở test)
grep -rn '^\s*private ' packages/protocol/src            # -> 0 (baseline upstream: 30, ở 4 file)
grep -rn 'vitest\|from "node:"\|require(' packages/protocol # -> 0
grep -rn ': any\|<any>\|ReturnType<\|await import(' packages/protocol/src   # -> 0
head -4 packages/protocol/LICENSE                        # dòng 3 = Copyright (c) 2025 Mario Zechner
./node_modules/.bin/oxlint --config .oxlintrc.json packages/protocol   # -> 0 errors, 1 warning cần biết: test/cbor/cbor.test.ts:87 unicorn(no-new-array) trên `new Array(1)` — đây là fixture "array hole", CỐ Ý giữ nguyên, đừng sửa. exit 0 nên GATE 1 vẫn xanh.
```

Kiểm tra phủ định (chứng minh phần bỏ sót ở bước 6 được giữ):

```bash
grep -c 'ClientMessageSchema\|ServerMessageSchema' packages/protocol/src/index.ts     # -> 0
grep -c 'export const ClientMessageSchema' packages/protocol/src/protocol.ts          # -> 1
```

Chạy kiểm tra LICENSE **đầu tiên, không phải cuối**: thiếu attribution trong một package đã phát hành là thất bại duy nhất ở đây không cứu được bằng một commit theo sau.

### Cổng hoàn thành

- **GATE 1 (chặn, CHẠY ĐƯỢC NGAY):** `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers` — oxlint + oxfmt + tsgo trên package mới. Baseline đo hôm nay: exit 0, 24,2s wall.
- **GATE 1b (chặn, CHẠY ĐƯỢC NGAY):** 6 grep máy móc — 0 `@earendil-works/`, 0 `.ts"` trong relative specifier, 0 `private`, 0 `vitest`, 0 `any`/`ReturnType<`/`await import(`, và LICENSE có `Copyright (c) 2025 Mario Zechner` ở dòng 3.
- **GATE 2 (chặn, BỊ CHẶN VÌ CHORD CHƯA ĐÁP — KHÔNG PHẢI VÌ MÔI TRƯỜNG):** `bun test packages/protocol` — 133 case (82 CBOR, 15 framing, 36 protocol). Chạy được ngay khi `@oh-my-pi/chord` có mặt ở bước 9. KHÔNG cần `brew install ninja`, KHÔNG cần build `packages/natives`: package này có 0 import `natives` và repo không có preload trong cấu hình test. Đã chạy thật trên bản chép trong môi trường sạch: 133 pass / 0 fail / 386 `expect()` calls.

Cổng có thực sự đỏ được không: **CẢ BA** — GATE 1 và GATE 1b chạy được ngay và là blocking; GATE 2 cũng sẽ đỏ thật ngay khi chord đáp, không phải đợi môi trường Rust. Trước khi chord đáp thì GATE 2 chưa có gì để chạy; 133 case phải đúng khi soi trước.

### Rủi ro

Thứ nhất và lớn nhất: **PACKAGE KHÔNG TYPE-CHECK ĐƯỢC NẾU CHƯA CÓ QUYẾT ĐỊNH SCHEMA ENGINE, và bốn spec khác thừa kế câu trả lời đó.** `pi-protocol` khai `typebox@1.3.27` và dựng mọi kiểu envelope bằng `Static<typeof XSchema>`. omp không có `typebox` trong lockfile — chỉ có `@sinclair/typebox@0.34.52` không liên quan, một dependency truyền với API khác — và `node_modules/typebox` không tồn tại. Khuyến nghị của spec là port sang `@oh-my-pi/omptype/typebox`, thứ omp đã có và đã dùng trong production, phủ mọi builder `protocol.ts` gọi; thiếu duy nhất là `Check`, thay bằng idiom 3 dòng `instanceof type.errors` mà `packages/coding-agent/src/security/contracts/validation.ts:10-14` đã minh hoạ. Đó là `open_questions[0]` và nên trả lời trước bước 4.

Thứ hai: **`Type.Unsafe` HẠT ÂM THẦM DƯỚI OMPTYPE, và chỉ an toàn ở đây vì có một kiểm tra thứ hai độc lập.** `tUnsafe` của omptype (`typebox.ts:509-513`) vứt bỏ raw document và trả `type.unknown` — chính comment của nó nói rằng nó "cannot honestly implement that contract without importing a second validator". Nên `OpaqueJsonValueSchema = Type.Unsafe<JsonValue>(Type.Unknown())` validate như `unknown` ở tầng schema. Package chỉ giữ đúng BẰNG vì `parseClientMessage`/`parseServerMessage` CỘNG thêm `isJsonValue(value)` lên trên kiểm tra schema, và vì `JsonValue` vẫn là kiểu compile-time. Bỏ vế `|| !isJsonValue(value)` hoặc bỏ import `JsonValue` thì package âm thầm bắt đầu chấp nhận `undefined`, byte array, cycle và prototype trên wire. Case `rejects non-JSON opaque payloads` trong `test/protocol.test.ts` chính là thứ bắt điều này, và đó là lý do tuyệt đối không được sửa nó.

Thứ ba: **bảo đảm `additionalProperties: false` là toàn bộ bề mặt chống tương thích ngược, và nó được diễn đạt lại trên một engine khác.** Cả 12 schema envelope dùng helper `StrictObject` của pi, map thành `def["+"] = "reject"` của omptype (`typebox.ts:426`). Case `rejects unknown messages and fields` của `test/protocol.test.ts` chứng minh việc hạ đó trung thành. Nếu nó fail, cách sửa nằm ở schema helper, KHÔNG ở test.

Thứ tư, rẻ để nói: **lần quét bóc hậu tố `.ts`.** 15 specifier, nhưng nếu sót một thì package là cái duy nhất trong cây dùng extension tường minh, và kiểu lỗi lúc đó gây rối hơn là to. Nó được khẳng định máy móc số 2 phủ.

Thứ năm: **lần quét `private` → `#` có 30 chỗ và một bẫy hành vi.** `FrameDecoder.fail` là METHOD `private`, không phải field; biến nó thành sửa có hình dạng field sẽ làm hỏng class, còn biến một field thành `#fail` là lỗi compile TypeScript bắt ngay. Rủi ro thấp vì `bun run check:ts` chạy được ngay hôm nay và bắt mọi sai sót.

Thứ sáu, ràng buộc thứ tự, là rủi ro lịch trình thật: `pi-protocol` import `chord`, nên không typecheck được cho tới khi chord đáp. chord là package đầu tiên tự nhiên (leaf, một external dep), nên thứ tự là `chord` → `protocol` → {client, server}; `evals` và `telemetry` không phụ thuộc gì và chạy song song được. Vì thế mục này KHÔNG THỂ là cái đầu tiên trong sáu, và cố làm trước sẽ ra một lỗi `check:ts` 24 giây chỉ nói `cannot find module '@oh-my-pi/chord'`.

Không phải rủi ro, nhưng đáng nói để đóng câu hỏi: **va chạm với `packages/wire` sẵn có.** Hai package không chồng lấn (chi tiết ở mục va chạm ở trên). KHÔNG GỘP, và không gì trong omp phải migrate — `pi-protocol` là bổ sung thuần. Câu trả lời cho "import cái nào?" thuộc về cả hai README, không phải một refactor.

### Cần người quyết

- **CHẶN bước 4, và bốn spec khác thừa kế nó** — giữ `typebox@1.3.27` (MIT, đã xác minh; upstream ghim chính xác, bản mới nhất 1.3.34), hay port `protocol.ts` sang `@oh-my-pi/omptype/typebox`? **SPEC NÀY KHUYẾN NGHỊ DÙNG OMPTYPE.** Bằng chứng: omp đã có facade TypeBox tại `@oh-my-pi/omptype/typebox` và dùng trong production (`packages/coding-agent/src/extensibility/legacy-typebox.ts`, cộng 4 file test). Mọi builder `protocol.ts` gọi đều có và đã đo — `Type.String` với `minLength` (`typebox.ts:207`) và `pattern` (:209-216), `Type.Integer` với `minimum` (:121-141), `Type.Object` với `additionalProperties:false` (-> `def["+"]="reject"` ở :426), `Type.Literal`, `Type.Union`, `Type.Optional`, `Type.Unknown`, `Type.Unsafe`, và `Static<T> = T["infer"]` (:85). Chỉ thiếu `Check`, và idiom của omp thay nó trong một dòng (`security/contracts/validation.ts:10-14`: `const result = schema(value); if (result instanceof type.errors) throw ...`). Quy tắc central-utilities của AGENTS.md chỉ cùng hướng: hai schema engine trong một repo là bug dù cả hai đều chạy. **CHỐNG LẠI:** `typebox` là thay đổi import 1 dòng và rủi ro bằng không, còn generic `StrictObject` ở `protocol.ts:10` chưa được xác minh với chữ ký `Type.Object` của omptype. **NẾU CHỌN OMPTYPE:** lối thoát được nói rõ — nếu `bun run check:ts` từ chối generic `StrictObject`, lùi về typebox và ghi lại lý do. Đừng thiết kế lại schema cho vừa.

- **Dependency chord có sống sót không?** `pi-protocol` dùng đúng 2 symbol từ chord (`JsonValue`, `isJsonValue`) qua 2 dòng import. Spec này giữ dependency vì định nghĩa lại `JsonValue` cục bộ sẽ khiến `OpaqueJsonValueSchema` là hợp đồng khác với cái `isJsonValue` cưỡng chế — đó là lỗi đúng ngữ nghĩa, không phải thắng DRY. Nhưng nếu spec của chord quyết định re-export `json.ts` ở một subpath thì việc đổi hướng chỉ 1 dòng. Đáng quyết một lần ở đây cho cả đợt: `isJsonValue`/`JsonValue` sống ở `@oh-my-pi/chord` hay `@oh-my-pi/chord/json`? pi upstream đặt `isJsonValue` ở `chord/src/json.ts:74` và `JsonValue` ở `chord/src/types.ts:21`, và export cái trước từ root index nhưng không export cái sau. Sự bất đối xứng đó đáng giải quyết một lần, ở đây, thay vì trong sáu spec.

- **Có nên định tuyến `packages/coding-agent/src/live/attestation.ts` qua encoder mới không?** Câu trả lời của spec này là KHÔNG, có chủ đích, và README sẽ nói rõ với ba lý do đo được (30 dòng so với cây import 216 dòng; bị gate cổng darwin/arm64 sau một native call nên không test nào chạm tới; text decoder fatal so với non-fatal). Chủ sở hữu có thể ghi đè — đó là thay đổi một file một khi codec tồn tại — nhưng hãy ghi đè một cách có ý thức, không phải do vô tình. Lưu ý attestation cần một BYTE STRING (major type 4) mà encoder dùng chung hỗ trợ, nên không có rào kỹ thuật nào, chỉ là so sánh rủi ro/lợi ích.

- **Tên protocol có đúng không?** pi gọi nó là `@earendil-works/pi-protocol`; quy tắc của brief cho `@oh-my-pi/pi-protocol`. Không mơ hồ. Câu hỏi còn lại duy nhất là liệu một repo chứa CẢ `pi-wire` lẫn `pi-protocol` có cần một câu phân biệt trong mỗi README không. Spec này thêm vào cả hai phía; phương án thay thế — đổi tên `pi-wire`, hoặc gộp hai cái — tệ hơn và nên từ chối nếu được nêu ra.

- **Va chạm gần giống giữa `ProtocolError` (type) và `ProtocolValidationError` (class).** Tên của upstream thật sự gây rối và spec này giữ nguyên văn vì phân biệt đó là hợp đồng lỗi của package: một cái là giá trị đi qua wire, cái kia là class ném cục bộ. Đổi tên bất cái nào cũng là API break cho mọi spec downstream trong đợt (cả `server` và `client` đều import từ barrel này). Hãy để chủ sở hữu xác nhận chấp nhận tên gây rối thay vì đổi tên TRƯỚC khi PR, vì đổi tên sau khi `server`/`client` đã đáp gấp 10 lần công việc.


---


## 3. `server` — state machine mà giá trị nằm ở thứ tự thao tác

**Vị trí trong thứ tự migrate:** thứ 3 trong sáu, ngay sau `chord` và `protocol`, trước `client` — `client` không viết được 8/33 test của nó nếu chưa có `server`.

**Quy mô:** 29 file / 115.351 byte tổng, trong đó 16 file / 67.005 byte là source và 7 file là test. Phần cơ học là 23 lần đổi scope + 57 lần bỏ hậu tố `.ts` trong tập 23 file được chép (38 là con số toàn package, trong đó 15 nằm ở 6 file bị bỏ — `package.json` 4, `README.md` 5, `tsconfig.test.json` 5, `vitest.config.ts` 1 — và không cần đổi gì); công sức thật nằm ở 4 đợt quét không cơ học. Ước lượng: **MEDIUM — khoảng một ngày**.

**Cổng đỏ được:** `bun run check:ts` (chặn, chạy được ngay) + `bun test packages/server` (41 case — chạy được ngay, KHÔNG cần build native addon).

Đây là `pi-server`: một RPC server CBOR length-framed, trung lập về transport, host các durable `Session` qua listener Unix-domain-socket, và định tuyến các lời gọi service không phụ thuộc hợp đồng theo từng presentation attachment. Nó là package mới duy nhất trong đợt có **ZERO dependency npm bên ngoài của riêng nó** — `esbuild` thuộc về `chord`, còn hai dependency còn lại là hai package anh em trong chính đợt này.

### File cần chép

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `src/index.ts` | 117 | chép rồi sửa | 4 dòng. Bỏ `.ts` khỏi cả 4 specifier re-export. Barrel dùng `export * from` — đã đúng chuẩn omp, giữ nguyên. KHÔNG thêm export mới: đừng đưa `connection.ts` hay `session-router.ts` vào barrel; upstream cố ý giữ chúng chỉ-deep-import và các test phụ thuộc vào điều đó. |
| `src/errors.ts` | 1532 | chép rồi sửa | 1 dòng: `@earendil-works/chord` → `@oh-my-pi/chord` (dòng 1). Không gì khác. Thân các lớp lỗi vốn đã không có `#private` cũng không có keyword (dùng `readonly` + gán trong constructor, omp cho phép). |
| `src/listener.ts` | 340 | chép rồi sửa | 1 dòng: bỏ `.ts` khỏi `./connection.ts` (dòng 1). 8 dòng tổng; chỉ có interface. |
| `src/connection.ts` | 1322 | chép rồi sửa | 2 dòng: `@earendil-works/chord` → `@oh-my-pi/chord` (dòng 1); `@earendil-works/pi-protocol` → `@oh-my-pi/pi-protocol` (dòng 2); bỏ `.ts` khỏi `./types.ts` (dòng 4). `NodeJS.Timeout` ở dòng 30 phải thành `Timer` — xem bước 7. |
| `src/types.ts` | 2836 | chép rồi sửa | 3 sửa đổi. (a) dòng 1-2: bỏ **cả hai** dòng import upstream; trỏ `Context` sang `@oh-my-pi/chord/context` và xoá hẳn dòng `pi-agent-core`. (b) THÊM interface `SessionMetadata` 6 trường tại chỗ (collisions[2]). (c) dòng 15: thay khai báo `MaybePromise` bằng re-export từ `@oh-my-pi/pi-utils/acp/protocol` (collisions[1]). |
| `src/server.ts` | 19869 | chép rồi sửa | **CÁI LỚN NHẤT, 576 dòng.** 3 khối import (dòng 1-10 chord, 11 agent-core, 12-30 pi-protocol) + 5 specifier `.ts` tương đối (dòng 32, 34, 35, 37, 38, 39, 40). Logic thân: KHÔNG đổi. Nó vốn đã dùng field từ keyword `private` của TS (xem bước 6), không `any`, không `ReturnType<>`, không import động, không `console.*`. `new Promise((resolve, reject) => ...)` ở dòng 88 là **ngoại lệ** của quy tắc `Promise.withResolvers()` và phải viết lại — xem bước 7. |
| `src/session-router.ts` | 11959 | chép rồi sửa | 312 dòng. 3 dòng import (2 chord, 3 agent-core → chord/context + `SessionMetadata` cục bộ, 4 pi-protocol) + 2 `.ts` tương đối (5, 6). Thân: không đổi logic. `class SessionCleanupError extends AggregateError {}` ở dòng 8 giữ nguyên. Dòng 8 dùng field `private readonly` xuyên suốt — xem bước 6. |
| `src/transports/unix/types.ts` | 610 | chép rồi sửa | 1 dòng: bỏ `.ts` khỏi `../../types.ts`. 15 dòng, hai interface. |
| `src/transports/unix/address.ts` | 425 | chép nguyên văn | 9 dòng. Không import pi, không import pi tương đối (chỉ `node:path`). Chép từng byte. |
| `src/transports/unix/index.ts` | 224 | chép rồi sửa | 4 dòng, toàn re-export: bỏ `.ts` khỏi cả 4 specifier. LƯU Ý: AGENTS.md của omp ưu tiên `export * from` trong barrel `index.ts` thuần. 4 dòng này vốn đã là mỗi tên một dòng có tách type/export, nên giữ dạng named re-export — quy tắc star nói về những barrel *có thể* dùng star, và chuyển sang star sẽ vô tình export `UnixByteConnection` nội bộ module. Ghi lệch lệch này trong PR. |
| `src/transports/unix/listener.ts` | 13675 | chép rồi sửa | 421 dòng, bề mặt sửa lớn thứ hai sau `server.ts`. 1 dòng: `@earendil-works/pi-protocol` → `@oh-my-pi/pi-protocol` (dòng 6). 3 `.ts` tương đối (7, 8, 9). Thân dùng `node:net`/`node:fs`/`node:crypto` qua import **named** (`import { chmod, link, lstat, mkdir, rename, unlink } from "node:fs/promises"`). AGENTS.md bắt buộc `import * as fs from "node:fs/promises"` cho node module; xem bước 8. Cũng có field `private readonly` trên `UnixListener` + `UnixByteConnection` (bước 6) và 5 lần dựng `new Promise(...)` (dòng 61, 238, 274, 339, 376 — bước 7). |
| `src/transports/unix/preset.ts` | 1010 | chép rồi sửa | 28 dòng. Dòng 1 (`@earendil-works/pi-agent-core` type `SessionMetadata`) → bỏ; import `SessionMetadata` từ `../../types`. 4 `.ts` tương đối (2, 3, 4, 5). |
| `src/testing/index.ts` | 328 | chép rồi sửa | 5 dòng, toàn re-export: bỏ `.ts` khỏi cả 5. Cùng ghi chú lệch quy tắc barrel như `unix/index.ts`. |
| `src/testing/client.ts` | 5557 | chép rồi sửa | 183 dòng. 2 dòng scope: chord (3) và pi-protocol (12). 1 `.ts` tương đối (13). Thân: không đổi logic. `new Promise((resolve, reject) => this.waiters.add(...))` ở dòng 104 — không thể dùng withResolvers (nó resolve một giá trị suy ra từ predicate, không phải một ghi deferred) — xem ghi chú bước 7. |
| `src/testing/host.ts` | 6356 | chép rồi sửa | 215 dòng. **FILE KHÓ NHẤT.** 3 dòng import upstream cần thay (1 chord, 2+3 agent-core) + 2 `.ts` tương đối (4, 5). Hai sửa đổi ngoài scope: thêm shim `TestSessionRepo` nội file (collisions[3]) và bỏ import `MemorySessionRepo`. `Deferred` ở dòng 7-20 → `Promise.withResolvers()` (bước 12). |
| `src/testing/server.ts` | 845 | chép rồi sửa | 28 dòng. 3 `.ts` tương đối (1, 2, 3). Không import upstream. Thân không đổi. |
| `test/fixtures/stale-socket-server.mjs` | 246 | chép nguyên văn | 9 dòng, `node:net` thuần, không import pi, không có scope nào. `.mjs` nằm trong `ignorePatterns` của oxlint omp (`.oxlintrc.json:55`) và trong các glob not-matched của `check:tools`, nên không bị lint — còn typecheck? **KHÔNG**: các pattern `include` trong tsconfig package omp chỉ phủ `*.ts`, nên file này không bị lint cũng không bị typecheck, y hệt upstream. Kiểm chứng ở runtime. |
| `test/protocol.test.ts` | 5727 | chép rồi sửa | 168 dòng, 6 test. (a) vitest → bun:test: `import { afterEach, describe, expect, test } from "vitest"` → `from "bun:test"` (bun:test export cả bốn; `describe` và `test` trùng tên). (b) 1 dòng scope (pi-protocol, dòng 1). (c) 3 `.ts` tương đối (3, 4, 5). (d) kiểm API chỉ-của-vitest: file này dùng `expect(...).resolves.toMatchObject(...)` và `rejects` — cả hai đều có trong bun:test. Không có `vi.*`, không `mock.module()` — file sạch ở mặt đó. |
| `test/conformance.test.ts` | 18831 | chép rồi sửa | 502 dòng, 20 test trong 2 describe. Trái tim của hợp đồng. (a) vitest → bun:test. (b) 2 dòng scope (chord:1, pi-agent-core:2 → `BACKGROUND_CONTEXT` sang `chord/context`, `SessionMetadata` sang `../src/types`). (c) 5 `.ts` tương đối. (d) primitive dùng: `expect(x).toBe`, `.rejects.toThrow`, `.resolves` — đều có trong bun:test. Xác minh không có `vi.useFakeTimers` (không có). |
| `test/server.test.ts` | 4133 | chép rồi sửa | 127 dòng, 6 test. (a) vitest → bun:test. (b) 1 dòng scope (pi-protocol:4). (c) 5 `.ts` tương đối. Phủ validate option (dải TypeError), start đồng thời, handshake timeout sinh frame `hello_error` cuối cùng, và truyền lỗi khi shutdown thất bại. |
| `test/listener.test.ts` | 1583 | chép rồi sửa | 52 dòng, 2 test. (a) vitest → bun:test. (b) 3 `.ts` tương đối. Không có scope nào. |
| `test/unix.test.ts` | 5564 | chép rồi sửa | 143 dòng, 6 test. (a) vitest → bun:test. (b) 3 `.ts` tương đối. Dùng `fork` từ `node:child_process` để spawn fixture stale-socket — Bun cài node:child_process `fork`; hãy xác nhận bắt tay `process.send` trong `.mjs` vẫn resolve dưới Bun **trước khi** tin file này. |
| `test/unix-connection.test.ts` | 2006 | chép rồi sửa | 65 dòng, 1 test. (a) vitest → bun:test, NHƯNG **không chỉ đổi dòng import**: file này dùng `vi.waitFor` ở dòng 48 và 60, mà `bun:test` KHÔNG export `vi.waitFor` (probe thật: `typeof vi = object` nhưng `vi.waitFor = undefined`) — chỉ đổi dòng import sẽ ném `TypeError: vi.waitFor is not a function` và làm đỏ chính GATE 2. Phải viết helper poll tương đương theo đúng tiền lệ `pollUntil(predicate, deadlineMs)` ở `packages/coding-agent/test/bash-executor.test.ts:62`, thay cả hai chỗ gọi, rồi bỏ `vi` khỏi import. (b) 1 dòng scope (pi-protocol:3). (c) 1 `.ts` tương đối. Deep-import `@internal` `UnixByteConnection` — giữ nguyên đường dẫn import đó. |
| `package.json` | 1314 | bỏ | **KHÔNG CHÉP — viết mới.** Manifest của pi nhắm build dist bằng tsc + vitest; package omp là source-first (`main`/`types` trỏ `./src/index.ts`, không bước build). Những khác biệt cần *soạn*, không port: name `@oh-my-pi/pi-server`; version ghim theo dòng release omp; `main`/`types`/`exports` trỏ `./src/index.ts`, `./src/testing/index.ts`, `./src/transports/unix/index.ts`; scripts `check`/`check:types`(`tsgo -p tsconfig.json --noEmit`)/`lint`/`test`(`bun test --parallel`)/`fix`/`fmt` chép nguyên văn từ `packages/agent/package.json`; dependencies toàn bộ ghim `catalog:`; devDependencies chỉ `@types/bun` — **BỎ** `shx` và `vitest` (không cái nào tồn tại ở omp: đo được 0 hit trong root `package.json` và mọi `package.json`); engines `bun: >=1.3.14`; `repository.directory` là `packages/server`; author Stencil Labs kèm `contributors: ["Mario Zechner"]` khớp `packages/agent/package.json`; license MIT. Xem bước 5. |
| `README.md` | 5408 | chép rồi sửa | 79 dòng, **5** scope: dòng 1 (title), 19 (`@earendil-works/pi-agent-core`), 26 (`@earendil-works/pi-server`), 27 (`@earendil-works/pi-server/unix`), và **77** (`@earendil-works/pi-protocol` trong đoạn mô tả kiến trúc — dễ sót vì nằm giữa văn xuôi chứ không phải trong code block; GATE 3 grep cả `packages/server` nên sót dòng này là GATE 3 in khác 0). Title thành `# @oh-my-pi/pi-server`. Ví dụ chạy được ~40 dòng **không** hợp lệ ở omp: nó gọi `MemorySessionRepo`, thứ mà omp không có — viết lại nó theo host hình dạng `TestSessionRepo` mới, hoặc theo `ServerHost` tự viết tay. THÊM một mục ngắn "Not a collab-web / metaharness replacement" nói rõ khác biệt transport (collisions[4]); đó là câu có giá trị nhất trong cả file. |
| `CHANGELOG.md` | 1567 | bỏ | Lịch sử 65 dòng / 25 mục của pi (0.80.3 → 0.87.1, cộng một `## [Unreleased]` sẵn có ở upstream). **KHÔNG chép**: tooling release của omp hoàn tất `## [Unreleased]` và sẽ cố hoà giải các heading version nước ngoài. Soạn mới `# Changelog` chỉ với `## [Unreleased]` chứa một dòng Added, giống mọi package omp khác. |
| `tsconfig.build.json` | 209 | bỏ | Phát ra `./dist` với rootDir `./src`. Package omp là source-first với `noEmit` — file này không có đối chiếu ở omp. Thay thế là `packages/server/tsconfig.json` kế thừa `../tsconfig.workspace.json` — đúng như cả 16 package omp đang dùng. |
| `tsconfig.test.json` | 560 | bỏ | NodeNext + type vitest + 5 alias `paths` của upstream. Chết ngay: vitest đã đi, và omp resolve package workspace qua Bun workspaces + exports map chứ không qua tsconfig paths. **Cả 4** scope occurrence của nó (pi-ai ×2, pi-telemetry ×1, pi-protocol ×1) nằm ở đây — đó là lý do `pi-ai` và `pi-telemetry` không cần một lần đổi nào trong tập file được chép. |
| `vitest.config.ts` | 1198 | bỏ | vitest resolver với 6 alias `source` của upstream. Cả file tồn tại chỉ vì alias-anh-em mà omp không cần. Occurrence `pi-ai` duy nhất của nó chết cùng file. |

### Bề mặt công khai

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa |
| --- | --- | --- | --- | --- |
| `INTERNAL_SERVER_ERROR_MESSAGE` | const | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/errors.ts:11` | `packages/server/src/errors.ts:11` | không |
| `ServerError` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/errors.ts:14` | `packages/server/src/errors.ts:14` | không |
| `WrongServerError` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/errors.ts:24` | `packages/server/src/errors.ts:24` | không |
| `SessionNotFoundError` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/errors.ts:31` | `packages/server/src/errors.ts:31` | không |
| `SessionAmbiguousError` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/errors.ts:38` | `packages/server/src/errors.ts:38` | không |
| `SessionNotAttachedError` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/errors.ts:45` | `packages/server/src/errors.ts:45` | không |
| `ServerDrainingError` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/errors.ts:52` | `packages/server/src/errors.ts:52` | không |
| `ServerListener` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/listener.ts:4` | `packages/server/src/listener.ts:4` | không |
| `ServerOptions` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/types.ts:5` | `packages/server/src/types.ts:5` | không |
| `MaybePromise` | type | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/types.ts:15` | `packages/server/src/types.ts:15` | **có** |
| `RoutedSessionAttachment` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/types.ts:18` | `packages/server/src/types.ts:18` | không |
| `RoutedServerPresentation` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/types.ts:29` | `packages/server/src/types.ts:29` | không |
| `RoutedServerServiceAttachment` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/types.ts:37` | `packages/server/src/types.ts:37` | không |
| `RoutedServerServiceHost` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/types.ts:46` | `packages/server/src/types.ts:46` | không |
| `RoutedSessionHandle` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/types.ts:51` | `packages/server/src/types.ts:51` | không |
| `ServerHost` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/types.ts:59` | `packages/server/src/types.ts:59` | không |
| `Server` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/server.ts:46` | `packages/server/src/server.ts:46` | không |
| `SessionRouter` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/session-router.ts:34` | `packages/server/src/session-router.ts:34` | không |
| `ByteConnection` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/connection.ts:7` | `packages/server/src/connection.ts:7` | không |
| `ByteConnectionHandler` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/connection.ts:13` | `packages/server/src/connection.ts:13` | không |
| `ByteConnectionAcceptor` | type | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/connection.ts:19` | `packages/server/src/connection.ts:19` | không |
| `ConnectionStage` | type | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/connection.ts:21` | `packages/server/src/connection.ts:21` | không |
| `ConnectionState` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/connection.ts:23` | `packages/server/src/connection.ts:23` | không |
| `isTerminalConnection` | function | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/connection.ts:35` | `packages/server/src/connection.ts:35` | không |
| `getUnixSocketPath` | function | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/transports/unix/address.ts:4` | `packages/server/src/transports/unix/address.ts:4` | không |
| `createUnixListener` | function | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/transports/unix/listener.ts:388` | `packages/server/src/transports/unix/listener.ts:388` | không |
| `createUnixServer` | function | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/transports/unix/preset.ts:8` | `packages/server/src/transports/unix/preset.ts:8` | không |
| `UnixListenerOptions` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/transports/unix/types.ts:3` | `packages/server/src/transports/unix/types.ts:3` | không |
| `UnixServerOptions` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/transports/unix/types.ts:15` | `packages/server/src/transports/unix/types.ts:15` | không |
| `UnixByteConnection` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/transports/unix/listener.ts:191` | `packages/server/src/transports/unix/listener.ts:191` | không |
| `WireChannel` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/client.ts:21` | `packages/server/src/testing/client.ts:21` | không |
| `ProtocolTestClient` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/client.ts:27` | `packages/server/src/testing/client.ts:27` | không |
| `connectUnixTestClient` | function | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/client.ts:152` | `packages/server/src/testing/client.ts:152` | không |
| `Deferred` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/host.ts:7` | `packages/server/src/testing/host.ts:7` | không |
| `TestHarness` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/host.ts:27` | `packages/server/src/testing/host.ts:27` | không |
| `createTestServerServices` | function | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/host.ts:119` | `packages/server/src/testing/host.ts:119` | không |
| `TestServerHost` | class | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/host.ts:151` | `packages/server/src/testing/host.ts:151` | không |
| `TestServerOptions` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/server.ts:5` | `packages/server/src/testing/server.ts:5` | không |
| `TestServer` | interface | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/server.ts:10` | `packages/server/src/testing/server.ts:10` | không |
| `createTestServer` | function | `/Users/tranquangdang21/Projects/pi-ref/packages/server/src/testing/server.ts:16` | `packages/server/src/testing/server.ts:16` | không |

Ghi chú đáng nhớ cho vài symbol, vì chúng mang quyết định chứ không mang mô tả:

- `INTERNAL_SERVER_ERROR_MESSAGE` — text lỗi mờ cho mọi throw không phải `ServerError`/`RemoteServiceError`/`ProtocolValidationError` (`server.ts:520`). Giữ nguyên văn; chính hằng này là hợp đồng wire mà client khớp.
- `ServerError` — `toProtocolError` (`server.ts:513`) làm `error instanceof ServerError || error instanceof RemoteServiceError` rồi chuyển tiếp `.code`/`.message` nguyên văn. Cặp `instanceof` với `RemoteServiceError` của `chord` là lý do class này phải giữ đúng tên và đúng hình dạng.
- `WrongServerError` — code `wrong_server`, ném bởi `Server.handleRequest` tại `server.ts:346` **trước** mọi truy cập repository; `test/conformance.test.ts:321` ghim đúng thứ tự đó.
- `ServerOptions` — `listeners: readonly ServerListener[]` là bắt buộc (không có mặc định): `resolveOptions` ném `TypeError` thiếu nó (`server.ts:559`).
- `MaybePromise` — va chạm thật, dù vô hại. omp đã định nghĩa `export type MaybePromise<T> = T | Promise<T>` giống hệt tại `packages/utils/src/acp/protocol.ts:9`, truy cập được qua `@oh-my-pi/pi-utils/acp/protocol`. Xử lý ở va chạm số 1.
- `ServerHost` — **loại chặn**. Generic `TMetadata extends SessionMetadata` là symbol duy nhất trong cả package không resolve được bên trong omp. Xem va chạm số 2 và câu hỏi mở số 1.
- `Server` — vòng đời kết nối 576 dòng: `start`/`accept`/`close` + `readonly closed: Promise<void>`. Không có `export class Server` nào ở omp (đo được 0), nên không có shadowing âm thầm — nhưng chữ `Server` ở omp đã bị dùng cho hai thứ khác. Xem va chạm số 1.
- `SessionRouter` — KHÔNG re-export từ `index.ts`, chỉ deep-import được. 312 dòng serialize-per-client (`runForClient`) và vòng đời attachment. Cố ý nội bộ; giữ nguyên việc không export nó khỏi barrel. Cùng cảnh báo cho `ByteConnection`, `ByteConnectionHandler`, `ByteConnectionAcceptor`, `ConnectionStage`, `ConnectionState`, `isTerminalConnection`.
- `ConnectionState` — chứa `handshakeTimeout: NodeJS.Timeout` ở `connection.ts:30`; đây là một trong ba chỗ duy nhất type global `NodeJS.` lọt vào `src/` (hai chỗ kia đều ở `unix/listener.ts`) — xem bước 7.
- `ServerListener` — **đường seam transport duy nhất**: `Server` không bao giờ import `node:net`. Đã xác minh `export interface ServerListener` khớp 0 file dưới `omp/packages`.
- `getUnixSocketPath` — export từ subpath `./unix`. Kiểm tra bằng regex một UUIDv4 lowercase chuẩn, ném `TypeError` nếu không. 0 match ở omp.
- `createUnixListener` — export từ `./unix`. Nơi **duy nhất** trong package tiêu thụ `node:net`. 0 match ở omp.
- `UnixByteConnection` — đánh dấu `@internal Exported only for transport-level verification` và cố ý KHÔNG re-export từ `unix/index.ts`. `test/unix-connection.test.ts` deep-import nó. Giữ nguyên dòng comment đó và đường dẫn deep-import.
- `ProtocolTestClient` — ghi `messages` và resolve các waiter `next(predicate)`. Cũng assert `'Wire client is closed'` khi đăng ký waiter sau khi đóng.
- `Deferred` — omp không có class nào như vậy (0 match) nhưng AGENTS.md bắt `Promise.withResolvers()`; xem bước 12. Tên trùng khái niệm với cách dùng của omp, không trùng symbol.
- `TestServerHost` — phụ thuộc `MemorySessionRepo`, thứ omp **không có ở package nào** (đo được 0). Đây là file khó migrate nhất — xem va chạm số 3.
- `createTestServerServices` — hard-code serviceId `pi.session-management` (3 literal trong toàn bộ `testing/`). Xem câu hỏi mở số 3.
- `createTestServer` — mặc định serverId là `00000000-0000-4000-8000-000000000001`, cùng fixture UUID mà ba file test dùng.

### Dependency mới

| package | phiên bản | vì sao | đã có ở omp | giấy phép |
| --- | --- | --- | --- | --- |
| `@oh-my-pi/chord` | `18.3.3` (workspace catalog) | Dep cứng. `pi-server` import 11 symbol chord trên 7 file: type `JsonValue`/`ServiceCall`/`ServiceProviderUpdate`/`ServiceStateEncoder`/`RemoteServiceErrorCode`, value `createServiceStateEncoder`/`decodeServiceControlCall`/`parseServiceCall`/`parseServiceSubscriptionSnapshot`/`RemoteServiceError`. Không có nó thì `Server` không typecheck. | không | MIT (Copyright (c) 2025 Mario Zechner) — cùng notice mà LICENSE gốc đã mang. |
| `@oh-my-pi/pi-protocol` | `18.3.4` (workspace catalog) | Dep cứng, và khó hơn. 18 symbol trên 6 file: `ClientMessageDecoder`, `encodeServerMessage`, `encodeClientMessage`, `ServerMessageDecoder`, `encodeFrame`, `encodeCbor`, `DEFAULT_MAX_FRAME_LENGTH`, `PROTOCOL_VERSION`, `isServerId`, `isSupportedProtocolVersion`, `ProtocolValidationError` + 8 envelope type. Dep upstream của chính nó là `typebox@1.3.27`; omp chỉ có `@sinclair/typebox@0.34.52` — và nó là transitive CỦA package khác (khai ở `bun.lock:216`), không phải dependency trực tiếp, nên **không tái dùng được**: version 0.x cùng API của nó không tương thích với `Type.Union` / `Static<typeof XSchema>` 1.x mà `pi-protocol` cần — cộng một `@oh-my-pi/omptype` không liên quan. `grep -n 'typebox' package.json` cho 0 hit: `typebox` KHÔNG nằm trong catalog omp, nên spec của `pi-protocol` phải quyết trước khi `server` đáp xuống. | không | MIT (Copyright (c) 2025 Mario Zechner) |
| `@oh-my-pi/pi-utils` | theo catalog hiện hữu | Không có trong danh sách dep upstream, nhưng bước 9 bắt buộc thêm: `MaybePromise` sẽ được re-export từ `@oh-my-pi/pi-utils/acp/protocol` (va chạm số 1). | có | — |
| `@oh-my-pi/pi-agent-core` | `18.3.3` (workspace catalog) | Là dep được *khai* trong upstream, nhưng chỉ **một** trong năm symbol nó import thật sự phải đến từ đó: `SessionMetadata`. Bốn symbol còn lại (`Context`, `BACKGROUND_CONTEXT`, `TODO_CONTEXT`, `withAbortSignal`) chỉ là re-export thuần của `@earendil-works/chord/context` — xem `pi-ref` `packages/agent/src/harness/context.ts:14-25`, file này re-export cả bốn từ `chord`. Trỏ bốn symbol đó sang `@oh-my-pi/chord/context` và package trở nên không còn phụ thuộc agent-core ngoài `SessionMetadata`. | có | MIT (Copyright (c) 2025 Mario Zechner; omp thêm Can Bölük và Stencil Labs) |

Cái **KHÔNG** được thêm, và vì sao:

- `esbuild@0.28.2` — thuộc `chord`, vắng mặt ở omp, nhưng **không** đi qua cửa này: `pi-server` không import npm ecosystem gì cả. Nó nằm trên critical path thuộc spec của `chord`.
- `typebox@1.3.27` — thuộc `pi-protocol`. Câu hỏi của nó là catalog hay `@oh-my-pi/omptype`; quyết định đó thuộc spec kia nhưng chặn package này.
- `shx` — không tồn tại ở omp (0 hit trong root `package.json` và mọi `package.json`).
- `vitest` — không tồn tại ở omp; cả 7 file test chuyển sang `bun:test`.
- `@types/node` — tsconfig đã chép có `types: ["bun", "assets"]`; đó là lý do `NodeJS.Timeout` phải thành `Timer`.
- 5 alias `paths` trong `tsconfig.test.json` và 6 alias `source` trong `vitest.config.ts` — cả hai file bị bỏ; omp resolve workspace qua Bun workspaces + exports map.
- `@oh-my-pi/pi-ai` và `@oh-my-pi/pi-telemetry` — scope rewrite của chúng được spec đánh dấu `verified`, nhưng mọi occurrence đều nằm trong `tsconfig.test.json` và `vitest.config.ts`, hai file bị bỏ. Vì vậy trong tập file được chép chúng cần **0** lần đổi.

Bảy scope rewrite, tất cả `verified: true` trong spec. Cột `occurrences` dưới đây đếm **TOÀN PACKAGE** (gồm cả 6 file bị bỏ), tổng 38 — nhưng tập 23 file thực sự được chép chỉ cần **23** lần: pi-protocol **8**, pi-agent-core **7**, chord **8**, còn pi-server / pi-ai / pi-telemetry là **0** (4 occurrence `pi-server` nằm ở `package.json` + `README.md`; 3 `pi-ai` và 1 `pi-telemetry` nằm ở `tsconfig.test.json` + `vitest.config.ts` — toàn bộ là file bị bỏ):

| from | to | occurrences |
| --- | --- | --- |
| `@earendil-works/pi-protocol` | `@oh-my-pi/pi-protocol` | 11 |
| `@earendil-works/pi-agent-core` | `@oh-my-pi/pi-agent-core` | 10 |
| `@earendil-works/chord` | `@oh-my-pi/chord` | 9 |
| `@earendil-works/pi-server` | `@oh-my-pi/pi-server` | 4 |
| `@earendil-works/pi-ai` | `@oh-my-pi/pi-ai` | 3 |
| `@earendil-works/pi-telemetry` | `@oh-my-pi/pi-telemetry` | 1 |
| `from "./x.ts"` (specifier tương đối, hậu tố `.ts`) | `from "./x"` (không hậu tố) | 57 |

### Va chạm với thứ omp đã có

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| Tên class `Server`. `pi-server` export `class Server<TMetadata>`. | `packages/server/src/server.ts:46` — `export class Server<TMetadata extends SessionMetadata = SessionMetadata>` | `packages/metaharness/src/server.ts:26,194` (`import type { Server } from "bun"`; `#server: Server<undefined> \| null`) và `packages/stats/src/server.ts` | **GIỮ CẢ HAI, KHÔNG SỬA GÌ.** Đây là quyết định, không phải phớt lờ. Chúng là các package khác nhau với module specifier khác nhau, nên không import nào có thể mơ hồ: `Server` của `@oh-my-pi/pi-server` chỉ vào scope qua `import { Server } from "@oh-my-pi/pi-server"`, cái này không bao giờ đụng `import type { Server } from "bun"` ở một module khác. Mối nguy hiểm thật duy nhất là một file **tương lai** import cả hai; nếu xảy ra, hãy alias bản Bun thành `BunServer` tại chỗ import chứ đừng đổi tên class đã migrate. Đừng đổi tên class đã migrate — tính trung thành tên upstream mới là toàn bộ ý nghĩa của một lần migrate dựa trên chép. |
| `MaybePromise<T> = T \| Promise<T>` bị khai hai lần. `pi-server` khai và star-export của riêng nó tại `types.ts:15`. | `packages/server/src/types.ts:15` — `export type MaybePromise<T> = T \| Promise<T>;` (re-export bởi `src/index.ts:4`) | `packages/utils/src/acp/protocol.ts:9` — `export type MaybePromise<T> = T \| Promise<T>;` (truy cập qua `@oh-my-pi/pi-utils/acp/protocol` nhờ export wildcard `./*`) | **BỎ khai báo cục bộ**; thêm `export type { MaybePromise } from "@oh-my-pi/pi-utils/acp/protocol";` vào `src/types.ts`, để public API của `pi-server` vẫn giống hệt từng byte nhưng kiểu này chỉ có một nhà. AGENTS.md mục 'Central Utilities' nói thẳng rằng một hiện thức thứ hai của helper đã có là bug. Đây là **sửa đổi cố ý duy nhất không nguyên văn** trên một public symbol, và nó thuần type nên không thể đổi hành vi runtime. |
| `SessionMetadata` — ràng buộc generic của `ServerHost`/`Server`/`SessionRouter`/`createUnixServer` — không tồn tại ở đâu trong omp, và `@oh-my-pi/pi-agent-core` của omp KHÔNG phải cùng package với pi dù tên giống. | `packages/server/src/types.ts:59` `ServerHost<TMetadata extends SessionMetadata = SessionMetadata>`; bản thân kiểu đó là `packages/agent/src/harness/session/types.ts:473` của pi — một interface 6 trường: `{ id: string; createdAt: number; storageVersion: number; cwd?: string; parentSessionId?: string; legacyParentSessionPath?: string }` | `packages/agent/src/index.ts` chỉ export 18 module phẳng (agent, agent-loop, append-only-context, compaction, output-budget, pause, proxy, replay-policy, run-collector, sent-tool-definitions, speculative-execution, telemetry, thinking, tool-context, tokenizer, types, utils/yield). `grep -rn 'SessionMetadata' packages/agent/src` trả 0 hit. Cả subtree `harness/` vắng mặt: `pi-agent-core` của omp là 50 file / 747.085 byte (trong đó 34 file `.ts` / 739.550 byte và 16 prompt `.md` / 7.535 byte) so với 117 file `.ts` / 1.145.928 byte của pi — cùng mẫu đo thì là 34 `.ts` so với 117 `.ts`. omp cũng không có `MemorySessionRepo`, không có interface `Session`, không có `SessionReader`, không có `SessionDirectory` (đều đo được 0 trên toàn bộ `packages/`). | **KHAI BÁO TẠI CHỖ** trong `pi-server`. Thêm interface `SessionMetadata` 6 trường nguyên văn vào `packages/server/src/types.ts` và import từ đó thay vì từ `pi-agent-core`, rồi **xoá 7 dòng import `pi-agent-core`**. Lý do: (a) bốn symbol agent-core kia (`Context`, `BACKGROUND_CONTEXT`, `TODO_CONTEXT`, `withAbortSignal`) là re-export của `chord/context` ở upstream, nên trỏ chúng sang `@oh-my-pi/chord/context` để lại `SessionMetadata` là tàn dư duy nhất; (b) omp không có khái niệm durable-`Session` nào cả, nên không có gì trong cây để kiểu này alias tới; (c) khai báo tại đây làm `pi-server` đáp được như một package độc lập thay vì bị con tin của một cuộc hoà giải `agent-core` lớn hơn nhiều, nằm ngoài phạm vi. Đây là một sai lệch có chủ đích, có tên, so với nguyên văn — xem câu hỏi mở số 1 để chủ sở hữu phán. |
| `TestServerHost` phụ thuộc `MemorySessionRepo` — một abstraction session-repository của `pi-agent-core` không có đối chiếu ở omp và cũng không có chỗ đứng rõ ràng. | `packages/server/src/testing/host.ts:3` `import { BACKGROUND_CONTEXT, MemorySessionRepo } from "@earendil-works/pi-agent-core";` và `:153` `readonly repo = new MemorySessionRepo({ now: () => 1 });` — dùng bởi `resolveSession` (list), `openSession` (open), và `seed` (create) | không có — `grep -rn 'MemorySessionRepo' packages/` trả 0 hit. Analogy gần nhất ở omp là `packages/coding-agent/src/session/`, một session manager single-process không có interface repository. | **THAY** bằng shim `TestSessionRepo` nội file ~30 dòng trong `src/testing/host.ts`: giữ một `Map<string, SessionMetadata>` cộng một shim `Session` in-memory, và cho nó ba phương thức harness gọi (list/open/create) để hợp đồng quan sát được mà các test conformance khẳng định — `resolveSession` trả 0 match → `SessionNotFoundError`, >1 → `SessionAmbiguousError`, đúng 1 → metadata đó — **không đổi**. Đừng cố đưa vào một abstraction session-repository thật ở đây; đó là việc của `durable`, một package riêng trong đợt. |
| Chồng lấn vai trò với hai package mà bản tóm tắt đã cảnh báo. Không cái nào trùng chức năng, nhưng cả hai đều dễ bị nhầm là bản trùng. | `packages/server/src/server.ts:136` `accept(connection: ByteConnection): ByteConnectionHandler` — nhận một luồng byte đã được uỷ quyền, có thứ tự. Không HTTP, không WebSocket, không MCP ở bất cứ đâu trong package (đã xác minh: import `node:net` duy nhất là `transports/unix/listener.ts:4`). | `packages/collab-web/src/lib/socket.ts` (WebSocket trình duyệt tới một relay room, frame seal AES-GCM qua `codec.ts`, 4 mã close 4001/4004/4009/4029 trong `RELAY_CLOSE_REASONS`) và `packages/collab-web/src/lib/link.ts` (`wss://host/r/<roomId>.<base64url-key>`), so với `packages/metaharness/src/server.ts:211` `Bun.serve({ port, routes, fetch })` — REST + SSE qua HTTP cho benchmark run store. | **KHÔNG GỘP**, và ghi lại khác biệt trong `packages/server/README.md` mới để người đọc sau không phải tranh luận lại. `pi-server` là: CBOR length-framed (`pi-protocol`) trên Unix socket, bắt tay `hello`/`hello_error` với `PROTOCOL_VERSION = 8`, request/response/cancel cộng các message attachment và `service_update` ngoài băng, và định tuyến service theo từng attachment. `collab-web` là: relay WebSocket với crypto an toàn cho trình duyệt, theo room, không cổng phiên bản bắt tay. `metaharness` là: process manager HTTP/SSE. Ba transport, ba mô hình xác thực, ba vòng đời. Nghệ thuật lân cận thật sự ở omp là `packages/coding-agent/src/collab/registry.ts` (762 dòng) và `src/tiny/jsonl-socket.ts` (49 dòng) — cả hai là host `node:net` + Unix socket, nhưng là JSON phân tách dòng mới chứ không phải CBOR length-framed, nên chúng vẫn là khuôn mẫu idiomatic trong cây cho giao thức của riêng mình và **không được** refactor sang `pi-server`. |

### Các bước

1. **CỔNG TIỀN ĐIỀU KIỆN** — đừng bắt đầu khi cả ba chưa có: `@oh-my-pi/chord`, `@oh-my-pi/pi-protocol`, và một quyết định về `SessionMetadata` (open_questions[0]). `bun run check:ts` sẽ hỏng ở bước 12 với TS2307 trên `@oh-my-pi/pi-protocol` và `@oh-my-pi/chord` nếu thiếu bất kỳ cái nào. Kiểm bằng: `ls packages/chord/src/index.ts packages/protocol/src/index.ts`. Neo: `packages/chord`, `packages/protocol`.
2. **Ghi nguồn gốc TRƯỚC khi bất kỳ file nào chạm đất.** Thêm vào `packages/server/`: một file `NOTICE` có dòng đầu là `Derived from earendil-works/pi packages/server @ d6af72e (MIT, Copyright (c) 2025 Mario Zechner). Modified: package scope rebased @earendil-works/ -> @oh-my-pi/, import specifiers made extensionless, vitest -> bun:test, TS `private` -> ES `#private`, Promise constructor -> Promise.withResolvers, SessionMetadata declared locally.` rồi kèm **toàn văn** MIT text từ `pi-ref/LICENSE`. Đồng thời thêm NOTICE đó vào `THIRD-PARTY-NOTICES.txt` gốc, dưới một header mục `packages/server/NOTICE` mới, khớp format mục `crates/pi-shell/NOTICE` sẵn có. Đây là nghĩa vụ MIT § "The above copyright notice ... shall be included", và nó là một cổng cứng chứ không phải thủ tục: file phải tồn tại **trong cùng commit** với file source đầu tiên được chép. Neo: `packages/server/NOTICE`, `THIRD-PARTY-NOTICES.txt`.
3. **Tạo khung package:** `mkdir -p packages/server/src/transports/unix packages/server/src/testing packages/server/test/fixtures`. Viết `packages/server/tsconfig.json` là `{ "extends": "../tsconfig.workspace.json", "include": ["src", "test"] }` — đây chính xác là nội dung `packages/agent/tsconfig.json`, và khớp cả 16 package omp đang dùng. TUYỆT ĐỐI KHÔNG extends thẳng `../../tsconfig.base.json`: không package omp nào làm vậy, và làm vậy sẽ bỏ qua `exclude: ["*/node_modules", "*/dist"]` mà `packages/tsconfig.workspace.json` cung cấp. KHÔNG port `tsconfig.build.json` hay `tsconfig.test.json`. Neo: `packages/server/tsconfig.json`.
4. **Viết `packages/server/package.json` mới** theo ghi chú rewrite của files_to_copy[package.json]: name `@oh-my-pi/pi-server`, exports source-first cho `.`, `./testing`, `./unix`, deps `catalog:`, 6 script chép từ `packages/agent/package.json`, devDependencies chỉ `@types/bun`. Rồi thêm ba phiên bản package anh em vào block `workspaces.catalog` của `package.json` GỐC, theo thứ tự alphabet (`@oh-my-pi/pi-protocol` sau pi-natives, `@oh-my-pi/pi-server` sau pi-protocol, `@oh-my-pi/chord` ở slot riêng) và chạy `bun install`. Neo: `package.json (workspaces.catalog)`.
5. **Chép 16 file dưới `src/`** giữ nguyên layout thư mục. Với từng file, chỉ áp đúng các rewrite cơ học đã ghi trong files_to_copy: scope string (7 mục trong scope_rewrites) và 57 hậu tố `.ts` trên specifier tương đối. Xác minh đợt cơ học đã đủ và chính xác bằng: `grep -rn '@earendil-works/' packages/server/src | wc -l` phải in 0, và `grep -rnoE 'from "\.[^"]*\.ts"' packages/server/src | wc -l` phải in 0. Neo: `packages/server/src/**`.
6. **Đợt quét ES `#private` — 87 khai báo trên 5 file: 52 field + 35 method.** `src/server.ts`: 15 field ở dòng 51-65 (host, listeners, maxFrameLength, handshakeTimeoutMs, onConnectionCountChanged, onError, connections, sessions, closing, closePromise, closedSettled, rejectClosed, resolveClosed, startPromise, started) + 18 method ở dòng 103, 183, 208, 223, 262, 298, 306, 406, 417, 438, 452, 474, 489, 504, 512, 523, 531, 539. `src/session-router.ts`: 7 field ở dòng 35-41 (options, hostedSessions, openingSessions, attachmentsByClient, disconnectedClients, clientOperations, closePromise) + 11 method ở dòng 108, 146, 160, 199, 216, 224, 234, 254, 262, 276, 302. `src/transports/unix/listener.ts`: 19 field ở dòng 30-39 + 192-200 + 6 method ở dòng 95, 126, 136, 147, 181, 270. `src/testing/client.ts`: 7 field ở dòng 29-35. `src/testing/host.ts`: 4 field ở dòng 9, 40, 41, 158. Với từng cái: `private readonly x` → `#x`, `private x` → `#x`, `private async x(...)` → `#x(...)`. AGENTS.md cấm keyword `private` trên field **và** method, trừ constructor parameter property — không cái nào ở đây là constructor parameter property, nên **cả 87** đều chuyển (52 field + 35 method), không chỉ riêng 52 field. **KHÔNG đụng vào `get closed()` ở `unix/listener.ts:208`**: đó là getter CÔNG khai, không có keyword `private`, và `closed` là thành viên bắt buộc của interface `ByteConnection` (`connection.ts:8` → `readonly closed: boolean`) mà `UnixByteConnection` khai `implements` ở `listener.ts:191` — đổi thành `#get closed()` sẽ phá `implements ByteConnection` với TS2420, và `server.ts` cùng `session-router.ts` đọc `connection.closed` qua interface nên cả hai file hỏng theo. LƯU Ý các chỗ đọc: `metaharness/src/server.ts:189,190,194` cho thấy hình dạng đích (`#store`, `#children`, `#server`). Neo: `packages/server/src/server.ts:51`, `src/session-router.ts:35`, `src/transports/unix/listener.ts:30`.
7. **Đợt quét Promise constructor — 9 chỗ `new Promise` trong 5 file.** Chuyển **8** sang `Promise.withResolvers()`: `server.ts:88` (closed), `unix/listener.ts:61` (listen), `:238` (close), `:274` (write), `:339` (isSocketLive), `:376` (closeNetServer — dễ sót, không có trong danh sách cũ), `testing/client.ts:177` (writeSocket — dễ sót), `testing/host.ts:12` (Deferred, xem bước 10(d)). **GIỮ** `testing/client.ts:104` là `new Promise` — nó resolve một giá trị tính từ predicate, `withResolvers` không biểu đạt được; ghi lý do vào một dòng comment để người review sau không "sửa" nó. Đồng thời đổi `NodeJS.Timeout` → `Timer` ở `connection.ts:30` và `unix/listener.ts:342` — KHÔNG phải 242/345/361 như tài liệu này từng ghi: dòng 242 là `this.markClosed()` bên trong `setTimeout` (không có type NodeJS nào), và 345/361 không hề có; thứ nằm ở gần đó là `NodeJS.ErrnoException` tại dòng 353, một type khác, chỉ dùng trong callback `socket.once("error")` và **có thể để nguyên**. Lý do đổi là **quy ước của omp** (xem `metaharness/src/server.ts:193` `#syncTimer: Timer | undefined`), KHÔNG phải vì typecheck: đã probe `NodeJS.Timeout` và `NodeJS.ErrnoException` trong `packages/utils/src/` và `check:types` exit 0, vì `typeRoots` của `tsconfig.base.json` vẫn cấp namespace `NodeJS` dù `types` chỉ là `["bun", "assets"]`. Neo: `packages/server/src/server.ts:88`, `src/transports/unix/listener.ts:61`, `src/connection.ts:30`.
8. **Chuẩn hoá import node-module.** `src/transports/unix/listener.ts` dùng import named từ `node:fs/promises` (dòng 3: chmod, link, lstat, mkdir, rename, unlink) và `node:fs` (dòng 2: `import type { Stats }`) và `node:net` (dòng 4) và `node:path` (dòng 5) và `node:crypto` (dòng 1) — chuyển các import value thành `import * as fs from "node:fs/promises"` / `import * as net from "node:net"` / `import * as path from "node:path"` / `import * as crypto from "node:crypto"` và qualify call site. `session-router.ts:1` (`import { randomUUID } from "node:crypto"`) → `import * as crypto from "node:crypto"` + `crypto.randomUUID()`. `unix/address.ts:1` (`import { join } from "node:path"`) → `import * as path from "node:path"` + `path.join`. `testing/client.ts:1-2` (`node:events`, `node:net`) → namespace. Việc này cơ học nhưng chạm ~25 call site; đừng format tay, hãy chạy oxfmt sau. Neo: `packages/server/src/transports/unix/listener.ts:1-5`, `src/session-router.ts:1`, `src/transports/unix/address.ts:1`, `src/testing/client.ts:1-2`.
9. **Áp dụng va chạm số 1** — thay khai báo `MaybePromise` ở `src/types.ts:15` bằng `export type { MaybePromise } from "@oh-my-pi/pi-utils/acp/protocol";` và thêm `@oh-my-pi/pi-utils` vào dependencies của `packages/server/package.json`. Cách này giữ public API của `pi-server` giống hệt từng byte trong khi đưa kiểu về một nhà duy nhất, theo AGENTS.md 'Central Utilities'. Neo: `packages/server/src/types.ts:15`.
10. **Áp dụng va chạm số 2 và 3** — hai thích ứng thật sự. (a) Trong `src/types.ts`, xoá import `@earendil-works/pi-agent-core` (dòng 2) và THÊM interface `SessionMetadata` 6 trường nguyên văn từ `pi-ref` `packages/agent/src/harness/session/types.ts:473-480` kèm doc comment. (b) Trong cả 4 file src từng import `Context`/`BACKGROUND_CONTEXT`/`TODO_CONTEXT`/`withAbortSignal` từ agent-core, trỏ sang `@oh-my-pi/chord/context` — đây là re-export thuần ở upstream nên symbol giống hệt, chỉ module specifier đổi. (c) Trong `src/testing/host.ts`, xoá import `MemorySessionRepo` và thêm shim `TestSessionRepo` nội file bám `Map<string, SessionMetadata>` với list/open/create, giữ nguyên hành vi 0-match / >1-match / 1-match mà `conformance.test.ts:334` và `:346` khẳng định. (d) Trong `src/testing/host.ts`, `Deferred` (dòng 7-20) → `Promise.withResolvers()` theo AGENTS.md. Class này có **2** thành viên public (`readonly promise` dòng 8, `resolve()` dòng 17), không phải 4 — `private resolvePromise` dòng 9 là private; `withResolvers` sinh thêm `reject` và ta **bỏ** nó đi, vì `Deferred` cố ý chỉ resolve một chiều. **LƯU Ý phạm vi**: `Deferred` là public API (`src/testing/index.ts:3` re-export nó) và `test/conformance.test.ts:403-405` dùng trực tiếp `new Deferred<T>()` + `.promise` + `.resolve(undefined)`, nên hoặc giữ nguyên hình dạng `new Deferred<T>()` cho test, hoặc phải sửa đồng thời 3 chỗ dùng đó trong `conformance.test.ts` — nếu sửa thì cập nhật luôn mục 'Hợp đồng test' bên dưới, vốn đang cam kết 'cùng tên, cùng 41 khẳng định'. Neo: `packages/server/src/types.ts:2`, `src/server.ts:11`, `src/session-router.ts:3`, `src/transports/unix/preset.ts:1`, `src/testing/host.ts:3`.
11. **Chép 7 file `test/`** và chuyển chúng sang `bun:test`. Với từng file: đổi `from "vitest"` thành `from "bun:test"`; áp cùng rewrite scope và hậu tố `.ts`; trong `conformance.test.ts` trỏ `BACKGROUND_CONTEXT` sang `chord/context` và `SessionMetadata` sang `../src/types`. Rồi rà các pattern bị cấm **trước khi** chạy bất cứ thứ gì: `grep -rn 'mock.module' packages/server/test` phải 0, `grep -rn 'from "vitest"' packages/server/test` phải 0, `grep -rn 'vi\.' packages/server/test` phải 0 (bắt `vi.waitFor` ở `unix-connection.test.ts:48,60` nếu còn sót — `bun:test` không có `vi.waitFor`, nên sót là GATE 2 đỏ), và `grep -rn 'readFileSync\|Bun.file' packages/server/test` phải 0 (không có test source-grep nào lọt vào từ upstream). Neo: `packages/server/test/**`.
12. **Chạy cổng:** `cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts`. Đo trên máy này: 23.8s wall / exit 0 cho cây 16 package hiện tại; hãy dự trù ~25s khi có package thứ 17. Nó chạy oxlint + `oxfmt --check` trên package mới và `tsgo --noEmit` cho từng package. Nếu TS2307 nêu `@oh-my-pi/pi-protocol` hoặc `@oh-my-pi/chord`, thì tiền điều kiện bước 1 chưa được đáp — dừng lại và đi làm chúng. Nếu nó nêu `@oh-my-pi/pi-agent-core`, bước 10 chưa được áp. Neo: `bun run check:ts`.
13. **Chạy test — không cần gỡ addon native.** Chạy thẳng `bun test packages/server` và kỳ vọng **41** test pass: 20 (conformance) + 6 (server) + 2 (listener) + 6 (protocol) + 6 (unix) + 1 (unix-connection) = 41. Con số 41 chính là tín hiệu smoke của deliverables — nếu nó không phải 41, một lần viết lại đã bỏ hoặc nhân đôi một case. (Ghi chú: spec gốc viết "38 passing tests" rồi cộng ra 39, và tài liệu này trước đây cũng cộng ra 39; đếm lại từ khai báo `test()` cho 41 — **41 là con số dùng làm chuẩn**.) Neo: `bun test packages/server`.
14. **Soạn CHANGELOG thuần omp:** một `packages/server/CHANGELOG.md` mới chỉ có `## [Unreleased]` và một dòng `### Added`, hướng người dùng, không có truyện nguyên nhân (AGENTS.md 'Changelog'). Rồi viết README theo files_to_copy[README.md] — gồm cả đoạn "đây không phải collab-web và không phải metaharness". Commit source đã chép, NOTICE, CHANGELOG, và thay đổi `package.json` gốc / `bun.lock` **CÙNG NHAU**; một commit chứa code MIT đã chép mà thiếu notice của nó là vi phạm giấy phép, không phải vấn đề văn phong. Neo: `packages/server/CHANGELOG.md`, `packages/server/README.md`, `packages/server/NOTICE`.

### Hợp đồng test

Bảy file test, 41 case, tất cả viết lại sang `bun:test`, tất cả ở mức hợp đồng. Không cái nào là static echo, không cái nào là success passthrough, không cái nào đọc text của một file implementation, và không cái nào dùng `mock.module()` (AGENTS.md cấm thẳng vì đột biến module-registry của Bun rò rỉ qua các file).

Mỗi file chứng minh điều gì, và người tiêu thụ quan sát thấy hỏng gì nếu nó thoái lui:

- `test/conformance.test.ts` (502 dòng, 20 case, 2 describe) — hợp đồng định tuyến attachment. Một client attach vào một `Session`, định tuyến một lời gọi service, rồi mất kết nối, phải quan sát thấy: attachment chỉ được release **sau khi** các lời gọi đã được nhận settle (một session không bao giờ bị đóng khi service call còn bay); một request từ connection KHÔNG giữ `{sessionId, attachmentId}` bị nhắm sẽ bị từ chối bằng `session_not_attached`; một attachmentId cũ sau khi đổi Session bị từ chối; một request gửi tới `serverId` khác bị từ chối **trước** mọi tra cứu repository; session lạ sinh `session_not_found` mà không dựng `Harness`; `sessionId` mơ hồ sinh `session_ambiguous` mà không dựng `Harness`; một `Harness` handle đã terminated bị đuổi và một lần attach sau đó thành công; shutdown của server đóng mọi routed handle. Đây là những bảo đảm mà một client remote-presentation phụ thuộc — thoái lui ở đây nghĩa là một guest hoặc mất session của nó, hoặc nói chuyện với một session đã chết.
- `test/protocol.test.ts` (168 dòng, 6 case) — hợp đồng framing/bắt tay trên một `ByteConnection` thuần in-memory (không socket, không port, không timer, hoàn toàn tất định). `hello` phải là message đầu tiên; một `PROTOCOL_VERSION` không được hỗ trợ bị từ chối; một frame bị chia đôi qua hai lần gọi `onData` giải mã ra kết quả giống hệt; `hello` thứ hai bị từ chối; một `hello` và một `request` gộp trong MỘT chunk byte được xử lý đúng thứ tự; một frame cuối bị cắt cụt được báo lỗi khi peer đóng. Hiệu ứng quan sát được: một client trên đường truyền chậm hay mất gói không bao giờ thấy một session nửa vời parse.
- `test/server.test.ts` (127 dòng, 6 case) — hợp đồng option và vòng đời. Một `serverId` không phải UUIDv4 và một mảng `listeners` thiếu đều bị từ chối bằng `TypeError`; `maxFrameLength`/`handshakeTimeoutMs` ngoài dải bị từ chối (kể cả vượt trần timer 2_147_483_647 ms của Node); một lần `start()` chạy đồng thời thứ hai bị từ chối mà không rò listener đã start; một bắt tay không bao giờ tới bị đóng kèm một frame `hello_error` **cuối cùng** trong lần ghi cuối; `close()` truyền lỗi thất bại khi shutdown listener thay vì resolve. Hiệu ứng quan sát được: một launcher cấu hình sai hỏng ngay lúc boot chứ không phục vụ một server nửa vời.
- `test/listener.test.ts` (52 dòng, 2 case) — hợp đồng ghép. Mọi listener được cấu hình đều start; nếu listener thứ N hỏng, listener 1..N-1 bị đóng. Hiệu ứng quan sát được: một server nhiều transport một phần không bao giờ chạy với nửa vòng transport.
- `test/unix.test.ts` (143 dòng, 6 case) — hợp đồng an toàn filesystem trên socket thật trong thư mục tạm. Một listener **còn sống** ở đường dẫn đích bị TỪ CHỐI, không bị unlink; một file thường ở đường dẫn đó không bao giờ bị unlink; một thư mục cha lồng nhau được tạo với mode 0o700 và socket để lại mode 0o600 rồi bị xoá khi close; một inode thay thế xuất hiện trong lúc shutdown KHÔNG bị xoá; một socket thật sự stale ĐƯỢC xoá trước khi bind. Đây là bộ test sắc nhất trong package: thoái lui nghĩa là server xoá file của người dùng. Nó dùng socket `node:net` thật và tiến trình con `fixtures/stale-socket-server.mjs`.
- `test/unix-connection.test.ts` (65 dòng, 1 case) — hợp đồng backpressure/thứ tự đóng: một frame lỗi protocol cuối cùng được xếp **SAU** output đang chờ thay vì đua với nó, nên client luôn đọc được lỗi trước EOF.
- `test/fixtures/stale-socket-server.mjs` (9 dòng) — không phải test; một listener `node:net` bind một đường dẫn rồi không bao giờ accept, dùng cho case stale-socket.

Các thay đổi test về phía migrate BẮT BUỘC: `vitest` → `bun:test` ở cả 7 file; hai import `BackgroundContext`/`SessionMetadata` trong `conformance.test.ts` được trỏ lại; hậu tố `.ts` bị bỏ khỏi 24 specifier tương đối trên 6 file test `.ts`. Mọi matcher `expect` upstream dùng (`toBe`, `toMatchObject`, `rejects.toThrow`, `resolves`, `toEqual`) đều tồn tại trong `bun:test`, nên không cần mổ xẻ test hành vi — nhưng **không phải file nào cũng chỉ đổi dòng import**: riêng `unix-connection.test.ts` phải thay `vi.waitFor` (dòng 48 và 60) bằng một poll helper cục bộ, vì `bun:test` không export `vi.waitFor`; 6 file còn lại chỉ đổi dòng import. Sau khi viết lại, hợp đồng ở trên **KHÔNG ĐỔI**: cùng 41 khẳng định, cùng tên, cùng những bảo đảm quan sát được.

Danh sách file, giữ nguyên tên:

- `packages/server/test/conformance.test.ts` (20 case) — từ `/Users/tranquangdang21/Projects/pi-ref/packages/server/test/conformance.test.ts`
- `packages/server/test/protocol.test.ts` (6 case) — từ `/Users/tranquangdang21/Projects/pi-ref/packages/server/test/protocol.test.ts`
- `packages/server/test/server.test.ts` (6 case) — từ `/Users/tranquangdang21/Projects/pi-ref/packages/server/test/server.test.ts`
- `packages/server/test/unix.test.ts` (6 case) — từ `/Users/tranquangdang21/Projects/pi-ref/packages/server/test/unix.test.ts`
- `packages/server/test/listener.test.ts` (2 case) — từ `/Users/tranquangdang21/Projects/pi-ref/packages/server/test/listener.test.ts`
- `packages/server/test/unix-connection.test.ts` (1 case) — từ `/Users/tranquangdang21/Projects/pi-ref/packages/server/test/unix-connection.test.ts`
- `packages/server/test/fixtures/stale-socket-server.mjs` (fixture `node:net` 9 dòng, không có test case) — từ `/Users/tranquangdang21/Projects/pi-ref/packages/server/test/fixtures/stale-socket-server.mjs`

### Xác minh

```bash
# GATE 1 — chặn, chạy được ngay hôm nay
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
# đo được exit 0 ở 23.8s wall cho cây 16 package; dự trù ~25s khi có package thứ 17
# nối check:tools (oxlint + `oxfmt --check` trên `packages/*/src/**/*.{ts,tsx}`,
# `{test,bench,examples,scripts}/**/*.ts`, `packages/*/*.ts`, `scripts/**/*.ts`
# — lưu ý test/fixtures/*.mjs khớp KHÔNG glob nào nên không bị lint, y hệt upstream)
# với `--filter './packages/*' --sequential --if-present check:types`,
# tức `tsgo -p tsconfig.json --noEmit` cho từng package

# GATE 2 — chạy được ngay, KHÔNG cần `brew install ninja`
bun test packages/server          # kỳ vọng đúng 41 case
# Lý do: chuỗi phụ thuộc của pi-server không chạm @oh-my-pi/pi-natives (chord chỉ dep esbuild;
# protocol chỉ dep chord+typebox; utils/acp/protocol là file type-thuần 466 dòng, không có import nào).
# Đã đo lúc addon CHƯA build: `bun test packages/omptype` xanh 1139 pass / 0 fail; chỉ packages/agent
# mới đỏ 46 test vì `tokenizer.ts:3` import natives. Addon nay đã build xong trên máy này
# (`brew install ninja` + `bun --cwd=packages/natives run build`, exit 0) nên cả repo chạy được.

# GATE 3 — cơ học, rẻ, và là cách DUY NHẤT chứng minh đợt viết lại chính xác
grep -rn '@earendil-works/' packages/server | wc -l                       # phải in 0
grep -rnoE 'from "\.[^"]*\.ts"' packages/server/src packages/server/test | wc -l   # phải in 0
# hai grep này là kiểm chứng build, KHÔNG phải test, và không được mã hoá thành file
# test (AGENTS.md cấm test source-grep)

# GATE 4 — pháp lý, không bỏ qua được
ls packages/server/NOTICE
grep -n 'd6af72e' packages/server/NOTICE | head -1
grep -n 'packages/server/NOTICE' THIRD-PARTY-NOTICES.txt
```

Nếu GATE 1 báo TS2307 nêu `@oh-my-pi/chord` hoặc `@oh-my-pi/pi-protocol`, tiền điều kiện của bước 1 chưa đáp. Nếu nó báo TS2307 nêu `@oh-my-pi/pi-agent-core`, bước 10 chưa áp. LƯU Ý về GATE 1: GATE 2 **chạy được ngay** — nếu nó đỏ thì đó là lỗi thật của lần migrate chứ không phải hạ tầng, nên hãy ghi thẳng kết quả thật vào PR thay vì đổ lỗi cho addon native.

### Cổng hoàn thành

`bun run check:ts` (chặn) + `bun test packages/server` (41 case; chạy được ngay, KHÔNG cần build native addon).

Cổng này **thực sự đỏ được** — `gate_can_fail` là `true`, và cả hai nhánh đều có đường đi ra thật: `check:ts` exit khác 0 khi TS2307 nêu một package anh em chưa có hoặc khi bước 10 chưa áp, còn `bun test` đỏ ngay khi số case không phải 41. Và **cả hai nhánh đều đỏ được ngay hôm nay**: nhánh test không cần addon native, nên đừng coi việc chỉ chạy `check:ts` là xanh — hãy chạy cả `bun test packages/server`.

### Rủi ro

**Rủi ro lớn nhất, cao, và rất dễ bỏ sót:** package này là sau cùng trong sáu package, và là cái duy nhất mà tiền đề đã nêu của nó không đứng vững.

Sự thật đã đo được trong bản tóm tắt — "omp đã có `pi-agent-core` và `pi-ai` dưới đúng tên đó, chỉ khác scope" — đúng về **TÊN** và sai về **PACKAGE**. `packages/agent/src` của omp là 50 file / 747.085 byte (trong đó 34 file `.ts` / 739.550 byte cộng 16 prompt `.md` / 7.535 byte) export 18 module phẳng; của pi là 117 file `.ts` / 1.145.928 byte với cả một subtree `harness/` — cùng mẫu đo thì là 34 `.ts` so với 117 `.ts`. `grep -rn 'SessionMetadata' packages/agent/src` trả 0. omp không có `Context`, không có `Session`, không có `MemorySessionRepo`, không có `SessionReader`, không có `SessionDirectory` — tất cả đều đo được 0 trên mọi package. Vậy nên `ServerHost<TMetadata extends SessionMetadata>` không có gì trong omp để bám vào, và 7 dòng import `pi-agent-core` không thể viết lại bằng thay scope; chúng là bề mặt tích hợp thật sự của package.

Nói vậy, mức phơi nhiễm hẹp hơn vẻ ngoài, và đó là phát hiện mang tính chống đỡ của spec này: trong năm symbol `pi-server` import từ `pi-agent-core`, **BỐN** (`Context`, `BACKGROUND_CONTEXT`, `TODO_CONTEXT`, `withAbortSignal`) không phải khái niệm agent-core — chính `pi` `packages/agent/src/harness/context.ts:14-25` re-export chúng nguyên văn từ `@earendil-works/chord/context`. Một khi `chord` đáp xuống, chúng đến từ `@oh-my-pi/chord/context` và phụ thuộc agent-core tan hơi. Còn lại đúng MỘT kiểu: `SessionMetadata`, một interface 6 trường. Đó là toàn bộ khe hở, và nó nhỏ đủ để đóng ngay trong package này (va chạm số 2) mà không phải chờ, hay chỉ đạo, một cuộc hoà giải `agent-core` nằm xa ngoài tầm.

Rủi ro thứ hai, và là cái khả năng cao nhất thực sự làm build hỏng: **bức tường `typebox`**. `pi-protocol` khai `typebox@1.3.27` và dựng mọi envelope type bằng `Static<typeof XSchema>` / `Type.Union`. Lockfile của omp chỉ có `@sinclair/typebox@0.34.52` — và nó là transitive CỦA package khác (khai ở `bun.lock:216`), không phải dependency trực tiếp, nên không thể tái dùng: version 0.x cùng API của nó không tương thích với `Type.Union` / `Static<typeof XSchema>` 1.x mà `pi-protocol` cần — cộng `@oh-my-pi/omptype`, vốn là một validator tương thích ArkType chứ không phải typebox. `pi-protocol` KHÔNG nằm trong catalog omp. `Server` không thể typecheck cho tới khi `pi-protocol` đáp xuống, và `pi-protocol` có thể cần một quyết định về thư viện schema riêng. Đây là một chuỗi, không phải một chi tiết: `pi-server` bị chặn sau một quyết định thuộc spec của package khác.

Rủi ro thứ ba, thấp hơn nhưng có thật: `session-router.ts` và `server.ts` là hai file mà một lần viết lại tinh vi biến một hợp đồng đồng thời đúng thành một cái tinh vi sai. `SessionRouter` serialize mọi thao tác theo từng client qua `runForClient`, giữ ba Map riêng biệt cộng một Set `disconnectedClients`, và phân biệt "release sau khi các lời gọi đã nhận settle" với "release ngay". 41 case (trong đó 20 case conformance là phần lõi) là thứ duy nhất đứng giữa một lần refactor và một race đóng session, và chúng **chạy được ngay** — hãy chạy GATE 2 sớm, đừng coi việc chuyển `vitest` → `bun:test` là cơ học tới khi thấy 41 case xanh.

Rủi ro thứ tư, và rẻ nhất để nói: `chord` kéo theo `esbuild@0.28.2`, vắng mặt ở omp. Đó là việc của spec `chord` giải, không phải của đợt này, nhưng nó nằm trên critical path và thuộc về kế hoạch milestone.

KHÔNG phải rủi ro: cuộc chạm với `collab-web` và `metaharness`. Đo, không phải giả định — `pi-server` là CBOR length-framed trên Unix socket với bắt tay có phiên bản; `collab-web` là WebSocket + relay room với AES-GCM; `metaharness` là `Bun.serve` REST+SSE. Ba transport, ba mô hình xác thực. Nghệ thuật lân cận thật là `packages/coding-agent/src/collab/registry.ts` (762 dòng `node:net` + host Unix socket JSON phân tách dòng), vốn KHÔNG được refactor sang `pi-server`, và spec nói rõ điều đó để câu hỏi được đóng thay vì tranh luận lại sau này.

### Cần người quyết

- **CHẶN — `SessionMetadata` sống ở đâu trong omp?** Khuyến nghị: khai interface 6 trường cục bộ trong `packages/server/src/types.ts` (va chạm số 2), làm package này đáp được độc lập. Các phương án thay thế: (a) đưa `harness/session/types.ts` của pi vào `pi-agent-core` của omp như lát đầu tiên của cuộc hoà giải agent-core, kéo `server` vào một quyết định lớn hơn nhiều; (b) để `ServerHost` generic về metadata mà không ràng buộc (`TMetadata = unknown`), diff nhỏ nhất nhưng làm yếu hợp đồng `resolveSession` mà `test/conformance.test.ts:334` và `:346` phụ thuộc. Chủ sở hữu nên chọn **trước bước 4**, vì nó đổi danh sách dependency trong `package.json`.
- Đợt sáu package có tên gọi gì cho lớp re-export Context của `chord`? Khuyến nghị ở đây là import `Context`/`BACKGROUND_CONTEXT`/`TODO_CONTEXT`/`withAbortSignal` trực tiếp từ `@oh-my-pi/chord/context`, khớp đúng đường re-export mà upstream dùng. Nếu đợt lại quyết định dựng một barrel `pi-agent-core/context` ở phía omp (hình dạng pi dùng), thì 4 lần trỏ của bước 10 biến thành 1 dòng import cho mỗi file — rẻ về mặt hình thức, nhưng là một ngã rẽ kiến trúc thật. Đáng để quyết, không đáng để chặn.
- Các literal service-id `pi.session-management` / `pi.session-directory` có được đổi sang namespace `omp.*` không? Đo được: **8** occurrence — `src/testing/host.ts:126`, `:136`, `src/testing/client.ts:66`, `test/conformance.test.ts:144`, `:174`, và `test/protocol.test.ts:57`, `:90`, `:129` (3 chỗ `pi.session-directory` nằm trong file test nên dễ bị bỏ sót, vì chúng không ở `src/`). Chúng là hằng protocol runtime do lớp durable/session-management sở hữu, không phải chuỗi scope, nên cố ý KHÔNG nằm trong `scope_rewrites`. nếu omp đổi thương hiệu namespace service, cả 8 chỗ đó đi theo quyết định đó — nhưng phần routing của chính `pi-server` là id-agnostic (nó chuyển tiếp `call.serviceId` một cách mờ), nên không gì ở nửa server quan tâm.
- `typebox@1.3.27` có vào catalog omp không, hay `pi-protocol` được port sang `@oh-my-pi/omptype`? Đây là câu trả lời thuộc spec `pi-protocol` nhưng nó chặn spec này: mọi `Static<typeof XSchema>` trong `protocol.ts` của `pi-protocol` là một phép chiếu kiểu thời gian biên dịch trên một schema runtime, và bề mặt ArkType của omptype không phải là thứ thay thế trực tiếp. Nếu câu trả lời là "port sang omptype", bề mặt viết lại của `pi-protocol` nở ra và ngày bắt đầu của `server` dịch theo.
- `fork(new URL('fixtures/stale-socket-server.mjs', import.meta.url), ...)` của `test/unix.test.ts` có chạy được dưới shim `node:child_process` của Bun không, gồm cả bắt tay `process.send('listening')` mà cha chờ? Không gì trong source trả lời được, và GATE 2 hiện không chạy được, nên điều đó **chưa kiểm chứng**. Nếu `fork` hỏng, thay fixture bằng một `createServer()` trong tiến trình bind rồi không bao giờ accept — cùng tiền điều kiện quan sát được, không có tiến trình con, và nó loại bỏ một test mà cả oxlint lẫn tsgo đều không nhìn thấy vì `.mjs` khớp không glob lint hay include nào của omp.
- Hai barrel `index.ts` (`transports/unix/index.ts`, `testing/index.ts`) dùng named re-export ở nơi AGENTS.md ưu tiên `export * from` trong barrel index thuần. Chuyển chúng sang star sẽ mới export `@internal` `UnixByteConnection` từ `./unix`, đổi public API. Spec giữ named re-export và gọi lệch lệch ra trong PR thay vì âm thầm nới bề mặt — nhưng nếu chủ sở hữu muốn tuân thủ AGENTS.md nghiêm, cách sửa là xoá claim trong comment export `@internal` và chấp nhận barrel rộng hơn.


---


## 4. `client` — phí điều phối vượt phí viết code

**Vị trí trong thứ tự migrate:** thứ 4 trong sáu, theo thứ tự bắt buộc `chord` → `protocol` → `server` → `client` → `telemetry` → `evals`. Không có đường đi nửa chừng: không một file src nào trong số 8 typecheck được nếu thiếu `chord` và `protocol`.

**Quy mô:** 19 file nguồn / 70483 byte. Phân rã theo đặc tả: 7 file src được chép (34985 byte, chưa tính file thứ 8 `packages/client/src/promise.ts` 582 byte bị cố ý xoá ở bước 7), 5 file test (27504 byte), 6 file metadata (7412 byte, trong đó chỉ `package.json` 1196 byte và `README.md` 4178 byte được port), cộng 1144 byte LICENSE MỚI. 8 × src + 5 × test + 6 × metadata = 19 file, 70483 byte. Xem ghi chú byte ở cuối mục kế tiếp.

Khối lượng sửa cơ học xấp xỉ 70 thao tác rời rạc trên 12 file, tất cả đều liệt kê được từ bảng file cần chép. Thực tế mất 1.5–2 giờ kể cả các lần chạy cổng. Nhưng phần tốn kém lớn hơn là phần phối hợp: gói này không thể bắt đầu khi `chord` và `protocol` chưa có mặt, và 8 trên 25 test còn không viết được cho tới khi `server` có mặt. Lịch do thứ tự 7 gói quyết định, không do kích thước của gói này.

**Cổng đỏ được:** `bun run check:ts` chạy từ `/Users/tranquangdang21/Projects/ultraworkers`.

### File cần chép

Bảng dưới đây liệt kê 18 mục, tổng 70192 byte.

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `packages/client/src/client.ts` | 14332 | chép rồi sửa | 3 sửa specifier: L18 `"@earendil-works/chord"` → `"@oh-my-pi/chord"`; L19 `"@earendil-works/chord/context"` → `"@oh-my-pi/chord/context"` (subpath phải được giữ — exports map của chord cần một mục `./context`); L30 `"@earendil-works/pi-protocol"` → `"@oh-my-pi/pi-protocol"` (đây là MỘT câu lệnh `import { ... } from` mở ở L20 và đóng ở L30, nên là một sửa scope phủ dòng đóng). Bỏ `.ts` khỏi 4 specifier tương đối. Xoá hẳn `from "./promise.ts"` (L33) và biến thân `#request` tại L248 thành `Promise.withResolvers<T>()`. Toàn bộ 479 dòng còn lại chép nguyên văn, gồm 12 field `#private` (L63-74), method `Symbol.asyncDispose` tại L394, rào hai hàng đợi tại L191-236, và cuộc đua abort/cancel tại L250-261. |
| `packages/client/src/connection.ts` | 7691 | chép rồi sửa | 5 sửa specifier: L9 pi-protocol; L10 `"./errors.ts"` → `"./errors"`; L11 `from "./promise.ts"` → **xoá cả dòng**; L12 `"./transport.ts"` → `"./transport"`; L13 `"./types.ts"` → `"./types"`. Rồi L72 `const handshake = createPromiseResolvers<ServerHello>();` → `const handshake = Promise.withResolvers<ServerHello>();`. Đó là trọn danh sách — 245 dòng còn lại chép nguyên văn, kể cả `ConnectionLifecycle` (L23-30), chốt `MAX_UINT32` tại L50-56, và hai chốt thứ tự handshake tại L146-148 cùng L182-185. |
| `packages/client/src/errors.ts` | 965 | chép rồi sửa | 1 sửa scope (L1 pi-protocol) + 1 thay thế + 1 import. Xoá `export function toError(error: unknown): Error { return error instanceof Error ? error : new Error(String(error)); }` ở L27-29 và thêm `import { toError } from "@oh-my-pi/pi-utils";` ở đầu file. `toDisconnectedError` (L31-34) ở lại và vẫn gọi `toError` nay đã import. `ServerError` (L3-11), `DisconnectedError` (L13-18), `ClientDisposedError` (L20-25) chép nguyên văn — cả ba đều tự đặt `this.name`. Sau khi sửa file còn ~33 dòng, xuất 4 symbol thay vì 5. |
| `packages/client/src/unix.ts` | 9703 | chép rồi sửa | 4 sửa specifier (L9 pi-protocol; L10 `"./client.ts"` → `"./client"`; L11 `"./errors.ts"` → `"./errors"`; L12 `"./transport.ts"` → `"./transport"`) + 1 sửa cấu trúc bị cấm. L247 `let timeout: ReturnType<typeof setTimeout> \| undefined;` → `let timeout: NodeJS.Timeout \| undefined;`. 299 dòng còn lại chép nguyên văn: `#writeTail` (L153, L171-176), ngưỡng byte tồn đọng (L166-169), bộ phân giải ghi chờ callback-AND-drain (L186-234), bể dò 16 socket song song (L61-82), bỏ qua ENOENT qua `lstat` (L69-74), bộ lọc lỗi 9 nhánh (L262-273). Các import `node:fs/promises` và `node:path` phải ĐỔI sang namespace theo quy tắc Node module imports của omp ("Always use **namespace imports** for `node:fs`, `node:path`, `node:os`"): L1 `import { lstat, readdir } from "node:fs/promises";` → `import * as fs from "node:fs/promises";`, L3 `import { join } from "node:path";` → `import * as path from "node:path";`, rồi đổi 3 call site (`readdir`→`fs.readdir` L47, `join`→`path.join` L56, `lstat`→`fs.lstat` L69). `node:net` KHÔNG đổi — nó không nằm trong danh sách của quy tắc. Cùng đợt đó hai file test chuyển namespace tương ứng (`unix.test.ts` L3,5 và `unix-transport.test.ts` L1,3). |
| `packages/client/src/types.ts` | 1139 | chép rồi sửa | 3 sửa specifier, không đổi logic: L1 chord; L2 pi-protocol; L3 `"./transport.ts"` → `"./transport"`. 32 dòng khai báo kiểu chép nguyên văn — mọi doc comment đều mang tính ràng buộc (hợp đồng cô lập của `onListenerError`, hợp đồng rào hydrate của `start()`, hợp đồng định danh logic-và-vật-lý của `serverId`, mặc định 1000 ms của discovery). |
| `packages/client/src/transport.ts` | 727 | chép nguyên văn | KHÔNG. 18 dòng, không import, không chuỗi scope, không specifier `.ts`, không cấu trúc bị cấm. Đã đúng dạng omp muốn. Doc comment ở đây là đặc tả mà phần cài unix được viết theo. |
| `packages/client/src/index.ts` | 428 | chép rồi sửa | CHUYỂN THÀNH BARREL SAO ĐẦY ĐỦ. Bản của pi dùng 4 câu lệnh re-export tường minh (L1 `export { Client, createClientServiceTransport } from "./client.ts"`, L2 `export { ClientDisposedError, DisconnectedError, ServerError } from "./errors.ts"`, L3 `export type { ByteTransport, ByteTransportFactory, ByteTransportHandlers } from "./transport.ts"`, L4-12 là `export type {...} from "./types.ts"` nhiều dòng). Viết lại toàn bộ file 12 dòng thành bốn star re-export, bỏ `.ts`: `export * from "./client";` / `export * from "./errors";` / `export * from "./transport";` / `export * from "./types";`. An toàn vì các tập export rời nhau, và `connection.ts`/`unix.ts` không nằm trong barrel. Hệ quả phải chấp nhận có chủ ý: dạng star làm package root MỚI xuất `toDisconnectedError` (hàm này ở lại errors.ts và pi KHÔNG export ở barrel tường minh) — đó là toàn bộ chênh lệch bề mặt API. `toError` KHÔNG xuất hiện ở package root: bước 8(d) biến nó thành một `import` trong errors.ts, mà `export *` không bao giờ re-export tên được import. Dù có muốn giữ tuyệt đối parity với upstream thì cũng KHÔNG được đưa danh sách tường minh trở lại. Dù có muốn giữ tuyệt đối parity với upstream thì cũng KHÔNG được đưa danh sách tường minh trở lại. |
| `packages/client/test/client.test.ts` | 13677 | chép rồi sửa | File test lớn nhất (384 dòng) và cần sửa nhiều nhất. Specifier: L1 chord/context; L2-7 pi-protocol; L9 `from "vitest"` → `from "bun:test"`; L16 `"../src/index.ts"` → `"../src/index"`; L17 `"./support.ts"` → `"./support"`. API của runner: L136 `await vi.waitFor(() => expect(updates.map(({ type }) => type)).toEqual(["state"]))` và L155 `await vi.waitFor(() => expect(updates).toHaveLength(3))` — `bun:test` KHÔNG có `vi.waitFor`, nên CẢ HAI phải thành một helper poll có giới hạn. omp không có `waitFor` trong pi-utils (verified: `git grep -n 'export .*waitFor\|export .*until(' -- 'packages/utils/src/**'` không trả về gì), nên viết một `async function waitFor(assertion: () => void, timeoutMs = 1000)` CỤC BỘ trong file test này, poll trên `Bun.sleep(5)` và ném lại lỗi assertion cuối cùng khi hết hạn. Bỏ `vi` khỏi import ở L9. Cả 20 khối `test(...)` / `describe(...)` port nguyên vẹn. |
| `packages/client/test/support.ts` | 2303 | chép rồi sửa | Specifier: L1-7 pi-protocol; L8 `"../src/index.ts"` → `"../src/index"`. Riêng tư (lý do file này được tách riêng): L14 `private handlers?: ByteTransportHandlers;` → `#handlers?`, L15 `private decoder = new ClientMessageDecoder();` → `#decoder`, L16 `private readonly messageWaiters: Array<{ count: number; resolve: () => void }> = [];` → `#messageWaiters`, L76 `private resolveMessageWaiters(): void {` → `#resolveMessageWaiters()`. Rồi sửa 18 tham chiếu `this.X` trên 17 dòng: L23,24,28,30,44(x2),51,55,56,60,61,65,66,71,72,77,78,80. ĐỂ TRẦN các thành viên công khai `messages` (L10), `serverId` (L11), `clientCloseCount` (L12) và các method công khai `connect` (L22), `waitForMessages` (L48), `send` (L54), `sendRaw` (L59), `disconnect` (L64), `error` (L70) — test đọc tất cả chúng. L51 `new Promise((resolve) => this.messageWaiters.push(...))` giữ nguyên dạng (một giá trị, không reject). |
| `packages/client/test/unix-transport.test.ts` | 4765 | chép rồi sửa | Specifier: L4 chord; L5 pi-protocol; L6 `from "vitest"` → `from "bun:test"`; L7 `"../src/index.ts"` → `"../src/index"`; L8 `"../src/unix.ts"` → `"../src/unix"`. Cả 3 test port nguyên vẹn. Khối `afterEach` (L27-48) dọn socket, server và thư mục tạm — GIỮ NGUYÊN, đó là thứ làm các test này an toàn khi chạy cùng cả suite. Các site `new Promise<void>` tại L27 (server.listen) và L39 (server.close) là do sự kiện điều khiển, giữ nguyên dạng. |
| `packages/client/test/unix.test.ts` | 6513 | chép rồi sửa | Specifier: L6 `from "vitest"` → `from "bun:test"`; L7 `"../../server/src/server.ts"`, L8 `"../../server/src/testing/host.ts"`, L9 `"../../server/src/transports/unix/listener.ts"` → đổi thành specifier PACKAGE `"@oh-my-pi/pi-server"`, `"@oh-my-pi/pi-server/testing/host"`, `"@oh-my-pi/pi-server/transports/unix/listener"` (bỏ extension, xuyên package) — điều này ĐÒI hỏi gói server đã có mặt và export các subpath đó. L10 `"../src/unix.ts"` → `"../src/unix"`. Đây là file biến client thành gói thứ 3 trong chuỗi. 8 test port nguyên vẹn, gồm `fork(new URL("fixtures/stale-socket-server.mjs", import.meta.url), [path], { ... })` tại L126 vốn cần fixture ở đúng đường dẫn tương đối đó. Các `Set` ở cấp module (L10-14: tempDirectories, servers, rawServers, rawSockets, children) và `afterEach` tại L183+ là câu chuyện an toàn-suite-đầy-đủ cho file này và phải sống sót qua port nguyên vẹn. |
| `packages/client/test/fixtures/stale-socket-server.mjs` | 246 | chép nguyên văn | KHÔNG. 9 dòng JS thuần, không import mã đã migrate, không chuỗi scope, chỉ có `node:net` và `process.argv`. Nó được fork bởi `unix.test.ts:126` và phải nằm ở đúng đường dẫn tương đối để `new URL(...)` phân giải được. |
| `packages/client/package.json` | 1196 | chép rồi sửa | KHÔNG chép nguyên văn — hình dạng package.json của omp khác về cấu trúc. Dựng theo `packages/wire/package.json` làm khuôn. L2 `"name"` → `"@oh-my-pi/pi-client"`; XOÁ `"main": "./dist/index.js"` và `"types": "./dist/index.d.ts"` — omp phát hành mã nguồn, nên main/types trỏ vào `./src/index.ts`; bản `exports` thành dạng nhà của omp: `"."` → `./src/index.ts`, một subpath `"./unix"` → `./src/unix.ts` (subpath này mang tính nạp — đó là cách tới `createUnixTransportFactory` và `discoverUnixServers`, và là cách giữ import `node:net` ở ngoài các consumer Node chỉ cần client trung lập vận tải), cộng một passthrough `"./package.json"`; `sideEffects: false` thì giữ được. XOÁ cả khối `scripts` — đó cũng là chỗ dọn `build: tsc -p tsconfig.build.json` và `typecheck: tsc -p tsconfig.test.json` của pi, hai lệnh mà AGENTS.md cấm tuyệt đối (`Never use \`tsc\`/\`npx tsc\``) — rồi thay bằng NĂM script của omp: `check` (`oxlint . && oxfmt --check --no-error-on-unmatched-pattern 'src/**/*.{ts,tsx}' '{test,bench,examples,scripts}/**/*.ts' '*.ts' && bun run check:types`), `check:types` (`tsgo -p tsconfig.json --noEmit`), `lint`, `fix`, `fmt` — chép nguyên văn từ `packages/wire/package.json`. `check:types` BẮT BUỘC phải có, nếu không gói bị cổng gốc bỏ qua âm thầm. `dependencies`: chord → `@oh-my-pi/chord` và `@oh-my-pi/pi-protocol` → `@oh-my-pi/pi-protocol`, cả hai ở `catalog:`. XOÁ hẳn khối `devDependencies` rồi dựng lại thành đúng một mục: `devDependencies` chỉ có `"@types/bun": "catalog:"` — `shx` và `vitest` đều sai với omp, còn `@types/bun` thì 15/16 package omp đều khai báo (chỉ `packages/tui` không) và mã chép dùng `NodeJS.Timeout` lẫn `Bun.sleep` trong khi tsconfig của repo khoá `"types": ["bun", "assets"]`. Thêm `"@oh-my-pi/pi-utils": "catalog:"` cho import `toError`. `engines`: `node >=22.19.0` → `bun >=1.3.14`. |
| `packages/client/tsconfig.json` | 0 | bỏ | KHÔNG chép `tsconfig.build.json` hay `tsconfig.test.json` của pi (293 + 560 byte) — cả hai là tàn dư của monorepo pi. Cấu hình build của pi ánh xạ `@earendil-works/pi-protocol` tới `../protocol/dist/index.d.ts` (một đường dẫn ĐÃ build) và cấu hình test của nó ánh xạ bốn package anh em tới `src/` của chúng. omp không có quy ước `dist` lẫn quy ước `paths` tương đối monorepo: phân giải workspace là của chính Bun (xem `packages/wire/package.json`, vốn export thẳng `./src/index.ts`, và tsconfig của nó là file 4 dòng extend `../tsconfig.workspace.json` với `"include": ["src", "test"]`). VIẾT một `packages/client/tsconfig.json` 4 dòng mới, khớp chính xác `packages/wire/tsconfig.json`. File mới này tính là TẠO MỚI, không phải chép. |
| `packages/client/vitest.config.ts` | 463 | bỏ | XOÁ, không port. Toàn bộ nội dung là điện ốc vitest: `environment: "node"`, chọn reporter theo GITHUB_ACTIONS, và một `resolve.alias` ánh xạ `@earendil-works/pi-protocol` tới `../protocol/src/index.ts` cộng `conditions: ["source"]`. Không phần nào áp dụng: omp chạy `bun test`, Bun phân giải package workspace natively không cần bảng alias, và môi trường mặc định của `bun test` đã có sẵn node builtins. Port nó sẽ thêm một file cấu hình cho một test runner mà omp không dùng. |
| `packages/client/LICENSE` | 1144 | chép rồi sửa | NGHĨA VỤ PHÁP LÝ — xem bước 1. File MỚI. Chép `/Users/tranquangdang21/Projects/pi-ref/LICENSE` nguyên văn, rồi chèn hai dòng bản quyền của omp sau dòng của Mario Zechner, tái tạo đúng thứ tự 3 dòng của LICENSE gốc. Dạng cuối: `MIT License` / trống / `Copyright (c) 2025 Mario Zechner` / `Copyright (c) 2025-2026 Can Bölük` / `Copyright (c) 2026 Stencil Labs, Inc.` / trống / văn bản MIT permission không sửa. `packages/client/LICENSE` phải tồn tại TRƯỚC byte nguồn chép đầu tiên. |
| `packages/client/README.md` | 4178 | chép rồi sửa | 5 sửa chuỗi scope: L1 (tiêu đề) và L6, L51, L52, L64 (trong ba mẫu code fenced cho `Client.connect`, `createUnixTransportFactory`, `discoverUnixServers`). Cần viết lại nội dung ngoài phép đổi scope: README của pi mở đầu bằng cách gọi protocol là "experimental" và nói rằng API server/Session có kiểu được cung cấp bởi chord service bindings do ứng dụng sở hữu — hãy định hướng lại khung này cho omp, và thêm một dòng nói `@oh-my-pi/pi-client` hiện KHÔNG có consumer nào trong omp (bộ điều khiển `RemoteSession` nằm trong coding-agent của pi, tương đương của omp là một hạng mục công việc riêng). Giữ nguyên danh sách hợp đồng transport handler, đoạn về ngữ nghĩa discovery Unix, và đoạn kết về `maxFrameLength`/`maxPendingBytes` — đó là hợp đồng hành vi, không phải tiếp thị. |
| `packages/client/CHANGELOG.md` | 722 | bỏ | KHÔNG CHÉP. File của pi là 33 dòng tiêu đề phiên bản `## [0.x.y]` rỗng (một stub lịch sử phát hành) cộng hai mục thời 0.84.0 tham chiếu số PR upstream (#7708) vô nghĩa trong omp. Theo AGENTS.md của omp, changelog được soạn mới dưới `## [Unreleased]` khi mở PR. Chép CẤU TRÚC: `# Changelog`, trống, `## [Unreleased]`, trống, `### Added`, trống, một dòng `Added the transport-neutral remote-session client ...` — số PR điền sau khi được cấp. |

Ghi chú về byte: cột `bytes` của bảng này liệt kê 18 mục và cộng lại đúng 70192 byte. Đặc tả giải thích phần chênh bằng cách trừ 1144 byte LICENSE mới, 0 byte tsconfig mới, và 1435 byte của ba file cố ý bỏ (`tsconfig.build.json` 293 + `tsconfig.test.json` 560 + `src/promise.ts` 582). Đối chiếu số học trong đặc tả không khớp: 70483 − 1144 − 0 − 1435 = 67904, khác 70192. Cột `bytes` ở đây được giữ nguyên văn theo từng file; đừng dùng bất kỳ tổng byte nào làm căn cứ lên kế hoạch.

### Bề mặt công khai

25 symbol. Hai symbol đã có sẵn ở omp (`toError`, và cặp `PromiseResolvers`/`createPromiseResolvers` sẽ bị xoá); 23 symbol còn lại là mới.

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa |
| --- | --- | --- | --- | --- |
| `Client` | class | `packages/client/src/client.ts:62` | không có | chưa |
| `createClientServiceTransport` | function | `packages/client/src/client.ts:448` | không có | chưa |
| `ServerError` | class | `packages/client/src/errors.ts:3` | không có | chưa |
| `DisconnectedError` | class | `packages/client/src/errors.ts:13` | không có | chưa |
| `ClientDisposedError` | class | `packages/client/src/errors.ts:20` | không có | chưa |
| `toError` | function | `packages/client/src/errors.ts:27` | `packages/utils/src/type-guards.ts:15`, re-export ở `packages/utils/src/index.ts:41` | **CÓ** — bản trùng lặp chính xác |
| `toDisconnectedError` | function | `packages/client/src/errors.ts:31` (sau khi xoá, thành L23 mới) | không có | chưa |
| `ByteTransport` | interface | `packages/client/src/transport.ts:1` | không có | chưa |
| `ByteTransportHandlers` | interface | `packages/client/src/transport.ts:8` | không có | chưa |
| `ByteTransportFactory` | type | `packages/client/src/transport.ts:18` | không có | chưa |
| `ConnectionState` | type | `packages/client/src/types.ts:5` | không có | chưa |
| `ConnectionStateChange` | interface | `packages/client/src/types.ts:7` | không có | chưa |
| `Unsubscribe` | type | `packages/client/src/types.ts:12` | chỉ trùng văn xuôi | chưa |
| `ListenerErrorHandler` | type | `packages/client/src/types.ts:13` | không có | chưa |
| `AttachmentChangeListener` | type | `packages/client/src/types.ts:14` | trùng tên khác nghĩa | chưa |
| `ServiceSubscription` | interface | `packages/client/src/types.ts:16` | không có | chưa |
| `ClientOptions` | interface | `packages/client/src/types.ts:25` | chỉ trùng trong ví dụ lint-rule | chưa |
| `Connection` | class | `packages/client/src/connection.ts:41` | không có export trùng tên | chưa |
| `PromiseResolvers` | interface | `packages/client/src/promise.ts:1` | `Promise.withResolvers` đã là idiom | **CÓ** — bị thay thế, xoá file |
| `createPromiseResolvers` | function | `packages/client/src/promise.ts:8` | `Promise.withResolvers` đã là idiom | **CÓ** — bị thay thế, xoá file |
| `UnixTransportOptions` | interface | `packages/client/src/unix.ts:19` | không có | chưa |
| `UnixServerRoute` | interface | `packages/client/src/unix.ts:24` | không có | chưa |
| `DiscoverUnixServersOptions` | interface | `packages/client/src/unix.ts:29` | không có | chưa |
| `discoverUnixServers` | function | `packages/client/src/unix.ts:37` | không có | chưa |
| `createUnixTransportFactory` | function | `packages/client/src/unix.ts:88` | không có | chưa |

Vài điểm đáng đọc kèm bảng:

- `Client` là class 448 dòng với 12 member, tất cả đã dùng ES `#private` (L63-74) nên quy tắc riêng tư của lớp không cần sửa gì. Verified: `git grep -n 'export class Client\b\|export { Client\|export type { Client' -- 'packages/*'` không trả về gì — tên trần đó trống. omp có 57 file chứa chữ `Client` nhưng mọi cái đều dài hơn: `AuthBrokerClient` (packages/ai/src/auth-broker/client.ts:129), `AnthropicHttpClient` (packages/ai/src/providers/anthropic-client.ts:208), `AnthropicMessagesClient` (:191), `DapClient` (packages/coding-agent/src/dap/client.ts:54), `RpcClient` (packages/coding-agent/src/modes/rpc/rpc-client.ts).
- `ByteTransport` có hai member: `send(chunk: Uint8Array): Promise<void>` và `close(): void`. Đây là mối ghép làm cho cả gói trung lập với vận tải. KHÔNG đổi tên nó để khớp bất cứ thứ gì ở omp.
- `ConnectionState` là union ba trạng thái, không có trạng thái thứ tư "failed" — một kết nối hỏng quay về `disconnected` mang theo lỗi trên sự kiện đổi trạng thái (connection.ts:239).
- `ConnectionStateChange` là `{ state: ConnectionState; error?: Error }` — lỗi tùy chọn là KÊNH DUY NHẤT để một lần kết nối thất bại tới ứng dụng; không gì ném bất đồng bộ.
- `AttachmentChangeListener` là khái niệm địa chỉ durable mà omp không có từ vựng cho: 5 hit `attachment*` ở omp đều là file đính kèm trong composer TUI (packages/tui/src/prompt/composer-attachments.ts:175,177,221,225 — các marker `attachment://`), hoàn toàn là thứ khác. Đổi tên khi nhìn thấy là SAI; giữ tên của pi.
- `DisconnectedError` nhận `cause` tuỳ chọn, và `unix.ts:266` phụ thuộc vào điều đó: discovery coi `error instanceof DisconnectedError && error.cause === undefined` là socket chết. Bỏ dây cause sẽ khiến socket chết ném lỗi trong lúc discovery thay vì bị lọc đi.
- `discoverUnixServers` là function duy nhất trong gói tự dựng một `Client` hoàn chỉnh ở bên trong (unix.ts:240), chỉ để chạy một handshake. Tập lọc lỗi tại L262-273 tự nó là một hợp đồng: timeout, ProtocolValidationError, DisconnectedError không có cause, ServerError sai phiên bản, và ENOENT/ECONNREFUSED/ECONNRESET/EPIPE/ETIMEDOUT đều bị lặng lẽ bỏ qua; bất cứ thứ gì khác sẽ khiến toàn bộ discovery bị từ chối. Mất một mã là một endpoint chết sẽ chặn discovery cho mọi socket trong thư mục.
- `createUnixTransportFactory` trả về một factory, không phải một transport — mỗi lần thử kết nối nhận một socket mới, đó là điều cho phép `Client.reconnect()` (client.ts:134) hoạt động sau một lỗi. Nó cũng kiểm tra `process.platform !== "win32"` (L99); omp có cùng mẫu guard tại packages/coding-agent/src/blob-broker/daemon.ts:76,115, nên đây là cách làm quen thuộc chứ không xa lạ.
- `UnixServerRoute` dùng `ServerId` thương hiệu hoá của pi-protocol — đó là lý do `unix.ts` không thể typecheck trước khi gói protocol có mặt.
- `Connection` KHÔNG nằm trong barrel của package (index.ts chỉ export từ client.ts/errors.ts/transport.ts/types.ts) nên về thực tế là nội bộ. Verified: `git grep -n 'export class Connection\b\|export { Connection' -- 'packages/*'` rỗng; 20 file dùng chữ này nhưng toàn là biến cục bộ hoặc một field `#server`.

### Dependency mới

Ba dependency, đều ở `catalog:`:

| tên | phiên bản | đã có ở omp | vì sao |
| --- | --- | --- | --- |
| `@oh-my-pi/chord` | 18.3.3 (workspace catalog, khớp mọi package khác của omp — thêm một dòng vào khối `workspaces.catalog` ở package.json gốc) | chưa | Phụ thuộc cứng, 17 symbol đặt danh trên 4 file. `src/client.ts:2-18` import `createServiceCatalogueCall`, `createServiceStateDecoder`, `createServiceSubscribeCall`, `createServiceUnsubscribeCall`, `JsonValue`, `parseServiceCall`, `parseServiceCatalogue`, `parseWireServiceProviderUpdate`, `parseWireServiceSubscriptionSnapshot`, `RemoteServiceTransport`, `ServiceCall`, `ServiceCatalogueEntry`, `ServiceMode`, `ServiceProviderUpdate`, `ServiceStateDecoder`, `ServiceSubscriptionSnapshot`; `src/client.ts:19` thêm import `BACKGROUND_CONTEXT` từ SUBPATH `@oh-my-pi/chord/context`; `src/types.ts:1` import `ServiceSubscriptionSnapshot`; `test/client.test.ts:1` import `BACKGROUND_CONTEXT` từ cùng subpath đó; `test/unix-transport.test.ts:4` import `parseServiceCall`. Kiểu trả về của `createClientServiceTransport` CHÍNH LÀ `RemoteServiceTransport` của chord. |
| `@oh-my-pi/pi-protocol` | 18.3.3 (workspace catalog) | chưa | Phụ thuộc cứng, 21 symbol đặt danh trên 8 file (37 lần xuất hiện trong câu import) — bề mặt rộng nhất trong toàn bộ đợt migrate này. `src/client.ts:20-30` import `AttachmentEnvelope`, `encodeClientMessage`, `isServerId`, `ProtocolValidationError`, `ResponseEnvelope`, `RpcTarget`, `ServerHello`, `ServiceEventEnvelope`, `SessionTarget`; `src/connection.ts:2-9` import `DEFAULT_MAX_FRAME_LENGTH`, `encodeClientMessage`, `PROTOCOL_VERSION`, `ProtocolValidationError`, `ServerHello`, `ServerMessage`, `ServerMessageDecoder`; `src/unix.ts:4-9` import `DEFAULT_MAX_FRAME_LENGTH`, `isServerId`, `ProtocolValidationError`, `ServerId`; `src/errors.ts:1` import `ProtocolError`, `ProtocolErrorCode`; `src/types.ts:2` import `RpcTarget`, `SessionTarget`; `test/client.test.ts:2-7` import `encodeCbor`, `encodeFrame`, `encodeServerMessage`, `PROTOCOL_VERSION`, `ProtocolValidationError`; `test/support.ts:1-7` import `ClientMessage`, `ClientMessageDecoder`, `encodeServerMessage`, `PROTOCOL_VERSION`, `ServerMessage`; `test/unix-transport.test.ts:5` import `ClientMessageDecoder`, `encodeServerMessage`, `PROTOCOL_VERSION`. `ServerId` thương hiệu hoá trong `UnixServerRoute` nghĩa là subpath `./unix` không typecheck được nếu thiếu nó. |
| `@oh-my-pi/pi-utils` | 18.3.3 (workspace catalog) | **đã có** | Đã ở omp, nhưng đây là gói đầu tiên trong đợt migrate khai báo dependency MỚI lên nó. Cần đúng một symbol: `toError`, thay cho bản sao giống hệt từng byte của pi tại `src/errors.ts:27`. Không có nó thì gói sẽ mang theo một hiện thực thứ hai của một helper mà quy tắc Central Utilities cấm. |

License: `chord` và `pi-protocol` đều MIT (Copyright (c) 2025 Mario Zechner) — cùng dòng thông báo mà LICENSE gốc của omp đã mang ở dòng 3 và `THIRD-PARTY-NOTICES.txt:227`. `pi-utils` là first-party của omp, không phải thông báo bên thứ ba.

**Cái KHÔNG thêm, và vì sao.** `@earendil-works/pi-ai` (2 lần), `@earendil-works/pi-telemetry` (1 lần) và `@earendil-works/pi-agent-core` (1 lần) — cả bốn chuỗi scope này CHỈ tồn tại trong `tsconfig.test.json` của pi, mà đặc tả này xoá. Chúng không cần viết lại chút nào. Nếu sau này một quyết định nào đó hồi sinh tsconfig test thì lúc đó mới phải viết lại, và việc xoá là có chủ ý phải được xác nhận để không ai sau này grep thấy chuỗi `@earendil-works` chưa viết lại rồi báo là sót.

Ngoài ra, `esbuild` — dependency bên ngoài duy nhất mà đợt migrate này kéo vào — đến từ `chord`, không phải từ client. Nó vắng mặt trong `node_modules` của omp (verified), và đó là lý do client phải đến SAU chord.

### Va chạm với thứ omp đã có

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| `toError(error: unknown): Error` | `packages/client/src/errors.ts:27` | `packages/utils/src/type-guards.ts:15`, re-export bởi `packages/utils/src/index.ts:41` qua `export * from "./type-guards"` | **THAY, không nhân bản.** Xoá định nghĩa ở `src/errors.ts:27-29`, thêm `import { toError } from "@oh-my-pi/pi-utils";` ở đầu errors.ts, và giữ `toDisconnectedError` (hàm gọi nó) export từ cùng module — `connection.ts:10` và `unix.ts:11` đều import nó từ `"./errors"`. Không đổi bất kỳ bề mặt công khai nào: `toError` không nằm trong barrel `index.ts` hôm nay và không được thêm vào. Cơ sở là chính quy tắc Central Utilities của omp. Khác biệt hành vi duy nhất cần biết: tham số của pi tên là `error`, của omp tên là `value` — vô hại lúc chạy, và không call site nào dùng named argument. |
| `PromiseResolvers<T>` / `createPromiseResolvers<T>()` | `packages/client/src/promise.ts:1-16` (cả file); doc comment ở dòng 7: "Remove in favor of `Promise.withResolvers()` when the repository's TypeScript lib baseline moves to ES2024." | `Promise.withResolvers` đã là idiom nhà: packages/agent/src/agent-loop.ts (3 chỗ), packages/agent/src/agent.ts (3), packages/agent/src/pause.ts (2), packages/agent/src/live-steering.ts:1, packages/agent/src/speculative-execution.ts:1 | **XOÁ cả `promise.ts`, đừng chép.** Hai call site: `src/client.ts:248` `const { promise, resolve, reject } = createPromiseResolvers<T>();` → `Promise.withResolvers<T>()`; `src/connection.ts:72` `const handshake = createPromiseResolvers<ServerHello>();` → `Promise.withResolvers<ServerHello>()`. Rồi xoá specifier `type PromiseResolvers` khỏi import ở `connection.ts:11` (dòng import đó trở thành rỗng vì `promise.ts` không còn tồn tại). Hệ quả: số file src giảm từ 8 xuống 7. Ba site `new Promise(` còn lại trong src/ (unix.ts:109, unix.ts:188, unix.ts:251) GIỮ nguyên dạng — chúng resolve từ sự kiện socket và timeout, không phải từ một cặp resolver hai giá trị, nên `withResolvers` không áp dụng. |
| `ReturnType<typeof setTimeout>` tại `src/unix.ts:247` | `let timeout: ReturnType<typeof setTimeout> \| undefined;` | Không phải va chạm tên — đây là vi phạm quy tắc: "NEVER use `ReturnType<>` — use the actual type name." Cách viết đúng kiểu omp nhìn thấy tại `packages/coding-agent/src/collab/relay-client.ts:100` (`#retryTimer: NodeJS.Timeout \| undefined;`) | **VIẾT LẠI** thành `let timeout: NodeJS.Timeout \| undefined;`. Verified đây là `ReturnType<` DUY NHẤT trong src/ hoặc test/ (một hit). Biến được dùng ở L252 (`timeout = setTimeout(...)`) và L256 (`timeout.unref()`), cả hai đều tương thích Node, nên `NodeJS.Timeout` định kiểu đúng và giữ được `.unref()`. |
| 4 khai báo `private` trong `test/support.ts` | `packages/client/test/support.ts:14`, `:15`, `:16`, `:76`, cộng 18 tham chiếu `this.X` trên 17 dòng: L23,24,28,30,44(x2),51,55,56,60,61,65,66,71,72,77,78,80 | Không phải va chạm — vi phạm quy tắc: "Class privacy: use ES `#private` fields… No `private`/`protected`/`public` keyword on fields or methods, except on constructor parameter properties." | **VIẾT LẠI** 4 khai báo thành `#handlers?`, `#decoder`, `#messageWaiters`, `#resolveMessageWaiters()` và cập nhật cả 18 site `this.X` thành `this.#X`. Đây là file DUY NHẤT trong gói cần làm vậy: `grep -n '^\s*\(private\|public\|protected\)\s'` trên src/ và test/ chỉ trúng trong `test/support.ts` — cả 8 file src đã dùng ES `#` thuần (verified: client.ts L63-74 có 12 field `#`, connection.ts L42-45, unix.ts L148-153, L162-165). Lưu ý `messages`, `serverId` và `clientCloseCount` của `MemoryByteServer` là public và PHẢI Ở LẠI public — test đọc chúng. |
| Tên class trần `Client` và `Connection` | `packages/client/src/client.ts:62`, `packages/client/src/connection.ts:41` | Mọi hit ở omp đều là tên dài hơn hoặc không liên quan. Ví dụ: `AuthBrokerClient` (packages/ai/src/auth-broker/client.ts:129), `AnthropicHttpClient` (packages/ai/src/providers/anthropic-client.ts:208), `AnthropicMessagesClient` (:191), `AnthropicUserProfilesClient` (:115), `CodexWebSocketTransportError` (packages/ai/src/providers/openai-codex-responses.ts:5092), `DapClient` (packages/coding-agent/src/dap/client.ts:54), `MCPWrappedTool` (packages/coding-agent/src/exa/mcp-client.ts:312), `HindsightApi` (packages/coding-agent/src/hindsight/client.ts:238), `IdaDatabase` (packages/coding-agent/src/ida/client.ts:152), và `RpcClient` (packages/coding-agent/src/modes/rpc/rpc-client.ts) — cái cuối gần nhất về vai trò | **GIỮ NGUYÊN TÊN CỦA PI.** Verified: không export nào ở omp mang tên trần `Client` lẫn `Connection`. Nguy cơ thật là một file TƯƠNG LAI import cả `Client` của pi-client lẫn `RpcClient` của coding-agent; nếu xảy ra, hãy alias tại chỗ import (`import { Client as RemoteSessionClient }`) chứ đừng đổi tên class đã migrate. Giữ trung thành tên upstream là mục đích của một lần migrate dựa trên chép — đừng "cải thiện" các tên này. |
| `ServerError`, `ProtocolErrorCode`, `ProtocolError` | `packages/client/src/errors.ts:3`, `src/errors.ts:1` | 0 export `ServerError` ở omp. `ProtocolError` khớp đúng 1 file (packages/coding-agent/src/eval/py/runner.py:2246,2256) và cả hai hit là docstring Python cùng string literal `"ename": "ProtocolError"` — không phải TypeScript. `ProtocolErrorCode` có 0 ref. | **GIỮ CẢ HAI NGUYÊN VĂN; hôm nay không xung đột.** Ghi chú hướng tới tương lai thuộc về đặc tả coding-agent, không thuộc đặc tả này: coding-agent của pi đã import đúng class này dưới một bí danh (`import { ServerError as ClientServerError } from "@earendil-works/pi-client"` tại packages/coding-agent/src/experimental/server.ts:14 và test/experimental-remote-runtime.test.ts:6) vì package đó có class `ServerError` riêng. Khi coding-agent của omp bắt đầu dùng gói này, nó phải lặp lại việc alias đó. KHÔNG đổi tên trước ở đây. |
| Tên package `@oh-my-pi/pi-client` và đường consumer dự kiến `@oh-my-pi/pi-coding-agent/client` | `packages/client/package.json:2` (`"name": "@earendil-works/pi-client"`), và `packages/coding-agent/src/client/index.ts:1` trong repo pi (`export * from "@earendil-works/pi-client";`) | `packages/coding-agent/package.json` KHÔNG có subpath `./client` trong exports map (verified: danh sách export chạy `.`, `./*`, `./async`, `./autoresearch`, `./capability`, `./cli/*`, … `./web/*`, `./prompts/*`, `./*.js` — không có `./client`), và `packages/coding-agent/src/` KHÔNG có thư mục `client/` | **KHÔNG SỬA gì trong coding-agent của omp ở bước này** — đó là việc của đặc tả coding-agent. Nhưng GHI LẠI đường dẫn đã dành ở đây để hai đặc tả khớp nhau: khi coding-agent được nối, nó sẽ có `packages/coding-agent/src/client/index.ts` chứa `export * from "@oh-my-pi/pi-client";` cộng một mục `"./client"` trong exports map. Re-export đó là star re-export, thoả quy tắc barrel của omp. Cho tới lúc đó gói này có ZERO consumer trong omp — một sự thật mà mục Rủi ro dựa vào. |
| `ClientOptions`, `Unsubscribe` | `packages/client/src/types.ts:25`, `packages/client/src/types.ts:12` | `ClientOptions`: 2 file — packages/coding-agent/src/discovery/builtin-rules/ts-import-type.md:24,31,35 và ts-no-deprecated-leftovers.md:26,36, tất cả nằm trong chuỗi mã ví dụ cho lint rule. `Unsubscribe`: 4 file — packages/coding-agent/src/mcp/client.ts:425 (văn xuôi JSDoc), packages/coding-agent/src/extensibility/hooks/runner.ts:149 (thẻ `@returns`), packages/coding-agent/src/mcp/manager.ts:505,1685 (comment inline), cộng một hit trong `packages/coding-agent/test/fixtures/before-compaction.jsonl` (transcript test đã ghi) mà `git grep` không lọc sẽ thấy. Không cái nào là TypeScript. | **KHÔNG LÀM GÌ.** omp không export kiểu nào mang hai tên này; mọi khớp đều nằm trong string literal và comment, không thể tạo import mơ hồ. Liệt kê ở đây chỉ để người review sau này grep hai tên này không nhầm các hit là va chạm thật. |

Đây là mục quan trọng nhất, nên nhắc lại những gì đã được giải quyết bằng quyết định chứ không phải bằng phớt lờ: tên `Client`, `Connection`, `ServerError`, `ClientOptions`, `Unsubscribe`, `AttachmentChangeListener` được giữ nguyên văn có chủ ý. Việc giữ cả hai bên mà không đổi tên là phần của thiết kế, và người đọc cần biết đó là quyết định — cột cuối của bảng ghi rõ điều đó cho từ trường hợp.

### Các bước

1. **PHÁP LÝ TRƯỚC, trước khi một byte nguồn nào được viết ra.** Chép `/Users/tranquangdang21/Projects/pi-ref/LICENSE` sang `packages/client/LICENSE` và chèn hai dòng bản quyền của omp sau dòng của Mario Zechner, để file đọc: `Copyright (c) 2025 Mario Zechner` / `Copyright (c) 2025-2026 Can Bölük` / `Copyright (c) 2026 Stencil Labs, Inc.` Đây là byte-identical với LICENSE gốc của omp và với bốn `packages/*/LICENSE` pi-derived (agent, ai, coding-agent, tui — đều 1144 byte). Tám gói chỉ có mã first-party (catalog, mnemopi, natives, omptype, snapcompact, stats, utils, wire — 1111 byte) KHÔNG mang dòng Mario Zechner; đừng lấy wire làm khuôn cho file này. Thông báo MIT permission phải được tái tạo đầy đủ và không sửa — chính văn bản đó LÀ giấy phép, và diễn giải lại nó làm mất hiệu lực. Làm việc này trước bước chép để thông báo tồn tại khoảnh khắc byte chép đầu tiên đáp xuống; gán công sau là cách nó bị thất lạc. Đồng thời thêm một dòng cho `@earendil-works/pi-client` vào phần pi-derived của `THIRD-PARTY-NOTICES.txt`, theo đúng mẫu của mục sẵn có ở dòng 227. Neo: `packages/client/LICENSE` (mới), `THIRD-PARTY-NOTICES.txt` (chèn quanh dòng 227).

2. **Trước khi bắt đầu, xác nhận cổng đang xanh trên cây hiện tại** để một lỗi về sau không thể bị quy nhầm là do bạn: `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers` phải exit 0. Đo lại ngày 2026-09-28 trên máy này: 24.9s wall, exit 0 (các lần đo trước cho 34.2s, nên 22–40s là dải pass). Ghi lại con số đó; lần chạy sau migrate phải là cùng lệnh với cùng mã exit. Neo: `root package.json:94` (`check:ts`).

3. **XÁC MINH TIỀN ĐỀ ĐÃ ĐÁNH XONG, và nếu chưa thì dừng lại và dời công việc này sau.** Đây là lá thứ ba trong chuỗi phụ thuộc của 7 gói, và thứ tự bắt buộc là: chord → protocol → server → client. Nó phụ thuộc cứng vào `@oh-my-pi/chord` (17 symbol) và `@oh-my-pi/pi-protocol` (21 symbol); thêm nữa nó phụ thuộc cứng vào `@oh-my-pi/pi-server` cho BA SUBPATH chỉ dùng ở `test/unix.test.ts` (`@oh-my-pi/pi-server`, `@oh-my-pi/pi-server/testing/host`, `@oh-my-pi/pi-server/transports/unix/listener`). Không có đường nửa chừng: không một trong 8 file src nào typecheck được khi thiếu chord và protocol. Nếu thiếu chord thì `esbuild` cũng còn thiếu (verified vắng mặt trong `node_modules` của omp) và điều đó chặn chord trước. Neo: `packages/client/package.json` `dependencies`, `packages/chord/`, `packages/protocol/`, `packages/server/`.

4. **Tạo khung package:** `mkdir -p packages/client/src packages/client/test/fixtures`. KHÔNG chép `tsconfig.build.json`, `tsconfig.test.json` hay `vitest.config.ts` của pi. Viết `packages/client/tsconfig.json` 4 dòng mới, chép từ `packages/wire/tsconfig.json` — `{"extends": "../tsconfig.workspace.json", "include": ["src", "test"]}` — đó là cách `check:ts` ở gốc phát hiện và typecheck gói này. Neo: `packages/client/tsconfig.json` (mới).

5. **Viết `packages/client/package.json` từ khuôn `packages/wire/package.json`, KHÔNG từ bản của pi.** Các điểm quan trọng: tên `@oh-my-pi/pi-client`; main/types trỏ vào `./src/index.ts` (omp phát hành mã nguồn, không bao giờ dist); bản exports có `.` → `./src/index.ts`, `./unix` → `./src/unix.ts`, và `./package.json`; script là NĂM script của omp (check / check:types / lint / fix / fmt) với `check:types` đặt thành `tsgo -p tsconfig.json --noEmit` để cổng gốc nhặt được gói; dependencies là `@oh-my-pi/chord`, `@oh-my-pi/pi-protocol`, `@oh-my-pi/pi-utils` tất cả ở `catalog:`; devDependencies chỉ có `"@types/bun": "catalog:"` — bỏ `shx` và `vitest`, giữ `@types/bun` vì tsconfig của repo khoá `"types": ["bun", "assets"]` và mã chép dùng `NodeJS.Timeout` lẫn `Bun.sleep`; 15/16 package omp đều khai báo nó, chỉ `packages/tui` không; engines `bun >=1.3.14`. Rồi thêm các dòng catalog tương ứng vào khối `workspaces.catalog` của package.json gốc để `catalog:` phân giải được. Neo: `packages/client/package.json` (mới), `workspaces.catalog` ở package.json gốc.

6. **Chép nguyên văn 7 file nguồn — CHƯA SỬA GÌ.** `src/transport.ts`, `src/types.ts`, `src/errors.ts`, `src/connection.ts`, `src/unix.ts`, `src/client.ts`, `src/index.ts`. Bỏ hẳn `src/promise.ts` (đừng chép nó; nó bị xoá ở bước 8). 34985 byte trên 7 file. Không format lại, không để editor reflow tab, chưa "sửa" gì — một bản chép sạch làm diff ở bước 8 dễ review và làm một sửa sót trở nên lộ liễu. Neo: `packages/client/src/{transport,types,errors,connection,unix,client,index}.ts`.

7. **Xoá `packages/client/src/promise.ts` khỏi bản chép.** Nó đã bị thay thế: chính doc comment của nó bảo xoá khi lib baseline chạm ES2024, baseline của omp đã ở đó (`Promise.withResolvers` dùng rộng khắp `packages/agent`), và AGENTS.md của omp làm nó bắt buộc. Đừng giữ một shim cục bộ. Neo: `packages/client/src/promise.ts` (đã xoá).

8. **Áp dụng các sửa đổi mã nguồn, theo thứ tự này, rồi dừng lại và đọc diff trước khi đi tiếp.** (a) SCOPE: 8 site trong src/ — client.ts L18 `@earendil-works/chord`, L19 `@earendil-works/chord/context`, L30 `@earendil-works/pi-protocol`; connection.ts L9 pi-protocol; errors.ts L1 pi-protocol; types.ts L1 chord, L2 pi-protocol; unix.ts L9 pi-protocol. KHÔNG có site nào của `@earendil-works/pi-client` (chuỗi `pi-client` chỉ xuất hiện trong một tên thư mục tạm ở test), và `@oh-my-pi/pi-utils` ở (d) là import MỚI thêm vào chứ không phải sửa chữ có sẵn. (b) EXTENSIONS: bỏ `.ts` khỏi 16 specifier tương đối trong src/ (25 nếu tính cả test — xem bước 9). (c) PROMISE: `client.ts` L248 `createPromiseResolvers<T>()` → `Promise.withResolvers<T>()`; `connection.ts` L72 tương tự; xoá dòng `import ... from "./promise.ts"` mồ côi ở cả hai file. (d) UTILS: xoá định nghĩa `toError` khỏi errors.ts và import nó từ `@oh-my-pi/pi-utils`; giữ `toDisconnectedError` export từ errors.ts. (e) BARREL: viết lại index.ts thành bốn star re-export (`export * from "./client"` / `"./errors"` / `"./transport"` / `"./types"`) — quy tắc barrel của omp cấm dạng danh sách tường minh mà pi dùng. (f) TYPES: `unix.ts` L247 `ReturnType<typeof setTimeout>` → `NodeJS.Timeout`. (g) NAMESPACE: 3 file, 6 dòng import, 28 call site — `src/unix.ts` L1/L3 (3 call site) ngay ở bước này, và cùng đợt chuyển test ở bước 9 thì `test/unix.test.ts` L3/L5 (21 call site) cộng `test/unix-transport.test.ts` L1/L3 (4 call site). `node:net`, `node:events` và `node:child_process` KHÔNG nằm trong danh sách của quy tắc nên để nguyên. Sau bước này, `grep -rn 'ReturnType<\|private \|@earendil-works/\|from "\./[^"]*\.ts"' packages/client/src/` phải trả về KHÔNG hit nào. Neo: `packages/client/src/**` (16 extension + 8 scope + 2 promise + 1 barrel + 1 ReturnType + 3 namespace).

9. **Chép nguyên văn 5 file test, rồi chuyển đổi chúng.** Trước hết là specifier: 3 lần pi-protocol (`support.ts:7`, `client.test.ts:8`, `unix-transport.test.ts:5`) và 2 lần chord (`client.test.ts:1` subpath `/context`, `unix-transport.test.ts:4` bare) trên ba file test — KHÔNG có scope nào của pi-client trong test; bỏ `.ts` khỏi 9 specifier tương đối trong test (kể cả 3 cái xuyên package của `unix.test.ts`, vốn đổi thêm từ đường dẫn `../../server/src/...` sang subpath `@oh-my-pi/pi-server`), và đổi `node:fs/promises` + `node:path` sang namespace ở `unix.test.ts` L3,5 và `unix-transport.test.ts` L1,3 (21 + 4 call site) theo mục (g) của bước 8. Runner: thay `from "vitest"` bằng `from "bun:test"` ở cả 3 file test, và BỎ `vi` khỏi import của `client.test.ts` — `bun:test` không có `vi`. Rồi sửa 2 call site `vi.waitFor` (`client.test.ts` L136, L155): omp không có helper `waitFor` trong pi-utils, nên thêm một `waitFor` CỤC BỘ nhỏ trong `client.test.ts` poll trên `Bun.sleep(5)` tới khi assertion pass hoặc hết ngân sách 1000 ms, rồi ném lại. Đừng tạo một utility dùng chung cho hai call site. Sau đó chuyển 4 khai báo `private` và 18 tham chiếu `this.X` của `MemoryByteServer` sang `#`, để trần `messages`/`serverId`/`clientCloseCount` cùng 6 method công khai. Giữ nguyên mọi khối `describe`/`test`, mọi `afterEach`, và các `Set` tài nguyên ở cấp module — chúng là cơ chế an toàn-suite-đầy-đủ mà quy tắc testing của omp đòi hỏi. Neo: `packages/client/test/{client.test.ts,support.ts,unix-transport.test.ts,unix.test.ts,fixtures/stale-socket-server.mjs}`.

10. **Xác minh việc viết lại đã đủ bằng grep, trước khi chạy bất cứ trình biên dịch nào.** Cả bốn lệnh sau phải trả về rỗng: `grep -rn '@earendil-works' packages/client/` (0), `grep -rn 'from "[.][^"]*\.ts"' packages/client/src packages/client/test` (0), `grep -rn 'ReturnType<' packages/client/src` (0), `grep -rn 'vitest' packages/client/` (0). Và hai lệnh sau phải khác 0 hoặc đúng kỳ vọng: `grep -rn 'private ' packages/client/test/support.ts` (0 sau khi chuyển `#`) và `grep -rn 'Promise.withResolvers' packages/client/src` (2 — client.ts và connection.ts). Một kết quả khác 0 ở bất kỳ dòng "0" nào nghĩa là bước 8 hoặc 9 đã bỏ sót; sửa tại đây thay vì để trình biên dịch phát hiện. Neo: `packages/client/**`.

11. **Chạy cổng kiểu:** `bun run check:ts` từ repo root. Nó phải exit 0. Một package MỚI có script `check:types` được root `--filter './packages/*' --sequential --if-present check:types` tự động nhặt, nên một lần chạy xanh chứng minh package thực sự đã compile — nhưng nếu package lặng lẽ bị bỏ qua thì cổng cũng xanh, nên hãy xác nhận dòng output `@oh-my-pi/pi-client:check:types` xuất hiện. Hãy kỳ vọng khoảng 22–38 symbol chưa phân giải ở lần chạy đầu (symbol drift của chord hoặc protocol) — đó là tín hiệu thật, không phải nhiễu. Neo: `root package.json:94`.

12. **Chạy test:** `cd packages/client && bun test`. Cả 4 file test nên pass. Tiền đề môi trường: cần addon native đã build — `brew install ninja` rồi `bun --cwd=packages/natives run build` (exit 0; đã chạy trên máy này). Trên máy chưa build addon, `bun test` ở repo root chết ngay ở bước import với `Failed to load pi_natives native addon for darwin-arm64`; làm bước build một lần là suite root chạy sạch (`bun test packages/utils/test/` → 743 pass / 10 skip / 0 fail), nên đừng quy một lỗi test ở cấp root là hồi quy khi chưa làm bước đó. Nếu bạn thật sự chưa build được addon, hãy ghi kết quả test của gói client theo lời gọi cục bộ gói và nói thẳng trong PR là bạn chưa chạy được suite ở cấp root vì thiếu bước build đó. ĐỪNG nói suite root xanh khi bạn không quan sát được điều đó. Neo: `packages/client/test/**`.

13. **Chạy formatter và linter, vì chúng là một phần của cổng:** `bun run fix:tools` (hoặc tối thiểu `oxfmt packages/client/src/**/*.ts packages/client/test/**/*.ts` rồi `oxlint packages/client`). Formatter sẽ chuẩn hoá định dạng chép từ pi theo `.oxfmtrc.json` của omp (useTabs true, tabWidth 3, printWidth 120, arrowParens avoid) — pi vốn đã indent bằng tab nên đây phải là chỉnh nhẹ, nhưng `errors.ts` của pi và các file chép khác có thể bị reflow. Hãy đọc lại mọi file mà formatter đã đổi, vì nó có thể bọc lại khối import dài mà bạn sửa ở bước 8. Rồi chạy lại cổng của bước 11 để xác nhận việc format không phá vỡ việc compile. Neo: `.oxfmtrc.json`, `.oxlintrc.json`.

14. **Viết `packages/client/README.md`** (5 sửa scope + định hướng lại khung "experimental" + một dòng nói gói chưa có consumer ở omp) **và `CHANGELOG.md` mới** (`## [Unreleased]` / `### Added` / một dòng, số PR điền lúc nộp). Đừng chép stub lịch sử phiên bản của pi. Rồi rà lại `git status` lần cuối xác nhận thay đổi đúng bằng: 7 file src, 5 file test, package.json, tsconfig.json, LICENSE, README.md, CHANGELOG.md, cộng các dòng catalog ở package.json gốc — và rằng `tsconfig.build.json`, `tsconfig.test.json`, `vitest.config.ts`, `src/promise.ts` đều vắng mặt. Neo: `packages/client/README.md`, `packages/client/CHANGELOG.md`.

### Hợp đồng test

Bốn file test, 27504 byte, 25 test case (14 + 3 + 8). Chúng chuyển sang `bun:test` nhưng mọi assertion đều sống sót, vì các assertion vốn đã ở mức hợp đồng — mỗi cái đặt tên một kết quả protocol quan sát được từ bên ngoài, và không cái nào là source-grep, fixture echo hay kiểm tra wiring. Đọc tiêu đề là cách nhanh nhất để thấy điều đó:

- `'connects only to the expected logical server'` — xác minh `serverId`
- `'updates attachment state from out-of-band server routing'` — envelope attachment
- `'buffers service updates until the subscription snapshot arrives'` — rào hai hàng đợi hydrate, test có giá trị cao nhất trong gói
- `'correlates out-of-order generic service responses'` — tương quan theo request-ID độc lập thứ tự tới
- `'exposes bounded server errors'` — `ProtocolError` → `ServerError.code`
- `'does not send a pre-aborted untyped RPC request'` và `'cancels one untyped RPC request without disconnecting'` — hợp đồng abort/cancel
- `'rejects server data delivered before the client hello is sent'` — chốt thứ tự handshake
- `'rejects typed handshake errors and closes the transport'`
- `'rejects pending requests and reconnects through a fresh transport'`
- `'reports transport failures without leaving requests pending'`
- `'disconnects on invalid or truncated server framing'` — lỗi framing CBOR nổi lên thành disconnect
- `'disconnects when a response has no matching request'` — phát hiện response mồ côi
- `'carries a complete Client handshake and request over a real Unix socket'` — bằng chứng vận tải end-to-end
- `'reports truncated final frames through Client'`
- `'ignores malformed entries, non-sockets, and mismatched servers'`, `'times out an unresponsive socket without deleting it'`, `'limits concurrent probes to 16'`, `'ignores an endpoint that closes before its handshake'` — hợp đồng discovery, gồm cả trần 16
- `'rejects invalid Unix transport options'` và `'rejects connection attempts to missing sockets'`

Đây đúng là những hành vi mà một lần viết lại sẽ lặng lẽ đánh mất — đó chính là lập luận trong phần vì sao chép chứ không viết lại.

Ba nghĩa vụ chuyển đổi, tất cả đều cơ học: (1) `from "vitest"` → `from "bun:test"` ở 3 file; (2) hai call site `vi.waitFor` (`client.test.ts` L136, L155) trở thành một helper `waitFor` poll có giới hạn CỤC BỘ — omp không có cái này trong pi-utils, và thêm một utility dùng chung cho hai call site là over-engineering; helper phải ném lại lỗi assertion cuối cùng khi hết hạn chứ không lặng lẽ pass, nếu không nó biến một hồi quy thật thành test xanh; (3) 4 khai báo `private` của `MemoryByteServer` → `#`, với 18 tham chiếu `this.X` được cập nhật, còn `messages`/`serverId`/`clientCloseCount` và 6 method công khai ở lại trần.

Tuân thủ quy tắc testing của omp được giữ theo cách cấu trúc: không `mock.module()` ở bất cứ đâu (các test dùng một `ByteTransport` in-memory tự viết, thế mạnh hơn), không assertion source-grep, không ca chỉ có `not.toThrow()`, không hàng trùng lặp, và các `Set` ở cấp module cộng teardown `afterEach` trong cả hai file test Unix giữ chúng an toàn khi chạy cả suite.

Một test cần một package KHÔNG phải client: 8 test discovery trong `unix.test.ts` import `Server`, `createTestServerServices` và `createUnixListener` thật của pi-server — nếu server đến sau client, file đó phải viết cuối cùng hoặc các test discovery phải hoãn lại, và điều này phải được nói TƯỞNG MINH trong PR chứ không để CI phát hiện.

Tên file test:

- `packages/client/test/client.test.ts`
- `packages/client/test/support.ts`
- `packages/client/test/unix-transport.test.ts`
- `packages/client/test/unix.test.ts`
- `packages/client/test/fixtures/stale-socket-server.mjs`

### Xác minh

Cổng là `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers`. BASELINE ĐO TRÊN MÁY NÀY: exit 0, 24.9s wall (77.2s user, 4.3s system, 327% cpu) — đo lại ngày 2026-09-28; các lần đo trước cho 34.2s, nên hãy coi 22–40s là dải pass và điều tra bất cứ gì trên 60s. Cổng chạy `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`, nên nó (a) lint và kiểm tra định dạng cả cây qua oxlint + oxfmt, và (b) typecheck mọi package có khai báo script `check:types`. Vì có `--if-present`, một package có script `check:types` thiếu hoặc sai chính tả sẽ bị BỎ QUA LẶNG LẼ và cổng vẫn pass — nên xác minh cổng không đủ một mình: còn phải xác nhận output có dòng `@oh-my-pi/pi-client:check:types`, và xác nhận script tồn tại trong `packages/client/package.json`. Test là `cd packages/client && bun test`.

CHẶN MÔI TRƯỜNG — ĐÃ GỠ 2026-09-29. Đo lại sau `brew install ninja` + `bun --cwd=packages/natives run build` (exit 0): `bun test packages/utils` → **743 pass / 10 skip / 0 fail**. 17 fail / 16 errors trước đây là addon chưa build, không phải lỗi test. (Ghi lại để hiểu vì sao con số cũ xuất hiện:) (đo được: `bun test packages/utils` → 658 pass, 2 skip, 17 fail, 16 errors trên 81 file), và lệnh mở khoá đã ghi `bun --cwd=packages/natives run build` THẤT BẠI vì `ninja` chưa được cài (`brew install ninja` trước). Nếu bạn gặp lại đúng trạng thái đó trên một máy chưa build addon, suite của riêng gói client vẫn chạy được ở cấp package (nó không import mã native nào — nó chỉ phụ thuộc `node:net`/`node:fs`/`node:path` cộng chord và protocol), nhưng KHÔNG thể nói suite ROOT là xanh, và PR phải nói thay vì khẳng định một kết quả không ai quan sát được.

Các grep tiền kiểm, mỗi cái phải trả về không hit sau khi migrate:

```bash
grep -rn '@earendil-works' packages/client/
grep -rn 'from "[.][^"]*\.ts"' packages/client/src packages/client/test
grep -rn 'ReturnType<' packages/client/src
grep -rn 'vitest' packages/client/
grep -n 'tsc ' packages/client/package.json
ls packages/client/src/promise.ts packages/client/vitest.config.ts packages/client/tsconfig.build.json packages/client/tsconfig.test.json
```

Dòng `ls` phải báo "No such file" cho cả bốn, và dòng `grep -n 'tsc '` phải RỖNG: bản của pi mang `build: tsc -p tsconfig.build.json` và `typecheck: tsc -p tsconfig.test.json`, mà AGENTS.md cấm `tsc` tuyệt đối — đó là lý do bước 5 xoá cả khối `scripts`, và là lý do không được thêm lại script gọi `tsc` khi bổ sung nhanh từ khuôn `wire`. Đối chứng dương phải khác 0: `grep -rn 'Promise.withResolvers' packages/client/src` → 2, và `grep -rn 'private ' packages/client/test/support.ts` → 0 với `grep -rc '#handlers' packages/client/test/support.ts` → 1. Cuối cùng, đọc lại LICENSE và xác nhận khối bản quyền 3 dòng cùng toàn văn MIT permission không sửa đều có TRƯỚC khi mở PR — đó là kiểm tra không thể sửa bù rẻ nếu một reviewer lỡ điểm mắt.

### Cổng hoàn thành

1. `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers` — exit 0, VÀ phải thấy dòng `@oh-my-pi/pi-client:check:types` trong output (nếu không, package bị `--if-present` bỏ qua lặng lẽ và cổng vẫn xanh).
2. `cd packages/client && bun test` — 25/25 test case pass (14 + 3 + 8).

Cổng (1) CÓ THỰC SỰ ĐỎ ĐƯỢC. Nhưng chỉ một phần: vì nó chạy với `--if-present`, một package có script `check:types` thiếu hoặc sai chính tả sẽ bị bỏ qua lặng lẽ và cổng vẫn xanh. Không được coi là xong nếu chỉ chạy (1): `check:ts` không thấy bất kỳ hồi quy hành vi nào — mà đó chính là chế độ hỏng nguy hiểm nhất của lần port này.

### Rủi ro

THẤP về tính đúng đắn, TRUNG BÌNH về thứ tự — và hai điều đó tách rời nhau.

**Tính đúng đắn thấp** vì logic rủi ro không bao giờ được gõ lại, chỉ được chỉ lại địa chỉ: các chốt thứ tự handshake, cuộc đua abort/cancel, rào hydrate đăng ký, và bộ phân giải backpressure khi ghi — tất cả chép nguyên văn, và mọi sửa đổi hoặc là một specifier import, một modifier riêng tư, một hàm khởi tạo promise, hay một tên kiểu. Thay đổi hành vi thật sự duy nhất là xoá `toError` của pi để dùng bản của pi-utils, và hai hàm đó ngữ nghĩa giống hệt (`instanceof Error ? passthrough : new Error(String(x))`), nên bán kính ảnh hưởng bằng không. Chế độ lỗi thật sự nguy hiểm không phải lỗi compile mà là hồi quy hành vi LẶNG LẼ nếu ai đó "cải thiện" mã đã chép trong lúc port — ví dụ đơn giản hoá đường abort thành một reject thuần cục bộ (rò một request mồ côi ở phía server), hoặc phân giải `#write` chỉ trên callback ghi socket (hỏng framed message dưới backpressure). Biện pháp là thủ tục: chép trước, chỉ sửa đúng các dòng đã liệt kê, và đọc diff bước 8 từng dòng một.

**Thứ tự là rủi ro trung bình**, và có hai phần. (1) Phụ thuộc cứng vào chord và protocol: 38 symbol được import, không một cái nào tồn tại ở omp hôm nay; không một trong 8 file src nào typecheck được khi thiếu chúng, và chord lại kéo theo `esbuild` vốn vắng mặt trong `node_modules` của omp. (2) Phụ thuộc mềm vào server cho 8 trong 25 test: `test/unix.test.ts` import ba subpath của pi-server. Nếu server được đặt sau client, file đó phải viết cuối cùng — hãy lên kế hoạch trước thay vì phát hiện ra sau.

Hai rủi ro nhỏ hơn đáng gọi tên. **THỨ NHẤT**, việc chuyển barrel có một tác dụng phụ nhìn thấy được: thay danh sách export tường minh của pi bằng bốn star re-export làm package root MỚI phơi bày `toDisconnectedError`, điều pi không export. `toError` thì không: sau bước 8(d) nó chỉ là một import nội bộ của errors.ts, và `export *` không bao giờ re-export tên được import. Nên mở rộng bề mặt API đúng bằng MỘT tên, có chủ ý, và nên nói với reviewer chứ để họ tự phát hiện. **THỨ HAI**, zero consumer: chưa có gì trong omp import gói này (consumer của pi là runtime thử nghiệm trong coding-agent của chính nó, còn coding-agent của omp không có `src/client/` và không có subpath `./client`). Điều đó ổn cho một gói lá, nhưng nghĩa là cổng là kiểm tra tự động DUY NHẤT trên mã này — nên nếu `check:types` sai chính tả, package bị bỏ qua lặng lẽ, cổng pass, và một package hỏng lại đi xanh. Chống lại đúng cái đó bằng cách khẳng định dòng `@oh-my-pi/pi-client:check:types` xuất hiện trong output, như bước 11 đòi hỏi.

### Cần người quyết

- Bộ điều khiển `RemoteSession` của coding-agent trong pi (`packages/coding-agent/src/client/index.ts`, cộng `src/experimental/client-runtime.ts` và `src/experimental/services/connection.ts`) có thuộc một hạng mục công việc omp sau này không, hay nằm trong phạm vi của đặc tả coding-agent sẽ re-export gói này thành `@oh-my-pi/pi-coding-agent/client`? Gói client của pi vô dụng nếu thiếu nó, nên nếu đặc tả coding-agent không nhận, lần migrate này sẽ giao một gói không ai dùng. Quyết định đó thuộc đặc tả coding-agent và phải được ghi ở đó, không ở đây.
- `test/unix.test.ts` cần ba subpath của pi-server (`@oh-my-pi/pi-server`, `.../testing/host`, `.../transports/unix/listener`). Pi-server sẽ giữ các subpath export đó ở omp, hay omp sẽ gộp chúng vào một barrel duy nhất? Nếu bị gộp, file test đó cần viết lại theo hình dạng mới và 8 test discovery của nó sẽ thành nhiều hơn hẳn một lần port cơ học. Xác nhận với đặc tả server trước khi xếp lịch cho client.
- `@earendil-works/chord/context` (một subpath, không phải specifier trần) có được giữ dưới tên `@oh-my-pi/chord/context` không? `client.ts:19` và `test/client.test.ts:1` đều import `BACKGROUND_CONTEXT` từ đó. Nó chỉ phân giải được bên trong repo pi vì exports map của chord mang một mục `./context`. Đặc tả chord phải giữ subpath đó, nếu không 2 import này vỡ.
- Bốn package pin phiên bản 0.87.1 của pi mà lần migrate này chạm tới đều pin `engines.node >=22.19.0`, còn omp pin `engines.bun >=1.3.14`. `unix.ts` là nơi duy nhất điều này có thể cắn (node:net, node:fs/promises, `.unref()`/`.drain` của socket). Hãy xác nhận phiên bản Bun đích hỗ trợ `NodeJS.Timeout` như một kiểu và rằng `fork()` trong test fixture chạy được dưới `bun test` — `bun test` không chạy mô hình tiến trình của vitest, nên `stale-socket-server.mjs` fork tại `unix.test.ts:126` là test nhiều khả năng nhất phải làm lại.
- Bốn file bị bỏ (tsconfig.build.json, tsconfig.test.json, vitest.config.ts, CHANGELOG.md) có nên được ghi lại là các lần bỏ CÓ CHỦ Ý trong mô tả PR không, hay im lặng là chấp nhận được? Đặc tả này nói bỏ có chủ ý; PR nên nói thẳng, vì một reviewer diff với pi sẽ thấy thiếu 4 file và có thể đọc đó như tai nạn.
- Hai lần `@earendil-works/pi-ai` và mỗi lần một `@earendil-works/pi-telemetry` / `@earendil-works/pi-agent-core` chỉ tồn tại TRONG `tsconfig.test.json` của pi, mà đặc tả này xoá. Nên bốn chuỗi scope đó không cần viết lại gì cả — nhưng nếu sau này một quyết định nào hồi sinh tsconfig test, chúng phải được viết lại lúc đó. Xác nhận việc xoá là có chủ ý, để không ai sau này grep các chuỗi `@earendil-works` chưa viết lại rồi báo là sót.


---


## 5. `durable` — TÀI LIỆU THAM KHẢO, NGOÀI PHẠM VI

**Không chép package này trong đợt này.** Toàn bộ mục này được giữ lại làm **tài liệu tham khảo** —
nó là nguồn duy nhất của `pi-ref/packages/durable/docs/pico-v5.md` (§5.4 Scheduler, §6
Submissions/Inbox, §7 Hooks, §8 built-in tasks), tức năng lực task/scheduler mà omp chưa có.
**Mục 5 KHÔNG phải work item; không ai được làm theo các bước bên dưới nó.** Lý do: `durable` là
package chết — không package nào ngoài nó import. Hệ quả phải nói thẳng: **lỗ hổng bằng chứng ở M1
về nửa "document" đã được điền** — xem `MILESTONE_1_EXECUTION_PLAN.md:64`.

**Vị trí trong thứ tự migrate:** Nó đứng sau `chord`, `protocol`, `server`, `client` vì 52 import trỏ vào `@oh-my-pi/chord` mà `chord` chưa tồn tại ở omp — thiếu 14 symbol là `Context`, `Draft`, `JsonValue`, `Op`, `Change`, `Prepared`, `Tracker`, `copyJson`, `track`, `apply`, `applyImmutableBatches`, `awaitWithContext`, `withoutAbortSignal`, `BACKGROUND_CONTEXT` thì `durable` không biên dịch được. **Quy mô:** 63 file / 807,033 byte; 9,024 dòng `src`, trong đó 1,520 dòng là bộ kiểm chứng dùng chung cho 3 back-end storage, cộng 114 KB đặc tả normative trong `docs/pico-v5.md`. Đổi 78 lần `@earendil-works/` → `@oh-my-pi/` và giải quyết 11 va chạm với code omp đã có trước đó khi mới chạy được. **Cổng đỏ được:** có — `gate_can_fail: true`.

Lý do là CHÉP chứ không phải làm lại, gói trong một dòng: `pi-ref` là 1 commit squash (`git log --oneline | wc -l = 1`, 1,935 file), nên không có diff nào để "cập nhật" — chỉ có copy. Và `durable` không phải bản sao cũ của omp: `pi-ref packages/agent/` có 117 file `src`, omp `packages/agent/` chỉ có 50, và chỉ 5 tên file trùng nhau (đo theo ĐƯỜNG DẪN TƯƠNG ĐỐI trong `src/`; nếu chỉ so tên file thì 12) — `agent-loop.ts` 26KB (pi) vs 148KB (omp), `agent.ts` 19KB vs 74KB, `types.ts` 19KB vs 51KB. `durable` là sực tách ra TÍCH LŨY TRONG PI sau khi omp đã phát triển tiếp: ba nơi gộp 3 thứ, tổng 20KB source. LƯU Ý: ở HEAD d6af72e KHÔNG package nào ngoài `durable` import nó — `git grep -l pi-durable d6af72e` chỉ ra README.md, package-lock.json, tsconfig.json và `scripts/*` ở root. `durable` là package CHƯA ĐƯỢC TIÊU THỤ, không phải runtime đã kiểm chứng; bằng chứng duy nhất là 23 file test của chính nó. Vì vậy càng phải giữ nguyên bộ test khi chép.

> ### Đính chính lớn: chép `durable` nguyên xi sẽ làm omp **tệ hơn** ở đúng trục quan trọng nhất
>
> Đây là phát hiện sinh ra từ so sánh 5 repo, sau khi bản thảo này đã viết xong. Nó đảo ngược một
> phần kế hoạch, nên nằm ngay đầu mục `durable` chứ không cuối tài liệu.
>
> **omp hiện tự lành được file JSONL hỏng. `pi` thì không — và sẽ mất sạch session.**
>
> | Câu hỏi | omp | `pi` | `gajae` | `opencode` | `codex` |
> |---|---|---|---|---|---|
> | Có hàm parse JSONL khoan dung? | **có** — `packages/utils/src/stream.ts:575` `parseJsonlLenient` | **không** | có — `stream.ts:434` | không | không |
> | Có callback báo dòng hỏng? | **có** — `{ onMalformedRecord?: () => void }` | không có hàm | không | — | — |
> | Dòng JSON hỏng thì sao? | đếm vào `malformedRecords` | **ném `JsonlCorruptionError`** | — | — | — |
>
> Chuỗi chững chạy đầy đủ ở omp, đo từng bước:
> 1. `session-loader.ts:95` tăng `malformedRecords` cho mỗi dòng hỏng, và trả nó ra ở `:102`.
> 2. `session-manager.ts:1882` — `this.#rewriteRequired = migrated || loaded.malformedRecords > 0;`
> 3. Lần persist kế tiếp ghi lại toàn bộ thân file, nên dòng hỏng **biến mất vĩnh viễn** —
>    tự lành, không cần người dùng can thiệp.
>
> Bên `pi`: `durable/src/storage/jsonl/storage.ts:115-121` bọc `JSON.parse` trong `try` rồi **ném
> lại** thành `JsonlCorruptionError` (class khai ở `:80`; 20 chỗ `throw` trong file này). Ba khối
> `try` trong toàn bộ `jsonl/storage.ts` đều để **chuyển đổi** lỗi hạ tầng thành lỗi ném ra, không
> khối nào **bắt** `JsonlCorruptionError` để phục hồi. Không có đường thoát nào ngoài việc ném.
>
> **Hệ quả trực tiếp cho kế hoạch này:** cột "chép nguyên văn" ở mục `storage/jsonl/*` bên dưới là
> **sai** cho omp. Không phải vì `pi` làm sai, mà vì omp đang làm **tốt hơn** ở đúng trục này và việc
> chép sẽ **xoá** điểm mạnh đó. Ba lựa chọn, theo thứ tự ưu tiên:
>
> - **A (mặc định đề xuất):** chép `durable` trừ tầng lưu, và **giữ tầng lưu của omp**. Tức là mang
>   sang `Session` / `Transaction` / `documents.ts` (lớp phải ở trên) mà **không** mang
>   `storage/jsonl/`. Tách đúng ranh giới này thì M1B vẫn thu được phần đáng giá nhất mà không mất gì.
> - **B:** chép cả `storage/jsonl/` nhưng port `parseJsonlLenient` và cơ chế `#rewriteRequired` vào
>   đúng chỗ, để hành vi thành "bỏ dòng hỏng, đánh dấu cần viết lại" thay vì "ném". Tốn công hơn A và
>   phải giữ bộ test của cả hai bên cho khớp.
> - **C:** chép nguyên xi. **Không chọn** — đây là lựa chọn làm hỏng omp.
>
> Còn một điều nữa, nhỏ hơn nhưng cùng hướng: `durable` của `pi` **không nói** giới hạn của nó. omp
> thì nói thẳng — `session-manager.ts:690`: *"Durability is software-crash safe but not power-loss
> safe"*, kèm 6 dòng giải thích vì sao entry đã hoàn tất không được `fsync`. Cả 5 repo đều không an
> toàn khi mất điện, nhưng **chỉ omp dám nói ra**. Nếu chọn phương án A hoặc B, phải **giữ** đoạn này.

**Về `documents.ts`** — `packages/durable/src/documents.ts` (207 dòng, 7,888 byte) là nửa document mà M1 gọi là điểm không có bằng chứng duy nhất trong milestone. Đọc kỹ thì KHÔNG phải một phần document. Nó là LỚP PHẢI — nơi đọc các Định nghĩa (definitions) thành địa chỉ lưu (address) và kiểm tra chúng (validation). Hạ tầng thật sự — Session, Transaction, và cả 3 storage back-end — đều gọi qua nó. Ba khả năng cụ thể:

1. **PHÂN GIẢI ĐA NĂNG (từ 2 overload thành 1).** `defineDoc` và `defineDocFamily` có 4 overload mới: scope `'session'`, scope `'conversation'` + history `'latest'`, scope `'conversation'` + history `'rewindable'`, scope `'task'`. Kiểu trả về khác nhau (`SessionDocToken` / `ConversationDocToken` / `RewindableConversationDocToken` / `TaskDocToken`). Nghe đổi là `tx.doc(MyToken)` sẽ KHÔNG bị chạy khi token và bản ghi đã lưu lệch scope — đó là định nghĩa tại thời gian biên dịch, không phải kiểm tra runtime.
2. **ĐỊA CHỈ LUÔN ỔN ĐỊNH.** `resolveAddress` biến danh sách tham số thành một `DocumentAddress` (kind + scope + key), rồi `addressId` biến nó thành chuỗi JSON định dạng `[[kind, scopeKind, owner, key]]` làm KEY của `Map`. Một tài liệu tại MỘT địa chỉ logic nào đó có ĐÚNG MỘT thế hệ chuỗi, nên được trả về nhanh, và MỘT địa chỉ có thể BỊ TÁI TẠI nhiều lần.
3. **MIGRATION CÓ CỔNG.** `checkRecordVersion` ném nếu bản ghi mới hơn definition, và ném thêm nếu bản ghi CŨ hơn mà definition không có `migrate`. `materializeDocument` chạy `migrate(value, fromVersion)` rồi copy lại.

Bằng chứng thì có: nguồn có 3 test nên trực tiếp vào nó — `test/session-documents.test.ts` (27,086 byte, 2 import) phủ 5 nhóm hợp đồng; `test/session-checkpoints-migrations.test.ts` (24,698 byte) phủ `migrate` + checkpoint; `test/session-forks.test.ts` (26,608 byte) phủ fork + asOf; và `src/testing/storage-conformance.ts` (1,520 dòng) dùng chung cho 3 backend. 3 file test đó là 78,392 byte; cộng `src/testing/storage-conformance.ts` (54,178) thành 132,570 byte test cho 7,888 byte code — tỉ lệ ~17:1. Phần CHƯA có trong repo này là lớp trên: Scheduler (`docs/pico-v5.md` mục 5.4), Submissions và Inbox (mục 6), Hooks + bảng Tools (mục 7), và các Built-in tasks (mục 8). Nói rõ: `durable` = HẠ TẦNG ĐƯỢC XÁC NHẬN, còn hệ thống task đầy đủ thì chưa.

### File cần chép — bảng: path | bytes | hành động (chép nguyên văn / chép rồi sửa / bỏ) | dòng cần sửa sau khi chép

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `package.json` | 2,475 | chép rồi sửa | Viết lại: tên → `@oh-my-pi/pi-durable`; bỏ `'source'` condition và `'dist'` (omp xuất `src/index.ts` trực tiếp); bỏ devDeps `shx`+`vitest`; thêm 2 dep `@oh-my-pi/chord` + `@oh-my-pi/pi-ai`; thêm `'check:types'` script; đổi `'repository.url'` sang `github.com/can1357/oh-my-pi`; đổi `'build'` → KHÔNG có (không `dist`). |
| `tsconfig.build.json` | 339 | bỏ | Không cần: omp không biên dịch `dist`, tsconfig workspace lo. Xem `steps[]` bước 1. |
| `vitest.config.ts` | 604 | bỏ | Xoá: omp dùng `bun:test`. Alias chuyển sang tsconfig paths + package.json exports. |
| `vitest.benchmark.config.ts` | 285 | bỏ | Xoá: bench chuyển sang `packages/durable/bench/*.bench.ts` theo convention omp. |
| `README.md` | 4,404 | chép rồi sửa | Đổi 11 lần `@earendil-works/` → `@oh-my-pi/`; bỏ đoạn `'npm run bench:storage'`; thêm mục CHANGELOG/LICENSE pháp lý; bỏ `'vitest/jest'` ví dụ sang `bun:test`. |
| `CHANGELOG.md` | 1,387 | chép rồi sửa | Giữ lại, thêm mục `'### Added'` dưới `## [Unreleased]` theo convention omp. |
| `src/index.ts` | 1,240 | chép rồi sửa | Đổi thành star re-export theo AGENTS.md (hiện là named re-export 62 dòng). Giữ nguyên danh sách export. |
| `src/types.ts` | 27,019 | chép rồi sửa | 3 dòng scope: L1,L2 `@earendil-works/chord` → `@oh-my-pi/chord`; L3 `@earendil-works/pi-ai` → `@oh-my-pi/pi-ai`. Ngoài ra dùng nguyên. |
| `src/documents.ts` | 7,888 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/delta) → `@oh-my-pi/chord`. Ngoài ra nguyên văn. |
| `src/errors.ts` | 555 | chép nguyên văn | Không có import, không có scope. |
| `src/ids.ts` | 377 | chép nguyên văn | Chỉ import type từ `./types.ts`. |
| `src/session/session.ts` | 10,105 | chép rồi sửa | 3 dòng scope (L1-2 chord, L2 chord/context, L3 chord/delta). Dùng ES `#private` có sẵn. |
| `src/session/transaction.ts` | 32,484 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/delta). |
| `src/session/forks.ts` | 2,912 | chép rồi sửa | 1 dòng scope (L1 chord). |
| `src/session/publications.ts` | 585 | chép nguyên văn | Chỉ import từ `../types.ts` và `./transaction.ts`. |
| `src/storage/memory.ts` | 28,693 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/delta). |
| `src/storage/sqlite/storage.ts` | 29,659 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/delta). |
| `src/storage/sqlite/database.ts` | 1,318 | chép nguyên văn | Không có scope, không có node import. |
| `src/storage/sqlite/migrations.ts` | 5,230 | chép nguyên văn | Không có scope. |
| `src/storage/sqlite/index.ts` | 263 | chép rồi sửa | Chuyển named re-export sang star (AGENTS.md). Không có scope. |
| `src/storage/sqlite/node.ts` | 3,756 | chép rồi sửa | KHÔNG đổi scope. NHƯNG sửa runtime: bỏ `node:sqlite`/`node:fs`/`node:path` (AGENTS.md 'Bun Over Node') → dùng `openSqliteDatabaseSync` từ `@oh-my-pi/pi-utils`, hoặc viết adapter `bun:sqlite` mới. Xem `collisions[]`. |
| `src/storage/jsonl/storage.ts` | 29,888 | **BỎ (phương án A)** hoặc chép rồi sửa nặng (B) | ⚠️ **XEM ĐÍNH CHÍNH Ở ĐẦU MỤC 5.** Dòng này ném `JsonlCorruptionError` khi JSONL hỏng; omp hiện tự lành. Chép nguyên văn sẽ **xoá** khả năng tự lành. A: không chép, giữ tầng lưu của omp. B: chép rồi thay `parseJson` bằng `parseJsonlLenient` + nối `malformedRecords` vào cơ chế `#rewriteRequired`. Nếu chép (B) thì 1 dòng scope (L1 chord) như cũ. |
| `src/storage/jsonl/node.ts` | 583 | chép rồi sửa | 1 dòng scope (L1 chord). |
| `src/storage/jsonl/index.ts` | 125 | chép rồi sửa | Chuyển sang star re-export. |
| `src/env/index.ts` | 6,010 | chép rồi sửa | 1 dòng scope (L1 chord). |
| `src/env/node.ts` | 30,551 | chép rồi sửa | 1 dòng scope (L21 chord). HÀM biến đổi lớn nhất của package: `node:child_process`/`node:crypto`/`node:fs`/`node:os`/`node:path`/`node:url` → `Bun.spawn`, `Bun.write`, `node:fs/promises` cho phần còn lại. |
| `src/env/utils/truncate.ts` | 9,916 | chép rồi sửa | KHÔNG copy thuần. Cắt phần trùng với `@oh-my-pi/pi-tui/tools/streaming-output.ts`; chỉ giữ riêng `GREP_MAX_LINE_LENGTH`, `utf8ByteLength`, `formatSize` và bỏ wrapper để bổ sung trường `maxLines`/`maxBytes` vào `TruncationResult`. Xem `collisions[]`. |
| `src/env/utils/output-capture.ts` | 9,131 | chép rồi sửa | 1 dòng scope (L1 chord). Sửa L203: đọc `current.truncation.maxBytes` — trường này không tồn tại trên shape của omp, phải bổ sung hoặc tính lại từ `limits`. |
| `src/env/utils/adaptive-publisher.ts` | 2,677 | chép rồi sửa | Không có scope. Ý nguyên hình dạng so với `pi-ref agent/harness/utils/adaptive-publisher.ts`. Nhưng KHÔNG chép nguyên văn được: L25 `#timer: ReturnType<typeof setTimeout> \| undefined;` vi phạm AGENTS.md 'NEVER use `ReturnType<>`' → thay bằng `Timer`. Xem bước 15b. |
| `src/testing/index.ts` | 720 | chép rồi sửa | Chuyển sang star re-export. |
| `src/testing/types.ts` | 790 | chép nguyên văn | Không có scope. |
| `src/testing/assertions.ts` | 1,229 | chép nguyên văn | Không có scope. File này KHÔNG import test framework nào (chỉ định nghĩa adapter `'ExpectLike'`/`createExpectAssertions`), nên chạy được sau khi chuyển test sang `bun:test` mà không cần sửa — giữ nguyên. Không phải vì 'trùng lặp' (nó không trùng `bun:test`), mà vì không có gì để đổi. |
| `src/testing/runner.ts` | 878 | chép nguyên văn | Không có scope. |
| `src/testing/storage-conformance.ts` | 54,178 | chép rồi sửa | 3 dòng scope (L1 chord, L2 chord/context, L3 chord/delta). |
| `src/testing/storage-benchmark.ts` | 13,994 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/context). |
| `test/session-support.ts` | 4,926 | chép rồi sửa | 3 dòng scope (L1 chord, L2 chord/context) + L3 `pi-durable` self-import. đổi `vitest` → `bun:test` nếu có. |
| `test/session-documents.test.ts` | 27,086 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/session-definitions.test.ts` | 4,654 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`; `expectTypeOf` cần xem xét bỏ (xem `test_contract`). |
| `test/session-checkpoints-migrations.test.ts` | 24,698 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/session-forks.test.ts` | 26,608 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/session-tables.test.ts` | 18,204 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/types.test.ts` | 8,227 | chép rồi sửa | đổi `'vitest'` → `'bun:test'`. File này chỉ kiểm tra kiểu → phải viết lại thành type-level hoặc bỏ; AGENTS.md cấm test 'echo'. |
| `test/memory-storage.test.ts` | 1,356 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/sqlite-storage.test.ts` | 21,367 | chép rồi sửa | 3 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/sqlite-facade.test.ts` | 6,576 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/sqlite-migrations.test.ts` | 5,427 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/jsonl-storage.test.ts` | 40,744 | chép rồi sửa | 3 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/storage-runtime-boundary.test.ts` | 2,020 | chép rồi sửa | đổi `'vitest'` → `'bun:test'`. |
| `test/env-node.test.ts` | 39,230 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` + `'vi'` → `'bun:test'` (`vi.useFakeTimers` → `jest.setSystemTime` / Bun equivalent). |
| `test/env-node-spill.test.ts` | 3,306 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` + `'vi'` → `'bun:test'`. |
| `test/env-output-capture.test.ts` | 11,423 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` + `'vi'` → `'bun:test'` (file này dùng `vi.setSystemTime` nhiều nhất). |
| `test/env-truncate.test.ts` | 8,681 | chép rồi sửa | đổi `'vitest'` → `'bun:test'`. Phải viết lại: phần lớn không còn hiệu lực sau khi cắt trùng với pi-tui. |
| `test/env-adaptive-publisher.test.ts` | 3,776 | chép rồi sửa | đổi `'vitest'` + `'vi'` → `'bun:test'`. |
| `test/fixtures/delete-buffer.ts` | 156 | chép rồi sửa | Fixture để xoá `globalThis.Buffer`. Kiểm tra còn phù hợp với Bun trước khi giữ. |
| `test/fixtures/utf8-byte-length-without-buffer.ts` | 438 | chép rồi sửa | Fixture để test `utf8ByteLength` khi không có `Buffer`. |
| `test/storage-memory.ts` | 8,486 | chép rồi sửa | 2 dòng scope. Script chạy bằng `'node --experimental-strip-types'` → đổi sang `bun`. |
| `test/storage.bench.ts` | 7,088 | chép rồi sửa | 2 dòng scope. `vitest` bench → chuyển sang `packages/durable/bench/*.bench.ts` (Bun bench). |
| `test/scratch.ts` | 6,871 | chép rồi sửa | 1 dòng scope. Script viết tay - xem xét bỏ, không phải test contract. |
| `docs/pico-v5.md` | 114,252 | chép rồi sửa | 3 dòng scope. 114 KB - đặc tả normative giữ nguyên. |
| `docs/pico-v5-chord-usage.md` | 18,156 | chép rồi sửa | 3 dòng scope. |
| `docs/pico-v5-handoff.md` | 26,291 | chép rồi sửa | 1 dòng scope. |
| `docs/pico-v5-live-registries.md` | 25,169 | chép nguyên văn | Không có scope. |
| `docs/chord-delta-findings.md` | 19,469 | chép nguyên văn | Không có scope. |
| _(không phải 1 file — áp dụng cho mọi file trong `src/`)_ | — | chép rồi sửa | **BẮT BUỘC sửa luật dự án sau khi chép** (`bun run check:ts` + `oxlint` sẽ đỏ nếu bỏ qua). (a) `private` → `#private`: 64 chỗ field/method trong `src/storage/memory.ts` (13), `src/storage/sqlite/storage.ts` (17), `src/storage/sqlite/node.ts` (3), `src/storage/jsonl/storage.ts` (22), `src/env/node.ts` (11) — AGENTS.md:49. (`src/session/session.ts` đã dùng `#` sẵn.) (b) `ReturnType<>`: 11 chỗ — `src/env/node.ts` (8), `src/storage/jsonl/storage.ts` (2), `src/env/utils/adaptive-publisher.ts` (1) — AGENTS.md:45. (c) `new Promise(`: 3 chỗ trong `src/env/node.ts` (L149, L296, L485) → `Promise.withResolvers()` — AGENTS.md:50. Xem bước 15b. |

Ngoài 63 file trên, bước 2 tạo thêm `packages/durable/LICENSE` — không chép từ đâu, mà tạo mới từ bản MIT ở `pi-ref` root.

### Bề mặt công khai — bảng: symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa |
| --- | --- | --- | --- | --- |
| `defineDoc` | function | `src/documents.ts:38-53` | `packages/durable/src/documents.ts` | Không — overload set chọn scope→token |
| `defineDocFamily` | function | `src/documents.ts:59-79` | `packages/durable/src/documents.ts` | Không — overload set nhét |
| `ReadAfterWrite` | class | `src/errors.ts:2` | `packages/durable/src/errors.ts` | Không |
| `StorageRejected` | class | `src/errors.ts:10` | `packages/durable/src/errors.ts` | Không |
| `createSession` | function | `src/session/session.ts:37` | `packages/durable/src/session/session.ts` | Không |
| `SessionKernel` | class | `src/session/session.ts:47` | `packages/durable/src/session/session.ts` | Không — không export từ index, nội bộ |
| `MemoryStorage` | class | `src/storage/memory.ts:215` | `packages/durable/src/storage/memory.ts` | Không — storage trong bộ 772 dòng |
| `JsonObject` | type | `src/types.ts:6` | XEM `collisions[]` | **Có** — VA CHẠM hình dạng |
| `Id` | type | `src/types.ts:11` | `packages/durable/src/types.ts` | Không — nominal brand trên number |
| `ConversationId` | type | `src/types.ts:18` | `packages/durable/src/types.ts` | Không |
| `EntryId` | type | `src/types.ts:19` | `packages/durable/src/types.ts` | Không |
| `TaskId` | type | `src/types.ts:20` | `packages/durable/src/types.ts` | Không |
| `SubmissionId` | type | `src/types.ts:21` | `packages/durable/src/types.ts` | Không |
| `DocumentId` | type | `src/types.ts:22` | `packages/durable/src/types.ts` | Không |
| `Seq` | type | `src/types.ts:27` | `packages/durable/src/types.ts` | Không — commit sequence đánh số |
| `ROOT_CONVERSATION_ID` | const | `src/types.ts:30` | `packages/durable/src/types.ts` | Không — giá trị 1 gắn với brand |
| `LatestConversationSemantics` | type | `src/types.ts:33` | `packages/durable/src/types.ts` | Không |
| `RewindableConversationSemantics` | type | `src/types.ts:40` | `packages/durable/src/types.ts` | Không |
| `DocumentSemantics` | type | `src/types.ts:47` | `packages/durable/src/types.ts` | Không |
| `CommonDocDefinition` | type | `src/types.ts:54` | `packages/durable/src/types.ts` | Không |
| `DocDefinition` | type | `src/types.ts:65` | `packages/durable/src/types.ts` | Không |
| `DocFamilyDefinition` | type | `src/types.ts:68` | `packages/durable/src/types.ts` | Không |
| `DocToken` | interface | `src/types.ts:77` | `packages/durable/src/types.ts` | Không |
| `DocFamilyToken` | interface | `src/types.ts:83` | `packages/durable/src/types.ts` | Không |
| `SessionDocToken` | type | `src/types.ts:88` | `packages/durable/src/types.ts` | Không |
| `ConversationDocToken` | type | `src/types.ts:89` | `packages/durable/src/types.ts` | Không |
| `RewindableConversationDocToken` | type | `src/types.ts:93` | `packages/durable/src/types.ts` | Không |
| `TaskDocToken` | type | `src/types.ts:97` | `packages/durable/src/types.ts` | Không |
| `SessionDocFamilyToken` | type | `src/types.ts:99` | `packages/durable/src/types.ts` | Không |
| `ConversationDocFamilyToken` | type | `src/types.ts:104` | `packages/durable/src/types.ts` | Không |
| `RewindableConversationDocFamilyToken` | type | `src/types.ts:109` | `packages/durable/src/types.ts` | Không |
| `TaskDocFamilyToken` | type | `src/types.ts:114` | `packages/durable/src/types.ts` | Không |
| `TaskDefinition` | type | `src/types.ts:123` | `packages/durable/src/types.ts` | Không |
| `Task` | interface | `src/types.ts:136` | `packages/durable/src/types.ts` | Không |
| `TaskOptions` | type | `src/types.ts:141` | `packages/durable/src/types.ts` | Không |
| `ConversationOwnership` | type | `src/types.ts:151` | `packages/durable/src/types.ts` | Không |
| `ConversationRecord` | type | `src/types.ts:154` | `packages/durable/src/types.ts` | Không |
| `ContextEdit` | type | `src/types.ts:169` | `packages/durable/src/types.ts` | Không |
| `EntryRecord` | type | `src/types.ts:185` | `packages/durable/src/types.ts` | Không |
| `EntryDraft` | type | `src/types.ts:203` | `packages/durable/src/types.ts` | Không |
| `SubmissionRecord` | type | `src/types.ts:217` | `packages/durable/src/types.ts` | Không |
| `SubmissionCreate` | type | `src/types.ts:284` | `packages/durable/src/types.ts` | Không |
| `TaskOutcomeError` | type | `src/types.ts:291` | `packages/durable/src/types.ts` | Không |
| `TaskOutcome` | type | `src/types.ts:298` | `packages/durable/src/types.ts` | Không |
| `TaskState` | type | `src/types.ts:335` | `packages/durable/src/types.ts` | Không |
| `TaskRecord` | type | `src/types.ts:376` | `packages/durable/src/types.ts` | Không |
| `DocumentRecord` | type | `src/types.ts:390` | `packages/durable/src/types.ts` | Không |
| `DocumentCreate` | type | `src/types.ts:429` | `packages/durable/src/types.ts` | Không |
| `Page` | type | `src/types.ts:436` | `packages/durable/src/types.ts` | Không |
| `Cursor` | type | `src/types.ts:442` | `packages/durable/src/types.ts` | Không |
| `ConversationQuery` | type | `src/types.ts:445` | `packages/durable/src/types.ts` | Không |
| `EntryQuery` | type | `src/types.ts:451` | `packages/durable/src/types.ts` | Không |
| `TaskQuery` | type | `src/types.ts:460` | `packages/durable/src/types.ts` | Không |
| `DocumentPoint` | type | `src/types.ts:469` | `packages/durable/src/types.ts` | Không |
| `DocumentAddress` | type | `src/types.ts:472` | `packages/durable/src/types.ts` | Không |
| `DocumentQuery` | type | `src/types.ts:480` | `packages/durable/src/types.ts` | Không |
| `DocumentContent` | type | `src/types.ts:487` | `packages/durable/src/types.ts` | Không |
| `DocumentCopySource` | type | `src/types.ts:500` | `packages/durable/src/types.ts` | Không |
| `StoredDocument` | type | `src/types.ts:506` | `packages/durable/src/types.ts` | Không |
| `StorageWrite` | type | `src/types.ts:513` | `packages/durable/src/types.ts` | Không |
| `Tx` | interface | `src/types.ts:535` | `packages/durable/src/types.ts` | Không |
| `Session` | interface | `src/types.ts:607` | `packages/durable/src/types.ts` | Không |
| `Storage` | interface | `src/types.ts:665` | `packages/durable/src/types.ts` | Không |
| `Result` | type | `src/env/index.ts:5` | `packages/durable/src/env/index.ts` | Không — không phải pi `Result` |
| `ok` | function | `src/env/index.ts:7` | `packages/durable/src/env/index.ts` | Không |
| `err` | function | `src/env/index.ts:11` | `packages/durable/src/env/index.ts` | Không |
| `getOrThrow` | function | `src/env/index.ts:15` | `packages/durable/src/env/index.ts` | Không |
| `getOrUndefined` | function | `src/env/index.ts:20` | `packages/durable/src/env/index.ts` | Không |
| `toError` | function | `src/env/index.ts:24` | XEM `collisions[]` | **Có** — omp có sẵn ở `packages/utils/src/type-guards.ts:15` |
| `FileKind` | type | `src/env/index.ts:34` | `packages/durable/src/env/index.ts` | Không |
| `FileErrorCode` | type | `src/env/index.ts:36` | `packages/durable/src/env/index.ts` | Không |
| `FileError` | class | `src/env/index.ts:46` | `packages/durable/src/env/index.ts` | Không |
| `ExecutionErrorCode` | type | `src/env/index.ts:58` | `packages/durable/src/env/index.ts` | Không |
| `ExecutionError` | class | `src/env/index.ts:66` | `packages/durable/src/env/index.ts` | Không |
| `FileInfo` | interface | `src/env/index.ts:76` | `packages/durable/src/env/index.ts` | Không |
| `TextLine` | interface | `src/env/index.ts:84` | `packages/durable/src/env/index.ts` | Không |
| `TextLineReader` | interface | `src/env/index.ts:89` | `packages/durable/src/env/index.ts` | Không |
| `FileSystem` | interface | `src/env/index.ts:95` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputRetention` | type | `src/env/index.ts:136` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputLimits` | interface | `src/env/index.ts:138` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputCaptureOptions` | interface | `src/env/index.ts:144` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputTruncation` | type | `src/env/index.ts:149` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputMetadata` | interface | `src/env/index.ts:151` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputView` | interface | `src/env/index.ts:157` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputUpdate` | type | `src/env/index.ts:161` | `packages/durable/src/env/index.ts` | Không |
| `ShellExecResult` | interface | `src/env/index.ts:167` | `packages/durable/src/env/index.ts` | Không |
| `ShellExecOptions` | interface | `src/env/index.ts:171` | `packages/durable/src/env/index.ts` | Không |
| `Shell` | interface | `src/env/index.ts:180` | XEM `collisions[]` | **Có** — omp có `Shell` là string-union `'bash'`\|`'zsh'`\|`'fish'` tại `packages/coding-agent/src/cli/completion-gen.ts:20` |
| `ExecutionEnv` | interface | `src/env/index.ts:189` | `packages/durable/src/env/index.ts` | Không |
| `NodeExecutionEnv` | class | `src/env/node.ts:438` | `packages/durable/src/env/node.ts` | Không — 963 dòng, đọc lại bằng `node:child_process` |
| `SqliteValue` | type | `src/storage/sqlite/database.ts:2` | `packages/durable/src/storage/sqlite/database.ts` | Không |
| `SqliteStatement` | interface | `src/storage/sqlite/database.ts:8` | `packages/durable/src/storage/sqlite/database.ts` | Không |
| `SqliteDatabase` | interface | `src/storage/sqlite/database.ts:26` | `packages/durable/src/storage/sqlite/database.ts` | Không — facade đồng bộ để adapter Bun/Node cùng hiểu |
| `SqliteStorage` | class | `src/storage/sqlite/storage.ts:166` | `packages/durable/src/storage/sqlite/storage.ts` | Không — 809 dòng |
| `SqliteMigration` | type | `src/storage/sqlite/migrations.ts:3` | `packages/durable/src/storage/sqlite/migrations.ts` | Không |
| `SQLITE_MIGRATIONS` | const | `src/storage/sqlite/migrations.ts:85` | `packages/durable/src/storage/sqlite/migrations.ts` | Không — chỉ 1 migration version 1 |
| `CURRENT_SQLITE_SCHEMA_VERSION` | const | `src/storage/sqlite/migrations.ts:87` | `packages/durable/src/storage/sqlite/migrations.ts` | Không |
| `applySqliteMigrations` | function | `src/storage/sqlite/migrations.ts:92` | `packages/durable/src/storage/sqlite/migrations.ts` | Không |
| `NodeSqliteDatabase` | class | `src/storage/sqlite/node.ts:40` | `packages/durable/src/storage/sqlite/node.ts` | Không — adapter `node:sqlite`, xung đột với AGENTS.md, xem `collisions[]` |
| `openNodeSqliteDatabase` | function | `src/storage/sqlite/node.ts:91` | `packages/durable/src/storage/sqlite/node.ts` | Không |
| `openNodeSqliteStorage` | function | `src/storage/sqlite/node.ts:116` | `packages/durable/src/storage/sqlite/node.ts` | Không |
| `NodeSqliteStorageOptions` | type | `src/storage/sqlite/node.ts:9` | `packages/durable/src/storage/sqlite/node.ts` | Không |
| `JsonlStorage` | class | `src/storage/jsonl/storage.ts:240` | `packages/durable/src/storage/jsonl/storage.ts` | Không — 840 dòng |
| `JsonlStorageOptions` | type | `src/storage/jsonl/storage.ts:75` | `packages/durable/src/storage/jsonl/storage.ts` | Không |
| `JsonlCorruptionError` | class | `src/storage/jsonl/storage.ts:80` | `packages/durable/src/storage/jsonl/storage.ts` | Không |
| `JsonlStoragePoisonedError` | class | `src/storage/jsonl/storage.ts:87` | `packages/durable/src/storage/jsonl/storage.ts` | Không |
| `openNodeJsonlStorage` | function | `src/storage/jsonl/node.ts:6` | `packages/durable/src/storage/jsonl/node.ts` | Không |
| `createExpectAssertions` | function | `src/testing/assertions.ts:17` | `packages/durable/src/testing/assertions.ts` | Không — cấu hình vitest, dùng lại nguyên |
| `ExpectLike` | type | `src/testing/assertions.ts:3` | `packages/durable/src/testing/assertions.ts` | Không |
| `registerStorageConformance` | function | `src/testing/runner.ts:12` | `packages/durable/src/testing/runner.ts` | Không |
| `StorageConformanceRunner` | interface | `src/testing/runner.ts:5` | `packages/durable/src/testing/runner.ts` | Không |
| `createStorageConformance` | function | `src/testing/storage-conformance.ts:90` | `packages/durable/src/testing/storage-conformance.ts` | Không — 1,520 dòng, bộ conformance lớn nhất |
| `StorageConformanceAssertions` | interface | `src/testing/types.ts:3` | `packages/durable/src/testing/types.ts` | Không |
| `StorageConformanceProvider` | type | `src/testing/types.ts:12` | `packages/durable/src/testing/types.ts` | Không |
| `StorageConformanceOptions` | type | `src/testing/types.ts:14` | `packages/durable/src/testing/types.ts` | Không |
| `StorageConformanceCase` | type | `src/testing/types.ts:19` | `packages/durable/src/testing/types.ts` | Không |
| `StorageBenchmarkScale` | type | `src/testing/storage-benchmark.ts:17` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `STORAGE_MEMORY_SCALES` | const | `src/testing/storage-benchmark.ts:24` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `TIMING_SCALE` | const | `src/testing/storage-benchmark.ts:29` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `storageBenchmarkPrimaryRecordCount` | function | `src/testing/storage-benchmark.ts:42` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `StorageBenchmarkDataset` | type | `src/testing/storage-benchmark.ts:56` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `seedStorageBenchmark` | function | `src/testing/storage-benchmark.ts:89` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `StorageReadBenchmark` | type | `src/testing/storage-benchmark.ts:279` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `STORAGE_READ_BENCHMARKS` | const | `src/testing/storage-benchmark.ts:285` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `StorageWriteBenchmark` | type | `src/testing/storage-benchmark.ts:385` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `seedStorageWriteBenchmark` | function | `src/testing/storage-benchmark.ts:392` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `STORAGE_WRITE_BENCHMARKS` | const | `src/testing/storage-benchmark.ts:410` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `truncateHead` | function | `src/env/utils/truncate.ts:132` | XEM `collisions[]` | **Có** — VA CHẠM |
| `truncateTail` | function | `src/env/utils/truncate.ts:220` | XEM `collisions[]` | **Có** — VA CHẠM |
| `truncateLine` | function | `src/env/utils/truncate.ts:338` | XEM `collisions[]` | **Có** — VA CHẠM |
| `TruncationResult` | interface | `src/env/utils/truncate.ts:15` | XEM `collisions[]` | **Có** — VA CHẠM hình dạng |
| `TruncationOptions` | interface | `src/env/utils/truncate.ts:40` | XEM `collisions[]` | **Có** — VA CHẠM hình dạng |
| `DEFAULT_MAX_LINES` | const | `src/env/utils/truncate.ts:11` | XEM `collisions[]` | **Có** — VA CHẠM giá trị 2000 vs 3000 |
| `DEFAULT_MAX_BYTES` | const | `src/env/utils/truncate.ts:12` | XEM `collisions[]` | **Có** — cùng giá trị 50*1024 |
| `GREP_MAX_LINE_LENGTH` | const | `src/env/utils/truncate.ts:13` | `packages/durable/src/env/utils/truncate.ts` | Không — riêng của durable |
| `utf8ByteLength` | function | `src/env/utils/truncate.ts:54` | `packages/durable/src/env/utils/truncate.ts` | Không — omp chỉ có bản private trong `packages/coding-agent/src/live/protocol.ts:203` |
| `formatSize` | function | `src/env/utils/truncate.ts:115` | XEM `collisions[]` | **Có** — omp có `formatBytes` tại pi-tui/render/render-utils, alias ở legacy shim:1596 |
| `OutputCapture` | class | `src/env/utils/output-capture.ts:26` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `applyShellOutputUpdate` | function | `src/env/utils/output-capture.ts:173` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `sanitizeShellOutput` | function | `src/env/utils/output-capture.ts:234` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `OUTPUT_MIN_EMIT_INTERVAL_MS` | const | `src/env/utils/output-capture.ts:6` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `OUTPUT_TARGET_BYTES_PER_SECOND` | const | `src/env/utils/output-capture.ts:7` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `AdaptivePublisher` | class | `src/env/utils/adaptive-publisher.ts:18` | `packages/durable/src/env/utils/adaptive-publisher.ts` | Không |
| `AdaptivePublisherOptions` | interface | `src/env/utils/adaptive-publisher.ts:1` | `packages/durable/src/env/utils/adaptive-publisher.ts` | Không |
| `AnyDocDefinition` | type | `src/documents.ts:82` | `packages/durable/src/documents.ts` | Không |
| `AnyDocToken` | type | `src/documents.ts:92` | `packages/durable/src/documents.ts` | Không |
| `ResolvedAddress` | type | `src/documents.ts:101` | `packages/durable/src/documents.ts` | Không |
| `resolveAddress` | function | `src/documents.ts:108` | `packages/durable/src/documents.ts` | Không |
| `addressId` | function | `src/documents.ts:136` | `packages/durable/src/documents.ts` | Không |
| `documentCreate` | function | `src/documents.ts:147` | `packages/durable/src/documents.ts` | Không |
| `checkRecordScope` | function | `src/documents.ts:167` | `packages/durable/src/documents.ts` | Không |
| `checkRecordVersion` | function | `src/documents.ts:178` | `packages/durable/src/documents.ts` | Không |
| `materializeDocument` | function | `src/documents.ts:192` | `packages/durable/src/documents.ts` | Không |
| `materializeDocumentValue` | function | `src/documents.ts:197` | `packages/durable/src/documents.ts` | Không |
| `idFromNumber` | function | `src/ids.ts:4` | `packages/durable/src/ids.ts` | Không |
| `seqFromNumber` | function | `src/ids.ts:9` | `packages/durable/src/ids.ts` | Không |
| `Transaction` | class | `src/session/transaction.ts:150` | `packages/durable/src/session/transaction.ts` | Không — 879 dòng |
| `TransactionHost` | interface | `src/session/transaction.ts:87` | `packages/durable/src/session/transaction.ts` | Không |
| `DocumentCommitChange` | type | `src/session/transaction.ts:56` | `packages/durable/src/session/transaction.ts` | Không |
| `LoadedDocument` | type | `src/session/transaction.ts:78` | `packages/durable/src/session/transaction.ts` | Không |
| `CommitPublication` | type | `src/session/publications.ts:13` | `packages/durable/src/session/publications.ts` | Không |
| `CommitChange` | type | `src/session/publications.ts:10` | `packages/durable/src/session/publications.ts` | Không |
| `TableCommitChange` | type | `src/session/publications.ts:5` | `packages/durable/src/session/publications.ts` | Không |
| `ForkDocumentCopy` | type | `src/session/forks.ts:20` | `packages/durable/src/session/forks.ts` | Không |
| `prepareForkDocumentCopies` | function | `src/session/forks.ts:26` | `packages/durable/src/session/forks.ts` | Không |

### Dependency mới

| tên | phiên bản | đã có ở omp | vì sao |
| --- | --- | --- | --- |
| `@oh-my-pi/chord` | `0.87.1` (workspace) | Không | 52 lần import. Cung cấp 14 symbol (đã đếm từ 24 câu lệnh import trong `src/`; `Change`/`Prepared`/`Tracker` đến từ `src/session/transaction.ts:2`): `Context`/`Draft`/`JsonValue`/`Op`/`Change`/`Prepared`/`Tracker`/`copyJson`/`track`/`apply`/`applyImmutableBatches`/`awaitWithContext`/`withoutAbortSignal`/`BACKGROUND_CONTEXT`. `withAbortSignal` chỉ dùng ở `test/env-node.test.ts:7`, không có trong `src/`. KHÔNG có nó thì `durable` không chạy được. License MIT. |
| `@oh-my-pi/pi-ai` | workspace | Có | CHỈ 1 import type: `Message` tại `src/types.ts:3`, dùng trong `ContextEdit.replace.messages` và `EntryRecord.model`. Shape giống hệt omp `packages/ai/src/types.ts:1199`. License MIT. |

Những thứ **KHÔNG** thêm vào, và vì sao:

- `vitest` — bỏ. omp dùng `bun:test`; `vitest.config.ts` và `vitest.benchmark.config.ts` cùng bị loá khỏi danh sách chép, và 19 file test phải đổi `from 'vitest'` sang `from 'bun:test'`.
- `shx` — bỏ khỏi devDeps cùng `vitest`. Không còn script nào trong package cần nó.
- Không dựng `dist`: `package.json` không có `'source'` condition, không có trường `'dist'`, không có script `'build'`; `exports` trỏ thẳng vào `./src/*.ts` như `packages/utils` và `packages/tui`.
- Không có `tsconfig.build.json` (không build `dist`), nhưng CÓ `tsconfig.json` tối thiểu chỉ để `check:types` chạy được.
- Không dùng chung DB với các store hiện có: 51 file `src` của omp đã dùng `bun:sqlite`, còn `durable` thêm storage sqlite với schema riêng (`conversations`/`entries`/`tasks`/`submissions`/`documents`). Mặc định giữ DB RIÊNG — dùng chung sẽ phải viết migration nội bộ và tăng rủi ro gấp 2 lần.
- `@oh-my-pi/pi-utils` và `@oh-my-pi/pi-tui` không nằm trong danh sách 2 dep ở trên, nhưng bước 8 và bước 9 bắt buộc import `truncateHead`/`truncateTail`/`truncateLine`/`TruncationResult`/`TruncationOptions`/`formatBytes` từ hai package đó. Cần xác nhận chúng có nằm trong `dependencies` của `packages/durable/package.json` hay không.

### Va chạm với thứ omp đã có — bảng: cái gì | neo phía pi | neo phía omp | cách giải quyết

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| `TruncationResult` — cùng tên, KHÁC HÌNH DẠNG. durable (11 trường bắt buộc: `content`, `truncated:boolean`, `truncatedBy:'lines'\|'bytes'\|null`, `totalLines`, `totalBytes`, `outputLines:number`, `outputBytes:number`, `lastLinePartial:boolean`, `firstLineExceedsLimit:boolean`, `maxLines:number`, `maxBytes:number`) khác omp (14 trường nhưng chỉ 3 bắt buộc, 11 OPTIONAL, KHÔNG có `maxLines`/`maxBytes`, và thêm 6 trường middle-truncation `elidedBytes`/`elidedLines`/`headLines`/`tailLines`/`partialByteWindows` + `truncatedBy` chấp nhận thêm `'middle'`). | `src/env/utils/truncate.ts:15-45` | `packages/tui/src/tools/streaming-output.ts:105-126` | **GIỮ omp.** Không cắt sang phía durable. `durable` bỏ wrapper riêng để bổ sung 2 trường `maxLines`/`maxBytes` vào kết quả của pi-tui, vì `src/env/utils/output-capture.ts:203` ĐỌC `current.truncation.maxBytes` để tính độ đo quét overlap. Cách này giữ 1 hình dạng duy nhất trong repo và không phải sửa 1,576 dòng `streaming-output.ts` đang dùng bởi cả TUI. |
| `DEFAULT_MAX_LINES` — cùng tên, KHÁC GIÁ TRỊ. durable = 2000, omp = 3000. Đây là observable: một lệnh shell 2,500 dòng sẽ bị durable cắt, không bị omp cắt. | `src/env/utils/truncate.ts:11` | `packages/tui/src/tools/streaming-output.ts:10` | **GIỮ omp (3000).** `durable` luôn truyền `limits` tương minh qua `OutputCapture` (`src/env/utils/output-capture.ts:46-47`), nên default ít khi đường đánh tính. Bắt buộc nếu muốn giữ 2000 thì truyền rõ ràng, không đưa vào constant. |
| `truncateLine` — cùng tên, KHÁC MARKER và KHÁC DEFAULT. durable cắt ở 500 (`GREP_MAX_LINE_LENGTH`) và chèn `'... [truncated]'`; omp cắt ở 512 (`DEFAULT_MAX_COLUMN`) và chèn `'…'`, kèm `materializeString()` để intern string của Bun. | `src/env/utils/truncate.ts:338-345` | `packages/tui/src/tools/streaming-output.ts:285-293` | **GIỮ omp.** Đó là dải 2,500/3,000 dòng, dùng để hiển thị, không phải contract dữ liệu. Nếu cần hạn 500 thì truyền 500. |
| `Shell` — cùng tên, KHÁC NGHĨA HOÀN TOÀN. durable là INTERFACE (exec + cleanup); omp là STRING-UNION `'bash'`\|`'zsh'`\|`'fish'`. | `src/env/index.ts:180-187` | `packages/coding-agent/src/cli/completion-gen.ts:20` | **KHÔNG sửa gì cả hai bên** — ở các package khác nhau nên không conflict. NHƯNG cần canh: bảo đảm KHÔNG bao giờ merge `durable/env` vào một barrel chung với `pi-coding-agent`. Giữ nguyên. |
| `Context` — cùng tên, KHÁC NGHĨA. durable import `Context` từ chord (context nền / hủy); omp `Context` tại `packages/ai/src/types.ts:1476` là `{systemPrompt, messages, tools, inactiveTools}` — context của một request model. | `src/types.ts:1`, `src/session/session.ts:1` | `packages/ai/src/types.ts:1476-1483` | **KHÔNG đổi tên.** `durable` nhập ĐÚNG từ `@oh-my-pi/chord` nên không bao giờ nhập `Context` từ `pi-ai`. Khi wiring lại trong omp, phải truyền chord `Context` (`BACKGROUND_CONTEXT`) — truyền nhầm `pi-ai` `Context` sẽ lỗi type, đây là biến cạnh bao phải ghi vào README. |
| `JsonObject` — cùng tên, KHÁC HÌNH DẠNG. durable: `{ [key: string]: JsonValue }` với `JsonValue` từ chord; omp: `Record<string, unknown>`. | `src/types.ts:6` | `packages/ai/src/utils/schema/types.ts:1` | **GIỮ durable.** Riêng `durable` KHÔNG import `JsonObject` từ `pi-ai` nên không conflict trực tiếp. NHƯNG BẤT BUỘC không re-export cả hai vào cùng một barrel — nếu cần, đặt lại tên thành `DurableJsonObject` ở khi biên giới. |
| `toError` — cùng tên, cùng chức năng, KHÁC XỬ LÝ. durable (thử `Error` → `string` → `JSON.stringify` → `String`); omp có sẵn. | `src/env/index.ts:24-32` | `packages/utils/src/type-guards.ts:15` | **DÙNG BẢN CỦA omp.** Xoá hàm trong `durable`, import `{ toError }` từ `@oh-my-pi/pi-utils`. AGENTS.md: 'Search first: grep for the operation before implementing it. Two implementations of the same thing is a bug.' |
| `formatSize` — cùng tên, khác hàm. durable là helper in kích thước byte; omp có `formatBytes` trong pi-tui/render/render-utils, đã được alias ở `packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1596`. | `src/env/utils/truncate.ts:115-130` | `packages/tui/src/render/render-utils.ts` (qua alias `legacy-pi-coding-agent-shim.ts:1596`) | **DÙNG BẰNG `formatBytes` CỦA omp.** Xoá hàm riêng khi cắt `truncate.ts`. Giữ `utf8ByteLength` vì omp chỉ có bản private trong một file không xuất. |
| Node SQLite adapter dùng `node:sqlite`, còn omp dùng `bun:sqlite` ở 51 file `src` (`git grep -l 'bun:sqlite' -- 'packages/*/src/**'` = 51). AGENTS.md quy định Bun trước Node. | `src/storage/sqlite/node.ts:3-4` (import `DatabaseSync` từ `node:sqlite`) | `packages/catalog/src/model-cache.ts:5`, `packages/coding-agent/src/session/agent-storage.ts:1` (`bun:sqlite`), pi-utils `openSqliteDatabaseSync` | **VIẾT adapter `bun:sqlite` mới** cho `SqliteDatabase` facade (`src/storage/sqlite/database.ts:26`) — facade 31 dòng nên adapter mới ~60 dòng, tái dùng 100% `SqliteStorage` 809 dòng. Giữ bản `node:sqlite` sau phía subpath `/storage/sqlite/node` để không phá API công khai. |
| `NodeExecutionEnv` dùng `node:child_process` `spawn`; repo chỉ còn 1 file duy nhất dùng `node:child_process`. AGENTS.md quy 'Bun Over Node' và cấm spawn shell khi có API. | `src/env/node.ts:1` (`spawn` từ `node:child_process`) | `packages/metaharness/src/runner.ts:1` (duy nhất còn lại) | **Đổi sang `Bun.spawn`.** Đây là file nguy hiểm nhất của package (963 dòng, streaming + spill + adaptive publish). LÀM MỘT PR RIÊNG, không gộp với migration, để 14 test hiện có làm mạng an toàn. |
| Vị trí đặt: omp `packages/agent/` và `pi-ref packages/agent/` CHỈ giao 5 tên file trên 50 (omp) vs 117 (pi) — đo theo ĐƯỜNG DẪN TƯƠNG ĐỐI trong `src/`; nếu chỉ so tên file thì 12 — và cả 5 đều lệch khỏi đối lượng lớn (`agent-loop.ts` 148KB omp vs 26KB pi). `durable` là sực EXTEND của pi, không phải bản sao. | `packages/agent/src/harness/{session,utils}` (pi) vs `packages/agent/src` (omp) | `packages/agent/src/` (omp) | **Đặt `durable` ở `packages/durable/` (mới) — KHÔNG BAO GIỜ ghi đè `packages/agent/`.** Cùng bộ đặc tả trong pi `packages/agent/src/harness/utils/{truncate,output-capture,adaptive-publisher}.ts` là TIỀN THÂN của `durable`, nên khi migrate `agent` phải khớp — đã ghi vào `open_questions`. |

Đọc `documents.ts` thì còn hai xung đột do BẢN BỎ QUA mà bản sao + đổi 2 dòng scope không giải được:

- (a) `checkRecordScope` so sánh `record.scope.kind` và `definition.scope`, và `documentCreate` là bản ghi SCOPE có bản ghi HISTORY/FORK — khi wiring vào code omp đang dùng `pi-ai` `Context`, hay truyền nhầm sẽ biến thành lỗi so sánh ký tự dương.
- (b) `materializeDocument` gọi `copyJson` của chord — HÀM NÀY PHẢI ĐƯỢC DÙNG ĐÚNG, không được thế bằng `structuredClone`, vì nó giữ nguyên tính bất biến của chord mà `track()` sau đó đo.

### Các bước

1. **TAO KHUNG.** `mkdir -p packages/durable/{src/{session,storage/{sqlite,jsonl},env/utils,testing},test,docs,bench}`. Không bắt buộc là `cp -r` cả thư mục — tạo đúng cấu trúc để không kéo theo `vitest.config.ts`, `vitest.benchmark.config.ts`, `tsconfig.build.json` (3 file sẽ bị lo). *(neo: `packages/durable/` (mới))*
2. **PHÁP LÝ — BẮT BUỘC LÀM TRƯỚC KHI COPY FILE NÀO.** Tạo `packages/durable/LICENSE` = verbatim bản MIT ở `pi-ref/` root LICENSE (Copyright (c) 2025 Mario Zechner). File đó có 21 dòng nội dung nhưng KHÔNG có newline ở dòng cuối, nên `wc -l` báo 20 — đừng "sửa cho đủ 21 dòng". KHÔNG sửa dòng nào. Đây là điều kiện để việc chép hợp pháp. *(neo: `packages/durable/LICENSE`)*
3. **CHÉP 29 file `src/` nguyên văn**, dùng `git show d6af72e:packages/durable/<path>` để ghi ra (không dùng `cp -r` để không kéo file rác). 312,754 byte, 9,024 dòng. *(neo: `packages/durable/src/`)*
4. **CHÉP 23 file `test/`** cùng cách. 281,348 byte. *(neo: `packages/durable/test/`)*
5. **CHÉP 5 file `docs/`** cùng cách. 203,437 byte. KHÔNG bỏ docs — 114 KB đặc tả normative là bằng chứng hiện trạng. *(neo: `packages/durable/docs/`)*
6. **CHÉP `README.md` và `CHANGELOG.md`.** 4,404 + 1,387 byte. *(neo: `packages/durable/{README,CHANGELOG}.md`)*
7. **ĐỔI SCOPE.** 78 lần, dùng `grep -rl '@earendil-works/' packages/durable | xargs sed -i '' 's|@earendil-works/|@oh-my-pi/|g'`. 24 `chord` + 11 `chord/delta` + 17 `chord/context` + 4 `pi-ai` + 22 `pi-durable`. KIỂM CHỨNG: `grep -rc '@earendil-works/' packages/durable` phải ra 0 ở mọi dòng. *(neo: 37 file có scope — 14 `src`, 17 `test`, 3 `docs`, `package.json`, `README.md`, `tsconfig.build.json`)*
8. **GIẢI QUYẾT TRÙNG TÊN — BƯỚC NGUY HIỂM NHẤT.** Xoá `src/env/utils/truncate.ts` và viết lại: import `truncateHead`/`truncateTail`/`truncateLine`/`TruncationResult`/`TruncationOptions` từ `@oh-my-pi/pi-tui/tools/streaming-output` (KHÔNG phải barrel `@oh-my-pi/pi-tui/tools` — barrel đó là registry renderer, KHÔNG re-export `streaming-output`; đã kiểm chứng: `bun -e 'import { truncateHead } from "@oh-my-pi/pi-tui/tools"'` → `SyntaxError: Export named 'truncateHead' not found`. LƯU Ý: subpath này kéo theo `pi-natives` — xem mục Cần người quyết), giữ riêng `GREP_MAX_LINE_LENGTH` + `utf8ByteLength`, và bọc `'enhance'` trả về thêm `maxLines`/`maxBytes` cho mỗi kết quả. Sửa `src/env/utils/output-capture.ts:203` để đọc `maxBytes` từ `limits` thay vì từ `truncation`. Xem `collisions[0..2]`. *(neo: `src/env/utils/truncate.ts`, `src/env/utils/output-capture.ts:203`)*
9. **DÙNG LẠI TÁI DỤNG.** Xoá hàm `toError` (`src/env/index.ts:24-32`) và `formatSize` (`src/env/utils/truncate.ts:115-130`); import `{ toError }` từ `@oh-my-pi/pi-utils` và `{ formatBytes as formatSize }` từ `@oh-my-pi/pi-tui/render/render-utils`. AGENTS.md: 'Missing capability? Extend the central helper - do not fork its logic locally.' *(neo: `src/env/index.ts`, `src/env/utils/truncate.ts`)*
10. **BARREL → STAR.** `src/index.ts` (62 dòng named re-export), `src/storage/sqlite/index.ts`, `src/storage/jsonl/index.ts`, `src/testing/index.ts`: chuyển sang `export * from` theo AGENTS.md. Giữ nguyên danh sách tên export. *(neo: `src/index.ts`, `src/storage/{sqlite,jsonl}/index.ts`, `src/testing/index.ts`)*
11. **VIẾT `package.json` theo convention omp:** tên `@oh-my-pi/pi-durable`, KHÔNG có trường `'source'` condition, KHÔNG có `'dist'` — `exports` trỏ thẳng vào `./src/*.ts` như `packages/utils` và `packages/tui`. 10 subpath: `'.'`, `'./env'`, `'./env/node'`, `'./storage/memory'`, `'./storage/jsonl'`, `'./storage/jsonl/node'`, `'./storage/sqlite'`, `'./storage/sqlite/node'`, `'./testing'`, `'./package.json'`. Dependencies: `@oh-my-pi/chord` + `@oh-my-pi/pi-ai`. DevDeps: KHÔNG `vitest`, KHÔNG `shx`. Scripts: `'check:types'`. Không `'build'`. *(neo: `packages/durable/package.json`)*
12. **CẦN `packages/durable/tsconfig.json` riêng (KHÔNG phải `tsconfig.build.json`).** Không có `tsconfig.build.json` vì omp không build `dist`, NHƯNG script `check:types` mà bước 11 thêm là `tsgo -p tsconfig.json --noEmit` (y hệt `packages/utils/package.json:47` và `packages/tui/package.json:33`) — nó CẦN file này tồn tại, nếu không Xác minh (4) và Cổng sẽ fail. Tạo `packages/durable/tsconfig.json` = `{"extends": "../tsconfig.workspace.json", "include": ["src", "test"]}`, y hệt `packages/utils/tsconfig.json`; `extends` trỏ tới `packages/tsconfig.workspace.json` vốn đã khai báo `include: ["*/src", "*/test", ...]` nên không cần khai lại. Đồng thời thêm `'@oh-my-pi/pi-durable'` vào catalog root package.json để resolve workspace dep (version `18.3.3` như các package khác). *(neo: `package.json` (root) catalog, `packages/durable/tsconfig.json`, `packages/tsconfig.workspace.json`)*
13. **CHUYỂN TEST SANG `bun:test`.** 19 file có `from 'vitest'` → `from 'bun:test'`. AGENTS.md cấm `mock.module()` — máy sử dụng `vi` ở `durable` KHÔNG chỉ là fake timer: (đã kiểm tra: KHÔNG có `mock.module`, NHƯNG `test/env-node-spill.test.ts` DÙNG `vi.hoisted` (L12) + `vi.mock('node:fs', ...)` (L15) để ép backpressure spill deterministic — đây là mock MỨC MODULE, `bun:test` không có API tương đương và AGENTS.md cấm `mock.module()`; phải viết lại bằng seam khác, dependency-inject `createWriteStream` vào `NodeExecutionEnv`, và tách thành task riêng vì đây là test DUY NHẤT ép backpressure spill DETERMINISTIC — `env-node.test.ts` và `env-output-capture.test.ts` có đụng spill nhưng không ép được nhịp). Fake timer (`vi.useFakeTimers`/`vi.setSystemTime`/`vi.advanceTimersByTime`) chỉ ở 2 file: `env-output-capture`, `env-adaptive-publisher`. Ngoài ra còn `vi.spyOn`/`vi.restoreAllMocks` ở `env-node.test.ts:122,425,524` và `vi.useRealTimers` ở `env-output-capture.test.ts:33`, `env-adaptive-publisher.test.ts:5` — chuyển sang `spyOn` trực tiếp từ `bun:test` + `restoreAllMocks()` trong `afterEach`. *(neo: 18 file trong `test/`)*
14. **Viết lại `test/vi` bằng `bun:test`.** omp đã có 176 file dùng `import { afterEach, beforeEach, describe, expect, it } from 'bun:test'` và nhiều file dùng `setSystemTime`, nên có mẫu sẵn để nối. *(neo: 4 file dùng `vi.*`)*
15. **XOÁ 3 file config:** `tsconfig.build.json`, `vitest.config.ts`, `vitest.benchmark.config.ts`. Chuyển `test/storage.bench.ts` + `test/storage-memory.ts` sang `packages/durable/bench/*.bench.ts` theo convention omp (`packages/agent/bench/*.bench.ts`). *(neo: `packages/durable/bench/`)*
15b. **SỬA LUẬT DỰ ÁN SAU KHI CHÉP — BẮT BUỘC, `bun run check:ts` + `oxlint` sẽ đỏ nếu bỏ qua.** (a) `private` → `#private`: 64 chỗ field/method trong `src/storage/memory.ts` (13), `src/storage/sqlite/storage.ts` (17), `src/storage/sqlite/node.ts` (3), `src/storage/jsonl/storage.ts` (22), `src/env/node.ts` (11); AGENTS.md:49 cấm `private`/`protected`/`public` trên field và method. (`src/session/session.ts` đã dùng `#` sẵn.) (b) `ReturnType<>`: 11 chỗ — `src/env/node.ts` (8), `src/storage/jsonl/storage.ts` (2), `src/env/utils/adaptive-publisher.ts` (1) — nên `src/env/utils/adaptive-publisher.ts` KHÔNG chép nguyên văn được (L25 `#timer: ReturnType<typeof setTimeout> | undefined;` → `Timer`). (c) `new Promise(`: 3 chỗ trong `src/env/node.ts` (L149, L296, L485) → `Promise.withResolvers()`. Không có `any`, không có `await import(`, không có `console.*` trong `src/`. *(neo: `src/storage/{memory.ts,jsonl/storage.ts,sqlite/storage.ts,sqlite/node.ts}`, `src/env/node.ts`, `src/env/utils/adaptive-publisher.ts`)*
16. **DỄ CƠI HẠ (chưa làm trong PR này):** đọc lại 11 file docs + README, đổi 11 lần `@earendil-works/` → `@oh-my-pi/`, thêm mục `'## [Unreleased] ### Added'` vào CHANGELOG theo convention omp, thêm mục PHÁP LÝ trỏ về LICENSE vào README. *(neo: `packages/durable/{docs/,README.md,CHANGELOG.md}`)*
17. **GATE.** `bun run check:ts` phải exit 0. Sau đó `bun test packages/durable` — LUÔN Ý CHỈ DÙNG 51 file `src` đã dùng sqlite trong omp, còn `durable` thêm 1 file adapter `bun:sqlite`; xem `gate_can_fail`. *(neo: toàn repo)*

### Hợp đồng test

HỢP ĐỒNG QUAN SÁT ĐƯỢC, 5 nhóm, mỗi nhóm một test thật tại chức năng quan sát được — không test 'code chạy được':

1. **COMMIT NGUYÊN TÚYỆT ĐỐI.** Commit một Session, tất cả ghi vào Memory/Jsonl/Sqlite phải nhìn thấy một commit. Bằng bộ 3 backend cùng một script là bằng chứng tốt nhất — đây là cái test gốc của `storage-conformance.ts` (1,520 dòng) và nên GIỮ NGUYÊN VERBATIM.
2. **TÁI.** `ReadAfterWrite` ném khi đọc sau ghi; `StorageRejected` làm Session vẫn chạy. Đây là hai error class duy nhất.
3. **MIGRATION VĂN BẢN.** document version N được đọc với definition version M&lt;N và không có `migrate` → throw; có `migrate` → giá trị đã migrate. Nhánh không lỗi là thường vong nhất của mọi chặng schema.
4. **AS-OF / FORK.** `snapshotAsOf` tại một EntryId cũ hơn phải trả về đúng giá trị lịch sử, và fork một conversation tại entry giữa phải giữ đúng ancestry. Chỉ 'latest' thì không được có `asOf`.
5. **SCOPE MISMATCH.** Truy cập một doc token 'session' vào bản ghi đã lưu có scope 'conversation' → `TypeError`. Là hành vi đọc sai nhất, và cũng là nơi 2 va chạm Context/Scope sẽ lộ hỏng.

**CHẤM ĐIỂM RIÊNG — ENV.** truncate: cắt 2,500 dòng, cả 3,000 (omp) và 2,000 (durable) đều phải ra kết quả ĐÚNG; dấu là `'lines'` hay `'bytes'` là observable. output-capture: emit byte-rate + adaptive publisher phải bọc được trong khi luồng dữ liệu giới hạn.

**Cảnh báo bằng chứng:** `storage-conformance.ts` CHƯA chạy 3 file test với 3 backend của nó đang chạy; chạy con 1 backend không chứng minh gì. Bắt buộc chạy cả 3.

**KHÔNG copy 2 loại test:** (a) `vi.g. assert.storage` phải đổi được mạng an toàn — dấu là đó thay thế bắt buộc; (b) `test/types.test.ts` chỉ kiểm tra kiểu tĩnh, và `expectTypeOf` thiếu khả năng trong bun — theo AGENTS.md 'Bad: static echo' và 'Compile-time guarantees → type checks, KHÔNG runtime placeholders', nên hoặc biến thành type test trong tsconfig, hoặc bỏ. Đã quyết: **bỏ**, và ghi rõ lý do trong `test_contract`.

**Không được viết test mới** cho các thứ chạy 'constructor copy đúng fixture' — cấm theo AGENTS.md.

Tên file test (23 file `test/` + 1 file conformance dùng chung):

`packages/durable/test/session-tables.test.ts` · `packages/durable/test/session-documents.test.ts` · `packages/durable/test/session-checkpoints-migrations.test.ts` · `packages/durable/test/session-forks.test.ts` · `packages/durable/test/session-definitions.test.ts` · `packages/durable/test/types.test.ts` · `packages/durable/test/session-support.ts` · `packages/durable/test/memory-storage.test.ts` · `packages/durable/test/jsonl-storage.test.ts` · `packages/durable/test/sqlite-storage.test.ts` · `packages/durable/test/sqlite-facade.test.ts` · `packages/durable/test/sqlite-migrations.test.ts` · `packages/durable/test/storage-runtime-boundary.test.ts` · `packages/durable/test/env-node.test.ts` · `packages/durable/test/env-node-spill.test.ts` · `packages/durable/test/env-output-capture.test.ts` · `packages/durable/test/env-truncate.test.ts` · `packages/durable/test/env-adaptive-publisher.test.ts` · `packages/durable/test/fixtures/delete-buffer.ts` · `packages/durable/test/fixtures/utf8-byte-length-without-buffer.ts` · `packages/durable/test/storage-memory.ts` · `packages/durable/test/storage.bench.ts` · `packages/durable/test/scratch.ts` · `packages/durable/src/testing/storage-conformance.ts`

### Xác minh

```bash
grep -rc '@earendil-works/' packages/durable
bun run check:ts
bun test packages/durable
bun --cwd=packages/durable run check:types
grep -rn 'node:sqlite\|node:child_process' packages/durable/src
grep -rn "from 'vitest'" packages/durable
```

- (1) `grep -rc '@earendil-works/' packages/durable` → tất cả 0 (78 lần trong 37 file, đã đo lại bằng `grep -roh '@earendil-works/[a-zA-Z0-9/_-]*' packages/durable | sort | uniq -c`).
- (2) `bun run check:ts` → exit 0 (baseline đã đo: 24.5s wall / 79s user).
- (3) `bun test packages/durable` → xanh — SAU khi `pi-natives` đã build (xem mục Cần người quyết). Trên máy chưa build, lệnh này FAIL với lỗi native addon, KHÔNG phải lỗi của `durable`: `bun --cwd=packages/natives run build` cần `ninja` → phải `brew install ninja` trước.
- (4) `bun --cwd=packages/durable run check:types` → exit 0.
- (5) Kiểm tra không còn node-only trong code chạy: `grep -rn 'node:sqlite\|node:child_process' packages/durable/src` → chỉ còn được trong `src/storage/sqlite/node.ts` và `src/env/node.ts` NẾU quyết định giữ bản node sau (bước 16/17). Nếu đổi sang Bun hết → phải ra 0.
- (6) Kiểm tra không có `from 'vitest'` còn: `grep -rn "from 'vitest'" packages/durable` → 0.
- (7) Đọc lại file JSON đặc tả xong để xác nhận JSON hợp lệ.

### Cổng hoàn thành

1. `bun run check:ts` == 0. THẤT BẠI NẾU: còn import sai scope, còn named re-export trong barrel, còn đọc field không tồn tại trên shape của pi-tui (ví dụ `maxBytes`), còn thiếu export trong package.json.
2. `grep -rc '@earendil-works/' packages/durable` == 0 dòng. THẤT BẠI NẾU: còn sót.
3. `bun test packages/durable` xanh — SAU khi `pi-natives` đã build (xem mục Cần người quyết); trên máy chưa build, lệnh này FAIL với lỗi native addon, KHÔNG phải lỗi của `durable`. THẤT BẠI NẾU: hành vi khác trước/sau cắt trùng với pi-tui — nhất là `totalLines` đếm sai khi content kết thúc bằng `'\n'` và dấu `truncatedBy`.
4. `ls packages/durable/LICENSE` và `cmp packages/durable/LICENSE <(git -C ../pi-ref show d6af72e:LICENSE)` == 0. (`pi-ref` là thư mục ANH EM cạnh omp, KHÔNG phải thư mục con — `git -C pi-ref` chạy từ omp sẽ fail với lý do sai.) THẤT BẠI NẾU: còn sửa hoặc quên bản quyền.
5. `grep -rn 'from "vitest"' packages/durable` == 0. THẤT BẠI NẾU: còn file test chưa chuyển.
6. `ls packages/durable/tsconfig.build.json packages/durable/vitest.config.ts` == không tồn tại. THẤT BẠI NẾU: quên xoá.

Cổng này CÓ THỰC SỰ ĐỎ ĐƯỢC — `gate_can_fail: true`. Nó không phải một danh sách lệnh luôn trả 0: mục 4 so sánh byte-với-byte LICENSE với nguồn, mục 2 và 5 đếm số dòng khớp scope còn sót, mục 6 kiểm tra file phải bị xoá thực sự không còn, và mục 3 là nơi mọi khác biệt hành vi của `documents.ts` + 11 va chạm ở trên lộ ra.

### Rủi ro

**CAO.**

1. **PHẢI CÓ CHORD TRƯỚC** — 52 import, 14 symbol, không thể biên dịch khi chưa có.
2. **VA CHẠM TRUNCATION** — `durable` và pi-tui cùng tên `truncateHead`/`truncateTail`/`truncateLine`/`TruncationResult`/`TruncationOptions` nhưng KHÁC HÌNH DẠNG và KHÁC HÀNH VI: `durable` đếm `totalLines` bỏ newline trailing, omp đếm bằng `countNewlines+1`, nên `'a\nb\n'` ra 2 dòng ở `durable` và 3 ở omp; `durable` tiên trong `truncatedBy`, omp ưu tiên byte; `output-capture.ts:203` ĐỌC `truncation.maxBytes` — trường này KHÔNG TỒN TẠI trên shape của omp. Giải quyết: giữ omp, `durable` bọc thêm.
3. 4 file test dùng `vi.useFakeTimers`/`vi.setSystemTime`/`vi.advanceTimersByTime` — mỗi quy tắc sang khác nhau, phải viết lại.
4. 2 file 963 + 840 dòng là streaming/process I/O, hong khi đổi runtime.
5. 118 KB đặc tả normative đi kèm — nếu đổi contract mà không đổi code, test sẽ xanh nhầm.
6. omp `packages/agent/` đã trỏ khác xa pi (5/117 tên file trùng, đo theo ĐƯỜNG DẪN TƯƠNG ĐỐI trong `src/`) — dựa cơ sở đo rất có biến lẫng `durable` sẽ ghi đè nó.

Ước lượng công: **5-7 ngày công.** Copy 2 phút, việc thật sự là: giải quyết 11 va chạm (bước 8-9, ~1.5 ngày), chuyển 19 file test từ `vitest` sang `bun:test` kèm 4 file dùng `vi.*` fake timers (bước 13-14, ~1 ngày), viết package.json theo convention source-exports (bước 11-12, ~0.5 ngày), adapter `bun:sqlite` mới (bước sau, ~0.5 ngày), đọc lại docs/README (bước 16, ~0.5 ngày), gate và vòng lặp (bước 17, ~1 ngày). Task nào KHÔNG nằm trong ước lượng này: `NodeExecutionEnv` → `Bun.spawn` (963 dòng) và `storage-benchmark` → Bun bench, cả hai đã tách thành PR riêng.

### Cần người quyết

- **CHORD.** 52 import trỏ vào `@oh-my-pi/chord`, chưa tồn tại ở omp. Phải migrate `chord` TRƯỚC `durable`. Bao giờ `durable` có thể dịch chuyển không? Không — thì thiếu 14 symbol (đã đếm từ 24 câu lệnh import trong `src/`; `Change`/`Prepared`/`Tracker` đến từ `src/session/transaction.ts:2`): `Context`, `Draft`, `JsonValue`, `Op`, `Change`, `Prepared`, `Tracker`, `copyJson`, `track`, `apply`, `applyImmutableBatches`, `awaitWithContext`, `withoutAbortSignal`, `BACKGROUND_CONTEXT`. Ngoài ra test còn cần `withAbortSignal` — nó chỉ dùng ở `test/env-node.test.ts:7`, không có trong `src/`. Phải khớp đúng chu kỳ pi: `chord` phải ra trước, `durable` sau.
- **OMITTED:** ở HEAD pi-ref (d6af72e) 12 package, omp có 4 trùng tên (agent, ai, coding-agent, tui), còn 8 KHÁC tên. Task ghi 7 — 8 là đúng nếu tính `session-backends/sqlite-node` là package riêng (tên `@earendil-works/pi-session-backend-sqlite-node`), NHƯNG nó KHÔNG phụ thuộc `durable`: `dependencies` của nó chỉ có `@earendil-works/pi-ai` và `@earendil-works/pi-agent-core` (chữ "durable" trong CHANGELOG/README/SQL của nó là tính từ tiếng Anh, không phải package). Nó có thể migrate bất kỳ lúc nào, không bị `durable` chặn. Xác nhận số 7 hay 8 trước khi chốt kế hoạch chung.
- **TÁCH BIÊN CHỐT.** 51 file `src` của omp đã dùng `bun:sqlite`. `durable` thêm `storage/sqlite` với schema riêng (conversations/entries/tasks/submissions/documents) trong một DB riêng. Nếu muốn dùng chung DB với các store hiện có, sẽ phải viết migration nội bộ — tăng rủi ro gấp 2 lần. Để mặc định: DB riêng, ghi rõ trong README.
- **`NodeExecutionEnv`:** giữ `node:child_process` hay đổi sang `Bun.spawn` trong cùng PR? Đã quyết ở spec này: TÁCH RA, PR riêng. Đề nghị cho roadmap chung.
- **`test/types.test.ts` và `expectTypeOf`:** chuyển thành type test trong tsconfig hay bỏ hẳn? Đã quyết: bỏ, và ghi rõ lý do trong `test_contract`.
- **Cách chạy test khi CHƯA build `pi-natives` — ĐÃ TRẢ LỜI (đo lại 2026-09-29).** Sau bước 8, `durable` import `@oh-my-pi/pi-tui/tools/streaming-output`, và chuỗi `streaming-output.ts:2-3` → `@oh-my-pi/pi-utils` ( qua `../render/sixel`) → `file-lock`/`sanitize-text` → `@oh-my-pi/pi-natives` kéo theo native addon. Ở máy chưa build, `bun -e 'import("@oh-my-pi/pi-tui/tools/streaming-output")'` chết với `Failed to load pi_natives native addon for darwin-arm64` — đây là **thiếu một bước build**, không phải hạn chế của máy. Sau `brew install ninja` + `bun --cwd=packages/natives run build` (exit 0, đã chạy) thì Cổng #3 chạy được như mọi cổng khác. KẾT LUẬN: `brew install ninja` + build `pi-natives` là bước BẮT BUỘC trước Cổng #3, không phải tuỳ chọn — nhưng đó là tiền đề tái lập được, làm một lần là xong.
- **LICENSE:** omp đặt LICENSE cho TỪNG package (`packages/agent/LICENSE`, `packages/ai/LICENSE`) và cả root LICENSE đều ghi 'Copyright (c) 2025 Mario Zechner'. Bản LICENSE riêng cho `durable` nên dùng nguyên 21 dòng MIT của pi-ref, hay gộp thêm 3 dòng copyright của omp như root? Đề nghị: dùng nguyên 21 dòng + thêm 'Copyright (c) 2025-2026 Can Boluk' và 'Copyright (c) 2026 Stencil Labs, Inc.' cho khớp root — nhưng đây là quyết định của chủ sở hữu, không tự quyết.
- **Suy nghĩ:** `durable/CHANGELOG.md` là changelog của pi-ref, không phải của omp. Có nên giữ lịch sử của pi hay bắt đầu '## [Unreleased]' mới? Đề nghị giữ — nó là bằng chứng nguồn.


---


## 6. `telemetry` — 12 file, 5 va chạm tên gần giống khác nghĩa

**Vị trí trong thứ tự migrate:** thứ 5 trong sáu, đứng sau `client` và trước `evals`.
**Quy mô:** 12 file / 62831 bytes, trong đó chỉ 8 file chứa code (40555 bytes). Ước lượng ~1 giờ.
**Cổng đỏ được:** `bun run check:ts` (`gate_can_fail: true`).

### File cần chép

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `packages/telemetry/src/index.ts` | 13363 | chép rồi sửa | L24, L356, L357 bỏ `.ts`. L24 `export { NOOP_TELEMETRY_CONTEXT } from "./noop"` → `export * from "./noop"`; L356-357 gộp thành `export * from "./memory"` (quy tắc barrel của omp: ưu tiên star re-export, kể cả barrel chỉ có type). 350 dòng còn lại chép nguyên văn, gồm khối conditional type ~250 dòng ở L76-322. |
| `packages/telemetry/src/memory.ts` | 6067 | chép rồi sửa | L8, L9 bỏ `.ts`. L193 `private readonly state: InMemoryTelemetryState = {` → `#state: InMemoryTelemetryState = {`; L200 và L205 `this.state` → `this.#state`. Hai method công khai `startSpan` và `getSpans` giữ nguyên dạng trần. 214 dòng còn lại nguyên văn — đặc biệt logic settlement/atomicity/passivity ở L50-186 không được đụng. |
| `packages/telemetry/src/noop.ts` | 645 | chép rồi sửa | L1 `from "./index.ts"` → `from "./index"`. 19 dòng còn lại nguyên văn, gồm `Object.freeze(noopTelemetrySpan)` ở L17. |
| `packages/telemetry/src/testing/index.ts` | 198 | chép rồi sửa | Toàn bộ 6 dòng: thay named re-export bằng hai star re-export — `export * from "./conformance";` và `export * from "./types";`, đồng thời bỏ `.ts`. Tương đương tuyệt đối vì conformance.ts chỉ export `createTelemetryAdapterConformance` và types.ts chỉ export 3 type, nên star vẫn ra đúng 4 tên. |
| `packages/telemetry/src/testing/types.ts` | 743 | chép rồi sửa | L1, L2 bỏ `.ts` trong `../index.ts` và `../memory.ts`. 16 dòng còn lại nguyên văn. |
| `packages/telemetry/src/testing/conformance.ts` | 10631 | chép rồi sửa | L2, L3, L8 bỏ `.ts`. L1 `import { deepStrictEqual, doesNotThrow, fail, ok, strictEqual } from "node:assert/strict"` chép nguyên văn. Lưu ý: `packages/utils/src/abortable.ts:1` và `packages/ai/test/fixtures/completion-retention.ts:1` dùng DEFAULT import (`import assert from ...`), không phải named import — nên chúng KHÔNG phải tiền lệ cho named import. Tiền lệ named import duy nhất trong repo là `packages/omptype/test/ark/realWorld.test.ts:2` (`node:assert`, trong test). Named import `node:assert/strict` đã được kiểm chứng thực nghiệm: typecheck sạch và 15/15 test xanh. 8 lời gọi `doesNotThrow(...)` ở L212, L228-230, L289-291, L306 là code thư viện bên trong một export được publish, không phải assertion của omp, nên bộ lọc "cấm `not.toThrow()` trần" áp cho `test/` chứ không áp cho `src/testing/` — đừng viết lại chúng. |
| `packages/telemetry/test/telemetry.test.ts` | 7093 | chép rồi sửa | L1 `vitest` → `bun:test` (`expectTypeOf` có thật trong bun:test, tiền lệ `packages/coding-agent/test/extensions-runner.test.ts:5`). L13 bỏ `.ts`. L71 và L152 xoá `expectTypeOf(compileTimeFailures).toBeFunction();` — đó là mệnh đề vô nghĩa kiểu "code chạy được"; hợp đồng thật là các comment `@ts-expect-error` bên trong closure (L62-69, L140-150), `tsgo` tự ép. L55, L122-124, L192-194 thay 5 assertion `not.toThrow()` trần bằng kết quả quan sát được. |
| `packages/telemetry/test/conformance.test.ts` | 1815 | chép rồi sửa | L1 `vitest` → `bun:test`; L2, L3 bỏ `.ts`. Phần còn lại nguyên văn — vòng lặp `describe`/`it` nhóm ở L15-21 và test snapshot tách rời ở L23-45 đều là hợp đồng thật. |
| `packages/telemetry/package.json` | 995 | chép rồi sửa | Không phải đổi token mà dựng lại manifest trên khuôn package lá của omp (`packages/wire/package.json` là mẫu). L2 name → `@oh-my-pi/pi-telemetry`; `version` `0.87.1` → `18.3.3`; L3 description → `'Vendor-neutral telemetry contracts and typed schema utilities for omp'`; author → `{ "name": "Stencil Labs, Inc.", "url": "https://stencil.so" }` nhưng giữ riêng một dòng copyright cho Mario Zechner trong LICENSE; `repository.url` → `git+https://github.com/can1357/oh-my-pi.git` kèm `directory: packages/telemetry`; thêm `homepage: https://omp.sh` và `bugs.url`; xoá `main`, `types`, cả mảng `files` và map `exports` trỏ `./dist/*` — thay bằng exports source-first: `main`/`types` → `./src/index.ts`, exports → `{ ".": {types:"./src/index.ts", import:"./src/index.ts"}, "./testing": {types:"./src/testing/index.ts", import:"./src/testing/index.ts"} }`; xoá scripts `clean`/`build`/`test`/`prepublishOnly` (bản build dựa trên `tsconfig.build.json` của pi bị cấm ở omp) và thay bằng bộ script của omp: `check` / `check:types` (`tsgo -p tsconfig.json --noEmit`) / `lint` (`oxlint .`) / `fix` / `fmt` (`oxfmt`); `engines.node >=22.19.0` → `engines.bun >=1.3.14`; xoá devDependencies `@types/node` + `vitest`, đặt `devDependencies: { "@types/bun": "catalog:" }`; xoá hẳn khoá `dependencies`; giữ `keywords` và `license: MIT`. |
| `packages/telemetry/README.md` | 20482 | chép rồi sửa | 13 occurrence scope: 9× `@earendil-works/pi-telemetry` (L1, L36, L72, L139, L159, L180, L186, L219, L369) → `@oh-my-pi/pi-telemetry`; 3× `@earendil-works/pi-agent-core` (L326, L371, L380) → `@oh-my-pi/pi-agent-core`; 1× `@earendil-works/pi-ai` (L370) → `@oh-my-pi/pi-ai`. Sửa thêm: mục 'Pi Package Integration' (L365-383, gồm code block L373-381) phải nói bộ package của omp là pi-telemetry (hợp đồng) + `packages/agent/src/telemetry.ts` (OTEL emitter) + `packages/stats` (dashboard cục bộ), chứ không phải split agent/ai của pi; snippet `npm install` ở L36; mục 'Development' (L447-460) đổi `npm test` / `npm run build` / `npm run check` thành `bun run check` và `bun test`; mục 'License' (L462-464) phải ghi tên Mario Zechner, không chỉ ghi "MIT". |
| `packages/telemetry/CHANGELOG.md` | 590 | chép rồi sửa | Không chép 11 heading phiên bản có ngày của pi (0.84.0 → 0.87.1) — đó là lịch sử phát hành của pi, không phải của omp. Thay toàn bộ file bằng khuôn của omp: `# Changelog` + `## [Unreleased]` chứa đúng một dòng `### Added`, ví dụ `'Added `@oh-my-pi/pi-telemetry`: vendor-neutral telemetry contracts, an in-memory reference context, a reusable adapter conformance suite, and typed schema utilities. ([pi](https://github.com/earendil-works/pi) MIT, Copyright (c) 2025 Mario Zechner)'`. Theo AGENTS.md đây là một entry `Added` hướng tới người dùng và mệnh đề ghi công là hồ sơ pháp lý, không phải trang trí. |
| `packages/telemetry/tsconfig.build.json` | 209 | bỏ | Cấu hình build dựa trên trình biên dịch của pi không có đối chiếu ở omp — omp không emit (`tsconfig.base.json` đặt `noEmit:true`). Thay bằng file MỚI `packages/telemetry/tsconfig.json` với thân 4 dòng y hệt `packages/wire/tsconfig.json`. Không cần thêm một bước tạo riêng trong danh sách chép vì tsconfig của workspace tự glob `*/src`, `*/test`, `*/scripts` (`packages/tsconfig.workspace.json`). |
| `packages/telemetry/LICENSE` | 1143 | chép rồi sửa | File MỚI — điều kiện duy nhất làm cho việc chép hợp pháp. Chép nguyên văn `/Users/tranquangdang21/Projects/pi-ref/LICENSE` (21 dòng, MIT, 'Copyright (c) 2025 Mario Zechner') rồi NỐI thêm hai dòng copyright sẵn có của omp ('Copyright (c) 2025-2026 Can Bölük' và 'Copyright (c) 2026 Stencil Labs, Inc.') như bên thứ ba, theo đúng khuôn đã dùng ở `packages/wire/LICENSE`. Dòng của Mario Zechner phải đứng đầu, không sửa, không đảo, không rút gọn. Con số cột `bytes` là 1143 = 1069 byte của pi + 74 byte hai dòng copyright của omp, và đó là byte-count duy nhất tái lập được: 1069 (pi, không kết thúc bằng newline) + 74 = 1143. Kèm theo, thêm một mục trong `THIRD-PARTY-NOTICES.txt` ở gốc repo (file đó đã có mục 'TRACKED VENDORED CODE AND ASSET NOTICES' với cùng định dạng entry như `crates/vendor/brush-core/LICENSE`) ghi rõ `packages/telemetry` dẫn xuất từ earendil-works/pi dưới MIT. |

`packages/telemetry/tsconfig.json` (file MỚI, 4 dòng, sao chép từ `packages/wire/tsconfig.json`):

```json
{ "extends": "../tsconfig.workspace.json", "include": ["src", "test"] }
```

### Bề mặt công khai

38 symbol. Vì 12 file được chép nguyên văn nên `neo ở nguồn` và `neo ở omp` là cùng một đường dẫn; cột `neo ở omp` ghi `—` khi trùng hệt.

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa |
| --- | --- | --- | --- | --- |
| `AttributeValue` | type | `packages/telemetry/src/index.ts:1` | — | **Có** — `AttributeValue` khác hình dạng từ `@opentelemetry/api`, dùng ở `packages/agent/src/telemetry.ts:2100` (`setSpanAttribute`), `packages/coding-agent/src/telemetry-export-otlp.ts:399`, và `packages/agent/test/run-summary.test.ts:24,36,72,76`. Không đổi tên pi. Xem hàng va chạm. |
| `SpanAttributes` | type | `packages/telemetry/src/index.ts:3` | — | Không (0 ref) |
| `SpanOptions` | type | `packages/telemetry/src/index.ts:7` | — | **Có** — trùng tên với `SpanOptions` của OTEL, import ở `packages/agent/test/run-summary.test.ts:27`, dùng để định kiểu Tracer giả ở :45. Hình dạng khác. Xem hàng va chạm. |
| `SpanStatus` | type | `packages/telemetry/src/index.ts:12` | — | **Có** — trùng tên với `SpanStatus` của OTEL, import ở `packages/agent/test/run-summary.test.ts:28`, dùng ở :37 và :83. Hình dạng khác. Xem hàng va chạm. |
| `TelemetryContext` | type | `packages/telemetry/src/index.ts:14` | — | Không (0 ref) — hợp đồng lõi mới: `startSpan<T>(options, callback) => Promise<T>`, callback-scoped chứ không phải immediate. |
| `TelemetrySpan` | type | `packages/telemetry/src/index.ts:18` | — | Không (0 ref) — extends `TelemetryContext`, nên một span cũng là context con. Đừng nhầm với `TelemetrySpanKind` đã export của omp ở `packages/agent/src/telemetry.ts:181`: khác symbol, tên gần giống, không cần hành động gì. |
| `NOOP_TELEMETRY_CONTEXT` | const | `packages/telemetry/src/noop.ts:20` (re-export ở `src/index.ts:24`) | — | Không (0 ref) — singleton đóng băng; `startSpan` nhận callback đồng bộ và trả `Promise.resolve(result)`, khi callback ném thì re-reject đúng giá trị đó (`noop.ts:3-9`). |
| `TelemetryAttributeType` | type | `packages/telemetry/src/index.ts:26` | — | Không (0 ref) |
| `TelemetryAttributeMetadata` | type | `packages/telemetry/src/index.ts:28` | — | Không (0 ref) |
| `TelemetryAttributeDefinition` | type | `packages/telemetry/src/index.ts:34` | — | Không (0 ref) — union phân biệt 6 hình dạng mảng/scalar. |
| `TelemetryStartAttributeDefinition` | type | `packages/telemetry/src/index.ts:44` | — | Không (0 ref) |
| `TelemetryEventAttributeDefinition` | type | `packages/telemetry/src/index.ts:45` | — | Không (0 ref) — cấu trúc giống hệt `TelemetryStartAttributeDefinition`; giữ cả hai (pi giữ, và pi-agent re-export cả hai). |
| `TelemetryEventDefinition` | type | `packages/telemetry/src/index.ts:47` | — | Không (0 ref) |
| `TelemetryParentDefinition` | type | `packages/telemetry/src/index.ts:52` | — | Không (0 ref) — chỉ phục vụ tài liệu, adapter không bao giờ đọc. |
| `TelemetrySpanDefinition` | type | `packages/telemetry/src/index.ts:57` | — | Không (0 ref) |
| `TelemetrySchemaDefinition` | type | `packages/telemetry/src/index.ts:66` | — | Không (0 ref) |
| `defineTelemetrySchema` | function | `packages/telemetry/src/index.ts:72` | — | Không (0 ref) — helper identity `<const T>`, trả về đúng đối số lúc runtime, giữ nguyên literal type. |
| `InferRequiredAndOptionalAttributes` | type | `packages/telemetry/src/index.ts:122` | — | Không (0 ref) — tiện ích suy luận dùng chung, được export. |
| `InferStartAttributes` | type | `packages/telemetry/src/index.ts:132` | — | Không (0 ref) |
| `InferOptionalAttributes` | type | `packages/telemetry/src/index.ts:135` | — | Không (0 ref) |
| `ExactTelemetryAttributes` | type | `packages/telemetry/src/index.ts:140` | — | Không (0 ref) — chốt tập khoá: `Actual & Record<Exclude<keyof Actual, keyof Expected>, never>`. Đây là dòng quan trọng nhất của cả package và cũng là dòng dễ mất nhất nếu viết lại. |
| `InferEventAttributes` | type | `packages/telemetry/src/index.ts:143` | — | Không (0 ref) |
| `TelemetrySchemaSpanName` | type | `packages/telemetry/src/index.ts:146` | — | Không (0 ref) |
| `TelemetrySchemaSpanStartAttributes` | type | `packages/telemetry/src/index.ts:153` | — | Không (0 ref) — pi-agent tiêu thụ (`packages/agent/src/harness/telemetry.ts`). |
| `TelemetrySchemaSpanEndAttributes` | type | `packages/telemetry/src/index.ts:163` | — | Không (0 ref) |
| `TelemetrySchemaSpanEventName` | type | `packages/telemetry/src/index.ts:180` | — | Không (0 ref) |
| `TelemetrySchemaSpanEventAttributes` | type | `packages/telemetry/src/index.ts:195` | — | Không (0 ref) |
| `SchemaTelemetrySpan` | type | `packages/telemetry/src/index.ts:222` | — | Không (0 ref) — `Omit<TelemetrySpan,'addEvent'\|'setAttributes' &` thu hẹp theo từng span của schema. |
| `TelemetrySchemaSpanUnion` | type | `packages/telemetry/src/index.ts:240` | — | Không (0 ref) |
| `TypedSpanStarter` | type | `packages/telemetry/src/index.ts:318` | — | Không (0 ref) — `UnionToIntersection` của các starter theo tên; chính phép giao đó giữ tương quan tên ↔ thuộc tính. |
| `createTypedSpanStarter` | function | `packages/telemetry/src/index.ts:349` | — | Không (0 ref) — `_schemas` là tham số phantom chỉ có ở kiểu, thân hàm không bao giờ đọc nó (`index.ts:324-343` không truyền đi đâu). Chính việc không đụng tới nó là một hợp đồng đã có test (`test/telemetry.test.ts:122-124`). |
| `RecordedTelemetryEvent` | type | `packages/telemetry/src/memory.ts:11` (re-export ở `src/index.ts:356`) | — | Không (0 ref) |
| `RecordedTelemetrySpan` | type | `packages/telemetry/src/memory.ts:16` (re-export ở `src/index.ts:356`) | — | Không (0 ref) — đây là hình dạng snapshot đã chuẩn hoá mà mọi backend telemetry tương lai của omp phải sinh ra để được conformance suite phủ; là điểm nối làm otel/stats/telemetry thành một hệ thống chứ không phải ba. |
| `InMemoryTelemetryContext` | class | `packages/telemetry/src/memory.ts:192` (re-export ở `src/index.ts:357`) | — | Không (0 ref) — nơi DUY NHẤT cần viết lại `private` → `#private` (`memory.ts:193`). Hai method công khai: `startSpan`, `getSpans`. |
| `createTelemetryAdapterConformance` | function | `packages/telemetry/src/testing/conformance.ts:61` (re-export ở `src/testing/index.ts:1`) | — | Không (0 ref) — dùng named import từ `node:assert/strict` (`conformance.ts:1`); không có tiền lệ named import trong `src` của omp (`packages/utils/src/abortable.ts:1` dùng default import), nhưng đã kiểm chứng thực nghiệm trên chính package này. |
| `TelemetryAdapterFixture` | type | `packages/telemetry/src/testing/types.ts:5` | — | Không (0 ref) — extends `AsyncDisposable`, nên `await using` chạy được ở omp (xem `packages/coding-agent/test/storage-errors.test.ts:35`). |
| `TelemetryAdapterFixtureFactory` | type | `packages/telemetry/src/testing/types.ts:11` | — | Không (0 ref) |
| `TelemetryAdapterConformanceCase` | type | `packages/telemetry/src/testing/types.ts:14` | — | Không (0 ref) — độc lập runner theo thiết kế; toàn bộ ý nghĩa của nó là có thể chạy bằng `bun:test` ở omp và bằng vitest ở pi. |

### Dependency mới

Không có một dependency runtime nào. Package là lá, không import bất kỳ package nào trong sáu package kia (`chord`, `protocol`, `server`, `client`, `durable`, `evals`) — nhờ vậy nó an toàn để migrate mà không phải chờ gì cả.

- `dependencies`: **không** thêm khoá nào. Manifest xoá hẳn khoá `dependencies`; đây là lập luận mạnh nhất cho việc migrate package này trước.
- `devDependencies`: chỉ `{ "@types/bun": "catalog:" }`.
- **Không** thêm `vitest`: đổi runner sang `bun:test` — đúng 2 dòng import, đã verified trong `scope_rewrites`.
- **Không** thêm `@opentelemetry/api`: hợp đồng ở đây là vendor-neutral, zero I/O, zero vendor, zero network — chỗ ràng OTEL là `packages/agent/src/telemetry.ts` của omp, không phải ở package này.
- **Không** thêm `@types/node` vào `devDependencies`: khoá này bị xoá. `@types/node` đã có sẵn trong `node_modules`. Named import `node:assert/strict` trong `src` KHÔNG có tiền lệ — `packages/utils/src/abortable.ts:1` dùng default import — nhưng đã được kiểm chứng thực nghiệm trên chính package này (typecheck sạch, 15/15 test xanh).
- **Không** thêm `tsconfig.build.json` cùng script `build`/`clean`: omp source-first, không emit ra gì, nên không có chỗ để build.

Bảng scope rewrite đã verified (mọi dòng dưới đây đều mang cờ `verified: true` trong spec):

| from | to | occurrences |
| --- | --- | --- |
| `@earendil-works/pi-telemetry` | `@oh-my-pi/pi-telemetry` | 10 |
| `@earendil-works/pi-agent-core` | `@oh-my-pi/pi-agent-core` | 3 |
| `@earendil-works/pi-ai` | `@oh-my-pi/pi-ai` | 1 |
| `from "./index.ts"` | `from "./index"` | 3 |
| `from "./memory.ts"` | `from "./memory"` | 3 |
| `from "./noop.ts"` | `from "./noop"` | 2 |
| `from "./types.ts"` | `from "./types"` | 2 |
| `from "./conformance.ts"` | `from "./conformance"` | 1 |
| `from "../index.ts"` | `from "../index"` | 2 |
| `from "../memory.ts"` | `from "../memory"` | 2 |
| `from "../src/index.ts"` | `from "../src/index"` | 2 |
| `from "../src/testing/index.ts"` | `from "../src/testing/index"` | 1 |
| `import { describe, expect, expectTypeOf, it } from "vitest"` | `import { describe, expect, expectTypeOf, it } from "bun:test"` | 1 |
| `import { describe, expect, it } from "vitest"` | `import { describe, expect, it } from "bun:test"` | 1 |
| `private readonly state: InMemoryTelemetryState` | `#state: InMemoryTelemetryState` | 1 |
| `this.state` | `this.#state` | 2 |

### Va chạm với thứ omp đã có

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| `AttributeValue` — union scalar/mảng của pi-telemetry vs `AttributeValue` của `@opentelemetry/api` | `packages/telemetry/src/index.ts:1` | `packages/agent/src/telemetry.ts:44` (import), `:2100` (`setSpanAttribute(span, key, value: AttributeValue)`); thêm `packages/coding-agent/src/telemetry-export-otlp.ts:25`, `:399`; và `packages/agent/test/run-summary.test.ts:24` (import), `:36`, `:72`, `:76` | **Giữ nguyên tên và hình dạng của pi** — nó là một phần của public API được chép, đổi tên sẽ phá mọi schema phía dưới. Hôm nay không xung đột biên dịch vì omp không re-export `AttributeValue` của OTEL ra barrel nào (chỉ `Attributes`, `Span`, `SpanKind`, `SpanStatusCode`, `Tracer`, `trace` được re-export, `telemetry.ts:2106`). Ràng buộc bàn giao cho spec của agent: khi `packages/agent` nhận `TelemetryContext`, phải alias type của OTEL tại chỗ import (`import { type AttributeValue as OtelAttributeValue }`) và **không** làm `export * from "@oh-my-pi/pi-telemetry"` trong `packages/agent/src/index.ts`, vì barrel đó đã có `export * from "./telemetry"` (`index.ts:24`) và một `AttributeValue` tương lai ở đó sẽ thành ambiguous star export. |
| `SpanOptions` và `SpanStatus` — của pi là `{name, attributes?}` / `{status:'ok'\|'error'}` vs của OTEL là `{attributes?,links?,startTime?,kind?}` / `{code,message?}` | `packages/telemetry/src/index.ts:7` và `:12` | `packages/agent/test/run-summary.test.ts:27-28` (import từ `@opentelemetry/api`), `:37`, `:45`, `:83` — test này tự dựng Tracer giả với `startSpan(name, options?: SpanOptions)` và `setStatus(status: SpanStatus)` | **Giữ nguyên tên của pi.** Hai bên hôm nay nằm ở module khác nhau nên không va nhau. **Không** "thống nhất" chúng: của pi là hợp đồng callback-scoped, của OTEL là kiểu wire của span immediate, gộp lại sẽ bắt một trong hai test double phải đổi. Cùng ràng buộc barrel như trên: spec của agent phải dùng named re-export có alias tường minh (đúng như pi làm ở `packages/agent/src/index.ts:19-37`) thay vì star re-export cả package telemetry. |
| `startSpan` — của pi là `startSpan(options, callback) => Promise<T>` (span chỉ sống trong callback) vs helper `startSpan(telemetry, kind, name, options)` của omp và `Tracer.startSpan(name, options, ctx)` của OTEL | `packages/telemetry/src/index.ts:15` (`TelemetryContext.startSpan`), `src/memory.ts:199`, `src/noop.ts:3` | `packages/agent/src/telemetry.ts:466` (helper module-private) và `:500` (`telemetry.tracer.startSpan(...)`); tổng cộng 14 ref `startSpan` trong omp | **Giữ hình dạng của pi.** Trùng tên nhưng mô hình thời gian sống ngược nhau — đây là va chạm tâm lý rủi ro nhất của cả lần migrate, vì cả hai đều tên `startSpan` và cả hai đều sinh ra thứ gọi là span. Giảm thiểu cho bước chép: package này **không** định nghĩa binding `startSpan` trần nào, nên bên trong `packages/telemetry` không có gì xung đột. Mối nguy thật sự là một file tương lai import cả `TelemetryContext` lẫn telemetry của `packages/agent`; file đó không được alias import nào về tên trần `startSpan`. |
| `TelemetrySpan` (pi) vs `TelemetrySpanKind` (omp) — tên gần giống, symbol không liên quan | `packages/telemetry/src/index.ts:18` | `packages/agent/src/telemetry.ts:181` (`export type TelemetrySpanKind = "invoke_agent" \| "chat" \| "execute_tool" \| "handoff"`) | **Không hành động, và không đổi tên.** `TelemetrySpanKind` là union chuỗi 4 giá trị về tên thao tác OTEL; `TelemetrySpan` là interface ghi. Đổi tên bất kỳ bên nào cũng làm lệch khỏi pi mà không đổi lấy gì. Liệt kê ở đây chỉ để một lần grep sau này tìm "TelemetrySpan" không báo va chạm giả. |
| **Khái niệm, không phải chữ nghĩa:** omp có SAI thứ telemetry đang tồn tại và pi thêm một thứ nữa. Chúng không trùng nhau và không được gộp | `packages/telemetry/src/index.ts:14-22` (hợp đồng callback) + `README.md:365-372` ('Pi Package Integration') | `packages/agent/src/telemetry.ts` (2114 dòng, OTEL EMITTER thật sự sinh ra object Span của `@opentelemetry/api` và export ra OTLP) và `packages/stats` (dashboard SQLite cục bộ: `db.ts` 74 KB, `parser.ts` 19 KB, `trace.ts` 41 KB — đọc JSONL session, không gửi gì đi cả) | **Giữ cả ba**, theo thứ tự phụ thuộc cứng: (1) `@oh-my-pi/pi-telemetry` = hợp đồng trung lập vendor — zero I/O, zero vendor, zero network, chỉ định nghĩa "một span là gì". (2) `packages/agent/src/telemetry.ts` = emitter của omp, thứ ràng hợp đồng đó vào OTEL/OTLP. (3) `packages/stats` = bộ đọc cục bộ, biến log session thành dashboard. Stats là cục bộ (không có gì rời khỏi máy); telemetry của `packages/agent` là từ xa (OTLP); telemetry của pi không phải cái nào — nó là từ vựng mà hai bên kia sẽ dùng chung. Điểm nối là `RecordedTelemetrySpan` (`memory.ts:16`): đó là hình dạng chuẩn hoá mà bất kỳ emitter nào của omp phải sinh ra để được `createTelemetryAdapterConformance` phủ, và đó là cách chứng minh OTEL và in-memory tương đương nhau. **Không** port emitter của pi vào file OTEL của omp, và **không** cho `stats` phụ thuộc telemetry ở giai đoạn này — việc nối hợp đồng vào `packages/agent` là việc của spec agent, không phải của telemetry. |

### Các bước

1. **PHÁP LÝ TRƯỚC, trước khi ghi bất kỳ file nào.** Tạo `packages/telemetry/LICENSE` bằng cách chép nguyên văn `/Users/tranquangdang21/Projects/pi-ref/LICENSE` rồi nối thêm hai dòng copyright sẵn có của omp (khuôn: `packages/wire/LICENSE`). Dòng 'Copyright (c) 2025 Mario Zechner' của Mario Zechner đứng đầu, không sửa. Làm bước này trước bước chép để thông báo tồn tại ngay khi byte chép đầu tiên rơi xuống — gắn thông báo sau khi chép là cách ghi công bị thất lạc. Neo: `packages/telemetry/LICENSE` (mới) + `THIRD-PARTY-NOTICES.txt` ở gốc.
2. Tạo `packages/telemetry/{src,src/testing,test}` và chép nguyên văn 8 file source+test: `src/index.ts`, `src/memory.ts`, `src/noop.ts`, `src/testing/index.ts`, `src/testing/types.ts`, `src/testing/conformance.ts`, `test/telemetry.test.ts`, `test/conformance.test.ts` — tổng 40555 bytes. Không sửa gì cả ở bước này (chưa format, chưa bỏ đuôi `.ts`) — nhưng biết trước rằng 5/8 file SẼ phải qua `oxfmt`, xem bước 14. Neo: `packages/telemetry/src/**`, `packages/telemetry/test/**`.
3. Bỏ đuôi `.ts` khỏi toàn bộ 16 specifier tương đối trong 8 file (danh sách chính xác: `noop.ts:1`; `index.ts:24,356,357`; `memory.ts:8,9`; `testing/index.ts:1,6`; `testing/types.ts:1,2`; `testing/conformance.ts:2,3,8`; `test/telemetry.test.ts:13`; `test/conformance.test.ts:2,3`). Làm cho khớp quy ước omp, không phải vì gate bắt: đã thử lại — giữ nguyên đuôi `.ts` vẫn typecheck sạch, vì `tsconfig.base.json` đặt `moduleResolution: "Bundler"` nên TypeScript cho phép đuôi `.ts` mà không cần `allowImportingTsExtensions`. TS5097 KHÔNG nổ lên. Vẫn bỏ vì mọi package khác của omp không dùng đuôi `.ts`, và để lại sẽ lệch quy ước khi tách file. Neo: `packages/telemetry/src/index.ts:24,356,357`.
4. Áp quy tắc barrel của omp: thay named re-export bằng star re-export trong hai file barrel. `src/testing/index.ts` thành đúng 2 dòng (`export * from "./conformance";` / `export * from "./types";`). `src/index.ts` L24 thành `export * from "./noop";` và L356-357 gộp thành `export * from "./memory";`. Kiểm tra tương đương bằng đếm symbol chứ không bằng mắt: `noop.ts` export 1 tên, `memory.ts` export 3 (`RecordedTelemetryEvent`, `RecordedTelemetrySpan`, `InMemoryTelemetryContext`), `types.ts` export 3, `conformance.ts` export 1 — nên dạng star vẫn phải resolve ra đúng 4+4 tên trên hai entry point. Neo: `packages/telemetry/src/testing/index.ts:1,6` và `packages/telemetry/src/index.ts:24,356,357`.
5. Chuyển một field `private` thành field ES `#private`: `memory.ts:193` `private readonly state:` → `#state:`, và `memory.ts:200` cùng `:205` `this.state` → `this.#state`. Để hai method công khai `startSpan` và `getSpans` ở dạng trần. Đây là thay đổi privacy DUY NHẤT của package — grep `private|protected|public ` sau đó và phải ra 0 hit trong `src/`. Neo: `packages/telemetry/src/memory.ts:193,200,205`.
6. Đổi test runner: `from "vitest"` → `from "bun:test"` ở dòng 1 của cả hai file test (2 occurrence). `expectTypeOf` có sẵn từ `bun:test` (tiền lệ: `packages/coding-agent/test/extensions-runner.test.ts:5`). Không API vitest nào khác được dùng — không `vi`, không `mock`, không globals — nên đó là toàn bộ việc migrate runner. Neo: `packages/telemetry/test/telemetry.test.ts:1`, `packages/telemetry/test/conformance.test.ts:1`.
7. Xoá 2 assertion vô nghĩa `expectTypeOf(compileTimeFailures).toBeFunction();` (`telemetry.test.ts:71` và `:152`). Chúng chỉ khẳng định một hàm là một hàm; hợp đồng thật là 9 comment `@ts-expect-error` bên trong các closure đó (4 trong closure thứ nhất, 5 trong closure thứ hai), và `tsgo` đã ép chúng. Giữ lại binding `const compileTimeFailures = ...` — chính chúng là thứ khiến `tsgo` typecheck thân các closure. Neo: `packages/telemetry/test/telemetry.test.ts:71,152`.
8. Thay 5 assertion `not.toThrow()` trần bằng assertion trên kết quả quan sát được: `telemetry.test.ts:55` (assert `JSON.stringify(schema)` **bằng** chuỗi definition mong đợi — chứng minh serialize được chứ không chỉ "không ném"); `:122-124` (gán starter trả về vào một binding rồi assert một `startSpan("operation", {kind:"read"}, ...)` về sau vẫn resolve — chứng minh `_schemas` chưa từng được đọc, đúng hợp đồng đã ghi ở `index.ts:346-347`); `:192-194` (cho callback trả về một sentinel và assert giá trị resolve sau mỗi lời gọi ghi, chứng minh context no-op đã chạy callback tới hồi kết). Để yên các lời gọi `doesNotThrow(...)` bên trong `src/testing/conformance.ts` — đó là code thư viện trong export được publish, không phải assertion test của omp. Neo: `packages/telemetry/test/telemetry.test.ts:55,122-124,192-194`.
9. Viết `packages/telemetry/package.json` theo khuôn package lá của omp (mẫu: `packages/wire/package.json`): name `@oh-my-pi/pi-telemetry`, version `18.3.3`, exports source-first (cả `.` và `./testing` → `./src/...`), vắng hẳn khoá `dependencies` (không dependency runtime nào), devDependencies `{ "@types/bun": "catalog:" }`, engines `{ "bun": ">=1.3.14" }`, và bộ script của omp (`check` / `check:types` qua `tsgo -p tsconfig.json --noEmit` / `lint` / `fix` / `fmt`). Không `tsc`, không `dist`, không `vitest`. Neo: `packages/telemetry/package.json`.
10. Viết `packages/telemetry/tsconfig.json` với thân 4 dòng `{ "extends": "../tsconfig.workspace.json", "include": ["src", "test"] }` (chép `packages/wire/tsconfig.json`). **Không** port `tsconfig.build.json` của pi — omp không emit gì và không chạy trình biên dịch đó. Neo: `packages/telemetry/tsconfig.json` (mới).
11. Đăng ký package vào workspace gốc: thêm `"@oh-my-pi/pi-telemetry": "18.3.3"` vào `package.json` mục `workspaces.catalog` (theo thứ tự alphabet, giữa `@oh-my-pi/pi-tui` và `@oh-my-pi/pi-utils`). Không cần sửa glob của workspaces — `packages/*` đã phủ; cũng không cần path mapping trong tsconfig, vì bun resolve package qua `node_modules` và `packages/tsconfig.workspace.json` đã glob `*/src` và `*/test`. Neo: `package.json` (`workspaces.catalog`).
12. Viết lại `CHANGELOG.md` theo khuôn omp (bỏ 11 heading có ngày của pi, chỉ một dòng `### Added` dưới `## [Unreleased]` kèm ghi công MIT + Mario Zechner) và viết lại README (13 lần đổi scope, mục 'Pi Package Integration' L365-383 gồm code block L373-381 viết lại cho bộ ba telemetry/agent/stats của omp, mục Development chuyển sang `bun run check` / `bun test`, mục License ghi tên Mario Zechner). Neo: `packages/telemetry/CHANGELOG.md`, `packages/telemetry/README.md`.
13. Thêm một mục vào `THIRD-PARTY-NOTICES.txt` dưới heading sẵn có 'TRACKED VENDORED CODE AND ASSET NOTICES', theo đúng định dạng entry của `crates/vendor/brush-core/LICENSE`: nêu nguồn (earendil-works/pi, `packages/telemetry`, MIT), chủ sở hữu bản quyền, và việc thông báo đó cũng được phát hành kèm dưới dạng `packages/telemetry/LICENSE`. Neo: `THIRD-PARTY-NOTICES.txt`.
14. Chạy `bunx oxfmt 'packages/telemetry/src/**/*.{ts,tsx}' 'packages/telemetry/test/**/*.ts'` TRƯỚC khi chạy cổng. 5/8 file cần format: `src/index.ts`, `src/memory.ts`, `src/testing/conformance.ts`, `test/conformance.test.ts`, `test/telemetry.test.ts`. Lý do: `.oxfmtrc.json` đặt `printWidth: 120` và `arrowParens: "avoid"`, nên oxfmt gộp import nhiều dòng thành một dòng, bỏ ngoặc quanh tham số đơn, và reflow khối conditional type ở `index.ts:173-178`. Copy đã giữ tab đúng như yêu cầu — tab KHÔNG phải nguồn diff. Neo: `packages/telemetry/src/index.ts`, `packages/telemetry/src/memory.ts`.
15. **CỔNG.** Chạy cả hai từ gốc repo. Phải exit 0 cả hai. `bun test packages/telemetry/` (xanh, 15 pass — telemetry là package lá, không kéo `@oh-my-pi/pi-natives`, nên lỗi native addon không chạm tới nó, khác với `packages/utils` hay `packages/agent`) rồi `bun run check:ts`. Cổng thứ ba, `bun --cwd=packages/natives run build`, không cần cho package này vì không có phụ thuộc native. Các kiểu hỏng dự kiến nếu có bước bị bỏ sót: TS2307 'vitest' ×2 (sót bước 6), TS2344 'private' field is not assignable / TS18028 trên `#state` (sót bước 5), và 5 file fail `oxfmt --check` nếu chưa chạy bước 14 (đã verify: `Format issues found in above 5 files`, `check:ts` exit 1). Không phải do tab. Lưu ý: cổng KHÔNG bắt được sót bước 3 (đuôi `.ts` typecheck vẫn sạch) — bắt buộc review thủ công, xem `grep -rnoE 'from "\.[^"]*\.ts"' packages/telemetry/` ở phần Xác minh. Neo: gốc: `bun test packages/telemetry/` + `bun run check:ts`.

### Hợp đồng test

Hai file test, cùng viết lại sang `bun:test`, cùng ở mức hợp đồng (không source-grep, không `mock.module`, không mệnh đề vô nghĩa).

- `packages/telemetry/test/telemetry.test.ts` phải bảo vệ ba hợp đồng quan sát được. (a) **CHÍNH XÁC CỦA SCHEMA CÓ KIỂU** — `defineTelemetrySchema` trả về chính đối số, definition sống sót qua `JSON.stringify`, và 4 khối `@ts-expect-error` chứng minh tập khoá đóng: thuộc tính event bắt buộc không được bỏ, một giá trị nằm ngoài danh sách `values` đã khai báo bị từ chối, một tên event chưa khai báo bị từ chối, và một `endAttributes` rỗng từ chối mọi thuộc tính. Người tiêu dùng làm hỏng hợp đồng này sẽ phát span với khoá thuộc tính sai chính tả hoặc chưa khai báo, và không có kiểm tra runtime nào bắt được. (b) **KẾT HỢP TỪ VỰNG VÀ RÓ CHAIN** — `createTypedSpanStarter` trên hai schema có tên span rời nhau resolve về 42 với chuỗi `parentId` operation->request, và 5 khối `@ts-expect-error` nữa chứng minh tên span trùng nhau giữa hai schema, tên mang giá trị union, và thuộc tính lệch schema đều là lỗi biên dịch. (c) **PASSTHROUGH NO-OP** — span đóng băng được nhận đồng bộ, một `startSpan` con trả về **cùng** object span, và giá trị bị từ chối được giữ nguyên danh tính cho cả throw đồng bộ lẫn async rejection.
- `packages/telemetry/test/conformance.test.ts` phải chạy 9 conformance case được publish trên `InMemoryTelemetryContext` dưới `bun:test` (chứng minh bộ case portable giữa các runner — đó là toàn bộ lý do tồn tại của nó), cộng một case thêm cho **SNAPSHOT TÁCH RỜI**: sửa `attributes.tags` và `events[0].attributes.value` trên một snapshot trả về không được ảnh hưởng lời gọi `getSpans()` kế tiếp, và `settled`/`endSequence` phải chuyển từ `false`/`undefined` sang `true`/`1` xuyên suốt `startSpan` đã await. AGENTS.md cấm `not.toThrow()` trần và các assertion kiểu "code chạy", nên 5 thay thế ở bước 8 là bắt buộc, không phải sở thích văn phong.

### Xác minh

Cổng chạy từ `/Users/tranquangdang21/Projects/ultraworkers`, exit 0, khoảng 29s trên máy rảnh:

```bash
bun run check:ts
```

Chạy lại đúng theo spec, cộng thêm phần test thật:

```bash
bun test packages/telemetry/ && bun run check:ts
```

Grep thủ công để khép vòng:

```bash
grep -rn 'earendil' packages/telemetry/            # phải ra 0 hit
grep -rn 'vitest' packages/telemetry/               # phải ra 0 hit
grep -rn 'private |protected |public ' packages/telemetry/src/   # phải ra 0 hit
grep -rnoE 'from "\.[^"]*\.ts"' packages/telemetry/  # phải ra 0 hit (escape dấu chấm)
grep -rn 'not\.toThrow()' packages/telemetry/test/   # phải ra 0 hit sau bước 8
grep -c 'Copyright (c) 2025 Mario Zechner' packages/telemetry/LICENSE   # phải ra 1
```

### Cổng hoàn thành

Cổng hoàn thành gồm hai lệnh: `bun test packages/telemetry/` rồi `bun run check:ts`.

`bun run check:ts` — chạy `oxlint . && oxfmt --check` trên `packages/*`, rồi `tsgo --noEmit` cho từng package qua `--filter './packages/*' --if-present check:types`. Một lệnh phủ cả bốn lớp ép cùng lúc: luật lint, tuân thủ formatter trên các file vừa chép, typecheck đầy đủ src+test của package mới (kể cả 9 assertion `@ts-expect-error`, hỏng build nếu chúng ngừng báo lỗi), và hồi quy của mọi package đang tồn tại.

Cổng đỏ được — cả hai lớp. `bun test packages/telemetry/` CHẠY ĐƯỢC và xanh (15 pass / 0 fail): telemetry là package lá, không import `@oh-my-pi/pi-natives`, nên lỗi native addon không chạm tới nó — khác với `packages/utils` hay `packages/agent`, vốn kéo addon và chỉ đỏ khi addon chưa build. Riêng `bun --cwd=packages/natives run build` là tiền đề chung của cả đợt: trên máy sạch nó cần `ninja` trước (CMake báo "unable to find a build program corresponding to Ninja"), và sau `brew install ninja` thì chạy exit 0; cổng này không cần nó cho telemetry vì telemetry không kéo addon. Vì vậy tuyên bố "portable giữa các runner" ĐÃ được chứng minh thực nghiệm, không phải suông.

### Rủi ro

**THẤP**, và thấp theo một nghĩa đáng nêu: package này có **ZERO** người tiêu dùng hiện hữu trong omp. Không gì trong cây 16 package import `TelemetryContext`, `InMemoryTelemetryContext`, hay bất kỳ schema type nào (đã kiểm chứng: 0 ref với 35 trong 38 symbol công khai). Vì vậy bán kính nổ của một sai sót bị giới hạn trong `packages/telemetry` và không thể làm hỏng CLI. Rủi ro thật đều cục bộ và đều cơ học: (1) quên một trong 16 đuôi `.ts` — cổng KHÔNG bắt được (đã thử: đuôi `.ts` vẫn typecheck sạch dưới `moduleResolution: "Bundler"`), nên bắt buộc grep thủ công ở phần Xác minh; (2) để sót `private` trong `memory.ts` → bị review bắt và bị chính lệch `#state`/`this.#state` bắt; (3) giả định `bun` thiếu `expectTypeOf` khi đổi vitest→bun:test — không thiếu, đã kiểm chứng tại `packages/coding-agent/test/extensions-runner.test.ts:5`; (4) **PHÁP LÝ**, thứ duy nhất không hoàn tác được: chép mà không có `packages/telemetry/LICENSE` mang đầy đủ bản quyền và thông báo cho phép của Mario Zechner. Đó là lý do nó là bước 1 chứ không phải một việc phụ thêm ở bước 13. Rủi ro thứ cấp, nhìn về phía trước: package này đưa `AttributeValue`, `SpanOptions` và `SpanStatus` vào một repo đã có sẵn các type OTEL trùng tên. Hôm nay chưa gì vỡ vì không type nào được barrel của omp re-export, nhưng một `export * from "@oh-my-pi/pi-telemetry"` tương lai trong `packages/agent/src/index.ts` sẽ tạo ra ambiguous star export đối chiếu với `export * from "./telemetry"` sẵn có ở `index.ts:24`. Cách giải quyết đã ghi trong bảng va chạm và phải mang sang spec của agent.

### Cần người quyết

- Scope của omp nên là `@oh-my-pi/pi-telemetry` (khớp 4 tên đã migrate: pi-agent-core / pi-ai / pi-coding-agent / pi-tui) hay `@oh-my-pi/omp-telemetry` (khớp thẻ lệ duy nhất `@oh-my-pi/omp-stats`)? Spec này giả định `pi-telemetry` vì nhiệm vụ đã cố định quy ước "chỉ đổi scope, giữ tên". `omp-stats` là ngoại lệ duy nhất và trông như trôi dạt chứ không phải chính sách — đáng xác nhận một lần trước khi chép, vì đây là việc đổi tên package đã phát hành và rất đau để hoàn tác.
- Version của pi là 0.87.1; catalog của omp là 18.3.3. Spec này ghi `18.3.3` (đúng thứ `bun run release` sẽ đóng dấu). Xác nhận ý định là một 18.3.3 sạch, không mang dòng dõi version của pi trong manifest, vì phần viết lại CHANGELOG ở bước 12 bỏ hẳn các heading version của pi.
- Package này nên được publish, hay chỉ internal cho tới khi `packages/agent` của omp thực sự dùng? Subpath `./testing` và README được viết cho các tác giả adapter bên thứ ba. Nếu omp không có ý định publish, lý do tồn tại của conformance suite suy yếu và ai đó nên quyết định export có ở lại hay không.
- OTEL emitter trong `packages/agent/src/telemetry.ts` (2114 dòng) có được định sẵn là chính adapter mà `createTelemetryAdapterConformance` chấm điểm, hay vẫn dựng tay? Câu trả lời quyết định `RecordedTelemetrySpan` có trở thành hợp đồng tích hợp sống trong spec agent hay chỉ là fixture test. Ngoài phạm vi phần này, nhưng conformance suite của telemetry vô dụng nếu không có gì chạy qua nó.
- Phía pi, agent sở hữu các SCHEMA về AI/harness/session (`AI_TELEMETRY_SCHEMA`, `HARNESS_TELEMETRY_SCHEMA`, `AGENT_TELEMETRY_SCHEMAS`, `packages/agent/src/harness/telemetry.ts`). Chép chúng là việc của spec agent, không phải spec này. Xác nhận spec agent sẽ mang chúng sang — không có chúng, `defineTelemetrySchema` và `createTypedSpanStarter` sẽ tới omp mà không có người tiêu dùng nào trong cây và đọc ra như code chết.
- pi dùng `'single quotes'` trong các đoạn mã README còn omp dùng tab + dấu nháy kép. Các snippet README (L72, L139, L186, L219) mang tính minh hoạ, không được biên dịch — xác nhận omp có muốn đổi sang dấu nháy kép cho nhất quán, hay để nguyên như pi đã viết.


---


## 7. `evals` — không chép nguyên khối được, vì nó đứng trên vitest

**Vị trí trong thứ tự migrate:** thứ 6, package cuối cùng. Không phải vì nó nặng nhất, mà vì 4 trên 7 dependency của nó đều phải bị loại — `vitest`, `vitest-evals`, `@vitest-evals/core`, `autoevals` — và cái phải xây lại (`install-runtime.mjs`, entrypoint, 2 config vitest) chính là cái không có bản tương đương trong omp.
**Quy mô:** 30 file / 133025 byte tại `/Users/tranquangdang21/Projects/pi-ref/packages/evals`. Phần chạy được — `plan.ts`, `report.ts` + `report-io.ts`, `docker.ts`, `cli.ts`, `acme-server.ts`, `harness.ts` + 4 module phụ, 4 file test — khoảng 1.200 dòng port, trong đó 6 file chỉ đổi đúng một dòng import. Ước lượng 2–3 ngày tính cả vòng lặp `check:ts`. Nửa bị hoãn không cùng cỡ nhưng khó hơn nhiều, và không được để cỡ của nửa lõi che mất cỡ của nửa hoãn.
**Cổng đỏ được:** `gate_can_fail: true`. Cổng đỏ được vì `check:ts` bắt đúng lỗi của phép chép: `PiCodingAgentHarnessOptions.tools`/`.noTools` được định kiểu là `CreateAgentSessionOptions['tools']`/`['noTools']`, mà omp không có key nào trong hai đó, nên bản chép nguyên văn hỏng typecheck ngay lập tức và không thể lên package trong im lặng.

Đây là bộ đánh giá hành vi của coding-agent trong pi: nó đo xem coding-agent có cấu hình được bản cài đặt của chính nó không (thêm một provider, thêm một model, tạo một tool extension) khi có tài liệu của repo và khi không, bằng cách chạy các cặp cánh trong hai ảnh Docker tạm. Nó là thứ duy nhất trong pi cho biết một thay đổi có làm hỏng hành vi hay không, và khoảng 40% nó là đường ống Docker/vitest/bố cục release-tarball mà omp phải dựng lại chứ không chép được.

Vì sao chép chứ không làm lại: có ba thứ đắt để suy ra lại nhưng rẻ để chép. (1) Thống kê so-sánh cặp trong `src/report.ts`: 483 dòng hiện thực "một cặp chỉ đóng góp vào lift khi CẢ HAI cánh cho đúng một điểm; bất kỳ cánh nào thiếu, trùng, bị skip, pending, không chấm hoặc lỗi thì chặn cả cặp; nếu có một cặp bị chặn trong một eval set thì con số chính bị giấu; telemetry thiếu là không có, không bao giờ là 0". Đó là một lập luận về giao thức, không phải code — sáu quy tắc chặn độc lập, mỗi quy tắc phải được suy ra ra từ đối với dữ liệu model thực tế nhiễu. Suy ra lại nghĩa là phải phát hiện lại từng quy tắc bằng cách bị nó đốt. (2) Sandbox container trong `src/harness.ts` L130-188: `chmod 0600` trên mọi module đã biến đổi dưới tmpdir, `chownTree` workspace cho một uid tạm, kiểm tra tiến trình bị hạ quyền không đọc được bộ chấm của chính nó, rồi xoá biến môi trường chứa credential. Đó là gia cố đối kháng chống việc đối tượng bị đo đọc bộ chấm của nó — thứ chỉ làm đúng sau một sự cố. (3) Toàn bộ thiết kế đo lường: đối tượng bị đo cấu hình một bản cài đặt đang chạy thật rồi bị chấm trên KẾT QUẢ thông qua một server provider giả, với thứ tự cánh xen kẽ để khử thiên lệch, một protocol digest ràng buộc mọi report với đúng plan đã sinh ra nó, và exit code khác 0 khi có cặp bị chặn.

Phía omp hôm nay không có đánh giá hành vi nào: `packages/coding-agent/src/eval/` là một sandbox executor JS/Python với nghĩa hoàn toàn khác của "eval", còn thứ gần bench nhất (`packages/typescript-edit-benchmark`) đo cơ chế sửa file chứ không đo phán đoán. Nên lỗ hổng là thật. Lập luận ngược cũng thật: nửa đắt là harness, nửa chép được là đường ống, và đường ống chính là phần phải vứt đi. Hình dạng trung thực của lần migrate này là chép ~30% là phán đoán và thống kê, dựng lại ~70% là Docker, vitest và bố cục release-tarball của pi.

### File cần chép

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `packages/evals/src/plan.ts` | 2215 | chép nguyên văn | Không sửa gì. Không `@earendil-works`, không builtin của node, không import vitest — file nguồn duy nhất port nguyên byte. Giữ nguyên `DOCUMENTATION_VARIANTS`, `DocumentationVariant`, `DiscoveredEvalCase`, `EvalTask`, `parseDiscoveredCases`, `createTaskPlan` và `isRecord` private. |
| `packages/evals/src/report.ts` | 19038 | chép rồi sửa | Chỉ 6 dòng import: L4 `node:util` `styleText` → `Bun.styleText`; L5-6 `@vitest-evals/core` + `/node` → file local mới `./report-io.ts`; L7 giữ nguyên. Rồi Bun-ify 3 chỗ: `createHash` từ `node:crypto` → `Bun.hash` (9 chỗ `createHash` toàn package, 0 chỗ trong file này sau khi đổi import — hãy kiểm chứng). Giữ `console.*` sạch (file vốn đã sạch). Mọi thứ còn lại — ghép cặp, chặn, cờ, bộ định dạng — là hàm thuần và port không đổi. |
| `packages/evals/src/docker.ts` | 5940 | chép rồi sửa | L1-4: `spawnSync` → `$` của `bun` (quy tắc Bun: không bao giờ `spawnSync`); `createHash` → `Bun.hash`; `existsSync`/`readFileSync`/`statSync` → `await Bun.file(p).exists()`/`.text()` + stat qua `node:fs/promises`; `mkdirSync` → `fs.mkdir`. `requireEvalAuthFile` hiện sync còn lời gọi trong `cli.ts` là async — làm nó `async` và sửa đúng một chỗ gọi. Chữ ký `execute()` đổi từ `{status,stdout}` sang `.exitCode`/`.text()` của Bun Shell, hai nhánh `capture` gộp làm một. Loại hẳn hình dạng `spawnSync` ra khỏi file — đây là file cần lượt quy tắc omp nhất. |
| `packages/evals/src/cli.ts` | 7871 | chép rồi sửa | L1-5 builtin → Bun (`Bun.hash`, `Bun.randomUUIDv7` hoặc giữ `crypto.randomUUID`, `Bun.write`, `import.meta.dir` thay cho `dirname(fileURLToPath(import.meta.url))`). L6 `await requireEvalAuthFile(...)` → thêm `await`. Ba lời gọi `console.log` giữ nguyên `console.*`: luật cấm `console.*` khi TUI/RPC/SDK còn sống, nhưng một CLI độc lập thoát ra không vào TUI chính là ngoại lệ được tài liệu hoá — nên KHÔNG đổi sang `logger` (logger ghi vào `~/.omp/logs`, không phải terminal của người dùng, và sẽ phá hợp đồng output của runner). Đổi tiền tố container hardcode `/repo/packages/evals/` (L101) thành giá trị đọc từ `packageRoot` đã resolve. Mọi thứ còn lại port không đổi. |
| `packages/evals/src/harness.ts` | 20636 | chép rồi sửa | File khó nhất — 4 trong 9 symbol bên ngoài của nó không tồn tại ở omp. (a) L8 `contentText` từ `@earendil-works/pi-ai` → `@oh-my-pi/pi-ai` + file local mới `./content-text.ts` (pi-ai của omp không có `utils/text.ts`; KHÔNG re-export từ `utils/text`). (b) L9 `getCurrentSystemPrompt` từ `@earendil-works/pi-ai/utils/transcript` → cài lại cục bộ trong `./system-prompt.ts` trên `Message` của omp. (c) L10-20 import coding-agent: bỏ `createAgentSessionFromServices`, `createAgentSessionServices`, `ModelRuntime`, `InlineExtension` (không cái nào tồn tại ở omp); giữ `AgentSession`, `CreateAgentSessionOptions`, `getAgentDir`, `readStoredCredential`, `SessionManager` — nhưng `readStoredCredential` có CHỮ KÝ KHÁC (xem bảng va chạm). (d) L21-33 `vitest-evals/harness` → file local mới `./harness-types.ts`. (e) L2-7 builtin node → Bun (`Bun.file`, `fs/promises` cho readdir/mkdir/rm, `Bun.hash` cho digest sha256 của system prompt, `Bun.nanoseconds` cho `performance.now`). (f) `PiCodingAgentHarnessOptions.tools`/`.noTools` đang được định kiểu là `CreateAgentSessionOptions['tools']`/`['noTools']` — omp không có key nào trong hai đó; định kiểu lại `tools` thành `string[]` rồi truyền thẳng `{ toolNames: options.tools ?? DOCUMENTATION_EVAL_TOOLS, restrictToolNames: true }` (sdk.ts:692 và :694) — KHÔNG đưa danh sách tên vào `customTools`, option đó nhận `CustomTool \| ToolDefinition` chứ không nhận tên. **Đã kiểm chứng 5/6 tên tool:** `read`, `write`, `edit`, `grep`, `find` có đúng tên trong `BUILTIN_TOOL_NAMES` (`packages/coding-agent/src/tools/builtin-names.ts:1-32`); **`ls` KHÔNG tồn tại ở omp** — thay bằng `glob`, hoặc bỏ hẳn và ghi rõ trong README là cánh dùng 5 tool. Đừng để cánh control âm thầm chạy thiếu tool. (g) L291-301 extension transform `before_agent_start` ẩn: giữ nguyên tên hook — omp đã có `before_agent_start` y hệt với `systemPrompt: string[]` trong event và `systemPrompt?: string[]` trong result; chỉ adapt `string` → `string[]`. (h) L526-528 chốt `PI_EVAL_CONTAINER !== '1'` → viết lại thành `OMP_EVAL_CONTAINER`. (i) Mọi `PI_EVAL_*`/`PI_PROVIDER`/`PI_MODEL` → `OMP_*`. **`PI_CODING_AGENT_DIR` thì KHÔNG đổi** — đó chính là biến omp đọc (`packages/utils/src/dirs.ts:446`), `OMP_CODING_AGENT_DIR` không tồn tại. Tốt hơn: bỏ hẳn biến môi trường, truyền `agentDir: isolatedAgentDir` thẳng vào `createAgentSession` (`packages/coding-agent/src/sdk.ts:501` có sẵn key `agentDir?: string`). |
| `packages/evals/evals/acme-server.ts` | 5729 | chép rồi sửa | L1 `createServer` từ `node:http` → `Bun.serve` (quy tắc omp: `Bun.serve`, không `http.createServer`). Hình dạng công khai `AcmeServer` (start/stop/reset/origin/baseUrl/validRequestReceived) KHÔNG được đổi — 4 chỗ gọi phụ thuộc vào nó. Lấy port qua `server.address()` thay bằng `port` mà `Bun.serve` trả về; 2 chỗ bọc `new Promise(...)` (L135, L144) → `Promise.withResolvers()`; `server.close(cb)` → `server.stop()`. 9 hằng export port không đổi. |
| `packages/evals/evals/configured-runtime.ts` | 3861 | chép rồi sửa | L2 `Api`/`Context`/`contentText`/`Model`/`ModelsSimpleStreamOptions` từ `@earendil-works/pi-ai` → `@oh-my-pi/pi-ai` — nhưng `pi-ai` của omp không có abstraction `Models`/`ModelsSimpleStreamOptions` và không có `ModelRuntime`. `loadConfiguredModelRuntime` + `inspectProvider` + `inspectAddedModel` đều xây trên `ModelRuntime` (pi `packages/coding-agent/src/core/model-runtime.ts`, vắng ở omp): ba hàm này phải trỏ lại bề mặt model của omp (`ModelRegistry` / `discoverModels` / `AuthStorage`) hoặc bị xoá. `contentText` → helper cục bộ. Hình dạng `ModelFields` (reasoning/input/cost/contextWindow/maxTokens) phải được diff từng field với `Model` của omp trước khi dùng lại bất kỳ fixture judge nào — model của omp phân loại bằng KDL và có thể mang tên field khác. |
| `packages/evals/evals/smoke.eval.ts` | 681 | bỏ | SKIP. Gọi `describeEval` từ `vitest-evals` và `expect` từ `vitest` — không runner nào tồn tại ở omp. Kịch bản (một prompt, không tool, khẳng định thủ đô Pháp, khẳng định `usage.provider/model` khớp env) sang được bun test dễ dàng, nhưng đó là VIẾT LẠI chứ không phải chép. Giữ làm tài liệu thiết kế. |
| `packages/evals/evals/models.docs.eval.ts` | 1449 | bỏ | SKIP. `describeEval` + `StructuredOutputJudge` (vitest-evals), và kịch bản phụ thuộc `inspectAddedModel` → `ModelRuntime` mà omp không có. Prompt cũng nói "Configure this running Pi installation" — phải thành văn xuôi của omp. Chỉ viết lại, không chép. |
| `packages/evals/evals/extensions.docs.eval.ts` | 1892 | bỏ | SKIP. `describeEval`/`StructuredOutputJudge`/`ToolCallJudge` (vitest-evals). Import `contentText` từ pi-ai (vắng ở omp) và đọc `session.resourceLoader.getExtensions()` + `session.extensionRunner` — `AgentSession` của omp có `extensionRunner` (`packages/coding-agent/src/session/agent-session.ts:12155`) nhưng KHÔNG có member `resourceLoader`. Chỉ viết lại. |
| `packages/evals/evals/openai-provider.docs.eval.ts` | 2299 | bỏ | SKIP. Hook vitest-evals + `ModelRuntime` + acme server. Kịch bản còn đặc thù pi: "Add an OpenAI-compatible provider" phụ thuộc bề mặt đăng ký provider của pi, mà omp đã thay bằng cây luật KDL. Port eval này đòi hỏi một đặc tả về cách một coding-agent thêm provider vào omp — khả năng đó có thể không tồn tại. Chỉ viết lại, và là ứng viên dễ bị bỏ khỏi phạm vi nhất trong 5 suite. |
| `packages/evals/evals/custom-provider.docs.eval.ts` | 2680 | bỏ | SKIP. vitest-evals + `ModelRuntime.completeSimple` + một server fixture SSE trong tiến trình. Cùng phụ thuộc đăng ký provider như trên. Chỉ viết lại. |
| `packages/evals/evals/tui.docs.eval.ts` | 8603 | bỏ | SKIP. Import `Levenshtein` từ `autoevals`, `createJudge`/`describeEval` từ `vitest-evals`, và `AgentSessionRuntime`/`AgentSessionServices` từ pi-coding-agent (cả 3 đều vắng ở omp). Nó còn hiện thực một shim `RecordingTerminal` hơn 40 method trên giao diện TUI của pi — bề mặt TUI của omp đã dời và shim này sẽ không thoả. File cần viết lại nặng nhất package. Khi viết lại `RecordingTerminal`: field phải là `#writes` và `#resizeHandler` (luật class privacy của AGENTS.md cấm từ khoá `private`; bản gốc dùng `private` ở L28-29 — đây là toàn bộ các field `private` trong package, nên là chỗ duy nhất cần đổi). Chỉ viết lại. |
| `packages/evals/evals/documentation-audit.eval.ts` | 3083 | bỏ | SKIP — và ghi nhận hỏng hục cụ thể: L33 glob `resolve(repositoryRoot, 'packages/coding-agent/docs')`, thư mục KHÔNG TỒN TẠI ở omp (omp không có `packages/coding-agent/docs/`; tài liệu của nó nằm ở `./docs` ở gốc repo). `globSync('**/*.md')` sẽ trả về `[]` và `it.for([])` sẽ đăng ký KHÔNG case nào — một eval no-op im lặng, kiểu hỏng tệ nhất. Nó còn import `defineTool` (omp có tại `packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:457`) và `Type` từ pi-ai (omp re-export nó từ `@oh-my-pi/omptype` tại `packages/ai/src/index.ts:1`) cùng `toolCalls` từ vitest-evals. Chỉ viết lại. |
| `packages/evals/docker/Dockerfile` | 1970 | chép rồi sửa | Ghi rõ trong spec: REWRITE, do not copy. L1 `FROM node:24-slim` → `oven/bun:1.4-slim` (omp là repo Bun; `node --experimental-strip-types` ở L36 không có tương đương — Bun tự strip type). L8-9 `npm ci && npm run build:offline` → `bun install --frozen-lockfile && bun run build` (gốc omp KHÔNG có script `build:offline` — đã kiểm chứng). L10 `install-runtime.mjs` giữ vai trò nhưng import phải trỏ lại. L15-19 rm tài liệu của pi — nhắm vào đúng những gì omp thực sự ship trong `files[]` của `packages/coding-agent`: `README.md`, `CHANGELOG.md`, `examples/` (KHÔNG có `docs/` để gỡ) cộng thêm `dist/docs-index.generated.txt` chỉ có ở omp. L22-35 khối chmod/allowlist cần bố cục ảnh của omp. L31-33 `/repo/vitest.base.ts` và `vitest.evals.config.ts` — omp không có cái nào. |
| `packages/evals/docker/Dockerfile.dockerignore` | 68 | chép nguyên văn | Không sửa gì. Vẫn đúng; chỉ thêm biến thể `**/dist` nếu build của omp phát thêm thư mục mới. |
| `packages/evals/docker/install-runtime.mjs` | 2735 | bỏ | SKIP. L5-6 import `../../../scripts/coding-agent-consumer.mjs` (`installCodingAgentConsumer`, `packReleasePackages`) và `../../../scripts/release-packages.mjs` (`getPublicWorkspacePackages`) — KHÔNG FILE NÀO TỒN TẠI Ở omp (scripts/ của omp có `ci-release-*.ts` + `release.ts`, không có helper consumer/pack). Đây là nút thắt khó nhất trong package: toàn bộ ảnh eval của pi là "pack tarball workspace → npm-install vào thư mục tạm → xoá tài liệu của chúng". omp publish `main: ./src/index.ts` (TS thô) và artifact `dist/` duy nhất là `dist/cli.js`, nên không có runtime biên dịch cài được qua npm để đóng ảnh. Phải thiết kế lại, không chép. |
| `packages/evals/docker/entrypoint.ts` | 6281 | bỏ | SKIP. L102-105 khẳng định eval resolve `@earendil-works/pi-coding-agent` về `/repo/node_modules/.../dist/index.js` — omp không có dist entry như vậy. L31 khẳng định `npm-shrinkwrap.json` (artifact release của pi, vắng ở omp). L28 khẳng định `/repo` chứa đúng `node_modules, package.json, packages, vitest.base.ts` — omp không có `vitest.base.ts`. L120 resolve CLI `vitest` — omp không có vitest. L133-143 chạy binary `vitest.mjs` với `--reporter=vitest-evals/reporter`. Khoảng 60% file là hợp đồng Node+Vitest+bố cục release của pi mà omp không chia sẻ. Sáu khẳng định bảo mật (`assertWorkspace`/`assertRootOnly`/`assertSandboxCannotRead`/`chownTree`) là phần có giá trị và nên hiện thực lại trên một entrypoint viết bằng Bun. |
| `packages/evals/vitest.evals.config.ts` | 1087 | bỏ | SKIP. Import `vitest/config` và `../../vitest.base.ts` — omp không có cái nào (đã kiểm chứng: không có `vitest.base.ts` ở gốc repo, không có vitest ở bất cứ đâu trong omp). Tách `projects: [{name:'docs'},{name:'host'}]` không có bản tương đương; runner của omp là `scripts/ci-test-ts.ts` + `bun test`. |
| `packages/evals/vitest.test.config.ts` | 378 | bỏ | SKIP. Cùng phụ thuộc vitest/`vitest.base.ts`; ý tưởng duy nhất còn sống là alias `@earendil-works/pi-coding-agent` → source workspace, mà omp biểu diễn bằng một dependency của bun workspace. |
| `packages/evals/test/plan.test.ts` | 1570 | chép rồi sửa | Port. L1 `from 'vitest'` → `from 'bun:test'` (quy tắc omp: `bun test`, không bao giờ vitest). Cả 4 khẳng định đều ở mức hợp đồng (parse identity, từ chối trùng, thứ tự mở rộng task-plan, từ chối input sai) và sống nguyên qua đổi runner. Thêm package vào `fastWorkspacePackages` trong `scripts/ci-test-ts.ts`, nếu không nó sẽ không bao giờ chạy trong CI. |
| `packages/evals/test/comparison.test.ts` | 4135 | chép rồi sửa | Port. `vitest` → `bun:test` ở L2. Import `../src/report.ts` (5 hàm export thuần) — cả file chạy không model, không docker, không network. Test có giá trị trên byte cao nhất package. |
| `packages/evals/test/report.test.ts` | 6992 | chép rồi sửa | Port kèm viết lại seam. L4 `vitest` → `bun:test`; L1-3 `node:fs/promises` + `node:os` + `node:path` → tương đương Bun. QUAN TRỌNG: nó đổ fixture vào `readTaskObservation`, vốn gọi `readReportWorkspace`/`readVitestJsonReportFile` từ `@vitest-evals/core/node`. Hai hàm đó phải được thay bằng seam cục bộ `./report-io.ts` parse thẳng file JSON, và test phải tự dựng ra hình dạng đó. Không có seam thì test này không chạy được. |
| `packages/evals/test/acme-server.test.ts` | 4303 | chép rồi sửa | Port. `vitest` → `bun:test`. Duyệt các nhánh 404/405/415/400/422/401 của acme fixture server — tất cả đều là nhánh hợp đồng thật, đều sống qua đổi `node:http` → `Bun.serve`. Không model, không docker. |
| `packages/evals/test/configured-runtime.test.ts` | 6307 | bỏ | SKIP. Mọi khẳng định đi qua `ModelRuntime.create/refresh/getModel/getProvider/completeSimple`, không cái nào tồn tại ở omp. Không port được nếu chưa hoàn tất reconcile model-runtime. |
| `packages/evals/test/harness.test.ts` | 4252 | bỏ | SKIP. L2 import `getDocsPath, getExamplesPath, getReadmePath` từ pi-coding-agent — KHÔNG cái nào tồn tại ở omp (đã kiểm chứng: 0 định nghĩa). L4 import `../../coding-agent/src/core/system-prompt.ts` — omp có `packages/coding-agent/src/system-prompt.ts` (không có `core/`), và `buildSystemPrompt` của omp nhận option khác. `excludePiDocumentation` còn khẳng định marker `\n<docs>\nPi documentation (read only`, thuộc bố cục prompt của pi chứ không phải của omp. Chỉ viết lại. |
| `packages/evals/README.md` | 6039 | bỏ | SKIP như một bản chép; nó tài liệu hoá `npm run eval -w packages/evals` theo npm workspace của pi, `packages/coding-agent/docs/` (vắng ở omp), `PI_PROVIDER`/`PI_MODEL`, và đường ống release-tarball của pi. Viết một README omp mới — nhưng mang dòng ghi công MIT vào đó. |
| `packages/evals/tsconfig.json` | 265 | chép rồi sửa | Ghi đè trọn file theo khuôn omp: `{"extends": "../tsconfig.workspace.json", "include": ["src", "test", "evals"]}` — không phải `../../tsconfig.base.json` (không package nào extends trực tiếp; 16/16 package đều là `../tsconfig.workspace.json`) và **không** khai `types` ở tầng package: `tsconfig.base.json` đã đặt `"types": ["bun", "assets"]`, ghi đè thành `["bun"]` sẽ mất khai báo module cho asset. `tsconfig.workspace.json` đã kéo `../tsconfig.base.json` (chứa `noEmit`, `strict`, `moduleResolution: Bundler`) và có sẵn `include`/`exclude` cho mọi package — không cần lặp lại 5 glob của pi. `@types/bun` không cần thêm: catalog gốc đã ghim `^1.3.14`. |
| `packages/evals/package.json` | 659 | chép rồi sửa | L3 name `@earendil-works/pi-evals` → `@oh-my-pi/pi-evals` (theo quy ước bắt buộc `@earendil-works/X` → `@oh-my-pi/X`; chú ý KHÔNG phải `@oh-my-pi/evals`). L7 `clean` (`shx` — xoá, `shx` không thêm), L8 `eval` npm → bun, L9 `eval:host` vitest → `bun test`, L10 `eval:docs` `node --experimental-strip-types src/cli.ts` → `bun src/cli.ts`, **L11 `test` (bản chép giữ nguyên lệnh vitest — phải xoá/đổi, không được bỏ qua)**. Bỏ devDeps `@vitest-evals/core`, `autoevals`, `vitest`, `vitest-evals`, `shx`. Trỏ lại `@earendil-works/pi-ai`/`pi-coding-agent` thành catalog: refs. `private: true` đã có — giữ. Thêm `packages/evals` vào `workspaces` gốc nếu glob `packages/*` không khớp (có khớp, nên không cần sửa gốc). **Bắt buộc khai hai script theo đúng khuôn 16 package còn lại**, nếu không `bun run check:ts` sẽ bỏ qua package này: `"check:types": "tsgo -p tsconfig.json --noEmit"` và `"check": "oxlint . && oxfmt --check --no-error-on-unmatched-pattern 'src/**/*.{ts,tsx}' '{test,bench,examples,scripts}/**/*.ts' '*.ts' && bun run check:types"`. Lý do: `check:ts` ở gốc chạy `bun run --filter './packages/*' --sequential --if-present check:types`; `--if-present` cộng với package không có script = exit 0, không in gì, không typecheck gì cả. |
| `packages/evals/.gitignore` | 7 | chép nguyên văn | Không sửa gì. `.eval/` là đường dẫn bỏ qua artifact đúng. |
| `packages/evals/NOTICE` | 0 | bỏ (file MỚI) | 0 byte chép. Phải mang nguyên văn thông báo MIT từ `/Users/tranquangdang21/Projects/pi-ref/LICENSE` (Copyright (c) 2025 Mario Zechner) cộng danh sách file đã thích nghi và commit upstream `d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31`. Theo tiền lệ `crates/pi-shell/NOTICE`. |
| `packages/evals/src/harness-types.ts` | 0 | bỏ (file MỚI) | File mới. Bản port cục bộ bề mặt `vitest-evals/harness` mà adapter cần: `Harness`, `HarnessContext`, `JsonValue`, `SimpleHarnessResult`, `TranscriptEvent`, `UsageSummary`, `createHarness`, `normalizeHarnessRun`, `normalizeRecord`, `attachHarnessRunToError`, `toJsonValue`. Các type này định nghĩa thứ `runPiCodingAgent` trả về, nên sai chúng sẽ hỏng âm thầm mọi quan sát. Không `#private`, không `any`. |
| `packages/evals/src/report-io.ts` | 0 | bỏ (file MỚI) | File mới. Thay `@vitest-evals/core/node` (`readReportWorkspace`, `readVitestJsonReportFile`) và `@vitest-evals/core` (`ReportCase`) bằng một reader JSON trực tiếp. Phải giữ đúng tên field `ReportCase` mà `readTaskObservation` đọc: `status`, `fullName`, `harness.run.usage.{provider,model,inputTokens,outputTokens,totalTokens,toolCalls,metadata.cacheReadTokens,metadata.cacheWriteTokens,metadata.estimatedCostUsd}`, `harness.run.timings.totalMs`, `harness.run.errors`, `harness.run.artifacts[piSessionJsonl]`, `eval.avgScore` — vì report.ts L122-188 phụ thuộc từng cái. |
| `packages/evals/src/content-text.ts` | 0 | bỏ (file MỚI) | File mới. `contentText(content: string \| readonly Content[], separator?)` — port từ pi `packages/ai/src/utils/text.ts` L6. pi-ai của omp không có `utils/text.ts` (đã kiểm chứng). Dùng bởi `toTranscriptEvents` của harness.ts, eval extension, và configured-runtime. |
| `packages/evals/src/system-prompt.ts` | 0 | bỏ (file MỚI) | File mới. `getCurrentSystemPrompt(messages)` — port từ pi `packages/ai/src/utils/transcript.ts` L99. Cần vì pi-ai của omp không có `utils/transcript.ts` (đã kiểm chứng: `find packages/ai/src -name '*transcript*'` chỉ trả về các transcription provider). |
| `packages/evals/src/doc-lift.ts` | 0 | bỏ (file MỚI) | File mới. Bộ cắt bỏ docs-section của `excludePiDocumentation`, nhắm lại từ marker `\n<docs>\n ... \n</docs>` của pi sang bất cứ gì system prompt của omp thực sự dùng. Phải suy ra lại chuỗi marker bằng cách đọc prompt đã build của omp (`packages/coding-agent/src/prompts/system/system-prompt.md`), KHÔNG chép literal marker của pi — chính những chuỗi đó sẽ no-op trong im lặng. |
| `packages/evals/scripts/eval.ts` | 0 | bỏ (file MỚI) | File mới. Entrypoint thay cho `src/cli.ts` của pi nếu đường ống docker được thiết kế lại quanh bun + build của omp thay cho packer tarball của pi. |
| `packages/evals/src/index.ts` | 0 | bỏ (file MỚI) | File mới. Barrel star re-export trên các module thực sự sống sót (`export * from './plan'` v.v.) theo quy tắc barrel của omp. Package evals của pi KHÔNG có index.ts — đây là phần thêm, không phải chép. |

### Bề mặt công khai

57 symbol. `already_exists_in_omp` là `false` cho tất cả 57 — không cái nào trong đụng tên với thứ omp đã có, nhưng nhiều cái không tồn tại ở omp (xem cột neo ở omp).

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa | ghi chú |
| --- | --- | --- | --- | --- | --- |
| `DOCUMENTATION_VARIANTS` | const | `packages/evals/src/plan.ts:1` | `packages/evals/src/plan.ts:1` | Không | Chép nguyên văn. Tuple const của hai cánh doc-lift. |
| `DocumentationVariant` | type | `packages/evals/src/plan.ts:2` | `packages/evals/src/plan.ts:2` | Không | Suy ra từ `DOCUMENTATION_VARIANTS`; cũng là discriminant trong `EvalObservation`/`EvalComparisonReport` của report.ts. |
| `DiscoveredEvalCase` | type | `packages/evals/src/plan.ts:4-9` | `packages/evals/src/plan.ts:4-9` | Không | `{file, fullName, evalSet, caseId}`. |
| `EvalTask` | type | `packages/evals/src/plan.ts:11-15` | `packages/evals/src/plan.ts:11-15` | Không | `DiscoveredEvalCase` + `{variant, model, runNumber}`. |
| `parseDiscoveredCases` | fn | `packages/evals/src/plan.ts:21-37` | `packages/evals/src/plan.ts:21-37` | Không | Parse `name` của vitest theo dạng "<eval set> > <case>"; từ chối trùng. Đã có test hợp đồng (`plan.test.ts`) và port sạch. |
| `createTaskPlan` | fn | `packages/evals/src/plan.ts:39-59` | `packages/evals/src/plan.ts:39-59` | Không | Cartesian (case x runNumber x cả hai variant) với thứ tự xen kẽ để khử thiên lệch thứ tự lặp. |
| `PiCodingAgentInput` | type | `packages/evals/src/harness.ts:43` | `packages/evals/src/harness.ts` (mới) | Không | `string \| [{type:'prompt',content} \| {type:'reload'}]`. Bước 'reload' chính là lý do eval có thể đo một coding-agent cấu hình lại được cấu hình đang chạy; phải giữ. |
| `PiCodingAgentModelSelection` | type | `packages/evals/src/harness.ts:45-48` | `packages/evals/src/harness.ts` (mới) | Không | `{provider, id}`. |
| `PiCodingAgentHarnessOptions` | type | `packages/evals/src/harness.ts:50-59` | `packages/evals/src/harness.ts` (mới) | Không | **HỎNG KHI CHÉP**: `noTools`/`tools` được định kiểu là `CreateAgentSessionOptions['noTools']`/`['tools']` mà omp không có key nào trong hai đó. Định kiểu lại `tools` thành `string[]` và truyền vào `createAgentSession` qua `{ toolNames, restrictToolNames: true }` (sdk.ts:692/694) — KHÔNG map danh sách tên vào `customTools`. |
| `PiCodingAgentHarnessWithOutput<T>` | type | `packages/evals/src/harness.ts:61-68` | `packages/evals/src/harness.ts` (mới) | Không | Thêm một mapper `output` nhận `{response, session, systemPrompt, agentDir}`. |
| `resolveModelSelection` | fn | `packages/evals/src/harness.ts:70-80` | `packages/evals/src/harness.ts` (mới) | Không | Model tường minh thắng env `OMP_PROVIDER`/`OMP_MODEL`; ném lỗi khi cả hai đều không set. Được `harness.test.ts` phủ (dù file đó bị skip). |
| `applyIsolatedEnvironment` | fn | `packages/evals/src/harness.ts:82-100` | `packages/evals/src/harness.ts` (mới) | Không | Set `HOME`/`USERPROFILE`/`OMP_CODING_AGENT_DIR`, quét sạch rò rỉ `OMP_EVAL_*`, trả về closure khôi phục. Mutate `process.env` — cần seam `vi.spyOn` theo từng test dưới luật an toàn toàn bộ suite của omp. |
| `verifySystemPrompt` | fn | `packages/evals/src/harness.ts:257-270` | `packages/evals/src/doc-lift.ts` (dời) | Không | Khẳng định prompt giữ được khối rules và sự hiện diện của khối docs khớp với cánh. **CHUỖI MARKER LÀ CỦA PI** — `\n<rules>\n` và `\n<docs>\nPi documentation (read only` không tồn tại trong prompt của omp. Phải suy ra lại. |
| `createPiCodingAgentHarness` | fn (2 overload) | `packages/evals/src/harness.ts:471-482` | `packages/evals/src/harness.ts` (mới) | Không | Constructor công khai. Bên trong gọi `createAgentSessionFromServices` + `createAgentSessionServices` + `ModelRuntime.create` — không cái nào tồn tại ở omp. |
| `DOCUMENTATION_EVAL_TOOLS` | const | `packages/evals/src/harness.ts:484` | `packages/evals/src/harness.ts` (mới) | Không | `["read","write","edit","grep","find","ls"]` — cố ý loại shell/web. **Đã kiểm chứng 5/6:** `read`, `write`, `edit`, `grep`, `find` có đúng tên trong `BUILTIN_TOOL_NAMES` (`packages/coding-agent/src/tools/builtin-names.ts:1-32`); **`ls` KHÔNG tồn tại ở omp** — thay bằng `glob`, hoặc bỏ hẳn và ghi rõ trong README là cánh dùng 5 tool. Không để cánh control âm thầm chạy thiếu tool. |
| `resolveDocumentationVariant` | fn | `packages/evals/src/harness.ts:487-492` | `packages/evals/src/harness.ts` (mới) | Không | Đọc `OMP_EVAL_VARIANT`; ném `TypeError` với bất kỳ giá trị nào khác. |
| `excludePiDocumentation` | fn | `packages/evals/src/harness.ts:494-506` | `packages/evals/src/doc-lift.ts` (dời) | Không | Cắt bỏ docs section khỏi prompt mặc định. Phụ thuộc marker `\n<docs>\n` / `\n</docs>` của pi; nếu prompt của omp không có marker đó, hàm ném "Default Pi system prompt has no Pi documentation section" và toàn bộ cánh control chết. |
| `createPiDocumentationEvalHarness` | fn (2 overload) | `packages/evals/src/harness.ts:517-537` | `packages/evals/src/harness.ts` (mới) | Không | Từ chối chạy trừ khi `OMP_EVAL_CONTAINER=1` và có cặp uid/gid sandbox. Chốt container cứng đó là lý do không thứ gì trong này chạy được ở local. |
| `PI_SESSION_SNAPSHOT_ARTIFACT` | const | `packages/evals/src/report.ts:9` | `packages/evals/src/report.ts:9` | Không | `"piSessionJsonl"`. Được `persistSession` (L123) đọc và harness.ts (L426) ghi. Đổi thành `ompSessionJsonl` cho khớp đổi tên env var. |
| `EvalRunIdentity` | type | `packages/evals/src/report.ts:11-17` | `packages/evals/src/report.ts:11-17` | Không | `{evalSet, caseId, variant, model, runNumber}`. |
| `ExpectedEvalRun` | type | `packages/evals/src/report.ts:19` | `packages/evals/src/report.ts:19` | Không | Alias của `EvalRunIdentity` — biểu diễn lần chạy ĐÃ LÊN KẾ HOẠCH, đối lập với lần chạy quan sát được. |
| `EvalObservation` | type | `packages/evals/src/report.ts:32-34` | `packages/evals/src/report.ts:32-34` | Không | Union có discriminant: `{outcome:'scored',score} \| {outcome:'unscored' \| 'skipped' \| 'pending' \| 'errored'}`. Outcome năm nhánh CHÍNH LÀ hợp đồng chặn. |
| `PairedMetricSummary` | type | `packages/evals/src/report.ts:36-41` | `packages/evals/src/report.ts:36-41` | Không | `{eligiblePairs, controlMean, treatmentMean, meanDelta}` — null nghĩa là KHÔNG CÓ, không bao giờ là 0. |
| `EvalSetComparison` | type | `packages/evals/src/report.ts:43-56` | `packages/evals/src/report.ts:43-56` | Không | Lift theo từng eval set + 5 cờ (no-lift, negative-delta, control-saturated, treatment-saturated, flaky) + 4 metric ghép cặp. |
| `BlockedPair` | type | `packages/evals/src/report.ts:58` | `packages/evals/src/report.ts:58` | Không | `EvalRunIdentity` bỏ `variant`, cộng `reasons[]`. |
| `OperationalMetricTotal` | type | `packages/evals/src/report.ts:60` | `packages/evals/src/report.ts:60` | Không | `{availableRuns, total}` — chính phép tách `availableRuns`/`total` là thứ giữ "telemetry thiếu" khỏi việc bị đọc thành 0. |
| `VariantTotals` | type | `packages/evals/src/report.ts:62-73` | `packages/evals/src/report.ts:62-73` | Không | Tổng hợp theo cánh của 8 `OperationalMetricTotal`. |
| `EvalComparisonReport` | type | `packages/evals/src/report.ts:75-83` | `packages/evals/src/report.ts:75-83` | Không | `schemaVersion: 3`, `protocolDigest`, `control:'without_docs'`, `treatment:'with_docs'`. Digest ràng buộc một report với đúng plan đã sinh ra nó. |
| `classifyCaseStatus` | fn | `packages/evals/src/report.ts:101-106` | `packages/evals/src/report.ts:101-106` | Không | Trạng thái vitest → outcome. Từ vựng trạng thái nó đọc là của vitest (`'failed' \| 'skipped' \| 'todo' \| 'disabled' \| 'pending'`) — nếu runner đổi thì CHÍNH mapping này đổi, và `report.test.ts` là thứ duy nhất canh nó. |
| `erroredObservation` | fn | `packages/evals/src/report.ts:118-120` | `packages/evals/src/report.ts:118-120` | Không | Đường "cánh không bao giờ tạo ra report". |
| `readTaskObservation` | fn | `packages/evals/src/report.ts:136-189` | `packages/evals/src/report.ts:136-189` | Không | Chuẩn hoá một vitest JSON report thành `EvalObservation` và lưu artifact session. Phòng thủ sâu: ~12 nhánh `errored()` trả về cho mọi lệch identity/status/model. **BỊ CHẶN** ở seam `@vitest-evals/core`. |
| `summarizeEvalObservations` | fn | `packages/evals/src/report.ts:359-413` | `packages/evals/src/report.ts:359-413` | Không | Ghép cánh, tính lift, giấu con số chính khi có bất kỳ cặp nào bị chặn trong một eval set. Hàm thuần; giá trị cao nhất package và port không đổi. |
| `formatEvalComparisonReport` | fn | `packages/evals/src/report.ts:436-483` | `packages/evals/src/report.ts:436-483` | Không | Report dễ đọc cho người. Dùng `node:util` `styleText` → `Bun.styleText`. |
| `BuiltImages` | type | `packages/evals/src/docker.ts:12` | `packages/evals/src/docker.ts` (mới) | Không | `Record<DocumentationVariant, {name,id}>`. |
| `buildImages` | fn | `packages/evals/src/docker.ts:38-61` | `packages/evals/src/docker.ts` (mới) | Không | Hai lời gọi `docker build --target` + `docker image inspect`. Tên ảnh là sha256 của `repositoryRoot` nên đổi khi repo di chuyển. `spawnSync` → `$` của Bun. |
| `requireEvalAuthFile` | fn | `packages/evals/src/docker.ts:67-89` | `packages/evals/src/docker.ts` (mới) | Không | Tìm và parse JSON `auth.json`, xác minh key của provider có tồn tại. Hôm nay sync; phải thành async cho API file của Bun. Mặc định đường dẫn ở pi là `~/.pi/agent`, của omp là `~/.omp/agent`. |
| `createDockerContext` | fn | `packages/evals/src/docker.ts:126-135` | `packages/evals/src/docker.ts` (mới) | Không | Constructor record thuần; port không đổi. |
| `discoverCases` | fn | `packages/evals/src/docker.ts:137-154` | `packages/evals/src/docker.ts` (mới) | Không | Chạy container ở chế độ `--discover` và trả về đường dẫn `discovered-tests.json`. |
| `runTask` | fn | `packages/evals/src/docker.ts:161-175` | `packages/evals/src/docker.ts` (mới) | Không | Chạy MỘT cánh (case, variant, runNumber) trong container sạch; trả `undefined` khi không report nào tới. Escape tên test thành regex có neo (L164). |
| `ProviderRuntimeOutput` | type | `packages/evals/evals/configured-runtime.ts:16-24` | `packages/evals/evals/configured-runtime.ts` (mới) | Không | `{result:{validRequestReceived,model,response} \| {error}}` — đúng hình dạng `StructuredOutputJudge` so sánh. |
| `AddedModelOutput` | type | `packages/evals/evals/configured-runtime.ts:26-28` | `packages/evals/evals/configured-runtime.ts` (mới) | Không | `{result:{model,existingModelsPreserved} \| {error}}`. |
| `ProviderScenario` | type | `packages/evals/evals/configured-runtime.ts:30-36` | `packages/evals/evals/configured-runtime.ts` (mới) | Không | `providerId`/`modelId`/`createContext`/`options`/`validRequestReceived`. `ModelsSimpleStreamOptions` trong `options` không có tương đương ở omp. |
| `loadConfiguredModelRuntime` | fn | `packages/evals/evals/configured-runtime.ts:56-63` | `packages/evals/evals/configured-runtime.ts` (mới) | Không | `ModelRuntime.create` với `modelsPath`/`authPath`/`modelsStorePath` tường minh và `allowModelNetwork:false`. `ModelRuntime` không tồn tại ở omp. |
| `inspectProvider` | fn | `packages/evals/evals/configured-runtime.ts:65-93` | `packages/evals/evals/configured-runtime.ts` (mới) | Không | `refresh` (không network) → `getError` → `getModel` → `completeSimple`, bọc lại để mọi throw thành `{error}` có kiểu thay vì exception. Chính hình dạng lỗi-có-kiểu-không-nàm là thứ hợp đồng judge cần. |
| `inspectAddedModel` | fn | `packages/evals/evals/configured-runtime.ts:95-119` | `packages/evals/evals/configured-runtime.ts` (mới) | Không | Chứng minh một model vừa thêm không đuổi các model sẵn có của provider ra. Chỉ dùng `ModelRuntime`. |
| `modelFields` | fn (private) | `packages/evals/evals/configured-runtime.ts:38-54` | `packages/evals/evals/configured-runtime.ts` (mới) | Không | Chiếu một `Model` đầy đủ xuống 9 field để fixture judge ổn định trước biến động metadata upstream. Tên field phải được diff với `Model` của omp — model omp đến từ cây luật KDL, không phải catalog của pi. |
| `OPENAI_PROVIDER_ID` | const | `packages/evals/evals/acme-server.ts:3` | `packages/evals/evals/acme-server.ts` (mới) | Không | Literal `"acme"`. |
| `OPENAI_MODEL_ID` | const | `packages/evals/evals/acme-server.ts:4` | `packages/evals/evals/acme-server.ts` (mới) | Không | Literal `"acme-chat"`. |
| `OPENAI_PROBE_PROMPT` | const | `packages/evals/evals/acme-server.ts:5` | `packages/evals/evals/acme-server.ts` (mới) | Không | Prompt thăm dò được echo lại để kiểm tra request. |
| `OPENAI_PROBE_RESPONSE` | const | `packages/evals/evals/acme-server.ts:6` | `packages/evals/evals/acme-server.ts` (mới) | Không | Văn bản trả lời mong đợi. |
| `STREAM_PROVIDER_ID` | const | `packages/evals/evals/acme-server.ts:7` | `packages/evals/evals/acme-server.ts` (mới) | Không | Literal `"acme-stream"`. |
| `STREAM_MODEL_ID` | const | `packages/evals/evals/acme-server.ts:8` | `packages/evals/evals/acme-server.ts` (mới) | Không | Literal `"acme-stream-chat"`. |
| `STREAM_PROBE_PROMPT` | const | `packages/evals/evals/acme-server.ts:9` | `packages/evals/evals/acme-server.ts` (mới) | Không | Prompt thăm dò cho cánh ndjson. |
| `STREAM_PROBE_RESPONSE` | const | `packages/evals/evals/acme-server.ts:10` | `packages/evals/evals/acme-server.ts` (mới) | Không | Câu trả lời mong đợi cho cánh ndjson. |
| `STREAM_API_DOCUMENTATION` | const | `packages/evals/evals/acme-server.ts:12` | `packages/evals/evals/acme-server.ts` (mới) | Không | Fixture tài liệu API đưa cho coding-agent dưới dạng file workspace. Là input nhìn thấy được, nên nội dung của nó là một phần của thí nghiệm. |
| `AcmeServer` | type | `packages/evals/evals/acme-server.ts:51-58` | `packages/evals/evals/acme-server.ts` (mới) | Không | start/stop/reset/origin/baseUrl/validRequestReceived. 4 chỗ gọi; hình dạng không được trôi trong lúc đổi `node:http` → `Bun.serve`. |
| `createAcmeServer` | fn | `packages/evals/evals/acme-server.ts:60-154` | `packages/evals/evals/acme-server.ts` (mới) | Không | Provider giả trong tiến trình trên một port tạm. Kiểm tra path/method/content-type/auth/model/prompt, rồi phát lại SSE (chế độ openai) hoặc ndjson (chế độ stream). Được `acme-server.test.ts` phủ kín và port sạch. |

### Đổi tên phạm vi

25 quy tắc đổi tên, tất cả đã đếm số lần xuất hiện trong package. Đây là phần "chủ yếu chỉ đổi tiền tố" mà bối cảnh nói tới — 23/25 đã kiểm chứng, 2 chưa, và đúng 2 chưa kiểm chứng ấy là hai chỗ có thể im lặng no-op.

| mẫu cũ (pi) | mẫu mới (omp) | số lần | kiểm chứng |
| --- | --- | --- | --- |
| `@earendil-works/pi-coding-agent` | `@oh-my-pi/pi-coding-agent` | 14 | đã kiểm chứng |
| `@earendil-works/pi-ai` | `@oh-my-pi/pi-ai` | 7 | đã kiểm chứng |
| `@earendil-works/pi-evals` | `@oh-my-pi/pi-evals` | 1 | đã kiểm chứng |
| `PI_PROVIDER` | `OMP_PROVIDER` | 16 | đã kiểm chứng |
| `PI_MODEL` | `OMP_MODEL` | 16 | đã kiểm chứng |
| `PI_CODING_AGENT_DIR` | **GIỮ NGUYÊN** — đây vẫn là biến omp đọc (`packages/utils/src/dirs.ts:446`, help `packages/coding-agent/src/cli/help-extra.ts:66`); `OMP_CODING_AGENT_DIR` không tồn tại ở đâu cả | 5 | đã kiểm chứng (đích KHÔNG tồn tại) |
| `PI_EVAL_VARIANT` | `OMP_EVAL_VARIANT` | 10 | đã kiểm chứng |
| `PI_EVAL_SANDBOX_UID` | `OMP_EVAL_SANDBOX_UID` | 5 | đã kiểm chứng |
| `PI_EVAL_SANDBOX_GID` | `OMP_EVAL_SANDBOX_GID` | 5 | đã kiểm chứng |
| `PI_EVAL_CONTAINER` | `OMP_EVAL_CONTAINER` | 3 | đã kiểm chứng |
| `PI_EVAL_RUNS_PER_VARIANT` | `OMP_EVAL_RUNS_PER_VARIANT` | 3 | đã kiểm chứng |
| `PI_EVAL_ARTIFACT_UID` | `OMP_EVAL_ARTIFACT_UID` | 3 | đã kiểm chứng |
| `PI_EVAL_ARTIFACT_GID` | `OMP_EVAL_ARTIFACT_GID` | 3 | đã kiểm chứng |
| `PI_EVAL_ARTIFACT_DIR` | `OMP_EVAL_ARTIFACT_DIR` | 3 | đã kiểm chứng |
| `PI_SESSION_SNAPSHOT_ARTIFACT` / `piSessionJsonl` | `OMP_SESSION_SNAPSHOT_ARTIFACT` / `ompSessionJsonl` | 7 | đã kiểm chứng |
| tiền tố đường dẫn `pi-eval-` (tmpdir/secret/image) | `omp-eval-` | 11 | đã kiểm chứng |
| `/repo/packages/evals/` (tiền tố container hardcode) | suy ra từ `packageRoot`; đổi cả trong `test/report.test.ts:47` | 10 (9 ở file skip + **1 ở `test/report.test.ts:47` cần sửa**) | đã kiểm chứng |
| `vitest-evals/harness` | `packages/evals/src/harness-types.ts` (port cục bộ) | 1 | đã kiểm chứng |
| `vitest-evals` | BỎ (không có tương đương bun test) | 7 | đã kiểm chứng |
| `vitest` | `bun:test` | 13 | đã kiểm chứng |
| `@vitest-evals/core` | `packages/evals/src/report-io.ts` (port cục bộ) | 3 | đã kiểm chứng |
| `autoevals` | BỎ | 2 (devDep `package.json:18` + import `tui.docs.eval.ts:12`) | đã kiểm chứng |
| Văn xuôi Pi coding agent ("Configure this running Pi installation") | văn xuôi của omp | 4 (models, extensions, custom-provider, openai-provider) | đã kiểm chứng |
| `"Pi documentation (read only` | marker tài liệu thật của omp | 2 | **CHƯA kiểm chứng — phải suy ra lại từ prompt thật của omp** |
| `@earendil-works/pi-ai/utils/transcript` | `packages/evals/src/system-prompt.ts` (port cục bộ) | 1 | **CHƯA kiểm chứng** |

### Dependency mới

Bảy mục. Năm mục đầu là loại "đừng thêm vào" — đó là cả điểm của việc đứng cuối thứ tự migrate.

| tên | version | đã có ở omp | quyết định |
| --- | --- | --- | --- |
| `vitest` | 4.1.9 | Không | **KHÔNG THÊM.** Đây là runner của pi: `describeEval`, tách project, vitest JSON reporter, khám phá bằng `vitest list --json`. omp là repo `bun test`; thêm vitest sẽ tạo ra một runner thứ hai, cấu hình khác, và vi phạm tinh thần luật central-utilities. Thay bằng `bun:test`. |
| `vitest-evals` | 0.15.0 | Không | **KHÔNG THÊM.** Nó là plugin của vitest và không chạy được dưới `bun test`. Port khoảng 6 symbol harness cần vào một `harness-types.ts` cục bộ. |
| `@vitest-evals/core` | 0.15.0 | Không | **KHÔNG THÊM.** Thay bằng `report-io.ts` cục bộ parse thẳng JSON; kỳ vọng về field của report.ts đã liệt kê đầy đủ trong bảng bề mặt công khai. |
| `autoevals` | 0.3.0 | Không | **KHÔNG THÊM**, và chỉ cần nếu `tui.docs.eval.ts` được port — metric này là một hàm cục bộ 10 dòng, đừng thêm dependency vì nó. |
| `shx` | 0.4.0 | Không | **KHÔNG THÊM.** Chỉ phục vụ script `clean`: `shx rm -rf .eval`. omp cấm spawn shell cho thao tác filesystem; dùng `rm -rf` qua Bun hoặc `rm` của `node:fs/promises`. |
| `@types/bun` | catalog: `^1.3.14` | **Có** | Giữ nguyên. Thay `@types/node` + `@types/vitest` trong `types` của tsconfig; đã có trong catalog gốc, không thêm mục mới. |
| image nền `oven/bun` | 1.4-slim | Không | Chỉ là image, không có mục `package.json`. Thay `node:24-slim`; container eval chạy harness và CLI. Ghi chú: việc này bỏ `node --experimental-strip-types`, vốn Bun làm sẵn. |

Ngoài bảy mục này, các phụ thuộc còn lại đều là package nội bộ của omp và không cần thêm: `@oh-my-pi/pi-ai` và `@oh-my-pi/pi-coding-agent` trỏ bằng `catalog:` refs, `@types/bun` đã có, và không có entry npm nào mới.

### Va chạm với thứ omp đã có

Mười một va chạm. Bốn cái đầu là chặn type/compile; bảy cái sau là chặn thiết kế.

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| `readStoredCredential` — TRÙNG TÊN, KHÁC CHỮ KÝ. Ở pi: `readStoredCredential(provider, authPath)`. Ở omp: `readStoredCredential(provider)`, resolve `auth.json` qua `AuthStorage.create()` và không nhận đường dẫn. | `packages/evals/src/harness.ts:314` | `packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1469` | **GIỮ BẢN CỦA OMP.** Cả ý nghĩa của eval harness là đọc credential từ một agent dir CÁ LY TRƯỚC khi session tồn tại; bản của omp đọc `AuthStorage` toàn tiến trình và sẽ âm thầm dùng đúng `~/.omp/agent/auth.json` của người phát triển — rò credential đó vào một container rồi hạ quyền. Chữ ký của omp cũng chỉ biên dịch với lời gọi 2 tham số một cách tình cờ. Resolve đường dẫn tường minh (`authPath = join(hostAgentDir,'auth.json')`) rồi đọc file trực tiếp, hoặc thêm tham số thứ hai tuỳ chọn cho hàm của omp. |
| `CreateAgentSessionOptions.tools` / `.noTools` KHÔNG TỒN TẠI ở omp. Kiểu của harness khai `PiCodingAgentHarnessOptions.tools` và `.noTools` là `CreateAgentSessionOptions['tools']`/`['noTools']` rồi chuyển tiếp cho `createAgentSessionFromServices`. `CreateAgentSessionOptions` của omp kéo dài sdk.ts:495-809 và có `customTools` (L591) + `extensions` (L593) + `toolNames` (L692) + `restrictToolNames` (L694), nhưng không có `tools` lẫn `noTools` (`grep -c noTools packages/coding-agent/src/sdk.ts` → 0). | `packages/evals/src/harness.ts:53-55` | `packages/coding-agent/src/sdk.ts:495-809` | **GIỮ interface của OMP và map đúng option.** `PiCodingAgentHarnessOptions.tools: string[]` và `.noTools: boolean` phải truyền thành `{ toolNames: options.tools ?? DOCUMENTATION_EVAL_TOOLS, restrictToolNames: true }` — KHÔNG đưa danh sách tên vào `customTools` (option đó nhận `CustomTool \| ToolDefinition`, không nhận tên), và không cần `extensions` cho việc này. **Đã kiểm chứng 5/6 tên:** `read`, `write`, `edit`, `grep`, `find` có đúng tên trong `BUILTIN_TOOL_NAMES` (`packages/coding-agent/src/tools/builtin-names.ts:1-32`); **`ls` KHÔNG tồn tại ở omp** — thay bằng `glob`, hoặc bỏ hẳn và ghi rõ trong README là cánh dùng 5 tool. Đừng để cánh control âm thầm chạy thiếu tool — đúng loại vi phạm giao thức im lặng mà chính các eval này sinh ra để ngăn. |
| `ModelRuntime` không tồn tại ở bất cứ đâu trong omp. Ở pi: `packages/coding-agent/src/core/model-runtime.ts:153`. Ở omp không có `packages/coding-agent/src/core/` nào. Điều này phá vỡ phía dưới của `resolveModelSelection` (`ModelRuntime.create/getModel/getAuth/setRuntimeApiKey`) và toàn bộ `evals/configured-runtime.ts`. | `packages/evals/src/harness.ts:316-327`; `packages/evals/evals/configured-runtime.ts:56-119` | mới — không có (gần nhất: `packages/coding-agent/src/sdk.ts:495` authStorage/modelRegistry, và model manager của `packages/catalog`) | **CHẶN** cho các eval dò model, không chặn phần còn lại. KHÔNG tạo một shim `ModelRuntime` để cho bản chép biên dịch được. Trỏ lại `ModelRegistry` + `AuthStorage` + `getModel` của omp và chấp nhận rằng `models.docs.eval.ts` / `openai-provider.docs.eval.ts` / `custom-provider.docs.eval.ts` (3 trong 5 suite) nằm ngoài phạm vi cho tới khi reconcile đó xảy ra. Ship `report.ts` + `plan.ts` + `acme-server.ts` + 4 test khi port trước. |
| `createAgentSessionServices` / `createAgentSessionFromServices` không tồn tại ở omp. Ở pi: `packages/coding-agent/src/core/agent-session-services.ts:135,202`. `createAgentSession` của omp (`packages/coding-agent/src/sdk.ts:1485`) là một entry point duy nhất và trả thẳng `{session, ...}`, không có object services tách riêng. | `packages/evals/src/harness.ts:337-355` | `packages/coding-agent/src/sdk.ts:1485` | **GIỮ `createAgentSession` của OMP.** Hình dạng hai bước services/attach là kiến trúc plugin của pi; omp chọn không dùng. Harness phải truyền `cwd`/`agentDir`/`model`/`thinkingLevel`/`customTools`/`extensions` trong một lệnh. Xác minh `session.reload()` và `session.abort()` vẫn còn trên `AgentSession` trả về — `harness.ts` L376 và L370 phụ thuộc cả hai, và 'reload' chính là bước làm cho các eval "cấu hình lại bản cài đặt của chính nó" trở nên khả thi. |
| `InlineExtension` không tồn tại ở omp; omp gọi cùng khái niệm đó là `ExtensionFactory`, và tên hook thì mang sang nguyên vẹn. Harness của pi đăng ký một inline extension ẩn nghe `before_agent_start` rồi thay prompt. | `packages/evals/src/harness.ts:287-301` | `packages/coding-agent/src/sdk.ts:593` (`extensions?: ExtensionFactory[]`); `packages/coding-agent/src/extensibility/extensions/types.ts:1660` | **GIỮ `ExtensionFactory` của OMP, và tên hook mang sang được nguyên vẹn — không cần suy ra lại, không cần thêm gì.** omp có `before_agent_start` y hệt: `BeforeAgentStartEvent.systemPrompt: string[]` (`types.ts:783-790`) và `BeforeAgentStartEventResult.systemPrompt?: string[]` (`types.ts:1194-1198`), nối lại trong `emitBeforeAgentStart` (`runner.ts:1874-1913`); cây omp đã dùng nó ở `src/autoresearch/index.ts:293` và hai ví dụ trong `examples/extensions/`. Chép thẳng khối `pi.on("before_agent_start", ({ systemPrompt }) => { forcedSystemPrompt = transform(systemPrompt.join("\n")); return { systemPrompt: forcedSystemPrompt }; })`; khác biệt duy nhất là omp trả `string[]` còn pi trả `string`. Ràng buộc đã kiểm chứng: `emitBeforeAgentStart` chỉ chạy khi `hasHandlers("before_agent_start")` (`runner.ts:1879`), nên extension phải được nạp qua `extensions` chứ không được bỏ trong danh sách kiểm tra ở L357. Ghi chú bình luận của pi ở L388-389: một prompt bị ép không được ghi vào transcript, đó là lý do harness giữ lại giá trị riêng của transform. |
| `getDocsPath` / `getExamplesPath` / `getReadmePath` không tồn tại ở omp (0 định nghĩa, đã kiểm chứng). `test/harness.test.ts` import cả ba để khẳng định các file tài liệu một variant nên hoặc không nên có. | `packages/evals/test/harness.test.ts:2` | mới — không có | **THAY THẾ, đừng thêm lại.** Helper đường dẫn tài liệu mà pi dùng không phải API của omp. Suy ra đường dẫn tài liệu mong đợi từ chính mảng `files` trong `package.json` của `packages/coding-agent` của omp — đó là hợp đồng được ship — và lưu ý nó đã liệt kê `README.md`, `CHANGELOG.md` và `examples` nhưng KHÔNG có mục `docs`, khác với pi. |
| Thư mục 'docs' mà toàn bộ thí nghiệm cắt bỏ không nằm ở cùng chỗ. Ở ảnh `without_docs`, pi xoá `packages/coding-agent/{README.md,CHANGELOG.md,docs,examples}` và khẳng định đúng tập đó. coding-agent của omp ship `README.md`, `CHANGELOG.md`, `examples/` — và không có `docs/`; tài liệu hướng người dùng của nó nằm ở `./docs` ở gốc repo, và bundle của nó mang một file `dist/docs-index.generated.txt` chỉ có ở omp, phục vụ scheme URL `omp://`. | `packages/evals/docker/Dockerfile:15-19`; `docker/entrypoint.ts:49-61`; `evals/documentation-audit.eval.ts:33` | (không có neo phía omp) | **NHẮM LẠI tập tài liệu, đừng xoá khái niệm.** Cánh `without_docs` phải cắt đúng những gì mà model của omp thực sự nhìn thấy: `README.md`, `CHANGELOG.md`, `examples/`, và `dist/docs-index.generated.txt` (cái chỉ-ở-omp — cắt nó là một cánh MỚI mà pi không có, và bỏ qua nó sẽ để treatment vẫn đọc tài liệu mà control không có). Riêng `documentation-audit.eval.ts` glob một thư mục không tồn tại ở omp và sẽ khám phá KHÔNG case nào — một no-op im lặng, kiểu hỏng tệ nhất trong package. Hoặc trỏ lại tài liệu thật của omp, hoặc đừng port. |
| Đường ống cài đặt release-tarball của pi không có tương đương ở omp. `install-runtime.mjs` import `getPublicWorkspacePackages`/`packReleasePackages`/`installCodingAgentConsumer` từ `scripts/release-packages.mjs` và `scripts/coding-agent-consumer.mjs` — không file nào tồn tại ở omp. Rồi nó cài các tarball đã pack và `entrypoint.ts` khẳng định `pi-coding-agent` resolve tới `dist/index.js` với một `npm-shrinkwrap.json` hiện diện. | `packages/evals/docker/install-runtime.mjs:5-6`; `docker/entrypoint.ts:102-105,32` | mới — không có (`scripts/` của omp có `ci-release-*.ts` + `release.ts` publish thẳng từ source; `main` của coding-agent là `./src/index.ts` và artifact `dist` duy nhất là `dist/cli.js`) | **DỰNG LẠI, đừng port.** Ở omp không có runtime biên dịch cài được qua npm để đóng ảnh. Hai lựa chọn thực tế: (a) mount source workspace của omp vào container và chạy CLI bằng bun từ source — mất bảo đảm "resolve từ dist" nhưng sát với cách lập trình viên thực sự chạy omp; hoặc (b) mở rộng `scripts/release.ts` để phát ra tarball đã pack và viết helper consumer còn thiếu. Khuyến nghị (a) cho lát cắt đầu: nhỏ hơn, không thể trôi khỏi source, và assertion về dist-resolution mà nó bỏ là một kiểm tra riêng của release pi, không phải biện pháp bảo mật. |
| Chữ 'eval' đụng với một subsystem lớn, không liên quan, đã có ở omp. `packages/coding-agent/src/eval/` là 59 file (56 `.ts` + `js/shared/prelude.txt`, `py/prelude.py`, `py/runner.py`; `js/`, `py/`, `speculation/`) thực thi sandbox JS/Python, kernel session, bộ chấm suy đoán và cầu nối workpool; `packages/coding-agent/src/if-bench/` và `src/judgment/` nằm cạnh nó. Một `packages/evals` mới ở gốc repo không đụng trên đĩa, nhưng "eval" trong một cuộc review của omp nay có hai nghĩa không liên quan. | `packages/evals/` (cả package) | `packages/coding-agent/src/eval/` (59 file); `packages/coding-agent/src/if-bench/`; `packages/coding-agent/src/judgment/` | **GIỮ CẢ HAI BÊN, không đổi tên** — nhưng gọi tên khái niệm bằng văn xuôi. Package mới đo HÀNH VI của coding-agent (coding-agent có cấu hình đúng bản cài đặt của chính nó không); subsystem `eval/` sẵn có đánh giá MÃ KHÔNG TIN CẬY mà coding-agent đã viết. Gọi cái mới là "behavioural evals" trong tài liệu, changelog và commit message, và không bao giờ thêm nó vào các bucket tên `eval` sẵn có của `scripts/ci-test-ts.ts` mà không kèm comment. Cân nhắc một dòng trong `packages/evals/README.md` nói rõ điều đó ngay trang đầu. |
| vitest không tồn tại ở omp — 13 chỗ import, 2 file config, 1 lời gọi reporter, và một `vitest.base.ts` ở gốc mà omp không có. Toàn bộ runner, cách tách project và cơ chế khám phá (`vitest list --json`) đều riêng vitest. | `packages/evals/vitest.evals.config.ts`; `vitest.test.config.ts`; `docker/entrypoint.ts:120,132-143`; 13 chỗ `from 'vitest'` | mới — không có (omp: `bun test` qua `scripts/ci-test-ts.ts`, vốn glob `*.test.ts` và gom package theo tên) | **THAY bằng `bun:test`** cho test đơn vị — `ci-test-ts.ts` của omp đã thu thập mọi `*.test.ts` dưới thư mục package, nên 4 file test port bằng cách đổi đúng một dòng import. Runner các cánh docker không có bản tương đương bun, và đó là lý do comparison runner chỉ có thể viết lại. **KHÔNG thêm vitest.** |
| `session.resourceLoader` không tồn tại trên `AgentSession` của omp. `extensions.docs.eval.ts` đọc `session.resourceLoader.getExtensions()` cho cả danh sách extension đã nạp lẫn bộ tool theo từng extension. omp phơi ra `session.extensionRunner` (một getter tại `packages/coding-agent/src/session/agent-session.ts:12155`) nhưng không có `resourceLoader`. | `packages/evals/evals/extensions.docs.eval.ts:12,18-19` | `packages/coding-agent/src/session/agent-session.ts:12155` | **TRỎ LẠI** bề mặt extension của omp khi đã xác định; `extensionRunner` có thể là optional (trả `ExtensionRunner \| undefined`), nên mapper output sau khi port phải xử lý cả trường hợp undefined thay vì giả định nó có. Đây là eval có giá trị nhất trong năm (nó chứng minh một coding-agent có thể tạo rồi dùng một tool extension), nên đáng làm thêm công — nhưng đó là viết lại, không phải chép. |

### Các bước

1. Tạo `packages/evals/{src,evals,test,docker,scripts}` và chép `src/plan.ts` **NGUYÊN VĂN** — đây là file nguồn duy nhất không có phụ thuộc ngoài nào (không `@earendil-works`, không builtin node, không vitest). Đừng format lại nó; một bản chép giống hệt byte là tín hiệu đúng đắn rẻ nhất trong toàn bộ lần migrate. Chép luôn `.gitignore` và `Dockerfile.dockerignore` nguyên văn. Neo: `packages/evals/src/plan.ts`.
2. Viết `packages/evals/NOTICE` với thông báo MIT **NGUYÊN VĂN** từ `/Users/tranquangdang21/Projects/pi-ref/LICENSE` (Copyright (c) 2025 Mario Zechner, kèm đầy đủ phần quyền và mệnh đề miễn trừ bảo đảm), cộng: repo upstream (`earendil-works/pi`), commit đã ghim `d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31`, phát biểu nguồn gốc (fork, không clean-room), và danh sách file đã thích nghi. Theo đúng tiền lệ `crates/pi-shell/NOTICE` — văn xuôi, một dòng trống, rồi nguyên văn giấy phép. Đây là điều kiện để việc chép là hợp pháp, không phải nghi thức. Neo: `packages/evals/NOTICE`.
3. Viết `packages/evals/package.json`: name `@oh-my-pi/pi-evals` (KHÔNG phải `@oh-my-pi/evals` — quy ước là `@earendil-works/X` → `@oh-my-pi/X` nguyên văn). Bỏ năm devDependency họ vitest. Trỏ `pi-ai`/`pi-coding-agent` về catalog: refs. Thêm `"test": "bun test --parallel"` — đúng khuôn của 10/16 package omp; KHÔNG dùng `bun ../../scripts/ci-test-ts.ts local-ts` (không package nào dùng `local-ts`, đó là mode của script gốc chứ không phải của package). Bắt buộc xoá cả L11 của bản chép: `"test": "vitest run --config vitest.test.config.ts"` — dòng này không có trong danh sách hiện tại và là lệnh vitest duy nhất sót lại trong file. **Bắt buộc khai hai script theo đúng khuôn 16 package còn lại**, nếu không `bun run check:ts` sẽ bỏ qua package này: `"check:types": "tsgo -p tsconfig.json --noEmit"` và `"check": "oxlint . && oxfmt --check --no-error-on-unmatched-pattern 'src/**/*.{ts,tsx}' '{test,bench,examples,scripts}/**/*.ts' '*.ts' && bun run check:types"`. Lý do: `check:ts` ở gốc chạy `bun run --filter './packages/*' --sequential --if-present check:types`; `--if-present` cộng với package không có script = exit 0, không in gì, không typecheck gì cả. Giữ `private:true`. Neo: `packages/evals/package.json`.
4. Port `src/report.ts`. Làm việc này **trước** `harness.ts` vì đây là code giá trị cao nhất package và nó chỉ bị chặn bởi một seam. Tạo `src/report-io.ts` thay `@vitest-evals/core`: một type `ReportCase` cộng các reader thẳng cho JSON của vitest. Tên field PHẢI khớp chính xác những gì `readTaskObservation` đọc ở L122-188 (`status`, `fullName`, `harness.run.usage.*`, `harness.run.timings.totalMs`, `harness.run.errors`, `harness.run.artifacts[piSessionJsonl]`, `eval.avgScore`) — đổi tên một field biến một quan sát thật thành `'errored'` âm thầm và lặng lẽ xoá case khỏi report. Đổi `node:util` `styleText` → `Bun.styleText`. Port builtin node sang Bun. Neo: `packages/evals/src/report.ts`.
5. Port `src/docker.ts` và `src/cli.ts` cùng nhau (`cli.ts` gọi mọi export của `docker.ts`). Thay `spawnSync` bằng Bun Shell `$` theo quy tắc omp; thay `existsSync`/`readFileSync`/`statSync`/`mkdirSync` bằng `Bun.file` + `node:fs/promises`; làm `requireEvalAuthFile` async và await nó. Ba lời gọi `console.log` trong `cli.ts` GIỮ `console.*` — quy tắc omp cho phép rõ ràng `console` cho CLI độc lập thoát ra không vào TUI, và đẩy chúng qua `logger` sẽ gửi output hướng người dùng của runner vào `~/.omp/logs/` nơi không ai đọc. Suy ra tiền tố container thay vì hardcode `/repo/packages/evals/`. Neo: `packages/evals/src/docker.ts`.
6. Viết bốn module phụ cục bộ mới: `harness-types.ts` (port bề mặt `vitest-evals/harness` — `Harness`, `HarnessContext`, `JsonValue`, `SimpleHarnessResult`, `TranscriptEvent`, `UsageSummary`, `createHarness`, `normalizeHarnessRun`, `normalizeRecord`, `attachHarnessRunToError`, `toJsonValue`), `content-text.ts` (port `pi packages/ai/src/utils/text.ts:6`), `system-prompt.ts` (port `pi packages/ai/src/utils/transcript.ts:99`), và `doc-lift.ts`. Với `doc-lift.ts` ĐỪNG chép chuỗi marker của pi: đọc prompt đã build thật của omp (`packages/coding-agent/src/prompts/system/system-prompt.md`) và suy ra ranh giới section từ đó. Chép marker `\n<docs>\n` / `\n</docs>` của pi sẽ tạo ra một bộ cắt hoặc ném ngay lần chạy đầu, hoặc tệ hơn — no-op và để cánh control vẫn đầy đủ tài liệu. Neo: `packages/evals/src/harness-types.ts`.
7. Port `src/harness.ts`. Đây là file sẽ hỏng. (a) Bỏ `ModelRuntime`, `createAgentSessionServices`, `createAgentSessionFromServices`, `InlineExtension` — không cái nào tồn tại ở omp; trỏ lại `createAgentSession` / `ExtensionFactory`. (b) Định kiểu lại `.tools` thành `string[]` và truyền vào `createAgentSession` qua `{ toolNames, restrictToolNames: true }` (omp không có key `tools`/`noTools` nào; `customTools` nhận object chứ không nhận tên). (c) Resolve `readStoredCredential` tường minh theo đường dẫn agentDir cách ly — ĐỪNG dùng dạng 1 tham số của omp, vì nó đọc đúng `auth.json` thật của người phát triển. (d) Xác minh `session.reload()` và `session.abort()` tồn tại trước khi dựa vào chúng. (e) Port builtin node sang Bun (`Bun.file`, `fs/promises`, `Bun.hash`, `Bun.nanoseconds`). (f) Đổi `PI_EVAL_*`/`PI_PROVIDER`/`PI_MODEL` thành `OMP_*` và `PI_SESSION_SNAPSHOT_ARTIFACT` thành `ompSessionJsonl` (cập nhật `report.ts` L9 cho khớp); **giữ `PI_CODING_AGENT_DIR`** — đó là biến omp thực sự đọc, không có `OMP_CODING_AGENT_DIR`; tốt hơn là bỏ hẳn biến môi trường và truyền `agentDir` qua option của `createAgentSession`. Neo: `packages/evals/src/harness.ts`.
8. Port `evals/acme-server.ts`: `createServer` từ `node:http` → `Bun.serve`, 2 chỗ `new Promise` → `Promise.withResolvers()`, `close(cb)` → `stop()`. Hình dạng công khai `AcmeServer` (start/stop/reset/origin/baseUrl/validRequestReceived) không được trôi — 4 chỗ gọi và 1 test phụ thuộc vào nó. Port nguyên văn 9 hằng export. Neo: `packages/evals/evals/acme-server.ts`.
9. Port 4 file test chạy được, chỉ đổi import runner: `from 'vitest'` → `from 'bun:test'`. `plan.test.ts`, `comparison.test.ts`, `acme-server.test.ts` port gần như không đổi. `report.test.ts` còn cần fixture của nó được viết lại theo hình dạng `src/report-io.ts` mới, và các lời gọi `node:fs/promises` đổi sang Bun. Rồi đăng ký `packages/evals` trong `scripts/ci-test-ts.ts` — mảng `fastWorkspacePackages` (quanh dòng 88) là chỗ đúng, vì 4 file này thuần và ngắn. Không có dòng đó, test tồn tại nhưng không bao giờ chạy trong CI. Neo: `packages/evals/test/plan.test.ts`.
10. **HOÃN** 5 suite eval, `Dockerfile`, `install-runtime.mjs`, `entrypoint.ts`, 2 config vitest, `evals/configured-runtime.ts`, `test/configured-runtime.test.ts` và `test/harness.test.ts`. Chúng không bị chặn vì thủ tục, mà bị chặn vì việc thiết kế thật: 3 trong 5 suite cần `ModelRuntime`, 1 cần một bề mặt output extension tool mà omp không phơi ra, 1 glob một thư mục tài liệu omp không có, và toàn bộ ảnh docker phụ thuộc một đường ống release-tarball mà omp không có bản tương đương. Ship phần lõi chạy được trước và ghi phần còn lại thành việc sau. Neo: `packages/evals/docker/Dockerfile`.
11. Trước commit đầu tiên, diff mảng `files` của coding-agent của omp với tập tài liệu mà cánh `without_docs` cắt, và ghi lại ánh xạ (`README.md`, `CHANGELOG.md`, `examples/` — cộng `dist/docs-index.generated.txt` chỉ có ở omp, thứ không có tương đương ở pi và phải được thêm vào cánh control nếu không thí nghiệm đo được gì). Thêm một mục CHANGELOG dưới `## [Unreleased]` trong `CHANGELOG.md` của chính package, mở đầu bằng điều người dùng nay có thể làm. Neo: `packages/coding-agent/package.json`.

### Hợp đồng test

Bốn điều phải quan sát được là đúng sau khi migrate, và mỗi điều có đúng một test chứng minh.

1. **LAN TRUYỀN CHẶN.** Với một cohort đã lên kế hoạch mà một cánh bị lỗi, không cánh nào được khám phá, hoặc hai cánh trùng identity, `summarizeEvalObservations` phải liệt kê cặp đó trong `blockedPairs`, đặt `controlPassRate` và `treatmentPassRate` của eval set đó thành `null`, và đặt `lift` thành `null` — và KHÔNG được lặng lẽ rút cặp khỏi mẫu số. Chứng minh bởi `test/comparison.test.ts`.
2. **MỘT SỐ ĐO BIẾT MẤT LÀ KHÔNG CÓ, KHÔNG PHẢI 0.** `readTaskObservation` trên một report thiếu một trường telemetry phải sinh `outcome:'errored'`, hoặc một bản tổng mà `OperationalMetricTotal` mang `{availableRuns: n, total: null}` — không bao giờ `total: 0`. Chi phí bằng 0 và chi phí chưa đo là hai sự thật khác nhau, trộn chúng làm một hồi quy trông như miễn phí. Chứng minh bởi `test/report.test.ts` và `test/comparison.test.ts`.
3. **SANDBOX CỦA CÁNH LÀ THẬT.** Source và fixture của chính bộ chấm phải không đọc được bởi uid mà harness hạ xuống, và việc hạ quyền phải vĩnh viễn. Điều này được khẳng định trong tiến trình bởi bộ ba `chmod`/`chownTree`/`assertSandboxCannotRead` và end-to-end bởi `docker/entrypoint.ts`. Ở lát cắt đầu (mount source, không ảnh), nửa trong tiến trình vẫn phải đúng, nếu không eval sẽ chấm một mô hình đọc được bộ chấm của chính nó.
4. **MỘT CÁNH KHÔNG TẠO RA REPORT LÀ MỘT QUAN SÁT LỖI, KHÔNG PHẢI MỘT QUAN SÁT THIẾU.** `runTask` trả `undefined` phải sinh `erroredObservation(task)` để cặp bị chặn và tiến trình thoexit với mã khác 0 — không bao giờ một mẫu số ngắn hơn trong im lặng, vì đó sẽ báo lift tính trên một cohort mà giao thức chưa hề lên kế hoạch. Chứng minh bởi `test/comparison.test.ts` và đường exit-code của `cli.ts`.

Cộng các bất biến không phụ thuộc runner sống qua đổi vitest→bun: acme fixture server từ chối phân biệt 404/405/415/400/422/401; `createTaskPlan` xen kẽ thứ tự cánh theo số lần chạy; `parseDiscoveredCases` từ chối một tên không có "<eval set> > <case>" và từ chối identity trùng.

Bốn file test: `packages/evals/test/plan.test.ts`, `packages/evals/test/comparison.test.ts`, `packages/evals/test/report.test.ts`, `packages/evals/test/acme-server.test.ts`.

KHÔNG phải hợp đồng, và không được test: rằng constructor của harness lưu option của nó, rằng hằng số có giá trị này, rằng report không rỗng, rằng một file tồn tại. Không source-grep. Không `mock.module()`. `applyIsolatedEnvironment` mutate `process.env` và `registerEvalCleanup()` chạy trong `createAgentSession` của omp, nên test của harness phải dùng `vi.spyOn` + `vi.restoreAllMocks()` trong `afterEach` theo từng test thay vì mutate cả file.

### Xác minh

Khả dụng NGAY, và đây là cổng thật:

```bash
bun run check:ts          # oxlint + oxfmt trên package mới, rồi typecheck tsgo; đã kiểm chứng chạy được ở môi trường này (exit 0, ~29s trên máy rảnh)
bun run check:tools       # oxlint + oxfmt trên package mới. Miễn phí, chạy được ngay
```

`check:ts` SẼ bắt lỗi type của `harness.ts`, và đó là mục đích: `CreateAgentSessionOptions['tools']` và `['noTools']` không tồn tại ở omp, nên một bản chép nguyên văn fail typecheck ngay lập tức và không thể được ship trong im lặng.

`bun test packages/evals` — **CHẠY ĐƯỢC NGAY, và đây là cổng thật cho cả hợp đồng hành vi.** Đồ thị import của cả 4 file test chỉ gồm node builtins + `src/plan.ts` (không có import nào) + `src/report.ts` + `src/report-io.ts` + `evals/acme-server.ts`; không file nào chạm `@oh-my-pi/*` hay addon native, nên trạng thái build của `packages/natives` không liên quan. Đã kiểm chứng bằng cách chạy thật (chép 4 file + 3 module nguồn vào thư mục tạm, chỉ đổi dòng import `vitest` → `bun:test`, dựng seam `report-io.ts` cục bộ rồi chạy): **32 pass / 0 fail, 4 file, ~39ms**, không cần ninja, không build natives, `bunfig.toml` không có preload nạp native. `brew install ninja` chỉ cần khi sinh lại nhánh Docker, không cần cho bốn file này.

KHÔNG khả dụng, và phải nói thẳng: chính các eval đó. `createPiDocumentationEvalHarness` từ chối chạy trừ khi `OMP_EVAL_CONTAINER=1` cộng một cặp uid/gid sandbox, và mọi cánh doc cần một credential provider thật cộng hai ảnh Docker đã build. PR migrate không thể chứng minh phép so sánh chạy được; nó chỉ chứng minh package biên dịch, lint sạch và qua test đơn vị. Hãy nói vậy trong PR. Tương tự, các probe kiểu `bun run pi:smoke` không có: entrypoint container không được bất kỳ job CI nào hiện có nào chạm tới, và cần một probe smoke anh em mới nếu nhánh Docker được hồi sinh (xem hợp đồng worker/smoke trong AGENTS.md để lấy khuôn).

### Cổng hoàn thành

```bash
bun run check:ts && bunx oxlint packages/evals   # `bunx`, không phải `oxlint` trần: oxlint không có trên PATH, chạy trần trả về 127 và làm chết cả chuỗi &&
bun test packages/evals                          # 4/4 file, chạy được ngay — không cần ninja
grep -rn '@earendil-works' packages/evals              # phải ra 0 hit
grep -rn 'from "vitest' packages/evals                 # phải ra 0 hit
grep -c 'Copyright (c) 2025 Mario Zechner' packages/evals/NOTICE   # phải ra 1
```

Cộng hai điều kiện không nằm trong lệnh nào: `packages/evals` phải xuất hiện trong `scripts/ci-test-ts.ts`, và `packages/evals/NOTICE` phải chứa nguyên văn dòng 'Copyright (c) 2025 Mario Zechner' cùng toàn bộ phần thông báo quyền.

Cổng CÓ thực sự đỏ được — `gate_can_fail: true`. Nó đỏ theo bốn cách độc lập: `check:ts` bắt lỗi định kiểu `tools`/`noTools`; hai lệnh `grep` bắt sót tiền tố cũ và sót vitest; dòng đăng ký trong `ci-test-ts.ts` bắt trường hợp test viết ra mà không bao giờ chạy; và `NOTICE` bắt trường hợp chép mà thiếu giấy phép. Cả bốn khẳng định cốt lõi về chặn, về metric biết mất là KHÔNG CÓ chứ không phải 0, và về exit-code đều được chứng minh bằng `bun test packages/evals` chạy thật ở môi trường này; chỉ còn các cánh docker mới là không chứng minh được.

### Rủi ro

**Cao nhất: NO-OP IM LẶNG.** Ba cách cụ thể lần migrate này có thể qua mọi cổng mà vẫn không đo được gì. (a) Cánh `without_docs` cắt một tập tài liệu không tồn tại ở omp — pi xoá `packages/coding-agent/docs`, omp không có thư mục đó, nên một Dockerfile chép nguyên văn sẽ cắt không được gì và cánh control sẽ đọc đúng tài liệu như cánh treatment. (b) `verifySystemPrompt` và `excludePiDocumentation` khoá vào marker literal `\n<docs>\nPi documentation (read only` và `\n<rules>\n` của pi; nếu bố cục prompt của omp khác, khẳng định hoặc ném (nhìn thấy được) hoặc bộ cắt trả về prompt không đổi (không nhìn thấy được). (c) `DOCUMENTATION_EVAL_TOOLS` nêu tên 6 tool có thể không tồn tại dưới đúng tên đó ở omp, nên cánh chạy với bộ tool nhỏ hơn và phép so sánh là giữa hai bên được trang bị khác nhau. Cả ba fail closed trên không — không lỗi, không exit khác 0, chỉ là một con số sai. Giảm thiểu bằng cách khẳng định system prompt của hai cánh thực sự khác nhau trước khi ghi bất kỳ quan sát nào, và bằng cách cho danh sách cắt tài liệu trong ảnh là assert-then-delete thay vì delete-if-present.

**Thứ hai: rò credential.** Chép nguyên văn lời gọi `readStoredCredential` của `harness.ts` hoặc sẽ không biên dịch (điều tốt), hoặc nếu ai đó "sửa" nó bằng cách bỏ đối số `authPath` thì sẽ âm thầm đọc `~/.omp/agent/auth.json` thật của người phát triển và chuyển credential của họ vào một container rồi hạ xuống uid không đặc quyền. Đây là khiếm khuyết duy nhất trong lần migrate này có thể gây thiệt hại thật, và cách sửa là kỷ luật một dòng: không bao giờ gọi `readStoredCredential` 1 tham số của omp từ harness.

**Thứ ba: câu hỏi vitest.** Lối tắt hấp dẫn là thêm vitest để bản chép chạy không đổi. Từ chối — omp là repo `bun test`, thêm một runner thứ hai cho một package tạo ra hai hệ test với config khác nhau, vòng đời khác nhau và đường ống CI khác nhau, và nó sẽ bị đọc như một sai lầm. 4 file test đơn vị port bằng một dòng import mỗi file; đó là phần rẻ. Runner các cánh docker thực sự không có bản tương đương bun, và đó phải là một hạn chế được nói ra chứ không phải lý do để cài lại vitest.

**Thứ tư: phạm vi.** Thật dễ bị thu hút khi port cả 5 suite eval để "hoàn thiện" package. Ba trong số đó kiểm tra việc một coding-agent có thêm provider hay model vào bản cài đặt của chính nó hay không — một khả năng omp có thể không có, vì omp đã thay bề mặt đăng ký provider của pi bằng một cây luật KDL biên dịch lúc build. Nếu khả năng đó đã mất, eval sẽ không viết nổi, và viết nó bằng mọi giá sẽ tạo ra một eval không bao giờ có thể qua. Hãy xác minh khả năng có tồn tại trước khi port suite.

### Cần người quyết

- coding-agent của omp có hỗ trợ việc nó tự thêm provider hay model vào bản cài đặt của chính nó không? 3 suite eval trong 5 của pi (models, openai-provider, custom-provider) kiểm tra đúng điều đó. Chính sách model của omp nằm trong một cây luật KDL đã biên dịch (`packages/catalog/src/compat/rules/`), không phải một registry sửa lúc chạy — nếu vậy 3 eval đó không viết nổi và package sẽ ship với 2 suite hành vi thay vì 5. **ĐIỀU NÀY CHẶN QUYẾT ĐỊNH PHẠM VI** và nên được trả lời trước khi bất kỳ suite nào được port.
- Sau khi migrate, symbol nào của `packages/evals` được một test sẵn có phủ? `test/plan.test.ts`, `comparison.test.ts`, `report.test.ts` và `acme-server.test.ts` phủ `plan.ts`, `report.ts` và `acme-server.ts`. `src/harness.ts` MẤT TOÀN BỘ độ phủ (`harness.test.ts` bị skip) và `src/docker.ts` + `src/cli.ts` vốn đã chẳng có. Logic sandbox và cách ly credential trong `harness.ts` là code hậu quả cao nhất package và hiện không được test. Có đáng viết một test hẹp hơn cho harness (các phần thuần: `resolveModelSelection`, `verifySystemPrompt`, `resolveDocumentationVariant`, `excludePiDocumentation`, `seedWorkspace` từ chối escape) trên `bun:test`, hay luật chất lượng test trong AGENTS.md loại nó vì quá hẹp?
- Việc đổi scope phía pi → phía omp (`@earendil-works/` → `@oh-my-pi/`) có đúng cho TÊN PACKAGE nói riêng không? Quy ước cho ra `@oh-my-pi/pi-evals`, đọc lên thừa. Sáu package mới còn lại không bị ảnh hưởng (chord, client, durable, protocol, server, telemetry), nhưng nếu `evals` là cái duy nhất trông sai thì bây giờ là lúc — sau khi nó đã xuất hiện thì đổi là một thay đổi phá vỡ tên package đã phát hành.
- Nhánh Docker có nên sống sót trong lát cắt đầu không? Phương án (a) mount source của omp vào một container bun và chạy từ source (nhỏ hơn, không thể trôi, mất assertion phân giải dist của pi); phương án (b) mở rộng `scripts/release.ts` để phát ra tarball đã pack và viết `scripts/release-packages.mjs` + `scripts/coding-agent-consumer.mjs` còn thiếu (trung thành hơn, lớn hơn, và tạo một bề mặt build mới phải duy trì). Đây là quyết định của maintainer với đuôi dài, và nên được đưa ra một lần, tường minh, chứ không để trôi dạt vào.
- Ba file test phụ thuộc `ModelRuntime` bị hoãn đi đâu — một package theo dõi riêng, hay một TODO có dấu vết trong README của package mới? Chúng không thể xoá (chúng mã hoá những hợp đồng thật đối với một bề mặt mà omp chưa có) và không ghi lại thì người sau sẽ phải suy ra lại rằng `ModelRuntime` là thứ đang thiếu.


---


## GAP-M1B-1 — Cổng ngân sách module-graph cho từng entrypoint: biến phép đo `PI_TIMING` thành một cái cổng đỏ

**Sóng:** 0.5, cùng WI-ECOSYS-1 — và phải đứng **trước mọi sóng port**. **Effort:** S — khoảng
0,5 ngày (2 file `.mjs` + 1 file baseline + 1 dòng trong `check:ts`). **Phụ thuộc:** không chặn
ai; chiều phụ thuộc đi ngược lại — GAP-M1B-5 khai phụ thuộc **cứng** vào cổng này.

**Nguồn:** `pi.1`. **Gần nhất đã có:** GAP-M6-13 (sổ ngưỡng hiệu năng) — cùng hình dạng «một con số
đã đo được nhưng không ai canh», khác tầng. Sổ đăng ký **không có mục pi nào**, nên đây là mục mới,
không phải mục trùng.

**Đây đúng là thứ M1B Sóng 0.5 tự đặt ra cho chính nó.** WI-ECOSYS-1 viết: *«cổng duy nhất nên
thêm: một script kiểm độ phủ chạy được trên danh sách package thật, có số trong báo cáo. Đó là
thứ biến "17/20" từ một con số lạ thành một cái cổng»*. `pi.1` là **cùng hình dạng**, khác đối
tượng: cổng kia đo độ phủ tầng B/C trên danh sách package thật, cổng này đo chi phí module-graph
theo từng entrypoint. Và nó phải đứng **trước mọi sóng port** — vì cổng này bắt hồi quy khi chép
thêm provider/module.

**Cái omp thiếu — có đúng nửa (1) ĐO, thiếu nửa (2) CỔNG.**

- **ĐO — có đủ:** `packages/utils/src/module-timer.ts` (6.3 KB, Bun.plugin `build.onLoad`,
  inclusive window mỗi module), `packages/utils/src/timing-buffer.ts` (1.6 KB, hợp đồng dùng
  chung), `logger.ts:524` drain buffer vào cây log, và script `package.json:75`
  `"dev:timing": "PI_TIMING=x bun --cwd=packages/coding-agent --preload ../utils/src/module-timer.ts src/cli.ts"`.
- **CỔNG — không có:** `grep -rniE 'entry.?graph|bundle.?budget|startup.?budget|graph.?cost' package.json scripts/ .github/`
  → **0 hit**.
- **Bên `pi`:** `scripts/check-entry-graphs.mjs` (5.3 KB) + `scripts/cost.ts` (5.3 KB) + hai
  smoke entry.

**Hình dạng port — chép rồi sửa, không viết mới.** `check-entry-graphs.mjs` và `cost.ts` là hai
file `.mjs` độc lập, **không import gì từ omp**. Sửa: đường dẫn entry sang
`packages/coding-agent/src/cli.ts` + các worker selector, ngưỡng lấy từ một file baseline commit
sẵn.

**KHÔNG lấy** `agent-treeshake-smoke-entry.ts` / `browser-smoke-entry.ts` — chúng chạm
`experimental/` mà M1B đã loại.

**Pháp lý:** MIT — chép nguyên văn kèm giữ nguyên dòng `Copyright (c) 2025 Mario Zechner`. Không
dính exclusion nào (không phải wasm, không phải `.node`, không phải highlight.js). Theo M1B §1: lấy
nguyên văn `LICENSE` gốc rồi **nối thêm** dòng bản quyền của omp, giữ Zechner là dòng **đầu**. Xoá
dòng Zechner là hành động duy nhất làm cho bản chép vi phạm luật. `packages/omptype/LICENSE` là hình
mẫu.

**Cái được bảo toàn — hai điều, cả hai đều dễ làm hỏng ngay lần chạy đầu:**

1. **Baseline phải được chụp SAU khi M1 merge và SAU sóng port đầu tiên**, không phải ở HEAD hôm
   nay. Chụp ở HEAD thì cổng đỏ ngay lần chạy đầu và mất luôn ý nghĩa. → xem GAP-D13.
2. **`dev:timing` phải chạy được sau khi thêm cổng.** Đo và cổng là hai đường; cổng không được
   nuốt mất preload. Đây là loại chi tiết mà một PR «thêm cổng» hay xoá nhầm vì không ai chạy
   lại script cũ.

### File cần chạm tới

| path | kích thước | hành động | ghi chú |
| --- | --- | --- | --- |
| `scripts/check-entry-graphs.mjs` | 5.3 KB | chép rồi sửa | Danh sách entry trỏ sang `packages/coding-agent/src/cli.ts` + các worker selector. Ở cây nguồn file này **không import gì từ omp**, nên ngoài danh sách entry không có gì để repoint. |
| `scripts/cost.ts` | 5.3 KB | chép rồi sửa | Cùng danh sách entry. Ngưỡng đọc từ file baseline — không hard-code trong script, vì hard-code là cách chắc chắn nhất để biến một cổng đo thành một con số chết. |
| file baseline ngưỡng | — | tạo mới, commit sẵn | Chụp **sau** khi M1 merge và **sau** sóng port đầu tiên. Chụp ở HEAD hôm nay làm cổng đỏ ngay lần chạy đầu. |
| `package.json` | :75 | thêm 1 dòng | Nối cổng vào `check:ts`. **Giữ nguyên** `"dev:timing"` ở `:75` — cổng không được nuốt mất preload. |
| `LICENSE` | hình mẫu: `packages/omptype/LICENSE` | theo M1B §1 | Lấy nguyên văn `LICENSE` gốc của `pi`, nối thêm dòng bản quyền của omp, giữ `Copyright (c) 2025 Mario Zechner` là dòng **đầu**. |
| `agent-treeshake-smoke-entry.ts`, `browser-smoke-entry.ts` | — | **bỏ** | Chạm `experimental/` mà M1B đã loại. Effort của mục này cũng không tính chúng. |

### Các bước

1. Chép `scripts/check-entry-graphs.mjs` và `scripts/cost.ts` nguyên văn vào `scripts/`, giữ nguyên
   dòng `Copyright (c) 2025 Mario Zechner` và xử lý `LICENSE` theo hàng thứ tư ở bảng trên — cùng
   thứ tự M1B §1 dùng: đặt thông báo pháp lý xuống **trước** khi bất kỳ dòng mã chép nào đặt xuống.
2. Sửa danh sách entry trong cả hai file sang `packages/coding-agent/src/cli.ts` + các worker
   selector. Không thêm mục nào khác nếu không chạy được.
3. Tạo file baseline và **commit sẵn** — nhưng chụp số đo ở thời điểm đúng: sau khi M1 merge và
   sau sóng port đầu tiên. Bước này là bước dễ làm sai nhất của mục.
4. Nối cổng vào `check:ts` bằng **một dòng** trong `package.json`, cạnh cấu hình sẵn có ở `:90`
   và `:91`. Không sửa `dev:timing`.
5. Chạy lại `bun run dev:timing` sau khi nối cổng, và bằng chứng phải là cây log vẫn ra — không phải
   "không có lỗi".

### Hợp đồng test

Hai mục này là **cổng kiểm dưới `scripts/`**, không phải file `bun:test`; vì vậy hợp đồng của chúng là
hợp đồng của một cái cổng, và nó phải **đỏ được**. Ba điều kiện:

- **Cổng đỏ được.** Tăng một ngưỡng trong baseline (hoặc thêm một module vào một entry) thì cổng
  phải đỏ, và phải **in ra con số** trong báo cáo. Cổng luôn xanh là cổng không có — cùng lập luận mà
  GAP-M1B-2 dùng cho `check-runtime-deps`.
- **Đường đo không bị cổng nuốt.** `bun run dev:timing` vẫn chạy và vẫn ra cây log sau khi cổng
  được nối. Đây là hợp đồng quan sát được của nửa (1) ĐO, và nó là nửa dễ mất nhất.
- **Ranh giới luật giữ nguyên.** Theo *Quy ước khi đọc* ở trên: quét được phép **trong cổng**, không
  bao giờ trong test; không `mock.module()`; không khẳng định kiểu "chuỗi không rỗng" hay "dài hơn
  trước" khi không có consumer phía sau.

### Xác minh

```bash
# sau khi thêm cổng, lệnh này phải có hit — trước khi thêm nó trả 0
grep -rniE 'entry.?graph|bundle.?budget|startup.?budget|graph.?cost' package.json scripts/ .github/

# đường đo phải còn nguyên sau khi thêm cổng (preload không bị nuốt)
bun run dev:timing

# cổng chính
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

Lệnh đầu là phép đo "trước khi thêm" của chính mục này (`0 hit` ở cây hiện tại): sau khi cổng đứng
thì nó phải trả về ít nhất một hit. Đó là cách duy nhất chứng minh cổng đã vào mà không cần một bài
test source-grip — vốn bị *Quy ước khi đọc* cấm.

### Cổng hoàn thành

`bun run check:ts` exit 0 ở gốc repo, **với cổng entry-graph đã nối vào**, cộng `bun run dev:timing`
vẫn chạy được.

### Rủi ro

LOW, nhưng cả ba loại dưới đây đều **thành công âm thầm** — cổng vẫn xanh, PR vẫn được merge, và
đoạt được bỏ.

1. **Baseline chụp sai thời điểm.** Chụp ở HEAD hôm nay thì cổng đỏ ngay lần chạy đầu, và phản ứng
   tự nhiên của người implementer là nới ngưỡng — tức là biến cổng thành một con số chết. Chụp quá
   muộn thì cổng bỏ lọt chính sóng port đầu tiên, tức là bỏ lọt đúng thứ nó sinh ra để bắt.
2. **Cổng nuốt preload.** Thêm cổng mà không chạy lại `dev:timing` thì mất đường đo trong im lặng,
   và GAP-M1B-5 mất nền để chứng minh cải thiện — mục sau trong chính khối này.
3. **Đưa entrypoint vào `ignorePatterns` của `.oxlintrc.json`.** Đây đúng là cái bẫy GAP-M1-19 đã
   ghi ở §0: đặt file vào danh sách bỏ qua sẽ **tắt mọi rule khác** trên chính file đó, kể cả
   những rule sinh ra để bắt chính cổng đó. Chi tiết và cách tránh nằm ở GAP-M1B-2.

### Cần người quyết

- **"Sóng port đầu tiên" trong điều kiện chụp baseline là `chord`, hay là cả sáu package?** Sổ đăng
  ký chỉ ghi «sau khi M1 merge và sau sóng port đầu tiên» và trỏ sang GAP-D13. Chụp sớm hơn thì
  cổng đỏ ngay; chụp muộn hơn thì cổng bỏ lọt sóng đầu. Mốc này phải có tên trước khi ai đặt con
  số vào file.
- **Hai smoke entry của `pi` bị loại có cần một smoke entry tương đương cho omp không?** Effort của
  mục là «2 file `.mjs` + 1 file baseline + 1 dòng trong `check:ts`» — tức là không tính smoke
  entry. Nếu cổng cần một entry riêng để đo, thì effort đó sai và phải ghi lại trước khi làm.

### Đối chiếu với kế hoạch hiện có

- **Chưa work item nào trong file này đụng chủ đề này.** `grep -rniE "entry.?graph|bundle.?budget|startup.?budget|graph.?cost" MILESTONE_1B_EXECUTION_PLAN.md`
  → 0 hit. `dev:timing`, `module-timer.ts` và `timing-buffer.ts` cũng không xuất hiện trong bất kỳ
  mục nào của sáu package.
- **Quan hệ với khối đính chính Sóng 0.5.** Cổng mà WI-ECOSYS-1 nêu («một script kiểm độ phủ
  chạy được trên danh sách package thật») và cổng ở đây **cùng hình dạng, khác đối tượng** — cái
  thứ nhất giữ cho con số 17/20 không trôi theo thời gian, cái thứ hai bắt hồi quy chi phí import
  khi port thêm package. **Không gộp và không thay nhau:** gộp sẽ ra một script làm hai việc và
  không làm được cái nào.
- **Về tiêu đề «Sóng 0.5 — ba work item cho tầng B và C».** Sổ đăng ký gán ba mục dưới đây (1, 2,
  3) vào sóng 0.5, nhưng chúng thuộc hạng mục cổng/đóng gói chứ không phải tầng B/C, nên chúng
  không nằm trong ba work item đó và con số «ba» ở tiêu đề Sóng 0.5 không đổi. Mục 5 thì rõ ràng
  **sau** sóng port, trước M2.
- **Bảng *Định nghĩa hoàn thành*** có một dòng cho mỗi package. Bốn mục này không thuộc package nào,
  nên cổng của chúng nằm ngay trong từng mục chứ không thêm dòng vào bảng đó.


---


## GAP-M1B-2 — Sáu cổng bất biến dependency/packaging: pinned-deps, runtime-deps, lockfile-commit, ts-relative-imports

**Sóng:** 0.5, ngay sau GAP-M1B-1. **Effort:** M — khoảng 1 ngày cho 4 cổng; riêng
`check-runtime-deps.mjs` là cổng đắt nhất vì nó đọc cây `package.json` và allowlist. **Phụ thuộc:**
GAP-M1B-1 (cùng sóng, chạy trước).

**Nguồn:** `pi.2`.

**Cùng lý do mục trên: là cổng bảo vệ cây port, phải có trước khi chép 21.093 dòng.** Nhưng cổng
thứ tư là **cần thiết cho chính M1B**, không chỉ cho tương lai: §Va chạm ghi 223 dòng relative
import mang `.ts` phải bỏ, và nói *"Rẻ để kiểm: sau lần quét, `grep -rn 'from "\.[^"]*\.ts"'
packages/{chord,protocol,server,client}/src` phải trả 0"*. **Một lần quét tay không giữ được sau khi
người thứ ba gửi PR.**

**Cái omp thiếu — đo được.** `package.json:90` khai đúng `"check:ts": "bun run check:tools && bun
run --filter './packages/*' --sequential --if-present check:types"` và `:91` `"check:tools": "oxlint .
&& oxfmt --check …"`. Ba thứ, **không một trong sáu cổng của `pi`**:
`grep -rn 'pinned-deps|check-pinned|check-runtime-deps|lockfile-commit|ts-relative-imports' package.json .github/ scripts/`
→ **0 hit**. Bên `pi`: `check-pinned-deps.mjs` (2.2 KB), `check-runtime-deps.mjs` (5.0 KB) + `.test.mjs`
(4.9 KB), `check-lockfile-commit.mjs` (3.9 KB), `check-ts-relative-imports.mjs` (3.3 KB).

**Hình dạng port — chép 4 script `.mjs` + 1 file test.** **KHÔNG chép** `coding-agent-consumer.mjs` và
`build-coding-agent-bundle.mjs` — chúng thuộc đường npm-bundle mà omp không dùng. Sửa: filter theo
workspace glob của omp.

**Pháp lý:** MIT cho 4 script. `coding-agent-consumer.mjs` không cần — **không chép, không phải vì
giấy phép.**

**Cái được bảo toàn — ba điều, cả ba đều là kiểu "cổng đỏ vì chính mình":**

1. **Đặt cổng ngoài `ignorePatterns` 24 dòng sẵn có của `.oxlintrc.json`.** Đưa entrypoint vào đó tắt
   **mọi** rule khác trên các file đó — đúng cái bẫy GAP-M1-19 đã ghi ở §0.
2. **`check-runtime-deps` phải fail-closed, không fail-soft.** Dependency không resolve được thì báo
   đỏ, không bỏ qua im lặng. Cổng fail-soft là cổng không có.
3. **`check-ts-relative-imports` phải chấp nhận 2 hit `.d.ts` asset import đã tồn tại** —
   `tools/browser/prelude-definition.ts:5` và `tools/computer/prelude-definition.ts:3`. Không thì
   cổng đỏ vì file của chính omp, và người implementer sẽ "sửa cho xanh" bằng cách xoá đúng hai
   import hợp lệ đó.

### File cần chạm tới

| path | kích thước | hành động | ghi chú |
| --- | --- | --- | --- |
| `scripts/check-pinned-deps.mjs` | 2.2 KB | chép rồi sửa | Filter theo workspace glob của omp. |
| `scripts/check-runtime-deps.mjs` | 5.0 KB | chép rồi sửa | Đọc cây `package.json` và allowlist — cổng đắt nhất trong bốn cái. **Fail-closed, không fail-soft.** |
| `scripts/check-runtime-deps.test.mjs` | 4.9 KB | chép rồi sửa | File test đi kèm cổng đắt nhất. Là một trong năm file của hình dạng port. |
| `scripts/check-lockfile-commit.mjs` | 3.9 KB | chép rồi sửa | Cùng bộ filter. |
| `scripts/check-ts-relative-imports.mjs` | 3.3 KB | chép rồi sửa | Phải chấp nhận **2 hit `.d.ts` asset import đã tồn tại**: `tools/browser/prelude-definition.ts:5` và `tools/computer/prelude-definition.ts:3`. |
| `package.json` | :90, :91 | sửa | Nối bốn cổng vào `check:ts` (`:90`) / `check:tools` (`:91`) — đúng hai dòng đã có sẵn đó. |
| `.oxlintrc.json` | `ignorePatterns` 24 dòng | **không sửa** | Cổng phải đứng **ngoài** danh sách này. Đưa entrypoint vào đó tắt mọi rule khác trên các file đó. |
| `scripts/coding-agent-consumer.mjs`, `scripts/build-coding-agent-bundle.mjs` | — | **bỏ** | Thuộc đường npm-bundle mà omp không dùng — **không chép, không phải vì giấy phép**. |
| `LICENSE` | hình mẫu: `packages/omptype/LICENSE` | theo M1B §1 | Giữ `Copyright (c) 2025 Mario Zechner` là dòng **đầu**, nối thêm dòng của omp. |

### Các bước

1. Đặt xử lý pháp lý trước (xem hàng cuối ở bảng trên), rồi chép 4 script `.mjs` + 1 file test vào
   `scripts/`.
2. Sửa filter trong cả năm file từ workspace glob của `pi` sang workspace glob của omp.
3. Đưa **2 hit `.d.ts`** vào allowlist của `check-ts-relative-imports` **ngay khi chép**, không
   chờ đến lần chạy đầu tiên báo đỏ. Cổng báo đỏ ngay lần chạy đầu vì hai import hợp lệ đó là cách
   nhanh nhất để dạy cả nhóm implementer rằng cổng này không tin.
4. Đặt `check-runtime-deps` ở trạng thái **fail-closed** ngay khi chép — dependency không resolve
   được là đỏ, không phải im lặng.
5. Nối bốn cổng vào `check:ts` / `check:tools` ở `package.json:90,91`, và **không** thêm bất kỳ
   file script nào vào `ignorePatterns` của `.oxlintrc.json`.
6. Bỏ `coding-agent-consumer.mjs` và `build-coding-agent-bundle.mjs` khỏi phạm vi — ghi rõ trong
   PR là bỏ có chủ đích, không phải sót.

### Hợp đồng test

Bốn cổng là script dưới `scripts/`; riêng `check-runtime-deps.mjs` có file test đi kèm ở phía
`pi` (`.test.mjs`, 4.9 KB) và file đó nằm trong hình dạng port. Ngoài file đó, hợp đồng của bốn
cổng là hợp đồng của cổng:

- **Mỗi cổng phải đỏ được.** Một cổng luôn xanh là cổng không có. Riêng `check-runtime-deps`
  được nêu thẳng: **fail-closed** — dependency không resolve được thì đỏ, không bỏ qua im lặng.
- **`check-ts-relative-imports` phải xanh trên cây hiện tại** sau khi nhận đúng 2 hit `.d.ts` đã
  biết. Đỏ ở đây nghĩa là cổng đang đòi xoá hai import hợp lệ, tức là hỏng chứ không phải nghiêm.
- File `.test.mjs` chép sang giữ nguyên ý nghĩa: nó bảo vệ hợp đồng của chính cổng đọc cây
  `package.json` và allowlist. Không `mock.module()`; không assertion kiểu "dài hơn" hay "không
  rỗng" khi không có consumer phía sau; không source-grep trong test — quét thì để ở cổng.

### Xác minh

```bash
# sau khi thêm, lệnh này phải có hit — trước khi thêm nó trả 0
grep -rn 'pinned-deps|check-pinned|check-runtime-deps|lockfile-commit|ts-relative-imports' package.json .github/ scripts/

# điều kiện của chính M1B, nay thành cổng: 223 dòng .ts phải về 0
grep -rn 'from "\.[^"]*\.ts"' packages/{chord,protocol,server,client}/src

# hai hit .d.ts phải được chấp nhận, không phải bị đòi xoá
grep -rn 'from "\.[^"]*\.ts"' packages/coding-agent/src/tools/browser/prelude-definition.ts packages/coding-agent/src/tools/computer/prelude-definition.ts

# cổng chính
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

### Cổng hoàn thành

`bun run check:ts` exit 0 **với bốn cổng đã nối**, đồng thời `grep -rn 'from "\.[^"]*\.ts"' packages/{chord,protocol,server,client}/src`
trả 0 — tức là điều kiện mà §Va chạm ghi bằng văn xuôi giờ do một cổng canh, không còn phụ thuộc
một lần quét tay.

### Rủi ro

LOW–MEDIUM. Rủi ro cơ học thấp và tự báo lại: `check:ts` bắt phần lớn việc bị bỏ sót.

1. **Cổng tự làm mình hỏng.** Ba trong ba điều kiện bảo toàn đều thuộc loại này: đặt entrypoint vào
   `ignorePatterns` tắt mọi rule khác; `check-runtime-deps` fail-soft biến cổng thành trang trí;
   `check-ts-relative-imports` không nhận 2 hit `.d.ts` sẽ đẩy người implementer xoá đúng hai import
   hợp lệ. Cả ba đều trông như "cổng đỏ, hãy sửa cho xanh" — và cả ba đều sai.
2. **`check-runtime-deps` là cổng đắt nhất** vì nó đọc cây `package.json` và allowlist, và nó là cổng
   duy nhất trong nhóm có file test chép kèm. Nếu effort trượt, đây là chỗ trượt trước — nhưng bỏ nó
   thì mất luôn cả khả năng bắt dependency hỏng.
3. **Cổng chạy trên cây chưa có sáu package** thì hỏng ngay ở `lockfile-commit` và `ts-relative-imports`
   vì chúng đọc trạng thái mà sóng port tạo ra. Đây là hệ quả của việc đặt cổng trước sóng port, và
   nó cần được nói ra trong PR chứ không phải để người sau tự khám phá.

### Cần người quyết

- **`coding-agent-consumer.mjs` và `build-coding-agent-bundle.mjs` bị bỏ vì thuộc đường npm-bundle
  mà omp không dùng.** Nếu omp sau này có đường npm-bundle, hai file này sẽ là phần đầu tiên phải
  định định lại — cần ai đó ghi nhận điều đó ở đâu đó, hay để người sau tự tìm lại?
- **Cái bẫy `ignorePatterns` của GAP-M1-19 có được xử lý bằng cấu hình, hay bằng quy ước review?**
  Cổng nằm ngoài danh sách là điều kiện bắt buộc ở cả bốn script, nhưng không có gì ngăn PR sau
  thêm entrypoint vào `.oxlintrc.json` và làm chính cổng chết.

### Đối chiếu với kế hoạch hiện có

- **§Va chạm của chính file này đã nêu đúng điều kiện cần canh.** Hàng `protocol` (8/11) ghi: sau
  lần quét bỏ 223 dòng, `grep -rn 'from "\.[^"]*\.ts"' packages/{chord,protocol,server,client}/src`
  phải trả 0. Hiện đó mới là **một lệnh ghi trong tài liệu** — không có gì chạy nó lần sau. Mục này
  biến nó thành `check-ts-relative-imports.mjs`.
- **Chỗ để nối đã có sẵn và đã được đo:** `package.json:90` (`check:ts`) và `:91` (`check:tools`).
  Không phải sáng tạo mới một lối vào CI; chỉ là thêm bốn dòng vào hai dòng đang tồn tại.
- **Không trùng với GATE 1b của `protocol`.** GATE 1b là sáu lệnh grep cơ học chạy **một lần trong
  PR** để kiểm một thay đổi hình thức file sau khi chép. Cổng ở đây chạy **mỗi lần CI** và canh
  cây, nên người thứ ba vẫn bị bắt. Hai thứ cùng tồn tại là đúng.
- **Cái bẫy `.oxlintrc.json` là của GAP-M1-19**, một mục của M1 cùng nằm trong sổ khoảng trống. Mục
  này chỉ ghi lại hệ quả của nó ở nơi sẽ xảy ra.


---


## GAP-M1B-3 — Khôi phục biến môi trường bị sandbox nuốt khi chạy binary Bun đã compile

**Sóng:** 0.5, **gộp chung PR với hai cổng kiểm** (GAP-M1B-1, GAP-M1B-2). **Effort:** S — khoảng
0,5 ngày; 40 dòng, gần như không sửa. **Phụ thuộc:** không chặn gì.

**Nguồn:** `pi.46`.

**Vì sao ở đây.** 40 dòng, không chặn gì, và là mảnh còn thiếu duy nhất của một đường mà omp **đã đo
được một nửa**. Lý do gộp, nguyên văn: *«Gộp vào sóng cổng vì cùng chạm `scripts/` + `package.json`,
và cùng là loại việc mà một PR «cổng + thứ nhỏ» chứa hợp lý hơn PR riêng»*.

**Cái omp thiếu — đúng nửa, và nửa đúng là nửa dễ hiểu sai.** omp có `readLaunchEnv()` tại
`packages/utils/src/env.ts:114`, được gọi ở `:134` → `const launchEnvValues = readLaunchEnv()`. Nó
đọc `/proc/self/environ` trên Linux **chỉ để chụp môi trường trước dotenv**. **Không có đường
khôi phục** — khi binary chạy dưới sandbox làm mất biến, omp không biết giá trị gốc để trả lại.

**Bên `pi`:** `packages/coding-agent/src/bun/restore-sandbox-env.ts` (**36 dòng**, `wc -l` đã đo) +
`sandbox-env-setup.ts` (**4 dòng**).

**Hình dạng port — chép nguyên văn 2 file, dán vào `packages/utils/src/env.ts`**, nơi `readLaunchEnv`
đã sống, **không tạo thư mục `bun/` mới** — omp không có khái niệm `src/bun/` (đã kiểm:
`packages/coding-agent/src/bun` không tồn tại). Thư mục `src/bun/` của `pi` còn `cli.ts` và
`runtime-setup.ts` nữa; **không chép hai file đó**.

**Pháp lý:** MIT, không dính exclusion. Chép nguyên văn, giữ dòng Zechner.

**Cái được bảo toàn — hai điều kiện trên cùng một đường:**

1. **Phải chỉ chạy khi cờ tương đương `BPI_EXECVE` thực sự hiện diện.** Trên macOS và Windows không
   có `/proc/self/environ` — nhánh phải là **no-op**, không phải throw. Một PR "40 dòng" mà làm
   hỏng startup trên hai sàn là thảm họa.
2. **Phải chạy TRƯỚC dotenv, không phải sau.** Chạy sau là vô nghĩa: dotenv đã ghi đè rồi, khôi phục
   ở đó là khôi phục giá trị sai.

### File cần chạm tới

| path | kích thước | hành động | ghi chú |
| --- | --- | --- | --- |
| `restore-sandbox-env.ts` (phía `pi`: `packages/coding-agent/src/bun/`) | 36 dòng | chép nguyên văn | Dán vào `packages/utils/src/env.ts`, nơi `readLaunchEnv` đã sống. **Không tạo thư mục `bun/` mới** — `packages/coding-agent/src/bun` không tồn tại. |
| `sandbox-env-setup.ts` (cùng thư mục phía `pi`) | 4 dòng | chép nguyên văn | Cùng đích. Phải chạy **TRƯỚC dotenv**; chạy sau là khôi phục giá trị sai. |
| `packages/utils/src/env.ts` | :114, :134 | sửa | `readLaunchEnv()` ở `:114`, lời gọi ở `:134`. Đây là nơi hai file trên được dán vào. |
| `cli.ts`, `runtime-setup.ts` (phía `pi`, cùng thư mục `src/bun/`) | — | **bỏ** | `src/bun/` của `pi` còn hai file này nữa; **không chép**. |
| `LICENSE` | hình mẫu: `packages/omptype/LICENSE` | theo M1B §1 | MIT, không dính exclusion. Giữ dòng Zechner. |

### Các bước

1. Đặt xử lý pháp lý trước, rồi chép nguyên văn 2 file (36 + 4 dòng) vào
   `packages/utils/src/env.ts`. Không tạo `packages/coding-agent/src/bun/`.
2. Nối vào đúng vị trí: sau khi `readLaunchEnv` được gọi ở `:134`, và **trước** dotenv. Ghi thứ tự
   này thành chú thích tại call site, vì đó là điều kiện dễ bỏ sót nhất của mục này.
3. Giữ nguyên cờ `BPI_EXECVE` và nguyên tắc **no-op trên macOS/Windows** — nhánh không có
   `/proc/self/environ` phải trả về im lặng, không throw. Đây là điều kiện khởi động, không phải
   điều kiện tiện lợi.
4. Không chép `cli.ts` và `runtime-setup.ts` từ `src/bun/` của `pi`.
5. Chạy lại đường hiện có quanh `readLaunchEnv` để chắc là chỉ có thêm phục hồi, không có thay đổi
   hành vi quan s được của việc chụp môi trường trước dotenv.

### Hợp đồng test

Không có file test nào đi kèm ở phía `pi` cho hai file này, và mục này **làm mới không** — nó dán hai
file nguyên văn vào một module đã có sẵn. Hợp đồng quan s được, theo thứ tự:

1. **Nhánh không phải Linux là no-op, không phải lỗi.** Chạy trên sàn không có `/proc/self/environ`
   thì hàm phải trả về im lặng. Đây là điều kiện khởi động; một regression ở đây làm hỏng omp trên
   macOS và Windows chứ không làm hỏng một tính năng.
2. **Thứ tự trước/sau dotenv là quan s được.** Khôi phục chạy sau dotenv thì trả về **giá trị sai**
   một cách âm thầm — không throw, không cảnh báo. Vì vậy bất kỳ khẳng định nào ở đây đều phải
   chứng minh **giá trị cuối cùng quan s được sau dotenv**, không chỉ khẳng định hàm được gọi.
3. Không `mock.module()`; không biến đột `process.platform` ở cả file test — dùng `vi.spyOn` kèm
   `vi.restoreAllMocks()` trong `afterEach`, đúng luật *Quy ước khi đọc* của tài liệu này.

### Xác minh

```bash
# nơi hai file được dán vào, và thứ tự quanh dotenv
grep -n 'readLaunchEnv\|launchEnvValues' packages/utils/src/env.ts

# phải KHÔNG có thư mục src/bun/ mới trong coding-agent
ls -d packages/coding-agent/src/bun

# dòng Zechner phải nằm ĐẦU
head -4 <file LICENSE sau khi tạo>

# cổng chính
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

Lệnh thứ hai là phép đo "phần được bảo toàn" của mục này chạy được như một kiểm: nó phải **thất bại**
sau khi port, vì thư mục đó không được tạo ra.

### Cổng hoàn thành

`bun run check:ts` exit 0, **và** startup chạy được trên cả ba sàn — riêng điều kiện thứ hai mới là
thứ phân biệt một bản chép đúng với một bản chép làm hỏng hai sàn.

### Rủi ro

LOW về cỡ, MEDIUM về hậu quả — đây là mục nhỏ nhất trong bốn cái nhưng đáng sợ nhất về kiểu lỗi.

1. **Nhánh không-Linux ném thay vì no-op** là thảm họa được ghi thẳng trong sổ đăng ký. Triệu chứng
   sẽ là omp không khởi động trên macOS và Windows — trên chính hai sàn người dùng chạy hằng ngày —
   trong khi Linux vẫn xanh hoàn toàn vì đường đó có thật.
2. **Chạy sau dotenv** không nổ và không ai thấy: kết quả là biến bị ghi đè, rồi "khôi phục" lại
   chính giá trị sai. Đây là loại lỗi mà sẽ sống lâu hơn cả PR.
3. **Dán nhầm chỗ.** Dễ nhất là tạo `packages/coding-agent/src/bun/` cho khớp `pi` — đúng cái mục
   này ghi là phải tránh, vì omp không có khái niệm `src/bun/`.

### Cần người quyết

- **Cờ `BPI_EXECVE` được giữ nguyên tên hay đổi sang tên của omp?** Sổ đăng ký yêu cầu chạy "khi cờ
  tương đương `BPI_EXECVE` thực sự hiện diện" — nghĩa là giữ **hành vi**, còn tên cờ thì chưa có mặc
  định. Giữ tên giúp diff với `pi` sạch; đổi tên giúp đọc dễ hơn. Không có gì trong cây omp hiện đọc
  cờ này.
- **Mục này gộp vào PR cổng, hay tách PR riêng?** Sổ đăng khi nêu lý do gộp («một PR «cổng + thứ
  nhỏ» chứa hợp lý hơn PR riêng»), nhưng nó cũng là thứ duy nhất trong bốn mục **không** cùng chạm
  `scripts/` + `package.json` — nó sửa `packages/utils/src/env.ts`. Người đọc diff sẽ thấy một PR
  cổng mang theo một sửa đường khởi động.

### Đối chiếu với kế hoạch hiện có

- **Không va chạm với mục nào trong sáu package.** `readLaunchEnv` (`packages/utils/src/env.ts:114`)
  và lời gọi ở `:134` không xuất hiện trong bảng va chạm nào của tài liệu này, và không mục package
  nào chạm `packages/utils/src/env.ts`.
- **Quan hệ với luật worker của AGENTS.md.** Tài liệu này đã dùng đường `workerHostEntry()` khi bàn
  worker ở §1, và mục này nằm trên **cùng một đường khởi động**: binary đã compile chạy dưới
  sandbox. Nó không sửa quyết định worker nào — nó chỉ khôi phục biến môi trường mà
  `readLaunchEnv` đã chụp được trước đó.
- **Nó là mảnh còn thiếu của một đường đã có nửa.** Đây là lý do nó đứng ở M1B chứ không phải ở
  M6 hay M7: phần đọc đã có, phần khôi phục thì chưa, và phần đọc mà không có phần khôi phục thì
  chỉ là "chụp rồi quên".


---


## GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import

**Sóng:** **sau sóng port, trước M2.** **Effort:** M — khoảng 1,5 ngày. **Phụ thuộc:** GAP-M1B-1 —
**cứng**, không có nó thì không chứng minh được cải thiện.

**Nguồn:** `pi.4` + `pi.53` (gộp).

**Phải đứng sau sóng port** vì M1B đang thêm 6 package mới vào cùng module graph — mỗi package thêm
làm chi phí import lúc khởi động nặng thêm. Cùng lý do với GAP-M1B-1: **cổng đo phải tồn tại trước
khi tối ưu**, không thì không biết cải thiện có thật không.

**Cái omp thiếu — đo được, và đây là hệ quả quan sát được.** omp nạp **toàn bộ** provider vào cùng
module graph tĩnh. `packages/ai/src/stream.ts` value-import trực tiếp:

- `:29` `import { streamGitLabDuo } from "./providers/gitlab-duo"`
- `:30` `import { …, streamGitLabDuoWorkflow } from "./providers/gitlab-duo-workflow"`
- `:32` `import { getVertexAccessToken } from "./providers/google-auth"`
- `:35` `import { streamKimi } from "./providers/kimi"`

Nghĩa là **mở omp bằng provider nào cũng vẫn nạp code GitLab Duo, Kimi và Google auth**.
`register-builtins` cũng value-import hơn 12 provider.

Kỹ thuật lazy-loading **CÓ SẴN** trong omp — nhưng chỉ dùng cho OAuth registry/hooks
(`api-registry.ts` + `getCustomApi`), **không dùng cho wire transport**. Đó là khoảng cách thật, không
phải thiếu kỹ thuật.

**Hình dạng port — LÀM MỚI, không chép.** Không có tệp nào ở `pi` để chép cho riêng mảng này — đây là
chỗ omp nên làm khác. Hình dạng: một `PROVIDER_TRANSPORTS` registry value → `() => import(...)` per
provider, đọc tại `stream.ts` **sau khi provider đã resolve**.

> Lưu ý phong cách: `AGENTS.md` **cấm** inline import (`await import()`, `import("pkg").Type` trong
> vị trí kiểu). Mục này là ngoại lệ có chủ đích và phải được ghi vào `AGENTS.md` cùng lúc — nếu
> không, một reviewer sẽ báo vi phạm và đóng PR. Đề xuất: dùng đúng một chỗ tập trung (`registry.ts`)
> để phạm vi ngoại lệ là **một file**, không phải `stream.ts`.

**Pháp lý:** không chép gì từ `pi` (làm mới) → **không có nghĩa vụ attribution**. Nếu sau này tham
chiếu pattern lazy của `pi` thì vẫn MIT.

**Phụ thuộc — cứng.** GAP-M1B-1 (cổng entry-graph): không có nó thì **không chứng minh được cải
thiện**, và một PR tối ưu không kèm phép đo là một PR không kiểm chứng được. Suy làm **sau khi M1B
port xong**, để một lần đo bao hết thay đổi thay vì đo nhiều lần trên nền đang chuyển động.

**Cái được bảo toàn.** Hành vi wire phải **giống hệt**: cùng tập provider, cùng error surface. Và
điều kiện âm bắt buộc: **provider không được biến mất lúc runtime chỉ vì lazy import thất bại** — lỗi
phải **nêu đúng tên provider**, không phải `Cannot find module`. Đó là khác biệt giữa một tối ưu
và một lỗi.

### File cần chạm tới

| path | vị trí | hành động | ghi chú |
| --- | --- | --- | --- |
| `registry.ts` | file MỚI, một chỗ tập trung duy nhất | tạo mới | `PROVIDER_TRANSPORTS` registry value → `() => import(...)` per provider. **Đề xuất của sổ đăng ký: phạm vi ngoại lệ của luật cấm inline import là file này**, không phải `stream.ts`. |
| `packages/ai/src/stream.ts` | :29, :30, :32, :35 | sửa | Bốn value-import cụ thể: `streamGitLabDuo`, `streamGitLabDuoWorkflow`, `getVertexAccessToken`, `streamKimi`. Chỉ đọc registry **sau khi provider đã resolve**. |
| `register-builtins` | — | sửa | Cũng value-import hơn 12 provider. |
| `api-registry.ts` + `getCustomApi` | — | giữ nguyên, tham chiếu | Kỹ thuật lazy-loading omp **đã có** ở đây (OAuth registry/hooks) — chỉ chưa dùng cho wire transport. Đây là mẫu trong cây, không phải thứ phải chép. |
| `AGENTS.md` | mục cấm inline import | sửa, **cùng lúc với code** | Ghi ngoại lệ có chủ đích. Không ghi thì một reviewer sẽ báo vi phạm và đóng PR. |
| `LICENSE` / attribution | — | **không có** | Làm mới, không chép gì từ `pi` → không có nghĩa vụ attribution. Nếu sau này tham chiếu pattern lazy của `pi` thì vẫn MIT. |

### Các bước

1. **Chờ M1B port xong và GAP-M1B-1 có baseline.** Một lần đo bao hết thay đổi; đo trên nền đang
   chuyển động thì con số không đọc được.
2. Ghi ngoại lệ vào `AGENTS.md` **cùng lúc** với code, không phải sau. Ghi tên file cụ thể được miễn
   (`registry.ts`) để phạm vi ngoại lệ là **một file**.
3. Tạo `PROVIDER_TRANSPORTS` với `() => import(...)` per provider — value registry, đọc tại
   `stream.ts` **sau khi provider đã resolve**, không phải trước.
4. Bỏ bốn value-import ở `packages/ai/src/stream.ts:29,30,32,35`, và xử lý `register-builtins` (hơn
   12 provider) theo cùng cách.
5. Bọc lỗi lazy import: provider không resolve được phải **nêu đúng tên provider**, không phải
   `Cannot find module`. Đây là điều kiện âm, và nó là thứ phân biệt tối ưu với lỗi.
6. Đo lại bằng cổng của GAP-M1B-1 và đối chiếu với baseline.

### Hợp đồng test

Mục này **làm mới**, nên không có file test nào để chép — hợp đồng phải được viết, và nó có hai vế
đối nghịch nhau:

1. **Hợp đồng tích cực — hành vi wire giống hệt.** Cùng tập provider, cùng error surface. Provider
   nào chạy được trước khi lazy thì phải chạy được sau, với cùng kết cục quan s được.
2. **Hợp đồng âm bắt buộc — provider không được biến mất lúc runtime.** Khi lazy import thất bại,
   lỗi phải **nêu đúng tên provider**, không phải `Cannot find module`. Đây là điều kiện có tên trong
   sổ đăng ký, và nó là thứ tách một tối ưu khỏi một lỗi: một tối ưu làm omp nhanh hơn, một lỗi ở
   đây làm provider biến mất vào một thông báo không truy ngược được.
3. Cùng luật chung của tài liệu: không `mock.module()`; khỏi động lại registry trong `afterEach`
   bằng `vi.restoreAllMocks()` thay vì đột biến trạng thái ở cả file.

### Xác minh

```bash
# trước: bốn value-import này nạp code không liên quan lúc import
grep -n 'providers/gitlab-duo\|providers/gitlab-duo-workflow\|providers/google-auth\|providers/kimi' packages/ai/src/stream.ts

# sau khi tách, phạm vi ngoại lệ phải là MỘT file, không phải stream.ts
grep -rn '() => import(' packages/ai/src

# kỹ thuật lazy có sẵn ở tầng OAuth, dùng làm mẫu — không phải thứ phải chép
grep -rn 'getCustomApi' packages/ai/src

# cổng đo của GAP-M1B-1 — một lần đo bao hết thay đổi
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

### Cổng hoàn thành

`bun run check:ts` exit 0 **và** cổng entry-graph của GAP-M1B-1 chạy với con số tốt hơn baseline —
hai vế là một, vì PR tối ưu không kèm phép đo là PR không kiểm chứng được.

### Rủi ro

MEDIUM — không phải vì việc viết code khó, mà vì cả hai hướng đều hỏng âm thầm.

1. **Đo trên nền đang chuyển động.** Đây là lý do mục phải đứng sau sóng port. Sáu package mới đang
   được thêm vào cùng module graph, nên một phép đo giữa chừng không đọc được thành gì cả.
2. **Provider biến mất lúc runtime.** Điều kiện âm duy nhất được ghi tên trong sổ đăng ký. Nếu lỗi
   lazy import nổi lên dưới dạng `Cannot find module`, người dùng thấy một provider biến mất chứ
   không thấy một lỗi import — và không có cách nào đoán ra từ thông báo.
3. **Ngoại lệ lan ra.** Nếu `() => import(...)` chảy vào `stream.ts` và các file khác, phạm vi ngoại
   lệ của luật AGENTS.md trở thành toàn bộ `packages/ai`, và lần review sau sẽ không còn ý nghĩa
   gì. Vì vậy một chỗ tập trung (`registry.ts`) là đề xuất, không phải sở thích.
4. **Cải thiện không đo được** thì mục này thành một refactor không có lý do. Đó là hình dạng fail
   của cả GAP-M1B-1 lẫn mục này, và cả hai đều đã ghi.

### Cần người quyết

- **Phạm vi ngoại lệ của luật cấm inline import có được ghi vào `AGENTS.md` không, và ghi ở đâu?**
  Đề xuất của sổ đăng ký là ghi rõ một file tập trung (`registry.ts`) để ngoại lệ có giới hạn đo
  được. Ghi chung chung "lazy import được phép ở provider" thì lần review sau không còn cách phán
  đoán.
- **Có đo entrypoint nào ngoài `src/cli.ts` không?** GAP-M1B-1 sửa danh sách entry sang
  `packages/coding-agent/src/cli.ts` + các worker selector. Tối ưu này nằm ở `packages/ai`, nên
  cần biết con số của nó sẽ xuất hiện trong cùng một báo cáo hay phải có entry riêng.

### Đối chiếu với kế hoạch hiện có

- **Chưa work item nào trong file này đụng `packages/ai/src/stream.ts` hay `register-builtins`.** Sáu
  package của đợt migrate không chạm `packages/ai`; bảng va chạm của tài liệu không có hàng nào cho
  module graph của provider.
- **Nó là hệ quả trực tiếp của chính đợt port.** M1B thêm 6 package vào cùng module graph, và mỗi
  package thêm làm chi phí import lúc khởi động nặng thêm — cùng lý do khiến GAP-M1B-1 phải đứng
  trước mọi sóng port. Ở đây chiều ngược lại: cổng đo đứng trước, tối ưu đứng sau.
- **Nó không sửa quyết định kỹ thuật nào đã chốt trong tài liệu này.** Mục chỉ đổi *khi nạp* code
  provider, không đổi provider nào tồn tại, không đổi hợp đồng wire, và không đụng bất kỳ va chạm
  nào ở mục *Va chạm với thứ omp đã có*.
- **Nó là mục duy nhất trong bốn cái không chép gì.** Ba mục kia đều là chép rồi sửa và đều có nghĩa
  vụ attribution; mục này là làm mới, nên PR của nó không kèm dòng ghi công nào.


---


## Bảng quyết định cần bạn chốt

Đây là bảng hợp đồng của cả đợt migrate. **8 hàng `durable` còn nằm trong bảng là tài liệu tham khảo, không phải việc phải làm** — xem mục 5. Mỗi dòng là **một câu hỏi mở** lấy nguyên văn từ
`m1b-index/questions.json` — 33 câu, trải trên bảy package (chord 6, protocol 1, server 1, client 6,
durable 8, telemetry 6, evals 5). Bảng được sắp theo mức chặn: **nhóm A** là câu quyết định về *thứ tự*
hoặc *có hợp nhất hai bản sao hay không* — loại câu mà không có thì cả đợt chưa bắt đầu được;
**nhóm B** là câu chỉ chặn một bước về sau, theo đúng thứ tự migrate (chord → protocol → server →
client → telemetry → evals).

Cột **mặc định** chỉ ghi những gì chính câu hỏi đã nêu. Khi câu hỏi không nêu mặc định, dòng đó ghi
**"chưa có mặc định — cần bạn quyết"**; không suy diễn. Một vài dòng có câu hỏi gộp nhiều quyết định
nhỏ (protocol, server, durable #15) — chúng được tách bằng các mục (a)(b)(c) ngay trong ô.

Dòng được đánh dấu **⟨đảo ngược cao nhất⟩** là câu hợp nhất `JsonValue`/`isJsonValue` vào `pi-utils`:
nó là duy nhất trong 33 câu mà quyết định lại thì mọi dòng import của bốn package anh em cùng đổi, và
sau khi chúng đã đứng trong cây thì việc gỡ ra lại tốn hơn hẳn lúc chép.

| package | câu hỏi | vì sao nó chặn | mặc định nếu không trả lời |
| --- | --- | --- | --- |
| `durable` | **A1.** `chord` phải ra trước `durable`: 52 import vào `@oh-my-pi/chord` chưa tồn tại ở omp. Đo lại `src/` + `test/`: durable import **15 symbol phân biệt**, nhiều hơn con số 8 trong câu hỏi và nhiều hơn danh sách 12 tên nêu trước đó — `BACKGROUND_CONTEXT`, `Change`, `Context`, `Draft`, `JsonValue`, `Op`, `Prepared`, `Tracker`, `apply`, `applyImmutableBatches`, `awaitWithContext`, `copyJson`, `track`, `withAbortSignal`, `withoutAbortSignal`. Ba tên bị sót (`Change`, `Prepared`, `Tracker`) đều đến từ `src/session/transaction.ts:2` qua subpath `@earendil-works/chord/delta`. Vì vậy `chord` phải giữ **cả ba** subpath: `.`, `./context` (41 lần dùng) và `./delta` (17 lần trong `.ts` — 9 ở `agent`, 8 ở `durable`). Bao giờ `durable` chuyển được? | Quyết định thứ tự của cả đợt: `durable` đứng vị trí 5 trong lịch nhưng không bắt đầu được nếu `chord` (vị trí 1) chưa có mặt. Khớp đúng chu kỳ pi. `./delta` mới là thứ khiến 3 tên bị sót, và hiện **chưa dòng nào trong bảng yêu cầu giữ nó**. | **Không phải quyết định mở — ràng buộc đã chốt:** `durable` chỉ migrate sau `chord`, và `chord` phải xuất cả `./context` lẫn `./delta`. |
| `chord` | **A2. ⟨đảo ngược cao nhất⟩** Có muốn một `JsonValue`/`isJsonValue` dùng chung trong `@oh-my-pi/pi-utils` để thay sáu định nghĩa sẵn có cộng hai cái của `chord` (va chạm #2 và #3) không? | Là câu "có hợp nhất hai bản sao hay không". Phân kỳ có thật: `packages/coding-agent/src/secrets/obfuscator.ts:72` thừa nhận `\| undefined` ở nhánh object, các bản khác thì không; `packages/ai/src/judgment/types.ts:17` dùng biến thể `readonly`. | **Không hợp nhất trong đợt này** — cả bốn package anh em import bản của `chord` và đang nhất quán với nhau. Dọn phân kỳ này là một hạng mục riêng, có chủ. |
| `protocol` | **A3.** (a) Giữ `typebox@1.3.27` hay port `protocol.ts` sang `@oh-my-pi/omptype/typebox`? (b) Phụ thuộc `chord` còn sống không, và `isJsonValue`/`JsonValue` đặt ở `@oh-my-pi/chord` hay subpath `/json`? (c) Có route `packages/coding-agent/src/live/attestation.ts` qua encoder mới không? (d) Tên `pi-protocol` đúng chưa, và có cần câu phân định trong README không? (e) Chấp nhận cặp tên gần trùng `ProtocolError` (type) / `ProtocolValidationError` (class) hay đổi? | (a) **BLOCKING cho step 4** và bốn spec khác thừa kế — chặn `protocol` → chặn `server` → chặn 8/33 test của `client`. (b) Quyết định vị trí một lần cho cả đợt thay vì bảy lần. (c) Rủi ro/lợi ích, không có rào cản kỹ thuật. (d) Không mơ hồ — `@oh-my-pi/pi-protocol` là chuẩn, chỉ cần câu phân định. (e) Đổi tên sau khi `server`/`client` đã đứng là gấp 10 lần công. | (a) **chưa có mặc định — cần bạn quyết** (spec *khuyến nghị* `@oh-my-pi/omptype/typebox`; escape hatch: nếu `bun run check:ts` bác `StrictObject` thì rơi về typebox và ghi lý do — đừng thiết kế lại schema để vừa). (b) Giữ phụ thuộc `chord`; vị trí subpath (root vs `/json`) **chưa có mặc định — cần bạn quyết**. (c) **Không** route `attestation.ts` — ba lý do đo được sẽ ghi vào README. (d) Giữ `@oh-my-pi/pi-protocol` + câu phân định trong README cả hai bên. (e) **chưa có mặc định — cần bạn quyết** (spec giữ verbatim; phải xác nhận trước PR). |
| `server` | **A4.** (a) `SessionMetadata` đặt ở đâu? (b) Cả đợt có đặt tên lớp re-export `Context` không? (c) Có rebase `pi.session-management`/`pi.session-directory` sang namespace `omp.*` không? (d) `typebox` vào catalog hay `pi-protocol` port sang `omptype`? (e) `test/unix.test.ts` `fork()` có chạy dưới shim `node:child_process` của Bun không? (f) Hai barrel `index.ts` giữ named re-export hay đổi sang `export *`? | (a) **BLOCKING** — owner phải chọn trước step 4 vì nó đổi danh sách dependency trong `package.json`; nó là bound chung của `ServerHost`/`Server`/`SessionRouter`/`createUnixServer` và không tồn tại ở đâu trong omp. (b) Quyết định kiến trúc ảnh hưởng 4 repoint của step 10. (c) 4 chuỗi id; routing của `pi-server` id-agnostic nên nửa server không quan tâm. (d) Kế thừa câu (a) của `protocol` — mỗi `Static<typeof XSchema>` là chiếu kiểu biên dịch trên schema runtime. (e) GATE 2 hiện chưa chạy được nên điều này **chưa được kiểm chứng**. (f) Đổi sang `*` sẽ mới export `@internal` `UnixByteConnection`, tức mở rộng API công khai. | (a) **chưa có mặc định — cần bạn quyết** (spec khuyến nghị khai 6 trường cục bộ trong `packages/server/src/types.ts` để package đứng được độc lập). (b) Trỏ thẳng `@oh-my-pi/chord/context` — câu này **không chặn**. (c) Để nguyên `pi.*` (cố ý không nằm trong `scope_rewrites`); đi theo quyết định namespace sau này. (d) **chưa có mặc định — cần bạn quyết** (kế thừa `protocol`). (e) **chưa có mặc định — cần bạn quyết**; nếu `fork` hỏng thì thay fixture bằng `createServer()` in-process. (f) Giữ named re-export và nêu lệch lệch trong PR. |
| `durable` | **A5.** HEAD `pi-ref` (d6af72e) có 12 package: omp trùng tên 4 (`agent`, `ai`, `coding-agent`, `tui`), khác tên 8. Task ghi 7 — 8 là đúng **nếu** tính `session-backends/sqlite-node` là package riêng (`@earendil-works/pi-session-backend-sqlite-node`, phụ thuộc `durable`). Xác nhận 7 hay 8? | Chốt phạm vi cả đợt trước khi kế hoạch chung chốt — 7 hay 8 quyết định có thêm một package vào `workspaces.catalog` và một mắt xích nữa vào đồ thị phụ thuộc. | **chưa có mặc định — cần bạn quyết** (7 hay 8). |
| `chord` | **B1.** Câu hỏi drain của M1 W2 cần owner quyết, **không phải** của đợt này. Bốn vòng drain hiện có (`packages/coding-agent/src/session/agent-session.ts:4983`, `:5218`, `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112`, `packages/coding-agent/src/extensibility/extensions/runner.ts:1347`) — chuyển sang thiết kế log-and-continue của W2, để nguyên, hay **hợp nhất theo hướng throwing của `chord`**? | Là tiền đề bị bác: `drainDisposers` không tồn tại trong omp và bốn vòng vẫn là `for (const dispose of this.#X.splice(0)) dispose();` thuận thứ tự, không try/catch. Giờ `chord` đã trong cây, sẽ có người muốn "hợp nhất hai bên", và hợp nhất **phải đi theo hướng ngược với vẻ ngoài** (về W2, không về `chord`). | **Để bốn vòng nguyên trạng** — W2 giữ (bằng chứng nghiêng về phía W2 về tính đúng đắn: nó bảo vệ `saveDraft`); đợt này cố ý không đụng tới. Hướng hợp nhất nếu có là **về W2**. |
| `chord` | **B2.** 7 file benchmark (`test/delta-traversal.bench.ts` + **6** file dưới `test/delta-benchmark/`: `benchmark.ts`, `benchmark.worker.ts`, `conversation-view-benchmark.ts`, `conversation-view-benchmark.worker.ts`, `memory-benchmark.ts`, `memory-benchmark.worker.ts`) và `PLANNING.md` (41.634 byte) — tổng cộng **8 mục** — chép ở follow-up không? | Bỏ cả 8 thì phải quyết định có nhặt lên hay để mục ruỗng trong cây nguồn; nhặt thì còn phải **dời chỗ** (layout của omp đặt benchmark ở thư mục `bench/` cấp cao, ví dụ `packages/omptype/bench/`) và chuyển từ API bench của vitest sang `bun bench`. | **Bỏ cả 8 trong đợt này** (spec này bỏ) — nếu nhặt thì để follow-up. |
| `chord` | **B3.** `TODO_CONTEXT` (`src/context/index.ts:56`) đặt tên theo một TODO trong cây nguồn và được export. Giữ nguyên chữ, hay đổi thành tên có nghĩa ngay bây giờ? | Đổi tên an toàn — không package nào ngoài import nó, và không anh em nào trong sáu package dùng hằng `Context` theo tên. Nhưng đổi tên làm diff với `pi` về sau không sạch. | **Giữ nguyên `TODO_CONTEXT`** (thiên về giữ, để diff với `pi` sạch). |
| `chord` | **B4.** `test/delta-tracker/retention.worker.ts` chạy bằng `spawnSync` chứ không spawn `Worker`. Yêu cầu `declareWorkerHostEntry` / dispatch-table của `AGENTS.md` viết cho worker production đi lại `cli.ts` có áp dụng cho fixture `bun:test` này không? | **Không có `Worker` nào ở đây.** `grep -rn "new Worker" test/ src/` trong `packages/chord` → **no match**. `retention.worker.ts` là script tiến trình con, chạy bằng `spawnSync(process.execPath, ["--expose-gc", <path>, scenario], { encoding: "utf8", timeout: 60_000 })` từ `test/delta-tracker/retention.test.ts:24-27` — 14 scenario, timeout `it.each` 65_000. Quy tắc `declareWorkerHostEntry` của `AGENTS.md` viết cho worker production nên **không áp dụng**; rào cản thật khi port là `spawnSync` + cờ `--expose-gc`. | **Port nguyên văn sang `bun:test`, giữ `spawnSync` + `--expose-gc`** — cờ đó là điều kiện để assert WeakRef được thu (`retention.worker.ts` tự `assert.ok(global.gc, "worker requires --expose-gc")`), và Bun expose `global.gc` dưới nó. |
| `chord` | **B5.** `test/boundary.test.ts` duyệt package và khẳng định không specifier phạm vi upstream nào chạm tới entry đã publish. Xác nhận nó qua được luật "no source-grep"? | **VI PHẠM `AGENTS.md` — "Never source-grep".** `test/boundary.test.ts` (34 dòng) đọc text **mọi** file `.ts` dưới `src/` (`readdir(..., {recursive:true})` + `readFile(file, "utf8")`) rồi chạy `source.matchAll(IMPORT_SPECIFIER)` với `IMPORT_SPECIFIER = /(?:import\|export)\s+(?:type\s+)?(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/gu` và assert `expect(violations).toEqual([])`. Không có lời gọi resolution nào (`require.resolve`, `import.meta.resolve`, `Bun.resolveSync` đều vắng). Đó là quét văn bản, không phải kiểm tra resolution. | **Không chép nguyên văn.** Thay bằng kiểm tra resolution thật (vd `Bun.resolveSync` / `import.meta.resolve` trên từng specifier sau khi `bun build` cây import) hoặc bỏ hẳn và dựa vào `oxlint` + type test cấm value-import scope upstream — đúng hai cách mà `AGENTS.md` gọi tên cho ràng buộc cấu trúc. |
| `client` | **B6.** `test/unix.test.ts` **không** import subpath nào của `pi-server` — nó import thẳng `src/` của package anh em bằng đường dẫn tương đối (`unix.test.ts:8-10`): `../../server/src/server.ts`, `../../server/src/testing/host.ts`, `../../server/src/transports/unix/listener.ts`. Exports map thật của `pi-server` chỉ có `.`, `./testing`, `./unix` (→ `dist/transports/unix/index.js`) — không có `./testing/host` lẫn `./transports/unix/listener`. Câu hỏi thật: `server` có xuất hai subpath đó ra ngoài không, hay port test giữ nguyên đường dẫn tương đối? | Phải chốt với spec `server` **trước khi xếp lịch `client`**, nhưng quyết định barrel của A4(f) **không** giải quyết được câu này: gộp hay không gộp thì đường dẫn tương đối vẫn là thứ duy nhất resolve được. | **Giữ nguyên đường dẫn tương đối** — nó không đòi thêm export công khai nào. |
| `client` | **B7.** Controller `RemoteSession` của `coding-agent` phía pi (`packages/coding-agent/src/client/index.ts` cùng `src/experimental/client-runtime.ts` và `src/experimental/services/connection.ts`) để sau, hay nằm trong phạm vi spec `coding-agent` re-export package này thành `@oh-my-pi/pi-coding-agent/client`? | Package `client` phía pi **vô dụng nếu thiếu nó**, nên nếu spec `coding-agent` không nhận, đợt migrate này ship một package không ai dùng. | **chưa có mặc định — cần bạn quyết** (quyết định thuộc spec `coding-agent`, phải được ghi ở đó chứ không ở đây). |
| `client` | **B8.** Bốn package pi bản `0.87.1` mà đợt này chạm tới đều ghim `engines.node >=22.19.0`, còn omp ghim `engines.bun >=1.3.14`. `unix.ts` là chỗ duy nhất có thể bị (node:net, node:fs/promises, `.unref()`/`.drain()` của socket). Xác nhận Bun đích hỗ trợ `NodeJS.Timeout` như một kiểu và `fork()` chạy được dưới `bun test`? | **Đã đo 2026-09-28 trên Bun 1.3.14: `fork()` từ `node:child_process` chạy được dưới `bun test`** — probe dựng nguyên xi `test/fixtures/stale-socket-server.mjs` (`.mjs`, truyền bằng `new URL(..., import.meta.url)`, stdio `["ignore","ignore","inherit","ipc"]`) → `1 pass / 0 fail / 2 expect() calls`; cả ba hành vi đều xanh: child gửi được IPC `"listening"`, `lstat(path).isSocket()` trả `true`, `child.kill("SIGKILL")` + `once(child,"exit")` hoàn tất. Vế `NodeJS.Timeout` thì vô nghĩa ở đây: `packages/client` có **0** chữ `NodeJS.Timeout`; `unix.ts:247` khai `ReturnType<typeof setTimeout>` rồi gọi `.unref()` ở `:256`. **Không chặn** phần socket của `client`. | **Port nguyên văn `test/unix.test.ts`** (8 test) sang `bun:test`; đổi `vitest` → `bun:test` và giữ nguyên `fork`. Đính kèm probe đã chạy để người sau không phải đo lại. |
| `client` | **B9.** Bốn file bị bỏ (`tsconfig.build.json`, `tsconfig.test.json`, `vitest.config.ts`, `CHANGELOG.md`) ghi là skip cố ý trong mô tả PR, hay bỏ im lặng là chấp nhận được? | Reviewer diff với `pi` sẽ thấy thiếu 4 file và có thể đọc là tai nạn. | **Ghi rõ là bỏ có chủ đích trong PR** (spec cố ý bỏ). |
| `client` | **B10.** Hai `@earendil-works/pi-ai` và một mỗi `@earendil-works/pi-telemetry` / `@earendil-works/pi-agent-core` chỉ nằm trong `tsconfig.test.json` của pi, mà spec này xoá — nên 4 chuỗi scope đó không cần viết lại. **Ngoài 4 chuỗi đó, `@earendil-works/pi-protocol` xuất hiện 12 lần và PHẢI viết lại thành `@oh-my-pi/pi-protocol`** — 8 lần nằm trong `src/` và `test/` (`src/errors.ts`, `src/connection.ts`, `src/types.ts`, `src/client.ts`, `src/unix.ts`, `test/support.ts`, `test/unix-transport.test.ts`, `test/client.test.ts`), 4 lần còn lại ở `package.json`, `tsconfig.build.json`, `vitest.config.ts`, `tsconfig.test.json`. `@earendil-works/chord` (6 lần, 5 file) cũng phải viết lại. Xác nhận việc xoá `tsconfig.test.json` là cố ý, để không ai sau này grep chuỗi `@earendil-works` chưa viết lại rồi báo nhầm là miss? | Chốt tiền đề để một lần grep về sau không sinh báo cáo sai; nếu sau này hồi sinh một test tsconfig thì 4 chuỗi đó phải viết lại lúc đó. Cảnh báo lớn hơn: sau khi chép, `grep -r @earendil-works packages/client` phải trả **0**. | **Xoá `tsconfig.test.json`** — 4 chuỗi scope đó không cần viết lại; các chuỗi còn lại (`pi-protocol` ×12, `chord` ×6) thì phải. |
| `client` | **B11.** `@earendil-works/chord/context` là một **subpath**, không phải specifier trần. `client.ts:19` và `test/client.test.ts:1` đều import `BACKGROUND_CONTEXT` từ đó, chỉ resolve được trong repo pi vì exports map của `chord` mang mục `./context`. Có giữ subpath dưới `@oh-my-pi/chord/context` không? | Spec `chord` phải giữ subpath đó, nếu không thì 2 import này vỡ. | **Giữ subpath `@oh-my-pi/chord/context`** (nếu không thì 2 import vỡ). |
| `durable` | **B12.** **TÁCH BIỆN CHỐT.** 51 file src của omp đã dùng `bun:sqlite`. `durable` thêm `storage/sqlite` với schema riêng — **9 bảng** trong `src/storage/sqlite/migrations.ts`: `durable_schema` (:103), `durable_metadata` (:10), `record_ids` (:16), `conversations` (:20), `entries` (:28), `tasks` (:37), `submissions` (:51), `documents` (:58), `document_revisions` (:73) — gồm cả bảng version/metadata nội bộ, không chỉ 5 bảng dữ liệu — trong một DB riêng. Dùng chung DB với các store hiện có? | Dùng chung sẽ phải viết migration nội bộ — tăng rủi ro gấp 2 lần. | **DB riêng**, ghi rõ trong README. |
| `durable` | **B13.** `NodeExecutionEnv`: giữ `node:child_process` hay đổi sang `Bun.spawn` **trong cùng PR**? | Đã quyết ở spec này: tách ra, PR riêng. | **Tách ra, PR riêng** (đề xuất cho roadmap chung). |
| `durable` | **B14.** `test/types.test.ts` và `expectTypeOf`: chuyển thành type test trong `tsconfig` hay bỏ hẳn? | Đã quyết: bỏ, ghi lý do trong `test_contract`. | **Bỏ**, ghi rõ lý do trong `test_contract`. |
| `durable` | **B15.** Chạy **17 file test** khi **chưa** build `pi-natives`: `bun test packages/durable` chạy độc lập được không, hay còn import lại `pi-tui`/`pi-utils` (có `pi-native`)? | **Đã đo 2026-09-28: `bun test packages/durable` chạy độc lập, `ninja` KHÔNG phải tiền đề.** `src/` + `test/` có **0** import `@earendil-works/pi-tui` / `pi-utils` / `pi-native`; import `pi-ai` duy nhất là type-only (`src/types.ts:3`), nên module graph của `pi-ai` không bao giờ được nạp lúc chạy. Deps chỉ gồm `@earendil-works/chord` + `@earendil-works/pi-ai`; devDeps `shx` + `vitest`. Bên omp chỉ `packages/ai/src/providers/apple-foundation-models.ts:13` import `@oh-my-pi/pi-natives`, và durable không chạm tới file đó. | **Cổng này xanh sau khi port, không cần `brew install ninja`.** Chỉ chạm `ninja` nếu port biến `import type { Message }` thành value import. |
| `durable` | **B16.** `LICENSE`: `pi-ref` **không có** LICENSE per-package — chỉ một file ở gốc repo (20 dòng). omp đặt LICENSE cho **12/17** package, thiếu ở `browser-relay`, `collab-web`, `metaharness`, `typescript-edit-benchmark`. Mọi file LICENSE của omp **đã có sẵn cả ba** dòng copyright, giống hệt root (`Copyright (c) 2025 Mario Zechner`, `Copyright (c) 2025-2026 Can Bölük`, `Copyright (c) 2026 Stencil Labs, Inc.`). `durable` nên theo 12 package có LICENSE hay 4 package không có? | Đề xuất "ghép thêm dòng copyright cho khớp root" là thêm vào chỗ đã có: `diff LICENSE packages/agent/LICENSE` → **SAME**, byte-for-byte. Ngoài ra `pi-ref` không có LICENSE per-package nên "21 dòng MIT của `pi-ref`" phải tạo mới chứ không phải copy. | **`packages/durable/LICENSE` là bản sao byte-for-byte của LICENSE ở gốc omp** — không ghép dòng nào thêm, không tự đặt tên. |
| `durable` | **B17.** `durable/CHANGELOG.md` là changelog của `pi-ref`, không phải của omp. Giữ lịch sử của `pi`, hay bắt đầu `## [Unreleased]` mới? | Lịch sử là bằng chứng nguồn của bản chép. | **Giữ lịch sử của `pi`** (bằng chứng nguồn). |
| `telemetry` | **B18.** Tên scope: `@oh-my-pi/pi-telemetry` (khớp bốn tên đã migrate `pi-agent-core`/`pi-ai`/`pi-coding-agent`/`pi-tui`) hay `@oh-my-pi/omp-telemetry` (khớp thằng lẻ `@oh-my-pi/omp-stats`)? | Đổi tên package đã publish thì đau để gỡ; `omp-stats` là ngoại lệ duy nhất và trông như trôi chứ không phải chính sách. | **`@oh-my-pi/pi-telemetry`** (quy ước chốt ở "chỉ đổi scope, giữ tên"). |
| `telemetry` | **B19.** Phiên bản của pi là `0.87.1`; catalog của omp là `18.3.3`. Xác nhận ý định là một `18.3.3` sạch, không có dòng dõi phiên bản pi trong manifest? | Bản viết lại CHANGELOG ở step 12 bỏ hẳn tiêu đề phiên bản của pi. | **`18.3.3` sạch** (thứ `bun run release` sẽ đóng dấu). |
| `telemetry` | **B20.** Package này có được publish, hay nội bộ cho tới khi agent của omp thật sự dùng? | Subpath `./testing` và README viết cho tác giả adapter bên thứ ba; nếu omp không có ý định publish, lý do tồn tại của conformance suite mờ đi và ai đó nên quyết export có ở lại không. | **chưa có mặc định — cần bạn quyết.** |
| `telemetry` | **B21.** Emitter OTEL trong `packages/agent/src/telemetry.ts` (2114 dòng) có định **trở thành** adapter mà `createTelemetryAdapterConformance` chấm điểm không, hay vẫn hand-roll? | Câu trả lời quyết định `RecordedTelemetrySpan` là hợp đồng tích hợp sống trong spec agent hay chỉ là fixture test. Ngoài phạm vi ở đây, nhưng conformance suite vô dụng nếu không ai chạy nó. | **chưa có mặc định — cần bạn quyết** (thuộc spec agent). |
| `telemetry` | **B22.** `agent` phía pi sở hữu các SCHEMA AI/harness/session (`AI_TELEMETRY_SCHEMA`, `HARNESS_TELEMETRY_SCHEMA`, `AGENT_TELEMETRY_SCHEMAS`, `packages/agent/src/harness/telemetry.ts`). Chép chúng là việc của spec AGENT, không phải spec này. Xác nhận spec agent sẽ mang chúng sang? | Không có chúng, `defineTelemetrySchema` và `createTypedSpanStarter` ship vào omp với **không** consumer nào trong cây và đọc như dead code. | **chưa có mặc định — cần bạn quyết** (thuộc spec agent). |
| `telemetry` | **B23.** pi dùng `'single quotes'` trong code sample README, omp dùng tab + double quotes. Các snippet (L72, L139, L186, L219) là minh hoạ, không biên dịch — restyle sang double quotes hay để nguyên như pi viết? | Vấn đề nhất quán văn phong, ảnh hưởng tới người đọc tài liệu chứ không tới hành vi. | **chưa có mặc định — cần bạn quyết.** |
| `evals` | **B24.** `coding-agent` của omp có hỗ trợ để agent tự thêm provider/model vào bản cài của nó không? 3 trong 5 eval suite của pi (`models`, `openai-provider`, `custom-provider`) test đúng điều đó. Chính sách model của omp nằm trong cây luật KDL biên dịch (`packages/catalog/src/compat/rules/`), không phải registry sửa lúc runtime — nếu vậy 3 eval đó **không viết được** và package ship 2 suite hành vi thay vì 5. | **Chặn quyết định phạm vi**, phải trả lời trước khi port bất kỳ suite nào. | **chưa có mặc định — cần bạn quyết** (2 hay 5 suite). |
| `evals` | **B25.** Đổi scope `@earendil-works/` → `@oh-my-pi/` có đúng cho **tên package** không? Quy ước cho ra `@oh-my-pi/pi-evals`, đọc thừa. Sáu package kia không bị ảnh hưởng, nhưng nếu `evals` là cái duy nhất trông sai thì giờ là lúc — sau khi nó đã đứng, đổi là breaking change trên tên package đã publish. | Cửa sổ đổi tên chỉ mở trước lúc đăng ký workspace. | **chưa có mặc định — cần bạn quyết** (`@oh-my-pi/pi-evals` hay tên khác). |
| `evals` | **B26.** Arm Docker có còn sống trong lát cắt đầu tiên không? (a) mount source omp vào container bun, chạy từ source (nhỏ hơn, không trôi, **mất** phép thử dist-resolution của pi); hay (b) mở rộng `scripts/release.ts` để phát tarball đã đóng gói và viết `scripts/release-packages.mjs` + `scripts/coding-agent-consumer.mjs` còn thiếu (trung thành hơn, lớn hơn, thêm một bề mặt build phải duy trì)? | Quyết định của maintainer với đuôi dài; phải chốt **một lần, tường minh**, không để trôi dần vào. | **chưa có mặc định — cần bạn quyết** (a hay b). |
| `evals` | **B27.** Symbol nào của `packages/evals` sau khi migrate vẫn được test cũ phủ? `test/plan.test.ts`, `comparison.test.ts`, `report.test.ts` và `acme-server.test.ts` phủ `plan.ts`, `report.ts`, `acme-server.ts`. `harness.test.ts` **không bị skip** — 116 dòng assertion sống trong 3 describe block, `vitest.test.config.ts` khai `include: ["test/**/*.test.ts"]` mà **không** có `exclude`, và `npm test` chạy nó. Nó phủ sẵn `resolveModelSelection`, `applyIsolatedEnvironment`, `resolveDocumentationVariant`, `excludePiDocumentation`, `verifySystemPrompt` và `createPiDocumentationEvalHarness`. Rào cản port thật là dòng 4 `import { buildSystemPrompt } from "../../coding-agent/src/core/system-prompt.ts"` — omp không có file này, và hàm `buildSystemPrompt` của omp là bản khác (bất đồng bộ, trả `BuildSystemPromptResult`; bản của `pi` là đồng bộ, trả `string`). Có đáng viết test hẹp hơn cho `harness.ts` trên `bun:test`, hay luật chất lượng test của `AGENTS.md` loại nó là quá hẹp? | Phần logic hậu quả nặng nhất của package **đã có phủ**; viết lại sẽ là mất coverage có sẵn. Cái duy nhất chưa port được là khối `documentation variant` phụ thuộc `buildSystemPrompt`. | **Port nguyên văn `harness.test.ts` sang `bun:test`**; chỉ khối `documentation variant` mới cần thay `buildSystemPrompt` bằng một text prompt fixture cục bộ hoặc đánh dấu deferred. **Không viết test mới cho các hàm đã có test.** |
| `evals` | **B28.** Các file phụ thuộc `ModelRuntime` bị hoãn đi đâu — package follow-up, hay TODO có theo dõi trong README package mới? | Chúng **không** xoá được (chúng mã hoá hợp đồng thật với một bề mặt mà omp chưa có) và để không ghi thì người sau sẽ phải tự suy lại rồi `ModelRuntime` là thiếu. Đếm lại: **6 file** chạm class `ModelRuntime` — `evals/configured-runtime.ts` (`:56-57`, `:100`), `test/configured-runtime.test.ts`, ba eval suite `models`/`custom-provider`/`openai-provider` (đều import `configured-runtime.ts`) và `src/harness.ts:17,316`; trong đó chỉ **1** là file test. | **chưa có mặc định — cần bạn quyết** (package follow-up hay TODO trong README). |

---

**Đọc bảng theo hướng khác.** Nếu chỉ đọc được một mục, hãy đọc **A2** và **A3**. A2 là câu duy nhất
trong 33 câu mà gỡ ra sau này đau hơn lúc chép. **A3(a)** là câu ghim **năm** package — nó là lý do
"thứ tự migrate là ràng buộc thật" đúng ở tầng quyết định chứ không chỉ ở tầng lịch. A1 thì **không
cần quyết**: nó là nút cổng chai của nửa đầu đồ thị, nhưng ô mặc định của nó tự kết luận "**Không phải
quyết định mở — ràng buộc đã chốt**", nên giữ trong bảng để nhắc chứ không phải để trả lời.


---


## Va chạm với thứ omp đã có

**33 trong 64 va chạm** — toàn bộ phần thuộc bốn package đầu theo thứ tự migrate: `chord` → `protocol` → `server` → `client`. 31 va chạm còn lại (phần còn của `client`, rồi `durable`, `telemetry`, `evals`) nằm ở phần 2. 52 thuộc sáu package trong phạm vi; 12 hàng `durable` là tài liệu tham khảo.

| package | cái gì | neo phía pi | cách giải quyết |
| --- | --- | --- | --- |
| `chord` (1/7) | **HÀNH VI KHÁC — va chạm nặng nhất phần này, và tiền đề M1 W1/W2 bị chính đợt này bác bỏ.** Làm theo pi thì một lỗi dispose ném ra sẽ chặn `saveDraft` — biến rò rỉ có điều kiện thành đường mất dữ liệu không điều kiện. Giữ nguyên omp: **không sửa một dòng nào trong `packages/coding-agent`**. Disposer teardown drain — SEMANTIC CONFLICT, and the M1 W2 premise is false. The task note says M1 W1/W2 'already manually ported reverse-order drain + error isolation from packages/chord/src/facets/host.ts:125-142'. Verified false in two ways. (1) The W2 spec's own plan_corrections record the claim as verdict 'unverifiable — the reference does not exist in this repo', evidence '`ls -d pi-ref` → No such file or directory; `find . -path ./node_modules -prune -o -name host.ts -path \'*chord*\' -print` returns nothing', and the correction is 'Do not attempt to read chord.' (2) Nothing landed: `drainDisposers` does not exist anywhere in omp. The four drain loops W2 targeted are still the original forward-order, no-try/catch shape. packages/coding-agent/src/session/agent-session.ts:4983, packages/coding-agent/src/session/agent-session.ts:5218, packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112, packages/coding-agent/src/extensibility/extensions/runner.ts:1347 — all four are `for (const dispose of this.#X.splice(0)) dispose();` | packages/chord/src/facets/host.ts:125-142 | KEEP OMP. Copying chord must NOT mean converting these four loops. The two designs disagree on purpose: chord's FacetKernel.dispose drains reverse, isolates each error, then RETHROWS (`if (errors.length === 1) throw errors[0]; if (errors.length > 1) throw new AggregateError(errors, ...)`). W2's contract is to log and continue, because beginDispose() is called from session-teardown.ts:70 BEFORE the try that wraps `await deps.saveDraft(draftText)` — a throwing drain would reject teardown before the draft is written, turning a conditional leak into an unconditional data-loss path. That divergence is correct for omp. Re-implement the four loops against chord's FacetKernel as a SEPARATE, LATER change under W2's own spec, and when that happens keep log-and-continue. This spec only lands packages/chord; it changes zero lines in packages/coding-agent. |
| `chord` (2/7) | **HÀNH VI KHÁC — giữ bản của chord, và cố ý không gộp sáu định nghĩa trong lần thay đổi này.** Biến thể ở `obfuscator.ts` cho phép `JsonValue \| undefined`, một giá trị mà bản của chord không chấp nhận; hai bên không thay thế cho nhau mà không đổi hành vi kiểm tra. JsonValue — six definitions in omp, three distinct shapes. Highest-reach collision in the package because pi-server, pi-client, pi-durable, and pi-protocol all import chord's JsonValue. packages/catalog/src/discovery/protobuf.ts:11 (identical shape), packages/mnemopi/src/types.ts:2 (via JsonScalar, identical shape), packages/mnemopi/src/mcp-tools.ts:9 (via JsonPrimitive, identical shape), packages/mnemopi/src/core/beam/types.ts:4 (identical shape), packages/ai/src/judgment/types.ts:17 (READONLY variant: `readonly JsonValue[]` / `{ readonly [key: string]: JsonValue }`), packages/coding-agent/src/secrets/obfuscator.ts:72 (DIVERGENT: object branch is `{ [key: string]: JsonValue \| undefined }`) | packages/chord/src/types.ts:21 — `null \| boolean \| number \| string \| JsonValue[] \| { [key: string]: JsonValue }` | KEEP CHORD'S, but do NOT try to unify omp's six in this change. Copying chord's JsonValue verbatim is correct and non-breaking: all four sibling packages that import it were copied from the same pi tree and are mutually consistent. The obfuscator variant is a genuine divergence, but nothing in this migration passes an obfuscator value across the chord boundary, so unifying is out of scope. Record it as a follow-up: a single `@oh-my-pi/pi-utils` JsonValue + isJsonValue, and have all six definitions plus chord's two import from there. Note pi-protocol's spec says it imports JsonValue and isJsonValue from chord — after this migration those come from @oh-my-pi/chord, and pi-protocol's copy must be pointed at that import rather than keeping its own. |
| `chord` (3/7) | **CÙNG TÊN, HỢP ĐỒNG KHÁC NHAU — giữ bản type guard của chord làm bản chuẩn xuất.** Bản ở `packages/omptype/src/json-schema.ts:296` trả `boolean` thuần và mang thêm tham số `seen`, nên không phải type guard; hai cái không hoán đổi được. isJsonValue — name already taken three times in omp, once with an incompatible signature. packages/coding-agent/src/eval/judgment-bridge.ts:47 and packages/ai/src/providers/cursor.ts:4643 (both `(value: unknown): value is JsonValue`, compatible), plus packages/omptype/src/json-schema.ts:296 which is `isJsonValue(value: unknown, seen = new Set<object>()): boolean` — plain boolean, extra cycle-set parameter, NOT a type guard | packages/chord/src/json.ts:74 — `isJsonValue(value: unknown): value is JsonValue`, a TYPE GUARD | KEEP CHORD'S as the canonical export. No import site currently star-imports both @oh-my-pi/chord and a module exporting the omptype variant, so the copy does not create an ambiguity. Do not touch omptype's version in this change — it lives behind a different signature and replacing it is a separate refactor. But make pi-protocol import chord's guard rather than declaring a fourth copy. |
| `chord` (4/7) | **GIỮ CẢ HAI — quyết định có chủ đích, đừng "dọn dẹp".** Hai thứ không liên quan và cả hai đều đúng; mối nguy duy nhất là một module tương lai `export *` cả hai barrel (TS2308). Context — same name, entirely different concept. packages/ai/src/types.ts:1476 — `export interface Context { systemPrompt?: string[]; messages: Message[]; tools?: Tool[]; inactiveTools?: Tool[] }`, a REQUEST PAYLOAD, exported from @oh-my-pi/pi-ai and imported by name in 10+ files | packages/chord/src/types.ts:15 — immutable key/value cancellation scope: `value<T>(key: ContextKey<T>): T \| undefined`, `toString()`, and an `abortSignal` getter | KEEP BOTH, DO NOT MERGE. They are unrelated and both are correct. The copy is safe today because no file star-imports both barrels — every one of the 10+ `@oh-my-pi/pi-ai` `Context` imports is a named import, and TS only reports an ambiguity on `export *` collisions. The residual risk is a future barrel re-export: if a module ever does `export * from "@oh-my-pi/pi-ai"` alongside `export * from "@oh-my-pi/chord"`, TS raises TS2308. Leave a comment at packages/chord/src/types.ts:15 naming pi-ai's unrelated Context so the next person does not try to unify them. Do not rename either symbol — durable, client, server, and protocol all import chord's Context by name and a rename would break four packages for no gain. |
| `chord` (5/7) | **KHÔNG VA CHẠM — nhưng đợt quét luật của chord chưa đủ, và đây là kiểu dễ bị "siết lại" nhầm.** Giữ nguyên văn; ngưỡng cắt độ sâu là có chủ ý. Draft — a much more permissive type in a codebase that forbids `any` elsewhere. no Draft definition exists in omp at all (0 hits for `type Draft\|interface Draft`). Zero `any` in chord's src (verified: `: any\|<any>\|as any\|any[]` = 0), so copying does not import an `any` debt. NHƯNG zero `any` is not zero rule violations: chord also carries 6 `ReturnType<` — 3 in src (node/bundle.ts:118, node/package.ts:57, node/package.ts:182) and 3 in test (services.test.ts:415, delta-traversal.bench.ts:165, delta-tracker/tracker.test.ts:27) — which is the same AGENTS.md line 45 "NEVER use `ReturnType<>`" that client (3/8) already records for its single case, and 16 `console.*` across 8 files under chord/test, 6 of them in `*.worker.ts` (test/delta-tracker/retention.worker.ts, test/delta-benchmark/{benchmark,memory-benchmark,conversation-view-benchmark}.worker.ts), which AGENTS.md line 217 forbids for anything that may run alongside a worker or background runtime. | packages/chord/src/delta/draft.ts:2 — recursive `-readonly` mapped type with an explicit depth cutoff at 8 | NO COLLISION — but flag the intent. The cutoff exists so the compiler does not blow its stack on deep types. Keep it verbatim; do not 'simplify' it to an unbounded recursion. Add chord's 6 `ReturnType<` to the rewrite list from protocol (7/11) — `Awaited<ReturnType<typeof stat>>` becomes the actual type, matching the `NodeJS.Timeout` spelling client (3/8) already uses. For `console.*`, the split is: in `.test.ts` files it is acceptable (standalone `bun test` runs, no TUI), in `*.worker.ts` it must become `logger` from `@oh-my-pi/pi-utils`. |
| `chord` (6/7) | **HÀNH VI KHÁC — giữ nguyên văn, tuyệt đối không viết lại thành `omp.…`.** Đây là bản sắc của artefact nằm trên đĩa: đổi tên trong commit di trú là vô hiệu hoá âm thầm mọi bundle đã tồn tại. Khi omp muốn format riêng, đó là bump phiên bản format. On-disk format strings that name the upstream package, which the package no longer is. no equivalent exists in omp; the bundler surface is entirely new | packages/chord/src/node/manifest.ts:1-5 — FACET_BUNDLE_FORMAT = "chord.facet-bundle", FACET_BUNDLE_ARTIFACT_FORMAT = "chord.facet-bundle-artifact", FACET_BUNDLE_MANIFEST_FILE = "chord-facets.json" | KEEP THE STRINGS VERBATIM. Do NOT rewrite them to "omp.…" as part of the scope rewrite. These are the identity of an on-disk artefact: a facet bundle written by pi must still load under @oh-my-pi/chord, and vice versa. Renaming them silently invalidates every bundle on disk. If omp ever wants its own format, that is a format-version bump, not a string edit in a migration commit. That covers only the 5 `FACET_BUNDLE_*` constants in src/node/manifest.ts. THREE OTHER hard-coded strings in the same package must move the OPPOSITE way: src/node/bundle-loader.ts:328-333 compares `specifier === "@earendil-works/chord"`, `"@earendil-works/chord/context"` and `"@earendil-works/chord/node"` inside `resolveExternalTarget` — those are package identity, not an on-disk artefact signature, so they must be rewritten to `@oh-my-pi/chord`, `@oh-my-pi/chord/context`, `@oh-my-pi/chord/node`. Left as-is, the facet bundler silently resolves no external at all inside the omp workspace. Order matters: change chord's subpath `exports` map to omp's source-only shape (see protocol 10/11) FIRST, then these three strings, then repoint client/src/client.ts:19 and client/test/client.test.ts:1 to `@oh-my-pi/chord/context`. |
| `chord` (7/7) | **THIẾU HẾT — dependency npm thứ hai của đợt chép, cùng lớp lỗi với protocol (11/11), và là loại chặn ngay ở bước resolve chứ không phải bước typecheck.** Không phải trùng tên, mà là thứ không tồn tại. | `"esbuild": "0.28.2"` (dependencies của packages/chord) — hard import tại src/node/bundle.ts:4 `import { type BuildOptions, build, type Message } from "esbuild"` | ADD `"esbuild": "0.28.2"` to the dependencies of packages/chord. This is a RUNTIME dependency, not a devDependency: chord/src/node/bundle.ts calls `build()` to bundle facets, so it is on the shipped code path, not just the test path. Verified absent on the omp side: `git grep -n 'esbuild' -- 'packages/*/package.json' 'package.json'` returns nothing, and `ls -d node_modules/esbuild` returns "No such file or directory". Unlike typebox there is NO in-tree substitute to route around — nothing in omp bundles, so this one genuinely has to be added. |
| `protocol` (1/11) | **GIỮ CẢ HAI — quyết định có chủ đích, và từ chối đổi tên.** Hành vi khác ở đây là giá trị: `8` (CBOR RPC) so với `1` (ACP). Đổi tên là breaking change bề mặt bên ngoài; tên `PROTOCOL_VERSION` là đúng như upstream dùng. `PROTOCOL_VERSION` — same exported name, DIFFERENT meaning and value packages/utils/src/acp/protocol.ts:13 — `export const PROTOCOL_VERSION = 1` (ACP protocol version, consumed at packages/coding-agent/src/modes/acp/acp-agent.ts:30 and :654) | packages/protocol/src/protocol.ts:5 — `export const PROTOCOL_VERSION = 8 as const` | KEEP BOTH, no rename. Measured mitigation: `packages/utils/src/index.ts` does NOT re-export `./acp` — `acp.ts` is a separate sub-barrel reachable only as `@oh-my-pi/pi-utils/acp`, and `grep -rn 'PROTOCOL_VERSION' packages` finds 2 files, neither importing it from the root pi-utils barrel. So the two constants can never be star-merged into one namespace today. pi-protocol stays its own package and is never star-re-exported into pi-utils. Record the triple in the package README: after this lands the repo holds THREE version constants — `PROTOCOL_VERSION = 8` (CBOR RPC), `PROTOCOL_VERSION = 1` (ACP, under /acp), `COLLAB_PROTO = 3` (packages/wire/src/index.ts:397) — plus `STREAM_PROTO = 1` (packages/wire/src/stream.ts:20). Renaming is tempting and must be refused: a rename is a breaking change to an external ACP surface, and pi-protocol's name is what the copied upstream uses, so a rename buys readability and costs a protocol-name divergence from every doc and import in the migrated tree. |
| `protocol` (2/11) | **GIỮ CẢ HAI — quyết định có chủ đích.** Cả ba bản trong `packages/ai/test` là helper cục bộ từng file: không export, không nằm trong barrel nào, không thể va chạm lúc link. Bẫy là bẫy tương lai, không phải hiện tại. `encodeFrame` — same name, incompatible signature, 3 in-tree definitions packages/ai/test/issue-3124-repro.test.ts:49, packages/ai/test/aws-eventstream.test.ts:27, packages/ai/test/bedrock-stream-exception-status.test.ts:55 — all `function encodeFrame(headers: Record<string, string>, payload: Uint8Array): Uint8Array`, file-local, module-private, AWS event-stream framing (total-length + prelude + headers + CRC) | packages/protocol/src/framing.ts:29 — `encodeFrame(payload: Uint8Array): Uint8Array`, 4-byte BE length prefix | KEEP BOTH, no rename. All three are module-private test helpers — none is exported, none is in a barrel, and none can collide at link time. The trap is future, not present: if pi-protocol's star exports are ever re-exported from pi-ai or a shared test-utils barrel, `export * from` will silently shadow one of them. Mitigation is a note in pi-protocol's README naming the three, not a rename — renaming file-local test helpers across packages/ai to clear a hypothetical future ambiguity is a change with real cost and no current defect. |
| `protocol` (3/11) | **KHÔNG VA CHẠM — và không có gì để sửa.** Cùng một *chữ*: một bên là symbol, bên kia chỉ là nhãn log trong một provider không liên quan. `parseServerMessage` — same token, used as a STRING not a symbol packages/ai/src/providers/cursor.ts:889 — `log("error", "parseServerMessage", { error: String(e) })` — a log label | packages/protocol/src/codec.ts:25 — `export function parseServerMessage(value: unknown): ServerMessage` | NO COLLISION, and none to fix. It is a string literal in an unrelated provider. Note it in the PR description only so a reviewer running a naive symbol grep does not file a false positive. Do not rename the pi-ai log label: log labels are an operational surface (grep-able in `~/.omp/logs`), and changing one to disambiguate a symbol that does not exist is churn. |
| `protocol` (4/11) | **HÀNH VI KHÁC — giữ bản của chord và không re-export gì ra ngoài.** Bất đối xứng cần nói thẳng: hình dạng cho phép `undefined` ở `obfuscator.ts` đúng với bộ che bí mật và sai với payload đi qua dây — khác biệt có thật, không phải lỗi cần dọn. `JsonValue` — six in-tree definitions with six different shapes packages/ai/src/judgment/types.ts:17 (`readonly` variant), packages/catalog/src/discovery/protobuf.ts:11, packages/mnemopi/src/mcp-tools.ts:9, packages/mnemopi/src/types.ts:2, packages/mnemopi/src/core/beam/types.ts:4, packages/coding-agent/src/secrets/obfuscator.ts:72 (the ONLY one that admits `JsonValue \| undefined` per key) | packages/protocol/src/protocol.ts:1 — `import type { JsonValue } from "@earendil-works/chord"` (chord/src/types.ts:21: `null \| boolean \| number \| string \| JsonValue[] \| { [key: string]: JsonValue }` — STRICT, no undefined) | KEEP CHORD'S, and re-export nothing. Concretely: (a) protocol.ts keeps `import type { JsonValue } from "@oh-my-pi/chord"` — do NOT redefine the type locally, which would make `OpaqueJsonValueSchema` a different contract from the one `isJsonValue` enforces; (b) `JsonValue` must NOT appear in pi-protocol's `src/index.ts` named export list, so it can never be star-merged with pi-ai's or mnemopi's into one ambiguous namespace. Note the asymmetry with obfuscator.ts: its `undefined`-permitted shape is CORRECT for a secrets masker and WRONG for a wire payload — that is a real difference, not a bug to unify. |
| `protocol` (5/11) | **GIỮ CẢ HAI — KHÔNG GỘP, và đây là phát hiện âm tính có tải trọng nhất của cả tài liệu.** Hai bên giải mã chuỗi bằng bộ giải mã khác nhau (`fatal: true, ignoreBOM: true` so với mặc định không fatal của Buffer), nên thay bên này bằng bên kia là thay đổi hành vi thật của một OAuth attestation, không phải refactor. HAND-ROLLED CBOR WRITER in omp — the one genuine byte-level duplicate in the tree packages/coding-agent/src/live/attestation.ts:11-37 — `cborHeader` / `cborUnsigned` / `cborText` / `cborMap` build the SAME major types (0 unsigned, 3 text, 4 byte string, 5 map, 7 float64 via a raw 0xfb prefix) by hand for the ChatGPT DeviceCheck attestation | packages/protocol/src/cbor/encoder.ts (216 lines) — full definite-length CBOR writer with byte strings, text strings, float64, depth/cycle/limit enforcement | DELIBERATELY NOT MERGED, and this is the most load-bearing negative finding in the spec. Three measured reasons. (1) attestation.ts is 91 lines total and its CBOR is roughly 30 of them; routing it through the shared codec imports a 216-line dependency tree to replace 30, and `cborHeader(64, ...)` needs a byte string the attestation builds but the shared encoder's API would require re-expressing. (2) It is untestable here: `generateCodexAttestation` early-returns unless `process.platform === "darwin" && process.arch === "arm64"` and wraps a native call — exactly the coverage GATE 2 cannot provide. A refactor whose only consumer cannot be exercised is a refactor with no safety net. (3) The shared codec and attestation decode with DIFFERENT text decoders — `fatal: true, ignoreBOM: true` (cbor/options.ts:29) vs Buffer's non-fatal default — so substituting one for the other is a real behaviour change to an OAuth attestation, not a refactor. ACTION: record in packages/protocol/README.md that this is the only hand-rolled CBOR in omp and that the shared encoder is the answer IF anyone later wants it — so the next reader closes the question instead of re-finding it. |
| `protocol` (6/11) | **GIỮ CẢ HAI — KHÔNG GỘP, và chỗ dễ nhầm nhất phải được nói thẳng.** Đầu-framing ở `collab/protocol.ts:113` đúng là uint32 4 byte big-endian, cùng hình dạng với frame header — nhưng đó là tiền tố peerId cố định, không phải độ dài payload, và là phép `subarray` không trạng thái, không phải bộ tách tăng dần. Gộp vào `FrameDecoder` sẽ đổi nghĩa của byte. `FrameDecoder` has no counterpart, but omp's framing idioms are two different shapes packages/coding-agent/src/tiny/jsonl-socket.ts:9-20 (`LineParser`, newline-delimited JSON over node:net, 49 lines) and packages/coding-agent/src/collab/protocol.ts:105-119 (a 4-byte BE peerId envelope header + AES-GCM sealed payload, read with DataView.getUint32(0, false)) | packages/protocol/src/framing.ts:44 — incremental length-prefixed BINARY frame splitter | NO MERGE, and say so in the README so the question is closed. The collab envelope header at collab/protocol.ts:113 does use a 4-byte BE uint32 — the same shape as pi-protocol's frame header — but it is a fixed 4-byte PEER-ID PREFIX, not a payload length, and it is a stateless one-shot `subarray` on a complete WebSocket message, not an incremental splitter. Folding it into `FrameDecoder` would change what the bytes mean. jsonl-socket's newline framing is a different protocol entirely. The server spec already reached the same conclusion for packages/coding-agent/src/collab/registry.ts; record it once, here, where the framing primitive actually lands. |
| `protocol` (7/11) | **SẮP XẾP LẠI KHI CHÉP — 30 khai báo ở protocol, và cùng một quy tắc áp dụng cho MỌI package chép sang chứ không riêng protocol: server 88, client 4, chord 0.** Cơ học gần như toàn bộ, nhưng có một mắt xích cần quyết chứ không phải thay chữ. Đợt quét này CHỈ kiểm chứng được MỘT NỬA bằng công cụ: `check:ts` bắt phép thay THỪA, không bắt phép thay QUÊN (đo bên dưới) — phép thay quên cần một grep riêng. `private` keyword on 30 members — an AGENTS.md violation that is a REAL semantic difference in one place AGENTS.md "Class privacy": ES `#private` fields, no `private`/`protected`/`public` keyword except on constructor parameter properties | 30 declarations: cbor/decoder.ts:11,12,13,26,88,112,119,145,152 (9); cbor/encoder.ts:13,14,15,68 (4); codec.ts:66,67,68,69,70,107,124 (7); framing.ts:45-53,141 (10) | REWRITE all 30. Mostly mechanical `private ` -> `#`, but ONE member needs a decision, not a substitution: `CborWriter.buffer` (encoder.ts:13) and `CborWriter.offset` (encoder.ts:14) are both READ and WRITTEN inside the class only, so `#` works — but `ensureCapacity` (encoder.ts:68) reassigns `this.buffer` to a fresh array, and with `#buffer` that stays legal. Conversely `FrameDecoder.fail` (framing.ts:141) is a `private` METHOD and must become `#fail`; it is called from `push` and `end` only, so no caller changes. In codec.ts, `ValidatedMessageDecoder` is itself module-private and its 5 members plus the 2 `decoder` fields on Client/ServerMessageDecoder all convert. Run the whole thing under `bun run check:ts`, but know up front that `check:ts` only catches HALF of it. Measured with the very binary `check:types` invokes (`node_modules/.bin/tsgo`): a class that still has `private buffer` / `private offset` exits 0 — `private` is valid TypeScript, so there is nothing to report — and only the OVER-applied case fails (`this.offset` against a `#offset` field gives TS2551, non-zero exit). `.oxlintrc.json` enables no rule that forbids `private` either. So the gate for the missed case is a grep, not a typecheck: `grep -rEn '^\s*private\s' packages/protocol packages/server packages/chord packages/client` must return 0. `bun run check:ts` proves only that nothing was over-converted and no import broke. And before trusting that gate at all, you MUST add `"check:types": "tsgo -p tsconfig.json --noEmit"` to `scripts` of every new package: `check:ts` is `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`, and `--if-present` means a package without `check:types` is skipped silently — no warning, no output line. Measured on the current tree, `bun run check:ts` prints exactly 16 `check:types` lines (one per package). After the four new packages land that number must be 20; if it is still 16 the gate does not cover the new code and every "green" conclusion drawn from it is worthless. |
| `protocol` (8/11) | **SẮP XẾP LẠI KHI CHÉP — bỏ `.ts` ở cả 223 dòng, KHÔNG CHỈ 15 của protocol.** Đây là vi phạm quy ước lớn nhất của đợt chép, và nó xuất hiện ở cả ba package còn lại với số lượng lớn hơn protocol tổng cộng. Không phải chuyện làm đẹp: để nguyên thì các file chép sang là module duy nhất trong cây dùng phần mở rộng tường minh, trong khi oxfmt/oxlint/tsgo chạy với `moduleResolution` của omp. Đo lại: chord 126 (src 84 + test 42), server 57 (src 37 + test 20), client 25 (src 16 + test 9), protocol 15 (src 12 + test 3) — tổng 223, trong đó tài liệu này xử lý 15, sót 208. `.ts`-suffixed relative imports — pi style vs omp style 0 occurrences in packages/wire/src and packages/omptype/src; 2 across ALL of packages/*/src, and both are asset imports of a `.d.ts` (packages/coding-agent/src/tools/browser/prelude-definition.ts:5 and .../computer/prelude-definition.ts:3). Measured: `grep -rho 'from "\.[^"]*\.ts"' packages/*/src` = 2. | 15 relative import/export lines, every one carrying an explicit `.ts`: cbor/decoder.ts:8, cbor/encoder.ts:10, cbor/index.ts:1,2,9, codec.ts:3,4,11, index.ts:1,2,3,22, test/cbor/cbor.test.ts:9, test/framing.test.ts:2, test/protocol.test.ts:20 | STRIP the `.ts` from all 223, not just protocol's 15. The per-line list for protocol's 15 stays as given (cbor/decoder.ts:8, cbor/encoder.ts:10, cbor/index.ts:1,2,9, codec.ts:3,4,11, index.ts:1,2,3,22, test/cbor/cbor.test.ts:9, test/framing.test.ts:2, test/protocol.test.ts:20 — verified line by line); sweep the remaining 208 with the same command, `grep -rl 'from "\.[^"]*\.ts"' packages/chord packages/server packages/client`. This is not cosmetic: with `.ts` present, the copied files would be the only modules in the tree using explicit extensions, and oxfmt/oxlint/tsgo all run with omp's moduleResolution. Cheap to verify: after the sweep, `grep -rn 'from "\.[^"]*\.ts"' packages/{chord,protocol,server,client}/src` should return 0, and the 2 pre-existing `.d.ts` asset imports elsewhere are unaffected because they target a declaration file, not a module. Note that `bun run fmt:tools` does NOT strip extensions — oxfmt 0.65.0 rewrites `import { a } from "./a.ts"` byte-for-byte — so whatever is missed stays missed permanently. |
| `protocol` (9/11) | **GIỮ CẢ HAI — không gộp hai tên.** Một cái là thứ peer từ xa gửi đến, một cái là thư viện này ném ra cục bộ. Gộp thành một là không viết nổi handler bắt lỗi decode cục bộ mà không nuốt luôn thông báo lỗi từ xa. Error-type naming: a TYPE named `ProtocolError` alongside a CLASS named `ProtocolValidationError` grep across packages: 0 occurrences of ProtocolError / ProtocolValidationError / FrameError / CborError | packages/protocol/src/protocol.ts:26 (`export type ProtocolError` — a data shape; dòng :25 ngay phía trên là `export type ProtocolErrorCode = string`, đừng tìm nhầm) vs packages/protocol/src/codec.ts:11 (`export class ProtocolValidationError`), plus `FrameError` (framing.ts:12) and `CborError` (cbor/options.ts:24) | NO RENAME, PRESERVE BOTH NAMES AS-IS. The distinction is the protocol's core error contract and it is easy to get wrong: `ProtocolError` is what a REMOTE peer sends in a response envelope and is a value that crosses the wire; `ProtocolValidationError` is what THIS library throws locally and is a class. Collapsing them would make it impossible to write the handler that catches a local decode failure without also swallowing a remote failure message. No in-tree collision exists. Add one line to the README stating which is which, because the near-identical names will read like a typo to the next person. |
| `protocol` (10/11) | **ĐỔI BỘ CHẠY TEST — 31 dòng import và 3 file cấu hình bị xoá, KHÔNG CHỈ 3 của protocol.** Xoá `vitest.config.ts` không phải mất mát: `globals: true` là thứ duy nhất các test dùng từ nó, mà dưới `bun:test` import vẫn tường minh; `environment: "node"` cũng không mất gì vì Bun không có jsdom/happy-dom. `vitest` — not a protocol-only problem: all four packages ship `"test": "vitest --run"`, and 31 test files import `from "vitest"` — chord/test (19), server/test (6), client/test (3), protocol/test (3, 4 describes, 28 tests). 2697 files under packages/ import from `bun:test`. The root `test` script is `bun scripts/ci-test-ts.ts local`. No vitest anywhere in omp. Leaving the other 28 files importing vitest is not "suboptimal" — no package in omp has vitest, so `bun test` cannot resolve the module and every test in chord, server and client dies at load. | test/cbor/cbor.test.ts:1, test/framing.test.ts:1, test/protocol.test.ts:1 — all `import { describe, expect, test } from "vitest"`; plus the other 28: chord/test (19 files), server/test (protocol.test.ts, listener.test.ts, server.test.ts, unix.test.ts, conformance.test.ts, unix-connection.test.ts), client/test (client.test.ts, unix-transport.test.ts, unix.test.ts) | REWRITE all 31 vitest import lines across the four packages — chord/test (19 files), server/test (6), client/test (3), protocol/test (3) — to `from "bun:test"`, and DELETE the three per-package configs: protocol/vitest.config.ts (298 B), server/vitest.config.ts (1.2 KB), client/vitest.config.ts (463 B). protocol's 3 files are the easy case (measured: 0 `vi.*`, 0 lifecycle hooks, only toThrow/toEqual/toBe/toMatchObject/toBeTypeOf, all in bun:test). The other 28 are NOT a bare import-line swap — chord/test alone has 14 `vi.*` lines (10 `vi.waitFor`, 4 `vi.fn`), chord/test/services.test.ts and facet-loader.test.ts use `toHaveBeenCalledOnce`, and server/client/chord import `afterEach`. bun:test has no `vi` export and no `waitFor` export (verified by running it: `SyntaxError: Export named 'waitFor' not found in module 'bun:test'`), so `vi.fn` becomes `mock`, `vi.waitFor` needs a local polling helper, and `afterEach`/`toHaveBeenCalledOnce` carry over unchanged. Sweep every file with `grep -rn '\bvi\.' packages/{chord,protocol,server,client}/test` after the import swap. The 19 chord test files have no per-package config at all: they resolve `@earendil-works/chord`, `/context`, `/delta`, `/bundler`, `/node` through the 20-entry alias map in pi-ref's root vitest.base.ts. Under omp those specifiers resolve through the workspace exports map instead, so the alias table is not needed — but every `@earendil-works/*` specifier in the 31 test files must first be rewritten to `@oh-my-pi/*`. The deleted config is not loss: `globals: true` is the only thing the tests use from it, and under bun:test the imports are explicit anyway. `environment: "node"` is also a non-loss — Bun has no jsdom/happy-dom environment to differ from. Then delete tsconfig.build.json and tsconfig.test.json and use omp's `{ "extends": "../tsconfig.workspace.json", "include": ["src", "test"] }` plus a `tsconfig.publish.json` cloned from packages/wire/tsconfig.publish.json. Do NOT port the tests to pi-ai's `expect` shims — the assertions here are exact byte and exact-string comparisons (`toEqual(new Uint8Array([0,0,0,3,0xaa,0xbb,0xcc]))`) and Bun's native matcher handles them directly. You must also REWRITE the `scripts` block and the `exports` map — do not copy them across. All four pi package.json files carry `"build": "tsc -p tsconfig.build.json"` and `"clean": "shx rm -rf dist"`; server and client add `"typecheck": "tsc -p tsconfig.test.json"` and server adds `"dev": "tsc -p tsconfig.build.json --watch --preserveWatchOutput"`. That is eight violations of a project rule: AGENTS.md line 261 reads verbatim "Never use `tsc`/`npx tsc` — always `bun check`." `shx` does not exist in omp. Replace the whole `scripts` block with packages/wire's shape (`check`, `check:types`: `tsgo -p tsconfig.json --noEmit`, `lint`, `fix`, `fmt`) and see protocol (7/11) for why `check:types` is load-bearing rather than optional. Drop `main`/`types` and replace `exports` — pi points them at `./dist/*` (`{".": {"types": "./dist/index.d.ts", "import": "./dist/index.js"}}`), while every omp package is source-only: `{".": {"types": "./src/index.ts", "import": "./src/index.ts"}, "./*": {"types": "./src/*.ts", "import": "./src/*.ts"}, "./*.js": "./src/*.ts"}`. chord alone needs its 5 subpaths kept (`.`, `./context`, `./delta`, `./bundler`, `./node`), because client/src/client.ts:19 and client/test/client.test.ts:1 import `@earendil-works/chord/context` and chord/src/node/bundle-loader.ts:330 hard-codes that string. No omp package builds a `dist/`, so keeping `main: ./dist/index.js` makes every import of these packages fail to resolve. |
| `protocol` (11/11) | **THIẾU HẰN — dependency npm thứ nhất của đợt chép, sẽ đỏ ở bước resolve chứ không phải bước typecheck.** Không phải trùng tên, mà là thứ không tồn tại trong omp. | `"typebox": "1.3.27"` (dependencies của packages/protocol) — dùng ở src/protocol.ts:2 `import Type, { type Static } from "typebox"`, src/protocol.ts:3 và src/codec.ts:2 `import { Check } from "typebox/value"` | Không copy nguyên `dependencies` của protocol. omp KHÔNG có `typebox`: `git grep -n 'typebox' -- 'packages/*/package.json' 'package.json'` chỉ trả về đúng MỘT dòng, `packages/omptype/package.json:38: "@sinclair/typebox": "^0.34.0"` — đó là package KHÁC: `node_modules/@sinclair/typebox/package.json` cho thấy phiên bản 0.34.52 (không phải 1.3) và cửa hình `/value` của nó xuất `Value` / `ValueError` chứ KHÔNG có `Check` (`build/cjs/value/check/index.d.ts` chỉ re-export từ `./check` với mặc định là `Value`) — nên không quy đổi được 1:1. Toàn bộ `packages/*/src` có 0 lần import `typebox`. Đừng thử dùng nó để né dependency. Có hai đường đi: (a) thêm `"typebox": "1.3.27"` vào dependencies của packages/protocol, hoặc (b) định tuyến schema qua engine schema sẵn có của omp (`@oh-my-pi/omptype`). (b) là một QUYẾT ĐỊNH riêng về schema engine, không phải hệ quả của việc chép — đừng chọn nó một cách âm thầm, và đừng ghi vào tài liệu này như thể nó đã được chốt. Sau khi chốt, chứng minh resolve được bằng `cd packages/protocol && bun -e 'import("./src/protocol.ts")'`. |
| `server` (1/7) | **GIỮ CẢ HAI — quyết định có chủ đích, đừng dọn.** Cùng tên nhưng khác package và khác specifier, nên không import nào có thể mơ hồ. Mối nguy thật chỉ là một file tương lai import cả hai; gặp thì alias bên Bun thành `BunServer` tại chỗ import. The `Server` class name. pi-server exports `class Server<TMetadata>`. omp uses the bare word `Server` for two unrelated things: packages/metaharness/src/server.ts:26 does `import type { Server, Subprocess } from "bun"` and annotates `#server: Server<undefined> \| null` (line 194), and packages/stats/src/server.ts is a whole file of the same name. packages/metaharness/src/server.ts:26,194 (`import type { Server } from "bun"`; `#server: Server<undefined> \| null`) and packages/stats/src/server.ts | packages/server/src/server.ts:46 — `export class Server<TMetadata extends SessionMetadata = SessionMetadata>` | KEEP BOTH — no edit to either. They are different packages with different module specifiers, so no import can ever be ambiguous: `@oh-my-pi/pi-server`'s `Server` only enters scope via `import { Server } from "@oh-my-pi/pi-server"`, which never collides with a local `import type { Server } from "bun"` in a different module. The only real hazard is a FUTURE file that imports both; if that happens, alias the Bun one as `BunServer` at the import site rather than renaming the migrated class. Do not rename the migrated class — upstream name fidelity is the whole point of a copy-based migration. |
| `server` (2/7) | **DÙNG BẢN DÙNG CHUNG — sửa đổi có chủ ý duy nhất lên một symbol công khai trong toàn bộ lần chép này, và nó thuần type nên không thể đổi hành vi runtime.** API công khai của pi-server giống hệt byte-for-byte, nhưng kiểu có đúng một nhà. `MaybePromise<T> = T \| Promise<T>` declared twice. pi-server declares and star-exports its own at types.ts:15. omp already has a byte-identical declaration in a shared package. packages/utils/src/acp/protocol.ts:9 — `export type MaybePromise<T> = T \| Promise<T>;` (reachable as `@oh-my-pi/pi-utils/acp/protocol` via the `./*` export wildcard) | packages/server/src/types.ts:15 — `export type MaybePromise<T> = T \| Promise<T>;` (re-exported by src/index.ts:4) | DROP the local declaration; add `export type { MaybePromise } from "@oh-my-pi/pi-utils/acp/protocol";` to src/types.ts so the public API of pi-server is byte-identical but the type has exactly one home. AGENTS.md 'Central Utilities' is explicit that a second implementation of an existing helper is a bug. This is the ONE intentional non-verbatim edit to a public symbol, and it is type-only, so it cannot change runtime behavior. |
| `server` (3/7) | **KHAI BÁO CỤC BỘ — lệch khỏi chép nguyên văn duy nhất được đặt tên, và đây là câu hỏi dành cho bạn quyết chứ không phải quyết định tự chốp** (xem `open_questions[0]`). omp không có khái niệm Session bền vững để trỏ tới, và `@oh-my-pi/pi-agent-core` của omp không phải cùng package với pi-agent-core upstream dù cùng tên. `SessionMetadata` — the generic bound on ServerHost/Server/SessionRouter/createUnixServer — is not exported anywhere in omp, and `grep -rn 'SessionMetadata' packages/agent/src` returns 0 hits. It is NOT absent from the tree, though: `grep -rn 'SessionMetadata' packages/` returns 18 hits, of which `packages/stats/src/trace.ts:976` is a real `interface SessionMetadata { title: string \| null; cwd: string \| null }`, used at :981, :1010, :1018, :1023 and :1198. That one is module-private and a different shape (two nullable fields vs pi's six: id, createdAt, storageVersion, cwd?, parentSessionId?, legacyParentSessionPath?), so there is no link-time collision and the DECLARE-LOCALLY decision below is unchanged — but the name is not free, and the evidence for that decision must be the scoped grep, not a global absence that does not hold. omp's `@oh-my-pi/pi-agent-core` is NOT the same package as pi's despite the identical name. packages/agent/src/index.ts exports only 17 flat modules (agent, agent-loop, append-only-context, compaction, output-budget, pause, proxy, replay-policy, run-collector, sent-tool-definitions, speculative-execution, telemetry, thinking, tool-context, tokenizer, types, utils/yield). The entire `harness/` subtree is absent: omp pi-agent-core is 50 files / 747,085 bytes (measured with `find packages/agent/src -type f \| wc -l` and `find packages/agent/src -type f -exec stat -f %z {} + \| awk '{s+=$1} END {print s}'`) vs pi's 117 files / 1,145,928 bytes. omp also has no `MemorySessionRepo`, no `Session` interface, no `SessionReader`, no `SessionDirectory` (all measured 0 across packages/). | packages/server/src/types.ts:59 `ServerHost<TMetadata extends SessionMetadata = SessionMetadata>`; the type itself is pi's packages/agent/src/harness/session/types.ts:473 — a 6-field interface: `{ id: string; createdAt: number; storageVersion: number; cwd?: string; parentSessionId?: string; legacyParentSessionPath?: string }` | DECLARE IT LOCALLY in pi-server. Add the 6-field `SessionMetadata` interface verbatim to packages/server/src/types.ts and import it from there instead of from pi-agent-core, then delete the 7 pi-agent-core import lines. Rationale: (a) the other four agent-core symbols (Context, BACKGROUND_CONTEXT, TODO_CONTEXT, withAbortSignal) are re-exports of chord/context upstream, so repointing them to `@oh-my-pi/chord/context` leaves SessionMetadata as the ONLY residue; (b) omp has no durable-Session concept at all, so there is nothing in-tree for this type to alias to; (c) declaring it here makes pi-server landable as a standalone package instead of hostage to a much larger agent-core reconciliation that is out of scope for this spec. This is a deliberate, named deviation from verbatim — see open_questions[0] for the owner's call. |
| `server` (4/7) | **THAY THẾ BẰNG SHIM CỤC BỘ.** Hợp đồng quan sát được mà các test tuân thủ phải giữ nguyên: `resolveSession` trả 0 kết quả thì `SessionNotFoundError`, hơn 1 thì `SessionAmbiguousError`, đúng 1 thì trả metadata đó. Giữ đúng ranh giới: abstraction repository thật là việc của `pi-durable`. `TestServerHost` depends on `MemorySessionRepo`, a pi-agent-core session-repository abstraction with no omp counterpart and no obvious home. none — `grep -rn 'MemorySessionRepo' packages/` returns 0 hits. omp's closest analogue is packages/coding-agent/src/session/, which is a single-process session manager with no repository interface. | packages/server/src/testing/host.ts:3 `import { BACKGROUND_CONTEXT, MemorySessionRepo } from "@earendil-works/pi-agent-core";` and :153 `readonly repo = new MemorySessionRepo({ now: () => 1 });` — used by resolveSession (list), openSession (open), and seed (create) | REPLACE with a ~30-line in-file `TestSessionRepo` in src/testing/host.ts: keep a `Map<string, SessionMetadata>` plus an in-memory `Session` shim, and give it the three methods the harness calls (list/open/create) so the observable contract the conformance tests assert — resolveSession returns 0 matches → SessionNotFoundError, >1 → SessionAmbiguousError, exactly 1 → that metadata — is unchanged. Do NOT try to introduce a real session-repository abstraction here; that is pi-durable's job and it is a separate package in the wave. |
| `server` (5/7) | **GIỮ CẢ HAI — KHÔNG GỘP, và ghi khác biệt vào README mới để câu hỏi này được đóng.** Ba vận tải, ba mô hình xác thực, ba vòng đời; chúng sẽ bị nhầm cho bản sao của nhau nếu tài liệu không nói trước. Role overlap with the two packages the brief flagged. Neither is a functional duplicate, but both would be mistaken for one by a reader. packages/collab-web/src/lib/socket.ts (browser WebSocket to a relay room, AES-GCM sealed frames via codec.ts, 4-digit close codes 4001/4004/4009/4029 in RELAY_CLOSE_REASONS) and packages/collab-web/src/lib/link.ts (`wss://host/r/<roomId>.<base64url-key>`) vs packages/metaharness/src/server.ts:211 `Bun.serve({ port, routes, fetch })` — REST + SSE over HTTP for the benchmark run store. | packages/server/src/server.ts:136 `accept(connection: ByteConnection): ByteConnectionHandler` — accepts an already-authorized ordered byte stream. Zero HTTP, zero WebSocket, zero MCP anywhere in the package (verified: the only node:net import is transports/unix/listener.ts:4). | NO MERGE, and record the distinction in the new packages/server/README.md so the next reader does not re-litigate it. pi-server is: length-framed CBOR (pi-protocol) over a Unix socket, a hello/hello_error handshake with PROTOCOL_VERSION = 8, request/response/cancel plus out-of-band attachment and service_update messages, and per-attachment service routing. collab-web is: a WebSocket relay with browser-safe crypto, room-scoped, no handshake version gate. metaharness is: an HTTP/SSE process manager. Three different transports, three different auth models, three different lifecycles. The genuine adjacent art in omp is packages/coding-agent/src/collab/registry.ts (762 lines) and src/tiny/jsonl-socket.ts (49 lines) — both node:net + Unix-socket hosts, but newline-delimited JSON rather than length-framed CBOR, so they remain the idiomatic in-tree pattern for their own protocols and must NOT be refactored onto pi-server. |
| `server` (6/7) | **SẮP XẾP LẠI KHI CHÉP — 88 khai báo `private`, gấp protocol gấp 3 lần và hiện đang bị bỏ sót.** Cùng một vi phạm AGENTS.md "Class privacy" mà protocol (7/11) đã bắt buộc rewrite, áp dụng y hệt — sự im lặng ở đây còn nguy hiểm hơn, vì người đọc làm theo đúng tài liệu sẽ chép 88 khai báo bị cấm vào `packages/server` rồi tưởng đã xong. | 88 declarations: src/session-router.ts (18), src/server.ts (33), src/transports/unix/listener.ts (25), src/testing/host.ts (4), src/testing/client.ts (7), test/unix-connection.test.ts (1) | REWRITE all 88 to `#`, then update every `this.X`. Cả 88 đều là `private` thuần — `grep -rhoE '^\s*(private\|protected\|public)\s' server/src server/test \| awk '{print $1}' \| sort \| uniq -c` cho `88 private`, không có `public`/`protected` nào, và `grep -rnE 'constructor\([^)]*(private\|public\|protected\|readonly)' server/src` rỗng, tức KHÔNG có ngoại lệ "constructor parameter property" nào được dùng ở đây. Cổng xác minh là grep chứ không phải typecheck — xem protocol (7/11): `private` còn nguyên thì `check:ts` vẫn xanh. Chạy `grep -rEn '^\s*private\s' packages/server` phải trả 0. |
| `server` (7/7) | **SẮP XẾP LẠI KHI CHÉP — 9 `new Promise(` trong `src/`, chưa được đề cập ở đâu cả.** | server/src/server.ts:88, src/testing/host.ts:12, src/testing/client.ts:104, src/testing/client.ts:177, src/transports/unix/listener.ts:61, :238, :274, :339, :376 (thêm 1 chỗ nữa trong test: test/server.test.ts:47) | Xem lại từng chỗ: những chỗ giải từ socket event/timeout thì giữ (đúng lý do đã nêu ở client 2/8), nhưng bất kỳ chỗ nào chỉ là cặp resolve/reject thuần thì đổi sang `Promise.withResolvers()` theo AGENTS.md line 50. Riêng `server/src/testing/host.ts:7` export `class Deferred<T>` đã bọc sẵn resolve bên trong — `new Promise<T>((resolve) => { this.resolvePromise = resolve; })` ở dòng :12 — đây đúng là thứ `withResolvers` sinh ra, nên đừng để hai cơ chế cùng tồn tại trong cùng package. Cùng lớp lỗi này còn xuất hiện ở chord: `chord/src/context/index.ts:102` `return new Promise<T>((resolve, reject) => {`. |
| `client` (1/8) | **DÙNG BẢN CHUẨN CỦA omp, không nhân bản — va chạm mã thật duy nhất trong `client`.** Bề mặt công khai không đổi: `toError` không nằm trong barrel `index.ts` hôm nay và không được thêm vào. Khác biệt duy nhất là tên tham số, vô hại lúc chạy. `toError(error: unknown): Error` -- pi-client's local helper vs omp's canonical one in pi-utils. EXACT functional duplicates, and the only true code collision in the package. packages/utils/src/type-guards.ts:15 -- `export function toError(value: unknown): Error { return value instanceof Error ? value : new Error(String(value)); }`, re-exported by packages/utils/src/index.ts:41 (`export * from "./type-guards"`) so the public specifier is `import { toError } from "@oh-my-pi/pi-utils"` | packages/client/src/errors.ts:27 -- `export function toError(error: unknown): Error { return error instanceof Error ? error : new Error(String(error)); }` | REPLACE, do not duplicate. Delete the definition at src/errors.ts:27-29, add `import { toError } from "@oh-my-pi/pi-utils";` at the top of errors.ts, and keep `toDisconnectedError` (which calls it) exported from the same module -- connection.ts:10 and unix.ts:11 both import it from "./errors". This changes NO public surface: `toError` is not in the index.ts barrel today, and must not be added to it. Rationale is omp's own Central Utilities rule ('Two implementations of the same thing is a bug even when both work'). The one behavioural difference to be aware of: pi's parameter is named `error`, omp's is `value` -- irrelevant at runtime, and no call site uses named arguments, so nothing breaks. |
| `client` (2/8) | **XOÁ HẲN, KHÔNG CHÉP — quyết định có căn cứ, không phải dọn dẹp: chính file nguồn của pi đã ghi ở dòng 7 rằng nó nên bị bỏ.** Bốn `new Promise(` còn lại trong `src/` giữ nguyên: chúng phân giải từ sự kiện socket và timeout, không phải từ bộ phân giải hai giá trị. `PromiseResolvers<T>` / `createPromiseResolvers<T>()` -- pi's hand-rolled resolver pair, and its own source file says it should be deleted. `Promise.withResolvers` is already the house idiom: packages/agent/src/agent-loop.ts (3 uses), packages/agent/src/agent.ts (3), packages/agent/src/pause.ts (2), packages/agent/src/live-steering.ts:1, packages/agent/src/speculative-execution.ts:1. omp AGENTS.md: 'Promises: use `Promise.withResolvers()` instead of `new Promise((resolve, reject) => ...)`.' | packages/client/src/promise.ts:1-16 (whole file), whose line 7 doc comment reads: 'Remove in favor of `Promise.withResolvers()` when the repository's TypeScript lib baseline moves to ES2024.' | DELETE promise.ts entirely; do not copy it. Two call sites to rewrite: src/client.ts:248 `const { promise, resolve, reject } = createPromiseResolvers<T>();` -> `Promise.withResolvers<T>()`, and src/connection.ts:72 `const handshake = createPromiseResolvers<ServerHello>();` -> `Promise.withResolvers<ServerHello>()`. Then delete the `type PromiseResolvers` specifier from the connection.ts:11 import (it becomes `import { createPromiseResolvers, type PromiseResolvers } from "./promise.ts"` -> drop the whole line, since promise.ts no longer exists). Net effect: the file count drops from 8 src files to 7, and `toError` is the only errors.ts export that changes. The FOUR remaining `new Promise(` sites in src/ — unix.ts:109, unix.ts:188, unix.ts:251 and unix.ts:283 (`await new Promise<void>((resolve) => activeSocket.once("close", resolve));`, easy to miss because it takes only one argument) — KEEP their form: they resolve from socket events and timeouts, not from a two-value resolver, so `withResolvers` does not apply. |
| `client` (3/8) | **SẮP XẾP LẠI KHI CHÉP — đây là vi phạm quy tắc, không phải trùng tên.** Chỉ một chỗ trong toàn bộ package; cách viết đúng đã có sẵn trong cây để đối chiếu. `ReturnType<typeof setTimeout>` at src/unix.ts:247 -- a banned construct, and the only one in the package. N/A as a collision -- this is a rule violation, not a name clash. omp AGENTS.md: 'NEVER use `ReturnType<>` -- use the actual type name.' The idiomatic omp spelling is visible at packages/coding-agent/src/collab/relay-client.ts:100 (`#retryTimer: NodeJS.Timeout \| undefined;`). | packages/client/src/unix.ts:247 -- `let timeout: ReturnType<typeof setTimeout> \| undefined;` | REWRITE to `let timeout: NodeJS.Timeout \| undefined;`. Verified this is the ONLY `ReturnType<` in src/ or test/ (single hit). The variable is used at L252 (`timeout = setTimeout(...)`) and L256 (`timeout.unref()`), both of which are Node-compatible, so `NodeJS.Timeout` types correctly and preserves `.unref()`. |
| `client` (4/8) | **SẮP XẾP LẠI KHI CHÉP — đây là vi phạm quy tắc, không phải trùng tên.** Chỉ một file trong toàn bộ package cần sửa; ranh giới cần giữ: `MemoryByteServer`'s `messages` / `serverId` / `clientCloseCount` phải ở public vì test đọc chúng. 4 `private` field/method declarations in test/support.ts -- banned by omp's class-privacy rule. N/A as a collision -- rule violation. omp AGENTS.md: 'Class privacy: use ES `#private` fields; leave externally accessible members bare. No `private`/`protected`/`public` keyword on fields or methods, except on constructor parameter properties.' | packages/client/test/support.ts:14 (`private handlers?`), :15 (`private decoder`), :16 (`private readonly messageWaiters`), :76 (`private resolveMessageWaiters()`), plus 20 `this.X` references at L23,24,28,30,44(x2),51,55,56,60,61,65,66,71,72,77,78,80 | REWRITE the 4 declarations to `#handlers?`, `#decoder`, `#messageWaiters`, `#resolveMessageWaiters()` and update all 20 `this.X` sites to `this.#X`. This is the ONLY file in the package that needs it: `grep -n '^\s*\(private\\|public\\|protected\)\s'` over src/ and test/ returns hits in test/support.ts only -- all 8 src files already use ES `#` exclusively (verified: client.ts L63-74 has 12 `#` fields, connection.ts L42-45, unix.ts L148-153, L162-165). Note `MemoryByteServer`'s `messages` and `serverId` and `clientCloseCount` are public and must STAY public -- the tests read them. |
| `client` (5/8) | **GIỮ TÊN GỐC — chỗ dễ bị sửa "cho đẹp" nhất của cả lần di trú.** Không có export nào của hai tên nguyên bản trong omp; mối nguy thật là một file tương lai import cả `Client` của pi-client và `RpcClient` của coding-agent — gặp thì alias tại chỗ import. The bare class name `Client` and `Connection`. Not a collision in omp's code, but the highest-confusion risk in the migration because omp has 57 files containing the word `Client` and 20 containing `Connection`. Every omp hit is a strictly longer or unrelated name. Examples: `AuthBrokerClient` (packages/ai/src/auth-broker/client.ts:129), `AnthropicHttpClient` (packages/ai/src/providers/anthropic-client.ts:208), `AnthropicMessagesClient` (:191), `AnthropicUserProfilesClient` (:115), `CodexWebSocketTransportError` (packages/ai/src/providers/openai-codex-responses.ts:5092), `DapClient` (packages/coding-agent/src/dap/client.ts:54), `MCPWrappedTool` (packages/coding-agent/src/exa/mcp-client.ts:312), `HindsightApi` (packages/coding-agent/src/hindsight/client.ts:238), `IdaDatabase` (packages/coding-agent/src/ida/client.ts:152), and `RpcClient` (packages/coding-agent/src/modes/rpc/rpc-client.ts) -- which is the closest analogue by role. | packages/client/src/client.ts:62 (`export class Client`), packages/client/src/connection.ts:41 (`export class Connection`) | KEEP pi's names verbatim. Verified zero omp exports of either bare name: `git grep -n 'export class Client\b\|export { Client\|export type { Client' -- 'packages/*'` and the `Connection` equivalent both return empty. The real hazard is a FUTURE file that imports both pi-client's `Client` and coding-agent's `RpcClient`; if that happens, alias at the import site (`import { Client as RemoteSessionClient }`) rather than renaming the migrated class. Upstream name fidelity is the point of a copy-based migration -- do not 'improve' these names. |
| `client` (6/8) | **GIỮ TÊN GỐC — và ghi chú nhìn trước thuộc về đặc tả coding-agent, không phải ở đây.** Upstream pi's coding-agent đã phải alias class này (`ServerError as ClientServerError`) vì package đó định nghĩa `ServerError` riêng; khi coding-agent của omp bắt đầu dùng package này thì phải lặp lại alias đó. `ServerError` and `ProtocolErrorCode`/`ProtocolError` -- the class name pi's own coding-agent has to alias around. 0 exported `ServerError` in omp. `ProtocolError` matches exactly 1 file (packages/coding-agent/src/eval/py/runner.py:2246,2256) and both hits are a Python docstring and a string literal `"ename": "ProtocolError"` -- not TypeScript. `ProtocolErrorCode` has 0 refs. | packages/client/src/errors.ts:3 (`export class ServerError extends Error { readonly code: ProtocolErrorCode; ... }`), src/errors.ts:1 (imports `type ProtocolError, ProtocolErrorCode` from pi-protocol) | KEEP BOTH verbatim; no conflict today. The forward-looking note belongs to the coding-agent spec, not this one: upstream pi's coding-agent already imports this exact class under an alias (`import { ServerError as ClientServerError } from "@earendil-works/pi-client"` at packages/coding-agent/src/experimental/server.ts:14 and test/experimental-remote-runtime.test.ts:6), because that package defines its own `ServerError`. When omp's coding-agent starts consuming this package it must repeat that aliasing. Do NOT pre-emptively rename here -- the name is correct in isolation and renaming it would break the alias contract upstream already established. |
| `client` (7/8) | **CHƯA SỬA GÌ Ở BƯỚC NÀY — nhưng đường dẫn đã được đặt trước để hai đặc tả không lệch nhau khi ghép.** Tới lúc này package còn không có người tiêu dùng nào trong omp — một sự thật mà mục rủi ro phụ thuộc vào. The package name `@oh-my-pi/pi-client` and its intended consumer path `@oh-my-pi/pi-coding-agent/client`. packages/coding-agent/package.json has NO `./client` subpath in its exports map (verified: the full export list runs `.`, `./*`, `./async`, `./autoresearch`, `./capability`, `./cli/*`, ... `./web/*`, `./prompts/*`, `./*.js` -- no `./client`), and packages/coding-agent/src/ does NOT contain a `client/` directory. | packages/client/package.json:2 (`"name": "@earendil-works/pi-client"`), and packages/coding-agent/src/client/index.ts:1 in the pi repo (`export * from "@earendil-works/pi-client";`) | NO EDIT to omp's coding-agent in this step -- that is the coding-agent spec's job. But RECORD the reserved path here so the two specs agree: when coding-agent is wired, it gets `packages/coding-agent/src/client/index.ts` containing `export * from "@oh-my-pi/pi-client";` plus a `"./client"` entry in its exports map. That re-export is a star re-export, which satisfies omp's barrel rule. Until then this package has zero consumers in omp, which is a fact the risk section depends on. |
| `client` (8/8) | **ĐỔI BỘ CHẠY TEST — phần của client, không nằm trong dòng protocol (10/11).** | client/test/client.test.ts:1, client/test/unix.test.ts:1, client/test/unix-transport.test.ts:1 (3 file, `from "vitest"`), client/vitest.config.ts (463 byte) | REWRITE 3 import line sang `bun:test`, DELETE vitest.config.ts. Cần sửa thêm 2 call site `vi.waitFor` (client.test.ts:136, :155) — bun:test không export `waitFor`; xem protocol (10/11) để biết thay bằng gì. CHÚ Ý THỨ TỰ: client/test/unix.test.ts:7-9 import thẳng vào source của package đứng trước — `../../server/src/server.ts`, `../../server/src/testing/host.ts`, `../../server/src/transports/unix/listener.ts` — nên file này chỉ chạy được SAU khi `server` đã land. Thứ tự chord→protocol→server→client đã thỏa, nhưng phải ghi rõ để không copy client trước server. |


---


## Va chạm với thứ omp đã có (tiếp)

Bảng dưới đây ghi nốt các va chạm còn lại giữa sáu package chép từ pi và thứ omp đã có, cùng định mức giải quyết cho từng cái. Mỗi dòng nêu rõ phía omp bị trùng, neo phía pi, và cách giải quyết giữ nguyên chi tiết. **12 hàng `durable` còn nằm trong bảng là tài liệu tham khảo, không phải việc phải làm** — xem mục 5.

Lưu ý chung cho cả sáu package: `package.json` và `tsconfig.build.json` KHÔNG được chép nguyên văn. Năm package chép (chord, protocol, server, client, telemetry) mang script `tsc` — AGENTS.md:261 cấm tuyệt đối, nguyên văn là ``- Never use `tsc`/`npx tsc` — always `bun check`.`` — cùng `"test": "vitest --run"` và `"clean": "shx rm -rf dist"` (kéo theo dependency `shx` mà omp không dùng); `pi-evals` là ngoại lệ duy nhất, không mang script `tsc` cũng không có `tsconfig.build.json`. Không package nào của omp có tsconfig.build.json và không package nào chạy tsc: pattern của chúng là `check: "oxlint . && oxfmt --check … && bun run check:types"`, `check:types: "tsgo -p tsconfig.json --noEmit"`, `test: "bun test --parallel"`. Đây là vi phạm luật dự án nếu chép nguyên văn, không phải tu chỉnh thẩm mỹ.

| package | cái gì | neo phía pi | cách giải quyết |
|---|---|---|---|
| client | `ClientOptions`, `Unsubscribe` — trùng tên một phần, chỉ là văn xuôi tài liệu chứ không phải code. Phía omp: `ClientOptions` nằm trong chuỗi ví dụ của 2 file lint rule là packages/coding-agent/src/discovery/builtin-rules/ts-import-type.md:24,31,35 và ts-no-deprecated-leftovers.md:26,36; `Unsubscribe` nằm trong JSDoc và comment tại packages/coding-agent/src/mcp/client.ts:425, packages/coding-agent/src/extensibility/hooks/runner.ts:149, packages/coding-agent/src/mcp/manager.ts:505,1685. | packages/client/src/types.ts:25 (`ClientOptions`), :12 (`Unsubscribe`) | NO ACTION cho hai symbol này — nhưng KHÔNG phải cho cả package. omp không export type nào mang hai tên này; mọi kết quả khớp đều nằm trong string literal và comment nên không thể gây import mơ hồ. Ghi ở đây chỉ để người review sau grep hai tên này không nhầm thành va chạm thật. `package.json` thì phải sửa (xem lưu ý chung ở trên): `"build": "tsc -p tsconfig.build.json"`, `"typecheck": "tsc -p tsconfig.test.json"`, `"test": "vitest --run"`, `"clean": "shx rm -rf dist"` đều phải bỏ, cùng file `tsconfig.build.json` đi kèm. |
| durable | TruncationResult — cùng tên, KHÁC HÌNH DẠNG. Phía omp tại packages/tui/src/tools/streaming-output.ts:105-125 có 14 trường, 11 trong đó là OPTIONAL (bắt buộc chỉ có content, totalLines, totalBytes), KHÔNG có maxLines/maxBytes, và thêm 5 trường middle-truncation (elidedBytes/elidedLines/headLines/tailLines/partialByteWindows); truncatedBy chấp nhận thêm 'middle'. | src/env/utils/truncate.ts:15-38 (bắt buộc có 11 trường: content, truncated:boolean, truncatedBy 'lines' hoặc 'bytes' hoặc null, totalLines, totalBytes, outputLines:number, outputBytes:number, lastLinePartial:boolean, firstLineExceedsLimit:boolean, maxLines:number, maxBytes:number) | GIỮ omp. Không cắt sang phía durable. durable bỏ wrapper riêng để bổ sung 2 trường maxLines/maxBytes vào kết quả của pi-tui, vì src/env/utils/output-capture.ts:203 ĐỌC current.truncation.maxBytes để tính độ đo quét overlap. Cách này giữ 1 hình dạng duy nhất trong repo và không phải viết lại 1576 dòng streaming-output.ts đã dùng bởi cả TUI — nhưng KHÔNG phải là sửa 0 dòng: khai maxLines/maxBytes thành OPTIONAL trong TruncationResult của omp, sửa tối đa 2 dòng trong 1576 dòng đó (truncateHead :327 và truncateTail :431 phải set 2 trường đó khi có limit), và thêm fallback `?? DEFAULT_MAX_BYTES` tại src/env/utils/output-capture.ts:203 — thiếu fallback thì dòng đó không typecheck. |
| durable | truncateHead, truncateTail, TruncationOptions — cùng tên, cùng chữ ký, khác số trường trả về. Phía omp tại packages/tui/src/tools/streaming-output.ts:128 (TruncationOptions), :327 (truncateHead), :431 (truncateTail) — và cả ba ĐÃ ĐƯỢC re-export qua API công khai tại packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:55-60, đồng thời được 14 file src khác import. | src/env/utils/truncate.ts:132 (truncateHead), :220 (truncateTail), :40 (TruncationOptions) | XOÁ cả 3 khỏi durable, dùng bản của omp. Đây là cùng một phán quyết như formatSize (xoá hàm riêng) — không có lý do giữ một bản thứ hai. Người đọc làm đúng theo hàng TruncationResult ở trên mà bỏ hàng này sẽ chép nguyên văn truncateHead/truncateTail của durable đè lên bản omp đang chạy, đúng cái "hai implementation của cùng một thứ" mà hàng toError ở dưới cấm. |
| durable | DEFAULT_MAX_LINES — cùng tên, KHÁC GIÁ TRỊ. Phía omp tại packages/tui/src/tools/streaming-output.ts:10 có giá trị 3000. Đây là khác biệt quan sát được: một lệnh shell 2500 dòng sẽ bị durable cắt, không bị omp cắt. | src/env/utils/truncate.ts:11 (durable = 2000) | GIỮ omp (3000). durable luôn truyền limits tường minh qua OutputCapture (src/env/utils/output-capture.ts:46-47), nên default ít khi đường đanh tính. Bắt buộc nếu muốn giữ 2000 thì truyền rõ ràng, không dựa vào constant. |
| durable | truncateLine — cùng tên, KHÁC MARKER và KHÁC DEFAULT. Phía omp tại packages/tui/src/tools/streaming-output.ts:285-293 cắt ở 512 (DEFAULT_MAX_COLUMN) và chèn '…', kèm materializeString() để intern string của Bun. | src/env/utils/truncate.ts:338-346 (durable cắt ở 500, GREP_MAX_LINE_LENGTH, và chèn '... [truncated]') | GIỮ omp. Độ dài 2500/3000 dòng, dùng để hiển thị, không phải contract duy trì. Nếu cần hạn 500 thì truyền 500. |
| durable | Shell — cùng tên, KHÁC Ý NGHĨA hoàn toàn. Phía omp tại packages/coding-agent/src/cli/completion-gen.ts:20 là STRING-UNION 'bash', 'zsh', 'fish'. | src/env/index.ts:180-187 (durable là INTERFACE gồm exec và cleanup) | KHÔNG sửa gì cả hai bên — ở các package khác nhau nên không conflict. NHƯNG chặn canh: bảo đảm KHÔNG bao giờ merge durable/env vào một barrel chung với pi-coding-agent. Giữ nguyên. |
| durable | Context — cùng tên, KHÁC Ý NGHĨA. Phía omp tại packages/ai/src/types.ts:1476 là {systemPrompt, messages, tools, inactiveTools}, tức context của một request model. | src/types.ts:1, src/session/session.ts:1 (durable import Context từ chord, tức context nền và hủy) | KHÔNG đổi tên. durable nhập ĐÚNG từ @oh-my-pi/chord nên không bao giờ nhập Context từ pi-ai. Khi wiring lại trong omp, phải truyền chord Context (BACKGROUND_CONTEXT) — truyền nhầm pi-ai Context sẽ lỗi type, đây là biên cảnh báo phải ghi vào README. |
| durable | JsonObject — cùng tên, KHÁC HÌNH DẠNG. Phía omp tại packages/ai/src/utils/schema/types.ts:1 là Record<string, unknown>. | src/types.ts:6 (durable là { [key: string]: JsonValue } với JsonValue từ chord) | GIỮ durable. Riêng durable KHÔNG import JsonObject từ pi-ai nên không conflict trực tiếp. Nhưng BẮT BUỘC không re-export cả hai vào cùng một barrel — nếu cần, đặt lại tên thành DurableJsonObject ở khe biên giới. |
| durable | toError — cùng tên, cùng chức năng, KHÁC XỬ LÝ. Phía omp tại packages/utils/src/type-guards.ts:15 đã có sẵn. | src/env/index.ts:24-32 (durable thử Error rồi string rồi JSON.stringify rồi String) | DÙNG BẢN CỦA omp. Xóa hàm trong durable, import { toError } từ @oh-my-pi/pi-utils. AGENTS.md quy định tìm helper có sẵn trước khi viết mới, hai implementation của cùng một thứ dù cùng chạy vẫn là bug. |
| durable | formatSize — cùng tên, khác hàm. Phía omp có formatBytes trong pi-tui/render/render-utils, đã được alias ở packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1596. | src/env/utils/truncate.ts:115-123 (durable là helper in kích thước byte) | DÙNG BẰNG formatBytes của omp. Xóa hàm riêng khi cắt truncate.ts. Giữ utf8ByteLength vì omp chỉ có bản private trong một file không xuất. |
| durable | Node SQLite adapter dùng node:sqlite, trong khi omp dùng bun:sqlite ở 51 file src. Phía omp: packages/catalog/src/model-cache.ts:5, packages/coding-agent/src/session/agent-storage.ts:1 dùng bun:sqlite, cùng pi-utils openSqliteDatabaseSync. AGENTS.md quy định Bun trước Node. | src/storage/sqlite/node.ts:3-4 (import DatabaseSync từ node:sqlite) | VIẾT adapter bun:sqlite mới cho SqliteDatabase facade (src/storage/sqlite/database.ts:26) — facade 31 dòng nên adapter mới khoảng 60 dòng, tái dùng 100% SqliteStorage 809 dòng. Giữ bản node:sqlite sau phía subpath /storage/sqlite/node để không phá API công khai. |
| durable | NodeExecutionEnv dùng node:child_process spawn, trong khi omp chỉ còn 2 file MÃ NGUỒN dùng node:child_process — packages/metaharness/src/runner.ts và packages/natives/native/loader-state.js (thêm 5 file test nữa: 4 ở packages/ai/test/, 1 ở packages/coding-agent/test/agent-session-bash-detach.test.ts). AGENTS.md quy định Bun Over Node và cấm spawn shell khi có API. | src/env/node.ts:1 (spawn từ node:child_process) | Đổi sang Bun.spawn. Đây là file nguy hiểm nhất của package (963 dòng, streaming kèm spill và adaptive publish). LÀM MỘT PR RIÊNG, không gộp với migration. Mạng an toàn KHÔNG phải 14 test: durable có 17 file test với 195 lời gọi test()/it() thuần (cộng 2 it.each và 4 it.skipIf), riêng 3 file `env-node*` đã có 50, và tất cả chạy bằng `vitest --run` — omp không có vitest, nên phải port sang `bun:test` TRƯỚC khi đụng vào file. Ngoài ra cổng `bun test` sẽ ĐỎ cho mọi file kéo theo pi_natives nếu addon chưa build: `bun test ./packages/natives/test/native.test.ts` fail với `Failed to load pi_natives native addon for darwin-arm64`, còn `bun --cwd=packages/natives run build` fail với `CMake Error: CMake was unable to find a build program corresponding to "Ninja"` vì `ninja` chưa cài. Cả hai đều là **tiền đề tái lập được, không phải hạn chế của máy**: `brew install ninja` rồi `bun --cwd=packages/natives run build` một lần (exit 0, đã chạy) là toàn bộ mạng này chạy được. KHÔNG đánh dấu PR này là đã kiểm chứng khi bạn chưa chạy bước build đó. |
| durable | Vị trí đặt: omp packages/agent/ và pi-ref packages/agent/ giao nhau 12 tên file trên 50 (omp) so với 117 (pi) — agent-loop.ts, agent.ts, branch-summarization.ts, compaction.ts, entries.ts, index.ts, messages.ts, proxy.ts, telemetry.ts, tool-context.ts, types.ts, utils.ts. (Con số 5 chỉ là giao của file `.ts` ở ĐỈNH thư mục; 50/117 là đếm đệ quy, nên hai con số phải cùng cách đo.) Cả agent-loop.ts lệch khối lượng lớn (148KB omp so với 26KB pi). durable là sức EXTEND của pi, không phải bản sao. Phía omp: packages/agent/src/. | packages/agent/src/harness/{session,utils} (pi) so với packages/agent/src (omp) | Đặt durable ở packages/durable/ mới — KHÔNG bao giờ ghi đè packages/agent/. Cùng bộ các đặc tả trong pi packages/agent/src/harness/utils/{truncate,output-capture,adaptive-publisher}.ts là TIỀN THÂN của durable, nên khi migrate agent phải khớp — đã ghi vào open_questions. Lưu ý `telemetry.ts` nằm trong 12 tên đó: file telemetry.ts 2114 dòng / 78 KB của omp là nền của cả 5 hàng telemetry ở trên, đừng bao giờ để bản sao pi ghi đè nó. |
| telemetry | `AttributeValue` — scalar/array union của pi-telemetry đối đầu với `AttributeValue` của @opentelemetry/api. Phía omp: packages/agent/src/telemetry.ts:44 (import), :2100 (hàm setSpanAttribute(span, key, value: AttributeValue)); thêm packages/coding-agent/src/telemetry-export-otlp.ts:25,:399. | packages/telemetry/src/index.ts:1 | GIỮ nguyên tên và hình dạng của pi — nó thuộc public API được chép, đổi tên sẽ phá mọi schema pi ở downstream. Hiện không conflict compile vì omp không bao giờ re-export `AttributeValue` của OTEL khỏi barrel (chỉ re-export `Attributes`, `Span`, `SpanKind`, `SpanStatusCode`, `Tracer`, `trace`, telemetry.ts:2106). Ràng buộc giao cho agent spec: khi omp agent nhận TelemetryContext, alias phía OTEL tại chỗ import (import { type AttributeValue as OtelAttributeValue }) và KHÔNG dùng export sao trong packages/agent/src/index.ts cho package telemetry, vì barrel đó đã có export sao từ ./telemetry (index.ts:24) và một `AttributeValue` trong tương lai sẽ thành star export mơ hồ. |
| telemetry | `SpanOptions` và `SpanStatus` — pi định nghĩa {name, attributes?} và {status 'ok' hoặc 'error'}, đối đầu với OTEL {attributes?, links?, startTime?, kind?} và {code, message?}. Phía omp: packages/agent/test/run-summary.test.ts:27-28 (import từ @opentelemetry/api), :37, :45, :83 — test này tự lăn fake `Tracer` với startSpan(name, options?: SpanOptions) và setStatus(status: SpanStatus). | packages/telemetry/src/index.ts:7 và :12 | GIỮ nguyên tên của pi. Hai bên sống trong module khác nhau nên hiện không va nhau. KHÔNG được gom chúng lại — phía pi là contract callback-scoped, phía OTEL là wire type của span tức thì, gộp sẽ ép một trong hai test double phải đổi. Cùng ràng buộc barrel như trên: agent spec phải dùng named re-export alias tường minh (đúng như pi làm tại packages/agent/src/index.ts:19-37) thay vì star re-export package telemetry. |
| telemetry | `startSpan` — pi là callback-scoped startSpan(options, callback) trả Promise<T> (span chỉ sống trong callback), đối đầu với helper tức thì startSpan(telemetry, kind, name, options) của omp và Tracer.startSpan(name, options, ctx) của OTEL. Phía omp: packages/agent/src/telemetry.ts:466 (helper private của module) và :500 (telemetry.tracer.startSpan(...)); tổng 14 chỗ nhắc startSpan trong omp. | packages/telemetry/src/index.ts:15 (TelemetryContext.startSpan), src/memory.ts:199, src/noop.ts:3 | GIỮ hình dạng của pi. Cùng tên, mô hình vòng đời ngược nhau — đây là va chạm tinh thần rủi ro nhất cả đợt migrate vì cả hai đều gọi là `startSpan` và đều sinh ra thứ gọi là span. Giảm thiểu ở bước chép: package này không định nghĩa binding `startSpan` trần nào, nên nội bộ packages/telemetry không conflict. Nguy cơ thật nằm ở file TƯƠNG LAI import cả `TelemetryContext` lẫn telemetry của omp agent; file đó không được alias import nào thành tên trần `startSpan`. |
| telemetry | `TelemetrySpan` (pi) so với `TelemetrySpanKind` (omp) — tên gần giống nhau, symbol không liên quan. Phía omp: packages/agent/src/telemetry.ts:181 (export type TelemetrySpanKind gồm 4 giá trị "invoke_agent", "chat", "execute_tool", "handoff"). | packages/telemetry/src/index.ts:18 | Không làm gì, không đổi tên. `TelemetrySpanKind` là string union 4 giá trị về tên operation OTEL; `TelemetrySpan` là interface ghi nhận. Đổi tên bên nào cũng làm lệch khỏi pi mà vô ích. Ghi ở đây chỉ để lần grep 'TelemetrySpan' sau này không báo va chạm giả. |
| telemetry | VA CHẠM KHÁI NIỆM, không phải chữ: omp đã có HAI thứ telemetry và pi thêm thứ ba. Chúng không trùng lặp và không được gộp. Phía omp: packages/agent/src/telemetry.ts (2114 dòng, một OTEL EMITTER thật sự sinh Span object của @opentelemetry/api và export OTLP) và packages/stats (dashboard SQLite cục bộ: db.ts 74 KB, parser.ts 24 KB, trace.ts 41 KB — đọc session JSONL, không bao giờ gửi gì đi). | packages/telemetry/src/index.ts:14-22 (contract callback) kèm README.md:365-372 ('Pi Package Integration') | GIỮ CẢ BA, theo thứ tự phụ thuộc nghiêm: (1) @oh-my-pi/pi-telemetry là CONTRACT trung lập vendor — zero I/O, zero vendor, zero network, chỉ định nghĩa span là gì. (2) packages/agent/src/telemetry.ts là EMITTER của omp gắn contract đó vào OTEL/OTLP. (3) packages/stats là READER cục bộ biến session log thành dashboard. Stats là cục bộ (không gì rời máy); agent telemetry là remote (OTLP); pi telemetry không thuộc bên nào — nó là từ vựng hai bên kia về sau dùng chung. Điểm tích hợp là `RecordedTelemetrySpan` (memory.ts:16): nó là hình dạng chuẩn mà mọi emitter omp phải sinh ra để được bao bởi `createTelemetryAdapterConformance`, nhờ đó OTEL và in-memory chứng minh tương đương. KHÔNG port emitter của pi vào file OTEL của omp và KHÔNG để stats phụ thuộc telemetry vội — nối contract vào omp agent là việc của AGENT spec, không phải của telemetry. |
| evals | readStoredCredential — CÙNG TÊN, KHÁC SIGNATURE. Phía omp tại packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1469 là readStoredCredential(provider), tự giải auth.json qua AuthStorage.create() và không nhận path. | packages/evals/src/harness.ts:314 (pi là readStoredCredential(provider, authPath) tại packages/coding-agent/src/core/auth-storage.ts:496) | GIỮ bản của omp. Toàn bộ ý nghĩa của eval harness là đọc credential từ một agent dir CÔ LẬP trước khi session tồn tại; bản của omp đọc AuthStorage toàn cục của process và sẽ lặng lẽ dùng auth.json thật của developer trong ~/.omp/agent/auth.json — rò credential của developer vào container rồi container hạ đặc quyền. Signature của omp cũng là thứ lời gọi 2-arg chỉ compile trúng một cách tình cờ. Giải path tường minh (authPath bằng join(hostAgentDir,'auth.json')) rồi đọc file trực tiếp, hoặc thêm tham số thứ hai optional cho hàm của omp. |
| evals | CreateAgentSessionOptions.tools và .noTools KHÔNG TỒN TẠI trong omp. Phía omp: CreateAgentSessionOptions tại packages/coding-agent/src/sdk.ts:495 có customTools và extensions nhưng không có tools lẫn noTools. | packages/evals/src/harness.ts:53-55 (harness của pi type PiCodingAgentHarnessOptions.tools và .noTools thành CreateAgentSessionOptions['tools'] và ['noTools'] rồi forward cho createAgentSessionFromServices) | GIỮ interface của omp; retype option của harness thành `string[]` thuần rồi map lên session construction của omp. 6 cái tên DOCUMENTATION_EVAL_TOOLS ('read','write','edit','grep','find','ls') phải được xác minh là tồn tại trong tool registry của omp đúng các tên đó — nếu omp đã đổi tên cái nào, control arm sẽ lặng lẽ chạy với toolset nhỏ hơn, đúng kiểu vi phạm protocol thầm lặng mà các eval này tồn tại để ngăn. |
| evals | ModelRuntime không tồn tại ở đâu trong omp. Phía omp: hoàn toàn không có packages/coding-agent/src/core/; gần nhất là packages/coding-agent/src/sdk.ts:495 (authStorage/modelRegistry) và model manager của packages/catalog. | packages/evals/src/harness.ts:316-327; packages/evals/evals/configured-runtime.ts:56-119 (pi tại packages/coding-agent/src/core/model-runtime.ts:153) | BLOCKING cho các eval thăm dò model, non-blocking cho phần còn lại. KHÔNG tạo shim ModelRuntime cho qua compile bản chép. Trỏ lại vào ModelRegistry kèm AuthStorage kèm getModel của omp và chấp nhận rằng models.docs.eval.ts, openai-provider.docs.eval.ts, custom-provider.docs.eval.ts (3 trên 7 eval suite) nằm ngoài scope tới khi đợt reconcile đó xong. Con số 7 là toàn bộ `evals/*.eval.ts`; trong 4 eval còn lại thì CHỈ documentation-audit.eval.ts và extensions.docs.eval.ts đã được phân tích ở các hàng dưới, còn smoke.eval.ts và tui.docs.eval.ts có hai hàng riêng. Thứ tự ship thật KHÔNG phải report.ts trước: src/report.ts:5-6 import cứng @vitest-evals/core và @vitest-evals/core/node, nên nó không compile cho tới khi 2 import đó được thay (xem hàng vitest ở dưới). Đúng là plan.ts (không import gì ngoài chính nó) → evals/acme-server.ts (chỉ import node:http) → report.ts (sau khi đã thay 2 import) → src/harness.ts (sau khi đã viết lại tầng harness trên bun) → các unit test. |
| evals | createAgentSessionServices và createAgentSessionFromServices không tồn tại trong omp. Phía omp: createAgentSession tại packages/coding-agent/src/sdk.ts:1485 là entry point duy nhất, trả {session, ...} trực tiếp, không có services object dựng riêng. | packages/evals/src/harness.ts:337-355 (pi tại packages/coding-agent/src/core/agent-session-services.ts:135,202) | GIỮ createAgentSession của omp. Hình hai bước services/attach là kiến trúc plugin của pi; omp không theo. Harness phải truyền cwd/agentDir/model/thinkingLevel/customTools/extensions trong một lời gọi. Xác minh session.reload() và session.abort() vẫn tồn tại trên AgentSession trả về — harness.ts dòng 376 và 370 phụ thuộc cả hai, và 'reload' là bước làm nên các eval configure-your-own-installation. |
| evals | InlineExtension không tồn tại trong omp; omp gọi cùng khái niệm là ExtensionFactory, và tên event dùng để viết lại system prompt cũng khác. Phía omp: packages/coding-agent/src/sdk.ts:593 (`extensions?: ExtensionFactory[]`, trong `CreateAgentSessionOptions` bắt đầu ở :495); packages/coding-agent/src/extensibility/extensions/types.ts. | packages/evals/src/harness.ts:287-301 (harness của pi đăng ký một inline extension ẩn nghe 'before_agent_start' rồi thay prompt) | GIỮ ExtensionFactory của omp. Nhưng KHÔNG được cho rằng tên hook mang sang nguyên: phải xác minh hook thật của omp cho việc viết lại system prompt trước khi prompt chạy. Nếu chưa có, thêm mới — đây là gap chính đáng, vì toàn bộ thí nghiệm with_docs/without_docs được định nghĩa bằng một khác biệt system prompt, và khe viết lại prompt là bắt buộc cho MỌI phép đo doc-lift. Ghi chú comment của pi tại dòng 388-389: prompt bị ép không được ghi vào transcript, đó là lý do harness giữ lại value của chính transform. |
| evals | getDocsPath, getExamplesPath, getReadmePath không tồn tại trong omp (đã xác minh 0 định nghĩa). Phía omp: mới — không có. | packages/evals/test/harness.test.ts:2 (import cả ba để assert các file doc mà một variant nên hoặc không nên có) | THAY, không thêm lại. Các helper đường dẫn doc mà pi dùng không phải API của omp. Suy ra các đường dẫn doc kỳ vọng từ mảng `files` trong package.json của chính `packages/coding-agent` của omp, vì đó mới là contract đã ship — và lưu ý nó đã liệt kê `README.md`, `CHANGELOG.md` và `examples` nhưng KHÔNG có mục `docs`, khác với pi. |
| evals | Thư mục 'docs' mà cả thí nghiệm lột bỏ không nằm cùng chỗ. Phía omp: coding-agent ship README.md, CHANGELOG.md, examples/ — và không có docs/; doc hướng tới người dùng của omp nằm ở ./docs repo-root, và bundle của nó mang thêm dist/docs-index.generated.txt chỉ omp mới có, chống lưng cho URL scheme omp:// docs. | packages/evals/docker/Dockerfile:15-19; docker/entrypoint.ts:49-61; evals/documentation-audit.eval.ts:33 (pi xóa packages/coding-agent/{README.md,CHANGELOG.md,docs,examples} trong image without_docs và assert đúng tập đó) | RETARGET tập doc, không xóa khái niệm. Nhánh without_docs phải lột đúng thứ model của omp thật sự nhìn thấy: README.md, CHANGELOG.md, examples/, và dist/docs-index.generated.txt (riêng omp mới có — lột nó là một NHÁNH MỚI mà pi không có tương đương, bỏ qua sẽ để treatment đọc doc mà control không đọc được). Riêng documentation-audit.eval.ts glob một thư mục không tồn tại trong omp nên sẽ phát hiện ZERO case — một no-op thầm lặng, kiểu hỏng tệ nhất của package. Hoặc trỏ nó sang docs thật của omp, hoặc đừng port. |
| evals | Pipeline cài đặt release-tarball của pi không có tương đương trong omp. Phía omp: mới — không có (thư mục scripts/ của omp có ci-release-*.ts kèm release.ts, publish từ source; main của coding-agent là ./src/index.ts và artifact dist duy nhất là dist/cli.js). | packages/evals/docker/install-runtime.mjs:5-6; docker/entrypoint.ts:102-105,32 (import getPublicWorkspacePackages/packReleasePackages/installCodingAgentConsumer từ scripts/release-packages.mjs và scripts/coding-agent-consumer.mjs — cả hai file đều không tồn tại trong omp; rồi entrypoint assert pi-coding-agent resolve ra dist/index.js kèm npm-shrinkwrap.json) | REBUILD, không port. Trong omp không có compiled runtime cài qua npm để image. Các hướng thực tế là (a) mount source workspace omp vào container rồi chạy CLI từ source bằng bun — mất bảo đảm 'resolve từ dist' nhưng được trung thực với cách developer thật chạy omp; hoặc (b) mở rộng scripts/release.ts để nhả packed tarball rồi viết helper consumer còn thiếu. Khuyến nghị (a) cho lát cắt đầu: nhỏ hơn, không thể drift khỏi source, và assertion dist-resolution mà nó bỏ là check riêng của pi-release, không phải security control. |
| evals | Tên 'eval' đụng một subsystem lớn không liên quan của omp. Phía omp: packages/coding-agent/src/eval/ gồm 59 file (56 .ts, 2 .py, 1 .txt) thực thi sandbox JS/Python, kernel session, speculation evaluator và workpool bridge; bên cạnh là packages/coding-agent/src/if-bench/ và src/judgment/. Package packages/evals mới ở repo root không đụng trên đĩa, nhưng chữ 'eval' trong review omp từ đây mang hai nghĩa không liên quan. | packages/evals/ (cả package) | GIỮ cả hai, nhưng gọi tên khái niệm trong văn xuôi. Package mới đánh giá AGENT BEHAVIOUR (agent có tự cấu hình installation của chính nó đúng không); subsystem eval/ sẵn có đánh giá UNTRUSTED CODE do agent viết. Trong docs, changelog và commit message gọi cái mới là 'behavioural evals', và đừng bao giờ thêm nó vào các bucket tên `eval` sẵn có của scripts/ci-test-ts.ts mà không kèm comment. Cân nhắc một dòng trong packages/evals/README.md ngay trang đầu nói rõ điều này. |
| evals | vitest không tồn tại trong omp — 10 chỗ `from "vitest"`, 8 chỗ `from "vitest-evals"` (7 trong `evals/*.eval.ts` + src/harness.ts:33), 2 chỗ `from "vitest/config"` (tổng 20 dòng import trong mã, cộng 1 trong README.md:114 là 21), 2 file config, 2 cờ reporter liên tiếp tại docker/entrypoint.ts:140-141 (`--reporter=vitest-evals/reporter` và `--reporter=json`), và một root vitest.base.ts mà omp không có. Toàn bộ runner, project split, và cơ chế discovery (`vitest list --json`) đều gắn vitest. Phía omp: mới — không có (omp chạy bun test qua scripts/ci-test-ts.ts, glob `*.test.ts` rồi chia bucket package theo tên). | packages/evals/vitest.evals.config.ts; vitest.test.config.ts; docker/entrypoint.ts:120,132-143; 10 chỗ `from 'vitest'`, 8 chỗ `from 'vitest-evals'`, 2 chỗ `from 'vitest/config'` | ĐỪNG coi vitest là phần lớn — nó chỉ là một trong BA gốc rễ. `vitest-evals` và `@vitest-evals/core` (cùng `autoevals`) cũng không tồn tại trong omp, không có tương đương bun, và là thứ cung cấp DSL `describeEval` + các judge. Chúng nằm TRONG đúng những file mà bảng bảo ship sớm: src/harness.ts:33 import 11 symbol từ `vitest-evals/harness`, src/report.ts:5-6 import từ `@vitest-evals/core` và `@vitest-evals/core/node`. Tầng đó là VIẾT LẠI, không phải đổi import. Đổi import trong test file chỉ cứu được 4 file, và cả 4 đều cần thứ khác xong trước: test/plan.test.ts và test/acme-server.test.ts là đổi một dòng import thật sự (chúng chỉ kéo src/plan.ts và evals/acme-server.ts, không kéo tầng vitest-evals nào), còn test/comparison.test.ts và test/report.test.ts kéo src/report.ts nên phải chờ 2 import @vitest-evals/core ở trên được thay. test/harness.test.ts và test/configured-runtime.test.ts không port được (xem hai hàng tương ứng), và 7 file `*.eval.ts` thì không file nào port được. Runner nhánh docker không có tương đương bun và đó là lý do comparison runner chỉ được viết lại. Không thêm vitest. |
| evals | session.resourceLoader không tồn tại trên AgentSession của omp. Phía omp: session.extensionRunner là getter tại packages/coding-agent/src/session/agent-session.ts:12155, nhưng không có resourceLoader. | packages/evals/evals/extensions.docs.eval.ts:12,18-19 (đọc session.resourceLoader.getExtensions() vừa cho danh sách extension đã load vừa cho tool set từng extension) | TRỎ lại vào bề mặt extension của omp một khi đã xác định; extensionRunner có thể optional (trả `ExtensionRunner` hoặc `undefined`), nên mapper output port sang phải xử lý case undefined thay vì cho rằng có. Đây là eval giá trị nhất trong bảy cái (chứng minh agent tạo rồi dùng được một tool extension), nên đáng làm kỹ — nhưng đó là viết lại, không phải chép. |
| evals | `tui.docs.eval.ts` — file eval LỚN NHẤT (8.4 KB), chưa được phân tích ở hàng nào cả, và dính BA blocker đã biết. Phía omp: không có. | packages/evals/evals/tui.docs.eval.ts:10-11 (createAgentSessionFromServices + AgentSessionServices), :12 (Levenshtein từ autoevals), :13 (createJudge + describeEval từ vitest-evals) | BLOCKING. Không chép được dòng nào. Rewrite: dùng `createAgentSession` một lời gọi của omp (xem hàng createAgentSessionFromServices ở trên), thay `Levenshtein` bằng hàm so khớp chuỗi tự viết hoặc bỏ metric đó, và viết lại tầng judge. Cần một quyết định riêng: hoặc port, hoặc ghi rõ là out-of-scope. Đừng để nó rơi. |
| evals | `smoke.eval.ts` — dùng `noTools: "all"`, tức đúng option mà hàng CreateAgentSessionOptions ở trên nói không tồn tại trong omp; đồng thời import `describeEval` từ vitest-evals. Phía omp: không có. | packages/evals/evals/smoke.eval.ts:2 (vitest-evals), :5 (`createPiCodingAgentHarness({ noTools: "all" })`) | RETYPE. Đây là eval nhỏ nhất (681 B) và là smoke test nên nên port sớm nhất. `noTools: "all"` → dùng `customTools: []` cộng tắt discovery, hoặc thêm `noTools` optional vào `CreateAgentSessionOptions` của omp nếu đó là ngữ nghĩa đúng. Vẫn cần thay tầng `describeEval`. |


---


## Định nghĩa hoàn thành

Mỗi dòng dưới đây lấy nguyên văn điều kiện từ trường `gate` của bản ghi package. Không dòng nào được coi là đã xanh: các cổng mới được viết ra, chưa chạy trên cây có sáu package.

| package | điều kiện phải đúng | bằng chứng cụ thể |
| --- | --- | --- |
| `chord` | `bun run check:ts` exit 0 sau khi 64 file đã vào `packages/chord`. | Exit code của `bun run check:ts` chạy từ gốc repo. Đây là toàn bộ điều kiện mà bản ghi ghi cho `chord` — không kèm `bun test packages/chord`, dù `test_files` liệt kê 21 mục — 19 file test (`.test.ts`), cộng `packages/chord/test/helpers.ts` và `packages/chord/test/delta-tracker/retention.worker.ts`. Chưa có mặc định — cần bạn quyết có chạy test trong cổng này không. |
| `protocol` | Ba cổng: GATE 1 `bun run check:ts` exit 0 (oxlint + oxfmt + tsgo); GATE 1b sáu lệnh grep về `@earendil-works/`, đuôi `.ts"` trong specifier tương đối, `private`, `vitest`, `any` / `ReturnType<` / `await import(` cùng dòng LICENSE `Copyright (c) 2025 Mario Zechner` — tất cả trả 0 dòng khớp; GATE 2 `bun test packages/protocol` xanh 28 case (9 framing, 13 protocol, 6 CBOR) — CHẠY ĐƯỢC NGAY. Đồ thị phụ thuộc của `protocol` chỉ gồm `chord` và typebox; không import `@oh-my-pi/pi-ai`/`pi-tui`/`pi-agent-core`/`pi-utils`, nên không đi qua native addon. Cổng này KHÔNG phụ thuộc `brew install ninja`. | `gate_can_fail` ghi `[true, false]`. Bản ghi ghi GATE 2 là CURRENTLY BLOCKED, nhưng lý do đó không đúng: `bun test packages/protocol` không chạm vào native addon. GATE 1 và GATE 1b được đánh dấu chạy được ngay. Lưu ý phép đọc: bản ghi có ba cổng nhưng `gate_can_fail` chỉ có hai phần tử và không ghi ánh xạ phần tử nào ứng với cổng nào — phần tử `false` ứng với GATE 2, nhưng nhãn CURRENTLY BLOCKED mà bản ghi gắn cho nó là do suy đoán sai, không phải do môi trường. |
| `server` | `bun run check:ts` exit 0 và `bun test packages/server` xanh 41 case (20 conformance, 6 protocol, 6 server, 6 unix, 2 listener, 1 unix-connection). | `gate_can_fail` ghi `[true]`, không có phần tử `false`. Nhưng chính chữ cổng ghi `bun test packages/server` bị chặn cho tới khi `brew install ninja` và `bun --cwd=packages/natives run build` chạy xong — đó là tiền đề tái lập được chứ không phải hạn chế của máy: build xong một lần thì cả hai nhánh của cổng đều mở. Vì vậy nửa test của `server` KHÔNG được đánh dấu xanh nếu bạn chưa chạy bước build đó, dù mảng `gate_can_fail` không chứa `false` — đây là chỗ trường `gate_can_fail` không đủ để phát biểu. |
| `client` | `bun run check:ts` exit 0. | Exit code của `bun run check:ts`. Bản ghi không kèm cổng `bun test packages/client`, dù `why_this_position` nói rõ 8/33 test không viết được nếu chưa có `server`; đếm lại trên cây nguồn `client` có 27 test (`client.test.ts` 15, `unix-transport.test.ts` 4, `unix.test.ts` 8), không phải 33 — nên phần còn lại là 19 chứ không phải 25. Cũng không có `test.each` hay vòng lặp sinh test nào. 27 test đó không cổng nào đụng tới. Chưa có mặc định — cần bạn quyết cổng test của `client` có tồn tại hay không. |
| `telemetry` | `bun run check:ts` exit 0. | Exit code của `bun run check:ts`. Bản ghi không kèm `bun test packages/telemetry` dù `test_files` có `packages/telemetry/test/telemetry.test.ts` và `packages/telemetry/test/conformance.test.ts`. Chưa có mặc định — cần bạn quyết. |
| `evals` | `bun run check:ts` exit 0 (oxlint + oxfmt + tsgo trên `packages/evals`) VÀ `oxlint packages/evals` sạch VÀ, sau khi cài `ninja` và build natives, `bun test packages/evals` qua 4/4 file VÀ `grep -rn '@earendil-works' packages/evals` không trả gì VÀ `grep -rnE 'from "(@?vitest\|autoevals)' packages/evals` không trả gì VÀ `packages/evals` xuất hiện trong `scripts/ci-test-ts.ts` VÀ `packages/evals/NOTICE` chứa nguyên văn dòng `Copyright (c) 2025 Mario Zechner` cùng toàn bộ permission notice. | Exit code từng lệnh, nội dung thực tế của `packages/evals/NOTICE`, và vị trí dòng ghi `packages/evals` trong `scripts/ci-test-ts.ts`. Nhánh `bun test packages/evals` được ghi là chỉ chạy được "once ninja is installed and natives are built" — đó là tiền đề tái lập được, và nó đã được đáp trên máy này (`brew install ninja` + `bun --cwd=packages/natives run build`, exit 0). Thực tế bốn file này không kéo addon nào, nên cổng đã chạy được cả khi addon chưa build: **32 pass / 0 fail, 4 file** trên bản chép. Bốn file test chỉ chưa có kết quả trong cây đích vì `evals` chưa được port vào, không phải vì môi trường. Lưu ý thêm: `evals` dùng `NOTICE` cho dòng bản quyền, khác `chord`, `protocol` và `client` dùng `LICENSE`. |
| `AGENTS.md` (áp cho cả 6) | `grep -rn 'private ' packages/{chord,protocol,server,client,telemetry,evals}/src` == 0; `grep -rn 'ReturnType<' .../src` == 0; `grep -rn 'new Promise(' .../src` == 0; `grep -rn 'await import(' .../src` == 0; `grep -rn 'console\.' packages/evals/src` == 0. | Số đếm thật trên `src/` ở d6af72e, đo đúng trên glob sáu package trong cổng: `private` 87 (server) + 30 (protocol) + 1 (telemetry); `ReturnType<` 3 (chord) + 1 (client); `new Promise(` 2 (server); `console.` 3 (evals). Không cổng nào hiện nay grep các mẫu này ngoài GATE 1b của `protocol`. |

**Cả đợt migrate xong khi nào.** Đợt này xong khi cả sáu package — `chord`, `protocol`, `server`, `client`, `telemetry`, `evals` — đã nằm trong cây, `bun run check:ts` xanh, **và** mọi cổng `bun test` trong bảng trên đã có kết quả — 28 case `protocol`, 41 case `server`, và 4/4 file `evals`. `check:ts` xanh một mình KHÔNG đủ: nó không chạy một test nào. Không phải khi sáu PR đã mở. Sáu PR có thể cùng mở trong khi `chord` chưa có mặt, lúc đó `protocol` (hai symbol `JsonValue`, `isJsonValue`), `server` (10 symbol) và `client` (16 symbol) đều không biên dịch được. Trạng thái đích là một cây, không phải một danh sách PR.

## Những điều chưa được kiểm chứng

- **Đợt này được đặc tả bằng cách đọc code và chạy lệnh, không phải bằng cách thực thi.** Chưa một dòng nào được chép. Sáu package ở bảng trên chưa vào cây, nên không cổng nào ở Mục 1 có kết quả chạy để báo. Bảng chỉ nêu điều kiện phải đúng và bằng chứng sẽ dùng để phán đoán — không phải bằng chứng đã thu thập.
- **Các cổng được viết ra nhưng chưa chạy thử lần nào trên cây đích.** Baseline duy nhất ghi trong bản ghi là của GATE 1 `protocol` (exit 0, 24.2s), và đó là baseline của repo trước khi sáu package tồn tại.
- **`server` và `evals` là hai cổng bản ghi gọi là bị chặn — nhưng nguyên nhân là tiền đề tái lập được, không phải hạn chế của máy.** Bản ghi ghi `packages/natives` chưa build và đòi `brew install ninja` rồi `bun --cwd=packages/natives run build`; bước đó đã chạy exit 0 trên máy này (sinh `packages/natives/native/pi_natives.darwin-arm64.node`), và trên máy sạch nó chỉ là thiếu build — chết ngay ở bước import với `Failed to load pi_natives native addon for darwin-arm64`. Hệ quả cũ không lan sang cả sáu package: `server` import `@earendil-works/pi-agent-core` và `evals` import `@earendil-works/pi-coding-agent` + `pi-ai`; cả ba map sang package omp đã có, và chỉ fail lúc import khi addon chưa build. `chord`, `protocol`, `client`, `telemetry` chỉ import node builtin + `chord` + typebox, đều chạy được ngay cả khi chưa build addon. Còn lại: 41 case của `server` và 4 file của `evals` chưa có kết quả trong cây đích vì sáu package chưa được port, không phải vì môi trường; 28 case của `protocol` chạy được ngay.
- **Mọi neo `file:line` là ảnh chụp tại một thời điểm.** Ví dụ `src/node/bundle.ts:4` cho import `esbuild` của `chord`; `protocol.ts:1` và `codec.ts:1` cho hai import sang `chord`, với định nghĩa ở `chord/src/types.ts:21` và `chord/src/json.ts:74`; `src/types.ts:3` cho import `Message` của `durable`; `src/unix.ts:247` cho `ReturnType<typeof setTimeout>` của `client`; `src/errors.ts:27` cho bản `toError` cục bộ; `src/env/utils/truncate.ts:15` cho `TruncationResult` và `src/env/index.ts:180` cho interface `Shell` của `durable`; `packages/ai/src/types.ts:1476` cho `Context` của omp; `packages/coding-agent/src/security/contracts/validation.ts:10-14` cho idiom kiểm schema thay `Check`; `packages/coding-agent/src/core/model-runtime.ts:153` cho `ModelRuntime` ở phía `pi-ref`. Cả cây `pi-ref` lẫn cây omp đều đã dịch chuyển; phải dò lại từng neo trước khi dùng.
- **Tiền đề drain của M1 W1/W2 đã bị bác, và việc đó cần một thay đổi riêng.** Bản ghi của `chord` ghi nó là "SEMANTIC CONFLICT, and the M1 W2 premise is false" — M1 W1/W2 từng tuyên bố đã port tay drain ngược thứ tự cộng cô lập lỗi từ `pi-ref/packages/chord/src/facets/host.ts:125-142`. Kiểm chứng lúc đặc tả: `drainDisposers` không tồn tại trong omp, và bốn vòng drain vẫn là `for (const dispose of this.#X.splice(0)) dispose();` thuận thứ tự, không try/catch. Hai thiết kế này cố ý khác nhau. Chép `chord` không sửa được cái thứ hai — nếu chép, `packages/chord` mang về một thiết kế drain khác hẳn, và câu hỏi có giữ hay không thiết kế drain thuận thứ tự của omp phải được quyết riêng, trong một thay đổi không nằm trong đợt chép sáu package này.
- **Chỗ chưa có mặc định — cần bạn quyết:**
  - `typebox@1.3.27` hay `@oh-my-pi/omptype/typebox` cho `protocol`. Bản ghi ghi đây là "the single decision that blocks the package" và để nó ở `open_questions[0]`, nên chưa có mặc định. `server` và `client` kế thừa câu trả lời này vì cả hai đều phụ thuộc `pi-protocol`. Bản ghi còn viết "four other specs inherit the answer" nhưng không liệt kê bốn cái đó, nên không đoán tên.
  - `chord`, `client`, `telemetry`: cổng ghi chỉ có `bun run check:ts`, không kèm cổng test, dù lần lượt có 21, 5 và 2 mục trong `test_files`. Có đưa `bun test` vào cổng hay không — chưa có mặc định.
  - `evals`: `new_deps` khai bốn package cùng họ (`vitest@4.1.9`, `vitest-evals@0.15.0`, `@vitest-evals/core@0.15.0`, `autoevals@0.3.0`) làm runner, còn cổng lại yêu cầu không còn import vitest nào. Grep `from "vitest` của bản ghi không bắt được `@vitest-evals/core` vì có dấu `@` ngay sau dấu `"` — phải dùng `from "(@?vitest|autoevals)`. Bản ghi không nói cái nào thắng.
  - `server`: `gate_can_fail` là `[true]` trong khi chữ cổng tự nói `bun test packages/server` bị chặn. Không có cách nào để sửa bất đồng này từ dữ liệu.
  - `protocol`: ba cổng nhưng `gate_can_fail` chỉ hai phần tử, không ghi ánh xạ phần tử nào ứng với cổng nào.
