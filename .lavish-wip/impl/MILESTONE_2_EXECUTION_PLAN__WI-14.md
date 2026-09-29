# Phiếu triển khai — WI-14: Trust state cho hook handler

> Nguồn: `MILESTONE_2_EXECUTION_PLAN.md:520-601` (`## WI-14.`)
> Cây kiểm: `/Users/tranquangdang21/Projects/ultraworkers` @ HEAD `65cc6c1`, nhánh `milestone-1`
> Cây tham chiếu: `/Users/tranquangdang21/Projects/codex-ref`
> Ngày kiểm: 2026-09-29
> **Số neo đã mở và đọc: 44. Đúng sẵn: 10. Lệch / sai: 34.**

---

## 0. Cảnh báo đầu tiên, đọc trước khi gõ dòng nào

Bốn chỗ trong đặc tả này sai so với cây thật, và **hai chỗ sai theo hướng làm hỏng việc**, không phải hướng vô hại:

1. **`packages/tui/src/overlays/hook-editor.ts` không phải là bảng hook.** Nó là **một hộp thoại soạn text nhiều dòng** (277 dòng — con số đúng, nhưng nội dung thì không). Trong file đó **không có bảng, không có cột `enabled`, không có hàng per-handler nào**. Cột trạng thái phải thêm vào `packages/tui/src/overlays/extensions/extension-list.ts`. Nếu bạn gõ theo đặc tả, bạn sẽ sửa một file không liên quan và **không có gì hiện ra**.

2. **Không bước nào trong 5 bước của đặc tả cài đặt cái "đường nạp hook bị chặn".** Cả mục "Thay đổi gì" lẫn "Người dùng thấy" đều hứa nó, và cổng (2) nói nó là phần phân biệt — nhưng bước 1 là union, bước 2 là khoá, bước 3 là hash, bước 4 là config, bước 5 là cột hiển thị. **Không bước nào chặn gì cả.** Thêm nữa, file nơi lẽ ra phải chặn (`extensibility/hooks/loader.ts`) **không có trong bảng "File cần chạm tới"**.

3. **Bảng "Đính chính so với plan" tự dẫn đường sai.** Nó gán nhãn STALE cho neo `types.ts:490-494` và `:552-563` rồi bảo dùng neo của WI-0 (`:487-494` / `:548-561`). Đo lại: **neo của chính WI-14 chính xác hơn neo "đính chính"**. Tệ hơn, hai neo `isProjectTrusted` mà WI-14 dùng (`:1293` / `:7552`) là **đúng**, còn hai neo mà đính chính đề xuất (`:1264` / `:7406`) **trỏ vào dòng hoàn toàn khác**.

4. **Có một test trust thứ ba mà đặc tả không nhắc tới:** `packages/coding-agent/test/issue-7955-extension-project-trust.test.ts` (2 case, cùng khẳng định `isProjectTrusted() === true`). Đặc tả nói "hai file test sẵn có" và cổng (3) chỉ chấm hai. Test thứ ba này cũng phải xanh.

**Baseline cổng (1) tại HEAD: XANH, exit 0.** Chạy thật:

```
$ bun run check:ts
oxfmt: All matched files use the correct format.  (5445 files)
oxlint: 1 warning only — packages/coding-agent/test/mcp-project-config-not-trusted-by-default.test.ts:19:10
        eslint(no-unused-vars): 'getConfigRootDir' is imported but never used
16/16 package check:types → Done
[exited with code 0]
```

Cảnh báo oxlint đó nằm ở file **untracked** của một work stream khác, và là *warning* không phải error — `check:ts` vẫn exit 0. Ghi lại output này trước khi sửa; đó là baseline của bạn.

---

## 1. Cái gì thay đổi, quan sát được

Mỗi hook handler bắt đầu mang một trạng thái tính theo content hash — `untrusted` / `trusted` / `modified` / `admin` — và trạng thái đó hiện ngay trên **hàng hook trong bảng Extension Control Center** (bảng có sẵn), cạnh icon trạng thái `active`/`disabled`/`shadowed` đã có; người dùng mở `/extensions`, nhìn thấy `my-hook` với badge `modified` mà không phải mở thêm một overlay nào.

Điều này **chỉ quan sát được nếu có một đường nạp hook thật để chặn**. Ở HEAD này, `discoverAndLoadHooks` (`extensibility/hooks/loader.ts:220`) có **không một call site production nào** và `HookRunner` **không được dựng ở đâu trong `src/`** (xem §6.1). Cho tới khi bạn nối được một call site thật, phần "đường nạp bị chặn" là **văn bản, không phải hành vi** — và cổng (2) của đặc tả sẽ không bao giờ quan sát được.

---

## 2. Bảng điểm sửa

Tất cả `TRƯỚC` dưới đây trích từ cây thật @ `65cc6c1`, đã mở và đọc.

### 2.1 `packages/coding-agent/src/extensibility/hooks/types.ts` (600 dòng)

Neo đặc tả: không có số dòng, chỉ nói "đặt cạnh `HookEvent`". Đo lại:

| vị trí | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| **390-408** | `HookEvent` | `/**`<br>` * Union of all hook event types.`<br>` */`<br>`export type HookEvent =`<br>`	\| SessionEvent`<br>… (15 dòng)<br>`	\| ToolResultEvent;` | **không đổi** — chỉ là chỗ để đặt union mới cạnh |
| **409** | dòng trống sau union | (trống) | chèn union mới ở đây, hoặc ngay **trước** docblock 390 |
| **mới** | — | (chưa có) | `/** Trust state of a hook handler, derived from a content hash. */`<br>`export type HookTrustState = "untrusted" \| "trusted" \| "modified" \| "admin";` |

Ghi chú: tên `HookTrustStatus` của Rust **không** được bảo hộ (đã đo, xem §2.7) — nhưng `HookTrustState` cũng nên tránh, vì `ExtensionState` (`packages/tui/src/overlays/extensions/types.ts:31`) đã là một union ba giá trị cùng vai trò, và lặp lại tên `…State` cho hai thứ khác nhau ở hai tầng là cách dễ đọc nhầm nhất. Cân nhắc `HookTrust`.

### 2.2 `packages/coding-agent/src/capability/hook.ts` (40 dòng) — ĐỌC, KHÔNG SỬA

Neo `:31` là **chính xác tuyệt đối**, không lệch một ký tự:

```
27	export const hookCapability = defineCapability<Hook>({
28		id: "hooks",
29		displayName: "Hooks",
30		description: "Pre/post tool execution hooks",
31		key: hook => `${hook.type}:${hook.tool}:${hook.name}`,
32		toExtensionId: hook => `hook:${hook.type}:${hook.tool}:${hook.name}`,
```

| vị trí | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| **31** | `hookCapability.key` | `` key: hook => `${hook.type}:${hook.tool}:${hook.name}`, `` | **không đổi** — dùng lại làm khoá ổn định |
| **12-24** | `interface Hook` | `name; path; type: "pre" \| "post"; tool; level: "user" \| "project"; _source: SourceMeta;` | **không đổi** — nhưng đây là nơi phải **thêm** `trustState` + `currentHash` nếu bạn muốn nó đi theo hook từ discovery tới UI (xem §2.3) |

**Cạm bẫy khoá ổn định:** cùng một chuỗi ba thành phần đó đã bị **chép lần thứ hai** ở `packages/coding-agent/src/modes/components/extensions/state-manager.ts:235`:

```
235				const id = makeExtensionId("hook", `${hook.type}:${hook.tool}:${hook.name}`);
```

Đặc tả bảo "lấy khoá ổn định từ chỗ đã có" và chỉ trỏ `:31`. Nhưng có **hai** bản. Nếu bạn lấy `:31` rồi thêm state, bản ở `state-manager.ts:235` vẫn phải khớp — và nó là bản quyết định `id` của hàng trong bảng. Sửa một bản mà bỏ bản kia là tạo hai khoá cho cùng một hook.

### 2.3 ĐỔI FILE: bảng hook không ở `hook-editor.ts`

Đặc tả trỏ `packages/tui/src/overlays/hook-editor.ts` và gọi nó là "overlay sửa hook", nói rõ "file dài 277 dòng", "cột `enabled` per-handler là cột thứ hai **trong cùng bảng đó**", và "**không dựng overlay mới**".

Đo lại `hook-editor.ts` (277 dòng — **con số đúng**): đó là `HookEditorComponent`, một `OverlayPanel` bọc `Editor` + `FormField`, hai chế độ `hook` và `prompt-style`, xử lý Enter / Ctrl+Q / bracketed paste / Escape / Ctrl+G. Class duy nhất trong file: `export class HookEditorComponent extends OverlayPanel implements Focusable` (dòng 35). **Không có mảng, không có vòng lặp render hàng, không có `enabled`, không có bất kỳ tham chiếu hook-handler nào.** File được import bởi `advisor-config.ts:36`, `input-controller.ts:22`, `extension-ui-controller.ts:29`, `interactive-mode.ts:214`, `modes/types.ts:40` — toàn bộ là "mở hộp thoại nhập text".

Bảng thật nằm ở đây:

| path | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/tui/src/overlays/extensions/types.ts:31` | `ExtensionState` | `export type ExtensionState = "active" \| "disabled" \| "shadowed";` | **tuỳ chọn.** Giữ nguyên và thêm `trustState?: HookTrustState` vào `Extension` (dòng 42) là cách **ít phá vỡ nhất** — `ExtensionState` đang được `switch` không phủ định ở `extension-list.ts:397` và `inspector-panel.ts:655`, thêm biến thái thứ tư vào đó sẽ làm `check:ts` đỏ cho mọi switch chưa xử lý |
| `packages/tui/src/overlays/extensions/types.ts:42-64` | `interface Extension` | `id; kind; name; displayName; description?; trigger?; path; source; state; disabledReason?; shadowedBy?; raw;` | thêm `trustState?: HookTrustState;` (chỉ set cho `kind: "hook"`) |
| `packages/tui/src/overlays/extensions/extension-list.ts:307-327` | `#renderExtensionRow` | `const stateIcon = shadowed ? … : mcpSnap ? … : this.#getStateIcon(ext.state, masterDisabled);`<br>`let name = sanitizeDisplayLine(ext.displayName);`<br>`const nameWidth = Math.min(24, width - 16);`<br>`let line = \`   ${stateIcon} \`;` | thêm badge trust **ngay sau** `stateIcon`, chỉ khi `ext.kind === "hook" && ext.trustState` — dùng `theme.fg("warning", …)` cho `modified`, `success` cho `trusted`, `dim` cho `untrusted` |
| `packages/tui/src/overlays/extensions/extension-list.ts:393-404` | `#getStateIcon` | `switch (state) { case "active": return theme.fg("success", theme.status.enabled); case "disabled": … case "shadowed": … }` | **không đổi** nếu bạn chọn phương án `trustState?` ở trên |
| `packages/tui/src/overlays/extensions/inspector-panel.ts:471-482` | `#pushRuntime` | `if (ext.state !== "active") { lines.push(\`  ${this.#getStatusBadge(…)}\`); }` | thêm dòng badge trust cho hook — đây là chỗ **duy nhất người dùng thấy tên trạng thái bằng chữ**, `#getStateIcon` chỉ trả icon |
| `packages/coding-agent/src/modes/components/extensions/state-manager.ts:231-258` | vòng lặc load hooks | `const id = makeExtensionId("hook", \`${hook.type}:${hook.tool}:${hook.name}\`);`<br>`const { state, disabledReason } = resolveState(…);`<br>`extensions.push({ id, kind: "hook", name: hook.name, displayName: hook.name, description: \`${hook.type}-${hook.tool}\`, trigger: \`${hook.type}:${hook.tool}\`, path: hook.path, source: sourceFromMeta(hook._source), state, disabledReason, raw: hook });` | thêm `trustState: resolveHookTrust(hook, cfgHookState.get(settings))` vào object literal |

Nếu bạn **vẫn** muốn đúng chữ nghĩa "overlay sửa hook" của đặc tả: file đó là `packages/tui/src/overlays/hook-selector.ts` (639 dòng), nhưng đó cũng **không phải bảng** — nó là selector trượt dùng cho ask/confirm, và test của nó là `packages/tui/test/hook-selector-overflow.test.ts` + `hook-selector-slider.test.ts`. **Cả hai file trong đặc tả đều sai; chỉ `extension-list.ts` mới là bảng.**

### 2.4 `packages/coding-agent/src/config/settings.ts` — SAI FILE cho `HookStateToml`

Đặc tả bảo thêm `HookStateToml { enabled?; trustedHash? }` vào `config/settings.ts` và đọc qua `SettingProvenance` sáu lớp.

| claim | đo | kết luận |
| --- | --- | --- |
| `SettingProvenance` sáu lớp | `settings.ts:62` — `export type SettingProvenance = "env" \| "runtime" \| "overlay" \| "project" \| "global" \| "default";` | **đúng sẵn, 6 giá trị** |
| đọc qua nó | `settings.ts:800-809` — `getProvenance(setting: AnySetting)` đọc `this.#overrides` / `#configOverlay` / `#project` / `#global` theo `setting.segments` | **đúng**, nhưng nó trả provenance của **cả bản ghi setting**, không phải của từng entry trong bản ghi |
| `HookStateToml` khai ở `settings.ts` | file này 3798 dòng, là **lớp `Settings`** — merge layer, đọc/ghi, warn-once. Nó **không** khai bất kỳ setting nào | **sai chỗ** |

Setting ở omp được khai bằng `register()` trong **module domain**, rồi gom ở `config/all-settings.ts`. Mẫu cho đúng thứ bạn cần — một bản ghi per-item — đã có sẵn:

| path | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/settings.ts:12` | `cfgDisabledExtensions` (hàng khai sẵn) | `export const cfgDisabledExtensions = register({ id: "disabledExtensions", type: "array", default: EMPTY_STRING_ARRAY });` | thêm ngay dưới đây:<br>`export const cfgHookState = register({`<br>`	id: "hooks.state",`<br>`	type: "record",`<br>`	default: EMPTY_HOOK_STATE_RECORD,`<br>`});` |
| `packages/coding-agent/src/edit/settings.ts:52-57` | `cfgEditModelVariants` — **mẫu per-item record để copy** | `/** Per-model edit variant: model-selector substring (case-insensitive) → edit mode. Config-file only. */`<br>`export const cfgEditModelVariants = register({`<br>`	id: "edit.modelVariants",`<br>`	type: "record",`<br>`	default: EMPTY_STRING_RECORD,`<br>`});` | copy nguyên hình dạng này, đổi `T` thành `HookStateToml` |
| `packages/coding-agent/src/config/registry.ts:162-166` | `RecordDefinition` | `export interface RecordDefinition<T = unknown> extends DefinitionBase {`<br>`	type: "record";`<br>`	default: Readonly<Record<string, T>>;`<br>`	env?: SettingEnv<Readonly<Record<string, T>>>;`<br>`	ui?: UiBase;`<br>`}` | **không đổi** — `type: "record"` đã được hỗ trợ và đã dùng ở 8 chỗ |
| `packages/coding-agent/src/config/registry.ts:786-792` | `register` | `export function register<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]> {`<br>`	if (byId.has(definition.id)) throw new Error(\`Setting "${definition.id}" is registered twice\`);` | **không đổi** — nhớ: id trùng là throw ngay lúc import |

`extensibility/settings.ts` **đã** nằm trong `DOMAINS` của `config/all-settings.ts:66` (import ở dòng 27), nên không cần sửa file all-settings.

### 2.5 CỔNG CHẶN — chưa có trong đặc tả

| path | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/hooks/loader.ts:220-242` | `discoverAndLoadHooks` | `export async function discoverAndLoadHooks(configuredPaths: string[], cwd: string): Promise<LoadHooksResult> {`<br>`	const allPaths: string[] = [];`<br>`	const seen = new Set<string>();`<br>`… <br>`	const discovered = await loadCapability<Hook>(hookCapability.id, { cwd });`<br>`	addPaths(discovered.items.map(hook => hook.path));`<br>`	addPaths(configuredPaths.map(p => resolvePath(p, cwd)));`<br>`	return loadHooks(allPaths, cwd);`<br>`}` | đây là chỗ đúng để lọc — nhưng **xem §6.1**: hàm này không có call site production |
| `packages/coding-agent/src/extensibility/hooks/loader.ts:191-209` | `loadHooks` | `export async function loadHooks(paths: string[], cwd: string): Promise<LoadHooksResult> {`<br>`	const hooks: LoadedHook[] = [];`<br>`	const errors: Array<{ path: string; error: string }> = [];`<br>`	for (const hookPath of paths) {`<br>`		const { hook, error } = await loadHook(hookPath, cwd);`<br>`		if (error) { errors.push({ path: hookPath, error }); continue; }`<br>`		if (hook) { hooks.push(hook); }`<br>`	}` | nơi duy nhất một `continue` **thật sự chặn** việc nạp. Đây là chỗ đúng để chặn, và nó đã có sẵn hình dạng "bỏ qua + gom lý do" |
| `packages/coding-agent/src/discovery/builtin.ts:679-727` | `loadHooks` (discovery) | `items.push({ name: entry.name, path: hookPath, type: hookType, tool, level, _source: createSourceMeta(PROVIDER_ID, hookPath, level) });` | **đường discovery thật** — đây là chỗ duy nhất trên HEAD mà hook thật sự được tạo ra để hiện lên bảng |

### 2.6 Hai file test trong bảng "File cần chạm tới"

| path | tồn tại? | nội dung thật | baseline đo |
| --- | --- | --- | --- |
| `packages/coding-agent/test/hook-editor.test.ts` | **có**, 20 KB | 28 test, **toàn bộ** về soạn text: Enter/Ctrl+Q/bracketed paste/Escape/Ctrl+G/prompt-style gutter. **Không test nào về hook list hay trust.** | `bun test test/hook-editor.test.ts` → **28 pass, 0 fail** |
| `packages/coding-agent/test/extension-context-project-trust.test.ts` | **có**, 457 B | 1 test: `expect(runner.createContext().isProjectTrusted()).toBe(true);` | `bun test test/extension-context-project-trust.test.ts` → **1 pass, 0 fail** |
| `packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts` | **có**, 1.1 KB | 2 test, cả hai cũng khẳng định `isProjectTrusted()` là function và trả `true` | **ĐẶC TẢ KHÔNG NHẮC TỚI** — phải xanh cùng hai file kia |

### 2.7 Codex — tham chiếu cơ chế, đã đo từng dòng

| claim của đặc tả | đo | kết luận |
| --- | --- | --- |
| `codex-rs/hooks/src/engine/discovery.rs` dài **1.741 dòng** | `wc -l` → `1741` | **đúng tuyệt đối** |
| enum Rust tên `HookTrustStatus` | `codex-rs/app-server-protocol/src/protocol/v2/hook.rs:62-64` — `pub enum HookTrustStatus from CoreHookTrustStatus {`<br>`	Managed, Untrusted, Trusted, Modified`<br>`}` | **đúng**. Bốn biến thể khớp 1-1 với `untrusted\|trusted\|modified\|admin` của đặc tả (codex gọi thứ tư là `Managed`, đặc tả đổi tên thành `admin` — đây là điểm *đừng chép tên* mà đặc tả nhấn, và nó đúng) |
| codex dùng "chuỗi **bốn** thành phần" làm khoá | `codex-rs/hooks/src/lib.rs:113-123` — `format!("{key_source}:{}:{group_index}:{handler_index}", hook_event_key_label(event_name))` | **đúng** — 4 thành phần. Đừng chép; dùng 3 thành phần ở `capability/hook.ts:31` |
| `HookStateToml { enabled?; trustedHash? }` | `codex-rs/config/src/hook_config.rs:28-33` — `pub struct HookStateToml {`<br>`	#[serde(default, skip_serializing_if = "Option::is_none")]`<br>`	pub enabled: Option<bool>,`<br>`	#[serde(default, skip_serializing_if = "Option::is_none")]`<br>`	pub trusted_hash: Option<String>,`<br>`}` | **đúng tuyệt đối** — cùng hình dạng |
| cơ chế lõi | `discovery.rs:794-809` — `fn hook_trust_status(is_managed, is_builtin, current_hash, trusted_hash) -> HookTrustStatus { if is_builtin { Trusted } else if is_managed { Managed } else { match trusted_hash { Some(h) if h == current_hash => Trusted, Some(_) => Modified, None => Untrusted } } }` | đây là **"vài chước dòng"** mà đặc tả mô tả. Đọc nó để hiểu cơ chế, đừng chép |
| cổng chặn | `discovery.rs:713-719` — `if enabled && (source.bypass_hook_trust \|\| matches!(trust_status, HookTrustStatus::Managed \| HookTrustStatus::Trusted)) { handlers.push(…) }` | đây là hình dạnh cổng. Chú ý: `untrusted` **và** `modified` đều không vào `handlers` |
| `enabled` và trust là **hai** thứ tách biệt | `discovery.rs:811-813` — `fn hook_enabled(is_managed, is_builtin, state) -> bool { is_builtin \|\| is_managed \|\| state.and_then(\|s\| s.enabled) != Some(false) }` | `enabled` không nằm trong `HookTrustStatus`. Đừng gộp chúng thành một enum |
| hash | `discovery.rs:775-790` — `fn hook_hash(event_name, matcher, group, normalized_handler)` serialize `NormalizedHookIdentity` ra TOML rồi hash | codex hash **cấu hình hook**, không phải nội dung script. Bước 3 của đặc tả chủ động lệch khỏi đây — xem §6.4 |

---

## 3. Các bước, mỗi bước có neo đã kiểm

> Bước 1-5 là của đặc tả, giữ nguyên ý. Bước 6-9 là bước **bổ sung** — đặc tả không có chúng, nhưng thiếu chúng thì cổng (2) không bao giờ đỏ.

1. **Khai union bốn trạng thái.** Đặt cạnh `HookEvent` trong `packages/coding-agent/src/extensibility/hooks/types.ts`, ngay sau dòng 408 (`| ToolResultEvent;`) hoặc ngay trước docblock ở 390. *(neo: `extensibility/hooks/types.ts:390-408` — đã mở, đọc, xác nhận `HookEvent` là union 15 nhánh ở 393-408)*

2. **Lấy khoá ổn định từ chỗ đã có.** `packages/coding-agent/src/capability/hook.ts:31` — `key: hook => \`${hook.type}:${hook.tool}:${hook.name}\`,`. Đọc, không sửa. **Và** phải khớp với bản chép thứ hai ở `packages/coding-agent/src/modes/components/extensions/state-manager.ts:235`. *(hai neo đều đã mở, đọc, đều khớp nguyên văn)*

3. **Định nghĩa `currentHash`.** Hash của **(đường dẫn + nội dung script)**. KHÔNG hash matcher. *(đặc tả ghi "Hash của `(type, tool, name, path)`" ở câu đầu rồi "chỉ cần hash đường dẫn + nội dung script" ở câu sau — **hai tuple khác nhau trong cùng một bước**; xem §6.4. Neo tham chiếu đối chiếu: `codex-rs/hooks/src/engine/discovery.rs:775-790`.)*

4. **Lưu trạng thái cạnh config — nhưng ở `extensibility/settings.ts`, không phải `config/settings.ts`.** `register({ id: "hooks.state", type: "record", default: EMPTY_HOOK_STATE_RECORD })`, copy hình dạng `cfgEditModelVariants`. *(neo: `config/registry.ts:162-166` `RecordDefinition`, và `edit/settings.ts:52-57` mẫu thật — cả hai đã mở, đọc. `config/settings.ts:62` `SettingProvenance` và `:800-809` `getProvenance` đã mở, đọc, xác nhận 6 lớp. `extensibility/settings.ts` đã mở, đọc toàn bộ.)*

5. **Thêm cột/badge trạng thái vào bảng Extension Control Center đã có sẵn — `packages/tui/src/overlays/extensions/extension-list.ts`, KHÔNG phải `hook-editor.ts`.** Icon ở `#renderExtensionRow:307-327`, chữ ở `inspector-panel.ts:471-482`. **Không dựng overlay mới** (điều này đặc tả nói đúng; chỉ sai tên file). *(cả hai neo đã mở, đọc)*

6. **BỔ SUNG — nối `trustState` từ config tới bảng.** Ở `state-manager.ts:231-258`, sau khi `resolveState(...)`, tính `trustState` từ `cfgHookState.get(settings)` và đặt vào object literal. Không có bước này thì bước 5 hiển thị `undefined` vĩnh viễn. *(neo đã mở, đọc)*

7. **BỔ SUNG — cài cái chặn.** Ở `extensibility/hooks/loader.ts:191-209`, `loadHooks` đã có sẵn hình dạng `continue` + gom lý do. Đây là chỗ duy nhất trên cây nơi "không nạp" là hành vi thật. **Nhưng đọc §6.1 trước** — hàm này chưa có call site production.

8. **BỔ SUNG — viết một test đỏ trước, chưa đụng source.** Xem §5.

9. **BỔ SUNG — cập nhật hai chú thích thừa nhận.** `extensibility/extensions/types.ts:490-494` và `:551-563`. **Sửa câu chữ, KHÔNG sửa `isProjectTrusted()`** — nó phải tiếp tục là `() => true` ở `runner.ts:1293` và `agent-session.ts:7552`. *(tất cả bốn neo đã mở, đọc)*

---

## 4. Hợp đồng test

**Hợp đồng quan sát được, viết bằng kết quả:** một hook đã được duyệt rồi bị sửa file thì trạng thái của nó **chuyển sang `modified`** và nó **không còn nạp** — thay vì tiếp tục chạy y hệt mà không có tín hiệu nào.

**Người dùng thấy gì nếu hồi quy:** họ duyệt một hook một lần, sửa file hook đó (thêm một lệnh, đổi một URL), và **không bao giờ được báo gì** — hook sửa vẫn chạy, mỗi tool call vẫn qua nó, và cách duy nhất phát hiện là đọc log của một tiến trình mà không có gì trong đó. Bảng Extension Control Center vẫn hiện trạng thái `active` như hôm nay.

### 4.1 File test MỚI (đặc tả không có)

`packages/coding-agent/test/hook-trust-state.test.ts`

Ba case, mỗi case một nhánh khác nhau của bốn trạng thái:

| case | dựng | khẳng định |
| --- | --- | --- |
| **1. `untrusted` chặn âm thầm** | fixture hook ở `<tmp>/.omp/hooks/pre/`, chưa từng duyệt | `loadHooks` **không** trả hook trong `hooks[]`; `errors[]` có một mục nói lý do. Đây là case GAP-D3 (a) — chặn không hỏi |
| **2. `modified` chặn** | duyệt hook (ghim `trustedHash`), rồi **ghi lại file script** (đổi nội dung), nạp lại | trạng thái là `modified`, hook không nạp. Đây là case hồi quy cốt lõi — dựng fixture đúng, xác nhận nó **ĐỎ** vì callback vẫn được leo, rồi mới viết bản sửa |
| **3. NHÁNH PHỦ ĐỊNH — `trusted` vẫn nạp** | duyệt hook, **không** sửa file, nạp lại | hook **có** trong `hooks[]`, `errors[]` rỗng. Đây là case cổng (2) thật sự dựng lại được |

Ba case này **là** cổng (2) của đặc tả. Không có chúng, "nhánh phủ định" là một câu không kiểm được.

### 4.2 Hai (ba) file test sẵn có

Cả ba phải **giữ xanh**, và lý do phải nêu trong PR nếu có bất kỳ cái nào xanh *không phải vì lý do dưới đây*:

- `test/hook-editor.test.ts` (28 test) — **không có lý do hợp lệ để chuyển đỏ**. Nó test `HookEditorComponent`, một hộp thoại soạn text; thêm badge trust vào `extension-list.ts` không chạm nó. Nếu nó đỏ, bạn đã sửa nhầm file.
- `test/extension-context-project-trust.test.ts` (1 test) — phải xanh vì WI-14 giữ `isProjectTrusted() === true`.
- `test/issue-7955-extension-project-trusted.test.ts` (2 test) — **thứ ba, đặc tả không nhắc**. Cùng lý do.

Baseline đã đo ở HEAD: lần lượt **28 pass / 0 fail** và **1 pass / 0 fail**.

---

## 5. Cổng

Bốn phần như đặc tả, cộng một phần thứ năm. **Ba phần đầu không đỏ được vì lý do đặc tả nêu; phần thứ năm là phần thay thế.**

### (1) TYPE — **ĐỎ ĐƯỢC, và baseline hiện tại là XANH**

```bash
bun run check:ts
```

Đo tại HEAD: **exit 0**, `oxfmt` xanh trên 5445 file, 16/16 package `check:types` Done, một `oxlint` *warning* duy nhất ở file untracked của work stream khác (`mcp-project-config-not-trusted-by-default.test.ts:19:10`, `no-unused-vars`) — warning không làm đỏ.

Nó đỏ được vì `check:ts` = `oxlint . && oxfmt --check <globs> && bun run --filter './packages/*' --sequential --if-present check:types` (`package.json:90-91`, mỗi package dùng `tsgo -p tsconfig.json --noEmit`, ví dụ `packages/coding-agent/package.json:523`). Cụ thể nó bắt được: union sai chính tả; `RecordDefinition<T>` dùng sai kiểu; id setting trùng (`register()` **throw lúc import**); và **một trượt format** — `oxfmt` quét cả `packages/*/src/**` lẫn `packages/*/{test,bench,examples,scripts}/**`, nên file test mới viết tay mà không format là đỏ.

Câu trả lời cụ thể: **đỏ được, bằng `tsgo` khi bạn khai union/record sai, và bằng `oxfmt --check` khi bạn viết file mới mà không format.** Đừng chạy `tsc` — AGENTS.md cấm, và script ở đây là `tsgo`.

### (2) NHÁNH PHỦ ĐỊNH — **KHÔNG ĐỎ ĐƯỢC. Đây là cổng luôn xanh.**

Nó nói *"dưới ngưỡng chặn, mọi thứ phải y hệt hôm nay"* nhưng **không đưa ra lệnh nào**. `check:ts` là cổng biên dịch — nó không quan sát hành vi nạp hook lúc chạy. Và tệ hơn: **không bước nào trong 5 bước của đặc tả cài đặt cái cổng chặn**, nên không có gì để hồi quy. Cổng này sẽ xanh ngay cả khi bạn viết union + cột hiển thị rồi dừng lại, không chặn gì cả.

Một cổng luôn xanh tệ hơn không có cổng, vì nó tạo cảm giác an toàn giả. **Viết lại:**

```bash
# (2′) NHÁNH PHỦ ĐỊNH, dựng lại được
cd packages/coding-agent && bun test test/hook-trust-state.test.ts
```

Case 3 của §4.1 là nội dung của cổng này. Nó đỏ được: bằng cách sửa `hook_hash` thành trả một hằng, hoặc bỏ nhánh `Some(_) => Modified`, hoặc đảo điều kiện ở `loadHooks` — cả ba đều làm case 2 (modified) hoặc case 1 (untrusted) đỏ. Nó **không** đỏ được nếu bạn chỉ thêm union và cột hiển thị mà không động tới `loader.ts` — và đó chính là lý do nó phải là một lệnh test chạy được, không phải một mô tả.

### (3) HAI TEST SẴN CÓ — **ĐỎ ĐƯỢC về mặt cơ học, nhưng không đỏ được vì lý do đặc tả nêu**

```bash
cd packages/coding-agent && bun test test/hook-editor.test.ts \
  test/extension-context-project-trust.test.ts \
  test/issue-7955-extension-project-trusted.test.ts
```

Đỏ được: đổi `isProjectTrusted: () => true` thành `() => false` ở `runner.ts:1293` → cả ba file đỏ ngay. Đo baseline: **28 pass / 0 fail** và **1 pass / 0 fail**.

Nhưng tiền đề của đặc tả sai. Nó nói hai file này *"được trích dẫn như hợp đồng-bằng-quan-sát"* và *"được phép chuyển đỏ nếu chúng đang khẳng định hành vi cũ"*. Đo: `hook-editor.test.ts` có 28 test và **không test nào** chạm hook list hay trust — chúng toàn trên Enter / paste / Escape của hộp thoại text. Thêm badge vào `extension-list.ts` **không thể** làm nó đỏ. Còn `extension-context-project-trust.test.ts` khẳng định đúng thứ WI-14 giữ nguyên. Nên cổng này sẽ xanh vì lý do không liên quan tới việc gì.

**Sửa thành:** đổi nó từ "cho phép chuyển đỏ" thành **"ba file này phải xanh, và xanh *vì* `isProjectTrusted()` vẫn là `() => true`"** — kèm test thứ ba mà đặc tả bỏ sót. Rủi ro thật cần bảo vệ ở đây là *bạn sửa `isProjectTrusted()` cho khớp với tên "trust"* — và ba file này bắt được đúng điều đó. Chúng là cổng chống-sửa-nhầm, không phải cổng hợp đồng-tin-cậy.

### (4) GIỮ NGUYÊN CHỨC NĂNG SỬA HOOK — **ĐỎ ĐƯỢC, nhưng đang bảo vệ sai thứ**

Cùng lệnh ở (3). Nhưng nó bảo vệ `HookEditorComponent` — hộp thoại soạn text — chứ không phải chức năng sửa hook. Đặc tả tự thừa nhận đây là lần đầu omp có đường nạp bị chặn nên mất chức năng là hồi quy. Đúng ý, **sai đối tượng**: chức năng sửa hook sống ở `extension-list.ts` + `inspector-panel.ts`, và chúng được bảo vệ bởi:

```bash
cd packages/tui && bun test test/extension-inspector.test.ts \
  test/extension-dashboard-state.test.ts \
  test/extension-list-mouse.test.ts
```

Ba file này **không có trong đặc tả** và là nơi hồi quy thật sự sẽ xuất hiện. Thêm chúng vào cổng.

### (5) CỔNG VIẾT LẠI — một câu, đủ để thay cả (2) và (3)

```bash
bun run check:ts && \
cd packages/coding-agent && bun test test/hook-trust-state.test.ts && \
  bun test test/hook-editor.test.ts test/extension-context-project-trust.test.ts \
          test/issue-7955-extension-project-trusted.test.ts && \
cd ../tui && bun test test/extension-inspector.test.ts \
  test/extension-dashboard-state.test.ts test/extension-list-mouse.test.ts
```

Đỏ được khi: union sai kiểu (tsgo); file mới không format (oxfmt); hash sai hoặc thiếu nhánh `Modified` (case 2); nạp `untrusted` vẫn chạy (case 1); `trusted` bị chặn nhầm (case 3); `isProjectTrusted()` bị đổi (ba file trust); badge làm vỡ inspector/list (ba file tui).

`gate_can_fail: true` của đặc tả **giữ nguyên** — nhưng nó chỉ đúng sau khi cổng (2) được thay bằng lệnh ở (2′) và ba file `tui` được thêm vào. Ở dạng gốc, cổng (2) là cổng luôn xanh.

---

## 6. Cạm bẫy riêng của work item này

### 6.1 Cái bẫy lớn nhất: "đường nạp hook bị chặn" chưa tồn tại ở HEAD

Đo lại, không suy đoán:

- `discoverAndLoadHooks` (`extensibility/hooks/loader.ts:220`) — `grep -rn "discoverAndLoadHooks" packages/ | grep -v node_modules` trả về **đúng một dòng: chính dòng định nghĩa của nó**. Không call site nào, kể cả test.
- `new HookRunner(...)` — `grep -rn "HookRunner(" packages/coding-agent/src/` không có kết quả nào trong `src/`. Chỉ có trong test (`compaction-hooks.test.ts:110`, `hook-tool-wrapper-input.test.ts:47`).
- `src/index.ts` (barrel công khai) **không** re-export `./extensibility/hooks`. Nó chỉ có `custom-commands`, `custom-tools`, `extensions`, `skills`, `slash-commands`, `settings`.
- Các import production duy nhất của `extensibility/hooks/*` đều là **type-only**: `HookUIContext` (`custom-tools/types.ts:28`, `custom-tools/loader.ts:16`), `HookCommandContext` (`custom-commands/types.ts:12`).

Nghĩa là: ở HEAD này, phần runtime của hệ hook (`loadHooks` / `discoverAndLoadHooks` / `HookRunner` / `HookToolWrapper`) **chỉ được test gọi**. Cái thật sự chạy trong app là **đường khác**: `hookCapability` discovery (`capability/hook.ts:27` → `discovery/builtin.ts:679-727` và 4 provider nữa) đẩy `Hook` vào `loadCapability<Hook>("hooks", …)`, rồi `state-manager.ts:233` dựng hàng cho bảng Extension Control Center.

**Vì sao dễ sai nhất:** nó nghe hợp lý tuyệt đối. "Chặn đường nạp hook" → tìm hàm nạp hook → thấy `discoverAndLoadHooks` → sửa nó. Bạn sẽ thêm cả enum, cả hash, cả cổng chặn, cả test xanh, và **không một dòng nào thay đổi hành vi của omp** — vì hàm đó không ai gọi. Tệ hơn, bạn sẽ kết luận "trust state đã có" và đóng WI-14.

Trước khi gõ bước chặn (bước 7), bạn phải trả lời bằng lệnh thật: **hook nào thật sự được omp nạp và thật sự chạy ở HEAD này?** Nếu câu trả lời là "không cái nào, ngoài test", thì WI-14 phải được **thu hẹp lại thành state + cột hiển thị** (và nói thẳng trong PR rằng chưa có đường nạp để chặn), hoặc phải kéo việc nối call site vào scope. Đừng âm thầm coi đây là chi tiết.

### 6.2 Sửa nhầm file: `hook-editor.ts` không phải bảng

Đã nêu ở §0 và §2.3. Nói thêm về **vì sao nó dễ sai**: tên file rất hợp lý (`hook-editor.ts`, đúng 277 dòng khớp con số đặc tả), và `hook-selector.ts` bên cạnh cũng nghe như bảng. Cả hai đều là **hộp thoại tương tác**, không phải danh sách. Bảng là `packages/tui/src/overlays/extensions/extension-list.ts` (667 dòng). Con số 277 trùng khớp là **cái bẫy tệ nhất** — nó khiến bạn tin phần còn lại của câu.

### 6.3 `HookTrustState` là bản ghi theo hook, không phải setting vô hướng

`SettingProvenance` (`settings.ts:62`) và `getProvenance` (`settings.ts:800-809`) làm việc trên `setting.segments` — một **đường dẫn**. `HookStateToml` là **bản ghi, khoá theo từng hook**. Nên `getProvenance(cfgHookState)` trả *"lớp nào cung cấp cả bảng `hooks.state`"*, không phải *"lớp nào cung cấp `trustedHash` của hook này"*. Đó là điều đặc tả cần và cũng là ranh giới nó phải nói rõ, vì nếu không, người đọc sẽ tưởng có thể hỏi provenance theo từng hook — và sẽ đi mở một đường sự thật thứ hai, đúng thứ đặc tả cấm.

Cách thoát đúng: hỏi provenance của **cả bảng** một lần, rồi bên trong tự phân giải 6 lớp theo thứ tự merge mà `getProvenance` đã mã hoá. Đừng gọi `getProvenance` 6 lần với 6 đường dẫn tự chế.

### 6.4 Bước 3 tự mâu thuẫn với chính nó, và lệch khỏi codex theo hướng đúng — nhưng phải nói ra

Đặc tả viết: *"Hash của `(type, tool, name, path)`. Chỉ cần hash **đường dẫn + nội dung script**"*. Đây là **hai tuple khác nhau** — cái đầu bốn thành phần, cái sau hai. Chọn cái sau (đường dẫn + nội dung), vì nó mới là cái phát hiện được việc **người dùng sửa file**, và `tool`/`name`/`type` đã nằm trong khoá ổn định ở `capability/hook.ts:31` rồi.

Đây cũng là chỗ lệch có chủ đích so với codex: `discovery.rs:775-790` hash **cấu hình hook** (serialize `NormalizedHookIdentity` ra TOML), không phải nội dung script. Chép codex sẽ cho bạn trust state **không bao giờ** chuyển sang `modified` khi người dùng sửa file — tức là đúng cái lỗ hổng mà cả mục này sinh ra để vá. Ghi chú này vào PR, vì một người đọc diff sau này sẽ thấy bạn *"bỏ sót* `matcher` và `group`" mà không có lý do.

### 6.5 `enabled` và trust là hai thứ tách biệt — đừng gộp

Codex giữ chúng riêng: `hook_enabled` (`discovery.rs:811-813`) đọc `state.enabled`, còn `hook_trust_status` (`discovery.rs:794-809`) đọc `trusted_hash`. Nếu bạn gộp `enabled: false` vào `untrusted`, bạn vừa phá một khả năng có sẵn vừa làm `HookStateToml.enabled` trở thành dead field — vì omp **không có** `disabledHooks`/`enabledHooks` nào cả (`grep -rn "disabledHooks\|enabledHooks\|hooksEnabled" packages/` → rỗng). Cơ chế duy nhất tắt hook hôm nay là `disabledExtensions` qua `state-manager.ts:236`.

### 6.6 `admin` không có nguồn ở omp

Codex sinh `Managed` từ `is_managed` — một **tầng config do quản trị quản lý**. omp không có tầng đó: `Hook.level` (`capability/hook.ts:22`) chỉ có `"user" | "project"`. Bạn sẽ phải **định nghĩa** `admin` là gì — "hook ở `~/.omp/hooks/`"? "hook do người quản trị đặt"? — và câu trả lời thay đổi hành vi chặn (codex cho `Managed` đi thẳng qua cổng ở `discovery.rs:717`). **Đừng để `admin` là một nhánh trả về `true` mà không ai nghĩ tới** — đó là một trạng thái không ai kiểm được, tệ hơn không có.

### 6.7 Ba chỗ chép chuỗi khoá — sửa một, để lệch hai

Đo được ba bản chuỗi `${type}:${tool}:${name}`:

| vị trí | hình dạng |
| --- | --- |
| `capability/hook.ts:31` | `key: hook => \`${hook.type}:${hook.tool}:${hook.name}\`,` |
| `capability/hook.ts:32` | `toExtensionId: hook => \`hook:${hook.type}:${hook.tool}:${hook.name}\`,` |
| `modes/components/extensions/state-manager.ts:235` | `const id = makeExtensionId("hook", \`${hook.type}:${hook.tool}:${hook.name}\`);` |

Đặc tả bảo "lấy khoá ổn định từ chỗ đã có" và chỉ trỏ `:31`. Bản ở `state-manager.ts:235` là bản **quyết định `id` của hàng trong bảng** — hàng bạn sẽ gắn badge. Hai bản phải khớp, và không có gì buộc chúng khớp ở biên dịch. Đây chính xác là loại "sửa một, để lệch hai" mà đặc tả cảnh báo ở mục khác.

### 6.8 Sửa hai test sẽ xanh là xoá bằng chứng

Đặc tả đã nêu đúng và tôi xác nhận nó là cạm bẫy thứ ba: *"sửa hai test sẵn có cho xanh khi chúng chuyển đỏ"*. Ở đây nó còn nguy hiểm hơn vì **chúng sẽ không chuyển đỏ đúng lý do** (xem §5(3)) — nên sẽ có áp lực tinh thần coi chúng là "nhiễu" và dọn. Không dọn. Chúng xanh là bằng chứng `isProjectTrusted()` chưa bị đụng. Nếu bạn phải sửa chúng để xanh, hãy dừng lại và tìm xem mình đã đổi `runner.ts:1293` không.

---

## 7. Bảng đối chiếu nhanh: đặc tả ↔ cây thật

| neo / claim trong đặc tả | vị trí thật | kết luận |
| --- | --- | --- |
| `capability/hook.ts:31` | đúng dòng đúng chữ | ✅ |
| `types.ts:490-494` ("OMP performs no project-trust gating") | đúng 5 dòng văn xuôi của chú thích | ✅ |
| `types.ts:552-563` | văn xuôi thật là **551-561**, block kèm `/**`…`*/` là 550-562, chữ ký ở 563 | ⚠️ lệch −1 ở đầu, dư ở cuối |
| đính chính: dùng neo WI-0 `:487-494` | 487 là chú thích của member **trước** (`agent: ExtensionAgentIdentity`) | ❌ tệ hơn neo gốc |
| đính chính: dùng neo WI-0 `:548-561` | 548 là `): Promise<AgentToolResult<TDetails>>;` — chữ ký member trước | ❌ tệ hơn neo gốc |
| `runner.ts:1293` (từ ghi chú m2 ở dòng 5403) | `isProjectTrusted: () => true,` | ✅ |
| `agent-session.ts:7552` (từ ghi chú m2) | `isProjectTrusted: () => true,` | ✅ |
| đính chính: `runner.ts:1264` | dòng trong docblock về native built-in | ❌ không liên quan |
| đính chính: `agent-session.ts:7406` | dòng trong comment về `/skill:<name>` | ❌ không liên quan |
| `hook-editor.ts` dài 277 dòng | `wc -l` → 277 | ✅ con số |
| `hook-editor.ts` là overlay sửa hook có bảng + cột `enabled` | là `HookEditorComponent`, hộp thoại soạn text; không bảng, không `enabled` | ❌ sai nội dung |
| `SettingProvenance` sáu lớp | `settings.ts:62`, đúng 6 giá trị | ✅ |
| khai `HookStateToml` trong `config/settings.ts` | `config/settings.ts` không khai setting nào; khai ở domain + `register()` | ❌ sai file |
| `contentHash` chỉ trúng `blob-broker/provider-file-types.ts` | 6 file production (`blob-broker/provider-file-types.ts`, `provider-files.ts`, `service.ts`, `cli/images-cli.ts`, `ida/store.ts`, `tui/plan-review-overlay.ts`) + 4 file test. **`trustState`: 0 hit** | ❌ claim sai; phần quan trọng (`trustState` = 0) thì đúng |
| `approvedHooks\|hookApproval\|consentPrompt` chỉ một tên ở cursor-proto | 4 hit, **đều** ở `cursor-proto.ts`, tất cả tên `hookApprovalRequirement`; `approvedHooks` = 0, `consentPrompt` = 0 | ⚠️ đúng file, sai số |
| `codex-rs/hooks/src/engine/discovery.rs` dài 1.741 | 1741 | ✅ |
| hai file test sẵn có | đều tồn tại, đều xanh (28 pass / 1 pass) | ✅ — nhưng có **test thứ ba** không ai nhắc |
| — | `discoverAndLoadHooks` không có call site; `HookRunner` không được dựng trong `src/`; `src/index.ts` không re-export `extensibility/hooks` | ❌ **khoảng trống lớn nhất** |
