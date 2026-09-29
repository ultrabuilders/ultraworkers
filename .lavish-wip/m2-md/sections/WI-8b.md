## WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)

**Thay đổi gì:** Một extension có thể gọi `pi.registerSetting(definition)` lúc load để khai báo một config key có namespace, có kiểu và nhận biết biến môi trường, với hành vi y hệt một setting lõi — hiện ra và sửa được trong settings panel, báo cáo được qua sáu lớp provenance, và gỡ bỏ được khi extension unload.

**Wave:** 7 (settings ownership và unload seam thật: WI-8a, WI-8b, WI-9)

**Effort:** L. Bề mặt API công khai chỉ là một method; phần việc thật là bốn blocker cộng thêm hai cái mà plan bỏ sót (unregistration theo phạm vi owner và tính idempotent khi prepared-rebind, cả hai đều đã kiểm chứng bên dưới). Ước lượng: M cho owner-scoped registry + invalidation, M cho loader/API/đường typing, S–M cho vị trí trên panel tùy M2-OQ4 đã quyết (M nếu panel trở thành data-driven, S nếu key của extension nằm dưới tab Plugins sẵn có), S cho test. Không bắt đầu bước 5–7 trước khi quyết định M2-OQ4 đã được ghi lại — xem mục Cần người quyết.

**Người dùng thấy:** Một extension bên thứ ba tự mang setting của nó: key xuất hiện trong settings panel dưới vị trí mà M2-OQ4 chọn, sửa nó ghi vào các lớp setting thường (runtime/overlay/project/global), một biến môi trường có thể ghi đè nó, và lớp thắng được báo qua `setting.provenance(scope)` — hiện CHƯA có màn hình panel nào vẽ lớp này (`git grep -ni provenance -- packages/tui/src/` chỉ ra 5 kết quả, không cái nào liên quan settings; entry của panel ở `settings-ui.ts:58-66` không có trường provenance; `envNote` ở :39-44 chỉ nối một câu mô tả env vào `description`). Nếu muốn panel thật sự hiện lớp thắng thì đó là phần việc riêng, chưa nằm trong bốn dòng test và chưa có trong phạm vi mục này. Hai extension mà chọn trùng một key sẽ tạo ra lỗi lúc khởi động, nêu đích danh chỗ trùng, thay vì một bên âm thầm ghi đè bên kia. Hiện tại tác giả extension không có cách nào làm bất kỳ điều gì trong số đó — họ phải tự viết một file side-channel mà không ai đọc.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/config/registry.ts` | sửa | Thêm `ownerById` / `idsByOwner` cạnh `byId` (778) và `ordered` (779); chuyển thân `register` vào hàm mới `registerOwned(owner, definition)`; `register` (786) ủy nhiệm với owner `"core"` và giữ nguyên chữ ký; thay throw ở 787 bằng message nêu cả id bị trùng, cả owner hiện tại, cả quy tắc namespace; thêm `ownedBy` và `unregisterOwned` cạnh `lookup` (795) / `all` (800). | Có — HEAD 808b365 |
| `packages/coding-agent/src/config/all-settings.ts` | sửa | Thêm `invalidateOrderedSettings()` xoá memo `ordered` (85); gọi nó từ đường add/remove của registry. Mở rộng `orderedSettings()` (88-123) để nối thêm các handle có trong `all()` mà không `DOMAINS` nào nhận, theo thứ tự đăng ký, sau dãy tĩnh. | Có — HEAD 808b365 |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Thêm `registerSetting<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]>` vào `ExtensionAPI` cạnh `registerFlag`; thêm `readonly settingIds: string[]` vào `Extension`. | Có — HEAD 808b365 |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | Thêm `extensionSettingOwner(extension)` sinh owner ổn định từ `extension.resolvedPath`; thêm `registerSetting` vào `ConcreteExtensionAPI` (kiểm tra namespace, idempotent khi rebind, đẩy id vào `extension.settingIds`); export `releaseExtensionSettings(owner)`. | Có — HEAD 808b365 |
| `packages/coding-agent/src/config/settings-ui.ts` | chỉ đối chiếu | Không dự kiến sửa. Đây là nguồn dữ liệu mà dòng test của panel phải đọc: `createSettingsHost()` dựng `entries` bằng cách duyệt `SETTING_TABS` × `orderedSettings()` và giữ lại entry có `ui?.tab === tab`. Chỉ đụng vào file này nếu M2-OQ4 buộc host phải mang một tab không tĩnh. | Có — HEAD 808b365 |
| `packages/tui/src/overlays/settings-defs.ts` | chỉ đối chiếu | Chưa sửa cho tới khi M2-OQ4 có câu trả lời. `SettingTab` (:4-15) là union đóng gồm đúng mười literal, `SETTING_TABS` (:20) là mảng tĩnh, `TAB_METADATA` (:34, JSDoc ở :33) là record metadata tĩnh, `TAB_GROUPS` (:52-88) là `Record<SettingTab, readonly string[]>` tĩnh, và `UiBase` (:97-111) đòi `tab: SettingTab` cùng một `group` phải có sẵn trong `TAB_GROUPS[tab]`. | Có — HEAD 808b365 |
| `packages/tui/src/overlays/settings-selector.ts` | chỉ đối chiếu | Chưa sửa cho tới khi M2-OQ4 có câu trả lời. `getSettingsTabs()` trả về mười tab theo schema cộng một entry `plugins` viết cứng; phần tìm kiếm dựa trên schema thêm độc lập một entry `plugins` bị làm mờ ngoài đường đi của schema. | Có — HEAD 808b365 |
| `packages/coding-agent/test/config/extension-registered-setting.test.ts` | tạo | File mới. Bốn dòng do §11.2 mục 7 yêu cầu, cộng dòng 5 về `unregisterOwned` (xem mục Hợp đồng test): (1) hai extension khai cùng một id sinh ra một entry `errors` nêu đích danh chỗ trùng; (2) một key đã đăng ký đọc được qua typed handle của nó và `provenance(scope)` nêu lớp thắng không phải env; (3) key xuất hiện trong settings overlay tại vị trí M2-OQ4 chọn, khẳng định trên `createSettingsHost().entries` — BỊ CHẶN cho tới khi có M2-OQ4; (4) một key khai `definition.env` báo `"env"` từ `provenance(scope)` khi biến môi trường của nó được set và báo lớp khác khi không, còn key không khai `env` thì không bao giờ báo `"env"`. | Có — thư mục `packages/coding-agent/test/config/` tồn tại và giữ bảy file test, trong đó có `settings-registry.test.ts`; bản thân file này chưa tồn tại |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Added` cho API mới; thêm một dòng nữa dưới `### Changed` nếu M2-OQ4 cấu trúc lại các tab của panel. | Có — HEAD 808b365 |

Ghi chú về phạm vi trích dẫn: cột cuối phản ánh cờ `verified` của spec. Các neo kiểu `registry.ts:476-480`, `registry.ts:764-765`, `settings.ts:800-808`, `model-registry.ts:2914` và `model-registry.ts:2955` xuất hiện dưới đây lấy từ ghi chú trong chính spec chứ không nằm trong bảng đã kiểm chứng ở trên; đọc chúng như tham chiếu của spec, chưa phải neo đã đánh dấu verified.

### Các bước

1. **Xác nhận WI-8a đã xuống, và quyết định namespacing của nó đã được viết ra — BLOCKING PREREQUISITE.** WI-8a là phụ thuộc cứng: `registerOwned` dưới đây từ chối một id trần, mà sự từ chối đó vô nghĩa nếu chất nền sở hữu key của extension chưa tồn tại. Tại thời điểm viết tài liệu này, `.lavish-wip/m2-specs/` ĐÃ có `WI-8a.spec.json` (39 KB) — mục này được đặc tả trước tiền đề của nó, nhưng tiền đề đã có mặt (`.lavish-wip/m2-index/specs` là symlink trỏ sang cùng thư mục). Trước khi code, đọc `WI-8a.spec.json` và đối chiếu ba điểm nó đã chốt: namespace dành riêng `plugins.<id>.<key>`; quy tắc env `OMP_<PLUGIN_ID>_<KEY>` (viết hoa, `-`/`.` → `_`, khai tường minh trong `SettingDefinition.env`, không bao giờ tự sinh); và câu hỏi còn mở về lớp bền vững cho setting bên thứ ba. Nếu WI-8b chọn namespace khác `plugins.` thì phải ghi lý do, vì WI-9 sẽ quét cả hai không gian tên trong một bảng kiểm kê.
2. **`packages/coding-agent/src/config/registry.ts:778-792` — thêm đăng ký theo phạm vi owner.** Khai báo `ownerById: Map<string, string>` và `idsByOwner: Map<string, Set<string>>` cạnh `byId`/`ordered` ở module scope (:778-779). Chuyển thân của `register` vào hàm mới `registerOwned(owner, definition)` và cho `register` ủy nhiệm sang nó với owner `"core"` — chữ ký phải không đổi, vì 41 file dưới `packages/coding-agent/src` gọi `register({...})` và tất cả phải tiếp tục biên dịch mà không cần sửa. Thay throw ở :787 bằng message nêu cả id bị trùng, cả owner hiện tại, cả quy tắc namespace. Đây là compatibility gate của GĐ6: không test nào khẳng định message cũ (đã kiểm chứng: `git grep -n "registered twice" -- '*test*'` không trả gì; lệnh không giới hạn phạm vi thì trả 3 kết quả — dòng source `registry.ts:787` cùng hai chỗ văn xuôi ở `docs/secrets.md:140` và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9923`, không phải test), nên đổi nó không làm hỏng gì, và nó là khác biệt giữa một tác giả debug được chỗ trùng và một tác giả không.
3. **`packages/coding-agent/src/config/registry.ts:794-802` — thêm `ownedBy(owner)` và `unregisterOwned(owner)`** cạnh `lookup`/`all`. `unregisterOwned` phải xoá id khỏi `byId`, khỏi `ordered` (splice handle tương ứng ra), và khỏi cả hai index owner, đồng thời trả về các id đã gỡ để caller vô hiệu hóa cache dẫn xuất. Giữ nó là no-op với một owner chưa đăng ký gì. Hàm này hôm nay không tồn tại, và việc thiếu nó là điều tốn kém nhất có thể mắc phải ở đây: với trạng thái module chỉ nối thêm, việc tắt rồi bật lại một extension trong cùng một process sẽ ném "already registered" ở lần bật thứ hai. `packages/coding-agent/src/config/model-registry.ts` là khuôn mẫu để chép hình dạng — `clearSourceRegistrations(sourceId)` ở :2914 và `syncExtensionSources(activeSourceIds)` ở :2955 đã làm đúng điều đó cho provider.
4. **`packages/coding-agent/src/config/all-settings.ts:43-77, 85-89, 88-123` — làm cho `orderedSettings()` nhìn thấy setting đăng ký động.** Có hai khiếm khác riêng biệt, sửa cả hai. (a) Memo `ordered` ở :85-89 không bao giờ bị vô hiệu hóa, nên một setting đăng ký sau lần gọi đầu tiên sẽ vô hình mãi mãi — thêm `invalidateOrderedSettings()` và gọi nó ở mọi nơi thêm hoặc gỡ key. (b) `domainHandles` chỉ ghé các giá trị tới được từ 33 entry tĩnh `DOMAINS` ở :43-77, nên một handle thuộc extension có trong `all()` nhưng không thuộc domain nào và bị rơi lặng lẽ. Nối thêm các handle trong `all()` mà không domain nào nhận, theo thứ tự đăng ký, sau dãy tĩnh. Giữ nguyên sổ sách `sequence`/`seen` hiện có — nó là thứ cho thứ tự khai báo bên trong một domain, mất nó sẽ đảo thứ tự toàn bộ panel. Vị trí của khối nối thêm nằm CHÍNH LÀ quyết định M2-OQ4; đừng chốt trước bước 6.
5. **`packages/coding-agent/src/extensibility/extensions/types.ts:1256-1582` (method gần :1430), :1802-1817` — mở rộng API công khai.** Thêm `registerSetting<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]>` vào `ExtensionAPI`, ngay cạnh `registerFlag` ở :1430, kèm doc comment nói rõ yêu cầu namespace, throw khi trùng, và bảo đảm idempotent khi rebind. Thêm `readonly settingIds: string[]` vào `Extension` ở :1802-1817 để extension sở hữu biết mình đã khai gì. Import `SettingDefinition`, `DefinitionValue` và `Setting` bằng type import ở top-level từ config module — không `import("...").Type` nội tuyến, không `ReturnType<>`, không `any`. Interface hiện có đúng 29 method (đã kiểm chứng bằng cách liệt kê tên method khác nhau có tab đầu trong khoảng 1256-1582); thêm method này thành 30, nên hãy cập nhật mọi doc hay con số đang khẳng định 29.
6. **CHẶN THEO M2-OQ4 — xem mục Cần người quyết. Đừng viết bước này cho tới khi quyết định M2-OQ4 được ghi lại.** Blocker 3 và 4 của plan hoá ra là MỘT vấn đề gắn liền nhau, không phải hai, và đây là đính chính quan trọng nhất: từ vựng định vị của panel là một union đóng. `SettingTab` trong `packages/tui/src/overlays/settings-defs.ts:4-15` đúng bằng mười literal; `TAB_GROUPS` ở :52-88 là một `Record<SettingTab, readonly string[]>` tĩnh; và `createSettingsHost()` trong `packages/coding-agent/src/config/settings-ui.ts:51-68` dựng panel bằng cách duyệt `SETTING_TABS` và giữ các entry có `ui?.tab === tab` (:53-56). Nên một key của extension chỉ có thể rơi vào một trong mười tab sẵn có — "một tab động cho mỗi extension" không biểu đạt được nếu không đổi cả union, và tab id `plugins` hiện có đã nằm ngoài union đó. Quyết trước, rồi mới cài: nếu key của extension nằm dưới tab Plugins sẵn có, còn phải chốt luôn `:848-860` trong `settings-selector.ts` (phần tìm kiếm dựa trên schema, mà comment ở :854 đã nói "Plugins hosts its own UI; it is not part of the schema-backed search") — chỉ sửa danh sách tab để lại một mặt bề mặt thứ hai nơi một key đăng ký lúc load vĩnh viễn vô hình, đúng thứ mà GĐ6 cảnh báo.
7. **`packages/coding-agent/src/extensibility/extensions/loader.ts:179, 191-208, 259-267, 277-289` — cài `registerSetting` trên `ConcreteExtensionAPI`.** Constructor ở :191-208 duyệt prototype và bind mọi method, nên KHÔNG cần wiring constructor — chỉ thêm method vào class. Lấy `registerComposerShape` ở :277-289 làm khuôn mẫu: nó đã validate id và ném typed error trước khi mutate bất cứ thứ gì; đó là khuôn mẫu của nhà cho "từ chối lúc đăng ký, không phải để sau". Cài đặt phải có ba hành vi: (a) từ chối `id` không có namespace với message nêu prefix bắt buộc; (b) coi lời gọi lặp lại cùng definition của CÙNG owner là no-op trả về handle đã có — `bindPreparedExtensions` (loader.ts:491-520) cố ý rebind một extension đã prepare cho một session con, chạy lại factory, và đường đó đã được `test/extension-prepared-rebind.test.ts` phủ; (c) đẩy id vào `extension.settingIds`.
8. **`packages/coding-agent/src/extensibility/extensions/loader.ts:438-459, 491-520` — nối teardown.** Thêm helper `releaseExtensionSettings(owner)` cạnh các seam export khác của loader, gọi `unregisterOwned` rồi `invalidateOrderedSettings`, và gọi nó từ đường unload. WI-9 sở hữu seam unload chung và bảng kiểm kê 11 bucket của nó; đóng góp của WI-8b là bucket — các key setting — và WI-9 phải nhìn thấy bucket đó nếu không nó không đếm được. Đừng nới phạm vi sang phần việc của WI-9: cứ đưa helper vào, expose các id, để WI-9 quét.
9. **`packages/coding-agent/test/config/extension-registered-setting.test.ts` — viết năm dòng hợp đồng (bốn dòng của §11.2 mục 7, cộng dòng 5 về `unregisterOwned`; xem mục Hợp đồng test).** Mẫu setup, chép từ `test/extension-registered-tool-source-info.test.ts`: `new ExtensionRuntime()` + `new EventBus()` + `loadExtensionFromFactory(factory, "/project", events, runtime, name)`, import từ `../src/extensibility/extensions/loader`. Riêng cho dòng 1, dùng `loadExtensions` hoặc `bindPreparedExtensions` — hai hàm đó gom vào `LoadExtensionsResult.errors` (loader.ts:497-505), còn `loadExtensionFromFactory` ném thẳng ở :473 và không tạo entry lỗi nào. Riêng cho dòng 1, 2 và 4, bạn không cần loader: gọi `register`/`registerOwned`/`lookup` trực tiếp với một `Settings` thật dựng trên thư mục tạm, đúng như `test/config/settings-registry.test.ts` đang làm. `withEnv` để mutate biến môi trường đã nằm sẵn trong file đó — chép nó, đừng viết cái thứ hai. Không `mock.module()`, tuyệt đối.
10. **`packages/coding-agent/CHANGELOG.md` — thêm changelog.** Một dòng dưới `## [Unreleased]` → `### Added`, hướng người dùng, không kể nguyên nhân gốc: đại ý `Added pi.registerSetting so extensions can declare their own settings, editable in the settings panel`. Nếu M2-OQ4 rơi vào phương án đổi cấu trúc tab của panel, cần thêm một dòng hướng người dùng nữa dưới `### Changed` — người dùng đã có thói quen với panel mười tab sẽ nhận ra.

### Hình dạng code

```typescript
// ── packages/coding-agent/src/config/registry.ts ──────────────────────────────
// Owner-scoped registration. Core declarations go through `register` (owner
// "core"); extension declarations go through `registerOwned` and are removable.
// `register` keeps its existing signature so the 41 files of `register({...})`
// call sites are untouched.

const byId = new Map<string, AnySetting>();
const ordered: AnySetting[] = [];
/** Setting id → the owner that declared it. Absent means a module-level core setting. */
const ownerById = new Map<string, string>();
/** Owner → the ids it declared, so a whole extension's keys drop in one call. */
const idsByOwner = new Map<string, Set<string>>();

/** Ids an extension owns are namespaced; a bare id can never be claimed. */
const EXTENSION_ID_PREFIX = "extension.";
// Cần khớp hoặc giải thích lệch với namespace WI-8a đã chốt: `plugins.<id>.<key>`.

export function isExtensionSettingId(id: string): boolean {
	return id.startsWith(EXTENSION_ID_PREFIX);
}

/**
 * Declares a setting owned by `owner` and returns its typed handle.
 *
 * @throws Error naming BOTH the colliding id and the current owner when `id` is
 *   already taken — by a core setting or by a different extension. The message
 *   must state the namespace rule, otherwise an author who collided with a core
 *   id has no way to learn that was the cause.
 */
export function registerOwned<const D extends SettingDefinition>(
	owner: string,
	definition: D,
): Setting<DefinitionValue<D>, D["id"]> {
	const existing = byId.get(definition.id);
	if (existing) {
		const holder = ownerById.get(definition.id) ?? "core";
		throw new Error(
			`Setting "${definition.id}" is already registered by ${holder}. ` +
				`An extension setting id must start with "${EXTENSION_ID_PREFIX}" and ` +
				`be unique across all extensions.`,
		);
	}
	const handle = new Setting<DefinitionValue<D>, D["id"]>(definition);
	byId.set(definition.id, handle as AnySetting);
	ordered.push(handle as AnySetting);
	ownerById.set(definition.id, owner);
	const ids = idsByOwner.get(owner) ?? new Set<string>();
	ids.add(definition.id);
	idsByOwner.set(owner, ids);
	return handle;
}

/** Existing core entry point; now an `registerOwned` call with owner "core". */
export function register<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]> {
	return registerOwned("core", definition);
}

/** Ids currently owned by `owner` — no-op for an owner that declared none. */
export function ownedBy(owner: string): readonly string[] {
	return [...(idsByOwner.get(owner) ?? [])];
}

/**
 * Drops every setting `owner` declared, from the id map, the order array and the
 * owner index. Returns the removed ids so the caller can invalidate derived
 * caches. Without this an extension that is disabled and re-enabled in one
 * process throws "already registered" on its second enable.
 */
export function unregisterOwned(owner: string): string[] {
	const ids = [...(idsByOwner.get(owner) ?? [])];
	for (const id of ids) {
		byId.delete(id);
		ownerById.delete(id);
		const index = ordered.findIndex(handle => handle.id === id);
		if (index >= 0) ordered.splice(index, 1);
	}
	idsByOwner.delete(owner);
	return ids;
}

// ── packages/coding-agent/src/config/all-settings.ts ───────────────────────────
// `ordered` currently memoizes forever (`:85-89`). A setting registered after the
// first call is invisible to the panel, so it needs an invalidation hook that the
// owner-scoped registry calls. Clearing the memo is all that takes — `let ordered`
// already supports it, no generation counter required.

let ordered: readonly AnySetting[] | undefined;

/** Called by the owner-scoped add/remove path; forces the next `orderedSettings()` to recompute. */
export function invalidateOrderedSettings(): void {
	ordered = undefined;
}

// A dynamically registered setting belongs to no DOMAINS entry, so
// `domainHandles` never visits it and the current `orderedSettings()` drops it
// on the floor. Append owned settings that no domain claims, in registration
// order, after the static sequence — the placement the M2-OQ4 decision selects.
export function orderedSettings(): readonly AnySetting[] {
	if (ordered) return ordered;
	const sequence = new Map(all().map((handle, index) => [handle, index]));
	const seen = new Set<AnySetting>();
	const domainHandles = (domain: Readonly<Record<string, unknown>>): AnySetting[] => { /* unchanged */ };
	const placedBefore = new Map<AnySetting, AnySetting[]>();
	/* unchanged PLACED_DOMAINS fold */
	const result: AnySetting[] = [];
	for (const domain of DOMAINS) {
		for (const handle of domainHandles(domain)) {
			const placed = placedBefore.get(handle);
			if (placed) result.push(...placed);
			result.push(handle);
		}
	}
	// NEW: keys that no static domain claims, so `createSettingsHost` can see them.
	for (const handle of all()) {
		if (seen.has(handle)) continue;
		result.push(handle);
	}
	ordered = result;
	return result;
}

// ── packages/coding-agent/src/extensibility/extensions/types.ts ────────────────
// `ExtensionAPI` spans 1256-1582. Add the method beside `registerFlag` (1430)
// and add the returned setting to `Extension` (1802-1817).

/**
 * A settings definition an extension may declare. Identical to `SettingDefinition`
 * except `id` must be namespaced: `extension.<slug>.<key>`.
 */
export type ExtensionSettingDefinition = SettingDefinition;

// inside `interface ExtensionAPI`, next to registerFlag:
/**
 * Declares a setting owned by this extension and returns its typed handle.
 * The `id` is rewritten to `extension.<slug>.<key>` — a bare id throws — so an
 * extension can never collide with a core setting id or another extension's key.
 *
 * Calling this twice with the same definition during the SAME bind is a no-op
 * returning the same handle; a prepared extension rebound to a child session
 * re-runs its factory, so rebinding must not throw.
 *
 * @throws Error when `id` is not namespaced, or names an id another owner holds.
 */
registerSetting<const D extends ExtensionSettingDefinition>(
	definition: D,
): Setting<DefinitionValue<D>, D["id"]>;

// inside `interface Extension` (1802-1817):
/** Setting ids this extension declared, in declaration order. */
readonly settingIds: string[];

// ── packages/coding-agent/src/extensibility/extensions/loader.ts ───────────────
// `ConcreteExtensionAPI` is at 179; its constructor (191-208) walks the prototype
// and binds every method, so a new method needs NO constructor wiring.

// CHƯA CHỐT — xem mục Cần người quyết 「Điều gì tạo ra một slug namespace ổn định cho một extension?」.
// Đừng hardcode ở đây.
// `Extension.path` là đường dẫn người gõ, không ổn định.
// `Extension.resolvedPath` chỉ là đường dẫn tuyệt đối trên đường `loadExtensions` (loader.ts:417);
// trên `loadExtensionFromFactory` nó BẰNG `name` (loader.ts:471), nên hai extension nạp
// bằng cùng một tên sẽ gộp làm một owner.
// Khoôn mẫu có sẵn: `capability/extension-module.ts:28` — toExtensionId: ext => `extension-module:${ext.name}`
function extensionSettingOwner(extension: Extension): string {
	throw new Error("unimplemented: settle the owner-slug question first");
}

class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime {
	// ... existing fields ...

	registerSetting<const D extends ExtensionSettingDefinition>(
		definition: D,
	): Setting<DefinitionValue<D>, D["id"]> {
		if (!isExtensionSettingId(definition.id)) {
			throw new Error(
				`Extension setting id "${definition.id}" is not namespaced; ` +
					`it must start with "${EXTENSION_ID_PREFIX}".`,
			);
		}
		const owner = extensionSettingOwner(this.extension);
		// Rebind-safe: the same prepared extension bound to a child session
		// re-runs its factory; the key already belongs to us, so reuse it.
		const existing = lookup(definition.id);
		if (existing && ownerByIdOf(definition.id) === owner) return existing as Setting<DefinitionValue<D>, D["id"]>;
		const handle = registerOwned(owner, definition);
		this.extension.settingIds.push(definition.id);
		return handle;
	}
}

// A rebind or unload must also drop the keys, or a disabled-then-re-enabled
// extension throws on its second enable. `bindPreparedExtensions` is the seam
// exported to the session layer; wire the drop next to the unload seam WI-9 builds.
export function releaseExtensionSettings(owner: string): string[] {
	const removed = unregisterOwned(owner);
	if (removed.length > 0) invalidateOrderedSettings();
	return removed;
}
```

### Hợp đồng test

Bốn dòng do §11.2 mục 7 yêu cầu, cộng MỘT dòng do chính blocker bị plan bỏ sót bắt buộc — không có nó thì cổng xanh trên một bản cài thiếu `unregisterOwned`. Tên file: `packages/coding-agent/test/config/extension-registered-setting.test.ts`.

1. **CHỖ TRÙNG ĐƯỢC NÊU RA, KHÔNG BỊ NUỐT.** Hai extension khai cùng một setting id tạo ra một entry trong `LoadExtensionsResult.errors` mà nội dung nêu cả id bị trùng lẫn việc một id có namespace là bắt buộc — không phải last-writer-wins, không phải nuốt throw. Nếu hồi quy: extension thứ hai âm thầm thừa kế hoặc đè key của extension thứ nhất, và không tác giả nào biết id của mình đã bị lấy. Phải khẳng định qua `loadExtensions`/`bindPreparedExtensions` (hai hàm gom vào `errors`, loader.ts:497-505), KHÔNG qua `loadExtensionFromFactory` — hàm sau ném thẳng raw ở loader.ts:473 và không bao giờ sinh entry `errors`.
2. **MỘT SETTING ĐÃ ĐĂNG KÝ LÀ MỘT SETTING HẠNG NHẤT, KHÔNG PHẢI MỘT KHO LƯU ĐÃ ĐỔI TÊN.** Sau khi một extension khai một key, `lookup(id)` trả về handle, `handle.get(scope)` đọc nó, và `handle.provenance(scope)` nêu lớp thắng trong năm lớp không phải env — chứng minh key động đã gia nhập cùng một ngăn xếp lớp với key lõi. Phải khẳng định CẢ giá trị đã phân giải LẪN lớp được báo; khẳng định chỉ giá trị sẽ pass ngay cả trên một kho lưu tình cờ đọc đúng file. Khẳng định qua `Setting.provenance` (registry.ts:764-765), không phải `Settings.getProvenance` (settings.ts:800-808) — hàm sau không bao giờ trả về `"env"`.
3. **CÓ MẶT TRONG PANEL — BỊ CHẶN THEO M2-OQ4, xem mục Cần người quyết.** Sau khi một extension đăng ký một key lúc load, khẳng định nó CÓ TRONG danh sách của settings overlay, đúng tại vị trí M2-OQ4 chọn, bằng cách dựng danh sách từ nguồn dữ liệu mà panel thực sự render. Nguồn đã kiểm chứng là `createSettingsHost()` (settings-ui.ts:51-68), vốn duyệt `SETTING_TABS` × `orderedSettings()` và giữ các entry có `ui?.tab === tab` (settings-ui.ts:53-56) — vậy khẳng định trên `host.entries`, không bao giờ trên DOM, và không bao giờ source-grep `settings-selector.ts`.
4. **LỚP `env` LÀ OPT-IN VÀ TUỲ CHỌN.** Một key động khai `definition.env` báo `"env"` từ `provenance(scope)` khi biến môi trường của nó được set, và báo một lớp khác khi không; một key động KHÔNG khai `env` thì không bao giờ báo `"env"` kể cả khi có biến cùng tên được set. Dòng này tồn tại vì `env` là opt-in theo từng setting — `#parseEnv` vẫn là `undefined` khi thiếu `definition.env` (registry.ts:476-480), nên `envValue()` trả về `undefined` và provenance rơi xuống lớp khác — và vì một overlay chỉ vẽ lại năm lớp cũ sẽ pass dòng 1 và dòng 2 trong khi lặng lẽ mất trọn vẹn env. Khẳng định cả giá trị đã phân giải lẫn lớp hiện ra; không bao giờ khẳng định rằng "registerSetting đã được gọi".
5. **GỠ ĐƯỢC RỒI BẬT LẠI ĐƯỢC, VÀ REBIND KHÔNG NÉM.** (a) `unregisterOwned(owner)` xoá key khỏi `byId`, khỏi `ordered` và khỏi cả hai index owner, trả về danh sách id đã gỡ; gọi lại `registerOwned` với cùng owner và cùng id phải thành công, và `orderedSettings()` phải chứa lại key đó sau khi `invalidateOrderedSettings()`. (b) Chạy factory hai lần cho cùng một owner (mô phỏng `bindPreparedExtensions`) phải trả về cùng một handle và không ném. Không có dòng nào trong bốn dòng hiện tại phủ (a), và `check:ts` không bắt được vì không gì gọi tới `unregisterOwned` — đây là lỗ hổng cổng lớn nhất của mục này.

### Xác minh

```bash
bun run check:ts
bun --cwd=packages/natives run build   # unblock bun test; verified: without it bun test reports 0 pass / 1 fail / 1 error
cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts
cd packages/coding-agent && bun test test/config/settings-registry.test.ts   # the 41 files of existing register({...}) call sites must not regress
```

Tuyệt đối không dùng `tsc` — dự án cấm. Dùng `bun run check:ts`.

### Cổng hoàn thành

Ba dòng, theo đúng thứ tự:

(0) `bun --cwd=packages/natives run build` — TIỀN ĐỀ, phải xanh trước khi đọc (2); nếu (0) đỏ thì (2) không mang ý nghĩa.

(1) `bun run --filter './packages/coding-agent' --filter './packages/tui' --if-present check:types` — thay cho `bun run check:ts`, vì `check:ts` còn chạy `check:tools` tức `oxlint .` và `oxfmt --check` trên toàn bộ cây mọi package (`oxfmt --check` báo 5445 file) nên đỏ được bởi bất kỳ file nào không liên quan. Nửa này thực sự đỏ: thêm `registerSetting` vào `ExtensionAPI` mà không cài trên `ConcreteExtensionAPI` là lỗi biên dịch, vì class được khai `implements ExtensionAPI` (loader.ts:179); kiểu trả về `SettingDefinition` lệch cũng vậy.

(2) `cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts` — nếu báo `0 pass / 1 fail / 1 error` kèm `Failed to load pi_natives native addon for darwin-arm64` thì đó là (0), KHÔNG phải hồi quy của bạn (đã tái kiểm chứng trên một file test có sẵn: `test/config/settings-registry.test.ts`). Cả năm dòng test đều fail trên HEAD theo cấu thức: dòng 1 và dòng 2 gọi `pi.registerSetting`, vốn chưa tồn tại, nên file thậm chí không type-check. Dòng 1, 2 và 4 còn chạy được NGAY CẢ khi không có extension loader (chúng đi thẳng qua `register`/`lookup`/`Setting.provenance` với một `Settings` tạm), nên một khi addon được build, chúng không cần session, không cần TUI và không cần fixture trên đĩa.

Cổng này có thực sự đỏ được không: **Có, nhưng phải nói thẳng ranh giới.** Nửa type-check thực sự đỏ — thêm `registerSetting` vào `ExtensionAPI` mà không cài trên `ConcreteExtensionAPI` là lỗi biên dịch, và kiểu trả về `SettingDefinition` lệch cũng vậy. Nó SẼ KHÔNG bắt được ba thứ thực sự làm hỏng người dùng: một id không có namespace, một key đã đăng ký mà panel không bao giờ render, và một bản cài quên `unregisterOwned` (thứ ba chỉ lộ ra ở dòng test 5, vì không gì trong cây lệnh type-check gọi tới nó). Hai thứ đầu hoàn toàn do dòng test 1, 3 và 4 gánh, mà dòng 3 không thể viết cho tới khi M2-OQ4 có câu trả lời. Nói cách khác, cổng có thật nhưng chưa phải toàn bộ cổng, và dòng panel là thứ duy nhất đứng giữa mục này và thất bại "âm thầm và vĩnh viễn" mà plan đã gọi tên.

### Phụ thuộc

- **WI-8a** — tiền đề cứng, không phải cải thiện. Chất nền có namespace phải tồn tại trước: `registerOwned` từ chối id trần, và một key của extension không có namespace sẽ đụng id lõi qua một so sánh chuỗi thuần ở registry.ts:787. Plan nói rõ đây là điều kiện tiên quyết, và tài liệu này xác nhận: hôm nay không có owner, không có cưỡng chế namespace, và không có cách gỡ một key.
- **M2-OQ4** — quyết định vị trí trên panel. Không phải phụ thuộc code nhưng là phụ thuộc chặn: bước 5-7 và dòng test 3 không thi triển khai được cho tới khi nó có câu trả lời, và trả lời nó sau khi đã mở API chính là thất bại "âm thầm và vĩnh viễn" mà plan gọi tên.

**Chặn:**

- **WI-9 (real unload seam)** — không hoàn thành nổi bảng kiểm kê 11 bucket của nó nếu các setting do extension đăng ký không phải là một bucket nhận diện được và gỡ được. WI-8b góp phần bucket, WI-9 quét nó.
- **M2-OQ8 (per-extension state substrate, WI-11)** — một câu trả lời đã chốt ở đây (overlay nằm trong `Settings` hay một kho riêng) quyết định state của WI-11 nằm cạnh các key này hay trong một kho thứ hai.

### Cách sai dễ nhất

Lỗi chi phối là lỗi âm thầm và vĩnh viễn, đúng như plan nói: mở `registerSetting` trong khi panel vẫn không hiện được key, và tác giả extension không nhận được lỗi nào, người dùng không có UI nào, không có gì trong CI đỏ. Lỗi thứ hai là bỏ qua namespacing — một extension id trùng với một core id sẽ ném ngay trong lúc load chính extension đó, và message hiện tại (`Setting "X" is registered twice`, registry.ts:787) chỉ nêu id, nên tác giả không bao giờ tìm ra nguyên nhân thật. Lỗi thứ ba, mà plan không nêu tên: `register()` nối thêm vào `byId`/`ordered` ở module level (registry.ts:778-779) mà KHÔNG có unregister, nên một extension bị tắt rồi bật lại trong cùng một process sẽ ném "registered twice" ở lần bật thứ hai, và `orderedSettings()` memoize kết quả của nó mãi mãi (all-settings.ts:85-89) nên nó còn không thấy nổi một setting được đăng ký sau lần gọi đầu tiên.

### Cần người quyết

- **M2-OQ4 — một key của extension render ở đâu?** Ba phương án trong plan (panel data-driven / dưới tab Plugins sẵn có / một tab động). HÃY QUYẾT, ĐỪNG KHÁM PHÁ BẰNG CODE. Hai ràng buộc đã kiểm chứng thu hẹp lựa chọn: `SettingTab` là union đóng gồm mười literal (settings-defs.ts:4-15) và `TAB_GROUPS` là một record tĩnh (:52-88), nên "một tab động cho mỗi extension" đòi phải đổi cả hai; và tab Plugins hiện có là một bề mặt PLUGIN (npm/marketplace) dựng từ `plugin-settings.ts` với `PluginSettingsHost` riêng, không phải bề mặt extension — đặt key của extension vào đó là gộp hai thứ khác nhau dưới một tab. GĐ6 đúng khi nói quyết định này phải phủ luôn phần tìm kiếm dựa trên schema ở settings-selector.ts:848-860, không chỉ danh sách tab ở :431-440.
- **Điều gì tạo ra một slug namespace ổn định cho một extension?** `Extension.path` là đường dẫn người dùng gõ và KHÔNG ổn định — `omp --extension /abs/path` và một entry config viết nó khác đi. `Extension.resolvedPath` chỉ là đường dẫn tuyệt đối trên đường `loadExtensions` (đặt ở loader.ts:417 qua `resolvePath(extensionPath, cwd)`). Trên `loadExtensionFromFactory` nó BẰNG đúng `name` (loader.ts:471, `createExtension(name, name)`), và mẫu test mà bước 9 bảo chép truyền vào một tên package (`"pi-fabric@0.92.4"`), không phải một đường dẫn. Nghĩa là `resolvedPath` ổn định trên đường file thật nhưng KHÔNG phải đường dẫn tuyệt đối nói chung — hai extension nạp bằng `loadExtensionFromFactory` với cùng một `name` (kể cả mặc định `"<inline>"`) sẽ có cùng owner, và nhánh idempotent sẽ âm thầm trả handle của extension thứ nhất. Đó là failure last-writer-wins ngược, và dòng test 1 không bắt được. Đây là một lý do nữa để không chốt owner theo resolvedPath. Dù vậy, nhúng một đường dẫn máy-local vào một config key tồn tại lâu trong settings file dùng chung vẫn tệ cho một project config được commit. Không có trường manifest nào trên `Extension` (types.ts:1802-1817) để treo id do tác giả khai. NHƯNG codebase ĐÃ có họ id-derivation: `git grep -nE 'extensionId|slugExtension|normalizeExtensionId' -- packages/` trả 33 kết quả (đã đếm), và `git grep -n toExtensionId -- packages/` chỉ ra đúng khuôn mẫu cần nằm ở `capability/extension-module.ts:28` — ``toExtensionId: ext => `extension-module:${ext.name}` ``, khai trong interface `Capability.toExtensionId` (`capability/types.ts:204`) và tiêu thụ ở `capability/index.ts:192-193` để lọc theo `disabledExtensionIds`. Đọc `capability/extension-module.ts` TRƯỚC khi chọn giữa ba phương án; nếu vẫn chọn manifest id thì nêu vì sao không theo. Marketplace có `buildPluginId(name, marketplace)` tại `extensibility/plugins/marketplace/types.ts:29` làm khuôn mẫu hình dạng, nhưng plugin có id từ manifest còn extension thì không. Một người phải chọn: manifest id do tác giả khai, hash của resolved-path, hay basename. Đừng tự bịa ra.
- **Biến môi trường cho một key của extension nên do tác giả chọn hay tự suy ra?** WI-8a đã chốt điều này cho plugin (`OMP_<PLUGIN_ID>_<KEY>`, viết hoa, `-`/`.` → `_`, khai tường minh trong `SettingDefinition.env`, không bao giờ tự sinh) và đã kiểm chứng lớp đó là opt-in ở registry.ts:476-480. WI-8b nên thừa hưởng nguyên vẹn quyết định đó thay vì suy ra lại — nhưng hãy xác nhận WI-8a thực sự đã đưa nó vào đúng dạng trước khi cài theo.
- **Đăng ký lại cùng key bởi cùng owner nên là no-op im lặng hay ném lỗi?** Tài liệu này chọn no-op, vì `bindPreparedExtensions` (loader.ts:491-520) rebind một extension đã prepare cho một session con và chạy lại factory, và đó là một hợp đồng đã được test (`test/extension-prepared-rebind.test.ts`). Nhưng no-op lặng lẽ che mất một khai báo trùng thật bên trong một extension. Một người có thể thích ném lỗi ở lần khai thứ hai trong cùng một bind, với một đường phát hiện rebind riêng; plan không đề cập tới chuyện này.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/types.ts:1231-1557` là span chính xác của `ExtensionAPI`. | stale-anchor | Interface thật ra span :1256-1582. `export interface ExtensionAPI` ở :1256, dấu ngoặc đóng ở :1582, khai báo top-level kế tiếp (`export interface ProviderConfig`) ở :1589. Cả hai đầu của khoảng của plan lệch đúng 25 dòng. Con số 29 method của plan là ĐÚNG và giữ nguyên 29 — đã liệt kê các tên method khác nhau có tab đầu trong khoảng 1256-1582 và ra đúng 29; mục này đưa nó lên 30. |
| `packages/tui/src/overlays/settings-selector.ts:435` là danh sách tab cố định kèm tab Plugins riêng (và §7 GĐ6 trích `:847-853` cho bề mặt tìm kiếm dựa trên schema). | stale-anchor | Lệch vài dòng ở cả hai nơi. `getSettingsTabs()` là :431-440 và entry tab `plugins` nằm ở :438; dòng :435 là `const icon = theme.symbol(meta.icon);` bên trong callback `SETTING_TABS.map`. Về phía tìm kiếm, vòng `for (const id of SETTING_TABS)` là :848-853, comment "Plugins hosts its own UI" ở :854, và lệnh push entry plugins bị làm mờ là :855-860. Phần chất của GĐ6 là đúng — cả hai bề mặt phải được quyết cùng nhau — chỉ có số dòng là dịch chuyển. |
| Blocker 3 và 4 là hai chuyện tách biệt: (3) thứ tự panel là thứ tự khai báo bên trong một domain, nên một domain động không có chỗ; (4) panel là danh sách tab cố định với tab Plugins riêng. | incomplete — cả hai là một vấn đề gắn liền, và plan bỏ mất ràng buộc quyết định giữa các phương án | Từ vựng định vị của panel là một union ĐÓNG, không chỉ là một danh sách cố định. `SettingTab` trong `packages/tui/src/overlays/settings-defs.ts:4-15` đúng bằng mười literal; `TAB_GROUPS` ở :52-88 là `Record<SettingTab, readonly string[]>` tĩnh; `UiBase` ở :97-111 đòi `tab: SettingTab` và một `group` phải có sẵn trong `TAB_GROUPS[tab]`. Và `createSettingsHost()` (`config/settings-ui.ts:51-68`) dựng panel bằng cách duyệt `SETTING_TABS` và giữ entry có `ui?.tab === tab` (:53-56). Nên một key của extension chỉ có thể rơi vào một trong mười tab sẵn có, và phương án thứ ba của M2-OQ4 — một tab động cho mỗi extension — không biểu đạt được nếu không đổi cả union lẫn record. Quyết 3 và 4 tách riêng như plan trình bày thì dễ chọn một phương án hoá ra không biểu đạt được. |
| `config/registry.ts:783-792` là `register` với throw trùng id; ghi chú duy nhất về trạng thái module chính là throw đó. | stale-anchor cộng thêm một blocker bị bỏ sót | `register` ở :786 và throw ở :787 (:783 của plan là một dòng JSDoc, :792 là dấu ngoặc đóng). Blocker bị bỏ sót: `byId` (:778) và `ordered` (:779) ở module level và CHỈ NỐI THÊM — `registry.ts` không có `unregister` nào (đã kiểm chứng: `git grep -n unregister -- packages/coding-agent/src/config/` trả 7 kết quả, tất cả ở `model-registry.ts` cho provider/API/OAuth, không kết quả nào ở `registry.ts`). Một extension bị tắt rồi bật lại trong cùng một process vì thế sẽ ném "registered twice" ở lần bật thứ hai, và key của nó không với tới được nữa suốt vòng đời process. WI-8b phải thêm một unregister theo phạm vi owner, và khuôn mẫu hình dạng cho nó đã có sẵn trong cùng package: `clearSourceRegistrations(sourceId)` ở `config/model-registry.ts:2914` và `syncExtensionSources(activeSourceIds)` ở :2955 làm đúng điều đó cho provider. Đây cũng chính là thứ biến bảng kiểm kê 11 bucket unload của WI-9 từ bất khả thi thành khả thi. |
| `orderedSettings()` liệt kê setting theo thứ tự domain rồi thứ tự khai báo; một domain động không có chỗ trong panel (blocker 3). | incomplete — có một lỗi thứ hai, sắc hơn, mà plan không nêu tên | Có hai khiếm khác, không phải một. (a) `all-settings.ts:85-89` memoize `ordered` trong một `let` module-level KHÔNG có invalidation, nên bất kỳ setting nào đăng ký sau lần gọi `orderedSettings()` đầu tiên sẽ vô hình mãi mãi — bất kể đặt ở đâu trên panel. (b) `domainHandles` (:92-106) chỉ duyệt các giá trị tới được từ 33 entry tĩnh `DOMAINS`, nên một handle của extension CÓ trong `registry.all()` bị rơi lặng lẽ. Plan mô tả (b) là "không có chỗ trong panel"; (a) tệ hơn vì nó phụ thuộc thứ tự và sẽ không lộ ra trong một test tình cờ đăng ký trước lần gọi đầu tiên. |
| Một dòng test khẳng định id trùng sinh ra lỗi được báo cho tác giả extension sẽ fail trên HEAD vì "hôm nay loader không có nghĩa vụ truyền tiếp nó". | wrong in detail — loader ĐÃ truyền tiếp; thứ thiếu là một message nêu đích danh chỗ trùng | Loader CÓ báo lỗi factory. `runExtensionFactory` (loader.ts:397-414) ném lại, `bindExtension` (:438-459) bắt và trả `Failed to load extension: <message>` ở :457, và `bindPreparedExtensions` (:491-520) gom những lỗi đó vào `LoadExtensionsResult.errors` (:497-505), mà `formatExtensionLoadNotifications` (`load-errors.ts`) kết xuất cho người dùng. Nên đường truyền tiếp đã có và không cần việc gì. Lỗ hổng thật là message hiện tại là `Setting "X" is registered twice` — nó nêu id nhưng không nêu owner và không nêu quy tắc namespace, đúng cái compatibility gate của GĐ6. Hệ quả cho thiết kế test rõ ràng và dễ làm sai: hãy khẳng định chỗ trùng qua `loadExtensions`/`bindPreparedExtensions` và đọc `result.errors`, KHÔNG qua `loadExtensionFromFactory` (:464-475), vì hàm sau ném lại ở :473 và không bao giờ điền vào `errors`. |
| `pi.registerSetting` được thêm như method thứ 30 trên `ExtensionAPI`, và wiring của `ConcreteExtensionAPI` theo mẫu của các method đăng ký sẵn có. | đúng, kèm một tiết kiệm công đáng biết | Đã xác nhận, và tốt hơn plan tưởng: KHÔNG cần wiring nào. Constructor của `ConcreteExtensionAPI` (loader.ts:191-208) duyệt `ConcreteExtensionAPI.prototype` và bind lại mọi method lên instance, và comment ở :198-200 nói thẳng điều đó ("Walk the prototype rather than listing methods: a new method is bound without touching this"). Class được khai `implements ExtensionAPI, IExtensionRuntime` (:179), nên bỏ sót phần cài là lỗi biên dịch — đó là thứ làm cho nửa `check:ts` của cổng có thật chứ không trang trí. Khuôn mẫu anh em tốt nhất không phải `registerFlag` (:259-267) mà là `registerComposerShape` (:277-289), vốn đã validate id và ném typed error trước khi mutate bất kỳ trạng thái nào. |
| Xác minh là `bun run check:ts && (cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts)`. | đúng như đã viết, nhưng nửa sau bị chặn trong môi trường này — nói ra trước khi giao | `bun run check:ts` chạy và pass trên HEAD 808b365 (đã kiểm chứng: cả 15 package đều báo Done). `bun test` thì KHÔNG: chạy một test có sẵn trong thư mục đó báo `0 pass / 1 fail / 1 error` kèm `Failed to load pi_natives native addon for darwin-arm64` và chỉ về `bun --cwd=packages/natives run build`. Nên cả năm dòng test không thi hành được cho tới khi addon được build. Điều này không làm suy yếu công việc — dòng 1, 2 và 4 không cần loader, không cần session, không cần fixture trên đĩa — nhưng người nhận việc phải biết cổng chỉ chạy được một nửa hôm nay, và không nên đọc một lỗi `bun test` là hồi quy do thay đổi của chính họ. |
| WI-8b chỉ phụ thuộc WI-8a; WI-7 không phải phụ thuộc vì không file nào trên đường `registerSetting` biết mode. | confirmed | Đã kiểm chứng độc lập. Không gì trên đường đi nào đọc mode: `registry.ts:786-792` chỉ là sổ sách id thuần, `all-settings.ts:43-77` là danh sách import tĩnh, và danh sách tab của panel là `settings-selector.ts:431-440` cộng `settings-defs.ts:20`. Tiền đề thật sự mà plan đánh giá thấp là M2-OQ4, không phải code nhưng chặn thẳng bước 5-7 và dòng test 3. |

## Cần người xác nhận

Ba điểm tự mâu thuẫn trong chính đặc tả, ghi lại chứ không tự sửa:

- **Cổng hoàn thành đòi file test năm dòng, nhưng dòng 3 thì bị chặn.** `gate` yêu cầu `cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts` chạy qua, trong khi `test_contract` và bước 9 đều nói dòng 3 (present in the panel) không viết được cho tới khi M2-OQ4 có câu trả lời. Cần chốt: hoãn toàn bộ gate phần test cho tới khi M2-OQ4 xong, hay chấp nhận một phiên bản file tạm bốn dòng rồi bổ sung dòng 3 ở đợt sau.
- **`code_shape` không biên dịch được như viết.** Khối `ConcreteExtensionAPI.registerSetting` gọi `ownerByIdOf(definition.id)`, một hàm không xuất hiện ở bất kỳ đâu trong đặc tả, trong khi `ownerById` ở khối `registry.ts` được khai báo là `const` module-level không export; `EXTENSION_ID_PREFIX` cũng vậy. Cần chốt: export một accessor (ví dụ một hàm đọc owner theo id), hay để `registerOwned` trả kèm owner để loader tự theo dõi.
- **Cách hiểu dòng test 1 và 2 không thống nhất giữa `gate` và bước 9.** `gate` viết rằng dòng 1 và dòng 2 gọi `pi.registerSetting` nên file không type-check trên HEAD; bước 9 lại viết rằng dòng 1, 2 và 4 không cần loader và gọi thẳng `register`/`registerOwned`/`lookup`. Hai cách cho hai kết luận khác nhau về việc dòng 2 có thực sự chạm mặt cung API công khai hay không — điều này quyết định test có bắt được hồi quy ở tầng API hay chỉ ở tầng registry.
