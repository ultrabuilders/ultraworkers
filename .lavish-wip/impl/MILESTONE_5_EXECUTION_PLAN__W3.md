# Phiếu triển khai — W3: Hằng số lớp hiển thị + dọn literal trùng lặp

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md` mục `## W3.` (dòng 705–936)
**HEAD khi viết phiếu:** `47720fd` (`docs(plans): the native addon is built, so "bun test is blocked" is false`)
**Ngày kiểm:** 2026-09-29

---

## 1. Cái gì thay đổi, quan sát được

Người dùng chạy `omp` sẽ thấy ứng dụng tự giới thiệu bằng **một** tên duy nhất lấy từ hằng số `APP_NAME`: tiêu đề toast desktop (notify-send `--app-name`, gdbus), tên app và id trong chuỗi OSC99 (`f=<base64(tên)>`, `i=<tên>-1`), tiêu đề khung setup-composer, tên file log xoay vòng (`<tên>.<ngày>.<pid>.log`) và file audit (`.<tên>.<pid>-audit.json`) — thay vì 9 literal `"omp"` rải rác ở 6 file nguồn.

> **Bắt buộc trước khi gõ dòng đầu tiên:** tên mới CHƯA được chốt, và `APP_NAME` đang kiêm luôn chức năng *đường dẫn XDG* chứ không chỉ tên hiển thị. Xem mục **Cổng 0** và **Cạm bẫy A**.

---

## 2. Kết quả kiểm lại từng neo

Có **34 neo** trong W3. Tôi đã mở từng dòng bằng `sed -n "<n>p"` / `rg -n` / `sed -n '<a>,<b>p'`.

**Nguyên nhân gốc của mọi sai lệch:** W3 ghi "đã kiểm chứng lại bằng `git diff --name-only 808b365..HEAD` → rỗng". Câu đó **không còn đúng** — lệnh đó giờ trả về 4 file khác 0:

```
$ git diff --name-only 808b365..HEAD -- <11 file W3 chạm tới>
packages/tui/test/desktop-notify.test.ts
packages/utils/src/dirs.ts
packages/utils/test/dirs.test.ts
packages/utils/test/logger-contract.test.ts
```

`dirs.ts` **+28 dòng**, `dirs.test.ts` **+14**, `logger-contract.test.ts` **−41**, `desktop-notify.test.ts` **−6**. Mọi neo trong 4 file đó đã trượt. Riêng `dirs.ts` trượt **tới 20 dòng**.

### 2.1. Neo ĐÚNG (giữ nguyên, dùng được)

| Neo | Nội dung thật đã đọc |
| --- | --- |
| `packages/utils/src/logger.ts:17` | `import { getLogsDir } from "./dirs";` |
| `packages/utils/src/logger.ts:56` | `const PROCESS_LOG_PATTERN = /^omp\.(\d{4}-\d{2}-\d{2})\.(\d+)\.log(?:\.(\d+))?$/;` |
| `packages/utils/src/logger.ts:57` | `const PROCESS_AUDIT_PATTERN = /^\.omp\.(\d+)-audit\.json$/;` |
| `packages/utils/src/logger.ts:77` | `function pruneStaleProcessLogs(dir: string): void {` |
| `packages/utils/src/logger.ts:251` | `function makeFileTransport(dir?: string): RotatingFileSink {` |
| `packages/utils/src/logger.ts:256` | `filenamePrefix: "omp",` |
| `packages/utils/src/logger.ts:260` | `auditFile: path.join(logsDir, \`.omp.${process.pid}-audit.json\`),` |
| `packages/utils/src/logger.ts:304` | `export function setTransports(opts: {...}): void {` |
| `packages/coding-agent/src/cli/commands/init-xdg.ts:5` | `const APP_NAME = "omp";` |
| `packages/coding-agent/src/cli/commands/init-xdg.ts:17` | `const dirs = [path.join(dataHome, APP_NAME), path.join(stateHome, APP_NAME), path.join(cacheHome, APP_NAME)];` |
| `packages/coding-agent/src/cli/commands/init-xdg.ts:21`, `:24-26` | `console.log(\`Created ${dir.replace(os.homedir(), "~")}\`);` / 3 dòng `console.log` phần dưới |
| `packages/tui/src/desktop-notify.ts:29` | `const APP_NAME = "omp";` (dòng 28 là doc comment) |
| `packages/tui/src/desktop-notify.ts:114,116,141,154` | 4 chỗ dùng `APP_NAME` |
| `packages/tui/src/terminal-capabilities.ts:2` | `import { $env, isBunTestRuntime, ... } from "@oh-my-pi/pi-utils/env";` |
| `packages/tui/src/terminal-capabilities.ts:45` | `const CMUX_NOTIFICATION_TITLE = "omp";` (dùng ở `:50, :51, :111`) |
| `packages/tui/src/terminal-capabilities.ts:1436` | `const OSC99_APP_NAME = "omp";` |
| `packages/tui/src/terminal-capabilities.ts:1450` | ``return sanitizeOsc99Id(id) \|\| `omp-${nextOsc99NotificationId++}`;`` |
| `packages/tui/src/overlays/composer-shape-preview.ts:45` | `const PREVIEW_TITLE = "omp";` (dùng ở `:62, :64, :66, :111`) |
| `packages/coding-agent/src/cli/args.ts:5` | `import { $env, APP_NAME, logger } from "@oh-my-pi/pi-utils";` |
| `packages/coding-agent/src/cli/grep-cli.ts:8` | `import { APP_NAME } from "@oh-my-pi/pi-utils";` |
| `packages/coding-agent/src/cli/config-cli.ts:8` | `import { APP_NAME, getAgentDir, isRecord } from "@oh-my-pi/pi-utils";` |
| `packages/tui/src/setup/wizard-overlay.ts:8` | `import { APP_NAME } from "@oh-my-pi/pi-utils";` |
| `packages/utils/src/index.ts:5` | `export * from "./dirs";` |
| `packages/utils/src/stderr-guard.ts:105` | `const redirectPath = options?.redirectPath ?? getLogPath();` |
| `packages/utils/src/logger/rotating-file.ts:136-145` | `#setActivePath(day, index)` dựng `${this.#filenamePrefix}.${day}.${this.#filenameSuffix}.log${suffix}` |
| `packages/utils/src/logger/rotating-file.ts:153-157` | `while (this.#files.length > this.#maxFiles) { … fs.rmSync(removed.name, { force: true }); }` |
| `packages/coding-agent/src/debug/report-bundle.ts:208` | `return readLastLines(getLogPath(), MAX_LOG_LINES);` |
| `packages/coding-agent/src/debug/report-bundle.ts:253` | `const todayPath = getLogPath();` |
| `packages/ai/src/providers/pi-native-client.ts:127` | `"x-omp-app": getAppName(),` |
| `packages/tui/test/composer-shape-preview.test.ts:45,49,54,59,65,70,76` | cả 7 dòng đều là `expect(...).toContain("omp");` |
| `packages/tui/test/terminal-capabilities.test.ts` | file tồn tại (29 KB), đã import `NotifyProtocol`, `TerminalInfo`; **chưa** import `setOsc99Supported` |

### 2.2. Neo HỎNG — phải tự tìm lại khi gõ

| Neo trong W3 | Nội dung thật ở dòng đó | Vị trí ĐÚNG | Sai lệch |
| --- | --- | --- | --- |
| `dirs.ts:21` (`APP_NAME`) | `/** App name (e.g. "omp") */` | **`:22`** `export const APP_NAME: string = "omp";` | +1 |
| `dirs.ts:24` (`APP_URL`) | doc comment của `APP_URL` | `:25` | +1 |
| `dirs.ts:27` (`CONFIG_DIR_NAME`) | doc comment | `:28` | +1 |
| `dirs.ts:36` (`USER_AGENT`) | doc comment | `:37` | +1 |
| `dirs.ts:360` (`appRoot`) | comment "// is decided at first activation…" | **`:370`** `const appRoot = path.join(value, APP_NAME);` | **+10** |
| `dirs.ts:609` (doc comment log) | `return dirs.rootSubdir("reports", "state");` | **`:619`** `the rotating sink's file naming: log files are named \`omp.<day>.<pid>.log\`` | **+10** |
| `dirs.ts:620-622` (`getLogPath`) | phần đuôi doc comment `localDay` | **`:630-631`** | **+10** |
| `dirs.ts:621` (`return path.join(getLogsDir(), \`${APP_NAME}…\`)`) | doc comment | **`:631`** | +10 |
| `dirs.ts:748` (autoqa.db) | doc comment browser-profiles | **`:758-760`** (`getAutoQaDbPath`) | +10 |
| `dirs.ts:890/894` (cache) | `:890` = doc comment `last-changelog-version`; `:894` trống | cache thật ở `:740, :755, :788, :807, :912, :916` (grep `"cache"`) | **sai nội dung** |
| `dirs.ts:956` (`getCrashLogPath`) | `return dirs.agentSubdir(agentDir, "memories", "state");` | **`:975-976`** `export function getCrashLogPath` / `return dirs.agentSubdir(agentDir, "omp-crash.log", "state");` | **+19** |
| `dirs.ts:960` (`getDebugLogPath`) | `export function getTerminalSessionsDir` | **`:980-981`** | +20 |
| `dirs.ts:983` (secret-placeholder.key) | dòng trống | **`:1003-1006`** | +20 |
| `dirs.ts:990` (run/daemons) | ` */` | **`:1015-1017`** | +25 |
| `dirs.ts:1078` (doc `OMP_APP_NAME`) | `}` đóng hàm | **`:1098`** doc comment `getAppName` | +20 |
| `dirs.ts:1085` (`return value ? value : "omp";`) | `return path.join(getAgentDir(), "ssh.json");` | **`:1105`** | **+20** |
| `dirs.ts:1083-1086` (code shape) | — | **`:1104-1105`** | +21 |
| `main.ts:285` (dòng gợi ý log) | `function armStartupWatchdog(): void {` | **`:293`** `` `  logs: ${getLogPath()} · re-run with PI_DEBUG_STARTUP=1…` `` | +8 |
| `utils/test/logger-contract.test.ts:77` | `.sort();` | **`:76`** regex `/^omp\.\d{4}-…/` | +1 |
| `utils/test/logger-contract.test.ts:105` | `const expected = [` | **`:104`** | +1 |
| `utils/test/logger-contract.test.ts:135` | `});` | **`:134`** | +1 |
| `utils/test/logger-contract.test.ts:286` | `expect(await logFileNames(…)).toEqual(expectedNames);` | **`:285`** | +1 |
| `utils/test/logger-contract.test.ts:296` | `const audit = JSON.parse(await fs.readFile(auditPath, "utf8"))` | **`:295`** | +1 |
| `utils/test/logger-contract.test.ts:313` | `const rotatedName = \`${baseName}.1\`;` | **`:312`** | +1 |
| `utils/test/logger-contract.test.ts:333` | `) as AuditFile;` | **`:332`** | +1 |
| `utils/test/logger-contract.test.ts:38-73` (`runScenario`) | — | **`:34-72`** | +4 |
| `utils/test/dirs.test.ts:82` | dòng trống | **`:96`** | **+14** |
| `tui/test/desktop-notify.test.ts:114,117,132,144,147,153,163,166,202` | `:114`=`]);`, `:117`=`expect(`, `:202`=`expect(opts.stdin)…` | **`:108, 111, 126, 138, 141, 147, 157, 160, 196`** | **+6** |
| `packages/ai/src/auth-broker/remote-store.ts:1314-1315` (khoá usage) | `#raceWithSignal<T>(…)` | **`:1415-1417`** `const identity = client ?? { installId: getInstallId(), … app: getAppName() };` và `` const key = `${identity.installId}\u0000${identity.app ?? ""}\u0000${entry.provider}\u0000${entry.model}`; `` | +101 |
| `relay/server.ts:55` (DEFAULT_GROUP) | — | **`packages/coding-agent/src/tools/browser/relay/server.ts:55`** `const DEFAULT_GROUP = { title: "omp", color: "cyan" } as const;` | plan ghi thiếu `src/tools/browser/` |

**Hệ quả:** đếm literal trong `desktop-notify.test.ts` vẫn là **9** (`grep -c '"omp"'` → 9) và trong `dirs.test.ts` vẫn là **2**. Tổng assertion ghim literal vẫn **24** như W3 nói — nhưng tọa độ sai.

---

## 3. Bảng điểm sửa

TRƯỚC trích nguyên văn từ file thật (đã `sed -n` đọc).

| # | Đường/dẫn | Symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- | --- |
| 1 | `packages/utils/src/dirs.ts:22` | `APP_NAME` | `export const APP_NAME: string = "omp";` | `export const APP_NAME: string = "<TÊN-MỚI>";` |
| 2 | `packages/utils/src/dirs.ts:370` | `appRoot` trong `resolveIf` | `const appRoot = path.join(value, APP_NAME);` | `const appRoot = path.join(value, XDG_DIR_NAME);` — **chỉ khi Cổng 0 trả lời (b)** |
| 3 | `packages/utils/src/dirs.ts:619` | doc `localDay` | `* the rotating sink's file naming: log files are named \`omp.<day>.<pid>.log\`` | `* the rotating sink's file naming: log files are named \`<APP_NAME>.<day>.<pid>.log\`` |
| 4 | `packages/utils/src/dirs.ts:976` | `getCrashLogPath` | `return dirs.agentSubdir(agentDir, "omp-crash.log", "state");` | `return dirs.agentSubdir(agentDir, \`${APP_NAME}-crash.log\`, "state");` |
| 5 | `packages/utils/src/dirs.ts:1105` | `getAppName` | `return value ? value : "omp";` | `return value ? value : APP_NAME;` |
| 6 | `packages/utils/src/logger.ts:17` | import | `import { getLogsDir } from "./dirs";` | `import { APP_NAME, getLogsDir } from "./dirs";` |
| 7 | `packages/utils/src/logger.ts:56-57` | 2 regex prune | `const PROCESS_LOG_PATTERN = /^omp\.(…)$/;`<br>`const PROCESS_AUDIT_PATTERN = /^\.omp\.(…)$/;` | `const APP_NAME_RE = APP_NAME.replace(/[.*+?^${}()\|[\]\\]/g, "\\$&");`<br>`const PROCESS_LOG_PATTERN = new RegExp(\`^${APP_NAME_RE}\\.(\\d{4}-\\d{2}-\\d{2})\\.(\\d+)\\.log(?:\\.(\\d+))?$\`);`<br>`const PROCESS_AUDIT_PATTERN = new RegExp(\`^\\.${APP_NAME_RE}\\.(\\d+)-audit\\.json$\`);` |
| 8 | `packages/utils/src/logger.ts:256` | `makeFileTransport` | `filenamePrefix: "omp",` | `filenamePrefix: APP_NAME,` |
| 9 | `packages/utils/src/logger.ts:260` | `makeFileTransport` | `auditFile: path.join(logsDir, \`.omp.${process.pid}-audit.json\`),` | `auditFile: path.join(logsDir, \`.${APP_NAME}.${process.pid}-audit.json\`),` |
| 10 | `packages/coding-agent/src/cli/commands/init-xdg.ts:1,5` | shadow | `const APP_NAME = "omp";` | xoá dòng 5, thêm `import { APP_NAME } from "@oh-my-pi/pi-utils";` ở dòng 1 |
| 11 | `packages/tui/src/desktop-notify.ts:29` | shadow | `const APP_NAME = "omp";` | xoá, thêm `import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";` |
| 12 | `packages/tui/src/terminal-capabilities.ts:2` | import | `import { $env, … } from "@oh-my-pi/pi-utils/env";` | thêm `import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";` (dòng mới, không sửa dòng 2) |
| 13 | `packages/tui/src/terminal-capabilities.ts:45` | `CMUX_NOTIFICATION_TITLE` | `const CMUX_NOTIFICATION_TITLE = "omp";` | `const CMUX_NOTIFICATION_TITLE = APP_NAME;` |
| 14 | `packages/tui/src/terminal-capabilities.ts:1436` | `OSC99_APP_NAME` | `const OSC99_APP_NAME = "omp";` | `const OSC99_APP_NAME = APP_NAME;` |
| 15 | `packages/tui/src/terminal-capabilities.ts:1450` | `osc99Id` | `` return sanitizeOsc99Id(id) \|\| `omp-${nextOsc99NotificationId++}`; `` | `` return sanitizeOsc99Id(id) \|\| `${APP_NAME}-${nextOsc99NotificationId++}`; `` |
| 16 | `packages/tui/src/overlays/composer-shape-preview.ts:45` | `PREVIEW_TITLE` | `const PREVIEW_TITLE = "omp";` | `const PREVIEW_TITLE = APP_NAME;` + import |
| 17 | `packages/utils/test/dirs.test.ts:96` | `describe("dated log path")` | `expect(path.basename(getLogPath(date, 123))).toBe("omp.2026-05-31.123.log");` | `expect(path.basename(getLogPath(date, 123))).toBe(\`${APP_NAME}.2026-05-31.123.log\`);` |
| 18 | `packages/utils/test/logger-contract.test.ts:76` | `logFileNames` | `.filter(name => /^omp\.\d{4}-\d{2}-\d{2}\.\d+\.log(?:\.\d+)?$/.test(name))` | `.filter(name => new RegExp(\`^${APP_NAME}\\.\\d{4}-\\d{2}-\\d{2}\\.\\d+\\.log(?:\\.\\d+)?$\`).test(name))` |
| 19 | `logger-contract.test.ts:104` | expect tên file | `` expect(log.name).toBe(`omp.2026-01-01.${result.pid}.log`); `` | `` expect(log.name).toBe(`${APP_NAME}.2026-01-01.${result.pid}.log`); `` |
| 20 | `logger-contract.test.ts:134` | audit | `` expect(await fs.readFile(path.join(result.primaryDir, `.omp.${result.pid}-audit.json`), "utf8")).not.toBe(""); `` | đổi `.omp.` → `` `.${APP_NAME}.` `` |
| 21 | `logger-contract.test.ts:285` | expectedNames | `` const expectedNames = [2,3,4,5,6].map(day => `omp.2026-01-0${day}.${result.pid}.log`); `` | `` … `${APP_NAME}.2026-01-0${day}.${result.pid}.log` … `` |
| 22 | `logger-contract.test.ts:295` | auditPath | `` const auditPath = path.join(result.primaryDir, `.omp.${result.pid}-audit.json`); `` | `` `.${APP_NAME}.${result.pid}-audit.json` `` |
| 23 | `logger-contract.test.ts:312` | baseName | `` const baseName = `omp.2026-01-01.${result.pid}.log`; `` | `` `${APP_NAME}.2026-01-01.${result.pid}.log` `` |
| 24 | `logger-contract.test.ts:332` | audit read | `` await fs.readFile(path.join(result.primaryDir, `.omp.${result.pid}-audit.json`), "utf8"), `` | `` `.${APP_NAME}.${result.pid}-audit.json` `` |
| 25 | `packages/tui/test/desktop-notify.test.ts:108,111,126,138,141,157,160,196` | argv literals | `"omp",` (8 chỗ) | `APP_NAME,` |
| 26 | `packages/tui/test/desktop-notify.test.ts:147` | title literal | `expect(buildDesktopNotifyCommand(gdbus, { title: "omp", body: "ping", urgency: "low" })).toEqual([` | `title: APP_NAME,` |
| 27 | `packages/tui/test/composer-shape-preview.test.ts:45,49,54,59,65,70,76` | 7 assertion | `expect(box).toContain("omp");` | `expect(box).toContain(APP_NAME);` |
| 28 | `packages/tui/test/terminal-capabilities.test.ts` | test OSC99 mới | *(chưa có)* | thêm `it` mới + `afterEach` gọi `setOsc99Supported(false)` |

**Tổng: 28 dòng sửa, 11 file.**

### 3b. Import cần thêm vào từng file test

| File | Import sẽ thêm | Subpath có tồn tại? |
| --- | --- | --- |
| `utils/test/dirs.test.ts` | `APP_NAME` vào khối import sẵn có từ `@oh-my-pi/pi-utils/dirs` (`:6-14`) | ✅ (`"./*": "./src/*.ts"` trong `packages/utils/package.json:39-42`) |
| `utils/test/logger-contract.test.ts` | `import { APP_NAME } from "@oh-my-pi/pi-utils";` | ✅ |
| `tui/test/desktop-notify.test.ts` | `import { APP_NAME } from "@oh-my-pi/pi-utils";` | ✅ (`packages/tui/package.json:46` đã phụ thuộc `@oh-my-pi/pi-utils`) |
| `tui/test/composer-shape-preview.test.ts` | `import { APP_NAME } from "@oh-my-pi/pi-utils";` | ✅ |
| `tui/test/terminal-capabilities.test.ts` | thêm `setOsc99Supported` vào khối import từ `@oh-my-pi/pi-tui/terminal-capabilities` (`:5-…`) | ✅ |

---

## 4. Các bước

### Bước 0 — DỪNG, chốt 2 quyết định (cổng chặn, không phải việc làm sau)

1. **Tên mới của `APP_NAME` là gì?** W3 nói "Plan không nêu. Kỹ sư cần chốt". Giá trị này xuất hiện ở 6 file nguồn + 4 file test. Không tự chọn.
2. **XDG blast radius.** `dirs.ts:370` là `const appRoot = path.join(value, APP_NAME);` và chỉ dùng XDG khi `fs.existsSync(appRoot)`. Đổi `APP_NAME` ⇒ `$XDG_DATA_HOME/<tên-mới>` chưa tồn tại ⇒ rơi về `~/.omp`. Chọn:
   - **(a)** chấp nhận rủi ro (XDG là opt-in),
   - **(b)** tách `XDG_DIR_NAME = "omp"` đóng băng, dùng ở `dirs.ts:370`, `APP_NAME` chỉ cho hiển thị — **khuyến nghị**,
   - **(c)** trì hoãn W3 tới W6.

   Nếu chọn **(b)**: thêm `export const XDG_DIR_NAME: string = "omp";` ngay dưới `APP_NAME` ở `dirs.ts:22`, và sửa bảng điểm #2. Bằng chứng các thứ nằm dưới XDG root: `dirs.ts:758-760` (autoqa.db), `:1003-1006` (secret-placeholder.key), `:1015-1017` (run/daemons), cache ở `:740/:755/:788/:807/:912/:916`.

### Bước 1 — `dirs.ts`, 4 chỗ (neo đã kiểm: `:22`, `:619`, `:976`, `:1105`)

Sửa theo bảng điểm #1, #3, #4, #5. Nếu Bước 0 = (b) thì thêm #2.
**Không** đụng `CONFIG_DIR_NAME` (`dirs.ts:28`), `APP_URL` (`:25`), `USER_AGENT` (`:37`).

### Bước 2 — `logger.ts`, 3 chỗ + 2 regex (neo đã kiểm: `:17`, `:56`, `:57`, `:256`, `:260`)

Sửa #6, #7, #8, #9. **Bắt buộc cùng commit** với Bước 1 — xem Cạm bẫy B.
Escape regex bằng `APP_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")` để tên mới có ký tự regex không vỡ.

### Bước 3 — Xoá 2 hằng số shadow (neo đã kiểm: `init-xdg.ts:5`, `desktop-notify.ts:29`)

`init-xdg.ts`: xoá dòng 5, thêm `import { APP_NAME } from "@oh-my-pi/pi-utils";` ở dòng 1 (trước `import * as fs`). 3 chỗ dùng ở `:17` tự theo; `console.log` ở `:21/:24-26` in giá trị đã join nên không đụng.
`desktop-notify.ts`: xoá dòng 29 (giữ doc comment dòng 28), thêm `import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";`. 4 chỗ dùng ở `:114, :116, :141, :154` tự theo.

### Bước 4 — `terminal-capabilities.ts` + `composer-shape-preview.ts` (neo đã kiểm: `tc:45/:1436/:1450`, `csp:45`)

`terminal-capabilities.ts`: thêm import `APP_NAME` từ `@oh-my-pi/pi-utils/dirs` (dòng 2 đã dùng subpath `/env` nên nhất quán); sửa #13, #14, #15. Dấu gạch nối nằm **ngoài** hằng số: `` `${APP_NAME}-${nextOsc99NotificationId++}` ``.
`composer-shape-preview.ts`: sửa #16 + import. 4 chỗ dùng ở `:62, :64, :66, :111` tự theo.

### Bước 5 — 4 file test, derive từ APP_NAME (KHÔNG ghim lại literal)

- `dirs.test.ts:96` → #17 (1 chỗ)
- `logger-contract.test.ts:76, 104, 134, 285, 295, 312, 332` → #18–#24 (**7 chỗ**)
- `desktop-notify.test.ts:108, 111, 126, 138, 141, 147, 157, 160, 196` → #25, #26 (**9 chỗ**)
- `composer-shape-preview.test.ts:45, 49, 54, 59, 65, 70, 76` → #27 (**7 chỗ**)

Giữ nguyên cấu trúc assertion — chỉ thay chuỗi, để test vẫn kiểm tra **định dạng lệnh** chứ không chỉ echo hằng số.

### Bước 6 — Thêm MỘT test OSC99 vào `terminal-capabilities.test.ts`

```typescript
import { APP_NAME } from "@oh-my-pi/pi-utils";
// bổ sung setOsc99Supported vào khối import terminal-capabilities sẵn có

afterEach(() => setOsc99Supported(false));   // module singleton — BẮT BUỘC

it("labels OSC 99 notifications with the application name", () => {
	setOsc99Supported(true);
	const osc = new TerminalInfo("base", null, true, true, NotifyProtocol.Osc99);
	const formatted = osc.formatNotification({ title: "T", body: "B" });
	expect(formatted).toContain(`f=${Buffer.from(APP_NAME, "utf8").toString("base64")}`);
	expect(formatted).toContain(`i=${APP_NAME}-1`);
});
```

Đường đi đã xác minh: `setOsc99Supported` (`terminal-capabilities.ts:1418`) → `osc99CapabilitiesConfirmed` (`:1415`) → `formatNotification` chỉ rẽ vào `formatOsc99Notification` khi `notifyProtocol === Osc99 && osc99CapabilitiesConfirmed` (`:226`) → `meta = [\`i=${id}\`, \`f=${base64Utf8(OSC99_APP_NAME)}\`]` (`:1535`). `nextOsc99NotificationId` bắt đầu từ `1` (`:1437`) nên `i=${APP_NAME}-1` là đúng. Constructor `TerminalInfo` xác nhận tại `:137-145` (`notifyProtocol` là tham số thứ 5, default `NotifyProtocol.Bell`) → không cần export thêm.

### Bước 7 — Changelog

Thêm vào `packages/utils/CHANGELOG.md` và `packages/tui/CHANGELOG.md`, mục `### Changed` dưới `## [Unreleased]`:
`Renamed the application display name to <tên-mới>; desktop notification title, OSC99 app name/notification id, setup-composer title and rotating log file prefix now derive from a single APP_NAME constant.`
Nếu M5 đã gom changelog về một mục riêng cho cả milestone, ghi rõ "đã gom" để kỹ sư không tự quyết.

---

## 5. Hợp đồng test

**Tên file:** 4 file sửa + 1 file thêm test.

| File | Việc | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| `packages/utils/test/logger-contract.test.ts` | CẬP NHẬT 7 chỗ (`:76, :104, :134, :285, :295, :312, :332`) | `stderr-guard.ts:105` redirect stderr vào `<tên>.<ngày>.<pid>.log`, nhưng khi người dùng báo lỗi, `report-bundle.ts:208/253` đóng gói **file rỗng**; dòng gợi ý ở `main.ts:293` chỉ tới file trống. Người dùng mất toàn bộ log khi cần debug. |
| `packages/utils/test/dirs.test.ts` | CẬP NHẬT `:96` | `getLogPath()` trả basename khác basename rotating sink sinh ra ⇒ log bị ghi vào file không ai đọc. |
| `packages/tui/test/desktop-notify.test.ts` | CẬP NHẬT 9 chỗ (`:108, 111, 126, 138, 141, 147, 157, 160, 196`) | Toast desktop mang tên cũ trong khi app đã đổi tên — đúng lỗi "đổi tên tới mọi nơi trừ chỗ người dùng nhìn thấy". |
| `packages/tui/test/composer-shape-preview.test.ts` | CẬP NHẬT 7 chỗ (`:45, 49, 54, 59, 65, 70, 76`) | Khung setup-composer hiện tên session tạm là `"omp"` cứng, không đổi theo APP_NAME. |
| `packages/tui/test/terminal-capabilities.test.ts` | THÊM 1 test OSC99 | Terminal OSC99 nhận `f=<base64("omp")>` và `i=omp-1` ⇒ app đã tên mới vẫn tự nhận diện là tên cũ trên terminal hỗ trợ OSC 99. |

**Case cụ thể:** (1) đồng bộ basename giữa `getLogPath()` và `RotatingFileSink#setActivePath` cho cùng `(day, pid)`; (2) argv notify-send chứa APP_NAME ở `--app-name` và ở title fallback; gdbus chứa APP_NAME ở đúng vị trí app-name; (3) OSC99 phát `f=base64(APP_NAME)` và `i=<APP_NAME>-1`.

**Không test:** không source-grep `.ts` (AGENTS.md cấm), không đọc `logger.ts` để khẳng định tên file (`makeFileTransport` ở `:251` không export; `setTransports` ở `:304` trả void), không `mock.module()`.

---

## 6. Cổng

### Cổng 0 — chặn (không phải lệnh, nhưng chặn mọi thứ)
Hai quyết định ở Bước 0 phải có trả lời bằng văn bản trước khi sửa dòng nào. Không có câu trả lời ⇒ dừng.

### Cổng 1 — `bun run check:ts` (luôn chạy được)
`bun run check:ts` (`package.json:90` = `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`).
**ĐỎ ĐƯỢC không?** **Có.** Đỏ khi còn hằng số shadow trong `init-xdg.ts`/`desktop-notify.ts`, import sai subpath (`@oh-my-pi/pi-utils/dirs` là subpath thật — `packages/utils/package.json:39-42` có `"./*": "./src/*.ts"`), hoặc chu trình import. Về chu trình: `grep 'from "./logger"' packages/utils/src/dirs.ts` → **rỗng**, nên `dirs.ts` không import logger, không có chu trình.
*Tốn ~10 phút (pi-catalog 298s).*

### Cổng 2 — 4 file test + file mới (CHẠY ĐƯỢC NGAY, đã tự chạy thật)
```bash
cd packages/utils && bun test test/logger-contract.test.ts test/dirs.test.ts test/stderr-guard.test.ts
cd packages/tui   && bun test test/desktop-notify.test.ts test/terminal-capabilities.test.ts test/composer-shape-preview.test.ts
```
**ĐỎ ĐƯỢC không?** **Có — và tôi đã xác nhận nó chạy được trên máy này, không cần build gì thêm.**

> ⚠️ **W3 nói sai tiền đề.** W3 mô tả "Bước 0" rằng `bun test` đỏ vì `Failed to load pi_natives native addon` và phải `brew install ninja` trước. **Điều đó không còn đúng ở HEAD `47720fd`** — commit đó tên chính là *"docs(plans): the native addon is built, so 'bun test is blocked' is false"*. Bằng chứng tôi vừa chạy:
> ```
> $ ls packages/natives/native/pi_natives.darwin-arm64.node   # tồn tại
> $ which ninja   → /opt/homebrew/bin/ninja                  # đã cài
> $ cd packages/tui && bun test test/desktop-notify.test.ts        → 17 pass, 0 fail
> $ cd packages/tui && bun test test/composer-shape-preview.test.ts →  4 pass, 0 fail
> $ cd packages/utils && bun test test/logger-contract.test.ts     → 12 pass, 0 fail
> $ cd packages/utils && bun test test/dirs.test.ts                →  6 pass, 1 skip, 0 fail
> ```
> **Kỹ sư KHÔNG cần chạy Bước 0.** Bỏ nó khỏi PR. Đừng dán đoạn "cổng 2/3 CHƯA TỪNG CHẠY" vào PR — nó không đúng.

Cổng này đỏ khi sửa nguồn mà bỏ sót file test — đúng lỗi W3 cảnh báo. **24 assertion ghim literal** là hợp đồng (7 logger-contract + 1 dirs + 9 desktop-notify + 7 composer-shape-preview).

### Cổng 3 — `bun run ci:test:smoke`
`package.json:119` = `bun packages/coding-agent/src/cli.ts --version && … --smoke-test`.
**ĐỎ ĐƯỢC không?** **Có** — đỏ khi CLI không khởi động hoặc worker không spawn. Đã tồn tại `--smoke-test` tại `packages/coding-agent/src/cli.ts:137`.

### Cổng 4 — thủ công (không tự đỏ, phải người chạy)
```bash
PI_CONFIG_DIR=.omp bun packages/coding-agent/src/cli.ts
ls ~/.omp/logs     # (b) tiền tố mới; (c) file mới vẫn bị prune sau khi tiến trình chết
```
**Cổng này KHÔNG tự đỏ được** — không test tự động nào bắt được. Nếu bỏ bước 5a (2 regex), file log mới **không bao giờ bị prune**: `pruneStaleProcessLogs` (`logger.ts:77`) lấy `pidText` từ chính `PROCESS_LOG_PATTERN`/`PROCESS_AUDIT_PATTERN` rồi `if (!pidText) continue`. `RotatingFileSink#maxFiles: 5` (`rotating-file.ts:153-157`) **không** cứu được — nó chỉ cắt trong `#registerFile` của chính sink đó.
Nếu Bước 0 = (b): thêm kiểm tra XDG — đặt `XDG_DATA_HOME`/`STATE`/`CACHE` trỏ vào thư mục tạm **đã có sẵn** thư mục con tên `"omp"`, chạy lại omp, xác nhận nó **vẫn** dùng thư mục cũ.

### Cổng 5 — phải nói ra trong mô tả PR (không phải lệnh)
Sau khi đổi tên, file `omp.*` cũ **không còn khớp regex** ⇒ prune-stale bỏ qua ⇒ chúng nằm lại vĩnh viễn, không tự thu hồi. Kỹ sư dọn `~/.omp/logs/omp.*` thủ công một lần. **KHÔNG được viết trong PR rằng "file cũ tự biến mất".**

### Tổng kết về cổng
Cả 3 cổng lệnh đều **đỏ được thật** và **đã chạy được ngay** ở HEAD hiện tại. Cổng 4 là cổng thủ công — nếu bỏ bước 5a thì W3 có thể "xanh tất cả" trong khi log tích tụ vô hạn. Đó là lỗ hổng thật duy nhất còn lại, và nó **không** nên được gọi là cổng nếu không kèm câu hỏi bắt buộc trong PR: *"bạn đã kiểm `ls ~/.omp/logs` sau khi đổi tên và xác nhận file mới vẫn bị prune chưa?"*

---

## 7. Cạm bẫy riêng của W3

**A. `APP_NAME` không chỉ là tên hiển thị — nó là đường dẫn.** Đây là cạm bẫy số 1 và là lý do Bước 0 là cổng chặn. `dirs.ts:370` dựng XDG app root bằng chính hằng số này, chỉ dùng XDG khi `fs.existsSync(appRoot)`. Đổi tên ⇒ `$XDG_DATA_HOME/<tên-mới>` chưa tồn tại ⇒ rơi về `~/.omp`. Hậu quả: sessions biến mất khỏi tầm tay, và **secret-placeholder.key bị sinh lại thì giải mã secret cũ hỏng** (`dirs.ts:1003-1006`). W3 đã nêu đúng; chỉ là neo `:360` sai — phải dùng `:370`.

**B. Quên `logger.ts` ⇒ stderr ghi vào file không ai đọc.** `getLogPath()` (`dirs.ts:631`) **đã** dựng tên từ `${APP_NAME}`. Nếu đổi `APP_NAME` mà để `filenamePrefix: "omp"`, `stderr-guard.ts:105` ghi vào `<tên-mới>.<ngày>.<pid>.log` còn `report-bundle.ts:208,253` + `main.ts:293` trỏ tới `omp.…` trống. **Ba thay đổi phải cùng một commit**: `APP_NAME` + `filenamePrefix` + `auditFile`.

**C. Bỏ bước 5a (2 regex) là loại lỗi im lặng đắt nhất trong W3.** `PROCESS_LOG_PATTERN`/`PROCESS_AUDIT_PATTERN` (`logger.ts:56-57`) ghim cứng `omp`. `pruneStaleProcessLogs` (`:77`) lấy `pidText` từ chính chúng rồi `continue` nếu rỗng. Đổi `filenamePrefix` mà không đụng regex ⇒ **mọi** file log/audit mới không bao giờ bị prune, log tích tụ vô hạn, không ai báo lỗi, không test nào đỏ. Ngược lại nếu để nguyên regex cũ thì file `omp.*` cũ vẫn khớp và vẫn bị `fs.rmSync` **xoá vĩnh viễn**. Đây là lý do bắt buộc escape regex bằng `APP_NAME_RE`.

**D. `getAppName()` là danh tính wire, KHÔNG phải tên hiển thị.** Nó là giá trị header `x-omp-app` (`packages/ai/src/providers/pi-native-client.ts:127`) **và** một thành phần của khoá gộp usage (`packages/ai/src/auth-broker/remote-store.ts:1415-1417`, khoá = `` `${identity.installId}\u0000${identity.app ?? ""}\u0000${entry.provider}\u0000${entry.model}` ``). Đổi `APP_NAME` ⇒ usage trước và sau lần đổi tên **không gộp được**; tổng usage đã ghi không tự dồn. Đây là lý do `depends_on: W1`. Cần người quyết: chấp nhận và ghi rõ vào PR, hay đóng băng `getAppName()` về `"omp"`. **Không được tự quyết.**

**E. Đếm sai sẽ để sót literal.** W3 tự sửa "4 file test ghim literal → thực ra 7 chỗ, không phải 4" — con số đó ĐÚNG (tôi đếm lại: 7 + 1 + 9 + 7 = 24). Nhưng **tọa độ đã trượt**: `logger-contract.test.ts` lệch đúng 1 dòng mọi chỗ, `dirs.test.ts` lệch 14, `desktop-notify.test.ts` lệch 6. Đừng tin số dòng trong W3 — dùng `grep -n '"omp"' <file>` rồi sửa theo kết quả.

**F. `PREVIEW_TITLE` và `getCrashLogPath` là 2 literal plan bỏ sót** — W3 đã đưa vào scope, đúng. Nhưng khi sửa `getCrashLogPath` (`dirs.ts:976`), lưu ý người anh em `getDebugLogPath` (`:980-981`) **đã** dùng `` `${APP_NAME}-debug.log` `` — sửa cho khớp. Doc comment ở `:619` cũng phải sửa, nếu không tài liệu sai ngay sau khi đổi tên.

**G. Đừng sửa `packages/coding-agent/src/tools/browser/relay/server.ts:55`.** W3 đã quyết để NGOÀI scope (`const DEFAULT_GROUP = { title: "omp", color: "cyan" }`) — đó là nhãn chrome trình duyệt, không phải tên ứng dụng. Nó sẽ là literal trùng lặp thứ 10; nếu sau này muốn dọn thì mở work item riêng.
