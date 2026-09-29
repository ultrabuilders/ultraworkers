# Phiếu triển khai — M4-6. Chặn ghi `settings` theo provenance

**Kế hoạch:** `MILESTONE_4_EXECUTION_PLAN.md:951`
**HEAD khi rà soát:** `47720fd` (nhánh `milestone-1`) — `git rev-parse --short HEAD`
**Addon native:** đã build. `bun test packages/utils/test/file-lock.test.ts` → **4 pass / 0 fail**.
**Ngày rà soát:** 2026-09-29

> Cảnh báo nhỏ trước khi đọc: dsh HEAD là `477b4f4`, HEAD repo này là `47720fd`. Hai chuỗi gần
> nhau, đừng lẫn.

---

## 1. Cái gì thay đổi, quan sát được

Khi bạn đổi một setting trong panel `/settings` mà project config, overlay `--config`, runtime
override hoặc biến môi trường đang cấp giá trị có hiệu lực, panel nói rõ lớp nào đang che và
giá trị chết **không bao giờ nằm trong `config.yml` global trên đĩa** — kể cả tạm thời; setting
không bị che thì hành vi y hệt trước đây, `/settings` không bị brick với bất kỳ ai.

---

## 2. Bảng điểm sửa

TRƯỚC: trích nguyên văn từ file thật (đã mở và đọc ở phần 3).

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/config/shadowing.ts` | *(tạo mới — không tồn tại)* | — | `globalLayerValue(setting, scope)` + `shadowingSource(setting, scope)`, scope tường minh, giữ nguyên từng chuỗi message |
| `packages/coding-agent/src/cli/config-cli.ts:318-322` | `globalValue` | `function globalValue(setting: AnySetting): unknown {`<br>`	let value: unknown = settings.getGlobalSettings();`<br>`	for (const segment of setting.segments) value = isRecord(value) ? value[segment] : undefined;`<br>`	return value;`<br>`}` | xoá; nơi gọi `:306` → `globalLayerValue(def.setting, settings)` |
| `packages/coding-agent/src/cli/config-cli.ts:325` | `shadowingSource` | `function shadowingSource(setting: AnySetting): { json: Record<string, string>; message: string } | undefined {` | xoá; nơi gọi `:307` → `shadowingSource(def.setting, settings)` |
| `packages/coding-agent/src/cli/config-cli.ts:8` | import `isRecord` | `import { APP_NAME, getAgentDir, isRecord } from "@oh-my-pi/pi-utils";` | bỏ `isRecord` (chỉ dùng ở `:320`, sẽ biến mất) |
| `packages/coding-agent/src/cli/config-cli.ts:11` | import `AnySetting` | `import { type AnySetting, lookup } from "../config/registry";` | **giữ nguyên** — còn dùng ở `:35` và `:45` |
| `packages/tui/src/overlays/settings-defs.ts:134` | `SettingsHost.set` | `set(path: string, value: unknown): void;` | trả về kết quả (xem mục 6 — plan không nói tới dòng này) |
| `packages/tui/src/overlays/settings-defs.ts:141` | `SettingsHost` | `validateProviderLimits(value: unknown): Record<string, number>;` | thêm `provenance(path: string): SettingsProvenance;` |
| `packages/tui/src/overlays/settings-defs.ts:130` | *(mới)* | — | `export type SettingsProvenance = "env" \| "runtime" \| "overlay" \| "project" \| "global" \| "default";` |
| `packages/coding-agent/src/config/settings-ui.ts:77` | `set` của `createSettingsHost` | `set: (path, value) => resolve(path).set(settings, value),` | thân có chốt chặn 5 bước, trả `SettingsWriteResult` |
| `packages/coding-agent/src/config/settings-ui.ts:74` | host literal | `	return {` (mảnh 74-81) | thêm `provenance: path => resolve(path).provenance(settings),` |
| `packages/coding-agent/src/config/settings-ui.ts:39-44` | `envNote` | `function envNote(setting: AnySetting): string {`<br>`	if (!setting.envName \|\| setting.envValue() === undefined) return "";`<br>`	return setting.envFallback`<br>`		? ` Unset, it falls back to $${setting.envName}.``<br>`		: ` $${setting.envName} overrides this setting while it is set.`;`<br>`}` | giữ nguyên (đã phát hành); thêm `provenanceNote` cạnh bên |
| `packages/tui/src/overlays/settings-selector.ts:349` | `ProviderLimitsSubmenu.onSubmit` | `					this.#settings.set("providers.maxInFlightRequests", normalized);` | `this.#writeSetting(this.#settings, "providers.maxInFlightRequests", normalized)` |
| `packages/tui/src/overlays/settings-selector.ts:1200` | `#setSettingValue` | `			this.#context.settings.set(path, -1);` | `this.#writeSetting(this.#context.settings, path, -1)` (×2: 1200, 1202) |
| `packages/tui/src/overlays/settings-selector.ts:1216` | `#setSettingValue` | `			this.#context.settings.set(path, parsed);` | `this.#writeSetting(this.#context.settings, path, parsed)` |
| `packages/tui/src/overlays/settings-selector.ts:1222` | `#setSettingValue` | `			this.#context.settings.set(path, value);` | `this.#writeSetting(this.#context.settings, path, value)` |
| `packages/tui/src/overlays/settings-selector.ts:1112` | `#createTextInput` | `				if (value === "") this.#context.settings.unset(def.path);` | **đường ghi thứ 14 mà plan bỏ sót** — xem mục 6 |
| `packages/coding-agent/test/config/settings-provenance-guard.test.ts` | *(tạo mới)* | — | 4 lớp che + 1 đối chứng + 1 rollback trên đĩa |

---

## 3. Các bước — mỗi bước có neo đã kiểm

Mọi neo dưới đây tôi đã mở đọc bằng `sed -n "<n>p"`. Văn bản trong ngoặc là nội dung thật của
dòng đó.

### Bước 1 — Tạo `packages/coding-agent/src/config/shadowing.ts`

Neo: `packages/coding-agent/src/cli/config-cli.ts:318`

```
318: function globalValue(setting: AnySetting): unknown {
319: 	let value: unknown = settings.getGlobalSettings();
320: 	for (const segment of setting.segments) value = isRecord(value) ? value[segment] : undefined;
321: 	return value;
322: }
```

- `isRecord` phải được import trong file mới. Đường dẫn: `@oh-my-pi/pi-utils`.
- `scope.getGlobalSettings()` có thật — `packages/coding-agent/src/config/settings.ts:1386`
  (`getGlobalSettings(): RawSettings {`).
- Đặt tên `globalLayerValue` (không phải `globalValue`) để phân biệt với `SettingsHost.get`.
- **Thêm trường `source` CẠNH `json`, đừng thay `json`.** Lý do đã kiểm: `config-cli.ts:310`
  là `console.log(JSON.stringify({ key: def.path, value: saved, ...shadow?.json }));` — spread
  thẳng `json` vào output `--json`. `json` là hợp đồng đã phát hành.

### Bước 2 — Dọn `config-cli.ts`

Neo: `packages/coding-agent/src/cli/config-cli.ts:307`

```
306: 	const saved = globalValue(def.setting);
307: 	const shadow = shadowingSource(def.setting);
...
310: 		console.log(JSON.stringify({ key: def.path, value: saved, ...shadow?.json }));
...
314: 	if (shadow) console.log(chalk.yellow(`${theme.status.warning} ${shadow.message}`));
```

- Thêm `import { globalLayerValue, shadowingSource } from "../config/shadowing";`
- Sửa hai chỗ gọi ở `:306`/`:307` thành truyền `settings` (singleton đã import ở `config-cli.ts:12`).
- **`isRecord` ở `config-cli.ts:8` sẽ thành import chết** — nó chỉ được dùng ở `:320`. `check:ts`
  chạy `oxlint .` (root `package.json:91`), nên import chết sẽ đỏ. Phải bỏ nó. Plan không nhắc.
- `AnySetting` ở `config-cli.ts:11` **phải giữ** — còn dùng ở `:35` và `:45`.
- `handleSet` bắt đầu ở `config-cli.ts:282`.

### Bước 3 — Thêm `SettingsProvenance` và `provenance` vào `SettingsHost`

Neo: `packages/tui/src/overlays/settings-defs.ts:131`

```
131: export interface SettingsHost {
132: 	entries: readonly SettingsDisplayEntry[];
133: 	get(path: string): unknown;
134: 	set(path: string, value: unknown): void;
135: 	/**
136: 	 * Removes the value from the global config: a project or other layer, or an environment
137: 	 * variable, that configures the setting still applies; otherwise the default does.
138: 	 */
139: 	unset(path: string): void;
140: 	normalizeProviderLimits(value: unknown): Record<string, number>;
141: 	validateProviderLimits(value: unknown): Record<string, number>;
142: }
```

- Dải 131-142 của plan **chính xác từng dòng**.
- Union phải soi 6 thành viên, không phải 5. Nguồn: `packages/coding-agent/src/config/settings.ts:62`
  → `export type SettingProvenance = "env" | "runtime" | "overlay" | "project" | "global" | "default";`
- **`set` ở `:134` đang trả `void` và phải đổi** — plan bỏ qua dòng này. Xem mục 6.
- `unset` ở `:139` **đã có sẵn**, không cần thêm thành viên mới cho nó.

### Bước 4 — Định nghĩa `SettingsWriteResult`

Neo: `packages/coding-agent/src/config/settings-ui.ts:77`

```
77: 		set: (path, value) => resolve(path).set(settings, value),
```

- Union: `{ status: "applied" } | { status: "shadowed"; source: Exclude<SettingsProvenance, "global" | "default">; message: string }`
- **Phải đặt union này ở phía tui, không phải coding-agent** — xem mục 6. Plan nói định nghĩa
  trong `settings-ui.ts` (coding-agent), nhưng tui không import được từ coding-agent (đã kiểm:
  `rg 'pi-coding-agent' packages/tui/src/ packages/tui/package.json` → **không trả về gì**).
  Hướng import hiện tại là coding-agent → tui (`settings-ui.ts:2`).

### Bước 5 — Cài chốt chặn trong `set`

Neo: `packages/coding-agent/src/config/settings-ui.ts:77`

Thứ tự bắt buộc, và mỗi bước có lý do đã kiểm trong mã nguồn:

1. `const previous = globalLayerValue(setting, settings);`
2. `setting.set(settings, value);`
3. đọc lại `written` / `effective` / `shadow`
4. `if (!shadow || Bun.deepEquals(effective, written)) return { status: "applied" };`
5. rollback rồi trả `shadowed`

Vì sao phải đọc lại `written` sau `set` — đã kiểm `registry.ts:716`:

```
716: 	set(scope: ScopeLike, value: T): void {
717: 		if (value === undefined) settingsOf(scope).unsetGlobalValue(this);
718: 		else settingsOf(scope).writeValue(this, this.#normalize(value), "global");
719: 	}
```

`#normalize(value)` ở `:718` — giá trị xuống đĩa KHÔNG phải giá trị bạn truyền vào. Đọc trước khi
ghi sẽ so sai hai thứ khác nhau.

Vì sao rollback gộp được thành một lần save — đã kiểm `settings.ts:836` (`if (layer === "global") this.#queueSave();`)
và `settings.ts:3324-3334`:

```
3324: 	#queueSave(): void {
3325: 		if (!this.#persist || !this.#configPath) return;
3326: 
3327: 		// Debounce: wait 100ms for more changes
3328: 		clearTimeout(this.#saveTimer);
3329: 		this.#saveTimer = setTimeout(() => {
...
3334: 		}, 100);
```

Rollback chạy trong cùng một tick nên `clearTimeout` lần hai giữ lại timer đầu. Đúng như plan nói.

Rollback dùng `setting.unset(settings)` — `registry.ts:735` `unset(scope)` → `settingsOf(scope).unsetGlobalValue(this)`. Đúng.

### Bước 6 — Cài `provenance` trên host

Neo: `packages/coding-agent/src/config/settings-ui.ts:74`

Host literal nằm ở `settings-ui.ts:74-81`, `createSettingsHost` mở ở `:51`, đóng ở `:82`.
`resolve` khai ở `:69`:

```
69: 	const resolve = (path: string): AnySetting => {
70: 		const setting = lookup(path);
71: 		if (!setting) throw new Error(`Unknown setting: ${path}`);
72: 		return setting;
73: 	};
```

Thêm `provenance: path => resolve(path).provenance(settings),`.
Nguồn phía nhận: `registry.ts:764`

```
764: 	provenance(scope: ScopeLike): SettingProvenance {
765: 		return this.#effectiveEnv(scope) !== undefined ? "env" : settingsOf(scope).getProvenance(this);
766: 	}
```

**Dùng 765, không dùng 764** — 764 là chữ ký. Đây là đính chính #5 của plan, tôi xác nhận là đúng.

### Bước 7 — Dồn 13 chỗ gọi về `#writeSetting`

Neo: `packages/tui/src/overlays/settings-selector.ts:349`

13 dòng đã kiểm từng dòng, khớp 1:1 với danh sách plan:

| dòng | nội dung thật | class/method chứa |
| --- | --- | --- |
| 349 | `this.#settings.set("providers.maxInFlightRequests", {});` | `ProviderLimitsSubmenu` (`:292`) |
| 393 | `this.#settings.set("providers.maxInFlightRequests", normalized);` | `ProviderLimitsSubmenu` |
| 876 | `this.#context.settings.set(path, boolValue);` | `#onSearchSettingChange` (`:871`) |
| 879 | `this.#context.settings.set(path, newValue);` | `#onSearchSettingChange` |
| 1162 | `this.#context.settings.set(def.path, value);` | `#createMultiSelect` (`:1149`) |
| 1200 | `this.#context.settings.set(path, -1);` | `#setSettingValue` (`:1196`) |
| 1202 | `this.#context.settings.set(path, -1);` | `#setSettingValue` |
| 1216 | `this.#context.settings.set(path, parsed);` | `#setSettingValue` |
| 1218 | `this.#context.settings.set(path, Number(value));` | `#setSettingValue` |
| 1220 | `this.#context.settings.set(path, value === "true");` | `#setSettingValue` |
| 1222 | `this.#context.settings.set(path, value);` | `#setSettingValue` |
| 1251 | `this.#context.settings.set(path, boolValue);` | onChange của `#showSettingsTab` (`:1229`) |
| 1258 | `this.#context.settings.set(path, newValue);` | onChange của `#showSettingsTab` |

Phân bố class (đã kiểm, hữu ích khi gõ):
- `ProviderLimitsSubmenu` — class mở ở `:292`, `readonly #settings: SettingsHost;` ở `:294`
- `SettingsSelectorComponent` — class mở ở `:498`, `readonly #context: SettingsRuntimeContext;` ở `:520`
- 6/13 chỗ đã đi qua `#setSettingValue` (`:1196-1223`). Đây là phễu sẵn có — chỉ cần sửa một chỗ
  thay vì sáu.

`#writeSetting` phải nhận `host` làm tham số và gọi `host.set(...)`, KHÔNG bám `this.#context`,
để cổng (1) thật sự về 0.

### Bước 8 — Bản `#writeSetting` riêng cho `ProviderLimitsSubmenu`

Neo: `packages/tui/src/overlays/settings-selector.ts:349`

Hai chỗ 349/393 thuộc `ProviderLimitsSubmenu`, dùng `this.#settings` (khai ở `:294`), khác
`this.#context.settings` của `SettingsSelectorComponent`. Cho class đó một `#writeSetting` riêng.

### Bước 9 — Chạy cổng (1)

Neo: `packages/tui/src/overlays/settings-selector.ts`

Baseline hôm nay: `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` → **13**.
Sau khi sửa phải là **0**.

### Bước 10 — `provenanceNote`

Neo: `packages/coding-agent/src/config/settings-ui.ts:39`

```
39: function envNote(setting: AnySetting): string {
40: 	if (!setting.envName || setting.envValue() === undefined) return "";
41: 	return setting.envFallback
42: 		? ` Unset, it falls back to $${setting.envName}.`
43: 		: ` $${setting.envName} overrides this setting while it is set.`;
44: }
```

Giữ nguyên `envNote` cho trường hợp env. Thêm `provenanceNote` cho các lớp còn lại, tái dùng
đúng chuỗi đã rút lên.

Danh sách mục được dựng lại ở `#buildItemsForDefs` — `settings-selector.ts:1280`. Đã kiểm, đúng.

### Bước 11 — Viết test

Neo: `packages/coding-agent/test/config/settings-panel-clear.test.ts` (đã tồn tại, 70 dòng)

Mẫu có sẵn, đã đọc toàn bộ: `beginSettingsTest()` / `restoreSettingsTestState()` ở
`packages/coding-agent/test/helpers/settings-test-state.ts:13` và `:31`.

Mẫu dựng panel thật (settings-panel-clear.test.ts:50-65):

```typescript
const selector = new SettingsSelectorComponent(
    { availableThinkingLevels: [], thinkingLevel: undefined, availableThemes: ["dark"],
      providers: [], settings: host, plugins: createPluginSettingsHost(projectDir) },
    { onChange: () => {}, onCancel: () => {} },
);
for (const ch of "searxng endpoint") selector.handleInput(ch);
selector.handleInput("\n"); selector.handleInput("\x15"); selector.handleInput("\n");
```

### Bước 12 — KHÔNG thêm changelog

Neo: `packages/coding-agent/CHANGELOG.md:3` → `## [Unreleased]`. Giữ nguyên cả hai mục.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/config/settings-provenance-guard.test.ts` (tạo mới — hiện
không tồn tại, đã kiểm `ls`).

| # | case | khẳng định | người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | project shadow | khoá **không** có trong `config.yml` sau lượt ghi từ panel; có lại giá trị global trước đó | gõ bật một setting mà `.omp/config.yml` của dự án đã quyết định → panel báo "đã áp dụng" → `config.yml` global lặng lẽ tích tụ giá trị chết |
| 2 | env shadow | khoá không có trong `config.yml` | gõ giá trị, panel báo đã áp dụng, nhưng `$VAR` vẫn chi phối và file vẫn dính giá trị |
| 3 | overlay shadow | khoá không có trong `config.yml` | tương tự, qua overlay `--config` |
| 4 | runtime shadow | khoá không có trong `config.yml` | tương tự, qua runtime override |
| 5 | **đối chứng không-che** | khoá **có** trong `config.yml` sau lượt ghi từ panel | chốt chặn biến thành từ chối trần → `/settings` thành chỉ-đọc với mọi setting mà project config đã định nghĩa |
| 6 | rollback trên đĩa | `YAML.parse(await Bun.file(globalConfigPath).text())` — khoá vắng mặt, phần còn lại của file **không đổi** so với trước lượt ghi | file bị ăn mòn dần theo mỗi lượt ghi bị che |

Case 5 không phải hàng đệm. Nó là thứ bắt đúng lỗi "từ chối trần" mà plan nêu là chế độ hỏng
chính.

**Cần bổ sung (plan không có, tôi đề xuất thêm):**

| # | case | vì sao phải có |
| --- | --- | --- |
| 7 | `unset` trên khoá bị project che | `settings-selector.ts:1112` là đường ghi thứ 14, chạy qua `host.unset` chứ không qua `host.set` — không case nào ở trên chạm tới nó |
| 8 | `omp config set --json` byte-identical trước/sau khi rút code | plan đòi "giống hệt từng byte" nhưng không có cổng nào kiểm |

---

## 5. Cổng

### 5.1 Cổng như plan viết — có đỏ được không?

| # | lệnh | trước | đỏ được? | đánh giá |
| --- | --- | --- | --- | --- |
| 1 | `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` | **13** | **CÓ** | ĐỎ HỘI LÝ — xem 5.2 |
| 2 | test project-shadow, đọc `config.yml` | — | **CÓ** | trung thực |
| 3 | test đối chứng không-che, đọc `config.yml` | — | **CÓ** | trung thực |
| 4 | `bun run check:ts` | — | **CÓ** | trung thực |

Cả bốn đều chạy được ngay trên máy này (addon đã build, `4 pass / 0 fail`).

### 5.2 Cổng (1) — cổng này yếu hơn vẻ ngoài, và plan tự mâu thuẫn với nó

**Cổng (1) có ĐỎ ĐƯỢC, nhưng nó là cổng phủ định: nó chỉ chứng minh được sự vắng mặt của một
mẫu, không chứng minh được chốt chặn tồn tại.** Nó không bắt được:

- đường ghi thứ 14 (`settings.unset(` ở `settings-selector.ts:1112`) — regex là `settings\.set\(`,
  nên `settings.unset(` **không khớp**;
- đường ghi thứ 15 viết dưới tên nhận khác (`host.set(`, `this.#settingsHost.set(`);
- một `set` implementation thứ hai (grep hiện chỉ ra **một**: `createSettingsHost`).

**Plan tự mâu thuẫn.** Bước 9 và cổng (1) nói con số phải là **0**. Nhưng dòng `MILESTONE_4_EXECUTION_PLAN.md:2803`
lại yêu cầu: *"Viết lại thành hai điều kiện: (1a) `grep -c 'settings\.set(' ...` phải **bằng đúng 13**"*,
tức giữ lại đường ghi trong panel và đặt chốt chặn ở tui. Hai thiết kế khác nhau. Work item đã chọn
"dồn về `host.set` → 0"; dòng 2803 vẫn viết theo thiết kế cũ. **Làm theo work item (0), và coi
2803 là đoạn đã lỗi thời.**

### 5.3 Cổng (2) — có ĐỎ ĐƯỢC, nhưng nó đã chốt sẵn một quyết định sản phẩm chưa ai chốt

Cổng (2) đỏ được khi rollback không hoạt động. Nhưng nó **giả định phương án (a) rollback**. Nếu
quyết định sản phẩm chốt phương án (b) — ghi rồi chú thích, đúng như `omp config set` đang làm —
thì cổng (2) **vĩnh viễn đỏ** dù code đúng ý định. Một cổng đỏ vì lý do sản phẩm tệ hơn không
có cổng. Phải chốt OQ1 **trước khi** viết test.

### 5.4 Các cổng còn thiếu — đều có thể đỏ được, nên phải thêm

| cổng đề xuất | lệnh / cách kiểm | đỏ được? |
| --- | --- | --- |
| (5) import chết | `grep -c 'isRecord' packages/coding-agent/src/cli/config-cli.ts` → phải là **0** | CÓ |
| (6) `omp config set` không đổi byte | chạy `omp config set --json` trước và sau, diff output | CÓ |
| (7) không còn định nghĩa cục bộ | `grep -c '^function shadowingSource\|^function globalValue' packages/coding-agent/src/cli/config-cli.ts` → **0** (baseline: **2**) | CÓ |
| (8) import mới có mặt | `grep -c 'from "\.\./config/shadowing"' packages/coding-agent/src/cli/config-cli.ts` → **1** (baseline: **0**) | CÓ |
| (9) `unset` cũng qua chốt chặn | test case 7 ở mục 4 | CÓ |

Baseline đã đo hôm nay: (5) = 1, (7) = 2, (8) = 0.

**Cảnh báo về cổng (4):** `check:ts` = `check:tools && ... check:types`, mà `check:tools`
(`package.json:91`) là `oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' ...`. Nghĩa là
`oxfmt` kiểm **cả format**. Một helper viết tay lệch format sẽ đỏ cổng vì lý do thẩm mỹ. Đỏ thật,
nhưng đỏ sai chỗ — hãy chạy `bunx oxfmt` trước khi báo cổng.

---

## 6. Cạm bẫy riêng của work item này

### 6.1 Đường ghi thứ 14 mà plan không biết — `settings-selector.ts:1112`

```
1112: 				if (value === "") this.#context.settings.unset(def.path);
```

Đây là **đường ghi duy nhất còn lại** trong panel mà không nằm trong danh sách 13, và nó **không khớp
regex của cổng (1)**. Nó cũng chính là đường mà test tồn tại sẵn (`settings-panel-clear.test.ts`)
đi qua (`\x15` xoá ô → enter). Nếu chốt chặn chỉ nằm trong `set`, người dùng xoá một ô mà
project config đang chi phối sẽ thấy giá trị quay lại y nguyên mà không có dòng giải thích nào.
Cần một `#clearSetting(host, path)` cùng trả về kết quả, hoặc ít nhất một quyết định tường minh
là bỏ qua.

### 6.2 Kiểu `SettingsWriteResult` đặt sai phía — tui không import được từ coding-agent

Bước 4 của plan định nghĩa `SettingsWriteResult` trong `settings-ui.ts` (coding-agent). Nhưng bước 7
lại bắt tui đọc `result.status` từ `host.set(...)`. Tui **không** import được từ coding-agent —
đã kiểm: `rg 'pi-coding-agent' packages/tui/src/ packages/tui/package.json` không trả về gì; chiều
import là coding-agent → tui (`settings-ui.ts:2`).

Và `settings-defs.ts:134` đang là `set(path: string, value: unknown): void;` — plan **không nói
tới dòng này**, dù file-touched của `settings-defs.ts` chỉ liệt kê "thêm union + thêm
`provenance`". Không sửa `:134` thì `#writeSetting` ở tui không thấy trường `status` nào và
`check:ts` đỏ.

Sửa: đặt `SettingsWriteResult` cùng `SettingsProvenance` trong `settings-defs.ts` (phía tui), và
đổi `:134` thành `set(path: string, value: unknown): SettingsWriteResult;`.

### 6.3 `get` trong chốt chặn ≠ giá trị panel hiển thị

- Panel hiển thị: `settings-ui.ts:76` → `get: path => lookup(path)?.layered(settings)`, và
  `registry.ts:540-544` ghi rõ `layered` là *"Value from the settings layers alone … **ignoring
  the environment variable** — what the settings panel shows and edits"*.
- Code shape của plan dùng `const effective = setting.get(settings);` — `get` **có** env.

Hai khác nhau đúng ở trường hợp env. Hệ quả người dùng thấy: sau một lượt ghi bị chặn, ô nhập sẽ vẽ
lại **giá trị trước khi ghi** (vì `layered` không đổi), không phải giá trị vừa gõ. Đây chính là cảm
giác "mất dữ liệu" mà OQ1 cảnh báo — và nó xảy ra **kể cả khi bạn chọn phương án (b)**, vì phương
án (b) vẫn ghi giá trị mới xuống global nên `layered` trả về giá trị mới. Chọn (a) thì ô lùi về
giá trị cũ; chọn (b) thì ô giữ giá trị mới và có dòng chú thích. Phải nói rõ với người dùng.

### 6.4 Trả `false` không dừng được thao tác chỉnh sửa cục bộ

`#createTextInput` gọi `onChange` **vô điều kiện** ngay sau lượt ghi (`settings-selector.ts:1112-1115`):

```
1112: 				if (value === "") this.#context.settings.unset(def.path);
1113: 				else this.#setSettingValue(def.path, value);
1114: 				this.#callbacks.onChange(def.path, this.#context.settings.get(def.path));
1115: 				wrappedDone(this.#formatTextInputValue(def, this.#context.settings.get(def.path)));
```

Tương tự ở `:1251-1252` và `:1258-1259`. Nếu `#writeSetting` trả `false` mà caller bỏ qua giá trị
trả về, panel vẫn `onChange` và vẫn vẽ lại. **Mọi call site phải bắt `false` và bỏ nhánh
`onChange`/re-render** — hoặc `#writeSetting` phải tự gọi affordance và caller vẫn phải dừng.
OQ3 của plan nêu đúng chỗ này và chưa có câu trả lời.

### 6.5 `tui` KHÔNG có affordance hiển thị thông báo nào

OQ3 của plan nói `#showInlineStatus` là "tên tượng trưng" — tôi xác nhận điều đó và nói thêm:
**không tồn tại** cái tương tự. Đã grep `showError|showStatus|statusMessage|errorMessage|setStatus|toast|notify|showMessage|renderError|inlineStatus`
trong `settings-selector.ts` → **không trả về gì**. Method gần nhất là `#getStatusPreviewString`
(`:1304`), thuộc tính năng xem trước status-line, không phải thông báo tức thời. Bạn phải
**thêm** affordance mới, hoặc trả thông báo qua `#footerHintText()` (`:572`).

### 6.6 Đếm `throw` trong plan sai

Plan viết: *"lệnh `throw` duy nhất trong `settings-selector.ts` là hai lần ném `Invalid record JSON`
ở dòng 1208 và 1211"*. Thực tế `grep -n 'throw '` trả về **ba** dòng: **389**, **1208**, **1211**.
Dòng 389:

```
389: 						if (!Number.isFinite(limit) || limit <= 0) throw new Error("Limit must be a positive number.");
```

nằm trong `onSubmit` của `ProviderLimitsSubmenu`, ngay cùng handler gọi `this.#settings.set(...)`
ở `:393`, và **không** bọc try/catch. Kết luận của plan vẫn đúng (không call site nào được bọc —
file chỉ có **một** try/catch, ở `:1205-1207`), nhưng lập luận phải dựa vào thực tế đó, không dựa
vào danh sách 2 dòng.

### 6.7 Cổng số 6 của plan — đừng dùng `grep -c 'shadowingSource'`

Plan đã cảnh báo đúng: sau khi rút code, file có **hai** dòng chứa `shadowingSource` (import +
chỗ gọi), con số y hệt trước đó (`grep -c 'shadowingSource'` hôm nay = **2**). Lệnh đó không
phân biệt được trước/sau. Dùng cổng (7)/(8) ở mục 5.4.

### 6.8 Hai tiền lệ mâu thuẫn — đọc đúng file

`omp config set` trong repo này (đã đọc `config-cli.ts:282-315`):
- `:297` ghi trước — `def.setting.set(settings, def.setting.parse(value));`
- `:298` `await settings.flush();`
- `:306-307` kiểm **sau khi ghi** bằng `globalValue` + `shadowingSource`
- `:314` `if (shadow) console.log(chalk.yellow(...));` — báo cáo, **không** rollback, **không** ném

dsh (đọc `~/Projects/deepseek-harness/packages/boot/config-editor/src/index.ts:127-137`, HEAD `477b4f4`):
- `:127` `if (!isDeepStrictEqual(effective?.config ?? {}, next)) {`
- `:128` `throw new Error(\`Configuration for "${entry.options.id}" is overridden by a home patch or command-line overlay\`)`
- `:130` `await writeFileAtomic(path, String(document), { mode: 0o600 })`
- `:133-137` khối rollback bảo vệ `reconcileProfilePatches`, KHÔNG phải config editor

**Số dòng plan nêu cho dsh là chính xác từng dòng.** Nhưng OQ1 của plan trích
`config-cli.ts:315-317` làm ví dụ cho phương án (b) — 315 là `}` đóng hàm, 316 trống, 317 là
JSDoc của `globalValue`. **Ba dòng đó không có gì về shadow cả.** Dải đúng là `:306-307` + `:314`.

---

## 7. Danh sách neo đã kiểm

**Đúng (giữ nguyên):**

| neo | nội dung xác nhận |
| --- | --- |
| `settings-defs.ts:131` | `export interface SettingsHost {` |
| `settings-defs.ts:141` | `validateProviderLimits(value: unknown): Record<string, number>;` — thành viên cuối |
| `settings-defs.ts:142` | `}` — đóng interface |
| `settings.ts:62` | `export type SettingProvenance = "env" \| "runtime" \| "overlay" \| "project" \| "global" \| "default";` |
| `settings.ts:800-808` | `getProvenance` — `#overrides` → `#configOverlay` → `#project` → `#global` → parent. **Không có nhánh env** |
| `settings.ts:818-838` | `writeValue` — `setByPath(this.#global, …)` tại `:828`, `#queueSave()` tại `:836` |
| `settings.ts:3324-3334` | `#queueSave` — debounce 100ms |
| `registry.ts:763` | `/** Layer supplying the effective value. */` |
| `registry.ts:764` | chữ ký `provenance(scope: ScopeLike): SettingProvenance {` |
| `registry.ts:765` | phép kiểm env — **dùng dòng này** |
| `registry.ts:766` | `}` |
| `settings-ui.ts:2` | import kiểu `SettingsHost` từ `@oh-my-pi/pi-tui/overlays/settings-defs` |
| `settings-ui.ts:39-44` | `envNote` |
| `settings-ui.ts:51` | `export function createSettingsHost(): SettingsHost {` |
| `settings-ui.ts:69` | `const resolve = (path: string): AnySetting => {` |
| `settings-ui.ts:74` | `return {` |
| `settings-ui.ts:77` | `set: (path, value) => resolve(path).set(settings, value),` |
| `settings-ui.ts:82` | `}` — đóng hàm |
| `config-cli.ts:307` | `const shadow = shadowingSource(def.setting);` |
| `config-cli.ts:310` | `...shadow?.json` spread vào output `--json` |
| `config-cli.ts:314` | `if (shadow) console.log(chalk.yellow(...));` |
| `config-cli.ts:318` | `function globalValue(setting: AnySetting): unknown {` |
| `config-cli.ts:325` | `function shadowingSource(setting: AnySetting): { json: Record<string, string>; message: string } \| undefined {` |
| `config-cli.ts:360` | `}` — cuối `shadowingSource` (không phải 357) |
| `settings-selector.ts:349` | `this.#settings.set("providers.maxInFlightRequests", {});` |
| `settings-selector.ts:393` | `this.#settings.set("providers.maxInFlightRequests", normalized);` |
| `settings-selector.ts:292` / `:294` | `class ProviderLimitsSubmenu` / `readonly #settings: SettingsHost;` |
| `settings-selector.ts:498` / `:520` | `export class SettingsSelectorComponent` / `readonly #context: SettingsRuntimeContext;` |
| `settings-selector.ts:321` / `:361` / `:363` | `#showProviderList()` / `}` / `#showProviderEditor(provider)` — dải 325-357 **không** có logic provenance |
| `settings-selector.ts:1280` | `#buildItemsForDefs(defs: SettingDef[]): SettingItem[] {` |
| `CHANGELOG.md:3` | `## [Unreleased]` |
| `packages/tui/package.json:94` | `"./*": {` — wildcard export |
| dsh `:127` `:128` `:130` `:133-137` | đúng từng dòng (HEAD `477b4f4`) |
| `settings-panel-clear.test.ts` | tồn tại, 70 dòng, dựng panel thật |
| `test/helpers/settings-test-state.ts:13` `:31` | `beginSettingsTest` / `restoreSettingsTestState` |

**Sai / cần sửa (chi tiết ở mục 6):**

| neo trong plan | nói gì | thực tế |
| --- | --- | --- |
| `config-cli.ts:315-317` (OQ1) | phương án (b) của `omp config set` | `}`, trống, JSDoc. Dải đúng: `:306-307` + `:314` |
| `settings-selector.ts` "chỉ có throw ở 1208 và 1211" | 2 throw | **3 throw**: 389, 1208, 1211 |
| "13 chỗ = toàn bộ đường ghi của `SettingsHost`" | 13 là kiểm kê đầy đủ | thiếu `settings.unset(` ở `:1112` |
| `settings-defs.ts` file-touched | chỉ thêm union + `provenance` | quên đổi `:134` từ `void` sang kiểu kết quả |
| bước 4 (định nghĩa `SettingsWriteResult`) | đặt trong `settings-ui.ts` | tui không import được từ coding-agent |
| `:2803` (GAP-REGISTER) | gate (1a) phải bằng **đúng 13** | mâu thuẫn bước 9 + cổng (1) (**0**) |
| OQ9 "HEAD `9cfbaba`" | HEAD tại lúc rà soát | hiện là `47720fd` |

**Chưa kiểm chứng (giữ nguyên cảnh báo của plan):** M2 WI-8a/WI-8b chưa có trong cây này.
`MILESTONE_4_EXECUTION_PLAN.md:346` ghi "CHƯA XÁC NHẬN" — tôi không tìm thấy bằng chứng nào ngược lại.
