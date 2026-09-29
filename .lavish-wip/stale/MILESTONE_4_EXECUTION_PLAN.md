# Neo sai trong MILESTONE_4_EXECUTION_PLAN — 51 mục

Mỗi mục: `cited` (những gì tài liệu đang ghi) và `actual` (chỗ thật, đã đo).
Sửa CHỈ phần `đường/dẫn:số-dòng`. Giữ nguyên mọi văn xuôi quanh nó.

## S1
- **work item:** M4-4. Ghi trạng thái bền vững và sự thật bảng settings (sóng B)
- **cited:** dirs.ts:652 (getPluginsLockfile)
- **actual:** packages/utils/src/dirs.ts:662-664. Dòng 652 thật ra là `export function getPluginsNodeModules(home?: string): string`

## S2
- **work item:** M4-4. Ghi trạng thái bền vững và sự thật bảng settings (sóng B)
- **cited:** manager.ts:954-961 (deletePluginSetting)
- **actual:** packages/coding-agent/src/extensibility/plugins/manager.ts:954-960; dòng 960 là dấu `}` đóng hàm, 961 là dòng trống

## S3
- **work item:** M4-4. Ghi trạng thái bền vững và sự thật bảng settings (sóng B)
- **cited:** plugin-config.test.ts:19-33 (mẫu cô lập spyOn)
- **actual:** packages/coding-agent/test/plugin-config.test.ts:20-34; dòng 19 trống, dòng 34 là `});` đóng afterEach

## S4
- **work item:** M4-4. Ghi trạng thái bền vững và sự thật bảng settings (sóng B)
- **cited:** packages/coding-agent/CHANGELOG.md — 'Ghi entry dước ## [Unreleased] (đang rỗng, bắt đầu ở dòng 3)'
- **actual:** packages/coding-agent/CHANGELOG.md:3 là `## [Unreleased]` (đúng), nhưng dòng 5 đã có `### Security` với entry về MCP project config

## S5
- **work item:** M4-4. Ghi trạng thái bền vững và sự thật bảng settings (sóng B)
- **cited:** Bảng 'Đính chính so với plan': 'Đếm là 0 ngay trên HEAD 808b365'
- **actual:** HEAD thật là 47720fd (git rev-parse --short HEAD)

## S6
- **work item:** M4-4. Ghi trạng thái bền vững và sự thật bảng settings (sóng B)
- **cited:** acp-agent.ts:2167 — 'thứ mà reloadPlugins thật sự làm'
- **actual:** Dòng 2167 đúng (`await refreshAgentDiscovery(cwd, record.session.effectiveExtensionRoots);`) nhưng hàm bao quanh tên là `#reloadPluginState` tại acp-agent.ts:2163, không phải `reloadPlugins`

## S7
- **work item:** M4-4. Ghi trạng thái bền vững và sự thật bảng settings (sóng B)
- **cited:** Cổng (d): `git grep -n 'atomicWriteJson' -- packages/` — 'expect ONE definition, in packages/utils'
- **actual:** Hôm nay in 3 dòng (def registry.ts:44 + call sites :95, :128); sau refactor vẫn in 3 dòng (def chuyển sang packages/utils + 2 call site vẫn ở registry.ts)

## S8
- **work item:** M4-6. Chặn ghi `settings` theo provenance
- **cited:** packages/coding-agent/src/cli/config-cli.ts:315-317
- **actual:** config-cli.ts:306-307 and :314

## S9
- **work item:** M4-6. Chặn ghi `settings` theo provenance
- **cited:** packages/tui/src/overlays/settings-selector.ts:1208 and :1211 as 'the only two `throw` statements in the file'
- **actual:** settings-selector.ts:389, :1208, :1211

## S10
- **work item:** M4-6. Chặn ghi `settings` theo provenance
- **cited:** plan correction #6 / step 7: '13 is a complete inventory of SettingsHost writes'; the 13-line list is the full set
- **actual:** packages/tui/src/overlays/settings-selector.ts:1112

## S11
- **work item:** M4-6. Chặn ghi `settings` theo provenance
- **cited:** packages/tui/src/overlays/settings-defs.ts files-touched row: 'add SettingsProvenance union and a provenance() member on SettingsHost'
- **actual:** packages/tui/src/overlays/settings-defs.ts:134

## S12
- **work item:** M4-6. Chặn ghi `settings` theo provenance
- **cited:** MILESTONE_4_EXECUTION_PLAN.md:2803 — 'gate (1a) `grep -c 'settings\.set(' ... must equal exactly 13''
- **actual:** MILESTONE_4_EXECUTION_PLAN.md:2803 vs work-item step 9 (line 1047) and gate (1) (line 1169)

## S13
- **work item:** M4-6. Chặn ghi `settings` theo provenance
- **cited:** M4-6 correction #9 (plan line 2895 area): 'HEAD at review time (2026-09-27) is 9cfbaba on milestone-1'
- **actual:** 47720fd

## S14
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:606-613 (ToolRenderResultOptions, doc comment :605)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:608-615 (doc comment at :607)

## S15
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:686 and :691 (renderCall / renderResult use sites)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:694 and :699

## S16
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:62 (the { expanded, isPartial, spinnerFrame } object literal)
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:96

## S17
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:59-65 (RegisteredToolAdapter.renderResult)
- **actual:** wrapper.ts:62 is the class declaration; :70 the renderResult field decl; :92-100 the adapter body

## S18
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:55-57 and the plan's correction that it 'forwards options untouched'
- **actual:** wrapper.ts:84-91; the Proxy factory is renderOptionsWithTheme at :43-57

## S19
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:59 (params typed any)
- **actual:** wrapper.ts:93

## S20
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/sdk.ts:1188 (customToolToDefinition)
- **actual:** packages/coding-agent/src/sdk.ts:1200

## S21
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/sdk.ts:1214-1223 (renderResult wrapper)
- **actual:** packages/coding-agent/src/sdk.ts:1225-1235

## S22
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/sdk.ts:1217 (the 3-field object literal)
- **actual:** packages/coding-agent/src/sdk.ts:1229

## S23
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/src/sdk.ts:1212 (renderCall: tool.renderCall)
- **actual:** packages/coding-agent/src/sdk.ts:1224

## S24
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/tui/src/chat/tool-execution.ts:924-931 (#rebuildDisplay) and :926-930 (the renderState assignments)
- **actual:** tool-execution.ts:926-932 (method at :926, assignments at :928-932)

## S25
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/tui/src/chat/tool-execution.ts:950 (custom-renderer branch)
- **actual:** packages/tui/src/chat/tool-execution.ts:958

## S26
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/tui/src/chat/tool-execution.ts:1041 (built-in branch)
- **actual:** packages/tui/src/chat/tool-execution.ts:1049

## S27
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/tui/src/chat/tool-execution.ts:996-1001 (the narrowing cast of tool.renderResult)
- **actual:** packages/tui/src/chat/tool-execution.ts:1004-1009

## S28
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/tui/src/chat/tool-execution.ts:971, :1002, :1129, :1150 (the four render call sites that pass #renderState)
- **actual:** tool-execution.ts:979, :1016, :1083, :1137, :1164 (and :1362 for the default card) - 8 to 14 lines lower, plus two sites the plan never lists

## S29
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/tui/src/chat/tool-execution.ts:960, :1062, :1122 and :885 (renderContext assignments)
- **actual:** tool-execution.ts:968, :1070, :1130 and :887

## S30
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** packages/coding-agent/test/tools/edit-renderer.test.ts:417 (__partialJson reference)
- **actual:** packages/coding-agent/test/tools/edit-renderer.test.ts:405

## S31
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** Plan step 3: 'types.ts has no pi-tui import; the two packages are not type-coupled'
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts has 17+ `@oh-my-pi/pi-tui/*` imports (:68 barrel, :74 tools/edit, :82 theme, :90 tools/read, ...); packages/coding-agent/src/extensibility/custom-tools/types.ts:22 already imports RenderResultOptions from @oh-my-pi/pi-tui/tools/renderer

## S32
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** Plan's file list and step 7/8: only tool-args-reveal.ts:566 and :615 push into updateArgs, and ui-helpers.ts:611 is the only ToolExecutionComponent construction site
- **actual:** packages/coding-agent/src/modes/controllers/event-controller.ts:1406, :1434, :1750

## S33
- **work item:** M4-7. Hợp đồng render có kiểu (sóng C)
- **cited:** pi-ref was assumed to be a plausible source tree for this work item
- **actual:** /Users/tranquangdang21/Projects/pi-ref - grep -rn '__partialJson' packages returns 0 hits

## S34
- **work item:** M4-9. Khả năng nhìn thấy triage (sóng D)
- **cited:** packages/coding-agent/src/modes/interactive-mode.ts:5970-5971
- **actual:** packages/coding-agent/src/modes/interactive-mode.ts:5984-5985

## S35
- **work item:** M4-9. Khả năng nhìn thấy triage (sóng D)
- **cited:** package.json:94 (`check:ts`)
- **actual:** package.json:90 (package.json:94 is "lint:ts")

## S36
- **work item:** M4-9. Khả năng nhìn thấy triage (sóng D)
- **cited:** package.json:89 (`test`)
- **actual:** package.json:85 (package.json:89 is "check")

## S37
- **work item:** M4-9. Khả năng nhìn thấy triage (sóng D)
- **cited:** package.json evidence #5: ":89 test, :93 check, :94 check:ts"
- **actual:** package.json:85 (test), :89 (check), :90 (check:ts), :92 (check:rs)

## S38
- **work item:** M4-9. Khả năng nhìn thấy triage (sóng D)
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:11524-11545
- **actual:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:15148 (heading) and :15170 (the (a)/(b) branches)

## S39
- **work item:** M4-9. Khả năng nhìn thấy triage (sóng D)
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:11538-11539
- **actual:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:15170

## S40
- **work item:** M4-9. Khả năng nhìn thấy triage (sóng D)
- **cited:** load-errors.ts:1 (as the import template, in src/cli/ context)
- **actual:** packages/coding-agent/src/extensibility/extensions/load-errors.ts:1

## S41
- **work item:** M4-9. Khả năng nhìn thấy triage (sóng D)
- **cited:** `bun test packages/coding-agent/test/ -t 'acp'` — plan claims it is currently RED (exit 1, "filters did not match any test files")
- **actual:** actual_location = GREEN: `bun test packages/coding-agent/test/ -t 'acp'` → 4 pass / 317 skip / 0 fail, exit 0, ran 321 tests across 1513 files

## S42
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** MILESTONE_4_EXECUTION_PLAN.md:1810 heading '## M4-12'
- **actual:** MILESTONE_4_EXECUTION_PLAN.md:1810 = '## GAP-M4-11. Một hàm chuẩn hoá lỗi không ném được...'; GAP-M4-12 ở :1975 là item khác hẳn (hook nổi)

## S43
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan §'Hình dạng code' — hình dạng normalizeErrorMessage
- **actual:** Code as written throws on revoked Proxy: `value instanceof Error` reads getPrototypeOf through the proxy and throws before the final try is entered

## S44
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan file table row 'packages/utils/src/logger.ts | sửa | Đường logger'
- **actual:** 0 hit idiom. Bẫy thật nhưng qua cơ chế khác: jsonReplacer tại packages/utils/src/logger.ts:182 đọc value.message (:186) / value.stack (:187) không chắn, chạy trong JSON.stringify tại :247

## S45
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan verification block 'bun test packages/coding-agent/test/dap/'
- **actual:** Thư mục không tồn tại. bun test in 'filters did not match any test files' và exit 1 vĩnh viễn

## S46
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan verification block 'bun test packages/agent/test/' như một cổng phải xanh
- **actual:** 617 pass / 13 fail trên cây sạch (compact() Anthropic native lane, shouldUseAnthropicNativeCompaction)

## S47
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan bước 3 / file table nhắc 'TUI error render' là một trong bốn đường
- **actual:** Bảng file KHÔNG liệt kê TUI. Nó là packages/tui/src/chrome/error-block.ts:19 trong hàm sanitizeErrorLine (1 hit)

## S48
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan bước 2.3 'Một oxlint rule cấm idiom thô'
- **actual:** no-restricted-syntax không có trong oxlint schema (rg -c → 0). no-restricted-properties chạy thật exit 0, không bắt idiom. jsPlugins (schema :59) là lối duy nhất bắt được

## S49
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan cổng (1) 'con số ở bước 1 phải GIẢM'
- **actual:** Chỉ định nghĩa 'khác 0'. 4 đường = 3+16+1+0 = 20 hit → 895 thành 875 (2,2%)

## S50
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan 'Đính chính' — worker-runtime.ts:44 errorText và :48 errorMessage là hai tên cho cùng một ý
- **actual:** errorText trả `error.stack ?? error.message`, errorMessage trả `error.message`. Gộp sẽ mất stack, phá vỡ 2 call site CUDA regex tại :327 và :331

## S51
- **work item:** ## M4-12. Một hàm chuẩn hoá lỗi không ném được (thực chất là GAP-M4-11)
- **cited:** plan §'Cần người quyết' — GAP-D8, owner nợ, barrel hay không, gộp 3 bản export
- **actual:** Chưa có. ls .lavish-wip/DECISION-*.md → không file nào đề cập GAP-D8 hay 895

