# WI-7 — `registerMode`: phiếu triển khai

Nguồn: `MILESTONE_2_EXECUTION_PLAN.md:2678-2991` (mục `## WI-7.`).
Lượt kiểm chứng này chạy lại **67 neo** bằng `sed -n` / `rg` / `git grep` trên cây `ultraworkers` tại HEAD `65cc6c1`. **49 neo đúng, 18 neo sai hoặc thiếu chính xác.** Tất cả sai lệch đều nằm ở bảng "Đính chính so với plan" và ở mục MÔI TRƯỜNG — tức là chính những chỗ tài liệu tự nhận là "đã qua một lượt kiểm chứng". Không sửa gì trong file kế hoạch; mọi sai lệch ghi ra ở đây.

---

## 1. Cái gì thay đổi, quan sát được

Một lời gọi `pi.registerMode(definition)` từ một extension **ngoài repo** cài trọn một mode — tập tool, cổng settings, `enter`/`exit`, chính sách ghi, và một chip trên status-line — trong khi năm mode tích hợp sẵn vẫn render, vẫn chặn cổng settings và vẫn chặn ghi y hệt như hôm nay.

Không ai cài mode từ bên thứ ba thì **không thấy gì khác**. Cái thay đổi quan sát được là: một mode do extension đăng ký **không còn có thể vô hình** — `ModeDefinition.statusLine` là field bắt buộc nên mọi mode đã đăng ký đều sinh ra một chip trong segment `mode` sẵn có (`packages/tui/src/status-line/segments.ts:364`).

---

## 2. Bảng điểm sửa

Mọi ô "TRƯỚC" dưới đây là văn bản thật lấy từ file tôi vừa mở, không viết lại từ trí nhớ.

| `đường/dẫn` | symbol | TRƯỚC (trích từ file thật) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `src/modes/mode-registry.ts` | `ModeRegistry` | *(file chưa tồn tại — `ls` → No such file)* | file mới: `ModeDefinition` / `WritePolicy` / `ModeStatusLine` / `ModeContext` / `ResolvedMode` + `register()` / `isActive()` / `setActivation()` / `resolvedMode()` / `writePolicy()` / `#sortedIds()` |
| `src/modes/index.ts` | barrel | `export * from "./rpc/rpc-types";` (dòng cuối cùng trước comment `planSaveFileName`) | thêm `export * from "./mode-registry";` (star re-export, theo luật AGENTS.md) |
| `src/plan-mode/write-policy.ts` | `checkWritePolicy` | *(file chưa tồn tại)* | file mới: literal `WritePolicy` + `checkWritePolicy(policy, ctx) → "move" \| "delete" \| "workingTree" \| null` |
| `src/tools/plan-mode-guard.ts` | `enforcePlanModeWrite` (`:127`–`:148`) | `const state = session.getPlanModeState?.();`<br>`if (!state?.enabled) return;`<br>`if (options?.move) { throw new ToolError("Plan mode: renaming files is not allowed."); }`<br>`if (options?.op === "delete") { throw new ToolError("Plan mode: deleting files is not allowed."); }`<br>`if (await targetsLocalSandbox(session, targetPath, options?.signal)) return;`  ← `:143`<br>`throw new ToolError("Plan mode: the working tree is read-only. Write your plan to a local://<slug>-plan.md file instead.");` | tra `writePolicy` của mode active từ registry → `checkWritePolicy` → ném **đúng ba chuỗi `ToolError` ở trên** theo kind. Thân hàm giữ nguyên; chỉ thay nguồn quyết định allow/deny. |
| `src/tools/write.ts` | 4 call site `enforcePlanModeWrite` | `:778` `await enforcePlanModeWrite(this.session, path, { op: "update", signal });`<br>`:814` `await enforcePlanModeWrite(this.session, resolvedArchivePath.archivePath, {`<br>&nbsp;&nbsp;&nbsp;&nbsp;`op: resolvedArchivePath.exists ? "update" : "create",`  ← **không phải** `{ op: "update" }` phẳng<br>`:842` `await enforcePlanModeWrite(this.session, resolvedSqlitePath.sqlitePath, { op: "update", signal });`<br>`:859` `await enforcePlanModeWrite(this.session, path, { op: "create", signal });` | chữ ký lời gọi **không đổi**; bên trong `enforcePlanModeWrite` thôi là tra registry. Xem cảm bẫy #3. |
| `src/modes/types.ts` | `InteractiveModeContext` (`:108`) | `:189` `planModeEnabled: boolean;` … `:194` `loopModePaused: boolean;` — 6 dòng | **giữ nguyên tên và kiểu** (nó là `interface`, các dòng này phải y nguyên sau bước 4). `:195-198` (`loopPrompt` / `loopLimit` / `loopCondition` / `planModePlanFilePath`) không đụng tới. |
| `src/modes/interactive-mode.ts` | 7 field class (`:908`–`:915`) | `:908` `planModeEnabled = false;`<br>`:909` `planModePaused = false;`<br>`:910` `goalModeEnabled = false;`<br>`:911` `goalModePaused = false;`<br>`:912` `vibeModeEnabled = false;`<br>`:913` `planModePlanFilePath: string \| undefined = undefined;`  ← **không phải boolean**<br>`:914` `loopModeEnabled = false;`<br>`:915` `loopModePaused = false;` | 7 cặp `get`/`set` (14 dòng) trỏ registry. **`:913` phải giữ nguyên là field thô** — nó không thuộc seam boolean. |
| `src/modes/interactive-mode.ts` | `#updatePlanModeStatus` (`:3762`–`:3772`) | `const status = this.planModeEnabled \|\| this.planModePaused ? { enabled: this.planModeEnabled, paused: this.planModePaused } : undefined;`<br>`this.statusLine.setPlanModeStatus(status);`  ← `:3770` | giữ nguyên; **thêm** một đường `setResolvedModeStatus(...)` cạnh đó. |
| `src/session/agent-session.ts` | 4 accessor (thực tế `:6269`, `:6274`, `:6292`, `:6300`) | `getPlanModeState(): PlanModeState \| undefined { return this.#planModeState; }`<br>`getPrewalkState(): Prewalk \| undefined { return this.#prewalk.state; }`<br>`getGoalModeState(): GoalModeState \| undefined { return this.#goalModeState; }`<br>`getVibeModeState(): VibeModeState \| undefined { return this.#vibeModeState; }` | giữ **nguyên tên** và **nguyên kiểu trả về** (kể cả `Prewalk \| undefined`, không phải boolean); thân hàm đọc qua registry, vẫn trả `undefined` khi inactive. |
| `src/extensibility/extensions/types.ts` | `ExtensionAPI` (thực tế `:1277`–`:1607`) | `:1372` `registerTool<TParams extends TSchema = TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, TDetails>): void;`<br>`:1436` `registerCommand(`<br>`:1455` `registerFlag(`<br>`:1526` `setActiveTools(toolNames: string[]): Promise<void>;` | thêm một dòng cùng khuôn: `registerMode(definition: ModeDefinition): void;` ngay cạnh `registerTool`. **Không** thêm bí danh `ui`. |
| `src/extensibility/extensions/loader.ts` | bind `registerMode` | `:40` `import { resolvePath, withHostGuard } from "../utils";`<br>`:668` `export async function discoverAndLoadExtensions(configuredPaths: string[], cwd: string, eventBus?: EventBus, disabledExtensionIds?: string[], options: DiscoverExtensionPathOptions = {}): Promise<LoadExtensionsResult>` | bind `registerMode` trên object `pi`; ghi source id chủ sở hữu qua seam provenance mà `:40` đã mở, để unload gỡ đúng mode của extension đó. |
| `packages/tui/src/status-line/types.ts` | `SegmentContext` (`:75`) | `:96` `planMode: {` · `:100` `prewalk: {` · `:103` `loopMode: {` · `:109` `goalMode: {` · `:113` `vibeMode: {` | **thêm MỘT** field `resolvedMode: ResolvedMode \| null` đứng cạnh năm field trên. |
| `packages/tui/src/status-line/component.ts` | `#buildSegmentContext` (`:2108`, field mode ở `:2185`–`:2193`) và các setter (`:855`–`:897`) | `planMode: this.#planModeStatus,`<br>`loopMode: this.#loopModeStatus,`<br>`prewalk: typeof this.session.getPrewalkState === "function" && this.session.getPrewalkState() ? { enabled: true } : null,`<br>`goalMode: this.#goalModeStatus,`<br>`vibeMode: this.#vibeModeStatus,` | **file này KHÔNG có trong bảng "File cần chạm tới" của plan nhưng bắt buộc phải sửa** — xem cảm bẫy #1. Thêm `#resolvedModeStatus`, một setter `setResolvedModeStatus(...)` theo đúng khuôn `setPlanModeStatus` (`:855`), và một dòng trong `#buildSegmentContext`. |
| `packages/tui/src/status-line/segments.ts` | `modeSegment` (`:364`) | `id: "mode",` (`:365`)<br>`const plan = ctx.planMode;` (`:369`) … `const loop = ctx.loopMode;` (`:396`) … `return { content: "", visible: false };` (`:409`) | đọc `ctx.resolvedMode` **trước**, rồi rơi tiếp xuống chuỗi 5 nhánh cũ `:369`–`:407` **không đổi**. |
| `packages/tui/src/status-line/schema.ts` | `STATUS_LINE_SEGMENT_IDS` (`:2`–`:30`) | 27 phần tử, `"mode"` là phần tử thứ 4 | **không sửa** — cố ý giữ nguyên đóng. |
| `src/modes/status-line-host.ts` | `statusLineHost` (3.2 KB) | `export const statusLineHost: StatusLineHost<StatusLineHostSession> = { getSettings: () => ({...}), gitEnabled: () => cfgGitEnabled.get(settings), ... }` | plan nói sửa file này để "luồn" mode vào segment. **Thực tế file này chỉ dựng policy `StatusLineHost`, KHÔNG dựng `SegmentContext`.** Xem cảm bẫy #1. |
| `examples/extensions/plan-mode.ts` | ví dụ 549 dòng / 15.153 byte | `:216` `pi.registerFlag("plan", {`<br>`:255` `await pi.setActiveTools(PLAN_MODE_TOOLS);`<br>`:301` `pi.on("tool_call", async event => {` | xoá file; thay bằng ~50 dòng gọi `registerMode`. |
| `test/plan-mode/write-policy.test.ts` | *(chưa có)* | thư mục `test/plan-mode/` có đúng 5 file: `approved-plan` · `model-transition` · `plan-handoff` · `plan-protection` · `reentry-prompt` | file mới — xem mục 4. |
| `test/modes/mode-registry.test.ts` | *(chưa có)* | thư mục tồn tại | file mới. |
| `packages/tui/test/status-line-extension-mode.test.ts` | *(chưa có)* | `packages/tui/test/` có đúng 8 file `status-line-*.test.ts` | file mới. |
| `test/fixtures/outsider-extension/{index.ts,package.json}` | *(chưa có)* | `ls` → No such file or directory | file mới. |
| `test/extension-outsider-install.test.ts` | *(chưa có)* | `ls` → No such file or directory | file mới, theo kỷ luật cô lập của `test/plugin-extensions-discovery.test.ts` (26 KB, có mặt). |

---

## 3. Các bước (mỗi bước có neo đã kiểm)

### Bước 0 — Quyết định seam M2-OQ3, TRƯỚC KHI VIẾT CODE

Bốn ràng buộc, đã đối chiếu lại với HEAD:

1. Union `STATUS_LINE_SEGMENT_IDS` ở `packages/tui/src/status-line/schema.ts:2-30` vẫn đúng **27 phần tử** (đếm bằng `awk 'NR>=2 && NR<=30' … | grep -c '"'` → `27`). ✓
2. Mode đã đăng ký render **bên trong** segment `mode` sẵn có: `const modeSegment: StatusLineSegment = {` ở `segments.ts:364`, `id: "mode",` ở `:365`. ✓
3. Chuỗi ưu tiên 5 nhánh ở `segments.ts:369-407` — nhánh plan `:369`, prewalk `:379`, goal `:385`, vibe `:390`, loop `:396-407` — **giữ nguyên cả nội dung lẫn thứ tự**, và thứ tự đến từ registry. ✓
4. `ModeDefinition.statusLine` bắt buộc, không bao giờ optional. ✓

**Mâu thuẫn còn nguyên trong plan, phải chốt trước khi code:** bước 0 ghi *"DO THIS BEFORE ANY CODE"* / *"Everything in steps 3+ is gated on this"*, nhưng mục "Cần người quyết" lại ghi *"Cần trước bước 6, không cần trước bước 0"*, và bước 6 lại nói *"the step-0 decision"*. **Chốt rõ: quyết định chặn bước 3 hay chỉ chặn bước 6.** Bước 3 (lõi registry) làm được mà không cần seam status-line, nên khuyến nghị: chặn bước 6, không chặn bước 3.

Phương án 3 của §7.4 ("mode segment reads id from ModeRegistry") là phương án duy nhất thoả cả bốn. Nhưng plan nói đúng: nó không phủ trường hợp một mode muốn có segment **nằm ngoài** `mode`.

### Bước 1 — `test/plan-mode/write-policy.test.ts`, viết ở BƯỚC 3, không phải bước 2

Cấm viết ở commit bước 2: file này đi qua policy của registry, mà registry chưa tồn tại.

Lý do chốt được là lý do trùng: bất đẳng thức `local://` **đã** được phủ cho plan mode tích hợp sẵn. `packages/coding-agent/test/tools/plan-mode-guard-local.test.ts` chạy xanh ngay bây giờ (`bun test` → **15 pass / 0 fail**), và ở trong nó:

- `describe("enforcePlanModeWrite (working tree read-only, local:// sandbox writable)")` ở `:83`
- `it("accepts writes to any local:// file")` — `local://auth-refactor-plan.md` `{ op: "create" }` và `local://scratch/notes.md` `{ op: "update" }` đều `resolves.toBeUndefined()`
- `it("rejects writes to the working tree")` — `src/foo.ts` và `PLAN.md` → `/working tree is read-only/`
- `it("rejects deletes and renames outright")` — `local://some-plan.md` `{ op: "delete" }` → `/deleting files is not allowed/`; `{ move: … }` → `/renaming files is not allowed/`
- `it("is a no-op when plan mode is disabled")` ở `:116-120`

Stub session nằm ở `:33`: `getPlanModeState: () => overrides.planMode,`.

> **Đính chính nhỏ của plan:** file này có **sáu** nhóm khẳng định trong ba `it` đầu (2 sandbox + 2 working-tree + delete + move), không phải "năm khẳng định". Khoảng dòng thật của chúng là **`:86`–`:114`**, không phải `:90-127`. Ba regex plan trích — `/working tree is read-only/`, `/deleting files is not allowed/`, `/renaming files is not allowed/` — cả ba đều **đúng** như đã viết.

### Bước 2 — Rút chính sách ghi thành dữ liệu, commit RIÊNG, không đụng registry

Tạo `packages/coding-agent/src/plan-mode/write-policy.ts` (thư mục `src/plan-mode/` đã có đúng 8 file: `approved-plan`, `model-transition`, `plan-autosave`, `plan-files`, `plan-handoff`, `plan-protection`, `settings`, `state` — chỗ đúng ở nhà).

Biến `enforcePlanModeWrite` (`plan-mode-guard.ts:127-148`) thành adapter mỏng. **Bằng chứng của commit này, không phải commit mới:** `packages/coding-agent/test/tools/plan-mode-guard-local.test.ts` phải xanh **và không một dòng nào bị sửa** — file đó đi thẳng vào `enforcePlanModeWrite` qua stub `getPlanModeState` ở `:33`, không cần registry, nên nó là integration test của đúng đoạn code bước 2 sửa.

Ba chuỗi `ToolError` là **text của core**, không bao giờ để extension tiêm vào. `WritePolicy` chỉ là cờ allow/deny.

### Bước 3 — `ModeRegistry` + `ModeDefinition`

File mới `packages/coding-agent/src/modes/mode-registry.ts` (thư mục `src/modes/` đã có `status-line-host.ts` 3.2 KB, `settings.ts`, `types.ts` — chỗ đúng ở nhà).

`git grep -n "modeRegistry\|ModeRegistry" -- packages/` → **rỗng**. Registry chưa tồn tại ở bất kỳ đâu; đây là điểm khởi đầu sạch.

`register()` ném `Error` nêu đích danh id khi trùng. `#sortedIds()` cache theo `#dirty`. Không `any`, không `ReturnType<>`, chỉ `#private`, chỉ import top-level, star re-export từ `modes/index.ts`.

> **Khoảng trống chưa ai nêu trong plan:** `ModeDefinition.settingsDomain` được mô tả là *"`all-settings.ts` DOMAINS id"*, nhưng `const DOMAINS` ở `packages/coding-agent/src/config/all-settings.ts:44` **không được export** — file đó chỉ export `orderedSettings()` ở `:90`. Kiểu `readonly settingsDomain: string` sẽ compile nhưng **không ràng buộc gì cả**. Chọn một trong hai: export một union type `SettingsDomainId` từ `all-settings.ts`, hoặc ghi rõ trong đặc tả rằng nó là `string` tự do và không có kiểm kiểu.

### Bước 4 — 5 field mode thật thành cặp accessor; 2 field của loop giữ nguyên (TÁCH khỏi bước 3)

> **ĐÍNH CHÍNH — đo lại 2026-10-02. Bản gốc của bước này nói "7 field" và SAI.**
> Số dòng `:908-915` cũng đã thối; khai báo thật hôm nay ở `interactive-mode.ts:1101-1108`.

Đã kiểm: `grep -cE "^\t(planModeEnabled|planModePaused|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused) = "` → **7** hôm nay. `grep -cE "^\t(get|set) (…)"` → **0** hôm nay.

Getter trần **không đủ**. `git grep -nE '\.(…) = ' -- packages/coding-agent/src` → **32 dòng**, và `git grep -l` trên cùng pattern → **đúng một file**: `interactive-mode.ts`. Chia theo field: `planModeEnabled` 4, `planModePaused` 5, `vibeModeEnabled` 3, `goalModeEnabled` 7, `goalModePaused` 7, `loopModeEnabled` 2, `loopModePaused` 4 (tổng 32 ✓). **Số đếm này vẫn đúng ngày hôm nay.**

**`planModePlanFilePath` không phải boolean** — nằm xen giữa 7 field. Giữ là field thô. 7 field boolean thật ở `:1101, 1102, 1103, 1104, 1105, 1107, 1108`.

`planModePaused` là chốt chặn thật: `grep -n 'this.planModePaused' interactive-mode.ts` → **17 chỗ** hôm nay (plan ghi 16), và `#updatePlanModeStatus` (**`:4238`**, plan ghi `:3762`) đẩy nó thẳng vào status line dưới tên `paused` qua `this.statusLine.setPlanModeStatus(status)` ở `:4246`.

#### Vì sao "7 field" là sai — bằng chứng

`setActiveToolsByName` được gọi ở `interactive-mode.ts:4539, 4624, 4718, 4918, 4938, 5929` — **toàn bộ thuộc plan/goal/vibe, không chỗ nào thuộc loop**.

Ràng buộc loại trừ lẫn nhau, đo bằng cặp phạm vi:

- `#enterGoalMode` (`:4898-4906`): `if (goalModeEnabled) return;` → `if (planModeEnabled || planModePaused) { warn; return; }` → `if (vibeModeEnabled) { warn; return; }`. **plan ⟂ goal ⟂ vibe.**
- `git grep -nE 'loopModeEnabled' -- interactive-mode.ts | awk -F: '$1>=4640 && $1<=4990'` → **rỗng**: không chỗ vào plan/goal/vibe nào nhìn loop.
- `git grep -nE 'planModeEnabled' -- interactive-mode.ts | awk -F: '$1>=2900 && $1<=2990'` → **rỗng**: loop không nhìn plan.

⇒ **loop và plan/goal/vibe có thể cùng bật.** `ModeRegistry` có **một** `#activeId`, nên map `loopModeEnabled` → `setActivation("loop")` sẽ **đẩy plan ra khỏi registry** ⇒ `writePolicy()` trả `undefined` ⇒ **mất read-only của plan mode khi người dùng vẫn đang ở plan mode**. Đó là hỏng hiện ra màn hình.

| | đổi tool set | chip status-line | nhìn mode khác |
| --- | --- | --- | --- |
| plan | có (`:4718`) | có | có |
| goal | có (`:4918`) | có | có |
| vibe | có (`:5774`) | có | có |
| **loop** | **không** | có (`:2908`) | **không** |

*(Cả bốn đều có chip: setter nằm ở `packages/tui/src/status-line/component.ts`, KHÔNG phải `segments.ts`.)*

#### Việc bước 4 làm

> **THỨ TỰ — bước này KHÔNG chạy được trước khi đăng ký mode.** Đo hôm nay: `grep -rn 'modeRegistry\.' -- packages/coding-agent/src` → **không có call site nào**; `register()` chưa có ai gọi. Chạy control:
> ```bun
> const r = new ModeRegistry(); r.setActivation("plan");
> // → THROWS: Cannot activate unregistered mode "plan"
> ```
> Nghĩa là accessor của bước 4 sẽ **ném exception ở mọi lần bật/tắt mode**. Phải **đảo thứ tự**: đăng ký 5 mode tích hợp (nay là bước 7) **trước**, rồi mới chuyển field.

- **5 field → accessor**: `planModeEnabled`, `planModePaused`, `goalModeEnabled`, `goalModePaused`, `vibeModeEnabled`.
- **`loopModeEnabled` / `loopModePaused` giữ là field thô**, kèm comment nói vì sao (loop không đổi tool set, không `enter`/`exit`, không hỏi ai — nó chỉ render giống mode).

Cảnh báo "bỏ field thứ bảy thì chip `Plan ⏸` ngừng cập nhật" nói về *xoá* field. Bước này **không xoá** field nào: `*Paused` vẫn là field thô và vẫn được `#updatePlanModeStatus` đẩy vào `setPlanModeStatus` y hệt hôm nay.

**Còn mở, cần a4 trả lời:** nếu một extension đăng ký mode rồi cần **cùng tồn tại** với plan mode, registry phải thành multi-active (`Set`) và `order` đã viết sẵn để phá hòa cho chip. Chưa có bằng chứng nào trong repo rằng ai cần điều đó.

### Bước 5 — 4 accessor `AgentSession` lên registry

**Số dòng trong plan đã cũ.** Thực tế:

| accessor | plan (kể cả sau "Đính chính") | thực tế | lệch |
| --- | --- | --- | --- |
| `getPlanModeState` | `:6132` | **`:6269`** | +137 |
| `getPrewalkState` | `:6137` | **`:6274`** | +137 |
| `getGoalModeState` | `:6155` | **`:6292`** | +137 |
| `getVibeModeState` | `:6163` | **`:6300`** | +137 |
| `codeModeNamespacesInfo` | `:5852` | **`:5980`** | +128 |
| `#codeModeState` | `:1395` | **`:1416`** | +21 |

Bằng chứng: `grep -n 'getPlanModeState\|getPrewalkState\|getGoalModeState\|getVibeModeState\|codeModeNamespacesInfo\|#codeModeState' packages/coding-agent/src/session/agent-session.ts` → `1387, 1416, 1425, 1495, 1814, 5980, 5981, 6269, 6274, 6292, 6300`.

Giữ nguyên tên, nguyên kiểu trả về, và `undefined` khi inactive. `getPrewalkState` trả **`Prewalk | undefined`**, không phải boolean — một getter boolean dẫn xuất không thay thế được nó.

Rồi chạy lại seam-2 (mục 5) — hôm nay nó báo đúng **51 dòng trên 21 file**.

### Bước 6 — Cài seam M2-OQ3

Thêm **MỘT** field `resolvedMode` vào `SegmentContext` (`packages/tui/src/status-line/types.ts:75`), đứng cạnh năm field `:96/:100/:103/:109/:113`.

Sau đó bắt buộc phải sửa **`packages/tui/src/status-line/component.ts`** (không có trong bảng file của plan):

- `#buildSegmentContext` (`:2108`) gom context lúc `:2185-2193` — thêm một dòng `resolvedMode: this.#resolvedModeStatus,`
- thêm `#resolvedModeStatus` cạnh `#planModeStatus` (`:531`)
- thêm setter theo đúng khuôn `setPlanModeStatus` (`:855-866`): nhận `… | undefined`, so sánh bằng giá trị, gán, rồi `this.#invalidateStatusLineRenderCache()`. Bốn setter khuôn đã có: `setPlanModeStatus` `:855`, `setLoopModeStatus` `:867`, `setGoalModeStatus` `:881`, `setVibeModeStatus` `:893`; state field tương ứng ở `:531-534`

Rồi `src/modes/interactive-mode.ts` gọi setter mới từ `#updatePlanModeStatus` (`:3762`) hoặc một `#updateResolvedModeStatus` riêng.

Trong `modeSegment` (`segments.ts:364`): đọc `ctx.resolvedMode` **trước**, rồi rơi tiếp xuống chuỗi cũ `:369-407` không đổi. `schema.ts` **nguyên đóng**.

Viết `packages/tui/test/status-line-extension-mode.test.ts` trong **chính commit này**.

### Bước 7 — Nạp registry bằng cách BỌC

> **Bước này phải chạy TRƯỚC bước 4** (xem mục "THỨ TỰ" ở bước 4). Không có nó thì mọi accessor của bước 4 ném `Cannot activate unregistered mode`.
>
> **Không đăng ký `loop`** — bản gốc của bước này có loop trong danh sách, sai theo đo ở bước 4: loop không đổi tool set, không `enter`/`exit`, và không loại trừ lẫn nhau với plan/goal/vibe.

Đăng ký plan trước, rồi goal, vibe, prewalk. Mỗi definition bọc ủy quyền `enter`/`exit` cho method `InteractiveMode` sẵn có — code gốc đứng nguyên tại chỗ. Chạy lại seam-1 sau **mỗi** mode.

> `order` của các mode tích hợp phải lấy từ output của WI-2. Nếu WI-2 chỉ hạ một thứ tự kiểu chẩn đoán mà không có danh sách chuẩn thì bước 7 không có gì để gán, và ưu tiên trên status-line trở thành nguồn sự thật thứ hai cạnh tranh với `segments.ts:369-407`.

### Bước 8 — `test/modes/mode-registry.test.ts`

Với **từng** mode trong năm mode: tập tool sau `enter` giống bản trước migrate, giá trị `mode` báo ngược lại cho extension giống bản trước, kết quả resolve settings-domain giống bản trước. Khẳng định trạng thái session quan sát được — **không bao giờ** khẳng định "registry đã được gọi".

### Bước 9 — `registerMode` trên `ExtensionAPI`

**Số dòng trong plan đã cũ.** `ExtensionAPI` thật là `:1277-1607` (plan: `:1256-1582`).

| thành viên | plan | thực tế | lệch |
| --- | --- | --- | --- |
| `registerTool` | `:1347` | **`:1372`** | +25 |
| `registerCommand` | `:1411` | **`:1436`** | +25 |
| `registerFlag` | `:1430` | **`:1455`** | +25 |
| `setActiveTools` | `:1501` | **`:1526`** | +25 |
| comment `ctx.ui` | `:1376` | **`:1401`** | +25 |

Claim "`ExtensionAPI` không có member `ui`" là **đúng**: `awk 'NR>=1277 && NR<=1607' … | grep -E '^\t(readonly )?ui\b'` → rỗng. Lần xuất hiện duy nhất của `ctx.ui` trong vùng đó là một comment ở `:1401`. `ui` thật sự nằm trên `ExtensionContext` (`:454`, member `ui: ExtensionUIContext;` ở `:456`) — khác object. Thêm `ui` vào `ExtensionAPI` sẽ thành public member thứ 30.

Bind trong loader, ghi source id chủ sở hữu. Đường provenance đã có sẵn: `loader.ts:40` `import { resolvePath, withHostGuard } from "../utils";` ✓

### Bước 10 — Xoá `examples/extensions/plan-mode.ts`

549 dòng / 15.153 byte ✓. Các neo `:216` / `:255` / `:301` đều rơi đúng chỗ. Thay bằng ~50 dòng gọi `registerMode` trong **cùng một commit**.

Đây là **ĐIỀU KIỆN TIÊN QUYẾT chứng tỏ API dùng được, KHÔNG phải cổng nghiệm thu** — xoá một ví dụ nằm trong repo không chứng minh gì về extension từ bên ngoài.

### Bước 11 — Fixture "outsider" + test cài đặt

Tạo `test/fixtures/outsider-extension/{package.json,index.ts}` (cả hai đều chưa tồn tại ✓) và `test/extension-outsider-install.test.ts` (chưa tồn tại ✓).

`package.json` khai báo `omp.extensions` trỏ tới `index.ts`. Không path hardcode, không danh sách tên trong loader nào.

`index.ts` đăng ký: một tool, một slash command, một hook `session_start`, `ctx.ui.setWidget` (**không** phải `pi.ui.setWidget` — cái đó không compile), và `pi.registerMode` kèm `writePolicy`. **Không** có dòng `registerSetting` nào.

Test dựng fixture ở `<TempDir>/.omp/extensions/outsider-extension/` rồi gọi `discoverAndLoadExtensions([], tempProjectDir)` — **không bao giờ** truyền path vào `configuredPaths`, vì làm vậy là vòng qua bước discovery. Lặp lại ở phạm vi user qua `setAgentDir` + `getAgentDir()`.

> `setAgentDir` không nằm trong coding-agent: nó export từ `@oh-my-pi/pi-utils` (`packages/utils/src/dirs.ts:512`). Cùng module đó có `TempDir` và `__resetDirsFromEnvForTests` — mẫu import sẵn có: `import { __resetDirsFromEnvForTests, getProjectAgentDir, setAgentDir, TempDir } from "@oh-my-pi/pi-utils";`

Sao chép kỷ luật cô lập của `test/plugin-extensions-discovery.test.ts` (26 KB, có mặt ✓): `spyOn(os, "homedir")` trỏ về temp home, xoá `XDG_*`, `setAgentDir` trong `afterEach`, `vi.restoreAllMocks()`.

Khẳng định nó **CHẠY**, không phải nó được tìm thấy: `result.errors` rỗng, tool có trong bảng tool, command có trong registry, hook bắn, widget có trong frame, mode có trong registry **kèm** status-line segment của nó.

---

## 4. Hợp đồng test

Bốn hợp đồng. Mỗi cái tên một thất bại quan sát được.

**1. BẤT ĐẰNG THỨC WRITE-POLICY** — `packages/coding-agent/test/plan-mode/write-policy.test.ts`
Một mode có chính sách chặn ghi vào cây làm việc từ chối một lần ghi `src/foo.ts` **và** chính mode đó chấp nhận một lần ghi `local://slug-plan.md`. Thiếu một nửa là test vẫn xanh trên implementation vốn chặn luôn sandbox.
Dẫn qua **policy do registry cấp**, không qua plan mode tích hợp sẵn — phần phủ sẵn đã nằm ở `test/tools/plan-mode-guard-local.test.ts:86-114` và lặp lại là trùng bị cấm.
*Hồi quy:* một refactor nâng phép kiểm sandbox lên trên nhánh working-tree sẽ lặng lẽ chặn mất không gian gạch duy nhất còn lại trong lúc plan mode bật; người dùng mất chỗ soạn kế hoạch, không có gì trên UI giải thích. Chiều ngược lại: coding-agent sửa cây làm việc mà người dùng tin là chỉ-đọc — hỏng dữ liệu âm thầm duy nhất của M2.

**2. TƯƠNG ĐƯƠNG REGISTRY** — `packages/coding-agent/test/modes/mode-registry.test.ts`
Với từng mode trong năm: tập tool sau `enter`, giá trị `mode` báo ngược lại cho extension, kết quả resolve settings-domain — giống bản build trước migrate.
*Hồi quy:* một mode lên registry nhưng vào với tập tool khác → một tính năng biến mất lặng lẽ khỏi tầm nhìn của mô hình.

**3. NHÌN THẤY MODE SEGMENT** — `packages/tui/test/status-line-extension-mode.test.ts`
Một mode do extension đăng ký phải render ra một chip trên status-line.
*Hồi quy:* một mode không có chỉ báo bị người dùng đọc là lỗi, vì segment `mode` đã tồn tại ở `segments.ts:364` và họ sẽ mong mode mới xuất hiện ở đó. Đây là thứ duy nhất ngăn mặc định "mode mới không có chỉ báo" ship lặng lẽ.

**4. CÀI ĐẶT TỪ BÊN NGOÀI** — `packages/coding-agent/test/extension-outsider-install.test.ts`
Extension thật viết ngoài repo, nạp qua đường cài đặt thật, đăng ký mode có `writePolicy`, và mode đó xuất hiện trong registry **kèm** status-line segment, đồng thời extension chạy được (errors rỗng, tool trong bảng tool, command trong registry, hook bắn, widget trong frame).
*Hồi quy:* `registerMode` tồn tại nhưng không với tới được bởi bất kỳ thứ gì không nằm trong repo — đúng cái xanh giả mà xoá ví dụ trong repo không loại trừ.

**Lưu ý về chất lượng test (AGENTS.md):** không được viết test source-grep. Cổng grep ở mục 5 là **cổng shell**, không phải test. Không assert `"registry đã được gọi"`; assert trạng thái session quan sát được. Đừng viết `// @ts-expect-error` để giữ một chân sống trong fixture.

---

## 5. Cổng

### 5.1 Cổng từng mục (tách riêng, KHÔNG xâu bằng `&&`)

```bash
(cd packages/coding-agent && bun test test/plan-mode/write-policy.test.ts test/modes/mode-registry.test.ts) ; \
(cd packages/tui && bun test test/status-line-extension-mode.test.ts)
bun run check:ts
```

Cố ý không xâu `check:ts` vào test: `check:ts` đứng trước `&&` sẽ chặn không cho hai chân test chạy tới mỗi khi nó đỏ, kể cả vì lý do không liên quan tới WI-7.

### 5.2 Cổng nghiệm thu wave 5 (tách riêng, KHÔNG kèm `check:ts`)

```bash
cd packages/coding-agent && bun test test/extension-outsider-install.test.ts
```

Lý do tách: `packages/coding-agent/tsconfig.json` có `"include": ["src", "test", "scripts"]` (đã kiểm, dòng `:3-7`) — fixture **có** được typecheck, nên một dòng `pi.registerSetting` làm `check:ts` đỏ và dấu `&&` sẽ chặn không cho test chạy tới.

### 5.3 Cổng seam — chạy lại sau MỌI commit ở bước 4-7

Đã chạy trên HEAD, đây là số đo **nền**:

```bash
grep -n "planModeEnabled\|vibeModeEnabled\|goalModeEnabled\|goalModePaused\|loopModeEnabled\|loopModePaused" packages/coding-agent/src/modes/types.ts
# → 189,190,191,192,193,194  (đúng 6 dòng, phải giữ nguyên sau bước 4)

grep -cE "^\t(planModeEnabled|planModePaused|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused) = " packages/coding-agent/src/modes/interactive-mode.ts
# → 7 hôm nay; 0 sau bước 4

grep -cE "^\t(get|set) (planModeEnabled|planModePaused|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused)" packages/coding-agent/src/modes/interactive-mode.ts
# → 0 hôm nay; 14 sau bước 4

git grep -n "getPlanModeState\|getGoalModeState\|getVibeModeState\|getPrewalkState" -- packages/coding-agent/src | grep -v gallery-fixtures | wc -l
# → 51 hôm nay; phải giữ 51 sau từng commit bước 4-7
```

Tôi đã chạy lệnh cuối ở dạng đầy đủ có `| cut -d: -f1 | sort -u | wc -l` → **21 file**. 51 dòng / 21 file khớp tuyệt đối với plan. 13/51 dòng nằm trong `interactive-mode.ts`, 6/51 trong `agent-session.ts`, 4/51 trong `tools/index.ts`.

Lệnh grep đầu **một mình không phân biệt được** "đã làm accessor" với "chưa làm gì": `InteractiveModeContext` là `interface` (`modes/types.ts:108`), nên các dòng `planModeEnabled: boolean;` phải y nguyên sau bước 4 — grep đó chỉ đỏ nếu ai đó **đổi tên** field, điều bước 4 cấm. Hai lệnh `grep -c` mới là phần có tín hiệu thật.

### 5.4 `check:ts` có ĐỎ ĐƯỢC không?

**Có — nhưng hiện nó đang đỏ VÌ LÝ DO NGOÀI WI-7, và câu trả lời thẳng cho môi trường này khác với plan.**

Tôi vừa chạy `bun run check:ts` (exit ≠ 0):

```
$ oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' ...
Checking formatting...
packages/tui/src/tools/index.ts (0ms)
packages/tui/test/probe-frozen.test.ts (0ms)
Format issues found in above 2 files. Run without `--check` to fix.
error: script "check:tools" exited with code 1
error: script "check:ts" exited with code 1
```

Cả hai file là sửa đổi **chưa commit** ngoài phạm vi WI-7. `git status --porcelain` (lọc `.lavish-wip/`) cho thấy 7 file `MILESTONE_*_PLAN.md` sửa, `packages/tui/src/tools/index.ts` sửa, và 4 file untracked mới.

> **ĐÍNH CHÍNH môi trường của plan.** Plan ghi *"`bun run check:ts` PASS (exit 0): cây làm việc hiện SẠNH … nên cổng này XANH và đi hết tới `check:types`"*. **Sai tại thời điểm kiểm chứng này**: cây không sạch và cổng đang đỏ ở `check:tools`, chưa tới `check:types`. Đừng quy kết quả đỏ này cho công việc WI-7, và cũng đừng tin tuyên bố "xanh" của plan.

**Addon native:** plan cảnh báo `bun test` cần addon. Trên máy này addon **đã build** — `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại, và `bun test test/tools/plan-mode-guard-local.test.ts` cho **15 pass / 0 fail** ngay bây giờ. Cảnh báo "build một lần bằng `brew install ninja`" **không áp dụng** ở đây.

### 5.5 Cổng hoàn thành — có thực sự đỏ được không?

| # | điều kiện | đỏ được? | bằng cách nào |
| --- | --- | --- | --- |
| 1 | `bun run check:ts` exit 0 | **Có, có tín hiệu thật — nhưng phải cô lập nhiễu** | Đỏ ngay nếu typecheck hỏng. **Điều kiện tiên quyết bắt buộc:** cây phải sạch, hoặc chạy `bunx oxfmt packages/tui/src/tools/index.ts packages/tui/test/probe-frozen.test.ts` một lần cho hết 2 file nhiễu, hoặc chấp nhận đọc `check:tools` tách khỏi `check:types` (`bun run --filter ./packages/coding-agent check:types`). Không có bước này thì cổng luôn đỏ và mất hết giá trị. |
| 2 | seam-2 = 51 dòng / 21 file, không sửa tay | **Có, tuyệt đối** | Lệnh thật, tôi đã đo nền 51/21. Đỏ nếu bất kỳ call site nào bị sửa tay. |
| 2b | initializer 7→0, accessor 0→14 | **Có, tuyệt đối** | Hai lệnh `grep -c` thật; tôi đã đo nền 7 và 0. |
| 2c | 6 tên boolean còn nguyên ở `types.ts:189-194` | **Có, nhưng yếu** | Chỉ đỏ khi đổi tên. Giữ như anti-regression, không dựa vào nó làm tín hiệu chính. |
| 3 | outsider fixture chạy, có mode + status-line segment, `result.errors` rỗng | **Có, mạnh** | `cd packages/coding-agent && bun test test/extension-outsider-install.test.ts`. Đỏ nếu `registerMode` không tới được registry, nếu segment không render, nếu extension lỗi. Chạy được ngay (addon đã build). |
| 4 | `examples/extensions/plan-mode.ts` không còn tồn tại | **Có, tuyệt đối** | `test ! -e packages/coding-agent/examples/extensions/plan-mode.ts`. |

**Kết luận cổng:** cổng này **đỏ được thật** ở cả bốn điều kiện — tốt hơn nhiều so với phần lớn cổng trong kế hoạch này. Nhưng **điều kiện 1 phải được cô lập nhiễu môi trường trước**, nếu không nó là một cổng luôn đỏ, tức là xanh giả theo kiểu khác: người giao việc sẽ quen mắt bỏ qua nó.

**Cổng cố ý KHÔNG có, và đó là điểm cần nói thẳng:** không có gì đỏ nếu `statusLine` bị đặt `optional` trong `ModeDefinition` — kiểu `readonly statusLine?: ModeStatusLine` vẫn compile, vẫn chạy, và chỉ chết ở test 3. Vì vậy **bắt buộc** thêm một assertion tĩnh: `ModeDefinition` khai báo `readonly statusLine: ModeStatusLine;` (không `?`) — đây là điều kiện tiên quyết ghi vào review checklist, vì đó là mặt định "mode không có chỉ báo" mà cả bốn cổng hiện tại đều không bắt được.

---

## 6. Cạm bẫy riêng của work item này

**#1 — Bảng "File cần chạm tới" hướng sai chỗ luồn segment.**
Plan ghi `packages/coding-agent/src/modes/status-line-host.ts` là nơi "đưa mode đã resolve của registry vào status-line host để segment thấy nó". Tôi đã đọc cả file: nó **chỉ** dựng `export const statusLineHost: StatusLineHost<StatusLineHostSession> = { getSettings, gitEnabled, codexResetFireworksEnabled, … }` — một object **policy**, không có `SegmentContext` nào ở đó. `SegmentContext` thật sự được dựng trong `packages/tui/src/status-line/component.ts` tại `#buildSegmentContext` (`:2108`, field mode ở `:2185-2193`), và mọi trạng thái mode đi vào đó qua một setter riêng (`setPlanModeStatus` `:855`, `setLoopModeStatus` `:867`, `setGoalModeStatus` `:881`, `setVibeModeStatus` `:893`). `component.ts` **không có trong bảng file của plan**. Sửa `status-line-host.ts` rồi tưởng xong sẽ ra một field `resolvedMode` luôn `null` và không gì đỏ.

**#2 — Bảy field, không phải sáu, và `:913` không phải boolean.**
`planModePaused` (`interactive-mode.ts:909`) không có trên `InteractiveModeContext` — `grep -c planModePaused modes/types.ts` → **0** — nhưng nó được đọc ở **16 chỗ** và `#updatePlanModeStatus` (`:3770`) đẩy nó thẳng vào status line. Đổi 6 cái kia sang registry mà để `:909` thô thì chip `Plan ⏸` **ngừng cập nhật im lặng** ngay khoảnh khắc đó. Đồng thời dải `:908-915` mà plan liệt kê xen **`:913` `planModePlanFilePath: string | undefined = undefined;`** — đừng biến nó thành accessor.

**#3 — Bốn call site trong `write.ts` không đồng nhất, và `:814` không phải `{ op: "update" }`.**
`git grep -n enforcePlanModeWrite -- packages/` → đúng 4 site trong `write.ts` (`:778`, `:814`, `:842`, `:859`) cộng định nghĩa ở `plan-mode-guard.ts:127`. Nhưng `:814` truyền **một ternary**:
```ts
await enforcePlanModeWrite(this.session, resolvedArchivePath.archivePath, {
    op: resolvedArchivePath.exists ? "update" : "create",
    signal,
});
```
Plan mô tả nó là site "truyền `{ op: "update" }`". Site này và site `:842` (sqlite) đều là đường ghi với path **không phải file cây làm việc thuần** — phải suy luận riêng từng cái với quy tắc `workingTree`, không giả định chúng tương đương với `:778`.

**#4 — 32 chỗ gán, tất cả trong một file.**
Getter trần **không compile**. `git grep -lE '\.(…) = '` → đúng một file `interactive-mode.ts`, 32 dòng. Bảy cặp accessor, không phải bảy getter. Và đừng làm bước 4 chung với bước 3 — plan tách là có chủ ý, vì bước 3 là commit đầu tiên có `ModeRegistry` chạy được.

**#5 — Đừng lặp lại phần phủ đã có.**
`test/tools/plan-mode-guard-local.test.ts` (243 dòng, 11.010 byte) đã khẳng định đủ: create + update trên `local://` qua; `src/foo.ts` + `PLAN.md` bị từ chối `/working tree is read-only/`; delete `/deleting files is not allowed/`; move `/renaming files is not allowed/`. File mới phải bảo vệ một hợp đồng **khác** — chính sách được đánh giá như **dữ liệu qua một mục registry**, dẫn bởi mode của extension. Nếu không nó là bản trùng mà AGENTS.md cấm.

**#6 — Fixture phải typecheck, và đó là mâu thuẫn cần biết.**
`packages/coding-agent/tsconfig.json` có `"include": ["src", "test", "scripts"]` (`:3-7`). Nên `pi.registerMode` trong fixture sẽ làm `check:types` đỏ **cho tới khi bước 9 xong** — đây là trạng thái bình thường giữa wave, không phải hỏng. Nhưng dòng `pi.registerSetting` thì không được có (đó là việc của WI-8b). Đừng dùng `// @ts-expect-error` để giữ một chân sống — cổng wave 5 và cổng đóng M2 phải là **hai lệnh riêng**, và nên xác nhận điều này với người giữ WI-8b.

**#7 — Rủi ro lớn nhất, không phải lỗi biên dịch: hồi quy lặng lẽ chốt ghi của plan mode.**
Đây là thứ duy nhất ở M2 có thể làm hỏng dữ liệu người dùng: coding-agent sửa một cái cây làm việc mà người dùng tin là chỉ-đọc, và không có UI nào báo. Hai phòng ngừa bắt buộc, đúng thứ tự: (1) hạ việc rút `writePolicy` thành **một commit riêng trước khi migrate bất kỳ mode nào**, giữ nguyên và xanh toàn bộ `plan-mode-guard-local.test.ts` như bằng chứng, để trong cây chỉ còn đúng một implementation đang thực thi; (2) giữ các field trạng thái mode là cặp accessor registry-backed trong **toàn bộ** quá trình migrate, để luôn có đường rollback từng phần. Rủi ro cao thứ hai là ship registry không có câu trả lời nào cho status-line — đó chính là lý do bước 0 tồn tại.

**#8 — `settingsDomain` không có ràng buộc kiểu.**
`const DOMAINS` ở `packages/coding-agent/src/config/all-settings.ts:44` **không được export**; file chỉ export `orderedSettings()` ở `:90`. `readonly settingsDomain: string` sẽ compile nhưng không chặn được id sai. Chọn: export union `SettingsDomainId`, hoặc thừa nhận nó là `string` tự do trong đặc tả.

**#9 — Số dòng trong bảng "Đính chính" của chính plan đã cũ.**
Bốn accessor `AgentSession` lệch **+137 dòng**; sáu neo trong `ExtensionAPI` lệch **+21…+25**; `#updatePlanModeStatus` lệch **+12**. Bảng đó được dán nhãn "đã qua một lượt kiểm chứng độc lập" nhưng số dòng đã trôi thêm một lần nữa. **Đừng copy số dòng từ plan.** Tìm bằng `grep -n '<tên symbol>' <file>` rồi đọc dòng đó.

---

## Phụ lục — 18 neo sai, đã sửa

| # | plan ghi | thực tế | lệch | cách tìm lại |
| --- | --- | --- | --- | --- |
| 1 | `write.ts:814` truyền `{ op: "update" }` | ternary `resolvedArchivePath.exists ? "update" : "create"` | nội dung | `sed -n '810,820p'` |
| 2 | `interactive-mode.ts:908-915` = 7 field boolean | `:913` là `planModePlanFilePath` | nội dung | `sed -n '900,920p'` |
| 3 | `interactive-mode.ts:3750-3753` `#updatePlanModeStatus` | `:3762-3772`, `setPlanModeStatus` ở `:3770` | +12 | `grep -n setPlanModeStatus` |
| 4 | `agent-session.ts:6132` `getPlanModeState` | `:6269` | +137 | `grep -n getPlanModeState` |
| 5 | `agent-session.ts:6137` `getPrewalkState` | `:6274` | +137 | `grep -n getPrewalkState` |
| 6 | `agent-session.ts:6155` `getGoalModeState` | `:6292` | +137 | `grep -n getGoalModeState` |
| 7 | `agent-session.ts:6163` `getVibeModeState` | `:6300` | +137 | `grep -n getVibeModeState` |
| 8 | `agent-session.ts:5852` `codeModeNamespacesInfo` | `:5980` | +128 | `grep -n codeModeNamespacesInfo` |
| 9 | `agent-session.ts:1395` `#codeModeState` | `:1416` | +21 | `grep -n '#codeModeState'` |
| 10 | `extensions/types.ts:1256-1582` `ExtensionAPI` | `:1277-1607` | +21/+25 | `grep -n 'export interface ExtensionAPI'` |
| 11 | `extensions/types.ts:1347` `registerTool` | `:1372` | +25 | `grep -n 'registerTool<TParams'` |
| 12 | `extensions/types.ts:1411` `registerCommand` | `:1436` | +25 | `grep -n 'registerCommand('` |
| 13 | `extensions/types.ts:1430` `registerFlag` | `:1455` | +25 | `grep -n 'registerFlag('` |
| 14 | `extensions/types.ts:1501` `setActiveTools` | `:1526` | +25 | `grep -n 'setActiveTools(toolNames'` |
| 15 | `extensions/types.ts:1376` comment `ctx.ui` | `:1401` | +25 | `grep -n 'ctx\.ui'` |
| 16 | `plan-mode-guard-local.test.ts:90-127`, "năm khẳng định" | `:86-114`, **sáu** nhóm khẳng định | số dòng + đếm | `sed -n '83,120p'` |
| 17 | `status-line-host.ts` là nơi luồn mode vào segment | file này chỉ dựng `StatusLineHost` policy; `SegmentContext` dựng ở `component.ts:2108` | **hướng sai** | `grep -rn "SegmentContext"` |
| 18 | MÔI TRƯỜNG: `check:ts` PASS (exit 0) | **ĐỎ** ở `check:tools` (oxfmt trên `packages/tui/src/tools/index.ts` + `packages/tui/test/probe-frozen.test.ts`) | trạng thái | `bun run check:ts` |

**49 neo đúng, đáng chú ý:** `mode-registry.ts` + `write-policy.ts` chưa tồn tại; `modes/index.ts` 603 B; `src/plan-mode/` đúng 8 file; `plan-mode-guard.ts` `:127`/`:143`/`:148`; `write.ts` `:778`/`:814`/`:842`/`:859` (đúng dòng, xem cảm bẫy #3 về nội dung); `modes/types.ts` `:108`/`:189-194`/`:195-198`; `interactive-mode.ts` `:908`/`:909`/`:975-1000`; 32 chỗ gán trên đúng một file với đúng số chia theo field; 16 lần đọc `planModePaused`; `loader.ts:40`; `status-line/types.ts` `:75`/`:96`/`:100`/`:103`/`:109`/`:113`; `schema.ts:2-30` đúng 27; `segments.ts` `:364`/`:365`/`:369-407`/`:409`/`:919`/`:947`; `status-line-host.ts` 3.2 KB; `plan-mode.ts` 549 dòng / 15.153 B với neo `:216`/`:255`/`:301`; `test/plan-mode/` đúng 5 file; `packages/tui/test/` đúng 8 file `status-line-*.test.ts`; `outsider-extension/` + `extension-outsider-install.test.ts` chưa tồn tại; `plugin-extensions-discovery.test.ts` 26 KB; `plan-mode-guard-local.test.ts:33` + ba regex; `tsconfig` `include "test"`; seam-1 nền 7/0; seam-2 nền 51 dòng / 21 file; `ExtensionAPI` không có member `ui`; `ModeRegistry`/`registerMode`/`registerSetting` vắng trong mã nguồn.
