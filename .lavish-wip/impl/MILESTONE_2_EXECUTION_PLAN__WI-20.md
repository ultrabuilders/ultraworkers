# WI-20 — Cổng tin cậy theo thư mục dự án: `trust.json` tri-state, nạp hai lượt, re-check ở consumer

> Phiếu triển khai cho `MILESTONE_2_EXECUTION_PLAN.md` §`WI-20` (dòng 4843).
> Ngày kiểm: 2026-09-29, HEAD `milestone-1`.
> **WI này KHÔNG thuộc M2** (wave 9) và **bị chặn cứng** bởi WI-0. Chưa được giao ngày.

---

## 1. Cái gì thay đổi, quan sát được

> Lần đầu omp **hỏi** người dùng trước khi nạp bất kỳ tài nguyên project-local nào (`.omp/extensions`, `.omp/config.yml`, `.omp/settings.json`) của một thư mục mới, quyết định được lưu theo thư mục vào `trust.json`, và `ctx.isProjectTrusted()` **trả về giá trị thật theo quyết định đó** ở cả hai call site thay vì luôn trả `true`.

Không có thay đổi hành nào khác. Không có cờ CLI mới. Không có `/trust` command ở đợt này.

---

## 2. VIỆC 1 — Kết quả kiểm lại từng neo

Bảng dưới là **kết quả đọc thật**, không phải trích từ trí nhớ. Mọi dòng "Đọc được" đều đã mở file và đọc nội dung.

| # | Neo trong WI-20 | Trạng thái | Nó thực sự nói gì |
| --- | --- | --- | --- |
| A1 | `packages/coding-agent/src/extensibility/extensions/types.ts:548-561` | ❌ **LỆCH 2 DÒNG** | Dòng 548 là `	): Promise<AgentToolResult<TDetails>>;`, 549 là trống. Comment thật nằm ở **550–562**, khai báo ở **563**. Khoảng 548-561 cắt mất 2 dòng cuối, gồm cả `*/` và chính dòng khai báo mà nó mô tả. **Nội dung thì ĐÚNG**: 551–552 nói *"project-local inputs for the current working directory (extensions, settings, skills, resources)"*. Dùng **`:550-562`** (hoặc `:550-563` nếu muốn kèm khai báo). |
| A2 | `packages/coding-agent/CHANGELOG.md:1057` (mục **ĐÃ PHÁT HÀNH**) | ❌ **SAI DÒNG, ĐÚNG PHIÊN BẢN** | Dòng 1057 là entry về `providers.cacheRetention` / Anthropic OAuth — không liên quan trust. Entry thật về trust ở **`CHANGELOG.md:1117`**, và nó **đúng** nằm dưới `## [18.1.16] - 2026-09-09` (header ở dòng 1099). Nên phần "đã phát hành" của plan là đúng, chỉ số dòng sai. |
| A3 | Mục "Đính chính": `types.ts:494` và `:561` | ❌ **CHÍNH BẢN ĐÍNH CHÍNH ĐÃ HỎNG** | `isProjectTrusted(): boolean;` thật ở **496** và **563**. Tức là số của sổ khoảng trống (`:496`, `:563`) **đúng**, còn bảng "Đính chính so với plan" sửa nó thành sai. Plan đang đính chính ngược. |
| A4 | Mục "Đính chính": `runner.ts:1264` | ❌ **HỎNG** | 1264 nằm trong JSDoc của `createContext()` nói về `ctx.invokeTool`. `isProjectTrusted: () => true,` thật ở **`runner.ts:1293`**. |
| A5 | Mục "Đính chính": `agent-session.ts:7406` | ❌ **HỎNG** | 7406 là comment *"Auto thinking: classify this real user turn…"*. `isProjectTrusted: () => true,` thật ở **`agent-session.ts:7552`**. |
| A6 | `docs/extension-trust-model.md` — "đọc, KHÔNG sửa ở đợt này" | ⚠️ **KHÔNG TỒN TẠI** | `lsd: docs/extension-trust-model.md: No such file or directory`. Nó là **sản phẩm của WI-0**, chưa có. Không đọc được — nhưng đúng là WI-20 phải chờ WI-0. |

### Các mệnh đề định lượng trong WI-20 — đã kiểm

| Mệnh đề | Lệnh | Kết quả thật |
| --- | --- | --- |
| `grep -rn "setProjectTrust\|trust.json" packages --include='*.ts'` (non-test) → 0 hit | `rg -n 'setProjectTrust\|trust\.json' packages --glob '*.ts' --glob '!**/test/**'` | **0 hit — ĐÚNG** |
| (mở rộng) kể cả trong test | `rg -n 'setProjectTrust\|trust\.json' packages --glob '*.ts'` | **0 hit — ĐÚNG, mạnh hơn claim** |
| `isProjectTrusted` → 4 hit, 2 khai báo + 2 hiện thực | `rg -n isProjectTrusted packages/coding-agent/{src,test}` | **ĐÚNG**: `types.ts:496`, `types.ts:563`, `runner.ts:1293`, `agent-session.ts:7552`. Cả hai hiện thực đều là closure hằng `isProjectTrusted: () => true,`. |
| Hai test chỉ khẳng định `true` | đọc cả hai file | **ĐÚNG**: 3 case / 2 file, tất cả `.toBe(true)`. |
| Hai test **xanh** trên HEAD | `bun test packages/coding-agent/test/extension-context-project-trust.test.ts packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts` | **`3 pass, 0 fail`** — xác nhận gate "phải đỏ trước" có ý nghĩa. |

### 🔴 SAI SO VỚI CÂY THẬT — claim về mã nguồn `pi`

> WI-20 (và bảng "File cần chạm tới") nói: *«**Thiết kế lại, không chép:** `pi` có bốn mục trải trên nhiều file; omp cần **một cơ chế, không phải bốn**.»*

**Claim này SAI.** `pi` đã làm đúng việc "một cơ chế", trong **một file duy nhất**:

`/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/trust-manager.ts` — **245 dòng, một file**, xuất:

| Dòng | Symbol |
| --- | --- |
| 9 | `export type ProjectTrustDecision = boolean \| null` |
| 11 | `export interface ProjectTrustStoreEntry` |
| 16 | `export interface ProjectTrustUpdate` |
| 21 | `export interface ProjectTrustOption` |
| 30 | `const TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES` |
| 60 | `export function getProjectTrustParentPath` |
| 66 | `export function getProjectTrustOptions` |
| 185 | `export function hasTrustRequiringProjectResources` |
| 209 | `export class ProjectTrustStore` (`get` / `getEntry` / `set` / `setMany`) |

Phần "trải trên nhiều file" chỉ đúng cho **call site** (`main.ts`, `interactive-mode.ts`, `package-manager.ts`), không đúng cho **cơ chế**.

**Hệ quả cho công việc:** khuyến nghị "một cơ chế, không phải bốn" vẫn đúng — nhưng **vì `pi` đã làm vậy**, không phải vì `pi` làm ngược lại. Lý do nêu trong plan sai, và kẻ triển khai đọc lý do sai sẽ đi tìm thứ không tồn tại. **Ghi vào ADR, đừng sửa file kế hoạch.**

### 🔴 SAI — tri-state của plan không phải tri-state của `pi`

WI-20 đề xuất `resolveProjectTrust(cwd) → "yes" | "no" | "undecided"` (chuỗi). `pi` dùng **`boolean | null`** (`trust-manager.ts:9`), với `null` = chưa có quyết định. Không sai, nhưng là **một quyết định thiết kế phải nói ra**, không phải hệ quả.

### 🔴 SAI — có **BA** danh sách tài nguyên khác nhau, không phải hai

| Nguồn | Danh sách | Số mục |
| --- | --- | --- |
| `types.ts:551-552` (jsdoc omp) | `extensions, settings, skills, resources` | **4** |
| GAP-D12 (trong WI-20) | `extensions, settings, skills, prompts, themes, resources` | **6** |
| `pi` `trust-manager.ts:30-38` | `settings.json, extensions, skills, prompts, themes, SYSTEM.md, APPEND_SYSTEM.md` **+ `.agents/skills` ở cwd hoặc thư mục cha** (`185-206`) | **7 + 1** |

GAP-D12 phải được **tính lại từ 7 mục của `pi`**, không phải từ 4 hay 6. Chọn 4 nghĩa là bỏ sót `SYSTEM.md`/`APPEND_SYSTEM.md` — tức là **system prompt của thư mục vẫn nạp khi bị từ chối**, đúng cái lỗ hổng mà `pi` chặn.

### 🔴 SAI — claim "bị chặn cho tới khi có native addon"

WI-20 (và §"Xác minh" của mọi WI khác trong file) nói: *«`bun test` chết ngay ở bước import với `"Failed to load pi_natives native addon for darwin-arm64"`. Gỡ chặn bằng `bun --cwd=packages/natives run build`.»*

**Trên máy này claim đó không còn đúng.** Addon đã có: `packages/natives/native/pi_natives.darwin-arm64.node`. Cả hai test trust **và** `mcp-project-config-not-trusted-by-default.test.ts` đều chạy xanh (`3 pass`). **Cổng của WI-20 chạy được ngay, không cần build addon.**

---

## 3. Bảng điểm sửa

Cột TRƯỚC trích nguyên văn từ file đã mở.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/types.ts` **:490-492** | jsdoc `ExtensionContext.isProjectTrusted` | `	 * Whether the current project/workspace is trusted. OMP performs no`<br>`	 * project-trust gating — project-level settings and extensions load`<br>`	 * unconditionally — so this always returns `true`. Exposed for` | `	 * Whether the current project/workspace is trusted, per the saved decision`<br>`	 * for the current working directory. See docs/extension-trust-model.md.` |
| `packages/coding-agent/src/extensibility/extensions/types.ts` **:557-561** | jsdoc `HookContext.isProjectTrusted` | `	 * OMP has no equivalent per-directory trust gate: `.omp/extensions`, `.omp/config.yml`, and`<br>`	 * other project-local inputs are already discovered and loaded unconditionally (see`<br>`	 * `docs/extension-loading.md`). This method exists for compatibility with that upstream surface`<br>`	 * and always returns `true`, truthfully reflecting that OMP already trusts project-local inputs`<br>`	 * by default -- it does not narrow or widen OMP's own security model.` | `	 * Resolves against the saved per-directory decision in the trust store; see`<br>`	 * docs/extension-trust-model.md. Re-read on every call — do not cache.` |
| `packages/coding-agent/src/extensibility/extensions/types.ts` **:496, :563** | `isProjectTrusted(): boolean` | `	isProjectTrusted(): boolean;` (hai chữ ký giống hệt nhau) | Giữ nguyên chữ ký. **Không** đổi thành tri-state ở API công khai — `boolean` là hợp đồng với extension viết theo `pi` (xem `trust-manager.ts`/`interactive-mode.ts:2161` của `pi`, vốn cũng trả `boolean`). Tri-state sống **bên trong** `resolveProjectTrust`. |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` **:1293** | `ExtensionRunner.createContext` | `			isProjectTrusted: () => true,` | `			isProjectTrusted: () => this.#isProjectTrustedFn(),` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` **:1299** (theo mẫu) | `isIdle` | `			isIdle: () => this.#isIdleFn(),` | (giữ nguyên — đây là **mẫu** để bắt chước, không phải dòng cần sửa) |
| `packages/coding-agent/src/session/agent-session.ts` **:7552** | `AgentSession.#createCommandContext` | `			isProjectTrusted: () => true,` | `			isProjectTrusted: () => resolveProjectTrust(this.sessionManager.getCwd()) === "yes",` |
| `packages/coding-agent/src/config/settings.ts` **:653** | `Settings.init` | `		if (globalInstancePromise) return globalInstancePromise;` | **KHÔNG sửa dòng này.** Đây là bẫy, xem §7. Chỉ *đọc* để hiểu vì sao "nạp hai lượt" không dịch thẳng từ `pi`. |
| `packages/coding-agent/CHANGELOG.md` **:3-8** (dưới `## [Unreleased]`) | section `Unreleased` | *(chưa có mục nào về project trust)* | `### Added`<br>`- Project trust: omp now asks once per directory before loading project-local inputs (`.omp/extensions`, `.omp/config.yml`, `.omp/settings.json`, project `SYSTEM.md`/`APPEND_SYSTEM.md`, project `.agents/skills`). The decision is saved per directory in the trust store and `ctx.isProjectTrusted()` returns the real decision instead of a constant \`true\` ([#NNNN](https://github.com/can1357/oh-my-pi/issues/NNNN)).` |
| `packages/coding-agent/CHANGELOG.md` **:1117** | entry #7955 dưới `## [18.1.16] - 2026-09-09` (header ở dòng 1099) | `- Fixed legacy Pi extensions failing to load when calling \`ctx.isProjectTrusted()\` in an event handler; the extension context now exposes it (always \`true\`, since OMP applies no project-trust gating) ([#7955](…/issues/7955)).` | **TUYỆT ĐỐI KHÔNG SỬA.** Đã phát hành = bất biến. Mục `Unreleased` ở trên là chỗ ghi công khai. |
| *(tạo mới)* `packages/coding-agent/src/config/project-trust.ts` | `resolveProjectTrust`, `assertTrusted`, `hasTrustRequiringProjectResources` | *(không tồn tại)* | Một file, export 3 symbol. Xem §4. |

---

## 4. Các bước, đánh số, mỗi bước có neo đã kiểm

> **Bước 0 là bước chặn.** Không làm gì trước nó.

### Bước 0 — Chặn: chờ WI-0 chốt danh sách tài nguyên (GAP-D12)

- Kiểm tra `test -f docs/extension-trust-model.md` (hiện **KHÔNG** có — neo A6).
- Kiểm tra ADR có **cả** phần `MCP project-scope config` (GAP-D9), không chỉ extension.
- Nếu ADR chốt danh sách **khác** 7 mục của `pi` (`trust-manager.ts:30-38`), ghi lý do. Danh sách phải được **tính lại từ 7 mục đó**, không từ 4 hoặc 6.
- *(neo: `docs/extension-trust-model.md` — chưa tồn tại)*

### Bước 1 — Tạo MỘT file cơ chế, không chép `pi` nguyên si

Tạo `packages/coding-agent/src/config/project-trust.ts`. Một type + ba hàm:

```ts
export type ProjectTrustDecision = "yes" | "no" | "undecided";
export function resolveProjectTrust(cwd: string): ProjectTrustDecision;
export function assertTrusted(resource: string): void;   // ném nếu bị chặn
export function hasTrustRequiringProjectResources(cwd: string): boolean;
```

Ba quyết định phải chốt khi viết (ghi vào ADR):

1. **Phạm vi thư mục.** `pi` **leo thư mục cha** (`trust-manager.ts:44-58`, `findNearestTrustEntry` — `while (true) { … dirname(currentDir) … }`). omp **KHÔNG leo**: `docs/extension-loading.md:39` nói rõ *"The project root is the native provider's `.omp` directory (`SOURCE_PATHS.native.projectDir`), **cwd-only; it does not walk ancestors**."* Chép `pi` nghĩa là tin `~` là tin mọi thư mục con. **Cân nhắc mạnh chọn cwd-only cho khớp discovery.**
2. **Vị trí file.** `pi` dùng `~/.pi/agent/trust.json` (`trust-manager.ts:213`). omp tương đương là `getAgentDir()` (`packages/utils/src/dirs.ts:594`) + `trust.json`. Chú ý profile: `docs/extension-loading.md:39` nói `getAgentDir()` dưới `--profile <name>` là `~/.omp/profiles/<name>/agent/`, và tôn trọng `PI_CODING_AGENT_DIR`.
3. **Ghi có khóa hay không.** `pi` khóa bằng `proper-lockfile` (`trust-manager.ts:4, 137-175`). Quyết định này không nằm trong WI-20 — nêu trong ADR.

*(neo: `pi-ref/packages/coding-agent/src/core/trust-manager.ts:9,30-38,44-58,185,209-213,216,231`; `docs/extension-loading.md:39`; `packages/utils/src/dirs.ts:594`)*

### Bước 2 — "Nạp hai lượt" phải được viết lại cho omp, không chép từ `pi`

`pi` làm hai lượt bằng cách **dựng `SettingsManager` hai lần**:

- `pi main.ts:586` — `const bootstrapSettingsManager = SettingsManager.create(cwd, agentDir, { projectTrusted: false });` (project scope **không** nạp)
- `pi main.ts:735` — `const runtimeSettingsManager = SettingsManager.create(cwd, agentDir, { projectTrusted });` (project scope **có** nạp)

**omp không làm được vậy.** `Settings` của omp là **singleton toàn tiến trình**:

```ts
// packages/coding-agent/src/config/settings.ts:652-656
static init(options: SettingsOptions = {}): Promise<Settings> {
    if (globalInstancePromise) return globalInstancePromise;
    const promise = Promise.try(() => new Settings(options).#load());
    globalInstancePromise = promise;
```

(`globalInstancePromise` khai báo ở `settings.ts:3699`.) Lần gọi thứ hai trả về **cùng instance** — không thể "dựng lại với cờ trust khác".

Các đường sẵn có thay thế: `Settings.isolated()` (`settings.ts:694-702`, `inMemory: true`, không đụng singleton) và `Settings.overlay()` (`settings.ts:711-716`, child view đọc xuyên qua parent).

**Nhiệm vụ của bước này là chọn và viết ra** cơ chế hai lượt nào sẽ dùng. Ghi lựa chọn vào ADR. Đừng coi đây là chi tiết triển khai.

*(neo: `packages/coding-agent/src/config/settings.ts:652-656,694-702,711-716,3698-3699`; `pi-ref/packages/coding-agent/src/main.ts:586,704-747`)*

### Bước 3 — Re-check ở consumer: giữ **tham chiếu hàm**, không giữ boolean

Đây là điểm mẫu, và là phần dễ làm hỏng âm thầm nhất.

`pi` **không** chụp giá trị. `pi runner.ts:365` khai báo một **field hàm**:

```ts
private isProjectTrustedFn: () => boolean = () => true;
```

và `pi runner.ts:431` rebind nó:

```ts
this.isProjectTrustedFn = contextActions.isProjectTrusted;
```

Cách gọi ở consumer (`pi interactive-mode.ts:2161`): `isProjectTrusted: () => this.settingsManager.isProjectTrusted(),` — **gọi getter sống mỗi lần**, nên quyết định đổi giữa chừng session vẫn thấy.

omp phải giữ đúng hình dạng này ở `runner.ts:1293`: `() => this.#isProjectTrustedFn()` — **không** phải `() => this.#projectTrusted` (biến đã chụp).

*(neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:1293,1299`; `pi-ref/packages/coding-agent/src/core/extensions/runner.ts:365,431`; `pi-ref/packages/coding-agent/src/modes/interactive/interactive-mode.ts:2161`)*

### Bước 4 — Nối call site thứ hai, và **nhận ra nó không có test nào**

`runner.ts:1293` được `createCommandContext()` bao lại (nó spread `...this.createContext()` — `runner.ts:1379-1381`), nên một test qua runner phủ được cả hai.

Nhưng `agent-session.ts:7552` nằm trong `#createCommandContext()` (dòng 7540) — **nhánh fallback khi session không có extension runner**:

```ts
#createCommandContext(): ExtensionCommandContext {
    if (this.#extensionRunner) {
        return this.#extensionRunner.createCommandContext();
    }
    return {
        …
        isProjectTrusted: () => true,   // ← 7552
        // Used only when the session has no extension runner. `createAgentSession` always builds
        // one (carrying the real identity), so only hand-constructed sessions land here.
```

**Hai test hiện có KHÔNG chạm nhánh này.** Sửa `runner.ts:1293` mà quên `agent-session.ts:7552` thì cổng (1) vẫn xanh — xem §5.

*(neo: `packages/coding-agent/src/session/agent-session.ts:7540,7552,7553-7554`; `packages/coding-agent/src/extensibility/extensions/runner.ts:1379-1381`)*

### Bước 5 — Chứng minh mâu thuẫn, không chỉ thêm dòng

Ba tuyên bố đã phát hành nói omp không chặn. Cả ba phải được xử lý có chủ đích:

1. `types.ts:490-492` — *"OMP performs no project-trust gating"*
2. `types.ts:557-561` — *"always returns `true`, truthfully reflecting that OMP already trusts project-local inputs by default"*
3. `CHANGELOG.md:1117` (**đã phát hành**, dưới `## [18.1.16]`) — *"(always `true`, since OMP applies no project-trust gating)"*

(1) và (2) sửa cùng diff. (3) **không sửa được** → bắt buộc có mục `## [Unreleased]`, với link issue.

Ngoài ra: `types.ts:559` trỏ tới `docs/extension-loading.md` làm căn cứ, và file đó **không có một dòng nào** nói về trust (`rg -n -i trust docs/extension-loading.md` → 0 kết quả). Đó là một lý do **treo**. Sửa nó thành trỏ `docs/extension-trust-model.md`.

*(neo: `packages/coding-agent/src/extensibility/extensions/types.ts:490-492,557-561,559`; `packages/coding-agent/CHANGELOG.md:1117`; `docs/extension-loading.md`)*

---

## 5. Hợp đồng test

### File và case

**Sửa `packages/coding-agent/test/extension-context-project-trust.test.ts`** (hiện 1 case, `runner` với cwd hằng `"/project"`):

| Case | Contract | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| `resolves undecided for a directory with no saved decision` | thư mục lạ → `false`, và `hasTrustRequiringProjectResources` báo đúng | clone repo mới → omp **không hỏi** và vẫn nạp `.omp/extensions` |
| `returns the saved decision for a directory` | ghi `yes` rồi đọc lại → `true`; ghi `no` → `false` | người dùng đã từ chối một thư mục, mở lại lần sau thì omp hỏi lại / nạp lại |
| `re-reads the decision on every call` | đổi quyết định giữa hai lần gọi, lần sau phải thấy giá trị mới | quyết định đổi giữa session không có tác dụng — im lặng, khó tái hiện |

**Sửa `packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts`** (hiện 2 case):

| Case | Contract | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| `exposes isProjectTrusted() as a function` (giữ `typeof` assertion) | method **tồn tại** | crash `ctx.isProjectTrusted is not a function` — regression #7955 quay lại |
| `command context inherits the same decision as tool context` | `createCommandContext()` trả **cùng** giá trị với `createContext()` | command handler và tool handler nhìn thấy hai thế giới khác nhau |

**File mới `packages/coding-agent/test/project-trust.test.ts`** — phần **chưa ai phủ**:

| Case | Contract | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| `assertTrusted throws for a resource in the decision's blocked list` | `assertTrusted(resource)` **ném** khi thuộc danh sách bị chặn | consumer gọi `assertTrusted` không bao giờ ném → tài nguyên bị chặn vẫn chạy |
| `assertTrusted does not throw for a trusted project` | không ném khi `yes` | hộp thoại cảnh báo xuất hiện vô nghĩa ở mọi extension |
| `hand-constructed session reports the real decision` | nhánh fallback `agent-session.ts:7552` trả giá trị thật | **consumer im lặng tin `true` ở một call site và giá trị thật ở call site kia** — hỏng âm thầm, không ai thấy |

### Quy tắc (theo `AGENTS.md` — Testing Guidance)

- **Không** viết `expect(typeof x).toBe("function")` như contract chính — giữ case `typeof` của #7955 vì nó phòng regression crash, nhưng nó **không** phải bằng chứng trust hoạt động.
- Case `re-reads the decision on every call` là **test chống chép boolean** — nó là case quan trọng nhất trong file, đừng bỏ.
- Dùng thư mục tạm thật (`fs.mkdtemp`) cho `.omp/`, **không** dùng `"/tmp"` và `"/project"` hằng như hiện tại — trust theo thư mục mà cwd hằng thì mọi case gộp thành một.
- Không `mock.module()`.

---

## 6. Cổng

### Lệnh

```bash
# 0 — trước khi viết: cơ chế chưa tồn tại. (ĐÃ CHẠY, xác nhận 0 hit)
rg -n 'setProjectTrust|trust\.json' packages --glob '*.ts'          # expected: 0 hit

# 0b — cơ chế chưa tồn tại. (ĐÃ CHẠY, xác nhận file không có)
lsd docs/extension-trust-model.md                                    # expected: No such file

# 1 — hai call site phải là giá trị thật, không phải closure hằng
rg -n 'isProjectTrusted: \(\) => true' packages/coding-agent/src     # expected: 0 hit

# 2 — ba test phải xanh
bun test packages/coding-agent/test/extension-context-project-trust.test.ts \
          packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts \
          packages/coding-agent/test/project-trust.test.ts

# 3 — mục Unreleased phải có, mục 18.1.16 phải nguyên vẹn
rg -n 'isProjectTrusted' packages/coding-agent/CHANGELOG.md          # 2 hit: 1 cái mới + :1117 cũ
git diff --stat packages/coding-agent/CHANGELOG.md                   # chỉ được chạm vùng [Unreleased]

# 4 — type + lint + format
bun run check:ts
```

**Không cần build native addon.** `packages/natives/native/pi_natives.darwin-arm64.node` đã có; `bun test` chạy được ngay trên máy này (đã kiểm: `3 pass`). Bỏ dòng "bị chặn cho tới khi có native addon" khỏi kế hoạch khi áp dụng.

### Trả lời câu hỏi: cổng này có ĐỎ ĐƯỢC không?

| Cổng | Đỏ được? | Bằng cách nào |
| --- | --- | --- |
| **(1) Hai call site trả giá trị thật** | ⚠️ **NỬA** | `rg 'isProjectTrusted: \(\) => true'` đỏ được cho `runner.ts:1293`. Nhưng `agent-session.ts:7552` nằm trong nhánh `#createCommandContext()` fallback — **không test nào chạm tới**, nên nó đỏ được **chỉ khi case `hand-constructed session reports the real decision` trong `project-trust.test.ts` tồn tại**. Không có case đó thì cổng (1) là nửa vời. |
| **(2) Hai test sẵn có đỏ trước, rồi đỏ-sau** | ✅ **CÓ** | Cả hai file đều là `.toBe(true)` trên cwd hằng. Chạy `bun test` trên HEAD: **`3 pass, 0 fail`** (đã kiểm). Sửa mà quên đổi test → test vẫn xanh và nghĩa là cổng chưa từng đỏ. Đây là cổng thật sự mạnh nhất. |
| **(3) Changelog** | ✅ **CÓ** | `rg -n 'isProjectTrusted' packages/coding-agent/CHANGELOG.md` — hôm nay **1 hit** (dòng 1117). Sau khi sửa phải **2 hit**, và `git diff --stat` chỉ được chạm vùng `[Unreleased]`. Kiểm riêng: `git diff` không được chứa dòng 1117. |
| **(4) `check:ts` exit 0** | ❌ **KHÔNG BAO GIỜ ĐỎ** | Nó chỉ đỏ khi sai kiểu. Một `trust.json` sai schema vẫn typecheck. **Cổng này tạo cảm giác an toàn giả — bỏ nó khỏi danh sách cổng hoàn thành.** |

### Viết lại cổng (4) cho đỏ được

Thay bằng một cổng thật sự phụ thuộc hành vi:

```bash
# 4' — trust store phải từ chối giá trị hỏng, không nuốt im lặng
# (file project-trust.test.ts đã có case tương ứng; lệnh này chỉ để
#  grep xác nhận case tồn tại, KHÔNG thay thế việc chạy test)
rg -n "invalid|malformed|corrupt" packages/coding-agent/test/project-trust.test.ts
```

Và bổ sung một cổng thật sự đỏ được cho hình dạng dữ liệu:

```bash
# 4'' — quyết định lưu được là string, không phải boolean
# (bắt regression: ghi `true` thay vì "yes" phải bị từ chối khi đọc lại)
```

**Kết luận cổng:** 3 cổng đỏ được (1 nếu bổ sung case, 2, 3), 1 cổng phải bỏ. Giữ nguyên cổng nào không đỏ được thì **xoá nó** — cổng luôn xanh tệ hơn không có cổng.

---

## 7. Cạm bẫy riêng của WI này

Xếp theo mức nguy hiểm thật sự.

### Bẫy 1 — `agent-session.ts:7552` không có test phủ (nguy hiểm nhất)

Sửa `runner.ts:1293` cho đúng, cả hai test hiện có vẫn xanh, và `agent-session.ts:7552` **vẫn trả `true`**. Không ai thấy. Đây đúng là hỏng âm thầm mà cổng (1) nói phải chặn — nhưng chỉ chặn được nếu có case ở `project-trust.test.ts`. Lý do nhánh đó tồn tại là `#createCommandContext` chỉ chạy khi `this.#extensionRunner` là falsy, tức **session tự dựng tay** (comment ở dòng 7553-7554 nói rõ: *"`createAgentSession` always builds one … only hand-constructed sessions land here"*). Test hiện có dựng `ExtensionRunner` trực tiếp nên **không bao giờ** đi qua đó.

### Bẫy 2 — Chép `pi` thì leo thư mục cha, và omp cố ý không leo

`pi` `findNearestTrustEntry` (`trust-manager.ts:44-58`) dòng lên tận `/`. omp: `docs/extension-loading.md:39` — *"cwd-only; it does not walk ancestors."* Chép nguyên logic là tin `~/code/myrepo` vì `~` đã tin. Với cơ chế per-directory mà user sẽ dùng để **từ chối**, đây là lỗi theo hướng nguy hiểm (over-trust), và nó im lặng vì không có gì hỏng.

### Bẫy 3 — `Settings` là singleton; "nạp hai lượt" không dịch được

`settings.ts:653`: `if (globalInstancePromise) return globalInstancePromise;`. Gọi `Settings.init()` lần hai trả về **cùng instance đã nạp project scope**. Một người đọc `pi main.ts:586` + `:735` rồi port nguyên sẽ viết `Settings.init()` hai lần và tưởng đã làm xong bước 2 — trong khi thực tế chỉ có một lượt. Bước 2 của §4 bắt buộc phải chọn cơ chế thật (`isolated()` / `overlay()` / gì đó khác) và **viết lựa chọn vào ADR**.

### Bẫy 4 — Đã có MỘT công tắc trust thứ hai do `5acb674` giao hàng

Commit `5acb674` *"fix(coding-agent): do not trust project-scope MCP config by default"* đã đặt `mcp.enableProjectConfig` **mặc định `false`** (setting + fallback `??` trong loader). Đây là **boolean opt-out độc lập**, không phải trust theo thư mục.

Hệ quả: sau WI-20, omp có **hai** công tắc trust cùng tồn tại. Người dùng có thể từ chối thư mục ở `trust.json` nhưng `mcp.enableProjectConfig: true` vẫn nạp `mcp.json` project-scope. **Phải chốt: `trust.json` nuốt `enableProjectConfig`, hay hai cái cùng tồn tại?** Nếu không chốt, WI-20 tạo ra một cổng tin cậy **lủng củng**. Đây là GAP-D9 đã được sửa một nửa, và kế hoạch WI-20 chưa đề cập.

*(Đã kiểm: `rg -n 'enableProjectConfig' packages --glob '*.ts'` → có ở `sdk.ts:2277,2302,5038`, `modes/controllers/mcp-command-controller.ts:2222,2242`, `modes/components/extensions/dashboard-runtime.ts:57`, và 6 file test.)*

### Bẫy 5 — Chép `boolean | null` thành tri-state chuỗi mà không nói

`pi` dùng `boolean | null` (`trust-manager.ts:9`). Plan đề xuất `"yes" | "no" | "undecided"`. Cả hai đều ổn, nhưng nếu ADR ghi "theo mẫu `pi`" mà code dùng chuỗi thì người đọc ADR tin nhầm. Ghi rõ trong ADR.

### Bẫy 6 — Chốt danh sách 4 hoặc 6 mục thay vì 7

Đã nêu ở §2. Chốt 4 mục = bỏ sót `SYSTEM.md` / `APPEND_SYSTEM.md` = system prompt của thư mục vẫn nạp khi bị từ chối. Đây là lỗ hổng, không phải khác biệt văn phong.

### Bẫy 7 — Nhầm "chép 4 mục của `pi`" với thật

Claim trong plan là sai (pi là **một** file). Người đi tìm "bốn mục" sẽ không tìm thấy và có thể kết luận sai rằng tham chiếu không đáng tin, rồi tự thiết kế lại từ đầu. Đã xác minh lại ở §2.

---

## 8. Danh sách file chạm tới

| path | hành động |
| --- | --- |
| `packages/coding-agent/src/config/project-trust.ts` | **TẠO MỚI** — một cơ chế, 3 export |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1293` | sửa — `() => this.#isProjectTrustedFn()` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` (field mới) | thêm — `isProjectTrustedFn`, theo mẫu `isIdleFn` ở dòng 1299 |
| `packages/coding-agent/src/session/agent-session.ts:7552` | sửa — call site thứ hai |
| `packages/coding-agent/src/extensibility/extensions/types.ts:490-492, 557-561` | sửa jsdoc (2 khối) |
| `packages/coding-agent/test/extension-context-project-trust.test.ts` | sửa — 1 case → 3 |
| `packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts` | sửa — giữ 2 case, siết case thứ 2 |
| `packages/coding-agent/test/project-trust.test.ts` | **TẠO MỚI** — 3 case, gồm nhánh không ai phủ |
| `packages/coding-agent/CHANGELOG.md` (vùng `## [Unreleased]`) | sửa — bắt buộc |
| `packages/coding-agent/CHANGELOG.md:1117` | **KHÔNG SỬA** (đã phát hành) |
| `docs/extension-trust-model.md` | **đọc sau WI-0, KHÔNG sửa ở đợt này** |

## 9. Phụ thuộc

- **`depends_on`: WI-0 — CỨNG.** `docs/extension-trust-model.md` phải tồn tại và phải phủ **cả** extension **và** MCP project-scope (GAP-D9). Danh sách tài nguyên phải tính lại từ 7 mục của `pi`.
- **Không** giao vào M2. Wave 9. Chưa có NGÀY — WI-0 đòi một NGÀY và mục này là nơi NGÀY đó gắn vào.
- **Không** lấy WI-19 (GAP-M2-9) làm chỗ để làm. WI-19 đang sửa `createContext()` ở đúng hai call site mà `isProjectTrusted` sống — nhìn rất dễ nhập nhằng, nhưng là **hai work item khác nhau, một PR riêng**.

---

## 10. Ghi chú cho người đọc kế hoạch

Các mục dưới đây **trong `MILESTONE_2_EXECUTION_PLAN.md` sai so với cây thật**. Không sửa file kế hoạch — ghi ra đây.

| claim trong plan | verdict | sự thật |
| --- | --- | --- |
| `types.ts:548-561` | lệch 2 dòng | thật là `:550-562` (khai báo ở `:563`) |
| `CHANGELOG.md:1057` | sai dòng | thật là `:1117`; đúng là nằm dưới `## [18.1.16] - 2026-09-09` (header `:1099`) |
| "Đính chính": `types.ts:494` / `:561` | **đính chính ngược** | thật là `:496` / `:563` — số của sổ khoảng trống mới đúng |
| "Đính chính": `runner.ts:1264` | hỏng | thật là `:1293` (1264 nằm trong JSDoc về `invokeTool`) |
| "Đính chính": `agent-session.ts:7406` | hỏng | thật là `:7552` (7406 là comment về auto-thinking) |
| "`pi` có bốn mục trải trên nhiều file" | **sai** | `pi` dùng **một** file: `pi-ref/.../src/core/trust-manager.ts`, 245 dòng |
| GAP-D12 liệt kê 6 mục | cần tính lại | `pi` có **7** mục + `.agents/skills` (`trust-manager.ts:30-38`, `185-206`) |
| "bị chặn cho tới khi có native addon" | **không còn đúng** | addon đã có; `bun test` chạy được ngay |
| cổng (4) `check:ts` exit 0 | **không bao giờ đỏ** | bỏ khỏi danh sách cổng; xem §6 |
| chưa đề cập | **bỏ sót** | `mcp.enableProjectConfig` (commit `5acb674`) đã là công tắc trust thứ hai |
| chưa đề cập | **bỏ sót** | `agent-session.ts:7552` không có test nào phủ |
