# Phiếu triển khai — WI-8a: Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_2_EXECUTION_PLAN.md` (mục `## WI-8a.` bắt đầu ở dòng 2993, kết thúc trước `## WI-8b.` ở dòng 3252)
**Cây tham chiếu dùng để kiểm neo:** `/Users/tranquangdang21/Projects/ultraworkers` (tất cả neo trong WI-8a trỏ vào cây `omp` này; `pi-ref` không có `packages/*/src/extensibility/plugins/`, nên không có cây thứ hai cần đối chiếu cho mục này)
**Trạng thái HEAD khi viết phiếu:** nhánh `milestone-1`, HEAD `65cc6c1`, addon native **đã build** (`packages/natives/native/pi_natives.darwin-arm64.node` tồn tại).

---

## 1. Cái gì thay đổi, quan sát được

Giá trị của một cài đặt plugin không còn nằm trong `~/.omp/plugins/omp-plugins.lock.json` và `<project>/.omp/plugin-overrides.json` nữa, mà nằm trong chính các lớp Settings dưới id có namespace `plugins.<plugin>.<key>` — nên nó nhận đúng phân tầng mà một setting lõi có, và `handle.provenance(scope)` trả về tên lớp thắng (`"env"` / `"project"` / `"global"`), thứ mà store vệt phụ cũ không có cách nào nói ra.

---

## 2. Bảng điểm sửa

Trích TRƯỚC từ file thật.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/plugins/manager.ts:929-937` | `PluginManager.getPluginSettings` | `const config = await this.#ensureConfigLoaded();`<br>`const global = config.settings[name] \|\| {};`<br>`const projectOverrides = await this.#loadProjectOverrides();`<br>`const project = projectOverrides.settings?.[name] \|\| {};`<br>`// Project settings override global`<br>`return { ...global, ...project };` | `const settings = this.#settingsScope();`<br>`const out: Record<string, unknown> = {};`<br>`for (const [key, schema] of Object.entries(this.#schemaFor(name))) {`<br>`  out[key] = registerPluginSetting(name, toDefinition(key, schema)).get(settings);`<br>`}`<br>`return out;` |
| `packages/coding-agent/src/extensibility/plugins/manager.ts:942-949` | `PluginManager.setPluginSetting` | `if (!config.settings[name]) { config.settings[name] = {}; }`<br>`config.settings[name][key] = value;`<br>`await this.#saveRuntimeConfig();` | `registerPluginSetting(name, toDefinition(key, this.#schemaFor(name)[key]))`<br>`  .set(this.#settingsScope(), value);` — ghi lớp global qua `config/settings.ts:828`, không còn gọi `#saveRuntimeConfig` |
| `packages/coding-agent/src/extensibility/plugins/manager.ts:954-960` | `PluginManager.deletePluginSetting` | `if (config.settings[name]) {`<br>`  delete config.settings[name][key];`<br>`  await this.#saveRuntimeConfig();`<br>`}` | `registerPluginSetting(name, toDefinition(key, ...)).unset(this.#settingsScope());` → `unsetGlobalValue` (`config/settings.ts:845`) — **xoá chỉ lớp GLOBAL**, giá trị lớp project hiện lại. ĐÂY LÀ ĐỔI NGỮ NGHĨA, xem §6. |
| `packages/coding-agent/src/extensibility/plugins/loader.ts:474-482` | `getPluginSettings(pluginName, cwd)` (module-level) | `const runtimeConfig = await loadRuntimeConfig();`<br>`const projectOverrides = await loadProjectOverrides(cwd);`<br>`const global = runtimeConfig.settings[pluginName] \|\| {};`<br>`const project = projectOverrides.settings?.[pluginName] \|\| {};`<br>`return { ...global, ...project };` | ủy nhiệm sang substrate mới. Giữ nguyên chữ ký. **Xem cảnh báo ở §6 về khác biệt `getConfigDirPaths` vs `getProjectPluginOverridesPath`.** |
| `packages/coding-agent/src/extensibility/settings.ts:5` | import của domain | `import { combine, register, type SettingValueOf } from "../config/registry";` | thêm `lookup` (đã export ở `config/registry.ts:795`): `import { combine, lookup, register, type SettingValueOf } from "../config/registry";` |
| `packages/coding-agent/src/extensibility/settings.ts` (sau :10) | — (chưa tồn tại) | — | thêm `sanitizePluginSegment`, `PLUGIN_SETTINGS_ROOT = "plugins"`, `pluginSettingId`, `registerPluginSetting` (idempotent: `lookup(id)` trước, trả handle cũ nếu trùng) |
| `packages/coding-agent/src/extensibility/plugins/manager.ts` (mới) | — (chưa tồn tại) | — | `#schemaFor(name)` đọc manifest qua accessor có sẵn ở `:256`; `toDefinition(key, schema)` bộ chuyển schema→definition; `#settingsScope()` trả `Settings`; `migrateLegacyPluginSettings()` idempotent + marker |
| `packages/coding-agent/test/config/plugin-settings-provenance.test.ts` | — (chưa tồn tại) | — | file mới, 3 test (xem §4) |
| `packages/coding-agent/test/plugin-config.test.ts:47-56` | test `set initializes missing settings in legacy runtime config` | `const lock = await Bun.file(lockfile).json();`<br>`expect(lock.settings[pluginName]).toEqual({ "autoContext.enabled": true });` | viết lại: value đọc lại qua `getPluginSettings` khớp **VÀ** `provenance(scope) === "global"`, **VÀ** lockfile KHÔNG có khoá `settings` mới |
| `packages/coding-agent/test/plugin-config.test.ts:114-119` | test `resolves marketplace settings without restoring duplicate list entries` | `await manager.setPluginSetting(pluginName, "mainBranchProtection", false);`<br>`expect(await manager.getPluginSettings(pluginName)).toEqual({ mainBranchProtection: false });` | viết lại theo đường đọc handle mới |
| `packages/coding-agent/CHANGELOG.md:3` | `## [Unreleased]` | `## [Unreleased]` rồi thẳng `### Security` ở :5 | thêm `### Changed` (mục mới) ngay dưới `## [Unreleased]` — **xem drift ở §7, dòng cần chèn không còn là :5 nữa** |

---

## 3. Các bước, mỗi bước có neo đã kiểm

### Bước 0 — Quyết định instance `Settings` nào là nhà (BLOCKING, viết ra trước dòng code đầu tiên)

- `packages/coding-agent/src/extensibility/plugins/manager.ts:115-121` — **ĐÃ MỞ, ĐÚNG**: `export class PluginManager {` ở :115, `#runtimeConfig: PluginRuntimeConfig | null = null;` :116, `#cwd: string;` :117, `constructor(cwd: string = getProjectDir()) { this.#cwd = cwd; }` :119-121. Không có `Settings` nào. Đúng như plan nói.
- `packages/coding-agent/src/extensibility/plugins/settings-host.ts:14,16` — **ĐÃ MỞ, ĐÚNG**: :14 `export function createPluginSettingsHost(cwd: string): PluginSettingsHost {`, :16 `manager: new PluginManager(cwd),`.
- `packages/coding-agent/src/modes/controllers/selector-controller.ts:266` — **ĐÃ MỞ, ĐÚNG**: `plugins: createPluginSettingsHost(getProjectDir()),`. Đúng như plan nói: host chỉ có `getProjectDir()`.
- `packages/coding-agent/src/config/settings.ts:694` — **ĐÃ MỞ, ĐÚNG**: `static isolated(` (692-701). Phương án (c) bị loại đúng: `new Settings({ inMemory: true, overrides })` + `instance.#storage = null` ⇒ không đọc lớp global.

**Kết luận bắt buộc ghi ra:** chọn (a) — nhận `Settings` qua constructor, `createPluginSettingsHost` lấy nó từ host. Phương án (b) (`await Settings.load()` bên trong manager) tạo instance thứ hai cạnh instance bảng cài đặt — tái tạo đúng "hai store" mà mục này sinh ra để gỡ. **Phải nêu luôn**: `loader.ts:474` là hàm cấp module, không có manager lẫn session; nó phải lấy `Settings` qua một đường riêng (vd. singleton `Settings.load()` của tiến trình, hoặc nhận `Settings` qua tham số bắt buộc — nhưng tham số bắt buộc là **API break** với extension bên thứ ba, và extension gọi hàm này theo tên).

### Bước 1 — Nguyên thủy namespace + idempotency

- `packages/coding-agent/src/extensibility/settings.ts:5` — **ĐÃ MỞ, ĐÚNG**: `import { combine, register, type SettingValueOf } from "../config/registry";`
- `packages/coding-agent/src/extensibility/settings.ts:10` — **ĐÃ MỞ, ĐÚNG**: `export const cfgExtensions = register({ id: "extensions", type: "array", default: EMPTY_STRING_ARRAY });` (dòng `register` đầu tiên của module). File dài 162 dòng.
- `packages/coding-agent/src/config/registry.ts:778,779,787,789,790,796` — **ĐÃ MỞ, ĐÚNG**. `grep -n 'byId\|ordered'` trả đúng 6 hit: khai báo `byId` :778, khai báo `ordered` :779, `byId.has` :787, `byId.set` :789, `ordered.push` :790, `byId.get` :796 (dòng `ordered?: boolean;` :62 là trường UI, không liên quan). ⇒ **registry chỉ-thêm, không có unregister**. Đúng như plan.
- `packages/coding-agent/src/config/registry.ts:953` — **ĐÃ MỞ, ĐÚNG**: `export function resetRegistryForTest(defaults: Settings): void {` → thân :954-956 gọi `unbindEffects()` rồi duyệt `effects`; **không bao giờ chạm `byId`/`ordered`**. Đúng như plan.
- `packages/coding-agent/src/config/registry.ts:795` — `export function lookup(id: string): AnySetting | undefined { return byId.get(id); }` — import `lookup` được.

**⇒ `registerPluginSetting` PHẢI tra `lookup(id)` trước và trả handle cũ.** Không có `setting.env` tự sinh bao giờ.

### Bước 2 — Bộ chuyển schema→definition

- `packages/coding-agent/src/extensibility/plugins/types.ts:48` — **ĐÃ MỞ, ĐÚNG**: `settings?: Record<string, PluginSettingSchema>;`
- `packages/coding-agent/src/extensibility/plugins/types.ts:55` — **ĐÃ MỞ, ĐÚNG**: `export type PluginSettingType = "string" | "number" | "boolean" | "enum";`
- `packages/coding-agent/src/extensibility/plugins/types.ts:57-93` — **ĐÃ MỞ, ĐÚNG**: `interface PluginSettingBase` :57 (`type` :59, `description?` :61, `secret?` :63, `env?` :65), `StringSetting` :68, `NumberSetting` :73 (`min?` :76, `max?` :77, `step?` :78), `BooleanSetting` :81, `EnumSetting` :86 (`values: string[]` :89), `export type PluginSettingSchema = ...` :93. Plan trích `types.ts:65` cho `env` — **đúng**.
- `packages/coding-agent/src/config/registry.ts:143` — **ĐÃ MỞ, ĐÚNG**: `values: T;` trong `EnumDefinition` (141-147), không optional. ⇒ bỏ `values` là definition không typecheck. Đúng như plan.
- `packages/coding-agent/src/config/registry.ts:48` — **ĐÃ MỞ, ĐÚNG**: `secret?: boolean;` thuộc `interface UiString` (46-56). ⇒ setting boolean/enum/number không map thẳng `secret`; phải dùng `credential`.
- `packages/coding-agent/src/config/registry.ts:95` — **ĐÃ MỞ, ĐÚNG**: `credential?: true;` trong `interface DefinitionBase` (88-…). Lưu ý: `DefinitionBase` **không** được `export` — nó là `interface` nội bộ; `SettingDefinition` là union export ở :170.
- `packages/coding-agent/src/config/registry.ts:509-511` — **ĐÃ MỞ**: `get isCredential(): boolean { return this.definition.credential === true \|\| this.ui?.secret === true; }`. Đúng như plan (đọc cả hai). **Lưu ý đổi tên**: nó là **getter**, không phải hàm — viết `isCredential()` trong comment/code sẽ không typecheck dưới `useDefineForClassFields`/ESLint.
- `packages/coding-agent/src/extensibility/plugins/manager.ts:256, :622, :845` — **ĐÃ MỞ, CẢ BA ĐÚNG**: `const manifest: PluginManifest = pluginPkg.omp || pluginPkg.pi || { version: pluginPkg.version };` (:256), `= pkg.omp || pkg.pi || { version: pkg.version }` (:622), và lần thứ ba (:845). Đúng như plan: đây là ba điểm đọc manifest, không mở thêm điểm thứ tư.

**Đã giải quyết (plan để ngỏ, nay đã kiểm được):** `min`/`max`/`step` (`NumberSetting` :76-78) **CÓ** chỗ để map. `validate?: (raw: unknown) => void;` nằm trên `DefinitionBase` tại `registry.ts:112` (doc :108-111: "Rejects a malformed configured value with a descriptive error. Runs on every load/reload and before every write"), nên `NumberDefinition` (134-139) thừa hưởng nó. `grep -n 'validate' registry.ts` → :112 (khai báo), :115 (doc của `normalize`), :666 và :680 (gọi `this.definition.validate?.(...)`). ⇒ `toDefinition` map `min/max/step` thành một `validate` của riêng bạn; **đừng ghi nhận là chưa hỗ trợ** như plan dặn. Cùng cơ sẵn có: `normalize?: (value: unknown) => unknown;` tại :117.

**Lưu ý thêm khi map `NumberSetting`:** `NumberDefinition.default` là `number | undefined` (không optional), còn `NumberSetting.default?` là optional. Một manifest không khai `default` sẽ không typecheck nếu bạn truyền thẳng — phải chọn một giá trị (vd `0`, hoặc `undefined` nếu `DefinitionValue` chấp nhận, xem `registry.ts:179-186`).

### Bước 3 — Quy tắc đặt tên biến môi trường (viết ra, review, KHÔNG để test quyết)

- `packages/coding-agent/src/config/registry.ts:514-523` — **ĐÃ MỞ, ĐÚNG**: `envValue(): T | undefined {` :514, guard dòng đầu :515 `if (!this.envName || !this.#parseEnv) return undefined;`. ⇒ opt-in, đúng như plan (và đúng là con trỏ đã sửa của claim cũ `registry.ts:476-480`).
- `packages/coding-agent/src/config/registry.ts:476-480` — **ĐÃ MỞ, ĐÚNG là constructor**: :476 `const env = definition.env;`, :477 `this.envName = typeof env === "string" ? env : env?.name;`, :478-479 `this.#parseEnv = ...`, :480 `this.envFallback = typeof env === "object" ? (env.fallback ?? false) : false;`.
- `packages/coding-agent/src/config/registry.ts:526-535` — **ĐÃ MỞ, ĐÚNG**: `#effectiveEnv` — :528 `if (value === undefined || !this.envFallback) return value;`, :530 `if (this.envFallback === true) return settings.isConfigured(this) ? undefined : value;`. ⇒ `envFallback: true` làm env **NHƯỜNG**. Cạm bẫy fixture đã nêu ở §6 là có thật.

**Quy tắc phải viết ra trong cùng commit:** `OMP_<PLUGIN_ID>_<KEY>`, hoa, `-`/`.` → `_`, khai tường minh trong `SettingDefinition.env` (kiểu `SettingEnv<T>` — `registry.ts:71-83`, chấp nhận cả string lẫn `{name, parse, fallback}`). Không tổng hợp tên biến từ id.

### Bước 4 — Viết `setPluginSetting` TRƯỚC

- `packages/coding-agent/src/extensibility/plugins/manager.ts:942-949` — **ĐÃ MỞ, ĐÚNG** (nội dung ở §2). `:948` là `await this.#saveRuntimeConfig();` — dòng này **phải biến mất**.
- `packages/coding-agent/src/config/registry.ts:716-719` — **ĐÃ MỞ**: `set(scope: ScopeLike, value: T): void { if (value === undefined) settingsOf(scope).unsetGlobalValue(this); else settingsOf(scope).writeValue(this, this.#normalize(value), "global"); }`.
- `packages/coding-agent/src/config/registry.ts:211` — `export type ScopeLike = Settings | SettingsScope;` ⇒ `handle.set(settingsInstance, value)` là đúng kiểu, không cần cast.
- `packages/coding-agent/src/config/settings.ts:826-831` — **ĐÃ MỞ, ĐÚNG**: nhánh `if (layer === "global")` → :828 `setByPath(this.#global, segments, value);`, :836 `if (layer === "global") this.#queueSave();`. Plan trích `:828` là đúng.
- **GIỮ** `manager.ts:148` `#saveRuntimeConfig` và `:153` `#loadProjectOverrides` ở bước này — bước 6 còn cần.

### Bước 5 — `getPluginSettings` + `deletePluginSetting`

- `packages/coding-agent/src/extensibility/plugins/manager.ts:929-937` và `:954-960` — **ĐÃ MỞ, ĐÚNG** (nội dung §2).
- `packages/coding-agent/src/config/registry.ts:735-737` — **ĐÃ MỞ**: `unset(scope: ScopeLike): void { settingsOf(scope).unsetGlobalValue(this); }`.
- `packages/coding-agent/src/config/settings.ts:845-860` — **ĐÃ MỞ, ĐÚNG**: `unsetGlobalValue` chỉ gọi `deleteByPath(this.#global, segments)` (:853). **Không có đường xoá ở lớp project nào trong method** — đúng như plan.

### Bước 6 — Migration đọc CẢ HAI file legacy

- `packages/coding-agent/src/extensibility/plugins/manager.ts:148-151` — **ĐÃ MỞ, ĐÚNG**: `async #saveRuntimeConfig(): Promise<void> { await this.#ensureConfigLoaded(); await Bun.write(getPluginsLockfile(), JSON.stringify(this.#runtimeConfig, null, 2)); }`
- `packages/coding-agent/src/extensibility/plugins/manager.ts:153-162` — **ĐÃ MỞ, ĐÚNG**: `async #loadProjectOverrides(): Promise<ProjectPluginOverrides> { const overridesPath = getProjectPluginOverridesPath(this.#cwd); try { return await Bun.file(overridesPath).json(); } catch (err) { if (isEnoent(err)) return {}; logger.warn(...); return {}; } }`
- `packages/coding-agent/src/extensibility/plugins/types.ts:156-163` — **ĐÃ MỞ, ĐÚNG**: `export interface ProjectPluginOverrides {` :156, `disabled?` :158, `features?` :160, `settings?: Record<string, Record<string, unknown>>;` :162, đóng :163. ⇒ file **được giữ lại** sau migration (2/3 field còn dùng).
- `packages/utils/src/dirs.ts:662` — **ĐÃ MỞ, ĐÚNG**: `export function getPluginsLockfile(home?: string): string { return path.join(getPluginsDir(home), "omp-plugins.lock.json"); }` ⇒ `~/.omp/plugins/omp-plugins.lock.json`. **Xem drift ở §7 — plan ghi :652.**
- `packages/utils/src/dirs.ts:1066` — **ĐÃ MỞ, ĐÚNG**: `export function getProjectPluginOverridesPath(cwd: string = getProjectDir()): string { return path.join(getProjectAgentDir(cwd), "plugin-overrides.json"); }`; `getProjectAgentDir` ở `dirs.ts:599-601` = `path.join(cwd, CONFIG_DIR_NAME)`. **Xem drift ở §7 — plan ghi :1046.**

### Bước 7 — Marker hoàn thành là một yêu cầu đúng đắn

- `packages/coding-agent/src/extensibility/plugins/manager.ts:148` — **ĐÃ MỞ, ĐÚNG** (xem trên). Marker KHÔNG được ghi vào `omp-plugins.lock.json` và KHÔNG được ghi vào `plugin-overrides.json` — đó sẽ là store plugin thứ ba, đúng thứ mục này sinh ra để gỡ. Chọn: một key trong lớp Settings (vd dưới `plugins.__migration`) **hoặc** một file marker riêng dưới `~/.omp/plugins/`. **Phải chốt trước khi gõ.**
- Thứ tự bắt buộc: persist dạng mới **trước**, ghi marker **sau**.

### Bước 8 — `loader.ts:474` ủy nhiệm

- `packages/coding-agent/src/extensibility/plugins/loader.ts:474-482` — **ĐÃ MỞ, ĐÚNG**: `export async function getPluginSettings(pluginName: string, cwd: string): Promise<Record<string, unknown>>` :474, thân :475-481, đóng :482 (file dài **482** dòng — đây là dòng CUỐI file). Nội dung ở §2.
- `packages/coding-agent/src/extensibility/plugins/loader.ts:48` `loadRuntimeConfig(home?)` và `:61` `loadProjectOverrides(cwd)` — **ĐÃ MỞ, ĐÚNG**. `loadProjectOverrides` (:61-71) dùng `getConfigDirPaths("plugin-overrides.json", { user: false, cwd })` — **quét NHIỀU thư mục**, khác `getProjectPluginOverridesPath` chỉ đọc `.omp`. **Xem cảnh báo ở §6.**
- `packages/coding-agent/src/extensibility/plugins/index.ts:5` — **ĐÃ MỞ, ĐÚNG**: `export * from "./loader";` ⇒ hàm này là public API của package. Thêm `home`/`Settings` bắt buộc vào chữ ký là **breaking change** với extension bên thứ ba.
- `git grep -n getPluginSettings -- packages/` — **ĐÃ CHẠY**: 12 hit — `plugin-cli.ts:836, :871, :958` ( qua `manager`), `loader.ts:474`, `manager.ts:929`, `plugin-list-marketplace.test.ts:335`, `plugin-config-validate.test.ts:63, :116`, `plugin-config.test.ts:62, :119`, `tui/.../plugin-settings.ts:71, :147`. **Không có caller sản xuất nào của bản `loader`** — đúng như plan cảnh báo.

### Bước 9 — Để yên tab Plugins và overlay TUI

- `packages/tui/src/overlays/settings-selector.ts:438` — **ĐÃ MỞ, ĐÚNG**: `{ id: "plugins", label: `${theme.icon.package} Plugins`, short: theme.icon.package },` trong `getSettingsTabs()` (:431-440). Hit thứ hai ở :856. Đúng như đính chính của plan.
- `packages/tui/src/overlays/plugin-settings.ts:68-76` — **ĐÃ MỞ, ĐÚNG**: `export interface PluginSettingsManager {` :68, `getPluginSettings(name: string)` :71, `setPluginSetting(...)` :75, đóng :76.
- `packages/tui/src/overlays/plugin-settings.ts:85-89` — **ĐÃ MỞ, ĐÚNG**: `export interface PluginSettingsHost {` :85, `manager: PluginSettingsManager;` :86, đóng :89. Hai interface khác nhau, đúng như plan nói.
- `packages/tui/src/overlays/plugin-settings.ts:147` — **ĐÃ MỞ, ĐÚNG**: `const settings = await manager.getPluginSettings(plugin.name);`
- **Cả hai interface giữ nguyên từng byte.** Nếu `PluginSettingsManager` phải đổi (vd. thêm `deletePluginSetting`), mục này đã rò sang WI-8b.

### Bước 10 — Viết test mới

Xem §4. Neo: file mới `packages/coding-agent/test/config/plugin-settings-provenance.test.ts` (**chưa tồn tại** — đã `ls` xác nhận). Thư mục `test/config/` có **6** file `.test.ts` (compaction-threshold, model-registry, models-config-validation, settings-panel-clear, settings-registry, settings-reload) — plan ghi "7 file anh em", xem §7.

### Bước 11 — Viết lại hai test cũ

- `packages/coding-agent/test/plugin-config.test.ts:47-56` — **ĐÃ MỞ, ĐÚNG**: `test("set initializes missing settings in legacy runtime config", ...)` :47; :53-55 khẳng định `expect(lock.settings[pluginName]).toEqual({ "autoContext.enabled": true });`. **Đây là dòng đỏ-thật khi bước 4 đi vào**: sau khi `setPluginSetting` không còn ghi lockfile, `lock.settings[pluginName]` là `undefined` ⇒ đỏ.
- `packages/coding-agent/test/plugin-config.test.ts:114-119` — **ĐÃ MỞ, ĐÚNG**: :118 `await manager.setPluginSetting(pluginName, "mainBranchProtection", false);`, :119 `expect(await manager.getPluginSettings(pluginName)).toEqual({ mainBranchProtection: false });`. Thuộc test `resolves marketplace settings without restoring duplicate list entries` (bắt đầu :65). Đúng như plan.
- `packages/coding-agent/test/plugin-config-validate.test.ts:63` và `:116` — **ĐÃ MỞ, ĐÚNG**: `spyOn(PluginManager.prototype, "getPluginSettings").mockResolvedValue({ splitMode: "bogus" });` và `... { splitMode: "legacy" }`. Spy trên prototype, không mock module — hình dạng mà bản viết lại không được phá.
- **MỘT test nữa plan không liệt kê nhưng CÙNG chạm đường đọc cũ**: `plugin-config.test.ts:62` — `await expect(new PluginManager(tmpRoot).getPluginSettings(pluginName)).resolves.toEqual({});` trong test `list treats missing settings in legacy runtime config as empty` (:58-63). Hàm này sẽ **không** trả `{}` nữa nếu `getPluginSettings` bắt đầu trả về shape mới (ví dụ kèm key với giá trị `default`). Phải kiểm tra lại khi gõ.
- **Và**: `packages/coding-agent/test/modes/components/plugin-list-marketplace.test.ts:335` — `spyOn(manager, "getPluginSettings").mockResolvedValue({});` (đã mở, đúng). Spy trên instance, cùng shape.

### Bước 12 — Chạy cổng

Xem §5. `package.json:90` (plan ghi :94 — xem §7) là `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`.

### Bước 13 — Changelog

- `packages/coding-agent/CHANGELOG.md:3` — **ĐÃ MỞ, ĐÚNG**: `## [Unreleased]`. **Nhưng nội dung dưới nó đã đổi** — xem §7. `### Changed` phải được tạo mới, và vị trí chèn phải tính lại.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/config/plugin-settings-provenance.test.ts` (mới, 3 test)

Ba test theo đúng thứ tự này — thứ tự mã hoá hợp đồng chống mất dữ liệu.

**Test 1 — `reads a value that exists only in the legacy project-overrides file after migration`**
- Viết `<project>/.omp/plugin-overrides.json` với `settings: { "<plugin>": { <key>: <value> } }`.
- Chạy migration.
- Khẳng định **CẢ HAI**: `getPluginSettings` trả về `<value>` **VÀ** `handle.provenance(scope) === "project"`.
- *Vì sao quan trọng:* `setPluginSetting` **chưa bao giờ** ghi vào file này (xem `manager.ts:942-949` ở §2 — chỉ `#saveRuntimeConfig`). Với người dùng đã tự đặt giá trị ở phạm vi project bằng tay, đây là **nơi duy nhất** giá trị tồn tại. Bỏ đường đọc này → mọi cài đặt như vậy âm thầm đọc thành giá trị mặc định: mất dữ liệu không lỗi nào.

**Test 2 — `reads a value that exists only in the legacy runtime config after migration`**
- Viết `settings["<plugin>"]["<key>"]` vào `omp-plugins.lock.json` legacy.
- Chạy migration.
- Khẳng định **CẢ HAI**: giá trị được trả về **VÀ** `provenance(scope) === "global"`.

**Test 3 — `a declared environment variable beats a project-layer value and names itself`**
- Lớp project đang giữ một giá trị cho key; đặt biến môi trường mà plugin khai trong `definition.env`.
- Khẳng định **CẢ HAI**: `handle.get(scope)` bằng giá trị suy ra từ env **VÀ** `handle.provenance(scope) === "env"`.
- Dùng `withEnv` riêng từng test, có lưu/khôi phục.

**Bề mặt khẳng định — BẮT BUỘC:**
- Dùng `Setting.provenance(scope)` tại `packages/coding-agent/src/config/registry.ts:764-765` — **ĐÃ MỞ, ĐÚNG**:
  ```
  764		provenance(scope: ScopeLike): SettingProvenance {
  765			return this.#effectiveEnv(scope) !== undefined ? "env" : settingsOf(scope).getProvenance(this);
  ```
- **TUYỆT ĐỐI KHÔNG** dùng `Settings.getProvenance` tại `config/settings.ts:800-808` — **ĐÃ MỞ, ĐÚNG**:
  ```
  800		getProvenance(setting: AnySetting): SettingProvenance {
  801			if (!this.isConfigured(setting)) return "default";
  803			if (getByPath(this.#overrides, segments) !== undefined) return "runtime";
  804			if (getByPath(this.#configOverlay, segments) !== undefined) return "overlay";
  805			if (getByPath(projectLayerForMerge(this.#project), segments) !== undefined) return "project";
  806			if (getByPath(this.#global, segments) !== undefined) return "global";
  807			return this.#parent?.getProvenance(setting) ?? "default";
  ```
  Nó **không bao giờ** trả `"env"` — dù `"env"` nằm trong union `SettingProvenance` tại `config/settings.ts:62` (`export type SettingProvenance = "env" | "runtime" | "overlay" | "project" | "global" | "default";`, đã mở, đúng). Khẳng định qua sai bề mặt ⇒ xanh trong khi hợp đồng đã hỏng.

**Mẫu có thể chép (đã mở, đúng):**
- `packages/coding-agent/test/config/settings-registry.test.ts:25-43` — helper `withEnv` (lưu → set → `finally` khôi phục). Plan ghi `:1-46` cho mẫu thiết lập; thực tế phần setup registry bắt đầu ở `describe("settings registry")` :45 và ví dụ đầu tiên dùng `Settings.isolated(...)` ở :48.
- `packages/coding-agent/test/plugin-config.test.ts:25-28` — bốn `spyOn(piUtils, ...)` (`getPluginsDir`, `getPluginsLockfile`, `getProjectDir`, `getProjectPluginOverridesPath`); `afterEach` :31-33 gọi `mock.restore()`.
- `Settings.isolated(...)` — `config/settings.ts:694`.

**Cấm:** `mock.module()` (AGENTS.md — rò giữa các file). Cấm source-grep (đọc file `.ts` triển khai rồi khẳng định về văn bản của nó).

**Đỏ trên HEAD ngay hôm nay:** **CÓ, thật.** HEAD không có handle `plugins.*` nào để gọi `provenance()`, và `getPluginSettings` trả `{ ...global, ...project }` không có bước env. Đã xác nhận: `sed -n '925,965p' manager.ts` cho thấy đúng shape cũ.

**Test sẵn có phải vẫn xanh (baseline đã đo trên HEAD hôm nay):**
- `bun test test/plugin-config.test.ts test/plugin-config-validate.test.ts` → **9 pass / 0 fail** (đã chạy thật).
- `bun test test/config/settings-registry.test.ts` → **18 pass / 0 fail** (đã chạy thật).
- Hai test `plugin-config.test.ts:47-56` và `:114-119` **buộc phải viết lại** ở bước 11 — đỏ ngay khi bước 4 đi đúng hướng. Đỏ-và-chuyển-xanh thật.

---

## 5. Cổng

### Lệnh

```bash
bun run check:ts
# addon native ĐÃ build trên máy này. Nếu mất, build lại:
#   brew install ninja && bun --cwd=packages/natives run build   (exit 0)
cd packages/coding-agent && bun test test/config/plugin-settings-provenance.test.ts
cd packages/coding-agent && bun test test/plugin-config.test.ts test/plugin-config-validate.test.ts test/config/settings-registry.test.ts
cd packages/coding-agent && bun test test/modes/components/plugin-list-marketplace.test.ts
```

TUYỆT ĐỐI KHÔNG `tsc` / `npx tsc`.

### Cổng này có ĐỎ ĐƯỢC không? — **CÓ, nhưng chỉ một nửa. Nửa kia phải nói thẳng là không.**

**ĐỎ ĐƯỢC, thật:**
1. `check:ts` đỏ khi `toDefinition` không typecheck (thiếu `values` cho enum → `EnumDefinition.values` không optional ở `registry.ts:143`).
2. Test 1 đỏ nếu migration chỉ đọc MỘT trong hai file legacy.
3. Test 3 đỏ nếu `provenance` khẳng định qua `Settings.getProvenance` thay vì `Setting.provenance` — vì `getProvenance` không bao giờ trả `"env"`. **Đây là dòng đỏ mạnh nhất của cổng.**
4. `plugin-config.test.ts:47-56` đỏ ngay khi bước 4 đi vào (khẳng định shape lockfile cũ).

**KHÔNG ĐỎ ĐƯỢC — và đây là điều quan trọng nhất của mục này:**

1. **Migration chạy lại mỗi lần khởi động và HỒI SINH key đã xoá.** Ba test trên chỉ migrate **một lần**. Không có test nào trong bộ ba này phát hiện được. Cổng gốc của plan đã thừa nhận điều này và thêm kiểm tra thủ công (4). **Giữ nguyên kiểm tra thủ công đó** — đừng thay bằng "thêm một test nữa", vì test thứ tư vẫn không bắt được nếu marker được ghi đúng nhưng nội dung legacy bị sửa sau đó. Cách đúng: chạy migration **hai lần** trong cùng một test, xoá một key ở giữa, rồi chạy lại lần thứ hai và khẳng định key **không** quay lại. Đây là thứ làm cổng đỏ được thật; nếu không làm, cổng phải ghi "không bắt được" và giữ bước thủ công.
2. **Tên biến môi trường sai-nhưng-hợp-lý.** Dòng test dùng **đúng tên fixture khai báo** ⇒ một lỗi trượt trong cách đặt tên là **vô hình với cả suite**. Đây là lý do quy tắc ở bước 3 phải được **viết ra và review**, không được giao cho test.
3. **`deletePluginSetting` đổi ngữ nghĩa.** Không dòng test nào khẳng định nó. Xem open question 1.
4. **`envFallback: true` trong fixture.** Nếu fixture khai nó, test 3 đỏ **vì hành vi đúng** — và đó là cách dễ nhất để viết một test đỏ vì lý do sai rồi "sửa" bằng cách làm lỏng khẳng định. Fixture **KHÔNG** được khai `envFallback` (`registry.ts:480` mặc định `false`).
5. **`loader.ts:474` bị bỏ sót.** Không có test nào chạm tới nó (`git grep` xác nhận: **không có caller sản xuất nào**). Bỏ sót ⇒ cổng vẫn xanh. Phải review thủ công diff.
6. **Lớp bền vững sai.** Nếu `set` ghi vào một lớp mà đường đọc không tham chiếu tới, ba test vẫn có thể xanh nếu đường đọc đi cùng đường ghi. Cổng không bắt được.

**Cổng luôn xanh tệ hơn không có cổng.** Vì vậy: **đừng ghi "pass" cho (2)–(4) nếu chưa build addon và chưa thực sự chạy** (bước 12 của plan đã nói đúng điều này). Trên máy này addon **đã** build và hai suite baseline **đã** chạy xanh — nhưng ba test mới thì **chưa tồn tại**, nên (2) hiện **không** có bằng chứng.

---

## 6. Cạm bẫy riêng của work item này

1. **Registry chỉ-thêm ⇒ đăng ký động lúc load là một quả mìn.** `register()` ném `Setting "..." is registered twice` tại `config/registry.ts:787`; `byId.set` :789 và `ordered.push` :790 là các đột biến duy nhất; `resetRegistryForTest` :953-956 chỉ chạm `effects`. Lần load thứ hai của cùng một plugin trong một tiến trình — reload, suspend/resume, hay hai `PluginManager` trong một file test — **ném lỗi**. Và đây đúng là thứ WI-1, WI-7 (suspend/resume) và WI-9 (unload) sẽ dựng. `registerPluginSetting` idempotent phải là **bước 1**, trước mọi thứ khác.

2. **`loader.ts:474` không phải là bản sao "từng byte" — nó đọc NHIỀU thư mục, `manager.ts:153` chỉ đọc MỘT.** Đây là cạm bẫy số 1 khi gõ, và plan sai ở đây.
   - `manager.ts:154`: `getProjectPluginOverridesPath(this.#cwd)` → `dirs.ts:1066` → `path.join(getProjectAgentDir(cwd), "plugin-overrides.json")` = **`<cwd>/.omp/plugin-overrides.json`** — **một** đường dẫn.
   - `loader.ts:62`: `getConfigDirPaths("plugin-overrides.json", { user: false, cwd })` → `config.ts:162` → vòng lặp trên `PROJECT_CONFIG_BASES` (`config.ts:90-93`, dựng từ `priorityList` ở `config.ts:11-16`) = **`.omp`, `.claude`, `.codex`, `.gemini`** — **bốn** đường dẫn, lấy file đầu tiên parse được.
   - ⇒ Nếu bạn làm `loader.ts:474` "ủy nhiệm" na cho một hàm dùng `getProjectPluginOverridesPath`, bạn **âm thầm thu hẹp** bề mặt đọc: một người dùng đang đặt override ở `<project>/.claude/plugin-overrides.json` **hôm nay đọc được, sau thay đổi thành đọc `{}`**. Test 1 của bộ test **không bắt được** vì nó chỉ viết `.omp/`. Phải hoặc giữ `getConfigDirPaths` trong đường ủy nhiệm, hoặc ghi rõ trong PR rằng hành vi `.claude/.codex/.gemini` bị thu hẹp (và đó là một breaking change phải vào changelog).

3. **Hai store "đọc-hai-file" nhưng khác phạm vi — cùng một lý do bỏ sót.** Cả hai đều trông giống nhau lúc đọc bằng mắt, nên khi migrate `manager.ts` mà quên `loader.ts` (dễ xảy ra vì `git grep` không thấy caller nào — đã xác nhận), bạn **tạo lại đúng mô hình "hai đường đọc, bạn migrate một"** mà plan tự đặt là rủi ro chính. Thêm cạm bẫy 2 nữa thành ba lần cắt.

4. **`envFallback` làm ĐẢO thứ tự ưu tiên.** `#effectiveEnv` (`registry.ts:526-535`) làm env **nhường** cho bất kỳ lớp nào đã cấu hình khi definition đặt nó; mặc định `false` (`:480`). Fixture khai `envFallback: true` ⇒ test 3 đỏ **vì hành vi đúng**. Đây là cách dễ nhất để viết một test đỏ vì lý do sai rồi "sửa" nó bằng cách làm lỏng khẳng định.

5. **`DefinitionBase` không được export, `isCredential` là getter, và `default` không optional.** `registry.ts:88` `interface DefinitionBase` (không có `export`); `SettingDefinition` là union export ở `:170-176`. `isCredential` là `get isCredential(): boolean` (`:509`) — viết `isCredential()` sẽ không typecheck. Và `NumberDefinition.default: number | undefined` (`:135`) **không** optional trong khi `NumberSetting.default?: number` (`types.ts:75`) là optional — manifest không khai `default` sẽ không typecheck nếu truyền thẳng.

6. **`orderedSettings()` memoize vĩnh viễn.** `all-settings.ts:87` `let ordered: readonly AnySetting[] | undefined;`, `:91` `if (ordered) return ordered;` và không có đường invalidation. `createSettingsHost` (`config/settings-ui.ts:54`) và `config-cli.ts:201` đều duyệt `orderedSettings()`. ⇒ **Cài đặt plugin đăng ký ĐỘNG lúc load sẽ KHÔNG xuất hiện trong bảng cài đặt** sau lần gọi đầu tiên, trừ khi bạn export handle ra khỏi namespace module của một domain trong `DOMAINS` (`all-settings.ts:44-79`) **trước** lần gọi đầu tiên. Điều này mâu thuẫn với câu "Người dùng thấy" của plan ("chỉnh sửa được trong bảng cài đặt thông thường") và với ranh giới WI-8b. **Phải nêu khi trình bày.**

7. **Xoá `#saveRuntimeConfig` / `#loadProjectOverrides` sớm = mất dữ liệu.** Chúng chính là store đang bị thay thế nhưng là **nguồn đọc duy nhất** cho migration. Plan nói đúng: bước 6 vẫn cần chúng. Xoá ở bước 4 là bug mất dữ liệu — đúng thứ plan cảnh báo.

8. **Ba method phải GIỮ NGUYÊN chữ ký, nhưng `loader.ts:474` là hàm `export *` qua barrel** (`plugins/index.ts:5`) — thêm tham số bắt buộc là **breaking change** với extension bên thứ ba, và plan **không** nhắc tới điều này.

9. **`#schemaFor` phải dùng accessor có sẵn, không mở đường thứ tư tới manifest.** Ba điểm đọc manifest đã có: `manager.ts:256`, `:622`, `:845` (đã mở, cả ba đúng). Nếu bạn thêm một chỗ `Bun.file(...).json()` thứ tư cho manifest, bạn vừa phá luật "không có hai implementations" của AGENTS.md.

10. **Bốn test sẵn có chạm đường đọc, không phải hai.** Plan liệt kê `plugin-config.test.ts:47-56` và `:114-119`. Thực tế còn có `plugin-config.test.ts:62` (khẳng định `getPluginSettings` trả `{}` khi không có gì) và `plugin-list-marketplace.test.ts:335` (`spyOn(manager, "getPluginSettings").mockResolvedValue({})`). Cả hai đã mở và xác nhận.

---

## 7. Bảng neo hỏng / lệch (GHI RA, không sửa trong tài liệu)

| Neo trong tài liệu | Nên trỏ tới | Thực tế | Bằng chứng |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts:652` cho `getPluginsLockfile` | :662 | **:662**; `:652` là `getPluginsNodeModules` | `awk 'NR>=660 && NR<=666p' dirs.ts` → :661 doc `/** Plugin lock file (~/.omp/plugins/omp-plugins.lock.json). */`, :662 `export function getPluginsLockfile(home?: string): string {`, :663 `return path.join(getPluginsDir(home), "omp-plugins.lock.json");` |
| `packages/utils/src/dirs.ts:1046` cho `getProjectPluginOverridesPath` | :1066 | **:1066**; `:1046` nằm trong `getMarketplacesRegistryPath` | `awk 'NR>=1065 && NR<=1068p' dirs.ts` → :1065 doc, :1066 `export function getProjectPluginOverridesPath(cwd: string = getProjectDir()): string {`, :1067 `return path.join(getProjectAgentDir(cwd), "plugin-overrides.json");`. Dòng 1046 là `const registryPath = dirs.rootSubdir("marketplaces.json", "data");` |
| `package.json:94` cho `check:ts` | :90 | **:90**; `:94` là `"lint:ts"` | `grep -n '"check:ts"' package.json` → `90:		"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",`; dòng 94 là `		"lint:ts": "bun run --parallel lint:tools && bun run --workspaces --if-present lint",` |
| `packages/coding-agent/CHANGELOG.md:3` — "hiện KHÔNG có mục con nào, nên `### Changed` phải được TẠO MỚI ngay dưới nó (mục kế tiếp là `## [18.3.3]` ở :5)" | nói `[Unreleased]` không có mục con, kế tiếp là `## [18.3.3]` | `## [Unreleased]` ở :3 là **đúng**, nhưng **đã có** `### Security` ở :5 và mục kế tiếp là `## [18.4.0] - 2026-09-28` ở :9 — **không phải 18.3.3**. `### Changed` phải chèn **sau** `### Security`, không phải ngay dưới `## [Unreleased]` | `awk 'NR<=13p' CHANGELOG.md` → :3 `## [Unreleased]`, :5 `### Security`, :7 `- Project-scope MCP config ...`, :9 `## [18.4.0] - 2026-09-28` |
| `test/config/` "đã tồn tại với 7 file anh em" | 6 | **6** file `.test.ts` | `ls packages/coding-agent/test/config/*.test.ts` trả 6 dòng: compaction-threshold, model-registry, models-config-validation, settings-panel-clear, settings-registry, settings-reload |
| Đính chính: `loader.ts:474-483` | 474-482 | file dài **482** dòng; `:483` **vượt cuối file**. Hàm kết thúc ở :482 | `wc -l loader.ts` → `482`; `awk 'NR>=470 && NR<=482p'` cho thấy :482 là `}` đóng hàm, là dòng cuối |
| "Đã kiểm chứng: `bun test` cần addon native; trạng thái trước khi build: `0 pass / 1 fail`" | addon chưa build | **ĐÃ build** trên máy này; `bun test` chạy bình thường | `find packages/natives -name '*.node'` → `packages/natives/native/pi_natives.darwin-arm64.node`; `bun test test/config/settings-registry.test.ts` → `18 pass / 0 fail`; `bun test test/plugin-config.test.ts test/plugin-config-validate.test.ts` → `9 pass / 0 fail` |
| `loader.ts:474` là "bản sao từng byte" của `manager.ts:929-960` | hai hàm giống nhau | **SAI** — cùng phép trộn, nhưng **nguồn project khác nhau**: `manager.ts:154` đọc **một** đường (`getProjectPluginOverridesPath` → `.omp/`), `loader.ts:62` đọc **bốn** đường (`.omp`, `.claude`, `.codex`, `.gemini` qua `getConfigDirPaths`) | `manager.ts:154` vs `loader.ts:62`; `config.ts:11-16` `priorityList` và `config.ts:90-93` `PROJECT_CONFIG_BASES`; `dirs.ts:599-601` `getProjectAgentDir` |
| `selector-controller.ts:266` "hiện chỉ truyền `getProjectDir()`" | đúng | **Đúng** — nhưng nó cũng truyền `settings: createSettingsHost()` ở :265 ngay dòng trên, tức **host ĐÃ có đường tới Settings ngay cạnh đó** | `awk 'NR>=258 && NR<=271p'` → :265 `settings: createSettingsHost(),`, :266 `plugins: createPluginSettingsHost(getProjectDir()),` |

**Neo ĐÚNG, đã mở và xác nhận (không cần sửa):**
`extensibility/settings.ts:5` · `:10` · `manager.ts:115-121` · `:148` · `:153` · `:256` · `:622` · `:845` · `:929` · `:942` · `:954` · `loader.ts:474` · `settings-host.ts:14` · `:16` · `selector-controller.ts:266` · `registry.ts:48` · `:95` · `:143` · `:476-480` · `:509` · `:514` · `:515` · `:526-535` · `:716` · `:735` · `:764-765` · `:783-792` · `:787` · `:789` · `:790` · `:795` · `:953` · `settings.ts:53` · `:62` · `:694` · `:800-808` · `:828` · `:845-860` · `all-settings.ts:27` (import `extensibilitySettings`) · `:44-79` (`DOMAINS`) · `types.ts:48` · `:55` · `:57-93` · `:65` · `:156-163` (`:162` là `settings?`) · `settings-selector.ts:438` · `:431-440` · `plugin-settings.ts:68-76` · `:85-89` · `:147` · `plugin-cli.ts:911` · `:917` · `plugin-config.test.ts:25-28` · `:47-56` · `:62` · `:114-119` · `plugin-config-validate.test.ts:63` · `:116` · `plugin-list-marketplace.test.ts:335` · `settings-registry.test.ts:25-43` · `plugins/index.ts:5` · `loader.ts:48` · `:61`.

**Lưu ý về hai claim trong phần "Cần người xác nhận":**
- **Wave vs `blocks` mâu thuẫn** (`wave: 7` ghi "chạy SONG SONG với WI-8b", `blocks` ghi "8b bị chặn tường minh") — vẫn còn nguyên trong tài liệu.
- **Đếm số lớp không nhất quán** (6 lớp + env = 7, vs "cùng sáu lớp") — vẫn còn nguyên.
- **Cả hai đều cần người quyết TRƯỚC bước 0.** Đặc biệt open question 1 (`deletePluginSetting` nghĩa là gì) **phải** có câu trả lời trước bước 5, và open question 2 (lớp bền vững nào) **phải** có câu trả lời trước bước 0 — vì nó quyết định luôn `#settingsScope()` trả cái gì.
