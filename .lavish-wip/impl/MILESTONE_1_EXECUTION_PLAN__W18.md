# Phiếu triển khai — W18 · `omp doctor`: một lệnh chẩn đoán

> Nguồn: `MILESTONE_1_EXECUTION_PLAN.md` §`## W18.` (dòng 3727–3790).
> Phiếu này **không sửa tài liệu kế hoạch**. Mỗi sai lệch ghi ở §2 và §6 là điều kỹ sư
> cần biết trước khi gõ, không phải điều được phép sửa trong plan.

---

## 1. Cái gì thay đổi, quan sát được

`omp doctor` trở thành một lệnh thật in ra bảng check có `severity` + `detail` + `remedy`
và **tự nói ra chỗ nó mù** — check nào hỏng tiền đề thì in `không kiểm được X vì Y` thay vì
biến mất, và cùng một dòng đó xuất hiện trong menu `/debug`; đồng thời `~/.omp/logs` được
tạo với `mode: 0o700` và `doctor` báo ra mode thật của thư mục đó.

---

## 2. Bảng điểm sửa

Cột TRƯỚC trích nguyên văn từ file đã mở.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/plugins/types.ts:169` | `DoctorCheck` | `export interface DoctorCheck {`<br>`	name: string;`<br>`	status: "ok" \| "warning" \| "error";`<br>`	message: string;`<br>`	fixed?: boolean;` | `severity: "ok" \| "warn" \| "error"` + `detail` + `remedy`, `readonly`, khớp `ImagesDoctorCheck` |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts:3` | import | `import type { DoctorCheck } from "./types";` | giữ nguyên — **không** khai báo lại `DoctorCheck` trong file này |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts:5` | `runDoctorChecks` | `export async function runDoctorChecks(): Promise<DoctorCheck[]> {` | `export function runDoctorChecks(): readonly DoctorCheck[]` — bảng registry, mỗi phần tử là một hàm thuần |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts:2` | import TUI | `import { theme } from "@oh-my-pi/pi-tui/theme";` | bỏ hẳn khỏi file — formatter không được chạm TUI |
| `packages/coding-agent/src/extensibility/plugins/doctor.ts:43` | `formatDoctorResults` | `export function formatDoctorResults(checks: DoctorCheck[]): string {`<br>dùng `theme.status.enabled/warning/error` ở dòng 51/53/54 | `formatDoctorResults(checks: readonly DoctorCheck[]): string`, chỉ ASCII, thêm khối header "không kiểm được … vì …" |
| `packages/coding-agent/src/extensibility/plugins/manager.ts:969` | `PluginManager.doctor` | `async doctor(options: DoctorOptions = {}): Promise<DoctorCheck[]> {` | đổi `name/status/message` → `severity/detail/remedy`; **file này không có trong bảng file của plan** |
| `packages/coding-agent/src/cli-commands.ts:102` | registry entry | khối `dry-balance` (`:102-106`) | chèn entry `doctor` giữa `config` (`:97-101`) và `dry-balance` (`:102-106`) |
| `packages/coding-agent/src/commands/doctor.ts` | command module | *(chưa tồn tại)* | `export default class Doctor extends Command`, `process.exitCode = 1` |
| `packages/coding-agent/src/cli/command-help.ts:53` | help constant | `export const dryBalanceHelp = {` | thêm `export const doctorHelp = { description: "…" } satisfies CommandMetadata;` |
| `packages/coding-agent/src/debug/index.ts:41` | `DEBUG_MENU_ITEMS` | mảng `SelectItem[]` 12 mục, `:41-67`, **không có** mục doctor | thêm `{ value: "doctor", label: "View: doctor report", description: … }` |
| `packages/utils/src/logger.ts:171` | `ensureDir` | `fs.mkdirSync(dir, { recursive: true });` | `fs.mkdirSync(dir, { recursive: true, mode: 0o700 });` |
| `packages/coding-agent/src/config/settings.ts:225` | `assertKnownSettingPaths` | `function assertKnownSettingPaths(layer: RawSettings, prefix = "") {` (**không** `export`) | `export function …` để doctor gọi được, hoặc bọc bằng hàm public |

### Các điểm trong plan đã đo sai (đã đo lại, không sửa plan)

| claim của plan | đo lại | kết luận |
| --- | --- | --- |
| `packages/coding-agent/src/images-cli.ts` | file này **không tồn tại** | đường dẫn thật: `packages/coding-agent/src/cli/images-cli.ts` |
| `packages/coding-agent/src/extensibility/plugins/plugin-cli.ts` | file này **không tồn tại** | đường dẫn thật: `packages/coding-agent/src/cli/plugin-cli.ts` |
| `ImagesDoctorResult` ở `images-cli.ts:136-145` | khai báo ở **`:137-143`** (136 và 145 trống) | nội dung đúng (`exitCode:139`, `healthy:141`, `checks:142`), chỉ lệch biên |
| `bun test` **không** chạy được (`0 pass, 1 fail`, native addon) | `bun test` chạy: **29 pass / 0 fail**; `import("@oh-my-pi/pi-natives")` OK, 128 export | claim **đã cũ** — cổng test chạy được ngay |
| `bun run doctor` | **không có** script `doctor` trong bất kỳ `package.json` nào | lệnh này hôm nay exit ≠ 0 vì *lệnh không tồn tại*, không phải vì doctor hỏng |

Neo **đúng**: `doctor.ts:5`, `formatDoctorResults` chết, 49 lệnh cấp một,
`grep -c 'name: "doctor"'` → 0, `logger.ts:171`, `IMAGES_ACTIONS` `:50`,
images doctor verb `:546`, `plugin-cli.ts:32` (`| "doctor"`), `plugin-cli.ts:672`,
`codex-rs/cli/src/doctor.rs` = 4352 dòng, `LICENSE` = 201 dòng, `test/doctor/` chưa có.

---

## 3. Các bước

Mỗi neo dưới đây đã mở và đọc trong cây thật.

1. **Chốt danh sách 7 check TRƯỚC khi viết dòng nào** (`GAP-D4`). Danh sách: config parse +
   `assertKnownSettingPaths`; credential reachability (chỉ có/không); parity
   `patches/*.patch` ↔ `package.json.patchedDependencies` (cả hai đã tồn tại:
   `patches/`, `package.json:206`); thư mục log; số extension active; `PATH`/`$which` cho `git`;
   native addon. **Không** probe network.
2. **Đổi hình dạng `DoctorCheck` ở `types.ts:169`**, không phải trong `doctor.ts`. Dùng lại
   đúng khuôn có thật `ImagesDoctorCheck` (`packages/coding-agent/src/cli/images-cli.ts:80-84`):
   `severity: ImagesDoctorSeverity` / `name` / `detail`, cộng `remedy`. Lưu ý
   `ImagesDoctorSeverity` (`:78`) là `"ok" | "warn" | "error"` — **khác** `"warning"` mà
   `types.ts:173` đang dùng. Chọn một, và sửa cả hai cùng lúc.
3. **Sửa `manager.ts:969` `PluginManager.doctor()`** theo hình dạng mới. Bỏ qua bước này thì
   `packages/coding-agent/test/plugin-doctor-version-drift.test.ts` đỏ ngay — đó là 29 test
   xanh baseline, không phải lỗi mới của bạn.
4. **Viết lại `runDoctorChecks` (`doctor.ts:5`)** thành bảng registry: `readonly DoctorCheck[]`,
   mỗi check một hàm thuần. Giữ nguyên tên export. Bỏ `async` — không check nào cần await.
5. **Gỡ TUI khỏi `formatDoctorResults` (`doctor.ts:43`, import ở `:2`).** Chú thích ở
   `doctor.ts:44-45` hiện nói *"returns plain text without theming"* trong khi code lại đọc
   `theme.status.*` ở `:51/53/54` — chú thích đang nói dối. Xoá luôn `import { theme }` ở `:2`.
6. **Thêm `exit 0|1`.** Theo đúng khuôn `images-cli.ts:545-546`:
   `const healthy = !checks.some(c => c.severity === "error")` → `exitCode: healthy ? 0 : 1`.
7. **Header tự cảnh báo**: check hỏng tiền đề thì phát ra một entry
   `severity: "warn"`, `name: "<tên check gốc>"`, `detail: "không kiểm được X vì Y"` — và
   **không** phát ra entry xanh cho X. Đây là nửa còn lại của `GAP-D4`.
8. **Tạo `commands/doctor.ts`** theo khuôn `commands/gc.ts:9-46` (dùng `process.exitCode = 1`
   ở `:44`, không dùng `process.exit(1)`), cộng `doctorHelp` trong `command-help.ts`.
9. **Đăng ký entry** ở `cli-commands.ts`, chèn giữa `config` (`:97-101`) và `dry-balance`
   (`:102-106`). Merge cùng W22, dùng **một** assertion phân tuyến.
10. **Thêm mục vào `/debug`**: `DEBUG_MENU_ITEMS` (`packages/coding-agent/src/debug/index.ts:41-67`),
    mở từ `packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:545-553`.
11. **`logger.ts:171`**: thêm `mode: 0o700`, **giữ nguyên** `recursive: true`.
12. **Build rồi chạy cổng.**

---

## 4. Hợp đồng test

Tệp: `packages/coding-agent/test/doctor/doctor.test.ts` (thư mục chưa tồn tại — sẽ tạo mới).

| # | case | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| 1 | `runDoctorChecks()` và entry `/debug` trả **cùng một tập `name`, cùng thứ tự** | hai bản module trôi nhau; `/debug` xanh, `omp doctor` đỏ, không ai biết |
| 2 | Khi tiền đề hỏng: output **có** dòng `không kiểm được X vì Y` **và** **không** có dòng xanh cho X — assert **cả hai chiều trong cùng một case** | `doctor` báo xanh trên máy ledger đã hỏng; người đó tin báo cáo rồi debug sai chỗ cả buổi |
| 3 | Check credential: có nói provider tới được hay không, **và** giá trị key không xuất hiện trong output | in ra `sk-…`; đây là rò rỉ bí mật ra stdout/log |
| 4 | `exit 1` khi có `severity === "error"`, `exit 0` khi sạch — **cả hai vế trong cùng một đợt** | chỉ assert `exit 0` là xanh tầm thường; `doctor` luôn trả 0 nên CI không bao giờ đỏ |
| 5 | `runDoctorChecks` + `formatDoctorResults` **import** được sau khi có consumer (không source-grep) | bị xoá export trong một PR refactor; `omp doctor` hỏng lúc runtime |
| 6 | Phân tuyến: `resolveCliArgv(["doctor"])` trả `{ argv: ["doctor"] }`, **không** phải `{ argv: ["launch", "doctor"] }` | `omp doctor` biến thành prompt gửi cho LLM — hồi quy #1496/#1499 |

Case 6 nằm trong `cli-argv-routing.test.ts` (đã có) hoặc một tệp dùng chung với W22 —
**một** assertion, không hai.

Baseline đã đo (xanh trước khi sửa): `images-cli.test.ts` +
`plugin-doctor-version-drift.test.ts` + `cli-argv-routing.test.ts` +
`cli-command-metadata.test.ts` = **29 pass / 0 fail**.

---

## 5. Cổng

| # | lệnh | ĐỎ ĐƯỢC KHÔNG? | Bằng cách nào |
| --- | --- | --- | --- |
| 1 | `bun test packages/coding-agent/test/cli-argv-routing.test.ts` | **CÓ** | thêm `doctor` → xanh; bỏ entry khỏi `cli-commands.ts` → `resolveCliArgv(["doctor"])` trả `{argv:["launch","doctor"]}` và case đỏ |
| 2 | `bun test packages/coding-agent/test/doctor/` | **CÓ** | xoá nhánh header tự cảnh báo → case 2 đỏ (assert cả hai chiều nên không lách được) |
| 3 | `bun test packages/coding-agent/test/cli-command-metadata.test.ts` | **CÓ — miễn phí, plan không nhắc** | `:30` yêu cầu mọi entry có `help`; `:33` `await entry.load()`; `:41` so help metadata với `static description`. Thêm entry `doctor` mà thiếu `doctorHelp` hoặc lệch mô tả → đỏ ngay |
| 4 | `bun test packages/coding-agent/test/plugin-doctor-version-drift.test.ts` | **CÓ** | đổi hình dạng `DoctorCheck` mà quên sửa `manager.ts:969` → đỏ |
| 5 | `bun test packages/coding-agent/test/images-cli.test.ts` | **CÓ** | đụng `images-cli.ts` → đỏ; cũng là bằng chứng verb `doctor` cũ giữ nguyên hành vi |
| 6 | `bun run check:ts` | **CÓ** | cổng type |
| 7 | `bun run check:tools` | **CÓ** | `oxfmt --check` trên `packages/*/src/**`. Cả `doctor.ts` lẫn `types.ts` đều indent **tab** (đã kiểm bằng `od -c`: byte đầu là `\t`) — giữ nguyên tab khi sửa |

**Cổng KHÔNG đỏ được — phải viết lại:**

| claim của plan | vấn đề | viết lại |
| --- | --- | --- |
| `grep -c 'name: "doctor"' packages/coding-agent/src/cli-commands.ts` ≥ 1 | đây là **source-grep** — chính plan cấm trong test; và nó xanh cả khi `load()` trỏ sai file | thay bằng cổng 1 ở trên |
| `bun run doctor` trả `exit 0\|1` | **không có script `doctor`** trong bất kỳ `package.json` nào | thêm `"doctor": "bun packages/coding-agent/src/cli.ts doctor"` vào `package.json` gốc, **hoặc** đổi cổng thành case 4 trong tệp test (exit code quan sát được qua `process.exitCode`) |
| "`bun test` không chạy được, chỉ `check:ts` + `grep` mới có tín hiệu" | **đã cũ** — `bun test` chạy được (29/0), natives load OK (128 export) | bỏ hẳn; coi `bun test` là cổng thật |
| `fs.mkdirSync` còn `recursive: true` **và** có `mode: 0o700` | kiểm bằng grep là source-grep | kiểm bằng hành vi: tạo logger với `dir` chưa tồn tại, rồi `fs.stat(dir).mode & 0o777` phải bằng `0o700` (`packages/utils/test/logger-startup.test.ts` là chỗ tự nhiên) |

Cổng `mode: 0o700` chỉ kiểm được trên thư mục **chưa tồn tại** — `ensureDir`
(`logger.ts:169-174`) bọc trong `if (!fs.existsSync(dir))`. Trên máy đã chạy omp, `~/.omp/logs`
đã có và giữ mode cũ. Đây là hành vi đúng, nhưng check "mode thật" ở bước 6 sẽ báo đỏ trên
chính máy của kỹ sư — đừng sửa check để "cho xanh".

---

## 6. Cạm bẫy riêng của work item này

1. **`DoctorCheck` đã tồn tại, ở file khác, và đang được dùng.** Nó nằm ở `types.ts:169`,
   không phải trong `doctor.ts`. Hình dạng code trong plan vẽ
   `export interface DoctorCheck` **trong** `doctor.ts` — làm vậy là đụng tên, và vì
   `plugins/index.ts:3` (`export * from "./doctor"`) cùng `:9` (`export type * from "./types"`)
   đều là star re-export, ambiguous export sẽ làm hỏng cả barrel. Tệ hơn: `manager.ts:969`
   đang trả `DoctorCheck[]` cho `plugin-cli.ts:672`. Đổi hình dạng mà không sửa `manager.ts`
   là làm đỏ một suite có sẵn 29 test xanh.

2. **Hai bảng chữ `severity` khác nhau đã cùng tồn tại.** `types.ts:173` dùng
   `"ok" | "warning" | "error"`; `images-cli.ts:78` dùng `"ok" | "warn" | "error"`. Khuôn mới
   theo `images-cli.ts`. Trộn hai bảng là `bun run check:ts` đỏ ở `manager.ts` — nhưng dễ
   hiểu nhầm là lỗi của check mới.

3. **Ràng buộc TUI nằm ở chỗ ngược với dự đoán.** `runDoctorChecks` đã **không** phụ thuộc TUI
   rồi (chỉ `$which` ở `doctor.ts:1` và `Bun.env`); thứ phụ thuộc TUI là `formatDoctorResults`
   qua `theme.status.*` ở `:51/53/54`. Chú thích ở `:44-45` khẳng định ngược lại ("returns
   plain text without theming"). Đừng tốn công "tách collection khỏi TUI" — phần cần sửa là
   formatter.

4. **`runDoctorChecks` hôm nay hardcode 3 binary và 3 biến môi trường** (`doctor.ts:9-13`:
   `sd`/`sg`/`git`; `:25-29`: `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`EXA_API_KEY`). Check
   credential trong danh sách bước 1 nói *"provider đang chọn"* — đó là yêu cầu khác hẳn,
   và thay đổi nó là thay đổi hợp đồng, không phải refactor. `plugin-cli.ts:672` đã có
   `--fix`; danh sách bước 1 **không** có `--fix`, đừng tự thêm vào.

5. **`/debug` không phải một lệnh — nó là một menu.** `builtin-lifecycle.ts:546` gọi
   `showDebugSelector()`, dựng `DEBUG_MENU_ITEMS` ở `debug/index.ts:41-67`. Thêm "một mục
   trong `/debug`" nghĩa là thêm một phần tử `SelectItem` **và** một nhánh xử lý, không phải
   sửa một handler.

6. **Cái bẫy check tự phát đúng như plan cảnh báo.** 7 check ở bước 1 là hợp đồng; mọi check
   thêm sau đó phải mang test của nó. Bảng cổng ở §5 chỉ có 7 dòng — thêm check mà không thêm
   dòng cổng là đúng cái làm bảng cổng dài ra tới mức không ai đọc.

7. **Đừng viết lại `bun run doctor` thành `process.exit(1)`.** Xem `commands/gc.ts:44`.
   `process.exit()` cắt mất flush của stdout; **14** tệp trong `src/commands/` dùng
   `process.exitCode`, và chỉ **3** (`git.ts`, `install.ts`, `say.ts`) dùng `process.exit(`.
