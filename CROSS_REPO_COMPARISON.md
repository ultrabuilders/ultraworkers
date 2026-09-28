# SO SÁNH HỆ THỐNG — OMP VỚI CÁC REPO THAM CHIẾU

Tài liệu này trả lời một câu duy nhất, bằng lệnh thật: **omp thiếu gì so với mọi thứ có thể học, và cái nào
không nên học.** Mỗi miền trả lời đủ mọi cây, kể cả khi kết luận là "không có" — vì đó cũng là dữ liệu.

## Các cây đo được

| Repo | HEAD | File `.ts`+`.tsx` | Dòng `.ts`+`.tsx` | Giấy phép |
|---|---|---|---|---|
| `omp` | `9cfbaba` | 5.522 | 1.695.782 | MIT (3 chủ) |
| `senpi` | `ea92162` | 5.554 | 955.527 | MIT (2 chủ) |
| `gajae` | `5c52314` | 4.474 | 1.781.490 | MIT |
| `pi` | `d6af72e` | 1.591 | 379.654 | MIT (1 chủ) |
| `opencode` | `39021df` | 4.355 (3.639 + 716 TSX) | 853.502 | MIT |
| `codex` | `e72da2b` | 758 | 11.477 | **Apache-2.0** |

> **Cách đo, để người đọc chạy lại được:** `cd <repo> && git ls-files '*.ts' '*.tsx' | wc -l`, và
> `git ls-files -z '*.ts' '*.tsx' | xargs -0 wc -l | awk '$NF!="total"{s+=$1} END{print s}'`.
>
> **Ba cái bẫy tôi vấp phải khi đo, để người sau không vấp lại:**
> 1. `xargs` **tự chia nhỏ** khi đường dẫn dài, nên `tail -1` cho bạn tổng của *lô cuối*, không phải
>    tổng chung. `awk` phải loại dòng `total` của **từng** lô: `'$NF!="total"'`.
> 2. `git -C <repo> ls-files` in đường dẫn **tương đối với repo đó**, còn `xargs wc` chạy ở thư mục
>    hiện tại. Phải `cd` vào repo trước, nếu không `wc` không tìm thấy file nào và tổng ra 0.
> 3. Nhiều pathspec của `git ls-files` là **hợp nhất (union)**, không giao. `git ls-files '<dir>/' '*.ts'`
>    ra **toàn bộ** file `.ts` của cả repo, không phải file trong `<dir>/`.
>
> Số của `omp` là **5.522 file / 1.695.782 dòng**. Con số 5.325 tôi dùng suốt phiên trước là do
> `find packages -name '*.ts'` — bỏ sót file ở gốc repo. Riêng `pi` tôi còn ghi **1.564**; đo lại
> bằng `git ls-files` ra **1.591**. Đã sửa.

## Bốn điều chỉnh nền tảng — và chúng đảo ngược cách tôi đặt vấn đề

### 1. `gajae` KHÔNG phải repo tham chiếu độc lập. Nó là fork của chính dòng omp.

Đo: `crates/pi-ast`, `crates/pi-iso` còn nguyên; `packages/ai/src/model-thinking.ts` và `packages/agent/src`
dùng chung đường dẫn. Nó còn **mới hơn `pi`**. Những gì `gajae` làm thêm là **hướng đi của một fork**,
không phải chuẩn để học vào. Nó vẫn có giá trị — nhưng phải đọc với con dấu đó.

### 2. `pi` không có MCP, cũng không có ACP.

Đo: `git ls-files | grep -ic mcp` → **0**; `grep -ic acp` → **0**. Hàng duy nhất nhắc MCP là một
optional peerDependency của `@google/genai`, không phải code của `pi`. `protocol`/`client`/`server` của
`pi` là **CBOR trên Unix socket** để điều phối nội bộ, không phải MCP.

### 3. `chord` KHÔNG phải cơ chế vòng đời extension.

Đo: **0 file** trong `core/extensions/` import `chord`; `chord` chỉ xuất hiện trong `experimental/`.
Vòng đời extension của `pi` là `core/extensions/` — **4.506 dòng**, tự quản lý. Ai thật sự phụ thuộc
`chord`: `durable` 35 file · `server` 9 · `client` 5.

Nên "chép `chord` để có vòng đời extension" là **sai đích**. Đã sửa trong `MILESTONE_1B_EXECUTION_PLAN.md`.

### 4. `senpi` là fork của `pi` — nên M1B có hai nguồn, không phải một.

Đo: `packages/` của senpi có 13 mục, `pi` có 12; senpi thêm `pty` và `senpi-codemode`. Cả hai đều có
`chord`, `protocol`, `client`, `server`, `telemetry`, `evals` — cùng tên, cùng tác giả. `LICENSE` của
senpi ghi **cả** Mario Zechner (upstream) lẫn Yeongyu Kim, và cả hai đều MIT. Tức là senpi = `pi` +
40 builtin extension (97.893 dòng) + 2 package mới.

Hệ quả: M1B chép 7 package từ `pi` — nhưng `senpi` **cũng** có 6/7 package đó, và là bản đang được
đội người dùng thật duy trì. Câu hỏi "chép từ đâu" giờ có hai đáp án và chưa chốt được.
Xem `SENPI_FINDINGS.md` và mục 5 của `MILESTONE_1B_EXECUTION_PLAN.md`.

## Hai việc thật, tìm ra khi so chứ không phải khi đọc

Cả hai nằm trong **code của chính omp**, và cả hai đều do so sánh mới lộ ra:

- **MCP protocol chậm hai thế hệ.** `packages/coding-agent/src/mcp/types.ts:175` ghim
  `MCP_PROTOCOL_VERSION = "2025-11-25"`, không có đường thoái lui. Lỗi sẽ **âm thầm**: tool trả về rỗng
  thay vì ném lỗi. opencode đã xử lý `2026-07-28`.
- **`approvalMode` fail-open.** `tools/approval.ts:80`:
  `isApprovalMode(configured) ? configured : "yolo"`. Khi **không có** settings thì rơi về `always-ask`
  (đường `:75`), nên cài mới vẫn an toàn — nhưng khi settings **có** mà khoá thiếu/sai kiểu thì rơi về
  `yolo`. Nên rơi về `always-ask`.

## Một việc thật nữa, và nó đảo ngược M1B: omp đang tự lành dữ liệu hỏng

Đây là kết luận nghiêm trọng nhất của cả tài liệu, và nó nằm ở miền session/storage.

- omp có `parseJsonlLenient` (`packages/utils/src/stream.ts:575`, có callback `onMalformedRecord`).
  `gajae` có cùng hàm ở `stream.ts:434` (không callback). `pi`, `opencode`, `codex` **không có**.
- omp đếm dòng hỏng → `session-manager.ts:1882` đặt `#rewriteRequired` → lần persist sau ghi lại
  thân file, dòng hỏng **biến mất vĩnh viễn**.
- `pi` ném `JsonlCorruptionError` (`durable/src/storage/jsonl/storage.ts:119`) và **không** có đường
  thoát nào ngoài việc ném.

Nên trong 5 repo, omp đứng đầu ở đúng trục "chịu được file hỏng" — và **chép nguyên xi session layer
của `pi` sẽ làm nó tệ đi**. Đã sửa `MILESTONE_1B_EXECUTION_PLAN.md` mục 5, và đánh dấu lại dòng
`src/storage/jsonl/storage.ts` trong bảng chép.

## Nơi omp thắng — và đừng để ai xóa

| | omp | so với |
|---|---|---|
| LSP | 10.392 dòng | gấp 2,5× `gajae`, **26×** `codex`; `pi` bằng 0 |
| Test/fixture MCP | 83 file | `opencode` 13 |
| Transport MCP | giữ cả 3 | `gajae` đã **bỏ** `sse.ts` |
| Phụ thuộc SDK chính thức | **0 hit** | không repo nào dùng |
| Mặc định giá model | 5.522/5.522 có `cacheRead`+`cacheWrite` | `codex` **0** trường giá |
| Chính sách model trong `.kdl` | 8.909 dòng, cấm viết bằng TS | `gajae` đã **gỡ KDL** → 86 model id hardcode |
| **Tự lành JSONL hỏng** | `parseJsonlLenient` + `#rewriteRequired` | `pi`/`opencode`/`codex` **không có** |
| **Nói thẳng giới hạn độ bền** | `session-manager.ts:690` *"not power-loss safe"* | cả 5 repo đều không an toàn mất điện, **chỉ omp nói ra** |
| Giữ chỗ session (retention) | gc 30 ngày, 20 global / 10 theo cwd | `opencode` **không có** retention nào |

Dòng KDL là phép thử tự nhiên: `gajae` từng có KDL, đã bỏ, và hậu quả đo được là
`model-thinking.ts` 1.179 dòng chứa **86 model id hardcode** — đúng thứ `AGENTS.md` của omp cấm.

## Mục lục

- **Miền 1 — Hệ thống extension / plugin** — Bề mặt đăng ký, vòng đời, và khả năng chạy ngoài repo. Đây là miền M5.
- **Miền 2 — Model, provider, giá, fallback** — Định tuyến model, chính sách giá, và hành vi khi provider hỏng.
- **Miền 3 — Tools, quyền, sandbox, phê duyệt** — Cơ chế approval, sandbox ở mức OS, và cách công cụ được cho phép.
- **Miền 4 — MCP, ACP, tương thích agent khác** — Giao thức ngoài, transport, và mức độ tương thích với agent khác.
- **Miền 5 — Session, lưu trữ, khôi phục** — Miền nơi omp đang đứng đầu, và nơi M1B sắp làm hỏng. Đọc mục này trước khi chép gì từ `pi`.

---

# Miền 1 — Hệ thống extension / plugin

## Miền: Hệ thống extension/plugin  omp so với 4 repo tham chiếu

Đo tại chỗ, không clone. Mọi khẳng định kèm lệnh + đường dẫn + số dòng.
Ngày đo: 2026-09-28. omp @ `1dd1e87` (branch `milestone-1`).

## Kiểm lại số đã đo

| Số đã cho | Lệnh kiểm | Kết quả |
| --- | --- | --- |
| `pi` 12 package | `ls packages/` tại `pi-ref` | 12 — khớp |
| `omp` 16 package | `ls packages/` | 16 — khớp |
| `omp` có `pi.register*` | xem bên dưới | Có, và **rộng hơn pi** ở 6 điểm |
| `registerMode/Setting/StatusLineSegment` chưa có | `grep -cE "registerMode\|registerSetting\|registerStatusLine" -- 'packages/**'` | **0** — xác nhận chưa có |

---

## per_repo

| Repo | Có gì | Bằng chứng | Kích thước |
| --- | --- | --- | --- |
| **omp** | 3 họ plugin: extension (TS in-process), npm plugin (`bun install` vào `~/.omp/plugins`), marketplace (`.claude-plugin/plugin.json` + registry). Loader đọc **22 format ngoại lai**. Teardown 3 tầng. Cô lập lỗi per-handler. Chạy ngoài repo qua `home` + `cwd` roots. | `extensibility/` 21.241 dòng; `extensibility/`+`discovery/` = **30.698** | 85 file test (`test/`, không phải `src/`) |
| **pi** | 1 họ extension duy nhất (`core/extensions`). 24 method `register*/set*`. Không marketplace, không installer, không plugin-deps. Teardown chỉ qua event `session_shutdown` + `dispose()` tuỳ chọn trong component factory. | `core/extensions/` **4.506** dòng; `chord/` = 17.651 dòng | 625 test file toàn repo |
| **opencode** | 27 namespace, 3 tầng teardown (Registration.dispose → per-plugin Cleanup → registry close), rollback generation khi reload fail, disable bằng glob, storage namespace. **Không sandbox, không timeout, không abort.** | `core/src/plugin/*` 24 file 2.871; `packages/plugin/src` 60 file 3.068; `config/plugin` 21 file 1.761; `core/src/plugin.ts` 300 | test `core/test/plugin` 48 file **12.501** (1,5× infra) |
| **codex** | 47.665 dòng Rust nhưng **khai báo, không phải mã tự do**: manifest chỉ có `skills`/`mcpServers`/`hooks`/`apps`/`interface`. Marketplace đầy đủ (policy, upgrade, share/reconcile qua app-server). | `codex-rs/core-plugins/src` **47.665**; `marketplace.rs` 36 KB, `marketplace_policy.rs` 21 KB, `marketplace_upgrade.rs` 12 KB | `manager.rs` 144 KB / `loader.rs` 67 KB |
| **gajae** | 3 họ plugin (gjc-bundle, npm, marketplace) — omp chỉ có 2. **Có `plugin-quarantine.ts` (377 dòng) + `plugin-restore.ts` (59) mà omp không có.** API gần như trùng omp. | `extensibility/`+`discovery/` src non-test **29.433** | khác omp 1.354 dòng ở `types.ts`, 2.698 ở `runner.ts` — không file nào trùng byte |

### Đối chiếu API: omp vs pi (nguồn: `types.ts` mỗi repo)

Chung **20** method. Chỉ có ở pi, thiếu ở omp: **4**.
Chỉ có ở omp, không có ở pi: **6**.

```
thiếu ở omp : registerMarkdownTransformer setHiddenThinkingLabel
              setWorkingIndicator setWorkingVisible
chỉ có ở omp: registerAssistantThinkingRenderer registerComposerShape
              registerFileDeleteFallback registerFileWriteFallback
              setTimeout setInterval
```

### Đối chiếu API: omp vs gajae

Chung 19. Chỉ có ở gajae: `setQueueMode`, `setThinkingVisibility`,
`setThinkingVisibilityForControl`, `setModelTemporaryForControl`,
`setThinkingLevelForControl`. Chỉ có ở omp: 7 (xem trên, gồm
`unregisterProvider`). Không repo nào có `registerMode/Setting/StatusLine`.

---

## omp thiếu gì

Xếp theo mức độ thiếu thật, không theo thứ tự repo.

### 1. `registerMarkdownTransformer` (pi) — thiếu thật, rẻ

pi có `types.ts:1490`, omp có **0** occurrence. Đây là 1 method duy nhất trong
4 mục thiếu mà không thuần "UI cosmetic": nó biến nội dung render của agent.
Ước lượng ~150–250 dòng (type + hook trong runner + test). Chỉ làm nếu có
extension nào thật sự cần.

### 2. Quarantine + restore (gajae) — thiếu thật, đáng lấy

omp: `git ls-files | grep -i quarantine` → chỉ trả về
`openai-responses-tool-quarantine.test.ts` và `corrupt-model-quarantine.test.ts`
(không liên quan plugin). Không có cơ chế tắt bền vững một plugin hỏng.

gajae có `plugin-quarantine.ts` 377 dòng + `plugin-restore.ts` 59 dòng, và nó
**tắt theo đúng bit bền vững mà mỗi họ plugin đã tiêu thụ sẵn** — không cài,
không import, không thực thi code plugin. Đây là "disable an toàn" mà omp
thiếu: omp có `disabled` list nhưng không có đường **audit + hoàn tác**.

### 3. Rollback generation khi reload fail (opencode) — thiếu thật, vừa phải

opencode `core/src/plugin.ts:156-169`: reload hỏng → quay về generation cũ.
omp `runner.ts:745` chỉ *"drop the prior generation"* trước khi nạp lại —
tức là nếu plugin mới ném lỗi, thứ đã bị tháo đã mất. Không có rollback.

Đây là hậu quả thật: extension hỏng sau khi sửa = mất state của các
extension đang chạy, không phải chỉ báo lỗi.

### 4. 3 họ plugin (gajae có, omp không) — thiếu thật, đắt

gajae có `extensibility/gjc-plugins/` — họ plugin bundle riêng, cộng với npm
và marketplace. omp chỉ có npm + marketplace. Bundle là họ thứ ba với vòng
đời enable riêng. **Không đề xuất lấy** trừ khi có nhu cầu bundle nội bộ.

### 5. `setQueueMode`, `setThinkingVisibility*` (gajae) — thiếu, không lấy

Chỉ là thao tác TUI. Không có consumer nào trong repo omp chờ các bản này.

### 6. `setWorkingIndicator` / `setWorkingVisible` / `setHiddenThinkingLabel` (pi)

Cosmetic. omp đã có `setWorkingMessage`. Không lấy.

### 7. Test gấp hơn hạ tầng (opencode) — thiếu, đáng cân nhắc

opencode có 12.501 dòng test cho 8.066 dòng hạ tầng (1,5×). omp có 85 file
test nhưng tôi chưa đo tỉ lệ dòng. Đây là mục **cần đo riêng**, không kết luận
vội trong báo cáo này.

---

## Kết luận

### `làm`

1. **`registerMarkdownTransformer`** — 1 method, ~150–250 dòng, là hợp đồng
   render thật. Rẻ nhất trong danh sách.
2. **Quarantine + restore** (theo gajae) — ~436 dòng tham chiếu. omp có đường
   `disabled` nhưng không có đường **audit và hoàn tác**. Plugin hỏng thì người
   dùng không có cách nào tắt vĩnh viễn ngoài việc sửa tay file config.

### `làm nếu có điều kiện`

3. **Rollback generation** khi reload fail (theo opencode) — chỉ nếu omp thật sự
   hỗ trợ reload extension trong tiến trình đang chạy. Nếu reload chỉ xảy ra ở
   startup thì vấn đề không tồn tại và không cần làm.
4. **Đo tỉ lệ test** trước khi quyết định có theo opencode hay không. Chưa đủ
   dữ liệu trong báo cáo này.

### `không làm`

5. **Không lấy hệ sandbox của opencode** — và không cần. opencode chạy plugin
   in-process, chung Effect runtime, **không timeout, không abort**:
   `grep -n "timeout|AbortSignal|abort"` trên `plugin.ts`, `module.ts`,
   `supervisor.ts`, `host.ts` → không match. `setup` treo là treo boot. omp
   đã có `setTimeout`/`setInterval` managed (`managed-timers.ts`, dọn khi
   teardown) và `AbortSignal` trong context — **omp mạnh hơn opencode ở đúng
   chỗ opencode yếu**. Không có gì để học.
6. **Không lấy `chord` như cơ chế vòng đời extension.** Đây là phát hiện quan
   trọng nhất của lần đo này. `chord` mô tả mình là *"Application composition
   runtime for services, replicated state, RPC, and plugins"*, nhưng:
   - `git grep -c "chord" -- 'packages/coding-agent/src/core/extensions/**'` → **0**
   - chord chỉ được import trong `src/experimental/**` (40 file)
   - `core/extensions/` (đường ổn định) **không dùng chord một lần nào**

   Tức chord là runtime thử nghiệm cho client/server/durable, **không phải** hạ
   tầng vòng đời của hệ extension ổn định. M1B nên chép chord cho M2 (client/
   server/durable) nếu cần, nhưng **không được kỳ vọng nó thay thế được
   vòng đời extension** — phần đó `core/extensions/` đã tự làm với 4.506 dòng.
7. **Không lấy hệ marketplace của codex.** Cả 47.665 dòng Rust đó là hệ
   **khai báo**: `manifest.rs` chỉ có `skills`/`mcpServers`/`hooks`/`apps`/
   `interface`. Nó không chạy JS tự do. Chuyển sang omp tốn hàng chục nghìn
   dòng Rust để mua một mô hình khác hẳn, mà omp — vốn đã in-process — sẽ mất
   đi cả lợi thế "plugin viết bằng TS". Chi tiết đáng lấy: **policy** cho
   marketplace (`marketplace_policy.rs`, 21 KB) và **upgrade**
   (`marketplace_upgrade.rs`, 12 KB).
8. **Không lấy `setWorkingIndicator`/`setWorkingVisible`/`setHiddenThinkingLabel`** — cosmetic, omp đã có `setWorkingMessage`.
9. **Không lấy họ plugin bundle của gajae** (trừ khi có nhu cầu nội bộ).

---

## Chi phí

| Việc | Dòng tham chiếu | Ghi chú |
| --- | --- | --- |
| `registerMarkdownTransformer` | ~150–250 (ước lượng từ `pi types.ts:1490`) | Chưa đo chính xác; cần đọc runner của pi để chốt |
| Quarantine + restore | 436 (gajae `plugin-quarantine.ts` 377 + `plugin-restore.ts` 59) | Bản gajae viết cho 3 họ plugin; omp 2 họ → bản port **nhỏ hơn** |
| Rollback generation | ~150 (opencode `core/src/plugin.ts:129-169`) | Chỉ khi reload-at-runtime tồn tại |
| **Tổng nên làm** | **~600–800 dòng** | Không cần package mới, không cần chép gì |

**Chi phí bỏ qua:** bản `chord` 17.651 dòng có thể bị hiểu nhầm là bắt buộc cho
extension. Nó không phải vậy — và nếu M1B kéo chord vào với kỳ vọng nó giải
quyết vòng đời extension thì đó là 17.651 dòng không giải quyết đúng thứ cần.

**Cái mất nếu bỏ qua:** không có gì lớn. 4 API method thiếu đều là cosmetic hoặc
một method render; vòng đời, cô lập lỗi, chạy ngoài repo, marketplace, cài
plugin kèm dependency — omp đã có hết và ở vài chỗ mạnh hơn cả pi lẫn opencode.

---

# Miền 2 — Model, provider, giá, fallback

## Miền: So sánh tầng model/provider: omp vs pi, opencode, codex, gajae

Miền: **định tuyến model, provider, tính giá, fallback**.
Ngày đo: 2026-09-28. Tất cả số đo chạy tại chỗ, không clone.

> Lưu ý về baseline đã cho: `5.325 file / 1.657.301 dòng` của omp là phép đo `find packages -name '*.ts'`
> (chỉ trong `packages/`, bỏ file ở gốc). Đo lại bằng `git ls-files` cho **5.522 file / 1.695.782 dòng TS+TSX**
> toàn repo. `git ls-tree -r HEAD` cũng ra 5.522 → không phải do file chưa commit. Các con số còn lại khớp
> hoặc lệch nhẹ: pi 1.591/379.654 (thay vì 1.564/377.103), gajae 4.474/1.781.490, opencode 4.355 TS+TSX
> (= 3.639 TS + 716 TSX ✓), codex 758 TS + 4.925 Rust ✓. Giấy phép: pi MIT · opencode MIT · codex Apache-2.0 ·
> gajae MIT — **cả bốn đều đúng**.

---

## Bối cảnh then chốt: quan hệ huyết thống

Trước khi so bảng, một sự thật làm thay đổi cách đọc toàn bộ phần còn lại:

```
$ head -3 omp/LICENSE   → MIT License  Copyright (c) 2025 Mario Zechner
$ head -3 pi/LICENSE    → MIT License  Copyright (c) 2025 Mario Zechner
```

Cùng một tác giả, cùng một giấy phép, và **4 tên package trùng** (`agent`, `ai`, `coding-agent`, `tui`).
**omp là hậu duệ của pi, không phải ngang hàng.** Với pi, "port" nghĩa là *chép cơ học có biến đổi*, không
phải viết lại — khớp với commit `1dd1e87 docs: package reorganization plan — make future copies from pi mechanical`.

Và quan trọng hơn: **gajae là một nhánh của chính dòng omp** nhưng đã gỡ tầng KDL đi. Đó là phép thử
tự nhiên (counterfactual) trả lời chính câu hỏi "đừng phá KDL" — xem `## Kết luận`.

---

## per_repo

| repo | Có gì | Bằng chứng (lệnh) | Kích thước |
|---|---|---|---|
| **omp** | 73 provider · 5.522 model · **tầng chính sách KDL** · cache SQLite 2h · fallback ở tầng credential | `python3 -c` đếm `packages/catalog/src/models.json`; `git ls-files packages/catalog/src/compat/rules \| grep -c kdl`; `grep -n DEFAULT_CACHE_TTL packages/catalog/src/model-manager.ts` | 221 file `.kdl` = **8.909 dòng** → `rules.json` **319.653 byte**; compiler `scripts/compat-compiler/` 2.815 dòng; discovery 15.542 dòng; provider-models 9.206 dòng; auth+broker+gateway **17.806 dòng** |
| **pi** | 42 provider · model data **không commit** · codegen TS 3.545 dòng · fallback chỉ lúc resolve | `grep -c 'from "./providers/' packages/ai/src/models.generated.ts`; `git check-ignore -v packages/ai/src/providers/data/anthropic.json`; `wc -l packages/ai/scripts/generate-models.ts` | `ai/src` 25.407 dòng; 42 file `.models.ts` chỉ **588 dòng** (chỉ là stub re-export); `model-catalog.ts` 81 dòng |
| **opencode** | 223 provider · 8.179 model · **không có tầng chính sách** · refresh 5 phút | `python3 -c` đếm `packages/core/src/models-dev/snapshot.txt`; `grep -n 'Duration.minutes(5)' packages/core/src/models-dev.ts` | `models-dev.ts` 453 dòng; `snapshot.txt` **4,7 MB / 101.969 dòng** (1 dòng JSON); 46 module provider |
| **codex** | **5 provider** · **10 model** · Rust · không giá · reroute **chỉ vì an toàn** | `sed -n '650,683p' codex-rs/model-provider-info/src/lib.rs`; `python3 -c` đếm `models.json`; `grep -A2 'enum ModelRerouteReason' codex-rs/protocol/src/protocol.rs` | `models.json` 1.436 dòng (51 khoá/model); `models-manager` 5.234 dòng; `model-provider` 8.158 dòng; `model-provider-info` 1.924 dòng |
| **gajae** | 57 provider · 4.670 model · **0 file `.kdl`** · chính sách nằm trong TS | `find . -name '*.kdl' \| wc -l` → **0**; `grep -oE '"[a-z0-9][a-z0-9._/-]{4,}"' packages/ai/src/model-thinking.ts \| sort -u \| wc -l` | `models.json` **101.969 dòng / 2,1 MB**; `model-pricing.ts` **101 dòng** hằng số giá; `model-thinking.ts` 1.179 dòng với **86 id model hardcode** |

---

## 1. Danh sách model lấy ở đâu

**omp** — file sinh ra, **có commit, khép kín**.
`models.json` (5.522 model, 73 provider) + `rules.json` (320 KB) đều nằm trong git:
```
$ git ls-files packages/catalog/src/compat/rules.json   → packages/catalog/src/compat/rules.json
$ git ls-files packages/catalog/src/compat/ | grep -cE '\.kdl$'   → 221
```
Ngoài ra còn có tầng khám phá runtime: `discovery/` 15.542 dòng + `provider-models/` 9.206 dòng.
Thang phân giải được khai báo tường minh trong `model-manager.ts:88`:
```ts
export type ModelResolutionSource = "bundled" | "cache" | "models.dev" | "provider";
```
→ `bundled` → `cache` → `models.dev` → gọi thẳng provider. Không cần mạng để resolve chính sách.

**pi** — file sinh ra, **KHÔNG commit**. Đây là phát hiện đáng chú ý nhất về mặt kỹ thuật:
```
$ git check-ignore -v packages/ai/src/providers/data/anthropic.json
.gitignore:11:packages/ai/src/providers/data/    packages/ai/src/providers/data/anthropic.json
$ ls packages/ai/src/providers/data | wc -l   → 0     (thư mục không tồn tại trên đĩa)
```
42 file `.models.ts` được commit (588 dòng) chỉ là stub:
```ts
import values from "./data/anthropic.json" with { type: "json" };
```
…nhưng file JSON đó bị gitignore. `packages/ai/package.json` buộc phải có mạng:
```
"build": "npm run generate-models && npm run build:offline"
```
Nghĩa là **clone sạch của pi là catalog hỏng** cho tới khi chạy codegen. Nguồn upstream: models.dev +
NVIDIA `/models` + OpenRouter `/api/v1/models` + Vercel AI Gateway `/models` (dòng 1259/1279/1326).
Quan trọng: chính sách không nằm ở runtime mà nằm trong **`generate-models.ts` 3.545 dòng TypeScript**,
trong đó có các bản vá viết tay kiểu "models.dev báo sai" (dòng 1517: *"Baseten's GLM-5.2 endpoints are
text-only despite models.dev reporting image input"*).

**opencode** — **runtime API + snapshot commit**.
```
$ ls -la packages/core/src/models-dev/snapshot.txt   → 4,7 MB
$ grep -n 'Duration.minutes(5)' packages/core/src/models-dev.ts   → dòng 333
```
453 dòng TS quản lý cache 5 phút (`Effect.repeat(Schedule.spaced(ttl))`, dòng 436) và có so sánh digest
để không phát lại sự kiện khi body không đổi. 223 provider / 8.179 model đến thẳng từ models.dev.

**codex** — **file viết tay, không có codegen**.
```
$ grep -rn "models.json" -- '*.rs' | grep -v test
codex-rs/models-manager/src/lib.rs:15:  serde_json::from_str(include_str!("../models.json"))
```
Không script nào sinh ra nó. 10 model, 51 khoá mỗi model — rất giàu *capability* metadata
(`tool_mode`, `truncation_policy`, `supported_reasoning_levels`, `service_tiers`…). Nhưng có tầng refresh
song song: `models_refresh_worker.rs:10` → `MODELS_REFRESH_INTERVAL = 4*60+30` giây, gọi `RefreshStrategy::Online`.

**gajae** — `models.json` 101.969 dòng commit, không có tầng sinh, không có tầng chính sách.

---

## 2. Tính giá

| repo | Tính tiền ở đâu | Cache-aware? | Số đo |
|---|---|---|---|
| **omp** | `calculateCost` từ `@oh-my-pi/pi-catalog/models`, dùng ở `auth-gateway/routes/*.ts`, `embeddings/` | **Có, 3 trường** + `longContext` + `timeBased` | **5.522/5.522** model có `cost.input`, `cost.cacheRead`, `cost.cacheWrite`; **35** model có `longContext`; **4** model có `timeBased` (hệ số peak/off-peak) |
| **pi** | `ModelCost` trong `types.ts:1021-1036` | Có, 4 trường + `tiers` | `ModelCostRates{input,output,cacheRead,cacheWrite}` + `ModelCost.tiers[]` |
| **opencode** | `session/usage.ts` → `calculateCost` | Có, + tier theo context | **56 dòng** cho cả file; xử lý `tier.type==="context"`, `cache.read`, `cache.write`, `usage.reasoning` |
| **codex** | **KHÔNG tính** | — | `grep -c '"(cost\|price\|input_cost\|output_cost)"' models.json` → **0**. `cost_usd` đến từ server: `codex-backend-openapi-models/src/models/analytics.rs:28` |
| **gajae** | `model-pricing.ts` | Có + longContext | **101 dòng hằng số TS** |

omp đứng đầu về độ sâu giá: `types.ts:1157`
```ts
export interface ModelCost extends TokenCost {
  longContext?: LongContextTokenCost;   // inputThreshold, inputThresholdInclusive
  timeBased?: TimeBasedCost;           // offPeakMultiplier, peakWindows[]
}
```
Đây là thứ mà cả bốn repo tham chiếu đều không có.

**codex không tính giá** là phát hiện có giá trị: 10 model, 0 trường giá, `cost_usd` là `Option<String>`
từ API backend. Với một agent tự chạy, codex đơn giản là **không biết mình tốn bao nhiêu**.

---

## 3. Fallback khi provider chết

Đây là chỗ omp vượt bốn repo **rất xa**, và cần đọc kỹ vì dễ kết luận sai.

**omp — 17.806 dòng, ở tầng credential/account** (không phải tầng model):
```
packages/ai/src/auth/          10.584 dòng (non-test)
packages/ai/src/auth-broker/ + auth-gateway/  7.222 dòng
```
Cơ chế đo được: `blocks.ts` (block theo rate-limit với backoff lưu **qua process** qua SQLite),
`health.ts` (probe từng credential, trạng thái `healthy`/`reserve`), `rotation.ts`, `cascade.ts`,
`affinity.ts`, `select.ts`, `pool.ts`, `rank.ts`, `policy.ts`. Nghĩa là: một account hết quota →
xoay sang account khác **cùng model**, có kiểm tra sức khoẻ trước.

Điều omp **không** làm: tự đổi sang *model khác* khi provider chết. `git grep 'fallbackModel|autoFallback|switchToModel|degradeModel'`
chỉ ra `model-resolver.ts:2361` — và đó là fallback khi **khôi phục session** không được, không phải lúc runtime.
Lưu ý tránh hiểu nhầm: trục `fallback` trong `behavior.kdl` (dòng 58-74) **không** phải định tuyến lỗi —
đó là phân loại identity (`fallback "anthropic" substring="claude-"`).

**codex — "reroute" là tên gọi gây hiểu nhầm.** Toàn bộ enum chỉ có **một** biến thể:
```
$ grep -A2 'enum ModelRerouteReason' codex-rs/protocol/src/protocol.rs
pub enum ModelRerouteReason {
    HighRiskCyberActivity,
}
```
Đó là **hạ cấp model vì an toàn nội dung**, không phải provider chết. 20 file chứa `Reroute` nhưng
`codex-rs/core/src/session/mod.rs:4025` là nơi duy nhất phát ra nó. → **codex không có provider-failure fallback.**

**opencode — chỉ chuyển model thủ công.** `switchModel` tồn tại (`session/session.ts:97`) nhưng là API do
người dùng/plugin gọi, không tự kích hoạt khi lỗi. Chỉ 12/… file trong `core/src` nhắc `fallback`.

**pi — fallback lúc resolve, không lúc chạy.** `model-resolver.ts:587` `buildFallbackModel` dùng khi
*tên model người dùng gõ không tồn tại trong catalog*:
> `Model "${fallbackPattern}" not found for provider "${provider}". Using custom model id.`

**gajae** — 60 file trong `ai/src` có `fallback|retry|backoff`; trọng tâm là retry provider
(`openai-compat.ts` 20, `anthropic.ts` 55, `auth-gateway/server.ts` 15).

> **Cả năm repo đều thiếu một thứ:** tự động đổi sang model *khác* khi provider *đã chết hẳn* (hết hạn mức
> toàn tài khoản, model bị gỡ khỏi upstream). omp xoay credential, còn lại thì không ai xoay model.

---

## 4. Có repo nào làm thứ omp KHÔNG làm không

**Có, ba repo — nhưng đều làm nó *thay* cho lớp chính sách, không bổ sung.**

**opencode: mới hơn và rộng hơn đáng kể.**
| | omp | opencode |
|---|---|---|
| provider | 73 | **223** |
| model | 5.522 | **8.179** |
| độ trễ đồng bộ | cache 2h | **5 phút** |
Đổi lại: **0 dòng chính sách.** 4,7 MB `snapshot.txt` là JSON của models.dev, lấy nguyên si. Không có
taxonomy, không có cascade, không có trục ưu tiên. Mọi id đến từ upstream thì lấy nguyên.

**pi: chính sách viết tay trong codegen.** 3.545 dòng TS chứa override, thay vì 221 file KDL. Đổi chính
sách = sửa TypeScript rồi chạy lại, cần mạng. Chính sách ở đó cũng **không commit**.

**gajae: đây là phát hiện quan trọng nhất của cả bài so sánh.**

```
$ find . -name '*.kdl' -not -path './node_modules/*' | wc -l   → 0
$ git ls-files | grep -E 'rules\.json|compat/rules'           → (rỗng)
```
Nhưng nó có **cùng tên file** với omp — `provider-models/bundled-references.ts`, `descriptors.ts`,
`openai-compat.ts`, `model-cache.ts`, `model-manager.ts`. Đây là một nhánh cùng huyết thống, đã gỡ KDL.

Và hậu quả nhìn thấy được. `packages/ai/src/model-pricing.ts` — 101 dòng, đúng thứ mà AGENTS.md của
omp cấm tuyệt đối:
```ts
const GPT_5_6_SOL_PRICING: TieredPricing = { cost: { input: 5, output: 30, ... } };
const GPT_6_ASTRA_PRICING: TieredPricing = { cost: { input: 10, output: 50, ... } };
const GPT_6_SOL_PRICING: TieredPricing = { cost: { input: 2, output: 10, ... } };
const GPT_6_LUNA_PRICING: TieredPricing = { cost: { input: 0.1, output: 0.5, ... } };
```
`model-thinking.ts` (1.179 dòng) chứa **86 id model hardcode** dạng chuỗi, và không có lớp identity nào
(`git ls-files | grep -iE '(identity|classif|collapse|expand)'` → rỗng). Chính sách bị **rải rác thành
hằng số TS**, đúng cái mà kiến trúc KDL sinh ra để tránh.

> **gajae là phép thử tự nhiên của câu hỏi "đừng phá KDL".** Câu trả lời đo được: gỡ KDL đi thì chính
> sách phải nhồi vào TypeScript, không còn tra cứu được, không còn tranh chấp phát hiện được
> (`AmbiguousOverlapError` của omp), và phải chịu phụ thuộc mạng lúc build. **Đừng phá KDL.**

---

## 5. Rust có đổi bức tranh không (codex)

**Không — ở tầng model/provider, Rust không đem lại lợi thế nào; nó chỉ đổi chỗ đặt vấn đề.**

Bằng chứng:

- **Quy mô model nhỏ hơn hẳn.** 4.925 file Rust nhưng chỉ **10 model / 5 provider**. So sánh cùng đường
  dữ liệu: opencode 8.179 model / 46 provider module, omp 5.522 / 73. Chi phí biên dịch Rust không đổi
  được tỉ lệ đó — 5 provider là một **quyết định phạm vi**, không phải giới hạn ngôn ngữ.

- **Codex từ chối chủ động làm việc đó.**
  `codex-rs/model-provider-info/src/lib.rs:660-664`:
  > *"We do not want to be in the business of adjudicating which third-party providers are bundled with
  > Codex CLI, so we only include the OpenAI and open source ("oss") providers by default. Users are
  > encouraged to add to `model_providers` in config.toml to add their own providers."*

  Đó là lựa chọn phạm vi, viết bằng Rust cũng vậy.

- **Rust không mua được tầng cache mà omp đã có.** `manager.rs:85-92`:
  ```rust
  pub enum RefreshStrategy { Online, Offline, OnlineIfUncached }
  ```
  giống hệt `ModelRefreshStrategy = "online" | "offline" | "online-if-uncached"` của omp
  (`model-manager.ts:25`), cộng ETag revalidation (`cache.rs:56,161-170`). **Hai bên độc lập hội tụ về
  cùng một thiết kế.** Việc Rust tự nó không tạo ra lợi thế; lợi thế nằm ở việc ai chịu viết tầng đó.

- **Điểm Rust *có* thắng: an toàn bản dịch.** `models.json` được nhúng bằng `include_str!` và parse tại
  compile → không thể lệch schema với binary đã build. Đây là lợi thế thật, nhưng thuộc loại *distribution*,
  không thuộc loại *model policy* — và omp đã đạt bằng `bun run gen:compat` + test tương đương
  (`packages/catalog/scripts/equivalence.ts`, 889 dòng).

- **Điểm Rust *thua*:** không có tầng chính sách. `models.json` của codex có 51 khoá/model rất giàu, nhưng
  là JSON viết tay không sinh tự động — mỗi model mới là một lần sửa tay trong Rust repo, không có
  compiler bắt trùng, không có `priority=` giải quyết trùng cấp. omp có 2.815 dòng compiler làm đúng việc đó.

**Kết luận câu 5:** Rust là một lựa chọn hợp lý cho codex (agent server, sandbox, protocol), nhưng ở
tầng này nó **trung lập**. Đừng dùng "codex làm bằng Rust" làm lập luận để đổi kiến trúc của omp.

---

## omp thiếu gì

Đã kiểm, không suy đoán. "Không có" ở đây là kết quả đo.

1. **Độ phủ provider/model thấp hơn opencode rõ rệt** — 73/5.522 so với 223/8.179. Nếu người dùng dùng
   provider chỉ có ở models.dev, omp không có nó. Đây là khoảng trống thật, đo được.

2. **Độ trễ đồng bộ chậm hơn 24 lần** — cache 2h (`DEFAULT_CACHE_TTL_MS = 2*60*60*1000`) so với opencode
   5 phút. Model mới lên giá hoặc giá đổi, omp chậm tối đa 2 giờ mới thấy.

3. **Chưa có fallback sang model khác** khi toàn bộ credential của một provider hết hạn mức. Hiện tại
   omp chỉ xoay credential. Cả bốn repo tham chiếu cũng thiếu — nên đây là khoảng trống chung, không phải
   lỗi so sánh.

4. **Dữ liệu model không commit ở pi, nhưng omp thì có** — đây là điểm omp *thắng*, không phải thiếu.
   Ghi lại để không ai "sửa" omp theo hướng ngược lại.

5. **Chưa đo được** chi phí bảo trì 221 file KDL khi upstream đổi metadata (thiếu số liệu thời gian —
   xem `## Chi phí`).

---

## Kết luận

### `không làm`

- **Không phá tầng KDL.** gajae (cùng huyết thống, 0 file `.kdl`) đã chứng minh bằng số: chính sách
  chuyển thành hằng số TS trong `model-pricing.ts` (101 dòng) và 86 id hardcode trong
  `model-thinking.ts` (1.179 dòng). Không còn tra cứu được, không còn compiler bắt trùng.
- **Không chuyển chính sách sang TypeScript** vì lý do "gọn hơn" — đó chính là hướng gajae đã đi và đã
  tạo ra kỹ thuật nợ.
- **Không chuyển sang Rust** vì lý do codex là Rust. Ở tầng này Rust trung lập: 10 model/5 provider,
  không có tầng chính sách, không có giá.
- **Không lấy opencode làm chuẩn về độ phủ.** 223 provider nhưng 0 dòng chính sách — sẽ mất 8.909
  dòng KDL để đổi lấy dữ liệu thô.

### `làm`

1. **Rút kinh nghiệm cache ladder từ codex** — không phải để chuyển sang Rust, mà vì codex và omp đã
   độc lập hội tụ về cùng một hình dạng (`Online/Offline/OnlineIfUncached` + ETag revalidation).
   Hội tụ độc lập là bằng chứng mạnh rằng thiết kế này đúng; giữ nguyên, chỉ cần **hạ TTL 2h xuống** để
   khớp opencode. Đây là thay đổi nhỏ, rủi ro thấp, lợi ích rõ (xem `làm nếu có điều kiện` #1).

### `làm nếu có điều kiện`

1. **Hạ `DEFAULT_CACHE_TTL_MS` từ 2h → 15-30 phút** *nếu* đo được rằng ngân sách mạng cho phép.
   opencode làm 5 phút. Điều kiện: cần số đo băng thông/bình phương của `model-cache.ts` trước.
   *Không* sửa nếu chưa đo — hiện tại 2h có thể là quyết định đã cân nhắc.

2. **Bổ sung provider cho các provider chỉ có ở models.dev** *nếu* có người dùng thật cần. Cách làm
   đúng theo kiến trúc hiện tại: thêm file `.kdl` vào `rules/providers/`, chạy `bun run gen:compat`,
   commit `rules.json` cùng `.kdl`. **Không** sửa `models.json` bằng tay (file sinh).

3. **Cân nhắc fallback sang model khác khi provider cạn** *nếu* có nhu cầu. Không ai trong năm repo làm
   được, nên đây là điểm khác biệt tiềm năng — nhưng phải làm theo KDL (một trục `fallback-model` trong
   `runtime/behavior.kdl`), không phải một `if` trong TS.

4. **Bổ sung `timeBased`/`longContext` cho model còn thiếu** *nếu* upstream có công bố. Hiện 35 model có
   `longContext`, 4 có `timeBased` trong tổng 5.522 — có thể đã đủ, cần đối chiếu danh sách giá thực tế
   của các provider mới trước khi động vào.

---

## Chi phí

**Đo được (chi phí đã chịu):**

| hạng mục | quy mô |
|---|---|
| Cây KDL | 221 file, 8.909 dòng |
| Compiler KDL | 2.815 dòng (`scripts/compat-compiler/`) |
| `rules.json` sinh ra | 319.653 byte (phải commit cùng `.kdl`) |
| `models.json` sinh ra | 5.522 model, 73 provider |
| Tầng khám phá | 15.542 + 9.206 = 24.748 dòng |
| Tầng fallback/credential | 17.806 dòng |
| **Tổng tầng model/provider của omp** | **~53.500 dòng** |

**Đề xuất (ước tính, chưa đo thời gian):**

| việc | ướng tính |
|---|---|
| Hạ TTL 2h → 30 phút | ~1 dòng hằng số + 1 test; **< 1 giờ** |
| Thêm N provider mới (theo chuẩn KDL) | ~30-130 dòng `.kdl` / provider + `bun run gen:compat`; **vài giờ cho 5 provider** |
| Trục `fallback-model` trong KDL | thiết kế ~1-2 ngày, cộng compiler + test resolve |
| Bổ sung `longContext`/`timeBased` còn thiếu | theo số model thực tế cần sửa; rẻ, nhưng cần đối chiếu giá upstream |

**Chưa đo được — cần đo trước khi quyết:**

- **Chi phí bảo trì 221 file KDL khi upstream đổi metadata.** Đây là câu hỏi lớn nhất và tôi **không có
  số liệu**. Cần đo: trong 3 tháng qua, `git log --oneline -- packages/catalog/src/compat/rules/` cho
  ra bao nhiêu commit, bao nhiêu là sửa chấn đoán upstream, trung bình mỗi lần sửa bao nhiêu dòng.
  Không có số này thì mọi lập luận "KDL đáng giá" chỉ là lập luận từ quan niệm.
- **Chi phí port từ pi.** Vì omp là hậu duệ của pi, phần có thể chép cơ học là lớp `ai/`; phần *không* thể
  chép là `catalog/` vì omp đã tiến xa hơn pi rất xa (73 provider + KDL so với 42 provider không KDL).
  Đây là lý do commit `1dd1e87` nói "make future copies from pi mechanical" — và lý do miền catalog
  phải loại riêng.

---

# Miền 3 — Tools, quyền, sandbox, phê duyệt

## Miền: So sánh tầng tools / quyền / sandbox: omp vs 4 repo tham chiếu

Nguồn: đọc tại chỗ trên đĩa, không clone. Mọi khẳng định kèm lệnh đã chạy.

| repo | đường dẫn | file (git ls-files) |
| --- | --- | --- |
| omp | `/Users/tranquangdang21/Projects/ultraworkers` | 7.946 |
| pi | `/Users/tranquangdang21/Projects/pi-ref` | 1.935 |
| opencode | `/Users/tranquangdang21/Projects/opencode-ref` | 7.905 |
| codex | `/Users/tranquangdang21/Projects/codex-ref` | 8.693 |
| gajae | `/Users/tranquangdang21/Projects/gajae-ref` | 6.027 |

Lưu ý: đường dẫn opencode đúng là `tranquangdang21` (bản gõ `tranquanggard21` trong đề bài không tồn tại).

---

## 1. Cơ chế phê duyệt (approval)

Đo bằng: `git grep -l -iE "approv|permission" -- '*.ts' '*.tsx' '*.rs'` rồi đếm file thật sự thuộc lớp phê duyệt (không tính CHANGELOG, tài liệu kế hoạch, hay từ khóa trùng nghĩa).

| repo | có phê duyệt? | mô hình | file lõi | LOC |
| --- | --- | --- | --- | --- |
| **omp** | CÓ | 3 chế độ × 3 bậc | `packages/coding-agent/src/tools/approval.ts` | 387 (+959 test) |
| **codex** | CÓ | 4 chính sách × 3 chế độ sandbox | `codex-rs/core/src/tools/approvals.rs` | 889 (+237 test) |
| **opencode** | CÓ | ruleset action×resource | `packages/core/src/permission.ts` | 343 (+88 saved, +709 test) |
| **pi** | **KHÔNG** | — | `examples/extensions/permission-gate.ts` | 34 (example, không nạp mặc định) |
| **gajae** | **KHÔNG** | — | — | 0 |

### omp — 3 chế độ, 3 bậc

`packages/coding-agent/src/tools/approval.ts:16-17`

```ts
export type ApprovalPolicy = "allow" | "deny" | "prompt";
export type ApprovalMode = "always-ask" | "write" | "yolo";
```

Bậc năng lực, kém → mạnh (`approval.ts:99-103`): `read:0, write:1, exec:2`.
Mỗi chế độ gắn một bậc tối đa được phép chạy không hỏi (`approval.ts:120-124`):

| chế độ | bậc tối đa | nghĩa |
| --- | --- | --- |
| `always-ask` | `read` | hỏi cho mọi thứ trên `read` trở lên → tức là hỏi gần như mọi tool |
| `write` | `write` | cho `read`+`write` tự do, hỏi khi chạm `exec` |
| `yolo` | `exec` | không hỏi |

Ghi đè theo từng tool qua `tools.approval.<tên>`, và có `policyKey` cho sub-tool (ví dụ dispatch `xd://`). Có fallback fail-closed cho tên tool đã đổi.

Mặc định khi không cấu hình là **`yolo`** (`approval.ts:80`):
```ts
approvalMode: isApprovalMode(configured) ? configured : "yolo",
```
Đây là điểm đáng chú ý về mặt an toàn: cấu hình thiếu ⇒ chạy tự do.

Ngoài ra omp có **cổng phê duyệt qua ACP client** (`session/acp-permission-gate.ts`, 141 dòng) — khi một client ACP kết nối, tool `bash`/`edit`/`delete`/`move` bắt buộc hỏi, với 4 lựa chọn `allow_once` / `allow_always` / `reject_once` / `reject_always`. Đây là kênh phê duyệt *từ xa* mà không repo nào khác có.

Tài liệu: `docs/approval-mode.md` (162 dòng), có mục riêng "Computer safety" và "ACP sessions".

### codex — ma trận trực giao 4 × 3

`codex-rs/protocol/src/protocol.rs:986` — `AskForApproval`:
- `UnlessTrusted` — dự án không tin cậy thì lệnh phải được duyệt trừ khi có rule execpolicy cho phép
- `OnRequest` (mặc định) — model tự quyết định lúc nào hỏi
- `Granular(GranularApprovalConfig)` — 5 công tắc bật/tắt độc lập: `sandbox_approval`, `rules`, `skill_approval`, `request_permissions`, `mcp_elicitations`
- `Never` — không bao giờ hỏi

`codex-rs/protocol/src/config_types.rs:104` — `SandboxMode`: `ReadOnly` | `WorkspaceWrite` | `DangerFullAccess`.

Hai trục này **trực giao**: có thể vừa sandbox read-only vừa hỏi cả mọi thứ, hoặc full-access mà vẫn hỏi. Không repo nào khác tách được hai trục này.

Ngoài ra: `network_approval.rs` (1.254 dòng) — phê duyệt riêng cho **network access**; `mcp_tool_approval_templates.rs` (371 dòng) — phê duyệt riêng cho tool MCP.

### opencode — ruleset allow/ask/deny

`packages/schema/src/permission.ts:55`
```ts
export const Effect = Schema.Literals(["allow", "deny", "ask"])
```
`permission.ts:87` — `evaluate(action, resource, ...rulesets)` trả về `Rule`. Đây là mô hình **policy engine** (action + resource → effect), linh hoạt hơn tier cố định, nhưng không có khái niệm "bậc năng lực" nên không diễn tả được "chỉ hỏi khi tới bậc exec".

### pi — không có gì cả

Toàn bộ repo chỉ có 3 file liên quan permission, và **không cái nào** nằm trong đường chạy chính:
- `packages/coding-agent/examples/extensions/permission-gate.ts` (34 dòng) — nằm trong `examples/extensions/`, là extension do người dùng tự chọn
- `src/core/trust-manager.ts`, `src/core/project-trust.ts` — trust *thư mục dự án*, không phải trust *tool call*

Kiểm chứng: `git grep -l "ToolApproval" -- packages/agent/` trong pi → **0 kết quả**. Kiểu `ToolApproval` mà omp dùng **không tồn tại** trong pi-agent-core.

Nội dung example extension chỉ là 3 regex:
```ts
const dangerousPatterns = [/\brm\s+(-rf?|--recursive)/i, /\bsudo\b/i, /\b(chmod|chown)\b.*777/i];
```
Không nạp mặc định ⇒ omp có phê duyệt là **tự viết, không phải port từ pi**.

### gajae — không có gì cả

`git grep -niE "always-ask|approvalMode|askForApproval|yolo" -- '*.ts'` → 1 kết quả duy nhất, trong `packages/stats/test/user-metrics.test.ts:143`, là chuỗi `"please stop making yolo changes"` trong test phân loại blame. **Không có cơ chế phê duyệt nào.**

Cảnh báo false-friend: `crates/pi-natives/src/computer/permissions.rs` (220 dòng) nghe rất giống approval nhưng thực ra là **TCC của macOS** — `AXIsProcessTrusted()` (Accessibility) và `CGPreflightScreenCaptureAccess()` (Screen Recording). Đó là xin quyền hệ điều hành cho computer-use tool, không phải hỏi người dùng trước khi chạy tool.

---

## 2. Sandbox ở mức OS

Đo bằng cách tìm **tên cơ chế**, rồi mở file kiểm chứng có phải code thật hay nhầm từ.

Lệnh:
```
git grep -l -i -- "<mechanism>" -- '*.rs' '*.ts' '*.tsx'
```

| cơ chế | omp | pi | opencode | codex | gajae |
| --- | --- | --- | --- | --- | --- |
| landlock | 0 | 0 | 0 | **81** | 0 |
| seccomp | 3¹ | 1¹ | 0 | **31** | 1¹ |
| seatbelt | 1¹ | 0 | 0 | **41** | 0 |
| sandbox-exec | 0 | 1² | 0 | **8** | 0 |
| bubblewrap | 0 | 1² | 0 | **33** | 0 |
| Windows sandbox | 0 | 0 | 1³ | **86** | 0 |
| job object | 0 | 0 | 0 | **7** | 0 |
| setrlimit | 0 | 0 | 0 | **6** | 0 |

¹ **toàn false positive** — đã mở từng file kiểm chứng:
- omp: `packages/coding-agent/src/web/scrapers/sec-edgar.ts` khớp vì "**Sec**Company" (SEC = Ủy ban Chứng khoán, không phải seccomp); `cli.ts:414-415` và `input-controller.ts:1439` là **chú thích giải thích vì sao không dùng được**, không phải implementation. Đây đúng là 3 file khớp: `git grep -l -i "seccomp" -- '*.ts'` trả về đúng 3 dòng trên.
- omp `seatbelt`: `file-write-fallback.ts:379` cũng là chú thích ("Seatbelt, LSM mà một probe `stat` sẽ báo writable").
- omp `landlock`: chỉ xuất hiện trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` và `MILESTONE_6_EXECUTION_PLAN.md` — tức là **kế hoạch**, code chưa có.
- pi: `packages/tui/src/terminal.ts:43` là chú thích.
- gajae: chỉ có `sec-edgar.ts`.
³ opencode "Windows sandbox" = 1 file, kiểm chứng là text về sandbox, không phải implementation.

² pi có `sandbox-exec` + `bubblewrap` nhưng **chỉ trong `packages/coding-agent/examples/extensions/sandbox/index.ts`** — example extension, không nạp mặc định.

### Kết luận Q2

**Chỉ codex có sandbox ở mức OS thật.** Đã mở file xác nhận implementation, không phải tài liệu:

- `codex-rs/linux-sandbox/src/landlock.rs` — 379 dòng (Landlock LSM)
- `codex-rs/sandboxing/src/landlock.rs` — 115 dòng
- `codex-rs/sandboxing/src/seatbelt*.rs` + **4 file `.sbpl`** (base / network / preferences / read-only platform defaults) — Seatbelt của macOS
- `codex-rs/vendor/bubblewrap/` — **mã nguồn C của bubblewrap được vendor** (bind-mount.c, bubblewrap.c, network.c)
- `codex-rs/core/src/tools/sandboxing.rs` — 561 dòng điều phối

Quy mô crate sandbox: **11.440 dòng Rust trên 30 file** (không tính test).

omp, pi, opencode, gajae: **không có sandbox ở tầng OS nào.** Chúng chỉ có quyền ở tầng ứng dụng (hỏi người dùng, hoặc giới hạn bằng regex).

---

## 3. Số tool built-in

Đếm từ nguồn định danh, không đếm file (barrel `export *` gây thừa).

Với codex, đếm *tên tool phân biệt được* chứ không đếm file: 21 handler ở `tools/handlers/` (`apply_patch, current_time, get_context_remaining, list_available_plugins_to_install, list_mcp_resources, list_mcp_resource_templates, read_mcp_resource, mcp, new_context_window, plan, request_permissions, request_plugin_install, request_user_input, request_user_input_async, send_message_to_user_async, sleep, tool_search, exec_command, write_stdin, view_image, wait_for_environment`) + 5 tool `multi_agents` v1 + 7 tool `multi_agents_v2` + 2 tool `code_mode`, trừ chồng lấn (`spawn`/`wait` có ở cả v1 và v2) ⇒ **~33**, trong đó một phần đằng sau feature flag. Đếm *file* cho ra 38 nhưng file `*_spec.rs` và các module con của `mcp_resource`/`unified_exec` không phải tool riêng — con số 38 là thừa.

| repo | nguồn đếm | số tool |
| --- | --- | --- |
| **gajae** | `tools/tool-catalog.generated.ts` (3.101 dòng, top-level keys) | **40** |
| **omp** | `tools/builtin-names.ts:1-32` `BUILTIN_TOOL_NAMES` | **30** (+3 hidden) |
| **codex** | `tools/handlers/*.rs` + `multi_agents*/` + `code_mode/` | **~33** |
| **opencode** | `packages/core/src/tool/plugin/*.ts` | **15** |
| **pi** | `core/tools/index.ts:184-191` | **8** |

**Nhiều nhất: gajae (40).** Chênh lệch thứ hai: omp (30) — gajae có 10 tool mà omp không có: `bisect, browser, calc, computer, cron, goal, irc, job, monitor, move_session, python, recipe, render_mermaid, report_finding, resolve, search, search_tool_bm25, skill, skill_discovery, ssh, subagent, telegram_send, todo_write, yield`.

omp có 15 tool gajae không có (đã chuẩn hoá `-`↔`_`): `context_notes, glob, grep, ida, learn, manage_skill, memory_edit, new_context, recall, reflect, retain, security_scan, todo, wait`.

pi chỉ 8: `read, bash, powershell, edit, write, grep, find, ls` (`core/tools/index.ts:184-191`).

---

## 4. Snapshot test

**Có: codex, 1.429 file `.snap`.** Nhưng chúng kiểm thử gì?

```
git ls-files | grep "\.snap$" | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn
```

| thư mục | số .snap |
| --- | --- |
| `codex-rs/tui/src/chatwidget/snapshots` | 316 |
| `codex-rs/tui/src/bottom_pane/snapshots` | 261 |
| `codex-rs/tui/src/snapshots` | 189 |
| `codex-rs/tui/src/history_cell/snapshots` | 91 |
| `codex-rs/tui/src/app/snapshots` | 75 |
| `codex-rs/tui/src/chatwidget/tests/snapshots` | 70 |
| `codex-rs/tui/src/app/tests/snapshots` | 63 |
| `codex-rs/core/tests/suite/snapshots` | **54** |
| `codex-rs/tui/src/transcript_view/snapshots` | 33 |
| ... (còn ~14 thư mục TUI nữa) | |
| `codex-rs/core/src/context/world_state/snapshots` | 10 |

Tổng của riêng TUI: **~1.357 / 1.429 = 94,8%**. Chỉ **54 file (3,8%)** nằm ở core test suite, và chúng cũng không snapshot *output của model* — tên file cho thấy chúng snapshot **shape** (hình dạng request/context):

- `all__suite__compact__mid_turn_compaction_shapes.snap`
- `all__suite__mcp_tool_exposure__deferred_tools_initial_unchanged_and_removed.snap`
- `all__suite__model_visible_layout__*_shapes.snap`
- `all__suite__token_budget__token_budget_new_context_window_tool_full_context.snap`

**Đây là câu trả lời quan trọng nhất của Q4:** codex không snapshot *agent output*. Nó snapshot **khung hình terminal đã render** (insta + golden files) và **shape của request**. Không repo nào trong 5 repo snapshot transcript sinh ra từ model thật.

### Có áp dụng được cho omp không?

**Có, phần shape/context — không, phần transcript model.**

Phần *áp dụng được ngay*: 54 file `.snap` của codex core chính là thứ omp thiếu. omp đã có cơ chế tương đương (`packages/coding-agent/test/`, 3.124 file test) nhưng chưa có golden-file cho các shape như "sau khi compaction giữa lượt thì request trông thế nào". Đó là hợp đồng mà test assert-bằng-logic sẽ bỏ sót.

Phần *không nên bắt chước*: snapshot transcript sinh ra từ model thật là ổn định giả — model đổi, prompt đổi là toàn bộ 1.429 golden hỏng mà không phát hiện được lỗi thật. Và 94,8% snapshot của codex nằm ở TUI là chi phí bảo trì lớn nhất trong miền này.

---

## 5. Điều bị bỏ qua trong CẢ NĂM repo — chỉ riêng omp

Kiểm chứng bằng `git grep -l -w "<tool>"` trên cả 4 repo tham chiếu:

| tool của omp | pi | opencode | codex | gajae |
| --- | --- | --- | --- | --- |
| `manage_skill` | 0 | 0 | 0 | 0 |
| `memory_edit` | 0 | 0 | 0 | 0 |
| `context_notes` | 0 | 0 | 0 | 0 |

Ba tool này **không xuất hiện lần nào** trong bất kỳ repo tham chiếu nào. Ngoài ra:

**a. Cổng phê duyệt cấp thiết bị qua ACP** — `session/acp-permission-gate.ts` (141 dòng), 4 lựa chọn `allow_once`/`allow_always`/`reject_once`/`reject_always`, và nó phân tích `editInspect()` để phát hiện thao tác `delete`/`move` *bên trong* một edit patch (dòng 26-45) — tức phê duyệt theo **ý định thao tác**, không chỉ theo tên tool. Không repo nào có kênh phê duyệt từ xa.

**b. Mô hình bậc năng lực** — `read < write < exec`, tool khai báo `approval(args)` có thể là *hàm* nhận `args` để quyết định bậc theo đối số (`approval.ts:163-181`), và `strictestApproval()` gộp nhiều target cho tool ghi đa-file (`approval.ts:110-118`). opencode có action×resource nhưng không có khái niệm bậc; codex có `Never` nhưng không có bậc trung gian.

**c. Vòng lặp học skill/memory** — 5 tool `learn` + `retain` + `recall` + `reflect` + `manage_skill`, trong đó `manage_skill` và `memory_edit` không tồn tại ở đâu khác. gajae có `skill`/`skill_discovery` nhưng là *đọc* skill, không phải *sửa* skill.

---

## omp thiếu gì

| thứ | ai có | bằng chứng | kích thước |
| --- | --- | --- | --- |
| **Sandbox OS thật** | codex | `codex-rs/sandboxing/` + `linux-sandbox/` | **11.440 dòng Rust / 30 file** |
| Landlock (Linux) | codex | `linux-sandbox/src/landlock.rs` | 379 dòng |
| Seatbelt (macOS) | codex | `seatbelt*.rs` + 4 file `.sbpl` | 41 file khớp |
| bubblewrap | codex | `codex-rs/vendor/bubblewrap/` (vendor mã nguồn C) | ~30 file |
| **Phê duyệt network** | codex | `core/src/tools/network_approval.rs` | **1.254 dòng** |
| **Phê duyệt tool MCP** | codex | `core/src/mcp_tool_approval_templates.rs` | 371 dòng |
| Chế độ sandbox tách khỏi phê duyệt | codex | `SandboxMode` 3 giá trị | trục độc lập |
| Granular approval (5 công tắc) | codex | `GranularApprovalConfig` | — |
| Chặn theo prefix lệnh (danh sách 346 dòng) | gajae | `tools/bash-allowed-prefixes.ts` | 346 dòng |
| Gate computer-use theo nền tảng | gajae | `tools/computer-policy.ts` | 54 dòng |
| Golden-file snapshot cho shape request | codex (chỉ 54 file) | `core/tests/suite/snapshots/` | 54 file |

## Kết luận

**`làm`**

1. **Đổi mặc định omp từ `yolo` sang `write`.** Đây là phát hiện có giá trị nhất trong toàn bộ miền này và nó nằm ngay trong code của chính omp, không cần lấy gì từ ai. `approval.ts:80` hiện trả `"yolo"` khi thiếu cấu hình — tức cài đặt mới chạy tool không hỏi. Chế độ `write` đã có sẵn, đã có test (959 dòng), chỉ cần đổi fallback. Chi phí: một dòng + cập nhật `docs/approval-mode.md`.
2. **Thêm golden-file snapshot cho shape của request/context** (compaction, tool exposure, context window). Đây là phần *đáng lấy* trong 1.429 file `.snap` của codex: 54 file core, snapshot shape chứ không snapshot model. omp đã có 3.124 file test nhưng chưa có lớp golden này.
3. **Giữ nguyên tầng bậc của omp.** Không cần chuyển sang mô hình ruleset của opencode — bậc `read/write/exec` là câu trả lời rẻ hơn cho phần lớn trường hợp, và `strictestApproval()` xử lý đúng trường hợp đa-target mà ruleset không có.

**`làm nếu có điều kiện`**

4. **Sandbox OS theo mô hình codex — chỉ khi omp được dùng để chạy code không tin cậy.** Landlock + Seatbelt là chi phí lớn nhất trong bảng này (11.440 dòng Rust cho codex, cộng bubblewrap vendor). Nếu omp vẫn là công cụ dev hợp tác với code người dùng tin cậy, tầng phê duyệt ứng dụng là đủ và rẻ hơn nhiều. Điều kiện để làm: có nhu cầu thật với người chạy agent tự động trên repo lạ.
5. **Phê duyệt network (1.254 dòng ở codex)** — chỉ đáng làm nếu omp có tool tự động phát sinh network egress mà không thấy. Chưa đo được mức nhu cầu này.
6. **`bash-allowed-prefixes` (346 dòng, gajae)** — làm được với giá rẻ, nhưng phải cân nhắc: nó là allowlist lệnh, tức một lớp *thứ hai* cạnh bậc `exec` sẵn có. Thêm nó mà không có phép đo đánh giá rủi ro thì chỉ tăng bề mặt bảo trì.

**`không làm`**

7. **Không port chính đáng 1.357 snapshot TUI của codex.** Đó là 94,8% khối lượng `.snap` và là chi phí bảo trì lớn nhất, đổi lại không bắt được lỗi hành vi agent.
8. **Không lấy transcript snapshot sinh từ model thật** ở bất kỳ repo nào. Ổn định giả — model đổi là toàn bộ golden hỏng mà không phát hiện lỗi thật.
9. **Không chuyển sang ruleset engine của opencode.** Bậc phân cấp đáp ứng đúng nhu cầu với chi phí thấp hơn nhiều (omp 387 dòng so với opencode 343 + 88 + 709 test, và omp đã có sẵn khái niệm bậc mà opencode không có).

## Chi phí

| việc | quy mô đo được | rủi ro nếu bỏ qua |
| --- | --- | --- |
| Đổi fallback `yolo` → `write` | 1 dòng (`approval.ts:80`) + doc | **Cao** — cài đặt mới chạy tool không hỏi; thay đổi này là hợp đồng bảo mật |
| Golden snapshot cho shape | 54 file mẫu của codex làm tham chiếu; quy mô ban đầu ~10-20 file | Trung bình — regression compaction/tool-exposure chỉ phát hiện khi chạy thật |
| Sandbox OS đầy đủ (nếu làm) | 11.440 dòng Rust / 30 file (đo ở codex) | **Cao nếu** omp chạy agent tự động trên repo không tin cậy; **thấp** nếu là công cụ dev hợp tác |
| Phê duyệt network (nếu làm) | 1.254 dòng (đo ở codex) | Trung bình, phụ thuộc mức rủi ro egress |
| `bash-allowed-prefixes` (nếu làm) | 346 dòng (đo ở gajae) | Thấp — là lớp phòng thủ thứ hai |

Tổng miền approval mà omp đã có: **387 + 141 + 959 = 1.487 dòng**. Để bắt kịp codex ở mức OS thì cần thêm ~11.440 dòng Rust — tức **8 lần** phần đã có, và đó là lý do `không làm` là câu trả lời mặc định ở đây.

---

# Miền 4 — MCP, ACP, tương thích agent khác

## Miền: Tương thích (MCP, ACP, protocol khác)  omp so với 4 repo tham chiếu

Đo tại chỗ, không clone. Mọi số dưới đây chạy bằng `git -C <repo> ls-files` / `xargs cat | wc -l` / `git grep`.
Ngày commit cuối: omp 2026-09-28 · gajae 2026-09-26 · codex 2026-09-26 · pi 2026-09-25 · opencode 2026-09-25.

## Sửa hai điều kiện đã cho trước

**1. `pi` KHÔNG có MCP, và cũng không có ACP.**

```
$ git -C /Users/tranquangdang21/Projects/pi-ref ls-files | grep -icE "mcp"
0
$ git -C /Users/tranquangdang21/Projects/pi-ref ls-files | grep -icE "(^|[-_/])acp([-_/]|$)"
0
$ ls /Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/
bun  cli  client  experimental  extensions  modes  utils      # không có thư mục mcp/
```

Hai chỗ duy nhất trong `pi` nhắc "MCP":

```
$ git -C .../pi-ref grep -rn "modelcontextprotocol" -- '*.json' | head
package-lock.json:1198:  "@modelcontextprotocol/sdk": "^1.25.2"
```

Đó là **optional peerDependency của `@google/genai`**, không phải code của pi:

```
$ python3 -c "... d['packages'] ..."
PARENT: node_modules/@google/genai | peer: {'@modelcontextprotocol/sdk': '^1.25.2'}
```

Chỗ thứ hai là một dòng comment trong `packages/coding-agent/src/utils/tool-result-images.ts:17`.
Hệ quả: đề án M1B "chép `protocol`/`client`/`server` của pi" không liên quan gì MCP. Ba package đó
là **protocol embed nội bộ của riêng pi** (CBOR + framing + Unix socket), 3.970 LOC — xem mục 3.

**2. `gajae` KHÔNG phải repo tham chiếu độc lập — nó là fork của chính dòng omp.**

```
$ comm -12 <(git -C omp ls-files|sort) <(git -C gajae ls-files|sort) | wc -l
1724                                    # trong tổng 6.027 file của gajae, 7.946 của omp
```

Bằng chứng cấu trúc mạnh hơn con số: `gajae` đổi tên thư mục `src/mcp/` → `src/runtime-mcp/`, giữ nguyên
16 tên file:

```
$ comm -12 <(omp src/mcp basenames) <(gajae src/runtime-mcp basenames) | tr '\n' ' '
client.ts config-writer.ts config.ts http.ts index.ts json-rpc.ts loader.ts manager.ts
oauth-discovery.ts oauth-flow.ts smithery-auth.ts smithery-connect.ts smithery-registry.ts
stdio.ts tool-bridge.ts tool-cache.ts types.ts
```

Và `gajae/crates/` vẫn mang tên thời omp: `pi-ast`, `pi-iso`, `pi-natives`, `pi-shell`.
Remote: `github.com/Yeachan-Heo/gajae-code.git`. Nó **mới hơn `pi`** (2026-09-26 vs 2026-09-25), tức là
đang được bảo trì song song, không phải bản sao cũ. Mọi thứ gajae làm thêm so với omp là **hướng đi của
một fork**, và cái giá để chép từ đó là cái giá để đi con đường của họ — không phải cách duy nhất.

Dòng thời gian: `pi` (earendil-works/pi) → `omp` (ultrabuilders/ultraworkers) → `gajae`.
Chỉ `opencode` và `codex` thật sự độc lập (giao nhau với omp lần lượt 29 và 17 đường dẫn).

## per_repo

| repo | Có gì | Bằng chứng | Kích thước |
|---|---|---|---|
| **omp** | MCP **client** (đủ 3 transport); MCP **server** hẹp (bộ nhớ); ACP **agent** tự viết; LSP | `packages/coding-agent/src/mcp/` (26 file); `transports/{stdio,http,sse}.ts`; `packages/mnemopi/src/mcp-server.ts`; `packages/coding-agent/src/modes/acp/` | MCP client **10.792** LOC · MCP server 1.125 · ACP **5.896** LOC · LSP 10.392 |
| **pi** | **Không MCP. Không ACP.** Chỉ có protocol embed nội bộ (CBOR + Unix socket) | `git ls-files \| grep -ci mcp` → `0`; `@google/genai` peer dep | embed 3.970 LOC (`protocol`+`client`+`server` src) |
| **opencode** | MCP **client** (không server); ACP **agent** dùng SDK chính thức | `packages/core/src/mcp/` (5 file); `packages/cli/src/acp/` (9 file); không có `registerTool`/`StdioServerTransport` ở đâu | MCP client **2.390** LOC · ACP **2.166** LOC, 21 test file |
| **codex** | MCP **client** lớn nhất bảng (Rust); **không ACP**; app-server protocol để embed | `codex-rs/rmcp-client/`, `codex-rs/codex-mcp/`, `core/src/mcp_tool_call.rs`; `mcp_cmd.rs:54-60` chỉ có list/get/add/remove/login/logout — **không có `serve`** | MCP **50.590** LOC Rust · app-server-protocol **186.003** LOC |
| **gajae** | MCP client + **2 MCP server**; ACP agent (SDK 1.3.0) + **ACP làm provider**; bridge sang codex | `runtime-mcp/`; `coordinator-mcp/server.ts:11418-11507`; `sdk/mcp/server.ts:397-426`; `ai/src/providers/devin-acp.ts`; `coordinator-mcp/codex-handoff.ts` | MCP client 12.835 · MCP server 12.238 · ACP agent 7.294 + sdk 1.143 + provider 1.103 |

### 1. MCP: ai server, ai client, ai cả hai

| repo | Client | Server | Ghi chú |
|---|---|---|---|
| omp | ✅ 10.792 LOC | ⚠️ hẹp | `mnemopi/src/mcp-server.ts:72-87` dispatch `initialize`/`tools/list`/`tools/call`. Chỉ phục vụ bộ nhớ. **Không** phục vụ tool của omp. |
| pi | ❌ | ❌ | không có gì |
| opencode | ✅ 2.390 LOC | ❌ | `MCP.Service` chỉ kết nối ra. |
| codex | ✅ 50.590 LOC Rust | ❌ | không có subcommand `serve`. |
| gajae | ✅ 12.835 LOC | ✅ 12.238 LOC | **hai** server thật, xem dưới. |

**omp không phải MCP server.** Đây là điểm cần nói thẳng: `docs/mcp-server-tool-authoring.md` dễ gây
hiểu nhầm, nhưng file thật (`mcp-server.ts`, 155 dòng) chỉ là adapter stdio cho `mnemopi`, không liên quan
gì tới việc expose tool của omp. Vậy nên trên trục MCP, **omp là client hạng nặng nhất ngoài codex, nhưng
là client thuần**.

`gajae` là repo duy nhất phục vụ MCP ra ngoài, và làm bằng hai tầng khác nhau:

- `coordinator-mcp/server.ts` (11.748 dòng) — JSON-RPC thật, dispatch `initialize` (11418), `tools/list`
  (11432), `prompts/list` (11439), `resources/list` (11442), `tools/call` (11445). Kèm cả hàng đợi câu hỏi
  và vòng đời phiên.
- `sdk/mcp/server.ts` (490 dòng) — `runSdkMcpStdio()` (426): serve session SDK của chính nó qua stdio.

Đây là hướng "làm coordinator đa agent", không phải "làm tool cho người khác dùng".

### 2. ACP: repo nào nói chuyện được

| repo | ACP | Vài trò | SDK | LOC src | Test file |
|---|---|---|---|---|---|
| **gajae** | ✅ | agent **+ provider** | `@agentclientprotocol/sdk` **1.3.0** | 7.294 (agent) + 1.143 (sdk) + 1.103 (devin) | **49** |
| **omp** | ✅ | agent | **tự viết** | 5.896 | 16 |
| **opencode** | ✅ | agent | `@agentclientprotocol/sdk` **1.2.1** | 2.166 | 21 |
| **codex** | ❌ | — | — | 0 | 0 |
| **pi** | ❌ | — | — | 0 | 0 |

Đo bằng tên phương thức (không phải tên file), trong `packages/utils/src/acp/protocol.ts` +
`packages/coding-agent/src/modes/acp/*` của omp:

```
fs/read_text_file fs/write_text_file session/cancel session/close session/fork session/list
session/load session/new session/prompt session/request_permission session/resume
session/set_config_option session/set_mode session/update
```

14 phương thức. Cả ba cùng `PROTOCOL_VERSION = 1` (omp `utils/src/acp/protocol.ts:13`, opencode
`cli/src/acp/service.ts:202`). **Ba bản thực sự tương thích**, không chỉ trùng tên.

gajae chỉ lộ 4 phương thức dạng chuỗi vì nó gọi hằng số của SDK, không hardcode — đó là bằng chứng nó
thật sự dựa vào SDK, không phải chỉ copy tên.

### 3. Thứ tương thích thứ ba mà omp không có

**(a) ACP dùng làm *backend agent* — chỉ gajae có.**
`gajae/packages/ai/src/providers/devin-acp.ts` (1.103 dòng) tự mô tả:

> "Devin CLI exposes no raw model-inference endpoint. Its programmatic surface is `devin acp` […]
> GJC therefore speaks ACP as the *client* and treats Devin as an agent-level provider"

Nó spawn `devin acp`, giữ 1 session ACP suốt đời hội thoại, forward duy nhất lượt user mới nhất, và
render `session/update` thành block display-only. Đây là "điều hoà cho tới khi backend LLM không thật
sự là LLM" — một kiểu tương thích mà **không repo nào khác trong 5 repo có**, kể cả codex.

**(b) Bridge sang agent khác — chỉ gajae có.** `coordinator-mcp/codex-handoff.ts` (552) +
`codex-wake-publisher.ts` (429) = 981 dòng, phát `question.opened`, `turn.waiting_for_answer`,
`turn.completed`… sang codex qua Unix socket hoặc TCP, kèm kiểm tra endpoint và ủy quyền token.
Trong omp, `grep -rniE "bridge.*(codex|claude|gemini)"` chỉ trả về **một** dòng comment ở
`session/code-mode.ts:4`. Không có gì.

**(c) Protocol để embed — codex mạnh nhất, không phải thứ omp thiếu.**

| repo | Bề mặt embed | LOC |
|---|---|---|
| codex | `app-server-protocol` (Rust + JSON Schema + TypeScript sinh ra) | **186.003** |
| opencode | `packages/server` + `packages/protocol` | 8.018 |
| omp | `sdk.ts` + `rpc` | 5.082 |
| gajae | `sdk/` + `coordinator-mcp/` | 145.820 (nhưng phần lớn là bus Telegram/Slack/Discord) |
| pi | `protocol`+`client`+`server` (CBOR, Unix socket) | 3.970 |

codex định nghĩa schema JSON-RPC 186k LOC có cả bản `.json` và `.ts` sinh tự động, publish ra ngoài. Đây
là thứ lớn nhất bảng và omp không có gì tương đương — nhưng nó là chi phí, không phải món ngon.

**(d) LSP.** omp 10.392 LOC (`src/lsp/`, 49 file) · gajae 7.365 · opencode 4.023 · codex 1 · **pi 0**.
omp mạnh nhất. Đây là điểm omp thắng rõ.

### 4. Port và wire format: trùng tên hay tương thích thật

**MCP — không tương thích, và đây là phát hiện đáng chú ý nhất của cả đợt đo.**

```
omp     packages/coding-agent/src/mcp/types.ts:175
        export const MCP_PROTOCOL_VERSION = "2025-11-25";

gajae   runtime-mcp/*:  "2025-03-26"  "2025-11-25"  "2026-07-28"  "2026-11-01"
opencode packages/core/src/mcp/client.ts:81-92: hỗ trợ "2026-07-28" + legacy fallback
codex   "2024-11-05" "2025-01-05" "2025-02-01" "2025-03-26"
```

omp **ghim một bản duy nhất** ở `2025-11-25` và không có đường thoái lui nào. opencode xử lý
`2026-07-28`, nơi client phải học kết quả `tools/call` bằng cách retry thay vì đọc từ response
(`client.ts:81-92`) — đúng loại thay đổi ngữ nghĩa mà mã ghim cứng sẽ hỏng âm thầm. Hai con số đó không
tương thích với nhau, và `2025-11-25` của omp đã cũ hơn hai thế hệ.

**ACP — tương thích thật.** Cùng `PROTOCOL_VERSION = 1`, cùng tên phương thức, cùng nội dung
`ContentBlock` (text/image/audio/resource_link/embedded_resource — `utils/src/acp/protocol.ts:38-76`).
omp tự viết schema (`utils/src/acp/schema.ts`, 160 dòng) thay vì dùng SDK, và vẫn nói chuyện được với
Zed. Đây là bằng chứng rằng bề mặt wire của ACP đủ ổn định để viết tay.

**Điểm mà wire format không đo được, nhưng đo bằng số test thì thấy:** omp có 16 file test ACP và
**83** file test/fixture MCP. gajae có 49 test ACP. opencode có 21 test ACP nhưng chỉ 13 test MCP.
omp là repo duy nhất có hệ thống fixture MCP sinh ra để ép từng nhánh lỗi: `test/fixtures/crash-after-init-mcp.ts`,
`hang-during-init-mcp.ts`, `flaky-http-mcp.ts`, `reconnect-storm`… Đây là tài sản vận hành, không copy được
bằng cách chép file.

### 5. Chỗ omp ĐÃ làm tốt hơn

1. **Test fixture MCP.** 83 file test/fixture so với 13 của opencode và 67 của gajae. Không repo nào
   khác dựng được bộ fixture ép lỗi ở mức này.
2. **LSP.** 10.392 LOC / 49 file, gấp 2,5× gajae, gấp 26× codex, và `pi` không có gì.
3. **Giữ cả 3 transport MCP.** omp có `stdio` + `http` + `sse`; gajae đã **bỏ `sse.ts`** (chỉ còn
   `http.ts` + `stdio.ts`). Đây là quyết định của fork, không phải tiến bộ — nếu server cũ chỉ nói SSE
   thì gajae không nối được, còn omp nối được.
4. **Không ràng buộc SDK.** Không phụ thuộc `@modelcontextprotocol/sdk` lẫn `@agentclientprotocol/sdk`
   (grep cả hai trong mọi `package.json`: **0 hit**). Nhờ vậy một bản SDK nổi lên không làm hỏng build,
   và việc thêm transport không cần nâng cấp dependency. Đổi lại: phải tự bảo trì schema.
5. **Chiều ngược không bị ràng buộc.** omp không phụ thuộc vào `pi`, và không repo tham chiếu nào có
   `protocol`/`client`/`server` kiểu CBOR-embed mà omp thiếu. Việc chép chúng từ `pi` là lựa chọn, không
   phải vá lỗ hổng.

## omp thiếu gì

| # | Thiếu | Bằng chứng | Kích thước | Mất gì nếu bỏ qua |
|---|---|---|---|---|
| 1 | **MCP protocol revision 2026-07-28 / 2026-11-01** | `mcp/types.ts:175` ghim `2025-11-25`; opencode `client.ts:81-92` đã xử lý retry ngữ nghĩa mới | ~150-400 LOC đổi trong `client.ts` + `manager.ts` | Server mới chỉ hỗ trợ revision mới sẽ lỗi `tools/call` kiểu cũ — lỗi âm thầm, tool trả về rỗng |
| 2 | **ACP làm backend agent** (ACP-client provider) | chỉ gajae: `ai/src/providers/devin-acp.ts` | ~1.100 LOC + 1 test | Không dùng được agent nào chỉ expose ACP (Devin, Gemini CLI, một số vendor) như một provider. Đây là loại backend duy nhất trong bảng mà omp không nối tới. |
| 3 | **Bridge sang codex** (đánh thức phiên khác) | chỉ gajae: `codex-handoff.ts` + `codex-wake-publisher.ts` = 981 LOC | ~1.000 LOC | Không phối hợp được với codex đang chạy. Tính năng sản phẩm, không phải tương thích. |
| 4 | **Lày MCP server thật** (expose tool của omp) | gajae `sdk/mcp/server.ts` 490 LOC là bản nhỏ nhất, đã đủ `tools/list`+`tools/call` | ~500 LOC | omp chỉ tiêu thụ MCP, không phục vụ. Editor khác không nhúng được omp như backend tool. |
| 5 | **Bản schema MCP sinh ra** | codex `app-server-protocol/schema/{json,typescript}/` (7.241 LOC sinh tự động) | ~7.000 LOC + pipeline sinh | Không có hợp đồng wire ổn định cho bên thứ ba đồng bộ. |

**Không phải thiếu sót (đã kiểm, không thấy):** A2A. `git grep -rn "A2A"` trong omp trả 18 hit nhưng
toàn blob base64 trong `packages/tui/src/theme/glyph-bundle.json` và `MOE_BACKEND_A2A` trong
`ai/src/providers/devin/proto/exa/trainer_pb/config.proto:95`. Cả 5 repo đều không có A2A thật.
Đừng ai đề xuất port A2A.

## Kết luận

**Làm**

- **Nâng MCP lên 2026-07-28.** Đây là việc duy nhất tôi khẳng định nên làm. `mcp/types.ts:175` đang ghim
  `2025-11-25`; opencode đã xử lý ngữ nghĩa retry mới, gajae đã lên `2026-11-01`. Chi phí nhỏ
  (thay hằng + thêm nhánh trong `client.ts`/`manager.ts`), rủi ro hiện tại là tương thích với server mới.
  Làm trước mọi thứ khác trong danh sách này.

**Làm nếu có điều kiện**

- **MCP server tối thiểu** (~500 LOC, theo khuôn `gajae/sdk/mcp/server.ts`) — *chỉ khi* có yêu cầu
  nhúng omp vào editor. Nếu không, `mcp/client.ts` đã cho phép làm ngược: chạy một process làm MCP
  client rồi đẩy tool ngược. Đừng viết server chỉ vì "opencode/codex có" — chúng không có.
- **ACP làm provider** (~1.100 LOC) — *chỉ khi* có backend agent cụ thể cần nối. Chi phí không chỉ là
  code: `devin-acp.ts` phải trả lời 4 loại câu hỏi (ai giữ lịch sử hội thoại, ai thực thi tool, ai trả
  lời `session/request_permission`, ai render `session/update`) và mọi công cụ của omp trong lượt đó
  **không dùng được**. Đó là một quyết định sản phẩm, không phải một bổ sung kỹ thuật.
- **Bridge codex** (~1.000 LOC) — *chỉ khi* `collab-web` thực sự cần điều phối với tiến trình codex bên
  ngoài. Hiện tại đây là tính năng của gajae, không phải nợ kỹ thuật của omp.

**Không làm**

- **Chép `protocol`/`client`/`server` của `pi` với lý do "MCP".** Đo đã bác bỏ: `pi` có 0 file MCP.
  Ba package đó là CBOR-over-Unix-socket, 3.970 LOC, phục vụ điều phối nội bộ. `omp` đã có
  `collab-web` (WebSocket) và `sdk.ts`; thêm một giao thức embed thứ ba tạo ra ba đường vào, không
  phải một.
- **Port `coordinator-mcp` của gajae** (12.238 LOC). Đây là kiến trúc coordinator đa agent của một
  sản phẩm có Telegram/Slack/Discord bus (145.820 LOC trong `sdk/`). Chép khối này vào omp là chép
  cả mô hình sản phẩm của họ.
- **Port `app-server-protocol` của codex** (186.003 LOC). Chủ yếu là schema sinh tự động cho JSON-RPC
  nội bộ của chính codex; không phải chuẩn mà ai ngoài codex dùng.
- **Bỏ `sse.ts`.** gajae đã bỏ; đó là hồi quy, không phải chuẩn.

## Chi phí

| Việc | LOC ước tính | Rủi ro | Nguồn lấy |
|---|---|---|---|
| MCP → 2026-07-28 | 150-400 | Thấp. Rủi ro thật là **không** làm | opencode `core/src/mcp/client.ts:81-92` (mô tả ngữ nghĩa), gajae `runtime-mcp/protocol.ts` |
| MCP server tối thiểu | ~500 | Thấp | gajae `sdk/mcp/server.ts` (đã MIT, 490 dòng, sẵn `tools/list`+`tools/call`) |
| ACP làm provider | ~1.100 + test | **Cao** — đổi mô hình quyền sở hữu tool và lịch sử hội thoại | gajae `ai/src/providers/devin-acp.ts` (MIT) |
| Bridge codex | ~1.000 | Trung bình — protocol riêng, không chuẩn, phải khớp phiên bản codex | gajae `coordinator-mcp/codex-handoff.ts` |
| Schema sinh tự động | ~7.000 + pipeline | Trung bình | codex `app-server-protocol/` (Apache-2.0) |

**Ràng buộc giấy phép:** cả bốn repo tham chiếu đều cho phép sao chép — `pi` MIT, `opencode` MIT,
`codex` Apache-2.0, `gajae` MIT. Không có rào cản pháp lý nào chặn bất kỳ món nào trên đây. Ràng buộc
thật là **chi phí và mô hình sản phẩm**, không phải luật.

**Cái mất nếu bỏ qua toàn bộ:** chỉ mất khả năng nối tới các server MCP mới hơn `2025-11-25`. Đó là
khoản nợ kỹ thuật thật duy nhất. ACP, LSP, ba transport, bộ 83 fixture test — omp đã đứng vững ở đây,
thắng cả hai repo độc lập. Phần còn lại của danh sách là *sản phẩm*, không phải *tương thích*.

---

# Miền 5 — Session, lưu trữ, khôi phục

## Session / Lưu trữ / Khôi phục — omp so với 4 repo tham chiếu

Ngày đo: 2026-09-28. Tất cả số đo chạy tại chỗ trên 5 cây, không clone.
Lệnh dùng: `git ls-files | wc -l`, `wc -l`, `git grep -n`, `find`, `ls`.

---

## 0. Đính chính tiền đề trước khi so sánh

### 0.1. gajae KHÔNG phải repo độc lập — nó là anh em cùng gia đình với omp

Đây là phát hiện quan trọng nhất về *phương pháp*, không phải về *tính năng*:

```
# cùng một file, cùng một hàm, cùng nội bộ
gajae packages/utils/src/stream.ts:434  export function parseJsonlLenient<T>(buffer: string): T[]
omp   packages/utils/src/stream.ts:575  export function parseJsonlLenient<T>(buffer: string, options: { onMalformedRecord?: () => void } = {}): T[]

# cùng dùng Bun.JSONL.parseChunk bên trong
gajae packages/utils/src/stream.ts:15,20   Bun.JSONL.parseChunk(input)
omp   packages/utils/src/stream.ts:49,208,225  Bun.JSONL.parseChunk(...)
```

Và cả hai đều có `recoverOrphanedBackups` (1 file mỗi repo), cùng tên hàm, cùng mục đích
(khôi phục file `.bak` mồ côi sau crash giữa hai lần rename).

**Hệ quả:** trong miền session/storage, `gajae` **không phải nguồn tham chiếu độc lập**.
Nó là một fork đã tiến thêm 2 phiên bản định dạng (v5 vs v3 của omp). Diff omp↔gajae ở đây
là *tiến hóa cùng codebase*, rẻ hơn nhiều so với port từ `pi` hay `codex`.
Bốn repo tham chiếu **thực sự độc lập** chỉ còn 3: `pi`, `opencode`, `codex`.

### 0.2. `pi` cũng chung gia đình — nhưng ở nhánh khác

```
pi    packages/coding-agent/src/core/session-manager.ts:41   export const CURRENT_SESSION_VERSION = 3;
pi    packages/coding-agent/src/core/session-manager.ts:287  function migrateV1ToV2(...)
pi    git grep -l 'parseJsonlLenient' -- packages  → 0 file
```

`pi` giữ nguyên session-JSONL v3 **và không có** `parseJsonlLenient`. Nghĩa là: `pi` rời
nhánh JSONL transcript *trước khi* `omp`/`gajae` thêm lớp parse khoá. `pi` đã đi sang hướng
`durable` (log + projection) — khác hẳn.

**Trách nhiệm M1B cần sửa:** brief nói "M1B đang lên kế hoạch chép `session-backends` + `durable`".
Đo cho thấy `pi` **không có** `parseJsonlLenient` ⇒ `pi` **không sửa được** điểm yếu hỏng file
JSONL mà omp vẫn còn. Port `durable` của pi là **đổi mô hình dữ liệu**, không phải bổ sung
một tiện ích. Chi phí phải tính lại (xem `## Chi phí`).

### 0.3. Kiểm lại số đo quy mô trong brief

| Số | Brief | Đo lại | Kết luận |
|---|---|---|---|
| pi TS files | 1.564 | **1.591** | brief thấp hơn 27 |
| omp TS files | 5.325 | **5.407** | brief thấp hơn 82 |
| pi `session-backends` | 27 file | **33 file** (gồm bench + `*.sql`) | thấp hơn 6 |
| pi `durable` | 52 file | **63 file** (gồm 24 file test + 7 docs) | thấp hơn 11 |
| pi `durable` + `session-backends` src | — | **11.118 dòng** | mới đo |
| opencode / codex / gajae TS | 3.639 / 758 / 4.459 | không đo lại (ngoài miền) | — |

Khác biệt nhỏ, nhưng hai số về `durable`/`session-backends` thấp hơn thực tế vì brief
đếm trước khi tách test/docs. Dùng số đo lại cho phần tính chi phí.

---

## 1. Bảng per_repo

| repo | Có gì | Bằng chứng | Kích thước |
|---|---|---|---|
| **omp** | JSONL 1 file/session, `version: 3`, title slot 256 byte ở dòng vật lý đầu | `packages/coding-agent/src/session/session-entries.ts:13` `CURRENT_SESSION_VERSION = 3`; `docs/session.md:35-45` | 89 file, **55.309 dòng** |
| omp | Append-only, **không fsync**, tự ghi trong doc là "software-crash safe but not power-loss safe" | `session-manager.ts:691-696` (nguyên văn comment của repo) | — |
| omp | Migration tại chỗ v1→v2→v3, **không ghi lại ngay**, đánh dấu rewrite rồi ghi ở lần persist kế tiếp | `session-migrations.ts:63-73`; `docs/session.md:418-422`; `session-manager.ts:1882` | file migration 78 dòng |
| omp | **Dòng hỏng bị bỏ qua và sau đó bị dọn**: parse lenient → đếm → rewrite thân file | `utils/src/stream.ts:575-600` `parseJsonlLenient` + `session-loader.ts:95`; `session-manager.ts:1882` `#rewriteRequired = migrated \|\| malformedRecords > 0` | — |
| omp | Khóa cross-process thật (flock) cho chuyển draft→durable + xoá có điều kiện; **append thường không khoá** | `session-manager.ts:1340-1348` (điều kiện hẹp); `utils/src/file-lock.ts:84-91`; `crates/pi-natives/src/file_lock/unix.rs` | file-lock 100 dòng |
| omp | CAS theo kích thước byte cho mọi full-rewrite, 3 backend | `session-storage.ts:66-75` `SessionWriteConflictError`; `indexed-session-storage.ts:146`; `sql-session-storage.ts:394`; `redis-session-storage.ts:214` | storage 1.262 dòng |
| omp | 4 backend: File / Memory / Indexed(Redis) / Indexed(SQL), SQL hỗ trợ postgres+mysql+sqlite | `sql-session-storage.ts:15` `SqlSessionStorageAdapter` | 712+434+281 dòng |
| omp | GC thật: archive lạnh, gzip, sweep blob, WAL checkpoint; có `gc.lock` + breaker | `cli/gc-cli.ts` 1.704 dòng; mặc định `coldArchiveAfterDays:30`, `retainNewestGlobal:20`, `retainNewestPerCwd:10` (`cli/gc-settings.ts:13,15,17`) | test gc-cli 78 KB |
| omp | **File transcript không bao giờ nhỏ lại**: `#fileBody()` ghi lại *toàn bộ* `#entries`, compaction chỉ là marker | `session-manager.ts:1126-1131` | — |
| omp | Session không đọc được → **bỏ qua khỏi danh sách, âm thầm**, file vẫn còn | `session-listing.ts:422-435` `return undefined` | listing 848 dòng |
| omp | Thừa nhận mất dữ liệu bằng thông báo thật | `modes/persistence-failure.ts:23` "unsaved entries are lost" | 24 dòng |
| omp | 27 file test trong `test/session-manager/` + 26 file `session*.test.ts` | `ls packages/coding-agent/test/session-manager \| wc -l` | 6.806 dòng test |
| **pi** | **Hai SQLite schema độc lập + JSONL**, không có hợp đồng trên đĩa thống nhất | `durable/src/storage/sqlite/migrations.ts` (8 bảng, 12 index) và `session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql` (7 bảng `WITHOUT ROWID`, 2 trigger) | 8 file chính = **4.316 dòng** |
| pi | JSONL: `FORMAT_VERSION = 1` hằng cứng, mismatch → **ném lỗi cả file** | `durable/src/storage/jsonl/storage.ts:27,178,208` | storage 840 dòng |
| pi | `sqlite-node` version theo từng row: **cả hai chiều đều ném**, không có upgrader | `sqlite-node/src/sqlite/session/session-row.ts:57-62` | 1 file `.sql` duy nhất toàn repo |
| pi | JSONL `fsync` **mặc định tắt** (`fsync ?? false`); SQLite `WAL` + `synchronous = NORMAL` | `jsonl/storage.ts:75-78,255`; `durable/src/storage/sqlite/node.ts:101-103` | — |
| pi | **Đuôi rách → cắt bỏ, load tiếp**. Dòng hỏng *hoàn chỉnh* → **mất cả file** | `jsonl/storage.ts:780-798` (cắt byte) vs `:115-121` `JsonlCorruptionError` (ném ra `open()`) | — |
| pi | JSONL **không hỗ trợ nhiều tiến trình**: không flock, chỉ có chuỗi promise trong process | `grep -rniE "flock|lockfile|advisory"` trên `durable/src` + `session-backends` → **0 hit** | `#enqueue` session.ts:284-291 |
| pi | SQLite thì an toàn nhờ chính engine (`BEGIN IMMEDIATE`, `busy_timeout=5000`) | `sqlite-node/src/sqlite/repo.ts:64-70` | — |
| pi | Danh sách session hỏng → **biến mất khỏi listing**, chỉ báo lỗi khi mở | `sqlite-node/src/sqlite/repo.ts:277-280` `catch {}` | — |
| pi | Fork = **con trỏ cha**, không copy entry; `forks.ts` chỉ 97 dòng và chỉ lập *kế hoạch* copy | `durable/src/session/forks.ts:20-23,87-93` | 97 dòng |
| pi | `transaction.ts` 879 dòng nhưng **không phải storage transaction** — là staging object, không begin/commit/fsync | `durable/src/session/transaction.ts:144-148` | 879 dòng |
| **opencode** | **Không có file per session.** Tất cả trong **một file SQLite** duy nhất | `packages/core/src/session/sql.ts:22,79` bảng `session_v2`, `session_message` | 36 file = **8.109 dòng** |
| opencode | Không hề có file IO trong tầng session | `grep -rnE "writeFile\|Bun\.write\|appendFile\|fsync"` trên `core/src/session`+`database` → **0 hit** | — |
| opencode | `synchronous = NORMAL` → mất commit gần nhất khi mất điện | `core/src/database/database.ts:37-45` | — |
| opencode | Cột `version` là **version của app**, không phải schema; không bao giờ được đọc lại | `core/src/session.ts:266`; `info.ts:16-63` không đọc `row.version` | — |
| opencode | 50 file migration SQL + **1.135 dòng** data-migration v1→v2, có cursor để resume | `core/src/database/migration/` (50 file); `v1-migration.bun.ts` | 1.135 dòng |
| opencode | Event log + projection trong **cùng một** `IMMEDIATE` transaction | `core/src/bus.ts:317-318,433` | bus 908 dòng |
| opencode | Event type có `version` riêng; bản cũ **không có projector → bị bỏ qua âm thầm khi replay** | `schema/src/session-event.ts:45-50`; `bus.ts:314,885` `projectors.get(key) ?? []` | — |
| opencode | `flock` **có** nhưng **không dùng cho session** — chỉ cho git cache, npm plugin, log | `packages/util/src/flock.ts`; consumer: `repository-cache.ts:120`, `plugin/update.ts:19` | — |
| opencode | 1 dòng JSON hỏng → **toàn bộ session không đọc được** | `core/src/session/store.ts:174-177` `Effect.forEach` không có `either` | — |
| opencode | `store.list` **không có chắn lỗi** → 1 row hỏng làm hỏng cả endpoint list | `store.ts:138` → `info.ts:17` `Info.make()` ném | — |
| opencode | **Không có retention/GC/VACUUM nào cả** | `grep -rniE "prune\|retention\|maxSessions\|vacuum"` → chỉ trúng `tool-output`/`shell`/`pty` | — |
| **codex** | JSONL "rollout", 1 file/session, append-only, 12 biến thể item | `codex-rs/rollout/src/rollout_file_name.rs:62-74`; `history/src/rollout_payload.rs:22-24` | 36 file = **16.664 dòng** |
| codex | Đường dẫn có phân cấp ngày: `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl` | `recorder.rs:1730-1741` | — |
| codex | **Không fsync ở đâu trong write path.** `tokio::fs::File` không buffer nên `flush()` là no-op → không mất khi process crash, **mất đuôi khi mất điện** | `recorder.rs:2090-2096` `write_line`; `compression.rs:151,161,878` là 3 hit `sync_all` duy nhất và ở worker nén | — |
| codex | **Không có trường version.** Tương thích dựa hoàn toàn vào `#[serde(default)]` + 2 shim thủ công | `history/src/lib.rs:352`; `rollout_payload.rs:292-298` union untagged `WindowIdWire` | — |
| codex | Đường ghi hỏng bị **bỏ qua im lặng**, có đếm nhưng **số đếm bị vứt** | `recorder.rs:1110,1129` `continue`; `:1157` bind `_parse_errors` | — |
| codex | Tự chữa đuôi rách: thêm `\n` vào dòng rác để "niêm phong" nó thành dòng riêng | `recorder.rs:2042-2055` `ensure_rollout_is_newline_terminated` | — |
| codex | **Khoá cross-process thật và đúng**: `flock` mỗi thread + khoá phối hợp + **GC khoá cũ** | `rollout/src/writer_lock.rs:51-79`; `:124-171` `remove_stale_thread_locks` | 200 dòng |
| codex | Tranh lock → lỗi có kiểu `ThreadStoreError::Conflict`, **không** nối dòng | `thread-store/src/local/mod.rs:335-350` | — |
| codex | Fork = **con trỏ cha + byte-offset** (`history_base`, `forked_from_ordinal_exclusive`), không copy | `core/src/session/mod.rs:423-431`; `protocol.rs:3131-3138,3182-3184` | — |
| codex | Nén zstd session > 7 ngày, tự giải nén khi append lại | `compression.rs:336` `MIN_ROLLOUT_AGE = 7 ngày` | 1.414 dòng |
| codex | **Không có upload nào.** Đường thoát duy nhất là `/feedback` có consent-gate | `grep share_session\|upload_rollout` trên `codex-rs/` → **0 hit**; `feedback/src/lib.rs:484-486` | — |
| **gajae** | JSONL 1 file/session, **`version: 5`** (cao hơn omp 2 bậc) | `gajae packages/coding-agent/src/session/session-manager.ts:251` `CURRENT_SESSION_VERSION = 5` | session-manager **22.545 dòng** |
| gajae | Migration giống hệt omp v1→v2→v3, cộng 2 bản nâng version chỉ-đổi-header | `session-manager.ts:2701,2731,2744-2759` | — |
| gajae | **Có `fsyncSync()`** thật + fsync thư mục sau mỗi publish | `session-storage.ts:1219-1226`; `:757-761` `fsyncDirectorySync` | storage 3.677 dòng |
| gajae | Rewrite = tmp + fsync + rename, có rollback `.bak` khi EPERM | `session-manager.ts:15800-15809`; `:12155-12187` | — |
| gajae | **Hai loader, chính sách hỏng ngược nhau**: `loadEntriesFromFile` lenient (bỏ đuôi rách, im lặng) vs `inspectTranscriptStrict` ném cả file | `utils/src/stream.ts:443-447` vs `session-manager.ts:4002-4007,4030` | — |
| gajae | Session hỏng → bỏ khỏi danh sách, `catch { return undefined }`, **file không bị xoá** | `session-manager.ts:4803-4831` | — |
| gajae | Transcript **không khoá cross-process**; khoá duy nhất thuộc về memory sidecar | `session-manager.ts:8754` (chỉ spill build); `docs/session.md:52` tự thừa nhận | — |
| gajae | Nhưng SDK session index **có** khoá cross-process + event log **có checksum** + seq tăng đơn điệu | `sdk/broker/session-index.ts:1151-1163,1679-1690` | 2.515 dòng |
| gajae | Retention có thật nhưng **mặc định tắt**: 60 ngày, trục dung lượng = 0, cần `--prune` | `config/settings-schema.ts:3257-3268` | — |

---

## 2. So sánh theo 5 trục của miền

### 2.1. Định dạng lưu trữ

| | omp | pi | opencode | codex | gajae |
|---|---|---|---|---|---|
| Đơn vị | 1 file `.jsonl` / session | JSONL (`main.jsonl` + sidecar) **hoặc** SQLite | 1 file SQLite, nhiều bảng | 1 file `.jsonl` / session | 1 file `.jsonl` / session |
| Append-only | có | có (JSONL) | không (INSERT/UPDATE row) | có | có |
| Checksum | không | không | không | không | không (chỉ SDK index có) |
| Có trường version | **có, v3** | có (JSONL v1 cứng; SQLite per-row v1) | **không** (cột `version` là version app) | **không** | **có, v5** |
| Backend thay thế | File/Memory/Redis/SQL | 2 schema SQLite + JSONL + Memory | SQLite, chạy được cả trong Durable Object | JSONL + SQLite projection | JSONL |

**Điểm đáng chú ý:** không repo nào trong 5 có checksum hay chữ ký nội dung. `codex` và `gajae`
dùng *ordinal tăng đơn điệu* để phát hiện lệch, `pi` dùng `seq` tăng nghiêm ngặt — đó là
tín hiệu toàn vẹn cấu trúc, yếu hơn checksum nhưng mạnh hơn "hy vọng".

### 2.2. Migration

| | Cơ chế | File cũ mở ra | Chi phí |
|---|---|---|---|
| omp | header `version` + `migrateToCurrentVersion`, sửa **trong bộ nhớ**, đánh dấu rewrite | đọc & nâng cấp | 78 dòng, 2 hàm |
| pi (SQLite) | `durable_schema` bảng version, contiguity check | nâng cấp tuần tự | 123 dòng |
| pi (sqlite-node) | version trên từng row | **cả 2 chiều đều ném** — không có upgrader | 57-62 |
| opencode | 50 file SQL + 1.135 dòng data-migration có cursor | nâng cấp thật, **resume được** | lớn nhất trong 5 repo |
| codex | **không có version**, dựa vào `#[serde(default)]` + shim | parse được, bỏ qua dòng lạ | 0 dòng code migration |
| gajae | `version: 5`, 2 hàm migration thật | nâng cấp trong bộ nhớ, **không ghi lại khi đọc** | `session-manager.ts:2744` |

**Điểm đáng chú ý:** `codex` chọn "không version, chịu bằng serde mặc định" — rẻ nhưng
một dòng JSON *đúng hình dạng, sai ngữ nghĩa* sẽ parse xong rồi bị drop im lặng. `omp` và
`gajae` chọn "có version, nâng cấp tại chỗ" — đắt hơn nhưng **không bao giờ** âm thầm
đọc sai. `opencode` đắt nhất và cũng đáng nhất: có cursor nên migration 1.135 dòng chạy
được trên DB thật mà không sập giữa chừng.

### 2.3. Bền vững trước crash

Đây là trục nơi **không repo nào** đạt chuẩn điện — cả 5 đều mất đuôi khi mất điện:

| repo | fsync trên write path? | Trục đỏ khi mất điện | Nguồn |
|---|---|---|---|
| omp | **không, có chủ đích** | vài giây cuối | `session-manager.ts:691-696` (tự thừa nhận) |
| pi JSONL | không, mặc định `fsync ?? false` | toàn bộ phiên | `jsonl/storage.ts:255` |
| pi SQLite | `WAL` + `synchronous = NORMAL` | tới checkpoint (1000 trang) | `durable/src/storage/sqlite/node.ts:101-103` |
| opencode | `WAL` + `synchronous = NORMAL` | tới checkpoint | `core/src/database/database.ts:37-45` |
| codex | không có `sync_all` nào trong write path | vài giây cuối | `recorder.rs:2090-2096` |
| gajae | **có `fsyncSync()` thật**, nhưng phải gọi tay | tùy caller | `session-storage.ts:1219-1226` |

**Điểm đáng chú ý — khác biệt thật sự, không phải khác biệt văn phong:**
`omp` tự viết ra *"software-crash safe but not power-loss safe"*. `codex` cũng không fsync
nhưng **không nói gì**, và thêm `\n` vào dòng rác để niêm phong nó — tức là *ghi đè dấu vết
sự cố đi kèm lỗi*. Đây là khuyến nghị cụ thể nhất tôi rút ra: **nếu giữ nguyên chính sách
không-fsync, hãy giữ tiếng nói của omp và bỏ thói quen niêm phong của codex.**

### 2.4. Nhiều tiến trình

| repo | Cơ chế | Hệ quả tranh chấp |
|---|---|---|
| omp | `flock` thật (Linux abstract socket / unix flock) nhưng **chỉ khoá hẹp**: chuyển draft→durable + xoá có điều kiện. Append thường dựa vào `O_APPEND` + CAS kích thước byte | `SessionWriteConflictError`, không ghi đè âm thầm |
| pi (JSONL) | **không có gì** — grep flock/lockfile/advisory → 0 hit | **hai tiến trình sẽ hỏng file** |
| pi (SQLite) | `BEGIN IMMEDIATE` + `busy_timeout=5000` | SQLite tự serialize |
| opencode | `IMMEDIATE` transaction + owner_id + sequence + dedup guard | chết to, không ghi đè |
| codex | `flock` **mỗi thread** + khoá phối hợp + **GC khoá cũ sau crash** | `ThreadStoreError::Conflict` |
| gajae (transcript) | **không có** | `O_APPEND` mỗi-dòng, mất cập nhật khi full-rewrite |
| gajae (SDK index) | `withFileLock` + checksum + seq | đúng |

**Điểm đáng chú ý:** `codex` là repo duy nhất xử lý được **khoá mồ côi sau crash**
(`remove_stale_thread_locks`, `writer_lock.rs:124-171`) — `flock` của OS tự giải phóng khi
tiến trình chết, nhưng *file khoá* thì không. Cả omp lẫn gajae đều dựa vào chính kernel
giải phóng (`crates/pi-natives/src/file_lock/mod.rs:48` "process-owned and automatically
released on exit") nên không cần GC — nhưng đó là một điều kiện kiến trúc mà
`pi`/`gajae` không có.

### 2.5. Hỏng file / đuôi rách — **"mất" hay "bỏ qua"?**

Đây là câu hỏi trọng tâm của miền. Bảng dưới là kết quả đo:

| repo | Đuôi rách (crash giữa append) | Dòng hỏng giữa file | Session hỏng trong danh sách |
|---|---|---|---|
| **omp** | **bỏ qua, rồi bị dọn** — parse lenient đếm `malformedRecords`, set `#rewriteRequired`, lần persist kế tiếp ghi lại thân file ⇒ dòng rác **biến mất vĩnh viễn** | **bỏ qua, tự dọn** (cùng đường) | bỏ khỏi danh sách, âm thầm, file còn nguyên |
| **pi** | **cắt byte trên đĩa**, load tiếp, không lỗi | **mất cả file** — `JsonlCorruptionError` ném ra `open()` | **biến mất khỏi listing**, chỉ báo khi mở |
| **opencode** | không mô hình hoá (SQLite lo) | 1 row hỏng ⇒ **cả session không đọc được** | **1 row hỏng làm hỏng cả endpoint list** |
| **codex** | **bỏ qua im lặng**, đếm rồi **vứt số đếm**; tự thêm `\n` niêm phong dòng rác | bỏ qua im lặng | không mô hình hoá (quét file) |
| **gajae** | lenient: bỏ đuôi rách im lặng. **strict**: ném cả file — **tùy đường vào** | lenient bỏ qua / strict ném cả file | bỏ khỏi danh sách, `catch { return undefined }` |

**Điểm đáng chú ý — đây là phát hiện đáng giá nhất của toàn bài:**

1. **`omp` là repo duy nhất tự chữa lành.** Không ai khác lấy "bỏ qua" rồi **xoá rác khỏi đĩa**.
   `pi` cắt đuôi rách nhưng một dòng hỏng giữa file vẫn giết cả session. `codex` bỏ qua rồi
   **niêm phong dòng rác thành dòng vĩnh viễn** — tức là rác tích tụ mãi. `gajae` có hai
   loader trái chiều. Chỉ `omp` có đường `malformed → count → rewrite → sạch`.

2. **Nhưng `omp` có một lỗ hổng đúng nơi tệ nhất:** `session-listing.ts:422-435` trả
   `undefined` cho file không parse được — **không log, không cảnh báo**. Người dùng nhìn
   session biến mất khỏi danh sách mới hiểu là hỏng. File vẫn còn (đây là "bỏ qua", đúng
   nghĩa) nhưng **không ai được báo**. `gajae` yếu hơn ở đây vì nó có thêm đường *strict*
   cho resume/fork/ACP; `omp` chỉ có một con đường lenient duy nhất cho mọi thứ.

3. **`pi` là repo có rủi ro lớn nhất trong miền này** — và nó chính là repo M1B đang định
   chép. `parseJson` của `pi` (`jsonl/storage.ts:115-121`) không có `try/catch` quanh
   chỗ gọi (`:813`), nên **một byte hỏng giữa file = mất trọn session**. Không có
   `--lenient`, không có salvage. Nếu M1B port nguyên xi, omp **mất** hạ tầng hỗ trợ
   dòng hỏng mà nó đang có.

---

## 3. omp thiếu gì

Xếp theo mức hại khi thiếu, không theo độ "hay".

### 3.1. Thiếu thật, và có hại

| # | Thiếu | Vì sao có hại | Bằng chứng thiếu |
|---|---|---|---|
| 1 | **Cảnh báo khi bỏ qua session không đọc được** | `scanSessionFile` trả `undefined` im lặng. Người dùng thấy session "biến mất", không biết là hỏng hay bị xoá. Đúng câu hỏi "mất hay bỏ qua" — omp trả lời *bỏ qua* nhưng **không ai nói** | `session-listing.ts:422-435`; không có `logger` trong hàm |
| 2 | **fsync không bao giờ được gọi** | Mất vài giây cuối khi mất điện/kernel panic. Chấp nhận được **nếu nói ra**; omp có nói trong doc nhưng người dùng không đọc doc | `session-manager.ts:691-696` |
| 3 | **Đường đọc "nghiêm ngặt"** cho fork / resume / ACP | Mọi lỗi hiện đều đi qua một loader lenient. Fork từ file có đuôi rách sẽ âm thầm mất entry cuối thay vì từ chối | `session-loader.ts` chỉ có `parseSessionContent`; không có biến thể strict |
| 4 | **Transcript không bao giờ nhỏ lại** | `#fileBody()` ghi lại toàn bộ `#entries`. Session 6 tháng tuổi vẫn giữ mọi entry đã compact. Chỉ giảm khi `omp gc` archive + gzip (mặc định 30 ngày) | `session-manager.ts:1126-1131` |
| 5 | **Khoá cross-process chỉ phủ 1 trường hợp hẹp** | Append thường dựa `O_APPEND`. Hai tiến trình cùng mở một session vẫn có thể xen dòng; CAS kích thước chỉ bảo vệ *rewrite*, không bảo vệ *append* | `session-manager.ts:1340-1348` — điều kiện `&&` rất hẹp |

### 3.2. Thiếu, nhưng cân nhắc được

| # | Thiếu | Bằng chứng ở repo khác | Đánh giá |
|---|---|---|---|
| 6 | **Checksum nội dung** | Không repo nào có (kể cả 4 repo tham chiếu). gajae có ở *SDK index* | Không lấy. Chuẩn ngành chưa ai làm; thêm vào sẽ tốn I/O trên đường nóng |
| 7 | **Compression nền** cho session cũ | codex zstd > 7 ngày (`compression.rs:336`); omp gzip nhưng chỉ trong `gc` | omp đã có, chỉ khác codec và ngưỡng. Không cần |
| 8 | **Đếm bản ghi hỏng và lưu lại** | codex đếm rồi **vứt** (`recorder.rs:1157` bind `_parse_errors`) | Không lấy codex. Nhưng nên giữ `malformedRecords` của omp để **báo cáo**, không phải để nuôi thêm bộ đếm |
| 9 | **GC khoá mồ côi** | codex `remove_stale_thread_locks` (`writer_lock.rs:124-171`) | Không cần — `pi-natives` FileLock tự giải phóng khi tiến trình chết (`crates/pi-natives/src/file_lock/mod.rs:48`). Đây là lợi thế kiến trúc của omp |
| 10 | **Migration có cursor / resume được** | opencode `v1-migration.bun.ts:95,562,598` | Chỉ cần khi migration nặng. omp migration là 78 dòng, chạy tức thì. Chưa cần |
| 11 | **GC theo dung lượng tổng** | gajae `gc.sessions.maxTotalBytes` — mặc định **0 (tắt)** | Chính gajae mặc định tắt. Không lấy |
| 12 | **Reset/revert tạo rollout mới thay vì ghi đè** | codex `revert_thread.rs:130` | omp đã có `reset_boundary` entry (`docs/session.md:278`). Tương đương |

### 3.3. Không thiếu — cần nói rõ để khỏi port nhầm

- **SQLite backend**: omp **đã có** (`sql-session-storage.ts`, hỗ trợ postgres+mysql+sqlite) và 4 backend tổng cộng. `pi` có 2 schema SQLite nhưng omp không thiếu khả năng.
- **Multi-process**: omp có `flock` thật qua Rust native, `pi` có **0**, `gajae` transcript có **0**. Không có gì để lấy.
- **Fork**: omp có `parentId` + `leafId` (`docs/session.md:439-449`); `pi` chỉ lập kế hoạch copy 97 dòng; `codex` dùng byte-offset. Không thiếu.
- **Retention**: omp có `gc` với archive 30 ngày + giữ 20 global / 10 per-cwd. `opencode` **không có gì cả**.
- **Backup + khôi phục**: omp có `.bak` + `recoverOrphanedBackups`; `opencode` không có khái niệm này.

---

## 4. Kết luận

### 🟢 LÀM

**L1 — Báo cáo session bị bỏ qua. Rẻ nhất, hại nhất.**
`session-listing.ts:422-435` đang trả `undefined` im lặng khi file không parse được.
Thêm một `logger.warn` với đường dẫn + `malformedRecords`. Đây là thứ duy nhất trong toàn
bảng ở mục 2.5 mà người dùng đang bị tước mất thông tin mà không hề biết.
- Chi phí: ~5 dòng. Không đổi hợp đồng.
- Bằng chứng hỗ trợ: omp đã có `logger` sẵn (AGENTS.md yêu cầu dùng logger trong mọi code
  chạy song song với TUI), và `malformedRecords` đã được đếm sẵn — chỉ chưa ai đọc nó ở
  nhánh listing.

**L2 — Thêm đường đọc nghiêm ngặt cho fork và resume.**
omp hiện có **một** loader lenient cho mọi thứ. `gajae` đã chứng minh pattern: cùng một
file, hai chính sách — `loadEntriesFromFile` lenient cho resume thường,
`inspectTranscriptStrict` (`session-manager.ts:4002-4007`) ném cả file cho fork/ACP.
- Chi phị: ~30 dòng (một biến thể `parseSessionContent` gọi `JSON.parse` không bọc try).
- Bằng chứng hỗ trợ: `session-manager.ts:4007` dùng `TextDecoder(fatal: true)` — ngay cả
  UTF-8 dở cũng bị từ chối, tức là họ đã cân nhắc nghiêm túc.

**L3 — Siết khoá cross-process cho append.**
Hiện chỉ khoá hẹp ở `session-manager.ts:1340-1348`. Mở rộng `withSessionFileLockSync`
(đã có sẵn, đã là flock thật) ra phủ cả append. `codex` cho thấy cách làm đúng:
khoá mỗi thread, khoá phối hợp khi tạo/xoá, tranh chấp → lỗi có kiểu chứ không phải nối dòng.
- Chi phí: thay đổi nhỏ trong `session-manager.ts`, nhưng **phải đo lại** vì `flock` mỗi
  append là một syscall trên đường nóng. Đo trước khi làm.

### 🟡 LÀM NẾU CÓ ĐIỀU KIỆN

**Đ1 — fsync, chỉ khi người dùng chịu trả giá.**
Cả 5 repo đều không fsync mặc định; đó là quyết định chung của ngành, không phải thiếu sót
của omp. Nhưng omp là repo duy nhất **tự viết ra giới hạn** (`session-manager.ts:691-696`).
Nếu muốn fsync: bật cho session không phải draft-only, hoặc thêm setting
`session.durability = "process" | "power"`. **Điều kiện:** có người dùng thật sự cần và
chấp nhận chậm. Đo trước — append đang là đường nóng.

**Đ2 — Cắt bớt transcript cũ, thay vì để phình.**
`#fileBody()` ghi lại toàn bộ `#entries`, nên file chỉ lớn thêm. `gc` gzip từ 30 ngày,
nhưng file 29 ngày tuổi vẫn phình. **Điều kiện:** có số liệu thật về phân bố kích thước
trên máy người dùng. Không đo được thì đừng đoán.

### 🔴 KHÔNG LÀM

**K1 — KHÔNG port `durable` / `session-backends` từ `pi` như M1B đang lên kế hoạch.**

Đây là khuyến nghị mạnh nhất, và nó chống lại giả định trong brief. Lý do đo được:

1. **Nó là đổi mô hình dữ liệu, không phải bổ sung.** `pi` bỏ hẳn JSONL transcript
   (`grep parseJsonlLenient -- packages` → **0 hit** trong khi omp và gajae đều có).
   `pi` chạy log + projection; omp chạy append-only transcript. Ghép hai mô hình là
   viết lại tầng lưu trữ, không phải copy 11.118 dòng.
2. **Nó làm omp MẤT hạ tầng đang có.** `parseJson` của `pi` (`jsonl/storage.ts:115-121`)
   ném `JsonlCorruptionError` cho **một dòng hỏng giữa file** → mất trọn session. omp hiện
   bỏ qua rồi tự dọn. Port `pi` là **hạ cấp** mục 2.5.
3. **Nó không thêm gì cho các trục omp đang yếu.** Đo 4 trục:
   - fsync: `pi` cũng tắt mặc định → không giải quyết Đ1
   - nhiều tiếng trình: `pi` JSONL **không có khoá nào** (0 hit flock/lockfile/advisory) →
     không giải quyết L3
   - đuôi rách: `pi` cắt byte nhưng không có cơ chế đếm-và-dọn như omp → **kém omp**
   - migration: `pi` sqlite-node **ném ở cả hai chiều**, không có upgrader → kém omp
4. **Chi phí thật.** 11.118 dòng src (25.496 kể cả test) + 2 schema SQLite song song,
   trong khi omp đã có SQL backend của riêng mình. Ước 2 schema × ~600 test = việc bảo trì
   kép vĩnh viễn.

**Thay bằng:** nếu cần tuổi thọ schema (nhiều backend cùng lúc, hoặc cần truy vấn theo
trường), lấy **interface** của `pi` (`types.ts:657-749`, 14 phương thức) làm checklist
thiết kế — nhưng hiện thực trên `SessionStorage` của omp đã có
(`session-storage.ts:111-181`), vốn đã gọn hơn.

**K2 — KHÔNG lấy `version` cột của opencode hay cách chịu bằng `serde(default)` của codex.**
Cột `version` của opencode là version của app và không bao giờ được đọc lại — đây là bẫy,
không phải mẫu. `omp` đã có version thật, 78 dòng, 2 hàm. Đừi lấy.

**K3 — KHÔNG lấy thói quen niêm phong dòng rác của codex.**
`ensure_rollout_is_newline_terminated` (`recorder.rs:2042-2055`) thêm `\n` vào dòng dở để
"niêm phong" nó thành dòng riêng. Kết quả: dòng hỏng **tích tụ mãi** trong file, và số
đếm bị vứt (`:1157` bind `_parse_errors`). omp đang làm ngược lại đúng hơn — giữ.

**K4 — KHÔNG coi `gajae` là nguồn tham chiếu độc lập.**
Đã chứng minh ở mục 0.1: cùng `parseJsonlLenient` trong cùng file path, cùng
`recoverOrphanedBackups`. Nó là nhánh anh em. Nếu muốn cải tiến session, **diff
omp↔gajae** rẻ hơn nhiều và cho câu trả lời "2 bản version session đó làm gì" — đó
chính là câu hỏi M1B cần trả lời.

---

## 5. Chi phí

Đơn vị: dòng code. Giá ước tính = số dòng thay đổi + số test contract bắt buộc viết.

### 5.1. Làm (3 việc)

| Việc | Code | Test | Tổng | Ghi chú |
|---|---|---|---|---|
| L1 cảnh báo session bị bỏ qua | ~5 | ~40 (1 file) | **~45** | Rẻ nhất. `malformedRecords` đã có sẵn ở `parseSessionContent` |
| L2 đường đọc nghiêm ngặt | ~30 | ~120 (2 file: fork, ACP) | **~150** | Theo mẫu `inspectTranscriptStrict` gajae |
| L3 khoá cross-process cho append | ~40 | ~200 (race test) | **~240** | **Phải đo syscall trước.** Có sẵn `session-manager-atomic-rewrite-race.test.ts` (37 KB) làm mẫu |
| **Tổng** | **~75** | **~360** | **~435** | <1% subsystem 55.309 dòng |

### 5.2. Nếu có điều kiện

| Việc | Ước tính | Điều kiện chặn |
|---|---|---|
| Đ1 fsync tuỳ chọn | ~80 + đo hiệu năng | Cần số đo p99 của append trước. Không đo thì không làm |
| Đ2 cắt transcript cũ | ~300 (kèm checkpoint + phục hồi) | Cần phân bố kích thước file thật. Không có số liệu thì không đoán |

### 5.3. Không làm — và giá nếu làm

| Việc | Giá | Cái mất |
|---|---|---|
| **K1 port `durable` + `session-backends` từ `pi`** | 11.118 dòng src + 25.496 kể cả test; 2 schema SQLite; viết lại tầng lưu trữ | **Mất cơ chế bỏ-qua-và-dọn dòng hỏng** (mục 2.5). Không thêm fsync, không thêm khoá đa tiến trình, migration kém hơn. Đổi mô hình dữ liệu transcript. Đổi lại: gì? |
| K2 lấy version của opencode | ~10 | Bẫy: cột không bao giờ được đọc |
| K3 lấy niêm phong dòng rác của codex | ~15 | Rác tích tụ mãi trong file |
| K4 coi gajae là nguồn độc lập | — | Mất ~8 giờ đo sai hướng; thay bằng diff omp↔gajae (~30 phút) |

### 5.4. Chi phí cơ hội của việc KHÔNG làm

Bỏ qua L1-L3: người dùng mất session hỏng **không ai báo** (L1), fork âm thầm mất entry
cuối (L2), và hai tiến trình có thể xen dòng transcript (L3). Cả ba đều hiếm. Không cái
nào là mất dữ liệu hàng loạt. Chấp nhận được nếu tài liệu nói rõ — và `docs/session.md`
đã nói khá rõ phần bền vững.

### 5.5. Chi phí M1B nếu giữ nguyên kế hoạch hiện tại

Nếu M1B tiếp tục chép `durable` + `session-backends` như brief mô tả:
- **Bỏ dương:** 11.118 dòng src có hệ thống transaction thật (`durable` SQLite
  `BEGIN IMMEDIATE`), fork bằng con trỏ cha, và 2 trigger toàn vẹn ở tầng engine
  (`001_initial.sql:69-82`) — những thứ omp chưa có.
- **Bỏ âm:** ba điểm ở mục 2.5. Đáng kể nhất: mất cơ chế bỏ-qua-và-dọn dòng hỏng.
- **Bỏ bù:** bảy tháng bảo trì hai schema SQLite song song, một trong hai sẽ chết dần.

**Khuyến nghị:** hoãn M1B cho tới khi trả lời được *"session v5 của gajae khác v3 của omp
bằng những gì, và cái nào đáng lấy"*. Đó là một diff, không phải một kế hoạch port.

---

## 6. Phụ lục — bảng tổng hợp nhanh

| Trục | omp | pi | opencode | codex | gajae |
|---|---|---|---|---|---|
| Định dạng | JSONL v3 | JSONL v1 **+** 2× SQLite | 1 SQLite DB | JSONL (không version) | JSONL v5 |
| Có version | ✅ 3 | ⚠️ v1 cứng / per-row | ❌ (cột app version) | ❌ | ✅ 5 |
| fsync mặc định | ❌ (có ghi rõ) | ❌ | ❌ (`NORMAL`) | ❌ (không nói) | ⚠️ có hàm, gọi tay |
| Khoá đa tiến trình | ⚠️ hẹp (flock thật) | ❌ JSONL / ✅ SQLite | ✅ SQLite | ✅ flock + GC khoá cũ | ❌ transcript / ✅ SDK index |
| Đuôi rách | ✅ bỏ + **tự dọn** | ✅ cắt byte | n/a | ⚠️ bỏ + niêm phong | ⚠️ tùy loader |
| Dòng hỏng giữa file | ✅ bỏ + tự dọn | ❌ **mất cả file** | ❌ **hỏng cả session** | ⚠️ bỏ im lặng | ⚠️ tùy loader |
| Session hỏng trong list | ⚠️ bỏ, **không báo** | ❌ biến mất | ❌ **hỏng cả list** | n/a | ✅ bỏ, file còn |
| Số đo mất báo | 0 (chưa ai đọc) | 0 | n/a | đếm rồi vứt | 0 |
| File nhỏ lại được | ❌ (chỉ gc gzip) | ❌ | n/a | nén >7 ngày | ❌ |
| Retention | ✅ gc 30 ngày | ❌ | ❌ không có gì | ✅ nén | ⚠️ 60 ngày, mặc định tắt |
| Migration dễ hỏng file | ✅ 78 dòng | ⚠️ 2 chiều đều ném | ✅ 50 file + cursor | ✅ không version | ✅ ~60 dòng |
