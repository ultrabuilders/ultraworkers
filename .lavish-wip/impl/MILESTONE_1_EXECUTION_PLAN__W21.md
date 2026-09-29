# PHIẾU TRIỂN KHAI — W21 · GAP-M1-21 — Harden tiến trình trước `main`

> Nguồn kế hoạch: `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md` §`## W21.` (dòng 4081–4200).
> Nguồn sổ: `.lavish-wip/GAP-REGISTER-2.md` mục `GAP-M1-21` (dòng 741, `**Nguồn:** codex.86`).
> Cây tham chiếu dùng để đối chiếu: `codex-ref`, `pi-ref`, `gajae-ref`, `claude-code-ref`, `deepseek-harness`.
> Ngày kiểm: 2026-09-29. **13 neo đã mở và đọc. 11 đúng nguyên vẹn, 2 hỏng** (chi tiết ở §7).

---

## 1. Cái gì thay đổi, quan sát được

Sau khi gộp, `omp` tự khoá chính nó trước khi làm bất cứ việc gì: trên Linux `prctl(PR_SET_DUMPABLE, 0)` khiến không một debugger nào `ptrace`-attach được vào tiến trình đang giữ API token, `setrlimit(RLIMIT_CORE, 0)` khiến nó không đổ core dump chứa token, và **mọi** biến `LD_*` / `DYLD_*` bị gỡ khỏi môi trường mà **mọi** child process — bash tool, LSP, kernel, browser, MCP stdio, blob-broker, worker — kế thừa, trong khi `PATH` / `NODE_PATH` / Homebrew của chúng được giữ nguyên byte; trên Windows và macOS không gọi syscall nào cả, chỉ lọc env.

---

## 2. Bảng điểm sửa

| đường/dẫn | symbol | TRƯỚC (trích từ file thật) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli.ts:54` | `process.title = APP_NAME` | `	process.title = APP_NAME;` | giữ nguyên dòng này, **nhưng dời xuống sau** khối `if (isProcessEntry) hardenProcess();` mới. Đây là ràng buộc thứ tự duy nhất có hiệu lực — xem §6.1. |
| `packages/coding-agent/src/cli.ts:63` | `isProcessEntry` | `const isProcessEntry = import.meta.main \|\| process.env.PI_COMPILED === "true";` | **KHÔNG thêm const mới.** Tái dùng hằng sẵn có. Chỉ thêm khối gọi harden ngay **trên** dòng 63 (vì dòng 63 nằm **sau** dòng 54, `isProcessEntry` phải được khai báo trước khi dùng, hoặc dời cả 63 lên trên 54). |
| `packages/coding-agent/src/cli.ts:9-12` | `delete process.env.MallocStackLogging…` | `try {\n\tdelete process.env.MallocStackLogging;\n\tdelete process.env.MallocStackLoggingNoCompact;\n} catch {}` | **không sửa.** Đây là tiền lệ đúng cho `LD_*`: cùng một ý ("child không tự chặn được warning của nó, phải gỡ ở cha"), cùng một vị trí, cùng `try/catch` rỗng. |
| `packages/coding-agent/src/cli.ts:46-51` | version gate | `if (Bun.semver.order(Bun.version, MIN_BUN_VERSION) < 0) {` … `	process.exit(1);` | **không sửa**, nhưng phải **quyết định** harden chạy trước hay sau. Xem §6.2 — đây là quyết định mà plan không đưa ra. |
| *(tệp mới)* `packages/utils/src/process-hardening.ts` | `hardenProcess()` | — chưa tồn tại | `export function hardenProcess(): void` — 4 syscall sau `try/catch` im lặng, **không** bao giờ ném. Đặt ở `packages/utils/` **không** phải `coding-agent/src/`, vì phải nằm cạnh `process-name.ts` (khuôn FFI sẵn có) và cạnh `env.ts` (khuôn lọc env sẵn có). |
| `packages/utils/src/process-hardening.ts` | `hardenProcess()` — thân | — | Sao y hệt khuôn `setProcessName` tại `packages/utils/src/process-name.ts:37-56`: `for (const soname of ["libc.so.6", "libc.so"]) { try { dlopen… } catch {} }`, `dlopen` xong `finally { libc.close(); }`, hệt dòng 46-47. |
| `packages/utils/src/env.ts:52-67` | `filterProcessEnv` | `if (\n\t\t\t!isSafeEnvName(key) \|\n\t\t\tisMacosMallocStackLoggingEnvName(key) \|\n\t\t\tvalue === undefined \|\n\t\t\t!isSafeEnvValue(value)\n\t\t) {\n\t\t\tcontinue;\n\t\t}` | thêm một vế `isLoaderInjectionEnvName(key) ||` vào chính chuỗi điều kiện này. Đây là **điểm nối duy nhất** — không tạo `sanitizeChildEnv` mới. |
| `packages/utils/src/env.ts` (mới, cạnh `isMacosMallocStackLoggingEnvName` ở dòng 36-38) | `isLoaderInjectionEnvName` | — chưa tồn tại | `export function isLoaderInjectionEnvName(name: string): boolean` → `return name.startsWith("LD_") \|\| name.startsWith("DYLD_");` — **tiền tố**, không phải 4 literal. |
| `packages/utils/src/env.ts:36-38` | `isMacosMallocStackLoggingEnvName` | `export function isMacosMallocStackLoggingEnvName(name: string): boolean {\n\treturn name === "MallocStackLogging" || name === "MallocStackLoggingNoCompact";\n}` | **không sửa** — đây chính là hàng xóm cần ngắm. `hardenProcess` ở tầng tiến trình và `isLoaderInjectionEnvName` ở tầng env phải giữ **hai lớp** giống hệt: cha gỡ khỏi `process.env` (để mọi child kế thừa sạch, kể cả child Rust sinh ra từ `ptree.ts` hay `pi-vcs`), lọp hai chặn child đã sinh qua `execve` với env do omp dựng tay. |
| `packages/utils/src/procmgr.ts:31-42` | `buildSpawnEnv` | `return {\n\t\t...filterChildShellEnv(Bun.env),\n\t\tSHELL: shell,` | **không sửa.** Đây là nơi `sanitizeChildEnv` được plan chỉ định sẽ "nối vào" — nhưng nó **đã tự gọi** `filterChildShellEnv` → `filterProcessEnv`. Sửa `env.ts:57` là đủ; sửa ở đây là thừa. |
| `packages/coding-agent/test/harden-process.test.ts` | — | — chưa tồn tại | tệp mới. Nhưng **thêm** vào `packages/utils/test/env.test.ts` sẽ rẻ hơn cho case (3) — xem §5. |

---

## 3. Các bước (mỗi bước có neo đã kiểm)

### Bước 1 — Ghi lại phần omp ĐÃ có, đừng làm lại
Không gõ gì ở bước này. Xác nhận bằng neo:
- `crates/pi-shell/src/process.rs:1627` → `pub fn kill_process_group(pgid: i32, signal: i32) -> bool {`
- `crates/pi-shell/src/process.rs:1446` → `		let _ = kill_process_group(pgid, signal);`
- `crates/pi-shell/src/process.rs:1496` → `		let _ = kill_process_group(pgid, TERM_SIGNAL);`
- `crates/pi-shell/src/process.rs:1525` → `		let _ = kill_process_group(pgid, KILL_SIGNAL);`

1496 (TERM) → 1525 (KILL) là leo thang TERM→KILL. **Cả bốn neo đúng nguyên vẹn, không sửa gì.**

### Bước 2 — Tạo `process-hardening.ts` theo khuôn FFI sẵn có, KHÔNG theo hình dạng trong plan
Mở `packages/utils/src/process-name.ts:29-58` và copy khuôn, đừng viết từ trí nhớ:

```ts
export function setProcessName(name: string): void {
	try {
		process.title = name;
	} catch {}

	if (os.platform() !== "linux") return;

	// glibc first, then the generic soname for musl-style layouts (see stderr-guard.ts).
	for (const soname of ["libc.so.6", "libc.so"]) {
```

Bốn syscall, mỗi cái một `try/catch` rỗng riêng:

| syscall | nền tảng | hằng số | giá trị | nguồn |
| --- | --- | --- | --- | --- |
| `prctl(PR_SET_DUMPABLE, 0, 0, 0, 0)` | linux | `PR_SET_DUMPABLE` | `4` | codex `lib.rs:46` |
| `prctl(PR_SET_PDEATHSIG, SIGKILL, …)` | linux | `PR_SET_PDEATHSIG` / `SIGKILL` | `1` / `9` | **plan tự thêm, codex không có** |
| `setrlimit(RLIMIT_CORE, {0,0})` | unix | `RLIMIT_CORE` | `4` | codex `lib.rs:109` |
| (macOS) `ptrace(PT_DENY_ATTACH, …)` | darwin | `PT_DENY_ATTACH` | `31` | codex `lib.rs:88` — **plan bỏ sót, xem §6.3** |

Ghi `args: [FFIType.i32, FFIType.i32, FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.i32` cho `prctl` — **khác** `process-name.ts:41` (dùng `FFIType.ptr` cho tham số 2 vì `PR_SET_NAME` cần con trỏ; `PR_SET_DUMPABLE` chỉ cần `i32`). Đây là chỗ dễ copy-paste sai nhất của cả item.

### Bước 3 — Gỡ `LD_*` / `DYLD_*` ở tầng env trung tâm
`packages/utils/src/env.ts:52-67` (`filterProcessEnv`). Thêm `isLoaderInjectionEnvName` cạnh `isMacosMallocStackLoggingEnvName` (`env.ts:36-38`) rồi thêm một vế vào chuỗi điều kiện ở dòng 57.

**Tiền tố, không phải danh sách literal.** Bằng chứng: codex dùng `remove_env_vars_with_prefix(b"LD_")` (`lib.rs:60`) và `remove_env_vars_with_prefix(b"DYLD_")` (`lib.rs:99`), và test biên của chính codex — `lib.rs:181` `env_keys_with_prefix_filters_only_matching_keys` — chứng minh `LD_TEST` bị bỏ, `PATH` và `DYLD_FOO` sống. Dùng tiền tố thì khớp cả ranh giới plan nêu **và** tham chiếu thật.

**Vì sao ở đây chứ không phải `bash-executor.ts`:** xem §7.2.

### Bước 4 — Nối `hardenProcess()` vào `cli.ts`, tái dùng `isProcessEntry` sẵn có
`isProcessEntry` **đã tồn tại** tại `packages/coding-agent/src/cli.ts:63`:

```
const isProcessEntry = import.meta.main || process.env.PI_COMPILED === "true";
```

Không thêm hằng mới. Thêm khối gọi **trên** dòng 63, và dời `process.title = APP_NAME` (dòng 54) **xuống dưới** nó. Vì `isProcessEntry` phải được khai báo trước khi dùng, khối gọi phải nằm sau dòng 63 → dòng 54 và dòng 63 phải **hoán đổi chỗ**. Đây là thay đổi hình thức nhỏ nhưng bắt buộc; nếu không sẽ là `ReferenceError` lúc khởi động.

Ràng buộc thứ tự cần ghi vào PR: `setFullProcessName()` (gọi `setProcessName(APP_NAME)` qua `await import`) chạy ở `cli.ts:548` và `cli.ts:586` — **đã** sau mọi vị trí harden. Nên chỉ `process.title` dòng 54 là bị ràng buộc. Ghi rõ điều này trong PR, nếu không người đọc sẽ tưởng phải can thiệp cả hai.

### Bước 5 — Kiểm tra lại tương tác với `postmortem`
`packages/utils/src/postmortem.ts:562-563`, trong `fatal()`:
```ts
const { default: inspector } = await import("node:inspector");
inspector.open(undefined, undefined, false);
```
Mở đường dẫn này **trước** khi bật harden. Nếu `PR_SET_DUMPABLE=0` làm inspector không lên được, `fatal()` — đường báo lỗi cuối cùng của omp — sẽ chết im lặng. Đây là hệ quả **chưa ai đo** trong plan. Phải chạy thật: `omp` cho crash, xem stderr còn ra không.

### Bước 6 — Test (xem §4)
### Bước 7 — `bun run check:ts`, không dùng `tsc`

---

## 4. Hợp đồng test

Ba case bảo toàn, giữ nguyên ý plan. Nhưng **hai case phải nằm ở tệp khác nhau** so với plan nói, vì hai cái đầu là hành vi tiến trình và cái thứ ba là hành vi env thuần.

### Case (1) — Thứ tự
- **Tệp:** `packages/coding-agent/test/harden-process.test.ts` (mới).
- **Cách kiểm:** không assert "có gọi harden" — điều đó đúng ở cả hai thứ tự. Assert **quan hệ**: sau khi module `cli.ts` được nạp, `hardenProcess` phải đứng trước `process.title`. Cách làm duy nhất không rơi vào cấm source-grep: spawn một tiến trình con thật, chạy `cli.ts` với `PI_COMPILED=true`, và **quan sát hệ quả bên ngoài** — child có dumpable hay không (đọc `/proc/self/status` dòng `CoreDump`, hoặc `prctl(PR_GET_DUMPABLE)` qua cùng đường FFI). Thứ tự đảo thì cái ta quan sát phải đổi.
- **Hồi quy = người dùng thấy gì:** `omp` không còn tự bảo vệ, nhưng không ai thấy — không có thông báo, không có log mặc định. Đây là hồi quy **im lặng**, nên case này phải đọc trạng thái kernel, không được đọc log.

### Case (2) — Guard `isProcessEntry` (rủi ro nặng nhất của item)
- **Tệp:** `packages/coding-agent/test/harden-process.test.ts`.
- **Khoảnh khắc dễ sai nhất — `PI_COMPILED` làm hỏng chính case này:** `isProcessEntry` là `import.meta.main || process.env.PI_COMPILED === "true"` (`cli.ts:63`). Tệp `packages/coding-agent/test/worker-selector.test.ts:43` đang set `env: { ...process.env, PI_COMPILED: "true" }` cho một child. Nếu môi trường test có sẵn `PI_COMPILED=true`, case (2) **xanh trong khi harden vẫn bật** — tức là case này tự bảo vệ mình một cách ngẫu nhiên. Test **phải** `delete process.env.PI_COMPILED` trong `beforeEach` và khôi phục ở `afterEach`, nếu không nó là một cổng luôn xanh.
- **Assert:** dưới `bun test`, `hardenProcess()` **không** bật. Đo lại `CoreDump`/dumpable ở chính tiến trình test trước và sau khi nạp `cli.ts` — phải **không đổi**.
- **Bằng chứng nâng đỡ:** bỏ `&& isProcessEntry` → case (2) **phải đỏ**.
- **Hồi quy = người dùng thấy gì:** mọi test chủ động crash trong 791 tệp `.test.ts` của `packages/coding-agent/test/` sẽ **không để lại dấu vết nào**. Không stack, không core dump, không output. Chẩn đoán một test chết âm thầm là thất lạc khó nhất từng gặp — đúng như plan nói, và vì vậy case này không được phép là "assert không ném".

### Case (3) — Biên lọc env
- **Tệp:** `packages/utils/test/env.test.ts` (**tệp đã có**, đã có test cho `filterProcessEnv`). Không tạo `harden-process.test.ts` cho case này.
- **Assert cả hai chiều, cùng một fixture:**
  - vào: `{ PATH: "/usr/bin", NODE_PATH: "/x", LD_PRELOAD: "/tmp/steal.so", LD_LIBRARY_PATH: "/tmp", DYLD_INSERT_LIBRARIES: "/tmp/e.dylib", DYLD_LIBRARY_PATH: "/tmp", LD_TEST: "1" }`
  - ra: `PATH`, `NODE_PATH` còn **nguyên byte**; mọi khoá `LD_`/`DYLD_` biến mất — kể cả `LD_TEST` không nằm trong danh sách 4 literal của plan.
- **Bằng chứng nâng đỡ:** đổi `isLoaderInjectionEnvName` thành `return false` → case (3) **phải đỏ**.
- **Hồi quy = người dùng thấy gì:** hoặc (a) `LD_PRELOAD` lọt xuống bash tool / MCP stdio / browser child — kẻ tấn công kiểm soát được code chạy trong session của bạn; hoặc (b) lọc quá rộng, `PATH` biến mất và **mọi lệnh** trong tool `bash` hỏng với lỗi `command not found` cho tới khi restart.

### Case (4) — bổ sung, do phát hiện ở §6.3
`hardenProcess()` trên **macOS** phải là no-op sạch, giống Windows. Máy dev là darwin và plan không có nhánh macOS. Nếu bỏ qua, case (4) là test Windows mà chạy trên máy mac — tức là **không có test nào** trong item này chạm đúng nền tảng phát triển.

---

## 5. Cổng

```bash
bun run check:ts
bun test packages/coding-agent/test/harden-process.test.ts
bun test packages/utils/test/env.test.ts
# Cổng đỏ cho case (2): bỏ "&& isProcessEntry" ở cli.ts, chạy lại tệp harden-process.
# Cổng đỏ cho case (3): đổi isLoaderInjectionEnvName thành `return false`, chạy lại env.test.
# Cổng đỏ cho macOS: bật nhánh ptrace(PT_DENY_ATTACH), chạy lại — case (4) phải đỏ.
```

**Cổng này có đỏ được không, bằng cách nào?**

| # | Cổng | Đỏ được? | Bằng cách nào / vì sao không |
| --- | --- | --- | --- |
| 1 | `bun test` xanh với ba case | ✅ | — |
| 2 | Bỏ guard `isProcessEntry` → case (2) đỏ | ✅ **nhưng dễ tự lừa** | Đỏ **chỉ khi** `PI_COMPILED` không có trong môi trường. Nếu có, case xanh dù harden bật. Xem case (2). |
| 3 | `sanitizeChildEnv` lọc cả `PATH` → case (3) đỏ | ✅ | Fixture có `PATH` và assert byte nguyên vẹn. |
| 4 | `sanitizeChildEnv` dùng ở **cả hai** đường spawn của `bash-executor.ts` | ❌ **KHÔNG ĐỎ ĐƯỢC** | **Hai đường spawn ấy không tồn tại.** `rg 'Bun\.spawn' packages/coding-agent/src/exec/bash-executor.ts` → **0 hit**. `$\`` khớp 2 dòng (286, 319) là một string literal và một regex character class. Cổng này không thể đỏ vì nó kiểm tra một thứ không có. |
| 5 | `process.title = APP_NAME` còn trong `cli.ts` và nằm sau harden | ✅ | Nhưng **không** được viết bằng source-grep (`expect(src).toContain(...)` là cấm theo AGENTS.md). Làm nó bằng hành vi quan sát được như case (1). |
| 6 | Windows: `hardenProcess()` không ném | ⚠️ **Nửa vời** | Không có máy Windows. Plan đã tự nói "ghi rõ là **chưa kiểm chứng**". Giữ nguyên cách đó — nhưng thêm nhánh macOS (§6.3) vì máy dev **có** macOS và plan bỏ trống đúng chỗ đó. |
| 7 | `bun run check:ts` xanh | ✅ | Có sẵn ở `package.json:90`. |

**Viết lại cổng 4 cho đỏ được:**
> `filterProcessEnv` (`packages/utils/src/env.ts:52`) là điểm nối **duy nhất**; mọi đường spawn — bash (`procmgr.ts:34` `buildSpawnEnv` → `filterChildShellEnv`), LSP, browser, MCP stdio, worker, blob-broker — đều đi qua nó hoặc qua `process.env` của cha. Cổng: `git grep -n 'filterChildShellEnv\|filterProcessEnv' -- packages` phải cho thấy **mọi** đường dựng env con đều gọi một trong hai; thêm một `LD_PRELOAD` giả vào `process.env` rồi chạy `bash` tool thật, xác nhận child **không** thấy nó.

---

## 6. Cạm bẫy riêng của work item này

### 6.1 "Trước mọi import nặng" là không làm được trong ESM — đừng viết code như thể làm được
Mọi `import` của một module ESM đều được nâng lên trước **mọi** câu lệnh. Nên `cli.ts:9-12` (`delete process.env.MallocStackLogging…`) trông như nằm trước import nhưng vẫn chạy **sau** khi mọi import đã đánh giá xong. Plan bước 3 ghi "trước mọi import nặng" — với hàm ý đó, bất kỳ ai ghi comment kiểu "gọi trước mọi import" vào `harden-process.ts` đang nói dối người đọc sau này.

Cách viết đúng: "**câu lệnh đầu tiên trong thân module**", và ràng buộc thứ tự có hiệu lực thật sự là `process.title` dòng 54 — không phải thứ tự import.

### 6.2 `isProcessEntry` đã tồn tại — bước 4 của plan ("Thêm guard") là viết chồng
`cli.ts:63` đã có, với **ý nghĩa khác hoàn toàn** (phát hiện binary Windows đã compile, không phải chống harden test runner). Tái dùng nó là đúng. Nhưng nó **không export** — nên test case (2) **không** thể import nó để assert; phải đo hành vi (dumpable) như case (1)/(2) mô tả. Và vì nó nằm ở dòng 63, **sau** dòng 54, nên hoán đổi chỗ 54↔63 là bắt buộc, không phải tuỳ chọn.

### 6.3 Nhánh macOS bị bỏ trắng, trên đúng máy đang phát triển
Plan viết bốn syscall: Linux dumpable, Linux pdeathsig, portable rlimit, Windows no-op. **macOS không có mặt trong cả danh sách.** Nhưng:
- máy dev là darwin;
- chính phép đo "0 hit" của plan có ghi `PT_DENY_ATTACH` vào mẫu grep — tác giả plan **biết** syscall này tồn tại;
- tham chiếu thật dùng nó: `codex-rs/process-hardening/src/lib.rs:88` `libc::ptrace(libc::PT_DENY_ATTACH, 0, ...)`.

Và `PT_DENY_ATTACH` trên macOS là **một chiều, không gỡ được** trong vòng đời tiến trình — đó là lý do codex ở đó gọi `std::process::exit(6)` khi thất bại. Quyết định này phải được ghi ra tường minh, không được để ngầm. Ba lựa chọn, chọn một và viết vào PR: (a) làm theo codex, macOS dùng `PT_DENY_ATTACH`; (b) macOS chỉ gọi `setrlimit(RLIMIT_CORE, 0)` — yếu hơn, nhưng **gọi được**; (c) macOS là no-op hoàn toàn, ghi rõ là chấp nhận khoảng trống. Điều bắt buộc: **chọn tường minh**, không để mặc định rơi vào "không làm gì" mà không ai ghi.

### 6.4 `PR_SET_PDEATHSIG` không từ tham chiếu, và có một cái bẫy thật
Codex **không** có `PR_SET_PDEATHSIG` (`lib.rs:46` chỉ `PR_SET_DUMPABLE`). Đây là đóng góp riêng của plan — chấp nhận được, nhưng phải biết nó kéo theo một hệ quả mà plan không nói: `PDEATHSIG` bị **giao cho con** khi fork. Mọi child mà omp sinh ra — bash, LSP, browser, worker — sẽ nhận SIGKILL nếu omp chết. Đó gần như chắc chắn là điều **không** ai muốn khi shell nền hoặc daemon cần sống lâu hơn session. Nếu giữ `PDEATHSIG`, **phải** đặt lại `PR_SET_PDEATHSIG, 0` trong mọi đường spawn dài hạn, hoặc chấp nhận và viết rõ trong PR. Đây là cạm bẫy lớn nhất về **hành vi**, lớn hơn cả cạm bẫy "quên guard" mà plan nhấn mạnh.

### 6.5 `process.title` không phải là lần đặt tên duy nhất
`cli.ts:54` `process.title = APP_NAME` và `cli.ts:96` `setProcessName(APP_NAME)` (gọi ở 548 và 586). `setProcessName` **đã** chạy sau mọi vị trí harden, nên không cần can thiệp — nhưng phải **nói rõ** trong PR, không thì người đọc tưởng phải sửa cả hai.

### 6.6 Tạo `sanitizeChildEnv` là vi phạm `AGENTS.md`
`AGENTS.md`: *"Missing capability? Extend the central helper … and call it — don't fork its logic locally"* và *"Two implementations of the same thing is a bug even when both work."* `filterProcessEnv` (`env.ts:52`) **đã** là chỗ lọc env con trung tâm, **đã** có `isMacosMallocStackLoggingEnvName` (dòng 36-38) làm đúng việc "gỡ biến nguy hiểm khỏi env con" mà W21 định làm, và **đã** có `stripGitRepoLocationEnv` (dòng 92-107) làm đúng khuôn "gỡ một nhóm tên khỏi env con, có doc comment giải thích vì sao, mirror sang Rust". Thêm `sanitizeChildEnv` ở `coding-agent/src/` là bản thứ tư.

---

## 7. Các neo hỏng (ghi ra, không sửa trong tài liệu)

### 7.1 `bash-executor.ts` — cổng 4 kiểm hai thứ không tồn tại
Plan (cổng 4, bước 5, và dòng bảng "`sanitizeChildEnv()` dùng chung cho `Bun.spawn` và `` $`cmd` ``") nói `bash-executor.ts` có hai đường spawn.

**Đã kiểm:** `rg 'Bun\.spawn' packages/coding-agent/src/exec/bash-executor.ts` → **0 hit**. Hai dòng khớp `$\`` là dòng 286 `const UNSUPPORTED_UNQUOTED_CD_CHARS = "\\$`;&|<>(){}*[]!#\"'";` và dòng 319 `if (quote === \`"\` && /[\\$`\r\n]/.test(target)) return false;` — một string literal và một regex character class.

Tệp dùng brush-core qua native bindings (`import { type MinimizerOptions, PtySession, Shell, type ShellFilesystem, type ShellRunResult, } from "@oh-my-pi/pi-natives";` — khối import dòng 7-14). Env con thật sự đến từ `bash-executor.ts:490` `const { shell, args, env: shellEnv, prefix } = shellConfig;` → `procmgr.ts:99` `env: buildSpawnEnv(shell)` → `procmgr.ts:34` `...filterChildShellEnv(Bun.env)` → `env.ts:159` `const result = filterProcessEnv(env);`.

**Vị trí đúng:** `packages/utils/src/env.ts:52-67`.

### 7.2 "cli.ts hôm nay chỉ làm đúng MỘT việc tiền-main" — SAI
Dòng bảng trong plan và dòng "Đính chính" đều khẳng định điều này. **Không đúng.** `cli.ts` có **ba** việc tiền-main:
1. `cli.ts:9-12` — `delete process.env.MallocStackLogging;` / `delete process.env.MallocStackLoggingNoCompact;` trong `try {} catch {}`, kèm comment giải thích *"a child cannot suppress its own warning, so the only fix is to keep them out of the inherited env here"*. **Đây chính là W21, đã làm sẵn một nửa, cho một biến khác.** Không ai nhắc tới nó.
2. `cli.ts:46-51` — version gate `if (Bun.semver.order(Bun.version, MIN_BUN_VERSION) < 0) { … process.exit(1); }`.
3. `cli.ts:54` — `process.title = APP_NAME;`.

Câu 1 có hai hệ quả: (a) tiền lệ đúng đã có, dùng làm khuôn; (b) xem §6.1 — nó **không** thật sự chạy trước import.

### 7.3 Hình dạng code trong plan lệch tham chiếu ở bốn điểm
Đối chiếu `codex-rs/process-hardening/src/lib.rs` (193 dòng), nguồn ghi trong sổ là `codex.86`:

| điểm | plan viết | codex làm |
| --- | --- | --- |
| biên lọc env | 4 literal (`LD_PRELOAD`, `LD_LIBRARY_PATH`, `DYLD_INSERT_LIBRARIES`, `DYLD_LIBRARY_PATH`) | **tiền tố** — `remove_env_vars_with_prefix(b"LD_")` `lib.rs:60`, `(b"DYLD_")` `lib.rs:99` |
| nơi lọc | hàm `sanitizeChildEnv(env)` trả về bản sao, gọi ở từng spawn | **gỡ khỏi `process.env` của cha** lúc pre-main; không hề có hàm per-child |
| macOS | không nhắc | `pre_main_hardening_macos` `lib.rs:82`, `ptrace(PT_DENY_ATTACH)` `lib.rs:88` |
| khi syscall fail | `try/catch` im lặng + `logger.debug` | `std::process::exit(5/6/7)` — codex **thoát hẳn** |

Dòng "khi syscall fail" là khác biệt **có chủ đích và đúng** (harden không được bao giờ là lý do omp không khởi động). Giữ lựa chọn của plan, nhưng ghi rõ là **rời khỏi tham chiếu có chủ ý**, không phải vô tình lệch.

Dòng "nơi lọc" là khác biệt **quan trọng nhất**: cách của codex (gỡ ở cha) rẻ hơn nhiều và tự động phủ **mọi** child — kể cả child do Rust sinh qua `ptree.ts` hay `pi-vcs`, mà code TS không chạm tới. Cách của plan (lọc từng child) tốn công hơn và chỉ phủ được child do TS dựng env.

### 7.4 Phép đo "0 hit" — đúng, nhưng dễ đọc sai
`git grep -rn 'PR_SET_DUMPABLE\|RLIMIT_CORE\|PT_DENY_ATTACH\|LD_PRELOAD\|DYLD_INSERT' -- packages crates` → **0 hit, đã xác nhận**. Nhưng kết luận rút ra ("không có gì trong cây") rộng hơn phép đo cho phép: `prctl` **đã** có trong cây, hai lần, qua `bun:ffi`:
- `packages/utils/src/process-name.ts:48` → `libc.symbols.prctl(PR_SET_NAME, ptr(buf), 0n, 0n, 0n);` (với `const PR_SET_NAME = 15;` ở dòng 21)
- `packages/utils/src/ptree.ts:51` → `libc.symbols.prctl(36, 1, 0, 0, 0)` (36 = `PR_SET_CHILD_SUBREAPER`, 1 = bật)

Khung FFI mà W21 cần đã có sẵn, hai bản, kèm đúng khuôn "không bao giờ ném" mà plan đòi hỏi. Ước lượng "~50 dòng, file mới" của plan lạc quan; việc thật là **sao chép một khuôn đã tồn tại**, không phải dựng từ đầu.

### 7.5 `PR_SET_PDEATHSIG` không có trong tham chiếu
Xem §6.4. Không phải neo hỏng, nhưng là một syscall plan thêm vào mà không kèm phân tích hệ quả.

---

## 8. Danh sách neo đã kiểm

| # | neo trong work item | kết quả |
| --- | --- | --- |
| 1 | `packages/coding-agent/src/cli.ts:54` | ✅ đúng nguyên vẹn |
| 2 | `packages/coding-agent/src/harden-process.ts` (tệp mới) | ✅ đúng là chưa tồn tại — nhưng **sai chỗ**: nên ở `packages/utils/src/` |
| 3 | `bash-executor.ts` — "cả hai đường spawn (`Bun.spawn` và `` $`cmd` ``)" | ❌ **HỎNG** — không có đường spawn nào. Xem §7.1 |
| 4 | `crates/pi-shell/src/process.rs:1627` | ✅ đúng nguyên vẹn |
| 5 | `crates/pi-shell/src/process.rs:1446` | ✅ đúng nguyên vẹn |
| 6 | `crates/pi-shell/src/process.rs:1496` | ✅ đúng nguyên vẹn (TERM) |
| 7 | `crates/pi-shell/src/process.rs:1525` | ✅ đúng nguyên vẹn (KILL) |
| 8 | `packages/ai/src/auth-storage.ts` | ✅ tồn tại, `export class AuthStorage` ở dòng 80 |
| 9 | `packages/coding-agent/src/secrets/` | ✅ tồn tại, 8 tệp |
| 10 | `bash-interceptor.ts` | ✅ tồn tại tại `tools/bash-interceptor.ts` — nhưng **không** spawn trực tiếp (đi qua `exec/bash-executor`) |
| 11 | `browser/launch.ts` | ✅ tồn tại tại `tools/browser/launch.ts`; `Bun.spawn` ở dòng 331 |
| 12 | `packages/coding-agent/test/harden-process.test.ts` (tệp mới) | ✅ đúng là chưa tồn tại |
| 13 | lệnh đo `git grep … -- packages crates` | ✅ 0 hit, đúng như plan nói — xem §7.4 về cách đọc |

**Cộng:** 13 đã kiểm · 11 đúng nguyên vẹn · 2 hỏng (số 3, và nhận định "chỉ MỘT việc tiền-main" đi kèm số 1 — xem §7.2).

## 9. Cần người quyết thêm (không có trong sổ)

Ba câu mà PR bắt buộc phải trả lời, không trả lời thì item không đóng được:

1. **macOS harden bằng gì** — `PT_DENY_ATTACH` không gỡ được, hay chỉ `RLIMIT_CORE`, hay no-op? (§6.3)
2. **`PR_SET_PDEATHSIG` giữ hay bỏ** — nếu giữ, xử lý child sống lâu hơn session thế nào? (§6.4)
3. **`postmortem` còn mở được inspector sau khi `dumpable=0` không** — đo thật, không suy luận. (§3 bước 5)

Ngoài ra, điều kiện sẵn có của plan vẫn giữ nguyên: **thứ tự với W18 không quan trọng, nhưng PR phải nói rõ `doctor` chạy trong tiến trình đã harden** — `dumpable=0` nghĩa là một check muốn đọc core dump sẽ không được.
