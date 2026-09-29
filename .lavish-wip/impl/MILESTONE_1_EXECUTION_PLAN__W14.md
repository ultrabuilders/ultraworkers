# Phiếu triển khai — W14. Chặn encoding PowerShell trên các đường spawn của Windows

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md` §W14 (dòng 2866–3002)
**HEAD đo được:** `65cc6c1` (`git rev-parse --short HEAD` — plan ghi `ecd516f`, đã trôi; mọi số dòng dưới đây đo lại trên `65cc6c1`)
**Phạm vi phiếu này:** W14a. W14b (tool `powershell` riêng) bị chặn bởi một câu hỏi người dùng chưa trả lời — xem mục 7.

---

## 0. Kết quả kiểm lại từng neo

26 dòng kiểm (23 neo của work item + 3 dòng plan nhắc gián tiếp mà tôi thêm vào để đối chiếu). **19 đúng, 7 sai.** Sai nghĩa là: dòng đó tồn tại nhưng nói MỘT THỨ KHÁC, hoặc file không nằm ở path đó. Trong 19 cái đúng có một cái đúng dòng nhưng sai path (`profile-alias.ts`).

| Neo trong work item | Dòng thật | Nội dung dòng thật (`sed -n "Np"`) | Kết luận |
| --- | --- | --- | --- |
| `src/exec/powershell-encoding.ts` (mới) | — | không tồn tại | ĐÚNG (file mới) |
| `src/exec/bash-executor.ts:17` (import procmgr) | **16** | dòng 17 là `import { Settings } from "../config/settings";` | **SAI** |
| `bash-executor.ts:379` (`buildUserShellCommand`) | 379 | `function buildUserShellCommand(shell: string, args: string[], command: string): string {` | ĐÚNG |
| `bash-executor.ts:531-534` (`finalCommand`) | 531–534 | `const finalCommand =` … `buildUserShellCommand(shell, args, preflight.command)` | ĐÚNG |
| `bash-executor.ts:33-67` (`BashExecutorOptions`) | 33–67 | 33 `export interface BashExecutorOptions {` … 67 `}` | ĐÚNG |
| `bash-executor.ts:485-490` (resolve shell) | 485–490 | `executeBash` … `resolveUserShellConfig(settings, baseShellConfig)` | ĐÚNG |
| `bash-executor.ts:1-5` (brush-core header) | 1–5 | `* Uses brush-core via native bindings for shell execution.` | ĐÚNG |
| `src/tools/bash.ts:163-167` (`wrapShellLineForClientTerminal`) | 163–168 | 163 `export function wrapShellLineForClientTerminal(` … 168 `return { command: … }` | ĐÚNG (phạm vi 163–168, không phải 163–167) |
| `bash.ts:1239` (caller duy nhất) | 1239 | `const shellSpawn = wrapShellLineForClientTerminal(bridgeCommand, this.session.settings.getShellConfig());` | ĐÚNG |
| `bash.ts:19` (import procmgr) | 19 | `import { isPosixShell } from "@oh-my-pi/pi-utils/procmgr";` | ĐÚNG |
| `bash.ts:22` (import `executeBash`) | 22 | `import { applyDirenvPreflight, type BashResult, executeBash } from "../exec/bash-executor";` | ĐÚNG |
| `bash.ts:473 / :474 / :484 / :567` | y hệt | `export class BashTool …` / `readonly name = "bash";` / `isPosixShell(shell) ? …` / `readonly label = "Bash";` | ĐÚNG |
| `bash.ts:38` (import prompt `.md`) | **26** | dòng 38 là `import { resolveCliEntryCmd } from "../subprocess/worker-client";` | **SAI** |
| `utils/src/procmgr.ts:71` (`isPowerShell`) | **73** | dòng 71 là text trong JSDoc của chính nó | **SAI** |
| `procmgr.ts:53` (`getShellArgs`) | 53 | `export function getShellArgs(shell: string, env: …): string[] {` | ĐÚNG |
| `procmgr.ts:3` (import natives) | 3 | `import { Process, ProcessStatus } from "@oh-my-pi/pi-natives";` | ĐÚNG |
| `procmgr.ts:81` (`isPosixShell`) | 81 | `export function isPosixShell(shell: string): boolean {` | ĐÚNG |
| `utils/clipboard.ts:231` | 231 | `["powershell.exe", "-NoProfile", "-NonInteractive", "-Sta", "-Command", POWERSHELL_IMAGE_SCRIPT],` | ĐÚNG |
| `utils/clipboard.ts:290` | 290 | `const proc = Bun.spawn(["powershell.exe", …POWERSHELL_TEXT_SCRIPT], {` | ĐÚNG |
| `utils/clipboard.ts:270` | 270 | `[Console]::OutputEncoding = [Text.Encoding]::UTF8` | ĐÚNG |
| `tools/builtin-names.ts:1/:3`/68 dòng | 1 / 3 / 68 | `export const BUILTIN_TOOL_NAMES = [` / `    "bash",` / đúng 68 | ĐÚNG |
| `tools/index.ts:554` (`BUILTIN_TOOLS`) | **561** | dòng 554 là `}` đóng một interface phía trên | **SAI** |
| `tools/index.ts:557` (`bash: s => new BashTool(s)`) | **564** | dòng 557 là mở JSDoc `/**` | **SAI** |
| `COMPREHENSIVE_PLAN…:3072-3080 (P3)` | — | là 3 dòng bảng file của **W13** (print-mode / rpc-output) | **SAI** |
| `COMPREHENSIVE_PLAN…:1746-1748` | — | là comment `// Negative guard:` trong phần test của W4 (approval) | **SAI** |
| `profile-alias.ts:5,11,19,33` | đúng dòng, **sai path** | file ở `src/cli/profile-alias.ts`, không phải `src/tools/` | ĐÚNG VỀ DÒNG, SAI VỀ PATH |

**Hai neo đáng lo nhất**, vì chúng là neo của bước 1 — bước duy nhất W14a bắt buộc làm trước khi viết dòng code nào:

- Câu hỏi mở 4a **không nằm ở 3072-3080 và không nằm ở 1746-1748**. Nó nằm ở `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4769` (bảng "Cần người quyết") và `:4817` (câu hỏi "W14a còn ship không"). Ngoài ra `:454` là dòng xác nhận W14a đi vô điều kiện / W14b chỉ khi người dùng đồng ý. Cả ba đều đọc được.
- `bash.ts:38` không phải chỗ import prompt. Chỗ đúng là `bash.ts:26`. Kỹ sư đi tìm dòng 38 sẽ không thấy `.md` nào và sẽ tưởng mình đang ở sai repo.

---

## 1. Cái gì thay đổi, quan sát được

Khi người dùng Windows đặt `shellPath` là `pwsh`/`powershell`, mọi lệnh chạy qua hotkey `!` hoặc qua terminal của một ACP client giờ phát ra một dòng `try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}` trước lệnh của họ, nên output non-ASCII (đường dẫn có dấu, tên file CJK, emoji) về đúng thay vì mojibake; mọi shell không phải PowerShell nhận lệnh **nguyên byte không đổi**, và đường brush nhúng mặc định không bị chạm tới.

---

## 2. Bảng điểm sửa

TRƯỚC: trích nguyên văn từ file thật tại HEAD `65cc6c1` (tab hiển thị thành `\t`).

| Đường/dẫn | Symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/exec/powershell-encoding.ts` | `POWERSHELL_UTF8_PREFIX`, `withPowerShellUtf8Output` | *(file mới — không tồn tại)* | file mới ~20 dòng, xem mục 3 bước 2 |
| `packages/coding-agent/src/exec/bash-executor.ts:16` | import `@oh-my-pi/pi-utils/procmgr` | `import { isCmdShell, isExecutable, type ShellConfig } from "@oh-my-pi/pi-utils/procmgr";` | **KHÔNG đổi.** Plan bước 3 bảo thêm `isPowerShell` vào đây — sai, không call site nào trong file gọi trực tiếp, thêm vào sẽ đỏ `oxlint` (`no-unused-vars`). Xem cạm bẫy T4. |
| `packages/coding-agent/src/exec/bash-executor.ts:379-380` | `buildUserShellCommand` | `function buildUserShellCommand(shell: string, args: string[], command: string): string {`<br>`\treturn [shell, ...ensureInteractiveShellArgs(shell, args), command].map(quoteShellArg).join(" ");`<br>`}` | `function buildUserShellCommand(shell: string, args: string[], command: string): string {`<br>`\tconst guarded = withPowerShellUtf8Output(command, shell);`<br>`\treturn [shell, ...ensureInteractiveShellArgs(shell, args), guarded].map(quoteShellArg).join(" ");`<br>`}` |
| `packages/coding-agent/src/exec/bash-executor.ts` (import mới) | — | — | thêm `import { withPowerShellUtf8Output } from "./powershell-encoding";` ngay cạnh `import { loadDirenvEnv } from "./direnv";` (dòng 23) |
| `packages/coding-agent/src/tools/bash.ts:163-168` | `wrapShellLineForClientTerminal` | `export function wrapShellLineForClientTerminal(`<br>`\tline: string,`<br>`\tshellConfig: { shell: string; args: string[]; prefix?: string \| undefined },`<br>`): { command: string; args: string[] } {`<br>`\tconst finalLine = shellConfig.prefix ? \`${shellConfig.prefix} ${line}\` : line;`<br>`\treturn { command: shellConfig.shell, args: [...shellConfig.args, finalLine] };`<br>`}` | `export function wrapShellLineForClientTerminal(`<br>`\tline: string,`<br>`\tshellConfig: { shell: string; args: string[]; prefix?: string \| undefined },`<br>`): { command: string; args: string[] } {`<br>`\tconst guarded = withPowerShellUtf8Output(line, shellConfig.shell);`<br>`\tconst finalLine = shellConfig.prefix ? \`${shellConfig.prefix} ${guarded}\` : guarded;`<br>`\treturn { command: shellConfig.shell, args: [...shellConfig.args, finalLine] };`<br>`}` |
| `packages/coding-agent/src/tools/bash.ts:19` | import `@oh-my-pi/pi-utils/procmgr` | `import { isPosixShell } from "@oh-my-pi/pi-utils/procmgr";` | giữ nguyên — không cần `isPowerShell` ở đây |
| `packages/coding-agent/test/tools/powershell.test.ts` | 3 test | *(file mới — không tồn tại)* | xem mục 4 |

**W14b (KHÔNG làm ở phiếu này, chỉ ghi để khỏi tìm nhầm):**

| Đường/dẫn | Symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `tools/builtin-names.ts:1-32` | `BUILTIN_TOOL_NAMES` | mảng 30 phần tử, `"bash",` ở dòng 3 | thêm `"powershell",` (giữ thứ tự alphabet-ish hiện có) |
| `tools/index.ts:561` | `BUILTIN_TOOLS` | `export const BUILTIN_TOOLS: Record<BuiltinToolName, ToolFactory> = {` | không đổi dòng này, chỉ thêm entry |
| `tools/index.ts:564` | entry `bash` | `\tbash: s => new BashTool(s),` | thêm `\tpowershell: s => new PowerShellTool(s),` |
| `tools/powershell.ts`, `prompts/tools/powershell.md` | `PowerShellTool` | *(chưa có)* | file mới |

---

## 3. Các bước

Mọi neo dưới đây là dòng tôi vừa mở và đọc ở HEAD `65cc6c1`.

**Bước 0 (thêm vào, không có trong plan).** Chốt câu hỏi phạm vi với người dùng trước, dùng nguyên văn câu ở `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4769`:

> omp có muốn một tool `powershell` hạng nhất, hay bash-only-trên-Windows là một quyết định phạm vi có chủ ý?

Ghi nguyên văn câu trả lời vào PR description. **Không** suy từ codebase. Nếu không có câu trả lời, chỉ làm bước 1–4 dưới đây — item vẫn land.
(Plan ghi neo cho bước này là `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:3072-3080` và `:1746-1748` — **cả hai sai**, xem mục 0.)

**Bước 1 — Tạo `packages/coding-agent/src/exec/powershell-encoding.ts`** (file mới, chưa tồn tại — `ls` trả về không có).

```typescript
import { isPowerShell } from "@oh-my-pi/pi-utils/procmgr";

/**
 * PowerShell emits output in the host's active code page unless the console
 * encoding is forced, so every non-ASCII tool result comes back as mojibake.
 * The assignment throws on some hosts (older Windows, redirected consoles),
 * and the command must still run when it does — hence the try/catch, which is
 * load-bearing rather than defensive.
 */
export const POWERSHELL_UTF8_PREFIX =
	"try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}\n";

/** Prepend the encoding guard only when the spawn target really is PowerShell. */
export function withPowerShellUtf8Output(command: string, shell: string): string {
	return isPowerShell(shell) ? `${POWERSHELL_UTF8_PREFIX}${command}` : command;
}
```

Neo đã kiểm: `isPowerShell` nằm ở `packages/utils/src/procmgr.ts:73` (không phải `:71`):

```
73: export function isPowerShell(shell: string): boolean {
74: 	const basename = shell.replace(/\\/g, "/").split("/").pop()?.toLowerCase();
75: 	return basename === "powershell.exe" || basename === "powershell" || basename === "pwsh.exe" || basename === "pwsh";
76: }
```

**Không** viết lại phép so basename — `isPowerShell` là helper trung tâm. Đã chạy thật:

```
"/bin/bash" false · "/bin/zsh" false · "cmd.exe" false
"pwsh" true · "powershell.exe" true · "C:\Program Files\PowerShell\7\pwsh.exe" true
```

**Bước 2 — Sửa `packages/coding-agent/src/exec/bash-executor.ts:379-380`** (`buildUserShellCommand`). Thêm import helper cạnh `import { loadDirenvEnv } from "./direnv";` (dòng 23), rồi:

```typescript
function buildUserShellCommand(shell: string, args: string[], command: string): string {
	const guarded = withPowerShellUtf8Output(command, shell);
	return [shell, ...ensureInteractiveShellArgs(shell, args), guarded].map(quoteShellArg).join(" ");
}
```

**Không** thêm `isPowerShell` vào import ở dòng 16 — file này không gọi trực tiếp (chỉ `bash.ts` và helper mới cần), và `oxlint` sẽ đỏ vì unused import.

Caller duy nhất đã xác minh: `bash.ts:379` được gọi đúng một lần, ở dòng 533, và chỉ khi `useUserShell === true && !bashShell && !isCmdShell(shell) && !runCdInPersistentShell`. Với `pwsh`: `isBashShell("pwsh")` = false (`bash-executor.ts:281-284`, `basename.includes("bash")`), `isCmdShell("pwsh")` = false (đã chạy thật) → đường này **có** được dùng. Không đổi chữ ký, không dời call.

**Bước 3 — Sửa `packages/coding-agent/src/tools/bash.ts:163-168`** (`wrapShellLineForClientTerminal`):

```typescript
export function wrapShellLineForClientTerminal(
	line: string,
	shellConfig: { shell: string; args: string[]; prefix?: string | undefined },
): { command: string; args: string[] } {
	const guarded = withPowerShellUtf8Output(line, shellConfig.shell);
	const finalLine = shellConfig.prefix ? `${shellConfig.prefix} ${guarded}` : guarded;
	return { command: shellConfig.shell, args: [...shellConfig.args, finalLine] };
}
```

Thêm import top-level `import { withPowerShellUtf8Output } from "../exec/powershell-encoding";`. Caller duy nhất đã xác minh: `bash.ts:1239` (dòng 1158 và `bash-executor.ts:122` chỉ là comment).

**Bước 4 — Xác nhận KHÔNG chạm đường brush nhúng.** `executeBash` mặc định (không `useUserShell`) đưa `preflight.command` thẳng vào brush `Shell` (`bash-executor.ts:622` tạo `Shell`, `:673-680` gọi `executionShell.run({ command: finalCommand, … })`) — một POSIX engine nhúng trong native addon, không spawn shell. Đây là lý do cổng có kiểm phạm vi diff. Chạy cổng G3 ở mục 5.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/tools/powershell.test.ts` (mới). Dùng đúng tên này — bảng "File cần chạm tới" của plan ghi `powershell-encoding.test.ts` nhưng bước 6, mục Xác minh và cổng đều dùng `powershell.test.ts`. (Đã đo: `bun test <path không tồn tại>` exit **1**, nên nhầm tên là đỏ, không phải xanh âm thầm.)

**Ba case, mỗi case một nhánh hỏng khác nhau:**

1. **NEGATIVE / PRECEDENCE** — `/bin/bash`, `/bin/zsh`, `cmd.exe` → `withPowerShellUtf8Output("ls -la", shell)` trả đúng `"ls -la"`, **nguyên byte**.
   *Chặn cái gì:* item biến thành con dấu cao su. Helper prefix vô điều kiện vẫn pass mọi test PowerShell trong khi phá vỡ mọi lệnh POSIX — một câu `try { … } catch {}` là lỗi cú pháp trong bash.

2. **TRANSFORMATION** — `pwsh`, `powershell.exe`, `C:\Program Files\PowerShell\7\pwsh.exe` → chuỗi phát ra bắt đầu bằng **literal** `try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}` + một `\n`, rồi lệnh của người dùng nguyên văn. Khẳng định **literal**, không chỉ so với hằng số export — nếu chỉ so với `POWERSHELL_UTF8_PREFIX` thì sửa hằng số sai mà test vẫn xanh.
   *Chặn cái gì:* thiếu guard, hoặc `isPowerShell` không nhận ra một trong ba cách viết (cả ba đã chạy thật ở bước 1 và trả `true`).

3. **NON-CATASTROPHIC FAILURE** — lệnh của người dùng **có sẵn `try`/`catch` và ngoặc nhọn của riêng nó**, ví dụ `try { Get-Item x } catch { Write-Host 'no' }`. Khẳng định chuỗi phát ra tách thành đúng hai phần: dòng đầu là guard đã đóng, phần còn lại là lệnh của người dùng nguyên văn — nghĩa là lệnh nằm **sau** `catch {}` đã đóng, không nằm bên trong nó.
   *Chặn cái gì:* đây là input class mà case 2 không chạm tới (case 2 dùng lệnh không có ngoặc nhọn). Nó bắt được guard nuốt lệnh khi guard được đóng "lười" bằng cách quét ngoặc, hoặc khi ai đó thêm một dòng vào guard mà không thêm `\n` — và bắt được việc mất chữ `catch`.

**Nếu hồi quy, người dùng thấy gì:** trên Windows, mọi tool result non-ASCII hiện ra dạng mojibake kiểu `ÄÆá»ç`; ở hướng ngược lại (guard áp nhầm lên shell POSIX), **không có lệnh nào chạy được** — bash báo `try: command not found` và mọi lệnh của người dùng chết, tệ hơn nhiều so với mojibake.

**Về việc test có cần native addon không:** **CÓ.** `powershell-encoding.ts` import `@oh-my-pi/pi-utils/procmgr`, mà `procmgr.ts:3` import `@oh-my-pi/pi-natives`. Test import helper thuần vẫn đi qua addon. Plan nói đúng điểm này.

---

## 5. Cổng

### G1 — `bun run check:ts`

```bash
bun run check:ts
```

**CÓ đỏ được — đo được.** Ở HEAD `65cc6c1` lệnh này **pass thật**: 15 package `check:types` đều `Done`, exit 0. Bất kỳ lỗi type, lỗi `oxlint`, hay lỗi format nào do thay đổi này tạo ra đều làm nó đỏ.

Lưu ý phụ đáng ghi: `check:ts` (`package.json:90`) chạy `oxlint . && oxfmt --check …` **trước** khi chạy typecheck. Một file mới dánh bằng dấu cách thay vì tab sẽ đỏ cổng này vì lý do không liên quan gì tới hợp đồng. Dán theo tab như phần còn lại của repo.

### G2 — file test

```bash
bun test packages/coding-agent/test/tools/powershell.test.ts
```

**CÓ đỏ được.** Ba assertion ở mục 4 là ba nhánh hỏng độc lập (thiếu guard / guard áp nhầm / lệnh bị nuốt). Tên file sai cũng đỏ (đo: exit 1).

### G3 — phạm vi diff (viết lại để đỏ được)

Plan viết cổng này bằng **câu văn**: *"`git diff --stat` phải hiện đúng hai file production"*. Câu văn không exit code — đó là loại cổng luôn xanh. Viết lại thành lệnh:

```bash
git status --porcelain=v1 | awk '{print $NF}' \
  | grep '^packages/coding-agent/src/' | sort > /tmp/w14-src-actual.txt
printf '%s\n' \
  packages/coding-agent/src/exec/bash-executor.ts \
  packages/coding-agent/src/exec/powershell-encoding.ts \
  packages/coding-agent/src/tools/bash.ts | sort > /tmp/w14-src-expected.txt
diff -u /tmp/w14-src-expected.txt /tmp/w14-src-actual.txt && echo "SCOPE OK"
```

**CÓ đỏ được:** `diff` exit 1 khi có file source thứ ba xuất hiện — tức là đường shell nhúng đã bị sửa. Đây là cái đáng đỏ nhất trong ba cái.

### G4 — native addon: viết lại, vì lý do của plan đã hết hạn

Plan bắt build addon **vô điều kiện** và biện minh bằng: *"ở HEAD addon vắng mặt … `bun test packages/coding-agent/test/tools/` hiện cho 145 pass / 177 fail / 174 errors trên 322 tests, và mọi lỗi đều là lỗi `Failed to load pi_natives native addon`"*, rồi kết luận *"Điểm duy nhất không đỏ được là khi bỏ qua bước build native addon"*.

**Đo lại ở `65cc6c1` trong checkout này — cả hai vế đều sai:**

- Addon **có mặt**: `packages/natives/native/pi_natives.darwin-arm64.node`, 185 MB. `bun -e 'await import("@oh-my-pi/pi-natives")'` → load OK, 128 export.
- `bun test packages/coding-agent/test/tools/` → **2033 pass / 0 fail / 263 skip / 2296 tests / 188 files**, 81.5s. Không có 174 error nào.

Nghĩa là `brew install ninja` + build là **không cần** ở đây. Nhưng nó vẫn là điều kiện cần cho một máy checkout sạch, nên giữ nó dạng **có điều kiện** thay vì luôn luôn:

```bash
[ -f packages/natives/native/pi_natives.darwin-arm64.node ] \
  || bun --cwd=packages/natives run build     # chỉ khi thiếu; khi đó mới cần `brew install ninja`
```

**Cổng này đỏ được không?** Không — nó là một bước chuẩn bị môi trường, không phải một assertion. Và **điểm này thay đổi lập luận an toàn của plan**: vì addon đã có sẵn, bỏ qua G4 ở máy này **không làm mất khả năng phát hiện hồi quy** — G1/G2/G3 vẫn đỏ đầy đủ. Suy ra câu *"bước build phải nằm trong lệnh gate"* là dựa trên một baseline đã cũ. Giữ G4 có điều kiện cho tính di động, nhưng **đừng dựa vào nó như một phần của tín hiệu an toàn**.

Một điều tôi **không** đo được và không khẳng định: exit code của `bun test` khi một file test lỗi **load** addon. Ở checkout này không tạo được tình huống đó vì addon có sẵn. Nếu gặp, đừng coi lỗi load là "cổng đỏ đúng lý do" — nó đỏ vì môi trường, không phải vì hợp đồng.

### Tóm tắt cổng

| Cổng | Đỏ được? | Bằng cách nào |
| --- | --- | --- |
| G1 `bun run check:ts` | **CÓ** | đo pass ở HEAD; type/lint/format sai → đỏ |
| G2 `bun test .../powershell.test.ts` | **CÓ** | 3 assertion độc lập; tên file sai → exit 1 |
| G3 diff phạm vi | **CÓ** (sau khi viết lại từ câu văn thành `diff -u`) | file source thứ ba → `diff` exit 1 |
| G4 build addon | **KHÔNG** | và ở máy này còn **không cần** — addon đã build sẵn |

---

## 6. Cạm bẫy riêng của work item này

Xếp theo mức độ sát thương nếu gõ sai.

**T1 — Chèn guard SAU `quoteShellArg` là phá cả đường spawn.**
`buildUserShellCommand` (`bash-executor.ts:379-380`) đưa lệnh qua `quoteShellArg` (`:375-377`):
```typescript
function quoteShellArg(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}
```
Đó là escape **POSIX shell**, và chuỗi kết quả được brush `Shell` parse rồi mới spawn. Guard phải nằm **trước** `.map(quoteShellArg)`. Nếu bạn viết `` `${POWERSHELL_UTF8_PREFIX}${quoted}` `` thì một lệnh có dấu `'` trong đó sẽ phá vỡ quoting và hỏng **mọi** lệnh, chứ không chỉ lệnh PowerShell. Đây là lý do bảng điểm sửa đặt `guarded` ở một dòng riêng trước `return`.

**T2 — Đường PTY là ngõ cụt với PowerShell; vá nó là vừa thừa vừa phá cổng.**
`usePty` (`bash-executor.ts:497-502`) đòi `supportsAutoUserShell(shell)`, mà hàm đó (`:338-341`) là `basename.includes("bash") || … "zsh" || … "fish"`. `pwsh` không thuộc tập nào → **`usePty` luôn false** khi `shellPath` là PowerShell, nên nhánh PTY ở `:579-598` không bao giờ chạy. Nó truyền thẳng `preflight.command` (`:585`) vào `PtySession.startArgv` (`:438-443`) — không quote, không guard.
Hệ quả hai: (a) câu *"PTY tương tác"* trong mục "Người dùng thấy" của plan là **không chính xác** — đường `!` với `pwsh` đi qua `buildUserShellCommand`, không qua PTY; (b) nếu bạn thấy "à còn một spawn site nữa" và vá thêm vào `executeUserShellPty`, bạn thêm code chết **và** làm G3 đỏ. Đừng.

**T3 — Hai spawn site, không phải ba.**
`!` hotkey: `input-controller.ts:1041-1053` (`text.startsWith("!")`) → `command-controller.ts:1381` `handleBashCommand` → `:1423` `useUserShell: true` → `executeBash` → `finalCommand` (`:531`) → `buildUserShellCommand`. ACP client terminal: `bash.ts:1239` → `wrapShellLineForClientTerminal`. Đó là hết. Đường brush nhúng (`:622`, `:673-680`) là đường thứ ba và **không được chạm**.

**T4 — `isPowerShell` không được import vào `bash-executor.ts`.**
Plan bước 3 bảo thêm nó vào import procmgr dòng 17. Không có call site nào trong file đó gọi trực tiếp — `buildUserShellCommand` gọi helper. Import thừa làm `oxlint` đỏ (`no-unused-vars`), tức là đỏ cổng G1 vì một lý do không liên quan tới hợp đồng.

**T5 — Suy ra chữ ký hàm mà không mở file.**
`wrapShellLineForClientTerminal` (`bash.ts:163-168`) **không** cần đổi chữ ký: nó đã nhận `shellConfig: { shell, args, prefix? }`. `buildUserShellCommand` cũng vậy. W14a là hai sửa một-dòng, không phải refactor.

**T6 — `isPosixShell("pwsh")` là false — đã chạy thật, đừng giả định.**
Chạy đúng regex `POSIX_SHELL_PATTERN` (`procmgr.ts:78`) trên ba spelling: `pwsh` → false, `powershell.exe` → false, `C:\Program Files\PowerShell\7\pwsh.exe` → false. Hệ quả (chỉ liên quan W14b): `BashTool.approval` (`bash.ts:484`) chỉ tách đoạn lệnh ghép khi `isPosixShell(shell)`, nên lệnh PowerShell sẽ được match như **một chuỗi lệnh nguyên khối**. Plan đã cảnh báo; tôi đã xác nhận bằng chạy thật chứ không phải bằng đọc.

**T7 — `ReturnType<>` bị AGENTS.md cấm, và file pi-reference dùng nó.**
`pi-ref/packages/coding-agent/src/core/tools/powershell.ts` (67 dòng, `/Users/tranquangdang21/Projects/pi-ref/`) dùng `ReturnType<typeof createShellToolDefinition>` ở dòng **52** và `ReturnType<typeof createBashTool>` ở dòng **59**. (Bảng "Đính chính" của plan ghi "dòng 49 và 56" — lệch 3.) Hằng tiền tố UTF-8 ở dòng 16 của file đó **khớp byte-for-byte** với spec:
```
16: const UTF8_OUTPUT_PREFIX = "try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}\n";
```
Hãy lấy hằng này, đừng lấy cả file.

**T8 — Vì sao không thể thả thẳng file của pi-ref.**
Đã kiểm bằng `git grep -- 'packages/**/*.ts' 'crates/**/*.rs'`: `ShellToolConfig` và `createShellToolDefinition` có **0 hit** trong source omp (chỉ xuất hiện trong file markdown/json của `.lavish-wip`). `BashOperations`, `BashSpawnHook`, `createLocalShellOperations` chỉ có trong `packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts` (`:111`, `:113`) — một shim tương thích plugin legacy, không phải tool đang chạy. Ngoài ra `packages/coding-agent/src/tools/bash.ts` export **đúng năm** thứ (`:163`, `:188`, `:384`, `:395`, `:473`) và `BashToolOptions` (`:395`) là interface rỗng — không có seam `ShellToolConfig` nào để đắp vào. Lối thoát quyến rũ là fork `BashTool` (1504 dòng), đúng cái refactor mà plan cảnh báo.

---

## 7. Câu hỏi còn treo (không tự trả lời được)

1. **Câu hỏi mở 4a** (`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4769`): omp có muốn một tool `powershell` hạng nhất, hay bash-only-trên-Windows là một quyết định phạm vi có chủ ý? Chặn W14b. W14a độc lập và vẫn land.
2. **W14a có ship không** nếu câu trả lời là "Windows cố ý bash-only"? Khuyến nghị: **có** — ~30 dòng, bảo vệ một hợp đồng encoding có thật trên hai đường spawn đang tồn tại. Nhưng đây là thay đổi hành vi trên một đường người dùng có thể không hỗ trợ, nên là quyết định của họ.
3. **Sai lệch kỳ vọng cần nói với người dùng:** mojibake mà plan mô tả **không** xảy ra trên đường Windows mặc định của omp. `executeBash` mặc định chạy trong brush-core, không spawn `powershell.exe`; `useUserShell` chỉ true ở hotkey `!` và PTY. Lỗ hổng chỉ thật khi người dùng **tự** đặt `shellPath` sang `pwsh`/`powershell`.
4. **Vị trí helper:** đặt ở `exec/` (theo plan) hay `tools/`? `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4818` hỏi đúng câu này. Nếu W14b sau này được chọn, helper ở `exec/` dùng lại được nguyên vẹn.

---

## 8. Sai lệch so với cây thật (GHI RA, không sửa trong tài liệu)

| claim của plan | verdict | sự thật đo được ở `65cc6c1` |
| --- | --- | --- |
| neo `bash-executor.ts:17` cho import procmgr | **SAI** | import ở dòng **16**; dòng 17 là `import { Settings } …` |
| neo `bash.ts:38` cho import prompt `.md` | **SAI** | import ở dòng **26**; dòng 38 là `import { resolveCliEntryCmd } …` |
| neo `procmgr.ts:71` cho `isPowerShell` | **SAI** | `isPowerShell` ở dòng **73**; dòng 71 là text JSDoc của chính nó |
| neo `tools/index.ts:554` cho `BUILTIN_TOOLS` | **SAI** | ở dòng **561**; dòng 554 là `}` đóng interface phía trên |
| neo `tools/index.ts:557` cho `bash: s => new BashTool(s)` | **SAI** | ở dòng **564**; dòng 557 là mở JSDoc |
| `tools/index.ts` "File 966 dòng" | **SAI** | `wc -l` → **973** |
| neo `COMPREHENSIVE_PLAN…:3072-3080 (P3)` | **SAI** | đó là 3 dòng bảng file của **W13** (print-mode.ts / rpc-output.ts / CHANGELOG) |
| neo `COMPREHENSIVE_PLAN…:1746-1748` | **SAI** | đó là comment `// Negative guard:` trong phần test của W4 (approval) |
| `profile-alias.ts:5,11,19,33` | đúng dòng, **thiếu path** | file ở `src/cli/profile-alias.ts`, không phải `src/tools/profile-alias.ts` |
| *"bash.ts:481-484"* (trong bảng Đính chính, đã tự sửa thành 482 và 484) | ĐÚNG | 482 `? this.session.settings.getShellConfig().shell`, 484 `isPosixShell(shell) ? extractLiteralAndChainSegments(command) : null` |
| *"ở HEAD addon vắng mặt … 145 pass / 177 fail / 174 errors"* | **SAI ở checkout này** | addon có mặt (185 MB); suite đo được **2033 pass / 0 fail / 263 skip / 2296 tests** |
| *"Điểm duy nhất không đỏ được là khi bỏ qua bước build native addon"* | **LẬP LUẬN HỎNG** | vì addon đã có, bỏ G4 ở máy này không mất khả năng phát hiện hồi quy |
| *"PTY tương tác"* nằm trong "Người dùng thấy" | **KHÔNG CHÍNH XÁC** | `usePty` đòi `supportsAutoUserShell` (bash/zsh/fish) → với `pwsh` luôn false; nhánh PTY không chạy |
| bước 3 "thêm `isPowerShell` vào import procmgr ở dòng 17" | **THỪA** | không call site nào trong `bash-executor.ts` gọi trực tiếp → `oxlint` đỏ `no-unused-vars` |
| bảng Đính chính: pi-ref `ReturnType<>` "dòng 49 và 56" | **SAI** | ở dòng **52** và **59** |
| bước 8 (W14b) "soi theo `BashTool` (`bash.ts:473`)" + `isPosixShell("pwsh")` false | **ĐÚNG, đã chạy thật** | regex `POSIX_SHELL_PATTERN` trả false cho `pwsh`, `powershell.exe`, và đường dẫn đầy đủ |
