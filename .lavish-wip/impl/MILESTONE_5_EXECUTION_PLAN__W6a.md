# Phiếu triển khai — W6a. Root cấp project (sub-task bắt buộc của W6)

- **Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_5_EXECUTION_PLAN.md` §W6a (dòng 1620–1826)
- **HEAD khi kiểm chứng:** `47720fd` (plan viết neo cho `1454dc0` — đã trượt, xem mục 7)
- **Ngày kiểm chứng:** 2026-09-29, trên máy darwin-arm64, addon native **đã build**

---

## 1. Cái gì thay đổi, quan sát được

Sau W6a, khi `CONFIG_DIR_NAME` ở nhà đã đổi tên sang `~/.ultraworkers`, mọi project có thư mục `.omp/` đã commit vẫn được đọc đúng — settings, rules, skills, commands, agents, hooks, extensions, MCP và SSH config cấp project không biến mất, và nhãn phạm vi trong trình soạn thảo rules vẫn chỉ tới một thư mục thật.

Trên màn hình **không có gì đổi**. Đó chính là hợp đồng: hình dạng hỏng mà work item này chặn là *im lặng* — không lỗi, không cảnh báo, không thông báo thiếu cấu hình, chỉ là toàn bộ cấu hình project biến mất khỏi mọi repo và một lần đăng nhập lại không giải thích được vì app cho rằng nó vừa được cài mới.

---

## 2. Bảng điểm sửa

Mọi dòng TRƯỚC dưới đây được trích từ file thật tại `47720fd`.

| path | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts` (chèn sau dòng 28) | `PROJECT_DIR_NAME` (mới) | *không tồn tại* — `grep -n PROJECT_DIR_NAME -- '*.ts'` → **NO HITS** | `export const PROJECT_DIR_NAME: string = ".omp";` kèm docblock nói rõ cố ý **không** suy ra từ `CONFIG_DIR_NAME` |
| `packages/utils/src/dirs.ts:600` | `getProjectAgentDir` | `	return path.join(cwd, CONFIG_DIR_NAME);` | `	return path.join(cwd, PROJECT_DIR_NAME);` |
| `packages/coding-agent/src/discovery/helpers.ts:47` | `SOURCE_PATHS.native.projectDir` | `		projectDir: CONFIG_DIR_NAME,` | `		projectDir: PROJECT_DIR_NAME,` |
| `packages/coding-agent/src/discovery/helpers.ts:6` | import | `	CONFIG_DIR_NAME,` (trong khối `from "@oh-my-pi/pi-natives"`→`pi-utils`) | thêm `PROJECT_DIR_NAME,` giữ `CONFIG_DIR_NAME` |
| `packages/coding-agent/src/modes/controllers/omfg-controller.ts:285` | `#resolveTarget()` | `			filePath: path.join(this.ctx.sessionManager.getCwd(), CONFIG_DIR_NAME, "rules", \`${ruleName}.md\`),` | `			filePath: path.join(this.ctx.sessionManager.getCwd(), PROJECT_DIR_NAME, "rules", \`${ruleName}.md\`),` |
| `packages/coding-agent/src/modes/controllers/omfg-controller.ts:2` | import | `import { CONFIG_DIR_NAME, prompt } from "@oh-my-pi/pi-utils";` | `import { PROJECT_DIR_NAME, prompt } from "@oh-my-pi/pi-utils";` (bỏ `CONFIG_DIR_NAME` — không còn dùng) |
| `packages/coding-agent/test/sdk-system-prompt-template.test.ts:10` | import | `import { CONFIG_DIR_NAME, TempDir } from "@oh-my-pi/pi-utils";` | `import { PROJECT_DIR_NAME, TempDir } from "@oh-my-pi/pi-utils";` |
| `packages/coding-agent/test/sdk-system-prompt-template.test.ts:23` | `withSession` | `	await Bun.write(path.join(cwd, CONFIG_DIR_NAME, "SYSTEM_TEMPLATE.md"), nativeTemplate);` | `	await Bun.write(path.join(cwd, PROJECT_DIR_NAME, "SYSTEM_TEMPLATE.md"), nativeTemplate);` |
| `packages/coding-agent/test/system-prompt-template.test.ts:4` | import | `import { __resetDirsFromEnvForTests, CONFIG_DIR_NAME, getConfigAgentDirName, TempDir } from "@oh-my-pi/pi-utils";` | đổi `CONFIG_DIR_NAME` → `PROJECT_DIR_NAME` |
| `packages/coding-agent/test/system-prompt-template.test.ts:42` | `withDiscoveryHome` | `			projectConfig: tempDir.join("project", CONFIG_DIR_NAME),` | `			projectConfig: tempDir.join("project", PROJECT_DIR_NAME),` |
| `packages/coding-agent/test/system-prompt-template.test.ts:111` | vòng lặp template | `	for (const directory of [CONFIG_DIR_NAME, ".agents"]) {` | `	for (const directory of [PROJECT_DIR_NAME, ".agents"]) {` |
| `packages/coding-agent/test/system-prompt-template.test.ts:126` | vòng lặp template | `	for (const directory of [CONFIG_DIR_NAME, ".agents"]) {` | `	for (const directory of [PROJECT_DIR_NAME, ".agents"]) {` |
| `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts:14` | pin literal | `		expect(CONFIG_DIR_NAME).toBe(".omp");` | khẳng định ràng buộc: giá trị re-export từ package root legacy **là** hằng home-root và **không phải** `PROJECT_DIR_NAME` |
| `packages/coding-agent/src/config.ts:12` | `priorityList` | `	{ dir: CONFIG_DIR_NAME, globalAgentDir: getConfigAgentDirName },` | `	{ dir: PROJECT_DIR_NAME, globalAgentDir: getConfigAgentDirName },` — **chỉ sau khi có quyết định của con người (open question 1)** |
| `scripts/rename/keep-list.txt` | (tạo mới) | *không tồn tại* — `ls scripts/rename` → `No such file or directory` | một dòng neo vị trí project + lý do `#` |
| `packages/utils/test/project-dir-name-pinned.test.ts` | (tạo mới) | *không tồn tại* | 4 khẳng định, xem mục 4 |

**KHÔNG sửa (đã mở và đọc, xác nhận đúng nguyên trạng):**
- `packages/utils/src/dirs.ts:308` — `	return process.env.PI_CONFIG_DIR || CONFIG_DIR_NAME;` là lần đọc **home-root**, thuộc W4/W6.
- `packages/utils/src/dirs.ts:598` — `/** Get the project-local config directory (.omp). */` — docblock vẫn đúng sau khi sửa.
- `packages/coding-agent/src/cli/help-extra.ts:66` — `  PI_CODING_AGENT_DIR        - Session storage directory (default: ~/${CONFIG_DIR_NAME}/agent)` — home-root, đi theo cú flip của W6. **Sửa thành `PROJECT_DIR_NAME` sẽ in ra một đường dẫn sai.**
- `packages/coding-agent/src/config.ts:135` — `			if (name !== CONFIG_DIR_NAME && !isUserSourceEnabled(name.replace(/^\./, ""))) {` — so sánh với chính hằng, phải theo flip.
- `packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1601` — `export { CONFIG_DIR_NAME } from "@oh-my-pi/pi-utils";` — re-export phải bám theo home-root.

---

## 3. Các bước

Mỗi neo dưới đây đã được mở và đọc trong lúc soạn phiếu này.

**Bước 1 — Ghi baseline trước khi đụng code.**
Chạy và LƯU output:
```
cd packages/utils && bun test test/dirs.test.ts test/install-id.test.ts
```
Đo thật tại `47720fd`: `11 pass, 1 skip, 0 fail, 20 expect() calls`. Lưu ý: plan ghi "6 pass / 0 fail" cho `dirs.test.ts` — đúng về pass nhưng **thiếu 1 skip** (đo được `6 pass, 1 skip, 0 fail, 9 expect() calls`). Nếu không tái lập được, dừng.

**Bước 2 — Thêm `PROJECT_DIR_NAME` vào `dirs.ts`.**
Neo: `packages/utils/src/dirs.ts:28` — đã đọc, đúng là `export const CONFIG_DIR_NAME: string = ".omp";`.
Chèn ngay sau nó. Docblock phải nói bằng văn xuôi: đây là tên thư mục config cấp project, tương đối với project root; cố ý KHÔNG suy ra từ `CONFIG_DIR_NAME`; thư mục này thường nằm trong repo người dùng và được commit vào git nên đổi tên nó là viết lại working tree của họ chứ không phải di chuyển trạng thái máy-local.
**Không đụng** `dirs.ts:22` (`APP_NAME`), `:25` (`APP_URL`), `:31` (`MAIN_CONFIG_FILENAMES`), `:37` (`USER_AGENT`), `:308` (lần đọc home-root).

**Bước 3 — Trỏ lại `getProjectAgentDir`.**
Neo: `packages/utils/src/dirs.ts:600` — đã đọc, đúng là `	return path.join(cwd, CONFIG_DIR_NAME);` (hàm bắt đầu ở 599).
Sau khi sửa, `grep -n 'return path.join(cwd, CONFIG_DIR_NAME)' packages/utils/src/dirs.ts` phải **không hit**. `grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts` vẫn ra **3** hit (28 khai báo, 308 home-root, + dòng docblock mới ở bước 2 nhắc tên hằng) — 3 là đúng, 4 là bước 3 bị bỏ sót.

**Bước 4 — Trỏ lại HAI call site ngoài `dirs.ts` mà plan gốc không nêu tên.**
(a) Neo: `packages/coding-agent/src/discovery/helpers.ts:47` — đã đọc, đúng là `		projectDir: CONFIG_DIR_NAME,`. Nó được `getProjectPath()` ở dòng 127–131 tiêu thụ dưới dạng `	return path.join(ctx.cwd, paths.projectDir, subpath);` — một lần đọc project-root **không đi qua** `getProjectAgentDir()`. Để nguyên `userBase` (dòng 42) và `userAgent` (dòng 45) đọc `getConfigDirName()` — đó là home-root, thuộc W4.
(b) Neo: `packages/coding-agent/src/modes/controllers/omfg-controller.ts:285` — đã đọc, đúng là đường ghi rules phạm vi project trong `#resolveTarget()` (hàm bắt đầu ở 277).

**Bước 5 — Trả lời open question 1 rồi quét lại toàn bộ bề mặt.**
Neo: `packages/coding-agent/src/config.ts:12` — đã đọc, đúng là `	{ dir: CONFIG_DIR_NAME, globalAgentDir: getConfigAgentDirName },`. `priorityList` nạp vào **cả** `USER_CONFIG_BASES` (dòng **85**) và `PROJECT_CONFIG_BASES` (dòng **91**) từ cùng một giá trị `dir`. Dòng 135 so `name !== CONFIG_DIR_NAME` để quyết định opt-in của user source.
Quét: `git grep -n 'CONFIG_DIR_NAME' -- 'packages/**/*.ts'` cho **24** hit (đã đo), 9 trong test. Sau khi sửa, mọi hit còn lại bắt buộc thuộc đúng bốn loại: (i) home-root use (`help-extra.ts:66`, logic user-base trong `config.ts`), (ii) so sánh với chính hằng (`config.ts:135`), (iii) re-export (`legacy-pi-coding-agent-shim.ts:1601` + hai dòng comment 1597–1598), (iv) project-root join trong test đã trỏ lại.

**Bước 6 — Viết `packages/utils/test/project-dir-name-pinned.test.ts`.**
Đặt ở `packages/utils/test/` — package này chạy được **không cần build addon** (xem mục 5). Không `mock.module()`. Không mutate `process.env`/`process.platform` — `getProjectAgentDir` nhận cwd làm tham số, đó là seam hẹp. Dọn thư mục tạm trong thân test bằng `fs.rmSync(root, { recursive: true, force: true })` trong `finally` (mẫu: `dirs.test.ts:74`), và `vi.restoreAllMocks()` trong `afterEach` (mẫu: `dirs.test.ts:18-19`).

**Bước 7 — Nới lỏng pin literal.**
Neo: `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts:14` — đã đọc, đúng là `		expect(CONFIG_DIR_NAME).toBe(".omp");`. Thay bằng khẳng định ràng buộc home-root-vs-project-root. Giữ nguyên import symbol thật — đây là hợp đồng xuất ra, không phải source-grep. **Đừng xoá hẳn.**

**Bước 8 — Tạo dòng do_not_rename.**
`scripts/rename/` chưa tồn tại (đã xác minh). Tạo `scripts/rename/keep-list.txt` theo định dạng `<pattern>  # <reason>`. Mục cần thêm dùng mẫu **neo theo vị trí project**, KHÔNG dùng `.omp` trần:
```
^\.omp/  # project-level directory usually committed to git; renaming it rewrites the user's working tree rather than moving machine-local state
```
`.omp` trần sẽ khớp cả `~/.omp` lần cả `<repo>/.omp/` và chặn nhầm việc W6/W7 đổi tên home root. Nếu một work item anh em đã tạo file, append thay vì ghi đè.

**Bước 9 — Chạy cổng và chứng minh cổng đỏ được.** Xem mục 5.

---

## 4. Hợp đồng test

**File mới: `packages/utils/test/project-dir-name-pinned.test.ts`** — 4 khẳng định:

1. `PROJECT_DIR_NAME === ".omp"` — hợp đồng giá trị.
2. `expect([CONFIG_DIR_NAME, PROJECT_DIR_NAME]).toEqual([CONFIG_DIR_NAME, ".omp"])` — **pin cặp có thứ tự**, khẳng định gánh trọng lượng. Vế phải tự tham chiếu `CONFIG_DIR_NAME` nên hằng home-root không bị ghim cứng (W6 lật nó, khẳng định vẫn xanh); vế trái bắt đúng một lỗi: ai đó hợp nhất `PROJECT_DIR_NAME` theo tên home root. **Không test sẵn nào trong repo làm điều này.**
3. **Phân giải dưới đối thủ** — cwd tạm chứa `.omp/` đã commit vẫn phân giải vào đó khi một thư mục mang tên home-root MỚI nằm ngay cạnh. Đây là lời gọi hàm thật và so sánh giá trị trả về, **không** phải so sánh chuỗi.
4. **Cả năm project getter** dựa trên `getProjectAgentDir` đều nằm dưới `.omp` đã ghim: `getProjectModulesDir` (`dirs.ts:1056`), `getProjectPromptsDir` (`:1061`), `getProjectPluginOverridesPath` (`:1066`), `getMCPConfigPath('project')` (`:1075`), `getSSHConfigPath('project')` (`:1083`).

**KHÔNG viết** `expect(PROJECT_DIR_NAME).not.toBe(CONFIG_DIR_NAME)` ở đây: tại thời điểm W6a merge hai hằng còn **bằng nhau**, khẳng định đó đỏ ngay khi viết ra. Phân kỳ là hợp đồng của W6.

**Các test sẵn có — nhóm đối chứng âm, KHÔNG được sửa.** Đã đọc và xác nhận các literal:

| file | neo | nội dung thật |
| --- | --- | --- |
| `test/modes/controllers/omfg-controller.test.ts` | 15 | `const PROJECT_OPTION = "This project (.omp/rules)";` |
| | 178 | `expect(await Bun.file(path.join(harness.projectDir, ".omp", "rules", "ts-no-any.md")).exists()).toBe(false);` |
| | 198 | `const rulesDir = path.join(harness.projectDir, ".omp", "rules");` |
| `test/agent-session-rules-reload.test.ts` | 89 | `opts.scope === "user" ? path.join(tempDir.path(), "RULES.md") : path.join(tempDir.path(), ".omp", "RULES.md");` |
| | 156 | `const rulesDir = path.join(tempDir.path(), ".omp", "rules");` |
| `test/extensions-discovery.test.ts` | 23 | `extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");` |
| `test/advisor-toggle.test.ts` | 262 | `path.join(getProjectAgentDir(projectA), "settings.json"),` |
| | 266 | `path.join(getProjectAgentDir(projectB), "settings.json"),` |

**Người dùng thấy gì nếu hồi quy:** họ mở một repo đã dùng nhiều tháng và settings, rules, skills, hooks của project biến mất. Không lỗi nào in ra, không cảnh báo thiếu cấu hình nào hiện, app cư xử như vừa cài mới — kể cả một lần đăng nhập lại im lặng. Chi tiết làm nó khó chịu: nhãn `This project (.omp/rules)` **vẫn hiện** trong UI trong khi chỉ tới một thư mục không tồn tại.

---

## 5. Cổng

### 5.1 Tiền đề môi trường — ĐÃ XONG, không còn cần

Plan mô tả một blocker dài: `bun test` bị chặn vì native addon chưa build. **Điều đó không còn đúng trên máy này.** `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại, `ninja` có ở `/opt/homebrew/bin/ninja`, và toàn bộ nhóm đối chứng âm của coding-agent chạy xanh. Cổng **không** được giữ điều kiện "addon chưa build" làm tiền đề — làm vậy là giữ một cổng có thể báo xanh giả.

### 5.2 Cổng viết lại, từng điều khoản đều đỏ được

Đo thật ở `47720fd`, tất cả đều **EXIT 1 khi đúng-không-còn-gì** hoặc **không hit khi đúng**:

```bash
# 1. types
bun run check:ts

# 2. test mới + nhóm sẵn có của utils (tiền tố ./ BẮT BUỘC — xem 5.3)
cd packages/utils && bun test ./test/project-dir-name-pinned.test.ts \
  ./test/dirs.test.ts ./test/install-id.test.ts

# 3. dirs.ts:600 đã trỏ lại — không còn project-root join nào đọc CONFIG_DIR_NAME
! grep -n 'return path.join(cwd, CONFIG_DIR_NAME)' packages/utils/src/dirs.ts
#    tương đương, dễ review nhất:
#    grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts  -> đúng 3 hit (28 khai báo, 308 home-root, docblock)

# 4. quét toàn bộ bề mặt — mọi project-root join phải đã đổi sang PROJECT_DIR_NAME
git grep -n 'CONFIG_DIR_NAME' -- 'packages/**/*.ts'

# 5. nhóm đối chứng âm của coding-agent (chạy được, đã build)
bun test packages/coding-agent/test/modes/controllers/omfg-controller.test.ts
bun test packages/coding-agent/test/extensions-discovery.test.ts
bun test packages/coding-agent/test/advisor-toggle.test.ts
bun test packages/coding-agent/test/agent-session-rules-reload.test.ts

# 6. keep-list
test -f scripts/rename/keep-list.txt && grep -n '^\^\\\.omp/.*#' scripts/rename/keep-list.txt

# 7. phủ định: hằng ghim hỏng thì phải đỏ
#    tạm đặt PROJECT_DIR_NAME = ".ultraworkers", chạy lại (2) -> phải đỏ. khôi phục.
```

**Trả lời cụ thể: cổng này CÓ ĐỎ ĐƯỢC, và tôi đã quan sát nó đỏ bằng tay ở cả ba call site.**

Tôi đã thực sự phá từng call site trên cây thật và đo lại, rồi hoàn nguyên (đã xác minh `git status` sạch):

| phá gì | kết quả đo được |
| --- | --- |
| `dirs.ts:600` → `".omp-renamed-probe"` | `extensions-discovery` **31 pass / 4 FAIL**; `advisor-toggle` **42 pass / 1 FAIL**; `omfg-controller` 3/0; `agent-session-rules-reload` 6/0 |
| `omfg-controller.ts:285` → `".omp-renamed-probe"` | `omfg-controller.test.ts` **2 pass / 1 FAIL** |
| `helpers.ts:47` → `".omp-renamed-probe"` | `extensions-discovery.test.ts` **31 pass / 4 FAIL** |

Sau khi hoàn nguyên: cả bốn file test trở lại xanh hoàn toàn, `md5` `dirs.ts` khớp trước khi phá, `git status` sạch.

**Đính chính một tuyên bố của plan.** Plan nói bỏ qua bước 3 (để `CONFIG_DIR_NAME` ở `dirs.ts:600`) làm **`omfg-controller.test.ts` và `agent-session-rules-reload.test.ts` đỏ**. **Đo thật thì cả hai vẫn XANH** khi phá `dirs.ts:600`. Lý do: chúng không dùng `getProjectAgentDir()`; chúng tự `path.join(..., ".omp", "rules")` bằng literal rồi so với output của `omfg-controller.ts:285`, vốn cũng tự join bằng literal. Hai site đó chỉ đỏ khi **chính dòng 285 của `omfg-controller.ts`** bị phá. Đừng tick xanh `omfg-controller`/`agent-session-rules-reload` như bằng chứng cho việc sửa `dirs.ts` — bằng chứng đúng cho `dirs.ts:600` là `extensions-discovery` + `advisor-toggle`.

### 5.3 Cạm bẫy cổng: `bun test` **không** đỏ khi file không tồn tại

Đây là bẫy nguy hiểm nhất của work item này và nó giết chính cổng:

```
$ bun test test/this-file-does-not-exist.test.ts
 note: Tests need ".test" ... filename
EXIT=0                      # ← XANH, dù file không tồn tại
$ bun test ./test/this-file-does-not-exist.test.ts
 Test filter ... had no matches
EXIT=1                      # ← ĐỎ đúng
```

Lệnh cổng trong plan (`bun test test/project-dir-name-pinned.test.ts test/dirs.test.ts test/install-id.test.ts test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts`) **thiếu tiền tố `./`**, nên nó báo `11 pass / 1 skip / 0 fail` **ngay cả khi `project-dir-name-pinned.test.ts` chưa tồn tại và cả hai file của W4 cũng chưa tồn tại**. Tôi đã chạy đúng lệnh đó và nó xanh. Đó là cổng luôn-xanh tệ hơn không có cổng. Đã viết lại ở 5.2 với `./` bắt buộc.

Hệ quả: `config-dir-dual-root.test.ts` và `install-id-legacy-read.test.ts` của W4 **chưa tồn tại** (W4 chưa land — `grep -n 'getConfigWriteRoot\|getConfigDirCandidates' packages/utils/src/dirs.ts` → **NO HITS**). Chúng nên ở cổng của W4; W6a chỉ cần hai file utils nêu ở 5.2.

---

## 6. Cạm bẫy riêng của work item này

1. **Tin lời plan rằng W6a là một dòng ở `dirs.ts:590`.** Sai. Ba call site project-root tồn tại và cả ba đều đã được chứng minh gánh trọng lượng bằng phá–đo–hoàn nguyên thật ở mục 5.2. Bỏ bất kỳ site nào trong ba site đó là hỏng âm thầm, và site nào hỏng thì hỏng theo kiểu riêng.

2. **`.omp` trần trong keep-list là lỗi âm thầm, không phải lỗi nổ.** Nó khớp `~/.omp` lẫn `<repo>/.omp/`, chặn nhầm việc W6/W7 đổi tên home root — đúng hậu quả ngược với mục tiêu của W6. `dirs.ts:28` và `dirs.ts:600` đang dùng **cùng một chuỗi** `".omp"`, nên đây không phải lo lắng giả định.

3. **Quyết định `config.ts:12` là quyết định sản phẩm, không phải refactor.** `priorityList` nạp cả user-base lẫn project-base từ một `dir`. Để nguyên thì mục project trong `PROJECT_CONFIG_BASES` âm thầm thành `.ultraworkers` khi W6 lật — một thay đổi hành vi tầng project nằm trong một cuộc đổi tên hằng, và làm sai trông y hệt làm không gì. Phải có người trả lời trước khi merge.

4. **Pin cặp trông thừa nhưng không thừa.** Khẳng định giá trị đã ghim `".omp"`; pin cặp vẫn đỏ khi ai đó hợp nhất `PROJECT_DIR_NAME` theo tên home root — chế độ hỏng mà **không test sẵn nào** trong repo bắt được. Từ W6 trở đi, hình thức đúng của refactor đó chính là `PROJECT_DIR_NAME = CONFIG_DIR_NAME`.

5. **`.omp/` của chính repo này không phải chuyện giả định.** Đo được **16** file git-tracked dưới `.omp/`: `commands/` 5, `skills/` 8, `tools/` 3. (Plan ghi "14 file" và "`skills/` 6 file" — đã lệch; `skills/` nay có 8 vì thêm `sync-squashed-fork/` 2 file và `tool-prompt-optimization/scripts/probe*.ts` 2 file.) Flip project root sẽ phá chính cấu hình làm việc của repo này trên máy của maintainer.

6. **Trong lúc soạn phiếu này, working tree bị một tiến trình khác sửa dưới chân** — `dirs.ts` và 3 file khác nhận W6/W6a edits lúc 08:17:50 rồi bị hoàn nguyên. Nếu bạn gõ W6a song song với tiến trình khác đang sửa cùng cây, hãy `git status` trước khi bắt đầu và sau mỗi bước sửa. Phiếu này chỉ mô tả trạng thái sạch tại `47720fd`.

---

## 7. Đính chính neo và claim (không sửa file kế hoạch)

| plan nói | thực tế tại `47720fd` |
| --- | --- |
| `dirs.ts:590` = `return path.join(cwd, CONFIG_DIR_NAME);` | **dòng 600**. Hàm bắt đầu ở 599, không phải 589 |
| `dirs.ts:27` = khai báo `CONFIG_DIR_NAME` | **dòng 28** |
| `dirs.ts:298` = lần đọc home-root | **dòng 308** (hàm `getConfigDirName` ở 307) |
| `dirs.ts:360` = phép join candidate XDG | **dòng 370** (`const appRoot = path.join(value, APP_NAME);`) |
| `dirs.ts` dài 1157 dòng | **1177** dòng |
| `APP_NAME` 21, `APP_URL` 24, `MAIN_CONFIG_FILENAMES` 30, `USER_AGENT` 36 | lần lượt **22, 25, 31, 37** |
| `discovery/helpers.ts:47`, import dòng 6, userBase 42, userAgent 45, getProjectPath 127–131 | **khớp tuyệt đối** |
| `omfg-controller.ts:285`, import dòng 2 | **khớp tuyệt đối** |
| `config.ts:12`, `:135` | **khớp tuyệt đối** |
| `config.ts:84` `USER_CONFIG_BASES`, `:90` `PROJECT_CONFIG_BASES` | **85** và **91** |
| `help-extra.ts:3`, `:66` | **khớp tuyệt đối** |
| shim `1588,1589,1592` | **1597, 1598, 1601** (file ở `src/extensibility/`, dài 1658) |
| `legacy-pi-cli-exports.test.ts:14` | **khớp tuyệt đối** |
| `sdk-system-prompt-template.test.ts:10, 22, 23` | **khớp tuyệt đối** |
| `system-prompt-template.test.ts:4, 42, 111, 126` | **khớp tuyệt đối** |
| `omfg-controller.test.ts:15, 178, 198` | **khớp tuyệt đối** |
| `agent-session-rules-reload.test.ts:89, 156` | **khớp tuyệt đối** |
| `extensions-discovery.test.ts:23` | **khớp** (file dài 768) |
| `extensions-discovery.test.ts:149, 747, 767, 792` | **HỎNG CẢ 4** — file chỉ dài 768 nên 792 vượt EOF. Call site `getProjectAgentDir` thật: **23, 136, 651, 671, 696** |
| `advisor-toggle.test.ts:268, 272` | **HỎNG CẢ 2** — thật là **262, 266** |
| `dirs.test.ts:52-60` (rm trong finally) | `fs.rmSync` thật ở **dòng 74**, trong `finally` ở 73–75 |
| `dirs.test.ts:17-20` (restoreAllMocks) | `afterEach` ở **18**, `vi.restoreAllMocks()` ở **19**, `setProjectDir` ở 20 |
| `getConfigWriteRoot` / `getConfigDirCandidates` tồn tại (W4) | **KHÔNG tồn tại** → W4 chưa land |
| `APP_NAME` đã mang giá trị mới (W3) | `APP_NAME = "omp"` tại `dirs.ts:22` → **W3 chưa land** |
| `bun test` bị chặn, addon chưa build | **SAI** — addon đã build, cả 4 nhóm đối chứng âm chạy xanh |
| `dirs.test.ts` → 6 pass / 0 fail | `6 pass`, **`1 skip`**, 0 fail, 9 expect() |
| `.omp/` có 14 file tracked (5 cmd, 6 skills, 3 tools) | **16** (5 cmd, **8** skills, 3 tools) |
| 5 project getter trong dirs.ts | khớp: `1056, 1061, 1066, 1075, 1083` |
| `ls scripts/rename` → không tồn tại | **khớp** |
| 24 hit `CONFIG_DIR_NAME` trong `packages/**/*.ts` | **khớp** (15 hit ngoài test) |
