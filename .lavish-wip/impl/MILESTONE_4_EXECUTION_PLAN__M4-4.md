# PHIẾU TRIỂN KHAI — M4-4

**Kế hoạch:** `MILESTONE_4_EXECUTION_PLAN.md` (mục `## M4-4.`, dòng 474)
**Nhánh:** `milestone-1` · **HEAD:** `47720fd`
**Ngày kiểm:** 2026-09-29 · mọi neo dưới đây đã `sed -n` / `grep -n` trực tiếp

---

## 1. Cái gì thay đổi, quan sát được

Bật/tắt plugin từ `/settings` hoặc từ `omp plugin enable/disable` giờ trả về một
kết quả có cấu trúc nói **thay đổi có thực sự nằm trên đĩa không** (`changed`) và
**phiên đang chạy có phản ánh thay đổi không** (`application`) — thay vì `void` vô
điều kiện, và hai writer của `~/.omp/plugins/omp-plugins.lock.json` đều đi qua
cùng một khoá OS nên không còn writer thứ hai đè mất thay đổi của writer thứ nhất.

Người dùng quan sát được: một lần bật plugin bị mất im lặng (một writer khác chạm
lockfile giữa lúc đọc và lúc ghi) **không còn xảy ra**, và lệnh CLI in ra được một
dòng nói rõ có cần restart hay không.

---

## 2. Bảng điểm sửa

TRƯỚC được trích **nguyên văn** từ file thật.

| # | Đường dẫn | Symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- | --- |
| 1 | `packages/coding-agent/src/extensibility/plugins/manager.ts:148-151` | `#saveRuntimeConfig` | `async #saveRuntimeConfig(): Promise<void> {`<br>`		await this.#ensureConfigLoaded();`<br>`		await Bun.write(getPluginsLockfile(), JSON.stringify(this.#runtimeConfig, null, 2));`<br>`	}` | **xoá hẳn.** Thay bằng `#mutateConfig(mutate, application): Promise<ChangeResult>` — read-modify-write + diff + `atomicWriteJson`, **toàn bộ bên trong** `withFileLock(getPluginsLockfile(), …)` |
| 2 | `…/plugins/manager.ts` (mới, cạnh `#ensureConfigLoaded` 141-146) | `ChangeResult` (export) | *(không tồn tại — `git grep ChangeResult packages/` = 0 hit)* | `export interface ChangeResult { changed: boolean; application: "applied" \| "restart-required"; }` |
| 3 | `…/plugins/manager.ts:874-881` | `setEnabled` | `async setEnabled(name: string, enabled: boolean): Promise<void> {`<br>`		const config = await this.#ensureConfigLoaded();`<br>`		if (!config.plugins[name]) {`<br>`			throw new Error(\`Plugin ${name} not found in runtime config\`);`<br>`		}`<br>`		config.plugins[name].enabled = enabled;`<br>`		await this.#saveRuntimeConfig();`<br>`	}` | `Promise<ChangeResult>`; `config.plugins[name].enabled = enabled;` **chuyển vào trong** callback của `#mutateConfig` |
| 4 | `…/plugins/manager.ts:898-920` | `setEnabledFeatures` | `async setEnabledFeatures(name: string, features: string[] | null): Promise<void> {` … `:906  const plugin = await this.getPlugin(name, { path: path.join(getPluginsNodeModules(), name) });` … `:918  config.plugins[name].enabledFeatures = features;` `:919  await this.#saveRuntimeConfig();` | `Promise<ChangeResult>`. **`:906` gọi `getPlugin` TRƯỚC, ngoài khoá**, kết quả `plugin` đóng lại trong scope rồi truyền vào callback — không giữ OS lock qua I/O đọc manifest |
| 5 | `…/plugins/manager.ts:942-949` | `setPluginSetting` | `async setPluginSetting(name: string, key: string, value: unknown): Promise<void> {`<br>`		const config = await this.#ensureConfigLoaded();`<br>`		if (!config.settings[name]) {`<br>`			config.settings[name] = {};`<br>`		}`<br>`		config.settings[name][key] = value;`<br>`		await this.#saveRuntimeConfig();`<br>`	}` | `Promise<ChangeResult>`; mutation vào trong callback. **ĐÂY LÀ DẢI MÀ M3-A4 CŨNG VIẾT LẠI** — phải cùng PR hoặc thứ tự merge tường minh |
| 6 | `…/plugins/manager.ts:954-960` | `deletePluginSetting` | `…`<br>`		if (config.settings[name]) {`<br>`			delete config.settings[name][key];`<br>`			await this.#saveRuntimeConfig();`<br>`		}`<br>`	}` | `Promise<ChangeResult>`. **Bỏ chặn `if (config.settings[name])`** — khoá vắng tự sinh `changed:false` qua diff thay vì qua nhánh |
| 7 | `…/plugins/manager.ts:668, 724, 855, 958, 1221, 1231` | `install` / `uninstall` / `link` / `deletePluginSetting` / `#removeInvalidFeature` / `#removeOrphanedConfig` | `await this.#saveRuntimeConfig();` (6 dòng, nguyên văn giống hệt nhau) | `await this.#mutateConfig(config => { …mutation… }, "…");` |
| 8 | `…/plugins/manager.ts:880, 919, 948` | ba mutator công khai còn lại | `await this.#saveRuntimeConfig();` | như #7 |
| 9 | `…/plugins/marketplace/registry.ts:44-71` | `atomicWriteJson` (local) | nguyên văn 28 dòng, `async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {` … `const tmpPath = \`${filePath}.tmp\`;` … `// Windows EPERM fallback: unlink target, then rename` … `// Clean up tmp on unexpected errors` … `}` | **xoá khỏi registry.ts**, chuyển **nguyên văn** sang `packages/utils/src/atomic-write.ts` + thêm chữ `export`. Hai comment ở `registry.ts:53` và `:62` **phải đi theo** |
| 10 | `…/plugins/marketplace/registry.ts:95, 128` | `writeMarketplacesRegistry` / `writeInstalledPluginsRegistry` | `await atomicWriteJson(filePath, reg);` | giữ nguyên chữ ký; chỉ đổi import sang `@oh-my-pi/pi-utils` |
| 11 | `packages/utils/src/atomic-write.ts` | `atomicWriteJson` (mới) | *(file chưa tồn tại)* | `export async function atomicWriteJson(filePath: string, data: unknown): Promise<void>` — chuyển nguyên văn từ #9 |
| 12 | `packages/utils/src/index.ts` (chèn sau dòng 2) | barrel | dòng 2 = `export * from "./async";`, dòng 3 = `export * from "./binary";` | chèn `export * from "./atomic-write";` giữa hai dòng đó. Dòng 9 **đã có** `export * from "./file-lock";` — không cần đụng |
| 13 | `…/plugins/marketplace/manager.ts:923-925` | `#writeRuntimeConfig` | `async #writeRuntimeConfig(scope: "user" \| "project", config: PluginRuntimeConfig): Promise<void> {`<br>`		await Bun.write(this.#runtimeLockPath(scope), JSON.stringify(config, null, 2));`<br>`	}` | nhận `mutate` callback, đọc lại **bên trong** `withFileLock(this.#runtimeLockPath(scope), …)`, ghi bằng `atomicWriteJson`. **Đây là writer thứ hai của cùng một file lockfile** |
| 14 | `…/plugins/marketplace/manager.ts:1076, 1087, 1097` | `#registerRuntimePlugin` / `#removeRuntimePlugin` / `#setRuntimePluginEnabled` | `await this.#writeRuntimeConfig(scope, config);` (3 dòng) | truyền mutation vào, không truyền object đã mutate sẵn |
| 15 | `packages/tui/src/overlays/plugin-settings.ts:72` | `PluginSettingsManager.setEnabled` | `	setEnabled(name: string, enabled: boolean): Promise<void>;` | `Promise<ChangeResult>` |
| 16 | `…/plugin-settings.ts:74` | `PluginSettingsManager.setEnabledFeatures` | `	setEnabledFeatures(name: string, features: string[] | null): Promise<void>;` | `Promise<ChangeResult>` |
| 17 | `…/plugin-settings.ts:75` | `PluginSettingsManager.setPluginSetting` | `	setPluginSetting(name: string, key: string, value: unknown): Promise<void>;` | `Promise<ChangeResult>` |
| 18 | `…/plugin-settings.ts:776, 786, 790, 823` | 4 call site overlay | `await this.#manager.setEnabled(plugin.name, enabled);`<br>`await this.#manager.setEnabledFeatures(plugin.name, [...current]);`<br>`await this.#manager.setPluginSetting(plugin.name, key, value);`<br>`await this.#manager.setPluginSetting(pluginName, key, value);` | `const r = await …;` rồi dùng `r` (bật/tắt trên UI, hoặc `onPluginChanged` mang theo kết quả) |
| 19 | `packages/coding-agent/src/cli/plugin-cli.ts:761` | `setEnabledFeatures` cmd | `await manager.setEnabledFeatures(pluginName, [...currentFeatures]);` | `const r = await …;` + in dòng `application` |
| 20 | `…/plugin-cli.ts:906` | `setPluginSetting` cmd | `await manager.setPluginSetting(pluginName, key, value);` | như #19 |
| 21 | `…/plugin-cli.ts:917` | `deletePluginSetting` cmd | `await manager.deletePluginSetting(pluginName, key);` | như #19 |
| 22 | `…/plugin-cli.ts:1038` | `setEnabled` cmd | `await manager.setEnabled(name, enabled);` | như #19 |
| 23 | `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` | test mới | *(file chưa tồn tại)* | xem §4 |
| 24 | 3 file `CHANGELOG.md` | — | — | **KHÔNG sửa trong PR này** (plan §6.2 cấm). Chỉ đánh dấu. |

---

## 3. Các bước — mỗi bước gắn neo đã kiểm

### Bước 0 — Dựng native addon (tiền đề cứng)

```
brew install ninja
bun --cwd=packages/natives run build
```

Neo: `packages/natives/package.json:32` → `"build": "bun ../../scripts/bazel-natives.ts host --dest native"` ✓
Đã kiểm trên cây này: `packages/natives/native/` có `.build/` (2026-09-29), `which ninja` → `/opt/homebrew/bin/ninja`.

Vì sao cứng: `withFileLock` import `FileLock` từ native addon —
`packages/utils/src/file-lock.ts:9`:
`import { FileLock as NativeFileLock } from "@oh-my-pi/pi-natives";` ✓
Không có addon, **mọi** test chạm lock chết ngay ở bước import.

### Bước 1 — Tạo `packages/utils/src/atomic-write.ts` + nối barrel

Nguồn: `packages/coding-agent/src/extensibility/plugins/marketplace/registry.ts:44-71` ✓ (28 dòng, đã đọc)
Bản thân:
- `:44` `async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {`
- `:45` `const content = \`${JSON.stringify(data, null, 2)}\n\`;`
- `:46` `const tmpPath = \`${filePath}.tmp\`;`
- `:53` `// Windows EPERM fallback: unlink target, then rename`
- `:54` `if ((err as NodeJS.ErrnoException).code === "EPERM") {`
- `:62` `// Clean up tmp on unexpected errors`

Chuyển **nguyên văn** (kể cả hai comment), thêm `export`.
Neo barrel: `packages/utils/src/index.ts:2` `export * from "./async";` · `:3` `export * from "./binary";` ✓ — chèn giữa.

Sau đó xoá `registry.ts:44-71`, và `registry.ts:95` + `:128` import từ `@oh-my-pi/pi-utils`.

### Bước 2 — Thêm `ChangeResult` + `#mutateConfig`, xoá `#saveRuntimeConfig`

Xoá `manager.ts:148-151`:
```
	async #saveRuntimeConfig(): Promise<void> {
		await this.#ensureConfigLoaded();
		await Bun.write(getPluginsLockfile(), JSON.stringify(this.#runtimeConfig, null, 2));
	}
```
Thay bằng helper có callback. Neo tham chiếu cho việc đọc lại: `manager.ts:141-146` `#ensureConfigLoaded` ✓
(nó memoize `this.#runtimeConfig` theo từng instance — `:142-143`) — **đây là lý do
dùng `#loadRuntimeConfig()` (`:137-139`, đọc `#readRuntimeConfigAt(getPluginsLockfile())`)
bên trong khoá, không dùng `#ensureConfigLoaded()`**.

Import `withFileLock` + `atomicWriteJson` từ `@oh-my-pi/pi-utils` **top level**
(`manager.ts:6` `getPluginsLockfile` và `:13` `} from "@oh-my-pi/pi-utils";` ✓ — chỉ cần
thêm tên vào khối import sẵn có, không mở khối mới).

### Bước 3 — Chuyển bốn mutator công khai

`manager.ts:874-881` (`setEnabled`) · `:898-920` (`setEnabledFeatures`) · `:942-949`
(`setPluginSetting`) · `:954-960` (`deletePluginSetting`) — tất cả đã đọc và trích ở §2.

**Điểm duy nhất cần suy nghĩ:** `:906`
`const plugin = await this.getPlugin(name, { path: path.join(getPluginsNodeModules(), name) });`
→ gọi **trước**, ngoài khoá, rồi truyền `plugin` vào closure. Không đổi chữ ký
`#mutateConfig` thành async.

### Bước 4 — Chuyển năm writer còn lại

Tất cả đã xác minh là `await this.#saveRuntimeConfig();`:
- `:668` install (`config.plugins[pkg.name] = { version, enabledFeatures, enabled: true }`)
- `:724` uninstall (`delete config.plugins[name]; delete config.settings[name];`)
- `:855` link
- `:958` `deletePluginSetting` (dòng save bên trong nhánh)
- `:1221` `#removeInvalidFeature` (đã trả `Promise<boolean>` — **giữ** boolean, trả `ChangeResult` bên cạnh)
- `:1231` `#removeOrphanedConfig` (đã trả `Promise<boolean>` — **giữ** boolean)

### Bước 5 — Khoá writer thứ hai: `MarketplaceManager.#writeRuntimeConfig`

`…/marketplace/manager.ts:923-925` ✓ (đã đọc). Ba call site `:1076`, `:1087`, `:1097` ✓.

**Đã chạy chuỗi phân giải đường dẫn, xác nhận là CÙNG một file:**
```
getPluginsLockfile()  = path.join(getPluginsDir(), "omp-plugins.lock.json")   dirs.ts:662-664
getInstalledPluginsRegistryPath() = path.join(getPluginsDir(), "installed_plugins.json")   registry.ts:30-32
#runtimeRoot("user")  = path.dirname(installedRegistryPath)                   marketplace/manager.ts:898-900
#runtimeLockPath("user") = path.join(#runtimeRoot("user"), "omp-plugins.lock.json")       :906-908
⇒ cùng ra ~/.omp/plugins/omp-plugins.lock.json
```
Còn hai writer của nó: `:728` (`writeInstalledPluginsRegistry` — registry, **không** khoá,
xem câu hỏi mở về hậu tố `.tmp`) và `:733` → `:1091-1097` (`#setRuntimePluginEnabled` →
`#writeRuntimeConfig` — **lockfile, phải khoá**).

### Bước 6 — Nới `PluginSettingsManager` ở tui

`plugin-settings.ts:68` (interface) · `:72`, `:74`, `:75` (ba mutator) · call site
`:776`, `:786`, `:790`, `:823` ✓ tất cả.

**Neo quan trọng mà kế hoạch KHÔNG trích:** `packages/coding-agent/src/extensibility/plugins/settings-host.ts:16`
→ `manager: new PluginManager(cwd),`
Đây là **chỗ duy nhất** trong repo nơi `PluginManager` được gán vào trường kiểu
`PluginSettingsManager`. Đây là nơi trôi hình dạng `ChangeResult` sẽ **nổ thành lỗi
build** dưới `bun run check:ts` (bước 6 của cổng).

Nếu tui không import được kiểu từ coding-agent (chiều phụ thuộc chạy ngược), **khai
báo `ChangeResult` trong tui** và để `PluginManager` thoả mãn nó có cấu trúc. Kiểu phải
được **một** khai báo, không phải hai bản gần giốn.

### Bước 7 — Bốn lệnh CLI hành xử theo kết quả

`plugin-cli.ts:761`, `:906`, `:917`, `:1038` ✓ tất cả. Hiện đều là `await manager.x(…)` trần.

### Bước 8 — Viết test

Xem §4.

### Bước 9 — Hoà giải với M3-A4

Dải `setPluginSetting` `manager.ts:942-949` là giao điểm. Chọn: cùng PR, hoặc thứ tự
merge tường minh. Guard hồi quy: xem cổng (e).

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/plugin-runtime-config-lock.test.ts` (mới — `ls` xác nhận chưa tồn tại)

**Cách cô lập** (bắt buộc — lấy nguyên mẫu từ `packages/coding-agent/test/plugin-config.test.ts:20-34`):
```ts
beforeEach: fs.mkdtemp(path.join(os.tmpdir(), "omp-…"))
  spyOn(piUtils, "getPluginsDir").mockReturnValue(pluginsDir)
  spyOn(piUtils, "getPluginsLockfile").mockReturnValue(lockfile)
  spyOn(piUtils, "getProjectDir").mockReturnValue(tmpRoot)
  spyOn(piUtils, "getProjectPluginOverridesPath").mockReturnValue(…)
afterEach:  mock.restore();  await removeWithRetries(tmpRoot)
```
`removeWithRetries` xuất phát từ `packages/utils/src/temp.ts:90` ✓, re-export qua barrel.
`spyOn` bắt buộc vì `PluginManager.#loadRuntimeConfig()` (`manager.ts:137-139`) gọi
`getPluginsLockfile()` — đường dẫn **toàn cục**, không gốc cwd (`manager.ts:119`
`constructor(cwd: string = getProjectDir())` chỉ dùng cho project overrides).

| # | Case | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| **1** | Hai instance `PluginManager` độc lập, **cùng** lockfile đã spy, `setEnabled` chạy đồng thời (`Promise.all`) → JSON trên đĩa chứa **cả hai** plugin ở trạng thái mới | Một lần bật plugin **tự biến mất** — đúng thất bại đã sinh ra M4-4 |
| **2** | **Negative control (bắt buộc).** Cùng kịch bản (1) nhưng bằng thuật toán **trước khi sửa**: đọc JSON → mutate → `Bun.write` trần, **không khoá**. Assert file chỉ chứa **một** trong hai thay đổi | Không có case này thì case (1) chứng minh **không điều gì** — xanh trên cả code chưa sửa |
| **3** | `setEnabled` với giá trị đang có → `changed:false`, **byte trên đĩa không đổi** | `changed` trở thành cờ trong bộ nhớ, vô nghĩa |
| **4** | `deletePluginSetting` trên khoá vắng → `changed:false` | Nhánh "không có gì để xoá" ghi file rác |
| **5** | `setEnabled("không-có")` → reject `/not found in runtime config/` **và file không đổi** | Lời gọi hỏng làm hỏng lockfile (lỗi ném phải xảy ra **trước** mọi lệnh ghi, tức là bên trong khoá) |
| **6** | `setEnabled` trả `application: 'restart-required'` | Trường `application` không bao giờ được đặt |
| **7** | `atomicWriteJson` không để lại `.tmp`; output parse được, có `\n` cuối | File tạm orphan; JSON hỏng |
| **8** | `MarketplaceManager.#writeRuntimeConfig` cũng đi qua khoá (nếu Bước 5 đã làm) | Writer thứ hai vẫn đè mất — hiệu ứng "không còn writer thứ hai" là **sai** |

**Cố tình KHÔNG test:** nhánh EPERM trên Windows (không tái hiện được trên darwin-arm64,
không giả lập bằng source-grep cũng không ép errno — nói thẳng là chưa test).
Không test constructor. Không source-grep `manager.ts` để chứng minh refactor.

**Coi chừng:** `withFileLock` mặc định `retries: 50, retryDelayMs: 100`
(`file-lock.ts:26-29`) → chờ tối đa ~5s. Test tranh chấp phải hoàn tất trong bài
trong ngân sách đó, nếu không nó fail vì hết giờ chờ chứ không vì mất update.

**Hai file test phải giữ xanh:** `packages/utils/test/file-lock.test.ts` (đo hôm nay:
**4 pass / 0 fail**) và `packages/coding-agent/test/plugin-config.test.ts` (đo hôm nay:
**7 pass / 0 fail**).

---

## 5. Cổng

### Trạng thái đo hôm nay (2026-09-29, HEAD `47720fd`, addon đã build)

| # | Lệnh | Hôm nay | Đỏ được? |
| --- | --- | --- | --- |
| a | `bun test packages/utils/test/file-lock.test.ts` | ✅ **4 pass / 0 fail** | **ĐỎ ĐƯỢC** — nhưng đây là *lưới an toàn*, **không phải cổng**: nó xanh khi **chưa làm gì cả** |
| b | `bun test packages/coding-agent/test/plugin-runtime-config-lock.test.ts` | 🔴 **đỏ** — `The following filters did not match any test files` | ✅ **ĐỎ ĐƯỢC, đúng nghĩa** |
| c | `git grep -n 'saveRuntimeConfig' -- packages/` | 🔴 **10 hit** | ⚠️ đỏ được, nhưng **yếu** — xem bên dưới |
| d | `git grep -n 'atomicWriteJson' -- packages/` | **3 dòng** (1 def + 2 call site) | ❌ **Lệnh này không đánh giá được gate** — xem bên dưới |
| e | `grep -c secret …/manager.ts` | in ra `0` | ⚠️ xanh sẵn, **phân biệt được gì đâu** |
| f | `bun run check:ts` | ✅ **exit 0** | ✅ **ĐỎ ĐƯỢC** — cổng thật |

### Trả lời thẳng: cổng này có ĐỎ ĐƯỢC không?

**Có — nhưng chỉ 2 trong 6 bước thật sự là cổng (b) và (f).** Bốn bước còn lại hoặc
xanh sẵn, hoặc không đo được thứ nó tưởng đo. Dưới đây là bản viết lại.

**Về (c):** `git grep -n 'saveRuntimeConfig'` **đỏ được** (10 hit hôm nay), nhưng nó
yếu đúng như kế hoạch đã tự thừa nhận: ai đó **đổi tên** `#saveRuntimeConfig` thay vì
xoá nó, grep vẫn xanh trong khi ổ khoá đã biến mất im lặng. **Thay bằng hai grep
chống-đổi-tên** — chúng bắt đúng thứ quan trọng (lệnh ghi trần **không khoá** vào
lockfile), không quan tâm tên hàm:
```bash
# (c) — viết lại: hai lệnh ghi trần, không khoá, phải biến mất
git grep -n 'Bun.write(getPluginsLockfile' -- packages/            # hôm nay: 1 hit  @ manager.ts:150
git grep -n 'Bun.write(this.#runtimeLockPath' -- packages/         # hôm nay: 1 hit  @ marketplace/manager.ts:924
```
Đỏ hôm nay. Đỏ sau khi đổi tên bất kỳ hàm nào. **Đây là bản sửa cho (c).**

**Về (d): lệnh hiện tại KHÔNG BAO GIỜ đánh giá được.** Nó in **3 dòng** hôm nay
(1 định nghĩa ở `registry.ts:44` + 2 call site ở `:95`, `:128`) và sẽ in **3 dòng**
sau khi refactor (1 định nghĩa ở `packages/utils/src/atomic-write.ts` + 2 call site
vẫn ở `registry.ts`). `git grep -n` không phân biệt "định nghĩa" với "call site", nên
lệnh **luôn xanh** với bất kỳ trạng thái nào. **Viết lại thành đếm định nghĩa:**
```bash
# (d) — viết lại: đếm ĐỊNH NGHĨA, không đếm dòng
git grep -n 'async function atomicWriteJson' -- packages/          # phải đúng 1 dòng, trong packages/utils/
test "$(git grep -c 'async function atomicWriteJson' -- packages/utils/ | cut -d: -f2)" = 1 \
  && echo "PASS: đúng 1 định nghĩa, ở packages/utils" || echo "FAIL"
```
Đo thật hôm nay: `git grep -n 'async function atomicWriteJson' -- packages/` in ra
**đúng 1 dòng, ở `registry.ts:44`**, và `git grep -c … -- packages/utils/` không khớp
⇒ lệnh in **`FAIL`**. Nó **đỏ hôm nay** vì vị trí sai, đỏ lại nếu ai chép thêm một bản,
và xanh đúng khi bản duy nhất nằm trong `packages/utils`.

**Về (e):** xanh sẵn ở baseline. Nó canh hồi quy tương lai, **không** chứng minh
M3-A4 đã land. Giữ, nhưng ghi nó là guard của M3 mà PR này không được phá.
Đỏ được nếu ai thêm chữ `secret` vào `manager.ts`. Giữ nguyên `grep -c` (GNU),
**không** dùng `git grep -c` (in rỗng khi không match, không phân biệt pass với sai lệnh).

**Cổng (b) là cổng duy nhất chứng minh đúng thứ mình nói.** Bắt buộc làm thêm một
bước mà kế hoạch nói nhưng không viết thành lệnh:
```bash
# (b+) — CHỨNG MINH CỔNG CÓ RĂNG. Xoá withFileLock khỏi #mutateConfig → phải ĐỎ.
#       Sửa lại → phải xanh lại. Không làm hai bước này thì (b) chưa từng thấy đỏ.
```
Một cổng chưa từng thấy đỏ thì không phải cổng.

### Cổng hoàn thành (thứ tự bắt buộc)

```bash
brew install ninja                                                    # 0: tiền đề
bun --cwd=packages/natives run build                                  # 0
bun test packages/utils/test/file-lock.test.ts                         # (a) 4 pass / 0 fail
bun test packages/coding-agent/test/plugin-runtime-config-lock.test.ts # (b) mới, xanh
bun test packages/coding-agent/test/plugin-config.test.ts              # (d') 7 pass / 0 fail
git grep -n 'Bun.write(getPluginsLockfile' -- packages/               # (c) 0 hit
git grep -n 'Bun.write(this.#runtimeLockPath' -- packages/            # (c) 0 hit
# (d) đếm định nghĩa atomicWriteJson → 1, trong packages/utils/
grep -c secret packages/coding-agent/src/extensibility/plugins/manager.ts | grep -qx 0 && echo PASS || echo FAIL   # (e)
bun run check:ts                                                       # (f) exit 0
```

**Lệnh cấm:** `tsc` / `npx tsc` — AGENTS.md:261.

**Lệch chủ ý với AGENTS.md:** AGENTS.md:261 nói "always `bun check`". Kế hoạch dùng
`bun run check:ts`. **Kế hoạch đúng** — `package.json:89` cho thấy
`"check": "bun run --parallel check:ts check:rs"`, mà Rust là toolchain riêng, không
thuộc item này. Ghi vào PR để reviewer không tưởng bạn phớt lờ rule.

---

## 6. Cạm bẫy riêng của work item này

### Cạm bẫy 1 — Bọc khoá quanh `#saveRuntimeConfig` làm rơi 100% lệnh ghi

Đây là cách sai **đúng chữ** của kế hoạch, và nó **không đỏ** ở bất kỳ cổng nào
trong danh sách cũ. Cả chín call site mutate `this.#runtimeConfig` đã memoize
**trước** khi gọi save — ví dụ `manager.ts:874-881`:
```
874  async setEnabled(name: string, enabled: boolean): Promise<void> {
875      const config = await this.#ensureConfigLoaded();
876      if (!config.plugins[name]) { … }
879      config.plugins[name].enabled = enabled;      ← mutate ĐÃ xong, NGOÀI khoá
880      await this.#saveRuntimeConfig();
```
Bọc `withFileLock` quanh `save` + đọc lại bên trong khoá ⇒ lần đọc lại **đè mất**
mutation vừa áp. Kết quả: khoá tuần tự hoá hoàn hảo, mọi test có thể xanh, và
**100% lệnh ghi rơi âm thầm trong production**. Mutation **phải** là callback ở
trong phần khoá. Không có cách nào bọc khoá quanh lệnh save sẵn có mà giữ call site.

### Cạm bẫy 2 — `changed` là cờ trong bộ nhớ thì vô nghĩa

`return changed` từ setter làm mọi test xanh và trường trở nên vô nghĩa. `changed`
**phải** là diff quan sát trên đĩa: `JSON.stringify` trước/sau, so sánh trong khoá.
Test case (3) ở §4 là hàng phòng thủ cho cái này — nó khẳng định **byte trên đĩa
không đổi**, chứ không phải cờ trả về.

### Cạm bẫy 3 — Test một instance thì xanh trên cả code chưa sửa

`#ensureConfigLoaded` (`manager.ts:141-146`) memoize `this.#runtimeConfig` theo từng
instance, nên hai lệnh `setEnabled` trên **một** instance mutate cùng một object và
lần ghi thứ hai tất yếu chứa cả hai thay đổi **ngay cả khi xoá hẳn khoá đi**. Test
một instance xanh trên cả hai thế giới và canh không cái gì. **Bắt buộc hai instance.**

### Cạm bẫy 4 — `mock.module()` bị cấm, và vá lớp cũng là cùng loại nói dời

AGENTS.md cấm `mock.module()` hoàn toàn (rò rỉ registry toàn cục). Negative control
phải là **bản cài lại nội tuyến**: đọc JSON → mutate → `Bun.write` trần, ghi đúng
byte xuống đúng lockfile đã spy. Không vá `PluginManager` để tự bỏ khoá.

### Cạm bẫy 5 — `atomicWriteJson` dùng hậu tố `.tmp` cố định

`registry.ts:46` → `const tmpPath = \`${filePath}.tmp\`;`. Tên tạm dùng chung chỉ an
toàn khi **mọi** writer của một file cùng lấy cùng một khoá. Sau M4-4 đúng với
lockfile; **không** đúng với hai marketplace registry (`:728` và tương tự) vì chúng
không khoá. `packages/ai/src/auth-broker/snapshot-cache.ts:93` dùng dạng cứng hoá
`${opts.path}.${process.pid}.${randomHex(8)}.tmp`. **Câu hỏi mở — quyết trước khi
tiện ích này thành trung tâm.**

### Cạm bẫy 6 — `application` chưa có mặc định, và cặp nhị phân không diễn tả được hiện thực

`git grep 'restart-required' -- packages/` → **0 hit**. Đường overlay chỉ reload
**MỘT PHẦN**: `settings-selector.ts:1329` → `selector-controller.ts:305-312` gọi
`clearPluginRootsAndCaches` (`:307`), `refreshSkillState` (`:308`),
`refreshSlashCommandState` (`:309`), `resetCapabilities` (`:310`) — và **không** gọi
`refreshAgentDiscovery`, thứ mà reload thật làm tại `acp-agent.ts:2167`. Trung thực
phải nói là "áp dụng một phần", mà `"applied" | "restart-required"` **không** diễn
tả được. **Chưa có mặc định — cần người quyết.**

### Cạm bẫy 7 — Đừng để dải `setPluginSetting` 942-949 bị hai bản vá âm thầm huỷ

M3-A4 viết lại **đúng** dải này. Hai bản vá độc lập trên cùng dải → một trong hai
biến mất không báo. Hoặc cùng PR, hoặc thứ tự merge tường minh.

### Cạm bẫy 8 — Nới kiểu `setPluginEnabled` là breaking change **độc lập**

`PluginSettingsMarketplaceManager.setPluginEnabled` (`plugin-settings.ts:81`) do
`MarketplaceManager` (`marketplace/manager.ts:686`) thực hiện. Nếu nới kiểu nó,
`packages/coding-agent/test/modes/components/plugin-list-marketplace.test.ts:150-154`
(`spyOn(MarketplaceManager.prototype, "setPluginEnabled").mockImplementation(async … => {})`
trả `Promise<void>`) **sẽ đỏ**. Đó là breaking change có sức nặng changelog riêng —
**không** gộp vào PR này nếu chưa quyết.

---

## 7. Bảng kiểm neo — kết quả thật

### 7a. Neo ĐÚNG (giữ nguyên)

| Neo | Nội dung thật tại dòng đó |
| --- | --- |
| `manager.ts:148-151` | `#saveRuntimeConfig` ✓ |
| `manager.ts:141-146` | `#ensureConfigLoaded` ✓ |
| `manager.ts:874-881` / `898-920` / `942-949` | `setEnabled` / `setEnabledFeatures` / `setPluginSetting` ✓ |
| `manager.ts:906` | `await this.getPlugin(name, { path: path.join(getPluginsNodeModules(), name) });` ✓ |
| `manager.ts:668, 724, 855, 880, 919, 948, 958, 1221, 1231` | cả 9 dòng đều là `await this.#saveRuntimeConfig();` ✓ |
| `manager.ts:1221` / `:1231` | `#removeInvalidFeature` / `#removeOrphanedConfig`, cả hai `Promise<boolean>` ✓ |
| `plugin-settings.ts:68` / `:72` / `:74` / `:75` | interface + 3 mutator `Promise<void>` ✓ |
| `plugin-settings.ts:776, 786, 790, 823` | 4 call site ✓ |
| `registry.ts:44-71` | `atomicWriteJson` ✓ (đúng 28 dòng, đóng ở 71) |
| `registry.ts:53` / `:62` | hai comment ✓ |
| `registry.ts:95` / `:128` | hai caller ✓ |
| `utils/src/index.ts:9` / `:7` | `./file-lock` / `./executable` ✓ |
| `utils/src/file-lock.ts:1-6` | doc comment, nguyên văn khớp ✓ |
| `utils/src/file-lock.ts:9` | `import { FileLock as NativeFileLock } from "@oh-my-pi/pi-natives";` ✓ |
| `utils/src/file-lock.ts:70` | `export async function withFileLock<T>` ✓ |
| `marketplace/manager.ts:906-908` | `#runtimeLockPath` ✓ |
| `marketplace/manager.ts:923-925` | `#writeRuntimeConfig` (`Bun.write` trần) ✓ |
| `marketplace/manager.ts:1076, 1087, 1097` | 3 call site ✓ |
| `marketplace/manager.ts:686` / `:728` / `:733` / `:1091-1097` | ✓ |
| `plugin-cli.ts:761, 906, 917, 1038` | ✓ (cả 4 là `await manager.x(…)` trần) |
| `natives/package.json:32` | `"build": "bun ../../scripts/bazel-natives.ts host --dest native"` ✓ |
| `tui/package.json:94-97` | khối `"./*"` ✓ — **đính chính của kế hoạch là đúng** (bản gốc ghi 93-96) |
| `coding-agent/CHANGELOG.md:3` | `## [Unreleased]` ✓ (xem 7b #4 về "đang rỗng") |
| `snapshot-cache.ts:93` | `const tmpPath = \`${opts.path}.${process.pid}.${randomHex(8)}.tmp\`;` ✓ |
| `settings-selector.ts:1329` | `onPluginChanged: () => this.#callbacks.onPluginsChanged?.(),` ✓ |
| `selector-controller.ts:305-312` | handler `onPluginsChanged` — 4 lệnh refresh, **không** có `refreshAgentDiscovery` ✓ |
| `acp-agent.ts:2167` | `await refreshAgentDiscovery(cwd, record.session.effectiveExtensionRoots);` ✓ |
| `plugin-config.test.ts:19-33` (thực chất 20-34) | mẫu `spyOn` × 4 + `mock.restore()` + `removeWithRetries` ✓ |
| `packages/boot/…` **không tồn tại** | `ls packages/` không có `boot` ✓ — đính chính của kế hoạch đúng |
| `plugin-runtime-config-lock.test.ts` **khưa tồn tại** | ✓ — cổng (b) đỏ đúng nghĩa |
| `packages/utils/src/atomic-write.ts` **chưa tồn tại** | ✓ |

### 7b. Neo SAI hoặc lệch — GHI RA, KHÔNG sửa trong tài liệu

| # | Neo trong work item | Nói gì | Thực tế | Mức |
| --- | --- | --- | --- | --- |
| 1 | `dirs.ts:652` (`getPluginsLockfile`) | `getPluginsLockfile` ở dòng 652 | **`getPluginsLockfile` ở dòng 662-664.** Dòng 652 là `getPluginsNodeModules` | **HỎNG — lệch 10 dòng** |
| 2 | `deletePluginSetting (954-961)` | hàm trải 954-961 | `:954` signature, `:960` dấu `}` đóng hàm. **961 là dòng trống kế tiếp** | lệch 1 ở cuối |
| 3 | `plugin-config.test.ts:19-33` | mẫu cô lập ở 19-33 | thật là **20-34** (19 trống; 34 là `});` của `afterEach`) | lệch 1 hai đầu |
| 4 | `coding-agent/CHANGELOG.md` "đang rỗng, bắt đầu ở dòng 3" | section rỗng | dòng 3 đúng, nhưng **KHÔNG rỗng**: dòng 5 `### Security` đã có entry MCP (thêm 2026-09-29) | **stale** |
| 5 | Đính chính: "Đếm là 0 ngay trên HEAD `808b365`" | HEAD = 808b365 | HEAD thật của cây này là **`47720fd`** | **stale** |
| 6 | "thứ mà `reloadPlugins` thật sự làm (`acp-agent.ts:2167`)" | tên hàm `reloadPlugins` | dòng đúng, **tên hàm sai**: hàm bao quanh tên là `#reloadPluginState` (`acp-agent.ts:2163`) | nhỏ, dễ hiểu nhầm |
| 7 | Cổng (d): `git grep -n 'atomicWriteJson' -- packages/` "expect ONE definition" | lệnh này đo được "một định nghĩa" | hôm nay in **3 dòng**; sau refactor vẫn **3 dòng**. Lệnh **luôn xanh**, không bao giờ phân biệt được | **gate chết — đã viết lại ở §5** |

### 7c. Điều kế hoạch KHÔNG trích, nhưng kỹ sư cần

| Đường dẫn | Vai trò |
| --- | --- |
| `packages/coding-agent/src/extensibility/plugins/settings-host.ts:16` | **chỗ duy nhất** trong repo gán `PluginManager` vào trường kiểu `PluginSettingsManager` của tui. Đây là nơi trôi hình dạng `ChangeResult` nổ thành lỗi build dưới `check:ts` |
| `packages/utils/src/file-lock.ts:32` | `getLockPath` = `` `${path.resolve(filePath)}.lock` `` — cơ sở cho tuyên bố "hai bên dùng chung một lock file mà không cần hạ tầng mới" |
| `packages/utils/src/file-lock.ts:26-29` | `retries: 50, retryDelayMs: 100` — ngân sách chờ ~5s, test tranh chấp phải nằm trong đó |
| `packages/utils/src/temp.ts:90` | `removeWithRetries` — nguồn của helper dọn dẹp trong `afterEach` |
| `packages/coding-agent/test/modes/components/plugin-list-marketplace.test.ts:150-154` | mock `setPluginEnabled` trả `Promise<void>` — **đỏ** nếu ai nới kiểu `setPluginEnabled` |
| `packages/coding-agent/src/extensibility/plugins/runtime-config.ts:4` | `normalizePluginRuntimeConfig` — hàm normalize mà cả hai vế của khoá dùng |
| `packages/coding-agent/src/extensibility/plugins/types.ts:141-146` | hình dạng `PluginRuntimeConfig` (`plugins`, `settings`) |

### 7d. Blasting radius của việc nới kiểu — nhỏ hơn kế hoạch ngầm ám

`setEnabledFeatures` chỉ xuất hiện ở **3 chỗ** toàn repo:
`plugin-cli.ts:761` (manager thật) · `plugin-settings.ts:74` (interface) ·
`plugin-settings.ts:786` (call site).
Không có object-literal nào trong test thoả hình dạng `PluginSettingsManager` — test
dùng `createPluginSettingsHost(process.cwd())` (manager thật) hoặc
`spyOn(PluginManager.prototype, …)`. Bề mặt breaking là thật về mặt kỹ thuật
(`packages/tui/package.json:94-97` export wildcard), nhưng phạm vi **trong repo này
rất hẹp**.

---

## 8. Việc CHƯA làm (DONE cần thêm)

1. **Quyết định con người về câu hỏi mở 1 — ai quyết `application`.** `PluginManager`
   không có kiến thức HMR; `restart-required` có **0 tham chiếu** trong repo; reload
   của overlay là **một phần**. Mô hình mà kế hoạch dùng
   (`packages/boot/plugin-manager/src/types.ts:111-114`) **không tồn tại ở đây** —
   `ChangeResult` phải được định nghĩa từ đầu.
2. **Quyết định về `setPluginEnabled`** — có nới kiểu trả về không (breaking riêng).
3. **Quyết định về hậu tố `.tmp`** — giữ cố định hay chuyển sang dạng cứng hoá.
4. **Thứ tự merge với M3-A4.**
5. **Ba entry CHANGELOG bị chặn** (plan §6.2) — không viết trong PR này.
