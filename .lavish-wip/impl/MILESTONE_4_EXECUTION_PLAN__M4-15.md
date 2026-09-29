# PHIẾU TRIỂN KHAI — `MILESTONE_4_EXECUTION_PLAN.md` / work item `GAP-M4-15`

**Mục tiêu trong sổ:** `MILESTONE_4_EXECUTION_PLAN.md:2437` — `## GAP-M4-15. File cấu hình của nhà khác bị đọc một nửa: hooks trong .claude/settings.json biến mất không một lời (sóng D)`
**Cây:** `/Users/tranquangdang21/Projects/ultraworkers` — nhánh `milestone-1`, `HEAD = 47720fd`.
**Ngày kiểm:** 2026-09-29.

---

## 0. Cảnh báo tên work item (đọc trước khi gõ bất cứ dòng nào)

Lệnh giao việc gọi work item này là **`M4-15. Sổ ngưỡng hiệu năng có phân loại bằng chứng`**. Tên đó **không tồn tại trong kế hoạch M4**, và nó thuộc về một milestone khác:

```
$ grep -n "ngưỡng hiệu năng\|phân loại bằng chứng\|Sổ ngưỡng" MILESTONE_4_EXECUTION_PLAN.md
(0 hit)

$ grep -rn "Sổ ngưỡng hiệu năng có phân loại bằng chứng" .
MILESTONE_6_EXECUTION_PLAN.md:  | 13 | **n** — `perf-threshold.ledger.ts` | 13 file `.bench.ts` ...
COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md: (cùng nội dung)
```

Cái tên đó là **`GAP-M6-13`** (`perf-threshold.ledger.ts` + `EvidenceClass`) của `MILESTONE_6_EXECUTION_PLAN.md`. Trong `MILESTONE_4_EXECUTION_PLAN.md` chỉ có **mười** work item (`rg -n "^## (GAP-)?M4-"` → M4-4, M4-6, M4-7, M4-9, GAP-M4-10 … GAP-M4-15), và **mục số 15 duy nhất là `GAP-M4-15`**. Đường dẫn đầu ra yêu cầu cũng là `MILESTONE_4_EXECUTION_PLAN__M4-15.md`.

→ Phiếu này viết cho **`GAP-M4-15`**. Nếu bạn thực sự muốn `GAP-M6-13`, dừng lại: nó là việc khác hoàn toàn (ngưỡng benchmark, không liên quan `.claude/settings.json`).

---

## 1. Cái gì thay đổi, quan sát được

> Hôm nay, người dùng viết `hooks` vào `.claude/settings.json` thì omp **không báo gì cả** và **không hook nào chạy**; sau item này, `omp doctor` **in ra tên các key lạ** trong chính file đó, và nếu key lạ **là** `hooks` thì dòng đó nói thẳng omp chỉ đọc thư mục `hooks/pre/` và `hooks/post/` — **không** nối `hooks` thành hook thật, và **không** biến key lạ thành lỗi.

Ranh giới quan trọng nhất: đây là **báo cáo sự mất mát**, không phải **vá lỗ hổng**. Không key lạ nào được ném exception. `loadHooks()` không đổi một dòng.

---

## 2. Bảng điểm sửa

| # | `đường/dẫn` | symbol | TRƯỚC (nguyên văn từ file thật) | SAU (hình dạng sau khi sửa) |
|---|---|---|---|---|
| S1 | `packages/coding-agent/src/config/dropped-foreign-keys.ts` | `droppedForeignKeys` + `DroppedForeignKey` | **file không tồn tại** — `ls: …: No such file or directory` | file mới, export `interface DroppedForeignKey` + `export function droppedForeignKeys(file: Readonly<Record<string, unknown>>, knownSettingIds: ReadonlySet<string>): DroppedForeignKey[]` |
| S2 | `packages/coding-agent/src/config/settings.ts:293` | `dropSettingsGroupShadows` | `export function dropSettingsGroupShadows(data: RawSettings, sourcePath: string, basePrefix = ""): RawSettings {` | **không đổi dòng nào**, nhưng `droppedForeignKeys` **phải tôn trọng** nó: một key đã bản này `continue` loại thì không được báo (xem bước 3.3) |
| S3 | `packages/coding-agent/src/config/settings.ts:236` | `projectLayerForMerge` | `function projectLayerForMerge(project: RawSettings): RawSettings {` | **không đổi dòng nào**; đây là bộ lọc thứ hai mà hàng âm của test phải trượt qua |
| S4 | `packages/coding-agent/src/config/registry.ts:800` | `all` (import vào `settings.ts:43` với tên `allSettings`) | `export function all(): readonly AnySetting[] {`<br>`	return ordered;` | **không đổi**. Chỉ dùng làm nguồn: `knownSettingIds = new Set(allSettings().map(s => s.id))` |
| S5 | `packages/coding-agent/src/config/settings.ts:225/231/632` | `assertKnownSettingPaths` | `:225` `function assertKnownSettingPaths(layer: RawSettings, prefix = ""): void {`<br>`:231` `		assertKnownSettingPaths(value, id);`<br>`:632` `		assertKnownSettingPaths(layer);` | **không đổi dòng nào**. Đây là hành vi được bảo toàn tuyệt đối (xem §6) |
| S6 | `packages/coding-agent/src/discovery/claude.ts:377/383/389` | `loadHooks` | `:377` `async function loadHooks(ctx: LoadContext): Promise<LoadResult<Hook>> {`<br>`:383` `	const projectHooksDir = path.join(projectBase, "hooks");`<br>`:389` `		const userHooksDir = path.join(userBase, "hooks");` | **không đổi dòng nào**. `hooks/pre/`, `hooks/post/` vẫn là đường chính |
| S7 | `packages/coding-agent/src/extensibility/plugins/doctor.ts:5` | `runDoctorChecks` | `export async function runDoctorChecks(): Promise<DoctorCheck[]> {`<br>caller count: `grep -rn "runDoctorChecks" packages/` → **1 hit**, chính dòng định nghĩa | thêm **một** check mới vào bảng registry, theo shape mà W18 chốt. **Chỉ làm được sau khi W18 merge** |
| S8 | `packages/coding-agent/test/dropped-foreign-keys.test.ts` | — | **không tồn tại** | file mới, 4 case (xem §4) |
| S9 | `packages/coding-agent/test/doctor/…` (xem §4) | — | `ls -d packages/coding-agent/test/doctor` → **No such file or directory** | hàng check `hooks` được test trong đúng thư mục W18 tạo ra, **không** phải `test/doctor.test.ts` như sổ M4 ghi |

---

## 3. Các bước, mỗi bước có neo đã kiểm

### 3.0 Trước khi gõ dòng đầu tiên — hai việc bắt buộc, theo đúng thứ tự

**(a) Chặn tuyệt đối: `GAP-M1-18` phải merge trước, và hàng này phải vào *danh sách* trước khi vào *doctor*.**

Đã kiểm trạng thái hôm nay:

```
$ grep -c "GAP-M1-18" MILESTONE_1_EXECUTION_PLAN.md
8
$ grep -n "runDoctorChecks\|formatDoctorResults" packages/ -r
packages/coding-agent/src/extensibility/plugins/doctor.ts:5:export async function runDoctorChecks(): Promise<DoctorCheck[]> {
packages/coding-agent/src/extensibility/plugins/doctor.ts:43:export function formatDoctorResults(checks: DoctorCheck[]): string {

$ grep -c 'name: "doctor"' packages/coding-agent/src/cli-commands.ts
0
```

→ `omp doctor` **chưa tồn tại**. `runDoctorChecks` vẫn là code chết (1 hit = dòng định nghĩa). `GAP-M1-18` là `W18` của `MILESTONE_1_EXECUTION_PLAN.md:3730`, Wave 8, và nó tự nói *"Danh sách đã chốt trong sổ"*. Danh sách 7 check đó **không có** hàng này. Thêm vào *doctor* mà không thêm vào *danh sách* đúng là cái bẫy `GAP-D4` gọi tên. **Hàng này là lý do M4-15 phải chờ.**

> **Sổ M4 nói sai ở đây — đừng sửa sổ, cứ biết:** `MILESTONE_4_EXECUTION_PLAN.md:354` khẳng định
> `grep -n "GAP-M1-18\|omp doctor" MILESTONE_1_EXECUTION_PLAN.md` trả **0 hit** và ghi `GAP-M1-18` là **CHƯA CÓ**.
> Lệnh đó hôm nay trả **8 hit**. Sổ M4 đã cũ ở dòng đó. Kết luận của sổ vẫn đúng về *mặt sự thực* (W18 **chưa** merge) nhưng sai về *cơ sở* — nó không phải mục chưa tồn tại, nó là mục đã lên sổ và đang chờ.

**(b) Chốt shape của `DoctorCheck` — không làm được nếu chưa biết dòng in ra hình dạng gì.**

Hôm nay `DoctorCheck` **đang** là:

```
packages/coding-agent/src/extensibility/plugins/types.ts:169
export interface DoctorCheck {
	/** Check identifier */
	name: string;
	/** Check result status */
	status: "ok" | "warning" | "error";
	/** Human-readable message */
	message: string;
	/** Whether --fix resolved this issue */
	fixed?: boolean;
}
```

Còn W18 đang nhắm tới `{ severity, name, detail, remedy }` — và W18 tự ghi trong khối code: *"Tập giá trị của `severity` **CHƯA chốt** … Đừng tự chọn rồi coi như đã chốt."*

Hệ quả trực tiếp: khối “Hình dạng code” trong sổ M4 (`// ─ file .claude/settings.json có 3 key omp không hiểu: hooks, modelOverride, fooBar`) **không thể viết final** cho tới khi W18 chốt `severity`. Đừng khắc chuỗi đó vào test — hãy assert theo shape W18 chốt.

### 3.1 Viết hàm thuần

Tạo `packages/coding-agent/src/config/dropped-foreign-keys.ts`.

**Trả lời dứt khoát câu “`knownSettingIds` lấy từ đâu?”** (mục *Cần người quyết* của sổ) — có một câu trả lời đúng duy nhất, và nó đã có sẵn:

```
packages/coding-agent/src/config/settings.ts:43
	all as allSettings,

packages/coding-agent/src/config/registry.ts:800
export function all(): readonly AnySetting[] {
	return ordered;
}

packages/coding-agent/src/config/registry.ts:795
export function lookup(id: string): AnySetting | undefined {
	return byId.get(id);
}
```

Dùng `allSettings().map(s => s.id)`. **Không** dựng set riêng từ một vòng lặp mới — `assertKnownSettingPaths` (`:225`) đã dùng đúng registry này qua `lookupSetting(id)`, và một nguồn sự thật thứ hai đúng là thứ M4 cấm.

Dùng lại `isRecord` từ `@oh-my-pi/pi-utils` (`packages/utils/src/type-guards.ts:1` — `export function isRecord(value: unknown): value is Record<string, unknown>`) chứ không tự viết lại; kiểu `RawSettings` (`settings.ts:65`) là `{ [key: string]: unknown }` — tương thng với tham số `Readonly<Record<string, unknown>>` trong shape sổ đưa ra.

**Đệ quy theo cùng cách `assertKnownSettingPaths` đệ quy** (`:226-232`): đi từng key, `id = prefix ? \`${prefix}.${key}\` : key`, nếu `knownSettingIds.has(id)` thì bỏ qua cả nhánh; nếu value là object thì đệ quy; nếu value là lá **và** id không biết → đẩy vào kết quả. Dừng đi tại lá, không đẩy lồng nhau — một lỗi gõ ở `a.b.c` phải ra **một** dòng, không ba.

### 3.2 Xác nhận lỗ hổng là thật, bằng lệnh chạy được

`hooks` **không** phải setting đã đăng ký:

```
$ grep -rn 'id: "hooks"' packages/coding-agent/src/config/registry.ts
(0 hit)
```

Và `dropSettingsGroupShadows` tự nói trong docstring rằng *"unknown keys … pass through unchanged"* — nên `hooks` đi thẳng qua, không cảnh báo, không lỗi. Đường đọc thật:

```
packages/coding-agent/src/config/settings.ts:2177
			const result = await loadCapability(settingsCapability.id, { cwd: discoveryCwd });

packages/coding-agent/src/config/settings.ts:2198
						merged = this.#deepMerge(merged, dropSettingsGroupShadows(item.data as RawSettings, item.path));
packages/coding-agent/src/config/settings.ts:2199
						sourcePaths.push(item.path);
```

Ứng viên đường dẫn, `packages/coding-agent/src/discovery/helpers.ts:1107`:

```
		candidates.push(path.join(dir, ".claude", "settings.json"), path.join(dir, ".claude", "settings.local.json"));
```

Hai file, không chỉ một. Dòng doctor phải phủ **cả hai** — hoặc nói rõ là chỉ phủ `settings.json` và im về `settings.local.json`, chứ đừng âm thầm bỏ sót.

### 3.3 Ràng buộc “chạy SAU khi đã lọc” — sổ nói thiếu một nửa

Sổ M4 nói kiểm kê phải chạy sau `projectLayerForMerge`. Đúng — nhưng `projectLayerForMerge` **không phải** bộ lọc chủ động duy nhất. Có **hai**:

```
packages/coding-agent/src/config/settings.ts:236
function projectLayerForMerge(project: RawSettings): RawSettings {

packages/coding-agent/src/config/settings.ts:293
export function dropSettingsGroupShadows(data: RawSettings, sourcePath: string, basePrefix = ""): RawSettings {
```

- `projectLayerForMerge` (`:236`) — chỉ lọc `modelRoles`, chạy lúc **merge** (`:3625`).
- `dropSettingsGroupShadows` (`:293`) — lọc **giá trị không phải object đè lên một settings group**, và nó `logger.warn` rồi `continue`. Nó là bộ lọc chạy **trên đúng file settings của nhà khác** mà item này đang kiểm kê.

→ Hàng âm của test phải trượt qua **cả hai**. Một hàm chỉ trượt `projectLayerForMerge` vẫn sẽ báo nhầm key `tui: "fullscreen"` đã bị drop có chủ ý. Đây là khoảng trống thật trong sổ, sửa trong phiếu này chứ không sửa trong tài liệu.

### 3.4 Đọc file trong doctor mà không phá ranh giới tầng

Sổ M4 nói `.claude/settings.json` “là một lớp cấu hình thật” và dẫn chứng `settings.ts:1020`. **Dẫn chứng đó không đúng nghĩa** — xem §7 mục D. Cách đúng để lấy nội dung thô:

1. Dùng `Settings` hiện có để biết **file nào thực sự được nạp** (`getProvenance` trả `"project"` ⟹ key đó đến từ file settings của nhà khác; xem `settings.ts:800-808`).
2. Đọc thô bằng `Bun.file(...).text()` + `Bun.JSON5.parse()` trong try/catch với `isEnoent` từ `@oh-my-pi/pi-utils`. Tuyệt đối không dùng `readFileSync`/`existsSync` (AGENTS.md, mục *File I/O*).
3. **Không** thêm một `Settings` instance thứ hai chỉ để lấy dữ liệu — đó là nguồn sự thật thứ hai.

### 3.5 Dòng doctor

Đúng ba hành động, và ba hành động đó là **toàn bộ** item:

1. một dòng liệt kê key lạ của từng file;
2. **chỉ khi** key lạ **là** `hooks` thì mới kèm chú thích “omp chỉ đọc `hooks/pre/` và `hooks/post/`”;
3. một key lạ bất kỳ khác **không** được gán chú thích hook.

Ba câu hỏi còn mở trong sổ và cách chốt mặc định an toàn (chốt trước khi viết help string):

- **In bao nhiêu key?** → cắt ở **5**, rồi `… và N key khác`. Một file của nhà khác có thể có 40 key; in hết là spam.
- **Cờ tắt không?** → **không**. Đây là dòng *thông tin*, `severity` info/warning, không phải lỗi — khách hàng omp viết key lạ vào `.claude/settings.json` là chuyện bình thường, nếu nó làm đỏ thì người ta tắt cả `doctor`.
- **`modelOverride` / `fooBar` trong ví dụ của sổ** — đó là **ví dụ minh hoạ, không phải id thật**. Kiểm tra thật: `grep -rn 'id: "modelOverride"' packages/coding-agent/src/config/registry.ts` → 0 hit. Đừng hard-code hai tên đó vào test.

---

## 4. Hợp đồng test

### 4.1 `packages/coding-agent/test/dropped-foreign-keys.test.ts` (mới)

| case | khẳng định | người dùng thấy gì nếu hồi quy |
|---|---|---|
| **(1) Phân biệt** | key lạ trong file cấu hình **không** ném lỗi; `Settings` vẫn khởi tạo và `get()` vẫn trả giá trị hợp lệ | ông viết `permissions: {...}` vào `.claude/settings.json`; omp báo “Unknown setting” và **không khởi động**. Đây là hồi quy nặng nhất của item |
| **(2) Đặc biệt hoá** | key lạ `hooks` → có `note`; key lạ `permissions` → **không** có `note` (assert phủ định, không phải “không rỗng”) | mọi key lạ đều bị gán chú thích giống nhau → dòng đầy misinformation, tệ hơn im lặng |
| **(3) Sau khi lọc — hàng âm** | key đã bị `projectLayerForMerge` loại → không báo; **và** key đã bị `dropSettingsGroupShadows` loại → không báo. Hai assertion, **một** test hoặc hai test — nhưng phải có **cả hai** | doctor báo `tui: "fullscreen"` bị “bỏ qua” trong khi `settings.ts:303` **đã** `logger.warn` rồi `continue` → báo cáo một hành vi không tồn tại |
| **(4) Đường chính còn nguyên** | xem §4.3 | nếu item lấn sang quyết định sản phẩm khác, không có test nào bắt |

Case (1) là **hợp đồng phủ định** của điều khoản bảo toàn 2, và là hợp đồng quan trọng nhất của item. Theo AGENTS.md, đây là dạng “precedence or negative contract” — hợp lệ, nhưng phải có **consumer contract** đi kèm: khẳng định `Settings` **khởi tạo được** và **không** throw, chứ không phải “hàm không ném”.

### 4.2 Test cho dòng doctor

Theo `GAP-D4`, **mỗi check mới phải tự chứng minh bằng một test** — sổ M4 yêu cầu đúng hai (case 1 và case 2). Thêm vào **đúng thư mục W18 tạo**:

```
packages/coding-agent/test/doctor/doctor.test.ts
```

⚠️ **Sổ M4 ghi sai đường dẫn.** Sổ M4 (`Xác minh` bước 2) chạy `bun test packages/coding-agent/test/doctor.test.ts`; M1 W18 (`:3760` và khối *File cần chạm tới*) chỉ định `packages/coding-agent/test/doctor/doctor.test.ts` — **có thư mục**. Hôm nay **cả hai** đều không tồn tại. Theo M1 W18, lệnh cổng là `bun test packages/coding-agent/test/doctor/`. Sửa theo M1, vì đó là nơi sinh ra thư mục.

Hai test:
- `hooks` trong `.claude/settings.json` → output **có** chứa `hooks` **và** chứa `hooks/pre/` + `hooks/post/`.
- `permissions` trong `.claude/settings.json` → output **có** chứa `permissions`, và assert **không** chứa `hooks/pre/` (nếu không có assertion phủ định này, case (2) xanh với một bản làm gộp cả hai).

### 4.3 Test "đường chính còn nguyên" — sổ M4 trỏ vào file không tồn tại

Sổ M4 (Xác minh bước 3) chạy:
`bun test packages/coding-agent/test/discovery/hooks.test.ts packages/coding-agent/test/discovery/disabled-extensions.test.ts`

Đã kiểm:

```
$ ls packages/coding-agent/test/discovery/hooks.test.ts
No such file or directory          # 27 file trong test/discovery/, không file nào tên hooks
$ grep -c "hooks" packages/coding-agent/test/discovery/disabled-extensions.test.ts
0
$ find packages/coding-agent/test -name "*hook*test*.ts"
packages/coding-agent/test/agent-session-user-shortcut-hooks.test.ts
packages/coding-agent/test/agent-session-plan-compact-hook-instructions.test.ts
packages/coding-agent/test/hook-editor.test.ts
packages/coding-agent/test/compaction-hooks.test.ts
packages/coding-agent/test/hook-tool-wrapper-input.test.ts
```

Cả hai đều **vô dụng cho mục đích nêu**: file thứ nhất không tồn tại, file thứ hai **không chứa chữ `hooks`**. Lệnh ấy hôm nay không bắt được gì.

Và đây là phát hiện đáng kể: **hiện không có test nào phủ `loadHooks` của `claude.ts`.** `loadHooks` chỉ được tham chiếu ở `discovery/*.ts` (định nghĩa + đăng ký loader), không test nào. Nên case (4) **không có hạ tầng** — bạn phải **viết mới** nó, không phải “chạy lại cho xanh”. Fixture: cây tạm có `hooks/pre/x.sh` và `hooks/post/y.sh`, chạy discovery, assert hai hook nạp đúng `type`/`level`. Dùng `TempDir` từ `@oh-my-pi/pi-utils` (đúng như `test/config/settings-registry.test.ts:8` đang làm), và `afterEach` dọn — test phải an toàn toàn suite.

---

## 5. Cổng

### 5.1 Lệnh (đã chạy thử trên cây này hôm nay)

```bash
# 0. Tiền đề môi trường — ĐÃ THỎA SẴN, xem §7 mục E
which ninja                       # /opt/homebrew/bin/ninja
ls packages/natives/native/pi_natives.darwin-arm64.node   # tồn tại

# 1. Kiểm kê key lạ (file mới)
bun test packages/coding-agent/test/dropped-foreign-keys.test.ts

# 2. Dòng doctor — ĐƯỜNG DẪN ĐÃ SỬA, xem §4.2
bun test packages/coding-agent/test/doctor/

# 3. Đường chính — PHẢI VIẾT MỚI, xem §4.3
bun test packages/coding-agent/test/discovery/<tên-bạn-chọn>.test.ts

# 4. Không hồi quy ở tầng settings
bun test packages/coding-agent/test/config/

# 5. Điều khoản bảo toàn: assertKnownSettingPaths vẫn CHỈ ở lớp override
sed -n '225,231p;632p' packages/coding-agent/src/config/settings.ts   # in 8 dòng
grep -n "assertKnownSettingPaths" packages/coding-agent/src/config/settings.ts
#    kỳ vọng grep: ĐÚNG 3 hit — 225 (định nghĩa), 231 (đệ quy), 632 (lớp override)

# 6. Types + lint
bun run check:ts      # package.json:90
bun run lint          # package.json:93
```

Đã xác nhận `check:ts` (`bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`) và `lint` (`bun run --parallel lint:ts lint:rs`) đều tồn tại ở `package.json`. **Tuyệt đối không `tsc` / `npx tsc`.**

Đã chạy thật để biết cổng có sống không:

```
$ bun test packages/coding-agent/test/config/settings-registry.test.ts
 18 pass
 0 fail
```

→ Cổng test **chạy được ngay**, addon đã build. `sed -n '225,231p;632p'` in **8** dòng (225–231 cộng 632) — đó là số dòng *in ra*, không phải số *call site*. Call site thật kiểm bằng `grep -n "assertKnownSettingPaths"`, phải ra **đúng 3**.

### 5.2 Cổng này có ĐỎ ĐƯỢC không

**Có — nhưng chỉ một nửa, và nửa đó phải nói thẳng.**

| điều kiện cổng | đỏ được? | bằng cách nào / tại sao không |
|---|---|---|
| case (3) — key đã bị lọc không được báo | **CÓ, đỏ thật** | gọi `droppedForeignKeys` **trên `item.data` thô** thay vì trên dữ liệu đã qua `dropSettingsGroupShadows`/`projectLayerForMerge` → key `tui: "fullscreen"` bị báo → hàng âm đỏ. Đây là cổng quyết định |
| case (2) — chỉ `hooks` mới có note | **CÓ, đỏ thật** | gộp chú thích vào mọi key lạ → assert phủ định đỏ |
| case (1) — key lạ không ném lỗi | **CÓ, đỏ thật** | sửa `assertKnownSettingPaths` (`:225`) để chạy trên lớp file → `Settings` throw → test đỏ |
| cổng (4): `assertKnownSettingPaths` vẫn chỉ ở lớp override | **KHÔNG** | đây là bảo toàn hành vi **không đổi**. Không có cách nào làm nó đỏ mà không phá hành vi đang đúng. Sổ M4 đã thừa nhận điều này — giữ nguyên như vậy |
| cổng (5): GAP-M1-18 merge + hàng vào danh sách trước code | **KHÔNG tự đỏ được** | đây là kiểm tra của con người, không có lệnh nào bắt. **Nếu bạn bỏ nó, item vẫn xanh toàn bộ** — đó là lỗ hổng thật của cổng này |
| `bun run check:ts` | **Xanh vô nghĩa ở đây** | nó không chạy một khẳng định nào; với case (3) nó bỏ lọt đúng lỗi gọi sai chỗ. Đừng ghi item là xong dựa vào nó |

**Kết luận thẳng:** cổng này có **3 điều kiện tự đỏ thật** trên 6. Ba điều kiện còn lại — đặc biệt **(5), chính là điều kiện tiên quyết tuyệt đối của item** — là kiểm tra của con người và sẽ xanh dù bạn bỏ qua.

**Viết lại cho đỏ được, đề xuất của phiếu này:** thêm một test chốt danh sách, kiểu “mọi check trong bảng registry của doctor phải có **một** test tên đúng `it("<tên check> …")` trong `test/doctor/`”. Như vậy thêm một check mà không thêm test ⟹ đỏ. Đó là cách biến `GAP-D4` từ quy tắc review thành assertion — và nó là câu trả lời cho câu hỏi mà W18 tự nói là “không tự kiểm được”.

---

## 6. Cạm bẫy riêng của work item này

1. **Sửa `assertKnownSettingPaths` để nó bảo vệ cả lớp file.** Nhìn rất hợp lý. Nó **phá mọi file cấu hình của nhà khác** — khách hàng omp viết key mà omp không biết vào `.claude/settings.json` là chuyện bình thường. Ở đây “báo im lặng” đúng và “báo lỗi” sai. Chỉ lớp override của constructor (`:632`) mới là nơi typo-guard có nghĩa, vì đó là lớp người dùng gõ cho chính omp. *Đây là lỗi dễ nhất vì nó làm case (1) của item đỏ — may mà test bắt được.*

2. **Bridge `hooks` thành hook thật trong `loadHooks`.** Hấp dẫn hơn nữa, và đó **là** thứ nguồn tham chiếu đòi — `gajae-ref/docs/customization.md:146` nói rõ Codex có `hooks.json` là *“a different authority”*, `claude-code-ref/src/utils/plugins/pluginLoader.ts:1238` nói file hooks của Claude có *“a wrapper structure with description and hooks”*. Nhưng nó là **một quyết định sản phẩm lớn hơn nhiều**: một hook của Claude Code có thể chặn tool theo cách omp không diễn giải được. Item này sửa **đúng thứ nhỏ nhất mà vẫn đúng**. Đừng để “nguồn tham chiếu đòi” kéo bạn qua ranh giới đó.

3. **Gọi `droppedForeignKeys` sớm hơn bộ lọc.** Nó chạy, nó xanh, và nó báo những key đã bị loại **có chủ ý** — tức báo một hành vi không tồn tại. Sổ M4 chỉ nhắc `projectLayerForMerge`; **còn `dropSettingsGroupShadows` (`:293`) thì sổ quên hẳn**, và nó mới là cái chạy trên đúng file mà item này kiểm kê. Đây là lý do hàng âm (3) là hàng quan trọng nhất chứ không phải hàng phụ.

4. **Tin dòng 354 của sổ M4 rằng `GAP-M1-18` “chưa có trong kế hoạch M1”.** Nó có — 8 hit, mục `W18` tại `MILESTONE_1_EXECUTION_PLAN.md:3730`. Sổ M4 cũ. Kết luận thì vẫn đúng (W18 **chưa merge**), cơ sở thì sai. Đừng báo cáo "chưa tồn tại" cho người đọc — hãy báo “đã lên sổ M1, Wave 8, chưa merge”.

5. **Khắc chuỗi output của doctor vào test trước khi W18 chốt `severity`.** `DoctorCheck` hôm nay là `{name, status, message, fixed?}` (`types.ts:169-178`); W18 đang nhắm `{severity, name, detail, remedy}`. Chốt chuỗi sớm là viết lại hai lần.

6. **Dùng `test/discovery/disabled-extensions.test.ts` làm bằng chứng “đường chính còn nguyên”.** File đó có **0** lần chữ `hooks`. Nó xanh vì nó đúng, không phải vì nó phủ thứ gì. Đây là loại cổng xanh giả đúng nhất trong item này.

7. **Thêm một `Settings` instance thứ hai trong doctor.** Nó chạy, và nó tạo nguồn sự thật thứ hai cho câu hỏi “key này đến từ đâu” — cùng loại với lỗi “dựng `knownSettingIds` từ vòng lặp riêng”.

---

## 7. Danh sách neo — kết quả kiểm từng dòng

Mọi trích dẫn ở trên lấy từ `sed -n "<n>p"` / `rg -n` trên cây thật, ngày 2026-09-29, `HEAD = 47720fd`.

### 7.1 Neo ĐÚNG — dùng được nguyên trạng

| neo | nội dung thật | khớp với sổ? |
|---|---|---|
| `discovery/claude.ts:377` | `async function loadHooks(ctx: LoadContext): Promise<LoadResult<Hook>> {` | ✅ |
| `discovery/claude.ts:383` | `const projectHooksDir = path.join(projectBase, "hooks");` | ✅ |
| `discovery/claude.ts:389` | `const userHooksDir = path.join(userBase, "hooks");` | ✅ |
| `config/settings.ts:225` | `function assertKnownSettingPaths(layer: RawSettings, prefix = ""): void {` | ✅ |
| `config/settings.ts:231` | `assertKnownSettingPaths(value, id);` — lệnh gọi **đệ quy** | ✅ đúng như mục *Đính chính* |
| `config/settings.ts:632` | `assertKnownSettingPaths(layer);` — lệnh gọi **duy nhất từ bên ngoài**, trong `#overrideLayer` | ✅ |
| `grep -n "assertKnownSettingPaths"` | đúng **3** hit: 225, 231, 632 | ✅ mục *Đính chính* chính xác |
| `grep -n '"hooks"'` trên `claude.ts` + `settings.ts` | đúng **2** hit: `:383`, `:389` — cả hai là nối thư mục, **không** phải consumer | ✅ mục *Đính chính* chính xác |
| `grep -rn "droppedForeignKeys" packages/` | **0 hit** | ✅ hàm chưa có |
| `src/config/dropped-foreign-keys.ts` | không tồn tại | ✅ file sẽ tạo |
| `config/registry.ts:800` | `export function all(): readonly AnySetting[] {` | ✅ trả lời câu hỏi `knownSettingIds` |
| `config/registry.ts:795` | `export function lookup(id: string): AnySetting | undefined {` | ✅ nguồn mà `assertKnownSettingPaths` dùng |
| `config/settings.ts:43` | `	all as allSettings,` | ✅ |
| `config/settings.ts:236` | `function projectLayerForMerge(project: RawSettings): RawSettings {` | ✅ bộ lọc #1 |
| `config/settings.ts:293` | `export function dropSettingsGroupShadows(data: RawSettings, sourcePath: string, basePrefix = ""): RawSettings {` | ✅ bộ lọc #2 — **sổ quên** |
| `config/settings.ts:2177` | `const result = await loadCapability(settingsCapability.id, { cwd: discoveryCwd });` | ✅ đường đọc thật |
| `config/settings.ts:2198-2199` | `merged = this.#deepMerge(merged, dropSettingsGroupShadows(item.data as RawSettings, item.path));` / `sourcePaths.push(item.path);` | ✅ |
| `discovery/helpers.ts:1107` | `candidates.push(path.join(dir, ".claude", "settings.json"), path.join(dir, ".claude", "settings.local.json"));` | ✅ **hai** file, sổ chỉ nói một |
| `packages/utils/src/type-guards.ts:1` | `export function isRecord(value: unknown): value is Record<string, unknown> {` | ✅ dùng lại, không viết lại |
| `config/settings.ts:65` | `export interface RawSettings {` (`[key: string]: unknown`) | ✅ |
| `package.json:90` / `:93` | `"check:ts"` / `"lint"` | ✅ |

### 7.2 Neo HỎNG — ghi ra, **không** sửa trong sổ

**A. `packages/coding-agent/test/doctor.test.ts` (Xác minh, bước 2) — không tồn tại, và sai cả hình dạng.**
Sổ M4 chạy `bun test packages/coding-agent/test/doctor.test.ts`. M1 W18 chỉ định `packages/coding-agent/test/doctor/doctor.test.ts` (**có thư mục**), và lệnh cổng của W18 là `bun test packages/coding-agent/test/doctor/`. Hôm nay `ls -d packages/coding-agent/test/doctor` → **No such file or directory**. → Dùng đường dẫn của W18.

**B. `packages/coding-agent/test/discovery/hooks.test.ts` (Xác minh, bước 3) — không tồn tại.**
`test/discovery/` có 27 file, không file nào tên `hooks`. Lệnh sẽ fail với "no tests found" hoặc báo sai. → Phải **viết mới**; hiện **không có test nào** phủ `loadHooks` của `claude.ts`.

**C. `packages/coding-agent/test/discovery/disabled-extensions.test.ts` — tồn tại, nhưng không liên quan.**
`grep -c "hooks"` → **0**. Ghép nó vào cổng “đường chính còn nguyên” là cổng xanh giả.

**D. `config/settings.ts:1020` — đúng nguyên văn, SAI nghĩa.**
Nội dung thật: `		addFile(path.join(projectCwd, ".claude", "settings.json"));` — dòng này nằm trong **`#configWatchTargets()`** (định nghĩa ở `:993`, thân hàm kết thúc ở `:1023` với `return targets;`; được gọi đúng một chỗ, từ `#syncFileWatchers()` tại `:1032`), tức nó đăng ký **mục tiêu `fs.watch`**, không đăng ký lớp cấu hình. Nó chứng minh file **được theo dõi**, không chứng minh file **được parse thành lớp**.
Bằng chứng thật cho “là một lớp cấu hình thật” là `settings.ts:2177` + `:2198-2199` (`loadCapability(settingsCapability.id, …)` → `dropSettingsGroupShadows(item.data, item.path)` → `sourcePaths.push(item.path)`), cộng `helpers.ts:1107`. Kết luận của sổ vẫn đúng; **dẫn chứng thì không**. Đây cũng là mục *Đính chính* thứ ba trong sổ — nó khẳng định “XÁC NHẬN CHÍNH XÁC”, và phần đúng là phần *kết luận*, không phải phần *neo*.

**E. Tiền đề môi trường (Xác minh, bước 0) — đã thỏa sẵn, khối này thừa.**
```
$ which ninja
/opt/homebrew/bin/ninja
$ find packages/natives -name "*.node" -not -path "*/node_modules/*"
packages/natives/native/pi_natives.darwin-arm64.node
$ bun test packages/coding-agent/test/config/settings-registry.test.ts
 18 pass  0 fail
```
→ Cổng test chạy được ngay. Giữ khối này (máy khác vẫn cần), nhưng **đừng ghi là “chưa chạy được vì addon”** khi đánh giá item này.

**F. Hàng âm (3) thiếu một bộ lọc.**
Sổ nói “sau khi `projectLayerForMerge` đã lọc”. Thật là sau **cả hai** `projectLayerForMerge` (`:236`) và `dropSettingsGroupShadows` (`:293`). Sửa trong test của phiếu này.

**G. `DoctorCheck` shape chưa ổn định.**
`extensibility/plugins/types.ts:169-178` hôm nay là `{name, status, message, fixed?}`; W18 nhắm `{severity, name, detail, remedy}` và tự ghi `severity` **CHƯA chốt**. Khối “Hình dạng code” của sổ (`// ─ file .claude/settings.json có 3 key…`) phải chờ.

**H. Ví dụ trong sổ dùng id không tồn tại.**
`modelOverride` / `fooBar` trong dòng doctor mẫu: `grep -rn 'id: "modelOverride"' packages/coding-agent/src/config/registry.ts` → **0 hit**. Là ví dụ minh hoạ; đừng đưa vào test.

**I. Sổ M4 tự mâu thuẫn về GAP-M1-18.**
`MILESTONE_4_EXECUTION_PLAN.md:354` ghi `grep -n "GAP-M1-18\|omp doctor" MILESTONE_1_EXECUTION_PLAN.md` → **0 hit**, `CHƯA CÓ`. Lệnh đó hôm nay → **8 hit**, mục `W18` tại `MILESTONE_1_EXECUTION_PLAN.md:3730`. Sự thực vẫn là “chưa merge” (0 dòng trong `cli-commands.ts`, `runDoctorChecks` 1 hit), nên **điều kiện tiên quyết vẫn đúng** — chỉ cơ sở dẫn là cũ.

### 7.3 Câu hỏi sổ hỏi, đã có câu trả lời

| câu hỏi (mục *Cần người quyết*) | trả lời kiểm được |
|---|---|
| `knownSettingIds` lấy từ đâu? | `allSettings().map(s => s.id)` — `registry.ts:800`, import ở `settings.ts:43`. **Một** nguồn, đúng nguồn `assertKnownSettingPaths` đang dùng |
| In bao nhiêu key? | cắt 5, rồi `… và N key khác` (chặt, để người đọc tự mở file) |
| Cần cờ tắt không? | không; dòng là *thông tin*, không phải lỗi |
| Danh sách check của `omp doctor` đã đóng chưa? | **đã đóng** — W18 liệt 7 check, không có hàng này. Thêm vào *danh sách* trước khi code |

---

## 8. Thứ tự làm — một dòng

1. Chờ `W18` merge. 2. Thêm hàng này vào *danh sách* check của W18 **trước khi code**. 3. Chốt `severity` (nếu W18 chưa chốt). 4. Viết `dropped-foreign-keys.ts` + test 4 case. 5. Chạy cổng §5.1 — với đường dẫn test đã sửa, và bằng chứng (3) phủ **cả hai** bộ lọc. 6. Chỉ khi đó mới viết dòng doctor.
