# Phiếu triển khai — GAP-M1B-3: Khôi phục biến môi trường bị sandbox nuốt

Kế hoạch: `MILESTONE_1B_EXECUTION_PLAN.md:2956` (`## GAP-M1B-3`)
Nguồn: `pi.46` → `/Users/tranquangdang21/Projects/pi-ref`
Đích: `packages/utils/src/env.ts` trong cây `ultraworkers`.

---

## 0. Kết quả kiểm lại từng neo

9 neo được mở và đọc. **6 đúng, 3 hỏng.** Ba neo hỏng nằm ở chỗ quyết định nhất — phần pháp lý
và phần test — nên phải đọc phần này trước khi gõ bất cứ dòng nào.

| # | Neo trong work item | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | `packages/utils/src/env.ts:114` = `readLaunchEnv()` | ✅ ĐÚNG | `sed -n '114p'` → `function readLaunchEnv(): ReadonlyMap<string, string> \| undefined {` |
| 2 | `packages/utils/src/env.ts:134` = lời gọi | ✅ ĐÚNG | `sed -n '134p'` → `const launchEnvValues = readLaunchEnv();` |
| 3 | `pi …/src/bun/restore-sandbox-env.ts` = 36 dòng | ✅ ĐÚNG | `wc -l` → `36 restore-sandbox-env.ts` |
| 4 | `pi …/src/bun/sandbox-env-setup.ts` = 4 dòng | ✅ ĐÚNG | `wc -l` → `4 sandbox-env-setup.ts` |
| 5 | `packages/coding-agent/src/bun` không tồn tại | ✅ ĐÚNG | `ls -d` → `No such file or directory` |
| 6 | `bun run check:ts` | ✅ ĐÚNG | `package.json:90` |
| 7 | **`BPI_EXECVE`** | ❌ **HỎNG** | `rg -n "BPI_EXECVE" /Users/tranquangdang21/Projects/pi-ref` → **0 kết quả**. Cờ này không tồn tại ở `pi`. Xem §1.1. |
| 8 | **"Không có file test nào đi kèm ở phía `pi`"** | ❌ **HỎNG** | `pi/packages/coding-agent/test/restore-sandbox-env.test.ts` tồn tại, 77 dòng, 3 case. Xem §1.1. |
| 9 | **`packages/omptype/LICENSE` là hình mẫu + "dòng Zechner phải nằm ĐẦU"** | ❌ **HỎNG (tự mâu thuẫn)** | `head -4 packages/omptype/LICENSE` → `Can Bölük` / `Stencil Labs`. **Không có Zechner.** Xem §1.1. |

Ngoài ra, work item nhắc `getBunSandboxEnvValue()` trong `packages/ai/src/utils/provider-env.ts`
qua comment của file `pi`. Xác minh: file đó **có** ở `pi` (`pi-ref/packages/ai/src/utils/provider-env.ts:15`),
và omp **không có** (`ls packages/ai/src/utils/provider-env.ts` → không tồn tại). Đây không phải neo
hỏng — chỉ là bối cảnh cho việc đồng bộ phải giữ (xem bước 5).

### 1.1. Ba neo hỏng, nói thẳng

**Neo 7 — `BPI_EXECVE` là bịa.** Không có ký tự nào của nó trong toàn bộ `pi`. Chỗ thật trong
`pi` là hai guard, đọc nguyên văn từ `pi-ref/packages/coding-agent/src/bun/restore-sandbox-env.ts:20-23`:

```ts
	if (!process.versions?.bun) return;

	// If process.env already has entries, nothing to fix.
	if (Object.keys(process.env).length > 0) return;
```

Hệ quả cho việc gõ: **đừng tạo cờ `BPI_EXECVE`.** Đó là một biến không có đọc giả nào, thêm vào
chỉ để phục vụ một cái cổng không tồn tại. Guard thật là guard của `pi`, và guard thứ hai
(`process.env` đã có phần tử → thoát sớm) chính là cơ chế làm cho "trước dotenv" trở thành
điều kiện khởi động chứ không phải điều kiện tiện lợi. Câu hỏi "giữ tên cờ hay đổi" trong mục
"Cần người quyết" của kế hoạch **tự động tan** khi neo này hỏng: không có tên cờ nào để giữ.

Guard "no-op trên macOS/Windows" cũng **không nằm ở chỗ tưởng**. Trong `pi` nó không phải
`if (process.platform === "linux")`; nó là `try { readFileSync("/proc/self/environ") } catch {}`
ở dòng 25-35 — không có `/proc/self/environ` thì `readFileSync` ném, `catch` nuốt, hàm trả về
im lặng. Đây là điều kiện khởi động đúng như work item mô tả, nhưng **nó đến từ `try/catch`, không
phải từ một nhánh platform**. Giữ nguyên `try/catch`; đừng "viết lại cho rõ" thành nhánh platform.

**Neo 8 — "không có test ở phía `pi`" là sai.** File có thật:
`pi-ref/packages/coding-agent/test/restore-sandbox-env.test.ts`, 3 case:
`does nothing when not running under bun` / `does nothing when process.env already has entries` /
`restores environment from /proc/self/environ when bun env is empty`.
Hệ quả: mục "Hợp đồng test" của work item đang tự miễn mình nhiệm vụ. Ba case thật nằm ở §4.

**Nhưng test của `pi` không chép được nguyên văn** — nó viết cho **vitest**
(`pi-ref/…/restore-sandbox-env.test.ts:1` → `import { describe, expect, it, vi } from "vitest"`),
dùng `vi.mock("node:fs", …)` ở dòng 5 để chặn `readFileSync`, và dùng
`Object.defineProperty(process, "versions", …)` để giả chạy-không-dưới-Bun. Cả ba đều bị cấm hoặc
vô hiệu trong omp:

- omp **không có vitest**: `rg -n '"vitest"' package.json packages/*/package.json` → 0 kết quả.
  Test của omp chạy bằng `bun:test` (`packages/utils/test/env.test.ts:1`).
- Đường tương đương gần nhất của `vi.mock("node:fs")` trong `bun:test` là `mock.module()`, mà
  `AGENTS.md` cấm tuyệt đối vì nó mutate module registry toàn cục và rò sang các file test khác.
- `Object.defineProperty(process, "versions", …)` là biến đột `process.*` ở cả file test, trái
  luật "Tests must be full-suite safe" của `AGENTS.md`.

Nên **không** chép test của `pi`. Phải viết lại trên seam khác — xem §4.

**Neo 9 — LICENSE tự mâu thuẫn.** Work item trỏ `packages/omptype/LICENSE` làm hình mẫu **và**
bắt "dòng Zechner phải nằm ĐẦU". `head -4 packages/omptype/LICENSE` cho:

```
MIT License

Copyright (c) 2025-2026 Can Bölük
Copyright (c) 2026 Stencil Labs, Inc.
```

Không có Zechner. Kiểm chéo toàn bộ cây omp cho `Zechner` → chỉ có ở `LICENSE:3`,
`packages/coding-agent/LICENSE:3`, `packages/tui/LICENSE:3`, `packages/agent/LICENSE:3`,
`packages/ai/LICENSE:3` và
`packages/coding-agent/src/tools/browser/relay/extension-assets/LICENSE.txt:3` — tức là các
package gốc của omp. `packages/utils/LICENSE` (package **đích** của mục này) cũng **không có**
Zechner, giống hệt `omptype`.

Đọc đúng thì hướng của work item là nhất quán — `omptype` và `utils` cùng là package Stencil, cùng
mẫu, và cả hai đều không có Zechner. Chỉ có **câu lệnh kiểm** là sai. Lệnh trong khối "Xác minh":

```
head -4 <file LICENSE sau khi tạo>          # dòng Zechner phải nằm ĐẦU
```

phải sửa thành `head -4 packages/utils/LICENSE` và kiểm dòng **Can Bölük**. Nếu ai đó chạy
nguyên văn câu lệnh của kế hoạch, họ sẽ tìm một dòng không tồn tại và kết luận sai.
Cột trong bảng "Cần người quyết" của kế hoạch ("giữ dòng Zechner") cũng nên đọc lại theo hướng này.

---

## 1. Cái gì thay đổi, quan sát được

Khi omp chạy dưới sandbox làm `process.env` rỗng (lỗi
[oven-sh/bun#27802](https://github.com/oven-sh/bun/issues/27802), binary `bun build --compile`),
mọi biến môi trường nguyên bản của tiến trình được nạp lại từ `/proc/self/environ` **trước khi bất
kỳ mô-đun nào của omp đọc nó**, nên `~/.omp` , `PATH`, và các khoá API từ môi trường trở lại
đúng giá trị gốc thay vì rơi về mặc định rỗng.

Trên macOS và Windows — nơi không có `/proc/self/environ` — hàm là **no-op im lặng**, và omp
khởi động y hệt như trước.

---

## 2. Bảng điểm sửa

Trích "TRƯỚC" từ file thật vừa mở.

| `đường/dẫn` | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/utils/src/env.ts` | `readLaunchEnv` (`:114`) | `function readLaunchEnv(): ReadonlyMap<string, string> \| undefined {` | giữ nguyên, không đụng |
| `packages/utils/src/env.ts` | `launchEnvValues` (`:134`) | `const launchEnvValues = readLaunchEnv();` | `const launchEnvValues = readLaunchEnv();`<br>`restoreSandboxEnv();`<br>`const projectEnvNamesLoadedByOmp = new Set<string>();` |
| `packages/utils/src/env.ts` | `restoreSandboxEnv` (mới) | *(không có)* | `export function restoreSandboxEnv(readEnviron: () => string = readProcEnviron): void` — thân hàm chép nguyên văn từ `pi`, dán ở trên `readLaunchEnv` (xem bước 2) |
| `packages/utils/src/env.ts` | `readProcEnviron` (mới, riêng) | *(không có)* | `function readProcEnviron(): string { return fs.readFileSync("/proc/self/environ", "utf-8"); }` — tách riêng **một mục đích duy nhất**: để test thay thế seam này mà không cần `mock.module()` |
| `packages/utils/test/env.test.ts` | `describe("restoreSandboxEnv")` (mới) | *(không có)* | 3 case, xem §4 |
| `packages/utils/LICENSE` | — | `Copyright (c) 2025-2026 Can Bölük` (dòng 3) | **không đổi** — work item này không dán file mới, nên không có LICENSE mới để tạo |

**Dòng "SAU" ở `:134` là một dòng thêm, không phải một khối.** Đó là toàn bộ thay đổi hành vi.
Mọi thứ khác là dán nguyên văn.

---

## 3. Các bước

Mỗi bước dẫn một neo đã mở và đọc ở §0.

**Bước 1 — Pháp lý trước, nhưng kết luận ngược với câu chữ kế hoạch.**
Kế hoạch yêu cầu tạo `LICENSE` mới theo mẫu `packages/omptype/LICENSE`. Kiểm tra cho thấy
`packages/utils/LICENSE` **đã tồn tại** (22 dòng, MIT, Can Bölük + Stencil Labs) và là đúng mẫu
cho package đích. Không có tệp mới ⇒ **không có LICENSE mới để tạo**. Xác nhận bằng
`head -4 packages/utils/LICENSE`. Nếu sau này mục này dán thêm tệp mới, quy tắc bắt dòng Zechner
áp cho tệp đó, không cho file này.

**Bước 2 — Dán thân hàm, ngay TRÊN `readLaunchEnv`.**
Dán khối từ `pi-ref/packages/coding-agent/src/bun/restore-sandbox-env.ts:15-36` vào
`packages/utils/src/env.ts`, đặt **trên** dòng `function readLaunchEnv()…` (dòng 114) — vì
`readLaunchEnv` sẽ gọi tới `readProcEnviron` mà hàm đó định nghĩa. Giữ nguyên hai guard
(dòng 20 và 23 của file `pi`) và `try/catch` (dòng 25-35). Giữ nguyên khối comment
(dòng 1-11 của file `pi`) **trừ** dòng 8-10 — dòng đó bảo "keep in sync với
`getBunSandboxEnvValue()` ở `packages/ai/src/utils/provider-env.ts`", một file mà omp không có
(`ls packages/ai/src/utils/provider-env.ts` → không tồn tại). Giữ dòng 2 (URL lỗi Bun) và
dòng 4-6 (mô tả lỗi): đó là phần giá trị thật.

**Bước 3 — Một tham số duy nhất, để test có seam.**
Sửa đúng một dòng so với bản `pi`:

```ts
// TRƯỚC (pi, nguyên văn, dòng 26):
		const data = readFileSync("/proc/self/environ", "utf-8");
// SAU (omp):
		const data = readEnviron();
```

và `import { readFileSync } from "node:fs"` (dòng 13 của file `pi`) **không** dán — `env.ts` đã có
`import * as fs from "node:fs"` ở dòng 1. `readProcEnviron` là chỗ duy nhất gọi `fs.readFileSync`.
Sai lệch này phải ghi vào mô tả PR, không được lặng lẽ: nó là lý do test viết được bằng
`bun:test` mà không `mock.module()`.

**Bước 4 — Nối vào đúng chỗ, và viết lý do tại chỗ nối.**
Chèn `restoreSandboxEnv();` giữa dòng 134 và dòng 135 của `packages/utils/src/env.ts`:

```ts
const launchEnvValues = readLaunchEnv();
// MUST run before dotenv: restoreSandboxEnv() no-ops as soon as process.env has
// entries, so a call placed after dotenv autoload would silently restore nothing.
// See oven-sh/bun#27802.
restoreSandboxEnv();
const projectEnvNamesLoadedByOmp = new Set<string>();
```

`readLaunchEnv()` ở dòng 134 và `launchEnvValues` ở dòng 134 là neo đã kiểm. Hàm dotenv thật của
omp không phải một lời gọi module-scope: nó là `parseEnvFile(path.join(cwd, ".env"))` ở dòng
160 và `expandDotenvValues` ở dòng 137, cả hai đều bên trong `filterChildShellEnvInternal` và
chạy **trễ**, theo lời gọi. Nghĩa là "trước dotenv" ở omp là điều kiện **thỏa sẵn** về mặt cấu
trúc, không phải thứ phải tranh đấu. Ghi điều đó vào chú thích, vì người đọc sau sẽ không có bối
cảnh `pi` để tự suy ra.

**Bước 5 — Đồng bộ `readLaunchEnv` với seam mới.**
Dòng 118 của `packages/utils/src/env.ts` hiện gọi thẳng
`fs.readFileSync("/proc/self/environ", "utf8")` — chú ý `utf8`, không phải `utf-8`. Đổi nó qua
`readProcEnviron()` để hai đường đọc `/proc/self/environ` dùng chung **một** chỗ, và test chỉ cần
kiểm soát một seam. Giữ nguyên `try {} catch {}` rỗng ở dòng 123.

**Bước 6 — Không tạo `packages/coding-agent/src/bun/`, không chép `cli.ts` / `runtime-setup.ts`.**
Xác minh nguồn: `pi-ref/packages/coding-agent/src/bun/` chứa đúng 4 tệp —
`cli.ts` (4 dòng, chỉ là 3 dòng `import`),
`runtime-setup.ts` (9 dòng, chỉnh Bedrock/OAuth + `process.title`), và 2 tệp đang port.
Đích omp không có `src/bun/` (`ls -d packages/coding-agent/src/bun` → không tồn tại) và không
được tạo. Riêng `runtime-setup.ts` dòng 8 gọi `registerBunOAuthFlows()` — hàm không tồn tại ở
omp; chép nó là vỡ build ngay.

**Bước 7 — Chạy lại đường quanh `readLaunchEnv`.**
Mục tiêu: chứng minh **chỉ có phục hồi, không có thay đổi hành vi quan s được của việc chụp môi
trường trước dotenv**. `launchEnvValues` được dùng ở `packages/utils/src/env.ts:158`, `:161`,
`:175`, `:200`, `:216` — không dòng nào bị đụng. Chạy `bun test packages/utils/test/env.test.ts`
phải vẫn xanh **22 pass** (đo được lúc viết phiếu này), chứ không phải 25 — 22 là trạng thái trước,
25 là trạng thái sau khi thêm 3 case.

---

## 4. Hợp đồng test

Tệp: `packages/utils/test/env.test.ts` — thêm vào tệp sẵn có, **không tạo tệp mới**. Lý do:
`env.ts` đã có bộ test ở đó, và một tệp mới cho 3 case là một tệp mới để ai đó cũng phải mở
thêm khi sau này đụng `env.ts`.

Bộ ba `describe`/`it` mới, đặt cạnh `describe("getDbBusyTimeoutMs")` sẵn có ở
`packages/utils/test/env.test.ts:32`.

**Case 1 — `no-ops when the launch environment is unreadable`.**
Gọi `restoreSandboxEnv(() => { throw new Error("ENOENT: /proc/self/environ"); })` với
`process.env` không đổi. Khẳng định: **không ném**, và `process.env` y hệt trước đó.
→ *Người dùng thấy gì nếu hồi quy:* `omp` ném lỗi lúc khởi động trên macOS và Windows — hai sàn
họ dùng hằng ngày — trong khi Linux vẫn xanh hoàn toàn vì `/proc/self/environ` thật sự tồn tại.
Đây là hồi quy đắt nhất của mục này, và nó là hồi quy **âm thầm**: type check vẫn xanh.

**Case 2 — `no-ops when process.env already has entries`.**
Đặt `process.env.RESTORE_SANDBOX_ENV_TEST = "1"` (dọn trong `finally`), gọi
`restoreSandboxEnv(() => "FOO=bar\0")`. Khẳng định: `process.env.FOO` **không** được tạo, và
`process.env` giữ nguyên. → *Hồi quy:* hàm ghi đè biến đã có bằng bản `/proc` cũ hơn, phá vỡ
`OMP_PROFILE`/`PI_CONFIG_DIR`/`PATH` mà người dùng đã đặt tay.

**Case 3 — `restores the launch environment when process.env is empty`.**
Xoá sạch `process.env` (lưu bản sao trước), gọi `restoreSandboxEnv(() => "FOO=bar\0BAZ=qux\0")`.
Khẳng định `FOO === "bar"`, `BAZ === "qux"`, và mảng giữa `==` bị bỏ qua (entry không có `=`
không được đưa vào). Phục hồi `process.env` trong `finally`/`afterEach`. → *Hồi quy:* biến môi
trường vẫn bị sandbox nuốt — đúng cái lỗi mục này sinh ra để chữa, và nó **không ném, không cảnh
báo**, nên không ai thấy nếu không có test này.

**Ba case này chạy được trên mọi sàn, không cần mock, không cần đổi `process.platform`, không
cần `mock.module()`.** Đó là toàn bộ lý do tham số `readEnviron` ở bước 3 tồn tại. Không có
`it.skipIf(process.platform === …)` nào ở đây — nếu có, case 1 và 3 sẽ bị bỏ qua trên chính CI
Linux của omp (`ci.yml` chỉ có `ubuntu-22.04` và runner `omp-kata`; Windows chỉ xuất hiện ở job
cross-compile binary, không chạy test).

### 4.1. Về "thứ tự trước/sau dotenv là quan s được"

Work item đòi một khẳng định chứng minh **giá trị cuối cùng quan s được sau dotenv**. Kiểm tra
cây thật cho thấy yêu cầu đó **không thỏa mãn được ở dạng test đơn vị**, và đây là điểm phải nói
thẳng thay vì làm cho nó có vẻ đã phủ:

`restoreSandboxEnv()` không đọc dotenv, không ghi dotenv, và không có quan hệ nào với
`expandDotenvValues` (`packages/utils/src/env.ts:137`) hay `parseEnvFile` (dòng 160). Nó chỉ
ghi vào `process.env` từ `/proc/self/environ`. Vì vậy một test khẳng định "giá trị cuối cùng sau
dotenv" sẽ khẳng định về `expandDotenvValues`, tức là **không có gì thay đổi ở đây**. Test đó
xanh trước và xanh sau khi port — một cổng luôn xanh, tệ hơn không có cổng.

Điều kiện "trước dotenv" trong mục này thật ra là điều kiện **thỏa sẵn về cấu trúc**, và cách
chứng minh nó không phải bằng test hành vi mà bằng vị trí: lời gọi nằm ở
`packages/utils/src/env.ts`, còn toàn bộ đường dotenv nằm trong
`filterChildShellEnvInternal` (dòng 153), được gọi **sau**. Không cần test cho điều mà cấu trúc
đã bảo đảm. Ba case ở trên là phần có thể hồi quy; phần thứ tự là phần **phải review bằng mắt**,
và đó là lý do bước 4 bắt ghi chú thích tại call site.

---

## 5. Cổng

Lệnh chạy được từ `/Users/tranquangdang21/Projects/ultraworkers`.

### Cổng 1 — `bun run check:ts`

**ĐỎ ĐƯỢC KHÔNG.** Đo lại: `package.json:90` → `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`.

Cổng này bắt được: dán nhầm tệp, import hỏng, sai kiểu, `mock.module()` bị lint chặn, format
lệch. Cổng này **không** bắt được đúng thứ mục này cảnh báo: nếu `restoreSandboxEnv()` viết
`readFileSync("/proc/self/environ")` mà không bọc `try/catch`, `tsgo` vẫn exit 0, `oxlint` vẫn
sạch, và chỉ có test ở §4 case 1 hoặc một lần chạy thật trên macOS mới đỏ. Cổng xanh ở đây
**không mang thông tin**. Giữ nó vì nó rẻ, nhưng đừng tính nó là bằng chứng.

### Cổng 2 — `bun test packages/utils/test/env.test.ts`

**ĐỎ ĐƯỢC CÓ.** Đây là cổng thật của mục này. Đo nền trước khi sửa: `22 pass / 0 fail`.
Ngưỡng đỏ viết thành lệnh, không viết thành lời:

```bash
bun test packages/utils/test/env.test.ts
# phải: 25 pass / 0 fail  (22 cũ + 3 mới)
```

Số pass là con trỏ, không phải con số. Nếu kết quả là `22 pass` sau khi đã thêm 3 case, thì 3
case đó **không chạy** — skip hoặc filter sai — và cổng đang xanh vì không có gì được kiểm.

### Cổng 3 — `ls -d packages/coding-agent/src/bun`

**ĐỎ ĐƯỢC CÓ, và đây là cổng giữ được duy nhất.** Lệnh phải **thất bại** (exit ≠ 0, in
`No such file or directory`) sau khi port. Nếu nó in ra một đường dẫn, thư mục đã bị tạo sai và
việc dán sai chỗ đã xảy ra. Viết thành lệnh có kiểm:

```bash
! ls -d packages/coding-agent/src/bun 2>/dev/null   # exit 0 khi thư mục KHÔNG tồn tại
```

Cổng này đỏ được vì work item này là cách duy nhất trong nhóm có một hành vi **tiêu cực** đúng
(thư mục phải vắng). Giữ nguyên ý này của kế hoạch.

### Cổng 4 — thứ tự quanh dotenv

Lệnh trong kế hoạch: `grep -n 'readLaunchEnv\|launchEnvValues' packages/utils/src/env.ts`.

**KHÔNG ĐỎ ĐƯỢC.** Lệnh này in ra dòng nào chứa chuỗi, và cả trước lẫn sau khi port nó đều in
`114`, `134`, `158`, `161`, `175`, `200`, `216`. Nó xanh trước và xanh sau. Giữ nó như một trợ
giúp **đọc**, đừng gọi nó là cổng.

Viết lại thành cổng:

```bash
# restoreSandboxEnv() phải nằm GIỮA dòng 134 và dòng 135 — tức là trước mọi
# lời gọi filterChildShellEnvInternal, nơi toàn bộ đường dotenv của omp chạy.
awk 'NR>=134 && NR<=137' packages/utils/src/env.ts
```

Đỏ được khi `restoreSandboxEnv();` không nằm trong cửa sổ 4 dòng đó — tức là khi ai đó dán
xuống dưới, quên mất, hoặc dán vào một tệp khác. Vẫn là cổng review bằng mắt, nhưng nó thu
hẹp được vùng phải soi từ 491 dòng xuống 4.

### Cổng 5 — "startup chạy được trên cả ba sàn"

Đây là cổng hoàn thành mà kế hoạch nêu, và **nó không kiểm được trong CI của omp**. Kiểm chéo:
`.github/workflows/ci.yml` chỉ có `runs-on: ubuntu-22.04` và runner tự phục vụ `omp-kata`; chữ
"windows" chỉ xuất hiện ở job cross-compile binary (`ci.yml:810,821,824,849`), job đó build
`.exe` chứ không chạy test. Không có macOS runner, không có Windows runner.

Viết lại cho đỏ được trên máy đang chạy:

```bash
# macOS: /proc/self/environ KHÔNG tồn tại → đây là case 1 ở điều kiện thật,
# không phải qua mock. Đỏ khi khôi phục lỗi startup.
bun packages/coding-agent/src/cli.ts --version
```

**ĐỎ ĐƯỢC CÓ, và mạnh hơn test** — vì trên chính máy này, `/proc/self/environ` thật sự vắng, nên
lệnh này chạy đúng nhánh không-Linux bằng dữ liệu thật. Nó bắt được thứ mà `check:ts` không bắt:
một `try/catch` bị bỏ, một guard `process.versions.bun` bị viết sai, một import cycle làm module
fail dưới Bun. Ba sàn thật vẫn chưa tự động hoá; nếu cần, `scripts/install-tests/run-ci.sh:35`
(`"$omp_bin" --smoke-test`) và `scripts/ci-macos-sign.sh:118` là hai chỗ đã có sẵn để móc vào,
nhưng cả hai vẫn chỉ chạy trên sàn của người gọi.

### Tổng kết cổng

| Cổng | Lệnh | Đỏ được? |
| --- | --- | --- |
| 1 | `bun run check:ts` | **Không** cho lỗi của mục này — giữ như cổng rẻ, đừng tính là bằng chứng |
| 2 | `bun test packages/utils/test/env.test.ts` → phải `25 pass` | **Có** — cổng chính |
| 3 | `! ls -d packages/coding-agent/src/bun` | **Có** — bảo vệ "không tạo `src/bun/`" |
| 4 | `awk 'NR>=134 && NR<=137' packages/utils/src/env.ts` | **Có** — thu hẹp vị trí từ 491 dòng xuống 4 |
| 5 | `bun packages/coding-agent/src/cli.ts --version` | **Có** trên sàn đang chạy (không-Linux thật); **không** tự động hoá cho cả ba sàn |

---

## 6. Cạm bẫy riêng của mục này

Xếp theo mức độ đắt nếu làm sai.

**1. Dán vào `env.ts:135` là ĐÚNG, nhưng `env.ts:135` không phải chỗ sớm nhất — và
`dirs.ts` đã đóng băng trước đó.** Đây là cạm bẫy lớn nhất, và nó không nằm trong kế hoạch.

`packages/utils/src/env.ts:5` là `import { getAgentDir, getConfigRootDir, getProjectDir, refreshDirsFromEnv } from "./dirs";`.
Trong ESM, các `import` được nâng lên và thân module của `./dirs` **chạy trước** thân `env.ts`.
Mà `packages/utils/src/dirs.ts` đọc `process.env` ở **mức module**:

```
dirs.ts:459   let dirs = new DirResolver({ agentDirOverride: resolveActiveAgentDirOverride(), ...
dirs.ts:475   let preProfileAgentDirEnv = resolvePreProfileAgentDir(activeProfile, process.env.PI_CODING_AGENT_DIR, ...)
```

và `dirs.ts:448-451` `resolveActiveAgentDirOverride()` đọc `process.env.PI_CODING_AGENT_DIR` /
`process.env.OMP_PROFILE`. Comment ở `dirs.ts:485-494` nói thẳng: resolver **"froze at import
time"** và `env.ts` phải gọi `refreshDirsFromEnv()` sau khi nạp `.env` để vá lại.

Nghĩa là: `restoreSandboxEnv()` ở `env.ts:135` chạy **sau** khi `dirs.ts` đã chụp
`PI_CODING_AGENT_DIR` và profile từ một `process.env` còn rỗng. Hàm khôi phục `~/.omp` cho mọi
thứ đọc env *sau* đó — nhưng **không** cho `dirs`. Đây là giới hạn thật của hình dạng port mà
kế hoạch chọn (dán vào `env.ts`), và nó không nổ, không cảnh báo, không đỏ cổng nào.

Cách xử lý: **ghi nó ra, đừng giấu nó.** Thêm vào chú thích call site một câu nói rõ `dirs.ts`
đã đóng băng trước. Nếu muốn sửa thật thì phải dán vào một module **không có import nào đọc env
lúc load** và được import sớm hơn `dirs` — đó là thay đổi kiến trúc, vượt quá "40 dòng, gần như
không sửa" mà kế hoạch hứa, nên **không** làm trong mục này.

**2. Tạo `BPI_EXECVE` vì kế hoạch bảo tạo.** Đã nêu ở §1.1. Đây là cái bẫy dễ nhất vì kế hoạch
đặt nó trong mục "Cần người quyết" — người đọc dễ cảm thấy cờ này là thật và phải quyết định giữ
hay đổi tên. Không có gì trong `pi` đọc nó. Thêm nó = thêm biến chết. **Không tạo.**

**3. Chép `runtime-setup.ts` "cho đủ".** Nó chỉ 9 dòng và trông vô hại. Dòng 8 của nó gọi
`registerBunOAuthFlows()` — không tồn tại ở omp. Chép là vỡ `check:ts` ngay lập tức (cổng 1 bắt
được, may mắn). `cli.ts` 4 dòng của `pi` thì chỉ là 3 dòng `import` trỏ `../cli.ts` — chép nó
vào omp tạo một entrypoint thứ hai, vi phạm luật worker của `AGENTS.md` (một entry duy nhất,
`cli.ts` tự khai báo làm worker host).

**4. Chép `import { readFileSync } from "node:fs"` (dòng 13 của file `pi`) vào `env.ts`.**
`env.ts:1` đã có `import * as fs from "node:fs"`. Hai cách đọc `/proc/self/environ` trong cùng
một tệp, và `AGENTS.md` nói thẳng: *"Two implementations of the same thing is a bug even when both
work."* Bước 5 của phiếu này gộp về `readProcEnviron()` để tránh đúng điều đó.

**5. Test mới viết bằng `it.skipIf(process.platform === "win32")`.** `env.test.ts:291` đã có
đúng mẫu này — và nó **sẽ làm hỏng cổng 2**. CI omp chỉ chạy Linux, nên `skipIf` ở đây không
làm case biến mất trên CI… nhưng nó đặt tiền lệ cho một bản sao tiếp theo trên máy Windows, và
nó làm cho case "no-op" biến thành case "bỏ qua". Ba case ở §4 dùng seam `readEnviron` nên không
cần bất kỳ `skipIf` nào — không thêm.

**6. `Object.defineProperty(process, "versions", …)` để bắt chước `pi`.** Test của `pi` làm
đúng việc này (`pi-ref/…/restore-sandbox-env.test.ts:13-16`). Trong omp nó là biến đột
`process.*` ở cả file test — `AGENTS.md` cấm khi đã có seam hẹp hơn, và ở đây đã có.
Nếu buộc phải giữ case "không chạy dưới Bun", dùng `vi.spyOn` + `vi.restoreAllMocks()` trong
`afterEach` như luật của `AGENTS.md`, **không** `defineProperty`.

**7. Đọc `head -4 packages/omptype/LICENSE` rồi kết luận sai.** Đã nêu ở §1.1. File mẫu đúng,
câu lệnh kiểm sai. Đọc `packages/utils/LICENSE` — cùng mẫu, không Zechner, và đó là file của
package đích.

---

## 7. Phần tệ nhất nếu làm theo kế hoạch nguyên văn

Ba dòng trong kế hoạch sẽ đưa người gõ sai:

1. `BPI_EXECVE` — không tồn tại ở `pi`; tạo ra là thêm biến chết.
2. "Không có file test nào đi kèm ở phía `pi`" — có, `pi-ref/packages/coding-agent/test/restore-sandbox-env.test.ts`.
3. "dòng Zechner phải nằm ĐẦU" trong khi hình mẫu trỏ tới không có dòng đó.

Cả ba đều dẫn tới cùng một kết cục: một bản port **trông đúng** — có cờ, có LICENSE, `check:ts`
xanh, `ls -d packages/coding-agent/src/bun` đỏ đúng — và không khôi phục được biến nào, trên sàn
nào. `BPI_EXECVE` không ai đọc nên không ai thấy; test không có nên không có gì xanh; Zechner vắng
mặt nên cổng `head -4` báo "đúng" cho người không biết dòng đó vốn không tồn tại.
