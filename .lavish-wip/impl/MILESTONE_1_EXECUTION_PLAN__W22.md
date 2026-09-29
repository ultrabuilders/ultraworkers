# Phiếu triển khai — W22: `omp session` (bề mặt CLI cho session)

**Kế hoạch:** `MILESTONE_1_EXECUTION_PLAN.md` §W22 (dòng 4195–4296)
**Nguồn sổ:** `.lavish-wip/GAP-REGISTER-2.md` §`GAP-M1-22` (dòng 771–800), nguồn `codex.129`
**Cây tham chiếu đã đọc:** `ultraworkers` (omp), `codex-ref`, `claude-code-ref`
**Ngày kiểm:** 2026-09-29 · nhánh `milestone-1` @ `65cc6c1`

---

## 1. Cái gì thay đổi, quan sát được

`omp session list|show|archive|unarchive|delete` chạy được ngoài TUI, trên đúng store mà
`/resume` và `omp share` đang dùng — và `omp session` không bao giờ rơi xuống `launch` (tức không bao giờ
biến argv thành prompt gửi cho LLM).

---

## 2. Bảng điểm sửa

Mọi mục TRƯỚC dưới đây được trích từ file thật, đã mở và đọc trong đợt này.

| # | đường/dẫn | symbol / hàm | TRƯỚC (nguyên văn) | SAU (hình dạng) |
|---|---|---|---|---|
| 1 | `packages/coding-agent/src/cli-commands.ts` **:210–214** | entry `shell` trong `commands: CommandEntry[]` | ```\t{\n\t\tname: "shell",\n\t\tload: () => import("./commands/shell").then(m => m.default),\n\t\thelp: commandHelp.shellHelp,\n\t},``` | Chèn ngay **trước** entry `shell`, cùng hình ba dòng:<br>```\t{\n\t\tname: "session",\n\t\tload: () => import("./commands/session").then(m => m.default),\n\t\thelp: commandHelp.sessionHelp,\n\t},```<br>(đặt sau `setup` :205 và trước `shell` :210 để giữ thứ tự gần alphabet) |
| 2 | `packages/coding-agent/src/cli/command-help.ts` **:127–131** *(KHÔNG có trong bảng "File cần chạm tới" của W22 — xem §3.3)* | `setupHelp` / `shellHelp` | ```export const setupHelp = {\n\t…\n} satisfies CommandMetadata;\n\nexport const shellHelp = { description: "Interactive shell console" } satisfies CommandMetadata;``` | Thêm `sessionHelp` giữa hai cái trên:<br>```export const sessionHelp = {\n\tdescription: "Work with saved sessions from a script: list, show, archive, unarchive, delete",\n} satisfies CommandMetadata;```<br>**Không có dòng này thì `bun test` đỏ ngay** — xem hợp đồng test §4. |
| 3 | `packages/coding-agent/src/commands/session.ts` | *(file chưa tồn tại)* | `MISSING: packages/coding-agent/src/commands/session.ts` | Tạo mới. Lớp `Session extends Command` với `static description = commandHelp.description;`, một `Args.string` positional `action` (`options: ["list","show","archive","unarchive","delete"]`, `default: "list"`), một `Args.string` `target`, ba cờ `--last` / `--all` / `--json`. Xem §5.2. |
| 4 | `packages/coding-agent/src/cli/find-cli.ts` **:74–78** | `runFindCommand` | ```if (!cmd.query.trim()) {\n\t\tconsole.error(chalk.red("Error: query is required"));\n\t\tprocess.exit(1);\n\t}``` | **KHÔNG SỬA.** Đây là bằng chứng rằng `omp find` là *tìm kiếm ngữ nghĩa theo câu truy vấn*, không phải liệt kê session — xem §3.1. |
| 5 | `packages/coding-agent/src/session/indexed-session-storage.ts` **:18–30** | `SessionStorageIndexEntry` / `SessionStorageBackend.loadIndex` | ```export interface SessionStorageIndexEntry {\n\tpath: string;\n\tsize: number;\n\tmtimeMs: number;\n\ttitle?: string;\n\ttitleSource?: SessionTitleUpdate["source"];\n\ttitleUpdatedAt?: string;\n}\n\nexport interface SessionStorageBackend {\n\tinit(): Promise<void>;\n\tloadIndex(): Promise<Iterable<SessionStorageIndexEntry>>;``` | **KHÔNG SỬA — và KHÔNG dùng làm nguồn cho `omp session`.** Đường đọc session thật là `session-listing.ts` xem dòng 6. |
| 6 | `packages/coding-agent/src/session/session-listing.ts` **:639–655, :702–708, :821–848** | `listSessions` / `listSessionsReadOnly` / `listAllSessions` / `findMostRecentSession` / `resolveResumableSession` | ```export function listSessions(sessionDir: string, storage: SessionStorage): Promise<SessionInfo[]> {\n\treturn scanSessionDir(sessionDir, storage, true);\n}\n\nexport function listSessionsReadOnly(sessionDir: string, storage: SessionStorage): Promise<SessionInfo[]> {\n\treturn scanSessionDirReadOnly(sessionDir, storage, true);\n}\n\nexport async function listAllSessions(\n\tstorage: SessionStorage = new FileSessionStorage(),\n\tsessionsRoot: string = getSessionsDir(),\n): Promise<SessionInfo[]> {``` | **KHÔNG SỬA — nhưng ĐÂY là nguồn sự thật duy nhất cho cả năm verb.** `list` gọi `listSessionsReadOnly`; `--last` gọi `findMostRecentSession`; bốn verb còn lại gọi `resolveResumableSession`. |
| 7 | `packages/coding-agent/src/commands/gc.ts` **:16, :18** | cờ `--archive` / `--cold-archive-after-days` | ```\t\tarchive: Flags.boolean({ description: "Archive cold sessions" }),\n…\n\t\t"cold-archive-after-days": Flags.integer({ description: "Minimum session age before archiving" }),``` | **KHÔNG SỬA.** Nhưng nó phủ định một claim của W22: cơ chế archive session **đã có** — xem §3.2. |
| 8 | `packages/coding-agent/src/cli/gc-cli.ts` **:214–215, :506–518, :656–693** | `getArchivedSessionsDir` / `archiveDestination` / `moveSessionWithArtifacts` | ```function getArchivedSessionsDir(agentDir: string): string {\n\treturn path.join(path.dirname(getSessionsDir(agentDir)), "archive", "sessions");\n}\n…\n\treturn {\n\t\trelativePath,\n\t\tdestinationPath: path.join(archiveRoot, `${relativePath}.gz`),\n\t};\n}```<br>và `moveSessionWithArtifacts` gzip file, move thư mục artifacts, rollback nếu giữa chừng hỏng | **KHÔNG SỬA — nhưng verb `archive` mới KHÔNG được tự dựng lại.** Nó phải gọi lại đường này, nếu không sẽ thành nguồn sự thật thứ hai (xem §7). |
| 9 | `packages/coding-agent/src/cli/flag-tables.ts` **:248–252, :300** | `OPTIONAL_FLAGS` / `VALUELESS_FLAGS` | ```export const OPTIONAL_FLAGS: Record<string, OptionalFlagConfig> = {\n\t"--resume": { set: setResume, rejectEmpty: true },\n\t"-r": { set: setResume, rejectEmpty: true },\n\t"--session": { set: setResume, rejectEmpty: true },\n};```<br>và dòng 300: `\t"--continue",` | **KHÔNG SỬA.** Đây là đường một-shot; đổi là hồi quy trực tiếp. Kiểm bằng `git diff --stat`. |
| 10 | `packages/coding-agent/src/slash-commands/helpers/security.ts` **:99** | nhánh `case "--archive-existing":` | `\t\t\tcase "--archive-existing":` | **KHÔNG SỬA.** Cờ của nhánh security scan, không phải verb archive session. |
| 11 | `packages/coding-agent/test/cli-argv-routing.test.ts` **:59–63** | `test("`gc` dispatches as a top-level maintenance subcommand")` | ```    test("`gc` dispatches as a top-level maintenance subcommand", () => {\n        expect(resolveCliArgv(["gc", "--apply"])).toEqual({\n            argv: ["gc", "--apply"],\n        });\n    });``` | Thêm **một** test mới ngay dưới test này, phủ **cả** `doctor` **và** `session` trong cùng một assertion (dùng chung với W18). Đây là "một cái, không phải hai". |
| 12 | `packages/coding-agent/test/session/session-cli.test.ts` | *(file chưa tồn tại)* | `MISSING: packages/coding-agent/test/session/session-cli.test.ts` | Tạo mới, **chỉ chứa** case (2)(3)(4) của §4. Không chứa assertion phân tuyến — cái đó thuộc dòng 11. |

---

## VIỆC 1 — Kết quả kiểm lại từng neo

Bảng neo. "Đúng" = dòng đó nói đúng thứ tài liệu nói.

| Neo trong W22 | Lệnh kiểm | Kết quả | Verdict |
|---|---|---|---|
| `packages/coding-agent/src/cli-commands.ts` tồn tại | `wc -l` | 451 dòng | **ĐÚNG** |
| `grep -c 'name: "session"'` → **0** | `grep -c` | `0` | **ĐÚNG** |
| `grep -c 'name: "doctor"'` → **0** | `grep -c` | `0` | **ĐÚNG** |
| "49 lệnh cấp một" | `grep -oE '^\s+name: "[a-z0-9-]+"' … \| sort -u \| wc -l` | `49` | **ĐÚNG con số, SAI lý do** — xem §3.4 |
| `packages/coding-agent/src/commands/session.ts` chưa có | `ls` | `No such file or directory` | **ĐÚNG** (file tạo mới) |
| `packages/coding-agent/test/session/session-cli.test.ts` chưa có | `ls` | `No such file or directory` | **ĐÚNG** (file tạo mới) — nhưng sai chỗ, xem §3.5 |
| `commands/find.ts` là "khuôn, ba dòng `name` / `load` / `help`" | `cat -n` | 38 dòng, là class oclif: `description` / `args` / `flags` / `run()` — **không có** `name` / `load` / `help` | **SAI một nửa** — ba dòng đó là hình của *entry registry* trong `cli-commands.ts:108-111`, không phải hình của file command. Khuôn thật cho lệnh nhiều verb là `commands/worktree.ts:18-23` — xem Bước 3 |
| `SessionStorageBackend.loadIndex` trả "path/size/mtime/title", là **nguồn duy nhất** | `sed -n '18,30p' session/indexed-session-storage.ts` | Interface tồn tại, trả **6** trường (`path, size, mtimeMs, title?, titleSource?, titleUpdatedAt?`) — không chỉ 4 | **SAI** — và nghiêm trọng hơn: nó **không phải** nguồn duy nhất. Xem §3.1 |
| `flag-tables.ts:249` = `--resume` / `-r` / `--session` với `rejectEmpty` | `sed -n '249p'` | `"--resume": { set: setResume, rejectEmpty: true },` (`:250` = `-r`, `:251` = `--session`) | **ĐÚNG** |
| `flag-tables.ts:300` = `--continue` | `sed -n '300p'` | `"--continue",` (trong `VALUELESS_FLAGS`) | **ĐÚNG** |
| `slash-commands/helpers/security.ts:99` = `--archive-existing` | `sed -n '99p'` | `case "--archive-existing":` | **ĐÚNG** |
| "grep `archive` trong `slash-commands/` chỉ trả về `--archive-existing`" | `grep -rn 'archive' src/slash-commands/` | 6 hit, tất cả đều là `archiveExisting` của security scan | **ĐÚNG trong phạm vi `slash-commands/`** — nhưng không dám kết luận "không có archive session nào" trên toàn repo. Xem §3.2 |
| "không có verb archive/unarchive session nào" | `grep -rn 'archive' src/cli/gc-cli.ts src/commands/gc.ts` | `omp gc --archive` đã archive session thật (gzip + artifacts + dòng history) | **SAI** — xem §3.2 |
| "`list` nhân bản output của `omp find`" | `sed -n '1,20p' cli/find-cli.ts` | `omp find` = tìm kiếm ngữ nghĩa **trên cây file**, bắt buộc có `query`, in score gauge + token + chi phí. Không đụng session store. | **SAI** — xem §3.1 |
| "`bun run session list` và `bun run find` cho ra cùng nội dung" | như trên | Vô nghĩa: hai lệnh khác miền dữ liệu | **SAI** — cổng 2 không tồn tại được |

**Tổng: 15 neo được kiểm. 7 đúng hoàn toàn, 3 đúng nhưng kèm lý do sai hoặc sai chỗ, 5 sai.**

---

## 3. Những chỗ tài liệu SAI so với cây thật

> Ghi ra, không sửa trong tài liệu.

### 3.1 `list` KHÔNG thể "nhân bản output của `omp find`" — đây là lỗi nghiêm trọng nhất

W22 lặp **bốn lần** rằng `list` phải "nhân bản output của `omp find`", và cổng 2 đòi
`bun run session list` khớp `bun run find` từng byte. Điều này không thể đúng:

`packages/coding-agent/src/cli/find-cli.ts:1-3` (nguyên văn):
```
 * `omp find`: run the semantic `find` tool's cascade from the shell. Same
 * search as the tool, printed as a ranked, colored digest (or JSON).
```

`find-cli.ts:74-78`:
```
	if (!cmd.query.trim()) {
		console.error(chalk.red("Error: query is required"));
		process.exit(1);
	}
```

`find-cli.ts:46-49` in ra: `` `${hits.length} hit(s)` for "${cmd.query}" in ${rel} · τ ${threshold.toFixed(2)}` ``.

`omp find` **bắt buộc có query**, quét cây file bằng `runCascade`, in score gauge + `$${stats.cost.toFixed(4)}`.
Nó không bao giờ mở session store. `omp session list` thì phải liệt kê file `.jsonl` trong
`getSessionsDir()`. **Hai miền dữ liệu khác nhau, không thể khớp từng byte.**

Cách gõ đúng: `list` phải gọi `listSessionsReadOnly` / `listAllSessions` từ
`packages/coding-agent/src/session/session-listing.ts:646` và `:651` — **cùng hàm** mà
`omp gc` (tức `cli/gc-cli.ts:482, :493`) và `/resume` dùng. Đó mới là "một nguồn sự thật".

### 3.2 "Không có verb archive/unarchive session nào" — SAI, cơ chế archive đã có

Claim đúng ở chỗ *tên* (không có subcommand tên `archive`), nhưng sai ở chỗ *cơ chế*, và đây
là chỗ khiến W22 nguy hiểm nhất nếu gõ theo:

`packages/coding-agent/src/commands/gc.ts:16` — `archive: Flags.boolean({ description: "Archive cold sessions" }),`
`packages/coding-agent/src/commands/gc.ts:18` — `"cold-archive-after-days": Flags.integer({ description: "Minimum session age before archiving" }),`

`cli/gc-cli.ts:214-215`:
```
function getArchivedSessionsDir(agentDir: string): string {
	return path.join(path.dirname(getSessionsDir(agentDir)), "archive", "sessions");
}
```

`cli/gc-cli.ts:506-518` — `archiveDestination()` ghi ra `` path.join(archiveRoot, `${relativePath}.gz`) ``
(tức **gzip**), và `cli/gc-cli.ts:656-693` — `moveSessionWithArtifacts()` gzip session, move thư mục
artifacts, và **rollback** nếu giữa chừng hỏng, cùng dọn dòng history
(`cleanupHistoryRowsForArchivedSessions`, `gc-cli.ts:748`).

Hệ quả trực tiếp: nếu implementer viết `omp session archive` bằng `movePath` trần (như
`gc-cli.ts:528` sẵn có sẵn) thì `omp gc --archive` sẽ **không nhìn thấy** session đó, và sẽ
tạo ra một đường ghi thứ hai lên cùng store. Đó chính xác là "nguồn sự thật thứ hai" mà W22 tự
cấm — chỉ là W22 không biết cơ chế cũ đã tồn tại.

### 3.3 Bảng "File cần chạm tới" THIẾU `command-help.ts`

W22 liệt kê 6 file. `packages/coding-agent/src/cli/command-help.ts` không có trong đó, nhưng
`packages/coding-agent/test/cli-command-metadata.test.ts:30` đã có sẵn:

```
            expect(entry.help, `${entry.name} must provide static help metadata`).toBeDefined();
```

Thêm entry `session` mà không có `sessionHelp` ⇒ test này **đỏ** với thông báo
`session must provide static help metadata`. Cần thêm file thứ 7 vào bảng.

### 3.4 "49" đúng, nhưng lý do trong tài liệu thì sai

W22 (và `GAP-REGISTER-2.md:774`) giải thích 50→49 bằng: *"con số 50 đếm bằng `grep -c 'name: "'`,
tức tính cả **tên option lồng nhou**"*. Đo lại thì không phải:

```
$ grep -oE '^\s+name: "[^"]*"' … | sort | wc -l          → 50
$ grep -oE '^\s+name: "[a-z0-9-]+"' … | sort -u | wc -l  → 49
$ diff hai danh sách trên
1d0
< 		name: "__complete"
```

Chênh lệch 50 vs 49 là entry nội bộ `__complete` tại `cli-commands.ts:88` — tên có dấu `_` nên
không khớp `[a-z0-9-]+`. **Không có tên option lồng nào trong file.** Kết luận ("49 lệnh cấp một,
`doctor`/`session` đều không có") vẫn đúng; chỉ có câu giải thích là sai.

### 3.5 File test mới đặt sai chỗ

W22 bảo tạo `packages/coding-agent/test/session/session-cli.test.ts` và để assertion phân tuyến ở đó.
Nhưng assertion phân tuyến phải dùng chung với W18, và nhà của nó đã có sẵn:
`packages/coding-agent/test/cli-argv-routing.test.ts` (94 dòng, đã có `import { resolveCliArgv }
from "@oh-my-pi/pi-coding-agent/cli-commands"` ở dòng 12, và đã có một test top-level dispatch ở
dòng 59-63). Đặt assertion vào file mới là tách hai assertion rời rạc — đúng thứ W22 tự cảnh báo.

### 3.6 Hình dạng upstream: codex KHÔNG có namespace `session`

Nguồn là `codex.129`. Đọc `codex-ref/codex-rs/cli/src/main.rs:202-221` (nguyên văn):

```rust
    /// Resume a previous interactive session (picker by default; use --last to continue the most recent).
    Resume(ResumeCommand),

    /// Queue a message for an existing session.
    Queue(QueueCommand),

    /// Archive a saved session by id or session name.
    Archive(SessionArchiveCommand),

    /// Permanently delete a saved session by id or session name.
    Delete(DeleteCommand),
    …
    /// Unarchive a saved session by id or session name.
    Unarchive(SessionArchiveCommand),

    /// Fork a previous interactive session (picker by default; use --last to fork the most recent).
    Fork(ForkCommand),
```

Codex dùng **verb cấp một** (`codex archive`, `codex delete`, `codex unarchive`), **không** có
`codex session <verb>`; và `--last` là cờ của `resume`/`fork`, không phải của archive. Không cây
tham chiếu nào có namespace 5 verb như W22 mô tả: `claude-code-ref/src/commands/session/index.ts:8`
mô tả là `"Show remote session URL and QR code"` — một lệnh TUI về remote, không liên quan.

Khuyến nghị: giữ hình `omp session <verb>` (W22 đã chốt, và nó đọc được hơn khi có 5 verb), nhưng
**ghi vào PR rằng đây là hình dựng, không phải hình chép** — vì `GAP-REGISTER-2.md:795` ghi
"Pháp lý: chỉ mang ý tưởng. Khuôn lấy từ chính `commands/find.ts` của omp, không từ codex."

---

## 4. Hợp đồng test

Bốn file liên quan. **Assertion (1) là của W18 — viết MỘT cái, đặt ở `cli-argv-routing.test.ts`.**

### (1) Assertion phân tuyến dùng chung W18 — `packages/coding-agent/test/cli-argv-routing.test.ts`

Một test duy nhất, phủ **cả** `doctor` **và** `session`, lặp trên toàn bộ registry:

```ts
// packages/coding-agent/test/cli-argv-routing.test.ts — thêm sau dòng 63
import { commands } from "@oh-my-pi/pi-coding-agent/cli-commands";

test("every registered subcommand dispatches instead of falling through to launch", () => {
    for (const { name } of commands) {
        expect(resolveCliArgv([name, "--help"])).toEqual({ argv: [name, "--help"] });
    }
});
```

- **Lặp trên registry, không hard-code tên** — đó là thứ biến "mọi subcommand thật sự được phân
  tuyến" thành một phép kiểm có thể đỏ, thay vì hai assertion rời rạc.
- **Cũng tự phủ `doctor`** khi W18 thêm entry — không cần viết thêm.

**Hồi quy → người dùng thấy gì:** xoá entry `session` khỏi `cli-commands.ts` → test đỏ ngay với
tên lệnh. Nếu lọt, `omp session list` không còn in bảng; nó **gửi `session list` thành prompt
cho LLM** và mở một phiên agent mới (`cli-commands.ts:450`: `return { argv: ["launch", ...argv] };`).
Đó là hồi quy #1496/#1499 — hậu quả im lặng, không báo lỗi.

### (2) Bản âm phủ định của nguồn sự thật — `packages/coding-agent/test/session/session-cli.test.ts` (tạo mới)

Xây một store thật (thư mục tạm, vài file `*.jsonl` hợp lệ), rồi:

- `omp session list` và `listSessionsReadOnly()` trên cùng store cho ra **cùng tập `path`**, cùng thứ tự.
- `omp session show <id>` trả `SessionInfo` mà `resolveResumableSession()` trả cho cùng id.

**Hồi quy → người dùng thấy gì:** nếu `list` tự glob `*.jsonl` thay vì gọi `listSessionsReadOnly`,
`/resume` bỏ qua session 0-turn (`isEmptySession`, `session-listing.ts:676`) còn `omp session list`
thì không — cùng một store, hai danh sách khác nhau, và người dùng script không bao giờ thấy session
mà TUI cho phép mở.

### (3) Bốn verb đọc từ đường chung — cùng file

`show` / `archive` / `unarchive` / `delete` với một target không tồn tại phải **cùng** trả về
cùng một lỗi resolve, và cùng thoát cùng mã. `archive` trên một session đã archive phải báo
trùng đích, khớp với `gc-cli.ts:662` (`archive destination exists: ${destSession}`).

**Hồi quy → người dùng thấy gì:** `omp session archive abc` báo "not found" trong khi
`omp gc --archive` vẫn archive được, vì hai lệnh dùng hai bộ resolver khác nhau.

### (4) Bảo toàn — cùng file, hoặc chạy tay trong PR

- `omp find` giữ **từng byte** output. Chụp `bun run find "<query>" > before.txt` **trước** khi
  đổi, `diff` sau. (Đây là cái duy nhất bảo vệ được bằng `diff` byte — không dùng assert chuỗi.)
- `/resume` `/fork` trong TUI không đổi: `test/session/session-manager-fork.test.ts` (18 KB) và
  `test/session/peek-session-init.test.ts` phải xanh mà không sửa.
- `omp gc` / `omp share` giữ nguyên phạm vi: `bun test packages/coding-agent/test/session/` xanh.
- `flag-tables.ts:249` và `:300` không đổi một dòng: `git diff --stat packages/coding-agent/src/cli/flag-tables.ts` → rỗng.

### (5) Cần có sẵn, không viết mới

`test/cli-command-metadata.test.ts:30` **đã** phủ "mọi entry phải có `help`". Thêm `session`
mà quên `sessionHelp` ⇒ đỏ. Đừng viết lại cái này.

---

## 5. Các bước

Mỗi neo dưới đây đã mở và đọc trong đợt này.

### Bước 1 — Đo lại số lệnh trước khi viết PR
```bash
grep -oE '^\s+name: "[a-z0-9-]+"' packages/coding-agent/src/cli-commands.ts | sort -u | wc -l   # 49
grep -n '__complete' packages/coding-agent/src/cli-commands.ts                                    # dòng 88
```
Ghi 49 **kèm lý do đúng**: 50 nếu tính `__complete`. Đừng ghi "tên option lồng nhou" — sai (§3.4).

### Bước 2 — Thêm `sessionHelp` vào `command-help.ts`
Neo: `command-help.ts:127` (`export const setupHelp = {`) và `:131` (`export const shellHelp = ...`).
Chèn giữa. Bỏ bước này thì `cli-command-metadata.test.ts:30` đỏ (§3.3).

### Bước 3 — Tạo `commands/session.ts` theo khuôn thật
Khuôn là `commands/worktree.ts:11-60`, **không** phải `find.ts` — vì `worktree.ts` là lệnh
nhiều verb đã có sẵn, dùng đúng khuôn positional-action mà `session` cần:

`commands/worktree.ts:18-23` (nguyên văn):
```ts
		action: Args.string({
			description: "list (default), clear, or add",
			required: false,
			options: ["list", "clear", "add"],
			default: "list",
		}),
```

Sau đó `commands/session.ts:1-9` theo khuôn `commands/find.ts:5-9`:
```ts
import { Args, Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { sessionHelp as commandHelp } from "../cli/command-help";

export default class Session extends Command {
    static description = commandHelp.description;
```

Ba cờ: `last: Flags.boolean(...)`, `all: Flags.boolean(...)`, `json: Flags.boolean(...)`.

### Bước 4 — `list` gọi đường chung, KHÔNG gọi `loadIndex`
Neo: `session-listing.ts:646` (`listSessionsReadOnly`) và `:651` (`listAllSessions`).
Định nghĩa `list` là: `listAllSessions()` khi `--all`, ngược lại `listSessionsReadOnly(dir)`.
Xem §3.1 — đừng theo "nhân bản `omp find`" trong tài liệu.

### Bước 5 — `--last` dùng `findMostRecentSession`
Neo: `session-listing.ts:702-708`:
```ts
export async function findMostRecentSession(
	sessionDir: string,
	storage: SessionStorage = new FileSessionStorage(),
): Promise<string | null> {
	const sessions = await scanSessionDir(sessionDir, storage, false);
	return sessions[0]?.path ?? null;
}
```

### Bước 6 — Bốn verb còn lại dùng `resolveResumableSession`
Neo: `session-listing.ts:821-848`. `omp share` đã làm đúng việc này — `commands/share.ts:16`
import chính nó, và `:26` mô tả `"Session id (prefix) or path to a session .jsonl"`. Lặp lại
cách giải target đó.

### Bước 7 — `archive` / `unarchive` phải đi qua đường của `omp gc`, không dựng đường mới
Neo: `gc-cli.ts:214-215` (`getArchivedSessionsDir`), `:506-518` (`archiveDestination` → `.gz`),
`:656-693` (`moveSessionWithArtifacts` → gzip + artifacts + rollback). Nếu `archive` ghi bằng
đường riêng thì `omp gc --archive` không thấy session đó (§3.2). `unarchive` phải giải nén `.gz`
về `sessionsRoot` bằng chính quy tắc `path.relative` ngược của `archiveDestination`.

### Bước 8 — Đăng ký entry `session` trong `cli-commands.ts`
Neo chèn: `cli-commands.ts:205` (`name: "setup"`) → `:210` (`name: "shell"`). Dùng đúng ba dòng
như `find` tại `:108-111`. **Cùng đợt merge với W18.**

### Bước 9 — Viết assertion phân tuyến, MỘT cái
Neo: `test/cli-argv-routing.test.ts:59-63` (test `gc` sẵn có) — thêm ngay dưới, code ở §4(1).

### Bước 10 — Chạy cổng
```bash
bun run check:ts
bun test packages/coding-agent/test/cli-argv-routing.test.ts
bun test packages/coding-agent/test/cli-command-metadata.test.ts
bun test packages/coding-agent/test/session/
```

---

## 6. Cổng

| # | Lệnh | ĐỎ ĐƯỢC KHÔNG | Bằng cách nào |
|---|---|---|---|
| G1 | `grep -c 'name: "session"' packages/coding-agent/src/cli-commands.ts` ≥ 1 | **CÓ** | Xoá entry `session` khỏi `commands[]` → grep trả `0`. Đỏ theo nghĩa đen. |
| G2 | assertion phân tuyến lặp trên `commands` (W18+W22, MỘT cái) | **CÓ** | Xoá entry `session` → `resolveCliArgv(["session","--help"])` trả `{ argv: ["launch", "session", "--help"] }` (theo `cli-commands.ts:450`) → `toEqual` fail, và fail với đúng tên lệnh trong message. |
| G3 | `bun run session list` khớp `bun run find` | **KHÔNG — CỔNG NÀY KHÔNG TỒN TẠI** | Không thể đỏ vì không thể xanh: `omp find` là tìm kiếm ngữ nghĩa file, `session list` là liệt kê session. Xem §3.1. **Phải bỏ và thay** bằng G3'. |
| G3' | `omp session list` cho ra **cùng tập `path`, cùng thứ tự** với `listSessionsReadOnly()` trên cùng store | **CÓ** | Đổi `list` sang glob `*.jsonl` trần, hoặc bỏ qua `isEmptySession` → danh sách lệch, `toEqual` trên mảng `path` fail. Đây là phép so sánh có thật, không phải so chuỗi format. |
| G4 | `flag-tables.ts` không đổi một dòng | **CÓ** | `git diff --stat packages/coding-agent/src/cli/flag-tables.ts` rỗng. Sửa `:249` hoặc `:300` → file xuất hiện trong diff. |
| G5 | `omp find` giữ từng byte | **CÓ** | Chụp `bun run find "<query>" > /tmp/before.txt` **trên base trước khi sửa**, `diff` sau. Khác byte → đỏ. (Phải chụp trước; nếu chụp sau khi sửa thì cổng luôn xanh.) |
| G6 | `bun run check:ts` | **CÓ** | Bỏ `sessionHelp` → `cli-command-metadata.test.ts:30` đỏ; bỏ `command-help.ts` khỏi import → typecheck đỏ. |

**Câu trả lời thẳng cho câu hỏi quan trọng nhất:** 5/6 cổng đỏ được thật. **G3 không bao giờ đỏ được
vì nó không bao giờ xanh được** — nó là loại cổng tệ nhất: tạo cảm giác an toàn giả, và khiến
implementer dỗi công sang viết lại `list` theo hình `omp find` (tức tạo đường đọc thứ hai — đúng
thứ W22 tự cấm ở mục "Cách sai dễ nhất"). **G3 phải được viết lại thành G3'** trước khi mở PR.

---

## 7. Cạm bẫy riêng của work item này

Xếp theo mức nguy hiểm thật, không theo thứ tự trong tài liệu.

### 7.1 Tin "nhân bản output `omp find`" và viết lại `list` từ đầu
Đây là cạm bẫy **dễ trúng nhất**, vì nó đến thẳng từ văn bản kế hoạch, lặp lại bốn lần. Nó *trông* hợp lý vì
"nhân bản thay vì viết lại" nghe như nguyên tắc tốt — nhưng ở đây `omp find` và session store là
hai miền dữ liệu không giao nhau. Kẻ gõ sẽ bỏ `listSessionsReadOnly` và tự dựng bảng, tạo đúng
nguồn sự thật thứ hai mà W22 cấm ở mục kế. **Cách tránh duy nhất: đọc `session-listing.ts:646`
trước khi viết dòng nào của `list`.**

### 7.2 Tin "không có archive session nào" và viết `archive` bằng `movePath` trần
Cơ chế archive đã có trong `gc-cli.ts` với ba đặc tính không đoán được nếu chỉ đọc tên hàm:
gzip (`.gz`), move kèm thư mục artifacts, và rollback giữa chừng. Bỏ sót một trong ba thì
`omp gc --archive` im lặng không thấy session do `omp session archive` tạo ra — hỏng dữ liệu âm
thầm, không lỗi. **Đây là cạm bẫy nặng nhất về hậu quả.**

### 7.3 Quên `command-help.ts` vì nó không nằm trong bảng "File cần chạm tới"
Bảng của W22 liệt 6 file, không có `command-help.ts`. Thêm entry `session` là `check:ts`/`bun test`
đỏ với `session must provide static help metadata` — và người gõ dễ tưởng đó là lỗi của W18 rồi
đụng vào phần của người khác.

### 7.4 Tách assertion phân tuyến thành hai
Chính W22 đã cảnh báo, nhưng cái cảnh báo nằm ở mục "Phụ thuộc" và "Cách sai dễ nhất" — xa hơn
bước viết test. Hai file test khác nhau cũng là hai assertion rời rạc, dù cùng một PR. **Ghi
assertion vào `cli-argv-routing.test.ts` ngay dưới test `gc` sẵn có ở dòng 59.**

### 7.5 Đếm 49 mà đưa nhầm lý do "tên option lồng nhou"
Không có tên option lồng nào trong file. Chênh lệch là `__complete` ở dòng 88. Nếu ghi sai lý do
vào PR, reviewer đối chiếu sẽ không tìm ra bằng chứng và phải tự đo lại.

### 7.6 Dùng `loadIndex` cho `list` vì tài liệu gọi nó là "nguồn duy nhất"
`loadIndex` (`indexed-session-storage.ts:30`) chỉ tồn tại trên các backend *indexed*
(SQL/Redis). `listAllSessions` mặc định là `new FileSessionStorage()` và **không bao giờ gọi
`loadIndex`** — nó glob `*/*.jsonl` rồi `collectSessionsFromFiles`. Dùng `loadIndex` sẽ hỏng
trên backend file mặc định.

### 7.7 Thêm `--last` rồi tưởng nó tương đương `--continue`
`flag-tables.ts:300` `--continue` là boolean không giá trị. `--last` trong codex (`main.rs:202`)
là cờ của `resume`/`fork` để chọn session mới nhất. Nếu implementer dùng lại `setResume` cho
`--last` thì đụng vào đúng dòng mà W22 dặn giữ nguyên.

---

## 8. Nguồn đã mở và đọc trong đợt này

Đường dẫn tuyệt đối:

- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/cli-commands.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/cli/command-help.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/cli/flag-tables.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/cli/find-cli.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/cli/gc-cli.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/commands/find.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/commands/gc.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/commands/share.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/commands/worktree.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/session/indexed-session-storage.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/session/session-listing.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/session/session-storage.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/src/slash-commands/helpers/security.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/test/cli-argv-routing.test.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent/test/cli-command-metadata.test.ts`
- `/Users/tranquangdang21/Projects/ultraworkers/package.json` (dòng 85, 89–91, 109)
- `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/GAP-REGISTER-2.md` (dòng 685–688, 771–800)
- `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md` (dòng 4195–4296)
- `/Users/tranquangdang21/Projects/codex-ref/codex-rs/cli/src/main.rs` (dòng 143–225, 376–399)
- `/Users/tranquangdang21/Projects/claude-code-ref/src/commands/session/index.ts`
- `/Users/tranquangdang21/Projects/claude-code-ref/src/commands/session/session.tsx`
