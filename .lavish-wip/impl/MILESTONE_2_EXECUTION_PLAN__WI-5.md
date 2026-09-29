# Phiếu triển khai — WI-5: Capability registry có chủ sở hữu, có unregister, và có một reset thật sự

**Kế hoạch:** `MILESTONE_2_EXECUTION_PLAN.md:1997-2252`
**Cây đo:** `/Users/tranquangdang21/Projects/ultraworkers` @ `65cc6c1` (branch `milestone-1`)
**Ngày kiểm:** 2026-09-29. Mọi trích dẫn dưới đây lấy từ file đã mở ở đúng commit này.

> **Cảnh báo đầu phiếu:** HEAD đã dời từ `808b365` (mốc plan dùng để đo) sang `65cc6c1`. Bốn file
> call-site đã trôi. Ngoài ra plan BỎ SÓT HAI nơi nữa phải sửa, và một trong hai nằm ngoài phạm vi
> grep mà plan dùng làm cổng. Chi tiết ở §2 và §5.

---

## 1. Cái gì thay đổi, quan sát được

Sau ba commit, hàm xoá cache của capability registry mang đúng tên việc nó làm
(`invalidateAllCaches` thay cho `reset`), một hàm mới `resetRegistry()` mới thật sự xoá định nghĩa
capability, và mỗi provider đăng ký được gắn một `sourceId` chủ sở hữu kèm
`unregisterProvidersForSource()` gỡ đúng provider của source đó — sao cho một extension bị tắt
trong settings không còn để lại đóng góp trong danh sách provider đã phân giải.

**Cái người dùng thấy ngay:** không có gì. Đây là thay đổi không quan sát được, và mô tả PR
**không được** hứa hành vi. Lý do đã kiểm chứng: cả 84 lời gọi `registerProvider` của capability
registry đều là câu lệnh top-level cấp module trong `src/discovery/` (đo: `rg -c '^registerProvider'`
→ 84, `rg -c '^\s{2,}registerProvider\('` → 0 kết quả), nên không có call site sống nào truyền
`sourceId`. Lời gọi `unregisterProvidersForSource()` trong nhánh suspend là **inert** tại thời điểm
ship — nó luôn tra một map rỗng. Đây là seam cho WI-10, không hơn.

---

## 2. Bảng điểm sửa

Cột TRƯỚC trích nguyên văn từ file thật tại `65cc6c1`.

### 2.1 `packages/coding-agent/src/capability/index.ts` — 3 commit

| vị trí | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `:554-556` | `reset` | `export function reset(): void {`<br>`\tclearFsCache();`<br>`}` | `export function invalidateAllCaches(): void {`<br>`\tclearFsCache();`<br>`}` + doc comment mới nói rõ KHÔNG phải registry |
| `:557` (mới) | `resetRegistry` | *(không tồn tại)* | `export function resetRegistry(): void {`<br>`\tcapabilities.clear();`<br>`}` — chỉ xoá map `capabilities`, không gì khác |
| `:101` | `registerProvider<T>` | `export function registerProvider<T>(capabilityId: string, provider: Provider<T>): void {` | `export function registerProvider<T>(capabilityId: string, provider: Provider<T>, sourceId?: string): void {` |
| `:34`-`:44` (chèn sau `:44`) | attribution | *(chỉ có 3 Map ở `:34`/`:37`/`:40` và 2 Set ở `:43`/`:44`)* | `const providersBySource = new Map<string, Set<string>>();`<br>`const providerSourceByName = new Map<string, string>();` |
| `:101`+ (thêm vào thân) | attribution claim | *(thân hàm chỉ set `providerMeta` + `providerCapabilities` rồi splice theo priority)* | thêm khối `if (sourceId !== undefined) { ... }` mirror `config/model-registry.ts:3010-3023` |
| cạnh `:566` (mới) | `unregisterProvidersForSource` | *(không tồn tại)* | `export function unregisterProvidersForSource(sourceId: string): void` mirror `clearSourceRegistrations` (`model-registry.ts:2914`) |

### 2.2 Tám dòng import — đổi tên, bỏ alias (COMMIT 1)

| path:line (đã kiểm) | TRƯỚC | SAU |
| --- | --- | --- |
| `src/main.ts:24` | `import { reset as resetCapabilities } from "./capability";` | `import { invalidateAllCaches } from "./capability";` |
| `src/sdk.ts:51` | `import { loadCapability, reset as resetCapabilities } from "./capability";` | `import { invalidateAllCaches, loadCapability } from "./capability";` |
| `src/session/agent-session.ts:113` | `import { reset as resetCapabilities } from "../capability";` | `import { invalidateAllCaches } from "../capability";` |
| `src/session/session-tools.ts:6` | `import { reset as resetCapabilities } from "../capability";` | `import { invalidateAllCaches } from "../capability";` |
| `src/modes/controllers/selector-controller.ts:25` | `import { reset as resetCapabilities } from "../../capability";` | `import { invalidateAllCaches } from "../../capability";` |
| `src/modes/controllers/ssh-command-controller.ts:7` | `import { reset as resetCapabilities } from "../../capability";` | `import { invalidateAllCaches } from "../../capability";` |
| `src/slash-commands/builtin-marketplace.ts:1` | `import { reset as resetCapabilities } from "../capability";` | `import { invalidateAllCaches } from "../capability";` |
| `src/slash-commands/helpers/ssh.ts:2` | `import { reset as resetCapabilities } from "../../capability";` | `import { invalidateAllCaches } from "../../capability";` |

### 2.3 Mười hai call site — đổi thành `invalidateAllCaches();` (COMMIT 1)

| path:line **ĐÃ KIỂM Ở `65cc6c1`** | plan ghi | lệch | ngữ cảnh đã đọc |
| --- | --- | --- | --- |
| `src/main.ts:880` | `:872` | **+8** | ngay sau `clearPluginRootsAndCaches();` ở `:879` — đúng đường resume-with-chdir |
| `src/sdk.ts:4607` | `:4571` | **+36** | trong `reconcileExtensionSources`, ngay trước `discoverExtensionPaths` |
| `src/session/agent-session.ts:5563` | `:5435` | **+128** | ngay sau `this.sessionManager.appendResetBoundary();` ở `:5562` — đúng ranh giới `/clear` |
| `src/session/agent-session.ts:5948` | `:5820` | **+128** | đầu `refreshSkillsAndCommands()`, trước `loadSlashCommands` |
| `src/session/agent-session.ts:8957` | `:8811` | **+146** | trước `refreshBaseSystemPrompt()` sau khi chuyển session |
| `src/session/session-tools.ts:1712` | `:1651` | **+61** | đầu `async refreshSkills()` |
| `src/modes/controllers/selector-controller.ts:310` | `:310` | 0 | — |
| `src/modes/controllers/ssh-command-controller.ts:208` | `:208` | 0 | sau `addSSHHost(...)` |
| `src/modes/controllers/ssh-command-controller.ts:369` | `:369` | 0 | sau `removeSSHHost(...)` |
| `src/slash-commands/builtin-marketplace.ts:36` | `:36` | 0 | — |
| `src/slash-commands/helpers/ssh.ts:146` | `:146` | 0 | — |
| `src/slash-commands/helpers/ssh.ts:167` | `:167` | 0 | — |

### 2.4 Comment cần viết lại (COMMIT 1)

| path:line **ĐÃ KIỂM** | plan ghi | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `src/sdk.ts:3541` | `:3528` | `// resetCapabilities() clears the fs cache at those boundaries, so this observes` | `// invalidateAllCaches() clears the fs cache at those boundaries, so this observes` |

### 2.5 ⭐ HAI NƠI PLAN BỎ SÓT — bắt buộc phải sửa

Không có `resetCapabilities` trong hai dòng này, nên **grep cổng của plan không bắt được chúng**.

| path:line **ĐÃ KIỂM** | TRƯỚC | SAU | vì sao sót |
| --- | --- | --- | --- |
| `packages/coding-agent/src/discovery/index.ts:70` | `\treset,` — re-export trần từ `"../capability"`, ngay dưới dòng comment `// Cache management` ở `:69` | `\tinvalidateAllCaches,` | plan chỉ liệt kê call site có alias; đây là barrel re-export trần |
| `packages/coding-agent/test/extension-dashboard-mcp-parity.test.ts:19` | `import { initializeWithSettings, reset as resetDiscoveryCache } from "@oh-my-pi/pi-coding-agent/discovery";` (dùng tại `:241`) | `import { initializeWithSettings, invalidateAllCaches as resetDiscoveryCache } from "@oh-my-pi/pi-coding-agent/discovery";` | plan chỉ grep trong `src/`, không grep `test/` |

Nếu bỏ sót `discovery/index.ts:70`: `tsgo` báo TS2305, nhưng chạy `bun test
test/extension-dashboard-mcp-parity.test.ts` sẽ **xanh** vì `reset` đã biến mất khỏi barrel mà
file test đó dùng đường khác — hai lỗi này đi vào hai cổng khác nhau. Đó là lý do phải sửa cả hai.

*(Đã loại trừ: `src/modes/rpc/rpc-subagents.ts:101` cũng có `reset,` nhưng đó là **biến cục bộ**
`let reset = false;` ở `:85` trả về trong object literal, không phải re-export. Đã mở `:83-101`
để xác nhận.)*

### 2.6 Nối vào hot path (COMMIT 3)

| path:line **ĐÃ KIỂM** | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `src/sdk.ts:4615-4617` | `reconcileExtensionSources` | <pre>const { suspended, resumed } = extensionRunner.setSuspendedExtensions(\n\textension => governed.has(extension.resolvedPath) && !enabled.has(extension.resolvedPath),\n);</pre> | chèn ngay **sau** `:4617`:<br>`for (const extension of suspended) unregisterProvidersForSource(extension.path);`<br>kèm comment nói thẳng đây là inert và là seam cho WI-10 |

Dùng `extension.path`, **không** dùng `extension.resolvedPath`. Cơ sở: `Extension` khai báo cả hai
(`types.ts:1827-1830`), nhưng sourceId mà ModelRegistry đã dùng là `this.extension.path`
(`extensibility/extensions/loader.ts:363`, đã mở và đọc).

### 2.7 File test mới

| path | hành động |
| --- | --- |
| `packages/coding-agent/test/capability/reset-contract.test.ts` | tạo — đúng 2 khối `test()` |
| `packages/coding-agent/test/capability/provider-source-attribution.test.ts` | tạo — đúng 3 khối `test()` |

Thư mục `packages/coding-agent/test/capability/` **đã tồn tại**, chứa `fs-special-files.test.ts`,
`rule-agents.test.ts`, `rule-buckets.test.ts` (đã `ls`). Quy ước import của file sẵn có dùng
đường package: `import { clearCache, readFile } from "@oh-my-pi/pi-coding-agent/capability/fs";`.
Đường `@oh-my-pi/pi-coding-agent/capability` và `.../capability/tool` resolve được — đã kiểm bằng
cách chạy thật một file test dùng hai specifier này: `1 pass / 0 fail`. `package.json` có
`"./capability/*": { "types": "./src/capability/*.ts", ... }`.

---

## 3. Các bước, mỗi bước có neo đã kiểm

**COMMIT 1 — đổi tên (S, cơ học, không điều kiện)**

1. **Xác nhận cây trước khi gõ.**
   ```bash
   git -C /Users/tranquangdang21/Projects/ultraworkers rev-parse --short HEAD   # kỳ vọng 65cc6c1
   git -C /Users/tranquangdang21/Projects/ultraworkers branch --show-current    # kỳ vọng milestone-1
   git -C /Users/tranquangdang21/Projects/ultraworkers grep -n 'reset as resetCapabilities' -- packages/coding-agent/src   # 8 dòng
   git -C /Users/tranquangdang21/Projects/ultraworkers grep -n 'resetCapabilities()' -- packages/coding-agent/src        # 13 dòng (12 call + 1 comment)
   git -C /Users/tranquangdang21/Projects/ultraworkers grep -nE '^\s*reset,\s*$' -- packages/coding-agent/src             # 1 dòng: discovery/index.ts:70
   ```
   Hai lệnh grep đầu xác nhận đúng con số của plan. Lệnh grep thứ ba là lệnh **mới** bắt được
   `discovery/index.ts:70` mà plan bỏ sót. Đếm: `grep -c` của hai lệnh đầu cho 8 import và 12 call
   site — khớp plan tuyệt đối.

2. **Đổi tên export.** Mở `packages/coding-agent/src/capability/index.ts:551-556`. Đổi
   `export function reset(): void` → `export function invalidateAllCaches(): void`, và viết lại
   doc comment ở `:551-553` (hiện là `Reset all caches. Call after chdir or filesystem changes.`)
   để nói rõ nó **không** phải registry. *Neo: `capability/index.ts:554` — ĐÃ ĐỌC, nội dung khớp
   plan 100%.*

3. **Thêm `resetRegistry()`** ngay dưới `invalidateAllCaches()`, trước `resetCapabilityForTests`.
   Doc comment bắt buộc nêu: chỉ xoá `capabilities`; dành cho test và đường reload tương lai; không
   call site sống nào gọi; và **DESTRUCTIVE** vì cả 14 `defineCapability` đều là binding `export const`
   cấp module mà ESM đánh giá đúng một lần, nên sau lần gọi đầu tiên `getCapability` trả
   `undefined` và `loadCapability` ném cho **cả 14** capability. *Neo: `capability/index.ts:557`
   (vị trí chèn) và `:561` (`resetCapabilityForTests` phải giữ nguyên) — ĐÃ ĐỌC CẢ HAI.*

4. **Sửa 8 dòng import + 1 dòng barrel.** Theo bảng §2.2, thêm `discovery/index.ts:70`.
   Bỏ hẳn alias `as resetCapabilities` — alias là nửa sau của lời nói dối.
   *Neo: `main.ts:24` + 7 anh em — ĐÃ MỞ CẢ 8, nội dung khớp plan; `discovery/index.ts:70` — ĐÃ MỞ.*

5. **Sửa 12 call site** theo bảng §2.3 + viết lại comment `sdk.ts:3541`. Sau đó chạy:
   ```bash
   git -C /Users/tranquangdang21/Projects/ultraworkers grep -n resetCapabilities -- packages/coding-agent   # phải 0
   git -C /Users/tranquangdang21/Projects/ultraworkers grep -nE '^\s*reset,\s*$' -- packages/coding-agent/src  # phải 0
   git -C /Users/tranquangdang21/Projects/ultraworkers grep -rn '\breset as resetDiscoveryCache\b' -- packages/coding-agent/test  # phải 0
   ```
   ⚠️ Lệnh đầu **không đủ**. Ba lệnh mới là bộ grep đúng; plan chỉ có lệnh đầu.

6. **Viết `reset-contract.test.ts`** — đúng 2 `test()`, đúng thứ tự này:
   - **Row 1 (hợp đồng âm):** `invalidateAllCaches()` → `expect(getCapability(toolCapability.id)).toBeDefined()`.
     Import `toolCapability` từ `@oh-my-pi/pi-coding-agent/capability/tool` để `defineCapability`
     ở `capability/tool.ts:27` đã chạy (đã mở, `id === "tools"`, đã xác nhận bằng probe thật).
   - **Row 2 (hợp đồng mới):** `resetRegistry()` → `expect(getCapability(toolCapability.id)).toBeUndefined()`.
   *Neo: `capability/tool.ts:27` — ĐÃ ĐỌC. Đã chứng minh thực nghiệm rằng thứ tự này là bắt buộc:
   `bun test` cho mỗi FILE một module registry riêng, còn state được chia sẻ giữa các khối
   `test()` trong CÙNG một file (probe: file `a` xoá map module-level, file `b` vẫn thấy giá trị →
   5 pass/0 fail; file `d` không re-seed vẫn thấy seed của row trước → 4 pass/0 fail).*

**COMMIT 2 — attribution (M, phụ thuộc M2-OQ2 = YES)**

7. **Kiểm M2-OQ2 đã được WI-0 trả lời "the capability registry becomes extension-reachable" (YES).**
   Nếu NO → dừng, đừng dựng map attribution.
8. **Kiểm WI-1 commit 1 đã có teardown trong nhánh suspend chưa.** Ở `65cc6c1`, nhánh đó chưa có
   gì: `sdk.ts:4615-4617` là `setSuspendedExtensions`, `:4631` là `suspendedToolNames`. Nếu WI-1
   đã thêm, hãy mở rộng nhánh đó.
9. **Thêm hai Map** vào phần Registry State, ngay sau `:44` (trước `/** disabledProviders /
   enabledProviders as sets... */` ở `:46`):
   ```ts
   const providersBySource = new Map<string, Set<string>>();
   const providerSourceByName = new Map<string, string>();
   ```
   Doc comment trỏ `config/model-registry.ts:303-304` làm hình dạng mirror. *Đã mở `:303-304`,
   nội dung khớp plan 100%.*
10. **Mở rộng `registerProvider`** thêm `sourceId?: string`, chèn khối attribution sau
    `providerCapabilities.get(provider.id)!.add(capabilityId);` và trước khối
    `// Insert in priority order`. Port trực tiếp từ `model-registry.ts:3010-3023` (đã mở và đọc).
    *Neo: `capability/index.ts:101` — ĐÃ ĐỌC, chữ ký khớp plan; `model-registry.ts:3010-3023` —
    ĐÃ ĐỌC. Lưu ý: bản gốc còn gọi `#clearRuntimeProviderState()` và `#registeredProviderSources.add()`;
    capability registry không có hai thứ đó nên bỏ — nhưng phải nói trong doc comment rằng đã bỏ và vì sao.*

**COMMIT 3 — teardown + nối hot path (S)**

11. **Thêm `unregisterProvidersForSource(sourceId)`** cạnh khối Cache Management. Mirror
    `clearSourceRegistrations` ở `config/model-registry.ts:2914` (đã mở và đọc), bỏ
    `#ensureFullSnapshot()` / `#clearRuntimeProviderState()` / `#reloadStaticModels()` vì không có
    tương đương. Giữ đúng guard `providerSourceByName.get(providerId) !== sourceId → continue`.
    *Neo: `model-registry.ts:2914` — ĐÃ ĐỌC.*
12. **Nối vào `sdk.ts`**, chèn ngay sau `:4617`. *ĐÃ ĐỌC `:4613-4618`.*
13. **Viết `provider-source-attribution.test.ts`** — 3 `test()`, assert trên
    `getCapabilityInfo(capabilityId)?.providers` (**không** assert map nội bộ). Thứ tự: (a) provider
    của source biến mất, (b) hai source trên một capability, teardown một cái thì cái kia sống sót,
    (c) `resetRegistry()` không đụng attribution. Row `resetRegistry()` phải **sau** (a) và (b).
    *Neo: `getCapabilityInfo` ở `capability/index.ts:473` — ĐÃ ĐỌC, trả
    `{ id, displayName, description, providers: [{ id, displayName, description, priority, enabled }] }`.*

---

## 4. Hợp đồng test

**`packages/coding-agent/test/capability/reset-contract.test.ts`** (2 khối, thứ tự cố định)

| row | khẳng định | người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| 1 | `invalidateAllCaches()` rồi `getCapability(toolCapability.id)` vẫn defined | `/clear`, resume-with-chdir, chuyển phiên ssh và reconcile loop âm thầm ngừng phân giải được cả 14 capability **suốt phần đời còn lại của process**, không stack trace (ESM không đánh giá lại `defineCapability` cấp module). Prompts, rules, hooks, slash commands, skills, tools biến mất và không quay lại. |
| 2 | `resetRegistry()` rồi `getCapability(toolCapability.id)` là `undefined` | Hàm đặt tên là "xoá registry" lại không xoá gì — một lời nói dối mới thay lời nói dối cũ. |

**`packages/coding-agent/test/capability/provider-source-attribution.test.ts`** (3 khối)

| row | khẳng định | người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| (a) | provider thuộc source X vắng khỏi `getCapabilityInfo(id)?.providers` sau `unregisterProvidersForSource(X)` | Đóng góp của extension bị tắt vẫn nằm trong capability set. Nếu assert vào map nội bộ thay vì danh sách đã phân giải thì test xanh trong khi danh sách vẫn cũ — đó chính là failure mode. |
| (b) | hai source trên cùng capability; teardown một cái thì provider của source kia còn | Tắt một extension lặng lẽ cỡi đóng góp của một extension khác. Đây là row chứng minh attribution là thật. |
| (c) | sau `resetRegistry()`, provider từ cả hai `sourceId` vẫn còn | Commit 1 phá đường dọn dẹp của commit 2. Row này buộc `resetRegistry()` phải hẹp: không `providerCapabilities`, không `providerMeta`, không mảng `providers`, không map attribution. |

**Suy giảm được chấp nhận (phải ghi vào doc comment của `resetRegistry`):** sau `resetRegistry()`,
`getProviderInfo` vẫn duyệt `providerCapabilities` và thấy `capabilities.get(capId) === undefined`
nên rơi xuống `priority = 0` (`capability/index.ts:502-522`, đã đọc). Chấp nhận được cho hàm
chỉ-tồn-tại-để-test.

---

## 5. Cổng

### (1) Sau commit 1

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
git -C /Users/tranquangdang21/Projects/ultraworkers grep -n resetCapabilities -- packages/coding-agent
git -C /Users/tranquangdang21/Projects/ultraworkers grep -nE '^\s*reset,\s*$' -- packages/coding-agent/src
git -C /Users/tranquangdang21/Projects/ultraworkers grep -rn 'resetDiscoveryCache' -- packages/coding-agent/test
```

**Trả lời cụ thể: cổng này CÓ ĐỎ ĐƯỢC, nhưng KHÔNG phải vì lý do plan nói, và một nửa của nó
đang ĐỎ SẴN ở HEAD vì lý do không liên quan tới WI-5.**

- **Nửa grep — ĐỎ ĐƯỢC, tin cậy được.** Lệnh đầu trả 0 sau khi đổi tên, và lệnh đầu **ĐỎ NGAY Ở HEAD**
  (13 dòng). Đây là bằng chứng rằng lệnh có sức phân biệt.
- ⚠️ **Lệnh grep đầu của plan KHÔNG ĐỦ.** Nó trả 0 trong khi `discovery/index.ts:70` vẫn còn `reset,`
  và `extension-dashboard-mcp-parity.test.ts:19` vẫn còn `reset as resetDiscoveryCache`. Thêm hai
  lệnh grep còn lại — chúng **ĐỎ NGAY Ở HEAD** (1 dòng + 2 dòng).
- ⚠️ **`bun run check:ts` đang ĐỎ Ở `65cc6c1`, không liên quan tới WI-5.** Đo thật:
  `check:ts` = `check:tools && bun run --filter './packages/*' ... check:types`. Nửa `check:tools`
  (`oxlint . && oxfmt --check ...`) **exit 1** vì `oxfmt` báo định dạng sai ở
  `packages/tui/test/probe-frozen.test.ts` — một file **untracked** (`git ls-files` trả rỗng) còn
  sót lại từ WI-4. `oxlint .` riêng lẻ exit **0** (cảnh báo `no-unused-vars` ở
  `mcp-project-config-not-trusted-by-default.test.ts:19` chỉ là warning, không chặn).
  **Hậu quả:** vì `check:ts` chạy `check:tools` trước, nó chết ở oxfmt và **không bao giờ tới nửa
  type-check** — tức là nửa duy nhất thật sự chứng minh việc đổi tên an toàn.

  **Sửa để cổng đỏ được:** đừng chạy `bun run check:ts` một khống. Chạy hai nửa tách bạch:
  ```bash
  bunx oxlint .                                              # exit 0
  bunx oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' 'packages/*/*.ts' 'scripts/**/*.ts'
  bun run --filter './packages/*' --sequential --if-present check:types
  ```
  Nửa type-check đã đo **XANH** tại `65cc6c1`: 16 package, tất cả `Done`, gồm
  `@oh-my-pi/pi-coding-agent:check:types` (`tsgo -p tsconfig.json --noEmit`, và `tsconfig.json`
  `include` có `["src","test","scripts"]` nên nó **có** kiểm file test mới). Nếu
  `probe-frozen.test.ts` vẫn còn, dọn nó trước khi chạy `check:ts` — nó không thuộc WI-5.

### (2) Chứng minh tripwire row 1

Plan nói row 1 **chưa bao giờ được quan sát ở trạng thái xanh** vì native addon chưa build.
**Điều đó không còn đúng ở `65cc6c1`.** Đo thật:

- `bun test test/capability/rule-agents.test.ts` → **`4 pass / 0 fail`**. Addon **đã** build.
- Một test file import `../src/capability/index` + `../src/capability/tool` → **`1 pass / 0 fail`**.
  Chuỗi import LAN TRUYỀN (`@oh-my-pi/pi-utils`, `../extensibility/settings`,
  `../config/model-settings`) **không** chặn gì.
- Một test file dùng specifier package `@oh-my-pi/pi-coding-agent/capability` +
  `.../capability/tool`, gọi `reset` (tên cũ) rồi assert `getCapability(toolCapability.id)`
  defined → **`1 pass / 0 fail`**.

**Nghĩa là:** ngay Ở HEAD, row 1 **đã quan sát được XANH** nếu import dùng tên cũ `reset`. Không
cần build addon. Không cần `bun --cwd=packages/natives run build`.

Thứ tự ghim tripwire đúng (rút ngắn so với plan):
```bash
# (a) tạo reset-contract.test.ts với import TÊN MỚI -> chạy -> ĐỎ ở dòng import (TS2305 / SyntaxError)
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent
bun test test/capability/reset-contract.test.ts
# (b) đổi TẠM import của row 1 sang tên cũ `reset` -> XANH (tripwire đã quan sát ở trạng thái xanh)
# (c) tạm thêm `capabilities.clear();` vào invalidateAllCaches() -> chạy lại -> row 1 ĐỎ
# (d) gõ bỏ `capabilities.clear();` và đổi import về tên mới -> XANH
```
Ghi kết quả (b) và (c) vào PR. **Đây là bằng chứng thật, không phải mô tả.**

### (3) Sau commits 2-3

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run --filter './packages/*' --sequential --if-present check:types
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/capability/reset-contract.test.ts test/capability/provider-source-attribution.test.ts
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test
```

**CÓ ĐỎ ĐƯỢC — và có thể đánh giá được ngay tại `65cc6c1`.** Không cần build gì thêm. Cả ba tầng
đều chạy được (đo ở trên). Bước thứ ba là bắt buộc: nó chứng minh `resetRegistry()` trong một file
không đầu độc file khác — rủi ro thật mà plan nguồn không nhắc. Đã chứng minh cơ chế cô lập
per-file bằng probe, nhưng vẫn phải chạy full suite.

### Vì sao cổng này CÓ ĐỎ ĐƯỢC — tóm tắt

| tầng | đỏ được? | bằng cách nào | đo ở `65cc6c1` |
| --- | --- | --- | --- |
| grep | ✅ có | export đổi tên → `resetCapabilities` biến mất | **ĐỎ** 13 dòng (13 dòng + 1 + 2 với 2 lệnh bổ sung) |
| type-check | ✅ có | `tsgo` báo TS2305 khi sót một import | **XANH** (cần tách khỏi `check:tools`) |
| test | ✅ có | tripwire row 1 + 3 row attribution | **XANH** (addon đã build) |
| full suite | ✅ có | `resetRegistry()` đầu độc file khác | chạy được |

**Cổng KHÔNG phủ gì:** claim hành vi trong mô tả PR. Không có đường production nào đăng ký
capability provider kèm `sourceId` (đã kiểm: 84 lời gọi, tất cả top-level cấp module trong
`src/discovery/`). Đừng viết trong PR rằng tắt extension giờ đã giải phóng provider của nó.

---

## 6. Cạm bẫy riêng của work item này

1. **Lựa chọn bị cấm — đừng làm `reset()`/`invalidateAllCaches()` xoá map `capabilities`.**
   Trông như đó chính là bản sửa. Nó làm brick **cả process, im lặng, không stack trace**: 14
   `defineCapability` đều là `export const x = defineCapability(...)` cấp module (đã kiểm đủ 14
   vị trí), ESM đánh giá mỗi module đúng một lần, nên không import nào chạy lại chúng. Sau lần
   gọi đầu tiên, `getCapability`/`loadCapability` hỏng cho **cả 14** ở **mọi** call site.

2. ⭐ **Sai lầm dễ nhất khi gõ: tin con số "8 file".** Thực tế là **10 file**. Plan đếm đúng 8 dòng
   import có alias và 12 call site, nhưng bỏ sót `discovery/index.ts:70` (re-export trần) và
   `test/extension-dashboard-mcp-parity.test.ts:19` (alias `resetDiscoveryCache`). Không neo nào
   trong bảng file của plan trỏ tới hai file này. Vì grep cổng của plan chỉ tìm chuỗi
   `resetCapabilities`, nó sẽ **XANH trong khi hai chỗ đó còn hỏng** — một cổng luôn xanh tệ hơn
   không có cổng.

3. **Đừng chạy `bun run check:ts` một khống.** Nó đang đỏ sẵn vì file untracked
   `packages/tui/test/probe-frozen.test.ts` (tàn dư của WI-4) làm `oxfmt` exit 1, và vì `check:tools`
   chạy trước nên nửa type-check — thứ duy nhất chứng minh việc đổi tên an toàn — không bao giờ chạy.
   Chạy `oxlint` / `oxfmt` / `check:types` tách bạch. Đừng dọn file của người khác mà không nói với họ.

4. **Đừng viết PR "tắt extension giờ giải phóng provider của nó."** Không đúng. 84 lời gọi
   `registerProvider` đều không có `sourceId`; lời gọi trong nhánh suspend luôn trượt. Đây là seam.

5. **Đừng lấy `extension.resolvedPath`.** SourceId mà ModelRegistry đã dùng là `extension.path`
   (`loader.ts:363`). `Extension` có cả hai trường (`types.ts:1827-1830`) và chúng **khác nhau** —
   `sdk.ts:4616` tự nó so sánh bằng `resolvedPath`, dễ khiến người gõ chọn nhầm.

6. **Thứ tự hai row trong `reset-contract.test.ts` là bắt buộc.** Đã chứng minh thực nghiệm: state
   module **được chia sẻ giữa các khối `test()` trong cùng một file**. Row 2 gọi `resetRegistry()`
   trước sẽ làm row 1 đỏ sai lệch. (Ngược lại, state **không** chia sẻ **giữa các file**, nên
   `resetRegistry()` không đầu độc `provider-source-attribution.test.ts`.)

7. **`resetRegistry()` phải giữ hẹp** hoặc row (c) không thể hiện thực: không `providerCapabilities`,
   không `providerMeta`, không mảng `providers` theo từng capability, không map attribution.

8. **Đừng dùng `bun run test:rs`/cargo cho cái này** và **không bao giờ** `tsc`/`npx tsc` — cổng
   type-check của repo là `tsgo` qua `check:types`.

9. **Đừng đổi tên `resetCapabilityForTests`** (`:561`). Nó là hàm khác, việc khác: xoá `settingsHolds`
   + hai unbound Set + fs cache, và **không** đụng `capabilities`. Nó có call site thật ở
   `src/discovery/index.ts:71` và `test/sdk-provider-toggle-binding.test.ts:43`.

---

## 7. Danh mục neo đã kiểm

**Đúng tuyệt đối (mở và đọc, nội dung khớp 100%):**

`capability/index.ts` — file dài 588 dòng, **không đổi một dòng nào** kể từ `808b365`
(`git diff --stat 808b365..HEAD` trả rỗng cho file này), nên **mọi neo của nó trong plan vẫn đúng**:
`:11` (import `@oh-my-pi/pi-utils`), `:26`, `:27`, `:34`, `:37`, `:40`, `:43`, `:44`, `:63`,
`:71`, `:89` (`defineCapability`), `:101` (`registerProvider`), `:459` (`getCapability`), `:473`
(`getCapabilityInfo`), `:502-522` (`getProviderInfo`), `:554-556` (`reset`), `:561-566`
(`resetCapabilityForTests`), `:572` (`invalidate`).
`capability/tool.ts:27` · `config/model-registry.ts:303`, `:304`, `:3010`, `:3011-3019`,
`:3020-3023`, `:2955` (`syncExtensionSources`) ·
`extensibility/extensions/loader.ts:363` · `extensibility/extensions/runner.ts:976-977`
(`setSuspendedExtensions` trả `{ suspended, resumed }`) · `extensibility/extensions/types.ts:1827-1830` ·
`main.ts:24` · `selector-controller.ts:25`, `:310` · `ssh-command-controller.ts:7`, `:208`, `:369` ·
`builtin-marketplace.ts:1`, `:36` · `helpers/ssh.ts:2`, `:146`, `:167` · `session-tools.ts:6`.
Đếm: 8 import có alias, 12 call site, 14 `defineCapability` cấp module, 84 lời gọi `registerProvider`
top-level trong `src/discovery/` (104 dòng − 20 dòng import), 0 lời gọi lồng trong hàm, thư mục
`test/capability/` đã có 3 file.

**Đã trôi (dùng số trong plan → SỐ ĐÚNG Ở `65cc6c1`):**

| plan ghi | thực tế | lệch |
| --- | --- | --- |
| `agent-session.ts:112` (import) | `:113` | +1 |
| `main.ts:872` | `:880` | +8 |
| `sdk.ts:3528` (comment) | `:3541` | +13 |
| `sdk.ts:4571` (`resetCapabilities()`) | `:4607` | +36 |
| `sdk.ts:4566` (`reconcileExtensionSources`) | `:4602` | +36 |
| `sdk.ts:4579-4581` (`setSuspendedExtensions`) | `:4615-4617` | +36 |
| `agent-session.ts:5435` / `:5820` / `:8811` | `:5563` / `:5948` / `:8957` | +128 / +128 / +146 |
| `session-tools.ts:1651` | `:1712` | +61 |

**Sai trong chính bảng "Đính chính" của plan:**

- Plan viết `clearSourceRegistrations` "mở ra ở `:2913`; `:2914` là dấu ngoặc mở". **Sai.**
  `:2913` là dòng `*/` đóng doc comment; **`:2914` mới là chữ ký hàm**. Con số gốc của plan §5.2
  (`:2914`) mới đúng, và bảng đính chính đã làm nó sai đi.
- Plan viết extension API `registerProvider` ở `types.ts:1570` và `:1743`. Thực tế: `:1595`
  (`registerProvider(name: string, config: ProviderConfig): void` — **không** có `sourceId`) và
  `:1768` (`registerProvider(name: string, config: ProviderConfig, sourceId: string): void`).
  Kết luận của plan ("hàm khác cùng tên của model registry, vốn đã nhận `sourceId`") chỉ đúng một
  nửa: signature mà extension thấy **không** có `sourceId`; loader tự chèn nó ở `loader.ts:363`.

**Sai về môi trường (đo lại ở `65cc6c1`):**

- Native addon **đã build** — `rule-agents.test.ts` ra `4 pass / 0 fail`, không phải `0 pass / 1 fail`.
- Chuỗi import lan truyền **không** chặn test — import `capability/index` ra `1 pass / 0 fail`.
- Row 1 **đã quan sát được XANH ở HEAD** dùng tên cũ `reset` — trái với "chưa bao giờ quan sát".
- `bun run check:ts` **đang ĐỎ** vì `packages/tui/test/probe-frozen.test.ts` (untracked, tàn dư WI-4).
  Nửa type-check riêng lẻ **XANH**, 16 package.

**Plan không nói (và đáng nói):** blast radius thật là **10 file**, không phải 8.
