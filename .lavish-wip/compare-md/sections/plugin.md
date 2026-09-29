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
