# Phiếu triển khai — WI-11 (Lưu trữ trạng thái riêng cho từng extension, chỉ thiết kế)

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_2_EXECUTION_PLAN.md` (mục `## WI-11.` ở dòng 4172–4350)
**HEAD khi kiểm:** `65cc6c1` trên `milestone-1`
**Ngày kiểm:** 2026-09-29
**Trạng thái cây thật:** sạch — `git status --porcelain packages/ docs/ utils/` không có dòng nào cho `src/` hay `docs/`. Mọi trôi dòng dưới đây là trôi THẬT, không phải do bẩn cây làm việc.

---

## 1. Cái gì thay đổi, quan sát được

Một người đọc `docs/extensions.md` hỏi "tôi đặt trạng thái của mình ở đâu, và khi tôi gỡ cài đặt thì bạn có dọn không?" sẽ trả lời được bằng MỘT tài liệu — `docs/extension-state-persistence.md` — nêu rõ ba nền tảng, gọi tên người thắng, nêu tại sao hai nền tảng còn lại bị loại, đặt tên một đường dẫn trên đĩa và một đơn vị sở hữu, và nói thẳng rằng phần build chưa ai nhận — thay vì phải tự suy ra từ mẫu `pi.appendEntry` ghi trong tài liệu (mẫu đúng cho trạng thái phạm vi session, sai cho trạng thái sống sót qua session).

**Không có dòng code nào đổi.** Đây là mục tài liệu thuần: hai file `.md`, không file `.ts`.

---

## 2. Bảng điểm sửa

TRƯỚC / SAU lấy từ file thật, đọc bằng `sed -n "<n>p"` ở HEAD `65cc6c1`.

| path | symbol / vùng | TRƯỚC (nguyên văn từ file) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `docs/extension-state-persistence.md` | file mới | *(không tồn tại — `find . -name "extension-state-persistence.md"` → rỗng)* | File markdown 120–180 dòng, 7 mục: `## Cái gì đang tồn tại hôm nay` → `## Câu hỏi thiết kế` → `## Ba nền tảng` (A/B/C) → `## Hình dạng khuyến nghị` → `## Các hợp đồng bản build sau phải bảo vệ` → `## Trạng thái: đã thiết kế, phần build chưa ai nhận`. Không `##` cấp 4. |
| `docs/extensions.md:702` | `## Session and state patterns` | `## Session and state patterns` (dòng trống) | Dòng tiêu đề **giữ nguyên y nguyên văn**. Chèn ngay DƯỚI nó, trước `For durable extension state:` ở dòng 704, một đoạn 3–5 dòng trỏ `docs/extension-state-persistence.md`. |
| `docs/extensions.md:704-725` | hướng dẫn `appendEntry` | `For durable extension state:` … `});` + `` ``` `` | **KHÔNG ĐỤNG.** Đây là lời khuyên đúng cho trạng thái phạm vi session. Chỉ chèn, không viết lại, không xoá, không đổi thứ tự. |
| `packages/coding-agent/CHANGELOG.md:3` | `## [Unreleased]` | `## [Unreleased]` | **Mặc định: KHÔNG ĐỤNG.** Chỉ sửa nếu người duy trì chốt "có" (xem §5 mục Câu hỏi cần người quyết). Nếu có, thêm đúng một dòng dưới dòng 3. |

Không có dòng nào khác. Không `types.ts`, không `loader.ts`, không `manager.ts`, không `dirs.ts`.

---

## 3. Các bước — mỗi bước có neo ĐÃ MỞ VÀ ĐỌC

Mọi neo dưới đây tôi đã mở và đọc ở HEAD `65cc6c1`. Neo nào lệch so với văn bản kế hoạch thì đã ghi ở mục 4.

### Bước 1 — Chấp nhận lệnh cấm trước khi viết
Không neo (mục meta). Chốt trong đầu: mục này **không chạm file `.ts` nào**. Sketch trong "Hình dạng code" của spec chỉ để review tranh luận về hình dạng; nó không bao giờ được chép vào `types.ts`.

### Bước 2 — Khảo sát hiện trạng, viết TRƯỚC khuyến nghị
**Neo:** `docs/extension-state-persistence.md` § `Cái gì đang tồn tại hôm nay`.

Bằng chứng phải tự kiểm lại, đừng viết lại từ trí nhớ:

```bash
# KHÔNG hit — đã chạy, exit 1, không dòng nào
grep -nE 'Bun.write|Bun.file|readFileSync|writeFileSync' packages/coding-agent/examples/extensions/*.ts
# 8 file .ts trong examples/extensions/: api-demo, chalk-logger, hello, pirate, plan-mode,
# reload-runtime, thinking-note, tools  (+ with-deps/) — không file nào tự ghi trạng thái.
```

Điều KHẲNG ĐỊNH được (là sự vắng mặt, không phải quan sát hành vi):

- `ExtensionAPI` khai báo ở `types.ts:1277`, đóng ở `types.ts:1607`. Trong khoảng đó có **75 phương thức / 6 property** trên **35 tên duy nhất**. Sáu property tên đúng là: `logger`, `typebox`, `arktype`, `zod`, `pi`, `events` (tức spec ghi "74 phương thức / 80 khai báo" lệch 1 — vô hại, nhưng đừng bê con số 74 vào tài liệu như một sự thật đo được; hãy ghi "hơn 70 phương thức").
- `ExtensionContext` khai báo ở `types.ts:454`, đóng ở `types.ts:563`: **26 tên thành viên duy nhất / 27 khai báo**. `isProjectTrusted(): boolean` khai báo HAI LẦN, ở `types.ts:496` và `types.ts:563`. Danh sách 26: ui, mode, getContextUsage, getAsyncJobSnapshot, compact, hasUI, cwd, sessionManager, modelRegistry, localProtocolOptions, model, models, isIdle, abort, hasPendingMessages, shutdown, agent, isProjectTrusted, getSystemPrompt, runEphemeralTurn, memory, setInterval, setTimeout, clearTimer, addAdditionalContext, invokeTool.
- `git grep -n 'async unload|unloadExtension\|#unload' -- packages/coding-agent/src/extensibility/` → **không hit**. Seam gỡ duy nhất trong `ExtensionAPI` là `unregisterProvider` ở `types.ts:1603`. (Đã kiểm: `awk 'NR>=1278 && NR<=1607' types.ts | grep -E '^\t(unregister|remove|deregister)'` chỉ ra đúng một dòng.)

**Cách viết đúng:** "không có primitive lưu trữ nào; extension bên thứ ba không có chỗ nào được thừa nhận để đặt trạng thái; mẫu tự chế file là hệ quả có thể đoán trước, KHÔNG phải thứ repo này đã bị quan sát làm." Sai theo hướng phóng đại ("mọi extension đều tự ghi file dưới `~/.omp`") là lỗi lớn nhất của mục này.

### Bước 3 — Trích dẫn nền tảng đã ship
**Neo:** `docs/extensions.md:702-725` (spec ghi `699-723` — **lệch**).

Đọc đúng 24 dòng này được:

- `docs/extensions.md:702` → `## Session and state patterns`
- `docs/extensions.md:704` → `For durable extension state:`
- `docs/extensions.md:706` → `1. Persist with \`pi.appendEntry("com.example.my-extension.state", data)\`. The \`customType\` namespace is global: use a package- or reverse-domain-qualified value and avoid the core-reserved values in the [\`custom\` session-entry reference](./session.md#custom).`
- `docs/extensions.md:707` → `2. Rebuild state from \`ctx.sessionManager.getBranch()\` on \`session_start\`, \`session_branch\`, \`session_tree\`.`
- `docs/extensions.md:712-725` → ví dụ `pi.on("session_start", …)` quét `entry.type === "custom" && entry.customType === "com.example.my-extension.state"`, gán `latest = entry.data`.
- `docs/extensions.md:727` → `### Session-entry roles (\`message.role\` is camelCase)` — mục kế tiếp, ranh giới dưới.

Chữ ký API: `types.ts:1514` → `appendEntry<T = unknown>(customType: string, data?: T): void;` (spec ghi 1489). Kiểu handler: `types.ts:1777` → `appendEntry: AppendEntryHandler;` (spec ghi 1752). Đường đi: `loader.ts:307-308` → `this.runtime.appendEntry(customType, data);`, nối vào runtime tại `runner.ts:698` → `this.runtime.appendEntry = actions.appendEntry;` (spec ghi `runner.ts:694`).

Nói thẳng trong tài liệu vì sao (C) thua: entry nằm trên một session branch nên chết cùng session; và đây là append-and-replay (entry khớp gần nhất thắng), không phải get/set theo khoá. **Không xoá section này khỏi `docs/extensions.md`.**

### Bước 4 — Câu hỏi thiết kế, rồi xếp hạng cả ba
**Neo:** `docs/extension-state-persistence.md` § `Câu hỏi thiết kế`.

`SettingProvenance` — đã mở và đọc `config/settings.ts:62`:
```
/** Settings layer that supplies an effective value; see {@link Settings.getProvenance}. */
export type SettingProvenance = "env" | "runtime" | "overlay" | "project" | "global" | "default";
```
Đúng sáu lớp, đúng tên. Bản thân phép so sánh nằm ở `config/settings.ts:800-808` (`getProvenance`) — đã mở và đọc, khớp từng dòng.

- **(A) overlay namespace trong `Settings`** — loại. Lý do cụ thể: `Settings` là YAML người dùng tự tay chỉnh; trạng thái nội bộ plugin không phải cấu hình người dùng; sáu tầng provenance gọi tên **ý định người dùng** không mô tả nguồn của một cache entry.
- **(B) store riêng, có vòng đời riêng, dọn lúc unload** — **KHUYẾN NGHỊ**.
- **(C) session-entry replay** — loại. Lý do cụ thể: phạm vi session + append-and-replay, không phải get/set theo khoá.

Mỗi lựa chọn bị loại phải có câu "vì sao bị loại" ngay tại chỗ. Khuyến nghị không kèm lý do loại = sơ suất, không phải quyết định.

### Bước 5 — Hình dạng + đường dẫn trên đĩa + đơn vị sở hữu
**Neo:** `docs/extension-state-persistence.md` § `Hình dạng khuyến nghị`.

**Đơn vị sở hữu.** Theo DANH TÍCH extension, khoá theo `extensionPath`. Tiền lệ đã mở và đọc:

`loader.ts:263`
```ts
this.extension.flags.set(name, { name, extensionPath: this.extension.path, ...options });
```
`loader.ts:265`
```ts
this.runtime.flagValues.set(name, options.default);
```
→ Bản đầu mang `extensionPath`; bản sau khoá theo tên flag trần. Tài liệu phải nói tường minh: khoá theo cách 263, KHÔNG theo cách 265 — và 265 chính là hình dạng WI-9 sinh ra để thay.

Câu "26 existing members" trong sketch của spec là **đúng**: `ExtensionContext` có đúng 26 tên thành viên duy nhất.

**Đường dẫn trên đĩa — đây là chỗ dễ làm sai nhất, xem mục 6 và mục 5.**

Quy ước được viện dẫn, đã mở và đọc:
- `packages/utils/src/dirs.ts:644-649` → `getPluginsDir(home?)` → `return dirs.rootSubdir("plugins", "data");`
- `packages/utils/src/dirs.ts:662-664` → `getPluginsLockfile(home?)` → `return path.join(getPluginsDir(home), "omp-plugins.lock.json");` (spec ghi `652-654` — **lệch +10**)
- `packages/utils/src/dirs.ts:388-392` →
```ts
this.#rootDirs = {
    data: xdgData ?? this.configRoot,
    state: xdgState ?? this.configRoot,
    cache: xdgCache ?? this.configRoot,
};
```
và chú thích ở `dirs.ts:394`: `// XDG flattens the agent/ prefix: ~/.omp/agent/sessions → $XDG_DATA_HOME/omp/sessions`

→ `~/.omp/…` **KHÔNG phải** kết quả của `getPluginsDir()` trên Linux khi `XDG_DATA_HOME` được đặt. Đường dẫn phải được viết theo **quy tắc phân giải**, không chỉ theo literal `~/`.

### Bước 6 — Hai hợp đồng tương lai, viết ở thì hiện tại
**Neo:** `docs/extension-state-persistence.md` § `Các hợp đồng bản build sau phải bảo vệ`.

1. **Unload:** trạng thái của extension bị loại bỏ bị unload; việc loại trạng thái của một extension KHÔNG làm trạng thái của extension khác mất khả đọc, kể cả khi hai extension từng cùng nhận một tên khoá.
2. **Đổi danh tính:** phải PHÁT BIỂU điều gì xảy ra với các giá trị cũ (từ chối đổi tên / migrate / ghi nhận bị bỏ rơi). Không được chỉ khẳng định "đổi tên không làm mồ côi một giá trị" — câu đó không trả lời được gì.

**Lưu ý:** WI-9 chưa có trong cây (xác nhận ở bước 2), nên **không thể** trích "nguyên văn hợp đồng sở hữu của WI-9 ở plan §11.3" như spec yêu cầu — neo đó không tồn tại (mục 4, dòng 32-33). Hãy viết hợp đồng ở thì hiện tại, tự chứng, và ghi chú rằng WI-9 (wave 7) là điều kiện kỹ thuật.

### Bước 7 — Kết bằng phần hoãn
**Neo:** `docs/extension-state-persistence.md` § `Trạng thái: đã thiết kế, phần build chưa ai nhận`.

Phải nói thẳng, không vòng vo: đã thiết kế; **chưa build**; phần build là work item **chưa ai nhận**; điều kiện kỹ thuật là WI-9; không milestone nào nhận. Nếu nhắc tới việc kéo build vào M2: WI-9 xanh là **cần nhưng không đủ**.

**KHÔNG dùng nhãn "Phase 4/5" hay bất kỳ nhãn phase nào** (mục 5 nói đây là điều kiện, nhưng hiện KHÔNG có lệnh nào canh nó — xem mục 5).

### Bước 8 — Đoạn trỏ tới tài liệu trong `docs/extensions.md`
**Neo:** `docs/extensions.md:702` (đầu `## Session and state patterns`; spec ghi 699 — **lệch**).

Một đoạn ngắn, nói trung thực: hôm nay chưa có store trạng thái riêng cho từng extension; câu hỏi chọn nền tảng đã được quyết ở tài liệu kia; phần build bị hoãn và chưa ai nhận. **Không** để người đọc kết luận `pi.state` tồn tại.

### Bước 9 — Changelog: mặc định KHÔNG thêm
**Neo:** `packages/coding-agent/CHANGELOG.md:3` → `## [Unreleased]` (đã mở và đọc, đúng dòng).

Mặc định của phiếu này: bỏ hẳn file. AGENTS.md giới hạn mục changelog cho "user-facing: lead with what the user will see or can now do", và mục này không có gì user-visible. Chỉ thêm khi người duy trì chốt — và khi đó thêm **đúng một dòng**, không đụng section đã phát hành.

---

## 4. KIỂM LẠI TỪNG NEO — 25 neo hỏng

Tất cả đã mở và đọc. Cột "việc số" là số thứ tự trong danh sách neo của spec.

### A. Số dòng trôi trong `types.ts` (lệch đều +2 đến +29)

| việc | spec ghi | THẬT | dòng spec ghi thật chứa gì |
| --- | --- | --- | --- |
| 6 | `types.ts:1256-1582` (`ExtensionAPI`) | **`types.ts:1277-1607`** | `1256` = `}`; `1582` = ` *       input: ["text", "image"],` |
| 7 | `types.ts:452-562` (`ExtensionContext`) | **`types.ts:454-563`** | `452` = `}` |
| 8 | `types.ts:1489` (`appendEntry` ký hiệu) | **`types.ts:1514`** | `1489` = `	// Actions` |
| 9 | `types.ts:1752` (kiểu handler) | **`types.ts:1777`** | `1752` = `export type SetModelHandler = (model: Model) => Promise<boolean>;` |
| 10 | `types.ts:1768` (`ExtensionContextActions`) | **`types.ts:1793`** | `1768` = `	registerProvider(name: string, config: ProviderConfig, sourceId: string): void;` |
| 11 | `types.ts:1578` (`unregisterProvider`) | **`types.ts:1603`** | `1578` = ` *       id: "claude-sonnet-4@20250514",` |
| 12 | `types.ts:506` (`memory?: MemoryRuntimeContext`) | **`types.ts:508`** | `506` = `	runEphemeralTurn?(options: EphemeralTurnOptions): Promise<EphemeralTurnResult>;` |
| 13 | `types.ts:494` / `:561` (`isProjectTrusted` ×2) | **`types.ts:496` / `:563`** | `494` và `561` đều là dòng chú thích `/** … */` |
| 14 | `types.ts:480-481` (dòng gốc của claim về `memory`) | **`types.ts:508`** (một dòng) | `480` = `	isIdle(): boolean;` |

### B. Số dòng trôi ở file khác

| việc | spec ghi | THẬT | lệch |
| --- | --- | --- | --- |
| 2 | `docs/extensions.md:699` = `## Session and state patterns` | **`docs/extensions.md:702`** (699 là dòng trống) | +3 |
| 3 | `docs/extensions.md:701-722` (hướng dẫn `appendEntry`) | **`docs/extensions.md:704-725`** | +3 |
| 4 | `docs/extensions.md:699-723` (cả section) | **`docs/extensions.md:702-726`** | +3 |
| 20 | `runner.ts:694` (`this.runtime.appendEntry = actions.appendEntry`) | **`runner.ts:698`** | +4 |
| 21 | `runner.ts:1303` (`memory: this.#getMemoryFn?.()`) | **`runner.ts:1332`** | +29 |
| 22 | `sdk.ts:3080` (`createSessionMemoryRuntimeContext`) | **`sdk.ts:3093`** | +13 |
| 23 | `dirs.ts:652-654` (`getPluginsLockfile`) | **`dirs.ts:662-664`** (652-654 là `getPluginsNodeModules`) | +10 |
| 24 | `dirs.ts:1046-1048` | `getMarketplacesRegistryPath` thật ở **`dirs.ts:1045-1050`** | −1 |
| 37 | HEAD là `808b365` | HEAD là **`65cc6c1`** (`milestone-1`) | — |

### C. Neo hỏng vì TRÍCH DẪN VÒNG (nguy hiểm nhất — đừng sao chép vào tài liệu)

| việc | spec ghi | THẬT |
| --- | --- | --- |
| 30 | `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:5961` chứa nguyên văn *"cleanup khi uninstall không thi triển khả thi tới khi WI-9 có một unload thật"* | Dòng **5961** là: `- Cổng Wave 4 — mọi wave M2 sau đều coi suspend là đáng tin; đây là tiền đề làm cho điều đó thành hiện thực.` Cụm trích chỉ tồn tại ở **9155** và **9215** — tức **bên trong chính mục WI-11 này**. Tức spec trích plan cho một câu chỉ nằm trong chính nó. `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` dài 26328 dòng và chứa bản gấp của chính mục WI-11 ở dòng 9125 trở đi. **Không được viết vào tài liệu "plan ghi nguyên văn …, `…:5961`".** |
| 31 | §8.2: *"Có kéo build này vào M2 hay không, ai làm, ở milestone nào — cả ba đều chưa được gán"* | `grep -c "Có kéo build này"` = **1**, và dòng đó là **9270** — mục "Chặn" của chính WI-11. Không có heading `## 8.` hay `### 8.2` mang nội dung này. |
| 32 | §11.3: *"M3 cần: một bề mặt authoring đã chốt … và một \`unload\` thật để cài/gỡ không rò"* | Chỉ tồn tại ở **9272**, trong mục "Chặn" của chính WI-11. Không có heading `11.3`. |
| 33 | §11.3: *"quyền sở hữu có thể kiểm chứng — mọi thứ đăng ký đều truy ngược được về một extension…"* | Chỉ tồn tại ở **9273**, cùng chỗ. |
| 34 | §10, M2-OQ2 blocks *"substrate của WI-11/WI-12"* | Chỉ tồn tại ở **9287** và **9301** — cả hai đều trong mục "Cần người quyết" và "Đính chính" của chính WI-11. Không có heading `## 10.` mang nội dung này. |
| 35 | §6.1: *"WI-0 chặn WI-10 vì …; WI-10 chặn WI-7 … và WI-11/WI-12."* | Chỉ tồn tại ở **9301** (bảng "Đính chính"). Không có heading `6.1`. |
| 36 | `registry.ts:786-792` | `packages/coding-agent/src/capability/registry.ts` **không tồn tại** — thư mục `capability/` chỉ có `index.ts` (19 KB) và các file capability đơn lẻ. Không resolve được. |

**Hệ quả thực tế:** sáu neo 30–35 đều là trích dẫn tới § của plan đã bị **gấp vào chính file đó**, nên neo trỏ ngược về chính WI-11. Khi viết tài liệu, hãy nói "kế hoạch M2 yêu cầu phần build phải được gọi tên và gán ngày" — **không** ghi kèm số dòng §, và **không** ghi "plan ghi nguyên văn" cho một câu mà bạn không tìm được ngoài chính mục này.

### D. Một claim trong spec đã bị cây thật **phủ nhận**

`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9270` (mục Xác minh của spec) nói: *"`bun test` cần addon native: build bằng `brew install ninja` rồi `bun --cwd=packages/natives run build` … trước mọi mục cần một lần chạy test thật."* — Hôm nay addon **đã có**: `packages/natives/native/pi_natives.darwin-arm64.node`. Với WI-11 thì điều này vô hại (mục này không chạy test), nhưng đừng dùng "cần build native trước" làm lý do bỏ qua một lệnh kiểm tra.

### E. Anchor ĐÚNG (đã mở, đã khớp) — dùng thoải mái

`docs/extension-state-persistence.md` (đúng là chưa tồn tại — đúng như thiết kế) · `CHANGELOG.md:3` · `config/settings.ts:62` · `config/settings.ts:800-808` · `loader.ts:263` · `loader.ts:265` · `loader.ts:307-308` · `memory-backend/types.ts:79-83` · `manager.ts:929-960` (929/942/954, đóng ở 960) · `manager.ts:148-151` · `manager.ts:153-162` · `plugins/types.ts:156-163` · hai lệnh grep âm tính (ví dụ extensions; unload) · đếm 26/27 thành viên `ExtensionContext` · `unregisterProvider` là seam gỡ duy nhất · `package.json:90-91` (`check:ts`, `check:tools`).

**Một con số trong spec lệch 1, vô hại:** spec ghi "74 phương thức / 80 khai báo"; đếm lại ở `types.ts:1278-1607` ra **75 phương thức / 81 khai báo / 6 property / 35 tên duy nhất**. Sáu property tên đúng: `logger`, `typebox`, `arktype`, `zod`, `pi`, `events`. Đừng đưa "74" vào tài liệu như sự thật đo được.

---

## 5. Hợp đồng test

**Tên file test: `NONE WRITTEN BY THIS ITEM`.** Mục này không tạo file test nào và không được tạo.

Lý do là nội dung dung, không phải thủ tục: dọn dẹp lúc uninstall không thiết kế được cho tới khi WI-9 trao một unload thật (đã kiểm: `git grep -n 'async unload\|unloadExtension\|#unload' -- packages/coding-agent/src/extensibility/` → **không hit**). Một test PASS cho một store chưa tồn tại giống hệt một test PASS cho một store đã ship, với bất kỳ ai đọc CI sau này.

### Các "case" thực sự tồn tại — 5 câu hỏi nghiệm thu
Người duy trì phải trả lời được **từ chữ trong tài liệu, không hỏi tác giá**:

1. Nền tảng nào thắng, và **cụ thể vì sao** mỗi nền tảng còn lại bị loại?
2. Dữ liệu nằm ở đâu trên đĩa, và quy tắc phân giải đường dẫn là gì (không chỉ một literal `~/`)?
3. Chuyện gì xảy ra với trạng thái của một extension khi nó bị unload — và việc unload một extension có để lại giá trị của extension khác đọc được không?
4. Chuyện gì xảy ra với các giá trị của nó khi **danh tính extension** đổi (id hoặc đường dẫn cài đặt)?
5. Ai nhận phần build, và điều gì chặn nó?

Câu nào tài liệu không trả lời được → mục trượt.

### Hai hợp đồng phải định, đang giữ
- Tài liệu **không được đọc như đã ship** — không ai đọc nó được tin `pi.state` hay `ExtensionContext.state` tồn tại hôm nay.
- Tài liệu **không dùng nhãn phase** (plan không có khái niệm phase).

### Người dùng thấy gì nếu hồi quy
Không có tín hiệu CI nào. Người đầu tiên cần trạng thái theo extension sẽ tự dựng store tiện tay — nhiều khả năng là file tự chế dưới `~/.omp` hoặc `cwd` — và store đó sẽ ship ra **không có chủ sở hữu, không có đường dọn dẹp**. Đến lúc WI-9 hạ cánh và muốn dọn những gì một extension đã ghi, store đã có người gọi; gắn quyền sở hữu vào một store đã có người gọi tốn hơn hẳn so với thiết kế một cái có vòng đời ngay từ đầu. Cái giá không nằm ở code — nó nằm ở chỗ một quyết định không ai viết ra sẽ được người cần tính năng đầu tiên tự quyết, và đổi lại sau này là breaking change với mọi tác giả extension đã ship theo nó.

Bù lại: markdown nằm **ngoài mọi glob lint** — `package.json:91` là `oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' …`, không glob markdown nào, không markdown linter trong repo. Một lần CI xanh nói **không** được gì về mục này. Đừng trích `check:ts` xanh làm bằng chứng.

---

## 6. Cổng

### 6.1 Cổng nào ĐỎ ĐƯỢC, và bằng cách nào

| cổng | đỏ được? | đỏ bằng cách nào — và lỗ hổng |
| --- | --- | --- |
| `git status --porcelain \| grep -vE '^\?\? \.lavish-wip/\|^\?\? MILESTONE_2_EXECUTION_PLAN\.md$' \| cut -c4- \| grep -c '\.ts$'` | **CÓ** | Bắt được cả file `.ts` **mới chưa `git add`**, vì `??` vẫn nằm trong porcelain và `cut -c4-` cắt đúng 3 ký tự `?? `. Lệnh rẻ nhất và mang tính quyết định nhất của cả mục. **Lỗ hổng:** bộ lọc chỉ loại `.lavish-wip/` ở trạng thái `??`. Nếu ai đó đã `git add` một file dưới `.lavish-wip/`, dòng đó thành `A  .lavish-wip/…` và **không** bị lọc → đỏ giả. Đỏ giả thì an toàn hơn xanh giả, nhưng phải biết để không mất 20 phút đi tìm. |
| `test -f docs/extension-state-persistence.md` | **CÓ** | File không tồn tại là đỏ. |
| `grep -cE '\(A\)\|\(B\)\|\(C\)' … ` ≥ 3 | **CÓ, nhưng yếu** | Đếm **dòng khớp**, không phải mục. Một câu "ta xếp hạng (A), (B), (C)" là đủ để qua mà không hề có lý do loại. Xem 6.3. |
| `grep -niE 'khuyến nghị\|recommend' …` | **CÓ** | Không có chữ "khuyến nghị" → đỏ. Nhưng đỏ khi thiếu TỪ, không đỏ khi có từ mà không có quyết định. |
| `grep -n 'appendEntry' …` | **CÓ** | Nền tảng (C) bị bỏ sót → đỏ. Đây là cổng có giá trị cao nhất trong nhóm. |
| `grep -n -iE 'unload\|WI-9' …` | **CÓ** | Bỏ sót điều kiện kỹ thuật → đỏ. |
| `grep -n -iE 'unowned\|deferred\|không ai nhận\|not owned' …` | **CÓ** | Bỏ sót phần "chưa ai nhận" → đỏ. |
| `grep -n 'dirs.ts' …` | **CÓ** | Không gọi tên helper sinh ra đường dẫn → đỏ. |
| `grep -nE '\`~/[^\`]+\`' …` | **CÓ — nhưng nó ép một câu trả lời SAI.** | Xem 6.2 — đây là phát hiện nghiêm trọng nhất của phiếu này. |
| **5 câu hỏi của người duy trì** | **CÓ, theo cách tự động không làm được** | Đỏ duy nhất khi người duy trì phải quay lại hỏi tác giá. Đây là cổng thật của mục này. |

### 6.2 `grep -nE '\`~/[^\`]+\`'` là một cổng buộc viết sai

Cổng này **bắt buộc** tài liệu chứa một đường dẫn literal bắt đầu bằng `~/`. Nhưng quy ước mà spec bảo tài liệu tuân theo — `getPluginsDir()` — **không cho ra `~/` trên Linux**:

```
dirs.ts:644-649   export function getPluginsDir(home?: string): string {
                      …
                      return dirs.rootSubdir("plugins", "data");
                  }
dirs.ts:388-392   this.#rootDirs = { data: xdgData ?? this.configRoot, state: xdgState ?? …, cache: … };
dirs.ts:394       // XDG flattens the agent/ prefix: ~/.omp/agent/sessions → $XDG_DATA_HOME/omp/sessions
```

Nghĩa là `~/.omp/extensions-state/<id>.json` đúng trên macOS, và **sai trên Linux** khi `XDG_DATA_HOME` được đặt (thành `$XDG_DATA_HOME/omp/extensions-state/<id>.json`). Cổng xanh có thể đi cùng một tài liệu sai trên Linux — đúng loại xanh tệ mà mục này cảnh báo.

**Viết lại cổng này** để nó đỏ được theo đúng thứ cần bảo vệ:

```bash
# thay cho:  grep -nE '`~/[^`]+`' docs/extension-state-persistence.md
# phải ra hit: tài liệu nêu CẢ literal lẫn quy tắc phân giải
grep -cE '`~/[^`]+`'              docs/extension-state-persistence.md   # >= 1
grep -cniE 'XDG|_data_|_state_'  docs/extension-state-persistence.md   # >= 1: đường dẫn không phải ~/.omp trên mọi OS
```

Cổng mới đỏ được: tài liệu chỉ ghi `~/` mà không giải thích XDG là đỏ.

### 6.3 Bốn lỗ hổng cần bịt thêm

DONE-criterion 4 (hợp đồng đổi tên), DONE-criterion 5 (cấm nhãn phase), "tài liệu không đọc như đã ship", và **việc `docs/extensions.md` có thực sự được sửa hay không** — bốn điều này hiện **không có một lệnh nào canh**. Thêm:

```bash
# (1) hợp đồng đổi danh tính — DONE #4 và câu hỏi (d), hiện trần
grep -niE 'rename|đổi tên|đổi danh tính' docs/extension-state-persistence.md   # phải có hit

# (2) cấm nhãn phase — DONE #5, hiện trần
! grep -niE '\bphase[[:space:]]*[0-9]' docs/extension-state-persistence.md    # có "Phase 4" là đỏ

# (3) tài liệu không được đọc như đã ship — phải là phép định phủ (negative)
! grep -nE '^\s*`?(pi|ctx)\.state`' docs/extension-state-persistence.md        # ví dụ API ở đầu dòng là đỏ

# (4) file DUY NHẤT bạn được sửa — hiện không có coverage nào
git diff --name-only -- docs/extensions.md | grep -c .                    # phải = 1
git diff -- docs/extensions.md | grep -c '^+'                              # > 0: có dòng thêm
# và phần appendEntry phải còn nguyên:
sed -n '704,725p' docs/extensions.md | grep -c 'appendEntry("com.example.my-extension.state", data)'  # = 1
```

Và bịt lỗ hổng giả-đỏ của cổng `.ts`:

```bash
git status --porcelain | grep -vE '^\?\? \.lavish-wip/|^.. \.lavish-wip/' \
                  | grep -vE '^\?\? MILESTONE_2_EXECUTION_PLAN\.md$' | cut -c4- | grep -c '\.ts$'
```

### 6.4 Lệnh đầy đủ, chạy từ repo root

```bash
DOC=docs/extension-state-persistence.md

# 1. không file .ts nào bị chạm (đã sửa lỗ hổng giả-đỏ)
git status --porcelain | grep -vE '^\?\? \.lavish-wip/|^.. \.lavish-wip/' \
                  | grep -vE '^\?\? MILESTONE_2_EXECUTION_PLAN\.md$' | cut -c4- | grep -c '\.ts$'   # 0

# 2. không gì ngoài bảng "File cần chạm tới"
git status --porcelain | grep -vE '^\?\? \.lavish-wip/|^.. \.lavish-wip/' \
                  | grep -vE '^\?\? MILESTONE_2_EXECUTION_PLAN\.md$'      # eyeball: đúng 1–3 path docs

# 3. file tồn tại
test -f "$DOC" || exit 1

# 4. ba nền tảng được đánh số
grep -cE '\(A\)|\(B\)|\(C\)' "$DOC"                                       # >= 3

# 5. có người thắng
grep -niE 'khuyến nghị|recommend' "$DOC"

# 6. nền tảng đã ship không bị bỏ sót
grep -n 'appendEntry' "$DOC"

# 7. điều kiện kỹ thuật
grep -n -iE 'unload|WI-9' "$DOC"

# 8. phần build chưa ai nhận
grep -n -iE 'unowned|deferred|không ai nhận|not owned' "$DOC"

# 9. đường dẫn: literal + quy tắc phân giải  (thay cho một lệnh `~/` đơn lẻ)
grep -cE '`~/[^`]+`' "$DOC"                                               # >= 1
grep -cniE 'XDG|_data_|_state_' "$DOC"                                    # >= 1

# 10. helper sinh ra nó
grep -n 'dirs.ts' "$DOC"

# 11. hợp đồng đổi danh tính
grep -niE 'rename|đổi tên|đổi danh tính' "$DOC"

# 12. cấm nhãn phase
! grep -niE '\bphase[[:space:]]*[0-9]' "$DOC"

# 13. không đọc như đã ship
! grep -nE '^\s*`?(pi|ctx)\.state`' "$DOC"

# 14. docs/extensions.md có thực sự được sửa, và hướng dẫn cũ còn nguyên
git diff --name-only -- docs/extensions.md | grep -c .                    # 1
git diff -- docs/extensions.md | grep -c '^+'                              # > 0
sed -n '704,725p' docs/extensions.md | grep -c 'appendEntry("com.example.my-extension.state", data)'   # 1
```

**Câu trả lời cụ thể: cổng này có đỏ được không? — CÓ, nhưng CHƯA đủ, và tôi đã sửa nó ở trên.**

Sau khi sửa, 14 lệnh trên đều đỏ được theo cơ chế. Nhưng cổng KHÔNG thể đỏ được, và không lệnh nào sửa được:

> **Cổng này không đỏ được khi tài liệu có một quyết định sai.** Mười bốn lệnh trên đều là kiểm tra *hình thức* — chúng biết tài liệu có chữ "khuyến nghị", có ba nhãn (A)(B)(C), có `WI-9`. Chúng **không** biết khuyến nghị đó có đúng, có lý do loại có cụ thể hay không, và đường dẫn có đúng trên Linux hay không. Một tài liệu tràn ngập thuật ngữ, xanh cả mười bốu dòng, và vẫn nói sai.

Vì vậy **cổng thật duy nhất vẫn là năm câu hỏi của người duy trì** — và đó là điểm spec nói đúng. Đừng để 14 dòng xanh tạo cảm giác an toàn giả cho một mục tài liệu thuần.

---

## 7. Cạm bẫy riêng của work item này

**1. Cổng `~/` đẩy bạn viết một đường dẫn sai trên Linux.** Đây là cạm bẫy số một. `getPluginsDir()` → `dirs.rootSubdir("plugins", "data")` → XDG-aware (`dirs.ts:388-392`, chú thích `dirs.ts:394`). Viết `~/.omp/extensions-state/<id>.json` và gọi đó là "theo đúng quy ước `getPluginsDir()`" là một câu **sai ở Linux**. Cách thoát: nêu cả literal lẫn quy tắc phân giải, và thêm một helper cùng dạng với `getPluginsLockfile` (`dirs.ts:662-664`) — helper phải đi qua `dirs.rootSubdir(…, "data")`, không `path.join(home, …)`.

**2. Sáu neo §/dòng trong spec là trích dẫn vòng — đừng sao chép chúng vào tài liệu.** `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:5961`, `§8.2`, `§10`, `§11.3` (×2), `§6.1`: sáu trong sáu chỉ tồn tại **bên trong chính mục WI-11** (dòng 9155, 9215, 9270, 9272, 9273, 9287/9301). Nếu bạn ghi `"plan ghi nguyên văn: …, COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:5961"` vào tài liệu, bạn đang tự trích dẫn chính mình qua một số dòng nói một thứ khác. Hãy viết: "kế hoạch M2 yêu cầu phần build phải được gọi tên và gán ngày trước khi M2 đóng lại" — không số dòng.

**3. Mọi neo `types.ts` trong spec đã trôi +2 đến +29.** Mở `types.ts:1489` bạn thấy `// Actions`, không phải `appendEntry`. Có 9 neo `types.ts` và **không neo nào còn đúng**. Kỹ sư mở đúng dòng sẽ nghĩ mình đọc sai cây, rồi bắt đầu nghi ngờ kế hoạch thay vì nghi ngờ số dòng. Mở bằng tên symbol, không bằng số: `grep -n "appendEntry" types.ts` → **1514**.

**4. Sketch trông như một diff ba dòng.** `interface ExtensionContext { … state: ExtensionStateStore; }` là thứ dễ nhất trong toàn bộ mục này để gõ thật. Cổng `.ts` sẽ bắt — nhưng chỉ nếu bạn nhớ chạy. Ghi nó ra giấy: `ExtensionContext` cuối cùng có **26** thành viên; thêm một cái nữa là 27, và typecheck sẽ không đỏ (đây là một member bình thường của interface).

**5. Hai `isProjectTrusted()` trong cùng một interface.** `types.ts:496` và `types.ts:563` — khai báo trùng tên, 26 tên duy nhất trên 27 khai báo. Nếu tài liệu liệt kê "thành viên của `ExtensionContext`", hãy đếm **tên duy nhất** (26) và ghi rõ con số 26 là số tên, không phải số dòng khai báo — nếu không, người đọc sẽ tự đếm lại ra 27 và mất bình.

**6. Tài liệu nằm ngoài mọi thứ CI nhìn thấy.** `package.json:91` (`check:tools`) chỉ phủ `packages/*/src/**/*.{ts,tsx}` và `packages/*/{test,bench,examples,scripts}/**/*.ts`. Không glob markdown, không markdown linter trong repo. `bun run check:ts` xanh **không** nói được gì về mục này — và dùng nó làm bằng chứng là nhanh nhất để một mục thiết kế trông xong khi nó chưa.

**7. "Sự vắng mặt" không phải "hành vi quan sát được".** Cám dỗ lớn nhất khi viết phần khảo sát. Không extension ví dụ nào trong repo tự ghi file — nhưng điều đó **không** chứng minh "extension tự tạo file dưới `~/.omp`"; đó là hệ quả có thể đoán trước từ việc không có primitive. Viết đúng ranh giới này, vì phóng đại ở đây chính là thứ khiến tài liệu bị đọc là khảo sát rồi trong khi chưa.

---

## 8. Câu hỏi cần người quyết (chặn bước 9)

1. **CHANGELOG** — mục thiết kế thuần wave 8 có được ghi changelog không? Mặc định của phiếu này: **không** (không có gì user-visible; AGENTS.md giới hạn mục changelog cho user-facing). Nếu có, thêm **đúng một dòng** dưới `CHANGELOG.md:3`, không đụng gì khác. Quyết một lần rồi áp dụng nhất quán cho cả WI-0 và WI-12.
2. **ĐƯỜNG DẪN TRÊN ĐĨA** — `~/.omp/extensions-state/<extension-id>.json` chỉ đúng trên macOS (mục 6.2). Cần chốt: giữ literal + ghi rõ quy tắc XDG, hay đổi sang vị trí khác. **Không chấp nhận** để đường dẫn chưa quyết — đó là hoãn quyết định, không phải quyết định.
3. **M2-OQ2** — nếu còn mở khi viết, tài liệu phải nói khuyến nghị là **có điều kiện** theo câu trả lời đó. (Lưu ý: hai neo `§10` trong spec đã hỏng — mục 4C — nên đừng trích dòng.)
4. **PHẠM VI "ĐỔI TÊN"** — khi danh tính extension đổi: từ chối, migrate, hay ghi nhận bị bỏ rơi? Không có câu trả lời này thì **không phát biểu được hợp đồng thứ hai**, và hợp đồng thứ hai là một trong hai DONE-criterion.
5. **MIGRATE FILE TỰ CHẾ** — "bắt đầu sạch, không nhận diện" là mặc định có thể bảo vệ được (không có cách nào biết file nào thuộc extension nào), nhưng phải **nói thẳng** trong tài liệu, không để ngầm.
