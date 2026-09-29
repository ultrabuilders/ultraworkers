# Phiếu triển khai — WI-2

**Nguồn:** `MILESTONE_2_EXECUTION_PLAN.md` mục `## WI-2.` (dòng 1045–227)
**Cây đã kiểm:** `ultraworkers` @ `65cc6c1` (nhánh `milestone-1`)
**Ngày kiểm:** 2026-09-29

---

## 0. Tóm tắt trạng thái kiểm chứng

| | |
| --- | --- |
| Neo trong work item | 47 |
| Neo **đúng** | 35 |
| Neo **hỏng** (sai dòng) | 12 |
| Claim môi trường đã lỗi thời | 4 |
| **Cổng (4) của plan — ĐÃ THỰC NGHIỆM VÀ KHÔNG BAO GIỜ ĐỎ** | 1 (nghiêm trọng) |

Hai phát hiện lớn nhất, đọc phần 5 và phần 7 trước khi gõ bất cứ dòng nào:

1. **Cổng (4) của plan (`extensions-discovery.test.ts` vẫn xanh) là thuốc an thần.** Đã thay `helpers.ts:763` bằng đúng cái sort tại chỗ gây hại, chạy lại: **35 pass / 0 fail**. Chạy cả `test/discovery/` + `test/capability/` + `test/skillshare/discovery.test.ts`: **217 pass / 0 fail**. Không test nào sẵn có bắt được cái bẫy mà plan tự gọi là "cách sai dễ nhất". Phải viết lại cổng này — xem phần 5.
2. **`bun test` KHÔNG còn bị chặn.** Plan nói "Bị CHẶN cho tới khi có native addon … 0 pass / 1 fail / 1 error". Đo lại: `bun test test/extension-loader-concurrency.test.ts` → **2 pass / 0 fail / 597ms**. Toàn bộ mục "Xác minh" của plan mô tả một thế giới không còn tồn tại.

---

## 1. Cái gì thay đổi, quan sát được

Hai plugin đăng ký trùng một tên tool giờ luôn resolve về **cùng một bên trên mọi máy, mọi lần chạy, sau mọi lần cài lại** — bên có đường dẫn sort cuối cùng — thay vì đảo chiều theo thứ tự `readdir` ngẫu nhiên; đồng thời `ExtensionRunner#getToolCollisionDiagnostics()` trả về từng lần trùng kèm **đường dẫn của cả hai bên**, và `message` tự chứa cả hai chuỗi đường dẫn.

Không có gì hiện ra trong TUI hay log. Đây là seam cho SDK/fork; chỉ khi một work item sau nối nó vào một bề mặt hiển thị thì người dùng cuối mới thấy.

---

## 2. Bảng điểm sửa

Mọi mục "TRƯỚC" dưới đây trích **nguyên văn** từ cây @ `65cc6c1`, đã đọc bằng `awk`/`sed`. Mọi mục "SAU" là hình dạng sau khi sửa.

| # | `đường/dẫn` | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- | --- |
| A | `src/extensibility/extensions/loader.ts` **:659–660** | `discoverExtensionPaths` → `return allPaths;` | `658\t\t}` / `659\t(blank)` / `660\t\treturn allPaths;` | Chèn ngay trên 660: `allPaths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));` kèm khối comment 6 dòng. Không đụng `addPath` (585–591) và `addPaths`. |
| B | `src/discovery/helpers.ts` **:763** | `discoverLinkedExtensionModuleFiles` | `763\t\tconst entries = await readDirEntries(dir);` | `const entries = [...(await readDirEntries(dir))].sort((a, b) =>\n\t\ta.name < b.name ? -1 : a.name > b.name ? 1 : 0\n\t);` — **bắt buộc có `[...]`**, xem phần 6. |
| C | `src/extensibility/extensions/types.ts` **:1701** | `interface RegisteredTool` đóng lại | `1700\t\tsourceInfo: SourceInfo;` / `1701\t}` | Chèn `export interface ExtensionRegistrationDiagnostic` (4 trường) ngay **sau** dòng 1701. |
| D | `src/extensibility/extensions/runner.ts` **:485** | field private `#commandDiagnostics` | `485\t\t#commandDiagnostics: Array<{ type: string; message: string; path: string }> = [];` | `#registrationDiagnostics: ExtensionRegistrationDiagnostic[] = [];` |
| E | `src/extensibility/extensions/runner.ts` **:1215** | reset trong `getRegisteredCommands` | `1215\t\tthis.#commandDiagnostics = [];` | `this.#registrationDiagnostics = [];` |
| F | `src/extensibility/extensions/runner.ts` **:1222** | push reserved-command | `1222\t\t\t\t\tthis.#commandDiagnostics.push({ type: "warning", message, path: ext.path });` | `this.#registrationDiagnostics.push({ type: "warning", message, path: ext.path });` |
| G | `src/extensibility/extensions/runner.ts` **:1232** | đuôi `getRegisteredCommands` | `1232\t\t\treturn [...commands.values()];` | Chèn ngay trên: `this.#registrationDiagnostics.push(...this.#collectToolNameCollisions());` |
| H | `src/extensibility/extensions/runner.ts` **:1235** | `getCommandDiagnostics()` | `1235\t\tgetCommandDiagnostics(): Array<{ type: string; message: string; path: string }> {` / `1236\t\t\treturn this.#commandDiagnostics;` | `getCommandDiagnostics(): ExtensionRegistrationDiagnostic[] { return this.#registrationDiagnostics; }` |
| I | `src/extensibility/extensions/runner.ts` **:36–91** | khối `import type { … } from "./types";` | Khối import nhiều dòng `36\timport type {` … `91\t} from "./types";` | Thêm `ExtensionRegistrationDiagnostic,` vào danh sách (giữ thứ tự alphabet: sau `ExtensionMode,` trước `ExtensionRuntime,` — import **cấp cao nhất**, không inline). |
| J | `src/extensibility/extensions/runner.ts` **:1012** | doc của `getRegisteredTool` | `1012\t\t/** Get the effective registered tool for a name using normal last-extension-wins precedence. */` | Mở rộng thành phát biểu luật (bind theo thứ tự `discoverExtensionPaths` đã sort; bên sort cuối thắng; bên bị che vẫn còn trong `getAllRegisteredTools()`; xung đột do `#collectToolNameCollisions` báo). Thân hàm 1013–1019 **không đổi**. |
| K | `src/extensibility/extensions/runner.ts` | method private + getter mới | *(chưa tồn tại)* | Thêm `#collectToolNameCollisions(): ExtensionRegistrationDiagnostic[]` và `getToolCollisionDiagnostics(): ExtensionRegistrationDiagnostic[]` (đặt cạnh `getRegisteredTool` 1012–1019). |
| L | `test/extension-load-order-determinism.test.ts` | — | **Chưa tồn tại** (`ls` → `No such file or directory`) | File mới, 3 test (xem phần 4). |
| M | `CHANGELOG.md` **:3–7** | `## [Unreleased]` | `3\t## [Unreleased]` / `4\t(blank)` / `5\t### Security` / `7\t- Project-scope MCP config …` | Thêm `### Changed` + 1 dòng, **sau** khối `### Security` đã có. Không có `### Added`. |

### Những file KHÔNG được chạm

| file | vì sao |
| --- | --- |
| `src/capability/fs.ts` | `readDirEntries` (37–51) trả `dirCache.get(abs) ?? []` (39–41) **theo tham chiếu**. Sửa ở đây đảo thứ tự 5 module khác. Chỉ đọc. (`action: "modify"` trong bảng của plan là **sai** — xem phần 8.) |
| `src/extensibility/extensions/directory-resolution.ts` | Đã có `sortChildren` (119). Không liên quan. |
| `src/extensibility/plugins/loader.ts` | Đã có `sortChildren: true` (290). |

---

## 3. Các bước (mỗi bước gắn neo **đã mở và đọc**)

> Mọi dòng `→` là vị trí **thật** tôi đã đọc. Mọi dòng `(plan: N)` là con số trong plan và **sai**.

### Bước 1 — `loader.ts`, chèn sort
- `src/extensibility/extensions/loader.ts` **:660** (plan: 660 — **đúng**) → đọc được `return allPaths;`
- Ngữ cảnh đã xác minh: `allPaths` khai ở **:578**; `addPath` dedupe theo `path.resolve` ở **:585–591**; cả bốn nhánh discovery nối vào `addPath`/`addPaths` trước 660.
- Chèn `allPaths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));` ngay trên dòng 660.
- Comment phải nói 3 điều: (a) registration là last-extension-wins nên thứ tự phụ thuộc hệ file **là hành vi nhìn thấy được**; (b) code-unit, **không** `localeCompare`; (c) nằm sau dedup và sau cả bốn nhánh.
- **Không** sửa `addPath`/`addPaths` (585–591) — chúng là lớp dedupe + lọc disable, đã đúng.

### Bước 2 — `helpers.ts`, sort bản sao
- `src/discovery/helpers.ts` **:763** (plan: 763 — **đúng**) → đọc được `const entries = await readDirEntries(dir);`
- `await Promise.all(` ở **:767**, `entries.map(async entry => {` ở **:768** (plan: 767-768 — **đúng**).
- `src/capability/fs.ts` **:5** → `const dirCache = new Map<string, fs.Dirent[]>();`; **:37–41** → `readDirEntries` trả `dirCache.get(abs) ?? []` **theo tham chiếu**.
- Thay bằng `[...(await readDirEntries(dir))].sort(...)`. **`[...]` là bắt buộc, không phải mỹ thuật.**
- Comment bắt buộc nói: trả theo tham chiếu → sort tại chỗ đảo cache dùng chung; và `Promise.all` push từ trong callback nên thứ tự là thứ tự hoàn tất I/O, post-sort ở loader **không cứu được** hàm này.

### Bước 3 — `types.ts`, khai báo interface
- `src/extensibility/extensions/types.ts` **:1691** (plan: 1666 — **sai, +25**) → `export interface RegisteredTool<TParams extends TSchema = TSchema, TDetails = unknown> {`
- `extensionPath: string` ở **:1693** (plan: 1668 — **sai, +25**).
- Interface đóng lại ở **:1701** (plan: 1676 — **sai, +25**).
- `tools: Map<string, RegisteredTool<any, any>>` ở **:1832** (plan: 1807 — **sai, +25**). `any` có sẵn — **đừng nới**.
- Chèn `export interface ExtensionRegistrationDiagnostic` ngay sau 1701. Bốn trường: `type: string`, `message: string`, `path: string`, `paths: string[]`.

### Bước 4 — `runner.ts`, thêm collector
- `src/extensibility/extensions/runner.ts` **:1012** (plan: 984 — **sai, +28**) → doc `getRegisteredTool`; **:1013** → signature.
- Thêm `#collectToolNameCollisions()` cạnh đó. Duyệt `this.extensions` theo thứ tự, dựng `Map<toolName, string[]>`, phát một chẩn đoán cho mỗi tên có ≥2 bên. `paths.at(-1)!` là `path` và là bên thắng trong `message`. `message` phải chứa **mọi** đường dẫn dưới dạng text.
- Thêm `getToolCollisionDiagnostics(): ExtensionRegistrationDiagnostic[]` trả `this.#collectToolNameCollisions()` tính mới.

### Bước 5 — `runner.ts`, đổi tên field và đẩy kết quả
- Field: **:485** (plan: 481 — **sai, +4**) → `#commandDiagnostics: Array<{ type: string; message: string; path: string }> = [];`
- Reset: **:1215** (plan: 1186 — **sai, +29**)
- Push: **:1222** (plan: 1193 — **sai, +29**)
- Đuôi hàm: **:1232** (plan: — ) → `return [...commands.values()];`
- Khối log reserved-command: **:1220–1226** (plan: 1193-1196 — **sai, +27**), với `1223\tif (!this.hasUI()) {` / `1224\t\tlogger.warn(message);`
- Cố ý **KHÔNG** thêm `logger.warn` cho trùng tool.
- Đổi tên cả 4 chỗ tham chiếu: khai báo, reset, push, return.

### Bước 6 — `runner.ts`, nới getter + import
- Getter: **:1235–1236** (plan: 1206 — **sai, +29**)
- Khối import `./types`: **:36–91** (plan: chỉ nói "khối import type sẵn có" — đã xác minh tồn tại).
- Nới kiểu trả về của `getCommandDiagnostics()` thành `ExtensionRegistrationDiagnostic[]`. Tên method và trường `path` **không đổi**.
- Doc trên cả hai getter nói rõ: `#registrationDiagnostics` chỉ đầy sau `getRegisteredCommands()` — đó là lý do getter tool phải tính lại.

### Bước 7 — `runner.ts`, viết luật ra
- **:1012** (plan: 983 — **sai, +29**). Thân hàm **:1013–1019** không đổi (đã đọc: vòng `for (let index = this.extensions.length - 1; index >= 0; index -= 1)`).

### Bước 8 — Dựng fixture
- `TempDir.createSync("@omp-ext-order-")` trong `beforeEach`, `removeSync()` trong `afterEach` — theo mẫu `test/extensions-runner.test.ts:61,69`.
- `<temp>/exts/` chứa 8 thư mục con `ext-a`..`ext-h`, mỗi cái một `index.ts` đăng ký tool tên `dup`.
- **TUYỆT ĐỐI không** có `package.json` và **không** có `index.ts`/`index.js` trực tiếp ở `exts/`. Đã xác minh cơ chế: `directory-resolution.ts:106-107` (manifest) → `:109-110` (direct index) → `:114` (`children = fs.readdirSync(dir);`) → `:119` (`if (options.sortChildren) children.sort();`). `exts/` chứa `index.ts` sẽ rút ngắn thành một file đơn ở 109-110; `package.json` làm nhánh manifest 106-107 thành nguồn quyết định.
- `CONFIGURED_EXTENSION_DIRECTORY_OPTIONS` (**loader.ts:526–533**) **không** đặt `sortChildren` — đã đọc. Đây là lý do post-sort ở loader gánh trọn trên con đường này (khác `PLUGIN_EXTENSION_DIRECTORY_OPTIONS` ở `plugins/loader.ts:287–291` với `sortChildren: true` ở **:290**).

### Bước 9 — Kiểm tra tiền đề trong test, TRƯỚC khi spawn
- Dùng `fs.readdirSync(extsDir)` — **không** dùng `readDirEntries`. Đã xác minh: `directory-resolution.ts:114` tự làm `fs.readdirSync` thô; `readDirEntries` **không được import ở bất kỳ đâu** trong file đó (import duy nhất trong discovery là `helpers.ts:17`).
- Hai điều kiện, **cả hai đều bắt buộc**:
  - (a) `expect(names).not.toEqual([...names].sort())`
  - (b) `expect(names.at(-1)).not.toBe("ext-h")`
- (b) là điều kiện quyết định: `getRegisteredTool` quét **ngược** và trả phần tử khớp đầu tiên ⇒ bên thắng là phần tử **cuối cùng**.
- Khi một trong hai hỏng: ném lỗi có message nêu **thứ tự thực tế**, giá trị `.at(-1)`, và chỉ dạy đổi tên thư mục con cho tới khi cả hai đúng. **Không bao giờ bỏ qua trong im lặng.**

### Bước 10 — Probe dòng 1, hai subprocess
- `PROBE_SCRIPT` template, nội suy `JSON.stringify(extsDir)` + `JSON.stringify(tempDir.path())`.
- Spawn: `Bun.spawn([process.execPath, "-e", script], { cwd: path.resolve(import.meta.dir, "../../../"), env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: tempDir.path() }, stdout: "pipe", stderr: "pipe" })`.
  - Mẫu spawn đã xác minh: `test/bench-auth-fallback.test.ts:285` (`cwd`) và `:290` (`PI_CODING_AGENT_DIR`). Plan ghi "284-285" — lệch 1 ở đầu.
- Probe: `await discoverExtensionPaths([extsDir], cwd, undefined, { ambient: false })` → `await loadExtensions(paths, cwd)` → dựng `SessionManager.inMemory()` + `AuthStorage.create` + `ModelRegistry` + `ExtensionRunner` → in **một** dòng JSON `{ winnerPath, extensionOrder }`, exit 0.
- Khẳng định exit code 0, kèm stderr vào message lỗi.
- Chạy **hai lần, hai tiến trình tách biệt**; cả hai đều phải báo `winnerPath === path.join(extsDir, "ext-h", "index.ts")`.
- **Không** gọi loader hai lần trong cùng tiến trình — `dirCache` (`fs.ts:5`) + ESM cache của Bun sống sót.

### Bước 11 — Dòng 2, trong tiến trình
- `AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"))` + `new ModelRegistry(authStorage)` trong `beforeAll` — mẫu `test/extensions-runner.test.ts:50–52`; comment ở ~:43 nói rõ không muốn trả chi phí này mỗi `beforeEach`.
- `SessionManager.inMemory()` trong `beforeEach` — `extensions-runner.test.ts:64`.
- Dựng runner 5 tham số — mẫu `extensions-runner.test.ts:387–393` (plan ghi 389-395, lệch 2).
- Hai extension một file trong TempDir thứ hai, mỗi cái tool tên `dup`, `loadExtensions` theo thứ tự tường minh.
- Khẳng định: `type === "warning"`; `paths` đúng hai đường dẫn; `message` chứa **cả hai** chuỗi đường dẫn.
- Gọi qua `getToolCollisionDiagnostics()` để không phụ thuộc `getRegisteredCommands()` đã chạy hay chưa.

### Bước 12 — Thêm DÒNG 3 (gate cache) — *thay cho `extensions-discovery.test.ts`*
Xem phần 5.2. Tóm: symlink một thư mục thật chứa 3 subdir vào thư mục extension để ép nhánh linked, chụp **bản sao chuỗi** thứ tự `readDirEntries` trước, gọi `discoverExtensionPaths`, rồi khẳng định thứ tự sau **bằng**.

### Bước 13 — Changelog
- `## [Unreleased]` ở **CHANGELOG.md:3** (đúng). Khối `### Security` đã tồn tại ở **:5–7** — thêm `### Changed` **sau** nó.
- Một dòng. Mở đầu bằng điều người dùng thấy. Không kể chuyện sort/`Promise.all` — đó là phần thân PR.
- Phải tự giới hạn: có API chẩn đoán mới, **chưa** gắn vào UI hay log nào.
- **Không** tạo `### Added`.

---

## 4. Hợp đồng test

File: `packages/coding-agent/test/extension-load-order-determinism.test.ts` (**chưa tồn tại** — phải tạo).

### DÒNG 1 — thứ tự nạp xác định
**Khẳng định:** `ExtensionRunner#getRegisteredTool("dup")?.extensionPath` === `path.join(extsDir, "ext-h", "index.ts")`, ở **hai** subprocess.

**Nếu hồi quy:** hai plugin trùng tên resolve theo readdir tình cờ — cùng một bản cài ra khác kết quả trên APFS vs ext4, đổi trước/sau một lần cài lại, và **hoàn toàn im lặng** (không log, không lỗi, plugin thua trông như chưa từng cài).

**Vì sao assert TÊN bên thắng chứ không assert nhất quán:** thứ tự readdir là thuộc tính của **thư mục**, không phải của tiến trình — hai subprocess đọc cùng một thư mục sẽ thấy **cùng** thứ tự, có sort hay không. Assert "nhất quán" sẽ xanh trên một cài đặt không sort gì cả. Đó là lý do bước 9 tồn tại.

**Vì sao hai subprocess chứ không hai lần gọi trong một tiến trình:** `dirCache` (`fs.ts:5`) + ESM cache đều sống sót lần gọi thứ hai và che đúng thứ tự đang thử.

### DÒNG 2 — trùng tên được báo cáo nêu cả hai bên
**Khẳng định:** `getToolCollisionDiagnostics()` → một bản ghi có `type === "warning"`, `paths.length === 2` đúng hai đường dẫn, và `message` chứa **cả hai** chuỗi đường dẫn dưới dạng substring.

**Nếu hồi quy:** tác giả plugin bị ghi đè hoàn toàn không có tín hiệu — UI, log, API đều im, triệu chứng duy nhất là một tool chạy khác với điều source nói.

**Vì sao assert `message` chứ không chỉ `paths`:** bảo vệ cả consumer chỉ-đọc-log.

### DÒNG 3 — cache cấp module không bị sort tại chỗ
**Khẳng định:** thứ tự `readDirEntries` trả về **không đổi** sau một lần discovery đi qua nhánh linked.

**Nếu hồi quy:** thứ tự của 5 module discovery khác bị đảo trong im lặng. Xem phần 5.2 — đây là hậu quả được đo, không phải giả định.

**Cố ý KHÔNG assert:** `allPaths` đã sort. Đó là hình dạng mảng nội bộ; danh tính bên thắng mới là hợp đồng. Assert mảng sẽ cho phép làm test xanh bằng cách sort nhầm tầng.

---

## 5. Cổng

### 5.1 Cổng (1) — TYPE

```bash
bun run check:ts
```

**Có đỏ được không? CÓ.** Đo trên cây sạch: **exit 0**. Đỏ nếu interface chẩn đoán export sai, thiếu import type cấp cao nhất, hoặc có `any` lọt vào.

⚠️ **Cạm bẫy đã đo ngay trên cây này:** `check:ts` = `check:tools && <filter check:types>`, quét **toàn cây 5445 file**. Đang có file untracked `packages/coding-agent/test/collab/web-wire.types.ts` dưới `packages/`. Hiện tại `check:tools` **vẫn xanh** (`All matched files use the correct format. Finished in 316ms on 5445 files`) vì file đó đã đúng format. Nhưng bất kỳ file rác `.ts` untracked nào **chưa** format sẽ làm nó đỏ ở `oxfmt` dưới 1 giây, chưa tới `tsgo`. **Đỏ ở đây không mặc định là do thay đổi của bạn** — kiểm tra `git status --porcelain -- packages/` trước.

### 5.2 Cổng (2), (3), (4) — ĐỌC KỸ PHẦN NÀY

```bash
cd packages/coding-agent
bun test test/extension-load-order-determinism.test.ts test/extensions-discovery.test.ts
```

**Không còn cần build native addon.** Plan nói `bun test` chết ngay ở bước import với `"Failed to load pi_natives native addon for darwin-arm64"`, 0 pass / 1 fail / 1 error. **Đo lại: `bun test test/extension-loader-concurrency.test.ts` → `2 pass / 0 fail / 15 expect() calls / Ran 2 tests across 1 file [597ms]`.** Các bước gỡ chặng trong plan không còn cần thiết.

| Cổng | Có đỏ được? | Bằng cách nào |
| --- | --- | --- |
| (2) DÒNG 1 có phân biệt | **CÓ** | Xoá `allPaths.sort(...)` ở `loader.ts:659` → chạy lại. DÒNG 1 phải đỏ, bên thắng là `ext-*` khác `ext-h`. Đây là cổng thật vì DÒNG 1 tự kiểm tiền đề fixture trước (bước 9). |
| (3) DÒNG 2 có phân biệt | **CÓ** | Xoá `#collectToolNameCollisions` → DÒNG 2 đỏ. |
| (4) `extensions-discovery.test.ts` không hồi quy | **❌ KHÔNG BAO GIỜ ĐỎ** | Xem bên dưới. |

#### Vì sao cổng (4) của plan là thuốc an thần — đã đo thực nghiệm

Plan gọi cổng (4) là "phần có tác dụng thật". Tôi đã thay `helpers.ts:763` bằng **đúng** cái sort tại chỗ gây hại:

```ts
const entries = (await readDirEntries(dir)).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
```

Kết quả:

- `bun test test/extensions-discovery.test.ts` → **`35 pass / 0 fail / 104 expect() calls`**
- `bun test test/discovery/ test/capability/ test/skillshare/discovery.test.ts` → **`217 pass / 0 fail / 711 expect() calls`**

**(Đã khôi phục lại nguyên trạng; `git diff` sạch.)**

Lý do: các test nhiều extension trong `extensions-discovery.test.ts` chỉ assert **độ dài**, không assert thứ tự:
- `extensions-discovery.test.ts:310` → `expect(result.extensions).toHaveLength(2);`
- `extensions-discovery.test.ts:401` → `expect(result.extensions).toHaveLength(3);`

Nên cache bị đảo thứ tự vẫn xanh. Cổng (4) **không phát hiện** cái bẫy mà plan tự gọi là "cách sai dễ nhất" và là thứ duy nhất đứng giữa kỹ sư mệt mỏi và nó. Giữ nó làm cổng tạo cảm giác an toàn giả.

#### Cổng (4) PHẢI VIẾT LẠI — thay bằng DÒNG 3

Plan nói viết fixture thứ hai để ép nhánh linked sẽ "chiếm phần lớn công sức test còn lại". **Con số đó sai** — `extensions-discovery.test.ts:405–420` đã là một fixture symlink-dir chạy được, 9 dòng thật:

```ts
const realDir = path.join(tempDir.path(), "external", "shared-ext");
fs.mkdirSync(realDir, { recursive: true });
fs.writeFileSync(path.join(realDir, "index.ts"), extensionCode);
fs.symlinkSync(realDir, path.join(extensionsDir, "linked-ext"), "dir");
```

**Cách làm DÒNG 3 (đỏ được, và đỏ đúng lý do):**

1. Dựng `<temp>/shared/` chứa 3 subdir, tạo theo thứ tự **cố tình không alphabet**.
2. Symlink nó vào thư mục extension → buộc native glob không đi xuống, `discoverLinkedExtensionModuleFiles` chạy (đúng nhánh tại `helpers.ts:763`).
3. **Trước** khi discovery: `const first = await readDirEntries(shared);`
4. Chụp **bản sao chuỗi**, không phải tham chiếu:
   `const order0 = first.map(e => e.name);` ← đây là mảng string mới, miễn nhiễm với mutation.
5. `await discoverExtensionPaths([linked], cwd, undefined, { ambient: false });`
6. **Sau**: `const second = await readDirEntries(shared);`
7. `expect(second.map(e => e.name)).toEqual(order0);`

**Vì sao bước 4 phải chụp string chứ không giữ tham chiếu:** nếu giữ tham chiếu `first`, thì sort tại chỗ sẽ mutate **chính** mảng bạn đang giữ, `order0` cũng đổi theo, và phép so sánh luôn bằng → **cổng xanh với code hỏng**. Đây chính là bẫy thứ hai của DÒNG 3.

**Tiền đề, cùng kỷ luật với bước 9:** `expect(order0).not.toEqual([...order0].sort())` — nếu readdir tình cờ ra alphabet thì dòng này vô nghĩa, phải đỏ với message nêu thứ tự thực tế.

**Cổng đỏ được không? CÓ, và đỏ đúng lý do:** sửa `helpers.ts:763` thành `.sort()` tại chỗ (bỏ `[...]`) → DÒNG 3 đỏ trên `toEqual(order0)`.

### 5.3 Bảng tổng kết cổng

| Cổng | Lệnh | Đỏ được? |
| --- | --- | --- |
| (1) TYPE | `bun run check:ts` | ✅ CÓ (toàn cây — xem cảnh báo file rác) |
| (2) DÒNG 1 | xoá `allPaths.sort` | ✅ CÓ |
| (3) DÒNG 2 | xoá `#collectToolNameCollisions` | ✅ CÓ |
| (4) ~~`extensions-discovery.test.ts`~~ | — | ❌ **KHÔNG — đã đo, 217 test vẫn xanh** |
| (4') **DÒNG 3** (thay thế) | xoá `[...]` ở `helpers.ts:763` | ✅ CÓ |
| smoke | `bun test test/extension-loader-concurrency.test.ts` | ✅ xanh (không tính là cổng) |

**Chứng minh cổng, chạy trước khi mở PR:** (1) với bản sửa đầy đủ, DÒNG 1+2+3 xanh; (2) xoá `allPaths.sort` → DÒNG 1 đỏ; (3) khôi phục, xoá `[...]` ở `helpers.ts:763` → DÒNG 3 đỏ; (4) khôi phục, xoá `#collectToolNameCollisions` → DỒNG 2 đỏ.

---

## 6. Cạm bẫy riêng của work item này

### Bẫy 1 — sort tại chỗ trên mảng cache (mức CAO, im lặng, đã đo là không test nào bắt)
`readDirEntries` trả `dirCache.get(abs) ?? []` (`fs.ts:39–41`) **theo tham chiếu**. Viết `entries.sort(...)` thay vì `[...entries].sort(...)` sẽ đảo cache cấp module dùng chung với:
- `discovery/builtin.ts:48, 531, 582, 701, 743`
- `discovery/cline.ts:23`
- `discovery/gemini.ts:195`
- `discovery/omp-extension-roots.ts:243`
- `discovery/omp-plugins.ts:236`
- cộng 3 call site còn lại của chính helpers: `helpers.ts:844, 848, 874`

(Tất cả đã xác minh bằng `rg`.)

Không lỗi, không import hỏng. **Đã chứng minh 217 test vẫn xanh.** Đó là lý do DÒNG 3 tồn tại và cổng (4) của plan bị bỏ.

### Bẫy 2 — giữ tham chiếu mảng thay vì chụp bản sao trong DÒNG 3
Mô tả ở 5.2. Test tự xanh với code hỏng. Dễ mắc vì trông tự nhiên.

### Bẫy 3 — 12 neo sai, tập trung ở `runner.ts` và `types.ts`
Plan tự nhận sai 4 neo runner.ts, nhưng **thực tế sai 6**, và mức lệch không đều: field `+4`, còn các thứ trong `getRegisteredCommands` và `getRegisteredTool` lệch `+28..+30`. `types.ts` lệch đều `+25`. Nếu gõ theo số trong plan, sẽ sửa nhầm dòng. **Dùng cột "→" ở phần 3, không dùng số trong plan.**

### Bẫy 4 — dùng `readDirEntries` để kiểm tiền đề fixture
`directory-resolution.ts:114` tự làm `fs.readdirSync` thô; `readDirEntries` không được import ở bất kỳ đâu trong file đó. Kiểm bằng nó là xác nhận tiền đề về một đường code fixture **không đi qua**.

### Bẫy 5 — chỉ có điều kiện (a) mà thiếu (b)
Thêm `allPaths.sort` vào một cài đặt mà readdir tình cờ ra alphabet vẫn xanh. Cả hai điều kiện đều bắt buộc.

### Bẫy 6 — gọi loader hai lần trong cùng tiến trình
`dirCache` (`fs.ts:5`) + ESM cache sống sót, che đúng thứ tự đang thử. Phải hai subprocess.

### Bẫy 7 — đây là đảo hành vi có chủ đích, không phải sửa lỗi
Người dùng hôm nay đang dựa vào một thứ tự tình cờ. Người viết `extensions: ["b-ext", "a-ext"]` trong settings và dựa vào thứ tự đó để thắng sẽ **thấy đảo chiều**. Đó là lý do plan tách WI-2 thành 2 PR. Ghi rõ trong changelog.

---

## 7. Bảng neo đã kiểm — đầy đủ

### 7.1 Neo ĐÚNG (35)

| file | dòng | nội dung thực |
| --- | --- | --- |
| `extensions/loader.ts` | 485–487 | `loadExtensions` + `Promise.all(paths.map(...))` |
| `extensions/loader.ts` | 526–533 | `CONFIGURED_EXTENSION_DIRECTORY_OPTIONS` (**không** có `sortChildren`) |
| `extensions/loader.ts` | 572 | `export async function discoverExtensionPaths(` |
| `extensions/loader.ts` | 578 | `const allPaths: string[] = [];` |
| `extensions/loader.ts` | 585–591 | `addPath` — dedupe theo `path.resolve` |
| `extensions/loader.ts` | **660** | `return allPaths;` |
| `discovery/helpers.ts` | 17 | import `readDirEntries` |
| `discovery/helpers.ts` | **763** | `const entries = await readDirEntries(dir);` |
| `discovery/helpers.ts` | 767–768 | `await Promise.all(` / `entries.map(async entry => {` |
| `discovery/helpers.ts` | 844, 848, 874 | 3 call site còn lại |
| `capability/fs.ts` | 5 | `const dirCache = new Map<string, fs.Dirent[]>();` |
| `capability/fs.ts` | 37–51 | `readDirEntries` |
| `capability/fs.ts` | 39–41 | `return dirCache.get(abs) ?? [];` — **theo tham chiếu** |
| `discovery/builtin.ts` | 48, 531, 582, 701, 743 | 5 consumer |
| `discovery/cline.ts` | 23 | consumer |
| `discovery/gemini.ts` | 195 | consumer |
| `discovery/omp-extension-roots.ts` | 243 | consumer |
| `discovery/omp-plugins.ts` | 236 | consumer |
| `extensions/directory-resolution.ts` | 106–107 | nhánh manifest |
| `extensions/directory-resolution.ts` | 109–110 | nhánh direct index |
| `extensions/directory-resolution.ts` | 114 | `children = fs.readdirSync(dir);` |
| `extensions/directory-resolution.ts` | 119 | `if (options.sortChildren) children.sort();` |
| `plugins/loader.ts` | 287–291, **290** | `sortChildren: true` |
| `extensions/get-commands-handler.ts` | 36 | `runner.getRegisteredCommands(...)` |
| `modes/interactive-mode.ts` | 2051 | `getRegisteredCommands(...)` |
| `slash-commands/available-commands.ts` | 77 | `getRegisteredCommands(...)` |
| `test/extension-loader-concurrency.test.ts` | 85, 120 | `loadExtensions([...])` — đúng tuyệt đối |
| `test/bench-auth-fallback.test.ts` | 285 | `cwd: path.resolve(import.meta.dir, "../../..")` (plan: 284-285) |
| `test/extensions-runner.test.ts` | 387–393 | `new ExtensionRunner(...)` 5 tham số (plan: 389-395) |
| `CHANGELOG.md` | 3 | `## [Unreleased]` |

### 7.2 Neo HỎNG (12) — dùng cột "vị trí thật"

| file | dòng trong plan | nội dung plan nói | **vị trí thật** | lệch |
| --- | --- | --- | --- | --- |
| `extensions/runner.ts` | 481 | field `#commandDiagnostics` | **485** | +4 |
| `extensions/runner.ts` | 1186 | reset | **1215** | +29 |
| `extensions/runner.ts` | 1193 | push | **1222** | +29 |
| `extensions/runner.ts` | 1193–1196 | khối log reserved | **1220–1226** | +27 |
| `extensions/runner.ts` | 1206 | `getCommandDiagnostics()` | **1235** | +29 |
| `extensions/runner.ts` | 984 | `getRegisteredTool` | **1012** (doc) / **1013** (sig) | +28/+29 |
| `extensions/runner.ts` | 983 | doc của `getRegisteredTool` | **1012** | +29 |
| `extensions/types.ts` | 1666 | `export interface RegisteredTool` | **1691** | +25 |
| `extensions/types.ts` | 1668 | `extensionPath: string` | **1693** | +25 |
| `extensions/types.ts` | 1676 | đóng `RegisteredTool` | **1701** | +25 |
| `extensions/types.ts` | 1807 | `tools: Map<string, RegisteredTool<any, any>>` | **1832** | +25 |
| `CHANGELOG.md` | 5 | `## [18.3.3]` bất biến | **dòng 5 là `### Security`**; mục đã phát hành là `## [18.4.0] - 2026-09-28` ở **dòng 9** | — |

### 7.3 Claim môi trường đã lỗi thời (4)

| claim trong plan | đo lại @ `65cc6c1` |
| --- | --- |
| `bun test` chết vì native addon, 0 pass / 1 fail / 1 error; phải `bun --cwd=packages/natives run build` | **Sai.** `bun test test/extension-loader-concurrency.test.ts` → `2 pass / 0 fail / 597ms`. Không cần build. |
| HEAD là `808b365` | **Sai.** HEAD = **`65cc6c1`**. |
| `## [Unreleased]` "hiện đang rỗng" | **Sai.** Nó có `### Security` (`:5–7`) với một entry về project-scope MCP. Phải thêm `### Changed` **sau** khối đó. |
| `check:ts` đỏ vì file rác `.ts` untracked | **Cơ chế có thật, hiện cây XANH.** File untracked `test/collab/web-wire.types.ts` tồn tại nhưng đã format. `check:tools` → `Finished in 316ms on 5445 files`, `check:ts` → **exit 0**. |

### 7.4 Claim đã kiểm và ĐÚNG

| claim | kết quả |
| --- | --- |
| `getCommandDiagnostics` chỉ khớp định nghĩa tại runner.ts | ✅ `rg` toàn packages → chỉ **1235** |
| `getRegisteredCommands` có 3 call site thật | ✅ `get-commands-handler.ts:36`, `interactive-mode.ts:2051`, `available-commands.ts:77` — cả 3 chỉ lấy danh sách lệnh, không đọc chẩn đoán |
| `loadExtensions` giữ nguyên thứ tự đầu vào | ✅ `Promise.all(paths.map(...))` tại 485–487 |
| `resolveExtensionDirectory` với CONFIGURED options **không** sort | ✅ 526–533 không có `sortChildren`; plugin options thì **có** (290) |
| `extension-loader-concurrency.test.ts` không gọi `discoverExtensionPaths` | ✅ chỉ gọi `loadExtensions` với mảng literal ở 85, 120 |
| Nhánh thư mục đã cấu hình là con đường duy nhất post-sort ở loader gánh trọn | ✅ xác nhận qua 526–533 vs 290 |

---

## 8. Điểm tự mâu thuẫn trong work item (ghi ra, không sửa trong plan)

1. **Cổng (4).** Plan dựng nó lên như "phần có tác dụng thật" và dùng nó để chứng minh hai chỗ sort không thừa. Đo thực nghiệm: nó xanh với cả hai chỗ sort hỏng. Nó không chứng minh được gì và cần bị thay bằng DÒNG 3.

2. **Cổng (4) và "Cần người quyết" #3 mâu thuẫn nhau.** Plan nói chỗ sort ở `helpers.ts:763` không có coverage quan sát được, rồi nói fixture thứ hai "chiếm phần lớn công sức test còn lại" — trong khi chính cổng (4) được dựng để giả định là phủ. Một trong hai phải sai. Đo được: fixture thứ hai là ~9 dòng (`extensions-discovery.test.ts:405–420` làm mẫu), **không** tốn nhiều.

3. **`action: "modify"` cho `capability/fs.ts`.** Bảng "File cần chạm tới" ghi `modify`, phần `change` của chính nó ghi "KHÔNG THAY ĐỔI. Chỉ đọc". `action: "modify"` sai — file này chỉ đọc.

4. **Changelog.** Mục file viết "một dòng dưới `### Added`: … gộp vào cùng dòng Changed" trong khi bước 13 chỉ yêu cầu `### Changed`. Hai chỗ cùng kết luận nhưng cách viết của mục file dễ bị hiểu là còn một mục `### Added` riêng. Chốt: **một dòng dưới `### Changed`, không `### Added`.**

5. **Tiền đề fixture: hard-fail hay skip?** Plan để mở. Khuyến nghị của tôi: **hard-fail**, nhưng thêm một lớp nữa — nếu hard-fail xảy ra trên nền tảng mà readdir ra alphabet, kỹ sư mệt mỏi sẽ *nới* điều kiện chứ không đổi tên thư mục. Vì vậy message lỗi **phải** in ra thứ tự thực tế và `.at(-1)`, và chỉ dạy đổi tên `ext-*`. Không có message đó thì hard-fail cũng dẫn tới cái pass vô nghĩa mà cổng sinh ra để chặn.

---

## 9. Danh sách file

| file | hành động |
| --- | --- |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa — 1 dòng + comment (chèn trên :660) |
| `packages/coding-agent/src/discovery/helpers.ts` | sửa — 1 dòng + comment (tại :763, **bắt buộc có `[...]`**) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa — thêm interface sau :1701 |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa — :485, :1215, :1222, :1232, :1235, import :36–91, doc :1012, + 2 method mới |
| `packages/coding-agent/test/extension-load-order-determinism.test.ts` | **tạo** — 3 test |
| `packages/coding-agent/CHANGELOG.md` | sửa — 1 mục `### Changed` sau :7 |

Tổng: **6 file**.
