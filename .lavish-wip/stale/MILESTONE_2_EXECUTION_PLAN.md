# Neo sai trong MILESTONE_2_EXECUTION_PLAN — 179 mục

Mỗi mục: `cited` (những gì tài liệu đang ghi) và `actual` (chỗ thật, đã đo).
Sửa CHỈ phần `đường/dẫn:số-dòng`. Giữ nguyên mọi văn xuôi quanh nó.

## S1
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1264
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:1293

## S2
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** packages/coding-agent/src/session/agent-session.ts:7406
- **actual:** packages/coding-agent/src/session/agent-session.ts:7552

## S3
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1492
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1516-1517

## S4
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:561
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:563

## S5
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** packages/coding-agent/CHANGELOG.md:1057
- **actual:** packages/coding-agent/CHANGELOG.md:1117

## S6
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** Tiêu đề `## [18.1.16]` ở dòng 1039 (kế hoạch nói header xác nhận ở 1039)
- **actual:** packages/coding-agent/CHANGELOG.md:1099 (và 1039 là dòng trống, 1040 mới là `## [18.1.18]`)

## S7
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** packages/coding-agent/CHANGELOG.md:5 — kế hoạch nói là `## [18.3.3] - 2026-09-27`
- **actual:** packages/coding-agent/CHANGELOG.md:5 = `### Security`; `## [18.3.3] - 2026-09-27` ở dòng 65

## S8
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** packages/coding-agent/CHANGELOG.md:7 — kế hoạch nói `### Added` thuộc về 18.3.3
- **actual:** packages/coding-agent/CHANGELOG.md:7 = entry MCP project-scope config (thuộc ### Security); `### Added` của 18.3.3 ở dòng 67

## S9
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** plan:257 — kế hoạch nói đây là hợp đồng ba câu hỏi chấp nhận
- **actual:** MILESTONE_2_EXECUTION_PLAN.md:414-418

## S10
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** plan:323 — kế hoạch nói đây là M2-OQ5 ở mục "Cần người quyết"
- **actual:** MILESTONE_2_EXECUTION_PLAN.md:489 (tiêu đề `### Cần người quyết` ở 486)

## S11
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** Cảnh báo môi trường: "packages/natives/native/pi_natives.darwin-arm64.node không tồn tại" và hai file test "Hiện không chạy được"
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node TỒN TẠI (build 07:32); `bun test` cho 3 pass / 0 fail

## S12
- **work item:** ## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)
- **cited:** Cổng xác minh 5, lệnh grep OWNER/DATE đầu tiên — kế hoạch mô tả là "trả về hàng tiêu đề mang nhãn OWNER/CHỦ VÀ DATE/NGÀY trong cùng một hàng"
- **actual:** Regex thực tế kiểm VỊ TRÍ Ô (OWNER ở ô thứ 2, DATE ở ô thứ 3) — ĐỎ NHẦM trên bảng 4 cột đúng

## S13
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:481 (plan: khai báo field private #commandDiagnostics)
- **actual:** runner.ts:485 — #commandDiagnostics: Array<{ type: string; message: string; path: string }> = [];

## S14
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1186 (plan: reset this.#commandDiagnostics = [] trong getRegisteredCommands)
- **actual:** runner.ts:1215 — this.#commandDiagnostics = [];

## S15
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1193 (plan: chỗ push duy nhất của chẩn đoán)
- **actual:** runner.ts:1222 — this.#commandDiagnostics.push({ type: "warning", message, path: ext.path });

## S16
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1193-1196 (plan: khối reserved-command chỉ log khi !this.hasUI())
- **actual:** runner.ts:1220-1226 — `if (reserved?.has(command.name)) {` at 1220, `if (!this.hasUI()) {` at 1223, `logger.warn(message);` at 1224

## S17
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1206 (plan: getter getCommandDiagnostics)
- **actual:** runner.ts:1235-1236 — getCommandDiagnostics(): Array<{ type: string; message: string; path: string }> { / return this.#commandDiagnostics;

## S18
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:984 (step 4: neo để thêm #collectToolNameCollisions)
- **actual:** runner.ts:1012 (doc comment) / 1013 (signature) — /** Get the effective registered tool for a name using normal last-extension-wins precedence. */

## S19
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:983 (step 7: neo để mở rộng doc viết luật ra)
- **actual:** runner.ts:1012 — /** Get the effective registered tool for a name using normal last-extension-wins precedence. */

## S20
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1666 (note: export interface RegisteredTool)
- **actual:** types.ts:1691 — export interface RegisteredTool<TParams extends TSchema = TSchema, TDetails = unknown> {

## S21
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1668 (note: RegisteredTool mang extensionPath: string)
- **actual:** types.ts:1693 — extensionPath: string;

## S22
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1676 (step 3: neo chèn ExtensionRegistrationDiagnostic ngay sau RegisteredTool)
- **actual:** types.ts:1701 — `}` closing RegisteredTool (1700 is `sourceInfo: SourceInfo;`)

## S23
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1807 (note: Extension.tools là Map<string, RegisteredTool<any, any>>)
- **actual:** types.ts:1832 — tools: Map<string, RegisteredTool<any, any>>;

## S24
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/src/discovery/helpers.ts:763 — claimed `allPaths.sort` insertion point is loader.ts:659 (VERIFIED CORRECT, listed here only because the plan's stated line 659 is where sort goes, while its step-1 body text writes the comment as 'loader.ts:659' and step 7's shape header says 'loader.ts:659' — both consistent with 660)
- **actual:** loader.ts:660 — return allPaths; (awk 'NR>=658 && NR<=661' confirms 659 is blank)

## S25
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** packages/coding-agent/CHANGELOG.md:5 (note: '## [18.3.3]' bắt đầu ở dòng 5 và là bất biến')
- **actual:** CHANGELOG.md:5 is `### Security` (inside ## [Unreleased], with an entry at :7). The first released section is `## [18.4.0] - 2026-09-28` at CHANGELOG.md:9.

## S26
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** ENVIRONMENT CLAIM: 'Bị CHẶN cho tới khi có native addon. bun test hiện chết ngay ở bước import: "Failed to load pi_natives native addon for darwin-arm64" — đo được 0 pass / 1 fail / 1 error' (Xác minh section)
- **actual:** STALE — cd packages/coding-agent && bun test test/extension-loader-concurrency.test.ts → `2 pass / 0 fail / 15 expect() calls / Ran 2 tests across 1 file [597.00ms]`. No native-addon blocker; `bun --cwd=packages/natives run build` is not required.

## S27
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** ENVIRONMENT CLAIM: 'HEAD là 808b365 trên nhánh milestone-1' (Đính chính row 6)
- **actual:** STALE — HEAD is 65cc6c1 on branch milestone-1 (`test(coding-agent): opt in explicitly where the suite is about parsing`).

## S28
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** ENVIRONMENT CLAIM: '## [Unreleased] tồn tại ở dòng 3 và hiện đang rỗng; ## [18.3.3] bắt đầu ở dòng 5'
- **actual:** STALE — `## [Unreleased]` at :3 is correct, but it is NOT empty: it contains `### Security` at :5 with an entry at :7 about project-scope MCP config. The new `### Changed` section must be inserted AFTER :7.

## S29
- **work item:** WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra
- **cited:** GATE CLAIM: '(4) KHÔNG HỒI QUY (chỉ phần có tác dụng thật): bun test test/extensions-discovery.test.ts vẫn xanh — nó là bảo đảm không hồi quy cho toàn bộ đường discovery'
- **actual:** FALSIFIED EMPIRICALLY — I replaced helpers.ts:763 with the exact harmful in-place sort `(await readDirEntries(dir)).sort(...)` and ran: `bun test test/extensions-discovery.test.ts` → 35 pass / 0 fail; `bun test test/discovery/ test/capability/ test/skillshare/discovery.test.ts` → 217 pass / 0 fail. The gate never goes red. Cause: the multi-extension assertions are length-only (extensions-discovery.test.ts:310 `toHaveLength(2)`, :401 `toHaveLength(3)`), not order-sensitive. File restored; `git diff` clean.

## S30
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/tui/src/tools/index.ts:35
- **actual:** packages/tui/src/tools/index.ts:35

## S31
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/tui/src/tools/index.ts:70
- **actual:** packages/tui/src/tools/index.ts:70

## S32
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/tui/src/tools/index.ts:73
- **actual:** packages/tui/src/tools/index.ts:73

## S33
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/tui/src/tools/xdev.ts:48
- **actual:** packages/tui/src/tools/xdev.ts:48

## S34
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/tui/src/chat/tool-execution.ts:17,355
- **actual:** packages/tui/src/chat/tool-execution.ts:17,355

## S35
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/coding-agent/src/cli/gallery-cli.ts:16,141,307,344
- **actual:** packages/coding-agent/src/cli/gallery-cli.ts:16,141,307,344

## S36
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/coding-agent/test/gallery-cli.test.ts:18,79
- **actual:** packages/coding-agent/test/gallery-cli.test.ts:18,79

## S37
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/coding-agent/test/tools/apply-patch-renderer.test.ts:8,29,77,90
- **actual:** packages/coding-agent/test/tools/apply-patch-renderer.test.ts:8,73,86 — only 3 hits, not 4

## S38
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** "Có đúng 14 tham chiếu toolRenderers trong repo, trên 5 file"
- **actual:** 13 hits across 5 files (gallery-cli.ts 4, gallery-cli.test.ts 2, apply-patch-renderer.test.ts 3, tool-execution.ts 2, tools/index.ts 2)

## S39
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/tui/package.json:93-96 (plan) and 94-97 (plan's own correction)
- **actual:** packages/tui/package.json:94-97 — plan's correction is right, the original 93-96 is off by one. Entry "./tools" actually used by repo consumers is at line 86 (separate, not shadowed by the wildcard)

## S40
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1322
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1322 is now `on(event: "session_compact", handler: ExtensionHandler<SessionCompactEvent>): void;` — the plan's correction claimed line 1322 was `tool_execution_end`; it has drifted further. Real anchors: interface ToolDefinition at 638, renderCall? at 694, renderResult? at 697, registerTool<TParams at 1372

## S41
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:54-62 (plan), corrected twice to 54-63 and then 54-66
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:84-99 — `if (registeredTool.definition.renderCall) {` at 84, `if (registeredTool.definition.renderResult) {` at 92, closing brace at 99. All three cited ranges are wrong: 62 is the class declaration, 69-70 are the field declarations. wrapRegisteredTools is at 141

## S42
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** packages/tui/src/theme/theme.ts:3
- **actual:** packages/tui/src/theme/theme.ts:3 — line is correct, but the BLOCKING MECHANISM IS GONE. pi_natives.darwin-arm64.node (185 MB) is now present, so the import graph loads fine

## S43
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** Verification command + the entire "CẦN BUILD ADDON TRƯỚC" section, and completion gate (c) "both test files committed though they cannot run here"
- **actual:** STALE as a gate. bun test WORKS for both packages: countdown-timer.test.ts 2 pass, apply-patch-renderer.test.ts 7 pass, and both new WI-4 test files run green (3 pass / 1 pass). bazel/bazelisk absent but ninja present at /opt/homebrew/bin/ninja and unused

## S44
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** Plan's gate (a) type-level assertion placed inline in the test body
- **actual:** packages/tui/test/tool-renderers-frozen.test.ts — plan's shape FAILS at runtime with `TypeError: Attempting to define property on object that is not extensible` because the test file is ESM strict-mode. Correct shape wraps the assignment in a never-called function

## S45
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** Plan's step 5 (coding-agent test) — no call-signature given
- **actual:** packages/agent/src/types.ts:1179 — renderResult takes THREE args (result, options, theme). Passing a 4th yields `error TS2554: Expected 3 arguments, but got 4`

## S46
- **work item:** WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu
- **cited:** Plan's claim that `Object.freeze` alone is a runtime guard and that the Readonly half is the addition
- **actual:** MEASURED, both halves are independently required. Drop Readonly keeping freeze -> check:ts RED with TS2578 but bun test still 3 pass. Keep Readonly drop freeze -> check:ts green but bun test RED. A bare Object.freeze with no Readonly is invisible to every gate

## S47
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1256-1582 là span của ExtensionAPI
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1277 (đóng ở 1607; khai báo top-level kế tiếp export interface ProviderConfig ở 1614)

## S48
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** Bảng "Đính chính so với plan" của chính tài liệu: `export interface ExtensionAPI` ở :1256, đóng ở :1582, `ProviderConfig` ở :1589
- **actual:** 1277 / 1607 / 1614 — phần đính chính của tài liệu tự sai, lệch cùng bậc +21/+25/+25

## S49
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1430 — method cạnh đó là registerFlag
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1455 (JSDoc "Register a CLI flag." ở 1454)

## S50
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1802-1817 — interface Extension
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1827-1842 (đóng ở 1842)

## S51
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1231-1557 — claim gốc của plan về span ExtensionAPI
- **actual:** types.ts:1277-1607

## S52
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/config/all-settings.ts:43-77 — mảng DOMAINS
- **actual:** packages/coding-agent/src/config/all-settings.ts:44-79

## S53
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/config/all-settings.ts — DOMAINS có 33 entry
- **actual:** 34 entry (:45-78)

## S54
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/config/all-settings.ts:85-89 — memo ordered
- **actual:** packages/coding-agent/src/config/all-settings.ts:87 (:85 là '];' đóng PLACED_DOMAINS)

## S55
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/config/all-settings.ts:88-123 — hàm orderedSettings
- **actual:** packages/coding-agent/src/config/all-settings.ts:90-125 (file dài 125 dòng)

## S56
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/src/config/all-settings.ts:92-106 — domainHandles
- **actual:** packages/coding-agent/src/config/all-settings.ts:94-108

## S57
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** packages/coding-agent/test/config/ giữ bảy file test
- **actual:** 6 file: compaction-threshold, model-registry, models-config-validation, settings-panel-clear, settings-registry, settings-reload

## S58
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9923 — chỗ văn xuôi nhắc "registered twice"
- **actual:** Dòng 9923 là `### Các bước`. Các hit thật: 8158, 8224, 8484, 8500, 8502, 10275, 10277, 26017

## S59
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** "lệnh không giới hạn phạm vi thì trả 3 kết quả" cho git grep "registered twice"
- **actual:** Nhiều hơn nhiều — gồm MILESTONE_2_EXECUTION_PLAN.md, COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md, RESEARCH_DSH_OMO_2026-09-28.md, docs/secrets.md, registry.ts:787

## S60
- **work item:** WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)
- **cited:** Bảng "File cần chạm tới" không liệt kê createExtension
- **actual:** packages/coding-agent/src/extensibility/extensions/loader.ts:374-390

## S61
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:537 — `#fileFallbackDisposers` field declaration
- **actual:** runner.ts:541 — `#fileFallbackDisposers: Array<() => void> = [];` (line 537 is a doc-comment line: "trampoline at all, which keeps the registry empty for a host with no fallbacks;")

## S62
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:778 and runner.ts:797 — the two push sites in initialize()
- **actual:** runner.ts:781 (`this.#fileFallbackDisposers.push(`) with addFileWriteFallback at 782; runner.ts:800 (`push(`) with addFileDeleteFallback at 801

## S63
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:410 — session-shutdown call site of disposeFileFallbacks()
- **actual:** runner.ts:414 — `extensionRunner.disposeFileFallbacks();` (line 410 is `type: "session_shutdown",`)

## S64
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:747 — re-initialize guard call site
- **actual:** runner.ts:751 — `this.disposeFileFallbacks();` (line 747 is blank)

## S65
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:1346-1348 — disposeFileFallbacks() body
- **actual:** runner.ts:1375-1377. NOTE: the plan contradicts ITSELF — its own Cordis section cites runner.ts:1375-1376, which is the correct location. Only one of the two can be right; 1375-1377 is.

## S66
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:970 — 'setSuspendedExtensions ends at line 970'; also step 9's anchor for inserting unloadExtension
- **actual:** runner.ts:999 (the closing `}`). Line 970 is the FIRST line of the method's doc comment; the method itself is at 976. Off by 29 AND the anchor points at the start of the doc block rather than the end of the method.

## S67
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:947 — step 10's anchor (setSuspendedExtensions)
- **actual:** runner.ts:976. Line 947 is blank.

## S68
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:937 — isExtensionActive
- **actual:** runner.ts:966 — `isExtensionActive(extensionPath: string): boolean { return this.extensions.some(ext => ext.path === extensionPath); }`

## S69
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:1094-1096 — getFlagValues()
- **actual:** runner.ts:1123-1125. Line 1094 is the doc comment of getComposerShapes() and 1095-1100 is that method's body. The single most dangerous stale anchor in the item: an implementer who trusts it edits the wrong method.

## S70
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:1098 (and 1099 in the corrections table) — setFlagValue
- **actual:** runner.ts:1127-1129 — `setFlagValue(name: string, value: boolean | string): void { this.runtime.flagValues.set(name, value); }`

## S71
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:713 / runner.ts:713-715 — the post-initialize provider rebind that drops sourceId
- **actual:** runner.ts:714-716 (registerProvider, keeps sourceId) and runner.ts:717-719 (unregisterProvider, drops it)

## S72
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:997 — onToolRegistered signature
- **actual:** runner.ts:1026

## S73
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:1027-1040 — the per-extension listener wrapper
- **actual:** runner.ts:1056-1068

## S74
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:1044-1048 and runner.ts:1031-1035 (original claim) — the disposer
- **actual:** runner.ts:1073-1077. The plan's substantive claim is CONFIRMED: it closes over a local `subscriptions` array (declared 1027, pushed 1071) and cancels one registration across ALL extensions simultaneously.

## S75
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:755 — the condition that installs trampolines
- **actual:** runner.ts:759 — `if (ext.fileWriteFallbackHandlers.length === 0 && ext.fileDeleteFallbackHandlers.length === 0) continue;`. The invariant comment block the plan cites is 750-758, not 750-755.

## S76
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:749 — getLoadedExtensions() inside initialize()
- **actual:** runner.ts:753 — `for (const ext of this.getLoadedExtensions()) {`. Line 749 is a comment. getLoadedExtensions' body is 962 (`return this.#loadOrder ?? this.extensions;`)

## S77
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:1304-1306 (and 1290-1292 in the original claim) — the timer trio
- **actual:** runner.ts:1333-1335

## S78
- **work item:** WI-9. unloadExtension
- **cited:** runner.ts:1501-1511 — session_shutdown, 'Promise.all try/catch theo handler'
- **actual:** runner.ts:1501-1514, with `await Promise.all(promises)` at 1512. The try/catch containment is NOT here — it lives in #runHandlerWithTimeout at runner.ts:1404. The plan's mechanism description is imprecise though its conclusion (omp already satisfies the invariant) is right.

## S79
- **work item:** WI-9. unloadExtension
- **cited:** types.ts:1738 and types.ts:1739 — ExtensionRuntimeState declaration and its flagValues field
- **actual:** types.ts:1763 (`export interface ExtensionRuntimeState {`) and types.ts:1764 (`flagValues: Map<string, boolean | string>;`). Off by 25.

## S80
- **work item:** WI-9. unloadExtension
- **cited:** types.ts:1745 — unregisterProvider(name, sourceId) signature, cited as the shape precedent to reflect
- **actual:** types.ts:1770 — `unregisterProvider(name: string, sourceId: string): void;`. Off by 25. The plan's own 'needs human confirmation' item #3 calls this 'two lines below' types.ts:1739; the real gap is 6 lines (1764 to 1770).

## S81
- **work item:** WI-9. unloadExtension
- **cited:** types.ts:1801-1817 — interface Extension, the 11 buckets
- **actual:** types.ts:1827-1842. Off by 26.

## S82
- **work item:** WI-9. unloadExtension
- **cited:** types.ts:1806-1816 (bucket list) and types.ts:1808 / types.ts:1783 (toolRegistrationListeners)
- **actual:** types.ts:1831-1841 for the bucket list; toolRegistrationListeners is at types.ts:1833. Off by 25 (and 50 for the 1783 variant). The plan's count of 11 buckets is CONFIRMED: handlers 1831, tools 1832, toolRegistrationListeners 1833, assistantThinkingRenderers 1834, fileWriteFallbackHandlers 1835, fileDeleteFallbackHandlers 1836, messageRenderers 1837, composerShapes 1838, commands 1839, flags 1840, shortcuts 1841.

## S83
- **work item:** WI-9. unloadExtension
- **cited:** main.ts:2210 and main.ts:2207-2212 — the extensionFlagSink literal and its flagValues.set
- **actual:** main.ts:2220-2225 (literal), with the write at main.ts:2223 — `extensionsResult.runtime.flagValues.set(name, value);`. Off by 13.

## S84
- **work item:** WI-9. unloadExtension
- **cited:** main.ts:543-544 — the 'fourth writer' that must be migrated
- **actual:** main.ts:551-553 — and the plan's claim is an OVER-CLAIM. This is a pure passthrough: `setFlagValue: (name, value) => { runner.setFlagValue(name, value); }`. runner.setFlagValue's signature does not change, so this call site typechecks unchanged and needs no edit. There are THREE direct flat writers (loader.ts:265, runner.ts:1128, main.ts:2223), not four.

## S85
- **work item:** WI-9. unloadExtension
- **cited:** package.json:94 — the check:ts gate command
- **actual:** package.json:90 — `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",`. Line 94 is `"lint:ts"`.

## S86
- **work item:** WI-9. unloadExtension
- **cited:** WI-19 note: 'WI-0 đã đối chiếu lại với HEAD và ghi neo là runner.ts:1264 và agent-session.ts:7406'
- **actual:** runner.ts:1293 and agent-session.ts:7552 — BOTH are exactly where the original gap register put them. The note claiming WI-0 re-verified them as 1264/7406 is WRONG in the same direction and by the same ~29-line drift as every other runner.ts anchor.

## S87
- **work item:** WI-9. unloadExtension
- **cited:** Verification claim: 'bun test needs the native addon built first; otherwise 0 pass / 1 fail with Failed to load pi_natives native addon for darwin-arm64 — reproduced by running test/extension-flag-dispatch.test.ts'
- **actual:** STALE — the addon is already built. `bun test packages/coding-agent/test/extension-flag-dispatch.test.ts` reports 1 pass / 0 fail (the exact file the plan cites as reproducing the failure), and `extensions-runner.test.ts` reports 87 pass / 0 fail. The discriminating gate runs today with no build step.

## S88
- **work item:** WI-9. unloadExtension
- **cited:** Cordis `core/src/utils.ts:26-30` — DisposableList.clear() returning values.reverse(), the LIFO reference
- **actual:** deepseek-harness/vendor/cordis/src/utils.ts:27-31 — `clear() { const values = [...this.map.values()]; this.map.clear(); return values.reverse(); }`. Off by one AND the path is wrong: the vendored tree has no `core/` segment.

## S89
- **work item:** WI-9. unloadExtension
- **cited:** `shared.ts:66` — cordis-plugin-logger-console calls console.log
- **actual:** deepseek-harness/vendor/logger-console/src/shared.ts:70 — `// eslint-disable-next-line no-console` / `console.log(this.render(message))`. Line 66 is `}`. Off by 4.

## S90
- **work item:** WI-9. unloadExtension
- **cited:** managed-timers.ts:22-68 — ManagedTimers as prerequisite evidence
- **actual:** managed-timers.ts:22-75. `#timers = new Set<Timer>()` at 23, `clear(timer)` at 51, `clearAll()` at 58-64. Range slightly off but the claim is CONFIRMED: flat Set, only clear/clearAll, and `grep clearExtension` returns 0 hits.

## S91
- **work item:** WI-9. unloadExtension
- **cited:** 'unregisterProvidersForSource chưa tồn tại (grep rỗng) — đây là câu hỏi duy nhất quyết định unload có thật sự giải phóng hết không'
- **actual:** The symbol is indeed absent (grep confirms), but the plan's framing that this needs new design is an over-estimate. model-registry.ts:303-304 already holds `#runtimeProvidersBySource: Map<string, Set<string>>` and `#runtimeProviderSourceByName: Map<string, string>`, and unregisterProvider at model-registry.ts:2936-2945 already walks name->sourceId through that index. Separately, loader.ts:366-367 DOES pass `this.extension.path` as sourceId — the plumbing exists and dies one frame later at loader.ts:108, a link the plan never mentions. A real unregisterProvidersForSource is ~5 lines on existing state.

## S92
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:230
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:232 (marker); interface tại :237

## S93
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:395
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:397 (marker); interface tại :454

## S94
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:568
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:570 (marker); interface tại :574

## S95
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1227
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1248 (marker); interface tại :1251 — lệch 21 dòng

## S96
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** docs/extensions.md:901-909
- **actual:** docs/extensions.md:904-912 — tiêu đề 904, "Use the right surface:" 906, ba bullet 908/909/910, câu kết 912. Lệch đều +3.

## S97
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** docs/extensions.md:905
- **actual:** docs/extensions.md:908

## S98
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts (1649 dòng)
- **actual:** 1658 dòng

## S99
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/legacy-pi-ai-shim.ts (179 dòng)
- **actual:** 194 dòng

## S100
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** Tổng năm shim = 4833 dòng
- **actual:** 4857 dòng (1658 + 2783 + 194 + 179 + 43)

## S101
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** MILESTONE_2_EXECUTION_PLAN.md:4531-4532 (ràng buộc của WI-5)
- **actual:** MILESTONE_2_EXECUTION_PLAN.md:2037 (bước 8 của WI-5) và :2217

## S102
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** MILESTONE_2_EXECUTION_PLAN.md:6669-6673 (bán kính ảnh hưởng của M2-OQ2)
- **actual:** MILESTONE_2_EXECUTION_PLAN.md:230 (hàng open-questions) và :475-478 (danh sách blocks của WI-0)

## S103
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** Các dòng plan 5894, 5900, 5915, 5898, 5911, 5933, 4734, 4696, 4697, 4609, 4441 (mọi dòng trong bảng 'Đính chính so với plan' của WI-10)
- **actual:** Không dùng lại được — 5894/5900/5915/5898/5911/5933/4734 vượt cuối file (5408 dòng) hoặc trống; 4609/4441/4696/4697 trỏ nội dung không liên quan

## S104
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1256 = `export interface ExtensionAPI` (đính chính 1 của WI-10)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1277 — 1256 là dấu `}` đóng RegisteredCommand

## S105
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1660 = `ExtensionFactory` (đính chính 1)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1685

## S106
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1570 (khai báo `pi.registerProvider`, đính chính 3)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1595; một khai báo thứ hai ở :1768

## S107
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** sdk.ts:1007 và :2489 phát lại `pendingProviderRegistrations` (đính chính 3)
- **actual:** packages/coding-agent/src/sdk.ts:1018-1021 và :2500-2504 — file nằm ở src/sdk.ts, KHÔNG dưới extensibility/extensions/

## S108
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** packages/coding-agent/CHANGELOG.md — '## [Unreleased] hiện đang rỗng'
- **actual:** packages/coding-agent/CHANGELOG.md:3 là `## [Unreleased]`, nhưng `### Security` ở :5 với một entry thật ở :7

## S109
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** Mục phát hành kế tiếp trong CHANGELOG.md là `## [18.3.3] - 2026-09-27` ở dòng 5
- **actual:** packages/coding-agent/CHANGELOG.md:9 là `## [18.4.0] - 2026-09-28`; `## [18.3.3]` ở :65

## S110
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** Neo changelog của WI-0: 'dòng 1057, mục #7955'
- **actual:** packages/coding-agent/CHANGELOG.md:1117 (mục #7955); dòng 1057 là một mục `models.yml` không liên quan

## S111
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** package.json:94-95 (glob của `bun run check:ts`)
- **actual:** package.json:91 (`check:tools`) và :99 (`fmt:tools`); 94 là `lint:ts`, 95 là `lint:tools`

## S112
- **work item:** WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code) — MILESTONE_2_EXECUTION_PLAN.md dòng 3983-4171
- **cited:** Số file test khớp `^extension` = 15 (đính chính 7)
- **actual:** 16 file

## S113
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:1256-1582 is ExtensionAPI
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1277-1607 (line 1256 is `}`, line 1582 is a doc-comment fragment ` *       input: ["text", "image"],`)

## S114
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:452-562 is ExtensionContext
- **actual:** types.ts:454-563 (line 452 is `}` closing the previous interface)

## S115
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:1489 is the appendEntry signature
- **actual:** types.ts:1514 (line 1489 is `\t// Actions`)

## S116
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:1752 is the appendEntry handler type
- **actual:** types.ts:1777 (line 1752 is `export type SetModelHandler = ...`)

## S117
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:1768 is ExtensionContextActions
- **actual:** types.ts:1793 (line 1768 is `registerProvider(name: string, config: ProviderConfig, sourceId: string): void;`)

## S118
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:1578 is unregisterProvider, the only unregister seam
- **actual:** types.ts:1603 (line 1578 is a doc-comment fragment)

## S119
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:506 is `memory?: MemoryRuntimeContext;`
- **actual:** types.ts:508 (line 506 is `runEphemeralTurn?(options: EphemeralTurnOptions): ...`)

## S120
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:494 and types.ts:561 are the two isProjectTrusted declarations
- **actual:** types.ts:496 and types.ts:563 (494 and 561 are both `/** ... */` comment lines)

## S121
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** types.ts:480-481 is `memory?: MemoryRuntimeContext` (original claim)
- **actual:** types.ts:508 (line 480 is `isIdle(): boolean;`)

## S122
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** docs/extensions.md:699 is `## Session and state patterns`
- **actual:** docs/extensions.md:702 (line 699 is blank)

## S123
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** docs/extensions.md:701-722 is the appendEntry guidance
- **actual:** docs/extensions.md:704-725 ('For durable extension state:' at 704, items at 706-708, code block closes 725)

## S124
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** docs/extensions.md:699-723 is the whole 'Session and state patterns' section
- **actual:** docs/extensions.md:702-726 (next heading `### Session-entry roles` at 727)

## S125
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** runner.ts:694 is `this.runtime.appendEntry = actions.appendEntry;`
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:698 (line 694 is `): void {`)

## S126
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** runner.ts:1303 is `memory: this.#getMemoryFn?.()`
- **actual:** runner.ts:1332

## S127
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** sdk.ts:3080 is createSessionMemoryRuntimeContext
- **actual:** packages/coding-agent/src/sdk.ts:3093 (import is at :146)

## S128
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** dirs.ts:652-654 is getPluginsLockfile
- **actual:** packages/utils/src/dirs.ts:662-664 (652-654 is getPluginsNodeModules)

## S129
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** dirs.ts:1046-1048
- **actual:** dirs.ts:1045-1050

## S130
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** git HEAD is 808b365
- **actual:** 65cc6c1 on branch milestone-1

## S131
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:5961 contains the verbatim quote "cleanup khi uninstall không thi triển khả thi tới khi WI-9 có một unload thật"
- **actual:** Line 5961 is `- Cổng Wave 4 — mọi wave M2 sau đều coi suspend là đáng tin; đây là tiền đề làm cho điều đó thành hiện thực.` The quoted sentence occurs only at 9155 and 9215 — both inside the WI-11 section itself (which sits at 9125+ of the same 26328-line file)

## S132
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** plan §8.2 verbatim: "Có kéo build này vào M2 hay không, ai làm, ở milestone nào — cả ba đều chưa được gán"
- **actual:** grep -c = 1, at COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9270 — WI-11's own 'Chặn' bullet. No `## 8.` or `### 8.2` heading carries this text

## S133
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** plan §11.3 verbatim: "M3 cần: một bề mặt authoring đã chốt ... và một `unload` thật để cài/gỡ không rò"
- **actual:** Only at COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9272, inside WI-11's own 'Chặn' section

## S134
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** plan §11.3 verbatim on M4 ownership
- **actual:** Only at COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9273, same WI-11 'Chặn' section

## S135
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** plan §10 M2-OQ2 blocks "substrate của WI-11/WI-12"
- **actual:** Only at 9287 and 9301, both inside WI-11's own 'Cần người quyết' and 'Đính chính' sections

## S136
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** plan §6.1: "WI-0 chặn WI-10 vì ...; WI-10 chặn WI-7 ... và WI-11/WI-12."
- **actual:** Only at 9301, inside WI-11's own correction table

## S137
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** registry.ts:786-792 (capability registry)
- **actual:** File does not exist — packages/coding-agent/src/capability/ has index.ts and per-capability files, no registry.ts

## S138
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** `~/.omp/extensions-state/<extension-id>.json` follows the existing getPluginsDir() convention
- **actual:** getPluginsDir is XDG-aware: on Linux with XDG_DATA_HOME set it resolves to $XDG_DATA_HOME/omp/plugins, not ~/.omp/plugins. The literal `~/` path is macOS-only. The gate `grep -nE '`~/[^`]+`'` therefore forces the doc to state a path that is wrong on Linux

## S139
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** `bun test` needs the native addon built first (brew install ninja + bun --cwd=packages/natives run build)
- **actual:** Already present: packages/natives/native/pi_natives.darwin-arm64.node

## S140
- **work item:** WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)
- **cited:** ExtensionAPI has 74 methods / 80 member declarations
- **actual:** Recount over types.ts:1278-1607 gives 75 methods + 6 properties (logger, typebox, arktype, zod, pi, events) across 35 unique names. Off by one; do not put '74' in the doc as a measured fact. (The 26-unique/27-declared count for ExtensionContext IS exact.)

## S141
- **work item:** WI-SESSION-LOG. Session log là nguồn sự thật duy nhất (MILESTONE_2_EXECUTION_PLAN.md:268-313; hàng Định nghĩa hoàn thành :5376)
- **cited:** `assistant/chunk` — plan:289 lists it as a durable log event that is deliberately not projected to the transcript ("không có dấu — assistant/chunk, turn boundary. Log có đầy đủ, transcript vắng mặt một cách đúng đắn")
- **actual:** `packages/session/session-format-v0-to-v1/src/codec.ts:289` (`type: 'assistant/chunk',`) and `packages/session/session-format-v0-to-v1/src/dispositions.ts:46` (`'assistant/chunk': disposition(['turn', 'step', 'chunk']),`)

## S142
- **work item:** WI-SESSION-LOG. Session log là nguồn sự thật duy nhất (MILESTONE_2_EXECUTION_PLAN.md:268-313; hàng Định nghĩa hoàn thành :5376)
- **cited:** plan:292 — "Kiểu sự kiện bền vững: `session/created`, `turn/start|end`, `step/start`, `user/message`, `assistant/attempt|chunk|message`, `tool/call|result`, `request/header`, `session/flush`, `session/disposed`"
- **actual:** `session/created` → `packages/core/session/src/index.ts:55`; `session/disposed` → `:65`; `session/flush` → `:86`. All three sit inside `declare module '@deepseek-ai/cordis' {` at `index.ts:38` and none appears in `KNOWN_SESSION_EVENT_TYPES`.

## S143
- **work item:** WI-PRESTEP-1. Ghi durable turn khi bị chặn
- **cited:** MILESTONE_2_EXECUTION_PLAN.md:359 — "**Phụ thuộc:** WI-1 (session log)."
- **actual:** MILESTONE_2_EXECUTION_PLAN.md:619 — "## WI-1. Gán timer và model-provider theo đúng extension đã tạo ra chúng, và thả chúng khi suspend"; phần "Thay đổi gì" ở dòng 621 nói về interval và model provider của extension, không liên quan gì tới session log.

## S144
- **work item:** WI-PRESTEP-1. Ghi durable turn khi bị chặn
- **cited:** MILESTONE_2_EXECUTION_PLAN.md:365-366 (lặp lại ở :5377) — "Cổng hoàn thành: một lượt bị chặn vẫn truy vết được sau khi restart, và transcript mặc định không hiển thị nó trừ khi người dùng mở."
- **actual:** Không tồn tại. rg -rn "blockedTurn|blocked_turn|revealBlocked|droppedTurn" --type ts packages/ → rỗng; không có lệnh nào chứa "blocked" hay "dropped" trong packages/coding-agent/src/commands/. Cổng nói "trừ khi người dùng mở" nhưng cái "mở" đó chưa được đặt tên ở bất kỳ đâu.

## S145
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** packages/tui/src/overlays/hook-editor.ts (no line; spec calls it the hook-editing overlay with a per-handler `enabled` column, 'file dài 277 dòng', and says NOT to build a new overlay)
- **actual:** packages/tui/src/overlays/hook-editor.ts — 277 lines confirmed exact (wc -l), but the file is `export class HookEditorComponent extends OverlayPanel implements Focusable` (line 35): a multi-line TEXT editor dialog handling Enter / Ctrl+Q / bracketed paste / Escape / Ctrl+G, with `promptStyle` mode. No table, no array, no render loop over rows, no `enabled` identifier, no per-handler concept anywhere in the file. Imported by advisor-config.ts:36, input-controller.ts:22, extension-ui-controller.ts:29, interactive-mode.ts:214, modes/types.ts:40 — all 'open a text input dialog'. The other candidate, packages/tui/src/overlays/hooks-selector.ts's neighbour hook-selector.ts (639 lines), is also a dialog (ask/confirm slider), also not a table.

## S146
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** 'Bị chặn cho tới khi có native addon: bun test chết ngay ở bước import với "Failed to load pi_natives native addon for darwin-arm64". Gỡ chặn bằng bun --cwd=packages/natives run build'
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node exists. `bun test` runs green with no build step.

## S147
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** 'đường nạp hook bị chặn' promised in 'Thay đổi gì', in 'Người dùng thấy', and asserted by gate (2)
- **actual:** No step in the spec's 5 steps installs a block. Step 1 = union, step 2 = stable key, step 3 = currentHash, step 4 = config record, step 5 = display column. And the runtime hook machinery has no production call site: `grep -rn discoverAndLoadHooks packages/ | grep -v node_modules` returns exactly one line, its own definition at packages/coding-agent/src/extensibility/hooks/loader.ts:220. `grep -rn 'HookRunner(' packages/coding-agent/src/` returns nothing — HookRunner is constructed only in tests (compaction-hooks.test.ts:110, hook-tool-wrapper-input.test.ts:47). packages/coding-agent/src/index.ts does not re-export ./extensibility/hooks. All production imports of extensibility/hooks/* are type-only (HookUIContext, HookCommandContext).

## S148
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** 'Đính chính so với plan' row 1: the gap-register anchors `extensibility/extensions/types.ts:490-494` and `:552-563` are STALE; use WI-0's `:487-494` and `:548-561` instead
- **actual:** The 'correction' is worse than what it corrects. :490 = ' * Whether the current project/workspace is trusted. OMP performs no' (verified), :494 = ' * `SettingsManager` accepts a `projectTrusted` flag.' (verified) — so :490-494 is exactly the 5 prose lines, precise. For the second comment, :552 starts ONE line into the prose (:551 is the first line) and :563 overshoots past the closing `*/` at 562 to include the method signature. WI-0's alternatives: :487 = '/** Identity of the agent this session runs…', i.e. the PREVIOUS member's comment; :548 = '): Promise<AgentToolResult<TDetails>>;', the previous member's signature. Both point at the wrong member.

## S149
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** Milestone-wide note (plan line 5403) says the gap-register used `runner.ts:1293` and `agent-session.ts:7552` for isProjectTrusted, while WI-0 re-verified `:1264` and `:7406`
- **actual:** WI-14's numbers are EXACT: packages/coding-agent/src/extensibility/extensions/runner.ts:1293 and packages/coding-agent/src/session/agent-session.ts:7552 are both `isProjectTrusted: () => true,` (verified). WI-0's 'verified' alternatives are wrong: runner.ts:1264 = ' * names an existing native built-in, the context carries an `invokeTool` that runs it (see' (a docblock about native built-ins); agent-session.ts:7406 = '// before the model request. A user-invoked `/skill:<name>` arrives as a' (a comment about skill commands). Neither mentions isProjectTrusted.

## S150
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** 'packages/coding-agent/src/config/settings.ts | sửa | Thêm HookStateToml { enabled?; trustedHash? } lưu cạnh config, đọc qua đường sự thật đã có sẵn: SettingProvenance sáu lớp'
- **actual:** Half right, half wrong. `SettingProvenance` IS at settings.ts:62 with exactly six values — `export type SettingProvenance = 'env' | 'runtime' | 'overlay' | 'project' | 'global' | 'default';` (verified) — and getProvenance is at settings.ts:800 (verified). But settings.ts (3798 lines) is the `Settings` CLASS implementation and declares no settings at all; `grep -n 'hook' config/settings.ts` returns only line 13, an unrelated `AsyncLocalStorage` import. Settings are declared via `register()` in a domain module and collected by config/all-settings.ts.

## S151
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** 'Cột `enabled` per-handler là cột thứ hai trong cùng bảng đó' (in both the file table and step 5)
- **actual:** There is no per-handler `enabled` boolean anywhere. `grep -rn 'disabledHooks|enabledHooks|hooksEnabled' packages/` returns EMPTY. The only `enabled` flags in the extension UI are per-MCP-server (modes/components/extensions/mcp-runtime.ts:26, dashboard-runtime.ts:40-52) and per-provider (tui/src/overlays/extensions/types.ts:4-10 ExtensionProvider.enabled, types.ts:113 ProviderTab.enabled). The only way to disable a hook today is the shared `disabledExtensions` set consumed at state-manager.ts:236 via resolveState.

## S152
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** '`contentHash` / `trustState` chỉ trúng `blob-broker/provider-file-types.ts`' and the Đính chính row marking this claim VERIFIED
- **actual:** `trustState` = 0 hits anywhere (this part is true and is the part that matters). `contentHash` is NOT one file — 6 production files plus 4 test files: src/blob-broker/provider-file-types.ts, src/blob-broker/provider-files.ts, src/blob-broker/service.ts, src/cli/images-cli.ts, src/ida/store.ts, packages/tui/src/overlays/plan-review-overlay.ts. All are upload-cache hashing or plan-review section hashing; none is hook trust.

## S153
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** '`approvedHooks` / `hookApproval` / `consentPrompt` chỉ trúng một tên trong protobuf của Cursor tại packages/catalog/src/discovery/cursor-proto.ts'
- **actual:** 4 hits, not 1, though all in the right file. packages/catalog/src/discovery/cursor-proto.ts:595, :611, :6242, :6266 — all the name `hookApprovalRequirement` (a Cursor proto field of type ShellHookApprovalRequirement). `approvedHooks` = 0 hits, `consentPrompt` = 0 hits.

## S154
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** 'Hai file test sẵn có — KHÔNG do mục này viết ra. test/hook-editor.test.ts và test/extension-context-project-trust.test.ts' and gate (3) which scores only those two
- **actual:** A third trust test exists and is never mentioned: packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts (2 cases, both asserting `ctx.isProjectTrusted()` is a function and returns `true`, one for `createContext()` and one for `createCommandContext()`). It would go red for exactly the same reason as the named one if `isProjectTrusted` were touched.

## S155
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** Gate (2): 'NHÁNH PHỦ ĐỊNH: dưới ngưỡng chặn, mọi thứ phải y hệt hôm nay — một hook chưa từng bị sửa sau lần duyệt vẫn nạp và chạy'
- **actual:** Cannot go red. It names no command — `check:ts` is a compile gate and cannot observe runtime hook-load behaviour — and, per the missing-block finding, no step installs anything that could regress. It would stay green after writing only the union and the display column.

## S156
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** Gate (3): 'HAI TEST SẴN CÓ: test/hook-editor.test.ts và test/extension-context-project-trust.test.ts hoặc vẫn xanh, hoặc chuyển đỏ có lý do đã nêu trong PR'
- **actual:** Cannot go red for the stated reason. hook-editor.test.ts has 28 tests, all on text editing (Enter / Ctrl+Q / bracketed paste / Escape / prompt-style gutter / extension-ui-controller dialog serialization) — none touch a hook list or trust, so adding a trust badge to extension-list.ts cannot turn it red. extension-context-project-trust.test.ts asserts precisely the behaviour WI-14 preserves. Measured baselines: 28 pass / 0 fail and 1 pass / 0 fail.

## S157
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** Gate (1): 'TYPE: bun run check:ts exit 0'
- **actual:** Green at HEAD. Ran it: `bun run check:ts` → oxfmt 'All matched files use the correct format' on 5445 files, 16/16 package check:types 'Done', exit code 0. One oxlint WARNING only (packages/coding-agent/test/mcp-project-config-not-trusted-by-default.test.ts:19:10, no-unused-vars on `getConfigRootDir`) in an untracked file from another work stream — a warning, not an error, so it does not redden the gate.

## S158
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** Step 3: 'Định nghĩa currentHash. Hash của (type, tool, name, path). Chỉ cần hash đường dẫn + nội dung script'
- **actual:** Self-contradictory: two different tuples in one step. Also worth stating explicitly that this is a deliberate divergence from codex, whose hook_hash (codex-rs/hooks/src/engine/discovery.rs:775-790) hashes the hook's CONFIG (serializes NormalizedHookIdentity to TOML), not the script body — copying codex would make `modified` unreachable, i.e. the exact hole this work item exists to close.

## S159
- **work item:** WI-14. Trust state cho hook handler (GAP-M2-7)
- **cited:** Step 2: 'Lấy khoá ổn định từ chỗ đã có, đừng dựng khoá mới … Dòng 31 của capability/hook.ts'
- **actual:** Anchor :31 is EXACT (`key: hook => \`${hook.type}:${hook.tool}:${hook.name}\`,`), but the spec says 'the stable key already at line 31' in the singular when there are THREE copies of that three-component string: capability/hook.ts:31 (`key:`), capability/hook.ts:32 (`toExtensionId:`), and modes/components/extensions/state-manager.ts:235 (`makeExtensionId('hook', …)`). The state-manager copy is the one that produces the `id` of the row in the table where the badge goes, and nothing in the type system keeps them in sync.

## S160
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** packages/coding-agent/src/extensibility/extensions/loader.ts:269
- **actual:** packages/coding-agent/src/extensibility/extensions/loader.ts:269 — line is CORRECT (registerMessageRenderer), but the claim is wrong. Body at :270 is `this.extension.messageRenderers.set(customType, renderer as MessageRenderer);` — silent last-wins, no duplicate check. The plan misread the doc comment at loader.ts:483 ('last-wins collisions, shared runtime flag defaults) stay deterministic') as describing a collision detector rather than the absence of one. The only real duplicate-detection template in the codebase is getRegisteredCommands at packages/coding-agent/src/extensibility/extensions/runner.ts:1214-1234.

## S161
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** packages/coding-agent/src/extensibility/hooks/loader.ts:114
- **actual:** packages/coding-agent/src/extensibility/hooks/loader.ts:114 — line is CORRECT (registerMessageRenderer on HookAPI), claim wrong. Body at :115 is `messageRenderers.set(customType, renderer as HookMessageRenderer);` — same silent last-wins. No duplicate diagnostic anywhere on the hook branch.

## S162
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1475
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1475 — line is CORRECT (`registerMessageRenderer<T = unknown>(customType: string, renderer: MessageRenderer<T>): void;`, the interface declaration). Only anchor of the three that is correct in both line and claim.

## S163
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** "Đăng ký command / shortcut / tool / flag / message-renderer không silent drop: chúng đều có chẩn đoán trùng"
- **actual:** FALSE. All five register* methods in packages/coding-agent/src/extensibility/extensions/loader.ts are bare Map.set: registerTool:216, registerCommand:234, registerShortcut:249, registerFlag:259, registerMessageRenderer:269. The only throws in the file are ExtensionRuntimeNotInitializedError (lines 114-170) and three registerComposerShape throws (280/283/286) that check empty id, empty label, and builtin id — NOT extension-vs-extension duplicates. This breaks the work item's step 1, test-contract LINE 1, and gate (2).

## S164
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** "Ranh giới bề mặt: chỉ TUI và ACP; RPC/JSON giữ nguyên dạng dữ liệu thô"
- **actual:** INCOMPLETE. The render surface is TUI-ONLY. All getMessageRenderer call sites are in modes/: modes/utils/ui-helpers.ts:257 and modes/controllers/selector-controller.ts:1090, :1221, :2188. ui-helpers.ts:23 imports CustomMessageComponent from @oh-my-pi/pi-tui/chat/custom-message. modes/acp/acp-agent.ts holds an extensionRunner (:2562) but never calls getMessageRenderer. The open question 'should we open ACP too?' asks about a surface that does not exist.

## S165
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** "Bị chặn cho tới khi có native addon: bun test chết ngay ở bước import với 'Failed to load pi_natives native addon for darwin-arm64'. Gỡ chặn bằng bun --cwd=packages/natives run build."
- **actual:** STALE. bun test runs fine at HEAD 65cc6c1 with no addon build. Verified: `cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts` -> 1 pass, 0 fail; and with extension-loader-graph-read-dedup.test.ts -> 3 pass, 0 fail. `bun run check:ts` from the REPO ROOT exits 0. Note check:ts is a root script — `cd packages/coding-agent && bun run check:ts` fails with 'error: Script not found'.

## S166
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** "Repo đang ở git HEAD 808b365"
- **actual:** HEAD is 65cc6c1 ("test(coding-agent): opt in explicitly where the suite is about parsing"), branch milestone-1. Not 808b365. All line numbers in the sheet were re-verified against 65cc6c1.

## S167
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** Cổng hoàn thành (2): "hai extension cùng thay renderer của một entry thì báo chẩn đoán trùng bằng cùng cơ chế và cùng thông điệp với registerMessageRenderer"
- **actual:** GATE CANNOT GO RED. It requires matching a diagnostic message emitted by registerMessageRenderer, which emits none (loader.ts:269-271 is a bare Map.set). Rewritten in the sheet as: either drop the gate under last-wins, or assert against a literal constant in the test. Also note plan's `gate_can_fail: true` is wrong for the current state — gates (1) and (3) are genuinely red-able.

## S168
- **work item:** WI-16. Hai mặt cửa render cho extension (GAP-M2-11: registerEntryRenderer + registerMarkdownTransformer)
- **cited:** "Test xung đột sống ở file nào? ... WI-3 và WI-16 cùng chạm session/agent-session.ts theo mô tả wave 3"
- **actual:** UNSUPPORTED. No step of WI-16 touches session/agent-session.ts. The single call site is modes/utils/ui-helpers.ts:257. Recommended a separate test file, test/extension-render-registration.test.ts, rather than appending to the already 131 KB extensions-runner.test.ts.

## S169
- **work item:** WI-17. Giới hạn khối skills nạp vào system prompt (GAP-M2-8) — đặt trần cho khối `<skills>` + thêm `action: "list"` cho `manage_skill`
- **cited:** prompts/system/system-prompt.md:30-35
- **actual:** packages/coding-agent/src/prompts/system/system-prompt.md:31-33 (loop is 31-33; 30-35 is the enclosing <skills> block). Path is also wrong: there is no prompts/ at repo root — `ls prompts` returns 'No such file or directory'

## S170
- **work item:** WI-17. Giới hạn khối skills nạp vào system prompt (GAP-M2-8) — đặt trần cho khối `<skills>` + thêm `action: "list"` cho `manage_skill`
- **cited:** packages/coding-agent/src/config/registry.ts — home for the single cap constant
- **actual:** packages/coding-agent/src/config/registry.ts:1-4 — docstring 'Settings registry: typed handles for every setting.'; register() at :786, Setting at :455, lookup at :795, all at :800

## S171
- **work item:** WI-17. Giới hạn khối skills nạp vào system prompt (GAP-M2-8) — đặt trần cho khối `<skills>` + thêm `action: "list"` cho `manage_skill`
- **cited:** git grep -ril 'bm25|reciprocal.rank|ngram' -- packages/ crates/ only hits crates/pi-predict
- **actual:** 44 files, not 1 — also crates/pi-natives/src/predict.rs, 4 tokenizer JSON caches, packages/ai/src/providers/*, packages/agent/src/types.ts, packages/catalog/src/compat/axes.ts, packages/coding-agent/src/predict/*, packages/tui/src/prompt/word-completion.ts

## S172
- **work item:** WI-17. Giới hạn khối skills nạp vào system prompt (GAP-M2-8) — đặt trần cho khối `<skills>` + thêm `action: "list"` cho `manage_skill`
- **cited:** dynamic_skill_selector/ of codex is 87 files / 22,712 lines
- **actual:** /Users/tranquangdang21/Projects/codex-ref/codex-rs/ext/skills/src/dynamic_skill_selector/ = 20 files / 2,703 lines (10 implementation + 9 *_tests.rs + 1). 87 files / 22,712 lines is the WHOLE ext/skills crate: find -type f | wc -l = 87, find -name '*.rs' -exec cat + | wc -l = 22712

## S173
- **work item:** WI-17. Giới hạn khối skills nạp vào system prompt (GAP-M2-8) — đặt trần cho khối `<skills>` + thêm `action: "list"` cho `manage_skill`
- **cited:** bun test dies with 'Failed to load pi_natives native addon for darwin-arm64'; unblock with `bun --cwd=packages/natives run build`
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node EXISTS (185 MB, built 2026-09-29 07:32). `bun test packages/coding-agent/test/skill-descriptions.test.ts` → 3 pass / 0 fail

## S174
- **work item:** WI-17. Giới hạn khối skills nạp vào system prompt (GAP-M2-8) — đặt trần cho khối `<skills>` + thêm `action: "list"` cho `manage_skill`
- **cited:** packages/coding-agent/src/…/skill-descriptions.ts — 'nén description xuống 12 từ'
- **actual:** packages/coding-agent/src/extensibility/skill-descriptions.ts:16 is exactly `const MAX_COMPRESSED_WORDS = 12;` ✓, but its only use is :95 inside validCompression — `if (line.split(/\s+/).length > MAX_COMPRESSED_WORDS) return null;` — a REJECTION gate on the LLM compressor's output, which then falls back to previewSkillDescription

## S175
- **work item:** WI-19. Context của extension tự vô hiệu hoá sau unload (GAP-M2-9)
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1264
- **actual:** runner.ts:1293 is the real `isProjectTrusted` call site. runner.ts:1264 is a JSDoc line: "names an existing native built-in, the context carries an `invokeTool` that runs it (see"

## S176
- **work item:** WI-19. Context của extension tự vô hiệu hoá sau unload (GAP-M2-9)
- **cited:** packages/coding-agent/src/session/agent-session.ts:7406
- **actual:** agent-session.ts:7552 is the real call site. agent-session.ts:7406 is a comment: "// Auto thinking: classify this real user turn and set the effective level"

## S177
- **work item:** WI-19. Context của extension tự vô hiệu hoá sau unload (GAP-M2-9)
- **cited:** packages/coding-agent/CHANGELOG.md:1057 (cited by WI-20, consumed by WI-19 step 6)
- **actual:** CHANGELOG.md:1117, under the released heading `## [18.1.16] - 2026-09-09`. Line 1057 is an unrelated entry about `compat.stripImageInput` (#11697).

## S178
- **work item:** WI-19. Context của extension tự vô hiệu hoá sau unload (GAP-M2-9)
- **cited:** Plan §Xác minh: `bun test` dies at import with "Failed to load pi_natives native addon for darwin-arm64"
- **actual:** Native addon IS built at packages/natives/native/pi_natives.darwin-arm64.node; `bun test` runs (3 pass / 0 fail / 239ms) with no build step

## S179
- **work item:** WI-19. Context của extension tự vô hiệu hoá sau unload (GAP-M2-9)
- **cited:** Plan gate (2): "sau dispose, gọi lại bất kỳ method nào của ctx cũ ném lỗi có tên"
- **actual:** Not an anchor but an unfalsifiable gate: "any method" is satisfiable by guarding one easy method. Rewritten in the ticket as a closed list of 13 methods + the `model` getter, and extended to cover runner.ts:1382 / :1389 which `createCommandContext()` re-declares AFTER the `...this.createContext()` spread at :1381 and therefore bypasses any guard.

