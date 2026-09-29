## WI-8a. Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)

**Thay đổi gì:** Cài đặt plugin ngừng nằm trong hai file JSON vệt phụ và bắt đầu nằm bên trong các lớp Settings đã có sẵn dưới một namespace dành riêng `plugins.<id>.<key>`, để một cài đặt của plugin nhận đúng phân tầng sáu lớp (runtime → overlay → project → global → parent → default, cộng env) mà cài đặt lõi đã có, và `provenance()` có thể chỉ ra lớp nào thắng.
**Wave:** 7 trong 8 (M2) — cùng với WI-8b và WI-9; không phụ thuộc gì, cố ý giữ lại ở đây theo §5.1 C.
**Effort:** M (~2–3 ngày). Plan gọi là M với rủi ro THẤP; tài liệu này nâng rủi ro lên TRUNG BÌNH và giữ nguyên M, vì plan đếm thiếu bề mặt: nó nêu sáu file và bỏ sót `loader.ts:474`, còn phân tích rủi ro của nó hoàn toàn dựa vào việc test provenance sẽ bắt được lỗi — trong khi dạng lỗi khả dĩ hơn là trường hợp hồi sinh giá trị đã xoá và ngữ nghĩa delete mà không test nào chạm tới. Phần gõ kiểu (bộ chuyển schema→definition, bất đối xứng `envFallback`, registry chỉ-thêm) tinh vi hơn nhiều so với cách plan diễn đạt "substrate, not API".

**Người dùng thấy:** Cài đặt plugin trở nên chỉnh sửa được trong bảng cài đặt thông thường, kèm một lớp nguồn nhìn thấy được, và có thể bị ghi đè bởi một biến môi trường mà plugin tự khai báo. Không có gì thay đổi với người dùng không bao giờ chạm tới cài đặt plugin: các giá trị hiện có được di chuyển thầm lặng, tại chỗ, không hỏi và không phải xác thực lại.

> Lưu ý về phạm vi: đây là phần CORE-side. Nó KHÔNG được thêm gì vào `ExtensionAPI` (việc đó là WI-8b, thêm method thứ 30 lên 29 method hiện có) và KHÔNG được đổi danh sách tab cố định của bảng cài đặt hay mảng `DOMAINS` — `extensibilitySettings` đã nằm trong `DOMAINS` tại `config/all-settings.ts:64`, nên thêm helper namespace ở đây là miễn phí và không đụng tới blocker 1 của 8b. Tab Plugins của TUI và interface `PluginSettingsHost` tại `packages/tui/src/overlays/plugin-settings.ts:85` giữ nguyên từng byte.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/settings.ts` | sửa | Thêm các nguyên thủy namespace: `pluginSettingId(pluginId, key)`, `sanitizePluginSegment(raw)`, và một `registerPluginSetting(definition)` idempotent tra id trước khi gọi `register()`. Đây là nơi schema `manifest.settings` của một plugin trở thành handle có kiểu.<br>Neo: `packages/coding-agent/src/extensibility/settings.ts:5` (dòng `import { combine, register, ... } from "../config/registry"`) và `:10` (dòng `register({ id: "extensions", ... })` đầu tiên).<br>Ghi chú: module miền này ĐÃ nằm trong mảng `DOMAINS` tại `config/all-settings.ts:64` (import ở `:27`), nên bất cứ thứ gì đăng ký ở đây là sống ngay khi `config/settings.ts:53` chạy side-effect `import "./all-settings"`. Không cần sửa `all-settings.ts` — điều đó cũng nghĩa là file này KHÔNG đụng tới blocker 1 của WI-8b, nên 8b vẫn không bị chặn. | Có |
| `packages/coding-agent/src/extensibility/plugins/manager.ts` | sửa | Viết lại `getPluginSettings` (929), `setPluginSetting` (942) và `deletePluginSetting` (954) để đọc/ghi qua các handle `plugins.*` đã đăng ký trên thể hiện Settings MÀ BƯỚC 0 CHỌN — hôm nay `PluginManager` chỉ giữ `#cwd` và `#runtimeConfig`, không giữ thể hiện `Settings` nào, nên quyết định đó phải viết ra trước khi viết dòng đầu tiên — và thêm một migration idempotent chạy một lần gộp CẢ HAI file legacy vào dạng mới.<br>Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:929, 942, 954` (ba method public); migration đọc `manager.ts:148` (`#saveRuntimeConfig`) và `manager.ts:153` (`#loadProjectOverrides`).<br>Ghi chú: `#saveRuntimeConfig` (148-151) và `#loadProjectOverrides` (153-162) trở thành reader CHỈ DÙNG cho migration legacy. Plan KHÔNG nhắc rằng chúng phải được giữ lại cho migration, dù chúng chính là store đang bị thay thế — xoá chúng là cách bug mất dữ liệu mà plan cảnh báo thực sự xảy ra. | Có |
| `packages/coding-agent/src/extensibility/plugins/loader.ts` | sửa | Làm cho `getPluginSettings(pluginName, cwd)` ở cấp module (474) ủy nhiệm sang substrate mới thay vì tự cài lại phép trộn với hai file legacy.<br>Neo: `packages/coding-agent/src/extensibility/plugins/loader.ts:474`.<br>Ghi chú: PLAN KHÔNG BAO GIỜ NHẮC HÀM NÀY. Nó là một bản sao từng byte của phép trộn `{ ...global, ...project }`, được re-export qua barrel `extensibility/plugins`, và là đường đọc mà một extension gọi theo tên. Chỉ migrate `manager.ts` thì bề mặt hướng về extension vẫn đọc file legacy mãi mãi — một bản sao đúng lỗi "hai đường đọc, bạn migrate một" mà plan nêu là rủi ro chính. Đã kiểm chứng là không có caller nào trong repo, và đó chính là lý do nó sẽ bị bỏ sót: bên tiêu thụ là code bên thứ ba. | Có |
| `packages/coding-agent/test/config/plugin-settings-provenance.test.ts` | tạo | Test mới bảo vệ hợp đồng phân tầng: một cài đặt plugin có namespace và khai báo `env` bị biến môi trường ghi đè ở phạm vi project, và `provenance(scope)` GỌI TÊN lớp thắng.<br>Neo: file mới; thư mục `test/config/` đã tồn tại với 7 file anh em (settings-registry.test.ts, settings-reload.test.ts, …).<br>Ghi chú: mẫu thiết lập sao chép từ `test/config/settings-registry.test.ts:1-46` sẵn có — `Settings.isolated(...)` cho các dòng phân tầng registry và một helper `withEnv` cho env. Phía `PluginManager` dùng mẫu `spyOn(piUtils, ...)` đã chứng minh ở `test/plugin-config.test.ts:25-33`. Không có `mock.module()` ở bất cứ đâu. | Có |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Changed`: cài đặt plugin giờ được lưu trong file cài đặt chính và có thể được đặt bằng một biến môi trường mà plugin khai báo.<br>Neo: `packages/coding-agent/CHANGELOG.md:3`. | Có — `packages/coding-agent/CHANGELOG.md:3`<br>Đã kiểm chứng: `## [Unreleased]` nằm ở `packages/coding-agent/CHANGELOG.md:3` và hiện KHÔNG có mục con nào, nên `### Changed` phải được TẠO MỚI ngay dưới nó (mục kế tiếp là `## [18.3.3]` ở :5). |

### Các bước

**0. Quyết định thể hiện Settings nào là nhà của cài đặt plugin — và viết ra quyết định đó trước khi viết dòng đầu tiên.** Hôm nay `PluginManager` (`manager.ts:115-121`) chỉ giữ `#cwd` và `#runtimeConfig`, và `createPluginSettingsHost(cwd)` (`settings-host.ts:14`) dựng nó bằng `new PluginManager(cwd)` (`settings-host.ts:16`) — không có instance `Settings` nào trên toàn bộ đường plugin. Vì ba method phải GIỮ NGUYÊN chữ ký, manager buộc phải có một Settings. Ba lựa chọn, phải chọn một và viết ra: (a) nhận `Settings` qua constructor và để `createPluginSettingsHost` (`settings-host.ts:14`) lấy nó từ host — đúng nhất, nhưng đổi chữ ký constructor và phải chỉ ra host có Settings ở đâu (`selector-controller.ts:266` hiện chỉ truyền `getProjectDir()`); (b) manager tự `await Settings.load()` — tạo một instance thứ hai bên cạnh instance bảng cài đặt đang giữ, tức tái tạo đúng vấn đề hai store mà mục này sinh ra để gỡ; (c) `Settings.isolated()` (`config/settings.ts:694`) — không đọc được lớp global nên `handle.set` không bền vững, loại trừ. Lựa chọn nào cũng phải nói rõ `loader.ts:474` lấy Settings ở đâu, vì hàm cấp module đó không có manager lẫn session.

1. **Viết các nguyên thủy namespace vào `extensibility/settings.ts`:** `sanitizePluginSegment`, `PLUGIN_SETTINGS_ROOT`, `pluginSettingId`, `registerPluginSetting`. Tính idempotent ở bước 1 KHÔNG phải đánh bóng cho sạch — nó là khác biệt giữa mục này và một quả mìn dành cho WI-7 và WI-9. Trước khi viết, hãy tự xác nhận registry là append-only: grep `byId` và `ordered` trong `config/registry.ts` và quan sát rằng `byId.set` (:789) và `ordered.push` (:790) là các đột biến duy nhất, còn `resetRegistryForTest` (:953) chỉ chạm mảng `effects`, không bao giờ chạm `byId`/`ordered`. Thêm import `lookup` từ `../config/registry` cạnh import `combine`/`register` hiện có.
   Neo: `packages/coding-agent/src/extensibility/settings.ts:5`

2. **Xây bộ chuyển schema→definition.** Mỗi plugin khai báo cài đặt của nó trong manifest dưới dạng `PluginSettingSchema` (`extensibility/plugins/types.ts:48` — `settings?: Record<string, PluginSettingSchema>`), đây là một hình dạng lỏng hơn `SettingDefinition`. Ánh xạ (đọc `PluginSettingSchema` tại `extensibility/plugins/types.ts:57-93`, đừng đoán): `type` giữ nguyên vì `PluginSettingType` (:55) là tập con của vốn từ của `SettingDefinition`; `default` mang sang nguyên vẹn; **`values` (enum, bắt buộc — `EnumDefinition.values` ở `config/registry.ts:143` không phải optional, bỏ nó là definition không typecheck) mang sang `values`**; `description` thành `ui.description`; `env` mang thẳng sang `SettingDefinition.env` — KHÔNG được bỏ, đây là trường duy nhất nối manifest với tầng env của bước 3, và nó đã tồn tại sẵn ở `types.ts:65`; `min`/`max`/`step` thành `validate` hoặc bị ghi nhận là chưa hỗ trợ, phải nói ra chứ không im lặng bỏ. `secret` thì KHÔNG map thẳng: `ui.secret` chỉ tồn tại trên `UiString` (`config/registry.ts:48`), nên setting boolean/enum/number phải dùng `credential: true` trên `DefinitionBase` (:95) thay thế — `isCredential()` ở `registry.ts:509` đọc cả hai. Không có trường `options` nào trong schema: các lựa chọn của enum nằm ở `values`, và `UiEnum.options` là trường tuỳ chọn riêng cho submenu. Đọc manifest qua accessor CÓ SẴN (`manager.ts:256`, cùng hai điểm đọc khác ở `:622` và `:845`) — không mở thêm đường thứ tư tới manifest.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:256`

3. **Quyết định và viết ra quy tắc đặt tên biến môi trường TRƯỚC khi viết test, trong cùng một commit:** `OMP_<PLUGIN_ID>_<KEY>`, chữ hoa, `-` và `.` gộp thành `_`, được viết ra một cách tường minh trong `SettingDefinition.env` bởi chính plugin. Không bao giờ có tên biến nào được tổng hợp từ id. Ghi nhận bất đối xứng làm cho thao tác này là opt-in và do đó test được: một plugin không khai báo `env` thì không tham gia lớp thứ sáu chút nào, vì `envValue()` thoát ra ở `config/registry.ts:515` khi không có `envName`. Một dòng test khẳng định `"env"` cho một key không khai báo `env` PHẢI đỏ — đó là hành vi đúng, không phải lỗi để giấu.
   Neo: `packages/coding-agent/src/config/registry.ts:514`

4. **Viết lại `setPluginSetting` TRƯỚC** — đây là đường ghi và nó phải xuống trước mọi thay đổi đường đọc. Định tuyến nó qua `handle.set(scope, value)`, thứ ghi vào lớp global tại `config/settings.ts:828` và xếp hàng lần lưu debounce. Xác nhận ghi vào vệt phụ cũ đã biến mất: `setPluginSetting` không được còn gọi `#saveRuntimeConfig`. KHÔNG xoá `#saveRuntimeConfig` hay `#loadProjectOverrides` ở bước này — bước 6 vẫn cần chúng.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:942`

5. **Viết lại `getPluginSettings` và `deletePluginSetting`** đi qua cùng bộ handle đã đăng ký. `deletePluginSetting` trở thành `handle.unset(scope)` → `unsetGlobalValue` (`config/settings.ts:845`), xoá chỉ ở lớp GLOBAL và để một giá trị ở lớp project hiện lại đúng như cũ. Cần cờ: hành vi cũ xoá thẳng key. Hãy nêu lên (xem phần Cần người quyết) thay vì lặng lẽ ship thay đổi này.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:929` và `:954`

6. **Thêm migration một-lần, và làm cho hình dạng của nó đúng** — đây chính là toàn bộ rủi ro mất dữ liệu của mục này. Nó PHẢI đọc CẢ HAI hình dạng legacy, vì `setPluginSetting` chưa bao giờ lần nào ghi vào file thứ hai: (a) `settings[name]` trong runtime config do `#saveRuntimeConfig` ghi → `~/.omp/omp-plugins.lock.json` (đường dẫn từ `getPluginsLockfile`, `utils/src/dirs.ts:652`), và (b) `settings?.[name]` trong `<project>/.omp/plugin-overrides.json` (`ProjectPluginOverrides`, `extensibility/plugins/types.ts:156`; đường dẫn từ `getProjectPluginOverridesPath`, `utils/src/dirs.ts:1046`), đọc qua `#loadProjectOverrides` (`manager.ts:153`). Trộn với project thắng — đó là thứ tự `{ ...global, ...project }` hiện tại — rồi ghi vào các handle `plugins.*` qua `set()`. Bao nó bằng một marker hoàn thành đã được persist.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:148, 153`

7. **Marker hoàn thành không phải sổ sách, nó là một yêu cầu đúng đắn.** Không có nó, migration chạy lại mỗi lần khởi động và HỒI SINH một key mà người dùng đã cố ý xoá sau lần migrate đầu tiên — một giá trị đã bị xoá trong store mới vẫn còn nằm trong file legacy, nên một lần chạy lại sẽ âm thầm mang nó trở lại. Marker chỉ được ghi SAU khi dạng mới đã persist bền vững, và nó phải được namespaced cho migration này để một thay đổi substrate tương lai có thể migrate lại một cách có chủ đích. Xác minh đường ghi của chính marker là lớp Settings hoặc một file marker riêng — TUYỆT ĐỐI không phải một store plugin thứ ba, nếu không mục này đã tái tạo đúng vấn đề mà nó được viết ra để gỡ bỏ.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:148`

8. **Làm cho `getPluginSettings(pluginName, cwd)` cấp module trong `loader.ts` (474) ủy nhiệm sang substrate mới.** Hàm này là một bản sao từng byte của logic trộn, nó được re-export qua barrel `extensibility/plugins`, và nó là hàm một extension gọi theo tên. Để nó lại trên các file legacy nghĩa là bề mặt hướng về extension không bao giờ migrate. Plan không nhắc gì tới file này — đây là cách khả dĩ nhất để ship mục này một nửa, vì `git grep` không thấy caller nào trong repo và trông như code chết.
   Neo: `packages/coding-agent/src/extensibility/plugins/loader.ts:474`

9. **Để yên tab Plugins và overlay TUI.** `settings-selector.ts:438` (KHÔNG phải :435 — xem phần Đính chính) hard-code `{ id: "plugins", label: ... }` trong `getSettingsTabs()` (:431-440), và đường đọc `tui/src/overlays/plugin-settings.ts:147` đi qua interface `PluginSettingsManager` (khai báo ở `:68`, thân :68-76) — KHÔNG phải `PluginSettingsHost`, là interface khác, khai báo ở `:85` và giữ `manager: PluginSettingsManager` ở `:86`. Cả hai interface giữ nguyên từng byte. Việc gộp cài đặt plugin vào bảng cài đặt chính là blocker 4 của WI-8b, nằm ngoài phạm vi rõ ràng ở đây. Xác nhận bằng cách đọc rằng thân `PluginSettingsManager` không đổi — nếu interface host phải đổi, mục này đã rò sang 8b.
   Neo: `packages/tui/src/overlays/plugin-settings.ts:68` (PluginSettingsManager) và `:85` (PluginSettingsHost), `packages/tui/src/overlays/settings-selector.ts:438`

10. **Viết `test/config/plugin-settings-provenance.test.ts`** — ba nhóm, theo đúng thứ tự dưới đây, vì thứ tự đó mã hoá chính hợp đồng chống mất dữ liệu. Dòng 1 và dòng 2 là các dòng migration; dòng 3 là dòng phân tầng. Xem phần Hợp đồng test để biết khẳng định chính xác.
    Neo: `packages/coding-agent/test/config/plugin-settings-provenance.test.ts` (file mới)

11. **Cập nhật hai test cũ theo hợp đồng mới.** `plugin-config.test.ts:47-56` hôm nay khẳng định `setPluginSetting` ghi `settings[<plugin>][<key>]` vào `omp-plugins.lock.json`; sau bước 4 điều đó không còn đúng, và test sẽ đỏ. Viết lại nó thành: sau `setPluginSetting`, giá trị đọc lại qua `getPluginSettings` khớp VÀ `provenance(scope)` báo `"global"`, và lockfile KHÔNG bị ghi thêm khoá `settings`. Tương tự, `plugin-config.test.ts:114-119` gọi `setPluginSetting` rồi đọc lại qua `getPluginSettings` — viết lại theo đường đọc handle mới. Đây là dòng đỏ-và-chuyển-xanh thật, không phải xanh giả.
    Neo: `packages/coding-agent/test/plugin-config.test.ts:47-56` và `:114-119`

12. **Chạy cổng.** `bun test` bị CHẶN trong môi trường này cho tới khi native addon được build — harness đã báo và đã tái hiện: `0 pass, 1 fail` với `Cannot find module .../pi_natives.darwin-arm64.node`. Build trước bằng `bun --cwd=packages/natives run build`, rồi mới chạy test. `bun run check:ts` không cần addon và đã được xác nhận XANH trên HEAD ngay lúc này, nên nó là một cổng dùng được ngay hôm nay.
    Neo: `package.json` gốc:94 (`check:ts`)

13. **Thêm dòng changelog.** Tạo mới mục `### Changed` ngay dưới `## [Unreleased]` (`packages/coding-agent/CHANGELOG.md:3`, mục này hiện chưa có mục con nào) rồi thêm một dòng hướng về người dùng, không kể chuyện nguyên nhân: mở đầu bằng điều người dùng giờ làm được (cài đặt plugin nằm trong file cài đặt chính và tôn trọng một biến môi trường đã khai báo).
    Neo: `packages/coding-agent/CHANGELOG.md:3`

### Hình dạng code

```typescript
// ── packages/coding-agent/src/extensibility/settings.ts ──────────────────────
// Naming is the load-bearing part: `register()` THROWS on a duplicate id and the
// registry has NO unregister, so a colliding id breaks plugin load, not degrade.

/** `my-plugin` + `autoContext.enabled` → `my_plugin` + `auto_context_enabled`. */
export function sanitizePluginSegment(raw: string): string {
	return raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Reserved namespace root. Nothing outside this module may register under `plugins.`. */
export const PLUGIN_SETTINGS_ROOT = "plugins";

export function pluginSettingId(pluginId: string, key: string): string {
	return `${PLUGIN_SETTINGS_ROOT}.${sanitizePluginSegment(pluginId)}.${sanitizePluginSegment(key)}`;
}

/**
 * Register a plugin-owned setting, or return the handle a previous registration made.
 *
 * The registry is append-only (`byId.set` at config/registry.ts:789 is its only
 * mutation, `ordered.push` at :790 likewise) — there is no unregister and no registry
 * reset. A plugin loaded twice in one process — a reload, a suspend/resume, two
 * PluginManager instances in a test file — must get the SAME handle, not a throw.
 */
export function registerPluginSetting<const D extends SettingDefinition>(
	pluginId: string,
	definition: Omit<D, "id">,
): Setting<DefinitionValue<D>> {
	const id = pluginSettingId(pluginId, definition.id as unknown as string);
	const existing = lookup(id);
	if (existing) return existing as unknown as Setting<DefinitionValue<D>>;
	return register({ ...definition, id } as D);
}

// ── the env naming rule, decided in the same commit as the first test ───────────
// Convention (documented, NOT auto-generated): OMP_<PLUGIN_ID>_<KEY>, uppercase,
// `-`/`.` → `_`. The plugin states the literal name in `definition.env`; no variable
// name is ever synthesised from an id. A plugin that declares no `env` opts OUT of the
// sixth layer: `envValue()` returns undefined at config/registry.ts:515 when the
// definition declares none, so `provenance()` correctly reports the settings layer.

export const cfgGraphifyAutoContext = registerPluginSetting("@gaodes/pi-graphify", {
	id: "autoContext.enabled",
	type: "boolean",
	default: false,
	env: "OMP_GRAPHIFY_AUTO_CONTEXT_ENABLED",
	ui: { tab: "tools", group: "Graphify", label: "Auto Context", description: "…" },
});

// ── packages/coding-agent/src/extensibility/plugins/manager.ts ──────────────────
// ORDER IS MANDATORY: write the new shape → read BOTH legacy shapes → drop the old reads.

async getPluginSettings(name: string): Promise<Record<string, unknown>> {
	const settings = this.#settingsScope();
	const out: Record<string, unknown> = {};
	for (const [key, schema] of Object.entries(this.#schemaFor(name))) {
		const handle = registerPluginSetting(name, toDefinition(key, schema));
		out[key] = handle.get(settings);
	}
	return out;
}

async setPluginSetting(name: string, key: string, value: unknown): Promise<void> {
	const handle = registerPluginSetting(name, toDefinition(key, this.#schemaFor(name)[key]));
	handle.set(this.#settingsScope(), value); // global layer; persisted to config.yml
}

async deletePluginSetting(name: string, key: string): Promise<void> {
	// SEMANTIC CHANGE — see open_questions. `unset` clears the GLOBAL layer only, so a
	// project-layer value correctly resurfaces. Today the key is gone from both files.
	registerPluginSetting(name, toDefinition(key, this.#schemaFor(name)[key])).unset(this.#settingsScope());
}
```

### Hợp đồng test

Một cài đặt plugin có namespace tham gia vào ĐÚNG phân tầng sáu lớp như một cài đặt lõi: một giá trị ở lớp project bị biến môi trường mà plugin khai báo ghi đè, và `Setting.provenance(scope)` GỌI TÊN lớp đã thắng.

**Nếu hồi quy, người tiêu dùng thấy:** Trên chính substrate mà mục này thay thế, lớp env bị bỏ qua trong im lặng với các key của plugin và không có gì để báo nguồn nào thắng, vì store vệt phụ không có lớp nào để gọi tên. Người dùng đặt `OMP_GRAPHIFY_AUTO_CONTEXT_ENABLED=1`, plugin vẫn đọc `false` từ file project, và cả plugin lẫn UI đều không nói được vì sao. Điều này vô hình cho tới khi một người dùng thực sự có một cài đặt plugin được cấu hình — và đó chính là lý do nó sống sót qua năm vòng review.

**Phải khẳng định qua:** `Setting.provenance(scope)` tại `config/registry.ts:764-765`, TUYỆT ĐỐI KHÔNG dùng `Settings.getProvenance` (`config/settings.ts:800-808`). Cái sau kiểm tra runtime → overlay → project → global → parent → default và không bao giờ có thể trả về `"env"`, dù `"env"` nằm trong union `SettingProvenance` tại `settings.ts:62`. Khẳng định qua sai bề mặt sẽ xanh trong khi hợp đồng đã hỏng.

**Phải khẳng định cả hai:** CẢ giá trị đã phân giải LẪN lớp được báo. Chỉ khẳng định giá trị sẽ xanh trên một store tình cờ đọc đúng file — và đó chính xác là kiểu xanh-nhầm mà plan cảnh báo.

**Đỏ trên HEAD ngay hôm nay:** Có. Trên HEAD, `getPluginSettings` trả về `{ ...global, ...project }` hoàn toàn không có bước env, và bề mặt `Setting.provenance(scope)` không tồn tại cho một key của plugin vì chưa handle `plugins.*` nào được đăng ký.

Ba dòng test, theo thứ tự này vì thứ tự mã hoá chính hợp đồng chống mất dữ liệu:

1. **File test:** `packages/coding-agent/test/config/plugin-settings-provenance.test.ts`
   **Tên dòng:** một giá trị chỉ tồn tại trong file project-overrides legacy vẫn đọc lại được sau migration.
   **Vì sao:** cảnh báo sắc nhất của chính plan: `setPluginSetting` CHƯA BAO GIỜ ghi vào `.omp/plugin-overrides.json`, nên với một người dùng đã tự đặt giá trị plugin ở phạm vi project bằng tay, file đó là nơi DUY NHẤT giá trị tồn tại. Bỏ đường đọc này đi thì mọi cài đặt như vậy âm thầm đọc thành giá trị mặc định — mất dữ liệu không có lỗi nào, chỉ lộ ra với những người đã có cài đặt plugin được cấu hình.
   **Khẳng định:** ghi `<project>/.omp/plugin-overrides.json` với `settings: { "<plugin>": { <key>: <value> } }`, chạy migration, và khẳng định giá trị được `getPluginSettings` trả về **VÀ** `provenance(scope)` của handle báo `"project"`.

2. **File test:** `packages/coding-agent/test/config/plugin-settings-provenance.test.ts`
   **Tên dòng:** một giá trị chỉ tồn tại trong runtime config legacy vẫn đọc lại được sau migration.
   **Khẳng định:** ghi `settings["<plugin>"]["<key>"]` vào `omp-plugins.lock.json` legacy, chạy migration, khẳng định giá trị được trả về **VÀ** `provenance(scope)` báo `"global"` (nó là một giá trị lớp global, nên nó rơi vào lớp global của dạng mới).

3. **File test:** `packages/coding-agent/test/config/plugin-settings-provenance.test.ts`
   **Tên dòng:** lớp env — một biến môi trường đã khai báo thắng giá trị lớp project và TỰ GỌI TÊN MÌNH.
   **Khẳng định:** khi lớp project đang giữ một giá trị cho key, đặt biến môi trường mà plugin khai báo trong `definition.env`, và khẳng định CẢ `handle.get(scope)` bằng giá trị suy ra từ env LẪN `handle.provenance(scope) === "env"`. Dùng `withEnv` riêng từng test, có lưu/khôi phục (chép helper tại `test/config/settings-registry.test.ts:25-43`); KHÔNG đột biến `process.env` ở phạm vi file — một ghi env làm nhiễu cả suite là một test hỏng theo AGENTS.md.

**Cái bẫy ở dòng 3:** `#effectiveEnv` (`config/registry.ts:526-535`) làm cho env NHƯỜNG cho một lớp đã cấu hình khi definition đặt `envFallback`. Mặc định là `false` (`registry.ts:480` — `typeof env === "object" ? (env.fallback ?? false) : false`), nên env thắng theo mặc định và dòng test xanh. Nhưng nếu setting trong fixture khai báo `envFallback: true`, biến env sẽ thua giá trị project và `provenance` báo `"project"` — dòng test sẽ đỏ, và ĐỎ VÌ HÀNH VI ĐÚNG. Fixture KHÔNG ĐƯỢC khai báo `envFallback`. Plan không bao giờ nhắc cờ này; nó là cách dễ nhất nhất để viết một test đỏ vì lý do sai rồi "sửa" nó bằng cách làm lỏng khẳng định.

**Cấm `mock.module()`:** TUYỆT ĐỐI không `mock.module()` — nó đột biến module registry toàn cục và rò ra giữa các file. Các dòng `PluginManager` dùng `spyOn(piUtils, "getPluginsDir")` / `getPluginsLockfile` / `getProjectDir` / `getProjectPluginOverridesPath` riêng từng test, với `mock.restore()` trong `afterEach`, đúng như `test/plugin-config.test.ts:25-38` đã làm. Các dòng registry dùng một thể hiện `Settings.isolated(...)` thật trên một thư mục tạm — không mock module nào cả.

**Cấm source-grep:** Test được phép khẳng định trên file config tạm mà nó đã ghi (đó là hành vi). Nó KHÔNG được phép đọc một file triển khai `.ts` và khẳng định về văn bản của file đó — AGENTS.md cấm, và việc đó không thay thế được cho bất kỳ dòng nào ở đây.

**Test sẵn có phải vẫn xanh:**
- `packages/coding-agent/test/plugin-config.test.ts` — hai test `:47-56` và `:114-119` khẳng định HÌNH DẠNG LOCKFILE LEGACY và buộc phải viết lại ở bước 11; chúng là tín hiệu sớm tốt nhất vì đỏ NGAY khi bước 4 đi vào đúng hướng. Phần còn lại của file không được phá.
- `packages/coding-agent/test/plugin-config-validate.test.ts` — spy `PluginManager.prototype.getPluginSettings` tại `:63` và `:116`, đúng hình dạng mà bản viết lại không được phá.
- `packages/coding-agent/test/config/settings-registry.test.ts` — tham chiếu cho mẫu phân tầng và `withEnv`; cũng là nơi một hồi quy ở đây sẽ lộ ra.

### Xác minh

```bash
bun run check:ts
bun --cwd=packages/natives run build
cd packages/coding-agent && bun test test/config/plugin-settings-provenance.test.ts
cd packages/coding-agent && bun test test/plugin-config.test.ts test/plugin-config-validate.test.ts test/config/settings-registry.test.ts
```

- `bun run check:ts` — PHẢI pass. Không cần native addon. ĐÃ XÁC NHẬN XANH trên HEAD (milestone-1, 808b365) lúc viết: oxlint + oxfmt sạch, cả 16 package check:types Done, không lỗi.
- `bun --cwd=packages/natives run build` — bắt buộc trước mọi `bun test`; ĐÃ XÁC NHẬN LÀ BẮT BUỘC. Đã tái hiện lỗi chặn: `bun test test/config/settings-registry.test.ts` trả về `0 pass / 1 fail` với `Cannot find module .../native/pi_natives.darwin-arm64.node`.
- Lệnh test thứ ba là test mới; chỉ chạy được sau khi addon đã build.
- Lệnh test thứ tư là các test sẵn có mà thay đổi này không được phá.
- TUYỆT ĐỐI KHÔNG `tsc` / `npx tsc` (AGENTS.md). Chỉ `bun check` và `bun test`.

### Cổng hoàn thành

DONE nghĩa là đủ cả bốn điều: (1) `bun run check:ts` xanh; (2) `bun test test/config/plugin-settings-provenance.test.ts` pass cả ba dòng — hai dòng migration và dòng env/provenance; (3) `bun test test/plugin-config.test.ts` CHỈ CÒN các test không chạm đường ghi cũ, và `bun test test/plugin-config-validate.test.ts test/config/settings-registry.test.ts` vẫn xanh nguyên vẹn; test `set initializes missing settings in legacy runtime config` (`plugin-config.test.ts:47-56`) và test `resolves marketplace settings without restoring duplicate list entries` (`:114-119`) PHẢI được viết lại theo hợp đồng mới trong chính commit đó, không phải xanh bằng cách giữ nguyên; (4) migration đã được chạy thử thủ công theo đúng thứ tự đã nêu trên một project tạm thật chứa một file `.omp/plugin-overrides.json` viết tay, và một giá trị đã xoá khỏi store mới vẫn còn mất sau lần chạy thứ hai (kiểm tra hồi sinh ở bước 7). Lưu ý rằng (2) KHÔNG thể đánh giá trong môi trường này cho tới khi native addon được build — hãy coi (1) là cổng duy nhất chạy được ngay, còn (2)–(4) là bị chặn, KHÔNG phải là đã pass.

Cổng này CÓ thực sự đỏ được không: **CÓ** cho kiểm tra kiểu và các dòng test. Dòng provenance là một ca đỏ-chuyển-xanh thật: trên HEAD không tồn tại handle `plugins.*` nào để gọi `provenance()`, nên nó không thể xanh trước khi công việc hoàn tất. Hai dòng migration cũng là đỏ-chuyển-xanh thật: trên HEAD substrate mới không tồn tại, và một migration chỉ đọc MỘT trong hai file legacy sẽ để lại dòng 1 hoặc dòng 2 đỏ. Cổng sẽ KHÔNG bắt được: một migration chạy được nhưng chạy lại mỗi lần khởi động và hồi sinh key đã xoá (chỉ bước kiểm tra thủ công ở (4) bắt được), một tên biến môi trường sai-nhưng-hợp-lý (dòng test dùng đúng tên fixture khai báo nên một lỗi trượt trong cách đặt tên là vô hình với suite — vì vậy quy tắc đặt tên ở bước 3 phải được viết ra và review, không được để cho test), và thay đổi ngữ nghĩa của `deletePluginSetting` (không dòng nào khẳng định nó). Ba đó là những lỗ hổng trung thực của cổng này.

### Phụ thuộc

- **depends_on:** không.
- **blocks:**
  - WI-8b (Phương án B, `pi.registerSetting`) — bị chặn tường minh bởi mục này. Lý do rất cụ thể: blocker 2 của 8b là một setting id là chuỗi trần không có cơ chế ép namespace, nên một extension có thể đụng id với một id lõi, và `register()` ném tại `config/registry.ts:787`, làm hỏng lúc load thay vì suy giảm. Helper namespace dựng ở bước 1 CHÍNH LÀ cơ chế ép đó.
  - WI-11 / WI-12 (wave 8 của M2, chỉ thiết kế) — cả hai đều suy luận về vấn đề store thứ hai mà mục này gỡ bỏ. Ghi chú của chính plan ở dòng 5994 gọi một thiết kế đóng góp MCP là "đúng vấn đề store thứ hai mà WI-8a Phương án A sinh ra để giải quyết".
  - WI-9 (unload) — gián tiếp. Chỉ sau khi mục này xuống, trạng thái cài đặt plugin mới do một hệ thống sở hữu với một substrate duy nhất mà unload thực sự dọn dẹp được.

### Cách sai dễ nhất

Đăng ký cài đặt plugin động tại thời điểm load vào một registry KHÔNG có unregister (`byId.set` tại `config/registry.ts:789` là đột biến duy nhất; `resetRegistryForTest` tại :953 chỉ chạm `effects`). Lần load đầu chạy; lần load THỨ HAI của cùng plugin trong cùng process — một reload, một suspend/resume, một `PluginManager` thứ hai trong một file test — ném `Setting "plugins.x.y" is registered twice`. Đó không phải crash ở một nhánh hiếm: suspend/resume chính là thứ WI-1 và WI-7 dựng, còn unload là thứ WI-9 dựng, nên mục này theo đúng đặc tả sẽ đặt một quả mìn ngay trên đường đi của hai mục kế sau nó. Lập luận của chính plan về namespacing là cái throw trùng id, và rồi nó lại đặc tả một thiết kế đi thẳng vào chính cái throw đó. Cách sửa là `registerPluginSetting` trả về handle đã có khi tra cứu lại trùng, và nó phải là bước 1, trước mọi thứ khác.

Cách sai dễ nhất thứ hai: chỉ migrate `manager.ts` và bỏ sót `loader.ts:474` — vì `git grep` không thấy caller trong repo và trông như code chết, trong khi người tiêu thụ thật của nó là code bên thứ ba.

### Cần người quyết

- **`deletePluginSetting` đổi nghĩa.** Hôm nay nó xoá thẳng key khỏi store đã trộn. `handle.unset()` chỉ xoá lớp GLOBAL (`unsetGlobalValue`, `config/settings.ts:845`), nên một giá trị ở lớp project sẽ hiện lại đúng như cũ — đó là phân tầng đúng, nhưng nó là thay đổi hành vi đối với `omp plugin config delete` (`cli/plugin-cli.ts:917`, subcommand `delete` ở :911). "unset" nghĩa là "quên override global của tôi" (phân tầng đúng, chấp nhận thay đổi) hay là "xoá ở mọi nơi" (cần thêm một đường ghi ở lớp project)? Cần một con người quyết; nó nhìn thấy được với người dùng.
- **Lớp Settings nào là nhà bền vững của một cài đặt plugin?** Plan nói "overlay" và không bao giờ nêu tên lớp. Global (`handle.set` → `config.yml`) là thứ đường lõi có kiểu đang làm và là lớp duy nhất persist được mà không cần máy mới, nhưng nó đặt các key máy ghi của bên thứ ba vào một file người dùng tự tay chỉnh. Chính plan cũng cờ bạt căng này ở dòng 5946 ("Settings is user-edited YAML and is probably the WRONG substrate for internal plugin state"). Nếu câu trả lời là "không phải lớp global", mục này sẽ mọc thêm một store mới và toàn bộ cách kể "store thứ hai" sẽ đổi.
- **Marker migration nên là một key ở lớp Settings hay một file marker riêng?** File marker đơn giản hơn và không thể bị người dùng dọn config xoá mất; một key Settings thì ít một file. Cả hai đều bảo vệ được — nhưng nó phải là một lựa chọn có chủ đích, không phải tai nạn, bởi một người dùng xoá nó sẽ gặp bug cài đặt hồi sinh.
- **Một cài đặt plugin có nên được phép khai báo `envFallback` không?** Quy tắc đặt tên ở bước 3 nói đến opt-in; nó không nói gì về opt-out đảo ngược thứ tự ưu tiên. Để một plugin bên thứ ba khai báo `envFallback: true` nghĩa là biến env của nó nhường cho một file project, điều gần như chắc chắn ngược với điều một tác giả plugin dự định.
- **Điều gì xảy ra với `ProjectPluginOverrides.disabled` và `.features`?** Mục này chỉ migrate `settings`. `.omp/plugin-overrides.json` sống sót với hai trong ba trường của nó, nên file KHÔNG bị xoá. Hãy xác nhận đó là chủ ý chứ không phải làm nửa.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `registry.ts:476-480` — lớp env là opt-in, `envValue()` trả undefined khi một setting không khai báo `definition.env`. | STALE LINE, SOUND CONCLUSION (DÒNG CŨ, KẾT LUẬN ĐÚNG) | Dòng 476-481 là thân CONSTRUCTOR (`const env = definition.env;` ở :476, `this.envName = ...` ở :477, `this.#parseEnv = ...` ở :478-479, `this.envFallback = ...` ở :480), không phải `envValue`. Hàm plan muốn nói là `envValue()` tại `config/registry.ts:514-523`, mà guard opt-in của nó là dòng đầu tiên: `if (!this.envName \|\| !this.#parseEnv) return undefined;` (:515). Hãy trích :515, hoặc :514-523.<br>Bằng chứng: grep -n trên `packages/coding-agent/src/config/registry.ts`: `envValue():` ở 514, `#effectiveEnv` ở 526, và dòng 480 là `this.envFallback = typeof env === "object" ? (env.fallback ?? false) : false;` — một phép gán trong constructor. Kết luận của plan đúng, con trỏ của nó thì không. |
| `Settings.getProvenance` (settings.ts:800-808) kiểm tra năm lớp và không bao giờ trả về `"env"`; chỉ `Setting.provenance(scope)` tại `registry.ts:764-765` mới trả được. | VERIFIED CORRECT (ĐÃ XÁC NHẬN ĐÚNG) | Không cần sửa. Đây là claim mang sức nặng nhất của toàn mục và nó đúng như được viết. `getProvenance` tại `config/settings.ts:800-808` trả runtime/overlay/project/global/parent-default, còn `Setting.provenance` tại `config/registry.ts:763-765` trả `this.#effectiveEnv(scope) !== undefined ? "env" : settingsOf(scope).getProvenance(this)`. Thành viên `"env"` của union tại `settings.ts:62` chỉ tới được từ đúng một bề mặt.<br>Bằng chứng: sed `settings.ts:800-808` cho thấy return năm nhánh kết thúc bằng `return this.#parent?.getProvenance(setting) ?? "default";`. sed `registry.ts:763-765` cho thấy ternary `#effectiveEnv`. Test phải khẳng định qua cái sau. |
| `register()` tại `registry.ts:783-792` ném khi trùng id, và đó là lý do namespacing mang sức nặng. | VERIFIED CORRECT, BUT INCOMPLETE — AND THE OMISSION IS THE ITEM'S BIGGEST RISK (ĐÚNG NHƯNG THIẾU — VÀ PHẦN THIẾU LÀ RỦI RO LỚN NHẤT CỦA MỤC) | Cái throw là có thật ở :787 và khối doc bắt đầu ở :783, nên khoảng dòng đúng. Điều plan không bao giờ nói là registry chỉ-THÊM: `byId.set` (:789) là đột biến duy nhất của `byId`, `ordered.push` (:790) là đột biến duy nhất của `ordered`, và `resetRegistryForTest` (:953) chỉ chạm mảng `effects`. KHÔNG có unregister. Nên một thiết kế đăng ký cài đặt plugin động lúc load làm lần load thứ hai của cùng plugin trong một process ném lỗi — và reload, suspend/resume (WI-1, WI-7) cùng unload (WI-9) đúng là những thứ các wave sau dựng. Đặc tả này thêm một `registerPluginSetting` idempotent trả về handle đã có khi tra cứu lại trùng, đặt ở bước 1.<br>Bằng chứng: grep -n `'byId'` trên registry.ts trả đúng bốn hit: khai báo :778, kiểm tra `has()` :787, `set` :789, `get` :796. grep -n `'ordered'` trả khai báo :779 và `push` :790. `resetRegistryForTest` tại :953 có thân gọi `unbindEffects()` và duyệt `effects` — không bao giờ `byId`. |
| Store vệt phụ là `manager.ts:929-960` đọc từ hai file, và migrate vùng đó chính là công việc. | INCOMPLETE — a second copy of the same merge exists and the plan never mentions it (THIẾU — có một bản sao nữa của đúng phép trộn đó và plan không bao giờ nhắc) | `packages/coding-agent/src/extensibility/plugins/loader.ts:474-483` export một `getPluginSettings(pluginName, cwd)` cấp module, là bản sao từng byte của phép trộn `{ ...global, ...project }` trên đúng hai file legacy đó. Nó được re-export qua barrel `extensibility/plugins` (`plugins/index.ts:5`) và nó là hàm một EXTENSION gọi theo tên. Chỉ migrate `manager.ts` thì đường đọc hướng về extension vẫn nằm trên file legacy mãi mãi — đúng cái thất bại "hai đường đọc, bạn migrate một" mà plan nêu là rủi ro chính, tái lập y hệt ở file kế bên. Nó dễ bị bỏ sót chính vì `git grep` không thấy caller nào trong repo: bên tiêu thụ là code bên thứ ba. Bước 8 của đặc tả này phủ nó.<br>Bằng chứng: sed `loader.ts:460-483` cho thấy `export async function getPluginSettings(pluginName: string, cwd: string)` gọi `loadRuntimeConfig()` và `loadProjectOverrides(cwd)` rồi trả `{ ...global, ...project }`. `git grep -n getPluginSettings` trên `packages/` chỉ trả về manager.ts, loader.ts, plugin-cli.ts, tui/overlays/plugin-settings.ts và các test — không có caller production nào của bản loader. |
| Tab cài đặt Plugins nằm ở `packages/tui/src/overlays/settings-selector.ts:435` và phải được để yên bởi mục này. | STALE LINE, SOUND INSTRUCTION (DÒNG CŨ, CHỈ DẪN ĐÚNG) | Tab hard-code nằm ở :438, không phải :435: `{ id: "plugins", label: ... }`, nằm trong `getSettingsTabs()` (:431-440). Có một hit thứ hai ở :856. Chỉ dẫn để yên là đúng và thuộc blocker 4 của WI-8b, không thuộc mục này. Cùng một dòng sai này lặp lại trong danh sách file của WI-8b.<br>Bằng chứng: grep -n `'id: "plugins"'` trên settings-selector.ts trả về :438 và :856; sed 420-450 xác định tab Plugins ở 438 bên trong `getSettingsTabs()`. |
| Hình dạng `ProjectPluginOverrides` tại `plugins/types.ts:156-163`, với `settings?` ở `:162`. | VERIFIED CORRECT (ĐÃ XÁC NHẬN ĐÚNG) | Không cần sửa. Interface khai báo ở :156, đóng ở :163, và `settings?` nằm ở :162; `disabled?` ở :158 và `features?` ở :160 (dòng :157/:159/:161 là JSDoc). Điều này liên quan vì mục này chỉ migrate `settings` — file sống sót với hai trong ba trường, nên nó KHÔNG bị xoá.<br>Bằng chứng: sed `types.ts:156-163` cho thấy đúng sáu dòng nêu trên, theo thứ tự. |
| Lớp env là nơi giá trị của test bị biến môi trường ghi đè, và plan nói ra rằng một dòng khẳng định `"env"` mà không có `env` khai báo phải đỏ. | VERIFIED, WITH AN UNSTATED INVERSION THE PLAN MISSES (ĐÚNG, KÈM MỘT ĐẢO NGƯỢC CHƯA NÊU MÀ PLAN BỎ SÓT) | Cả hành vi opt-in lẫn hành vi đỏ-khi-không-khai-báo đều đúng. Điều plan không nhắc là `envFallback`: `#effectiveEnv` (`config/registry.ts:526-535`) làm cho env NHƯỜNG cho bất kỳ lớp nào đã cấu hình khi definition đặt nó, và mặc định là `false` (:480), nên env thắng theo mặc định. Một fixture khai báo `envFallback: true` sẽ khiến giá trị project thắng và `provenance` báo `"project"` — một test đỏ vì hành vi đúng, và đúng là hình dạng sai lầm mà người ta "sửa" bằng cách làm lỏng khẳng định. Đặc tả này nêu nó là cái bẫy ở dòng 3.<br>Bằng chứng: sed `registry.ts:526-535` cho thấy `if (value === undefined \|\| !this.envFallback) return value;` rồi tới nhánh `envFallback === true` và nhánh so sánh chuỗi. registry.ts:480 là `this.envFallback = typeof env === "object" ? (env.fallback ?? false) : false;`. |
| Rủi ro migration đã được bao phủ trọn vẹn bởi test provenance chạy phân tầng thật. | OVERSTATED (NÓI QUÁ) | Test provenance bảo vệ PHÂN TẦNG, không bảo vệ MIGRATION. Ba dạng lỗi sống sót qua nó: (a) một migration không có marker hoàn thành chạy lại mỗi lần khởi động và hồi sinh các key người dùng đã xoá sau lần chạy đầu — không thể phát hiện bởi một suite chỉ migrate một lần; (b) lớp bền vững mới sai và giá trị được ghi vào nơi đường đọc không hề tham chiếu tới; (c) `deletePluginSetting` lặng lẽ đổi nghĩa từ "xoá thẳng" thành "chỉ xoá lớp global". Vì vậy cổng của đặc tả này thêm một bước thủ công (4) phủ ca hồi sinh khi chạy lại, cùng hai open_question liên quan, thay vì dựa vào test một mình.<br>Bằng chứng: `unsetGlobalValue` (`config/settings.ts:845-859`) chỉ gọi `deleteByPath(this.#global, segments)`; không có thao tác xoá ở lớp project nào trong method đó, và không có thứ tương đương nào tồn tại trong delete vệt phụ cũ. |
| Môi trường: `bun test` báo 0 pass vì native addon chưa build; `bun run check:ts` là cổng dùng được. | VERIFIED EXACTLY (ĐÃ XÁC NHẬN CHÍNH XÁC) | Không cần sửa. Đã tái hiện cả hai. `bun test test/config/settings-registry.test.ts` → `0 pass / 1 fail`, `Cannot find module .../native/pi_natives.darwin-arm64.node`, kèm gợi ý của chính loader `bun --cwd=packages/natives run build`. `bun run check:ts` → sạch, oxlint + oxfmt pass trên 5445 files, cả 16 package `check:types` Done. Lệnh build là nửa đầu của cổng; nửa test bị chặn cho tới khi nó chạy.<br>Bằng chứng: chạy trực tiếp cả hai lệnh trong repo ở HEAD 808b365 trên nhánh milestone-1. |

## Cần người xác nhận

Hai điểm tự mâu thuẫn nhẹ trong chính đặc tả, ghi ra thay vì tự sửa:

- **Wave và `blocks` không thống nhất.** Trường `wave` ghi "7 of 8 (M2) — alongside WI-8b and WI-9", tức là 8b chạy SONG SONG với mục này; nhưng `blocks` ghi rằng "WI-8b … explicitly gated on this item". Hai mốc quan hệ đó không vừa nhau nếu đọc cứng. Cần xác nhận: WI-8b nằm cùng wave nhưng phải chạy SAU trong wave, hay thực sự phải dời sang wave 8.
- **Đếm số lớp không nhất quán.** `one_line` và ghi chú trong `files_touched` đều viết "the same six-layer tiering (runtime → overlay → project → global → parent → default, plus env)" — tức là 6 lớp được liệt kê RỒI cộng thêm env, tổng cộng 7. Trong khi `test_contract` lại gọi đây là "the SAME six-layer tiering as a core setting" và coi env là một trong các lớp. Số lớp không ảnh hưởng gì tới hợp đồng (điểm chỉ bắt buộc là `provenance` trả về `"env"`), nhưng văn bản nên thống nhất trước khi dùng làm mốc so sánh khi review.
