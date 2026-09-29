# PHIẾU TRIỂN KHAI — WI-8b

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_2_EXECUTION_PLAN.md` (mục `## WI-8b.` ở dòng 3242)
**HEAD khi viết phiếu:** `65cc6c1` (tài liệu ghi `808b365` — đã trôi, xem "Sai lệch đã phát hiện" mục 7)
**Ngày kiểm:** 2026-09-29, đọc từng dòng bằng `sed -n`/`awk`, không đoán số dòng.

---

## 1. Cái gì thay đổi, quan sát được

Một extension bên thứ ba gọi `pi.registerSetting({ id: "extension.<slug>.<key>", … })` trong factory của nó thì key đó đăng ký vào **cùng một registry** với key lõi — đọc được qua typed handle, `provenance(scope)` báo đúng lớp thắng trong cả sáu lớp (kể cả `"env"` nếu khai `definition.env`), hiện trong `orderedSettings()` sau khi cache được vô hiệu hoá, và **gỡ sạch được** khi extension bị gỡ nạp — vì hôm nay `byId`/`ordered` ở `registry.ts:778-779` chỉ nối thêm và không có đường gỡ nào, nên lần bật thứ hai trong cùng một process ném `Setting "X" is registered twice` và key thành vĩnh viễn không với tới được.

---

## 2. Bảng điểm sửa

Cột "TRƯỚC" trích nguyên văn từ file thật tại HEAD `65cc6c1`.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `src/config/registry.ts:778-779` | `byId` / `ordered` | `const byId = new Map<string, AnySetting>();`<br>`const ordered: AnySetting[] = [];` | giữ nguyên 2 dòng, **thêm** ngay dưới:<br>`const ownerById = new Map<string, string>();`<br>`const idsByOwner = new Map<string, Set<string>>();`<br>export `const EXTENSION_ID_PREFIX = "extension.";` |
| `src/config/registry.ts:786-792` | `register` | `if (byId.has(definition.id)) throw new Error(\`Setting "${definition.id}" is registered twice\`);` | thân chuyển sang hàm mới `registerOwned(owner, definition)`; throw mới nêu **cả id, cả owner hiện tại, cả quy tắc namespace**:<br>`Setting "${id}" is already registered by ${ownerById.get(id) ?? "core"}. Extension setting ids must start with "${EXTENSION_ID_PREFIX}" and be unique across extensions.`<br>`register` giữ **đúng chữ ký cũ** và ủy nhiệm `return registerOwned("core", definition);` |
| `src/config/registry.ts:795` | `lookup` | `export function lookup(id: string): AnySetting \| undefined {` | không đổi; **thêm cạnh nó** `export function ownedBy(owner: string): readonly string[]` và `export function ownerOf(id: string): string \| undefined` (xem cạm bẫy #1) |
| `src/config/registry.ts:800-802` | `all()` | `return ordered;` | không đổi. LƯU Ý: nó trả **mảng sống**, không trả bản sao — `unregisterOwned` splice thẳng vào nó |
| `src/config/registry.ts` (mới) | `unregisterOwned` | *(không tồn tại — `git grep -n unregister -- packages/coding-agent/src/config/` chỉ trả 7 hit, tất cả ở `model-registry.ts` cho provider/API/OAuth)* | `export function unregisterOwned(owner: string): string[]` — xoá id khỏi `byId`, `ownerById`, splice khỏi `ordered`, `idsByOwner.delete(owner)`, **trả về** `string[]` id đã gỡ; owner chưa đăng gý gì thì trả `[]` |
| `src/config/all-settings.ts:87` | `let ordered` | `let ordered: readonly AnySetting[] \| undefined;` | giữ nguyên; **thêm ngay dưới**:<br>`export function invalidateOrderedSettings(): void { ordered = undefined; }` |
| `src/config/all-settings.ts:90-125` | `orderedSettings` | `…const result: AnySetting[] = [];` … `ordered = result; return result;` | thêm **vòng nối thêm** ngay trước `ordered = result;`: duyệt `all()`, bỏ qua handle nào `seen` đã có, `result.push(handle)` — giữ nguyên `sequence`/`seen`/`placedBefore` |
| `src/config/all-settings.ts:44` | `DOMAINS` | `const DOMAINS: readonly Readonly<Record<string, unknown>>[] = [` … 34 entry … `];` | **không sửa** — nhưng `invalidateOrderedSettings()` phải được gọi từ **cả** đường add và đường remove của registry, không chỉ một |
| `src/config/settings-ui.ts:51-68` | `createSettingsHost` | `for (const tab of SETTING_TABS) { for (const setting of orderedSettings()) { const ui = setting.ui; if (ui?.tab !== tab) continue;` | **không sửa** trừ khi M2-OQ4 bắt buộc; đây là nguồn dữ liệu dòng test 3 khẳng định |
| `src/extensibility/extensions/types.ts:1277` | `interface ExtensionAPI` | `export interface ExtensionAPI {` (đóng ở **1607**, khai báo top-level kế tiếp `export interface ProviderConfig` ở **1614**) | thêm 1 method cạnh `registerFlag` (**1455**):<br>`registerSetting<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]>;`<br>29 method → 30 |
| `src/extensibility/extensions/types.ts:1827-1842` | `interface Extension` | `… commands: Map<string, RegisteredCommand>;`<br>`flags: Map<string, ExtensionFlag>;`<br>`shortcuts: Map<string, ExtensionShortcut>;` | thêm `readonly settingIds: string[];` vào object literal ở `createExtension` (`loader.ts:374-390`) — nếu quên, đây là lỗi type |
| `src/extensibility/extensions/loader.ts:179` | `class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime` | y hệt | thêm `registerSetting` là **prototype method** (không phải arrow-function class field — xem cạm bẫy #2) |
| `src/extensibility/extensions/loader.ts:277-289` | `registerComposerShape` (khuôn mẫu) | `if (id.length === 0 \|\| id !== id.trim()) { throw new TypeError("Composer shape id must be a non-empty trimmed string"); }` … `this.extension.composerShapes.set(id, definition);` | `registerSetting` copy đúng khuôn mẫu này: **validate → throw trước → mutate sau** |
| `src/extensibility/extensions/loader.ts` (mới) | `extensionSettingOwner(extension)` | *(không tồn tại)* | CHƯA CHỐT — xem "Cần người quyết" bên dưới. `Extension.path` là đường người gõ (không ổn định), `Extension.resolvedPath` chỉ ổn định trên đường file |
| `src/extensibility/extensions/loader.ts` (mới) | `releaseExtensionSettings(owner)` | *(không tồn tại)* | `export function releaseExtensionSettings(owner: string): string[]` — gọi `unregisterOwned`, nếu còn id thì `invalidateOrderedSettings()`, trả id đã gỡ. **Chỉ đưa helper vào, để WI-9 nối vào.** |
| `test/config/extension-registered-setting.test.ts` | *(file mới)* | `ls` → `No such file or directory` | tạo mới, 5 dòng (mục 4) |
| `CHANGELOG.md:3` | `## [Unreleased]` | `## [Unreleased]` rồi thẳng `### Security` — **chưa có `### Added`** | thêm mục `### Added` ngay dưới `## [Unreleased]` (đặt **trước** `### Security`, không sửa `### Security` đã có) |

### Symbol mới, đã grep xác nhận là **chưa tồn tại** ở bất kỳ đâu trong `packages/`:

```
registerOwned · unregisterOwned · ownedBy · ownerOf · EXTENSION_ID_PREFIX ·
isExtensionSettingId · invalidateOrderedSettings · releaseExtensionSettings
```

`git grep -nE 'registerOwned|EXTENSION_ID_PREFIX|isExtensionSettingId|unregisterOwned|invalidateOrderedSettings|releaseExtensionSettings' --include='*.ts' packages/` → **0 hit**.

---

## 3. Các bước, mỗi bước có neo đã kiểm

> Số dòng trong ngoặc là **số thật đã mở và đọc**. Khi tài liệu ghi khác, số trong ngoặc là số thật.

### Bước 0 — Đọc `WI-8a.spec.json` trước, rồi ghi lại 3 điểm nó đã chốt

`.lavish-wip/m2-specs/WI-8a.spec.json` (39 KB) có mặt. Ba điểm đã xác nhận đọc được trong file:

- namespace dành riêng: `plugins.<id>.<key>` (`one_line` của spec: *"under a reserved `plugins.<id>.<key>` namespace"*)
- quy tắc env: `OMP_<PLUGIN_ID>_<KEY>`, viết hoa, `-`/`.` → `_`, **khai tường minh** trong `SettingDefinition.env`, không bao giờ tự sinh (`steps[2].instruction`)
- `boundary_with_WI_8b`: spec của WI-8a nói rõ nó **không** được thêm gì vào `ExtensionAPI` — việc đó là của WI-8b

**Ghi lại bằng chữ trước khi code:** khối code trong tài liệu dùng `EXTENSION_ID_PREFIX = "extension."`, **lệch** với `plugins.` của WI-8a. Chọn cái nào cũng được, nhưng phải viết lý do vào commit, vì WI-9 sẽ quét cả hai không gian tên trong một bảng kiểm kê.

### Bước 1 — `registry.ts:778-779`: owner index

Mở `src/config/registry.ts:778-779` (đã kiểm):

```
778  const byId = new Map<string, AnySetting>();
779  const ordered: AnySetting[] = [];
```

Thêm `ownerById: Map<string, string>` và `idsByOwner: Map<string, Set<string>>` ngay dưới, cùng `EXTENSION_ID_PREFIX` và `isExtensionSettingId(id)`.

### Bước 2 — `registry.ts:786-792`: `registerOwned` + `register` ủy nhiệm

Mở `src/config/registry.ts:786-792` (đã kiểm):

```
786  export function register<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]> {
787  	if (byId.has(definition.id)) throw new Error(`Setting "${definition.id}" is registered twice`);
788  	const handle = new Setting<DefinitionValue<D>, D["id"]>(definition);
789  	byId.set(definition.id, handle as AnySetting);
790  	ordered.push(handle as AnySetting);
791  	return handle;
792  }
```

Chuyển thân sang `registerOwned(owner, definition)`. **Chữ ký `register` không đổi** — đã kiểm: `grep -rl "register({" packages/coding-agent/src --include="*.ts" | grep -v /test/ | grep -v "config/registry.ts" | wc -l` → **41 file**. (Con số 42 nếu tính cả `registry.ts` — dòng 12 của nó chỉ là ví dụ trong JSDoc: `* export const cfgLspDiagnosticsOnWrite = register({`.)

Đổi throw ở :787 là an toàn — `git grep -n "registered twice" -- '*test*'` → **0 hit**. Không test nào khoá message cũ. Hai chỗ văn xuôi ngoài test: `docs/secrets.md:140` (đã kiểm, nói về dedup secret — không liên quan) và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (xem mục 7, neo `:9923` đã hỏng).

### Bước 3 — `registry.ts:794-802` cạnh `lookup`/`all`: `ownedBy` + `ownerOf` + `unregisterOwned`

Mở `src/config/registry.ts:795` và `:800-802` (đã kiểm):

```
795  export function lookup(id: string): AnySetting | undefined {
800  export function all(): readonly AnySetting[] {
801  	return ordered;
802  }
```

`unregisterOwned(owner)` phải trả `string[]` (không phải `void`) để caller vô hiệu hoá cache dẫn xuất. Khuôn mẫu hình dạng đã có trong cùng package — đã kiểm `model-registry.ts:2914` và `:2955`:

```
2914  clearSourceRegistrations(sourceId: string): void {
2955  syncExtensionSources(activeSourceIds: string[]): void {
```

### Bước 4 — `all-settings.ts`: vô hiệu hoá memo + nối thêm handle mồ côi

Mở `src/config/all-settings.ts` (đã kiểm, file dài **125** dòng):

```
44   const DOMAINS: readonly Readonly<Record<string, unknown>>[] = [     ← tài liệu ghi :43-77
…        34 entry, :45-78                                                ← tài liệu ghi "33 entry"
79   ];
87   let ordered: readonly AnySetting[] | undefined;                      ← tài liệu ghi :85-89
90   export function orderedSettings(): readonly AnySetting[] {           ← tài liệu ghi :88-123
94   	const domainHandles = (domain: …): AnySetting[] => {              ← tài liệu ghi :92-106
…
125  }
```

Sửa **cả hai** khiếm khác:
- (a) `let ordered` ở :87 memoize vĩnh viễn → thêm `invalidateOrderedSettings()`.
- (b) `domainHandles` ở :94-108 chỉ ghé giá trị tới được từ `DOMAINS`, nên handle của extension có trong `all()` rơi lặng lẽ → nối thêm sau dãy tĩnh, theo thứ tự đăng ký.

**Giữ nguyên** `sequence` / `seen` / `placedBefore` — `seen` là thứ chặn handle bị đẩy hai lần khi bạn nối thêm, mất nó sẽ đảo thứ tự panel.

### Bước 5 — `types.ts`: mở API (KHÔNG dùng số dòng của tài liệu)

Mở `src/extensibility/extensions/types.ts` (đã kiểm — file dài **1874** dòng):

```
1277  export interface ExtensionAPI {          ← tài liệu ghi :1256
1607  }                                        ← tài liệu ghi :1582
1614  export interface ProviderConfig {        ← tài liệu ghi :1589
1455 	registerFlag(                            ← tài liệu ghi :1430
1827  export interface Extension {             ← tài liệu ghi :1802
1842  }                                        ← tài liệu ghi :1817
```

Thêm `registerSetting` cạnh `registerFlag` ở :1455 (JSDoc "Register a CLI flag." ở :1454), và `readonly settingIds: string[]` vào `Extension` ở :1827-1842.

**Con số 29 method là ĐÚNG** — đã liệt kê: 35 tên có tab đầu trong :1278-1606, trừ 6 property không phải method (`logger`, `typebox`, `arktype`, `zod`, `pi`, `events`) = **29**. Thêm một cái thành **30**.

Import ở top-level: `SettingDefinition` (`registry.ts:170`), `DefinitionValue` (`registry.ts:179`), `Setting` (`registry.ts:455`). Tuyệt đối không `import("…").Type` nội tuyến, không `ReturnType<>`, không `any`.

### Bước 6 — CHẶN THEO M2-OQ4. Đừng viết.

Hai ràng buộc đã kiểm, cả hai đều đóng:

- `packages/tui/src/overlays/settings-defs.ts:4-15` — `SettingTab` là union **đúng 10 literal** (`appearance model interaction context memory files shell tools tasks providers`), `SETTING_TABS` ở :20, `TAB_METADATA` ở :34 (JSDoc :33), `TAB_GROUPS` ở :52-88 là `Record<SettingTab, readonly string[]>`, `UiBase` ở :97-111 đòi `tab: SettingTab` + `group` phải có trong `TAB_GROUPS[tab]`.
- `packages/tui/src/overlays/settings-selector.ts:431-440` — `getSettingsTabs()` map 10 tab rồi thêm entry `{ id: "plugins" }` ở :438. Dòng :435 là `const icon = theme.symbol(meta.icon);` bên trong callback.

Nếu chọn phương án "dưới tab Plugins sẵn có", còn phải xử **cả** đường tìm kiếm: vòng `for (const id of SETTING_TABS)` ở :848-853, comment `// Plugins hosts its own UI; it is not part of the schema-backed search.` ở :854, và `empty.push({ id: "plugins", …, muted: true })` ở :855-860.

**Lưu ý thêm tài liệu không nói:** tab Plugins là một bề mặt **plugin (npm/marketplace)**, không phải extension. `PluginSettingsHost` nằm ở `packages/tui/src/overlays/plugin-settings.ts:85`, dựng bởi `createPluginSettingsHost` ở `packages/coding-agent/src/extensibility/plugins/settings-host.ts:14`. Đặt key của extension vào đó là gộp hai thứ khác nhau dưới một tab.

### Bước 7 — `loader.ts`: cài `registerSetting` trên `ConcreteExtensionAPI`

Mở `src/extensibility/extensions/loader.ts` (đã kiểm, file dài **677** dòng):

```
179  class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime {
191  	constructor(
198  		// Extensions destructure `pi.on` or forward API methods as callbacks, so every
199  		// prototype method must keep its receiver when detached. Walk the prototype
200  		// rather than listing methods: a new method is bound without touching this.
201  		const prototype = ConcreteExtensionAPI.prototype;
202  		for (const name of Object.getOwnPropertyNames(prototype)) {
```

→ **không cần wiring constructor**, chỉ cần khai method trên prototype.

Ba hành vi bắt buộc:
- (a) từ chối `id` không có namespace, message nêu prefix bắt buộc
- (b) gọi lại cùng definition của **cùng owner** = no-op trả handle cũ
- (c) đẩy id vào `this.extension.settingIds`

Khuôn mẫu: `registerComposerShape` ở :277-289 (validate → throw typed error **trước** → mutate). `registerFlag` ở :259-267 là khuôn mẫu *kém hơn* vì nó không validate.

Đường lỗi đã kiểm — đây là lý do dòng test 1 phải đi qua `loadExtensions`/`bindPreparedExtensions`:

```
397  async function runExtensionFactory(      … 414  }
417  	const resolvedPath = resolvePath(extensionPath, cwd);
438  async function bindExtension(              … 459  }
457  		return { extension: null, error: `Failed to load extension: ${message}` };
464  export async function loadExtensionFromFactory(   … 475  }
471  	const extension = createExtension(name, name);
473  	await runExtensionFactory(factory, api, runtime);   ← ném thẳng, KHÔNG vào errors
485  export async function loadExtensions(...)
491  export async function bindPreparedExtensions(        … 520  }
497  	const errors: Array<{ path: string; error: string }> = [];
505  		errors.push({ path: prepared.path, error });
```

`formatExtensionLoadNotifications` (`src/extensibility/extensions/load-errors.ts:5`) kết xuất `errors` cho người dùng — đường truyền tiếp đã có sẵn, không cần việc gì.

### Bước 8 — `loader.ts`: `releaseExtensionSettings`

Thêm helper cạnh các seam export khác của loader (`extensionToolSourceInfo` :76, `ExtensionRuntime` :100, `loadExtensionFromFactory` :464, `loadExtensions` :485, `bindPreparedExtensions` :491). **Chỉ đưa helper vào và expose các id; WI-9 nối vào.** Đừng nới phạm vi sang phần việc của WI-9.

### Bước 9 — `createExtension` phải đi theo (KHÔNG có trong bảng file của tài liệu)

Mở `loader.ts:374-390` (đã kiểm):

```
374  function createExtension(extensionPath: string, resolvedPath: string): Extension {
375  	return {
…
388  		commands: new Map(),
389  		flags: new Map(),
390  		shortcuts: new Map(),
```

Nếu `Extension` nhận `settingIds` bắt buộc mà quên dòng `settingIds: []` ở đây → lỗi type. Đây là chỗ duy nhất trong cây tạo ra `Extension` bằng object literal.

### Bước 10 — `CHANGELOG.md`

`## [Unreleased]` ở dòng 3, hiện chỉ có `### Security`. Thêm `### Added` với đại ý:
`Added pi.registerSetting so extensions can declare their own settings, editable in the settings panel`

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/config/extension-registered-setting.test.ts` (chưa tồn tại — `ls` → `No such file or directory`).
Thư mục `test/config/` có **6** file: `compaction-threshold`, `model-registry`, `models-config-validation`, `settings-panel-clear`, `settings-registry`, `settings-reload`.

**Setup (chép từ `test/extension-registered-tool-source-info.test.ts:1-6, 18-43` — đã đọc):**

```typescript
import { describe, expect, it, test } from "bun:test";
import { ExtensionRuntime, loadExtensionFromFactory, loadExtensions } from "../src/extensibility/extensions/loader";
import { EventBus } from "../src/utils/event-bus";
// …
const runtime = new ExtensionRuntime();
const events  = new EventBus();
const extension = await loadExtensionFromFactory(
  pi => { /* … */ },
  "/project", events, runtime, "pi-fabric@0.92.4",
);
```

**`withEnv` chép từ `test/config/settings-registry.test.ts:26-43` — đã đọc, đừng viết cái thứ hai:**

```typescript
/** Runs `fn` with environment variables set (`undefined` unsets), restoring the previous values after. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
	const saved: Record<string, string | undefined> = {};
	for (const name in vars) {
		saved[name] = Bun.env[name];
		const value = vars[name];
		if (value === undefined) delete Bun.env[name];
		else Bun.env[name] = value;
	}
	try { fn(); } finally {
		for (const name in saved) {
			const value = saved[name];
			if (value === undefined) delete Bun.env[name];
			else Bun.env[name] = value;
		}
	}
}
```

**`Settings` thật cho dòng 1/2/4:** `Settings.isolated({...})` — dùng thế này (như `settings-registry.test.ts:48`: `const configured = Settings.isolated({ "edit.fuzzyMatch": true, … })`), **không** cần TempDir trên đĩa.

| # | dòng | khẳng định | điều người dùng thấy nếu hồi quy |
| --- | --- | --- | --- |
| 1 | **Chỗ trùng được nêu ra, không bị nuốt** | Hai extension khai cùng một id → đúng **một** entry trong `LoadExtensionsResult.errors`, nội dung chứa cả id trùng lẫn câu "phải có namespace". Khẳng định qua `loadExtensions`/`bindPreparedExtensions` + đọc `result.errors`; **KHÔNG** qua `loadExtensionFromFactory` (ném thẳng ở :473) | Tác giả extension thứ hai âm thầm thừa kế/đè key của người thứ nhất, và không ai biết id của mình đã bị lấy. Người dùng chỉ thấy key của mình biến mất sau khi cài extension thứ hai. |
| 2 | **Một setting động là một setting hạng nhất** | Sau khi khai, `lookup(id)` trả handle, `handle.get(scope)` đọc được, `handle.provenance(scope)` trả lớp thắng **không phải `"env"``. Khẳng định **cả giá trị đã phân giải lẫn lớp**. Dùng `Setting.provenance` (`registry.ts:764-765`), **không** dùng `Settings.getProvenance` (`settings.ts:800-808` — hàm này không bao giờ trả `"env"`) | Key động rơi vào một kho lưu tình cờ vẫn đọc đúng giá trị, nhưng lớp báo sai → người dùng sửa project file xong thấy giá trị không đổi mà không có manh mối nào |
| 3 | **CÓ MẶT TRONG PANEL — BỊ CHẶN theo M2-OQ4** | Sau khi khai, key phải CÓ trong `createSettingsHost().entries` đúng vị trí M2-OQ4 chọn. **Không bao giờ assert trên DOM, không bao giờ source-grep `settings-selector.ts`** | API mở ra, tác giả không nhận lỗi, **người dùng không có UI nào**, CI xanh. Đây chính là thất bại "âm thầm và vĩnh viễn" mà plan gọi tên. |
| 4 | **`env` là opt-in** | Key khai `definition.env`: `provenance(scope)` = `"env"` khi biến được set, lớp khác khi unset — khẳng định **cả giá trị lẫn lớp**. Key **không** khai `env`: không bao giờ `"env"` kể cả khi có biến cùng tên được set. Lý do đã kiểm: `registry.ts:478-479` để `#parseEnv` là `undefined` khi thiếu `definition.env` | Overlay vẽ lại năm lớp cũ sẽ pass dòng 1 và dòng 2 trong khi **lặng lẽ mất trọn vẹn** env → biến môi trường set rồi không có tác dụng, người dùng không hiểu vì sao |
| 5 | **Gỡ được, bật lại được, rebind không ném** | (a) `unregisterOwned(owner)` xoá khỏi `byId`, khỏi `ordered`, khỏi cả hai index owner, **trả về** danh sách id; gọi lại `registerOwned` cùng owner cùng id phải thành công; `orderedSettings()` phải chứa lại key sau `invalidateOrderedSettings()`. (b) Chạy factory hai lần cho cùng owner (mô phỏng `bindPreparedExtensions`) trả **cùng một handle**, không ném | Tắt rồi bật lại extension trong cùng một process → `Setting "X" is registered twice` ngay lúc bật, và key **vĩnh viễn không với tới được**. Đây là lỗ hổng cổng lớn nhất: không dòng nào trong 4 dòng còn lại phủ, và type-check không bắt được vì không gì gọi tới `unregisterOwned` |

**Ràng buộc chung cho cả 5 dòng:** không `mock.module()` (được AGENTS.md cấm tuyệt đối), phải an toàn khi chạy full-suite (dùng owner riêng cho từng test + `afterEach` gọi `unregisterOwned`).

---

## 5. Cổng

### (0) Tiền đề — phải xanh trước khi đọc (1) và (2)

```bash
brew install ninja                      # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja
bun --cwd=packages/natives run build
```

Đã kiểm: `packages/natives/package.json` có script `build = bun ../../scripts/bazel-natives.ts host --dest native`. Thiếu Ninja → exit 1 với `CMake was unable to find a build program corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set.` Thiếu build → `bun test` báo `0 pass / 1 fail / 1 error` kèm `Failed to load pi_natives native addon for darwin-arm64`, và đó **không phải** hồi quy của bạn.

### (1) Type check

```bash
bun run --filter './packages/coding-agent' --filter './packages/tui' --if-present check:types
```

Đã kiểm trong `package.json`: `check:types` mỗi package = `tsgo -p tsconfig.json --noEmit`. Cố tình **không** dùng `bun run check:ts` — root `check:ts` = `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`, mà `check:tools` = `oxlint . && oxfmt --check …` trên **toàn bộ** cây mọi package, nên đỏ được bởi bất kỳ file nào không liên quan.

### (2) Test

```bash
cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts
cd packages/coding-agent && bun test test/config/settings-registry.test.ts   # 41 call site cũ không hồi quy
```

### Cổng này có ĐỎ ĐƯỢC không — câu trả lời thẳng

**Không, không đủ.** Đây là điểm quan trọng nhất của phiếu này.

| phần cổng | đỏ được? | bằng cách nào / không bằng cách nào |
| --- | --- | --- |
| (1) type check | **CÓ, thật** | Thêm `registerSetting` vào `ExtensionAPI` mà không cài trên `ConcreteExtensionAPI` là lỗi biên dịch — class được khai `implements ExtensionAPI, IExtensionRuntime` tại `loader.ts:179`. Kiểu trả về lệch cũng vậy. Thêm `settingIds` vào `Extension` mà quên `createExtension` (`loader.ts:374-390`) cũng vậy. |
| (2) dòng 1, 2, 4, 5 | **CÓ, thật** | Dòng 1/2/4 gọi `pi.registerSetting` hoặc `registerOwned` — trên HEAD chúng không tồn tại nên file **không type-check**, tức (1) đã đỏ trước. Sau khi API có, thiếu `invalidateOrderedSettings` làm dòng 5(a) đỏ; `ownerOf` không export làm dòng 1 đỏ. |
| (2) dòng 3 (panel) | **KHÔNG — bị chặn** | Dòng này **không viết được** cho tới khi M2-OQ4 có câu trả lời. Cổng đòi file test chạy qua, nhưng dòng bắt buộc thì không tồn tại. |
| **Một bản cài quên `unregisterOwned`** | **KHÔNG, nếu chỉ chạy (1)+(2)** | Đây là lỗ hổng lớn nhất. `check:types` không bắt được vì **không gì trong cây lệnh type-check gọi tới `unregisterOwned`**. Nó chỉ lộ ra ở dòng test 5. |

**Viết lại cổng cho đỏ được — thêm (3):**

```bash
# (3) Cổng RIÊNG cho unload/rebind — không được gộp vào (2)
cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts -t "unregister"
```

Cách tốt hơn và không đụng tool: **tách dòng 5 ra file riêng** `test/config/extension-setting-lifecycle.test.ts`, và bắt cổng phải chạy **cả hai** file:

```bash
cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts test/config/extension-setting-lifecycle.test.ts
```

Lý do tách: dòng 3 bị chặn, nên một file "5 dòng" hôm nay chỉ chạy được 4. Để dòng 5 nằm trong file riêng, cổng (2) vẫn xanh trong lúc M2-OQ4 chưa có, và **không ai có thể xoá dòng 5 để làm cổng xanh** mà không phá cổng (3).

**Chốt cổng (0) trước (1) trước (2).** Không tuân thủ thứ tự này thì (2) báo `0 pass / 1 fail / 1 error` và bạn sẽ đọc nhầm là hồi quy.

---

## 6. Cạm bẫy riêng của work item này

Xếp theo mức độ dễ làm sai.

### #1 — `code_shape` trong tài liệu **không biên dịch được** (tài liệu tự nói, ở "Cần người xác nhận")

Khối `ConcreteExtensionAPI.registerSetting` gọi `ownerByIdOf(definition.id)`, một hàm **không tồn tại**. `ownerById` được khai `const` module-level **không export**. Phải chọn: export một accessor (ví dụ `export function ownerOf(id: string): string | undefined`) **hoặc** để `registerOwned` trả kèm owner. Không chọn thì dòng test 1 không viết được và không ai biết vì sao.

### #2 — `registerSetting` phải là **prototype method**, không phải class field

Constructor `loader.ts:201-207` duyệt `ConcreteExtensionAPI.prototype` bằng `Object.getOwnPropertyNames` và chỉ bind những gì có `descriptor?.value` là **function**. Một arrow-function class field nằm trên **instance**, không phải prototype → không được bind → khi extension làm `const { registerSetting } = pi` thì `this` mất. Viết `registerSetting = (d) => {…}` sẽ **type-check xanh** và chỉ chết lúc chạy. Đây là lý do gate (1) không đủ.

### #3 — `all()` trả **mảng sống**

```
800  export function all(): readonly AnySetting[] {
801  	return ordered;
802  }
```

`readonly` chỉ là kiểu, không phải copy. `unregisterOwned` splice vào `ordered` là mutate thẳng cái mà `all()` trả về. Bất kỳ ai cache `all()` sẽ giữ handle đã bị gỡ. Đừng thêm `all()` vào cache dài hạn trong code mới.

### #4 — `ordered` tồn tại HAI cái, cùng tên

`registry.ts:779` `const ordered: AnySetting[] = []` (nguồn thật) và `all-settings.ts:87` `let ordered: readonly AnySetting[] | undefined` (memo). `invalidateOrderedSettings()` chỉ xoá cái thứ hai. Đọc "ordered" mà không nói file nào là nguồn của bug.

### #5 — `resetRegistryForTest` **không** dọn `byId`/`ordered`

```
953  export function resetRegistryForTest(defaults: Settings): void {
954  	unbindEffects();
955  	for (const entry of effects) entry.reset(defaults);
956  }
```

Chỉ chạm `effects`. Một test đăng ký rồi quên `unregisterOwned` sẽ **đầu độc chính file test đó** và các file chạy sau trong cùng process. Bắt buộc `afterEach` gọi `unregisterOwned(owner)` bằng owner riêng của test.

### #6 — `resolvedPath` **không** phải slug ổn định

Đã kiểm `loader.ts:471`: `const extension = createExtension(name, name);` — trên `loadExtensionFromFactory`, `resolvedPath` **bằng đúng `name`**, và mặc định là `"<inline>"`. Hai extension nạp bằng `loadExtensionFromFactory` với cùng một `name` sẽ **có cùng owner**, và nhánh idempotent sẽ âm thầm trả handle của người thứ nhất — đó là last-writer-wins ngược, và dòng test 1 **không bắt được**. Trên `loadExtensions` thì `resolvedPath` là đường tuyệt đối (`loader.ts:417`, `resolvePath(extensionPath, cwd)`) → máy-local, tệ cho project config được commit. Khuôn mẫu id-derivation có sẵn: `capability/extension-module.ts:28` `toExtensionId: ext => \`extension-module:${ext.name}\``, khai ở `capability/types.ts:204`, tiêu thụ ở `capability/index.ts:192-193`. **Một người phải chọn, đừng tự bịa.**

### #7 — `EXTENSION_ID_PREFIX = "extension."` **lệch** `plugins.` của WI-8a

WI-8a chốt `plugins.<id>.<key>`. WI-9 sẽ quét cả hai không gian tên trong một bảng kiểm kê 11 bucket. Nếu lệch mà không ghi lý do, WI-9 sẽ bỏ sót một nhánh.

### #8 — Dòng test 4 dễ pass vì **lý do sai**

Nếu một key **không** khai `env`, `provenance` không trả `"env"` — nhưng nó cũng sẽ không trả `"env"` nếu bạn **quên khai `env` cho cả key kia**. Dòng 4 phải khẳng định **cả hai vế** (có env → `"env"`; không env → không phải `"env"`), và phải khẳng định **giá trị đã phân giải** chứ không chỉ tên lớp. Lý do: `registry.ts:478-479` để `#parseEnv` là `undefined` khi thiếu `definition.env`.

### #9 — `loadExtensionFromFactory` **không** tạo entry `errors`

Nó ném thẳng ở `loader.ts:473`. Dòng 1 đi qua nó là dòng 1 **chết âm thầm** — test xanh vì không có gì để khẳng định. Chỉ `bindPreparedExtensions` (:491-520) mới gom vào `errors` (:497, push ở :505).

### #10 — Mọi số dòng trong `types.ts` và `all-settings.ts` của tài liệu đều đã trôi

Bảng neo đúng ở mục 7. Gõ theo số trong tài liệu sẽ sửa nhầm chỗ.

---

## 7. Sai lệch so với cây thật — GHI RA, KHÔNG SỬA trong tài liệu

Tài liệu tự ghi cột cuối bảng "File cần chạm tới" là `Có — HEAD 808b365`. HEAD thật lúc kiểm là **`65cc6c1`**. Các neo dưới đây đã đọc và **đã hỏng**.

| tài liệu ghi | thật | mức |
| --- | --- | --- |
| `types.ts:1256-1582` là span `ExtensionAPI` | `export interface ExtensionAPI` ở **1277**, đóng ở **1607**, khai báo top-level kế tiếp `export interface ProviderConfig` ở **1614** | trôi +21/+25/+25 |
| *(bảng "Đính chính" tự ghi)* "`export interface ExtensionAPI` ở :1256, đóng ở :1582, `ProviderConfig` ở :1589" | **1277 / 1607 / 1614** | **chính phần đính chính cũng sai** |
| `types.ts:1430` là `registerFlag` | `registerFlag(` ở **1455**, JSDoc ở **1454** | trôi +25 |
| `types.ts:1802-1817` là `Extension` | `export interface Extension` ở **1827**, đóng ở **1842** | trôi +25 |
| `types.ts:1231-1557` (claim gốc của plan) | 1277-1607 | trôi +46/+50 |
| `all-settings.ts:43-77` là `DOMAINS` | `const DOMAINS` ở **44**, `];` ở **79** | trôi +1/+2 |
| `all-settings.ts` có **33** entry `DOMAINS` | **34** entry (đếm :45-78) | **đếm sai** |
| `all-settings.ts:85-89` là memo `ordered` | `let ordered` ở **87**; :85 là `];` đóng `PLACED_DOMAINS` | trôi +2 |
| `all-settings.ts:88-123` là `orderedSettings` | **90-125** (file dài 125 dòng) | trôi +2 |
| `all-settings.ts:92-106` là `domainHandles` | **94-108** | trôi +2 |
| `test/config/` "giữ bảy file test" | **6** file | đếm sai |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9923` là chỗ văn xuôi "registered twice" | dòng 9923 là `### Các bước`. Các hit thật: 8158, 8224, 8484, 8500, 8502, 10275, 10277, 26017 | trôi |
| "lệnh không giới hạn phạm vi thì trả **3** kết quả" | `git grep -n "registered twice"` giờ trả nhiều hơn nhiều (kế hoạch + research + docs) | đếm cũ |
| `createExtension` không có trong bảng file | `loader.ts:374-390` — object literal tạo `Extension`, **phải** thêm `settingIds: []` khi interface đổi | **thiếu hẳn** |

**Phần đúng giữ nguyên (đã kiểm, không đổi):** toàn bộ neo `registry.ts` (`:778 :779 :786 :787 :792 :795 :800 :476-480 :764-765 :953`); toàn bộ neo `loader.ts` (`:179 :191-208 :198-200 :259-267 :277-289 :397-414 :417 :438-459 :457 :464-475 :471 :473 :491-520 :497-505`); toàn bộ neo `settings-ui.ts` (`:39-44 :51-68 :53-56 :58-66`); toàn bộ neo `settings-defs.ts` (`:4-15 :20 :33-34 :52-88 :97-111`); toàn bộ neo `settings-selector.ts` (`:431-440 :435 :438 :848-853 :854 :855-860`); `settings.ts:800-808` và `:62`; `model-registry.ts:2914` và `:2955`; `capability/extension-module.ts:28`, `capability/types.ts:204`, `capability/index.ts:192-193`; `marketplace/types.ts:29`; `docs/secrets.md:140`; con số **41** file gọi `register({`; con số **33** kết quả `extensionId|slugExtension|normalizeExtensionId`; con số **5** kết quả `provenance` trong `packages/tui/src/` (không cái nào liên quan settings); con số **29** method của `ExtensionAPI`; sự tồn tại của `test/extension-prepared-rebind.test.ts` và `withEnv` ở `test/config/settings-registry.test.ts:26-43`.

---

## 8. Cần người quyết — chặn

1. **M2-OQ4 — key của extension render ở đâu?** Ba phương án (panel data-driven / dưới tab Plugins sẵn có / một tab động). Ràng buộc đã kiểm: `SettingTab` là union **đóng 10 literal** (`settings-defs.ts:4-15`) và `TAB_GROUPS` là record tĩnh (`:52-88`), nên "một tab động cho mỗi extension" **không biểu đạt được** nếu không đổi cả hai. Lưu ý thêm: tab Plugins là bề mặt **plugin (npm/marketplace)**, không phải extension. Quyết trước rồi mới cài bước 6 và dòng test 3.
2. **Slug namespace ổn định lấy từ đâu?** manifest id do tác giả khai / hash của resolved-path / basename. Xem cạm bẫy #6.
3. **Đăng ký lại cùng key cùng owner: no-op hay ném?** Tài liệu chọn no-op vì `bindPreparedExtensions` rebind extension đã prepare cho session con và chạy lại factory. Nhưng no-op che một khai báo trùng thật bên trong một extension.
4. **Cổng test gồm dòng 3 bị chặn.** Hoãn toàn bộ gate test tới khi M2-OQ4 xong, hay nhận phiên bản 4 dòng + cổng (3) tách riêng như mục 5? **Khuyến nghị: phương án thứ hai** — nó giữ được dòng 5 (thứ chỉ lộ ra ở đó) trong khi vẫn cho phép ship.
5. **`ownerByIdOf` không export** (xem cạm bẫy #1).
6. **Biến môi trường cho key của extension: tác giả chọn hay tự suy ra?** WI-8a đã chốt `OMP_<PLUGIN_ID>_<KEY>` khai tường minh, không bao giờ tự sinh. Xác nhận WI-8b thừa hưởng nguyên vẹn.

---

## 9. Luật

- **TUYỆT ĐỐI không dùng `tsc` / `npx tsc`.** Dự án cấm; dùng `check:types` (tsgo).
- Không sửa file kế hoạch. Phiếu này là nơi duy nhất ghi lại sai lệch.
- Không `mock.module()` — dùng `spyOn`. `Bun.mock.module()` rò rỉ toàn cục giữa các file ([oven-sh/bun#12823](https://github.com/oven-sh/bun/issues/12823)).
- Không source-grep trong test. Khẳng định hành vi quan sát được, hoặc dùng `check:types` cho bất biến cấu trúc.
- Prompt không dựng trong code. Không liên quan ở work item này, nhưng nếu thêm text hiển thị thì đi qua file tĩnh.
