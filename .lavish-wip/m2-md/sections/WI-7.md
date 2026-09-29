## WI-7. registerMode: sổ đăng ký mode cấp cao nhất, thiết kế cùng đường may (seam) của status-line

**Nguồn của tài liệu này:** phần WI-7 của `MILESTONE_2_EXECUTION_PLAN.md` (:1978-2261) được sao chép nguyên văn; bảng "Đính chính so với plan" và cột "đã đối chiếu" là của chính plan, chưa qua một lượt kiểm chứng độc lập. Lượt kiểm chứng này đã chạy lại toàn bộ neo và sửa các claim còn sai (xem các hàng ĐÍNH CHÍNH bên dưới); mọi neo chưa được sửa ở đây vẫn phải tự chạy lệnh trước khi tin.

**Thay đổi gì:** Tác giả extension chỉ cần một lời gọi `pi.registerMode` để cài một mode (tools, cổng settings, enter/exit, chính sách ghi, và một chip nhìn thấy được trên status-line) thay vì tự dựng 15 KB cơ chế mode, đồng thời năm mode tích hợp sẵn được đăng ký lại qua đúng đường đó mà không đổi hành vi.

**Wave:** 5 (M2 wave 5 — registerMode: phần việc thực chất của M2)

**Effort:** L — một milestone nhiều PR, không phải một thay đổi lẻ. Dự trù 5-8 PR trong 4-5 tuần: (1) rút writePolicy ra khỏi code, (2) lõi registry, (3) cặp accessor trên bảy field, (4) đường may M2-OQ3 kèm test của nó, (5) bọc plan mode, (6) bọc goal/vibe/loop/prewalk, (7) registerMode trên ExtensionAPI + xoá ví dụ, (8) fixture "outsider" + test cài đặt. Bước 1 phải được viết trước khi registry tồn tại.

**Người dùng thấy:** Với người dùng không bao giờ cài mode từ bên thứ ba thì **không có gì đổi** — năm mode tích hợp sẵn render, chặn cổng và chặn ghi y hệt như hôm nay. Điều thay đổi là một mode được cài từ ngoài repo không còn có thể vô hình: `ModeDefinition.statusLine` là field bắt buộc, nên một mode đã đăng ký luôn sinh ra một chip trong segment `mode` sẵn có của status-line, với đúng tông accent/warning và đúng hậu tố pause mà các mode tích hợp sẵn đang dùng. Thứ bị gỡ khỏi tầm nhìn của người dùng: `examples/extensions/plan-mode.ts` (549 dòng) bị xoá và thay bằng một lời gọi `registerMode` khoảng 50 dòng, nên ai đã copy ví dụ đó thì mất phần văn xuôi hướng dẫn và giữ lại hành vi.

### File cần chạm tới

| path | hành động | thay đổi | đã đối chiếu (chạy lại lệnh trước khi tin) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/modes/mode-registry.ts` | tạo | Class `ModeRegistry` mới + các type `ModeDefinition` / `WritePolicy` / `ModeStatusLine` / `ModeContext`. Sở hữu việc đăng ký, thứ tự tất định, trạng thái active/paused, và `resolvedMode()` (người thắng duy nhất của thứ tự ưu tiên trên status-line). | Có — thư mục `packages/coding-agent/src/modes/` đã tồn tại và là đúng chỗ ở nhà (nó đã giữ `status-line-host.ts`, `settings.ts`, `types.ts`); bản thân file là file mới. |
| `packages/coding-agent/src/modes/index.ts` | sửa | Thêm `export * from "./mode-registry";` — star re-export, theo luật barrel của AGENTS.md. | Có — file tồn tại (603 bytes). |
| `packages/coding-agent/src/plan-mode/write-policy.ts` | tạo | Rút chính sách ghi của plan mode ra dạng dữ liệu: một literal `WritePolicy` cộng với bộ đánh giá `checkWritePolicy(policy, ctx)` trả về kind vi phạm (`move` | `delete` | `workingTree` | null). Core giữ quyền sở hữu văn bản thông báo cho người dùng. | Có — file mới bên trong thư mục `packages/coding-agent/src/plan-mode/` đã tồn tại (8 file: approved-plan, model-transition, plan-autosave, plan-files, plan-handoff, plan-protection, settings, state). |
| `packages/coding-agent/src/tools/plan-mode-guard.ts` | sửa | `enforcePlanModeWrite` trở thành một adapter mỏng: tra `writePolicy` của mode đang active từ registry, gọi `checkWritePolicy`, ném `ToolError` với text sẵn có ứng với kind vi phạm trả về. | Có — `enforcePlanModeWrite` ở :127, dấu `}` đóng ở :148, `targetsLocalSandbox` early-return ở :143. Thân hàm vi không đổi. |
| `packages/coding-agent/src/tools/write.ts` | sửa | 4 call site `enforcePlanModeWrite` hiện có nay tra chính sách qua registry thay vì đọc trực tiếp trạng thái plan mode. Bản thân lời gọi không đổi chữ ký. | Có — call site: :778 (update), :814 (archive, update), :842 (sqlite, update), :859 (create). Site archive và sqlite truyền `{ op: "update" }` trên path KHÔNG phải file cây làm việc thuần — phải soi từng cái với quy tắc working-tree. |
| `packages/coding-agent/src/modes/types.ts` | sửa | Dòng 189-194 giữ nguyên tên và kiểu `boolean` nhưng trở thành cặp accessor trên context (registry-backed). Bốn field không phải boolean ở 195-198 không bị đụng tới. | Có — :189 planModeEnabled, :190 vibeModeEnabled, :191 goalModeEnabled, :192 goalModePaused, :193 loopModeEnabled, :194 loopModePaused. :195-198 là loopPrompt/loopLimit/loopCondition/planModePlanFilePath — bị loại khỏi boolean seam một cách đúng đắn. |
| `packages/coding-agent/src/modes/interactive-mode.ts` | sửa | Thay 7 initializer field của class bằng cặp getter/setter nối tới registry. Thêm thực thể registry. Nối `resolvedMode()` vào đường cập nhật status-line. | Có — **ĐÍNH CHÍNH ANO CŨ**: plan nói field ở :981-988; thực tế ở :908-915. Có **BẢY** field chứ không phải sáu: `planModePaused = false` ở :909 là runtime-only và không có trong `InteractiveModeContext`. Có 32 chỗ gán trong src (đều nằm trong file này), nên getter trần sẽ không compile — xem mục Đính chính. |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | Bốn accessor trạng thái mode giữ nguyên tên, kiểu trả về, và hành vi trả `undefined` khi inactive; registry cấp giá trị đằng sau chúng. | Có — **ĐÍNH CHÍNH ANO CŨ**: plan nói getPlanModeState :6097 / getPrewalkState :6102 / getGoalModeState :6120 / getVibeModeState :6128; thực tế là :6132 / :6137 / :6155 / :6163. Còn `codeModeNamespacesInfo` ở :5852 (plan nói :5822) và `#codeModeState` ở :1395 (plan nói :1387). |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Thêm `registerMode(definition: ModeDefinition): void` vào `ExtensionAPI`. KHÔNG thêm bí danh `ui`. | Có — `ExtensionAPI` (:1256-1582) không có member `ui`: `awk 'NR>=1256 && NR<=1582' .../types.ts \| grep -E '^\s+(readonly )?ui\b'` trả về rỗng; lần xuất hiện duy nhất của `ctx.ui` là một comment ở :1376. `registerTool` (:1347), `registerCommand` (:1411), `registerFlag` (:1430), `setActiveTools` (:1501) là khuôn mẫu trong nhà để noi theo. |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | Bind `registerMode` trên object `pi` đưa cho từng factory extension; ghi lại source id chủ sở hữu để unload bỏ được các mode của nó. | Có — loader đã import `resolvePath, withHostGuard` từ `../utils` ở :40 — đường ống provenance mà WI-5 thêm vào là seam để tái dùng. |
| `packages/tui/src/status-line/types.ts` | sửa | Thêm một type `ModeStatusLine` và **MỘT** field mới của `SegmentContext` mang phần đóng góp hiển thị của mode đã resolve. Phụ thuộc quyết định M2-OQ3 — xem open_questions. | Có — `SegmentContext` ở :75 với NĂM field mode hardcode riêng biệt: planMode :96, prewalk :100, loopMode :103, goalMode :109, vibeMode :113. Chính các field đóng theo từng mode mới là thứ chặn thật, chứ không chỉ riêng union id. |
| `packages/tui/src/status-line/schema.ts` | sửa | Không kỳ vọng thay đổi. Union `StatusLineSegmentId` 27 phần tử vẫn đóng; một mode từ extension render bên trong segment `mode` sẵn có chứ không phải thành một id mới. | Có — array literal trải :2-30 và đúng 27 phần tử. File này chỉ được liệt kê để người review xác nhận rằng nó cố ý được để nguyên đóng. |
| `packages/tui/src/status-line/segments.ts` | sửa | `modeSegment` hỏi field mode-đã-resolve mới trước, rồi rơi tiếp xuống chuỗi ưu tiên 5 nhánh hiện có, không đổi. | Có — const `modeSegment` ở :364, `id: "mode"` ở :365, chuỗi ưu tiên plan→prewalk→goal→vibe→loop ở :369-407. Ngoài lề: "segments.ts:919-947" của plan là record SEGMENTS và CẢ HAI ĐẦU ĐỀU ĐÚNG — :919 mở ra, :947 là `};` đóng; không cần sửa. `id: "mode"` ở :365 (const mở ra ở :364) cũng đúng. |
| `packages/coding-agent/src/modes/status-line-host.ts` | sửa | Đưa mode đã resolve của registry vào status-line host để segment thấy nó cạnh năm field hiện có. | Có — file tồn tại (3.2 KB) và là chỗ duy nhất khối policy `StatusLineHost` được dựng. |
| `packages/coding-agent/examples/extensions/plan-mode.ts` | xoá | Xoá ví dụ tự dựng 549 dòng. Đây là ĐIỀU KIỆN TIÊN QUYẾT, không phải cổng nghiệm thu. | Có — 549 dòng / 15,153 bytes. Các neo :216 (registerFlag), :255 (setActiveTools), :301 (tool_call hook) mà plan trích đều rơi đúng chỗ. Xoá file này là một input thiết kế, không phải bằng chứng — xem trường risk. |
| `packages/coding-agent/test/plan-mode/write-policy.test.ts` | tạo | An toàn cốt lõi. Một mode do extension đăng ký, có writePolicy, TỪ CHỐI một ghi vào cây làm việc VÀ CHO PHÉ một ghi vào sandbox `local://`. Cả hai nửa đều bắt buộc. | Có — thư mục đã xác nhận (5 file: approved-plan, model-transition, plan-handoff, plan-protection, reentry-prompt). Phần phủ của `plan-protection.test.ts` KHÔNG được lặp lại ở đây. |
| `packages/coding-agent/test/modes/mode-registry.test.ts` | tạo | Với mỗi mode đã migrate: cùng tập tool sau `enter`, cùng giá trị `mode` báo ngược lại cho extension, cùng kết quả resolve settings-domain. | Có — thư mục đã xác nhận. Khẳng định trạng thái session quan sát được — không bao giờ khẳng định "registry đã được gọi". |
| `packages/tui/test/status-line-extension-mode.test.ts` | tạo | Một mode do extension đăng ký render ra một mode segment. Dòng test này là thứ duy nhất khiến mặc định "mode mới không có chỉ báo" không thể ship lặng lẽ. | Có — thư mục đã xác nhận; có 8 file status-line-*.test.ts sẵn để noi về văn phong. Chỉ viết được SAU khi có quyết định seam M2-OQ3. |
| `packages/coding-agent/test/fixtures/outsider-extension/index.ts` | tạo | Chỉ chân wave 5: một package nằm ngoài examples/ đăng ký một tool, một slash command, một hook session_start, ctx.ui.setWidget, và pi.registerMode. KHÔNG có dòng registerSetting. | Có — chưa tồn tại, đã xác nhận. Đặc tả ở plan §11.2 mục 12. `pi.registerMode` và `pi.registerSetting` đều vắng ở HEAD (`git grep` rỗng), nên file này không thể typecheck cho tới khi cả hai tồn tại. |
| `packages/coding-agent/test/fixtures/outsider-extension/package.json` | tạo | Khai báo `omp.extensions` trỏ tới index.ts. Không path hardcode, không danh sách tên trong bất kỳ loader nào. | Có — chưa tồn tại, đã xác nhận. |
| `packages/coding-agent/test/extension-outsider-install.test.ts` | tạo | Nạp fixture qua đường cài đặt thật và khẳng định nó CHẠY: `result.errors` rỗng, tool có trong bảng tool, command có trong registry, handler session_start bắn, widget có trong frame, mode có trong registry KÈM status-line segment của nó. | Có — chưa tồn tại, đã xác nhận. Phải sao chép kỷ luật cô lập của file sẵn có `packages/coding-agent/test/plugin-extensions-discovery.test.ts` (26 KB, đã xác nhận có mặt). |

### Các bước

0. **Làm việc này TRƯỚC MỌI CODE:** lấy quyết định về đường may status-line M2-OQ3 được ký bằng văn bản. Quyết định phải thoả bốn ràng buộc đã đối chiếu với HEAD: (1) union 27 phần tử ở schema.ts:2-30 vẫn đóng; (2) một mode đã đăng ký render bên trong segment `mode` sẵn có (segments.ts:364), không phải thành id mới; (3) chuỗi ưu tiên năm nhánh plan→prewalk→goal→vibe→loop (segments.ts:369-407) được giữ nguyên và thứ tự của nó đến từ registry, không phải từ hệ thống file; (4) `ModeDefinition.statusLine` là BẮT BUỘC, không bao giờ optional. Phương án 3 của chính plan (§7.4, "mode segment reads id from ModeRegistry") là phương án duy nhất trong ba phương án thoả cả bốn — nhưng plan cố ý KHÔNG chọn, nên phải có người quyết. Mọi thứ ở bước 3 trở đi đều phụ thuộc bước này.

1. **Test `packages/coding-agent/test/plan-mode/write-policy.test.ts` được viết ở BƯỚC 3 — ngay sau khi `ModeRegistry` có mặt, và TRƯỚC khi bất kỳ mode nào được bọc. Bước 2 cấm viết nó ở commit đó, vì nó dẫn qua policy của registry mà bước 2 cố tình không chạm tới.** Test phải chứng minh CẢ HAI nửa: một mode có writePolicy chặn ghi vào cây làm việc thì TỪ CHỐI một lần ghi `src/foo.ts`, VÀ chính mode đó CHO PHÉP một lần ghi `local://slug-plan.md`. Thiếu một khẳng định trong hai là một test vẫn xanh trên một implementation vốn cũng chặn luôn sandbox. Hãy dẫn nó qua một policy do registry cấp, không phải qua plan mode tích hợp sẵn — bất đẳng thức của plan mode tích hợp sẵn đã được phủ tại test/tools/plan-mode-guard-local.test.ts:90-127, và lặp lại nó ở đây là trùng lặp bị cấm. (anchor: packages/coding-agent/src/tools/plan-mode-guard.ts:127)

2. **Rút chính sách thành dữ liệu trong một commit MỚI không chạm registry mode nào.** `enforcePlanModeWrite` đọc writePolicy của mode đang active, gọi bộ đánh giá, và ném đúng các chuỗi `ToolError` sẵn có theo kind vi phạm (core giữ quyền sở hữu text; một extension không được phép tiêm chuỗi vào tool error). BẰNG CHỨNG CỦA COMMIT NÀY, không phải commit mới: `packages/coding-agent/test/tools/plan-mode-guard-local.test.ts` phải chạy xanh và TẤT CẢ năm khẳng định của nó phải được giữ nguyên, không dòng nào bị sửa. File đó đi vào `enforcePlanModeWrite` trực tiếp (nó stub `getPlanModeState` ở :33) và không cần registry, nên nó là integration test của đúng đoạn code bước 2 này sửa. Các message phải khớp với các regex mà test đó khẳng định: /working tree is read-only/, /deleting files is not allowed/, /renaming files is not allowed/. Đừng viết `test/plan-mode/write-policy.test.ts` ở commit này — nó dẫn qua policy của registry và chỉ chạy được từ bước 3; viết nó ở bước 3. (anchor: packages/coding-agent/src/plan-mode/write-policy.ts)

3. **Thêm `ModeRegistry` + type `ModeDefinition`.** Registry sở hữu: map id→definition, một thứ tự tất định (output của WI-2), trạng thái active/paused theo từng id, và `resolvedMode()` trả về người thắng duy nhất cho status-line. Từ chối id trùng lúc đăng ký bằng cách ném Error có nêu đích danh id. Không `any`, không `ReturnType<>`, chỉ field `#private`, chỉ import top-level, star re-export từ modes/index.ts. (anchor: packages/coding-agent/src/modes/mode-registry.ts)

4. **Chuyển 7 field trạng thái mode (dòng 908-915) thành cặp getter/setter có registry làm chân đế.** Commit này phải TÁCH khỏi bước 3. Getter trần là chưa đủ — có 32 chỗ gán `this.<mode>.x = ` ngay trong file này (planModeEnabled x4, planModePaused x5, vibeModeEnabled x3, goalModeEnabled x7, goalModePaused x7, loopModeEnabled x2, loopModePaused x4), nên mỗi cặp cần một setter định tuyến lệnh ghi vào registry. Sau commit này chạy hai cổng grep bên dưới và xác nhận không có diff site mới nào. (anchor: packages/coding-agent/src/modes/interactive-mode.ts:908)

5. **Đặt bốn accessor (getPlanModeState :6132, getPrewalkState :6137, getGoalModeState :6155, getVibeModeState :6163) lên registry**, giữ nguyên tên, nguyên kiểu trả về chính xác, và trả `undefined` khi inactive. `getPrewalkState` trả `Prewalk | undefined`, KHÔNG phải boolean — một getter boolean dẫn xuất không thay thế được nó. Rồi chạy lại grep seam-2: nó vẫn phải đúng 51 dòng trên 21 file, không dòng nào bị sửa tay. (anchor: packages/coding-agent/src/session/agent-session.ts:6132)

6. **Cài seam M2-OQ3 theo quyết định ở bước 0.** Thêm MỘT field mới của `SegmentContext` mang phần đóng góp hiển thị của mode đã resolve, đứng cạnh năm field mode hardcode sẵn có. Luồn nó qua `status-line-host.ts`. Trong `modeSegment` ở `segments.ts`, đọc field mới trước rồi rơi tiếp xuống chuỗi cũ, không đổi. Để `schema.ts` nguyên đóng. Viết `packages/tui/test/status-line-extension-mode.test.ts` trong chính commit này. (anchor: packages/tui/src/status-line/types.ts:96)

7. **Nạp registry bằng cách BỌC, không bao giờ viết lại:** đăng ký plan mode trước, rồi goal, vibe, loop, prewalk. Mỗi definition bọc ủy quyền `enter`/`exit` cho method `InteractiveMode` sẵn có; code gốc đứng nguyên tại chỗ. Chạy lại grep seam-1 sau MỖI mode được migrate. (anchor: packages/coding-agent/src/modes/mode-registry.ts)

8. **Viết `test/modes/mode-registry.test.ts`.** Với TỪNG mode trong năm mode đã migrate, khẳng định tính tương đương quan sát được so với bản build trước migrate: tập tool sau `enter` giống hệt, giá trị `mode` báo ngược lại cho extension giống hệt, kết quả resolve settings-domain giống hệt. Khẳng định trạng thái session quan sát được — không bao giờ khẳng định "registry đã được gọi". (anchor: packages/coding-agent/test/modes/mode-registry.test.ts)

9. **Thêm `registerMode(definition: ModeDefinition): void` vào `ExtensionAPI`**, theo khuôn mẫu registerTool/registerCommand/registerFlag. Bind nó trong extension loader và ghi lại source id chủ sở hữu để unload bỏ được các mode của extension đó. KHÔNG thêm bí danh `ui` vào `ExtensionAPI` — hôm nay nó không có member `ui` (đã xác minh: `ExtensionAPI` là :1256-1582, không có member `ui`; hit duy nhất của `ctx.ui` trong đó là một comment ở :1376) và thêm nó sẽ thành public member thứ 30 trên một bề mặt mà §5.2 đếm là 29. (anchor: packages/coding-agent/src/extensibility/extensions/types.ts:1347)

10. **Xoá `examples/extensions/plan-mode.ts` (549 dòng) và hạ một bản thay thế khoảng 50 dòng dựa trên `registerMode` trong cùng một commit.** Đây là ĐIỀU KIỆN TIÊN QUYẾT chứng tỏ API dùng được, KHÔNG phải cổng nghiệm thu — xoá một ví dụ nằm trong repo không chứng minh gì về một extension từ bên ngoài. (anchor: packages/coding-agent/examples/extensions/plan-mode.ts)

11. **Tạo fixture "outsider" (package.json khai báo `omp.extensions` + index.ts) đăng ký:** một tool, một slash command, một hook session_start, `ctx.ui.setWidget` (KHÔNG phải `pi.ui.setWidget` — cái đó sẽ không compile), và `pi.registerMode` kèm một `writePolicy`. KHÔNG thêm dòng `registerSetting` nào. Rồi viết `test/extension-outsider-install.test.ts`: dựng nó ở `<TempDir>/.omp/extensions/outsider-extension/` và gọi `discoverAndLoadExtensions([], tempProjectDir)` — không bao giờ truyền một path vào `configuredPaths`, vì làm vậy là vòng qua bước discovery — và lặp lại ở phạm vi user qua `setAgentDir` + `getAgentDir()`. Khẳng định nó CHẠY chứ không phải nó được tìm thấy: `result.errors` rỗng, tool có trong bảng tool, command có trong registry, hook bắn khi có event, widget có trong frame, mode có trong registry kèm status-line segment của nó. Sao chép kỷ luật cô lập của plugin-extensions-discovery.test.ts: spyOn(os,'homedir') trỏ về một temp home, xoá XDG_*, setAgentDir trong afterEach. (anchor: packages/coding-agent/test/fixtures/outsider-extension/index.ts)

### Hình dạng code

```typescript
// packages/coding-agent/src/modes/mode-registry.ts — the parts that are NOT obvious

/** Write admission for a mode. Data only — never a message string.
 *  Core keeps ownership of the user-facing `ToolError` text so an extension
 *  cannot inject arbitrary prose into a tool error. */
export interface WritePolicy {
	/** Writes under `local://` sandbox roots. */
	readonly sandbox: "allow" | "deny";
	/** Writes that land in the working tree. */
	readonly workingTree: "allow" | "deny";
	/** `op: "delete"`. */
	readonly delete: "allow" | "deny";
	/** `move:` renames. */
	readonly move: "allow" | "deny";
}

/** How a registered mode appears in the status line's `mode` segment. */
export interface ModeStatusLine {
	readonly label: string;
	readonly icon: string | undefined;
	readonly tone: "accent" | "warning" | "customMessageLabel" | undefined;
	/** Rendered after the label when the mode is paused (default " (paused)"). */
	readonly pausedSuffix: string | undefined;
}

/** Narrow context handed to `enter`/`exit`. Deliberately NOT InteractiveModeContext —
 *  an outside extension must not receive TUI internals. */
export interface ModeContext {
	readonly session: AgentSession;
	readonly settings: Settings;
	setActiveTools(toolNames: readonly string[]): Promise<void>;
	notify(message: string): void;
}

export interface ModeDefinition {
	readonly id: string;
	readonly label: string;
	readonly icon: string | undefined;
	/** REQUIRED — a mode that cannot announce itself does not register. */
	readonly statusLine: ModeStatusLine;
	/** `all-settings.ts` DOMAINS id whose keys gate this mode. */
	readonly settingsDomain: string;
	readonly initialToolSet: readonly string[];
	/** Lower sorts first in the `mode` segment. Unique. Fed by WI-2's order. */
	readonly order: number;
	enter(ctx: ModeContext): Promise<void>;
	exit(ctx: ModeContext): Promise<void>;
	readonly writePolicy?: WritePolicy;
}

export type ModeActivation = "active" | "paused";

/** Winner of the status-line priority order, computed ONCE by the registry so the
 *  segment does not re-derive it. `null` when no mode is active. */
export interface ResolvedMode {
	readonly id: string;
	readonly display: ModeStatusLine;
	readonly activation: ModeActivation;
}

export class ModeRegistry {
	readonly #definitions = new Map<string, ModeDefinition>();
	/** Absent = inactive. `ModeActivation` has no "inactive" member on purpose:
	 *  undefined is the only way to spell it, so it must be in the value type. */
	readonly #activation = new Map<string, ModeActivation | undefined>();
	#sorted: readonly string[] = [];
	#dirty = true;

	register(definition: ModeDefinition): void {
		if (this.#definitions.has(definition.id)) {
			throw new Error(`ModeRegistry: duplicate mode id "${definition.id}"`);
		}
		this.#definitions.set(definition.id, definition);
		this.#dirty = true;
	}

	/** Registry-backed backing for the `InteractiveMode` accessor pairs. */
	isActive(id: string): boolean {
		return this.#activation.get(id) === "active";
	}

	setActivation(id: string, activation: ModeActivation | undefined): void {
		if (activation === undefined) this.#activation.delete(id);
		else this.#activation.set(id, activation);
	}

	/** The single winner of the deterministic order, computed once here so the
	 *  segment never re-derives it. `null` when no mode is active. */
	resolvedMode(): ResolvedMode | null {
		for (const id of this.#sortedIds()) {
			const activation = this.#activation.get(id);
			const definition = this.#definitions.get(id);
			if (definition && activation) {
				return { id, display: definition.statusLine, activation };
			}
		}
		return null;
	}

	/** Active AND enabled for write policy. Drives `enforcePlanModeWrite`. */
	writePolicy(): WritePolicy | undefined {
		for (const id of this.#sortedIds()) {
			if (this.#activation.get(id) === "active") {
				const policy = this.#definitions.get(id)?.writePolicy;
				if (policy) return policy;
			}
		}
		return undefined;
	}

	#sortedIds(): readonly string[] {
		if (this.#dirty) {
			this.#sorted = [...this.#definitions.values()]
				.sort((a, b) => a.order - b.order)
				.map(d => d.id);
			this.#dirty = false;
		}
		return this.#sorted;
	}
}

// packages/coding-agent/src/modes/interactive-mode.ts:908 — accessor pairs, NOT bare getters.
// 32 assignment sites live in this file; a getter alone will not compile.
	get planModeEnabled(): boolean {
		return this.#modeRegistry.isActive("plan");
	}
	set planModeEnabled(value: boolean) {
		this.#modeRegistry.setActivation("plan", value ? "active" : undefined);
	}

// packages/tui/src/status-line/types.ts — ONE new field beside the five hardcoded ones.
// The five (`planMode` :96, `prewalk` :100, `loopMode` :103, `goalMode` :109,
// `vibeMode` :113) are the real blocker; the closed 27-id union is only half of it.
export interface SegmentContext {
	// ...existing fields unchanged...
	/** Winner of the registry's deterministic mode order, or null. Checked BEFORE the
	 *  legacy plan→prewalk→goal→vibe→loop chain, which then acts as the fallback. */
	resolvedMode: ResolvedMode | null;
}
```

### Hợp đồng test

Bốn hợp đồng, mỗi cái một thất bại quan sát được có tên rõ ràng.

1. **BẤT ĐẲNG THỨC WRITE-POLICY** — `packages/coding-agent/test/plan-mode/write-policy.test.ts`: một mode có chính sách chặn ghi vào cây làm việc sẽ từ chối một lần ghi `src/foo.ts` **và** chính mode đó chấp nhận một lần ghi `local://slug-plan.md`. Nếu hồi quy: một lần refactor nâng phép kiểm sandbox lên trên nhánh working-tree sẽ lặng lẽ chặn mất không gian gạch duy nhất mà coding-agent còn lại trong lúc plan mode bật; người dùng mất chỗ để soạn kế hoạch và không có gì trên UI giải thích vì sao. Nếu hồi quy theo hướng kia, coding-agent sẽ sửa một cái cây làm việc mà người dùng tin là chỉ-đọc — đường hỏng dữ liệu âm thầm duy nhất của M2.
2. **TƯƠNG ĐƯƠNG REGISTRY** — `packages/coding-agent/test/modes/mode-registry.test.ts`: với từng mode trong năm mode đã bọc, tập tool sau `enter`, giá trị `mode` báo ngược lại cho extension, và kết quả resolve settings-domain phải giống bản build trước migrate. Nếu hồi quy: một mode đã lên registry nhưng lại vào với một tập tool khác, khiến một tính năng biến mất lặng lẽ khỏi tầm nhìn của mô hình.
3. **NHÌN THẤY MODE SEGMENT** — `packages/tui/test/status-line-extension-mode.test.ts`: một mode do extension đăng ký phải render ra một chip trên status-line. Nếu hồi quy: một mode không có chỉ báo bị người dùng đọc như một lỗi, vì một segment `mode` đã tồn tại ở segments.ts:364 và họ sẽ mong một mode mới xuất hiện ở đó. Dòng test này là thứ duy nhất khiến mặc định đó không thể ship lặng lẽ.
4. **CÀI ĐẶT TỪ BÊN NGOÀI** — `packages/coding-agent/test/extension-outsider-install.test.ts`: một extension thật viết bên ngoài repo, nạp qua đường cài đặt thật, đăng ký một mode có writePolicy, và mode đó xuất hiện trong mode registry KÈM status-line segment của nó, đồng thời extension chạy được (errors rỗng, tool có trong bảng tool, command có trong registry, hook bắn, widget có trong frame). Nếu hồi quy: `registerMode` tồn tại nhưng không với tới được bởi bất kỳ thứ gì không nằm trong repo — đúng cái xanh giả mà plan nói việc xoá ví dụ trong repo không thể loại trừ.

**Tên file test:**

- `packages/coding-agent/test/plan-mode/write-policy.test.ts`
- `packages/coding-agent/test/modes/mode-registry.test.ts`
- `packages/tui/test/status-line-extension-mode.test.ts`
- `packages/coding-agent/test/extension-outsider-install.test.ts`
- `packages/coding-agent/test/fixtures/outsider-extension/index.ts`
- `packages/coding-agent/test/fixtures/outsider-extension/package.json`

### Xác minh

Cổng theo từng mục (chạy từ gốc repo) — TÁCH RIÊNG, KHÔNG xâu bằng `&&`. `check:ts` đứng trước dấu `&&` sẽ chặn không cho hai chân test chạy tới mỗi khi nó đỏ, kể cả vì một lý do không liên quan tới WI-7:

```bash
(cd packages/coding-agent && bun test test/plan-mode/write-policy.test.ts test/modes/mode-registry.test.ts) ; \
(cd packages/tui && bun test test/status-line-extension-mode.test.ts)
bun run check:ts
```

Cổng nghiệm thu wave 5 — TÁCH RIÊNG, và cố ý KHÔNG kèm check:ts (fixture được typecheck vì `packages/coding-agent/tsconfig.json` có `include "test"`, nên một dòng `registerSetting` sẽ làm check:ts đỏ và dấu `&&` sẽ chặn không cho test chạy tới):

```bash
cd packages/coding-agent && bun test test/extension-outsider-install.test.ts
```

Cổng đóng M2 (sau khi WI-8b thêm dòng `registerSetting` duy nhất) là lệnh đầy đủ có kèm check:ts. Không đặt check:ts lên cổng wave 5 và không dùng `// @ts-expect-error` để giữ một chân sống trong fixture.

Các cổng seam — chạy lại sau MỌI commit ở bước 4-7; bất kỳ call site nào bị sửa tay nghĩa là commit đó đã phá vỡ lời hứa tương thích GĐ1:

```bash
grep -n "planModeEnabled\|vibeModeEnabled\|goalModeEnabled\|goalModePaused\|loopModeEnabled\|loopModePaused" packages/coding-agent/src/modes/types.ts   # vẫn 6 dòng, 189-194
grep -cE "^\t(planModeEnabled|planModePaused|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused) = " packages/coding-agent/src/modes/interactive-mode.ts   # hôm nay 7, sau bước 4 phải bằng 0
grep -cE "^\t(get|set) (planModeEnabled|planModePaused|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused)" packages/coding-agent/src/modes/interactive-mode.ts   # hôm nay 0, sau bước 4 phải bằng 14
git grep -n "getPlanModeState\|getGoalModeState\|getVibeModeState\|getPrewalkState" -- packages/coding-agent/src | grep -v gallery-fixtures
```

Lệnh đầu một mình KHÔNG phân biệt được "đã làm accessor" với "chưa làm gì cả": `InteractiveModeContext` là một `interface` (`modes/types.ts:108`), nên các dòng `planModeEnabled: boolean;` vẫn phải y nguyên sau bước 4 — grep đó chỉ đỏ nếu ai đó ĐỔI TÊN field, điều bước 4 cấm. Hai lệnh `grep -c` mới là phần có tín hiệu thật.

Lệnh `git grep` cuối cùng (seam-2) phải báo đúng 51 dòng trên 21 file, không đổi, sau từng commit trong số đó.

**MÔI TRƯỜNG — đã đo lại trên máy này:** `bun run check:ts` PASS (exit 0): cây làm việc hiện SẠCH (`git status --porcelain` chỉ còn các thư mục `.lavish-wip/` và `MILESTONE_2_EXECUTION_PLAN.md` chưa track), nên cổng này XANH và đi hết tới `check:types`. Nó từng ĐỎ khi cây mang file sửa chưa commit, và chỉ dừng ở chặng đầu `check:tools` (`oxlint . && oxfmt --check ...`) chứ chưa từng tới `check:types` — `packages/coding-agent/src/__wi3_probe.ts` từng dừng nó ở đó và nay không còn tồn tại, nên đỏ cũ là do cây bẩn dùng chung chứ HEAD vẫn xanh. `bun test` vẫn bị CHẶN: nó báo `0 pass / 1 fail` với "Failed to load pi_natives native addon for darwin-arm64". Cả hai cổng đều phải được chạy tách riêng, không xâu bằng `&&`, để một cổng đỏ vì môi trường không chặn cổng kia phát ra tín hiệu. Hãy build native addon trước, hoặc coi mọi cổng test ở đây là CHƯA KIỂM CHỨNG — đừng đọc một kết quả đỏ là hồi quy trong code dưới test.

### Cổng hoàn thành

DONE nghĩa là cả bốn đều đúng. (1) `bun run check:ts` exit 0. (2) Grep seam-2 vẫn báo đúng 51 dòng trên 21 file với không chỗ sửa tay nào; sáu tên boolean vẫn còn nguyên ở modes/types.ts:189-194, đồng thời interactive-mode.ts không còn initializer thô nào cho bảy field (grep = 0) và có đúng 14 accessor (7 cặp get/set). (3) Một mode được đăng ký từ NGOÀI repo — packages/coding-agent/test/fixtures/outsider-extension/, nạp qua `discoverAndLoadExtensions([], tempProjectDir)` chứ không phải qua `configuredPaths` — xuất hiện trong mode registry mang một `statusLine` không optional, render ra một chip trong segment `mode` của status-line, chặn một lần ghi vào cây làm việc trong khi vẫn cho phép một lần ghi `local://`, và extension chạy với `result.errors` rỗng. (4) `examples/extensions/plan-mode.ts` không còn tồn tại.

Cổng này **có thực sự đỏ được không: CÓ, nhưng cần tách phần tín hiệu thật khỏi phần nhiễu môi trường.** Điều kiện (4) là sự tồn tại file và có thể đỏ; nửa `grep -c` của điều kiện (2) là câu lệnh thật và có thể đỏ. Điều kiện (1) cũng là câu lệnh thật và hiện XANH (exit 0, xem MÔI TRƯỜNG) — nhưng nó đã từng đỏ vì một file sửa chưa commit ngoài phạm vi WI-7, nên nếu cây lại bẩn, đừng quy kết quả đó cho công việc này. Ba nửa test của điều kiện (2) và (3) thì **không đỏ có ý nghĩa** ngày hôm nay, vì `bun test` đang bị chặn repo-wide bởi native addon thiếu: chúng sẽ đỏ vì một lý do không liên quan tới công việc này, nên độ tin cậy của cổng phải được xây lại sau khi build addon.

### Phụ thuộc

**Phụ thuộc vào (`depends_on`):**

- WI-1 — một mode bị treo phải thật sự dừng lại; nếu không, việc treo mode sẽ kế thừa lỗi timer đang sống.
- WI-2 — thứ tự mode phải tất định trước khi mode trở nên nhạy với thứ tự; hôm nay chuỗi ưu tiên trong mode segment là thứ tự duy nhất, và trường `order` của WI-7 phải đến từ đó.
- WI-5 — mode cần trạng thái năng lực có thể thật sự được thu hồi (registry sở hữu + gán nguồn cho unload).
- WI-6 — bảng tập tool, vì `ModeDefinition.initialToolSet` phụ thuộc vào các quy tắc tiếp nhận mà nó chốt lại.
- WI-10 — mode trả lời trên bề mặt ghi nào.

**Chặn (`blocks`):**

- M2-OQ3 close-out — câu trả lời cho đường may status-line do bước 0 của work item này sinh ra.
- M3 mục 5 / O2 — công việc M2 về status-line segment tiêu thụ đường may mà mục này đóng băng, và không được mở lại.
- §11.2 mục 12 chân wave 5 — dòng `pi.registerMode` của fixture là dòng duy nhất đóng được trong wave 5.

### Cách sai dễ nhất

**Hồi quy lặng lẽ chính chốt ghi của plan mode** — thứ duy nhất ở M2 có thể làm hỏng dữ liệu người dùng. coding-agent sửa một cái cây làm việc mà người dùng tin là chỉ-đọc và không có UI nào báo. Sự hỏng vô hình đúng vì chốt ghi ném `ToolError` mà người dùng không bao giờ thấy. Hai phòng ngừa bắt buộc, theo đúng thứ tự này: (1) hạ việc rút writePolicy như một commit RIÊNG trước khi migrate bất kỳ mode nào, giữ nguyên và xanh toàn bộ `test/tools/plan-mode-guard-local.test.ts` như bằng chứng, để trong cây chỉ còn đúng một implementation đang thực thi; (2) giữ các field trạng thái mode là cặp accessor registry-backed trong TOÀN BỘ quá trình migrate — tên và kiểu không đổi, cộng thêm một field thứ bảy mà plan đã bỏ sót — để luôn có đường rollback từng phần. Rủi ro cao thứ hai là ship một mode registry không có câu trả lời nào cho status-line: một mode không có chỉ báo bị người dùng đọc là lỗi, vì một segment `mode` đã tồn tại ở segments.ts:364 và người dùng sẽ mong mode mới hiện ở đó. Đó chính là lý do bước 0 tồn tại.

### Cần người quyết

- **M2-OQ3 — LÀM THẾ NÀO để một mode do extension đăng ký đi tới status line?** Điều này CHẶN bước 6 và không thể do người triển khai tự quyết. Plan đã phân tích ba phương án ở §7.4 và cố ý KHÔNG chọn. Bốn ràng buộc mà bất kỳ câu trả lời nào phải thoả, tất cả đã đối chiếu với HEAD: union 27 phần tử ở schema.ts:2-30 vẫn đóng; một mode đã đăng ký render bên trong segment `mode` sẵn có ở segments.ts:364, không phải thành id mới; chuỗi ưu tiên plan→prewalk→goal→vibe→loop (segments.ts:369-407) được giữ nguyên với thứ tự do registry cung cấp; `ModeDefinition.statusLine` là bắt buộc. Plan nghiêng về phương án 3 ("mode segment reads id from ModeRegistry") là phương án duy nhất thoả cả bốn, nhưng §7.4 nói phương án 3 KHÔNG phủ trường hợp một mode muốn có segment nằm ngoài `mode` — nếu sau này cần điều đó thì cả ba phương án phải mở lại. Chủ sở hữu quyết định: người giữ WI-10 / buổi review thiết kế M2. Cần trước bước 6, không cần trước bước 0.
- **writePolicy có điều khiển TEXT thông báo cho người dùng, hay chỉ các cờ?** Đặc tả này đặt text thông báo ở core (một `WritePolicy` chỉ là cờ allow/deny; chốt ghi giữ các chuỗi `ToolError`) để một extension không thể tiêm văn xuôi tuỳ ý vào một tool error. Phương án thay thế để mỗi mode tự viết câu từ chối của riêng nó, thân thiện hơn và cũng là điều một ví dụ đã phát hành sẽ muốn. Mặc định mang hương vị bảo mật, phương án thay thế mang hương vị sản phẩm — người ta chọn.
- **`ModeContext` có mở ra bất kỳ tiện ích UI nào không?** Đặc tả này giữ nó hẹp (session, settings, setActiveTools, notify) và không tra tay cầm TUI nào, vì khu vực tự vẽ của một mode đã đăng ký đúng là thứ WI-13 định nghĩa và nó đổ vào wave 6. Nếu ở wave 5 một mode được kỳ vọng render nhiều hơn một chip trên status-line, thì context cần một seam ngay bây giờ chứ không phải vào wave 6.
- **Chân thứ hai của fixture thật sự có cần là một commit riêng không?** Lý lẽ của plan là chặn đáng kỹ (tsconfig có `include "test"`, nên một dòng `registerSetting` sẽ làm check:ts đỏ và dấu `&&` không bao giờ tới được các test) và đặc tả này đi theo. Hãy xác nhận với người giữ WI-8b rằng cổng wave 5 và cổng đóng M2 vẫn là hai lệnh riêng chứ không phải một lệnh duy nhất dễ chịu.
- **Năm mode tích hợp sẵn có nên được đăng ký với các giá trị `order` hiện có lấy từ WI-2, hay WI-2 tạo ra một artifact riêng mà mục này phải đọc?** Bước 7 phụ thuộc output của WI-2 là một thứ tự cụ thể, ổn định. Nếu WI-2 chỉ hạ một thứ tự kiểu chẩn đoán mà không có danh sách chuẩn, thì bước 7 không có thứ tự nào để gán và ưu tiên trên status-line trở thành một nguồn sự thật thứ hai, cạnh tranh với nhau.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Sáu boolean là các field runtime của `InteractiveMode` ở `modes/interactive-mode.ts:981-988`. | stale | Chúng ở `modes/interactive-mode.ts:908-915`, không phải 981-988 — lệch khoảng 73 dòng. Nửa còn lại của cùng claim đó, `types.ts:189-194`, là ĐÚNG. Bằng chứng: `grep -n 'planModeEnabled\|vibeModeEnabled\|goalModeEnabled\|goalModePaused\|loopModeEnabled\|loopModePaused' packages/coding-agent/src/modes/types.ts` → 189,190,191,192,193,194 (chính xác). `sed -n '900,920p' packages/coding-agent/src/modes/interactive-mode.ts` → dòng 908 `planModeEnabled = false;` tới dòng 915 `loopModePaused = false;`. Dòng 975-1000 mà plan trỏ tới chứa `pendingPythonComponents` / `isPythonMode` và cache working-message. |
| Bốn accessor mode của `AgentSession` ở `agent-session.ts:6097`, `:6102`, `:6120`, `:6128`; `codeModeNamespacesInfo` ở `:5822`; `#codeModeState` khai báo ở `:1387`. | stale | Cả sáu neo đều lệch. getPlanModeState ở :6132, getPrewalkState :6137, getGoalModeState :6155, getVibeModeState :6163, codeModeNamespacesInfo :5852, #codeModeState :1395. Các neo accessor lệch đều khoảng 30-35 dòng; hai cái kia lệch khoảng 30 và khoảng 8. Bằng chứng: `grep -n 'getPlanModeState\|getPrewalkState\|getGoalModeState\|getVibeModeState\|codeModeNamespacesInfo\|#codeModeState' packages/coding-agent/src/session/agent-session.ts` → 1366, 1395, 1404, 1474, 1783, 5852, 5853, 6132, 6137, 6155, 6163. Hai con số đếm seam-grep của chính plan vẫn đúng tuyệt đối, nên độ trôi chỉ giới hạn ở số dòng, không phải cấu trúc. |
| Sáu boolean trở thành "derived getter" trên registry, giữ nguyên tên và kiểu. | incomplete-and-blocking | Getter trần sẽ không compile. Có 32 chỗ gán `this.<mode>.x = ` trong src/, TẤT CẢ ở interactive-mode.ts (planModeEnabled x4, planModePaused x5, vibeModeEnabled x3, goalModeEnabled x7, goalModePaused x7, loopModeEnabled x2, loopModePaused x4). Mỗi field cần một cặp getter VÀ setter, setter định tuyến lệnh ghi vào registry. Cách diễn đạt của plan đánh giá thấp khối lượng việc và, nếu làm theo đúng chữ, sinh ra một commit không build được. Bằng chứng: `git grep -nE '\.(planModeEnabled|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused|planModePaused) = ' -- packages/coding-agent/src` → 32 dòng, và `git grep -l` trên cùng pattern → đúng một file, `interactive-mode.ts`. Số chỗ gán theo từng field từ `grep -cE '^\s*this\.<name> = ' interactive-mode.ts`. |
| Sáu boolean là toàn bộ bề mặt trạng thái mode cần giữ dạng derived getter. | wrong-count | Có BẢY bit trạng thái mode. `planModePaused = false` khai báo ở interactive-mode.ts:909 và được đọc ở 16 chỗ — nhưng nó KHÔNG được khai báo trên `InteractiveModeContext` (grep planModePaused trong modes/types.ts không trả về gì), nên một plan liệt kê interface đã bỏ sót nó. Nó là chốt chặn thật: interactive-mode.ts:3750-3753 đổ thẳng nó vào status line dưới tên `paused`, và segments.ts:369-373 render chip cảnh báo `Plan ⏸` từ nó. Chuyển sáu mà để field thứ bảy là field thô thì trạng thái pause trên status-line ngừng cập nhật âm thầm ngay khoảnh khắc sáu cái kia chuyển sang registry. Bằng chứng: `grep -n 'this.planModePaused' packages/coding-agent/src/modes/interactive-mode.ts` → 16 chỗ (2318, 3750, 3753, 4018, 4031, 4158, 4181, 4377, 4398, 4406, 5069, 5075, 5130, 5253, 5361, 5406). `sed -n '3748,3757p'` cho thấy #updatePlanModeStatus truyền `{ enabled, paused }` vào `this.statusLine.setPlanModeStatus(status)`. `sed -n '369,373p' packages/tui/src/status-line/segments.ts` cho thấy nhánh paused tạo ra chip tông cảnh báo. |
| `test/plan-mode/write-policy.test.ts` là file mới và phải bảo vệ bất đẳng thức sandbox `local://` mà hiện chưa gì phủ. | partly-stale | Bất đẳng thức ĐÃ được phủ cho plan mode tích hợp sẵn, tại `packages/coding-agent/test/tools/plan-mode-guard-local.test.ts:90-127`: nó khẳng định create và update trên `local://` đều qua, `src/foo.ts` và `PLAN.md` bị từ chối với /working tree is read-only/, delete bị từ chối với /deleting files is not allowed/, và move bị từ chối với /renaming files is not allowed/. AGENTS.md cấm lặp lại phần phủ ở một tầng thứ hai. File mới phải bảo vệ một hợp đồng KHÁC — chính sách được đánh giá như DỮ LIỆU qua một mục registry, dẫn bởi một mode do extension đăng ký — nếu không nó là một bản trùng mà quy tắc cấm. Bằng chứng: `sed -n '90,127p' packages/coding-agent/test/tools/plan-mode-guard-local.test.ts` cho thấy cả năm khẳng định trên. File cỡ 11 KB và nối đầy đủ vào `enforcePlanModeWrite`. |
| Thứ chặn status-line là union `StatusLineSegmentId` 27 phần tử đóng ở `schema.ts:2-30` không có seam cho người đóng góp. | right-but-incomplete | Union đúng như mô tả (đã xác minh 27 phần tử). Nhưng nửa khó hơn nằm thấp hơn một tầng: `SegmentContext` (types.ts:75) mang NĂM field mode hardcode riêng biệt — planMode :96, prewalk :100, loopMode :103, goalMode :109, vibeMode :113 — và `modeSegment` giải chúng qua một if-chain 5 nhánh viết tay ở thứ tự ưu tiên cố định (segments.ts:369-407). Một mode từ extension cũng không có field nào ở đó, và if-chain lặng lẽ trả `{ visible: false }` cho bất cứ thứ gì nó không nhận ra. Một thiết kế mở union id nhưng để năm field hardcode vẫn ship ra một mode vô hình, nên bất kỳ câu trả lời nào cho M2-OQ3 đều phải xử lý cả hai nửa. Bằng chứng: `sed -n '96,116p' packages/tui/src/status-line/types.ts` cho thấy năm field. `sed -n '364,410p' packages/tui/src/status-line/segments.ts` cho thấy chuỗi ấy (nhánh plan :369, prewalk :379, goal :385, vibe :390, loop :396-407) và `return { content: "", visible: false };` ở :409. Ngoài lề: `segments.ts:919-947` của plan là record SEGMENTS và CẢ HAI ĐẦU ĐỀU ĐÚNG — :919 mở ra, :947 là `};` đóng; không cần sửa. `id: "mode"` ở :365 (const mở ra ở :364) cũng đúng. |
| `enforcePlanModeWrite` được "gọi từ tầng tool". | vague-but-not-wrong | Có đúng 4 call site và chúng không đồng nhất: `tools/write.ts:778` (op update), `:814` (đường archive, op update), `:842` (đường sqlite, op update), `:859` (op create). Site archive và sqlite truyền một op working-tree trên path không phải file nguồn thuần, nên mỗi cái cần suy luận riêng về quy tắc `workingTree: allow|deny` mới. Liệt kê chúng không tốn chi phí gì và ngăn ba trong bốn cái bị giả định là tương đương. Bằng chứng: `git grep -n enforcePlanModeWrite -- packages/` → 4 site trong write.ts, cộng phần định nghĩa ở plan-mode-guard.ts:127 và file test hiện có. |

## Cần người xác nhận

- **Mâu thuẫn thời điểm bên trong chính đặc tả về M2-OQ3.** Bước 0 ghi "DO THIS BEFORE ANY CODE" và "Everything in steps 3+ is gated on this" — tức quyết định phải có trước bước 3. Nhưng câu hỏi mở đầu tiên lại ghi rõ "Needed before step 6, not before step 0", và bước 6 cũng nói "Implement the M2-OQ3 seam per the step-0 decision". Hai chỗ này không thể cùng đúng. Không tự chọn một trong hai: hãy chốt rõ quyết định M2-OQ3 có chặn bước 3 hay chỉ chặn bước 6, vì bước 3 (lõi registry) có thể làm được mà không cần seam status-line.
- ~~**Cổng hoàn thành tự mâu thuẫn với chính lệnh xác minh khi nói "sáu boolean".**~~ **ĐÃ CHỐT trong lượt kiểm chứng này, không còn cần người quyết.** Điều kiện (2) của cổng và bước 4 giờ nói rõ: `InteractiveModeContext` là một `interface` (`modes/types.ts:108`) nên 189-194 giữ nguyên tên và kiểu `boolean`; cặp accessor thay cho bảy initializer thô trên `InteractiveMode` của class, và cổng grep đo bằng `grep -c` (initializer 7→0, accessor 0→14) chứ không bằng cách đếm tên trong `types.ts`. Còn lại: vì sao bước 4 cần bảy accessor chứ không phải sáu — xem hàng `wrong-count` của bảng Đính chính, đã có câu trả lời.
- **Ranh giới kiểm chứng của fixture `outsider-extension`.** Đặc tả vừa ghi file này "không thể typecheck cho tới khi cả hai tồn tại" (`pi.registerMode` và `pi.registerSetting` đều vắng ở HEAD), vừa yêu cầu fixture KHÔNG có dòng `registerSetting`. Vậy nghĩa là cổng check:ts của wave 5 có thể xanh trong khi `packages/coding-agent/tsconfig.json` vẫn `include "test"`. Cần xác nhận đây là trạng thái được chấp nhận có chủ đích cho tới khi WI-8b đóng M2, chứ không phải một lỗ sót sẽ bị phát hiện muộn.
