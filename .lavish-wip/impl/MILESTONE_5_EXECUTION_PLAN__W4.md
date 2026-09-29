# Phiếu triển khai — W4: Tách phân giải thư mục cấu hình thành đọc và ghi

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md` dòng 946–1144
**Cây tham chiếu:** chỉ `/Users/tranquangdang21/Projects/ultraworkers`. W4 **không** có neo nào trỏ sang `pi-ref`, `deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref` hay `senpi-ref` — đã kiểm toàn bộ văn bản W4, mọi đường dẫn đều là đường dẫn nội bộ của omp. Không cần mở cây tham chiếu nào khác.
**HEAD khi viết phiếu:** `47720fd` (nhánh `milestone-1`). Đặc tả W4 trong kế hoạch được viết ở HEAD `84cbac9`.

---

## 1. Cái gì thay đổi, quan sát được

Một người dùng nâng cấp giữa chừng không mất cài đặt, phiên hay install-id của mình: `~/.omp` (root cũ) và `~/.ultraworkers` (root mới) **cùng đọc được**, nhưng **mọi thứ ghi mới chỉ rơi vào root mới**, và `ULTRAWORKERS_CONFIG_DIR` thắng `PI_CONFIG_DIR` khi cả hai cùng được đặt.

---

## 2. VIỆC 1 — Kết quả kiểm lại từng neo

Cây `dirs.ts` đã **trôi +20 dòng** so với lúc đặc tả được viết. Nguyên nhân xác định được: commit `f804d66` ("Sync from upstream omp 18.4.0") thêm 24 dòng / xoá 4 dòng vào `packages/utils/src/dirs.ts`. Ba hunk chèn nằm ở ba vị trí khác nhau, nên **độ lệch không đều** — đây là lý do không được tin bất kỳ neo nào của `dirs.ts` mà không mở file.

`git diff 84cbac9 HEAD -- packages/utils/src/dirs.ts` cho ba hunk: `+import { expandWindowsLongPath }` (dòng 17), hàm `standardizeProjectPath` mới + thân `getProjectDir()` viết lại (dòng ~155–235), và `getJudgmentCacheDbPath()` mới (dòng ~800–809).

### 2a. `packages/utils/src/dirs.ts` — file nay **1177 dòng**, không phải 1157

| Symbol | Đặc tả ghi | Thực tế | Lệch | Nội dung thật ở dòng thực tế |
| --- | --- | --- | --- | --- |
| `CONFIG_DIR_NAME` | `:27` | **`:28`** | +1 | `export const CONFIG_DIR_NAME: string = ".omp";` (`:27` là doc comment) |
| `MAIN_CONFIG_FILENAMES` | `:30` | **`:31`** | +1 | `export const MAIN_CONFIG_FILENAMES = ["config.yml", "config.yaml"] as const;` (`:30` là doc comment) |
| `getBaseConfigRoot` | `:114-116` | **`:115-117`** | +1 | `:114` doc comment, `:115` khai báo, `:116` `return path.join(os.homedir(), getConfigDirName());` |
| `getProfileConfigRoot` | `:119` | **`:119`** | **0 ✓** | `function getProfileConfigRoot(profile: string \| undefined): string {` |
| `APP_NAME` | (tiền đề W3) | **`:22`** | — | `export const APP_NAME: string = "omp";` — **chưa đổi, W3 chưa merge** |
| khối comment orphan-profile | `:340-355` | **`:350-364`** | +10 | `:350` = `// XDG is a Linux convention. On supported platforms, default profile state` |
| chữ "orphaning" | `:348` | **`:358`** | +10 | nằm trong `$XDG_*_HOME/omp/profiles/<name>` … orphaning |
| `resolveIf` | `:358-372` | **`:365-382`** | +7…+10 | `const resolveIf = (envVar: string) => {` |
| `const appRoot = path.join(value, APP_NAME)` | `:360` | **`:370`** | +10 | đúng nội dung |
| comment XDG-flattens | `:384` | **`:394`** | +10 | `// XDG flattens the agent/ prefix: ~/.omp/agent/sessions → $XDG_DATA_HOME/omp/sessions` |
| `class DirResolver` | `:331+` | **`:329`** | −2 | `class DirResolver {`; constructor ở `:340` |
| `let dirs = new DirResolver({...})` | `:449` | **`:459-462`** | +10 | đúng nội dung |
| `refreshDirsFromEnv` | `:485` | **`:495`** | +10 | `export function refreshDirsFromEnv(): void {` |
| `setAgentDir` | `:502` | **`:512`** | +10 | `export function setAgentDir(dir: string): void {` |
| `setProfile` | `:541` | **`:551`** | +10 | `export function setProfile(profile: string \| undefined): void {` |
| `getProjectAgentDir` | `:589-591` | **`:598-601`** | +9 | `:600` = `return path.join(cwd, CONFIG_DIR_NAME);` |
| `INSTALL_ID_FILE` | `:1076` | **`:1096`** | +20 | `const INSTALL_ID_FILE = "install-id";` |
| `getAppName` | `:1083-1086` | **`:1103-1106`** | +20 | `:1105` = `return value ? value : "omp";` |
| `getInstallId` | `:1104-1152` | **`:1124-1172`** | +20 | doc comment mở ở `:1110` |
| `__resetInstallIdCacheForTests` | `:1155` | **`:1175`** | +20 | `export function __resetInstallIdCacheForTests(): void {` |
| `getConfigDirName` | `:297-298` | **`:307-308`** | +10 | `:308` = `return process.env.PI_CONFIG_DIR \|\| CONFIG_DIR_NAME;` |
| `getConfigAgentDirName` | `:302-305` | **`:311-315`** | +9 | `:314` = `return profile ? path.join(getConfigDirName(), "profiles", profile, "agent") : \`${getConfigDirName()}/agent\`;` |
| dùng `getBaseConfigRoot` | `:1008` | **`:1028`** | +20 | `return path.join(getBaseConfigRoot(), "run", "daemons", "global");` |
| dùng `getBaseConfigRoot` | `:1106` | **`:1126`** | +20 | `const filePath = path.join(getBaseConfigRoot(), INSTALL_ID_FILE);` |

Các neo mà đặc tả **không** nêu nhưng cần biết: `getConfigRootDir` ở **`:507`**, `__resetProfileSnapshotForTests` ở **`:530`**, `__resetDirsFromEnvForTests` ở **`:544`**, `getPluginsDir` ở **`:644-648`**.

### 2b. Các file khác — neo **chính xác tuyệt đối**, không cần dịch số dòng

| File:line (đặc tả) | Nội dung thật | Kết luận |
| --- | --- | --- |
| `packages/coding-agent/src/discovery/helpers.ts:42` | `return getConfigDirName();` (getter `userBase`) | ✓ |
| `:45` | `return \`${getConfigDirName()}/agent\`;` (getter `userAgent`) | ✓ |
| `:47` | `projectDir: CONFIG_DIR_NAME,` | ✓ |
| `:1032` | `const stat = await fs.promises.stat(path.join(dir, getConfigDirName()));` | ✓ |
| `:1034` | `return path.join(dir, getConfigDirName(), "plugins", "installed_plugins.json");` | ✓ |
| `:1049` | `return path.join(dir, getConfigDirName(), "plugins", "installed_plugins.json");` (fallback `.git`) | ✓ |
| `:1079` | `return path.join(cwd, getConfigDirName(), "plugins", "installed_plugins.json");` | ✓ |
| `crates/pi-natives/src/crash_handler.rs:48` | ``/// `PI_CONFIG_DIR`, matching `packages/utils/src/dirs.ts`).`` | ✓ |
| `:49` | `const DEFAULT_CONFIG_DIR: &str = ".omp";` | ✓ |
| `:269` | `let config_override = std::env::var_os("PI_CONFIG_DIR");` | ✓ |
| `:286` | `.unwrap_or_else(\|\| OsStr::new(DEFAULT_CONFIG_DIR));` | ✓ |
| `:293-296` | doc comment của `xdg_state_logs_from_env` | ✓ |
| `:344` | `.unwrap_or_else(\|\| OsStr::new(DEFAULT_CONFIG_DIR));` | ✓ |
| `crates/pi-natives/src/oauth_callback/darwin.rs:441` | `.get("PI_CONFIG_DIR")` | ✓ |
| `:439-450` | toàn thân `legacy_recovery_path()` | ✓ |
| `:446` — **SAI** | `:446` là `.home`; fallback literal `.omp` nằm ở **`:444`** | **lệch 2** |
| `packages/coding-agent/src/collab/registry.ts:29` | `import { getBaseConfigRoot, isEnoent } from "@oh-my-pi/pi-utils";` | ✓ |
| `packages/coding-agent/src/collab/registry.ts:167` | `return path.join(getBaseConfigRoot(), "run", "collab-hosts");` | ✓ |
| `docs/environment-variables.md:523` | hàng `` `PI_CONFIG_DIR` `` — "Config root dirname under home (default `.omp`)" | ✓ |
| `docs/install-id.md:18` | tham chiếu chéo `getBaseConfigRoot()` + `PI_CONFIG_DIR` | ✓ |
| `packages/coding-agent/test/marketplace/project-scope.test.ts:148` | `fs.mkdirSync(path.join(tmpProject, ".omp", "plugins"), { recursive: true });` | ✓ |
| `packages/coding-agent/src/config/settings.ts:2129-2133` | `for (const filename of MAIN_CONFIG_FILENAMES) {` … `if (loaded) return { settings: loaded, configPath };` | ✓ |
| `packages/ai/src/auth-broker/discover.ts:198` | `for (const filename of MAIN_CONFIG_FILENAMES) {` | ✓ |

### 2c. Sai lệch khác so với đặc tả — **ghi ra, không sửa trong tài liệu kế hoạch**

| Claim của đặc tả | Thực tế | Ảnh hưởng |
| --- | --- | --- |
| "plan dòng 13677" (ghi chú env phải được tài liệu hoá) và "plan dòng 14025" (họ `PI_*`/`OMP_*`) | `MILESTONE_5_EXECUTION_PLAN.md` chỉ có **4808 dòng**. Cả hai số dòng nằm ngoài file. Chúng trỏ vào bản gốc `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (dòng 16844 và 16934 — đã kiểm, nội dung khớp ý) | Người gõ không mở được bằng số dòng trong kế hoạch. Nội dung ý thì vẫn đúng, chỉ là tham chiếu đã cũ |
| Census: "69 lượt / 26 file", tái lập bằng `git grep -o 'PI_CONFIG_DIR' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md'` | Lệnh đó hôm nay cho **146 lượt / 27 file**. Số 69/26 chỉ đúng khi loại **thêm 8 file kế hoạch MILESTONE_*.md** (trong đó `MILESTONE_5_EXECUTION_PLAN.md` tự nó chứa 70+ lượt). Cột phần mở rộng 17 `.ts` / 7 `.md` / 2 `.rs` vẫn khớp khi loại cả 8 file plan | Công thức tái lập trong đặc tả **không tái lập được con số của chính nó**. Dùng số đã sửa nhưng phải kèm lệnh loại đủ 8 file plan |
| "`darwin.rs:446` hardcode `.omp` làm fallback" | `.unwrap_or(".omp")` ở `:444`; `:446` là `.home` | Đọc nhầm sẽ sửa nhầm dòng |
| "Bốn file W4 chạm tới không cần addon" / "Giữ cả ba sạch mọi import kéo theo `pi_natives`" | `dirs.ts:17` **nay đã import** `import { expandWindowsLongPath } from "@oh-my-pi/pi-natives/path";` (thêm bởi `f804d66`). Kết luận "không cần addon" **vẫn đúng trên macOS/Linux** vì `native/path.js:14` short-circuit `process.platform === "win32" ? nativePathFn(...) : path` và `loadNative()` chỉ được gọi bên trong `nativePathFn` — nhưng lý do đã khác, và **trên Windows CI thì cần addon** | Cổng phải giữ cả tiền đề build, và không được viết vào PR rằng ba file test "không phụ thuộc addon" một cách tuyệt đối |

---

## 3. Bảng điểm sửa

Cột TRƯỚC trích nguyên văn từ file thật.

| Đường dẫn | Symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts:28` | `CONFIG_DIR_NAME` + hằng mới | `export const CONFIG_DIR_NAME: string = ".omp";` | Giữ nguyên. Thêm ngay dưới: `const LEGACY_CONFIG_DIR_NAME = ".omp";` và `const CONFIG_DIR_CANDIDATES = [CONFIG_DIR_NAME, LEGACY_CONFIG_DIR_NAME] as const;` — theo đúng khuôn `MAIN_CONFIG_FILENAMES` ở `:31` |
| `packages/utils/src/dirs.ts:307-308` | `getConfigDirName` | `return process.env.PI_CONFIG_DIR \|\| CONFIG_DIR_NAME;` | Chuỗi ưu tiên tường minh: `ULTRAWORKERS_CONFIG_DIR` → `PI_CONFIG_DIR` → `getConfigReadRootName()` → `getConfigWriteRootName()` |
| `packages/utils/src/dirs.ts` (mới, trước `:307`) | `getConfigDirCandidates` | — | `export function getConfigDirCandidates(): string[]` — thuần, không I/O, không cache. Nguồn duy nhất cả hai phía rút ra |
| `packages/utils/src/dirs.ts` (mới) | `getConfigReadRootName` | — | Ứng viên đầu tiên tồn tại dưới `os.homedir()`, cache suốt tiến trình; không ứng viên nào thì trả write root |
| `packages/utils/src/dirs.ts` (mới) | `getConfigWriteRootName` | — | Trả **tên mới** vô điều kiện. **Không** được trả `CONFIG_DIR_NAME` — xem mục 7 |
| `packages/utils/src/dirs.ts` (mới) | `__resetConfigDirCacheForTests` | — | Đặt tên sau `__resetInstallIdCacheForTests` (`:1175`) |
| `packages/utils/src/dirs.ts:495` | `refreshDirsFromEnv` | `export function refreshDirsFromEnv(): void { dirs = new DirResolver({...}); }` | Thêm `__resetConfigDirCacheForTests();` **trước** khi dựng resolver mới |
| `packages/utils/src/dirs.ts:512` | `setAgentDir` | `export function setAgentDir(dir: string): void {` | Thêm reset cache ở đầu thân |
| `packages/utils/src/dirs.ts:551` | `setProfile` | `export function setProfile(profile: string \| undefined): void {` | Thêm reset cache ở đầu thân |
| `packages/utils/src/dirs.ts:115-117` | `getBaseConfigRoot` | `return path.join(os.homedir(), getConfigDirName());` | Giữ tên + ngữ nghĩa **đọc** (registry.ts:29/167 import nó). Thêm `getBaseConfigWriteRoot()` trả về write root |
| `packages/utils/src/dirs.ts:1124-1172` | `getInstallId` | `const filePath = path.join(getBaseConfigRoot(), INSTALL_ID_FILE);` | Đọc ứng viên theo thứ tự; nếu thấy UUID hợp lệ ở legacy thì **ghi lại xuống write root** rồi trả về. Giữ nguyên `UUID_RE`, `O_CREAT\|O_EXCL`, unlink-trước-`O_EXCL`, fallback bộ nhớ |
| `packages/utils/src/dirs.ts:370` | `resolveIf` appRoot | `const appRoot = path.join(value, APP_NAME);` | Thử `ultraworkers` rồi `omp` (không dấu chấm) — tập XDG, **không dùng chung** với tập home |
| `packages/utils/src/dirs.ts:600` | `getProjectAgentDir` | `return path.join(cwd, CONFIG_DIR_NAME);` | `return path.join(cwd, PROJECT_CONFIG_DIR_NAME);` — hằng ghim, cố ý giữ `".omp"` |
| `packages/coding-agent/src/discovery/helpers.ts:1032,1034,1049,1079` | 4 tra cứu registry tương đối project | `path.join(dir, getConfigDirName(), "plugins", "installed_plugins.json")` | `path.join(dir, PROJECT_CONFIG_DIR_NAME, "plugins", "installed_plugins.json")`. **Giữ nguyên** `:42`/`:45` (home) và `:47` |
| `crates/pi-natives/src/crash_handler.rs:269` | `logs_dir` | `let config_override = std::env::var_os("PI_CONFIG_DIR");` | `std::env::var_os("ULTRAWORKERS_CONFIG_DIR").or_else(\|\| std::env::var_os("PI_CONFIG_DIR"))`. Giữ nguyên `.filter(\|s\| !s.is_empty())` ở `:285`/`:343` |
| `crates/pi-natives/src/oauth_callback/darwin.rs:439-444` | `legacy_recovery_path` | `.get("PI_CONFIG_DIR").map(\|value\| value.trim()).filter(...).unwrap_or(".omp");` | `.get("ULTRAWORKERS_CONFIG_DIR").or_else(\|\| context.env.get("PI_CONFIG_DIR"))` rồi giữ nguyên `.map/.filter/.unwrap_or` |
| `docs/environment-variables.md:523` | hàng `PI_CONFIG_DIR` | `Config root dirname under home (default .omp)` | Thêm hàng `ULTRAWORKERS_CONFIG_DIR` ngay trên, nêu "wins over `PI_CONFIG_DIR`"; sửa hàng cũ thành "permanent legacy alias" |

---

## 4. Các bước, đánh số, mỗi bước có neo đã kiểm

> Mọi neo `dirs.ts` dưới đây là **số dòng thật ở HEAD `47720fd`**, đã mở và đọc.

0. **Điều kiện tiên quyết — W3 CHƯA merge, và điều đó chặn W4.** `dirs.ts:22` vẫn là `export const APP_NAME: string = "omp";`. W4 phải ghi đúng tên mới vào write root; nếu W4 chạy trước W3 thì tên "mới" ở phía XDG chưa tồn tại. Cần chốt tên mới với người quyết trước khi viết dòng đầu tiên.
1. `dirs.ts:28` — thêm hằng legacy `".omp"` + tập ứng viên có thứ tự (tên mới trước, legacy sau), ngay cạnh `CONFIG_DIR_NAME`. Khuôn thứ tự: `MAIN_CONFIG_FILENAMES` ở `dirs.ts:31`. **Đừng** lật `CONFIG_DIR_NAME` — W6 sở hữu việc đó.
2. `dirs.ts:307` (ngay trên `getConfigDirName`) — thêm `getConfigDirCandidates()`: thuần, không I/O, không cache.
3. `dirs.ts:307` — thêm `getConfigReadRootName()` (first-existing dưới home, cache, rơi về write root) và `__resetConfigDirCacheForTests()`.
4. Ngay cạnh hàm ở bước 3 — thêm `getConfigWriteRootName()`: trả tên mới vô điều kiện, không hỏi fs, không hỏi cache.
5. `dirs.ts:307-308` — nối lại `getConfigDirName()` thành chuỗi ưu tiên tường minh.
6. `dirs.ts:495`, `:512`, `:551` — gọi `__resetConfigDirCacheForTests()` từ `refreshDirsFromEnv()`, `setAgentDir()`, `setProfile()`. **Bắt buộc**, xem mục 7.
7. `dirs.ts:115-117` — tách `getBaseConfigRoot()` thành biến thể đọc (giữ tên) và biến thể ghi. `registry.ts:29`/`:167` import tên cũ; đừng đổi ngữ nghĩa nó.
8. `dirs.ts:1124-1172` — làm lại `getInstallId()`: đọc ứng viên theo thứ tự, ghi vào write root. Giữ nguyên `UUID_RE` (`:1108`), `O_CREAT|O_EXCL`, unlink-trước-`O_EXCL`, fallback bộ nhớ.
9. `dirs.ts:365-382` — mở rộng `resolveIf` thử `ultraworkers` rồi `omp` dưới cả ba `XDG_*_HOME`. Giữ nguyên nhánh `profilePath` và comment ở `:350-364` đúng như cũ. **Tập XDG không có dấu chấm; tập home có.**
10. `dirs.ts:600` — hằng ghim cho thư mục cấp project, cố ý giữ `".omp"`; `getProjectAgentDir()` trả nó. Ghi lý do vào `do_not_rename`.
11. `helpers.ts:1032`, `:1034`, `:1049`, `:1079` — thay `getConfigDirName()` bằng hằng ghim project. Giữ nguyên `:42`/`:45`; `:47` đã đúng sẵn.
12. `crash_handler.rs:269` — đọc `ULTRAWORKERS_CONFIG_DIR` trước `PI_CONFIG_DIR`. Giữ `.filter(|s| !s.is_empty())` ở `:285`/`:343` và `DEFAULT_CONFIG_DIR` ở `:49`.
13. `darwin.rs:439-444` — cùng thứ tự ưu tiên; giữ `.trim()`, bộ lọc rỗng, `unwrap_or(".omp")`.
14. Viết ba file test mới trong `packages/utils/test/`.
15. `docs/environment-variables.md:523` — thêm hàng mới, sửa hàng cũ. **Dừng — KHÔNG thêm changelog.**

---

## 5. Hợp đồng test

| File | Case | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| `packages/utils/test/config-dir-dual-root.test.ts` (mới) | Chỉ root legacy tồn tại → phân giải dưới nó. Cả hai → root mới thắng. Không root nào → mặc định tên mới. Một case riêng ghim tập ứng viên XDG hai cách viết. | Cài cũ biến manh; hoặc người dùng mới bị đẩy vào `.omp` |
| `packages/utils/test/install-id-legacy-read.test.ts` (mới) | Cắm UUID vào đường legacy, phân giải với root mới rỗng → **chính UUID đó** quay lại **và** root mới giờ chứa nó | Bảng chi phí lặng lẽ khởi động lại. Đây là hồi quy không tạo ra lỗi nào |
| `packages/utils/test/config-dir-write-root.test.ts` (mới) | Hợp đồng 3: cả hai root tồn tại → đọc vào legacy, ghi vào mới. Hợp đồng 4: `PI_CONFIG_DIR`=A + `ULTRAWORKERS_CONFIG_DIR`=B → ra B; bỏ biến mới → ra A; bỏ cả hai → rơi vào tập ứng viên | Đặt nhầm hai biến → chỉ người dùng tới thư mục rỗng, không in gì |
| `packages/utils/test/install-id.test.ts` (đã có) | **PASS KHÔNG ĐỔI** | Lưới hồi quy: chứng minh việc nối lại resolver không phá hợp đồng single-root |

Luật áp dụng: `spyOn` + `vi.restoreAllMocks()` trong `afterEach`; **không** `mock.module()`; **không** đột biến `process.env` sống lâu. Khẳng định đường dẫn đã phân giải / UUID trả về / byte trên đĩa — không đọc file cài đặt rồi khẳng định lại trên văn bản của nó.

---

## 6. Cổng

Chạy từ thư mục gốc repo.

```bash
# Tiền đề: addon đã build trên máy này (packages/natives/native/pi_natives.darwin-arm64.node tồn tại,
# `which ninja` -> /opt/homebrew/bin/ninja). Nếu build trên máy mới:
#   brew install ninja && bun --cwd=packages/natives run build
bun run check:ts
bun run check:rs
cd packages/utils && bun test ./test/config-dir-dual-root.test.ts ./test/install-id-legacy-read.test.ts ./test/config-dir-write-root.test.ts
cd ../.. && bun test ./packages/utils/test/install-id.test.ts ./packages/utils/test/profiles.test.ts ./packages/utils/test/dirs-python-gateway.test.ts ./packages/coding-agent/test/discovery/pi-config-dir.test.ts ./packages/coding-agent/test/marketplace/project-scope.test.ts
```

### Cổng này CÓ ĐỎ ĐƯỢC KHÔNG? — **Có, đã chạy thật**

| Kiểm chứng | Kết quả thực tế ở `47720fd` |
| --- | --- |
| File-missing vs file-thật | `bun test ./test/config-dir-dual-root.test.ts` (chưa tồn tại) → **EXIT=1**; `bun test ./test/install-id.test.ts` (thật) → **EXIT=0**. Lệnh phân biệt được "chưa cài" với "đã cài và xanh" |
| `bun run check:ts` | **exit 0** |
| `bun test packages/utils/test/install-id.test.ts` | **5 pass / 0 fail / 11 expect()** |
| `bun test ./test/dirs-python-gateway.test.ts` | **2 pass / 0 fail** |
| Toàn bộ `packages/utils` | **743 pass / 10 skip / 0 fail** (753 test, 80 file, 15.5s) |
| `pi-config-dir.test.ts` | **4 pass / 0 fail** |
| `marketplace/project-scope.test.ts` | **7 pass / 0 fail** |

**Năm cơ chế làm cổng đỏ** (đặc tả nêu là dự kiến; dưới đây đã đối chiếu lại với cây thật):

- (a) `getInstallId()` sinh UUID mới thay vì đọc legacy → hợp đồng (2) đỏ.
- (b) Ba hàm rebuild không gọi reset cache → tám file test gán `PI_CONFIG_DIR` lúc chạy đọc root đóng băng và đỏ. **Đã xác nhận cả 8 file tồn tại và đều gán env lúc chạy**: `coding-agent/test/discovery/pi-config-dir.test.ts:14`, `coding-agent/test/profile-cli.test.ts:57`, `coding-agent/test/sdk-session-isolation.test.ts:64`, `stats/test/helpers/temp-agent.ts:44`, `tui/test/keybindings-migration.test.ts:247`, `utils/test/dirs-python-gateway.test.ts:40`, `utils/test/install-id.test.ts:31`, `utils/test/profiles.test.ts:65`.
- (c) Bốn chỗ `helpers.ts:1032/1034/1049/1079` còn gọi `getConfigDirName()` → `project-scope.test.ts` đỏ. **Negative control đúng là cố ý để lại một trong bốn chỗ**, không phải lật `getConfigWriteRootName()`.
- (d) Dùng chung một tập ứng viên cho home (có dấu chấm) và XDG (trần) → hợp đồng (1) đỏ, **nhưng chỉ khi `XDG_*_HOME` được đặt**.
- (e) Bỏ qua hai file Rust → **không test nào đỏ**. Đường này không có test harness; phải đọc hai hunk.

### Phát hiện quan trọng về tính đỏ được của cổng — **đã chạy thật, probe sống-đối-lập-đóng-băng**

Đặt `process.env.PI_CONFIG_DIR = ".probe-a"` **sau** khi import rồi đọc accessor:

```
getConfigDirName()      = ".probe-a"                    // sống
getBaseConfigRoot()     = "/Users/.../.probe-a"         // sống
getConfigRootDir()      = "/Users/.../.omp"             // ĐÓNG BĂNG
getConfigAgentDirName() = ".probe-a/agent"              // sống
```

Đây là bằng chứng thực thi cho bước 6: module **đã** chứa hai hành vi đối nghịch. `getConfigRootDir()` (`:507`) trả `dirs.configRoot`, được dựng lúc nạp module ở `:459`. Bất kỳ cache nào thêm vào tên config-root mà không được xoá ở bốn đường rebuild sẽ tạo ra loại hỏng thứ ba.

---

## 7. Cạm bẫy riêng của W4

### 7.1. Bẫy lớn nhất: `getConfigWriteRootName()` trả về tên **chưa tồn tại**

Sau W4 mà chưa W6, `CONFIG_DIR_NAME` vẫn là `".omp"` (`dirs.ts:28`). Nếu kỹ sư viết `return CONFIG_DIR_NAME;` — dù chỉ một dòng, dù "đúng" về mặt DRY — thì write root **bằng đúng** tên legacy, hợp đồng (3) và (4) đỏ, và **không có gì trong bộ test cũ đỏ**. Đây chính là cái bẫy mà đặc tả gọi là "sai lầm làm W6 không còn gì để review", nhưng ở dạng nguy hiểm hơn: lật sớm thì lộ, trả về hằng hiện tại thì **âm thầm**. Write root phải là **literal tên tương lai**, không phải hằng đang tồn tại.

### 7.2. `getConfigRootDir()` không tự đi theo — năm đường ghi vẫn rơi vào root cũ

`getConfigRootDir()` (`:507`) **không** gọi `getBaseConfigRoot()` lúc chạy; nó trả `dirs.configRoot`, đã đóng băng từ lúc nạp module. Đặc tả bước 7 chỉ nói tách `getBaseConfigRoot()` — điều đó **không** di chuyển `getConfigRootDir()`. Năm call site sau đều là **đường ghi** và sẽ tiếp tục ghi vào root legacy nếu không xử lý riêng:

| Call site | Việc |
| --- | --- |
| `packages/ai/src/auth-broker/discover.ts:57` | ghi `auth-broker.token` |
| `packages/coding-agent/src/cli/auth-broker-cli.ts:87` | ghi `auth-broker.token` |
| `packages/coding-agent/src/cli/auth-gateway-cli.ts:73` | ghi `auth-gateway.token` |
| `packages/coding-agent/src/collab/guest.ts:449` | ghi replica phòng collab |
| `packages/stats/src/db.ts:119` | `mkdir` config root |

(Chỉ `packages/utils/src/env.ts:289` là đường đọc.) **Đặc tả không nói W4 phải làm gì với năm chỗ này.** Đây là lỗ hổng thật: sửa xong W4, người dùng vẫn thấy session/token ghi vào `~/.omp` trong khi `omp` nghĩ nó đang ghi vào `~/.ultraworkers`. Hoặc đưa chúng qua write root, hoặc ghi rõ ra rằng W6 xử lý — nhưng phải là một quyết định, không phải im lặng.

### 7.3. Ba tên cho một thứ, và cái thứ ba đã hoạt động một cách nửa vời

`parseEnvFile` tại `packages/utils/src/env.ts:277-282` mirror **mọi** khoá `OMP_*` sang `PI_*`. Nghĩa là `OMP_CONFIG_DIR` trong một file `.env` **đã** hoạt động như bí danh của `PI_CONFIG_DIR` ngày hôm nay — nhưng chỉ trong `.env`, **không** phải biến shell thật (`git grep 'OMP_CONFIG_DIR'` → 0 hit trong mã). `docs/environment-variables.md:25` mô tả cơ chế mirror nhưng không nói giới hạn "trong .env". Tên `ULTRAWORKERS_CONFIG_DIR` **không** tham gia mirror (chỉ `OMP_` mới được mirror). Hệ quả: sau W4 sẽ có **ba** tên trỏ cùng một chỗ, một trong số đã hoạt động theo cách khác với hai cái kia. Bước 15 nên nói rõ phạm vi này; nếu không, tài liệu sẽ mô tả ba bí danh trong khi mã chỉ đọc hai.

### 7.4. Xung đột sở hữu `docs/environment-variables.md` với W13

W13 (kế hoạch dòng 3886, 3908, 4482) sẽ viết lại **cùng file đó**: sửa dòng 25 và thêm cột `New name` vào 29 bảng. Dòng 4482 của kế hoạch đã ghi sẵn rằng W4 và W13 cùng sửa một file. Hợp đồng hai chiều của W13 (theo `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:16934`): không được có `ULTRAWORKERS_*` trong mã mà không có dòng trong doc, và ngược lại. W4 phải làm **cả hai** cùng commit.

### 7.5. Bẫy nền tảng: `darwin.rs` không bao giờ chạy trên CI Linux

Đường OAuth recovery chỉ chạy macOS. CI Linux xanh **không** có nghĩa hunk đó đúng. Nói thẳng trong PR thay vì ám chỉ một lần chạy xanh đã phủ nó.

### 7.6. Bẫy ngôn ngữ: hai tập ứng viên khác nhau

```
home:  ['.ultraworkers', '.omp']   // có dấu chấm, từ CONFIG_DIR_NAME
xdg:   ['ultraworkers',  'omp']    // trần, từ path.join(value, APP_NAME)
```

Dùng chung một tập là sai đúng với một trong hai. Thêm nữa, tập XDG chỉ được nhìn thấy khi `XDG_*_HOME` được đặt **và** `dirs.ts:363` kiểm tra `process.platform === "linux" || "darwin"`.

### 7.7. Sai lệch số dòng đã loang

21 trong 26 neo của `dirs.ts` lệch (+1 đến +20, không đều). Đừng tin số dòng trong bất kỳ tài liệu kế hoạch nào cho file này — `grep -n` theo tên symbol rồi đọc. Riêng `darwin.rs:446` trong đặc tả chỉ sai 2 dòng, đủ để sửa nhầm `.home` thay vì `.unwrap_or(".omp")`.

### 7.8. Cạm bẫy lấn tay với W5/W6

Không lật `CONFIG_DIR_NAME` (W6 sở hữu). Không di chuyển thư mục (W5 sở hữu `config migrate`).

---

## 8. Câu hỏi chặn phải hỏi trước khi gõ dòng đầu tiên

1. **Tên mới chính xác là gì?** `dirs.ts:22` vẫn là `"omp"`, W3 chưa merge. Không có tên thì không có write root.
2. **`getConfigRootDir()` đi đâu?** Năm đường ghi ở mục 7.2 — trong W4 hay để W6? Im lặng ở đây là một lỗi âm thầm.
3. **Cache sống suốt tiến trình hay bị ép làm lại?** Với cache suốt tiến trình, `config migrate` (W5) dời `~/.omp` → `~/.ultraworkers` sẽ để lại tiến trình đang chạy trỏ tới thư mục không còn tồn tại. Vô hại với lệnh một-lần, nhưng phải là quyết định được nói ra.
