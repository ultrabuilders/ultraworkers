# Phiếu triển khai — W6. Lật `CONFIG_DIR_NAME` (sóng 2)

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md:1395` (mục `## W6. Lật CONFIG_DIR_NAME (sóng 2)`)
**HEAD khi rà soát:** `47720fd` (nhánh `milestone-1`) — `git rev-parse --short HEAD`
**Ngày rà soát:** 2026-09-29
**Nguồn:** toàn bộ neo của W6 trỏ vào chính cây `omp` này (`packages/utils/`,
`packages/coding-agent/`). Đã kiểm 7 cây tham chiếu: không cây nào có
`packages/coding-agent/src/modes/controllers/omfg-controller.ts`. Chỉ
`gajae-ref` có `packages/utils/src/dirs.ts` (riêng, không phải hàng nguồn của neo này).
→ **Không có neo nào cần mở ở cây tham chiếu.**

---

## 0. Tóm tắt điều tra — ba kết quả làm thay đổi bản chất công việc

1. **Có một lần đọc project-root thứ NĂM mà W6 không biết, và nó không nằm ở
   `helpers.ts:47`** — nó nằm ở `discovery/helpers.ts:1032, 1034, 1049, 1079`, dùng
   `getConfigDirName()` (getter HOME root) để dựng đường dẫn **project root**.
   Cổng grep mà W6 tự định nghĩa (`git grep -n 'CONFIG_DIR_NAME'`) **về nguyên tắc
   không thể thấy nó**, vì nó không chứa chuỗi `CONFIG_DIR_NAME`.
2. **Ma trận cổng đã đo thật**, mỗi site một lần quên (bảng ở mục 6). Kết quả:
   W6 đo **sai** hai claim của mình — site `helpers.ts:47` **có** cổng đỏ mạnh
   (10 test), và site `config.ts:12` **hoàn toàn không có** cổng đỏ nào (0 test).
3. **Baseline đã sạch:** 113 pass / 0 fail trên 9 file cổng. Nên mọi failure nào
   xuất hiện sau khi sửa đều do chính W6, không phải nợ cũ.

---

## 1. Cái gì thay đổi, quan sáng được

Khi bạn cài omp lần này, config, session và setting **mới** của bạn được ghi vào
`~/.ultraworkers` thay vì `~/.omp`; nếu máy bạn chỉ còn `~/.omp` thì bạn giữ nguyên
mọi session, setting và install-id và **không thấy lỗi nào**. Đồng thời, mọi thư mục
`.omp` cấp project đã commit trong repo của bạn — rules, skills, agents, hooks,
commands, `mcp.json`, plugin registry — **vẫn phân giải về đúng thư mục `.omp` đó,
không đổi một byte**. Thứ bạn không bao giờ thấy là lỗi mà toàn bộ công việc này sinh
ra để ngăn: không dòng lỗi, không cảnh báo thiếu config, chỉ là đăng nhập lại âm
thầm vì thư mục project của bạn không còn được tìm thấy.

---

## 2. VIỆC 1 — Kiểm lại từng neo

Tất cả dưới đây tôi đã mở và đọc bằng `sed -n "<n>p"` / `rg -n`. **38 neo trong các
mục 2.1-2.7: 23 đúng nguyên văn, 15 hỏng** (đã tìm lại vị trí đúng cho từng cái;
trong 15 cái hỏng có **1 là file không tồn tại**). Mục 2.8 là 5 dòng tiền đề môi
trường, tính riêng.

> **Lưu ý đầu tiên:** W6 ghim `1454dc0` làm điều kiện tiên quyết. HEAD thật là
> `47720fd`. `packages/utils/src/dirs.ts` đã **trượt 10 dòng** (1177 dòng, không phải
> ~1167) vì các commit sau đó thêm nội dung ở phía trên. **Mọi neo `dirs.ts` trong
> W6 đều lệch.** Đừng gõ theo số dòng của W6.

### 2.1. `packages/utils/src/dirs.ts` — toàn bộ hỏng, lệch +1 đến +10

| Neo W6 | Lệnh kiểm | Kết quả thật | Verdict |
| --- | --- | --- | --- |
| `:27` = `CONFIG_DIR_NAME` | `sed -n '28p'` | `export const CONFIG_DIR_NAME: string = ".omp";` | **HỎNG — dòng 28** |
| `:589-591` = `getProjectAgentDir` | `sed -n '599,601p'` | `export function getProjectAgentDir(cwd: string = getProjectDir()): string {` / `return path.join(cwd, CONFIG_DIR_NAME);` / `}` | **HỎNG — 599-601** |
| `:590` = phép join | `grep -n` | dòng **600** | **HỎNG — dòng 600** |
| `:297-298` = `getConfigDirName` | `sed -n '307,308p'` | `export function getConfigDirName(): string {` / `return process.env.PI_CONFIG_DIR \|\| CONFIG_DIR_NAME;` | **HỎNG — 307-308** |
| `:360` = join XDG | `grep -n 'path.join(value, APP_NAME)'` | dòng **370** (`const appRoot = path.join(value, APP_NAME);`) | **HỎNG — dòng 370** |
| `:24` = `APP_URL` | `sed -n '25p'` | `export const APP_URL: string = "https://omp.sh/";` | **HỎNG — dòng 25** |
| `:36` = `USER_AGENT` | `sed -n '37p'` | `export const USER_AGENT = \`omp/${VERSION}\`;` | **HỎNG — dòng 37** |
| (W6 không nhắc) `APP_NAME` | `sed -n '22p'` | `export const APP_NAME: string = "omp";` | ghi để W3 |

Docblock đi kèm dòng 28 cũng phải sửa, W6 không nhắc:
`sed -n '27p'` → `/** Config directory name (e.g. ".omp") */` — nó **tự mâu thuẫn**
sau khi hằng số lật.

### 2.2. `packages/coding-agent/src/modes/controllers/omfg-controller.ts` — đúng cả 3

| Neo W6 | Lệnh kiểm | Kết quả thật | Verdict |
| --- | --- | --- | --- |
| `:2` import | `sed -n '2p'` | `import { CONFIG_DIR_NAME, prompt } from "@oh-my-pi/pi-utils";` | **ĐÚNG** |
| `:285` rules path | `sed -n '285p'` | `			filePath: path.join(this.ctx.sessionManager.getCwd(), CONFIG_DIR_NAME, "rules", \`${ruleName}.md\`),` | **ĐÚNG** |
| `:38` literal | `sed -n '38p'` | `const PROJECT_OPTION = "This project (.omp/rules)";` | **ĐÚNG** |

`#resolveTarget` mở đầu ở dòng **277**, thân hàm 284-288. W6 viết "283-288" trong
khối code shape — lệch 1, không nguy hiểm.

### 2.3. `packages/coding-agent/src/discovery/helpers.ts` — `:47` đúng, nhưng thiếu 4 dòng nữa

| Neo W6 | Lệnh kiểm | Kết quả thật | Verdict |
| --- | --- | --- | --- |
| `:6` import | `sed -n '6p'` | `	CONFIG_DIR_NAME,` (specifier trên dòng 12) | **ĐÚNG** |
| `:47` `projectDir` | `sed -n '47p'` | `		projectDir: CONFIG_DIR_NAME,` trong `SOURCE_PATHS.native` | **ĐÚNG** |
| — | `git grep -n 'getConfigDirName()' -- 'packages/*/src/**/*.ts'` | 6 hit: `42`, `45` (HOME root, đúng) + **`1032`, `1034`, `1049`, `1079` (PROJECT root, SAI)** | **THIẾU 4 DÒNG** |

Đây là phát hiện lớn nhất của phiếu này. Mục 3 giải thích.

### 2.4. `packages/coding-agent/src/config.ts` — đúng

| Neo W6 | Lệnh kiểm | Kết quả thật | Verdict |
| --- | --- | --- | --- |
| `:12` | `sed -n '12p'` | `	{ dir: CONFIG_DIR_NAME, globalAgentDir: getConfigAgentDirName },` | **ĐÚNG** |
| `:84-87` `USER_CONFIG_BASES` | `sed -n '84,87p'` | `const USER_CONFIG_BASES = priorityList.map(({ dir, globalAgentDir }) => ({` | **ĐÚNG** |
| `:90-93` `PROJECT_CONFIG_BASES` | `sed -n '90,93p'` | `const PROJECT_CONFIG_BASES = priorityList.map(({ dir }) => ({` | **ĐÚNG** |
| `:147-149` | `sed -n '147,149p'` | `for (const { base, name } of PROJECT_CONFIG_BASES) {` | **ĐÚNG** |
| `:224-232` | `sed -n '224,246p'` | `while (foundBases.size < PROJECT_CONFIG_BASES.length) {` … hết hàm ở 246 | **ĐÚNG (xấp xỉ)** |

`config.ts:135` (`if (name !== CONFIG_DIR_NAME && …)`) là **phép so sánh** home-root,
giữ nguyên `CONFIG_DIR_NAME` — không phải call site cần trỏ lại.

### 2.5. Test file

| Neo W6 | Lệnh kiểm | Kết quả thật | Verdict |
| --- | --- | --- | --- |
| `legacy-pi-cli-exports.test.ts:14` | `sed -n '14p'` | `		expect(CONFIG_DIR_NAME).toBe(".omp");` | **ĐÚNG** |
| `omfg-controller.test.ts:15` | `sed -n '15p'` | `const PROJECT_OPTION = "This project (.omp/rules)";` | **ĐÚNG** |
| `omfg-controller.test.ts:178` | `sed -n '178p'` | `…toBe(false)` — assertion phủ định | **ĐÚNG** |
| `omfg-controller.test.ts:198` | `sed -n '198p'` | `		const rulesDir = path.join(harness.projectDir, ".omp", "rules");` | **ĐÚNG** |
| `omfg-controller.test.ts:216` | `sed -n '216p'` | `		expect(await Bun.file(savedRuleFile).exists()).toBe(true);` | **ĐÚNG** |
| `agent-session-rules-reload.test.ts:89,156` | `grep -n '\.omp'` | 89, 156 (86 là comment) | **ĐÚNG** |
| `pi-config-dir.test.ts:38` | `sed -n '38p'` | `		expect(result[0]).toEqual({ path: expected, source: ".omp", level: "user" });` | **ĐÚNG** |
| `system-prompt-template.test.ts:42,111,126` | `grep -n 'CONFIG_DIR_NAME'` | 42, 111, 126 | **ĐÚNG** |
| `sdk-system-prompt-template.test.ts:23` | `grep -n 'CONFIG_DIR_NAME'` | 23 | **ĐÚNG** |
| `agent-session-concurrent.test.ts:1630` | `grep -n '\.omp'` | dòng **1597** | **HỎNG — 1597** |
| `advisor-toggle.test.ts:268,272` | `grep -n 'getProjectAgentDir'` | dòng **262, 266** | **HỎNG — 262/266** |
| `extensions-discovery.test.ts:23` | `grep -n 'getProjectAgentDir'` | 23 | **ĐÚNG** |
| `extensions-discovery.test.ts:149,747,767,792` | `grep -n 'getProjectAgentDir'` | **136, 651, 671, 696** | **HỎNG** |
| `test/discovery/monorepo-skills.test.ts` | `ls packages/coding-agent/test/discovery/` | **KHÔNG TỒN TẠI** | **HỎNG — xem 2.6** |

### 2.6. File được W6 dẫn vào cổng nhưng không tồn tại

`packages/coding-agent/test/discovery/monorepo-skills.test.ts` → `No such file or directory`.
File gần nhất là `agents-monorepo-skills.test.ts`, nhưng nó có **0 literal `.omp`** và
**0 hit `SOURCE_PATHS`** — nó **không** phủ site `helpers.ts:47`. W6 dùng nó làm
"phủ thật" của site đó; phủ thật thực tế là ba file khác (mục 6).

### 2.7. Vị trí file khác

| Neo W6 | Lệnh kiểm | Kết quả thật | Verdict |
| --- | --- | --- | --- |
| `discovery/builtin.ts:44` | `sed -n '44p'` | `const PATHS = SOURCE_PATHS.native;` | **ĐÚNG** |
| `discovery/skillshare.ts:93` | `sed -n '93p'` | `		loadLock(path.join(dir, SOURCE_PATHS.native.projectDir, SKILLS_LOCK_FILE), "project", warnings),` | **ĐÚNG** |
| `custom-commands/loader.ts:110` | `sed -n '110p'` | `	for (const entry of getConfigDirs("commands", { cwd, existingOnly: true })) {` | **ĐÚNG** |
| `legacy-pi-coding-agent-shim.ts:1587-1591` docblock | `sed -n '1596,1600p'` | `// Same barrel gap for two more legacy package-root exports: pi re-exported the` … | **HỎNG — 1596-1600** |
| shim `:1592` = export | `grep -n 'export { CONFIG_DIR_NAME }'` | dòng **1601** | **HỎNG — 1601** |
| `package.json:94-95` (`check:ts`) | `grep -n '"check' package.json` | `"check"` @ **89**, `"check:ts"` @ **90**, `"check:rs"` @ **92** | **HỎNG** |
| `package.json:93-94` (`check`) | như trên | dòng **89** | **HỎNG** |

### 2.8. Tiền đề môi trường

| Kiểm | Kết quả | Verdict |
| --- | --- | --- |
| `ls packages/natives/native/pi_natives.darwin-arm64.node` | tồn tại, 185 MB | **ĐÚNG** — addon đã build, cổng `coding-agent` chạy thật |
| `ls packages/utils/test/config-dir-dual-root.test.ts` (+2 file W4) | cả 3 `MISSING` | **ĐÚNG** — W4 chưa bàn giao, cổng phải đỏ |
| `ls scripts/rename` | `No such file or directory` | **ĐÚNG** |
| `git rev-parse --short HEAD` | `47720fd` (W6 ghim `1454dc0`) | **HỎNG** |
| `bun run check:ts` | `EXIT=0` | **ĐÚNG** |

**Mâu thuẫn nội bộ của plan về `do_not_rename.tsv`:** W6 viết "§2.3 của plan định nghĩa
`do_not_rename` là bảng 17 dòng nhưng không ghim đường dẫn file nào". **Sai.** Bảng
`## do_not_rename` của chính plan (`MILESTONE_5_EXECUTION_PLAN.md:117`) **có** ghim
`scripts/rename/do_not_rename.tsv` với trạng thái `[create,UNVERIFIED]`. Nhưng cùng
plan đó (`:265`) liệt kê câu hỏi *"do_not_rename.tsv hay keep-list.txt: một hay hai
file"* là câu hỏi mở **chặn trước sóng 2** — mà W6 nằm trong sóng 2. Thêm nữa, cả
ba GATE 0 của W7/W8a/W8b đều kiểm `keep-list.txt`, **không** kiểm `do_not_rename.tsv`.
→ Nếu bạn tạo `do_not_rename.tsv` mà không có quyết định, **không GATE 0 nào xanh**,
và lượt `sed` của W7 nạp `keep-list.txt` sẽ không thấy hàng N14 của bạn.

---

## 3. Phát hiện lớn: lần đọc project-root thứ NĂM

W6 nói có **BỐN** lần đọc project-root. Có **NĂM**. Lần thứ năm không nằm ở
`helpers.ts:47` mà ở `helpers.ts:1032, 1034, 1049, 1079`, và nó dùng
`getConfigDirName()` — **getter HOME root** — để dựng đường dẫn project root:

```typescript
// packages/coding-agent/src/discovery/helpers.ts:1025-1055
export async function resolveActiveProjectRegistryPath(cwd: string): Promise<string | null> {
	// Pass 1: walk up looking for an existing .omp/ directory (nearest wins).
	// Stop before os.homedir() — ~/.omp/ is the user-level config dir, not a project root.
	const homeDir = os.homedir();
	let dir = path.resolve(cwd);
	while (dir !== homeDir) {
		try {
			const stat = await fs.promises.stat(path.join(dir, getConfigDirName()));   // ← 1032
			if (stat.isDirectory()) {
				return path.join(dir, getConfigDirName(), "plugins", "installed_plugins.json");  // ← 1034
			}
		} catch { /* not found at this level — continue up */ }
		...
	}
	// Pass 2: walk up looking for .git as a fallback anchor.
	dir = path.resolve(cwd);
	while (dir !== homeDir) {
		try {
			await fs.promises.stat(path.join(dir, ".git"));
			return path.join(dir, getConfigDirName(), "plugins", "installed_plugins.json");  // ← 1049
		} catch { ... }
	}
```

và `resolveOrDefaultProjectRegistryPath` tại dòng **1079**:

```typescript
	if (path.resolve(cwd) === os.homedir()) return undefined;
	return path.join(cwd, getConfigDirName(), "plugins", "installed_plugins.json");   // ← 1079
```

**Tại sao điều này nguy hiểm hơn ba site kia.** `resolveActiveProjectRegistryPath` là
"single source of truth for active project root" (docblock tại 1012-1024) — nó cấp
`install`, `uninstall`, `list`, `upgrade`, `discovery`, `doctor`. Sau khi lật:

- **3 test trả về `null`** — project root không được tìm thấy → plugin đã cài ở cấp
  project biến mất im lặng.
- **1 test trả về `<tmp>/.ultraworkers/plugins/installed_plugins.json`** — tệ hơn nhiều:
  resolver **đi lên tới `~/.ultraworkers`** và trả chính registry của HOME làm
  registry của project. Đây đúng là cái alias mà docblock tại 1075-1077 cảnh báo
  ("producing duplicates / disambiguation errors"). Tức là W6, nếu bỏ sót site 5,
  **không chỉ mất dữ liệu — nó tạo ra alias hai registry mà chính code này đã được
  viết để tránh.**
- `listClaudePluginRoots` gọi hàm đó ở dòng **1145** rồi dựng `projectRoot` từ kết
  quả ở dòng **1146** → project entry bị bóp méo, 1 test đỏ.

**Và cổng grep của W6 không bao giờ thấy nó.** Cổng 5 của W6 là
`git grep -n 'CONFIG_DIR_NAME' -- 'packages/**/*.ts'`. Bốn dòng này chứa
`getConfigDirName()`, không chứa `CONFIG_DIR_NAME`. Cổng đó sẽ xanh trong khi bug
đã vào. Phải thay bằng cổng ở mục 6.

---

## 4. Bảng điểm sửa

Trước cột TRƯỚC: mọi trích dẫn lấy từ file thật ở `47720fd`, đã `sed -n` từng dòng.

| # | Đường dẫn | Symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- | --- |
| 1 | `packages/utils/src/dirs.ts:27-28` | `CONFIG_DIR_NAME` + docblock | `/** Config directory name (e.g. ".omp") */`<br>`export const CONFIG_DIR_NAME: string = ".omp";` | `/** Config directory name (e.g. ".ultraworkers") */`<br>`export const CONFIG_DIR_NAME: string = ".ultraworkers";` |
| 2 | `packages/utils/src/dirs.ts` (ngay sau 28) | `PROJECT_DIR_NAME` **mới** | — không tồn tại | `export const PROJECT_DIR_NAME: string = ".omp";` kèm docblock nói rõ cố ý KHÔNG derive từ `CONFIG_DIR_NAME` |
| 3 | `packages/utils/src/dirs.ts:600` | `getProjectAgentDir` | `	return path.join(cwd, CONFIG_DIR_NAME);` | `	return path.join(cwd, PROJECT_DIR_NAME);` |
| 4 | `packages/coding-agent/src/modes/controllers/omfg-controller.ts:2` | import | `import { CONFIG_DIR_NAME, prompt } from "@oh-my-pi/pi-utils";` | `import { PROJECT_DIR_NAME, prompt } from "@oh-my-pi/pi-utils";` |
| 5 | `…/omfg-controller.ts:285` | `#resolveTarget` | `			filePath: path.join(this.ctx.sessionManager.getCwd(), CONFIG_DIR_NAME, "rules", \`${ruleName}.md\`),` | `			filePath: path.join(this.ctx.sessionManager.getCwd(), PROJECT_DIR_NAME, "rules", \`${ruleName}.md\`),` |
| 6 | `packages/coding-agent/src/discovery/helpers.ts:6` | import | `	CONFIG_DIR_NAME,` | `	PROJECT_DIR_NAME,` |
| 7 | `…/discovery/helpers.ts:47` | `SOURCE_PATHS.native.projectDir` | `		projectDir: CONFIG_DIR_NAME,` | `		projectDir: PROJECT_DIR_NAME,` |
| **8** | **`…/discovery/helpers.ts:1032`** | `resolveActiveProjectRegistryPath` | `			const stat = await fs.promises.stat(path.join(dir, getConfigDirName()));` | `			const stat = await fs.promises.stat(path.join(dir, PROJECT_DIR_NAME));` |
| **9** | **`…/discovery/helpers.ts:1034`** | `resolveActiveProjectRegistryPath` | `				return path.join(dir, getConfigDirName(), "plugins", "installed_plugins.json");` | `				return path.join(dir, PROJECT_DIR_NAME, "plugins", "installed_plugins.json");` |
| **10** | **`…/discovery/helpers.ts:1049`** | `resolveActiveProjectRegistryPath` (pass 2) | `			return path.join(dir, getConfigDirName(), "plugins", "installed_plugins.json");` | `			return path.join(dir, PROJECT_DIR_NAME, "plugins", "installed_plugins.json");` |
| **11** | **`…/discovery/helpers.ts:1079`** | `resolveOrDefaultProjectRegistryPath` | `	return path.join(cwd, getConfigDirName(), "plugins", "installed_plugins.json");` | `	return path.join(cwd, PROJECT_DIR_NAME, "plugins", "installed_plugins.json");` |
| 12 | `packages/coding-agent/src/config.ts:4` | import | `import { CONFIG_DIR_NAME, getConfigAgentDirName, getProjectDir } from "@oh-my-pi/pi-utils";` | thêm `PROJECT_DIR_NAME` vào danh sách (giữ `CONFIG_DIR_NAME` — dòng 135 vẫn cần) |
| 13 | `packages/coding-agent/src/config.ts:11-16` | `priorityList` | `const priorityList = [`<br>`	{ dir: CONFIG_DIR_NAME, globalAgentDir: getConfigAgentDirName },`<br>`	{ dir: ".claude" },` … | Tách: `USER_PRIORITY` (giữ `{ dir: CONFIG_DIR_NAME, globalAgentDir: getConfigAgentDirName }` + `.claude`/`.codex`/`.gemini`) và `PROJECT_PRIORITY` (`PROJECT_DIR_NAME`, `.claude`, `.codex`, `.gemini`) |
| 14 | `packages/coding-agent/src/config.ts:84` | `USER_CONFIG_BASES` | `const USER_CONFIG_BASES = priorityList.map(({ dir, globalAgentDir }) => ({` | `.map` trên `USER_PRIORITY` |
| 15 | `packages/coding-agent/src/config.ts:90` | `PROJECT_CONFIG_BASES` | `const PROJECT_CONFIG_BASES = priorityList.map(({ dir }) => ({` | `.map` trên `PROJECT_PRIORITY` |
| 16 | `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts:14` | assertion | `		expect(CONFIG_DIR_NAME).toBe(".omp");` | import shim thành `SHIM_CONFIG_DIR_NAME` + import `CONFIG_DIR_NAME, PROJECT_DIR_NAME` từ `@oh-my-pi/pi-utils`, rồi:<br>`		expect(SHIM_CONFIG_DIR_NAME).toBe(CONFIG_DIR_NAME);`<br>`		expect(SHIM_CONFIG_DIR_NAME).not.toBe(PROJECT_DIR_NAME);` |
| 17 | `packages/coding-agent/test/discovery/pi-config-dir.test.ts:38` | assertion | `		expect(result[0]).toEqual({ path: expected, source: ".omp", level: "user" });` | `		expect(result[0]).toEqual({ path: expected, source: CONFIG_DIR_NAME, level: "user" });` |
| 18 | `packages/utils/test/project-dir-name-pinned.test.ts` | **tạo mới** | — không tồn tại | xem mục 5.2 |
| 19 | `packages/utils/CHANGELOG.md:3` | `[Unreleased]` | `## [Unreleased]` rồi thẳng `## [18.3.1] - 2026-09-25` | thêm `### Changed` + một dòng entry (mục 5.3) |
| 20 | `scripts/rename/do_not_rename.tsv` | **tạo mới** | thư mục không tồn tại | **BỎ QUA — xem mục 7.1, chưa được tạo** |

**Dòng 8-11 không có trong W6.** Đó là toàn bộ nội dung mục 3.

**Hai dòng W6 không nêu nhưng phải sửa:** `dirs.ts:27` (docblock tự mâu thuẫn) và
`config.ts:135` phải **giữ nguyên** `CONFIG_DIR_NAME` — đây là phép so sánh
home-root, đổi nó sang `PROJECT_DIR_NAME` sẽ làm hỏng cờ bật/tắt user source.

---

## 5. Các bước, mỗi bước có neo đã kiểm

### 5.0 Cổng cứng: W4 và W5 phải xong trước

```bash
ls packages/utils/test/config-dir-dual-root.test.ts \
   packages/utils/test/install-id-legacy-read.test.ts \
   packages/utils/test/config-dir-write-root.test.ts
```

Hôm nay cả ba **không tồn tại** → W6 **chưa được bắt đầu**. Cho tới khi chúng có,
việc lật này không có đường quay lại dữ liệu người dùng.

**Không** chạy bước 1 của W6 (kiểm `HEAD == 1454dc0`) — HEAD thật là `47720fd` và
W6 tự nói phải chạy lại `grep` nếu dịch chuyển. Việc đó **đã xong**: mục 2.1 là kết
quả chạy lại đó. Dùng bảng ở mục 2, đừng dùng số dòng của W6.

### 5.1 Sửa theo thứ tự — thứ tự này là nghĩa vụ, không phải sở thích

Thứ tự của W6 ("lật hằng số SAU CÙNG") là đúng và phải giữ. Mở rộng thêm một ràng
nữa: **trỏ lại site 5 (mục 3) cùng đợt với site 3**, vì cùng một file, cùng một import,
và cùng một câu hỏi " cái này là home hay project".

1. `dirs.ts:28` — thêm `PROJECT_DIR_NAME = ".omp"` ngay dưới `CONFIG_DIR_NAME`,
   kèm docblock nói nó cố ý **không** derive từ `CONFIG_DIR_NAME`, thư mục này
   thường đã commit vào repo người dùng, và đổi tên nó là viết lại working tree của
   họ chứ không phải đổi tên sản phẩm. Giữ docblock ngắn; lý do đầy đủ nằm ở
   `do_not_rename` N14.
2. `dirs.ts:600` — `getProjectAgentDir` trả `PROJECT_DIR_NAME`. Chữ ký và tham số
   mặc định **giữ nguyên**.
3. `omfg-controller.ts:2` + `:285` — import + `#resolveTarget` sang `PROJECT_DIR_NAME`.
   **Đã kiểm:** `const PROJECT_OPTION = "This project (.omp/rules)"` ở dòng 38 là
   literal, KHÔNG dựng từ hằng số → giữ nguyên `.omp`. Dán câu này vào commit message.
4. `discovery/helpers.ts:6`, `:47`, **`:1032`, `:1034`, `:1049`, `:1079`** — tất cả
   sang `PROJECT_DIR_NAME`. **Giữ nguyên** `getConfigDirName()` ở dòng **42** và
   **45** (getter `userBase`/`userAgent` — HOME root, phải đi theo cơ chế phân giải
   ứng viên của W4). Sự bất đối xứng này **là** toàn bộ thiết kế.
5. `config.ts:4`, `:11-16`, `:84`, `:90` — tách `priorityList` thành hai danh sách.
   Giữ `CONFIG_DIR_NAME` trong `USER_PRIORITY` và trong phép so sánh dòng 135.
6. **Chỉ bây giờ** lật `dirs.ts:28` thành `".ultraworkers"` (và sửa docblock 27).
7. Sửa hai test (dòng 16, 17 của bảng mục 4).
8. `packages/utils/CHANGELOG.md` — thêm entry.
9. Viết test mới (mục 5.2).

### 5.2 `packages/utils/test/project-dir-name-pinned.test.ts`

Theo đúng quy ước `packages/utils/test/dirs.test.ts` (đã đọc): `bun:test`,
`TempDir`/`fs.mkdtemp`, `afterEach(() => vi.restoreAllMocks())`, **không**
`mock.module()`, **không** mutate `process.env` bằng file-wide hook, **không**
source-grep.

Hai case, và **case thứ hai là toàn bộ giá trị của test**:

1. `PROJECT_DIR_NAME` được ghim `".omp"` và **đã phân kỳ** với `CONFIG_DIR_NAME`:
   ```typescript
   expect(PROJECT_DIR_NAME).toBe(".omp");
   expect(CONFIG_DIR_NAME).not.toBe(PROJECT_DIR_NAME);
   ```
   Nếu hai hằng số bao giờ trở lại bằng nhau, có ai đó đã lật cả project root.
2. Tạo **CẢ HAI** trong cùng một project tạm: một thư mục `.omp/rules` **và** một
   thư mục tên theo `CONFIG_DIR_NAME` mới, rồi khẳng định `getProjectAgentDir()`
   phân giải về `.omp`. Thư mục thứ hai biến assertion thành một test **thứ tự ưu
   tiên** thật, không phải một phản chiếu hằng số.

Bổ sung khuyến nghị (không bắt buộc, nhưng đây là site đã hỏng một lần rồi): thêm
case thứ ba khẳng định `resolveActiveProjectRegistryPath()` vẫn trả
`<project>/.omp/plugins/installed_plugins.json` khi project chỉ có `.omp`.
`@oh-my-pi/pi-utils` không export hàm này ( nó thuộc `coding-agent`), nên case này
phải nằm ở `packages/coding-agent/test/discovery/project-registry-pinned.test.ts`.
`project-scope.test.ts` đã phủ nó, nhưng phủ gián tiếp — test riêng ghim ý định.

### 5.3 Changelog

`packages/utils/CHANGELOG.md` dòng 3 là `## [Unreleased]`, dòng 5 thẳng
`## [18.3.1] - 2026-09-25` — hiện `[Unreleased]` **rỗng**. Thêm:

```markdown
### Changed

- New config, sessions and settings are now written to ~/.ultraworkers instead of ~/.omp. Existing installs are read from both; run `omp config migrate` to move your data. Project-level .omp directories are unchanged and keep working.
```

Chưa có issue → thay `NNN` sau khi mở issue. **Đây là mục dễ quên nhất** vì nó trông
như việc nội bộ, nhưng nó đổi danh tính trên đĩa của người dùng.

---

## 6. Hợp đồng test và cổng

### 6.1 Ma trận cổng — ĐO THẬT, từng site một lần

Cách đo: baseline sạch trước, rồi lần lượt **bỏ sót đúng một site** (các site khác
đã trỏ đúng) và chạy 9 file cổng. Mọi thay đổi đã revert bằng `git checkout --`; cây
hiện sạch.

**Baseline (không sửa gì): `113 pass / 0 fail / 113 tests across 9 files`.**

| Site bị bỏ sót | Vị trí thật | Test đỏ **riêng cho site này** | Số |
| --- | --- | --- | ---: |
| — (không bỏ sót gì) | — | 0 | **0** |
| **Site 1** | `dirs.ts:600` `getProjectAgentDir` | `extensions-discovery.test.ts` × 4, `advisor-toggle.test.ts` × 1 | **5** |
| **Site 2** | `omfg-controller.ts:285` | `omfg-controller.test.ts` — "invalidates the discovery cache after saving" | **1** |
| **Site 3** | `discovery/helpers.ts:47` | `mcp-config-scope-dedup.test.ts` × 4, `agent-session-rules-reload.test.ts` × 4, `builtin-rules-md.test.ts` × 2 | **10** |
| **Site 4** | `config.ts:12` `priorityList` | **KHÔNG CÓ** | **0** |
| **Site 5** *(W6 không biết)* | `discovery/helpers.ts:1032,1034,1049,1079` | `project-scope.test.ts` — `resolveActiveProjectRegistryPath` × 4 + `listClaudePluginRoots` × 1 | **5** |
| *(không phải site)* | 2 test cần sửa theo | `pi-config-dir.test.ts:38`, `legacy-pi-cli-exports.test.ts:14` | 2 |

Sau khi trỏ đúng cả 5 site, chỉ còn đúng 2 failure — **hai test mà W6 đã nói phải
sửa**. Đó là bằng chứng ma trận là đủ.

**Ba đính chính so với W6, đo được:**

- **Claim (a) của W6 vượt quá thực tế.** W6 viết bỏ sót `dirs.ts:590` làm "hàng chục
  test project-scoped chuyển đỏ". **Đo: 5.**
- **Claim (c) của W6 SAI.** W6 viết bỏ sót `discovery/helpers.ts:47` thì "**không
  test nào trong danh sách cũ bắt được**", và phủ thật là `monorepo-skills.test.ts`
  (file không tồn tại), `builtin-rules-md`, `mcp-config-scope-dedup`,
  `pi-config-dir`. **Đo: 10 test đỏ** — `mcp-config-scope-dedup` × 4,
  `agent-session-rules-reload` × 4, `builtin-rules-md` × 2. Site 3 **có** cổng đỏ
  mạnh; W6 chỉ sai ở chỗ nó dùng nhầm file và dùng nhầm danh sách.
- **`config.ts:12` hoàn toàn không có cổng.** W6 có nghi vấn ("KHÔNG CÓ TRONG PLAN, VÀ
  CỔNG MỤC 5 SẼ TỰ THA TẦM NÓ") nhưng chưa đo. **Đo: 0 test đỏ.** Bỏ sót nó thì
  `getConfigDirs(..., { project: true })` âm thầm trả về `.ultraworkers` và không
  gì đỏ. Đây là lý do mục 7.4 bắt bạn thêm test cho nó.

### 6.2 Cổng, viết lại để thật sự đỏ được

**Cổng 0 — tiền đề (phải xanh trước khi đọc kết quả cổng 3/4):**

```bash
ls packages/natives/native/pi_natives.darwin-arm64.node
```
Ngày nay **xanh** (185 MB). Nếu đỏ, cổng 3 và 4 không phải cổng — chúng chỉ báo
lỗi load addon. Không được ghi "xong" khi cổng 0 đỏ.

**Cổng 1 — typecheck:**

```bash
bun run check:ts
```
Đo hôm nay: **exit 0**. Đây là cổng **yếu** — nó bắt được import hỏng, hằng số chưa
tồn tại, subpath sai; **không** bắt được đổi giá trị, đổi đường dẫn. Đừng báo nó
là bằng chứng cho site 1-5. (`package.json:90`, không phải `:94-95`.)

**Cổng 2 — ba file test của W4 (đỎ ĐƯỢC, vì chúng chưa tồn tại):**

```bash
ls packages/utils/test/config-dir-dual-root.test.ts \
   packages/utils/test/install-id-legacy-read.test.ts \
   packages/utils/test/config-dir-write-root.test.ts
```
Đỏ hôm nay là **thông tin, không phải nhiễu**: nó đỏ cho tới khi W4 bàn giao, và
xanh **khi và chỉ khi** W4 xong.

**Cổng 3 — 9 file test, sửa đúng 2 test trong đó trước:**

```bash
cd packages/coding-agent && bun test --timeout 20000 \
  test/modes/controllers/omfg-controller.test.ts \
  test/agent-session-rules-reload.test.ts \
  test/advisor-toggle.test.ts \
  test/extensions-discovery.test.ts \
  test/discovery/builtin-rules-md.test.ts \
  test/discovery/pi-config-dir.test.ts \
  test/mcp-config-scope-dedup.test.ts \
  test/extensibility/legacy-pi-cli-exports.test.ts \
  test/marketplace/project-scope.test.ts
```
Kỳ vọng: **111 pass / 0 fail**. Đỏ được? **Có, thật** — ma trận 6.1 đo 5/1/10/0/5
test đỏ theo từng site. `project-scope.test.ts` và `mcp-config-scope-dedup.test.ts`
**không được rút khỏi danh sách này**: chúng là phủ duy nhất của site 5 và site 3.

**Cổng 4 — test mới:**

```bash
cd packages/utils && bun test test/project-dir-name-pinned.test.ts
```

**Cổng 5 — thay cổng grep cũ của W6.** Cổng cũ là
`git grep -n 'CONFIG_DIR_NAME' -- 'packages/**/*.ts'`. Nó **về nguyên tắc mù với
site 5**. Dùng cả hai:

```bash
# 5a — không còn project-root join nào đọc bằng hằng số home-root
git grep -n 'CONFIG_DIR_NAME' -- 'packages/**/*.ts'
git grep -n 'getConfigDirName()' -- 'packages/*/src/**/*.ts'
```

Đỏ được? **Có, nếu bạn biết đọc kết quả.** Sau khi sửa, `getConfigDirName()` chỉ còn
**đúng 2 hit**: `helpers.ts:42` và `helpers.ts:45`. Bất kỳ hit thứ ba nào ở
`packages/*/src/**` là project-root đang đọc bằng getter home-root. Đó là một phép
kiểm có tiêu chuẩn rõ ràng, không cần phán đoán.

Danh sách hit `CONFIG_DIR_NAME` sau khi sửa, và phân loại từng cái (W6 yêu cầu
kiểm thủ công từng hit — đây là kết quả đo):

| Hit | Phân loại |
| --- | --- |
| `dirs.ts:28` định nghĩa | khai báo |
| `dirs.ts:308` `getConfigDirName` thân hàm | home-root thật |
| `config.ts:4` import | import |
| `config.ts:12` `USER_PRIORITY` | home-root thật |
| `config.ts:135` phép so sánh | so sánh |
| `legacy-pi-coding-agent-shim.ts:1601` | re-export |
| `cli/help-extra.ts:66` chuỗi help | home-root hiển thị — **W6 không nhắc hit này** |
| `omfg-controller.ts:2` | import (đã đổi thành `PROJECT_DIR_NAME`, nên **biến mất** khỏi hit) |
| `discovery/helpers.ts:6` | import (đã đổi, **biến mất**) |
| `omfg-controller.ts:285` | **phải biến mất** |
| `discovery/helpers.ts:47` | **phải biến mất** |
| `config.ts` `PROJECT_PRIORITY` | **phải xuất hiện** dưới tên `PROJECT_DIR_NAME` |

**Cổng 6 — `config.ts:12` không có cổng tự động, nên thêm một cái:**

```bash
cd packages/coding-agent && bun test test/discovery/pi-config-dir.test.ts -t "project"
```
Sau khi sửa dòng 38, hãy thêm một case cụ thể: `getConfigDirs("commands", { project: true })`
trả về `source` là `".omp"` (kể cả khi `CONFIG_DIR_NAME` đã là `".ultraworkers"`).
**Không có case này thì site 4 vẫn là 0 cổng đỏ.**

### 6.3 Điều người dùng thấy gì nếu hồi quy

| Hồi quy | Người dùng thấy |
| --- | --- |
| Bỏ sót site 1 | Mở repo đã dùng nhiều tháng → thư mục `extensions/`, `hooks/`, `settings.json` cấp project biến mất; ứng dụng cư xử như vừa cài |
| Bỏ sót site 2 | Rules cấp project lưu xong báo "đã lưu" nhưng **không còn đọc lại được** — rule chết ngay sau khi ghi |
| Bỏ sót site 3 | `RULES.md` cấp project, `mcp.json` cấp project và skill lock cấp project không được tìm thấy |
| Bỏ sót site 4 | Config/commands/MCP cấp project trả về rỗng — **không dòng lỗi nào** |
| **Bỏ sót site 5** | **Plugin đã cài ở cấp project biến mất khỏi `omp plugin list`; tệ hơn, resolver leo lên `~/.ultraworkers` và trả registry của HOME làm registry của project → `install`/`uninstall`/`doctor` đọc và ghi nhầm file, sinh duplicate và disambiguation error** |

---

## 7. Cạm bẫy riêng của W6

### 7.1 `do_not_rename.tsv` — đừng tạo trong W6

W6 yêu cầu tạo `scripts/rename/do_not_rename.tsv` + hàng N14. **Cả ba GATE 0 của
W7/W8a/W8b đều kiểm `keep-list.txt`, không kiểm `do_not_rename.tsv`** (plan
`:117-121`). Tạo `do_not_rename.tsv` thì **không GATE 0 nào xanh**, và lượt `sed` của
W7 — vốn nạp `keep-list.txt` — sẽ không thấy hàng N14 của bạn. Đây là cổng luôn
xanh tệ hơn không có cổng.

**Cũng đừng tạo schema `scope=project` tự do.** W6 đã nói đúng: nếu bảng không phân
biệt được `.omp` cấp project với `.omp` cấp HOME, lượt sed sẽ chặn luôn
`~/.omp` → `~/.ultraworkers` và toàn bộ W4/W5/W6 trở nên vô nghĩa. Schema phải có
cột `scope` và W7 phải chỉ loại trừ khi `scope=project`.

**Cách làm đúng ở đây:** đưa lý do ghim vào **docblock của `PROJECT_DIR_NAME`** (mục
5.1 bước 1) và vào commit message, rồi ghi một quyết định mở trong PR. Việc tạo file
registry thuộc W7/W8b, sau khi câu hỏi `do_not_rename.tsv` hay `keep-list.txt` (plan
`:265`) được trả lời.

### 7.2 `dirs.ts` trượt 10 dòng — đừng tin số dòng của W6

Mọi neo `dirs.ts` trong W6 đều lệch (+1 đến +10). Nếu bạn gõ đúng `sed -n '590p'` theo
W6, bạn đọc trúng `export function getProfileRootDir(profile: string | undefined): string {`
— một hàm hợp lệ, có chữ ký đẹp, **không hề báo lỗi**, và sửa vào đó là hỏng profile
thay vì hỏng project dir. Đây là loại lỗi âm thầm đắt nhất. Dùng `grep -n` theo tên
symbol. Bảng ở mục 2.1 là kết quả đo tại `47720fd`; nếu HEAD dịch, chạy lại `grep -n`
chứ đừng dịch số.

### 7.3 Đừng lật hằng số trước khi trỏ lại call site

W6 đã nói, và đây là bẫy thứ ba theo thứ tự dễ sai. Thêm một lý do đo được: nếu bạn
lật trước, **cả 5 site** cùng hỏng cùng lúc, và ma trận 6.1 mất hết khả năng phân
biệt — bạn sẽ thấy 23 test đỏ và không biết site nào chưa trỏ. Với ma trận 6.1 để
chẩn đoán được, bạn **phải** sửa từng site một và chạy lại.

### 7.4 `config.ts:12` là site nguy hiểm nhất theo nghĩa "không ai thấy"

Nó **không có test đỏ nào** (đo: 0). Nó trông y hệt một cách dùng home-root vì mang
`globalAgentDir: getConfigAgentDirName`. Cổng grep cũ sẽ thấy nó và bắt bạn **phải
phân loại thủ công** — đây là cổng duy nhất trong W6 là việc rà soát của con người
chứ không phải của máy. Đừng báo `check:ts` xanh là bằng chứng cho site này.
Sửa nó bằng cách tách hai danh sách (mục 4 dòng 13-15), **không** sửa bằng cách thêm
một entry `{ dir: PROJECT_DIR_NAME }` vào `priorityList` — vì `USER_CONFIG_BASES` sẽ
sinh ra một `<home>/.omp` giả.

### 7.5 Đừng sửa 4 dòng thành công mà bỏ site 5

Mục 3 là bẫy của chính phiếu này. Bạn có thể làm đúng 4 site mà W6 nêu, chạy cổng 3,
thấy `project-scope.test.ts` đỏ 5 test — rồi tưởng là "nhiễu" và sửa test. Đừng.
Đọc lại mục 3: một trong năm failure là
`Received: ".../.ultraworkers/plugins/installed_plugins.json"` — resolver đang trả
registry của HOME làm registry của project. **Sửa test, đừng sửa kỳ vọng.**

### 7.6 `config.ts:135` phải giữ `CONFIG_DIR_NAME`

`if (name !== CONFIG_DIR_NAME && !isUserSourceEnabled(name.replace(/^\./, "")))` —
đây là phép so sánh home-root, bảo user source của omp không bị tắt bởi toggle của
nguồn khác. Đổi sang `PROJECT_DIR_NAME` sẽ làm mọi toggle user source hành xử sai.
Cùng lý do: `helpers.ts:42` và `:45` phải giữ `getConfigDirName()`.
