# Phiếu triển khai — W5. `config migrate` — idempotent, mặc định dry-run (sóng 2)

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md` (mục `## W5.`, dòng 1145–1342)
**Ngày kiểm chứng:** 2026-09-29, trên `milestone-1` @ `47720fd`
**Kết quả kiểm tra neo:** 39 neo, **26 đúng**, **13 sai** (bảng ở mục 7).
Ngoài ra **6 phát biểu trong W5 bị bác bởi đo đạc** — riêng mục 7.2 đã làm đổi bản chất cổng.

---

## 1. Cái gì thay đổi, quan sát được

Gõ `omp config migrate` in ra đúng những thư mục nó **sẽ** di chuyển và thoát 0 mà không đụng vào đĩa; gõ thêm `--apply` thì nó di chuyển `~/.omp` → `~/.ultraworkers` và `$XDG_{DATA,STATE,CACHE}_HOME/omp` → `$XDG_*_HOME/ultraworkers`, giữ nguyên `install-id`, sessions, settings và profile có tên; gõ `--apply` lần thứ hai là no-op báo 0 moves và thoát 0; và nếu cả root cũ lẫn root mới đều tồn tại thì lệnh **từ chối** chạm vào cả hai thay vì merge.

---

## 2. Bảng điểm sửa

Trích TRƯỚC từ file thật. Mọi dòng file dùng TAB (`useTabs: true, tabWidth: 3`) — kể cả dòng bạn thêm.

### 2.1 `packages/coding-agent/src/cli/config-cli.ts` — 8 sửa (một commit)

| dòng | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| 8 | import barrel | `import { APP_NAME, getAgentDir, isRecord } from "@oh-my-pi/pi-utils";` | `import { APP_NAME, executeConfigMigration, getAgentDir, isRecord, planConfigMigration } from "@oh-my-pi/pi-utils";` |
| 20 | `ConfigAction` | `export type ConfigAction = "list" \| "get" \| "set" \| "reset" \| "path" \| "init-xdg";` | `… \| "init-xdg" \| "migrate";` |
| 26–28 | `ConfigCommandArgs.flags` | `	flags: {`<br>`		json?: boolean;`<br>`	};` | `	flags: {`<br>`		apply?: boolean;`<br>`		json?: boolean;`<br>`	};` |
| 66 | `VALID_ACTIONS` | `const VALID_ACTIONS: ConfigAction[] = ["list", "get", "set", "reset", "path", "init-xdg"];` | `… "init-xdg", "migrate"];` |
| 96–97 | `parseConfigArgs` nhánh `--json` | `		if (arg === "--json") {`<br>`			result.flags.json = true;` | thêm `		} else if (arg === "--apply") {`<br>`			result.flags.apply = true;` — **xem cảnh báo 6.1, site này là code chết** |
| 182–184 | `switch (cmd.action)` | `		case "init-xdg":`<br>`			await initXdg();`<br>`			break;` | thêm sau dòng 184, trước `}` ở 185:<br>`		case "migrate":`<br>`			await handleMigrate(cmd.flags);`<br>`			break;` |
| 414 | `printConfigHelp()` | `  init-xdg           Initialize XDG Base Directory structure` | thêm `  migrate            Move config roots to the new name (dry run; add --apply to move)` — **2 SPACE, khớp khối help, xem 6.2** |
| sau 184 | `handleMigrate` (mới) | — | `async function handleMigrate(flags: { json?: boolean; apply?: boolean }): Promise<void>` — handler duy nhất ghi xuống filesystem |

### 2.2 `packages/coding-agent/src/commands/config.ts` — 4 sửa

| dòng | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| 10 | `ACTIONS` | `const ACTIONS: ConfigAction[] = ["list", "get", "set", "reset", "path", "init-xdg"];` | `… "init-xdg", "migrate"];` |
| 32 | `static flags` | `		json: Flags.boolean({ description: "Output JSON" }),` | thêm TAB-TAB: `		apply: Flags.boolean({ description: "Perform the migration (default is a dry run)" }),` |
| 45 | `cmd.flags` | `			flags: {`<br>`				json: flags.json,`<br>`			},` | `			flags: {`<br>`				apply: flags.apply,`<br>`				json: flags.json,`<br>`			},` |

Không thêm arg, không thêm positional. `migrate` không nhận key, không nhận value.

### 2.3 `packages/utils/src/index.ts` — 1 sửa

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 4/5 | barrel | `export * from "./color";`<br>`export * from "./dirs";` | chèn giữa: `export * from "./config-migrate";` — **bảng chữ cái: `color` < `config-migrate` < `dirs`** |

### 2.4 `packages/coding-agent/src/cli/gc-cli.ts` — xoá 1, trỏ lại 2

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 528–546 | `movePath` (private) | `async function movePath(source: string, destination: string): Promise<void> {` … `}` (19 dòng, đã đọc trọn) | **XOÁ.** Nội dung chuyển sang `packages/utils/src/fs-move.ts` + `export`. Kèm `codeOf` (định nghĩa tại `gc-cli.ts:222`) — xem 6.3 |
| 673 | call site | `			await movePath(sourceArtifacts, destArtifacts);` | không đổi dòng này; thêm import `movePath` từ `@oh-my-pi/pi-utils/fs-move` |
| 682 | call site | `					await movePath(move.destination, move.source);` | không đổi dòng này |

`git grep -n 'movePath' -- packages/` hôm nay trả về **đúng ba dòng** trên. Sau W5 phải là ba dòng nữa (hai call + một import), không phải bốn.

### 2.5 File tạo mới

| path | nội dung |
| --- | --- |
| `packages/utils/src/fs-move.ts` | `export async function movePath(source, destination): Promise<void>` — lift nguyên văn 19 dòng `gc-cli.ts:528-546` |
| `packages/utils/src/config-migrate.ts` | `MigrationKind`, `MigrationMove`, `MigrationConflict`, `MigrationPlan`, `MigrationOptions`, `planConfigMigration`, `executeConfigMigration`. **Không** `console.*`, **không** đọc `os.homedir()` / `process.env` / `process.platform` bên trong |
| `packages/coding-agent/src/cli/commands/config-migrate.ts` | renderer mỏng: `console.*` + `shortenPath` + `truncateToWidth`. Đây là file **duy nhất** được phép `console.*` |
| `packages/utils/test/config-migrate.test.ts` | cổng chính, 6 case |
| `packages/coding-agent/test/config-migrate-cli.test.ts` | test CLI subprocess — **nay đã chạy được, xem mục 5** |

---

## 3. Các bước, đánh số, neo đã kiểm

Mỗi neo dưới đây tôi đã mở và đọc. Số dòng trong ngoặc là số **thật** khi neo trong W5 sai.

**Bước 0 — tiền đề (bị chặn, xem 6.4).**
`git grep -n 'getConfigWriteRoot\|getConfigDirCandidates' -- packages/utils/src/dirs.ts` → **không trả về gì**. W4 chưa xuống đất. Theo chính quy tắc bước 1 của W5: **dừng**. Điểm neo thật cho vị trí W4 sẽ chạm là `dirs.ts:307-309` (`getConfigDirName`), không phải `dirs.ts:297` (dòng đó là `*/`).

**Bước 1 — `packages/utils/src/config-migrate.ts`: `planConfigMigration` một mình.**
Đọc lại ba dòng neo của W5, đã sửa số:

| W5 ghi | Thật | Nội dung thật tại dòng thật |
| --- | --- | --- |
| `dirs.ts:114-115` | **`115-117`** | `export function getBaseConfigRoot(): string {` / `return path.join(os.homedir(), getConfigDirName());` / `}` |
| `dirs.ts:355` | **`365`** | `		if ((process.platform === "linux" \|\| process.platform === "darwin") && isDefault) {` |
| `dirs.ts:360` | **`370`** | `					const appRoot = path.join(value, APP_NAME);` |
| `dirs.ts:21` | **`22`** | `export const APP_NAME: string = "omp";` (21 là doc comment) |
| `dirs.ts:27` | **`28`** | `export const CONFIG_DIR_NAME: string = ".omp";` (27 là doc comment) |

Hai cặp tên độc lập — `CONFIG_DIR_NAME` có dấu chấm (`.omp`), `APP_NAME` không (`omp`). Dùng chung một cặp làm cả ba root XDG trỏ tới `$XDG_*_HOME/.omp`, vốn không bao giờ tồn tại, nên rơi vào nhánh "vắng" và bị bỏ qua im lặng.

**Bước 2 — `packages/utils/test/config-migrate.test.ts`, chỉ case plan-only.**
Chạy `bun test packages/utils/test/config-migrate.test.ts` → phải thoát 0. Chạy lại lúc file còn chưa có → thoát 1 (tôi đã đo, xem 5.1).

**Bước 3 — `packages/utils/src/fs-move.ts`.**
Lift `gc-cli.ts:528-546` nguyên văn, `export` nó. Xoá bản private. Thêm import ở `gc-cli.ts`. **Không** chạy `bun test packages/coding-agent/test/` ở bước này (không cần — typecheck ở bước 5 bắt được).

**Bước 4 — `executeConfigMigration`.**
Duyệt `plan.moves` và **không gì khác**. `movePath` ném lỗi → báo, đếm, dừng; **không** xoá nguồn khi chưa di chuyển xong.

**Bước 5 — `packages/utils/src/index.ts`.** Chèn `export * from "./config-migrate";` giữa dòng 4 và 5.

**Bước 6 — 12 sửa ở `config-cli.ts` + `config.ts`, MỘT commit, rồi ĐẾM 8 VÀ 4.**
Lưu ý quan trọng về cái đếm: tám site của `config-cli.ts` **không phải** tám cổng đỏ được. `noImplicitReturns` không có trong bất kỳ tsconfig nào của repo (đã `rg` toàn repo, 0 hit), `.oxlintrc.json` không có luật exhaustiveness, `runConfigCommand` trả `Promise<void>` nên `switch` thiếu case biên dịch im lặng, và `VALID_ACTIONS: ConfigAction[]` vẫn typecheck như tập con sau khi nới union. Đếm là **nghĩa vụ review**, đọc diff.

**Bước 7 — `packages/coding-agent/src/cli/commands/config-migrate.ts`.**
`shortenPath` thật ở `packages/tui/src/render/render-utils.ts:926` (**W5 ghi 902 — sai**). Tham chiếu tiền lệ: `init-xdg.ts:21` (đúng) dùng `dir.replace(os.homedir(), "~")` — đó chính là thứ đừng chép.

**Bước 8 — `bun run check:ts`.** Neo thật: `package.json:90` (**W5 ghi 94 — sai**, 94 là `"lint:ts"`). Đo: exit 0, **97s** wall (W5 ghi ~40s).

**Bước 9 — `bun test packages/utils/test/config-migrate.test.ts`, 6 case xanh, chạy lại lần hai vẫn 0.**

**Bước 10 — cấm.** Không đụng W6. `CONFIG_DIR_NAME` thật ở `dirs.ts:28` (**W5 ghi 27 — sai**).

---

## 4. Hợp đồng test

### 4.1 `packages/utils/test/config-migrate.test.ts` — 6 case (cổng chính)

Tất cả dùng thư mục tạm dưới `os.tmpdir()`, `home`/`env`/`platform` tổng hợp truyền qua đối số. **Không** đổi `process.env` ở cấp file, **không** `mock.module()`, **không** vá `Bun.*`, **không** đọc `~/.omp` thật. Import engine bằng subpath: `from "@oh-my-pi/pi-utils/config-migrate"` — tiền lệ đã chạy: `packages/utils/test/install-id.test.ts:5-13` import `from "@oh-my-pi/pi-utils/dirs"`.

| # | case | assert | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| 1 | dry run không đổi gì | gieo config + session + `profiles/<tên>` + UUID `install-id`; sau `planConfigMigration` mọi path vẫn còn | gõ `config migrate` để xem trước rồi mất sạch settings |
| 2 | apply di chuyển mọi root | gieo base root + **ba** XDG root, tên XDG là `omp` **không dấu chấm**; `moved === 4`; mỗi path cũ biến mất, path mới có nội dung | người đã chạy `init-xdg` giữ một bộ cài nửa vời, state bị bỏ lại dưới tên cũ |
| 3 | apply lần hai là no-op | `moves.length === 0`, cây sau đó giống từng byte | người chạy lại vì sợ bị đè dữ liệu ở root mới |
| 4 | cả hai root tồn tại = conflict | rơi vào `conflicts` **không** rơi vào `moves`; cả hai marker sống | hai bản cài lặng lẽ nối vào một thư mục, không backup, không hỏi |
| 5 | `install-id` sống sót | đọc UUID cũ, apply, đọc UUID mới, **hai chuỗi bằng nhau** và khớp giá trị gieo | họ thành bản cài mới, broker và lịch sử chi phí quay về zero |
| 6 | profile có tên đi cùng root | gieo `<root>/profiles/work/agent/`, apply, assert thư mục hiện diện và đọc được dưới root mới | profile có tên resolve về thư mục rỗng, tưởng đã mất lịch sử |

Hình dạng thật của các path, đã đọc từ `dirs.ts`:
- `install-id` — `dirs.ts:1096` `const INSTALL_ID_FILE = "install-id";`, ghi tại `dirs.ts:1126` `path.join(getBaseConfigRoot(), INSTALL_ID_FILE)`.
- profile — `dirs.ts:313-315` `getConfigAgentDirName()`: `path.join(getConfigDirName(), "profiles", profile, "agent")`.

**Hai case thêm** (nhánh khác, vòng lặp tham số hoá ở đây là đúng vì mỗi dòng một đường code): biến XDG không set → không root XDG nào trong plan; `platform: "win32"` → cũng không (chốn ở `dirs.ts:365`).

**KHÔNG thêm:** test assert action list chứa `"migrate"`, test assert help text, hay bất kỳ source-grep nào lên file hiện thực — đúng là static-echo mà AGENTS.md cấm.

### 4.2 `packages/coding-agent/test/config-migrate-cli.test.ts` — 3 case

`omp config migrate` được chấp nhận + in plan + không đụng đĩa; `--apply` thì di chuyển; `--apply` lần hai báo 0 moves và thoát 0.

Harness tái dùng được, đã đọc: `packages/coding-agent/test/config-cli.test.ts` — import dòng 1-6 ✓ (trong đó `resetSettingsForTest` từ `config/settings.ts:3746` ✓, lớp `TempDir` tại `packages/utils/src/temp.ts:6` ✓), `const cliEntry = path.join(import.meta.dir, "..", "src", "cli.ts")` ở dòng 11, `interface CliProcessResult` ở **13-17** (W5 ghi 12-16), `runCliProcess` ở **19-29** (W5 ghi 19-28), gọi `Bun.spawn([process.execPath, cliEntry, ...args])` ở dòng 20.

Assert trên argv và output của tiến trình con. **Đừng** giả định binary `omp` trên PATH.

---

## 5. Cổng

### 5.1 Cổng A — `bun test packages/utils/test/config-migrate.test.ts`

**Có, ĐỎ ĐƯỢC — và tôi đã đo cả hai chiều:**

- **Đỏ trước công việc:** hôm nay, file không tồn tại → **EXIT=1**, `Tests need ".test", "_test_", ".spec" or "_spec_" in the filename`.
- **Xanh sau công việc:** `bun test packages/utils/test/install-id.test.ts` cùng package → **5 pass / 0 fail / 11 expect, EXIT=0**.

### 5.2 Cổng B — `bun run check:ts`

**ĐỎ ĐƯỢC, nhưng yếu hơn W5 tự nhận — và cần một cảnh báo vận hành.**

Đo: **EXIT=0, 97s wall** (W5 ghi ~40s). Neo đúng là `package.json:90`, không phải 94.

**Cảnh báo vận hành quan trọng:** lần chạy đầu tiên của tôi **ĐỎ** — không phải vì W5, mà vì `packages/coding-agent/test/pi-scope-aliases.test.ts` bị sửa trong working tree lúc đó và `oxfmt --check` fail. Khi cây sạch, `bun run check:tools` xanh ("All matched files use the correct format") và `check:ts` exit 0. Có tiếng rì rào `oxlint` warning ở `mcp-project-config-not-trusted-by-default.test.ts:19` (`getConfigRootDir` imported nhưng không dùng) — đó là **warning**, `oxlint` vẫn exit 0.

→ **Trước khi chạy cổng này, dừng lại và làm sạch working tree.** Repo này đang có `.lavish-wip/` untracked lớn và agent khác có thể đang sửa file. Đỏ vì file người khác đang sửa là cách tệ nhất để "cổng đỏ được" bị hiểu sai.

### 5.3 Cổng C — `bun test packages/coding-agent/test/config-migrate-cli.test.ts`

**W5 nói KHÔNG dùng được. Tôi đo thì NGƯỢC LẠI — nó chạy được, và nên được thăng lên làm cổng thứ hai.**

Đo: `bun test packages/coding-agent/test/config-cli.test.ts` → **11 pass / 0 fail / 40 expect, EXIT=0**. Addon native **đã build**: `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại. `ninja` cũng đã có ở `/opt/homebrew/bin/ninja`.

Vì vậy lệnh `brew install ninja` + `bun --cwd=packages/natives run build` trong phần *Xác minh* của W5 là **việc đã xong** — chạy lại là thừa.

**Cổng C có đỏ được không:** có, theo đúng nghĩa — file test không tồn tại thì `bun test` exit 1; test tồn tại mà CLI không nhận `migrate` thì usage error; `--apply` không nối dây thì case 2 đỏ. Nó phân biệt được "W5 sai" với "W5 xong" **ngay bây giờ**, không cần tiền đề nào.

### 5.4 Đối chứng mà W5 dựa vào — **đã hỏng, đừng trích lại**

W5 lập luận cổng phải nằm ở `packages/utils` và **phải** import bằng subpath, vì "import barrel kéo `@oh-my-pi/pi-natives` vào đồ thị". Tôi đã kiểm bằng hai file thăm dò (đã xoá sau khi đo):

| thăm dò | kết quả |
| --- | --- |
| `import { APP_NAME } from "@oh-my-pi/pi-utils";` (barrel) trong `packages/utils/test/` | **1 pass / 0 fail, EXIT=0** |
| `import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";` (subpath) | **1 pass / 0 fail, EXIT=0** |

Cả hai đều chạy. Lý do W5 nêu đã không còn tác dụng, vì addon đã build. Và lý do **cụ thể** mà W5 đưa ra cũng sai ngay từ đầu: W5 khẳng định `packages/utils/src/dirs.ts` "có zero import `@oh-my-pi/pi-natives`" — **SAI**. `dirs.ts:17` có `import { expandWindowsLongPath } from "@oh-my-pi/pi-natives/path";`.

**Danh sách 4 file utils import pi-natives của W5 (`file-lock.ts:9`, `mermaid-ascii.ts:1`, `procmgr.ts:3`, `ptree.ts:10`) thì ĐÚNG** — tôi đã xác nhận cả bốn. Chỉ có `dirs.ts` bị bỏ sót khỏi danh sách, và chính nó là file W5 dùng làm bằng chứng.

→ Import subpath **vẫn nên giữ** (bảo vệ test khỏi phụ thuộc đồ thị, và rẻ hơn), nhưng **đừng viết nó vào PR như một ràng buộc kỹ thuật bắt buộc** — nó không bắt được gì trên máy này.

### 5.5 Cổng D — nghiệm thu thủ công

`omp config migrate` → in plan, không đụng gì, thoát 0. `--apply` → di chuyển, thoát 0. `--apply` lần hai → 0 moves, thoát 0. `omp config path` sau đó resolve dưới root mới.

**Cổng thủ công KHÔNG tự đỏ được** — phải có người chạy. Ghi nó vào PR như một mục nghiệm thu, đừng ghi như một lệnh đã pass.

### 5.6 Bảng tổng kết cổng

| cổng | lệnh | đỏ được? | bằng cách nào | đo được hôm nay |
| --- | --- | --- | --- | --- |
| A (chính) | `bun test packages/utils/test/config-migrate.test.ts` | **CÓ** | file vắng → EXIT=1; hiện thực sai → case 2/3/4 đỏ | EXIT=1 khi vắng ✓ |
| A′ (đối chứng) | `bun test packages/utils/test/install-id.test.ts` | n/a | chứng minh "xanh" ở A là xanh thật | 5 pass, EXIT=0 ✓ |
| B | `bun run check:ts` | **CÓ, nhưng yếu** | bỏ sót site → typecheck **không** đỏ. Đỏ được vì syntax/typing sai thật | EXIT=0, 97s ✓ |
| C | `bun test packages/coding-agent/test/config-migrate-cli.test.ts` | **CÓ** | file vắng → EXIT=1; CLI không nhận `migrate` → usage error | chạy được ✓ (W5 nói ngược lại) |
| D | nghiệm thu tay | **KHÔNG** | cần người | — |

---

## 6. Cạm bẫy riêng của W5

### 6.1 Bốn site flag — chỉ **một** trong bốn là gánh thật

`parseConfigArgs` (`config-cli.ts:72`) và `printConfigHelp` (`config-cli.ts:405`) đều có **zero caller** — tôi đã `rg` toàn `packages/`, chỉ thấy chính dòng định nghĩa. Đường thật cho `omp config migrate --apply` là `commands/config.ts` → `Config.run()` → `static flags` → `runConfigCommand(cmd)`, và class này được nạp tại `packages/coding-agent/src/cli-commands.ts:99`.

Hệ quả: site sửa (6) — thêm `else if (arg === "--apply")` vào `parseConfigArgs` — là **code chết**. W5 nói bỏ sót nó nghĩa là "`--apply` lặng lẽ không tồn tại"; điều đó **sai**. Bỏ sót nó chỉ nghĩa là `parseConfigArgs` không cập nhật.

→ Vẫn nên sửa (giữ hai parser đồng bộ, và sau này `printConfigHelp`/`parseConfigArgs` có thể được nối lại), nhưng **đừng dùng nó làm bằng chứng** rằng `--apply` đã nối. Bằng chứng đúng là site (2)+(3) trong `commands/config.ts` và site `handleMigrate` nhận `cmd.flags.apply`.

### 6.2 `printConfigHelp` dùng 2 SPACE, phần còn lại dùng TAB

`cat -A` trên khối help cho thấy các dòng lệnh help bắt đầu bằng `··` (hai SPACE), trong khi `├──┤console.log` là TAB. Dòng 414 phải viết bằng **2 SPACE** cho khớp cột. Nhưng `.oxfmtrc.json` đặt `useTabs: true, tabWidth: 3` và `oxfmt --check` (chạy trong `check:tools`, tiền thề của cổng B) đang pass file này vì nội dung nằm trong template literal mà oxfmt không đụng tới. Viết bằng TAB sẽ **lệch cột** nhưng không làm oxfmt đỏ. Viết bằng SPACE trong code thì oxfmt đỏ.

→ Cân đối 2 SPACE theo hàng 414, nhưng **đừng** chỉ vì thế mà dùng SPACE cho `apply:` trong `static flags` hay `apply: flags.apply,` trong `cmd` — hai chỗ đó phải là TAB. Bằng chứng: `sed -n '32p' commands/config.ts | hexdump -C` → `09 09 6a 73 6f 6e` (hai TAB rồi `json:`), và `grep -cP '^\t'` → 35 với `grep -cP '^    '` → 0.

### 6.3 `movePath` không lift một mình được — nó dùng `codeOf`

`codeOf` định nghĩa tại `gc-cli.ts:222`:

```ts
function codeOf(error: unknown): string | undefined {
	return typeof error === "object" && error !== null && "code" in error
		? String((error as { code?: unknown }).code)
		: undefined;
}
```

Lift `movePath` mà không mang theo `codeOf` (hoặc viết lại inline) là build break. `gc-cli.ts` vẫn cần `codeOf` cho code khác — kiểm tra trước khi xoá.

### 6.4 W4 chưa xuống đất, và bước 1 của W5 nói phải dừng

`getConfigWriteRoot` và `getConfigDirCandidates` đều không tồn tại. `APP_NAME` vẫn là `"omp"` (`dirs.ts:22`), `CONFIG_DIR_NAME` vẫn là `".omp"` (`dirs.ts:28`). Bước 1 của W5: *"Nếu thiếu W4 thì dừng; đừng bịa tên mới ở đây."*

Điểm đáng nói: engine của W5 nhận `oldBaseName`/`newAppName` qua tham số nên **không** phụ thuộc kỹ thuật vào symbol của W4. Sự phụ thuộc là về **tên**: `newBaseName` phải là `".ultraworkers"` và `newAppName` phải là `"ultraworkers"`, và hai giá trị đó chỉ được chốt ở W6 (`plan` dòng 1452: `export const CONFIG_DIR_NAME: string = ".ultraworkers";`) và W3. Vì W6 **cố ý** chạy sau, tới lúc W5 chạy thì tên mới vẫn chưa tồn tại trong hằng số.

→ Đây là mâu thuẫn thứ tự thật sự trong W5, không phải chi tiết vụn vặt. Cách thoát sạch: **hard-code hai tên trong test** (`".omp"` / `"omp"` và `".ultraworkers"` / `"ultraworkers"` — chúng là hằng số của test, không phải bịa tên trong mã sản phẩm), và để `handleMigrate` truyền tên từ `dirs.ts`. Nhưng khi đó `migrate` sẽ là no-op vì `CONFIG_DIR_NAME` còn là `".omp"` — tức là **`--apply` sẽ không làm gì cho tới khi W6 lật tên**. Phải nói thẳng điều này trong mô tả PR; nếu không, test xanh sẽ bị đọc là "tính năng chạy" trong khi nó không chạy.

### 6.5 Neo `dirs.ts:27` trỏ vào doc comment — đừng sửa nhầm

`dirs.ts:27` là `/** Config directory name (e.g. ".omp") */`. Khai báo ở **28**. Nếu kỹ sư tin neo và ghi vào dòng 27, họ chèn text vào giữa một doc comment — và ở W6, hậu quả là hằng số **không** đổi trong khi review vẫn tưởng đã đổi. Đây là loại lỗi im lặng đúng như W5 cảnh báo ở W6, chỉ là xảy ra sớm hơn một bước.

### 6.6 Ba nơi trong W5 tự mâu thuẫn với nhau về addon

Cùng một tài liệu, ba câu không thể đồng thời đúng:

- dòng 1164: *"File này KHÔNG chạy được trên máy này."*
- dòng 1340: *"Trên máy chưa build addon nó thoát 1 (đã kiểm chứng: 0 pass / 1 fail / 1 error…)"*
- dòng 1556 (mục W6, đã được sửa): *"Native addon **đã** được build (`packages/natives/native/` có `pi_natives.darwin-arm64.node`), nên cổng thật của W6 trong `packages/coding-agent` **chạy được**."*

Đo đạc ủng hộ câu thứ ba. W5 là phần **chưa** được sửa. Khi viết PR, đừng dẫn lại dòng 1164 hay 1340.

### 6.7 `install-id` nằm ở base root, không nằm ở XDG root

`getInstallId()` ghi vào `path.join(getBaseConfigRoot(), INSTALL_ID_FILE)` (`dirs.ts:1126`). Case 5 của test chỉ nên seed và assert trên **base** root. Nếu bạn cũng seed `install-id` dưới XDG root, bạn đang test thứ không tồn tại — và case đó sẽ xanh vì lý do sai.

### 6.8 Cùng một tên cho cả XDG lúc gieo = test xanh trong khi hành vi thật hỏng

Đây là bẫy tinh vi nhất của W5 và plan đã gọi tên đúng. Nếu bạn gieo XDG root bằng `path.join(xdgHome, oldBaseName)` (tức `.omp`) thay vì `path.join(xdgHome, "omp")`, case 2 vẫn xanh — vì engine tìm `path.join(xdgHome, oldAppName)` sẽ không thấy gì và bỏ qua, còn `moved` vẫn bằng… 1, không phải 4, nên case **có** đỏ. Nhưng nếu bạn đồng thời nới lỏng assert, nó xanh im lặng. Gieo đúng `omp` không dấu chấm cho XDG, `.omp` có dấu chấm cho base.

---

## 7. Báo cáo kiểm tra neo

### 7.1 Neo sai — 13 mục

| neo trong W5 | W5 nói nó là gì | Thực tế | Nên trỏ tới |
| --- | --- | --- | --- |
| `dirs.ts:21` | `APP_NAME` | `/** App name (e.g. "omp") */` | `dirs.ts:22` |
| `dirs.ts:27` | `CONFIG_DIR_NAME` | `/** Config directory name (e.g. ".omp") */` | `dirs.ts:28` |
| `dirs.ts:114-115` | thân `getBaseConfigRoot()` | 114 = doc, 115 = chữ ký | `dirs.ts:115-117` |
| `dirs.ts:355` | chốn `linux \|\| darwin` | dòng comment `// Why: if we consulted…` | `dirs.ts:365` |
| `dirs.ts:360` | `const appRoot = path.join(value, APP_NAME);` | dòng comment `// is decided at first activation…` | `dirs.ts:370` |
| `dirs.ts:297` (bước 1) | điểm W4 chạm | `*/` | `dirs.ts:307-309` |
| `utils/package.json:36-39` | export `"./*"` | khối `"./ar"` | `package.json:39-42` |
| `package.json:94` (bước 8) | script `check:ts` | `"lint:ts": …` | `package.json:90` |
| `config-cli.ts:93-101` | vòng lặp flag | 93 = `const positionalArgs` | `config-cli.ts:94-101` |
| `config-cli.ts:93` | nhánh `--json` | `}` đóng khối trước | `config-cli.ts:96-97` |
| `render-utils.ts:902` | `shortenPath` | không phải hàm đó | `render-utils.ts:926` |
| `config-cli.test.ts:12-16` | `interface CliProcessResult` | dòng trắng ở 12 | `config-cli.test.ts:13-17` |
| `config-cli.test.ts:19-28` | `runCliProcess` | thiếu dòng đóng | `config-cli.test.ts:19-29` |

### 7.2 Phát biểu bị bác — 6 mục

| phát biểu trong W5 | đo được |
| --- | --- |
| `dirs.ts` "có zero import `@oh-my-pi/pi-natives`" | sai — `dirs.ts:17` có |
| "File này KHÔNG chạy được trên máy này" (test CLI) | sai — `config-cli.test.ts` → 11 pass, EXIT=0 |
| "`bun test …config-cli.test.ts` → 0 pass / 1 fail / 1 error, EXIT=1" | sai — 11 pass, EXIT=0 |
| "`bun --cwd=packages/natives run build` FAIL nếu thiếu ninja" | `ninja` đã có ở `/opt/homebrew/bin/ninja`; addon đã build |
| `check:ts` "~40s wall" | 97s |
| "bỏ sót site flag ⇒ `--apply` lặng lẽ không tồn tại" | site đó nằm trong `parseConfigArgs`, **zero caller** |

### 7.3 Neo đúng — 26 mục

`dirs.ts:22` (`APP_NAME` theo giá trị), `file-lock.ts:9`, `mermaid-ascii.ts:1`, `procmgr.ts:3`, `ptree.ts:10`, `gc-cli.ts:528` / `:673` / `:682`, `config-cli.ts:8` / `:14` / `:20` / `:26-28` / `:66` / `:72` / `:166` / `:182` / `:405` / `:414`, `commands/config.ts:10` / `:18` / `:31-33` / `:40-47` / `:44-46` / `:50`, `init-xdg.ts:21`, `temp.ts:6`, `settings.ts:3746`, `config-cli.test.ts:1-6`, `config-cli.test.ts:20` (`Bun.spawn([process.execPath, cliEntry, ...args])`).

### 7.4 Không có tiền lệ để sao chép

Cây tham chiếu: `pi-ref`, `deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref`, `senpi-ref` — tất cả đều tồn tại. `pi-ref`, `deepseek-harness`, `senpi-ref`: không có gì. `gajae-ref` là fork cùng dòng (hằng số `APP_NAME = "gjc"` tại `dirs.ts:31`) và doc comment của nó cũng nói *"requires running `gjc config migrate` first"* — nghĩa là lệnh đó **được tài liệu hoá nhưng chưa hiện thực**, y hệt omp. `claude-code-ref` chỉ có `migrateConfigFields` (đổi tên field trong object, không phải di chuyển thư mục). Không có mã nguồn nào để mượn.

---

## 8. Lệnh

```bash
# Tiền đề — làm sạch cây trước, nếu không check:ts đỏ vì lý do không liên quan
git status --short

# Cổng A (chính) — đo trước công việc
bun test packages/utils/test/config-migrate.test.ts   # EXIT=1 hôm nay
bun test packages/utils/test/install-id.test.ts       # 5 pass, EXIT=0

# Cổng B
bun run check:ts                                       # EXIT=0, ~97s

# Cổng C (W5 nói không dùng được — tôi đo thì chạy được)
bun test packages/coding-agent/test/config-migrate-cli.test.ts

# Sau khi thêm file
bun test packages/utils/test/config-migrate.test.ts   # 6+ pass, EXIT=0
bun test packages/utils/test/config-migrate.test.ts   # chạy lại lần hai, vẫn EXIT=0
```

**TUYỆT ĐỐI không dùng `tsc` / `npx tsc`.** Dùng `bun run check:ts`.
