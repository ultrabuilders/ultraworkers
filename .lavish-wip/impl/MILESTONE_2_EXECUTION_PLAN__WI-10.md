# PHIẾU TRIỂN KHAI — WI-10: Chốt một bề mặt viết chuẩn

Nguồn: `MILESTONE_2_EXECUTION_PLAN.md` dòng 3983–4171 (mục `## WI-10.`).
Ngày kiểm chứng: 2026-09-29. Cây: `/Users/tranquangdang21/Projects/ultraworkers`, nhánh `milestone-1`.
Phạm vi mã: **toàn bộ neo của WI-10 nằm trong cây omp** (`packages/coding-agent/…`, `docs/…`, `AGENTS.md`, `package.json`). Không neo nào trỏ sang `pi-ref` / `codex-ref` / `opencode-ref` / `senpi-ref` / `claude-code-ref` / `gajae-ref` / `deepseek-harness`, nên không cần đối chiếu cây thứ hai.

---

## 1. Cái gì thay đổi, quan sát được

Một tác giả extension bên thứ ba đọc `docs/extension-writing-surfaces.md` sẽ trả lời được bằng mắt ba câu hỏi — bề mặt nào là CANONICAL cho công việc mới, bề mặt nào là COMPATIBILITY-ONLY và đã đóng băng, và sổ đăng ký capability có tới được từ phía extension không — trong khi hôm nay cây trả lời câu đó bằng **một đoạn văn xuôi bốn câu** ở `docs/extensions.md`, thiếu hai trong năm bề mặt, không dùng từ trạng thái nào kiểm được, và im lặng về sổ đăng ký capability.

Không dòng runtime code nào thay đổi. Không test nào thêm. Diff đúng ba file markdown.

---

## 2. Kết quả kiểm lại từng neo

### 2.1. Neo ĐÚNG (dùng nguyên văn trong phiếu)

| Neo trong WI-10 | Lệnh đã chạy | Kết quả |
| --- | --- | --- |
| `docs/extension-trust-model.md` (cổng bước 1) | `ls docs/extension-trust-model.md` | **Vắng.** Cổng cứng là thật. |
| `docs/extension-writing-surfaces.md` | `ls` | **Vắng.** Đây là file tạo ra. |
| `packages/coding-agent/src/extensibility/extensions/` | `test -d` | Có, 11 file. |
| `…/extensibility/hooks/` | `test -d` | Có, 5 file. |
| `…/extensibility/custom-tools/` | `test -d` | Có, 4 file. |
| `…/extensibility/custom-commands/` | `test -d` | Có, 17 file. |
| `…/extensibility/plugins/` | `test -d` | Có, 21 file. |
| `packages/coding-agent/src/capability/index.ts` | `wc -l` | Có, 588 dòng. |
| `capability/index.ts:89-96` | `sed -n '80,100p'` | **Đúng.** `89: export function defineCapability<T>(def: Omit<Capability<T>, "providers">): Capability<T> {` … `96: }` |
| `capability/index.ts:90-92` (lệnh ném trùng id) | `sed -n '90,92p'` | **Đúng.** `90: if (capabilities.has(def.id)) {` / `91: throw new Error(\`Capability "${def.id}" is already defined\`);` / `92: }` |
| `capability/index.ts:34` (map phạm vi module) | `sed -n '34p'` | **Đúng.** `const capabilities = new Map<string, Capability<unknown>>();` |
| `capability/index.ts:88` là `*/` (đính chính 4) | `sed -n '88p'` | **Đúng.** Dòng 88 là ` */` — dấu đóng JSDoc. |
| `AGENTS.md` § Testing Guidance | `grep -n` | Có, bắt đầu dòng **282**. |
| AGENTS.md cấm placeholder test | `awk 'NR==302'` | `302: - No placeholder tests, tautologies, or "the code ran" assertions …` |
| AGENTS.md cấm source-grep | `awk 'NR==312'` | `312: - **Never source-grep.** A test that reads an implementation file …` |
| `docs/` có 82 file `.md` phẳng | `find docs -maxdepth 1 -name '*.md' \| wc -l` | **Đúng: 82.** |
| `docs/` không có `adr/` `decisions/` `architecture/` | `find docs -mindepth 1 -type d` | **Đúng.** Thư mục con chỉ có `tools/`, `toolconv/`, `skills/`. |
| `docs/extension-loading.md`, `extensions.md`, `hooks.md`, `custom-tools.md` | `test -f` | Cả bốn đều tồn tại. |
| `…/extensions/loader.ts:362` (`pi.registerProvider` hiện thực) | `grep -n registerProvider` | **Đúng.** `362: registerProvider(name: string, config: ProviderConfig): void {` |
| `config/model-registry.ts` tồn tại | `ls` | **Đúng.** |
| `extension-ui-controller.ts:87-88` (đính chính 5) | `sed -n '85,90p'` | **Đúng.** `87: #hookWidgetsAbove = new Map<string, ExtensionUiComponent>();` / `88: #hookWidgetsBelow = …` |
| `extension-ui-controller.ts:78-79` không liên quan (đính chính 5) | `sed -n '78,79p'` | **Đúng.** `: option.description` / `: ? { label: option.label, description: option.description }` — helper `toWireSelectOptions`. |
| `extension-ui-controller.ts:343` (`setHookWidget`) | `grep -n setHookWidget` | **Đúng.** |
| Không có fixture `outsider-extension` (đính chính 6) | `grep -rln 'outsider' packages/`; `find . -name '*outsider*'` | **Không kết quả nào.** |
| `registerMode` không tồn tại (đính chính 6) | `grep -rn 'registerMode' packages/` | **0 hit.** |
| `test/extension-ui-header-footer.test.ts` chưa tồn tại (đính chính 7) | `ls` | **Vắng.** |
| `test/extension-unload.test.ts` chưa tồn tại (đính chính 7) | `ls` | **Vắng.** |
| 14 capability hằng + 20 capability-provider (đính chính 3) | `grep -rn 'defineCapability<'` | **Đúng: 15 hit** = 14 hằng + khai báo hàm ở `capability/index.ts:89`. |
| 20 capability-provider (đính chính 3) | `grep -rn '^registerProvider(' \| grep -cE 'Capability\.id'` | **Đúng: 20.** |
| Đoạn "Extensions vs hooks vs custom-tools" **đã tồn tại** (phát hiện MISSING-FROM-PLAN) | `sed -n '904,912p'` | **Đúng về sự tồn tại, sai về dòng.** Xem 2.2. |

### 2.2. Neo HỎNG (đã truy đúng vị trí thay)

| Neo trong WI-10 | Nó thực sự là gì | Vị trí ĐÚNG |
| --- | --- | --- |
| `…/extensions/types.ts:230` — "đứng trước `ExtensionUIContext`" | Dòng 230 là ` * Each mode (interactive, RPC, print) provides its own implementation.` — một dòng JSDoc, **không phải marker, không phải khai báo interface** | Marker `:232`; `export interface ExtensionUIContext` ở **`:237`** |
| `…/extensions/types.ts:395` | ` * Context passed to extension event handlers.` — dòng JSDoc | Marker `:397`; `export interface ExtensionContext` ở **`:454`** |
| `…/extensions/types.ts:568` | ` * Includes session control methods only safe in user-initiated commands.` — dòng JSDoc | Marker `:570`; `export interface ExtensionCommandContext` ở **`:574`** |
| `…/extensions/types.ts:1227` | `reason?: string;` — một field trong một kết quả, **không liên quan gì tới `RegisteredCommand`** | Marker **`:1248`**; `export interface RegisteredCommand` ở **`:1251`** (lệch tới 21 dòng) |
| `docs/extensions.md:901-909` | Dòng 901 là một bullet về reserved shortcuts trong mục `## Constraints and pitfalls` — **sai mục hoàn toàn** | Mục `## Extensions vs hooks vs custom-tools` ở **`:904-912`**: tiêu đề 904, `Use the right surface:` 906, ba bullet **908/909/910**, câu kết **912**. Lệch đồng đều +3. |
| `docs/extensions.md:905` (đính chính 3) | Dòng trống | Chuỗi "unified system (events + tools + commands + renderers + provider registration)" ở **`:908`** |
| `extensibility/legacy-pi-coding-agent-shim.ts` = **1649** dòng | Thật là **1658** dòng | `wc -l` |
| `extensibility/legacy-pi-ai-shim.ts` = **179** dòng | Thật là **194** dòng | `wc -l` |
| Tổng shim = **4833** | Thật là **4857** | 1658 + 2783 + 194 + 179 + 43 |
| plan dòng **4531-4532** = "ràng buộc của WI-5" | 4531 trống; 4532 là bullet `**WI-0** — mô hình tin cậy extension phải được quyết…` nằm trong mục Phụ thuộc **của WI-12** | Ràng buộc M2-OQ2 **của WI-5** nằm ở plan **`:2037`** ("TRƯỚC khi bắt đầu commits 2-3, xác nhận M2-OQ2 …") và plan **`:2217`** |
| plan dòng **6669-6673** = "bán kính ảnh hưởng của M2-OQ2" | **VƯỢT CUỐI FILE.** `MILESTONE_2_EXECUTION_PLAN.md` dài **5408** dòng | Bán kính thật: plan **`:230`** (hàng M2-OQ2 trong bảng open-questions) và plan **`:473-478`** (danh sách `blocks` của WI-0) |
| `package.json:94-95` = glob của `check:ts` | 94 là `lint:ts`, 95 là `lint:tools` — **không có glob nào ở đây** | Glob ở **`:91`** (`check:tools`) và **`:99`** (`fmt:tools`) |
| Tiêu đề phát hành hiện tại là `## [18.3.3] - 2026-09-27` ở dòng 5 (WI-10 nói về neo changelog của WI-0) | Sai kép | `## [18.4.0] - 2026-09-28` ở **`:9`**; `## [18.3.3] - 2026-09-27` ở **`:65`** |
| Neo changelog của WI-0 "dòng 1057" | 1057 là một mục `models.yml`, không liên quan | Mục `#7955` ở **`:1117`** |
| `…/extensions/types.ts:1256` = `export interface ExtensionAPI` (đính chính 1 của WI-10) | 1256 là `}` đóng `RegisteredCommand` | `export interface ExtensionAPI` ở **`:1277`** |
| `…/extensions/types.ts:1660` = `ExtensionFactory` (đính chính 1) | Lệch | `export type ExtensionFactory = (pi: ExtensionAPI) => void \| Promise<void>;` ở **`:1685`** |
| `…/extensions/types.ts:1570` = khai báo `pi.registerProvider` (đính chính 3) | 1570 là dòng JSDoC ví dụ `* pi.registerProvider("google-vertex-claude", {` | Khai báo method ở **`:1595`**; một khai báo thứ hai trên interface khác ở **`:1768`** |
| `sdk.ts:1007` và `:2489` phát lại `pendingProviderRegistrations` (đính chính 3) | File là `packages/coding-agent/src/sdk.ts` — **KHÔNG nằm dưới `extensibility/extensions/`** như đường dẫn ngầm của WI-10 gợi ý; và số dòng sai | `1018-1021` (lần đầu) và `2500-2504` (lần thứ hai) trong `packages/coding-agent/src/sdk.ts` |
| Số file test khớp `^extension` = 15 (đính chính 7) | 16 | `command ls -1 packages/coding-agent/test/ \| grep -cE '^extension'` → **16** (14 singular + `extensions-discovery.test.ts` + `extensions-runner.test.ts`) |
| Plan 5894 / 5900 / 5915 / 5898 / 5911 / 5933 / 4734 / 4696 / 4697 / 4609 / 4441 (mọi dòng trong bảng "Đính chính so với plan") | 5894/5900/5915/5898/5911/5933/4734 nằm **vượt cuối file** (5408 dòng) hoặc trống; 4609/4441/4696/4697 trỏ nội dung không liên quan | Toàn bộ các claim "plan dòng NNNN" trong bảng đính chính **không dùng lại được** — người gõ phải tự tìm lại bằng nội dung |

**Kết luận kiểm chứng:** WI-10 **đúng về chất** (bốn marker thay vì hai; 14+20 chứ không phải 84; hai file test tương lai; `defineCapability` ở 89-96 chứ không phải 88; hai map widget ở 87-88; `docs/extensions.md` đã có sẵn câu trả lời một phần) nhưng **sai về dòng ở gần như mọi neo**. Cụ thể nhất: bốn neo superset đều lệch, `docs/extensions.md` lệch +3 đồng đều, và toàn bộ số dòng plan trong bảng đính chính nằm ngoài file.

---

## 3. Bảng điểm sửa

Đúng ba file. `TRƯỚC` trích nguyên văn từ file thật vừa mở.

| Đường/dẫn | Symbol / vùng | TRƯỚC (nguyên văn) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `docs/extension-writing-surfaces.md` | — (tạo mới) | Không tồn tại | File mới. Mục ĐẦU TIÊN là bảng 6 dòng `Surface \| Path \| Status \| What it is for \| Evidence`. Ngay dưới bảng, **một dòng đứng riêng**: `Capability registry: <YES\|NO\|DEFERRED>`. Rồi mới tới `## Consequences`. |
| `docs/extensions.md:904-912` | `## Extensions vs hooks vs custom-tools` | Xem khối 9 dòng bên dưới (tiêu đề 904 + thân 905-912) | Tiêu đề giữ nguyên; **thân 8 dòng** thay bằng **tối đa 2 dòng** trỏ tới ADR. Xem khối "SAU". |
| `packages/coding-agent/CHANGELOG.md:5` | `### Security` (mục đầu tiên dưới `## [Unreleased]`) | `5: ### Security` — mục ĐÃ có sẵn một entry ở dòng 7 | Thêm một `### Documentation` (hoặc `### Changed`) **phía trên hoặc phía dưới `### Security`**, chứ không thay thế nó. Một bullet một dòng. |

**TRƯỚC — `docs/extensions.md:904-912` (nguyên văn, `awk 'NR>=904 && NR<=912'`):**

```
## Extensions vs hooks vs custom-tools

Use the right surface:

- **Extensions** (`src/extensibility/extensions/*`): unified system (events + tools + commands + renderers + provider registration).
- **Hooks** (`src/extensibility/hooks/*`): separate legacy event API.
- **Custom-tools** (`src/extensibility/custom-tools/*`): tool-focused modules; when loaded alongside extensions they are adapted and still pass through extension interception wrappers.

If you need one package that owns policy, tools, command UX, and rendering together, use extensions.
```

**SAU — hình dạng cần đạt (một khả năng, không phải bắt buộc nguyên văn):**

```markdown
## Extensions vs hooks vs custom-tools

The ranked surface table — which one is canonical, which are frozen for compatibility — is
`docs/extension-writing-surfaces.md`. Read that before choosing a surface.
```

**TRƯỚC — `packages/coding-agent/CHANGELOG.md:1-9` (nguyên văn):**

```
# Changelog

## [Unreleased]

### Security

- Project-scope MCP config (`mcp.json`, `.mcp.json`, `.omp/mcp.json`) is no longer loaded by default. Because these files travel inside a repository, honouring them let a cloned project start arbitrary processes through a stdio server's `command`, and run `!command` env and header values through the shell. Set Settings → Tools → Discovery & MCP → MCP Project Config to re-enable it per project.

## [18.4.0] - 2026-09-28
```

**SAU — một bullet thêm vào `## [Unreleased]`, giữ nguyên `### Security`.** Ví dụ (một dòng, hướng người dùng, mở đầu bằng điều tác giả nay làm được):

```markdown
### Documentation

- Extension authors now have one page, `docs/extension-writing-surfaces.md`, that ranks the five extension-facing writing surfaces, marks the compatibility-only ones as frozen, and answers whether the capability registry is extension-reachable.
```

---

## 4. Các bước, đánh số, mỗi bước có neo đã kiểm

### Bước 1 — CỔNG CẨN. Đừng bắt đầu cho tới khi WI-0 xuống đất.

```bash
ls docs/extension-trust-model.md
```

**Đã kiểm:** file **không tồn tại** ở HEAD hiện tại. Nếu vẫn vắng sau khi WI-0 merge, **DỪNG**, báo WI-10 bị chặn. Đừng soạn ADR nửa vời trên một thái độ tin cậy chưa viết ra.

### Bước 2 — Chốt tên file với người viết WI-0, rồi tạo ADR với bảng trạng thái là MỤC ĐẦU TIÊN.

Sáu dòng, đúng thứ tự này:

| # | Surface | Path (đã kiểm tồn tại) | Status |
| --- | --- | --- | --- |
| 1 | extension factory TypeScript | `packages/coding-agent/src/extensibility/extensions/` (11 file) | CANONICAL |
| 2 | hooks | `packages/coding-agent/src/extensibility/hooks/` (5 file) | COMPATIBILITY-ONLY / FROZEN |
| 3 | custom tools | `packages/coding-agent/src/extensibility/custom-tools/` (4 file) | — chọn |
| 4 | custom-command markdown | `packages/coding-agent/src/extensibility/custom-commands/` (17 file) | — chọn |
| 5 | plugin manifest package | `packages/coding-agent/src/extensibility/plugins/` (21 file) | — chọn |
| 6 | capability registry | `packages/coding-agent/src/capability/index.ts` (588 dòng) | CORE-ONLY / NOT EXTENSION-REACHABLE — **trừ khi M2-OQ2 trả lời YES** |

**Đã kiểm:** cả sáu path đều tồn tại. Xem lệnh ở §7.

### Bước 3 — Trích nguyên văn bốn bằng chứng superset.

Bốn marker thật, **đã kiểm**, mỗi cái kèm comment ngay bên dưới:

| Marker | Interface nó bảo vệ | Comment nguyên văn (dòng kế tiếp) |
| --- | --- | --- |
| `types.ts:232` | `ExtensionUIContext` @ **237** | `// Parallel to HookUIContext: extensions expose a strictly larger UI surface` / `(custom editor component, header/footer, widgets, theming, terminal input)` / `and may be invoked from event handlers that have already taken the agent` / `loop's lock — hooks intentionally cannot.` |
| `types.ts:397` | `ExtensionContext` @ **454** | `// Parallel to HookContext: extensions expose a strictly larger runtime` / `surface (model registry, system prompt, shutdown, full session manager` / `access). Field overlap is incidental; merging into a base would require` / `hooks to widen their public contract.` |
| `types.ts:570` | `ExtensionCommandContext` @ **574** | `// Parallel to HookCommandContext: same method names, different invariants —` / `extension commands additionally permit \`switchSession\` and \`reload\`,` / `which hooks must not call to avoid deadlocking the agent loop.` |
| `types.ts:1248` | `RegisteredCommand` @ **1251** | `// Parallel to HookAPI's RegisteredCommand: extensions add` / `` // `getArgumentCompletions` and bind handlers to ExtensionCommandContext. `` |

Ghi vào cột Evidence của dòng extension-factory, **nguyên văn, đủ bốn**. Đây là bằng chứng làm lập luận superset kiểm chứng được thay vì khẳng định.

**Cảnh báo gõ:** đừng gõ `fallow` (ba chữ `l`) — mã nguồn là `fallow` với **hai** chữ `l`.

### Bước 4 — Trả lời M2-OQ2 bằng đúng một dòng.

Dạng: `Capability registry: <YES|NO|DEFERRED>`. Đặt ngay dưới bảng, trước `## Consequences`.

**Đã kiểm — cơ sở lập luận, trích nguyên văn `capability/index.ts:89-96`:**

```
export function defineCapability<T>(def: Omit<Capability<T>, "providers">): Capability<T> {
	if (capabilities.has(def.id)) {
		throw new Error(`Capability "${def.id}" is already defined`);
	}
	const capability: Capability<T> = { ...def, providers: [] };
	capabilities.set(def.id, capability as Capability<unknown>);
	return capability;
}
```

Ba điểm lập luận: (1) ném lỗi khi trùng id → lần nạp thứ hai trong cùng tiến trình là **crash**, không phải đăng ký lại; (2) `capabilities` là `Map` phạm vi module ở `capability/index.ts:34`, **không có lớp provenance**; (3) đúng một người ghi chính.

**DEFERRED chỉ hợp lệ khi có tên người phụ trách + tên milestone.** Thiếu cả hai thì viết YES hoặc NO.

**Không tự chốt.** Đây là quyết định của người quyết, không phải của người gõ tài liệu.

### Bước 5 — Phát biểu LUẬT ĐÃ CHẤP NHẬN.

Một capability mới BẮT BUỘC phải nêu bề mặt đích của nó trong phần mô tả PR. Nói rõ **không có luật lint hay bước CI nào cưỡng chế** điều đó, và giải thích trong một câu vì sao.

**Đã kiểm — lý do kỹ thuật, trích nguyên văn `AGENTS.md`:**
- dòng 302: `- No placeholder tests, tautologies, or "the code ran" assertions …`
- dòng 312: `- **Never source-grep.** A test that reads an implementation file (\`.ts\`/\`.rs\`/build script) and asserts on its _text_ … is banned.`

Một kiểm tra "PR có nhắc bề mặt hay không" đúng là một khẳng định không có hợp đồng tiêu thụ. Đây là **một chuẩn mực review có chủ đích**, không phải sơ suất.

### Bước 6 — Danh sách FROZEN, số dòng thật.

**Đã kiểm — số dòng thật tại thời điểm kiểm chứng (KHÁC với con số trong WI-10):**

| File | Số dòng thật | WI-10 ghi |
| --- | --- | --- |
| `packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts` | **1658** | 1649 ❌ |
| `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts` | **2783** | 2783 ✅ |
| `packages/coding-agent/src/extensibility/legacy-pi-ai-shim.ts` | **194** | 179 ❌ |
| `packages/coding-agent/src/extensibility/legacy-typebox.ts` | **179** | 179 ✅ |
| `packages/coding-agent/src/extensibility/legacy-pi-tui-shim.ts` | **43** | 43 ✅ |
| **Tổng** | **4857** | 4833 ❌ |

Nêu kèm một phát biểu tường minh: gỡ chúng là **một dự án breaking-change riêng với milestone riêng, nằm ngoài M2**. Đặt ngay cùng nhịp thở với câu trả lời M2-OQ2 ở bước 4 — nếu không, người đọc chữ "NO" sẽ hiểu là giấy phép xoá.

### Bước 7 — Mục "Consequences".

**Đã kiểm — hai neo plan trong WI-10 (4531-4532, 6669-6673) đều hỏng.** Dùng hai neo này thay thế:

- **Bán kính M2-OQ2:** `MILESTONE_2_EXECUTION_PLAN.md:230` — hàng open-questions liệt kê `WI-10, WI-7, WI-5 commit 2–3, WI-11, WI-12`.
- **Danh sách chặn:** `MILESTONE_2_EXECUTION_PLAN.md:475-478` — `blocks` của WI-0: WI-10, WI-7, WI-11, WI-12.
- **Ràng buộc M2-OQ2 của WI-5:** `MILESTONE_2_EXECUTION_PLAN.md:2037` — bước 8 của WI-5, "TRƯỚC khi bắt đầu commits 2-3, xác nhận M2-OQ2 …".

Nêu **ba** thứ mở khoá (WI-5 commits 2-3, WI-7, WI-11/WI-12) và **một** thứ KHÔNG mở khoá: không dòng code nào. Việc hiện thực hoá quyết định nằm ngoài phạm vi M2.

### Bước 8 — Sửa `docs/extensions.md`.

Thay **`:904-912`** (KHÔNG phải 901-909), giữ nguyên tiêu đề dòng 904. Đừng xoá hẳn mục — có người đọc bên ngoài đã liên kết tới nó — nhưng cũng đừng để nguyên ba câu trả lời cũ nằm cạnh con trỏ mới.

**Đã kiểm:** mục cũ chỉ phủ **3 trong 5** bề mặt (`custom-commands/` và `plugins/` vắng mặt), dùng **văn xuôi không từ trạng thái**, và **im lặng** về sổ đăng ký capability. Nó cũng là bằng chứng rằng registry **provider model** đã extension-reachable: bullet ở `:908` nói thẳng `unified system (events + tools + commands + renderers + provider registration)`.

### Bước 9 — Chạy cổng, rồi thêm dòng changelog.

Thêm bullet vào `## [Unreleased]`, **giữ nguyên `### Security`** đã có sẵn. Chạy §6.

---

## 5. Hợp đồng test

**Danh sách file test: RỔNG. Và đó là dự kiến, không phải sơ suất.**

| File test | Trạng thái |
| --- | --- |
| *(không có)* | — |

Ba lý do độc lập:

1. Tài liệu không có hợp đồng runtime quan sát được. `AGENTS.md:302` cấm placeholder test; `AGENTS.md:312` cấm source-grep.
2. Bản năng tự nhiên nhất — test khẳng định file ADR tồn tại — **đúng là một source-grep**, bị cấm hẳn. Nó sẽ xanh trong khi tài liệu nói sai, đúng cái hỏng mà mục này sinh ra để ngăn.
3. Lint/CI không có mảng glob nào chạm markdown (xem §6 bước 3), nên "CI xanh" là một phát biểu về **không byte nào** của thay đổi này.

**Nếu hồi quy, người dùng thấy gì:** người tiêu là tác giả extension bên thứ ba và người review. Họ thấy **một cây mang hai câu trả lời xung đột cho cùng câu hỏi** "viết vào bề mặt nào", trong đó câu nào đúng phụ thuộc vào tài liệu họ mở trước. Hoặc họ thấy **một danh sách sáu bề mặt không hề chọn**, mà mọi người đọc lại coi như đã chốt — và kỹ sư tiếp theo dựng một API công khai trên một thái độ chưa ai chọn. Hoặc họ thấy một người đọc chữ "NO" cho M2-OQ2 rồi xoá 4857 dòng shim cũ trong M2.

**Hợp đồng thật là một DANH SÁCH ĐỌC CỦA NGƯỜI REVIEW với năm điều kiện hỏng** — xem §6. Không trả lời được ba câu hỏi chỉ từ phần chữ, không hỏi tác giả, thì chưa được trao một quyết định.

---

## 6. Cổng

### Lệnh cổng

```bash
# 1. File nằm trong cây, và nêu người quyết định cùng ngày
ls docs/extension-writing-surfaces.md

# 2. Câu trả lời M2-OQ2 nằm ở MỘT DÒNG, giá trị đúng bằng YES, NO, hoặc DEFERRED.
#    -E: "YES" cũng khớp "DEFERRED" — phải kiểm bằng mắt phần sau dấu hai chấm.
grep -nE 'Capability registry: *(YES|NO|DEFERRED)$' docs/extension-writing-surfaces.md

# 3. Diff đúng ba file và KHÔNG file nào kết thúc bằng .ts
git diff --stat
git diff --name-only | grep -c '\.ts$'   # PHẢI bằng 0

# 4. Mục ở dòng 904 cũ giờ trỏ tới ADR; danh sách ba bề mặt cũ không còn đứng cạnh tranh
git diff docs/extensions.md

# 5. Dòng mới nằm dưới '## [Unreleased]' (dòng 3) và mục '### Security' cũ KHÔNG bị mất
git diff packages/coding-agent/CHANGELOG.md
grep -n '^## \[' packages/coding-agent/CHANGELOG.md | head -2
```

### Cổng này có ĐỎ ĐƯỢC không, và bằng cách nào

**CÓ — cổng này đỏ được**, nhưng **chỉ với một điều kiện duy nhất: con người đọc.** Trong CI tự động thì **KHÔNG**, và điều đó phải nói thẳng.

| Điều kiện hỏng | Lệnh bắt được? | Bằng chứng |
| --- | --- | --- |
| ADR không tồn tại | ✅ **CÓ** | `ls` exit ≠ 0 |
| Câu trả lời M2-OQ2 không phải đúng một trong ba chữ | ✅ **CÓ** | `grep -E '…(YES\|NO\|DEFERRED)$'` không có hit |
| Diff có file `.ts` | ✅ **CÓ** | `grep -c '\.ts$'` ≠ 0 |
| `docs/extensions.md` vẫn còn câu trả lời cũ nằm cạnh con trỏ | ⚠️ **MỘT NỬA** | `git diff` cho thấy dòng nào bị xoá — người đọc phải xác nhận bằng mắt rằng **không còn** câu trả lời cạnh tranh nào |
| Danh sách 6 bề mặt liệt kê mà không chọn | ❌ **KHÔNG** | Không có lệnh nào phân biệt "có 6 dòng" với "6 dòng + một lựa chọn". Đây là điều kiện **rủi ro cao nhất và không tự bắt được.** |
| Shim bị mô tả là gỡ được trong M2 | ❌ **KHÔNG** | Văn bản thuần tuý; không có consumer nào đọc nó. |

**Vì sao chỉ 3/6 điều kiện tự bắt được:** `package.json:91` và `:99` cho thấy mọi glob lint/format đều là `packages/*/src/**/*.{ts,tsx}`, `packages/*/{test,bench,examples,scripts}/**/*.ts` — **không cái nào có `.md`**. Không có markdown linter. Một lần `check:ts` xanh là một phát biểu về **không byte nào** của thay đổi này. `bun test` thì càng không liên quan (cần addon native dưới `packages/natives`).

**Sửa lại cổng cho đỏ được — bổ sung ba lệnh bắt được ba điều kiện còn lại:**

```bash
# 6. Mỗi dòng của bảng phải mang MỘT từ trạng thái.
#    Đếm số dòng bảng vs số dòng có từ trạng thái: phải BẰNG NHAU.
awk -F'|' '/^\|/ && NF>3 {rows++}
     /CANONICAL|COMPATIBILITY-ONLY|FROZEN|CORE-ONLY|NOT EXTENSION-REACHABLE/ {marked++}
     END {printf "rows=%d marked=%d\n", rows, marked; exit !(rows>0 && rows==marked)}' \
  docs/extension-writing-surfaces.md

# 7. Cấm câu trả lời thứ tư. RỖNG nếu tài liệu vẫn còn TBD / TBA / "under discussion" / "it depends".
grep -niE '\bTBD\b|\bTBA\b|under discussion|it depends|to be decided|còn để bàn' \
  docs/extension-writing-surfaces.md
```

Lệnh 6 **bắt được** điều kiện "liệt kê mà không chọn" — đó là thất bại đặc trưng mà WI-10 nêu. Lệnh 7 **bắt được** mọi cách diễn đạt thứ tư thay cho ba chữ. Lệnh 8 bắt việc ADR tuyên bố shim gỡ được trong M2:

```bash
# 8. Tài liệu không được tuyên bố shim gỡ được trong M2.
#    ĐỎ khi KHÔNG có hit (tức tài liệu đã nói đúng sự thật: gỡ là dự án riêng).
grep -niE 'remove (the )?(legacy )?shim|drop (the )?shim|can be removed' \
  docs/extension-writing-surfaces.md
```

> **Lưu ý về lệnh 2.** `grep -n 'Capability registry'` mà WI-10 dùng sẽ **xanh sai**: chuỗi đó xuất hiện trong cả dòng của bảng trạng thái (dòng 6) lẫn dòng câu trả lời. Bắt buộc phải neo `$` và `\s*` với `grep -E`, rồi **đọc bằng mắt** phần sau dấu hai chấm — vì `YES` là hậu tố của `DEFERRED`.

---

## 7. Cạm bẫy riêng của work item này

### 7.1. Số dòng trong WI-10 đã cũ hơn cây — đừng gõ chúng

Nhiều nhất trong mục này là neo. Đã kiểm và **đã sửa ở trên**, nhưng người gõ phiếu khác có thể đọc lại WI-10 và gõ theo:

- `types.ts:230/395/568/1227` → thật là **232/397/570/1248**. Lệch đều +2, +2, +2, **+21**.
- `docs/extensions.md:901-909` → thật là **904-912**. Lệch đều +3.
- Toàn bộ số dòng plan trong bảng "Đính chính so với plan" (5894, 5900, 5915, 5898, 5911, 5933, 4734, 6669-6673) **nằm ngoài file** — plan dài 5408 dòng. Chúng vô dụng.
- Tổng shim **4857**, không phải 4833.

### 7.2. `fallow` viết sai sẽ khiến lập luận superset sập

Mã nguồn: `fallow-ignore-next-line code-duplication` — **hai** chữ `l`. Gõ ba chữ `l` là grep không ra, và người review tưởng bạn bịa bốn bằng chứng.

### 7.3. Bẫy lớn nhất: đọc chữ "NO" là giấy phép xoá shim

M2-OQ2 trả lời `NO` **không** có nghĩa là capability registry nên bỏ. Nó có nghĩa là **chưa bao giờ** nên mở. Shim cũ là thứ giữ các plugin hiện hành chạy. Gỡ chúng là **dự án breaking-change riêng, có milestone riêng, ngoài M2**. Câu này phải nằm trong chính ADR, ngay cùng nhịp thở với ô M2-OQ2 — không phải ở mục "Consequences" phía cuối.

### 7.4. Bẫy thứ hai: viết tài liệu trả lời M2-OQ2 hộ người quyết

WI-10 **cố ý** không chọn sẵn. Ba chữ đó là quyết định của người quyết, không phải của người gõ tài liệu. Chọn hộ = lặp lại đúng thất bại mà mục này sinh ra để ngăn. Hãy đưa lựa chọn cho người quyết, viết ADR sau khi có chữ.

### 7.5. Bẫy thứ ba: hai câu trả lời cùng tồn tại trong cây

`docs/extensions.md:904-912` **đã có sẵn** một câu trả lời một phần. Nếu tạo ADR mà không sửa mục đó, cây mang hai câu trả lời xung đột và người đọc chọn bằng cách mở file nào trước. Đây là phát hiện giá trị cao nhất của lần rà này — plan không hề nhắc tới.

### 7.6. Bẫy thứ tư: đếm nhầm hai registry khác nhau

Có **hai** registry cùng tên hàm `registerProvider`:
- `capability/index.ts` — 14 capability, 20 provider, **core-only** (trừ khi M2-OQ2 = YES).
- `config/model-registry.ts` — registry provider **model**, đã extension-reachable qua `pi.registerProvider` (khai báo `extensions/types.ts:1595`, hiện thực `loader.ts:362`, phát lại ở `packages/coding-agent/src/sdk.ts:1018-1021` và `:2500-2504`).

ADR buộc phải nói rõ nó nói registry nào. Nói chung "các registry provider không extension-reachable" là **sai thẳng** — `docs/extensions.md:908` đã nói ngược lại.

### 7.7. Bẫy thứ năm: `## [Unreleased]` KHÔNG rỗng

WI-10 nói nó "hiện đang rỗng" và bảo mục kế tiếp là `## [18.3.3] - 2026-09-27` ở dòng 5. Cả hai đều sai. Thật: `## [Unreleased]` @ 3, `### Security` @ 5, một entry thật @ 7, và `## [18.4.0] - 2026-09-28` @ 9. **Đừng xoá `### Security`.** Và vì WI-0 cùng sửa file này trong cùng wave, phải thống nhất với người viết WI-0 chỗ đặt bullet để không đụng dòng ngữ cảnh.

### 7.8. Bẫy thứ sáu: chạy `bun run check:ts` rồi tưởng mục này xong

Tuyệt đối không. Glob ở `package.json:91`/`:99` không có `.md`. Một lần `check:ts` xanh là một phát biểu về **không byte nào** của thay đổi này.

---

## 8. Lệnh đã chạy để kiểm chứng

```bash
cd /Users/tranquangdang21/Projects/ultraworkers

# Bước 1 — cổng cứng
ls docs/extension-trust-model.md docs/extension-writing-surfaces.md
# → cả hai: No such file or directory

# Bước 2 — sáu path bề mặt
for d in extensions hooks custom-tools custom-commands plugins; do
  printf "%s: %s files\n" "$d" "$(find packages/coding-agent/src/extensibility/$d -type f | wc -l)"
done
# → extensions 11, hooks 5, custom-tools 4, custom-commands 17, plugins 21
wc -l packages/coding-agent/src/capability/index.ts
# → 588

# Bước 3 — BỐN marker thật (WI-10 ghi 230/395/568/1227)
grep -n 'fallow-ignore-next-line code-duplication' packages/coding-agent/src/extensibility/extensions/types.ts
# → 232, 397, 570, 1248        (file dài 1874 dòng)
grep -n 'export interface ExtensionUIContext\|export interface ExtensionContext\|export interface ExtensionCommandContext\|export interface RegisteredCommand' \
  packages/coding-agent/src/extensibility/extensions/types.ts
# → 237, 454, 574, 1251
awk 'NR>=233 && NR<=236' packages/coding-agent/src/extensibility/extensions/types.ts
awk 'NR>=398 && NR<=401' packages/coding-agent/src/extensibility/extensions/types.ts
awk 'NR>=571 && NR<=573' packages/coding-agent/src/extensibility/extensions/types.ts
awk 'NR>=1249 && NR<=1250' packages/coding-agent/src/extensibility/extensions/types.ts

# Bước 4 — defineCapability
sed -n '80,100p' packages/coding-agent/src/capability/index.ts
# → 89 export function defineCapability<T>…, 90-92 throw, 96 }
sed -n '34p;88p' packages/coding-agent/src/capability/index.ts
# → 34: const capabilities = new Map<string, Capability<unknown>>();
#   88:  */

# Bước 6 — số dòng shim thật
wc -l packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts \
      packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts \
      packages/coding-agent/src/extensibility/legacy-pi-ai-shim.ts \
      packages/coding-agent/src/extensibility/legacy-typebox.ts \
      packages/coding-agent/src/extensibility/legacy-pi-tui-shim.ts
# → 1658, 2783, 194, 179, 43   (tổng 4857)

# Bước 7 — neo plan thay cho 4531-4532 và 6669-6673
wc -l MILESTONE_2_EXECUTION_PLAN.md
# → 5408   (6669-6673 VƯỢT CUỐI FILE)
awk 'NR==230' MILESTONE_2_EXECUTION_PLAN.md    # hàng M2-OQ2
awk 'NR>=475 && NR<=478' MILESTONE_2_EXECUTION_PLAN.md  # blocks của WI-0
awk 'NR==2037' MILESTONE_2_EXECUTION_PLAN.md   # ràng buộc M2-OQ2 của WI-5

# Bước 8 — câu trả lời một phần đã có sẵn
awk 'NR>=904 && NR<=912' docs/extensions.md
# → 904 ## Extensions vs hooks vs custom-tools … 912 If you need one package…
awk 'NR==901' docs/extensions.md
# → - Reserved shortcuts are ignored (`ctrl+c`, …)   ← SAI MỤC
awk 'NR==908' docs/extensions.md
# → - **Extensions** (`src/extensibility/extensions/*`): unified system (… + provider registration).

# Bước 9 — CHANGELOG
awk 'NR>=1 && NR<=9' packages/coding-agent/CHANGELOG.md
grep -n '^## \[' packages/coding-agent/CHANGELOG.md | head -3
# → 3:## [Unreleased]   9:## [18.4.0] - 2026-09-28   65:## [18.3.3] - 2026-09-27
grep -n '#7955' packages/coding-agent/CHANGELOG.md
# → 1117

# Cổng — glob không có markdown
awk 'NR==91 || NR==99' package.json
# → 91: check:tools = oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' …
#   99: fmt:tools   = oxfmt 'packages/*/src/**/*.{ts,tsx}' …

# Cổng — tương lai, không tồn tại
ls packages/coding-agent/test/extension-ui-header-footer.test.ts \
   packages/coding-agent/test/extension-unload.test.ts
# → cả hai: No such file or directory
command ls -1 packages/coding-agent/test/ | grep -cE '^extension'
# → 16   (WI-10 ghi 15)

# Cổng — không có registerMode, không có outsider
grep -rn 'registerMode' packages/ ; grep -rln 'outsider' packages/
# → 0 hit cả hai

# Đính chính 3 — số đếm
grep -rn 'defineCapability<' packages/coding-agent/src/ | wc -l
# → 15  (14 hằng capability + khai báo hàm ở capability/index.ts:89)
grep -rn '^registerProvider(' packages/coding-agent/src/ | grep -cE 'Capability\.id'
# → 20

# Đính chính 3 — registerProvider extension-reachable
grep -n 'registerProvider' packages/coding-agent/src/extensibility/extensions/types.ts
# → 1595: registerProvider(name: string, config: ProviderConfig): void;
grep -n 'registerProvider' packages/coding-agent/src/extensibility/extensions/loader.ts
# → 362: registerProvider(name: string, config: ProviderConfig): void {
grep -rn 'pendingProviderRegistrations' packages/coding-agent/src/sdk.ts
# → 1018, 1021, 2500, 2501, 2504   (KHÔNG phải 1007 / 2489; file ở src/sdk.ts, không dưới extensibility/)

# Đính chính 5 — hai map không ai sở hữu
awk 'NR==87 || NR==88' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts
# → #hookWidgetsAbove / #hookWidgetsBelow
awk 'NR==78 || NR==79' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts
# → toWireSelectOptions — không liên quan

# Đính chính 1 — ExtensionAPI / ExtensionFactory
grep -n 'export interface ExtensionAPI\|export type ExtensionFactory' packages/coding-agent/src/extensibility/extensions/types.ts
# → 1277 / 1685   (WI-10 ghi 1256 / 1660)
```

> **Không dùng `tsc` / `npx tsc`.** Phiếu này không đề xuất lệnh nào như vậy.
